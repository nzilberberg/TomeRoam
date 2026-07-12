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
//   * SAFE UPDATES: a new SW precaches the new build into its own cache and then
//     WAITS (no auto-skipWaiting). The page detects the waiting worker and shows
//     "Update available — reload to apply"; only then do we activate + reload.
//     So localStorage/token survive, and startup never blocks on an update check.
//   * RUNTIME IMAGE CACHE for Plex cover art (separate, build-independent cache),
//     with a bundled placeholder fallback. Media/API requests are never cached.
//
// BUILD must be bumped every deploy IN LOCKSTEP with js/debug.js (a test guards
// this) and build.json. Changing these bytes is what makes the browser install a
// new SW.
const BUILD = '2026-07-12.1';
const SHELL_CACHE = 'tomeroam-shell-' + BUILD;   // versioned: dropped when BUILD changes
const IMG_CACHE = 'tomeroam-img-v1';             // build-independent: covers don't change per build
const KEEP = [SHELL_CACHE, IMG_CACHE];           // caches to preserve on activate

// The full app shell — everything needed to render the UI with zero network.
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './build.json',
  './css/app.css',
  './icon.svg',
  './img/placeholder-cover.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './js/logic.js',
  './js/debug.js',
  './js/store.js',
  './js/net.js',
  './js/syncqueue.js',
  './js/artloader.js',
  './js/plex.js',
  './js/presence.js',
  './js/progress.js',
  './js/logpipe.js',
  './js/speed.js',
  './js/browse.js',
  './js/app.js',
  // js/vendor/eruda.js deliberately NOT precached — 500 KB, lazy-loaded on demand.
];

const PLACEHOLDER = './img/placeholder-cover.svg';

// ---- install: precache the new build atomically ---------------------------
// addAll is all-or-nothing: if any asset 404s the whole cache is discarded and
// this build never activates — better a stale-but-consistent build than a mixed
// one. We do NOT skipWaiting here: a replacing worker waits until the page opts
// in (the update-prompt flow), so we never surprise-reload over playback.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .catch((err) => { /* a bad asset must not half-install; log to SW console */ console.warn('[sw] precache failed', err); })
  );
});

// ---- activate: drop old build caches, take control ------------------------
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// The page asks a freshly-installed (waiting) worker to take over now.
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (d.type === 'GET_CACHE_STATUS') { cacheStatus().then((s) => { try { e.ports[0] && e.ports[0].postMessage(s); } catch {} }); }
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

  // build.json = the update/reachability probe → always try network first (so
  // update checks are real), fall back to the precached copy when offline.
  if (sameOrigin && /\/build\.json$/.test(url.pathname)) {
    e.respondWith(networkFirst(req));
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

function isImageRequest(req, url) {
  if (req.destination === 'image') return true;
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url.pathname)) return true;
  if (/\/photo\/:\/transcode/.test(url.pathname)) return true;   // Plex cover transcode
  if (/\/(thumb|art|poster|composite)\b/i.test(url.pathname)) return true;
  return false;
}

async function shellFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req, { ignoreSearch: false }) || await cache.match(req.url);
  if (hit) return hit;
  try {
    const fresh = await fetch(req);
    // Runtime-cache same-origin assets we didn't precache (icons, etc.), but never
    // the lazy vendor bundle.
    if (fresh && fresh.ok && !/\/js\/vendor\//.test(new URL(req.url).pathname)) {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    // Offline + uncached. For a navigation, hand back the app shell so the SPA
    // boots and renders its own offline state (never a browser error page).
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html') || await cache.match('./');
      if (shell) return shell;
    }
    return Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(new Request(req.url, { cache: 'no-store' }));
    if (fresh && fresh.ok) { cache.put(req, fresh.clone()).catch(() => {}); return fresh; }
    const hit = await cache.match(req.url);
    return hit || fresh;
  } catch {
    const hit = await cache.match(req.url);
    return hit || Response.error();
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
