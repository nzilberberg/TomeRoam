// STAGE 2 of PLAN-swipe-reveal.md — the frozen model, checked against the RUNNING
// implementation.
//
// Stage 1 froze a model (docs/swipe-model.generated.txt). Plan §8B is blunt about why
// that is not enough: "THE MODEL IN §2 WAS WRONG THREE TIMES BEFORE IT WAS RIGHT", and
// every error concerned code the author had already read. So before anything is
// extracted, the model gets checked against what the code actually does.
//
// TRIAGE (plan §7 stage 2). Every test here is one of:
//   GREEN NOW    passes today and is mutation-verified immediately
//   KNOWN RED    marked `{ todo: ... }` with the exact current defect recorded. The
//                assertion states what the model REQUIRES; it is never inverted to
//                bless current behaviour. node:test runs todo tests and reports their
//                failure without failing the run — and if one ever passes it reports
//                `ok ... # TODO`, which is the signal that it got fixed.
// Stage 2 does NOT block on known-red. Stage 8 does: none may remain by then.
//
// ⚠️ WHAT THESE DO NOT COVER. jsdom pins window.scrollY at 0, so the scroll tests pin
// WHETHER a restore was issued, not which coordinate. Layout is absent, so nothing here
// speaks to the visual flash — that is explicitly out of scope (plan §6).
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

// REAL wall clock, captured before boot() patches setTimeout. app.js's move() only
// resamples velocity after >8ms of real time, so synthetic moves fired back-to-back
// leave vx holding the OUTWARD flick and a gesture meant to abort COMMITS instead.
// (That made an earlier test in this suite flaky 1-in-3, and a careless "fix" made it
// deterministically wrong, which is worse because it looks trustworthy.)
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const scrollCalls = (h) => h.log.calls.filter((c) => c.name === 'window.scrollTo');

/** Authors over Books: a left-edge back-swipe is browse->browse, the pane case. */
async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]');
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
}

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

/** A left-edge drag that deterministically ABORTS (out, then back to the edge). */
async function abortingSwipe(h, row) {
  h.touch.start(10, 300, row);
  h.touch.move(80, 302);
  await realSleep(12);
  h.touch.move(200, 304);
  await realSleep(12);
  h.touch.move(30, 304);
  await realSleep(12);
  h.touch.end(30, 304);
  await settle(h);
  await h.clock.advance(400);
  await settle(h);
}

// ── WIRING (stage 4) — start() consumes the construction plan's OUTGOING choice ─────
// swipe-transition.test.js proves the DECISION (js/swipe.js: an overlay source is moved
// as its real element, 'real-source', never frozen as a ghost — only a NON-overlay source
// bound for a browse destination ghosts). This proves start() actually CONSUMES that
// decision: if it ignored plan.outgoing and always ghosted, an overlay->browse back-swipe
// would build a .nav-ghost. That mutation left all 76 harness tests green until this one —
// the exact wiring-seam blind spot the app-harness exists to close.
test('WIRING — an overlay-source back-swipe moves the real overlay and builds NO ghost', async () => {
  const h = boot({ fakeTimers: true });
  try {
    h.tap('.navbtn[data-nav="books"]');
    await settle(h);
    h.tap('.navbtn[data-nav="options"]');   // navStack = [books, options]; options is an overlay
    await settle(h);
    h.touch.start(10, 300, h.$('options')); // left edge, on the overlay itself
    h.touch.move(80, 302);                  // past the 8px lock, horizontal → start()
    assert.equal(starts(h).length, 1, 'the overlay->browse back-swipe must go live');
    h.touch.end(80, 302);
    await settle(h);
    await h.clock.advance(400);
    await settle(h);
  } finally { h.dispose(); }
});

// ── WIRING — an NP-source back-swipe BUILDS the Now Playing pill clone (L1 effect) ───
// swipe-transition.test.js proves the DECISION (js/swipe.js: an NP endpoint puts a
// now-playing-pill mover on the construction, based at the outgoing slot when NP is the
// source). This drives a real NP-source back-swipe end-to-end and asserts a .np-pill-float
// clone gets built. Post-Stage-5 relocation the pill CLONE is an L1 effect — it is built
// inside Swipe.buildConstruction (npPillClone), NOT by start()'s decorations loop — so a
// mutation that miswires npPillConstruction ships green at the recipe layer and is caught
// here: no pill clone, this reddens. (start()'s OWN decorations consumer is the np-locked
// unlock, a distinct effect guarded by `npLock` in test/swipe-stage5-residuals.test.js.)
const npFloats = (h) => h.document.querySelectorAll('.np-pill-float').length;

