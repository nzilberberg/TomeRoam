// STAGE 6b of PLAN-swipe-reveal.md (PLAN-swipe-stage6b.md §8/§9) — the RED suite for the
// finalize/reveal LOSER-CANCEL slice, authored red-first before the build (red-first TDD
// law, Claude/Decisions/DecisionLog.md).
//
// WHAT THIS SLICE PROMISES (PLAN-swipe-stage6b.md §3). Three async continuations that are
// bare locals today become session-owned handles, each CANCELLED at exactly one resolver:
//   * cur.settleTimer  — the 340ms finalize fallback (app.js setTimeout(finalize,340)),
//                        cleared by finalize() when transitionend wins.               [DF]
//   * cur.revealFrames — the reveal paint gate's double-rAF (app.js:794), the CURRENTLY-
//                        PENDING frame, cancelled by the winning drop().              [RR]
//   * cur.revealTimer  — the reveal 600ms safety-net (app.js:795), cleared by drop().  [RR]
//
// THE OBSERVABLE CHANNEL is the fake scheduler's queues: a cancelled loser LEAVES the
// queue, so a build that stores+cancels the handle drops it and a build that omits (or
// misattributes) the cancel leaves it pending. The channel is app-harness.js's
// h.clock.pendingDump()/pendingIds() and h.raf.pendingIds() (added for this slice).
//
// ⚠️ THE LOKI HELD-STONE — WHY THESE NEVER ASSERT EMPTINESS. After the resolver runs, the
// queues are NOT empty: the WINNER's own continuations are scheduled into the SAME queues
// (watchFrames' rAF chain into rafQ; the reveal diagnostic's 500ms window and the pane-
// fade timer into the clock queue). So h.clock.pending()===0 / h.raf.pending()===0 would
// be the WRONG oracle — it would pass a build that cancels nothing on the frames the
// timeout would have swept anyway. Every cell here CAPTURES the specific loser id at the
// scheduling site and asserts THAT id is gone (a delta), and explicitly asserts the queue
// is still non-empty so the delta nature stays pinned.
//
// RED STATUS (before the build). DF/RR are the NEW red-first cells and are PLAIN FAILING
// tests — NOT `{ todo }`. In this project `{ todo }` marks a KNOWN-RED policy exception that
// the §4.19 gate (test/policy-ledger-gate.test.js) requires to be declared in
// Claude/Decisions/PolicyLedger.mjs; plan §8 states this slice introduces NO known-red and
// adds NO ledger entry. So these are transient red-first cells the Curie→Brunel handoff
// expects to be red now and green after the build — the same representation the Stage 6a
// red suite used (Claude/Curie/RED-swipe-stage6.md). The EXISTING green guards that pin the
// shipped parity around this change (RGcancel/RG13/RGH/RGT/RGend) live in
// test/swipe-invariants.test.js and are NOT touched here.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

// REAL wall clock, captured before boot() patches setTimeout. app.js's move() only
// resamples velocity after >8ms of real time, so synthetic moves fired back-to-back leave
// vx holding the OUTWARD flick and a gesture meant to abort COMMITS instead. (Same reason
// swipe-invariants.test.js keeps its own realSleep.)
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));

/** Authors over Books: a left-edge back-swipe is browse->browse, the same-browse-host
 *  abort-re-render case (finalizationPlanFor.abortRender === 'rerender'). */
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

// Drive an aborting browse->browse gesture to SETTLING and STOP — end() has run and
// settle() has armed the movers, the 340ms fallback and the transitionend listener, but
// NOTHING has fired finalize yet (no clock advance, no transitionend). This is the state
// the DF cell needs: the 340ms is still pending, so a transitionend win can race it.
async function abortToSettling(h, row) {
  h.touch.start(10, 300, row);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(200, 304); await realSleep(12);
  h.touch.move(30, 304); await realSleep(12);
  h.touch.end(30, 304);
  await settle(h);   // microtasks only — under fakeTimers the 340ms does NOT fire here
}

// Drive an aborting browse->browse gesture to the exact "finalize ran, held reveal
// PENDING" state the RR cells branch from: the 340ms fires finalize (which cancels the
// settle rAF, then starts the held reveal for the abort→browse re-render), so the reveal
// double-rAF OUTER frame is queued (unfired) and the reveal 600ms safety-net is pending.
// Stage 6i (PLAN-swipe-noswap-home.md §5/§12) retired the commit→home held reveal this
// fixture used to drive — browse→home no longer holds (the real fixed #home is the
// un-parked incoming mover, never covered). The abort→browse held reveal
// (holdGhostUntilPaintable($('browse'), cover), unchanged by this stage) is the surviving
// held path and exercises the exact same loser-cancel machinery RR pins. Mirrors
// swipe-invariants.test.js's held-reveal fixture (endpoint — a HELD reveal ...).
async function toHeldRevealPending(h) {
  await onAuthorsOverBooks(h);
  await abortToSettling(h, addRow(h));
  await h.clock.advance(400);   // fire the 340ms finalize; the reveal frame + 600ms are now queued
  await settle(h);
}

