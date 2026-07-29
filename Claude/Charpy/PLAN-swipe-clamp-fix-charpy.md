# Charpy review — PLAN-swipe-clamp-fix (books→home scroll-clamp pre-empt)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom"} -->

Reviewed: `Claude/Plans/PLAN-swipe-clamp-fix.md` (Vitruvius, HEAD `c179b1b`, PLAN_READY). Read in full plus the
shipped `.264` source it edits: `js/nav.js` `setView` (44-85) + `applyScreen` (117-145), `css/app.css` `#home`
(123-133), `js/app.js` finalize (785-793, 1188-1222), `js/browse.js` scroll recorder/restore (198-221), and
the two Linnaeus probes it cites (by reference — the diagnosis is device-confirmed, not re-derived here).

## Applicability

- **defining_records: true** — reconciles the device oracle, Linnaeus `PROBE-artrelease-reveal`, and the
  shipped `.264` code; `## Defining records` below.
- **boundary_relocation: false** — no module seam moves; one call added inside one function.
- **callee_replacement: false** — no callee/indirection replaced; a synchronous `window.scrollTo(0,0)` is added.
- **contract_shape: false** — no classification/plan/schema/state-output changes.
- **project_adapter: tomeroam-js-dom.** The one added statement is `window.scrollTo(0, 0)`; the surrounding
  DOM mutation is `browseEl.classList.toggle('hidden', …)` (nav.js:64) — unchanged. No `d.<field>` write is
  added. No source/callee ranges are declared (both relocation and callee patterns are false).

## Verdict

**FORGE.** The diagnosis is device-confirmed and the mechanism is sound: the persisting books→home flash is the
window-scroll CLAMP that rides the outgoing-`#browse` `display:none` collapse, and zeroing `window.scrollY`
while `#browse` is still tall (a valid in-range scroll, not a clamp) reduces the scrolled case to the
device-proven top-clean collapse. **The load-bearing timing assumption — that `#home` is opaque and covering at
the instant the pre-emptive `scrollTo` runs — HOLDS on both entry paths, verified from source, and is in fact
stronger than the plan states** (the scroll and the collapse execute in one synchronous `setView`, so `#browse`
is never painted in a scrolled-tall-visible state at all). Side-effects are safe. Two non-blocking build-notes
(F1, F2); neither is a fracture. The flash itself stays correctly device-owed.

## Defining records

**AGREE — no conflict.** The device oracle (books→home flashes only scrolled-down; top is clean) is
scroll-dependent, which selects the collapse-clamp mechanism and rules out the incoming `#home` slide-transform
demote; Linnaeus `PROBE-artrelease-reveal` grounds the same driver (the `released=35`/`src 17→0` signals were
the departing BOOKS virtual list, a red herring — home carousels are not virtualized). The shipped `.264`
source is verified: the old `scrollTo(0,1)` was retired in 6i and home entry now resets only `#home.scrollTop`
(nav.js:130), so the WINDOW scroll is never zeroed before the collapse — the gap this fix fills. The fixed-`#home`
KEEP decision is honestly accounted (6i did not fix the flash and was orthogonal; reverting is pure churn). No
record contradicts another; the only residual is the device confirmation, which the reliable on/off oracle settles.

## Load-bearing verification (the five stress axes)

**1. The timing / "invisible under the cover" assumption — HOLDS, and is stronger than stated.** I traced both
paths in source:
- **Swipe-commit:** `runFinalize` clears the mover transforms at `app.js:787` (`m.el.style.transform = ''`),
  then `applyScreen(dest,{render:false})` at `app.js:1222` runs `resetSwipeStyles` (nav.js:103-108, clears the
  transform again) and `setView('home')`. I confirmed commit→home flows here **synchronously**: the 6i
  commit→home HOLD branch is retired (app.js:1188-1192 comment), and the only early-return before 1222 is the
  `!commit && abortRender==='rerender'` abort branch (app.js:1200) — commit→home falls straight through, no
  rAF/await/timer. So at the `scrollTo` instant `#home` has no inline transform → it rests at its CSS position,
  opaque (`background:var(--page-bg)`, `z-index:20`, css:127/130), covering.
