// Fill-to-budget scaling — Build A (WS4.1 truncation detection, WS2a warmer
// request budget, WS3 cover-cache FIFO planning). Free parameters are pinned at
// the HOSTILE boundary throughout (cap±0/±1, budget±1, high-water±1) — a value
// chosen so a test passes is the tautology trap.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');

install();
const Plex = require('../js/plex.js');
const Warmer = require('../js/warmer.js');
const SWKit = require('../js/swkit.js');
const { truncationState, REQUEST_CAP } = Plex._test;
const { buildWork, WARM_WORK_BUDGET } = Warmer._test;
const { imgReconcileOrder, imgTrimPlan } = SWKit;

// ---- WS4.1: truncation predicate ------------------------------------------------
test('truncation: totalSize > returned → definitely truncated', () => {
  assert.equal(truncationState(25000, REQUEST_CAP, REQUEST_CAP), 'truncated');
  assert.equal(truncationState(REQUEST_CAP + 1, REQUEST_CAP, REQUEST_CAP), 'truncated');
});

test('truncation: no totalSize + returned EXACTLY the cap → possible (cannot tell a 20k-exact library apart)', () => {
  assert.equal(truncationState(undefined, REQUEST_CAP, REQUEST_CAP), 'possible');
  assert.equal(truncationState('garbage', REQUEST_CAP, REQUEST_CAP), 'possible');
});

test('truncation: complete cases — incl. the hostile exactly-20000-with-totalSize boundary', () => {
  assert.equal(truncationState(REQUEST_CAP, REQUEST_CAP, REQUEST_CAP), 'complete', 'a 20,000-exact library with totalSize must NOT false-flag');
  assert.equal(truncationState(145, 145, REQUEST_CAP), 'complete');
  assert.equal(truncationState(undefined, REQUEST_CAP - 1, REQUEST_CAP), 'complete', 'below the cap without totalSize is complete');
});

// ---- truncationDisplay: a PERSISTED verdict is not commit-bound to the displayed
// listing, so it must not mask a fresh truncation at exactly the cap (review finding 3)
test('truncationDisplay: persisted complete at EXACTLY the cap falls back to possible (grown-past-cap + lost write)', () => {
  const t = { state: 'complete', total: 0, returned: REQUEST_CAP, persisted: true };
  assert.equal(Plex.truncationDisplay(t, REQUEST_CAP).state, 'possible', 'a stale prior-session complete cannot be trusted at the cap');
});
test('truncationDisplay: persisted complete BELOW the cap is trusted (a sub-cap listing cannot be truncated)', () => {
  const t = { state: 'complete', total: 0, returned: 145, persisted: true };
  assert.equal(Plex.truncationDisplay(t, 145).state, 'complete');
});
test('truncationDisplay: a persisted WARNING is always surfaced', () => {
  assert.equal(Plex.truncationDisplay({ state: 'truncated', persisted: true }, REQUEST_CAP).state, 'truncated');
  assert.equal(Plex.truncationDisplay({ state: 'possible', persisted: true }, REQUEST_CAP).state, 'possible');
});
test('truncationDisplay: a LIVE (noted) verdict stands as-is even at the cap', () => {
  assert.equal(Plex.truncationDisplay({ state: 'complete', noted: true }, REQUEST_CAP).state, 'complete', 'this-session verdict describes the listing on screen');
});
test('truncationDisplay: no metadata → count heuristic (cap → possible, under → complete)', () => {
  assert.equal(Plex.truncationDisplay(null, REQUEST_CAP).state, 'possible');
  assert.equal(Plex.truncationDisplay(null, 145).state, 'complete');
});

// ---- WS2a: warmer request budget --------------------------------------------------
const mkAuthors = (n) => Array.from({ length: n }, (_, i) => ({ ratingKey: 'a' + i }));
const mkBooks = (n, authorOf) => Array.from({ length: n }, (_, i) => ({
  ratingKey: 'b' + i,
  parentRatingKey: authorOf ? authorOf(i) : 'a' + (i % 7),
  lastViewedAt: i % 3 === 0 ? 1000 + i : 0,       // every 3rd book "played", newer with higher i
  addedAt: 500 + i,
}));

