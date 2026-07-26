# PLAN — Swipe/reveal Stage 6b (cancel the finalize/reveal loser timer + frame handles)

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":true,"persistence_migration":false,"lifecycle_ownership":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:746-796","js/app.js:1142-1161"],"callee_ranges":[],"affected_contracts":["test/swipe-invariants.test.js:220","test/swipe-invariants.test.js:569","test/swipe-invariants.test.js:588","test/swipe-invariants.test.js:598","test/swipe-invariants.test.js:623"],"staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"blocking_questions":["DF","RR"]} -->

Status: **DRAFT — for Charpy** (2026-07-26, r4 — Loki-KILL corrected: the reveal frame is a TWO-entry
double-rAF, so `cur.revealFrames` tracks the currently-pending frame id, not just the outer). First Stage-6b slice, following
shipped Stage 6a (build `2026-07-26.246`). Behavior is PARITY at the user-visible layer; the change is a
resource-release improvement (Engineering Contract §4.3/§4.14). Grounded against HEAD `js/app.js`:
`settle()` → `runFinalize()`/`holdGhostUntilPaintable()` (693-796) and `finalize()` with the 340ms fallback
(1142-1161); the session literal (407-409); the shipped `.226` settle-rAF cancel (1146). Grounded against
the real test harness `test/app-harness.js`: the fake-timer queue `tq` (`h.clock.pending()`, 773) and the
deferred-rAF queue `rafQ` (`h.raf.pending()`, 800) are the observable channel; `window.PBSwipeSession()`
(app.js:245) exposes only `{id, dragging}` and returns null post-completion, and no harness surface records
a `clearTimeout`/`cancelAnimationFrame`/`removeEventListener` call. Passes the wired Vitruvius authoring
gate. Sub-slice of `PLAN-swipe-reveal.md` §7 step 6.

**Scope note (Charpy r2 F5, honest shrink).** The original 6b scope conflated two layers: (1) making the
four bare finalize/reveal continuations into session-owned handles and CANCELLING each loser — a resource
release; and (2) NULLING the stored handles so the session object describes live ownership — the literal
"Owed to stage 6" debt. Layer 1 is observable NOW (a cancelled loser leaves the scheduler queue) and is
this slice. Layer 2 (the null-writes) and the `transitionListener` removal have no observable test surface,
and their only consumer is the DEFERRED I12 retirement-check — so nulling them now is a dead write (§4.15).
They are deferred to the I12 stage that reads the nulled handles and scopes the observability then (§11).
A smaller honest slice: 6b cancels the losers; the I12 stage nulls them for its own reader.

**Correction (2026-07-26, Loki KILL on the retire-correct-loser promise, `Claude/Loki/STRIKE-swipe-
stage6b-retire-loser.md`, input `f83c4a5`).** A prior draft stored the reveal paint gate — a DOUBLE `rAF`
on one line (`app.js:794`) — as a SINGLE outer-frame id. In the timeout-driven half-fired interleaving (a
tab hidden AFTER the first reveal frame fires — the trap the code names at app.js:792-793 — so the outer
fires, schedules the inner, then the 600ms safety-net wins the drop), `drop()` cancelled the spent OUTER
id while the INNER paint frame stayed pending: an executed leak (`h.raf.pending()`=2 vs 1). This revision
makes `cur.revealFrames` a two-entry resource that always names the CURRENTLY-PENDING reveal frame — the
outer callback RE-STORES the inner id onto `cur.revealFrames` — so the one `cancelAnimationFrame` at drop
removes the actual pending loser across the half-fired state (§2, §3 item 2/3). The RR cell gains the
half-fired fixture the F6 binary split missed (§9), and the deferred I12 null-bookkeeping is confirmed
implementable on the always-current-id model (§11).

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: false** — no code moves across a module boundary. Every change is in place in
  `js/app.js` `settle()`; `js/swipe.js` is not touched.
- **callee_replacement: false** — no indirection layer replaces a direct call. `finalize`/`drop` already
  exist; the slice stores the reveal frame/timer and the 340ms fallback on the session and adds a cancel
  at those resolvers.
- **contract_shape: false** — no exact-key contract changes. The in-memory gesture session `d` is exempt
  mutable lifecycle state (subsystem §3/§18), not a registered `classifyTransition`/`buildConstruction`
  contract; `PLAN-swipe-reveal.md` §3.2 already names `settleTimer`/`revealTimer`/`revealFrames` as target
  fields — this slice realizes the three that are cancellable now. No closed schema moves.
- **state_transfer: false** — no ownership boundary relocates. Each handle is created and cancelled within
  the same `settle()` scope; nothing crosses a seam.
- **async_change: true** — the subject is three asynchronous continuations (the 340ms finalize fallback
  `setTimeout`; the reveal double-`rAF`; the reveal 600ms safety-net `setTimeout`): storing each on the
  session and cancelling the loser at its phase resolver, so no leaked continuation survives its phase in
  the scheduler queue (§5).
- **persistence_migration: false** — the gesture is entirely in-memory and per-process (subsystem §15).
- **lifecycle_ownership: true** — the subject is ownership of three async handles: the session stores each,
  and one resolver (`finalize` or `drop`) cancels the loser (§6). This is the resource-release half of the
  Engineering Contract §4.3 explicit-ownership rule and the "Owed to stage 6" debt; the truthful-bookkeeping
  (null) half is deferred with its consumer (§11).

