# PROBE — #home vs the browse pages: park/reveal divergence & the will-change verdict (Linnaeus)

Type: diagnostic (deriver — facts derived from the reference system: the real code + the
project's reviewed frozen oracle). READ-ONLY. No code/plan/test edits. Not a build plan.

Question (the user's): Why is `#home` treated differently from the browse pages
(books/authors/files), and MUST it be? Can `#home` use the SAME park/reveal mechanism the
browse pages use — instead of its special `will-change` compositing-layer path?

Grounded against `css/app.css`, `js/nav.js`, `js/browse.js`, `js/app.js`, `js/swipe.js`,
`index.html`, cross-checked against the reviewed oracle (`test/fixtures/swipe-plan-spec.mjs`,
`docs/transition-matrix.generated.txt`) and the device data in memory
`tomeroam-swipe-repaint-saga`.

---

## 0. THE HEADLINE FINDING (read first — it corrects the question's premise)

**The premise "the browse pages do NOT have the compositing-layer demote" is FALSE.** Grounding
the code shows the revealed browse page un-parks (loses its `translateX` layer → demotes) **under
the still-present cover**, on the exact same reveal path as `#home` — and that transition
(aborted browse→browse) is flash **C, the headline unsolved flash of the whole saga.** The browse
pages are not a flash-free reference to copy; they flash by the *same* demote-under-cover
mechanism. They simply never had `will-change` bolted on as a mitigation.

So the real relationship is the inverse of the question's framing:

- `#home` and the browse pages already use the **same** park technique (fixed +
  `translateX(-101vw)`, painted-not-`display:none`, to keep covers decoded). The css comments say
  so verbatim (`css:86-90`, `css:290`: *"Same technique and the same reason as #home.parked."*).
- The **only** home-specific addition is `will-change: transform` — and it is a **recent,
  device-tuned flash PATCH** (`.256`/`.258`), not part of the original mechanism and not the
  original cover-warmth purpose.
- "Align `#home` down to the browse mechanism" (drop the `will-change`) would **remove home's only
  mitigation** (device data: flash B regresses from *rare* back to *constant*) and gain nothing,
  because the browse mechanism itself flashes.

**will_change verdict: LOAD-BEARING** (device-measured: removing it regresses flash B) — but
load-bearing as a partial patch that the saga records has *"hit its ceiling"*, not as an essential
architectural property of home.

**why home differs: the `will-change` itself is ACCRETED** (a bolted-on flash patch). The one
*essential* asymmetry is elsewhere and it runs the OTHER way: **`#browse` contains a
`position:fixed` `.alphaindex` A–Z strip and `#home` does not** — so a permanent compositing layer
is *safe on `#home`* and *forbidden on `#browse`* (it makes `#browse` the containing block for the
fixed strip — the `.195/.196` dead end). That constraint is why the two cannot simply share one
mechanism.

---

## 1. The two-level park model (what actually gets parked)

There are TWO independent park/reveal layers. Conflating them is how this subsystem burns reads.

**Level 1 — the in-flow view swap `#home` ⇄ `#browse`** (owned by `nav.js` `setView`):
- `#home` and `#browse` are the two in-flow app views (`nav.js:36` `appViewEl`).
- `nav.js:57`: `$('home').classList.toggle('parked', v !== 'home')` — home is `.parked` when NOT home.
- `nav.js:64`: `browseEl.classList.toggle('hidden', v !== 'browse')` — browse is `.hidden` (display:none) when NOT browse.
- **Steady-state asymmetry (grounded):** inactive `#home` = `.parked` (painted); inactive
  `#browse` = `.hidden` (display:none). `index.html:62` ships `#browse` as `class="view hidden"`.
  Home is kept painted between swipes; browse is not.

**Level 2 — the browse page-to-page swap** (books ⇄ authors ⇄ author's books ⇄ files), owned by
`browse.js`. Each screen is a cached `.browsepage` node inside `#browse` (`browse.js:13-19,488`):
- Steady state: inactive `.browsepage` = `.hidden` (display:none).
- **During a swipe only** (`holdRows`): the OUTGOING/non-destination `.browsepage` is `.parked`
  instead of `.hidden` (`browse.js:292-296`), so its covers stay decoded across the gesture;
  `endHold` returns every parked page to `.hidden` (`browse.js:162-169`). Gesture-scoped.

The `.parked` rules:
- `.browsepage.parked` (`css:91-96`): `position:fixed; transform: translateX(-101vw)`. **No
  `will-change`.** Promoted to a layer only by the transform.
- `#home.parked` (`css:103-108`): the same, **plus `will-change: transform`** (`css:107`).
- **`#home { will-change: transform }` base rule (`css:118`)** — UNCONDITIONAL, applies parked or
  not. This makes `#home` a permanent compositing layer. It is the `.256`/`.258` flash patch
  (comment `css:109-117`). Because 118 is unconditional, the `will-change` on line 107 is now
  **redundant** (harmless).

---

## 2. The park/reveal divergence, line by line

| step | `#home` (Level 1) | browse page (Level 2) |
|---|---|---|
| **parked by** | `nav.js:57` on entering browse (steady state) / `app.js:483` at swipe `start` | `browse.js:294` on swipe `showPage` (gesture-scoped, `holdRows` only) |
| **park style** | `css:103-108` fixed + `translateX(-101vw)` + `will-change` | `css:91-96` fixed + `translateX(-101vw)`, **no `will-change`** |
| **steady-state when inactive** | `.parked` (PAINTED) | `.hidden` (`display:none`) |
| **un-parked by** | `nav.js:57` (via `applyScreen`→`setView('home')`) | `browse.js:167` at `endHold`; and the destination page at `showPage` `browse.js:294` |
| **layer at un-park** | stays PROMOTED (base `will-change` css:118 survives the class removal) | **DEMOTES** (`translateX` removed, nothing else promotes it) |
| **fixed descendant?** | none (carousels only) | **`.alphaindex` (`position:fixed`, `css:620`)**, built into the page by `browse.js:820` |

**Where they truly diverge:** exactly one CSS declaration — the base `#home { will-change }`
(`css:118`). Everything else in the park technique is identical by design and by comment.

---

## 3. The reveal timing — why un-park is a *demote-under-cover* for BOTH

The finalize flow (`app.js:1155-1252`) reveals with a covering pane on the held paths, and the
un-park happens UNDER that cover in both the home and the browse case:

**Held reveal paths keep the cover up (`keepGhosts:true`) and drop it later:**
- commit→home: `app.js:1172` `applyScreen(dest,{render:false,keepGhosts:true})` un-parks `#home`
  (`nav.js:57`) **under the home-snapshot cover**; then `app.js:1175`
  `holdGhostUntilPaintable($('home'),cover)` holds the cover; the cover drops asynchronously in
  `drop()`→`fadePanes()` (`app.js:852`).
- abort→browse (rerender): `app.js:1186` `applyScreen(dest,{render:true,keepGhosts:true})` →
  `Browse.render` → `showPage`. `holdRows` is still true here (`dropRowHold` runs later, in the
  `finally` at `app.js:1250`), so `showPage` un-parks the **revealed start page** under the ghost
  cover (`browse.js:294`, `away=false`→`.parked` removed). Cover drops later in `drop()`.

**So the revealed real view un-parks (loses its `translateX` layer → demotes) while still
covered, for BOTH transitions.** The difference is only the layer's fate at that demote:
- `#home` keeps its layer across the un-park (base `will-change`) → *no* demote → device data: B
  becomes rare.
- the browse start page has no `will-change` → *demotes* → this is flash C.

Additionally on abort→browse the `#browse` **container** carries the swipe's own borrowed-real
transform and demotes at `app.js:775` (cleared to `''`) then re-renders (`app.js:1186`). So
abort→browse has TWO demotes-under-cover (container + inner page), neither with `will-change`.
Neither is device-isolated from the other; the saga/PROBE-swipe-reveal-teardown attribute C to the
container demote, but the inner `.browsepage` un-park demote is present on the same frame and is
the same mechanism.

**The clean control (`books→options` abort) confirms the mechanism:** its revealed real `#browse`
is never a mover and never re-rendered (`renderDestination:'none'`), so it sits continuously
painted — a full-viewport composited pane is torn down over it and it is CLEAN (6f device A/B,
saga). The flash is not the cover's teardown; it is the *demote of the view the teardown
uncovers*.

---

## 4. Is the `will-change` load-bearing or incidental?

**Two distinct `will-change` sites, two different answers:**

1. `#home.parked` line 107 `will-change` — **INCIDENTAL / redundant.** The original comment
   (`css:97-102`) frames it as "its own compositing layer … so covers stay warm," but the parked
   `translateX(-101vw)` already promotes the layer, and the base rule (118) already promotes
   `#home` unconditionally. Line 107 protects nothing that 118 and the transform don't already
   provide.

2. `#home { will-change }` base rule line 118 — **LOAD-BEARING (device-measured), as a flash
   patch.** Comment `css:109-117` states its job exactly: *"Keep #home a STABLE compositing layer
   so removing `.parked` at a reveal does NOT demote it — the demote is the home→books ABORT
   flash."* Device A/B (`.256` vs `.257`): the `will-change` form is device-clean-ish (abort flash
   rare), `translateZ(0)` flashed constantly, removing it → constant. So it changes measured
   behavior; it is load-bearing. **Nuance the saga is explicit about:** it only makes flash B
   *rare*, not gone (`will-change` is a droppable hint), and *"layer-promotion has hit its
   ceiling."* Load-bearing, but a partial patch — not a cure.

**Do the browse pages keep their covers warm WITHOUT `will-change`?** Yes — but not via a
compositing layer. Cover warmth on the browse pages comes from the **park-instead-of-display:none**
technique (`browse.js:285-296`), i.e. the *transform* (which incidentally also promotes a layer),
plus `holdRows` keeping virtual rows materialized (`browse.js:283`, suspend not deactivate), plus
`holdGhostUntilPaintable`'s `decode()` gate on genuine reveals (`app.js:809-862`). None of that
needs an *explicit* `will-change`. So the cover-warmth rationale in the `#home.parked` comment is
**satisfiable without `will-change`** — proving the *cover-warmth* purpose of the `will-change` is
incidental. What is NOT incidental is its *anti-demote* purpose (118), which is the flash patch.

---

## 5. Why home differs — essential vs accreted

- **The `will-change` layer on `#home`: ACCRETED.** It is a targeted flash patch added `.256`
  after the shared park mechanism already existed, tuned on-device, and documented in-code as
  experimental and at its ceiling. Not an essential property of "home."
- **Steady-state parked-painted (home) vs hidden (browse): pragmatic/accreted.** Home is the root
  view returned to most; keeping it painted avoids a re-decode on return. Browse accepts
  `display:none` + the decode-gate on return. A design convenience, not a structural necessity —
  but it is *why* the home un-park is a `parked→VISIBLE` reveal (the flash-B path) while a browse
  page's steady-state un-park is `parked→hidden` (invisible).
- **The one ESSENTIAL, code-forced asymmetry: `#browse` has a `position:fixed` `.alphaindex`
  descendant; `#home` does not.** `.alphaindex` is `position:fixed` (`css:620`) and is built into
  each `.browsepage` (`browse.js:820`, `browse.js:435`). A permanent `transform`/`will-change`
  layer on `#browse` makes `#browse` the containing block for that fixed strip → the A–Z strip
  scrolls with the page and mis-resolves its `right/top/bottom` (the `.195/.196` DEAD END, saga).
  `#home` has no fixed descendant, so the stable-layer fix is *safe on `#home`* and *forbidden on
  `#browse`.* **This is the real reason the two views cannot share one mechanism — and it forces
  the divergence in the harder direction (browse can't adopt home's fix), not the one the question
  supposed (home copying browse).**

---

## 6. Can `#home` adopt the browse park/reveal mechanism? — VERDICT

**Not-viable as framed, because the framing rests on a false premise.** Concretely:

- **If "adopt the browse mechanism" = drop `#home`'s `will-change` (match `.browsepage.parked`):**
  home loses its only mitigation. Device data says flash B goes from *rare* to *constant*. And it
  gains nothing, because the browse mechanism is not flash-free — its own revealed-page un-park
  demotes (flash C). This is a strict regression. **Do not do this.**

- **If "adopt the browse mechanism" = make home's inactive state `display:none` like `#browse`
  (drop steady-state parking):** home's covers re-decode on every return; the `decode()` gate
  (`app.js:861`) would cover the *cover* re-decode but the *view* demote/re-raster flash the saga
  is chasing is orthogonal to decode. Adds a cover-flash risk, removes nothing. Not attractive.

- **The productive direction is the OPPOSITE and SHARED**, and both current mechanisms are
  incomplete versions of it: the structural reveal fix (PROBE-swipe-reveal-teardown §5) — **never
  uncover a real view that is mid-demote; keep the revealed view a stable layer across un-park, and
  remove the cover on a compositor-timeline signal (the cover's own `opacity` `transitionend`),
  not a main-thread double-`rAF`.** Home is the *safe* place to hold the stable layer (no fixed
  descendant — the `.256` fix already does exactly this and is device-validated as a real, if
  partial, improvement). Browse is the *hard* case: the fixed `.alphaindex` blocks the
  permanent-transform route, so browse needs the out-of-flow-pane + single-invisible-real-swap
  rework (the T8-forked incoming work), NOT a `will-change`.

**Entailment if a later plan pursues alignment (for Vitruvius, not this probe):**
- Home side (low risk, already partly shipped): retain `#home`'s stable layer; replace the
  reveal's double-`rAF` cover-drop gate with a compositor-timeline signal so the cover lifts only
  after the revealed layer is composited. Risk: the `app.js:552-554` fixed-navbar "pop" from
  layer promotion — watch the navbar, one-line revert. `#home` has no `.alphaindex`, so the
  `.195/.196` containing-block trap does not apply here.
- Browse side (higher risk, the real headline work): cannot copy home's `will-change` (fixed
  `.alphaindex`). Requires representing the incoming browse view out-of-flow and swapping the real
  `#browse` once, invisibly, at the end — the T8-forked rework. This is the genuine fix for flash
  C and (by the same mechanism) does not regress the strip. Bounded but not small.
- The `will-change` on `#home.parked` line 107 can be deleted as redundant (base rule 118 covers
  it) — a pure cleanup, no behavior change, and it removes the misleading "cover-warmth" framing
  that this probe found to be incidental. (Cleanup only; not the flash fix.)

---

## 7. What jsdom could and could not tell me

Everything in this report is derived from the source directly and cross-checked against the
project's reviewed frozen oracle (`swipe-plan-spec.mjs` / `transition-matrix.generated.txt`) and
the device data in the saga — a stronger ground than a fresh jsdom run. I did **not** run a jsdom
probe: it would only re-confirm DOM-flow (which class toggles when, under what cover) that I read
directly, and it **cannot composite or rasterise**, so it can neither observe the flash nor
confirm/refute any demote hypothesis. The structural claims here (park sites, un-park order,
under-cover timing, the fixed-`.alphaindex` containing-block asymmetry) are derived-fact. The claim
that *which* demote produces the *visible* flash — and that `will-change` only makes B rare — is
**device-measured** (saga), not re-derivable in-page. The compositor timeline is inherently
device-only.
