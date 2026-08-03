// STAGE A1b of PLAN-one-screen-type.md — NPRECONCILE, the INTEGRATION half of the Stage-A1b RED
// suite. Authored red-first by the test author (2026-07-31) from the plan's §14 Coverage Model and
// §5.3.1 design, BEFORE the Stage-A1b build (red-first TDD law,
// Claude/Decisions/DecisionLog.md). The unit half is test/one-screen-type-npparks.test.js.
// Companion note: Claude/Curie/RED-one-screen-type-a1b.md. Plan step 7; the build is step 8.
//
// THE DEFECT THIS CELL REPRODUCES (plan §5.3.1) — and it is the mechanism behind the render the
// user photographed, not a theory about it. During a Now Playing gesture the destination is
// materialised mid-drag: js/app.js:547 removes `parked` from #home, js/app.js:512 removes
// `hidden` from #browse, js/app.js:551 removes `hidden` from a settings overlay. On ABORT,
// finalize calls applyScreen(currentDesc()) — which for a Now Playing source is
// setView('nowplaying') — and at HEAD BOTH of setView's `if (!npOpen)` blocks are skipped, so
// NOTHING IS PUT BACK. Each aborted NP gesture therefore leaves one more screen un-hidden
// beneath Now Playing, and they ACCUMULATE across gestures:
//
//   1. On Home, open NP. Swipe NP→back; renderDestination un-parks #home. Abort. #home is now
//      permanently un-parked beneath NP.
//   2. Swipe NP→forward (the chapter list); showAppView un-hides #browse. Abort. #browse is now
//      also un-hidden.
//
// Three or four mutually-transparent screens, exactly as photographed — NP's own opaque
// background hides all of it AT REST, which is why the screenshots are mid-swipe, when NP has
// translated away and uncovered the stack.
//
// WHAT A1b DOES ABOUT IT (plan §5.3.3). Deleting the two guards makes the abort's own
// applyScreen('nowplaying') re-park and re-hide whatever the gesture un-hid. The accumulation
// becomes impossible BY CONSTRUCTION rather than by nobody exercising it.
//
// ⛔ SCOPE, honestly. jsdom has no layout, no paint, no compositing and no stacking. This cell
// asserts ONE thing: the SET of screen elements left without `hidden` and without `parked` after
// an aborted Now Playing gesture — pure class state, and the mechanism behind the defect. It does
// NOT assert that fewer screens are visible, that NP covers anything, or that nothing shows
// through; those are paint, a cell about them could not fail here, and it would be a false
// witness. The outcome the user reported is DEVICE-OWED and is plan step 9's job.
//
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// REAL wall clock, captured before boot() patches setTimeout — app.js's move() resamples velocity
// only after >8ms of REAL time, so back-to-back synthetic moves leave vx holding the wrong sign
// and a gesture meant to abort commits instead. (Same reason every other swipe suite keeps one.)
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }
const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const isHidden = (h, id) => h.$(id).classList.contains('hidden');

// Every screen element BESIDES #nowplaying. A screen is "live" when it carries neither `hidden`
// (display:none) nor `parked` (off-screen but painted) — i.e. it is mounted in the layout beneath
// Now Playing. `parked` is counted as not-live deliberately: parking is the state the plan calls
// correct for #home under NP, and the defect is screens left in NEITHER state.
const SCREENS = ['home', 'browse', 'options', 'general', 'playback', 'buffering', 'downloads',
  'diagnostics'];
const liveBeneathNP = (h) => SCREENS.filter((id) => {
  const c = h.$(id).classList;
  return !c.contains('hidden') && !c.contains('parked');
});

/** Start playback so the transport exists (the tap target that opens Now Playing). */
async function startPlayback(h) {
  await settle(h);
  const tile = h.document.querySelector('[data-book="bookA"] .covertap');
  assert.ok(tile, 'fixture sanity: a real book tile must exist to start playback from');
  tile.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(h);
  h.audio.setBuffered(0, 600); h.audio.reachPlaying(100); await settle(h);
}

/** Open a book so the transport exists, then open Now Playing from Home by tapping it. */
async function homeThenNowPlaying(h) {
  await startPlayback(h);
  h.tap('#player'); await settle(h);
  assert.equal(isHidden(h, 'nowplaying'), false, 'fixture sanity: Now Playing must be open');
}

