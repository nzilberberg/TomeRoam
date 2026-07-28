# Loki Strike — Stage 6h: the commit→home scrollend cover-gate lifecycle promise (r1)

**Date:** 2026-07-28
**Target:** Stage 6h as described (async `settled` gate on the commit→home held reveal), traced against the real `js/app.js` at commit 54b853d — `holdGhostUntilPaintable`/`drop` (lines ~809-876), the two held call sites (~1171-1193), `settle`/`finalize` (~596-1256), `begin()`'s gate + recovery (~372-448), `sessionDone` (242), `paneLess` (251).
**Commission:** blind, fresh instance; plan review not read.

Verdict: **HELD_STONE**

---

## 1. The promise (verbatim)

> On the commit→home held reveal, the cover is ALWAYS eventually removed (NEVER stranded), removed EXACTLY ONCE (no double drop / double sessionDone), and all reveal handles (decode, double-rAF, scrollend listener, SETTLE_MS timer, 600ms net) are retired at the single drop; and abort→browse (and every non-scrollSettle caller) is byte-unchanged. No interleaving of {decode-resolve, double-rAF, scrollend, SETTLE_MS timeout, 600ms net, a superseding gesture} can STRAND the cover, DOUBLE-DROP it, or make the drop path diverge from today for a non-scrollSettle reveal.

Restated as testable behavior: for every reachable ordering of those six event sources, `drop()`'s body executes exactly once, the owned pane leaves the DOM, `finishing` clears, `session` clears once, and no listener or timer belonging to the reveal survives past the drop. For abort→browse, the (drop-count, via, pane, finishing) trajectory must be identical to the pre-6h machine on every ordering of its three events.

## 2. The instrument (executed)

`STRIKE-swipe-stage6h-r1.probe.js` (filed beside this record; run with node, exit 0 = all held):

- Distills today's `holdGhostUntilPaintable` drop semantics from the source (dropped guard 813-814; handle cancels 821-822; `fadePanes` 852; `finishing=false` 855; `sessionDone(cur)` 856; gate 860; 600ms net calling `drop('timeout')` DIRECTLY 875 — **verified: the net bypasses the gate**, it is `setTimeout(() => drop('timeout'), 600)`, not `gate('timeout')`).
- Layers the described 6h machine on it: `settled` starts false only under `scrollSettle`; scrollend listener and SETTLE_MS timer each set `settled` and call the gate; both retired in `drop()`; net unchanged.
- Exhaustively enumerates **every permutation** of {decode, paint, scrollend×0..2, SETTLE_MS, net}, with paint optional (hidden-tab rAF starvation) and cancellation semantics exact (a retired handle never fires; the decode promise is uncancellable and hits the dropped guard late). Orderings are unconstrained by timing — a superset of reality, so the result transfers.
- Result: **1022 interleavings, 0 failures** on all four assertions: exactly-once drop, pane removed + finishing/session released, no handle survives the drop, and non-scrollSettle trajectories identical to the pre-6h machine (with zero 6h handles ever attached).

## 3. Planes struck by source trace (the parts a state machine cannot cover)

**P1 — strand via "settled never flips AND the net is cancelled without dropping."** Requires something to clear `cur.revealTimer` outside `drop()`. Grep over `js/app.js`: `clearTimeout(cur.revealTimer)` exists exactly once — line 822, inside `drop()`. `finalize` clears only `settleTimer` (1232); `begin()`'s recovery block (398-448) touches no reveal handle. The net cannot be disarmed except by the drop it backstops. Unreachable.

**P2 — a superseding gesture stranding or double-dropping the held session.** Throughout the hold, `finishing` stays true (the held branches return before line 1215; finalize's finally restores it only on a throw, comment 1244-1247) and the session owns an `owned-pane` mover, so `begin()`'s gate — `if (finishing && !(session && paneLess(session))) return;` (383) — rejects every new gesture until `drop()` runs. `paneLess` (251) reads the **movers array**, not DOM attachment, so even an out-of-band removal of the pane element keeps the block up. No successor can exist during the hold; the I12 stale-callback window is unreachable by construction, and `drop()` removes the scrollend listener (top of drop) **before** clearing `finishing` (855), so I could not even reach the pre-declared benign two-listener overlap: at the instant a new gesture can first arm, the old listener is already gone.

**P3 — out-of-band cover removal (popstate → `applyScreen`'s `.nav-ghost` sweep; `enterApp` re-run) during the hold.** The pane leaves the DOM without `drop()` — but the net still fires at ≤600ms: `fadePanes`' `el.parentNode` guard (704, 712) no-ops, all handles retire, `finishing`/`session` release. Removed-not-stranded, exactly-once still holds, and the behavior is byte-identical to today (6h adds only handles that the same single drop retires). Not a fracture.

**P4 — scrollend never fires** (no document scroll pending; inner-scroller scroll; older iOS Safari without `scrollend` support, where `addEventListener('scrollend', …)` is a silent no-op). `settled` flips via the SETTLE_MS timer at ~250ms — cleared only in `drop()` (P1 logic applies identically). No strand; worst case the reveal waits max(paint, decode, 250ms), with the 600ms net behind it.

**P5 — double-`sessionDone`.** `sessionDone` (242) is conditional (`if (session === s)`), and the only pre-drop caller on a held path is finalize's `endOwnership` (1222), which skips when `revealPending` — set true at both held call sites (1174, 1191) before the hold is taken, in the same synchronous block, so no async can observe it unset. Single `sessionDone`, at drop.

**P6 — non-scrollSettle divergence via the new retirements.** `clearTimeout(undefined)` and `removeEventListener('scrollend', undefined)` are spec no-ops (WebIDL nullable callback); the probe's equivalence battery covers the gate side. No observable change for abort→browse.

## 4. Lesser planes, un-prosecuted (one line each, pre-existing — not 6h's)

- A throw in `applyScreen` at the commit→home branch (1172) **before** the hold is taken leaves the snapshot pane attached with no timer; it is removed only by the next gesture's hard-reset sweep (398-441). Outside the promise's event set and byte-identical today.
- Every commit→home reveal with no pending scroll now waits the full SETTLE_MS floor (~250ms vs today's measured ~40ms hold) — deliberate per the stage, but a feel change the designer/plan reviewer may want on the record.
- `fadePanes`' +60ms removal `setTimeout` (712) is untracked by the session; bounded and parentNode-guarded, pre-existing.

## 5. Residual doubt

The strike attacked the described semantics, not built code — a builder deviation (e.g. `opts.scrollSettle` read without an `opts` default, or retiring the new handles anywhere but inside `drop()`) is outside what this strike can clear. The structural reasons the stone held are three, and the built code must preserve all three: (1) every path funnels through the one `dropped`-guarded `drop()`; (2) the 600ms net calls `drop` directly and is cancellable only inside `drop`; (3) `begin()` rejects all gestures while the pane-owning session holds. Break any one and the interleavings reopen.

## 6. Reconciliation

Written blind; no rationale, plan-review casebook, or temper notes read before filing. Nothing to reconcile against a defender's argument — the promise as commissioned survived the best strike I could construct: 1022 executed interleavings plus the five environmental planes above, all held.
