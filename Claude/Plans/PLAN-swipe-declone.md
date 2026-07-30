# PLAN — retire the swipe clone: move the real views

**The decision.** The swipe stops building a copy of the page. Every transition moves the **real**
view elements. `ghostApp()` and everything that exists to make a copy resemble the original are
deleted.

**The cause.** `ghostApp()` (js/swipe.js:279) clones `.app` and then strips every id
(swipe.js:290). Inside the copy no id-keyed rule matches, so the cloned `#home`/`#browse` loses its
`position:fixed` inset box (css:126-136 / css:176-184) and falls to normal flow. The copy therefore
lays out in a **different box** than the original. Three device-reported symptoms are that one
non-identity, seen three ways: a 7px content-top gap patched with a hand-tuned `53px` constant
(swipe.js:289); a second moving page background (fixed at build `.273`); and the carousel heading
changing size at swipe start, reflowing the page.

**Why this is smaller than it looks.** Every view in this app is **already** a `position:fixed`
inset own-scroll box — `#home` (css:126), `#browse` (css:176), `#options` (css:205), the five
settings subs (css:771), `#nowplaying` (css:496). They share one geometry. Stage 6i already proved
the no-clone path by making `→home` move the real `#home`, and `→home` is the one direction the user
reports clean. Of the four transitions that still clone, **three have two distinct real elements
already sitting in the DOM** and need no new architecture at all. Only `browse→browse` genuinely
needs a structural change, because its source and destination share the `#browse` host.

<!-- vitruvius-gate {"plan_type":"refactor",
  "patterns":{"boundary_relocation":true,"callee_replacement":true,"contract_shape":true,"state_transfer":true,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/swipe.js:134-166","js/swipe.js:179-188","js/swipe.js:190-325","js/swipe.js:334-386","js/app.js:478-486","js/app.js:503-566","js/app.js:1187-1236","js/nav.js:45-95","css/app.css:86-103","css/app.css:160-185","js/browse.js:60-80","js/browse.js:204-320","js/browse.js:640-660"],
  "callee_ranges":["js/swipe.js:259-313"],
  "affected_contracts":["test/fixtures/swipe-plan-spec.mjs:1","test/ghost-clone-geometry.test.js:1","tools/mutate.mjs:1"],
  "staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Zelda/Board.md","Claude/Decisions/DecisionLog.md"],
  "blocking_questions":["NOGHOSTINFLOW","HOMESTAYSLIVE","PAGEISVIEW","NOGHOSTATALL","ABORTNORENDER","NOAPPCLONE"]} -->

Status: **PLAN_READY — not reviewed.** Two stages. Stage 1 removes the clone from three of the four
transitions and from every Home-originating swipe (where the reported reflow lives); it is a
classification change plus one park exemption. Stage 2 removes it from `browse→browse`, which
unlocks the deletions and the gate.

## Index

