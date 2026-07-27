# PLAN — Swipe/reveal Stage 6c (I12 ownership half: pane-less supersession + stale-callback enforcement)

Type: plan

<!-- vitruvius-gate {"plan_type":"feature","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":true,"persistence_migration":false,"lifecycle_ownership":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:351-352","js/app.js:551-553","js/app.js:1159-1182"],"callee_ranges":[],"affected_contracts":["test/swipe-invariants.test.js:588"],"staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"blocking_questions":["G1","G2","G3"]} -->

Status: **DRAFT — for Charpy** (2026-07-26). The user authorized Option A (crossing the 6c charter line:
6c MAY retire the `finishing` gate and land I12). The A/B-split analysis (§2) found a **CLEAN** split: a
safe OWNERSHIP-only half exists that (a) narrows the `finishing` gate so a successor can arm mid-finalize
for PANE-LESS transitions — making `cur === session` reachable and the null-on-retire writes a consumed,
observable property — and (b) lands the null-writes + the already-retired/`cur === session` reader + the
`transitionend` listener's session-ownership/removal, WITHOUT touching the flash-sensitive
paint-centralization (the pane-owning reveal path). The paint half DEFERS to 6d/7 with reasons (§11).
Grounded against post-6b HEAD `js/app.js` (build `2026-07-26.250`): `begin()` (351-390), the `finishing`
gate (352), the 6a supersession recovery (360-390), the settle rAF (551-553), `finalize`/`transitionend`/
`settleTimer` (1159-1182), the I12 rationale (219-234), `paneKindOf`/"every other transition slides REAL
elements and covers nothing" (685-692). Grounded against the real harness `test/app-harness.js`: `h.touch`
drives a two-gesture interleave, `deferRaf`/`fakeTimers` expose the pending settle rAF / 340ms timer, and
the observable channel is the SUCCESSOR's real DOM (borrowed-real mover transforms; `browse.render`/
`applyScreen`/nav-stack state) — no `PBSwipeSession` extension is needed. Sub-slice of
`PLAN-swipe-reveal.md` §7 step 6, following Stage 6a (supersession recovery) and Stage 6b (loser-cancel).

