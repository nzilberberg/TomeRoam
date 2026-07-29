# MENDELEEV — Stage 6i coverage audit (fixed own-scroll `#home` slide-and-leave)

Type: coverage-audit (publish gate — the now-green suite swept against the plan's Coverage Model)
Target: immutable HEAD `2f1e094` ("Poirot 6i re-review: SHIP"), build .264; the build lands at `e6e7666`.
Plan of record: `Claude/Plans/PLAN-swipe-noswap-home.md` (PLAN_READY, Charpy FORGE + Loki HELD_STONE), §10 Coverage Model + the `vitruvius-coverage` cell block.
Suite audited: `test/swipe-stage6i.test.js` (7 cells: SNAPSHOTGONE, SCOPE, ABORT, PTR, SCROLLBAR, GHOSTSCROLL, HOMEFIXED) + the lockstep-edited suites (`swipe-stage6e`, `swipe-construction`, `transition-matrix`, `swipe-model`, `nav`, `swipe-transition`, `contract-function-gate`, `policy-ledger-gate`).
Mutation registry: `tools/mutate.mjs` #77–84 (8 new); anchor gate `test/mutation-anchors.test.js`; sweep `tools/mutation-sweep.mjs`.
Inputs read: Curie `RED-swipe-stage6i.md` (RED_SUITE_READY, Notes A/B, device-owed list), Poirot `POIROT-swipe-stage6i.md` (SHIP, Findings 1/2 fixed, removed-mutant + sweep-hygiene rulings), the plan §3–§13, the built `js/swipe.js`/`js/app.js`/`js/nav.js`/`js/scrollbar.js`/`css/app.css`.
Date: 2026-07-28.

`Verdict: **ADEQUATE**` — every applicable cell of the §10 Coverage Model is non-vacuously swept on a real, jsdom-observable channel (pane count, `.parked`/`hidden` class state, inline mover transform, the fake-timer pending ledger + held-session accessor, the pull-indicator transform, `surfaceKind`'s return, the captured ghost-offset VALUE, and a CSS source-text match), each pinned by a registered mutation that is CAUGHT this pass (sweep exit 0, 0 uncaught), the five device gates R1(a–e) are honestly excluded from CI with nothing device-only smuggled in as CI-covered, the removed `swipe5 F2-r-wiring` mutant leaves no coverage hole (its class is dead-by-construction and still guarded), the `no-mutbak-gate.test.js` sweep-exclusion discriminates no production mutant and still runs in `npm test`, and the lockstep suites carry the new pane-less `browse→home` ownership truth.

---

## Executed evidence (this pass, independent of Curie/Brunel/Poirot)

- `node --test test/swipe-stage6i.test.js` → **7 pass / 0 fail**.
- `node --test "test/*.test.js"` → **740 / 739 pass / 0 fail / 1 skip** (the device-only KEEPER) — includes every lockstep suite; all green.
- `node --test test/mutation-anchors.test.js` → **2 pass / 0 fail** (every rewritten mutation FROM-string matches source — no rotted/no-op mutant across the whole 85-mutant registry).
- `node tools/mutation-sweep.mjs 77 78 79 80 81 82 83 84` → **all 8 `caught`; swept 8: 0 uncaught, 0 unapplied, 0 stale flags**. Per-mutant: #77 caught(1), #78 caught(3 — SNAPSHOTGONE+ABORT+DP.browse-home), #79 caught(1), #80 caught(4), #81 caught(1), #82 caught(2), #83 caught(1), #84 caught(1).
- Sweep hygiene: post-sweep `find . -name '*.mutbak'` → EMPTY; `node tools/hooks/no-mutbak-check.mjs` → exit 0; `git status --porcelain` → clean.
- Registry total: `tools/mutate.mjs` exports **85** mutants; the 8 stage6i are indices 77–84.
- Read: `constructionPlanFor` →home branch (swipe.js:149-158), `ghostApp` source-aware offset (swipe.js:273-288), the two `d.ghostY` reader null-guards (app.js:1105, 1154) + the always-true `'ghostY' in c.capture` (app.js:549), `env.renderDestination` home-host un-park (app.js), pull-to-refresh both gates (app.js:1305,1313), `surfaceKind` (scrollbar.js:47), `#home` fixed rule (css), the SOURCE_TEXT_GATES table (mutation-sweep.mjs:119-136), and the F2-r-wiring removal comments (mutate.mjs; swipe-construction.test.js:170-193).

## Phase 1/2 — The map: §10 dimensions crossed with the contract, fixed before the sweep

The §10 Coverage Model enumerates 19 dimensions. The Mendeleev catalog dimension for each is checked; every applicable dimension resolves to a cell or an honest device/spec-level disposition with a stated reason. No dimension is silently dropped.

## Coverage matrix — the seven CI cells (all swept)

| Cell | Promised behavior (§10) | Observable channel (non-vacuous) | Registered mutant | Caught? |
|---|---|---|---|---|
| SNAPSHOTGONE | `browse→home` builds NO home-snapshot pane; real fixed `#home` is the un-parked incoming mover left at `translateX(0)`; real `#browse` is the borrowed-real outgoing, never `display:none`'d mid-drag | `ghosts()===0`; `#home` `!parked` + non-empty inline `transform` mid-drag; `#browse` `!hidden` mid-drag; post-commit `#home` un-parked, `#browse` hidden | #78 (home-host never un-parks) | ✓ (3 failing) |
| SCOPE | the `→home` scroll-settle gate deleted: no `SETTLE_MS(100)` timer queued, no held reveal past finalize | fake-timer `pendingDump().filter(ms===100)===[]`; `PBSwipeSession()===null` (owner released) | #79 (reinstate the held-reveal branch) | ✓ (1 failing) |
| ABORT | aborted `browse→home` re-parks fixed `#home`, restores `#browse` shown, restores start scroll | mid-drag `!parked` precondition; post-abort `parked===true`, `#browse !hidden`, `window.scrollTo` count increased | #80 (setView stops re-parking) | ✓ (4 failing) |
| PTR | pull-to-refresh gates on `#home.scrollTop`, not `window.scrollY` | `#ptr` transform stays `''` when `#home.scrollTop=500` & `window.scrollY=0` | #81 (revert BOTH gates to `window.scrollY`) | ✓ (1 failing) |
| SCROLLBAR | the fixed own-scroll `#home` is a supported scrollbar surface | `ScrollBar._test.surfaceKind(#home) != null` | #82 (surfaceKind drops `#home`) | ✓ (2 failing) |
| GHOSTSCROLL | outgoing app-ghost of a scrolled HOME source reads its offset from `#home.scrollTop` (SOURCE branch only) | `capture.ghostY===500`; clone `transform==='translateY(-500px)'` | #83 (revert home source to `window.scrollY`) | ✓ (1 failing) |
| HOMEFIXED | the active `#home` rule is `position:fixed` + `overflow-y:auto` | CSS source-text match on the `#home {…}` rule body | #84 (drop `position:fixed`/`overflow-y`) | ✓ (1 failing) |

Every cell fails-by-construction at HEAD (Curie's red-run) and is caught by an EXECUTED mutant this pass. The CONTRACT mutant #77 (the 8th) is audited separately below.

## Item 1 — every §4/§9/§10 behavior has a cell or an honest disposition (NO bare cells)

- **2-row `→home` incoming enum** (`home-snapshot`→`real-destination`, renderDestination→`home-host`) — `browse→home` integration is SNAPSHOTGONE (#78); the frozen contract-VALUE change is #77 via the independent oracle `swipe-transition`; `overlay→home` shares the identical `toKind==='home'` branch (both rows resolve to `home-host`, `outgoing:'real-source'`), covered at spec-level by frozen row 59 + descriptor-coverage gate. §13 F8 discloses `overlay→home` as spec-level-only, not integration. **Not bare** — the integration code path is the same one SNAPSHOTGONE exercises; the disclosure is honest.
- **L5 source-aware ghost offset (home vs browse source)** — home-source branch is GHOSTSCROLL (#83, asserts value 500 + clone `translateY(-500px)`). The browse-source else-branch (`env.scrollY()`) is UNCHANGED behavior and stays guarded by `swipe-construction.test.js:186` (`ghost.capture.ghostY===137` for an in-flow source). **Not bare.**
- **Scroll re-homing L1 (PTR→`#home.scrollTop`)** — PTR cell (#81, two-part both gates; the single-gate revert is correctly UNCAUGHT because the disarm gate wins first, per plan §9 L1 and Poirot). **Not bare.**
- **Scroll re-homing L2 (scrollbar `#home` surface)** — SCROLLBAR asserts the DECISION point (`surfaceKind` returns non-null for `#home`, #82). `metrics()` reading `#home.scrollTop/scrollHeight/clientHeight` is NOT CI-asserted — Curie discloses it is un-exported and jsdom does no layout, so a metrics cell would be VACUOUSLY GREEN. **Not bare** — the decision is covered; the arithmetic is genuinely unobservable in CI (correct per the vacuous-green scar), and no real CI assertion was possible.
- **Deletions** (snapshotHome / home-snapshot outcome / the 6h `→home` scroll-settle gate) — SNAPSHOTGONE (no snapshot pane), SCOPE (no settle timer, no held reveal), CONTRACT (#77, `home-snapshot` gone from the value domain via the oracle). Grep-clean of dangling `SETTLE_MS/scrollSettle/revealScrollEnd/settled/snapshotHome/home-tall` in `js/*` (Poirot-executed). **Not bare.**
- **`paneKindOf(→home)`→`'none'`** — the arm was simplified to `p.length ? 'ghost' : 'none'` (dead `'snapshot'` arm removed, Finding 2). Both arms are behaviorally discriminated: `swipe-stage6e` DP.browse-browse (`ghosts===1`, the `'ghost'` arm) vs DP.browse-home (`ghosts===0`, the `'none'` arm). No new decision point, no dedicated mutant needed. **Not bare** — the consequence is exercised cross-suite.
- **Fixed-`#home` CSS** — HOMEFIXED source-text (#84) + device R1(a/b/c). **Not bare** (the paints are device-owed, correctly).
- **N1 abort `scroll0` phantom-restore** — plan §9 states it is BENIGN (no re-home needed; `#home.scrollTop` self-persists). ABORT asserts the document-restore `window.scrollTo` fires (the browse-path behavior). No bare cell — a stated no-op-on-home decision.

## Item 2 — R1(a–e) DISCLOSED, nothing device-only smuggled as CI-covered

R1(a) carousel flash, R1(b) bar seating, R1(c) nested-scroll momentum + phantom double-scroll, R1(d) the L5 on-screen zero-jump, R1(e) `browse→home` abort cover-warmth + no-`#browse`-demote — all five are disclosed as device-owed in: plan §10 "External side effects (device)" row, §11 risk registry, §13; Curie RED "Device-only cells"; the test-file header; Poirot "No CI cell overclaims a device outcome — CONFIRMED". Independently verified no CI cell reads a paint: SNAPSHOTGONE/ABORT assert DOM class/pane/scroll state; SCOPE asserts the timer-queue + session accessor; PTR asserts the indicator transform (a set style, not a rendered position); SCROLLBAR asserts a function return; GHOSTSCROLL asserts the captured offset VALUE (500) — explicitly not the on-screen jump; HOMEFIXED is source-text. **Nothing device-only is claimed CI-covered, and no CI cell is bare where a real CI assertion was possible** — every mechanism decision point carries a fail-able assertion + a caught mutant.

## Item 3 — removed mutant + sweep-exclusion open NO coverage hole

- **Removed `swipe5 F2-r-wiring`.** Independently confirmed the defect is dead-by-construction: the only ghostY-less capture (`home-snapshot`) is deleted; every surviving capture is an app-ghost that ALWAYS carries `ghostY` (swipe.js:288), so the guarded conditional (`'ghostY' in c.capture`, app.js:549) is now permanently true and both mutation forms assign identically — uncatchable, correctly removed (keeping it would report a permanent false UNCAUGHT). The CLASS stays guarded: `→home` builds `capture===null` (asserted `swipe-construction.test.js:193`), and both `d.ghostY` readers null-guard (app.js:1105 `ghostY == null ? '?' : …`; app.js:1154 `(cur.ghostY == null) ? null : …`), so a null `→home` capture cannot leak a stale `ghostY`. **No hole.**
- **`no-mutbak-gate.test.js` in SOURCE_TEXT_GATES.** Independently confirmed: `grep no-mutbak|run-checks|hooks/ tools/mutate.mjs` → EMPTY, so NO registered mutant targets `no-mutbak-check.mjs` or `run-checks.mjs` — the test discriminates no production mutant; excluding it from the SWEEP loses zero coverage. It fails-for-all mid-sweep only because the sweep leaves a transient `*.mutbak` (the CLI exits 1 on any non-clean repo) — the same false-CAUGHT class as `mutation-anchors`. It STILL runs in `npm test` (present in the 740-test green run). `behaviourTests()` self-guards (exits if a named gate no longer exists, mutation-sweep.mjs:130-134). **No hole.**

## Item 4 — lockstep suites carry the new pane-less ownership truth (ADEQUATE)

After `browse→home` went pane-owning→pane-LESS, the ownership assertions were UPDATED, not weakened:
- `swipe-stage6e` DP.browse-home (line 266): now asserts `ghosts===0` (pane-less), `#home` un-parked mid-drag, `disposeOwnedPanes` no-ops, `#home` re-parked on recovery. BR (line 301): asserts BOTH borrowed-real movers (`#browse` outgoing, `#home` incoming) SURVIVE supersession — the invariant now demonstrated on both, not one. DP.browse-browse (line 241) retains the `ghosts===1` owned-pane path — the `'ghost'` arm still covered.
- `swipe-construction` F2-r (line 180): rewritten to assert `browse→home` builds no owned pane (`capture===null`), and F1c (line 174) covers the capture-null class; the browse-source ghostY recipe stays asserted (line 186).
- `transition-matrix`, `swipe-model`, `swipe-transition` parity + `contract-function-gate` + `descriptor-coverage-gate` + `policy-ledger-gate`: all green in the full run; the `→home` values and generated inventories re-point in lockstep. `nav.test.js` retired the two `home-tall` assertions (not inverted) so no stale assertion reddens for the wrong reason. **No assertion weakened or removed leaving a gap.**

## Item 5 — mutation spot-check + decision-point coverage

Bounded sweep of the 8 new mutants (77–84) → all caught, 0 uncaught. The new code's decision points each carry a mutant: the `→home` construction branch (#77 value / #78 un-park), the SCOPE gate deletion (#79), the ABORT re-park (#80), PTR both gates (#81), the scrollbar surface (#82), the ghost source branch (#83), the fixed-`#home` rule (#84). No obvious unmutated new branch: the buildConstruction incoming `if/else` was collapsed to one line (O4, no branch left); `paneKindOf`'s remaining `'ghost'|'none'` split is behaviorally discriminated by the two DP cells. `mutation-anchors` 2/2 confirms no no-op mutant across the whole 85. The build's "85 / 0-uncaught" is corroborated for the stage6i indices by direct re-run; the full-85 sweep was not re-run (bounded execution), consistent with Poirot's stated boundary.

## Phase 6 — forward read

The CI suite spans its CI-checkable contract completely; the residual risk is entirely in the device tier the plan honestly fences off. If a bug reaches a user, it lands in R1(a) — hypothesis (ii), the parked→`translateX(0)` transform-clear on `#home`'s own `will-change` layer re-rastering the descendant carousels — which the design removes hypothesis (i) but not (ii), and which no CI cell can see. The build claims nothing there. The one coverage-adjacent watch is `metrics()` correctness (SCROLLBAR asserts only `surfaceKind`): if a future change breaks `#home` scroll arithmetic, no CI cell catches it — but it is unobservable in jsdom and correctly device/build-owed, not a bare CI cell.

## Handoff

- **Source artifact:** this audit (`Claude/Mendeleev/AUDIT-swipe-stage6i.md`).
- **Verdict / status:** ADEQUATE. Publish gate cleared on the CI-checkable contract; the flash verdict remains device-gated (R1(a)), disclosed, not a coverage gap.
- **Decisions made:** the removed `F2-r-wiring` mutant and the `no-mutbak-gate` sweep-exclusion open no hole (independently confirmed); the pane-less `browse→home` ownership truth is carried by the lockstep suites.
- **Open questions:** none for coverage. The device gates R1(a–e) are Loki/device-strike downstream (W21–W25), not Mendeleev's.
- **Graduated lesson (from Poirot W27):** a mutation registry's named "intended failing test" must be the test that actually reddens the cell; an audit reconciles named-guard vs actual-guard. Applied here: #77's name was reconciled to its true oracle guard, and #78 confirmed as SNAPSHOTGONE's behavioral guard.
- **Next owner:** Loki (fresh strike against the BUILT 6i code, W21) + on-device strike (R1(a–e)).
- **Records updated:** this case file filed.

VERDICT: ADEQUATE
