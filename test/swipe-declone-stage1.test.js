// STAGE 1 of PLAN-swipe-declone.md — the two coverage cells named in the plan's §14
// coverage/mutation matrix for the classification narrowing and the deferred #home park.
// Authored alongside the build (the plan-review/test-author ceremony is explicitly waived
// for this stage, per the user's instruction — the stage deletes machinery, it does not
// add it, and the campaign has already run one full day of it).
//
// WHAT STAGE 1 CHANGES. js/swipe.js constructionPlanFor's `outgoing` narrows from "an
// in-flow source going to any non-home destination" to "the source AND destination are
// BOTH browse" — so home->browse, home->overlay and browse->overlay stop building an owned
// pane and move their real view element directly. js/app.js's `showAppView` stops parking
// #home mid-drag (deferred to commit, via the existing applyScreen->Nav.setView path; never
// on abort).
//
// CELL MAP (plan §14).
//   NOGHOSTINFLOW  unit         constructionPlanFor builds an owned pane for exactly one
//                                structural pair (browse->browse) and 'real-source'
//                                everywhere else. NATURAL mutant: widen the condition back
//                                to the pre-Stage-1 rule (tools/mutate.mjs "stage1
//                                NOGHOSTINFLOW").
//   HOMESTAYSLIVE  integration  during a home->browse drag the real #home is the outgoing
//                                mover and is never parked while the gesture is live; it IS
//                                parked once committed, and is NOT parked after an abort.
//                                TWO mutants (one cannot exercise both edges): re-parking
//                                #home at drag start (reddens the mid-drag assertion) and
//                                the finalize commit path no longer parking #home (reddens
//                                the post-commit assertion).
//
// SCOPE, honestly. jsdom has no layout, paint, font boosting or scroll anchoring — these
// cells assert source/classification facts and class-state facts, never alignment, reflow
// or background. The heading-resize symptom this plan investigates is device-owed (plan §15
// R-E) and is NOT asserted here.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { boot } = require('./app-harness.js');
const { ROOT } = require('./dom-fixture.js');

const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));
const loadSpec = () => import(pathToFileURL(path.join(ROOT, 'test', 'fixtures', 'swipe-plan-spec.mjs')).href);

// REAL wall clock, captured before boot() patches setTimeout — move() resamples velocity
// only after >8ms of REAL time (the same reason every other swipe suite keeps its own).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

// ════════════════════════════════════════════════════════════════════════════════════
// NOGHOSTINFLOW (unit, pure classification)
// ════════════════════════════════════════════════════════════════════════════════════
const outgoingOf = (fv, tv) =>
  Swipe.constructionPlanFor(Swipe.classifyTransition({ from: { v: fv }, to: { v: tv } })).outgoing;

test('NOGHOSTINFLOW — after Stage 1 only browse->browse builds an owned pane; every other '
  + 'structural pair (including home->browse, home->overlay, browse->overlay) moves its '
  + 'real element directly', async () => {
  const spec = await loadSpec();
  const REP = spec.REPRESENTATIVE;   // { home: 'home', browse: 'books', overlay: 'options' }
  const wrong = [];
  for (const c of spec.STRUCTURAL_CASES) {
    const got = outgoingOf(REP[c.from], REP[c.to]);
    const want = (c.from === 'browse' && c.to === 'browse') ? 'app-ghost' : 'real-source';
    if (got !== want) wrong.push(`${c.from}->${c.to} got '${got}' want '${want}'`);
  }
  assert.deepEqual(wrong, [],
    `every structural pair except browse->browse must move its real element, never build an owned `
    + `pane:\n  ${wrong.join('\n  ')}`);
  assert.equal(spec.STRUCTURAL_CASES.length, 8, 'fixture sanity: there are eight structural cases');
});

// ════════════════════════════════════════════════════════════════════════════════════
// HOMESTAYSLIVE (integration, app harness)
// ════════════════════════════════════════════════════════════════════════════════════
/**
 * Land on HOME with a browse descriptor on the FWD stack: commit a Books→Home back-swipe
 * (fwdStack.push(navStack.pop())), which is what makes a right-edge forward swipe from home
 * a home→browse transition. Same recipe as test/swipe-stage6d.test.js AB.noclobber-home.
 */
