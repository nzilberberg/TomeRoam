// RED-FIRST suite for PLAN-swipe-navstack-settle-window.md §9 (the test author, 2026-08-06),
// authored from the Coverage Model BEFORE the build, under the red-first TDD law
// (Claude/Decisions/DecisionLog.md). Companion note: Claude/Curie/RED-swipe-navstack-settle-window.md.
//
// WHAT THIS SLICE PROMISES (plan §5). A committed gesture's nav-stack mutation is applied only
// while the nav stacks still describe the navigation that gesture planned. When they do not, the
// gesture mutates NEITHER stack, the settle reconciles whatever the stacks now name and writes no
// scroll, and the SWIPE settle line reports the outcome that actually occurred — `nav=applied`,
// `nav=superseded` or `nav=abort` (plan §5's three-row table is the token's whole value domain).
//
// THE DEFECT. A swipe that has been released SETTLES for up to 340ms, and the rest of the UI is
// live inside that window. `runFinalize`'s commit branch (js/app.js:702-706) mutates the stacks
// from state the gesture captured when it armed, without checking the stacks still hold it. On the
// two stack-READING branches that throws (`Cannot read properties of undefined (reading 'v')`); on
// the identity-preserving interferences it silently mutates the wrong entry.
//
// ⚠️ SKIP-PENDING-BUILD. A cell marked `{ skip: SKIP }` is authored RED against current HEAD and
// committed skipped so the pre-commit battery (which runs the whole suite; this project does not
// use --no-verify) stays green. Each is CONFIRMED RED with the skip removed — the exact failing
// assertion per cell is recorded in Claude/Curie/RED-swipe-navstack-settle-window.md. THE BUILDER
// REMOVES THE SKIP FIRST, drives it red, then builds to green. Do NOT weaken an assertion to green
// a cell.
//
// STATE OF THE SKIPS. The twelve cells authored red against the pre-guard source were driven red
// and built green at `8acbdff`, and carry no skip now. ONE skip remains: NAVAPPLIES's abort-token
// clause, authored at the post-review amendment against `c488677` and RED there because the shipped
// token is a two-arm ternary over `applies` alone. It is lifted by the amendment build (plan §13
// step 9b). The other four NAVAPPLIES cells carry no skip: they are the preservation cells and are
// green before and after every build in this slice.
//
// ⛔ THE THROW ORACLE, AND WHY IT IS INSTRUMENTED (plan §12). `h.clock.advance` SWALLOWS a throwing
// timer callback (test/app-harness.js: `try { next.fn(); } catch { }`), so a bare "runFinalize did
// not throw" assertion against the unmodified harness is VACUOUS. This file does NOT edit the
// harness. `instrumentTimers(h)` wraps `global.setTimeout` AFTER boot, so every callback the app
// schedules is RECORDED when it throws and then re-thrown for the harness to swallow as before.
// The counter is proven able to FAIL three ways, all inside the same run:
//   (1) the interfering drive reads 1 at HEAD and its own control reads 0 — a counter that read 0
//       everywhere would be the same vacuity relocated;
//   (2) `assertInstrumentLive` schedules a deliberately-throwing timer through the SAME wrapped
//       setTimeout and asserts the counter caught it — so the counter is proven live in EVERY
//       build, including the built one where both drive and control legitimately read 0;
//   (3) the `@reveal` FLASH report is NOT used as a throw oracle anywhere in this file. It is
//       emitted when the observation window CLOSES, so its absence proves nothing (plan §12; an
//       earlier probe built on it had a failing control).
//
// ⛔ jsdom HAS NO LAYOUT OR PAINT. No cell asserts geometry, stacking, or a measured rect. The
// landed screen is read from the CLASSES js/nav.js setView writes (#home.parked / .hidden), and the
// scroll clauses assert WHETHER a write was issued (`window.scrollTo` is recorded by the harness;
// `scrollTop` is a plain jsdom property), never a resulting position.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./dom-fixture.js');
const { boot } = require('./app-harness.js');

const SKIP = 'SKIP-PENDING-BUILD — RED until the settle line\'s `nav=` token gains its THIRD arm '
  + '(PLAN-swipe-navstack-settle-window.md §4.1, §13 step 9b). Remove this skip to drive it red.';

// REAL wall clock, captured BEFORE boot() patches setTimeout. app.js move() only resamples velocity
// after >8ms of real time, so synthetic moves fired back-to-back leave vx holding the outward flick
// and an intended commit inverts. (Same discipline as swipe-invariants/6c/6i.)
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function ms(h, n = 14) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m)).length;
const scrollCalls = (h) => h.log.calls.filter((c) => c.name === 'window.scrollTo').length;

/**
 * The landed screen, read from the classes js/nav.js setView writes — never from geometry.
 *
 * ⚠️ IT REPORTS EVERY SHOWN VIEW, NOT THE FIRST ONE. `Nav.overlayFilmstrip` un-hides BOTH panes for
 * the duration of an Options↔sub slide, so a reader that returned the first match by iteration
 * order would silently name one of two shown screens and an assertion could pass on an ambiguous
 * state. Joining them makes that state fail loudly instead. (MEASURED: an earlier draft of this
 * file read `options` for a state where `options` and `general` were both shown.)
 */
