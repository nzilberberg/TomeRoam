# PROBE — whose covers `released=35`? the .264 books→home reveal, read against the device log (Linnaeus)

Type: fact sheet (deriver — facts derived from primary source at HEAD `fec9612` = build `.264`, cited
`file:line`, read against the device oracle). READ-ONLY. No code/plan/test edits. Not a build plan.
2026-07-28.

Subject: Stage 6i (fixed own-scroll `#home`, no-snapshot construction) shipped as `.264` and the
commit `books→home` flash PERSISTS on device. The device log carries two hard signals —
`released=35 / src 17→0 / realized 35→22` and `scroll=[finalize=11247/14676 final=43/895]`. Derive
whose covers released (HOME carousels = the flash, or departing BOOKS = benign), what triggers the
release, whether the reflow persists and why, and whether the carousels are insulated from the
document scroll in the shipped code.

Device oracle (books scrolled to "P", commit back to home, `.264`):
```
SWIPE #1 commit back books→home ... ghosts=0
FLASH #1 commit→home @reveal rows=0 imgs=46 withSrc=6 | COVERED +img=0 | EXPOSED +img=0
| ROWS KEPT 0/70 fresh=44 | sameNode=true sameCtl=true  src 17→0  realized 35→22
| state active→active | art loaded=0 instant=0 FADED=0 released=35
| scroll=[finalize=11247/14676  final=43/895] | win=503ms end=timeout
```

Companion to `PROBE-home-carousel-layers`, `PROBE-swap-necessity`, `PROBE-home-scroll-surface`
(all 2026-07-28). Marks: **[LB]** load-bearing, **[CX]** context, **[UD]** underived (runtime; what
settles it named).

---

## 0. HEADLINE (read first)

- **Q1 — whose covers `released=35`: the DEPARTING BOOKS list, NOT the home carousels. [LB]**
  `ArtLoader.release` has ONE call site — `browse.js:releaseRow` (browse.js:44-46), wired as the
  virtual-list `release` callback (browse.js:638; virtuallist.js:155,198,211). Home carousels are NOT
  virtualized (built by `renderTile` appended directly, home-screen.js:40-48; no `_vctl`, no release
  path). Every reveal-log delta that looks alarming — `released=35`, `src 17→0`, `realized 35→22`,
  `ROWS KEPT 0/70`, `state active→active` — is measured over `#browse .browsepage:not(.hidden)` (the
  books page: `snapBrowse` app.js:269, `survivors` app.js:288). The home carousel blank the camera
  showed is NOT in these numbers at all (the watcher's COVERED/EXPOSED buckets classify only
  `.browsepage`, app.js:963-965 → `#home` img changes are dropped, `t=null`). **The
  `released`/`src`-clear signals are the benign off-screen books teardown; they are a red herring for
  the home flash.**

- **Q2 — release trigger: the books virtual window shrinking to the clamped scroll. [LB]/[UD]**
  `_realize` releases every row outside the wanted window (virtuallist.js:210-211), keyed off
  `metrics.scrollY()` = `window.scrollY` (virtuallist.js:164,206). When the document collapse clamps
  the window scroll 11247→43, the ~35 realized "P"-area rows fall outside the new top-of-list window →
  released + removed; ~44 top rows materialize (`fresh=44`, `realized 35→22`, `src 17→0` = the
  removed rows had src, the fresh ones are unloaded `data-art`). The exact firing order vs the
  `display:none`/`isVisible()` guard (virtuallist.js:146) is runtime-sequenced — **[UD]** which of
  `_realize`-under-clamp vs `deactivate→dematerialize` (virtuallist.js:256,198) fired, but BOTH target
  the same BOOKS rows, so Q1's answer is unaffected.

- **Q3 — reflow driven by the outgoing `#browse`: YES. [LB]** `#browse` is a plain in-flow `.view`
  (index.html:62), NOT fixed. On `→home` it is `display:none`'d (nav.js:64), collapsing the document
  14676→895 and auto-clamping window scroll 11247→43. Fixed-`#home` removed `#home` from the flow but
  never touched the outgoing `#browse` collapse — so the reflow/clamp the log still shows is entirely
  the departing `#browse`. The old `home-tall` + explicit `scrollTo(0,1)` were RETIRED (nav.js:78,
  124-127), yet the collapse still auto-clamps.

