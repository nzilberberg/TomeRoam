# PROBE — swap necessity per transition: is a snapshot/ghost/re-render FORCED, or incidental? (Linnaeus)

Type: fact sheet (deriver — facts derived from primary source at HEAD `.261`, cited `file:line`).
READ-ONLY. No code/plan/test edits. Not a build plan. 2026-07-28.

Subject: the user's reframe — "for screens already assembled, why swap at all? slide the real screen
and leave it." This sheet derives, per swipe transition, (a) the actual DOM element each screen IS,
(b) what the current code builds, and (c) which SOURCE-GROUNDED hard constraint (if any) forces a
swap (snapshot / ghost / single-host re-render) rather than sliding the real element. The
classification falls out of cited source constraints; the "therefore slide-and-leave" is Vitruvius's.

Companion to `Claude/Linnaeus/PROBE-home-carousel-layers-2026-07-28.md` (the carousel-layer grounding)
and `PROBE-home-vs-browse.md` (the `#browse` fixed-strip asymmetry). Reference version: HEAD
`28a64ff` (`.261`).

Marks: **[LB]** load-bearing, **[CX]** context, **[UD]** underived (runtime-compositor; what would
settle it is named).

---

## 0. HEADLINE (read first)

The app reduces every transition to three structural KINDS — `home`, `browse`, `overlay`
(swipe.js:51-58). The screen elements those kinds map to have three different DOM lifetimes, and the
lifetime is what determines whether a swap is forced:

- **`home` = `#home`**, a persistent singleton that is NEVER `display:none` — parked-but-PAINTED when
  inactive (nav.js:57 toggles only `.parked`, never `.hidden`; css:103-118), with NO `position:fixed`
  descendant. **[LB]**
- **`browse` = the ONE shared `#browse` container** (index.html:62), `display:none` when inactive
  (nav.js:64). All of Books/Authors/authorBooks/files are distinct cached `.browsepage` nodes INSIDE
  that one `#browse` (browse.js:12-19), and `#browse` carries a `position:fixed .alphaindex` strip
  (css:620-623). **[LB]**
- **`overlay` = persistent singleton overlay elements** (`#options`, `#nowplaying`, the five settings
  sub-screens), `display:none` when inactive (nav.js:73-76). **[CX]**

Applying the four hard constraints (§3) to the eight structural transitions (§2) yields: a swap is
FORCED only where both endpoints are the single `#browse` container (→ `browse→browse`, single-host)
or where the incoming element does not yet exist painted and must be realized. **The one transition
the camera flash is on — `browse→home` (commit) — has NO swap-forcing constraint**: the incoming
`#home` is a distinct persistent painted element with no fixed descendant, yet the current code
reveals it via a `home-snapshot` cover swapped to the real un-parked `#home` (§4, row 3). Whether
sliding the real `#home` in and leaving it would avoid the one-frame carousel raster the camera showed
is a runtime-compositor question **[UD]** (§5).

---

## 1. The screen → element map (what each screen IS)

| kind | concrete screens | THE element | lifetime when inactive | fixed descendant? | cite |
|---|---|---|---|---|---|
| `home` | Home | `#home` (singleton) | `.parked` — off-screen but PAINTED (never `display:none`) | NONE (carousels are `position:static` scroll boxes) | index.html:48; nav.js:57; css:103-118; PROBE-home-vs-browse §5 |
| `browse` | Books, Authors, authorBooks, files | ONE `#browse` container; each screen a distinct cached `.browsepage` node inside it | `#browse` container `display:none`; pages kept attached-but-hidden | `.alphaindex` (`position:fixed`) built into EACH `.browsepage` | index.html:62; nav.js:64; browse.js:12-19,820; css:620-623 |
| `overlay` | Options, NowPlaying, general/playback/buffering/downloads/diagnostics | singleton element, `id === view name` | `display:none` | (n/a to this question) | nav.js:35,73-76 |

**[LB] `#home` is the only screen element kept PAINTED while inactive.** `setView` toggles `.parked`
on `#home` (nav.js:57) and `.hidden` (`display:none`, css:82) on `#browse` (nav.js:64) and the
overlays (nav.js:73-76). `#home` is shipped `class="view"` with no `hidden` (index.html:48) and no
code path adds `.hidden` to it. So when any other screen is active, `#home` is parked-painted (covers
warm, carousel `scrollLeft` retained — PROBE-home-carousel §2), while `#browse` and the overlays are
`display:none`.

**[LB] The four browse screens are distinct persistent nodes, not one re-rendered node.** Each browse
screen is "built ONCE into its own `.browsepage` node, kept attached (just hidden) inside `o.mount`"
(browse.js:12-19), where `o.mount` is `#browse`. A cache HIT is "instant, no rebuild, no image reload"
— a visibility toggle (browse.js:478-483). A cache MISS builds a fresh node and appends it to
`#browse` (browse.js:485-492). So distinct browse pages coexist as separate cached nodes inside the
one `#browse` container; they are never the same node re-rendered. **[LB]**

