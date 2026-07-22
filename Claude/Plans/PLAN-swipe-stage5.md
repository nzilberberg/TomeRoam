# PLAN — Swipe/reveal Stage 5 (resolved)

Status: **PROPOSED — pending review** (Vitruvius; do not implement until approved). Sub-plan of
`Claude/Plans/PLAN-swipe-reveal.md` §7 step 5. Resolves the F0 scope conflict and the five open
Stage-5 questions (F0/F1/F3/F6 + F2/F4/F5) from `Claude/Charpy/PLAN-swipe-reveal-stage5-2026-07-22.md`.
Grounded against the code at HEAD (app.js, js/swipe.js, js/nav.js).

## Index
1. Goal and constraints
2. Scope decision — B, with A and C rejected
3. The seam (F1) and the no-session rule (F5)
4. Host fields (F3)
5. Pane representation and lifecycle staging (F6)
6. Export classification (F2)
7. Coverage Model (F4 + Mendeleev dimensions)
8. Records reconciliation (apply on approval)
9. Sequencing and later-stage ownership
10. What this does NOT do

## 1. Goal and constraints

Stage 5's goal (PLAN-swipe-reveal.md §1, §7.5): move the swipe construction out of `app.js` so the
subsystem's behaviour is determinable from `js/swipe.js` + one header, without the flash bug or the
existing behaviour changing. Constraints, all load-bearing and verified against the code:
- `js/swipe.js` is `require()`d in a no-DOM Node context (test/contract-function-gate.test.js); its
  module load must stay DOM-free.
- The capture-order parity (`copyAnimPhase`/`copyScroll` run AFTER the clone is inserted — the `.207`
  fix, app.js:492–495/575–578), the `.hidden`/`.parked` prune not testing the clone root (T2), and the
  `ghostY` snapshot are behaviour that must be preserved exactly.
- No dead fields/methods (Engineering Contract §17): every field or method a stage adds has a
  production consumer in that stage.

## 2. Scope decision — B, with A and C rejected

**Chosen: B — move the capture recipes AND real source/host mover resolution AND the decoration
builder; leave the Browse render dispatch and the Browse hold in `app.js` behind narrow callbacks.**

Grounded rationale (why B is preferable):
- **The construction DECISION and its EXECUTION belong in one module.** `classifyTransition` /
  `constructionPlanFor` already decide *which* representation each mover takes (stage 4). The real-mover
  resolution `fromOv ? overlayEl(fromV) : appViewEl(fromV)` and the overlay-vs-`#browse` destination
  selection (app.js:622,630,633) are the execution of that decision. Splitting decision (swipe.js) from
  execution (app.js) is the exact seam swipe.js exists to close (§1). B closes it; A leaves it open.
- **B gives the host fields a real consumer** (F3): the moved resolution reads `sourceHost`/
  `destinationHost`, so reintroducing them is not a dead field.
- **B stops at the Browse boundary, which a later stage owns.** `Browse.render` (app.js:557) and the
  Browse hold (`Browse.beginHold`, app.js:339) are redesigned into the lease interface in **stage 7**
  (§7.7, §3.5). The `renderBrowse` callback is *already* injected into `Nav` (app.js:2892), so keeping
  the render dispatch in `app.js` behind that same callback pattern is precedented and cheap.

**A — capture recipes only — REJECTED (under-delivers §1).** Moving only `ghostApp`/`snapshotHome`
leaves `overlayEl`/`appViewEl` resolution and the mover assembly in `app.js`, so the subsystem's
construction is still split across two modules and cannot be read from one — the stage's own goal. It
also leaves `sourceHost`/`destinationHost` with no consumer, deferring F3 with nothing gained.

**C — whole construction incl. render dispatch — REJECTED (sequencing).** Moving `Browse.render`/
`renderScreen`/`renderNowPlaying` into swipe.js couples it to Browse immediately before **stage 7**
reworks that coupling into the lease interface — the render/hold calls would be moved in stage 5 and
re-touched in stage 7 (churn), and swipe.js would take a Browse dependency the lease design has not yet
settled. A later step (7) must not force a rewrite of an earlier one (5); B avoids it.

## 3. The seam (F1) and the no-session rule (F5)

