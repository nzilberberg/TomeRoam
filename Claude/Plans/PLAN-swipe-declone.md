# PLAN — retire the swipe clone: move the real views

**The decision.** The swipe stops building a copy of the page. Every transition moves the **real**
view elements. `ghostApp()` and everything that exists to make a copy resemble the original are
deleted.

**The cause.** `ghostApp()` (`js/swipe.js:297`) clones `.app` and then strips every id
(`js/swipe.js:312`). Inside the copy no id-keyed rule matches, so the cloned `#home`/`#browse` loses its
`position: fixed` inset box (`css/app.css:161-169` / `css/app.css:184-190`) and falls to normal flow. The
copy therefore lays out in a **different box** than the original. Three device-reported symptoms are
that one non-identity, seen three ways: a 7px content-top gap patched with a hand-tuned `53px`
constant (`js/swipe.js:311`); a second moving page background (fixed at build `.273`); and the carousel
heading changing size at swipe start, reflowing the page.

**Why this is smaller than it looks.** Every view in this app is **already** a `position: fixed` inset
own-scroll box — `#home` (`css:161`), `#browse` (`css:184`), `#options` (`css:213`), the five settings
subs (`css:778`), `#nowplaying` (`css:496`). They share one geometry. Stage 6i already proved the
no-clone path by making `→home` move the real `#home`, and `→home` is the one direction the user
reports clean. Of the four transitions that cloned, **three had two distinct real elements already
sitting in the DOM** and needed no new architecture at all — Stage 1 shipped that. Only `browse→browse`
genuinely needs a structural change, because its source and destination share the `#browse` host.

<!-- vitruvius-gate {"plan_type":"refactor",
  "patterns":{"boundary_relocation":true,"callee_replacement":true,"contract_shape":true,"state_transfer":true,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["css/app.css:78-91","css/app.css:92-132","css/app.css:172-191","css/app.css:805-814","js/browse.js:60-90","js/browse.js:108-131","js/browse.js:200-265","js/browse.js:267-319","js/browse.js:480-547","js/browse.js:637-662","js/nav.js:34-42","js/nav.js:104-110","js/app.js:536-556","js/app.js:1215-1245","js/scrollbar.js:41-62","js/virtuallist.js:240-262","js/swipe.js:146-205","js/swipe.js:354-406"],
  "callee_ranges":["js/swipe.js:222-261","js/swipe.js:276-333"],
  "affected_contracts":["test/fixtures/swipe-plan-spec.mjs:1","test/ghost-clone-alignment.test.js:1","test/no-view-clone-gate.test.js:1","test/scroll-writer-set.test.js:169","test/contract-function-gate.test.js:33","test/browse-decouple.test.js:78","test/repaint.test.js:135","test/browse-virtual.test.js:538","tools/mutate.mjs:1"],
  "staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Zelda/Board.md","Claude/Decisions/DecisionLog.md"],
  "blocking_questions":["NOGHOSTINFLOW","HOMESTAYSLIVE","PAGEISVIEW","MOVERHASBOX","PARKBOXEQUAL","PAGEOWNSSCROLL","RESETCOVERSPAGES","ENTRYNOZERO","BROWSESURFACE","NPPILLIDS","NOGHOSTATALL","ABORTNORENDER","NOAPPCLONE"]} -->

Status: **Stage 1 SHIPPED and device-confirmed** (build `2026-07-30.274`+). **Stage 2 REWORKED after
plan review, not reviewed in its reworked form.** Stage 2 removes the clone from `browse→browse`,
which unlocks the deletions and closes the gate's temporary exception.

**What the rework changed, in one line.** The GOAL of Stage 2 is unchanged; its MECHANISM is replaced
and its EDIT SURFACE is larger than the previous revision stated. §5.3 previously made `#browse` a
boxless container (`display: contents`). `#browse` is the element the swipe transforms on four
transitions Stage 1 already shipped, and an element with `display: contents` generates no principal box,
so a transform on it is inert. `#browse` now **keeps** its box and each `.browsepage` becomes a
`position: absolute; inset: 0` scroller inside it. Details, and the four other structural corrections
the review returned, are in §5.3 and §18.

## Index

