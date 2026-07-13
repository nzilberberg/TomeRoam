// Service worker — CACHE-FIRST app shell with atomic, versioned build updates.
//
// History / why this shape (read before "fixing" it):
//   * The ORIGINAL cache-first shell shipped updates so poorly that the only way
//     to see a new build was a private tab (which wiped localStorage → forced a
//     Plex re-login). That pain drove a NETWORK-FIRST rewrite.
//   * But network-first made GitHub a RUNTIME dependency: every launch blocked on
//     a network round-trip, so a slow/unreachable app host = slow/broken startup.
//     That violates the whole offline goal (app must open with no connection).
//
// This version resolves both, the right way:
//   * CACHE-FIRST for the shell → instant, offline-capable startup; GitHub is an
//     install/update host only, never needed to START the app.
//   * ATOMIC VERSIONED caches (`SHELL_CACHE` keyed by BUILD): a build's assets are
//     precached together; the page is only ever served from ONE build's cache, so
//     there is no mixed-build window (index.html from build 50 + JS from build 48).
//   * AUTO-TAKEOVER UPDATES: a new SW precaches its build then skipWaiting()s so
//     it replaces the previous worker immediately; app.js reloads on
//     controllerchange (deferred while audio plays) so the page lands fully on the
//     new build. We do NOT rely on a "waiting + update prompt" flow — it could not
//     dislodge a still-controlling old worker, which left devices on a stale
//     index.html (see the install comment). localStorage/token survive across the
//     swap, and startup still never blocks on the network (cache-first).
//   * RUNTIME IMAGE CACHE for Plex cover art (separate, build-independent cache),
//     with a bundled placeholder fallback. Media/API requests are never cached.
//
// BUILD must be bumped every deploy IN LOCKSTEP with js/debug.js (a test guards
// this) and build.json. Changing these bytes is what makes the browser install a
// new SW.
const BUILD = '2026-07-12.14';
const SHELL_CACHE = 'tomeroam-shell-' + BUILD;   // versioned: dropped when BUILD changes
const IMG_CACHE = 'tomeroam-img-v1';             // build-independent: covers don't change per build
const KEEP = [SHELL_CACHE, IMG_CACHE];           // caches to preserve on activate

// The full app shell — everything needed to render the UI with zero network.
// The css/js entries carry the SAME ?v=<BUILD> query index.html requests, so the
// cache key matches the exact URL the browser asks for. This is what makes builds
// coherent: a stale index.html asks for its OWN ?v= assets (all present together
// in its build's cache) and can never pair with a different build's JS.
const V = '?v=' + BUILD;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './build.json',
  './css/app.css' + V,
  './icon.svg',
  './img/placeholder-cover.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './js/logic.js' + V,
  './js/debug.js' + V,
  './js/store.js' + V,
  './js/net.js' + V,
  './js/downloads.js' + V,
  './js/syncqueue.js' + V,
  './js/artloader.js' + V,
  './js/plex.js' + V,
  './js/presence.js' + V,
  './js/progress.js' + V,
  './js/logpipe.js' + V,
  './js/speed.js' + V,
  './js/browse.js' + V,
  './js/app.js' + V,
  // js/vendor/eruda.js deliberately NOT precached — 500 KB, lazy-loaded on demand.
];

const PLACEHOLDER = './img/placeholder-cover.svg';

// ---- install: precache the new build --------------------------------------
// Try the atomic addAll first (fast, consistent). If it rejects — e.g. a fresh
// deploy where one asset 404s at the CDN edge for a moment — fall back to
// best-effort per-asset caching so we grab everything that IS available.
//
// We call skipWaiting() so this build TAKES OVER immediately. History (learned
// the hard way in .1–.3): a "waiting" worker that only activates on the update
// prompt could NOT replace the previous network-first SW while a client stayed
// alive — the device kept running the OLD sw + a STALE index.html (fresh JS,
// old HTML with no <script> tags for the new modules → window.Store/Net
// undefined → offline broken). Auto-takeover + the controllerchange reload in
// app.js is what actually ships a consistent build. Mixed builds are still
// impossible because each build serves from its OWN versioned cache and the
// reload lands entirely on the new one.
//
// The activate guard (won't prune old caches until THIS shell is verified
// complete) + shellFirst's all-caches fallback keep offline working even if a
// precache doesn't finish.
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(SHELL_CACHE);
    try {
      await c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })));
    } catch (err) {
      console.warn('[sw] atomic precache failed, retrying per-asset', err);
      await Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    }
  })());
});

