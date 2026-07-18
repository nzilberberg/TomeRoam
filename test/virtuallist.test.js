// WS1a — the virtual-list pure model + controller state machine, tested with the
// plan's fixture matrix. Free parameters pinned HOSTILE: the 600/601 threshold
// exactly; a single letter group larger than the whole resident window; windows
// at the exact top/bottom clamps; anchors across insert/remove/re-sort.
const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body></body>');
global.window = dom.window;
global.document = dom.window.document;
// jsdom lacks rAF — the shared-scroll dispatch uses it; tests call _realize directly.
global.window.requestAnimationFrame = (fn) => fn();
global.requestAnimationFrame = global.window.requestAnimationFrame;

const VL = require('../js/virtuallist.js');
const S = { header: 30, row: 80 };

const items = (n, prefix = 'k') => Array.from({ length: n }, (_, i) => ({ ratingKey: prefix + i, title: prefix + i }));
const oneGroup = (letter, n, prefix) => [{ letter, items: items(n, prefix) }];
function groupsABC(perGroup) {
  return ['A', 'B', 'C'].map((L, gi) => ({ letter: L, items: items(perGroup, L.toLowerCase()) }));
}

// ---- threshold ---------------------------------------------------------------
test('threshold: 600 full-renders, 601 virtualizes — exactly', () => {
  assert.equal(VL.usesVirtual(VL.FULL_RENDER_MAX), false);
  assert.equal(VL.usesVirtual(VL.FULL_RENDER_MAX + 1), true);
});

test('force override: windows ANY size while on, exact threshold restored when off', () => {
  try {
    VL.setForceVirtual(true);
    assert.equal(VL.usesVirtual(1), true, 'a 1-item list windows under force');
    assert.equal(VL.usesVirtual(0), false, 'an empty list is exempt — classic empty output is the exercised path');
  } finally {
    VL.setForceVirtual(false);
  }
  assert.equal(VL.usesVirtual(VL.FULL_RENDER_MAX), false, 'off → the exact threshold is back');
  assert.equal(VL.usesVirtual(VL.FULL_RENDER_MAX + 1), true);
});

// ---- model geometry ----------------------------------------------------------
test('group offsets are exact: header + count×row per group, cumulative', () => {
  const m = VL.buildModel(groupsABC(10), S);
  assert.equal(m.groups[0].top, 0);
  assert.equal(m.groups[0].rowsTop, 30);
  assert.equal(m.groups[1].top, 30 + 10 * 80);
  assert.equal(m.groups[2].top, 2 * (30 + 10 * 80));
  assert.equal(m.totalHeight, 3 * (30 + 10 * 80));
  assert.deepEqual(m.keyIndex.get('b0'), { gi: 1, li: 0 });
});

test('window at the very TOP clamps to the first rows; at the very BOTTOM to the last', () => {
  const m = VL.buildModel(groupsABC(100), S);
  const top = VL.windowFor(m, 0, 600, 0);
  assert.equal(top[0].key, 'a0', 'first row realized at scroll 0');
  assert.ok(top.length <= Math.ceil(600 / 80) + 1, 'bounded by the viewport');
  const bottom = VL.windowFor(m, m.totalHeight - 600, 600, 0);
  assert.equal(bottom[bottom.length - 1].key, 'c99', 'last row realized at max scroll');
});

test('a single letter with MORE rows than the resident window realizes only the window', () => {
  const m = VL.buildModel(oneGroup('S', 12000, 's'), S);   // the skewed-12k fixture
  const win = VL.windowFor(m, 400000, 800, 1200);
  assert.ok(win.length > 0);
  assert.ok(win.length <= Math.ceil((800 + 2400) / 80) + 2, `dozens realized, not 12000 (${win.length})`);
  for (const w of win) assert.equal(w.key.startsWith('s'), true);
});

test('rapid jumps land the correct rows (A → Z-end → M-middle)', () => {
  const m = VL.buildModel(groupsABC(1000), S);
  const atB = VL.windowFor(m, m.groups[1].rowsTop + 500 * 80, 400, 0);
  assert.equal(atB[0].key, 'b500', 'jump into the middle of B lands b500');
  const atEnd = VL.windowFor(m, m.totalHeight - 400, 400, 0);
  assert.equal(atEnd[atEnd.length - 1].key, 'c999');
  const atA = VL.windowFor(m, 0, 400, 0);
  assert.equal(atA[0].key, 'a0');
});

