# MENDELEEV — the `#browse` scroll DECOUPLE coverage audit (fixed own-scroll `#browse`)

Type: coverage-audit (publish gate — the now-green suite swept against the plan's Coverage Model)
Target: immutable HEAD `a1a75f4` ("Poirot: browse-decouple code review — SHIP"), build .267; the build lands at `4ddd9e5`.
Plan of record: `Claude/Plans/PLAN-browse-decouple.md` (PLAN_READY, Charpy FORGE + Loki HELD_STONE), §11 Coverage Model + `vitruvius-coverage`; §6 the six-consumer re-home (B1–B6).
Suite audited: `test/browse-decouple.test.js` (8 cells: BROWSEFIXED, SCROLLBAR, GHOSTSCROLL, STRIPEXCLUDE, REALIZE, METRICS, RESTORE, PINGONE) + the lockstep-edited suites (`swipe-construction` F2-r, `screens`, `browse-virtual`, `browse-render-race`, `repaint`, `swipe-stage6i` STABLEHEIGHT-removed).
Mutation registry: `tools/mutate.mjs` #85–92 (8 new) + #58/#83 (2 re-anchored); anchor gate `test/mutation-anchors.test.js`; sweep `tools/mutation-sweep.mjs`.
Inputs read: Curie `RED-browse-decouple.md` (RED_SUITE_READY, honest-scoping note, B4-no-CI-cell flag, device-only list), Poirot `POIROT-browse-decouple.md` (SHIP, SOURCE_TEXT_GATES + STABLEHEIGHT rulings), the plan §3/§6/§11/§12/§13/§14, the built `css/app.css`/`js/virtuallist.js`/`js/browse.js`/`js/scrollbar.js`/`js/swipe.js`/`js/nav.js`.
Date: 2026-07-29.

`Verdict: **ADEQUATE**` — every applicable cell of the §11 Coverage Model is non-vacuously swept on a real, jsdom-observable channel (CSS source-text, `surfaceKind`'s return, the captured ghost-offset VALUE + clone `transform`, the clone's `.alphaindex` count, a dispatched-event handler-ran flag + the pure `windowFor` key set, the injected `metrics.scrollY()`/`scrollTo()` read/write, a `#browse.scrollTop` write-count, and `appEl.style.minHeight`), each pinned by a registered mutation CAUGHT this pass (sweep 10/10, 0 uncaught); the four device gates R-flash/R-navbar/R-strip/R-browse2browse plus the real-geometry windowing/clamp AND the B4 `playingTrackY` files-page offset are honestly disclosed as device/manual-owed with nothing device-only smuggled in as CI-covered; the removed `STABLEHEIGHT` cell and the `SOURCE_TEXT_GATES` non-addition open no coverage hole; and the lockstep suites carry the new `#browse.scrollTop` surface truth without a weakened assertion.

---

## Executed evidence (this pass, independent of Curie/Brunel/Poirot)

- `node --test test/browse-decouple.test.js` → **8 pass / 0 fail**.
- `node --test "test/*.test.js"` → **748 / 747 pass / 0 fail / 1 skip** (the device-only KEEPER) — includes every lockstep suite; all green.
- `node --test test/mutation-anchors.test.js` → **2 pass / 0 fail** (every FROM-string matches source — no rotted/no-op mutant across the whole 93-mutant registry).
- `node tools/mutation-sweep.mjs 85 86 87 88 89 90 91 92 58 83` → **all 10 `caught`; swept 10: 0 uncaught, 0 unapplied, 0 stale flags**. Per-mutant: #85 caught(1), #86 caught(2), #87 caught(2 — GHOSTSCROLL + swipe-construction F2-r), #88 caught(1), #89 caught(1), #90 caught(1), #91 caught(4 — RESTORE + 3 collateral), #92 caught(1), #58 caught(2), #83 caught(1).
- Sweep hygiene: post-sweep `find . -name '*.mutbak'` → EMPTY; `node tools/hooks/no-mutbak-check.mjs` → exit 0; `git status --porcelain` → clean.
- Registry total: `tools/mutate.mjs` exports **93** mutants; the 8 browse-decouple are #85–92.
- Read: the `#browse` fixed rule + no-will-change body, `virtuallist.js` capture-phase listener, `browse.js` `virtualView` metrics injection (listTop at 656) + `playingTrackY` re-home (browse.js:252 `o.mount.scrollTop + …`), `scrollbar.js` `'browse'` kind, `swipe.js` ghost browse branch + `.alphaindex` exclude, `nav.js` `.266` pin retirement, the F2-r re-home (swipe-construction.test.js:181-190), the STABLEHEIGHT removal note (swipe-stage6i.test.js:327-333), the SOURCE_TEXT_GATES table (mutation-sweep.mjs).

## Coverage matrix — the eight CI cells (all swept)

| Cell | Promised behavior (§11) | Observable channel (non-vacuous) | Registered mutant | Caught? |
|---|---|---|---|---|
| BROWSEFIXED | the base `#browse` rule is `position:fixed`+`overflow-y:auto` with NO `will-change`/non-none transform | CSS source-text: `position:fixed` + `overflow-y:auto` match, `will-change`/transform doesNotMatch on the `#browse` rule body | #85 (add `will-change`) | ✓ (1) |
| SCROLLBAR | the fixed own-scroll `#browse` is a supported scrollbar surface | `ScrollBar._test.surfaceKind(#browse) != null` | #86 (surfaceKind drops `#browse`) | ✓ (2) |
| GHOSTSCROLL | outgoing app-ghost of a scrolled BROWSE source reads its offset from `#browse.scrollTop` (SOURCE branch) | `capture.ghostY===500`; clone `transform==='translateY(-500px)'` | #87 (revert browse source to `window.scrollY`) | ✓ (2) |
| STRIPEXCLUDE | the abort ghost clone excludes the fixed `.alphaindex` strip | `clone.querySelectorAll('.alphaindex').length===0` | #88 (drop the exclude) | ✓ (1) |
| REALIZE | the virtual-list scroll listener is capture-phase document (a `#browse` scroll reaches realize) + the pure `windowFor` model is correct | dispatched-on-`#browse` scroll sets `realized>0`; `windowFor` key set (`k10`, bounded length) for injected numbers | #89 (listener stays on `window`) | ✓ (1) |
| METRICS | `browse.js` `virtualView` injects `#browse`-relative metrics into `createController` | `captured.metrics.scrollY()===321` (reads `#browse.scrollTop`); injected `scrollTo(654)` writes `#browse.scrollTop===654` | #90 (inject no metrics) | ✓ (1) |
| RESTORE | the browse→browse abort re-render writes the `#browse.scrollTop` surface via `positionOnEnter`/`applyScrollY` | a `scrollTop` set-spy on `#browse` records `writes.length>0` after the abort | #91 (`applyScrollY`→`window.scrollTo`) | ✓ (4) |
| PINGONE | `→home` from a scrolled browse never pins `app.style.minHeight` (the `.266` probe retired) | `appEl.style.minHeight===''` after `setView('home')` | #92 (reintroduce the pin) | ✓ (1) |

Each cell fails-by-construction at HEAD (Curie's red-run) and is caught by an EXECUTED mutant this pass.

## Item 1 — every §3/§6/§11 behavior has a cell or an honest device disposition (NO bare cells)

- **`#browse` fixed own-scroll recipe (no `will-change`/transform)** → BROWSEFIXED (#85), the load-bearing Linnaeus-Q1 tripwire. **Not bare.**
- **B1 books virtual list** → REALIZE (#89, listener re-home + pure `windowFor`) + METRICS (#90, the injection wiring `virtualView`→`createController`, asserting the injected `scrollY()`/`scrollTo()` read/write `#browse.scrollTop`). The production real-geometry `listTop` (`getBoundingClientRect`) + clamp are DEVICE/manual-owed — jsdom returns 0 for every rect/`scrollHeight`, so a landing-value cell would be VACUOUSLY GREEN. **Not bare** (the wiring + pure model are covered; the geometry is genuinely unobservable in CI, correctly device-owed).
- **B2 recorder / B3 `applyScrollY`** → RESTORE (#91, the write-surface: `#browse.scrollTop` written, not `window.scrollTo`). The clamped landing VALUE is device-owed (jsdom `scrollHeight`=0). **Not bare.**
- **B4 `playingTrackY`** (browse.js:252, re-homed `window.scrollY`→`o.mount.scrollTop`) — NO CI cell, disclosed by Curie RED §6-B4 and plan §6-B4 as a real-geometry files-page offset (device/manual-owed). Independently confirmed the disposition is HONEST, not a silent gap: the offset is `o.mount.scrollTop + row.getBoundingClientRect().top - clear`; its only consumer is a files-entry `applyScrollY`, which CLAMPS to `scrollHeight` (0 in jsdom) → the source substitution is masked to 0 regardless. A mutation reverting it to `window.scrollY` would be UNCAUGHT by construction, so registering one would report a permanent false UNCAUGHT (the 6i F2-r-wiring lesson) — correctly NOT registered. **Not bare** — device-owed is the correct disposition; see the Note below.
- **B5 scrollbar** → SCROLLBAR (#86, the new `surfaceKind`='browse' decision point). `metrics()` is UNCHANGED generic non-doc code (reads `t.scrollTop`, already exercised for `#home` since 6i), not new code — same disposition as the 6i SCROLLBAR cell. **Not bare.**
- **B6 swipe ghost offset** → GHOSTSCROLL (#87); the browse→browse abort scroll RESTORE reuses the source page's existing `positionOnEnter → applyScrollY(#browse.scrollTop)` (no `srcScroll` added, Loki R1) → RESTORE (#91). **Not bare.**
- **`.266` pin retirement** → PINGONE (#92, asserts the pin is never re-set). **Not bare.**
- **`.alphaindex` abort-ghost exclude** → STRIPEXCLUDE (#88). **Not bare.**

## Item 2 — device gates + real-geometry + B4 DISCLOSED, nothing smuggled as CI-covered

R-flash (Books→Home flash), R-navbar (bars seat with no in-flow view driving height), R-strip (fixed `.alphaindex` under a fixed `#browse`), R-browse2browse (browse→browse as a fixed translateX mover), the real-geometry windowing/clamp (B1 `listTop` + the RESTORE landing value), and the B4 `playingTrackY` offset — all disclosed in plan §11 "External side effects (device)" + §12 + §14; Curie RED "honest scoping" note + "Device-only cells" + the B4 flag; the test-file header; Poirot Scrutiny 6. Independently verified no CI cell reads a paint or a real-geometry value: BROWSEFIXED source-text; SCROLLBAR a function return; GHOSTSCROLL the offset VALUE (500) + clone `transform` string, explicitly not the on-screen jump; STRIPEXCLUDE a clone DOM count; REALIZE a handler-ran flag + pure-model keys for INJECTED numbers (not row materialization); METRICS injected-fn read/write; RESTORE a write-count (not the clamped value); PINGONE an inline style. **Nothing device-only is claimed CI-covered, and no CI cell is bare where a real CI assertion was possible** (B4 is the one judgment call, and its end-effect is jsdom-clamp-masked — see Note). Flash C is correctly OUT of scope (a separate deferred track).

## Item 3 — STABLEHEIGHT removal + SOURCE_TEXT_GATES non-addition open NO coverage hole

- **Removed STABLEHEIGHT cell** (swipe-stage6i.test.js). Independently confirmed it tested ONLY the retired `.266` pin's behavior: (a) `.app` min-height pinned on `→home`, (b) set before `#browse` hidden, (c) cleared on `→browse` — every one is the pin `nav.js` deletes, and PINGONE (#92) asserts the direct opposite (min-height stays `''`). Keeping STABLEHEIGHT would fail and contradict PINGONE. Its (b') "no `scrollTo(0,0)` on `→home`" concerned the `.265` preempt, already absent from HEAD `setView` (plan §7) with no mutation targeting it — so no LIVE behavior loses its guard. The removal note (swipe-stage6i.test.js:327-333) records the supersession. **No hole.**
- **`SOURCE_TEXT_GATES` non-addition.** Independently confirmed `browse-decouple.test.js` is NOT in `SOURCE_TEXT_GATES` (`behaviourTests()` excludes whole FILES; adding it would have exempted all 8 cells from the sweep — a real hole). BROWSEFIXED therefore stays a plain registered mutation in the non-gated suite: #85 reads the on-disk `css/app.css` and reddens on the `will-change` write — caught this pass. The literal plan/RED instruction rested on a non-existent per-cell `caughtBy` mechanism and a mirror file (`test/home-layer-invariant.test.js`) that does not exist; Brunel's deviation is the correct call. **No hole; BROWSEFIXED is not exempted.**

## Item 4 — lockstep suites carry the new `#browse.scrollTop` surface truth (ADEQUATE)

- **`swipe-construction` F2-r** (line 181-190): re-homed `mkEnv({scrollY:137})`→`mkEnv()` + `#browse.scrollTop=137`; asserts `ghost.capture.ghostY===137` for a browse→browse ghost — the value is UNCHANGED, only the source is re-homed to exercise the new branch. Mutation #87 reddens it alongside GHOSTSCROLL. **Not weakened.**
- **`screens.test.js`**: `#browse` added to the scrollbar-hide list in lockstep with the CSS scoped-hide rule + the new `'browse'` `surfaceKind`. **Correct.**
- **`browse-virtual.test.js`**: `scrollHeight` mock → `#mount`; mid-gesture scroll dispatch → `#mount.dispatchEvent` (required — the listener is now capture-phase document, never sees a window-dispatched event); entry-restore assert → `#mount.scrollTop`. Subject preserved. **Correct.**
- **`browse-render-race.test.js`**: `window.scrollTo` spy → a get/set `scrollTop` property on `#mount`; the real subject (a superseded slow page still scrolls to a Y from a display:none node) preserved. **Correct.**
- **`repaint.test.js`**: added minimal `Browse.init({mount})` (because `applyScrollY` now writes `o.mount.scrollTop`); removed the now-unused `window.scrollTo` stub. **Minimal + necessary.**
- **`swipe-stage6i.test.js`**: STABLEHEIGHT removed (Item 3); the rest of 6i unchanged.

All green in the full run; no assertion weakened or removed leaving a gap.

## Item 5 — mutation spot-check + decision-point coverage

Bounded sweep of the 8 new (#85–92) + 2 re-anchored (#58 `swipe5 freezeArt`, #83 `stage6i GHOSTSCROLL` home) → all 10 caught, 0 uncaught. The re-anchors are legit adjacency shifts: #58's anchor moved because the new `.alphaindex` line precedes `freezeArt(clone)` (same intent); #83's home ternary became a three-way chain so it now drops only the HOME branch (keeping browse) — a cleaner isolation. Both re-verified caught. `mutation-anchors` 2/2 (no no-op mutant across the whole 93). Every new decision point carries a mutant: the recipe (#85), the surface kind (#86), the ghost source branch (#87), the clone exclude (#88), the listener target (#89), the metrics injection (#90), the write surface (#91), the pin (#92). The one re-home without a mutant — B4 `playingTrackY` — is correctly unmutated (its revert is jsdom-clamp-masked, so any mutant would be a permanent false UNCAUGHT). **No obvious unmutated new branch.**

## Note (non-blocking) — B4 `playingTrackY` is the audit's single judgment call

B4 is the one re-home with no CI cell and no mutant. This is the correct disposition (the source substitution is masked by the `applyScrollY` clamp to `scrollHeight`=0 in jsdom, so no CI assertion discriminates it and no registered mutant could be caught), and it is disclosed by Curie and the plan. The residual is that the source-swap (`window.scrollY`→`o.mount.scrollTop`) is verified only by reading, not by an executed test — but since `playingTrackY` is an unexported private and its effect is jsdom-clamped, exporting it for a partial micro-assertion would test scaffolding, not the shipped path. Device/manual verification on the scrolled files-page repro (alongside R-strip/R-browse2browse) is the honest owner. Flagged, not a bare cell.

## Phase 6 — forward read

The CI suite spans its CI-checkable contract completely; the residual risk is entirely in the device tier the plan honestly fences off. If a bug reaches a user it lands in one of four places the build claims nothing about: R-strip (the load-bearing Linnaeus-Q1 bet — does WebKit keep the fixed `.alphaindex` viewport-anchored under a plain `position:fixed`+`overflow` `#browse`; BROWSEFIXED is the CI tripwire only for the no-`will-change` precondition), R-navbar (iOS-26 fixed-layer seating, the saga's recurring surprise — de-risked to 6i's proven home case but not proven for browse), R-browse2browse (the fixed translateX mover slide + strip re-anchor), or the real-geometry windowing/clamp (B1 `listTop`/B4 `playingTrackY`). The BROWSEFIXED source-gate is the standing guard that fires at CI if any parking/animation rule ever leaks a `will-change`/transform onto the base `#browse` and re-parents the strip (the `.195/.196` regression).

## Handoff

- **Source artifact:** this audit (`Claude/Mendeleev/AUDIT-browse-decouple.md`).
- **Verdict / status:** ADEQUATE. Publish gate cleared on the CI-checkable contract; the four device gates + real-geometry windowing/clamp + B4 remain device/manual-owed, disclosed, not coverage gaps.
- **Decisions made:** the STABLEHEIGHT removal and the `SOURCE_TEXT_GATES` non-addition open no hole (independently confirmed); B4 `playingTrackY` is correctly device-owed with no registered mutant (jsdom-clamp-masked); the lockstep suites carry the `#browse.scrollTop` surface truth un-weakened.
- **Open questions:** none for coverage. R-flash/R-navbar/R-strip/R-browse2browse (W30–W33) are on-device-strike downstream, not Mendeleev's.
- **Carried Mendeleev-owned watch items (unchanged by this build):** W5 `recovery-overlay-visibility-unpinned`; W12 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Not re-opened here.
- **Next owner:** on-device strike (R-flash/R-navbar/R-strip/R-browse2browse) + Loki (W21, a fresh strike against the built code remains the plan's downstream gate).
- **Records updated:** this case file filed.

VERDICT: ADEQUATE
