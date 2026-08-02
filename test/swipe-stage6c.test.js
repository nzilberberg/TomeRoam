// RED-FIRST suite for Stage 6c (Curie) — PLAN-swipe-stage6c.md §9, input 94f5567.
//
// WHAT THIS PROVES. Stage 6c narrows begin()'s `finishing` gate so a successor can
// arm mid-settle for a PANE-LESS transition, and lands the `cur === session` ownership
// guard on the two settle-phase continuations (the settle rAF and finalize) so a stale
// fire after supersession cannot mutate the successor. It also clears `finishing` in the
// supersession recovery so a superseding tap that never arms cannot wedge future swipes.
//
// WHY THESE FAIL TODAY (red-first). Against current HEAD begin() (js/app.js:352) is a
// BLANKET reject during settle: `if (finishing) return;`. So the second gesture is never
// admitted — B never arms mid-settle, the identity guard does not exist, and the recovery
// that would clear `finishing` does not run. Every NEW cell below drives the interleaving
// the NARROWED gate must admit and asserts the successor-protection that is not there yet;
// each therefore reddens on current production for the intended missing behavior, and greens
// once Stage 6c is built. The regression/boundary cell PG stays GREEN throughout (a
// pane-owning session must remain rejected — the deferral boundary).
//
// FIXTURE DISCIPLINE (Charpy F4, BINDING). Each G/W cell uses a GENUINELY pane-less
// transition — overlay→browse (options→books) — and asserts it two ways before the
// supersession step: (1) the frozen spec `paneOf(constructionPlanFor(...))` is false
// (test/fixtures/swipe-plan-spec.mjs, the independent oracle §2.1 derives from), and
// (2) at runtime the settling gesture materialized NO owned pane (`.nav-ghost` count 0).
// A secretly pane-owning fixture would make the narrowed gate REJECT the second touch and
// the cell would be unsatisfiable — the exact KILL that hit the prior plan draft. PG is
// the symmetric pin: a genuinely pane-OWNING fixture (browse→browse, paneOf true, a real
// `.nav-ghost`) must stay rejected.
//
// OBSERVABILITY. The channel is the SUCCESSOR's REAL DOM and the real SWIPE log through
// test/app-harness.js — borrowed-real mover transforms, the commit/abort log line,
// endHold calls, and whether a subsequent swipe engages. No PBSwipeSession extension and
// no session-field accessor (plan §2.6): the guard is consumed by control flow and read
// off the successor's real surface.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');
const { boot } = require('./app-harness.js');
const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));

const loadSpec = () => import(pathToFileURL(path.join(ROOT, 'test', 'fixtures', 'swipe-plan-spec.mjs')).href);

// REAL wall clock, captured BEFORE boot() patches setTimeout. app.js move() only
// resamples velocity after >8ms of real time, so synthetic moves fired back-to-back
// leave vx holding the outward flick and an intended commit/abort inverts. (Same
// discipline as swipe-invariants.test.js.)
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const commits = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const resets = (h) => swipeLog(h).filter((m) => /hard reset/.test(m));
const endHolds = (h) => h.log.calls.filter((c) => c.name === 'browse.endHold');
const ghosts = (h) => h.document.querySelectorAll('.nav-ghost').length;
const tf = (h, id) => h.$(id).style.transform;
const hidden = (h, id) => h.$(id).classList.contains('hidden');
const sess = (h) => h.window.PBSwipeSession();
const fireTransitionEnd = (h, el) => el.dispatchEvent(new h.window.Event('transitionend'));

async function ms(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

// A left-edge back-swipe released to COMMIT (out and away). Velocity is resampled only
// after >8ms of real time, hence the realSleep between moves.
async function backCommit(h, el) {
  h.touch.start(10, 300, el);
  h.touch.move(80, 302); await realSleep(14);
  h.touch.move(600, 304); await realSleep(14);
  h.touch.end(600, 304); await ms(h);
}

// Navigate to the overlay 'options' sitting over 'books' — the pane-less fixture. A
// left-edge back-swipe from here is options→books (overlay→browse): the source rides as
// the real #options element and the destination is the real #browse — no owned pane.
async function onOptionsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await ms(h);
  h.tap('.navbtn[data-nav="options"]'); await ms(h);
}