- **Q4 — carousels insulated from the document scroll: YES (vertically), in shipped `.264`. [LB]**
  Active `#home` is `position:fixed; overflow-y:auto` (css:123-129); the carousels
  (`overflow-x:auto; -webkit-overflow-scrolling:touch`, css:342) sit inside it, scrolling vertically
  within the fixed `#home` box and horizontally in their own layer. A `position:fixed` box is
  viewport-anchored, so the window-scroll clamp does NOT move `#home` or its carousels, and the home
  carousels have no scroll-keyed realize/release (not virtualized). **The clamp cannot be what blanks
  the home covers.** The home covers did not churn either — `art loaded=0 instant=0 FADED=0`
  (app.js:1055-1058) means zero home covers loaded/faded during the reveal.

**What this leaves:** the home carousel blank is not an artloader release (Q1), not a scroll-realize
(Q4), not a cover re-fetch/re-fade (`loaded=0/FADED=0`). It is a compositor re-raster of already-present
carousel layers — invisible to the DOM instrumentation, consistent with the camera — and it survived
6i because (a) the outgoing `#browse` still collapses the document (Q3), and (b) whatever re-rasters the
fixed `#home` carousel layers is a compositor response 6i did not address. **[UD]** (§5).

---

## Q1 — whose covers are `released=35` / `src 17→0`?

**[LB] `ArtLoader.release` targets virtual-list ROWS only.** Its one call site is `releaseRow`
(browse.js:44-46): `el.querySelectorAll('img[data-art]').forEach((img) => ArtLoader.release(img))`,
where `el` is a browse row element. `releaseRow` is passed as the virtual controller's `release`
callback (browse.js:638 `release: releaseRow`), invoked from `virtuallist.js` on row eviction
(`_realize`, virtuallist.js:211) and teardown (`dematerialize`, virtuallist.js:198; called by
`deactivate` 256). `release()` itself (artloader.js:54-61) sets `data-art-released`, unobserves the IO
target, and dequeues — it does NOT clear `src` (the `src` drop is the row `el.remove()` that follows,
virtuallist.js:198,211). **[LB]**

**[LB] Home carousels have NO release path.** `HomeScreen.renderCarousel` appends `renderTile(b)`
nodes straight into `#clRow`/`#raRow` (home-screen.js:40-48); there is no virtual controller
(`_vctl`) on a home carousel and no code passes a `.tile` to `releaseRow`. So no home carousel cover
is ever `ArtLoader.release`d. **[LB]**

**[LB] Every alarming delta in the log measures `#browse`, not `#home`.** `snapBrowse` selects
`[...document.querySelectorAll('#browse .browsepage')].find((x) => !x.classList.contains('hidden'))`
(app.js:269) and reports `src` = imgs with a `src` attr (app.js:280), `realized` =
`_vctl.realizedCount()` (app.js:282), `state` = `_vctl.state()` (app.js:281). `survivors` counts
`#browse .browsepage:not(.hidden) .book,.author` stamps (app.js:288). So `src 17→0`, `realized 35→22`,
`ROWS KEPT 0/70`, `sameNode=true`, `state active→active` are all the DEPARTING BOOKS page. `released=35`
is `ArtLoader.stats().released` delta (app.js:1055-1058) = the 35 books rows released. **[LB]**

**[CX] The home carousels ARE the `imgs=46 withSrc=6` header — and are NOT time-classified.** The FLASH
header `rows=0 imgs=46 withSrc=6` is measured over `rootEl` = `#home` (app.js:946-948): 0 list-rows, 46
carousel covers, only 6 with `src` (the rest are lazy `data-art`, not yet realized). But the
COVERED/EXPOSED split only buckets nodes under a `.browsepage` (`bucket` app.js:963-965) → `#home`
cover mutations get `t=null` and are counted in neither bucket. **The instrumentation is structurally
blind to a home-cover change; a home blank would read exactly as this log does (all-zero EXPOSED, all
the churn on `#browse`).** **[LB]**

**Answer: released covers = BOOKS (departing `#browse` virtual list), off-screen, benign. Home
carousels are never released and their covers did not load/fade (`loaded=0/FADED=0`).**

---

## Q2 — what triggers the release on this reveal?

