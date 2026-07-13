package io.github.nzilberberg.tomeroam;

// ImageCache — persistent, offline-capable cover-art cache for the APK.
//
// Why the APK needs its own: in the browser PWA the service worker caches covers
// (tomeroam-img-v1). The APK runs the app with the SW OFF (index.html?nosw=1), so
// nothing persisted covers — they refetched from Plex every launch and vanished
// offline. IndexedDB can't hold them either: Plex sends cover transcodes without
// CORS, so JS can only get opaque (unreadable) blobs; a native HTTP cache has no
// such limit.
//
// Only Plex cover-art requests (/photo/:/transcode on a *.plex.direct host) are
// cached; audio lives at /library/parts/... and is never touched. A cache HIT is
// served straight from disk (so covers render with no network); a MISS returns
// null so the WebView loads it normally (online), and we populate the cache in the
// background for next time — the fetch uses PlexDirectTrust so the *.plex.direct
// chain resolves. Populate concurrency is capped (2) so a grid of covers can't
// burst a thin Plex relay (the same hazard artloader.js caps on the WebView side).

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebResourceResponse;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.net.ssl.HttpsURLConnection;

final class ImageCache {

    private static final String TAG = "TomeRoamImg";
    private static final int MAX_FILES = 600;      // LRU cap; covers are small (~10-40 KB)
    private static final ExecutorService POOL = Executors.newFixedThreadPool(2);
    private static final Set<String> inflight = Collections.synchronizedSet(new HashSet<>());

    private ImageCache() {}

    // True for Plex cover-art requests we should cache.
    static boolean isCover(Uri u) {
        String host = u.getHost();
        String path = u.getPath();
        return host != null && host.endsWith(".plex.direct")
                && path != null && path.contains("/photo/:/transcode");
    }

    // Serve from disk on a hit; on a miss return null (WebView loads it) and kick
    // off a background populate so the next view — including offline — is a hit.
    static WebResourceResponse serve(Context ctx, Uri u) {
        String key = keyFor(u);
        File f = new File(dir(ctx), key);
        if (f.exists() && f.length() > 0) {
            f.setLastModified(System.currentTimeMillis());   // LRU touch
            try {
                InputStream in = new FileInputStream(f);
                return new WebResourceResponse(sniffMime(f), null, 200, "OK", corsHeaders(), in);
            } catch (Exception e) { /* fall through to populate */ }
        }
        populateAsync(ctx, u, key);
        return null;
    }

    private static void populateAsync(final Context ctx, final Uri u, final String key) {
        if (!inflight.add(key)) return;
        POOL.execute(() -> {
            try { populate(ctx, u, key); }
            catch (Exception e) { Log.i(TAG, "populate failed: " + e); }
            finally { inflight.remove(key); }
        });
    }

    private static void populate(Context ctx, Uri u, String key) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(u.toString()).openConnection();
        if (c instanceof HttpsURLConnection) {                // *.plex.direct chain repair
            javax.net.ssl.SSLSocketFactory sf = PlexDirectTrust.socketFactory(ctx);
            if (sf != null) {
                ((HttpsURLConnection) c).setSSLSocketFactory(sf);
                ((HttpsURLConnection) c).setHostnameVerifier(PlexDirectTrust.hostnameVerifier());
            }
        }
        c.setConnectTimeout(12000);
        c.setReadTimeout(20000);
        c.setInstanceFollowRedirects(true);
        try {
            if (c.getResponseCode() != 200) return;
            File tmp = new File(dir(ctx), key + ".tmp");
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(tmp)) {
                WebFiles.pipe(in, out);
            }
            if (tmp.length() > 0) {
                File dst = new File(dir(ctx), key);
                dst.delete();
                if (!tmp.renameTo(dst)) tmp.delete();
                prune(ctx);
            } else {
                tmp.delete();
            }
        } finally { c.disconnect(); }
    }

    // ---- helpers --------------------------------------------------------------

    private static File dir(Context ctx) {
        File d = new File(ctx.getCacheDir(), "imgcache");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    // Cache key = hash of the URL with the volatile bits stripped (token + retry
    // buster), so the same cover maps to one entry regardless of token rotation.
    private static String keyFor(Uri u) {
        String base = u.getScheme() + "://" + u.getHost() + u.getPath();
        StringBuilder q = new StringBuilder();
        for (String name : u.getQueryParameterNames()) {
            if (name.equalsIgnoreCase("X-Plex-Token") || name.equalsIgnoreCase("pbr")) continue;
            q.append(name).append('=').append(u.getQueryParameter(name)).append('&');
        }
        return sha1(base + "?" + q);
    }

    private static String sha1(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] d = md.digest(s.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder(d.length * 2);
            for (byte b : d) sb.append(String.format(Locale.US, "%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(s.hashCode());
        }
    }

    private static String sniffMime(File f) {
        try (InputStream in = new FileInputStream(f)) {
            byte[] h = new byte[8];
            int n = in.read(h);
            if (n >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "image/png";
            if (n >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8) return "image/jpeg";
            if (n >= 4 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F') return "image/gif";
            if (n >= 5 && h[0] == '<') return "image/svg+xml";
        } catch (Exception e) { /* default below */ }
        return "image/jpeg";   // Plex photo transcodes are JPEG by default
    }

    private static java.util.Map<String, String> corsHeaders() {
        java.util.Map<String, String> h = new java.util.HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Cache-Control", "max-age=604800");
        return h;
    }

    // Keep the cache bounded: when over MAX_FILES, delete the oldest by mtime.
    private static synchronized void prune(Context ctx) {
        File[] files = dir(ctx).listFiles();
        if (files == null || files.length <= MAX_FILES) return;
        java.util.Arrays.sort(files, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
        for (int i = 0; i < files.length - MAX_FILES; i++) files[i].delete();
    }
}