test('warmer: UNDER budget → today\'s exact authors-first list, byte-identical order (small library unchanged)', () => {
  const authors = mkAuthors(2), books = [{ ratingKey: 'b1' }];
  const { work, skipped } = buildWork(authors, books);
  assert.equal(skipped, 0);
  assert.deepEqual(work, [
    { t: 'authorBooks', rk: 'a0' }, { t: 'author', rk: 'a0' },
    { t: 'authorBooks', rk: 'a1' }, { t: 'author', rk: 'a1' },
    { t: 'tracks', rk: 'b1' },
  ]);
});

test('warmer: EXACTLY at budget → still the full unreordered list (boundary is > not ≥)', () => {
  // 2/author + 1/book: 100 authors + (budget-200) books = exactly WARM_WORK_BUDGET requests.
  const authors = mkAuthors(100), books = mkBooks(WARM_WORK_BUDGET - 200);
  const { work, skipped } = buildWork(authors, books);
  assert.equal(skipped, 0);
  assert.equal(work.length, WARM_WORK_BUDGET);
  assert.deepEqual(work[0], { t: 'authorBooks', rk: 'a0' }, 'authors-first order preserved at the exact boundary');
});

test('warmer: ONE request over budget → capped at budget, recency-first, skip counted', () => {
  const authors = mkAuthors(100), books = mkBooks(WARM_WORK_BUDGET - 199);   // budget+1 total
  const { work, skipped } = buildWork(authors, books);
  assert.equal(work.length, WARM_WORK_BUDGET, 'never exceeds the budget');
  assert.equal(skipped, (200 + books.length) - WARM_WORK_BUDGET, 'the cut is COUNTED, not silent');
  // Recency-first: the most recently played book's tracks lead the list.
  const played = books.filter((b) => b.lastViewedAt).sort((a, b) => b.lastViewedAt - a.lastViewedAt);
  assert.deepEqual(work[0], { t: 'tracks', rk: played[0].ratingKey });
});

test('warmer: over budget, selection dedups and covers played books\' AUTHORS before strangers', () => {
  const authors = mkAuthors(400);                                  // 800 author requests alone → over any small budget
  const books = mkBooks(30, (i) => 'a' + (i % 400));               // 30 track requests, leaving budget for the author phase
  const { work } = buildWork(authors, books, 100);
  assert.equal(work.length, 100);
  const keys = work.map((w) => w.t + ':' + w.rk);
  assert.equal(new Set(keys).size, keys.length, 'no duplicate requests');
  // After the played/added track pulls, the first author work belongs to a played book's author.
  const firstAuthor = work.find((w) => w.t === 'authorBooks');
  const playedAuthors = new Set(books.filter((b) => b.lastViewedAt).map((b) => b.parentRatingKey));
  assert.ok(playedAuthors.has(firstAuthor.rk), 'played books\' authors warm before unrelated authors');
});

test('warmer: books with an unknown parentRatingKey never produce author work (no phantom requests)', () => {
  const authors = mkAuthors(1);
  const books = mkBooks(2000, () => 'not-a-real-author');
  const { work } = buildWork(authors, books, 50);
  for (const w of work) {
    if (w.t !== 'tracks') assert.equal(w.rk, 'a0', 'only KNOWN authors get requests');
  }
});

// ---- WS3: cover-cache FIFO planning -----------------------------------------------
test('img reconcile: persisted order is authoritative; SHUFFLED cache.keys() does not reorder it', () => {
  const order = ['k1', 'k2', 'k3', 'k4'];
  const shuffled = ['k3', 'k1', 'k4', 'k2'];                       // keys() order is NOT insertion order
  assert.deepEqual(imgReconcileOrder(order, shuffled), order);
});

test('img reconcile: unknown-age keys go FIRST (evicted first); vanished keys drop out', () => {
  const order = ['k1', 'kGone', 'k2'];
  const actual = ['k2', 'kNew1', 'k1', 'kNew2'];
  assert.deepEqual(imgReconcileOrder(order, actual), ['kNew1', 'kNew2', 'k1', 'k2']);
});

