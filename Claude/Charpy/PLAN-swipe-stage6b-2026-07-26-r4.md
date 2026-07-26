# Charpy casebook — PLAN-swipe-stage6b, round 4

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: `a781196` (HEAD, "Revise Stage-6b plan per Loki KILL — two-id reveal-frame handle").
Plan: `Claude/Plans/PLAN-swipe-stage6b.md`. Strike that drove the revision:
`Claude/Loki/STRIKE-swipe-stage6b-retire-loser.md` (KILL, promise `retire-correct-loser`, against
commit f83c4a5). Reviewed against HEAD `js/app.js`, `test/app-harness.js`, `test/swipe-invariants.test.js`,
`Claude/Subsystems/swipe-reveal.md`. Prior rounds: r1 (TEMPER F1/F2), r2 (TEMPER F5), r3 (FORGE, non-blocking F6).

## Applicability

Project adapter `tomeroam-js-dom`. One line per pattern (re-verified against the revised plan):
- **defining_records: true** — records reconciled below; `test/app-harness.js` is a defining record (§1).
- **boundary_relocation: false** — no code moves; in-place cancel addition inside `js/app.js` `settle()`.
- **callee_replacement: false** — no indirection replaces a direct call; `finalize`/`drop` already exist.
- **contract_shape: false** — session `d` is exempt mutable lifecycle state (subsystem §3/§18); no closed schema moves.

## Verdict

**FORGE.** The Loki KILL — a leaked inner paint frame in the half-fired, timeout-driven reveal
interleaving that a single-outer-id handle could not express — is genuinely closed by the two-id re-store
construction, and the correction propagated cleanly through every section that touched the reveal-frame
model. The RR coverage cell now enumerates the half-fired state as a named interleaving with a reddening
mutation ("store only the outer id — the killed design") that leaves the inner frame pending on the rAF
queue. The deferred I12 null-bookkeeping premise is repaired by the same model. DF is untouched, the RG*
regressions are intact, the machine blocks match the prose, and no new contradiction was introduced. My own
r3 F6 (the binary revealFrames/revealTimer fixture split) is now subsumed and completed by the
three-interleaving RR specification.

## Defining records

**AGREE.** Unchanged in authority from r3 and undisturbed by the correction. The `js/app.js`
`holdGhostUntilPaintable` record row (§1) is updated to state the truth the strike surfaced — the paint gate
is a DOUBLE `rAF` on one line (794), two scheduler entries of which at most one is pending — and the "This
plan" column now describes the re-store construction. §1's authority table remains accurate against source.

## What r3/Loki left open, and what the correction achieved (the crux)

**The two-id construction makes `cur.revealFrames` name the currently-pending frame in all three
interleavings — verified by tracing §2 against `js/app.js:794` and the harness `deferRaf` model:**

The construction (§2): `cur.revealFrames = requestAnimationFrame(() => { cur.revealFrames =
requestAnimationFrame(() => { painted = true; gate('paint'); }); })`. The inner id is scheduled and stored
in one synchronous statement inside the outer callback, so `drop` (which runs on the main thread, never
mid-statement) always reads either the outer id (outer not yet fired) or the inner id (outer fired) — never
a stale outer id while the inner is pending.

- **(a) outer pending** (timeout wins, no frame fired): `cur.revealFrames` = outer id; `drop`'s single
  `cancelAnimationFrame` removes the outer from `rafQ`. No leak. (Matches the strike's RUN A control.)
- **(b) half-fired** (outer fired → re-stored inner; inner pending; timeout wins — the KILLED state):
  `cur.revealFrames` = inner id; the single cancel removes the inner from `rafQ`. **No leak.** This is
  exactly the strike's RUN B, where the single-outer-id design cancelled the spent outer (id 2) and left the
  inner (id 3) pending; under the re-store, `cur.revealFrames` holds id 3 at `drop`, so the cancel removes
  it and `h.raf.pending()` returns to the covered-case value. The kill is closed at the field model — the
  precise locus the strike's §5 blast radius named.
- **(c) gate wins** (both frames fired, `painted===true` → `drop('paint')`): `cur.revealFrames` = inner id
  (spent); the cancel is a no-op; nothing is pending. Correct.

No third frame exists (the inner callback neither schedules nor re-stores), and a superseded session is
pre-`settle()` so it never reaches `holdGhost` — so `cur.revealFrames` is never overwritten after `drop`,
and never written on a stale `cur`. The construction is airtight across the interleaving set.

**§9 RR cell — non-vacuous across all three interleavings.** The cell now names (a)/(b)/(c) explicitly and
its mutation column carries a reddening mutation for each: "store only the OUTER frame id (the killed
single-id design)" reddens (b) — the cancel hits the spent outer and the inner stays pending in `rafQ`,
observable via `h.raf.pending()`; "omit a cancel" reddens (a) (outer stays pending) and (c) (revealTimer
stays in `tq`, observable via `h.clock.pending()`); "cancel the wrong handle" is the misattribution axis.
Every load-bearing reveal cancel now has a fixture in which its omission reddens on a real queue. This
completes my r3 F6 (which split RR into two fixtures but, like the review's whole interleaving set, never
fired the outer frame before the timeout — the half-fired state the strike found; §7 of the strike
reconciles this honestly, and it is a genuine miss of the prior review, not a scope choice).

