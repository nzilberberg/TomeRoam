// LOKI PROBE — disposable, scratchpad-only. NOT a repo test.
//
// Target: the Stage A1-fix at HEAD 8e65f91 (js/nav.js:185 — overlayFilmstrip's reconcile
// no-ops while d.gestureLive() is true; predicate wired at js/app.js:213 as `!!d && d.live`).
//
// THE PLANE: `d` (the active-drag handle) is nulled at end() (js/app.js:618), while `session`
// owns the movers through the whole settle/finalize phase (js/app.js:219-226). So for the
// entire post-release SETTLE window — finger up, movers animating to their final positions,
// finalize not yet run — gestureLive() reads FALSE while the session still owns and is still
// animating the movers. A pending overlayFilmstrip reconcile (the 340ms net) that fires inside
// that window is NOT suppressed and runs applyScreen(currentDesc()) against a half-finished
// gesture: resetSwipeStyles destroys the settle animation, and setView(source) hides the
// incoming mover of a COMMITTED, already-released gesture. It stays display:none until the
// settle's own 340ms fallback finalize restores it — the destination vanishes mid-snap and
// pops back in at finalize.
//
// PROMISE PREDICTS: the reconcile is harmless on every path — either suppressed (live) or a
// no-op-equivalent superset precedes/follows it. FRACTURE PREDICTS: #browse.hidden === true
// between the net and the finalize, transforms wiped, then un-hidden at finalize (the pop-in).
//
// Drive mirrors the shipped FILMSTRIPDRAG cell (test/one-screen-type-filmstrip.test.js):
// production paths only — real navbar taps, the real hub row, the real #dgBack, the real
// shipped touch listeners. jsdom scope caveats identical: all assertions are class state,
// inline style presence, timer-ledger state, or log ordering. Paint is argued separately.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('../../test/app-harness.js');

const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const hasClass = (h, id, cls) => h.$(id).classList.contains(cls);
const inlineTransform = (h, id) => h.$(id).style.transform;
const nets340 = (h) => h.clock.pendingDump().filter((t) => t.ms === 340);

// Books → Options → Diagnostics → ‹ Back. Leaves the back-filmstrip's 340ms reconcile net
// pending (delay 340). Identical to the shipped cell's toSubThenBack.
async function toSubThenBack(h) {
  await settle(h);
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="options"]'); await settle(h);
  const row = h.document.querySelector('.hubrow[data-sub="diagnostics"]');
  assert.ok(row, 'fixture sanity: real Options hub wired');
  row.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(h);
  await h.clock.advance(400); await settle(h);        // retire the FORWARD filmstrip's net
  assert.deepEqual(nets340(h), [], 'fixture sanity: forward net retired');
  assert.equal(hasClass(h, 'diagnostics', 'hidden'), false, 'fixture sanity: sub shown');
  h.tap('#dgBack'); await settle(h);
  assert.equal(nets340(h).length, 1, 'fixture sanity: exactly one pending back-filmstrip net');
  assert.equal(hasClass(h, 'options', 'hidden'), false, 'fixture sanity: both panes un-hidden');
  assert.equal(hasClass(h, 'diagnostics', 'hidden'), false, 'fixture sanity: both panes un-hidden');
}

// Drive the committed back-flick toward Books. Interpose `gapMs` of virtual time between the
// ‹ Back tap and the gesture so the filmstrip net and the settle's own finalize timer sit at
// DIFFERENT virtual dues — exactly the real-device separation between "when the user tapped
// Back" and "when the flick released".
async function flickBackToBooks(h, gapMs) {
  if (gapMs) { await h.clock.advance(gapMs); await settle(h); }
  h.touch.start(2, 300, h.document.body);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(260, 304); await realSleep(12);
  h.touch.move(500, 306); await realSleep(12);          // dx≈498 of w=1024 → prog≈0.49 > THRESH
  assert.ok(swipeLog(h).some((m) => /^start back options→books/.test(m)),
    `fixture sanity: gesture went LIVE toward books — got ${JSON.stringify(swipeLog(h))}`);
  assert.equal(hasClass(h, 'browse', 'hidden'), false,
    'fixture sanity: mid-drag render un-hid #browse as the incoming mover');
  assert.notEqual(inlineTransform(h, 'browse'), '',
    'fixture sanity: incoming mover carries the drag transform');
  h.touch.end(500, 306); await settle(h);               // RELEASED. Settle running, finalize pending.
  const s = h.window.PBSwipeSession();
  assert.ok(s && !s.dragging,
    'fixture sanity: post-release the SESSION still owns the movers (d nulled, session alive)');
}

