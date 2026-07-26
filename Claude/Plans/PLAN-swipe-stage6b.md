# PLAN — Swipe/reveal Stage 6b (finalize/settle/reveal async-handle ownership)

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":true,"persistence_migration":false,"lifecycle_ownership":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:539-561","js/app.js:746-796","js/app.js:1142-1161"],"callee_ranges":[],"affected_contracts":["test/swipe-invariants.test.js:220","test/swipe-invariants.test.js:569","test/swipe-invariants.test.js:598","test/swipe-invariants.test.js:623"],"staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"blocking_questions":["DF","SF","RR","EP"]} -->

Status: **DRAFT — for Charpy** (2026-07-26). First Stage-6b slice, following shipped Stage 6a
(supersession pre-stack recovery, build `2026-07-26.246`). Behavior is PARITY at the user-visible layer;
the change is at the resource-ownership contract layer (Engineering Contract §4.3/§4.5/§4.14). Grounded
against HEAD `js/app.js`: `settle()` (539-561), its inner `runFinalize()`/`holdGhostUntilPaintable()`
(693-796), and `finalize()` with the `transitionend` registration + the 340ms fallback (1142-1161); the
session literal (407-409); and the existing I13/I14 resource tests in `test/swipe-invariants.test.js`
(220, 569, 598, 623). Passes the wired Vitruvius authoring gate (machine `vitruvius-ledger`/`vitruvius-
coverage` blocks present; single-owner rows). Sub-slice of `PLAN-swipe-reveal.md` §7 step 6; the
finalization/reveal centralization and the other five deferred workstreams are Stage 6c/7 (§11), with
reasons.

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: false** — no code moves across a module boundary. Every change is in place in
  `js/app.js` `settle()`; `js/swipe.js` is not touched.
- **callee_replacement: false** — no indirection layer (callback/interface/adapter) replaces a direct
  call. The change stores existing timer/listener/frame handles on the session and retires them; it
  introduces no new dispatch layer.
- **contract_shape: false** — no exact-key contract changes. The in-memory gesture session `d` is not a
  registered exact-key contract object (it is not a `classifyTransition`/`buildConstruction` output; it
  is exempt mutable lifecycle state — subsystem §3/§18). Its target shape in `PLAN-swipe-reveal.md` §3.2
  already lists `transitionListener`/`settleTimer`/`revealTimer`/`revealFrames`; this slice REALIZES
  those fields, it does not redefine a closed schema. No `classifyTransition`/`buildConstruction` shape
  moves.
- **state_transfer: false** — no ownership boundary relocates. Each resource is created and retired
  within the same `settle()` scope; nothing crosses a seam. This slice makes the existing ownership
  EXPLICIT (store the handle, null it on retire); it moves no state between owners.
- **async_change: true** — the whole subject is the lifecycle of five asynchronous continuations across
  the settle→finalize→reveal window (the settle `requestAnimationFrame`; the 340ms finalize fallback
  `setTimeout`; the `transitionend` listener; the reveal double-`rAF`; the reveal 600ms safety-net
  `setTimeout`): their session ownership, cancellation, exactly-once resolution under a dual-fire and a
  triple-race, and their inertness when they fire after the session has completed (§9 async section).
- **persistence_migration: false** — the gesture is entirely in-memory and per-process (subsystem §15).
- **lifecycle_ownership: true** — the stage's subject is who OWNS each async handle: the session stores
  it, one retirement site cancels/removes it and nulls the stored handle, and the ownership endpoint is
  reached only when every handle is retired (§7). This is the resource-handle half of the Engineering
  Contract §4.3 explicit-ownership rule, the debt recorded "Owed to stage 6" in the DecisionLog and
  marked OPEN in subsystem §8.

## Index
1. Defining records and authority
2. Exact scope boundary
3. The ownership contract (invariant, not prescription)
4. Value-crossing ledger
5. Async operations — stale completions, cancellation, exactly-once
6. Lifecycle ownership — creation to endpoint, per handle
7. Ordering contract
8. Coverage Model (Mendeleev catalog)
9. Coverage and mutation matrix
10. Records reconciliation (apply on approval)
11. What this does NOT do (deferred to Stage 6c/7, with reasons)
12. Sequencing

## 1. Defining records and authority