test('WIRING — an NP-source back-swipe builds the Now Playing pill mover from plan.decorations', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await settle(h);
    const cover = h.document.querySelector('[data-book="bookA"] .covertap');
    assert.ok(cover, 'fixture sanity: a book tile is present to start playback from');
    cover.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await settle(h);                          // book is playing → ctx is set
    h.tap('#player');                         // the mini-player opens Now Playing (needs ctx)
    await settle(h);                          // navStack top is now 'nowplaying'
    assert.equal(npFloats(h), 0, 'no pill clone exists before the swipe');
    h.touch.start(10, 300, h.$('nowplaying')); // left edge, on the NP overlay → back-swipe
    h.touch.move(80, 302);                     // past the 8px lock, horizontal → start()
    assert.equal(starts(h).length, 1, 'the NP-source back-swipe must go live');
    assert.equal(npFloats(h), 1, 'start() must build the NP pill mover the plan decorations call for');
    h.touch.end(80, 302);
    await settle(h);
    await h.clock.advance(400);
    await settle(h);
  } finally { h.dispose(); }
});

// ── I19 — gesture-ending inputs route by STATE, not by input ────────────────────────
// Frozen model §4: ARMED finishes with NO navigation; DRAGGING takes the ordinary
// travel+velocity decision (so touchcancel CAN commit); SETTLING or later ignores the
// event as a stale duplicate. Draft 5 routed touchcancel through the settle decision
// UNCONDITIONALLY, which is wrong: a touch can be cancelled while still ARMED, where
// there are no movers and no travel decision to make.

test('I19 ARMED — a touchcancel before any move navigates nowhere', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    h.touch.start(10, 300, row);      // armed, never moved
    h.touch.cancel(10, 300);
    await settle(h);
    await h.clock.advance(400);
    assert.deepEqual(starts(h), [], 'the gesture never went live, so start() must not run');
    assert.deepEqual(settles(h), [], 'an ARMED cancel must not settle — there is no travel decision to make');
  } finally { h.dispose(); }
});

test('I19 ARMED — a touchcancel after a move BELOW the 8px lock still navigates nowhere', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    h.touch.start(10, 300, row);
    h.touch.move(14, 302);            // under the direction lock — start() never runs
    h.touch.cancel(14, 302);
    await settle(h);
    await h.clock.advance(400);
    assert.deepEqual(starts(h), [], 'below the lock the gesture is still ARMED');
    assert.deepEqual(settles(h), [], 'so cancelling it must not settle');
  } finally { h.dispose(); }
});

test('I19 DRAGGING — a touchcancel takes the ordinary settle decision, and CAN commit', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    // Drag most of the way across and cancel there: travel is past THRESH, so the
    // ordinary decision is COMMIT. If touchcancel were treated as an abort-style
    // cleanup (draft 3/4's reading) this would abort instead.
    h.touch.start(10, 300, row);
    h.touch.move(80, 302);
    await realSleep(12);
    h.touch.move(600, 304);
    await realSleep(12);
    h.touch.cancel(600, 304);
    await settle(h);
    await h.clock.advance(400);
    await settle(h);
    const s = settles(h);
    assert.equal(s.length, 1, `exactly one settle, got ${JSON.stringify(s)}`);
    assert.ok(/commit/.test(s[0]),
      `touchcancel shares onEnd with touchend, so a past-threshold cancel COMMITS — got ${s[0]}`);
  } finally { h.dispose(); }
});

// ⚙️ MUTATION NOTE — DEFENCE IN DEPTH, verified as such. This test needs a TWO-PART
// mutation to fail, and each half alone was measured insufficient:
//   removing only end()'s `releaseGesture()`  -> still green (d is already null)
//   removing only `d = null`                  -> still green (listeners already gone)
//   removing BOTH                             -> RED, settles twice
// So the frozen model's stated basis ("end() returns at `if (!d)`") is only half the
// story: for a duplicate at the SAME node, listener release is what actually stops it,
// and the `if (!d)` guard is the backstop. Do not read a single-guard removal as safe.
test('I13/I19 SETTLING — a duplicate end arriving mid-settle is ignored, not re-settled', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    h.touch.start(10, 300, row);
    h.touch.move(80, 302);
    await realSleep(12);
    h.touch.move(200, 304);
    await realSleep(12);
    h.touch.move(30, 304);
    await realSleep(12);
    h.touch.end(30, 304);             // -> SETTLING
    // A stale duplicate for the SAME gesture, dispatched at the same node.
    const dup = new h.window.Event('touchend', { bubbles: true });
    dup.changedTouches = [{ clientX: 30, clientY: 304, identifier: 0, target: row }];
    dup.touches = [];
    row.dispatchEvent(dup);
    await settle(h);
    await h.clock.advance(400);
    await settle(h);
    assert.equal(settles(h).length, 1,
      'finalization happens exactly once despite a duplicate gesture-ending event');
  } finally { h.dispose(); }
});

