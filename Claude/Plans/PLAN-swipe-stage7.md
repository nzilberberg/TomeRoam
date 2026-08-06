# PLAN — swipe/reveal Stage 7: replace the Browse hold calls with the lease interface

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor",
  "patterns":{"boundary_relocation":false,"callee_replacement":true,"contract_shape":true,"state_transfer":true,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/app.js:346-374","js/app.js:424-428","js/app.js:499-500","js/app.js:1022-1026","js/app.js:1071-1081","js/browse.js:117-140","js/browse.js:242-248","js/browse.js:960-968"],
  "callee_ranges":["js/browse.js:159-223"],
  "affected_contracts":["js/browse.js:964","js/app.js:349","js/app.js:373","test/app-harness.js:593","test/app-harness.js:597","tools/mutate.mjs:1","Claude/Subsystems/swipe-reveal.md:41","Claude/Decisions/PolicyLedger.mjs:1"],
  "staged_records":["Claude/Plans/PLAN-swipe-reveal.md","Claude/Subsystems/swipe-reveal.md","Claude/Zelda/Board.md","Claude/Decisions/DecisionLog.md","Claude/Campaigns/swipe-stage7.json"],
  "blocking_questions":["LEASEPAIRED","LEASEINVALID","LEASEORDER","MOVERFROZEN"]} -->