Every record that materially defines this slice, its authority, and what this plan changes. Verdict
across the records: **AGREE that the settle/reveal timer and transitionend-listener handles are Stage-6
resource-ownership work owed since the .227 review; the records describe the whole finalization
centralization as Stage 6, and none of them bounds this ownership sub-slice, so bounding it FIRST is a
planning decision grounded in the recorded dependency, not a conflict resolution.**

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `DecisionLog.md` "Owed to stage 6" (2026-07-21) | "when the settle requestAnimationFrame, the settle/reveal timers, or the transitionend listener are cancelled OR fire, NULL their stored session handles (`cur.settleFrame = null`, etc.) so the session object describes LIVE ownership rather than stale numeric handles. ... part of the stage-6 finalization-centralization work." | Active decision ledger (§1.C prose) | Implements it for all five handles; makes the four not-yet-session-owned timers/listener/frames into session handles first, then retires+nulls each (§2, §3) | Update the entry to current truth (closed in 6b); append the 6b closure decision (§10) |
| `Subsystems/swipe-reveal.md` §8 | "OPEN (stage 6): the settle/reveal timers and the transitionend listener are not yet session-owned handles that null on cancel/fire (DecisionLog)." | Subsystem addendum | Closes exactly this OPEN item | Rewrite §8 to current truth (§10) |
| `Subsystems/swipe-reveal.md` §10/§11 | "Asynchronous operations: the settle rAF; the settle/reveal timers; the transitionend listener; the paint-gated pane release. All can fire after the gesture that scheduled them was superseded or finalized. Possible stale completions: a settle rAF firing after finalize (fixed .226: cancel on session)." | Subsystem addendum | Extends the .226 cancel-on-session pattern from the settle rAF to the four remaining async handles; each late fire is now inert by retirement, not only by a flag | Confirm; §10/§11 gain the four newly-owned handles (§10) |
| `PLAN-swipe-reveal.md` §3.2 (session shape) | The target session owns `{ ..., transitionListener, settleTimer, revealTimer, revealFrames, ... }`; "every acquired timer, listener, lease, pane and animation callback is released or invalidated" (I14). | Plan-of-record (strategic) | Realizes those four named fields with real producers/consumers this slice; honors I14 for the settle/reveal window | Annotate §7 step 6 as sub-sliced (§10) |
| `PLAN-swipe-reveal.md` I13 / I14 / I15 | I13: finalization occurs exactly once despite transitionend AND the 340ms timeout both firing. I14: every acquired timer/listener/lease/pane/animation callback is released or invalidated. I15: deferred Browse repaint work is applied exactly once after the hold ends. | Invariants (strategic) | I13 held by RETIREMENT of the loser (not only the `done` flag); I14 extended to the four newly-owned handles; I15 unaffected (Browse-hold owned by 6a, untouched) | — |
| `PLAN-swipe-reveal.md` §7 step 6 | "Centralize finalization and reveal ordering (I10, I17)." | Plan-of-record (staging) | Delivers the resource-ownership foundation the centralization rests on; the state-machine restructure, `finalizationPlanFor`, `sameBrowseHost`, pane lifecycle, I10 reveal-gating and the `recoverSession` matrix stay Stage 6c/7 (§11) | Annotate as sub-sliced (§10) |
| `DecisionLog.md` .223-review dispositions (2026-07-20) | Finding 1b (the settle timer + transitionend listener) and finding 3 (global-session cleanup helpers) were "Deferred to stage 6, unchanged." | Active decision ledger | Finding 1b's timer/listener half is this slice; finding 3 (the `finishing`-gate/global-cleanup) stays deferred (§11) | Note 1b closed (§10) |
| `DecisionLog.md` .226 settle-rAF fix (2026-07-20) | The settle rAF is "stored on the session and cancelled in finalize (build .226)." | Verified production behavior | Read-only precedent: this slice reuses the .226 store-on-session pattern for the four remaining handles and adds the null-on-retire the .226 fix did not include | — |
| `js/app.js` `settle()` (551) | `cur.settleFrame = requestAnimationFrame(...)` — session-owned; cancelled in `finalize` (1146) but NOT nulled after cancel or after a normal fire. | Code under change | Adds null-on-retire to `settleFrame` (§2, cell SF) | — |
| `js/app.js` `finalize()` (1142-1160) | `setTimeout(finalize, 340)` (1160) is a bare local, never stored/cancelled; the `transitionend` listener (1159, `{once:true}`) is a bare local, removed only when it itself fires. Exactly-once is held by the `done` boolean (1143). | Code under change | Stores the 340ms timer as `cur.settleTimer` and the listener registration as `cur.transitionListener`; `finalize` retires the LOSER (clearTimeout / removeEventListener) and nulls both handles (§2, §3, cell DF) | — |
| `js/app.js` `holdGhostUntilPaintable()` (794-795) | The reveal double-`rAF` (794) and the 600ms safety-net `setTimeout` (795) are bare locals; the drop is held exactly-once by the `dropped` boolean (751). | Code under change | Stores the outer reveal `rAF` as `cur.revealFrames` and the 600ms timer as `cur.revealTimer`; the winning `drop()` retires the two losing reveal handles and nulls them (§2, §3, cell RR) | — |

Authority precedence: the active decision ledger's "Owed to stage 6" entry and subsystem §8 GOVERN that
this ownership debt is Stage-6 work; the plan-of-record §3.2/I13/I14 govern the target shape and the
invariants it must honor. No two records disagree on the required behavior; they disagree only on Stage
6's TOTAL size, which this plan bounds to the async-handle ownership foundation.

## 2. Exact scope boundary

Behavioral ownership, not function names. All changes are inside `js/app.js` `settle()` and its inner
`finalize`/`holdGhostUntilPaintable`; no other function, module, or user-visible behavior changes.

**Changes — the four bare async handles become session handles, and all five retire+null:**
- **`cur.settleTimer`** — the 340ms finalize fallback (`setTimeout(finalize, 340)`, 1160) is stored on
  the session. When `finalize` runs from the `transitionend` path, the pending 340ms timer is CLEARED
  (`clearTimeout`) and `cur.settleTimer` nulled. When `finalize` runs from the 340ms path, the timer has
  fired, so the handle is nulled (no clear needed).
- **`cur.transitionListener`** — the `transitionend` registration (anchor + `finalize`, 1159) is stored
  on the session (the anchor element and the handler, sufficient to `removeEventListener`). When
  `finalize` runs from the 340ms path, the still-bound listener is REMOVED and `cur.transitionListener`
  nulled. When `finalize` runs from the `transitionend` path, `{once:true}` has already removed it, so the
  handle is nulled.
- **`cur.revealFrames`** — the reveal outer `requestAnimationFrame` (794) is stored on the session. When
  `drop()` fires from the decode gate or the 600ms safety-net, the pending outer frame is CANCELLED
  (`cancelAnimationFrame`) and `cur.revealFrames` nulled. When `drop()` fires from the paint gate, the
  frame has run, so the handle is nulled.