- **Button-nav / overlay→home:** `applyScreen({v:'home'})` → `setView('home')`; line 57
  `toggle('parked', v!=='home')` UN-PARKS `#home` (`v==='home'`) BEFORE line 63 `browseWillHide()` and the new
  `scrollTo`. So `#home` is un-parked/covering at the scroll instant here too.
- **The stronger guarantee:** the new `scrollTo(0,0)` and the `#browse` `display:none` (nav.js:64) are both
  inside one synchronous `setView` with no paint between them, so `#browse` is never painted in the
  scrolled-to-0-but-still-tall state — the visible layer is `#home` in both the pre-frame and the post-frame.
  The fix does NOT trade the carousel flash for a visible `#browse` scroll-jump. (See F1 on the precise
  occlusion geometry.)

**2. Ordering — CORRECT.** `browseWillHide()` (nav.js:63) precedes the new scroll: it captures the browse
virtual-list anchor at real geometry (scroll ~11247, for correct re-entry) and deactivates the controller, so
the pre-emptive scroll neither corrupts the captured anchor nor churns the (now deactivated) controller. The
collapse truly happens at the `#browse` `display:none` (nav.js:64), not earlier: un-parking `#home` (line 57)
does not change document flow (`#home` is `position:fixed` parked or active), and `browseWillHide` deactivates
the controller without hiding the element — `#browse` stays in-flow and tall until line 64. Order is correctness-
load-bearing (a wrong order re-arms the clamp), as the plan states.

**3. Side-effects of scrolling `#browse` to 0 — SAFE.** The browse scroll recorder (`browse.js:198-202`) writes
`cur.sy = window.scrollY` on a document `scroll` event, but guarded by `if (restoring || !browseVisible()) return`.
`scrollTo`'s scroll EVENT dispatches asynchronously (after `setView` returns), by which point `#browse` is
`display:none`'d → `browseVisible()` is false → the recorder early-returns → `cur.sy` is NOT corrupted; the
same guard already protects it from the current clamp's own scroll event. Re-entry restore (`applyScrollY`,
browse.js:218-221) uses the saved anchor/`sy`, unaffected. The virtual-list realize/release is not retriggered
(controller deactivated by `browseWillHide` first; `onDocScroll` early-returns). No lost scroll on a later
home→books. (See F2 on the placement guard, which keeps the call off the setView('browse') path entirely.)

**4. Both entry paths — CONFIRMED.** Swipe-commit routes through `app.js:1222` `applyScreen(dest,{render:false})`
→ `setView('home')`; button-nav and overlay→home route through `applyScreen({v:'home'})` (nav.js:130) →
`setView('home')`. Both hit the identical `setView` sequence and thus the identical scroll placement; both
clamp today and both are pre-empted. `#home` covers at the scroll instant on each (transforms cleared for
commit; un-parked at line 57 for nav).

**5. The CLAMP CI cell — WELL-FORMED and HONEST.** It spies `window.scrollTo` and asserts a `(0,0)` call
occurred AND occurred before `#browse` received the `hidden` class, driving the real `setView` — an ORDER/CALL
assertion jsdom executes faithfully (no layout needed). It reddens on the named mutation (move the scroll after
the hide, or remove it → the before-the-hide assertion fails). It is honestly scoped: it cannot see the clamp
or the compositor re-raster (jsdom does no layout), so the flash stays device-owed to the reliable scrolled
books→home on/off oracle — the plan does not over-claim it as flash-proven. Not vacuously green for what it
asserts (the order), honestly partial for what it cannot (the paint).

## Findings

### F1 — Note (recommendation) — state the occlusion precisely: `#home`'s content band + the fixed bars, and the synchronous single-frame is the real guarantee
The plan says the opaque fixed `#home` "fully occludes `#browse`" / "covers the viewport." Precisely, `#home`
(css:123-131) spans only its content band — `top: calc(safe-top + 51px)` (the `.topbar` bottom, css:125) to
`bottom: calc(nav-h + nav-pad)` (the navbar top, css:126) — and the fixed `.topbar`, navbar, and (under
`body.has-player`, css:133) the transport tile the remaining top/bottom strips. The comments confirm the bands
abut with no gap, so the NET occlusion of `#browse` is complete — the "invisible" claim holds — but it rests on
`#home` PLUS the fixed bars, not `#home` alone. More decisively, the strongest guarantee is temporal, not
spatial: the `scrollTo(0,0)` and the `#browse` `display:none` run in one synchronous `setView` with no paint
between, so `#browse` is never composited in the scrolled-to-0-but-tall state regardless of occlusion. Recommend
stating both (band + fixed-bar tiling; and the single-frame execution) so the efficacy argument rests on the
real geometry and timing. Non-blocking.

