# Plan review — PLAN-swipe-stage5.md ("resolve the five Stage-5 questions; scope B")

Type: plan-review

<!-- value-crossing-ledger source=js/app.js ranges=345-356,368-496,564-580,588-650 callees=550-558 -->

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (Vitruvius's resolution of F0/F1/F3/
F6 + F2/F4/F5 from `Claude/Charpy/PLAN-swipe-reveal-stage5-2026-07-22.md`). Grounded against HEAD:
`js/swipe.js`, `js/nav.js`, `js/app.js`, `test/contract-function-gate.test.js`, `test/app-harness.js`.
Traced every value crossing the construction block; each claim held to the tightest bound the code
gives, checked by an independent adversarial read and an external review before filing.

## Verdict

**TEMPER** — fix-then-build. Scope B is the right boundary and was checked against later-stage
ownership; the capture-helper cluster has no consumers outside the two recipes; the no-session
return-capture direction is right; the lifecycle deferral (§5) correctly avoids the dead-field trap;
and `buildConstruction` as `NON_CONTRACT` is sound. The defect is the **seam specification**, not the
chosen boundary. **Seven things** to settle before a line is written (F1, F2, F4, F5, F6, F7, F8); F3
is a non-blocking recommendation, and preserving the `np-locked` unlock when `npPillClone` moves is a
coverage requirement (the plan already keeps `np-locked` in app.js, §3:80), not a blocker. None
shatters scope B.

## Defining records

The authorities that specify Stage 5, reconciled — verdict: **CONFLICT (unchanged at HEAD), with this
sub-plan as the proposed resolution to B**:
- **`PLAN-swipe-stage5.md`** (this sub-plan) — scope B; the artifact under review.
- **`PLAN-swipe-reveal.md` §7 step 5** — still reads the ambiguous one-line "move pane builders
  unchanged" step (F0 characterized its narrow reading as boundary A). To be rewritten to B on approval (§8).
- **`js/swipe.js` header, lines 24–27** — still lists boundary C. To be rewritten to B on approval (§8).
- **DecisionLog 2026-07-21** — promises `sourceHost`/`destinationHost` reintroduced with a reader;
  the plan chose to carry them (§4). To be settled to B on approval (§8); whether the carry earns its
  contract cost is F3 (a recommendation, the plan already chose).
- **`PLAN-swipe-reveal-stage5-2026-07-22.md`** (the prior review) — treats the abort-rerender as
  stage-6 (`sameBrowseHost`). Reconciled: `d.clobbered` (app.js:630) is the live stage-5 carrier of the
  same-browse-host condition; `sameBrowseHost` is its planned stage-6 normalized replacement — same
  semantics, later staging (F6).

The prior records still conflict at HEAD; the plan correctly defers their scrub to approval (§8,
StandardsDocument §6.6). That deferral is proper, not a finding.

## Value-crossing ledger — every value in/out of the moved construction surface

Enumerate every value the moved code reads (input) and writes (output) — object, geometry, closure
constant, DOM side effect, free identifier, ordering precondition — and name its owner in the new seam.
A value with no owner is a finding. Ranges: `npPillClone` app.js:345–356, `GHOST_BG`+helpers+`ghostApp`
368–496, `snapshotHome` 564–580, `start()` construction 588–650.

