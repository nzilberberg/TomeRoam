// STAGE 6h of PLAN-swipe-reveal.md (PLAN-swipe-stage6h.md §8) — the RED suite for the
// COMMIT→HOME cover-drop SCROLL-SETTLE GATE, authored red-first before the build
// (red-first TDD law, Claude/Decisions/DecisionLog.md).
//
// WHAT THIS SLICE PROMISES (PLAN-swipe-stage6h.md §3). On a commit→home reveal WITH a
// large outgoing clamp (`cur.scroll0 > SETTLE_SCROLL_MIN`), the cover pane is removed
// EXACTLY ONCE and never before a scroll-settle signal — a real `window` `scrollend`,
// the bounded `SETTLE_MS` backstop, or the pre-existing 600ms DIRECT net — has had its
// chance to fire after the under-cover `scrollTo(0,1)` collapse. The cover can never
// strand, every session-owned reveal handle is retired at the one removal, and the
// abort→browse reveal (and the small/top commit→home reveal) are byte-unchanged.
//
// THE OBSERVABLE CHANNEL is the drop itself, read off the FLASH log line app.js emits at
// each drop() (`hold …ms covers=… via=${why} …`). `via=` names which gate released the
// cover: `paint` (the pre-6h double-rAF gate), `scrollend` (the primary settle signal),
// `settle` (the SETTLE_MS backstop), `timeout` (the 600ms DIRECT never-strand net). A
// drop is a code-execution event on the MAIN thread — this is NOT the discredited
// rAF/paint-based FLASH frame detector (which is compositor-blind); it records WHICH code
// path lifted the cover, never attempts to observe the compositor. The pending fake-timer
// ledger (h.clock.pendingDump, by `ms`) and h.raf identify the owned handles.
//
// ⚠️ THE FLASH ITSELF IS ASSERTED BY NO CELL. The commit books→home flash is an iOS
// compositor scroll-collapse snap, off the main thread and invisible to jsdom/rAF (the
// saga's withdrawn frame-detector lesson). Its efficacy is DEVICE-only — the user's
// scroll-down repro (scroll down→flash / top→clean) + the `via=` log (PLAN §3/§9). These
// cells prove the GATE MECHANISM (the cover waits for a settle signal, never strands,
// keeps the listener set bounded, and leaves the other paths unchanged), not the flash.
//
// ⭐ HARNESS AFFORDANCE (added with this suite, test/app-harness.js): `h.setScrollY(n)`
// gives the otherwise-pinned `window.scrollY` a settable value so `cur.scroll0`
// (captured at gesture start) can exceed `SETTLE_SCROLL_MIN` and ENGAGE the gate.
// Without it every gate-engaged cell would fall to the fast path and go vacuous (PLAN
// §9). GATE/BACKSTOP/STRAND/ONCE/OWN set it ABOVE the threshold; FASTPATH sets it 0.
//
// RED STATUS (before the build, git HEAD 2b9c90e — production has NO gate). New-behavior
// cells GATE / BACKSTOP / ONCE / OWN are RED @HEAD (the cover drops on the bare
// double-rAF; there is no scrollend listener, no SETTLE_MS timer, nothing to remove).
// Parity cells STRAND / SCOPE / FASTPATH are GREEN @HEAD (they assert current behavior:
// the 600ms direct net already exists; abort→browse and the top commit→home already drop
// on paint with no settle machinery); their fail-ability is mutation-proven separately
// (Claude/Curie/RED-swipe-stage6h.md). These are PLAIN failing/passing tests — NOT
// `{ todo }`: PLAN §8 introduces NO known-red and adds NO PolicyLedger entry (the suite
// is GREEN on the shipped form). The existing green guards live in other suites and are
// not touched here.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

// REAL wall clock, captured before boot() patches setTimeout. app.js's move() only
// resamples velocity after >8ms of real time, so synthetic moves fired back-to-back leave
// vx holding the outward flick and a gesture meant to abort COMMITS instead (same reason
// swipe-invariants.test.js / swipe-stage6b keep their own realSleep).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

// Drops read off the FLASH log — one entry per drop(), carrying its `via=` reason.
const flashDrops = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'FLASH' && /^hold /.test(String(c.args[1])))
  .map((c) => String(c.args[1]));