test('empty groups and empty lists do not break the math', () => {
  const m = VL.buildModel([{ letter: 'A', items: [] }, { letter: 'B', items: items(3, 'b') }], S);
  assert.equal(m.groups[0].height, S.header);
  const win = VL.windowFor(m, 0, 500, 0);
  assert.deepEqual(win.map((w) => w.key), ['b0', 'b1', 'b2']);
  const empty = VL.buildModel([], S);
  assert.equal(empty.totalHeight, 0);
  assert.deepEqual(VL.windowFor(empty, 0, 500, 0), []);
});

// ---- anchoring ---------------------------------------------------------------
test('anchor round-trip: unchanged model restores the exact scroll position', () => {
  const m = VL.buildModel(groupsABC(50), S);
  const y = m.groups[1].rowsTop + 7 * 80 + 13;              // 13px into row b7
  const a = VL.anchorAt(m, y);
  assert.equal(a.key, 'b7');
  assert.equal(a.offsetPx, 13);
  assert.equal(VL.yForAnchor(m, a, m.order), y);
});

test('anchor survives an INSERT before the viewport (position shifts, view content does not)', () => {
  const m1 = VL.buildModel(groupsABC(50), S);
  const a = VL.anchorAt(m1, m1.groups[2].rowsTop + 10 * 80);   // anchored at c10
  const grown = groupsABC(50);
  grown[0].items = items(60, 'a');                              // 10 rows inserted in A
  const m2 = VL.buildModel(grown, S);
  const y2 = VL.yForAnchor(m2, a, m1.order);
  assert.equal(y2, m2.groups[2].rowsTop + 10 * 80, 'c10 back at the top of the viewport');
});

test('anchor whose row was REMOVED falls to the nearest surviving neighbour', () => {
  const m1 = VL.buildModel(oneGroup('A', 10, 'a'), S);
  const a = VL.anchorAt(m1, m1.groups[0].rowsTop + 5 * 80);    // a5
  const fewer = [{ letter: 'A', items: items(10, 'a').filter((x) => x.ratingKey !== 'a5') }];
  const m2 = VL.buildModel(fewer, S);
  const y2 = VL.yForAnchor(m2, a, m1.order);
  const a6 = m2.keyIndex.get('a6');
  assert.equal(y2, m2.groups[a6.gi].rowsTop + a6.li * 80, 'lands on a6, the next survivor');
});

test('anchor survives a RE-SORT (same keys, new order)', () => {
  const m1 = VL.buildModel(oneGroup('A', 20, 'a'), S);
  const a = VL.anchorAt(m1, m1.groups[0].rowsTop + 3 * 80);    // a3
  const reversed = [{ letter: 'A', items: items(20, 'a').reverse() }];
  const m2 = VL.buildModel(reversed, S);
  const pos = m2.keyIndex.get('a3');
  assert.equal(VL.yForAnchor(m2, a, m1.order), m2.groups[pos.gi].rowsTop + pos.li * 80);
});

// ---- controller state machine (jsdom, injected metrics) -----------------------
function makeCtl(groupedItems, over = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = { scrollY: 0, viewportH: 600 };
  const released = [];
  const ctl = VL.createController(Object.assign({
    container, groupedItems,
    rowFn: (it) => { const el = document.createElement('div'); el.className = 'book'; el.dataset.key = String(it.ratingKey); el.textContent = it.title; return el; },
    strides: S,
    overscan: 300,
    metrics: { scrollY: () => view.scrollY, viewportH: () => view.viewportH, listTop: () => 0 },
    release: (el) => released.push(el.dataset.key),
  }, over));
  return { ctl, container, view, released };
}

test('lifecycle: created realizes nothing; activate realizes the window; deactivate dematerializes to 0', () => {
  const { ctl, container, view } = makeCtl(groupsABC(100));
  assert.equal(ctl.state(), 'created');
  assert.equal(ctl.realizedCount(), 0, 'created = shells only');
  assert.ok(container.querySelectorAll('.vshell').length === 3, 'shells exist for every letter');

  ctl.activate();
  assert.equal(ctl.state(), 'active');
  const n = ctl.realizedCount();
  assert.ok(n > 0 && n < 30, `window realized (${n}), not the whole list`);

  view.scrollY = 5000; ctl._realize();
  assert.ok(container.querySelector('[data-key="a0"]') == null, 'rows behind the window are gone');

  ctl.deactivate();
  assert.equal(ctl.state(), 'inactive');
  assert.equal(ctl.realizedCount(), 0, 'hidden pages hold ~0 realized rows');
  assert.ok(ctl.anchor(), 'anchor recorded for reactivation');
  ctl.destroy();
});

