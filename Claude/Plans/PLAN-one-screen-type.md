# PLAN — one screen type: Options and its subs become `.browsepage` peers

**The decision (settled, not re-opened).** `Claude/Decisions/DecisionLog.md`, final entry, 2026-07-30:
**all screens are the same type.** `#options` and the five settings sub-screens become peers of the
same kind as a `.browsepage` — swapped one at a time, never co-visible, painting no background of
their own. **Now Playing stays unique**, decided against derived facts
(`Claude/Linnaeus/PROBE-np-uniqueness.md`); nothing in this plan touches `.nowplaying`.

**The defect this closes.** Their present additive-overlay form produced a device screenshot with the
Options hub and the General sub-screen rendered through each other simultaneously. The mechanism is
`js/nav.js:83` — `#options` is deliberately kept mounted underneath its own sub-screen.

**Why this is smaller than it looks.** `#options` (`css/app.css:215-217`) and the five subs
(`css/app.css:780-782`) already declare the **exact same two-bar inset geometry** as `#home`
(`css:162-164`) and `#browse` (`css:185-187`), and each is already its own `overflow-y: auto`
scroller. They are already six real, separately-transformable fixed boxes. Becoming peers is
therefore **four deletions and one guard edit** — no new host element, no new geometry, no new
markup. The plan is long because the deletion list, the transition-kind consequences and the honest
device-owed set are long; the product change is not.

<!-- vitruvius-gate {"plan_type":"refactor",
  "patterns":{"boundary_relocation":true,"callee_replacement":false,"contract_shape":true,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/nav.js:45-95","js/nav.js:127-155","js/swipe.js:56-63","js/swipe.js:91-117","js/swipe.js:146-183","js/swipe.js:196-205","js/app.js:478-498","js/app.js:515-539","css/app.css:207-227","css/app.css:772-791"],
  "callee_ranges":[],
  "affected_contracts":["test/fixtures/swipe-plan-spec.mjs:58","test/page-bg-single-painter.test.js:25","test/nav.test.js:36","docs/transition-matrix.generated.txt:12","docs/swipe-model.generated.txt:62"],
  "staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Zelda/Board.md","Claude/Decisions/DecisionLog.md"],
  "blocking_questions":["ONEPAGE","PEERPARK","NOSETTINGSBG","NPUNTOUCHED","OVERLAYISNP","KINDPLAN"]} -->

Status: **PLAN_READY — not reviewed.** Three stages, each independently shippable and independently
device-testable. A1 makes the screens exclusive and transparent (this alone closes the reported
defect). A2 removes the now-dead stacking. B retires the `overlay` classification for everything but
Now Playing.

## Index

1. Defining records and authority
2. Applicability
3. How `.browsepage` peers actually work — derived from source
4. Exact scope boundary — MOVES / STAYS / SPLIT / DEFERRED
5. Target design — what Options becomes
6. Contract change
7. Value and ownership ledger
8. Ordering
9. Runtime-dependency policy
10. Lifecycle and ownership
11. The transition-kind consequences
12. The deletion list
13. Staged sequence with owners
14. Coverage and mutation matrix
15. Risk, and what only a device can settle
16. The gate — specification only
17. How this changes the assumptions of `PLAN-swipe-declone.md` Stage 2

---

## 1. Defining records and authority

| Record | Standing | Reconciliation |
|---|---|---|
| `Claude/Decisions/DecisionLog.md` final entry, 2026-07-30 — "ONE SCREEN TYPE, with Now Playing the deliberate exception" | **Governing** | Highest authority. It settles both the approach and the exception. This plan chooses only the sequence and the mechanism. |
| `Claude/Linnaeus/PROBE-np-uniqueness.md` | Derived fact sheet, gates this design | **AGREE.** Its §7.3 is the load-bearing fact: an ordinary two-bar-inset screen at z25/z26 could not cover the topbar or the transport for two independent reasons, so removing the background and the z-index from the settings screens cannot change what covers those bars — the settings screens never covered them. §1.9 supplies the second: the background is **shared**, not NP's distinguishing property. |
| `PLAN-swipe-declone.md` §17 — "The additive-overlay premise is void, and nothing here depends on it" | Ratified, Stage 1 built | **AGREE, and it is the precedent.** It already re-derived by reading that with `#home` and `#browse` both `position: fixed`, no in-flow view drives document height, so hiding a view cannot shrink the document and the stated iOS-26 premise no longer holds. It deliberately did not act on it. This plan is the act. Re-verified independently in §15 R-A. |
| `js/nav.js:50-55` — the `setView` comment asserting the additive model is required because "hiding the tall view shrinks the document" | Subordinate source comment | **CONFLICT with HEAD, resolved by deletion.** Every screen under `#library` is `position: fixed` (`css:161`, `184`, `215`, `780`, `506`), so `#library` contributes no flow height and `.app`'s `min-height: calc(100% + 12vh)` (`css:75`) is the whole document height. The premise is false at HEAD. Scrubbed in Stage A1. |
| `css/app.css:220-221` and `css/app.css:785-786` — "these sub-screens are ADDITIVE overlays that paint over a live, un-parked page underneath, so they need their own background" | Subordinate source comments | **AGREE with HEAD, and both become false the moment A1 lands.** They are accurate descriptions of the current mechanism, which is what is being removed. Deleted with the declarations they justify, not left behind. |
| `Claude/Subsystems/swipe-reveal.md:396-403` — Stage 6f's ENUMERATED precondition that all seven overlay kinds paint an opaque `--page-bg`, and that any change to an overlay's background REOPENS it | Subsystem contract, live trigger | **REOPENED BY THIS PLAN, and already resolved in the same record.** Lines 393-396 record that Swipe-declone Stage 1 SUPERSEDED 6f on this axis — home→overlay and browse→overlay now move their real element directly, so "the ENUMERATED overlay-background precondition below is now moot for this axis (there is no ghost for those transitions to exclude an overlay from)". The trigger fires, is answered by the superseding entry plus A1's park/hide, and the residue is device-owed (§15 R-C). Recorded so this is not read as an unnoticed violation. |
| `test/page-bg-single-painter.test.js:25-29` | Live gate, pins the current split | **CONFLICT by design.** Its `OPAQUE_SELECTORS` is the exact pin the decision reverses. It changes with this work to `body::before` + `.nowplaying`; §16 specifies the replacement. |
| `test/nav.test.js:36-44` — "a sub-screen keeps the Options hub MOUNTED underneath it (build .106)" | Live test asserting the old arrangement | **CONFLICT by design.** This test asserts the co-visibility the decision abolishes. Its assertion inverts; its `.106` rationale (a forward slide-in exposing the base view) is separately checked in §15 R-D. |
| `Claude/Subsystems/swipe-reveal.md:407` — "`#home { transform: translateZ(0) }`" | Subsystem contract | **CONFLICT with HEAD, out of scope, recorded not fixed.** `css/app.css:133-141` records that `translateZ(0)` flashed on device and was reverted; `css:168` ships `will-change: transform`. This plan neither depends on nor changes it. Named so the next reader of §15 R-E does not take line 407 as current. |
| **GAP** | — | No record states why a settings screen needs a `z-index` at all once nothing lives underneath it. `css:210` and `css:775` give the reason as covering page content and stacking a sub above the hub — both of which this plan removes. The gap is closed by removing the z-index with its two stated causes (Stage A2), not by keeping it unexplained. |

## Applicability

*(Section 2. The heading is unnumbered because the authoring gate matches it literally.)*