**The Option-A escalation this supersedes.** The prior content of this file escalated that the chartered
6c items are vacuous while the `finishing` gate stands (preserved in git at `e273d70`). The user chose
Option A. This plan is the CLEAN-split resolution: it retires the gate for exactly the pane-less window
that makes the reader non-vacuous, and defers the pane-owning/held-reveal window (the flash surface) to
6d/7.

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: false** — no code moves across a module boundary; every change is in place in
  `js/app.js` (`begin()`, `settle()`'s rAF callback, `finalize`). `js/swipe.js` is untouched.
- **callee_replacement: false** — no indirection layer replaces a direct call. `begin()`/`finalize`/the
  settle rAF already exist; the slice narrows one guard and adds ownership checks + retirement to existing
  callbacks.
- **contract_shape: false** — no exact-key contract changes. The in-memory gesture session `d`/`cur` is
  exempt mutable lifecycle state (subsystem §3/§18), not a registered `classifyTransition`/
  `buildConstruction` contract. No closed schema moves; no `PBSwipeSession` shape extension is added (§2.6).
- **state_transfer: false** — no ownership boundary relocates across a seam. The session already owns its
  resources (subsystem §8); this slice makes a superseding gesture RETIRE the old session's settle-phase
  handles and adds ownership guards to the old callbacks — it moves no value across a module boundary
  (same classification as Stage 6a, which also handled supersession as `state_transfer:false`).
- **async_change: true** — the subject is the ownership discipline over three asynchronous continuations
  (the settle rAF; the 340ms finalize fallback `setTimeout`; the `transitionend` listener) under a NEW
  concurrency: a successor gesture arming while they are pending. Each gains a `cur === session`/
  already-retired guard so a stale fire after supersession no-ops (§5).
- **persistence_migration: false** — the gesture is in-memory, per-process (subsystem §15).
- **lifecycle_ownership: true** — the subject is the ownership lifecycle of the settle-phase handles across
  a supersession endpoint: who creates, retires (cancel/remove + null), and reads them, and when a session
  stops being the owner (§6).

## Index
1. Defining records and authority
2. The A/B split — the clean ownership/paint boundary (the crux)
3. Exact scope boundary
4. The enforcement contract (invariant, not prescription)
4b. Value-crossing ledger
5. Async operations — supersession, guards, exactly-once, stale completions
6. Lifecycle ownership — retirement across the supersession endpoint
7. Ordering contract
8. Coverage Model (Mendeleev catalog)
9. Coverage and mutation matrix
10. Records reconciliation (apply on approval)
11. What this does NOT do (deferred to 6d/7, with reasons)
12. Sequencing

## 1. Defining records and authority

Every record that materially defines this slice, its authority, and what this plan changes. **Verdict:
AGREE. No two records disagree on required behaviour. The user's Option-A authorization resolves the
charter-vs-code contradiction the prior escalation raised (the records had a GAP: no bounded slice
supplied a non-vacuous consumer for the null-writes). This plan closes the GAP by making a bounded
pane-less supersession reachable — the smallest change that gives the I12 reader a reachable, observable
consumer — and defers the pane-owning/paint half.**

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| User Option-A authorization (2026-07-26) | 6c MAY retire the `finishing` gate and land I12 (null-writes + `cur === session`/already-retired reader + `transitionListener` removal), the front edge of reveal-centralization. | Current explicit assignment (EC §2 precedence 1) | Implemented for the PANE-LESS window; the pane-owning/held-reveal window (the flash surface) is deferred to 6d/7 (§11) per the "find the safe ownership half" instruction | — |
| `js/app.js` I12 rationale (219-234) | The `cur === session` guard is "UNREACHABLE BY CONSTRUCTION right now" and "becomes reachable, load-bearing and testable only once STAGE 6 retires the `finishing` gate in favour of the state machine." | In-code decision (precedence 3) | Realized for the pane-less half: narrowing the `finishing` gate makes a successor able to arm mid-finalize, so the guard becomes reachable and testable | Rewrite the comment to current truth (§10) |
| `DecisionLog.md` "Owed to stage 6" (2026-07-21) | NULL the stored session handles when cancelled OR fire, "so the session object describes LIVE ownership rather than stale numeric handles ... part of the stage-6 finalization-centralization work." | Active decision ledger | Delivers the null-writes for the SETTLE-phase handles (`settleFrame`, `settleTimer`, `transitionListener`) — now with a reader (the guards) that consumes them; the reveal-phase handles' nulls stay owed to 6d/7 (their reader is not yet reachable — §11) | Update to current truth: settle-phase nulls done in 6c with the guard as consumer; reveal-phase nulls re-homed to 6d/7 (§10) |
| `EngineeringContract.md` §4.6 | A stale continuation must "capture: owner identity ... Before acting, verify: the owner remains valid ... the resource has not already been retired ... a successor has not taken ownership. Tests must deliberately deliver stale callbacks after supersession." | Core rule | The exact contract this slice satisfies for the settle-phase callbacks; the tests deliver a stale callback after supersession (cells G1/G2/G3) | — |
| `EngineeringContract.md` §4.15 | "Do not introduce a field until the same implementation slice contains a real production consumer and a test proving that consumer uses it." | Core rule | The settle-phase null-writes now have a production consumer (the ownership guards) and a reddening test (G1/G2/G3); no dead field. The reveal-phase nulls are NOT added (their consumer is unreachable — §11) | — |
| `EngineeringContract.md` §4.18 / subsystem §14 | "A successor may not dispose resources still owned by a valid active operation unless the policy explicitly defines supersession at that phase." "`begin()`'s hard reset ... must NOT dispose a pane owned by an active SETTLING/FINALIZING/REVEALING session (I17)." | Core rule + subsystem | This slice DEFINES supersession for the pane-LESS settle/finalize phase only (no owned pane to dispose). A pane-owning session stays protected (cell PG pins it); the reveal-await-paint disposal stays deferred | Narrow §14/I17 to "protects a PANE-OWNING settling/finalizing/revealing session" (§10) |
| `PLAN-swipe-reveal.md` I12 / I18 / I20 | I12: every async callback captures `session.id` and no-ops when superseded. I20: a superseding gesture recovers the old session and fully releases it before the new arms; only the new session may thereafter mutate transforms/stacks/scroll/panes. | Invariants (strategic) | I12 realized for the settle-phase callbacks; I20 extended — a superseded pane-less session's settle continuations can no longer mutate transforms/stack because they no-op via the guard | — |
| `PLAN-swipe-reveal.md` §7 step 6 | "Centralize finalization and reveal ordering (I10, I17)." | Plan-of-record (staging) | Delivers the ownership half of the finalization centralization (the `cur === session` model for the pane-less window); the reveal-ordering/paint half (I10/I17) stays 6d/7 | Annotate §7 step 6 as sub-sliced (§10) |
| `js/app.js` `begin()` gate (352) + recovery (360-390) | `if (finishing) return;` blanket-rejects new gestures during settle→drop. The 6a recovery (`if (d || .nav-ghost)`) restores source/scroll inside the Browse hold — but only for a DRAGGING (`d` non-null) session or a leftover ghost, NOT a pane-less settling session (`d` is null, no `.nav-ghost`). | Code under change | Narrow the gate: a pane-LESS finishing session is SUPERSEDED (extend the 6a recovery, reading `cur.clobbered`/`cur.scroll0` since `d` is null in settle) then the successor arms; a pane-OWNING finishing session still returns (deferred) | — |
| `js/app.js` `finalize`/`settle` rAF (551-553, 1159-1182) | The settle rAF writes transforms on borrowed-real movers; `finalize` (`done`-guarded) runs `runFinalize` (applyScreen + stack mutation); the `transitionend` listener (`{once:true}`, 1181) and the 340ms `settleTimer` (1182) both call `finalize`. `cancelAnimationFrame(cur.settleFrame)` (1163) and `clearTimeout(cur.settleTimer)` (1168) are shipped (.226/6b). | Code under change | Add the `cur === session`/already-retired guard to the settle rAF callback and to `finalize`; make the `transitionend` listener session-owned (`cur.transitionListener`) + removed; NULL the settle-phase handles on retire | — |
| `test/app-harness.js` (245, 732-763, 789-834) | `h.touch` drives the real two-gesture interleave; `deferRaf`/`fakeTimers` hold the pending settle rAF / 340ms timer; `browse.render`/`window.scrollTo`/nav are recorded; `PBSwipeSession` exposes `{id,dragging}` and "NO test-only exports" (29). | Verified test tooling (precedence 3) | The observable channel: the SUCCESSOR's real DOM/log after a stale callback fires — a guarded no-op leaves it intact; an unguarded fire corrupts it (cells G1/G2/G3). No new accessor is added | — |

Authority precedence: the user's Option-A assignment governs that 6c lands I12; EC §4.6/§4.18 and the
in-code I12 rationale govern the enforcement shape and the disposal boundary; the harness (verified
tooling) governs what is observable and therefore where the split must fall.

## 2. The A/B split — the clean ownership/paint boundary (the crux)

The Option-A question: is there a SAFE ownership-only half that makes `cur === session` reachable (so the
null-writes are consumed and observable) WITHOUT the flash-sensitive paint-centralization? **Yes, and the
dividing line is the OWNED PANE.**

**2.1 Two sub-regions of the finishing window.** A gesture's `settle()→finalize()→(held reveal)→drop()`
window splits by whether the transition owns a full-viewport cover pane:
- **Pane-LESS transitions** (home↔browse, browse↔overlay, overlay↔home, …) — "every other transition
  slides REAL elements and covers nothing" (app.js:685-692). They own NO pane at any phase; they finalize
  via `runFinalize`'s no-pane path (`revealPending` false) and never enter `holdGhostUntilPaintable`.
- **Pane-OWNING transitions** (browse→browse ghost, →home snapshot) — own a pane from `start()` through
  settle, finalize, and the held reveal until `drop()`.

**2.2 Only the pane-OWNING region is flash-sensitive.** The flash saga (memory
`tomeroam-swipe-repaint-saga`; `holdGhostUntilPaintable`) is entirely about a full-viewport pane held to
cover the view UNTIL a paint frame lands, so the uncover is invisible. Disposing that pane early uncovers
un-painted / rebuilding content — the flash. A pane-less transition has no such pane; its settle just
slides real elements with a CSS transition (app.js:545). Interrupting that slide (reset transforms, snap
to place) is the SAME operation Stage 6a already performs when superseding a DRAGGING gesture — parity for
the flash is the bar and 6a met it.

**2.3 The split, precisely.** 6c makes **pane-LESS** settle/finalize sessions SUPERSEDABLE; **pane-OWNING**
sessions stay GATED (rejected) in every phase and DEFER to 6d/7. Consequences:
- Superseding a pane-less session disposes NO pane (there is none) and touches NO reveal-paint code
  (`holdGhostUntilPaintable`, `drop`, the decode/paint/timeout gates, `fadePanes`, `watchFrames` — all
  unchanged). Zero flash surface is touched.
- The reachable stale callbacks are exactly the settle-phase ones (settle rAF, 340ms `settleTimer`→
  `finalize`, `transitionend`→`finalize`). The reveal-phase handles (`revealFrames`, `revealTimer`) fire
  only inside the pane-owning held reveal, which stays gated → unreachable → their guards/nulls DEFER
  (§11), not dead-added now.

**2.4 Why this makes the reader NON-VACUOUS (the whole point).** Under the narrowed gate a successor B can
arm while a pane-less session A is still settling. If A's settle rAF then fires, it writes `translateX`
onto the borrowed-real movers (#home/#browse/overlay) — now owned by B — corrupting B's view. If A's
340ms `settleTimer` or a late `transitionend` fires, it runs `finalize_A`→`runFinalize_A` (applyScreen +
stack mutation for A's destination) OVER B — the wrong-page class. `done_A` does NOT save this: A was
superseded BEFORE it finalized, so `done_A` is false. The `cur === session`/already-retired guard is what
makes each stale fire a no-op. The mutation (remove the guard, or omit the null-on-retire write the guard
reads) lets the stale callback mutate B — observable on B's real DOM. That is the reachable, non-vacuous
cell the prior escalation proved impossible while the gate stood.

**2.5 Why the split is CLEAN (separable from the paint restructure).** 6c reuses Stage 6a's supersession
recovery (reset borrowed-real movers, restore source/scroll, release the Browse hold, identity-null last)
MINUS the pane disposal, PLUS retiring the settle-phase async handles. It adds no pane lifecycle method,
no `finalizationPlanFor`, no `sameBrowseHost`, no reveal gating. The pane-owning boundary is pinned by a
regression cell (PG) so a build cannot silently enable the unsafe pane-disposing supersession.

**2.6 No `PBSwipeSession` extension is scoped, and why.** The prior escalation flagged that a liveness
accessor would be a §4.15 dead field if its only consumer were a test. That risk is now gone: the reader
is consumed by CONTROL FLOW (the guarded callback no-ops), and its effect is read on the SUCCESSOR's real
DOM — not on a session-field accessor. So the observability surface 6b / the 6c-escalation flagged is NOT
added.

## 3. Exact scope boundary

Behavioural ownership, not function names. All changes are in `js/app.js` `begin()`, `settle()`'s rAF
callback, and `settle()`'s inner `finalize`. No other function, module, or user-visible behaviour changes.

**Changes:**
- **`begin()` gate narrowed (app.js:352).** The blanket `if (finishing) return;` becomes phase-aware: an
  in-flight session that is PANE-LESS (owns no `owned-pane` mover — read via the existing `paneKindOf`
  classification) and not in the held-reveal phase is SUPERSEDED; a PANE-OWNING or held-reveal session
  still returns (deferred, cell PG). `finishing` is retained as the gate for the deferred cases — narrowed,
  not deleted.
- **`begin()` recovery extended to the pane-less settling session.** When superseding such a session
  (`d` is null in settle, no `.nav-ghost`), run the 6a recovery reading the SESSION's fields (`cur.clobbered`/
  `cur.scroll0`, the same object `d` referenced — comment 213-216) instead of `d`: reset the borrowed-real
  movers (`resetSwipeStyles`), restore the source screen + scroll inside the Browse hold envelope (6a's
  order — render+scroll, then `dropRowHold`→`endHold`, then identity-null), and RETIRE the session's
  settle-phase handles (null them — §4/§6). The pane-disposal steps of the 6a recovery are not reached
  (no pane).
- **`cur === session`/already-retired guard on the settle-phase callbacks.** The settle rAF callback
  (551-553) verifies it still owns the session before writing transforms; `finalize` (1159-1182) verifies
  it before running `runFinalize`. A stale fire after supersession no-ops (§4).
- **`cur.transitionListener` — the `transitionend` listener becomes session-owned + removed.** The
  `addEventListener('transitionend', finalize, {once:true})` (1181) is stored as `cur.transitionListener`
  (with its handler ref) so it can be removed: `finalize` removes it (the within-session hygiene the 6b
  debt named), and `begin()`'s supersession recovery removes it as part of retiring the old session. A
  late `transitionend` after removal cannot fire `finalize_A`; a late one before removal no-ops via the
  guard.
- **NULL-on-retire writes on the settle-phase handles.** `cur.settleFrame`, `cur.settleTimer`,
  `cur.transitionListener` are set to null when retired — cancelled/removed within the session (finalize)
  OR retired by supersession (begin recovery) OR fired. The already-retired guard reads them; the null is
  the truthful-ownership record the "Owed to stage 6" debt requires (EC §4.5).

**Stays exactly as today (parity — do NOT re-touch):**
- The `.226` `cancelAnimationFrame(cur.settleFrame)` (1163) and the 6b loser-cancel
  `clearTimeout(cur.settleTimer)` (1168) — the WITHIN-session defenses; the cross-session guard is ADDED
  alongside, not in place of them (regressions RG226, RG6b).
- The exactly-once guards `done` (1160) and `dropped` (751) — untouched.
- `holdGhostUntilPaintable` and the entire reveal-paint path (the decode/paint/timeout gates, `drop`,
  `fadePanes`, `watchFrames`, `cur.revealFrames`/`cur.revealTimer`) — UNTOUCHED. 6c changes no reveal
  timing or paint gating.
- Stage 6a's DRAGGING-supersession recovery and its pane disposal — untouched (regression RG6a).
- Pane-OWNING sessions stay rejected by `begin()` in every phase (cell PG).

**Split across the seam:** none — no code relocates; this is an in-place guard/retirement addition plus a
gate narrowing.

**Deferred (§11 expands, with the consumer each waits on):** supersession of PANE-OWNING sessions and the
held-reveal-await-paint phase (consumer = the paint-centralization / I10-I17 restructure, 6d/7); the
reveal-phase handles' guards + null-writes (`revealFrames`/`revealTimer` — reachable only when the reveal
phase becomes supersedable, 6d/7); `finalizationPlanFor`/`sameBrowseHost`/pane `release`/`dispose`; the
full `recoverSession` matrix.

## 4. The enforcement contract (invariant, not prescription)

**Invariant (the load-bearing promise).** When a gesture supersedes a PANE-LESS session that is still
settling or finalizing (`begin()`'s narrowed supersession branch), the old session's settle-phase
continuations cannot mutate the successor:

1. **Ownership retirement.** On supersession, `begin()` retires the old session's settle-phase handles:
   it removes `cur.transitionListener`, and NULLS `cur.settleFrame`/`cur.settleTimer`/`cur.transitionListener`
   so the old session no longer describes them as live (EC §4.5; the "Owed to stage 6" debt).
2. **Guarded settle rAF.** The settle rAF callback verifies `cur === session` (and its handle is not
   already retired) before writing `translateX` on the borrowed-real movers. A frame that fires after the
   successor armed no-ops, so the successor's movers keep their own transforms (cell G1; EC §4.6).
3. **Guarded finalize.** `finalize` verifies `cur === session` (and not already retired) before running
   `runFinalize`. A 340ms `settleTimer` or a late `transitionend` that fires after supersession — when
   `done` is false because the superseded session never finalized — no-ops, so it does NOT applyScreen or
   mutate the nav stack over the successor (cells G2, G3; EC §4.6).
4. **Deferral boundary.** A PANE-OWNING session (ghost/snapshot) is NOT superseded — `begin()` still
   returns while it is finishing — so no owned pane is disposed by supersession in this slice (cell PG;
   EC §4.18 "a successor may not dispose resources still owned by a valid active operation unless the
   policy explicitly defines supersession at that phase" — this slice defines it for the pane-less phase
   only).
5. **Endpoint (parity).** The successor's ownership begins only after the old session's recovery completes
   and its identity is nulled last (6a's order, unchanged); `session === null` after a terminal path stays
   as shipped (regression, `test/swipe-invariants.test.js:588`).

**Basis (U11).** Items 1-3 are the EC §4.6 stale-continuation contract and the in-code I12 rationale
(219-234), now reachable because item 4 narrows the gate exactly enough. The mechanism is fixed because
one design satisfies it: capture the session on each continuation and verify `cur === session`/not-retired
before acting, exactly as EC §4.6 prescribes. The LOCUS (an inline guard vs a shared `stillOwns(cur)`
helper) and the exact expression of "already retired" (null-field read vs the identity check alone) are
**recommendations**; the invariant is "a settle-phase continuation that fires after a successor has taken
ownership performs none of its effect."

**Why the null-writes are consumed now (U4 consumer-now).** The settle-phase null-writes' consumer is the
already-retired arm of the guards (item 1→2/3): begin()'s supersession nulls the handles, and the guarded
callback reads "retired, and `cur !== session`" and no-ops. Omitting the null (or the guard) lets the
stale callback act on the successor — a reddening test (G1/G2/G3). This is the consumer the prior
escalation showed did not exist while the gate stood; narrowing the gate (item 4) creates it.

**Why the reveal-phase nulls are NOT in this slice (§4.15).** `cur.revealFrames`/`cur.revealTimer` retire
only inside the held reveal, which owns a pane and therefore stays gated (item 4) — no successor can arm
during it, so a `cur === session` guard on the reveal callbacks is still unreachable/vacuous. Adding their
null-writes now would be a dead write with no reddening test. They defer to 6d/7 with the pane-owning
supersession that makes them reachable (§11).

**Why parity at the user layer (honesty).** A guarded no-op changes nothing the user sees on the common
path (no supersession, guard true, callback runs as today). It changes behaviour only on the SUPERSESSION
path, where today the gate rejected the second gesture entirely — so the new observable is "the second
gesture is now accepted and the first's stale callbacks cannot corrupt it," a correctness gain, stated as
such, not a change to the single-gesture path.

## 4b. Value-crossing ledger

Machine-readable ledger (prose mirrors the fenced block). Every settle-phase handle the slice brings under
supersession-aware ownership, with one owner, its consumer, and its verification.

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
cur.settleFrame settle rAF handle | resource | inout | settle@S6c | settleRafGuard@S6c | settle rAF callback | per-gesture | G1 successor-transform test
cur.settleTimer 340ms finalize handle | resource | inout | settle@S6c | finalizeGuard@S6c | finalize | per-gesture | G2 successor-screen test
cur.transitionListener transitionend handle | resource | inout | settle@S6c | finalizeGuard@S6c | finalize | per-gesture | G3 successor-screen test
settle-phase retired-null record | boolean | out | beginRecover@S6c | ownershipGuards@S6c | beginRecover | per-gesture | G1 G2 G3 already-retired mutation
```

Notes: every handle row is `inout` — produced at `settle`'s scheduling site and consumed (guarded/retired)
by its owner. The retired-null record is produced by `begin()`'s supersession recovery and consumed by the
callback guards. `cur.revealFrames`/`cur.revealTimer` are ABSENT — deferred (§11), their reader unreachable
while the reveal phase stays gated. No handle is produced in a stage later than consumed (all S6c).

## 5. Async operations — supersession, guards, exactly-once, stale completions

Named concerns for `async_change`. No NEW asynchronous surface is created and no timing changes; the change
is a new CONCURRENCY (a successor arming while settle-phase continuations are pending) and the guards that
make it safe.

- **Cancellation / supersession.** `begin()`'s narrowed supersede path RETIRES the old pane-less session's
  settle-phase handles (removes `cur.transitionListener`; nulls the three handles). The old callbacks that
  still fire are neutralized by their `cur === session`/already-retired guards, not (only) by cancellation
  — the EC §4.6 model, so a missed cancel is still safe.
- **Temporal / ordering.** The guard reads the module `session` at CALL time and compares to the captured
  `cur`; supersession sets `session` to the successor before the old callback runs, so the ordering
  "successor arms → old callback fires → guard sees `cur !== session` → no-op" holds. `finalize`'s `done`
  set precedes any guard so re-entry is impossible.
- **Fail / error / reject.** A guard that throws must not wedge future swipes: the guard is a pure
  comparison + early return (no throw path). `finalize`'s existing `try/finally` (1175-1178) that restores
  `finishing` on a throw is unchanged; the guard runs before `runFinalize`, so a superseded finalize
  returns before entering the try, leaving `finishing`/successor state untouched.
- **Concurrency / race (the load-bearing race, Loki target).** Two gestures: A settling (pane-less), B
  superseding. The race is A's settle rAF / 340ms `settleTimer` / late `transitionend` firing after B
  arms. The guard makes each a no-op; the tests deliver each stale callback deliberately after supersession
  (cells G1/G2/G3), per EC §4.6 "Tests must deliberately deliver stale callbacks after supersession."
- **Within-session parity preserved.** The `.226` settle-rAF cancel and 6b's loser-cancels still handle the
  within-session (hidden-tab, double-fire) cases (regressions RG226, RG6b); the cross-session guard is
  additive.

## 6. Lifecycle ownership — retirement across the supersession endpoint

Named concerns for `lifecycle_ownership`.

- **Create / acquire.** `settle()` creates `cur.settleFrame` (551), `cur.settleTimer` (1182), and
  `cur.transitionListener` (the stored `transitionend` binding, 1181). Each is stored on `cur`.
- **Borrow.** `cur.transitionListener` borrows the anchor element (`cur.movers[0].el`, a borrowed-real
  shared node); the handle owns only the binding, not the node. The settle rAF borrows the real movers.
- **Mutate.** No handle mutates session state beyond its own slot; the callbacks' effects (transform write,
  finalize) are guarded but otherwise unchanged.
- **Release.** Two release paths: WITHIN-session — `finalize` cancels `settleFrame`/`settleTimer` (.226/6b)
  and removes `transitionListener`, nulling each; CROSS-session — `begin()`'s supersession recovery retires
  the old session's handles (remove listener, null all three). The already-retired guard reads the nulled
  record.
- **Dispose / destroy.** No node is disposed by this slice (pane-less path). Pane disposal on supersession
  stays deferred (pane-owning sessions gated — cell PG).
- **Fail / error.** Retirement is null-assignment and `removeEventListener` — no throw path; a guard read
  on a nulled handle is a safe comparison.
- **Endpoint (parity).** The successor's ownership begins only after the old session's identity is nulled
  last (6a order). `session === null` after a terminal path stays as shipped (`:588`). "`session !== null`
  means live ownership" (subsystem §9) is strengthened: a superseded session's settle-phase handles now
  read retired.

## 7. Ordering contract

**Correctness requirement (cells G1/G2/G3) — successor arms before the stale callback fires; the guard
reads the post-supersession `session`.** In `begin()`'s supersede path: (1) retire the old session's
settle-phase handles and complete the 6a recovery (reset movers, restore source/scroll inside the hold,
identity-null LAST — the app.js:1132 invariant, unchanged); (2) set `session` to the successor
(`bindGesture`). A subsequently-firing old callback reads `session` = successor, so `cur !== session`. The
guard's placement is: BEFORE the effect (transform write in the rAF callback; `runFinalize` in `finalize`),
and AFTER `finalize`'s `done` set so it cannot re-enter.

Incidental (not a new universal order): the relative order of nulling the three settle-phase handles is
unconstrained (independent). The `.226` `cancelAnimationFrame`/6b `clearTimeout` positions in `finalize`
are preserved, with the null-assignment added adjacent. The 6a recovery order (render+scroll → `endHold` →
identity-null) is reused unchanged.

## 8. Coverage Model (Mendeleev catalog)

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | The settle-phase handles are retired at supersession and within-session; a superseded pane-less session's continuations no-op; the endpoint is parity (cells G1/G2/G3; RGend). |
| Identities | Yes | `cur === session` identity is the ownership proof the guards read; `d.id`/`sessionSeq` semantics unchanged, but the identity is now LOAD-BEARING at the callbacks (cells G1/G2/G3). |
| Ordering | Yes | Successor arms (session reassigned) before the stale callback fires, so the guard sees `cur !== session` (cells G1/G2/G3); retirement order among handles is incidental (§7). |
| Resources: acquired / owner / endpoint | Yes | The three settle-phase handles are session-owned and retired at one of two paths (finalize / supersession), nulled on retire; the endpoint is parity (cells G1/G2/G3; RGend). |
| Async operations | Yes | A settle-phase continuation firing after a successor arms no-ops via the guard, rather than mutating the successor (cells G1/G2/G3; §5). |
| Stale completions | Yes | The cross-session stale fire (settle rAF / 340ms / transitionend after supersession) is neutralized by the guard (cells G1/G2/G3); the within-session .226/6b stale defenses stay green (RG226, RG6b). |
| Normal completion | Yes (parity) | The single-gesture settle/finalize path is unchanged — the guard is true, the callback runs as today (RG226, RG6b, and the existing finalize suite stay green). |
| Recovery authority boundary | Yes | Supersession recovery for a pane-less settling session restores source+scroll pre-stack (extends 6a); the pane-owning recovery stays deferred/gated (cell PG). |
| Emergency disposal | Yes (boundary) | This slice defines supersession for the pane-LESS phase (no pane disposed); a pane-OWNING session is NOT disposed by supersession (cell PG pins EC §4.18 / subsystem §14). |
| Persistence | N/A | The gesture is in-memory, per-process (subsystem §15). |
| External side effects | Yes | The successor's `browse.render`/`applyScreen`/`window.scrollTo`/nav-stack must show the SUCCESSOR's, never a stale finalize's (cells G2, G3). |
| Invariants | Yes | I12 (async callbacks no-op when superseded) realized for the settle phase; I20 (only the successor mutates transforms/stack) extended; the deferral boundary (I17/§14) narrowed and pinned (cell PG). |
| Mutation cases | Yes | Each cell in §9 names a misattribution/omission mutation observable on the successor's DOM (remove the guard, or omit the null the guard reads, so the stale callback corrupts the successor). |
| Known-red | N/A | This slice introduces no known-red; PolicyLedger has no active entries and none is added. |
| Composition | Yes | The guard composes with the within-session `done`/`dropped` + .226/6b cancels (belt to their suspenders), with the 6a supersession recovery (extended to the settle phase), and with the DEFERRED pane-owning supersession (which the guard model completes in 6d/7) (cells G1/G2/G3; PG). |
| Contract claims (exact schema) | N/A | No exact-key contract changes (contract_shape:false); `d`/`cur` is exempt mutable lifecycle state; no `PBSwipeSession` shape extension (§2.6). |
| Concurrency | Yes | The new concurrency (successor arming while settle-phase continuations pend) is the subject; the guard is single-writer-safe (reads `session` synchronously at call time) (cells G1/G2/G3). |
| Observability | Yes | The cells assert on the SUCCESSOR's REAL DOM/log (mover transforms; `browse.render`/`applyScreen`/nav), the channel the harness provides — no `PBSwipeSession` extension is added (§2.6). |

## 9. Coverage and mutation matrix

Every load-bearing promise and parity obligation maps to at least one production-facing test driving the
real `begin()`/`settle()`/`finalize()` through the app-harness (`test/app-harness.js` `h.touch` + `h.raf` +
`h.clock`), each with a mutation that reddens it on the SUCCESSOR's real surface.

| id | Behavior proved | Fixture / transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| G1 | A stale settle rAF from a superseded pane-less session no-ops — it writes NO `translateX` onto the successor's borrowed-real movers | a pane-less (e.g. home→browse) live drag → release into settle with `deferRaf` (settle rAF pending); a 2nd touch supersedes and arms B; fire the old frame (`h.raf.frame()`); assert B's `#home`/`#browse` transforms are B's, unstained | misattribution/omission (§4.10): remove the `cur === session`/already-retired guard on the settle rAF callback (or omit the null-on-retire on `cur.settleFrame`) → the old frame writes a stale `translateX` on the successor's movers | wiring (successor DOM transforms) |
| G2 | A 340ms `settleTimer` firing after supersession does NOT run `runFinalize` over the successor — no `applyScreen`/stack mutation for the old destination | a pane-less live drag → settle with `fakeTimers` (340ms pending, `done` false); supersede → arm B; advance past 340ms so the old `settleTimer` fires `finalize_A`; assert no `browse.render`/`applyScreen` for A's dest and B's nav stack intact | omit the guard on `finalize` (or the null it reads) → `finalize_A` runs `runFinalize_A`, calling `applyScreen`/mutating the stack over B (the wrong-page class) | wiring (successor log + nav) |
| G3 | A late `transitionend` after supersession does NOT run `finalize_A` over the successor | a pane-less live drag → settle; supersede → arm B; dispatch `transitionend` on the old anchor (`cur.movers[0].el`, borrowed-real); assert `finalize_A` performed no `applyScreen`/stack mutation over B | omit the `transitionListener` removal AND the finalize guard → the late `transitionend` runs `finalize_A` over B (defense in depth: with the guard kept and removal omitted, the guard still no-ops) | wiring (successor log + nav) |
| PG | A PANE-OWNING (ghost/snapshot) settling session is STILL rejected by `begin()` — supersession does NOT dispose its held pane (the deferral boundary) | a browse→browse (ghost) live drag → release into settle; a 2nd touch; assert `begin()` returns (no recovery/arm) and the ghost pane is not disposed (`ghosts` unchanged) | the narrowed gate wrongly supersedes a pane-owning session → its owned pane is disposed mid-settle (the deferred, flash-unsafe path) | wiring (pane count) |
| RG226 | The shipped `cancelAnimationFrame(cur.settleFrame)` still prevents a within-session stale transform after finalize (hidden-tab) | the .226 hidden-tab recipe (unchanged) | the slice drops the within-session settle-rAF cancel → the resumed rAF writes a stale transform | wiring (existing green) |
| RG6b | The 6b loser-cancels (`settleTimer`/`revealFrames`/`revealTimer`) still leave the scheduler queue at their resolver (within-session) | the 6b DF/RR fixtures (unchanged) | the slice drops a within-session loser-cancel → the loser stays pending | wiring (existing green) |
| RG6a | Stage 6a DRAGGING-supersession recovery (source re-render + scroll + kept rows) still holds | the 6a VR/SR/SC fixtures (unchanged) | the slice breaks the 6a recovery order | wiring (existing green) |
| RGend | After a terminal resolver the session is null (endpoint parity) | a pane-less commit and abort | the guard/retirement ends ownership early or leaves the session non-null | wiring (existing green, `:588`) |

**Machine-readable coverage (gate).** Each blocking question (G1/G2/G3) has a complete row; PG pins the
deferral boundary; the RG* rows pin shipped parity.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
G1 | a stale settle rAF from a superseded pane-less session writes no translateX onto the successor borrowed-real movers | a pane-less home-to-browse live drag released into settle with deferRaf then a second touch supersedes and arms B then the old frame is fired and B movers inspected | remove the cur-equals-session or already-retired guard on the settle rAF callback or omit the settleFrame null so the old frame stains the successor movers | wiring successor DOM transforms
G2 | a 340ms settleTimer firing after supersession does not run runFinalize over the successor so no applyScreen or stack mutation for the old destination | a pane-less live drag settling with fakeTimers where a second touch supersedes and arms B then the clock advances past 340ms firing the old settleTimer | omit the finalize guard or the null it reads so finalize of the old session runs applyScreen and mutates the nav stack over B | wiring successor log and nav
G3 | a late transitionend after supersession does not run finalize of the old session over the successor | a pane-less live drag settling where a second touch supersedes and arms B then transitionend is dispatched on the old anchor | omit the transitionListener removal and the finalize guard so the late transitionend runs the old finalize over B | wiring successor log and nav
PG | a pane-owning ghost or snapshot settling session is still rejected by begin so supersession disposes no held pane | a browse-to-browse ghost live drag released into settle then a second touch where begin must return and the ghost pane must not be disposed | the narrowed gate wrongly supersedes a pane-owning session disposing its held pane mid-settle | wiring pane count
RG226 | the shipped settle-rAF cancel still prevents a within-session stale transform after finalize | the hidden-tab recipe deferring the settle rAF then finalizing then resuming the rAF | the slice drops the within-session settle-rAF cancel so the resumed rAF writes a stale transform | wiring existing green
RG6b | the 6b loser-cancels still leave the scheduler queue at their resolver | the 6b DF and RR fixtures | the slice drops a within-session loser-cancel so the loser stays pending | wiring existing green
RG6a | the stage 6a dragging-supersession recovery still re-renders the source and restores scroll and kept rows | the 6a VR and SR and SC fixtures | the slice breaks the 6a recovery order | wiring existing green
RGend | after a terminal resolver the session is null | a pane-less commit and abort | the guard or retirement ends ownership early or leaves the session non-null | wiring existing green 588
```

## 10. Records reconciliation (APPLY ON APPROVAL)

Scrub obligations when this ships (StandardsDocument §6.6; EC §4.22/§7). NOT applied by this plan — each is
a defining-record edit flagged for the maker/Zelda.

- **`js/app.js` I12 rationale comment (219-234)** — rewrite to current truth: the `cur === session` guard is
  now REACHABLE and LOAD-BEARING for the pane-less supersession window (6c); it remains deferred only for
  the pane-owning/held-reveal window (6d/7).
- **`Claude/Subsystems/swipe-reveal.md`** — §8: the settle-phase handles (`settleFrame`, `settleTimer`,
  `transitionListener`) now NULL on retire and are guarded by `cur === session`/already-retired; the
  reveal-phase handles' null/guard remain owed to 6d/7. §13/§14: narrow the "must NOT dispose a pane owned
  by an active SETTLING/FINALIZING/REVEALING session" to a PANE-OWNING session, and record that supersession
  is now DEFINED for the pane-less phase (EC §4.18). §11: add the cross-session stale-fire completions
  (settle rAF / 340ms / transitionend after supersession) as guarded. §19: register the G1/G2/G3/PG
  mutations mapped to their tests. §20/§21: note the I12 ownership half landed in 6c; §23: annotate the
  stage-6 revision condition as sub-sliced (6c = pane-less supersession + I12 settle-phase; 6d/7 =
  pane-owning/reveal supersession + paint centralization).
- **`Claude/Decisions/DecisionLog.md`** — update the "Owed to stage 6" entry (2026-07-21) to current truth:
  the settle-phase null-writes landed in 6c with the ownership guards as consumer; the reveal-phase
  null-writes moved to 6d/7 (their reader unreachable until the reveal phase is supersedable). AND append a
  dated Stage-6c decision recording the CLEAN A/B split (pane-less IN, pane-owning/paint DEFERRED), the I12
  settle-phase enforcement, and the Option-A authorization. Reference this plan and the superseded
  escalation (`e273d70`).
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — annotate: the ownership half of the finalization
  centralization (the `cur === session` model for the pane-less window) landed in 6c; the reveal-ordering/
  paint half (I10/I17), `finalizationPlanFor`, `sameBrowseHost`, and pane lifecycle remain 6d/7. Point to
  `PLAN-swipe-stage6c.md`.
- **`docs/swipe-model.generated.txt`** — regenerate if line references shift; a code change bumps the build
  number (PWA deploy rule).
- **Engineering Contract §4.22 reviewable-stage naming** — this ships as "Stage 6c", so the deferred
  pane-owning/paint half stays visible and the stage is not called complete on a partial delivery.
- **Campaign definition — FLAGGED (records/tooling decision owed, not resolved here).** The `swipe-stage6`
  campaign gate globs (`stage6-*`) do not match a `stage6c` artifact name (open since 6b §10). Before 6c can
  be checked complete, EITHER the globs widen OR a `swipe-stage6c.json` campaign is created. A tooling edit
  for Zelda; this plan neither chooses nor makes it.

## 11. What this does NOT do (deferred to 6d/7, with reasons)

Each deferral names the consumer that does not yet exist and the stage that introduces it (U2).

**Deferred to 6d/7 (the pane-owning / paint-centralization half):**
- **Supersession of PANE-OWNING sessions (ghost/snapshot) and the HELD-REVEAL-await-paint phase.**
  Deferred: disposing a full-viewport cover pane on supersession — especially one held to cover the view
  until a paint frame lands — is the flash-sensitive paint operation the whole reveal saga is about
  (`holdGhostUntilPaintable`; memory `tomeroam-swipe-repaint-saga`). Its consumer is the paint-centralized
  reveal (I10/I17). Enabling it now would pull the flash surface into this slice; cell PG pins that it
  stays gated.
- **The reveal-phase handles' guards + null-writes (`cur.revealFrames`, `cur.revealTimer`).** Deferred:
  they retire only inside the held reveal, which stays gated (above), so a `cur === session` guard on the
  reveal callbacks is unreachable/vacuous today — a dead write with no reddening test (§4.15). They land in
  6d/7 with the pane-owning supersession that makes them reachable.
- **`finalizationPlanFor()` / rich `planFor()`; normalized `sameBrowseHost`; pane `release()`/
  `dispose(reason)`/`equivalence`; the full `recoverSession` reason/phase matrix; I10 paint-gated reveal
  centralization + I17.** Unchanged from the prior deferrals (6a/6b §11): their consumers are the
  restructured reveal/finalize path (6d/7); dead surface now.
- **The `transitionListener` removal proven ONLY within-session.** In 6c the removal is proven by the
  cross-session guard (G3) AND used by the supersession recovery; a purely within-session removal test
  (340ms won, listener leaked) stays vacuous-by-`done` as the escalation found, so it is NOT added as a
  standalone cell — the removal's load-bearing test is G3.

**Deferred, unchanged (independent):**
- **The headline aborted-swipe repaint/flash.** Untouched and independent (`PLAN-swipe-reveal.md` §6); this
  slice adds no paint-gating and changes no reveal timing.
- **The `fadePanes` per-pane removal `setTimeout`** (app.js:649) — a self-guarded owned-decoration cleanup;
  belongs with the pane-lifecycle abstraction (6d/7).

## 12. Sequencing

This slice rests only on shipped Stage 5, Stage 6a (the supersession recovery it extends), and Stage 6b
(the loser-cancel it preserves). It does not gate, and is not gated by, the deferred 6d/7 work (§11); it is
the ownership foundation the paint-centralization builds on (6d/7 makes the pane-owning/reveal phase
supersedable on the `cur === session` model this slice establishes). It stops at the pane-less boundary so
6d/7 restructures the flash-sensitive reveal path on a clean, guarded ownership base. Handoff order: Charpy
(temper) → Curie (red suite from §9) → Brunel (green) → Poirot (review) → Mendeleev (coverage audit) → Loki
(strike the §4 load-bearing promise — that a settle-phase continuation firing after a successor takes
ownership performs none of its effect; the misattribution/race axis of cells G1/G2/G3, provable on the
successor's real DOM). Campaign definition-of-done: the `swipe-stage6` gates, with the 6c artifact-name
reconciliation flagged in §10.