## Index
1. Defining records and authority
2. Exact scope boundary
3. The release contract (invariant, not prescription)
4. Value-crossing ledger
5. Async operations — cancellation, exactly-once, stale completions
6. Lifecycle ownership — creation to endpoint, per handle
7. Ordering contract
8. Coverage Model (Mendeleev catalog)
9. Coverage and mutation matrix
10. Records reconciliation (apply on approval)
11. What this does NOT do (deferred, with reasons)
12. Sequencing

## 1. Defining records and authority

Every record that materially defines this slice, its authority, and what this plan changes. Verdict across
the records: **AGREE. No two records disagree on required behavior; they disagree only on Stage 6's TOTAL
size and on how much of the "Owed to stage 6" debt is testable in isolation. This plan bounds 6b to the
observable resource-release (cancel the loser timer/frame handles) and defers the null-bookkeeping half of
the debt to the I12 stage that consumes it — a planning decision grounded in the tooling's observability
limit, not a conflict resolution.**

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `DecisionLog.md` "Owed to stage 6" (2026-07-21) | "when the settle requestAnimationFrame, the settle/reveal timers, or the transitionend listener are cancelled OR fire, NULL their stored session handles (`cur.settleFrame = null`, etc.) so the session object describes LIVE ownership rather than stale numeric handles. ... part of the stage-6 finalization-centralization work." | Active decision ledger | Delivers the RELEASE half the debt presupposes (store + cancel the three loser handles that are bare locals today); the NULL half is deferred to the I12 stage (its only consumer — §11), because no production or test surface reads a nulled handle now (§4.15) | Update the entry to current truth: 6b cancels the loser handles; the null half moves to the I12 stage (§10) |
| `Subsystems/swipe-reveal.md` §8 | "OPEN (stage 6): the settle/reveal timers and the transitionend listener are not yet session-owned handles that null on cancel/fire (DecisionLog)." | Subsystem addendum | Partly closes it: the reveal frame/timer and the 340ms fallback ARE now session-owned and loser-cancelled; the null-on-fire/cancel and the `transitionListener` ownership remain owed to the I12 stage | Rewrite §8 to current truth (§10) |
| `Subsystems/swipe-reveal.md` §10/§11 | "Asynchronous operations: the settle rAF; the settle/reveal timers; the transitionend listener; the paint-gated pane release. ... Possible stale completions: a settle rAF firing after finalize (fixed .226: cancel on session)." | Subsystem addendum | Extends the .226 cancel-on-session pattern from the settle rAF to the reveal frame/timer and the 340ms fallback; each loser now leaves the scheduler queue at its resolver | Add the three newly-cancelled handles to §10/§11 (§10) |
| `PLAN-swipe-reveal.md` §3.2 (session shape) | The target session owns `{ ..., transitionListener, settleTimer, revealTimer, revealFrames, ... }`; "every acquired timer, listener, lease, pane and animation callback is released or invalidated" (I14). | Plan-of-record (strategic) | Realizes `settleTimer`/`revealTimer`/`revealFrames` with real producers/consumers; honors I14 for the three loser handles. `transitionListener` deferred (§11) | Annotate §7 step 6 as sub-sliced (§10) |
| `PLAN-swipe-reveal.md` I13 / I14 / I15 | I13: finalization exactly once despite transitionend AND the 340ms both firing. I14: every acquired timer/listener/lease/pane/animation callback released or invalidated. I15: deferred Browse repaint applied exactly once after the hold ends. | Invariants (strategic) | I14 extended to the three loser handles (they are now cancelled, not left to fire a no-op); I13/I15 keep their existing `done`/`dropped` flag defense (untouched) — the loser-cancel is added alongside, verified not to break them (RG13/RGH/RGT) | — |
| `PLAN-swipe-reveal.md` §7 step 6 | "Centralize finalization and reveal ordering (I10, I17)." | Plan-of-record (staging) | Delivers the loser-cancel resource-release foundation the centralization rests on; the state-machine restructure, `finalizationPlanFor`, `sameBrowseHost`, pane lifecycle, I10 reveal-gating, the `recoverSession` matrix, the null-bookkeeping, and the observability surface stay Stage 6c/7 (§11) | Annotate as sub-sliced (§10) |
| `DecisionLog.md` .223-review dispositions (2026-07-20) | Finding 1b (the settle timer + transitionend listener) and finding 3 (global-session cleanup helpers) were "Deferred to stage 6, unchanged." | Active decision ledger | Finding 1b's settle-timer half (the 340ms fallback cancel) is this slice; its transitionend-listener half and finding 3 stay deferred (§11) | Note the settle-timer half closed (§10) |
| `js/app.js` `finalize()` (1142-1160) | `setTimeout(finalize, 340)` (1160) is a bare local, never stored or cleared; exactly-once is held by the `done` boolean (1143); `cancelAnimationFrame(cur.settleFrame)` (1146) is shipped (.226). | Code under change | Stores the 340ms as `cur.settleTimer` and clears it in `finalize` when it is the pending loser (transitionend won); the settleFrame cancel is untouched (pinned by regression RGcancel) | — |
| `js/app.js` `holdGhostUntilPaintable()` (794-795) | The reveal paint gate is a DOUBLE `rAF` on one line (794) — two scheduler entries, of which at most one is pending; the 600ms safety-net `setTimeout` (795) is a bare local; neither is cancelled; the drop is held exactly-once by the `dropped` boolean (751). | Code under change | Stores the currently-pending reveal frame as `cur.revealFrames` (the outer callback re-stores the inner id — §2) and the 600ms as `cur.revealTimer`; the winning `drop()` cancels each pending loser across the half-fired state (§2, §3, cell RR) | — |
| `test/app-harness.js` (773, 800) | `h.clock.pending()` returns `tq.length` (pending fake timeouts); `h.raf.pending()` returns `rafQ.length` (queued deferred rAFs); `cancelAnimationFrame`/`clearTimeout` splice from those queues but record nothing to `log`. `PBSwipeSession` (app.js:245) exposes `{id, dragging}` and nulls post-completion. | Verified test tooling | The observable channel for this slice: a cancelled loser leaves `tq`/`rafQ`, so a misattribution/omission mutation leaves it pending (cells DF, RR). No field-inspection surface exists, which is WHY the null-bookkeeping is deferred (§11) | — |

