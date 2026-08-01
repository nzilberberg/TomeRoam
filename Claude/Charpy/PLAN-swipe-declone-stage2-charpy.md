# Plan review — PLAN-swipe-declone.md, Stage 2 (`browse→browse`, §5.3)

Type: plan-review
Plan: `Claude/Plans/PLAN-swipe-declone.md` — status line reads `PLAN_READY — not reviewed`
Scope: **Stage 2 only** (§5.3 and what Stage 2 invalidates elsewhere in the plan). Stage 1 shipped and is device-confirmed; it is not re-opened here.
Round: 1
Reviewed at: HEAD `2db29be`, build `2026-07-31.290`, tree clean
Date: 2026-08-01

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["css/app.css:78-91","css/app.css:172-191","js/browse.js:60-80","js/browse.js:108-130","js/browse.js:200-300","js/browse.js:480-500","js/browse.js:640-662","js/nav.js:34-42","js/app.js:538-556","js/scrollbar.js:41-62"],"callee_ranges":["js/swipe.js:217-332"]} -->

## Applicability

- **defining_records: true** — Stage 2 rests on two records outside this plan: `PLAN-one-screen-type.md`
  §5.5 (the containment argument for `.alphaindex` during a gesture) and the `#browse` / `#home.parked`
  source comments that state why `#browse` carries no transform. Both are material and one of them
  Stage 2 falsifies. Reconciliation below.
- **boundary_relocation: true** — Stage 2 relocates the browse scroll box from `#browse` to each
  `.browsepage`, and relocates the virtual controller's measured element with it. Ledger in
  *Value and ownership ledger*.
- **callee_replacement: true** — Stage 2 part B retires `ghostApp` and its clone-fidelity helpers.
  Declared range `js/swipe.js:217-332` (`paneBuilders` through the end of `ghostApp`, covering
  `copyScroll`, `copyAnimPhase`, `ghostWrap`). The plan's own §8 effects table is sound; my one check
  on it is recorded at F9.
- **contract_shape: true** — Stage 2 removes `capture` from `buildConstruction`'s return, collapses
  `outgoing` to one value and deletes `finalizationPlanFor`. Gate impact is discussed under
  *Contract shape* below.

## Verdict

**Verdict: TEMPER** — the central claim of Stage 2 holds, but the specific mechanism §5.3 prescribes
does not. `display: contents` on `#browse` removes the box the swipe transforms, and `#browse` is the
mover element on four transitions that Stage 1 already shipped. Fix the five Structural findings and
build it; do not build §5.3 as written.

**What survives the strike, and it is the larger half.** Invariant D4 — a browse page owns its own
scroll offset natively — is correct and well-derived. The `sy` cache, the swap-clamp suppression and
`abortRender: 'rerender'` genuinely do exist only because two pages share one scroller, and removing
that sharing removes their reason. §5.3's named fallback (a second `#browse` host) is real, is
untouched by every finding below, and satisfies D4 equally. §6's contract collapse, §8's effects table
and §10's exact-key analysis are each accurate against HEAD. The defect is not in what Stage 2 wants;
it is in the one line that says how.

**What broke.** §5.3 and §5.1 contradict each other. §5.1's per-transition table lists the real
`#browse` as the mover for `home→browse` (incoming), `browse→home` (outgoing) and `browse→overlay`
(outgoing). §5.3 then removes `#browse`'s box. An element with `display: contents` generates no
principal box, and a transform applies only to an element that generates one — so the inline
`translateX` the drag writes every frame becomes inert on exactly those three transitions plus
`overlay→browse`. The plan's risk register reaches for this and stops one step short: R-D names
`display: contents` as removing "a box that something may depend on" and then reduces the exposure to
`getBoundingClientRect` returning an empty rect. The thing that depends on the box is not a
measurement. It is the animation.

---

## Defining records