1. Defining records and authority
2. Applicability *(unnumbered heading — the authoring gate matches it literally)*
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
16. The anti-cloning gate — built in Stage 1, closed in Stage 2
17. Separate notes (not part of this plan's fix)
18. Review resolutions — the reworked mechanism, finding by finding
19. Claims verified against source in this rework

---

## 1. Defining records and authority

| Record | Standing | Reconciliation |
|---|---|---|
| The user's instruction, 2026-07-29: "Stop cloning." | Governing | Highest authority here. It settles the approach; this plan chooses only the sequence. |
| `Claude/Charpy/PLAN-swipe-declone-stage2-charpy.md` (verdict TEMPER, 2026-08-01) | Ratified review of Stage 2 | **AGREE, and it is the reason this revision exists.** Its five Structural findings are resolved in §18; its Weak and Note findings are folded into §5.3, §12 and §14. |
| `Claude/Decisions/DecisionLog.md:1066-1113` — the Stage 1 outcome record, which forecasts Stage 2 as "make each `.browsepage` its own **fixed** inset own-scroll box" | Ratified outcome record | **CONFLICT with §5.3, declared rather than silent.** The settled constraint is Invariant D4 (a page owns its own scroll offset natively), and it is unchanged. The *positioning scheme* named in that forecast is changed here from `position: fixed` to `position: absolute`, because a fixed page is re-contained by a transformed `#browse` and jumps by `safe-top + 51px` at drag start — derived in §5.3.2. The entry is an outcome record of Stage 1, not a design ratification of Stage 2, and §13 step 14 updates it when Stage 2 lands. |
| `Claude/Decisions/DecisionLog.md:1147-1167` — ONE SCREEN TYPE, with **Now Playing the deliberate exception** | Ratified USER DECISION | **AGREE, and untouched.** Stage 2 changes nothing about `#nowplaying`: no geometry, no stacking, no background, no mover role. It moves the browse pages *toward* the one-screen-type model by giving them the same inset own-scroll box every other screen has. |
| `PLAN-swipe-noswap-home.md` (Stage 6i) | Ratified, built | **AGREE**, and it is the precedent: it retired `snapshotHome` and made `→home` un-park the real fixed `#home` as the incoming mover. |
| `PLAN-browse-decouple.md` | Ratified, built | **AGREE** — it made active `#browse` a `position: fixed` own-scroll view. That is the precondition that made Stage 1 cheap, and it is what Stage 2 now splits into a box role and a scroller role. |
| `PLAN-home-shift-fix.md` §3 (M2) | Ratified, built | **CONFLICT, resolved by deletion.** M2's fix is the `53px` clone-alignment constant. It is correct *for a clone*; this plan removes the clone, so the constant and its Stage-1 interim guard (`test/ghost-clone-alignment.test.js`) and mutation #101 are deleted together rather than maintained. |
| `css/app.css:98-126` — `#home.parked`'s **Invariant P** and the `overflow: hidden` derivation, including the note at `css:105-108` that `.browsepage.parked` diverges *because* a `.browsepage` is an IN-FLOW element with no `bottom` inset to inherit | Ratified, device- and Blink-measured (`Claude/Loki/STRIKE-home-shift-m1-*`) | **CONFLICT, resolved by extending Invariant P rather than by keeping the divergence.** Stage 2 gives `.browsepage` its own inset box, so the stated reason for the divergence stops being true. Rather than re-deriving a second park geometry, Stage 2 makes `.browsepage.parked` declare **no** position and **no** insets — exactly `#home.parked`'s shape — so both park rules obey Invariant P and the comment at `css:105-108` is rewritten to say so. `overflow: hidden` stays on both, on the same two grounds recorded at `css:110-117`. |
| `css/app.css:172-183` — `#browse` "deliberately carries NO will-change / non-none transform"; the `.195`/`.196` history — a **persistent** transform on `#browse` makes it the containing block for `position: fixed` descendants and breaks the A–Z strip | Ratified source comments, recording a shipped regression, gated by `BROWSEFIXED` (`test/browse-decouple.test.js:78-89`) | **AGREE, and they constrain the rework.** Both records concern a *persistent* transform; a gesture-scoped one is not that, and `browse→home` already ships it. They matter because they establish that `#browse`'s box and its transform behaviour are load-bearing — which is what made dissolving the box a change of that class rather than a cleanup. Under the reworked mechanism `#browse` keeps `position: fixed` and still declares no `will-change` and no non-none transform, so `BROWSEFIXED` survives with one assertion migrated (§10). |
| `PLAN-one-screen-type.md:863-873` (§5.5 — during a browse↔settings gesture `#browse` is an un-hidden mover whose inline transform **establishes a stacking context**, so `.alphaindex` is contained; "Containment, not hiding, is the reason during a gesture") | Ratified, and the stated ground for Stage A2's deletion of `z-index: 25`/`26` | **AGREE under the reworked mechanism, after having been CONFLICT under the previous one.** A `display: contents` `#browse` establishes no stacking context; a `position: fixed` `#browse` carrying an inline transform does. Keeping the box keeps §5.5 true, so Stage 2 removes no premise Stage A2 rests on. See §18 F2 for the one records obligation that survives. |
| `PLAN-one-screen-type.md:1967-1976` — items 2 and 3 of "how the two plans interact", which name Stage 2's mechanism as "`#browse` → `display: contents`" and "dissolves the host" | Ratified claim, now describing a mechanism this plan does not use | **CONFLICT, owned outside this plan.** The convergence conclusion still holds — `.browsepage` and a settings screen still become the same kind of thing — but the mechanism named there is wrong after this rework. ⛔ This plan does not edit `PLAN-one-screen-type.md`; the correction is a cross-plan reconciliation the user owns. Recorded here so it is not lost. |
| `js/browse.js:292-298` + `css/app.css:78-85` (iOS drops decoded bitmaps for a `display: none` subtree; measured ROWS KEPT 68/68, src 22→22, +img 0) and `js/virtuallist.js:263-270` (an aborted `browse→browse` re-materialized the page; measured +img=72, −img=90, withSrc=0) | Ratified, device-measured | **AGREE, and they set §15 R5's posture.** These are the two recorded mechanisms of the open abort-repaint symptom. Stage 2 perturbs both, so R5 gains an attribution obligation and §13 splits the device gate; see §18 F5. |
| `test/scroll-writer-set.test.js:169-205` — the M1WRITERSET registered baseline of every textual vertical-scroll writer in `js/`, with a rot check that FAILS when a registered entry's text no longer occurs | Live gate | **CONFLICT, resolved by re-derivation in the same commit.** Stage 2 rewrites the text of baseline entries 3 and 4 and falsifies the recorded reason of entry 6. The gate's own header forbids repairing a red by narrowing the pattern. §10 and §12 carry the obligation. |
| `test/no-view-clone-gate.test.js` — NOAPPCLONE, **built in Stage 1**, with two registered exceptions, the second a dated temporary allowance for the `browse→browse` clone | Live gate | **AGREE, and it supersedes this plan's own earlier statement that the gate lands after Stage 2.** Stage 2's obligation is to delete the temporary exception, not to build the gate. §16. |
| Memory `tomeroam-swipe-repaint-saga` — "never transform the real in-flow view" | Working hypothesis, tested by Stage 1 | **RESOLVED in this plan's favour.** Stage 1 shipped real-element movers on `home→browse`, `home→overlay` and `browse→overlay` and is device-confirmed. The hypothesis did not hold. |
| `Claude/Loki/STRIKE-home-shift-m1-*` | Executed strikes | **AGREE**, and they supply the instrument: real-engine measurement via `chrome --headless=new --disable-gpu --user-data-dir=<scratch> <probe url>`, real-time (no `--virtual-time-budget`). §15 uses it. |
| **GAP** | — | No record states what the `#browse` element is *for* once it stops being the scroller. This plan closes that gap by naming it: `#browse` is the browse **container and view box** — the append target, the `innerHTML` wipe target, the `.hidden` carrier for `Nav.setView`, and the transformable mover for every `browse↔non-browse` transition. It is not, after Stage 2, a scroller. |

## Applicability

- **boundary_relocation: true** — the outgoing mover's identity relocated from an owned clone pane to
  the real view element (Stage 1), and Stage 2 relocates the browse scroll box from `#browse` to each
  `.browsepage`, taking the virtual controller's measured element with it. Ledger in §7.
- **callee_replacement: true** — `ghostApp()` is a callee with eleven observable effects beyond its
  return value. It is retired rather than reimplemented, so each effect is assigned to what supplies
  it instead. Declared callee ranges are the clone-fidelity helper cluster (`js/swipe.js:222-261`) and
  `ghostWrap` + `ghostApp` (`js/swipe.js:276-333`); `npPillClone` (`js/swipe.js:336-343`) is deliberately
  outside both, because it is retained. Effects table in §8.
- **contract_shape: true** — `constructionPlanFor`'s `outgoing` enum loses `'app-ghost'`, the
  `Construction.capture` field is removed, and `finalizationPlanFor` is deleted outright. The frozen
  spec `test/fixtures/swipe-plan-spec.mjs` changes with them. §6.
- **state_transfer: true** — Stage 2 moves per-page scroll state from the shared `sy` cache entry
  (`js/browse.js:71`) onto each page element's own `scrollTop`, and moves the anchor-measurement
  surface from one shared reference to one element per controller. §7, §9.
- **async_change: false** — no asynchronous surface changes shape. The settle rAF, the
  `transitionend`/340ms finalize race and the reveal hold are untouched. Stage 2 *removes* one held
  branch and one two-frame restore finalizer, which is a subtraction of call sites, not a change of
  async semantics.
- **persistence_migration: false** — nothing here is persisted. Scroll state is in-memory and live.
- **lifecycle_ownership: true** — the `'owned-pane'` mover ownership kind ceases to exist, and with it
  one creator, one disposal path and one hold. A `.browsepage` becomes a mover for the first time,
  which gives it a new borrowed lifetime obligation at the reset point. §11.

## 3. What `ghostApp` actually provides — the audit

`ghostApp` has exactly one consumer: `buildConstruction` when `plan.outgoing === 'app-ghost'`
(`js/swipe.js:374`). It returns `{ wrap, capture: { ghostY, animSync, animRes } }`. Its full provision,
derived from `js/swipe.js:222-333`, and for each whether moving the real element supplies it:

| What it provides | Supplied by a real-element move? |
|---|---|
| A transformable stand-in for the outgoing view | **Yes, inherently.** Every view is already a fixed inset box; after Stage 2 every browse page is its own inset box inside one. |
| `ghostY` — the source's scroll baked into `translateY` (`js/swipe.js:324-325`) | **Yes, inherently.** The real element *has* its scrollTop. `ghostY` exists only because a clone has none. |
| `animSync` / `animRes` — cover shimmer phase copied into the clone (`js/swipe.js:235-261`) | **Yes, inherently.** The real nodes carry the running animations. |
| `freezeArt` — `data-art` stripped so the copy does not re-trigger the art loader (`js/swipe.js:222`) | **Yes, inherently.** No new nodes are created, so nothing re-triggers. |
| `copyScroll` — carousel `scrollLeft` copied in (`js/swipe.js:225-228`) | **Yes, inherently.** The real carousels keep their own. |
| Topbar removal (`js/swipe.js:313`) | **Yes, inherently.** The topbar is a *sibling* of the views, not a child; a real-element move never picks it up. |
| `.hidden` / `.parked` pruning (`js/swipe.js:314`) | **Yes, inherently.** One real element is the mover; there is nothing to prune. |
| The `53px` `#library` padding (`js/swipe.js:311`) | **Yes, inherently** — and it exists *only* to undo the id-stripping. Deleted, not replaced. |
| `.alphaindex` removal (`js/swipe.js:321`) — a workaround for the clone's transform re-parenting a `position: fixed` descendant | **No.** Transforming a real `.browsepage` makes it the containing block for the fixed A–Z strip, exactly as it does for the clone. §5.4 derives the resulting geometry and shows it is the geometry `browse→home` already ships. |
| The `.nav-ghost` wrapper — fixed `inset: 0`, `z-index: 28`, `overflow: hidden` (`js/swipe.js:276-281`) | **No.** It supplies viewport clipping and one uniform z-order. A real view has its own z and its own inset box. Settled for Stage 1 by real-engine measurement (§15 R2); §15 R2b extends that measurement to Stage 2's new case. |

**The finding, stated plainly.** Of eleven things `ghostApp` provides, **nine are needed only because it
is a copy.** Two are real: `.alphaindex` re-parenting (§5.4), and clipping plus z-order (§5.2, measured).

## 4. Scope boundary — MOVES / STAYS / SPLIT / DEFERRED

**MOVES.** The outgoing-mover decision for `browse→browse`, from a built clone pane to the real
outgoing `.browsepage` (Stage 1 already moved the other three). The browse **scroller role**, from
`#browse` to each `.browsepage`: the scroll box, the padding, the entry-position write, the virtual
controller's measured element, and the custom scroll indicator's surface identity. The
`.browsepage.parked` geometry, from a self-declared fixed box to Invariant P's inherit-everything
shape.

**STAYS.** The gesture machinery (arm/lock/move/settle/finalize, the session-identity guards, the row
hold, the reveal diagnostic). The browse **container role** on `#browse` — the append target
(`js/browse.js:497`), the `innerHTML` wipe target (`js/browse.js:80`), and the `.hidden` visibility test
(`js/browse.js:204`) all keep reading `o.mount`. `#browse`'s `position: fixed` inset box, its
`max-width`/`margin`, its absence of `z-index`, `will-change` and `transform`. The additive-overlay
model in `nav.js` `setView` (§17). `#home.parked`. The `.app` 12vh runway. The NP pill decoration clone
(`npPillClone`) — it clones a **pill**, not a view. `anchorEntryY` and `playingTrackY` (§18 F7).
Everything about `#nowplaying`.

**SPLIT across the seam.** `o.mount` today carries two roles in one reference. Stage 2 splits them:
`o.mount` keeps the **container** role unchanged, and the **scroller** role is taken by the page element
that each call site already has in hand. No second injected field is added — see §18 F3 for why that
matters and §7 for the ledger.

**DEFERRED, with the consumer named.** The `.alphaindex` containing-block behaviour is deferred to
device row R3; the consumer that would need a fix is the A–Z strip during a `browse→*` drag, and no
stage introduces it because §5.4 derives that the strip's containing rectangle is unchanged by Stage 2.
The additive-overlay premise (§17) is deferred with no stage: nothing in this plan needs it changed.
`d.browseWillHide`'s weakened reason (§10) is deferred with no stage: deactivation still governs row
materialization, so its call site is not this plan's to remove.

## 5. Target design

**Invariant D1 — a swipe moves real view elements.** The mover set is always `{ the real outgoing view
element, the real incoming view element }` (plus the NP pill decoration where applicable). No transition
builds a representation of a view.

**Invariant D2 — every view element is a fixed-geometry inset own-scroll box with the same content
geometry.** True at HEAD for `#home`, `#browse`, `#options`, the five subs and `#nowplaying`. Stage 2
extends it to `.browsepage`, whose box is `#browse`'s box exactly (§5.3 derives the equality).

**Invariant D3 — the outgoing element is never destroyed or overwritten during a drag.** This is what
makes an abort free. It holds today for every transition except `browse→browse`, which is precisely the
transition that needs the ghost.

**Invariant D4 — a browse page owns its own scroll offset natively.** No shared scroller, therefore no
saved-and-restored offset, therefore no clamp to suppress and no source page to re-render on abort.

**Invariant D5 — every element that can be resolved as a swipe mover generates a principal box.** The
mover set is resolved by `Nav.appViewEl` (`js/nav.js:36`), `Nav.overlayEl` (`js/nav.js:35`),
`env.sourceEl` (`js/app.js:541`) and `env.renderDestination` (`js/app.js:543-555`). A transform applies
only to an element that generates a box, so any host reachable from those four must generate one. This
invariant is new in this revision; it is the generalization of the defect §18 F1 records.

### 5.1 Per transition

| Transition | Outgoing | Incoming | State |
|---|---|---|---|
| `home→browse` | real `#home` | real `#browse` | **Shipped (Stage 1).** The `'browse-host'` render no longer parks `#home` for the drag. Stage 2 must not change what `#browse` can do as a mover. |
| `home→overlay` | real `#home` | real overlay | **Shipped (Stage 1).** Untouched by Stage 2. |
| `browse→overlay` | real `#browse` | real overlay | **Shipped (Stage 1).** Stage 2 must not change what `#browse` can do as a mover. |
| `browse→home` | real `#browse` | real `#home` | **Shipped (Stage 6i).** Stage 2 must not change what `#browse` can do as a mover. |
| `overlay→*` | real overlay | real destination | **Shipped.** Untouched. |
| `browse→browse` | real outgoing `.browsepage` | real incoming `.browsepage` | **Stage 2.** Each page becomes its own inset scroller inside `#browse`, so the two pages are two independently-scrolled real elements. |

**Read the four "must not change" rows as a constraint, not as a note.** Three of them name `#browse`
as a mover. Stage 2 changes `#browse`; the previous revision of §5.3 changed it in a way that made those
three rows false, and §5.1 and §5.3 contradicted each other in the same document. Invariant D5 is the
structural form of that constraint, and `MOVERHASBOX` (§14) is the gate that holds it.

### 5.2 Clipping and z-order — the one thing the wrapper supplied

The `.nav-ghost` wrapper clipped at `inset: 0`. A real view element is already inset-clipped by its own
box, so **clipping is inherited**; what is not inherited is the *horizontal* travel: a mover translated
to `±w` sits outside the viewport, and `.app`'s `overflow-x: clip` (`css:201`) does not contain a
`position: fixed` view.

For Stage 1 this was **measured, not assumed**: a fixed view at `translateX(±innerWidth)` does not extend
`document.scrollingElement.scrollWidth`, and the filmstrip's two movers stay edge-to-edge with zero
overlap for the whole live drag (§15 R2, run 2026-07-30). Stage 2 introduces a case that measurement does
not cover — an **absolutely-positioned** page translated to `+w` inside a `position: fixed` ancestor whose
`overflow` is `visible`. That is R2b, and it is measured before Stage 2 part A ships.

**Z-order during a drag.** Two movers in a filmstrip do not overlap, so z-order is not load-bearing for
the mid-drag frames. It *is* load-bearing at the two edges. For `browse→browse` both movers are children
of the same `#browse` box, so the existing ladder is untouched and no new stacking rule is introduced.
`.browsepage.parked` keeps its `z-index: 0`. **No z-index change is planned.**

### 5.3 Stage 2 — `browse→browse`

At HEAD `#browse` is both the container and the scroller, and it holds one cached `.browsepage` per
screen key (`js/browse.js:19`, `:497`). Per-page scroll is saved to `sy` on every scroll event
(`js/browse.js:68-72`) and re-applied through `applyScrollY` (`js/browse.js:226-241`), with `beginRestore()`
suppressing the clamp event the host resize fires (`js/browse.js:277`).

#### 5.3.1 The change, as CSS

```
BEFORE (HEAD)
  #browse { position: fixed; left: 0; right: 0;
            top: calc(var(--safe-top) + 51px);
            bottom: calc(var(--nav-h) + var(--nav-pad));
            max-width: 640px; margin: 0 auto; padding: 14px 16px 40px;
            overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  body.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); padding-bottom: 20px; }
  .browsepage           — NO RULE. An in-flow div.
  .browsepage.parked { position: fixed; top: 0; left: 0; right: 0;
                       max-width: 640px; margin: 0 auto;
                       transform: translateX(-101vw);
                       overflow: hidden; pointer-events: none; z-index: 0; }

AFTER STAGE 2
  #browse { position: fixed; left: 0; right: 0;
            top: calc(var(--safe-top) + 51px);
            bottom: calc(var(--nav-h) + var(--nav-pad));
            max-width: 640px; margin: 0 auto; }
  body.has-player #browse { bottom: calc(var(--nav-h) + var(--nav-pad) + 106px); }
  .browsepage { position: absolute; inset: 0;
                padding: 14px 16px 40px;
                overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  body.has-player .browsepage { padding-bottom: 20px; }
  .browsepage.parked { transform: translateX(-101vw);
                       overflow: hidden; pointer-events: none; z-index: 0; }
```

`#browse` **keeps its box** and gives up only the scrolling. The scroller, the padding and the
scroll-behaviour declarations move to `.browsepage`.

#### 5.3.2 Why `position: absolute` and not `position: fixed`

The page must be a box with the same content geometry as the retired `#browse` scroller, and it must
keep that geometry while an ancestor is transformed — because `#browse` carries an inline transform for
the whole of any `browse↔non-browse` drag.

`#browse` is `position: fixed`, so **it is already the containing block for every absolutely-positioned
descendant, transformed or not.** A transform on `#browse` therefore cannot change where an
`inset: 0` page resolves. The hazard does not need guarding because the coordinate does not exist.

A `position: fixed` page does not have that property, and the cost is exact. A fixed page declaring
`top: T` and `bottom: B` (where `T = safe-top + 51px`, `B = nav-h + nav-pad`) resolves against the
viewport while `#browse` is untransformed, and against `#browse`'s **padding box** while `#browse` is
transformed. `#browse`'s padding box begins at `y = T` and ends at `y = viewportH − B`, so under a drag:

- the page's top edge moves from `T` to `T + T` — **down by `safe-top + 51px`**;
- the page's bottom edge moves from `viewportH − B` to `viewportH − B − B` — **up by `nav-h + nav-pad`**;
- the page's height falls from `viewportH − T − B` to `viewportH − 2T − 2B` — **shrinking by
  `2·(T + B)`**.

On a notched iPhone (`safe-top = 59px`, `nav-h = 54px`, `nav-pad = 0`) that is a 110px downward jump and a
328px height loss at drag start, reverting at finalize, on `browse→home`, `browse→overlay`,
`home→browse` and `overlay→browse`. That is the geometry the plan review asked to be derived rather than
discovered; `position: absolute` removes it.

**Content-geometry equality, derived.** `#browse` has no border, so its padding box equals its border
box. With `#browse`'s own padding removed, its content box equals its padding box equals its border box.
An `inset: 0` absolutely-positioned child resolves against the containing block's padding box, so the
page's border box is exactly `#browse`'s border box. Applying the same `padding: 14px 16px 40px` to the
page yields a content box identical to HEAD's `#browse` content box, with the same padding at the same
edges contributing to the same scrollable content. `max-width: 640px; margin: 0 auto` stays on `#browse`
and the page fills whatever that produces, so horizontal geometry is unchanged at every viewport width.

#### 5.3.3 Why the parked rule loses its insets

`.browsepage.parked` currently declares `position: fixed; top: 0` and no `bottom`, and `css:105-108`
records that it diverges from `#home.parked`'s Invariant P *because* a `.browsepage` is in flow with no
`bottom` to inherit. Stage 2 makes that premise false. Keeping the rule as written produces a parked box
taller than the active one — `top: 0` overrides the base inset while `bottom: 0` cascades in from
`inset: 0` — which is exactly what Invariant P exists to forbid, and `css:110-117` records a measured
**−80px reveal jump** from getting a parked transformed scroll container's anchoring wrong.

So `.browsepage.parked` declares **no position and no insets**, and parks by transform alone. Every box
property cascades from the base rule, which is Invariant P's mechanism verbatim. `overflow: hidden`
stays, and now on the *same* two grounds `css:110-117` gives for `#home.parked`: it keeps the box a
scroll container, and it un-suppresses Blink's scroll anchoring under the park transform. The comment at
`css:105-108` is rewritten to record that the two park rules now share Invariant P instead of diverging.

`max-width: 640px; margin: 0 auto` are deleted from the parked rule: the page inherits its parent's
box, so restating them is the "separately-maintained restatement" Invariant P names as the failure mode.

**Specificity, stated so source order is not load-bearing.** `body.has-player .browsepage` is 0-2-1 and
wins over `.browsepage.parked` at 0-2-0 regardless of order, and they set disjoint properties.
`.browsepage.parked` (0-2-0) wins over `.browsepage` (0-1-0) on `overflow`. No rule in this set depends
on source order.

#### 5.3.4 The change, as JavaScript

**The scroller role moves to the element each call site already holds.** `o.mount` keeps the container
role and loses the scroller role; no injected field is added.

- `js/browse.js:67-73` — the scroll listener on `o.mount` is **deleted** with the whole `sy` mechanism.
- `js/browse.js:226-241` — `applyScrollY(y)` becomes `applyScrollY(page, y)` and writes `page.scrollTop`,
  clamping against `page.scrollHeight` / `page.clientHeight`, and realizes that page's own controller
  instead of `activeEntry()`'s.
- `js/browse.js:244-253` — `playingTrackY(book, page)` reads `page.scrollTop`. It already has `page`.
- `js/browse.js:653-658` — the metrics closure reads `m` (the page node), which is already
  `virtualView`'s first parameter, so **each controller measures its own page** and no two controllers
  share a pointer. `scrollTo: (y) => { m.scrollTop = y; }` likewise.
- `js/browse.js:80`, `:204`, `:497` — **unchanged**. These are the container role.

**The `sy` mechanism and the restore guard are deleted together.** `sy` (`:71`), the scroll listener
(`:67-73`), the `restoring`/`restoreGen` flag pair and `beginRestore`/`endRestore` (`:120-130`), the
`beginRestore()` call in `showPage` (`:277`), the two-frame `endRestore` finalizer inside `applyScrollY`
(`:240`), and the `_test.isRestoring` accessor (`:921`) all exist because two pages shared one scroller.
Showing a different page no longer resizes any scroller, so no clamp event fires and there is nothing to
suppress.

**The entry-position rule changes from "write the saved Y" to "write only a derived Y."** `entryScrollY`
loses its `savedY` parameter and returns `null` where it used to return `savedY || 0`; `positionOnEnter`
writes a position **only** when one is derived — a files page's `playingTrackY`, or a virtual page's
`anchorEntryY`. Otherwise it writes nothing and the page keeps its own `scrollTop`. This is what makes
D4 real at the call site; §18 F7 records why the previous revision would have inverted it.

**Two paths survive the deletion and are named so they are not swept up with it.** `playingTrackY`
(`:244-253`) — a files page opens at the locally-playing track, never at a remembered offset. And
`anchorEntryY` (`js/browse.js:263`, `js/virtuallist.js`) — a virtual page's logical anchor re-resolves
against the *current* model, because an SWR update landing while the page was hidden may have moved rows
above it. `anchorEntryY` guards model drift, not scroller sharing; a natively retained `scrollTop` does
not make it redundant.

**`resetSwipeStyles` gains the pages.** `Nav.resetSwipeStyles` (`js/nav.js:104-110`) wipes transient
swipe styling from a fixed list of ids so an interrupted gesture cannot leave an element stuck
half-transformed. Stage 2 makes a `.browsepage` a mover for the first time, and no `.browsepage` carries
an id, so the reset must also clear `transform`/`transition`/`willChange`/`zIndex` on every
`.browsepage`. Without it, a `browse→browse` gesture interrupted before the settle path's own clear
(`js/app.js:816`) leaves a page stuck off-viewport — the "erratic after a while" class the reset exists
to prevent. §18 F11.

**`abortRender: 'rerender'` becomes unreachable**, because the source page node is never overwritten, so
an abort has nothing to restore. `finalizationPlanFor` collapses to a constant and is deleted.

#### 5.3.5 The fallback, and when to take it

D4 is also satisfiable by a **second `#browse` host** (render the destination into the inactive host,
swap on commit). Per-page scrollers are recommended because they *delete* the `sy`/clamp machinery
rather than adding a host-pool concept, and because they collapse two view models into one. The
invariant is D4. If the builder finds per-page scrollers break the virtualizer's anchoring in a way the
two-host form does not, the two-host form satisfies D4 equally and is the fallback — say so rather than
re-introducing a copy. Note that the two-host form does **not** dissolve §18 F1: two hosts must both
generate boxes, and both are then reachable as movers.

### 5.4 The A–Z strip's containing block, derived

`.alphaindex` is `position: fixed` with its own insets (`css:699-706`: `top: calc(var(--safe-top) + 66px)`,
`bottom: calc(var(--nav-h) + var(--nav-pad) + 16px)`), and it is a child of the **page**, not of `#browse`
(`js/browse.js:661`). A `position: fixed` box resolves against the viewport unless an ancestor has a
non-none `transform` (or `filter`, `perspective`, `will-change` of those, or `contain`), in which case it
resolves against that ancestor's padding box.

| State | Nearest transformed ancestor | The strip's containing rectangle |
|---|---|---|
| At rest, HEAD | none | the viewport |
| At rest, after Stage 2 | none — `#browse` still declares no transform (`BROWSEFIXED`), and `position: absolute` on the page establishes no containing block for a fixed descendant | the viewport — **unchanged** |
| `browse→home` / `browse→overlay` drag, HEAD | `#browse` (inline transform) | `#browse`'s padding box |
| `browse→home` / `browse→overlay` drag, after Stage 2 | `#browse` (inline transform) | `#browse`'s padding box — **unchanged**, because `#browse` keeps the same border box and its padding is now zero, so its padding box is the same rectangle |
| `browse→browse` drag, HEAD | the clone's `translateY` — and the clone excludes the strip (`js/swipe.js:321`), so the *real* strip is inside the un-transformed live `#browse` | the viewport |
| `browse→browse` drag, after Stage 2 | the `.browsepage` (inline transform) | the page's padding box — which equals `#browse`'s border box, **the same rectangle the `→home` drag already produces today** |

So Stage 2 introduces **no new containing rectangle** for the strip. It extends an already-shipping
behaviour to one more transition, at the identical magnitude. That is why R3 stays a device row and does
not become a blocker: the thing to look at on device is whether that displacement *looks* acceptable,
and one of the two transitions producing it is already in the user's hands.

## 6. Contract change

```vitruvius-contract
# field | class
outgoing | identity
capture | identity
abortRender | behavior
```

Structural notation — the exact shapes, before and after:

```
AT HEAD (Stage 1 shipped)
  constructionPlanFor(c) -> { outgoing: 'app-ghost' | 'real-source',
                              incoming: 'real-destination',
                              renderDestination: 'browse-host' | 'home-host' | 'none',
                              decorations: frozen [] }
                              // 'app-ghost' iff fromKind === 'browse' && toKind === 'browse'
  buildConstruction(from, dest, env) -> { decorations, movers, capture: { ghostY, animSync, animRes } | null }
  finalizationPlanFor(c) -> { abortRender: 'rerender' | 'none' }

AFTER STAGE 2
  constructionPlanFor(c) -> { outgoing: 'real-source',
                              incoming: 'real-destination',
                              renderDestination: 'browse-host' | 'home-host' | 'none',
                              decorations: frozen [] }
  buildConstruction(from, dest, env) -> { decorations, movers }              // `capture` REMOVED, not nulled
  finalizationPlanFor                                                        // DELETED
```

`outgoing` collapses to a one-value enum. **Keep the field.** It is the frozen spec's per-case assertion
surface and the thing the anti-cloning gate reads; collapsing it to nothing would delete the place a
re-introduced clone would have to declare itself.

**Migration (U10).** `test/fixtures/swipe-plan-spec.mjs` is the hand-written independent oracle and
changes in the same commit as production — that two-part edit is deliberate and is what a review sees.
`Swipe.buildConstruction`'s return is registered `NON_CONTRACT` in
`test/contract-function-gate.test.js:42-44` because it carries live DOM nodes, so removing the `capture`
key does not trip the **exact-key** gate; that registration is re-read and kept in the same commit,
because the `NON_CONTRACT` list is itself an exact-key contract. `finalizationPlanFor`'s `CONTRACT`
registration (`test/contract-function-gate.test.js:33`) is **removed with the function**, in the same
commit, or the gate reddens on a registered export that no longer exists. `constructionPlanFor` keeps
all four keys — only the `outgoing` value domain narrows, which the exact-key gate does not see.
`tools/mutate.mjs` and `test/mutation-anchors.test.js` carry anchors into `ghostApp`; every anchor whose
target text is deleted is de-registered in the same commit, or the anchors gate reddens with
`ANCHOR NOT FOUND`.

## 7. Value and ownership ledger

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
outgoing mover element | identity | out | the constructionPlanFor outgoing branch | the start() mover mapping in app.js | Swipe.buildConstruction | per gesture | NOGHOSTINFLOW cell in stage 1 and NOGHOSTATALL cell in stage 2
source view scroll offset | geometry | inout | the user scrolling the real view element | the outgoing mover paint during the drag | the real view element | continuous and unaffected by the gesture | HOMESTAYSLIVE cell plus device row R1
home parked state during a browse-host drag | behavior | inout | the env.renderDestination browse-host branch | the nav setView call at finalize | the env.renderDestination browse-host branch | spans drag start to finalize | HOMESTAYSLIVE cell and its second mutant
browse container role | identity | inout | Nav.setView and Browse.render | the innerHTML wipe and the appendChild and the hidden-class visibility test in browse.js | the browse host element | the whole session | PAGEOWNSSCROLL cell asserts the container operations still target the host after a page swap
browse scroller role | geometry | inout | the user scrolling the page element | the same page element on re-entry | the browsepage element | the page element lifetime bounded by the LRU cap and clearCache | PAGEISVIEW cell plus ENTRYNOZERO cell plus device row R4
browse view box | identity | inout | the shipped browse host css rule | every swipe that resolves a mover through appViewEl or renderDestination | the browse host element | permanent | MOVERHASBOX cell plus the retained BROWSEFIXED gate
per-controller measured element | identity | in | virtualView for each page it builds | captureAnchor and realize inside that page controller | the page element that controller was built for | the controller lifetime | the anchor-per-page assertion inside the PAGEOWNSSCROLL cell
parked page box geometry | geometry | inout | the base browsepage rule cascading into the parked rule | the engine scroll-anchoring machinery at un-park | the base browsepage rule | gesture scoped from swipe start to endHold | PARKBOXEQUAL cell plus device row R5
scroll indicator surface identity | identity | out | the scroll event target | the surfaceKind classifier in scrollbar.js | the browsepage element | per scroll event | BROWSESURFACE cell
page entry position on a cache hit | geometry | out | playingTrackY for a files page and anchorEntryY for a virtual page | applyScrollY through positionOnEnter | the positionOnEnter caller | per browse entry | ENTRYNOZERO cell
inline swipe styling on a page mover | behavior | inout | the drag transform writes in app.js | the reset at the top of applyScreen and the settle clear | Nav.resetSwipeStyles | from drag start until the next applyScreen | RESETCOVERSPAGES cell
Construction capture field | identity | out | Swipe.buildConstruction | the capture recording block in start() | Swipe.buildConstruction | per gesture until stage 2 removes it | NOGHOSTATALL cell
abort re-render decision | behavior | out | Swipe.finalizationPlanFor | the runFinalize abort branch | Swipe.finalizationPlanFor | per gesture until stage 2 deletes the function | ABORTNORENDER cell
the dead env scrollY supplier | resource | in | the env literal built in app.js start() | nothing at HEAD | the env literal in app.js | per gesture until deleted | the deletion is verified by the ambient-read audit in section 10
```

**No dead field is added.** Every row is an existing value whose producer, owner or existence changes;
the plan adds no new field to any contract and no second injected reference. Three rows record
**removals** (`Construction capture field`, `abort re-render decision`, `the dead env scrollY supplier`)
— recorded because a value whose consumer set is empty is exactly the thing that otherwise survives as
dead weight.

## 8. Effect ownership after the callee is retired

`ghostApp` (`js/swipe.js:297-333`) and its helper cluster (`js/swipe.js:222-261`) are retired, not
replaced by an indirection. Each observable effect is assigned to what supplies it instead.

```vitruvius-effects
# effect | owner | predecessor | successor | verification
clone the app subtree and mount a fixed wrapper into body | retired-builder | ghostApp | the real outgoing browsepage is itself the outgoing mover | NOGHOSTATALL cell asserts no owned pane is built for any transition
strip every id from the cloned subtree | retired-builder | ghostApp | no copy exists so no id is stripped and every id-keyed rule keeps matching | NOAPPCLONE gate with its temporary exception removed
set the library padding-top compensation constant | retired-builder | ghostApp | the real view keeps its own fixed-inset content-top | NOAPPCLONE gate plus device row R1
remove the shared topbar from the copy | retired-builder | ghostApp | the topbar is a sibling of the views and is never a mover | NOGHOSTATALL cell
prune hidden and parked subtrees from the copy | retired-builder | ghostApp | one real element is the mover so there is nothing to prune | NOGHOSTATALL cell
remove the fixed alphaindex strip from the copy | retired-builder | ghostApp | the real strip rides with its own transformed page inside the same rectangle the browse to home drag already produces | section 5.4 plus device row R3
strip data-art so the copy does not retrigger the art loader | retired-builder | ghostApp | no nodes are created so the art loader is never retriggered | NOGHOSTATALL cell
copy carousel scrollLeft into the clone | retired-builder | ghostApp | the real carousels keep their own scrollLeft | NOGHOSTATALL cell
seek clone cover animations to their live twin phase | retired-builder | ghostApp | the real elements carry the running animations themselves | NOGHOSTATALL cell
translate the whole clone by the captured source scroll offset | retired-builder | ghostApp | the real page element carries its own scrollTop | PAGEISVIEW cell plus ENTRYNOZERO cell plus device row R4
provide a fixed inset clipping wrapper above the view stack | retired-builder | ghostApp | each real view keeps its own inset box and the browse pages share the browse host box with no new stacking rule | section 5.2 plus real-engine rows R2 and R2b
```

**The eleventh row is the one to read twice.** Ten effects are supplied inherently or are moot. One —
the wrapper's clipping and uniform z-order — is genuinely lost and is replaced by an argument (§5.2)
rather than by a mechanism. That argument was measured in a real engine for Stage 1's case and is
measured again, for Stage 2's new absolutely-positioned case, at R2b.

## 9. Ordering

Ordering requirements that are **correctness**, not incidental:

1. **The outgoing mover is resolved before any destination render runs.** Preserved unchanged
   (`js/swipe.js:369-380`). After Stage 2 the outgoing is a real page element rather than a clone, which
   makes the ordering less load-bearing — but `browse→browse` still renders into a page that must
   already exist, so the order stands.
2. **The `#home` park is deferred from drag start to finalize** on `home→browse`. **Shipped in Stage 1**
   (`js/app.js:501-515`). Restated because a park that lands mid-drag makes the outgoing mover jump to
   `translateX(-101vw)`, which is the most visible possible regression, and Stage 2 must not reinstate it.
3. **The transform is cleared before the park is applied**, at finalize. `resetSwipeStyles`
   (`js/nav.js:104-110`) already runs at the top of `applyScreen`, ahead of `setView`. Stage 2 widens
   what that reset covers (§5.3.4) but does not move it.
4. **Stage 2's per-page scroller migration lands with every one of its readers in ONE commit.** The
   set is: the CSS relocation, `applyScrollY`'s signature and write target, `playingTrackY`'s read
   target, `virtualView`'s metrics and `scrollTo` closures, the `sy`/`restoring` deletion,
   `entryScrollY`/`positionOnEnter`'s entry rule, `resetSwipeStyles`'s widened element set, and the
   M1WRITERSET baseline. Splitting any of them produces two scroll authorities or a red gate on a
   half-migrated tree.
5. **The park geometry is settled before the Stage 2 device gate runs.** Not a code ordering — a *gate*
   ordering. §13 step 10a measures the park/un-park box equality on the real-engine instrument and must
   read zero before step 10b puts the change in front of a device. See §18 F5.

Incidental and free to move: the order of the effect deletions inside `ghostApp`'s removal (the whole
function goes at once), and the order in which the frozen-spec rows are edited.

