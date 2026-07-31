// STAGE A1-fix of PLAN-one-screen-type.md — the FILMSTRIPDRAG cell, authored red-first by the
// test author (2026-07-31) from the plan's §14 Coverage Model and §5.4 design, BEFORE the
// Stage-A1-fix build (red-first TDD law, Claude/Decisions/DecisionLog.md). Companion note:
// Claude/Curie/RED-one-screen-type-filmstrip.md. Plan step 6a; the build is step 6b.
//
// THE SHIPPED DEFECT THIS CELL REPRODUCES (plan §5.4; the A1 code review's F1). js/nav.js:102
// claims "Safe because applyScreen is NEVER called during an active drag." That is false.
// Nav.overlayFilmstrip schedules its reconcile TWICE — a `transitionend` listener and a
// setTimeout(finish, 340) safety net (js/nav.js:182-183) — and cancels NEITHER when a gesture
// arms. `finish` → `reconcile` → `applyScreen(currentDesc(), {render:false})`, whose first act is
// resetSwipeStyles and whose second is setView.
//
// Stage A1 changed what that costs. Before A1, setView('options') did not touch #browse; after A1
// its narrowed park guard hides it. So a reconcile landing mid-drag now gives #browse — THE
// INCOMING MOVER THE USER IS DRAGGING TOWARD — the `hidden` class, and nothing re-un-hides it for
// the rest of the gesture, because only a `move` re-applies transforms. The user drags, the
// destination never arrives, and it snaps in at release. Reachable by one impatient thumb: tap
// ‹ Back on a settings sub-screen and edge-swipe inside the ~240-340ms filmstrip window.
//
// THE INVARIANT THE FIX MUST SATISFY (plan §5.4): a pending overlayFilmstrip reconcile must not
// change the visibility or the transform of an element that a live gesture owns as a mover.
//
// ⚠️ THE TRAP THE SECOND CELL EXISTS FOR — CANCEL AT GO-LIVE, NEVER AT ARM (plan §5.4, §14
// mutant NATURAL-b). Skipping the reconcile is safe only because the gesture's own finalize
// applyScreen is a superset of it. That superset does NOT exist for a gesture that ARMS and never
// locks: end() returns at `if (!cur.live)` (js/app.js:611) WITHOUT calling applyScreen. So a fix
// that suppresses (or cancels) the pending reconcile on the ARMED state strands the filmstrip
// mid-transform with nothing scheduled to clear it — a settings sub-screen left un-hidden and
// still carrying an inline translateX. The second cell drives exactly that window and is the
// reason a too-eager fix is caught here rather than shipped.
//
// ⛔ SCOPE, honestly. jsdom has no layout, no paint, no compositing and no stacking. EVERY
// assertion below is class state, inline-style presence, a call ordering or a fixture-sanity
// observation of the same kind. NOT ONE asserts that anything is visually hidden, that the
// destination "appears", that a screen occludes what is behind it, or that a drag looks smooth —
// such a cell could not fail here and would be a false witness. The user-visible outcome (the
// destination tracks the finger for the whole drag instead of appearing only at release) is
// device-owed and is plan step 6c's job, not CI's.
//
// ⭐ WINDOW THREE (added 2026-07-31 by the test author after the adversary's KILL,
// Claude/Loki/STRIKE-one-screen-type.md; companion note Claude/Curie/RED-one-screen-type-settle.md).
// The two cells above pin the LIVE window and the ARMED window. They do not pin the SETTLE window,
// and the shipped `.282` fix does not cover it: its predicate is `gestureLive() = !!d && d.live`
// (js/app.js:213) and `d` is NULLED at end() (js/app.js:618) while `session` still owns and animates
// the movers through settle → finalize (js/app.js:216-226). So a pending reconcile that fires after
// finger-up but before finalize is NOT suppressed: it runs applyScreen('options'), the committed
// destination #browse goes hidden mid-snap, the source snaps back, resetSwipeStyles destroys the
// settle animation (killing the transitionend finalize), and the destination is restored only by the
// 340ms fallback — hidden→shown with no gesture. The third cell drives exactly that window.
//
// THE CORRECTED INVARIANT (plan §5.4, restated on the right lifetime; §5.4a derives why the first
// one failed): a pending overlayFilmstrip reconcile must not change the visibility or the transform
// of an element a gesture SESSION owns as a mover, for the WHOLE of that ownership — beginning when
// the gesture goes LIVE and ending when the session releases at finalize or reveal-drop, NOT when
// the drag handle is nulled at finger-up. The predicate that coincides with those two boundaries is
// `!!session && session.live` (plan §5.4's boundary table). `!!session` ALONE is the wrong repair —
// it suppresses during the armed phase, which the second cell above exists to redden.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// SKIP-PENDING-BUILD for the THIRD cell only. The first two are green at HEAD and stay unskipped;
// the third is RED at HEAD `.282` for the settle-window gap, so it carries a skip to keep the
// pre-commit battery green (this project does not use --no-verify). The builder removes the skip at
// step r2b, confirms it is red, and builds to green. No assertion may be weakened to green it.
const SKIP_SETTLE = 'SKIP-PENDING-BUILD — RED at build .282 until the A1-fix predicate is re-scoped '
  + 'from drag liveness (!!d && d.live) to SESSION ownership (!!session && session.live), plan '
  + '§5.4/§5.4a step r2b. Claude/Curie/RED-one-screen-type-settle.md';

