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

// ── the swipe row-hold (2026-07-19) ───────────────────────────────────────────
// MEASURED cause of "cover images flash on every aborted swipe return": a
// browse→browse swipe renders the destination mid-drag, showPage deactivates the
// outgoing controller, deactivate dematerializes, and an ABORT then rebuilds every
// row — so all covers refetch and the user watches an empty grid fill in. The device
// log showed 36 images and ZERO with a src at reveal (+img=72 -img=90).
// While a gesture is live the outgoing controller SUSPENDS instead: hidden, not
// realizing, rows kept, so the abort restores instead of rebuilding.
test('swipe hold: showPage SUSPENDS the outgoing page (rows kept) instead of dematerializing', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    T.pageCache.clear();
    const a = page(); T.listView(a, 'Books', books(5), T.bookRow, false);
    T.pageCache.set('books', { el: a, order: 1 });
    const b = page(); T.listView(b, 'Authors', books(5, 'x'), T.bookRow, false);
    T.pageCache.set('authors', { el: b, order: 2 });

    T.showPage('books');
    assert.equal(a.querySelectorAll('.book').length, 5, 'books realized while shown');

    const tok = Browse.beginHold();
    T.showPage('authors');                       // the mid-drag render
    assert.equal(a._vctl.state(), 'suspended', 'outgoing page suspended, not deactivated');
    assert.equal(a.querySelectorAll('.book').length, 5, 'ITS ROWS SURVIVE — nothing to rebuild on abort');
    assert.ok(a.classList.contains('hidden'), 'and it is still hidden, exactly as before');

    T.showPage('books');                         // the abort: back to where we started
    assert.equal(a.querySelectorAll('.book').length, 5, 'restored with no rebuild');
    Browse.endHold(tok);
    // Activation is deferred to endHold so it realizes against the RESTORED scroll,
    // not the clamped one — see the scroll-clamp test below.
    assert.equal(a._vctl.state(), 'active');
  } finally { global.VirtualList.setForceVirtual(false); T.pageCache.clear(); }
});

test('swipe hold: endHold drops the rows the hold deferred — no live hidden controller', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    T.pageCache.clear();
    const a = page(); T.listView(a, 'Books', books(5), T.bookRow, false);
    T.pageCache.set('books', { el: a, order: 1 });
    const b = page(); T.listView(b, 'Authors', books(5, 'x'), T.bookRow, false);
    T.pageCache.set('authors', { el: b, order: 2 });
    T.showPage('books');

    const tok = Browse.beginHold();
    T.showPage('authors');                       // a COMMITTED swipe: we stay on authors
    assert.equal(a._vctl.state(), 'suspended');

    Browse.endHold(tok);
    assert.equal(a._vctl.state(), 'inactive', 'the deferred teardown actually happened');
    assert.equal(a.querySelectorAll('.book').length, 0, 'rows dropped — the WS1c leak gate holds');
    assert.equal(b._vctl.state(), 'active', 'the page we landed on is untouched');
  } finally { global.VirtualList.setForceVirtual(false); T.pageCache.clear(); }
});

// The residual flash after .181, measured: a swipe taken ~0.7s after a nav tap lands
// inside the SWR revalidate window, and the repaint destroys the suspended rows by a
// door the hold did not cover (patchInPlace → ctl.update → dematerialize). The abort
// then rebuilt the page anyway — withSrc=0, 17 covers refetched. A swipe following
// another swipe (no revalidate in flight) was clean, which is what pinned it.
test('swipe hold: an SWR repaint arriving mid-gesture is DEFERRED until the hold ends', async () => {
  let fireFresh = null;
  const prevGetBooks = global.Plex.getBooks;
  // Drives the REAL render() → fetchFor → repaint closure, because that closure is
  // where the deferral lives. Calling patchInPlace directly would prove nothing: it
  // dematerializes either way, which is exactly the destruction being deferred.
  global.Plex.getBooks = (opts) => { fireFresh = opts && opts.onFresh; return Promise.resolve(books(5)); };
  try {
    global.VirtualList.setForceVirtual(true);
    Browse.clearCache();
    await Browse.render({ v: 'books' });
    const el = T.pageCache.get('books').el;
    assert.equal(el.querySelectorAll('.book').length, 5, 'rows realized');
    assert.ok(fireFresh, 'fixture sanity: the revalidate callback was captured');

    const tok = Browse.beginHold();
    fireFresh(books(6));                       // a background revalidate lands MID-SWIPE
    assert.equal(el.querySelectorAll('.book').length, 5,
      'rows must SURVIVE — otherwise the abort rebuilds the page and every cover refetches');

    Browse.endHold(tok);
    assert.equal(el.querySelectorAll('.book').length, 6, 'and the fresh data applies once the gesture ends');
  } finally {
    global.Plex.getBooks = prevGetBooks;
    global.VirtualList.setForceVirtual(false);
    Browse.clearCache();
  }
});

