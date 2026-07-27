# Charpy casebook — PLAN-swipe-stage6c (I12 ownership half), round 1

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: **90af572** (HEAD) — `Claude/Plans/PLAN-swipe-stage6c.md`.
Grounded against `js/app.js` (build `2026-07-26.250`), `test/app-harness.js`, `test/swipe-invariants.test.js`,
`Claude/Subsystems/swipe-reveal.md`, `Claude/Decisions/DecisionLog.md`.

## Applicability

- **defining_records: true** — the review reconciles the material records that define this slice (User
  Option-A authorization, the I12 in-code rationale, the "Owed to stage 6" ledger entry, EC §4.6/§4.15/§4.18,
  the swipe-reveal subsystem disposal boundary, `PLAN-swipe-reveal.md` §7 step 6).
- **boundary_relocation: false** — no ownership boundary is relocated across a module seam; the plan under
  review is an in-place guard/retirement addition plus a gate narrowing, all within `js/app.js` begin()/
  settle()/finalize() (plan `state_transfer:false`, `boundary_relocation:false`). No source-range ledger is
  required of this review.
- **callee_replacement: false** — no direct callee is replaced by an indirection layer; the settle rAF,
  `finalize`, and `transitionend` listener already exist and gain ownership guards. (The heuristic warning
  fires on the word "successor/supersede"; that is gesture supersession, not a callee-indirection swap.)
- **contract_shape: false** — no exact-key contract changes; `d`/`cur` is exempt mutable lifecycle state and
  no `PBSwipeSession` shape is extended (plan §2.6).

## Verdict

**TEMPER** → Vitruvius. The A/B split is real and the ownership spine is sound: the pane-less/pane-owning
line is a genuine, checkable boundary (`session.movers.some(m => m.own === 'owned-pane')`), the
re-rasterization flash surface (an owned full-viewport pane held to paint) is genuinely not touched by a
pane-less supersession, and the `cur === session` identity guard is reachable and observable on the
successor's REAL DOM (removing it lets a stale settle rAF write `translateX` onto the borrowed-real
`#home`/`#browse` now owned by the successor — the same channel `swipe-invariants.test.js:598-616` already
reads). The specimen does not shatter. But two load-bearing defects must be fixed before build:

- **F1 (Structural)** — the settle-phase null-on-retire writes are NOT independently load-bearing in the
  pane-less window; the identity guard subsumes them, so the plan's "omit the null → reddens" mutation is
  false and §4/U11 contradicts §4.15/§4b/§9. This is the campaign's recurring vacuous-cell failure,
  relocated from the identity guard onto the null-write.
- **F2 (Structural)** — begin()'s narrowed-gate supersession leaves `finishing` stuck true (and does not
  specify the recovery-entry predicate), wedging every future swipe when the successor does not arm.

Neither touches the central claim; both are fixable by the planner without scrapping the slice.

## Defining records

**AGREE.** No two DEFINING records disagree on required behaviour. The user's Option-A authorization
(precedence 1) resolves the charter-vs-code contradiction the escalation raised; the I12 in-code rationale
(app.js:219-234), the "Owed to stage 6" ledger entry (DecisionLog.md:319-323), EC §4.6/§4.15/§4.18, the
subsystem disposal boundary (swipe-reveal.md:69-70, I17), and `PLAN-swipe-reveal.md` §7 step 6 are mutually
consistent and each is faithfully cited. Line citations verified accurate: begin() 351-412, gate 352,
6a recovery 361-390, settle rAF 551-553, finalize 1159-1179, `settleTimer` 1182, `transitionend` 1181,
`paneKindOf` 688-692, "every other transition slides REAL elements" 686-687, I12 219-234.