function landed(h) {
  const shown = [];
  if (!h.$('home').classList.contains('parked')) shown.push('home');
  if (!h.$('browse').classList.contains('hidden')) shown.push('browse');
  for (const v of ['options', 'general', 'playback', 'buffering', 'downloads', 'diagnostics', 'nowplaying']) {
    const el = h.$(v);
    if (el && !el.classList.contains('hidden')) shown.push(v);
  }
  return shown.length ? shown.join('+') : '(none shown)';
}

/**
 * THE THROW INSTRUMENT (see the header). Wraps global.setTimeout after boot so a throwing timer
 * callback is RECORDED before the harness's advance() swallows it. Restore in the same finally as
 * h.dispose(). Deliberately test-local: test/app-harness.js is shared and is not edited here.
 */
function instrumentTimers(h) {
  const inner = global.setTimeout;
  const thrown = [];
  const wrapped = (fn, delay, ...a) => inner((...cb) => {
    try { return fn(...cb); } catch (e) { thrown.push(String((e && e.message) || e)); throw e; }
  }, delay, ...a);
  global.setTimeout = wrapped; h.window.setTimeout = wrapped;
  return { thrown, restore() { global.setTimeout = inner; h.window.setTimeout = inner; } };
}

/**
 * PROVE THE COUNTER CAN FIRE, in THIS run and in EVERY build. Without this, a post-build cell
 * asserting `thrown.length === 0` on both the drive and its control would be green whether the
 * instrument works or not — the exact vacuity the plan's residual names.
 */
async function assertInstrumentLive(h, inst, where) {
  const before = inst.thrown.length;
  h.window.setTimeout(() => { throw new Error('INSTRUMENT-PROBE'); }, 5);
  await h.clock.advance(10); await ms(h);
  assert.equal(inst.thrown.length, before + 1,
    `${where}: the throw instrument must be LIVE — a deliberately-throwing timer scheduled through `
    + 'the same wrapped setTimeout was not recorded, so every "0 throws" reading in this cell is vacuous');
  assert.match(inst.thrown[before], /INSTRUMENT-PROBE/);
}

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

/** A left-edge back-swipe released to COMMIT (out and away past THRESH). */
async function backCommit(h, el) {
  h.touch.start(10, 300, el);
  h.touch.move(80, 302); await realSleep(14);
  h.touch.move(600, 304); await realSleep(14);
  h.touch.end(600, 304); await ms(h);
}
/** A right-edge FORWARD swipe released to COMMIT. */
async function fwdCommit(h, el) {
  const rx = h.window.innerWidth - 2;
  h.touch.start(rx, 300, el);
  h.touch.move(rx - 80, 302); await realSleep(14);
  h.touch.move(20, 304); await realSleep(14);
  h.touch.end(20, 304); await ms(h);
}
/** Fire the 340ms settle fallback and let its continuations run. */
async function fireSettle(h) { await h.clock.advance(400); await ms(h); }

/**
 * The `nav=` token of the Nth settle line: its LITERAL value, `null` when the line exists but
 * carries no token, and a named marker when there is no such line — so "absent", "no line" and
 * "wrong value" are three distinguishable readings rather than one silent pass.
 *
 * ⚠️ IT CAPTURES WHATEVER VALUE IS THERE. It does NOT match an enumeration of the values expected
 * today. An earlier form matched `(applied|superseded)` only, which reports `null` for any value
 * added later — indistinguishable from "the line carries no token" — and which would have made the
 * abort-token clause below UNSATISFIABLE by the very build that fixes it, because that build emits
 * a value the reader did not list. The token's value domain is decided by TWO bindings, `commit`
 * and `applies` (plan §9 dimension 4(c)); a reader that enumerates the values of one of them
 * repeats, in the oracle, the exact defect the clause exists to catch.
 */
function navToken(h, n) {
  const line = settles(h)[n];
  if (line == null) return '(no settle line)';
  const m = /\bnav=(\S+)/.exec(line);
  return m ? m[1] : null;
}

// ── FIXTURES ────────────────────────────────────────────────────────────────────────────────────
/** navStack [home, books, options] with fwdStack [options] after a committed back-swipe. */
async function fixtureF(h) {
  h.tap('.navbtn[data-nav="books"]'); await ms(h);
  h.tap('.navbtn[data-nav="options"]'); await ms(h);
  await backCommit(h, h.$('options'));
  await fireSettle(h);
  assert.equal(landed(h), 'browse', 'fixture F: the setup back-swipe must land on browse, leaving fwdStack=[options]');
}
/**
 * navStack [home, books, options, general] — a settings sub over the hub.
 * The hub row runs the real `openSub`, whose `Nav.overlayFilmstrip` un-hides BOTH panes until its
 * 340ms safety net reconciles (js/nav.js:210), so the fixture SETTLES that slide before asserting —
 * otherwise the fixture assertion trips on the two-shown state instead of on its own subject.
 */