1. Defining records and authority
2. Applicability
3. What `ghostApp` actually provides — the audit
4. Scope boundary — MOVES / STAYS / SPLIT / DEFERRED
5. Target design
6. Contract change
7. Value and ownership ledger
8. Effect ownership after the callee is retired
9. Ordering
10. Runtime-dependency policy
11. Lifecycle and ownership
12. The deletion list
13. Staged sequence with owners
14. Coverage and mutation matrix
15. Risk, and what only a device can settle
16. The anti-cloning gate — specification only
17. Separate notes (not part of this plan's fix)

---

## 1. Defining records and authority

| Record | Standing | Reconciliation |
|---|---|---|
| The user's instruction, 2026-07-29: "Stop cloning." | Governing | Highest authority here. It settles the approach; this plan chooses only the sequence. |
| `PLAN-swipe-noswap-home.md` (Stage 6i) | Ratified, built | **AGREE**, and it is the precedent: it retired `snapshotHome` and made `→home` un-park the real fixed `#home` as the incoming mover. This plan applies the same move to the remaining directions. |
| `PLAN-browse-decouple.md` | Ratified, built | **AGREE** — it made active `#browse` a `position:fixed` own-scroll view. That is the precondition that makes Stage 1 cheap. |
| `PLAN-home-shift-fix.md` §3 (M2) | Ratified, built | **CONFLICT, resolved by deletion.** M2's fix is the `53px` clone-alignment constant. It is correct *for a clone*; this plan removes the clone, so the constant and its cell (`M2ALIGN`, `test/ghost-clone-geometry.test.js`) are deleted rather than maintained. Recorded so the deletion is not read as a regression. |
| `css/app.css:160-175` — the `#home` comment claiming "An opaque background so it fully occludes `#browse` during the browse→home filmstrip" | Subordinate source comment | **CONFLICT with HEAD.** `#home` declares **no background** (css:126-136). Only `#options`, the subs and `#nowplaying` declare `background: var(--page-bg)`. The comment is false at HEAD. It does not change this plan's design — a filmstrip's two movers do not overlap — but it is the kind of stale claim a future session would build on. Scrubbed in Stage 1. |
| Memory `tomeroam-swipe-repaint-saga` — "never transform the real in-flow view" | Working hypothesis, never proven | **CONFLICT with observed behaviour.** `browse→home` already transforms the real `#browse` (swipe.js:149, `toKind === 'home'` ⇒ `real-source`) and is the direction the user reports clean. The hypothesis is not evidence against this plan; it is a hypothesis this plan's Stage 1 tests directly. |
| `Claude/Loki/STRIKE-home-shift-m1-*` | Executed strikes | **AGREE**, and they supply the instrument: real-engine measurement via `chrome --headless=new --disable-gpu --user-data-dir=<scratch> <probe url>`, real-time (no `--virtual-time-budget`). §15 uses it. |
| `test/page-bg-js-painter.test.js`, `test/page-bg-single-painter.test.js` | Live gates | **AGREE** — the project's established idiom for a structural source gate. §16 is specified in that shape. |
| **GAP** | — | No record states why `home→browse` ghosts rather than moving two real elements. The ghost predates both fixed-view decouples and was never re-derived after them. This plan closes that gap by re-deriving it: there is no reason. |

## Applicability

*(Section 2. The heading is unnumbered because the authoring gate matches it literally.)*

- **boundary_relocation: true** — the outgoing mover's identity relocates from an owned clone pane
  to the real view element, and (Stage 2) the browse scroll box relocates from `#browse` to each
  `.browsepage`. Ledger in §7.
- **callee_replacement: true** — `ghostApp()` is a callee with eleven observable effects beyond its
  return value. It is retired rather than reimplemented, so each effect must be assigned to what
  supplies it instead — including the ones nothing supplies. Effects table in §8.
- **contract_shape: true** — `constructionPlanFor`'s `outgoing` enum loses `'app-ghost'`, the
  `Construction.capture` field is removed, and `finalizationPlanFor`'s `abortRender` loses
  `'rerender'`. The frozen spec `test/fixtures/swipe-plan-spec.mjs` changes with them. §6.
- **state_transfer: true** — Stage 2 moves per-page scroll state from the shared `sy` cache entry
  (browse.js:71) onto each page element's own `scrollTop`. §7, §9.
- **async_change: false** — no asynchronous surface changes shape. The settle rAF, the
  transitionend/340ms finalize race and the reveal hold are untouched; Stage 2 *removes* one held
  branch, which is a subtraction of a call site, not a change of async semantics.
- **persistence_migration: false** — nothing here is persisted. Scroll state is in-memory and live.
- **lifecycle_ownership: true** — the `'owned-pane'` mover ownership kind ceases to exist, and with
  it one creator, one disposal path and one hold. §11.

## 3. What `ghostApp` actually provides — the audit

`ghostApp` has exactly one consumer: `buildConstruction` when `plan.outgoing === 'app-ghost'`
(swipe.js:354). It returns `{ wrap, capture: { ghostY, animSync, animRes } }`. Its full provision,
derived from swipe.js:200-313, and for each whether moving the real element supplies it:

| What it provides | Supplied by a real-element move? |
|---|---|
| A transformable stand-in for the outgoing view | **Yes, inherently.** Every view is already a fixed inset box; three of them already move as real elements today. |
| `ghostY` — the source's scroll baked into `translateY` (swipe.js:302-305) | **Yes, inherently.** The real element *has* its scrollTop. `ghostY` exists only because a clone has none. |
| `animSync` / `animRes` — cover shimmer phase copied into the clone (swipe.js:218-244) | **Yes, inherently.** The real nodes carry the running animations. |
| `freezeArt` — `data-art` stripped so the copy does not re-trigger the art loader (swipe.js:205) | **Yes, inherently.** No new nodes are created, so nothing re-triggers. |
| `copyScroll` — carousel `scrollLeft` copied in (swipe.js:208-211) | **Yes, inherently.** The real carousels keep their own. |
| Topbar removal (swipe.js:291) | **Yes, inherently.** The topbar is a *sibling* of the views, not a child; a real-element move never picks it up. |
| `.hidden` / `.parked` pruning (swipe.js:292) | **Yes, inherently.** One real element is the mover; there is nothing to prune. |
| The `53px` `#library` padding (swipe.js:289) | **Yes, inherently** — and it exists *only* to undo the id-stripping. Deleted, not replaced. |
| `.alphaindex` removal (swipe.js:299) — a workaround for the clone's transform re-parenting a `position:fixed` descendant | **No.** Transforming a real `#browse`/`.browsepage` makes it the containing block for the fixed A–Z strip, exactly as it does for the clone. |
| The `.nav-ghost` wrapper — fixed `inset:0`, `z-index:28`, `overflow:hidden` (swipe.js:259-264) | **No.** It supplies viewport clipping and one uniform z-order. A real view has its own z (`#home` 20, `#browse` auto, `#options` 25, subs 26, NP 60) and its own inset box. |

**The finding, stated plainly.** Of eleven things `ghostApp` provides, **nine are needed only
because it is a copy.** Two are real:

- **`.alphaindex` re-parenting.** Honest, but **not new**: `browse→home` already transforms the real
  `#browse` with the strip inside it, and that is the swipe the user reports clean. The strip riding
  with its own page is what a filmstrip wants. The `.195`/`.196` break was a **persistent** transform
  on `#browse`; a gesture-scoped one is not that. Carried as device row **R3**, not as a blocker.
- **Clipping and z-order.** Real, and it is the one thing this plan must *design* rather than
  inherit. §5 does it.

## 4. Scope boundary — MOVES / STAYS / SPLIT / DEFERRED

**MOVES.** The outgoing-mover decision for `home→browse`, `home→overlay`, `browse→overlay`
(Stage 1) and `browse→browse` (Stage 2), from a built clone pane to the real view element. The
browse scroll box, from `#browse` to each `.browsepage` (Stage 2).

**STAYS.** The gesture machinery (arm/lock/move/settle/finalize, the session-identity guards, the
row hold, the reveal diagnostic). The additive-overlay model in `nav.js` `setView` (see §17). The
`.browsepage.parked` cover-warmth technique. `#home.parked`. The `.app` 12vh runway. The NP pill
decoration clone (`npPillClone`) — it clones a **pill**, not a view; it is not in scope and the ask
was about the screen.

**SPLIT across the seam.** `env.renderDestination` (app.js:514-526) keeps the render dispatch but
loses the incidental parking it does today via `showAppView` — the park moves to finalize.

**DEFERRED, with the consumer named.** The `.alphaindex` containing-block question is deferred to
device row R3; the consumer that would need a fix is the A–Z strip during a `browse→*` drag, and no
stage introduces it because the behaviour already ships on the `→home` path. The additive-overlay
premise (§17) is deferred with no stage: nothing in this plan needs it changed.

## 5. Target design

**Invariant D1 — a swipe moves real view elements.** The mover set is always
`{ the real outgoing view element, the real incoming view element }` (plus the NP pill decoration
where applicable). No transition builds a representation of a view.

**Invariant D2 — every view element is a `position:fixed` inset own-scroll box with the same
content geometry.** True at HEAD for `#home`, `#browse`, `#options`, the five subs and
`#nowplaying`. Stage 2 extends it to `.browsepage`, which makes the browse pages instances of the
same model rather than a second one.

**Invariant D3 — the outgoing element is never destroyed or overwritten during a drag.** This is
what makes an abort free. It holds today for every transition except `browse→browse`, which is
precisely the transition that needs the ghost.

### 5.1 Per transition

| Transition | Outgoing | Incoming | What must change |
|---|---|---|---|
| `home→browse` | real `#home` | real `#browse` | The `'browse-host'` render must **not** park `#home` for the duration of the drag. Symmetric to Stage 6i's `'home-host'`, which does not hide `#browse`. |
| `home→overlay` | real `#home` | real overlay | Nothing structural. The overlay is opaque and occupies the identical inset box; it is already shown by `env.renderDestination`. |
| `browse→overlay` | real `#browse` | real overlay | Nothing structural. |
| `browse→home` | real `#browse` | real `#home` | Already correct (Stage 6i). Untouched. |
| `overlay→*` | real overlay | real destination | Already correct. Untouched. |
| `browse→browse` | real outgoing `.browsepage` | real incoming `.browsepage` | Stage 2. Each page becomes its own fixed inset scroller so the two pages are two independently-scrolled real elements. |

### 5.2 Clipping and z-order — the one thing the wrapper supplied

The `.nav-ghost` wrapper clipped at `inset:0`. A real view element is already inset-clipped by its
own box, so **clipping is inherited**; what is not inherited is the *horizontal* travel: a mover
translated to `±w` sits outside the viewport, and the element that used to clip it (`.app`'s
`overflow-x: clip`, css:186) does not contain a `position:fixed` view.

**Requirement:** an off-viewport mover must not extend the scrollable area or paint outside the
viewport. `position: fixed` elements do not contribute to document scroll width, and `body` is not a
scroll container horizontally at HEAD. **This is a layout fact, not a source fact, and jsdom cannot
settle it.** It is measured in the real engine (§15, R2) before Stage 1 ships, not asserted in CI.

**Z-order during a drag.** Two movers in a filmstrip do not overlap, so z-order is not load-bearing
for the mid-drag frames. It *is* load-bearing at the two edges: at drag start the incoming sits at
`±w`, and at commit the outgoing sits at `∓w`. The existing z ladder (`#browse` auto < `#home` 20 <
`#options` 25 < subs 26 < NP 60) already places the incoming overlay above the outgoing in-flow view
and `#home` above `#browse`. **No z-index change is planned.** R2 measures it.

### 5.3 Stage 2 — `browse→browse`

At HEAD `#browse` is the scroller and holds one cached `.browsepage` per screen key
(browse.js:14, :497). Per-page scroll is saved to `sy` on every scroll event (browse.js:68-71) and
re-applied through `applyScrollY` (browse.js:226-228), with `beginRestore()` suppressing the clamp
event the host resize fires (browse.js:280).

**The change:** `.browsepage` becomes the fixed inset own-scroll box (the exact declarations
`#browse` carries at css:176-184), and `#browse` becomes a boxless container (`display: contents`,
retaining its `.hidden` toggle for `setView`).

**Invariant D4 — a browse page owns its own scroll offset natively.** Consequences, each a deletion:

- The `sy` save/restore (browse.js:68-71, :112-118, the `savedY` path in `entryScrollY`) becomes
  redundant: a page that never leaves the DOM never loses its `scrollTop`.
- `beginRestore`'s swap-clamp suppression becomes redundant: showing a different page no longer
  resizes any scroller, so no clamp event fires.
- The virtual controller's env (browse.js:654-658) changes `o.mount` from the shared host to the
  page node. The shape is unchanged — it already reads `scrollY`/`viewportH`/`listTop` off one
  element.
- `abortRender: 'rerender'` becomes unreachable: the source page node is never overwritten, so an
  abort has nothing to restore.

**Recommendation, not an invariant.** D4 is satisfiable by a second `#browse` host instead (render
the destination into the inactive host, swap on commit). Per-page scrollers are recommended because
they *delete* the `sy`/clamp machinery rather than adding a host-pool concept, and because they
collapse two view models into one. The invariant is D4; if the builder finds per-page scrollers
break the virtualizer's anchoring in a way the two-host form does not, the two-host form satisfies
D4 equally and is the fallback — say so rather than re-introducing a copy.

## 6. Contract change

```vitruvius-contract
# field | class
outgoing | identity
capture | identity
abortRender | behavior
```

Structural notation — the exact shapes, before and after:

```
BEFORE
  constructionPlanFor(c) -> { outgoing: 'app-ghost' | 'real-source',
                              incoming: 'real-destination',
                              renderDestination: 'browse-host' | 'home-host' | 'none',
                              decorations: frozen [] }
  buildConstruction(from, dest, env) -> { decorations, movers, capture: { ghostY, animSync, animRes } | null }
  finalizationPlanFor(c) -> { abortRender: 'rerender' | 'none' }

AFTER STAGE 1
  constructionPlanFor(c) -> { outgoing: 'app-ghost' | 'real-source', ... }   // 'app-ghost' iff fromKind === 'browse' && toKind === 'browse'
  buildConstruction  unchanged shape
  finalizationPlanFor  unchanged

AFTER STAGE 2
  constructionPlanFor(c) -> { outgoing: 'real-source',
                              incoming: 'real-destination',
                              renderDestination: 'browse-host' | 'home-host' | 'none',
                              decorations: frozen [] }
  buildConstruction(from, dest, env) -> { decorations, movers }              // `capture` REMOVED, not nulled
  finalizationPlanFor(c) -> { abortRender: 'none' }
```

`outgoing` collapses to a one-value enum after Stage 2. **Keep the field.** It is the frozen spec's
per-case assertion surface and the thing the anti-cloning gate reads; collapsing it to nothing would
delete the place a re-introduced clone would have to declare itself.

**Migration (U10).** `test/fixtures/swipe-plan-spec.mjs` is the hand-written independent oracle and
changes in the same commit as production, in both stages — that two-part edit is deliberate and is
what a review sees. `test/ghost-clone-geometry.test.js` is deleted in Stage 2.
`tools/mutate.mjs` and `test/mutation-anchors.test.js` carry anchors into `ghostApp`; every anchor
whose target text is deleted is de-registered in the same commit, or the anchors gate reddens with
`ANCHOR NOT FOUND`.

## 7. Value and ownership ledger

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
outgoing mover element | identity | out | the constructionPlanFor outgoing branch | the start() mover mapping in app.js | Swipe.buildConstruction | per gesture | NOGHOSTINFLOW cell in stage 1 and NOGHOSTATALL cell in stage 2
source view scroll offset | geometry | inout | the user scrolling the real view element | the outgoing mover paint during the drag | the real view element | continuous and unaffected by the gesture | HOMESTAYSLIVE cell plus device row R1
home parked state during a browse-host drag | behavior | inout | the env.renderDestination browse-host branch | the nav setView call at finalize | the env.renderDestination browse-host branch | spans drag start to finalize | HOMESTAYSLIVE cell and its second mutant
browse page scroll offset | geometry | inout | the user scrolling the page element | the same page element on re-entry | the browsepage element | the page element lifetime | PAGEISVIEW cell plus device row R4
Construction capture field | identity | out | Swipe.buildConstruction | the capture recording block in start() | Swipe.buildConstruction | per gesture until stage 2 removes it | NOGHOSTATALL cell
abort re-render decision | behavior | out | Swipe.finalizationPlanFor | the runFinalize abort branch | Swipe.finalizationPlanFor | per gesture | ABORTNORENDER cell
```

**No dead field is added.** Every row is an existing value whose producer, owner or existence
changes; the plan adds no new field to any contract. Two rows record **removals** (`Construction
capture field`, `abort re-render decision` losing its non-default value) — recorded because a value
whose consumer set shrinks to zero is exactly the thing that otherwise survives as dead weight.

## 8. Effect ownership after the callee is retired

`ghostApp` (js/swipe.js:259-313) is retired, not replaced by an indirection. Each observable effect
is assigned to what supplies it instead.

```vitruvius-effects
# effect | owner | predecessor | successor | verification
clone the app subtree and mount a fixed wrapper into body | retired-builder | ghostApp | the real view element is itself the outgoing mover | NOGHOSTATALL cell asserts no owned pane is built for any transition
strip every id from the cloned subtree | retired-builder | ghostApp | no copy exists so no id is stripped and every id-keyed rule keeps matching | NOAPPCLONE source gate
set the library padding-top compensation constant | retired-builder | ghostApp | the real view keeps its own fixed-inset content-top | NOAPPCLONE source gate plus device row R1
remove the shared topbar from the copy | retired-builder | ghostApp | the topbar is a sibling of the views and is never a mover | NOGHOSTATALL cell
prune hidden and parked subtrees from the copy | retired-builder | ghostApp | one real element is the mover so there is nothing to prune | NOGHOSTATALL cell
remove the fixed alphaindex strip from the copy | retired-builder | ghostApp | the real strip rides with its own transformed page as it already does on the browse to home swipe | device row R3
strip data-art so the copy does not retrigger the art loader | retired-builder | ghostApp | no nodes are created so the art loader is never retriggered | NOGHOSTATALL cell
copy carousel scrollLeft into the clone | retired-builder | ghostApp | the real carousels keep their own scrollLeft | NOGHOSTATALL cell
seek clone cover animations to their live twin phase | retired-builder | ghostApp | the real elements carry the running animations themselves | NOGHOSTATALL cell
translate the whole clone by the captured source scroll offset | retired-builder | ghostApp | the real view element carries its own scrollTop | HOMESTAYSLIVE cell plus device row R1
provide a fixed inset clipping wrapper above the view stack | retired-builder | ghostApp | each real view keeps its own inset box and its own z-index with no new stacking rule | section 5.2 plus device row R2
```

**The eleventh row is the one to read twice.** Ten effects are supplied inherently or are moot. One
— the wrapper's clipping and uniform z-order — is genuinely lost and is replaced by an argument
(§5.2) rather than by a mechanism. That argument is measured in a real engine before Stage 1 ships,
not asserted in CI.

## 9. Ordering

Ordering requirements that are **correctness**, not incidental:

1. **The outgoing mover is resolved before any destination render runs.** Preserved unchanged
   (swipe.js:349-360, plan §6 step 5). After Stage 1 the outgoing is a real element rather than a
   snapshot, which makes the ordering *less* load-bearing — but Stage 2's `browse→browse` still
   renders into a page that must already exist, so the order stands.
2. **The `#home` park is deferred from drag start to finalize** on `home→browse`. Today
   `showAppView` parks `#home` inside the mid-drag render (app.js:485). After Stage 1 the park must
   happen only at `applyScreen` → `setView('browse')` on **commit**, and must not happen at all on
   **abort**. A park that lands mid-drag makes the outgoing mover jump to `translateX(-101vw)` — the
   most visible possible regression, and the reason this is an ordering requirement and not a detail.
3. **The transform is cleared before the park is applied**, at finalize. `resetSwipeStyles`
   (nav.js:113-119) already runs at the top of `applyScreen`, ahead of `setView`. Unchanged; named
   because Stage 1 now depends on it.
4. **Stage 2's per-page scroller migration lands with its readers in one commit.** `o.mount`'s
   re-targeting (browse.js:654-658) and the `sy` deletion cannot be split: a page that owns its
   scroll while `applyScrollY` still writes the host produces two scroll authorities.

Incidental and free to move: the order of the effect deletions inside `ghostApp`'s removal (the
whole function goes at once), and the order in which the frozen-spec rows are edited.