| Record | Standing | Reconciliation |
|---|---|---|
| `PLAN-swipe-declone.md` §5.1 (per-transition mover table) vs §5.3 (`#browse` → `display: contents`) | Both governing, same document | **CONFLICT, material and unresolved.** §5.1 requires `#browse` to be a transformable mover on three transitions; §5.3 removes its box. Only one can be true. This is F1. |
| `PLAN-one-screen-type.md:863-873` (§5.5 — during a browse↔settings gesture `#browse` is an un-hidden mover whose inline transform **establishes a stacking context**, so `.alphaindex` is contained; "Containment, not hiding, is the reason during a gesture") | Ratified, and the stated ground for Stage A2's deletion of `z-index: 25`/`26` | **CONFLICT.** A `display: contents` element establishes no stacking context, because it has no box to transform. Stage 2 falsifies §5.5's mechanism. This is F2. |
| `PLAN-one-screen-type.md:1968-1976` — "Nothing in this plan makes Stage 2 harder … the two plans converge rather than competing" | Ratified claim | **CONFLICT.** The convergence claim is sound in the direction it was written (A1/A2 do not obstruct Stage 2) but is not symmetric: Stage 2 as written removes the premise A2's gate rests on. The record needs the reverse direction stated. |
| `css/app.css:98-126` — `#home.parked`'s Invariant P and the `overflow: hidden` derivation, including the explicit note at `:105-108` that `.browsepage.parked` diverges *because* a `.browsepage` is an IN-FLOW element with no `bottom` inset of its own | Ratified, device- and Blink-measured (`Claude/Loki/STRIKE-home-shift-m1-*`) | **CONFLICT.** Stage 2 makes `.browsepage` a `position: fixed` box with its own insets, which falsifies the stated reason the two park rules diverge. §12 lists `.browsepage.parked` under "Not deleted" and §5.3 never mentions it. This is F4. |
| `js/app.js:678-681` — "a persistent transform on `#browse` makes it the containing block for `position:fixed` descendants and permanently breaks the A-Z strip" (the `.195`/`.196` dead end); `css/app.css:172-183` — `#browse` "deliberately carries NO will-change / non-none transform" | Ratified source comments, recording a shipped regression | **AGREE with the plan, and they sharpen it.** Both records concern a *persistent* transform. §3's reading — a gesture-scoped transform is not that — is correct and I did not find a counterexample. They matter here only because they establish that `#browse`'s box and its transform behaviour are load-bearing and closely reasoned, which is what makes dissolving the box a change of that class rather than a cleanup. |
| `js/browse.js:290-296` and `css/app.css:78-85` (iOS drops decoded bitmaps for a `display:none` subtree; measured ROWS KEPT 68/68, src 22→22, +img 0) and `js/virtuallist.js:264-270` (an aborted `browse→browse` re-materialized the page; measured +img=72 −img=90, withSrc=0) | Ratified, device-measured | **GAP against §15 R5.** These are the two recorded mechanisms of the open abort-repaint symptom. R5 treats the symptom as something Stage 2 merely observes. Stage 2 perturbs both mechanisms. This is F5. |
| `js/nav.js:36`, `js/app.js:541`, `js/app.js:544` — the mover element resolution | HEAD source | **CONFLICT with §5.3**, and it is the proof for F1. Read directly rather than inferred. |

---

## Value and ownership ledger

Every value crossing the relocated boundary, with its owner after Stage 2. Rows marked **UNOWNED**
are the findings.