---

## 2. Every structural transition (enumeration-complete)

`classifyTransition` reduces all pairs to the three kinds (swipe.js:84-110). `home→home` is not a
transition; the eight structural cases are frozen in `test/fixtures/swipe-plan-spec.mjs:53-62` and
mirror `constructionPlanFor` (swipe.js:140-146). The browse-family (Books/Authors/authorBooks/files)
all reduce to kind `browse`, so every browse-to-browse pair (e.g. Books→Authors, Authors→authorBooks,
authorBooks→files) is the single `browse→browse` structural case (spec:26-28,53). The NP pill is a
MODIFIER on top of a structural case, not its own transition (swipe.js:100-102; spec:68-77).

`constructionPlanFor` rules (swipe.js:140-146), verbatim in effect:
- **outgoing** = `real-source` iff source is `overlay` OR destination is `home`; else `app-ghost`.
- **incoming** = `home-snapshot` iff destination is `home`; `real-destination` otherwise.
- **renderDestination** = `browse-host` iff destination is `browse`; else `none`.

`finalizationPlanFor` (swipe.js:174): `abortRender = 'rerender'` iff `browse→browse`; else `none` —
i.e. only an aborted browse→browse re-renders the source page; every other abort restores by
visibility only.

---

## 3. The four hard swap-forcing constraints (source-grounded definitions)

- **A — Single-host re-use.** Both endpoints ARE the same singleton element, so the outgoing and
  incoming cannot both be the real element at once (one element cannot slide out AND in). Present iff
  `fromKind === toKind` AND that kind maps to one shared element. Only `browse` maps to one shared
  element across distinct screens (§1); `home→home` is not a transition; two overlays are DISTINCT
  singletons (`#options` ≠ `#nowplaying` ≠ each sub), so `overlay→overlay` is only same-element for
  `v===v`, which is not a transition. **So A binds `browse→browse` only.** Cite: one `#browse`
  (index.html:62), all browse screens inside it (browse.js:12-19); distinct overlay ids (nav.js:35).

- **B — Fixed-descendant PERMANENT-transform ban.** `#browse` carries a `position:fixed .alphaindex`
  (css:620-623), built into each page (browse.js:820). A **permanent** `transform`/`will-change` layer
  on `#browse` makes it the containing block for that fixed strip and mis-resolves it (the `.195/.196`
  dead-end, PROBE-home-vs-browse §5). **But a TRANSIENT swipe transform is explicitly tolerated:**
  css:618 states the strip "still rides with `#browse` when it transforms during a swipe." **[LB]** So
  B forbids leaving a resting transform/promoted layer on `#browse`; it does NOT forbid sliding
  `#browse` and clearing the transform to `translateX(0)` (no transform) at rest. `#home` has NO fixed
  descendant, so B never binds `#home`. **[LB]**

- **C — On-demand realization.** The incoming element is not painted before the transition, so there
  is nothing already-painted to slide. `#browse` and the overlays are `display:none` when inactive
  (nav.js:64,73-76) → their content is realized/un-hidden during the transition. On a browse cache HIT
  the page node already exists with covers loaded (browse.js:478-483) — only the `#browse` CONTAINER
  was `display:none`; on a cache MISS the page node is built during the drag (browse.js:485-492).
  `#home` is parked-PAINTED (§1) → never on-demand. **[LB]**

- **D — NONE.** Outgoing and incoming are two DISTINCT persistent elements and the incoming is already
  painted, with no fixed-descendant permanent-layer need. The reveal could slide the real incoming and
  leave it. **[LB]**

---

## 4. The classification table (transition → current construction → constraint)

Commit direction unless noted; aborts differ only where the `abortRender` column says so.