// F4 (BINDING) — assert the fixture transition is GENUINELY pane-less, both by the frozen
// independent oracle and by the real production classifier for the concrete screens.
async function assertPaneLessFixture() {
  const spec = await loadSpec();
  const structural = spec.STRUCTURAL_CASES.find((c) => c.from === 'overlay' && c.to === 'browse');
  assert.equal(spec.paneOf(structural.expectedConstruction), false,
    'F4: the frozen spec must classify overlay→browse as pane-less (no ghost, no home-snapshot)');
  const prod = Swipe.constructionPlanFor(Swipe.classifyTransition({ from: { v: 'options' }, to: { v: 'books' } }));
  assert.equal(spec.paneOf(prod), false,
    'F4 (BINDING): production must classify the options→books fixture as genuinely pane-less — else the narrowed gate rejects the supersession and the cell is unsatisfiable');
}

// ============================================================================
// G1 — a stale settle rAF from a superseded pane-less session must write NO
// transform onto the successor's borrowed-real movers.
// RED NOW: begin() blanket-rejects the second touch, so B never arms.
// Mutation on the built code: remove the settle-rAF `cur === session` guard.
// ============================================================================
test('G1 — a stale settle rAF from a superseded pane-less session writes no transform onto the successor', async () => {
  await assertPaneLessFixture();
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onOptionsOverBooks(h);
    await backCommit(h, h.$('options'));                 // A: options→books, released → settling
    assert.equal(starts(h).length, 1, 'A must have gone live');
    assert.ok(sess(h) && sess(h).dragging === false, 'A must be settling (finishing, not dragging)');
    assert.equal(ghosts(h), 0, 'runtime paneLess: the options→books gesture materialized no owned pane');
    const aId = sess(h).id;

    // B supersedes mid-settle and arms.
    h.touch.start(10, 300, h.$('options'));
    assert.ok(sess(h) && sess(h).id !== aId,
      'RED-FIRST: the narrowed gate must admit a pane-less supersession so successor B arms mid-settle — today begin() (app.js:352) blanket-rejects while finishing');
    h.touch.move(80, 302); await realSleep(14);
    assert.equal(starts(h).length, 2, 'B must go live');
    const bOpt = tf(h, 'options'), bBrowse = tf(h, 'browse');
    assert.ok(bOpt !== '' && bBrowse !== '', 'B must carry its own drag transforms');

    // Deliver A's stale settle rAF (still queued under deferRaf; the recovery does not cancel it).
    await h.raf.frame();
    assert.equal(tf(h, 'options'), bOpt, 'G1: the stale rAF must not overwrite B\'s #options transform');
    assert.equal(tf(h, 'browse'), bBrowse, 'G1: the stale rAF must not overwrite B\'s #browse transform');
    assert.ok(sess(h) && sess(h).id !== aId && sess(h).dragging === true, 'B must remain the dragging owner');
  } finally { h.dispose(); }
});