async function fixtureSub(h) {
  h.tap('.navbtn[data-nav="books"]'); await ms(h);
  h.tap('.navbtn[data-nav="options"]'); await ms(h);
  h.tap('.hubrow[data-sub="general"]'); await ms(h);
  await fireSettle(h);                                   // land the openSub filmstrip
  assert.equal(landed(h), 'general', 'fixture: the General sub-screen must be open (needs realOptions wiring)');
}
/** navStack [home, books, options] with fwdStack [general] — drive T's starting state. */
async function fixtureT(h) {
  await fixtureSub(h);
  await backCommit(h, h.$('general'));
  await fireSettle(h);
  assert.equal(landed(h), 'options', 'fixture T: the setup back-swipe must land on the Options hub, leaving fwdStack=[general]');
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// NAVSTALE (§9, integration) — a committed gesture whose stack PRECONDITION is invalidated inside
// the settle window mutates NEITHER stack and does not throw, on BOTH stack-reading branches.
//
// RED AT HEAD (confirmed, both drives): drive F records 1 timer throw against its control's 0, and
// after ONE FURTHER navigation a fresh left-edge gesture does NOT arm (control: it does). Drive B′
// records 1 throw against its control's 0. Neither settle line carries a `nav=` token at all.
//
// ⚠️ THE ARMING CLAUSE IS STATED IN ITS MEASURED FORM (plan §1, round-1 F3). The `undefined` lands
// on TOP of navStack, where begin() only STORES it as `from`; the gesture attempted IMMEDIATELY
// after the corrupt settle still ARMS at HEAD. It stops arming only once ONE FURTHER navigation
// pushes on top of it and moves it into the `navStack[len-2]` slot begin() dereferences. A cell
// omitting that further navigation is GREEN AT HEAD and proves nothing.
//
// MUTANTS (registered by the builder, plan §13 step 4): NAVSTALE-b (guard applied to the forward
// branch only → the back drive throws) and NAVSTALE-c (the superseded settle still mutates but
// swallows the throw → the arming clause is the only witness). NAVSTALE-a (identity conjunct
// deleted) is expected to redden NAVIDENT, NOT this cell — MEASURED: under NAVSTALE-a both drives
// here read 0 throws and `nav=superseded`, exactly as the specified predicate does.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
test('NAVSTALE (drive F, forward branch) — a settle-window navigation that empties fwdStack leaves '
  + 'the stacks alone, throws nothing, reports nav=superseded, and keeps the stack total',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  const inst = instrumentTimers(h);
  try {
    await fixtureF(h);
    await fwdCommit(h, addRow(h));
    h.tap('.navbtn[data-nav="home"]');            // navTo → fwdStack.length = 0, INSIDE the window
    await fireSettle(h);

    assert.deepEqual(inst.thrown, [],
      'the settle must not throw once the commit checks the stacks still describe its navigation — '
      + `at HEAD this records 1 × "Cannot read properties of undefined (reading 'v')"; got ${JSON.stringify(inst.thrown)}`);
    assert.equal(navToken(h, 1), 'superseded',
      `the settle line must report nav=superseded so a device log names it; got ${JSON.stringify(settles(h)[1])}`);
    assert.equal(landed(h), 'home',
      'the user must be left on the screen their tap reached');

    // The stack-totality consequence, in its MEASURED form: ONE FURTHER navigation, then a fresh
    // left-edge gesture must still ARM. At HEAD navStack holds an `undefined` which this further
    // push moves into the slot begin() dereferences, and the gesture dies there.
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    const before = starts(h);
    h.touch.start(10, 300, addRow(h));
    h.touch.move(80, 302);
    const armed = starts(h) > before;
    h.touch.end(80, 302); await ms(h); await fireSettle(h);
    assert.equal(armed, true,
      'currentDesc() must stay total: after the superseded settle AND one further navigation a fresh '
      + 'left-edge back gesture must still go live (at HEAD navStack[len-2] is `undefined`, so begin() bails)');

    await assertInstrumentLive(h, inst, 'NAVSTALE drive F');
  } finally { inst.restore(); h.dispose(); }
});

test('NAVSTALE (drive F CONTROL) — the same commit with no mid-settle tap throws nothing, lands the '
  + "gesture's own destination and reports nav=applied",
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  const inst = instrumentTimers(h);
  try {
    await fixtureF(h);
    await fwdCommit(h, addRow(h));
    await fireSettle(h);

    assert.deepEqual(inst.thrown, [], 'the uninterfered commit must not throw (it does not at HEAD either — this is the control)');
    assert.equal(landed(h), 'options', "the uninterfered forward commit lands the gesture's own destination");
    assert.equal(navToken(h, 1), 'applied',
      `the uninterfered commit must report nav=applied; got ${JSON.stringify(settles(h)[1])}`);
    // The control's throw count is READ, not assumed: a counter reading 0 on the drive AND on the
    // control is only meaningful once the counter is shown able to fire.
    await assertInstrumentLive(h, inst, 'NAVSTALE drive F control');
  } finally { inst.restore(); h.dispose(); }
});

test("NAVSTALE (drive B′, back branch, NO library data) — a shipped #dgBack in the settle window "
  + 'pops navStack to its root without the commit throwing, and reports nav=superseded',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  const inst = instrumentTimers(h);
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);      // navStack = [home, books]
    await backCommit(h, addRow(h));
    // The SHIPPED #dgBack listener, bound unconditionally at boot (js/app.js:3091). `books` is not
    // a settings sub, so closeSub delegates to goBack() (js/app.js:177 → 145) and pops to [home].
    // No chapter list, no library fixture — this is why the back branch needs no new fixture.
    h.tap('#dgBack');
    await fireSettle(h);

    assert.deepEqual(inst.thrown, [],
      'the back-branch commit must not pop an already-emptied navStack — at HEAD this records 1 × '
      + `"Cannot read properties of undefined (reading 'v')"; got ${JSON.stringify(inst.thrown)}`);
    assert.equal(navToken(h, 0), 'superseded',
      `the settle line must report nav=superseded; got ${JSON.stringify(settles(h)[0])}`);
    assert.equal(landed(h), 'home', 'the user must be left where the shipped back control put them');
    await assertInstrumentLive(h, inst, 'NAVSTALE drive B′');
  } finally { inst.restore(); h.dispose(); }
});

