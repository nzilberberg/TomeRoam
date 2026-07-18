// Browse.render()'s CACHE-MISS path owns the window scroll, and it must only use that
// ownership while its page is the one on screen.
//
// render() awaits fetchFor(), then calls positionOnEnter → applyScrollY →
// window.scrollTo. If the user navigates away during a slow fetch, the superseded
// page's completion still scrolled — to a Y measured from a display:none node.
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

let scrolls = [];
dom.window.scrollTo = (x, y) => scrolls.push(y);

global.PBLogic = require('../js/logic.js');
let releaseBooks = null;
global.Plex = {
  getBooks: () => new Promise((r) => { releaseBooks = r; }),                      // page A: hangs
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

test('a slow page whose fetch lands after the user navigated away must not scroll', async () => {
  const slow = Browse.render({ v: 'books' });      // page A — its fetch hangs
  await tick();
  await Browse.render({ v: 'authors' });           // the user moves to page B
  await tick();

  scrolls = [];                                    // only what happens from here matters
  releaseBooks([{ ratingKey: 'b1', title: 'B1', parentTitle: 'A', thumb: '/t' }]);
  await slow;
  await tick(20);

  assert.deepEqual(scrolls, [],
    'the superseded page must not move the scroll of the page now on screen');
});

// Control: the ordinary cache-miss MUST still position itself, or "never scroll"
// would pass the test above.
test('an ordinary cache-miss render does position its own page', async () => {
  Browse.reset();
  let release;
  global.Plex.getBooks = () => new Promise((r) => { release = r; });
  const only = Browse.render({ v: 'books' });
  await tick();
  scrolls = [];
  release([{ ratingKey: 'b2', title: 'B2', parentTitle: 'A', thumb: '/t' }]);
  await only;
  await tick(20);

  assert.equal(scrolls.length, 1, 'the visible page still takes its entry position');
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
  global.Plex.getBooks = () => new Promise((r) => { release = r; });

  const slow = Browse.render({ v: 'books' });
  await tick();
  mount.classList.add('hidden');          // the user navigates to Home: #browse hides,
                                          // but the page node inside keeps no .hidden
  scrolls = [];
  release([{ ratingKey: 'b3', title: 'B3', parentTitle: 'A', thumb: '/t' }]);
  await slow;
  await tick(20);

  assert.deepEqual(scrolls, [], 'nothing may scroll while Browse is not on screen');

  // …and the page must still have been FILLED, so re-entering Browse shows content
  // rather than the placeholder, and positions normally.
  mount.classList.remove('hidden');
  scrolls = [];
  await Browse.render({ v: 'books' });     // cache HIT now
  await tick(20);
  const page = mount.querySelector('.browsepage');
  assert.ok(page && !/Could not load/.test(page.innerHTML), 'the page was built while hidden');
  assert.equal(scrolls.length, 1, 're-entry positions the page as usual');
});