- **`cur.revealTimer`** — the reveal 600ms safety-net (`setTimeout(() => drop('timeout'), 600)`, 795) is
  stored on the session. When `drop()` fires from the decode or paint gate, the pending timer is CLEARED
  and `cur.revealTimer` nulled. When `drop()` fires from the timeout itself, the handle is nulled.
- **`cur.settleFrame`** — already session-owned and cancelled in `finalize` (1146, shipped .226); this
  slice ADDS the null-on-retire the .226 fix omitted: after `cancelAnimationFrame(cur.settleFrame)` and
  after a normal fire of the frame, `cur.settleFrame` is nulled.

**The retirement rule, stated once (the load-bearing property, §3):** each of the two terminal
resolvers — `finalize` (the settle→finalize handles: `settleFrame`, `settleTimer`, `transitionListener`)
and `drop` (the reveal handles: `revealFrames`, `revealTimer`) — retires EVERY handle in its phase: the
one that fired is nulled, and each one still pending is cancelled/removed and then nulled. Each resolver
closes over its own `cur`, so it retires exactly the correct loser and never a wrong or a successor's
handle (the misattribution mutations of cells DF/RR). A late continuation from a COMPLETED session is
inert by the shipped `done`/`dropped` guards and the shipped settle-`rAF` cancel — unchanged by this
slice (§5); the retirement's own property is that the completed session then names no live handle (field
inspection, cells SF/EP), NOT a defense the continuation reads.

**Stays exactly as today (parity — do NOT re-touch):**
- The exactly-once GUARDS themselves — the `done` boolean in `finalize` (1143) and the `dropped` boolean
  in `drop()` (751) — stay. Retirement is added ALONGSIDE them (belt to their suspenders), not in place
  of them; I13/I15 keep their existing flag defense AND gain resource retirement.
- The finalize choreography: `runFinalize()` (per-mover style clear, stack mutation, `applyScreen`,
  scroll restore), the `try/finally` row-hold envelope (1153-1156), `finishing` restored only on a throw
  (1155), `endOwnership()`/`sessionDone` (1141), and `revealPending` (1094/1111) — all unchanged.
- The reveal choreography: the decode/paint/timeout gate structure (789-795), `fadePanes()` and its
  per-pane removal `setTimeout` (639-650), the flash-probe diagnostics (`ghostVsReal`, `watchFrames`,
  `reportReveal`), `finishing = false; sessionDone(cur)` inside `drop` (784-785) — all unchanged.
- The Browse row hold (`dropRowHold`/`endHold`) — owned and ordered by Stage 6a; untouched.
- `begin()` and the supersession recovery (Stage 6a) — untouched. A superseded session is ARMED or
  DRAGGING (pre-`settle()`), so it holds NONE of these five handles at supersession time (6a §11); this
  slice therefore does not enter `begin()`.

**Split across the seam:** none — no code relocates; this is an in-place ownership addition.

**Deferred to Stage 6c/7 (not needed to close the ownership debt, with reason — §11 expands):**
`finalizationPlanFor()`/rich `planFor()`; normalized `sameBrowseHost`; pane `release()`/`dispose(reason)`/
`equivalence`/`source`/`pin` (§3.6, I8); the `finishing`-gate retirement + the `cur === session`
stale-callback ENFORCEMENT (I12); the I10 paint-gated reveal centralization + I17 generalization; the
full `recoverSession` reason/phase matrix; and the `fadePanes` per-pane removal timer (a self-guarded
owned-decoration cleanup — §11).

## 3. The ownership contract (invariant, not prescription)

**Invariant (the load-bearing promise).** Across the settle→finalize→reveal window, each of the five
asynchronous continuations is a SESSION-OWNED handle with exactly one retirement site:

1. **Finalize phase, one retirement site.** `finalize(cur)` retires all three settle→finalize handles
   (`cur.settleFrame`, `cur.settleTimer`, `cur.transitionListener`): the one that fired is nulled; each
   one still pending is cancelled (`cancelAnimationFrame`/`clearTimeout`) or removed
   (`removeEventListener`) and then nulled. Because `finalize` runs exactly once (the `done` guard,
   unchanged), the loser of the `transitionend`-vs-340ms dual-fire is actively retired, not left bound
   as a no-op (I13 held by retirement + flag, cell DF).
2. **Reveal phase, one retirement site.** The winning `drop(why)` retires both reveal handles
   (`cur.revealFrames`, `cur.revealTimer`): the gate that fired is nulled; each other pending gate is
   cancelled/cleared and then nulled. Because `drop` runs exactly once (the `dropped` guard, unchanged),
   the two losers of the decode-vs-paint-vs-600ms triple-race are retired (I14/I15, cell RR).
3. **The stored handle is nulled at retirement; the DOM stale-write is the shipped cancel's job, not the
   null's.** The null-on-retire makes the completed session truthfully name no live handle (§4.5) — a
   bookkeeping property verified by FIELD INSPECTION (cells SF, EP), whose PRODUCTION consumer is the
   deferred I12 retirement-check (§11). It is NOT a stale-write defense: no continuation reads its own
   handle, and §2/§5 keep the continuations' bodies unchanged. The stale DOM transform a hidden-tab settle
   `rAF` could otherwise write is prevented by the shipped `cancelAnimationFrame(cur.settleFrame)`
   (app.js:1146, .226), which this slice preserves; every other late fire is absorbed by the shipped
   `done`/`dropped` guards. A late continuation is therefore inert by the shipped cancel/guards, not by
   reading a handle (regression cell RGcancel).
