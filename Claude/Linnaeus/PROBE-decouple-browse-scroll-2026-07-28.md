# PROBE — can `#browse` be decoupled from the window scroll (own-scroll)? the `.alphaindex` blocker + the re-home surface (Linnaeus)

Type: fact sheet (deriver — facts derived from primary source at HEAD `dca795c` = build `.265`, cited
`file:line`, plus the CSS positioned-layout spec for the containing-block rule). READ-ONLY. No
code/plan/test edits. Not a build plan. 2026-07-28.

Subject: the `books→home` flash's root is the SHARED WINDOW SCROLL — `#browse` is in-flow and drives
`window.scrollY`; hiding it on a `→home` commit collapses the document and clamps the scroll (the flash
driver, `PROBE-clamp-preempt` / `PROBE-artrelease-reveal`). 6i already decoupled `#home` (fixed
own-scroll). The user's question: can `#browse` be decoupled the SAME way — its own scroll, window
scroll always 0 — so no screen's scroll couples to the window and the clamp cannot happen for ANY
transition? Derive: (1) is own-scroll `#browse` blocked by the fixed `.alphaindex` A–Z strip, or is
that blocker transform-only; (2) the full window-scroll consumer surface that must re-home; (3) the
move-the-strip escape if blocked; (4) the runtime residual.

Companion to `PROBE-home-scroll-surface` (the `#home` D1–D3 sweep — this is the `#browse` analog),
`PROBE-swap-necessity` (constraint B), `PROBE-home-vs-browse` (the `.195/.196` dead-end).
Marks: **[LB]** load-bearing, **[CX]** context, **[UD]** underived (runtime; what settles it named).

---

## 0. HEADLINE (read first)

- **Q1 — the `.alphaindex` blocker is TRANSFORM(/will-change)-ONLY. Own-scroll via `position:fixed` +
  `overflow-y:auto` (NO transform, NO will-change) does NOT break the strip, per the CSS
  containing-block rule. [LB]** A `position:fixed` descendant's containing block is established only by
  an ancestor with `transform`/`will-change`/`filter`/`perspective`/`contain`/`container-type` —
  **plain `position:fixed` and `overflow` do NOT establish one for a `fixed` descendant.** The
  `.195/.196` dead-end that broke the strip was a PERMANENT TRANSFORM/will-change on `#browse`
  (`PROBE-home-vs-browse` §5), not the parking-via-overflow. So decoupling-via-own-scroll is NOT
  blocked by the strip — **with one caveat**: `#home`'s shipped own-scroll recipe INCLUDES
  `will-change: transform` (css:131), which IS containing-block-establishing; copied verbatim to
  `#browse` it WOULD break the strip. The recipe for `#browse` must omit transform/will-change. Device
  confirmation of iOS-26 behavior is **[UD]**.
- **Q2 — the window-scroll consumer surface to re-home: SIX load-bearing groups** (the books virtual
  list, the browse scroll recorder, `applyScrollY`, `playingTrackY`, the custom scrollbar `doc`
  surface, the swipe `scroll0`/abort-restore/ghost machinery) plus the navbar-seating runway to
  re-verify; two context/survives (pull-to-refresh is home-only; the A–Z `scrollIntoView` scrolls the
  nearest ancestor). **[LB]**
- **Q3 — if it were blocked, moving the strip out IS viable** but non-trivial: the strip is built
  per-page INTO `.browsepage` (browse.js:434-436,643,670); its only `#browse`-internal dependency is
  resolving `m.querySelector('.lettergroup')` (browse.js:827), which a viewport-fixed sibling can do
  if given the active-page reference. **[LB]**
- **Q4 — UNDERIVED (device):** whether iOS-26 WebKit anchors the fixed strip to the viewport under a
  `position:fixed`+`overflow-y:auto` `#browse`; whether the navbar seats when NO in-flow view drives
  the document height; whether decoupling actually removes the flash (it may be the incoming
  slide-transform demote, independent of the window-scroll coupling).

---

## Q1 — the `.alphaindex` blocker: transform-only, or does own-scroll also break it?