- **boundary_relocation: true** — the responsibility for occluding whatever is behind a settings
  screen relocates from that screen's own `background` declaration to `js/nav.js` `setView`'s
  park-and-hide swap. Ledger in §7.
- **callee_replacement: false** — no function is replaced by a callback, adapter, event or
  indirection. `setView` keeps its one call site set and its one body; a condition inside it is
  narrowed and one branch is deleted. Nothing is routed through a new layer.
- **contract_shape: true** — `Swipe.kindOf`'s output domain gains a member and `NAV.isOverlay`'s
  membership narrows to one screen, which changes `classifyTransition`'s `fromKind`/`toKind`/
  `sourceHost`/`destinationHost` value domains and the structural-case set of the frozen spec
  `test/fixtures/swipe-plan-spec.mjs`. §6.
- **state_transfer: false** — no stored value moves owner. Each settings screen keeps its own
  `scrollTop` on its own element, exactly as today; the entry-time reset at `js/nav.js:147` is
  unchanged.
- **async_change: false** — no asynchronous surface changes shape. The settle rAF, the
  transitionend/340ms finalize race and the reveal hold are untouched. `overlayFilmstrip`'s
  rAF + 340ms safety net (`js/nav.js:186-193`) is unchanged in timing and structure.
- **persistence_migration: false** — nothing here is persisted. Screen visibility is in-memory
  class state.
- **lifecycle_ownership: true** — `Browse.deactivate()` gains a trigger edge it does not have today
  (entering a settings screen from Browse now crosses the shown→hidden edge at `js/nav.js:60`), and
  the settings screens' mounted-set shrinks from two to one. §10.

## 3. How `.browsepage` peers actually work — derived from source

This is the pattern being copied. Derived from `js/browse.js` and `css/app.css` rather than assumed.

**3.1 — The host owns the box; the pages own nothing.** `#browse` is a `position: fixed` inset
own-scroll box (`css/app.css:184-190`): `top: calc(var(--safe-top) + 51px)`,
`bottom: calc(var(--nav-h) + var(--nav-pad))`, `overflow-y: auto`, `max-width: 640px`. It
**deliberately declares no `z-index`** (`css:177-183` states the reason: plain `position: fixed`
creates no stacking context, so `.alphaindex` at z24 and `#home` at z20 stay in the root stacking
context) and **declares no background** (pinned by
`test/page-bg-single-painter.test.js:25`).

**3.2 — A page is a bare `div.browsepage`.** Created at `js/browse.js:494-497`
(`page.className = 'browsepage'`, appended to `o.mount`). Its **only** CSS rule in the whole
stylesheet is `.browsepage.parked` (`css/app.css:86-91`) — the gesture-scoped off-viewport park.
There is no base `.browsepage` rule at all: a page declares no position, no inset, no scroller, no
z-index and no background. It is an ordinary in-flow child of the host.

**3.3 — Exactly one page is on screen, by construction.** `Browse.showPage(key)`
(`js/browse.js:299-303`) is one loop over the whole cache:

```
for (const [k, v] of pageCache) {
  const away = k !== key;
  v.el.classList.toggle('parked', away && holdRows);
  v.el.classList.toggle('hidden', away && !holdRows);
}
```

Every page except `key` is marked away; `key` is marked neither. `offscreen(el)`
(`js/browse.js:207`) is `hidden || parked`, and `activeEntry()` (`js/browse.js:208-211`) returns the
first non-offscreen page. Co-visibility is impossible because the same loop that shows one hides all
the others — there is no separate "hide the previous one" call that could be skipped.

**3.4 — They need no background because nothing live is behind them.** The other pages are
`display: none` (`css:77`) or parked off-viewport, `#home` is parked off-viewport
(`css:127-131`, `transform: translateX(-101vw)`), and `#browse` itself paints nothing. What shows
through is `body::before` — the one fixed, never-moving `--page-bg` painter (`css:42-46`). A page
that painted its own copy of the gradient would render it at its own box's scale and origin and
would move with it during a swipe; that is the defect
`test/page-bg-single-painter.test.js:13-16` exists to prevent.

**3.5 — `Browse.deactivate()` and `d.browseWillHide` are the lifecycle seam, not the visibility
mechanism.** `js/nav.js:60-65` calls `d.browseWillHide()` — wired to `Browse.deactivate()` at
`js/app.js:2870` — on the shown→hidden edge only, **before** `display: none` lands, because a hidden
box measures zero and the virtual controller captures its scroll anchor from real geometry
(`js/browse.js:320-332`). Re-entry activation is deliberately **not** driven from there; it is owned
by `showPage()` (`js/browse.js:304-318`), which activates the exact page being rendered.

**3.6 — The peer property in one sentence.** A `.browsepage` peer is a screen that **declares no box
of its own, no stacking of its own and no background of its own**, is shown by removing one class and
hidden by adding it, and is never co-visible with a sibling because one operation decides all of
them. Only the first clause is architecturally about a host: `#browse` supplies the box because a
`.browsepage` has none. **The settings screens already have their own box, identical to `#browse`'s.**
That is why they need no host to become peers — §5.

## 4. Exact scope boundary — MOVES / STAYS / SPLIT / DEFERRED

**MOVES.** Occlusion responsibility for the settings screens, from each screen's own
`background: var(--page-bg)` declaration to `setView`'s park-and-hide swap (Stage A1). Stacking
responsibility, from explicit `z-index: 25`/`26` to root-stacking-context DOM order (Stage A2). The
settings screens' membership in the swipe's screen-kind taxonomy, from `overlay` to a kind of their
own (Stage B).

**STAYS, and is not touched by any stage.** `.nowplaying` — every declaration, its geometry, its
`z-index: 60`, its `inset: 0`, its `background: var(--page-bg)`, its `display: flex` column layout,
its retained native scrollbar, its touchmove bounce guard, `body.np-locked`, the navbar takeover, the
pill and the pill clone. The additive branch that keeps a settings screen mounted **under NP** for
the back-reveal (`js/nav.js:82`) — that branch is what makes NP's uniqueness work and it survives
verbatim. `showAppView`'s stale-settings sweep (`js/app.js:483`) — it is **not** dead after this
plan; its remaining live case is precisely the NP one (NP opened from Options, then swiped to the
chapter list). Each settings screen's inset geometry, padding, own scroller, `scrollbar-width: none`
membership and entry-time `scrollTop = 0` reset. `overlayFilmstrip` (`js/nav.js:175-194`) and both
its call sites. `Nav.SETTINGS_SUBS`, `isSub`, `overlayEl`, `viewElFor`, `renderScreen`, every hub row
and every back button. The `#home.parked` recipe and `.browsepage.parked`.

**SPLIT across the seam.** `NAV.isOverlay` — its **name** and its **only consumer** separate in
Stage B. It stays a pure name-check in `js/nav.js`, but the thing it identifies stops being "an
additive overlay" and becomes "Now Playing". `Swipe.kindOf` (`js/swipe.js:58-63`), its single
consumer, gains a second membership test for the settings names.

**DEFERRED, with the consumer named.** Parking `#browse` off-viewport instead of `display: none` on
the way into a settings screen, to keep its decoded covers warm — the consumer is a
browse→settings→browse round trip on a long list, and no stage introduces it because the identical
cost already ships on browse→home (`js/nav.js:74`). Named in §15 R-B. Restoring a settings screen's
scroll position on re-entry the way a `.browsepage` does (`js/browse.js:489`) instead of resetting it
(`js/nav.js:147`) — the decision does not ask for it and no consumer needs it; deliberately out of
scope. Exporting one screen registry from `Nav` (already named as owed in
`docs/swipe-model.generated.txt:19-29`) — Stage B makes the case for it stronger but does not build
it.

