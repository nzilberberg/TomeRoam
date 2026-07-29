# PLAN — Swipe/reveal: eliminate the books→home commit SCROLL CLAMP (the device-confirmed driver of the persisting home-carousel flash) by resetting the window scroll to 0 BEFORE the outgoing `#browse` is `display:none`'d — a one-placement fix on top of shipped Stage 6i (fixed `#home` KEPT)

Type: plan

<!-- vitruvius-gate {"plan_type":"targeted-fix","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false}} -->

Status: **PLAN_READY — hand to Charpy.** Stage 6i (fixed own-scroll `#home`, no-snapshot construction) shipped `.264` and the books→home flash PERSISTS. It is now DEVICE-CONFIRMED as a different mechanism than 6i targeted: a compositor re-raster of the fixed `#home` carousel layers driven by the **scroll CLAMP** — committing books→home `display:none`'s the scrolled, tall (14676px) in-flow `#browse`, the document collapses 14676→895, the browser auto-clamps `window.scrollY` 11247→43 in one frame, and iOS recomposites the page (Linnaeus `PROBE-artrelease-reveal-2026-07-28.md`, `b783c65`: the `released=35`/`src 17→0` signals were the departing BOOKS virtual list — a red herring; home carousels are not virtualized and released nothing). The device oracle is reliable and deterministic: **books→home flashes ONLY when books is scrolled down; from the TOP it is CLEAN** — and the top-clean case IS a collapse WITHOUT a clamp (`window.scrollY` already 0 ≤ the new max). The fix reduces the scrolled case to the proven-clean top case: reset `window.scrollTo(0, 0)` BEFORE `setView` hides `#browse`, while `#browse` is still tall (so the scroll is valid, not a clamp) and while the opaque fixed `#home` (css:130) already covers the viewport (so the scroll is invisible). Fixed `#home` is KEPT — it is not load-bearing for this fix, but reverting it (re-adding the snapshot+hold machinery two Loki-KILLs deleted) is major churn with no benefit, and it provides the clean no-snapshot base on which this fix is a single call. The flash stays DEVICE-owed to confirm, but the oracle is a deterministic on/off test.

## Index
1. Defining records and authority (the diagnosis, the oracle, the shipped code)
2. Scope — the one-placement change; what stays byte-identical
3. The design — pre-empt the clamp (reset the window scroll before the collapse)
4. Ordering — the load-bearing sequencing (U8)
5. The fixed-`#home` KEEP decision (and the revert cost)
6. Options weighed (option 1 chosen; option 2 the alternative)
7. Coverage Model + the CLAMP CI cell + the device gate
8. Risk registry
9. Handoff

## Applicability

Machine-readable declaration above. This is a TARGETED FIX — a single synchronous `window.scrollTo(0, 0)` inserted into the existing `→home` `setView` sequence, before an existing `display:none`. Per-pattern reason (all **false**):
- **boundary_relocation: false** — no runtime value's ownership crosses a new module seam; nothing moves between modules.
- **callee_replacement: false** — no callback/interface/indirection replaces direct logic; one scroll call is added.
- **contract_shape: false** — no classification/plan/schema/state-output changes.
- **state_transfer: false** — no runtime resource's ownership crosses a seam.
- **async_change: false** — the change is SYNCHRONOUS (a `scrollTo` inside `setView`, before the synchronous `display:none`); no listener, timer, promise, or gate is added. The load-bearing SEQUENCING (scroll before collapse) is intra-function and synchronous — addressed in §4 (U8), which does not require the async machinery.
- **persistence_migration: false** — nothing persisted.
- **lifecycle_ownership: false** — no resource lifecycle changes.

All-false → the trivial-plan exemption: no `vitruvius-*` machine blocks. The Coverage Model is authored in prose (§7) per Vitruvius Phase 3, with one CI mechanism cell and the device gate.

## 1. Defining records and authority

**Verdict: the device oracle + Linnaeus `PROBE-artrelease-reveal` AGREE on the mechanism (scroll clamp) and rule out the alternatives; the shipped `.264` code is verified; NO record conflict; the only underived residual is the device confirmation, which the reliable oracle settles.** Precedence (EC §2): (1) the corrected assignment (eliminate the clamp; decide fixed-`#home` keep/revert); (2) the device oracle (scrolled-flashes / top-clean, re-confirmed on `.264`); (3) verified HEAD `.264` source; (4) Linnaeus `PROBE-artrelease-reveal-2026-07-28.md` + `PROBE-home-scroll-surface`.

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| Device oracle (`.264`, re-confirmed) | books→home flashes ONLY when books is scrolled down; from the TOP it is CLEAN. | Device measurement (deterministic on/off) | GOVERNS both the diagnosis and the fix's efficacy. A scroll clamp is scroll-DEPENDENT; a transform-demote would not be → this CONFIRMS the clamp and RULES OUT the incoming `#home` slide-transform demote (Linnaeus §5 candidate 2). The fix reduces the scrolled case to the top-clean case, so the oracle predicts it clean. | The device gate is a single clean scrolled books→home commit (§7). |
| `Claude/Linnaeus/PROBE-artrelease-reveal-2026-07-28.md` Q1–Q4/§5 | The flash is a compositor re-raster of already-present home carousel layers — NOT art-release (`released=35` is the departing BOOKS list, `home not virtualized`, Q1), NOT scroll-realize (carousels insulated on the fixed `#home`, Q4), NOT re-fetch/re-fade (`loaded=0/FADED=0`, Q4). Driver = the OUTGOING `#browse` `display:none` collapsing the document 14676→895 and clamping `window.scrollY` 11247→43 (Q3). Fixed-`#home` never touched the outgoing collapse. | Deriver (source + device log) | GOVERNS the target: eliminate the outgoing `#browse`-collapse CLAMP. The two §5 candidates were (1) the collapse recomposite and (2) the slide-transform demote; the oracle's scroll-dependence selects (1) and rules out (2). | Annotate the probe as realized (§9). |
| `js/nav.js` `setView` (44-85) + `applyScreen` (117-143) | `setView('home')` runs `browseEl.classList.toggle('hidden', v !== 'browse')` (nav.js:64) → `#browse` `display:none` → collapse+clamp. Stage 6i RETIRED the old `window.scrollTo(0,1)`; home entry now resets only `#home`'s OWN scroll (`$('home').scrollTop = 0`, nav.js:130) — the DOCUMENT/window scroll is NEVER reset before the collapse. `browseWillHide()` (nav.js:63) runs before the hide (deactivates the browse virtual controller + captures its anchor at real geometry). | Code under change | ADD `window.scrollTo(0, 0)` in `setView`, AFTER `browseWillHide()` (nav.js:63) and BEFORE the `#browse` `display:none` (nav.js:64), on the `→home` hide path. This pre-empts the clamp. The old retired `scrollTo(0,1)` was in `applyScreen` AFTER `setView` (i.e., AFTER the collapse — too late); the fix's whole content is the correct PLACEMENT (before the collapse). §3/§4. | Edit nav.js:56-64 block (§3). |
| `css/app.css` `#home` (123-133) | Active `#home` is `position:fixed; z-index:20; overflow-y:auto; background: var(--page-bg)` (css:123-130) — an OPAQUE fixed box that "fully occludes `#browse`" (css:117-118). A `position:fixed` box is viewport-anchored (the window-scroll clamp does not move it — Linnaeus Q4). | Production interface (verified) | UNCHANGED. Two facts make the pre-emptive scroll INVISIBLE and SAFE: (a) `#home`'s opaque bg + z20 cover `#browse` (behind it) throughout the commit, so scrolling the off-screen `#browse` to 0 shows nothing; (b) `#home` is fixed, so a window scroll does not move it or re-raster its carousel layers (fixed layers do not re-raster on scroll). | — |
| `js/app.js` finalize `→home` commit (785-787, 1221-1222) | At `runFinalize` the mover transforms are cleared (`m.el.style.transform = ''`, app.js:787) → `#home` rests fixed at `translateX(0)` (opaque, covering); `#browse` rests in-flow at `translateX(0)` (tall, scroll 11247, behind `#home`); then `applyScreen(dest,{render:false})` (app.js:1222) → `setView('home')` → the collapse. The 6i special commit→home hold branch is DELETED (app.js:762 comment: "`cur.dest.v === 'home'` can never coincide with an owned pane now"). | Code under change (read-only) | UNCHANGED — the fix is in `setView`, so it fires on the swipe-commit path (via `applyScreen`) AND the button-nav-to-home path (also `applyScreen`→`setView`), both of which clamp. No app.js edit. | — |
| `Claude/Linnaeus/PROBE-home-scroll-surface` D1/Q4 | Active `#home` is decoupled from the document scroll (own `overflow-y:auto`); the window/document scroll no longer positions home content. | Deriver | Grounds that resetting the WINDOW scroll to 0 is HARMLESS to home's display (home uses `#home.scrollTop`, reset separately at nav.js:130) — the window scroll is now a pure clamp-surface, free to zero before the collapse. | — |
| `EngineeringContract.md` §4.21 (narrow scope), §4.7 (assert intermediate states), §2 (precedence) | Fix the invariant without redesigning adjacent systems; assert both sides of a before/after boundary. | Core rules | The change is one call in one function; the CLAMP CI cell asserts the scroll reset happens BEFORE the `#browse` hide (both sides of the ordering); no adjacent redesign. | Register the CLAMP cell (§7, §9). |

**Authority precedence.** The device oracle governs the diagnosis and the efficacy claim; Linnaeus governs the mechanism (the outgoing `#browse` collapse clamp); the verified `.264` source governs the placement (the collapse is at nav.js:64, the window scroll is unset before it); no two sources conflict. The one superseded idea (fixed-`#home` would fix the flash by insulating the carousels) is corrected by Linnaeus Q4: the carousels ARE insulated yet still re-raster on the clamp recomposite — so the clamp itself must be removed (§5).

## 2. Scope — the one-placement change; what stays byte-identical

**Changes (production, `js/nav.js` `setView`, the `!npOpen && !optOpen && !subOpen` block, ~56-64):** insert `window.scrollTo(0, 0)` AFTER the `browseWillHide()` call (nav.js:63) and BEFORE the `#browse` `display:none` toggle (nav.js:64), on the path where `#browse` is being hidden to show home (`v === 'home'` and `#browse` currently shown). Nothing else changes.

**Stays byte-identical (do NOT re-touch):**
- `#home` fixed own-scroll geometry + opaque background (css:123-133) — KEPT (§5); it is what makes the pre-emptive scroll invisible.
- `$('home').scrollTop = 0` (nav.js:130) — home's OWN scroll reset on entry, unchanged (it resets `#home`'s content, orthogonal to the window/document scroll this fix zeroes).
- `browseWillHide()` (nav.js:63) — the anchor capture + controller deactivate stays BEFORE the new scroll (so the browse anchor is captured at the real scroll and the deactivated controller does not churn on the pre-emptive scroll — §4).
- The `→home` construction (real fixed `#home` incoming, real `#browse` outgoing — shipped 6i), the finalize/abort paths, `app.js` — UNCHANGED.
- The generalized `.app` min-height runway (css:73) that seats the fixed bars — UNCHANGED.