| Value | Class | Dir | Producer | Consumer | Owner after Stage 2 | Lifecycle | Verification |
|---|---|---|---|---|---|---|---|
| browse page scroll offset | geometry | inout | the user scrolling the page element | the same page on re-entry | the `.browsepage` element | page-element lifetime, bounded by the `MAX_PAGES = 12` LRU (`js/browse.js:20`) and `clearCache()` (`:76-82`) | PAGEISVIEW + device R4. Loss-on-eviction is at parity with HEAD: `sy` lives on the same cache entry, so both are dropped together. |
| the browse *container* role — append target, `innerHTML` wipe target, `.hidden` carrier | identity | — | `Nav.setView` (`js/nav.js:69`) and `Browse` | `js/browse.js:80`, `:204`, `:497` | **UNOWNED — F3.** §5.3 re-points the single `o.mount` at the page node, which silently moves these three call sites onto the wrong element. | F3 |
| the browse *scroller* role — `scrollTop`, `clientHeight`, `getBoundingClientRect` | geometry | inout | the page element | `js/browse.js:228`, `:252`, `:654-658` | the `.browsepage` element | F3 |
| per-controller measured element | identity | in | `virtualView` (`js/browse.js:638-660`) | `captureAnchor` (`js/virtuallist.js:247-250`), `_realize` | **UNOWNED — F3.** One shared `o.mount` is read by every page's controller, including the outgoing one during `showPage`'s deactivate loop. | F3 |
| parked-page box geometry (`top`, `bottom`, scroll range) | geometry | inout | `css/app.css:86-91` cascading over the new `.browsepage` base rule | the engine's scroll-anchoring machinery at un-park | **UNOWNED — F4.** `top: 0` overrides the new base inset; `bottom` cascades from it; the parked box becomes taller than the active box by `safe-top + 51px`. | F4 |
| the scroll surface identity the indicator keys on | identity | out | the scroll event target | `js/scrollbar.js:50` (`t.id === 'browse'`) | **UNOWNED — F6.** `.browsepage` carries no id (`js/browse.js:494-495`). | F6 |
| page entry position on a cache hit | geometry | out | `entryScrollY` / `anchorEntryY` | `applyScrollY` (`js/browse.js:226-228`) via `positionOnEnter` (`:256-268`), called at `:489` | **UNOWNED — F7.** Deleting `sy` makes `entryScrollY` return `0`, and the call site still writes it over the page's retained `scrollTop`. | F7 |
| `d.byId` (`js/nav.js:34-42`) | resource | in | `Nav` init | `appViewEl`, `viewElFor`, `setView` | unchanged — no call site changes and no lookup is added | Verified: §10's "UNTOUCHED" disposition is correct as a *lookup*. F1 concerns what the looked-up element can do, not the lookup. |
| `document.body.classList` token `np-locked` (`js/app.js:551`) | behavior | inout | the NP branch of `renderDestination` | the navbar button/pill CSS swap | unchanged — Stage 2 touches no NP path | Verified against `js/app.js:538-556`; §10's disposition holds. |
| `data-art` (`js/swipe.js`, within the retired callee range) | behavior | out | the retired clone builder | the art loader | retired with the callee; no node is created, so nothing re-triggers | F9 — verified as the only pre-mount data-attribute removal in the declared callee range. |

---

## Findings

### F1 — Structural, defect: `display: contents` on `#browse` makes the drag transform inert on four transitions

`#browse` is not only a container. It is the mover element the swipe transforms:

- `js/nav.js:36` — `const appViewEl = (v) => (v === 'home' ? d.byId('home') : d.byId('browse'));`
- `js/app.js:541` — `sourceEl: (host, v) => (host === 'overlay' ? overlayEl(v) : appViewEl(v))` — the
  **outgoing** mover for `browse→home` and `browse→overlay`.
- `js/app.js:544` — `if (host === 'browse-host') { showAppView(dest, true); return $('browse'); }` — the
  **incoming** mover for `home→browse` and `overlay→browse`, returned literally.
- `js/app.js:594`, `:615`, `:654` — `m.el.style.transform = 'translateX(' + … + 'px)'`, written at drag
  start, on every move, and at the settle.

An element with `display: contents` generates no principal box; a transform applies only to an element
that generates one. The inline `translateX` therefore has no effect, and those four transitions stop
animating — the outgoing view sits still and the incoming view never arrives from `±w`. There is no
paint boundary that hides this: the write is re-applied across the whole drag and every frame paints,
so it is visible from the first move, not a same-tick overwrite.

This also contradicts the plan internally. §5.1's table assigns "real `#browse`" as the mover on three
of those transitions and marks `browse→home` "Already correct (Stage 6i). **Untouched.**" §5.3 touches
it.

**The invariant, not the implementation.** Whatever `#browse` becomes, it must remain a *transformable
box* for as long as `nav.js:36` and `app.js:544` resolve movers to it. Removing its scroll ownership
does not require removing its box — those are separable, and only the first is what D4 asks for.
**Recommendation (not a requirement, and the builder may satisfy the invariant otherwise):** keep
`#browse` a `position: fixed` inset box and take only `overflow-y: auto` off it. I am naming one
consequence of that route so it is chosen with eyes open rather than discovered — see F1a.