// ── DF — finalize cancels its loser: the 340ms settle fallback, when transitionend wins ──
// PLAN-swipe-stage6b.md §9 cell DF. finalize() runs on WHICHEVER of transitionend / the
// 340ms fallback fires first. When transitionend wins, the 340ms is still queued; the
// slice stores it as cur.settleTimer and finalize clears it, so no leaked fallback
// survives the finalize phase. The mutation that must redden this: omit the clear (or
// clear the wrong handle) → the 340ms stays pending in the clock queue after finalize.
//
// RED REASON (before the build): the 340ms is a bare local (app.js:1160), never stored,
// never cleared. transitionend-driven finalize leaves it pending → this reddens.
test('DF — finalize clears the 340ms settle fallback when transitionend wins',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      await onAuthorsOverBooks(h);
      await abortToSettling(h, addRow(h));

      // Identify the 340ms finalize fallback by its magic delay and capture its id.
      const dump = h.clock.pendingDump();
      const fallback = dump.filter((t) => t.ms === 340);
      assert.equal(fallback.length, 1,
        `fixture: exactly one 340ms finalize fallback must be pending at SETTLING; got ${JSON.stringify(dump)}`);
      const settleId = fallback[0].id;

      // transitionend WINS — fire it on the anchor (movers[0].el = the source ghost of a
      // browse->browse abort) so finalize runs while the 340ms is still queued.
      // movers[0] is the OUTGOING mover. Since PLAN-swipe-declone.md §5.3.6 that is the SOURCE
      // .browsepage node, not a ghost wrapper — the anchor element moved, the anchoring rule did not.
      const anchor = h.document.querySelector('.browsepage[data-key="authors"]');
      assert.ok(anchor, 'fixture: an abort browse->browse drags the source PAGE, which is movers[0] (the anchor)');
      anchor.dispatchEvent(new h.window.Event('transitionend', { bubbles: true }));
      assert.equal(settles(h).length, 1, 'fixture: the transitionend must have driven finalize (one settle logged)');

      // ANTI-VACUITY, RE-FOUNDED (PLAN-swipe-declone.md Stage 2). This used to name the
      // reveal's 600ms safety-net as the winner continuation proving the queue is not simply
      // empty — but that timer belonged to the HELD reveal, which no transition takes now.
      // Re-founded on the fact the claim actually needs: the settle fallback WAS in the queue
      // before finalize and is identified by id, so what is asserted is a per-id DELTA. Without
      // this, "the loser id is gone" would be satisfied perfectly by a queue that never held it.
      assert.ok(dump.some((t) => t.id === settleId),
        'anti-vacuity: the 340ms fallback must have been pending BEFORE finalize, or its absence '
        + 'afterwards proves nothing');

      // THE CLAIM: finalize retired its loser.
      const idsAfter = h.clock.pendingDump().map((t) => t.id);
      assert.ok(!idsAfter.includes(settleId),
        `finalize must clear the 340ms settle fallback when transitionend wins; id ${settleId} still pending in ${JSON.stringify(h.clock.pendingDump())}`);
    } finally { h.dispose(); }
  });

// ── RR — RETIRED WITH THE HELD REVEAL (PLAN-swipe-declone.md Stage 2, §12 items 13, 27) ─
// Three cells here pinned that the winning reveal drop() cancelled its losers across all
// three interleavings of the paint gate and the 600ms safety-net. Their whole subject was
// the HELD reveal, and the held reveal existed for exactly one reason: an aborted
// browse->browse re-rendered its source into the shared #browse, and the ghost had to keep
// covering the view until the re-decoded page had PAINTED. Stage 2 removes the cause — the
// source is its own element, the destination render never touches it, so an abort has
// nothing to rebuild and nothing to hold. No transition takes a held reveal, so there are
// no reveal continuations to cancel and no interleaving to test.
//
// The DF cell above is NOT retired and is the reason this file still exists: the
// loser-cancellation rule for the 340ms settle fallback applies to every transition and is
// unaffected. ABORTNORENDER in test/swipe-declone-stage2-browse.test.js is the successor
// for the property that replaced the held reveal: an abort renders nothing at all.
