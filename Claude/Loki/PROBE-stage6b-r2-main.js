// LOKI PROBE — Stage-6b ratified design (PLAN-swipe-stage6b.md @ 0d27701), pre-build strike.
// Constructs the plan's §2 edits on an IN-MEMORY copy of js/app.js (production untouched),
// boots the real test/app-harness.js against it, and executes the promise's interleavings
// plus adversarial ones on the fake scheduler queues (tq via h.clock.pending, rafQ via
// h.raf.pending), with a call ledger wrapped around setTimeout/clearTimeout/rAF/cancelRAF
// so every cancel names the exact id it removed.
//
// Modes: DESIGN (the ratified construction), MUT_SINGLE_ID (the killed single-outer-id
// design — the probe must catch its leak or the probe is vacuous), MUT_NO_CLEAR (omit
// clearTimeout(cur.settleTimer) — the DF omission mutation).
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert');

const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const realSleep = (ms) => new Promise((r) => require('node:timers').setTimeout(r, ms));

// ---- source transforms (the ratified §2 construction) ------------------------------
function transform(src, mode) {
  const once = (s, from, to) => {
    const n = s.split(from).length - 1;
    assert.equal(n, 1, `transform target not unique (${n}): ${from.slice(0, 50)}`);
    return s.replace(from, to);
  };
  // 1. store the 340ms finalize fallback on the session
  src = once(src, 'setTimeout(finalize, 340);', 'cur.settleTimer = setTimeout(finalize, 340);');
  // 2. finalize clears its loser (adjacent to the shipped settleFrame cancel), unless MUT_NO_CLEAR
  if (mode !== 'MUT_NO_CLEAR') {
    src = once(src, 'cancelAnimationFrame(cur.settleFrame);',
      'cancelAnimationFrame(cur.settleFrame); clearTimeout(cur.settleTimer);');
  }
  // 3. the reveal double-rAF: two-entry resource; outer callback re-stores the inner id
  //    (MUT_SINGLE_ID = the killed design: store only the outer id)
  const dblFrom = "requestAnimationFrame(() => requestAnimationFrame(() => { painted = true; gate('paint'); }));";
  const dblTo = mode === 'MUT_SINGLE_ID'
    ? "cur.revealFrames = requestAnimationFrame(() => requestAnimationFrame(() => { painted = true; gate('paint'); }));"
    : "cur.revealFrames = requestAnimationFrame(() => { cur.revealFrames = requestAnimationFrame(() => { painted = true; gate('paint'); }); });";
  src = once(src, dblFrom, dblTo);
  // 4. store the 600ms reveal safety-net on the session
  src = once(src, "setTimeout(() => drop('timeout'), 600);",
    "cur.revealTimer = setTimeout(() => drop('timeout'), 600);");
  // 5. the winning drop cancels its losers (after the dropped guard is set)
  src = once(src, 'if (dropped) return; dropped = true;',
    'if (dropped) return; dropped = true; cancelAnimationFrame(cur.revealFrames); clearTimeout(cur.revealTimer);');
  return src;
}

// ---- boot with the transformed app.js ----------------------------------------------
let MODE = 'DESIGN';
const realRead = fs.readFileSync;
fs.readFileSync = function (p, ...a) {
  const out = realRead.call(fs, p, ...a);
  if (typeof p === 'string' && p.replace(/\\/g, '/').endsWith('js/app.js') && typeof out === 'string') {
    return transform(out, MODE);
  }
  return out;
};
const { boot } = require(path.join(REPO, 'test', 'app-harness.js'));

