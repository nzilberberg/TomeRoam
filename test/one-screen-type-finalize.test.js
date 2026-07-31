// STAGE A1 of PLAN-one-screen-type.md — PEERFINALIZE, the GESTURE-FINALIZE half of the RED
// suite. Authored red-first by the test author (2026-07-30) from the plan's §14 Coverage Model,
// BEFORE the Stage-A1 build. Unit half: test/one-screen-type.test.js. Companion note:
// Claude/Curie/RED-one-screen-type.md.
//
// WHY THIS CELL EXISTS, AND WHY IT IS NOT DEFERRABLE (plan §13 BINDING ORDERING; the plan
// review's F2). Stage A1 narrows setView's park-and-hide guard, and that guard runs at EVERY
// gesture finalize, through applyScreen — a path no cell drove before. The A1 device gate
// exercises the button-nav path, which is the path the user reports and the path PEERPARK already
// covers. If this cell were written after the device pass, a device-clean A1 would be read as
// evidence about paths no test ever drove. That is the exact shape of confidence error this
// project's records document: `.106` and `.107` both shipped past a fully green suite because the
// code lived where no test could reach it — which is the stated reason js/nav.js exists behind
// injected deps in the first place.
//
// ALL THREE d.browseWillHide TRIGGER EDGES (plan §9) ARE DRIVEN HERE, through the REAL shipped
// touch listeners:
//   edge 1  button-nav browse→settings — PEERPARK covers the button-nav form; here it is re-driven
//           as a COMMITTED books→options gesture, which is the same edge reached through finalize
//   edge 2  ABORT of a settings→browse gesture — showAppView has already un-hidden and re-rendered
//           #browse mid-drag (js/app.js:496-497), so the aborting setView(settings) hides it again
//           and fires the hook
//   edge 3  closing Now Playing back to a settings screen after an NP→files ABORT left #browse
//           un-hidden — the same new edge on a second path
// A fourth gesture, a COMMITTED home→settings, covers the park half of the guard at finalize.
//
// ⛔ SCOPE, honestly. Every assertion below is CLASS STATE, CALL COUNT or CALL ORDERING. Nothing
// asserts geometry, paint, stacking or occlusion: jsdom has no layout, so such a cell could not
// fail and would be a false witness. The drag GEOMETRY (thresholds, velocity, committed distance)
// is likewise out of scope here, per the standing note in test/app-harness.js — what is in scope
// is the event plumbing and the state the finalize leaves behind.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// SKIPPED-PENDING-BUILD — see the note in test/one-screen-type.test.js. Each cell was CONFIRMED
// RED with the skip removed; the run and its failure text are quoted in
// Claude/Curie/RED-one-screen-type.md. ⭐ THE BUILDER REMOVES `{ skip: SKIP }` to drive it red.
const SKIP = 'skipped-pending-build (Stage A1) — remove the skip to drive this cell red';

// REAL wall clock, captured before boot() patches setTimeout — move() resamples velocity only
// after >8ms of REAL time (the same reason every other swipe suite keeps its own).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }
const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const isHidden = (h, id) => h.$(id).classList.contains('hidden');

/**
 * Replace the harness's recorded Browse.deactivate with one that ALSO records the #browse hidden
 * state at the instant it ran. app.js wires `browseWillHide: () => Browse.deactivate()`
 * (js/app.js:2870), which resolves the global `Browse` at CALL time, so patching the harness's
 * fake after boot sits on the real production path — no test-only export is added to app.js.
 */
function recordDeactivations(h) {
  const rec = { calls: 0, hiddenWhenCalled: [] };
  h.browse.deactivate = () => {
    rec.calls++;
    rec.hiddenWhenCalled.push(isHidden(h, 'browse'));
    h.log.calls.push({ name: 'browse.deactivate', args: [] });
  };
  return rec;
}

/** Commit a left-edge back-swipe (dest = the descriptor under the top of the nav stack). */
async function backSwipeCommit(h) {
  const w = h.window.innerWidth;
  h.touch.start(2, 300, h.document.body);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(400, 304); await realSleep(12);
  h.touch.move(w - 40, 306); await realSleep(12);
  h.touch.end(w - 20, 306);
  await settle(h); await h.clock.advance(700); await settle(h);
}