// [\w+]+ (not \w+) so the Stage 6h hold-diagnostic's 'scrollend+hold' reason is captured
// whole rather than truncated at the '+'.
const viaOf = (msg) => ((String(msg).match(/via=([\w+]+)/) || [])[1]);
const scrollend = (h) => h.window.dispatchEvent(new h.window.Event('scrollend'));

// The reveal's PRE-EXISTING timer delays, so the settle-timer filter isolates only the
// NEW SETTLE_MS backstop: 60 = the pane-fade removal (FADE_MS+60, app.js fadePanes);
// 340 = the finalize fallback (already fired in every fixture below); 500 = the
// reveal-diagnostic window (reportReveal); 600 = the reveal never-strand net. Brunel must
// pick SETTLE_MS distinct from all four (target ~80–120ms; PLAN §4) so it is identifiable
// here — flagged in Claude/Curie/RED-swipe-stage6h.md as a refinement to PLAN §9 note (4),
// which named only 340/600.
const REVEAL_MS = new Set([60, 340, 500, 600]);
const settleTimersOf = (h) => h.clock.pendingDump().filter((t) => !REVEAL_MS.has(t.ms));

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

/** Authors over Books: both are browse screens, so a back-swipe between them is the
 *  browse->browse abort-re-render case (finalizationPlanFor.abortRender === 'rerender'). */
async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]');
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
}

// Drive an aborting browse->browse gesture to SETTLING and STOP: end() has run and the
// 340ms fallback + transitionend listener are armed, but nothing has fired finalize yet
// (no clock advance, no transitionend). Mirrors swipe-stage6b's abortToSettling.
async function abortToSettling(h, row) {
  h.touch.start(10, 300, row);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(200, 304); await realSleep(12);
  h.touch.move(30, 304); await realSleep(12);
  h.touch.end(30, 304);
  await settle(h);   // microtasks only — under fakeTimers the 340ms does NOT fire here
}

// Drive Authors -> Home to the exact "finalize ran, commit→home held reveal PENDING"
// state: the 340ms fires finalize, which starts holdGhostUntilPaintable($('home'), …), so
// the reveal double-rAF OUTER frame is queued (unfired), the 600ms safety-net is pending,
// and decode has resolved on the microtask queue. This is the commit→home reveal the 6h
// gate wraps. Reuses swipe-stage6b's toHeldRevealPending shape (the RR cells' fixture).
async function toHeldRevealPending(h) {
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
  h.touch.start(10, 300, addRow(h));
  h.touch.move(80, 302);
  await realSleep(12); h.touch.move(600, 304); await realSleep(12); h.touch.end(600, 304);
  await settle(h);
  await h.clock.advance(400);   // fire the 340ms finalize; the reveal frame + 600ms net are now queued
  await settle(h);
}

// Drive an aborting browse->browse (Authors<->Books) to the "finalize ran, abort→browse
// held reveal PENDING" state (app.js abort-rerender reveal): the 340ms fires finalize ->
// holdGhostUntilPaintable($('browse'), …) with NO scrollSettle option. This is the reveal
// PLAN §2 leaves byte-identical to pre-6h; the SCOPE cell proves it stays that way.
async function toAbortBrowseRevealPending(h) {
  await onAuthorsOverBooks(h);
  await abortToSettling(h, addRow(h));
  await h.clock.advance(400);   // fire the 340ms finalize -> the abort→browse held reveal
  await settle(h);
}

// A scroll magnitude comfortably above any plausible SETTLE_SCROLL_MIN (~0.5·innerHeight,
// a few hundred px in jsdom) so `cur.scroll0 > SETTLE_SCROLL_MIN` ENGAGES the gate. Mirrors
// the ~11481px scrolled-down books offset the device flash tracks (PLAN §2/§4).
const SCROLLED_DOWN = 12000;

// Stage 6h hold-diagnostic (device build .259 finding, PLAN §10's named fallback): a real
// scrollend no longer drops the cover immediately — it holds an EXTRA fixed SETTLE_HOLD_MS
// past the signal first. Mirrors app.js's own diagnostic constant so the fake clock can be
// advanced past it deterministically; kept as a named test constant (not re-derived from
// production) so a drift between the two shows up as a red test rather than a silent no-op.
const SETTLE_HOLD_MS = 280;

