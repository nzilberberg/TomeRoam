# RED suite — Swipe/reveal Stage 6b (cancel the finalize/reveal loser timer + frame handles)

Type: test-design (Curie)
Date: 2026-07-26
Input artifact: ratified plan `Claude/Plans/PLAN-swipe-stage6b.md` at target `0d27701`
Coverage Model realized: plan §8 (Mendeleev catalog) + §9 (coverage/mutation matrix)
Loki context: `Claude/Loki/STRIKE-swipe-stage6b-retire-loser.md` (HELD STONE — post-resolver
queue baselines are NOT zero; assert a per-id delta, never emptiness)
Verdict: **RED_SUITE_READY** → Brunel

## 1. What was authored

- **`test/swipe-stage6b-loser-cancel.test.js`** (new) — the Stage-6b red-first cells DF, RR(a),
  RR(b), RR(c). Plain failing tests (see §6 for why NOT `{ todo }`).
- **`test/app-harness.js`** (narrowly-necessary harness change, test surface only) — a read-only
  per-id ledger over the fake scheduler so a test can name the SPECIFIC loser handle:
  - `h.clock.pendingDump()` → `[{id, ms, delay}]` (one entry per pending fake timeout; `ms` is the
    original requested delay, `delay` is `due - now`);
  - `h.raf.pendingIds()` → the pending deferred-rAF ids in queue order;
  - the fake `setTimeout` record now also carries `ms` (purely additive; nothing else reads it).
  No behavior of any existing boot path changed (existing swipe suite 23/23 green, full suite
  reconciles — §2).

Production code was NOT touched. `Claude/Decisions/PolicyLedger.mjs` was NOT touched (§6). No git
commit/add.

## 2. Red command and captured result

```
C:/Users/nzilb/tools/node-dist/node.exe --test test/swipe-stage6b-loser-cancel.test.js
```

```
not ok 1 - DF — finalize clears the 340ms settle fallback when transitionend wins
not ok 2 - RR(a) — timeout wins, no frame fired: drop() cancels the pending reveal frame
not ok 3 - RR(b) — HALF-FIRED (outer spent, inner pending), timeout wins: drop() cancels the INNER frame
not ok 4 - RR(c) — the paint gate wins: drop() clears the pending 600ms reveal safety-net
# tests 4 | pass 0 | fail 4 | todo 0
```

Full suite (`--test "test/*.test.js"`): **tests 698 | pass 693 | fail 4 | skipped 1 | todo 0** — the
4 fails are exactly DF/RR(a)/RR(b)/RR(c); every gate (policy-ledger §4.19, descriptor-coverage,
contract-function, mutation-anchors, build-stamp, transition/model fingerprints) stayed green, and
the existing swipe-invariants guards (RGcancel/RG13/RGH/RGT/RGend + the whole file, 23/23) stayed
green. The only reds in HEAD are this slice's red-first cells.

## 3. The observable channel and the DELTA/id assertion approach

The slice's promise is a RESOURCE RELEASE: three continuations that are bare locals today become
session-owned handles, each CANCELLED at one resolver (`finalize` owns `cur.settleTimer`; the winning
`drop` owns `cur.revealFrames` and `cur.revealTimer`). A cancelled handle LEAVES the fake scheduler
queue; an omitted or misattributed cancel leaves it pending. So the queue is the channel, exactly as
plan §1/§4 grounds it.

**Why the tests assert a per-id delta and never queue emptiness (the Loki HELD STONE).** After the
resolver runs, the queues are NOT empty — the WINNER's own continuations are scheduled into the SAME
queues:
- the reveal diagnostic's 500ms window (`reportReveal`, app.js:1019) → clock queue;
- the reveal `watchFrames` rAF chain (app.js:682) → rAF queue;
- the pane-fade timer (`fadePanes`, ~60ms) → clock queue.

