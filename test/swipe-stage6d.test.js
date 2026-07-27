// STAGE 6d of PLAN-swipe-reveal.md (sub-plan Claude/Plans/PLAN-swipe-stage6d.md) —
// the RED suite for `finalizationPlanFor(classification).abortRender` and the retirement
// of the runtime `clobbered`/`sourceWasClobbered` byproduct. Derived cell-by-cell from
// that plan's §7 Coverage Model and §8 coverage/mutation matrix, authored red-first before
// `finalizationPlanFor` exists (js/swipe.js) and before the `clobbered` read sites are
// redirected (js/app.js). See Claude/Curie/RED-swipe-stage6d.md.
//
// WHAT 6d CHANGES. The abort/recovery re-render DECISION moves from a runtime byproduct
// (`sourceWasClobbered = resolveSource() === hostEl`, observed during buildConstruction and
// stored as `d.clobbered`) to a PURE DECLARED decision `finalizationPlanFor(classification)
// .abortRender` (`'rerender'` iff fromKind==='browse' && toKind==='browse'), computed at ARM
// time. The behaviour is BYTE-IDENTICAL on every reachable transition (plan §3, §4.19 —
// behaviour-preserving extraction); the value is that the decision is declared and
// oracle-verified rather than an observed build side effect, and `clobbered` stops being a
// second source of truth (EC §4.16).
//
// CELL MAP (plan §8).
//   FP   RED @HEAD    production finalizationPlanFor.abortRender equals the FROZEN
//                     expectedFinalization.abortRender for all 8 structural cases (the
//                     three-layer oracle turned on). RED now: finalizationPlanFor does not
//                     exist in js/swipe.js.
//   CLB  RED @HEAD    `cur.clobbered`/`sourceWasClobbered` no longer exist in js/app.js or
//                     js/swipe.js (labelled SOURCE_TEXT, §4.10 — a source-contract sweep,
//                     NOT a behavioural claim). RED now: both identifiers are present.
//   AB   parity       driving a real ABORT, browse->browse RE-RENDERS the source into
//                     #browse (render TRUE) and every other abort does NOT (render FALSE);
//                     scroll restored. GREEN @HEAD (byte-identical to today's clobbered),
//                     RED under the plan's mutation (key abortRender on the compute branch /
//                     on outgoing==='app-ghost', so home->browse AND overlay->browse wrongly
//                     re-render). Feature oracle on the REAL destination DOM via h.touch.
//   RC   parity       the supersession recovery reader (app.js begin(), ~415) reproduces
//                     `clobbered` at THREE boundary points via `cur.live && abortRender===
//                     'rerender'`: render-TRUE for a DRAGGING/built browse->browse; render-
//                     FALSE for an overlay->browse; render-FALSE for an ARMED, not-yet-built
//                     browse->browse (the `cur.live` conjunct). GREEN @HEAD, RED under the
//                     mutation "drop cur.live" (armed wrongly re-renders). The ARMED point is
//                     NEW coverage; the other two are reconciled by reference (below).
//   RGabort/RGheld/RGcommit  GREEN regression — reconciled by reference (block at the end).
//
// RED-FIRST + PARITY, honestly (plan §3 "Why parity at the user layer"; EC §4.19). This
// slice is a byte-identical PARITY extraction, so only FP and CLB fail against HEAD (the
// declared function does not exist; the byproduct identifiers are still present) — those two
// make the SUITE red-first. AB and RC assert PARITY behaviour, so they are GREEN against HEAD
// and RED only under their §8 mutations; forcing them red at HEAD would require either a
// consistency oracle (which cannot see wrong-but-deterministic — Curie's dimension-10 rule)
// or an assertion of a behaviour change the plan says does not happen. Each is mutation-
// verified against HEAD by breaking the clobbered-equivalent decision (recorded in
// Claude/Curie/RED-swipe-stage6d.md), so every cell is capable of failing per the
// tests-must-be-able-to-fail law.
//
// SCOPE, honestly. jsdom pins window.scrollY at 0, so the scroll assertions pin WHETHER a
// restore was issued, never WHICH coordinate (harness note). Layout is absent, so nothing
// here speaks to the visual flash (plan §10, out of scope — RGheld pins that the reveal
// TIMING is untouched). AB/RC drive the REAL start()->settle()->finalize()/begin() path
// through the app-harness and observe the REAL #browse render flag + window.scrollTo.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { boot } = require('./app-harness.js');
const { ROOT } = require('./dom-fixture.js');

const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));
const loadSpec = () => import(pathToFileURL(path.join(ROOT, 'test', 'fixtures', 'swipe-plan-spec.mjs')).href);