// RED-FIRST. The live-drag cell failed at HEAD for the defect above (confirmed red by the test
// author, Claude/Curie/RED-one-screen-type-filmstrip.md) before overlayFilmstrip's reconcile was
// made a no-op while a gesture session is live (plan §5.4 / step 6b). No assertion was weakened
// to green it.

// REAL wall clock, captured before boot() patches setTimeout — app.js's move() resamples velocity
// only after >8ms of REAL time, so back-to-back synthetic moves leave vx holding the wrong sign.
// (Same reason every other swipe suite keeps its own.)
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const hasClass = (h, id, cls) => h.$(id).classList.contains(cls);
const inlineTransform = (h, id) => h.$(id).style.transform;
const filmstripNets = (h) => h.clock.pendingDump().filter((t) => t.ms === 340);

/**
 * Drive the app to a settings SUB-screen over Books, through production paths only, and leave the
 * back-filmstrip's reconcile PENDING.
 *
 * Books → Options (bottom-nav) → Diagnostics (the real .hubrow[data-sub] button, which
 * options-screen.js wires to app.js's openSub) → ‹ Back (#dgBack, which app.js wires straight to
 * closeSub). closeSub pops the stack BEFORE calling Nav.overlayFilmstrip(fromV,'options','back'),
 * so currentDesc() is already 'options' and navStack[-2] is the Books descriptor — which is what
 * makes a left-edge back-swipe in this window head for a BROWSE destination.
 *
 * The forward filmstrip's own 340ms net is retired first, so the only pending reconcile when the
 * gesture starts is the one under test. jsdom fires no transitionend, so the net is the sole
 * scheduler here — that is the slower of the two real paths, not an artificial one.
 */
async function toSubThenBack(h) {
  await settle(h);
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="options"]'); await settle(h);
  const row = h.document.querySelector('.hubrow[data-sub="diagnostics"]');
  assert.ok(row, 'fixture sanity: the REAL Options hub must be wired (boot opts.realOptions) — '
    + 'without it there is no production path into a sub-screen and no closeSub filmstrip to test');
  row.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(h);
  await h.clock.advance(400); await settle(h);        // retire the FORWARD filmstrip's net
  assert.deepEqual(filmstripNets(h), [],
    'fixture sanity: the forward filmstrip must have landed, so the only pending 340ms net below '
    + 'is the back filmstrip\'s');
  assert.equal(hasClass(h, 'diagnostics', 'hidden'), false,
    'fixture sanity: the sub-screen must be the shown screen before ‹ Back');

  h.tap('#dgBack'); await settle(h);
  assert.equal(filmstripNets(h).length, 1,
    'fixture sanity: closeSub must have scheduled exactly one pending overlayFilmstrip reconcile — '
    + 'this cell is about what that reconcile does when it lands');
  assert.equal(hasClass(h, 'options', 'hidden'), false,
    'fixture sanity: the filmstrip un-hides BOTH panes for the slide');
  assert.equal(hasClass(h, 'diagnostics', 'hidden'), false,
    'fixture sanity: the filmstrip un-hides BOTH panes for the slide');
}