## 10. Runtime-dependency policy

`js/swipe.js` stays DOM-free at module load and reads the world only through the injected `env`. This
plan **narrows** that surface: with no clone to build, `paneBuilders` keeps `env.document` and
`env.navPill` for `npPillClone` alone.

**`env.scrollY` is already dead at HEAD, and Stage 2 deletes the supplier.** Verified by reading: the
only occurrences of `env.scrollY` in `js/swipe.js` are in the module comment at `:212`; no builder reads
it. Stage 1 retired its last consumer along with `ghostApp`'s home-source offset branch and left the
producer standing at `js/app.js:540` (`scrollY: () => window.scrollY || 0`). Stage 2 deletes that
producer and corrects the comment at `js/swipe.js:212`. *(The previous revision of this section stated
that `paneBuilders` loses `env.scrollY` and cited a consumer at `js/swipe.js:304`. That was true before
Stage 1 and is false at HEAD; the citation is corrected here.)*

**No new ambient read is introduced.** The plan adds no `getComputedStyle` call, no `window.innerWidth`
read and no `matchMedia` query inside `js/swipe.js`; the geometry stays in the L3 adapter
(`js/app.js` `start()`), where it already lives. No value is lazily cached, so there is no invalidation
policy to define.

`js/browse.js`'s Stage 2 change reads `o.mount` for the container role — an injected reference, not an
ambient lookup — and reads the **page element already in each call site's scope** for the scroller role.
It adds no lookup, no query and no module-level state. `#browse` remains resolved through `d.byId` in
`nav.js`.

