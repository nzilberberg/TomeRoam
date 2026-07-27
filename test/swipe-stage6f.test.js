// STAGE 6f of PLAN-swipe-reveal.md (sub-plan Claude/Plans/PLAN-swipe-stage6f.md) — the
// RED suite for the FIRST slice of the structural fix: for an IN-FLOW→OVERLAY gesture the
// OUTGOING becomes an owned-pane app-ghost instead of the transformed real in-flow view, so
// the real #browse / #home is NEVER a mover and NEVER receives a swipe transform on those
// transitions. Authored red BEFORE the one-line js/swipe.js constructionPlanFor change, per
// the red-first law.
//
// WHAT THIS SLICE CHANGES (plan §2/§4). The sole production edit is the outgoing decision
// value for in-flow→overlay (browse/home → options/nowplaying/general/playback/buffering/
// downloads/diagnostics): 'real-source' → 'app-ghost'. Everything downstream (the app-ghost
// build, the mover mapping, disposal, the plain no-hold reveal) is UNCHANGED — it already
// ships for browse→browse.
//
// CELL MAP (plan §7/§8). This file holds all six NEW behaviour cells:
//   SIbrowse  red-first  the load-bearing invariant — driving a REAL browse→overlay gesture,
//                        the real in-flow #browse is never a mover and carries NO inline
//                        transform mid-drag (RED @HEAD: today #browse is the outgoing
//                        borrowed-real mover and gets translateX at app.js:576).
//   SIhome    red-first  the same for a REAL home→overlay gesture on the real #home.
//   GHOST     red-first  the outgoing is an owned-pane app-ghost — a `.nav-ghost` present
//                        during the drag and disposed exactly once on BOTH commit and abort
//                        (RED @HEAD: today no pane is built for in-flow→overlay).
//   MODEL     red-first  the production contract oracle — constructionPlanFor's outgoing for
//                        every in-flow→overlay structural + NP-modifier case is 'app-ghost'
//                        (RED @HEAD: production still returns 'real-source'), while the
//                        UNCHANGED families (in-flow→home, in-flow→browse, overlay→*) hold —
//                        a guard against over-broadening the flip.
//   REVEAL    parity     commit→overlay and abort→browse take the PLAIN no-hold dropPanes
//                        path (never holdGhostUntilPaintable). Non-vacuity control: the SAME
//                        assertion applied to a shipped browse→browse ABORT — which DOES hold
//                        — fails, proving the check can tell a hold from a no-hold. Its
//                        dedicated "introduce a hold on the overlay reveal" mutant is Brunel's
//                        §9 registration obligation.
//   DEC       parity     a browse→nowplaying gesture still clones the NP pill decoration while
//                        the outgoing is an app-ghost. Mutation-proven by the EXISTING
//                        registered mutant "swipe4 F1: buildConstruction ignores
//                        plan.decorations" (tools/mutate.mjs) — dropping the decoration loop
//                        removes the `.np-pill-float` and reddens this cell.
//
// ⚠️ SCOPE, honestly (plan §3 "the invariant is STRUCTURAL, not the flash"). jsdom has no
// layout/compositor, so NOTHING here speaks to the visual flash — that is device-only and
// downstream (plan §9). These cells pin the STRUCTURAL invariant: no swipe transform on the
// real in-flow view. The `.style.transform` read is the INLINE swipe write; the standing
// `#home.parked` STYLESHEET transform (css/app.css) is not an inline style and does not
// appear here (Loki STRIKE-swipe-stage6f-r1 residual 3), so reading `#home.style.transform`
// is not confounded by it.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { boot } = require('./app-harness.js');
const { ROOT } = require('./dom-fixture.js');

// The production classifier/planner, required DIRECTLY (no app boot) for the MODEL oracle —
// the same three-layer convention as test/swipe-transition.test.js.
const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));

// REAL wall clock, captured before boot() patches setTimeout. app.js move() resamples
// velocity only after >8ms of REAL time; synthetic moves fired back-to-back otherwise leave
// vx holding the outward flick and a gesture meant to abort commits instead.
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const ghostCount = (h) => h.document.querySelectorAll('.nav-ghost').length;