`h.clock.pending()===0` / `h.raf.pending()===0` would therefore be the WRONG oracle: it would pass a
build that cancels NOTHING (the winner's own timeout/paint would have swept the loser frame anyway).
Every cell instead CAPTURES the loser's id at its scheduling site (by the magic delay `ms===340` /
`ms===600`, or as the sole queued frame at that instant) and asserts THAT id is absent after the
resolver, and additionally asserts the queue is still non-empty — pinning that this is a delta, not
emptiness. Each captured RED below shows the loser id still present ALONGSIDE the winner continuations.

## 4. Cell → test → captured RED → judgment

Each red-first cell fails on its intended CLAIM assertion (`ERR_ASSERTION` / `testCodeFailure`), not
on a compile/import/harness error, and fails for the MISSING retirement (the loser stays pending) —
not a mis-stated assertion. Every fixture-sanity `assert` BEFORE the claim passed (the state was
reached), so the red is isolated to the unbuilt cancel.

### DF (red-first). Test: `DF — finalize clears the 340ms settle fallback when transitionend wins`
- **Cell (§9):** `finalize` cancels its loser — when `transitionend` wins, the 340ms `cur.settleTimer`
  is cleared and leaves the clock queue, so no leaked fallback survives the finalize phase.
- **Fixture:** `boot({ fakeTimers:true, deferRaf:true })`; drive an aborting browse→browse gesture to
  SETTLING and STOP (`abortToSettling` — end() + microtask settle, NO clock advance, so the 340ms is
  still queued). Identify the 340ms by `ms===340`, capture its id. Fire `transitionend` on the anchor
  (`movers[0].el` = the source `.nav-ghost` of a browse→browse abort) so finalize runs while the 340ms
  is still pending. Assert the 600ms reveal safety-net still shares the queue (delta guard), then assert
  the captured 340ms id is gone.
- **Captured RED:** `finalize must clear the 340ms settle fallback when transitionend wins; id 1 still
  pending in [{"id":1,"ms":340,"delay":340},{"id":2,"ms":500,"delay":500},{"id":3,"ms":600,"delay":600}]`
- **Judgment:** RED for the intended reason. The 340ms (id 1) is still pending; the winner's reveal
  continuations (500ms diagnostic, 600ms safety-net) are present, so emptiness would be wrong and the
  delta is real. The mutation §9 names (clear the wrong handle / omit the clear) is exactly today's
  state: the 340ms is a bare local (app.js:1160), never stored, never cleared.

### RR — the three-interleaving split (§9 cell RR; F6/F7 BINDING). Test file: three separate tests.

The reveal paint gate is a double-`rAF` (app.js:794) racing a 600ms safety-net (app.js:795). All three
branch from the same state via `toHeldRevealPending` (Authors→Home commit→home held reveal, mirroring
the shipped RGH fixture): the 340ms fires finalize, which cancels the settle rAF then starts the held
reveal, leaving the reveal OUTER frame queued (unfired) and the 600ms safety-net pending.

