# Plan review (round 5) — PLAN-swipe-stage5.md (REOPENED: dead nested return members; blocking parity mutation)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->
<!-- scope note: the relocation (boundary_relocation) and the callee split (callee_replacement) were RATIFIED at the r3 forge against the pre-build source ranges; they are not reopened here. This round re-ratifies only the buildConstruction RETURN contract (contract_shape). Declaring the pre-build source_ranges now would be stale — the code is built (commit 6bf0d20), so those line numbers point at different code. -->
<!-- charpy-gate-supersede: this declaration replaces the initial r5 declaration (boundary_relocation/callee_replacement true with pre-build ranges); corrected 2026-07-24 after the stale ranges were caught. -->
<!-- note: round 5 REOPENS the r4 forge. r4 verified only TOP-LEVEL return keys and missed the dead NESTED members; this round applies the finest-granularity rule and re-grades the parity-mutation drift to blocking. -->

Reviewed: 2026-07-24 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (committed 1b4cf72). Grounded against
the built seam (`js/swipe.js` `buildConstruction`) and its consumer (`js/app.js` `start()`), read directly.
**This verdict supersedes the round-4 forge** (`…-2026-07-24.md`), which cleared a return that still
carries dead nested data.

## Applicability

- **defining_records: true** — the built seam, the Poirot F1 casebook, and the PolicyLedger KR are the
  material records; reconciled below.
- **boundary_relocation: false** — the relocation was ratified at the r3 forge (against the pre-build
  source ranges) and is not reopened here. The code is now built (commit 6bf0d20), so those pre-build line
  numbers are stale — declaring them would point the adapter's session-field check at different code.
- **callee_replacement: false** — the `showAppView`/overlay-branch split into L1/L2/L3 was likewise
  ratified at forge; not reopened this round.
- **contract_shape: true** — the sole artifact re-ratified this round is the `buildConstruction` **return**
  shape (dropping the dead `classification` plus the three dead nested `plan.*` members). The value-crossing
  analysis below is carried forward as supporting evidence, not a fresh relocation review.

## Verdict

**TEMPER** — two blocking defects before re-ratification. The four-key return (`{ plan, movers, capture,
sourceWasClobbered }`) is not clean: `plan` is a four-member object of which the receiver reads only
`plan.decorations`, so three nested members are dead on the return — the same class as the dropped
`classification`, one level down (F1). Separately, the machine-readable coverage block asserts a mutation
that provably cannot exist, a false record that must be corrected before re-ratification (F2). Scope B and
the relocation are unaffected.

## Defining records

Verdict: **CONFLICT** between the ratified four-key return and the no-dead-fields rule (Engineering
Contract §17), resolved by narrowing.
- **`js/swipe.js` `buildConstruction`** (built) — returns `{ classification, plan, movers, capture,
  sourceWasClobbered }` today; the plan drops `classification`, leaving `{ plan, movers, capture,
  sourceWasClobbered }`. Authority: the ratified contract under re-ratification.
- **`js/app.js` `start()`** (built, L3) — reads `c.movers.*`, `c.capture.*`, `c.sourceWasClobbered`, and
  `c.plan.decorations` (app.js:458–474); reads **no** other `c.plan.*` member and no `c.classification`.
  This is the consumer of record; it decides what is dead.
- **`Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md`** (F1) — caught the whole dead
  `classification`. Its detector (`tools/dead-return-fields.mjs`) checks only top-level keys, so the nested
  siblings escaped it — which this review flags (F1).
- **`Claude/Decisions/PolicyLedger.mjs`** `KR-swipe-construction-dead-classification` — currently tracks
  the `classification` field only; the three nested `plan.*` members are the same class and should join it
  (or all four resolve together) when the makers narrow the return.

## Value-crossing ledger — every returned member at the finest granularity the receiver can omit

The rule struck here: **every value crossing the seam must have a downstream production consumer at the
finest contract granularity the receiver can independently omit.** Each returned member re-checked against
`start()` (the built consumer):

| Returned member (leaf) | Consumer read (app.js) | Live? |
|---|---|---|
| `classification` | none | DEAD (top-level; already being dropped — F1 prior) |
| `plan.outgoing` | none (read only inside `buildConstruction`, swipe.js:291) | **DEAD (nested — F1)** |
| `plan.incoming` | none (swipe.js:301) | **DEAD (nested — F1)** |
| `plan.renderDestination` | none (swipe.js:305) | **DEAD (nested — F1)** |
| `plan.decorations` | `for (const deco of c.plan.decorations)` (474) | live |
| `movers.outgoing` / `.incoming` / `.decoration` | `toMover(c.movers.outgoing/…)` (458–459) | live |
| `capture.ghostY?` / `.animSync` / `.animRes` | `c.capture.*` (465–467) | live |
| `sourceWasClobbered` | `d.clobbered = c.sourceWasClobbered` (470) | live |

The sweep of the whole class: after `classification` drops, the dead set is exactly `plan.outgoing`,
`plan.incoming`, `plan.renderDestination`. Every other leaf has a real L3 property-read. The Mover leaf
members (`element`/`ownership`/`slot`) are read off the rebound `toMover(m)` parameter (app.js:457), so
they are live but not confirmable by a `c.movers.*` property scan — that residue needs semantic reading,
not a mechanical check (see the Coverage note).

