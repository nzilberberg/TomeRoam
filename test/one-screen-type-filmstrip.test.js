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
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

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
