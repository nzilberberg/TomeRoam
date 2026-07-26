# AUDIT — Swipe Stage 5 `buildConstruction` four-key return (§3 revision)

Type: coverage-audit
Date: 2026-07-25
Gate: publish (the suite is green; this is the shipped-suite sweep beside Poirot's code review)
Audit target (immutable): commit **0049a13** — "Stage 5: narrow Swipe.buildConstruction to the ratified four-key return" (HEAD)
Ratified Coverage Model: `Claude/Plans/PLAN-swipe-stage5.md` §3 CONTRACT REVISION + §8 matrix
Red report: `Claude/Curie/RED-swipe-stage5.md` (the NEW red-first tests)
Build report: `Claude/Brunel/swipe-stage5-buildconstruction-green.md`
Code review: `Claude/Poirot/0049a13-swipe-stage5-buildconstruction.md` (PASS; routed watch item W22 here)

## Verdict

**ADEQUATE.** Every cell the ratified §3 revision requires of commit 0049a13 has a concrete, adequate
proof, and two of the load-bearing cells are proven by NEW red-first tests that were captured red against
the pre-revision five-key production and greened by this build. The no-dead-returned-field invariant is
proven by execution and is non-vacuous. The two watch-item cells routed from Poirot (W22: F5a payload
pass-through, F1a's "L3 forgets a key" half) are genuine bare cells in the **broader** Stage-5 Coverage
Model but are **out of scope for commit 0049a13** — it changes neither the L2 payload path nor the L3
mover-key mapping. They are routed to the test author as owed before the Stage-5 milestone-close publish
gate, not as a defect of this commit.

## Scope of this audit (why the map is small)

Commit 0049a13 is the **§3 CONTRACT REVISION only** — a return-shape narrowing, not the Stage-5 seam
relocation. The relocation (the two capture recipes, source resolution, the NP decoration builder, the
`env` injection) landed in a prior commit and was reviewed at 6bf0d20 / build .239. The production diff
here is exactly two edits:

- `js/swipe.js:321-327` — the return literal: drop `classification`, drop the `plan` wrapper, hoist
  `plan.decorations` to the top level projected to `{ kind, base }` (the `role` leaf stripped).
- `js/app.js:476` — the sole L3 consumer: `for (const deco of c.plan.decorations)` → `c.decorations`.

The map is therefore the six cells the §3 revision requires, not the full §8 matrix. Cells of §8 that
concern the relocation's L1/L2/L3 behavior (F1a wiring half, F5a, npLock, F4a/F4b, F6, F7a/F7b, freezeArt,
navGhost, willChange, parking) are the prior build's cells; they appear here only where 0049a13 touches
them, and in the W22 disposition and forward read.

## Phase 1–2 — The map (cells the §3 revision requires, fixed before the sweep)

| Cell | Claim to prove | Oracle kind demanded |
|---|---|---|
| C1 four-key contract | `buildConstruction` returns EXACTLY `{ capture, decorations, movers, sourceWasClobbered }` | exact-key contract (a missing OR extra key reddens) |
| C2 decorations projection | `decorations` is a top-level array, each element projected to `{ kind, base }`, the `role` leaf absent, `kind`/`base` values preserved | feature oracle (executes an NP transition, asserts the projected end-state) |
| C3 classification not returned | `classification` is absent from the return, yet still derived + consumed internally (host resolution, plan derivation) | exact-key absence + internal-consumption regression |
| C4 plan-wrapper drop | the `plan` wrapper is absent from the return | exact-key absence |
| C5 start() consumer | the sole L3 consumer reads the hoisted `c.decorations` (not `c.plan.decorations`), and reads the `{ kind, base }` leaves the projection supplies | consumer-match + dead-field mechanical gate |
| C6 no-dead-returned-field | no returned field of the seam lacks a consumer; the gate is unconditional (the tracked-open KR retired) | mechanical dead-field detector, non-vacuous |

Catalog dimensions accounted (absence is a decision):
- **Dim 7 Contract claims** — applicable; this whole change IS a contract-shape claim ("exactly four
  keys," "role stripped," "no dead field"). Swept by C1/C2/C3/C4/C6.
- **Dim 10 Functional achievement** — applicable narrowly; C2 is a genuine feature oracle (it runs the
  projection and asserts the resulting shape, not "the same thing twice"). Not a consistency-oracle-only
  cell.
- **Dims 1, 3, 4, 6, 9 (lifetime/reuse, concurrency, shape/platform, numerical, persistence-evolution)** —
  **not applicable.** The change is a synchronous, pure return-shape projection over per-gesture state; no
  pooled/warm object, no concurrency, no dtype/ISA matrix, no float edges, no persisted/versioned schema.
- **Dim 2 Trust boundaries** — not applicable to this commit (no new input path; descriptors are the same
  internal identity source Stage 4 validates).
- **Dim 5 Failure/rejection paths** — not applicable (no error/degraded path added).
- **Dim 8 Composition** — the one live composition (the outgoing-NP unlock reading the projected
  decorations while a browse-host render runs) is exercised by C5's consumer path; no new mode/flag pair.

## Phase 3 — The sweep

Commands run this pass (`NODE=C:/Users/nzilb/tools/node-dist/node.exe`):
- `$NODE --test test/swipe-construction.test.js test/construction-consumers.test.js` → 15 pass / 0 fail / 0 todo.
- `$NODE tools/dead-return-fields.mjs` → "Every registered seam: all returned fields have a consumer." exit 0.
- Non-vacuity probe of `deadReturnFields`: synthetic consumer omitting `decorations` → dead `["decorations"]`; real `start()` → `[]`.
- `$NODE --test "test/*.test.js"` → 683 tests, 681 pass, 0 fail, 2 todo (reconciles with the committed state Poirot ran).

| Cell | Status | Proving test(s) | NEW / guard | Why adequate |
|---|---|---|---|---|
| C1 four-key contract | **SWEPT** | `swipe-construction.test.js` "buildConstruction returns the exact four-key Construction contract shape" — `deepEqual(Object.keys(c).sort(), ['capture','decorations','movers','sourceWasClobbered'])` + `!('classification' in c)` + `!('plan' in c)` | **NEW red-first** (Curie RED: expected 4-key, actual 5-key `[capture,classification,movers,plan,sourceWasClobbered]`) | Sorted exact-key deepEqual reddens on a missing OR an extra/dead key (§4.11); it captured the exact pre-revision shape red and greened only when the return narrowed. |
| C2 decorations projection | **SWEPT** | `swipe-construction.test.js` "decorations is a top-level projected {kind, base} list with the role leaf stripped" — `Array.isArray`, length, `keys.sort()===['base','kind']`, `kind==='now-playing-pill'`, `base==='outgoing'`, `!('role' in …)` | **NEW red-first** (Curie RED: `c.decorations` undefined on old shape → `Array.isArray` false) | A true feature oracle: executes an NP-source transition and asserts the projected end-state and the `role` absence, not a same-thing-twice check. |
| C3 classification not returned | **SWEPT** | C1's `!('classification' in c)`; `construction-consumers.test.js` HARD GATE (`seamDeadFields===[]`, unconditional); internal consumption held by every recipe/wiring test that depends on `sourceHost`/`destinationHost` (F6, F4a, overlay↔overlay); `classifyTransition`'s own 5-key output still pinned by `swipe-transition.test.js` | NEW (absence assertion) + standing guards | Absence is directly asserted AND mechanically enforced; internal derivation is behaviorally load-bearing, so its removal reddens the source-resolution and render-mode tests. |
| C4 plan-wrapper drop | **SWEPT** | C1's `!('plan' in c)`; dead-field detector (a stray `plan` member with no consumer would show dead) | **NEW red-first** (old shape carried `plan`) | Exact-key deepEqual + dead-field detector both reject a lingering wrapper. |
| C5 start() consumer | **SWEPT (consumer-match)** | `construction-consumers.test.js` HARD GATE — non-vacuous (probe: omit `decorations` → dead `["decorations"]`); reinforced by the whole wiring suite crashing if unmigrated (iterating `c.plan.decorations` with `c.plan` undefined throws in every `start()`); the projected `{kind,base}` C2 pins is exactly what the consumer reads (`deco.kind`/`deco.base`, app.js:477) | standing guard made unconditional this commit | The migration `c.plan.decorations`→`c.decorations` and the shape-match to the projection are both mechanically guarded. The *runtime np-locked-unlock effect* is a separate bare cell (see Note N1) — pre-existing and unchanged in logic by this commit. |
| C6 no-dead-returned-field | **SWEPT** | `construction-consumers.test.js` HARD GATE (`seamDeadFields('buildConstruction')===[]` for every registered seam) + DRIFT GUARD (seam stays registered) + `tools/dead-return-fields.mjs` CLI exit 0 | guard that **went red for this exact class** (`classification` shipped dead in .239) and is now unconditional after KR retirement | Proven by execution and non-vacuous (probe). The KR `KR-swipe-construction-dead-classification` is genuinely resolved and correctly retired; coverage is subsumed by the now-unconditional HARD GATE + DRIFT GUARD (the removed `{todo}` asserted a strict subset). |

Matrix summary: 6 cells in scope — 6 swept, 0 bare. Catalog: dims 7 and 10 applicable and swept; dims
1–6, 8, 9 not applicable with reasons stated.

## W22 disposition (examined, not pre-decided)

Poirot routed two coverage gaps here. Both are genuine bare cells — and both are **out of scope for commit
0049a13**.

- **F5a — "Payload descriptor reaches L2 render intact" (plan §8, layer wiring).** Genuinely bare: the
  Stage-5 wiring file (`test/swipe-stage5-wiring.test.js`) covers F1b/F5b/F5c/F2-r/F7b and its own header
  names only those; no test asserts that `start()`'s `env.renderDestination` forwards the full `dest`
  payload (not just `v`) to `showAppView` (`js/app.js:439`). **Out of scope for 0049a13:** this commit does
  not touch `env.renderDestination` or the L2 payload path. It is a cell of the prior relocation build.
  Route to **Curie**.
- **F1a "L3 forgets a key" half — production movers keyed `{el, base, own}` after L3 maps (plan §8, layer
  wiring).** The *builder* half of F1a is fully swept at the recipe layer (`swipe-construction.test.js`
  "movers carry the external {element,ownership,slot} shape…" asserts `!('el'|'base'|'own' in m)`). The
  *L3* half — that `start()`'s `toMover` (app.js:457) emits all three production keys — is only partially
  reached: F1b wiring pins the `base` *value* (0 / signed ±d.w) but no test asserts key-completeness after
  the map (a `toMover` that drops `own` is unpinned). **Out of scope for 0049a13:** `toMover` and the mover
  mapping are unchanged by this commit. Route to **Curie**.

## Phase 5 — Findings table

| # | Severity | Finding |
|---|---|---|
| N1 | Note | The runtime **outgoing-NP `np-locked` unlock** (app.js:476-478, the `c.decorations` consumer's *effect*) has no behavioral wiring test. `swipe-invariants.test.js`'s "NP-source back-swipe builds the pill" asserts `.np-pill-float` count === 1, which is an **L1** effect (`npPillClone` inside `buildConstruction`); it does NOT redden if `start()`'s `c.decorations` loop is removed — that removal is instead caught by the dead-field HARD GATE. No test asserts `document.body` loses `np-locked` on an NP-source swipe. **Pre-existing** (the effect's logic is unchanged by 0049a13; only the object path moved) and modeled as the plan §8 `npLock` cell. Route to Curie with F5a. |
| N2 | Note | `swipe-invariants.test.js:97-105` comment is **stale**: it claims the test proves `start()` consumes `plan.decorations`, true under the Stage-4 architecture. Post-relocation the pill is built in L1, so the test now proves an L1 effect. Not a coverage hole (C5 consumer-match is guarded elsewhere) — a comment accuracy scrub (StandardsDocument §7). Flag to the dispatcher; not blocking. |

No Structural finding (no in-scope dimension is unswept). No Gap finding among the six scoped cells. No
Misleading finding (each NEW test's assertion matches its name; C2 asserts the `role` strip its name
claims).

## Phase 6 — The forward read

If the W22 cells stay bare, the next externally-found Stage-5 bug lives on the **L2 render dispatch / L3
map** axis, not on the return contract this commit hardened. Concretely: a `showAppView` call that passes
only `dest.v` and drops the payload (F5a) ships green and surfaces on device as an author/book screen that
renders empty after a swipe; or a `toMover` that drops `own` (F1a L3 half) ships green and surfaces as a
teardown that frees the wrong pane type. Both are wiring-seam blind spots the recipe layer structurally
cannot see and the current wiring file does not reach. The return-shape class (dead field, wrong
projection, lingering wrapper) is now closed: C1/C2/C6 span it, C6 unconditionally. The one behavioral hole
adjacent to *this* commit is N1 (the outgoing-NP unlock effect) — low blast radius (a cosmetic nav-button
state during a drag), but it is the effect this commit's consumer edit exists to preserve, so it belongs in
the same Curie batch.

```json
{"persona":"mendeleev","stage":5,"input_artifact":"0049a13","verdict":"ADEQUATE","bare_cells":["F5a payload-descriptor pass-through to L2 render (wiring; out-of-scope for 0049a13, broader Stage-5)","F1a L3-map key-completeness {el,base,own} after toMover (wiring; out-of-scope for 0049a13)","npLock outgoing-NP np-locked unlock effect (wiring; pre-existing, plan §8 npLock)"],"return_to":"curie"}
```
