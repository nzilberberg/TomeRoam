# PLAN — Swipe/reveal Stage 6a (supersession pre-stack recovery)

Type: plan

<!-- vitruvius-gate {"plan_type":"feature","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:361-375"],"callee_ranges":[],"affected_contracts":["test/swipe-invariants.test.js:339","test/swipe-invariants.test.js:391","Claude/Decisions/PolicyLedger.mjs:15"],"staged_records":["Claude/Plans/PLAN-swipe-reveal.md","Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Decisions/PolicyLedger.mjs"],"blocking_questions":["SR","SC","PS","OB","OR","VR"]} -->

Status: **DRAFT — for Charpy** (2026-07-26, Loki-corrected + Charpy-F3-corrected r3). First Stage-6 slice
("Stage 6a").
Behavior-CHANGING: it closes the two standing known-red supersession policies (`KR-swipe-source-rerender`,
`KR-swipe-scroll-restore`). Grounded against HEAD: `js/app.js` `begin()`/`start()`/`settle()`/
`runFinalize()`/`finalize()`; `js/browse.js` `beginHold()`/`endHold()`/`showPage()`; `js/virtuallist.js`
`deactivate()`; the two `{ todo }` tests in `test/swipe-invariants.test.js`; `Claude/Decisions/
PolicyLedger.mjs`; the parent plan-of-record `Claude/Plans/PLAN-swipe-reveal.md` §3.7/§7 step 6 and the
subsystem addendum `Claude/Subsystems/swipe-reveal.md`. Passes the wired Vitruvius authoring gate
(machine `vitruvius-ledger`/`vitruvius-coverage` blocks present; single-owner rows). Sub-slice of
`PLAN-swipe-reveal.md` §7 step 6; the rest of step 6 (finalization/reveal centralization) is deferred to
Stage 6b/7 (§11), with reasons.

