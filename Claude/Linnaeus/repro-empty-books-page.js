// Headless reproduction — "Books page arrives with structure but no rows".
// Drives the REAL js/browse.js + js/virtuallist.js under jsdom.
//
// The defect is DOM CONTENT (`rows=0`), which jsdom can see: it has no layout and
// no compositor, but it has nodes. Every assertion below is a node count or a
// class/attribute read, so nothing here depends on layout.
//
// Run:  node Claude/Linnaeus/repro-empty-books-page.js
const assert = require('node:assert');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');
const dom = new JSDOM('<!doctype html><body><div id="mount"></div></body>');
global.window = dom.window;
global.document = dom.window.document;
global.window.requestAnimationFrame = (fn) => fn();
global.requestAnimationFrame = global.window.requestAnimationFrame;
global.Plex = {
  artUrl: (t) => (t ? 'art:' + t : null),
  libraryTruncation: () => ({ books: { state: 'complete', total: 0, returned: 0 } }),
  truncationDisplay: (t, count) => ({ state: 'complete', total: 0, returned: count }),
  onTruncationChange: () => {},
};
global.window.Plex = global.Plex;
Object.defineProperty(dom.window.Element.prototype, 'scrollHeight', { get: () => 10e6, configurable: true });
const released = [];
global.window.ArtLoader = { release: (img) => released.push(img.getAttribute('data-art')), scan: () => {}, observe: () => {} };
global.ArtLoader = global.window.ArtLoader;
global.VirtualList = require(path.join(ROOT, 'js', 'virtuallist.js'));
global.window.VirtualList = global.VirtualList;

const Browse = require(path.join(ROOT, 'js', 'browse.js'));
const T = Browse._test;
const mount = document.getElementById('mount');
Browse.init({
  mount,
  fmt: (s) => String(s),
  onRender: () => {},
  onPlay: () => {}, onPlayFile: () => {}, onOpenAuthor: () => {}, onOpenFiles: () => {}, onBack: () => {},
  bindDlBtn: () => {},
});

// 145 books — the device library size from the log line `CACHE getBooks live: 145 books`.
const books = (n, tag) => Array.from({ length: n }, (_, i) => ({
  ratingKey: 'b' + i, title: 'Book ' + i, titleSort: String(i).padStart(6, '0'),
  parentTitle: 'Author ' + (i % 7), thumb: '/t/' + i,
  leafCount: 10, viewedLeafCount: tag ? 3 : 0,
}));

// Injected metrics: jsdom has no layout, so the controller is given a real
// viewport the same way test/browse-virtual.test.js does.
const view = { scrollY: 0, viewportH: 600 };
// NB: `overscan` is deliberately NOT injected. Production never injects it, so it
// derives from the viewport: `Math.round(metrics.viewportH() * OVERSCAN_FACTOR)`
// (js/virtuallist.js:177) — which is 0 exactly when the box measures zero, and that
// is the property checks E/F turn on. Injecting a constant overscan would mask it.
T.setVlOpts({
  strides: { header: 30, row: 80 },
  metrics: { scrollY: () => view.scrollY, viewportH: () => view.viewportH, listTop: () => 0 },
  scrollTo: (y) => { view.scrollY = y; },
});
// 145 <= VirtualList.FULL_RENDER_MAX (600), so the virtual path is reachable only
// through the Diagnostics "Windowed browse" override (virtuallist.js:39-45).
global.VirtualList.setForceVirtual(true);