// ── I20 — a new touch during ARMED or DRAGGING SUPERSEDES ───────────────────────────
// Frozen model §5: parity is SUPERSEDE, not reject. begin() rejects only while
// `finishing` is true; otherwise it hard-resets and arms the new gesture.

// ⚠️ AN EARLIER DRAFT OF THIS TEST WAS WRONG, and it is worth recording why. It
// asserted that superseding a merely-ARMED gesture must NOT trip begin()'s hard reset.
// The model never claims that: begin() hard-resets on `if (d || <leftover pane>)`, and
// `d` is non-null the moment a gesture arms. The hard-reset log line IS today's
// supersession path. I had invented a requirement and then tested my own invention —
// the exact failure §8B describes, arriving on schedule. What the model actually
// requires is that the OLD session is fully released BEFORE the new one arms, and that
// only the new session thereafter owns the UI.
test('I20 — a new touch while merely ARMED supersedes: the old session goes, the new one owns the UI', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    h.touch.start(10, 300, addRow(h));   // armed, never dragged
    const second = addRow(h);
    h.touch.start(10, 300, second);      // a second touch supersedes it
    await realSleep(12);
    h.touch.move(120, 302);              // drive the NEW gesture live

    assert.equal(starts(h).length, 1,
      'exactly one gesture went live — the superseded one must never start()');
    // OBSERVABLE MIGRATED (PLAN-swipe-declone.md Stage 2, then made permanently unwritable by
    // PLAN-swipe-declone-stage2-subtraction.md §8 D15). This used to count owned panes; no
    // transition builds one any more, so the count is now vacuous (NOGHOSTCLASS holds it
    // structurally) and what it stood for — the superseded session leaves NOTHING behind — is
    // asserted directly: exactly one live session, the new one.
    assert.ok(activeSession(h), 'the NEW session owns the UI after the supersession');
  } finally { h.dispose(); }
});

// ── I5 — no real view keeps inline gesture styling ──────────────────────────────────

// ⚙️ MUTATION NOTE — also defence in depth, also verified. Two independent sites clear
// these styles and either one alone keeps this green:
//   app.js finalize's per-mover clear, and nav.js resetSwipeStyles() via applyScreen.
// Removing only finalize's clear -> still green. Removing both -> RED. That redundancy
// is deliberate (resetSwipeStyles is the "no swipe can leave stale transforms" baseline
// at the top of applyScreen), so this test pins the OUTCOME, not either mechanism.
test('I5 — after a settled swipe no real view carries an inline transform/transition', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await abortingSwipe(h, addRow(h));
    for (const id of ['home', 'browse', 'options', 'nowplaying']) {
      const el = h.$(id);
      if (!el) continue;
      assert.equal(el.style.transform, '', `#${id} kept an inline transform after the gesture`);
      assert.equal(el.style.transition, '', `#${id} kept an inline transition after the gesture`);
      assert.equal(el.style.willChange, '', `#${id} kept an inline will-change after the gesture`);
    }
  } finally { h.dispose(); }
});

// ── I11 — stack, screen and authoritative settled descriptor agree ──────────────────
// Observed behaviourally rather than by poking navStack (which lives inside app.js's
// IIFE and has no test-only export — deliberately). After an ABORT the authoritative
// descriptor is the SOURCE, so the very next back-swipe must offer the SAME transition.
// If the abort had mutated the stack, the second gesture would report a different pair.

test('I11 — an ABORT leaves the stack on the source: the next swipe offers the same transition', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await abortingSwipe(h, addRow(h));
    const first = starts(h)[0];
    assert.ok(first, 'fixture sanity: the first gesture engaged');
    assert.ok(/abort/.test(settles(h)[0] || ''), `fixture sanity: it aborted — got ${settles(h)[0]}`);

    await abortingSwipe(h, addRow(h));
    const second = starts(h)[1];
    assert.ok(second, 'the second gesture must also engage — an aborted swipe must not consume the stack');
    assert.equal(second, first,
      'after an abort the authoritative descriptor is the SOURCE, so the same transition is still offered');
  } finally { h.dispose(); }
});