| Value | Class | Dir | Today (app.js) | Owner under the plan as written | Finding |
|---|---|---|---|---|---|
| `d.from` / `d.dest` (identity + payload) | object | in | 592, 622/633, 629 | **none** — `plan` carries no `v`/`desc` | F5 |
| `d.from.v` / `d.dest.v` (`fromV`/`toV`) | object | in | 622, 630, 633, 635 | **none** — env callbacks need it, unsourced | F5 |
| `isOverlay(fromV)` (`fromOv`) | free id | in | 593, feeds 622/630 | `Nav` (already imported, swipe.js:34) | F5/F6 |
| `d.dir`, `d.w` (→ `off`) | geometry | in | 592 | unresolved — crosses the seam only if the builder computes `base` | F1 |
| `window.scrollY` (→ `ghostY`) | geometry | in | 486 (function body) | ambient global outside `env`; route through env | F4 |
| `document.querySelector('.app')` (app-ghost source) | DOM read | in | 471/492/494 | read via bare `document`; reachable via `env.document` but no dedicated owned-pane resolver named | F4 |
| `$('home')` (home-snapshot source) | DOM read | in | 565/575/577 | read via bare `$`; no owned-pane resolver named | F4 |
| `Element` (feature-detect global) | ambient | in | 420 | ambient; route through env | F4 |
| `navPill()` (pill source) | DOM read | in | 345/351 | `env.navPill()` (§3) | cov |
| `GHOST_BG` (`getComputedStyle` init) | closure const | in | 368–371, used 467 | **unassigned** — plan does not say who owns the ghost background | F8 |
| clone build + mount (`createElement`/`appendChild` to body) | DOM effect | out | 465/489–491, 568–574, 351–354 | `env.document` / `env.document.body` (§3) | — |
| `.np-pill-float` stale-clone removal | DOM effect | out | 350 | `env.document` (§3) | cov |
| `d.movers` shape `{el, base, own}` | object | out | 620–650 | plan says `{element, base, ownership, capture}` | F1 |
| `d.ghostY` / `d.animSync` / `d.animRes` | object | out | 487, 495, 578 | `capture` — but contract stated two ways | F1 |
| `d.clobbered` (same-browse-host carrier) | object | out | 630, read 1260/1286 | **unassigned** — plan doesn't say recompute-in-start() or return-as-metadata | F6 |
| `document.body` `np-locked` removal | DOM effect | out | 634 (incoming NP), 645 (outgoing NP) | 634 → `renderDestination` (F5); 645 → app.js via `plan.decorations` | F5/cov |
| outgoing-ghost capture **before** dest render | ordering | out | 604–605, 620→629 | unstated — plan says only "relative to the ghost" | F7 |
| `revealBase = snapBrowse(true)` | ordering | out | 590 (pre-render) | must precede any clobbering render; unstated | F7 |
| `takeRowHold()` (Browse hold) | ordering | out | 591 (pre-render) | must precede any clobbering render; unstated | F7 |
| `d.live = true` | object | out | 589 | stays in `start()` (trivially) | — |

## Findings

### F1 — Structural — open-unknown — the return contract is stated two ways and cannot produce `base`

Three parts of one contract the plan must pin:
1. **Field-name mapping.** `buildConstruction` returns panes keyed `{ element, base, ownership,
   capture }` (§5), while production `d.movers` are `{ el, base, own }` (app.js:620–646), read across
   drag/settle/teardown/reveal (654, 675, 708, 716, 795–798, 1313). The plan states the returned
   element "participates in the production mover set ... NOT as a `d.movers` internal" (§7), i.e.
   `start()` assembles `d.movers` from the builder's return, and §10 keeps the finalize path — so this
   is not a rewrite of that path. But the mapping is unstated: does `start()` translate
   `element`→`el`, `ownership`→`own`, or does the builder return the production keys directly? The plan
   must state the adaptation so the builder and `start()` agree on the field names.
2. **`base` and its geometry.** `base` is the pixel position `0` or `off = d.dir==='back' ? -d.w :
   d.w` (app.js:592), and consumers depend on the number (`if (m.base)` 654; `m.base === 0` 708).
   Today `start()` computes `off` before building movers, so viewport width/direction cross into the
   builder only if `buildConstruction` is the layer that computes `base`. The plan must decide the
   owner: `start()` attaches `base` after the builder returns element+capture (width never crosses the
   seam), or the builder receives a signed offset/width-and-direction. It cannot compute a pixel `base`
   from `{plan, env}` as specified, and cannot emit a semantic one without breaking 654/708.
