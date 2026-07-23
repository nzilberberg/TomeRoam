# PLAN — Swipe/reveal Stage 5 (resolved seam specification)

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor","patterns":{"boundary_relocation":true,"callee_replacement":true,"contract_shape":true,"state_transfer":true,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:345-356","js/app.js:368-497","js/app.js:547-580","js/app.js:582-655"],"callee_ranges":["js/app.js:550-558","js/app.js:632-638"],"affected_contracts":["test/contract-function-gate.test.js:24","test/swipe-transition.test.js:57","test/fixtures/swipe-plan-spec.mjs:45","test/swipe-transition.test.js:90"],"staged_records":["Claude/Plans/PLAN-swipe-reveal.md","js/swipe.js:24-27","Claude/Decisions/DecisionLog.md"],"blocking_questions":["F1","F2","F4","F5","F6","F7","F8"]} -->

Status: **APPROVED / RATIFIED** — 2026-07-22 (Charpy round-2 TEMPER cleared: F1-r/F2-r/F3-r resolved;
scope B ratified; build may proceed). Sub-plan of
`Claude/Plans/PLAN-swipe-reveal.md` §7 step 5. Resolves the seven blocking findings (F1, F2, F4, F5,
F6, F7, F8) and the F3 recommendation from `Claude/Charpy/PLAN-swipe-stage5-2026-07-22.md`, plus the
named parity obligations (`np-locked`, `freezeArt`, `.nav-ghost`, `npPillClone`, no-new-`will-change`,
initial mover placement). Grounded against HEAD: `js/app.js`, `js/swipe.js`, `js/nav.js`,
`test/contract-function-gate.test.js`, `test/app-harness.js`.

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: true** — the pane-construction block moves from `app.js` into `js/swipe.js`
  across the module boundary (source ranges declared and traced in §4).
- **callee_replacement: true** — the destination render (`showAppView` + the overlay render branch) is
  replaced by an injected `env.renderDestination` callback; both callee ranges declared, every observable
  effect assigned in §5.
- **contract_shape: true** — `classifyTransition` gains `sourceHost`/`destinationHost`, changing its
  exact-key contract (§3, §8); the gate registration updates in the same commit.
- **state_transfer: true** — ownership of the capture recipes, source resolution, the decoration
  builder, and the `d.clobbered` producer moves from `app.js` to the seam (§5, §6).
- **async_change: false** — construction is synchronous; no promise, timer, or concurrency changes.
- **persistence_migration: false** — no persisted or serialized state.
- **lifecycle_ownership: false** — pane `release()`/`dispose()` lifecycle is deferred to Stage 6 (§2);
  Stage 5 adds no resource lifecycle methods.

## Index
1. Defining records and authority
2. Exact scope boundary
3. Canonical seam contract
4. Value-crossing ledger
5. Observable-effect ownership table
6. Ordering contract
7. Runtime dependency policy
8. Coverage and mutation matrix
9. Records reconciliation (apply on approval)
10. Sequencing and later-stage ownership
11. What this does NOT do

## 1. Defining records and authority

Every record that materially defines Stage 5, its authority, and what this plan changes. Verdict across
the records: **CONFLICT at HEAD; this sub-plan is the proposed resolution to boundary B with host
selection carried in the classification (§2, §3).**

