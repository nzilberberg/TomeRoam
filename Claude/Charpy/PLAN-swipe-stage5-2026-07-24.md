# Plan review (round 4) — PLAN-swipe-stage5.md (contract re-ratification: drop dead `classification`)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:345-356","js/app.js:358-497","js/app.js:547-580","js/app.js:582-655"],"callee_ranges":["js/app.js:550-558","js/app.js:632-638"]} -->
<!-- note: round 4, re-stress of the ratified return shape after Poirot F1 (dead returned `classification`). Rounds 1–3 = the seven blockers → F1-r/F2-r/F3-r → forge. Scope B, F0/F1/F3/F6, and the drop-vs-consume decision (drop, 2026-07-23) are NOT reopened per the planner's handoff. -->

Reviewed: 2026-07-24 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (committed 1b4cf72). Grounded against
HEAD and against the built seam (commit 6bf0d20, build .239) as traced in
`Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md`. Stress scope per the planner's handoff: the
return-shape revision, the three new machine blocks, and the three reassigned ledger owners — nothing else
reopened.

## Applicability

Declared patterns (machine-readable declaration above; adapter `tomeroam-js-dom`):
- **defining_records: true** — the §9 records were APPLIED on ratification; the Poirot casebook is a new
  material record (the F1 dead-field finding this revision resolves). Reconciled below.
- **boundary_relocation: true** — the relocation is unchanged from the forge'd design; ranges re-declared.
- **callee_replacement: true** — `showAppView` (550–558) + overlay branch (632–638) split across
  L1/L2/L3; every effect assigned in §5 and now also in the `vitruvius-effects` block.
- **contract_shape: true** — TWO shapes change: `classifyTransition` gains the host fields (unchanged from
  forge), and the `buildConstruction` **return** drops `classification` (five keys → four). This review
  re-ratifies the second.

## Verdict

**FORGE** — re-ratify the four-key return; build the drop. The revision is internally consistent and the
dead field is fully scrubbed from the return surface. One non-blocking documentation drift is filed (F1):
the `vitruvius-coverage` block's `parking` row over-claims a reddening mutation the prose correctly denies.
Nothing about the drop shatters scope B or any prior finding.

## Defining records

Verdict: **AGREE** on the drop across every surface; the prior HEAD conflicts remain APPLIED-on-ratification
(unchanged). New record reconciled:
- **`Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md`** (F1, Significant) — `Construction.classification`
  is a dead returned field: `start()` reads `c.movers`/`c.capture`/`c.sourceWasClobbered`/`c.plan.decorations`
  but never `c.classification`; the plan's stated consumer ("L3 reuses the exact objects … render-mode
  checks") never materialized because L3 reads `c.plan.decorations` and does no render-mode checks.
  Authority: an approved code review with a mechanical detector behind it. This plan revision honours it by
  dropping the field from the return (decision logged 2026-07-23) — AGREE, not reopened.
- The parent plan, `swipe.js` header, and DecisionLog reconciliations are marked APPLIED (§9); no HEAD
  conflict remains open on them.

## Value-crossing ledger — the drop and the three reassigned owners, re-struck

The relocation ledger was verified in full at forge; only the rows the revision touches are re-struck,
each against the built code Poirot traced. Ranges unchanged: `npPillClone` 345–356; `GHOST_BG`+helpers+
`ghostApp` 358–497; `snapshotHome` 547–580; `start()` 582–655. Callee ranges: `showAppView` 550–558;
overlay branch 632–638.

| Value | Dir | Owner (revised) | Verified against built code |
|---|---|---|---|
| `classification` (fromKind/toKind + host) | in | L1 derives (internal; **not returned**) | ✓ no `.classification` read in `js/` (Poirot grep + `dead-return-fields.mjs`); §4:241 is an `in` row, no returned-output row exists — the drop is complete |
| `destinationHost` | in | **L1** (reads, dispatches to L2) | ✓ L1 reads host, passes to `env.renderDestination` (swipe.js overlay/browse branches); single accountable owner = L1 |
| `capture {ghostY?,animSync,animRes}` | out | **L1** (produces; L3 records present fields) | ✓ L1 builds via `ghostApp`/`snapshotHome`; L3 records `if ('ghostY' in c.capture) d.ghostY=…` (app.js:465) — L1 owns the value, L3 is the consumer, one owner each column |
| `d.clobbered` same-host carrier | out | **L3** (writes the session field; L1 computes value) | ✓ `sourceWasClobbered` computed swipe.js:310 (L1); `d.clobbered = c.sourceWasClobbered` written by L3 — the CARRIER's owner is L3, producer L1, both named |

