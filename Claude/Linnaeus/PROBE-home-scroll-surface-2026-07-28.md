# PROBE — the Home document-scroll surface & fixed-`#home` feasibility (D1–D3 + §2.1) (Linnaeus)

Type: fact sheet (deriver — facts derived from primary source at HEAD `.261`, cited `file:line`).
READ-ONLY. No code/plan/test edits. Not a build plan. 2026-07-28.

Subject: Vitruvius returned PLAN_BLOCKED on three facts before a fixed-`#home` slide-and-leave plan can
commit. The proposed direction (his, not derived here): keep active `#home` `position:fixed` with its
OWN vertical scroll so the `browse→home` reveal never reflows the document (tall `#browse`→short
`#home`) and never needs a snapshot — the reflow being the camera-confirmed cause of the carousel
raster-from-empty (`PROBE-home-carousel-layers-2026-07-28.md`). This sheet derives D1–D3 and corrects a
missed constraint in `PROBE-swap-necessity-2026-07-28.md`. Companion to those two sheets.

Marks: **[LB]** load-bearing, **[CX]** context, **[UD]** underived (runtime; what would settle it named).

---

## 0. HEADLINE (read first)

- **D1 — Can active `#home` own its scroll?** Structurally possible on the CONTENT axis — Home is
  vertically short (two horizontal carousels; "its document ends up ~viewport-sized", css:75-80), so it
  barely scrolls vertically at all. But active `#home` shares the document scroll BY CONSTRUCTION
  (in-flow child of `.app`, plan §2.1), and the fixed-navbar SEATING mechanism DEPENDS on Home
  producing document height — the exact coupling the `.28` dead-end warns about (an inner
  scroller / viewport-sized document displaced the fixed bars, scrollbar.js:3-6). **Blocked-pending-D2
  rework + one underived device risk** (does a fixed own-scroll `#home` re-trigger the `.28`
  fixed-bar displacement). **[LB]/[UD]**
- **D2 — Document-scroll consumers live on the home path: FOUR load-bearing** (pull-to-refresh; custom
  scrollbar; navbar-seating; the swipe/reveal scroll machinery), **one context** (carousel `scrollLeft`
  recorder, horizontal — survives), and a large browse/overlay/debug set that is **no-op on home**
  (enumerated §D2 so completeness is provable). **[LB]**
- **D3 — Nested momentum-scroll coherence:** no source code assumes the carousels' scroll PARENT is the
  document — they are already independent horizontal `-webkit-overflow-scrolling:touch` layers
  (css:327), read/written element-locally (swipe.js:201-204; app.js:2911-2913; nav.js:123-126). Whether
  iOS correctly nests a vertical `overflow-y:auto` `#home` around horizontal touch-scroll carousels is
  a runtime fact. **[UD]** (device).
- **§2.1 correction:** `PROBE-swap-necessity`'s "browse→home = constraint D / NONE" is INCOMPLETE. Plan
  §2.1 (authoritative) shows a real constraint the A–D set missed: `#home`/`#browse` are BOTH in-flow
  and SHARE the one document scroll, and two in-flow views cannot coexist on screen — so the incoming
  home must be a fixed out-of-flow pane (the §2.4 SNAPSHOT-iff-home rule). Named here **constraint E**;
  the snapshot DISCHARGES it. **[LB]**

---

## D1 — Does active `#home` require the document scroll?

**[LB] `#home` is an in-flow child of `.app`; `.app` uses the document/window scroll.** DOM:
`.app` (index.html:24) → `#library` (index.html:36) → `#home` (index.html:48). Plan-of-record §2.1
(PLAN-swipe-reveal.md:142-147): *"IN-FLOW `#home`, `#browse` — inside `.app`, SHARE the document
scroll."* The scrollbar module states the same as the reason it exists: *"the main content uses
DOCUMENT scroll (required so the iOS-26 fixed bars seat at the true bottom — an inner scroller /
viewport-sized document displaced them, the reverted build `.28` dead end)"* (scrollbar.js:2-6). **[LB]**

**[LB] Active `#home` has NO own overflow — only `#home.parked` sets `overflow:hidden`.** The base rule
is `#home { will-change: transform; }` (css:118); `#home.parked` adds `position:fixed; …
overflow:hidden` (css:103-107). Active (un-parked) `#home` therefore has `position:static`,
`overflow:visible` → it participates in the document scroll, it does not scroll itself. **[LB]**

