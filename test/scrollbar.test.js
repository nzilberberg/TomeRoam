// Scroll-indicator tests (js/scrollbar.js). This is DOM-coupled glue, and its
// SCOPE is the part that broke repeatedly:
//   • it must only claim surfaces whose scroll fits the title-bar→transport band
//     (the document + the settings overlays). Higher, differently-shaped scrollers
//     (Now Playing z60, speed popover z50, track-info sheet z80, book menu z85) sit
//     ABOVE it and keep their NATIVE scrollbars — the .110 review's finding 2.
//   • an earlier version suppressed itself whenever a browse A-Z index was up. That
//     special case caused two bugs (it blanked settings overlays opened over browse;
//     a cached browse page left it suppressed forever) and is now REMOVED — the bar
//     shows on every supported screen, beside the A-Z index.
const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body></body>');
global.window = dom.window;
global.document = dom.window.document;

const { surfaceKind, computeThumb } = require('../js/scrollbar.js')._test;

// ---- computeThumb (pure) ---------------------------------------------------
test('computeThumb: not meaningfully scrollable (≤ ignore) → no show', () => {
  assert.deepEqual(computeThumb({ top: 0, total: 620, view: 600 }, 500, 40, 26), { show: false }); // maxScroll 20 ≤ 40
});
test('computeThumb: zero band → no show', () => {
  assert.deepEqual(computeThumb({ top: 100, total: 2000, view: 600 }, 0, 40, 26), { show: false });
});
test('computeThumb: normal → thumb sized by visible fraction, placed by scroll fraction', () => {
  // band 500, view/total = 600/2400 = .25 → thumb 125; maxScroll 1800, top 900 (=.5) → y = .5*(500-125)=187.5→188
  const r = computeThumb({ top: 900, total: 2400, view: 600 }, 500, 40, 26);
  assert.equal(r.show, true);
  assert.equal(r.thumbH, 125);
  assert.equal(r.thumbY, 188);
});
test('computeThumb: thumb clamps to min height and within band', () => {
  const r = computeThumb({ top: 100000, total: 100000, view: 600 }, 500, 40, 26); // huge total → tiny fraction
  assert.equal(r.thumbH, 26);                 // clamped to min
  assert.ok(r.thumbY >= 0 && r.thumbY <= 500 - 26);
});
test('computeThumb: a browse-style long list shows regardless of an A-Z index existing', () => {
  // Regression: Books/Authors used to be suppressed by their A-Z index. No suppression
  // input exists any more — a scrollable doc surface always yields a thumb.
  const idx = document.createElement('div'); idx.className = 'alphaindex'; document.body.appendChild(idx);
  assert.equal(computeThumb({ top: 0, total: 9000, view: 600 }, 500, 84, 26).show, true);
  idx.remove();
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

