# LOKI STRIKE — Stage 6a, promise `recover-before-arm`

Date: 2026-07-26. Commission: pre-build strike on the ratified Stage-6a plan
(`Claude/Plans/PLAN-swipe-stage6.md` at commit 66f1d30) against the CURRENT code
(HEAD = 66f1d30). Blind: no review casebook, no rationale, no prior Loki record was
read before this filing. The stage is unbuilt; the strike is a constructed trace of
the design-as-ratified through the real Stage-5 machinery it reuses, executed at the
Browse/VirtualList layer.

## 1. The promise

Verbatim (plan §3 invariant + §6 correctness requirement, cell OR):

> When a new gesture begins while a session is ARMED or DRAGGING (`begin()`'s
> supersession branch), and the superseded session went LIVE, the old session is
> recovered **pre-stack** before the successor arms: [source restored / re-rendered
> into `#browse` iff `d.clobbered`; scroll restored to `d.scroll0`; stack unmutated]

> **Correctness requirement (cell OR):** step 3 MUST precede step 4. The successor's
> `start()` ... snapshots `#browse` for its own ghost ... If the source re-render ran
> AFTER the successor armed, the successor would snapshot the stale DESTINATION
> content, reintroducing the wrong-page/wrong-tap class .178 fixed.

As testable behavior: after a second touch supersedes a live browse→browse drag, the
`#browse` content that the successor's `start()` clones (`ghostApp`, swipe.js:218)
is the source page as the user last saw it — its realized rows and their loaded
covers — at the session-start scroll. The promise is broken if the snapshot instead
captures clobbered, mis-scrolled, or recovery-manufactured intermediate content.

## 2. The plane chosen, and why

