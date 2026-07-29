# PROBE — the HOME-screen shift during a home→books swipe (.267, post-decouple) (Linnaeus)

Type: fact sheet (deriver — facts derived from primary source at HEAD `3b016ce` = build `.267`, cited
`file:line`). READ-ONLY. No code/plan/test edits. Not a build plan. 2026-07-29.

Subject: after the `#browse` decouple (`.267`) flattened the WINDOW scroll (home→books now logs
`scroll=[finalize=0/895 final=0/895]`, `ghostY=0`), the user reports the HOME screen still visibly
SHIFTS during a home→books swipe. The window-scroll clamp is gone, so the shift is on `#home.scrollTop`
(own-scroll) or is layout/compositor. The `scroll` log field is WINDOW scroll and is BLIND to
`#home.scrollTop` and to compositor/layout shifts — do not read its flatness as "no shift."

Companion to `PROBE-clamp-preempt`, `PROBE-artrelease-reveal`, `PROBE-home-scroll-surface` (this saga).
NOTE (hard user constraint): the red `--page-bg` gradient (css:41) is NOT touched (READ-ONLY).
Marks: **[LB]** load-bearing, **[CX]** context, **[UD]** underived (compositor/runtime; discriminator named).

---

## 0. HEADLINE (read first)

Two source-grounded mechanisms shift the HOME content during a home→books swipe; they split on
scroll-dependence:

- **M2 — GHOST/REAL geometry mismatch (SCROLL-INDEPENDENT, layout; the leading candidate for a shift
  that persists at `scrollTop=0`). [LB]** The outgoing-home GHOST clones `.app` and lays `#home` content
  in NORMAL FLOW at `#library` `padding-top: 46px` (swipe.js:275; matches css:208). But post-6i the REAL
  active `#home` is a `position:fixed` INSET box at `top: calc(safe + 51px)` + `padding-top: 14px`
  (css:126-131), which ignores `#library`'s padding. So the ghost's first home content sits ≈46px from
  the viewport top while the real `#home`'s sits ≈`safe+65`px — a fixed ≈`safe+19`px vertical offset,
  INDEPENDENT of scroll, realized when the ghost covers the real `#home` at swipe start (or is torn down
  on abort). This mismatch is a 6i artifact (fixed-inset `#home` while the ghost kept the in-flow
  `paddingTop:46` model) and matches "persists across `.266`/`.267`, longer-standing than the `.266` pin."
- **M1 — parking RESETS `#home.scrollTop` (SCROLL-DEPENDENT). [LB]** At swipe start `showAppView` adds
  `.parked` to `#home` (app.js:485), flipping `overflow-y: auto` (css:129) → `overflow: hidden` (css:102),
  which forces `#home.scrollTop` to 0 (an `overflow:hidden` box has no scroll offset). The ghost captured
  the real `scrollTop` FIRST (buildConstruction builds the outgoing ghost before the destination render
  parks home — swipe.js:336-347, 342, 289). On abort→home the real `#home` un-parks at `scrollTop=0`
  (the value is gone; no save/restore exists) while the ghost showed it at `scrollTop` → a jump of
  `scrollTop` px. Vanishes at `scrollTop=0`.
- **`released=23` is the departing BOOKS rows, not home. [LB]** Home carousels are not virtualized;
  `ArtLoader.release` only fires from the browse virtual list (browse.js:44-46). Benign/off-screen.

**Leading mechanism(s):** the logged case is `ghostY=0` (home at top) and the shift PERSISTS → **points
at M2 (scroll-INDEPENDENT layout)**. If on device the shift also GROWS with home scroll depth, **M1 is
additive** on the abort reveal. On-device discriminator in §5.

---

## 1. `#home.scrollTop` writes/resets on the home→books path

**[LB] The complete `#home.scrollTop` surface** (grep-exhaustive, `js/`):
- pull-to-refresh READS it (app.js:1316,1323) — gate only, no write. **[CX]**
- `applyScreen` home branch WRITES `$('home').scrollTop = 0` when `resetScroll` (nav.js:140). On a home→books
  swipe the commit path calls `applyScreen(books)` (not home), and the abort path passes `resetScroll:false`
  (app.js:444) — so nav.js:140 does NOT fire on this swipe. **[CX]**