**[LB] Home's vertical scroll height is a NAVBAR-SEATING RUNWAY, not content.** Home content is short:
*"HOME is short (2 horizontal carousels) → its document ends up ~viewport-sized"* (css:75-80). The
scrollable height is forced by `.app { min-height: calc(100% + 12vh) }` (css:73) and `body.home-tall
.app { min-height: calc(100% + 12vh) }` (css:81), toggled by `body.home-tall` (nav.js:81). Its PURPOSE
is stated in-code: a short (~viewport) document displaces the fixed navbar ~5–10px on iOS 26, so home
is given *"real scroll height like Browse has"* to seat the bar (css:75-80). So the document scroll on
home exists FOR the fixed-bar mechanism; Home content itself rarely exceeds the viewport. **[LB]**

**[LB] What would have to change for `#home` to own its scroll:**
1. Active `#home` would take `position:fixed` + an own vertical scroller (`overflow-y:auto`) — moving it
   OUT of `.app`'s in-flow document scroll. **[LB]**
2. The navbar-seating runway (`.app` min-height + `body.home-tall`, css:73/81, nav.js:81) is
   document-height-driven; with `#home` no longer contributing document height, the fixed-bar seating
   would no longer come from home's document height — it would need a different basis. **[LB]**
3. Every load-bearing document-scroll consumer on the home path (D2) that reads `window.scrollY` /
   `window.scrollTo` would have to read/write `#home.scrollTop` instead. **[LB]**

**[UD] Whether a `position:fixed` own-scroll `#home` re-triggers the `.28` fixed-bar displacement.**
The `.28` dead-end is recorded in-code precisely as this shape: *"an inner scroller / viewport-sized
document displaced them"* (scrollbar.js:4-5); the navbar-seating comments repeat that a
viewport-sized/short document displaces the iOS-26 fixed bars (css:75-80; nav.js:52-55). Whether the
proposed fixed own-scroll `#home` reproduces that displacement (it makes the document short again — the
runway leaves with home) is a runtime iOS-26 layout fact. Settle: on-device — put a fixed own-scroll
`#home` on the screen and observe the navbar/transport seating. Do not measure here.

**[CX] Home features that depend on document-scroll semantics** (each is a D2 entry): pull-to-refresh
arms only at `window.scrollY === 0` (app.js:1340,1347); the custom scrollbar treats home as the `doc`
surface (scrollbar.js:38,50-52); navbar-seating is document-height-driven (above). No home feature
requires document scroll for CONTENT reasons — only these three mechanisms are coupled to it.

---

## D2 — The complete document-scroll consumer surface active on the home path

Grep-exhaustive over `js/` for `window.scrollY`/`scrollTo`/`scrollTop`/`pageYOffset`/`scrollend`/
`scroll` listeners/`scrollIntoView`/`scrollingElement`/`getBoundingClientRect`-vs-scroll. Each is
classified LIVE-ON-HOME (breaks/reworks if `#home` leaves the document scroll) vs NO-OP-ON-HOME
(browse/overlay/debug only). Completeness is the point — a missed live consumer is a build-time
regression.

### LIVE ON THE HOME PATH — load-bearing (rework required)

| # | consumer | file:line | what it does | effect if `#home` owns its scroll |
|---|---|---|---|---|
| L1 | **pull-to-refresh** | app.js:1340, 1347 | arms only when `window.scrollY === 0` (touchstart 1340; touchmove aborts if `scrollY>0`, 1347); home-only (gated on `currentDesc().v==='home'` + not parked, 1339-1341) | **REWORK** — must read `#home.scrollTop` instead of `window.scrollY`, or Home's own-scroll top is never detected and the pull never arms / mis-arms |
| L2 | **custom scrollbar (doc surface)** | scrollbar.js:38, 50-52, 79, 90 | `isDoc()` maps document/documentElement/body/window → the `doc` surface (scrollbar.js:38); `metrics` reads `window.scrollY`/`scrollingElement.scrollHeight` (50-52); ignores the 0.14×vh runway (79); capture-phase `scroll` listener (90) | **REWORK** — a scroll from an own-scroll `#home` ELEMENT is neither `isDoc` nor in `OVERLAY_SEL` (scrollbar.js:27,38) → `surfaceKind` returns null → indicator stops drawing on Home. `#home` must be added to the supported-surface set |
| L3 | **navbar-seating** | nav.js:81, 127; css:73, 81 | `body.home-tall` gives `.app` document height to seat the fixed navbar (nav.js:81; css:73/81); `applyScreen(home)` does `window.scrollTo(0,1)` on entry (nav.js:127) | **REWORK/CRUX** — the seating basis is document height from home; removing home from the document scroll removes that height. The `.28` displacement risk (D1 [UD]) lives here |
| L4 | **swipe / reveal scroll machinery** | app.js:466, 443, 1231, 1256, 1173; nav.js:127; app.js:910 | gesture samples `scroll0 = window.scrollY` (466); abort restores `window.scrollTo(0,cur.scroll0)` (443,1231,1256); the `→home` reveal marks read `window.scrollY` (1173) and the reveal clamps `window.scrollTo(0,1)` (nav.js:127) then gates on `scrollend` (910) | **REWORK BY THE APPROACH ITSELF** — the `→home` document clamp + scrollend settle exist to survive the reflow the approach removes; a non-reflowing fixed `#home` changes what this path must do |