Adapter (`tomeroam-js-dom`) tokens over the declared ranges (unchanged from r4): `d.ghostY`/`d.animSync`/
`d.animRes` (capture, 487/495/578); `d.movers`/`d.clobbered`/`d.live` (start(), 458/470/…);
`document.body.classList.remove('np-locked')` (L3 645; L2 callee 634); `removeAttribute('data-art')` /
`removeAttribute('id')`; `classList.remove('hidden')`/`.remove('parked')` (callee 555–557, 636).

## Findings

### F1 — Structural — defect — the four-key return still carries three dead NESTED members

`buildConstruction` returns `plan` (`{ outgoing, incoming, renderDestination, decorations }`, from
`constructionPlanFor`) so L3 can read `plan.decorations` for the outgoing-NP unlock (app.js:474). But L3
reads **only** `plan.decorations`; `plan.outgoing`, `plan.incoming`, and `plan.renderDestination` are
consumed solely inside `buildConstruction` (swipe.js:291/301/305) to build the movers, and are dead on the
returned object — the identical class as the dropped `classification`, one nesting level down. The
receiver's finest independently-omittable granularity here is the member of `plan`, not `plan` as a whole
(it takes a narrower slice — `decorations`), so each unread member is a dead field (Engineering Contract
§17). **Resolution (a plan decision):** narrow the return to `{ decorations, movers, capture,
sourceWasClobbered }` — hoist `decorations` to a top-level key and have L3 read `c.decorations` — or name a
genuine production consumer for `plan.outgoing`/`plan.incoming`/`plan.renderDestination` (there is none:
the movers they produce are already returned). Narrowing is the correct fix. Note `buildConstruction` is
NON_CONTRACT (`contract-function-gate.test.js`), so the exact-key gate does **not** pin its return shape —
a dead returned member is invisible to that gate, which is exactly why liveness must be read here.

### F2 — Structural — defect — the `vitruvius-coverage` `parking` row asserts a mutation that cannot exist

The §8 prose marks `parking` `— (parity only; retained)` and gives the reason: `move()` overwrites the
initial parking transform in the same synchronous tick with no paint between, so removing the parking write
is invisible to any behaviour test. The machine-readable `vitruvius-coverage` block, however, renders that
row's mutation as `parking transform removed (parity regression)`, asserting a reddening verification that
provably cannot exist. A machine record that claims a mutation-verification where none is possible is a
false coverage claim — it would tell Curie/Mendeleev a guarding mutation exists. **Resolution:** represent
the row honestly in the block — `— (parity only)` or an explicit `n/a` in the mutation cell — matching the
prose, before re-ratification.

## Recommendation to the makers (not performed by this review)

Poirot's `tools/dead-return-fields.mjs` checks only top-level return keys, which is why the nested members
escaped both it and my r4 forge. A worthwhile enhancement — routed to the maker/review chain, not applied
here — is to extend that detector one level into a returned member whose produced structure is resolvable
(an inline object literal, or a variable from a local object-returning function like
`plan ← constructionPlanFor`): check each sub-field, flagging a nested sub only where a sibling sub is read
by path, so a member used whole is not descended. This is a **heuristic, not a proof** of liveness: it has
false positives (a destructured or rebound consumer hides the read — e.g. `buildConstruction` itself
destructures the classification, so a naive scan reports all five of its keys dead) and false negatives
(aliasing, computed keys, indirect data flow). It would narrow the gap, not close the class; whether to
adopt it is the makers' decision.

## Prior-review correction (my own craft, recorded)

My round-4 forge stated "no new dead field" after checking that each top-level return key had a consumer —
the same shallow-vs-deep error Poirot's F1 named, one level lower: I confirmed `c.plan` is read and stopped
instead of recursing to the granularity `plan`'s members can be independently omitted. The general rule,
recorded so it transfers: verify a returned member's liveness at the finest granularity the receiver can
slice, not at the outermost key.

## Coverage

Both findings are blocking:
- **F1** — resolved by narrowing the return to `{ decorations, movers, capture, sourceWasClobbered }` (L3
  reads `c.decorations`). The existing detector checks only top-level keys and so does not guard the nested
  members; extending it (see *Recommendation to the makers*) would be the mechanical guard, but that is the
  makers' change, not this review's. Until then the liveness is established by reading `start()` directly
  (Defining records / ledger above).
- **F2** — no runtime surface (a machine-vs-prose documentation correction on a parity-only row); its
  verification is that the `vitruvius-coverage` block's `parking` mutation cell matches the §8 prose
  (`— parity only`) — checkable by inspection, nothing to mutation-test since the point is that no mutation
  applies.

## Prediction — where this breaks in execution if built as written

If the return is not narrowed, the three dead nested members ship exactly as `classification` did —
invisible at runtime, a dead contract the next reader must reverse-engineer — and the stage-6 `planFor`
composition inherits a `plan` sub-object whose members no one downstream reads, so the same audit repeats
one stage later. Narrowing the return is the only correct resolution. F2, left uncorrected, would hand
Curie a coverage block claiming a `parking` mutation to author — a test that cannot be written, discovered
only when someone tries.
