# STRIKE — Stage-6b retire-correct-loser, round 2 (pre-build, blind) — 2026-07-26

Commission: attack the ratified Stage-6b plan (`Claude/Plans/PLAN-swipe-stage6b.md` at commit
`0d27701`) against the CURRENT `js/app.js` and the real fake-scheduler harness
(`test/app-harness.js`). Fresh instance; blind — no casebook, no prior strike, no DecisionLog
rationale was read before this filing. Readable set: the plan at `0d27701`, `js/app.js`,
`test/app-harness.js`, `test/swipe-invariants.test.js` (existing suite, driving patterns only).

## 1. The promise (verbatim)

> Each phase resolver cancels EXACTLY the actually-pending loser continuation, so after a resolver
> runs no loser timer/frame for the retired session stays pending on the scheduler queue. The three
> session-owned handles: cur.settleTimer (340ms finalize fallback, cleared when transitionend wins);
> cur.revealFrames (a TWO-entry reveal double-rAF where the outer callback re-stores the inner id
> onto cur.revealFrames before scheduling it, so the field always names the currently-pending frame;
> cancelled at the winning drop); cur.revealTimer (600ms reveal safety-net, cancelled at the winning
> drop). Across ALL interleavings: dual-fire finalize (transitionend vs 340ms), and reveal drop
> (gate-driven vs timeout-driven; reveal frame outer-pending / half-fired / gate-won).

**Testable form.** After each resolver (`finalize`; the winning `drop`) runs, no loser continuation
belonging to the phase remains in the harness queues: `h.clock.pending()` (= `tq.length`) and
`h.raf.pending()` (= `rafQ.length`), and every `clearTimeout`/`cancelAnimationFrame` issued by a
resolver names the id of the continuation that was actually pending — never a wrong session's, never
a spent id while a live loser remains.

## 2. Method — the design executed before it is built

Stage 6b is unbuilt, so the ratified §2 construction was applied mechanically to an IN-MEMORY copy
of `js/app.js` (five unique string transforms, each verified to match exactly once; production
untouched) and the real harness was booted against it via an `fs.readFileSync` interception. A call
ledger wrapped `setTimeout`/`clearTimeout`/`requestAnimationFrame`/`cancelAnimationFrame` after each
boot, so every cancel is attributable to an exact id and phase. Two mutant modes validated the
instrument: `MUT_SINGLE_ID` (the previously-killed single-outer-id design) and `MUT_NO_CLEAR` (omit
`clearTimeout(cur.settleTimer)`).