- the ghost READS it: `ghostY = fromKind === 'home' ? doc.getElementById('home').scrollTop : env.scrollY()`
  (swipe.js:289). **[LB]**
- **NO explicit `#home.scrollTop` write on the swipe path** — but parking resets it implicitly (M1, §3).
  There is NO save/restore of `#home.scrollTop` across the swipe (only carousel horizontal `dataset.sl`
  is saved, app.js scroll recorder / swipe.js copyScroll). **[LB]**

So the home content's vertical position is perturbed not by an explicit scroll write but by the park's
overflow change (M1) and the ghost/real geometry gap (M2).

---

## 2. The ghost vs the real home (M2 detail)

**[LB] The ghost is built OUTGOING-FIRST, capturing the real scroll before the park.** buildConstruction
builds the outgoing app-ghost "to completion FIRST, before any destination render can clobber the source"
(swipe.js:336): `if (plan.outgoing === 'app-ghost') { const g = ghostApp(fromKind); … }` (swipe.js:341-344).
`ghostApp` reads `#home.scrollTop` (swipe.js:289) and clones `.app` (swipe.js:274), stripping ids
(swipe.js:276) and setting `#library` `paddingTop:46` (swipe.js:275), inside a `position:fixed; inset:0;
z-index:28` wrap (swipe.js:257). THEN the incoming render (renderDestination browse-host → showAppView)
parks the real `#home` (§3). **[LB]**

**[LB] The id strip makes the ghost's home NORMAL-FLOW, not the fixed inset box.** In the clone, `#home`'s
id is removed (swipe.js:276), so `#home { position:fixed; top:calc(safe+51); padding:14px 16px 40px;
overflow-y:auto }` (css:126-132) does NOT apply — the cloned home is `position:static` in normal flow,
its first content at `#library` paddingTop 46 (swipe.js:275). The REAL active `#home` IS the fixed inset
box: first content at `top:safe+51` + `padding-top:14` = `safe+65` (css:128,131). **Difference ≈
`safe+19`px, scroll-independent.** **[LB]**

**[LB] This mismatch is a 6i artifact.** Pre-6i `#home` was in-flow inside `.app`, its content cleared
the fixed topbar via `#library { padding-top: 46px }` (css:208) — the SAME 46 the ghost uses
(swipe.js:275), so the ghost MATCHED the real home. 6i made active `#home` a `position:fixed` inset box
(`top:safe+51`, css:128) that ignores `#library`'s padding, while `ghostApp` kept the in-flow
`paddingTop:46` model — introducing the ≈`safe+19`px gap. **[LB]**

**[UD] Whether M2's ≈`safe+19`px offset is the shift the user sees, and its exact magnitude on the target
device.** The gap's size depends on the device `--safe-top` (notch vs none) and the exact
topbar/`.section-title` margins; whether it reads as a visible "shift" and whether iOS repaints it at
ghost-appear vs ghost-teardown is compositor/layout runtime. The `ghostVsReal` log measures BROWSE
elements (`#browse .browsepage`, per `PROBE-artrelease-reveal`), not `#home`, so it cannot see this.
Settle: on-device — measure the home content's viewport-Y in the ghost vs the real `#home` at
`scrollTop=0`. **[UD]**

---

## 3. Fixed-`#home` reflow at swipe start (M1 detail)

**[LB] `showAppView` parks `#home` at swipe start.** The incoming render on home→books is
`renderDestination(dest,'browse-host')` → `showAppView(dest,true)` (app.js:515), whose else-branch runs
`$('browse').classList.remove('hidden'); $('home').classList.add('parked')` (app.js:485). **[LB]**

**[LB] Parking flips `#home` overflow `auto`→`hidden`, forcing `scrollTop` to 0.** Active `#home` has
`overflow-y: auto` (css:129); `#home.parked` has `overflow: hidden` (css:102). Setting `overflow:hidden`
on a scrolled element leaves it no scrollable overflow, so the browser clamps its `scrollTop` to 0 — the
scrolled home content jumps to its top within the parked (off-screen) box. Because the ghost captured
`scrollTop` FIRST (§2) and no save/restore exists (§1), the value is lost. **[LB]**

