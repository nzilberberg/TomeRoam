package io.github.nzilberberg.tomeroam;

// TomeRoam — self-contained Android shell.
// The entire web app (index.html, js/, css/, icons) is bundled in APK assets
// under assets/www/ and served to the WebView from shouldInterceptRequest on a
// fixed private https origin. The origin string must NEVER change between
// releases: localStorage (Plex token, device id, settings) is keyed by it.
// The app is loaded with ?nosw=1 — the PWA's own escape hatch — because a
// service worker is pointless here (assets are local) and its fetches would
// bypass our asset interception.

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.KeyEvent;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    private static final String HOST = "tomeroam.local";
    private static final String APP_URL = "https://" + HOST + "/index.html?nosw=1";
    private static final String PREFS = "tomeroam";
    private static final String PREF_AUTO_UPDATE = "auto_update";   // mirror of the web Options toggle

    // Bump ONLY when the NATIVE shell changes (this file, PlexDirectTrust, the
    // updater, manifest, or a baked RESOURCE like the launcher icon) — NOT for
    // web-only builds. When build.json publishes a higher nativeVersion, ApkUpdater
    // offers a one-tap APK self-update; ordinary web pushes flow silently via
    // WebUpdater and never touch this number.
    // 5: the WebView's own View scrollbars (setVerticalScrollBarEnabled(false)) —
    //    a native View draws them for the document scroll and CSS cannot reach them.
    // 4: the launcher icon. build.ps1 bakes res/mipmap-xxxhdpi/ic_launcher.png from
    //    icons/icon-192.png, which was corrupt (~90% empty, artwork shifted off the
    //    right edge) for every build up to and including vc15 — so every installed
    //    APK has a broken icon. That file is baked in, so a web OTA can NOT repair
    //    it: offering the new APK is the only delivery path. Fixed in web .117.
    private static final int NATIVE_VERSION = 5;

    private WebView web;
    private File webRoot;   // writable web root (filesDir/web/current); null -> serve from assets

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Resolve the writable web root: seed it from bundled assets on first launch
        // and promote any OTA build downloaded on a previous run. Serving from a
        // writable copy (instead of read-only assets) is what lets web builds update
        // over the air with no reinstall. The origin (tomeroam.local) is unchanged,
        // so localStorage/IndexedDB survive across updates.
        // Apply a staged OTA build at boot ONLY if the user opted into auto-update
        // (default false) — otherwise it waits for the Options "App update" tap.
        boolean autoUpdate = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(PREF_AUTO_UPDATE, false);
        webRoot = WebFiles.resolveActiveRoot(this, autoUpdate);

        web = new WebView(this);
        web.setBackgroundColor(0xFF14171C);
        // WebView is an Android View, and a View draws its OWN scrollbars for the
        // document scroll — they are NOT the page's scrollbars and CSS cannot reach
        // them. app.css hides the native scrollbars on the surfaces our custom
        // indicator covers (js/scrollbar.js), but that only governs what Chromium
        // renders INSIDE the page: on Android the platform's fading View scrollbar
        // still painted on top, which is why the app looked right on iOS (no View
        // layer) and wrong here. Turn the View's own scrollbars off so the custom
        // in-band indicator is the only one, on every platform.
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);

        // Android 15 (targetSdk 35) FORCES edge-to-edge: the WebView draws behind the
        // status + navigation bars. The web app's fixed bottom nav bar therefore
        // rendered UNDER the system nav bar ("too low").
        //
        // We keep the WebVIEW itself out of the system-bar regions rather than sniff
        // the platform in CSS. CRITICAL LESSON (build .17 made it WORSE): padding the
        // WebView DIRECTLY does not work — WebView anchors position:fixed to its full
        // view box and ignores its own padding, so a fixed bottom bar stayed behind the
        // nav bar while the added TOP padding shoved everything down, pushing the bar
        // even lower. The fix is to PHYSICALLY SHRINK the WebView: host it in a
        // container whose padding = the real system-bar insets (padding on a parent
        // resizes a MATCH_PARENT child), so the WebView's layout viewport genuinely
        // ends at the nav bar's top edge and bottom:0 sits flush above it. We also hand
        // the child ZEROED system-bar insets so its env(safe-area-inset-*) is 0 (the
        // container already accounts for them — no double count with the CSS inset).
        // iOS CSS (its own real insets) is untouched. No-op on pre-edge-to-edge devices
        // (systemBars insets are 0 there).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {   // API 30+: typed insets
            FrameLayout rootLayout = new FrameLayout(this);
            rootLayout.addView(web, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            setContentView(rootLayout);
            rootLayout.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return new WindowInsets.Builder(insets)
                        .setInsets(WindowInsets.Type.systemBars(), Insets.NONE)
                        .build();
            });
            rootLayout.requestApplyInsets();
        } else {
            setContentView(web);
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return serveAsset(u.getPath());
                // Persist Plex cover art so it renders offline (the SW-cached-covers
                // role, which the APK can't use). A cache hit is served from disk; a
                // miss returns null (WebView loads it) and populates in the background.
                if (ImageCache.isCover(u)) return ImageCache.serve(getApplicationContext(), u);
                return null; // Plex API / media / plex.tv go to the real network
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                // Main-frame navigation off our origin (e.g. a link) -> system browser
                startActivity(new Intent(Intent.ACTION_VIEW, u));
                return true;
            }

            @Override
            public void onReceivedSslError(WebView view, final SslErrorHandler handler, final SslError error) {
                // Plex serves its *.plex.direct cert without the intermediate;
                // WebView (unlike desktop browsers/iOS) won't repair that, so
                // every Plex connection dies here. PlexDirectTrust re-validates
                // the chain properly (AIA fetch + pinned ISRG root + hostname);
                // anything else is cancelled like stock WebView would.
                Uri u = Uri.parse(error.getUrl());
                final String host = u == null ? null : u.getHost();
                if (host == null || !host.endsWith(".plex.direct")) { handler.cancel(); return; }
                new Thread(() -> {
                    final boolean ok = PlexDirectTrust.verify(getApplicationContext(), error.getCertificate(), host);
                    runOnUiThread(() -> { if (ok) handler.proceed(); else handler.cancel(); });
                }).start();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                // window.open() — the Plex PIN sign-in tab. Hand the popup a throwaway
                // WebView whose only job is to catch the URL and bounce it to the
                // system browser; the app keeps polling plex.tv for the PIN result.
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                        startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl()));
                        v.destroy();
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });

        // Bridge exposed to the web app as window.TomeRoamNative (only
        // @JavascriptInterface methods are reachable). Lets Options → App update
        // apply a staged OTA build on the user's command.
        web.addJavascriptInterface(new AppBridge(), "TomeRoamNative");

        web.loadUrl(APP_URL);

        // Check GitHub for a newer web build (staged silently, applied on user
        // command / next cold launch) and, rarely, a newer native APK — after the
        // page starts loading so startup isn't delayed.
        WebUpdater.checkAsync(this, web, NATIVE_VERSION);
    }

    private WebResourceResponse serveAsset(String path) {
        if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
        String rel = path.substring(1);
        try {
            // Prefer the writable (OTA-updatable) copy; fall back to the bundled
            // read-only asset if a file is missing there (belt-and-suspenders).
            InputStream in = null;
            if (webRoot != null) {
                File f = new File(webRoot, rel);
                if (f.exists() && f.isFile()) in = new FileInputStream(f);
            }
            if (in == null) in = getAssets().open("www/" + rel);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-store");
            String mime = mime(rel);
            String enc = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json")
                    ? "utf-8" : null;
            return new WebResourceResponse(mime, enc, 200, "OK", headers, in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                    new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".webmanifest") || p.endsWith(".json")) return "application/json";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    // In-app back: the PWA drives every screen through the History API, so
    // WebView history == app navigation. At the root, background the task
    // instead of finishing so audio keeps playing.
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (web.canGoBack()) web.goBack();
            else moveTaskToBack(true);
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    // Deliberately NOT calling web.onPause() in onPause(): a paused WebView
    // halts <audio> playback; leaving it running is what keeps the book
    // playing with the screen off / app backgrounded.

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    // Bridge exposed to the web app as window.TomeRoamNative. Only methods marked
    // @JavascriptInterface are reachable from JS. Kept intentionally tiny.
    private final class AppBridge {
        @JavascriptInterface
        public int nativeVersion() { return NATIVE_VERSION; }

        // The build id of an OTA web build staged but not yet applied (auto-update
        // off), or "" if none — lets the web app light the Options "App update"
        // button on launch for a build staged on a previous run.
        @JavascriptInterface
        public String stagedBuild() {
            String s = WebFiles.stagedBuildIfReady(MainActivity.this);
            return s == null ? "" : s;
        }

        // Mirror the web "Auto update on launch" toggle into a native pref, read at
        // boot (before the web app loads) to decide whether to promote a staged build.
        @JavascriptInterface
        public void setAutoUpdate(boolean v) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(PREF_AUTO_UPDATE, v).apply();
        }

        // Apply a web build WebUpdater has already staged: promote it to the active
        // root and reload. Invoked only when the user taps Options → App update — we
        // no longer auto-apply mid-session. No-op if nothing valid is staged.
        @JavascriptInterface
        public void applyUpdate() {
            runOnUiThread(() -> {
                if (WebFiles.promoteStagedIfReady(MainActivity.this)) {
                    webRoot = WebFiles.currentDir(MainActivity.this);
                    web.loadUrl(APP_URL);
                }
            });
        }
    }
}