// REAL wall clock, captured before boot() patches setTimeout. move() resamples velocity
// only after >8ms of REAL time; synthetic moves fired back-to-back otherwise leave vx
// holding the outward flick and a gesture meant to abort commits instead (stage-6 note).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const hardResets = (h) => swipeLog(h).filter((m) => /leftover state on begin/.test(m));
const renders = (h) => h.log.calls.filter((c) => c.name === 'browse.render').map((c) => c.args[0]);
const scrollCalls = (h) => h.log.calls.filter((c) => c.name === 'window.scrollTo');
// The HELD-reveal signature. `holdGhostUntilPaintable` (app.js) is the ONLY emitter of a
// 'FLASH'/'hold …' line (at drop), and it is called from exactly the two held branches
// (commit→home, abort browse→browse). The no-pane abort path (dropPanes) never emits it. So
// this is the clean discriminator for "the abort wrongly took the browse-host re-render/held
// branch" — the observable browse.render CANNOT give for an overlay/home abort dest, because
// finalize re-renders currentDesc() (the source), and Browse.render only fires for a browse
// screen. (watchFrames emits 'FLASH'/'frames …' on BOTH paths — hence the `^hold ` anchor.)
const holds = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'FLASH' && /^hold /.test(c.args[1])).map((c) => c.args[1]);

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}
/** Authors over Books: a left-edge back-swipe is Authors->Books (browse->browse). */
async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="authors"]'); await settle(h);
}
/** Options over Books: a left-edge back-swipe is Options->Books (overlay->browse). */
async function onOptionsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="options"]'); await settle(h);
}

// A left-edge drag that goes LIVE then ABORTS (out, then back toward the edge). Returns the
// count of browse.render calls captured AFTER the mid-drag render but BEFORE the finalize —
// so `renders(h).slice(beforeFinalize)` is exactly the FINALIZE-phase re-render(s). The
// caller must have driven `start()` already? No — this drives the whole gesture: it fires
// the first move (which arms start() and its mid-drag render), samples, then aborts.
async function abortFromLeftEdge(h, target) {
  h.touch.start(10, 300, target);
  h.touch.move(80, 302); await realSleep(12);      // horizontal, past the 8px lock -> start() mid-drag render
  h.touch.move(200, 304); await realSleep(12);      // out
  const beforeFinalize = renders(h).length;         // AFTER the mid-drag render, BEFORE settle/finalize
  h.touch.move(30, 304); await realSleep(12);        // retreat -> aborts
  h.touch.end(30, 304);
  await settle(h); await h.clock.advance(400); await settle(h);
  return beforeFinalize;
}

// ════════════════════════════════════════════════════════════════════════════════════
// FP — the three-layer oracle turned on (RED @HEAD: finalizationPlanFor does not exist)
// ════════════════════════════════════════════════════════════════════════════════════
// Plan §4.14 / §8 FP. The FROZEN expectedFinalization.abortRender in swipe-plan-spec.mjs is
// the hand-written independent layer (1); js/swipe.js finalizationPlanFor is production (2);
// this test is the comparison (3). The DATA is unchanged from stage 4 — 6d only turns it on.
//
// RED @HEAD for the RIGHT reason: a clean assertion that the export is a function fails first
// (finalizationPlanFor is undefined), NOT a TypeError from calling undefined. Mutation (§8):
// key abortRender on renderDestination==='browse-host' (toKind==='browse') so home->browse
// AND overlay->browse become 'rerender', or flip any case -> production diverges from the
// hand-written frozen spec.

test('FP.contract — finalizationPlanFor returns the exact-key, frozen, closed-enum { abortRender } contract', () => {
  assert.equal(typeof Swipe.finalizationPlanFor, 'function',
    'js/swipe.js must export finalizationPlanFor (the declared abort decision) — RED @HEAD until stage 6d builds it');
  const out = Swipe.finalizationPlanFor(Swipe.classifyTransition({ from: { v: 'books' }, to: { v: 'authors', author: { ratingKey: 'A' } } }));
  assert.deepEqual(Object.keys(out).sort(), ['abortRender'],
    'finalizationPlanFor must carry EXACTLY { abortRender } — no missing, no dead/extra field (EC §4.11)');
  assert.ok(['rerender', 'none'].includes(out.abortRender),
    `abortRender is a closed enum 'rerender'|'none'; got ${JSON.stringify(out.abortRender)}`);
  assert.ok(Object.isFrozen(out), 'the finalization plan must be deep-frozen so a consumer cannot corrupt a shared plan');
});

