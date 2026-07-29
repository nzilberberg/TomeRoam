# PROBE — the Browse swipe-abort letter flash: `.alphaindex` strip vs `letterhead` dividers (Linnaeus)

Type: fact sheet (deriver — facts derived from primary source at HEAD `ba54c58` = build `.266`, cited
`file:line`, read against the device oracle + git history). READ-ONLY. No code/plan/test edits. Not a
build plan. 2026-07-28.

Subject: on a Browse swipe-ABORT (books/authors) the "letters" flash, suspected as a regression in
`.264`(fixed-`#home`)/`.265`(clamp-preempt)/`.266`(stable-height). The coordinator widened the scope:
the user's VISUAL report is the IN-LIST divider/section-heading letters (`letterhead`, the A/B/C
headings between groups), which is NOT necessarily the side A–Z `.alphaindex` strip. This sheet derives
BOTH candidates, the regression question, whether the `#browse` own-scroll decouple zeroes each, and the
decouple consumer-surface delta.

Device log (browse→browse abort at scroll 13631, #35 books→authors):
```
ghostVsReal=[ letterhead 8/8 dy=0 · book 8/8 dy=0 · author 8/8 dy=0 · alphaindex 1/1 dy=13631 ]
scroll=[applied=13631/14676 … final=13631/14676]
```

⚠️ The `FLASH`/`ghostVsReal` log is rAF/DOM-based and has been COMPOSITOR-BLIND all saga (the carousels
flashed while the DOM read `sameNode`/`+img=0`/`dy=0`). So `letterhead 8/8 dy=0` means DOM positions
MATCHED, NOT that the in-list dividers do not visually repaint. Companion to `PROBE-decouple-browse-scroll`
(7ee66ab), `PROBE-home-vs-browse` (flash C), `PROBE-clamp-preempt`. NOTE (hard user constraint):
the red `--page-bg` gradient (css:41) is NOT to be touched — untouched here (READ-ONLY).
Marks: **[LB]** load-bearing, **[CX]** context, **[UD]** underived (compositor/runtime; what settles it named).

---

## 0. HEADLINE (read first)

- **Two distinct elements, two distinct mechanisms on the same browse→browse abort:**
  - **(A) the side `.alphaindex` A–Z strip — DOM-mispositioned by the scroll (dy=13631). [LB]** It is
    `position:fixed` (css:635); the abort ghost is a CLONE of `.app` with `transform:
    translateY(-ghostY)` (swipe.js:282), and a transform on the clone re-parents the fixed strip to the
    clone → it renders offset by `ghostY` = the scroll (13631). The clone's ids are stripped
    (swipe.js:276) but `.alphaindex` is a CLASS so its `position:fixed` survives. This is the CLEAR log
    signal (`alphaindex dy=13631`).
  - **(B) the in-list `letterhead` dividers — DOM-CORRECT (dy=0) but the whole `#browse` re-rasters on
    the abort. [LB]/[UD]** `letterhead` is plain STATIC in-flow text (css:335) inside `.lettergroup`
    (browse.js:662-664), carried by the clone's translate exactly like the rows → it MATCHES the real
    (dy=0). Its visual flash is the pre-existing **flash C**: the abort RE-RENDERS the page into `#browse`
    (app.js:1201) and un-parks/​demotes the real view under the ghost cover, then the ghost drops
    (`fadePanes`, app.js:869) — iOS re-rasters the uncovered `#browse`, repainting the whole list
    (dividers included) with the DOM untouched. The rAF log cannot see this (§Q1-B). **[UD]** compositor.

- **Which does source implicate for the user's "divider/heading letters"?** The user names the IN-LIST
  dividers = `letterhead` → **candidate (B), flash C** (a whole-`#browse` compositor repaint). The log's
  hard signal `alphaindex dy=13631` is **candidate (A)** — the SIDE strip, a real DOM mispositioning, a
  DIFFERENT element. Both are live on a scrolled browse→browse abort; the visible "letters" the user
  reports map to (B) if they mean the in-list A/B/C headings, to (A) if they mean the edge A–Z rail.

- **Regression? NO — neither is introduced by `.264`/`.265`/`.266`. [LB]** (A)'s transform-clone
  mechanism dates to Stage 5 `.239` (swipe.js `translateY(-ghostY)`); (B) is the saga's long-standing
  headline flash C. Git shows `.264`/`.265`/`.266` did NOT touch the browse→browse abort ghost or its
  scroll (§Q2).

- **Does the `#browse` own-scroll decouple zero them? NO, for either. [LB]/[UD]** (A): the ghost still
  needs a content-translate to show the scrolled position (window=0 would jump the ghost to the top —
  6i's own Loki counterexample), and that translate re-parents the fixed strip → the strip needs
  EXPLICIT handling (exclude/re-anchor), not fixed for free. (B): flash C is the re-render/demote/teardown
  repaint, independent of the window-scroll coupling the decouple removes → decoupling does NOT address
  it. **The decouple targets the `→home` clamp flash, not the browse→browse abort flash.** (§Q3)

---

## Q1 — what repaints on a browse→browse abort, per element

### (A) the side `.alphaindex` strip — DOM-mispositioned by the transform-clone

**[LB] Mechanism (same as the `.195/.196` dead-end):** the abort ghost is `ghostApp` (swipe.js:273),
built at gesture start for any `app-ghost` outgoing (browse→browse qualifies). It clones `.app`
(swipe.js:274), strips all `[id]` (swipe.js:276) — so `#browse`'s id is gone but `.alphaindex` is a
CLASS (css:635) and keeps its `position:fixed` — removes `.topbar`/`.hidden`/`.parked` (swipe.js:277-278),
and sets `clone.style.transform = 'translateY(' + (-ghostY) + 'px)'` (swipe.js:282), where
`ghostY = env.scrollY()` for a browse source (swipe.js:281). A non-`none` transform on the clone
establishes a containing block for its `position:fixed` descendant, so the clone's `.alphaindex` is
re-parented to the (scroll-translated) clone box and renders offset by `ghostY` = 13631 — while the
REAL strip is viewport-fixed (dy=0). That is exactly `ghostVsReal alphaindex 1/1 dy=13631`. **[LB]**
The in-flow `letterhead`/`book`/`author` are carried by the same translate, so they match (dy=0).

### (B) the in-list `letterhead` dividers — DOM-correct, but flash-C repaints the whole view

**[LB] `letterhead` is plain static flow text, no own layer.** `.letterhead { font-size; font-weight;
color; letter-spacing; margin; }` (css:335) — no `position`, `transform`, `overflow`, or `will-change`.
Built into each `.lettergroup` (`g.className='lettergroup'; …; lh.className='letterhead'`,
browse.js:662-664). In the clone it is ordinary content carried by the translate → dy=0. **[LB]**

**[LB] The browse→browse abort re-renders the page under the ghost cover, then uncovers.** app.js:1200-1208:
`if (!commit && cur.finPlan.abortRender === 'rerender')` (rerender is the browse→browse case,
finalizationPlanFor swipe.js:174) → `applyScreen(dest, {render:true, resetScroll:false, keepGhosts:true})`
(app.js:1201) RE-RENDERS the page into `#browse` (`showPage` un-parks the restored page) → `scrollTo(0,
cur.scroll0)` (app.js:1203) → `holdGhostUntilPaintable($('browse'), cover)` (app.js:1207) holds the
full-viewport ghost (`ghostWrap`: `position:fixed; inset:0; z-index:28`, swipe.js:257), then drops it via
`fadePanes` (`FADE_MS=0`, app.js:711,869). **[LB]**

**[UD] The `letterhead` flash is the flash-C compositor re-raster of the uncovered `#browse`.** Per the
saga (`PROBE-home-vs-browse` §3; `PROBE-swap-necessity`): the aborted browse→browse un-parks/​demotes the
real `#browse` (and its `.browsepage`) UNDER the ghost, and the ghost teardown uncovers a view that just
re-rendered + demoted → iOS re-rasters the whole `#browse`, repainting the dividers with the DOM
untouched. `letterhead dy=0` confirms only that no DOM MOVE occurred — the rAF/DOM log is structurally
blind to a re-raster (the carousel-flash lesson). Whether the dividers actually re-raster (vs the strip
being what the user sees) is device-only. Settle: device layer-border / high-fps capture of a scrolled
browse→browse abort, watching the `.lettergroup`/`letterhead` band vs the edge strip. **[UD]**

---

## Q2 — regression or long-standing?

**[LB] (A) the transform-clone strip offset is LONG-STANDING (Stage 5, `.239`).** `git log -S` shows
`clone.style.transform = translateY(-ghostY)` present since `6bf0d20` ("Stage 5 … build .239", the
buildConstruction extraction); the transform-of-a-scrolled-clone predates it in `start()`. Not a
`.264`+ change. **[LB]**

**[LB] `.264`/`.265`/`.266` did NOT touch the browse→browse abort ghost or its scroll.**
- `.264` (6i, `e21b4c6`): the ONLY `ghostApp` change was the ghostY SOURCE branch —
  `ghostY = fromKind === 'home' ? #home.scrollTop : env.scrollY()` (swipe.js:281). The BROWSE branch is
  `env.scrollY()`, byte-identical to the pre-6i `const ghostY = env.scrollY() || 0` (git show `e21b4c6`).
  6i's `holdGhostUntilPaintable` edit only removed the `→home` scroll-settle; the abort→browse held
  reveal is its "sole remaining caller", unchanged. **[LB]**
- `.265` (`017605d`): added `window.scrollTo(0,0)` in `setView`, guarded `v !== 'browse'` (nav.js:60) —
  so it NEVER fires on a browse→browse abort (dest is browse). No browse-abort effect. **[LB]**
- `.266` (`ba54c58`): edits are confined to the `→home` `#browse`-hide block in `setView` (pin/clear
  `.app` min-height; remove the `.265` scrollTo). `books→books` "never sets the pin" (commit body); the
  browse→browse abort path is untouched (the `.266` diff has no app.js/swipe.js/abort/ghost changes). **[LB]**
- `.alphaindex` is NEVER excluded from the ghost clone (`git log -S "alphaindex" -- js/swipe.js` is
  empty). **[LB]**

**[LB] (B) flash C is the saga's long-standing headline flash** (`PROBE-home-vs-browse` §0/§3), not
introduced by these builds.

**Conclusion: per source, the browse→browse abort letter flash — strip (A) or dividers (B) — is NOT a
regression introduced by `.264`/`.265`/`.266`.** **[UD]** why the user perceived it as "recently clean"
is a usage/perception fact source cannot settle; a candidate is scroll-depth dependence — a near-top
abort gives `ghostY≈0` (strip dy≈0, smaller re-raster), a far-scrolled abort (13631) gives the large
offset and a bigger uncovered re-render. Device/usage settles the perception.

---

## Q3 — does the `#browse` own-scroll decouple (window=0) zero either?

### (A) the `.alphaindex` strip: NOT fixed for free — needs explicit handling

**[LB] The ghost still content-translates by the browse scroll under the decouple, so the fixed strip is
still re-parented.** A clone of `.app` has its `#browse` id stripped (swipe.js:276), so the own-scroll
CSS (an `#browse{…overflow-y:auto}` rule, the `#home` analog css:123-129) never applies to the clone —
"a scrollTop write on the clone would be inert" (swipe.js:270-271). So the clone MUST show the scrolled
position via `translateY(-ghostY)`. Two sub-cases, both bad for the strip:
- If `ghostY` stays `env.scrollY()` = **0** under the decouple → the ghost renders the browse list at the
  TOP (wrong content — the "500px jump-to-top" Loki counterexample 6i hit for HOME, swipe.js:264-267). **[LB]**
- If the decouple applies the 6i fix — `ghostY = #browse.scrollTop` (13631) — the translate returns and
  **re-parents the fixed strip → dy=13631 again**. **[LB]**
Either way the transformed clone re-parents `.alphaindex`. **The decouple does NOT zero (A); the design
must handle the strip explicitly — exclude `.alphaindex` from the clone, or re-anchor it viewport-fixed**
(the move-it-out escape derived in `PROBE-decouple-browse-scroll` §Q3, browse.js:436,827). **[LB]**
*(Which route is design — Vitruvius's.)*

### (B) the `letterhead` flash C: NOT addressed by the decouple

**[LB] Flash C is the re-render/demote/teardown repaint, independent of the window-scroll coupling.** The
browse→browse abort re-renders the page (app.js:1201) and demotes the real `#browse` under the ghost, and
the uncovered re-raster is what repaints the dividers (§Q1-B) — none of which reads or writes the window
scroll. The decouple removes the WINDOW-SCROLL clamp (the `→home` flash driver); it does not remove the
browse-abort re-render or the container demote. **So decoupling the scroll does NOT fix (B) — flash C is
the separate incoming/teardown repaint, and remains after the decouple.** **[LB]/[UD]** (that flash C is
the divider repaint at all is the compositor claim, device-only.)

**[LB] Net: the `#browse` own-scroll decouple targets the `books→home` clamp flash, not the
browse→browse abort flash.** They are different roots; the abort flash (strip (A) and/or dividers (B))
needs its own handling.

---

## Q4 — decouple consumer-surface delta (refines `PROBE-decouple-browse-scroll` 7ee66ab)

**[LB] One refinement to consumer B6 (the swipe `scroll0`/ghost machinery).** Under the decouple,
`ghostApp`'s browse-source offset `ghostY = env.scrollY()` (swipe.js:281) reads `window.scrollY` = 0,
which would build the browse ghost at the top (the jump-to-top). It must re-home to `#browse.scrollTop`
— the exact analog of 6i's `fromKind === 'home' ? #home.scrollTop : …` branch (swipe.js:281). So B6
gains a specific site: **swipe.js:281 must add a browse branch reading `#browse.scrollTop`.** This does
NOT change the count (still the 6 load-bearing groups B1–B6 + B7 to re-verify); it pins the exact line
inside B6. **[LB]**

**[LB] And a NEW design obligation the abort surfaces (not a window-scroll consumer, but decouple-adjacent):**
the abort ghost's `.alphaindex` handling (§Q3-A) — exclude-or-re-anchor — is owed by any plan that keeps
`ghostApp` translating a `.browsepage` clone, decouple or not. It is recorded here so the decouple plan
does not inherit the strip offset silently. **[LB]** *(Design — Vitruvius's.)*

---

## Underived ceiling (compositor/runtime + perception)

1. **[UD]** Whether the `letterhead` dividers actually re-raster on the abort (candidate B) vs the user
   seeing the edge strip (candidate A) — the rAF/DOM log is compositor-blind; device layer-border /
   high-fps capture of a scrolled browse→browse abort settles which element visibly flashes.
2. **[UD]** Whether iOS re-rasters the whole uncovered `#browse` on the ghost teardown (the flash-C
   mechanism itself) — device.
3. **[UD]** Why the user perceived the abort as "recently clean" — a usage/perception fact (candidate:
   scroll-depth dependence, §Q2); not source-settleable.
4. **[UD]** Whether an explicit `.alphaindex` re-anchor removes (A) on device without disturbing the strip
   under normal scroll (spec says a viewport-fixed sibling is unaffected by a `#browse` transform —
   `PROBE-decouple-browse-scroll` §Q1 — but iOS-26 fixed-layer behavior is the saga's recurring surprise).

Everything in Q1's DOM mechanisms, Q2's git history, Q3's clone/translate facts, and Q4's consumer site
is derived from HEAD `ba54c58` source and cited; the compositor-repaint parts are flagged **[UD]**.

---

## Handoff → Vitruvius (the planner)

Source artifact: this sheet (`Claude/Linnaeus/PROBE-alphaindex-abort-2026-07-28.md`). Derived: the Browse
swipe-abort "letters" are TWO distinct elements — (A) the `position:fixed` side `.alphaindex` strip,
DOM-mispositioned by `ghostApp`'s `translateY(-scroll)` clone transform re-parenting the fixed strip
(swipe.js:282,276; css:635; dy=13631); and (B) the in-list `letterhead` dividers (plain static text,
css:335, browse.js:662-664; dy=0), whose flash is the pre-existing flash-C compositor re-raster of the
`#browse` re-rendered+demoted under the abort ghost then uncovered (app.js:1200-1208; `PROBE-home-vs-browse`
§3) — UNDERIVED (the rAF log is compositor-blind). NEITHER is a `.264`/`.265`/`.266` regression: the
transform-clone dates to Stage 5 `.239`, flash C is long-standing, and those builds left the browse→browse
abort path untouched (git). The `#browse` own-scroll decouple ZEROES NEITHER: (A) the ghost still
content-translates (window=0 jumps it to top — 6i's Loki case), re-parenting the strip, so it needs
explicit exclude/re-anchor; (B) flash C is the re-render/demote/teardown repaint, independent of the
window-scroll coupling the decouple removes. Consumer delta: B6 gains the exact site swipe.js:281 (browse
ghostY must read `#browse.scrollTop`); count unchanged. Linnaeus states the facts and hands over; the
design is Vitruvius's.

VERDICT: DERIVED
