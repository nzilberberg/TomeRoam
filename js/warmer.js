// warmer.js — background page warmer. After home paints, quietly pre-load the
// browse pages you HAVEN'T opened yet (each author's book list + bio, each book's
// chapter list) so navigating to them is instant even over the slow relay. The
// data is persisted to IndexedDB by the getters (via withCache warm mode); the
// warmer holds no DOM.
//
// STRICTLY subordinate to the foreground. Two live signals gate it, so it can
// never make the thing you're looking at — or the book you're hearing — slower:
//   • Plex.foregroundBusy() — a visible screen or home is fetching/revalidating
//     → yield the relay so that page appears AND goes fresh first.
//   • shouldYield() (= app.js elementBusy) — the live audio element needs the
//     bandwidth → yield, exactly like downloads/banking (the code=4 contention
//     class). Reuses the existing 60s-ahead gate; no new watermark logic.
// Concurrency is opportunistic AIMD: grow while fetches succeed, halve on a
// failure (the relay telling us it's saturated), capped at the browser's ~6/host.
// Coalescing lives in withCache, so if you open a page the warmer is mid-
// fetching, you attach to the SAME request instead of racing a duplicate.
const Warmer = (() => {
  const MAX_CONC = 6;                 // browser caps ~6 concurrent/host anyway
  let started = false, paused = false, shouldYield = () => false;
  let conc = 2, active = 0, queue = [], qi = 0, tick = null;

  const dbg = (m) => { if (window.PBDebug) PBDebug.log('WARM', m); };

  // AIMD step: +1 on a clean fetch, halve on a failure. Pure → unit-tested.
  const nextConc = (c, ok) => ok ? Math.min(MAX_CONC, c + 1) : Math.max(1, c >> 1);

  // Phase-2 work list from the two top-level lists: every author's book list +
  // bio, then every book's chapter list. Pure → unit-tested.
  function buildWork(authors, books) {
    const w = [];
    for (const a of (authors || [])) { w.push({ t: 'authorBooks', rk: a.ratingKey }); w.push({ t: 'author', rk: a.ratingKey }); }
    for (const b of (books || [])) w.push({ t: 'tracks', rk: b.ratingKey });
    return w;
  }

  function doItem(it) {
    const o = { warm: true };
    if (it.t === 'authorBooks') return Plex.getAuthorBooks(it.rk, o);
    if (it.t === 'author') return Plex.getAuthor(it.rk, o);
    return Plex.getAlbumTracks(it.rk, o);
  }

  // Open when nothing higher-priority needs the pipe: not paused, audio not
  // starved, no foreground fetch/revalidate in flight.
  function gatesOpen() {
    if (paused || shouldYield()) return false;
    if (window.Plex && Plex.foregroundBusy && Plex.foregroundBusy()) return false;
    return true;
  }

  function pump() {
    while (active < conc && qi < queue.length && gatesOpen()) {
      const it = queue[qi++]; active++;
      doItem(it)
        .then(() => { conc = nextConc(conc, true); })
        .catch(() => { conc = nextConc(conc, false); })
        .finally(() => { active--; schedule(); });
    }
    if (qi >= queue.length && active === 0) { dbg('done — warmed ' + queue.length + ' pages'); return; }
    if (qi < queue.length) schedule();   // more to do (or gates closed) → heartbeat
  }
  // Re-pump promptly when gates are open, else on a gentle heartbeat so a closed
  // gate (playback / foreground burst) doesn't spin.
  function schedule() { if (tick) return; tick = setTimeout(() => { tick = null; pump(); }, gatesOpen() ? 0 : 500); }

  async function start(opts = {}) {
    if (started) return; started = true;
    shouldYield = opts.shouldYield || (() => false);
    try {
      // Phase 1 — top-level lists FIRST (Authors + Books): makes those tabs
      // instant right away and hands us the ratingKeys for the rest. getBooks is
      // usually already warm from the home load (cheap no-op).
      const [authors, books] = await Promise.all([
        Plex.getAuthors({ warm: true }).catch(() => []),
        Plex.getBooks({ warm: true }).catch(() => []),
      ]);
      queue = buildWork(authors, books);
      dbg('start — ' + queue.length + ' pages queued');
      pump();
    } catch (e) { dbg('start failed: ' + ((e && e.message) || 'err')); }
  }

  function pause(p) { paused = !!p; if (!paused) schedule(); }

  return {
    start, pause,
    // internals exposed for unit tests only
    _test: { nextConc, buildWork, MAX_CONC },
  };
})();

// Expose on window (top-level `const Warmer` is a lexical global, not
// window.Warmer); app.js reads `window.Warmer`.
if (typeof window !== 'undefined') window.Warmer = Warmer;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Warmer;