`js/swipe.js` keeps its pure core (`classifyTransition`, `constructionPlanFor`) and gains ONE impure
construction surface:

    Swipe.buildConstruction(plan, env) -> { movers, capture }

- **`plan`** is the existing `constructionPlanFor(...)` output (immutable).
- **`env`** is the injected seam — the only external entry points, so swipe.js takes no ambient DOM
  dependency and module load stays DOM-free (F2):
  - `env.document` — the document to build clones in.
  - `env.sourceEl(kind, v)` / `env.destOverlayEl(v)` — the real-element resolvers (thin wrappers over
    `Nav.overlayEl`/`Nav.appViewEl`; swipe.js already imports `Nav`, so these MAY instead be read from
    `Nav` directly — the plan permits either, the test is the same).
  - `env.browseHost()` — returns the real `#browse` element (destination host for a browse render).
  - `env.renderDestination(host, desc)` — the NARROW callback that performs the Browse/overlay render
    in `app.js` (mirrors `Nav`'s injected `renderBrowse`). swipe.js MAY call it to order the mid-drag
    render relative to the outgoing ghost, but never implements it — all `Browse.render`/`renderScreen`/
    `renderNowPlaying`/`np-locked` logic stays in `app.js` (stage-7 boundary, §2).
  - `env.navPill()` — the source node for the Now Playing pill clone.
- The capture helpers `ghostWrap`, `freezeArt`, `copyScroll`, `copyAnimPhase`, and the module-scoped
  `lastAnimResidual` are used ONLY by the two recipes (verified: app.js:480/567, 464/489/570,
  382/492/575, 419/494/577, 418/460/495/578). They RELOCATE INTO swipe.js as private functions — not
  injected — so the `.207` after-insertion ordering and pruning live with the recipes they serve.

**No-session rule (F5).** `buildConstruction` RETURNS `capture` (e.g. `{ ghostY, animSync, animRes }`
per pane); it does NOT receive or mutate the gesture session `d`. `start()` records the returned
capture onto the session. Passing `d` is prohibited only as an anti-pattern recommendation, not a
contractual rule; the returned-capture contract is the design of record here because injecting `d`
re-couples the module the extraction decouples.

## 4. Host fields (F3)

`classifyTransition` additionally emits `sourceHost` and `destinationHost` (values: `overlay` |
`in-flow` | `browse-host`), and `buildConstruction` READS them to resolve the real source element and
select the destination host. This is their genuine Stage-5 production consumer, added in the same
commit — satisfying the no-dead-fields rule. `sameBrowseHost` remains OUT (its only consumer, the abort
re-render, is stage 6); it is reintroduced then, not now.

## 5. Pane representation and lifecycle staging (F6)

Stage 5 returns movers whose panes carry ONLY fields with a Stage-5 production consumer — the element
and its capture: `{ element, base, ownership, capture }`. The §3.6 lifecycle methods `release()` /
`dispose(reason)` and the `source`/`equivalence`/`pin` fields are NOT added in stage 5: their consumers
are finalization/reveal ordering (I10) and the I8 equivalence audit, both **stage 6**. Adding them now —
even to satisfy an I8 test — would be a dead field (Engineering Contract §17; the error F6 caught).
Stage 6 introduces `release()`/`dispose()`/`equivalence` when finalization consumes them, the same
phase-split already used for `constructionPlanFor()` vs `finalizationPlanFor()`.

## 6. Export classification (F2)

- `classifyTransition`, `constructionPlanFor` — remain CONTRACT functions (exact-keyed, deep-immutable;
  test/contract-function-gate.test.js).
- `buildConstruction` — a single new export, registered as `NON_CONTRACT` with the reason "impure
  construction surface: returns live DOM movers, not a frozen contract object." The gate's
  new-export meta-check is thereby satisfied.
- DOM access stays lazy: no top-level `document`/`window` reference is introduced; `buildConstruction`
  touches the DOM only when called with a real `env` at runtime, so the no-DOM unit tests still load.

## 7. Coverage Model (F4)

Two layers, both required; stated as invariants so a legitimate later refactor does not break them.

- **Recipe-level (DOM/jsdom unit tests) — behaviour of the moved builders:**
  - app-ghost: clone of `.app` with ids stripped, topbar removed, `.hidden`/`.parked` pruned WITHOUT
    testing the root (T2), `#library` top padding preserved, `translateY(-ghostY)` applied,
    carousel scroll copied, animation phase synced AFTER insertion (the `.207` order), and `capture`
    returning the `ghostY`/`animSync`/`animRes` it produced.
  - home-snapshot: clone of `#home` at top, `.app`+`#library` wrapper, phase/scroll synced after
    insertion.
  - Each mutation-verified (reversing the after-insertion order, or dropping the prune, reddens a test).
- **Production-wiring (app-harness) — that `start()` consumes the moved builder:**
  - A browse-destination swipe builds the app-ghost FROM `Swipe.buildConstruction`, and its element
    participates in the production mover set with the correct ownership and ordering (stated as that
    invariant, NOT as a `d.movers` internal — a later stage may relocate mover assembly).
  - An overlay-source back-swipe builds NO ghost.
  - Each mutation-verified against a WIRING mutation (e.g. `start()` always ghosts the outgoing), per
    the `.228` F1 law: proving the builder correct in swipe.js is not proving `start()` calls it.

Mendeleev catalog pass (each dimension applicable-and-covered / applicable-new / n-a-with-reason):
- **Behaviour/correctness** — covered (recipe + wiring tests above).
- **Lifetime/ownership** — covered (typed mover ownership asserted; panes released/disposed is
  stage-6, n-a here with reason).
- **Concurrency** — n-a: stage 5 changes construction only; supersession/settle ownership is unchanged
  and already pinned (stage 3 tests).
- **Failure paths** — new: `buildConstruction` on an unhandled classification THROWS (no default
  branch), asserted by a direct unit test as `constructionPlanFor` already is.
- **Contract claims** — covered: the NON_CONTRACT classification is enforced by the export meta-gate;
  the returned pane's exact-key set (`element/base/ownership/capture`) asserted so a dead field reddens.
- **Composition** — covered: the wiring test proves the moved builder composes with the untouched
  render dispatch (`env.renderDestination`) and mover assembly.
- **Persistence** — n-a: no persisted state.

## 8. Records reconciliation (apply ON APPROVAL, not now)

On approval, three records are reconciled to scope B (StandardsDocument §6.6); until then they stay as
they are and this sub-plan is the proposed resolution:
- **PLAN-swipe-reveal.md §7 step 5** → "Move the capture recipes + real source/host mover resolution +
  the Now Playing decoration into swipe.js behind an injected env; the Browse render dispatch and Browse
  hold stay in app.js behind callbacks until stages 6/7." Point it at this sub-plan.
- **`js/swipe.js` header (lines 24–27)** → replace the five-builders-plus-render list with: stage 5
  moves the two recipes + `overlayEl`/`appViewEl` source resolution + `npPillClone`; `renderScreen`/
  `renderNowPlaying`/`Browse.render` and the Browse hold stay in app.js. (Brunel applies this at
  build-start; it is a code-comment change, not planning work, so Vitruvius specifies but does not make
  it.)
- **DecisionLog** → settle the OPEN F0 scope decision to B, citing this sub-plan.

## 9. Sequencing and later-stage ownership

Stage 5 (B) rests only on stage 4 (shipped `classifyTransition`/`constructionPlanFor`) and the frozen
model. It does not gate, and is not gated by, later stages:
- **Stage 6** (centralize finalization + reveal ordering, I10/I17) owns `release()`/`dispose()`/
  `equivalence` and the settle/reveal path — all left in app.js by B (§5).
- **Stage 7** (replace Browse hold with the lease interface, §7.7/§3.5) owns `Browse.render`/
  `Browse.beginHold` — both left in app.js by B behind `env.renderDestination` and the untouched hold
  (§2, §3). B deliberately stops at this boundary so stage 7 redesigns Browse coupling in one module
  without unwinding a stage-5 move.

This is the verification the reviewer asked for: B is checked against later-stage ownership, and it does
not pull any stage-6 or stage-7 surface forward.

## 10. What this does NOT do

- It does not move the Browse render dispatch or the Browse hold (stages 7).
- It does not add pane lifecycle methods or the I8 equivalence fields (stage 6).
- It does not reintroduce `sameBrowseHost` (stage 6).
- It does not change the finalize/settle/reveal path, the diagnostics, or any behaviour — parity is the
  bar, and the flash bug is untouched (independent of this extraction).
