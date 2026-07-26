# Charpy casebook — PLAN-swipe-stage6b, round 1

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: `dd0d3a6` (HEAD, "File Stage-6b plan (Vitruvius) + campaign completion manifest").
Plan under review: `Claude/Plans/PLAN-swipe-stage6b.md`. Reviewed against HEAD `js/app.js`,
`test/swipe-invariants.test.js`, `Claude/Subsystems/swipe-reveal.md`, `Claude/Decisions/DecisionLog.md`.

## Applicability

Project adapter `tomeroam-js-dom`. One line per pattern:
- **defining_records: true** — four records materially define the slice (DecisionLog "Owed to stage 6",
  subsystem §8/§10/§11, PLAN-swipe-reveal §3.2/I13/I14, the .223/.226 dispositions). Reconciled below.
- **boundary_relocation: false** — verified against the plan and code: no code moves across a module
  boundary. Every change is an in-place addition inside `js/app.js` `settle()`; `js/swipe.js` is untouched.
  No ledger/source-range obligation.
- **callee_replacement: false** — verified: no indirection layer replaces a direct call. `finalize`/`drop`
  already exist; the slice stores existing timer/listener/frame handles and retires them at those resolvers.
  No new dispatch layer, no callee range.
- **contract_shape: false** — verified: the gesture session `d` is exempt mutable lifecycle state
  (subsystem §3/§18), not a registered `classifyTransition`/`buildConstruction` exact-key contract; the
  four fields are already named in PLAN-swipe-reveal §3.2 and this slice realizes them. No closed schema moves.

## Verdict

**TEMPER.** The underlying work is sound and correctly sequenced: session-own the four bare
timer/listener/frame handles, cancel/remove each pending loser at exactly one phase resolver, and null the
stored slot so the session object truthfully names live ownership — a real, correctly-sequenced foundation
for the deferred I12 enforcement (§11). The line citations are accurate, the records genuinely AGREE, the
flash class is correctly kept out, and the six deferrals are genuinely separable. **The crack is in the
Coverage Model, not the build.** The slice's observable behavior is fully parity — every late continuation
is already neutralized by the shipped `done`/`dropped` exactly-once guards and the shipped
`cancelAnimationFrame(cur.settleFrame)` — yet cells SS, DF, and RR are framed as DOM-observable
stale-fire/dual-fire defenses with reddening mutations. Those mutations are absorbed by the shipped guards,
and the five continuations never read their own handles, so the cells as written cannot redden. The
retirement's only honest, reddening coverage is ownership-level (the shape the plan already uses correctly
in SF and EP). SS is outright bare on the load-bearing stale-fire promise. A feature plan whose central
race cell has no reddening mutation does not pass temper; the fixes are concrete and local.

## Defining records

**AGREE.** No two records disagree on required behavior. The DecisionLog "Owed to stage 6" entry
(2026-07-21, lines 319-323) and subsystem §8 govern that the timer/listener handle-nulling is Stage-6
resource-ownership debt; PLAN-swipe-reveal §3.2/I13/I14 govern the target session shape and the invariants.
They disagree only on Stage 6's TOTAL size, which the plan bounds to the async-handle-ownership foundation —
a planning decision grounded in the recorded dependency, not a conflict resolution. The plan's §1 authority
table reproduces each record's wording accurately (verified against source).

**Material note carried into F1:** the ledger entry itself defines the debt's purpose as making "the session
object describe LIVE ownership rather than stale numeric handles" — a truthfulness/bookkeeping property, not
a stale-write defense. The plan's §3 "Why parity" is aligned with this; its §9 Coverage Model is not (F1).

## Findings

### F1 — [Structural] (defect) — Cell SS is a bare cell: the stale-write defense is the shipped settleFrame cancel, not the null-on-retire
Severity: **Structural**. Nature: **defect**.

The load-bearing stale-fire promise (§3 item 3; §9 cell SS): "a continuation firing after its session
finalized finds its handle null and writes nothing — no transform on a borrowed-real element," with the
mutation "omit the null-on-retire → the resumed rAF ... writes a stale `translateX` onto the real view."

This mutation cannot redden any test, for two independently sufficient reasons verified against HEAD:

