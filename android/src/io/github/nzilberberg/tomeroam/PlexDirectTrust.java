package io.github.nzilberberg.tomeroam;

// Fixes the *.plex.direct TLS failure in Android WebView.
//
// Plex serves its Let's Encrypt certificate WITHOUT the intermediate (a chain
// of one). Desktop browsers and iOS silently repair that by fetching the
// missing issuer via the cert's AIA URL; Android's WebView does not, so every
// https://*.plex.direct connection — local AND relay — fails the handshake and
// the app can never reach the server (plex.tv works because it serves a full
// chain). This class performs the same repair the desktop browsers do, then
// validates properly:
//   leaf --(AIA fetch)--> Let's Encrypt intermediate (e.g. YR1)
//        --(AIA fetch)--> ISRG Root YR (cross-signed by ISRG Root X1)
//        --> pinned ISRG Root X1 (bundled at assets/certs/, valid to 2035)
// Every hop's signature and validity window is verified and the leaf's SAN
// must match the requested host. Only *.plex.direct is ever routed here;
// anything that fails verification is cancelled exactly like stock WebView.

import android.content.Context;
import android.net.http.SslCertificate;
import android.os.Bundle;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

final class PlexDirectTrust {

    private static final int MAX_HOPS = 4;
    private static final Map<String, Boolean> cache = new HashMap<>();
    private static X509Certificate root; // pinned ISRG Root X1
    private static SSLSocketFactory sslFactory;

    private PlexDirectTrust() {}

    // ---- HttpURLConnection variant --------------------------------------------
    // The WebView path (verify() below) only fixes WebView-initiated loads. Our own
    // HttpURLConnection to *.plex.direct (the cover-image cache) needs the SAME
    // chain repair, so expose an SSLSocketFactory + HostnameVerifier that apply it.
    // Only ever attach these to *.plex.direct requests.

