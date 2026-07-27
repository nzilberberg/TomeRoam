# LOKI STRIKE (r2) — Stage 6c, the stale-callback no-op promise on the corrected pane-less domain

Date: 2026-07-26
Commission input: the ratified plan `Claude/Plans/PLAN-swipe-stage6c.md` at commit **94f5567** (r4), attacked
against current `js/app.js` (post-6b HEAD) and the real harness `test/app-harness.js`.
Blind constraint honored: no casebook, no prior strike (including `STRIKE-swipe-stage6c-stale-callback.md`),
no DecisionLog rationale was read. Read: the r4 plan, `js/app.js`, `js/nav.js`, `js/swipe.js`,
`test/app-harness.js`, `test/dom-fixture.js`, `test/swipe-invariants.test.js` (recipes only).
Contamination note: the r4 plan's own header narrates the prior rounds' verdicts; that text is part of the
commissioned artifact and was unavoidable. No casebook file was opened.

## 1. The promise (verbatim, plan §4, restated as testable behavior)

> **Invariant (the load-bearing promise).** When a gesture supersedes a PANE-LESS session that is still
> settling or finalizing (`begin()`'s narrowed supersession branch), the old session's settle-phase
> continuations cannot mutate the successor. [...] Each settle-phase continuation verifies `cur === session`
> [...] before performing its effect. [...] A frame that fires after the successor armed no-ops, so the
> successor's movers keep their own transforms [...] A 340ms `settleTimer` or a late `transitionend` that
> fires after supersession [...] no-ops, so it does NOT applyScreen or mutate the nav stack over the
> successor [...] The recovery sets `finishing = false` so a superseding gesture that never arms cannot wedge
> future swipes.

With the gate `if (finishing && !(session && paneLess(session))) return;` and the pane-less domain =
{home→overlay, browse→overlay, overlay→overlay, overlay→browse} (frozen-spec `paneOf`, plan §2.1).

Testable form used: after successor B takes ownership, deliver every continuation A left pending — the
settle rAF, the 340ms `settleTimer`, a late `transitionend` on A's anchor — and require: (a) zero transform
writes on B's borrowed-real movers; (b) zero `runFinalize` effects over B (no commit/abort log line, no
screen/nav mutation, no row-hold drop from A's `finally`); (c) after a superseding touch that never arms,
the next full swipe engages (no wedge).

## 2. Instrument

The plan is unbuilt, so §3 was scratch-built mechanically onto current `js/app.js` (five exact-anchor
string edits: the negative gate; the recovery-entry predicate `|| (finishing && session)`; the recovery
body reading the session's `clobbered`/`scroll0` with `finishing = false` before identity-null-last; the
settle-rAF `if (cur !== session) return;`; the finalize `if (cur !== session) return;` after the `done` set
+ the two shipped cancels and BEFORE the `try/finally`). The patch is injected through an
`fs.readFileSync` interceptor at harness boot — **zero production files modified**. Probes filed beside
this record and runnable as-is:

- `Claude/Loki/probe-stage6c-r2-stale-battery.js` — probes 1–7 (68 checks)
- `Claude/Loki/probe-stage6c-r2-abort-chain.js` — probes 8–9 (22 checks)
- Run: `C:/Users/nzilb/tools/node-dist/node.exe <probe-file>` (each patches, boots the real harness with
  `{fakeTimers, deferRaf}`, drives real touch events, and prints PASS/FAIL per assertion).

Instrument validity was checked before trusting its silence: the harness's `cancelAnimationFrame`/
`clearTimeout` really splice (a cancelled callback cannot fire), rAF ids (`++rafSeq`) and fake-timer ids
(`nextTid++`) are monotonic and never recycled (matching real browsers — this kills the candidate plane
"stale `finalize_A`'s pre-guard cancels hit B's handles via a recycled id"), and two mutation runs (probe
6 NOGUARD, probe 7 NOCLEAR) prove every oracle can go red.

## 3. Planes struck (all executed; 90 checks, 0 failures)

1. **G1/G2/G3 on overlay→browse (options→books), commit-settle** (probe 1). A superseded mid-settle by an
   arming pane-less B; A's stale rAF, stale 340ms timer, and a late transitionend delivered while B drags.
   B's mover transforms byte-identical before/after each stale fire; zero commit lines; A's `finally`
   never entered (endHold count unchanged); B finalized once (`sid=2`); endpoint `session === null`; next
   swipe engaged.
2. **B PANE-OWNING** (probe 2). A = fwd books→options (pane-less) superseded by B = back books→home
   (home-snapshot owned pane). The gate correctly admitted (it reads A, not B); B's `.nav-ghost` pane
   survived all three stale fires by node identity; B's held reveal ran to its 600ms timeout, dropped the
   pane, ended the session; no wedge.
3. **Shared-anchor double listener** (probe 3). A superseded with `done_A` still false; B settled on the
   SAME anchor (#options). ONE dispatched `transitionend` fired A's stale `{once}` listener first
   (guarded no-op; its pre-guard cancels touch only A's own spent ids) then B's live listener (normal
   finalize). Exactly one commit, one hold release, no duplicate on a later timer.
4. **W, both shapes** (probe 4). (a) Superseding edge-tap that arms then ends before the direction lock;
   (b) superseding mid-screen tap that returns before arming (recovery still runs — the block precedes the
   target/edge checks). Both: A's stale timer no-oped against the null owner, and the next full swipe
   ENGAGED.
5. **The other two admitted transitions** (probe 5). home→overlay (after a normal pane-owning
   options→home commit populated fwdStack) and overlay→overlay (NP→options, carrying the
   `np-pill-float` owned-decoration — `paneLess` correctly true, the recovery's `resetSwipeStyles`
   removed the stale pill clone). All three stale continuations no-oped on both; B committed once.
6. **Abort-settle supersession** (probe 8). A released into an ABORT settle, superseded; all three stale
   continuations no-oped; B committed once; no wedge.
7. **Double supersession A→B→C** (probe 9). Two superseded generations' pending continuations (2 stale
   rAFs, 2 stale timers, 2 stale `{once}` listeners fired by one transitionend) all delivered while C was
   live and dragging. C unstained, exactly one commit (`sid=3`), no wedge.
8. **Falsifiability** (probes 6–7). NOGUARD: the stale rAF stained B (`translateX(1024px)` over B's drag),
   the stale finalize committed over B AND dropped B's row hold through the `finally` — confirming both
   that the identity guard is the entire mechanism (plan F1) and that the guard-before-`try` placement is
   load-bearing (plan §7). NOCLEAR: the never-arming superseding tap wedged the next swipe under the
   negative gate — confirming W reddens exactly as the plan claims (F5).

Candidate planes examined and closed without a body needed: handle-id recycling (impossible — monotonic
ids in harness and browsers); `session` re-pointing at A (impossible — sessions are fresh objects, ids
monotonic, no reinstall path); a fourth stale continuation beyond the three (none exists pre-finalize on
the pane-less path — listeners are released by the recovery, the row hold is dropped by it, reveal-phase
handles are created only inside the pane-owning held reveal); a mid-`runFinalize` supersession
(unreachable — synchronous, no event dispatch reaches `begin`).

## 4. Verdict — **HELD STONE**

The promise survived every constructed interleaving on its corrected domain. The `cur === session`
identity guard neutralized all delivered stale continuations across all four admitted pane-less
transitions, commit and abort settles, single and chained supersession, pane-less and pane-owning
successors; the `finishing` clear kept the negative gate live under both never-arming tap shapes.

Residual doubt, named:
- This strikes the **design via a scratch build** of §3. Brunel's real implementation can diverge (guard
  placement inside the `try` is the known fatal divergence — probe 6 shows exactly what that costs; the
  §7 watch-point and G-cells must hold the line at build time).
- jsdom limits: no layout/CSS engine — `transitionend` is hand-dispatched (real-browser
  `transitioncancel` on the recovery's style reset is unmodeled), `scrollY` is pinned 0 (the recovery's
  scroll restore is pinned as issued, not coordinate-correct).
- Listener order on the shared anchor (stale-A before live-B) is registration order per spec and holds in
  jsdom; a browser regression there would change nothing (both orders no-op A), but it was only executed
  in one order.

Where I would strike next with a bigger budget: the RECOVERY's visual fidelity (not this promise) — a
superseded fwd →overlay leaves the un-hidden incoming overlay to `applyScreen`'s `setView` reconciliation,
which held in every probe but is one `keepGhosts`-style flag away from a leak; and the pane-owning 6d/7
window, where the retired-while-owner state finally exists.

## 5. Lesser planes (one line each, un-prosecuted — for the breadth seats)

- ANY touchstart during a pane-less settle — including one on excluded controls or mid-screen that can
  never become a gesture — now destroys a COMMITTED settle and rolls the user back to the source (the
  recovery precedes `begin()`'s target/edge early-returns): designed (cell W depends on it), but it is a
  user-visible navigation loss the plan's "correctness gain" framing does not foreground — UX/design seat.
- The recovery's `applyScreen(currentDesc(), …)` reconciles the superseded incoming overlay's visibility
  only via `setView`'s side effects; nothing pins that reconciliation per-transition — coverage seat.
- `paneLess(s)` on a never-started session reads `movers === []` as pane-less-true; unreachable while
  `finishing` implies `settle()` ran, but the predicate and the phase are coupled only by argument —
  a one-line assert in the build would make it structural.

## 6. Reconciliation

Limited by commission: the prior strike and casebooks remain unread (the blind constraint on this r2
extends through filing). What the artifact itself shows: the r4 plan already encodes the prior KILL as a
domain correction (§2.1) and the prior HELD mechanism result (Probe B/C skeletons in §9); this r2 confirms
the mechanism on the corrected domain with independent fixtures and two planes the plan's cells do not
enumerate (pane-owning successor mid-held-reveal; the A→B→C chain). Both are candidates for Curie beyond
the ratified G1/G2/G3/W/PG set.

Probes filed beside this record; scratchpad copies are disposable. Left uncommitted per commission
(no git add/commit authorized for this seat's run).

```json
{"persona":"loki","stage":"6c","input_artifact":"94f5567","promise_id":"stale-callback-no-op-r2","verdict":"HELD_STONE","nonblocking_ids":["any-touch-cancels-committed-settle-ux","recovery-overlay-visibility-unpinned","paneless-predicate-phase-coupling"],"return_to":"none"}
```
