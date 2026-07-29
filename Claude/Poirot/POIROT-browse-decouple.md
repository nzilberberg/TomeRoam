# POIROT — the `#browse` scroll DECOUPLE code review (fixed own-scroll `#browse`, symmetric completion of 6i)

Type: code-review
Prior-review: POIROT-swipe-stage6i.md
Target: immutable commit `4ddd9e5` ("browse-decouple: fixed own-scroll #browse, symmetric completion of 6i", build .267). `fe940cd` (Zelda board) is records-only, not code-reviewed.
Range: d1e3568..4ddd9e5
Plan of record: `Claude/Plans/PLAN-browse-decouple.md` (PLAN_READY, Charpy FORGE + Loki HELD_STONE). RED suite: `test/browse-decouple.test.js` (Curie, `Claude/Curie/RED-browse-decouple.md`). Build log: `Claude/Brunel/browse-decouple-build.md`.

`Verdict: **SHIP**` — the change is a faithful, complete implementation of the plan; the six-consumer re-home and the fixed-`#browse` recipe are correct from source; coverage is genuinely 0-uncaught (I re-ran the whole sweep, not the report); no CI cell overclaims a device paint; and the two judgment calls the build log flags — the `SOURCE_TEXT_GATES` deviation and the `STABLEHEIGHT` removal — are not merely acceptable, they are the correct calls, one of which repairs a coverage hole the literal plan instruction would have opened. One Observation (the build log's file list omits four mechanical stamp files); nothing a competent reviewer would require changed before submit.

---

## The scene, and what it intends

Active `#browse` stops being an in-flow document-scroll view and becomes a `position:fixed` + `overflow-y:auto` own-scroll box — the exact move Stage 6i made for `#home`, minus `will-change` and minus `z-index` (both would establish a containing block / stacking context and re-parent the fixed `.alphaindex` A–Z strip, the `.195/.196` break). With both in-flow views fixed, `window.scrollY` is a constant 0 on the signed-in app views, so hiding `#browse` on `→home` can no longer collapse the document — the Books→Home scroll-clamp flash is removed by construction and the `.266` stable-height probe retires. Six window-scroll consumers re-home to `#browse.scrollTop`; the outgoing app-ghost gains a browse-source offset branch and excludes `.alphaindex` from its clone. The construction/classification/finalization contracts are untouched (browse stays `'browse'`). The intent matches the plan faithfully, and the scope matches the description.

## Scrutiny 1 — the books VIRTUAL LIST re-home (B1, the load-bearing one) — CORRECT

Verified from source, not from the report:

- **The scroll EVENT source.** `virtuallist.js:156` moved the one shared listener from `window` (bubble) to `document` capture-phase (`{capture:true,passive:true}`), mirroring `scrollbar.js:95`. `#browse`'s own scroll fires ON `#browse` and does not bubble; capture-phase document catches it generically with no `#browse` name baked into the module (it stays scroller-agnostic). The `onDocScroll` guards (`activeCtl`, `rafPending`, `scrollSuspended`, `isVisible()`) are unchanged, so home/overlay scrolls still filter out. Executed: mutation #89 (listener reverts to `window`) reddens REALIZE.
- **The metrics INJECTION (browse.js `virtualView`, 653-658).** The controller reads all geometry through `metrics.scrollY()/viewportH()/listTop()` and writes through `opts.scrollTo` (virtuallist.js:169-176, 212, 304, 323). `virtualView` now injects `scrollY: () => o.mount.scrollTop`, `viewportH: () => o.mount.clientHeight`, `listTop: () => o.mount.scrollTop + list.getBoundingClientRect().top - o.mount.getBoundingClientRect().top`, and `scrollTo: (y) => { o.mount.scrollTop = y; }`. **The injection is complete and correct:** `metrics` is all-or-nothing (`opts.metrics || {default}`), so all three functions must be supplied or the missing one throws — all three are present. `list === opts.container` (both are the `list` arg passed to `virtualView`), so the injected `listTop` measures the same element the default did. `o.mount === $('browse')` (app.js:2855). Executed: mutation #90 (inject no metrics) reddens METRICS, whose assertions actually *call* the injected `scrollY()`/`scrollTo()` and check `#browse.scrollTop`.
- **The realize/anchor MATH ports symmetrically.** `_realize` computes `top = scrollY() - listTop()`. Under the injected metrics `top = o.mount.scrollTop - (o.mount.scrollTop + listRect.top - mountRect.top) = mountRect.top - listRect.top` — the list's scroll-content offset, exactly analogous to the document version's `-rect.top`, and independent of whether the scroll rides the window or the element. `anchorEntryY = y + listTop()` correctly converts a model-space Y back to a `#browse.scrollTop` value. The formula is right; the *real-geometry instantiation* (`getBoundingClientRect` returns 0 in jsdom) is DEVICE/manual-owed and is correctly NOT asserted (REALIZE/METRICS/RESTORE are scoped to wiring/contract).

## Scrutiny 2 — the four EXTRA lockstep re-homes + the STABLEHEIGHT removal — all CORRECT, not made-to-pass

- **`browse-render-race.test.js`** — replaced the `window.scrollTo` spy with a get/set `scrollTop` property on `#mount` (bound as `Browse.init({mount})` at line 40). The test's real subject (a superseded slow page still scrolls to a Y from a display:none node) is preserved; only the observed write surface moves from `window.scrollTo` to `#mount.scrollTop`, matching B3. Correct.
- **`browse-virtual.test.js`** — the `scrollHeight` mock moved from `documentElement` to `#mount`; the mid-gesture scroll dispatch moved from `window.dispatchEvent` to `#mount.dispatchEvent` (necessary: the listener is now capture-phase document and never sees a window-dispatched event); the entry-restore assertion moved from `view.scrollY` to `#mount.scrollTop`. `#mount` is bound as the Browse mount (line 43). Each edit tracks a real surface change; no assertion weakened. Correct.
- **`repaint.test.js`** — added a minimal `Browse.init({mount})` because `applyScrollY` now writes `o.mount.scrollTop` and this file drives `applyScrollY` standalone (previously `o.mount` was untouched by the window-based path). Removed the now-unused `window.scrollTo` stub. Minimal and necessary. Correct.
- **`screens.test.js`** — added `#browse` to the expected scrollbar-hide list, in lockstep with the CSS scoped-hide rule and the new `'browse'` `surfaceKind`. Correct.
- **`swipe-construction.test.js` F2-r** — changed `mkEnv({scrollY:137})` to `mkEnv()` + `ghostCtx.doc.getElementById('browse').scrollTop = 137`, because a browse-source ghost now reads `#browse.scrollTop`, not `env.scrollY()`. The asserted value (137) is unchanged; its source is re-homed to exercise the new branch. This is the correct fixture for the new behavior, not a green-patch.
- **`STABLEHEIGHT` removal (swipe-stage6i.test.js).** The removed cell asserted three things, ALL of which are the retired `.266` pin's behavior: (a) `.app` min-height is pinned to a px string on `→home`, (b) set BEFORE `#browse` is hidden, (c) cleared on `→browse`. Every one is the pin the build deletes, and PINGONE asserts the direct opposite (min-height stays `''`). Keeping STABLEHEIGHT would fail and contradict PINGONE. It tested ONLY retired behavior — its assertion (b')'s "no `scrollTo(0,0)` on `→home`" concerns the `.265` preempt, long gone before this build and not reintroduced (no mutation targets it, so no live coverage is lost). Removal is justified.