### F1a — Structural, conditional: the fallback route has its own containing-block hazard, which must be settled with F1
**Condition:** `#browse` retains a transformable box **and** `.browsepage` becomes `position: fixed`.

Under that combination, a `browse→home` or `browse→settings` drag puts an inline transform on `#browse`,
which makes it the containing block for its `position: fixed` `.browsepage` descendants. Their
`top: calc(var(--safe-top) + 51px)` then resolves against `#browse`'s padding box — which already begins
at `safe-top + 51px` — so the page jumps down by roughly that amount for the duration of the drag, and
back at finalize. This is the same containing-block flip the plan already tracks for `.alphaindex` at
R3, applied to the whole page instead of a strip, and it is *new*: today `.browsepage` is in-flow
(`css/app.css:105-106`), so an ancestor transform merely moves it.

Both routes out of F1 therefore need a stated answer, and the plan currently has neither. This is
device- and engine-owed, not decidable in jsdom.

### F2 — Structural, conditional: Stage 2 falsifies `PLAN-one-screen-type.md` §5.5, which Stage A2's gate rests on
**Condition:** Stage A2 lands (deleting `z-index: 25` from `#options` and `z-index: 26` from the five
subs), in either order relative to Stage 2.

`PLAN-one-screen-type.md:863-873` argues that during a browse↔settings gesture `.alphaindex` (z24,
`css/app.css:702`) cannot outstack a settings screen because `#browse` carries an inline transform, a
non-none transform **establishes a stacking context**, and the strip is painted inside it —
"Containment, not hiding, is the reason during a gesture." That argument requires `#browse` to have a
box. Under §5.3 it has none, establishes no stacking context, and the strip stays in the root context
at z24. With A2 having reduced the settings screens to `auto`, z24 paints **over** them during the
gesture window.

Two things to record separately, because they have different conditions. The **paint regression** is
conditional on A2, since `#options` at z25 today still wins. The **record falsification** is not: the
moment Stage 2 lands, §5.5's stated mechanism is false and `PLAN-one-screen-type.md:1968-1976`'s
convergence claim ("Nothing in this plan makes Stage 2 harder") is true only in the direction it was
written. The reverse direction needs stating in that plan.

I am not reviewing Stage A2 or reopening its design; A2 is a separate tracked stage. This finding is
that Stage 2 removes a premise A2 depends on, which is a Stage 2 obligation to discharge.

**Note:** F1 and F2 share one root cause. If F1 is resolved by keeping `#browse` a transformable box,
F2 dissolves with it and needs no separate fix. If F1 is resolved another way, F2 must be answered on
its own.

### F3 — Structural, defect: `o.mount` carries two roles; §5.3 re-points it and names only one of seven call sites

§5.3 says the change is that "the virtual controller's env (browse.js:654-658) changes `o.mount` from
the shared host to the page node. The shape is unchanged." `o.mount` is a single injected reference
serving two distinct roles:

- **Container** (must stay `#browse`): `js/browse.js:80` `o.mount.innerHTML = ''`; `:204`
  `browseVisible = () => !!(o.mount && !o.mount.classList.contains('hidden'))`; `:497`
  `o.mount.appendChild(page)`.
- **Scroller** (must become the page): `:228` `o.mount.scrollTop = clampY(…)`; `:252`
  `o.mount.scrollTop + row.getBoundingClientRect().top`; `:654-658` the metrics closure; `:68-72` the
  scroll listener that Stage 2 deletes.

Re-pointing the single reference moves the three container call sites onto a page: `reset()` would wipe
one page instead of the container, `browseVisible()` would test the page's `.hidden` instead of the
container's, and a newly built page would be appended inside another page.

There is a second, quieter defect in the same mechanism. Every page's controller is created by
`virtualView` (`js/browse.js:638-660`) and each closes over the *same* `o.mount`. `showPage` deactivates
the outgoing controller before `.hidden` lands (`js/browse.js:286-291`), and `deactivate()` calls
`captureAnchor()` (`js/virtuallist.js:247-250, :253-262`), which reads `metrics.scrollY()` and
`metrics.listTop()`. If `o.mount` has already been re-pointed at the incoming page, the outgoing page's
anchor is captured against the wrong scroll box and silently saved — then read back by `anchorEntryY()`
on re-entry (`js/browse.js:265-267`). Nothing reddens; the page just returns to the wrong place.