test("NAVSTALE (drive B′ CONTROL) — the same back commit with no mid-settle tap throws nothing and "
  + 'reports nav=applied',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  const inst = instrumentTimers(h);
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    await backCommit(h, addRow(h));
    await fireSettle(h);

    assert.deepEqual(inst.thrown, [], 'the uninterfered back commit must not throw (the control)');
    assert.equal(landed(h), 'home', 'the uninterfered back commit lands home');
    assert.equal(navToken(h, 0), 'applied',
      `the uninterfered back commit must report nav=applied; got ${JSON.stringify(settles(h)[0])}`);
    await assertInstrumentLive(h, inst, 'NAVSTALE drive B′ control');
  } finally { inst.restore(); h.dispose(); }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// NAVIDENT (§9, integration) — the OBJECT-IDENTITY conjunct is load-bearing, and is defended by the
// class of interference that leaves the stacks the RIGHT SHAPE and only changes WHICH screen the
// top descriptor names. Neither drive throws at HEAD; the damage is a wrong landing.
//
// RED AT HEAD (confirmed): drive I lands `home` (the user tapped Books and was returned to Home);
// drive S lands `browse` (‹ Back overshot the hub by one screen). Required: `browse` and `options`.
//
// MUTANTS: NAVSTALE-a (identity conjunct deleted) — MEASURED to redden BOTH drives; NAVIDENT-a
// (identity weakened to a `.v` comparison) — MEASURED to redden drive I and NOT drive S, which is
// why drive I may not be dropped: it is the only drive where object identity and value equality
// disagree, the distinction Engineering Contract §4.12 exists to force.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
test('NAVIDENT (drive I, same-view replacement) — re-tapping the ALREADY-OPEN Books tab inside the '
  + 'settle window leaves the user on Books, not on the screen the gesture was heading for',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);      // navStack = [home, books]
    await backCommit(h, addRow(h));                        // committed Books → Home
    // navTo's same-view branch (js/app.js:139) REPLACES the top descriptor with a fresh object
    // carrying the same `.v` — so `.v` equality still holds and only object identity has changed.
    h.tap('.navbtn[data-nav="books"]');
    await fireSettle(h);

    assert.equal(landed(h), 'browse',
      'the user tapped Books inside the settle window and must be left on Books — at HEAD the commit '
      + 'pops the replacement and returns them to Home');
    assert.equal(navToken(h, 0), 'superseded',
      `the settle line must report nav=superseded; got ${JSON.stringify(settles(h)[0])}`);
  } finally { h.dispose(); }
});

test('NAVIDENT (drive I CONTROL) — with no mid-settle tap the same gesture lands Home and reports nav=applied',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    await backCommit(h, addRow(h));
    await fireSettle(h);
    assert.equal(landed(h), 'home', "the uninterfered back commit lands the gesture's own destination");
    assert.equal(navToken(h, 0), 'applied', `expected nav=applied; got ${JSON.stringify(settles(h)[0])}`);
  } finally { h.dispose(); }
});

test("NAVIDENT (drive S, settings ‹ Back) — a sub-screen's own back control inside the settle window "
  + 'lands the Options hub, not one screen further back',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await fixtureSub(h);                                   // [home, books, options, general]
    await backCommit(h, h.$('general'));                   // committed general → options
    h.tap('#dgBack');                                      // closeSub pops the sub, INSIDE the window
    await fireSettle(h);

    assert.equal(landed(h), 'options',
      'the ‹ Back the user pressed must land the Options hub — at HEAD the commit pops `options` as '
      + 'well and overshoots to browse');
    assert.equal(navToken(h, 0), 'superseded',
      `the settle line must report nav=superseded; got ${JSON.stringify(settles(h)[0])}`);
  } finally { h.dispose(); }
});

test('NAVIDENT (drive S CONTROL) — with no mid-settle tap the same gesture lands the hub and reports nav=applied',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await fixtureSub(h);
    await backCommit(h, h.$('general'));
    await fireSettle(h);
    assert.equal(landed(h), 'options', "the uninterfered back commit lands the gesture's own destination");
    assert.equal(navToken(h, 0), 'applied', `expected nav=applied; got ${JSON.stringify(settles(h)[0])}`);
  } finally { h.dispose(); }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// NAVPAIR (§9, integration) — the FORWARD-STACK conjunct is load-bearing against an interference