Two reconciliation corrections (NOT record conflicts — the plan's READING of a record is wrong, the records
themselves agree): (1) the plan claims 6c discharges the SETTLE-phase portion of the "Owed to stage 6"
null-handle debt "with the ownership guards as consumer" (§1 row 3, §4 U4) — F1 shows that consumer is
redundant with identity and does not redden, so the debt is NOT discharged with a reddening test by 6c.
(2) The plan's own §11 deferral rule for the reveal-phase nulls ("already-retired consumer unreachable while
the phase stays gated") applies verbatim to the settle-phase nulls in the pane-less window — see F1.

The internal §4/U11-vs-§4.15 contradiction is an internal-consistency defect (StandardsDocument §7), filed
as F1, not a defining-records conflict.

## Findings

### F1 — settle-phase null-on-retire writes are not independently load-bearing; the "omit the null" mutation does not redden (Structural; nature: defect)

The plan lands the settle-phase null-writes (`cur.settleFrame`/`cur.settleTimer`/`cur.transitionListener` =
null on retire) in 6c and asserts they are a §4.15 consumed field with a reddening test: §9 cells G1/G2 name
"**or** omit the null-on-retire … so the old frame stains the successor" as an equivalent reddening mutation,
§4b ledger rows the "settle-phase retired-null record" as consumed by `ownershipGuards@S6c`, and §4 U4 calls
the already-retired arm the null-writes' consumer.

This is false in the pane-less window, and the plan contradicts itself on it.

- **The identity check alone neutralizes every reachable pane-less settle-phase stale callback.** The guard
  reads the LIVE module `session` at call time (§5; EC §4.6). After begin() supersedes A and arms B,
  `session === B` (app.js:410). On a normal pane-less finalize there is no held reveal
  (`revealPending` is set true only by the pane-owning held-reveal branches, app.js:558-559), so
  `endOwnership → sessionDone` sets `session = null` (app.js:1158, 242). Sessions are fresh monotonic objects
  (`++sessionSeq`, app.js:407); `session` never returns to a retired A. So for a settle-phase handle, at the
  moment a stale callback fires, `cur !== session` ALWAYS — the identity check trips regardless of the null.
- **Therefore removing ONLY the null-write (keeping the identity check) reddens nothing.** The stale callback
  still no-ops via identity; the successor's DOM is unstained; G1/G2/G3 still pass. The null-write is a dead
  field per §4.15 in this window, and the G1/G2 "or omit the null" mutation is UNCAUGHT — the exact vacuous
  cell the 6b campaign died on twice, moved onto the null-write.
- **The plan already concedes this.** §4 U11 states "the exact expression of 'already retired' (null-field
  read vs **the identity check alone**) are recommendations; the invariant is 'a settle-phase continuation
  that fires after a successor has taken ownership performs none of its effect.'" If identity-alone satisfies
  the invariant, the null-write is not required and cannot be a §4.15 consumed field with a reddening test.
  §4/U11 and §4.15/§4b/§9-G1-G2 cannot both hold (StandardsDocument §7).
- **The already-retired arm is genuinely load-bearing only where identity does NOT differ** — i.e. when
  `cur === session` is true but the handle is retired. That is the HELD-REVEAL phase (a pane-owning session
  stays `session` past finalize via `revealPending`), which 6c defers. The plan defers the reveal-phase nulls
  for exactly this reason (§4 "Why the reveal-phase nulls are NOT in this slice", §11); the same reasoning
  applies to the settle-phase nulls in the pane-less window.
- **The harness makes the distinction concrete.** `cancelAnimationFrame`/`clearTimeout` REALLY splice the
  pending callback (`app-harness.js:241`, `356-359`); `h.raf.frame()`/`clock.advance()` fire only what is
  still queued. So to keep G1/G2 observable at all, begin() must NOT cancel the frame/timer (only null) —
  which means the frame/timer fires and the IDENTITY guard is what catches it. There is no harness model of
  "cancelled-but-escaped" (the production hidden-tab case, app.js:546-550), so the null/retired arm has no
  reachable test in the settle phase here.