### F2 — Weak (recommendation) — implement the `scrollTo` INSIDE the browse-hiding guard, not as a bare line after the `browseWillHide` if-statement
§2 correctly scopes the change to "`v === 'home'` and `#browse` currently shown," but the mechanical placement
("after `browseWillHide()` (nav.js:63), before the `#browse` `display:none` (nav.js:64)") describes a location,
not a guard. `browseWillHide` at nav.js:63 is a single guarded statement (`if (v !== 'browse' && !browseEl.
classList.contains('hidden') && d.browseWillHide) d.browseWillHide()`); a bare `window.scrollTo(0,0)` inserted
after it is UNCONDITIONAL and would also fire on `setView('browse')` (home→books, abort→browse), zeroing the
window scroll on every navigation TO browse. That is benign — at that instant `#browse` is still hidden so
`browseVisible()` is false (no `cur.sy` corruption), and the downstream browse restore (`applyScrollY`, or the
abort's `scrollTo(0, cur.scroll0)` at app.js:1203) re-restores the position — but it is a spurious scroll on
every browse entry and depends on the restore always running after. Implement it inside the same condition as
`browseWillHide` (expand the guard to wrap both calls), so it fires ONLY on the `→home` hide, matching §2's own
scope. This is the clean, intent-matching form and removes the dependence on a downstream corrective scroll.
Non-blocking (benign if missed), but specify it so Brunel does not insert a bare line.

## Coverage

- **F1** — no runtime surface: a prose-precision note on the efficacy argument (occlusion geometry + the
  single-frame guarantee). Owes no test.
- **F2** — guarded by the CLAMP CI cell only indirectly: the cell asserts the call fires on the `→home` path;
  add (or extend) an assertion that a `setView('browse')` does NOT emit the `scrollTo(0,0)` if the guard is
  desired to be test-pinned. Otherwise a build-note for Brunel; benign if unguarded.

## Prediction — where it could bite in execution

1. **The `scrollTo` is inserted as a bare line** (F2): every home→books / abort→browse then emits a spurious
   `scrollTo(0,0)` before the browse restore. Functionally invisible (restore corrects it), but it muddies the
   CLAMP cell's ordering assertion if the cell drives a `setView('browse')` and does not expect the call. Guard
   it and the surface is clean.
2. **R1 (does the pre-emptive scroll itself flash) reddens on device** — strongly grounded against (occluded
   band + fixed bars + single synchronous frame + fixed-`#home` is viewport-anchored so a window scroll does
   not re-raster its layers), and the option-2 stable-height fallback is specified. This stays the one honest
   device residual; do not call the flash fixed until the scrolled books→home on/off oracle passes.

## Handoff packet

- **Source artifact:** `Claude/Charpy/PLAN-swipe-clamp-fix-charpy.md` (this casebook).
- **Verdict / status:** FORGE. The diagnosis is device-confirmed, the timing assumption holds (verified from
  source, strengthened by the synchronous single-frame execution), side-effects are safe, both paths and the CI
  cell check out. Two non-blocking build-notes (F1 occlusion precision; F2 guard the placement).
- **Decisions confirmed against reality:** commit→home flows synchronously to `applyScreen`→`setView` (the 6i
  hold branch is retired, app.js:1188-1192; only the abort branch early-returns at 1200); `#home` is opaque
  fixed z20 covering its band (css:123-131) with the fixed bars tiling the strips; the browse recorder
  (browse.js:199) is guarded by `browseVisible()` so the pre-emptive scroll does not corrupt `cur.sy`.
- **Open questions / who each waits on:** R1 (does the pre-emptive scroll itself flash) — DEVICE, downstream of
  the build, strongly grounded against; option-2 fallback specified.
- **Next owner:** Brunel (build the one-line guarded insertion; land F1/F2) → Curie (the CLAMP CI cell) → the
  device gate (scrolled books→home on/off).
- **Required evidence / gates:** the CLAMP CI cell green (scroll reset called before the `#browse` hide,
  mutation-verified); the flash NOT called fixed without the device gate.

VERDICT: FORGE
