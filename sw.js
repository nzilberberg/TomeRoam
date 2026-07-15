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
//   * FIRST-INSTALL takeover, but WAIT on UPDATES: the first-ever SW skipWaiting()s
//     so it controls the page from the first load (offline immediately); a NEW build
//     over an existing one stays in "waiting" and is applied only when the user taps
//     Options → App update (or on a full cold launch). Auto-activating an update
//     flipped the controller under a live page and iOS reloaded it with no user tap
//     (the .73 surprise auto-update) — see the install comment. localStorage/token
//     survive the swap, and startup never blocks on the network (cache-first).
//   * RUNTIME IMAGE CACHE for Plex cover art (separate, build-independent cache),
//     with a bundled placeholder fallback. Media/API requests are never cached.
//
// BUILD must be bumped every deploy IN LOCKSTEP with js/debug.js (a test guards
// this) and build.json. Changing these bytes is what makes the browser install a
// new SW.
const BUILD = '2026-07-12.86';
const SHELL_CACHE = 'tomeroam-shell-' + BUILD;   // versioned: dropped when BUILD changes
const IMG_CACHE = 'tomeroam-img-v1';             // build-independent: covers don't change per build
const KEEP = [SHELL_CACHE, IMG_CACHE];           // caches to preserve on activate

// The full app shell — everything needed to render the UI with zero network.
// The css/js entries carry the SAME ?v=<BUILD> query index.html requests, so the
// cache key matches the exact URL the browser asks for. This is what makes builds
// coherent: a stale index.html asks for its OWN ?v= assets (all present together
// in its build's cache) and can never pair with a different build's JS.
const V = '?v=' + BUILD;
// Pure routing/range logic lives in js/swkit.js so it can be unit-tested (sw.js
// itself can't run under Node). Version-stamped so a new build re-imports it.
importScripts('./js/swkit.js' + V);
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
  './js/settings.js' + V,
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
  './js/warmer.js' + V,
  './js/handoff.js' + V,
  './js/downloads-screen.js' + V,
  './js/options-screen.js' + V,
  './js/signin-screen.js' + V,
  './js/home-screen.js' + V,
  './js/nowplaying-screen.js' + V,
  './js/banking.js' + V,
  './js/app.js' + V,
  // js/vendor/eruda.js deliberately NOT precached — 500 KB, lazy-loaded on demand.
];

const PLACEHOLDER = './img/placeholder-cover.svg';

// ---- install: precache the new build --------------------------------------
// Try the atomic addAll first (fast, consistent). If it rejects — e.g. a fresh
// deploy where one asset 404s at the CDN edge for a moment — fall back to
// best-effort per-asset caching so we grab everything that IS available.
//
// skipWaiting() — ONLY on the FIRST-ever install (no active worker yet). Then it
// makes this SW adopt the just-loaded, previously-uncontrolled page immediately
// so the app is offline-capable from the very first load. (History .1–.3: a
// waiting worker couldn't dislodge the old NETWORK-FIRST sw, stranding devices on
// stale HTML — that's why first-install takeover matters. That risk is gone now:
// the shell is cache-first + ?v=<build> versioned, so builds can't mix.)
//
// On an UPDATE (an active worker already exists) we DELIBERATELY do NOT
// skipWaiting — the new worker stays in "waiting" and the OLD worker keeps
// control, so the running/resuming page holds its current build. Auto-activating
// an update flipped the controller out from under a live page and iOS reloaded it
// onto the new build with NO user tap (the surprise auto-update that landed users
// on .73). An update now applies only when the user taps Options → App update
// (postMessage SKIP_WAITING, handled below) or on a genuine full cold launch (no
// clients → the waiting worker activates naturally). Mixed builds stay impossible
// either way: each build serves from its OWN versioned cache.
//
// The activate guard (won't prune old caches until THIS shell is verified
// complete) + shellFirst's all-caches fallback keep offline working even if a
// precache doesn't finish.
self.addEventListener('install', (e) => {
  if (!self.registration.active) self.skipWaiting();   // first install only; updates wait for the user
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
    return;
  }
  // A downloaded/buffered track was deleted (remove, buffer eviction, clear
  // buffer): drop the 1-entry blob cache so we can't keep serving deleted audio
  // (or a stale copy after a re-download) for as long as this worker lives.
  if (d.type === 'EVICT_DL') {
    if (!d.track || _dlCache.track === String(d.track)) _dlCache = { track: null, blob: null };
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

  // The routing table (order load-bearing) lives in SWKit.routeFor so it's
  // unit-tested. 'probe' = build.json (network only — a cached copy would fake
  // reachability offline and each ?ts= URL is unique); 'download' = __dl audio
  // range-served from IndexedDB (iOS rejects blob: URLs for media but plays a
  // same-origin range URL); 'shell' = cache-first app asset; 'image' = cross-
  // origin cover art cache-first; 'passthrough' = everything else cross-origin
  // (Plex API, media parts, banking fetch) — never intercepted, never cached.
  switch (SWKit.routeFor({ sameOrigin, pathname: url.pathname, destination: req.destination })) {
    case 'probe': e.respondWith(probeOnly(req)); return;
    case 'download': e.respondWith(serveDownloadedAudio(req, decodeURIComponent(url.pathname.split('/__dl/')[1] || ''))); return;
    case 'shell': e.respondWith(shellFirst(req)); return;
    case 'image': e.respondWith(imageFirst(req, url)); return;
    // 'passthrough' → do not call respondWith; let the request hit the network.
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
      // ALWAYS close when done (and immediately if the page wants to upgrade the
      // schema): a lingering SW connection with no versionchange handler blocks
      // store.js's versioned open in every client — the whole app then boots
      // without IndexedDB.
      db.onversionchange = () => { try { db.close(); } catch {} };
      const done = (v) => { try { db.close(); } catch {} resolve(v); };
      try {
        if (!db.objectStoreNames.contains('audio')) { done(null); return; }
        const g = db.transaction('audio', 'readonly').objectStore('audio').get(String(track));
        g.onsuccess = () => done(g.result || null);
        g.onerror = () => done(null);
      } catch { done(null); }
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
    // Range math lives in SWKit.parseRange (unit-tested) — incl. the suffix
    // "bytes=-N" case (M4B tail reads) that was once served as the file head.
    const r = SWKit.parseRange(range, size);
    if (r.status === 416) {
      return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    }
    const { start, end } = r;
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
