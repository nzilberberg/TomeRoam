# Plan review (round 6) — PLAN-swipe-stage5.md (FORGE: dead members narrowed; parity claim corrected)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->
<!-- note: round 6 re-reviews the plan after Vitruvius resolved r5 F1 (dropped the `plan` wrapper, hoisted `decorations`) and r5 F2 (the false `parking` coverage mutation). Scope = the contract re-ratification only; the relocation/callee split were ratified at the r3 forge. -->

Reviewed: 2026-07-24 · Plan: `Claude/Plans/PLAN-swipe-stage5.md`. Grounded against the built seam
(`js/swipe.js` `buildConstruction`) and its consumer (`js/app.js` `start()`), read directly.

## Applicability

- **defining_records: true** — the built seam, the Poirot F1 casebook, and my r5 TEMPER are the material records.
- **boundary_relocation: false** — the relocation was ratified at the r3 forge; not reopened this round.
- **callee_replacement: false** — the `showAppView`/overlay-branch split was likewise ratified; not reopened.
- **contract_shape: true** — the sole artifact re-ratified is the `buildConstruction` **return** shape, after the narrowing.

## Verdict

**FORGE** — build it. Both round-5 blocking findings are resolved:
- **r5 F1 (dead nested return members) — resolved.** The return is narrowed to the four live keys
  `{ decorations, movers, capture, sourceWasClobbered }` (§3:143-157); `classification` and the `plan`
  wrapper are dropped, `decorations` hoisted (L3 reads `c.decorations`). The `vitruvius-contract` block
  (§3:167-177) matches — no `plan`, no `classification`.
- **r5 F2 (false coverage claim) — resolved.** The `vitruvius-coverage` `parking` row (§8:448) now reads
  `n/a — parity-only, unobservable (move() overwrites the parking transform the same tick, no paint
  between)`, matching the §8 prose.

One non-blocking tightening remains (F1 below). `buildConstruction` is NON_CONTRACT
(`contract-function-gate.test.js`), so the exact-key gate does not pin its return shape — liveness is
established by reading `start()` directly.

## Defining records

Verdict: **AGREE** — the narrowed contract resolves the earlier CONFLICT (ratified return vs the
no-dead-fields rule, EC §17).
- **`js/swipe.js` `buildConstruction`** — the ratified contract narrows the return to
  `{ decorations, movers, capture, sourceWasClobbered }`. The built code still returns the old shape; Brunel
  applies the narrowing, Curie reconciles `CONSTRUCTION_KEYS` (`test/swipe-construction.test.js`).
- **`js/app.js` `start()`** (L3) — reads `c.movers.*`, `c.capture.*`, `c.sourceWasClobbered`, and
  (post-narrowing) `c.decorations`.
- **`Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md`** (F1) + **Charpy r5 F1** — the dead
  `classification` and the nested `plan.*` members; both resolved by the narrowing.
- **`Claude/Charpy/PLAN-swipe-stage5-2026-07-24-r5.md`** — the round-5 TEMPER; both findings cleared.

## Value-crossing ledger — the narrowed return, every member live

Every returned member re-checked against `start()` at the finest granularity the receiver can omit:

| Returned member | L3 consumer | Live? |
|---|---|---|
| `decorations` (hoisted) | outgoing-NP unlock reads `c.decorations` (post-narrowing) | live |
| `movers.outgoing`/`.incoming`/`.decoration` | `toMover(c.movers.*)` | live |
| `capture.ghostY?`/`.animSync`/`.animRes` | recorded onto `d` (`if ('ghostY' in c.capture)`) | live |
| `sourceWasClobbered` | `d.clobbered = c.sourceWasClobbered` | live |

No dead member at any level; `classification` and the `plan` wrapper are dropped. The code still returns
the old shape until Brunel narrows it — my reviewer-side analyzer confirms the members it flags on the
current code (`classification`, `plan.outgoing`/`incoming`/`renderDestination`) are **exactly** the ones the
plan's declared contract drops, i.e. resolved by this plan, not ignored.

## Findings

### F1 — Weak — recommendation — two stale `plan.decorations` references survived the wrapper drop

§3 (authoritative) narrows the return so L3 reads top-level `c.decorations`. But two supporting references
still describe L3's input as `plan.decorations` — the dropped wrapper's field: §2:101 ("rides with
`plan.decorations`") and §5:296 (the outgoing-NP effect row's Input column and its policy note). Lines 12
and 149 correctly describe the hoist as a past-state; only these two are stale. This is non-blocking — §3
governs and is unambiguous, and the `npLock` wiring test (§8) guards the actual read: if the implementation
read `c.plan.decorations` against the narrowed return, `c.plan` is undefined, the outgoing-NP unlock never
runs, and `npLock` reddens. The plan should sweep these two references to `decorations` / `c.decorations`
so the builder is not directed to the old `c.plan.decorations` read.

## Coverage

F1 owes no test — a documentation-consistency tightening on plan prose, no runtime surface; the `npLock`
wiring test (§8) already guards the actual hoisted read. The two round-5 blockers' verifications live in §8:
r5 F1 via the narrowed `CONSTRUCTION_KEYS` + `npLock`; r5 F2 is a parity-only row with no applicable mutation.

## Prediction — where this breaks if built as written

It does not. The narrowed return has a live consumer for every member; Curie's `CONSTRUCTION_KEYS` pins the
four-key shape; Brunel's hoist (`c.plan.decorations` → `c.decorations`) is guarded by the `npLock` test. The
only residual is cosmetic — the two stale `plan.decorations` references (F1) — and the `npLock` test would
catch them if they misled the implementation. Chain resumes: Curie reconciles `CONSTRUCTION_KEYS` → Brunel
narrows the return and hoists `decorations` → the dead-classification known-red flips green.
