package io.github.nzilberberg.tomeroam;

// WebUpdater — Track A: silent over-the-air update of the web app inside the APK.
//
// On launch (background thread) it fetches build.json from GitHub Pages. If the
// published web BUILD is newer than the copy we serve, it downloads the new shell
// into web/staged and (if nothing is playing) promotes + reloads immediately;
// otherwise the swap happens at the next cold launch. Every web `git push` thus
// reaches the tablet with no reinstall and no install dialog — the same UX as the
// PWA's service-worker auto-takeover, which the APK can't use (SW is off here).
//
// The file list is discovered by parsing the NEW index.html's <script>/<link>
// refs (so a build that adds a file is handled with no manifest to maintain) plus
// a small fixed set of non-referenced assets (icons, manifest, sw.js, ...). This
// keeps the "just push" workflow: no new build artifact.
//
// Track B (native APK self-update) is triggered from here too: build.json carries
// a `nativeVersion`; when it exceeds the value baked into this build, the native
// shell itself changed (rare) and ApkUpdater prompts a one-tap APK install.
//
// Safety: staged is verified complete (every file 200 + non-empty) BEFORE it can
// be promoted; a failed/partial download leaves the live copy untouched. Offline
// (build.json unreachable) is a silent no-op — the app keeps serving what it has.

