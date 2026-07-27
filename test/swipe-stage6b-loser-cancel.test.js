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

// Drive Authors -> Home to the exact "finalize ran, held reveal PENDING" state the RR
// cells branch from: the 340ms fires finalize (which cancels the settle rAF, then starts
// the held reveal), so the reveal double-rAF OUTER frame is queued (unfired) and the
// reveal 600ms safety-net is pending. Mirrors swipe-invariants.test.js's held-reveal
// fixture (endpoint — a HELD reveal ...:569).
async function toHeldRevealPending(h) {
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
  h.touch.start(10, 300, addRow(h));
  h.touch.move(80, 302);
  await realSleep(12); h.touch.move(600, 304); await realSleep(12); h.touch.end(600, 304);
  await settle(h);
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
      const anchor = h.document.querySelector('.nav-ghost');
      assert.ok(anchor, 'fixture: an abort browse->browse builds the source ghost, which is movers[0] (the anchor)');
      anchor.dispatchEvent(new h.window.Event('transitionend', { bubbles: true }));
      assert.equal(settles(h).length, 1, 'fixture: the transitionend must have driven finalize (one settle logged)');

      // The winner's own reveal continuations (the 600ms safety-net) now share the clock
      // queue — so this is a per-id delta, never emptiness.
      assert.ok(h.clock.pendingDump().some((t) => t.ms === 600),
        'the reveal 600ms safety-net (a WINNER continuation) still shares the clock queue — assert a delta, not emptiness');

      // THE CLAIM: finalize retired its loser.
      const idsAfter = h.clock.pendingDump().map((t) => t.id);
      assert.ok(!idsAfter.includes(settleId),
        `finalize must clear the 340ms settle fallback when transitionend wins; id ${settleId} still pending in ${JSON.stringify(h.clock.pendingDump())}`);
    } finally { h.dispose(); }
  });

// ── RR — the winning reveal drop() cancels its losers, across all THREE interleavings ────
// PLAN-swipe-stage6b.md §9 cell RR (the F6/F7 three-way split). The reveal paint gate is a
// double-rAF (app.js:794) racing a 600ms safety-net (app.js:795). Exactly one of {a decode/
// paint gate, the timeout} calls drop(); the loser continuation(s) must be cancelled.

// RR(a) — the timeout wins with NO frame fired: the reveal OUTER frame is the loser.
// RED REASON: drop() does not cancelAnimationFrame the reveal frame, so the queued outer
// frame survives a timeout-driven drop.
test('RR(a) — timeout wins, no frame fired: drop() cancels the pending reveal frame',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      await toHeldRevealPending(h);

      // No frame fired: the reveal OUTER frame is queued and unfired — the loser.
      const before = h.raf.pendingIds();
      assert.equal(before.length, 1,
        `fixture: exactly the reveal outer frame must be queued (the settle rAF was cancelled in finalize); got ${JSON.stringify(before)}`);
      const outerId = before[0];

      // Advance past the 600ms reveal safety-net → drop('timeout') wins.
      await h.clock.advance(600);

      // The winner's watchFrames chain queued its OWN frame into rafQ — non-empty, so
      // assert the specific loser id is gone, not emptiness.
      const after = h.raf.pendingIds();
      assert.ok(after.length >= 1,
        'a WINNER continuation (watchFrames) shares the frame queue — assert a delta, not emptiness');
      assert.ok(!after.includes(outerId),
        `drop() must cancel the pending reveal frame; outer id ${outerId} still queued in ${JSON.stringify(after)}`);
    } finally { h.dispose(); }
  });

// RR(b) — the LOAD-BEARING half-fired interleaving (Loki-KILL, Charpy F7). Fire EXACTLY
// ONE frame so the outer runs and schedules the inner PAINT frame, then let the 600ms
// timeout win while the inner is still pending. The loser is the INNER frame — and the
// killed single-outer-id design cancels the SPENT outer here, leaving the inner pending.
// Exactly one frame is binding: two frames fire the inner too and collapse this into the
// gate-win case (RR(c)), where the killed design would not redden.
// RED REASON: drop() cancels no reveal frame at all today, so the inner survives.
test('RR(b) — HALF-FIRED (outer spent, inner pending), timeout wins: drop() cancels the INNER frame',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      await toHeldRevealPending(h);

      const outerId = h.raf.pendingIds()[0];
      assert.ok(outerId != null, 'fixture: the reveal outer frame must be queued');

      // EXACTLY ONE frame — the outer runs and schedules the inner; the inner has NOT run
      // (painted stays false), so the timeout can still win with the inner pending.
      await h.raf.frame();
      const mid = h.raf.pendingIds();
      assert.equal(mid.length, 1,
        `fixture: after exactly one frame the INNER paint frame must be the sole queued frame; got ${JSON.stringify(mid)}`);
      const innerId = mid[0];
      assert.notEqual(innerId, outerId, 'fixture: the inner paint frame is a distinct id from the spent outer');

      // The 600ms timeout wins while the inner is pending.
      await h.clock.advance(600);

      const after = h.raf.pendingIds();
      assert.ok(after.length >= 1,
        'a WINNER continuation (watchFrames) shares the frame queue — assert a delta, not emptiness');
      assert.ok(!after.includes(innerId),
        `drop() must cancel the CURRENTLY-PENDING reveal frame (the inner), not the spent outer; inner id ${innerId} still queued in ${JSON.stringify(after)}`);
    } finally { h.dispose(); }
  });

// RR(c) — a gate wins (both paint frames fire, decode already resolved): the 600ms
// safety-net is the loser. drop('paint') fires with no clock advance.
// RED REASON: drop() does not clearTimeout the 600ms safety-net, so it stays pending after
// the paint gate wins.
test('RR(c) — the paint gate wins: drop() clears the pending 600ms reveal safety-net',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      await toHeldRevealPending(h);

      // Identify the 600ms reveal safety-net by its magic delay and capture its id.
      const timers = h.clock.pendingDump().filter((t) => t.ms === 600);
      assert.equal(timers.length, 1,
        `fixture: exactly one 600ms reveal safety-net must be pending; got ${JSON.stringify(h.clock.pendingDump())}`);
      const revealTimerId = timers[0].id;

      // Fire BOTH reveal frames → the paint gate wins (decode resolved on the microtask
      // queue during the first frame), so drop('paint') runs with NO clock advance and the
      // 600ms is the loser it must clear.
      await h.raf.frame();   // outer → schedules inner; decode resolves → decoded = true
      await h.raf.frame();   // inner → painted = true → gate('paint') → drop('paint')

      // The reveal diagnostic's 500ms window and the pane-fade timer (WINNER continuations)
      // still share the clock queue — non-empty, so assert the specific loser id is gone.
      const after = h.clock.pendingDump();
      assert.ok(after.length >= 1,
        'WINNER continuations (the reveal 500ms window / pane-fade timer) still share the clock queue — assert a delta, not emptiness');
      assert.ok(!after.map((t) => t.id).includes(revealTimerId),
        `drop() must clear the 600ms reveal safety-net; id ${revealTimerId} still pending in ${JSON.stringify(after)}`);
    } finally { h.dispose(); }
  });
