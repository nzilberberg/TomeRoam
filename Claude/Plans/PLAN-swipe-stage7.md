# PLAN — swipe/reveal Stage 7: replace the Browse hold calls with the lease interface

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor",
  "patterns":{"boundary_relocation":false,"callee_replacement":true,"contract_shape":true,"state_transfer":true,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/app.js:346-374","js/app.js:424-428","js/app.js:499-500","js/app.js:1033-1037","js/app.js:1087-1097","js/browse.js:117-140","js/browse.js:242-248","js/browse.js:960-968"],
  "callee_ranges":["js/browse.js:159-223"],
  "affected_contracts":["js/browse.js:964","js/app.js:349","js/app.js:373","test/app-harness.js:593","test/app-harness.js:597","tools/mutate.mjs:1","Claude/Subsystems/swipe-reveal.md:41","Claude/Decisions/PolicyLedger.mjs:1"],
  "staged_records":["Claude/Plans/PLAN-swipe-reveal.md","Claude/Subsystems/swipe-reveal.md","Claude/Zelda/Board.md","Claude/Decisions/DecisionLog.md","Claude/Campaigns/swipe-stage7.json"],
  "blocking_questions":["LEASEPAIRED","LEASEINVALID","LEASEORDER","MOVERFROZEN"]} -->

Status: **TEMPER APPLIED (round 2) — NO ROUND 3 IS OWED; next seat is the adversary, for §17 step 2
(U1).** Nothing here is cleared to build.
`Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r2.md` (`c2369f8`), verdict TEMPER, over round 1's
`Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r1.md` (`5c2c065`). The reviewer waived round 3 on the
condition that the amendment stay confined to its three edits, and it did.
⚠️ **COORDINATES RE-MEASURED AT `29c4978` — see §18.** The settle-window nav-stack slice
(`PLAN-swipe-navstack-settle-window.md`, built across `8acbdff` and `9506f3a`) landed underneath this
plan and moved lines in `js/app.js` (3096 → 3112). Two of the five declared `source_ranges` moved and
the `vitruvius-gate` block is corrected in place; the shift is **not uniform** (0 / 0 / 0 / +11 / +16,
from two separate expansion hunks). §18 carries every re-derived coordinate, each located by matching
the construct in current source rather than by adding an offset, plus what the slice made stale beyond
coordinates. **Line citations in §1–§17 are as measured at `c2369f8` and §18 supersedes them.**

Every measurement below was taken at `c2369f8` and re-checked against `8d0bc67`, which touches only
the board, a new board-row-id gate and its hook wiring — no source, no mutation registry, no
generated document — so every figure stands. Suite at `8d0bc67`: **900 tests / 899 pass / 0 fail /
1 skip** (count read, not inferred; it rose from 887 because that commit added a gate cell).

**What round 2 changed — three edits, each with its acceptance predicate EXECUTED and its measured
result recorded beside it.** F1 (Weak): §11's reader class (c) was one and is three — `ADAPTER_DECL`,
the `tools/gen-swipe-model.mjs` / `docs/swipe-model.generated.txt` pair that no gate watches, and
three current-truth comments; the eight live-reference test files are declared as a suite-caught
class; step 5b's `to`-side scan gains the session field; and the declared co-change figure is
**thirteen**, not the twelve that corresponds to leaving comments stale. F3a (Structural): §12's
claim that the three MOVERSHAPE re-anchoring candidates keep `Object.freeze(` on their `to` side was
false at HEAD — it is now stated as an OBLIGATION on the builder's edit with a fourth step-5b check
behind it, and the "verified" wording is gone. F3b (Structural): `MOVERFROZEN`'s `NATURAL-b` is now a
registry-side mutant, because measurement showed that no mutation of the predicate can redden the
cell — in the one-part form OR in the two-part form the review prescribed.

**What round 2 did NOT change, so a later session does not re-open it.** §3's scope determination and
its ten inheritance rows are settled — the reviewer re-derived all ten independently against HEAD at
round 1 and every one held; round 2 did not re-strike them. F2 is repaired and **no change was owed**:
the guarded `PBDebug.log` in `returnLease` is a real production consumer (`index.html:233` loads
`js/debug.js`), the harness captures it (`test/app-harness.js:632`), and `LEASEINVALID`'s trace clause
plus `NATURAL-d` are the proving test, so Engineering Contract §4.15 is satisfied on both halves.
**§14's U1 is untouched and remains an open unknown owned by the adversary** (§17 step 2); the plan
reviewer's round-1 walk of the exits is a reading and must not be treated as confirmatory.