**[LB] The trigger is the virtual window shrinking to the clamped scroll.** `_realize` computes the
wanted window from `top = metrics.scrollY() - metrics.listTop()` (virtuallist.js:206; `scrollY` =
`window.scrollY`, virtuallist.js:164) and releases every current row whose key is not in the new window
(virtuallist.js:210-211). The document collapse clamps `window.scrollY` 11247→43 (log; Q3); at scroll
43 the window wants the TOP of the list, so the ~35 realized rows built for the "P" region (scroll
~11247) are all outside it → released + removed, and ~44 top rows materialize. That matches the log
exactly: `realized 35→22`, `ROWS KEPT 0/70`, `fresh=44`, `src 17→0` (the removed rows carried `src`;
the fresh `data-art` rows do not yet). **[LB]**

**[UD] Which of two release paths fired is runtime-sequenced.** `_realize` under the clamp is gated by
`onDocScroll`'s `if (!activeCtl.isVisible()) return` (virtuallist.js:145-146) and `scrollSuspended`
(virtuallist.js:142-143); `deactivate()`→`dematerialize()` (virtuallist.js:245-257) releases ALL rows
on hide via `browseWillHide` (nav.js:63) BEFORE `display:none` (nav.js:64). `state active→active` in
the log says the controller was still `active` at measurement, which favors `_realize`-under-clamp over
a full `deactivate`; but the exact ordering of `display:none` vs the clamp's scroll event vs the
`isVisible` guard is a runtime event-sequencing fact not settleable from source. **Both paths release
the same BOOKS rows**, so this ambiguity does not change Q1. Settle (if needed): an in-log ordering
stamp or a device trace of the hide/clamp sequence. **[UD]**

**[LB] The release is scroll/collapse-driven, NOT a home-cover eviction.** It is keyed off the document
`window.scrollY` clamp, which is caused by the `#browse` collapse (Q3). The home carousels are outside
that scroll (Q4), so nothing in this trigger reaches them.

---

## Q3 — does the reflow persist, and why?

**[LB] YES — driven by the outgoing `#browse`.** `#browse` is shipped as a plain in-flow view:
`<div id="browse" class="view hidden">` (index.html:62); it has no `position:fixed` rule (the fixed
rules are `#home` css:123, overlays css:154+, bars). While Books is active `#browse` is in-flow and
tall (`finalize=…/14676`). On commit `→home`, `setView('home')` runs
`browseEl.classList.toggle('hidden', v !== 'browse')` (nav.js:64) → `#browse` `display:none`. With
`#home` now `position:fixed` (out of flow, css:123-129) and `#browse` hidden, the document (`.app`)
collapses to the residual runway — `final=…/895`, and the browser auto-clamps `window.scrollY`
11247→43. **[LB]**

**[LB] Fixed-`#home` never addressed the outgoing collapse.** Stage 6i made `#home` fixed so a `→home`
reveal "never reflows the document" from the HOME side (css:112-114), and retired the home-scoped
`home-tall` seating hack and the explicit `scrollTo(0,1)` (nav.js:78,124-127). But the reflow in the
log comes from the DEPARTING `#browse` going `display:none` — an axis fixed-`#home` does not touch. So
`finalize=14676 → final=895` and the 11247→43 clamp persist exactly as before. **[LB]**

**[CX] The persisting clamp is what drives Q2's benign books release** — but it does NOT reach the home
carousels (Q4), so the reflow's only DOM-visible consequence is the off-screen books teardown.

---

## Q4 — is `#home` fixed/own-scroll in shipped `.264`, and are the carousels insulated?

**[LB] Active `#home` is `position:fixed` with its own scroll.** css:123-129:
```
#home {
  position: fixed; left: 0; right: 0;
  top: calc(var(--safe-top) + 51px);
  bottom: calc(var(--nav-h) + var(--nav-pad));
  z-index: 20;
  max-width: 640px; margin: 0 auto; padding: 14px 16px 40px;
  overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
  ...
}
```
The in-code note confirms the intent: *"Stage 6i … makes the ACTIVE `#home` a position:fixed
own-scroll view too — it never leaves position:fixed, so a →home reveal never reflows the document"*
(css:112-114). The construction matches: `browse→home` incoming is now `real-destination` /
`renderDestination: 'home-host'` (swipe.js:156), with `home-snapshot` RETIRED (swipe.js:127,192,328) —
consistent with the device `ghosts=0`. **[LB]**

