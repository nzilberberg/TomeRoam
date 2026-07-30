// M1NOWRITE + M1NAVWINS — the two WRITE-OBSERVATION cells for the home→books abort
// (PLAN-home-shift-fix.md §7.1, §7.2). Authored by Curie.
//
// WHAT THEY PROVE. The fixed park carries NO deferred write: a clean home-source abort makes
// ZERO writes to `#home.scrollTop` (M1NOWRITE), and an external navigation landing inside the
// 340ms settle window OWNS the reveal — its deliberate top reset survives the finalize,
// because the finalize has no scroll write to clobber it with (M1NAVWINS).
//
// WHY THE ORACLE IS A COUNT AND A VALUE PER WINDOW, NOT A RESIDUAL VALUE. jsdom stores
// `scrollTop` writes verbatim and NEVER CLAMPS, so a value of 500 survives a park no matter
// what `#home.parked` declares. A cell asserting "the scroll survives the park" would
// therefore be VACUOUSLY GREEN — it would pass identically with the fix removed. §7.2
// PROHIBITS it, and prohibits building a clamp shim to enable one: modelling the clamp would
// mean asserting the fix against a hand-written model of the very browser behaviour the fix is
// device-owed to confirm. Two earlier cells in this campaign died of exactly that. The
// preservation is DEVICE-owed (§9 R-M1-cause). What survives jsdom's missing clamp is a WRITE
// OBSERVATION, which is what these two cells are.
//
// ⛔ AND NEITHER CELL MAY BE CREDITED WITH INVARIANT P'S THIRD AXIS. jsdom implements no
// scroll anchoring at all, and an anchoring adjustment is not a scripted write — so these
// cells are neither strengthened nor weakened by it and must not claim it (§7.2, prohibition
// 2). That axis is held declaratively by M1PARKRANGE's Tier 0 and behaviourally by the device
// row §9 R-M1-anchor.
//
// THE ORACLE IS DELIBERATELY NOT "no NON-ZERO write". That weakening collapses it back into a
// value check and stops catching a zero-valued policy violation — a future writer touching
// `#home` harmlessly is STILL a second writer, which is the thing M1WRITERSET exists to
// forbid.
//
// THE RECORDER. `Object.defineProperty` on the `#home` ELEMENT with a get/set pair over a
// backing field. `scrollTop` is a configurable accessor on `Element.prototype`; jsdom has NO
// `Element.prototype.scrollTo`/`scrollIntoView`, so the harness's `window.scrollTo` recorder
// is a FUNCTION-PROPERTY replacement and the wrong precedent. The right precedent is in the
// repo: test/browse-decouple.test.js:264-266 and test/browse-render-race.test.js:26-30. The
// recorder is ARMED AFTER the fixture's own setup write, or the seed would be recorded as a
// production write.
//
// REACHABILITY GUARDS ARE MANDATORY (§7.2). A no-write oracle is satisfied perfectly by a
// fixture that never arrives — the exact defect shape this campaign keeps producing. Both
// cells assert the abort actually happened, and M1NAVWINS additionally witnesses the aborted
// gesture's own scrolled offset while it is still settling (the SYNCHRONOUS alternative named
// in §7.2, chosen over the 500ms reveal-FLASH line so no third interval is opened at all).
// Stage 1 (PLAN-swipe-declone.md §5.1) makes the real #home the outgoing mover directly (no
// owned-pane ghost is built for home->browse any more), so that witness is #home's OWN
// scrollTop plus its inline swipe transform, not a ghost clone's translateY.
//
// ⚠️ GREEN AT HEAD BY DESIGN — both are REGRESSION LOCKS over behaviour shipped code already
// has, not red cells. Shipped code passes `resetScroll: false` on the abort finalize and has
// no restore line, which is precisely what the fix must not change. Their ability to fail is
// proven by their registered mutants: M1NOWRITE's flips `resetScroll: false` → `true` at
// js/app.js:1227 (five occurrences of that substring in the file, and the FIRST is the held
// path this fixture never enters — so the entry anchors on the unique
// `render: cur.finPlan.abortRender === 'rerender', ` prefix); M1NAVWINS's is an ADDITIVE
// design-revert appending the retired `cur.ghostY` restore after that same `applyScreen`.
// M1NAVWINS's mutant must redden BOTH cells — if only one reddens, the other is MASKED over
// that crossing, which is a finding to route rather than a `caught` to accept (§7.1).
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// The velocity tracker only resamples after >8ms of REAL time, so a gesture needs real sleeps
// between moves regardless of the fake clock. Captured before any boot patches setTimeout.
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

