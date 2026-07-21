# Code review — swipe stage 3 (session / resource owner)

- **Subject:** build `2026-07-19.223`, commit `33c7653` ("complete Stage 3 — resource ownership + the ownership endpoint"), production change confined to `js/app.js`. Code unchanged through `.225` (`.224`/`.225` are records-only), so this review holds against current HEAD.
- **Reviewed against:** `Claude/Plans/PLAN-swipe-reveal.md` §3.2 ("one session owns every resource": `transitionListener`, `settleTimer`, `revealTimer`, `revealFrames`) and invariant I12 ("a stale callback cannot affect a newer session").
- **Date:** 2026-07-20
- **Verdict:** fix-then-ship. The ownership *model* is sound and behaviour-preserving, but stage 3 captured only the cleanup-critical resources and left the settle-scheduled ones outside the session — a reduced version of §3.2. Close findings 2 and 4 before stage 4; rule on 1a. See *Reconciliation* below — the ownership-class findings are already deferred to stage 6 by a standing decision, and this review does not reopen it.
- **Provenance:** consolidated from two independent review passes; every finding below verified against the code and the plan. Finding 2 was found by pass A; findings 1, 3, 4 by pass B.

## Findings

| # | Severity | Finding | Location | Fix |
|---|---|---|---|---|
| 1 | Significant (root) | Settle-scope resources are not session-owned. §3.2 requires `transitionListener`/`settleTimer`/`revealTimer`/`revealFrames` on the session; all three settle primitives remain in the closure, uncaptured and uncancelled. Findings 1a/1b are symptoms. | `settle()` ~680–690; finalize wiring 1285–1286 | Store `cur.settleFrame`/`cur.settleTimer`/`cur.removeTransitionListener`; retire all three at the top of `finalize`, on whichever path enters it. |
| 1a | Significant | Uncancelled settle rAF writes a stale transform onto real elements. The `requestAnimationFrame` at 687 is never cancelled. Hidden mid-settle, rAF pauses but `setTimeout(finalize,340)` still fires — finalize clears transforms and relinquishes the session, then the deferred rAF fires on foreground and writes `translateX(...)` onto `cur.movers`; for `borrowed-real` movers those are the live Home/Browse/overlay. Async-ownership class; swipe env-trap #2 (hidden rAF). | 687 | `cur.settleFrame = requestAnimationFrame(...)`; `cancelAnimationFrame(cur.settleFrame)` in finalize. |
| 1b | Significant | Leaked `transitionend` listener retains the settle closure. `{once:true}` removes the listener only on a real event; when the 340ms timer wins (transitions disabled / event never fires — a plan-supported path), the listener stays on `anchor`, retaining `finalize`→`cur`→movers. For overlay/real-view transitions `anchor` is a long-lived element, so it accumulates per gesture. | 1285 | Capture and call `cur.removeTransitionListener` in finalize. |
| 2 | Significant | `finishing` never restored on a throw → permanent swipe wedge. `runFinalize` sets `finishing = false` only at its last line (1269), after four `applyScreen` calls that are wrapped precisely because they can throw. The `finally` (1282) restores the row hold and ownership but not `finishing`; a throw leaves it stuck true, and `begin()`'s first line `if (finishing) return` then rejects every future swipe until reload. Pre-existing, but stage 3 reworked this exact `finally` and reasoned about the throw path for two of three module states. | 1269, 1282 | Add `finishing = false;` to the `finally`. |
| 3 | Minor (forward-fragility) | Cleanup helpers act on the global `session`, not the owner. `releaseGesture`/`dropRowHold` read the module `session` rather than a passed owner. Safe today under the `finishing` gate — but stage 6 retires that gate, making this a scheduled break. | 325, 337 | `releaseGesture(s)`/`dropRowHold(s)`; call with `cur` at finalize and the superseded session at hard reset. |
| 4 | Significant (test) | Held-reveal test proves the endpoint, not intermediate ownership. It asserts only `session == null` 700ms later; a mutation that clears the session at finalize (ignoring `revealPending`) reaches that same end state and survives. | `test/swipe-invariants.test.js` | Make the decode/paint gate controllably pending; assert the session is still active after finalize while the pane is held, then null after drop. Add the surviving mutation to the sweep. |
| 5 | Observation | The NP pill is tagged `own:'owned-decoration'` but is never placed in `cur.movers`, so no consumer reads the tag — dead metadata (documented; harmless until stage 6 consolidates pill teardown). | mover build ~605 | Drop the tag or note it is decorative. |

## Reconciliation with the decision log (2026-07-20)

A settled decision predates this review: *cancellation ownership of the settle and reveal timers and the transitionend listener is deferred to stage 6* (DecisionLog, 2026-07-20), on the ground that stage 6 centralizes finalization. It disposes of the ownership-class findings here, so this review does not reopen it:

- **Findings 1, 1b, 3** (settle timer / transitionend listener / global-session helpers) fall inside the deferred class — known and accepted as deferred to stage 6, not new must-fix work.
- **Finding 2** (`finishing` not restored on a throw) is a throw-safety defect, not a cancellation-ownership question — outside every deferral, and it **stands** (one-line fix; a throw permanently wedges the swipe).
- **Finding 4** (held-reveal test admits a surviving mutation) is a test-adequacy gap — outside every deferral, and it **stands**.
- **Finding 1a** (uncancelled settle *rAF* writes a stale transform onto a real element when the page was hidden during settle) is the one item the deferral may not have weighed. The deferral names the settle/reveal *timers* and the transitionend listener; its rationale (the `finishing` flag blocks a *superseding* gesture) addresses a *new* gesture, not this *same-gesture* stale write after finalize. **Open for the implementation session:** is the rAF within the stage-6-deferred "settle timers," and is its interim stale-write-when-hidden risk accepted until stage 6, or pulled forward?

**Revised gate:** close 2 and 4 before stage 4; rule on 1a; 1/1b/3 remain deferred to stage 6 per the standing decision.

## Root vs surface

One decision, not four bugs: stage 3 took the resources whose absence had already bitten (listeners, row-hold, movers) and deferred the settle-scheduled ones as "idempotent / self-clearing." That phrase is the root defect — callback idempotency is not resource cancellation. `finalize`'s `done` guard makes a second *call* a no-op, but the pending rAF, the once-listener, and (on a throw) the `finishing` flag are *resources*, not duplicate calls; they persist regardless of the guard. Findings 1a, 1b, 2, and 3 are that one root in different clothes.

## Prediction

These are not merely latent — they are armed to detonate at stage 6. Every one of 1a/1b/2/3 is currently masked by the `finishing` gate (it prevents a superseding gesture from arming while a stale rAF/listener is live), and stage 6's stated job is to remove that gate. Before stage 6: the rAF bug ships first as a no-reproducer field report ("locked the phone mid-swipe, came back to the list shoved sideways"), because it needs the hidden-path timing that testing never hits; the `finishing`-throw wedge ships as "swipe stopped working, a reload fixed it," no stack trace, because the throw is swallowed by the `finally`. After stage 6 removes the gate, the leaked-listener and global-helper faults stop being latent and begin superseding live gestures directly.

Fix order that respects this: close 1a, 1b, 2 (all in the `settle()`/`finalize()` block) and make the helpers owner-specific (3) in this stage, so stage 6 removes the gate over ground that is already sound.
