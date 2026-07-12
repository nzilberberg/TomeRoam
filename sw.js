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
const BUILD = '2026-07-12.3';
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

// ---- install: precache the new build --------------------------------------
// Try the atomic addAll first (fast, consistent). If it rejects — e.g. a fresh
// deploy where one asset 404s at the CDN edge for a moment — fall back to
// best-effort per-asset caching so we grab everything that IS available. We do
// NOT skipWaiting: a replacing worker waits for the update prompt.
//
// CRITICAL: install must never leave us in a state where the shell is empty AND
// the old cache is gone. That's guarded in `activate` (it won't prune the old
// cache until THIS shell is verified complete) and in `shellFirst` (it falls
// back across ALL caches). This is the bug that bricked offline in .1.
self.addEventListener('install', (e) => {
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