// the identity conjunct CANNOT see: a PAIR of settle-window navigations that CANCEL on navStack
// while replacing fwdStack's top. At finalize `currentDesc()` is the SAME OBJECT the gesture
// captured as `cur.from`, so the identity conjunct is satisfied and only the forward conjunct
// refuses. A per-writer enumeration cannot see this class (plan §5, §12).
//
// RED AT HEAD (confirmed): drive T lands `playback` — neither the gesture's destination (`general`)
// nor the user's last explicit action (`options`) — while its control lands `general`.
//
// MUTANT: NAVTOTAL-b (the fwdStack identity comparison deleted) — MEASURED to redden drive T and NO
// other drive this suite constructs, so drive T is this registration's only witness here. Expected
// killing cell is NAVPAIR, NOT NAVTOTAL. (The plan reviewer measured that the CLASS has 8 witnesses
// among shipped controls, the cheapest being a bottom-nav tap followed by #dgBack; drive T is the
// one the plan constructs and the one this cell drives.)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
test('NAVPAIR (drive T, identity-preserving PAIR) — openSub then closeSub inside the settle window '
  + 'leaves the user on the hub they are standing on, not on the sub the pair left on fwdStack',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await fixtureT(h);                                     // [home, books, options], fwdStack [general]
    await fwdCommit(h, h.$('options'));                    // committed forward replay options → general
    // TWO shipped controls that CANCEL on navStack: a hub row (openSub — pushes and clears fwdStack)
    // then that sub-screen's own ‹ Back (closeSub — pops it back and pushes it onto fwdStack).
    // navStack ends byte-for-byte as it was, TOP OBJECT IDENTITY INCLUDED; fwdStack's top is now
    // `playback`, not `general`.
    h.tap('.hubrow[data-sub="playback"]');
    h.tap('#dgBack');
    await fireSettle(h);

    assert.equal(landed(h), 'options',
      'the user must be left on the hub their last explicit action reached — at HEAD the commit '
      + 'replays fwdStack\'s NEW top and lands `playback`, a screen neither the gesture nor the user chose');
    assert.equal(navToken(h, 1), 'superseded',
      `the settle line must report nav=superseded; got ${JSON.stringify(settles(h)[1])}`);
  } finally { h.dispose(); }
});

test('NAVPAIR (drive T CONTROL) — with neither mid-settle tap the same forward replay lands `general` '
  + 'and reports nav=applied',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await fixtureT(h);
    await fwdCommit(h, h.$('options'));
    await fireSettle(h);
    assert.equal(landed(h), 'general', "the uninterfered forward replay lands the gesture's own destination");
    assert.equal(navToken(h, 1), 'applied', `expected nav=applied; got ${JSON.stringify(settles(h)[1])}`);
  } finally { h.dispose(); }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// NAVRECONCILE (§9, integration) — a stack-superseded settle reconciles the screen the stacks NOW
// name and writes NO scroll: it neither restores the pre-gesture document scroll (which belongs to
// a screen the user has left) nor lets resetScroll default to true and jump the newer screen to its
// top (js/nav.js:125). An ordinary commit and an ordinary abort keep their existing scroll
// behaviour.
//
// ⚠️ THE FIXTURE IS NOT §9's LITERAL ONE, AND THAT IS A ROUTED FINDING. §9's fixture text says to
// drive §1's FORWARD sequence with the mid-settle tap landing on a scroll-resetting screen. Driven
// literally (MEASURED, not read) that cell is VACUOUSLY GREEN AT HEAD on every clause: the forward
// sequence THROWS at js/app.js:1021 before reaching the reconcile, so at HEAD no scroll is written
// and the landed screen already equals the post-fix value. This cell uses the NON-THROWING
// interference instead — a bottom-nav Options tap inside a back-commit out of a settings sub — so
// the reconcile is actually reached at HEAD and the cell is red-first. The interference is `navTo`
// with no filmstrip, chosen because `openSub`'s own deferred overlayFilmstrip reconcile re-zeroes
// the panel it opened (MEASURED) and would make the scroll clause unsatisfiable by any build.
// Routed to the planner; see Claude/Curie/RED-swipe-navstack-settle-window.md.
//
// RED AT HEAD (confirmed): the settle lands `general` (the screen the gesture was heading for) and
// zeroes #general.scrollTop, where the user's tap had reached `options`.
// MUTANTS: NAVRECONCILE-a (the explicit no-reset option dropped) — reddens the #options.scrollTop
// clause (MEASURED: 300 → 0). NAVRECONCILE-b (the abort scroll restore appended) — reddens the
// document-scroll clause (MEASURED: 0 → 1 recorded window.scrollTo). Both scroll clauses are GREEN
// at HEAD and are defended by those mutants, not by the red-first demonstration; the two control
// cells below are their in-suite proof of non-blindness — the SAME assertions read 0 and 1 there.
// NAVSTALE-a additionally reddens this cell's landed-screen clause (MEASURED); that is an extra
// witness, not drift.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
test('NAVRECONCILE — a stack-superseded settle reconciles the screen the stacks now name and writes '
  + 'NO scroll, neither the panel reset nor the pre-gesture document scroll',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await fixtureSub(h);                                   // [home, books, options, general]
    await backCommit(h, h.$('general'));                   // committed general → options
    h.tap('.navbtn[data-nav="options"]');                  // navTo, INSIDE the window
    // Seeded AFTER the tap, so these are offsets the interfering navigation itself left behind and
    // only the settle can disturb.
    h.$('options').scrollTop = 300;
    h.$('general').scrollTop = 400;
    const scrollsBefore = scrollCalls(h);
    await fireSettle(h);

    assert.equal(landed(h), 'options',
      'the superseded settle must reconcile the screen the stacks now name — at HEAD it pops and '
      + "renders the gesture's own destination `general` instead");
    assert.equal(h.$('options').scrollTop, 300,
      'the superseded reconcile must NOT let resetScroll default to true and jump the newer screen '
      + 'to its top (mutant NAVRECONCILE-a)');
    assert.equal(scrollCalls(h) - scrollsBefore, 0,
      'the superseded reconcile must NOT restore the pre-gesture document scroll — that offset '
      + 'belongs to a screen the user has left (mutant NAVRECONCILE-b)');
    assert.equal(h.$('general').scrollTop, 400,
      "the superseded settle must not touch the departed screen's panel offset either — at HEAD it "
      + 'renders `general` and zeroes it');
    assert.equal(navToken(h, 0), 'superseded',
      `the settle line must report nav=superseded; got ${JSON.stringify(settles(h)[0])}`);
  } finally { h.dispose(); }
});

