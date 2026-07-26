// LOKI PROBE — disposable. Stage-6a supersession recovery, plan §6 order, executed
// against the REAL js/browse.js + js/virtuallist.js (the Stage-5 machinery the plan
// reuses). Not a test; never enters the suite.
//
// Question: when the ratified §6 order runs —
//   step 2: dropRowHold()            (endHold — "unchanged order", plan §2/§6)
//   step 3: re-render source + scrollTo(scroll0)
//   step 4: successor arms; its start() snapshots #browse
// — does the successor snapshot the RESTORED source (the same row elements the user
// was looking at), as the promise claims, or a rebuilt page?
//
// Control: the ABORT order the plan claims to mirror (render under hold → scroll →
// endHold), same fixture — the order runFinalize + finalize's finally actually produce.
const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const { JSDOM } = require(REPO + '/node_modules/jsdom');

function boot() {
  const dom = new JSDOM('<!doctype html><body><div id="mount"></div></body>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.window.requestAnimationFrame = (fn) => fn();
  global.requestAnimationFrame = global.window.requestAnimationFrame;
  global.Plex = {
    artUrl: (t) => (t ? 'art:' + t : null),
    libraryTruncation: () => ({ authors: { state: 'complete', total: 0, returned: 0 }, books: { state: 'complete', total: 0, returned: 0 } }),
    truncationDisplay: (t, count) => ({ state: 'complete', total: 0, returned: count }),
    onTruncationChange: () => {},
  };
  global.window.Plex = global.Plex;
  const view = { scrollY: 0, viewportH: 600 };
  const scrollWrites = [];
  global.window.scrollTo = (x, y) => { scrollWrites.push(y); view.scrollY = y; };
  Object.defineProperty(dom.window.document.documentElement, 'scrollHeight', { get: () => 10e6, configurable: true });
  const released = [];
  global.window.ArtLoader = { release: (img) => released.push(img.getAttribute('data-art')), scan: () => {}, observe: () => {} };
  global.ArtLoader = global.window.ArtLoader;
  delete require.cache[require.resolve(REPO + '/js/virtuallist.js')];
  delete require.cache[require.resolve(REPO + '/js/browse.js')];
  global.VirtualList = require(REPO + '/js/virtuallist.js');
  global.window.VirtualList = global.VirtualList;
  const Browse = require(REPO + '/js/browse.js');
  const T = Browse._test;
  Browse.init({
    mount: document.getElementById('mount'),
    fmt: (s) => String(s),
    onRender: () => {},
    onPlay: () => {}, onPlayFile: () => {}, onOpenAuthor: () => {}, onOpenFiles: () => {}, onBack: () => {},
    bindDlBtn: () => {},
  });
  T.setVlOpts({
    strides: { header: 30, row: 80 },
    overscan: 200,
    metrics: { scrollY: () => view.scrollY, viewportH: () => view.viewportH, listTop: () => 0 },
    scrollTo: (y) => { view.scrollY = y; },
  });
  const books = (n, p) => Array.from({ length: n }, (_, i) => ({
    ratingKey: (p || 'b') + i, title: 'Book ' + i, titleSort: String(i).padStart(6, '0'),
    parentTitle: 'A', thumb: '/t/' + (p || 'b') + i, leafCount: 10, viewedLeafCount: 0,
  }));
  return { dom, view, Browse, T, books, released, scrollWrites };
}

// Common prelude for both runs: a live browse→browse drag, deep-scrolled virtual
// source (the .136+ real-library shape), mid-drag destination render, browser clamp.
function liveDragAtSupersessionPoint(env) {
  const { view, Browse, T, books } = env;
  global.VirtualList.setForceVirtual(true);
  T.pageCache.clear();
  const page = () => { const el = document.createElement('div'); el.className = 'browsepage'; document.getElementById('mount').appendChild(el); return el; };
  const src = page(); T.listView(src, 'Books', books(900), T.bookRow, false);
  T.pageCache.set('books', { el: src, order: 1, sy: 0 });
  const dst = page(); T.listView(dst, 'Authors', books(900, 'x'), T.bookRow, false);
  T.pageCache.set('authors', { el: dst, order: 2, sy: 0 });

  T.showPage('books');                       // user is on the source page
  const SCROLL0 = 8000;
  view.scrollY = SCROLL0;                    // scrolled deep into the list
  src._vctl._realize();                      // realized window at scroll0 — what the user sees
  T.pageCache.get('books').sy = SCROLL0;     // the passive scroll listener's record

  // Stamp the LIVE rows (the app's own swGen technique) so identity is measurable.
  const stamp = 'live';
  src.querySelectorAll('.book').forEach((r) => { r.dataset.probe = stamp; });
  const liveRows = src.querySelectorAll('.book').length;

  const tok = Browse.beginHold();            // start(): takeRowHold
  T.showPage('authors');                     // start(): mid-drag destination render (clobbers #browse host)
  view.scrollY = 40;                         // the browser clamps scrollY — destination collapsed the document (.202, measured)
  return { src, dst, tok, SCROLL0, stamp, liveRows };
}

function snapshotState(src, stamp, view, label) {
  const rows = src.querySelectorAll('.book');
  const kept = [...rows].filter((r) => r.dataset.probe === stamp).length;
  const fresh = rows.length - kept;
  return `${label}: realized=${rows.length} keptOriginalRows=${kept} freshRebuiltRows=${fresh} state=${src._vctl.state()} scrollY=${view.scrollY} parked=${src.classList.contains('parked')} hidden=${src.classList.contains('hidden')}`;
}

// ── RUN A — the RATIFIED §6 ORDER ─────────────────────────────────────────────
(() => {
  const env = boot();
  const { view, Browse, T, released, scrollWrites } = env;
  const { src, tok, SCROLL0, stamp, liveRows } = liveDragAtSupersessionPoint(env);
  console.log('A  prelude: liveRows=' + liveRows + ' at scroll0=' + SCROLL0);
  released.length = 0; scrollWrites.length = 0;

  // §6 step 2 — "Release the old session — releaseGesture(), dropRowHold(), session
  // = null (unchanged order)." The hold returns BEFORE the recovery renders.
  Browse.endHold(tok);
  console.log(snapshotState(src, stamp, view, 'A  after step 2 (dropRowHold)'));

  // §6 step 3 — "restore the source screen; re-render the source into #browse iff
  // d.clobbered" — applyScreen(currentDesc(), {render:true, resetScroll:false}) →
  // d.renderBrowse(desc) → Browse.render (cache hit: fully synchronous prefix)...
  Browse.render({ v: 'books' });
  console.log(snapshotState(src, stamp, view, 'A  after step 3 render'));
  // ...then "window.scrollTo(0, d.scroll0)".
  global.window.scrollTo(0, SCROLL0);
  console.log(snapshotState(src, stamp, view, 'A  after step 3 scrollTo'));

  // §6 step 4 — the successor arms; its start() (first move) calls ghostApp():
  // a SYNCHRONOUS cloneNode of .app. What it clones is exactly the state above.
  console.log(snapshotState(src, stamp, view, 'A  AT SUCCESSOR start() SNAPSHOT'));
  console.log('A  coversReleasedDuringRecovery=' + released.length
    + ' scrollWritesDuringRecovery=[' + scrollWrites.join(',') + ']');
  global.VirtualList.setForceVirtual(false);
  global.VirtualList.setScrollSuspended(false);
})();

// ── RUN B — CONTROL: the ABORT ORDER the plan claims to mirror ────────────────
// runFinalize: applyScreen(render:true) → scrollTo(scroll0); finalize's finally:
// dropRowHold(). Render UNDER the hold; endHold LAST, after the scroll restore.
(() => {
  const env = boot();
  const { view, Browse, T, released, scrollWrites } = env;
  const { src, tok, SCROLL0, stamp, liveRows } = liveDragAtSupersessionPoint(env);
  console.log('B  prelude: liveRows=' + liveRows + ' at scroll0=' + SCROLL0);
  released.length = 0; scrollWrites.length = 0;

  Browse.render({ v: 'books' });             // re-render source, hold still held
  global.window.scrollTo(0, SCROLL0);        // restore the session-start scroll
  Browse.endHold(tok);                       // hold returns LAST — "the ONE realization, against the settled scroll"
  console.log(snapshotState(src, stamp, view, 'B  AT EQUIVALENT SNAPSHOT POINT'));
  console.log('B  coversReleasedDuringRecovery=' + released.length
    + ' scrollWritesDuringRecovery=[' + scrollWrites.join(',') + ']');
  global.VirtualList.setForceVirtual(false);
  global.VirtualList.setScrollSuspended(false);
})();
