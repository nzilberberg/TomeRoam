# RED — Swipe Stage 5 construction-contract reconciliation (§3 revision)

Type: red-report
Date: 2026-07-25
Input artifact: `Claude/Plans/PLAN-swipe-stage5.md` (§3 CONTRACT REVISION, ratified 2026-07-24)
Test under change: `test/swipe-construction.test.js`
Production under test: `js/swipe.js` — `Swipe.buildConstruction` (unchanged; still the old shape)

## What the plan ratified (§3)

`buildConstruction` must return a Construction of exactly FOUR live keys:

```
{ decorations, movers, capture, sourceWasClobbered }
```

- `classification` is derived and consumed INTERNALLY (host resolution, plan derivation) and is
  NOT a return member (F1).
- The `plan` WRAPPER is dropped. Of its fields only `decorations` has an L3 consumer (the
  outgoing-NP `np-locked` unlock reads `c.decorations`), so `decorations` is HOISTED to the top
  level; `plan.outgoing`/`incoming`/`renderDestination` are consumed only inside
  `buildConstruction` and would be dead returned members (F1 nested dead-field; EC §17).
- The hoisted `decorations` is PROJECTED to `{ kind, base }` — the classification's `role` leaf is
  stripped, since no L3 consumer reads it (F2; app.js reads only `deco.kind`/`deco.base`).

Confirmed against plan §3 (return type at lines 144-159; the eight contract-question answers at
189-252) and against current `js/swipe.js:321`, which STILL returns the pre-revision five-key shape
`{ classification, plan, movers, capture, sourceWasClobbered }`.

## Coverage cell

Plan §8 matrix, the F1/F2 contract cells realized at the recipe (fake-env) layer:

| Cell | Behavior proved | Oracle |
|---|---|---|
| F1 (contract) | Construction carries EXACTLY `{capture, decorations, movers, sourceWasClobbered}`; `classification` and the `plan` wrapper are NOT members | FEAT — executes `buildConstruction`, asserts the exact sorted key set + absence of `classification`/`plan` |
| F1/F2 (decorations) | `decorations` is a top-level array; an NP endpoint projects to `{kind, base}` with the `role` leaf stripped | FEAT — executes an NP-source transition, asserts the projected shape and `!('role' in …)` |

Exact-key assertion (a missing OR an extra/dead field both redden), per the §4.11 exact-key
discipline the file already follows.

## Reconciliation applied to `test/swipe-construction.test.js`

- `CONSTRUCTION_KEYS` changed from the five-key `['capture','classification','movers','plan','sourceWasClobbered']`
  to the ratified four-key `['capture','decorations','movers','sourceWasClobbered']`.
- Deleted the now-invalid `CLASSIFICATION_KEYS` and `PLAN_KEYS` constants (those objects are no
  longer return members); added `DECORATION_PROJECTION_KEYS = ['base','kind']`.
- Test "buildConstruction returns the exact four-key Construction contract shape": asserts the
  four-key set, and adds `!('classification' in c)` / `!('plan' in c)` so a lingering wrapper
  reddens.
- New test "decorations is a top-level projected {kind, base} list with the role leaf stripped":
  proves the hoist (top-level array) and the F2 projection (role stripped) on an NP-source
  transition.

