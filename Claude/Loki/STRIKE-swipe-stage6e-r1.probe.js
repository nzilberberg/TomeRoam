// LOKI PROBE — stage 6e strike, disposable. NOT product code, NOT a test.
//
// The promise under strike: at begin()-recovery, disposeOwnedPanes(session)
// removes exactly the set of DOM nodes the old global `.nav-ghost` sweep removed.
// That equality rests on ONE invariant: every `.nav-ghost` mounted by a build is
// the element of a mover tagged ownership==='owned-pane' (and nothing borrowed
// carries the class). This probe executes that invariant against the REAL
// js/swipe.js for every reachable transition class, plus:
//   - malformed-descriptor throw happens BEFORE any DOM mount (no stranded ghost)
//   - an async function cannot throw synchronously (Browse.render is async,
//     browse.js:475 — so the mid-build window cannot be opened by a render failure)
'use strict';
const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const { JSDOM } = require(REPO + '/node_modules/jsdom');
const Swipe = require(REPO + '/js/swipe.js');

const dom = new JSDOM(`<!doctype html><html><body>
  <div class="app">
    <div class="topbar"></div>
    <div id="home"><div class="carousel"></div><img data-art="x"></div>
    <div id="browse" class="hidden"><div class="browsepage"><div class="book"></div></div></div>
    <div id="library"></div>
  </div>
  <div id="options" class="hidden"></div>
  <div id="advanced" class="hidden"></div>
  <div id="nowplaying" class="hidden"></div>
  <div id="navbar"><div class="np-actions"><button>pill</button></div></div>
</body></html>`, { pretendToBeVisual: true });
const doc = dom.window.document;
const $ = (id) => doc.getElementById(id);

const env = {
  document: doc,
  scrollY: () => 137,
  sourceEl: (host, v) => (host === 'overlay' ? $(v) : (v === 'home' ? $('home') : $('browse'))),
  navPill: () => doc.querySelector('#navbar .np-actions'),
  renderDestination: (dest, host) => (host === 'browse-host' ? $('browse') : $(dest.v)),
};

const ghostsInDom = () => [...doc.querySelectorAll('.nav-ghost')];
const wipe = () => doc.querySelectorAll('.nav-ghost, .np-pill-float').forEach((n) => n.remove());

const cases = [
  ['books->authors  (browse->browse, app-ghost)', { v: 'books' }, { v: 'authors' }, 1],
  ['authorBooks->books (browse->browse, app-ghost)', { v: 'authorBooks', author: { id: 2 } }, { v: 'books' }, 1],
  ['home->books     (home->browse, app-ghost)', { v: 'home' }, { v: 'books' }, 1],
  ['books->home     (browse->home, home-snapshot)', { v: 'books' }, { v: 'home' }, 1],
  ['nowplaying->home (overlay->home, snapshot + NP pill)', { v: 'nowplaying' }, { v: 'home' }, 1],
  ['nowplaying->files (overlay->browse, pane-less + NP pill)', { v: 'nowplaying' }, { v: 'files', book: { id: 9 } }, 0],
  ['books->options  (browse->overlay, pane-less)', { v: 'books' }, { v: 'options' }, 0],
  ['options->books  (overlay->browse, pane-less)', { v: 'options' }, { v: 'books' }, 0],
  ['books->nowplaying (browse->overlay, pane-less + NP pill)', { v: 'books' }, { v: 'nowplaying' }, 0],
  ['home->nowplaying (home->overlay, pane-less + NP pill)', { v: 'home' }, { v: 'nowplaying' }, 0],
];

let fail = 0;
for (const [name, from, dest, expectGhosts] of cases) {
  wipe();
  const c = Swipe.buildConstruction(from, dest, env);
  const movers = [c.movers.outgoing, c.movers.incoming, c.movers.decoration].filter(Boolean);
  const ownedPaneEls = movers.filter((m) => m.ownership === 'owned-pane').map((m) => m.element);
  const dg = ghostsInDom();
  // THE invariant: DOM .nav-ghost set === owned-pane mover element set (identity, not count)
  const setEqual = dg.length === ownedPaneEls.length && dg.every((g) => ownedPaneEls.includes(g));
  // and no borrowed-real / decoration node carries .nav-ghost
  const borrowedGhosted = movers.some((m) => m.ownership !== 'owned-pane'
    && m.element.classList && m.element.classList.contains('nav-ghost'));
  const ok = setEqual && !borrowedGhosted && dg.length === expectGhosts;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: domGhosts=${dg.length} ownedPaneMovers=${ownedPaneEls.length} setEqual=${setEqual} borrowedGhosted=${borrowedGhosted}`);
}

// Malformed descriptor: classify throws BEFORE any pane mounts → zero stranded ghosts.
wipe();
let threw = false;
try { Swipe.buildConstruction({ v: 'books' }, { v: 'files' }, env); } catch (e) { threw = true; }
const strandedAfterThrow = ghostsInDom().length;
const okThrow = threw && strandedAfterThrow === 0;
if (!okThrow) fail++;
console.log(`${okThrow ? 'OK  ' : 'FAIL'} malformed files (no book): threw=${threw} ghostsStrandedInDom=${strandedAfterThrow}`);

// Async functions cannot throw synchronously — the sync section's throw becomes a
// rejected promise. Browse.render is `async function render` (browse.js:475), so a
// render failure can never unwind buildConstruction mid-build.
async function boom() { throw new Error('thrown in the synchronous section'); }
let syncThrew = false;
try { boom().catch(() => {}); } catch { syncThrew = true; }
if (syncThrew) fail++;
console.log(`${syncThrew ? 'FAIL' : 'OK  '} async fn sync-section throw stays async: syncThrew=${syncThrew}`);

console.log(fail ? `\n${fail} FAILURE(S) — the invariant is broken` : '\nALL PLANES HELD — every mounted .nav-ghost is an owned-pane mover element');
process.exit(fail ? 1 : 0);