| Record | What it currently says | Authority | This plan | On approval | Left unchanged |
|---|---|---|---|---|---|
| `PLAN-swipe-reveal.md` §7 step 5 | "Move pane builders unchanged" — reads as boundary A | Parent plan-of-record (strategic) | Selects boundary B, host carried | Rewrite step to B, point to this sub-plan (§9) | §7.1–7.4 (frozen model), §7.6–7.7 |
| `js/swipe.js` header, lines 24–27 | Lists five builders + render calls (boundary C) | Code comment (subordinate to plan) | Selects B; render dispatch stays app-side | Brunel rewrites header to B at build start (§9) | Rest of the header |
| `Claude/Decisions/DecisionLog.md` 2026-07-21 | `sourceHost`/`destinationHost` reintroduced "with a reader" | Settled decision | Honors it: host fields carried, read by construction (§3) | Settle OPEN F0 to B, cite this sub-plan (§9) | Prior swipe entries |
| `Claude/Charpy/PLAN-swipe-stage5-2026-07-22.md` | Seven blocking findings on the prior draft | Approved review (authoritative feedback) | Resolves each with a chosen owner/shape/route/order | Filed; no edit | — |
| `test/contract-function-gate.test.js:24` | `classifyTransition` keys `['decorations','fromKind','toKind']` | Contract gate (compatibility) | Adds two keys (§3, §8) | Registration updated in the same commit | `constructionPlanFor` reg (line 30) |
| `test/swipe-transition.test.js:57` | `CLASSIFICATION_KEYS = ['decorations','fromKind','toKind']` — a second exact-key assertion | Transition-matrix test (compatibility) | Adds `sourceHost`/`destinationHost` to the expected key set | Updated in the same commit | `CONSTRUCTION_KEYS` (line 29) |
| `js/swipe.js` (HEAD) | Pure core: `classifyTransition`, `constructionPlanFor` | Code under change | Adds `buildConstruction` (`NON_CONTRACT`) | — | Pure core behavior |

Authority precedence when records conflict: the parent plan-of-record and the approved review govern;
the `swipe.js` header is a subordinate comment scrubbed to match on approval, never an equal authority
(D1 materiality). The prior records still conflict at HEAD; deferring their scrub to approval is proper
(StandardsDocument §6.6), not a finding.

## 2. Exact scope boundary

Behavioral ownership, not function names.

**Moves into `js/swipe.js` (owner: `buildConstruction`, "L1"):**
- The two capture recipes (`ghostApp`, `snapshotHome`) and their private helper cluster
  (`ghostWrap`, `freezeArt`, `copyScroll`, `copyAnimPhase`, module state `lastAnimResidual`) — verified
  to have no consumer outside the two recipes (app.js:480/489/492/494/567/570/575/577; state 418/495/578).
- The `GHOST_BG` value — resolved lazily at runtime through `env`, not the top-level initializer (§7, F8).
- The Now Playing pill recipe (`npPillClone`) as a private decoration builder (F5 coverage).
- Real **source** element resolution (`overlay` vs `in-flow`), driven by the carried `sourceHost`.
- Deriving the classification and construction plan (single source of truth, §3, F5) and returning both.
- The **ordering** of outgoing capture before any destination render (§6, F7).

**Stays in `app.js`:**
- The destination render dispatch — `showAppView`, `Browse.render`, `renderScreen`, `renderNowPlaying`,
  and the host-state effects inseparable from rendering — behind the injected `env.renderDestination`
  callback ("L2"), mirroring the already-injected `Nav.renderBrowse` (app.js:2892).
- The Browse hold (`takeRowHold`/`dropRowHold`, app.js:339) and `snapBrowse` reveal snapshot — Stage-7
  surfaces.
- The gesture session `d`, numeric `base` geometry, `d.movers` assembly, initial mover parking, and
  recording returned capture/`clobbered` onto `d` — the call-site adapter ("L3", `start()`).
- The outgoing-NP `np-locked` unlock (rides with `plan.decorations`, app.js:645).

**Split across the seam:** the old `start()` construction block (app.js:582–655) becomes L1 (build) +
L2 (render callback) + L3 (adapt). §5 assigns every observable effect to exactly one of the three.

**Deferred to Stage 6+ (not needed in Stage 5, with reason):**
- Pane `release()`/`dispose(reason)`, `source`, `equivalence`, `pin` (§3.6) — their consumers are
  finalization/reveal (I10) and the I8 equivalence audit, both Stage 6. Adding now = a dead field
  (Engineering Contract §17). Stage 5's mover panes carry only `element`/`ownership` (+ `base`,
  computed by L3) and top-level `capture`.
- `sameBrowseHost` (normalized) — its only consumer is the Stage-6 abort re-render. Stage 5 keeps the
  live `d.clobbered` carrier (§5, F6); Stage 6 normalizes it.

## 3. Canonical seam contract

One construction surface is added to `js/swipe.js`. There is exactly one admissible return shape; no
other section contradicts it.

**Signature.**

```
Swipe.buildConstruction(from, dest, env) -> Construction
```

