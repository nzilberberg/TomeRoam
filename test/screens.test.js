// Screen/nav STRUCTURE guards, grounded in the real shipped files (see
// test/dom-fixture.js for why that matters).
//
// The settings-screen list is encoded in FOUR independent places — index.html (the
// hub rows + the screen elements), app.js (SETTINGS_SUBS, which drives setView /
// applyScreen / resetSwipeStyles / showAppView), scrollbar.js (OVERLAY_SEL, which
// decides whose scroll the custom indicator claims) and app.css (the overlay
// geometry + the scoped native-scrollbar hide). Nothing makes them agree. That
// silent-divergence seam is exactly what shipped as the .110 review's finding 2 (a
// scoping list that didn't match reality), and it's the same class as the .28/.29
// `_sig` writer-vs-comparator divergence.
//
// These fail when a future screen is added and any ONE of the four is forgotten —
// a wrong belief the author wouldn't otherwise discover until a device.
const { test } = require('node:test');
const assert = require('node:assert');
const { appDom, readRoot, selectorsFor } = require('./dom-fixture.js');

const doc = appDom().window.document;
const sortd = (a) => a.slice().sort();

// Ground truth = what the shipped hub actually offers.
const subs = [...doc.querySelectorAll('#optHub .hubrow[data-sub]')].map((b) => b.dataset.sub);

test('the hub actually has rows (fixture sanity — a silent 0 would pass everything below)', () => {
  assert.ok(subs.length >= 2, 'no #optHub .hubrow[data-sub] found in index.html');
});

test('every hub row points at a real sub-screen element', () => {
  for (const s of subs) assert.ok(doc.getElementById(s), `hub row "${s}" has no #${s} element — dead nav row`);
});

test('every sub-screen can be left (has a back button)', () => {
  for (const s of subs) assert.ok(doc.querySelector('#' + s + ' .subback'), `#${s} has no .subback button`);
});

test('app.js SETTINGS_SUBS matches the hub rows in index.html', () => {
  const m = readRoot('js/app.js').match(/const SETTINGS_SUBS = \[([^\]]+)\]/);
  assert.ok(m, 'SETTINGS_SUBS not found in app.js');
  const list = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  assert.deepEqual(sortd(list), sortd(subs), 'a screen exists in one place but not the other');
});

test('scrollbar OVERLAY_SEL claims #options + exactly the sub-screens', () => {
  const m = readRoot('js/scrollbar.js').match(/OVERLAY_SEL = '([^']+)'/);
  assert.ok(m, 'OVERLAY_SEL not found in scrollbar.js');
  const list = m[1].split(',').map((s) => s.trim().replace(/^#/, ''));
  assert.deepEqual(sortd(list), sortd(['options', ...subs]),
    'the indicator claims a different set of surfaces than the app actually has');
});

test('app.css gives every sub-screen the overlay geometry', () => {
  const sel = selectorsFor(readRoot('css/app.css'), 'position: fixed')
    .find((s) => s.includes('#downloads'));
  assert.ok(sel, 'no fixed-overlay rule covering #downloads');
  for (const s of subs) assert.ok(sel.includes('#' + s), `#${s} is missing from the overlay geometry rule`);
});

// The .110 review's finding 2, pinned: hiding native scrollbars GLOBALLY (`*`) left
// the higher, differently-shaped scrollers (Now Playing z60, speed popover z50,
// track-info sheet z80, book menu z85) with no affordance at all, because #scrollind
// sits below them at z34 and its band is the wrong shape for them anyway.
test('native scrollbars are hidden ONLY on the surfaces the indicator supports', () => {
  const sel = selectorsFor(readRoot('css/app.css'), 'scrollbar-width: none')
    .filter((s) => !s.includes('.carousel'));
  assert.equal(sel.length, 1, 'expected exactly one scoped native-scrollbar-hide rule');
  const list = sel[0].split(',').map((s) => s.trim());
  assert.deepEqual(sortd(list), sortd(['html', 'body', ...subs.map((s) => '#' + s), '#options']));
  assert.ok(!list.includes('*'), 'never hide native scrollbars globally — see finding 2');
  assert.ok(!list.includes('#nowplaying'), 'Now Playing must keep its native scrollbar');
});