/** A realized `.book` row inside #browse — a real node the finger grabs. */
function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}
/** A tile inside #home — the finger's grab node when HOME is the source. */
function addHomeTile(h) {
  const tile = h.document.createElement('div');
  tile.className = 'tile';
  h.$('home').appendChild(tile);
  return tile;
}

// ── stack setup (driven through the REAL nav buttons / player; nothing pokes navStack) ──
/** Options UNDER Books: navStack = [home, options, books]; a left-edge back-swipe is
 *  Books→Options (browse→overlay). */
async function optionsUnderBooks(h) {
  h.tap('.navbtn[data-nav="options"]');
  await settle(h);
  h.tap('.navbtn[data-nav="books"]');
  await settle(h);
}
/** Options UNDER Home: navStack = [home, options, home]; a left-edge back-swipe is
 *  Home→Options (home→overlay). */
async function optionsUnderHome(h) {
  h.tap('.navbtn[data-nav="options"]');
  await settle(h);
  h.tap('.navbtn[data-nav="home"]');
  await settle(h);
}
/** Authors UNDER Books: navStack = [home, books, authors]; a left-edge back-swipe is
 *  Authors→Books (browse→browse — the shipped app-ghost + HOLDING-abort path). */
async function authorsUnderBooks(h) {
  h.tap('.navbtn[data-nav="books"]');
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
}

/**
 * Drive a gesture LIVE and leave it mid-drag (past the 8px lock, horizontal → start() runs
 * and the first drag transform is applied in the same move()). Returns without ending, so a
 * test can read the real views' inline transform WHILE the drag is in flight.
 */
function goLiveDrag(h, target, toX = 120) {
  h.touch.start(10, 300, target);
  h.touch.move(toX, 302);
}
// ── SIbrowse (red-first) — the real #browse is never transformed on browse→overlay ──────
// §3 invariant + §8 SIbrowse. The load-bearing promise: for a real browse→overlay gesture the
// real in-flow #browse is not a mover and carries no swipe-written inline transform. RED @HEAD
// because today constructionPlanFor returns outgoing='real-source', so #browse IS the outgoing
// borrowed-real mover and app.js move() writes translateX onto it. Mutation (plan §8): revert
// the outgoing to 'real-source' → this reddens again.
test('SIbrowse — a real browse→overlay gesture never writes a swipe transform onto the real #browse', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await optionsUnderBooks(h);                 // navStack = [home, options, books]
    const row = addRow(h);

    goLiveDrag(h, row);                          // live back-swipe Books→Options, mid-drag

    assert.equal(starts(h).length, 1,
      `fixture sanity: the browse→overlay gesture must go LIVE (start() runs) — got ${JSON.stringify(swipeLog(h))}`);
    // THE INVARIANT. At HEAD #browse is the outgoing mover and carries translateX(<t>px) here.
    assert.equal(h.$('browse').style.transform, '',
      'the real in-flow #browse must carry NO swipe transform mid-drag — it must not be a mover '
      + `on browse→overlay; got '${h.$('browse').style.transform}'`);
  } finally { h.dispose(); }
});

// ── SIhome (red-first) — the real #home is never transformed on home→overlay ────────────
// §8 SIhome. The home-source twin of SIbrowse. RED @HEAD for the same reason (outgoing
// 'real-source' → #home is the outgoing mover). The inline read is not confounded by the
// standing #home.parked stylesheet transform (residual 3): home is the visible SOURCE here,
// not parked, and .style.transform reads only the inline swipe write.
test('SIhome — a real home→overlay gesture never writes a swipe transform onto the real #home', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await optionsUnderHome(h);                  // navStack = [home, options, home]
    const tile = addHomeTile(h);

    goLiveDrag(h, tile);                         // live back-swipe Home→Options, mid-drag

    assert.equal(starts(h).length, 1,
      `fixture sanity: the home→overlay gesture must go LIVE — got ${JSON.stringify(swipeLog(h))}`);
    assert.ok(!h.$('home').classList.contains('parked'),
      'fixture sanity: HOME is the visible source (not parked) — the inline read is the swipe write, not .parked');
    assert.equal(h.$('home').style.transform, '',
      'the real in-flow #home must carry NO swipe transform mid-drag — it must not be a mover '
      + `on home→overlay; got '${h.$('home').style.transform}'`);
  } finally { h.dispose(); }
});

