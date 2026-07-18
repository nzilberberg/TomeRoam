// WS1b/c integration — the REAL browse.js wired to the REAL virtualizer (jsdom).
// Pins the seams the pure model can't: threshold routing at exactly 600/601,
// classic output untouched below the threshold, ArtLoader disposal on rows
// leaving the window, patchInPlace routing virtual pages to controller.update
// (never patchRows), showPage's activate/deactivate ownership, and destruction
// on eviction/clearCache.
const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body><div id="mount"></div></body>');
global.window = dom.window;
global.document = dom.window.document;
global.window.requestAnimationFrame = (fn) => fn();
global.requestAnimationFrame = global.window.requestAnimationFrame;
// Mutable truncation state + a captured change listener, so tests can play the
// exact live-reveal sequence. truncationDisplay mirrors the REAL fn's
// precedence (verified state stands; else count heuristic) — the real fn's
// full behaviour incl. the at-cap heuristic is pinned in plex.test.js.
const truncState = { authors: { state: 'complete', total: 0, returned: 0 }, books: { state: 'complete', total: 0, returned: 0 } };
let truncCb = null;
global.Plex = {
  artUrl: (t) => (t ? 'art:' + t : null),
  libraryTruncation: () => truncState,
  truncationDisplay: (t, count) => ((t && (t.noted || t.persisted)) ? t : { state: 'complete', total: 0, returned: count }),
  onTruncationChange: (fn) => { truncCb = fn; },
};
global.window.Plex = global.Plex;
// Real scroll plumbing for entry-restore tests: window.scrollTo drives the same
// `view` the injected vl metrics read, and the document reports enough height
// that applyScrollY's clamp doesn't flatten every restore to 0 (jsdom has no layout).
global.window.scrollTo = (x, y) => { view.scrollY = y; };
Object.defineProperty(dom.window.document.documentElement, 'scrollHeight', { get: () => 10e6, configurable: true });
const released = [];
global.window.ArtLoader = { release: (img) => released.push(img.getAttribute('data-art')), scan: () => {}, observe: () => {} };
global.ArtLoader = global.window.ArtLoader;
global.VirtualList = require('../js/virtuallist.js');
global.window.VirtualList = global.VirtualList;

const Browse = require('../js/browse.js');
const T = Browse._test;
const renders = { n: 0 };
Browse.init({
  mount: document.getElementById('mount'),
  fmt: (s) => String(s),
  onRender: () => { renders.n++; },
  onPlay: () => {}, onPlayFile: () => {}, onOpenAuthor: () => {}, onOpenFiles: () => {}, onBack: () => {},
  bindDlBtn: () => {},
});

const MAXN = global.VirtualList.FULL_RENDER_MAX;
const books = (n) => Array.from({ length: n }, (_, i) => ({
  ratingKey: 'b' + i, title: 'Book ' + i, titleSort: String(i).padStart(6, '0'),
  parentTitle: 'A', thumb: '/t/' + i, leafCount: 10, viewedLeafCount: 0,
}));
const view = { scrollY: 0, viewportH: 600 };
const vlOpts = {
  strides: { header: 30, row: 80 },
  overscan: 200,
  metrics: { scrollY: () => view.scrollY, viewportH: () => view.viewportH, listTop: () => 0 },
  scrollTo: (y) => { view.scrollY = y; },
};
T.setVlOpts(vlOpts);
const page = () => { const el = document.createElement('div'); el.className = 'browsepage'; document.getElementById('mount').appendChild(el); return el; };

test('threshold routing: exactly 600 items → the CLASSIC full renderer, byte-identical structure', () => {
  const m = page();
  T.listView(m, 'Books', books(MAXN), T.bookRow, false);
  assert.equal(m._vctl, undefined, 'no controller at the threshold');
  assert.equal(m.querySelectorAll('.vshell').length, 0);
  assert.equal(m.querySelectorAll('.book').length, MAXN, 'every row fully rendered, as today');
  assert.ok(m.querySelector('.alphaindex'), 'A–Z index present');
});

test('force override routes a SMALL list through the real virtual path (the Diagnostics toggle)', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    const m = page();
    T.listView(m, 'Books', books(5), T.bookRow, false);
    assert.ok(m._vctl, 'controller created for 5 items under force');
    assert.ok(m.querySelectorAll('.vshell').length > 0, 'shells built');
    assert.equal(m.querySelectorAll('.book').length, 0, 'windowed: no rows before activation');
    m._vctl.activate();
    assert.equal(m.querySelectorAll('.book').length, 5, 'all 5 realize (window covers the whole list)');
    m._vctl.destroy();
  } finally {
    global.VirtualList.setForceVirtual(false);   // never leak the override into other tests
  }
  const m2 = page();
  T.listView(m2, 'Books', books(5), T.bookRow, false);
  assert.equal(m2._vctl, undefined, 'off → 5 items classic again');
  assert.equal(m2.querySelectorAll('.book').length, 5);
});