import android.app.Activity;
import android.util.Log;
import android.webkit.WebView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class WebUpdater {

    private static final String TAG = "TomeRoamUpdate";
    private static final String PAGES = "https://nzilberberg.github.io/TomeRoam";

    // Assets not referenced by a <script>/<link> tag but still part of the shell.
    private static final String[] STATIC_EXTRAS = {
        "index.html", "build.json", "manifest.webmanifest", "sw.js",
        "icon.svg", "js/swkit.js", "img/placeholder-cover.svg",
        "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png",
    };

    private static final Pattern REF = Pattern.compile("(?:src|href)\\s*=\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern NATIVE_VER = Pattern.compile("\"nativeVersion\"\\s*:\\s*(\\d+)");
    // The MINIMUM native version the published web build requires. The leading
    // quote in each pattern keeps the keys distinct: "nativeVersion" cannot match
    // inside "minNativeVersion".
    private static final Pattern MIN_NATIVE_VER = Pattern.compile("\"minNativeVersion\"\\s*:\\s*(\\d+)");

    private static volatile boolean running = false;

    private WebUpdater() {}

    // Kick off the check in the background. `nativeVersion` is the value baked into
    // THIS build (MainActivity.NATIVE_VERSION); a higher published value means a
    // new native APK is available.
    static void checkAsync(final Activity act, final WebView web, final int nativeVersion) {
        if (running) return;
        running = true;
        new Thread(() -> {
            try { check(act, web, nativeVersion); }
            catch (Exception e) { Log.i(TAG, "web update check skipped: " + e); }
            finally { running = false; }
        }, "web-updater").start();
    }

    private static void check(Activity act, WebView web, int nativeVersion) throws Exception {
        String meta = httpGetText(PAGES + "/build.json?ts=" + System.currentTimeMillis());
        String remoteBuild = WebFiles.parseBuild(meta);
        if (remoteBuild == null) return;

        // Track B: native shell update. Two tiers, distinguished so version-number
        // ticks never nag (see build.json):
        //   HARD floor — the published web build REQUIRES a newer native shell than
        //     this APK provides (minNativeVersion > baked). We must NOT auto-swap to
        //     that web build (it wouldn't run against this shell), so we skip Track A
        //     entirely and show an insistent, re-prompting "update required" dialog.
        //     A freshly built APK satisfies its own floor, so this only ever fires on
        //     an OLD APK meeting a later, floor-raising web build.
        //   SOFT offer — a newer native shell merely EXISTS (nativeVersion > baked);
        //     the current web still runs fine, so we offer a dismissible one-tap
        //     update and continue serving/staging web as normal.
        int remoteMinNative = parseMinNativeVersion(meta);
        int remoteNative = parseNativeVersion(meta);
        if (remoteMinNative > nativeVersion) {
            Log.i(TAG, "web build requires native " + remoteMinNative + " > baked " + nativeVersion + " — update required");
            act.runOnUiThread(() -> ApkUpdater.promptRequired(act, remoteNative));
            return;   // do not stage/apply a web build this shell can't run
        }
        if (remoteNative > nativeVersion) {
            act.runOnUiThread(() -> ApkUpdater.prompt(act, remoteNative));
        }

        // Track A: web shell update.
        String currentBuild = WebFiles.activeBuild(act);
        String stagedBuild = WebFiles.readBuild(WebFiles.stagedDir(act));
        boolean newerThanCurrent = WebFiles.compareBuild(remoteBuild, currentBuild) > 0;
        boolean newerThanStaged = WebFiles.compareBuild(remoteBuild, stagedBuild) > 0;
        if (!newerThanCurrent || !newerThanStaged) return;   // nothing to do / already staged

        Log.i(TAG, "web update " + currentBuild + " -> " + remoteBuild + " staging");
        if (stageBuild(act, remoteBuild)) {
            Log.i(TAG, "web update " + remoteBuild + " staged");
            maybeApplyNow(act, web);
        }
    }

    // Download the whole new shell into web/stagedtmp, verify it is complete, then
    // atomically rename to web/staged. Returns true only on a complete stage.
    private static boolean stageBuild(Activity act, String build) {
        File stagedTmp = new File(WebFiles.webDir(act), "stagedtmp");
        WebFiles.deleteRec(stagedTmp);
        try {
            String index = httpGetText(PAGES + "/index.html");
            if (index == null || index.isEmpty()) return false;

            Set<String> files = new LinkedHashSet<>();
            for (String e : STATIC_EXTRAS) files.add(e);
            Matcher m = REF.matcher(index);
            while (m.find()) {
                String ref = stripQuery(m.group(1));
                if (isLocalAsset(ref)) files.add(ref);
            }

            for (String rel : files) {
                File dst = new File(stagedTmp, rel);
                dst.getParentFile().mkdirs();
                if (rel.equals("index.html")) {                 // already fetched; reuse the bytes
                    try (OutputStream out = new FileOutputStream(dst)) { out.write(index.getBytes("UTF-8")); }
                } else if (!httpDownload(PAGES + "/" + rel, dst)) {
                    Log.i(TAG, "stage failed on " + rel);
                    WebFiles.deleteRec(stagedTmp);
                    return false;
                }
                if (dst.length() == 0) { WebFiles.deleteRec(stagedTmp); return false; }   // empty = incomplete
            }

            WebFiles.writeBuild(stagedTmp, build);
            File staged = WebFiles.stagedDir(act);
            WebFiles.deleteRec(staged);
            return stagedTmp.renameTo(staged);
        } catch (Exception e) {
            Log.i(TAG, "stage error: " + e);
            WebFiles.deleteRec(stagedTmp);
            return false;
        }
    }

    // Apply the staged build immediately if the user is not mid-listen; otherwise
    // leave it for the next cold launch (WebFiles promotes it then). Reloading
    // while audio plays would interrupt playback — the one thing we won't do.
    private static void maybeApplyNow(final Activity act, final WebView web) {
        act.runOnUiThread(() -> web.evaluateJavascript(
            "(function(){var a=document.querySelector('audio');return a&&!a.paused&&!a.ended?'1':'0';})()",
            value -> {
                boolean playing = value != null && value.contains("1");
                if (playing) return;
                if (WebFiles.promoteStagedIfReady(act)) {
                    Log.i(TAG, "applying web update now (idle) — reloading");
                    web.loadUrl("https://tomeroam.local/index.html?nosw=1");
                }
            }));
    }

    // ---- helpers --------------------------------------------------------------

    private static int parseNativeVersion(String json) {
        if (json == null) return 0;
        Matcher m = NATIVE_VER.matcher(json);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    // Absent field ⇒ 0 (no floor), so older build.json files never trigger the
    // required-update path.
    private static int parseMinNativeVersion(String json) {
        if (json == null) return 0;
        Matcher m = MIN_NATIVE_VER.matcher(json);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    private static boolean isLocalAsset(String ref) {
        if (ref == null || ref.isEmpty()) return false;
        String low = ref.toLowerCase();
        if (low.startsWith("http") || low.startsWith("//") || low.startsWith("data:") || low.startsWith("#")) return false;
        return true;
    }

    private static String stripQuery(String s) {
        int q = s.indexOf('?');
        String r = q >= 0 ? s.substring(0, q) : s;
        while (r.startsWith("./")) r = r.substring(2);
        while (r.startsWith("/")) r = r.substring(1);
        return r;
    }

    private static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(12000);
        c.setReadTimeout(20000);
        c.setInstanceFollowRedirects(true);
        return c;
    }

    private static String httpGetText(String url) throws Exception {
        HttpURLConnection c = open(url);
        try {
            if (c.getResponseCode() != 200) return null;
            try (InputStream in = c.getInputStream()) { return WebFiles.readAll(in); }
        } finally { c.disconnect(); }
    }

    private static boolean httpDownload(String url, File dst) throws Exception {
        HttpURLConnection c = open(url);
        try {
            if (c.getResponseCode() != 200) return false;
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(dst)) {
                WebFiles.pipe(in, out);
            }
            return true;
        } finally { c.disconnect(); }
    }
}