test('NPRECONCILE — an aborted Now Playing gesture reconciles what the gesture un-hid, so screens '
  + 'cannot accumulate beneath Now Playing across repeated aborts',
async () => {
  const h = boot({ fakeTimers: true });
  try {
    await homeThenNowPlaying(h);

    // The entry state is an INSTRUMENT READING here, not an assertion. What Now Playing's entry
    // leaves mounted beneath it is NPPARKS's subject and is asserted there; this cell's subject is
    // what repeated ABORTS do to that set. Reading it rather than asserting it is what makes this
    // cell fail for its OWN reason: pinned to `[]` it would halt on the entry invariant and never
    // drive a gesture at all, marking the accumulation swept on every future skim.
    const entry = liveBeneathNP(h);

    // ── ABORT 1 — the back-swipe NP→home. renderDestination un-parks #home mid-drag. ──────────
    h.touch.start(2, 300, h.document.body);
    h.touch.move(90, 302); await realSleep(12);
    h.touch.move(300, 304); await realSleep(12);
    assert.equal(h.$('home').classList.contains('parked'), false,
      'fixture sanity: the mid-drag destination render must have UN-PARKED #home — without that '
      + 'this cell would not be driving the accumulation at all (js/app.js:547)');
    h.touch.move(20, 306); await realSleep(12);
    h.touch.end(8, 306);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.match(settles(h).at(-1) || '', /abort back nowplaying→home/,
      `fixture sanity: the back-swipe must have ABORTED — got ${settles(h).at(-1)}`);

    const after1 = liveBeneathNP(h);

    // ⭐ THE ABSOLUTE HALF (coverage-audit gap G1, Claude/Mendeleev/AUDIT-one-screen-type-a1b.md).
    // The `after1 === entry` assertion below is RELATIVE, and a relative assertion cannot fail
    // when the defect is present AT ENTRY TOO, because the defective entry moves the baseline with
    // it: with the park toggle re-guarded on `npOpen`, NP entry leaves #home un-parked, so
    // `entry` is ['home'], abort 1 un-parks an already-un-parked #home, and `after1 === entry`
    // holds. MEASURED: at the audit, mutant "one-screen-type NPPARKS-a" had exactly ONE killer
    // (NPPARKS from Home) and this cell passed under it. So the ONLY cell that drives
    // applyScreen('nowplaying') on a gesture-finalize path proved the #browse re-hide and nothing
    // else, and step 1 of the accumulation narrative quoted in this file's own header — the #home
    // RE-PARK — was proven on the button-nav path only. That is the exact shape of gap
    // PEERFINALIZE was written to close for Stage A1 ("a change to this guard that is proven only
    // on the button-nav path is the same shape of gap"), re-created on the NP path.
    //
    // This assertion is ABSOLUTE and therefore immune to a moved baseline. It cannot halt the cell
    // early for the reason the relative form was chosen: it runs AFTER a gesture has been driven,
    // so it cannot stop the cell reaching a gesture. The relative growth assertions are unchanged;
    // this is purely additive.
    assert.equal(h.$('home').classList.contains('parked'), true,
      'THE DEFECT, step 1, ABSOLUTELY (plan §5.3.1 step 1): the aborted NP→home gesture\'s own '
      + 'finalize ran applyScreen(currentDesc()) = setView(\'nowplaying\'), and setView must '
      + 'RE-PARK the #home its own mid-drag render un-parked (asserted un-parked as fixture '
      + 'sanity above). An un-parked #home under Now Playing is a screen left mounted in the '
      + 'layout beneath it — the residue that accumulates across repeated aborted NP gestures. '
      + 'This is asserted against the CONSTANT `true`, not against the entry reading, because a '
      + 'relative assertion is blind whenever Now Playing\'s ENTRY already failed to park it.');

    assert.deepEqual(after1, entry,
      'THE DEFECT, step 1 (plan §5.3.1): the abort\'s finalize ran applyScreen(currentDesc()) = '
      + 'setView(\'nowplaying\'), and at HEAD its `if (!npOpen)` guard skips the park-and-hide '
      + 'block — so the #home the drag un-parked is never re-parked. An aborted gesture must '
      + 'restore the state its finalize claims to reconcile, leaving the set exactly as Now '
      + `Playing's entry left it — entry [${entry.join(', ')}], after abort 1 `
      + `[${after1.join(', ')}].`);

    // ── ABORT 2 — the forward-swipe NP→chapter list. showAppView un-hides #browse mid-drag. ────
    const w = h.window.innerWidth;
    h.touch.start(w - 2, 300, h.document.body);
    h.touch.move(w - 90, 302); await realSleep(12);
    h.touch.move(w - 400, 304); await realSleep(12);
    assert.equal(isHidden(h, 'browse'), false,
      'fixture sanity: the mid-drag destination render must have UN-HIDDEN #browse '
      + '(js/app.js:512) — that residue is what the second abort has to put back');
    h.touch.move(w - 30, 306); await realSleep(12);
    h.touch.end(w - 10, 306);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.match(settles(h).at(-1) || '', /abort fwd nowplaying→files/,
      `fixture sanity: the forward swipe must have ABORTED — got ${settles(h).at(-1)}`);

    const after2 = liveBeneathNP(h);
    assert.deepEqual(after2, entry,
      'THE DEFECT, step 2, and THE ACCUMULATION this cell is named for (plan §5.3.1): the same '
      + 'skipped block leaves the #browse the second drag un-hid mounted as well, so a SECOND '
      + 'screen joins the first beneath Now Playing and the set GROWS with every aborted NP '
      + `gesture — entry [${entry.join(', ')}], after abort 1 [${after1.join(', ')}], after abort `
      + `2 [${after2.join(', ')}]. That growth across gestures IS the three-plus-screens render, `
      + 'and it is why the defect appeared only after several swipes rather than on the first. '
      + 'Repeated aborts must leave the set exactly where Now Playing\'s entry left it.');
  } finally { h.dispose(); }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// NPRECONCILE — THE SETTINGS AXIS (coverage-audit gap G1, companion cell)
//
// The cell above drives Now Playing from HOME, so the two screens it can put back are #home (the
// park toggle) and #browse (the browse-hide toggle). The SIX-WAY SETTINGS LOOP — the third
// statement A1b un-guarded, and the one the ratified-mark supersession turns on (plan §5.3, probe
// §9.1) — is reachable only from a settings source, and at the audit NO cell drove it on a
// finalize path: mutant "one-screen-type NPPARKS-b" was killed by test/nav.test.js and by NPPARKS
// from a settings screen, both button-nav cells, and this file passed under it.
//
// ⚠️ THE DIRECTION MATTERS, AND ONLY ONE OF THE TWO WORKS. The forward NP→chapter-list abort
// CANNOT witness this: its mid-drag showAppView (js/app.js:522) hides every settings overlay that
// is not the gesture's own source, so #options ends up hidden by app.js whatever setView does, and
// the assertion would pass under a re-guarded loop — a cell green for a reason that has nothing to
// do with its claim. The BACK swipe NP→options is the one that works: its mid-drag
// renderDestination UN-HIDES #options (js/app.js:551), so the abort's own
// applyScreen('nowplaying') is the only thing that can put it back.
//
// ⛔ SCOPE: identical to the cell above. Class state only; nothing here asserts paint, occlusion
// or stacking, which jsdom cannot fail on.
// ═══════════════════════════════════════════════════════════════════════════════════════
test('NPRECONCILE — an aborted Now Playing gesture re-hides the settings screen its own mid-drag '
  + 'render un-hid, absolutely', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await startPlayback(h);
    h.tap('.navbtn[data-nav="options"]'); await settle(h);
    assert.equal(isHidden(h, 'options'), false, 'fixture sanity: the Options hub is the shown screen');

    h.tap('#player'); await settle(h);               // open Now Playing over the settings screen
    assert.equal(isHidden(h, 'nowplaying'), false, 'fixture sanity: Now Playing must be open');
    // What NP's ENTRY does to the settings screen it opened over is NPPARKS's subject and is
    // deliberately not re-asserted here — this cell's subject is what the ABORT does, and pinning
    // the entry would make it halt on another cell's claim before driving a gesture.

    // ── THE ABORT — the back-swipe NP→options. renderDestination un-hides #options mid-drag. ──
    h.touch.start(2, 300, h.document.body);
    h.touch.move(90, 302); await realSleep(12);
    h.touch.move(300, 304); await realSleep(12);
    assert.equal(isHidden(h, 'options'), false,
      'fixture sanity: the mid-drag destination render must have UN-HIDDEN #options '
      + '(js/app.js:551) — without that this cell is not driving the settings axis at all');
    h.touch.move(20, 306); await realSleep(12);
    h.touch.end(8, 306);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.match(settles(h).at(-1) || '', /abort back nowplaying→options/,
      `fixture sanity: the back-swipe must have ABORTED — got ${settles(h).at(-1)}`);

    assert.equal(isHidden(h, 'options'), true,
      'THE SETTINGS AXIS of the abort reconcile (plan §5.3.1, §5.3.3): the abort\'s own '
      + 'applyScreen(currentDesc()) = setView(\'nowplaying\') must re-hide the settings screen its '
      + 'own mid-drag render un-hid, through the SAME six-way loop that hides it on a button nav. '
      + 'The exemption A1b deleted (the `if (!npOpen)` guard on that loop) is what left it mounted '
      + 'beneath Now Playing, and its stated ground — that the NP-back reveal needs the screen '
      + 'kept mounted — is refuted at its root: `hidden` is added to #nowplaying in exactly one '
      + 'place and the same synchronous setView body un-hides the destination two lines earlier. '
      + 'Asserted against the CONSTANT `true`: a comparison against the entry state cannot fail '
      + 'when the entry itself failed to hide it.');
    assert.equal(isHidden(h, 'nowplaying'), false,
      'and Now Playing is still the shown screen — the gesture ABORTED, so the reconcile put the '
      + 'world back to Now Playing rather than completing a navigation');
  } finally { h.dispose(); }
});