// ---- activate: take control; prune old caches ONLY when it's safe ----------
// We only delete previous caches once this build's shell is fully present —
// otherwise a half-finished precache would leave nothing to serve offline. If
// the shell is incomplete (and can't be completed right now, e.g. offline), we
// KEEP the old caches so the app still loads from them via shellFirst's
// all-caches fallback. A later activate (after an online session self-heals the
// shell) does the pruning.
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await self.clients.claim();
    const complete = await ensureShellComplete();
    if (!complete) { console.warn('[sw] shell incomplete — keeping old caches as fallback'); return; }
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
  })());
});

// True once every shell asset is cached. If some are missing, try to fetch the
// stragglers (network may be up now) before reporting. Never throws.
async function ensureShellComplete() {
  try {
    const c = await caches.open(SHELL_CACHE);
    const missing = [];
    for (const u of ASSETS) { if (!(await c.match(u))) missing.push(u); }
    if (!missing.length) return true;
    await Promise.all(missing.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    for (const u of ASSETS) { if (!(await c.match(u))) return false; }
    return true;
  } catch { return false; }
}

// The page asks a freshly-installed (waiting) worker to take over now.
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (d.type === 'GET_CACHE_STATUS') { cacheStatus().then((s) => { try { e.ports[0] && e.ports[0].postMessage(s); } catch {} }); return; }
  // artloader reports a cover whose <img> fired `error`. An opaque no-cors
  // response hides its HTTP status, so a Plex error page can get cached as an
  // "image" — the <img> decode failure is the only place that's observable.
  // Evict the entry so the retry goes back to the network instead of re-hitting
  // the poisoned cache (imageKey strips the pbr= retry cache-buster, so without
  // this every retry would be served the same bad bytes).
  if (d.type === 'EVICT_IMG' && d.url) {
    const work = (async () => {
      try {
        const c = await caches.open(IMG_CACHE);
        await c.delete(imageKey(new URL(d.url)));
      } catch {}
    })();
    if (e.waitUntil) e.waitUntil(work);
  }
});

// Diagnostics: which shell assets are actually present in the current cache.
async function cacheStatus() {
  const out = { build: BUILD, shellCache: SHELL_CACHE, imgCache: IMG_CACHE, expected: ASSETS.length, present: 0, missing: [] };
  try {
    const c = await caches.open(SHELL_CACHE);
    for (const u of ASSETS) { const hit = await c.match(u); if (hit) out.present++; else out.missing.push(u); }
    const ic = await caches.open(IMG_CACHE);
    out.imgCount = (await ic.keys()).length;
    out.cacheNames = await caches.keys();
  } catch (e) { out.error = (e && e.message) || 'status failed'; }
  return out;
}

// ---- fetch routing --------------------------------------------------------
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // build.json = the update/reachability probe → network only, no cache fallback
  // (a cached copy would fake "app host reachable" while offline, and each
  // ?ts= probe URL is unique so runtime-caching them grew the shell cache by one
  // dead entry per poll). The precached copy exists only for shell completeness.
  if (sameOrigin && /\/build\.json$/.test(url.pathname)) {
    e.respondWith(probeOnly(req));
    return;
  }
  // Downloaded audio → serve the IndexedDB blob as a RANGE-capable HTTP response.
  // (`./__dl/<trackRatingKey>`.) iOS <audio> rejects blob: object URLs for media
  // but plays a range-serving same-origin URL fine — this is what makes offline
  // downloaded playback work on iOS.
  if (sameOrigin && /\/__dl\//.test(url.pathname)) {
    e.respondWith(serveDownloadedAudio(req, decodeURIComponent(url.pathname.split('/__dl/')[1] || '')));
    return;
  }
  // Same-origin = the app shell/static assets → cache-first (instant, offline).
  if (sameOrigin) {
    e.respondWith(shellFirst(req));
    return;
  }
  // Cross-origin cover art (Plex) → cache-first image with placeholder fallback.
  // Everything else cross-origin (Plex API, media/audio parts, the banking fetch)
  // falls through untouched: never intercepted, never cached.
  if (isImageRequest(req, url)) {
    e.respondWith(imageFirst(req, url));
    return;
  }
});