- `from`, `dest` — the canonical gesture descriptors (`d.from`, `d.dest`): `{ v: string, ...payload }`.
  They are the **single source of identity**. `buildConstruction` derives classification and plan
  internally (`classifyTransition({ from, to: dest })` → `constructionPlanFor`), so raw identity and
  derived classification cannot disagree (F5 two-source hazard closed by construction, not by discipline).
- `env` — the injected seam (§7). No ambient `document`/`window`/`Element`/`$` is read outside it.
- Numeric `base`, viewport width, and direction never cross the seam (§ F1.2): they stay in L3.

**Structural definition** (TypeScript-style notation; project is vanilla JS):

```ts
type Mover = {
  element: Node;                                   // the DOM node that slides
  ownership: 'owned-pane' | 'borrowed-real' | 'owned-decoration';
  slot: 'outgoing' | 'incoming';                   // semantic; L3 maps to numeric base (0 | off)
};

type Capture = { ghostY?: number; animSync: number; animRes: number };  // ghostY is APP-GHOST ONLY (F2-r)

type Construction = {
  classification: Readonly<{ fromKind; toKind; sourceHost; destinationHost; decorations }>;  // reused by L3
  plan: Readonly<{ outgoing; incoming; renderDestination; decorations }>;                     // reused by L3
  movers: {
    outgoing:   Mover;                             // ownership 'owned-pane' (app-ghost) | 'borrowed-real'
    incoming:   Mover;                             // ownership 'owned-pane' (home-snapshot) | 'borrowed-real'
    decoration: Mover | null;                      // the NP pill, or null
  };
  capture: Capture | null;                         // the sole owned-pane's capture; null when none built
  sourceWasClobbered: boolean;                     // the same-browse-host condition (F6)
};
```

Answers to the required contract questions:
- **Where canonical `from`/`dest` enter:** as the first two arguments; classification is derived from
  them inside, never supplied alongside (no disagreement path).
- **How `sourceHost`/`destinationHost` reach their consumer (F2):** `classifyTransition` emits them;
  `buildConstruction` reads them off the classification it derives internally, so there is no
  reachability gap through `constructionPlanFor` (which does not carry them). `sourceHost ∈ {overlay,
  in-flow}` selects the real source element; `destinationHost ∈ {overlay, browse-host, home}` selects the
  render mode L2 dispatches. Both have a genuine L1 consumer in this commit. Emitting them changes
  `classifyTransition`'s exact-key contract, pinned in **two** places that both update in the same commit:
  `contract-function-gate.test.js:24` (the immutability/exact-key gate) and `swipe-transition.test.js:57`
  (`CLASSIFICATION_KEYS`, the transition-matrix assertion). `constructionPlanFor`'s key set and both its
  registrations are unchanged, because the host fields are read off the classification, not forwarded
  through the plan.
- **Whether host selection is carried or derived (F3):** **carried.** Justification: exposing the
  kind→host projection in the one normalization boundary centralizes host-mapping policy there and stops
  the impure builder re-deriving host from `fromKind`/`toKind`. The fields are consumed (not dead), and
  no project rule forbids a derived contract field. This is the one-sentence architectural benefit F3
  asks for.
- **The exact kind→host projection (F1-r), written out so it is not left implicit:** `classifyTransition`
  computes the two fields from the kinds it already derives (`kindOf`/`isOverlay`, swipe.js:43–48):
  - `sourceHost = fromKind === 'overlay' ? 'overlay' : 'in-flow'` (home and browse sources are in-flow).
  - `destinationHost = toKind === 'overlay' ? 'overlay' : toKind === 'browse' ? 'browse-host' : 'home'`.

  Per structural case (the eight `STRUCTURAL_CASES`, swipe-plan-spec.mjs:45–54): home→browse `in-flow`/
  `browse-host`; home→overlay `in-flow`/`overlay`; browse→home `in-flow`/`home`; browse→browse `in-flow`/
  `browse-host`; browse→overlay `in-flow`/`overlay`; overlay→home `overlay`/`home`; overlay→browse
  `overlay`/`browse-host`; overlay→overlay `overlay`/`overlay`. These values are pinned in the frozen spec
  and asserted per registry pair (§8, F1-r) — the projection is not left for the reader to reconstruct.