The five transforms (the plan's §2, verbatim mechanism):

1. `setTimeout(finalize, 340)` → `cur.settleTimer = setTimeout(finalize, 340)` (app.js:1160)
2. after `cancelAnimationFrame(cur.settleFrame)` (app.js:1146): `clearTimeout(cur.settleTimer)`
3. the double-rAF (app.js:794) → `cur.revealFrames = requestAnimationFrame(() => { cur.revealFrames
   = requestAnimationFrame(() => { painted = true; gate('paint'); }); })`
4. `setTimeout(() => drop('timeout'), 600)` (app.js:795) → stored as `cur.revealTimer`
5. after `if (dropped) return; dropped = true;` (app.js:751): `cancelAnimationFrame(cur.revealFrames);
   clearTimeout(cur.revealTimer);`

Probes: `Claude/Loki/PROBE-stage6b-r2-main.js` (S1–S6, M1, M2) and
`Claude/Loki/PROBE-stage6b-r2-round2.js` (S7, S8). Run each with
`C:/Users/nzilb/tools/node-dist/node.exe <probe>` from the repo root. Disposable probes, not tests.

## 3. Planes struck, and what each execution observed

All fixtures: `boot({ fakeTimers: true, deferRaf: true })`, boot-time timers/frames drained first so
queue arithmetic is gesture-relative. Held reveal = the Authors→Home commit (snapshot pane) except
S8 (abort browse→browse, the clobbered ghost path).

| # | Interleaving constructed | Observed |
|---|---|---|
| S1 | DF: `transitionend` wins at t=0 | the pending 340ms id was `clearTimeout`-ed at finalize; advancing past +340 fired NOTHING (`tq` unchanged); exactly one finalize |
| S1b | RR(a) after a transitionend finalize: timeout-driven drop, outer pending | the pending outer frame id was cancelled at drop; `rafQ` = watchFrames only |
| S2 | RR(a) after a 340-driven finalize | same: pending outer cancelled; `rafQ` clean |
| S3 | RR(b) HALF-FIRED: one frame fires the outer (which schedules the inner), then the 600ms wins | drop cancelled the INNER id (the actually-pending loser); the spent outer was NOT the cancel target; `rafQ` = watchFrames only |
| S4 | RR(c) gate-won via paint (both frames fire, decode already landed) | the PENDING 600ms revealTimer was cleared at the gate-driven drop; only the two winner-scheduled timers (fadePanes removal, reportReveal window) fired afterwards; one drop |
| S5 | CROSS-SESSION: session1 aborts on Options, 340 wins, its stale `{once:true}` transitionend listener survives; session2 settles on the same element; a transitionend fires BOTH listeners | finalize1 re-entered done-guarded — no clears, no schedules; finalize2 cleared exactly session2's own 340ms; +345 no-fire window held; exactly two finalizes |
| S6 | RE-ENTRY MID-REVEAL: a new gesture arrives while the pane is held (`finishing` true) | `begin()` rejected (no start, no hard reset); the handles were undisturbed; the timeout drop then cancelled the pending outer; `rafQ` clean |
| S7 | DECODE-DRIVEN drop: a pending `img.decode()` keeps the gate open past both frames; decode lands LAST, so the resolver runs from a MICROTASK with the revealTimer pending and both frames spent; a live decoy rAF planted | one drop `via=decode`; the pending 600ms cleared from the microtask resolver; the spent-frame `cancelAnimationFrame` disturbed nothing (the decoy survived and ran); no second drop; revealTimer never fired |
| S8 | the OTHER held branch: abort browse→browse (clobbered), half-fired, timeout wins | inner cancelled, spent outer untouched, `rafQ` clean, one drop |
| M1 | `MUT_SINGLE_ID` control on S3's interleaving | drop cancelled the SPENT outer; the inner paint frame LEFT PENDING (`rafQ` = 2) — the probe detects the killed design |
| M2 | `MUT_NO_CLEAR` control on S1's interleaving | the 340ms loser stayed pending and fired after transitionend won — the probe detects the omission |

Every design-mode execution matched the promise's prediction; both mutants produced the leak the
promise forbids, so the instrument can fail.

## 4. Verdict — HELD STONE

The one construction that killed the prior draft (the half-fired double-rAF) is closed by the
re-store-inner-id field model: in S3/S8 the field named the inner id at cancel time because the
re-store executes synchronously inside the outer callback's body, and no observer can run between
`requestAnimationFrame(inner)` returning and the assignment landing — in the harness (the frame
batch runs callbacks synchronously; microtasks settle after) and in a real browser (the microtask
checkpoint follows the callback's stack, which contains the assignment). The remaining planes I
judged most likely to fracture — a resolver running from the microtask queue (S7), a resolver
re-entered by a stale prior-session listener (S5), and re-entry during the hold (S6) — all held:
each resolver closes over its own `cur` and its exactly-once guard is set before the cancel runs, so
no interleaving I could construct makes a cancel name a wrong or spent handle while a true loser
stays queued.

**Why re-entry cannot reach the handles (the structural reason, executed in S5/S6):** between
`settle()` and the terminal resolver, `finishing` is true and `begin()`'s first line rejects, so no
second session can arm while these handles are live; a superseded session is pre-`settle()` and owns
none of them — the plan's exclusion holds as stated. The one re-entry that IS reachable — a stale
`{once:true}` transitionend from a prior session on a shared element — is absorbed by the `done`
guard before any cancel runs.

## 5. Lesser planes, un-prosecuted (one line each; for the breadth seats)

- The RR/DF queue-count baselines are NOT zero after a resolver: the winner schedules `watchFrames`
  (a 12-tick rAF chain, live because the harness installs `PBDebug`), `fadePanes`' 60ms removal
  timer, and `reportReveal`'s 500ms window into the same queues. The cells must assert
  deltas/specific ids, not queue emptiness — a test author who asserts `pending() === 0` will write
  a cell that cannot pass, and one who asserts only "count decreased" may not distinguish the leak.
- The promise's first sentence ("no loser timer/frame") is scoped by its own enumeration: the decode
  `Promise.then` loser (uncancellable, microtask) and the stale transitionend listener (deferred,
  §11) survive the resolver by design. Consistent with the plan; named so nobody reads the sentence
  wider than its enumeration.
- The plan's phrase "re-stores the inner id … before scheduling it" (§2 header echo) is literally
  unsatisfiable — the id exists only after `requestAnimationFrame` returns; the plan's own code
  fragment (assignment of the return value) is the correct and executed meaning. Wording only.

## 6. Residual doubt

- The probes execute the ratified construction as transformed by this probe's five string edits; the
  built Stage 6b could place the cancels elsewhere within the guarded bodies (the plan makes the
  locus a recommendation). The invariant held at both extremes I tried (cancel immediately after the
  guard; the plan's adjacency for the finalize clear), and §7's ordering contract (guard set first,
  cancel reads the resolver's own `cur`) is what the executions actually depended on.
- Real-browser fidelity: the argument that no observer can interleave between the inner's scheduling
  and the field re-store rests on single-threaded execution and per-callback microtask checkpoints;
  the harness models this faithfully but is not a browser. With a bigger budget I would strike next
  on a real iOS WebKit device at a hidden-tab transition landing exactly between the outer frame and
  the paint frame.

```json
{"persona":"loki","stage":"6b","input_artifact":"0d27701","promise_id":"retire-correct-loser-r2","verdict":"HELD_STONE","nonblocking_ids":["rr-df-baseline-not-zero","promise-scope-microtask-and-listener","re-store-wording"],"return_to":"none"}
```