## Scrutiny 3 — the `SOURCE_TEXT_GATES` deviation — SOUND, and it repairs a coverage hole

Brunel did NOT add `BROWSEFIXED` to `tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES`, contrary to the literal plan/RED instruction. I verified each of his three claims from source:

- **(a) `SOURCE_TEXT_GATES` excludes a whole test FILE, not a cell.** CONFIRMED: `behaviourTests()` (mutation-sweep.mjs:136) returns `all.filter((f) => !(f in SOURCE_TEXT_GATES))` — the keys are file basenames (`mutation-anchors.test.js`, etc.), and a listed file's every test is dropped from the sweep run. Adding `browse-decouple.test.js` would exempt all EIGHT cells (the 7 behavioral ones included) from ever being confirmed CAUGHT — a real coverage hole. Its stated purpose is files that fail on EVERY mutation; `browse-decouple.test.js` does not (only its own source-text cell reddens for its own CSS mutation), so it does not belong there.
- **(b) No `caughtBy`/`gateTestsFor` mechanism exists.** CONFIRMED by grep across `tools/` — the only matches are `SOURCE_TEXT_GATES`/`behaviourTests`. There is no per-cell gate registration. The plan's referenced mirror file `test/home-layer-invariant.test.js` does not exist (Curie flagged this too); the real precedent, `HOMEFIXED` in `swipe-stage6i.test.js`, is a plain registered mutation in a NON-gated file — exactly the pattern Brunel used for `BROWSEFIXED`.
- **(c)/(d) `BROWSEFIXED`'s mutation is CAUGHT, not left uncaught.** Because `browse-decouple.test.js` is NOT gated, the sweep runs it; the `BROWSEFIXED` cell reads the on-disk `css/app.css`, so when mutation #85 writes `will-change: transform` into the `#browse` rule, the cell reddens. Executed independently below: `#85 caught (1 failing)`.