async function onHomeWithBooksForward(h) {
  await settle(h);
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  const row = addRow(h);
  h.touch.start(10, 300, row);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(300, 304); await realSleep(12);
  h.touch.move(700, 306); await realSleep(12);
  h.touch.move(950, 308); await realSleep(12);          // drag the incoming Home fully in → commit
  h.touch.end(980, 308);
  await settle(h); await h.clock.advance(700); await settle(h);
  assert.ok(/commit back books→home/.test(settles(h).at(-1) || ''),
    `fixture sanity: the back-swipe must have committed Books→Home, leaving fwdStack top = books — `
    + `got ${settles(h).at(-1)}`);
}

test('HOMESTAYSLIVE — the real #home is the outgoing mover on a home->browse drag and is '
  + 'NEVER parked while the gesture is live', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onHomeWithBooksForward(h);
    const home = h.$('home');
    assert.ok(!home.classList.contains('parked'), 'fixture sanity: #home is not parked before the drag');

    const startsBefore = starts(h).length;
    const rx = h.window.innerWidth - 2;
    h.touch.start(rx, 300, home);
    h.touch.move(rx - 80, 302);                          // past the 8px lock → live, mid-drag
    assert.equal(starts(h).length, startsBefore + 1,
      `fixture sanity: the home->browse gesture must go LIVE — got ${JSON.stringify(swipeLog(h))}`);
    assert.ok(/^start fwd home→books/.test(starts(h).at(-1) || ''),
      `fixture sanity: the live gesture must be the forward home->browse — got ${starts(h).at(-1)}`);

    // THE INVARIANT. Stage 1 makes #home the real outgoing mover, so it is transformed
    // in-place and must never be parked — a parked #home carries #home.parked's own
    // translateX(-101vw), which would fight the drag's own inline transform.
    assert.ok(!home.classList.contains('parked'),
      'the real #home must NEVER be parked while a home->browse drag is live');
    assert.notEqual(home.style.transform, '',
      `the real #home must carry the swipe's own inline transform while live — got '${home.style.transform}'`);

    // Retreat to the edge → abort, so the harness leaves nothing dangling.
    await realSleep(12);
    h.touch.move(rx - 200, 304); await realSleep(12);
    h.touch.move(rx - 20, 304); await realSleep(12);
    h.touch.end(rx - 10, 304);
    await settle(h); await h.clock.advance(700); await settle(h);
  } finally { h.dispose(); }
});

test('HOMESTAYSLIVE — a COMMITTED home->browse parks the real #home only at finalize', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onHomeWithBooksForward(h);
    const home = h.$('home');

    const rx = h.window.innerWidth - 2;
    h.touch.start(rx, 300, home);
    h.touch.move(rx - 80, 302); await realSleep(12);     // live, mid-drag
    assert.ok(!home.classList.contains('parked'), 'fixture sanity: still not parked mid-drag');
    h.touch.move(rx - 300, 304); await realSleep(12);
    h.touch.move(60, 306); await realSleep(12);
    h.touch.move(5, 308); await realSleep(12);           // drag the incoming Books fully in → commit
    h.touch.end(2, 308);
    await settle(h); await h.clock.advance(700); await settle(h);

    assert.ok(/commit fwd home→books/.test(settles(h).at(-1) || ''),
      `fixture sanity: the forward swipe must have COMMITTED home->browse — got ${settles(h).at(-1)}`);
    // THE INVARIANT'S OTHER EDGE. A committed home->browse must park #home exactly once
    // finalize runs — never before. A mutation that stops the finalize-time park (or that
    // parks #home in showAppView again) reddens one edge of this same cell.
    assert.ok(home.classList.contains('parked'),
      'a committed home->browse must park the real #home once the gesture finalizes');
  } finally { h.dispose(); }
});

test('HOMESTAYSLIVE — an ABORTED home->browse never parks the real #home at all', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onHomeWithBooksForward(h);
    const home = h.$('home');

    const rx = h.window.innerWidth - 2;
    h.touch.start(rx, 300, home);
    h.touch.move(rx - 80, 302); await realSleep(12);     // live, mid-drag
    h.touch.move(rx - 200, 304); await realSleep(12);
    h.touch.move(rx - 20, 304); await realSleep(12);     // retreat toward the edge → aborts
    h.touch.end(rx - 10, 304);
    await settle(h); await h.clock.advance(700); await settle(h);

    assert.ok(/abort fwd home→books/.test(settles(h).at(-1) || ''),
      `fixture sanity: the forward swipe must have ABORTED — got ${settles(h).at(-1)}`);
    assert.ok(!home.classList.contains('parked'),
      'an aborted home->browse must NOT park the real #home — the reveal returns to the exact '
      + 'starting descriptor (home), and Nav.setView never parks the view it is showing');
  } finally { h.dispose(); }
});