// ============================================================================
// G2 — a 340ms settleTimer firing after supersession must run NO finalize over
// the successor: no commit/abort, no row-hold drop.
// RED NOW: begin() blanket-rejects, so B never arms.
// Mutation on the built code: remove the finalize `cur === session` guard.
// ============================================================================
test('G2 — a 340ms settleTimer firing after supersession runs no finalize over the successor', async () => {
  await assertPaneLessFixture();
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onOptionsOverBooks(h);
    await backCommit(h, h.$('options'));
    assert.ok(sess(h) && sess(h).dragging === false, 'A must be settling');
    assert.equal(ghosts(h), 0, 'runtime paneLess: no owned pane');
    const aId = sess(h).id;

    h.touch.start(10, 300, h.$('options'));
    assert.ok(sess(h) && sess(h).id !== aId,
      'RED-FIRST: the narrowed gate must admit the supersession so B arms — today begin() blanket-rejects while finishing');
    h.touch.move(80, 302); await realSleep(14);
    const bOpt = tf(h, 'options'), bBrowse = tf(h, 'browse');
    const holds0 = endHolds(h).length;

    // A's stale 340ms settleTimer fires finalize_A while B owns the gesture.
    await h.clock.advance(350);
    assert.equal(commits(h).length, 0, 'G2: a stale finalize must not commit/abort over B (no settle line)');
    assert.equal(tf(h, 'options'), bOpt, 'G2: B\'s #options transform must survive the stale timer');
    assert.equal(tf(h, 'browse'), bBrowse, 'G2: B\'s #browse transform must survive the stale timer');
    assert.equal(endHolds(h).length, holds0,
      'G2: a stale finalize must not enter its finally and drop B\'s row hold');
    assert.ok(sess(h) && sess(h).id !== aId && sess(h).dragging === true, 'B must remain the dragging owner');
  } finally { h.dispose(); }
});

// ============================================================================
// G3 — a LATE transitionend (the other finalize trigger) after supersession must
// run NO finalize over the successor.
// RED NOW: begin() blanket-rejects, so B never arms.
// Mutation on the built code: remove the finalize `cur === session` guard.
// ============================================================================
test('G3 — a late transitionend after supersession runs no finalize over the successor', async () => {
  await assertPaneLessFixture();
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onOptionsOverBooks(h);
    await backCommit(h, h.$('options'));
    assert.ok(sess(h) && sess(h).dragging === false, 'A must be settling');
    assert.equal(ghosts(h), 0, 'runtime paneLess: no owned pane');
    const aId = sess(h).id;

    h.touch.start(10, 300, h.$('options'));
    assert.ok(sess(h) && sess(h).id !== aId,
      'RED-FIRST: the narrowed gate must admit the supersession so B arms — today begin() blanket-rejects while finishing');
    h.touch.move(80, 302); await realSleep(14);
    const bOpt = tf(h, 'options'), bBrowse = tf(h, 'browse');

    // A's stale {once} transitionend listener still sits on its anchor (#options); fire it.
    fireTransitionEnd(h, h.$('options'));
    assert.equal(commits(h).length, 0, 'G3: a late transitionend must not run finalize_A over B (no settle line)');
    assert.equal(tf(h, 'options'), bOpt, 'G3: B\'s #options transform must survive the late transitionend');
    assert.ok(sess(h) && sess(h).id !== aId && sess(h).dragging === true, 'B must remain the dragging owner');
  } finally { h.dispose(); }
});

// ============================================================================
// W — a superseding tap that never arms must leave future swipes working: the
// recovery clears `finishing`. Two shapes, both pane-less (options→books).
// RED NOW: the second touch is blanket-rejected, `finishing` stays true (A's
// finalize is not advanced), and the fresh swipe wedges.
// Mutation on the built code: omit `finishing = false` in the recovery.
// ============================================================================
test('W — a superseding mid-screen tap that never arms leaves the next swipe working', async () => {
  await assertPaneLessFixture();
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onOptionsOverBooks(h);
    await backCommit(h, h.$('options'));                 // A settling → finishing = true
    assert.ok(sess(h) && sess(h).dragging === false, 'A must be settling');
    const before = starts(h).length;                     // = 1 (A)

    // A mid-screen touch: supersedes via the recovery but never crosses the direction
    // lock, so it never arms. `finishing` must be cleared by the recovery.
    h.touch.start(500, 300, h.$('options'));
    h.touch.end(500, 300); await ms(h);

    // A fresh full pane-less swipe must engage WITHOUT waiting for A's 340ms finalize.
    await backCommit(h, h.$('options'));
    assert.equal(starts(h).length, before + 1,
      'RED-FIRST: after a superseding tap the recovery must clear finishing so the next swipe engages — today the stuck finishing flag wedges begin()');
  } finally { h.dispose(); }
});

