# Plan review (round 8) — PLAN-swipe-stage5.md (TEMPER: F3 justification contradicts the F2 projection)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->
<!-- note: round 8 re-reviews commit 6ab24fb (Vitruvius's r7 fixes). r7 F1/F2 and the F3 sourceWasClobbered reconciliation are resolved; a NEW self-contradiction fell out of the F2×F3 interaction. Scope = contract re-ratification. -->

Reviewed: 2026-07-24 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (committed 6ab24fb). Grounded against
the plan text and the built seam (`js/swipe.js`, `js/app.js`), read directly.

## Applicability

- **defining_records: true** — the contract block, the ledger, and §3's F2/F3 prose are the material records.
- **boundary_relocation: false** / **callee_replacement: false** — ratified at forge; not reopened.
- **contract_shape: true** — the `buildConstruction` return contract and its machine records are under review.

## Verdict

**TEMPER** — one blocking self-contradiction. The r7 fixes largely landed: **F1** is scrubbed (§2:101 and
§5:308 now read `c.decorations`; the only surviving `plan.decorations` are provenance at §12 and the internal
projection expression at §236 — verified by sweep), **F2** specifies the explicit projection, and **F3's
`sourceWasClobbered`↔`d.clobbered` mismatch is reconciled** (the ledger row at §4:275 is renamed/reclassed to
`sourceWasClobbered (recorded onto d.clobbered…) | boolean`, matching the contract field by name and class).
Routing the qualified-name / richer-reconciliation capability as maker-owned gate-format work is the correct
disposition. But §3's F3 justification now contradicts its own F2 resolution (F-a).

`buildConstruction` is NON_CONTRACT (`contract-function-gate.test.js`); liveness is read directly.

## Defining records

Verdict: **CONFLICT within §3** — the contract section asserts both "the two `decorations` are the same value"
and "`Construction.decorations` is a projection that strips `role`." These cannot both be true.

## Findings

### Prior r7 findings — verified resolved (not open, no action)

Recorded for the trail: the r7 F1 scrub, F2 projection, and the `sourceWasClobbered`↔`d.clobbered`
reconciliation are correct as filed. No change requested on these.

### F1 — Structural — defect — §3's F3 justification ("same value") contradicts the F2 projection

§3:167-168 states `classifyTransition.decorations` and `Construction.decorations` are "the SAME value, so the
flat block is unambiguous," and §3:170-171 treats a divergence of two same-named fields as "a future case."
But F2 (§3:149, §3:235-236) **projects** the returned decoration —
`plan.decorations.map(({ kind, base }) => ({ kind, base }))` — so `Construction.decorations` is `{ kind, base }`,
while `classifyTransition.decorations` remains `{ kind, role, base }` (the frozen-model output). The two
same-named fields therefore **diverge in shape now**, not in a future case — directly contradicting the
"same value" claim and §3's own assertion (line 116-117) that "no other section contradicts" the return
shape. The risk is concrete: a builder who reads "same value / hoisted" may hoist `decorations` unchanged and
re-introduce the exact `role` dead leaf F2 removed.

**Resolution:** correct the F3 justification. The single `decorations | object` row is accurate not because
the two fields are "the same value" but because the FLAT format records **class**, and both are class
`object` — while their **shapes** differ (`{kind,role,base}` vs the projected `{kind,base}`), a distinction
the flat format does not capture. State that the shapes diverge *now* (the F2 projection), represented by the
prose + the class-level record, with scoped/shape-level representation the routed maker-format work.

## Coverage

F1 is a plan-prose correction, no runtime surface — its verification is that §3 no longer asserts the two
`decorations` are the same value while also projecting one of them. The `npLock` wiring test still guards the
actual `kind`/`base` read; nothing else is owed.

## Prediction — where this breaks if built as written

A builder trusting §3:167-168 ("same value") hoists `decorations` unchanged, skips the F2 projection, and
`role` ships as a dead returned leaf again — the defect r7 F2 just closed, reopened by a contradictory
sentence two paragraphs up. Correct the one justification and the contract is internally consistent and
buildable; the sourceWasClobbered reconciliation and the maker-routed format work already stand.
