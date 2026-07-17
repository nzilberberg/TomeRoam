// artloader.js — throttled, lazy cover-image loading for the TomeRoam PWA.
//
// Why this exists: rendering a list/grid put a real `src` on every cover at
// once, so the browser fired 19+ image requests simultaneously. A thin Plex
// relay can't service that burst — it RESETS most of the connections, so the
// covers failed en masse (confirmed in the in-app log). The images themselves
// are fine (small 400px transcodes); the problem is concurrency.
//
// Fix: templates emit `data-art="<url>"` instead of `src`. Nothing loads until
// the image scrolls near the viewport (IntersectionObserver), and then only a
// few download at a time (a concurrency-capped queue). A MutationObserver
// adopts every `data-art` image added to the DOM, so no render path has to opt
// in. Failures still get retried by debug.js; capping concurrency means only a
// handful can ever be in flight, so a retry storm can't happen.
(() => {
  const MAX_INFLIGHT = 3;          // never hit the relay with more than this many covers at once
  const MAX_RETRY = 3;             // per-image retries before showing the branded fallback
  const NEAR = '400px';            // start loading a bit before it scrolls into view

  const shortUrl = (u) => String(u || '').replace(/X-Plex-Token=[^&]*/i, 'X-Plex-Token=…').replace(/^https?:\/\/[^/]+/i, '');

  let inflight = 0;
  const queue = [];

  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { io.unobserve(e.target); enqueue(e.target); }
        }
      }, { rootMargin: NEAR })
    : null;

  function enqueue(img) {
    if (!img.dataset.art || img.dataset.artState || img.dataset.artReleased) return;   // no url / already handled / disposed
    img.dataset.artState = 'queued';
    queue.push(img);
    pump();
  }

  // Disposal for windowed lists (scaling WS1b): a row leaving the virtual window
  // must fully detach its cover from the pipeline — the IntersectionObserver
  // RETAINS observed targets, so relying on disconnected-node checks alone leaks
  // under sustained scrolling. Marks the img released (a pending retry timer that
  // later fires re-enters enqueue and is refused by the flag), unobserves it, and
  // purges it from the pending queue.
  function release(img) {
    if (!img) return;
    img.dataset.artReleased = '1';
    if (io) { try { io.unobserve(img); } catch { /* already gone */ } }
    const qi = queue.indexOf(img);
    if (qi >= 0) queue.splice(qi, 1);
  }

  function pump() {
    while (inflight < MAX_INFLIGHT && queue.length) {
      const img = queue.shift();
      if (!img.isConnected || img.dataset.artReleased) continue;   // scrolled away / re-rendered / disposed
      const art = img.dataset.art;
      if (!art) continue;
      const tries = (+img.dataset.artRetry || 0);
      const url = tries ? art + (art.includes('?') ? '&' : '?') + 'pbr=' + tries : art;  // cache-bust retries
      inflight++;
      img.dataset.artState = 'loading';
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      let released = false;                                   // guard: load+error can both fire once
      const done = () => {
        if (released) return;
        released = true;
        inflight--;
        img.removeEventListener('load', onL);
        img.removeEventListener('error', onE);
        queueMicrotask(pump);                                // defer so a sync-resolving src can't recurse past the cap
      };
      const onL = () => {
        img.dataset.artState = 'done';
        img.classList.remove('art-failed');
        // Fade IN a cover that took real time to fetch (network), but paint an
        // already-cached one INSTANTLY — replaying the 0.3s fade on a cover that's
        // sitting in the SW/browser cache is exactly the "flash" on reopen (worse
        // with the 3-at-a-time queue: later tiles fade in after the first few).
        const dt = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
        img.classList.add(dt < 120 ? 'art-instant' : 'art-done');   // CSS: art-instant = shown, no fade
        if (tries && window.PBDebug) PBDebug.log('IMG_OK', `recovered after ${tries} ${shortUrl(art)}`);
        done();
      };
      const onE = () => {
        img.removeAttribute('src');                          // kill the broken-image "?" glyph immediately
        // The failure may be a POISONED SW cache entry: an opaque no-cors error
        // response cached as a cover (its HTTP status is invisible to the SW —
        // only this <img> error observes the bad bytes). Evict it so the retry
        // refetches from the network; without this, retries were pointless (the
        // SW strips the pbr= buster and would replay the same cached entry).
        try {
          const c = navigator.serviceWorker && navigator.serviceWorker.controller;
          if (c) c.postMessage({ type: 'EVICT_IMG', url: art });
        } catch {}
        if (tries < MAX_RETRY) {
          img.dataset.artRetry = String(tries + 1);
          const delay = Math.min(700 * 2 ** tries, 6000) + Math.floor(Math.random() * 300);
          if (window.PBDebug) PBDebug.log('IMG_FAIL', `retry ${tries + 1}/${MAX_RETRY} in ${delay}ms ${shortUrl(art)}`);
          setTimeout(() => { img.dataset.artState = ''; enqueue(img); }, delay);   // re-queue → still concurrency-capped
        } else {
          img.dataset.artState = 'failed';
          img.classList.add('art-failed');                   // CSS: branded placeholder, not a broken glyph
          if (window.PBDebug) PBDebug.log('IMG_GIVEUP', `after ${tries} ${shortUrl(art)}`);
        }
        done();
      };
      img.addEventListener('load', onL);
      img.addEventListener('error', onE);
      img.src = url;
    }
  }

  function observe(img) {
    if (!img.dataset.art || img.dataset.artObserved) return;
    img.dataset.artObserved = '1';
    if (io) io.observe(img);
    else enqueue(img);                                       // no IO support → just queue it
  }

  function scan(root) {
    (root || document).querySelectorAll('img[data-art]:not([data-art-observed])').forEach(observe);
  }

  // Adopt any data-art image added anywhere in the app, no per-render opt-in.
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'IMG' && n.dataset && n.dataset.art) observe(n);
        else if (n.querySelectorAll) n.querySelectorAll('img[data-art]').forEach(observe);
      }
    }
  });

  function start() {
    mo.observe(document.body, { childList: true, subtree: true });
    scan(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.ArtLoader = { scan, observe, release };
})();