// ── GHOST (red-first) — the outgoing is an owned-pane app-ghost, disposed once per exit ──
// §8 GHOST + I2. The outgoing must be represented by an owned-pane `.nav-ghost` present during
// the drag and disposed exactly once on the exit. Each test asserts the DURING-DRAG presence
// (RED @HEAD: today in-flow→overlay builds NO pane, so there is 0 `.nav-ghost` during the drag —
// the first assertion fails for the intended reason) AND then, once the fix lands, the disposal
// on exit — so neither test is a vacuous green (the disposal alone would pass at HEAD with no
// pane to leak; folding it behind the RED during-drag assertion keeps the whole test falsifiable
// now). Mutation (plan §8): force the outgoing back to 'real-source' → no ghost is built.
test('GHOST — the browse→overlay outgoing is an owned-pane app-ghost, disposed on COMMIT', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await optionsUnderBooks(h);
    const row = addRow(h);

    h.touch.start(10, 300, row);
    h.touch.move(80, 302);                        // live + first drag → the outgoing pane is built
    assert.equal(starts(h).length, 1, 'fixture sanity: the gesture went live');
    // THE INVARIANT (RED @HEAD: 0 — no owned pane exists for in-flow→overlay today).
    assert.equal(ghostCount(h), 1,
      `the browse→overlay outgoing must be an owned-pane .nav-ghost during the drag; got ${ghostCount(h)}`);

    await realSleep(12);
    h.touch.move(700, 303); await realSleep(12);
    h.touch.move(900, 303); await realSleep(12);
    h.touch.end(920, 303);
    await settle(h); await h.clock.advance(400); await settle(h);

    assert.ok(settles(h).some((m) => /^#\d+ commit /.test(m)),
      `fixture sanity: the browse→overlay gesture must COMMIT — got ${JSON.stringify(swipeLog(h))}`);
    assert.equal(ghostCount(h), 0,
      'after a committed browse→overlay the owned app-ghost must be disposed exactly once — no leaked pane');
  } finally { h.dispose(); }
});

test('GHOST — the browse→overlay outgoing is an owned-pane app-ghost, disposed on ABORT', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await optionsUnderBooks(h);
    const row = addRow(h);

    h.touch.start(10, 300, row);
    h.touch.move(80, 302);                        // live + first drag → the outgoing pane is built
    assert.equal(starts(h).length, 1, 'fixture sanity: the gesture went live');
    assert.equal(ghostCount(h), 1,
      `the browse→overlay outgoing must be an owned-pane .nav-ghost during the drag; got ${ghostCount(h)}`);

    await realSleep(12);
    h.touch.move(200, 304); await realSleep(12);
    h.touch.move(30, 304); await realSleep(12);   // retreat → abort
    h.touch.end(30, 304);
    await settle(h); await h.clock.advance(400); await settle(h);

    assert.ok(settles(h).some((m) => /^#\d+ abort /.test(m)),
      `fixture sanity: the browse→overlay gesture must ABORT — got ${JSON.stringify(swipeLog(h))}`);
    assert.equal(ghostCount(h), 0,
      'after an aborted browse→overlay the owned app-ghost must be disposed exactly once — no leaked pane');
  } finally { h.dispose(); }
});

// ── MODEL (red-first) — the production oracle: outgoing is app-ghost for in-flow→overlay ─
// §8 MODEL, the contract layer. Asserts the real production constructionPlanFor directly
// against the EXPECTED value 'app-ghost' for every in-flow→overlay structural + NP-modifier
// case — RED @HEAD (production still returns 'real-source'), GREEN once Brunel flips the one
// production line. Asserting production-vs-expected (not against the frozen spec, which Brunel
// re-freezes in the same commit) keeps this cell red now and green after the coordinated edit
// (task note). The UNCHANGED families are guarded so the flip does not over-broaden.
const wf = (v) => v === 'authorBooks' ? { v, author: { ratingKey: 'A' } }
  : v === 'files' ? { v, book: { ratingKey: 'B' } } : { v };