## 5. Target design — what Options becomes

**Invariant S1 — a settings screen is a peer, not an overlay.** `#options` and the five subs are
shown by removing `.hidden` and hidden by adding it, exactly one at a time, by one operation.

**Invariant S2 — no screen but `.nowplaying` declares a page background.** After Stage A1 the legal
painter set of `--page-bg` is exactly `body::before` and `.nowplaying`.

**Invariant S3 — entering a settings screen is a screen switch.** It parks `#home` and hides
`#browse`, exactly as entering Browse does. Nothing live remains behind it.

**Invariant S4 — Now Playing is unchanged in every respect.** No declaration of `.nowplaying`, no
`np-locked` rule, no pill, no `js/nav.js:82` branch and no NP-only branch anywhere is added, removed
or re-timed by any stage.

### 5.1 Host element, per-page elements, show/hide mechanism

**Host element: none is added, and none is needed.** The `.browsepage` model needs a host only
because a page declares no box (§3.2). Each settings screen already declares the identical box:
`position: fixed; left: 0; right: 0; top: calc(var(--safe-top) + 51px); bottom: calc(var(--nav-h) +
var(--nav-pad)); overflow-y: auto` at `css:215-219` and `css:780-784`, byte-matching `#browse` at
`css:185-189`, with the same `body.has-player` re-inset at `css:227` and `css:790-791` matching
`css:191`. Introducing a host would mean moving six existing boxes into a seventh and re-parenting
the markup for no behavioural gain — it would be a larger change that delivers the same three
properties. **Requirement, not prescription:** S1–S3 must hold; a host is one way to reach them and
is rejected here on cost, not on correctness.

**Per-page elements: unchanged.** `#options`, `#general`, `#playback`, `#buffering`, `#downloads`,
`#diagnostics` keep their ids, their markup, their modules and their back buttons. `index.html` is
not edited by any stage.

**Show/hide mechanism.** `js/nav.js` `setView` loses two things and gains nothing:

1. The park-and-hide guard at `js/nav.js:56` narrows from `if (!npOpen && !optOpen && !subOpen)` to
   `if (!npOpen)`. Now Playing keeps the additive exemption; the settings screens lose it. Entering
   `options` therefore parks `#home` and hides `#browse` through the code path already used by
   `browse` and `home`, including the `d.browseWillHide()` edge call.
2. The two-line settings visibility block at `js/nav.js:83-84` — `$('options').classList.toggle(
   'hidden', !(optOpen || subOpen))` followed by the sub loop — collapses to the single
   `showPage`-shaped loop that makes co-visibility impossible by construction:
   `for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);`
   inside the retained `if (!npOpen)` guard. The local `optOpen` and `subOpen` (`js/nav.js:48-49`)
   have no remaining reader and are deleted.

That is the whole product change for Stage A1. `applyScreen`'s settings branch (`js/nav.js:144-149`),
`setNavActive('options')`, the render dispatch and the scroll reset are untouched.

### 5.2 Stacking, after nothing lives underneath

`z-index: 25` on `#options` (`css:218`) exists to "cover page content" (`css:210`) and `z-index: 26`
on the subs (`css:783`) exists so "a sub-screen filmstrips ON TOP of it" (`css:775-776`). Stage A1
removes both causes: there is no page content underneath, and two sub/hub panes never occupy the same
screen space. Stage A2 deletes both declarations, putting the settings screens at `z-index: auto` —
the same tier `#browse` deliberately occupies (`css:177-183`).

**What this changes, stated exactly.** Today `#options` (25) paints above `#home` (20). After A2 it
paints below it. That inversion is only observable if the two ever overlap. They do not: a filmstrip
moves both panes with one shared delta and a fixed base separation, measured edge-to-edge with zero
gap or overlap for the entire live drag (`PLAN-swipe-declone.md` §15 R2, real-engine measured, and
the basis Stage 1 shipped on). At the two edges of a drag the movers sit at `0` and `±w` and still do
not overlap. At finalize, `resetSwipeStyles` clears the transform and `setView` applies the park
inside one synchronous `applyScreen` call (`js/nav.js:131` then `:140`/`:145`), so no frame is
painted between the two states. **A2 is nevertheless the one item in this plan whose confirmation is
compositor-dependent, so it is its own shippable stage with its own device gate and a stated fallback
(§15 R-F).** The topbar (30), transport (35) and navbar (40) all still paint above — `auto` is below
every one of them, which is the same relationship `#browse` already has and the same conclusion
`PROBE-np-uniqueness.md` §7.3 reaches for the inset screens.

## 6. Contract change

```vitruvius-contract
# field | class
fromKind | identity
toKind | identity
sourceHost | identity
destinationHost | identity
```

Structural notation — the exact value domains, before and after. Stages A1 and A2 change **none** of
this; Stage B changes all of it.

```
BEFORE (HEAD)
  Nav.isOverlay(v)        -> v === 'options' || v === 'nowplaying' || isSub(v)
  Swipe.kindOf(v)         -> 'home' | 'browse' | 'overlay'
  classifyTransition(...) -> { fromKind: Kind, toKind: Kind,
                               sourceHost: 'overlay' | 'in-flow',
                               destinationHost: 'overlay' | 'browse-host' | 'home',
                               decorations: frozen [] }
  Swipe.KINDS             = ['home', 'browse', 'overlay']
  structural cases        = 8   (3 kinds, 9 pairs, minus home->home)

AFTER STAGE B
  Nav.isOverlay(v)        -> v === 'nowplaying'
  Swipe.kindOf(v)         -> 'home' | 'browse' | 'settings' | 'overlay'
  classifyTransition(...) -> { fromKind: Kind, toKind: Kind,
                               sourceHost: 'overlay' | 'in-flow',
                               destinationHost: 'overlay' | 'browse-host' | 'home',
                               decorations: frozen [] }
  Swipe.KINDS             = ['home', 'browse', 'settings', 'overlay']
  structural cases        = 14  (4 kinds, 16 pairs, minus home->home, minus overlay->overlay)
```

**`overlay->overlay` is DELETED, not re-valued.** After Stage B the `overlay` kind has exactly one
member, `nowplaying`, and a pair whose source and destination are the same bare screen name is
documented impossible-before-the-planner (`test/fixtures/swipe-plan-spec.mjs:98-106`). A retained
`overlay->overlay` row would be an unreachable expectation — the dead-branch pattern this project
forbids and the stage-3 review removed.

**The host projection keeps two kinds mapping to one value, deliberately.** `sourceHost` stays
`fromKind === 'overlay' ? 'overlay' : 'in-flow'` widened to `(fromKind === 'overlay' || fromKind ===
'settings') ? 'overlay' : 'in-flow'`, and `destinationHost` likewise. The value is correct for both:
it selects `env.sourceEl`'s `overlayEl(v)` branch (`js/app.js:524`), which is `byId(v)` — and both
kinds resolve their element by id. **Recommendation, not a requirement:** rename the value
`'overlay'` to `'by-id'` in the same commit, because a value name that survives its concept is the
exact staleness class §1 already records twice in this file. The invariant is that no shared name may
mean two different things; the rename satisfies it and so would a comment, so the choice is the
builder's. Renaming costs the same 14 `expectedHosts` rows Stage B rewrites anyway.