- **Mover field names (F1.1):** the builder returns the **explicitly-mapped external shape**
  `{ element, ownership, slot }`. L3 adapts to the production `d.movers` shape `{ el, base, own }`:
  `el = element`, `own = ownership`, `base = slot==='outgoing' ? 0 : off`. The builder never emits the
  production `el`/`base`/`own` keys; L3 owns the mapping.
- **Who computes numeric `base` (F1.2):** **L3 (`start()`).** `off = d.dir==='back' ? -d.w : d.w`.
  Outgoing → 0, incoming → `off`, decoration → its `slot`. Width/direction never cross the seam.
- **Canonical location and absent value of `capture` (F1.3):** top-level, aggregate. Exactly one
  owned-pane produces capture per transition (`app-ghost` XOR `home-snapshot`; mutually exclusive,
  swipe.js:124–129), so `capture` is a single object or `null` (overlay↔overlay, borrowed-real both
  sides). L3 records it onto `d` only when non-null (matching today: no ghost ⇒ `d.ghostY` untouched).
- **The two owned panes produce DIFFERENT capture fields (F2-r):** `app-ghost` produces
  `{ ghostY, animSync, animRes }` (app.js:487, 495); `home-snapshot` produces `{ animSync, animRes }`
  only — a home snapshot is pinned at top with no scroll freeze, so it has no `ghostY` (app.js:578). That
  is why `ghostY` is **optional** on `Capture` (app-ghost only, not `ghostY: number` for both). L3 records
  ONLY the fields the capture carries — it must NOT synthesize a `ghostY` (nor `0`/`undefined`) on the home
  path, preserving today's "no ghost ⇒ `d.ghostY` untouched" (both `d.ghostY` readers null-guard it:
  app.js:1163 `cur.ghostY == null ? '?'`, app.js:1212 `(cur.ghostY == null) ? null : …`, so an absent
  `ghostY` on the home path is parity-safe).
- **Additional construction metadata:** `classification` and `plan` are returned so L3 reuses the exact
  objects (decorations loop, render-mode checks) without re-deriving — no second source.
- **How `d.clobbered` is produced and recorded (F6):** `buildConstruction` computes `sourceWasClobbered`
  (it owns source resolution and knows `destinationHost==='browse-host'` and whether the source is also
  `#browse`) and returns it; L3 records `d.clobbered = c.sourceWasClobbered`. The finalizer (app.js:1260/
  1286) still reads the session field, now written by L3.

## 4. Value-crossing ledger