const outgoingOf = (fv, tv) =>
  Swipe.constructionPlanFor(Swipe.classifyTransition({ from: wf(fv), to: wf(tv) })).outgoing;

test('MODEL — production constructionPlanFor makes the in-flow→overlay outgoing an app-ghost', () => {
  const IN_FLOW = ['home', 'books', 'authors', 'authorBooks', 'files'];
  const OVERLAYS = ['options', 'nowplaying', 'general', 'playback', 'buffering', 'downloads', 'diagnostics'];
  const wrong = [];
  for (const f of IN_FLOW) {
    for (const t of OVERLAYS) {
      const got = outgoingOf(f, t);
      if (got !== 'app-ghost') wrong.push(`${f}->${t} got '${got}' want 'app-ghost'`);
    }
  }
  assert.deepEqual(wrong, [],
    'every in-flow→overlay transition must build an app-ghost outgoing (the real in-flow view is '
    + `no longer the mover):\n  ${wrong.slice(0, 8).join('\n  ')}`);
});

test('MODEL — the flip does not over-broaden: the unchanged families keep their outgoing', () => {
  const wrong = [];
  // in-flow→home stays real-source (browse→home is deferred, plan §10).
  for (const f of ['books', 'authors', 'authorBooks', 'files']) {
    if (outgoingOf(f, 'home') !== 'real-source') wrong.push(`${f}->home must stay real-source`);
  }
  // in-flow→browse stays app-ghost (already ships).
  for (const f of ['home', 'books', 'authors']) {
    for (const t of ['books', 'authors']) {
      if (f === t) continue;
      if (outgoingOf(f, t) !== 'app-ghost') wrong.push(`${f}->${t} must stay app-ghost`);
    }
  }
  // overlay source stays real-source (out of this slice's scope entirely).
  for (const t of ['home', 'books', 'options', 'nowplaying']) {
    if (t === 'options') continue;
    if (outgoingOf('options', t) !== 'real-source') wrong.push(`options->${t} must stay real-source`);
  }
  assert.deepEqual(wrong, [], `an unchanged family was disturbed:\n  ${wrong.join('\n  ')}`);
});

// ── REVEAL (parity) — commit→overlay and abort→browse take the plain no-hold path ───────
// §8 REVEAL. in-flow→overlay must reveal via the immediate dropPanes() path, NEVER the held
// holdGhostUntilPaintable() path (which keeps an owned pane covering the view PAST finalize,
// awaiting paint frames). Under deferRaf the difference is observable: a no-hold path leaves
// NO ghost after the finalize timer WITHOUT running a paint frame; a held path keeps the ghost
// until frames run. GREEN @HEAD (in-flow→overlay never enters the hold path — at HEAD it has no
// pane at all; post-fix it drops the app-ghost immediately). Its dedicated "introduce a hold on
// the overlay reveal" mutant is Brunel's §9 registration obligation; the NON-VACUITY CONTROL
// below proves the assertion can distinguish a hold from a no-hold using the SHIPPED
// browse→browse abort (which genuinely holds).
async function drainRafThenFinalize(h) {
  for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();  // let settle's parked rAF run
  await settle(h);
  await h.clock.advance(400);                                         // fire the 340ms finalize
  await settle(h);
}
async function abortBackDeferred(h, target) {
  h.touch.start(10, 300, target);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(200, 304); await realSleep(12);
  h.touch.move(30, 304); await realSleep(12);
  h.touch.end(30, 304);
  await drainRafThenFinalize(h);
}

test('REVEAL — an aborted browse→overlay reveals with NO hold: no ghost survives finalize awaiting a paint frame', async () => {
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await optionsUnderBooks(h);
    await abortBackDeferred(h, addRow(h));

    assert.ok(settles(h).some((m) => /^#\d+ abort /.test(m)),
      `fixture sanity: the browse→overlay gesture must ABORT — got ${JSON.stringify(swipeLog(h))}`);
    // No reveal paint frame has been drained since finalize. A HELD reveal
    // (holdGhostUntilPaintable) would keep its owned pane covering the view here, awaiting a
    // painted frame; the immediate no-hold dropPanes() leaves none. (Reading ghost presence,
    // not h.raf.pending(): the no-hold path legitimately queues one watchFrames DIAGNOSTIC
    // frame, so a pending-frame count cannot tell a hold from a no-hold — the ghost can.)
    assert.equal(ghostCount(h), 0,
      'a browse→overlay reveal must be the immediate no-hold dropPanes — no ghost may outlive finalize '
      + 'awaiting a paint frame (the non-vacuity control below proves this check catches a real hold)');
  } finally { h.dispose(); }
});