test('img reconcile: tolerates a null/duplicated index', () => {
  assert.deepEqual(imgReconcileOrder(null, ['a', 'b']), ['a', 'b']);
  assert.deepEqual(imgReconcileOrder(['a', 'a', 'b'], ['a', 'b']), ['a', 'b']);
});

test('img trim: AT the high-water mark → no trim; ONE over → down to low, oldest dropped', () => {
  const at = Array.from({ length: 4000 }, (_, i) => 'k' + i);
  assert.deepEqual(imgTrimPlan(at, 4000, 3600).drop, [], 'count == high is NOT over budget');
  const over = at.concat('k4000');
  const plan = imgTrimPlan(over, 4000, 3600);
  assert.equal(plan.keep.length, 3600, 'trims to the LOW water mark');
  assert.equal(plan.drop.length, 401);
  assert.equal(plan.drop[0], 'k0', 'oldest first');
  assert.equal(plan.keep[plan.keep.length - 1], 'k4000', 'newest survives');
});

test('img trim: an already-far-over-budget cache (first write after reconcile) trims in one pass', () => {
  const way = Array.from({ length: 9000 }, (_, i) => 'k' + i);
  const plan = imgTrimPlan(way, 4000, 3600);
  assert.equal(plan.keep.length, 3600);
  assert.equal(plan.drop.length, 5400);
});

test('warmer: 20k books / 100 authors / budget 1500 → authors STILL warm (the recent phase is bounded — .138 review, finding 3)', () => {
  const authors = mkAuthors(100);
  const books = mkBooks(20000, (i) => 'a' + (i % 100));
  const { work } = buildWork(authors, books, 1500);
  assert.equal(work.length, 1500, 'budget respected');
  const byType = {};
  for (const w of work) byType[w.t] = (byType[w.t] || 0) + 1;
  assert.equal(byType.authorBooks, 100, 'EVERY author\'s drill-down warms — was zero before the bound');
  assert.equal(byType.author, 100, 'every author\'s bio too');
  assert.ok(byType.tracks >= 750, `recent chapter lists still dominate the spend (${byType.tracks})`);
  // Recency still leads: the very first request is the most recently played book.
  const played = books.filter((b) => b.lastViewedAt).sort((a, b) => b.lastViewedAt - a.lastViewedAt);
  assert.deepEqual(work[0], { t: 'tracks', rk: played[0].ratingKey });
});

// ---- review finding (.148): the cover-cache clear must reset ENTRIES, FIFO
// bookkeeping and the measurement counters as ONE owned operation. A page-side
// caches.delete() left the still-running worker's state stale, so a re-downloaded
// cover looked "already known" and a cumulative counter made any post-clear
// reading uninterpretable.
const { imgStateFresh, imgStateReset, imgStateNote } = SWKit;

test('imgState: reset clears the known-key set — a previously known key counts as NEW again', () => {
  let s = imgStateFresh();
  s.order = []; s.known = new Set();                 // as imgEnsureOrder would leave it
  assert.equal(imgStateNote(s, 'coverA'), true, 'first insert is new');
  assert.equal(imgStateNote(s, 'coverA'), false, 'already known → not re-recorded');

  s = imgStateReset(s);                              // the clear

  assert.equal(imgStateNote(s, 'coverA'), true, 'after a clear the SAME key must re-record as new');
  assert.deepEqual(s.order, ['coverA'], 'and it takes a fresh slot in the FIFO order');
});

test('imgState: reset zeroes the interception counters so a post-clear delta starts at 0', () => {
  let s = imgStateFresh();
  s.stats.seen = 20; s.stats.hit = 12; s.stats.put = 8;   // pre-clear traffic
  s = imgStateReset(s);
  assert.deepEqual(s.stats, { seen: 0, hit: 0, put: 0 }, 'pre-clear traffic cannot leak into the new window');
});