/**
 * Land on HOME with a browse descriptor on the FWD stack, which is what makes a right-edge
 * forward swipe from home a home→browse transition: commit a Books→Home back-swipe
 * (`fwdStack.push(navStack.pop())`). Same recipe as test/swipe-stage6d.test.js:258-278.
 */
async function onHomeWithBooksForward(h) {
  await settle(h);
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  const row = addRow(h);
  h.touch.start(10, 300, row);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(300, 304); await realSleep(12);
  h.touch.move(700, 306); await realSleep(12);
  h.touch.move(950, 308); await realSleep(12);          // drag the incoming Home fully in → commit
  h.touch.end(980, 308);
  await settle(h); await h.clock.advance(700); await settle(h);
  assert.ok(/commit back books→home/.test(settles(h).at(-1) || ''),
    `fixture sanity: the back-swipe must have committed Books→Home, leaving fwdStack top = books — `
    + `got ${settles(h).at(-1)}`);
}

/**
 * Seed `#home.scrollTop` and THEN arm the write recorder over it, so the seed is not counted
 * as a production write. Returns the ordered write list plus a window-boundary marker.
 */
function armRecorder(h, seed) {
  const el = h.$('home');
  el.scrollTop = seed;                       // the fixture's OWN setup write — before arming
  let backing = seed;
  const writes = [];
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get() { return backing; },
    set(v) { backing = v; writes.push(v); },
  });
  return { writes, mark: () => writes.length, read: () => backing };
}