3. **`capture` shape.** §3 signatures it top-level `{ movers, capture }`; §5 puts `capture` on every
   mover. In the current matrix at most one owned-pane produces capture per transition — `app-ghost`
   requires a browse destination and `home-snapshot` a home destination (swipe.js:124–129), so they
   are mutually exclusive, and borrowed-real movers and the pill produce none. There is no multi-pane
   merge to define. The plan must state one canonical shape: is `capture` aggregate construction
   metadata, or metadata attached to the sole owned capture pane — and what `capture` is when no
   owned-pane is built (overlay↔overlay)? Absent-field semantics, not merge semantics.

### F2 — Structural — requirement — host fields change at least one pinned exact-key contract and are unreachable through the seam as routed

Emitting `sourceHost`/`destinationHost` (§4) changes `classifyTransition`'s exact-key contract, which
the gate pins to exactly `['decorations','fromKind','toKind']` (contract-function-gate.test.js:24); its
registration must update in the same commit. Whether `constructionPlanFor`'s contract also changes
depends on routing: if the fields are forwarded through its output, its input/output contract and gate
registration (line 30) change too; if the classification is passed to `buildConstruction` separately,
`constructionPlanFor`'s key set need not change. Either way there is a reachability gap:
`buildConstruction` receives `plan` (constructionPlanFor output, swipe.js:137), which does not carry
the host fields `classifyTransition` emits, so as routed they never reach their stated consumer. The
plan must pick one route — forward through `constructionPlanFor`, pass the classification separately, or
derive host selection in construction (F3) — and update whichever registration that route touches. §6
says the functions "remain contract functions" without noting the registration change.

### F3 — Weak — recommendation — document why the derived host projection earns its contract cost

The plan has already chosen to carry `sourceHost`/`destinationHost` and says construction reads them to
resolve real elements and destination hosts (§4); scope B is grounded in keeping construction decisions
and execution together. That is a legitimate design: exposing a derived host vocabulary that
construction reads directly centralizes kind→host mapping in the normalization boundary and stops the
impure builder reinterpreting `fromKind`/`toKind`. Struck against the code the fields are derivable from
the classification — the source resolver splits overlay-vs-in-flow (`overlayEl`/`appViewEl`,
nav.js:35–36), so `sourceHost` is a projection of `fromKind`, and destination handling is already
carried by `plan.incoming`+`plan.renderDestination` — but derivability does not make a consumed field
dead, and no project rule forbids derived contract fields. So this is not a blocker: the plan should add
one sentence stating the architectural benefit (mapping policy centralized in classification) that
justifies carrying both `kind` and `host` in the exact-key contract. It becomes blocking only if the
planner switches to deriving host selection while resolving F2, which would remove the fields.

### F4 — Structural — requirement — the relocated recipes read external DOM directly; the seam must route all of it through `env`

The moved recipes reach outside their arguments for live DOM that the plan's `env` does not name:
`window.scrollY` for `ghostY` (app.js:486), the ambient `Element` global for a feature check
(`copyAnimPhase`, app.js:420), and — the clone SOURCES themselves — `document.querySelector('.app')`
for the app-ghost (app.js:471) and `$('home')` for the home-snapshot (app.js:565). None of these currently go
through `env`: the recipes read bare `document`/`window`/`Element`/`$`. The plan provides `env.document`
(§3), so `.app`/`#home` are reachable via `env.document.querySelector`/`getElementById` — but the plan
names no dedicated owned-pane source resolver (its `env.sourceEl(kind,v)` serves the borrowed-real path
only) and never states that the relocated recipe bodies must route their reads through `env` rather than
the bare globals they use today. These are runtime function-body reads, so they do not
break module load (that is F8) — but a module whose recipes read `window`/`Element`/`document`/`$`
directly is not the env-injectable seam the extraction promises, and recipe tests cannot drive it
through a fake `env`. The `Element` read is the sharpest: `copyAnimPhase` early-returns `0` when
`Element` is undefined (app.js:420), so a test that supplies a DOM through `env.document` without a
global `Element` constructor silently disables animation-phase sync — the load-bearing `.207` parity
fix goes untested while the test passes green. The plan must specify whether the recipes resolve these
through `env.document` directly (e.g. `env.document.querySelector('.app')`,
`env.document.getElementById('home')`, `env.document.defaultView.Element` / `.scrollY`) or through
narrow injected accessors — either is admissible; bare `document`/`window`/`Element`/`$` reads are not.
(Viewport width is left to F1 — it crosses the seam only under the branch where the builder computes
`base`.)

