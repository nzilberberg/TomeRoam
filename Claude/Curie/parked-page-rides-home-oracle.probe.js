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
//   3. Paste this file into the console, then:
//        await PARKORACLE.preflight()   // REQUIRED — see below
//        PARKORACLE.fireDrill()          // optional but cheap
//        PARKORACLE.run()                // at EACH of 375, 640 and 1000 px — resize BETWEEN runs
//        PARKORACLE.report()
//
// ⭐ NOTHING HERE IS A STEP YOU CAN FORGET AND STILL GET A PASS. Skip `preflight()` and `run()`
// fails; run against a stale stylesheet and `run()` fails; sample through a stuck animation and
// `run()` fails. Every trap below is enforced by a failure path, not by this comment — the two
// that were not, both let the instrument report PASS while measuring something other than the
// shipped rule under a live gesture (coverage audit, findings M3 and M4).
//
// ⚠️ BENCH TRAPS, measured. A HIDDEN browser pane freezes CSS animation and transition timelines
// and rAF entirely and throttles timers to ~1s (strike record, "Bench facts"). Two consequences,
// both now assertions rather than warnings:
//   * `animationend` never fires, so `js/nav.js:163` never removes `nav-in-*` and a stuck keyframe
//     PINS every rect this oracle reads — the drag scrolls past underneath and the numbers do not
//     move. Caught per-sample; `PARKORACLE.repair()` clears it.
//   * settle glides never move, so `settleCheck()` says INCONCLUSIVE rather than reporting a pass
//     it did not observe.
// Keep the pane VISIBLE anyway; the assertions are the backstop, not the plan.
//
// ⚠️ AND THE STYLESHEET MAY NOT BE THE ONE ON DISK. Measured: one profile held two shell caches
// (`…-2026-08-01.303` and `…-2026-08-02.304`) with the older serving, so the bench applied
// `translateX(-101vw)` while the tree shipped `-300vw`. `preflight()` is what makes that a failure
// instead of a footnote, and it is required precisely because the mirror image — a good cached
// stylesheet over a REGRESSED tree — produces a silent PASS that nothing in the geometry can see.
//
// ⚠️ THE VIEWPORT IS HELD CONSTANT WITHIN A RUN. A mid-gesture width change is outside the law's
// stated precondition (plan §4 F5) — the adversary executed it and measured 62px of re-entry at
// 812->375. That is an admitted clause of the law, not a defect this oracle is looking for.
(() => {
  const runs = [];

  const pages = () => [...document.querySelectorAll('.browsepage')];

  /** The shipped park magnitude, in vw. Every run asserts the value it is ACTUALLY testing. */
  const SHIPPED_PARK_VW = 300;

  /** Preflight state. `run()` refuses to report a PASS until this has been run AND passed. */
  const state = { preflight: null };

  /**
   * Is a `nav-in-*` keyframe animation running on this element?
   *
   * ⭐ WHY THIS IS AN ASSERTION AND NOT A NOTE. An animation beats an inline style in the cascade,
   * so a stuck `nav-in-*` PINS an element's rect while the gesture's own inline write scrolls past
   * underneath it — and `getBoundingClientRect()` reports the pinned position without complaint.
   * MEASURED by the coverage audit: `#browse`'s inline ran `translateX(863px) -> translateX(40px)`
   * across 8 samples while its rect stayed at left 820 for all 8, `animationName = navInRight`.
   * `js/nav.js:163` removes the class on `animationend`, which NEVER FIRES on a hidden pane — and
   * a hidden pane is this bench's default failure mode, already recorded as a bench fact by the
   * adversary. At V <= 640 the pinned position coincidentally equals the gesture maximum so the run
   * is still worst-case; at V = 1000 it understates displacement by 360px — the one width the
   * matrix exists to vary L and W at is the one a frozen instrument under-exercises.
   */
  function stuckAnimation(el) {
    let name = 'none';
    try { name = getComputedStyle(el).animationName || 'none'; } catch { name = 'unreadable'; }
    if (name === 'none') return null;
    return name;
  }

  /** Every element whose rect this oracle relies on: the host and every page. */
  const measuredElements = () => [document.getElementById('browse'), ...pages()].filter(Boolean);

  /** One sample of every .browsepage, with the HIT rule applied. */
  function snap(tag) {
    const V = window.innerWidth;
    const out = [];
    // Contamination is recorded PER SAMPLE, so a stuck animation that starts mid-drag is caught
    // rather than averaged away by a single check before the gesture.
    const contaminated = measuredElements()
      .map((el) => ({ el: el.id ? '#' + el.id : '.browsepage', anim: stuckAnimation(el) }))
      .filter((r) => r.anim);
    for (const p of pages()) {
      const r = p.getBoundingClientRect();
      const rec = {
        tag,
        parked: p.classList.contains('parked'),
        inline: p.style.transform || '',
        left: Math.round(r.left), right: Math.round(r.right),
        w: Math.round(r.width), h: Math.round(r.height),
        animContamination: contaminated.map((c) => `${c.el}:${c.anim}`).join(',') || '',
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
  /** The magnitude, in vw, of the park offset the browser is ACTUALLY applying right now. */
  function parkVwNow() {
    const rule = parkRule();
    if (!rule) return null;
    const m = /translateX\(\s*(-?\d+(?:\.\d+)?)vw\s*\)/i.exec(rule.style.transform || '');
    return m ? Math.abs(Number(m[1])) : null;
  }

  /**
   * PREFLIGHT — is the page running the stylesheet the TREE currently ships?
   *
   * ⭐ WHY THIS IS FAIL-CLOSED AND NOT A `HOW TO RUN` STEP. The standards call a discipline the
   * fallback shape, and this instrument is the ONLY witness for dimension 10: it is manual, it
   * lives outside `npm test`, and the next person to run it will be someone who was not in the
   * session that wrote it, on a bench whose default state serves a stale stylesheet.
   *
   * MEASURED by the coverage audit: one profile held `tomeroam-shell-2026-08-01.303` and
   * `tomeroam-shell-2026-08-02.304` at once, with the `.303` one serving — so the bench applied
   * `translateX(-101vw)` while the tree shipped `-300vw`. That direction is loud (the run reports
   * hits). **The dangerous direction is the mirror**: a warm cache serving a good `-300vw` over a
   * tree that has been regressed to `-101vw`. Nothing in the geometry can see that, so `run()`
   * would report PASS and `report()` would print "dimension 10 witnessed at all three widths" —
   * this project's named scar, sitting inside the one cell that witnesses dimension 10.
   *
   * `build.json` is the discriminator, and it is trustworthy here BY ROUTE, not by luck: the
   * service worker routes it `'probe'` — network-only, never cached (`js/swkit.js` routeFor,
   * `sw.js` probeOnly) — precisely so a cached copy cannot fake reachability. So it reports what
   * the TREE serves while `caches.keys()` reports what the PAGE may be running. A disagreement
   * between them is exactly the staleness both directions share.
   */
  async function preflight() {
    const problems = [];
    const info = { parkVw: parkVwNow(), buildVersion: null, shellCaches: [], registrations: null };

    if (info.parkVw === null) {
      problems.push('the `.browsepage.parked` rule declares no translateX in vw — the value under test cannot be read at all.');
    } else if (info.parkVw !== SHIPPED_PARK_VW) {
      problems.push(`the SERVED park offset is ${info.parkVw}vw, not the shipped ${SHIPPED_PARK_VW}vw. `
        + 'The page is running a stylesheet that is not the one the tree ships.');
    }

    try {
      const r = await fetch('build.json?oracle=' + Date.now(), { cache: 'no-store' });
      const j = await r.json();
      info.buildVersion = j.version || j.build || JSON.stringify(j);
    } catch (e) {
      problems.push('could not fetch build.json (network-only by SW route) — freshness is unverifiable: ' + e);
    }

    try {
      info.shellCaches = (await caches.keys()).filter((k) => /shell/i.test(k));
    } catch (e) {
      problems.push('could not read caches.keys() — freshness is unverifiable: ' + e);
    }
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      info.registrations = regs.length;
    } catch { info.registrations = null; }

    if (info.shellCaches.length > 1) {
      problems.push(`${info.shellCaches.length} shell caches are present (${info.shellCaches.join(', ')}). `
        + 'More than one means an older build\'s assets can still be served — which is how the '
        + 'stale-stylesheet defect was measured. Unregister the worker and clear the caches.');
    }
    if (info.buildVersion && info.shellCaches.length === 1 && !info.shellCaches[0].includes(info.buildVersion)) {
      problems.push(`the shell cache is ${info.shellCaches[0]} but the tree serves build ${info.buildVersion}. `
        + 'The page is running assets from a different build than the one on disk — the mirror-image '
        + 'staleness in which a good cached stylesheet hides a regressed tree.');
    }

    state.preflight = { ok: problems.length === 0, problems, info, at: Date.now() };
    console.log(`[PARKORACLE] preflight park=${info.parkVw}vw build=${info.buildVersion} `
      + `shellCaches=${JSON.stringify(info.shellCaches)} sw=${info.registrations} `
      + `-> ${state.preflight.ok ? 'OK' : 'BLOCKED'}`);
    for (const p of problems) console.error('   ' + p);
    if (!state.preflight.ok) {
      console.error('   ⛔ run() will now FAIL rather than report a geometry result, because the value '
        + 'under test is not known to be the shipped one. Clear the bench and re-run preflight().');
    }
    return state.preflight;
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

  /**
   * One run at the CURRENT viewport width. Returns a verdict object and logs it.
   * `opts.expectParkVw` is the value this run CLAIMS to be exercising — 300 for a real run, 101
   * for the fire drill. It is asserted, not merely recorded.
   */
  function run(label, opts = {}) {
    const expectParkVw = opts.expectParkVw == null ? SHIPPED_PARK_VW : opts.expectParkVw;
    const V = window.innerWidth;
    const rule = parkRule();
    const parkText = rule ? rule.style.transform : '(rule not found)';
    const parkVw = parkVwNow();

    const { samples } = forwardDrag();
    const moveSamples = samples.filter((s) => /^mv/.test(s.tag));

    const failures = [];

    // ── WHICH RULE IS THIS RUN ACTUALLY TESTING? Asserted, not merely printed. Recording a value
    // in the verdict that no failure path depends on is how an instrument reports PASS while
    // looking at something other than the shipped rule.
    if (parkVw === null) {
      failures.push(`UNVERIFIED VALUE: the live .browsepage.parked rule declares no translateX in vw (${parkText}) — this run cannot say what it tested.`);
    } else if (parkVw !== expectParkVw) {
      failures.push(`WRONG RULE: this run claims to exercise ${expectParkVw}vw but the browser is applying ${parkVw}vw (${parkText}).`);
    }
    if (!state.preflight) {
      failures.push('NO PREFLIGHT: run `await PARKORACLE.preflight()` first. Without it the run cannot tell a shipped stylesheet from one served out of a stale shell cache, and a PASS would be unfalsifiable.');
    } else if (!state.preflight.ok) {
      failures.push('PREFLIGHT BLOCKED: ' + state.preflight.problems.join(' | '));
    }

    // ── IS THE INSTRUMENT EXPOSED TO THE GESTURE? An animation beats an inline write in the
    // cascade, so a stuck `nav-in-*` pins every rect this oracle reads while the drag scrolls past
    // underneath. Fail-closed, the way the non-degeneracy assertions already are.
    const contaminated = samples.filter((s) => s.animContamination);
    if (contaminated.length) {
      const names = [...new Set(contaminated.map((s) => s.animContamination))].join(' | ');
      failures.push(`ANIMATION OVERRIDE: a nav-in-* keyframe was running during ${contaminated.length} sample(s) (${names}). `
        + 'An animation beats the gesture\'s inline transform in the cascade, so every rect below is '
        + 'pinned at the keyframe position rather than tracking the drag. Call PARKORACLE.repair() '
        + '(what animationend does at js/nav.js:163, and never fires on a hidden pane) and re-run.');
    }

    // ── IN-SCRIPT ANTI-VACUITY (plan F6). Each of these makes the geometry claim below mean
    // something; without them "no page intersects the viewport" is true of an empty page set, of
    // a display:none page whose rect is all zeros, and of a build that stopped parking entirely.
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
      parkVw,
      expectParkVw,
      preflightOk: !!(state.preflight && state.preflight.ok),
      buildVersion: state.preflight && state.preflight.info ? state.preflight.info.buildVersion : null,
      animContaminatedSamples: contaminated.length,
      samples: samples.length,
      moveSamples: moveSamples.length,
      parkedSampled: parkedSamples.length,
      nonDegenerateParked: nonDegenerateParked.length,
      hits,
      failures,
      pass: failures.length === 0,
    };
    runs.push(verdict);
    console.log(`[PARKORACLE] ${verdict.label} park=${parkText} (expect ${expectParkVw}vw) `
      + `build=${verdict.buildVersion} samples=${verdict.samples} `
      + `parked=${verdict.parkedSampled} nonDegenerate=${verdict.nonDegenerateParked} `
      + `anim=${contaminated.length} hits=${hits.length} -> ${verdict.pass ? 'PASS' : 'FAIL'}`);
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
   * REPAIR — do what `animationend` does at `js/nav.js:163`, which never fires on a hidden pane.
   * Offered because the ANIMATION OVERRIDE failure names it, but it is the fix, not the guard:
   * the guard is that `run()` FAILS rather than reporting a pinned rect as a measurement.
   */
  function repair() {
    let n = 0;
    for (const el of document.querySelectorAll('.nav-in-left, .nav-in-right')) {
      el.classList.remove('nav-in-left', 'nav-in-right');
      n++;
    }
    console.log(`[PARKORACLE] repair: cleared nav-in-* from ${n} element(s). Re-run.`);
    return n;
  }

  /**
   * THE FIRE DRILL — the instrument proven able to fire before its silence is read as evidence.
   * Flips the LIVE rule back to -101vw, runs one drag, and restores. At -101vw this MUST report
   * hits; if it does not, the instrument is broken and every silent run above is worthless.
   * Kept as a SECOND line of defence — the in-script anti-vacuity above is the first.
   *
   * It passes its OWN expectation (101), so the "which rule is this testing" assertion holds here
   * too rather than being switched off for the one run that deliberately changes the value.
   */
  function fireDrill() {
    const rule = parkRule();
    if (!rule) { console.error('[PARKORACLE] fire drill: `.browsepage.parked` rule not found'); return null; }
    const original = rule.style.transform;
    rule.style.transform = 'translateX(-101vw)';
    const v = run('FIRE DRILL @ -101vw (expected: HITS)', { expectParkVw: 101 });
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

    // A run that exercised something other than the shipped value cannot contribute to the matrix,
    // even if its geometry was clean. Checked here as well as in run(), because `report()` is the
    // line that gets quoted — "dimension 10 witnessed at all three widths" is the sentence that
    // must not be printable over a stale stylesheet.
    const wrongValue = real.filter((r) => r.parkVw !== SHIPPED_PARK_VW)
      .map((r) => `${r.label}: tested ${r.parkVw}vw`);
    if (wrongValue.length) {
      console.error('[PARKORACLE] ⛔ these runs did not exercise the shipped park offset:\n   ' + wrongValue.join('\n   '));
    }
    const preflightOk = !!(state.preflight && state.preflight.ok);
    if (!preflightOk) {
      console.error('[PARKORACLE] ⛔ no PASSING preflight — the stylesheet under test is not known to '
        + 'be the one the tree ships, so no run below can witness dimension 10.');
    }

    const pass = !missing.length && !failed.length && real.length > 0 && !wrongValue.length && preflightOk;
    console.log(`[PARKORACLE] ${pass ? 'PASS — dimension 10 witnessed at all three widths.' : 'NOT PASSED.'}`);
    return { pass, missing, failed, wrongValue, preflightOk, runs: real };
  }

  window.PARKORACLE = { preflight, run, settleCheck, fireDrill, repair, report, snap, runs, state };
  console.log('[PARKORACLE] ready. await preflight() -> fireDrill() -> run() at 375, 640, 1000 -> report(). '
    + 'preflight() is REQUIRED: without it run() fails rather than reporting geometry, because a '
    + 'stale shell cache can serve a stylesheet that is not the one the tree ships.');
})();