test('NAVRECONCILE (CONTROL 1, plain commit) — an ordinary commit STILL issues the panel scroll '
  + 'reset it issues today',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await fixtureSub(h);
    await backCommit(h, h.$('general'));
    h.$('options').scrollTop = 300;                        // seeded, then the plain commit must reset it
    await fireSettle(h);
    assert.equal(landed(h), 'options', "the plain commit lands the gesture's own destination");
    assert.equal(h.$('options').scrollTop, 0,
      'the ORDINARY commit path keeps its existing behaviour: applyScreen(dest, { render:false }) '
      + 'resets the destination panel. This is also the proof the scrollTop oracle above is not '
      + 'blind — the identical read returns 0 here and 300 on the superseded drive.');
  } finally { h.dispose(); }
});

test('NAVRECONCILE (CONTROL 2, plain abort) — an ordinary abort STILL issues the document scroll '
  + 'restore it issues today',
async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    const el = addRow(h);
    h.touch.start(10, 300, el);
    h.touch.move(80, 302); await realSleep(14);
    h.touch.move(200, 304); await realSleep(14);
    h.touch.move(30, 304); await realSleep(14);            // back inside THRESH → abort
    h.touch.end(30, 304); await ms(h);
    const scrollsBefore = scrollCalls(h);
    await fireSettle(h);
    assert.ok(/abort/.test(settles(h)[0] || ''), `fixture: it must have aborted — got ${settles(h)[0]}`);
    assert.equal(scrollCalls(h) - scrollsBefore, 1,
      'the ORDINARY abort path keeps its window.scrollTo(0, cur.scroll0) restore. This is also the '
      + 'proof the document-scroll oracle above is not blind — the identical delta reads 1 here and '
      + '0 on the superseded drive.');
  } finally { h.dispose(); }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// NAVAPPLIES (§9, integration) — THE PRESERVATION CELL, PLUS THE TOKEN CLAUSE. An UNINTERFERED
// committed gesture still mutates the stacks exactly as it does today on all three commit branches,
// and an ABORTED gesture still mutates neither. The four stack cells carry NO SKIP: they are green
// at HEAD and must stay green through every build in this slice. They are what stops the guard
// being written so tight that the ordinary case stops working.
//
// AND the settle line the gesture emits must NAME THE OUTCOME THAT ACTUALLY OCCURRED. That is the
// fifth cell below, and it is the one that carries a skip.
//
// MUTANTS: NAVAPPLIES-a is the RE-ANCHORED existing registration `swipe: abort mutates the nav
// stack like a commit`, whose killing cell stays the existing I11 abort cell — NOT this one.
// NAVAPPLIES-b (the whole conditional block deleted, so a clean commit mutates nothing) is expected
// to redden HERE: with no mutation the settle reconciles the source screen and every landed-screen
// assertion below flips. NAVTOKEN-a (the abort arm deleted from the settle line's token, so the
// two-arm ternary returns) is expected to redden the token cell alone.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
test('NAVAPPLIES (back branch) — a clean back commit still moves navStack\'s top onto fwdStack: it '
  + 'lands home AND leaves a forward gesture armable', async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    await backCommit(h, addRow(h));
    await fireSettle(h);
    assert.equal(landed(h), 'home', 'the clean back commit lands home (mutant NAVAPPLIES-b lands browse)');
    // fwdStack must hold `books`, and the only non-invasive way to read that is that a right-edge
    // forward gesture can now arm at all (begin() returns early on an empty fwdStack).
    const before = starts(h);
    const rx = h.window.innerWidth - 2;
    h.touch.start(rx, 300, h.$('home'));
    h.touch.move(rx - 80, 302);
    const armed = starts(h) > before;
    h.touch.end(rx - 80, 302); await ms(h); await fireSettle(h);
    assert.equal(armed, true, 'the back commit must have pushed the source onto fwdStack — a forward gesture must arm');
  } finally { h.dispose(); }
});

test('NAVAPPLIES (forward replay branch) — a clean forward commit still moves fwdStack\'s top back '
  + 'onto navStack', async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    await backCommit(h, addRow(h));
    await fireSettle(h);
    assert.equal(landed(h), 'home', 'fixture: the back commit must land home, leaving fwdStack=[books]');
    await fwdCommit(h, h.$('home'));
    await fireSettle(h);
    assert.equal(landed(h), 'browse', 'the clean forward replay lands the screen fwdStack held');
  } finally { h.dispose(); }
});

