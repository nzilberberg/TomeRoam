// STAGE 6g of PLAN-swipe-reveal.md (sub-plan Claude/Plans/PLAN-swipe-stage6g.md) — the
// behavioural cell REVEAL. See Claude/Curie/RED-swipe-stage6g.md.
//
// WHAT 6g CHANGES (recap). Keep #home a stable compositing layer through the reveal so
// removing `.parked` on the un-park path cannot demote it → eliminates the device-confirmed
// home→books ABORT flash (build .256 A/B). The production edit is a single css/app.css rule
// (pinned by the source-text cell PROMO in test/home-layer-invariant.test.js).
//
// THIS CELL (plan §8 REVEAL). An INTEGRATION check on the REAL app-harness reveal path. It
// pins that the transition the permanent promotion protects — the parked→un-parked un-park of
// #home — GENUINELY OCCURS on the real reveal path: driving a real home→books ABORT snap-back
// through `h.touch`, #home carries `.parked` DURING the drag and does NOT carry it AFTER the
// reveal (the un-park is real). It proves the reveal IS the protected transition.
//
// ⚠️ WHAT THIS DOES NOT PROVE (honestly, plan §3/§8). It does NOT prove compositing, layer
// promotion, or the flash — jsdom has no layout/compositor, so nothing here observes the
// demote or the repaint. That the un-park demote WAS the flash, and that keeping the layer
// stable eliminates it, is device-only (the .256 A/B; re-verified on device after ship,
// plan §9). This cell pins the DOM CLASS-STATE transition the CSS fix depends on, nothing more.
//
// PARITY, stated plainly (tests-must-be-able-to-fail). The un-park already exists at HEAD
// (setView('home') removes `.parked`, nav.js:57; showAppView removes it, app.js:482), so this
// cell is GREEN @HEAD — it is a PARITY guard, not red-first. It is MUTATION-PROVEN capable of
// failing: neutralising the un-park (making the reveal leave `.parked` on #home) reddens the
// after-reveal assertion. That mutation was run and confirmed by Curie (temporary, reverted —
// RED-swipe-stage6g.md); its permanent registration under the behavioural sweep is Brunel's
// §9 apply-on-approval obligation. The non-vacuity is intrinsic: the DURING-drag assertion
// (`.parked` present) proves the after assertion is pinning a real parked→un-parked transition,
// not a #home that was never parked.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// REAL wall clock, captured before boot() patches setTimeout. move() resamples velocity only
// after >8ms of REAL time; synthetic moves fired back-to-back otherwise leave vx holding the
// outward flick and a gesture meant to abort commits instead (stage-6 note).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const parked = (h) => h.$('home').classList.contains('parked');

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

// ── REVEAL (parity, mutation-proven) — a real home→books ABORT reveal un-parks #home ────────
// The .256 device scenario, driven through the real harness path. Setup mirrors
// swipe-stage6d.test.js AB.noclobber-home: COMMIT a back-swipe Books→Home first, so
// currentDesc()==='home' with the books descriptor on the forward stack; then a right-edge
// FORWARD swipe is home→books. Retreating toward the edge aborts it, snapping back to home —
// the reveal that removes `.parked` from #home (applyScreen({v:'home'}) → setView).
test('REVEAL — a real home→books ABORT reveal un-parks #home (carried .parked during the drag; not after)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await settle(h);

    // COMMIT a back-swipe Books→Home so home becomes current with books on the forward stack.
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    const backRow = addRow(h);
    h.touch.start(10, 300, backRow);
    h.touch.move(80, 302); await realSleep(12);
    h.touch.move(300, 304); await realSleep(12);
    h.touch.move(700, 306); await realSleep(12);
    h.touch.move(950, 308); await realSleep(12);   // drag Home fully in → commit
    h.touch.end(980, 308);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.ok(/commit back books→home/.test(settles(h).at(-1) || ''),
      `fixture sanity: the back-swipe committed Books→Home — got ${settles(h).at(-1)}`);
    assert.ok(!parked(h), 'fixture sanity: after landing on Home, #home is un-parked (the active view)');

    // FORWARD swipe home→books from the RIGHT edge, then ABORT (retreat toward the edge).
    const rx = h.window.innerWidth - 2;
    h.touch.start(rx, 300, h.$('home'));
    h.touch.move(rx - 80, 302); await realSleep(12);   // horizontal, past the 8px lock → live
    const parkedDuringDrag = parked(h);                 // #home is parked while books is the incoming view
    h.touch.move(rx - 200, 304); await realSleep(12);
    h.touch.move(rx - 20, 304); await realSleep(12);    // retreat → aborts back to Home
    h.touch.end(rx - 10, 304);
    await settle(h); await h.clock.advance(700); await settle(h);

    assert.ok(/abort fwd home→books/.test(settles(h).at(-1) || ''),
      `fixture sanity: the forward swipe was home→books and aborted — got ${settles(h).at(-1)}`);
    // NON-VACUITY: the reveal must be a real parked→un-parked transition. #home was parked
    // mid-drag (books was the incoming in-flow view, so showAppView parked #home).
    assert.ok(parkedDuringDrag,
      'fixture sanity: #home carried `.parked` during the home→books drag — the un-park at the reveal is '
      + 'a real parked→un-parked transition, not a #home that was never parked');
    // THE CELL: the abort reveal un-parks #home. This is the transition the permanent compositing
    // promotion (PROMO) must survive without demoting the layer. A mutation that makes the reveal
    // leave `.parked` on #home reddens here (mutation-proven, RED-swipe-stage6g.md).
    assert.ok(!parked(h),
      'a home→books ABORT reveal must un-park #home (remove `.parked`) — this is the un-park the permanent '
      + 'compositing promotion protects. #home still carries `.parked` after the reveal.');
  } finally { h.dispose(); }
});
