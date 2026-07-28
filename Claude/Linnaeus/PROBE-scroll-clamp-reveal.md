# PROBE — commit books→home flash A: the scroll-clamp / document-collapse reveal (Linnaeus)

Type: diagnostic (deriver — facts derived from the reference system: the real code + the on-device
scroll marks). READ-ONLY. No code/plan/test edits. Not a build plan. 2026-07-27.

Question (the user's device breakthrough): commit **books→home** FLASHES only when the books/authors
list is SCROLLED DOWN; at `scrollY≈0` it does NOT flash. Ground the hypothesis that flash A is a
scroll-CLAMP / document-height-collapse reflow (tall scrolled `#browse` → short `#home`), not the
compositor layer demote the `will-change`/`translateZ` patches were treating.

Grounded against `js/app.js`, `js/nav.js`, `js/swipe.js`, `css/app.css`, cross-checked against the
device marks in the task (`finalize=11481/14676 … preDrop=1/900 postDrop=1/900 final=1/900`,
`scrollWrites=[1@…:applyScreen@app.js:115 runFinalize@app.js:1180]`) and my two prior probes
(`PROBE-home-vs-browse.md`, `PROBE-swipe-reveal-teardown.md`).

---

## 0. HEADLINE (read first)

**The hypothesis is CONFIRMED as the trigger and REFRAMED in mechanism, with one sub-claim REFUTED.**

- **CONFIRMED:** flash A is the **tall-scrolled `#browse` → short `#home` document collapse + scroll
  clamp**, and it is A-ONLY. The document collapse (14676→900) happens on *every* →home commit, but
  the **scroll-clamp magnitude** is the sole variable that tracks the flash — large from a scrolled
  list, zero from the top. This is why the layer-promotion patches never fixed A: **A is not a layer
  demote.** `#home` keeps its compositing layer across the un-park (base `#home { will-change }`,
  `css:118`) yet A still flashes (device, home-vs-browse probe). Layer state is not A's variable;
  scroll-clamp magnitude is.

- **REFUTED (the specific fix-shape in the brief):** "settle/clamp the scroll to home's final
  position BEFORE dropping the cover" is **already what the code does.** The clamp and the collapse
  run *synchronously inside `applyScreen`* (`app.js:1172`), which is **before**
  `holdGhostUntilPaintable` and therefore before the cover drop. The device marks prove it:
  `preDrop=1/900` — the main-thread scroll is already at its final clamped value when the cover
  lifts. The reorder is a **no-op**; the scroll is not uncovered at the wrong position **on the main
  thread**.

- **QUALIFIED mechanism (the real gap):** everything settles correctly on the MAIN thread under the
  cover; the residual is a **compositor** event the double-`rAF` paint gate is structurally blind to.
  iOS's scrolling layer was rastered at offset ~11481 and must snap to ~1 while re-tiling the
  now-short document; the `holdGhostUntilPaintable` gate rides the main thread (`rAF`), sees
  `scroll=1/900`, and drops the cover during the compositor's snap/re-tile. From the top there is no
  snap → nothing to catch → no flash. **Device-only to confirm** (jsdom/rAF cannot composite), but it
  is the only reading consistent with: scroll-dependence + every in-page mark reading clean in BOTH
  cases.

---

## 1. The commit books→home finalize timeline, in exact order (grounded)

State at `finalize` (books scrolled down): `scrollY≈11481`, `document≈14676`. `#browse` is the
in-flow tall+scrolled view; `#home` is `.parked` (`position:fixed; translateX(-101vw)`, off-screen,
PAINTED — `css:103-107`); the home-snapshot cover is mounted (`ghostWrap`: `position:fixed; inset:0;
z-index:28`, on `document.body` — untrapped, covers the viewport; `swipe.js:240-243,270-282`).

| # | step | file:line | effect on scroll / document / layers |
|---|---|---|---|
| 1 | `mark('finalize')` | app.js:1170 | samples **11481 / 14676** |
| 2 | enter commit→home branch | app.js:1171 | |
| 3 | `applyScreen(home,{render:false,keepGhosts:true})` | app.js:1172 → app.js:115 → nav.js:116 | (steps 3a–3e, all synchronous, no paint between them) |
| 3a | `resetSwipeStyles(keepGhosts=true)` | nav.js:120,102-108 | clears the outgoing `#browse` inline `transform` → `#browse` at `translateX(0)`, still in-flow/scrolled; cover pane KEPT (keepGhosts) |
| 3b | `setView('home')` → `#home` un-park | nav.js:57 | `#home` loses `.parked` → in-flow at `translateX(0)`. **Base `will-change` (css:118) survives → NO layer demote.** |
| 3c | `setView` → `#browse` `.hidden` | nav.js:64 | `#browse` → `display:none`. **Document-height source switches from `#browse` (14676) to `#home`'s in-flow `.app` (`min-height: 100%+12vh` ≈ 900, css:73/81). → DOCUMENT COLLAPSES 14676→900.** |
| 3d | `setView` → `body.home-tall` | nav.js:81 | keeps home's `.app` tall enough to seat the fixed navbar |
| 3e | `window.scrollTo(0, 1)` | nav.js:127 | the **ONE and ONLY** scroll write on this path (logged `1@…applyScreen@app.js:115`). Requests `scrollY=1`. |
| 4 | `reportReveal('commit→home', #home, cover)` | app.js:1173 | reads `scrollY`/DOM → forces layout → **collapse+clamp REALIZE here on the main thread** (before any rAF) |
| 5 | `revealPending = true` | app.js:1174 | |
| 6 | `holdGhostUntilPaintable(#home, cover)` | app.js:1175,809 | gates on `decode(covers)` + **double-`rAF`** ("painted"); cover STILL up |
| 7 | gate passes → `drop()` | app.js:813-859 | |
| 7a | `cover.mark('preDrop')` | app.js:830 | samples **1 / 900** — scroll already clamped, doc already short |
| 7b | `fadePanes()` — COVER REMOVED | app.js:851-852 | snapshot pane `opacity→0`, removed +60ms → `#home` uncovered |
| 7c | `cover.mark('postDrop')` | app.js:853 | **1 / 900** |
| 8 | reveal window ends → `mark('final')` | app.js:1086 | **1 / 900** |

**The crux, answered:** `#home` is uncovered (step 7b) **AFTER** the scroll has settled to its final
clamped position (step 3e/4) and **AFTER** the document height collapsed (step 3c). There is **no
main-thread frame where `#home` paints at scroll 11481** — `scrollTo(0,1)` (3e) precedes the first
post-mutation paint, and `reportReveal` (4) forces the clamp before the rAFs. Every in-page mark
confirms `1/900` from `preDrop` onward. On the main thread, the brief's proposed reorder is already
in force.

Two non-events, ruled out here (consistent with prior probes): the outgoing `#browse` demote (3a) is
under cover then hidden (3c) → not visible; the `#home` un-park (3b) does not demote (base
`will-change`) → not A's cause.

---

## 2. WHY scrolled flashes and top does not (grounded)

The document collapse (14676→900) is driven by `#browse` `display:none` (3c) and is **identical in
both cases** — scroll-independent. The ONLY thing that differs is the **scroll-clamp magnitude** at
step 3e:

- **Top (`scrollY≈0`):** `scrollTo(0,1)` moves 0→1. No clamp, no compositor scroll snap. Cover drops
  onto an already-stable region. No flash.
- **Scrolled (`scrollY≈11481`):** `scrollTo(0,1)` collapses an ~11480px offset. On iOS the document
  scroll is a **compositor-driven scrolling layer** rastered around the old offset (browse rows at
  ~y11481); it must snap to ~1 and re-tile the now-short document (home at the top). The
  double-`rAF` gate reads the *main-thread* `scrollY=1` and drops the cover **during** that
  compositor snap. The user sees one frame of the layer mid-snap (old/out-of-bounds content) → the
  flash. Magnitude scales the snap, hence the dependence.

This is the same *family* as the `.202` "uncovered at a wrong scroll" finding — but that one was on
the ABORT→browse path and was visible on the **main-thread** marks (`preDrop=13631/2386`). Here the
main-thread marks are clean (`preDrop=1/900`); the mispositioning that remains is **on the compositor
timeline only**, which is exactly why every in-page instrument (all main-thread) has read this
transition clean while the user reliably sees it flash. The double-`rAF` "paint" gate measures the
main thread; iOS compositing/rasterisation is off it (the saga's withdrawn-frame-detector lesson).

**Derived vs device:** the ordering, the single scroll write, the collapse source, and
`scroll=1/900`-at-uncover are DERIVED (code + real-device marks). That the *visible* flash is the
compositor scroll-snap/re-tile is DEVICE-ONLY reasoning — jsdom cannot composite, and the
scroll-DEPENDENCE itself is the user's device measurement, taken here as given data.

---

## 3. The fix-shape (derived; Vitruvius designs the build)

**What is already done (do not re-derive it as the fix):** the scroll settles to home's final
clamped position under the still-present cover, before the drop (§1). Reordering "settle scroll
before uncover" changes nothing — `preDrop=1/900` already.

**The actual gap: give the COMPOSITOR time (or a signal) to finish the scroll-collapse snap before
uncovering.** The main-thread double-`rAF` gate cannot see it. Grounded candidate directions, in
order of directness:

1. **Gate the cover drop on the scroll timeline, not the main thread.** After `scrollTo(0,1)` (3e),
   hold the cover until a `scroll`/`scrollend` confirmation (or a short scroll-settle timeout) in
   ADDITION to the existing decode+paint gates in `holdGhostUntilPaintable` (app.js:860-875).
   `scrollend` rides the compositor/scroll timeline the double-`rAF` misses. Home-scoped (the
   commit→home branch, app.js:1171-1176). Efficacy device-only to confirm; but it targets the exact
   variable.
2. **Remove the large under-cover scroll collapse.** Settle the document to home's short height +
   `scroll≈1` EARLIER (e.g. at commit, well before finalize's double-`rAF`), so the compositor has
   many frames to reconcile the snap before the cover is a candidate to drop. Reduces the
   magnitude-at-reveal toward zero. More invasive (touches the commit→home hold branch's timing).
3. **Scroll-aware hold extension.** The reveal already samples `finalize` (11481) and `final` (≈1);
   when `|Δscroll|` is large, hold the cover extra frames. Crude, directly scroll-aware, lowest risk;
   no true "re-tile done" signal, so it is a heuristic.

**Explicitly NOT the fix for A (grounded):**
- **Layer promotion** (`will-change`/`translateZ` on `#home`) — A is not a layer demote (`#home`
  keeps its layer via css:118 and still flashes). This is why `.256`/`.257`/`.258` never fixed A.
  The base `will-change` remains load-bearing for **B**, not A; leave it.
- **Cover-side cross-fade** — softening the cover's exit does not change the compositor snap beneath
  it (the same reason the `.203` 120ms cross-fade failed). The gate must ride the scroll/compositor
  timeline, not fade the cover.

**Home-scoped?** YES for A. The mechanism and every candidate fix live in the commit→home reveal
branch (app.js:1171-1176) and its cover-drop gate. A carries no `#browse` `.alphaindex` fixed-strip
trap (that is `#browse`-only) and is independent of B and C. It is the safe, isolated case.

---

## 4. Flashes B and C under the same scroll lens (grounded — they are NOT the same root)

The scroll-clamp lens **isolates A**; it does not unify the three. The user's "maybe one root across
all three" resolves to **three distinct roots**:

| flash | path | document collapse? | scroll clamp magnitude | root |
|---|---|---|---|---|
| **A** commit books→home | app.js:1171 hold branch; `scrollTo(0,1)` (nav.js:127) | YES (14676→900) | **LARGE** (came from scrolled tall browse) | **scroll-clamp/collapse compositor snap** (this probe) |
| **B** abort home→books | app.js:1197 no-hold; `applyScreen(home,resetScroll:false)` + `scrollTo(0,cur.scroll0)` (app.js:1213) | YES, but transiently (books rendered in during drag, collapses back) | **SMALL** — user started AT home (short); `cur.scroll0≈small` | **`#home` un-park demote** (home-vs-browse probe; rare with base `will-change`) |
| **C** abort books→books | app.js:1185 hold branch; `applyScreen(browse,render:true,resetScroll:false)` + `scrollTo(0,cur.scroll0)` (app.js:1188) | **NO** — stays browse, doc stays tall | small (restored to `cur.scroll0`) | **incoming real-`#browse` transform promote→demote + re-render** (6f-confirmed class; T8-forked incoming rework) |

- **B is not scroll-clamp-driven:** home is short, so `cur.scroll0` is small; the transient tall
  document (books rendered mid-drag) collapses back with the scroll never far from home's top → no
  large clamp. B stays the un-park demote. **The scroll clue explains WHY A is special:** only A
  carries a large scroll INTO a tall→short collapse. A ≠ B, now with a mechanism for the asymmetry.
- **C has no document collapse at all** (books→books stays browse/tall). C is the container/incoming
  transform demote, not a scroll-clamp artifact. Unchanged from the prior probes.

So layer-promotion is the wrong tool for A specifically; it was aimed at B's demote. A needs the
scroll/compositor-settle gate; C needs the incoming out-of-flow rework. Three fixes, three roots.

---

## 5. Tools honesty (derived-order-fact vs device-only-flash)

- **DERIVED (code + real-device marks — stronger than a fresh jsdom run):** the finalize order (§1);
  the scroll clamp + document collapse occur inside `applyScreen` BEFORE the cover drop; exactly one
  scroll write (`scrollTo(0,1)`) on the commit→home path; `#home` un-parks WITHOUT demote (base
  `will-change` survives); `scroll=1/900` on the main thread by `preDrop`; the tall→short collapse is
  A-only; B and C carry no large scroll collapse.
- **DEVICE-ONLY (compositor, not jsdom/rAF-observable):** that the VISIBLE flash is iOS's scrolling
  layer snapping/re-tiling from the old offset; that it scales with clamp magnitude; whether any §3
  candidate (scrollend gate / early collapse / hold extension) actually kills it. The
  scroll-DEPENDENCE is the user's measured oracle, taken as given.
- **jsdom probe NOT run, deliberately:** the crux ordering (scroll clamp vs cover drop vs `#home`
  un-park) is already settled decisively by the code order PLUS the real-device marks
  (`finalize=11481/14676` vs `preDrop=1/900`) — real-device ordering is a stronger ground than a
  synthetic jsdom re-confirmation of class-toggle order, and jsdom cannot composite, so it cannot
  observe or refute the compositor snap that is the only open question. The tell that the mechanism
  is off-main-thread is precisely that every main-thread mark reads `1/900` in BOTH the flash and
  no-flash cases.

Related: memory `tomeroam-swipe-repaint-saga` (§ DEVICE REPRO CLUE 2026-07-27, ENVIRONMENT TRAP #4);
`Claude/Linnaeus/PROBE-home-vs-browse.md`; `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md`.