4. **Correct-loser retirement, by construction.** Each resolver closes over its own `cur`, so it retires
   exactly the phase's loser and never a wrong handle — the misattribution axis Loki strikes (cells DF,
   RR; §4.10 wrong-owner). This is the retirement's load-bearing, reddening property.
5. **Ownership endpoint.** The session's ownership ends (`sessionDone(cur)`) only after every handle in
   the completed phase is retired; a completed session (`session === null`) names no live handle
   (Engineering Contract §4.5; cell EP).

**Basis (U11).** Items 1-5 are the resource-handle realization of I13/I14/I15 and the "Owed to stage 6"
ledger entry; the mechanism is fixed because exactly one design satisfies it — store the handle on the
session at its scheduling site and retire it at the single phase resolver, exactly as the shipped .226
settle-rAF fix does, extended to the four remaining handles with the null-on-retire the .226 fix omitted.
The *locus* (whether the retirement is an inline block in `finalize`/`drop` or a named helper such as
`retireFinalizeResources(cur)` / `retireRevealResources(cur)`) is a **recommendation**, not a
requirement — any structure that retires+nulls every phase handle at exactly one site satisfies this
contract. There is one admissible behavior; no other section contradicts it.

**Why session handles and not bare locals (U4 consumer-now).** The four bare timers/listener/frames are
already scheduled in production today; storing them on the session gives each a current-slice CONSUMER —
the phase resolver that retires it — so no field is dead (Engineering Contract §4.15). The next stage's
`finishing`-gate retirement and I12 enforcement (§11) will additionally READ these nulled handles to
check "the resource has not already been retired" (§4.6); that FUTURE reader does not justify the fields
now, but the phase-resolver retirement does, so the fields are live at introduction.

**Why parity at the user layer (U11 basis, honesty).** Clearing the 340ms timer when `transitionend`
wins, and removing the listener when the 340ms timer wins, only ELIMINATES a no-op call that the `done`
guard already neutralized — nothing the user can see changes, and the flash-sensitive finalize/reveal
choreography is untouched. The slice's value is at the ownership contract: the session object truthfully
describes live ownership (§4.5), each loser resource is actively released rather than left bound as a
no-op (§4.14), and I12 enforcement + the finalization centralization (§11) gain the clean handle
foundation they require. The late continuation stays inert by the shipped `done`/`dropped` guards and the shipped settle-`rAF`
cancel (RGcancel); the retirement adds that each loser resource is actively released (§4.14) and the
completed session names no live handle (§4.5), which the deferred I12 enforcement consumes. This is stated
as parity-plus-ownership, not as user-visible behavior change.

## 4. Value-crossing ledger