Authority precedence: the "Owed to stage 6" entry and subsystem §8 govern that this is Stage-6 ownership
work; the plan-of-record §3.2/I13/I14 govern the target shape and invariants; the harness (verified tooling,
Engineering Contract §2 precedence 3) governs what is observable and therefore what is testable in isolation.

## 2. Exact scope boundary

Behavioral ownership, not function names. All changes are inside `js/app.js` `settle()` and its inner
`finalize`/`holdGhostUntilPaintable`; no other function, module, or user-visible behavior changes.

**Changes — three bare loser continuations become session handles and are CANCELLED at their resolver:**
- **`cur.settleTimer`** — the 340ms finalize fallback (`setTimeout(finalize, 340)`, 1160) is stored on the
  session. `finalize` (which runs once, `done`-guarded) calls `clearTimeout(cur.settleTimer)`: when
  `transitionend` won, this clears the still-pending 340ms so it never fires; when the 340ms itself won, it
  has already left the queue and the clear is a harmless no-op on a fired id.
- **`cur.revealFrames`** — the reveal paint gate is a DOUBLE `requestAnimationFrame` on one line (794):
  the outer frame, when it fires, schedules the inner paint frame — two scheduler entries with two distinct
  ids, of which at most one is ever pending. `cur.revealFrames` must name the CURRENTLY-PENDING one: it is
  set to the outer id when scheduled, and the outer callback RE-STORES the inner id onto `cur.revealFrames`
  before scheduling it (`cur.revealFrames = requestAnimationFrame(() => { cur.revealFrames =
  requestAnimationFrame(() => { painted = true; gate('paint'); }); })`). The winning `drop()` (once,
  `dropped`-guarded) calls one `cancelAnimationFrame(cur.revealFrames)`, which removes whichever frame is
  pending — the outer if it has not yet fired, the inner if it has (the half-fired case) — so no reveal
  frame survives the resolver in any interleaving; when the paint gate itself won, the field holds a spent
  id and the cancel is a no-op. (Storing BOTH ids and cancelling both is an admissible alternative — §3.)
- **`cur.revealTimer`** — the reveal 600ms safety-net (`setTimeout(() => drop('timeout'), 600)`, 795) is
  stored on the session. The winning `drop()` calls `clearTimeout(cur.revealTimer)`: when the decode or
  paint gate won, this clears the still-pending timeout; when the 600ms itself won, no-op.

**The release rule, stated once (the load-bearing property, §3):** each of the two terminal resolvers —
`finalize` (owns `cur.settleTimer`) and `drop` (owns `cur.revealFrames`, `cur.revealTimer`) — cancels the
loser handle(s) in its phase. Each resolver closes over its own `cur`, so it cancels exactly the correct
loser and never a wrong or a successor's handle (the misattribution mutations of cells DF/RR). After the
resolver, no loser continuation from that phase remains pending in the scheduler queue (I14).

**Stays exactly as today (parity — do NOT re-touch):**
- The shipped `cancelAnimationFrame(cur.settleFrame)` (1146, .226) — untouched; pinned as regression
  RGcancel so a build cannot silently drop it.
- The exactly-once GUARDS — the `done` boolean in `finalize` (1143) and the `dropped` boolean in `drop()`
  (751) — untouched. The loser-cancel is added ALONGSIDE them; I13/I15 keep their flag defense.
- The `transitionend` listener (1159, `{once:true}`) — untouched. When the 340ms wins, it stays bound and
  its late `transitionend` re-enters `finalize` as a `done`-guarded no-op — exactly today's behavior
  (parity). Making it session-owned and removing it is deferred (§11): unobservable with current tooling
  and its only consumer is the I12 check.
- The finalize/reveal choreography (`runFinalize`, the row-hold `try/finally`, `finishing`,
  `revealPending`, `sessionDone`/`endOwnership`, `fadePanes`, the flash-probe diagnostics) — unchanged.
- The Browse row hold (Stage 6a) and `begin()`/supersession (Stage 6a) — untouched. A superseded session is
  pre-`settle()`, so it holds none of these handles.

**Split across the seam:** none — no code relocates; this is an in-place cancel addition.

**Deferred (§11 expands, with the consumer each waits on):** the NULL-on-retire writes on every handle
(consumer = the I12 retirement-check, deferred); the `transitionListener` session-ownership + removal
(unobservable; consumer = the same I12 check); the per-handle-liveness observability surface (a
`PBSwipeSession` extension, scoped WITH the I12 stage that reads it); plus the other six Stage-6 workstreams.

## 3. The release contract (invariant, not prescription)

**Invariant (the load-bearing promise).** Across the finalize and reveal phases, each of the three loser
continuations is a SESSION-OWNED handle cancelled at exactly one resolver:

1. **Finalize phase.** `finalize(cur)` cancels its loser: `clearTimeout(cur.settleTimer)`. Because
   `finalize` runs exactly once (the `done` guard, unchanged), the 340ms fallback that lost the
   `transitionend`-vs-340ms race is actively cleared and leaves the scheduler queue, rather than remaining
   pending to fire a `done`-guarded no-op (I14; cell DF, observable via `h.clock.pending()`).
