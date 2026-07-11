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
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Message;
import android.view.KeyEvent;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    private static final String HOST = "tomeroam.local";
    private static final String APP_URL = "https://" + HOST + "/index.html?nosw=1";

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);
        web.setBackgroundColor(0xFF14171C);

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

        web.loadUrl(APP_URL);
    }

    private WebResourceResponse serveAsset(String path) {
        if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
        String rel = path.substring(1);
        try {
            InputStream in = getAssets().open("www/" + rel);
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
}