Machine-readable ledger (the prose mirrors the fenced block). Every async handle the slice brings under
session ownership, each with one owner (its single retirement site), its consumer, and its verification.

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
cur.settleFrame settle rAF handle | resource | inout | settle@S6b | finalize@S6b | finalize | per-gesture | SF null-on-retire test
cur.settleTimer 340ms finalize fallback handle | resource | inout | settle@S6b | finalize@S6b | finalize | per-gesture | DF dual-fire retirement test
cur.transitionListener transitionend registration | resource | inout | settle@S6b | finalize@S6b | finalize | per-gesture | DF dual-fire retirement test
cur.revealFrames reveal double-rAF handle | resource | inout | holdGhost@S6b | drop@S6b | drop | per-gesture | RR reveal-race retirement test
cur.revealTimer reveal 600ms safety-net handle | resource | inout | holdGhost@S6b | drop@S6b | drop | per-gesture | RR reveal-race retirement test
```

Notes: every row is `inout` — the handle is produced at its scheduling site (`settle`/`holdGhost`) and
consumed (cancelled/removed and nulled) at exactly one phase resolver (`finalize`/`drop`). Each owner is
a single accountable site. `cur.settleFrame` is already produced+cancelled today (.226); this slice adds
its null-on-retire consumer step. No handle is produced in a stage later than it is consumed (all S6b).

## 5. Async operations — stale completions, cancellation, exactly-once

Named concerns for the `async_change` pattern. No NEW asynchronous surface is created and no timing
changes; the change is the OWNERSHIP and RETIREMENT of five continuations that already exist.

- **Stale completions.** The scenario the retirement defends is a continuation firing AFTER its session
  finalized: a settle `rAF` paused by a hidden tab resumes on foreground after the 340ms timer already
  ran `finalize` (the exact .226 mechanism, subsystem §11); a `transitionend` arriving after the 340ms
  fallback already finalized; a reveal double-`rAF` or 600ms timer firing after another reveal gate
  already dropped the pane. In every case the fired continuation hits its guarded resolver
  (`done`/`dropped`) or, for the settle `rAF`, the shipped `cancelAnimationFrame` (app.js:1146) — so it
  performs no write and no re-entry, unchanged by this slice. The retirement does not gate the continuation
  (§2 keeps the continuations' bodies intact); its own property is that the completed session names no live
  handle (field inspection, cells SF/EP) and each loser resource is released (RGcancel regression). Tests deliberately deliver
  each late fire (deferred `rAF` + fake-clock advance past the fallback, per `test/swipe-invariants.test.js:598`).
- **Cancellation.** Each pending loser is actively cancelled at the phase resolver:
  `cancelAnimationFrame(cur.settleFrame)` (already shipped), `clearTimeout(cur.settleTimer)`,
  `removeEventListener` on `cur.transitionListener`, `cancelAnimationFrame(cur.revealFrames)`,
  `clearTimeout(cur.revealTimer)`. Cancellation precedes nulling so the cancel reads a live handle (§7).
- **Exactly-once.** `finalize` (`done` guard, 1143) and `drop` (`dropped` guard, 751) each run their body
  once; retirement is added inside that single run and does not alter the guards. I13 (finalize once
  despite dual-fire) and I15 (deferred repaint once) keep their flag defense and gain resource retirement
  (cells DF, RR; regression cells at `test/swipe-invariants.test.js:220`, `:569`).
- **Ordering / atomicity.** The retirement is synchronous inside the single-threaded phase resolver;
  there is no re-entrancy because the guard is set before retirement runs. `finishing`/`revealPending`/
  `sessionDone` sequencing is unchanged (§7).
- **No async change to `begin()`/supersession.** A superseded session (ARMED/DRAGGING, pre-`settle()`)
  owns none of these handles, so supersession retirement is a no-op-by-construction and `begin()` is not
  entered (§2).

## 6. Lifecycle ownership — creation to endpoint, per handle

Named concerns for the `lifecycle_ownership` pattern. Who creates, borrows, mutates, releases, restores,
and destroys each handle, and the ownership endpoint.

- **Create.** `settle()` creates `settleFrame` (551) and, newly stored on the session, `settleTimer`
  (from 1160) and `transitionListener` (from 1159); `holdGhostUntilPaintable()` creates, newly stored,
  `revealFrames` (from 794) and `revealTimer` (from 795). Each is stored on `cur` at its scheduling site.
- **Borrow.** The `transitionListener` borrows the real anchor element (`cur.movers[0].el`, a
  borrowed-real node) only to register/unregister a handler; it never mutates or removes the node
  (Engineering Contract §4.4). The timers/frames borrow no DOM.
- **Mutate.** None of these handles mutates session state beyond its own stored slot; the continuations'
  effects (mover transforms in the settle `rAF`; the pane drop in the reveal gates) are unchanged.
- **Release.** The single phase resolver releases each handle: `finalize` retires the settle→finalize
  trio, `drop` retires the reveal pair — cancel/remove the pending ones, null every one (§2, §3). This is
  the retirement half of I14.
- **Restore.** N/A — no state is restored by these handles (the source/scroll restore is Stage 6a's
  `begin()` recovery and the abort's `runFinalize`, both untouched).
- **Destroy.** No node is destroyed by this slice; the owned-pane drop (`fadePanes`) is unchanged. The
  handles themselves are numeric/registration tokens retired by cancel/remove.
- **Endpoint.** `sessionDone(cur)` runs after the completed phase's handles are retired: the no-pane path
  ends in `finalize`→`endOwnership` (1141/1154), the held-reveal path ends in `drop` (785). A completed
  session (`session === null`) names no live handle (§4.5; cell EP). The `settleFrame`-cancel-then-clear
  ordering already obeyed by `finalize` (1146) is preserved; the four new retirements join it at the same
  site.

## 7. Ordering contract

The retirement is ordering-sensitive at one point, and the correctness requirement is stated as an
invariant, not a line number.

**Correctness requirement (cell DF/RR) — cancel before null; retire the loser, never the winner's
successor.** Inside each phase resolver: (1) the exactly-once guard (`done`/`dropped`) is already set
before retirement runs (unchanged), so retirement cannot re-enter; (2) each pending handle is
cancelled/removed while the stored handle is still LIVE, THEN the slot is nulled — nulling first would
make `clearTimeout`/`cancelAnimationFrame`/`removeEventListener` read `null` and leak the resource; (3)
the retirement reads handles off the specific `cur` the resolver closed over, so it retires exactly the
phase's correct loser and never a wrong handle (I12/§4.6; the misattribution mutations of cells DF/RR).

Incidental (not a new universal order): the relative order among the three finalize-phase retirements (or
the two reveal-phase retirements) is unconstrained — they touch independent handles — and the existing
`cancelAnimationFrame(cur.settleFrame)` position (before `runFinalize`, 1146) is preserved, with the
newly-added retirements adjacent to it. `dropRowHold`/`endOwnership`/`finishing` ordering (Stage 6a and
the .223/.226 fixes) is untouched.

## 8. Coverage Model (Mendeleev catalog)

Every catalog dimension marked applicable — with what the suite must prove — or not-applicable, with the
reason. Absence is a defect; a dimension not listed is an omission.

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | Each async handle is created at its scheduling site and retired at exactly one phase resolver; the ownership endpoint is reached only after retirement (cells DF, RR, EP). |
| Identities | N/A | No identifier is created, changed, or reinterpreted; `d.id`/`sessionSeq` semantics are unchanged. |
| Ordering | Yes | Cancel-before-null, and retire the correct loser (misattribution-safe by closing over `cur`) (cells DF, RR, EP). |
| Resources: acquired / owner / endpoint | Yes | The four bare timers/listener/frames become session-owned handles with one retirement site each; a completed session names no live handle (cells DF, RR, SF, EP; §4.3/§4.5/§4.14). |
| Async operations | Yes | A continuation firing after its session finalized (hidden-tab settle rAF resume; late transitionend; late reveal gate) is inert by the shipped `done`/`dropped` guards and the shipped settle-rAF cancel; the retirement additionally releases each loser and nulls its slot (cells DF, RR; regression RGcancel; §5). |
| Stale completions | Yes | The .226 hidden-tab stale-write stays prevented by the shipped `cancelAnimationFrame` (regression RGcancel, `test/swipe-invariants.test.js:598`); the retirement adds field-verified truthfulness that no handle survives on the completed session (cells SF, EP). |
| Normal completion | Yes (parity) | Exactly-once finalize under the transitionend+340ms dual-fire (I13) and exactly-once reveal drop under the decode/paint/timeout race (I15) stay green with retirement added (cells DF, RR; regression `:220`, `:569`). |
| Recovery authority boundary | N/A | This slice does not enter `begin()`/supersession or the recovery path (Stage 6a owns it; a superseded session holds none of these handles — §2). |
| Emergency disposal | N/A | No pane disposal path changes; the orphan-pane hard reset and `dispose(reason)` are untouched (Stage 6a / deferred §11). |
| Persistence | N/A | The gesture is in-memory, per-process (subsystem §15). |
| External side effects | Yes (parity) | The continuations' effects (mover transforms, pane drop, scroll) are unchanged; retirement adds only `clearTimeout`/`cancelAnimationFrame`/`removeEventListener` on losers (cells DF, RR). |
| Invariants | Yes | I13 (finalize once), I14 (every timer/listener/frame released or invalidated), I15 (deferred repaint once) — I14 extended to the four newly-owned handles; I13/I15 keep their flag defense and gain retirement. |
| Mutation cases | Yes | Each cell in §9 names the mutation that reddens it (misattribution/ordering: retire the winner not the loser; null before cancel; retire the wrong session's handle — not only omission). |
| Known-red | N/A | This slice introduces no known-red; PolicyLedger has no active entries after Stage 6a and none is added. |
| Composition | Yes | The retirement composes with the exactly-once guards (`done`/`dropped`) — belt to their suspenders — and with the Stage-6a Browse-hold/supersession lifecycle (a superseded pre-settle session owns none of these handles), and with the future I12 enforcement that reads the nulled handles (cells DF, RR, EP). |
| Contract claims (exact schema) | N/A | No exact-key contract changes (Applicability contract_shape:false); the session `d` is exempt mutable lifecycle state, not a registered `classifyTransition`/`buildConstruction` contract. |
| Concurrency | Yes (parity) | Single-writer within the process; `begin()` still REJECTS while `finishing` (I17), so no second session schedules these handles concurrently; retirement runs inside the single-threaded resolver with the guard already set (cells DF, EP). |

## 9. Coverage and mutation matrix

Every load-bearing promise and parity obligation maps to at least one production-facing test driving the
real `settle()`/`finalize()`/`holdGhostUntilPaintable()` through the app-harness (`test/app-harness.js`
`h.touch` + `h.clock`), each with the mutation that must redden it. Layer: wiring = app-harness driving
the real gesture; the regression rows are existing green tests that must stay green.

The retirement's observable behavior is PARITY (the shipped `done`/`dropped` guards and the shipped
settle-`rAF` cancel already hold every DOM outcome); its honest, reddening coverage is therefore
OWNERSHIP-level — an ownership SPY that the correct loser's `clearTimeout`/`removeEventListener`/
`cancelAnimationFrame` is invoked (misattribution mutation per §4.10, "wrong owner rather than no owner"),
plus FIELD INSPECTION that the completed session names no live handle. This is the SF/EP shape. The DOM
parity that the guards/cancel hold is pinned by regression cells (RGcancel/RG13/RGH/RGT), whose mutation
is "the retirement REPLACES (not joins) the shipped defense."

| id | Behavior proved | Fixture / transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| DF | `finalize` retires exactly the correct dual-fire loser: when `transitionend` wins, `clearTimeout` is invoked on `cur.settleTimer` and its slot reads null after; when the 340ms wins, `removeEventListener` is invoked on `cur.transitionListener` and its slot reads null after | a settling swipe with `transitionend` fired first; separately the 340ms fallback alone (no `transitionend`) | misattribution (§4.10): retire the WINNER's handle instead of the loser's — the spy sees cancel/remove invoked on the wrong handle and the loser's slot stays non-null | wiring (ownership spy + field inspection) |
| SF | After `finalize` cancels the settle rAF AND after a normal rAF fire, `cur.settleFrame` reads null (the session names no stale frame handle) | a settling swipe finalized by the 340ms fallback while the tab was hidden (deferred rAF), and a normal foreground settle | leave `settleFrame` set after cancel/fire → a completed session names a live frame handle (the future I12 retirement-check reads a stale handle) | wiring (field inspection) |
| RR | The winning reveal `drop` retires exactly the correct two reveal losers: `cancelAnimationFrame` on `cur.revealFrames` and `clearTimeout` on `cur.revealTimer`, each on its own handle, both slots null after | a commit→home or abort browse→browse HELD reveal; let the paint gate win, then advance the clock past 600ms | misattribution (§4.10): cancel `cur.revealTimer` where `cur.revealFrames` was meant (wrong handle), or leave a loser's slot non-null | wiring (ownership spy + field inspection) |
| EP | After the terminal resolver, the completed session names no live handle across every handle it acquired — for BOTH the no-pane finalize path and the held-reveal two-phase (finalize→drop) path; `session === null` | a no-pane commit (browse→overlay) and a held-reveal commit→home | retire only some phase handles → a completed session (`session===null`) still leaves a non-null handle reachable on the released `cur` | wiring (field inspection) |
| RGcancel | The shipped `cancelAnimationFrame(cur.settleFrame)` still prevents a stale `translateX` on the real `#browse`/`#home` after finalize, and the `done`/`dropped` guards still absorb late fires — the retirement JOINS them, it does not replace them | the .226 hidden-tab recipe: defer the settle rAF, advance past 340ms to finalize, resume the rAF; assert no stale transform | the retirement REPLACES (removes) the shipped settle-rAF cancel → the resumed rAF writes a stale transform onto the real view | wiring (existing green, `:598`) |
| RG13 | Finalization still occurs exactly once despite transitionend AND the 340ms both firing (I13 parity) | the existing duplicate-gesture-ending-event fixture | retirement removes the `done` guard → both finalize bodies run | wiring (existing green, `:220`) |
| RGH | A HELD reveal still keeps the owner THROUGH finalize, releasing it only at drop (parity) | the existing Authors→Home held-reveal fixture | retirement nulls/ends the owner at finalize instead of at drop → owner released while the ghost still covers | wiring (existing green, `:569`) |
| RGT | A throw in finalize still restores `finishing` so the next swipe engages (parity) | the existing throwing-abort fixture | retirement runs outside the try/finally and swallows the throw path → `finishing` stays stuck true | wiring (existing green, `:623`) |