// ── I7 — scroll ─────────────────────────────────────────────────────────────────────
// ⚠️ These pin WHETHER a restore was issued. jsdom pins window.scrollY at 0, so the
// coordinate itself is not exercised; do not read a pass as proof it restores the
// RIGHT position.

test('I7 — an aborted browse->browse swipe issues a scroll restore', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const before = scrollCalls(h).length;
    await abortingSwipe(h, addRow(h));
    assert.ok(/abort/.test(settles(h)[0] || ''), `fixture sanity: it aborted — got ${settles(h)[0]}`);
    assert.ok(scrollCalls(h).length > before,
      'the abort path must put back the starting scroll (app.js: window.scrollTo(0, cur.scroll0))');
  } finally { h.dispose(); }
});

// LIVE GUARD (Stage 6a, closed KR-swipe-scroll-restore). The supersession pre-stack
// recovery restores the session-start document scroll (app.js begin(): window.scrollTo(0,
// d.scroll0) after the source re-render, inside the hold envelope). A superseded
// browse->browse drag has run its mid-drag render, whose positionOnEnter moved the
// document; the recovery puts the scroll back, so a gesture that navigated nowhere leaves
// the scroll where it started. Was `{ todo }` (new policy) through stage 5; Brunel built it.
test('I20 — superseding a live drag restores the starting scroll',
  async () => {
    const h = boot({ fakeTimers: true });
    try {
      await onAuthorsOverBooks(h);
      h.touch.start(10, 300, addRow(h));
      await realSleep(12);
      h.touch.move(120, 302);            // live drag: the mid-drag render has scrolled
      const before = scrollCalls(h).length;

      h.touch.start(10, 300, addRow(h)); // superseded
      await settle(h);

      assert.ok(scrollCalls(h).length > before,
        'a superseded gesture must restore the scroll it started from');
    } finally { h.dispose(); }
  });

// ── REVIEW OF .218 — [HIGH] the real Browse host on supersession ────────────────────
// The reviewer's claim, checked here by making it FAIL rather than by agreeing with it:
// on a live browse->browse supersession the nav stack and navbar return to the SOURCE
// while the shared #browse keeps the DESTINATION's content, because begin()'s hard
// reset calls applyScreen(currentDesc(), { render: false }) and nothing re-renders the
// source. That is an I11 violation of exactly the wrong-page/wrong-tap shape .178 fixed.
const renders = (h) => h.log.calls.filter((c) => c.name === 'browse.render').map((c) => c.args[0]);

test('supersession CONTROL — the mid-drag render really does put the destination in #browse', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    h.touch.start(10, 300, addRow(h));
    await realSleep(12);
    h.touch.move(120, 302);                        // live: Authors -> Books
    assert.equal(renders(h).at(-1), 'books',
      'fixture sanity: start() renders the DESTINATION into the shared #browse');
  } finally { h.dispose(); }
});

// LIVE GUARD (Stage 6a closed KR-swipe-source-rerender; stage 6d re-derived the render flag;
// PLAN-swipe-declone.md Stage 2 made the guarantee STRUCTURAL and retired the mechanism).
//
// THE GUARANTEE IS UNCHANGED: after a superseded browse->browse drag, the browse view must
// hold the SOURCE screen, because that is where the stack and the navbar return to — the
// wrong-page/wrong-tap class .178 fixed. What changed is why it holds. Stage 6a made the
// pre-stack recovery RE-RENDER the source into the shared #browse; Stage 2 gives each browse
// page its own element, so the mid-drag render never overwrote the source in the first place
// and there is nothing to put back.
//
// SO THE ASSERTION IS INVERTED, and deliberately: the old measured failure was
// renders = ["books","authors","books"] — mid-drag put Books in and nothing put Authors back,
// so the fix ADDED a third render. Now a third render is the DEFECT: it would mean the source
// was clobbered after all. The recovery must reconcile without rendering anything.
test('I11/I20 — a superseded live browse->browse drag leaves the SOURCE showing, with no re-render',
  async () => {
    const h = boot({ fakeTimers: true });
    try {
      await onAuthorsOverBooks(h);
      const before = renders(h).length;
      h.touch.start(10, 300, addRow(h));
      await realSleep(12);
      h.touch.move(120, 302);                        // live: Authors -> Books
      h.touch.start(10, 300, addRow(h));             // superseded by a new gesture
      await settle(h);
      assert.deepEqual(renders(h).slice(before), ['books'],
        'the ONLY render is the mid-drag destination one. A render of the source after it means '
        + 'the source was overwritten and had to be rebuilt — the very thing Invariant D3 removes. '
        + `renders=${JSON.stringify(renders(h))}`);
    } finally { h.dispose(); }
  });