// MEASURED against a live reproduction (2026-07-19): with the list scrolled to
// y=11209, an aborted browse→browse swipe destroyed ALL 33 realized rows and rebuilt
// them, losing every loaded cover (33 with src → 16). Cause: rendering the short
// destination page mid-drag collapses the document, so the browser clamps scrollY to
// 0; showPage then re-activated the returning page AT THAT CLAMPED SCROLL, releasing
// every row on screen. The swipe restores the real scroll immediately afterwards, so
// activation simply has to wait for it. Every earlier local test sat at scroll 0,
// where the clamp is a no-op — which is why this went unreproduced for six builds.
test('swipe hold: a page returning from SUSPENDED waits for endHold to activate', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    T.pageCache.clear();
    const a = page(); T.listView(a, 'Books', books(5), T.bookRow, false);
    T.pageCache.set('books', { el: a, order: 1 });
    const b = page(); T.listView(b, 'Authors', books(5, 'x'), T.bookRow, false);
    T.pageCache.set('authors', { el: b, order: 2 });
    T.showPage('books');

    const tok = Browse.beginHold();
    T.showPage('authors');
    assert.equal(a._vctl.state(), 'suspended', 'outgoing suspended');
    assert.equal(b._vctl.state(), 'active',
      'the INCOMING page still activates — deferring it too would slide in a blank pane');

    T.showPage('books');                       // the abort, back to where we started
    assert.equal(a._vctl.state(), 'suspended',
      'must NOT activate yet — realizing here happens at the clamped scroll and releases every row');
    assert.equal(a.querySelectorAll('.book').length, 5, 'and its rows are still intact');

    Browse.endHold(tok);
    assert.equal(a._vctl.state(), 'active', 'endHold activates it, once the swipe has restored the scroll');
    assert.equal(a.querySelectorAll('.book').length, 5, 'with the SAME rows — nothing rebuilt, no cover refetch');
  } finally { global.VirtualList.setForceVirtual(false); T.pageCache.clear(); }
});

// The SECOND churn path, measured in a real browser: a scroll that happens DURING the
// drag. iOS grants a native scroll the moment a touchmove goes non-cancelable
// (app.js:374-377 documents exactly this), and the swipe snaps it back on settle.
// Realizing against those intermediate positions releases the rows on screen and
// recreates them as fresh nodes whose covers reload — a 600px excursion destroyed 6
// of 33 rows and lost their covers. This path is NOT covered by suspending the
// outgoing page: swiping back to Home never hides the browse page at all, so its
// controller stays active and re-realizes on every transient scroll.
test('swipe hold: scroll-driven realize is frozen for the gesture, then runs ONCE at the end', () => {
  const prev = { strides: { header: 30, row: 80 }, overscan: 200,
    metrics: { scrollY: () => view.scrollY, viewportH: () => view.viewportH, listTop: () => 0 },
    scrollTo: (y) => { view.scrollY = y; } };
  try {
    global.VirtualList.setForceVirtual(true);
    // The shared dispatcher skips a controller whose box does not render; jsdom has no
    // layout, so state visibility has to be injected for the scroll path to be reachable.
    T.setVlOpts(Object.assign({}, prev, { isVisible: () => true }));
    T.pageCache.clear();
    const a = page(); T.listView(a, 'Books', books(400), T.bookRow, false);
    T.pageCache.set('books', { el: a, order: 1 });
    T.showPage('books');
    const atTop = a._vctl.realizedCount();
    assert.ok(atTop > 0 && atTop < 400, `windowed at the top (${atTop})`);
    const firstKeys = [...a.querySelectorAll('.book')].map((r) => r.getAttribute('aria-posinset')).join(',');

    const tok = Browse.beginHold();
    // A transient scroll lands mid-gesture — the native scroll iOS granted.
    view.scrollY = 9000;
    global.window.dispatchEvent(new global.window.Event('scroll'));
    assert.equal([...a.querySelectorAll('.book')].map((r) => r.getAttribute('aria-posinset')).join(','), firstKeys,
      'NOTHING may realize mid-gesture — that is what destroys the rows on screen');

    // The swipe settles and puts the real scroll back before releasing the hold.
    view.scrollY = 0;
    Browse.endHold(tok);
    assert.equal([...a.querySelectorAll('.book')].map((r) => r.getAttribute('aria-posinset')).join(','), firstKeys,
      'and the one realize at the end lands on the SAME rows — nothing rebuilt, no cover refetch');
  } finally {
    global.VirtualList.setForceVirtual(false);
    global.VirtualList.setScrollSuspended(false);
    T.setVlOpts(prev);
    T.pageCache.clear();
  }
});