**[LB] What `.alphaindex` is and how it anchors.** `.alphaindex { position: fixed; right: 9px;
z-index: 24; top: calc(var(--safe-top) + 66px); bottom: calc(var(--nav-h) + var(--nav-pad) + 16px);
… overflow: hidden; }` (css:635-641). It is anchored to its containing block by `right`/`top`/`bottom`.
It is built PER-PAGE into the `.browsepage` node: `buildIndex(m, letters)` creates
`<div class="alphaindex">` (browse.js:818-820) and the caller appends it to the page `m` — a
`.browsepage` — at browse.js:436 (`page.appendChild(fresh)`), :643, :670. So the strip is a descendant
of `.browsepage` ⊂ `#browse`. **[LB]**

**[LB] The CSS containing-block rule for a `position:fixed` descendant (the crux mechanism).** A
`position:fixed` box is positioned relative to the VIEWPORT (initial containing block) UNLESS an
ancestor establishes a containing block for it. Per CSS positioned layout, only these ancestor
properties establish a containing block for a `fixed` descendant: a non-`none` `transform`,
`perspective`, `filter`, `backdrop-filter`; a `will-change` naming one of those; `contain: layout /
paint / strict / content`; or a `container-type` other than `normal`. **Plain `position: fixed /
static / relative / absolute` does NOT. And `overflow` other-than-`visible` does NOT establish a
containing block for a `fixed` descendant** (it does for an `absolute` descendant — the one asymmetry
that matters here). Because plain overflow does not make the ancestor the fixed element's containing
block, it also does not clip the fixed strip. **[LB]**

**[LB] The `.195/.196` breaker was the TRANSFORM, cited.** The recorded dead-end
(`PROBE-home-vs-browse` §5): *"A permanent `transform`/`will-change` layer on `#browse` makes `#browse`
the containing block for that fixed strip → the A–Z strip scrolls with the page and mis-resolves its
`right/top/bottom`."* The in-code comment agrees: the strip *"still rides with `#browse` when it
transforms during a swipe"* (css:633) — i.e. a transform on `#browse` re-parents the fixed strip to
`#browse`. The breaker is the containing-block-establishing property (transform/will-change), NOT the
scroll/overflow. **[LB]**

**[LB] Therefore: `position:fixed` + `overflow-y:auto` on `#browse` (no transform/will-change) does NOT
break the strip.** Neither `position:fixed` (plain positioning) nor `overflow-y:auto` establishes a
containing block for the `fixed` `.alphaindex`, so the strip stays anchored to the viewport exactly as
it is today, and is not clipped by `#browse`'s scroll box. The blocker is transform(/will-change)-ONLY.
**[LB]**

**[LB] The caveat — `#home`'s shipped recipe would break it; `#browse` must not copy it verbatim.**
`#home`'s own-scroll recipe includes `will-change: transform` (css:131), which IS
containing-block-establishing. `#home` has NO fixed descendant (its carousels are `position:static`,
`PROBE-home-vs-browse` §5), so it is harmless there — but on `#browse` that one declaration would
re-parent the strip and reproduce the `.195/.196` break. So "decouple `#browse` the same way `#home`
was" must mean the `position:fixed`+`overflow-y:auto` PART, explicitly WITHOUT the `will-change:
transform`. **[LB]**

**[UD] Runtime (iOS-26 WebKit) confirmation.** The spec says own-scroll does not re-parent or clip the
fixed strip; this saga has repeatedly found iOS-26 deviating from spec on fixed layers (the `.28`
black-band, the fixed-bar displacement). Whether WebKit actually keeps the strip viewport-anchored and
un-clipped under a `position:fixed`+`overflow-y:auto` `#browse` is device-only. Settle: put the recipe
on device and observe the strip's position/clipping while the list scrolls. Do not measure here. **[UD]**