const newPage = () => { const el = document.createElement('div'); el.className = 'browsepage'; mount.appendChild(el); return el; };
// The reveal instrument's own three numbers, read exactly as app.js:848-850 reads
// them: over the WHOLE #browse container.
const revealNumbers = () => ({
  rows: mount.querySelectorAll('.book, .author').length,
  imgs: mount.querySelectorAll('img').length,
  withSrc: Array.from(mount.querySelectorAll('img')).filter((i) => i.getAttribute('src')).length,
});
// snapBrowse (app.js:283-285): the first .browsepage in #browse WITHOUT `.hidden`.
// null => the FLASH line prints `base n/a` (app.js:971).
const snapBrowse = () => [...mount.querySelectorAll('.browsepage')].find((x) => !x.classList.contains('hidden')) || null;
const chrome = (p) => ({
  header: !!p.querySelector('.browsetitle'),
  letterheads: p.querySelectorAll('.letterhead').length,
  alphaindex: p.querySelectorAll('.alphaindex').length,
  shellHeights: [...p.querySelectorAll('.vrows')].map((r) => r.style.height).join(','),
});

const results = [];
const check = (name, fn) => {
  try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + e.message]); }
};

// ─────────────────────────────────────────────────────────────────────────────
// A — the producing step. A background-revalidate repaint reaching the
// virtualizer while the controller is NOT 'active' dematerializes every row and
// rebuilds the shells, and never realizes (virtuallist.js:299-313).
// ─────────────────────────────────────────────────────────────────────────────
check('A: repaint on a NON-ACTIVE controller leaves full chrome and ZERO rows', () => {
  T.pageCache.clear(); mount.innerHTML = '';
  const p = newPage();
  T.listView(p, 'Books', books(145), T.bookRow, false);
  T.pageCache.set('books', { el: p, order: 1 });
  p._vctl.activate();
  const before = chrome(p);
  assert.ok(revealNumbers().rows > 0, 'baseline: rows realized');
  assert.ok(before.letterheads > 0 && before.alphaindex === 1, 'baseline: chrome built');

  // This is what showPage() does to a page the gesture is leaving (browse.js:329).
  p._vctl.suspend();
  assert.strictEqual(p._vctl.state(), 'suspended');
  assert.ok(revealNumbers().rows > 0, 'suspend KEEPS the rows (that is its purpose)');

  // The SWR repaint, through the real routing (browse.js:492-497).
  const ok = T.patchInPlace({ v: 'books' }, p, books(145, 'fresh'));
  assert.strictEqual(ok, true, 'patchInPlace routed the virtual page to ctl.update');

  const n = revealNumbers();
  assert.strictEqual(n.rows, 0, 'rows=0  (got ' + n.rows + ')');
  assert.strictEqual(n.imgs, 0, 'imgs=0  (got ' + n.imgs + ')');
  assert.strictEqual(n.withSrc, 0, 'withSrc=0');
  const after = chrome(p);
  assert.strictEqual(after.header, true, 'header SURVIVES');
  assert.ok(after.letterheads > 0, 'section letters SURVIVE (' + after.letterheads + ')');
  assert.strictEqual(after.alphaindex, 1, 'A-Z strip SURVIVES');
  assert.strictEqual(after.shellHeights, before.shellHeights, 'row containers keep their CORRECT heights');
  assert.strictEqual(p._vctl.state(), 'suspended', 'the controller is left non-active');
});

// ─────────────────────────────────────────────────────────────────────────────
// B — why it does not self-heal. While a hold is live, showPage() deliberately
// does NOT activate a page whose controller is 'suspended' (browse.js:355-356),
// and _realize() hard-returns on a non-active controller (virtuallist.js:211).
// ─────────────────────────────────────────────────────────────────────────────
check('B: showPage under a live hold does NOT refill the emptied page', () => {
  const p = T.pageCache.get('books').el;
  Browse.beginHold();
  T.showPage('books');
  assert.strictEqual(revealNumbers().rows, 0, 'still 0 rows after showPage');
  assert.strictEqual(p._vctl.state(), 'suspended', 'activate() was skipped (returningFromSwipe)');
  // A direct realize is also a no-op while non-active.
  p._vctl._realize();
  assert.strictEqual(revealNumbers().rows, 0, '_realize() is a no-op on a non-active controller');
});