test('NAVAPPLIES (newNav branch) — a clean NP → chapter-list forward commit still pushes the '
  + 'captured destination and clears fwdStack', async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await ms(h);
    const cover = h.document.querySelector('[data-book="bookA"] .covertap');
    assert.ok(cover, 'fixture: a book tile must be present to start playback from');
    cover.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await ms(h);
    h.tap('#player'); await ms(h);                          // mini-player → Now Playing
    assert.equal(landed(h), 'nowplaying', 'fixture: Now Playing must be the current screen');

    await fwdCommit(h, h.$('nowplaying'));                  // right edge on NP → the chapter list
    await fireSettle(h);
    assert.equal(landed(h), 'browse', 'the newNav commit lands the chapter list in the browse host');
    const files = h.log.calls.filter((c) => c.name === 'browse.render' && c.args[0] === 'files');
    assert.ok(files.length > 0, 'the chapter list for the current book must have been rendered');
    // newNav CLEARS fwdStack, so nothing may be replayable forward from here.
    const before = starts(h);
    const rx = h.window.innerWidth - 2;
    h.touch.start(rx, 300, addRow(h));
    h.touch.move(rx - 80, 302);
    const armed = starts(h) > before;
    h.touch.end(rx - 80, 302); await ms(h); await fireSettle(h);
    assert.equal(armed, false, 'a fresh forward navigation clears fwdStack — no forward gesture may arm after it');
  } finally { h.dispose(); }
});

test('NAVAPPLIES (abort) — an aborted gesture still mutates NEITHER stack', async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    const el = addRow(h);
    h.touch.start(10, 300, el);
    h.touch.move(80, 302); await realSleep(14);
    h.touch.move(200, 304); await realSleep(14);
    h.touch.move(30, 304); await realSleep(14);
    h.touch.end(30, 304); await ms(h);
    await fireSettle(h);
    assert.ok(/abort/.test(settles(h)[0] || ''), `fixture: it must have aborted — got ${settles(h)[0]}`);
    assert.equal(landed(h), 'browse', 'the abort leaves the source screen showing');
    // navStack must be UNCHANGED ([home, books]) — a following back commit still reaches home.
    await backCommit(h, addRow(h));
    await fireSettle(h);
    assert.equal(landed(h), 'home',
      'the abort must not have popped navStack — the next back commit must still reach home');
  } finally { h.dispose(); }
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
// NAVAPPLIES — THE ABORT-TOKEN CLAUSE (§9 contract claim (c), dimension 4(c), and dimension 10's
// device-log oracle half). Added at the post-review amendment (plan §13 step 9a, §16 F1/O3).
//
// THE CLAIM. The `nav=` token names what the gesture did to the nav stacks and why, and that has
// THREE outcomes, not two (plan §5's table is the whole domain): the gesture wrote them (`applied`);
// it was entitled to write and a newer navigation invalidated the claim (`superseded`); or it never
// claimed the right at all, because the user did not complete the gesture (`abort`). `superseded` is
// defined for `commit === true` ALONE.
//
// RED AT `c488677`, MEASURED by running this cell with the skip removed: the shipped token is
// `nav=${applies ? 'applied' : 'superseded'}` and `applies` is `commit && …`, so it is false on an
// abort BY CONSTRUCTION and an uninterfered abort's settle line reads `nav=superseded` — a
// supersession that did not happen, on roughly half of every device log's settle lines. The build
// that greens this is §4.1's three-arm token, plan §13 step 9b.
//
// ⛔ THE PAIRING IS THE ORACLE'S PROOF OF NON-BLINDNESS, AND IT IS WHY BOTH DRIVES ARE IN ONE RUN.
// A cell asserting only "the abort line reads abort" could be satisfied by a token that read
// `abort` on every settle line, commit and abort alike — the same class of worthless observable the
// two-arm token already is, inverted. So the COMMIT half is read FIRST, by the SAME reader, from
// the SAME recorded debug channel, in the SAME booted app: at `c488677` that half PASSES (`applied`)
// and the abort half then FAILS (`superseded`, required `abort`). One reader, one run, one value
// accepted and one rejected — which is the demonstration that this oracle can fail, rather than an
// assertion that it can.
//
// MUTANT: NAVTOKEN-a (plan §9) deletes the abort arm, returning the two-arm ternary. MEASURED, not
// read: applied to §4.1's amended source it reproduces `c488677`'s (and `e80fcbe`'s, and
// `8acbdff`'s — one identical blob) `js/app.js` BYTE FOR BYTE, so the registered mutant is the
// shipped defect exactly and not an approximation of it.
// ───────────────────────────────────────────────────────────────────────────────────────────────
test('NAVAPPLIES (abort token) — an uninterfered ABORT reports nav=abort and NEVER a supersession, '
  + 'paired IN THE SAME RUN with an uninterfered commit reporting nav=applied',
{ skip: SKIP }, async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);

    // (1) An uninterfered ABORT: released back inside THRESH, and NO mid-settle input of any kind.
    const el = addRow(h);
    h.touch.start(10, 300, el);
    h.touch.move(80, 302); await realSleep(14);
    h.touch.move(200, 304); await realSleep(14);
    h.touch.move(30, 304); await realSleep(14);
    h.touch.end(30, 304); await ms(h);
    await fireSettle(h);

    // (2) An uninterfered COMMIT, in the SAME run, read by the SAME oracle.
    await backCommit(h, addRow(h));
    await fireSettle(h);

    // Fixture first: the two settle lines must really be an abort and a commit, read from the
    // statement's OWN `${commit ? 'commit' : 'abort'}` interpolation and not from the token under
    // test — otherwise a token failure and a drive that did not do what it was asked look alike.
    assert.match(settles(h)[0] || '', /^#\d+ abort back /,
      `fixture: settle line 0 must be the ABORT — got ${JSON.stringify(settles(h)[0])}`);
    assert.match(settles(h)[1] || '', /^#\d+ commit back /,
      `fixture: settle line 1 must be the COMMIT — got ${JSON.stringify(settles(h)[1])}`);
    assert.equal(landed(h), 'home',
      'fixture: the commit was uninterfered, so it landed its own destination and its claim held');

    // The PAIRED half, read first. Green at c488677 and after the build alike.
    assert.equal(navToken(h, 1), 'applied',
      'an uninterfered commit whose claim still held must report nav=applied — this half is the '
      + 'proof the reader is not blind, so if it fails the abort assertion below proves nothing '
      + `(line: ${JSON.stringify(settles(h)[1])})`);

    // The clause. RED at c488677: this reads `superseded`.
    assert.equal(navToken(h, 0), 'abort',
      'an ABORTED gesture never held a claim on the nav stacks for a newer navigation to '
      + 'invalidate, so its settle line must report nav=abort. `superseded` here is a supersession '
      + 'that did not happen, and plan §5 defines that word for a commit ALONE (mutant NAVTOKEN-a '
      + `deletes exactly this arm; line: ${JSON.stringify(settles(h)[0])})`);
  } finally { h.dispose(); }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// NAVTOTAL (§9, SOURCE) — the DESCRIPTOR-STACK LENGTH conjunct is PRESENT in the predicate, so the
