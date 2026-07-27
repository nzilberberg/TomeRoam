# Charpy verdict — PLAN-swipe-stage6f r2 (target HEAD da2ea6c)

Type: review

Verdict: **TEMPER**

Artifact under review: `Claude/Plans/PLAN-swipe-stage6f.md` at git HEAD `da2ea6c` (immutable —
Vitruvius's r2 close of the 3300e8f TEMPER). Reviewer: Charpy (plan review). Read-only on the craft.
Date: 2026-07-27. Prior verdict: `Claude/Charpy/PLAN-swipe-stage6f-3300e8f.md` (TEMPER, T1-T4).

Three of the four prior temper items (T2, T3, T4) are genuinely closed against real code. T1 is
closed for the artifact it named (`docs/transition-matrix.generated.txt`) but the T1-class scrub is
still **incomplete by one file**: the SAME test file carries a second, independent rule-encoding
gate that reddens when the spec flips and the plan does not scrub it. One blocking change; then FORGE.

---

## The one blocking change — T1 residual: `test/transition-matrix.test.js` encodes the OLD ghost rule in a SECOND test

`test/transition-matrix.test.js` contains TWO tests. The plan's §2/§9 correctly add regeneration of
`docs/transition-matrix.generated.txt`, whose byte-exact gate is **test 1** (line 34). But **test 2**
(lines 79-96, "the frozen spec builds a pane exactly when the GHOST/SNAPSHOT rules say") is a
spec-self-consistency gate that hard-codes the OLD classification rule:

```
83     //   GHOST    iff source is not an overlay AND destination is browse
85     const expectGhost = c.from !== 'overlay' && c.to === 'browse';
88     if ((ec.outgoing === 'app-ghost') !== expectGhost) wrong.push(`${c.from}->${c.to} ghost`);
90     if (spec.paneOf(ec) !== (expectGhost || expectSnap)) wrong.push(`${c.from}->${c.to} pane`);
```

When the spec edit (§9) flips `home→overlay` (:55) and `browse→overlay` (:58) to
`outgoing:'app-ghost'`, this test iterates `STRUCTURAL_CASES` and evaluates, for each:
- `home→overlay`: `ec.outgoing==='app-ghost'` is TRUE; `expectGhost = (home≠overlay && overlay==='browse')`
  is FALSE → pushes `home->overlay ghost`; and `paneOf(ec)`=TRUE vs `(false||false)`=FALSE → pushes
  `home->overlay pane`.
- `browse→overlay`: same → pushes `browse->overlay ghost` and `browse->overlay pane`.

`wrong` = four entries → `assert.deepEqual(wrong, [])` **FAILS**. Confirmed: this is the only other
file in `test/`/`tools/` that encodes the "app-ghost iff dest===browse" rule
(`grep "=== 'browse'|!== 'overlay'"` returns exactly this line).

This is a StandardsDocument §6.6 scrub gap of the same class T1 addressed: the plan produces correct
current state (the flipped spec) while leaving the OLD rule visible and enforced elsewhere in HEAD.
It is a rule-encoding gate — updating it changes what the classification rule IS — so it is a
defining-record edit that belongs in §9's staged scrub with the exact new predicate spelled out (the
plan itself frames the spec edit as "a deliberate two-part edit a review can see"; this makes it
three-part), not left for the maker to improvise past a red gate.

**Required change (add to §2 Changes and §9 scrub list):** update `test/transition-matrix.test.js`
lines 83-85 to the new rule, in the same commit as the spec edit:
- line 85: `const expectGhost = c.from !== 'overlay' && c.to !== 'home';`
- line 83 doc-comment: `//   GHOST    iff source is not an overlay AND destination is NOT home`

(Verified correct against all eight structural cases: the new predicate matches the post-edit spec
for every row — home→browse/home→overlay/browse→browse/browse→overlay = ghost; browse→home and all
three overlay-source rows = not-ghost. The `paneOf` check at line 90 auto-follows once `expectGhost`
is corrected. Line 92's `renderDestination` check and line 89's snapshot check are unaffected.)

---

## Verified CLOSED against real code

### T2 — fingerprint mislabel corrected + NEW_POLICIES decision — CLOSED, and the NEW_POLICIES call is right

- §2 (171-180) and §9 (410-418) now correctly state BOTH generators regenerate from the spec, and
  that the model's mirrored-region FINGERPRINTS (`gen-swipe-model.mjs:44-61` — the
  begin/nav-relation/gesture-end/supersession hashes of UNTOUCHED `app.js`) must NOT change. Verified:
  `gen-swipe-model.mjs:186-196` reads `expectedConstruction.outgoing` + `paneOf`, so the rendered
  construction/pane rows change and `docs/swipe-model.generated.txt`'s byte-exact gate
  (`swipe-model.test.js:78`) requires regeneration; the fingerprints are independent of that data and
  correctly stay pinned.
- **The `§8A NEW_POLICIES` "no new entry" decision (§9, 419-431) is the correct call.** Verified: the
  model's `NEW_POLICIES` set (`gen-swipe-model.mjs`, asserted as exact data at `swipe-model.test.js:214`)
  holds exactly `phase-aware-recovery`, `supersession-restore-scroll`, `supersession-rerender-source`
  — all recovery/supersession BEHAVIOUR deviations from today's production. This slice is a
  construction-REPRESENTATION change (a faithful outgoing ghost replacing the transformed real view),
  guarded against silent reversion by the frozen `expectedConstruction` spec + the `swipe-transition`
  oracle (reverting `constructionPlanFor` reddens `swipe-transition.test.js`). Adding it to a
  behaviour-deviation ledger would be a category error, and the exact-set assertion at `:214` stays
  green. The plan correctly flags the residual: if device verification (T3 band exposure) reveals a
  REAL visible deviation, the classification becomes a policy decision at that point, not pre-blessed.
  No other `swipe-model.test.js` assertion breaks on the regen (fingerprints, navStack census,
  screen census, planned/rejected counts, dispose-reason set — all unaffected; and unlike
  `transition-matrix.test.js`, `swipe-model.test.js` encodes NO ghost-iff-dest-browse predicate).