// ── REVIEW OF .218 — [MED] stale callbacks from the SUPERSEDED gesture ───────────────
// Draft 6 requires that old move/end callbacks arriving after the new session begins be
// harmless. The .218 tests never dispatched to the original target after superseding —
// and the harness's convenience API retargets on the second touch.start(), so its helper
// calls could not have done it. Production's handlers close over no session object: they
// call the shared move()/end(), which act on the current global `d`. If the hard reset
// failed to release the old target's listeners, an old touchmove would drive the NEW
// gesture. Dispatched manually at the retained node, the way the I13 test does it.
test('I20 — stale move/end/cancel from the superseded gesture cannot touch the new session', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const first = addRow(h);
    h.touch.start(10, 300, first);
    await realSleep(12);
    h.touch.move(120, 302);                        // first gesture live, owns a pane

    const second = addRow(h);
    h.touch.start(10, 300, second);                // supersedes
    await realSleep(12);
    h.touch.move(120, 302);                        // the NEW gesture goes live
    const startsAfter = starts(h).length;
    const settlesAfter = settles(h).length;
    const scrollAfter = scrollCalls(h).length;
    const rendersAfter = renders(h).length;
    // TRANSFORM is the assertion this test originally MISSED, and missing it made the
    // whole test inert: a stale touchmove drives move(), which acts on the CURRENT
    // global `d` — so it drags the NEW session's movers without logging anything.
    //
    // ⛔ RE-ANCHORED (STALETOUCH, PLAN-swipe-declone-stage2-subtraction.md §10 / §8 D15 [F7]).
    // It used to read the transform off a `.nav-ghost`. No transition builds one, so BOTH sides
    // of the comparison were `null` and the witness was already INERT AT HEAD — leaving this
    // cell in exactly the state its own comment above records as broken. It is re-anchored onto
    // the movers that SURVIVE: the `.browsepage` elements a browse->browse gesture actually
    // drags, whose transform a stale touchmove would really write. Deleting it instead (the
    // other disposition available for an inert assertion) would have quietly removed the
    // witness rather than restoring it.
    const moverEls = [...h.document.querySelectorAll('.browsepage')];
    assert.ok(moverEls.length > 0,
      'fixture: the successor gesture drags real .browsepage movers — without a non-null node the '
      + 'transform comparison below compares null to null and cannot fail');
    const transformsAfter = moverEls.map((el) => el.style.transform);
    assert.ok(transformsAfter.some((t) => t),
      'fixture: at least one surviving mover carries an inline transform from the LIVE successor '
      + `gesture, so a stale drag has something to corrupt; got ${JSON.stringify(transformsAfter)}`);

    // The superseded gesture's node now fires its whole tail, at the ORIGINAL target.
    for (const type of ['touchmove', 'touchend', 'touchcancel']) {
      const e = new h.window.Event(type, { bubbles: true, cancelable: type === 'touchmove' });
      e.changedTouches = [{ clientX: 400, clientY: 302, identifier: 0, target: first }];
      e.touches = type === 'touchmove' ? [{ clientX: 400, clientY: 302, identifier: 0, target: first }] : [];
      first.dispatchEvent(e);
    }
    await settle(h);
    // ⚠️ MUST advance the clock. settle() only writes its `#N abort|commit` line from
    // runFinalize, which fires on transitionend or the 340ms fallback — so without
    // this, a stale touchend really did settle the new gesture and the assertion below
    // could not see it. That omission is exactly why the first version of this test
    // passed under the mutation it was written to catch.
    await h.clock.advance(400);
    await settle(h);

    assert.equal(starts(h).length, startsAfter, 'a stale event must not start a gesture');
    assert.equal(settles(h).length, settlesAfter, 'a stale event must not settle the live gesture');
    assert.equal(scrollCalls(h).length, scrollAfter, 'a stale event must not move the document');
    assert.equal(renders(h).length, rendersAfter, 'a stale event must not re-render Browse');
    assert.deepEqual(moverEls.map((el) => el.style.transform), transformsAfter,
      'a stale touchmove must not drag the NEW session\'s movers. move() acts on the CURRENT '
      + 'global `d`, so a superseded gesture whose listeners were not released reaches the handler '
      + 'and writes a translateX onto the successor\'s borrowed-real movers — silently, because it '
      + 'logs nothing. The transform on a node that still EXISTS is the only thing that shows it.');
  } finally { h.dispose(); }
});

