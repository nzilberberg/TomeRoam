# PROBE — Home carousel layers vs. the commit→home reveal (flash A grounding, Linnaeus)

Type: fact sheet (deriver — facts derived from primary source: the real code at HEAD `.261`,
cited `file:line`). READ-ONLY. No code/plan/test edits. Not a build plan. 2026-07-28.

Subject: our OWN Home-screen DOM/CSS and the commit books→home reveal path, enumerated for the
device observation "the **entire carousels** flash — NOT the whole Home view, NOT individual covers;
the static section headers do **not** flash." Scoped to what makes the carousel STRIPS a distinct
compositing entity from the static headers, and what the reveal does to the strips.

Reference version: HEAD `28a64ff` — "Build 2026-07-28.261 — revert the .260 326ms hold diagnostic
(cover-hold REFUTED)". Line numbers below are current at this HEAD; prior probes
(`PROBE-scroll-clamp-reveal.md`, `PROBE-home-vs-browse.md`) predate `.261` and some of their
citations have drifted — re-derived here.

Marks: **[LB]** load-bearing (the fix's correctness depends on it), **[CX]** context, **[UD]**
underived (not reachable from source; what would settle it is named).

---

## 0. HEADLINE (read first)

The Home view has exactly two kinds of child block: **static flow text** (the section headers and
status lines) painted on `#home`'s own layer, and **horizontal scroll boxes** (the carousels), each
of which requests its OWN iOS scrolling/compositing layer via `overflow-x: auto` +
`-webkit-overflow-scrolling: touch` (css:327). That is the one source-derivable structural asymmetry
that matches the device observation: the elements that flash are exactly the elements that carry
their own scroll layer; the elements that do not flash are exactly the ones that do not.

The commit→home reveal collapses the document (~14676→~900) and clamps the VERTICAL document scroll
(~11481→1) under a cover, then drops the cover. That clamp does not touch the carousels' HORIZONTAL
`scrollLeft` (derived — nav.js:123-126 explicitly does not restore it, and the cover snapshot copies
it faithfully, swipe.js:201-204). What the clamp does do is move each carousel's composited scroll
box to a new viewport position as the tall document collapses to the top. Whether iOS re-rasters
those specific strip layers during that move — and that this is the visible flash — is the one
load-bearing fact that source cannot settle **[UD]**; it is a runtime compositor fact.

---

## 1. Home DOM structure

**[LB] The Home view's direct children are, in document order** (index.html:48-58):

| # | element | line |
|---|---|---|
| — | `<div id="home" class="view">` (the view root) | index.html:48 |
| 1 | `<div class="section-title">Continue Listening</div>` | index.html:49 |
| 2 | `<div id="clStatus" class="statusline" …>` | index.html:50 |
| 3 | `<div id="clRow" class="carousel"></div>` | index.html:51 |
| 4 | `<div class="section-title">Recently Added</div>` | index.html:52 |
| 5 | `<div id="raStatus" class="statusline" …>` | index.html:53 |
| 6 | `<div id="raRow" class="carousel"></div>` | index.html:54 |
| 7 | `<div id="dlSection" class="hidden">` → `.section-title` "Downloaded" (index.html:56) + `<div id="dlRow" class="carousel">` (index.html:57) | index.html:55-58 |

**[LB] The section header and its carousel are SIBLINGS, not parent/child.** Each header
(`.section-title`) is a separate flow block immediately preceding its carousel (`.carousel`); both are
direct children of `#home` (the `dlSection` pair is one level deeper, inside `#dlSection`, but header
and carousel are still siblings within it). index.html:49-51, 52-54, 56-57.

**[CX] The scroll strip is `.carousel` (`#clRow`/`#raRow`/`#dlRow`); it holds `.tile` flex children.**
Carousel contents are (re)built by `HomeScreen.renderCarousel` — it appends `renderTile(b)` nodes into
the row, or patches them in place (home-screen.js:40-48). The header text is static markup in
index.html and is **never touched by HomeScreen** — no render path in home-screen.js writes to a
`.section-title` (home-screen.js:27-126, grep-complete). So on any repaint, only the carousels'
children change; the headers are inert. **[CX]**

---

## 2. Carousel compositing

**[LB] The carousel is a horizontal scroll container with the iOS momentum-scroll flag** (css:327):

```
.carousel { display: flex; align-items: stretch; gap: 0;
  overflow-x: auto; overflow-y: hidden;
  scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch;
  padding: 0; margin: 0 0 6px; scrollbar-width: none; }
```

- `overflow-x: auto` makes each carousel a scroll container. **[LB]**
- `-webkit-overflow-scrolling: touch` is the WebKit flag that historically backs an overflow scroller
  with its own UIScrollView-composited (momentum) layer. **[LB]**
- `scroll-snap-type: x proximity` (strip) + `scroll-snap-align: start` on each `.tile` (css:335) —
  each strip has independent snap-scroll behavior. **[CX]**
- `scrollbar-width: none` + `::-webkit-scrollbar { display:none }` (css:328) — cosmetic. **[CX]**

**[LB] Each carousel carries its own live horizontal scroll offset, independent of the document and of
the other carousels.** Two independent code sites treat `.carousel` `scrollLeft` as per-strip state:
- nav.js:123-126 (comment on the reveal path): *"no carousel-scroll restore here — home is PARKED
  (painted), not display:none, so its carousels keep their scrollLeft on their own; re-setting it
  would fire a scroll-snap correction."* **[LB]**
- swipe.js:201-204 `copyScroll`: iterates every `.carousel` and copies `dataset.sl || scrollLeft`
  from live `#home` into the snapshot clone. **[LB]**

**[UD] Whether iOS actually assigns EACH carousel its own compositing/scrolling layer distinct from
`#home`'s layer.** The CSS requests it (`overflow-x:auto` scrollable + `-webkit-overflow-scrolling:
touch`), but layer assignment is a runtime WebKit decision. Settle with: Safari Web Inspector "Show
Compositing Borders" on the device, or a device layer capture — the source can show the properties
that request the layer, not the compositor's actual layer tree.

---

## 3. Header compositing (why the headers are the control)

**[LB] The section headers are plain static flow text with no scroll box and no layer-promoting
property** (css:188):

```
.section-title { font-size: 1.15rem; font-weight: 700; letter-spacing: .01em;
  color: var(--text); margin: 22px 4px 5px; }
```

No `overflow`, no `position`, no `transform`, no `will-change`, no `contain`, no
`-webkit-overflow-scrolling`. Font and margin only. It paints as ordinary content on `#home`'s layer.
**[LB]**

**[CX] The status lines are likewise plain** (css:173): `.statusline { color; font-size; margin;
min-height; line-height; }` — no scroll/layer property. `#clStatus`/`#raStatus` are the two status
lines between headers and strips (index.html:50,53).

**Grounds the asymmetry:** the headers/status lines request no own-layer; the carousels do (§2). The
device observation (headers static, strips flash) aligns exactly with this source-derivable split —
the strips are the only Home children that request a compositing layer of their own. That the split
CAUSES the flash is the compositor claim, **[UD]** (§2, §5).

---

## 4. Containing-block / park relationship

**[LB] The carousels are descendants of `#home`** (index.html:48-58; §1).

**[LB] `#home` is an unconditional compositing layer and containing block** via the base rule
(css:118): `#home { will-change: transform; }`. `will-change: transform` establishes, per CSS spec, a
stacking context and a containing block on `#home`, and (device-measured, `PROBE-home-vs-browse.md`
§4) a stable compositing layer. This rule is UNCONDITIONAL — applies parked or not. **[LB]**

**[CX] `#home.parked` adds a transform while parked** (css:103-108): `position:fixed; transform:
translateX(-101vw); … will-change: transform;`. The parked `translateX` also promotes a layer; the
line-107 `will-change` is redundant with the base line-118 rule (`PROBE-home-vs-browse.md` §1).

**[LB] At un-park on the commit reveal, the `#home`↔carousel containing-block/layer relationship does
NOT change.** `nav.js:57` removes `.parked` from `#home` (via `setView('home')`); the base
`will-change` (css:118) survives the class removal, so `#home` keeps its layer/containing-block/
stacking-context across the un-park. The carousels remain descendants inside `#home`'s layer
throughout — the un-park is not a demote of `#home` (this is why layer-promotion patches never fixed
flash A; `PROBE-scroll-clamp-reveal.md` §0). **[LB]** The carousels' own scroll layers (§2) sit inside
`#home`'s layer before and after.

**[CX] `#home` has no `position:fixed` descendant.** The carousels are `position:static` scroll boxes,
not fixed. (Contrast `#browse`, which carries a `position:fixed .alphaindex` strip —
`PROBE-home-vs-browse.md` §5; not present on Home.) So `#home`'s containing-block role has no fixed
descendant depending on it; the carousels' positioning is unaffected by `#home`'s containing-block
status.

---

## 5. The clamp's effect on the carousels

**The commit→home reveal path, current at HEAD `.261`** (app.js:1210-1219):

| # | step | file:line | effect |
|---|---|---|---|
| 1 | `mark('finalize')` | app.js:1210 | samples `scrollY / scrollHeight` (device: ~11481 / ~14676 from a scrolled browse) |
| 2 | enter `commit && dest.v==='home'` branch | app.js:1211 | |
| 3 | `applyScreen(dest,{render:false,keepGhosts:true})` | app.js:1212 → nav.js:116 | synchronous view swap under the cover: |
| 3a | `resetSwipeStyles(keepGhosts)` | nav.js:120,102-108 | clears outgoing inline transforms; cover pane kept |
| 3b | `setView('home')` → `#home` un-park | nav.js:57 | `.parked` removed; base `will-change` survives → NO `#home` demote (§4) |
| 3c | `setView` → `#browse` `display:none` | nav.js:64 | document-height source switches `#browse`(~14676) → `#home` `.app` (`min-height: 100%+12vh`, css:73/81 ≈ short) → **DOCUMENT COLLAPSES** |
| 3d | `body.home-tall` on | nav.js:81 | gives collapsed home real scroll height to seat the fixed navbar |
| 3e | `window.scrollTo(0, 1)` | nav.js:127 | the ONE vertical scroll write on this path; **VERTICAL document-scroll clamp** ~11481→1 |
| 4 | `reportReveal('commit→home', #home, cover)` | app.js:1213 | reads DOM → realizes collapse+clamp on the main thread |
| 5 | `revealPending = true` | app.js:1214 | |
| 6 | `holdGhostUntilPaintable(#home, cover, {scrollSettle: cur.scroll0 > SETTLE_SCROLL_MIN})` | app.js:1218 | holds cover on decode + double-rAF paint + (large-scroll only) scroll-settle; cover drops later |

**[LB] The clamp is a VERTICAL document-scroll change; it does not alter the carousels' HORIZONTAL
`scrollLeft`.** `scrollTo(0,1)` (nav.js:127) writes the document scroll only. nav.js:123-126 states
explicitly that no carousel-scroll restore runs on this path — the strips keep their own `scrollLeft`.
So the horizontal position of each strip is unchanged by the reveal. **[LB]**

**[LB] The reveal moves each carousel's box to a new VIEWPORT position.** Between finalize and drop,
the document collapses (~14676→~900, step 3c) and the vertical scroll snaps (~11481→1, step 3e). The
carousels are laid out in `#home`'s vertical flow, so as the tall document collapses to the top, each
carousel's box moves to a new viewport y. Each carousel is a composited scroll box (§2) that the
compositor must re-position (and, on iOS, potentially re-tile/re-raster) for that move. The static
headers, having no own layer (§3), are just repainted content on `#home`'s layer. This is the
source-derivable difference between what happens to a strip and what happens to a header across the
clamp. **[LB]**

**[UD] Whether the strip layers specifically re-raster/re-snap as a consequence of the collapse+clamp,
and that this is the visible flash.** The re-position is derived (the geometry changes); the
re-RASTER of the strip's own layer is a compositor event. jsdom/rAF cannot composite. Settle with:
device layer-border capture or a device frame capture during the transition (same ceiling as
`PROBE-scroll-clamp-reveal.md` §5).

**[CX] The document vertical-scroll settle is ALREADY awaited before the cover drops, on the
large-scroll case.** HEAD `.261` gates `holdGhostUntilPaintable` on a `scrollend` signal plus a
`SETTLE_MS` (100ms) backstop, armed only when `cur.scroll0 > SETTLE_SCROLL_MIN` (0.5 × viewport
height): app.js:823-824, 908-915, engaged at 1218. So the cover is held until the document scroll
settles. The `.261` revert removed only the extra `.260` 326ms hold-past-scrollend diagnostic
(HEAD subject line). That the strips still flash while the document-scroll settle is already awaited is
a **[CX]** fact bounding the residual: the residual is not the document's own vertical-scroll-settle
timing.

**[CX] Two facts ruled out as the strip flash by source:**
- The outgoing `#browse` `display:none` (3c) and its container are under the cover then hidden — not
  the revealed Home strips.
- A `scrollLeft` mismatch between the covered snapshot strips and the real strips: ruled out —
  `copyScroll` (swipe.js:201-204) copies each carousel's `scrollLeft` into the snapshot, so covered and
  real strips share the same horizontal offset (§6).

---

## 6. Cover images

**[CX] Carousel covers are lazy `<img>` elements realized by an IntersectionObserver, not eager
`src`.** `renderTile` emits `<img class="cover" data-art="<url>" decoding="async" alt="">`
(app.js:1525) — `data-art`, not `src`. `artloader.js` adopts every `data-art` image, loads nothing
until it scrolls within `rootMargin: 400px`, and caps concurrency at `MAX_INFLIGHT = 3`
(artloader.js:9-18, 32-45). Covers are square, `aspect-ratio: 1/1` (css:340). **[CX]**

**[LB] The reveal cover is a full clone of `#home` with each carousel's scroll copied, so the covered
strips match the real strips' horizontal offset.** The commit→home incoming pane is `snapshotHome`
(swipe.js:270-282): `cloneNode(true)` of `#home` (swipe.js:271), id stripped and `.parked`/`.hidden`
removed (272), `freezeArt` (273), mounted in a fixed full-viewport `ghostWrap` (`position:fixed;
inset:0; z-index:28; …` swipe.js:243), and `copyScroll` copies every carousel's `scrollLeft` into the
clone (swipe.js:279 → 201-204). So under the cover the user sees the strips at their true horizontal
offset. **[LB]**

**[CX] The hold's decode gate only waits on images that already have a `src`.**
`holdGhostUntilPaintable` collects `rootEl.querySelectorAll('img')` filtered to those with a `src`
attribute (app.js:827), and awaits `img.decode()` on those (app.js:888). Real carousel covers that are
still `data-art` (not yet realized by artloader) have no `src`, so they are NOT part of the decode
gate. **[CX]**

**[UD] Whether the real carousel covers re-decode/re-fetch on the reveal (an artloader `fade` event).**
artloader tracks this as a runtime counter (`stats.fade`, artloader.js:30) — a measurement, not a
source fact. Settle with: the artloader pipeline diff / `FLASH` log across the transition on device.
(Not required for the strip-flash question if the flash is the layer re-raster of §5, which is
independent of cover decode.)

---

## 7. Underived ceiling (the compositor facts source cannot reach)

Every structural fact above is derived from HEAD `.261` source, cited. The load-bearing facts that
remain **[UD]** — all runtime compositor behavior, none readable from source:

1. That iOS assigns EACH `overflow-x:auto` + `-webkit-overflow-scrolling:touch` carousel its own
   compositing/scrolling layer distinct from `#home`'s (§2).
2. That those strip layers re-raster/re-snap as the document collapses + the vertical scroll clamps
   under the cover, and that this re-raster is the visible flash (§5).
3. Whether the real strip covers re-decode on the reveal (§6) — a separate possible mechanism,
   measurable only by the artloader instrument.

What would settle all three: Safari Web Inspector compositing-layer borders on the device during a
scrolled commit→home, and/or a high-frame-rate device capture of the transition. jsdom cannot
composite, so it cannot observe or refute any of them; the source establishes only the properties that
request the layers and the exact reveal-path geometry, both of which are derived above.

---

## Handoff → Vitruvius (the planner)

Source artifact: this sheet (`Claude/Linnaeus/PROBE-home-carousel-layers-2026-07-28.md`), grounding
the device observation "the entire carousels flash; the static headers do not" against HEAD `.261`
Home DOM/CSS and the commit→home reveal. Derived facts: the carousels are the only Home children that
request their own scroll/compositing layer (`overflow-x:auto` + `-webkit-overflow-scrolling:touch`,
css:327) while the headers are plain flow text (css:188); the reveal clamps the VERTICAL document
scroll (not the strips' horizontal `scrollLeft`) and re-positions each strip's box as the document
collapses; the document-scroll settle is already gated (scrollend + 100ms backstop, app.js:908-915);
and the covered snapshot strips are horizontally synced to the real ones (copyScroll, swipe.js:201-204),
ruling out a horizontal-offset mismatch. The load-bearing residual — that iOS re-rasters the per-strip
layers during the collapse/clamp and that this is the flash — is UNDERIVED (compositor runtime),
settleable only by on-device layer-border / frame capture. Linnaeus states the facts and hands over;
the approach is Vitruvius's.

VERDICT: DERIVED