### T3 — no-peek geometry — CLOSED, accurate, not overclaimed

§4 (283-294) now states honestly that the tiling covers the overlay's RECT horizontally, and splits
the two families correctly. Verified against `css/app.css`:
- `nowplaying`: `.nowplaying { position:fixed; inset:0; height:100%; z-index:60 }` (:414-418) —
  full-viewport, above the topbar; total coverage, no band exposed. ✓
- `options` (z25, :125-135) and the five settings subs (z26, :687-697): both `top: calc(var(--safe-top)
  + 51px)` — vertically inset below the fixed `.topbar`. ✓
- The topbar band exposure is real and correctly characterized: `.topbar { z-index:30; background:
  rgba(20,23,28,.86); backdrop-filter: blur(14px) }` (:147-152) — the ~86%-opaque blurred band through
  which the now-STATIONARY untransformed real view is partially visible. ✓
The structural-invariant-vs-device-no-peek split is stated honestly: §3 (213-217) softens the invariant
prose to "covers the overlay's own rect… the STRUCTURAL invariant holds regardless of coverage"; §3
Loki fracture #3 (239-245) is reframed to "a coverage break §4 does NOT disclose"; §9 device
obligation (b) (468-471) folds in the band exposure. No cell claims full no-peek. The plan does not
overclaim — the CI-gated promise is transform-elimination only, and that is what §8 tests.

### T4 — enumerated opacity precondition — CLOSED (fact verified true)

§4 (296-304) replaces the per-overlay escape hatch with an enumerated all-seven precondition that
BLOCKS if any fails: `options, nowplaying, general, playback, buffering, downloads, diagnostics`.
Verified the load-bearing fact against `css/app.css`: all seven paint `background: var(--page-bg)` over
their own rect — `#options` (:134), `.nowplaying` (:421), and the five subs `#downloads/#general/
#playback/#buffering/#diagnostics` (:695) — opaque page-colour fills. The precondition holds today; the
subsystem §23 reopen trigger (any overlay-background change / new overlay kind) is correctly stated.

### Completeness of the doc/gate scrub (the coordinator's question)

Enumerated every importer of `test/fixtures/swipe-plan-spec.mjs`
(`grep -rln swipe-plan-spec`): `gen-swipe-model.mjs`, `gen-transition-matrix.mjs`, `mutate.mjs`,
`descriptor-coverage-gate.test.js`, `swipe-stage6c.test.js`, `swipe-stage6d.test.js`,
`swipe-transition.test.js`, `transition-matrix.test.js`. Only two `*.generated.txt` docs exist
(both now scrubbed). Of the tests:
- `swipe-transition.test.js` — the oracle; production and spec move together (covered).
- `transition-matrix.test.js` — test 1 (byte-exact doc) covered; **test 2 (the `expectGhost`
  predicate) NOT covered → the blocking change above.**
- `swipe-stage6c.test.js` — uses only `overlay→browse` (options→books) and `browse→browse` fixtures
  (lines 85-90, 251); both UNCHANGED by this slice (overlay-source stays real-source; browse→browse
  stays app-ghost). Unaffected. ✓
- `swipe-stage6d.test.js` — asserts ONLY `finalizationPlanFor(...).abortRender` (FP.contract line 137,
  FP.oracle line 148 iterating `expectedFinalization.abortRender`); `abortRender` for in-flow→overlay
  is `'none'`, unchanged. Never asserts construction `outgoing`. Unaffected. ✓
- `descriptor-coverage-gate.test.js` — uses `SEC15_CASES`/`DESCRIPTOR_SCENARIOS`, all browse→browse
  (`BROWSE_PLAN`, app-ghost, unchanged); no `outgoing`/`paneOf` read. Unaffected. ✓
- `mutate.mjs` — a mutation registry the plan already edits (§9); no generated-doc/byte-exact gate.

So the scrub set is: 2 generated docs (both covered) + `transition-matrix.test.js`'s `expectGhost`
predicate (the one miss). Nothing else changes.

---

## Advisory (non-blocking)

- **A1 — CSS citation precision (T4).** §4 line 300-302 cites the overlay backgrounds as
  `#options (:126)`, `#nowplaying (:420)`, subs `(:694)`. Those point to the selector-block region;
  the exact `background: var(--page-bg)` declarations are at :134 / :421 / :695. The fact is correct
  and verifiable; tightening the line refs to the declaration lines would harden the citation against
  this subsystem's history of retracted line-cites (saga). Not blocking.

---

## Verdict

**TEMPER.** One blocking change: add to §2/§9 the scrub of `test/transition-matrix.test.js` lines
83-85 (the `expectGhost` predicate + its doc-comment) to the new rule
`c.from !== 'overlay' && c.to !== 'home'`, in the same commit as the spec edit — otherwise that
file's second test reddens when the spec flips. T2, T3, T4 are genuinely closed and verified against
real code; the NEW_POLICIES "no new entry" call is correct; the no-peek honesty split does not
overclaim. On this one change, re-issue for FORGE.

Verdict: **TEMPER**