> **Correction (2026-07-26, Loki KILL on the `recover-before-arm` promise,
> `Claude/Loki/STRIKE-swipe-stage6-recover-before-arm.md`, input `66f1d30`).** A prior draft ordered the
> recovery as release-hold-THEN-render, frozen from the current code and mislabeled parity. On a
> VIRTUALIZED browse->browse source that inverts the promise: `dropRowHold()` -> `Browse.endHold()`
> deactivates the suspended source controller and dematerializes its kept rows (`virtuallist.js`
> `deactivate()`), so the recovery re-renders the page from nothing and the successor's `start()` snapshots
> a rebuilt, cover-less grid — the .178/.202 wrong-content class the hold exists to prevent. The abort the
> draft claimed to "mirror" releases the hold LAST (in `finalize()`'s `finally`, after `runFinalize()`
> renders+scrolls); the draft transplanted the middle restore pair without that envelope. This revision
> moves the hold release to LAST (§6), reclassifies `dropRowHold`'s position as CHANGED not parity (§2),
> corrects §8's requirement to release-after-RECOVER, and adds a virtualized-source coverage cell VR (§9)
> the small-list classic fixtures could not reach.
>
> **Coupled correction (2026-07-26, Charpy r3 F3, `Claude/Charpy/PLAN-swipe-stage6-2026-07-26-r3.md`).**
> Moving `dropRowHold` after the recovery render is correct, but a prior draft still nulled `session` in the
> release step BEFORE it — and `dropRowHold`/`releaseGesture` READ `session` (app.js:324, :339-342;
> `dropRowHold` no-ops on a null `session`), so `endHold` never fired and the hold LEAKED, defeating the
> fix's own goal. Corrected: `session = null`/`d = null` move to the LAST teardown step, after the hold
> release, preserving the app.js:1132 invariant ("dropRowHold reads session.hold, so it must run BEFORE
> endOwnership clears the session"). §2/§5/§6 reconciled; cell VR's mutation extended to catch the
> null-before-release ordering (mutation (b)).

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: false** — no code moves across a module boundary. The behavior is added in
  place in `js/app.js` `begin()`; `js/swipe.js` is not touched.
- **callee_replacement: false** — no indirection layer (callback/interface/adapter) replaces a direct
  call. The change adds two synchronous restore operations to the existing supersession teardown.
- **contract_shape: false** — no exact-key contract changes. The recovery reads fields that already
  exist on the gesture session (`d.clobbered`, `d.scroll0`, `d.live`); no field is added to
  `classifyTransition` and `sameBrowseHost`/`finalizationPlanFor` are deferred (§11), so no schema moves.
- **state_transfer: false** — no ownership boundary relocates; the session already owns the superseded
  resources. This slice only adds two restore effects to the existing endpoint.
- **async_change: false** — the recovery is synchronous inside `begin()`. A superseded gesture is ARMED
  or DRAGGING, which is before `settle()`, so the old session has scheduled no `requestAnimationFrame`,
  timer, or `transitionend` continuation at supersession time.
- **persistence_migration: false** — the gesture is entirely in-memory and per-process (subsystem §15).
- **lifecycle_ownership: true** — the stage's whole subject is the ownership ENDPOINT of a superseded
  session: what the old owner must restore (source content, document scroll) as it is retired, and the
  ordering of that retirement against the successor's arming (§5, §6).

## Index
1. Defining records and authority
2. Exact scope boundary
3. The recovery contract (invariant, not prescription)
4. Value-crossing ledger
5. Lifecycle ownership — the superseded-session endpoint
6. Ordering contract
7. Runtime dependency policy
8. Coverage Model (Mendeleev catalog)
9. Coverage and mutation matrix
10. Records reconciliation (apply on approval)
11. What this does NOT do (deferred to Stage 6b/7, with reasons)
12. Sequencing

## 1. Defining records and authority

Every record that materially defines this slice, its authority, and what this plan changes. Verdict
across the records: **AGREE that the two supersession policies are Stage-6 work; the records describe a
BROAD Stage 6 and none of them fixes its internal ordering, so bounding this first slice is a planning
decision, not a conflict resolution.**

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `PolicyLedger.mjs` `KR-swipe-scroll-restore` | "Superseding a live drag must restore the starting document scroll." removalTrigger: "Stage 6 finalization implements the scroll restore; the test then goes green and this entry is removed." | Enforced known-red policy (§4.19 gate) | Implements it (§3, cell SC) | Remove the entry; drop the `{ todo }` marker (§10) |
| `PolicyLedger.mjs` `KR-swipe-source-rerender` | "Superseding a live browse->browse drag must re-render the SOURCE into #browse." removalTrigger: "Stage 6 (or the swipe rewrite) implements the source re-render; the test then goes green and this entry is removed." | Enforced known-red policy (§4.19 gate) | Implements it (§3, cell SR) | Remove the entry; drop the `{ todo }` marker (§10) |
| `PLAN-swipe-reveal.md` §3.7 (SUPERSESSION) | "a new gesture beginning while a session is ARMED or DRAGGING synchronously recovers the old session as superseded / pre-stack — **restore the source, return its Browse lease**, tear down its movers BY OWNERSHIP, release its listeners — and only then arms the new session." Plus the flagged deliberate difference: restore the starting scroll (today's hard reset does not). | Plan-of-record (strategic) | Implements the two MISSING deltas (source re-render + scroll restore) IN §3.7's own order — **restore the source BEFORE returning the Browse lease** (endHold inside the restore envelope, §6). The listener release / mover teardown / pane disposal already exist; the lease-return CALL exists but its POSITION moves (§2). | Annotate §7 step 6 as slice 6a done, 6b deferred (§10) |
| `PLAN-swipe-reveal.md` I11 / I20 / I18 | I20: a superseding gesture recovers the old session pre-stack and fully releases it before the new arms, and only the new session may thereafter mutate transforms/stacks/scroll/panes. I11: after every exit the stack top, visible screen and authoritative settled descriptor AGREE; for supersession the authoritative descriptor is the SOURCE (pre-stack). I18: recovery is keyed on PHASE; supersession is pre-stack. | Invariants (strategic) | Honors: recovery restores the source screen+content and leaves the stack on the source (pre-stack); §3, cells PS/OR | — |
| `PLAN-swipe-reveal.md` §7 step 6 | "Centralize finalization and reveal ordering (I10, I17)." | Plan-of-record (staging) | Delivers the supersession half; the finalization/reveal-centralization half is Stage 6b/7 (§11) | Annotate as sliced (§10) |
| `Subsystems/swipe-reveal.md` §20 | "Two stage-2 NEW-POLICY todos remain red by design: I20 superseding a live drag restores starting scroll; I11/I20 superseding a live browse->browse drag re-renders the SOURCE into #browse." | Subsystem addendum | Both close | Remove both from §20 (§10) |
| `Subsystems/swipe-reveal.md` §13 | "Recovery authority boundary. The nav-stack mutation. PRE-stack failure -> restore source + starting scroll." | Subsystem addendum | This slice IS the pre-stack recovery for the `superseded` reason | Confirm; no edit needed |
| `Subsystems/swipe-reveal.md` §23 | Revision conditions name "stage 6 (finalization half ...)". | Subsystem addendum | This slice is the supersession sub-part | Annotate §23 (§10) |
| `test/swipe-invariants.test.js:339,:391` | The two `{ todo }` known-red tests, each stating the current defect and the required behavior. | Compatibility (the tests that redden) | Made active + green (Curie authors the red suite from §9) | Drop `{ todo }` in the same commit (§10) |
| `js/app.js` `begin()` (361-375) | Hard reset: `releaseGesture(); dropRowHold(); session = null; d = null; resetSwipeStyles(); applyScreen(currentDesc(), { render: false });` — no source re-render, no scroll restore. | Code under change | Adds the pre-stack recovery for a superseded LIVE session (§2, §3) | — |
| `js/app.js` `runFinalize()` abort (1090-1118) | The normal abort already re-renders the clobbered source (`applyScreen(dest, { render: cur.clobbered, resetScroll: false })`) and restores scroll (`window.scrollTo(0, cur.scroll0)`). | Verified production behavior | Read-only reference: the supersession recovery mirrors this exact pair | — |

Authority precedence: the two PolicyLedger entries and the plan-of-record §3.7 GOVERN what must ship; the
subsystem §20/§23 are subordinate records scrubbed to match on approval (D1 materiality). No two records
disagree on the required behavior; they disagree only on Stage 6's TOTAL size, which this plan bounds.

## 2. Exact scope boundary

Behavioral ownership, not function names.

**Changes in `js/app.js` `begin()` (the superseded-session recovery, "the recovery step"):**
- When a new gesture arrives while a LIVE session is in progress (`d` non-null and `d.live`), the old
  session is recovered **pre-stack** before the new one arms: the source screen is re-rendered into
  `#browse` **iff** the old session clobbered it (`d.clobbered`, the Stage-5 `sourceWasClobbered` carrier,
  app.js:470), and the document scroll is restored to the old session's start (`d.scroll0`, app.js:393).
- The recovery reuses the abort's `applyScreen(currentDesc(), { render, resetScroll: false })` +
  `window.scrollTo(0, scroll0)` pair — but that pair is only the MIDDLE of the abort's three-part
  choreography, which the Browse hold defines. It must run **inside the hold envelope**: render + scroll
  **while the hold is still held**, then release the hold (`dropRowHold()` -> `Browse.endHold()`) LAST, so
  `endHold` performs its single realization against the settled scroll reusing the SUSPENDED source rows —
  exactly as `finalize()`'s `finally` releases the hold after `runFinalize()` (app.js:1138-1139). This is
  the fracture the Loki strike found: the middle pair without the envelope rebuilds a virtualized source.
- **`dropRowHold()`'s POSITION changes** (it is NOT parity): it moves from before the recovery render
  (today's `render:false` hard reset, app.js:365) to AFTER the recovery render+scroll. The CALL is
  unchanged; only its ordering is (§6). This is the one existing teardown step this slice's added render
  makes load-bearing.
- **`session = null` / `d = null` POSITION also changes** (coupled to the above; NOT parity): both
  `releaseGesture()` and `dropRowHold()` READ `session` (app.js:324, :339-342 — `dropRowHold` no-ops when
  `session` is null), so the identity drop MUST run AFTER the hold release, not before it. It moves to the
  LAST teardown step, after `dropRowHold`. This preserves the existing invariant the current `begin()` and
  `finalize()` both obey (app.js:1132: "dropRowHold reads session.hold, so it must run BEFORE endOwnership
  clears the session"; current `begin()` nulls `session` at :373, after `dropRowHold` at :365). The
  recovery also reads the old `d` (`d.clobbered`/`d.scroll0`/`d.live`), so `d = null` is likewise deferred
  to the last step, after the recovery render+scroll.

**Stays exactly as today (parity — already correct, do NOT re-touch):**
- Listener release (`releaseGesture()`), inline-style reset (`resetSwipeStyles()`), and superseded-pane
  disposal — the existing hard reset already tears the old session down by ownership. The `I2/I20 —
  superseding a LIVE drag disposes its pane` test is GREEN and must stay green (cell PD). (Two existing
  calls have their POSITION changed, not their behavior: the Browse hold RETURN — released last, after the
  recovery — and the `session = null`/`d = null` identity drop — deferred to after the hold release; see
  above and §6.)
- Stale move/end/cancel from the superseded gesture stay harmless (the `I20 — stale ... cannot touch the
  new session` test is GREEN and must stay green, cell ST).
- The ORPHAN-pane branch (`d === null` but a leftover `.nav-ghost` exists): disposed as `hard-reset`, with
  **no** session-scroll restore and `render: false` — there is no session-start scroll to restore and
  `currentDesc()` is authoritative (I17(b); cell OB pins this boundary).
- An ARMED-but-not-live supersession (`d` non-null, `d.live` false): `start()` never ran, so there was no
  mid-drag render and no scroll change (`d.clobbered` is still its `begin()` initial `false`, `d.scroll0`
  equals the current scroll); the recovery makes no source re-render and the scroll restore is a no-op.
- The normal `settle()`/`runFinalize()` commit/abort/reveal path — untouched. This slice does not enter
  the finalize or reveal code.

**Split across the seam:** none — no code relocates; this is an in-place behavior addition.

**Deferred to Stage 6b/7 (not needed to close the two known-reds, with reason — §11 expands):**
`finalizationPlanFor()`/rich `planFor()`; normalized `sameBrowseHost`; pane `release()`/`dispose(reason)`/
`equivalence`/`source`/`pin` (§3.6, I8); the `finishing`-gate retirement and the `cur === session`
stale-callback enforcement (I12); session-owning + nulling the settle/reveal timers and the
`transitionend` listener; the I10 paint-gated reveal centralization; and the full `recoverSession`
reason/phase matrix (lease-invalid / destination-gone / finalize-threw; post-stack).

## 3. The recovery contract (invariant, not prescription)

**Invariant (the load-bearing promise).** When a new gesture begins while a session is ARMED or DRAGGING
(`begin()`'s supersession branch), and the superseded session went LIVE, the old session is recovered
**pre-stack** before the successor arms:

1. **Source restored.** The visible screen returns to the source descriptor (`currentDesc()`, which for a
   pre-stack supersession IS the source because the stack was never mutated), and when the old session had
   clobbered `#browse` (`d.clobbered === true`, i.e. a browse->browse mid-drag render overwrote the shared
   host) the source is **re-rendered into `#browse`** so the host content matches the screen the stack and
   navbar return to (closes `KR-swipe-source-rerender`; I11).
2. **Scroll restored.** The document scroll is set back to the session-start scroll `d.scroll0` (closes
   `KR-swipe-scroll-restore`; I7 for the superseded path).
3. **Pre-stack authority.** The recovery does **not** mutate `navStack`/`fwdStack`; the authoritative
   settled descriptor remains the SOURCE (I11 for `abort`/`pre-stack recovery`; I18 phase = pre-stack).

**Item 4 — the hold envelope (the load-bearing ordering).** The source re-render + scroll restore run while
the Browse hold is STILL HELD, and the hold is released (`dropRowHold()` -> `Browse.endHold()`) only AFTER
them. On a virtualized source, releasing the hold first deactivates the suspended source controller and
dematerializes its kept rows (`browse.js` `endHold` line ~174 -> `virtuallist.js` `deactivate()`), so the
re-render rebuilds the page from nothing and the successor's `start()` snapshots a cover-less grid. Holding
until after the render lets `endHold` do its single realization against the settled scroll REUSING the kept
rows (`browse.js` `showPage`'s `returningFromSwipe` defer, ~line 300-311; `endHold` contract "the ONE
realization the gesture gets, against the settled scroll", ~line 149-179) — which is why the normal abort
releases the hold in `finalize()`'s `finally`, after `runFinalize()` (§6, cell VR).

**Basis (U11).** Items 1-2 are new policy explicitly ratified in `PLAN-swipe-reveal.md` §3.7 and pinned as
enforced known-red entries in `PolicyLedger.mjs`; item 3 is invariant I11/I18; item 4 is the abort's proven
choreography (app.js `finalize()` `finally` at ~1138-1139) and §3.7's own sequence ("restore the source,
return its Browse lease"). The mechanism is fixed because exactly one design satisfies the invariant:
reproduce the abort's full restore ENVELOPE — render + scroll INSIDE the hold, `endHold` LAST — not merely
its middle pair. The *locus* (a named `recoverSuperseded` helper vs inline in `begin()`) is a
**recommendation**, not a requirement — any structure that produces the four effects in this order (§6)
satisfies this contract. There is one admissible behavior; no other section contradicts it.

**Why `d.clobbered` and not a new `sameBrowseHost` field (U4 consumer-now):** the source-rerender
condition already exists as a live session field — `start()` records `d.clobbered = c.sourceWasClobbered`
(app.js:470), true exactly when the browse->browse mid-drag render overwrote the resolved source `#browse`.
The recovery reads it directly. Introducing the normalized `sameBrowseHost` here would be a field with no
consumer this slice does not already have — a dead field (Engineering Contract §4.15). Its normalization is
Stage 6b (§11).

## 4. Value-crossing ledger

Machine-readable ledger (the prose mirrors the fenced block). Every value the recovery reads or writes,
each with one owner, its consumer, and its verification. `recoverSuperseded` = the recovery step added to
`begin()` (name illustrative per §3).

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
d.scroll0 session-start scroll | geometry | in | begin@S6 | recoverSuperseded@S6 | recoverSuperseded | per-gesture | SC scroll-restore test
d.clobbered source-clobbered flag | boolean | in | start@S6 | recoverSuperseded@S6 | recoverSuperseded | per-gesture | SR and NC tests
d.live drag-began flag | boolean | in | start@S6 | recoverSuperseded@S6 | recoverSuperseded | per-gesture | OB boundary test
currentDesc source descriptor | object | in | navStack@S6 | recoverSuperseded@S6 | recoverSuperseded | per-gesture | PS pre-stack test
Browse row hold token | resource | in | start@S6 | dropRowHold@S6 | dropRowHold | per-gesture | VR realization ordering test
source re-render into browse host | domeffect | out | recoverSuperseded@S6 | browse host@S6 | recoverSuperseded | per-gesture | SR test
session-start scroll restore | domeffect | out | recoverSuperseded@S6 | document scroll@S6 | recoverSuperseded | per-gesture | SC test
```

Notes: `currentDesc` reads the source because supersession is pre-stack (the stack is unmutated), so it is
an `in` read the recovery relies on, not a value it produces. The nav stack is deliberately absent as a
crossing — it is an invariant the recovery must NOT write (cell PS), not a value it moves. The **Browse row
hold token** (taken in `start()` via `takeRowHold`, stored `session.hold`) is consumed by `dropRowHold`
(`Browse.endHold`), which MUST run after the source re-render + scroll restore so `endHold` realizes the
suspended source rows rather than dematerializing them (cell VR; §6 step 4).

## 5. Lifecycle ownership — the superseded-session endpoint

Who creates, borrows, mutates, releases, restores, and destroys, at the supersession endpoint:

- **Create:** `begin()` creates the SUCCESSOR session (`d = { id: ++sessionSeq, ... }`, app.js:392) only
  AFTER the old session's recovery completes (§6).
- **Borrow:** the recovery borrows the real `#browse`/`#home`/overlay nodes (via `applyScreen`) and the
  `window` scroll — borrowed-real; it never removes them.
- **Mutate:** the recovery re-renders the source into the borrowed `#browse` (only when `d.clobbered`) and
  writes the document scroll to `d.scroll0`. It writes no session state onto the old `d` beyond reading it.
- **Release:** the old session's listeners (`releaseListeners`) are released BEFORE the recovery
  (`releaseGesture()`, which reads `session`) — UNCHANGED. The Browse hold (`dropRowHold` -> `endHold`) is
  released AFTER the recovery render+scroll — its POSITION CHANGES (§2, §6 step 4), because `endHold`
  outside the restore envelope dematerializes the suspended source rows. The **identity drop
  (`session = null` / `d = null`) is released LAST of all**, AFTER the hold release — because both
  `releaseGesture()` and `dropRowHold()` READ `session` (`dropRowHold` no-ops when `session` is null,
  app.js:339-342), so clearing identity earlier would leak the hold (`holdRows` stuck true, the source rows
  never realized). This is the app.js:1132 invariant ("dropRowHold reads session.hold, so it must run
  BEFORE endOwnership clears the session"). The recovery also reads the old `d`, so `d = null` is deferred
  to the same last step.
- **Restore:** the recovery is the RESTORE step this slice adds — source content and document scroll to
  the session-start state, performed while the hold is still held AND the old `session`/`d` are still set
  (§3 item 4; §6 step 3).
- **Destroy:** the old session's owned pane is disposed — UNCHANGED (the existing hard reset;
  `resetSwipeStyles()` + the leftover-`.nav-ghost` handling). The recovery adds no pane lifecycle method;
  `release()`/`dispose(reason)` are Stage 6b (§11).
- **Endpoint:** the old session's ownership ends (its last live resource released and `session` nulled)
  BEFORE the successor arms (`bindGesture(target)` binds the new session's listeners). No two sessions own
  live UI state simultaneously (I20).

Emergency disposal (Engineering Contract §4.18) is unchanged: the orphan-pane path still disposes as
`hard-reset`; the recovery adds a NORMAL restore for the `superseded` reason only and does not bypass any
paint barrier (there is none on this path today — §11 keeps I10 reveal-gating deferred).

## 6. Ordering contract

Three coupled ordering invariants: **recover-before-arm** (cell OR), **hold-release-after-recover** (cell
VR), and **identity-null-after-hold-release** (the app.js:1132 invariant — `dropRowHold`/`releaseGesture`
read `session`, so `session = null` must come after them). The current code's order is the DEFECT to
re-plan here, not an invariant to preserve — adding the recovery render makes the position of both
`dropRowHold` AND the `session`/`d` null load-bearing (§2). Required order:

1. **Detect supersession** — `begin()` sees `d` non-null (or a leftover pane) while `finishing` is false
   (I17(a): a settling/finalizing/revealing session still REJECTS; unchanged).
2. **Release the old session's listeners** — `releaseGesture()` (reads `session`; keep `session` set).
   Reset the old inline styles / dispose the old pane (`resetSwipeStyles()` and the leftover-`.nav-ghost`
   handling) — these read no `session` and do not re-render, so their position is unconstrained. Do NOT
   drop the Browse hold yet, and do NOT null `session`/`d` yet (both moved to the end; §2).
3. **Recover pre-stack, INSIDE the hold envelope** — while `session.hold` is still held (so the source page
   stays SUSPENDED with its rows kept, `browse.js` `showPage` `holdRows` suspend branch) and the old `d` is
   still set (the recovery reads `d.clobbered`/`d.scroll0`/`d.live`): re-render the source into `#browse`
   iff `d.clobbered` (`applyScreen(currentDesc(), { render: d.clobbered, resetScroll: false })`), then
   restore the scroll (`window.scrollTo(0, d.scroll0)`).
4. **Release the hold** — `dropRowHold()` -> `Browse.endHold()` (reads `session.hold`; `session` still set),
   which performs its single realization against the now-settled scroll, REUSING the suspended source rows
   (`browse.js` `endHold`, ~149-179). This mirrors `finalize()`'s `finally` (app.js:1138-1139), which drops
   the hold only after `runFinalize()` has rendered and scrolled.
5. **Drop identity LAST** — `session = null`, `d = null`, AFTER `releaseGesture` and `dropRowHold` (both of
   which read `session`). Nulling earlier makes `dropRowHold` a no-op and LEAKS the hold (`holdRows` stuck
   true -> the source rows are never realized -> defeats step 3-4). This is the app.js:1132 invariant that
   the current `begin()` (:365 before :373) and `finalize()` (`dropRowHold(); endOwnership();`) both obey.
6. **Only then arm the successor** — allocate the new `d`, set `session = d`, `bindGesture(target)`.

**Correctness requirement A (cell OR) — recover before arm.** Steps 3-4 MUST precede step 6 (arm). The
successor's `start()` (fired on its first `move()`) snapshots `#browse` for its own ghost
(`revealBase = snapBrowse(true)`, app.js:429; the app-ghost clone, swipe.js `ghostApp`). If the source
re-render ran AFTER the successor armed, the successor would snapshot the stale DESTINATION content,
reintroducing the wrong-page/wrong-tap class .178 fixed.

**Correctness requirement B (cell VR) — hold released after recover.** Step 4 MUST follow step 3 on a
VIRTUALIZED source. If `dropRowHold()` -> `endHold()` runs BEFORE the recovery render (the current code's
order), `endHold` deactivates the suspended source controller and dematerializes every kept row
(`virtuallist.js` `deactivate()`), so the step-3 render rebuilds the page from nothing and the successor
snapshots a cover-less grid (`ghostApp`'s `freezeArt` then strips `data-art`, so the skeletons never fill).
The Loki strike measured this against the real `js/browse.js`/`js/virtuallist.js`: released-first yields
`keptOriginalRows=0, freshRebuiltRows=13, 48 covers released`; released-last yields `keptOriginalRows=13`.
The small-list classic fixtures cannot see it (a cache hit reuses the page node with rows intact, no
suspend/`endHold` realization), which is why cell VR uses a forced-virtual source (§9).

Incidental (not a new universal order): the micro-order between `applyScreen` and `scrollTo` (render, then
scroll) mirrors the normal abort and is preserved, not reinvented.

## 7. Runtime dependency policy

This slice runs entirely inside `js/app.js` (which reads DOM globals bare by design — subsystem §16, trap
T11). It introduces **no** new ambient dependency and **no** module-load-time DOM access. It reuses the
existing app-side calls: `applyScreen` (nav.js), `currentDesc()`, `window.scrollTo`, `dropRowHold` ->
`Browse.endHold`. No value is cached; no cache owner or invalidation policy is created. `js/swipe.js` (the
DOM-free classification/construction module) is not touched, so its `require()` no-DOM gate is unaffected.

**Async N/A holds, and why the corrected order preserves it (addresses Loki NB1).** The recovery is
synchronous. `endHold` un-suspends the VirtualList scroll dispatcher (`setScrollSuspended(false)`), so a
scroll write AFTER `endHold` could schedule a rAF'd realize that lands after the successor arms — but §6
step 4 places `endHold` AFTER the step-3 `window.scrollTo`, so the scroll write occurs while the dispatcher
is still SUSPENDED and `endHold`'s realization is the single synchronous one against the settled scroll. No
recovery-window scroll write survives to schedule a post-arm realize; `async_change` stays false by
construction of the order.

## 8. Coverage Model (Mendeleev catalog)

Every catalog dimension marked applicable — with what the suite must prove — or not-applicable, with the
reason. Absence is a defect; a dimension not listed is an omission.

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | The superseded-session endpoint restores source+scroll before the successor arms (cells OR, PS). |
| Identities | N/A | No identifier is created, changed, or reinterpreted; `d.id`/`sessionSeq` semantics are unchanged. |
| Ordering | Yes | Three coupled ordering invariants: recover-before-arm (cell OR); hold-release-after-recover — the Browse hold (`endHold`) drops only after the source re-render + scroll, so a virtualized source's suspended rows are realized, not dematerialized (cell VR); and identity-null-after-hold-release — `session`/`d` are nulled only after `releaseGesture`/`dropRowHold` (which read `session`), else `dropRowHold` no-ops and the hold leaks (app.js:1132 invariant; cell VR mutation (b)). Render-then-scroll micro-order preserved. |
| Resources: acquired / owner / endpoint | Yes | Release order is load-bearing: listeners release BEFORE the recovery; the Browse hold releases AFTER the recovery render+scroll (cell VR); the identity drop (`session`/`d` null) releases LAST, after the hold — because `releaseGesture`/`dropRowHold` read `session` (app.js:1132). The pane is disposed exactly once (cell PD); ownership ends before the new arms (I20 regression). |
| Async operations | N/A | The recovery is synchronous in `begin()`; a superseded gesture is pre-`settle()`, so the old session has no scheduled rAF/timer/`transitionend`. `endHold`'s realization is synchronous and — because it runs after the scroll write while the scroll dispatcher is still suspended (§6 step 4, §7) — schedules no post-arm rAF realize (Loki NB1 addressed by ordering, not a new async surface; Applicability async_change:false). |
| Stale completions | Yes (parity) | Stale move/end/cancel from the superseded gesture stay harmless (cell ST, existing green). |
| Normal completion | N/A | This slice does not touch the normal `settle()`/`runFinalize()` commit/abort path; that behavior is unchanged and its existing tests (I7, I11 abort) must stay green as regression. |
| Recovery authority boundary | Yes | Pre-stack: the stack is never mutated; the authoritative descriptor stays the SOURCE (cell PS; I11/I18). |
| Emergency disposal | Yes (parity) | The orphan-pane hard reset still disposes without a session-scroll restore (cell OB); the superseded pane is disposed exactly once (cell PD; I2). |
| Persistence | N/A | The gesture is in-memory, per-process (subsystem §15). |
| External side effects | Yes | `Browse.render` of the source (only when clobbered) and `window.scrollTo` (cells SR, SC, NC). |
| Invariants | Yes | I7 (superseded scroll), I11/I18 (pre-stack authority), I2 (pane once), I20 (supersede + stale-harmless). |
| Mutation cases | Yes | Each cell in §9 names the mutation that reddens it (misattribution/ordering, not only omission). |
| Known-red | Yes | `KR-swipe-source-rerender` (SR) and `KR-swipe-scroll-restore` (SC) flip green and are scrubbed (§10). |
| Composition | Yes | The restored source `#browse` is what the SUCCESSOR's `start()` snapshots — with its ORIGINAL realized rows and loaded covers on a virtualized source, not a rebuilt grid (cells OR, VR). The recovery composes with the next gesture's `ghostApp` construction AND with the Browse hold/VirtualList suspend-realize lifecycle. |
| Contract claims (exact schema) | N/A | No exact-key contract changes (Applicability contract_shape:false); `classifyTransition`/`buildConstruction` shapes are untouched. |
| Concurrency | Yes (parity) | I17: `begin()` still REJECTS while `finishing` (a settling/finalizing/revealing session is not superseded); the recovery runs only when `finishing` is false and a live session or orphan pane exists. |

## 9. Coverage and mutation matrix

Every load-bearing promise and parity obligation maps to at least one production-facing test driving the
real `begin()`/`start()` through the app-harness (`test/app-harness.js` `h.touch`), each with the mutation
that must redden it. Layer: wiring = app-harness driving the real gesture; the two known-red rows are the
existing `{ todo }` tests made active.

| id | Behavior proved | Fixture / transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| SR | Superseding a live browse->browse drag re-renders the SOURCE into `#browse` | Authors-over-Books; live Authors->Books drag; a 2nd touch supersedes | recovery keeps `render:false` (omits the source re-render) -> `renders` ends `[...,"books"]` not `"authors"` | wiring (existing `{ todo }` at :391) |
| SC | Superseding a live drag restores the session-start document scroll | live browse->browse drag; a 2nd touch supersedes | recovery omits `window.scrollTo(0, d.scroll0)` -> no new `scrollCalls` entry | wiring (existing `{ todo }` at :339) |
| PS | Supersession is PRE-STACK: stack + authoritative descriptor stay on the source | supersede, then a 2nd back-swipe must offer the SAME transition | recovery pushes/pops the nav stack -> the next gesture reports a different transition pair | wiring |
| OB | An ORPHAN pane hard-reset (no live session, `d===null`) attempts no session-scroll restore and disposes as hard-reset | a leftover `.nav-ghost` with `d` null at `begin()` | recovery reads `d.scroll0`/`d.clobbered` unconditionally -> throws / spurious scroll on the orphan path | wiring |
| OR | The source re-render + scroll restore PRECEDE the successor arming, so the new `start()` snapshots the RESTORED source `#browse` | supersede a live browse->browse drag, then drive the new gesture live | move the recovery AFTER `bindGesture` -> the new ghost/`revealBase` snapshots the stale destination | wiring (intermediate-state, §4.7) |
| VR | On a VIRTUALIZED browse->browse source, the successor snapshots the ORIGINAL rows, REALIZED — the hold is released AFTER the recovery render, AND `session` is nulled only AFTER `dropRowHold`, so `endHold` actually fires and realizes the suspended rows | **forced-virtual** source (the `test/browse-virtual.test.js` recipe: injected metrics, >600-item list) scrolled deep with its realized rows identity-stamped; live browse->browse drag; supersede | Either ordering defect leaves the rows unrealized: (a) `dropRowHold`/`endHold` moved BEFORE the recovery render -> the source controller deactivates and kept rows dematerialize (`keptOriginalRows=0, freshRebuiltRows>0`); (b) `session = null` moved BEFORE `dropRowHold` -> `dropRowHold` no-ops (reads a null `session`), `endHold` never fires, the hold LEAKS and the suspended source rows are never realized | wiring (virtualized fixture — drives real `browse.js`/`virtuallist.js`) |
| NC | A non-clobber supersession (overlay source) issues NO spurious `#browse` re-render but still restores scroll when live | live overlay-source (or home->overlay) drag; supersede | recovery re-renders unconditionally (ignores `d.clobbered`) -> a stray `browse.render` on an overlay supersession | wiring |
| PD | Supersession still disposes the superseded pane exactly once (I2 parity) | live drag; supersede; settle | recovery strands the old pane -> `ghosts>0` | wiring (existing green) |
| ST | Stale move/end/cancel from the superseded gesture stay harmless (I20 parity) | supersede; dispatch the old target's event tail | recovery leaves the old listeners bound -> a stale touchmove drags the new session | wiring (existing green) |

**Machine-readable coverage (gate — `vitruvius-coverage`).** The matrix as `id | behavior | fixture |
mutation | layer`; each blocking question (SR/SC/PS/OB/OR/VR) has a complete row.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
SR | superseding a live browse-to-browse drag re-renders the SOURCE into the browse host | Authors-over-Books live Authors-to-Books drag then a second touch supersedes | recovery keeps render false and omits the source re-render | wiring
SC | superseding a live drag restores the session-start document scroll | live browse-to-browse drag then a second touch supersedes | recovery omits window.scrollTo to d.scroll0 | wiring
PS | supersession is pre-stack so the nav stack and authoritative descriptor stay on the source | supersede then a second back-swipe offers the same transition | recovery mutates the nav stack by push or pop | wiring
OB | an orphan pane hard-reset with no live session attempts no session-scroll restore and disposes as hard-reset | a leftover nav-ghost with d null at begin | recovery reads d.scroll0 or d.clobbered unconditionally on the orphan path | wiring
OR | the source re-render and scroll restore precede the successor arming so the new start snapshots the restored source browse host | supersede a live browse-to-browse drag then drive the new gesture live | the recovery is moved after bindGesture so the new ghost snapshots the stale destination | wiring
VR | on a virtualized browse-to-browse source the successor snapshots the original rows realized because the hold is released after the recovery render and session is nulled after dropRowHold | forced-virtual deep-scrolled source with realized rows identity-stamped then a live browse-to-browse drag then supersede | either dropRowHold and endHold moved before the recovery render dematerializing kept rows OR session nulled before dropRowHold so endHold never fires and the hold leaks leaving rows unrealized | wiring
NC | a non-clobber supersession issues no spurious browse re-render but still restores scroll when live | live overlay-source drag then supersede | recovery re-renders unconditionally ignoring d.clobbered | wiring
PD | supersession still disposes the superseded pane exactly once | live drag then supersede then settle | recovery strands the old pane | wiring
ST | stale move end and cancel from the superseded gesture stay harmless | supersede then dispatch the old target event tail | recovery leaves the old listeners bound | wiring
```

## 10. Records reconciliation (APPLY ON APPROVAL)

The scrub obligations when this ships (StandardsDocument §6.6; Engineering Contract §4.19/§7). These are
NOT applied by this plan — they are the checklist the build closes; each is a defining-record edit flagged
for the maker/Zelda, not done here.

- **`Claude/Decisions/PolicyLedger.mjs`** — remove `KR-swipe-scroll-restore` and `KR-swipe-source-rerender`
  (both go green; the §4.19 policy-ledger gate requires that a declared known-red still be red, so leaving
  them would fail CI). The two entries' removalTrigger is exactly this slice. After removal `POLICY_LEDGER`
  holds **no** `knownRed` entry (it held exactly these two).
- **`tools/mutate.mjs` — mutation anchor `§4.19: a policy-ledger known-red test reference is dangled`
  (registered at ~`:275-278`).** Its `from` anchor is the literal string `restores the starting scroll'],`,
  which is line 25 of `PolicyLedger.mjs` inside the `KR-swipe-scroll-restore` entry the bullet above
  removes. `test/mutation-anchors.test.js` (assertion ~`:50`) requires every registered anchor's `from` to
  still `includes()` in its target file, so removing the ledger entry without this step reds the
  mutation-anchor gate at build — a HEAD reference the abort-mirror change never touches but the ledger
  scrub invalidates (Engineering Contract §4.10 "mutation evidence must remain runnable"; StandardsDocument
  §6.6). **Resolution (planner's call): DELETE this mutation** in the SAME commit as the ledger removal.
  Re-pointing it is not available — after 6a no `knownRed` entry remains for it to target (verified: the
  ledger held exactly the two 6a entries). Record in the commit message which guard is now undefended, per
  the gate's own remedy text. Confirm `node --test test/mutation-anchors.test.js` is green after both edits.
  - *Deferred, flagged (Curie/Mendeleev): the policy-ledger gate (`test/policy-ledger-gate.test.js`) loses
    its only defending mutation when this specimen is deleted.* The gate's three assertions still pass on an
    empty ledger (verified in review), so nothing reds — but its mutation coverage goes to zero until a
    future known-red re-seeds it, OR a replacement guard is authored (e.g. a fixture-ledger mutation that
    does not depend on a live `POLICY_LEDGER` entry). This slice adds no known-red, so it cannot re-seed the
    specimen itself; restoring structural coverage of the policy-ledger gate is a coverage-audit question,
    not a 6a build obligation. Out of scope here, named so it is a decision owed, not a silent loss.
- **`test/swipe-invariants.test.js`** — drop the `{ todo }` marker on the two tests (`:339`, `:391`) in the
  SAME commit, so they run as active green tests. Do not invert an assertion; they already state the
  required behavior.
- **`Claude/Subsystems/swipe-reveal.md` §20** — remove both known-red bullets; leave the headline
  flash-bug bullet (still open, independent). §23 — annotate the stage-6 revision condition as sliced
  (6a done; 6b = finalization half + `sameBrowseHost` + pane lifecycle).
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — annotate: the supersession pre-stack recovery (this
  slice) landed; finalization/reveal centralization (I10, I17), `finalizationPlanFor`, `sameBrowseHost`,
  and pane lifecycle remain Stage 6b/7. Point to `PLAN-swipe-stage6.md`.
- **`Claude/Decisions/DecisionLog.md`** — append: the Stage-6a scope decision (the two known-reds closed
  via a pre-stack supersession recovery; the broader stage-6 set explicitly deferred with reasons), dated.
- **`docs/swipe-model.generated.txt`** — regenerate if line references shift; a code change bumps the build
  number (PWA deploy rule).
- **Engineering Contract §4.22 reviewable-stage naming** — this ships as "Stage 6a", not "Stage 6", so the
  deferred finalization half is visible and the stage is not called complete on a partial delivery.

## 11. What this does NOT do (deferred to Stage 6b/7, with reasons)

Each deferral names the consumer that does not yet exist and the stage that introduces it (U2):

- **`finalizationPlanFor()` / rich `planFor()` composition** (the finalization half of §3.3:
  commit/abort/scroll/stackEffect/paneRemovalPolicy). Deferred: its consumer is a restructured normal
  finalize path (Stage 6b/7); building it now would add fields with no current-slice consumer — dead
  fields (Engineering Contract §4.15). This slice reuses the existing app-side restore calls directly.
- **Normalized `sameBrowseHost`.** Deferred: the recovery reads the existing `d.clobbered` carrier (§3);
  a normalized field would be a dead field until the finalization plan consumes it (Stage 6b).
- **Pane `release()` / `dispose(reason)` / `equivalence` / `source` / `pin` (§3.6; the I8 equivalence
  audit).** Deferred: superseded-pane disposal already works via the existing teardown (cell PD green);
  the abstraction's consumers are the paint-gated reveal (I10) and the I8 audit, both Stage 6b. Adding the
  methods now is dead surface (Stage-5 F6 deferral, still binding).
- **`finishing`-gate retirement + `cur === session` stale-callback enforcement (I12/I20).** Deferred: the
  supersession recovery is synchronous in `begin()`, and a superseded LIVE session (pre-`settle()`) has no
  scheduled async continuation, so the guard remains unreachable-by-construction (app.js:219-234). Building
  it now yields an untestable guard; it lands with the finalize-path state machine that makes it reachable.
- **Session-owning + nulling the settle/reveal timers and the `transitionend` listener** (the DecisionLog
  "owed to stage 6" cleanup debt; subsystem §8 OPEN). Deferred: not user-visible and belongs with the
  finalization centralization that touches those handles; folding it here would enlarge the blast radius
  into the flash-sensitive finalize path for no user-facing gain.
- **I10 paint-gated reveal centralization + I17 generalization + the full `recoverSession` reason/phase
  matrix** (lease-invalid / destination-gone / finalize-threw; post-stack). Deferred: those reasons are
  UNDEFINED conditions today with no detector (§3.7: "gaps the rewrite must CLOSE"), and post-stack
  recovery requires the finalization restructure; a branch for a condition that cannot fire is an
  unreachable guard this project forbids. This slice implements only the (`superseded`, `pre-stack`) cell,
  shaped so Stage 6b can generalize it.
- **The headline aborted-swipe repaint/flash.** Untouched and independent (`PLAN-swipe-reveal.md` §6;
  memory `tomeroam-swipe-repaint-saga`). Parity for the flash is the bar; this slice adds no paint-gating
  to the supersession path.

### Loki lesser planes (NB1-NB4) — disposition

The strike (`Claude/Loki/STRIKE-swipe-stage6-recover-before-arm.md` §6) named four un-prosecuted planes.
Disposition:

- **NB1 (recovery-window scroll writes schedule post-arm rAF realizes).** FOLDED IN and closed by the
  corrected order: §6 step 4 places `endHold` (which un-suspends the scroll dispatcher) AFTER the step-3
  scroll write, so no recovery-window scroll write survives to schedule a post-arm realize (§7, §8 Async).
- **NB2 (`endHold` replays `heldRepaints` — a mid-drag SWR revalidate can rebuild the source page).**
  NOTED, out of scope. This is a pre-existing Browse-hold behavior shared IDENTICALLY with the normal abort
  (which also calls `endHold` in `finalize()`'s `finally` and replays the same `heldRepaints`). It is not
  introduced by this slice; closing it is a Browse-hold concern independent of supersession. Flagged so a
  Browse-hold change accounts for it.
- **NB3 (classic path: step-2 `display:none` round-trip drops decoded covers on iOS — the .194
  mechanism).** NOTED, out of scope — flash-class. Consistent with the standing flash deferral above; the
  classic re-show round-trip is the abort's behavior too, and the flash root cause is a separate open
  investigation. Parity is the bar.
- **NB4 (a cache-miss source makes the step-3 render async -> the successor could snapshot a
  placeholder/spinner).** NOTED, out of scope. Shared with the abort (an abort re-render of a cache-evicted
  source is equally async); the promise's "synchronous restored source" holds for a cache-resident source,
  which is every path except a mid-drag `clearCache`/eviction. Closing it needs the render to await the
  fetch — an async change the abort also lacks and this slice does not introduce. Bounded residual, flagged.

## 12. Sequencing

This slice rests only on shipped Stage 5 (`buildConstruction` recording `d.clobbered`/`d.scroll0`) and the
existing `begin()`/`applyScreen` path. It does not gate, and is not gated by, the deferred Stage 6b/7 work
(§11), which owns the finalization/reveal centralization and the lifecycle abstraction. It stops at the
supersession boundary so Stage 6b restructures the finalize path in one pass without unwinding a 6a change.
Handoff order: Charpy (temper) -> Curie (red suite from §9) -> Brunel (green) -> Poirot (review) ->
Mendeleev (coverage audit) -> Loki (strike one load-bearing promise of §3). Campaign definition-of-done:
`Claude/Campaigns/swipe-stage6.json`.