Machine-readable ledger (the gate parses the fenced block; the prose table mirrors it). Every
boundary-relevant value and effect in the moved ranges, each with a single owner, its consumer, and its
verification. `L1`=`buildConstruction`, `L2`=`env.renderDestination`, `L3`=`start()` adapter.

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
from/dest descriptors (identity+payload) | object | in | start()@S5 | buildConstruction@S5 | L3 passes | per-gesture | F5-identity test
from.v/dest.v (fromV/toV) | object | in | descriptors@S5 | buildConstruction@S5 | L1 reads | per-gesture | F5 test
classification (fromKind/toKind) | object | in | classifyTransition@S5 | buildConstruction@S5 | L1 derives | per-gesture | swipe-model test
sourceHost | object | in | classifyTransition@S5 | buildConstruction@S5 | L1 reads | per-gesture | F2 contract + source-resolve test
destinationHost | object | in | classifyTransition@S5 | env.renderDestination@S5 | L1 reads,passes | per-gesture | F2 contract + render-mode test
isOverlay(fromV) | freeid | in | Nav@S5 | buildConstruction@S5 | Nav (imported) | pure | F5 test
d.dir/d.w (off) | geometry | in | start()@S5 | start()@S5 | L3 | per-gesture | F1 base test
window scrollY (ghostY) | geometry | in | env.scrollY@S5 | ghostApp@S5 | L1 via env | per-gesture | F4 no-ambient test
app clone source (.app) | domread | in | env.document@S5 | ghostApp@S5 | L1 via env.document | per-gesture | F4 fake-env test
home clone source (#home) | domread | in | env.document@S5 | snapshotHome@S5 | L1 via env.document | per-gesture | F4 fake-env test
Element getAnimations feature check | ambient | in | env.document.defaultView@S5 | copyAnimPhase@S5 | L1 via env | per-gesture | F4 Element-sync test
navPill source node | domread | in | env.navPill@S5 | npPillClone@S5 | L1 via env | per-gesture | npPillClone test
GHOST_BG page background | closureconst | in | env.document.defaultView@S5 | ghostWrap@S5 | L1 fresh via env | per-gesture | F8 no-top-level-DOM test
clone build+mount to body | domeffect | out | ghostApp/snapshotHome@S5 | env.document.body@S5 | L1 via env.document | per-gesture | recipe test
stale .np-pill-float removal | domeffect | out | npPillClone@S5 | env.document@S5 | L1 via env | per-gesture | npPillClone test
mover shape {el,base,own} | object | out | buildConstruction@S5 | start()@S5 | L3 maps | per-gesture | F1 mapping test
capture {ghostY?, animSync, animRes} | object | out | ghostApp/snapshotHome@S5 | start()@S5 | L1 returns,L3 records | per-gesture | F1 capture test
d.clobbered same-host carrier | object | out | buildConstruction@S5 | finalize@S5 | L1 returns,L3 records | per-session | F6 abort test
stale settings-overlay cleanup | domeffect | out | env.renderDestination@S5 | shared overlays@S5 | L2 | per-gesture | F5 stale-overlay test
home park/browse hidden toggles | domeffect | out | env.renderDestination@S5 | #home/#browse@S5 | L2 | per-gesture | F5 host-state test
payload-bearing Browse.render | domeffect | out | env.renderDestination@S5 | #browse@S5 | L2 | per-gesture | F5 payload test
overlay resolve+render+unhide | domeffect | out | env.renderDestination@S5 | overlay el@S5 | L2 | per-gesture | F5 overlay test
incoming-NP np-locked unlock | domeffect | out | env.renderDestination@S5 | document.body@S5 | L2 | per-gesture | np-locked test
outgoing-NP np-locked unlock | domeffect | out | start()@S5 | document.body@S5 | L3 | per-gesture | np-locked test
outgoing capture before render | ordering | out | buildConstruction@S5 | buildConstruction@S5 | L1 | per-gesture | F7 reorder test
revealBase snapBrowse(true) | ordering | out | start()@S5 | start()@S5 | L3 before L1 | per-gesture | F7 precede test
takeRowHold Browse hold | ordering | out | start()@S5 | start()@S5 | L3 before L1 | per-gesture | F7 precede test
freezeArt data-art strip pre-mount | domeffect | out | ghostApp/snapshotHome@S5 | clone imgs@S5 | L1 | per-gesture | freezeArt test
.nav-ghost wrapper contract | domcontract | out | ghostWrap@S5 | clone wrapper@S5 | L1 | per-gesture | nav-ghost test
initial mover parking transform | domeffect | out | start()@S5 | movers@S5 | L3 | per-gesture | parking parity test
no will-change on real panes | domcontract | out | start()@S5 | #home/#browse@S5 | L3 | per-gesture | will-change test
d.live=true | object | out | start()@S5 | start()@S5 | L3 | per-session | trivial
```

## 5. Observable-effect ownership table

Every observable effect of the replaced callees — `showAppView(desc, render)` (app.js:550–558) and the
overlay branch (app.js:632–638) — enumerated and assigned to exactly one layer, with predecessor/
successor ordering preserved. **All three layers are admissible;** an effect is app-owned by design
choice here, not by an external rule, except where noted.

| Effect | Owner | Inputs | Predecessor | Successor | App-owned by | Detects omission/reorder |
|---|---|---|---|---|---|---|
| Stale settings-overlay cleanup (555) | L2 | `d.from.v` | outgoing capture done | host park/hidden | this design (rides with render) | F5 stale-overlay test |
| `#home` un/park, `#browse` hidden toggle (556–557) | L2 | dest kind | stale cleanup | Browse.render | this design | F5 host-state test |
| Payload-bearing `Browse.render(desc)` (557) | L2 | `dest` (full desc) | host toggles | incoming mover build | Stage-7 boundary (policy) | F5 payload test |
| Overlay resolve `overlayEl(toV)` (633) | L2 | `dest.v` | outgoing capture done | overlay render | this design | F5 overlay test |
| Overlay content render `renderNowPlaying`/`renderScreen` (634–635) | L2 | `dest.v` | overlay resolve | unhide | Stage-7 boundary (policy) | F5 overlay test |
| Overlay unhide `classList.remove('hidden')` (636) | L2 | overlay el | overlay render | incoming mover build | this design | F5 overlay test |
| Incoming-NP `np-locked` unlock (634) | L2 | — | `renderNowPlaying` | unhide | this design | np-locked test |
| Outgoing-NP `np-locked` unlock (645) | L3 | `plan.decorations` | pill built | mover parking | stays app-side, `plan.decorations` (policy) | np-locked test |
| Pill clone construction (npPillClone, 351–354) | L1 | `env.navPill` | — | returned as decoration mover | this design | npPillClone test |
| Owned-pane clone+capture (ghostApp/snapshotHome) | L1 | `env` | Browse hold taken | (ghost) render callback | this design | recipe tests |
| Decoration insertion into body (354) | L1 | `env.document.body` | pill clone | return | this design | npPillClone test |
| Abort restoration metadata `d.clobbered` (630) | L3 records / L1 computes | source resolution | source resolved | finalize reads | stays session-field (finalizer, policy) | F6 abort test |

The callback does **not** own the entire transition: L1 owns element resolution, clone/capture, and
ordering; L3 owns geometry, assembly, and session recording. Only render + host-visibility + overlay
content live in L2.

## 6. Ordering contract

The proven invariant is outgoing-capture-before-clobbering-render; the rest is the existing
transition-specific order, not a new universal one. Required order:

1. **Session live** — `d.live = true` (L3).
2. **Reveal snapshot** — `revealBase = snapBrowse(true)` (L3), before any render that can clobber `#browse`.
3. **Browse hold** — `takeRowHold()` (L3), before that render.
4. **Outgoing fully captured** — L1 builds the outgoing representation (app-ghost clone + capture, or the
   borrowed-real source element) to completion.
5. **Only then** may L1 invoke `env.renderDestination`, which may clobber `#browse` (the browse→browse
   flash guard: the ghost must snapshot the pre-render `#browse`).
6. **Existing transition-specific order** for the rest: destination resolution → content render →
   visibility change → incoming-mover creation → decoration assembly (e.g. an overlay destination
   resolves `overlayEl(toV)` before rendering and unhiding it, app.js:633–637). The requirement pins
   step 5, not a reinvented universal order.
7. **Mover state ready before first drag** — L3 maps movers, computes `base`, assembles `d.movers`, and
   parks them (transform) before `move()` (app.js:657) can run.
8. **Abort metadata recorded before finalization** — L3 sets `d.clobbered` from the return before
   `start()` exits, so the finalizer never reads an unset field.

Correctness requirements: steps 2–5 and 8 (a wrong order flashes or reads an unset abort field).
Incidental: the intra-step 6 micro-order between sibling overlay operations is transition-specific
parity, preserved but not newly invented.

## 7. Runtime dependency policy

Relocated runtime code reads **no** ambient `document`, `window`, `Element`, `$`, or `getComputedStyle`
outside the declared `env`. Top-level module evaluation stays DOM-free (the `require()` no-DOM gate,
contract-function-gate.test.js). Chosen access route for each dependency:

| Dependency | Route |
|---|---|
| `.app` (app-ghost source) | `env.document.querySelector('.app')` |
| `#home` (home-snapshot source) | `env.document.getElementById('home')` |
| scroll position (`ghostY`) | `env.scrollY()` — narrow accessor (a viewport value, not a node) |
| `Element.prototype.getAnimations` feature check | `env.document.defaultView.Element` (the injected document's window) |
| computed page background (`GHOST_BG`) | resolved **fresh per gesture** inside the recipe via `env.document.defaultView.getComputedStyle(env.document.documentElement)`, same `try/catch`→`var(--bg)` fallback; **no cache**, so a mid-session theme change cannot make it stale (F8) |
| body insertion | `env.document.body.appendChild` |
| stale ghost / stale pill removal | `env.document.querySelectorAll(...).forEach(remove)` |
| real source element (overlay vs in-flow) | `env.sourceEl(sourceHost, v)` — app-side wrapper over `Nav.overlayEl`/`Nav.appViewEl` bound to the live document |
| Now Playing pill source | `env.navPill()` |
| destination render + host | `env.renderDestination(dest, destinationHost)` — returns the rendered host element |

`env` shape:

```ts
type Env = {
  document: Document;
  scrollY(): number;
  sourceEl(sourceHost: 'overlay' | 'in-flow', v: string): Node;
  navPill(): Node;
  renderDestination(dest: Descriptor, destinationHost: 'overlay' | 'browse-host'): Node;
};
```

`renderDestination`'s `destinationHost` parameter is correctly **narrower** (`overlay | browse-host`) than
the classification field's set (`overlay | browse-host | home`, §3): a `home` destination has
`plan.renderDestination === 'none'` (swipe.js:128) and is built as a `home-snapshot`, so L2 is **never**
invoked for a `home` destination and the `home` value cannot reach this signature (F3-r).

`GHOST_BG` is the only value that was a top-level closure constant; resolving it fresh per gesture (not
cached) removes the top-level DOM read and the staleness question together. No other relocated value is
cached; there is no cache owner or invalidation policy to define.

## 8. Coverage and mutation matrix

Every blocking finding and named parity obligation maps to at least one production-facing test, each
with the mutation that must redden it. Layers: recipe = jsdom unit test of a moved builder; wiring =
app-harness driving the real `start()`; contract = the exact-key gate; frozen-model = the independent
spec (`test/fixtures/swipe-plan-spec.mjs`) checked per registry pair by `test/swipe-transition.test.js`;
regression = parity.

| # | Behavior proved | Fixture/transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| F1a | Production movers keyed `{el, base, own}` after L3 maps | browse-dest swipe | builder emits `el`/`own` directly, or L3 forgets a key | wiring |
| F1b | Outgoing `base===0`, incoming `base===±d.w` (signed) | back vs forward swipe | wrong `base` owner or wrong sign | wiring |
| F1c | No owned-pane ⇒ `capture===null`, `d.ghostY` untouched | overlay↔overlay | conflicting capture shape (capture per-mover) | wiring |
| F2 | `classifyTransition` keys = `['decorations','destinationHost','fromKind','sourceHost','toKind']` in BOTH `contract-function-gate.test.js:24` and `swipe-transition.test.js:57`; `constructionPlanFor` unchanged | contract | stale exact-key registration in either pinning site (host fields emitted, a gate not updated) | contract |
| F1-r | The host **VALUES** are pinned in the frozen spec, not just the keys: `STRUCTURAL_CASES` (swipe-plan-spec.mjs:45–54) gains an expected `sourceHost`/`destinationHost` per case, and the every-registry-pair proof (`swipe-transition.test.js` line 90) asserts them against the projected classification, so the frozen-model guard extends to the two new fields it did not before | all 8 structural cases + the 132 registry pairs | a mis-projected host value — e.g. a `home` source mapped to `overlay`, or a settings-sub mis-hosted — passes the exact-key gate but **disagrees with the frozen spec** and reddens the per-pair proof | contract / frozen-model |
| F2-r | A back-to-home transition records `animSync`/`animRes` with `d.ghostY` left **untouched** (parity with today); an app-ghost transition records all three | back→home vs browse→browse | L3 synthesizes `d.ghostY` (`undefined` or `0`) on the home path, where today it is never assigned | wiring |
| F4a | Recipes read `.app`/`#home`/scroll through `env`, drivable with no ambient `document`/`window` | fake-env recipe | a bare `document`/`window`/`$` read | recipe |
| F4b | `copyAnimPhase` syncs with **no global `Element`** but `env.document.defaultView.Element` present | fake-env recipe | ambient `Element` check silently returns 0 (phase sync bypassed green) | recipe |
| F5a | Payload descriptor reaches L2 render intact | `authorBooks`/`files` dest | payload descriptor lost (only `v` passed) | wiring |
| F5b | Overlay transition preserves resolve+render+unhide+incoming-`np-locked` | back→NP overlay | any old overlay-branch effect omitted | wiring |
| F5c | Browse-host transition with a **stale settings overlay present** → correct final `#home`/`#browse`/overlay `parked`/`hidden` | stale-overlay browse swipe | stale-overlay cleanup dropped | wiring |
| F6 | browse→browse abort re-renders source under ghost | browse→browse abort | `d.clobbered` not recorded | wiring |
| F7a | Render moved before outgoing capture reddens | browse→browse | `env.renderDestination` invoked before `ghostApp()` completes | wiring |
| F7b | `revealBase` + Browse hold precede the clobbering render | browse→browse | hold/reveal moved after render | wiring |
| F8 | No ambient DOM at module load; `GHOST_BG` resolves through `env` | `require()` no-DOM + recipe | top-level `GHOST_BG` DOM access | recipe |
| npPill | Pill recipe removes stale `.np-pill-float`, strips ids, adds class, appends, yields correct `slot`/`owned-decoration` | NP swipe | `npPillClone` behavior omitted | recipe |
| npLock | Incoming- and outgoing-NP transitions preserve `np-locked` removal | NP in/out | `np-locked` behavior lost | wiring/regression |
| freezeArt | Both recipes strip `img[data-art]` **before** live-document connection | both recipes | `freezeArt` moved after live connection | recipe |
| navGhost | `.nav-ghost` wrapper: fixed full-viewport, beneath bars, non-interactive, clipped, page bg, transform-capable | recipe | `.nav-ghost` behavioral contract broken | recipe |
| willChange | Real `#home`/`#browse` movers gain **no** new `will-change` | any real-mover swipe | a real in-flow mover promoted (nudges iOS navbar) | regression |
| parking | Initial mover parking retained or shown redundant (`move()` overwrites same tick, no paint between) | any swipe | — (parity only; retained) | regression |

## 9. Records reconciliation (APPLIED on ratification, 2026-07-22)

The three conflicting records were scrubbed to boundary B on ratification (StandardsDocument §6.6):
- **`PLAN-swipe-reveal.md` §7 step 5** → rewritten to "Move the two capture recipes + real source
  resolution + the NP decoration builder into `swipe.js` behind an injected `env` (boundary B); the
  destination render dispatch and Browse hold stay in `app.js` until stages 6/7," pointing at this
  sub-plan. **Applied.**
- **`js/swipe.js` header (lines 24–27)** → the five-builders-plus-render list replaced with: Stage 5 moves
  `ghostApp`/`snapshotHome`/`npPillClone` + `overlayEl`/`appViewEl` source resolution; `renderScreen`/
  `renderNowPlaying`/`Browse.render` and the Browse hold stay in `app.js` until stages 6/7. **Applied**
  (a comment-only change; no code behaviour changes).
- **DecisionLog** → F0 settled to B; recorded that `sourceHost`/`destinationHost` are carried and read by
  `buildConstruction` (honouring 2026-07-21), host selection carried not derived (§3, F3), and the four
  OPEN stage-5 decisions (F0/F1/F3/F6) closed by the approved plan. **Applied.**

## 10. Sequencing and later-stage ownership

Stage 5 (B) rests only on Stage 4 (shipped `classifyTransition`/`constructionPlanFor`) and the frozen
model. It does not gate, and is not gated by, later stages:
- **Stage 6** owns `release()`/`dispose()`/`equivalence`, the finalization/reveal path, and the
  normalized `sameBrowseHost` — all left in `app.js`/deferred by B (§2).
- **Stage 7** owns `Browse.render`/`Browse.beginHold` — left in `app.js` behind `env.renderDestination`
  and the untouched hold. B stops at this boundary so Stage 7 redesigns Browse coupling in one module
  without unwinding a Stage-5 move.

## 11. What this does NOT do

- Does not move the Browse hold or redesign the render dispatch into the lease interface (Stage 7).
- Does not add pane lifecycle methods or the I8 equivalence fields (Stage 6).
- Does not introduce the normalized `sameBrowseHost` (Stage 6).
- Does not change the finalize/settle/reveal path, the diagnostics, or any behavior — parity is the bar;
  the flash bug is untouched (independent of this extraction).