2. **Reveal phase.** The winning `drop(why)` cancels its losers: `cancelAnimationFrame(cur.revealFrames)`
   and `clearTimeout(cur.revealTimer)`. Because `cur.revealFrames` names the currently-pending frame of the
   double-`rAF` (the outer callback re-stores the inner id — §2), the one cancel removes the actual pending
   frame whether or not the outer has fired — including the half-fired timeout-driven interleaving the Loki
   strike found. Because `drop` runs exactly once (the `dropped` guard, unchanged), the losing gates of the
   decode-vs-paint-vs-600ms race leave the scheduler queue rather than firing `dropped`-guarded no-ops
   (I14/I15; cell RR, observable via `h.raf.pending()`/`h.clock.pending()`).
3. **Correct-loser cancel, by construction.** Each resolver closes over its own `cur`, so it cancels
   exactly the phase's loser and never a wrong handle — the misattribution axis Loki strikes (cells DF, RR;
   §4.10 wrong-owner). For the reveal frame this holds ONLY because `cur.revealFrames` tracks the pending id
   across the outer→inner transition; a single-outer-id design cancels a spent handle in the half-fired
   state (the killed construction). The mechanism (re-store the inner id, or hold both ids and cancel both)
   is a **recommendation**; the invariant is "the reveal-frame cancel removes the actually-pending frame."
4. **Ownership endpoint (parity).** The session's ownership still ends at `sessionDone(cur)`, unchanged —
   the no-pane path via `finalize`/`endOwnership` (1141/1154), the held-reveal path via `drop` (785). The
   loser-cancel runs before those and does not move the endpoint; `session === null` after a terminal path
   stays as shipped (regression RGend, `test/swipe-invariants.test.js:588`).

**Basis (U11).** Items 1-2 are the resource-release realization of I14 and the release half of the "Owed to
stage 6" ledger entry; the mechanism is fixed because exactly one design satisfies it — store the handle on
the session at its scheduling site and cancel it at the single phase resolver, exactly as the shipped .226
settle-rAF cancel does, extended to the three loser continuations that are bare locals today. The *locus*
(inline in `finalize`/`drop` vs a named helper) is a **recommendation**, not a requirement. There is one
admissible behavior; no other section contradicts it.

**Why session handles and not bare locals (U4 consumer-now).** The three loser continuations are already
scheduled in production; storing each on the session gives it a current-slice CONSUMER — the resolver that
cancels it — so no field is dead (§4.15). The cancel is the whole reason the field exists this slice; the
FUTURE I12 reader (which will additionally null and inspect these handles) does not justify the fields now,
but the resolver cancel does.

**Why the null-write is NOT in this slice (Charpy r2 F5; §4.15).** The "Owed to stage 6" debt's literal ask
is to NULL the stored handles so the session "describes live ownership." That null's only consumer is the
deferred I12 retirement-check (§4.6, "the resource has not already been retired"); no production code reads
a nulled handle today, and no test surface can observe one (`PBSwipeSession` exposes only `{id, dragging}`
and nulls post-completion; the harness records no cancel/remove call). Writing the null now would be a dead
write with no reddening test — the very §4.15 violation this project forbids. So the null is deferred to the
I12 stage, which reads it and scopes the observability (a `PBSwipeSession` extension) with a real consumer
to justify the accessor. This slice releases the resource (testable); the I12 stage records its truthful
absence (testable then).

**Why parity at the user layer (honesty).** Cancelling a loser that was going to fire a `done`/`dropped`-
guarded no-op changes nothing the user can see; it releases the scheduler entry ~340ms/600ms/one-frame
earlier and stops a no-op from running. The value is at the resource layer (I14: every acquired timer/frame
released or invalidated) and as the session-owned-handle foundation the I12 stage consumes. Stated as
parity-plus-release, not user-visible behavior change.

## 4. Value-crossing ledger