### F5 — Structural — open-unknown — the seam has no source/destination descriptor identity, and render-callback ownership is vague

`buildConstruction(plan, env)` is given only `plan` and `env`, but its callbacks are declared
`env.sourceEl(kind, v)`, `env.destOverlayEl(v)`, `env.renderDestination(host, desc)`. Neither `v` (the
screen name) nor `desc` (the descriptor with payload) exists in `constructionPlanFor` output
(swipe.js:137). So as specified the function cannot identify which source/destination overlay to resolve
(app.js:622/633 need `fromV`/`toV`), cannot render an `authorBooks`/`files` destination with its
required payload (swipe.js:58; `Browse.render` takes the full `desc`, app.js:557/2892), and cannot
invoke its callbacks per their declared signatures. Two things the plan must state: (1) where canonical
`from`/`to` identity enters `buildConstruction`, without creating independently-supplied raw identity
and derived classification that can disagree (a two-source-of-truth hazard); and (2) the **complete**
host-state transition `env.renderDestination(host, desc)` owns — not merely "performs the render." The
function it replaces, `showAppView(desc, render)` (app.js:550–558), performs a cluster of side effects
the callback signature would satisfy while silently dropping: hiding stale settings overlays except the
active outgoing one (`$(s).classList.add('hidden')`, 555), un/`parked`ing `#home` (556–557), toggling
`#browse` `hidden` (556–557), then optionally `Browse.render(desc)` (557) — and for an overlay
destination the branch resolves `overlayEl(toV)`, calls `renderNowPlaying`/`renderScreen`, unhides it
(`el.classList.remove('hidden')`, 636), and removes `np-locked` for incoming NP (634). The plan must
specify that `renderDestination` owns the whole destination-host transition — stale-overlay cleanup,
`#home` parking/visibility, `#browse` visibility, payload-bearing rendering, overlay rendering and
unhiding, and the destination-coupled `np-locked` removal that stays in `app.js` — or a planner can
satisfy the signature by moving only the content render and drop the host-state effects.

### F6 — Structural — open-unknown — the plan must assign ownership of the live `clobbered` carrier

Today the browse-host branch sets `d.clobbered = !fromOv && appViewEl(fromV) === $('browse')`
(app.js:630) — destination rendering into the real `#browse` while the source is also the real
`#browse` — and finalization reads it on abort: `if (!commit && cur.clobbered)` (app.js:1260) and
`applyScreen(dest, { render: cur.clobbered, resetScroll: false })` (app.js:1286), re-rendering the
source under the covering ghost on a browse→browse abort. `d.clobbered` is the current operational
carrier of the same-browse-host condition (Stage 6 replaces it with the normalized `sameBrowseHost` —
same semantics, later staging), initialized `false` at begin() (app.js:541). Scope B moves the
host-resolution logic that participates in computing it (`fromOv = isOverlay(fromV)`, `appViewEl(fromV)`),
but the plan does not say whether `d.clobbered` is recomputed in `start()` or returned as construction
metadata. The finalizer still reads the session field, so a gap where neither owner produces it is not
acceptable. The plan must assign ownership: `start()` recomputes and sets it (the render dispatch it sits
beside stays in app.js, §2/§3, so this is natural), or `buildConstruction` returns it as construction
metadata (e.g. `{ sourceWasClobbered }`) that `start()` records — either is admissible, but the plan
must choose one.

