// Loki Stage-6d probe — executes the promised arm-time derivation against the OLD
// runtime byproduct over the full ordered-pair space of reachable screens, at every
// gesture phase that reaches a read site.
//
// REAL code under test: js/swipe.js classifyTransition + constructionPlanFor (and,
// through swipe.js, js/nav.js isOverlay). The env identity semantics are mirrored
// line-faithfully from nav.js:35-36 (overlayEl = byId(v); appViewEl = v==='home' ?
// byId('home') : byId('browse')) and app.js:482 (sourceEl) / app.js:485 (showAppView
// returns $('browse') for the browse-host render).
'use strict';
const Swipe = require('C:/Users/nzilb/OneDrive/Desktop/TomeRoam/js/swipe.js');

// Sentinel nodes standing for byId results — identity semantics only.
const nodes = { home: { id: 'home' }, browse: { id: 'browse' } };
const OVERLAYS = ['options', 'nowplaying', 'general', 'playback', 'buffering', 'downloads', 'diagnostics'];
for (const v of OVERLAYS) nodes[v] = { id: v };

// nav.js:35-36, mirrored exactly.
const overlayEl = (v) => nodes[v];
const appViewEl = (v) => (v === 'home' ? nodes.home : nodes.browse);
// app.js:482, mirrored exactly.
const sourceEl = (host, v) => (host === 'overlay' ? overlayEl(v) : appViewEl(v));

// The reachable descriptor space (app.js goHome/goAuthors/goBooks/goOptions/openSub/
// openAuthor/openFiles/openNowPlaying/filesDescForCurrent; browse.js:474).
const DESCS = [
  { v: 'home' },
  { v: 'books' },
  { v: 'authors' },
  { v: 'authorBooks', author: { ratingKey: 1, title: 'A' } },
  { v: 'files', book: { ratingKey: 2, title: 'B' } },
  ...OVERLAYS.map((v) => ({ v })),
];

let pairs = 0, divergences = [], panelessBrowseBrowse = 0;
for (const from of DESCS) for (const to of DESCS) {
  if (from.v === to.v) continue;
  pairs++;
  const c = Swipe.classifyTransition({ from, to });          // REAL — throws = loud finding
  const plan = Swipe.constructionPlanFor(c);                 // REAL

  // OLD byproduct — swipe.js:300-310 exactly: computed only on the browse-host branch,
  // true iff the resolved real source IS the render host ($('browse'), app.js:485).
  let OLD = false;
  if (plan.incoming !== 'home-snapshot' && plan.renderDestination === 'browse-host') {
    OLD = sourceEl(c.sourceHost, from.v) === nodes.browse;
  }

  // NEW promised derivation — abortRender at arm, frozen.
  const abortRender = (c.fromKind === 'browse' && c.toKind === 'browse') ? 'rerender' : 'none';
  const NEW_finalize = abortRender === 'rerender';

  // Phase matrix.
  // FINALIZE sites (app.js:1159/:1185): only live sessions reach settle (app.js:563 guard),
  // and start() completed synchronously, so OLD there is the :516 write.
  if (OLD !== NEW_finalize) {
    divergences.push({ site: 'finalize', from: from.v, to: to.v, OLD, NEW: NEW_finalize });
  }
  // RECOVERY site (app.js:415), armed-not-live: OLD reads the :439 init (false);
  // NEW = cur.live(false) && ... = false. Structurally equal; assert anyway.
  const NEW_recov_armed = false && NEW_finalize;
  if (false !== NEW_recov_armed) divergences.push({ site: 'recovery-armed', from: from.v, to: to.v });
  // RECOVERY site, live mid-drag supersession: OLD = :516 write; NEW = true && abortRender.
  if (OLD !== (true && NEW_finalize)) {
    divergences.push({ site: 'recovery-live', from: from.v, to: to.v, OLD, NEW: NEW_finalize });
  }
  // RECOVERY site, pane-less settling session (finishing && session, app.js:383): only
  // pane-less sessions pass the :368 gate. Pane-owning iff app-ghost or home-snapshot.
  const paneLess = plan.outgoing !== 'app-ghost' && plan.incoming !== 'home-snapshot';
  if (paneLess) {
    if (OLD !== (true && NEW_finalize)) {
      divergences.push({ site: 'recovery-paneless', from: from.v, to: to.v, OLD, NEW: NEW_finalize });
    }
    if (c.fromKind === 'browse' && c.toKind === 'browse') panelessBrowseBrowse++;
  }
}

console.log('pairs checked:', pairs);
console.log('browse->browse sessions that are pane-less (must be 0):', panelessBrowseBrowse);
console.log('divergences:', divergences.length);
for (const d of divergences) console.log(' ', JSON.stringify(d));
console.log(divergences.length === 0 ? 'PROMISE HELD on the enumerated space.' : 'PROMISE BROKEN.');