test('threshold routing: 601 items → virtual shells, zero rows until activation, index still present', () => {
  const m = page();
  T.listView(m, 'Books', books(MAXN + 1), T.bookRow, false);
  assert.ok(m._vctl, 'controller created');
  assert.equal(m._vctl.state(), 'created');
  assert.ok(m.querySelectorAll('.vshell').length > 0, 'per-letter shells reserve the full height');
  assert.equal(m.querySelectorAll('.book').length, 0, 'no rows realized before activation');
  assert.ok(m.querySelector('.alphaindex'), 'A–Z index still built from the model');
  m._vctl.destroy();
});

test('activation realizes a window; scrolling releases leaving rows through ArtLoader', () => {
  const m = page();
  T.listView(m, 'Books', books(2000), T.bookRow, false);
  const ctl = m._vctl;
  ctl.activate();
  const n = m.querySelectorAll('.book').length;
  assert.ok(n > 0 && n < 40, `window realized (${n}), not 2000`);
  assert.ok(m.querySelector('[data-key="b0"]'), 'top of list realized');

  released.length = 0;
  view.scrollY = 40000; ctl._realize();
  assert.equal(m.querySelector('[data-key="b0"]'), null, 'rows behind the window removed');
  assert.ok(released.length > 0, 'their covers were RELEASED from the art pipeline');
  assert.ok(released.includes('art:/t/0'), 'including the first row\'s cover');
  view.scrollY = 0;
  ctl.destroy();
});

test('patchInPlace on a virtual page routes to controller.update — patchRows is never consulted', () => {
  const m = page();
  const items = books(1000);
  T.listView(m, 'Books', items, T.bookRow, false);
  let updated = null;
  m._vctl.update = (g) => { updated = g; };
  const ok = T.patchInPlace({ v: 'books' }, m, items);
  assert.equal(ok, true, 'virtual page always patches in place');
  assert.ok(Array.isArray(updated) && updated.length > 0, 'controller.update received the regrouped data');
  m._vctl = null;
});

test('showPage activates the shown page\'s controller and dematerializes the hidden one', () => {
  T.pageCache.clear();
  const a = page(), b = page();
  T.listView(a, 'Books', books(1000), T.bookRow, false);
  T.listView(b, 'Authors', books(900), T.bookRow, false);
  T.pageCache.set('books', { el: a, order: 1 });
  T.pageCache.set('authors', { el: b, order: 2 });

  T.showPage('books');
  assert.equal(a._vctl.state(), 'active');
  assert.ok(a.querySelectorAll('.book').length > 0);
  T.showPage('authors');
  assert.equal(a._vctl.state(), 'inactive');
  assert.equal(a.querySelectorAll('.book').length, 0, 'hidden page dematerialized to zero rows');
  assert.equal(b._vctl.state(), 'active');
  a._vctl.destroy(); b._vctl.destroy();
  T.pageCache.clear();
});

test('clearCache destroys controllers (no zombie active controller, no listener target left)', () => {
  T.pageCache.clear();
  const m = page();
  T.listView(m, 'Books', books(1000), T.bookRow, false);
  T.pageCache.set('books', { el: m, order: 1 });
  m._vctl.activate();
  const ctl = m._vctl;
  Browse.clearCache();
  assert.equal(ctl.state(), 'destroyed');
  assert.equal(global.VirtualList._test.activeController(), null, 'shared dispatcher holds nothing');
});

test('authorView past the threshold: one flat headerless group, no A–Z index, rows windowed', () => {
  const m = page();
  T.authorView(m, { ratingKey: 'a1', title: 'Prolific', summary: '' }, books(800));
  assert.ok(m._vctl, 'author page virtualizes too');
  assert.equal(m.querySelector('.alphaindex'), null, 'no letter index on an author page');
  assert.equal(m.querySelectorAll('.letterhead').length, 0, 'flat group renders no letterhead');
  m._vctl.activate();
  const n = m.querySelectorAll('.book').length;
  assert.ok(n > 0 && n < 40, `windowed (${n})`);
  m._vctl.destroy();
});

test('materialization pings onRender (rAF-debounced) so new rows get live numbers immediately', () => {
  const m = page();
  T.listView(m, 'Books', books(1000), T.bookRow, false);
  const before = renders.n;
  m._vctl.activate();
  assert.ok(renders.n > before, 'onRender fired for the newly materialized window');
  m._vctl.destroy();
});