test('FILMSTRIPDRAG — a pending overlayFilmstrip reconcile must not hide the INCOMING MOVER of a '
  + 'live gesture: #browse stays un-hidden and transformed with the finger still down',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await toSubThenBack(h);

    // The impatient thumb: a left-edge back-swipe started INSIDE the filmstrip window. dest is
    // navStack[-2] = the Books descriptor, so the transition renders into the browse host and
    // #browse becomes the incoming mover (base -w).
    h.touch.start(2, 300, h.document.body);
    h.touch.move(80, 302); await realSleep(12);
    h.touch.move(260, 304); await realSleep(12);

    assert.ok(swipeLog(h).some((m) => /^start back options→books/.test(m)),
      `fixture sanity: the gesture must have gone LIVE toward a browse destination — got ${JSON.stringify(swipeLog(h))}`);
    assert.equal(hasClass(h, 'browse', 'hidden'), false,
      'fixture sanity: the mid-drag destination render un-hides #browse as the incoming mover');
    assert.notEqual(inlineTransform(h, 'browse'), '',
      'fixture sanity: the incoming mover carries the drag\'s inline transform');

    // The pending reconcile lands. FINGER STILL DOWN — no touchend, no touchcancel.
    await h.clock.advance(400); await settle(h);

    assert.equal(hasClass(h, 'browse', 'hidden'), false,
      'THE DEFECT (plan §5.4 / review F1): the pending overlayFilmstrip reconcile ran '
      + 'applyScreen → setView(\'options\'), and A1\'s narrowed park guard gave the INCOMING '
      + 'MOVER #browse the `hidden` class in the middle of the drag. A pending reconcile must not '
      + 'change the visibility of an element a live gesture owns as a mover.');
    assert.notEqual(inlineTransform(h, 'browse'), '',
      'and must not clear the incoming mover\'s inline transform either — resetSwipeStyles is '
      + 'applyScreen\'s first act, and it wipes the transform the drag is driving');

    // And it must STAY true across a further move: only a `move` re-applies transforms, so a
    // build that merely lets the next move paper over the transform still leaves the element
    // display:none for the rest of the gesture. This is the assertion that separates the two.
    h.touch.move(340, 306); await realSleep(12);
    assert.equal(hasClass(h, 'browse', 'hidden'), false,
      'and it must still be un-hidden after a further move — nothing in the drag loop ever '
      + 're-un-hides a mover, so a reconcile that hid it hides it for the rest of the gesture');
    assert.notEqual(inlineTransform(h, 'browse'), '',
      'and must still carry the drag transform after that move');
  } finally { h.dispose(); }
});

test('FILMSTRIPDRAG — the ARM-vs-LIVE trap: a gesture that arms and never locks releases without '
  + 'applyScreen, so the pending reconcile must still run and clear the filmstrip', async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await toSubThenBack(h);

    // ARM ONLY. A left-edge touchstart builds the session with live:false; the 2px move stays
    // under the 8px lock threshold so start() is never called.
    h.touch.start(2, 300, h.document.body);
    const sub = h.touch.move(4, 301);
    assert.equal(sub.defaultPrevented, true,
      'fixture sanity: the gesture must really be ARMED — app.js\'s move() calls preventDefault '
      + 'on an armed session before returning under the lock threshold, so a NON-prevented move '
      + 'would mean begin() rejected and this cell was driving no gesture at all');
    assert.equal(swipeLog(h).some((m) => /^start /.test(m)), false,
      'fixture sanity: and it must NOT have gone live — start() logs, and this window is '
      + 'precisely the armed-but-not-live one');

    // The net fires DURING the armed window — the exact moment a fix that keys on "armed"
    // instead of "live", or that cancels at begin() instead of at start(), throws the
    // reconcile away.
    await h.clock.advance(400); await settle(h);

    // Release. end() takes `if (!cur.live) { sessionDone(cur); return; }` — no applyScreen, so
    // nothing else will ever discharge the filmstrip's reconciliation duty.
    h.touch.end(2, 300);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.equal(swipeLog(h).some((m) => /(abort|commit) /.test(m)), false,
      'fixture sanity: an armed-only gesture settles nothing, which is WHY the reconcile it '
      + 'displaced cannot be recovered from the finalize path');

    assert.equal(inlineTransform(h, 'diagnostics'), '',
      'THE TRAP (plan §5.4): the pending reconcile is the ONLY thing scheduled to clear the '
      + 'filmstrip, because an armed-and-released gesture never reaches applyScreen. A fix that '
      + 'suppresses it at ARM strands the outgoing pane holding an inline translateX forever.');
    assert.equal(hasClass(h, 'diagnostics', 'hidden'), true,
      'and strands the sub-screen un-hidden beside the hub it filmstripped back to');
    assert.equal(inlineTransform(h, 'options'), '',
      'the incoming pane must be cleared too — resetSwipeStyles clears both, and a fix that '
      + 'skips the reconcile skips both');
    assert.equal(hasClass(h, 'options', 'hidden'), false,
      'and the hub, which is where closeSub navigated, must be the shown screen');
  } finally { h.dispose(); }
});