**The invariant:** each virtual controller must measure the scroller of **its own** page, and the
container role must remain bound to `#browse`. A shared mutable pointer cannot express both.
**Recommendation, not a requirement:** the page element `m` is already in `virtualView`'s scope, so
capturing it per controller satisfies the invariant without a second injected field; the builder may
choose another construction that does.

The declared `source_ranges` in the plan's own gate declaration list `js/browse.js:640-660` for this
change. Per the boundary-crossing discipline the range is incomplete — `:60-80`, `:200-300` and
`:480-500` all cross the same boundary, and `:480-500` is declared nowhere in the plan.

### F4 — Structural, defect: `.browsepage.parked` becomes geometrically wrong, and its stated reason for diverging is falsified

`css/app.css:86-91` sets `top: 0` and declares no `bottom`. `css/app.css:105-108` states explicitly why
it diverges from `#home.parked`'s Invariant P: "a `.browsepage` is an IN-FLOW element with no `bottom`
inset of its own to inherit, so parking it needs its own `top: 0` to size it — the two park rules
diverge for that reason, not by oversight."

Stage 2 makes `.browsepage` a `position: fixed` box with `top: calc(var(--safe-top) + 51px)` and
`bottom: calc(var(--nav-h) + var(--nav-pad))`. The stated premise is then false, and the cascade
produces a wrong box: `.browsepage.parked` (specificity 0-2-0) still forces `top: 0`, while `bottom` now
cascades in from the new base rule — so the **parked** box is taller than the **active** box by
`safe-top + 51px`. That changes the box's scroll range across the park/un-park edge, which is exactly
what Invariant P exists to forbid, and `css/app.css:110-117` records a measured **-80px reveal jump**
from getting a parked, transformed scroll container's anchoring wrong.

§5.3 does not mention the park rule and §12 lists `.browsepage.parked` under "Not deleted", which reads
as "unchanged" when it in fact needs re-deriving. `body.has-player #browse` (`css/app.css:191`) must
also move to `.browsepage` and will then tie on specificity with `.browsepage.parked` — source order
decides, so state the intended order.

### F5 — Structural, defect: Stage 2 perturbs both known mechanisms of the open abort-repaint symptom; §15 R5 treats it as passive

The symptom — an aborted swipe repainting the whole view with the DOM provably untouched — has two
recorded, device-measured mechanisms:

- `js/browse.js:290-296` + `css/app.css:78-85`: iOS drops the decoded cover bitmaps of a `display:none`
  subtree, so an abort re-decodes every cover at once. Measured: ROWS KEPT 68/68, src 22→22, +img 0.
  Mitigation is `.browsepage.parked` — painted, off-viewport.
- `js/virtuallist.js:264-270`: an aborted `browse→browse` re-materialized the whole page. Measured:
  +img=72, −img=90, withSrc=0 at reveal, art loaded=34. Mitigation is `suspend()`.

§15 R5 says the symptom is device-owed and "Do not predict it either way," which is the right posture
for a passive observable. Stage 2 is not passive toward it. It **removes** one trigger
(`abortRender: 'rerender'`, `js/swipe.js:203` → `js/app.js:1229`), and it **adds** at least two causes
with the same observable signature: F4's park-geometry change relays out the whole list at exactly the
un-park moment, and moving the scroll container from `#browse` to `.browsepage` moves the engine's
scroll-anchoring surface — the precise class `css/app.css:110-117` measured at -80px.

**Answering the question asked: after Stage 2 as written, this defect becomes *less* attributable, not
more.** A post-Stage-2 abort repaint could be the original symptom, F4's box-height change, or the
relocated anchoring surface, and the device gate at step 10 cannot separate them. That is a real cost
and it is currently unrecorded. **Recommendation, not a requirement:** settle F4 before the Stage 2
device gate runs, so the gate observes one changed variable rather than three. If the plan instead
accepts the confound, R5 should say so explicitly rather than reading as neutral.