**Answer: the strip's blocker is transform(/will-change)-only; own-scroll via
`position:fixed`+`overflow-y:auto` is NOT blocked by it, provided the recipe omits transform/will-change
(unlike `#home`'s shipped recipe). Device-confirm the WebKit behavior.**

---

## Q2 — the window-scroll consumer surface to re-home under an own-scroll `#browse`

Swept the seam (`window.scrollY`/`env.scrollY`/`scrollTop`/`pageYOffset`/`scrollTo`/`scrollingElement`
/`scroll` listeners), not just literals. These are the BROWSE-side consumers that today read/write the
DOCUMENT scroll because `#browse` drives it; each must re-home to `#browse.scrollTop` + a `#browse`
scroll listener if `#browse` owns its scroll.

### LOAD-BEARING — breaks under own-scroll `#browse`, must re-home

| # | consumer | file:line | today | re-home |
|---|---|---|---|---|
| B1 | **books virtual list realize/release window** | virtuallist.js:150 (`window.addEventListener('scroll', onDocScroll)`); :164 (`metrics.scrollY = () => window.scrollY`); :168 (`listTop = window.scrollY + rect.top`); :206 (`_realize` top = `metrics.scrollY() - listTop()`) | the realize/release window is keyed off `window.scrollY`; the doc scroll event drives `_realize` | key off `#browse.scrollTop`; listen on `#browse`'s scroll. **The largest rework** — this is the release window `PROBE-artrelease-reveal` §Q2 traced |
| B2 | **browse scroll recorder** | browse.js:198-201 (`window 'scroll'` → `cur.sy = window.scrollY`) | records the active page's scroll from `window.scrollY` | record `#browse.scrollTop`; listen on `#browse` |
| B3 | **`applyScrollY` (entry/restore)** | browse.js:218-221 (`window.scrollTo(0, clampY(y, document.scrollingElement.scrollHeight, innerHeight))`) | restores a page's scroll via the window | set `#browse.scrollTop`; clamp against `#browse.scrollHeight`/`clientHeight` |
| B4 | **`playingTrackY` anchor** | browse.js:245 (`(window.scrollY \|\| 0) + row.getBoundingClientRect().top - clear`) | computes the files-page track offset from `window.scrollY` | use `#browse.scrollTop` |
| B5 | **custom scrollbar `doc` surface** | scrollbar.js:38 (`isDoc`), :50-52 (`window.scrollY`/`scrollingElement`), :90 (capture `scroll` listener) | `#browse` scroll IS the `doc` surface today | `#browse`'s own scroll emits from the `#browse` element → `surfaceKind` returns null unless `#browse` is added to the supported-surface set (same rework `#home` needed, `PROBE-home-scroll-surface` L2) |
| B6 | **swipe `scroll0` / abort-restore / outgoing app-ghost** | app.js:466 (`scroll0 = window.scrollY`); app.js:1203,1228 (`window.scrollTo(0, cur.scroll0)` abort restore); app.js:509 (`env.scrollY = () => window.scrollY`); swipe.js:257 (`ghostY = env.scrollY()`, the app-ghost `translateY(-scrollY)` pin) | the outgoing `#browse` ghost pins at `translateY(-window.scrollY)` and aborts restore the window scroll | pin/restore from `#browse.scrollTop`. (With BOTH views own-scroll, `window.scrollY` is always 0 — the reveal clamp/`.265` preempt become no-ops, which is the decoupling's GOAL) |

### To RE-VERIFY (structural dependency, not a reader/writer)

| # | consumer | file:line | note |
|---|---|---|---|
| B7 | **navbar-seating runway** | css:73 (`.app { min-height: calc(100% + 12vh) }`); nav.js:101-105 | 6i kept the runway after `#home` went fixed. If `#browse` ALSO goes fixed, NO in-flow view drives the document height → `window.scrollY` always 0, document = the runway. The navbar seats off css:73. Whether it still seats with no tall in-flow view is the `.28`-displacement question — **[UD]** (device) |

### CONTEXT — survives unchanged

| consumer | file:line | why it survives |
|---|---|---|
| pull-to-refresh | app.js:1340,1347 | HOME-only (gated `currentDesc().v==='home'`), reads `window.scrollY` on home — not a `#browse` consumer. **[CX]** |
| A–Z `scrollIntoView` | browse.js:827 (`el.scrollIntoView({block:'start'})`); :839 (`idx.getBoundingClientRect`) | `scrollIntoView` scrolls the nearest scroll ancestor (would scroll the own-scroll `#browse` correctly); `jump` uses viewport-relative `getBoundingClientRect`. **[CX]** |

**[LB] Count: 6 load-bearing consumer groups (B1–B6) to re-home + 1 to re-verify (B7); 2 survive.** This
is the `#browse` analog of the `#home` D1–D3 sweep (`PROBE-home-scroll-surface`) — there these same
consumers were classified "browse-only, no-op on home"; here they are the load-bearing re-home set. A
missed one regresses browse scrolling, row realization, the scrollbar, or the swipe restore. **[LB]**

---

## Q3 — if the strip WERE blocked: is moving it out viable?

**[LB] The strip is built per-page inside `#browse`, with one `#browse`-internal dependency.**
`buildIndex(m, letters)` (browse.js:818) is called with the page node `m` and appended to it
(browse.js:436,643,670); it is rebuilt on each render (browse.js:432-436). Its inputs: `letters` (the
page's section letters) and, for the jump, `m.querySelector('.lettergroup[data-sec=…]')` (browse.js:827)
— the only reference into the page's DOM. `jump` reads `idx.getBoundingClientRect()` (browse.js:839),
viewport-relative, with no `#browse` dependency. **[LB]**

**[LB] Moving it to a viewport-fixed sibling OUTSIDE `#browse` is viable but requires re-wiring.** A
sibling strip (a direct child of `body` or `.app`, outside `#browse`) would stay viewport-anchored
regardless of any transform on `#browse`. To function it must, per page switch, (a) rebuild for the
active page's `letters` and (b) resolve `.lettergroup` targets against the ACTIVE page — currently the
closure `m`. Both are reachable (the active page is `activeEntry().el`, browse.js:194,200), so a single
sibling strip re-pointed on each `showPage` is derivable. **[LB]** *(This escape is only NEEDED if the
own-scroll recipe carries a transform/will-change; Q1 shows plain own-scroll does not require it. Which
route to take is design — Vitruvius's.)*

---

## Q4 — the underived residual (runtime/device)

1. **[UD] Does iOS-26 WebKit keep the fixed `.alphaindex` viewport-anchored and un-clipped under a
   `position:fixed`+`overflow-y:auto` `#browse`?** Spec says yes (Q1); the saga's fixed-layer
   deviations mean device must confirm. Settle: the recipe on device, observe strip position + clipping
   while scrolling.
2. **[UD] Does the fixed navbar seat when NO in-flow view drives the document height** (both views
   fixed, `window.scrollY` always 0, document = runway)? The `.28`/black-band displacement risk (B7).
   Settle: device.
3. **[UD] Does decoupling `#browse` actually remove the flash?** The flash may be the incoming
   real-`#home` slide-transform demote, independent of the window-scroll coupling
   (`PROBE-clamp-preempt` §Q5, `PROBE-artrelease-reveal` §5). Removing the window-scroll clamp removes
   ONE candidate driver, not provably all. Settle: device layer-border / frame capture after the
   decouple.

jsdom cannot composite or run WebKit layout; all three are device-only. Everything in Q1's
containing-block mechanism, the Q2 consumer sweep, and Q3's strip-mount facts is derived from HEAD
`dca795c` source (and the CSS spec for the containing-block rule) and cited.

---

## Handoff → Vitruvius (the planner)

Source artifact: this sheet (`Claude/Linnaeus/PROBE-decouple-browse-scroll-2026-07-28.md`). Derived:
(1) the `.alphaindex` blocker is TRANSFORM(/will-change)-only — a `position:fixed` descendant's
containing block is established only by transform/will-change/filter/perspective/contain, NOT by plain
`position:fixed` or `overflow` (css:635-641; the `.195/.196` break was the transform,
`PROBE-home-vs-browse` §5, css:633); so own-scroll `#browse` via `position:fixed`+`overflow-y:auto`
does not break the strip, PROVIDED it omits the `will-change: transform` that `#home`'s recipe carries
(css:131) — device-confirm WebKit. (2) Six load-bearing window-scroll consumers must re-home to
`#browse.scrollTop` (books virtual list virtuallist.js:150/164/168/206; scroll recorder browse.js:198-201;
`applyScrollY` browse.js:218-221; `playingTrackY` browse.js:245; scrollbar `doc` surface
scrollbar.js:38/50-52; swipe `scroll0`/ghost app.js:466/509/1203/1228, swipe.js:257) + the navbar
runway to re-verify (css:73). (3) If blocked, moving the strip to a viewport-fixed sibling is viable —
it is built per-page into `.browsepage` (browse.js:436,643,670) with only `m.querySelector('.lettergroup')`
(browse.js:827) as an internal dependency. (4) UNDERIVED (device): WebKit strip anchoring under
own-scroll `#browse`, navbar seating with no in-flow view, and whether decoupling removes the flash at
all. Linnaeus states the facts and hands over; the design is Vitruvius's.

VERDICT: DERIVED