// ─────────────────────────────────────────────────────────────────────────────
// C — the guard that normally prevents A, and the one call that disarms it.
// ─────────────────────────────────────────────────────────────────────────────
check('C: with the hold intact the repaint is DEFERRED, and endHold replays it with rows restored', () => {
  T.pageCache.clear(); mount.innerHTML = '';
  const p = newPage();
  T.listView(p, 'Books', books(145), T.bookRow, false);
  T.pageCache.set('books', { el: p, order: 1 });
  p._vctl.activate();
  const baseline = revealNumbers().rows;
  assert.ok(baseline > 0);

  const token = Browse.beginHold();
  T.showPage('books');              // books is the landed page; others suspend
  // A revalidate lands mid-gesture. render()'s repaint closure defers it
  // (browse.js:550-553); reproduced here by asking the same question the closure
  // asks, then replaying through endHold.
  Browse.endHold(token, { v: 'books' });
  assert.strictEqual(p._vctl.state(), 'active', 'endHold activates the landed page');
  assert.ok(revealNumbers().rows > 0, 'rows present after endHold');
});

check('D: dropHold via clearCache empties #browse outright — rows=0, imgs=0, snapBrowse()=null ("base n/a")', () => {
  T.pageCache.clear(); mount.innerHTML = '';
  const p = newPage();
  T.listView(p, 'Books', books(145), T.bookRow, false);
  T.pageCache.set('books', { el: p, order: 1 });
  p._vctl.activate();
  assert.ok(snapBrowse() !== null, 'baseline: a visible .browsepage exists');

  const token = Browse.beginHold();
  Browse.clearCache();              // Net.onReconnect / pull-to-refresh (app.js:3118, 1384)

  const n = revealNumbers();
  assert.strictEqual(n.rows, 0, 'rows=0');
  assert.strictEqual(n.imgs, 0, 'imgs=0');
  assert.strictEqual(snapBrowse(), null, 'snapBrowse() === null  =>  the FLASH line prints "base n/a"');
  assert.strictEqual(mount.querySelectorAll('.browsepage').length, 0, 'every page NODE is gone');

  // And the gesture's own hold release is now a no-op: dropHold() bumped holdGen.
  // Observable consequence: endHold's landed branch un-parks every cached page
  // (browse.js:182-185). Give it a parked page to un-park; a stale token leaves it
  // parked, which is what strands a mid-gesture page in whatever state it was in.
  const q = newPage();
  T.listView(q, 'Books', books(145), T.bookRow, false);
  q.classList.add('parked');
  T.pageCache.set('books', { el: q, order: 2 });
  Browse.endHold(token, { v: 'books' });
  assert.strictEqual(q.classList.contains('parked'), true,
    'endHold(staleToken) no-ops: the page stays parked (browse.js:166 vs 182-185)');
  // Control: a MATCHING token does un-park it, so the assertion above is not vacuous.
  const fresh = Browse.beginHold();
  Browse.endHold(fresh, { v: 'books' });
  assert.strictEqual(q.classList.contains('parked'), false,
    'control: a matching token DOES un-park (so the stale-token check is load-bearing)');
});