### F6 — Weak, defect: the custom scroll indicator goes dark on browse, and native scrollbars return

`js/scrollbar.js:95` listens for `scroll` on `document` in the capture phase, and `surfaceKind`
(`:47-53`) classifies by `t.id === 'browse'`. Under Stage 2 the scroll target becomes the
`.browsepage`, which carries no id — `js/browse.js:494-495` sets `page.className = 'browsepage'` and
nothing else. `surfaceKind` returns `null`, and `update()` (`:83-84`) takes the "unsupported surface"
branch and removes the indicator. The bar disappears on Books, Authors and files.

Separately, `css/app.css:811-814` hides native scrollbars by id, `#browse` among them. A
`.browsepage` scroller is not covered, so a native scrollbar returns where the engine draws one.

Both are one-line fixes, which is why this is Weak and not Structural — but neither is in the plan, and
the module header at `js/scrollbar.js:19-23` records that suppressing this bar on browse was a
user-reported bug once already.

### F7 — Weak, defect: deleting `sy` without touching the restore call site resets every browse re-entry to the top

The cache-hit path calls `positionOnEnter(desc, hit.el, hit.sy)` (`js/browse.js:489`), which calls
`applyScrollY(anchorY != null ? anchorY : entryScrollY(desc.v, savedY, trackY))` (`:256-268`), and
`entryScrollY` returns `savedY || 0` for every non-files view (`:222-224`). Delete `sy` and `savedY` is
`undefined`, so `applyScrollY(0)` writes `scrollTop = 0` over the page's natively retained offset on
every re-entry — the exact behaviour Stage 2 exists to preserve, inverted.

The plan says the `sy` save/restore "becomes redundant" but names only `:68-71`, `:112-118` and "the
`savedY` path in `entryScrollY`". The *call site* is the part that has to change, and `:480-500` is in
no declared range.

Two paths must survive the deletion and are worth naming so they are not swept up with it:
`playingTrackY` (`:242-255`, files pages open at the playing track, not at a saved offset) and
`anchorEntryY` (`:262-267`), which re-resolves a virtual page's logical anchor against the current model
because an SWR update landing while the page was hidden may have moved rows above it. `anchorEntryY`
guards model drift, not scroller sharing — a natively retained `scrollTop` does not make it redundant,
and the plan should say so before someone reads it as part of the same subtraction.

### F8 — Note, defect: every `file:line` citation in §12 and §16 is stale post-Stage-1, and one deletion target's text occurs twice

Stage 1 shipped, and the plan's line citations were written against pre-Stage-1 HEAD. Spot-checked:
`ghostApp` is at `js/swipe.js:297` (plan says `:279`); `ghostWrap` at `:276` (plan says `:259-264`);
the `53px` compensation at `:311` (plan says `:289`); the classification at `:167` (plan says
`:149-150`); `abortRender` at `:203` and `finalizationPlanFor` at `:196` (plan says `:186`);
`dropPanes` at `js/app.js:662` (plan says `:633`); the `#browse` rule at `css/app.css:184-190` (plan
says `css:176-184`); §16's registered exception cites `js/swipe.js:318`, actual `:338`.

One of these is a trap rather than a nuisance. §12 item 4 deletes "the id-stripping line
(`clone.querySelectorAll('[id]')…removeAttribute('id')`)". That text occurs **twice** —
`js/swipe.js:312` inside `ghostApp`, and `js/swipe.js:339` inside `npPillClone`, which §12 explicitly
retains. A text-directed deletion removes both and breaks the Now Playing pill decoration.

### F9 — Note, defect: the retired callee's pre-mount attribute effect, checked

The only pre-mount data-attribute removal in the declared callee range `js/swipe.js:217-332` is
`removeAttribute('data-art')`. §8 assigns it correctly: no node is created, so the art loader is never
re-triggered, and no successor owner is needed. I found no unassigned effect in that range —
`copyScroll`, `copyAnimPhase` and `ghostWrap` all mutate only the detached clone, and the range
contains no `classList` mutation on a live element and no `d.<field>` write. §8's effects table is
sound as written.

### F10 — Note, defect: §10's untouched-value dispositions, checked against HEAD