1. **The continuation does not read the handle.** The settle rAF callback (`js/app.js:551-553`) writes
   `m.el.style.transform` unconditionally; it never consults `cur.settleFrame`. Nulling the slot changes
   nothing about whether the callback writes. §3 item 3's "finds its stored handle already null" presupposes
   a read the code does not perform — and §5 explicitly forbids adding one ("the continuations' effects ...
   are unchanged"). That is an internal contradiction: SS requires the continuation to consult its handle;
   §2/§5 require it not to.
2. **The stale write is already prevented by the shipped cancel.** `finalize` always runs
   `cancelAnimationFrame(cur.settleFrame)` (`js/app.js:1146`, shipped .226). Test
   `test/swipe-invariants.test.js:598` ("1a — a cancelled settle rAF cannot re-shift the real #browse after
   finalize") is a passing regression proving exactly SS's DOM assertion via that cancel, using the .226
   hidden-tab recipe (`deferRaf` + `h.clock.advance(400)` + `h.raf.frame()`). Omitting the null-on-retire
   leaves the cancel intact, so `:598` stays green — the resumed rAF is never fired. The harness honors
   `cancelAnimationFrame` (if it did not, `:598` would fail today, since 551-553 writes unconditionally).

So SS's "does NO stale write" property belongs to the cancel (already covered by `:598`, and applicable
only to `settleFrame`), while its "session names no live handle" property belongs to the null (covered by
the field-inspection cell EP). SS conflates the two and reddens on neither.

Fix (invariant, not prescription): do not attribute a DOM-observable stale-write to the null-on-retire.
Split the promise — keep the cancel's no-stale-DOM-write property as a regression cell (`:598`, settleFrame
only), and express the null's property as a field-inspection ownership assertion (as SF/EP already do). State
honestly that the null-on-retire's behavioral consumer this slice is the EP field assertion, and its
production consumer is the deferred I12 retirement-check (§11) — the field is live because the cancel reads
it, but the null-write's purpose is truthfulness, not a stale-write defense.

### F2 — [Structural] (defect) — Cells DF and RR name behavioral mutations the shipped exactly-once guards absorb; recast as ownership assertions
Severity: **Structural**. Nature: **defect**.

Same class as F1, on the four newly-owned handles. `finalize` is `done`-guarded (`js/app.js:1143`) and
`drop` is `dropped`-guarded (`js/app.js:751`); neither reads its handles, and every late continuation
(the 340ms `setTimeout`, the still-bound `{once:true}` transitionend listener, the reveal double-rAF, the
600ms safety-net) funnels into one of those two guarded resolvers. A surviving loser that fires late
re-enters the resolver and is returned immediately by the guard — no re-entry, no observable effect.
Therefore:

- DF's mutations — "retire the WINNER's handle instead of the loser's (... a late fire re-enters)" and "null
  before cancel (`clearTimeout(null)` leaks, the 340ms fires again)" — do not redden a DOM-observable
  assertion: the late fire hits `if (done) return`. DF's "finalize body runs exactly once" IS reddening, but
  via the `done` guard (already covered by RG13 / `:220`, whose mutation is "retirement removes the `done`
  guard"), not via handle retirement.
- RR's mutation — "don't clear the 600ms timer ... a re-entrant drop is only flag-guarded" — is likewise
  absorbed by `dropped`. "The pane drops exactly once" is the `dropped` guard's property, not the handle's.

The retirement of the four handles is genuine resource-ownership hygiene, and its honest reddening coverage
is ownership-level, not DOM-level: spy that `clearTimeout`/`removeEventListener`/`cancelAnimationFrame` is
invoked on the *correct loser* (misattribution mutation per §4.10 — "wrong owner ID rather than no owner
ID"), and assert via field inspection that the completed session names no live handle. The plan already uses
this correct shape in **SF** (`cur.settleFrame` reads null; mutation "leave settleFrame set") and **EP**
(every handle on `cur` retired/null; mutation "retire only some phase handles"). DF and RR must follow SF/EP:
relabel their assertion layer as ownership spy/field-inspection with misattribution/wrong-owner mutations,
not "wiring (intermediate-state)" with DOM outcomes the guards render invariant. As written they direct the
test author toward DOM-observable tests that pass regardless of the mutation — the project's own
"vacuously-green harness" scar.

### F3 — [Weak] (defect) — §10 scrub enumeration omits subsystem §21, which references the debt this slice closes
Severity: **Weak**. Nature: **defect**.

`Claude/Subsystems/swipe-reveal.md` §21 (line 100) lists among current policy-ledger references "the stage-6
cleanup debt (null the timer/listener handles)." §10's scrub checklist covers subsystem §8, §10/§11, §19,
§23 but not §21. When 6b closes the debt, §21's reference goes stale in HEAD (StandardsDocument §6.6 —
exhaustive on the first pass). Add §21 to §10's checklist: strike or update the "stage-6 cleanup debt"
reference to current truth.

### F4 — [Note] (recommendation) — EP's "names no live handle" is correctly bounded; keep it bounded through the reveal path
Severity: **Note**. Nature: **recommendation**.

The `fadePanes` per-pane removal `setTimeout` (`js/app.js:649`) is a live, un-owned async operation the
session spawns from `drop()` at 781, before `sessionDone(cur)` at 785. The plan correctly defers it (§11:
self-guarded owned-decoration; belongs with the pane-lifecycle abstraction). No change is needed. Recorded
only so the EP cell's assertion is written as "every handle that WAS on `cur` is retired/null" (its current
wording), never as "the session has spawned no pending async" — the latter would be false while a fadePanes
timer is pending, and would make EP falsely red.

## Coverage

Every blocking finding maps to its verification:

- **F1 (Structural)** — verified against `js/app.js:551-553` (continuation writes transform without reading
  `cur.settleFrame`), `js/app.js:1146` (finalize always cancels the settle rAF, shipped .226), and
  `test/swipe-invariants.test.js:598` (passing regression proving the DOM property via the cancel). The SS
  mutation "omit the null-on-retire" leaves `:598` green → non-reddening → bare cell. Resolution: split
  SS into the cancel's regression property and the null's field-inspection property (SF/EP shape).
- **F2 (Structural)** — verified against `js/app.js:1143` (`done` guard), `:751` (`dropped` guard), and the
  five continuations' bodies (none reads its handle). DF/RR DOM mutations are absorbed by the guards →
  non-reddening at the DOM layer. Resolution: recast DF/RR as ownership spy/field-inspection cells with
  misattribution mutations, matching SF/EP.
- **F3 (Weak)** — verified against `Claude/Subsystems/swipe-reveal.md:100` (§21 names the debt) versus §10's
  checklist (omits §21). Resolution: add §21 to §10.
- **F4 (Note)** — no runtime surface: a wording recommendation for the EP cell, owing no test of its own;
  verified against `js/app.js:649` (un-owned fadePanes timer) and `:781`/`:785` (spawned before `sessionDone`).

## Prediction — where this breaks in execution if built as written

The test author (Curie) will derive the red suite from §9. SF and EP will produce genuine, reddening
field-inspection tests. But SS, DF, and RR — as worded, "wiring" cells with DOM-observable assertions — will
produce tests that drive the real gesture, assert on `#browse`/`#home` transforms or "the pane drops once,"
and pass *whether or not the null-on-retire and the four new cancels are present*, because the shipped
`done`/`dropped` guards and the shipped settleFrame cancel already hold those DOM outcomes. The suite goes
green, the mutation sweep shows the SS/DF/RR anchors UNCAUGHT, and the reviewer discovers the slice's actual
subject — resource ownership — was never tested behaviorally, only its parity was. The failure is exactly
the project's recorded "vacuously-green harness" scar, arriving one layer downstream because the Coverage
Model pointed the author at a DOM property the shipped guards make invariant. Loki, handed the §3 promise,
would find held-stone on the DOM axis (no fracture — the cancel/guards defend it) while the ownership axis
that actually matters carries no attack surface. Recasting SS/DF/RR to SF/EP's ownership shape closes all of
this before a line is written.

---

{"persona":"charpy","stage":"6b","round":1,"input_artifact":"dd0d3a6","verdict":"TEMPER","blocking_ids":["F1","F2"],"return_to":"vitruvius"}