**Split across the seam:** none. One function gains one call before an existing call.

**Deferred:** nothing new; the incoming `#home` slide-transform demote (Linnaeus §5 candidate 2) is RULED OUT by the scroll-dependence oracle, so it is not chased here.

## 3. The design — pre-empt the clamp (reset the window scroll before the collapse)

**The mechanism.** The flash is the compositor recomposite forced by the window-scroll CLAMP that accompanies the document collapse: `display:none` of the tall (14676) scrolled (11247) in-flow `#browse` shrinks the document to 895, and the browser clamps `window.scrollY` 11247→43 in the same frame — iOS recomposites the page and re-rasters the fixed `#home` carousel sublayers. **If `window.scrollY` is already 0 when `#browse` is hidden, there is NO clamp** (0 ≤ the new max), and the collapse is exactly the device-confirmed TOP-CLEAN case — a height change with no scroll jump, which does not flash.

**The fix.** Reset `window.scrollTo(0, 0)` BEFORE the `#browse` `display:none`, while:
- `#browse` is still TALL (14676) — so the scroll to 0 is a VALID scroll within range, not itself a clamp (grounded: Linnaeus attributes the collapse to the `display:none` at nav.js:64, and `browseWillHide` does not collapse `#browse`'s height — the log shows `finalize=…/14676` still tall after it);
- the opaque fixed `#home` (css:130, z20, `background: var(--page-bg)`) already COVERS the viewport (grounded: at commit the mover transforms are cleared, app.js:787, so `#home` rests at `translateX(0)` opaque over the in-flow `#browse` behind it; on button-nav, `setView` un-parks `#home` at nav.js:57 before the hide at nav.js:64) — so the off-screen `#browse` scrolling to its top is INVISIBLE;
- `#home` is FIXED — a window scroll does not move it or re-raster its carousel layers (fixed layers are viewport-anchored and do not re-raster on document scroll, Linnaeus Q4).

Then `setView` `display:none`'s `#browse`: the document collapses 14676→895 with `window.scrollY` already 0 → no clamp → no recomposite → no carousel re-raster. The scrolled case now behaves as the top-clean case.

**Why this is not the retired `scrollTo(0,1)`.** 6i retired `window.scrollTo(0,1)` (formerly in `applyScreen`, AFTER `setView` — i.e., AFTER the collapse, which is why it never pre-empted the clamp) because home no longer needs a document-scroll seating position (it is fixed own-scroll). The new call is a CLAMP PRE-EMPTION placed BEFORE the collapse, for a different purpose; it reads `window` (the pure clamp-surface), not home's layout.

## 4. Ordering — the load-bearing sequencing (U8)

The correctness of this fix is entirely its ORDER within `setView` (a synchronous sequence; no async):

1. **`browseWillHide()` (nav.js:63) MUST precede the new scroll.** It captures the browse virtual-list anchor from real geometry (at scroll 11247, for correct re-entry restore) and DEACTIVATES the controller. Doing it first means the subsequent `window.scrollTo(0,0)` (a) does not corrupt the captured anchor, and (b) fires `onDocScroll` on a DEACTIVATED controller, which early-returns (`isVisible()` guard, virtuallist.js:145-146) → no virtual-list churn from the pre-emptive scroll. *(Grounding to confirm at build: that `browseWillHide` deactivates the controller before the scroll; if it does not, the pre-emptive scroll would realize top rows — benign off-screen churn, not a correctness fault, but the ordering is chosen to avoid even that.)*
2. **`window.scrollTo(0, 0)` MUST precede the `#browse` `display:none` (nav.js:64).** This is the whole fix: the scroll must be 0 BEFORE the collapse so the collapse forces no clamp. A scroll placed AFTER the hide (the retired `scrollTo(0,1)` position) is too late — the clamp already fired.
3. **The `#browse` `display:none` (nav.js:64) then collapses the document with the scroll already 0** — no clamp.

This is a correctness ordering (a wrong order re-introduces the flash), not an incidental one. It is intra-function and synchronous, so no async/lifecycle machinery is needed; it is pinned by the CLAMP CI cell (§7), which asserts the scroll reset is observed BEFORE the `#browse` hide.

## 5. The fixed-`#home` KEEP decision (and the revert cost)

**Decision: KEEP fixed-`#home` (shipped 6i).** Honest accounting:
- **Fixed-`#home` did NOT fix the flash, and its core rationale FAILED on device.** 6i made `#home` fixed/own-scroll to insulate the carousels from the document scroll; Linnaeus Q4 confirms they ARE insulated — yet they STILL re-raster on the clamp's recomposite. So insulation was not sufficient; the clamp itself is the driver, untouched by 6i. This was two Loki-KILLs of complexity for a change orthogonal to the actual flash cause. Stated plainly.
- **It is NOT load-bearing for this clamp fix.** The `window.scrollTo(0,0)`-before-collapse fix would work on the pre-6i (in-flow `#home` + snapshot) architecture too — the scroll reset would sit under the snapshot cover before the collapse. Efficacy does not depend on `#home` being fixed.
- **But reverting is major churn with NO benefit, and the clamp fix is CLEANER with fixed-`#home` kept, not without it.** Reverting fixed-`#home` means re-adding the `home-snapshot` builder + the held cover-drop + the 6h scroll-settle gate (all deleted in 6i), and re-homing pull-to-refresh / the scrollbar / navbar-seating back to the document scroll — undoing two KILLs' worth of work. And the clamp fix would then have to run under a re-introduced snapshot cover. So "the clamp fix cleaner without fixed-`#home`" is FALSE: keeping fixed-`#home` gives a clean no-snapshot base where the fix is one `scrollTo`; reverting adds the snapshot machinery back AND the `scrollTo`. Keep it.
- **It earns its place going forward.** With the clamp eliminated, there is no scroll change to insulate from — but fixed-`#home` still provides the no-snapshot reveal (the reveal machinery is simpler), the opaque fixed `#home` is exactly what makes the pre-emptive scroll invisible, and home's scroll decoupling is a genuine architectural improvement. The sunk complexity is not recovered by reverting; it is left in place where it now costs nothing and hosts the fix.

## 6. Options weighed (option 1 chosen; option 2 the alternative)

- **Option 1 — reset the window scroll to 0 before the collapse (CHOSEN).** One `window.scrollTo(0,0)` in `setView` before the `#browse` hide. **Blast radius: minimal** (one call in one function). **Efficacy: strongest possible grounding** — it reduces the scrolled case to the device-confirmed top-clean case (a collapse without a clamp), which the oracle proves clean; the only new operation (the pre-emptive scroll) is invisible (behind the opaque fixed `#home`) and does not re-raster a fixed layer. Chosen.
- **Option 2 — keep the document height stable across the `#browse` hide (a spacer / retained min-height, so hiding `#browse` does not shrink the document, so `window.scrollY` never clamps).** Fixed-`#home` DOES cheapen this (a tall empty document behind the fixed opaque `#home` is invisible). **Blast radius: larger** — a spacer element (or a dynamic `.app` min-height matching the departing `#browse` height) that must be created at hide and torn down on the next navigation; new state and a lifecycle. It also leaves the document artificially tall while home is active. It removes the clamp equally well, but at more cost. **Rejected as primary; recorded as the fallback** if option 1's pre-emptive scroll proves to itself flash on device (it should not — §8 R1) or interacts badly with the browse anchor.
- **Option 3 — do not `display:none` `#browse` (leave it rendered behind the fixed `#home`).** Rejected: leaves the browse virtual list active/rendered indefinitely (memory, background work) and only defers the collapse; not simpler than option 1.

## 7. Coverage Model + the CLAMP CI cell + the device gate

Mendeleev catalog (only the applicable dimensions; the change is one synchronous call):
- **Ordering (applicable):** the window scroll is reset to 0 BEFORE `#browse` is `display:none`'d on the `→home` path — asserted both sides (scroll reset observed; then the hide). The CLAMP cell.
- **Composition (applicable):** the reset composes with `browseWillHide` (runs first, unchanged) and the existing `#browse` hide (runs after). The CLAMP cell drives the real `setView`.
- **External side effect (device):** the flash going clean — the reliable scrolled-books→home on/off oracle (device gate below), explicitly NOT a CI cell.
- **Lifecycle / Identities / Async / Persistence / Recovery / Contract / Concurrency: N/A** — no resource, id, async surface, persistence, recovery authority, contract, or concurrency changes (one synchronous scroll call).
- **Known-red: N/A** — none introduced.

**The CLAMP CI cell (harness-observable; Curie authors it).**
- **Behavior:** on a commit `books→home` (and a button-nav `→home`) with the window scrolled down and a tall `#browse`, the window scroll is reset to 0 BEFORE `#browse` is hidden — so the collapse forces no clamp.
- **Fixture / channel:** the app-harness drives the real `→home` (via `h.touch` commit, and via the real nav action); spy `window.scrollTo`; assert `scrollTo(0, 0)` was called AND that it was called BEFORE `#browse` received `display:none` (the `hidden` class toggle) — the ordering, observable in jsdom without layout (jsdom's `scrollTo` is a no-op on `scrollY`, so assert on the CALL + order, not a measured `scrollY`).
- **Mutation (EC §4.10):** move the `window.scrollTo(0,0)` to AFTER the `#browse` hide (the retired-position), or remove it → the "reset observed before the hide" assertion reddens (a misordering/omission, the exact defect this fix corrects).
- **Layer:** integration (real `setView` ordering).

**The device gate (the flash itself — device-owed, reliable oracle).** A single scrolled `books→home` commit on device: scroll books down, commit back to home, observe NO carousel flash; from the top it is clean either way. This is the deterministic on/off oracle the coordinator names. The flash is NOT called fixed until this passes. (Per the project's device-owed discipline; a CI cell cannot observe the compositor re-raster — jsdom does no layout.)

## 8. Risk registry

- **R1 — does the pre-emptive `window.scrollTo(0,0)` ITSELF flash?** Device-only, but strongly grounded against: (a) the scroll happens while the opaque fixed `#home` (css:130, z20) fully covers the viewport, so the off-screen `#browse` scrolling to its top is invisible; (b) `#home` is `position:fixed` (viewport-anchored), and a window/document scroll does not move a fixed box or re-raster its layers (Linnaeus Q4 — the clamp did not move `#home`); (c) the target state (scroll 0) is the device-confirmed CLEAN state. So the pre-emptive scroll is a normal in-range document scroll of an occluded element, not a clamp. The device gate confirms. Fallback if it does flash: option 2 (stable-height document, §6).
- **R2 — the pre-emptive scroll churns the browse virtual list.** Mitigation: it is placed AFTER `browseWillHide()` (nav.js:63), which deactivates the controller and captures its anchor first, so `onDocScroll` early-returns on the deactivated controller (no realize) and the anchor is captured at the real scroll for correct re-entry (§4). Even if `browseWillHide` did not deactivate, the churn is benign off-screen books teardown (Linnaeus Q1) — not a correctness fault.
- **R3 — a `→home` path that does not run `setView`'s `#browse`-hide block.** The fix is inside the `!npOpen && !optOpen && !subOpen` block (the real home/browse switch), which is the only path that hides a tall in-flow `#browse` and thus the only path that clamps. Overlay→home rides the same `setView('home')` (the overlay is hidden after the `#browse` hide, so the pre-emptive scroll is masked by the overlay too). No other `→home` path collapses `#browse`. Confirmed against nav.js:56-76.
- **R4 — regression on a SHORT `#browse`** (a 1-book author, an empty list). `window.scrollTo(0,0)` when the window is already ~0 is a no-op; a short `#browse` never clamped anyway. No regression.

## 9. Handoff

**Source artifact:** this plan (`Claude/Plans/PLAN-swipe-clamp-fix.md`).
**Verdict / status:** PLAN_READY. The persisting books→home flash is device-confirmed as the outgoing-`#browse`-collapse SCROLL CLAMP; the fix pre-empts it with one `window.scrollTo(0,0)` placed before the `#browse` `display:none` in `setView`, reducing the scrolled case to the device-confirmed top-clean case. Fixed-`#home` is KEPT (not load-bearing for the fix, but reverting is major churn and it hosts the fix cleanly).
**Decisions made:** the clamp (not the slide-transform demote) is the driver (device scroll-dependence + Linnaeus); option 1 (pre-emptive scroll) over option 2 (stable-height document) on blast radius; fixed-`#home` KEPT with the honest caveat that 6i's two KILLs did not fix the flash and were orthogonal.
**Open questions / who each waits on:** R1 (does the pre-emptive scroll itself flash) — DEVICE, downstream of the build, strongly grounded against; the option-2 fallback is specified if it bites.
**Next owner:** Charpy (the plan reviewer) to temper; then Brunel (the builder); then Curie (the CLAMP CI cell); the device gate is downstream.
**Required evidence / gates:** the CLAMP CI cell green (scroll reset observed before the `#browse` hide, mutation-verified); the flash is NOT called fixed without the device gate (a clean scrolled books→home commit on the reliable oracle).
**Records to scrub on approval:** annotate `PROBE-artrelease-reveal` as realized by this stage; update the swipe subsystem contract with the clamp-preempt in `setView`. Route to Zelda.

VERDICT: PLAN_READY