**Migration (U10).** `test/fixtures/swipe-plan-spec.mjs` is the hand-written independent oracle and
changes in the same commit as `js/swipe.js`; that two-part edit is deliberate and is what a review
sees. `docs/transition-matrix.generated.txt` and `docs/swipe-model.generated.txt` are regenerated in
the same commit (`node tools/gen-transition-matrix.mjs`, `node tools/gen-swipe-model.mjs`) or their
guard tests redden. `tools/mutate.mjs:487-489` pins the `sourceHost` projection line verbatim and
must be re-pointed in the same commit or the anchors gate reddens with `ANCHOR NOT FOUND`.
`classifyTransition`, `constructionPlanFor` and `finalizationPlanFor` keep every key they have — no
exact-key contract shape changes, only value domains — so `test/contract-function-gate.test.js` needs
no edit.

## 7. Value and ownership ledger

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
settings screen occlusion | behavior | inout | the setView park-and-hide swap | the compositor painting the settings screen rect | Nav.setView | from screen entry to screen exit | PEERPARK cell plus device row R-C
settings screen exclusivity | behavior | out | the single setView visibility loop over options and every sub | the hidden class on each of the six screen elements | Nav.setView | from screen entry to screen exit | ONEPAGE cell
home parked state on entering a settings screen | behavior | inout | the narrowed setView park guard | the home element parked class | Nav.setView | from settings entry until a non-settings screen is applied | PEERPARK cell
browse hidden state on entering a settings screen | behavior | inout | the narrowed setView park guard | the browse element hidden class | Nav.setView | from settings entry until browse is applied again | PEERPARK cell
browse virtual controller anchor capture | behavior | out | the browseWillHide edge call in setView | Browse.deactivate which reads real geometry before display none lands | Nav.setView | one call per browse exit | PEERPARK cell second mutant
settings screen mounted under Now Playing | behavior | inout | the retained npOpen guard | the settings element revealed when Now Playing closes | Nav.setView | from Now Playing entry to Now Playing exit | NPUNTOUCHED cell
fromKind | identity | out | Swipe.kindOf | constructionPlanFor and finalizationPlanFor | Swipe.kindOf | per gesture | KINDPLAN cell
toKind | identity | out | Swipe.kindOf | constructionPlanFor and finalizationPlanFor | Swipe.kindOf | per gesture | KINDPLAN cell
sourceHost | identity | out | the classifyTransition host projection | the env sourceEl branch selector in start | Swipe.classifyTransition | per gesture | KINDPLAN cell host assertions
destinationHost | identity | out | the classifyTransition host projection | the env renderDestination branch selector in start | Swipe.classifyTransition | per gesture | KINDPLAN cell host assertions
overlay kind membership | identity | out | Nav.isOverlay | Swipe.kindOf which is its only consumer | Nav.isOverlay | module lifetime | OVERLAYISNP cell
```

**No dead field is added.** Every row is an existing value whose producer, owner or membership
changes. Two rows record narrowings (`overlay kind membership`, `settings screen occlusion`) because
a responsibility whose owner changes is exactly the thing that otherwise survives in both places.

## 8. Ordering

Ordering requirements that are **correctness**, not incidental:

1. **The transform is cleared before the park is applied, at finalize.** `resetSwipeStyles`
   (`js/nav.js:113-119`) already runs at the top of `applyScreen` (`js/nav.js:131`), ahead of
   `setView`. Unchanged, and named because Stage A1 now makes `setView('options')` park `#home` on a
   path where it previously did not — a park applied while an inline `translateX` is still on the
   element would compose `translateX(-101vw)` with the gesture's residue.
2. **`d.browseWillHide()` runs before `.hidden` lands on `#browse`.** Already true at
   `js/nav.js:60-65`, and the reason is stated there: a hidden box measures zero, so the virtual
   controller's anchor capture must happen from real geometry. Stage A1 routes a new transition
   (browse→settings) through this edge, so the ordering becomes load-bearing on a path where it was
   previously never exercised.
3. **The six-way visibility loop is one operation.** Whatever form it takes, showing one settings
   screen and hiding the other five must not be split into a show-then-hide pair that another call
   could interleave — that split is the mechanism of the defect being fixed.
4. **Stage B's production edit and its frozen-spec edit land in one commit.** `js/swipe.js`'s kind
   domain and `test/fixtures/swipe-plan-spec.mjs`'s structural-case set are the two halves of one
   oracle; splitting them leaves the suite green against a spec that no longer describes production.

Incidental and free to move: the order in which the two CSS declarations are deleted in A1, the order
of the A2 z-index deletions, and the order in which the new structural-case rows are written.

## 9. Runtime-dependency policy

`js/swipe.js` stays DOM-free at module load and reads the world only through the injected `env`
(`env.document`, `env.navPill`, `env.sourceEl`, `env.renderDestination`). **This plan adds no ambient
read and no injected dependency.** Stage B changes only pure name-check and projection logic
(`kindOf`, the two host ternaries, the `KINDS` array) — none of which touches `env`. No value is
lazily cached, so there is no invalidation policy to define. No `getComputedStyle`, `window.innerWidth`
or `matchMedia` call is added anywhere.

**Every ambient and injected value crossing a declared range, named — including the untouched ones.**

- **`document.body.classList` token `np-locked`** — written at `js/nav.js:87` and cleared at
  `js/app.js:534`/`:571`. **UNTOUCHED by every stage.** It is keyed to Now Playing, which S4 puts out
  of scope. No cell asserts it beyond NPUNTOUCHED's fixture sanity.
- **`d.browseWillHide`** (`js/nav.js:65`) — the injected hook wired to `Browse.deactivate()`
  (`js/app.js:2870`). **Not modified, but newly reached**: Stage A1 makes browse→settings cross the
  shown→hidden edge that calls it. Its behaviour at the new call site is identical to its behaviour at
  the browse→home site. Asserted by PEERPARK's second mutant.
- **`d.isSignedIn`** (`js/nav.js:93`) — gates the navbar's `hidden` toggle. **UNTOUCHED**; no stage
  reads or writes it.
- **`d.updatePlayerUI`** (`js/nav.js:94`) — the trailing reconcile that runs after every `setView`,
  including the settings entries this plan re-routes. **UNTOUCHED**; its behaviour at those call sites
  is unchanged.
- **`d.byId`** — the single injected element lookup through which `setView` and `applyScreen` resolve
  every screen. **UNTOUCHED**; no call site changes and no new lookup is added. The collapsed
  visibility loop resolves the same six ids the two statements it replaces resolved.
- **`d.renderScreen`** (`js/nav.js:146`) — the injected settings-screen render dispatch, wired to
  `renderScreen` at `js/app.js:2869`. **UNTOUCHED**: `applyScreen`'s settings branch keeps its
  `if (render) d.renderScreen(desc.v)` call unchanged, on the same condition, for all six screens.
- **`d.renderNowPlaying`** (`js/nav.js:151`) — the injected Now Playing render dispatch. **UNTOUCHED
  by every stage**, and named explicitly because it crosses `applyScreen`, a declared range: S4 puts
  every Now Playing path out of scope, and the NP branch of `applyScreen` (`js/nav.js:151`) is not
  read, re-ordered or re-conditioned by any step.
- **`d.renderBrowse`** (`js/nav.js:154`) — the injected Browse render dispatch, wired to
  `Browse.render`. **UNTOUCHED in shape**, and newly reached on one path: returning from a settings
  screen to Browse now re-enters through the same `applyScreen` browse branch that a return from Home
  already uses, so `Browse.render` re-activates the page via `showPage()` (`js/browse.js:304-318`).
  No call site is added or removed.