**Every ambient and injected value crossing a declared range, named — including the untouched ones.**

- **`document.body.classList` token `np-locked`** — mutated at `js/app.js:551` inside
  `renderDestination`'s NP branch, and at `js/nav.js:72` inside `setView`. It is the CSS hook that swaps
  the navbar buttons for the Now Playing pill. **UNTOUCHED by both stages**: it is keyed to the NP
  *decoration*, which this plan explicitly keeps (§4, §11), and no step adds, removes or re-times a write
  to it. No cell asserts it.
- **`d.browseWillHide`** (`js/nav.js:60`) — the injected hook that deactivates Browse's virtual
  controller before `display: none` lands, because a hidden box measures zero. **UNTOUCHED.** In Stage 2
  its *reason* weakens — a page that owns its own scroll no longer loses an anchor to a host resize —
  but deactivation still governs row materialization, so the call site is not this plan's to remove. Any
  change to it is a separate decision.
- **`d.isSignedIn`** (`js/nav.js:78`) — gates the navbar's `hidden` toggle. **UNTOUCHED.**
- **`d.updatePlayerUI`** (`js/nav.js:79`) — the trailing player-UI reconcile in `setView`. **UNTOUCHED.**
- **`d.byId`** (`js/nav.js:34-40`) — the single injected element lookup through which `setView` and
  `applyScreen` resolve every view. **UNTOUCHED as a lookup**, and after the rework also untouched in
  what the looked-up element is *capable of*: `appViewEl('books')` still returns a `position: fixed` box
  that a transform moves.
- **`o.mount`** (`js/browse.js:9`, injected at init) — **RETAINED, with its role narrowed to container.**
  Not deleted, not re-pointed. §18 F3.

**Contracts and gates this plan changes, with the migration for each.**