No other test in the file was changed. `js/swipe.js` was NOT touched (Brunel's to green).

## The exact command run

```
cd C:/Users/nzilb/OneDrive/Desktop/TomeRoam
C:/Users/nzilb/tools/node-dist/node.exe --test test/swipe-construction.test.js
```

Baseline before the edit: `# pass 12  # fail 0` (test and old production agreed on the five-key shape).

## The captured RED (against current, unchanged production)

```
# tests 13
# pass 11
# fail 2

not ok 1 - buildConstruction returns the exact four-key Construction contract shape
  error: 'Construction must carry EXACTLY its four fields {capture, decorations, movers, sourceWasClobbered} (plan §3, F1) — `classification` is derived+consumed internally and the `plan` wrapper is dropped'
  code: 'ERR_ASSERTION'
  expected: [ 'capture', 'decorations', 'movers', 'sourceWasClobbered' ]
  actual:   [ 'capture', 'classification', 'movers', 'plan', 'sourceWasClobbered' ]
  operator: 'deepEqual'

not ok 2 - decorations is a top-level projected {kind, base} list with the role leaf stripped
  error: 'decorations is a top-level array on every construction (hoisted off the dropped plan wrapper — plan §3, F1)'
  code: 'ERR_ASSERTION'
  expected: true
  actual:   false   # Array.isArray(c.decorations) — c.decorations is undefined on the old shape
  operator: '=='
```

## Judgment — fails for the intended missing-behavior reason

Both failures are the ratified contract not yet built, not infrastructure:

- Test 1's `actual` is verbatim the pre-revision five-key shape production still returns
  (`classification` and `plan` present, `decorations` absent). It reddens because the return has not
  yet dropped `classification`/`plan` nor hoisted `decorations` — exactly the §3 change Brunel owns.
- Test 2 reddens because `c.decorations` is `undefined` on the old shape (decorations still lives on
  the `plan` wrapper, `js/swipe.js:321`), so `Array.isArray` is false — again the missing hoist.

Neither is a harness/import/syntax error: the module loaded, the fake-env JSDOM harness ran, and the
other 11 tests in the file PASSED — capture, movers, and `sourceWasClobbered` survive the revision
unchanged, so their guards stay green and only the two revised contract tests turn red.

## Adjacent green guards that must stay green

- The other 11 tests in `test/swipe-construction.test.js` (mover external shape, `capture===null`,
  `ghostY` parity, no-ambient-DOM, `copyAnimPhase`, `sourceWasClobbered`, F7a ordering, ghost bg,
  `.nav-ghost` contract, npPill recipe, freezeArt) — GREEN now, and stay green after Brunel greens
  the contract (those keys are unchanged by §3).
- `test/swipe-transition.test.js` (12/12 GREEN, untouched) — its `CLASSIFICATION_KEYS`
  (`['decorations','destinationHost','fromKind','sourceHost','toKind']`) and `CONSTRUCTION_KEYS`
  pin `classifyTransition`/`constructionPlanFor` DIRECTLY. Those internal functions do NOT change
  this stage — `classifyTransition` still returns those five keys and its decorations still carry
  `role`. This file must remain green; the F2 `role` strip is a projection at the `buildConstruction`
  seam, not a change to `classifyTransition`'s own output.

```json
{"persona":"curie","stage":5,"input_artifact":"Claude/Plans/PLAN-swipe-stage5.md","verdict":"RED_SUITE_READY","files_changed":["test/swipe-construction.test.js","Claude/Curie/RED-swipe-stage5.md"],"red_command":"C:/Users/nzilb/tools/node-dist/node.exe --test test/swipe-construction.test.js","return_to":"brunel"}
```

---

## Retirement note — 2026-07-25 (post-GREEN)

Brunel's build is BUILD_GREEN: `buildConstruction` now returns the four-key shape, `classification`
is no longer returned, and the general dead-return detector (`tools/dead-return-fields.mjs`) passes
at exit 0. The reconciled contract test (`test/swipe-construction.test.js`) is 13/13 green. The
now-resolved F1 known-red guard was retired — TEST-SIDE portion only (Zelda owned the
`PolicyLedger.mjs` / `DecisionLog.md` / `Board.md` records, and had already removed the
`KR-swipe-construction-dead-classification` ledger entry before this pass).

### What was removed (edit confined to `test/construction-consumers.test.js`)

1. The `{ todo: 'F1 …' }` known-red test `'every Swipe.buildConstruction returned field is consumed
   by start()'` and its preceding comment block.
2. The `TRACKED_OPEN = { buildConstruction: ['classification'] }` allowlist (its only entry was
   the resolved F1 field, so it was empty of live content) and its sole remaining consumer — the
   `dead.filter((k) => !(TRACKED_OPEN[seam] || []).includes(k))` subtraction in the HARD GATE, now
   `assert.deepEqual(dead, [], …)`. Nothing else referenced `TRACKED_OPEN`, so it was removed whole
   rather than emptied to `{}` (no other seam is tracked-open; keeping an empty allowlist would be
   dead scaffolding under StandardsDocument §6.6).
3. Accuracy scrub (§7 within-document): the header's present-tense claim that
   `Construction.classification` "is returned" was corrected to past tense — it was the .239
   motivating defect, since resolved by the §3 revision.

### Coverage subsumption — removing the F1 known-red loses no coverage

"No dead returned field on `buildConstruction`" remains fully covered by two standing gates plus the
general detector, all driving the same `seamDeadFields` engine:

- **DRIFT GUARD** (`construction-consumers.test.js`, test 1) forces `buildConstruction` — an
  object-returning NON_CONTRACT export, not exact-key-gated — to remain registered in
  `SEAM_REGISTRY` (`tools/dead-return-fields.mjs:108`). It cannot silently escape the registry.
- **HARD GATE** (`construction-consumers.test.js`, test 2) iterates every `SEAM_REGISTRY` seam and
  asserts `seamDeadFields(seam) === []`. With the allowlist removed, it now asserts zero dead fields
  for `buildConstruction` UNCONDITIONALLY — which is exactly what the deleted known-red asserted
  (`seamDeadFields('buildConstruction', ROOT)` deepEqual `[]`). The known-red was only the
  ledger-tracked, `{todo}`-allowlisted instance of that same assertion; with F1 resolved it is the
  HARD GATE's ordinary, always-enforced case.
- **General detector CLI** (`node tools/dead-return-fields.mjs`) — the same engine — passes at exit 0.

So the deleted test asserted a strict subset of what the HARD GATE now asserts unconditionally; its
removal drops no coverage. (The §4.19 ledger↔suite gate also confirms this direction: a declared
known-red whose `{todo}` test no longer exists would redden as `stale`, and an untracked `{todo}`
would redden as `undeclared` — both are green after the coordinated ledger+test removal.)

### Full-suite counts (`node --test "test/*.test.js"`)

- Before this pass: `# tests 684  # pass 680  # fail 1  # todo 3` — the one failure was §4.19
  (`policy-ledger-gate.test.js`), `undeclared` branch: the F1 `{todo}` test still in the suite
  source after Zelda had already removed its ledger entry (a correctly-sequenced, mid-retirement
  state).
- After: `# tests 683  # pass 681  # fail 0  # todo 2`. Fail 1→0 (§4.19 cleared by removing the
  orphaned `{todo}`); todo 3→2 (dropped by exactly the retired F1 guard); the two remaining todos
  are the unrelated `KR-swipe-scroll-restore` and `KR-swipe-source-rerender` known-reds. Test count
  683 = one removed test.