test('REVEAL non-vacuity control — the SAME check FAILS on a shipped browse→browse abort, which DOES hold', async () => {
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await authorsUnderBooks(h);              // browse→browse: the shipped HOLDING-abort path
    // Drive the abort but STOP at finalize WITHOUT draining the reveal's paint frames.
    h.touch.start(10, 300, addRow(h));
    h.touch.move(80, 302); await realSleep(12);
    h.touch.move(200, 304); await realSleep(12);
    h.touch.move(30, 304); await realSleep(12);
    h.touch.end(30, 304);
    for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();   // run the SETTLE rAF only
    await settle(h);
    await h.clock.advance(400);              // finalize fires → the browse→browse abort HOLDS the ghost
    await settle(h);

    assert.ok(settles(h).some((m) => /^#\d+ abort /.test(m)),
      `fixture sanity: this browse→browse gesture must ABORT — got ${JSON.stringify(swipeLog(h))}`);
    // The held path keeps the ghost covering until a PAINT frame lands — so the no-hold
    // assertion (ghostCount === 0 with no pending frame) must NOT hold here. If it did, the
    // REVEAL assertion above could not tell a hold from a no-hold and would be vacuous.
    const noHold = (h.raf.pending() === 0 && ghostCount(h) === 0);
    assert.equal(noHold, false,
      'the shipped browse→browse abort HOLDS the ghost past finalize; the no-hold check must reject it '
      + `(pending frames=${h.raf.pending()}, ghosts=${ghostCount(h)})`);
  } finally { h.dispose(); }
});

// ── DEC (parity) — the NP pill decoration still builds while the outgoing is an app-ghost ─
// §8 DEC. A browse→nowplaying gesture is an in-flow→overlay member whose outgoing this slice
// flips to an app-ghost; the NP pill decoration mover is INDEPENDENT of the outgoing branch
// (js/swipe.js buildConstruction) and must be unaffected. GREEN @HEAD and after. Mutation-proven
// by the EXISTING registered mutant "swipe4 F1: buildConstruction ignores plan.decorations"
// (tools/mutate.mjs) — dropping the decoration loop removes the `.np-pill-float` and reddens
// this cell (verified in RED-swipe-stage6f.md). Reaching nowplaying needs a playing context:
// seed last-played so enterApp establishes ctx, then open NP through the real #player.
const LAST_PLAYED = { book: 'bookA', track: 'bookA-t0', pos: 0, ts: 1000 };

test('DEC — a browse→nowplaying gesture still clones the NP pill decoration (.np-pill-float)', async () => {
  const h = boot({ fakeTimers: true, lastPlayed: LAST_PLAYED });
  try {
    await settle(h);                          // let enterApp → restoreLastPlayed establish ctx
    h.tap('#player');                         // real player bar → openNowPlaying → navStack=[home, nowplaying]
    await settle(h);
    h.tap('.navbtn[data-nav="books"]');       // navStack = [home, nowplaying, books]
    await settle(h);
    assert.equal(h.$('nowplaying') && h.$('browse') ? 'ok' : 'missing', 'ok', 'fixture sanity: overlays exist');

    goLiveDrag(h, addRow(h));                  // live back-swipe Books→NowPlaying, mid-drag

    assert.equal(starts(h).length, 1,
      `fixture sanity: the browse→nowplaying gesture must go LIVE (ctx established) — got ${JSON.stringify(swipeLog(h))}`);
    assert.ok(h.document.querySelector('.np-pill-float'),
      'a browse→nowplaying gesture must clone the NP pill decoration (.np-pill-float) — the decoration '
      + 'path is independent of the app-ghost outgoing');
  } finally { h.dispose(); }
});