| # | transition | outgoing element | incoming element | current construction (cite) | swap-forcing constraint (cite) |
|---|---|---|---|---|---|
| 1 | **home→browse** | `#home` (parked-painted singleton) | `#browse` (shared; `display:none` when home active) | outgoing **app-ghost** (freeze `#home` clone); incoming **real-destination**, dest rendered INTO `#browse` (swipe.js:141-145,322-337) | **C on incoming** (`#browse` was `display:none`; realized/un-hidden during drag — nav.js:64; MISS builds, browse.js:485-492). **Outgoing app-ghost of `#home` is NOT forced** — `#home` is a distinct painted element, no fixed descendant (constraint D on the outgoing side). |
| 2 | **home→overlay** | `#home` (parked-painted) | overlay singleton (`display:none`) | outgoing **app-ghost**; incoming **real-destination** (real overlay slid in), renderDestination none (swipe.js:141,143; spec:55) | **C on incoming** (overlay `display:none`, un-hidden — nav.js:73-76). Outgoing app-ghost of `#home` NOT forced (D). |
| 3 | **browse→home** ⚑ | `#browse` (shared, real) | `#home` (parked-PAINTED singleton) | outgoing **real-source** (borrowed-real `#browse` slid out); incoming **home-snapshot** (clone of `#home` in a fixed full-viewport cover), then at commit the REAL `#home` is un-parked under the cover and the cover drops (swipe.js:140-141,144,270-282,331-334; app.js:1211-1219; nav.js:57,64,127) | **NONE (D).** Incoming `#home` is a distinct persistent PAINTED element with NO fixed descendant (§1). Nothing in source forces the `home-snapshot` swap over sliding the real parked `#home`. Runtime raster caveat: §5 **[UD]**. |
| 4 | **browse→browse** | `#browse` (shared) | `#browse` (SAME shared container, different `.browsepage`) | outgoing **app-ghost**; incoming **real-destination**, dest page rendered/shown INTO the same `#browse`, outgoing page parked/hidden (swipe.js:141,145,322-337; browse.js:279-296). Aborted → **rerender** (swipe.js:174; app.js:1229) | **A (single-host)** — both endpoints are the one `#browse`; the outgoing page is hidden/parked when the dest is shown in the same container, so the outgoing cannot remain the real mover → ghost. Also **B** binds any resting layer on `#browse` (transient slide OK). |
| 5 | **browse→overlay** | `#browse` (real) | overlay singleton (`display:none`) | outgoing **app-ghost**; incoming **real-destination** (swipe.js:141,143; spec:58) | **C on incoming** (overlay `display:none`). Outgoing app-ghost of `#browse`: not A (distinct elements); B allows the transient slide, so the ghost is not B-forced either. |
| 6 | **overlay→home** ⚑ | overlay singleton (real) | `#home` (parked-PAINTED) | outgoing **real-source**; incoming **home-snapshot** → real `#home` un-park at commit (swipe.js:140,144; app.js:1211-1219) | **NONE (D)** on the incoming-home side — same as row 3: `#home` distinct/painted/no-fixed-descendant. §5 **[UD]**. |
| 7 | **overlay→browse** | overlay singleton (real) | `#browse` (`display:none`) | outgoing **real-source**; incoming **real-destination**, rendered into `#browse` (swipe.js:140,145; spec:60) | **C on incoming** (`#browse` `display:none`). |
| 8 | **overlay→overlay** | overlay singleton A (real) | overlay singleton B (`display:none`) | outgoing **real-source**; incoming **real-destination** (swipe.js:140,143; spec:61). (Button-nav path uses `overlayFilmstrip`, nav.js:162 — moves BOTH real panes) | **C on incoming** (incoming overlay `display:none`). Distinct singletons → not A; no fixed strip → not B. |

⚑ = the two `→home` transitions the user flagged; row 3 (`browse→home`) is the on-camera commit flash.

**[LB] Rows with a swap FORCED by a hard constraint:** 1,2,5,7,8 (constraint **C** — incoming was
`display:none`, must be realized/un-hidden) and 4 (constraint **A** — single shared `#browse`, plus
**B** on any resting layer). **Rows with NO swap-forcing constraint on the incoming reveal:** **3 and
6** — incoming `#home` is parked-painted, distinct, no fixed descendant (constraint **D**).

**[CX] The outgoing-side ghost is separately not always forced.** In rows 1,2,5 the OUTGOING is
`app-ghost` of a distinct element (`#home` or `#browse`) that a hard constraint does not force to be a
ghost — a distinct outgoing could in principle slide real. The camera flash is on the INCOMING reveal
(row 3), so the outgoing-ghost question is secondary; recorded for completeness.

---

## 5. Park/transform facts bearing on "slide-real-and-leave", and the demote question

**[LB] How `#home` is parked and un-parked.** Parked: `#home.parked { position:fixed; top/left/right:0;
transform: translateX(-101vw); will-change: transform; … }` (css:103-108) — off-screen, own layer,
painted. Un-parked on the commit→home reveal: `setView('home')` removes `.parked` (nav.js:57), leaving
`#home` at `transform: none` on the base rule `#home { will-change: transform }` (css:118, unconditional
→ `#home` stays a compositing layer across the class removal). This happens synchronously inside
`applyScreen(dest,{render:false,keepGhosts:true})` (app.js:1212) UNDER the `home-snapshot` cover, which
is then held and dropped (app.js:1213-1218).