### F7 — Structural — requirement — the outgoing-capture-before-clobbering-render invariant is unstated

The central browse→browse construction order is that the outgoing app-ghost must be fully captured
before the destination render overwrites `#browse` — the code builds the ghost first (app.js:620) then
renders the destination (629), with the comment stating the ghost "must snapshot the current `#browse`
BEFORE the incoming render clobbers it" (604–605). If the impure builder invokes `env.renderDestination`
before `ghostApp()` completes, it snapshots the destination instead of the source. §3 says only that the
callback allows ordering "relative to the outgoing ghost"; it does not state which order is required.
The plan must fix the proven invariant as a seam requirement:
1. `start()` captures `revealBase` (`snapBrowse(true)`, app.js:590);
2. `start()` acquires the Browse hold (`takeRowHold()`, app.js:591);
3. construction completes the outgoing representation, including clone + capture;
4. only then may it invoke any destination-render callback that can clobber `#browse`;
5. after outgoing capture completes, destination resolution, rendering, visibility changes,
   incoming-mover creation, and decoration assembly must preserve their **existing transition-specific
   ordering** (e.g. an overlay destination resolves `overlayEl(toV)` before rendering and unhiding it,
   app.js:633–637) — the requirement pins outgoing-capture-before-clobber, not a new universal order.

And it must be mutation-tested: moving the render ahead of the outgoing-ghost capture must redden a
test — the exact browse→browse flash this subsystem exists to prevent.

### F8 — Structural — open-unknown — `ghostWrap`'s `GHOST_BG` dependency is unassigned and violates the plan's own no-top-level-DOM seam

`ghostWrap` reads `GHOST_BG` (app.js:467), which is initialized at closure-init by an immediately-invoked
function calling `getComputedStyle(document.documentElement).getPropertyValue('--page-bg')`
(app.js:368–371). The plan's relocation list — the four capture helpers plus the state
`lastAnimResidual` (§3:82) — does not include the `GHOST_BG` initializer, nor say who owns the ghost
background in `swipe.js`; the dependency is unassigned. This is an
architectural / module-boundary defect, not a demonstrated runtime failure: the initializer is wrapped
in `try/catch`, so it does not necessarily break, and the caught fallback in a Node process says nothing
about the browser runtime. The defect is that moving the initializer unchanged introduces exactly the
top-level `document` reference the plan's §6 forbids ("no top-level `document`/`window` reference is
introduced"), making the module's external dependency ambient rather than routed through `env`. The plan
must assign the dependency: inject the background, resolve it lazily inside the recipe via
`env.document.defaultView.getComputedStyle`, or cache it on the first runtime construction call — not
move the `GHOST_BG` initializer to `swipe.js` unchanged.

## Coverage the plan must require

Once the seam is specified, the revised plan owes production (app-harness/recipe) tests, each
mutation-verified, that prove the primary seam shape and routing — not only the later-discovered effects:
- **F1** — production mover keys remain `{ el, base, own }`; outgoing `base` is `0`, incoming `base` the
  signed pixel offset `±d.w`; a transition with no owned pane yields the defined no-capture value.
- **F2** — the contract-function gate's exact-key registrations reflect whichever host-field routing the
  plan selects (the registrations at contract-function-gate.test.js:24/30 make this concrete).
- **F4** — the recipes read every external DOM value (scroll, the `Element` feature-check, and the
  `.app`/`#home` clone sources) through an injected `env`, not bare globals, provable by driving a fake
  env with no ambient `document`/`window`. Specifically run `copyAnimPhase` with NO global `Element`
  but with `env.document.defaultView.Element.prototype.getAnimations` available, and prove phase copying
  still occurs — guarding the `.207` parity from silent bypass (a `0`-return that passes green).
