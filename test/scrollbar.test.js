// Scroll-indicator tests (js/scrollbar.js). This is DOM-coupled glue that shipped
// with two scoping bugs (the .110 review):
//   • the A-Z suppression keyed off ANY `.alphaindex` (offsetParent-visible), so a
//     browse index mounted UNDER a settings overlay — or a HIDDEN cached page's
//     index found first in DOM order — wrongly blanked the indicator.
//   • it only ever suppressed document scroll; element (overlay) scrollers must not
//     be suppressed by an unrelated index underneath them.
// These guard the fixed decision logic.
const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body></body>');
global.window = dom.window;
global.document = dom.window.document;

const { surfaceKind, activeAlphaShown, suppressedFor, computeThumb } = require('../js/scrollbar.js')._test;

// ---- computeThumb (pure) ---------------------------------------------------
test('computeThumb: suppressed → no show', () => {
  assert.deepEqual(computeThumb(true, { top: 100, total: 2000, view: 600 }, 500, 40, 26), { show: false });
});
test('computeThumb: not meaningfully scrollable (≤ ignore) → no show', () => {
  assert.deepEqual(computeThumb(false, { top: 0, total: 620, view: 600 }, 500, 40, 26), { show: false }); // maxScroll 20 ≤ 40
});
test('computeThumb: zero band → no show', () => {
  assert.deepEqual(computeThumb(false, { top: 100, total: 2000, view: 600 }, 0, 40, 26), { show: false });
});
test('computeThumb: normal → thumb sized by visible fraction, placed by scroll fraction', () => {
  // band 500, view/total = 600/2400 = .25 → thumb 125; maxScroll 1800, top 900 (=.5) → y = .5*(500-125)=187.5→188
  const r = computeThumb(false, { top: 900, total: 2400, view: 600 }, 500, 40, 26);
  assert.equal(r.show, true);
  assert.equal(r.thumbH, 125);
  assert.equal(r.thumbY, 188);
});
test('computeThumb: thumb clamps to min height and within band', () => {
  const r = computeThumb(false, { top: 100000, total: 100000, view: 600 }, 500, 40, 26); // huge total → tiny fraction
  assert.equal(r.thumbH, 26);                 // clamped to min
  assert.ok(r.thumbY >= 0 && r.thumbY <= 500 - 26);
});

// ---- suppressedFor (pure) --------------------------------------------------
test('suppressedFor: document scroll defers to an active browse A-Z index', () => {
  assert.equal(suppressedFor('doc', true), true);
  assert.equal(suppressedFor('doc', false), false);
});
test('suppressedFor: an element/overlay scroller is NEVER suppressed by an A-Z index', () => {
  // Reviewer scenario 1: a browse A-Z visible underneath a scrolling settings overlay
  // → the overlay's indicator must still appear.
  assert.equal(suppressedFor('overlay', true), false);
  assert.equal(suppressedFor(null, true), false);
});

// ---- surfaceKind (jsdom) ---------------------------------------------------
test('surfaceKind: document/window → doc; settings overlay → overlay; anything else → null', () => {
  assert.equal(surfaceKind(document), 'doc');
  assert.equal(surfaceKind(window), 'doc');
  assert.equal(surfaceKind(document.documentElement), 'doc');
  const opt = document.createElement('div'); opt.id = 'options';
  assert.equal(surfaceKind(opt), 'overlay');
  const dl = document.createElement('div'); dl.id = 'downloads';
  assert.equal(surfaceKind(dl), 'overlay');
  const np = document.createElement('div'); np.id = 'nowplaying';   // higher overlay — NOT ours
  assert.equal(surfaceKind(np), null);
  assert.equal(surfaceKind(document.createElement('div')), null);
});

// ---- activeAlphaShown (jsdom) ----------------------------------------------
// Real structure: #browse (the Browse mount, hidden when you leave browse) >
// .browsepage (LRU-cached, inactive ones .hidden) > .alphaindex.
function mount(hiddenContainer) {
  let b = document.getElementById('browse');
  if (!b) { b = document.createElement('div'); b.id = 'browse'; document.body.appendChild(b); }
  b.className = hiddenContainer ? 'hidden' : '';
  b.innerHTML = '';
  return b;
}
function addPage(m, hidden) {
  const p = document.createElement('div');
  p.className = 'browsepage' + (hidden ? ' hidden' : '');
  const idx = document.createElement('div'); idx.className = 'alphaindex';
  p.appendChild(idx);
  m.appendChild(p);
}

test('activeAlphaShown: no browse pages → false', () => {
  mount(false);
  assert.equal(activeAlphaShown(), false);
});
test('activeAlphaShown: an active (non-hidden) browse index in a shown #browse → true', () => {
  addPage(mount(false), false);
  assert.equal(activeAlphaShown(), true);
});
test('activeAlphaShown: HIDDEN cached index first in DOM, active index after → true (reviewer scenario 2)', () => {
  const m = mount(false);
  addPage(m, true);    // hidden Authors, first in DOM
  addPage(m, false);   // active Books, after
  assert.equal(activeAlphaShown(), true);   // matches the ACTIVE one, not the first
});
test('activeAlphaShown: only hidden cached indexes → false', () => {
  const m = mount(false);
  addPage(m, true); addPage(m, true);
  assert.equal(activeAlphaShown(), false);
});
// THE regression the user hit: leaving Books for Home hides the #browse CONTAINER,
// but the cached .browsepage inside keeps its non-hidden class. Checking the page
// alone left the index "shown" forever → the Home indicator was suppressed
// permanently, on every screen, until a reload.
test('activeAlphaShown: cached non-hidden page inside a HIDDEN #browse (on Home) → false', () => {
  const m = mount(true);     // #browse hidden — we navigated away from browse
  addPage(m, false);         // the cached page itself is still NOT .hidden
  assert.equal(activeAlphaShown(), false);
});
test('activeAlphaShown: returning to browse (container shown again) → true', () => {
  const m = mount(true);
  addPage(m, false);
  assert.equal(activeAlphaShown(), false);
  document.getElementById('browse').className = '';   // back on Books
  assert.equal(activeAlphaShown(), true);
});