The identity guard itself is sound and non-vacuous — removing the `cur === session` check on the settle rAF
lets the stale frame write `m.el.style.transform` on `cur.movers` (borrowed-real `#home`/`#browse` now owned
by B; app.js:551-553), observable as a non-empty transform on the successor's real element. F1 is strictly
that the ADDED null-write layer is redundant, presented as consumed.

Failure scenario if built as written: Brunel adds the settle-phase null-writes as a "consumed" field; Curie
writes G1/G2 asserting the null's omission reddens; Mendeleev's mutation sweep reports the "omit the null"
mutation UNCAUGHT (the identity guard absorbs it) → a vacuous assertion ships or the campaign stalls on the
same failure class again.

Resolution (planner's): make the settle-phase mechanism the IDENTITY guard (G1/G2/G3 redden on removing the
`cur === session` check — real, observable on successor DOM); DEFER the settle-phase null-writes to 6d/7
alongside the reveal-phase nulls (their reddening consumer — retired-while-`cur === session` — is unreachable
in the pane-less window), OR keep them explicitly labelled as non-load-bearing truthful-ownership hygiene
(NOT a §4.15 consumed field, NOT claimed to redden a cell). Correct §4.15, the §4b ledger row "settle-phase
retired-null record", §9 G1/G2 mutation columns (drop the "or omit the null" alternative), §4 U4, and the §1
DecisionLog row (the settle-phase portion of the "Owed to stage 6" debt is not discharged-with-test by 6c).

### F2 — begin()'s narrowed-gate supersession leaves `finishing` stuck true and under-specifies the recovery entry predicate (Structural; nature: defect)

`finishing` is set true at settle (app.js:540) and cleared ONLY inside the completion path (792 held-reveal,
1151 no-pane runFinalize, 1177 throw). It is read only at the gate (app.js:352). Today the recovery block
(361-390) runs only when `finishing === false` (the gate returns otherwise), so it has never needed to touch
`finishing`. The plan's narrowing makes a pane-less SETTLING session supersedable — the FIRST time the
recovery runs with `finishing === true` — and A's finalize will never run to clear it.

- The plan's recovery steps (§3 bullet 2, §7 step 1) enumerate `resetSwipeStyles`, `applyScreen`, scroll
  restore, settle-handle retirement, and identity-null-last, but NOT `finishing = false`. If the superseding
  gesture B then fails to arm — a tap that never crosses the direction lock, so `end()` returns at
  app.js:532 without calling `settle()` — `finishing` stays true forever and app.js:352 rejects every future
  swipe. This is the exact wedge class already guarded for the throw path
  (`swipe-invariants.test.js:623-646`, "finishing must not stay stuck true"); 6c adds a new entry to that
  class and no §9 cell covers it.
- Second under-specification in the same locus: the recovery block is entered by
  `if (d || document.querySelector('.nav-ghost'))` (app.js:361). A pane-less settling session has `d === null`
  (nulled at end(), app.js:531) and owns NO `.nav-ghost` (pane-less → no owned pane). Under the current
  predicate the recovery block is SKIPPED entirely, so "extend the 6a recovery" (§3) presumes an entry the
  plan does not specify. The gate/recovery restructure must (a) route a pane-less settling session into the
  recovery, (b) clear `finishing`, and (c) read `session` fields not `d` (the plan specifies only (c)).

Failure scenario if built as written: a rapid second touch superseding a pane-less settle, where the second
touch is a tap (never arms), permanently disables swipe until reload — the same user-visible wedge as the
throw bug, on a common input (double-tap during the ~200ms settle).

