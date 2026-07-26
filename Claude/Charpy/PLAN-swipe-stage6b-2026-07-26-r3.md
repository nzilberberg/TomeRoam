# Charpy casebook — PLAN-swipe-stage6b, round 3

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: `d9e869d` (HEAD, "Revise Stage-6b plan per Charpy r2 TEMPER (F5) — recast onto real queue
channel + honest shrink"). Plan: `Claude/Plans/PLAN-swipe-stage6b.md`. Reviewed against HEAD `js/app.js`,
`test/app-harness.js`, `test/swipe-invariants.test.js`, `Claude/Subsystems/swipe-reveal.md`,
`Claude/Decisions/DecisionLog.md`. Prior rounds: r1 (TEMPER, F1/F2 vacuous DOM cells), r2 (TEMPER, F5
unbuildable field-inspection/spy layer).

## Applicability

Project adapter `tomeroam-js-dom`. One line per pattern (re-verified against the shrunk plan):
- **defining_records: true** — records reconciled below; `test/app-harness.js` is now a defining record (§1).
- **boundary_relocation: false** — no code moves; in-place cancel addition inside `js/app.js` `settle()`.
- **callee_replacement: false** — no indirection replaces a direct call; `finalize`/`drop` already exist.
- **contract_shape: false** — session `d` is exempt mutable lifecycle state (subsystem §3/§18); no closed schema moves.

## Verdict

**FORGE.** The observability crux that killed rounds 1 and 2 is genuinely resolved. Vitruvius took path 2:
the slice shrank to the RELEASE half — store `cur.settleTimer`/`cur.revealFrames`/`cur.revealTimer` on the
session and cancel each loser at its resolver — and the Coverage Model's load-bearing cells now assert on
the **real fake-scheduler queue counts** (`h.clock.pending()` = `tq.length`; `h.raf.pending()` =
`rafQ.length`), which the harness genuinely exposes. A mis-cancelled or omitted loser leaves the queue
observably pending, and the `done`/`dropped` guards do not re-absorb it — the guard governs whether a late
fire runs, not whether the entry sits in the queue. The shrink is honest: the three cancelled handles are
real pending continuations today, the slice ships as a standalone I14 resource-release, and the deferred set
(the null-writes, the `transitionListener` ownership/removal, the per-handle-liveness accessor) is genuinely
consumer-deferred to the I12 stage, with no obligation this release-half secretly needs. No dead field is
added (each stored handle's cancel is its current-slice consumer, §4.15). One Weak tightening remains (F6,
non-blocking): the RR cell must be split into two fixtures to redden both reveal-handle cancels — flagged
for Curie, not a crack, because the cell's behavior and mutation columns already name both handles.

## Defining records

**AGREE.** No two records disagree on required behavior; they disagree only on Stage 6's total size and on
how much of the "Owed to stage 6" debt is testable in isolation. The plan bounds 6b to the observable
release (cancel the loser handles) and defers the null-bookkeeping half to its I12 consumer — a planning
decision grounded in the tooling's observability limit (Engineering Contract §2 precedence 3: the verified
harness governs what is testable), not a conflict resolution. §1's authority table is accurate against
source, including the new `test/app-harness.js` row (773/800 queue accessors; app.js:245 accessor limits).

## What r2 asked, and what the revision achieved (the crux)

**The queue channel is real and the mutations reach it — verified against `test/app-harness.js` at HEAD:**

- `h.clock.pending()` returns `tq.length` (harness line 773); `fakeSetTimeout` pushes to `tq` (347-351),
  `fakeClearTimeout` splices from it (352-355). `h.raf.pending()` returns `rafQ.length` (line 800); under
  `deferRaf`, `raf` pushes to `rafQ` (239), `cancelRaf` splices from it (241). Both counts are exposed.
- **DF reddens.** The 340ms fallback (`setTimeout(finalize, 340)`, app.js:1160) sits in `tq` after
  `settle()`. The fixture dispatches `transitionend` on the anchor *before* advancing the clock, so finalize
  runs via the listener while the 340ms is still pending. Correct: `clearTimeout(cur.settleTimer)` splices
  it from `tq` → `h.clock.pending()` drops by one. Mutation (omit the clear, or clear the wrong handle): the
  340ms stays in `tq` → `h.clock.pending()` is one higher. The `done` guard is irrelevant to the queue
  count — it only silences a later fire. NOT re-absorbed. Reddens on a real surface.
- **RR reddens (per handle, in its own fixture).** Under `deferRaf`+`fakeTimers`, the reveal double-rAF
  outer frame (app.js:794) sits in `rafQ` and the 600ms safety-net (app.js:795) sits in `tq`. A winning
  `drop` splices its pending losers. Mutation (omit/wrong cancel) leaves a loser in `rafQ`/`tq`, observable
  via `h.raf.pending()`/`h.clock.pending()`. The `dropped` guard does not touch the queue. Reddens — with
  the fixture caveat in F6.

The r2 unbuildable "field inspection / ownership spy" is gone from the load-bearing cells; SF/EP are removed;
the null-writes and `transitionListener` removal (which had no observable surface) are deferred. The exact
failure class of r1/r2 is closed.

**Honest-shrink checks (all pass):**
- The three cancelled handles are real pending continuations; cancelling a loser is a genuine I14 release
  (it leaves the scheduler queue ~340ms/600ms/one-frame before it would have fired a guarded no-op). 6b
  stands alone and ships safely — the resolvers cancel real losers today.