The plan orders the recovery (§6, restated in §2 as "unchanged order ... do NOT
re-touch"):

- step 2: `releaseGesture()`, **`dropRowHold()`**, `session = null`
- step 3: `applyScreen(currentDesc(), { render: d.clobbered, resetScroll: false })`
  + `window.scrollTo(0, d.scroll0)`
- step 4: arm the successor

The plan's basis (§1 last row, §2, §3) is that step 3 "mirrors the exact restore
pair" of the normal abort (app.js:1090-1093 / 1116-1117). But the abort's restore
pair is only the middle of a three-part choreography that the Browse hold defines:

1. re-render the source **while the hold is still held** (`runFinalize` runs before
   `finalize`'s `finally`), so `showPage` defers activation of the returning
   suspended page (browse.js:300-310: "Activating here would realize rows against
   the scroll the browser CLAMPED ... endHold() activates then");
2. restore the scroll;
3. **only then** `dropRowHold()` → `Browse.endHold()`, whose own contract is "the
   ONE realization the gesture gets, against the settled scroll"
   (browse.js:156-161), reusing the rows the suspend kept.

The recovery as ratified runs `dropRowHold()` FIRST. `endHold` at that moment
executes with the destination still the shown page and the scroll still the clamped
mid-drag value: it hides the parked source page and calls `deactivate()` on its
suspended controller — which **dematerializes every kept row**
(virtuallist.js:245-257). The step-3 render then rebuilds the page from nothing.
The restore pair was transplanted without the envelope that makes it a restore.

This plane was chosen because it sits exactly where the promise's strongest phrase
("the successor's `start()` snapshots the RESTORED source") crosses the artifact's
weakest seam: an ordering the plan pins twice as parity-correct ("unchanged order",
"already correct, do NOT re-touch") whose harmlessness holds only while the recovery
renders nothing — which is precisely what this stage changes.

## 3. The instrument

`Claude/Loki/STRIKE-swipe-stage6-recover-before-arm.probe.js` (disposable; filed
beside this record; never enters the suite). It boots the REAL `js/browse.js` +
`js/virtuallist.js` under jsdom using the same fixture recipe as
`test/browse-virtual.test.js` (injected metrics, forced virtual — the >600-item
shape of the real library, whose Books listing returns 20,000 rows), builds a live
browse→browse drag at scroll 8000 with the source's realized rows identity-stamped,
renders the destination mid-drag (host clobbered, browser clamp simulated), then
executes:

- **Run A** — the ratified §6 order: `endHold` (step 2) → `Browse.render(source)` +
  `scrollTo(0, 8000)` (step 3) → measure at the successor's `start()` snapshot point.
- **Run B** — control, the abort order the plan claims to mirror: render under hold
  → `scrollTo` → `endHold` last.

Run: `C:/Users/nzilb/tools/node-dist/node.exe Claude/Loki/STRIKE-swipe-stage6-recover-before-arm.probe.js`

## 4. Predicted vs observed

Promise predicts (both runs): the snapshot holds the user's own rows — kept
elements, loaded covers — at scroll 8000. Fracture predicts (run A only): zero kept
rows; a page rebuilt from nothing.

Observed (2026-07-26, node v22 local run):

```
A  prelude: liveRows=13 at scroll0=8000
A  after step 2 (dropRowHold): realized=0 keptOriginalRows=0 ... state=inactive scrollY=40 hidden=true
A  after step 3 render:        realized=13 keptOriginalRows=0 freshRebuiltRows=13 scrollY=8000
A  AT SUCCESSOR start() SNAPSHOT: realized=13 keptOriginalRows=0 freshRebuiltRows=13
A  coversReleasedDuringRecovery=48
B  AT EQUIVALENT SNAPSHOT POINT:  realized=13 keptOriginalRows=13 freshRebuiltRows=0
B  coversReleasedDuringRecovery=13   (destination page teardown only — normal)
```

Run A: at step 2 every row the user was looking at is destroyed; step 3 rebuilds 13
fresh nodes and churns 48 cover releases through the art pipeline. The successor's
`start()` clones a page of skeleton rows — and `ghostApp`'s `freezeArt` strips
`data-art` from the clone, so those skeletons can never fill in for the life of the
successor's ghost. The user superseded a drag over a fully painted page; the ghost
that slides is an empty grid. Run B, same fixture: every original row survives.

The scroll NUMBER is restored in both runs (SC holds; the probe even shows the
anchor machinery independently restoring 8000 before the app-side write). The
fracture is entirely in WHAT is at that scroll: not the restored source, but a
recovery-manufactured third state — the exact measured defect class the hold was
built to prevent ("the abort rebuilds the page after all ... withSrc=0 ... the user
watched an empty grid fill in", browse.js:118-138, 258-268; the .202 device log).
The kill does not depend on the simulated clamp: `deactivate()` of a suspended
controller dematerializes regardless of scroll, so step 2 demolishes the rows even
when the destination never shortened the document.

## 5. Verdict — KILL

The design as ratified does not deliver the promise on any virtualized
browse→browse supersession. The suite specified in §9 cannot see it: every fixture
is a small-list classic render (no controller, no suspend/endHold path — a cache
hit reuses the page node with rows intact, so cells SR/SC/OR all pass), and no cell
in the coverage matrix, and no dimension in §8, reaches the hold-release-vs-recovery
ordering. §8 in fact asserts the opposite of the defect as the requirement
("Resources ... the old session's listeners/hold/pane are released ... before the
new arms") — release-before-ARM is satisfied; release-before-RECOVER is the
fracture.

**Blast radius:**

- The flagship SR case itself. On the real library (Books >600 rows, virtualized),
  the slice that closes `KR-swipe-source-rerender` ships a supersession that
  demolishes and refetches the entire visible page and hands the successor a
  cover-less ghost — the wrong-content class .178/.202 fought, reintroduced by the
  recovery step, invisible to the new green tests.
- §6's claimed basis ("the ordering holds by construction ... mirrors the normal
  abort") is false, so any Stage-6b work that generalizes `recoverSession` from this
  slice inherits the inverted choreography as precedent.
- The two PolicyLedger known-reds would be removed (§10) on the strength of tests
  that go green over the fracture, deleting the only enforced record that this area
  is unfinished.

**The fracture routes to the planner:** the recovery must sit inside the hold
envelope the abort uses — source re-render + scroll restore BEFORE the hold
returns (or an endHold-aware recovery step) — i.e., §6 step 2's "unchanged order"
is itself the defect to re-plan, not an invariant to preserve.

## 6. Lesser planes, un-prosecuted (one line each)

- NB1 — §8 marks Async N/A, but step 2's `endHold` un-suspends the VirtualList
  scroll dispatcher (`setScrollSuspended(false)`), so recovery-window scroll writes
  schedule rAF'd realizes that land after the successor arms.
- NB2 — `endHold` at step 2 replays `heldRepaints`: a mid-drag SWR revalidate
  rebuilds the source page before the recovery renders — a second door to a
  rebuilt snapshot, on any list size including classic.
- NB3 — classic path: step 2 flips the parked source to `display:none` before step
  3 re-shows it; on iOS the round-trip drops decoded covers (the .194 mechanism) —
  flash-class, parity arguable.
- NB4 — a cache-miss source (e.g. `clearCache` landed mid-drag) makes the step-3
  render async: the successor would snapshot the placeholder/spinner page; the
  promise's synchronous "restored source" is unreachable on that path.

## 7. Reconciliation

*(Read only after §1-§6 were filed.)* The plan-review casebooks
(`Claude/Charpy/PLAN-swipe-stage6-2026-07-26-r1.md`, r2) did not know. r1 accepted
the plan's frame at its load-bearing point — "the recovery is the abort's proven
restore pair, the ordering is recover-before-arm which the current code already
satisfies ... hold position by construction" — and treated `dropRowHold` only as
the already-existing lease return, verified present, never as a step whose POSITION
the added render makes load-bearing. r2 re-gated §10 only. Notably, the parent
plan-of-record rule the slice implements (`PLAN-swipe-reveal.md` §3.7, quoted in
r1) lists the sequence as "restore the source, return its Browse lease, ..." —
restore before lease return; the 6a plan's §6 froze the current code's inverse
order and labeled it "unchanged order ... do NOT re-touch" (§2). So the failure
entered in the plan's parity classification, not in the review's reasoning about
what it examined, and was inherited from there. The durable lesson belongs with the
planner's checklist: when a slice adds an effect to an existing teardown path,
every step already on that path stops being parity and re-enters the ordering
contract.

```json
{"persona":"loki","stage":6,"input_artifact":"66f1d30","promise_id":"recover-before-arm","verdict":"KILL","nonblocking_ids":["NB1","NB2","NB3","NB4"],"return_to":"vitruvius"}
```