Machine-readable ledger (the prose mirrors the fenced block). Every loser handle the slice brings under
session ownership, each with one owner (its single cancel site), its consumer, and its verification.

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
cur.settleTimer 340ms finalize fallback handle | resource | inout | settle@S6b | finalize@S6b | finalize | per-gesture | DF clear-loser queue test
cur.revealFrames reveal double-rAF handle | resource | inout | holdGhost@S6b | drop@S6b | drop | per-gesture | RR cancel-loser queue test
cur.revealTimer reveal 600ms safety-net handle | resource | inout | holdGhost@S6b | drop@S6b | drop | per-gesture | RR cancel-loser queue test
```

Notes: every row is `inout` — the handle is produced at its scheduling site (`settle`'s finalize wiring /
`holdGhost`) and consumed (cancelled) at exactly one resolver (`finalize`/`drop`). Each owner is a single
accountable site. No handle is produced in a stage later than it is consumed (all S6b). `cur.revealFrames`
is a DOUBLE-`rAF` two-entry resource: `holdGhost` produces the outer id and the outer callback re-produces
the inner id onto the same field, so the field always names the one currently-pending frame; the single
owner (`drop`) cancels that pending frame (§2, §3 — the Loki-KILL correction). `cur.settleFrame` is absent
— already produced+cancelled today (.226), not re-touched (regression RGcancel). `cur.transitionListener`
is absent — deferred (§11).

## 5. Async operations — cancellation, exactly-once, stale completions

Named concerns for the `async_change` pattern. No NEW asynchronous surface is created and no timing
changes; the change is that three continuations that already exist are cancelled when they lose their race.

- **Cancellation.** Each loser is actively cancelled at its resolver: `clearTimeout(cur.settleTimer)` in
  `finalize`; `cancelAnimationFrame(cur.revealFrames)` and `clearTimeout(cur.revealTimer)` in the winning
  `drop`. A cancelled entry leaves the fake queue, so the cancel is observable as a drop in
  `h.clock.pending()`/`h.raf.pending()` (cells DF, RR). This extends the shipped `.226`
  `cancelAnimationFrame(cur.settleFrame)` (app.js:1146) to the three loser continuations. The reveal frame
  is a double-`rAF`, so `cur.revealFrames` tracks the currently-pending id (the outer callback re-stores
  the inner id); the single cancel then removes the pending frame even in the half-fired hidden-tab case
  (app.js:792-793) where the outer has fired and the inner is pending — the leak the Loki strike executed.
- **Exactly-once.** `finalize` (`done` guard, 1143) and `drop` (`dropped` guard, 751) each run their body
  once; the cancel is added inside that single run and does not alter the guards. I13 (finalize once
  despite dual-fire) and I15 (deferred repaint once) keep their flag defense (regressions RG13/RGH,
  `:220`/`:569`).
- **Stale completions.** The scenario a cancel prevents is a loser firing after its race is decided: a
  340ms fallback firing after `transitionend` finalized; a reveal double-`rAF` or 600ms firing after
  another gate dropped the pane. Today each fires and hits its guard as a no-op; the cancel removes it from
  the queue so it never fires. The DOM stale-write a hidden-tab settle `rAF` could otherwise perform is
  prevented by the shipped `cancelAnimationFrame` (app.js:1146), which this slice preserves (regression
  RGcancel, `:598`). No continuation reads its own handle; the continuations' bodies are unchanged (§2).
- **Ordering / atomicity.** The cancel is synchronous inside the single-threaded resolver, after the guard
  is already set, so it cannot re-enter. `finishing`/`revealPending`/`sessionDone` sequencing is unchanged
  (§7).
- **No async change to `begin()`/supersession.** A superseded session (pre-`settle()`) owns none of these
  handles, so `begin()` is not entered (§2).

## 6. Lifecycle ownership — creation to endpoint, per handle

Named concerns for the `lifecycle_ownership` pattern.

- **Create.** `finalize`'s wiring creates `cur.settleTimer` (from the 340ms at 1160); `holdGhost` creates
  `cur.revealFrames` (the outer frame at 794) and `cur.revealTimer` (the 600ms at 795). The outer reveal
  callback RE-CREATES `cur.revealFrames` with the inner frame id before scheduling it, so the field always
  names the currently-pending reveal frame (§2). Each is stored on `cur` at its site.
- **Borrow.** None of these three borrows a DOM node (they are scheduler tokens). (`transitionListener`,
  which would borrow the anchor element, is deferred — §11.)
- **Mutate.** None mutates session state beyond its own stored slot; the continuations' effects (the paint
  gate, the pane drop) are unchanged.
- **Release.** The single resolver cancels its loser: `finalize` cancels `cur.settleTimer`; `drop` cancels
  `cur.revealFrames` and `cur.revealTimer`. This is the I14 release for these three handles.
- **Restore.** N/A — these handles restore no state.
- **Destroy.** No node is destroyed by this slice.
- **Endpoint (parity).** `sessionDone(cur)` runs after the resolver, unchanged; the loser-cancel does not
  move it. `session === null` after a terminal path stays as shipped (regression RGend, `:588`). The
  truthful "the completed session's stored handles are null" property is deferred to the I12 stage (§11) —
  it has no observable surface now.

## 7. Ordering contract

**Correctness requirement (cell DF/RR) — cancel the correct loser.** Inside each resolver: (1) the
exactly-once guard (`done`/`dropped`) is already set before the cancel runs (unchanged), so the cancel
cannot re-enter; (2) the cancel reads the handle off the specific `cur` the resolver closed over, so it
cancels exactly the phase's loser and never a wrong handle nor a successor's handle (I12/§4.6; the
misattribution mutations of cells DF/RR).

Incidental (not a new universal order): the relative order among the reveal-phase cancels (revealFrames vs
revealTimer) is unconstrained — independent handles. The existing `cancelAnimationFrame(cur.settleFrame)`
position (before `runFinalize`, 1146) is preserved, with `clearTimeout(cur.settleTimer)` added adjacent to
it. `dropRowHold`/`endOwnership`/`finishing` ordering (Stage 6a and the .223/.226 fixes) is untouched.

## 8. Coverage Model (Mendeleev catalog)

Every catalog dimension marked applicable — with what the suite must prove — or not-applicable, with the
reason. Absence is a defect; a dimension not listed is an omission.

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | Each loser handle is created at its scheduling site and cancelled at exactly one phase resolver; the ownership endpoint is unchanged (cells DF, RR; RGend). |
| Identities | N/A | No identifier is created, changed, or reinterpreted; `d.id`/`sessionSeq` unchanged. |
| Ordering | Yes | Cancel the correct loser (misattribution-safe by closing over `cur`) (cells DF, RR). |
| Resources: acquired / owner / endpoint | Yes | The three bare loser continuations become session-owned handles cancelled at one site each, leaving the scheduler queue (cells DF, RR; §4.3/§4.14); the endpoint is parity (RGend). |
| Async operations | Yes | A loser firing after its race is decided is removed from the scheduler queue by the cancel, not left to fire a guarded no-op (cells DF, RR; §5). |
| Stale completions | Yes | The .226 hidden-tab stale DOM write stays prevented by the shipped `cancelAnimationFrame` (regression RGcancel, `:598`); the three loser continuations are additionally cancelled so they never fire (cells DF, RR). |
| Normal completion | Yes (parity) | Exactly-once finalize (I13) and exactly-once reveal drop (I15) stay green with the loser-cancel added (regressions RG13/RGH, `:220`/`:569`). |
| Recovery authority boundary | N/A | This slice does not enter `begin()`/supersession or the recovery path (Stage 6a owns it; a superseded session holds none of these handles — §2). |
| Emergency disposal | N/A | No pane disposal path changes; the orphan-pane hard reset and `dispose(reason)` are untouched (Stage 6a / deferred §11). |
| Persistence | N/A | The gesture is in-memory, per-process (subsystem §15). |
| External side effects | Yes (parity) | The continuations' effects (paint gate, pane drop) are unchanged; the slice adds only `clearTimeout`/`cancelAnimationFrame` on losers (cells DF, RR). |
| Invariants | Yes | I14 (every timer/frame released or invalidated) — extended to the three loser handles; I13/I15 keep their flag defense (regressions RG13/RGH). |
| Mutation cases | Yes | Each cell in §9 names a misattribution/omission mutation observable on the scheduler queue (cancel the wrong handle, or omit a cancel, so a loser stays pending — not only total omission). |
| Known-red | N/A | This slice introduces no known-red; PolicyLedger has no active entries after Stage 6a and none is added. |
| Composition | Yes | The loser-cancel composes with the exactly-once guards (`done`/`dropped`) — belt to their suspenders — with the double-`rAF` reveal gate (the field tracks the pending id across the outer→inner transition, so the cancel composes with the half-fired state — the Loki-KILL correction), with the Stage-6a supersession lifecycle (a superseded pre-settle session owns none of these handles), and with the deferred I12 stage that will null and read these session-stored handles (cells DF, RR). |
| Contract claims (exact schema) | N/A | No exact-key contract changes (contract_shape:false); the session `d` is exempt mutable lifecycle state. |
| Concurrency | Yes (parity) | Single-writer within the process; `begin()` still REJECTS while `finishing` (I17), so no second session schedules these handles concurrently; the cancel runs inside the single-threaded resolver with the guard already set (cells DF, RR). |
| Observability | Yes | The cells are proven against the REAL harness queue channel (`h.clock.pending()`, `h.raf.pending()`); the null-bookkeeping is deferred BECAUSE no field-inspection surface exists (§11), not asserted against a surface that does not exist (Charpy r2 F5). |

## 9. Coverage and mutation matrix

Every load-bearing promise and parity obligation maps to at least one production-facing test driving the
real `finalize()`/`holdGhostUntilPaintable()` through the app-harness (`test/app-harness.js` `h.touch` +
`h.clock` + `h.raf`), each with a mutation that reddens it ON A REAL SURFACE. The load-bearing cells DF/RR
assert on the fake-scheduler QUEUE COUNTS (`h.clock.pending()` = `tq.length`; `h.raf.pending()` =
`rafQ.length`): a cancelled loser leaves the queue, so a misattribution/omission mutation leaves it
pending. The RG* rows pin shipped DOM/endpoint parity.

| id | Behavior proved | Fixture / transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| DF | `finalize` cancels its loser — when `transitionend` wins, the 340ms `cur.settleTimer` is cleared and leaves the clock queue, so no leaked fallback survives the phase | a settling swipe with `fakeTimers`; dispatch `transitionend` on the anchor before advancing past 340ms; inspect `h.clock.pending()` | misattribution/omission (§4.10): clear the wrong handle or omit `clearTimeout(cur.settleTimer)` → the 340ms stays pending in the clock queue after finalize | wiring (queue inspection, `h.clock.pending()`) |
| RR | the winning reveal `drop` cancels its losers — the currently-pending reveal frame leaves the rAF queue and `cur.revealTimer` leaves the clock queue, so no leaked reveal continuation survives the phase, INCLUDING the half-fired state (outer reveal frame fired, inner paint frame pending, timeout wins) | THREE interleavings on a held commit→home / abort browse→browse reveal with `deferRaf`+`fakeTimers`: (a) timeout wins, no frame fired (outer pending); (b) **half-fired** — `h.raf.frame()` once so the outer fires and schedules the inner, THEN advance past 600ms so the timeout wins (inner pending); (c) a gate wins (revealTimer pending). Inspect `h.raf.pending()` and `h.clock.pending()` after the resolver | misattribution/omission (§4.10): store only the OUTER frame id (the killed single-id design) or cancel the wrong handle → in the half-fired interleaving (b) the cancel hits the spent outer id and the inner paint frame stays pending in the rAF queue after drop; OR omit a cancel → a loser stays pending | wiring (queue inspection, `h.raf.pending()`/`h.clock.pending()`) |
| RGcancel | the shipped `cancelAnimationFrame(cur.settleFrame)` still prevents a stale `translateX` on the real `#browse`/`#home` after finalize, and `done`/`dropped` still absorb late fires | the .226 hidden-tab recipe: defer the settle rAF, advance past 340ms to finalize, resume the rAF; assert no stale transform | the slice REPLACES (removes) the shipped settle-rAF cancel → the resumed rAF writes a stale transform | wiring (existing green, `:598`) |
| RG13 | finalization occurs exactly once despite transitionend AND the 340ms both firing (I13 parity) | the existing duplicate-gesture-ending-event fixture | the loser-cancel removes the `done` guard → both finalize bodies run | wiring (existing green, `:220`) |
| RGH | a HELD reveal keeps the owner THROUGH finalize, releasing it only at drop (parity) | the existing Authors→Home held-reveal fixture | the loser-cancel nulls/ends the owner at finalize instead of at drop | wiring (existing green, `:569`) |
| RGT | a throw in finalize restores `finishing` so the next swipe engages (parity) | the existing throwing-abort fixture | the loser-cancel runs outside the try/finally and swallows the throw path | wiring (existing green, `:623`) |
| RGend | after the terminal resolver the session is null (endpoint parity) | a no-pane commit and a held-reveal commit→home | the loser-cancel ends ownership early or leaves the session non-null | wiring (existing green, `:588`) |

