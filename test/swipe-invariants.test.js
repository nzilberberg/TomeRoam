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
const ghosts = (h) => h.document.querySelectorAll('.nav-ghost').length;

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
    assert.equal(ghosts(h), 1,
      'one pane, owned by the NEW session; a stranded pane from the old one would make two');
  } finally { h.dispose(); }
});

test('I2/I20 — superseding a LIVE drag disposes its pane instead of stranding it', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    h.touch.start(10, 300, addRow(h));
    await realSleep(12);
    h.touch.move(120, 302);              // live: start() ran, a ghost pane exists
    assert.equal(ghosts(h), 1, 'fixture sanity: the live drag really did build a pane');

    h.touch.start(10, 300, addRow(h));   // superseded by a new gesture
    await settle(h);
    assert.equal(ghosts(h), 0,
      'every pane is released or disposed exactly once, on every exit path (I2)');
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
    assert.equal(second.replace(/ ghosts=\d+$/, ''), first.replace(/ ghosts=\d+$/, ''),
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

// KNOWN RED — the frozen model's one deliberate behaviour change (§8A / §5 of the
// generated model). Today's hard reset does releaseGesture, dropRowHold, d = null,
// resetSwipeStyles and applyScreen({render:false}) — and NO scroll restore. A
// superseded browse->browse drag has already run its mid-drag render, whose
// positionOnEnter moved the document, so the user is left at the DESTINATION's scroll
// after a gesture that navigated nowhere. The assertion below states what the model
// REQUIRES; it is deliberately not inverted to bless the current behaviour.
test('I20 — superseding a live drag restores the starting scroll',
  { todo: 'NEW POLICY, not yet implemented. app.js begin()\'s hard reset performs no '
        + 'scroll restore, so a superseded browse->browse drag is left at the '
        + 'destination\'s scroll. Closing this is part of the rewrite, not of extraction '
        + 'parity, and it needs its own device check.' },
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

// KNOWN RED #2 — MEASURED, not argued. Run as a plain test first, it failed with
//   renders = ["books", "authors", "books"]
// i.e. the mid-drag render put Books into the shared #browse and NOTHING put Authors
// back, while applyScreen(currentDesc(), { render: false }) returned the stack and the
// navbar to Authors. Stack and navbar say one screen, the Browse host shows another.
//
// This also CORRECTS the stage-1 model, which labelled supersession's source
// restoration [parity]. It is not: begin()'s hard reset restores nav selection and
// top-level visibility only, deliberately passing render:false. The pre-stack recovery
// row it relies on is itself [policy], so this is new behaviour the rewrite must close.
test('I11/I20 — superseding a live browse->browse drag re-renders the SOURCE into #browse',
  { todo: 'NEW POLICY, not yet implemented. begin()\'s hard reset calls '
        + 'applyScreen(currentDesc(), {render:false}), so the shared #browse keeps the '
        + 'DESTINATION\'s content while the stack and navbar return to the source. '
        + 'Measured: renders = ["books","authors","books"]. Same wrong-page/wrong-tap '
        + 'class as .178. Distinct from the scroll todo above — two separate defects.' },
  async () => {
    const h = boot({ fakeTimers: true });
    try {
      await onAuthorsOverBooks(h);
      h.touch.start(10, 300, addRow(h));
      await realSleep(12);
      h.touch.move(120, 302);                        // live: Authors -> Books
      h.touch.start(10, 300, addRow(h));             // superseded by a new gesture
      await settle(h);
      assert.equal(renders(h).at(-1), 'authors',
        `I11: nav returns to the source, so #browse must hold the source too. renders=${JSON.stringify(renders(h))}`);
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
    const ghostsAfter = ghosts(h);
    // TRANSFORM is the assertion this test originally MISSED, and missing it made the
    // whole test inert: a stale touchmove drives move(), which acts on the CURRENT
    // global `d` — so it drags the NEW session's movers without logging anything.
    const ghostEl = h.document.querySelector('.nav-ghost');
    const transformAfter = ghostEl && ghostEl.style.transform;

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
    assert.equal(ghosts(h), ghostsAfter, 'a stale event must not dispose the new session\'s pane');
    assert.equal(ghostEl && ghostEl.style.transform, transformAfter,
      'a stale touchmove must not drag the NEW session\'s movers');
  } finally { h.dispose(); }
});