**Machine-readable coverage (gate — `vitruvius-coverage`).** The matrix as `id | behavior | fixture |
mutation | layer`; each blocking question (DF/SF/RR/EP) has a complete row; the RG* rows pin the shipped
DOM parity.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
DF | finalize retires exactly the correct dual-fire loser clearing settleTimer when transitionend wins or removing transitionListener when the 340ms wins with the loser slot null after | a settling swipe with transitionend first and separately the 340ms fallback alone | misattribution retire the winner handle instead of the loser so cancel or remove hits the wrong handle and the loser slot stays non-null | wiring ownership spy and field inspection
SF | after cancel and after a normal fire the settle rAF handle reads null so the session names no stale frame | a hidden-tab settle finalized by the 340ms fallback and a normal foreground settle | leave settleFrame set after cancel or fire so a completed session names a live frame handle | wiring field inspection
RR | the winning reveal drop retires exactly the correct two reveal losers cancelling revealFrames and clearing revealTimer each on its own handle with both slots null after | a held commit-to-home or abort browse-to-browse reveal with the paint gate winning then the clock advanced past 600ms | misattribution cancel revealTimer where revealFrames was meant or leave a loser slot non-null | wiring ownership spy and field inspection
EP | after the terminal resolver the completed session names no live handle across every handle it acquired for both the no-pane finalize path and the held-reveal two-phase path | a no-pane commit and a held-reveal commit-to-home | retire only some phase handles so a completed session still leaves a non-null handle | wiring field inspection
RGcancel | the shipped cancelAnimationFrame still prevents a stale transform after finalize and the done and dropped guards still absorb late fires so the retirement joins them not replaces them | the hidden-tab recipe deferring the settle rAF then finalizing via the 340ms fallback then resuming the rAF | the retirement replaces the shipped settle-rAF cancel so the resumed rAF writes a stale transform | wiring existing green 598
RG13 | finalization occurs exactly once despite transitionend and the 340ms both firing | the existing duplicate gesture-ending-event fixture | retirement removes the done guard so both finalize bodies run | wiring existing green 220
RGH | a held reveal keeps the owner through finalize releasing it only at drop | the existing Authors-to-Home held-reveal fixture | retirement ends the owner at finalize instead of at drop | wiring existing green 569
RGT | a throw in finalize restores finishing so the next swipe engages | the existing throwing-abort fixture | retirement runs outside the try finally and swallows the throw path so finishing stays stuck true | wiring existing green 623
```

## 10. Records reconciliation (APPLY ON APPROVAL)

The scrub obligations when this ships (StandardsDocument §6.6; Engineering Contract §4.22/§7). These are
NOT applied by this plan — they are the checklist the build closes; each is a defining-record edit flagged
for the maker/Zelda, not done here.

- **`Claude/Subsystems/swipe-reveal.md` §8** — rewrite the OPEN item to current truth: the settle/reveal
  timers and the transitionend listener ARE now session-owned handles retired (cancelled/removed and
  nulled) at their phase resolver. §10/§11 — add the four newly-owned handles (`settleTimer`,
  `transitionListener`, `revealFrames`, `revealTimer`) to the async-operations / stale-completions lists
  as retired-on-fire-or-cancel. §19 — register the new mutations (the ownership cells DF/SF/RR/EP and the
  RGcancel/RG13/RGH/RGT parity regressions) mapped to their tests. §21 — strike or update the "the stage-6
  cleanup debt (null the timer/listener handles)" policy-ledger reference (swipe-reveal.md:100) to current
  truth: the debt is closed in Stage 6b; it goes stale in HEAD otherwise (F3, StandardsDocument §6.6).
  §23 — annotate the stage-6 revision condition as sub-sliced (6b = async-handle ownership done; 6c/7 =
  finalization centralization + `sameBrowseHost` + pane lifecycle + I10 reveal-gating + `recoverSession`
  matrix).
- **`Claude/Decisions/DecisionLog.md`** — update the "Owed to stage 6" entry (2026-07-21) to current
  truth (closed in Stage 6b), per the log's own supersede-in-place rule; AND append a dated Stage-6b
  decision: the settle/reveal timer + transitionend-listener + reveal-frame handles are session-owned and
  retired+nulled at one phase resolver each, extending the .226 settle-rAF pattern; the .223 review
  finding 1b's timer/listener half is closed; finding 3 (the `finishing`-gate / global-cleanup) and the
  other five deferred workstreams remain Stage 6c/7.
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — annotate: the async-handle ownership foundation
  (this slice, 6b) landed; finalization/reveal centralization (I10, I17), `finalizationPlanFor`,
  `sameBrowseHost`, pane lifecycle, and the `recoverSession` matrix remain Stage 6c/7. Point to
  `PLAN-swipe-stage6b.md`. §3.2 needs no edit — the target shape already lists the four fields; this slice
  realizes them.
- **`docs/swipe-model.generated.txt`** — regenerate if line references shift; a code change bumps the
  build number (PWA deploy rule).
- **Engineering Contract §4.22 reviewable-stage naming** — this ships as "Stage 6b", so the deferred
  finalization half stays visible and the stage is not called complete on a partial delivery.
- **Campaign definition — FLAGGED (records/tooling decision owed, not resolved here).** The campaign
  `Claude/Campaigns/swipe-stage6.json` gate globs (`Claude/Charpy/PLAN-swipe-stage6-*.md`,
  `Claude/Curie/RED-swipe-stage6.md`, etc.) match Stage-6a artifacts; a `stage6b` artifact name does not
  match `stage6-*`. Before the 6b campaign can be checked complete, EITHER the globs widen to admit 6b
  artifacts OR a `swipe-stage6b.json` campaign file is created. This is a defining-record/tooling edit for
  Zelda; this plan neither chooses nor makes it.

## 11. What this does NOT do (deferred to Stage 6c/7, with reasons)

Each deferral names the consumer that does not yet exist and the stage that introduces it (U2). The seven
Stage-6 workstreams from `PLAN-swipe-stage6.md` §11: this slice delivers ONE (the settle/reveal timer +
transitionend-listener ownership); the other six are deferred with the dependency reason each waits on.

- **`finishing`-gate retirement + `cur === session` stale-callback ENFORCEMENT (I12/I20).** Deferred: its
  precondition is THIS slice (the retirement check "the resource has not already been retired", §4.6,
  reads the nulled handles this slice creates), and its other precondition is the finalize-path state
  machine that makes the guard reachable (`PLAN-swipe-stage6.md` §11: "it lands with the finalize-path
  state machine that makes it reachable"). Building the enforcement now, before the restructure, yields an
  unreachable guard (app.js:228 note). This slice is deliberately its FOUNDATION, sequenced first.
- **`finalizationPlanFor()` / rich `planFor()` composition** (commit/abort/scroll/stackEffect/
  paneRemovalPolicy). Deferred: its consumer is the restructured normal finalize path (Stage 6c/7);
  building it now adds fields with no current-slice consumer — dead fields (§4.15). This slice touches the
  finalize path only for resource ownership, not for plan composition.
- **Normalized `sameBrowseHost`.** Deferred: a normalized field is dead until `finalizationPlanFor`
  consumes it (Stage 6c); the abort re-render reads `cur.clobbered` today (Stage 6a). Subsystem §23 names
  its reintroduction as stage-6 finalization-half work.
- **Pane `release()` / `dispose(reason)` / `equivalence` / `source` / `pin` (§3.6; the I8 equivalence
  audit).** Deferred: the abstraction's non-test consumers are the paint-gated reveal (I10) and the I8
  audit's runtime comparison, both Stage 6c; adding the methods now is dead surface (Stage-5 F6 deferral,
  still binding). The reveal handles this slice owns are the timers/frames, NOT the pane lifecycle methods.
- **I10 paint-gated reveal centralization + I17 generalization.** Deferred: the flash-sensitive core of
  the reveal path (memory `tomeroam-swipe-repaint-saga` — read before touching). It requires the finalize
  restructure and the pane abstraction; folding it here would enlarge the blast radius into the flash path
  for no ownership gain. This slice owns the reveal continuations' HANDLES without changing the reveal
  timing or the paint gate's structure.
- **The full `recoverSession` reason/phase matrix** (lease-invalid / destination-gone / finalize-threw;
  post-stack). Deferred: those reasons are UNDEFINED conditions today with no detector (`PLAN-swipe-reveal.md`
  §3.7: "gaps the rewrite must CLOSE"), and post-stack recovery requires the finalization restructure. A
  branch for a condition that cannot fire is an unreachable guard this project forbids. Stage 6a
  implemented only the (`superseded`, `pre-stack`) cell.
- **The `fadePanes` per-pane removal `setTimeout`** (app.js:649). Deferred: it is an owned-decoration
  cleanup that always completes its one job (remove the `spent` pane, self-guarded by `if (el.parentNode)`)
  and its timing lives inside the flash-experiment fade path (`FADE_MS`); folding it into this ownership
  slice would touch the fade path for no session-lifecycle gain. It belongs with the pane-lifecycle
  abstraction (§3.6, Stage 6c) that gives the pane a `release()`/`dispose()` owner.
- **The headline aborted-swipe repaint/flash.** Untouched and independent (`PLAN-swipe-reveal.md` §6;
  memory `tomeroam-swipe-repaint-saga`). This slice adds no paint-gating and changes no reveal timing;
  parity for the flash is the bar.

## 12. Sequencing

This slice rests only on shipped Stage 5 (the construction boundary) and Stage 6a (the supersession
recovery, which owns the Browse hold and leaves `begin()` in its final shape) and the existing
`settle()`/`finalize()`/`holdGhostUntilPaintable()` path with the shipped .226 settle-rAF ownership. It
does not gate, and is not gated by, the deferred Stage 6c/7 work (§11); it is the resource-ownership
FOUNDATION those stages consume (the I12 enforcement reads the nulled handles; the finalization
centralization owns and retires the same handles through the restructured state machine). It stops at the
handle-ownership boundary so Stage 6c restructures the finalize/reveal path in one pass on a clean
ownership base, without unwinding a 6b change. Handoff order: Charpy (temper) -> Curie (red suite from §9)
-> Brunel (green) -> Poirot (review) -> Mendeleev (coverage audit) -> Loki (strike the §3 load-bearing
promise — that each phase resolver retires exactly the correct loser and the completed session names no
live handle; the misattribution/ownership axis of cells DF/RR/EP, not the DOM axis the shipped guards
already hold). Campaign definition-of-done: the
`swipe-stage6` gates, with the 6b artifact-name reconciliation flagged in §10.
