// PARKCLEARSHOME — the real-engine oracle for PLAN-parked-page-rides-home.md §8 dimension 10.
// Authored by the test author, 2026-08-02, at HEAD 04739c9.
//
// ⛔ THIS IS DELIBERATELY NOT A CI CELL, and that is a correctness decision rather than a
// convenience one. jsdom returns an all-zero rect for every element, so `right <= 0` is satisfied
// by 0 <= 0 for anything at all: a jsdom cell asserting this geometry COULD NOT FAIL. That is a
// false witness, not weak coverage (EngineeringContract §4.8). The repo carries no headless-engine
// dependency, so the oracle is a standalone script any real engine can execute, filed beside the
// test design the way this project already files real-engine probes (Claude/Loki/*.probe.js).
//
// WHAT IT PROVES. At a fixed viewport, with a warm page cache holding a hidden non-destination
// page, no `.browsepage` positioned BY THE PARK OFFSET intersects the viewport at any touchmove
// sample of a forward home->books drag — and the destination still settles at 0.
//
// ⭐ "POSITIONED BY THE PARK OFFSET" IS LOAD-BEARING, NOT HEDGING. A parked browse->browse
// OUTGOING mover overlaps the viewport BY DESIGN: it wears `.parked` for the whole drag while
// js/app.js writes `style.transform` on it every frame, and Invariant P guarantees the inline
// write beats the class rule. The adversary executed exactly that case at -300vw (right +70,
// inline present) and it is correct behaviour. A HIT therefore requires NO INLINE TRANSFORM. An
// oracle that omitted this clause would fire on the shipped, intended filmstrip.
//
// ⭐ ANTI-VACUITY IS IN THE SCRIPT, NOT IN THE OPERATOR'S MEMORY (plan F6). `right <= 0` is
// satisfied by a `display:none` element, whose rect is all zeros in a real engine — so a page that
// is HIDDEN rather than parked greens this oracle by degeneracy. Resting on "run it at -101vw
// first and watch it fire" would make the one cell that witnesses dimension 10 depend on whether
// the next operator, who was not in the session that wrote it, remembers a discipline. Every run
// therefore asserts, itself: a `.browsepage` was sampled at all; at least one sampled page carried
// `.parked`; and that page's rect was NON-DEGENERATE (width > 0 AND height > 0). The -101vw fire
// drill is KEPT below as a second line of defence, not as the only one.
//
// ── HOW TO RUN ───────────────────────────────────────────────────────────────────────────────
//   1. `node tools/serve.mjs --port 8899`, open the app in a REAL Blink engine, sign in (or use
//      the strike record's localhost-PMS bench recipe:
//      Claude/Loki/parked-page-rides-home-strike-2026-08-02.md, "Bench").
//   2. Build the warm-cache repro state THROUGH REAL UI PATHS ONLY:
//      Books tab -> a book row (files page) -> Home tab -> Books tab -> back-swipe commit.
//      You are now on Home, fwdStack = [books], with a cached chapter-list page.
//   3. Paste this file into the console, then: `PARKORACLE.fireDrill()` once (optional but cheap),
//      then `PARKORACLE.run()` at EACH of 375, 640 and 1000 px viewport width — resize BETWEEN
//      runs, never during one. Finally `PARKORACLE.report()`.
//
// ⚠️ BENCH TRAPS, measured (strike record, "Bench facts"). A HIDDEN browser pane freezes CSS
// animation and transition timelines and rAF entirely and throttles timers to ~1s: transitionend
// never fires and settle glides never move. Keep the pane VISIBLE. All drag sampling below is
// fully synchronous and reads getBoundingClientRect(), which is the reliable oracle either way;
// only the settle check waits on real time, and it says so when it cannot conclude.
//
// ⚠️ THE VIEWPORT IS HELD CONSTANT WITHIN A RUN. A mid-gesture width change is outside the law's
// stated precondition (plan §4 F5) — the adversary executed it and measured 62px of re-entry at
// 812->375. That is an admitted clause of the law, not a defect this oracle is looking for.
(() => {
  const runs = [];

  const pages = () => [...document.querySelectorAll('.browsepage')];

  /** One sample of every .browsepage, with the HIT rule applied. */
  function snap(tag) {
    const V = window.innerWidth;
    const out = [];
    for (const p of pages()) {
      const r = p.getBoundingClientRect();
      const rec = {
        tag,
        parked: p.classList.contains('parked'),
        inline: p.style.transform || '',
        left: Math.round(r.left), right: Math.round(r.right),
        w: Math.round(r.width), h: Math.round(r.height),
      };
      rec.nonDegenerate = rec.w > 0 && rec.h > 0;
      // CLASS-GOVERNED: parked, positioned by the park offset (no inline transform), a real box,
      // and intersecting the viewport. Anything else is either intended (a mover) or degenerate.
      rec.HIT = rec.parked && !rec.inline && rec.nonDegenerate && rec.right > 0 && rec.left < V;
      out.push(rec);
    }
    return out;
  }

  const touch = (tgt, type, x, y) => {
    const t = new Touch({ identifier: 1, target: tgt, clientX: x, clientY: y, pageX: x, pageY: y });
    const empty = type === 'touchend';
    tgt.dispatchEvent(new TouchEvent(type, {
      touches: empty ? [] : [t], targetTouches: empty ? [] : [t],
      changedTouches: [t], bubbles: true, cancelable: true,
    }));
  };

  /** The live `.browsepage.parked` rule, so the fire drill can flip the constant in place. */
  function parkRule() {
    for (const ss of document.styleSheets) {
      let rules;
      try { rules = ss.cssRules; } catch { continue; }
      for (const r of rules) if (r.selectorText === '.browsepage.parked') return r;
    }
    return null;
  }

  /**
   * A fully synchronous forward home->books drag, sampling every move. Synchronous by design: it
   * is immune to the frozen-timeline trap, and every sample is taken while the gesture is live —
   * which is the whole point, since six earlier hypotheses about this defect missed it by sampling
   * AT REST, where the state is clean.
   */
  function forwardDrag(steps = 7) {
    const V = window.innerWidth;
    const y = Math.round(window.innerHeight / 2);
    const fromX = V - 10;
    const toX = 30;
    const tgt = document.elementFromPoint(fromX, y) || document.body;
    const samples = [];
    touch(tgt, 'touchstart', fromX, y);
    samples.push(...snap('ts'));
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(fromX + (toX - fromX) * i / steps);
      touch(tgt, 'touchmove', x, y);
      samples.push(...snap('mv' + i));
    }
    touch(tgt, 'touchend', toX, y);
    samples.push(...snap('te'));
    return { tgt, samples };
  }

  /** One run at the CURRENT viewport width. Returns a verdict object and logs it. */
  function run(label) {
    const V = window.innerWidth;
    const rule = parkRule();
    const parkText = rule ? rule.style.transform : '(rule not found)';

    const { samples } = forwardDrag();
    const moveSamples = samples.filter((s) => /^mv/.test(s.tag));

    // ── IN-SCRIPT ANTI-VACUITY (plan F6). Each of these makes the geometry claim below mean
    // something; without them "no page intersects the viewport" is true of an empty page set, of
    // a display:none page whose rect is all zeros, and of a build that stopped parking entirely.
    const failures = [];
    if (!samples.length) failures.push('VACUOUS: no .browsepage was sampled at all — the page cache is cold. Build the warm-cache repro state first (see the header).');
    const parkedSamples = samples.filter((s) => s.parked);
    if (!parkedSamples.length) failures.push('VACUOUS: no sampled page ever carried `.parked` — this run witnesses nothing about the park offset.');
    const nonDegenerateParked = parkedSamples.filter((s) => s.nonDegenerate);
    if (parkedSamples.length && !nonDegenerateParked.length) {
      failures.push('VACUOUS: every parked sample had a zero-size rect (width or height 0). A hidden or unmounted page satisfies `right <= 0` by collapsing, which greens this oracle by degeneracy.');
    }

    // ── THE GEOMETRY CLAIM.
    const hits = samples.filter((s) => s.HIT);
    if (hits.length) {
      failures.push(`OVERLAP: ${hits.length} sample(s) show a class-governed parked page on the viewport.`);
    }

    const verdict = {
      label: label || `V=${V}`,
      viewportWidth: V,
      parkDeclaration: parkText,
      samples: samples.length,
      moveSamples: moveSamples.length,
      parkedSampled: parkedSamples.length,
      nonDegenerateParked: nonDegenerateParked.length,
      hits,
      failures,
      pass: failures.length === 0,
    };
    runs.push(verdict);
    console.log(`[PARKORACLE] ${verdict.label} park=${parkText} samples=${verdict.samples} `
      + `parked=${verdict.parkedSampled} nonDegenerate=${verdict.nonDegenerateParked} `
      + `hits=${hits.length} -> ${verdict.pass ? 'PASS' : 'FAIL'}`);
    for (const f of failures) console.error('   ' + f);
    if (hits.length) console.table(hits);
    return verdict;
  }

  /**
   * I6 — the destination must still settle at 0. Separate from run() because it is the one check
   * that waits on real time; a frozen (hidden-pane) timeline cannot conclude it, and it says so
   * rather than reporting a pass it did not observe.
   */
  async function settleCheck(ms = 900) {
    await new Promise((r) => setTimeout(r, ms));
    const shown = pages().find((p) => !p.classList.contains('hidden') && !p.classList.contains('parked'));
    if (!shown) { console.error('[PARKORACLE] settle: no shown .browsepage — INCONCLUSIVE'); return null; }
    const r = shown.getBoundingClientRect();
    const ok = Math.abs(r.left) <= 1 && r.width > 0;
    console.log(`[PARKORACLE] settle: shown page left=${Math.round(r.left)} width=${Math.round(r.width)} -> ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok && r.width === 0) console.error('   INCONCLUSIVE rather than FAIL if the pane was hidden: a frozen timeline never runs the settle glide.');
    return ok;
  }

  /**
   * THE FIRE DRILL — the instrument proven able to fire before its silence is read as evidence.
   * Flips the LIVE rule back to -101vw, runs one drag, and restores. At -101vw this MUST report
   * hits; if it does not, the instrument is broken and every silent run above is worthless.
   * Kept as a SECOND line of defence — the in-script anti-vacuity above is the first.
   */
  function fireDrill() {
    const rule = parkRule();
    if (!rule) { console.error('[PARKORACLE] fire drill: `.browsepage.parked` rule not found'); return null; }
    const original = rule.style.transform;
    rule.style.transform = 'translateX(-101vw)';
    const v = run('FIRE DRILL @ -101vw (expected: HITS)');
    rule.style.transform = original;
    if (!v.hits.length) {
      console.error('[PARKORACLE] ⛔ THE FIRE DRILL DID NOT FIRE. The instrument cannot detect the '
        + 'shipped defect, so a silent run proves nothing. Fix the bench before trusting any PASS.');
    } else {
      console.log('[PARKORACLE] ✓ fire drill fired — the instrument can detect the defect, so silence is evidence.');
    }
    return v;
  }

  /** The matrix verdict. Plan §8 dimension 4: 375, 640 and 1000, each at a constant width. */
  const REQUIRED_WIDTHS = [375, 640, 1000];
  function report() {
    const real = runs.filter((r) => !/FIRE DRILL/.test(r.label));
    const covered = new Set(real.map((r) => r.viewportWidth));
    const missing = REQUIRED_WIDTHS.filter((w) => !covered.has(w));
    const failed = real.filter((r) => !r.pass);
    console.log(`[PARKORACLE] runs=${real.length} widths=${[...covered].join(',')} failed=${failed.length}`);
    if (missing.length) {
      console.error(`[PARKORACLE] ⛔ INCOMPLETE: no run at ${missing.join(', ')}px. 640 is the TIGHT `
        + 'boundary — where W = V and L = 0, so the parked page\'s right edge sits exactly on the '
        + 'viewport edge when the offset equals the floor. That is why the law is a strict '
        + 'inequality, and it is the width least safe to skip.');
    }
    for (const r of failed) console.error(`[PARKORACLE] FAILED ${r.label}: ${r.failures.join(' | ')}`);
    const pass = !missing.length && !failed.length && real.length > 0;
    console.log(`[PARKORACLE] ${pass ? 'PASS — dimension 10 witnessed at all three widths.' : 'NOT PASSED.'}`);
    return { pass, missing, failed, runs: real };
  }

  window.PARKORACLE = { run, settleCheck, fireDrill, report, snap, runs };
  console.log('[PARKORACLE] ready. fireDrill() -> run() at 375, 640, 1000 -> report(). '
    + 'Warm the page cache first (see the header) or every run reports VACUOUS.');
})();