- **`env.scrollY`** (`js/app.js:523`, `() => window.scrollY || 0`) — the one ambient scroll read in
  the declared `js/app.js:515-539` range. **Its seam route is unchanged and no stage touches it**: it
  crosses into `js/swipe.js` only as a field of the injected `env` object handed to
  `Swipe.buildConstruction` (`js/app.js:543`), never as an ambient `window` read inside `js/swipe.js`.
  Its sole reader is `paneBuilders`' clone path, which only `browse→browse` reaches; no settings
  transition builds a pane, so no stage here adds, removes or re-routes a read of it. It is named
  rather than omitted because a value crossing a declared range without a stated route is
  indistinguishable from one the plan forgot.
- **`NAV` in `js/swipe.js:49-50`** — the module-scope handle resolved from `window.Nav` or `require`.
  **UNTOUCHED in shape**; Stage B changes what `NAV.isOverlay` returns, not how it is reached.

## 10. Lifecycle and ownership

- **Creates.** Nothing is created by any stage. No element, no wrapper, no controller, no listener.
- **Borrows.** Unchanged. Every settings screen already moves as a `borrowed-real` mover on every
  transition (`js/swipe.js:379`, via `plan.outgoing === 'real-source'`), and still does after Stage B.
- **Mutates.** The gesture writes `style.transform` on the borrowed settings element and clears it in
  `resetSwipeStyles`, which already enumerates every settings id (`js/nav.js:116`). Unchanged.
- **Mounts and unmounts.** This is the one lifecycle change. The settings **mounted set** shrinks from
  at most two (a sub plus its hub, `js/nav.js:83`) to exactly one. The removed member is the hub kept
  under its own child; the retained exception is a settings screen kept under **Now Playing**
  (`js/nav.js:82`), which is untouched.
- **Deactivates.** `Browse.deactivate()` gains the browse→settings trigger edge. Nothing owns a new
  handle: `deactivate()` is idempotent with respect to an already-inactive controller
  (`js/browse.js:332` no-ops when `activeEntry()` or `_vctl` is absent), and re-entry activation stays
  owned by `showPage()` (`js/browse.js:304-318`), which the existing `renderBrowse` path already calls.
- **Releases and destroys.** No pane, timer, frame, listener or observer is created or retired. The
  `.nav-ghost` sweeps, `disposeOwnedPanes`, the row hold and the session-identity guards are all
  outside this plan's surface.
- **Nothing added now is justified only by a later stage.** Stages A1 and A2 add no field and no
  branch — they are subtraction plus one narrowed condition. Stage B adds one kind name whose
  consumers exist in the same commit.

## 11. The transition-kind consequences

**11.1 — What `overlay` means after Stage B: Now Playing, alone.** `Nav.isOverlay(v)` returns `true`
for exactly one input, `'nowplaying'`, and `false` for every other screen name in the registry. This
is checkable end to end because **`isOverlay` has exactly one consumer in the entire codebase**:
`Swipe.kindOf` at `js/swipe.js:61`. A grep over `js/**` for `isOverlay` returns `js/nav.js:34` (the
definition), `js/nav.js:198` (the export) and `js/swipe.js:61` (the call). No other module, and no
production branch, reads it.

**11.2 — The generated matrix, row by row.** `docs/transition-matrix.generated.txt` today reports 12
screens in 3 kinds and an 8-row construction table. After Stage B:

- The `registry` block gains a fourth line. `home` keeps 1 member; `browse` keeps 4; a new `settings`
  line carries the 6 (`options`, `general`, `playback`, `buffering`, `downloads`, `diagnostics`);
  `overlay` drops to 1 (`nowplaying`). **12 screens and 132 ordered pairs are unchanged** — only the
  kind projection over them changes.
- The construction table goes from 8 rows to 14. **Retained unchanged in every column:** `home→browse`,
  `home→overlay`, `browse→home`, `browse→browse`, `browse→overlay`, `overlay→home`, `overlay→browse`.
  **Deleted:** `overlay→overlay` (its kind now has one member, so it is unreachable — §6).
  **Added, seven rows:** `home→settings`, `browse→settings`, `settings→home`, `settings→browse`,
  `settings→settings`, `settings→overlay`, `overlay→settings`.
- **No added row carries a new construction value.** Every `settings` row takes the value set the
  corresponding `overlay` row carries today: a settings source is `outgoing: 'real-source'`, a
  settings destination is `incoming: 'real-destination'` with `renderDestination: 'none'`, and
  `abortRender` is `'none'` for every one of them including `settings→settings` (the six screens are
  static, pre-existing, separately-mounted elements — showing General does not overwrite the
  `#options` node, so an abort has nothing to restore). Stage B is therefore a pure **classification**
  change: it renames and re-partitions membership and changes no decision the swipe makes.
- The three trailing counts are unchanged: pairs building a pane stays **12 of 132** (browse→browse
  only), pairs re-rendering on abort stays **12**, pairs carrying the NP pill stays **22** (11 + 11,
  NP at either endpoint).

**11.3 — What `test/fixtures/swipe-plan-spec.mjs` must become.**

- `REPRESENTATIVE` (line 29) gains a fourth entry and reassigns one:
  `{ home: 'home', browse: 'books', settings: 'options', overlay: 'nowplaying' }`. Reassigning
  `overlay` from `'options'` to `'nowplaying'` is load-bearing — leave it and every "overlay" case is
  exercised by a screen that is no longer an overlay.
- `STRUCTURAL_CASES` (lines 58-67) goes 8 rows → 14: delete the `overlay→overlay` row (line 66), add
  the seven `settings` rows listed in 11.2, each with `expectedHosts` following the widened
  projection — a settings endpoint projects `sourceHost: 'overlay'` / `destinationHost: 'overlay'`
  (or `'by-id'` if the §6 rename is taken).
- **`MODIFIER_CASES` (lines 178-201) needs no change and must not be "fixed".** Its two NP cases are
  `nowplaying→books` and `books→nowplaying`, which stay `overlay→browse` and `browse→overlay` — the
  case names in the prose already read "overlay->browse" and are still literally correct.
- The header comment block (lines 32-57) restates the projection formula verbatim; it changes with the
  formula or it becomes a second, wrong copy of the contract.
- `paneOf` (line 73), `NP_SCREEN`, `NP_DECORATION`, `SEC15_CASES`, `PARAM_FAMILIES` and every
  descriptor scenario are **unchanged** — none of them keys on the overlay kind.
- `docs/swipe-model.generated.txt` §2's case table renames two rows (`overlay -> overlay` becomes
  `settings -> settings`; `overlay -> browse  options() -> books()` becomes `settings -> browse`) and
  §3's "overlay->overlay reachability" note becomes a settings→settings reachability note — its
  content is unchanged, because the mechanism it describes is still `openSub()` pushing a sub-screen
  on top of Options (`js/app.js:162-168`).

**11.4 — What does not change in `js/swipe.js`.** `constructionPlanFor`'s outgoing rule
(`js/swipe.js:167`) keys on `browse && browse` and is untouched. `finalizationPlanFor`'s rule
(`js/swipe.js:203`) keys on the same and is untouched. `buildConstruction`, `paneBuilders`,
`ghostApp` and `npPillClone` are untouched. The edits are: `kindOf` gains a settings test, `KINDS`
gains a member (which makes the two guard throws at `:152`, `:197`, `:200` accept it), the two host
ternaries widen, and `constructionPlanFor`'s `toKind` chain gains a `settings` arm alongside the
existing `overlay` arm.

## 12. The deletion list

Removing machinery is the point of this plan. It is not complete until each of these is gone from HEAD.

**css/app.css — Stage A1**