/** Commit a right-edge forward-swipe (dest = the top of the forward stack). */
async function fwdSwipeCommit(h) {
  const w = h.window.innerWidth;
  h.touch.start(w - 2, 300, h.document.body);
  h.touch.move(w - 90, 302); await realSleep(12);
  h.touch.move(w - 400, 304); await realSleep(12);
  h.touch.move(20, 306); await realSleep(12);
  h.touch.end(5, 306);
  await settle(h); await h.clock.advance(700); await settle(h);
}

test('PEERFINALIZE — a COMMITTED home→settings gesture leaves #home parked at finalize',
  { skip: SKIP }, async () => {
    const h = boot({ fakeTimers: true });
    try {
      await settle(h);
      h.tap('.navbtn[data-nav="options"]'); await settle(h);
      await backSwipeCommit(h);                     // options→home: pops options onto the fwd stack
      assert.match(settles(h).at(-1) || '', /commit back options→home/,
        `fixture sanity: the back-swipe must have committed options→home — got ${settles(h).at(-1)}`);

      await fwdSwipeCommit(h);                      // home→options: the gesture under test
      assert.match(settles(h).at(-1) || '', /commit fwd home→options/,
        `fixture sanity: the forward swipe must be home→options — got ${settles(h).at(-1)}`);

      assert.equal(h.$('home').classList.contains('parked'), true,
        'a committed home→settings gesture must park the real #home at finalize — the narrowed '
        + 'park guard runs through applyScreen on the GESTURE path too, not only on button-nav, '
        + 'and no cell drove it there before');
    } finally { h.dispose(); }
  });

test('PEERFINALIZE — edge 1 at finalize: a COMMITTED browse→settings gesture hides #browse and '
  + 'fires browseWillHide exactly once, while #browse was still un-hidden',
{ skip: SKIP }, async () => {
  const h = boot({ fakeTimers: true });
  try {
    await settle(h);
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    h.tap('.navbtn[data-nav="options"]'); await settle(h);
    await backSwipeCommit(h);                       // options→books: pops options onto the fwd stack
    assert.match(settles(h).at(-1) || '', /commit back options→books/,
      `fixture sanity: the back-swipe must have committed options→books — got ${settles(h).at(-1)}`);
    assert.equal(isHidden(h, 'browse'), false,
      'fixture sanity: #browse is shown on Books before the gesture under test');

    const rec = recordDeactivations(h);
    await fwdSwipeCommit(h);                        // books→options: the gesture under test
    assert.match(settles(h).at(-1) || '', /commit fwd books→options/,
      `fixture sanity: the forward swipe must be books→options — got ${settles(h).at(-1)}`);

    assert.equal(isHidden(h, 'browse'), true,
      'a committed browse→settings gesture must hide #browse at finalize');
    assert.equal(rec.calls, 1,
      'and must fire Browse.deactivate exactly once on that shown→hidden edge');
    assert.deepEqual(rec.hiddenWhenCalled, [false],
      'observed at the moment it ran: #browse must still be un-hidden, so the virtual controller '
      + 'captures its scroll anchor from real geometry');
  } finally { h.dispose(); }
});