**[LB] The jump is realized on the ABORT→home reveal.** On abort the real `#home` un-parks
(`applyScreen(home)`, resetScroll:false — app.js:444; setView toggles `.parked` off, nav.js:57), restoring
`overflow-y:auto` but with `scrollTop=0` — so home shows at TOP while the ghost (held over it until
`fadePanes`) showed it at the captured `scrollTop`. When the ghost drops, home is at top → a jump of
`scrollTop` px. SCROLL-DEPENDENT (0 at `scrollTop=0`). **[LB]**

**[CX] `#home.parked` also changes the box insets** (`top:0` + no bottom, css:99 vs active `top:safe+51`
bottom:navbar css:128-129) and adds `will-change:transform` (css:102) — but the parked box is off-screen
(`translateX(-101vw)`), so its inset change is not directly visible; it matters only via the `scrollTop`
reset (M1) and the ghost/real gap (M2). **[CX]**

---

## 4. `released=23` — whose covers?

**[LB] The departing BOOKS rows, not the home carousels.** `ArtLoader.release` has one call site,
`browse.js:releaseRow` (browse.js:44-46), wired as the virtual-list `release` callback (virtuallist.js:198,211)
— home carousels are built by `renderTile` appended directly (home-screen.js), not virtualized, no release
path (established in `PROBE-artrelease-reveal` §Q1). On home→books the incoming `#browse` (books) is
rendered mid-drag and its virtual rows release on the abort. `released=23` is that off-screen books
teardown — benign, not a home shift. **[LB]**

---

## 5. Which mechanism — the on-device discriminator

**[LB] The logged case (`ghostY=0`, home at top) with a persisting shift points at M2** (scroll-independent
layout): at `scrollTop=0`, M1 contributes nothing (no scroll to lose), so any shift at top is the
ghost/real geometry gap (§2). **[LB]**

**On-device discriminator (settles M1 vs M2 vs both):**
- Scroll `#home` DOWN, swipe to books, ABORT back. If the home jump GROWS with the scroll depth → **M1**
  (`#home.scrollTop` reset on park, §3). If it stays ≈constant regardless of scroll → **M2** (geometry gap,
  §2).
- At `scrollTop=0` (home at top), swipe→abort. If a shift STILL occurs → **M2 confirmed** (M1 is silent at
  top). If clean at top and only shifts when scrolled → **M1 only**.
- Both can be present (M2 constant + M1 additive with scroll).

**[UD]** The compositor/layout realization — whether iOS visibly repaints the home content on the
ghost-appear or ghost-teardown frame — is device-only; the rAF/`ghostVsReal` log is `#browse`-scoped and
compositor-blind. jsdom cannot composite or run WebKit layout. The discriminator above is the settle.

---

## Handoff → Vitruvius (the planner)

Source artifact: this sheet (`Claude/Linnaeus/PROBE-home-shift-2026-07-29.md`). Derived: the home→books
home shift has two grounded mechanisms — **M2 (scroll-INDEPENDENT):** the outgoing-home ghost lays home
content in normal flow at `#library` paddingTop:46 (swipe.js:275; css:208), but post-6i the real active
`#home` is a `position:fixed` inset box at `top:calc(safe+51)`+pad14 (css:126-131) that ignores that
padding → a fixed ≈`safe+19`px ghost/real vertical gap, a 6i artifact matching the persist-at-top report;
**M1 (scroll-DEPENDENT):** `showAppView` parks `#home` at start (app.js:485), flipping `overflow-y:auto`→
`overflow:hidden` (css:129→102) and forcing `#home.scrollTop`→0, which the ghost captured first
(swipe.js:342,289) and no save/restore recovers (§1) → a `scrollTop`-px jump on the abort reveal.
`released=23` is the departing books rows (home not virtualized, browse.js:44-46), not a home shift. The
window-scroll `scroll` log is blind to both. Leading candidate for the logged `ghostY=0` persist is M2
(layout); M1 is additive when home is scrolled. On-device discriminator: does the jump scale with home
scroll depth (M1) or occur at top too (M2). UNDERIVED (device): the exact px and the compositor
realization. Linnaeus states the facts and hands over; the design is Vitruvius's.

VERDICT: DERIVED