- **F5** — a payload-bearing destination (`authorBooks`/`files`) reaches the render callback with the
  correct descriptor; overlay rendering preserves its visibility change (`classList.remove('hidden')`);
  and a browse-host transition **with a stale settings overlay present** asserts the resulting
  `#home`/`#browse`/overlay class state (`parked`/`hidden`) after `renderDestination`, proving the
  callback owns the full host-state transition, not only the content render.
- **Moved decoration recipe (`npPillClone`)** — the relocated builder removes stale `.np-pill-float`
  (app.js:350), strips descendant IDs (352), adds `np-pill-float` (353), appends the clone (354), and
  yields the correct outgoing/incoming `base` and `owned-decoration` ownership; current recipe tests
  cover only app-ghost and home-snapshot, so the moved pill builder is otherwise unproven.
- **np-locked (regression, not a blocker)** — both incoming- and outgoing-NP transitions preserve the
  existing `np-locked` removal while only `npPillClone` relocates (the plan already keeps `np-locked` in
  app.js, §3:80; `start()` retains `plan.decorations`, app.js:600/645).
- **F6** — a browse→browse abort preserves the `clobbered`/same-host carrier and re-renders the source
  under the ghost, under whichever owner the plan assigns.
- **F7** — the outgoing ghost is captured before any render that can clobber `#browse` (reordering
  reddens); `revealBase` and the Browse hold precede that render.
- **F8** — no ambient DOM access at module load; the ghost background resolves through the chosen seam.

## Prediction — where this breaks in execution if built as written

The builder relocates the recipes and hits the walls the plan left standing. It needs `fromV`/`toV`/
`desc` to call `env.sourceEl`/`renderDestination`, finds them nowhere in `plan`, and threads raw
identity in beside the classification — the two-source hazard (F5). `d.movers` transforms read
`m.el`/`m.base` while it was handed `element`/`base`, so it invents the mapping and decides the geometry
owner mid-build (F1). If neither owner is assigned for `d.clobbered`, the finalizer reads a session field
nobody set and a browse→browse abort renders with `render:false` (F6). And — worst — if the builder
calls the render callback before finishing the ghost, the browse→browse ghost snapshots the destination
and the page flashes on settle, the exact bug this subsystem exists to kill (F7). Separately, and not a
runtime loss but a boundary violation: relocating the `GHOST_BG` initializer unchanged makes `swipe.js`
carry an ambient top-level DOM reference the plan's own §6 forbids (F8). Each is a value, order, or
dependency crossing the old construction block the plan did not trace; each is visible now, in the code.

## What passes temper

Scope B is sound and was checked against later-stage ownership: the render dispatch (app.js:557) and
Browse hold (app.js:339) it leaves in app.js are stage-7 surfaces, and `renderBrowse` is already
injected into Nav (app.js:2892). The capture-helper cluster has no consumers outside the two
capture recipes: the four helper functions (`ghostWrap`/`freezeArt`/`copyScroll`/`copyAnimPhase`) serve
both `ghostApp` and `snapshotHome` and nothing else (app.js:480/567, 489/570, 492/575, 494/577), and
`lastAnimResidual` is cluster state written by `copyAnimPhase()` and read only by those recipes
(495/578) — so the cluster has no outside consumer and can relocate as a unit. The no-session return-capture direction is the right decoupling. The lifecycle
deferral (§5) correctly withholds `release()`/`dispose()`/`equivalence` until stage 6. And
`buildConstruction` as `NON_CONTRACT` is correct: the gate's immutability loop runs on `CONTRACT` only
(contract-function-gate.test.js:58). The step is buildable once the seam is fully specified — every value
and order in the ledger given an owner (F1, F2, F4, F5, F6, F7, F8), with F3's one-sentence justification
and the `np-locked` regression test on top.
