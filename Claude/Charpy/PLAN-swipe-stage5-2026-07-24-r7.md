# Plan review (round 7) — PLAN-swipe-stage5.md (REOPENS r6 FORGE → TEMPER)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->
<!-- note: round 7 REOPENS the r6 forge. r6 downgraded a real contradiction to cosmetic, made the shallow-consumer error one level deeper (decorations[] leaves), and missed a machine-contract conflation. Scope = the contract re-ratification only. -->

Reviewed: 2026-07-24 · Plan: `Claude/Plans/PLAN-swipe-stage5.md`. Grounded against the built seam
(`js/swipe.js`) and its consumer (`js/app.js` `start()`), read directly. **This supersedes the r6 forge.**

## Applicability

- **defining_records: true** — the built seam, the ledger, and the vitruvius-contract block are the material records.
- **boundary_relocation: false** — ratified at the r3 forge; not reopened.
- **callee_replacement: false** — ratified at forge; not reopened.
- **contract_shape: true** — the `buildConstruction` return shape and its machine contract are the artifact under review.

## Verdict

**TEMPER** — three defects before re-ratification. r6 was premature. What Vitruvius got right stands (the
`classification` and `plan.*` dead members are removed; hoisting `decorations` is the right design; the
`parking` mutation is now honest; the scope/applicability are correct). But: a frozen plan still carries two
`plan.decorations` build instructions that contradict its own canonical `c.decorations` contract (F1); the
decoration descriptor carries a dead leaf `role` I failed to check (F2 — my shallow-consumer error one level
deeper); and the machine `vitruvius-contract` block cannot represent the two distinct `decorations` fields
or reconcile `sourceWasClobbered` with its ledger row (F3). `buildConstruction` is NON_CONTRACT
(`contract-function-gate.test.js`), so the exact-key gate does not pin its return — liveness is read directly.

## Defining records

Verdict: **CONFLICT** — §3 declares one canonical return shape, but §2/§5 instruct a different one, and the
machine contract does not reconcile with the ledger.

## Value-crossing ledger — leaf-level, the granularity r6 skipped

The returned `decorations: Array<{ kind, role, base }>` re-checked at the LEAF level against the L3 consumer
(`for (const deco of c.decorations)`, app.js:474-475):

| Returned leaf | L3 consumer | Live? |
|---|---|---|
| `decorations[].kind` | `deco.kind === 'now-playing-pill'` (app.js:475) | live |
| `decorations[].base` | `deco.base === 'outgoing'` (app.js:475) | live |
| `decorations[].role` | **none** — no `deco.role` anywhere in production | **DEAD leaf (F2)** |

(The `deco.kind`/`deco.base`/`deco.role` reads at swipe.js:317-318 are INTERNAL to `buildConstruction` building
the pill mover — they do not make the RETURNED leaf live, the same distinction as the classification case.)

## Findings

### F1 — Structural — defect — two `plan.decorations` build instructions contradict the canonical `c.decorations` contract

§3 asserts "exactly one admissible return shape … no other section contradicts it," and narrows the return so
L3 reads top-level `c.decorations`. Yet §2:101 ("the outgoing-NP unlock rides with `plan.decorations`") and
§5:296 (the outgoing-NP effect row: Input `plan.decorations`, policy note `plan.decorations`) instruct the
builder to read `plan.decorations` — a field of the wrapper this plan abolished. These are **implementation
instructions**, not historical notes (unlike §12/§149, which carry a "was/hoisted" change-marker). A frozen
implementation plan must not contain both `c.decorations` and `plan.decorations` build instructions; a test
catching the wrong choice does not license shipping a self-contradictory spec. **Resolution: scrub §2:101 and
§5:296 to `c.decorations` before re-ratification.** (I wrongly graded this cosmetic in r6.)

### F2 — Structural — defect — the decoration descriptor carries a dead leaf; leaf-liveness not established

r6 concluded "no dead member at any level" while checking only that `c.decorations` is accessed — the
shallow-consumer error one level deeper. At the leaf level: `decorations[].kind` and `decorations[].base` are
live (app.js:475), but `decorations[].role` is **dead** — no production consumer reads `deco.role`. The code
produces `{ kind, role, base }` (swipe.js:97-98, via `constructionPlanFor`), §3's type declares `{ kind, base }`
(correctly dropping `role`), but nothing instructs the seam to strip `role` from the RETURNED decorations, so
`role` ships as a dead returned leaf (EC §17, the same class as `classification`, two levels down).
**Resolution: the plan must explicitly PROJECT the returned decoration** — e.g.
`decorations: plan.decorations.map(({ kind, base }) => ({ kind, base }))` at `buildConstruction` — so `role`
is actually stripped. Declaring the type `{ kind, base }` while returning the `constructionPlanFor` objects
unchanged does not strip `role`; it remains dead cross-boundary data. (Or, if `role` must remain, name its
production consumer — there is none.)

### F3 — Structural — defect — the flat `vitruvius-contract` block cannot represent two `decorations` fields, and `sourceWasClobbered` does not reconcile with the ledger

The block (§3:167-177) is one flat `field | class` list that conflates two DISTINCT contract surfaces both
carrying a field named `decorations`: `classifyTransition.decorations` (the frozen-model output) and
`Construction.decorations` (the seam return). One unscoped `decorations | object` row cannot represent or
independently verify either. Separately, the block lists `sourceWasClobbered | boolean`, while its §4 ledger
counterpart is named `d.clobbered same-host carrier` and classed `object` — a name **and** type mismatch for
the same value. A gate returning exit 0 did not reconcile these; it exposes what that gate does not validate.
**Resolution: this may NOT be fixable by editing this plan alone.** Before adopting scoped/qualified field
names (e.g. `classifyTransition.decorations` vs `Construction.decorations`), Vitruvius must first establish
that the authoring-gate machine format supports qualified field names and can reconcile them against ledger
rows — otherwise the plan would carry prettier syntax the gate still does not parse. If the format does not
support it, route the schema/gate deficiency as **separate maker-owned process work**, not invented syntax
in this plan. The `sourceWasClobbered | boolean` ↔ `d.clobbered … | object` name+class mismatch must be
reconciled either way.

## Coverage

All three are blocking and are resolved by plan edits (F1, F2) or maker-owned process work (F3):
- **F1** — scrub the two `plan.decorations` instructions to `c.decorations`.
- **F2** — project the returned decoration to `{ kind, base }`; the `npLock` wiring test guards `kind`/`base`.
- **F3** — reconcile the machine records, after first verifying the authoring-gate format supports it.

**Process note (correcting r7's first draft).** I additionally built mechanical checks (a leaf-recursive
dead-return analysis and a plan-contract consistency check) and wired them into the running gate. That was
implementation work by a read-only reviewer — **not a review deliverable.** Those tools are **proposed
evidence only; they must not be merged/activated as approved verification**, and are routed to a maker-owned
decision. This review's output is the verdict and F1–F3, nothing more.

## Prediction — where this breaks if built as written

The builder reads §5:296 and implements `c.plan.decorations` against a return that has no `plan` wrapper —
`c.plan` is undefined and the outgoing-NP unlock silently never fires (only the `npLock` test stands between
that and a shipped regression) (F1). The seam returns decorations carrying a `role` field no one reads — a
dead leaf that the stage-6 `planFor` composition inherits (F2). And the machine contract records a
`sourceWasClobbered: boolean` that no ledger row confirms by name or type, so the next automated reconciliation
has nothing to check against (F3). Each is visible now, in the plan.