### CONTEXT — lives on the home path but survives unchanged

| # | consumer | file:line | why it survives |
|---|---|---|---|
| C1 | carousel `scrollLeft` recorder | app.js:2911-2913 | capture-phase `scroll` listener records each `.carousel`'s HORIZONTAL `scrollLeft` into `dataset.sl`. Horizontal, element-local; independent of whether `#home` owns the VERTICAL scroll. Capture phase catches descendant scroll regardless of scroll-parent. **[CX]** |

### NO-OP ON THE HOME PATH — browse / overlay / debug only (enumerated for completeness)

| consumer | file:line | scope — why not home |
|---|---|---|
| browse scroll recorder (`cur.sy = window.scrollY`) | browse.js:198-201 | records the active `.browsepage` scroll — browse-only |
| `applyScrollY` (`window.scrollTo`) | browse.js:219-221 | browse page scroll restore — browse-only |
| `positionAnchor` (`scrollY + getBoundingClientRect`) | browse.js:245 | browse row anchoring — browse-only |
| virtuallist `scrollTo` wrapper | browse.js:640 | injected into the browse virtual controller — browse-only |
| A–Z index `scrollIntoView` | browse.js:827, 844 | `.alphaindex` letter jump — browse-only |
| virtuallist document `scroll` listener | virtuallist.js:150 | `onDocScroll` early-returns unless `activeCtl.isVisible()` (virtuallist.js:145-146: *"browse hidden (Home/Options scrolling) → not our scroll"*) → **no-op when home is the view** |
| virtuallist metrics `scrollY`/`scrollTo` | virtuallist.js:164,168,206,242,298 | inside the browse controller — browse-only |
| debug console autoscroll (`body.scrollTop`) | debug.js:533 | the debug log panel — not home |
| NP / overlay panel scroll | app.js:2945, 2958 | Now-Playing / settings panel touch — overlay-only |
| reveal diagnostic `window.scrollTo` patch | app.js:1196-1209 | wraps the reveal's own `scrollTo` writes (part of L4's window) — swipe-only |

**[LB] Count: 4 load-bearing live consumers (L1–L4), 1 context (C1), 10 no-op-on-home groups.** The
load-bearing four are the rework surface a fixed own-scroll `#home` must cover; a missed one regresses
Home scrolling, the indicator, the pull, or the navbar seating.

---

## D3 — Nested momentum-scroll coherence

**[LB] Current overflow/scroll setup.** Active `#home`: no own overflow (uses document scroll, D1);
`#home.parked`: `overflow:hidden` (css:107). `.carousel`: `overflow-x:auto; overflow-y:hidden;
scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch` (css:327) — each strip is its own
horizontal momentum scroller. So TODAY the vertical scroll parent of the carousels is the document; the
horizontal scroll is the carousel's own layer. **[LB]**

**[LB] No source code assumes the carousels' scroll PARENT is the document.** Every reader/writer of
carousel scroll is element-local:
- `copyScroll` reads/writes `.carousel` `scrollLeft` directly (swipe.js:201-204). **[LB]**
- the `scrollLeft` recorder listens capture-phase on `document` but reads `t.scrollLeft` of the
  `.carousel` target (app.js:2911-2913) — capture catches a descendant scroll whatever its scroll
  parent, so it keeps firing if `#home` becomes the scroll parent. **[LB]**
- nav.js:123-126 comment: the carousels *"keep their scrollLeft on their own"* while `#home` is parked —
  no document dependency. **[CX]**
So a vertical `overflow-y:auto` `#home` containing the horizontal carousels introduces no
source-level contradiction: the carousels are already independent horizontal scrollers whose code path
does not read the document as their scroll parent. **[LB]**

**[UD] Whether iOS correctly nests a vertical `-webkit-overflow-scrolling`/`overflow-y:auto` `#home`
around horizontal `-webkit-overflow-scrolling:touch` carousels** — momentum-scroll coherence and
touch-gesture disambiguation (vertical vs horizontal pan) between an outer vertical momentum scroller
and inner horizontal momentum scrollers. This is a runtime WebKit behavior, not readable from source.
Settle: on-device — build the nested fixed own-scroll `#home` and exercise vertical + horizontal
momentum scrolls; watch for gesture capture conflicts or nested-momentum jank. Do not measure here.

---

## §2.1 RECONCILIATION — correction to `PROBE-swap-necessity-2026-07-28.md`