// ── STALETOUCH — the TRANSFORM witness, as its own named test ────────────────────────
//
// WHY IT IS SPLIT OUT (PLAN-swipe-declone-stage2-subtraction.md §13 decision 13; the
// park-distance precedent). MEASURED 2026-08-05: under the registered mutant this witness
// exists for — the supersession stops releasing the superseded target's listeners — the cell
// above dies on its SECOND assertion ("a stale event must not settle the live gesture"), so the
// transform assertion is never reached and the sweep can only report that the TEST reddened.
// The sweep names a killing test, not a killing assertion, so without this split the witness
// re-anchored above would ship never having been shown to fail — which is precisely the defect
// the re-anchor exists to repair, one layer in.
//
// It asserts the transform and NOTHING else, so a red here is attributable to this witness.
test('STALETOUCH — a stale touchmove must not write a transform onto the NEW session\'s movers (the witness, alone)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const first = addRow(h);
    h.touch.start(10, 300, first);
    await realSleep(12);
    h.touch.move(120, 302);                        // gesture 1 live

    h.touch.start(10, 300, addRow(h));             // supersedes; gesture 1's listeners must go
    await realSleep(12);
    h.touch.move(120, 302);                        // the NEW gesture goes live and stamps its movers

    const moverEls = [...h.document.querySelectorAll('.browsepage')];
    assert.ok(moverEls.length > 0, 'fixture: the successor drags real .browsepage movers');
    const before = moverEls.map((el) => el.style.transform);
    assert.ok(before.some((t) => t),
      `fixture: at least one mover carries a live transform, so a stale drag has something to corrupt; got ${JSON.stringify(before)}`);

    // ONE stale event, and deliberately only the touchmove: a stale touchend would settle the
    // successor and that is the assertion the cell above owns. This isolates the drag.
    const e = new h.window.Event('touchmove', { bubbles: true, cancelable: true });
    const t = { clientX: 400, clientY: 302, identifier: 0, target: first };
    e.changedTouches = [t]; e.touches = [t];
    first.dispatchEvent(e);

    assert.deepEqual(moverEls.map((el) => el.style.transform), before,
      'a superseded gesture whose listeners were not released reaches the shared move(), which acts '
      + 'on the CURRENT global `d` — so it drags the SUCCESSOR\'s borrowed-real movers, silently, '
      + 'logging nothing. Nothing else in the suite can see this: it starts no gesture, settles '
      + 'nothing, scrolls nothing and renders nothing.');
  } finally { h.dispose(); }
});

// ── STAGE 3 — the session owner has observable IDENTITY ─────────────────────────────
// Stage 3 introduces a session owner with a monotonic `id`, set at arm and dropped on a
// superseding hard reset. Enforcement (callbacks no-op when superseded) is deliberately
// deferred to stage 6 — see the `session` note in app.js. What stage 3 delivers and is
// tested HERE is that identity is real and observable: every completed gesture logs a
// distinct `sid=`, and a superseded gesture's id surfaces on the hard-reset line.
const finalizeSids = (h) => swipeLog(h)
  .map((m) => /#\d+ (?:abort|commit) .* sid=(\d+)/.exec(m)).filter(Boolean).map((m) => Number(m[1]));

test('stage 3 — two sequential completed gestures carry DISTINCT session ids', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await abortingSwipe(h, addRow(h));
    await abortingSwipe(h, addRow(h));
    const sids = finalizeSids(h);
    assert.equal(sids.length, 2, `two gestures should each log a sid; got ${JSON.stringify(swipeLog(h))}`);
    assert.notEqual(sids[0], sids[1], 'each gesture must own a distinct session id');
    assert.ok(sids[1] > sids[0], 'session ids are monotonic');
  } finally { h.dispose(); }
});

// The hard-reset sid, as a number. Distinct from the finalize sids.
const hardResetSids = (h) => swipeLog(h)
  .map((m) => /leftover state on begin.*\bsid=(\d+)/.exec(m)).filter(Boolean).map((m) => Number(m[1]));