test('KILL — a pending filmstrip reconcile fires in the SETTLE window of a committed, released '
  + 'gesture: the incoming mover is display:none\'d mid-snap, then pops in at finalize', async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await toSubThenBack(h);
    // Net due at +340. Gesture starts at +120, releases; settle finalize due at +120+340=+460.
    await flickBackToBooks(h, 120);
    const pend = nets340(h).map((t) => t.delay).sort((a, b) => a - b);
    assert.deepEqual(pend, [220, 340],
      `fixture sanity: net (220) and settle finalize (340) pending at distinct dues — got ${JSON.stringify(pend)}`);

    // ── t=+350: the net fires. Finalize (due +460) has NOT. ──────────────────────────
    await h.clock.advance(230); await settle(h);
    assert.equal(nets340(h).length, 1, 'instrument: the net fired; the settle finalize is still pending');
    assert.equal(swipeLog(h).some((m) => /commit back options→books/.test(m)), false,
      'instrument: finalize has not run yet');

    // THE WRONG OBSERVABLE, painted for the whole net→finalize gap (~110ms virtual here;
    // 140–340ms on the real timings derived in the strike record):
    assert.equal(hasClass(h, 'browse', 'hidden'), true,
      'FRACTURE: the reconcile ran applyScreen(\'options\') against a released, committed '
      + 'gesture — the destination the user just committed to is now display:none mid-snap');
    assert.equal(hasClass(h, 'options', 'hidden'), false,
      'FRACTURE: the outgoing source snapped back to fully visible');
    assert.equal(inlineTransform(h, 'browse'), '',
      'FRACTURE: resetSwipeStyles wiped the settle transforms — the snap animation is destroyed');
    assert.equal(inlineTransform(h, 'options'), '', 'FRACTURE: outgoing transform wiped too');
    const s = h.window.PBSwipeSession();
    assert.ok(s && !s.dragging,
      'FRACTURE: and the session STILL owns these movers — the reconcile mutated '
      + 'session-owned elements, which is what the fix\'s invariant forbids');

    // ── t=+460: the settle's own fallback finalize restores the destination — the POP-IN. ──
    await h.clock.advance(120); await settle(h);
    assert.ok(swipeLog(h).some((m) => /commit back options→books/.test(m)),
      'restoration: finalize ran (commit logged)');
    assert.equal(hasClass(h, 'browse', 'hidden'), false,
      'restoration: #browse pops back in at finalize — hidden→shown with no gesture, no '
      + 'animation: the pop-in');
    assert.equal(hasClass(h, 'options', 'hidden'), true, 'restoration: source hidden at rest');
  } finally { h.dispose(); }
});

test('CONTROL — identical drive with the net already retired: the settle window is clean end to '
  + 'end, so the KILL\'s wrong state is attributable to the net alone', async () => {
  const h = boot({ fakeTimers: true, realOptions: true });
  try {
    await toSubThenBack(h);
    await h.clock.advance(400); await settle(h);        // retire the BACK net at rest (shipped behavior)
    assert.deepEqual(nets340(h), [], 'control precondition: no pending reconcile');
    assert.equal(hasClass(h, 'options', 'hidden'), false, 'control precondition: hub at rest');
    await flickBackToBooks(h, 0);
    // Same mid-settle checkpoint offset as the kill (+230 after release).
    await h.clock.advance(230); await settle(h);
    assert.equal(hasClass(h, 'browse', 'hidden'), false,
      'CONTROL: mid-settle the incoming mover stays un-hidden');
    assert.notEqual(inlineTransform(h, 'browse'), '',
      'CONTROL: mid-settle the settle transform is intact');
    await h.clock.advance(120); await settle(h);
    assert.ok(swipeLog(h).some((m) => /commit back options→books/.test(m)), 'CONTROL: finalize ran');
    assert.equal(hasClass(h, 'browse', 'hidden'), false, 'CONTROL: destination shown at rest');
    assert.equal(hasClass(h, 'options', 'hidden'), true, 'CONTROL: source hidden at rest');
  } finally { h.dispose(); }
});