**§11 — the deferred I12 null-bookkeeping is correct on the two-id model.** Because `cur.revealFrames`
always names the one currently-pending reveal frame and `drop` cancels that frame, a future null at the
resolver truthfully records "no live reveal frame," with no second id dangling. §11 states this and
correctly notes that a single-outer-id design would have made the null false in the half-fired state (inner
pending while the field reads null) — which is why the KILL had to be fixed in the field model now, not
deferred. The strike's blast-radius item 4 (I12 inherits a false premise) is repaired.

**Clean propagation + no new contradiction.** The two-entry model is stated consistently in §1 (record
row), §2 (handle bullet + release rule), §3 (items 2-3, with the honest "holds ONLY because…" scoping and
the mechanism labelled a recommendation per D3), §4 (ledger note), §5 (cancellation bullet), §6 (create:
outer callback re-creates), and §8 (composition dimension). No section still describes a single-outer-id
handle. §3 item 3 correctly bounds the by-construction claim to the condition that makes it true.

**DF and the regressions are intact.** DF is a single `setTimeout` with no half-fired state (the strike's §6
confirms it found no fracture there); its cell and fixture are unchanged from r3 and redden via
`h.clock.pending()`. RGcancel/RG13/RGH/RGT/RGend pin `:598`/`:220`/`:569`/`:623`/`:588`, all in the gate's
`affected_contracts`; the re-store is a pure assignment inside the outer callback and does not alter the
paint-gate timing, the drop effect, or the ownership/`finishing`/`sessionDone` sequencing, so the held-reveal
and throw-path parity (RGH/RGT) is preserved. `blocking_questions` is `["DF","RR"]`; the `vitruvius-coverage`
block lists DF/RR + the five RG* rows, matching the §9 table.

## Findings

No blocking finding. The correction is complete and internally consistent, and the RR interleaving set now
covers the reveal-frame cancel in the outer-pending, half-fired, and gate-win states. One non-blocking
finding is filed to carry the load-bearing fixture constraint forward to the test author.

### F7 — [Note] (recommendation) — RR(b) is the load-bearing red test; it must fire exactly one rAF frame before the timeout drop
Nature: **recommendation**. Non-blocking; a build/test-authoring constraint, not a plan defect.

The half-fired interleaving RR(b) is the only fixture that exercises the Loki-KILL fix: it must fire exactly
one `h.raf.frame()` (running the outer reveal frame, which re-stores the inner id and schedules the inner)
and then advance the clock past 600ms so the timeout drives the `drop` while the inner paint frame is still
pending. Firing two frames collapses (b) into the gate-win case (c) — `painted` becomes true, a gate drives
the drop, and the inner has already fired — so the "store only the outer id" mutation would not redden. This
is Curie's to encode; the §9 RR cell now specifies it, and this note ensures it is not lost: RR(b) with a
two-frame fixture is a vacuous test for the exact defect this round exists to close.

## Coverage

No blocking findings; no coverage owed back to the plan. The blocking cells are verified reddening on a real
surface: DF via `h.clock.pending()`; RR via `h.raf.pending()`/`h.clock.pending()` across interleavings
(a)/(b)/(c), with the half-fired (b) reddening on the "store only the outer id" mutation. Regressions
RGcancel/RG13/RGH/RGT/RGend pin `:598`/`:220`/`:569`/`:623`/`:588`.

## Prediction — where a fresh strike or the build should look

The reveal-frame handle model is now sound across the interleavings a plan review can enumerate by reading.
A fresh Loki strike on the materially-revised reveal promise should probe the seams a static read cannot
fully settle: (1) whether the re-store assignment order (`cur.revealFrames = requestAnimationFrame(inner)`)
is preserved verbatim by the builder — reversing it (schedule, discard, then no store) would reintroduce the
killed state, which RR(b) is designed to catch; (2) whether any path other than the outer callback writes
`cur.revealFrames` between schedule and drop (none exists in the plan, but the build must not add one); (3)
the DF anchor-dispatch fixture actually reaching `finalize` via the `{once:true}` listener before the 340ms.
For the build: RR(b) is the load-bearing red test — it must fire exactly one `h.raf.frame()` (outer only)
before advancing past 600ms, so the inner is pending at the timeout drop; a fixture that fires two frames
collapses into the gate-win case and would not exercise the fix. That is Curie's to encode, and the cell now
specifies it.

---

{"persona":"charpy","stage":"6b","round":4,"input_artifact":"a781196","verdict":"FORGE","blocking_ids":[],"return_to":"none"}