// ── GATE — the cover PERSISTS past the bare double-rAF and drops only on scrollend ──────
// PLAN §8 cell GATE. On a scrolled-down commit→home reveal the gate is
// `decoded && painted && settled`; `settled` starts false and is flipped only by a real
// settle signal. Asserts BOTH sides of the boundary (EC §4.7): the cover is PRESENT after
// decode+double-rAF, and REMOVED only after a synthetic `scrollend`.
//
// RED @HEAD: there is no `settled` gate — `decoded && painted` drops on the double-rAF, so
// the cover is already gone before any scrollend and the "present after paint" assertion
// fails. Right reason: the gate does not exist yet.
test('GATE — commit→home cover persists past the double-rAF and drops only on scrollend',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      h.setScrollY(SCROLLED_DOWN);            // engage the gate (cur.scroll0 > SETTLE_SCROLL_MIN)
      await toHeldRevealPending(h);
      await h.raf.frame();                    // outer -> schedules inner; decode resolves -> decoded
      await h.raf.frame();                    // inner -> painted; the pre-6h gate would drop HERE
      // BEFORE the settle signal: the cover must still be up.
      assert.equal(flashDrops(h).length, 0,
        'the commit→home cover must NOT drop on decode+double-rAF alone — it must wait for a scroll-settle signal');
      // AFTER a real scrollend: the cover still must NOT drop immediately — the
      // hold-diagnostic holds it an EXTRA SETTLE_HOLD_MS past the signal.
      scrollend(h);
      assert.equal(flashDrops(h).length, 0,
        'the cover must NOT drop immediately on scrollend — the diagnostic hold must elapse first');
      await h.clock.advance(SETTLE_HOLD_MS);
      const d = flashDrops(h);
      assert.equal(d.length, 1, 'the cover drops after scrollend + the diagnostic hold');
      assert.equal(viaOf(d[0]), 'scrollend+hold',
        'the drop is released by the scrollend signal after the diagnostic hold (via=scrollend+hold)');
    } finally { h.dispose(); }
  });

// ── BACKSTOP — with no scrollend, the bounded SETTLE_MS timer releases the cover ────────
// PLAN §8 cell BACKSTOP. `scrollend` may never fire on an instant programmatic scroll
// (PLAN §3 Risk 1), so a session-owned SETTLE_MS timeout also flips `settled`. It fires
// BEFORE the 600ms net (invariant SETTLE_MS < 600), so with no scrollend the cover is
// released `via=settle`, not `via=timeout`.
//
// RED @HEAD: no SETTLE_MS timer exists; the cover drops on paint (`via=paint`), so the
// `via=settle` assertion fails. Right reason: the backstop does not exist yet.
test('BACKSTOP — no scrollend: the SETTLE_MS backstop releases the cover before the 600ms net',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      h.setScrollY(SCROLLED_DOWN);
      await toHeldRevealPending(h);
      await h.raf.frame(); await h.raf.frame();   // painted; no scrollend dispatched
      // Advance past the whole race. SETTLE_MS (< 600) wins; the 600ms net, reached later,
      // is a dropped-guarded no-op — so a `via=settle` drop proves the backstop released it.
      await h.clock.advance(600);
      const d = flashDrops(h);
      assert.equal(d.length, 1, 'exactly one drop');
      assert.equal(viaOf(d[0]), 'settle',
        'with no scrollend, the SETTLE_MS backstop (not the 600ms net) releases the cover (via=settle)');
    } finally { h.dispose(); }
  });

// ── STRAND — never-paints: only the 600ms DIRECT net removes the cover (never-strand) ───
// PLAN §8 cell STRAND — the load-bearing worse-than-flash guard. When the view NEVER
// paints, NEITHER scrollend NOR the gated SETTLE_MS timeout can drop (the gate stays
// blocked on `painted`), so the pre-existing 600ms DIRECT `drop('timeout')` is the SOLE
// remover. A stranded cover (view hidden forever) is worse than the flash.
//
// PARITY @HEAD (GREEN): the 600ms direct net already exists (app.js) and already removes
// the cover under never-paints, `via=timeout`. Fail-ability is mutation-proven: routing
// the net through gate() (so it respects `painted`) makes the cover strand — see
// Claude/Curie/RED-swipe-stage6h.md. Do NOT run any rAF frame (keep painted false).
test('STRAND — view never paints: the 600ms DIRECT net is the sole remover (never-strand)',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      h.setScrollY(SCROLLED_DOWN);
      await toHeldRevealPending(h);
      // painted stays false: the reveal outer frame is queued and UNFIRED.
      assert.equal(h.raf.pendingIds().length, 1,
        'fixture: the reveal outer frame is queued and unfired, so painted never becomes true');
      // No scrollend. Only the direct 600ms net can act.
      await h.clock.advance(600);
      const d = flashDrops(h);
      assert.equal(d.length, 1, 'the cover is removed under never-paints');
      assert.equal(viaOf(d[0]), 'timeout',
        'the sole remover under never-paints is the DIRECT 600ms net (via=timeout) — the cover never strands');
    } finally { h.dispose(); }
  });

