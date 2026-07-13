package io.github.nzilberberg.tomeroam;

// WebFiles — manages the WRITABLE copy of the web app that the WebView is served
// from, so web builds can be updated OVER-THE-AIR (see WebUpdater) without a full
// APK reinstall.
//
// Why a writable copy at all: the APK's assets/ are read-only, so the classic
// self-contained shell froze the web app at build time — every web push needed a
// new APK. Instead we seed a copy under filesDir/ on first launch and let
// WebUpdater refresh it from github.io. The origin (https://tomeroam.local) is
// unchanged, so localStorage/IndexedDB (Plex token, downloads, progress) survive.
//
// This is the APK's equivalent of the browser PWA's service-worker shell update
// — and the SW stays OFF in the APK (index.html?nosw=1) so there is exactly ONE
// shell authority here (no SW-cache-vs-filesDir mixed-build fight).
//
// Layout under filesDir:
//   web/current/   the active web root the WebView serves (index.html, js/, ...)
//   web/staged/    a fully-downloaded newer build awaiting promotion (atomic)
//   web/*/.build   a one-line text file naming that copy's build id
//
// Update safety (mirrors the SW lessons the hard way): a staged build is only
// ever promoted whole (rename), never merged file-by-file into the live copy, so
// there is no half-written-shell window; and the bundled assets are the permanent
// offline seed + disaster recovery (a newer bundled build, e.g. after an APK
// self-update, always wins over an older OTA copy).

import android.content.Context;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

final class WebFiles {

    private static final String ASSET_WWW = "www";        // bundled web root inside assets/
    private static final String BUILD_MARK = ".build";    // build-id marker filename

    private WebFiles() {}

    static File webDir(Context ctx)     { return new File(ctx.getFilesDir(), "web"); }
    static File currentDir(Context ctx) { return new File(webDir(ctx), "current"); }
    static File stagedDir(Context ctx)  { return new File(webDir(ctx), "staged"); }

    // Resolve (and, if needed, seed/promote) the active web root the WebView should
    // serve from. Returns null only if seeding fails entirely, in which case the
    // caller falls back to serving straight from read-only assets.
    static synchronized File resolveActiveRoot(Context ctx, boolean autoPromote) {
        File current = currentDir(ctx);
        String bundled = bundledBuild(ctx);

        // 1) Seed on first launch, OR reseed when the APK now bundles a NEWER build
        //    than the OTA copy (e.g. after a native APK self-update): bundled wins.
        String curBuild = readBuild(current);
        boolean needSeed = !new File(current, "index.html").exists();
        if (!needSeed && bundled != null && compareBuild(bundled, curBuild) > 0) needSeed = true;
        if (needSeed) {
            File tmp = new File(webDir(ctx), "seedtmp");
            deleteRec(tmp);
            try {
                copyAssetDir(ctx, ASSET_WWW, tmp);
                writeBuild(tmp, bundled);
                deleteRec(current);
                if (!tmp.renameTo(current)) { copyDir(tmp, current); deleteRec(tmp); }
            } catch (IOException e) {
                deleteRec(tmp);
                return current.exists() ? current : null;   // keep whatever we had
            }
        }

        // 2) Apply a previously-staged OTA build (newer + complete) ONLY if the user
        //    enabled "Auto update on launch". Otherwise leave it staged; the web app
        //    surfaces it as the Options "App update" button (applied on a tap). This
        //    is what keeps the app from EVER updating on its own by default.
        if (autoPromote) promoteStagedIfReady(ctx);

        return new File(current, "index.html").exists() ? current : null;
    }

    // The build id of a complete, newer staged OTA build (so the web layer can light
    // the Options "App update" button when auto-update is off), or null if none.
    static synchronized String stagedBuildIfReady(Context ctx) {
        File staged = stagedDir(ctx), current = currentDir(ctx);
        if (!new File(staged, "index.html").exists()) return null;
        String sB = readBuild(staged), cB = readBuild(current);
        return compareBuild(sB, cB) > 0 ? sB : null;
    }