- Deferred set is consumer-deferred, not secretly needed: the null-writes' only reader is the I12
  retirement-check (§3 "Why the null-write is NOT in this slice"); the `transitionListener` staying bound
  and firing a `done`-guarded no-op is today's parity (§2), and the release-half does not depend on removing
  it; the liveness accessor is scoped WITH the I12 stage that gives it a real consumer. §4.15 is satisfied
  in both directions — the stored fields are live (the cancel reads them) and no null bookkeeping is written.
- No new contradiction: §2/§3/§5/§7 are internally consistent — no continuation reads its handle, the null
  and the listener are explicitly deferred, the endpoint is parity (RGend). `clearTimeout` on a fired id is
  a harmless no-op in both the harness (findIndex→-1) and a real browser (§2, verified).

**Machine blocks + regressions:**
- `blocking_questions` is `["DF","RR"]`; the `vitruvius-coverage` block lists DF/RR + RGcancel/RG13/RGH/
  RGT/RGend, matching the §9 prose table. Consistent.
- RGcancel/RG13/RGH/RGT/RGend pin the shipped tests `:598`/`:220`/`:569`/`:623`/`:588` — all five exist and
  are in the gate's `affected_contracts`. RGend (new) correctly re-pins the endpoint parity (`session===null`)
  that the removed EP cell used to claim, onto the existing `:588`.
- F3 (§21 scrub) is retained and re-homed in §10 (the release half closes the debt; the null half moves to
  the I12 stage).

## Findings

### F6 — [Weak] (recommendation) — RR needs two fixtures, one per reveal handle; a single-gate fixture leaves one cancel vacuous
Nature: **recommendation**. Non-blocking.

The RR cell's behavior column names both reveal cancels ("`cur.revealFrames` leaves the rAF queue AND
`cur.revealTimer` leaves the clock queue"), but its fixture column says "let ONE gate win the drop." No
single reveal state leaves both handles pending at the drop, verified against `holdGhostUntilPaintable`
(app.js:746-795):

- A **gate-driven** drop requires `painted === true`, which means the double-rAF (app.js:794) has already
  fired — so `cur.revealFrames` is NOT pending at any decode/paint-driven drop. In that fixture the only
  pending loser is `cur.revealTimer` (the 600ms, in `tq`); omitting `cancelAnimationFrame(cur.revealFrames)`
  is a no-op on an already-fired frame and does NOT redden `h.raf.pending()`.
- A **timeout-driven** drop (`drop('timeout')`, app.js:795) fires while the double-rAF is still queued — so
  `cur.revealFrames` IS the pending loser (in `rafQ`), and `cur.revealTimer` has already fired.

So the two cancels are reddenable only in different fixtures. As written, a Curie who takes "one gate win"
literally and picks the common paint-wins held reveal would leave the `revealFrames` cancel untested — a
vacuous cell on one of the slice's three load-bearing cancels, the exact class rounds 1-2 hunted. This does
NOT block: the cell's behavior and mutation columns both cite the rAF queue (= `revealFrames`), which
obligates the timeout fixture, and fixture derivation is Curie's craft. Recommendation: make RR two rows (or
one row naming two fixtures) — (a) a paint/decode-driven drop reddening the `revealTimer` clear via
`h.clock.pending()`, and (b) a timeout-driven drop reddening the `revealFrames` cancel via
`h.raf.pending()` — so neither reveal cancel is left to a fixture where it has already fired. Curie should
treat this as binding when deriving the suite.

## Coverage

- **F6 (Weak, recommendation)** — non-blocking; no verification owed of the plan. Verified against
  `js/app.js:746-795` (`holdGhostUntilPaintable` gate structure: `painted` requires the double-rAF to have
  fired, so `revealFrames` pends only on a timeout-driven drop) and `test/app-harness.js:239-241`/`:806-810`
  (`rafQ` splice + `h.raf.frame()`). Resolution is a fixture-enumeration tightening for Curie; the cell
  already names both handles in its behavior and mutation columns.

Blocking cells verified reddening on a real surface (no coverage owed back to the plan): DF via
`h.clock.pending()`; RR via `h.raf.pending()`/`h.clock.pending()` (with F6's two-fixture split). Regressions
RGcancel/RG13/RGH/RGT/RGend pin `:598`/`:220`/`:569`/`:623`/`:588`.

## Prediction — where this breaks in execution if built as written

The build (the three loser-cancels) is correct and ships as a clean I14 release. The one place execution
could under-deliver is the red suite: if Curie writes a single RR fixture (the natural paint-wins held
reveal), the `revealFrames` cancel is exercised only in a state where the frame has already fired, so a
broken or omitted `cancelAnimationFrame(cur.revealFrames)` stays green until the mutation sweep flags it
UNCAUGHT or Mendeleev audits the reveal dimension. F6 closes that by forcing the timeout-driven fixture up
front. Everything else is sound: the DF fixture reddens by construction, the deferred null/listener work is
correctly parked with its I12 consumer, and the Loki strike on the misattribution promise (cell DF/RR,
§4.10 wrong-owner) now has a real queue surface a counterexample can pin — cancel the wrong `cur`'s handle
and the loser sits in the queue for the strike to read.

---

{"persona":"charpy","stage":"6b","round":3,"input_artifact":"d9e869d","verdict":"FORGE","blocking_ids":[],"return_to":"none"}