// ---- ledger: wrap the fake scheduler entry points AFTER boot -----------------------
function instrument(h) {
  const led = { st: [], ct: [], raf: [], craf: [], mark: 'boot' };
  const w = global.window;
  const st0 = global.setTimeout, ct0 = global.clearTimeout;
  const raf0 = global.requestAnimationFrame, craf0 = global.cancelAnimationFrame;
  const st = (fn, ms, ...a) => { const id = st0(fn, ms, ...a); led.st.push({ id, ms: Number(ms) || 0, at: led.mark }); return id; };
  const ct = (id) => { led.ct.push({ id, at: led.mark }); return ct0(id); };
  const raf = (fn) => { const id = raf0(fn); led.raf.push({ id, at: led.mark }); return id; };
  const craf = (id) => { led.craf.push({ id, at: led.mark }); return craf0(id); };
  global.setTimeout = st; w.setTimeout = st;
  global.clearTimeout = ct; w.clearTimeout = ct;
  global.requestAnimationFrame = raf; w.requestAnimationFrame = raf;
  global.cancelAnimationFrame = craf; w.cancelAnimationFrame = craf;
  return led;
}
const settleMt = async (h, n = 12) => { for (let i = 0; i < n; i++) await h.settle(); };
const drainRaf = async (h, cap = 30) => { let i = 0; while (h.raf.pending() && i++ < cap) await h.raf.frame(); };
const swipeLines = (h, re) => h.log.calls
  .filter((c) => c.name === 'debug' && re.test(c.args[1])).map((c) => c.args[1]);

async function bootDrained(opts) {
  const h = boot(Object.assign({ fakeTimers: true, deferRaf: true }, opts));
  await settleMt(h);
  await h.clock.advance(20000);   // flush boot-time timers so due-times are gesture-relative
  await drainRaf(h);
  await settleMt(h);
  return h;
}
// Authors→Home commit (the held commit→home reveal). Left-edge back-swipe, flick out.
async function commitHomeSwipe(h) {
  h.tap('.navbtn[data-nav="authors"]');
  await settleMt(h);
  await h.clock.advance(2000); await drainRaf(h); await settleMt(h);
  const row = h.document.createElement('div'); row.className = 'book'; h.$('browse').appendChild(row);
  h.touch.start(10, 300, row);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(600, 304); await realSleep(12);
  h.touch.end(600, 304);
  await settleMt(h);
}
// Options abort (no-pane path; stays on options; stale transitionend listener survives a 340 win)
async function optionsAbort(h) {
  h.touch.start(10, 300, h.$('options'));
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(200, 304); await realSleep(12);
  h.touch.move(30, 304); await realSleep(12);
  h.touch.end(30, 304);
  await settleMt(h);
}
const fireTransitionEnd = (h, el) => el.dispatchEvent(new h.window.Event('transitionend', { bubbles: true }));
const idsAfter = (list, markVals) => list.filter((e) => markVals.includes(e.at)).map((e) => e.id);

const out = [];
const report = (line) => { out.push(line); console.log(line); };