/** The right-edge forward swipe home→books, retreated to the edge so it ABORTS. */
async function abortForwardFromHome(h) {
  const rx = h.window.innerWidth - 2;
  h.touch.start(rx, 300, h.$('home'));
  h.touch.move(rx - 80, 302); await realSleep(12);      // past the 8px lock → live, mid-drag render
  h.touch.move(rx - 200, 304); await realSleep(12);
  h.touch.move(rx - 20, 304); await realSleep(12);      // retreat toward the edge → aborts
  h.touch.end(rx - 10, 304);
  await settle(h);
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// M1NOWRITE — a home-source abort→home reveal performs ZERO writes to #home.scrollTop,
// because the value was never lost and nothing restores it.
//
// The abort finalize calls `applyScreen(dest, { render: …, resetScroll: false })` (app.js:1227)
// and `dest.v` is 'home' on an abort, so nav.js's home branch runs with `resetScroll` false
// and its `$('home').scrollTop = 0` (nav.js:140) is skipped. That flag is EXISTING and
// LOAD-BEARING for M1's promise, which is why this cell asserts it through its observable
// effect rather than by reading the call site.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('M1NOWRITE — a home-source abort→home reveal performs ZERO writes to #home.scrollTop '
  + '(window B: the clock advance that fires the settleTimer and runs runFinalize)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onHomeWithBooksForward(h);
    const rec = armRecorder(h, 500);

    await abortForwardFromHome(h);
    // ── REACHABILITY GUARD (1), sampled BEFORE the advance because runFinalize clears the
    // swipe transforms: Stage 1 (PLAN-swipe-declone.md §5.1) makes the REAL #home the
    // outgoing mover directly (no owned-pane ghost is built for home->browse any more), so
    // the witness that the gesture genuinely went live is #home's own inline swipe
    // transform, not a ghost's translateY — and #home.scrollTop stays at the seeded 500
    // throughout, because the real element carries its own scroll instead of a captured
    // ghostY. This is the same fixture-sanity property the old ghost witness proved: the
    // gesture ran from a SCROLLED home rather than from the top, where M1 contributes
    // nothing at all.
    assert.ok(rec.read() === 500, 'fixture sanity: #home.scrollTop must still read the seeded 500 '
      + 'mid-gesture — the real element carries its own scroll, so there is no separate ghostY to lose');
    assert.notEqual(h.$('home').style.transform, '',
      'fixture sanity: the aborted gesture must have moved the real #home element (Stage 1: home is '
      + 'the outgoing mover directly) — an empty transform means the drag never went live and this '
      + `cell could pass over a gesture that never started. Got '${h.$('home').style.transform}'`);

    // ── WINDOW B — the clock advance that fires the 340ms settleTimer and runs runFinalize.
    const beforeB = rec.mark();
    await h.clock.advance(700); await settle(h);
    const windowB = rec.writes.slice(beforeB);

    // ── REACHABILITY GUARD (2): the reveal actually RAN. The `#N abort` line is emitted by
    // runFinalize, not by the lift, so it is the witness that window B contained the finalize
    // rather than nothing at all — without it, an empty window B is unfalsifiable.
    assert.ok(/abort fwd home→books/.test(settles(h).at(-1) || ''),
      'fixture sanity: window B must have contained the home→books abort FINALIZE — the `#N abort` '
      + `line is logged by runFinalize itself, so its absence means the no-write oracle was `
      + `satisfied by a fixture that never arrived. Got ${settles(h).at(-1)}`);

    assert.deepEqual(windowB, [],
      'the abort finalize must make NO write to #home.scrollTop. A write here means the reveal '
      + "took applyScreen's resetScroll:true path (nav.js:140 writing 0) or something restored a "
      + `value — either way the park's promise is being compensated for instead of held. Got ${JSON.stringify(windowB)}`);
    assert.deepEqual(rec.writes, [],
      'and NO write anywhere after the recorder was armed — the count-and-value oracle is '
      + 'deliberately not "no NON-ZERO write": a future writer touching #home harmlessly is still '
      + `a SECOND writer, which is what M1WRITERSET forbids. Got ${JSON.stringify(rec.writes)}`);
    assert.equal(rec.read(), 500,
      'and #home.scrollTop still reads the seeded value (it would be 0 if the finalize had taken '
      + 'the resetScroll:true path). ⛔ NOTE THE LIMIT: this is a WRITE-ABSENCE reading, NOT a '
      + 'claim that the scroll survives the park — jsdom never clamps, so it would read 500 with '
      + 'the fix removed. The preservation is device-owed (§9 R-M1-cause).');
  } finally { h.dispose(); }
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// M1NAVWINS — the 3rd adversary KILL's exact interleaving, as a standing regression lock.
//
// THE KILL: the source-gated `cur.ghostY` restore fired 340ms after an interleaved same-view
// Home tap had already swept the settling ghost, un-parked home and deliberately reset it to
// top — so the restore clobbered the user's navigation with a visible 0→500 lurch. Shipped
// code is STABLE at 0 on this interleaving, so that fix REGRESSED it. This design deletes the
// write instead of adding a third gate term, and this cell reddens if any future session
// re-introduces a reveal-time restore.
//
// The oracle is a COUNT AND A VALUE PER WINDOW, which is what makes it immune to the "no
// non-zero write" repair that would collapse it: window A (the external nav step) must record
// EXACTLY ONE write of value 0 — nav.js:140's deliberate reset, the user's own navigation —
// and window B (the clock advance) must record NONE.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('M1NAVWINS — an external navigation landing during a home-source abort settle owns the '
  + 'reveal: window A records exactly one write of 0 and window B records none', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onHomeWithBooksForward(h);
    const el = h.$('home');
    el.scrollTop = 500;                       // the fixture's OWN setup write

    await abortForwardFromHome(h);
    // ── REACHABILITY GUARD, sampled while the gesture is still SETTLING — `settle()` has run
    // synchronously off the lift (so `finishing` is true and the 340ms settleTimer is armed)
    // but `runFinalize` has not, so the abort has not yet been logged. Stage 1
    // (PLAN-swipe-declone.md §5.1) makes the real #home the outgoing mover directly (no
    // owned-pane ghost for home->browse any more), so the witness is #home's OWN scrollTop —
    // still 500, because the real element carries its own scroll rather than a captured
    // ghostY — plus its own inline swipe transform, proving the drag genuinely went live.
    assert.equal(el.scrollTop, 500,
      'fixture sanity: #home.scrollTop must still read the seeded 500 while settling — the value a '
      + 're-introduced restore would write onto the freshly reset home');
    assert.notEqual(h.$('home').style.transform, '',
      'fixture sanity: the aborted gesture must have moved the real #home element while settling — '
      + `an empty transform means the drag never went live. Got '${h.$('home').style.transform}'`);

    // Arm the recorder HERE: window A is the external navigation step, and the seed above must
    // not be counted as a production write.
    let backing = el.scrollTop;
    const writes = [];
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      get() { return backing; },
      set(v) { backing = v; writes.push(v); },
    });

    // ── WINDOW A — the external navigation. The real shipped listener: navbar Home →
    // goHome() → navTo({v:'home'}, null) → same-view replace-top → applyScreen with DEFAULTS,
    // which sweeps the settling ghost (nav.js:114), un-parks home (nav.js:57) and writes 0
    // (nav.js:140, resetScroll defaulting true).
    h.tap('.navbtn[data-nav="home"]'); await settle(h);
    const windowA = writes.slice();
    assert.deepEqual(windowA, [0],
      'the interleaved Home tap must write EXACTLY ONE 0 — the user\'s own deliberate reset '
      + 'through the real shipped listener. Zero writes here means the tap never reached '
      + `applyScreen's home branch and this cell is testing nothing. Got ${JSON.stringify(windowA)}`);
    // Stage 1 (PLAN-swipe-declone.md §5.1): there is no ghost to sweep any more (#home was
    // never a pane to begin with) — what the external navigation must still do is reset the
    // real #home's in-flight swipe transform (Nav.resetSwipeStyles, called at the top of
    // every applyScreen), which is what detaches the transitionend anchor and makes the
    // 340ms timer the guaranteed finalize.
    assert.equal(h.$('home').style.transform, '',
      'fixture sanity: the external navigation must have reset the real #home\'s in-flight swipe '
      + 'transform');

    // ── WINDOW B — the clock advance that fires the settleTimer and runs runFinalize.
    const beforeB = writes.length;
    await h.clock.advance(700); await settle(h);
    const windowB = writes.slice(beforeB);

    // The finalize really RAN inside window B — the `#N abort` line is emitted by runFinalize
    // itself. Without this witness an empty window B is unfalsifiable, which is the campaign's
    // own recurring defect shape (a claim credited to a crossing nothing drove).
    assert.ok(/abort fwd home→books/.test(settles(h).at(-1) || ''),
      'fixture sanity: window B must have contained the settling gesture\'s FINALIZE — otherwise '
      + `the no-write assertion below is satisfied by nothing having happened. Got ${settles(h).at(-1)}`);

    assert.deepEqual(windowB, [],
      'the settling gesture must write NOTHING after an external navigation has taken the reveal. '
      + 'A write here is the 3rd KILL reproduced: a deferred write into a shared observable with '
      + 'nothing proving the gesture still owns the reveal it writes into. An ABSENT write needs '
      + `no ownership witness, which is why this design has none. Got ${JSON.stringify(windowB)}`);
    assert.equal(backing, 0,
      'and #home stays where the user\'s navigation put it — a re-introduced restore would lurch '
      + 'it 0→500 a third of a second after the tap, which is exactly the visible regression the '
      + 'adversary measured against stable shipped behaviour');
  } finally { h.dispose(); }
});