**Round 1 for the record: what it broke was this plan's verification machinery, in three places.** The
scope determination was not among them — the plan reviewer re-derived all ten inheritance rows against
HEAD and every one held, so the deletion set did not move and §3 changed only by one re-categorisation
(F7). F1: §11's headline co-change set was measured from a transform NARROWER than §5 declares —
**re-measured control-first, and the full set is thirteen registrations in three classes plus three
non-registry readers, not one** (§11; the reader count is round 2's correction). F2: the release
status had no production consumer, because the trace it named does not exist at HEAD — **resolved by
scoping the trace line into this stage** (§5, §14 D1). F3: the gate R7 leaned on to catch a
half-landed §14 freeze is made **vacuous** by the same commit's mandatory re-anchoring — **a repair is
specified and R7's "no new mechanism is needed" is retracted** (§12, §13 `MOVERFROZEN`).

⚠️ **Do not read the plan gate's PASS as evidence of anything.** It runs for minutes on a plan this
size. It did fail-then-pass on this artifact — four structural findings on the first hook-mode run,
green after exactly those four were fixed — so on this artifact it demonstrated it can fire; but per
the persona's own honesty rule a passing gate is necessary and never sufficient, and the review seat
is the check that matters.

---

## Index

1. [What this plan is, and the one fact that changed its shape](#1-what-this-plan-is-and-the-one-fact-that-changed-its-shape)
2. [Defining records reconciled (U1)](#2-defining-records-reconciled-u1)
3. [The inherited deferral list, verified against current source](#3-the-inherited-deferral-list-verified-against-current-source)
4. [Applicability](#applicability)
5. [Exact scope boundary (U2)](#5-exact-scope-boundary-u2)
6. [The contract shape (U3)](#6-the-contract-shape-u3)
7. [Value and ownership ledger (U6)](#7-value-and-ownership-ledger-u6)
8. [Observable-effect ownership across the replaced callee (U7)](#8-observable-effect-ownership-across-the-replaced-callee-u7)
9. [Ordering and atomicity (U8)](#9-ordering-and-atomicity-u8)
10. [Ambient dependencies and lifecycle ownership (U9)](#10-ambient-dependencies-and-lifecycle-ownership-u9)
11. [Compatibility, migration and the MEASURED co-change list (U10)](#11-compatibility-migration-and-the-measured-co-change-list-u10)
12. [The §14 lifetime-invariant trigger — measured, not read](#12-the-14-lifetime-invariant-trigger--measured-not-read)
13. [Coverage Model](#13-coverage-model)
14. [Decisions taken at round 1, and the one open unknown that remains](#14-decisions-taken-at-round-1-and-the-one-open-unknown-that-remains)
15. [Risk registry](#15-risk-registry)
16. [What this does NOT do, each with its consumer named (U2 deferrals)](#16-what-this-does-not-do-each-with-its-consumer-named-u2-deferrals)
17. [Sequence, owners, exit condition and handoff](#17-sequence-owners-exit-condition-and-handoff)
18. [Coordinates re-measured at `29c4978`, and what moved beyond them](#18-coordinates-re-measured-at-29c4978-and-what-moved-beyond-them)

---

## 1. What this plan is, and the one fact that changed its shape

`PLAN-swipe-reveal.md` §7 stage 7 is one line: *"Replace Browse hold calls with the lease
interface."* Its substance was expected to come from the DEFERRED-to-7 clause at the end of stage 6's
entry — ten items, each said to be "behind the consumer that does not yet exist."

**That clause was written before 6f, 6g, 6h, 6i, before de-clone Stages 1 and 2, and before the
subtraction pass. It has now been checked against current source, item by item, and SIX of the ten
items have no subject in the tree, a seventh is already built, and an eighth is a defended refusal
rather than a live deferral.** §3 carries the table with a `file:line` for every determination. The
de-clone removed every owned pane, so the pane-lifecycle work that was the bulk of the clause —
`pane.release()`, the pane object, the `dispose(reason)` enum, pane-owning supersession, the
`.nav-ghost` production guard — has nothing left to be done to. Two further items (the two real-view
transform eliminations) had their PREMISE INVERTED: 6f's axis was *never transform the real in-flow
view*, and the ratified design at HEAD is that **every** transition moves its real element.
*(The count reads six rather than the first draft's seven because round 1 F7 separated
`sameBrowseHost` — a reasoned refusal with a live registered mutant — from the concepts that are
simply gone. Nothing about what stage 7 builds changed.)*

**So stage 7 is what its own one line always said it was, and nothing more: the Browse hold boundary.**
That is the whole subject. Three inherited items survive with live subjects and are deferred again
here, each with the stage that consumes it named (§16).

⛔ **The load-bearing negative in this plan was MEASURED, not read.** This campaign's record is eight
incomplete enumerations, every one found by executing. §12 records a positive control that fired and
the transform under test that did not, run against the real gate on the real file, tree restored and
verified clean afterwards. Every determination in §3 that rests on reading alone is labelled as such.

---

## 2. Defining records reconciled (U1)

| Record | Authority for | Verdict |
|---|---|---|
| `Claude/Plans/PLAN-swipe-reveal.md` §3.5, §5 I3/I14/I15, §7 stage 7 | the lease boundary's shape and its invariants | **CONFLICT.** §3.5's shape names `settledScrollY` and a `ready: Promise`. Both are stale — §6 resolves each against HEAD and records why. The stage-7 one-line charter itself AGREES. |
| `Claude/Plans/PLAN-swipe-reveal.md` §7 stage 6 DEFERRED-to-7 clause | what stage 7 inherits | **CONFLICT with source.** Seven of ten items have no subject at HEAD. §3 resolves it; the parent's stage-7 entry gains a one-line pointer here on approval. |
| `Claude/Plans/PLAN-swipe-declone.md` + `PLAN-swipe-declone-stage2-subtraction.md` | the current pane/mover model | **AGREE and SUPERSEDING.** No transition builds an owned pane; every mover is borrowed-real or the one owned decoration. This is what voids most of the clause. |
| `PLAN-swipe-declone-stage2-subtraction.md` §14 (mover-lifetime invariant) | whether a change owes the two-part freeze | **APPLIES.** §12 resolves it: the mechanical gate stays green (measured); §14's SECOND prose clause fires. |
| `Claude/EngineeringContract.md` §4.15, §4.18, §4.19, §4.21 | dead fields, release-vs-disposal, parity-vs-policy, narrow scope | **AGREE, and §4.15 + §4.21 are the binding constraints on this plan's shape** — they are why `ready` and `settledScrollY` are refused. |
| `Claude/Decisions/PolicyLedger.mjs` `PL-swipe-browse-fixed-ownscroll` | where the browse scroll offset lives | **AGREE, and it is what falsifies `settledScrollY`**: the scroller is each `.browsepage`, which owns its own `scrollTop` (Invariant D4), and `window.scrollY` is a constant 0 on the app views. |
| `Claude/Subsystems/swipe-reveal.md` | the subsystem addendum | **STALE — GAP.** It still describes `disposeOwnedPanes`, `holdGhostUntilPaintable`, `dropPanes` and the `translateZ(0)` home rule as current; none exists at HEAD. Scrubbed on approval (§11), per StandardsDocument §6.6. It is not an authority for this design. |

**Precedence.** Where the plan-of-record's §3.5 shape and current source disagree, **source wins and
the plan-of-record is amended**, because §3.5 was written against a pane-and-shared-scroller model
that two ratified plans have since replaced. Where the Engineering Contract and a convenience in
§3.5 disagree, the Contract wins.

---

## 3. The inherited deferral list, verified against current source

Five verdicts are used. **Still deferred** — subject alive, not built, deferred again with a consumer.
**Already built** — shipped and consumed at HEAD. **Unreachable** — the code exists but no path
reaches it. **Subject deleted** — the thing the item was about is not in the tree. **Guarded refusal**
— the field is deliberately not emitted, the refusal is reasoned in source, and a live registered
mutant reddens if it returns. *(The fifth verdict is round 1 F7: flattening a defended absence into
"subject deleted" loses the distinction a future plan would need.)*

**Every row below was re-derived independently by the plan reviewer at `79840d7`** — each cited line
read, each named subject swept for across `js/`, `css/`, `test/` and `tools/` — and every row held.
That is a second reading by a second seat, not an execution; it is worth what two readings are worth,
which is why the rows carry their own MEASURED evidence where a gate could supply it.

⚠️ Every row below is a **source reading** unless its Evidence cell says MEASURED. Reading is what has
been wrong eight times in this campaign; the rows most likely to be wrong are the ones that assert an
absence, and §12's method (apply the transform, run the gate, control first) is the one that settles
those cheaply when a build needs certainty.

| # | Deferred item | Verdict | Citation | Evidence |
|---|---|---|---|---|
| 1 | `F(release)` — the paint-gated `pane.release()` half (I10/I17 reveal centralization) | **Subject deleted** | `js/app.js:708` (`holdGhostUntilPaintable` — DELETED), `js/app.js:645` (`fadePanes`/`FADE_MS` — DELETED), `js/app.js:1012-1015` (no hold, no pane to drop; `cover.dropAt` set unconditionally), `js/swipe.js:181-192` (`constructionPlanFor` emits only `real-source`/`real-destination`) | reading + MEASURED (`no-view-clone-gate`, `retired-concepts-purge`, `swipe-construction` all green at HEAD, 50/50) |
| 2 | the rest of the finalization plan (`commit`/`abort-scroll`/`stackEffect`/`reveal` + the unified `planFor()` wrapper) | **SPLIT.** `reveal` and `paneRemovalPolicy`: subject deleted. `abort.render`: subject deleted. `commit.stackEffect`, `commit.screen`, `commit.scroll`, `abort.scroll`: **still deferred** — alive as inline decisions | deleted half: `js/swipe.js:18-23` (`finalizationPlanFor` retired with its `abortRender` decision); alive half: `js/app.js:702-706` (the three-branch stack effect), `js/app.js:1032` (commit screen + scroll), `js/app.js:1038-1039` (abort screen + scroll) | reading |
| 3 | `sourceHost` / `destinationHost` / `sameBrowseHost` host fields | `sourceHost`/`destinationHost`: **already built**. `sameBrowseHost`: **GUARDED REFUSAL** — *not* subject deleted (round 1 F7) | built: `js/swipe.js:111-114` (projection), `:129` (emitted), `:240`+`:251`+`:260` (consumed by `buildConstruction`), `js/app.js:511-513`+`:515-533` (the env branch selectors). refused: `js/swipe.js:86-91` records the reasoned refusal — its only planned consumer, the stage-6 abort re-render, was retired with the clone — and `tools/mutate.mjs:434-438` registers a **live** mutant that adds `sameBrowseHost: false` to the frozen classification so a re-introduction reddens a no-dead-fields gate | reading |
| 4 | the full pane object and the remaining `dispose(reason)` enum members | **Subject deleted** | `disposeOwnedPanes` occurs nowhere under `js/` (only in tombstone comments at `tools/mutate.mjs:555-564`, `test/swipe-stage5-residuals.test.js:92`); `paneRemovalPolicy` occurs nowhere in the repo; `js/swipe.js:174-181` — no transition builds an owned pane | reading + MEASURED (`NOOWNEDPANE` green) |
| 5 | PANE-OWNING supersession at the SETTLING/REVEALING phase (home↔browse, →home) | **Subject deleted** | `js/app.js:386-390` — "Every session is pane-less now that no transition constructs an owned pane… the stage-6c PANE-OWNING/PANE-LESS split this gate used to draw no longer has two sides" | reading |
| 6 | the `recoverSession` pre/post-stack matrix | **Still deferred** — subject alive | `recoverSession` occurs nowhere in the repo. The pre-stack recovery exists inline at `js/app.js:398-431`; there is **no** post-stack recovery — a throwing finalize leaves the stack mutated and only clears `finishing` (`js/app.js:1078-1081`) | reading |
| 7 | the I12 null-on-retire half | **Partially built** | built: `js/app.js:330` (`s.releaseListeners = null`). not built: `js/app.js:1055`, `:1060` — `settleFrame`/`settleTimer` are cancelled, never nulled; `js/app.js:1084` — the transitionend listener is `{once:true}` and is never recorded on the session, so there is no handle to retire. **The I12 INVARIANT itself is enforced and unconditional** (`js/app.js:616`, `:1070` — `cur !== session`) | reading |
| 8 | a production guard for "every connected `.nav-ghost` is an owned-pane mover" | **Subject deleted** | no first-party writer of the class exists (`js/swipe.js:207-210` is a tombstone comment); `js/nav.js:104-116` — `resetSwipeStyles` no longer sweeps the class and no longer takes `keepGhosts`; gated by `NOGHOSTCLASS`, `test/retired-concepts-purge.test.js:335` | reading + MEASURED (`NOGHOSTCLASS` green, with its own positive and negative fire drills) |
| 9 | the browse→home OUTGOING transform | **Subject deleted / premise inverted** | the goal was 6f's axis *never transform the real in-flow view*; the ratified design at HEAD is the opposite — `js/swipe.js:173-181`, every transition moves its real source element. The home-reveal HOLD it was deferred behind is deleted (`js/app.js:708`, `:998-1002`) | reading |
| 10 | the INCOMING real-`#browse` transform (browse→browse headline [T8-forked], home→browse, overlay→browse) | **Subject deleted / premise inverted** | same inversion; `js/swipe.js:188-191` renders the destination into the real `#browse` (or the destination `.browsepage`) and moves it as the incoming mover, by design. The device flash on that family stays OPEN under `PLAN-swipe-reveal.md` §6 as a device symptom with no JS-observable cause; it is not a stage-7 work item | reading |

**Two items in the same clause that are not numbered deferrals but need the same statement.** The
"STILL DEFERRED on the Home-flash axis" note names the incoming-`#browse` headline flash — that is
row 10's symptom and stays open as a device symptom. The note also says 6h "ships the device-pending
scroll-settle fix, awaiting the device repro": **6h's fix no longer exists at HEAD** — the subtraction
pass deleted `holdGhostUntilPaintable` and with it `SETTLE_SCROLL_MIN`, `SETTLE_MS` and the
`scrollSettle` flag (`js/app.js:708`; only `test/swipe-stage6i.test.js:142-166` retains them, as the
cell that pins the removal). **6g's fix is likewise not in the shipped form the clause describes**:
`css/app.css:190-197` records that the `translateZ(0)` form FLASHED on device on 2026-07-27 and was
reverted to `will-change: transform`, and `test/home-layer-invariant.test.js` no longer exists. Both
facts are recorded here because a future reader of the stage-6 entry would otherwise believe two
device-pending fixes are in the tree. **Neither is stage-7 work**; both are records scrubs (§11).

---

## Applicability

*(Section 4 of the index. Unnumbered because the plan gate matches this heading literally.)*

| Pattern | Value | Reason |
|---|---|---|
| `boundary_relocation` | **false** | No code moves between modules. `beginHold`/`endHold` stay in `js/browse.js`; the swipe's wrappers stay in `js/app.js`. Only the interface between them is reshaped. |
| `callee_replacement` | **true** | `Browse.endHold` is replaced by `Browse.finishGestureHold`, and it carries a large observable-effect surface beyond its signature (controller deactivation, `parked`/`hidden` toggles, activation, realization, deferred-repaint replay, scroll-suspension release). §8 assigns every one. |
| `contract_shape` | **true** | The Browse public surface changes: two exported names are replaced and one is added. **The gate over that surface is `LEASECONTRACT` (§13), whose exported-key-set assertion runs against an explicit list.** It is NOT `test/contract-function-gate.test.js`, whose `CONTRACT`/`NON_CONTRACT` exact-key classification governs the `Swipe.*` contract-object factories and does not reach `js/browse.js` — §6 states that, and round 1 F5 found the first draft's chain ended in nothing. |
| `state_transfer` | **true** | The session field `hold` (a numeric token, `0` as the released sentinel) becomes `lease` (an opaque handle, `null` as the released sentinel), and its release ordering against `applyScreen` is load-bearing. §7 and §9 carry it. |
| `async_change` | **false** | **Deliberately, and it is the plan's central refusal.** No promise is introduced. §6 F1 records why the plan-of-record's `ready: Promise` is refused and what would reopen it. |
| `persistence_migration` | **false** | Nothing serialized, cached to disk, or versioned is touched. |
| `lifecycle_ownership` | **true** | The lease's acquire point, its single owner, its release endpoint and its invalidation route are the subject of the change. §10 carries it. |

⚠️ **The plan gate emits one expected heuristic warning** — *"plan uses relocation language but
`boundary_relocation=false`"* — because §5 uses the words "moves" and "stays" to state that nothing
moves. The declaration is correct; the warning is the heuristic reading the vocabulary, not the fact.
Recorded so a future run's warning is not mistaken for a defect.

---

## 5. Exact scope boundary (U2)

**MOVES** — nothing. No code changes module.

**CHANGES SHAPE (in place):**
- `js/browse.js` — `beginHold()` → `beginGestureHold()`; `endHold(token, landed)` →
  `finishGestureHold(lease, landedDescriptor)` returning a status; `dropHold()` gains a named public
  entry `invalidateGestureHold()` so a destructive Browse operation invalidates the lease
  **explicitly** (`PLAN-swipe-reveal.md` §3.5) instead of as an unnamed private side effect.
- `js/app.js` — `session.hold` → `session.lease`; `takeRowHold`/`dropRowHold` renamed to
  `takeLease`/`returnLease`.
- **`js/app.js` — `returnLease` EMITS a production trace line reading the status**, e.g.
  `PBDebug.log('SWIPE', 'lease released status=' + status + ' sid=' + session.id)`, guarded by
  `window.PBDebug` exactly as the three existing swipe trace lines are (`js/app.js:399`, `:535`,
  `:699`). ⚠️ **This line is IN SCOPE and is what makes the status a live field.** Round 1 F2
  measured that `Swipe.debugSnapshot`/`debugTrace` occur nowhere in `js/`, `test/` or `tools/` and
  that none of the three existing trace lines mentions the hold — so the trace the first draft named
  as the status's consumer was a future deliverable, not a retained one, and the status would have
  shipped with no reader. **The status is not recorded on the session as its terminus**; it is
  recorded and then read by this line, in the same slice, with `LEASEINVALID` asserting the harness
  captures it (`test/app-harness.js:632`). See §14 D1.

**STAYS — byte-unchanged, and each is stated because a reviewer must be able to check it:**
- The three release CALL SITES and their positions (`js/app.js:427`, `:1026`, `:1079`). §9 records
  that folding them into one endpoint is a trap, not a simplification.
- Browse's reconciliation body (`js/browse.js:165-223`): the deactivate loop, the `parked`/`hidden`
  toggles, the landed-page activate-and-realize, the fallback branch, the deferred-repaint replay.
  §8 asserts each survives on the same layer.
- Every mover, transform, settle, finalize and recovery path. This plan touches no mover.
- `js/virtuallist.js` `setScrollSuspended` and its two call sites' semantics.
- **`keyFor` (`js/browse.js:141-158`) stays NON-THROWING, and this is a trap the parent plan does not
  mention.** Its own comment carries the reason: a throw on the release path runs inside the finalize
  `finally`, past `if (!ok) finishing = false;`, and would leave `finishing` true and wedge every
  future swipe. A rename that "tidies" it into `pageElFor` (which throws by design) reintroduces that
  defect silently.

**SPLIT across the seam:** the decision *"was the hold's reconciliation actually performed?"* Today it
is private to `js/browse.js` (the `token !== holdGen` early return at `:166`). After this stage the
DECISION stays in Browse and its ANSWER crosses to the swipe as the status. That is the only new value
crossing the boundary.

**DEFERRED (§16 carries the full list with consumers):** the surviving finalization-plan fields (row
2), `recoverSession` (row 6), the I12 bookkeeping remainder (row 7).

**NO NEW FIELD WITHOUT A CONSUMER NOW (EC §4.15).** Three candidates from §3.5 were tested against
this rule and two were REFUSED — see §6 F1/F2. That refusal is the plan's main act of restraint and is
recorded so it is not mistaken for an oversight.

---

## 6. The contract shape (U3)

The Browse public surface is an object literal at `js/browse.js:964`. It is not a deep-frozen contract
object, and `test/contract-function-gate.test.js` does not govern it: that gate classifies the
`Swipe.*` exports into `CONTRACT`/`NON_CONTRACT` and does not reach `js/browse.js` at all.
**`LEASECONTRACT` (§13) is the gate over this surface**, and its exported-key-set assertion against an
explicit list is what makes the change checkable. `Swipe.buildConstruction`'s `NON_CONTRACT` exemption
is untouched by this stage. *(Round 1 F5: the first draft pointed §6 at §11 for "which gate does", and
§11 named none.)*

```
Browse.beginGestureHold() -> Lease
    Lease := opaque, non-forgeable-by-accident handle. Currently a monotonic integer.
             `null` is NEVER a valid lease and is the released sentinel on the session.

Browse.finishGestureHold(lease: Lease, landed: Descriptor|null) -> 'ready' | 'invalidated'
    'ready'        the lease was live; the reconciliation ran to completion.
    'invalidated'  the lease was not the live one; NOTHING was reconciled.
                   Idempotent: a second call with the same lease also returns 'invalidated'.

Browse.invalidateGestureHold() -> void
    Idempotent IN OBSERVABLE EFFECT, not in state. Called by every destructive Browse
    operation. After it, every outstanding lease answers 'invalidated'.
```

⚠️ **"Idempotent" is qualified deliberately, and the qualification is the plan reviewer's.**
`dropHold` bumps `holdGen` on every call, so two calls consume two generations. Nothing depends on
generation contiguity — `beginGestureHold` returns `++holdGen`, so `0` is never issued and stays a
safe sentinel — which is what makes it sound; but a flat "idempotent" would claim state invariance
this does not have, and a later reader relying on that claim is how a sentinel assumption breaks.

⚠️ **The release's early return is TWO conditions, not one.** `js/browse.js:166` is
`token !== holdGen || !holdRows`. The second condition is what makes a second call with a still-live
token inert, which is the idempotency promised above. A repair that keeps only the token comparison
would satisfy the prose and lose the property.

```vitruvius-contract
# field | class
lease | identity
landed | value
status | value
session.lease | state
```

**The class column is the LEDGER's vocabulary, not a second shape notation** — it exists so the gate
can catch a field that is described one way here and another way in §7. The structural shapes are the
fenced signature block above, which is the single canonical definition: a `lease` is an opaque handle
whose `null` is never valid, `landed` is a descriptor or `null`, `status` is the two-value enum, and
`session.lease` is the session's field holding the handle or `null` when released.

### F1 — `ready: Promise` is REFUSED. Stated as a decision, not an omission.

`PLAN-swipe-reveal.md` §3.5 gives `finishGestureHold` a `{ status, ready: Promise<void> }` return and
has the caller `await result.ready` before `await paintBarrier()`. **Both consumers are gone.** The
paint barrier belonged to `reveal()`, and there is no `reveal()` — no transition builds a covering
pane (§3 row 1). §3.5 itself already recorded that Browse's reconciliation is synchronous and that
Browse must not add a `requestAnimationFrame` merely to look asynchronous. With no reveal to await it,
an immediately-resolved `ready` would have exactly one effect: `await`-ing it inside `runFinalize`
makes finalization asynchronous, deferring the stack mutation, the screen application and the scroll
restore past a microtask boundary — a real behaviour change bought for nothing, and the shape
Engineering Contract §4.21 names directly ("do not change a synchronous API into asynchronous"). **It
is not introduced.** *Reopens if:* a covering pane returns to any transition, which would restore
`reveal()` and I10 and with them a genuine paint barrier to await.

### F2 — `settledScrollY` is REFUSED. Its subject moved.

§3.5 passes `settledScrollY` to `finishGestureHold`. `endHold` reads no scroll value at HEAD
(`js/browse.js:165-223`), and it cannot usefully be given one: since the browse-decouple each
`.browsepage` is its own scroller and keeps its own `scrollTop` (Invariant D4,
`PolicyLedger.mjs` `PL-swipe-browse-fixed-ownscroll`), and `window.scrollY` is a constant 0 on the app
views. A `settledScrollY` argument would have no reader — a dead field at the exact seam this
campaign exists to keep clean. **It is not introduced.**

### F3 — `landed` KEEPS its current shape and role.

`endHold`'s second argument is already the landed descriptor, and it is load-bearing: it is the single
read of the landed screen (Invariant D6) and it selects the branch at `js/browse.js:172`. It is
renamed in the signature and otherwise unchanged. `keyFor` (`js/browse.js:153-158`) must stay
non-throwing for the reason its own comment gives — a throw on this path runs inside the finalize
`finally`, past `if (!ok) finishing = false`, and would wedge every future swipe.

---

## 7. Value and ownership ledger (U6)

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
lease handle | identity | out | Browse beginGestureHold | the swipe session field and finishGestureHold | Browse | one gesture from start to the single release | LEASEPAIRED cell
session lease field | state | inout | the swipe takeLease wrapper at start | the swipe returnLease wrapper at each of the three exits | the gesture session | from start until the first release which nulls it | LEASEPAIRED cell
release status | value | in | Browse finishGestureHold | the production trace line returnLease emits in this same slice which reads the status into its message | Browse | one value per release call | LEASEINVALID cell trace assertion
landed descriptor | value | out | the swipe currentDesc read at the release call | the Browse landed branch selector | the swipe | read once per release | LANDEDPAGESHOWS cell retained
invalidation | behavior | out | Browse reset and clearCache through invalidateGestureHold | every outstanding lease which then answers invalidated | Browse | from the destructive operation until the next acquire | LEASEINVALID cell
scroll suspension | behavior | inout | beginGestureHold sets it and finishGestureHold and invalidateGestureHold clear it | the virtual list scroll realize handler | Browse | one gesture | LEASEPAIRED cell suspension clause which asserts it and carries its own mutant
deferred repaint queue | state | inout | the Browse render path while the lease is live | the finishGestureHold replay tail | Browse | one gesture, replayed once on ready and discarded on invalidated | LEASEINVALID cell repaint assertion
release ordering against the screen application | behavior | inout | the swipe finalize which calls returnLease before applyScreen | the Browse fallback activation which needs a measurable container | the swipe | one release per gesture | LEASEORDER cell
```

**U4 consumer-now check, stated per row.** The lease handle, the session field, the landed descriptor,
the scroll suspension, the deferred-repaint queue and the ordering all have production consumers at
HEAD and keep them. **`release status` is the one NEW value, and its consumer is the trace line
`returnLease` emits in THIS slice** (§5) — production code, in the same commit, with `LEASEINVALID`
asserting the harness records it.

⛔ **The first draft named a different consumer and it did not exist.** It cited "the retained
diagnostic trace that `PLAN-swipe-reveal.md` §7 requires to survive the migration". Round 1 F2
measured that clause's named interface — `Swipe.debugSnapshot` / `Swipe.debugTrace` — as occurring
nowhere in `js/`, `test/` or `tools/`, and none of the three existing `PBDebug.log('SWIPE', …)` lines
mentions the hold. That trace is a future deliverable, and EC §4.15 is not ambiguous: "a future stage
is not a consumer." **The correction is to build the one line rather than to cite one that is not
there** — the smaller change, and the one that makes the field genuinely live. A test reading the
session field would not have closed it: a test is not a production consumer, which is the exact
substitution §4.15 names.

---

## 8. Observable-effect ownership across the replaced callee (U7)

The replaced callee is `endHold` (`js/browse.js:165-223`). Its observable surface is much larger than
its signature. Every effect below survives, on the same layer, in the same order; the table exists so
that "the body is unchanged" is a checkable claim rather than an assurance. The callee toggles the
`parked` and `hidden` classes on `.browsepage` elements — both named here so the change cannot be
read as silently altering page visibility.

```vitruvius-effects
# effect | owner | predecessor | successor | verification
clear the row-hold flag before anything else so a deferred repaint cannot re-defer | Browse finishGestureHold | the live-lease check | release the scroll suspension | LEASEPAIRED cell flag-order clause with its own mutant
release the virtual-list scroll suspension | Browse finishGestureHold | the row-hold flag clear | compute the landed key | LEASEPAIRED cell suspension clause with its own mutant
deactivate every non-landed controller while its box still measures | Browse finishGestureHold | compute the landed key | the parked and hidden class toggles | LANDEDPAGESHOWS cell retained
remove parked and set hidden on every page except the landed one | Browse finishGestureHold | the deactivate loop | activate and realize the landed page | LANDEDPAGESHOWS cell retained
activate and realize the landed page exactly once against the settled scroll | Browse finishGestureHold | the class toggles | replay the deferred repaints | LANDEDPAGESHOWS cell retained
the fallback branch for a landing that names no cached browse page | Browse finishGestureHold | the landed key lookup miss | replay the deferred repaints | LANDEDPAGESHOWS browse to home half retained
replay every deferred repaint exactly once and clear the queue | Browse finishGestureHold | the landed or fallback branch | return the ready status | LEASEINVALID cell repaint assertion
return a status naming whether the reconciliation ran | Browse finishGestureHold | every effect above | the swipe trace line returnLease emits reads it | LEASEINVALID cell trace assertion
perform NONE of the effects above and discard the deferred repaints | Browse invalidateGestureHold | a destructive Browse operation | every outstanding lease answers invalidated | LEASEINVALID cell
```

**The `invalidated` path is a deliberate NO-OP on the reconciliation surface, and that is parity.**
`dropHold()` already clears the queue and releases the scroll suspension without reconciling, because
the pages it would reconcile are being destroyed in the same call. This stage names that behaviour and
makes it observable to the gesture; it does not change it (EC §4.19: behaviour-preserving extraction,
plus one NEW POLICY item — the status value and its trace line — declared in §11).

⚠️ **Every row of this table names a cell that ASSERTS that row's effect and a mutant that removes
it.** Round 1 F4 found three rows here and in §7 citing `LEASEPAIRED` for effects `LEASEPAIRED` did
not assert — it declared acquire/release counts and nothing about the flag order or the scroll
suspension, and all three of its mutants were acquire/release placement mutants. §8 exists so that
"the body is unchanged" is checkable rather than asserted; a citation to a cell that does not assert
the cited effect is the assurance it exists to replace. `LEASEPAIRED` gains both clauses and both
mutants in §13 rather than a new cell being created for them.

---

## 9. Ordering and atomicity (U8)

**Correctness requirements (a wrong order is a defect, with the defect named):**

1. **The lease is returned BEFORE the `applyScreen` that can hide `#browse`.** `js/app.js:1022-1026`
   states the measured reason: the fallback branch activates and realizes whichever browse page is
   still shown; called once `#browse` is `display:none`, it realizes zero rows into a box that cannot
   measure and leaves the controller stuck `active` with none, closing every later refill — the
   empty-Books-page defect. **This ordering is preserved exactly.**
2. **The lease is returned BEFORE the session ownership ends.** `returnLease` reads `session.lease`;
   `endOwnership` nulls `session` (`js/app.js:1071-1079`).
3. **On the recovery path the lease is returned AFTER the screen render and the scroll restore.**
   `js/app.js:413-416` records the executed counterexample: releasing first deactivates a suspended
   virtualized source and dematerializes its kept rows before the render can reuse them.
4. **Inside Browse, the row-hold flag is cleared FIRST**, or the deferred repaints re-defer
   (`js/browse.js:167`); and **controllers are deactivated before the class toggles**, because
   `deactivate()` captures a scroll anchor from geometry and a `display:none` box measures zero.

⛔ **The obvious simplification is a trap, and it is recorded here so it is not proposed later.**
Folding the three release call sites into the existing single `sessionDone(s)` endpoint would make
"returned on every exit path" hold by construction — and would **break requirements 1 and 3**, both of
which are ordering constraints against operations that happen at the call site, not at the endpoint.
The structural guarantee is therefore NOT available at the endpoint, and is bought instead by the
`LEASEPAIRED` cell driving every §3.7 exit (§13).

**Incidental, not a correctness requirement:** the leak-guard `returnLease()` in the finalize
`finally` (`js/app.js:1079`) is a no-op on every non-throwing path because the first call nulls the
session field. Its position may move within the `finally` without consequence.

---

## 10. Ambient dependencies and lifecycle ownership (U9)

**Ambient reads by the changed code: none added.** `takeLease` reads `window.Browse` exactly as
`takeRowHold` does today (`js/app.js:349`), which is the existing module-presence guard and not a new
ambient dependency. No changed line reads `window.scrollY`, `getComputedStyle`, `document.body`
classes, or a `data-*` attribute. `js/browse.js` keeps reading `VL` through its existing module
reference. No module-load-time DOM access is introduced anywhere.

**Lifecycle ownership, stated per the module's required concerns:**

- **Creator.** `Browse.beginGestureHold()`, called only from `takeLease` in `start()`
  (`js/app.js:500`) — one acquire per LIVE gesture. A gesture that arms and never crosses the
  direction lock never acquires, which is why the acquire is in `start()` and not `begin()`.
- **Owner.** The gesture session, in the field `session.lease`. There is exactly one owner and it is
  never the module scope.
- **Borrower.** None. The lease is not passed to any other component.
- **Release endpoint.** `returnLease()`, at three call sites (§9). It is idempotent by nulling
  `session.lease` on its first call.
- **Invalidation.** `Browse.invalidateGestureHold()`, from `reset()` and `clearCache()`
  (`js/browse.js:68`, `:77`). Invalidation does not release the session's field — the gesture still
  calls `returnLease` and receives `'invalidated'`.
- **Destruction.** None; the lease is a value, not a resource holding memory.
- **Leak bound, if a release is ever missed.** Unchanged and already recorded at
  `js/browse.js:117-121`: a leaked hold degrades to what the classic renderer does anyway (every
  cached page keeps its rows). Bounded, not unbounded — which is what makes the `LEASEPAIRED` cell a
  guard rather than a safety-critical gate.

---

## 11. Compatibility, migration and the MEASURED co-change list (U10)

**Exact-key / public-surface contracts changed:**
- `js/browse.js:960-968` — the export object: `beginHold` and `endHold` are replaced,
  `invalidateGestureHold` is added. Same commit.
- `test/app-harness.js:593`, `:597` — the Browse fake's `beginHold`/`endHold`, including the
  `'current' | 'stale'` token discrimination the harness models deliberately (`test/app-harness.js:559-561`:
  "a fake that accepted any token would pass a leak"). The fake must gain the status return and
  `invalidateGestureHold`; it must NOT become kinder than reality. Same commit.

### The MEASURED co-change set

⛔ **The first draft declared ONE rotted registration, and the number was true of a transform this
plan does not specify.** §12's probe renamed only the session field and the two `Browse.*` call sites;
§5 also renames `takeRowHold`→`takeLease` and `dropRowHold`→`returnLease`, and §12 mandates the
freeze. Round 1 F1 caught it. **The set below was RE-MEASURED here, control-first, entirely in memory
— the repo was never written to — by applying each transform layer to the source text and running the
anchors gate's own predicate (`readFile(file).includes(lf(part.from))` over `MUTATIONS` and each
`m.also`, with the gate's CRLF normalisation) against the result.** The control ran first: **0 rotted
with no transform applied.** Registry size at measurement: 152.

| Transform layer | Rotted `from` anchors |
|---|---|
| **CONTROL — none** | **0** |
| §12's probe alone (session field + `Browse.*` call sites), code positions only | 1 |
| **§5 as written** (adds the two wrapper renames), code positions only | **9** |
| §5 + the `js/browse.js` rename, code positions only | **9** — *the Browse-side rename rots nothing; no registration anchors on `beginHold`/`endHold`/`dropHold` in that file* |
| §12's freeze alone | **3** |
| FULL — §5 + Browse + freeze, code positions only | 12 |
| **FULL — the transform this plan specifies, comments included** | **13** |

**The declared co-change set is the union of three classes, and the first draft carried only part of
class (a).** Cited by name, never by index — the registry is 152 entries and every insertion shifts
later ones.

**(a) `from` anchors that stop matching** — **thirteen.** ⛔ **The comment rename is not optional, so
thirteen is the declared figure and twelve is a sub-measurement** (round 2 F1): `js/app.js:346-374`,
`:398-431`, `:1048` and `:1071` name `takeRowHold`, `dropRowHold`, `session.hold` and `Browse.endHold`
in current-truth explanatory comments, and StandardsDocument §6.6 covers comments explicitly, so
leaving them stale is not an outcome the plan permits. Twelve is retained as the code-only layer
because step 5b applies the layers separately, and a control that cannot distinguish them cannot say
which layer moved. The thirteen:
`stage6a (a) re-anchored: the Browse hold releases BEFORE the applyScreen it must follow`;
`stage6a (b): session/d null BEFORE the hold release`;
`stage6c W: the supersession recovery omits the finishing=false clear`;
`stage3: finalize does not end ownership`;
`swipe5 F7b: the row hold no longer precedes the clobbering render`;
`S2-20 LANDEDPAGESHOWS: the landed descriptor is read BEFORE the screen is applied`;
`EMPTYAFTERHOME-a: the early dropRowHold() is removed`;
`EMPTYAFTERHOME-b: the early dropRowHold() is wired to the ABORT branch only`;
`S2-32 RECOVERYPARITY: the supersession recovery releases the row hold BEFORE applying the source
screen`; and from the freeze, `S2-35 MOVERSHAPE`, `S2-36 MOVERSHAPE`, `S2-39 MOVERSHAPE`. Renaming the
identifiers inside comments adds `stage6c G2/G3: the finalize cur===session guard is removed`.
⚠️ **The three MOVERSHAPE re-anchorings carry an obligation on their `to` side as well as their
`from`** — §12 states it, and §17 step 5b's fourth check is what makes it checkable. The minimal
correct-looking re-anchoring (update `from`, leave `to`) satisfies §12's repaired predicate as three
false wrapper-deletion mutants (round 2 F3a).

**(b) `to` sides that INJECT an identifier the rename retires** — **nine**, and this class did not
appear in the first draft at all. Measured by scanning every `to` string for `dropRowHold`,
`takeRowHold`, `beginHold`, `endHold`, `dropHold` at a word boundary:
`stage6a (a) re-anchored…`, `stage6a (b)…`, `stage6c W…`, **`stage6c G2/G3…`**, `stage3: finalize does
not end ownership`, `S2-20 LANDEDPAGESHOWS…`, `EMPTYAFTERHOME-b…`, `S2-32 RECOVERYPARITY…` (all
injecting `dropRowHold`) and `swipe5 F7b…` (injecting `takeRowHold`); `S2-20 LANDEDPAGESHOWS…` also
injects `endHold`.
⛔ **`stage6c G2/G3` is in class (b) but NOT in class (a)'s code-only set** — its `from` survives the
rename and its `to` does not, so an anchors gate that checks `from` only reports it clean. The mutant
still APPLIES and then kills its designated cell with a `ReferenceError` instead of with the
stale-finalize defect it names. That is the "reddens for the wrong reason is indistinguishable from
working" hazard this campaign already recorded for `S2-23 NOGHOSTATALL`. **The `to` sides are renamed
in the same commit, and the anchors gate cannot see whether that was done.**

**(c) Non-registry readers of the retired text** — **three**, of which only the first was named before
round 2. Round 1 struck this plan for an enumeration measured rather than read, and round 2 F1
measured that the repair had left the same class open one surface over.

1. **`ADAPTER_DECL`** at `test/swipe-declone-stage2-subtraction.test.js:211` — the literal
   `'const toMover = (m) => ({'`, which stops matching the moment the freeze lands. That is the reader
   detecting rot, working as designed (§14 of the subtraction plan predicts it), but it is a co-change
   and it is re-pinned in the same commit.
2. ⛔ **`tools/gen-swipe-model.mjs` and the file it emits, `docs/swipe-model.generated.txt` — WATCHED
   BY NOTHING.** The generator carries `endHold` and `dropRowHold` in current-truth prose inside the
   model text (`:244`, `:246`, `:426`, `:430`), mirrored into the generated document (`:144`, `:148`).
   `test/swipe-model.test.js` compares generated against generator only, so **both rot together and
   the suite stays green** while a current-truth model document describes two functions that no longer
   exist. The generator is edited and the document **REGENERATED**, never hand-edited, in the same
   commit. *(The durable form of this class is already settled and is NOT re-opened here: the decision
   log's 2026-08-04 entries rule that an enumeration of sites in a generated record is checked by a
   gate — a token assertion over the rendered output the comparison test already reads. Round 2
   scoped that out of stage 7 and routed the class to the coverage auditor; this plan discharges the
   INSTANCE by scrub, under the predicate below, and leaves the class where the reviewer put it.)*
3. **Three current-truth COMMENTS that no gate reads** — `js/virtuallist.js:140-141` ("Owner:
   browse.js (beginHold / endHold)"), `test/parked-page-rides-home-browse.test.js:194` and
   `test/swipe-model.test.js:62-63`. MEASURED here rather than inherited: a word-boundary sweep of
   `js/`, `test/` and `tools/` for the five retired identifiers returns sixteen files, and these three
   are the ones outside every declared set whose only occurrences are in comments — which is why a
   live-reference scan does not see them, and why §6.6 requires them anyway. **Measured control: none
   of the three carries a mutation anchor.** The one registration targeting `js/virtuallist.js`
   anchors on the document scroll-listener line and names no retired identifier, and no registration
   targets either test file — so scrubbing all three rots nothing further and class (a)'s thirteen is
   unchanged by them.

**Eight further test files carry LIVE references and are deliberately named as a class rather than
enumerated per line:** `browse-virtual`, `swipe-declone-stage2-browse`, `swipe-stage6`,
`swipe-gesture`, `swipe-stage5-wiring`, `browse-empty-after-home-commit`,
`swipe-declone-stage2-subtraction` and `swipe-stage6c`. Step 5b clause 3 already requires the whole
suite green, and a live reference to a renamed function fails loudly and names its own line, so a
per-line list would be a second inventory to maintain in exchange for nothing the suite does not
already say. **They are declared so that a build which goes red in them recognises the failure as
predicted rather than as a blast-radius miss** — which is the cost round 2 predicted if they stayed
unnamed.

**Build-time obligation, with an executable predicate (round 2 F1's acceptance predicate).**
`grep -rn 'endHold\|dropRowHold' docs/ tools/gen-swipe-model.mjs` returns NOTHING after the build, and
`docs/swipe-model.generated.txt` is regenerated in the same commit. **MEASURED at `c2369f8`, before
the build: six matching lines in two files** — `docs/swipe-model.generated.txt:144`, `:148` and
`tools/gen-swipe-model.mjs:244`, `:246`, `:426`, `:430`. A `docs/` sweep for all five retired
identifiers returns that one file and no other, so the predicate's `docs/` half is complete rather
than merely non-empty.

**Every registration in classes (a) and (b) is re-anchored — `from` AND `to` — in the same commit,
and `ADAPTER_DECL` is re-pinned with it.** §17 step 5b's equality rule now runs against this set.

**Records scrubbed on approval (StandardsDocument §6.6):**
- `Claude/Plans/PLAN-swipe-reveal.md` — a one-line pointer on the stage-7 entry to this plan. **The
  stage-6 entry is not restructured**; §3 of this plan is the record of what its DEFERRED-to-7 clause
  now means.
- `Claude/Subsystems/swipe-reveal.md` — the resource vocabulary, plus the stale `disposeOwnedPanes` /
  `holdGhostUntilPaintable` / `dropPanes` / `translateZ(0)` / stage-7 inheritance text (§2 GAP, §3).
- `docs/swipe-model.generated.txt` — **REGENERATED** from `tools/gen-swipe-model.mjs`, not
  hand-edited. Named separately from the records below because it is the one scrub target with no
  gate behind it (class (c) item 2).
- The three comment sites in class (c) item 3 (`js/virtuallist.js:140-141`,
  `test/parked-page-rides-home-browse.test.js:194`, `test/swipe-model.test.js:62-63`), plus the
  current-truth comments inside `js/app.js` that class (a)'s thirteenth registration depends on.
- `Claude/Decisions/DecisionLog.md`, `Claude/Zelda/Board.md`, `Claude/Campaigns/swipe-stage7.json`.
  ⚠️ The log's 2026-08-06 co-change entry reads "thirteen registrations in three classes plus **one**
  non-registry reader"; class (c) is now three, and that entry is corrected to current truth in the
  same scrub.
- `tools/mutate.mjs:432-438` — the `swipe4 no-dead-fields` mutant's comment still reads
  "`sameBrowseHost` is STILL unconsumed until stage 6". Stage 6 has passed and the field's planned
  consumer was retired; the mutant is live and correct, only its rationale is stale (round 1 F7).

**PolicyLedger (EC §4.19).** One NEW POLICY entry: *a destructive Browse operation invalidates the
lease explicitly, and the gesture learns the outcome of its own release and reports it.* Everything
else in this stage is behaviour-preserving extraction. The entry is `knownRed: false` and names
`LEASEINVALID` as its enforcing test, so `test/policy-ledger-gate.test.js` reconciles it.
⚠️ **This entry is CONDITIONAL on §14 D1 and is not a free choice** (round 1's ruling on the first
draft's F2). The classification rests entirely on the reporting: with the status and its trace line,
the gesture learning and announcing the outcome of its own release is a genuine new observable and the
entry is correct. Under D1's fallback the reporting is gone, what remains is a private function
promoted to public with a byte-identical body — a rename plus a public-surface migration — and **the
entry must not be written**. D1 takes the first branch, so the entry stands.

---

## 12. The §14 lifetime-invariant trigger — measured, not read

`PLAN-swipe-declone-stage2-subtraction.md` §14 defers a mover-lifetime invariant behind a two-clause
trigger: *"the next change that writes to a member of `d.movers` outside `toMover`, **or** that threads
any new value to the settle path."* `MOVERLIFETIMETRIGGER`
(`test/swipe-declone-stage2-subtraction.test.js:472`) mechanizes the FIRST clause and an inventory of
the forms in which `.movers` may be touched. It does not mechanize the second.

**What was run** (HEAD `3ed9756`, real gate, real file, tree restored and `git status` verified empty
afterwards):

| Probe | Transform | `MOVERLIFETIMETRIGGER` |
|---|---|---|
| **Positive control** | `m.lease = tr;` added inside the settle loop over `cur.movers` | **RED** — reported `js/app.js:604 writes \`m.lease\`` |
| **The stage-7 shape** | `session.hold` → `session.lease`; `Browse.beginHold`/`endHold` → `beginGestureHold`/`finishGestureHold(t, {…})`; the status recorded on the session in the finalize path | **GREEN** |

⚠️ **The "stage-7 shape" row above used the same NARROW transform §11 was wrong about** (round 1 F8) —
it did not rename the wrappers. **The ruling survives it, on a reason that does not depend on the
transform's width:** the gate's discriminator is an assignment terminating at depth 1 on a
mover-rooted expression, and all six mover-touching sites in `js/app.js` (`:557`, `:578`, `:604`,
`:617`, `:701`, `:1083`) read `m.el`/`m.base` or write `m.el.style.…`, which the discriminator
explicitly excludes. A rename of two wrapper functions introduces no assignment of that shape. The
narrowing is recorded rather than quietly repaired, because §11's defect was exactly a measurement
whose input went unstated.

**Ruling.** The mechanical trigger does **not** fire: this stage writes no mover member and touches
`.movers` in no new form, and the control proves that negative is evidence rather than silence.
**§14's SECOND clause DOES fire** — the release status is a new value threaded to the settle path.
The gate is silent there by construction, and §14's own text is explicit that what makes a deferral a
scheduled gate rather than a backlog line is something that fires at the trigger.

**Therefore this plan carries §14's two-part design as a required deliverable** (`MOVERFROZEN`, §13):
wrap the adapter literal in `Object.freeze(` **and** pin that wrapper in the source assertion with its
deletion registered as a mutant. ⛔ Neither half is sound alone — `js/app.js` is non-strict, so the
freeze silences an offending write instead of throwing.

### ⛔ RETRACTED: the gate does NOT catch a half-landed §14, and a new mechanism IS needed

The first draft said the trigger gate's clause 3 "already checks both directions and will redden if
one half lands without the other", and R7 concluded "no new mechanism is needed". **Both statements
are false, and round 1 F3 is right.** Clause 3's `registered` half is

```
p.from.includes('Object.freeze(') && p.from.includes('toMover')
```

and §11 class (a) requires `S2-35 MOVERSHAPE`, `S2-36 MOVERSHAPE` and `S2-39 MOVERSHAPE` to be
re-anchored onto the frozen literal **in this same commit**. Their `from` then contains both tokens,
so `registered` is satisfied by the re-anchoring alone — with no wrapper-deletion mutant anywhere in
the registry. The gate's own comment records that it narrowed an earlier `Object.freeze(`-only search
by co-occurrence with `toMover` to kill a false positive; **this commit is what collapses that
narrowing**, because after the freeze the co-occurrence no longer discriminates.

**The repair, specified here and owned by the test author.** The wrapper-deletion mutant is to be the
unique registration whose `from` carries the wrapper and whose `to` does not. So clause 3's
`registered` predicate gains a `to`-side discriminator:

```
p.from.includes('Object.freeze(') && p.from.includes('toMover')
  && typeof p.to === 'string' && !p.to.includes('Object.freeze(')
```

That is structural rather than a text pin: it asks whether the registration actually removes the
construct it claims to remove, so reformatting or reordering the key-set mutants leaves it green and
only a missing wrapper-deletion mutant reddens it. It must land in the same commit as the freeze —
otherwise §14's part 2, the wrapper's only runnable witness, can go missing with the whole suite green.

### ⛔ The predicate's uniqueness is an OBLIGATION on the re-anchoring edit, not a fact about the registry

The first revision stated it as a fact — "verified against the three re-anchoring candidates, every
one of which keeps `Object.freeze(` on its `to` side" — and that wording was an active instruction not
to check. **Round 2 F3a measured it false, and this plan reproduces the measurement rather than
inheriting it.** At `c2369f8` the `to` strings of `S2-35`, `S2-36` and `S2-39` are full-line
replacements written against the UNFROZEN literal, and none of the three contains `Object.freeze(`.
MEASURED against the exported `MUTATIONS`, control first:

| Registry variant | registrations matching the repaired predicate |
|---|---|
| **CONTROL — the registry at `c2369f8`, untransformed** | **0** (and 0 for the pre-repair co-occurrence form, so the freeze is genuinely absent) |
| MINIMAL re-anchoring — `from` updated to the frozen line, `to` left as written, no wrapper-deletion mutant | **3** — `S2-35`, `S2-36`, `S2-39`, every one a FALSE wrapper-deletion |
| **OBLIGATED re-anchoring — `from` AND `to` carry the wrapper, plus the wrapper-deletion mutant** | **1**, and it is the wrapper-deletion mutant |

The middle row is the defect: the minimal correct-looking re-anchoring satisfies `registered` with no
genuine mutant present, and **the exact vacuity round 1 measured returns through a different door.**

**THE OBLIGATION.** *(Basis: an invariant the repaired predicate depends on. U11 — it is stated as a
property the edit must produce, not as a choice of how to produce it.)* After re-anchoring, the `to`
strings of `S2-35 MOVERSHAPE`, `S2-36 MOVERSHAPE` and `S2-39 MOVERSHAPE` carry `Object.freeze(`.
This is not an artificial constraint invented for the gate: each of the three exists to change the
adapter's KEY SET, and a key-set mutant whose replacement text also silently drops the freeze would
perturb two mechanisms at once — the shape this project's own decision log names as a mutant that
reddens for the wrong reason. §17 step 5b carries it as a fourth check, because it is the one property
in this commit that no existing gate can see.

*Considered and excluded, so it is not re-litigated.* A discriminator comparing `to` against `from`
with the wrapper swapped out (`p.to === p.from.replace('Object.freeze(', '(')`) needs no obligation on
siblings at all, and on the invariant alone it is the stronger shape. It is refused for two reasons.
It pins the wrapper-deletion registration's replacement text to the byte, so any reformatting of that
one entry reddens the gate on correct work — the false-positive class the cell's own comment
(`test/swipe-declone-stage2-subtraction.test.js:672-677`) records this project losing three gates to.
And the decision log already settled the discriminating question on 2026-08-06 in the `!to.includes`
form — "a registration check must ask whether the registration REMOVES the construct it claims to
remove, its replacement text must not contain it" — so the equality form would supersede a settled
decision to buy a property the obligation already buys.

The freeze remains two lines and one registration; what changed is that the plan no longer claims a
free mechanism it does not have, and no longer claims a verified property it does not have either.

### ⛔ `MOVERFROZEN`'s `NATURAL-b` mutates the REGISTRY, because no mutation of the predicate can redden the cell

Round 2 F3b measured that the first revision's `NATURAL-b` — "the repaired predicate's replacement
text clause is deleted" — cannot kill, and prescribed a two-part form that also weakens the predicate
and removes the wrapper-deletion registration. **Both forms were executed here and BOTH survive.** The
assertion is `assert.equal(registered, frozen)` (`test/swipe-declone-stage2-subtraction.test.js:693`)
where `registered` is a `MUTATIONS.some(…)`; deleting a conjunct from a `some()` predicate can only
move `registered` from false toward true, and post-commit it is already true. MEASURED over the
post-commit registry, `frozen` true throughout:

| Applied mutation | `registered` | assertion |
|---|---|---|
| **CONTROL — none; the repaired predicate over the obligated registry** | true | passes, correctly |
| the `to`-side clause is deleted (one part) | true | **passes — the mutant SURVIVES** |
| the `to`-side clause is deleted AND the wrapper-deletion registration is removed (two parts) | true | **passes — the mutant SURVIVES** |
| the wrapper-deletion registration is removed, predicate intact | **false** | **fails — the cell REDDENS** |
| **the wrapper-deletion registration STOPS REMOVING THE WRAPPER — its replacement text is changed to keep it — predicate intact** | **false** | **fails — the cell REDDENS** |
| the same mutation, evaluated under the pre-repair co-occurrence predicate | true | passes |

**The general fact, stated so a later cell does not repeat the mistake: a clause that WIDENS what a
`some()` rejects is never witnessed by mutating the clause; it is witnessed by the mutant it newly
catches.** No `also` pairing changes that, because both parts of the pair push `registered` in the
same direction as the assertion.

**`NATURAL-b` is therefore the last-but-one row: the wrapper-deletion registration stops deleting the
wrapper.** Its final two rows are the pair that makes it worth registering — it reddens under the
repaired predicate and is invisible to the predicate the repair replaced, so its kill is attributable
to the `to`-side clause and to nothing else. That is §14 part 2 going missing in the one form the
unrepaired gate could not see.

**Three facts the test author needs with it, all measured at `c2369f8`.**

- It targets `tools/mutate.mjs`, which `MUTUNIQ-a` and `MUTUNIQ-b` already do, so it needs **no new
  precedent**. Round 2's note that no registration targets a `test/*.test.js` file reproduces exactly
  — the non-`js/` targets are `test/fixtures/swipe-plan-spec.mjs`, `css/app.css` and
  `tools/mutate.mjs` — but it does not constrain this shape, because the mutation lands on the
  registry rather than on the cell's own predicate. The circularity round 2 flagged, a check asked to
  witness its own weakening, is not entered at all.
- `test/swipe-declone-stage2-subtraction.test.js` is **NOT** in `tools/mutation-sweep.mjs`'s
  `SOURCE_TEXT_GATES` (`:119-125`), so the cell runs in the sweep and can be credited with the kill.
- `test/mutation-anchors.test.js` **IS** excluded there, which matters for this mutant specifically:
  applying it changes `tools/mutate.mjs`, so the mutant's own `from` anchor no longer matches the
  mutated file. Were the anchors gate swept it would redden for that reason and produce the false
  CAUGHT the exclusion list exists to prevent. Any OTHER killer the sweep reports is disclosed at step
  5a in the registry's own convention, not assumed absent.

---

## 13. Coverage Model

Ten dimensions from the auditor's catalog, each marked applicable with what the suite must prove, or
not applicable with the reason. **Absence is a decision.**

⛔ **jsdom has no layout or paint.** No cell below asserts geometry, stacking or paint. Where a cell
speaks of a "measurable box" it asserts the ORDER of calls against a `display:none` write, never a
measured rect — a cell green because a rect is zero would be a false witness.

| # | Dimension | Applicable? | What the suite must prove |
|---|---|---|---|
| 1 | **Lifetime and reuse** | **Yes — the stage's core.** | Exactly one acquire and one effective release per live gesture, across every §3.7 exit; a second release is a no-op; a gesture that arms and never goes live acquires nothing; **and the two paired resources the release owns are released with it — the scroll suspension once per gesture on both the ready and invalidated paths, and the row-hold flag cleared first so a deferred repaint cannot re-defer.** `LEASEPAIRED` (five mutants; the last two are round 1 F4's, which found §7 and §8 citing this cell for effects it did not assert). |
| 2 | **Trust boundaries and hostile inputs** | **Yes, narrowly.** | A stale lease presented after a newer gesture acquired must return `'invalidated'` and reconcile nothing — the stale-finalizer class the token semantics exist for. `LEASEINVALID`. |
| 3 | **Concurrency** | **Yes.** | The interleaving the design permits is supersession: a second gesture acquiring while the first is settling. The first's later release must not reconcile against the second's state. `LEASEINVALID` (supersession route). No thread or worker concurrency exists in this subsystem. |
| 4 | **Shape and platform matrices** | **Yes, as the landing matrix.** | The landed descriptor's two branches — a landing that names a cached browse page and one that does not — on both the commit and the abort outcome. Retained by the existing `LANDEDPAGESHOWS` cells, which this stage must leave green; no new cell. |
| 5 | **Failure and rejection paths** | **Yes.** | A throwing `runFinalize` still releases the lease through the `finally` guard and still clears `finishing`; a destructive Browse operation mid-gesture invalidates and the gesture still settles and reaches IDLE. `LEASEINVALID` + the retained `2 — a throw in finalize restores finishing` and `DESTROYEDMOVER` cells. |
| 6 | **Numerical edges and determinism** | **No.** | The lease carries no arithmetic. The one numeric property — that `null`/`0` is never a valid lease — is a contract fact covered by `LEASEPAIRED`'s sentinel assertion, not a numerical edge. |
| 7 | **Contract claims** | **Yes.** | Every absolute claim in §6 and §8: the status enum has exactly two values; `finishGestureHold` is idempotent; `invalidateGestureHold` is idempotent **in observable effect and not in state** (it consumes a generation per call — §6 qualifies it and the cell must assert the qualified claim, not the flat one); nothing returned is a thenable; the reconciliation body's effects are unchanged. `LEASECONTRACT` + the retained `LANDEDPAGESHOWS` cells as the effect witnesses. |
| 8 | **Composition** | **Yes.** | The lease crossed against: a virtualized source (scroll suspension), a browse→browse pair (two `.browsepage` movers), a landing off browse entirely (the fallback branch), and a mid-gesture nav tap. Covered by driving `LEASEPAIRED` over those four fixtures rather than one. |
| 9 | **Persistence round-trip and version evolution** | **No.** | The lease is process-local and never serialized, stored, or versioned. Nothing in this stage touches IndexedDB, the service worker, or `build.json`. |
| 10 | **Functional achievement (the feature oracle)** | **Yes.** | End to end: a real gesture over the real `Browse` reconciliation leaves exactly the landed page shown and activated, its rows reused rather than rebuilt — the property the hold exists for. Retained `LANDEDPAGESHOWS` + `VR` + `KEEPER`; this stage adds no new oracle because the outcome is unchanged. |

**New mechanism check (the amendment discipline).** Three mechanisms are now in the plan — the status
value, explicit invalidation, and (added at round 1) **the production trace line that reads the
status** — and each was crossed against all ten dimensions rather than only the dimension that
prompted it. Dimension 1 gains `LEASEPAIRED` and its two new clauses; 2/3/5 gain `LEASEINVALID`; 7
gains `LEASECONTRACT`; 9 is not-applicable-with-reason for all three; 4/8/10 are discharged by
retained cells that must stay green. **The trace line's own pass:** lifetime — it holds nothing and
is emitted once per release, covered by `LEASEPAIRED`'s release count; trust — it takes no external
input; concurrency — it reads `session.id` inside `returnLease`, which the ordering in §9 already
pins to run before `endOwnership` nulls the session, so it cannot read a successor's id; failure —
it is guarded by `window.PBDebug` exactly as the three existing lines are, so its absence is not a
throw; contract — `LEASEINVALID`'s `NATURAL-d` is what keeps it reading the value rather than a
constant; persistence and numerics — not applicable, it emits a string; composition and oracle — it
changes no outcome.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
LEASEPAIRED | exactly one lease is acquired and one effective release performed per LIVE gesture across every exit the state machine defines namely a committed settle an aborted settle a supersession during the drag a supersession while settling a vertical abandon an armed cancel and a throwing finalize, and a gesture that arms without crossing the direction lock acquires none at all, and the session field is nulled by the first release so a second release is a no-op, AND the release clears the row hold flag before it does anything else so a deferred repaint cannot re defer, AND the virtual list scroll suspension taken at acquire is released exactly once per gesture on the ready path and on the invalidated path alike | integration boot the app harness and drive each exit in turn asserting the recorded acquire count and the recorded release count and that every release presents the CURRENT lease not a stale one, driven over four compositions namely a virtualized source a browse to browse pair a landing off browse entirely and a mid gesture nav tap; the flag order and the suspension are asserted against the REAL Browse module because the recording fake models the token semantics and not the reconciliation body | FIVE mutants. NATURAL-a the release call is removed from the recovery path so an interrupted gesture leaks its lease. NATURAL-b the session field is not nulled on release so the leak guard in the finalize finally performs a SECOND effective release. NATURAL-c the acquire is moved from the live start to the arm so a gesture that never crosses the direction lock acquires a lease nothing releases. NATURAL-d the scroll suspension release is deleted from the release body so a suspended virtual list never resumes realizing. NATURAL-e the row hold flag clear is moved to the end of the release body so a deferred repaint replayed by the tail re defers itself and never runs. expected killing cell for ALL FIVE is LEASEPAIRED | integration app harness over the real swipe with the recording Browse fake, plus the real Browse module for the flag order and suspension clauses
LEASEINVALID | a lease that is not the live one reconciles NOTHING and reports invalidated, whether it went stale because a newer gesture acquired or because a destructive Browse operation invalidated it, and on that path the deferred repaint queue is discarded rather than replayed and the gesture still settles and still reaches the idle state with no owner, AND the PRODUCTION trace line the release emits carries the status so the gesture announces the outcome of its own release rather than merely storing it | integration drive two routes on the app harness, first a supersession where a second gesture acquires while the first is still settling and the first then releases, and second a destructive cache clear during a live drag followed by the ordinary settle, asserting for each that the reconciliation performed no page activation and no class toggle that no deferred repaint ran and that the active session reads null afterwards; the trace clause asserts over the harness debug capture that a released line was emitted carrying the invalidated status on those routes and the ready status on an ordinary commit, which is what makes the status a production value and not a value only a test reads | FOUR mutants. NATURAL-a the live lease check is removed so a stale release reconciles against the successor's state. NATURAL-b the destructive operation stops invalidating so an outstanding lease still answers ready after its pages were destroyed. NATURAL-c the invalidated branch replays the deferred repaints instead of discarding them so a repaint runs against destroyed controllers. NATURAL-d the trace line stops interpolating the status and logs a constant so the only production reader of the value disappears and the field is dead again. expected killing cell for ALL FOUR is LEASEINVALID | integration app harness with the recording Browse fake and its debug capture, plus the real Browse module for the repaint half
LEASEORDER | the lease is returned BEFORE the screen application that can hide the browse host on the finalize path and AFTER the screen render and the scroll restore on the recovery path, which are the two orderings whose inversions have each shipped as a measured defect namely the empty books page and the dematerialized kept rows | integration assert the ORDER of recorded calls rather than any geometry, driving a commit that leaves browse and asserting the release is recorded before the screen application, and driving a mid drag supersession and asserting the release is recorded after the screen application and after the scroll write; the cell asserts call order only because the harness has no layout and a measured box would be a false witness | TWO mutants. NATURAL-a the release on the finalize path is moved after the screen application which is the empty books page defect. NATURAL-b the release on the recovery path is moved before the screen render which is the dematerialized kept rows defect. expected killing cell for BOTH is LEASEORDER | integration app harness call order
LEASECONTRACT | the boundary exposes exactly the three named entry points with exactly the declared shapes, the status is one of exactly two values, both the release and the invalidation are idempotent, and no promise is returned by any of them so finalization stays synchronous | unit drive the real Browse module directly, asserting the exported key set against an explicit list, asserting a second release with the same lease returns the invalidated status and performs nothing, asserting a second invalidation is inert, and asserting no returned value is a thenable which is what pins the refusal of the plan of record's promise shape | THREE mutants. NATURAL-a a fourth undeclared entry point is exported so the key set drifts. NATURAL-b the release returns a resolved promise so finalization becomes asynchronous. NATURAL-c the second release performs the reconciliation again rather than reporting invalidated. expected killing cell for ALL THREE is LEASECONTRACT | unit over the real Browse module
MOVERFROZEN | the production mover object constructed by the L3 adapter is frozen at construction so a key attached to it after construction cannot ship, and the freeze itself is pinned over source with its deletion registered as a mutation so the guard cannot be removed silently, which is section 14's two part design landing together as its second trigger clause fires, AND the registration check can tell the wrapper deletion mutant apart from a key set mutant re anchored onto the same now frozen expression | source assert over js app that the adapter binding wraps its object literal in the freeze call and re pin the fixture sanity anchor that stops matching when it does, plus a REPAIRED third clause in the trigger gate whose registration predicate additionally requires the registration's replacement text to NOT contain the wrapper, which is what makes it name the mutant that removes the construct rather than any mutant that merely mentions it | TWO mutants. NATURAL-a the freeze wrapper is deleted from the adapter expression which the source pin must catch; the file is non strict so the freeze silences rather than throws which is exactly why the source pin and not a runtime assertion is the witness. NATURAL-b the wrapper deletion registration STOPS REMOVING THE WRAPPER because its replacement text is changed to keep it, so the registry still mentions the wrapper on a from side while nothing removes it, which is section 14 part two going missing in the one form the unrepaired gate could not see; it targets tools mutate mjs the way MUTUNIQ-a and MUTUNIQ-b already do, and MEASURED it reddens under the repaired predicate and passes under the co occurrence predicate the repair replaced, which is what makes its kill attributable to the replacement text clause and to nothing else. ⛔ a mutation that DELETES the replacement text clause is NOT registered and cannot be, measured in both the one part and the two part form: widening a some predicate that is already true can only leave the assertion passing. expected killing cell for BOTH is MOVERFROZEN | source scan over the one L3 adapter expression, plus a structural read of the mutation registry
```

---

## 14. Decisions taken at round 1, and the one open unknown that remains

The first draft filed four blocking questions. **Round 1 ruled that three of them were mis-assigned**
— one was answerable by the contract rather than by interpretation, one was not an independent choice
at all, and one was not answerable at a seat that can only read. They are recorded here as decisions
(D1–D3) and one open unknown (U1), because a question a seat cannot answer is not a blocking question,
it is an unknown wearing one.

### D1 — SETTLED. The status ships, and this stage builds its consumer.

The first draft's question presupposed a diagnostic that exists; it does not (§7). Engineering
Contract §4.15 requires a production consumer **in the same slice** and says a future stage is not
one, so the question resolves by the contract rather than by interpretation. **Decision: ship the
status AND emit it, from one production trace line in `returnLease` (§5), with `LEASEINVALID`'s trace
clause asserting the harness captures it and `NATURAL-d` reddening if the line stops reading the
value.**

*Why this branch and not the fallback.* The fallback — return nothing, keep `invalidateGestureHold`
— costs the whole point of the boundary: invalidation becomes explicit at the producing end while the
gesture stays unaware of the outcome of its own release, which is what HEAD already does. The chosen
branch costs one guarded log line of the same shape as the three that already exist
(`js/app.js:399`, `:535`, `:699`) and makes every other clause in `LEASECONTRACT` and `LEASEINVALID`
real. **The fallback is not retained as a live option**; recording it as still-available would leave
§11's PolicyLedger classification conditional on a choice that has been made.

### D2 — SETTLED, as a consequence of D1, not as a free choice.

`invalidateGestureHold` is **NEW POLICY**, and the reason is the reporting, not the promotion. The
first draft presented rename-vs-policy as an independent question; it is not — with the status and its
trace line, the gesture announcing the outcome of its own release is a genuine new observable and the
PolicyLedger entry is correct; without them it would be a public rename over a byte-identical body and
the entry must not be written. §11 states the dependency explicitly so a later reader cannot re-open
one half without the other.

### D3 — SETTLED. The freeze is runtime-neutral; its only disturbance is anchor rot, and that is §11's.

Nothing in `js/app.js` writes to a mover object after construction: all six mover-touching sites
(`:557`, `:578`, `:604`, `:617`, `:701`, `:1083`) read `.el`/`.base` or write `m.el.style.…`. So
`Object.freeze` on the literal changes no behaviour, in a non-strict file where it would silence
rather than throw in any case. Its disturbance is `S2-35 MOVERSHAPE`, `S2-36 MOVERSHAPE`,
`S2-39 MOVERSHAPE` and the `ADAPTER_DECL` fixture anchor — all now in §11's declared set, measured
here rather than inherited from another plan's prose. **Not a blocking question; a build-time
verification, and §17 step 5b is its home.**

### U1 — OPEN UNKNOWN, owned by the adversary. Is the `LEASEPAIRED` exit set complete?

**This is not a question for a reading seat, and re-classifying it is round 1's ruling.** §9 records
that the structural guarantee is unavailable at the endpoint — folding the three release sites into
`sessionDone` breaks two measured ordering requirements — so I3 rests on an ENUMERATION, which is the
shape this campaign has been wrong about eight times, every one found by executing.

Two independent readings now exist and agree. The planner's: seven exits drawn from
`PLAN-swipe-reveal.md` §3.7 and the `sessionDone`/`endOwnership` call sites. The plan reviewer's:
acquire at `js/app.js:500`; releases at `:427` (recovery, covering both supersession routes, since
`begin()`'s predicate at `:398` admits `d` mid-drag and `finishing && session` while settling), `:1026`
(commit and abort) and `:1079` (throwing finalize); the two lease-free exits at `:570` (vertical
abandon) and `:591` (armed end) both precede or exclude `start()`, the sole acquire site; and
finalize's stale guard at `:1070` ends a live session without releasing **correctly**, because the
superseding `begin()` already released at `:427`.

⛔ **Two agreeing readings are two readings.** This campaign's eight misses were each confirmed by
reading before they were found by executing. **The adversary's strike (§17 step 2) is the resolution
of U1 and must not be treated as confirmatory of the above.** Commissioned fracture: a reachable exit
that ends a live gesture without returning its lease.
Mapped to coverage: `LEASEPAIRED`.

---

## 15. Risk registry

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **The declared co-change set is measured from the wrong input** — the failure this plan already committed once. The first draft's set was measured from §12's narrow probe while §5 specifies a wider transform, and §17 step 5b's equality rule would then have fired on correct work at roughly twelve to one, at the last step of the build. | **High** | §11 is re-measured from the transform §5 actually specifies, control-first, in three classes; §17 step 5b names the exact transform it must apply, so the probe and the specification cannot drift apart again. ⚠️ **The residual is the same class one layer out:** step 5b measures `from` anchors, and class (b) — a `to` side injecting a retired identifier — is invisible to the anchors gate. Step 5b therefore carries its own `to`-side scan. |
| R2 | **The `LEASEPAIRED` exit enumeration is incomplete**, so I3 is proven over six exits and violated on a seventh. | **High** | U1 routes it to the adversary as the commissioned fracture; two agreeing readings are recorded there as readings and not as an answer. The leak is bounded (§10), so the failure mode is degradation rather than corruption — which is why an enumerated guard is acceptable here and would not be elsewhere. |
| R3 | **A future slice reintroduces `ready`/`await` on the finalize path**, making finalization asynchronous and deferring the stack mutation past a microtask. | **Medium** | `LEASECONTRACT`'s no-thenable assertion pins the refusal, with the promise return as its registered mutant. §6 F1's reopening condition is stated so a legitimate reintroduction is recognisable. |
| R4 | **The status ships with no real consumer** and becomes the exact dead field this campaign exists to delete — the shape the coverage audit's forward read named as the likeliest coordinate for the next externally-found defect. **The first draft was already there**: it cited a consumer that does not exist. | **Medium** | D1 scopes the trace line into this slice, so the consumer is built rather than cited. `LEASEINVALID`'s `NATURAL-d` reddens if the line stops reading the value, which is the route by which the field would silently become dead again. |
| R5 | **The harness fake drifts kinder than reality** — it must gain the status and the invalidation without losing the stale-token discrimination it models deliberately. | **Medium** | `LEASEINVALID`'s second route and `LEASEPAIRED`'s two new clauses drive the REAL Browse module, so the fake cannot be the only witness of the invalidated path or of the reconciliation body. |
| R6 | **The subsystem addendum is scrubbed to a wrong current truth**, because it is stale in several places this stage does not touch (§2 GAP). | **Low** | The scrub is scoped in §11 to the resource vocabulary plus the four named stale claims, each with a `file:line` in §3 for what replaced it. |
| R7 | **`MOVERFROZEN` lands as half of §14's design, with the whole suite green.** ⛔ The first draft rated this Low on a mitigation that does not exist: the trigger gate's clause 3 is made VACUOUS by this commit's own mandatory re-anchoring, because the three re-anchored key-set registrations satisfy its `Object.freeze(` + `toMover` co-occurrence with no wrapper-deletion mutant present. | **Medium** *(raised from Low)* | §12's repair: clause 3's registration predicate gains a `to`-side discriminator requiring the replacement text NOT to contain the wrapper. ⚠️ **Round 2 measured two further defects in that repair and both are closed in §12**: the predicate's uniqueness is an OBLIGATION on the three MOVERSHAPE `to` strings rather than a fact about them (step 5b check 4), and `NATURAL-b` is a registry-side mutant because no mutation of the predicate itself can redden the cell. **The "no new mechanism is needed" claim is retracted.** |
| R8 | **A gate is trusted on a silence it never earned.** The plan gate takes minutes on an artifact this size, and a run given a path in argv instead of a hook payload on stdin exits 0 having parsed nothing. | **Low** | Recorded in the status block and the decision log: this artifact's gate PASS follows a real FAIL-then-fix cycle on the same file, so it is evidence about this artifact and nothing more. Per the persona's own honesty rule a passing gate is necessary and never sufficient; the review seat is the check. |

---

## 16. What this does NOT do, each with its consumer named (U2 deferrals)

**Deferred with a live subject — inherited from stage 6's clause and re-deferred here:**
- **The surviving finalization-plan fields** — `commit.stackEffect`, `commit.screen`, `commit.scroll`,
  `abort.scroll` (§3 row 2), alive as inline decisions at `js/app.js:702-706`, `:1032`, `:1038-1039`.
  Not this stage's subject: they are finalization DECISIONS, and this stage is a resource BOUNDARY.
  **Consumer:** the finalization-decision slice that first reads a declared field, composing on the
  vocabulary `finalizationPlanFor` used to hold. Introducing any of them now would be a dead field.
- **`recoverSession`, the pre/post-stack recovery matrix** (§3 row 6). There is no post-stack recovery
  at HEAD; a throwing finalize leaves the stack mutated and only clears `finishing`. It is NEW POLICY
  (`PLAN-swipe-reveal.md` §8 A), not parity, and it needs its own plan. **Consumer:** the first slice
  that must recover from a failure detected after the stack has been mutated. Note that
  `finishGestureHold`'s `'invalidated'` is one of that matrix's named reasons — that is a coupling, not
  a dependency: the status is produced here and the matrix consumes it later.
- **The I12 null-on-retire remainder** (§3 row 7) — nulling `settleFrame`/`settleTimer` after their
  cancels, and giving the transitionend listener a session-owned handle instead of relying on
  `{once:true}`. **Consumer:** a slice that must distinguish "retired" from "never armed" on a session
  handle. The I12 INVARIANT is already enforced unconditionally, so what is deferred is bookkeeping,
  and the plan reviewer of `PLAN-swipe-stage6b` already ruled that this bookkeeping has no
  DOM-observable witness of its own — deferring it again is that ruling standing, not new debt.

**Not deferred — no subject.** Rows 1, 4, 5, 8, 9 and 10 of §3 are not deferred by this plan and must
not be carried forward by a later one: the thing each names does not exist anywhere in the repo. A
future plan that revives one must first re-establish its subject.

**Not deferred — a DEFENDED REFUSAL, which is a different thing and must not be filed with the six
above.** `sameBrowseHost` (§3 row 3) is not gone: `js/swipe.js:86-91` records a reasoned decision not
to emit it, and `tools/mutate.mjs:432-438` registers a **live** mutant that adds it back to the frozen
classification specifically so a re-introduction reddens a no-dead-fields gate. Its subject exists,
is guarded, and is watched. Round 1 F7 caught the first draft flattening it in with
`paneRemovalPolicy`, which occurs nowhere in the repo at all — and the distinction is exactly what a
future plan revisiting the host projection would need: one of these has a witness telling you why not,
and the other has nothing.

**Deferred, independent, unchanged:**
- **The headline compositor flash** on the incoming-`#browse` family. Untouched
  (`PLAN-swipe-reveal.md` §1/§6: JS cannot observe it; the next diagnostic step is a 60fps screen
  recording, not another instrument). This stage is not sold as a flash fix and changes no reveal
  timing, because there is no reveal timing left to change.
- **The device verification hold.** This stage is CI-verifiable end to end and asserts no paint, so it
  adds nothing to the standing device pass — but it does not discharge it either.

---

## 17. Sequence, owners, exit condition and handoff

This slice rests only on shipped work: Stage 3 (session ownership), Stage 5 (the L1/L2/L3 seam), the
de-clone Stages 1 and 2 (which is what makes the boundary the ONLY remaining stage-7 subject) and the
subtraction pass (whose §14 trigger it discharges). It gates nothing and is gated by nothing in §16.

| # | Step | Owner | State |
|---|---|---|---|
| 1 | Temper this plan | the plan reviewer | **DONE — round 1 (TEMPER, `5c2c065`) and round 2 (TEMPER, `c2369f8`), both applied. Round 3 is NOT owed: the reviewer waived it on condition the amendment stay confined to F1, F3a and F3b, and it did.** |
| 2 | **Resolve U1** — strike the load-bearing promise (below) | the adversary | owed |
| 3 | Author the red suite from §13 | the test author | owed |
| 4 | Build green | the builder | owed |
| 5a | Every mutant executed individually against its target file | the builder | owed |
| 5b | **The blast-radius probe, THREE classes plus the freeze obligation, control first** | the builder | owed |
| 6 | Code review | the code reviewer | owed |
| 7 | Coverage audit | the coverage auditor | owed |
| 8 | Records scrub (§11) | the assistant | owed |

**Step 5b, specified exactly, because its first version measured the wrong input.** Apply **the
transform §5 and §12 together specify** — the session field, the two `Browse.*` call sites, the two
wrapper renames, the `js/browse.js` renames, and the freeze — in memory, control-first (no transform
must rot nothing), and then require all four of:

1. **Class (a):** the rotted `from` set equals §11's declared **thirteen**, the figure for the
   transform this plan specifies. Twelve is the code-only layer and is a sub-measurement, not an
   admissible end state: §6.6 makes the comment rename mandatory, so a build that stops at twelve has
   left current-truth comments describing functions that no longer exist.
2. **Class (b):** the `to`-side scan for `dropRowHold`, `takeRowHold`, `beginHold`, `endHold`,
   `dropHold` **and the session field `.hold`** at a word boundary returns empty after the
   re-anchoring. ⚠️ **The anchors gate cannot see this class** — it checks `from` only — so this scan
   is the only thing standing between a re-anchored registry and a mutant that kills its cell with a
   `ReferenceError` instead of with the defect it names. ⚠️ **The session field is in the scan by
   design, not by luck** (round 2 F1): MEASURED, exactly one `to` string injects `.hold`
   (`stage6c G2/G3`) and it also injects `dropRowHold`, so the five-identifier list happens to catch
   it at HEAD — a future `to` injecting the field alone would be invisible to it, and §5 renames that
   field.
3. **Class (c):** `ADAPTER_DECL` re-pinned; `grep -rn 'endHold\|dropRowHold' docs/ tools/gen-swipe-model.mjs`
   returns nothing with `docs/swipe-model.generated.txt` REGENERATED rather than hand-edited; the
   three comment sites scrubbed; and the whole suite green. ⚠️ The suite is the witness for the eight
   live-reference test files and for nothing else in this class — the generator/generated pair and
   the three comments are green either way, which is why they are named.
4. **The freeze obligation (§12):** the `to` strings of `S2-35 MOVERSHAPE`, `S2-36 MOVERSHAPE` and
   `S2-39 MOVERSHAPE` contain `Object.freeze(` after the re-anchoring, and exactly ONE registration
   satisfies `from.includes('Object.freeze(') && from.includes('toMover') && !to.includes('Object.freeze(')`
   — the wrapper-deletion mutant. ⚠️ **No gate can see this**, and the minimal correct-looking
   re-anchoring makes all three MOVERSHAPE registrations match the predicate as false wrapper
   deletions (measured: three, §12). This check is four lines against the exported `MUTATIONS`.

A measured set larger than the declared one is a blast-radius miss and the plan is amended before the
commit lands. **A measured set SMALLER than the declared one is also a stop** — it means the
transform applied is not the transform specified, which is precisely how the first draft got its
number.

**Exit condition.** All of: every §13 cell active, green and mutation-verified; §11's measured
co-change set equal to its declared set across all three classes with step 5b's fourth check green
(exactly one registration matching §12's predicate, and it is the wrapper-deletion mutant); §14's
D1–D3 holding and **U1
resolved by the adversary rather than by a third reading**; the PolicyLedger entry reconciling; the
§11 scrub complete; the campaign manifest `Claude/Campaigns/swipe-stage7.json` reading COMPLETE with
every gate's verdict filed. **This stage is CI-complete — it owes no device gate**, because no cell
asserts geometry, stacking or paint, and the standing device hold is unaffected by it either way.

**The load-bearing promise, commissioned to the adversary.** *Every live gesture returns its lease
exactly once, on every exit the state machine can reach, and a lease that is not the live one
reconciles nothing.* The fracture to hunt is an exit path that returns without releasing — §9 records
that the endpoint fold which would make this structural is a trap, so the guarantee is enumerated and
an enumeration is where this campaign's defects live. Provable on the real DOM through the app
harness.

**Handoff order:** **the adversary** (resolve U1 by striking the promise above) → **the test author**
(red suite from §13; `LEASEPAIRED` red-first over all seven exits, `LEASEINVALID`'s trace clause
red-first, and `MOVERFROZEN`'s repaired clause-3 predicate red-first against the registry-side
`NATURAL-b` §12 specifies) → **the builder** (green; the renames, the status, its trace line, the
explicit invalidation, the §12 freeze pair with its `to`-side obligation, and the class (a)+(b)+(c)
re-anchoring — `from` AND `to` — all in the SAME commit) → **the code reviewer** → **the coverage
auditor**.

**Campaign definition of done:** `Claude/Campaigns/swipe-stage7.json` (to be authored at step 1's
close). ⚠️ Its `verdictArtifactGlob`s must carry a wildcard on the stem so a later round's `-rN`
artifact is visible to the stage gate.

---

## 18. Coordinates re-measured at `29c4978`, and what moved beyond them

**Why this pass was owed.** Every `file:line` in §1–§17 and in the `vitruvius-gate` declaration was
measured against a tree that no longer exists. `PLAN-swipe-navstack-settle-window.md` was built
underneath this plan across `8acbdff` and `9506f3a`, and it edits `js/app.js` inside two of the five
declared `source_ranges`. `js/app.js` goes 3096 → 3112 lines. A declared range that names the wrong
lines sends the project adapter over the wrong source, and a prose citation that names the wrong line
sends the builder to the wrong construct.

**Method, and why it is not an offset.** Each coordinate was re-derived by taking the line text at
`c2369f8` and locating that exact text in `js/app.js` at `29c4978`; where the text is not unique the
construct was disambiguated by its neighbours. No coordinate was obtained by adding a shift to an old
number. **The shift is not uniform**: two expansion hunks produce three regimes.

| Region of the OLD file | Hunk | Shift |
|---|---|---|
| lines 1–698 | `@@ -350,5 +350,5 @@` — five comment lines replaced by five | **0** |
| lines 700–1032 | `@@ -699 +699,12 @@` — one line becomes twelve | **+11** |
| lines 1033–3096 | `@@ -1032 +1043,6 @@` — one line becomes six | **+16** |

### 18.1 The `vitruvius-gate` block — every coordinate re-derived

| Declared | The construct it names | At `29c4978` | Shift |
|---|---|---|---|
| `js/app.js:346-374` | the `session.hold` ownership comment through `dropRowHold`'s closing `};` | `346-374` | 0 |
| `js/app.js:424-428` | `const cur = d \|\| session;` through `finishing = false;` in `begin()`'s hard reset | `424-428` | 0 |
| `js/app.js:499-500` | `revealBase = snapBrowse(true);` and `takeRowHold();` in `start()` | `499-500` | 0 |
| `js/app.js:1022-1026` | the "Release the row hold BEFORE applyScreen" comment through `dropRowHold();` | **`1033-1037`** | **+11** |
| `js/app.js:1071-1081` | the "Order matters" comment through the finalize `finally`'s closing `}` | **`1087-1097`** | **+16** |
| `js/browse.js:117-140` | the owned-token comment through `beginHold`'s `return ++holdGen; }` | `117-140` | 0 |
| `js/browse.js:242-248` | the invalidation comment through `dropHold`'s closing `}` | `242-248` | 0 |
| `js/browse.js:960-968` | the export object region | `960-968` | 0 |
| `callee_ranges` `js/browse.js:159-223` | the `landed` comment through `endHold`'s closing `}` | `159-223` | 0 |

`js/browse.js` and `test/app-harness.js` are byte-unchanged since `c2369f8` (`git log c2369f8..HEAD`
on each returns no commit), and every construct above was still read at `29c4978` rather than
inferred from that.

**`affected_contracts` — all eight re-derived, none moved.** `js/browse.js:964` (`beginHold, endHold,
pageElFor,`); `js/app.js:349` (`takeRowHold`'s definition); `js/app.js:373` (the
`Browse.endHold(t, currentDesc())` call); `test/app-harness.js:593` and `:597` (the fake's
`beginHold`/`endHold`); `tools/mutate.mjs:1`; `Claude/Subsystems/swipe-reveal.md:41` (the file changed
at `9506f3a`/`8e114e0`, but its only hunk is at line 174, so line 41 holds);
`Claude/Decisions/PolicyLedger.mjs:1`.

### 18.2 Prose coordinates in §1–§17 that moved

`js/app.js`, re-derived by construct: `:701` → **`:712`**; `:702-706` → **`:713-717`**; `:708` →
**`:719`**; `:1012-1015` → **`:1023-1026`**; `:1026` → **`:1037`**; `:1032` → **`:1047-1048`**;
`:1038-1039` → **`:1054-1055`**; `:1048` → **`:1064`**; `:1055` → **`:1071`**; `:1060` → **`:1076`**;
`:1070` → **`:1086`**; `:1078-1081` → **`:1094-1097`**; `:1079` → **`:1095`**; `:1083` → **`:1099`**;
`:1084` → **`:1100`**.

`tools/mutate.mjs` (changed at `8acbdff`, `9506f3a`, `14352b7`; shift +101 at these sites):
`:432-438` → **`:533-539`**; `:434-438` → **`:535-539`**; `:555-564` → **`:656-665`**.

**Unmoved and re-verified, not assumed:** `js/app.js:330`, `:346`, `:349`, `:373`, `:386-390`,
`:398-431`, `:399`, `:413-416`, `:424-428`, `:427`, `:499-500`, `:511-513`, `:515-533`, `:535`,
`:557`, `:570`, `:578`, `:591`, `:604`, `:616`, `:617`, `:645`; every cited line in `js/swipe.js`,
`js/nav.js`, `js/virtuallist.js`, `css/app.css`, `test/app-harness.js` (including `:632`),
`test/swipe-declone-stage2-subtraction.test.js`, `tools/mutation-sweep.mjs` and
`tools/gen-swipe-model.mjs` — none of those files changed since `c2369f8`. `index.html:233` still
loads `js/debug.js` (the file changed; only the cache-busting query string on that line did).

### 18.3 Stale beyond coordinates — findings, not formatting

**(1) The landed descriptor gained a THIRD case, and §13 dimension 4 enumerates two.** The slice
introduced `applies` (`js/app.js:706-709`), so a commit now has two outcomes: an APPLIED commit, whose
stack mutation runs, and a **stack-SUPERSEDED commit**, whose mutation is skipped because a newer
navigation moved the stacks inside the settle window. The source comments this plan quotes were
rewritten to say so (`js/app.js:350-354`, `:1033-1036`): on a stack-superseded commit `currentDesc()`
— the single read of the landed screen, and the value handed to `finishGestureHold` — names whatever
screen the newer navigation reached, **not this gesture's destination**. §6 F3 and §8 describe `landed`
against two outcomes, and §13 dimension 4 states the matrix as "both the commit and the abort
outcome". At `29c4978` there are three. **Nothing in stage 7's own change alters this** — the rename
and the status carry the descriptor through unchanged, and the `LANDEDPAGESHOWS` cells are green at
`29c4978` — so this is a matrix that is short one arm, not a broken prescription. Whether the third
arm owes a cell is the coverage auditor's call and is **not decided here.**

**(2) Two deferred subjects in §3 row 2 grew an arm.** `commit.stackEffect` is no longer three
unconditional branches: they are guarded by `applies` (`js/app.js:713-717` behind `:706-709`).
`commit.screen`/`commit.scroll`/`abort.scroll` are no longer one line: they are three branches at
`js/app.js:1047-1056`. The deferrals in §16 stand and their consumers are unchanged; their subjects
are larger than §3 row 2 describes.

**(3) §11's co-change measurement was taken over a 152-entry registry; `MUTATIONS.length` is 163 at
`29c4978`. RE-MEASURED — the declared figures hold, membership identical.** Measured by importing the
exported `MUTATIONS` in a subprocess (never the mutating CLI) and scanning each registration's `from`
and `to`, including `also`, at a word boundary for `takeRowHold`, `dropRowHold`, `beginHold`,
`endHold`, `dropHold` and for `.hold`:

| Measured at `29c4978` | Result |
|---|---|
| class (a) — `from` naming a retired identifier or the session field | **10**, plus the three `toMover` re-anchorings = **thirteen**, by the same names §11 lists |
| class (b) — `to` injecting a retired identifier | **nine**, by the same names §11 lists |
| `to` strings injecting the session field `.hold` | **one** — `stage6c G2/G3`, exactly as §17 step 5b clause 2 records |
| `to` strings of `S2-35`/`S2-36`/`S2-39 MOVERSHAPE` containing `Object.freeze(` | **none** — round 2 F3a's measurement reproduces, so §12's OBLIGATION stands |
| `grep -rn 'endHold\|dropRowHold' docs/ tools/gen-swipe-model.mjs` | **six lines in two files**, at the same coordinates §11 class (c) item 2 declares |

**None of the eleven registrations added since `c2369f8` touches the retired identifiers**, so §17
step 5b's equality rule stands unchanged at thirteen and nine. The stale content is §11's stated
input: "Registry size at measurement: 152" and "the registry is 152 entries" — the figures derived
from it are re-measured true at 163.

**(4) §12 and §14 D3's six mover-touching sites are the same six.** `.movers` occurs at
`js/app.js:542`, `:543` (construction) and `:557`, `:578`, `:604`, `:617`, `:712`, `:1099` (read /
`m.el.style` write) — the identical set, at `:701` → `:712` and `:1083` → `:1099`. The slice adds no
assignment terminating at depth 1 on a mover-rooted expression, so §12's ruling input is undisturbed.

**(5) The strike's coordinates moved; its exit set did not.**
`Claude/Loki/STRIKE-swipe-stage7-lease-exits-2026-08-06.md` (`d0201d7`) was executed against HEAD
`734b393`, **before** the slice, and cites `js/app.js:1026` and `:1078-1081` (now `:1037` and
`:1094-1097`). MEASURED: the slice's added lines contain **no `return` token**, every addition lands
inside `runFinalize` (`:682`–`:1058`) between its entry and its `finishing = false`, and the acquire
site (`:500`) and all three release sites (`:427`, `:1037`, `:1095`) are unchanged in identity. **The
verdict is not re-opened here**; what is recorded is that no reachable exit was added or removed.

**(6) Two records-currency defects, left for the assistant.** The status block and §17 step 2 predate
the strike: they read "next seat is the adversary" and step 2's state is "owed", while the strike is
filed and returned HELD STONE with U1 resolved by execution. Separately, **no plan-review artifact for
this plan carries a FORGE verdict** — `Claude/Charpy/` holds `-r1` and `-r2` for stage 7, both TEMPER
with round 3 waived; the three-round FORGE (`b1cbcd0`) belongs to
`PLAN-swipe-navstack-settle-window.md`. Correcting a seat's state or a verdict is outside this pass.

**(7) One pre-existing imprecision, not slice-induced and not corrected.** `source_ranges`
`js/browse.js:960-968` covers two lines of the preceding function (`960-961`) and stops one line short
of the export object's close; the object literal is `963-969`. It was the same at `c2369f8`. Changing
it changes what the project adapter scans, which is a scope decision rather than a coordinate
correction.