// ════════ S1+S1b — DF: transitionend wins; the 340ms loser leaves tq. Then RR(a). ════
async function S1() {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    led.mark = 'gesture';
    await commitHomeSwipe(h);
    const t340 = led.st.filter((e) => e.at === 'gesture' && e.ms === 340);
    assert.equal(t340.length, 1, `S1: expected one 340ms schedule, got ${t340.length}`);
    const T = t340[0].id;
    led.mark = 'transitionend';
    fireTransitionEnd(h, h.$('browse'));           // transitionend WINS at t=0
    await settleMt(h);
    const clearedT = led.ct.some((e) => e.id === T && e.at === 'transitionend');
    assert.ok(clearedT, 'S1 DF: finalize must clearTimeout the pending 340ms loser id');
    // no-fire window: nothing is due <=345 iff the 340 truly left the queue
    const p0 = h.clock.pending();
    led.mark = 'advance345';
    await h.clock.advance(345);
    const p1 = h.clock.pending();
    assert.equal(p1, p0, `S1 DF: advancing past 340 must fire nothing (before=${p0} after=${p1}) — the loser left tq`);
    assert.equal(swipeLines(h, /^#\d+ commit /).length, 1, 'S1: exactly one finalize');
    // S1b — RR(a) on this same session: outer pending, timeout-driven drop
    const O = idsAfter(led.raf, ['transitionend']);   // reveal outer scheduled during finalize
    assert.equal(O.length, 1, `S1b: expected one reveal frame scheduled at finalize, got ${O.length}`);
    assert.equal(h.raf.pending(), 1, 'S1b: the outer reveal frame is the one pending frame');
    led.mark = 'drop';
    await h.clock.advance(400);                     // to +745: reportReveal@+500 fires, revealTimer@+600 fires → drop
    await settleMt(h);
    const cancelledO = led.craf.some((e) => e.id === O[0] && e.at === 'drop');
    assert.ok(cancelledO, 'S1b RR(a): drop must cancelAnimationFrame the PENDING outer reveal frame');
    assert.equal(h.raf.pending(), 1, `S1b RR(a): after drop only watchFrames remains (got ${h.raf.pending()})`);
    assert.equal(swipeLines(h, /^hold /).length, 1, 'S1b: exactly one drop');
    report('S1  DF transitionend-wins: 340ms loser CLEARED from tq (id ' + T + '); no-fire across +345 held. RR(a): pending outer frame id ' + O[0] + ' cancelled at timeout-drop; rafQ clean.');
  } finally { h.dispose(); }
}

// ════════ S2 — RR(a) 340-driven: outer pending, timeout wins ════════
async function S2() {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    led.mark = 'gesture';
    await commitHomeSwipe(h);
    led.mark = 'finalize';
    await h.clock.advance(400);                     // 340 wins
    await settleMt(h);
    const O = idsAfter(led.raf, ['finalize']);
    assert.equal(O.length, 1, `S2: one reveal outer frame, got ${O.length}`);
    assert.equal(h.raf.pending(), 1, 'S2: outer pending before drop');
    const r600 = led.st.filter((e) => e.at === 'finalize' && e.ms === 600);
    assert.equal(r600.length, 1, 'S2: one 600ms revealTimer scheduled');
    led.mark = 'drop';
    await h.clock.advance(600);                     // revealTimer wins
    await settleMt(h);
    assert.ok(led.craf.some((e) => e.id === O[0] && e.at === 'drop'), 'S2: drop cancels the pending OUTER id');
    assert.equal(h.raf.pending(), 1, `S2: only watchFrames pends after drop (got ${h.raf.pending()})`);
    assert.equal(swipeLines(h, /^hold /).length, 1, 'S2: exactly one drop');
    report('S2  RR(a) 340-driven: outer id ' + O[0] + ' pending at timeout-drop, cancelled; rafQ = watchFrames only.');
  } finally { h.dispose(); }
}

// ════════ S3 — RR(b) HALF-FIRED: outer fired, inner pending, timeout wins ════════
// The interleaving that killed the prior draft. leakExpected=true under MUT_SINGLE_ID.
async function S3(leakExpected) {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    led.mark = 'gesture';
    await commitHomeSwipe(h);
    led.mark = 'finalize';
    await h.clock.advance(400);
    await settleMt(h);
    const O = idsAfter(led.raf, ['finalize']);
    assert.equal(O.length, 1, 'S3: one outer frame');
    led.mark = 'frame1';
    await h.raf.frame();                            // outer fires, schedules the INNER paint frame
    const I = idsAfter(led.raf, ['frame1']);
    assert.equal(I.length, 1, `S3: outer must schedule exactly the inner (got ${I.length})`);
    assert.equal(h.raf.pending(), 1, 'S3: inner pending (half-fired state)');
    led.mark = 'drop';
    await h.clock.advance(600);                     // timeout wins in the half-fired state
    await settleMt(h);
    const cancelled = led.craf.filter((e) => e.at === 'drop').map((e) => e.id);
    const pending = h.raf.pending();
    if (!leakExpected) {
      assert.ok(cancelled.includes(I[0]), `S3 RR(b): drop must cancel the INNER id ${I[0]}, cancelled=[${cancelled}]`);
      assert.ok(!cancelled.includes(O[0]), 'S3 RR(b): the spent outer must not be the cancel target');
      assert.equal(pending, 1, `S3 RR(b): inner left rafQ; only watchFrames pends (got ${pending})`);
      report('S3  RR(b) half-fired: outer ' + O[0] + ' fired; drop cancelled the INNER ' + I[0] + ' (the actually-pending loser); rafQ clean.');
    } else {
      assert.ok(cancelled.includes(O[0]) && !cancelled.includes(I[0]), 'S3-mut: killed design cancels the spent outer');
      assert.equal(pending, 2, `S3-mut: the inner paint frame must LEAK (got ${pending})`);
      report('S3m MUT_SINGLE_ID control: drop cancelled spent outer ' + O[0] + '; inner ' + I[0] + ' LEFT PENDING (rafQ=2) — the probe detects the killed design.');
    }
    assert.equal(swipeLines(h, /^hold /).length, 1, 'S3: exactly one drop');
  } finally { h.dispose(); }
}