Resolution (planner's): specify the `finishing` state transition on the pane-less supersession path and the
recovery-entry predicate (session non-null ∧ pane-less ∧ finishing); add a coverage cell proving a
subsequent gesture still engages after a pane-less supersession whose successor does not arm (analogous to
`swipe-invariants.test.js:623`).

### F3 — "zero flash surface is touched" overstates; confirm resetSwipeStyles clears the transition (Weak; nature: recommendation)

The re-rasterization flash requires an owned full-viewport pane held to paint; pane-less has none, so that
surface is genuinely untouched — the core split holds. Two calibration points on the CLAIM, not the design:
- Superseding a pane-less settle interrupts an ACTIVE 0.2s CSS transition (app.js:544-545) by clearing
  transforms. If `Nav.resetSwipeStyles` (js/nav.js, via app.js:114) does not also clear the `transition`
  property, the borrowed-real mover animates to the reset value over 0.2s AFTER the successor armed — a
  motion artifact distinct from the flash. Recommend confirming resetSwipeStyles clears `transition`.
- Superseding a COMMITTING pane-less settle newly forces a source-restore (≈abort) that can surface the
  known-open aborted-swipe repaint (memory `tomeroam-swipe-repaint-saga`) in a window where today the commit
  completes with no restore. This is the known-open flash, not a new mechanism, on a path today entirely
  rejected; parity-with-abort is defensible, but §2.3's "zero flash surface is touched" overstates it.
  Recommend §2.3/§11 acknowledge that a pane-less browse-restore can surface the known repaint.

Hedge: this is a recommendation — the safe A/B boundary stands; only the claim wording and one resetSwipeStyles
fact need tightening.

### F4 — PG's non-vacuousness depends on the ghost pane forming in jsdom and being disposed under the mutation (Note; nature: recommendation)

PG asserts a pane-owning (browse→browse ghost) settling session stays gated and its pane is not disposed. Its
value depends on the ghost pane genuinely materializing under `opts.realBrowse` (§1 / harness 597-609) and on
the mutation (wrongly superseding it) actually disposing it — plausibly via `resetSwipeStyles()` (no-arg,
app.js:384) removing ghosts. If the fixture builds no real owned-pane, PG is vacuous (nothing to dispose).
Recommend Curie confirm the ghost pane forms and the mutation disposes it. Non-blocking.

## Coverage (blocking findings → resolution/verification)

- **F1** — resolved by the planner choosing the identity guard as the settle-phase mechanism and
  deferring/relabelling the settle-phase null-writes; verified by: (a) §9 G1/G2 mutation columns no longer
  claim "omit the null" reddens; (b) §4b ledger no longer rows the retired-null record as a consumed field;
  (c) §4.15/§4/U4/§1-DecisionLog-row corrected; (d) the identity-guard cells (G1/G2/G3) redden on removing
  the `cur === session` check, observable on the successor's real DOM (transform / `browse.render` /
  `applyScreen` / navStack) — the non-vacuous half that survives.
- **F2** — resolved by specifying the `finishing` clear and the recovery-entry predicate on the pane-less
  supersession path; verified by a new coverage cell proving a subsequent gesture engages after a pane-less
  supersession whose successor does not arm (template: `swipe-invariants.test.js:623-646`).

## Prediction

Built as written, the crack opens in two places the plan does not foresee. First, the coverage audit
(Mendeleev) finds the "omit the null-on-retire" mutation UNCAUGHT because the `cur === session` check already
absorbs every pane-less stale callback — the settle-phase null-writes are dead in this window, and the
campaign stalls on the identical vacuous-cell class that killed 6b, one layer over. Second, the first
double-tap during a settle where the second touch does not arm wedges swipe permanently: A's finalize never
runs, nothing clears `finishing`, and app.js:352 rejects everything thereafter — the same wedge the throw
test (`:623`) already exists to prevent, re-entered through the new supersession door the plan opened but did
not close behind it. Both are visible now to anyone who traces where `session` and `finishing` actually stand
at the moment a superseded callback fires.

```json
{"persona":"charpy","stage":"6c","round":1,"input_artifact":"90af572","verdict":"TEMPER","blocking_ids":["F1","F2"],"return_to":"vitruvius"}
```
