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