test('FP.oracle — production finalizationPlanFor.abortRender equals the frozen expectedFinalization for all 8 structural cases', async () => {
  assert.equal(typeof Swipe.finalizationPlanFor, 'function',
    'js/swipe.js must export finalizationPlanFor — RED @HEAD until stage 6d builds it');
  const { STRUCTURAL_CASES, REPRESENTATIVE } = await loadSpec();
  const wrong = [];
  for (const sc of STRUCTURAL_CASES) {
    const from = { v: REPRESENTATIVE[sc.from] };
    const to = { v: REPRESENTATIVE[sc.to] };
    const c = Swipe.classifyTransition({ from, to });
    const got = Swipe.finalizationPlanFor(c).abortRender;
    if (got !== sc.expectedFinalization.abortRender) {
      wrong.push(`${sc.from}->${sc.to} got '${got}' want '${sc.expectedFinalization.abortRender}'`);
    }
  }
  assert.deepEqual(wrong, [],
    `production finalizationPlanFor disagrees with the hand-written frozen oracle ('rerender' only for `
    + `browse->browse):\n  ${wrong.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════════════════════════
// CLB — the byproduct is retired from HEAD (RED @HEAD: the identifiers are still present)
// ════════════════════════════════════════════════════════════════════════════════════
// Plan §8 CLB, labelled SOURCE_TEXT (EC §4.10 — a source-contract sweep, NOT a behavioural
// claim; it must not pretend to have caught runtime behaviour). `d.clobbered`/`cur.clobbered`
// (js/app.js) and `sourceWasClobbered` (js/swipe.js) are a stored derived consequence of the
// transition class; 6d deletes them and derives the decision at its one use site (EC §4.16).
// RED @HEAD: both identifiers are present. Mutation: reintroduce a `.clobbered` /
// `sourceWasClobbered` read -> this gate reddens. The construction exact-key contract (four
// keys -> three) and the five mutate.mjs anchors are Brunel's in-slice co-changes (plan
// §2/§9), guarded by swipe-construction.test.js and mutation-anchors.test.js — NOT re-pointed
// here (one owner per artifact; do not hide Brunel's build).
const SWEEP_FILES = ['js/app.js', 'js/swipe.js'];
const RETIRED_TOKENS = ['sourceWasClobbered', '.clobbered', 'clobbered:'];

test('CLB [SOURCE_TEXT] — the clobbered/sourceWasClobbered byproduct no longer exists in js/app.js or js/swipe.js', () => {
  const hits = [];
  for (const rel of SWEEP_FILES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const tok of RETIRED_TOKENS) {
      let i = src.indexOf(tok);
      while (i !== -1) { hits.push(`${rel}: "${tok}" @${i}`); i = src.indexOf(tok, i + 1); }
    }
  }
  assert.deepEqual(hits, [],
    'the abort re-render decision is now the declared finalizationPlanFor(classification).abortRender; '
    + '`clobbered`/`sourceWasClobbered` must be DELETED (EC §4.16 — no cause + separately-stored derived '
    + 'consequence). Still present:\n  ' + hits.join('\n  '));
});

// ════════════════════════════════════════════════════════════════════════════════════
// AB — the abort re-render, driven by the declared decision, on the REAL #browse DOM
// ════════════════════════════════════════════════════════════════════════════════════
// Plan §8 AB (wiring, real DOM). Parity feature oracle: GREEN @HEAD (byte-identical to the
// clobbered byproduct), RED under the §8 mutation. Driving a real abort:
//   * browse->browse takes the RE-RENDER/HELD branch — it re-renders the SOURCE into #browse
//     (Browse.render, render:true) and holds the reveal — the one same-browse-host transition
//     whose mid-drag render overwrote the source host.
//   * home->browse and overlay->browse — the TWO computed-but-false cases — take the plain
//     drop path: no re-render/held branch.
// The two false cases together catch BOTH keying mutations: keying on the compute branch
// (renderDestination==='browse-host' / toKind==='browse') reddens overlay->browse AND
// home->browse; keying on outgoing==='app-ghost' reddens home->browse (its outgoing IS an
// app-ghost) but not overlay->browse (real-source). Only fromKind==='browse'&&toKind===
// 'browse' gives 'none' for both.
//
// OBSERVABLE, honestly (why not just Browse.render): a wrongly-'rerender' overlay->browse or
// home->browse abort re-renders currentDesc() (the SOURCE), which is an overlay / #home — and
// Browse.render fires ONLY for a browse-screen dest, so a bare "no Browse.render" assertion
// would be vacuous for those two. The load-bearing discriminator is the HELD-reveal branch
// (`holds`): the browse->browse abort takes it (and re-renders the browse source); the other
// two must NOT. A mutation that flips a false case to 'rerender' makes it wrongly take the
// held branch — `holds` reddens.

test('AB.clobber — a browse->browse ABORT re-renders the SOURCE into #browse (render TRUE) and restores scroll', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);                    // back-swipe Authors->Books (browse->browse)
    const sBefore = scrollCalls(h).length;
    const hBefore = holds(h).length;               // delta across THIS abort only (setup may hold too)
    const beforeFinalize = await abortFromLeftEdge(h, addRow(h));
    assert.ok(/abort/.test(settles(h).at(-1) || ''), `fixture sanity: it aborted — got ${settles(h).at(-1)}`);
    const finalizeRenders = renders(h).slice(beforeFinalize);
    assert.ok(finalizeRenders.includes('authors'),
      'a browse->browse abort must RE-RENDER the source (Authors) into the shared #browse — the mid-drag '
      + `render overwrote the source host, so the abort restores it (render:true). finalize renders=${JSON.stringify(finalizeRenders)}`);
    assert.ok(holds(h).length > hBefore,
      'and it must take the HELD reveal branch (holdGhostUntilPaintable) — the same-browse-host abort holds '
      + `the pane until the re-rendered source is paintable. holds delta=${holds(h).length - hBefore}`);
    assert.ok(scrollCalls(h).length > sBefore,
      'the abort must put back the starting scroll (window.scrollTo(0, cur.scroll0))');
  } finally { h.dispose(); }
});

test('AB.noclobber-overlay — an overlay->browse ABORT does NOT re-render #browse (render FALSE) but restores scroll', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onOptionsOverBooks(h);                    // back-swipe Options->Books (overlay->browse)
    const sBefore = scrollCalls(h).length;
    const hBefore = holds(h).length;               // delta across THIS abort only
    await abortFromLeftEdge(h, h.$('options'));
    assert.ok(/abort/.test(settles(h).at(-1) || ''), `fixture sanity: it aborted — got ${settles(h).at(-1)}`);
    assert.equal(holds(h).length, hBefore,
      'an overlay->browse abort must NOT take the browse-host re-render/held branch — the overlay source '
      + `never overwrote the browse host, so abortRender is 'none'. A mutation keying abortRender on `
      + `renderDestination==='browse-host' reddens here. holds delta=${holds(h).length - hBefore}`);
    assert.ok(scrollCalls(h).length > sBefore,
      'but the abort must still restore the starting scroll');
  } finally { h.dispose(); }
});

test('AB.noclobber-home — a home->browse ABORT does NOT re-render #browse (render FALSE) but restores scroll', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await settle(h);
    // Put a browse descriptor on the fwd stack while landing on home: a COMMITTED back-swipe
    // Books->Home does fwdStack.push(navStack.pop()), leaving currentDesc()==='home' with
    // fwdStack top === books. A right-edge forward swipe from home is then home->browse.
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    const row = addRow(h);
    h.touch.start(10, 300, row);
    h.touch.move(80, 302); await realSleep(12);
    h.touch.move(300, 304); await realSleep(12);
    h.touch.move(700, 306); await realSleep(12);
    h.touch.move(950, 308); await realSleep(12);     // drag the incoming Home fully in -> commit
    h.touch.end(980, 308);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.ok(/commit back books→home/.test(settles(h).at(-1) || ''),
      `fixture sanity: the back-swipe committed Books->Home — got ${settles(h).at(-1)}`);

    // Now the forward swipe from the RIGHT edge: home->books. The COMMITTED back-swipe above
    // was itself a commit->home held reveal, so measure the held-branch delta across THIS abort.
    const sBefore = scrollCalls(h).length;
    const hBefore = holds(h).length;
    const rx = h.window.innerWidth - 2;
    h.touch.start(rx, 300, h.$('home'));
    h.touch.move(rx - 80, 302); await realSleep(12);   // drag left -> forward, live, mid-drag renders 'books'
    h.touch.move(rx - 200, 304); await realSleep(12);
    h.touch.move(rx - 20, 304); await realSleep(12);   // retreat toward the edge -> aborts
    h.touch.end(rx - 10, 304);
    await settle(h); await h.clock.advance(700); await settle(h);

    assert.ok(/abort fwd home→books/.test(settles(h).at(-1) || ''),
      `fixture sanity: the forward swipe was home->browse and aborted — got ${settles(h).at(-1)}`);
    assert.equal(holds(h).length, hBefore,
      'a home->browse abort must NOT take the browse-host re-render/held branch — the home source (#home) is '
      + `not the browse host, so abortRender is 'none'. A mutation keying abortRender on outgoing==='app-ghost' `
      + `reddens HERE (home->browse's outgoing IS an app-ghost, unlike overlay->browse). holds delta=${holds(h).length - hBefore}`);
    assert.ok(scrollCalls(h).length > sBefore, 'but the abort must still restore the starting scroll');
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════
// RC — the supersession recovery reader reproduces clobbered at the ARMED boundary
// ════════════════════════════════════════════════════════════════════════════════════
// Plan §3 item 2b / §8 RC. The recovery reader (app.js begin(), ~415) is redirected to
// `cur.live && cur.finPlan.abortRender === 'rerender'`. The `cur.live` conjunct reproduces
// `clobbered`'s "build actually ran" half, so an ARMED browse->browse superseded BEFORE the
// 8px lock (live===false, start() never ran) recovers with render FALSE — nothing was
// rendered into #browse to restore. This is the boundary NO existing cell covers, and it is
// the one the plan's cur.live conjunct exists for. GREEN @HEAD (an armed session's
// d.clobbered is still its arm-time `false`); RED under the mutation "drop cur.live" (the
// armed recovery would then wrongly re-render #browse — a flash-adjacent repaint).

test('RC.armed — an ARMED (pre-lock) browse->browse superseded before start() recovers WITHOUT re-rendering #browse', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);                    // a browse->browse back-swipe is available
    const before = renders(h).length;
    const hrBefore = hardResets(h).length;
    // ARM only: a touchstart binds the session (live:false) but do NOT cross the 8px lock, so
    // start() (and its mid-drag render) never runs. A SECOND touchstart supersedes the armed
    // session -> begin()'s hard reset runs the recovery reader on a live-but-not-built session.
    h.touch.start(10, 300, addRow(h));              // armed browse->browse (live:false)
    h.touch.start(10, 300, addRow(h));              // supersede while ARMED -> recovery
    await settle(h);
    assert.ok(hardResets(h).length > hrBefore,
      'fixture sanity: superseding the armed session tripped begin()\'s recovery hard reset');
    assert.deepEqual(renders(h).slice(before), [],
      'an ARMED browse->browse (start() never ran, so nothing was rendered into #browse) must recover with '
      + 'render FALSE — the cur.live conjunct reproduces clobbered\'s build-ran half. A build that dropped '
      + `cur.live would re-render #browse here. recovery renders=${JSON.stringify(renders(h).slice(before))}`);
  } finally { h.dispose(); }
});

// ── RC reconciliation — the two boundaries owned by existing cells (parity through 6d) ──
// The other two RC boundary points are already pinned and stay GREEN through the byproduct
// retirement (parity), so they are NOT duplicated here (one owner per cell):
//   RC.dragging-TRUE  = swipe-invariants.test.js "I11/I20 — superseding a live browse->browse
//                       drag re-renders the SOURCE into #browse" (renders end on 'authors').
//                       After 6d the reader is `cur.live && abortRender==='rerender'`; a built,
//                       DRAGGING browse->browse has live===true and abortRender==='rerender',
//                       so it still re-renders — byte-identical.
//   RC.overlay-FALSE  = swipe-stage6.test.js "NC — an overlay-source supersession issues NO
//                       spurious #browse re-render but still restores the scroll". overlay->browse
//                       has abortRender 'none', so the recovery renders FALSE — byte-identical.
//
// ── RG reconciliation — the parity-regression cells (must STAY green through 6d) ─────────
// Behaviour-preserving extraction (EC §4.19): the following existing cells guard that the
// user-visible behaviour 6d preserves does not move. They are NOT re-authored here.
//   RGabort  = swipe-invariants.test.js "I7 — an aborted browse->browse swipe issues a scroll
//              restore" (and AB.* above pin the abort RE-RENDER outcome on the real DOM).
//   RGheld   = the held-reveal choreography — swipe-stage5-residuals.test.js "F1a-L3" (the
//              commit->home held-pane path) and the reveal hold/drop timing tests. 6d touches
//              only the abort RENDER-FLAG derivation, never the reveal TIMING or hold/drop
//              control flow (the flash surface is untouched — plan §2/§10).
//   RGcommit = the commit finalization (destination screen + scroll) is unchanged; 6d moved
//              only the abort render flag. Guarded by the existing commit fixtures
//              (swipe-invariants / swipe-stage6b) — a commit decision change reddens them.