// ─────────────────────────────────────────────────────────────────────────────
// E/F/G — the sequence the 2026-08-01 device log actually shows: a commit
// books→home immediately followed (42 ms) by a commit home→books. No repaint is
// involved; the rows are destroyed by the ORDINARY deactivate on the way to Home,
// and the re-entry never realizes them again.
//
// `view.viewportH = 0` models the page measuring zero because `#browse` is
// display:none. That is not a jsdom artifact being papered over — it is the rule
// the source states in its own words at js/browse.js:174-177 and js/nav.js:56-58
// ("a hidden box measures zero"). jsdom has no layout, so the metric is injected
// rather than measured; every other assertion is a node count.
// ─────────────────────────────────────────────────────────────────────────────
let pageE = null; let tok15 = null;
check('E: commit->home — deactivate strips the rows, then endHold RE-ACTIVATES the page while #browse is hidden and realizes ZERO', () => {
  T.pageCache.clear(); mount.innerHTML = ''; released.length = 0;
  view.viewportH = 600; view.scrollY = 0;
  const p = newPage(); pageE = p;
  T.listView(p, 'Books', books(145), T.bookRow, false);
  T.pageCache.set('books', { el: p, order: 1 });
  p._vctl.activate();
  const realized0 = p._vctl.realizedCount();
  assert.ok(realized0 > 0, 'baseline realized (' + realized0 + ')');
  // Count releases from HERE — an earlier check may have left another controller
  // active, and activate() deactivates it (js/virtuallist.js:237), which releases
  // ITS rows into the same counter.
  const relBefore = released.length;

  // --- gesture #14: books -> home, COMMIT ---
  const tok14 = Browse.beginHold();                 // app.js:548 takeRowHold
  // runFinalize -> applyScreen(home) -> Nav.setView('home') -> browseWillHide()
  Browse.deactivate();                              // js/nav.js:60 -> js/browse.js:371
  view.viewportH = 0;                               // ...and #browse is now display:none
  assert.strictEqual(p._vctl.state(), 'inactive');
  assert.strictEqual(p._vctl.realizedCount(), 0, 'rows dematerialized');
  assert.strictEqual(released.length - relBefore, realized0,
    'released === the realized count  (the log: "realized 15->0 ... released=15")');

  // finalize's `finally` -> dropRowHold() -> endHold(token, currentDesc()==='home')
  // 'home' is not a cached browse page, so endHold takes its ELSE branch and
  // activates + realizes activeEntry() — with #browse already hidden.
  Browse.endHold(tok14, { v: 'home' });
  assert.strictEqual(p._vctl.state(), 'active',
    'endHold ELSE branch re-ACTIVATED a page inside a hidden #browse (js/browse.js:211-212)');
  assert.strictEqual(p._vctl.realizedCount(), 0,
    'and realized ZERO rows, because the box measures zero (js/virtuallist.js:79-94, 177)');
});

check('F: re-entry 42ms later — showPage activate() EARLY-RETURNS, positionOnEnter writes nothing, page revealed with 0 rows', () => {
  const p = pageE;
  view.viewportH = 600;                             // #browse un-hidden by the drag-start render
  tok15 = Browse.beginHold();                       // gesture #15
  T.showPage('books');                              // CACHE HIT path, js/browse.js:524-526
  assert.strictEqual(p._vctl.realizedCount(), 0,
    'activate() returned without realizing (js/virtuallist.js:236)');
  assert.strictEqual(p._vctl.state(), 'active');
  assert.strictEqual(p._vctl.anchor(), null,
    'savedAnchor is null — captureAnchor saw top<=0 (js/virtuallist.js:247-249)');
  T.positionOnEnter({ v: 'books' }, p);             // js/browse.js:528
  assert.strictEqual(p._vctl.realizedCount(), 0,
    'positionOnEnter wrote nothing, so applyScrollY never realized (js/browse.js:310-313)');

  const n = revealNumbers();
  assert.strictEqual(n.rows, 0, 'reveal rows=0');
  assert.strictEqual(n.imgs, 0, 'reveal imgs=0');
  assert.strictEqual(n.withSrc, 0, 'reveal withSrc=0');
  assert.ok(chrome(p).letterheads > 0 && chrome(p).alphaindex === 1, 'chrome intact');
});

check('G: the ONE remaining refill — endHold landed branch realizes explicitly, and it works when the box measures', () => {
  const p = pageE;
  Browse.endHold(tok15, { v: 'books' });            // js/browse.js:189-190
  assert.ok(p._vctl.realizedCount() > 0,
    'endHold landed branch calls _realize() DIRECTLY, bypassing activate()\'s early return');
  assert.ok(revealNumbers().rows > 0, 'rows are back');
});

let bad = 0;
for (const [state, name] of results) { if (state === 'FAIL') bad++; console.log(state + '  ' + name); }
console.log('\n' + (results.length - bad) + '/' + results.length + ' checks passed');
process.exit(bad ? 1 : 0);