/**
 * An ordered LEDGER of one element's `hidden` state across a window, built from real class-attribute
 * mutations rather than from point samples.
 *
 * Why not just sample: the defect's signature is a FLIP (hidden→shown) that self-heals inside the
 * window, and a pair of samples taken either side of it would read identical and prove nothing. A
 * MutationObserver with attributeOldValue records every class write in order, so the flip is caught
 * wherever it lands. `takeRecords()` is drained synchronously by the test — no delivery-timing
 * dependence.
 *
 * Still pure class state: the ledger is a list of booleans read off `class` strings. It says nothing
 * about layout, paint, compositing or what the screen looks like — jsdom has none of those.
 */
function hiddenLedger(h, id) {
  const el = h.$(id);
  const has = (cls) => String(cls || '').split(/\s+/).includes('hidden');
  const seq = [el.classList.contains('hidden')];
  const obs = new h.window.MutationObserver(() => {});
  obs.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  return {
    /** Fold every class write since the last drain into the ledger, in order. */
    drain() {
      const recs = obs.takeRecords();
      for (let i = 0; i < recs.length; i++) {
        // The state AFTER record i is the oldValue of record i+1, and for the last record it is the
        // element's current state. That reconstruction is exact and needs no extra instrumentation.
        seq.push(i + 1 < recs.length ? has(recs[i + 1].oldValue) : el.classList.contains('hidden'));
      }
      return seq.slice();
    },
    disconnect() { obs.disconnect(); },
  };
}

/**
 * Drive a COMMITTED left-edge back-flick toward Books, released `gapMs` of VIRTUAL time after the
 * ‹ Back tap, and return with the settle running and the finalize still pending.
 *
 * `gapMs` is the release timing the cell is about — it separates the filmstrip's 340ms net from the
 * settle's own 340ms fallback finalize so the two sit at DIFFERENT dues, which is the virtual image
 * of "the user tapped Back, then flicked, then let go" on a device. The moves consume REAL time
 * only (realSleep), so virtual time does not advance between the arm and the release.
 */
async function flickBackToBooks(h, gapMs) {
  if (gapMs) { await h.clock.advance(gapMs); await settle(h); }
  h.touch.start(2, 300, h.document.body);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(260, 304); await realSleep(12);
  h.touch.move(500, 306); await realSleep(12);          // dx≈498 of w=1024 → prog≈0.49 > THRESH → COMMIT
  assert.ok(swipeLog(h).some((m) => /^start back options→books/.test(m)),
    `fixture sanity: the gesture must have gone LIVE toward a browse destination — got ${JSON.stringify(swipeLog(h))}`);
  assert.equal(hasClass(h, 'browse', 'hidden'), false,
    'fixture sanity: the mid-drag destination render un-hid #browse as the incoming mover');
  assert.notEqual(inlineTransform(h, 'browse'), '',
    'fixture sanity: the incoming mover carries the drag\'s inline transform before release');
  h.touch.end(500, 306); await settle(h);               // RELEASED. Settle animating; finalize pending.
  const s = h.window.PBSwipeSession();
  assert.ok(s && !s.dragging,
    'fixture sanity: post-release the SESSION must still own the movers while the DRAG HANDLE is '
    + 'gone (js/app.js:618 nulls `d`; sessionDone runs only at finalize) — that asymmetry IS the '
    + 'window this cell drives, and without it the cell would not be inside it');
}