## 10. Runtime-dependency policy

`js/swipe.js` stays DOM-free at module load and reads the world only through the injected `env`
(`env.document`, `env.scrollY`, `env.navPill`, `env.sourceEl`, `env.renderDestination`). This plan
**narrows** that surface: with no clone to build, `paneBuilders` loses `env.scrollY` entirely
(its only consumer is `ghostApp`'s overlay-source fallback at swipe.js:304) and keeps
`env.document`/`env.navPill` for `npPillClone` alone.

**No new ambient read is introduced.** In particular the plan does not add a `getComputedStyle` call,
a `window.innerWidth` read or a `matchMedia` query inside `js/swipe.js`; the geometry stays in the L3
adapter (app.js `start()`), where it already lives. No value is lazily cached, so there is no
invalidation policy to define.

`js/browse.js`'s Stage 2 change reads `o.mount` — an injected reference, not an ambient lookup — and
re-points it at the active page node. `#browse` remains resolved through `d.byId` in `nav.js`.

**Every ambient and injected value crossing a declared range, named — including the untouched ones.**
A value that crosses a declared range without being named is indistinguishable from a value the plan
forgot, so each is stated with its disposition:

- **`document.body.classList` token `np-locked`** — mutated inside both `js/app.js:503-566` (the
  outgoing-NP unlock at app.js:559 and the incoming-NP unlock at app.js:522) and `js/nav.js:45-95`
  (nav.js:87). It is the CSS hook that swaps the navbar buttons for the Now Playing pill. **UNTOUCHED
  by both stages**: it is keyed to the NP *decoration*, which this plan explicitly keeps (§4, §11),
  and no step adds, removes or re-times a write to it. No cell asserts it.
- **`d.browseWillHide`** (nav.js:60-65) — the injected hook that deactivates Browse's virtual
  controller before `display: none` lands, because a hidden box measures zero. **UNTOUCHED in Stage
  1.** In Stage 2 its *reason* weakens — a page that owns its own scroll no longer loses an anchor to
  a host resize — but the call site is not removed by this plan, because deactivation still governs
  row materialization. Any change to it is a separate decision, not a side effect of this one.
- **`d.isSignedIn`** (nav.js:93) — gates the navbar's `hidden` toggle. **UNTOUCHED**; no step in
  either stage reads or writes it.
- **`d.updatePlayerUI`** (nav.js:94) — the trailing player-UI reconcile in `setView`. **UNTOUCHED**;
  it runs after every `setView`, including the finalize-time `setView('browse')` that Stage 1 now
  carries the `#home` park on, and its behaviour at that call site is unchanged.
- **`d.byId`** — the single injected element lookup through which `setView` and `applyScreen` resolve
  every view. **UNTOUCHED**; no call site changes and no new lookup is added.

**Exact-key contract compatibility.** `Swipe.buildConstruction`'s return is registered
`NON_CONTRACT` in `test/contract-function-gate.test.js` because it carries live DOM nodes, so
removing the `capture` key in Stage 2 does not trip the exact-key contract gate. That registration is
**re-read and kept** in the same commit — the gate's `NON_CONTRACT` list is an exact-key contract in
its own right, and a function whose shape changes while its registration silently stays valid is the
case worth naming rather than assuming. `classifyTransition`, `constructionPlanFor` and
`finalizationPlanFor` return frozen plain objects and **do** sit under the exact-key gate:
`constructionPlanFor` keeps all four keys (only the `outgoing` value domain narrows), and
`finalizationPlanFor` is deleted outright in Stage 2 rather than returning a narrowed shape — so its
registration is removed with it, in the same commit, or the gate reddens on a registered function
that no longer exists.

## 11. Lifecycle and ownership

The `'owned-pane'` mover ownership kind is retired. Each lifecycle concern, named:

- **Creates.** Today `ghostApp` creates a wrapper and a cloned subtree per gesture. After Stage 2
  **nothing is created** for a view transition; only `npPillClone` still creates a node, and it keeps
  its existing `'owned-decoration'` kind unchanged.
- **Borrows.** All view movers become `'borrowed-real'` — the kind that already governs `#home`,
  `#browse` and the overlays on the transitions that do not clone. No new borrowing rule.
- **Mutates.** The gesture writes `style.transform` on borrowed elements and clears it at
  `resetSwipeStyles`. Unchanged, and already covered by the existing reset for every element id in
  `nav.js:116`.
- **Releases.** `dropPanes()` (app.js:633) filters `own === 'owned-pane'` and becomes a no-op, then
  is deleted. `holdGhostUntilPaintable` and the `revealPending` branch lose their only trigger and
  are deleted with it.
- **Restores.** The abort restore (`applyScreen(dest, { render: 'rerender' })`, app.js:1200-1208)
  loses its condition and is deleted; an abort becomes a transform reset with nothing to rebuild.
- **Destroys.** The `.nav-ghost` sweeps at app.js:393/400 and `nav.js:114` lose their subject. The
  `nav.js` sweep is **retained** as defence for the NP pill float on the same line; the app.js sweeps
  are deleted with the pane kind.

**Nothing added now is justified only by a later stage.** Stage 1 adds one branch (the drag-scoped
home park exemption) with a Stage-1 consumer. Stage 2 adds no field at all — it is subtraction plus
a CSS relocation.

## 12. The deletion list

Deleting machinery is the point. Stage 2 is not complete until each of these is gone from HEAD.

**js/swipe.js**
1. `ghostApp()` — the whole function (swipe.js:279-313).
2. `ghostWrap()` (swipe.js:259-264) and with it the `.nav-ghost` wrapper concept.
3. `freezeArt` (:205), `copyScroll` (:208-211), `copyAnimPhase` (:218-244) — clone-fidelity helpers with no other caller.
4. The id-stripping line (`clone.querySelectorAll('[id]')…removeAttribute('id')`, :290).
5. The `53px` `#library` compensation (:289) and its derivation comment (:281-288).
6. The `.alphaindex` clone exclusion (:293-299) and the topbar/hidden/parked prunes (:291-292).
7. The `'app-ghost'` value from `constructionPlanFor`'s `outgoing` (:149-150) and its comment block.
8. `'rerender'` from `finalizationPlanFor` (:186) — the function collapses to a constant and is
   deleted outright unless a second finalization field has landed by then.
9. `capture` from the `buildConstruction` return (:353, :385) and `env.scrollY` from `paneBuilders`.

**js/app.js**
10. The capture-recording block (`d.ghostY` / `d.animSync` / `d.animRes`, app.js:548-552) and every reader (`cover.ghostY` at :1154, the ghost/real diagnostic at :657-705).
11. `dropPanes()` (:633), `holdGhostUntilPaintable`, `revealPending`, and the abort held-reveal branch (:1200-1208).
12. The `.nav-ghost` sweeps at :393 and :400 and the `keepGhosts` option threaded through `applyScreen` (:444, :1201).
13. `showAppView`'s home-park side effect on the drag path (:485) — replaced by the finalize-time park, not duplicated.

**css/app.css**
14. `.nav-ghost` rules, if any survive the wrapper's inline `cssText`.
15. The false "opaque background" claim in the `#home` comment (css:160-175) — scrubbed in Stage 1.

**test/ and tools/**
16. `test/ghost-clone-geometry.test.js` — it exists **only** to police clone/real parity (`M2ALIGN`). Deleted, not migrated.
17. Every `ghostApp`-targeted mutation anchor in `tools/mutate.mjs` and `test/mutation-anchors.test.js`.
18. `'app-ghost'` from every `expectedConstruction` row and `paneOf` in `test/fixtures/swipe-plan-spec.mjs`; `abortRender: 'rerender'` from the `browse→browse` row.
19. Any assertion in `test/swipe-stage5-*.test.js`, `test/swipe-stage6*.test.js`, `test/browse-decouple.test.js`, `test/home-abort-writes.test.js` whose only subject is a built pane. **Rule:** an assertion about the *classification* survives and changes value; an assertion about the *clone* is deleted.

**Not deleted:** `npPillClone` (a pill, not a view), `#home.parked`, `.browsepage.parked`, the row
hold, the `.app` runway, the session-identity guards.

## 13. Staged sequence with owners

**One canonical list. Each step names its owner. No step depends on a later one.**

| # | Step | Owner |
|---|---|---|
| 1 | Stress this plan; verdict forge / temper / scrap. | the plan reviewer |
| 2 | Run the real-engine measurement R1 + R2 (§15) against HEAD **and** against a scratch build with Stage 1's classification change, over the static `index.html`. This settles the off-viewport-mover and z-order questions **before** any product edit. | the deriver |
| 3 | Author the Stage-1 red cells: `NOGHOSTINFLOW`, `HOMESTAYSLIVE`. Red at HEAD. | the test author |
| 4 | **Stage 1 build.** `constructionPlanFor`: `outgoing` is `'app-ghost'` iff `fromKind === 'browse' && toKind === 'browse'`. `env.renderDestination`'s `'browse-host'` branch stops parking `#home` for the drag; `applyScreen` parks it at finalize on commit only. Update the three changed rows in the frozen spec. Scrub the false `#home` background comment. Bump the build number. | the builder |
| 5 | Device gate: swipe Home→Books, Home→Options, Books→Options — commit and abort, from the top of the list and from deep in it. Report against R1's numbers. **This is the step that answers the user's report**; it is where the heading-resize symptom either goes or does not. | the user |
| 6 | Review the Stage-1 build. | the code reviewer |
| 7 | Attack the ratified claim "moving the real outgoing view is visually identical to the ghost it replaces" by construction. | the adversary |
| 8 | Author the Stage-2 red cells: `PAGEISVIEW`, `NOGHOSTATALL`, `ABORTNORENDER`, `NOAPPCLONE`. Red at HEAD. | the test author |
| 9 | **Stage 2 build, part A.** `.browsepage` becomes the fixed inset own-scroll box; `#browse` becomes `display: contents`. Re-point `o.mount` at the active page node. Delete the `sy` save/restore and the swap-clamp suppression. Bump the build number. | the builder |
| 10 | Device gate: browse→browse both directions, commit and abort, on a long list and a short one; A–Z strip; virtualized list past 600 items. | the user |
| 11 | **Stage 2 build, part B.** `outgoing` collapses to `'real-source'`; `abortRender` collapses to `'none'`. Execute the §12 deletion list in full — including the test and tooling entries. Bump the build number. | the builder |
| 12 | Build the anti-cloning gate to §16. | the builder |
| 13 | Audit the suite: every deleted assertion accounted for, no dimension left bare by the deletions. | the coverage auditor |
| 14 | Update `Claude/Subsystems/swipe-reveal.md`, the board and the decision log; HEAD-wide scrub of "ghost", "app-ghost", "snapshot", "clone" in records that describe the swipe. | the assistant |

**Stage 1 is independently shippable and independently valuable.** If Stage 2 is never built, three
of four transitions and every Home-originating swipe are de-cloned, and the reported symptoms are
addressed at their cause. Stage 2 buys the last transition, the deletions and the gate.

## 14. Coverage and mutation matrix

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
NOGHOSTINFLOW | after stage 1 the construction plan builds an owned pane for exactly one structural transition namely browse to browse and returns real-source for every other pair including home to browse home to overlay and browse to overlay | unit call constructionPlanFor over all eight structural cases from the frozen spec and assert outgoing equals real-source everywhere except the browse to browse case | NATURAL restore the widened condition so an in-flow source going to a non-home destination is planned as app-ghost again which reddens the home to browse and both to-overlay rows expected killing cell NOGHOSTINFLOW | unit pure classification
HOMESTAYSLIVE | during a home to browse drag the real home element is the outgoing mover and is never parked while the gesture is live and it IS parked once a committed gesture finalizes and is NOT parked after an aborted one | integration boot the app harness with fake timers and deferred rAF then swipe home to books and assert at every mid-drag step that the home element does not carry the parked class and carries a translateX transform then advance past the settle and assert parked is present after a commit and absent after an abort | TWO mutants because one cannot exercise both edges. NATURAL-a the browse-host render branch re-parks home at drag start which reddens the mid-drag assertion. NATURAL-b the finalize commit path stops parking home which reddens the post-commit assertion. expected killing cell for BOTH is HOMESTAYSLIVE | integration app harness over the real shipped listeners
PAGEISVIEW | each browse page is its own fixed inset own-scroll box whose geometry declarations are byte-identical to the ones the browse host carried before the relocation so two browse pages are two real elements occupying the same screen box | unit read the shipped css and assert the browsepage base rule declares position fixed and the same top and bottom and left and right and max-width and margin and padding and overflow-y as the retired browse host rule with each value compared textually against the retired rule captured in the fixture rather than hardcoded and assert the browse host itself no longer establishes a box | THREE mutants. NATURAL-a the browsepage rule omits overflow-y auto so the page is not a scroller. NATURAL-b the browsepage rule declares a different top inset than the retired host rule so the two boxes disagree. NATURAL-c the browse host keeps overflow-y auto so two scroll authorities exist at once. expected killing cell for ALL THREE is PAGEISVIEW | unit css structural audit
NOGHOSTATALL | after stage 2 no transition builds an owned pane and the Construction return carries no capture field at all | unit call buildConstruction against a fake env over all eight structural cases and assert no mover carries ownership owned-pane and that the returned object has no capture key and that no node with the retired ghost class was appended to the fake document | NATURAL re-add the app-ghost branch for browse to browse so a pane is built and a capture is returned which reddens all three assertions expected killing cell NOGHOSTATALL | unit construction seam against a fake env
ABORTNORENDER | an aborted swipe never re-renders its source screen because the source element was never overwritten so the abort is a transform reset and nothing else | integration boot the app harness and record every Browse render call then swipe books to authors and abort and advance past the settle and assert the recorded render count for the source screen is zero for the whole settle and finalize window and that the source page node is the same object it was before the gesture | NATURAL restore the rerender branch on the abort path so applyScreen is called with render true and the source screen is rendered again which reddens the zero-render assertion expected killing cell ABORTNORENDER | integration app harness abort path
NOAPPCLONE | no first-party script clones an element that hosts a view so the whole class of copy-versus-real divergence cannot re-enter by any route | gate scan every first-party js file excluding the vendored bundle for a cloneNode call whose receiver resolves to a view host or the app container per the resolution rules in section 16 and fail naming the file and line and allow only the explicitly registered exception for the now-playing pill | ADDITIVE inject a cloneNode call on a queryselector for the app container into an existing first-party file so the derived set gains an unregistered site and the gate reddens and separately inject one on the navbar pill selector and assert the registered exception does NOT redden expected killing cell NOAPPCLONE | gate source scan over first-party js
```

**Six cells, ten mutants.** Every cell asserts a **source fact, a class-state fact or a call-count
fact** — never a rendered geometry. That is deliberate: jsdom has no layout, no paint, no font
boosting and no scroll anchoring, so a CI cell asserting the alignment, the reflow or the background
**could not fail** and would be a false witness. Those questions are §15's, and they are measured or
device-owed. This is the discipline the `M2ALIGN` cell's own honest-limit note already recorded, applied
by not writing the cell at all.

**Cells that get deleted rather than kept:** every existing assertion whose subject is the built
pane (§12 item 19). A cell that can only pass by the clone existing is not coverage of this design;
it is coverage of the thing being removed.

## 15. Risk, and what only a device can settle

**What could regress, honestly.**

- **R-A. The off-viewport mover extends the page or paints outside the viewport.** The `.nav-ghost`
  wrapper clipped at `inset:0`; a real fixed view at `translateX(±w)` relies on `position: fixed` not
  contributing to scroll width. Highest-probability regression in Stage 1. **Measured, not assumed** —
  R2 below.
- **R-B. The A–Z strip re-parents when its page is transformed.** Certain to happen; already happens
  on the `→home` swipe today. The risk is that it looks wrong in a direction nobody has watched.
  R3.
- **R-C. The virtualizer's scroll anchoring changes behaviour when its scroller changes from the
  shared host to the page node** (Stage 2). Anchoring is engine machinery; jsdom models none of it.
  R4.
- **R-D. `display: contents` on `#browse`** removes a box that something may depend on —
  a descendant selector still matches, but a `getBoundingClientRect` on `#browse` returns an empty
  rect. Grep-checkable at build time; named so it is checked rather than discovered.
- **R-E. The heading reflow does not go away.** The hypothesis is that font boosting differs because
  the copy lays out in a different box. If the reflow survives Stage 1 on Home, the hypothesis is
  falsified and the cause is elsewhere — **report that, do not reach for `text-size-adjust`.** This
  is the single most important honesty condition in the plan.

**Measured in a real engine before Stage 1 ships** (`chrome --headless=new --disable-gpu
--user-data-dir=<scratch>`, real-time — no `--virtual-time-budget`; the instrument the strikes in
`Claude/Loki/STRIKE-home-shift-m1-*.md` already used):

- **R1.** With a real `#home` translated to `-w`: its first content's viewport-Y, and the computed
  `font-size` of `.section-title`, at rest and mid-transform. Compare against the same readings for
  the current ghost. This is the direct measurement of the reported symptom and of the `53px`
  constant's necessity.
- **R2.** `document.scrollingElement.scrollWidth` and `body` overflow with a fixed view at
  `translateX(±innerWidth)`; and the paint order of `#home` (z20) against `#browse` (auto) and
  `#options` (z25) at the two filmstrip edges.

**Device-owed — only the user's iOS device can settle these** (WebKit, iOS 26, real compositing):

- **R3.** The A–Z strip during a `browse→*` drag and at the reveal.
- **R4.** Cover warmth and row retention across a `browse→browse` abort with per-page scrollers, on
  a long virtualized list.
- **R5.** The known open repaint-on-abort symptom: whether it survives de-cloning. **Do not predict
  it either way.** It is worth naming that the symptom lives on ghost paths and the one ghost-free
  direction is the one reported clean — that is a correlation, not a mechanism, and this plan does
  not claim it as a fix.
- **R6.** iOS fixed-layer displacement (the black-band class) with `#browse` at `display: contents`.
  The runway that seats the bars is on `.app` and is untouched, so no premise changes — but the
  black-band saga has surprised this project before and the check is cheap.

**Prior scars this plan is exposed to.** The swipe machinery has invalidated verifications through
environment traps before (recorded in memory `tomeroam-swipe-repaint-saga`, eight of them); a
device-confirmed fix has been shipped in a *variant* form and flashed (`translateZ(0)` for
`will-change`). Consequence for this plan: **the form that is device-tested is the form that ships**,
and a Stage-1 pass on device is not evidence about Stage 2.

## 16. The anti-cloning gate — specification only, not built here

**What it must make impossible:** a first-party script creating a copy of an element that hosts a
view. Not "remember not to clone" — a check that fails.

- **Name.** `test/no-view-clone-gate.test.js`. Same shape and idiom as
  `test/page-bg-js-painter.test.js`: a Node test that reads source text, so it cannot be made
  vacuous by the environment.
- **Scope.** Every `.js` under `js/`, excluding `js/vendor/`.
- **Detection.** Any `cloneNode` call (or `importNode`, or an `outerHTML`/`innerHTML` round-trip
  used to duplicate a subtree) whose receiver **resolves to a view host**. Receiver resolution is
  textual and deliberately conservative: a selector literal or `getElementById` argument matching
  `.app`, `#home`, `#browse`, `#options`, `#nowplaying`, `.browsepage`, `.view`, or any id in
  `Nav.SETTINGS_SUBS`; or a local identifier assigned from such a lookup within the same function.
  **Where the receiver cannot be resolved textually the gate FAILS**, and the fix is to register the
  call or make the receiver resolvable — an unresolvable receiver must never be a silent pass, which
  is exactly how the seventh background painter shipped green.
- **Registered exceptions.** Exactly one: `npPillClone`'s `env.navPill().cloneNode(true)`
  (js/swipe.js:318) — a navbar pill, not a view. The exception list is a literal in the test with a
  one-line reason per entry; an unregistered clone fails, and a registered entry whose text no longer
  occurs in source **also** fails, so the list cannot rot.
- **Mutation evidence.** `NOAPPCLONE`'s two mutants (§14) — an injected `.app` clone must redden it,
  and an injected navbar-pill clone must not.
- **Honest limit, stated in the test's own header.** It proves a **textual** property. A clone built
  through a fully dynamic receiver, or in a future non-`js/` surface, is outside it. It does not
  prove the swipe is correct; it proves this specific class cannot re-enter by the routes source text
  can see.
- **Wiring.** Runs in the normal `npm test` battery, therefore at pre-commit. It lands **after**
  Stage 2, because at HEAD and after Stage 1 it would fail on shipped code.

## 17. Separate notes — not part of this plan's fix

**`text-size-adjust` is not proposed, and deliberately.** It is absent from `css/` and `index.html`.
Setting it would suppress the visible reflow without changing why the two layouts differ, which is
symptom treatment and is rejected. **If** R-E holds — the reflow goes when the clone goes — then
`text-size-adjust: 100%` is worth considering afterwards **on its own merits** (deterministic text
metrics across engines for an app that controls its own type scale), as a separate proposal with its
own justification. It is not a fallback for this plan and must not be reached for if Stage 1
under-delivers.

**The additive-overlay premise is void, and nothing here depends on it.** `nav.js` `setView`
(nav.js:52-55) keeps `#options`, the subs and `#nowplaying` additive because "hiding the tall view
shrinks the document, and a short document trips iOS 26's ~50pt fixed-layer displacement." With
`#home` and `#browse` both `position: fixed`, **no in-flow view drives document height any more** —
the only driver is `.app`'s constant 12vh runway. So hiding a view can no longer shrink the
document, and the stated premise no longer holds. **Verified by reading, not assumed** — and
deliberately **not acted on**: real-element movers work perfectly well with additive overlays, so
changing it would be scope this plan did not earn. Recorded so a future session finds the premise
already re-derived instead of re-deriving it, and so the comment can be corrected when something
does need to change there.

**Proportionality.** This plan is two product edits and a long subtraction. Stage 1 is a one-line
classification change plus a park-timing change. Stage 2 is a CSS relocation plus deletions. The
length here is the deletion list and the honesty about what a device must settle — not the size of
the change.