    static synchronized SSLSocketFactory socketFactory(Context ctx) {
        if (sslFactory != null) return sslFactory;
        try {
            loadRoot(ctx);
            final CertificateFactory cf = CertificateFactory.getInstance("X.509");
            X509TrustManager tm = new X509TrustManager() {
                public void checkClientTrusted(X509Certificate[] chain, String authType) {}
                public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
                    try { anchorToRoot(cf, chain); }
                    catch (CertificateException e) { throw e; }
                    catch (Exception e) { throw new CertificateException("plex.direct chain repair failed", e); }
                }
                public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            };
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, new TrustManager[] { tm }, null);
            sslFactory = sc.getSocketFactory();
            return sslFactory;
        } catch (Exception e) {
            return null;
        }
    }

    static HostnameVerifier hostnameVerifier() {
        return (hostname, session) -> {
            try {
                if (hostname == null || !hostname.endsWith(".plex.direct")) return false;
                java.security.cert.Certificate[] pc = session.getPeerCertificates();
                if (pc == null || pc.length == 0 || !(pc[0] instanceof X509Certificate)) return false;
                return hostMatches((X509Certificate) pc[0], hostname);
            } catch (Exception e) { return false; }
        };
    }

    // Walk leaf -> ... -> pinned root, verifying every signature and validity
    // window; missing issuers are fetched via AIA (as browsers do). Throws on any
    // failure. Shared by the TrustManager above.
    private static void anchorToRoot(CertificateFactory cf, X509Certificate[] chain) throws Exception {
        if (chain == null || chain.length == 0) throw new CertificateException("empty chain");
        X509Certificate current = chain[0];
        for (int hop = 0; hop <= MAX_HOPS; hop++) {
            current.checkValidity();
            if (current.getIssuerX500Principal().equals(root.getSubjectX500Principal())) {
                current.verify(root.getPublicKey());
                root.checkValidity();
                return;
            }
            X509Certificate issuer = findIssuer(chain, current);
            if (issuer == null) issuer = fetchIssuer(cf, current);
            if (issuer == null) throw new CertificateException("issuer not found");
            current.verify(issuer.getPublicKey());
            current = issuer;
        }
        throw new CertificateException("chain too long");
    }

    private static X509Certificate findIssuer(X509Certificate[] chain, X509Certificate cert) {
        for (X509Certificate c : chain) {
            if (c != cert && c.getSubjectX500Principal().equals(cert.getIssuerX500Principal())) return c;
        }
        return null;
    }

    private static synchronized void loadRoot(Context ctx) throws Exception {
        if (root != null) return;
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        try (InputStream in = ctx.getAssets().open("certs/isrg-root-x1.cer")) {
            root = (X509Certificate) cf.generateCertificate(in);
        }
    }

    static synchronized boolean verify(Context ctx, SslCertificate sslCert, String host) {
        if (host == null || !host.endsWith(".plex.direct")) return false;
        Boolean hit = cache.get(host);
        if (hit != null) return hit;
        boolean ok;
        try {
            ok = doVerify(ctx, sslCert, host);
        } catch (Exception e) {
            ok = false;
        }
        if (ok) cache.put(host, Boolean.TRUE); // cache successes only; failures may be transient
        return ok;
    }

    private static boolean doVerify(Context ctx, SslCertificate sslCert, String host) throws Exception {
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        loadRoot(ctx);
        X509Certificate leaf = fromSslCertificate(cf, sslCert);
        if (leaf == null || !hostMatches(leaf, host)) return false;

        X509Certificate current = leaf;
        for (int hop = 0; hop <= MAX_HOPS; hop++) {
            current.checkValidity();
            if (current.getIssuerX500Principal().equals(root.getSubjectX500Principal())) {
                current.verify(root.getPublicKey()); // throws if forged
                root.checkValidity();
                return true;                          // anchored at the pinned root
            }
            X509Certificate issuer = fetchIssuer(cf, current);
            if (issuer == null) return false;
            current.verify(issuer.getPublicKey());    // throws if forged
            current = issuer;
        }
        return false;
    }

    private static X509Certificate fromSslCertificate(CertificateFactory cf, SslCertificate c) throws Exception {
        // SslCertificate.getX509Certificate() only exists on API 29+; the saved
        // state bundle carries the DER bytes on every API level.
        Bundle b = SslCertificate.saveState(c);
        byte[] der = b == null ? null : b.getByteArray("x509-certificate");
        if (der == null) return null;
        return (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(der));
    }

    // SAN check: exact dNSName match or a single leftmost wildcard label.
    private static boolean hostMatches(X509Certificate leaf, String host) throws Exception {
        Collection<List<?>> sans = leaf.getSubjectAlternativeNames();
        if (sans == null) return false;
        String h = host.toLowerCase();
        for (List<?> san : sans) {
            if (san.size() < 2 || !(san.get(0) instanceof Integer) || (Integer) san.get(0) != 2) continue;
            String name = String.valueOf(san.get(1)).toLowerCase();
            if (name.equals(h)) return true;
            if (name.startsWith("*.")) {
                String suffix = name.substring(1); // ".<domain>"
                if (h.endsWith(suffix) && h.length() > suffix.length()
                        && h.substring(0, h.length() - suffix.length()).indexOf('.') < 0) return true;
            }
        }
        return false;
    }

    // Fetch the issuer cert from the AIA "CA Issuers" URL, like desktop
    // browsers do. CAs publish these over plain http; the DER is signature-
    // verified by the caller, so the cleartext transport cannot be abused.
    private static X509Certificate fetchIssuer(CertificateFactory cf, X509Certificate cert) throws Exception {
        String url = caIssuersUrl(cert);
        if (url == null) return null;
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(8000);
        try (InputStream in = conn.getInputStream()) {
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int n;
            while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
            return (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(buf.toByteArray()));
        } finally {
            conn.disconnect();
        }
    }

    // Minimal AIA parse: scan the extension bytes for the first http URL that
    // is not an OCSP responder. (A full DER walk needs an ASN.1 library; the
    // URL is a plain ASCII IA5String inside the extension, so a scan is safe —
    // and a scraped-but-wrong URL can only yield a cert that fails the
    // signature checks above.)
    private static String caIssuersUrl(X509Certificate cert) {
        byte[] ext = cert.getExtensionValue("1.3.6.1.5.5.7.1.1");
        if (ext == null) return null;
        String s = new String(ext, StandardCharsets.ISO_8859_1);
        int i = 0;
        while ((i = s.indexOf("http", i)) >= 0) {
            int end = i;
            while (end < s.length() && s.charAt(end) > 0x20 && s.charAt(end) < 0x7f) end++;
            String url = s.substring(i, end);
            if (!url.contains("ocsp")) return url;
            i = end;
        }
        return null;
    }
}