**[LB] The current `browse→home` reveal is a snapshot→real SWAP, not a slide-and-leave.** The incoming
mover is a `home-snapshot` — a `cloneNode(true)` of `#home` mounted in a fixed full-viewport cover
(`ghostWrap`: `position:fixed; inset:0; z-index:28`, swipe.js:243,270-282), with each carousel's
`scrollLeft` copied into the clone (swipe.js:201-204,279). The real `#home` is un-parked behind that
cover; when the cover drops (`fadePanes`, app.js:879), the real `#home` is uncovered. So the user sees
the snapshot, then the real `#home` — two representations swapped. The camera (coordinator's ground
truth) caught the real carousels blanking for one frame at that swap. **[LB]**

**[UD] Whether the snapshot→real swap (and specifically un-parking = clearing `#home`'s
`translateX(-101vw)` fixed layer) is what re-rasters the carousel scroll-layers from empty for one
frame.** Removing `.parked` changes `#home` from `position:fixed; transform:translateX(-101vw)` to
in-flow `transform:none` — a transform change on a `will-change:transform` layer whose descendants
include the two `-webkit-overflow-scrolling:touch` carousel scroll-layers (PROBE-home-carousel §2).
Whether that transform-clear forces the carousel sub-layers to re-raster is a compositor decision not
readable from source. Settle with: Safari Web Inspector compositing-layer borders on device, or a
high-frame-rate device capture, across a scrolled `browse→home` commit.

**[UD] Whether "slide the real `#home` in and leave it" (never park/un-park, never snapshot) would
avoid the raster.** The user's proposal is that the real `#home`, once assembled, stays a stationary
composited layer and is slid rather than swapped. Source shows no hard constraint blocks it for `#home`
(no fixed descendant; distinct painted element). Whether it avoids the one-frame carousel raster is the
same compositor question above — jsdom cannot composite it; only a device layer/frame capture settles
it.

**[UD] Whether the flash is the WHOLE-`#home` transform demote or ONLY the carousel scroll-layers.**
The `6f`-confirmed flash class is a real-view transform promote→demote (PROBE-home-vs-browse §3); the
camera for `browse→home` showed the two CAROUSEL strips blanking while headers/nav/player stayed put
(coordinator ground truth). Source can say the carousels are the only own-layer descendants of `#home`
(PROBE-home-carousel §2,§3) — so a strip-only blank is consistent with the carousel layers re-rastering
while `#home`'s own layer and its static text do not. Which layer's re-raster dominates is not
source-derivable; device layer-borders would settle it.

**[CX] `#browse`'s fixed strip forces the harder side, not the `→home` side.** For the reverse
direction (`home→browse`, row 1) the incoming `#browse` carries the fixed `.alphaindex`; a resting
promoted layer on `#browse` is banned (B, css:618 / .195/.196). A transient slide clearing to
`translateX(0)` is tolerated (css:618). So B constrains how `#browse` may rest after a slide, but does
not by itself force the incoming `#browse` to be a ghost — the current `home→browse` already slides the
real incoming `#browse` (row 1, `real-destination`). The forced swap on row 1 is C (it was
`display:none`), not B.

---

## 6. Underived ceiling (compositor facts, none source-readable)

1. That un-parking the real `#home` (clearing `translateX(-101vw)`) re-rasters the carousel
   `-webkit-overflow-scrolling:touch` scroll-layers from empty for one frame — the on-camera blank
   (§5). 
2. That a slide-and-leave of the real `#home` (no park/un-park, no snapshot) avoids that raster (§5).
3. Which re-raster dominates the flash: the whole-`#home` transform demote vs the carousel sub-layers
   (§5).

All three are compositor/runtime; jsdom cannot composite. Settle with on-device Safari compositing
borders and/or a high-frame-rate device capture across a scrolled `browse→home` commit. Everything in
§1–§4 (element lifetimes, per-transition construction, the present/absent hard constraint) is derived
from HEAD `.261` source and cited.

---

## Handoff → Vitruvius (the planner)

Source artifact: this sheet (`Claude/Linnaeus/PROBE-swap-necessity-2026-07-28.md`). Derived: the three
screen kinds map to elements of three different lifetimes — `#home` alone is a persistent PAINTED
singleton with no fixed descendant; `browse` is ONE shared `#browse` (display:none inactive, fixed
`.alphaindex` inside) holding distinct cached page nodes; overlays are display:none singletons. Applying
the four hard constraints to the eight structural transitions: a swap is FORCED by constraint C
(incoming was display:none — rows 1,2,5,7,8) or constraint A/B (single shared `#browse` — row 4); it is
NOT forced on the two `→home` transitions (rows 3,6), where the incoming `#home` is distinct, painted,
and fixed-descendant-free (constraint D). The on-camera flash is row 3 (`browse→home` commit), whose
current construction is a `home-snapshot`→real-`#home` SWAP that no source constraint forces. Whether
sliding the real `#home` and leaving it avoids the one-frame carousel raster is UNDERIVED
(compositor-runtime), settleable only on device. Linnaeus states the facts and hands over; which
transitions to change to a no-swap slide, and how, is Vitruvius's.

VERDICT: DERIVED
