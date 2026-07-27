# Charpy verdict — PLAN-swipe-stage6f r3 (target HEAD cb7ae3d) — FINAL

Type: review

Verdict: **FORGE**

Artifact under review: `Claude/Plans/PLAN-swipe-stage6f.md` at git HEAD `cb7ae3d` (immutable —
Vitruvius's r3 close of the da2ea6c T1-residual TEMPER). Reviewer: Charpy (plan review). Read-only.
Date: 2026-07-27.
Prior verdicts: `PLAN-swipe-stage6f-3300e8f.md` (TEMPER, T1-T4) → `PLAN-swipe-stage6f-da2ea6c.md`
(TEMPER, T1 residual: the `transition-matrix.test.js` `expectGhost` predicate) → this (FORGE).

## The one blocking change is closed

The r2 blocking item was the T1 residual: `test/transition-matrix.test.js`'s SECOND test (79-96)
hard-codes the OLD ghost rule at line 85, which reddens when the spec flips. The r3 revision closes
it correctly in BOTH required places:

- **§2 (Changes), lines 181-190** — adds the predicate co-change to the scope boundary, naming the
  second test, the failure it would otherwise cause (`assert.deepEqual(wrong, [])` non-empty), the
  exact fix (line 85 → `const expectGhost = c.from !== 'overlay' && c.to !== 'home';`; the line-83
  doc-comment → "GHOST iff source is not an overlay AND destination is NOT home"), and that `paneOf`
  at line 90 auto-follows.
- **§9 (scrub list)** — carries the same co-change as a defining-record edit staged in the SAME
  commit as the spec edit.

Verified:
- The new predicate `c.from !== 'overlay' && c.to !== 'home'` is correct against all eight structural
  cases (home→browse/home→overlay/browse→browse/browse→overlay = ghost; browse→home + the three
  overlay-source rows = not-ghost) — matching the post-edit spec exactly.
- Re-scanned `test/` and `tools/` for any remaining old-rule encoding
  (`grep "=== 'browse'|!== 'overlay'"` filtered to ghost/pane/outgoing): the ONLY hit is
  `transition-matrix.test.js:85` — the exact line the plan now scrubs. No other file encodes the old
  rule. The scrub is complete.
- T4 CSS citations corrected to the actual `background:` declaration lines: `#options`
  (css/app.css:134), `#nowplaying` (:421), the five subs (:695) — matches HEAD.

## Carried forward, already verified closed (r2)

- **T2** — fingerprint mislabel corrected (the `gen-swipe-model.mjs:44-61` region hashes of untouched
  app.js must not change); `NEW_POLICIES` "no new entry" is the correct call (that ledger tracks
  recovery/supersession behaviour deviations, not construction representation; reversion is guarded by
  the frozen spec + `swipe-transition` oracle).
- **T3** — no-peek geometry honestly split (structural invariant CI-proven; inset-overlay
  topbar/navbar band exposure device-verified, not overclaimed); verified against CSS.
- **T4** — enumerated all-seven-overlay opaque precondition; the load-bearing fact (all paint
  `var(--page-bg)`) is verified true.

## What is FORGED (the sound core, for the record)

The one-line `constructionPlanFor` change (swipe.js:135-136) is logically correct and routes
in-flow→overlay through the shipped app-ghost machinery with no new build code; the frozen-oracle edit
(spec 55/58/181) plus the now-added `transition-matrix.test.js` predicate is the complete, correct
mirror; the transform-on-the-real-view hypothesis is confirmed in code (there IS a transform to
remove); the coverage cells are non-vacuous, observable, and mutation-valid; the honesty framing is
intact (the flash is device-only, the headline browse→browse is a disclosed T8 fork, the structural
invariant is the sole CI-gated promise). The load-bearing promise handed to Loki is single and
well-formed: no code path lets the real in-flow view receive a swipe transform on an in-flow→overlay
gesture.

## Advisories to the makers (non-blocking; carry into Curie/Brunel/Loki)

- Curie/Brunel: the spec edit is now a THREE-part atomic co-change in one commit — the production
  value (swipe.js:135-136), the independent oracle (swipe-plan-spec.mjs:55/58/181 + comment 33), and
  the spec-consistency predicate (transition-matrix.test.js:83/85) — plus both generated-doc regens
  (transition-matrix + swipe-model). All five land together or the suite is red.
- Brunel: do NOT re-pin the `gen-swipe-model.mjs:44-61` mirrored-region fingerprints — they hash
  untouched app.js and must stay constant; only the rendered construction/pane rows regenerate.
- Loki: the CI-observable fracture is (1)/(2) — the real `#browse`/`#home` carrying a transform on a
  real in-flow→overlay drag, read on the real DOM via `h.touch`. The coverage/no-peek fracture (3) is
  primarily device/geometry and is disclosed, not gated.

## Verdict

**FORGE.** All four temper items (T1 including its residual, T2, T3, T4) are closed and verified
against real code. The scrub is complete — no old-rule encoding remains in HEAD. The plan is sound,
honestly scoped, and ready to hand to Curie for the red suite.

Verdict: **FORGE**