**Machine-readable coverage (gate — `vitruvius-coverage`).** The matrix as `id | behavior | fixture |
mutation | layer`; each blocking question (DF/RR) has a complete row; the RG* rows pin shipped parity.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
DF | finalize cancels its loser clearing the 340ms settleTimer when transitionend wins so no leaked fallback stays pending in the clock queue | a settling swipe with fakeTimers where transitionend is dispatched before the 340ms then the clock queue is inspected | misattribution clear the wrong handle or omit the clear so the 340ms stays pending in the clock queue after finalize | wiring queue inspection clock pending
RR | the winning reveal drop cancels the currently-pending reveal frame and the 600ms revealTimer so no reveal continuation stays pending including the half-fired state where the outer frame fired and the inner paint frame is pending | a held commit-to-home or abort browse-to-browse reveal with deferRaf and fakeTimers across three interleavings timeout with no frame fired then half-fired where one raf frame fires the outer before the timeout wins then a gate win then the rAF and clock queues are inspected | misattribution store only the outer frame id or cancel the wrong handle so in the half-fired interleaving the cancel hits the spent outer and the inner paint frame stays pending or omit a cancel so a loser stays pending | wiring queue inspection rAF and clock pending
RGcancel | the shipped cancelAnimationFrame still prevents a stale transform after finalize and the done and dropped guards still absorb late fires | the hidden-tab recipe deferring the settle rAF then finalizing via the 340ms fallback then resuming the rAF | the slice replaces the shipped settle-rAF cancel so the resumed rAF writes a stale transform | wiring existing green 598
RG13 | finalization occurs exactly once despite transitionend and the 340ms both firing | the existing duplicate gesture-ending-event fixture | the loser-cancel removes the done guard so both finalize bodies run | wiring existing green 220
RGH | a held reveal keeps the owner through finalize releasing it only at drop | the existing Authors-to-Home held-reveal fixture | the loser-cancel ends the owner at finalize instead of at drop | wiring existing green 569
RGT | a throw in finalize restores finishing so the next swipe engages | the existing throwing-abort fixture | the loser-cancel runs outside the try finally and swallows the throw path | wiring existing green 623
RGend | after the terminal resolver the session is null | a no-pane commit and a held-reveal commit-to-home | the loser-cancel ends ownership early or leaves the session non-null | wiring existing green 588
```

## 10. Records reconciliation (APPLY ON APPROVAL)

The scrub obligations when this ships (StandardsDocument §6.6; Engineering Contract §4.22/§7). NOT applied
by this plan — each is a defining-record edit flagged for the maker/Zelda, not done here.

- **`Claude/Subsystems/swipe-reveal.md` §8** — rewrite to current truth: the reveal frame/timer and the
  340ms finalize fallback ARE now session-owned and loser-cancelled at their resolver; the NULL-on-fire/
  cancel bookkeeping and the `transitionListener` ownership/removal REMAIN owed, moved to the I12 stage
  (their consumer). §10/§11 — add the three newly-cancelled handles (`settleTimer`, `revealFrames`,
  `revealTimer`) to the async-operations / stale-completions lists as loser-cancelled. §19 — register the
  new mutations (the queue cells DF/RR and the RGcancel/RG13/RGH/RGT/RGend regressions) mapped to their
  tests. §21 — strike or update the "the stage-6 cleanup debt (null the timer/listener handles)"
  policy-ledger reference (swipe-reveal.md:100) to current truth: the RELEASE half is closed in 6b; the
  NULL half is re-homed to the I12 stage (F3, StandardsDocument §6.6). §23 — annotate the stage-6 revision
  condition as sub-sliced (6b = loser-cancel; 6c/7 = finalization centralization + null-bookkeeping +
  observability + `sameBrowseHost` + pane lifecycle + I10 reveal-gating + `recoverSession`).
- **`Claude/Decisions/DecisionLog.md`** — update the "Owed to stage 6" entry (2026-07-21) to current truth:
  6b cancels the three loser timer/frame handles (release); the NULL half (its consumer is the deferred I12
  retirement-check) moves to the I12 stage, because no production or test surface reads a nulled handle now
  (§4.15). AND append a dated Stage-6b decision recording the loser-cancel + the honest shrink + the .223
  finding-1b settle-timer half closed (the listener half deferred). Reference this plan and the Charpy r2
  F5 rationale.
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — annotate: the loser-cancel resource-release (6b)
  landed; the null-bookkeeping, `transitionListener` ownership, observability surface, and the finalization/
  reveal centralization remain Stage 6c/7. Point to `PLAN-swipe-stage6b.md`. §3.2 needs no edit — the target
  shape already lists the fields; this slice realizes the three cancellable now.
- **`docs/swipe-model.generated.txt`** — regenerate if line references shift; a code change bumps the build
  number (PWA deploy rule).
- **Engineering Contract §4.22 reviewable-stage naming** — this ships as "Stage 6b", so the deferred half
  stays visible and the stage is not called complete on a partial delivery.
- **Campaign definition — FLAGGED (records/tooling decision owed, not resolved here).** The campaign
  `Claude/Campaigns/swipe-stage6.json` gate globs (`Claude/Charpy/PLAN-swipe-stage6-*.md`, etc.) match
  Stage-6a artifacts; a `stage6b` name does not match `stage6-*`. Before 6b can be checked complete, EITHER
  the globs widen to admit 6b artifacts OR a `swipe-stage6b.json` campaign is created. A defining-record/
  tooling edit for Zelda; this plan neither chooses nor makes it.

## 11. What this does NOT do (deferred, with reasons)

Each deferral names the consumer that does not yet exist and the stage that introduces it (U2).

**Deferred to the I12 stage (the stage that builds the `cur === session` / retirement enforcement):**
- **The NULL-on-retire writes on every handle** (`cur.settleFrame`/`settleTimer`/`revealFrames`/
  `revealTimer` = null on cancel/fire — the literal "Owed to stage 6" debt). Deferred: its only consumer is
  the I12 retirement-check (§4.6, "the resource has not already been retired"); no production code reads a
  nulled handle today and no test surface can observe one (`PBSwipeSession` exposes `{id, dragging}` and
  nulls post-completion; the harness records no cancel/remove call). Writing it now is a dead write with no
  reddening test — §4.15. It lands in the I12 stage, which reads the nulled handle. **Confirmed
  implementable on the two-entry reveal-frame model (Loki-KILL correction):** because `cur.revealFrames`
  always names the ONE currently-pending reveal frame (the outer callback re-stores the inner id — §2),
  nulling it at the resolver — after `drop` cancels that pending frame — truthfully says "no live reveal
  frame," with no second stored id left dangling. A single-outer-id design would have made this null false
  in the half-fired state (the inner pending while the field reads null), which is why the KILL had to be
  fixed HERE, in the field model, not deferred to I12.
- **The `transitionListener` session-ownership + `removeEventListener`.** Deferred: unobservable (no spy;
  `{once:true}`), and today NOT removed when the 340ms wins (its late fire is a `done`-guarded no-op — so
  deferring is parity). Its removal's only consumer is the same I12 check. It lands with the null-bookkeeping.
- **The per-handle-liveness OBSERVABILITY surface** (a `PBSwipeSession` extension reporting whether the
  session names any live handle). Deferred: it is test-observability for a field whose production consumer
  (the I12 reader) is deferred; scoping it now would add a production accessor ahead of its consumer,
  against the harness's "no test-only exports" posture (app-harness.js:29). It is scoped WITH the I12 stage,
  where the reader justifies the accessor.

**Deferred to Stage 6c/7 (the finalization/reveal centralization), unchanged from the prior 6b draft:**
- **`finishing`-gate retirement + `cur === session` stale-callback ENFORCEMENT (I12/I20)** — its
  precondition is the session-owned handles THIS slice creates (it reads them) plus the reachable finalize
  state machine (`PLAN-swipe-stage6.md` §11). This slice is deliberately its foundation.
- **`finalizationPlanFor()` / rich `planFor()`** — consumer is the restructured finalize path; dead fields
  now (§4.15).
- **Normalized `sameBrowseHost`** — dead until `finalizationPlanFor` consumes it; the abort reads
  `cur.clobbered` today (Stage 6a).
- **Pane `release()`/`dispose(reason)`/`equivalence` (I8)** — non-test consumers are the paint-gated reveal
  (I10) and the I8 audit, both Stage 6c; dead surface now (Stage-5 F6 deferral).
- **I10 paint-gated reveal centralization + I17** — the flash-sensitive core (memory
  `tomeroam-swipe-repaint-saga`); requires the finalize restructure and the pane abstraction. This slice
  changes no reveal timing or paint gate; it only cancels the two losing reveal gates after the drop.
- **The full `recoverSession` reason/phase matrix** — undefined conditions with no detector today; post-stack
  needs the restructure.
- **The `fadePanes` per-pane removal `setTimeout`** (app.js:649) — a self-guarded owned-decoration cleanup
  that always completes its one job; it belongs with the pane-lifecycle abstraction (§3.6, Stage 6c).
- **The headline aborted-swipe repaint/flash** — untouched and independent (`PLAN-swipe-reveal.md` §6);
  this slice adds no paint-gating and changes no reveal timing.

## 12. Sequencing

This slice rests only on shipped Stage 5 and Stage 6a and the existing `settle()`/`finalize()`/
`holdGhostUntilPaintable()` path with the shipped .226 settle-rAF cancel. It does not gate, and is not gated
by, the deferred work (§11); it is the session-owned-handle RELEASE foundation the I12 stage consumes (that
stage nulls and reads the same handles and scopes their observability). It stops at the loser-cancel so the
I12 stage adds the null-bookkeeping and the reader in one pass on session-stored handles, and so the
finalization centralization restructures the path on a clean release base. Handoff order: Charpy (temper) ->
Curie (red suite from §9) -> Brunel (green) -> Poirot (review) -> Mendeleev (coverage audit) -> Loki (strike
the §3 load-bearing promise — that each resolver cancels exactly the correct loser so no leaked continuation
survives its phase; the misattribution axis of cells DF/RR, provable on the real scheduler queue). Campaign
definition-of-done: the `swipe-stage6` gates, with the 6b artifact-name reconciliation flagged in §10.