// ⚠️ REVIEW OF .222/.223 [LOW] — an earlier version of this test only checked that the
// hard-reset line contained `sid=<digits>`. A constant, the NEXT session's id, or any
// wrong number would have passed it. The relationship has to be observable, so three
// gestures are used: complete A, arm+drag B, supersede B with C, complete C. Then
// sid(A) < hardResetSid(B) < sid(C) and all three differ pins that the logged id
// belongs to the SUPERSEDED session, not a constant or the successor.
test('stage 3 — the hard-reset sid is the SUPERSEDED session, not a constant or the successor', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await abortingSwipe(h, addRow(h));       // A completes → finalize sid(A)

    h.touch.start(10, 300, addRow(h));       // B arms
    await realSleep(12);
    h.touch.move(120, 302);                  // B live (drags)
    const rowC = addRow(h);
    h.touch.start(10, 300, rowC);            // C supersedes B → hard reset logs sid(B)
    h.touch.move(80, 302);                   // C engages (start)
    await realSleep(12);
    h.touch.move(200, 304);                  // C out to the extreme
    await realSleep(12);
    h.touch.move(30, 304);                   // C retreats → aborts
    await realSleep(12);
    h.touch.end(30, 304);                    // C completes → finalize sid(C)
    await settle(h); await h.clock.advance(400); await settle(h);
    const fin = finalizeSids(h);
    const hr = hardResetSids(h);
    assert.ok(fin.length >= 2, `expected at least two finalize sids (A and C); got ${JSON.stringify(fin)}`);
    assert.equal(hr.length, 1, `expected exactly one hard reset (B); got ${JSON.stringify(hr)}`);
    const sidA = fin[0], sidB = hr[0], sidC = fin[fin.length - 1];
    assert.ok(sidA < sidB && sidB < sidC,
      `superseded id must sit BETWEEN the completed ones: A=${sidA} B=${sidB} C=${sidC}`);
    assert.equal(new Set([sidA, sidB, sidC]).size, 3, 'all three session ids must differ');
  } finally { h.dispose(); }
});

// ── STAGE 3 — the ownership ENDPOINT (review of .222 [MED] finding #2) ───────────────
// IDLE must mean "no active owner", not "the last gesture". `PBSwipeSession()` is a pure
// read of the real `session` var. Every exit type must leave it null.
const activeSession = (h) => (h.window.PBSwipeSession ? h.window.PBSwipeSession() : 'no-accessor');

test('endpoint — during a live drag an owner EXISTS, and after it completes it is gone', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    h.touch.start(10, 300, addRow(h));
    await realSleep(12);
    h.touch.move(120, 302);                        // live
    assert.ok(activeSession(h) && activeSession(h).dragging,
      `a live drag must have an active owning session; got ${JSON.stringify(activeSession(h))}`);
    // finish it (aborting)
    await realSleep(12); h.touch.move(30, 304); await realSleep(12); h.touch.end(30, 304);
    await settle(h); await h.clock.advance(400); await settle(h);
    assert.equal(activeSession(h), null, 'after a completed abort, no session may remain active');
  } finally { h.dispose(); }
});

test('endpoint — an ARMED cancel leaves no active owner', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    h.touch.start(10, 300, addRow(h));
    h.touch.cancel(10, 300);
    await settle(h); await h.clock.advance(400);
    assert.equal(activeSession(h), null, 'an armed-then-cancelled gesture must relinquish ownership');
  } finally { h.dispose(); }
});

test('endpoint — a VERTICAL abandon leaves no active owner', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    h.touch.start(10, 300, addRow(h));
    await realSleep(12);
    h.touch.move(14, 360);                         // vertical → abandon
    await realSleep(12); h.touch.end(14, 360);
    await settle(h); await h.clock.advance(400);
    assert.equal(activeSession(h), null, 'a vertical abandon must relinquish ownership');
  } finally { h.dispose(); }
});

// ── RETIRED WITH THE CLONE (PLAN-swipe-declone.md Stage 2, §12 item 27) ─────────────
// Two cells here had the BUILT PANE as their only subject. "I2/I20 — superseding a LIVE
// drag disposes its pane instead of stranding it" pinned I2 (every pane released or
// disposed exactly once on every exit path); with no pane built there is none to strand,
// and I2 now holds vacuously for the only ownership kind left — the NP pill decoration,
// whose disposal on the recovery path is pinned by RECOVERYPARITY's fourth assertion
// (PLAN-swipe-declone-stage2-subtraction.md §10, [F5] — re-homed from the DEC cell, which
// lived in the now-deleted test/swipe-stage6e.test.js). "endpoint — a
// HELD reveal keeps the owner THROUGH finalize" pinned the intermediate ownership across
// the held reveal's paint gate, and the held reveal existed only to keep a ghost covering
// a page being re-decoded after an abort re-render. Both the re-render and the hold are
// gone (§12 items 13 and 15a), so an abort now ends its session at finalize like every
// other transition — which the surrounding endpoint cells already pin.