test('imgState: reset bumps the epoch so two readings from different windows are distinguishable', () => {
  let s = imgStateFresh();
  assert.equal(s.epoch, 0);
  s = imgStateReset(s);
  assert.equal(s.epoch, 1, 'epoch delimits the measurement window');
  s = imgStateReset(s);
  assert.equal(s.epoch, 2);
});

test('imgState: reset empties order/known rather than nulling them (no lazy reload of the OLD key set)', () => {
  let s = imgStateFresh();
  s.order = ['old1', 'old2']; s.known = new Set(s.order);
  s = imgStateReset(s);
  assert.deepEqual(s.order, [], 'order is empty, not null — the cache was recreated empty');
  assert.equal(s.known.size, 0);
  assert.equal(s.known.has('old1'), false, 'stale keys must not survive the clear');
});

// ---- review finding (.149): "atomic" must cover the CACHE, not just the state
// object. Two gaps: the clear reported success without verifying the cache was
// actually empty, and a cover fetch in flight could commit across a clear boundary.
const { imgClearCache, imgCommit } = SWKit;

// A CacheStorage fake whose whole-cache delete can silently no-op (the WebKit
// behaviour the page-side sweep used to defend against, dropped in .149).
function fakeCaches({ deleteWorks = true } = {}) {
  const store = new Map();                       // name -> Map(key -> value)
  const mk = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      keys: async () => [...m.keys()],
      delete: async (k) => m.delete(k),
      put: async (k, v) => { m.set(k, v); return true; },
      match: async (k) => m.get(k),
    };
  };
  return {
    _store: store,
    delete: async (name) => { if (deleteWorks) store.delete(name); return deleteWorks; },
    open: async (name) => mk(name),
  };
}

test('imgClearCache: a whole-cache delete that SILENTLY no-ops still ends empty (per-entry sweep)', async () => {
  const c = fakeCaches({ deleteWorks: false });
  const cache = await c.open('img');
  await cache.put('a', 1); await cache.put('b', 2); await cache.put('c', 3);
  const { remaining } = await imgClearCache(c, 'img');
  assert.equal(remaining, 0, 'survivors are deleted individually — never reported as cleared while present');
  assert.deepEqual(await (await c.open('img')).keys(), []);
});

test('imgClearCache: reports the TRUE remaining count when entries cannot be removed', async () => {
  const c = fakeCaches({ deleteWorks: false });
  const cache = await c.open('img');
  await cache.put('stuck', 1);
  cache.delete = async () => false;                       // per-entry delete fails too
  c.open = async () => cache;                             // always hand back this stubborn cache
  const { remaining } = await imgClearCache(c, 'img');
  assert.equal(remaining, 1, 'an unclearable cache must report remaining>0 so the caller can refuse success');
});

test('imgCommit: a fetch that started BEFORE a clear does not repopulate the cache or bump the new epoch', async () => {
  let s = imgStateFresh(); s.order = []; s.known = new Set();
  const c = fakeCaches(); const cache = await c.open('img');
  const requestEpoch = s.epoch;                           // request starts in epoch 0
  s.stats.seen++;
  s = imgStateReset(s);                                   // clear commits mid-flight → epoch 1

  const committed = await imgCommit(s, requestEpoch, cache, 'coverA', 'bytes');

  assert.equal(committed, false, 'the stale write is dropped');
  assert.deepEqual(await cache.keys(), [], 'the just-cleared cache is NOT repopulated');
  assert.equal(s.stats.put, 0, 'and the new window\'s put is untouched');
  assert.ok(s.stats.put <= s.stats.seen, 'a clean window can never show put > seen');
});

test('imgCommit: a fetch within the SAME epoch commits normally', async () => {
  const s = imgStateFresh(); s.order = []; s.known = new Set();
  const c = fakeCaches(); const cache = await c.open('img');
  const committed = await imgCommit(s, s.epoch, cache, 'coverA', 'bytes');
  assert.equal(committed, true);
  assert.deepEqual(await cache.keys(), ['coverA']);
  assert.equal(s.stats.put, 1);
});