// navStack pop cannot produce an absent value even if a future stack writer preserved the top's
// identity.
//
// ⚠️ THIS IS A SOURCE CELL AND THE PLAN SAYS SO. Its honesty label, stated with the drive set it
// ranges over: deleting this conjunct (mutant NAVTOTAL-a) is indistinguishable from the specified
// predicate across the FIVE drives this plan constructs — F, I, S, T and B′ — which is MEASURED,
// and is NEVER a claim that no reachable drive isolates it. (The plan reviewer additionally ran an
// exhaustive search over interference SEQUENCES — 10 shipped controls, every sequence to length 3,
// 3 fixtures, 2333 sequences — and found 0 differences, with positive controls proving the same
// machinery finds NAVTOTAL-b's killer at length 2 and NAVSTALE-a's at length ≤2.) The forward
// conjunct is NOT pinned here: it has a behavioural killer, NAVPAIR.
//
// RED AT HEAD (confirmed): there is no `const applies = …` predicate in js/app.js at all.
// PROVEN ABLE TO FAIL: the acceptance cells below run the SAME extractor over synthetic predicate
// text with and without the conjunct, so this cell is not a scan that could only ever say yes.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** The single `const applies = …;` declaration's text, or a reason it could not be read. */
function appliesPredicate(src) {
  const at = src.indexOf('const applies = ');
  if (at === -1) return { ok: false, reason: 'NO PREDICATE: js/app.js declares no `const applies = …`' };
  if (src.indexOf('const applies = ', at + 1) !== -1) {
    return { ok: false, reason: 'NON-UNIQUE: js/app.js declares `const applies = …` more than once' };
  }
  const end = src.indexOf(';', at);
  if (end === -1) return { ok: false, reason: 'UNTERMINATED: the `const applies` declaration has no `;`' };
  return { ok: true, text: src.slice(at, end + 1) };
}
const hasStackLengthConjunct = (p) => p.ok && /navStack\.length\s*>\s*1/.test(p.text);

test('NAVTOTAL — the staleness predicate in js/app.js carries the navStack.length > 1 conjunct (source)',
() => {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  const p = appliesPredicate(src);
  assert.ok(p.ok, `the settle-window staleness predicate must exist as ONE \`const applies = …;\` — ${p.reason}`);
  assert.ok(hasStackLengthConjunct(p),
    'the back branch must be made TOTAL BY CONSTRUCTION with `navStack.length > 1`, so the pop cannot '
    + 'produce an absent value even if a future writer preserved the top descriptor\'s identity '
    + `(mutant NAVTOTAL-a deletes exactly this); got: ${p.text}`);
});

test('NAVTOTAL acceptance — the extractor ACCEPTS the specified predicate and REFUSES the '
  + 'NAVTOTAL-a form (proves this cell can fail)', () => {
  const spec = "        const applies = commit && currentDesc() === cur.from\n"
    + "          && (cur.dir === 'back' ? navStack.length > 1\n"
    + "            : cur.newNav ? true\n"
    + "              : fwdStack[fwdStack.length - 1] === cur.dest);\n";
  const nta = spec.replace('navStack.length > 1', 'true');
  assert.equal(hasStackLengthConjunct(appliesPredicate(spec)), true,
    'the specified predicate must PASS — otherwise this cell is unsatisfiable by a correct build');
  assert.equal(hasStackLengthConjunct(appliesPredicate(nta)), false,
    'the NAVTOTAL-a form must FAIL — otherwise the source cell is credited while defending nothing');
  assert.equal(appliesPredicate('const x = 1;').ok, false, 'a source with no predicate at all must be refused');
  assert.equal(appliesPredicate(spec + spec).ok, false, 'two declarations must be refused as NON-UNIQUE, not silently first-wins');
});