**[LB] The prior sheet's "browse→home = constraint D / NONE" is INCOMPLETE.** That sheet's A–D
constraint set did not model the plan-of-record, which is authoritative here. Plan §2.1
(PLAN-swipe-reveal.md:142-147): *"IN-FLOW `#home`, `#browse` — inside `.app`, SHARE the document scroll.
Two in-flow views cannot be on screen at once."* Plan §2.4 (PLAN-swipe-reveal.md:169-179) encodes the
consequence as the structural matrix: `browse → home` has `incoming = SNAPSHOT`, `pane = yes`. §2.3
(PLAN-swipe-reveal.md:159-167) states the branch verbatim: `toV === 'home' -> snapshotHome() [PANE]`.

**[LB] The missed constraint — name it E (shared-document-scroll in-flow coexistence ban).** Because
`#home` and `#browse` are BOTH in-flow inside `.app` and share the ONE document scroll, they cannot both
be on screen in-flow at once (plan §2.1, PLAN-swipe-reveal.md:143-144). A slide requires both endpoints
visible simultaneously → the incoming in-flow view must be represented as a fixed OUT-OF-FLOW pane. For
`browse→home` that pane is the `home-snapshot`; the snapshot DISCHARGES constraint E. So the answer to
"what forces the browse→home swap" is **constraint E (plan §2.1), not NONE.** The A–D set (which
reasoned only about element lifetime/fixed-descendant/single-host) missed the shared-scroll in-flow
coexistence axis. **[LB]**

**[CX] Why this matters to the current commission.** The reframed approach (fixed own-scroll `#home`)
is precisely an attempt to DISSOLVE constraint E: if active `#home` is `position:fixed` with its own
scroll, it is no longer an in-flow view sharing the document scroll, so `#home` and `#browse` CAN
coexist on screen (one fixed, one in-flow) and the snapshot is no longer forced by §2.1. That is why E,
not D, is the constraint the approach targets — and why D1–D3 (can `#home` leave the shared document
scroll, and at what rework/runtime cost) are the load-bearing feasibility questions. Plan §2.1 is
authoritative over the prior sheet's A–D framing on this point.

*(This correction is recorded here per the records standard; the prior sheet's own text is not edited
under review. `PROBE-swap-necessity`'s table row 3/6 "constraint = NONE (D)" should be read as
superseded by constraint E as derived above.)*

---

## Underived ceiling (runtime facts, none source-readable)

1. Whether a `position:fixed` own-scroll `#home` re-triggers the `.28` iOS-26 fixed-bar displacement
   (D1) — the document goes short when home leaves the document scroll.
2. Whether iOS nests a vertical momentum `#home` around horizontal momentum carousels coherently (D3).
3. (From the companion sheets, still open) whether the reflow-removal actually eliminates the carousel
   raster-from-empty the camera showed.

All are compositor/layout runtime; jsdom cannot reach them. Settle on-device (fixed own-scroll `#home`
prototype + navbar/transport observation + nested-scroll exercise + a scrolled `browse→home` capture).
Everything in D1's structural facts, the D2 enumeration, D3's source-level coherence, and the §2.1
reconciliation is derived from HEAD `.261` source (and the authoritative plan) and cited.

---

## Handoff → Vitruvius (the planner)

Source artifact: this sheet (`Claude/Linnaeus/PROBE-home-scroll-surface-2026-07-28.md`). Derived: D1 —
active `#home` shares the document scroll by construction (in-flow in `.app`, plan §2.1; no own overflow,
css:103-118) and its only vertical scroll is a navbar-seating runway (`.app` min-height + `home-tall`,
css:73/81, nav.js:81), so own-scroll is content-feasible (Home is short, css:75-80) but coupled to the
fixed-bar mechanism whose behavior under a fixed `#home` is UNDERIVED (the `.28` displacement,
scrollbar.js:3-6). D2 — four load-bearing document-scroll consumers live on the home path
(pull-to-refresh app.js:1340/1347; scrollbar scrollbar.js:38/50-52/90; navbar-seating nav.js:81/127 +
css:73/81; swipe-reveal machinery app.js:466/1231/1256/1173 + nav.js:127 + app.js:910), one context
(carousel `scrollLeft` recorder app.js:2911-2913, horizontal, survives), the rest no-op on home. D3 —
no source assumes the carousels' scroll parent is the document (swipe.js:201-204; app.js:2911-2913;
nav.js:123-126); iOS nested-momentum coherence is UNDERIVED (device). §2.1 — the prior sheet's
"browse→home = NONE (D)" is superseded by constraint E (shared-document-scroll in-flow coexistence ban,
plan §2.1); the snapshot discharges E, and the fixed-`#home` approach exists to dissolve E. Linnaeus
states the facts and hands over; the design is Vitruvius's.

VERDICT: DERIVED