// ════════ S4 — RR(c) gate-driven: frames win; the pending 600ms revealTimer is cleared ════
async function S4() {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    led.mark = 'gesture';
    await commitHomeSwipe(h);
    led.mark = 'finalize';
    await h.clock.advance(400);
    await settleMt(h);
    const r600 = led.st.filter((e) => e.at === 'finalize' && e.ms === 600);
    assert.equal(r600.length, 1, 'S4: one 600ms revealTimer');
    const R = r600[0].id;
    led.mark = 'frames';
    await h.raf.frame();                            // outer
    await h.raf.frame();                            // inner → painted → gate wins → drop('paint')
    await settleMt(h);
    assert.equal(swipeLines(h, /^hold /).length, 1, 'S4: the gate-driven drop ran');
    assert.ok(led.ct.some((e) => e.id === R && e.at === 'frames'), 'S4 RR(c): drop must clearTimeout the PENDING 600ms revealTimer');
    const p0 = h.clock.pending();
    led.mark = 'post';
    await h.clock.advance(600);                     // window (+400,+1000]: fadePanes@~+460 and reportReveal@+840 fire
    await settleMt(h);
    const fired = p0 - h.clock.pending();
    assert.equal(fired, 2, `S4 RR(c): only fadePanes+reportReveal may fire after a gate win (fired=${fired}) — the revealTimer left tq`);
    assert.equal(swipeLines(h, /^hold /).length, 1, 'S4: drop exactly once');
    report('S4  RR(c) gate-won: 600ms revealTimer id ' + R + ' cleared while pending; only the two winner-scheduled timers fired afterwards.');
  } finally { h.dispose(); }
}