test('swipe hold: a STALE token cannot release a newer gesture hold', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    T.pageCache.clear();
    const a = page(); T.listView(a, 'Books', books(5), T.bookRow, false);
    T.pageCache.set('books', { el: a, order: 1 });
    const b = page(); T.listView(b, 'Authors', books(5, 'x'), T.bookRow, false);
    T.pageCache.set('authors', { el: b, order: 2 });
    T.showPage('books');

    const stale = Browse.beginHold();
    Browse.endHold(stale);                       // gesture 1 ends
    const fresh = Browse.beginHold();            // gesture 2 starts
    T.showPage('authors');
    Browse.endHold(stale);                       // gesture 1's finalizer fires LATE
    assert.equal(a._vctl.state(), 'suspended', 'the stale release must be ignored');
    Browse.endHold(fresh);
    assert.equal(a._vctl.state(), 'inactive', 'the real owner still releases it');
  } finally { global.VirtualList.setForceVirtual(false); T.pageCache.clear(); }
});

test('swipe hold: clearCache force-releases, so a hold cannot govern the NEXT pages', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    T.pageCache.clear();
    const a = page(); T.listView(a, 'Books', books(5), T.bookRow, false);
    T.pageCache.set('books', { el: a, order: 1 });
    T.showPage('books');

    Browse.beginHold();
    Browse.clearCache();                         // e.g. Net.onReconnect, mid-gesture

    const c = page(); T.listView(c, 'Books', books(5), T.bookRow, false);
    T.pageCache.set('books', { el: c, order: 1 });
    const d2 = page(); T.listView(d2, 'Authors', books(5, 'x'), T.bookRow, false);
    T.pageCache.set('authors', { el: d2, order: 2 });
    T.showPage('books');
    T.showPage('authors');
    assert.equal(c._vctl.state(), 'inactive', 'the dead hold must not suspend a fresh page');
    assert.equal(c.querySelectorAll('.book').length, 0);
  } finally { global.VirtualList.setForceVirtual(false); T.pageCache.clear(); }
});

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

// ---- review finding (.143): a STRUCTURAL virtual SWR must refresh the page CHROME,
// not just the controller's row model. The controller owns rows + shells only; the
// header count, _truncCount and the A–Z index live outside it.
const lettered = (titles) => titles.map((t, i) => ({
  ratingKey: 'k' + t + i, title: t, titleSort: t, parentTitle: 'A',
  thumb: '/t/' + i, leafCount: 10, viewedLeafCount: 0,
}));
const idxLetters = (m) => [...m.querySelectorAll('.alphaindex .alpha')].map((s) => s.dataset.letter);

test('virtual SWR that ADDS a new letter updates the header count, _truncCount and the A–Z index', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    const m = page();
    const before = lettered(['Apple', 'Banana']);
    T.listView(m, 'Books', before, T.bookRow, false);
    assert.equal(m.querySelector('.browsetitle').textContent, 'Books · 2');
    assert.deepEqual(idxLetters(m), ['A', 'B']);
    assert.equal(m._truncCount, 2);

    const after = lettered(['Apple', 'Banana', 'Zebra']);   // +1 item, NEW letter Z
    assert.equal(T.patchInPlace({ v: 'books' }, m, after), true);

    assert.equal(m.querySelector('.browsetitle').textContent, 'Books · 3', 'header count follows the model');
    assert.deepEqual(idxLetters(m), ['A', 'B', 'Z'], 'A–Z index gains the new letter');
    assert.equal(m._truncCount, 3, '_truncCount follows the model (truncation note reads it)');
    m._vctl.destroy();
  } finally { global.VirtualList.setForceVirtual(false); }
});

test('virtual SWR that REMOVES a letter\'s last item drops that letter from the A–Z index (no dead jump target)', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    const m = page();
    T.listView(m, 'Books', lettered(['Apple', 'Banana', 'Zebra']), T.bookRow, false);
    assert.deepEqual(idxLetters(m), ['A', 'B', 'Z']);

    assert.equal(T.patchInPlace({ v: 'books' }, m, lettered(['Apple', 'Banana'])), true);

    assert.deepEqual(idxLetters(m), ['A', 'B'], 'the emptied letter is gone');
    assert.equal(m.querySelector('.browsetitle').textContent, 'Books · 2');
    assert.equal(m._truncCount, 2);
    m._vctl.destroy();
  } finally { global.VirtualList.setForceVirtual(false); }
});

test('virtual author page: a changed BOOK SET with unchanged author metadata updates the "N books" count', () => {
  try {
    global.VirtualList.setForceVirtual(true);
    const m = page();
    const author = { ratingKey: 'a1', title: 'King', thumb: null, childCount: 2 };
    T.authorView(m, author, lettered(['Apple', 'Banana']));
    assert.match(m.querySelector('.authorcount').textContent, /^2 books/);

    const ok = T.patchInPlace({ v: 'authorBooks' }, m, { author, books: lettered(['Apple', 'Banana', 'Zebra']) });
    assert.equal(ok, true, 'unchanged author metadata still patches in place');
    assert.match(m.querySelector('.authorcount').textContent, /^3 books/, 'count follows the book set');
    m._vctl.destroy();
  } finally { global.VirtualList.setForceVirtual(false); }
});