**[LB] The carousels are insulated from the document/window scroll (vertically).** `.carousel`
(css:342) has `overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch` and sits inside
`#home`. `#home`'s vertical scroll is now its OWN `overflow-y:auto` (css:129), so the carousels'
vertical scroll parent is the fixed `#home` box, not the document; horizontally each carousel is its
own layer (as always). A `position:fixed` box is viewport-anchored, so the `window.scrollY` clamp
(11247→43) does not move `#home` or its carousels. And the home carousels are not virtualized — no
scroll-keyed `_realize`/release (home-screen.js:40-48). **So the document clamp cannot move, evict, or
re-key the home covers.** **[LB]**

**[CX] Home covers are lazy via a viewport-relative IntersectionObserver**, unaffected by the clamp on
a fixed `#home`: `data-art` images load when they intersect (`rootMargin:400px`, artloader.js:32-38).
`withSrc=6` at reveal = 6 realized; `loaded=0/FADED=0` across the reveal = none loaded/faded during it.
So the home covers are static already-present bitmaps during the reveal, neither released nor
re-fetched.

---

## §5 — the residual, and the underived ceiling

**[LB] Elimination from source.** The home carousel blank the camera confirmed is:
- NOT an artloader release — home is not virtualized, no release path reaches a `.tile` (Q1). **[LB]**
- NOT a scroll-realize/eviction — the home covers are outside the document scroll on a fixed `#home`
  and are not windowed (Q4). **[LB]**
- NOT a cover re-fetch or re-fade — `art loaded=0 instant=0 FADED=0` on the reveal (Q4). **[LB]**
- NOT captured by any EXPOSED/COVERED DOM counter — the watcher buckets only `.browsepage` (Q1). **[LB]**

**[UD] The residual is a compositor re-raster of already-present carousel layers, and what forces it is
not source-readable.** Two candidate runtime causes remain, neither settleable from source:
1. The document reflow/recomposite from the `#browse` collapse (Q3) — iOS may re-raster all layers,
   including the fixed `#home` carousel scroll-layers, on the frame the document height changes.
2. The incoming real-`#home` slide transform (`borrowed-real` incoming mover, swipe.js:344) clearing at
   commit — a promote→demote on `#home`'s `will-change:transform` layer (css:131), which the prior
   `6f`-class flash implicates for a real view.
Settle: on-device Safari compositing-layer borders and/or a high-frame-rate capture across a scrolled
`books→home` commit — observe whether the fixed `#home` carousel layers re-raster on the `#browse`
`display:none` frame vs on the slide-transform clear. jsdom cannot composite. **[UD]**

**[LB] Why 6i did not fix it.** 6i removed the HOME-side reflow (fixed `#home`) but the flash's inputs
that remain — the OUTGOING `#browse` document collapse + clamp (Q3), and the incoming `#home`
slide-transform demote — are both untouched by making `#home` fixed. The `released=35`/`src 17→0`
signals that might suggest "the fix released the home covers" are the departing BOOKS list (Q1) and do
not bear on the home flash.

---

## Handoff → Vitruvius (the planner)

Source artifact: this sheet (`Claude/Linnaeus/PROBE-artrelease-reveal-2026-07-28.md`). Derived against
`.264` (HEAD `fec9612`): (1) `released=35`/`src 17→0`/`realized 35→22`/`ROWS KEPT 0/70` are the
DEPARTING BOOKS virtual list — `ArtLoader.release`'s only call site is `browse.js:releaseRow`
(browse.js:44-46, 638; virtuallist.js:198,211) and `snapBrowse` measures `#browse:not(.hidden)`
(app.js:269,288); home carousels are non-virtualized with no release path (home-screen.js:40-48) and
their covers did not load/fade (`loaded=0/FADED=0`). (2) The books release is driven by the virtual
window shrinking to the clamped `window.scrollY` (virtuallist.js:206,210-211); exact firing vs
deactivate is runtime-sequenced UNDERIVED but both target books. (3) The reflow PERSISTS and is driven
by the in-flow outgoing `#browse` going `display:none` (nav.js:64; index.html:62), collapsing the
document 14676→895 and clamping 11247→43 — fixed-`#home` never addressed the outgoing side. (4) The
carousels ARE insulated from the document scroll (fixed `#home` `overflow-y:auto`, css:123-129;
viewport-anchored, non-virtualized), so the clamp cannot blank them. The home flash is therefore a
compositor re-raster of already-present carousel layers, UNDERIVED between the `#browse`-collapse
recomposite and the incoming `#home` slide-transform demote — device layer-border / frame capture
settles it. Linnaeus states the facts and hands over; the design is Vitruvius's.

VERDICT: DERIVED