// Read one downloaded-audio record straight from IndexedDB (same DB store.js
// writes: 'tomeroam' → 'audio', keyPath 'track'). Open WITHOUT a version so we
// never trigger an upgrade from the worker.
function swGetAudio(track) {
  return new Promise((resolve) => {
    let req; try { req = indexedDB.open('tomeroam'); } catch { return resolve(null); }
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      try {
        if (!db.objectStoreNames.contains('audio')) { resolve(null); return; }
        const g = db.transaction('audio', 'readonly').objectStore('audio').get(String(track));
        g.onsuccess = () => resolve(g.result || null);
        g.onerror = () => resolve(null);
      } catch { resolve(null); }
    };
  });
}

// 1-entry cache: iOS fires many range requests for the same track — avoid
// re-reading the whole blob from IndexedDB each time.
let _dlCache = { track: null, blob: null };
async function dlBlob(track) {
  if (_dlCache.track === String(track) && _dlCache.blob) return _dlCache.blob;
  const rec = await swGetAudio(track);
  _dlCache = { track: String(track), blob: (rec && rec.blob) || null };
  return _dlCache.blob;
}

// Serve a downloaded track as a real, range-capable media response.
async function serveDownloadedAudio(req, track) {
  const blob = await dlBlob(track);
  if (!blob) return new Response('Not downloaded', { status: 404 });
  const size = blob.size, type = blob.type || 'audio/mpeg';
  const range = req.headers.get('range');
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : size - 1;
    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= size) end = size - 1;
    if (start > end || start >= size) {
      return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    }
    return new Response(blob.slice(start, end + 1), {
      status: 206,
      headers: {
        'Content-Type': type, 'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
      },
    });
  }
  return new Response(blob, {
    status: 200,
    headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' },
  });
}

function isImageRequest(req, url) {
  if (req.destination === 'image') return true;
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url.pathname)) return true;
  if (/\/photo\/:\/transcode/.test(url.pathname)) return true;   // Plex cover transcode
  if (/\/(thumb|art|poster|composite)\b/i.test(url.pathname)) return true;
  return false;
}

async function shellFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  // Look in THIS build's shell first, then across ALL caches (an older build's
  // cache still counts — better a consistent older asset than a blank screen).
  const hit = await cache.match(req) || await cache.match(req.url) || await caches.match(req) || await caches.match(req.url);
  if (hit) return hit;
  try {
    const fresh = await fetch(req);
    // Runtime-cache same-origin assets (self-heals a shell whose precache didn't
    // finish), but never the lazy vendor bundle.
    if (fresh && fresh.ok && !/\/js\/vendor\//.test(new URL(req.url).pathname)) {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    // Offline + uncached. For a navigation, hand back the app shell (any cache) so
    // the SPA boots and renders its own offline state (never a browser error page).
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html') || await cache.match('./')
        || await caches.match('./index.html') || await caches.match('./');
      if (shell) return shell;
    }
    return Response.error();
  }
}

// Reachability probe passthrough: hit the network, report failure honestly.
// Deliberately NO cache write and NO cache fallback — Net.checkAppHost's whole
// job is to learn whether the app host is reachable RIGHT NOW.
async function probeOnly(req) {
  try {
    return await fetch(new Request(req.url, { cache: 'no-store' }));
  } catch {
    return Response.error();
  }
}

// Cover art: cache-first on a TOKEN-STRIPPED key (so the same cover is found even
// after Plex rotates the token, and no token is ever written into a cache key).
async function imageFirst(req, url) {
  const cache = await caches.open(IMG_CACHE);
  const key = imageKey(url);
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const res = await fetch(req);          // as issued by <img> (usually no-cors → opaque)
    // Cache real successes and opaque cross-origin responses (can't inspect status
    // on opaque, but a genuine relay RESET REJECTS the fetch and lands in catch —
    // so we don't cache connection failures, only completed responses).
    if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone()).catch(() => {});
    return res;
  } catch {
    const shell = await caches.open(SHELL_CACHE);
    return (await shell.match(PLACEHOLDER)) || Response.error();
  }
}

// Stable cache key for a Plex cover: drop the token + retry cache-buster, keep the
// path and sizing params (width/height/url) so different sizes stay distinct.
function imageKey(url) {
  try {
    const u = new URL(url.href);
    u.searchParams.delete('X-Plex-Token');
    u.searchParams.delete('pbr');
    const qs = u.searchParams.toString();
    return u.origin + u.pathname + (qs ? '?' + qs : '');
  } catch { return url.href; }
}
