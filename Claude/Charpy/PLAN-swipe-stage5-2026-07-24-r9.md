# Plan review (round 9) — PLAN-swipe-stage5.md (FORGE)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->
<!-- note: round 9 re-reviews commit 819f62f (the r8 fix). The r8 same-value/projection contradiction is resolved with no new contradiction; every finding across r1–r8 is closed. Scope = contract re-ratification. -->

Reviewed: 2026-07-24 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (committed 819f62f). Grounded against the
plan text and the built seam (`js/swipe.js`, `js/app.js`), read directly.

## Applicability

- **defining_records: true** — §3's contract prose, the machine blocks, and the ledger are the material records.
- **boundary_relocation: false** / **callee_replacement: false** — ratified at the r3 forge; not reopened.
- **contract_shape: true** — the `buildConstruction` return contract, re-ratified.

## Verdict

**FORGE** — build it. The r8 blocking contradiction is resolved (verified at §3:168-175): §3 no longer claims
the two `decorations` are "the same value" nor calls their divergence "a future case." It now justifies the
single flat `decorations | object` row by CLASS — both `classifyTransition.decorations` and the returned
`Construction.decorations` are class `object` — **not** by shape, and states the shapes DIVERGE now
(`{ kind, role, base }` vs the projected `{ kind, base }`), with scoped/shape-level representation routed as
maker-owned gate-format work. The sibling "hoisted" phrasings were swept — the status line (§12) and §3
(§166-167) now read "projected to `{kind,base}`, never hoisted unchanged," closing the builder-risk (hoisting
unchanged → resurrected `role` leaf). `buildConstruction` is NON_CONTRACT (`contract-function-gate.test.js`);
liveness read directly.

## Defining records

Verdict: **AGREE** — §3 is internally consistent (no same-value/projection contradiction), the
`sourceWasClobbered`↔`d.clobbered` ledger reconciliation holds by name+class, and the two maker-owned
format/tooling enhancements are routed separately, not blocking this plan.

## The full-arc check — every finding closed

Verified across the eight prior rounds, all resolved:
- The seven original blockers (F1/F2/F4/F5/F6/F7/F8), F3, and the parity obligations (r1–r3 forge lineage).
- Dead `classification` (Poirot F1) + dead nested `plan.outgoing`/`incoming`/`renderDestination` (r5): the
  return is narrowed to `{ decorations, movers, capture, sourceWasClobbered }`.
- Dead leaf `role` (r7 F2): projected away — `plan.decorations.map(({ kind, base }) => ({ kind, base }))`.
- Stale `plan.decorations` instructions (r7 F1): scrubbed to `c.decorations`.
- Machine contract (r7 F3): `sourceWasClobbered`↔`d.clobbered` reconciled; the `decorations` two-surface
  conflation documented and routed (the flat format cannot scope).
- Same-value/projection contradiction (r8): corrected this round.

No dead returned member at any level (top key, nested member, array-element leaf); no internal
contradiction; every returned field has a live L3 consumer.

## Findings

### F1 — Note — recommendation — two maker-owned enhancements are routed, not part of this FORGE

For the trail (non-blocking): the plan correctly routes two items to maker-owned process work, separate from
this build — (a) authoring-gate support for scoped/qualified field names plus richer contract↔ledger
reconciliation (so a future case of two same-named fields that must diverge is machine-representable), and
(b) a nested/leaf-recursive dead-return detector (proposed at r5/r7). Neither blocks Stage 5; they should be
tracked so they are not lost.

## Coverage

F1 owes no test — a forward-looking routing note, no runtime surface. The build's verification is the §8
matrix (unchanged from r7): `CONSTRUCTION_KEYS` pins the four-key return; `npLock` guards the projected
decoration's `kind`/`base`; `KR-swipe-construction-dead-classification` flips green when Brunel narrows.

## Prediction — where this breaks if built as written

It does not. The return contract is internally consistent and every member is live to the finest granularity.
The chain resumes: Curie reconciles `CONSTRUCTION_KEYS` → Brunel hoists+projects `decorations` to
`{ kind, base }`, drops the `plan` wrapper and `classification` → the dead-return detector reports zero and
`KR-swipe-construction-dead-classification` flips green.