Four returned keys, each with a live L3 consumer: `plan`→`plan.decorations` (app.js:474), `movers`→`toMover`
(457), `capture`→ record (465), `sourceWasClobbered`→`d.clobbered`. No dead returned field remains; the
`dead-return-fields.mjs` detector reports zero once Brunel drops it.

Adapter (`tomeroam-js-dom`) source-pattern confirmations over the declared ranges (unchanged from forge):
`d.ghostY`/`d.animSync`/`d.animRes` (capture, 487/495/578); `d.movers`/`d.clobbered`/`d.live`
(start(), 649/630/589); `removeAttribute('data-art')` pre-mount (376/480/567); `removeAttribute('id')` +
`classList.add('np-pill-float')` (352/353); `document.body.appendChild` (354/491/574). Callee classList
tokens: `showAppView` — `classList.add('hidden')` / `classList.remove('parked')` / `classList.add('hidden')`
(555–557); overlay branch — `document.body.classList.remove('np-locked')` (634), `classList.remove('hidden')`
(636). Each assigned to one layer in §5 and the `vitruvius-effects` block.

## Findings

The verdict is **forge**. The drop is consistent and complete; the machine blocks faithfully mirror the
prose with the one exception filed below.

### F1 — Note — recommendation — the `vitruvius-coverage` `parking` row over-claims a mutation the prose denies

The §8 prose marks `parking` `— (parity only; retained)` and explains why no mutation can verify it:
`move()` (app.js:657/675) overwrites the initial parking transform in the same synchronous tick with no
paint between, so removing the parking write is invisible to any behaviour test (the observability floor —
a write overwritten in the same tick with no paint or consumer between is parity coverage, not a reddening
mutation). The `vitruvius-coverage` block, however, renders that row's mutation as `parking transform
removed (parity regression)`, asserting a reddening verification that provably cannot exist. It is the one
place the machine rendering drifted from the design, and the block is the less-correct surface. The planner
might align the block's mutation cell to `— (parity only)` (or an explicit `n/a`), matching the prose. This
is a documentation-consistency suggestion, not binding, with no runtime surface — `parking` is retained
either way, and Poirot's O4/W22 already routes the real parking/`toMover` coverage question to Mendeleev.

## Coverage

No blocking finding remains, so none is owed a new test. F1 owes no test — it is a machine-vs-prose
documentation alignment on a parity-only row, no runtime surface. The `vitruvius-coverage` block already
carries a complete row for every blocking question (F1/F2/F4/F5/F6/F7/F8), which the wired gate validates.

## Prior-review correction (my own craft, recorded)

My round-3 forge cleared a `Construction` that still returned `classification`, on the plan's claim that L3
"reuses the exact objects (decorations loop, render-mode checks)." That claim was false — L3 reads
`plan.decorations` and does no render-mode checks — so the field was dead on return, and I passed it. The
discipline that should have caught it exists (D6: a reviewer holds a plan's own proposed return shape to the
no-dead-field rule — a proposed field must have a real consumer, not merely a value used internally). The
distinction I missed is exactly the one Poirot's correction draws: "the field's value is used inside
`buildConstruction`" is not "the returned field has a consumer." The class is now mechanically caught at the
ship boundary by `tools/dead-return-fields.mjs` + `test/construction-consumers.test.js` (Poirot's durable
enforcement — frozen, out of scope here). The plan-review-stage structural closure, when gate work reopens,
is a cross-check that every key in the `vitruvius-contract` return set appears as an L3-consumed row in the
`vitruvius-ledger` — the two machine blocks that now exist make that check possible; it is recorded here so
it is actioned rather than re-remembered.

## Prediction — where this breaks in execution if built as written

It does not. The drop is a narrow removal of one returned key with no consumer; the four survivors are each
read by L3, the detector confirms zero dead, and Curie's exact-shape test (`CONSTRUCTION_KEYS`,
`test/swipe-construction.test.js`) pins the four-key contract so a future re-addition without a consumer
reddens. The failure mode to watch is not here but at the stage-6 boundary Poirot's prediction names: when
`sameBrowseHost` and the pane lifecycle return, the same "consumer + test + gate in the same commit"
discipline that made this drop clean must repeat — a field re-emitted a stage later without its consumer is
the identical class, one field over.