// ════════ S5 — CROSS-SESSION: session1's stale transitionend re-enters during session2's settle ════
// Session1 aborts on Options, 340 wins → its {once:true} listener stays bound on #options.
// Session2 settles on the same element; a transitionend now fires BOTH listeners.
// The promise requires: finalize1 is a done-guarded no-op that touches nothing; finalize2
// clears exactly session2's 340ms; no loser stays pending.
async function S5() {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    led.mark = 'nav';
    h.tap('.navbtn[data-nav="books"]'); await settleMt(h);
    h.tap('.navbtn[data-nav="options"]'); await settleMt(h);
    await h.clock.advance(2000); await drainRaf(h); await settleMt(h);
    led.mark = 's1';
    await optionsAbort(h);
    const T1s = led.st.filter((e) => e.at === 's1' && e.ms === 340);
    assert.equal(T1s.length, 1, 'S5: session1 schedules one 340');
    led.mark = 's1-finalize';
    await h.clock.advance(400);                     // 340 wins; stale listener L1 survives on #options
    await drainRaf(h); await settleMt(h);
    await h.clock.advance(2000); await settleMt(h); // flush reportReveal etc.
    led.mark = 's2';
    await optionsAbort(h);
    const T2s = led.st.filter((e) => e.at === 's2' && e.ms === 340);
    assert.equal(T2s.length, 1, 'S5: session2 schedules one 340');
    const T2 = T2s[0].id;
    led.mark = 's2-transitionend';
    fireTransitionEnd(h, h.$('options'));           // fires L1 (stale) then L2
    await settleMt(h);
    assert.ok(led.ct.some((e) => e.id === T2 && e.at === 's2-transitionend'),
      'S5: session2 finalize must clear session2\'s own 340ms');
    const p0 = h.clock.pending();
    await h.clock.advance(345);
    assert.equal(h.clock.pending(), p0, 'S5: nothing fires across +345 — session2\'s loser left tq and session1\'s re-entry scheduled nothing');
    assert.equal(swipeLines(h, /^#\d+ abort /).length, 2, 'S5: exactly two finalizes across two sessions (the stale listener re-entry was a no-op)');
    report('S5  cross-session stale transitionend: finalize1 re-entered done-guarded (no clears, no schedules); finalize2 cleared its own 340 (id ' + T2 + '); queues clean.');
  } finally { h.dispose(); }
}

// ════════ S6 — RE-ENTRY MID-REVEAL: a new gesture arrives while the pane is held ════════
// finishing=true must reject begin() (no hard reset, no handle disturbance); the timeout
// drop must then still cancel the actually-pending reveal loser.
async function S6() {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    led.mark = 'gesture';
    await commitHomeSwipe(h);
    led.mark = 'finalize';
    await h.clock.advance(400);                     // finalize; hold active; finishing=true
    await settleMt(h);
    const O = idsAfter(led.raf, ['finalize']);
    assert.equal(O.length, 1, 'S6: outer reveal frame pending');
    const startsBefore = swipeLines(h, /^start /).length;
    led.mark = 'reentry';
    h.touch.start(10, 300, h.$('home'));            // new gesture during the hold
    h.touch.move(80, 302); await realSleep(12);
    h.touch.end(80, 302);
    await settleMt(h);
    assert.equal(swipeLines(h, /^start /).length, startsBefore, 'S6: begin() must reject during finishing');
    assert.equal(swipeLines(h, /hard reset/).length, 0, 'S6: no hard reset may run mid-hold');
    led.mark = 'drop';
    await h.clock.advance(600);
    await settleMt(h);
    assert.ok(led.craf.some((e) => e.id === O[0] && e.at === 'drop'), 'S6: drop still cancels the pending outer');
    assert.equal(h.raf.pending(), 1, `S6: rafQ clean after drop (got ${h.raf.pending()})`);
    assert.equal(swipeLines(h, /^hold /).length, 1, 'S6: exactly one drop');
    report('S6  re-entry mid-reveal: begin() rejected while finishing; handles undisturbed; timeout-drop cancelled outer ' + O[0] + '; rafQ clean.');
  } finally { h.dispose(); }
}

// ════════ M2 — MUT_NO_CLEAR control: omitting the settleTimer clear must leak on tq ════
async function M2() {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    led.mark = 'gesture';
    await commitHomeSwipe(h);
    const T = led.st.filter((e) => e.at === 'gesture' && e.ms === 340)[0].id;
    led.mark = 'transitionend';
    fireTransitionEnd(h, h.$('browse'));
    await settleMt(h);
    assert.ok(!led.ct.some((e) => e.id === T), 'M2: the mutant must NOT clear the 340');
    const p0 = h.clock.pending();
    await h.clock.advance(345);
    const fired = p0 - h.clock.pending();
    assert.equal(fired, 1, `M2: the leaked 340ms loser must still FIRE from tq (fired=${fired})`);
    assert.equal(swipeLines(h, /^#\d+ commit /).length, 1, 'M2: the late fire is a done-guarded no-op');
    report('M2  MUT_NO_CLEAR control: 340ms loser id ' + T + ' stayed pending and fired after transitionend won — the probe detects the omission.');
  } finally { h.dispose(); }
}

(async () => {
  try {
    MODE = 'DESIGN';
    await S1(); await S2(); await S3(false); await S4(); await S5(); await S6();
    MODE = 'MUT_SINGLE_ID';
    await S3(true);
    MODE = 'MUT_NO_CLEAR';
    await M2();
    console.log('\nALL PROBES EXECUTED. Design runs clean; both mutant controls leak as predicted.');
  } catch (e) {
    console.error('\nPROBE FAILURE:', e && e.message);
    console.error(e && e.stack);
    process.exitCode = 1;
  } finally {
    fs.readFileSync = realRead;
  }
})();