1. `background: var(--page-bg);` on `#options` (`css:222`).
2. The two-line comment justifying it (`css:220-221` — "#options is an ADDITIVE overlay that paints
   over a live, un-parked page underneath, so it needs its own background").
3. `background: var(--page-bg);` on the five-sub group (`css:787`).
4. The two-line comment justifying it (`css:785-786`).
5. The "Options = additive overlay, same iOS-26 reasoning as Now-Playing" framing in the `#options`
   header comment (`css:207-210`) and the matching "Same additive-overlay model as #options" framing
   in the subs header comment (`css:772-776`) — replaced by the peer statement, not merely edited.

**css/app.css — Stage A2**

6. `z-index: 25;` on `#options` (`css:218`) and the "z 25: covers page content" clause (`css:210`).
7. `z-index: 26;` on the five-sub group (`css:783`) and the "z 26: one above #options so a sub-screen
   filmstrips ON TOP of it" clause (`css:775-776`).

**js/nav.js — Stage A1**

8. The `optOpen` and `subOpen` terms in the park-and-hide guard (`js/nav.js:56`) — the guard becomes
   `if (!npOpen)`.
9. The six-line additive-overlay rationale comment (`js/nav.js:50-55`) — the false premise itself
   (§1), not merely its wording.
10. The `const optOpen` and `const subOpen` declarations (`js/nav.js:48-49`) — dead once 8 and 11 land.
11. The `$('options').classList.toggle('hidden', !(optOpen || subOpen))` statement (`js/nav.js:83`) —
    this line **is** the co-visibility defect — and the separate sub loop (`js/nav.js:84`), both
    replaced by one six-way loop.
12. The six-line comment explaining why the hub is kept mounted under its child (`js/nav.js:76-81`) —
    the mechanism is gone, and its two claims are separately answered (§15 R-D).
13. The "additive overlays (like NP): no document scroll changes" claim in `applyScreen`'s settings
    branch comment (`js/nav.js:141-143`).

**js/swipe.js — Stage B**

14. `'options'` and the `isSub(v)` term from `Nav.isOverlay` (`js/nav.js:34`) — it collapses to
    `v === 'nowplaying'`.
15. The `overlay → overlay` expectation, everywhere it is written: `test/fixtures/swipe-plan-spec.mjs:66`,
    the corresponding generated matrix row, and the `docs/swipe-model.generated.txt` §2 case row. It is
    unreachable after B (§6) and an unreachable expectation is dead code in a fixture.
16. The stale "overlay" wording in the `js/swipe.js` header (`:46-48`, "The overlay membership is the
    single source in Nav") and in `classifyTransition`'s projection comment (`:96-101`), where the word
    now names one screen instead of seven.

**test/ and tools/**

17. `#options` and `'#downloads, #general, #playback, #buffering, #diagnostics'` from
    `OPAQUE_SELECTORS` in `test/page-bg-single-painter.test.js:26-29` — they move to
    `TRANSPARENT_SELECTORS`; `OPAQUE_SELECTORS` becomes `['.nowplaying']` alone.
18. The whole "THE MODEL" header block of that file (`test/page-bg-single-painter.test.js:4-20`),
    which describes the additive split as the source of truth. Replaced, not amended.
19. `test/nav.test.js:36-44` — "a sub-screen keeps the Options hub MOUNTED underneath it (build .106)".
    Its assertion is the defect. The test **name and body invert** rather than being deleted: the cell
    it occupies (a sub-screen's effect on its hub) still needs coverage, now in the opposite direction.
20. `Nav.isOverlay('general') && Nav.isOverlay('options')` from `test/nav.test.js:105` (Stage B).
21. `tools/mutate.mjs:487-489` — the `sourceHost` projection anchor, re-pointed to the widened line in
    the same commit (Stage B). Any anchor whose target text this plan deletes is de-registered in the
    same commit, or `test/mutation-anchors.test.js` reddens with `ANCHOR NOT FOUND`.

**Explicitly NOT deleted, and each for a stated reason:** `js/nav.js:82`'s `if (!npOpen)` guard (it is
the mechanism of NP's uniqueness); `js/app.js:483`'s stale-settings sweep (its live case is the NP
one); `overlayFilmstrip` and both call sites; `Nav.SETTINGS_SUBS`, `isSub`, `overlayEl`, `viewElFor`;
the settings screens' geometry, padding, scrollers and `scrollbar-width: none` membership; every
`.nowplaying` declaration; `css/app.css:41`'s red diagnostic gradient (standing user constraint).

## 13. Staged sequence with owners

**One canonical list. Each step names its owner. No step depends on a later one.**

| # | Step | Owner |
|---|---|---|
| 1 | Stress this plan; verdict forge / temper / scrap. | the plan reviewer |
| 2 | Author the Stage-A1 red cells: `ONEPAGE`, `PEERPARK`, `NOSETTINGSBG`, `NPUNTOUCHED`. Red at HEAD. | the test author |
| 3 | **Stage A1 build.** `js/nav.js`: narrow the park guard to `if (!npOpen)`; collapse the settings visibility block to one six-way loop; delete `optOpen`/`subOpen`; scrub the three false comments. `css/app.css`: delete both `background: var(--page-bg)` declarations and their justifying comments; rewrite both header comments to the peer statement. Invert `test/nav.test.js:36-44`. Rewrite `test/page-bg-single-painter.test.js` to §16. Bump the build number. | the builder |
| 4 | **Device gate A1.** Open Options; open each of the five subs and come back; Options from Home and from Books; swipe-back from a sub to the hub and from the hub to Books; open Now Playing from a sub and swipe back to it. **This is the step that answers the user's report** — the two-screens-through-each-other render must be gone. Watch specifically for cover re-decode returning Books→Options→Books (R-B) and for anything painting through a settings screen. | the user |
| 5 | Review the Stage-A1 build. | the code reviewer |
| 6 | Attack the ratified claim "with `#home` parked and `#browse` hidden, a settings screen needs no background of its own" by construction — the fracture to hunt is a reachable state in which a settings screen is visible while something other than `body::before` is behind it. | the adversary |
| 7 | **Stage A2 build.** Delete `z-index: 25` and `z-index: 26` and their two stated causes from the comments. Bump the build number. | the builder |
| 8 | **Device gate A2.** The same swipe set as step 4, plus commit and abort on each, watching the two drag edges for any flash or paint-order artefact. Fallback if it regresses: restore both z-index declarations alone — they are independent of A1, which stays shipped (§15 R-F). | the user |
| 9 | Author the Stage-B red cells: `OVERLAYISNP`, `KINDPLAN`. Red at HEAD. | the test author |
| 10 | **Stage B build.** `js/nav.js`: `isOverlay` collapses to `v === 'nowplaying'`. `js/swipe.js`: `kindOf` gains the settings test, `KINDS` gains `'settings'`, both host ternaries widen, `constructionPlanFor`'s `toKind` chain gains the settings arm. Rewrite `STRUCTURAL_CASES` to 14 rows and `REPRESENTATIVE` to four entries. Regenerate both `docs/*.generated.txt`. Re-point the `tools/mutate.mjs` host anchor. Bump the build number. | the builder |
| 11 | Build the classification gate to §16. | the builder |
| 12 | Audit the suite: every deleted or inverted assertion accounted for, no dimension left bare by the deletions. | the coverage auditor |
| 13 | Update `Claude/Subsystems/swipe-reveal.md` (the §23 overlay-background trigger, now answered), the board and the decision log; HEAD-wide scrub of "additive overlay" in records and comments that describe the settings screens. | the assistant |

**Stage A1 is independently shippable and independently valuable.** If A2 and B are never built, the
reported defect is closed at its cause, no screen but Now Playing paints a background, and the
remaining residue is two unused `z-index` declarations and a kind name that reads wrong.

## 14. Coverage and mutation matrix

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
ONEPAGE | at most one of the six settings screens is ever without the hidden class and applying any settings screen hides the other five including the hub under its own sub-screen | unit drive Nav applyScreen over each of the six settings screen names in turn against the real index fixture and after each assert exactly one of the six lacks the hidden class and that it is the applied one | NATURAL restore the hub-stays-mounted rule so options is unhidden whenever a sub is applied which makes two of the six visible and reddens the exactly-one assertion expected killing cell ONEPAGE | unit nav screen-state against the real index fixture
PEERPARK | entering any settings screen parks home and hides browse exactly as entering browse does and the browse controller deactivation hook fires on the shown to hidden edge before the hidden class lands | unit apply books then apply options against the real index fixture with a recording browseWillHide dep and assert home carries parked and browse carries hidden and the hook fired exactly once and observed browse still unhidden at the moment it ran | TWO mutants because one cannot exercise both edges. NATURAL-a restore the settings exemption in the park guard so home is not parked and browse is not hidden which reddens both class assertions. NATURAL-b move the browseWillHide call after the hidden toggle which reddens the observed-unhidden assertion. expected killing cell for BOTH is PEERPARK | unit nav screen-state against the real index fixture
NOSETTINGSBG | the page background variable is painted by exactly the fixed body pseudo-element and the Now Playing rule and by no other screen rule so every screen but Now Playing is transparent | gate read the shipped stylesheet and assert the set of selectors declaring the page background variable is exactly the body pseudo-element and the Now Playing selector and separately assert each of home browse options and the five-sub group declares no background property at all | TWO mutants. NATURAL-a re-add the page background to the options rule so the painter set gains a seventh member and the transparent assertion reddens. NATURAL-b delete the Now Playing background so the painter set loses its only screen and the painter-set assertion reddens. expected killing cell for BOTH is NOSETTINGSBG | gate source scan over the shipped stylesheet
NPUNTOUCHED | applying Now Playing leaves whichever settings screen was showing exactly as it was so the back reveal still finds it and Now Playing keeps its own background and its own stacking | unit apply options then apply nowplaying against the real index fixture and assert nowplaying is unhidden and options is still unhidden and the body carries the np-locked class and separately assert from source that the Now Playing rule still declares its inset and its z-index and its background | NATURAL narrow the npOpen guard in setView so Now Playing also hides the settings screens which reddens the still-unhidden assertion and breaks the back reveal expected killing cell NPUNTOUCHED | unit nav screen-state plus source scan
OVERLAYISNP | the overlay screen kind has exactly one member across the whole screen registry and that member is Now Playing while every settings screen classifies as the settings kind | unit enumerate the whole registry from Nav SETTINGS_SUBS and the Swipe browse family plus home options and nowplaying then assert Nav isOverlay is true for exactly one name and that Swipe kindOf returns overlay for exactly that one name and settings for all six settings names | NATURAL restore the options term to isOverlay so the overlay kind regains a second member which reddens the exactly-one assertion and flips the kindOf result for options expected killing cell OVERLAYISNP | unit pure classification over the derived registry
KINDPLAN | every settings endpoint yields the same construction and finalization values the overlay endpoint yielded before the split so the taxonomy change alters no decision the swipe makes and the unreachable overlay to overlay case is absent from the contract | unit call the real classifyTransition and constructionPlanFor and finalizationPlanFor over all fourteen structural cases from the rewritten frozen spec and compare every field against the hand-written expectation and separately assert the frozen spec contains no case whose source and destination are both the overlay kind | TWO mutants. NATURAL-a change the settings arm of the toKind chain to render into the browse host which reddens every settings destination row. NATURAL-b narrow the source host projection to exclude the settings kind which reddens every settings source host row. expected killing cell for BOTH is KINDPLAN | unit three-layer oracle against the frozen spec
```

**Six cells, ten mutants.** Every cell asserts a **source fact, a class-state fact or a pure-function
return** — never a rendered geometry, a paint order or a composited result. That is deliberate: jsdom
has no layout and no paint, so a CI cell asserting that a settings screen occludes what is behind it,
or that removing a z-index does not flash, **could not fail** and would be a false witness. Those
questions are §15's, and they are device-owed. This is the discipline
`PLAN-swipe-declone.md` §14 already recorded, applied here by not writing those cells at all.

**Cells that get inverted rather than kept:** `test/nav.test.js:36-44`. Its subject — what a
sub-screen does to its hub — is still a real dimension; only the correct answer changes. Deleting it
would leave the dimension bare, which is why §12 item 19 inverts it instead.

## 15. Risk, and what only a device can settle

**R-A — iOS fixed-bar seating. Verified independently; the mechanism is closed by construction.**
The hazard is that hiding a screen shrinks the document and trips iOS 26's ~50pt fixed-layer
displacement. Derived at HEAD rather than taken on trust: `#library` (`index.html:36`) contains
`.topbar` and the eight screen elements, and **every one of them is `position: fixed`** — `#home`
`css:161`, `#browse` `css:184`, `#options` `css:215`, the five subs `css:780`, `.nowplaying` `css:506`,
`.topbar` `css:236`. A `position: fixed` element contributes nothing to flow height, so `#library`
contributes nothing, and the signed-in document height is entirely `.app`'s
`min-height: calc(100% + 12vh)` (`css:75`) plus its padding. **Hiding or parking any screen cannot
change the document height, because none of them ever contributed to it.** The runway that seats the
bars is untouched by every stage. This is a source fact, and §16's second check pins it so a future
screen added without `position: fixed` reopens it loudly rather than silently. Residual: the *paint*
consequence is still a device observation, but there is no mechanism left for it to have.

**R-B — cover re-decode on browse→settings.** Today Options over Browse leaves `#browse` painted
(covered, not hidden); after A1 it is `display: none`, and iOS drops the decoded cover bitmaps of a
`display: none` subtree — the measured reason `#home.parked` and `.browsepage.parked` exist
(`css:78-85`, `css:92-97`). So returning Books→Options→Books may re-decode the list. **This is not a
new mechanism**: browse→home already hides `#browse` the same way at `js/nav.js:74` and ships. A1
extends an existing, accepted cost to one more transition. If it proves objectionable, the fix is a
`#browse.parked` recipe mirroring `#home.parked` — named, deliberately not built, and **not** a
reason to keep the additive model. Device row, step 4.

**R-C — the Stage 6f overlay-background precondition.** `Claude/Subsystems/swipe-reveal.md:396-400`
requires re-verification whenever an overlay's background changes. It fires here. It is answered in
the same record (lines 393-396): Swipe-declone Stage 1 superseded 6f on this axis, so there is no
ghost for the precondition to serve. What remains is the ordinary question of whether anything peeks
during an in-flow→settings drag now that the settings destination is transparent — and the answer
rests on `PLAN-swipe-declone.md` §15 R2's real-engine measurement of zero gap and zero overlap for
the entire live drag. **Device-owed, step 4**, because a measurement in Blink is not a claim about
WebKit compositing.

**R-D — the `.106` flash the hub-under-sub rule was built to prevent.** `js/nav.js:76-81` gives two
reasons for keeping the hub mounted. Both are re-derived here rather than assumed. (i) "the forward
slide-in exposes the base view": the hub→sub path uses `overlayFilmstrip` (`js/app.js:166`), which
moves **both** panes so they cover the viewport for the whole slide (`js/nav.js:167-174`) — the
exposure never applied to it. The `navTo` fallback path (`js/app.js:167`, reached from the book menu)
does use `slideInView`, which animates only the incoming pane; after A1 what shows behind it is
`body::before`, which is exactly what already shows during the shipped home→browse `navTo` slide.
(ii) "swipe-back would have no hub to filmstrip to": false at HEAD — `env.renderDestination`'s
settings branch removes `.hidden` from the destination itself (`js/app.js:536`) before it becomes the
incoming mover. **Both reasons are answered by reading; the visual result is device row, step 4.**

**R-E — the home↔settings park and un-park now takes the flash-suspect path.** After A1, opening
Options from Home parks `#home`, and swiping back un-parks it as the incoming mover — the same
un-park that Stage 6g identified as the home→books abort flash and mitigated with a permanent
compositing layer. The mitigation is the unconditional base rule at `css:168`
(`will-change: transform`, the device-validated form per `css:133-141`), so it already applies to the
new path. **Do not predict this either way**: it extends a known flash surface to a new transition,
the mitigation is present, and only the device settles whether it is clean. Device row, step 4.

**R-F — the z-index inversion (Stage A2 only).** Removing `z-index: 25`/`26` puts the settings screens
below `#home` (20) where they were above it. The argument that this is unobservable is the zero-overlap
measurement (§5.2), and the argument that no frame is painted mid-finalize is a synchronous-call
argument. Both are sound and neither is a compositor observation. **This is why A2 is its own stage
with its own device gate and an isolated fallback**: restoring the two declarations undoes A2 alone and
leaves A1 shipped, because the background removal and the stacking removal are independent.

**R-G — `overlayFilmstrip` between two transparent panes.** During a hub↔sub filmstrip both panes are
briefly unhidden and moving with no background of their own. They are set to their start transforms in
one synchronous block with `transition: none` before `void toEl.offsetWidth`
(`js/nav.js:180-183`), so no frame is painted with both at rest at the same place. Device row, step 4.

**Prior scars this plan is exposed to.** The swipe and screen machinery has invalidated verifications
through environment traps before (memory `tomeroam-swipe-repaint-saga`, eight of them), and a
device-confirmed fix has been shipped in a *variant* form and flashed (`translateZ(0)` for
`will-change`, `css:133-141`). Consequence: **the form that is device-tested is the form that ships**,
and an A1 pass on device is not evidence about A2 or B.

## 16. The gate — specification only, not built here

Two checks, one file, `test/page-bg-single-painter.test.js` extended in place plus one new
classification test. Both read source text or call pure production functions, so neither can be made
vacuous by the environment.

**16.1 — No screen but Now Playing declares a page background.** Replaces the existing three tests in
`test/page-bg-single-painter.test.js`. `TRANSPARENT_SELECTORS` becomes
`['#home', '#browse', '#options', '#downloads, #general, #playback, #buffering, #diagnostics']`;
`OPAQUE_SELECTORS` becomes `['.nowplaying']`. The painter-set assertion becomes
`['body::before', '.nowplaying']`. **Fails in both directions**: a screen that regains a background
enters the painter set and reddens the equality; `.nowplaying` losing its background leaves it and
reddens the same assertion. The `stripComments` and `ruleBody` helpers are reused unchanged so a
comment mentioning `background` cannot be misread as a declaration. **Honest limit, stated in the
file's own header:** it proves a textual property of `css/app.css`. A background painted from
JavaScript is outside it — that is `test/page-bg-js-painter.test.js`'s job, and that file's own
"three additive overlays" wording (`:4`) is scrubbed in the same commit.

**16.2 — The overlay classification cannot regrow a second member.** New unit test, the `OVERLAYISNP`
cell. It derives the registry rather than restating it — `Nav.SETTINGS_SUBS`, `Swipe.BROWSE_FAMILY`,
plus `home`, `options`, `nowplaying` — and asserts (a) `Nav.isOverlay` is true for **exactly one**
name across it, (b) that name is `nowplaying`, and (c) `Swipe.kindOf` agrees: `'overlay'` for exactly
that one, `'settings'` for all six settings names. Deriving the registry is what makes it fail when a
screen is added and forgotten, which is the same seam `test/screens.test.js:5-14` already guards from
the markup side. **Mutation evidence:** re-adding the `'options'` term to `isOverlay` must redden it;
adding a new settings screen to `SETTINGS_SUBS` without a `kindOf` arm must redden it. **Honest limit:**
it proves membership, not that the settings kind's plan values are right — that is `KINDPLAN`'s three-layer
oracle against the frozen spec.

**16.3 — Recommended, not required: every screen declares `position: fixed`.** R-A's whole safety
argument is that no screen contributes flow height. `test/screens.test.js:54-59` already asserts the
subs are in the fixed-overlay rule; widening that to every screen id would turn R-A's derivation into
a standing check. It is a recommendation because R-A holds at HEAD without it and adding it is not
needed for any stage to be correct.

**Wiring.** Both checks run in the normal `npm test` battery, therefore at pre-commit. 16.1 lands with
Stage A1 (it would fail on shipped code before it). 16.2 lands with Stage B, for the same reason.

## 17. How this changes the assumptions of `PLAN-swipe-declone.md` Stage 2

Stage 2 of that plan is separate work and this plan does not touch it. Three of its stated assumptions
move, and are recorded here so its next session does not re-derive them:

1. **§17's "the additive-overlay premise is void, and nothing here depends on it" stops being a
   recorded observation and becomes shipped behaviour.** Stage 2 should read the premise as already
   acted on rather than as an open note.
2. **The transition-kind table Stage 2 collapses gains a fourth kind (Stage B).** Stage 2's plan is to
   collapse `outgoing` to the single value `'real-source'` and `abortRender` to `'none'` once
   `browse→browse` stops cloning. That collapse is **unaffected in substance** — it is driven entirely
   by the `browse && browse` conjunction (`js/swipe.js:167`, `:203`), which Stage B does not touch —
   but it must be executed over **14 structural cases, not 8**, and it must not re-introduce an
   `overlay→overlay` row. If Stage B has not landed when Stage 2 runs, Stage 2 collapses 8 rows and
   Stage B re-expands them; the two orders are both correct and neither blocks the other.
3. **Stage 2's `#browse` → `display: contents` change does not generalize to the settings screens.**
   Stage 2 makes each `.browsepage` its own fixed inset own-scroll box and dissolves the host. The
   settings screens **already are** that shape, which is why this plan needs no host at all (§5.1).
   After both land, `.browsepage` and a settings screen are the same kind in the strong sense — each is
   its own fixed inset own-scroll box with no background and no stacking of its own — and the two plans
   converge rather than competing. Nothing in this plan makes Stage 2 harder; §5.1's choice not to add
   a host is what keeps them convergent, and adding one would have created the second model Stage 2 is
   trying to remove.

**Not changed by this plan:** Stage 1's de-cloning, the anti-clone gate
(`test/no-view-clone-gate.test.js`), `#home`/`#browse` transparency, and the `browse→browse` ghost.
None of them is read, edited or depended on by any stage here.

## Proportionality

Stage A1 is one narrowed condition, one collapsed loop, two deleted CSS declarations and four scrubbed
comments. Stage A2 is two deleted declarations. Stage B is a name-check, a kind name, two widened
ternaries and a rewritten fixture table that changes no value. **The change is small; the deletion
list, the transition-kind bookkeeping and the honest device-owed set are what make this document long.**