// ---- .138-review fixes: anchor across hidden SWR updates + truncation repaint ----

test('showPage: outgoing controller deactivates BEFORE .hidden, incoming activates AFTER unhide (geometry is live at both captures)', () => {
  T.pageCache.clear();
  const a = page(), b = page();
  T.listView(a, 'Books', books(MAXN + 1), T.bookRow, false);
  T.listView(b, 'Authors', books(MAXN + 1), T.bookRow, false);
  T.pageCache.set('books', { el: a, order: 1 });
  T.pageCache.set('authors', { el: b, order: 2 });
  T.showPage('books');
  let hiddenAtDeactivate = null, hiddenAtActivate = null;
  const origD = a._vctl.deactivate, origA = b._vctl.activate;
  a._vctl.deactivate = () => { hiddenAtDeactivate = a.classList.contains('hidden'); return origD(); };
  b._vctl.activate = () => { hiddenAtActivate = b.classList.contains('hidden'); return origA(); };
  T.showPage('authors');
  assert.equal(hiddenAtDeactivate, false, 'anchor captured while the box still measures');
  assert.equal(hiddenAtActivate, false, 'realization happens on a visible box');
  a._vctl.destroy(); b._vctl.destroy(); T.pageCache.clear();
});

test('hidden SWR insert above the anchor: returning restores the ROW at its offset, not the stale scrollY (review finding 2)', () => {
  T.pageCache.clear();
  const orig = books(MAXN + 1);
  const a = page(), b = page();
  T.listView(a, 'Books', orig, T.bookRow, false);
  T.listView(b, 'Authors', books(MAXN + 1), T.bookRow, false);
  T.pageCache.set('books', { el: a, order: 1, sy: 0 });
  T.pageCache.set('authors', { el: b, order: 2 });
  T.showPage('books');
  // The user scrolls 11px into row b500.
  const m1 = a._vctl.model();
  const p1 = m1.keyIndex.get('b500');
  const oldY = m1.groups[p1.gi].rowsTop + p1.li * vlOpts.strides.row + 11;
  view.scrollY = oldY;
  T.pageCache.get('books').sy = oldY;              // what the passive listener records
  T.showPage('authors');                           // anchor captured on the way out
  // Revalidation lands while Books is hidden: 10 new titles sort ABOVE b500.
  const fresh = [
    ...Array.from({ length: 10 }, (_, i) => ({ ratingKey: 'x' + i, title: 'X' + i, titleSort: '0000', parentTitle: 'A', thumb: '/t/x' + i, leafCount: 10, viewedLeafCount: 0 })),
    ...orig,
  ];
  assert.equal(T.patchInPlace({ v: 'books' }, a, fresh), true, 'virtual page routes to controller.update');
  T.showPage('books');
  T.positionOnEnter({ v: 'books' }, a, T.pageCache.get('books').sy);
  const m2 = a._vctl.model();
  const p2 = m2.keyIndex.get('b500');
  const wantY = m2.groups[p2.gi].rowsTop + p2.li * vlOpts.strides.row + 11;
  assert.notEqual(wantY, oldY, 'fixture sanity: the insert really moved the row');
  assert.equal(view.scrollY, wantY, 'viewport follows row b500 to its NEW position');
  a._vctl.destroy(); b._vctl.destroy(); T.pageCache.clear();
});

test('truncation notice appears on an already-built page when the live listing reveals it — identical rows, no repaint (review finding 1)', () => {
  T.pageCache.clear();
  const m = page();
  T.listView(m, 'Books', books(50), T.bookRow, false);   // classic path, complete → no note
  T.pageCache.set('books', { el: m, order: 1 });
  assert.equal(m.querySelector('.truncnote'), null);
  assert.ok(truncCb, 'browse subscribed to truncation changes at load');
  // The live fetch returns the SAME 50 rows but reveals totalSize > returned:
  // onFresh never fires (arrays identical) — the note must still appear.
  truncState.books = { state: 'truncated', total: 24731, returned: 20000, noted: true };
  truncCb('books');
  const note = m.querySelector('.truncnote');
  assert.ok(note, 'warning surfaced with zero row churn');
  assert.match(note.textContent, /24,731/);
  truncState.books = { state: 'possible', total: 0, returned: 20000, noted: true };
  truncCb('books');
  assert.match(m.querySelector('.truncnote').textContent, /may be truncated/, 'note text updates in place');
  truncState.books = { state: 'complete', total: 0, returned: 0, noted: true };
  truncCb('books');
  assert.equal(m.querySelector('.truncnote'), null, 'a verified complete listing clears the warning');
  T.pageCache.clear();
});