#### RR(a) (red-first). Test: `RR(a) — timeout wins, no frame fired: drop() cancels the pending reveal frame`
- **Interleaving:** no frame fired → the reveal OUTER frame is the loser; the 600ms timeout wins.
- **Fixture:** capture the sole queued frame id (the outer; sanity-asserted `length===1`, since the
  settle rAF was cancelled in finalize). `await h.clock.advance(600)` → `drop('timeout')`. Assert the
  rAF queue is non-empty (the winner's `watchFrames` frame; delta guard), then assert the outer id is
  gone.
- **Captured RED:** `drop() must cancel the pending reveal frame; outer id 2 still queued in [2,3]`
- **Judgment:** RED for the intended reason — the outer (id 2) survives a timeout-driven drop; `[2,3]`
  is the loser next to the winner's `watchFrames` frame (id 3), so the delta is real. Today `drop`
  cancels no reveal frame.

#### RR(b) (red-first, LOAD-BEARING). Test: `RR(b) — HALF-FIRED (outer spent, inner pending), timeout wins: drop() cancels the INNER frame`
- **Interleaving (the killed construction's trap):** fire EXACTLY ONE frame so the outer runs and
  schedules the inner PAINT frame, then let the 600ms timeout win while the inner is still pending. The
  loser is the INNER frame. A single-outer-id design cancels the SPENT outer here and leaves the inner
  pending — the executed leak the Loki strike found. This is precisely why the plan makes
  `cur.revealFrames` track the CURRENTLY-PENDING frame (the outer callback re-stores the inner id).
- **Exactly-one-frame handling (F7):** `await h.raf.frame()` ONCE; then `assert.equal(mid.length, 1)`
  and `assert.notEqual(innerId, outerId)` to PROVE the state is "outer spent, inner pending". Two frames
  would fire the inner too (painted→drop('paint')) and collapse this into RR(c), where the killed design
  would NOT redden — so exactly one frame is enforced structurally, not by comment. The harness's
  documented double-rAF semantics (a frame queued BY a frame waits for the next `h.raf.frame()`) make
  this state genuinely expressible.
- **Fixture:** capture outer id; fire one frame; capture inner id (sole queued frame). `advance(600)` →
  `drop('timeout')`. Assert rAF queue non-empty (delta guard), then assert the inner id is gone.
- **Captured RED:** `drop() must cancel the CURRENTLY-PENDING reveal frame (the inner), not the spent
  outer; inner id 3 still queued in [3,4]`
- **Judgment:** RED for the intended reason — the inner (id 3) survives; `[3,4]` is the loser next to
  the winner's `watchFrames` frame (id 4). This cell reddens BOTH the omit-the-cancel mutation (today)
  AND the killed single-outer-id design (which would cancel the spent outer id, leaving the inner). The
  fixture reaches the identical half-fired state under current code and under either candidate build, so
  only the cancel behavior distinguishes them.

#### RR(c) (red-first). Test: `RR(c) — the paint gate wins: drop() clears the pending 600ms reveal safety-net`
- **Interleaving:** both reveal frames fire (decode resolves on the microtask queue during the first
  frame) → `gate('paint')` → `drop('paint')` with NO clock advance → the 600ms safety-net is the loser.
- **Fixture:** identify the 600ms by `ms===600`, capture its id. Fire two frames (`await h.raf.frame()`
  twice) → `drop('paint')`. Assert the clock queue non-empty (the 500ms diagnostic window + the 60ms
  pane-fade; delta guard), then assert the 600ms id is gone.
- **Captured RED:** `drop() must clear the 600ms reveal safety-net; id 3 still pending in
  [{"id":2,"ms":500,"delay":440},{"id":3,"ms":600,"delay":540},{"id":4,"ms":60,"delay":60}]`
- **Judgment:** RED for the intended reason — the 600ms revealTimer (id 3) survives the paint-gate drop;
  the winner's diagnostic 500ms (id 2) and pane-fade 60ms (id 4) are present, so emptiness would be
  wrong and the delta is real. Today `drop` does not clear the 600ms.

## 5. New-vs-guard inventory

| id | Kind | File | Status now | Owner next |
|---|---|---|---|---|
| DF | NEW red-first | test/swipe-stage6b-loser-cancel.test.js | RED (fail) | Brunel → green |
| RR(a) | NEW red-first | test/swipe-stage6b-loser-cancel.test.js | RED (fail) | Brunel → green |
| RR(b) | NEW red-first (load-bearing) | test/swipe-stage6b-loser-cancel.test.js | RED (fail) | Brunel → green |
| RR(c) | NEW red-first | test/swipe-stage6b-loser-cancel.test.js | RED (fail) | Brunel → green |
| RGcancel | EXISTING green guard | test/swipe-invariants.test.js:598 | GREEN | pin (do not edit) |
| RG13 | EXISTING green guard | test/swipe-invariants.test.js:220 | GREEN | pin (do not edit) |
| RGH | EXISTING green guard | test/swipe-invariants.test.js:569 | GREEN | pin (do not edit) |
| RGT | EXISTING green guard | test/swipe-invariants.test.js:623 | GREEN | pin (do not edit) |
| RGend | EXISTING green guard | test/swipe-invariants.test.js:588 | GREEN | pin (do not edit) |

The RG* rows are pre-existing shipped-parity guards named in plan §9; they were NOT authored, edited, or
re-derived here. They stayed green through the harness change, which is the evidence that the additive
per-id ledger is inert.

## 6. Representation decision — plain failing tests, NOT `{ todo }` (a resolved §2/§4.19 conflict)

The Stage-6b cells are PLAIN FAILING tests. They are NOT marked `{ todo }`, and no
`Claude/Decisions/PolicyLedger.mjs` entry was added, for a mechanized reason:

- The §4.19 gate (`test/policy-ledger-gate.test.js`) statically parses test SOURCE and treats EVERY
  `test('NAME', { todo }, …)` as a KNOWN-RED that MUST be declared in the policy ledger. Marking these
  `{ todo }` produced an "untracked known-red" failure of that gate (observed and corrected this
  session).
- Plan §8 Coverage Model, row "Known-red": "This slice introduces no known-red; PolicyLedger has no
  active entries after Stage 6a and none is added." A known-red is a defect deliberately deferred across
  a stage boundary with a removal trigger; these are transient red-first cells Brunel greens THIS
  campaign, which is a different thing.
- Precedence (Engineering Contract §2): the current approved plan wins. It forbids a ledger entry and
  classifies the slice as introducing no known-red. The correct representation is therefore a plain
  failing red-first test — the same representation the Stage-6a red suite used
  (`Claude/Curie/RED-swipe-stage6.md`, "fail 3").

Consequence for the handoff: the full suite reports `fail 4` during the Curie→Brunel window. That is the
expected red-first state, not a regression; Brunel builds the three loser-cancels (finalize clears
`cur.settleTimer`; the winning `drop` cancels `cur.revealFrames` and clears `cur.revealTimer`, with
`cur.revealFrames` tracking the currently-pending frame across the outer→inner transition) and all four
turn green.

## 7. Coverage reconciliation (every applicable §9 cell accounted for)

- DF → `DF — finalize clears the 340ms settle fallback when transitionend wins` (RED).
- RR (three BINDING interleavings, F6/F7) → RR(a) timeout/no-frame, RR(b) half-fired, RR(c) gate-win
  (all RED). The half-fired RR(b) carries the exactly-one-frame fixture the F6 binary split missed and
  reddens the killed single-outer-id design.
- RGcancel/RG13/RGH/RGT/RGend → pinned as EXISTING green guards in test/swipe-invariants.test.js; not
  re-authored.

No Coverage-Model gap was found: §8/§9 stated enough to author every assertion against the real harness
queue channel. Nothing routed back to the planner.

## 8. Handoff

- **Source artifact:** `Claude/Plans/PLAN-swipe-stage6b.md` (`0d27701`), §8/§9.
- **Verdict:** RED_SUITE_READY.
- **Next owner:** Brunel — build the three loser-cancels to green DF/RR(a)/RR(b)/RR(c) without touching
  the RG* guards or the exactly-once `done`/`dropped` guards (plan §2 parity list).
- **Required evidence Brunel inherits:** the four cells go green AND the RG* guards + full suite stay
  green; `cur.revealFrames` must track the currently-pending frame (RR(b) is the proof).
- **Then:** Mendeleev (coverage audit of this suite) and Loki (strike the §3 correct-loser promise on the
  real scheduler queue).
- **Records:** this report filed at `Claude/Curie/RED-swipe-stage6b.md`. No git commit (per assignment).
