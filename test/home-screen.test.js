// Tests for js/home-screen.js's load() — specifically the OWNERSHIP of the shared
// `bookEntries` map that app.js passes in by reference (app.js:2392) and that the live
// playback path reads (bestSource at app.js:783, app.js:1287, the tile line at :514).
//
// load() captures `resume` BEFORE its awaits, and the paint() closure then does
//     for (const k in bookEntries) delete bookEntries[k];
//     for (const b of resume) bookEntries[b.book] = b;
// i.e. it WIPES the shared map and refills it from a pre-gap snapshot. Anything another
// operation did to that map during the round-trip is undone.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');
const { appDom } = require('./dom-fixture.js');

install();
const dom = appDom();                       // the REAL index.html, so clRow/raRow are real
global.window = dom.window;
global.document = dom.window.document;

const deferred = () => { let r; const p = new Promise((res) => { r = res; }); return { promise: p, resolve: r }; };

const BOOKS = [
  { ratingKey: 'bookA', title: 'Book A', parentTitle: 'Author', thumb: '/a', lastViewedAt: 2000, addedAt: 2000 },
  { ratingKey: 'bookB', title: 'Book B', parentTitle: 'Author', thumb: '/b', lastViewedAt: 1000, addedAt: 1000 },
];

const pendingResume = [];
const pendingBooks = [];
global.Plex = {
  getResumeMap: () => { const d = deferred(); pendingResume.push(d); return d.promise; },
  getBooks: () => { const d = deferred(); pendingBooks.push(d); return d.promise; },
  artUrl: (t) => 'art:' + t,
};
global.Browse = { patchRows: () => false, bookSig: (b) => b.ratingKey };
global.Downloads = { available: () => false };          // renderDownloaded bails early
global.PBLogic = require('../js/logic.js');             // the REAL feed derivation
const HomeScreen = require('../js/home-screen.js');

const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

function setup() {
  pendingResume.length = 0;
  pendingBooks.length = 0;
  const bookEntries = {};
  HomeScreen.init({
    byId: (id) => document.getElementById(id),
    renderTile: (b) => { const el = document.createElement('div'); el.dataset.key = b.ratingKey; return el; },
    renderPresence: () => {},
    status: () => {},
    bookEntries,
  });
  return bookEntries;
}

// The mechanism behind "Reset Progress resurrects": doResetProgress deletes the entry
// (app.js:1757) and then reloads the home feed. If a load() was ALREADY in flight, its
// captured `resume` still contains the book, and its paint puts it straight back.
// Modelled on the real sequence: doResetProgress deletes the entry AND reloads, so a
// second load is part of the scenario — the older one just happens to finish last.
test('Reset Progress is not undone by an older load finishing afterwards', async () => {
  const bookEntries = setup();

  const stale = HomeScreen.load();                      // in flight, snapshot still has bookA
  await tick();
  pendingResume[0].resolve([{ book: 'bookA', track: 'bookA-t1', offsetMs: 90000 }]);
  await tick();                                         // `resume` captured; its getBooks is pendingBooks[0]

  delete bookEntries.bookA;                             // ← the reset (app.js:1757)…
  const fresh = HomeScreen.load();                      // …and its reload (app.js:1758)
  await tick();
  pendingResume[1].resolve([]);                         // the post-reset map: bookA is gone
  await tick();
  pendingBooks[1].resolve(BOOKS);
  await fresh;
  await tick();
  assert.ok(!bookEntries.bookA, 'precondition: the reload left bookA out');

  pendingBooks[0].resolve(BOOKS);                       // the STALE load finally paints
  await stale;
  await tick();

  assert.ok(!bookEntries.bookA,
    'the pre-reset snapshot must not resurrect the entry the reset removed');
});

// The same hazard between two overlapping loads: four call sites reach load()
// (enterApp, pull-to-refresh, onReconnect, doResetProgress), so overlap is ordinary.
// Whichever load STARTED first must not get the last word on the shared map.
test('an older load must not repaint bookEntries over a newer one', async () => {
  const bookEntries = setup();

  const first = HomeScreen.load();                      // captures the OLD resume map
  await tick();
  const second = HomeScreen.load();                     // captures the NEW one
  await tick();

  // NOTE the indices: load 1's resume is still pending, so it has NOT reached getBooks.
  // The first getBooks call belongs to load 2.
  pendingResume[1].resolve([]);                         // newer: bookA is gone
  await tick();
  pendingBooks[0].resolve(BOOKS);                       // ← load 2's getBooks
  await second;
  await tick();
  assert.ok(!bookEntries.bookA, 'precondition: the newer load left bookA out');

  pendingResume[0].resolve([{ book: 'bookA', track: 'bookA-t1', offsetMs: 90000 }]);
  await tick();
  pendingBooks[1].resolve(BOOKS);                       // ← now load 1's getBooks
  await first;
  await tick();

  assert.ok(!bookEntries.bookA, 'the older load must not restore what the newer one dropped');
});

// Control: an ordinary single load MUST still populate the map, or "fix" the races by
// never writing at all would look like a pass.
test('an ordinary load populates bookEntries from its resume map', async () => {
  const bookEntries = setup();

  const load = HomeScreen.load();
  await tick();
  pendingResume[0].resolve([{ book: 'bookA', track: 'bookA-t1', offsetMs: 90000 }]);
  await tick();
  pendingBooks[0].resolve(BOOKS);
  await load;
  await tick();

  assert.ok(bookEntries.bookA, 'the resume entry is published to the shared map');
  assert.equal(bookEntries.bookA.offsetMs, 90000);
});