// ── ONCE — exactly-once under the {scrollend, SETTLE_MS, hold, 600ms} race + retirement ──
// PLAN §8 cell ONCE. A real scrollend supersedes the SETTLE_MS backstop IMMEDIATELY (it is
// retired the moment scrollend arrives, not left pending to race the diagnostic hold it
// would otherwise beat — SETTLE_MS=100ms < SETTLE_HOLD_MS=280ms). The cover is removed
// EXACTLY once, after the hold elapses, and no later producer (the now-cancelled SETTLE_MS
// timer, or the 600ms net) fires a second, dropped-guarded drop.
//
// RED @HEAD: there is no single SETTLE_MS backstop timer to capture (the reveal already
// dropped on paint and queued its teardown timers instead) — the fixture guard fails.
// Right reason: the settle machinery does not exist yet.
test('ONCE — exactly-once under the settle race, and the SETTLE_MS loser is retired on scrollend',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      h.setScrollY(SCROLLED_DOWN);
      await toHeldRevealPending(h);
      await h.raf.frame(); await h.raf.frame();   // painted; gate held on settled (no drop yet)
      // The only pending timer that is not a pre-existing reveal delay is the SETTLE_MS
      // backstop. Capture its id.
      const settleTimers = settleTimersOf(h);
      assert.equal(settleTimers.length, 1,
        `fixture: exactly one SETTLE_MS backstop timer must be pending on the scrollSettle path; got ${JSON.stringify(h.clock.pendingDump())}`);
      const settleId = settleTimers[0].id;
      // A real scrollend arrives: it must retire the SETTLE_MS loser IMMEDIATELY (before the
      // diagnostic hold elapses) so the backstop cannot race in and drop early.
      scrollend(h);
      assert.ok(!h.clock.pendingDump().map((t) => t.id).includes(settleId),
        `a real scrollend must retire the SETTLE_MS loser timer at once; id ${settleId} still pending in ${JSON.stringify(h.clock.pendingDump())}`);
      assert.equal(flashDrops(h).length, 0,
        'the cover must not drop yet — scrollend arms the diagnostic hold, it does not drop immediately');
      // Advancing past the hold (and, further, the 600ms net) must produce exactly one drop.
      await h.clock.advance(600);
      const d = flashDrops(h);
      assert.equal(d.length, 1,
        `the cover is removed EXACTLY once under the {scrollend, SETTLE_MS, hold, 600ms} race; saw ${d.length} drops`);
      assert.equal(viaOf(d[0]), 'scrollend+hold',
        'the one drop is released by the diagnostic hold following scrollend (via=scrollend+hold), not the 600ms net');
    } finally { h.dispose(); }
  });

// ── SCOPE — abort→browse is byte-unchanged: no scrollend listener, no SETTLE_MS timer ───
// PLAN §8 cell SCOPE (the home-scoping / no-regression proof). The scrollSettle flag is
// passed ONLY at the commit→home call site; the abort→browse reveal is left with no option
// -> `settled` defaults true -> it drops on decode+double-rAF exactly like pre-6h, arming
// NO scrollend listener and NO SETTLE_MS timer.
//
// PARITY @HEAD (GREEN): abort→browse already drops on paint with no settle machinery.
// Fail-ability is mutation-proven: passing {scrollSettle:true} at the abort→browse call
// arms a settle-timer / waits for a scrollend the test never sends — see the report.
test('SCOPE — abort→browse held reveal arms no settle machinery and drops on paint',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      h.setScrollY(SCROLLED_DOWN);            // irrelevant to abort→browse — the gate is home-only
      await toAbortBrowseRevealPending(h);
      // No SETTLE_MS timer may be armed on this path (only pre-existing reveal timers).
      assert.equal(h.clock.pendingDump().filter((t) => t.ms === 600).length, 1,
        'fixture: the abort→browse held reveal has its 600ms net pending');
      assert.equal(settleTimersOf(h).length, 0,
        `abort→browse must arm NO SETTLE_MS timer; found ${JSON.stringify(settleTimersOf(h))}`);
      // And it drops on the double-rAF alone, with no scrollend — the pre-6h behavior.
      await h.raf.frame(); await h.raf.frame();
      const d = flashDrops(h);
      assert.equal(d.length, 1, 'abort→browse drops exactly once on paint');
      assert.equal(viaOf(d[0]), 'paint',
        'abort→browse drops on the paint gate (via=paint), not a settle signal');
    } finally { h.dispose(); }
  });