| Contract or gate | Location | What Stage 2 does to it |
|---|---|---|
| `finalizationPlanFor` exact-key registration | `test/contract-function-gate.test.js:33` | **Removed** with the function, same commit. |
| `buildConstruction` `NON_CONTRACT` registration | `test/contract-function-gate.test.js:42-44` | **Re-read and kept.** The key removal does not trip an exact-key gate, and the reason text stays accurate. |
| `BROWSEFIXED` source-text gate | `test/browse-decouple.test.js:78-89` | **Migrated, not deleted.** Its `position: fixed`, no-`will-change` and no-non-none-`transform` assertions are *kept and become more load-bearing* (§5.4 depends on them). Its `overflow-y: auto` assertion moves to the `.browsepage` base rule and is folded into `PAGEISVIEW`. |
| `SCROLLBAR` surface cell | `test/browse-decouple.test.js:100` | **Migrated** to assert the `.browsepage` scroller is a supported surface. §18 F6. |
| `RESTORE` abort-re-render cell | `test/browse-decouple.test.js:255` | **Deleted.** Its subject is the abort re-render, which Stage 2 removes; `ABORTNORENDER` is its successor. |
| `entryScrollY` unit cells | `test/repaint.test.js:135-150` | **Rewritten** to the new signature and the new "null means do not write" rule. |
| `applyScrollY` / `isRestoring` ownership cells | `test/repaint.test.js:163-202` | **Deleted** with the restore-token machinery. |
| `sy` round-trip assertions | `test/browse-virtual.test.js:538-552` | **Rewritten** to assert native `scrollTop` retention instead of a cache-entry round-trip. |
| M1WRITERSET registered baseline | `test/scroll-writer-set.test.js:169-205` | **Re-derived by running the derivation, never hand-edited.** Entries 3 and 4 change text (`o.mount.scrollTop` → the page element) and would otherwise trip the gate's rot check; entry 6's recorded `why` ("whose nearest scroll container is `#browse`") becomes false and is corrected even though the gate cannot see it. ⛔ The gate's own header forbids repairing a red by narrowing the pattern or the file set. |
| `NOAPPCLONE` registered exceptions | `test/no-view-clone-gate.test.js` | **Temporary exception 2 deleted** with the clone it allows. §16. |
| Mutation anchors into `ghostApp` | `tools/mutate.mjs`, `test/mutation-anchors.test.js` | **De-registered** with their target text, including #101 (M2ALIGN), the `.alphaindex` clone-exclude anchors and the `freezeArt` anchors. |
| Frozen construction spec | `test/fixtures/swipe-plan-spec.mjs` | `'app-ghost'` removed from every `expectedConstruction` row and from `paneOf`; the `browse→browse` row's `abortRender: 'rerender'` removed. |

## 11. Lifecycle and ownership

The `'owned-pane'` mover ownership kind is retired. Each lifecycle concern, named:

- **Creates.** Today `ghostApp` creates a wrapper and a cloned subtree per gesture. After Stage 2
  **nothing is created** for a view transition; only `npPillClone` still creates a node, and it keeps its
  existing `'owned-decoration'` kind unchanged.
- **Borrows.** All view movers become `'borrowed-real'` — the kind that already governs `#home`,
  `#browse` and the overlays. **New in Stage 2:** a `.browsepage` joins that set. It is the first
  borrowed mover with no id, which is why the reset's element set widens (§5.3.4, §18 F11).
- **Mutates.** The gesture writes `style.transform` on borrowed elements and clears it at
  `resetSwipeStyles` and at the settle (`js/app.js:816`). The `.browsepage` addition is the only change.
- **Releases.** `dropPanes()` (`js/app.js:662`) filters `own === 'owned-pane'` and becomes a no-op, then
  is deleted. `holdGhostUntilPaintable` (`js/app.js:855`) and the `revealPending` branch
  (`js/app.js:661`, `:1235-1236`) lose their only trigger and are deleted with it.
- **Restores.** The abort restore (`applyScreen(dest, { render: true, … })`, `js/app.js:1229-1230`) loses
  its condition and is deleted; an abort becomes a transform reset with nothing to rebuild.
- **Destroys.** The `.nav-ghost` sweeps at `js/app.js:408` and `:415` lose their subject and are deleted
  with the pane kind. The `nav.js` sweep (`js/nav.js:105`) is **retained** as defence for the NP pill
  float handled on the next line.
- **Page lifetime is unchanged.** A `.browsepage` is created by `Browse.render` on a cache miss
  (`js/browse.js:494-498`), destroyed by `evictLRU`/`clearCache`/`reset`, and bounded by
  `MAX_PAGES = 12` (`js/browse.js:20`). Its scroll offset now lives on the element, so it is dropped by
  exactly the same operations that drop the element — at parity with HEAD, where `sy` lives on the same
  cache entry.

**Nothing added now is justified only by a later stage.** Stage 2 adds no field and no injected
reference. The one behavioural addition — the widened `resetSwipeStyles` element set — has a Stage 2
consumer: the `.browsepage` movers Stage 2 itself creates.

## 12. The deletion list

Deleting machinery is the point. Stage 2 is not complete until each of these is gone from HEAD. **Every
citation below was re-derived against HEAD `b9b0682` for this revision** — the previous revision's
citations were written against pre-Stage-1 source and every one of them had moved.

**js/swipe.js**
1. `ghostApp()` — the whole function (`:297-333`) and its preceding comment block (`:282-296`).
2. `ghostWrap()` (`:276-281`) and its comment block (`:262-275`), and with them the `.nav-ghost` wrapper
   concept.
3. `freezeArt` (`:222`), `copyScroll` (`:225-228`), `copyAnimPhase` (`:235-261`) — clone-fidelity helpers
   with no other caller once `ghostApp` is gone.
4. The id-stripping line inside `ghostApp` — **`js/swipe.js:312` ONLY.** ⛔ That exact text
   (`clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));`) occurs **twice**; the
   second occurrence is `js/swipe.js:339`, inside `npPillClone`, which this plan explicitly retains. A
   text-directed deletion removes both and breaks the Now Playing pill decoration. Delete by line, and
   `NPPILLIDS` (§14) is the cell that catches it if the wrong one goes.
5. The `53px` `#library` compensation (`:311`) and its derivation comment (`:299-310`).
6. The `.alphaindex` clone exclusion (`:321`) with its comment (`:315-320`), and the topbar and
   hidden/parked prunes (`:313-314`).
7. `'app-ghost'` from `constructionPlanFor`'s `outgoing` ternary (`:167`) and the comment block that
   explains it (`:155-166`).
8. `finalizationPlanFor` entirely (`:196-205`) with its comment block (`:185-195`), plus its export
   (`:407`) and its contract-gate registration.
9. `capture` from the `buildConstruction` return (`:373-377`, `:405`) and from its comment (`:369-372`).
10. The stale `env.scrollY` mention in the module comment (`:212`).

**js/app.js**
11. The `env.scrollY` supplier (`:540`).
12. The capture-recording block (`d.ghostY` / `d.animSync` / `d.animRes`, `:577-580`) and every reader:
    `cover.ghostY` (`:1183`), the `ghostY` debug line (`:1134`), the `animSync`/`animRes` diagnostic
    (`:1115-1123`), and the ghost/real reveal diagnostic (`:661-705`).
13. `dropPanes()` (`:662`), `holdGhostUntilPaintable` (`:855`), `revealPending` (`:661`, `:1235`,
    `:1271`), and the abort held-reveal branch (`:1229-1236`).
14. The `.nav-ghost` sweeps at `:408` and `:415` and the `keepGhosts` option threaded through
    `applyScreen` (`:459`, `:1230`) and `Nav.resetSwipeStyles` — the *parameter* goes; the `nav.js:105`
    sweep line stays for the NP pill float.
15. The `owned-pane` filters at `:266`, `:376`, `:688`, `:743`, `:794`.

**js/browse.js**
16. The `sy` scroll listener in `init()` (`:67-73`) and the per-page-scroll-memory comment (`:109-119`).
17. `restoring`, `restoreGen`, `beginRestore`, `endRestore` (`:120-130`), the `beginRestore()` call in
    `showPage` (`:277`) with its comment (`:268-280`), the two-frame finalizer in `applyScrollY`
    (`:240`), and the `isRestoring` test accessor (`:921`).
18. The `savedY` parameter and branch of `entryScrollY` (`:222-225`), and the `hit.sy` argument at
    `:489`.

**css/app.css**
19. `overflow-y: auto`, `-webkit-overflow-scrolling`, `overscroll-behavior` and `padding` from the
    `#browse` rule (`:184-190`); `padding-bottom` from `body.has-player #browse` (`:191`).
20. `position`, `top`, `left`, `right`, `max-width` and `margin` from `.browsepage.parked` (`:86-91`).
21. The falsified divergence claim in the Invariant P comment (`:105-108`) — rewritten, not merely
    deleted, to record that both park rules now share Invariant P.
22. The `#browse` comment's scroller language (`:172-183`) — corrected to describe a box that is not a
    scroller, keeping the no-`will-change`/no-`transform` derivation intact.

