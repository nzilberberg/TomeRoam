// Browse.render()'s CACHE-MISS path owns the browse scroll, and it must only use that
// ownership while its page is the one on screen.
//
// render() awaits fetchFor(), then calls positionOnEnter → applyScrollY, which writes a
// scrollTop. Since PLAN-swipe-declone.md §5.3.1 the SCROLLER is each `.browsepage`, not the
// #browse host, so the write surface this fixture watches is every element's scrollTop
// rather than the mount's alone — a host-only spy would record nothing and every
// "must not scroll" assertion below would pass vacuously. If the user navigates away during
// a slow fetch, the superseded page's completion still scrolled — to a Y measured from a
// display:none node.
//
// The subtlety that makes this worth a test: the obvious guard (is this node still
// the cached one, still connected?) does NOT catch it. Pages stay cached and stay in
// the DOM after navigation; showPage() only toggles `.hidden`. The first fix here
// mirrored the repaint closure's cache-identity check and the yank still happened.
const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<div id="mount"></div>', { url: 'http://x/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);

// Spy the scrollTop WRITE surface on EVERY element (applyScrollY's write target is the
// PAGE node, which render() creates during the test, so the spy has to be on the prototype
// rather than on one element captured up front).
let scrolls = [];
Object.defineProperty(dom.window.Element.prototype, 'scrollTop', {
  configurable: true,
  get() { return this.__scrollTop || 0; },
  set(v) { this.__scrollTop = v; scrolls.push(v); },
});

global.PBLogic = require('../js/logic.js');
global.Plex = {
  getAuthors: async () => [{ ratingKey: 'au1', title: 'Auth', childCount: 1 }],   // page B: instant
  artUrl: (t) => 'art:' + t,
};
const Browse = require('../js/browse.js');
Browse.init({
  mount: document.getElementById('mount'),
  onRender: () => {}, renderTile: () => document.createElement('div'),
  status: () => {}, byId: (id) => document.getElementById(id),
  openBook: () => {}, openAuthor: () => {},
});
const tick = (ms = 8) => new Promise((r) => setTimeout(r, ms));

// A FILES page, deliberately (PLAN-swipe-declone.md §5.3.4), same reason as the control below: a
// LIST page derives NO entry position any more, so a list-page fixture here could not fail on the
// guard it exists to prove — reading A (navigated away) and reading B (stayed) would both be `[]`
// whether or not the guard runs. A files page still derives one, which is what makes this cell
// able to catch the guard being deleted or inverted.
test('a slow page whose fetch lands after the user navigated away must not scroll', async () => {
  let releaseFiles;
  global.Plex.getAlbumTracks = () => new Promise((r) => { releaseFiles = r; });
  const slow = Browse.render({ v: 'files', book: { ratingKey: 'bk0', title: 'Bk0', parentTitle: 'A' } });   // page A — its fetch hangs
  await tick();
  await Browse.render({ v: 'authors' });           // the user moves to page B
  await tick();

  scrolls = [];                                    // only what happens from here matters
  releaseFiles([{ ratingKey: 't0', title: 'Ch 1', durationMs: 60000, viewCount: 0 }]);
  await slow;
  await tick(20);

  assert.deepEqual(scrolls, [],
    'the superseded page must not move the scroll of the page now on screen');
});

// Control: the ordinary cache-miss MUST still position itself, or "never scroll"
// would pass the test above.
//
// A FILES page, deliberately (PLAN-swipe-declone.md §5.3.4). A LIST page derives NO entry
// position any more — it keeps the scrollTop its own element already holds, so the correct
// behaviour there is to write nothing at all, and a list-page control would assert exactly
// what ENTRYNOZERO forbids. A files page still derives one (the locally-playing track, else
// its top), so it is the case that keeps this control non-vacuous.
test('an ordinary cache-miss render does position its own page', async () => {
  Browse.reset();
  let release;
  global.Plex.getAlbumTracks = () => new Promise((r) => { release = r; });
  const only = Browse.render({ v: 'files', book: { ratingKey: 'bk1', title: 'Bk', parentTitle: 'A' } });
  await tick();
  scrolls = [];
  release([{ ratingKey: 't1', title: 'Ch 1', durationMs: 60000, viewCount: 0 }]);
  await only;
  await tick(20);

  assert.equal(scrolls.length, 1, 'the visible page still takes its DERIVED entry position');
});

// External review, MED: the page-level `.hidden` check alone is not enough. Leaving
// Browse entirely hides the #browse CONTAINER and leaves the active page node without
// `.hidden` — documented in browse.js's own showPage comment — so a late fetch still
// scrolled the window while Home/Options was on screen.
test('a slow page whose fetch lands after leaving Browse entirely must not scroll', async () => {
  Browse.reset();
  const mount = document.getElementById('mount');
  mount.classList.remove('hidden');
  let release;
  global.Plex.getAlbumTracks = () => new Promise((r) => { release = r; });

  // A files page, for the reason the control above states: a list page derives no position,
  // so "nothing scrolled" would hold whether or not the leaving-Browse guard works.
  const slow = Browse.render({ v: 'files', book: { ratingKey: 'bk2', title: 'Bk2', parentTitle: 'A' } });
  await tick();
  mount.classList.add('hidden');          // the user navigates to Home: #browse hides,
                                          // but the page node inside keeps no .hidden
  scrolls = [];
  release([{ ratingKey: 't3', title: 'Ch 3', durationMs: 60000, viewCount: 0 }]);
  await slow;
  await tick(20);

  assert.deepEqual(scrolls, [], 'nothing may scroll while Browse is not on screen');

  // …and the page must still have been FILLED, so re-entering Browse shows content
  // rather than the placeholder, and positions normally.
  mount.classList.remove('hidden');
  scrolls = [];
  await Browse.render({ v: 'files', book: { ratingKey: 'bk2', title: 'Bk2', parentTitle: 'A' } });   // cache HIT now
  await tick(20);
  const page = mount.querySelector('.browsepage');
  assert.ok(page && !/Could not load/.test(page.innerHTML), 'the page was built while hidden');
  assert.equal(scrolls.length, 1, 're-entry positions the page as usual');
});
