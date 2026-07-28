# POIROT — Stage 6g code review (commit `5cc0f14`)

Type: code-review
Prior-review: POIROT-swipe-stage6f-54a4d27.md
Target: `5cc0f14` (immutable). Reviewed against production HEAD; tree confirmed clean at the target SHA.
Range (git diff `5cc0f14~1..5cc0f14`): `css/app.css`, `js/app.js`, `docs/swipe-model.generated.txt`,
`tools/mutate.mjs`, `tools/mutation-sweep.mjs`, `test/home-layer-invariant.test.js`,
`test/swipe-stage6g.test.js`, `Claude/Curie/RED-swipe-stage6g.md`, `Claude/Brunel/swipe-stage6g-build.md`.

`Verdict: **FINDINGS**` (do-not-ship — one Critical: the commit's own CI mutation-sweep goes red on the next push).

---

## The scene, in one breath

The production change is exactly what the plan promised and it is correct: one stylesheet declaration turns
`#home` into a permanent compositing layer (`#home { transform: translateZ(0) }`), so removing `.parked` at a
reveal can no longer demote the layer — the device-confirmed home→books abort flash. The CSS cascade holds, the
containing-block hazard that killed the `.195/.196` `#browse` probe does not reach `#home`, `js/app.js` is
comment-only so the Loki HELD_STONE precondition stands, and both new cells redden on their registered mutants.

The defect is not in the fix. It is in the fix's *mechanization*. The commit registers the first source-text-only
mutation the repository has ever carried (#79, on `css/app.css`) and wires its only catcher — the source-text gate
`home-layer-invariant.test.js` — into `SOURCE_TEXT_GATES`, the sweep's *exclusion* list. That exclusion correctly
prevents a false-CAUGHT, but nothing runs the excluded gate against the mutation, and no behavioural test sees a
CSS change (jsdom has no layout). So the CI mutation-sweep applies #79, finds nothing failing, and reports the
guard **UNCAUGHT** — exit 1. The verification half of the source gate was left half-built.

## The history (the night before)

The plan (§9 grounding note) explicitly flagged the risk: *"confirm `tools/mutate.mjs` can target `css/app.css`;
extend it if the registry is JS-only… part of mechanizing the source gate, flagged honestly, not assumed."* The
maker extended `mutate.mjs` (the `file` field is consumed — verified) and confirmed the standalone gate reddens
under #79. What was never executed is the **full sweep** over #79. Brunel's Gate B (build log §5) ran the mutant
against the standalone gate only; the slow sweep is the CI half and was not run (build log §7 runs `run-checks.mjs`,
which excludes the sweep). The gap is precisely the executed-probe the plan asked for and nobody ran.

## Coverage Ledger

Marks: `✓` = cleared by a command executed THIS pass (commands in "Executed evidence" below); `~` = cleared by
reading/reasoning; `n/a`; or a **finding**.

| Row (changed region) | Cascade/correctness | Containing-block & stacking | app.js-logic-untouched | Mutation-catch (behavioural) | Mutation-catch (sweep, CI) | Test non-vacuity / falsifiability | SOURCE_TEXT_GATES wiring | Dead-field / consumer | Doc-regen determinism | Records / comment honesty | Full-suite & meta-gates |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `css/app.css` `#home { translateZ(0) }` + comment | ✓ | ~ | n/a | ✓ | **Crit (via #79)** | ✓ | n/a | n/a | n/a | Obs (navbar comment) | ✓ |
| `css/app.css` `#home.parked` (cascade scope, unchanged) | ✓ | ~ | n/a | ✓ | ✓ | ✓ | n/a | n/a | n/a | ~ | ✓ |
| `js/app.js` 549-562 comment | n/a | n/a | ✓ | n/a | n/a | n/a | n/a | n/a | n/a | ~ | ✓ |
| `docs/swipe-model.generated.txt` | n/a | n/a | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ | ~ | ✓ |
| `tools/mutate.mjs` #79 PROMO | n/a | n/a | n/a | n/a | **Crit** | ✓ | ✓ | n/a | n/a | ~ | ✓ |
| `tools/mutate.mjs` #80 REVEAL | n/a | n/a | n/a | ✓ | ✓ | ✓ | n/a | ✓ | n/a | ~ | ✓ |
| `tools/mutation-sweep.mjs` SOURCE_TEXT_GATES+= | n/a | n/a | n/a | n/a | **Crit** | n/a | ✓ | n/a | n/a | ~ | ✓ |
| `test/home-layer-invariant.test.js` (PROMO) | ✓ | n/a | n/a | ✓ | **Crit** | ✓ | ✓ | n/a | n/a | ~ | ✓ |
| `test/swipe-stage6g.test.js` (REVEAL) | n/a | n/a | n/a | ✓ | ✓ | ✓ (Obs) | n/a | n/a | n/a | ~ | ✓ |

No empty cells. The `~` cells are all reads (HTML structure for containing-block; comment/records honesty; the
static-cascade correctness of the unchanged `#home.parked` half) — none is a behavioural or enumerable claim left
unrun.

## Executed evidence (backs every `✓`)

- `node --test test/home-layer-invariant.test.js test/swipe-stage6g.test.js` → **5/5 pass** at HEAD.
- `node --test "test/*.test.js"` → **736 tests, 735 pass, 0 fail, 1 skip.**
- `node tools/mutate.mjs 79` then `node --test test/home-layer-invariant.test.js` → PROMO.base + PROMO.cascade
  **RED** (2 fail), parse-sanity + parked green. Restored; tree clean.
- `node tools/mutate.mjs 80` then `node --test test/swipe-stage6g.test.js` → REVEAL **RED**. Restored; tree clean.
- `node tools/mutation-sweep.mjs 79` → **`#79 UNCAUGHT`, sweep exit 1.** (The finding.)
- `node tools/mutation-sweep.mjs 80` → **`#80 caught (3 failing)`, exit 0.**
- `node -e "…MUTATIONS[79]…"` → #79 `file: css/app.css`, `benignAlone: undefined`; 81 mutations total; `79 % 8 = 7`
  → #79 lands in **shard 7/8**, the shard `.github/workflows/ci.yml` runs on every push.
- `node tools/gen-swipe-model.mjs` → regenerated `docs/swipe-model.generated.txt` **byte-matches** the committed
  file (deterministic; line-shift only). `node --test test/swipe-model.test.js` → 11/11 (fingerprints unchanged).
- `node --test test/mutation-anchors.test.js` → 2/2 (both new anchors match source).
- `node --test test/{transition-matrix,policy-ledger-gate,contract-function-gate,construction-consumers}.test.js`
  → all pass (no untracked known-red; no dead-return drift).
- Comment-only proof: stripped comments/blank lines from `git show 5cc0f14~1:js/app.js` vs `5cc0f14:js/app.js` →
  **executable lines byte-identical.** Loki's HELD_STONE precondition (app.js reveal logic unchanged) holds.
- Containing-block read: `index.html` — `#home` (inside `.app`) contains only carousels/status divs, **no
  `position:fixed` descendant**; `#player`/`#nowplaying`/`#navbar` are siblings of `.app`; `.alphaindex` renders
  inside `#browse`; `body::before` (the fixed backdrop) is on `body`. `#home` becoming a containing block/stacking
  context captures nothing.

## Phase 5 — findings

| # | Severity | Location | Finding |
|---|---|---|---|
| F1 | **Critical** | `tools/mutation-sweep.mjs` + `tools/mutate.mjs` #79 | The CI mutation-sweep reports mutation #79 (source-text, `css/app.css`) as **UNCAUGHT** and exits 1. Its only catcher, `home-layer-invariant.test.js`, is in `SOURCE_TEXT_GATES` and thus excluded from `behaviourTests()`; no behavioural test detects a CSS change (jsdom has no layout); #79 has no `benignAlone` flag. #79 is in **shard 7/8**, which `ci.yml` runs on every push → **CI red on the next push.** The product CSS is correct; the break is in the mutation-verification harness this commit introduced. This is the first source-text-*only* mutation in the repo — all prior `SOURCE_TEXT_GATES` entries guard `js/app.js` fingerprint regions whose mutants are also caught behaviourally, so their exclusion never orphaned a mutation. Required change (Brunel): give the sweep a positive path to verify a source-text mutation against its source-text gate — e.g. a per-mutation `caughtBy: 'home-layer-invariant.test.js'` (or a `sourceText: true` marker) that the sweep runs the named excluded gate for, counting its failure as the catch — so #79 is CAUGHT rather than UNCAUGHT. Do **not** paper over it with `benignAlone` (semantically false: the mutation is not benign, it is caught by a gate the sweep declines to run). |
| F2 | Observation | `css/app.css:115`, `js/app.js:553-555` | The production comment states `#home` promotion is "Device-confirmed navbar-safe." The device A/B (`.256`) that confirmed navbar-safety used the **`will-change: transform`** probe, not the shipped `translateZ(0)`. Plan §9(b) still lists "the fixed navbar does NOT pop with the permanent `translateZ(0)` promotion" as an *owed* device-verification. The comment reads slightly stronger than the evidence for the shipped form (per §4 the two forms are argued equivalent by the Will-Change spec, but that equivalence is a spec argument, and the navbar-pop is an empirical iOS quirk on a fixed element outside `.app`). Non-blocking; the device pass is honestly owed elsewhere. |
| F3 | Observation | `test/swipe-stage6g.test.js:658` + `tools/mutate.mjs` #80 | Mutation #80 (setView always-park) reddens the REVEAL test at the **fixture-sanity** un-park assertion (line 636), not at the cell assertion (line 658), because the setup commit-to-home and the abort reveal un-park through the same `setView('home')` — Curie documented this and proved `app.js:482` reads UNCAUGHT. The cell assertion's independent falsifiability therefore rests on the structural `parkedDuringDrag` guard (line 652), not on a dedicated mutant. This is the documented design and the cell is non-vacuous; noted only so the reliance is on the record. |

## Phase 6 — the prediction

Left unfixed, F1 is not a "might": the next push runs `ci.yml`'s `mutation-sweep` matrix, shard 7 sweeps #79,
finds no behavioural failure, prints `UNCAUGHT`, and the job exits 1 — red CI, blocked deploy — while every other
check is green, so the failure will read as mysterious to anyone who did not register that a CSS-only mutant has
no behavioural catcher. And the shape will recur: the moment a second source-text gate arrives (the plan already
contemplates more CSS invariants), it inherits the same orphaning. The honest fix is structural — teach the sweep
to run a source-text mutation's own gate — not a per-mutation escape hatch. The `benignAlone` route is a trap: it
would silence the sweep by *asserting the mutant is survivable*, which is exactly the false-reassurance the sweep
exists to prevent, one level up.

## Watch-list

- **[W1] open** — 6b records reconciliation un-applied in HEAD. Owner Zelda. Not a code matter. Carried.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition, un-executed. Owner on-device strike. Carried.
- **[W4] open** — 6c apply-on-approval records, incl. the `js/app.js` *classifier* comment stale text (independent of 6g, whose app.js touch is the mover-parking comment at 552-558). Owner Zelda. Carried.
- **[W5] open** — Loki r2 lesser-planes: `recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` → Brunel. Untouched by 6g. Carried.
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat. Carried.
- **[W7] open** — 6d apply-on-approval records un-applied in HEAD. Owner Zelda. Carried.
- **[W8] open** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda. Carried.
- **[W9] open** — Loki 6e residual 2: the unguarded `.nav-ghost === owned-pane(live session)` invariant. Untouched by 6g. Owner future F/coverage amendment + Mendeleev. Carried.
- **[W10] open** — `disposeOwnedPanes`/`dropPanes` byte-identical removers; collapse on F-pane unification. Owner F-unification slice. Carried.
- **[W11] open** — 6e apply-on-approval records un-applied in HEAD. Owner Zelda. Carried.
- **[W12] open** — 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Owner Mendeleev. Carried.
- **[W13] open** — 6f apply-on-approval records (plan §9). Owner Zelda. Carried.
- **[W14] open** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device strike. Carried.
- **[W15] open (new, 6g)** — **F1**: source-text-only mutation #79 reads UNCAUGHT in the CI sweep (shard 7/8 exit 1); the sweep has no path to verify a source-text mutation against its source-text gate. Owner **Brunel** (fix before push). Blocks 6g.
- **[W16] open (new, 6g)** — 6g apply-on-approval records (plan §9, un-applied in HEAD, confirmed by build log §3): DecisionLog NEW-POLICY entry, `Subsystems/swipe-reveal.md` note, `PLAN-swipe-reveal.md` §7 step 6 annotation, `Claude/Campaigns/swipe-stage6g.json`, build-number bump. Owner Zelda. Not a code matter.
- **[W17] open (new, 6g)** — **F2**: `css/app.css:115` / `js/app.js:553-555` "device-confirmed navbar-safe" comment predates device-verification of the shipped `translateZ(0)` form (plan §9(b)). Owner on-device strike; comment precision optional. Carried.

---

Verdict: **FINDINGS**

{"persona":"poirot","stage":"6g","verdict":"FINDINGS","target":"5cc0f14","artifact":"Claude/Poirot/POIROT-swipe-stage6g-5cc0f14.md","app_js_logic_untouched":true,"findings":[{"sev":"critical","loc":"tools/mutation-sweep.mjs + tools/mutate.mjs #79","issue":"CI mutation-sweep reports source-text mutation #79 (css/app.css) UNCAUGHT and exits 1 (shard 7/8, runs every push) — its only catcher home-layer-invariant.test.js is in SOURCE_TEXT_GATES and excluded from the behavioural run, no behavioural test sees a CSS change, and #79 has no benignAlone flag; the sweep has no path to verify a source-text mutation against its source-text gate"},{"sev":"observation","loc":"css/app.css:115, js/app.js:553-555","issue":"'device-confirmed navbar-safe' comment: device A/B used the will-change probe, not the shipped translateZ(0); navbar-safety of the shipped form is still an owed device-verify (plan §9b)"},{"sev":"observation","loc":"test/swipe-stage6g.test.js:658 + mutate.mjs #80","issue":"REVEAL mutation #80 reddens the shared setup un-park assertion, not the cell assertion; the cell's falsifiability rests on the structural parkedDuringDrag guard, not a dedicated mutant (documented design)"}],"return_to":"brunel"}
