package io.github.nzilberberg.tomeroam;

// ApkUpdater — Track B: self-update the NATIVE APK for the rare changes Track A
// (web OTA) can't ship — MainActivity, the TLS trust repair, the updater itself.
//
// Triggered by WebUpdater only when build.json's `nativeVersion` exceeds the value
// baked into the running APK, so ordinary web-only pushes never nag for an install.
// Flow: confirm with the user, download the latest signed TomeRoam.apk from the
// GitHub release, and hand it to the system package installer. Because it is signed
// with the same key, Android does an in-place UPDATE (data preserved) and the user
// taps "Update" once — no manual download/reinstall.
//
// The one unavoidable OS gate for a sideloaded self-update: "install unknown apps"
// must be allowed for this app (API 26+). We send the user straight to that toggle
// the first time; after that, updates are one tap.

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

final class ApkUpdater {

    private static final String TAG = "TomeRoamUpdate";
    private static final String APK_URL =
        "https://github.com/nzilberberg/TomeRoam/releases/latest/download/TomeRoam.apk";
    private static final String AUTHORITY = "io.github.nzilberberg.tomeroam.fileprovider";

    private static boolean prompted = false;   // once per process — don't nag repeatedly

    private ApkUpdater() {}

    static void prompt(final Activity act, final int remoteNative) {
        if (prompted || act.isFinishing()) return;
        prompted = true;
        new AlertDialog.Builder(act)
            .setTitle("Update available")
            .setMessage("A new version of TomeRoam is ready to install. Update now?")
            .setPositiveButton("Update", (d, w) -> ensurePermissionThenInstall(act))
            .setNegativeButton("Later", null)
            .show();
    }

    // API 26+ requires the app to be an allowed install source. If it isn't yet,
    // send the user to that system toggle; they can retry the update afterward.
    private static void ensurePermissionThenInstall(final Activity act) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !act.getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(act, "Allow TomeRoam to install updates, then reopen the app", Toast.LENGTH_LONG).show();
            try {
                act.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + act.getPackageName())));
            } catch (Exception e) {
                act.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES));
            }
            return;
        }
        Toast.makeText(act, "Downloading update…", Toast.LENGTH_SHORT).show();
        new Thread(() -> downloadAndInstall(act), "apk-updater").start();
    }

    private static void downloadAndInstall(final Activity act) {
        File dir = new File(act.getCacheDir(), "update");
        dir.mkdirs();
        File apk = new File(dir, "TomeRoam.apk");
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(APK_URL).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(60000);
            c.setInstanceFollowRedirects(true);
            try {
                if (c.getResponseCode() != 200) { toast(act, "Update download failed"); return; }
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                    WebFiles.pipe(in, out);
                }
            } finally { c.disconnect(); }

            if (apk.length() == 0) { toast(act, "Update download failed"); return; }

            Uri uri = Uri.parse("content://" + AUTHORITY + "/TomeRoam.apk");
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            act.startActivity(i);
        } catch (Exception e) {
            Log.i(TAG, "apk update error: " + e);
            toast(act, "Update failed: " + e.getMessage());
        }
    }

    private static void toast(final Activity act, final String msg) {
        act.runOnUiThread(() -> Toast.makeText(act, msg, Toast.LENGTH_LONG).show());
    }
}