`document.body.classList.remove('np-locked')` sits at `js/app.js:551`, inside `renderDestination`'s NP
branch, which Stage 2 does not touch — §10's "UNTOUCHED" is correct. `d.byId` (`js/nav.js:34-42`) is
unchanged as a lookup; no call site moves and none is added. The one qualification is that F1 changes
what the element `appViewEl` returns is *capable of*, which is a change to the value's behaviour rather
than to the lookup — recorded here so the two are not conflated.

---

## Contract shape

Verified against HEAD and I found no defect. `Swipe.buildConstruction`'s return is registered
`NON_CONTRACT` in `test/contract-function-gate.test.js` because it carries live DOM nodes, so removing
the `capture` key does not trip the **exact-key** contract gate; §10's instruction to re-read and keep
that registration in the same commit is the right treatment, since the `NON_CONTRACT` list is itself an
exact-key contract. `finalizationPlanFor` (`js/swipe.js:196-204`) returns
`Object.freeze({ abortRender })` and is deleted outright rather than narrowed, so its registration must
be removed with it in the same commit — §10 says this and it is correct. `constructionPlanFor` keeps all
four keys with only the `outgoing` value domain narrowing, which the exact-key gate does not see.

§6's decision to **keep** the `outgoing` field after it collapses to a one-value enum is right, and for
the reason given: it is where a re-introduced clone would have to declare itself, and the anti-cloning
gate reads it.

---

## Coverage

Every blocking finding, mapped to what would verify it. Where a finding is not decidable in jsdom I say
so rather than proposing a cell that could not fail.

| Finding | Verification | Layer |
|---|---|---|
| F1 | A source-structural cell asserting that every element `Nav.appViewEl` and `renderDestination` can return generates a box — i.e. that no view host resolved as a mover carries `display: contents`. Decidable from source text, in the idiom of `test/page-bg-js-painter.test.js`. The *visual* confirmation that the four transitions still animate is device-owed. | gate (source) + device |
| F1a | Not decidable in jsdom — jsdom has no layout, so a containing-block flip produces no measurable offset. Real-engine measurement (the `chrome --headless=new` instrument §15 already uses) settles the inset resolution; the drag itself is device-owed. | real engine + device |
| F2 | Real-engine paint-order measurement of `.alphaindex` against a settings screen during a browse↔settings drag, run **after** whichever of Stage 2 / Stage A2 lands second. Plus a records correction to `PLAN-one-screen-type.md` §5.5 and its convergence claim — a records obligation, not a test. | real engine + records |
| F3 | Two cells, both decidable in jsdom because both are DOM-identity facts, not geometry: (a) after a page swap, `reset()`/`clearCache()` still empty the container and not a page; (b) each page's controller measures its own element — assert that deactivating the outgoing controller captures an anchor against the outgoing page, by giving the two pages different scroll heights. | unit + integration (app harness) |
| F4 | A CSS-structural cell in PAGEISVIEW's idiom, comparing the **parked** rule's resolved insets against the **active** rule's, asserting the two boxes have the same height. Textual, so it cannot be made vacuous. The reveal-jump behaviour itself is Blink/WebKit-owed and device-measured. | unit (css audit) + device |
| F5 | No cell. This is an attribution obligation on the Stage 2 device gate (step 10): settle F4 first so one variable changes, or record the confound explicitly in R5. | records + device |
| F6 | A unit cell over `ScrollBar._test.surfaceKind` asserting the browse scroller is classified as a supported surface, plus a CSS cell asserting the native-scrollbar suppression covers it. Both source/structural. | unit |
| F7 | An integration cell in the app harness: enter a browse page, scroll it, leave to Home, return, assert the offset is retained rather than zero. Decidable in jsdom — `scrollTop` is a settable property there and this asserts a written value, not a laid-out one. | integration (app harness) |
| F8 | Mostly no runtime surface — re-deriving the citations is a records obligation discharged when Stage 2's commit is authored. The one part that does owe a test is the double-occurrence trap: a unit cell asserting `npPillClone` still strips ids from its clone after the `ghostApp` deletion, so removing both occurrences reddens rather than shipping a broken pill. `test/mutation-anchors.test.js` independently reddens with `ANCHOR NOT FOUND` on any anchor whose target text is deleted. | unit + records |
| F9 | No runtime surface owed — a verification, not a defect. Recorded so the check is not repeated: the retired callee range holds exactly one pre-mount data-attribute effect (`data-art`) and §8 already assigns it. | none (verified) |
| F10 | No runtime surface owed — a verification, not a defect. `np-locked` and `d.byId` are confirmed untouched by Stage 2; the only qualification is F1's, which is covered by F1's own row. | none (verified) |

