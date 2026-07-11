// Service worker — NETWORK-FIRST.
//
// Why network-first (and not the old cache-first): a cache-first shell meant a
// pushed update never reached the phone. The only way to see a new build was a
// private tab, which also wipes localStorage -> forced Plex re-login every time.
// Network-first fixes both: every launch pulls fresh files (bypassing Safari's
// HTTP cache via `cache: 'no-store'`), the cache is only a fallback for offline,
// and nothing here ever touches localStorage, so the Plex token survives.
//
// We deliberately DO NOT touch Plex API / media requests — those are all
// cross-origin, and we bail out before respondWith for anything not our origin.
//
// BUILD must be bumped every deploy (keep it in sync with js/debug.js). Changing
// these bytes is what makes the browser install a new SW.
const BUILD = '2026-07-11.86';
const CACHE = 'tomeroam-' + BUILD;

const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/logic.js',
  './js/debug.js',
  './js/artloader.js',
  './js/plex.js',
  './js/presence.js',
  './js/progress.js',
  './js/logpipe.js',
  './js/speed.js',
  './js/browse.js',
  './js/app.js',
  './manifest.webmanifest',
  './icon.svg',
  // js/vendor/eruda.js deliberately NOT precached — 500 KB, lazy-loaded on demand.
];

// Precache the shell (forcing fresh copies), and take over immediately.
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => {})   // a single 404 must not block activation
  );
});

// Drop every older cache, then control open pages right away.
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Everything cross-origin (Plex API, plex.tv, media, the banking fetch) goes
  // straight to the network, untouched and uncached.
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      // `no-store` skips Safari's HTTP cache, so a push is always picked up.
      const fresh = await fetch(new Request(req.url, { cache: 'no-store' }));
      if (fresh && fresh.ok) {
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      // Offline / unreachable: fall back to whatever we banked.
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