// ── .223 review, finding 1a — the paused settle rAF must not write a stale transform ──
// Hidden mid-settle, rAF pauses but the 340ms finalize timer still fires; finalize clears the
// transforms and (the fix) cancels the settle rAF, so when the frame later runs on foreground it
// must NOT re-shift a real view. Without the cancel the rAF writes translateX(±innerWidth) onto a
// live view — "the list shoved sideways".
//
// ⭐ ASSERTED OVER THE MOVER SET, NOT OVER #browse (repaired 2026-08-01). This cell used to watch
// #browse alone, on the stated ground that "the incoming mover is the real #browse". PLAN-swipe-
// declone.md Stage 2 made that false: a browse→browse gesture's two movers are two .browsepage
// nodes and #browse carries no drag transform at all. The cell went on watching a host that is
// clean either way, so the registered mutant that removes the cancel SURVIVED — caught by CI's
// full-registry sweep, invisible to a targeted one. The production guard never moved; only the
// elements it protects did, so the cell now derives them instead of naming one.
const nonZeroShift = (t) => /translateX\(\s*-?[1-9]/.test(t || '');   // translateX(0px)/'' do not match
/** Every element a swipe can transform: the two id-resolved view hosts plus every browse page. */
const shiftable = (h) => [h.$('home'), h.$('browse'), ...h.document.querySelectorAll('.browsepage')].filter(Boolean);
const shifted = (h) => shiftable(h).filter((el) => nonZeroShift(el.style.transform))
  .map((el) => `${el.id ? '#' + el.id : '.browsepage[' + (el.dataset.key || '?') + ']'}="${el.style.transform}"`);
test('1a — a cancelled settle rAF cannot re-shift any real view after finalize', async () => {
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    // Abort browse→browse: both movers are real .browsepage elements (borrowed-real).
    h.touch.start(10, 300, row);
    h.touch.move(80, 302); await realSleep(12);
    h.touch.move(200, 304); await realSleep(12);
    // ANTI-VACUITY: the drag must actually have shifted something, or "nothing carries a stale
    // shift" is satisfied by a gesture that never wrote a transform at all.
    assert.ok(shifted(h).length > 0,
      'fixture sanity: the live drag must have shifted at least one real element, or this cell '
      + 'asserts the absence of something that never happened');
    h.touch.move(30, 304); await realSleep(12);
    h.touch.end(30, 304);
    await h.clock.advance(400);   // finalize: cancels the settle rAF + clears transforms
    assert.deepEqual(shifted(h), [],
      `no real view may carry a stale shift right after finalize; got ${JSON.stringify(shifted(h))}`);
    for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();   // fire queued frames
    assert.deepEqual(shifted(h), [],
      `a cancelled settle rAF must not re-shift a real view on a later frame; got ${JSON.stringify(shifted(h))}`);
  } finally { h.dispose(); }
});

// ── .223 review, finding 2 — a throw during finalize must not wedge future swipes ──────
// runFinalize's applyScreen can throw; finishing was set false only at runFinalize's
// last line, so a throw left it stuck true and begin()'s `if (finishing) return`
// rejected every future swipe until reload. The fix restores finishing in the finally,
// on a throw only.
test('2 — a throw in finalize restores finishing, so the next swipe still engages', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    // A SYNC-throwing Browse.render makes runFinalize's applyScreen throw synchronously
    // (showAppView calls Browse.render un-awaited; an async throw would be a rejected
    // promise, not a sync throw, and would not exercise the finally).
    const realRender = h.browse.render;
    h.browse.render = () => { throw new Error('boom in render'); };
    const swipeAbort = async (r) => {
      h.touch.start(10, 300, r);
      h.touch.move(80, 302); await realSleep(12);
      h.touch.move(200, 304); await realSleep(12);
      h.touch.move(30, 304); await realSleep(12);
      h.touch.end(30, 304);
      await settle(h); await h.clock.advance(400); await settle(h);
    };
    await swipeAbort(addRow(h));            // this finalize throws (swallowed by the timer runner)
    h.browse.render = realRender;           // stop throwing
    const before = starts(h).length;
    await swipeAbort(addRow(h));            // a fresh swipe
    assert.ok(starts(h).length > before,
      'after a throw in finalize, a new swipe must engage — finishing must not stay stuck true');
  } finally { h.dispose(); }
});
