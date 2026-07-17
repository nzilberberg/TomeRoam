// @ts-check
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
  let conc = 2, active = 0, qi = 0;
  /** @type {{ t: string, rk: any }[]} */
  let queue = [];
  /** @type {any} */
  let tick = null;   // setTimeout handle (number in the browser, Timeout in Node)

  const dbg = (m) => { if (window.PBDebug) PBDebug.log('WARM', m); };

  // AIMD step: +1 on a clean fetch, halve on a failure. Pure → unit-tested.
  const nextConc = (c, ok) => ok ? Math.min(MAX_CONC, c + 1) : Math.max(1, c >> 1);

  // WS2a: budget the warmer in REQUESTS (2/author + 1/book), not books — an
  // unbudgeted list never finishes on a 20k library and floods the relay forever.
  const WARM_WORK_BUDGET = 1500;

  // Phase-2 work list from the two top-level lists. UNDER budget → today's exact
  // authors-first list, unchanged (small-library network behaviour is identical —
  // a recency reorder would alter it even though all work eventually runs).
  // OVER budget → recency-first selection: recently-played books' chapter lists →
  // recently-added → those books' authors → remaining authors → remaining books,
  // deduped, until the budget fills. Pure → unit-tested. Returns { work, skipped }
  // so the caller can LOG the cut (no silent caps).
  function buildWork(authors, books, budget = WARM_WORK_BUDGET) {
    const full = [];
    for (const a of (authors || [])) { full.push({ t: 'authorBooks', rk: a.ratingKey }); full.push({ t: 'author', rk: a.ratingKey }); }
    for (const b of (books || [])) full.push({ t: 'tracks', rk: b.ratingKey });
    if (full.length <= budget) return { work: full, skipped: 0 };

    const seen = new Set();
    const w = [];
    const push = (t, rk) => {
      if (rk == null || w.length >= budget) return;
      const k = t + ':' + rk;
      if (seen.has(k)) return;
      seen.add(k); w.push({ t, rk });
    };
    const authorRks = new Set((authors || []).map((a) => String(a.ratingKey)));
    const pushAuthor = (rk) => {
      if (rk == null || !authorRks.has(String(rk))) return;
      push('authorBooks', rk); push('author', rk);
    };
    const played = (books || []).filter((b) => b.lastViewedAt).sort((a, b) => (b.lastViewedAt || 0) - (a.lastViewedAt || 0));
    const added = (books || []).slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    for (const b of played) push('tracks', b.ratingKey);
    for (const b of added) push('tracks', b.ratingKey);
    for (const b of played) pushAuthor(b.parentRatingKey);
    for (const b of added) pushAuthor(b.parentRatingKey);
    for (const a of (authors || [])) pushAuthor(a.ratingKey);
    for (const b of (books || [])) push('tracks', b.ratingKey);
    return { work: w, skipped: full.length - w.length };
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

  /** @param {{ shouldYield?: () => boolean }} [opts] */
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
      const { work, skipped } = buildWork(authors, books);
      queue = work;
      dbg('start — ' + queue.length + ' pages queued' + (skipped ? ` (budget: ${skipped} requests skipped of ${queue.length + skipped})` : ''));
      pump();
    } catch (e) { dbg('start failed: ' + ((/** @type {Error} */ (e))?.message || 'err')); }
  }

  function pause(p) { paused = !!p; if (!paused) schedule(); }

  return {
    start, pause,
    // internals exposed for unit tests only
    _test: { nextConc, buildWork, MAX_CONC, WARM_WORK_BUDGET },
  };
})();

// Expose on window (top-level `const Warmer` is a lexical global, not
// window.Warmer); app.js reads `window.Warmer`.
if (typeof window !== 'undefined') window.Warmer = Warmer;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Warmer;