test('PEERFINALIZE — edge 2: an ABORTED settings→browse gesture re-hides the #browse that the '
  + 'mid-drag render un-hid, firing browseWillHide once while it was still un-hidden',
{ skip: SKIP }, async () => {
  const h = boot({ fakeTimers: true });
  try {
    await settle(h);
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    h.tap('.navbtn[data-nav="options"]'); await settle(h);
    assert.equal(isHidden(h, 'browse'), true,
      'fixture sanity: after A1, entering Options from Books hides #browse (PEERPARK). Until the '
      + 'build lands this assertion is the cell\'s first red, which is correct — the edge under '
      + 'test does not exist yet');

    const rec = recordDeactivations(h);
    // Left-edge back-swipe options→books, retreated to the edge → ABORT. showAppView has already
    // un-hidden and re-rendered #browse mid-drag (js/app.js:496-497).
    h.touch.start(2, 300, h.document.body);
    h.touch.move(90, 302); await realSleep(12);
    h.touch.move(300, 304); await realSleep(12);
    assert.equal(isHidden(h, 'browse'), false,
      'fixture sanity: the mid-drag destination render must have un-hidden #browse — without '
      + 'that this cell would not be driving edge 2 at all');
    h.touch.move(20, 306); await realSleep(12);
    h.touch.end(8, 306);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.match(settles(h).at(-1) || '', /abort back options→books/,
      `fixture sanity: the back-swipe must have ABORTED — got ${settles(h).at(-1)}`);

    assert.equal(isHidden(h, 'browse'), true,
      'the aborting setView(settings) must hide #browse again — the abort returns to the settings '
      + 'screen, and nothing live may remain behind it');
    assert.equal(rec.calls, 1,
      'and must fire Browse.deactivate exactly once on that edge (plan §9 edge 2 — the edge the '
      + 'plan review found unenumerated and unproven)');
    assert.deepEqual(rec.hiddenWhenCalled, [false],
      'observed at the moment it ran: #browse must still be un-hidden');
  } finally { h.dispose(); }
});

test('PEERFINALIZE — edge 3: closing Now Playing back to a settings screen after an NP→files '
  + 'abort left #browse un-hidden hides it and fires browseWillHide once, while it was still '
  + 'un-hidden', { skip: SKIP }, async () => {
  const h = boot({ fakeTimers: true });
  try {
    await settle(h);
    const tile = h.document.querySelector('[data-book="bookA"] .covertap');
    assert.ok(tile, 'fixture sanity: a real book tile must exist to start playback from');
    tile.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await settle(h);
    h.audio.setBuffered(0, 600); h.audio.reachPlaying(100); await settle(h);

    h.tap('.navbtn[data-nav="options"]'); await settle(h);
    h.tap('#player'); await settle(h);              // open Now Playing over the settings screen
    assert.equal(isHidden(h, 'nowplaying'), false, 'fixture sanity: Now Playing must be open');
    assert.equal(isHidden(h, 'options'), false,
      'fixture sanity: Now Playing must leave the settings screen mounted underneath — that is '
      + 'the retained npOpen exemption NPUNTOUCHED guards');

    // Right-edge forward swipe NP→files, retreated → ABORT. Its mid-drag render un-hides #browse
    // and the abort's setView('nowplaying') deliberately leaves it that way (the retained npOpen
    // exemption), which is what sets edge 3 up.
    const w = h.window.innerWidth;
    h.touch.start(w - 2, 300, h.document.body);
    h.touch.move(w - 90, 302); await realSleep(12);
    h.touch.move(w - 400, 304); await realSleep(12);
    h.touch.move(w - 30, 306); await realSleep(12);
    h.touch.end(w - 10, 306);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.match(settles(h).at(-1) || '', /abort fwd nowplaying→files/,
      `fixture sanity: the NP→files swipe must have ABORTED — got ${settles(h).at(-1)}`);
    assert.equal(isHidden(h, 'browse'), false,
      'fixture sanity: the NP→files abort must leave #browse un-hidden — that residue is '
      + 'precisely what edge 3 is about');

    const rec = recordDeactivations(h);
    await backSwipeCommit(h);                       // nowplaying→options: the gesture under test
    assert.match(settles(h).at(-1) || '', /commit back nowplaying→options/,
      `fixture sanity: the back-swipe must have committed nowplaying→options — got ${settles(h).at(-1)}`);

    assert.equal(isHidden(h, 'browse'), true,
      'closing Now Playing back to a settings screen must hide the #browse the NP→files abort '
      + 'left un-hidden. A1 REMOVES this pre-existing residue rather than adding one (plan §13): '
      + 'at HEAD that #browse stays live behind the settings screen, covered only by its opaque '
      + 'background — the very background A1 deletes');
    assert.equal(rec.calls, 1,
      'and must fire Browse.deactivate exactly once on that edge (plan §9 edge 3)');
    assert.deepEqual(rec.hiddenWhenCalled, [false],
      'observed at the moment it ran: #browse must still be un-hidden');
  } finally { h.dispose(); }
});