    // Promote web/staged -> web/current when staged is a complete, newer build.
    // Safe to call anytime (launch, or right after a download finishes).
    static synchronized boolean promoteStagedIfReady(Context ctx) {
        File staged = stagedDir(ctx), current = currentDir(ctx);
        if (!new File(staged, "index.html").exists()) return false;
        String sB = readBuild(staged), cB = readBuild(current);
        if (compareBuild(sB, cB) <= 0) { deleteRec(staged); return false; }   // stale/older staged
        File backup = new File(webDir(ctx), "prev");
        deleteRec(backup);
        if (current.exists() && !current.renameTo(backup)) return false;
        if (!staged.renameTo(current)) {                                       // roll back on failure
            if (backup.exists()) backup.renameTo(current);
            return false;
        }
        deleteRec(backup);
        return true;
    }

    // ---- build-id helpers -----------------------------------------------------

    static String bundledBuild(Context ctx) {
        try (InputStream in = ctx.getAssets().open(ASSET_WWW + "/build.json")) {
            return parseBuild(readAll(in));
        } catch (IOException e) {
            return null;
        }
    }

    static String activeBuild(Context ctx) { return readBuild(currentDir(ctx)); }

    // Extract "build" from a build.json blob without a full JSON parse dependency
    // in this hot path (org.json is fine too; this stays allocation-light).
    static String parseBuild(String json) {
        if (json == null) return null;
        int i = json.indexOf("\"build\"");
        if (i < 0) return null;
        int c = json.indexOf(':', i);
        if (c < 0) return null;
        int q1 = json.indexOf('"', c + 1);
        if (q1 < 0) return null;
        int q2 = json.indexOf('"', q1 + 1);
        if (q2 < 0) return null;
        return json.substring(q1 + 1, q2);
    }

    // Compare TomeRoam build ids "YYYY-MM-DD.N": ISO date sorts lexically, then the
    // trailing counter numerically (so .9 < .17, which a pure string compare botches).
    static int compareBuild(String a, String b) {
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        int da = a.lastIndexOf('.'), db = b.lastIndexOf('.');
        String dateA = da >= 0 ? a.substring(0, da) : a;
        String dateB = db >= 0 ? b.substring(0, db) : b;
        int c = dateA.compareTo(dateB);
        if (c != 0) return c;
        return Integer.compare(tailNum(a, da), tailNum(b, db));
    }

    private static int tailNum(String s, int dot) {
        if (dot < 0 || dot + 1 >= s.length()) return 0;
        try { return Integer.parseInt(s.substring(dot + 1).trim()); } catch (NumberFormatException e) { return 0; }
    }

    static String readBuild(File dir) {
        File f = new File(dir, BUILD_MARK);
        if (!f.exists()) return null;
        try (FileInputStream in = new FileInputStream(f)) {
            return readAll(in).trim();
        } catch (IOException e) { return null; }
    }

    static void writeBuild(File dir, String build) throws IOException {
        if (build == null) return;
        try (FileOutputStream out = new FileOutputStream(new File(dir, BUILD_MARK))) {
            out.write(build.getBytes(StandardCharsets.UTF_8));
        }
    }

    // ---- file helpers ---------------------------------------------------------

    static String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int n;
        while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
        return new String(buf.toByteArray(), StandardCharsets.UTF_8);
    }

    private static void copyAssetDir(Context ctx, String assetPath, File dest) throws IOException {
        String[] kids = ctx.getAssets().list(assetPath);
        if (kids == null || kids.length == 0) {           // a file (leaf)
            dest.getParentFile().mkdirs();
            try (InputStream in = ctx.getAssets().open(assetPath); OutputStream out = new FileOutputStream(dest)) {
                pipe(in, out);
            }
            return;
        }
        dest.mkdirs();                                    // a directory
        for (String kid : kids) copyAssetDir(ctx, assetPath + "/" + kid, new File(dest, kid));
    }

    private static void copyDir(File src, File dst) throws IOException {
        if (src.isDirectory()) {
            dst.mkdirs();
            File[] kids = src.listFiles();
            if (kids != null) for (File k : kids) copyDir(k, new File(dst, k.getName()));
        } else {
            dst.getParentFile().mkdirs();
            try (InputStream in = new FileInputStream(src); OutputStream out = new FileOutputStream(dst)) {
                pipe(in, out);
            }
        }
    }

    static void pipe(InputStream in, OutputStream out) throws IOException {
        byte[] chunk = new byte[8192];
        int n;
        while ((n = in.read(chunk)) > 0) out.write(chunk, 0, n);
    }

    static void deleteRec(File f) {
        if (f == null || !f.exists()) return;
        if (f.isDirectory()) {
            File[] kids = f.listFiles();
            if (kids != null) for (File k : kids) deleteRec(k);
        }
        f.delete();
    }
}