// ── OWN — drop() removes the scrollend listener so it cannot accumulate unbounded ───────
// PLAN §8 cell OWN (Charpy B2: a leaked listener is INERT — a later scrollend on a
// finished session is a dropped-guarded no-op — so "no second drop" is vacuous; the real
// risk is UNBOUNDED window-listener accumulation across gestures, guarded by the per-drop
// removal). Observed by SPYING window.removeEventListener, not by a second drop.
//
// RED @HEAD: no scrollend listener is ever added, so drop() never calls
// removeEventListener('scrollend', …). Right reason: there is no listener to remove yet.
test('OWN — drop() removes the scrollend listener (spied) so it cannot accumulate',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      // Spy removeEventListener BEFORE the reveal so the drop's removal is captured; forward
      // to the real method so the listener is genuinely removed.
      const removed = [];
      const origRemove = h.window.removeEventListener;
      h.window.removeEventListener = function (type, fn, opts) {
        removed.push({ type, fn });
        return origRemove.call(h.window, type, fn, opts);
      };
      h.setScrollY(SCROLLED_DOWN);
      await toHeldRevealPending(h);
      await h.raf.frame(); await h.raf.frame();   // painted; gate held on settled (no drop yet)
      scrollend(h);                               // arms the diagnostic hold
      await h.clock.advance(SETTLE_HOLD_MS);      // the hold must elapse before drop() runs
      const removedScrollend = removed.filter((r) => r.type === 'scrollend');
      assert.equal(removedScrollend.length, 1,
        `drop() must removeEventListener('scrollend', …) exactly once so listeners cannot accumulate across gestures; saw ${removedScrollend.length}`);
    } finally { h.dispose(); }
  });

// ── FASTPATH — a top / small-scroll commit→home does NOT engage the gate ────────────────
// PLAN §8 cell FASTPATH (the conditional-engagement / no-regression proof, Loki fix). The
// gate engages only when `cur.scroll0 > SETTLE_SCROLL_MIN`; at/near the top the flag is
// false, `settled` starts true, and the reveal takes the exact pre-6h fast path — no
// scrollend listener, no SETTLE_MS timer, drop on `decoded && painted`. This keeps the
// COMMON not-scrolled back-to-Home reveal at its ~40ms timing (no ~250ms hold).
//
// PARITY @HEAD (GREEN): commit→home already drops on paint with no settle machinery.
// Fail-ability is mutation-proven: forcing scrollSettle true unconditionally arms a
// SETTLE_MS timer even at scroll0=0 — see Claude/Curie/RED-swipe-stage6h.md.
test('FASTPATH — commit→home at scroll0=0 keeps the pre-6h fast path (no settle machinery)',
  async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      h.setScrollY(0);                        // top / small scroll -> gate must NOT engage
      await toHeldRevealPending(h);
      // No SETTLE_MS timer may be armed (only pre-existing reveal timers).
      assert.equal(settleTimersOf(h).length, 0,
        `commit→home at scroll0=0 must arm NO SETTLE_MS timer (fast path); found ${JSON.stringify(settleTimersOf(h))}`);
      // Drops on the double-rAF alone, with no scrollend — exactly pre-6h.
      await h.raf.frame(); await h.raf.frame();
      const d = flashDrops(h);
      assert.equal(d.length, 1, 'fast-path commit→home drops exactly once');
      assert.equal(viaOf(d[0]), 'paint',
        'fast-path commit→home drops on paint (via=paint), no settle gate');
    } finally { h.dispose(); }
  });