test('W(armed) — a superseding edge-tap that arms then ends before the lock leaves the next swipe working', async () => {
  await assertPaneLessFixture();
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onOptionsOverBooks(h);
    await backCommit(h, h.$('options'));                 // A settling → finishing = true

    // An edge touch that arms the successor then ends before crossing the lock (no start(),
    // no settle()). The recovery that armed it must have cleared finishing.
    h.touch.start(10, 300, h.$('options'));
    h.touch.end(10, 300); await ms(h);
    const before = starts(h).length;

    await backCommit(h, h.$('options'));
    assert.equal(starts(h).length, before + 1,
      'RED-FIRST: an armed-then-unlocked superseding tap must leave finishing clear so the next swipe engages — today it wedges');
  } finally { h.dispose(); }
});

// ============================================================================
// PG — the DEFERRAL BOUNDARY — DELETED by PLAN-swipe-declone.md Stage 2 (§12 item 27).
// Its subject was a PANE-OWNING settling session: browse->browse held a real .nav-ghost,
// and PG pinned that supersession must not dispose it. No transition builds a pane any
// more, so the cell had no subject left — it could only have been kept by re-creating the
// clone it was written about. The DEFERRAL BOUNDARY it guarded is still guarded for every
// reachable session by the pane-less cells above (G1-G3, W), which is now every session.
// ============================================================================
test('G-chain (supplementary) — across A→B→C both superseded generations\' stale callbacks no-op onto C', async () => {
  await assertPaneLessFixture();
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onOptionsOverBooks(h);
    await backCommit(h, h.$('options'));                 // A settling
    const aId = sess(h).id;

    // B supersedes A, arms, drags, releases → B settling (its own pending frame/timer/listener).
    h.touch.start(10, 300, h.$('options'));
    assert.ok(sess(h) && sess(h).id !== aId,
      'RED-FIRST: the gate must admit B superseding pane-less A — today begin() blanket-rejects while finishing');
    h.touch.move(80, 302); await realSleep(14);
    h.touch.move(600, 304); await realSleep(14);
    h.touch.end(600, 304); await ms(h);
    const bId = sess(h).id;
    assert.ok(sess(h) && bId !== aId && sess(h).dragging === false, 'B must be settling, distinct from A');

    // C supersedes B (pane-less), arms, drags.
    h.touch.start(10, 300, h.$('options'));
    assert.ok(sess(h) && sess(h).id !== bId, 'RED-FIRST: the gate must admit C superseding pane-less B');
    h.touch.move(80, 302); await realSleep(14);
    assert.equal(starts(h).length, 3, 'C must be live (3 starts)');
    const cOpt = tf(h, 'options'), cBrowse = tf(h, 'browse');

    // Deliver BOTH stale settle rAFs (A's and B's are both queued under deferRaf).
    await h.raf.frame();
    assert.equal(tf(h, 'options'), cOpt, 'neither stale rAF may stain C\'s #options');
    assert.equal(tf(h, 'browse'), cBrowse, 'neither stale rAF may stain C\'s #browse');

    // Deliver BOTH stale settleTimers.
    await h.clock.advance(800);
    assert.equal(commits(h).length, 0, 'neither stale finalize may commit/abort over C');

    // One transitionend on the shared anchor fires BOTH stale {once} listeners (A's and B's).
    fireTransitionEnd(h, h.$('options'));
    assert.equal(commits(h).length, 0, 'neither stale transitionend may run finalize over C');
    assert.ok(sess(h) && sess(h).id !== bId && sess(h).dragging === true, 'C must remain the dragging owner');
  } finally { h.dispose(); }
});