Status: **DRAFT — not reviewed. Blocked on the plan reviewer.** Nothing here is cleared to build.

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
14. [Blocking questions](#14-blocking-questions)
15. [Risk registry](#15-risk-registry)
16. [What this does NOT do, each with its consumer named (U2 deferrals)](#16-what-this-does-not-do-each-with-its-consumer-named-u2-deferrals)
17. [Sequence, owners, exit condition and handoff](#17-sequence-owners-exit-condition-and-handoff)

---

## 1. What this plan is, and the one fact that changed its shape

`PLAN-swipe-reveal.md` §7 stage 7 is one line: *"Replace Browse hold calls with the lease
interface."* Its substance was expected to come from the DEFERRED-to-7 clause at the end of stage 6's
entry — ten items, each said to be "behind the consumer that does not yet exist."

**That clause was written before 6f, 6g, 6h, 6i, before de-clone Stages 1 and 2, and before the
subtraction pass. It has now been checked against current source, item by item, and seven of the ten
items no longer have a subject in the tree.** §3 carries the table with a `file:line` for every
determination. The de-clone removed every owned pane, so the pane-lifecycle work that was the bulk of
the clause — `pane.release()`, the pane object, the `dispose(reason)` enum, pane-owning supersession,
the `.nav-ghost` production guard — has nothing left to be done to. Two further items (the two
real-view transform eliminations) had their PREMISE INVERTED: 6f's axis was *never transform the real
in-flow view*, and the ratified design at HEAD is that **every** transition moves its real element.

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

Four verdicts are used. **Still deferred** — subject alive, not built, deferred again with a consumer.
**Already built** — shipped and consumed at HEAD. **Unreachable** — the code exists but no path
reaches it. **Subject deleted** — the thing the item was about is not in the tree.

⚠️ Every row below is a **source reading** unless its Evidence cell says MEASURED. Reading is what has
been wrong eight times in this campaign; the rows most likely to be wrong are the ones that assert an
absence, and §12's method (apply the transform, run the gate, control first) is the one that settles
those cheaply when a build needs certainty.

| # | Deferred item | Verdict | Citation | Evidence |
|---|---|---|---|---|
| 1 | `F(release)` — the paint-gated `pane.release()` half (I10/I17 reveal centralization) | **Subject deleted** | `js/app.js:708` (`holdGhostUntilPaintable` — DELETED), `js/app.js:645` (`fadePanes`/`FADE_MS` — DELETED), `js/app.js:1012-1015` (no hold, no pane to drop; `cover.dropAt` set unconditionally), `js/swipe.js:181-192` (`constructionPlanFor` emits only `real-source`/`real-destination`) | reading + MEASURED (`no-view-clone-gate`, `retired-concepts-purge`, `swipe-construction` all green at HEAD, 50/50) |
| 2 | the rest of the finalization plan (`commit`/`abort-scroll`/`stackEffect`/`reveal` + the unified `planFor()` wrapper) | **SPLIT.** `reveal` and `paneRemovalPolicy`: subject deleted. `abort.render`: subject deleted. `commit.stackEffect`, `commit.screen`, `commit.scroll`, `abort.scroll`: **still deferred** — alive as inline decisions | deleted half: `js/swipe.js:18-23` (`finalizationPlanFor` retired with its `abortRender` decision); alive half: `js/app.js:702-706` (the three-branch stack effect), `js/app.js:1032` (commit screen + scroll), `js/app.js:1038-1039` (abort screen + scroll) | reading |
| 3 | `sourceHost` / `destinationHost` / `sameBrowseHost` host fields | `sourceHost`/`destinationHost`: **already built**. `sameBrowseHost`: **subject deleted** | built: `js/swipe.js:111-114` (projection), `:129` (emitted), `:240`+`:251`+`:260` (consumed by `buildConstruction`), `js/app.js:511-513`+`:515-533` (the env branch selectors). deleted: `js/swipe.js:86-91` — its only planned consumer, the stage-6 abort re-render, was retired with the clone | reading |
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
| `contract_shape` | **true** | The Browse public surface changes: two exported names are replaced and one is added. Gated by the exact-key contract gate reference in §6. |
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
  `takeLease`/`returnLease`; `returnLease` reads the status and records the outcome on the session for
  the retained diagnostic trace (`PLAN-swipe-reveal.md` §7, "lease acquired/released").

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
object, so `test/contract-function-gate.test.js`'s exact-key check does not govern it today; the
migration in §11 states which gate does. `Swipe.buildConstruction`'s `NON_CONTRACT` exemption is
untouched by this stage.

```
Browse.beginGestureHold() -> Lease
    Lease := opaque, non-forgeable-by-accident handle. Currently a monotonic integer.
             `null` is NEVER a valid lease and is the released sentinel on the session.

Browse.finishGestureHold(lease: Lease, landed: Descriptor|null) -> 'ready' | 'invalidated'
    'ready'        the lease was live; the reconciliation ran to completion.
    'invalidated'  the lease was not the live one; NOTHING was reconciled.
                   Idempotent: a second call with the same lease also returns 'invalidated'.

Browse.invalidateGestureHold() -> void
    Idempotent. Called by every destructive Browse operation. After it, every outstanding
    lease answers 'invalidated'.
```

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
release status | value | in | Browse finishGestureHold | the swipe returnLease wrapper which records it on the session for the retained diagnostic trace | Browse | one value per release call | LEASEINVALID cell
landed descriptor | value | out | the swipe currentDesc read at the release call | the Browse landed branch selector | the swipe | read once per release | LANDEDPAGESHOWS cell retained
invalidation | behavior | out | Browse reset and clearCache through invalidateGestureHold | every outstanding lease which then answers invalidated | Browse | from the destructive operation until the next acquire | LEASEINVALID cell
scroll suspension | behavior | inout | beginGestureHold sets it and finishGestureHold and invalidateGestureHold clear it | the virtual list scroll realize handler | Browse | one gesture | LEASEPAIRED cell scroll suspension assertion
deferred repaint queue | state | inout | the Browse render path while the lease is live | the finishGestureHold replay tail | Browse | one gesture, replayed once on ready and discarded on invalidated | LEASEINVALID cell repaint assertion
release ordering against the screen application | behavior | inout | the swipe finalize which calls returnLease before applyScreen | the Browse fallback activation which needs a measurable container | the swipe | one release per gesture | LEASEORDER cell
```

**U4 consumer-now check, stated per row.** The lease handle, the session field, the landed descriptor,
the scroll suspension, the deferred-repaint queue and the ordering all have production consumers at
HEAD and keep them. **`release status` is the one NEW value, and its consumer is the retained
diagnostic trace that `PLAN-swipe-reveal.md` §7 requires to survive the migration** ("resources
acquired/released · lease acquired/released"). §14 F1 asks the plan reviewer to rule on whether a
required diagnostic satisfies EC §4.15, and carries the fallback design if it does not.

---

## 8. Observable-effect ownership across the replaced callee (U7)

The replaced callee is `endHold` (`js/browse.js:165-223`). Its observable surface is much larger than
its signature. Every effect below survives, on the same layer, in the same order; the table exists so
that "the body is unchanged" is a checkable claim rather than an assurance. The callee toggles the
`parked` and `hidden` classes on `.browsepage` elements — both named here so the change cannot be
read as silently altering page visibility.

```vitruvius-effects
# effect | owner | predecessor | successor | verification
clear the row-hold flag before anything else so a deferred repaint cannot re-defer | Browse finishGestureHold | the live-lease check | release the scroll suspension | LEASEPAIRED cell
release the virtual-list scroll suspension | Browse finishGestureHold | the row-hold flag clear | compute the landed key | LEASEPAIRED cell scroll suspension assertion
deactivate every non-landed controller while its box still measures | Browse finishGestureHold | compute the landed key | the parked and hidden class toggles | LANDEDPAGESHOWS cell retained
remove parked and set hidden on every page except the landed one | Browse finishGestureHold | the deactivate loop | activate and realize the landed page | LANDEDPAGESHOWS cell retained
activate and realize the landed page exactly once against the settled scroll | Browse finishGestureHold | the class toggles | replay the deferred repaints | LANDEDPAGESHOWS cell retained
the fallback branch for a landing that names no cached browse page | Browse finishGestureHold | the landed key lookup miss | replay the deferred repaints | LANDEDPAGESHOWS browse to home half retained
replay every deferred repaint exactly once and clear the queue | Browse finishGestureHold | the landed or fallback branch | return the ready status | LEASEINVALID cell repaint assertion
return a status naming whether the reconciliation ran | Browse finishGestureHold | every effect above | the swipe records it for the retained trace | LEASEINVALID cell
perform NONE of the effects above and discard the deferred repaints | Browse invalidateGestureHold | a destructive Browse operation | every outstanding lease answers invalidated | LEASEINVALID cell
```

**The `invalidated` path is a deliberate NO-OP on the reconciliation surface, and that is parity.**
`dropHold()` already clears the queue and releases the scroll suspension without reconciling, because
the pages it would reconcile are being destroyed in the same call. This stage names that behaviour and
makes it observable to the gesture; it does not change it (EC §4.19: behaviour-preserving extraction,
plus one NEW POLICY item — the status value itself — declared in §11).

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

**⭐ The MEASURED co-change item.** Applying the lease transform to `js/app.js` and running the
anchors gate reddens exactly one registration:

> `#120 [js/app.js] S2-20 LANDEDPAGESHOWS: the landed descriptor is read BEFORE the screen is applied…`

It is re-anchored in the same commit. **This was found by executing the transform, not by reading the
registry** — which is this campaign's R10 ruling applied rather than restated. The builder runs the
same probe before committing (§17 step 5b) and the measured rot set must equal this declared one; a
larger measured set is a blast-radius miss and the plan is amended before the commit lands, not after.

**Records scrubbed on approval (StandardsDocument §6.6):**
- `Claude/Plans/PLAN-swipe-reveal.md` — a one-line pointer on the stage-7 entry to this plan. **The
  stage-6 entry is not restructured**; §3 of this plan is the record of what its DEFERRED-to-7 clause
  now means.
- `Claude/Subsystems/swipe-reveal.md` — the resource vocabulary, plus the stale `disposeOwnedPanes` /
  `holdGhostUntilPaintable` / `dropPanes` / `translateZ(0)` / stage-7 inheritance text (§2 GAP, §3).
- `Claude/Decisions/DecisionLog.md`, `Claude/Zelda/Board.md`, `Claude/Campaigns/swipe-stage7.json`.

**PolicyLedger (EC §4.19).** One NEW POLICY entry: *a destructive Browse operation invalidates the
lease explicitly, and the gesture learns the outcome of its own release.* Everything else in this
stage is behaviour-preserving extraction. The entry is `knownRed: false` and names `LEASEINVALID` as
its enforcing test, so `test/policy-ledger-gate.test.js` reconciles it.

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

**Ruling.** The mechanical trigger does **not** fire: this stage writes no mover member and touches
`.movers` in no new form, and the control proves that negative is evidence rather than silence.
**§14's SECOND clause DOES fire** — the release status is a new value threaded to the settle path.
The gate is silent there by construction, and §14's own text is explicit that what makes a deferral a
scheduled gate rather than a backlog line is something that fires at the trigger.

**Therefore this plan carries §14's two-part design as a required deliverable** (`MOVERFROZEN`, §13):
wrap the adapter literal in `Object.freeze(` **and** pin that wrapper in the source assertion with its
deletion registered as a mutant. ⛔ Neither half is sound alone — `js/app.js` is non-strict, so the
freeze silences an offending write instead of throwing. The gate's clause 3 already checks both
directions and will redden if one half lands without the other, which is what makes this cheap to get
right. It is two lines and one registration; the reason it is in scope rather than deferred again is
that the trigger has fired and a deferral cannot be renewed by the change that trips it.

---

## 13. Coverage Model

Ten dimensions from the auditor's catalog, each marked applicable with what the suite must prove, or
not applicable with the reason. **Absence is a decision.**

⛔ **jsdom has no layout or paint.** No cell below asserts geometry, stacking or paint. Where a cell
speaks of a "measurable box" it asserts the ORDER of calls against a `display:none` write, never a
measured rect — a cell green because a rect is zero would be a false witness.

| # | Dimension | Applicable? | What the suite must prove |
|---|---|---|---|
| 1 | **Lifetime and reuse** | **Yes — the stage's core.** | Exactly one acquire and one effective release per live gesture, across every §3.7 exit; a second release is a no-op; a gesture that arms and never goes live acquires nothing. `LEASEPAIRED`. |
| 2 | **Trust boundaries and hostile inputs** | **Yes, narrowly.** | A stale lease presented after a newer gesture acquired must return `'invalidated'` and reconcile nothing — the stale-finalizer class the token semantics exist for. `LEASEINVALID`. |
| 3 | **Concurrency** | **Yes.** | The interleaving the design permits is supersession: a second gesture acquiring while the first is settling. The first's later release must not reconcile against the second's state. `LEASEINVALID` (supersession route). No thread or worker concurrency exists in this subsystem. |
| 4 | **Shape and platform matrices** | **Yes, as the landing matrix.** | The landed descriptor's two branches — a landing that names a cached browse page and one that does not — on both the commit and the abort outcome. Retained by the existing `LANDEDPAGESHOWS` cells, which this stage must leave green; no new cell. |
| 5 | **Failure and rejection paths** | **Yes.** | A throwing `runFinalize` still releases the lease through the `finally` guard and still clears `finishing`; a destructive Browse operation mid-gesture invalidates and the gesture still settles and reaches IDLE. `LEASEINVALID` + the retained `2 — a throw in finalize restores finishing` and `DESTROYEDMOVER` cells. |
| 6 | **Numerical edges and determinism** | **No.** | The lease carries no arithmetic. The one numeric property — that `null`/`0` is never a valid lease — is a contract fact covered by `LEASEPAIRED`'s sentinel assertion, not a numerical edge. |
| 7 | **Contract claims** | **Yes.** | Every absolute claim in §6 and §8: the status enum has exactly two values; `finishGestureHold` is idempotent; `invalidateGestureHold` is idempotent; the reconciliation body's effects are unchanged. `LEASECONTRACT` + the retained `LANDEDPAGESHOWS` cells as the effect witnesses. |
| 8 | **Composition** | **Yes.** | The lease crossed against: a virtualized source (scroll suspension), a browse→browse pair (two `.browsepage` movers), a landing off browse entirely (the fallback branch), and a mid-gesture nav tap. Covered by driving `LEASEPAIRED` over those four fixtures rather than one. |
| 9 | **Persistence round-trip and version evolution** | **No.** | The lease is process-local and never serialized, stored, or versioned. Nothing in this stage touches IndexedDB, the service worker, or `build.json`. |
| 10 | **Functional achievement (the feature oracle)** | **Yes.** | End to end: a real gesture over the real `Browse` reconciliation leaves exactly the landed page shown and activated, its rows reused rather than rebuilt — the property the hold exists for. Retained `LANDEDPAGESHOWS` + `VR` + `KEEPER`; this stage adds no new oracle because the outcome is unchanged. |

**New mechanism check (the amendment discipline).** Two mechanisms enter the plan — the status value
and explicit invalidation — and each was crossed against all ten dimensions above rather than only the
dimension that prompted it. Dimension 1 gains `LEASEPAIRED`, 2/3/5 gain `LEASEINVALID`, 7 gains
`LEASECONTRACT`, 9 is not-applicable-with-reason for both, and 4/8/10 are discharged by retained cells
that must stay green.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
LEASEPAIRED | exactly one lease is acquired and one effective release performed per LIVE gesture across every exit the state machine defines namely a committed settle an aborted settle a supersession during the drag a supersession while settling a vertical abandon an armed cancel and a throwing finalize, and a gesture that arms without crossing the direction lock acquires none at all, and the session field is nulled by the first release so a second release is a no-op | integration boot the app harness and drive each exit in turn asserting the recorded acquire count and the recorded release count and that every release presents the CURRENT lease not a stale one, driven over four compositions namely a virtualized source a browse to browse pair a landing off browse entirely and a mid gesture nav tap | THREE mutants. NATURAL-a the release call is removed from the recovery path so an interrupted gesture leaks its lease. NATURAL-b the session field is not nulled on release so the leak guard in the finalize finally performs a SECOND effective release. NATURAL-c the acquire is moved from the live start to the arm so a gesture that never crosses the direction lock acquires a lease nothing releases. expected killing cell for ALL THREE is LEASEPAIRED | integration app harness over the real swipe with the recording Browse fake
LEASEINVALID | a lease that is not the live one reconciles NOTHING and reports invalidated, whether it went stale because a newer gesture acquired or because a destructive Browse operation invalidated it, and on that path the deferred repaint queue is discarded rather than replayed and the gesture still settles and still reaches the idle state with no owner | integration drive two routes on the app harness, first a supersession where a second gesture acquires while the first is still settling and the first then releases, and second a destructive cache clear during a live drag followed by the ordinary settle, asserting for each that the reconciliation performed no page activation and no class toggle that the status the swipe recorded is the invalidated one that no deferred repaint ran and that the active session reads null afterwards | THREE mutants. NATURAL-a the live lease check is removed so a stale release reconciles against the successor's state. NATURAL-b the destructive operation stops invalidating so an outstanding lease still answers ready after its pages were destroyed. NATURAL-c the invalidated branch replays the deferred repaints instead of discarding them so a repaint runs against destroyed controllers. expected killing cell for ALL THREE is LEASEINVALID | integration app harness with the recording Browse fake plus the real Browse module for the repaint half
LEASEORDER | the lease is returned BEFORE the screen application that can hide the browse host on the finalize path and AFTER the screen render and the scroll restore on the recovery path, which are the two orderings whose inversions have each shipped as a measured defect namely the empty books page and the dematerialized kept rows | integration assert the ORDER of recorded calls rather than any geometry, driving a commit that leaves browse and asserting the release is recorded before the screen application, and driving a mid drag supersession and asserting the release is recorded after the screen application and after the scroll write; the cell asserts call order only because the harness has no layout and a measured box would be a false witness | TWO mutants. NATURAL-a the release on the finalize path is moved after the screen application which is the empty books page defect. NATURAL-b the release on the recovery path is moved before the screen render which is the dematerialized kept rows defect. expected killing cell for BOTH is LEASEORDER | integration app harness call order
LEASECONTRACT | the boundary exposes exactly the three named entry points with exactly the declared shapes, the status is one of exactly two values, both the release and the invalidation are idempotent, and no promise is returned by any of them so finalization stays synchronous | unit drive the real Browse module directly, asserting the exported key set against an explicit list, asserting a second release with the same lease returns the invalidated status and performs nothing, asserting a second invalidation is inert, and asserting no returned value is a thenable which is what pins the refusal of the plan of record's promise shape | THREE mutants. NATURAL-a a fourth undeclared entry point is exported so the key set drifts. NATURAL-b the release returns a resolved promise so finalization becomes asynchronous. NATURAL-c the second release performs the reconciliation again rather than reporting invalidated. expected killing cell for ALL THREE is LEASECONTRACT | unit over the real Browse module
MOVERFROZEN | the production mover object constructed by the L3 adapter is frozen at construction so a key attached to it after construction cannot ship, and the freeze itself is pinned over source with its deletion registered as a mutation so the guard cannot be removed silently, which is section 14's two part design landing together as its second trigger clause fires | source assert over js app that the adapter binding wraps its object literal in the freeze call, plus the existing trigger gate's third clause which already checks the pin and the freeze and the registration in BOTH directions so a half landing reddens | ONE mutant. NATURAL the freeze wrapper is deleted from the adapter expression which the source pin must catch; the file is non strict so the freeze silences rather than throws which is exactly why the source pin and not a runtime assertion is the witness. expected killing cell is MOVERFROZEN | source scan over the one L3 adapter expression
```

---

## 14. Blocking questions

**F1 — Does a diagnostic required by the plan of record satisfy the no-dead-fields rule? Owner: the
plan reviewer.** The release status's only production consumer at this stage is the structured trace
`PLAN-swipe-reveal.md` §7 requires to survive the migration ("lease acquired/released"). Engineering
Contract §4.15 demands "a real production consumer and a test proving that consumer uses it". A trace
line is production code and the harness records it, so the letter is met; whether the spirit is met is
a contract-interpretation question this plan should not settle for itself.
**Recommendation: ship the status.** The alternative below is strictly worse, and the trace is a
deliverable of the parent plan rather than an invention of this one.
**Fallback if ruled insufficient:** `finishGestureHold` returns nothing and `invalidateGestureHold`
still lands, so invalidation becomes explicit at the producing end while the gesture stays unaware.
`LEASEINVALID` then asserts over Browse's own state rather than over the gesture's record, and
`LEASECONTRACT` loses its status clauses. This is a real degradation — the gesture cannot report
`lease released reason=invalidated` — and it is recorded so the choice is visible.
Mapped to coverage: `LEASEINVALID`.

**F2 — Is `invalidateGestureHold` a rename or a new policy? Owner: the plan reviewer.** The body is
today's `dropHold()` unchanged; what is new is that it is public, named, and that its effect is
reportable. §11 files it as NEW POLICY on the strength of the reporting. If the reviewer rules it a
pure rename, the PolicyLedger entry is dropped and `test/policy-ledger-gate.test.js` must not be given
a stale entry.
Mapped to coverage: `LEASEINVALID`.

**F3 — Is the `LEASEPAIRED` exit set complete? Owner: the plan reviewer, then the adversary.** §9
records that the structural guarantee is unavailable at the endpoint, so I3 rests on an ENUMERATION of
exits — precisely the shape this campaign has got wrong eight times. The seven exits named in the cell
are drawn from `PLAN-swipe-reveal.md` §3.7 and from the four `sessionDone`/`endOwnership` call sites in
`js/app.js`. **This is a reading and is labelled as one.** The adversary's commissioned fracture is an
eighth exit that returns without releasing.
Mapped to coverage: `LEASEPAIRED`.

**F4 — Does the freeze wrapper disturb anything the adapter feeds? Owner: the plan reviewer, settled
by the builder's measurement.** §14 states the freeze is behaviour-neutral to the whole suite and that
exactly two things redden — the three anchor registrations on that line and the emitted-key-set
fixture's sanity anchor. That claim is inherited, not re-measured here. Step 5b measures it.
Mapped to coverage: `MOVERFROZEN`.

---

## 15. Risk registry

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **The rename's blast radius is larger than §11 declares.** Four passes in this campaign have declared a co-change set complete and been wrong; the fourth missed two anchors the third had already identified. | **High** | Step 5b: apply the transform in memory and run the whole suite plus the anchors gate BEFORE the commit; the measured failing set must equal §11's declared one, item for item. The one item in §11 was itself produced this way, not by reading the registry. |
| R2 | **The `LEASEPAIRED` exit enumeration is incomplete**, so I3 is proven over six exits and violated on a seventh. | **High** | F3 routes it to the adversary as the commissioned fracture. The leak is bounded (§10), so the failure mode is degradation rather than corruption — which is why an enumerated guard is acceptable here and would not be elsewhere. |
| R3 | **A future slice reintroduces `ready`/`await` on the finalize path**, making finalization asynchronous and deferring the stack mutation past a microtask. | **Medium** | `LEASECONTRACT`'s no-thenable assertion pins the refusal, with the promise return as its registered mutant. F1's reopening condition is stated in §6 so a legitimate reintroduction is recognisable. |
| R4 | **The status ships with no real consumer** and becomes the exact dead field this campaign exists to delete — the shape the coverage audit's forward read named as the likeliest coordinate for the next externally-found defect. | **Medium** | F1 blocks on it rather than assuming it; the fallback design is written so refusing costs a paragraph, not a re-plan. |
| R5 | **The harness fake drifts kinder than reality** — it must gain the status and the invalidation without losing the stale-token discrimination it models deliberately. | **Medium** | `LEASEINVALID`'s second route drives the REAL Browse module for the repaint half, so the fake cannot be the only witness of the invalidated path. |
| R6 | **The subsystem addendum is scrubbed to a wrong current truth**, because it is stale in several places this stage does not touch (§2 GAP). | **Low** | The scrub is scoped in §11 to the resource vocabulary plus the four named stale claims, each with a `file:line` in §3 for what replaced it. |
| R7 | **`MOVERFROZEN` lands as half of §14's design.** | **Low** | The existing trigger gate's clause 3 already checks both directions and reddens on a half landing; no new mechanism is needed. |

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

**Not deferred — no subject.** Rows 1, 3 (`sameBrowseHost`), 4, 5, 8, 9 and 10 of §3 are not deferred
by this plan and must not be carried forward by a later one: the thing each names does not exist. A
future plan that revives one must first re-establish its subject.

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
| 1 | Temper this plan; rule F1–F4 | the plan reviewer | **owed — the gate this plan is blocked on** |
| 2 | Strike the load-bearing promise (below) | the adversary | owed |
| 3 | Author the red suite from §13 | the test author | owed |
| 4 | Build green | the builder | owed |
| 5a | Every mutant executed individually against its target file | the builder | owed |
| 5b | **Apply the transform in memory, run the WHOLE suite and the anchors gate, and require the measured failing set to equal §11's declared one** | the builder | owed |
| 6 | Code review | the code reviewer | owed |
| 7 | Coverage audit | the coverage auditor | owed |
| 8 | Records scrub (§11) | the assistant | owed |

**Exit condition.** All of: every §13 cell active, green and mutation-verified; §11's measured
co-change set equal to its declared set; §14's four questions ruled; the PolicyLedger entry
reconciling; the §11 scrub complete; the campaign manifest `Claude/Campaigns/swipe-stage7.json`
reading COMPLETE with every gate's verdict filed. **This stage is CI-complete — it owes no device
gate**, because no cell asserts geometry, stacking or paint, and the standing device hold is
unaffected by it either way.

**The load-bearing promise, commissioned to the adversary.** *Every live gesture returns its lease
exactly once, on every exit the state machine can reach, and a lease that is not the live one
reconciles nothing.* The fracture to hunt is an exit path that returns without releasing — §9 records
that the endpoint fold which would make this structural is a trap, so the guarantee is enumerated and
an enumeration is where this campaign's defects live. Provable on the real DOM through the app
harness.

**Handoff order:** **the plan reviewer** (temper; rule F1–F4) → **the adversary** (strike the promise
above) → **the test author** (red suite from §13; `LEASEPAIRED` red-first over all seven exits) →
**the builder** (green; the rename, the status, the explicit invalidation, the §12 freeze pair, and the
anchor re-anchor in the SAME commit) → **the code reviewer** → **the coverage auditor**.

**Campaign definition of done:** `Claude/Campaigns/swipe-stage7.json` (to be authored at step 1's
close). ⚠️ Its `verdictArtifactGlob`s must carry a wildcard on the stem so a later round's `-rN`
artifact is visible to the stage gate.