**PAGEISVIEW as written is sound but incomplete.** It asserts the `.browsepage` base rule matches the
retired `#browse` rule and that the host no longer establishes a box. Add the parked-rule comparison
(F4) and the mover-box assertion (F1); as written it would pass on a `display: contents` `#browse`,
which is exactly the defect.

---

## Device-owed, honestly

jsdom has no layout, no paint, no compositing, no scroll anchoring and no `transitionend`, so most of
this stage's risk is device-only by construction. The plan is already honest about this and §14's
refusal to write geometry cells is correct. What I would add to §15's list:

- **The four transitions F1 breaks** — `home→browse`, `browse→home`, `browse→overlay`, `overlay→browse`,
  commit and abort. These shipped clean in Stage 1; after Stage 2 they must be re-confirmed, because
  Stage 2 touches the element all four use as a mover. A Stage 1 device pass is not evidence about
  Stage 2 — the plan's own §15 scar note says exactly this.
- **F1a's containing-block flip** — whether the page shifts at drag start on `browse→home` and
  `browse→settings`, if `#browse` keeps a transformable box.
- **F4's park/un-park edge** — the reveal position after an aborted `browse→browse` on a long
  virtualized list, which is where the -80px class was measured before.
- **R3/R4/R5/R6 as the plan already states them.** R5 with F5's caveat attached.

And the standing scar the plan already cites: the form that is device-tested is the form that ships.
If F1 is resolved one way and a variant is shipped, the device pass does not transfer.

---

## Prediction — where this breaks in execution if built as written

The builder reaches step 9, writes `display: contents` on `#browse`, moves the geometry declarations to
`.browsepage`, and the unit suite goes green — PAGEISVIEW asserts exactly the two things that are now
true. The `browse→browse` swipe works, because both its movers are pages. Then the device gate at step
10 exercises `browse→browse` only, as written, and passes.

The failure surfaces one step later and away from the change: `home→books` stops sliding. The outgoing
`#home` moves (it is a real fixed box) and the incoming `#browse` does not, so the destination appears
to snap in at finalize instead of arriving. Because the drag still *works* and the destination still
*renders*, this reads as a paint or timing bug rather than a box bug, and it will be chased through the
settle path, the transform clear order, and the reveal hold — none of which are the cause. The cause is
one CSS declaration in a different file from the symptom, and `nav.js:36` is the only line that connects
them.

The second-order cost is worse than the first. If F4 also ships, the next aborted `browse→browse`
repaint cannot be attributed: it is the open symptom, or it is the parked box being 95px taller than the
active one, or it is scroll anchoring measuring a different scroller. This campaign has already lost
verifications to environment traps eight times over, and a device gate that observes three simultaneous
changes is how a ninth happens.

**The single untested assumption that will fail late and expensively** is the one §5.3 states in half a
sentence and never checks: that `#browse` is only a container. It is a container, a scroller **and** a
mover, and Stage 2 correctly identifies that it should stop being the second while accidentally removing
the third.

---

## What I could not test

- Anything requiring layout, paint, compositing or scroll anchoring — F1a's inset resolution, F4's
  reveal jump, F2's paint order. These are named above as real-engine or device-owed rather than
  asserted here.
- Whether the open abort-repaint symptom survives de-cloning. I did not predict it, and F5 is a finding
  about the plan's *attribution* posture, not a claim about the symptom's cause.
- The `.alphaindex` behaviour during a `browse→browse` drag under per-page scrollers (the plan's R3). The
  strip is a `.browsepage` child (`js/browse.js:660`), so under Stage 2 it would be contained by its own
  transformed page — which is what a filmstrip wants, and matches what already ships on the `→home`
  path. I found no source-level defect there and left R3 as the plan has it.