test('FILMSTRIPDRAG — the SETTLE window: a pending overlayFilmstrip reconcile that fires after '
  + 'finger-up but before finalize must not hide or un-transform the COMMITTED movers the session '
  + 'still owns, and no hidden→shown flip may occur at finalize',
{ skip: SKIP_SETTLE }, async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await toSubThenBack(h);

    // Release 130ms after the ‹ Back tap. That number is not arbitrary: the adversary's reachability
    // derivation (Claude/Loki/STRIKE-one-screen-type.md §5) puts the real-engine band at a release
    // ~125–340ms after the tap — late enough that the filmstrip's 340ms net still beats the settle's
    // own ~216ms transitionend, early enough that the net has not already been consumed while the
    // gesture was live. 130ms sits just inside that band. In jsdom no transitionend fires at all, so
    // the settle's only finalize is its 340ms fallback and the two timers are the whole race.
    await flickBackToBooks(h, 130);

    const pend = filmstripNets(h).map((t) => t.delay).sort((a, b) => a - b);
    assert.deepEqual(pend, [210, 340],
      'fixture sanity: the filmstrip net (210ms remaining) and the settle\'s fallback finalize '
      + `(340ms) must be pending at DISTINCT dues — got ${JSON.stringify(pend)}. Equal dues would `
      + 'collapse the window this cell exists to drive');

    const ledger = hiddenLedger(h, 'browse');

    // ── The net fires. The finalize has NOT. This is the whole of the settle window. ────────────
    await h.clock.advance(220); await settle(h);
    assert.equal(filmstripNets(h).length, 1,
      'instrument: the filmstrip net must have fired and the settle finalize must still be pending '
      + '— if both fired there is no settle window here and the cell proves nothing');
    assert.equal(swipeLog(h).some((m) => /commit back options→books/.test(m)), false,
      'instrument: the commit finalize must not have run yet');
    const owner = h.window.PBSwipeSession();
    assert.ok(owner && !owner.dragging,
      'instrument: and the SESSION must still own the movers at this instant — that is what makes '
      + 'the assertions below about session-owned elements rather than idle ones');

    assert.equal(hasClass(h, 'browse', 'hidden'), false,
      'THE DEFECT (Loki KILL; plan §5.4a): the pending overlayFilmstrip reconcile was NOT suppressed '
      + 'after finger-up — the shipped .282 predicate reads the DRAG HANDLE (!!d && d.live), which '
      + 'end() nulled at release, while the SESSION still owns and animates these movers. So it ran '
      + 'applyScreen(\'options\') and gave #browse — the destination the user just COMMITTED to — '
      + 'the `hidden` class in the middle of its snap. A pending reconcile must not change the '
      + 'visibility of an element a gesture SESSION owns as a mover, for the whole of that ownership.');
    assert.notEqual(inlineTransform(h, 'browse'), '',
      'and must not wipe the committed incoming mover\'s settle transform — resetSwipeStyles is '
      + 'applyScreen\'s first act, and clearing it destroys the snap animation mid-flight (which '
      + 'also cancels the settle transition, killing the transitionend finalize)');
    assert.notEqual(inlineTransform(h, 'options'), '',
      'nor the outgoing mover\'s settle transform — both are session-owned for the same lifetime');
    assert.equal(hasClass(h, 'options', 'hidden'), false,
      'and the outgoing mover must still be un-hidden mid-settle: the reconcile\'s setView is what '
      + 'would snap the source back to its at-rest state before the gesture that is leaving it has '
      + 'finished leaving');

    const midWindow = ledger.drain();
    assert.equal(midWindow.includes(true), false,
      'and across EVERY class write in the settle window, not merely at this sample, #browse must '
      + `never have carried \`hidden\` — ledger ${JSON.stringify(midWindow)}. A flip that healed `
      + 'between two point samples would still be a destination that vanished mid-snap');

    // ── The finalize runs. The committed end-state lands, with no flip on the way. ──────────────
    await h.clock.advance(130); await settle(h);
    const full = ledger.drain();
    ledger.disconnect();

    assert.ok(swipeLog(h).some((m) => /commit back options→books/.test(m)),
      'the commit finalize must still run and log — suppressing the reconcile must not cost the '
      + 'gesture its own finalize, which is what discharges the reconciliation duty here');
    const flip = full.findIndex((v, i) => i > 0 && full[i - 1] === true && v === false);
    assert.equal(flip, -1,
      'and NO hidden→shown flip may occur anywhere from release to finalize: the destination arrives '
      + 'by the settle animation the user drove, never by being restored from display:none at the '
      + `340ms fallback — that restoration IS the pop-in. Ledger ${JSON.stringify(full)}`);
    assert.equal(hasClass(h, 'browse', 'hidden'), false,
      'end state: the committed destination is the shown screen');
    assert.equal(hasClass(h, 'options', 'hidden'), true,
      'end state: the source is hidden at rest');
    assert.equal(inlineTransform(h, 'browse'), '',
      'end state: finalize\'s applyScreen cleared the settle transforms — so the duty the suppressed '
      + 'reconcile would have done is genuinely discharged, not merely skipped');
    assert.equal(inlineTransform(h, 'options'), '', 'end state: and on the outgoing mover too');
    assert.equal(h.window.PBSwipeSession(), null,
      'end state: and the session released ownership at finalize, so a reconcile arriving AFTER this '
      + 'point is correctly no longer suppressed');
  } finally { h.dispose(); }
});