test('destroy releases every realized row and detaches from the shared dispatcher', () => {
  const { ctl, released } = makeCtl(groupsABC(50));
  ctl.activate();
  const n = ctl.realizedCount();
  assert.ok(n > 0);
  ctl.destroy();
  assert.equal(ctl.state(), 'destroyed');
  assert.equal(released.length, n, 'release() called for every row (ArtLoader disposal hook)');
  assert.equal(VL._test.activeController(), null, 'no dangling active controller');
  ctl.activate();
  assert.equal(ctl.state(), 'destroyed', 'destroyed is terminal');
});

test('only the ACTIVE controller realizes; activating one deactivates the other', () => {
  const a = makeCtl(groupsABC(100));
  const b = makeCtl(oneGroup('S', 1000, 's'));
  a.ctl.activate();
  b.ctl.activate();
  assert.equal(a.ctl.state(), 'inactive', 'activating B deactivated A');
  assert.equal(a.ctl.realizedCount(), 0);
  assert.ok(b.ctl.realizedCount() > 0);
  a.ctl.destroy(); b.ctl.destroy();
});

test('update() on an ACTIVE controller preserves the anchored viewport across a data swap', () => {
  const scrolls = [];
  const { ctl, view } = makeCtl(groupsABC(50), { scrollTo: (y) => { scrolls.push(y); view.scrollY = y; } });
  ctl.activate();
  view.scrollY = (30 + 50 * 80) + 30 + 7 * 80;              // row b7 at viewport top
  ctl._realize();
  const grown = groupsABC(50);
  grown[0].items = items(60, 'a');                           // insert 10 rows before the viewport
  ctl.update(grown);
  assert.equal(scrolls.length, 1, 'viewport re-anchored');
  assert.equal(scrolls[0], (30 + 60 * 80) + 30 + 7 * 80, 'b7 stays at the viewport top after the insert');
  assert.ok(ctl.realizedCount() > 0);
  ctl.destroy();
});

test('update() on an INACTIVE controller re-shells with zero rows and keeps the anchor', () => {
  const { ctl, view, container } = makeCtl(groupsABC(50));
  ctl.activate();
  view.scrollY = 2000; ctl._realize();
  ctl.deactivate();
  const before = ctl.anchor();
  ctl.update(groupsABC(50));
  assert.equal(ctl.realizedCount(), 0);
  assert.deepEqual(ctl.anchor(), before, 'anchor survives a background data swap');
  assert.equal(container.querySelectorAll('.vshell').length, 3);
  ctl.destroy();
});

test('viewport-height change recomputes the window on the next realize', () => {
  const { ctl, view } = makeCtl(oneGroup('A', 500, 'a'), { overscan: 0 });
  ctl.activate();
  const small = ctl.realizedCount();
  view.viewportH = 1800; ctl._realize();
  assert.ok(ctl.realizedCount() > small, 'a taller viewport realizes more rows');
  ctl.destroy();
});

test('realized rows carry aria-posinset/aria-setsize (a11y)', () => {
  const { ctl, container } = makeCtl(groupsABC(10));
  ctl.activate();
  const row = container.querySelector('[data-key="a0"]');
  assert.equal(row.getAttribute('aria-posinset'), '1');
  assert.equal(row.getAttribute('aria-setsize'), '30');
  ctl.destroy();
});

test('rows are NEVER rebound: scrolling back re-creates a row rather than reusing another key\'s node', () => {
  const { ctl, container, view } = makeCtl(groupsABC(100));
  ctl.activate();
  const first = container.querySelector('[data-key="a0"]');
  view.scrollY = 6000; ctl._realize();
  view.scrollY = 0; ctl._realize();
  const again = container.querySelector('[data-key="a0"]');
  assert.ok(again && again !== first, 'a fresh node for the same key (keyed materialization, no rebind)');
  assert.equal(again.textContent, 'a0');
  ctl.destroy();
});