The literal instruction rested on a misreading of the mechanism (a per-cell registration that does not exist); following it would have silently dropped seven behavioral cells from the sweep. Brunel's deviation is the correct call and is disclosed. Not a defect.

## Scrutiny 4 — S1 recipe + S3 ghost/strip — CORRECT + COMPLETE

- **S1 recipe (css:139-159).** `#browse { position:fixed; ... overflow-y:auto; ... }` — carries NO `will-change`, NO `z-index`, NO transform (the load-bearing Linnaeus Q1 caveat). References `var(--page-bg)` for background (does not alter css:41's forbidden gradient token). `body.has-player #browse` bottom bump present. The base `#browse` rule (not `body.has-player #browse`) is the BROWSEFIXED target. Executed: #85 (add `will-change`) reddens BROWSEFIXED.
- **S3 ghost branch (swipe.js:288-290).** `ghostY` gains `: fromKind === 'browse' ? (doc.getElementById('browse').scrollTop||0)` between the home and else branches, fed to the same `translateY(-ghostY)`. Executed: #87 (drop the browse branch) reddens GHOSTSCROLL.
- **S3 strip exclude (swipe.js:281).** `clone.querySelectorAll('.alphaindex').forEach((n) => n.remove())` runs after the `.hidden,.parked` prune and before `freezeArt`. The live `#browse` `.alphaindex` (z24) is untouched. Executed: #88 (drop the exclude) reddens STRIPEXCLUDE.

## Scrutiny 5 — regressions — none visible at CI

- **Full suite green** (748 tests / 747 pass / 0 fail / 1 pre-existing device-only skip), re-run this pass, covering the browse→browse / scrollbar / restore / home-behavior seams.
- **The recorder move (browse.js `init`, 60-73)** is add-once in production: `Browse.init` is called exactly once (app.js:2855); `Browse.reset()` (sign-out, app.js:2471) does NOT re-add the listener. No duplicate-listener leak. The old module-load `window` listener was also add-once — behavior-equivalent bar the surface.
- **nav.js probe retirement (45-74)** is clean: the `appEl` local is gone, the shown→hidden guard now only calls `browseWillHide()`, `browseEl` is still used for the hidden toggle. No dangling reference; `browseWillHide` deactivate-before-hide (O3) preserved.
- **The two re-anchored pre-existing mutations** (#58 `swipe5 freezeArt`, #83 `stage6i GHOSTSCROLL` home) are legit adjacency shifts: #58's anchor moved because the new `.alphaindex` line now precedes `freezeArt(clone)` (same "skip freezeArt" intent); #83's home ternary became a three-way chain, so it now drops only the HOME branch (keeping browse) — a cleaner isolation of the same intent. Executed: both caught. `mutation-anchors` 2/2 (every FROM matches source; no no-op mutant).

## Scrutiny 6 — device overclaim — NONE

Read every one of the 8 cells: BROWSEFIXED asserts source text; SCROLLBAR asserts `surfaceKind`'s return; GHOSTSCROLL asserts the captured offset value (500) + the clone's `transform` string; STRIPEXCLUDE asserts the clone's `.alphaindex` count; REALIZE asserts the handler ran + the pure `windowFor` key set; METRICS asserts the injected functions' read/write; RESTORE asserts a write to `#browse.scrollTop` occurred; PINGONE asserts `style.minHeight` stays `''`. None reads a paint or rAF-flash proxy. R-flash / R-navbar / R-strip / R-browse2browse and the real-geometry windowing/clamp are explicitly device-owed and NOT asserted; the test-file header and Curie's note disclose this honestly. Flash C (the in-list divider re-raster) is correctly left OUT of scope (a separate deferred track). No overclaim.

## Findings

None blocking. One Observation.

| # | Severity | Where | Finding | Fix |
|---|---|---|---|---|
| O1 | Observation | `Claude/Brunel/browse-decouple-build.md` "Files changed" | The build log's explicit file list omits the four build-stamp files that changed (`index.html`, `js/debug.js`, `sw.js`, `build.json`). Their change is the mandatory uniform stamp bump (`.266`→`.267`), correct, consistent, and guarded by `stamp-build --check` (which the log DID state it ran); the commit message discloses the bump. So this is a records-completeness gap in a Zelda-layer artifact, not a code defect and not a misrepresentation. | Add the four stamp files to the "Files changed" list (or note "+ the four build-stamp files"). Optional. |

## Coverage Ledger

`✓` = cleared by EXECUTED evidence run THIS pass (commands in "Executed evidence"); `~` = cleared by reading/reasoning (no execution — real geometry is device-owed); `n/a`.

| Row (changed file / symbol) | Correctness / data-flow | Re-home / surface-swap | Mutation-verified | Device-overclaim | Suite / gates |
|---|---|---|---|---|---|
| `css/app.css` — `#browse` fixed rule (no will-change/z-index), `.app`/`#home` comments, scrollbar-hide list | ✓ (BROWSEFIXED) | ✓ (fixed own-scroll recipe) | ✓ (#85 reddens BROWSEFIXED) | ✓ (paint/strip = device R-strip, not claimed) | ✓ |
| `js/virtuallist.js` — scroll listener → capture-phase document | ✓ (REALIZE listener) | ✓ (window→document capture) | ✓ (#89 reddens REALIZE) | ✓ (pure model only; geometry device-owed) | ✓ |
| `js/browse.js` — `virtualView` metrics/scrollTo injection | ✓ (METRICS calls injected fns) | ✓ (all 3 metrics + scrollTo, `list===container`) | ✓ (#90 reddens METRICS) | ~ (listTop geometry device-owed) | ✓ |
| `js/browse.js` — `applyScrollY` + recorder(`init`) + `playingTrackY` re-home | ✓ (RESTORE write surface) | ✓ (o.mount.scrollTop; add-once recorder; clampY element bounds) | ✓ (#91 reddens RESTORE) | ~ (clamp landing + files offset device-owed) | ✓ |
| `js/scrollbar.js` — `surfaceKind` `'browse'` kind | ✓ (SCROLLBAR) | ✓ (mirrors `'home'`; metrics already generic) | ✓ (#86 reddens SCROLLBAR) | n/a | ✓ |
| `js/swipe.js` — `ghostApp` browse offset branch + `.alphaindex` exclude | ✓ (GHOSTSCROLL + STRIPEXCLUDE) | ✓ (browse branch; clone strip removed) | ✓ (#87, #88 redden their cells) | ✓ (offset value + clone DOM only) | ✓ |
| `js/nav.js` — `.266` probe SET/CLEAR retired, `appEl` local removed | ✓ (PINGONE) | ✓ (browseWillHide/O3 kept; no dangling ref) | ✓ (#92 reddens PINGONE) | ✓ (flash = device R-flash, not claimed) | ✓ |
| `build.json` / `index.html` / `js/debug.js` / `sw.js` — build stamps `.267` | ✓ (uniform, all match) | n/a | n/a | n/a | ✓ (`stamp-build --check` PASS) |
| `test/browse-decouple.test.js` — the 8 CI cells (read in full) | ✓ (each genuine, fail-able) | n/a | ✓ (all 8 caught, isolated) | ✓ (no paint proxy in any cell) | ✓ |
| `test/browse-render-race.test.js` / `test/browse-virtual.test.js` / `test/repaint.test.js` — collateral scroll-surface re-homes | ✓ (subject preserved) | ✓ (`#mount.scrollTop`; mount bound; capture dispatch) | ✓ (#91 reddens 3 collateral + RESTORE) | n/a | ✓ |
| `test/screens.test.js` / `test/swipe-construction.test.js` — lockstep (hide-list + F2-r browse-source ghost) | ✓ (correct lockstep) | ✓ (`#browse` added; ghostY source re-homed) | ~ | n/a | ✓ |
| `test/swipe-stage6i.test.js` — `STABLEHEIGHT` cell removed | ✓ (tested only retired `.266` pin) | ✓ (contradicts PINGONE; no live loss) | n/a | n/a | ✓ |
| `tools/mutate.mjs` — 8 new + 2 re-anchored mutations; `SOURCE_TEXT_GATES` deviation | ✓ (deviation sound — repairs a hole) | ✓ (anchors match source) | ✓ (sweep 0 uncaught; anchors 2/2) | n/a | ✓ |

No empty cells.

## Executed evidence (backs every `✓`)

```
node --test "test/*.test.js"  → # tests 748 / pass 747 / fail 0 / skipped 1
node tools/mutation-sweep.mjs 85 86 87 88   → each caught; "swept 4: 0 uncaught, 0 unapplied, 0 stale flags"; tree clean
node tools/mutation-sweep.mjs 89 90 91 92 58 83  → each caught; "swept 6: 0 uncaught, 0 unapplied, 0 stale flags"; tree clean
  (#85 BROWSEFIXED, #86 SCROLLBAR, #87 GHOSTSCROLL, #88 STRIPEXCLUDE, #89 REALIZE,
   #90 METRICS, #91 RESTORE[+3 collateral], #92 PINGONE, #58 freezeArt, #83 stage6i-home-GHOSTSCROLL)
node --test test/mutation-anchors.test.js  → 2/2 (every anchor matches source; no no-op mutant)
eslint js sw.js  → exit 0;  tsc -p jsconfig.json  → exit 0;  stamp-build --check  → all match 2026-07-29.267
git show 4ddd9e5 -- <each file>  ;  grep SOURCE_TEXT_GATES|caughtBy|gateTestsFor tools/  → only SOURCE_TEXT_GATES/behaviourTests
```
An interrupted first attempt at the 10-mutant sweep left `js/browse.js.mutbak` (an applied mutant); restored via `node tools/mutate.mjs --restore`; `git status --porcelain` empty before and after the batched re-runs. Read in full: virtuallist.js, browse.js (init/scroll-memory/virtualView), scrollbar.js, swipe.js ghostApp, nav.js setView, css `#browse`/`.app`/scrollbar rules, all 8 test cells, mutate.mjs, mutation-sweep.mjs, PolicyLedger `PL-swipe-browse-fixed-ownscroll`.

## Prediction

The build is behaviourally sound at CI and its coverage converges (a clean single sweep, no dribble). The real risk it carries is not in its findings — it is the four device gates it honestly does NOT claim: R-flash (does a fixed `#browse` truly kill the Books→Home flash, or does iOS-26 find a fresh paint on `→home`?), R-navbar (do the bars seat with NO in-flow view driving document height — the recurring `.28`/`.30` surprise, though now identical to 6i's already-proven home case), R-strip (does WebKit keep the fixed `.alphaindex` viewport-anchored under a plain `position:fixed`+`overflow` `#browse` — the load-bearing Linnaeus Q1 bet), and R-browse2browse (the slide as a fixed translateX mover with the strip riding + re-anchoring). Q1 is the one to watch: if any parking/animation rule ever leaks a `will-change`/transform onto the base `#browse`, the strip re-parents and the `.195/.196` break returns — the BROWSEFIXED source-gate is the tripwire, and it fires at CI. The pattern most likely to spread if uncorrected is the build-log file-list omission (O1): a "Files changed" list that quietly drops the mechanical stamp files trains the next reader to trust an incomplete enumeration — cheap to fix, and the stamp lockstep test is the backstop that keeps it honest regardless.

## Watch-list

Carried from POIROT-swipe-stage6i.md (open, unchanged by this build — records debt owned by Zelda, device gates owned by on-device strike; this build touches none of them):

- **[W1] [W4] [W7] [W11] [W13] [W16] [W18] open** — apply-on-approval records for stages 6b/6c/6d/6e/6f/6g/6h un-applied in HEAD. Owner Zelda.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device.
- **[W5] open** — Loki r2 lesser-planes (`recovery-overlay-visibility-unpinned`→Mendeleev; `paneless-predicate-phase-coupling`→Brunel).
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat.
- **[W8] open** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda.
- **[W9] open** — Loki 6e residual 2: unguarded `.nav-ghost === owned-pane(live session)` invariant.
- **[W10] open** — `disposeOwnedPanes`/`dropPanes` byte-identical removers; collapse on F-pane unification.
- **[W12] open** — 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Owner Mendeleev.
- **[W14] open** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device.
- **[W21] open** — a fresh Loki strike against the BUILT 6i code remains the plan's next gate. Owner Loki.
- **[W22] [W23] [W24] [W25] open** — 6i `#home` device gates R1(a) flash / R1(b) bar-seating / R1(c) nested-momentum + phantom double-scroll / R1(d,e) L5 zero-jump + abort cover-warmth. Owner on-device. (Distinct from this build's browse gates below.)
- **[W26] open** — 6i apply-on-approval records (plan §13 amendments/annotations). Owner Zelda.
- **[W28-residual] open** — pre-existing `(ghost/snapshot)` taxonomic comments (app.js:227,250,378 + subsystem doc) over-listing the now-single pane-owning kind. Owner Zelda/Brunel. Non-blocking.
- **[W29] open** — `plan.incoming` single-valued/production-unread (oracle-asserted contract field only). Owner Vitruvius. Non-blocking.

New this build:

- **[W30] open (NEW)** — R-flash: the Books→Home scroll-clamp flash is removed BY CONSTRUCTION (fixed `#browse` never drives document height), direction device-PROVEN by the `.266` probe — confirm the clean form on the scrolled Books→Home 60fps repro. Owner on-device.
- **[W31] open (NEW)** — R-navbar: the fixed bars seat with NO in-flow view driving document height (bare browse + NP-over-browse + Options-over-browse; scroll depth + rotation; transport present/absent). Strongly de-risked (identical to 6i's proven home case) but iOS-26 fixed-layer seating is the saga's recurring surprise → confirm-not-discover. Owner on-device.
- **[W32] open (NEW)** — R-strip: iOS-26 keeps the fixed `.alphaindex` viewport-anchored + un-clipped under a `position:fixed`+`overflow-y:auto` `#browse` (Linnaeus Q1 bet). BROWSEFIXED gates the source-text precondition (no will-change) at CI; the paint is device-owed. Owner on-device.
- **[W33] open (NEW)** — R-browse2browse: browse→browse rendered as a fixed translateX mover (commit + abort) — clean slide, no off-screen bleed, strip rides + re-anchors, incoming page at its restored scroll. STRIPEXCLUDE+RESTORE+GHOSTSCROLL gate the CI seams; the slide paint is device-owed. Owner on-device.
- **[W34] open (NEW)** — browse-decouple apply-on-approval records: a `DecisionLog.md` NEW-POLICY entry for `PL-swipe-browse-fixed-ownscroll` appears NOT to be present (grep found none), though the PolicyLedger entry IS present and the subsystem/plan-of-record records WERE scrubbed in-build (PLAN-stableheight-probe superseded, PLAN-swipe-reveal §2.1/§2.4, Subsystems/swipe-reveal §7/§18/§22). Owner Zelda. Non-blocking.
- **[W35] open (NEW)** — O1: the build log's "Files changed" list omits the four build-stamp files (`index.html`, `js/debug.js`, `sw.js`, `build.json`). Non-blocking records hygiene; the stamp lockstep test is the backstop. Owner Brunel/Zelda.
- **[W36] noted** — Flash C (the browse→browse in-list `letterhead`/divider re-raster) is correctly OUT of this plan and its device gate (a separate deferred track, coupling-independent). Not a defect of this build; recorded so the next reader does not read its persistence as a regression.

---

Verdict: **SHIP**

{"persona":"poirot","stage":"browse-decouple","verdict":"SHIP","prior_verdict":null,"target":"4ddd9e5","range":"d1e3568..4ddd9e5","findings":[{"id":"O1","severity":"observation","where":"Claude/Brunel/browse-decouple-build.md Files-changed","what":"build-log file list omits the 4 mechanical stamp files (index.html/debug.js/sw.js/build.json); stamps correct + guarded by stamp-check; records-completeness gap, not a code defect","blocking":false}],"virtual_list_rehome":"correct — listener capture-phase document (#89), metrics injection complete incl. viewportH with list===container and o.mount=#browse (#90), realize/anchor math symmetric with the document default (real geometry device-owed)","source_text_gates_deviation":"sound — SOURCE_TEXT_GATES excludes a whole FILE (mutation-sweep.mjs:136); no caughtBy/gateTestsFor exists; BROWSEFIXED caught as a plain mutation in the non-gated suite (#85); following the literal instruction would have dropped 7 behavioral cells from the sweep — deviation repairs a coverage hole","stableheight_removal":"justified — tested only the retired .266 pin's presence/order/clear, directly contradicts PINGONE, no live-behavior coverage lost","extra_lockstep":"all four (browse-render-race/browse-virtual/repaint/screens + swipe-construction F2-r) are correct surface re-homes, not made-to-pass; #mount bound as Browse mount in each","reanchored_mutants":"#58 freezeArt + #83 stage6i-home-GHOSTSCROLL are legit adjacency shifts, both re-verified caught, anchors 2/2","device_overclaim":"none — every CI cell asserts source/branch/DOM/fn-return; R-flash/R-navbar/R-strip/R-browse2browse + real-geometry windowing device-owed and unclaimed; Flash C correctly out of scope","mutation_sweep_rerun":true,"sweep_result":"10/10 caught, 0 uncaught, tree clean (re-run this pass)","full_suite":"748/747/0/1","lint":"clean","typecheck":"clean","stamp_check":"267 matched","return_to":"zelda"}