**test/ and tools/**
23. `test/ghost-clone-alignment.test.js` — the Stage-1 interim M2ALIGN guard. Its own header schedules
    it for deletion with the `53px` constant and mutation #101. *(The previous revision named
    `test/ghost-clone-geometry.test.js`; that file was already deleted in Stage 1 and this is its
    successor.)*
24. Mutation #101 (M2ALIGN) and every other `ghostApp`-targeted anchor in `tools/mutate.mjs` and
    `test/mutation-anchors.test.js` — including the `S5_FREEZEART` pair (`tools/mutate.mjs:140-143`),
    `STRIPEXCLUDE` (`:736-737`), the `copyAnimPhase` F4b mutant (`:465`), the `freezeArt` mutant (`:483`)
    and the two `const g = ghostApp();` anchors (`:124`, `:129`).
25. `'app-ghost'` from every `expectedConstruction` row and from `paneOf` in
    `test/fixtures/swipe-plan-spec.mjs`; `abortRender: 'rerender'` from the `browse→browse` row.
26. `test/no-view-clone-gate.test.js`'s registered exception 2 (the dated temporary allowance).
27. Any assertion in `test/swipe-stage5-*.test.js`, `test/swipe-stage6*.test.js`,
    `test/browse-decouple.test.js`, `test/home-abort-writes.test.js` whose only subject is a built pane.
    **Rule:** an assertion about the *classification* survives and changes value; an assertion about the
    *clone* is deleted.

**Already discharged by Stage 1 — do not re-execute.** The `#home` false-background comment scrub;
`showAppView`'s mid-drag home park; the deletion of `test/ghost-clone-geometry.test.js`; the build of
`test/no-view-clone-gate.test.js`.

**Not deleted:** `npPillClone` (a pill, not a view), `#home.parked`, `.browsepage.parked` (**re-derived**,
not removed — §5.3.3), the row hold, the `.app` runway, the session-identity guards, `anchorEntryY`,
`playingTrackY`, `d.browseWillHide`.

## 13. Staged sequence with owners

**One canonical list. Each step names its owner. No step depends on a later one.**

| # | Step | Owner | State |
|---|---|---|---|
| 1 | Stress this plan; verdict forge / temper / scrap. | the plan reviewer | Stage 1 done; Stage 2 round 1 returned TEMPER; **this revision is unreviewed** |
| 2 | Real-engine measurement R1 + R2 (§15) against HEAD and a scratch Stage-1 build. | the deriver | **done** 2026-07-30 |
| 3 | Author the Stage-1 red cells `NOGHOSTINFLOW`, `HOMESTAYSLIVE`. | the test author | **done** |
| 4 | **Stage 1 build.** | the builder | **done**, build `2026-07-30.274` |
| 5 | Stage 1 device gate. | the user | **done — device-confirmed** |
| 6 | Review the Stage-1 build. | the code reviewer | **waived by the user for this stage** |
| 7 | Attack the ratified claim "moving the real outgoing view is visually identical to the ghost it replaces". | the adversary | **waived by the user for this stage** |
| 8 | **Real-engine measurement R2b** (§15): an `inset: 0` absolutely-positioned page translated to `+w` inside the fixed `#browse` — does it extend `scrollingElement.scrollWidth`, and does it paint outside the viewport? Run against a scratch build over the static `index.html`, before any product edit. | the deriver | open |
| 9 | Author the Stage-2 red cells: `PAGEISVIEW`, `MOVERHASBOX`, `PARKBOXEQUAL`, `PAGEOWNSSCROLL`, `RESETCOVERSPAGES`, `ENTRYNOZERO`, `BROWSESURFACE`, `NPPILLIDS`, `NOGHOSTATALL`, `ABORTNORENDER`. Red at HEAD. | the test author | open |
| 10 | **Stage 2 build, part A.** The CSS relocation (§5.3.1), the `o.mount` role split, the `sy`/restore deletion, the entry-position rule, the widened `resetSwipeStyles`, and the M1WRITERSET re-derivation — **all in one commit** (§9 item 4). Bump the build number. | the builder | open |
| 10a | **Park-geometry probe, before the device sees it.** On the real-engine instrument, compare the resolved box of a `.browsepage` with and without `.parked`, and measure the reveal delta on a mid-park content mutation. **Both must read 0.** A non-zero result stops the sequence — do not proceed to 10b, because the abort-repaint symptom then has three candidate causes and the device gate cannot separate them (§18 F5). | the deriver | open |
| 10b | Device gate: `browse→browse` both directions, commit and abort, on a long list and a short one; the A–Z strip during a `browse→browse` and a `browse→home` drag; a virtualized list past 600 items; re-confirm `home→browse`, `browse→home`, `browse→overlay`, `overlay→browse` commit and abort. **A Stage 1 device pass is not evidence about Stage 2 — Stage 2 touches the element all four of those use as a mover.** | the user | open |
| 11 | **Stage 2 build, part B.** `outgoing` collapses to `'real-source'`; `finalizationPlanFor` is deleted. Execute the §12 deletion list in full, including the test and tooling entries and `NOAPPCLONE`'s exception 2. Bump the build number. | the builder | open |
| 12 | Review the Stage-2 build. | the code reviewer | open |
| 13 | Audit the suite: every deleted assertion accounted for, no dimension left bare by the deletions, and every migrated gate re-derived rather than narrowed. | the coverage auditor | open |
| 14 | Update `Claude/Subsystems/swipe-reveal.md`, the board and the decision log; HEAD-wide scrub of "ghost", "app-ghost", "snapshot" and "clone" in records that describe the swipe. **Includes surfacing the `PLAN-one-screen-type.md:1967-1976` mechanism correction to the user** — this plan does not edit that plan. | the assistant | open |

**Stage 1 is independently shippable and independently valuable, and it shipped.** Three of four
transitions and every Home-originating swipe are de-cloned. Stage 2 buys the last transition, the
deletions and the gate's closure.

## 14. Coverage and mutation matrix

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
NOGHOSTINFLOW | after stage 1 the construction plan builds an owned pane for exactly one structural transition namely browse to browse and returns real-source for every other pair including home to browse home to overlay and browse to overlay | unit call constructionPlanFor over all eight structural cases from the frozen spec and assert outgoing equals real-source everywhere except the browse to browse case | NATURAL restore the widened condition so an in-flow source going to a non-home destination is planned as app-ghost again which reddens the home to browse and both to-overlay rows expected killing cell NOGHOSTINFLOW | unit pure classification
HOMESTAYSLIVE | during a home to browse drag the real home element is the outgoing mover and is never parked while the gesture is live and it IS parked once a committed gesture finalizes and is NOT parked after an aborted one | integration boot the app harness with fake timers and deferred rAF then swipe home to books and assert at every mid-drag step that the home element does not carry the parked class and carries a translateX transform then advance past the settle and assert parked is present after a commit and absent after an abort | TWO mutants because one cannot exercise both edges. NATURAL-a the browse-host render branch re-parks home at drag start which reddens the mid-drag assertion. NATURAL-b the finalize commit path stops parking home which reddens the post-commit assertion. expected killing cell for BOTH is HOMESTAYSLIVE | integration app harness over the real shipped listeners
PAGEISVIEW | each browse page is its own inset own-scroll box whose scroll and content declarations are the ones the browse host carried before the relocation and the browse host itself is no longer a scroller | unit read the shipped css and assert the browsepage base rule declares position absolute and inset zero and overflow-y auto and the same padding and the same webkit-overflow-scrolling and overscroll-behavior values the retired browse host rule carried with each value compared textually against the retired rule captured in the fixture rather than hardcoded and assert the browse host rule declares no overflow-y and no padding | THREE mutants. NATURAL-a the browsepage rule omits overflow-y auto so the page is not a scroller. NATURAL-b the browsepage rule declares a different padding than the retired host rule so the content boxes disagree. NATURAL-c the browse host keeps overflow-y auto so two scroll authorities exist at once. expected killing cell for ALL THREE is PAGEISVIEW | unit css structural audit
MOVERHASBOX | every element a swipe can resolve as a mover generates a principal box so the inline drag transform is never inert | unit derive the mover host set from source namely the ids appViewEl and overlayEl and viewElFor can return plus the browse host returned literally by the browse-host render branch and assert that for each one the shipped css declares neither display contents nor display none in its base rule and that the browse host base rule still declares position fixed | TWO mutants. NATURAL-a the browse host base rule is changed to display contents which is the exact defect this revision corrects. NATURAL-b the browse host base rule drops position fixed leaving it in flow. expected killing cell for BOTH is MOVERHASBOX | gate source structural
PARKBOXEQUAL | a parked browse page occupies the same box as an active one because the parked rule declares no position and no insets of its own and inherits every box property from the base rule exactly as the home park rule does | unit read the shipped css and assert the browsepage parked rule declares transform and overflow hidden and pointer-events and z-index and declares NONE of position top bottom left right max-width or margin and separately assert the home park rule satisfies the same shape so the two rules are compared against one another rather than against a hardcoded list | TWO mutants. NATURAL-a the parked rule reintroduces top zero which makes the parked box taller than the active one. NATURAL-b the parked rule drops overflow hidden which removes the scroll-container status the anchoring guarantee depends on. expected killing cell for BOTH is PARKBOXEQUAL | unit css structural audit
PAGEOWNSSCROLL | the container role stays bound to the browse host while the scroller role belongs to each page so a page swap never wipes a page instead of the container and each virtual controller measures the page it was built for | integration boot the app harness and build two browse pages with different scroll heights then assert that reset empties the host and not a page and that browseVisible tests the host and then swap pages and assert the outgoing controller captured its anchor against the outgoing page by reading back the anchor it saved | TWO mutants. NATURAL-a the container operations are re-pointed at the active page so reset wipes a page and a new page is appended inside another page. NATURAL-b the metrics closure reads a shared reference instead of the page it was built for so the outgoing controller captures against the incoming page. expected killing cell for BOTH is PAGEOWNSSCROLL | integration app harness plus unit
RESETCOVERSPAGES | the swipe style reset clears inline transform and transition and will-change and z-index from every browse page and not only from the elements that carry an id so an interrupted browse to browse gesture cannot leave a page stuck off viewport | unit drive resetSwipeStyles against the real index fixture with an inline transform written onto two browsepage nodes and assert both are cleared alongside the id-carrying views | NATURAL the reset keeps its id-only element list so a browsepage transform survives the reset expected killing cell RESETCOVERSPAGES | unit nav reset against the real fixture
ENTRYNOZERO | re-entering a cached browse page keeps the scroll offset the page element already holds and a position is written only when one is derived namely a files page playing track or a virtual page anchor | integration boot the app harness and enter a books page and set its scrollTop then leave to home and return and assert the offset is unchanged and separately assert a files page for the locally playing book still opens at that track | TWO mutants. NATURAL-a entryScrollY returns zero instead of null for a list page so positionOnEnter writes zero over the retained offset which is the exact inversion this rule prevents. NATURAL-b positionOnEnter writes even when the derived value is null. expected killing cell for BOTH is ENTRYNOZERO | integration app harness
BROWSESURFACE | the custom scroll indicator recognises a browse page as a supported scroll surface and the native scrollbar suppression covers it | unit call the scrollbar surfaceKind helper with a browsepage element and assert it returns a supported kind rather than null and separately read the shipped css and assert the native-scrollbar suppression selector list covers the browsepage class | TWO mutants. NATURAL-a the browsepage is left out of the supported set so surfaceKind returns null and the indicator removes itself on browse. NATURAL-b the browsepage is left out of the native-scrollbar suppression selector so a native scrollbar returns. expected killing cell for BOTH is BROWSESURFACE | unit
NPPILLIDS | the now playing pill decoration still strips ids from its clone after the ghost builder is deleted | unit call the pill decoration builder against a fake env whose pill carries a descendant with an id and assert the returned clone carries no id | NATURAL delete the id-strip line inside the pill builder which is the second occurrence of the exact text the deletion list targets inside the ghost builder expected killing cell NPPILLIDS | unit construction seam against a fake env
NOGHOSTATALL | after stage 2 no transition builds an owned pane and the Construction return carries no capture field at all | unit call buildConstruction against a fake env over all eight structural cases and assert no mover carries ownership owned-pane and that the returned object has no capture key and that no node with the retired ghost class was appended to the fake document | NATURAL re-add the app-ghost branch for browse to browse so a pane is built and a capture is returned which reddens all three assertions expected killing cell NOGHOSTATALL | unit construction seam against a fake env
ABORTNORENDER | an aborted swipe never re-renders its source screen because the source element was never overwritten so the abort is a transform reset and nothing else | integration boot the app harness and record every Browse render call then swipe books to authors and abort and advance past the settle and assert the recorded render count for the source screen is zero for the whole settle and finalize window and that the source page node is the same object it was before the gesture | NATURAL restore the rerender branch on the abort path so applyScreen is called with render true and the source screen is rendered again which reddens the zero-render assertion expected killing cell ABORTNORENDER | integration app harness abort path
NOAPPCLONE | no first-party script clones an element that hosts a view and no temporary allowance for such a clone remains registered | gate scan every first-party js file excluding the vendored bundle for a cloneNode call whose receiver resolves to a view host or the app container per the resolution rules in section 16 and fail naming the file and line and assert the registered exception list holds exactly the now-playing pill entry | ADDITIVE inject a cloneNode call on a queryselector for the app container into an existing first-party file so the derived set gains an unregistered site and the gate reddens and separately inject one on the navbar pill selector and assert the registered exception does NOT redden expected killing cell NOAPPCLONE | gate source scan over first-party js
```

**Thirteen cells, twenty-three mutants.** Every cell asserts a **source fact, a class-state fact, a
call-count fact or a written-property fact** — never a rendered geometry. That is deliberate: jsdom has
no layout, no paint, no font boosting and no scroll anchoring, so a CI cell asserting the alignment, the
reflow, the reveal jump or the containing-block flip **could not fail** and would be a false witness.
Those questions are §15's, and they are real-engine-measured or device-owed.

**Two cells earn a note on why they are structural rather than behavioural.** `MOVERHASBOX` and
`PARKBOXEQUAL` both assert properties of CSS *text*, because the behaviour they protect (a transform
taking effect; a park not changing a scroll range) is unobservable without layout. A textual cell cannot
be made vacuous by the environment, which is this project's established reason for preferring one.

**Cells that get deleted rather than kept:** every existing assertion whose subject is the built pane
(§12 item 27), plus the four named migrations in §10's contract table. A cell that can only pass by the
clone existing is not coverage of this design; it is coverage of the thing being removed.

## 15. Risk, and what only a device can settle

**What could regress, honestly.**

- **R-A. The off-viewport mover extends the page or paints outside the viewport.** Settled for Stage 1's
  case by measurement (R2, 2026-07-30). Stage 2's case is different and is R2b.
- **R-B. The A–Z strip re-parents when its page is transformed.** Certain to happen. §5.4 derives that
  the containing rectangle is identical to the one `browse→home` already produces today, so the risk is
  that it *looks* wrong in a direction nobody has watched, not that it is new. R3.
- **R-C. The virtualizer's scroll anchoring changes behaviour when its scroller changes from the shared
  host to the page node.** Anchoring is engine machinery; jsdom models none of it. R4.
- **R-D. The park/un-park edge.** `.browsepage.parked` is a transformed scroll container, which is the
  exact configuration `css:110-117` measured at −80px when its `overflow` was got wrong. §5.3.3 makes the
  parked and active boxes identical by construction, and step 10a measures that before the device sees
  it. R5.
- **R-E. The heading reflow does not go away.** Stage 1's device pass is the evidence for this and it is
  **discharged**: Stage 1 is device-confirmed. Retained here only so the honesty condition is not lost —
  if the reflow ever returns, `text-size-adjust` is not the fallback.
- **R-F. A gate is repaired by narrowing it.** M1WRITERSET, `BROWSEFIXED` and `NOAPPCLONE` all redden or
  change under Stage 2. Each one's correct response is re-derivation or migration; narrowing a pattern
  to make a red go away removes exactly the coverage the next adversarial pass targets. Named as a risk
  because it is the cheapest wrong move available to the builder at step 10.

**Measured in a real engine** (`chrome --headless=new --disable-gpu --user-data-dir=<scratch>`,
real-time — no `--virtual-time-budget`; the instrument the strikes in
`Claude/Loki/STRIKE-home-shift-m1-*.md` already used):

- **R1 and R2 — done, 2026-07-30.** A real fixed mover shows zero content-top and font-size delta under
  transform; a fixed mover at `translateX(±innerWidth)` does not extend `scrollWidth`; the filmstrip's
  two movers stay edge-to-edge with zero overlap for the whole live drag.
- **R2b — open, gates step 10.** An `inset: 0` absolutely-positioned `.browsepage` inside the fixed
  `#browse` (whose `overflow` is `visible`), translated to `+w`: does it extend
  `document.scrollingElement.scrollWidth`, and does it paint outside the viewport? Also read the parked
  page at `translateX(-101vw)` on the same question in the negative direction.
- **R2c — open, gates step 10b (this is step 10a).** With and without `.parked` on the same
  `.browsepage`: the resolved `top`, `bottom`, `clientHeight` and `scrollHeight` of the box, and the
  reveal delta after a mid-park content mutation. All deltas must read 0.

**Device-owed — only the user's iOS device can settle these** (WebKit, iOS 26, real compositing):

- **R3.** The A–Z strip during a `browse→browse` drag and during a `browse→home` drag, and at the reveal.
- **R4.** Cover warmth and row retention across a `browse→browse` abort with per-page scrollers, on a
  long virtualized list.
- **R5.** The known open repaint-on-abort symptom: whether it survives de-cloning. **Do not predict it
  either way.** Stage 2 is **not passive** toward it: it removes one recorded trigger (`abortRender:
  'rerender'`) and it relocates the scroll-anchoring surface from `#browse` to `.browsepage`. §5.3.3 and
  step 10a remove the third candidate (a changed park box) *before* the gate runs, so the device
  observes **one** changed variable at the anchoring surface rather than three. If step 10a does not read
  zero, the confound is live and the sequence stops there. §18 F5 carries the sequencing ruling.
- **R6.** iOS fixed-layer displacement (the black-band class) with `#browse` as a non-scrolling fixed
  box. The runway that seats the bars is on `.app` and is untouched, so no premise changes — but the
  black-band saga has surprised this project before and the check is cheap.

**Prior scars this plan is exposed to.** The swipe machinery has invalidated verifications through
environment traps before (recorded in memory `tomeroam-swipe-repaint-saga`, eight of them); a
device-confirmed fix has been shipped in a *variant* form and flashed (`translateZ(0)` for
`will-change`). Consequence: **the form that is device-tested is the form that ships**, and a Stage-1
pass on device is not evidence about Stage 2.

## 16. The anti-cloning gate — built in Stage 1, closed in Stage 2

**`test/no-view-clone-gate.test.js` exists at HEAD.** It was built during Stage 1 rather than deferred,
on the user's instruction. This section records what it is and what Stage 2 owes it.

- **What it makes impossible:** a first-party script creating a copy of an element that hosts a view.
- **Scope.** Every `.js` under `js/`, excluding `js/vendor/`.
- **Detection.** Any `cloneNode`/`importNode` call, or an `innerHTML = X.outerHTML` round-trip, whose
  receiver resolves to a view host: a selector literal or `getElementById` argument matching `.app`,
  `#home`, `#browse`, `#options`, `#nowplaying`, `.browsepage`, `.view`, or any id in
  `Nav.SETTINGS_SUBS` (derived from `js/nav.js`, not restated); or a local identifier assigned from such
  a lookup earlier in the same file. **An unresolvable receiver FAILS** — that is exactly how the
  seventh background painter shipped green.
- **Registered exceptions at HEAD — two, and Stage 2 must leave one.**
  1. `npPillClone`'s `env.navPill().cloneNode(true)` (`js/swipe.js:338`) — a navbar pill, not a view.
     **Permanent.**
  2. A dated temporary allowance (2026-07-30) for the outgoing app-ghost's
     `doc.querySelector('.app').cloneNode(true)` (`js/swipe.js:298`) — the one transition Stage 1 leaves
     cloned. **Stage 2 deletes this entry with the clone it allows.** The gate's own header states that a
     coverage pass finding this entry still registered has found an incomplete Stage 2.
- **Rot protection.** A registered entry whose text no longer occurs in source **fails**, so deleting
  `ghostApp` without deleting exception 2 reddens the gate rather than passing silently. That is the
  mechanism that makes item 26 of the deletion list self-enforcing.
- **Honest limit, stated in the test's own header.** It proves a **textual** property. A clone built
  through a fully dynamic receiver, or in a future non-`js/` surface, is outside it. It does not prove
  the swipe is correct; it proves this specific class cannot re-enter by the routes source text can see.
- **Wiring.** Already in the normal `npm test` battery, therefore at pre-commit.

## 17. Separate notes — not part of this plan's fix

**`text-size-adjust` is not proposed, and deliberately.** It is absent from `css/` and `index.html`.
Setting it would suppress the visible reflow without changing why the two layouts differ, which is
symptom treatment and is rejected. Stage 1's device pass discharged R-E; if the reflow ever returns,
`text-size-adjust: 100%` is worth considering on its own merits as a separate proposal, never as a
fallback for this plan.

**The additive-overlay premise is void, and nothing here depends on it.** `js/nav.js` `setView`
(`:62-70`) keeps `#options`, the subs and `#nowplaying` additive because "hiding the tall view shrinks
the document, and a short document trips iOS 26's ~50pt fixed-layer displacement." With `#home` and
`#browse` both `position: fixed`, **no in-flow view drives document height any more** — the only driver
is `.app`'s constant 12vh runway (`css:75`). So hiding a view can no longer shrink the document, and the
stated premise no longer holds. **Verified by reading, not assumed** — and deliberately **not acted on**:
real-element movers work perfectly well with additive overlays, so changing it would be scope this plan
did not earn.

**Proportionality.** Stage 1 was a one-line classification change plus a park-timing change, and it
shipped. Stage 2 is a CSS relocation, one role split in `js/browse.js`, one widened reset, eight test
and gate migrations, and a long subtraction. The length here is the deletion list, the migration table
and the honesty about what only a device can settle — not the size of the change.

## 18. Review resolutions — the reworked mechanism, finding by finding

Every finding in `Claude/Charpy/PLAN-swipe-declone-stage2-charpy.md`, with what this revision does about
it. F11 is not from that review; it is a defect this rework found while discharging F3.

**F1 — Structural. `display: contents` on `#browse` made the drag transform inert on four transitions.
RESOLVED by replacing the mechanism.** `#browse` keeps its `position: fixed` inset box and gives up only
`overflow-y: auto` and its padding (§5.3.1). The finding's invariant — "whatever `#browse` becomes, it
must remain a transformable box for as long as `nav.js:36` and `app.js:544` resolve movers to it" — is
promoted to **Invariant D5** and gated by `MOVERHASBOX`, so the coordinate is closed structurally rather
than by a note. §5.1's per-transition table and §5.3 now describe the same design.

**F1a — Structural, conditional. The fallback route re-contains a `position: fixed` `.browsepage`.
RESOLVED by not taking that route.** The page is `position: absolute`, and `#browse` is *already* the
containing block for absolutely-positioned descendants whether or not it is transformed — so the
containing block cannot flip. §5.3.2 derives the geometry the fixed-page route would have produced
(down by `safe-top + 51px`, height shrinking by `2·(T + B)`, ≈110px and ≈328px on a notched iPhone) so
the choice is on the record rather than rediscovered.

**F2 — Structural, conditional. Stage 2 falsified `PLAN-one-screen-type.md` §5.5, the ground for Stage
A2's `z-index` deletion. DISSOLVED, with one records obligation surviving.** §5.5's mechanism needs
`#browse` to establish a stacking context via its inline transform, which requires a box. Keeping the box
keeps §5.5 true, so Stage 2 removes no premise A2 depends on and there is no paint regression to
condition on A2. **What survives:** `PLAN-one-screen-type.md:1967-1976` items 2 and 3 describe Stage 2's
mechanism as `display: contents`, which is now wrong. ⛔ This plan does not edit that plan; §13 step 14
routes the correction to the user, who owns the cross-plan reconciliation.

**F3 — Structural. `o.mount` carries two roles and §5.3 re-pointed the single reference. RESOLVED by
splitting the roles rather than re-pointing the reference.** `o.mount` **keeps** the container role
(`js/browse.js:80`, `:204`, `:497` are untouched) and loses the scroller role, which is taken by the page
element every scroller call site already holds: `applyScrollY` gains a `page` parameter, `playingTrackY`
already has one, and `virtualView`'s metrics and `scrollTo` closures read `m` — its own first parameter —
so each controller measures the page it was built for. The quieter half of the finding is closed by
construction: there is no shared mutable pointer for `showPage`'s deactivate loop
(`js/browse.js:286-291`) to mis-target, so `captureAnchor` (`js/virtuallist.js:247-250`) cannot capture
the outgoing page's anchor against the incoming page's box. No second injected field is added, so the
no-dead-fields rule is satisfied. The finding's note that the declared `source_ranges` were incomplete is
discharged: the gate declaration now names `js/browse.js:60-90`, `:108-131`, `:200-265`, `:267-319`,
`:480-547` and `:637-662`.

**F4 — Structural. `.browsepage.parked` becomes geometrically wrong and its stated reason for diverging
is falsified. RESOLVED by extending Invariant P to it.** The parked rule declares no position and no
insets and parks by transform alone, so every box property cascades from the base rule and the parked
box is identical to the active one by construction (§5.3.3). `overflow: hidden` is retained on the two
grounds `css:110-117` records. The falsified comment at `css:105-108` is **rewritten**, not deleted
(§12 item 21). The specificity question the finding raised is answered in §5.3.3: no rule in the set
depends on source order. `PARKBOXEQUAL` is the cell, and it compares the two park rules against each
other rather than against a hardcoded list, so it cannot drift.

**F5 — Structural. Stage 2 perturbs both known mechanisms of the open abort-repaint symptom while §15 R5
treats it as passive. RESOLVED, and here is the sequencing ruling the review asked for.**

> **Stage 2 goes FIRST. Do not attempt the abort-repaint defect before it.**

Three reasons, in order. **One:** Stage 2 deletes one of the symptom's two recorded mechanisms outright —
`abortRender: 'rerender'` and the `#browse`-host overwrite that makes it necessary. A fix aimed at that
mechanism today would be device-tested against a form that does not ship, which is this project's
standing scar. **Two:** the other recorded mechanism — a `display: none` subtree dropping decoded bitmaps
— is mitigated by `.browsepage.parked`, and Stage 2 is the change that makes that rule geometrically
sound. Attacking the defect on top of a park rule that is about to be re-derived is attacking a moving
target. **Three:** the confound the review names is real but it is not a sequencing problem, it is a
*variable count* problem, and the right fix is to reduce the count rather than to reorder. §5.3.3 removes
the park-geometry candidate by construction, and **step 10a measures it to zero before the device sees
anything** (R2c). What remains changed at the anchoring surface is one variable: its identity moves from
`#browse` to `.browsepage`. **If step 10a does not read zero, the sequence stops there** — that is the
condition under which Stage 2 would make the defect less attributable, and it is now a gate rather than a
hope. §15 R5 is rewritten to say all of this instead of reading as neutral.

**F6 — Weak. The custom scroll indicator goes dark on browse and native scrollbars return. FOLDED.**
`ScrollBar.surfaceKind` (`js/scrollbar.js:47-53`) classifies by `t.id === 'browse'` at `:50`, and a
`.browsepage` carries no id (`js/browse.js:494-495`), so `update` (`:82-83`) would take the unsupported
branch and remove the indicator. Separately `css:811-814` hides native scrollbars by id, `#browse`
among them, and a `.browsepage` is not covered. Both fixes are in scope, and `BROWSESURFACE` (§14) is
the cell with a mutant on each half. The existing `SCROLLBAR` cell at `test/browse-decouple.test.js:100`
is migrated rather than kept (§10).

**F7 — Weak. Deleting `sy` without touching the restore call site resets every browse re-entry to the
top. FOLDED, and the rule is inverted rather than patched.** `entryScrollY` (`js/browse.js:222-225`)
returns `savedY || 0` for every non-files view, and `positionOnEnter` (`:255-265`) writes it via
`applyScrollY` at both call sites — `:489` on a cache hit and `:546` on a fresh page. Deleting `sy` alone
makes `savedY` `undefined` and writes `0` over the page's retained offset. Rather than threading a
replacement value, `entryScrollY` loses the parameter and returns `null` where it used to return
`savedY || 0`, and `positionOnEnter` **writes only a derived position** (§5.3.4). There is then no
`savedY` left to be undefined. `playingTrackY` and `anchorEntryY` are named in §4 STAYS and §5.3.4 so
they are not swept up with the deletion; `anchorEntryY` guards model drift, not scroller sharing.
`ENTRYNOZERO` is the cell.

**F8 — Note. Every `file:line` citation in §12 and §16 is stale post-Stage-1, and one deletion target's
text occurs twice. FOLDED.** §12 was re-derived line by line against HEAD `b9b0682` and its citations are
listed in §19. The double-occurrence trap is now explicit: §12 item 4 deletes `js/swipe.js:312` **only**,
names `js/swipe.js:339` inside `npPillClone` as the occurrence that must survive, and `NPPILLIDS` (§14)
is the cell that reddens if the wrong one goes. `test/mutation-anchors.test.js` independently reddens
with `ANCHOR NOT FOUND` on any anchor whose target text is deleted.

**F9 and F10 — Note, verifications rather than defects. ACCEPTED, no change.** The retired callee range
holds exactly one pre-mount data-attribute effect (`data-art`, `js/swipe.js:222`) and §8 assigns it;
`np-locked` (`js/app.js:551`) and `d.byId` are confirmed untouched. F10's qualification — that F1 changed
what the looked-up element is *capable of* — no longer applies, because the reworked mechanism leaves
`appViewEl('books')` returning a transformable fixed box.

**F11 — Structural, found by this rework. `Nav.resetSwipeStyles` does not cover the elements Stage 2
makes into movers. FOLDED.** `js/nav.js:104-110` clears inline swipe styling from a fixed list of ids
plus `.np-actions`; no `.browsepage` carries an id (`js/browse.js:494-495`). At HEAD this is complete,
because `browse→browse`'s outgoing mover is an owned pane that is removed wholesale. Stage 2 makes a
`.browsepage` a borrowed mover for the first time, so a gesture interrupted before the settle path's own
clear (`js/app.js:816`) would leave a page stuck at `translateX(±w)` with nothing to reset it — the
"erratic after a while" class the comment at `js/nav.js:90-103` says this reset exists to prevent.
`resetSwipeStyles` widens to include every `.browsepage`; `RESETCOVERSPAGES` is the cell.

**Three more corrections this rework made to the plan's own claims, each verified against HEAD.**

1. **The anti-cloning gate is already built.** §13 step 12 ("Build the anti-cloning gate to §16") and
   §16's "lands after Stage 2" were false at HEAD. §16 is rewritten and the step is replaced by the
   removal of the gate's temporary exception.
2. **`test/ghost-clone-geometry.test.js` no longer exists.** Stage 1 deleted it and created
   `test/ghost-clone-alignment.test.js` as a browse→browse-scoped interim guard. §12 item 23 and the gate
   declaration's `affected_contracts` are re-pointed at the file that exists.
3. **M1WRITERSET reddens on Stage 2 and nothing in the plan said so.** `test/scroll-writer-set.test.js`
   holds a 14-entry registered baseline of every textual vertical-scroll writer in `js/`, with a rot
   check that fails when an entry's text no longer occurs. Stage 2 rewrites entries 3 and 4 and falsifies
   entry 6's recorded reason. §10's contract table and §12's part-A commit set carry the obligation, and
   §15 R-F names the wrong response so it is not taken.

## 19. Claims verified against source in this rework

Every `file:line`, mechanism and count this revision **newly asserts** was read against HEAD `b9b0682`
before handback, per the standing step-1a obligation. The list is the audit trail, not a summary.

**Read in full:** `js/browse.js`, `js/nav.js`, `js/scrollbar.js`, `css/app.css:1-230`,
`Claude/Plans/PLAN-swipe-declone.md`, `Claude/Charpy/PLAN-swipe-declone-stage2-charpy.md`.
**Read in part:** `js/swipe.js:130-420`, `js/app.js:490-556`, `js/virtuallist.js:240-275`,
`css/app.css:695-712`, `css/app.css:805-814`, `test/scroll-writer-set.test.js`,
`test/no-view-clone-gate.test.js:1-45`, `test/browse-decouple.test.js:56-100`,
`test/ghost-clone-alignment.test.js:1-30`, `test/contract-function-gate.test.js:33-63`,
`test/fixtures/swipe-plan-spec.mjs:1-40`, `tools/mutate.mjs` (grep-scoped to the ghost anchors),
`Claude/Plans/PLAN-one-screen-type.md:855-880` and `:1960-1985`, `Claude/Zelda/Board.md:615-700`,
`Claude/Decisions/DecisionLog.md:1000-1213`.

| Claim | How it was verified | Result |
|---|---|---|
| `#browse` is the mover on four transitions | read `js/nav.js:36`, `js/app.js:541`, `:544`, and the transform writes at `:594`, `:615`, `:654` | confirmed |
| `#browse`'s shipped rule and its insets | read `css/app.css:184-191` | confirmed; the plan's prior citation `css:176-184` was stale |
| `.browsepage` has **no** base rule at HEAD | grepped `browsepage` across `css/app.css` — only `:86` (`.parked`) and two comment mentions | confirmed; the base rule is new, not a modification |
| `.browsepage.parked`'s declarations and the divergence comment | read `css/app.css:86-91` and `:105-108` | confirmed |
| Invariant P's `overflow: hidden` derivation and the −80px measurement | read `css/app.css:99-126` | confirmed |
| `.alphaindex` is `position: fixed` with its own insets and is a child of the **page** | read `css/app.css:699-707` and `js/browse.js:661` | confirmed |
| The strip's containing rectangle is unchanged by Stage 2 | derived from the two rules above plus `#browse`'s zero border and newly-zero padding; §5.4 | derived, not measured — R3 remains device-owed |
| `o.mount`'s container call sites | read `js/browse.js:80`, `:204`, `:497` | confirmed |
| `o.mount`'s scroller call sites | read `js/browse.js:68-72`, `:228`, `:252`, `:654-658` | confirmed |
| `virtualView`'s page node `m` is already in scope for the metrics closure | read `js/browse.js:637-662` | confirmed — the fix needs no new field |
| `positionOnEnter` has **two** call sites, not one | read `js/browse.js:489` and `:546` | confirmed; the review named `:489`, and `:546` passes a literal `0` |
| `entryScrollY` returns `savedY \|\| 0` for every non-files view | read `js/browse.js:222-225` | confirmed |
| `captureAnchor` and `deactivate` in the virtualizer | read `js/virtuallist.js:247-250` and `:251-262` | confirmed |
| `showPage`'s deactivate loop runs before `.hidden` lands | read `js/browse.js:286-291` and `:299-303` | confirmed |
| `surfaceKind` keys on `t.id === 'browse'`; a page has no id | read `js/scrollbar.js:47-53` and `js/browse.js:494-495` | confirmed |
| Native scrollbar suppression is by id and does not cover `.browsepage` | read `css/app.css:811-814` | confirmed |
| `Nav.resetSwipeStyles` covers ids only | read `js/nav.js:104-110` | confirmed — this is F11 |
| The id-strip text occurs twice | read `js/swipe.js:312` and `:339` | confirmed |
| `npPillClone`'s clone call | read `js/swipe.js:338` | confirmed; §16's prior citation `:318` was stale |
| Every §12 `js/swipe.js` citation | read `js/swipe.js:146-205`, `:217-345`, `:354-406` | all re-derived; every prior citation had moved |
| Every §12 `js/app.js` citation | grepped and read `js/app.js` for `dropPanes`, `revealPending`, `keepGhosts`, `.nav-ghost`, `ghostY`, `owned-pane`, `abortRender` | all re-derived; every prior citation had moved |
| `env.scrollY` has no consumer at HEAD | grepped `env\.[a-zA-Z]*` across `js/swipe.js` — `env.document`, `env.navPill`, `env.sourceEl`, `env.renderDestination` only | confirmed; §10's prior claim and its `:304` citation were false at HEAD |
| `showAppView` no longer parks `#home` mid-drag | read `js/app.js:493-516` | confirmed — §12's prior item 13 is discharged |
| The `#home` false-background comment is already scrubbed | read `css/app.css:148-156` | confirmed — §12's prior item 15 is discharged |
| `test/no-view-clone-gate.test.js` exists with **two** registered exceptions | read `test/no-view-clone-gate.test.js:1-45` | confirmed; §13 step 12 and §16's wiring claim were false |
| `test/ghost-clone-geometry.test.js` does not exist; `test/ghost-clone-alignment.test.js` does | `ls` on both; read the latter's header | confirmed; §12 item 16 was pointing at a deleted file |
| `BROWSEFIXED` asserts `position: fixed` **and** `overflow-y: auto` on the base `#browse` rule | read `test/browse-decouple.test.js:56-89` | confirmed — one assertion migrates, three are kept |
| M1WRITERSET's baseline entries 3, 4 and 6 name `o.mount` | read `test/scroll-writer-set.test.js:169-205` | confirmed — entries 3 and 4 rot on Stage 2 |
| `finalizationPlanFor` is registered under `CONTRACT`, `buildConstruction` under `NON_CONTRACT` | read `test/contract-function-gate.test.js:33-63` | confirmed |
| `entryScrollY`, `applyScrollY`/`isRestoring` and `sy` have live test consumers | grepped `test/` | confirmed at `test/repaint.test.js:135-202` and `test/browse-virtual.test.js:538-552` |
| `PLAN-one-screen-type.md` §5.5's containment argument and its line range | read `:855-880` | confirmed at `:863-873` |
| That plan's convergence items name `display: contents` | read `:1960-1985` | confirmed at `:1967-1976` |
| Stage 1's shipped state, waived gates, and the M2ALIGN/M1NAVWINS follow-ups | read `Claude/Zelda/Board.md:615-700` and `Claude/Decisions/DecisionLog.md:1066-1145` | confirmed |
| The Stage-1 record forecasts Stage 2 as a **fixed** page box | read `Claude/Decisions/DecisionLog.md:1109-1113` | confirmed — declared as a CONFLICT in §1 rather than changed silently |
| Now Playing's uniqueness decision and its scope | read `Claude/Decisions/DecisionLog.md:1147-1167` and `:1195-1213` | confirmed — untouched by this plan |

**What this list does not prove.** It proves the citations and the source facts. It does not prove the
enumerated effects are the complete set, that the chosen owner for each is correct, that a proposed cell
kills the mutation it names, or that the derived geometry in §5.3.2 and §5.4 matches what an engine
actually computes. Those are §13 step 1's, step 8's and step 10a's, and the review's.
