# Charpy review — PLAN-home-shift-fix (home→books scroll shift: M2 geometry + M1 scroll-preserve)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom"} -->

Reviewed: `Claude/Plans/PLAN-home-shift-fix.md` (Vitruvius, HEAD `96881e2`, PLAN_READY), full, against Linnaeus
`PROBE-home-shift-2026-07-29.md` and HEAD `.267` source — `css/app.css` `#home`/`#browse`/`.app`/`#library`
geometry (74, 126-158, 208), the ghost builder `ghostApp` (swipe.js:274-295), the park/recorder (app.js:
478-486, 2887-2890), and the abort finalize + restore path (app.js:1218-1229, nav.js).

## Applicability

- **defining_records: true** — reconciles the Linnaeus probe, the 6i/`.267`-decouple precedent (the root of
  M2), the carousel `dataset.sl` idiom M1 mirrors, and the verified `.267` source; `## Defining records` below.
- **boundary_relocation / callee_replacement / contract_shape: false** — I concur: no module seam moves; no
  callee is replaced; the swipe classification/construction contracts are untouched. (The plan is
  `state_transfer:true` for M1's `#home.scrollTop`-across-the-park preservation, which the Charpy gate does not
  model as a pattern; it is assessed in the findings and the M1 verification.)
- **project_adapter: tomeroam-js-dom.** The relocated/added writes are `#home.dataset.st` (recorder),
  `#home.scrollTop` (restore), and the clone `#library.style.paddingTop` (M2); the classList surface is the
  `!t.classList.contains('parked')` guard. No `d.<field>` contract member changes.

## Verdict

**FORGE.** Both mechanisms are correctly diagnosed and soundly fixed, and the residuals are honestly
device-owed. M2's geometry-alignment reasoning is correct and its exact constant is genuinely device/layout-owed
(jsdom does no layout); it does not regress the real `#home` or the browse ghost (I verified `#browse` shares
`#home`'s exact fixed-inset geometry, so the single clone-padding fix aligns both), and option (b) correctly
keeps the clone in normal flow for the `translateY(-ghostY)` scroll-sim. M1's `!parked` guard soundly preserves
the pre-park `#home.scrollTop`, and the restore routes through the one reconcile point (`applyScreen`'s home
branch) with `resetScroll:false` on abort (verified app.js:1227) and true on fresh-nav. The three CI cells are
well-formed, redden on their mutations, and honestly leave the on-screen shift device-owed — no vacuously-green
paint cells. **M1 warrants a Loki executed-counterexample pass** (the plan self-recommends it, correctly — see
below). One non-blocking Note (the M2 candidate value). The red `--page-bg` gradient is untouched; flash C is
out of scope.

## Defining records

**AGREE — no conflict.** The Linnaeus probe is DERIVED and cited: M2 (scroll-independent) is the ghost keeping
the pre-6i in-flow `#library { padding-top:46 }` model (swipe.js:276) while the real views became fixed-inset
boxes at `calc(safe+65)`; M1 (scroll-dependent) is the park's `overflow-y:auto`→`hidden` flip clamping
`#home.scrollTop`→0 with no save/restore. Both realizations (exact px + compositor paint) are marked [UD]
device — the plan does not assert the shift clean. The carousel `dataset.sl` recorder is the proven idiom M1
mirrors. No two records conflict.

## Load-bearing verification (the four stress axes)

**1. M2 geometry alignment — SOUND; exact value genuinely device-owed; no regression.**
- **The cancellation reasoning is correct.** Real active `#home` first-content viewport-Y = `top:calc(safe+51)`
  + `padding-top:14` = `calc(safe+65)` (css:128/131). The clone lays content at `.app padding-top` +
  `#library padding-top`. Setting them equal, IF the clone `.app` retains its `calc(safe+12)` padding (css:74,
  a class rule that survives the id-strip), the `--safe-top` term cancels and `#library` padding = `65−12 =
  53px` (notch-independent). The derivation `(51+14)−12 = 53` is arithmetically right.
- **But 53 assumes the clone `.app` padding contributes, and Linnaeus's own measurement points the other way**
  (see the Note). The plan is honest here: it flags "the probe read the ghost content at ≈46, i.e. it may not
  contribute as modeled" and defers to Brunel's device measurement, with candidates 53 (`.app` contributes) or
  `calc(safe+65)` (it does not). Because the clone's effective `.app` padding is a layout fact jsdom cannot
  compute, the exact value is genuinely DEVICE/layout-owed — the plan does not over-commit to 53.
- **No regression, verified from source.** (a) The real `#home` is untouched — M2 edits only the CLONE
  (swipe.js:276). (b) The browse ghost is not regressed: I confirmed `#browse` (css:150-154) carries the
  IDENTICAL `position:fixed; top:calc(safe+51); padding:14px 16px 40px` as `#home` (css:126-131), and
  `has-player` changes only `bottom` for both — so the real content-top is `calc(safe+65)` for BOTH, and the
  single clone-`#library` padding aligns both ghosts uniformly (a fix of the same latent gap, not a new browse
  shift). (c) The `translateY(-ghostY)` scroll-sim is preserved: option (b) keeps the clone view in NORMAL
  FLOW (id-stripped → `position:static`, fully laid out), changing only the content-top offset; the plan
  correctly rejects option (a) (a `position:fixed`+`overflow` clone view would be re-parented by the clone
  transform and clip its content, breaking the translate-sim). At `ghostY=S` the aligned-top + `translateY(-S)`
  correctly shows the S-scrolled content at the box top — the alignment makes the sim accurate at every scroll,
  not just the top.

**2. M1 save/restore timing — SOUND.**
- **The `!parked` guard correctly skips the park's clamp.** At swipe start `showAppView` adds `.parked` to
  `#home` (app.js:485), which flips `overflow-y:auto`(css:132)→`overflow:hidden`(css:102) and clamps
  `#home.scrollTop`→0. The clamp fires a `scroll` event, but `.parked` is added BEFORE the overflow change that
  causes the clamp — so whether the event dispatches synchronously or (as browsers do) asynchronously, the
  recorder's handler sees `.parked` PRESENT and the `!t.classList.contains('parked')` guard skips the write.
  `dataset.st` therefore retains the pre-park value S. This is exactly the carousel `dataset.sl` idiom, which
  survives its own state change the same way. Sound.
- **The restore routing is complete for the reported (abort) case.** The restore lives in `applyScreen`'s home
  branch (the single reconcile point every terminal →home reveal routes through: `setView('home')` removes
  `.parked` restoring `overflow-y:auto`, THEN `#home.scrollTop = +dataset.st` on the `else` (scroll-preserving)
  branch). I verified the abort finalize passes `resetScroll:false` (app.js:1227: `applyScreen(dest, {render:…,
  resetScroll:false})`) → the else-branch restores S; a fresh nav/commit to home passes `resetScroll` default
  true (app.js:1222) → top-reset (unchanged product behavior). O2 (restore-after-unpark) holds — the restore
  line runs after `setView` removes `.parked`, so `scrollTop` is settable. The mid-drag transient parks/un-parks
  are under the held ghost and reconciled at the terminal `applyScreen`; the recorder's guard keys off the
  class, not the site, so it covers every park.

**3. M1 is the Loki lane — CONFIRMED warranted.** M1 is a save/restore across a lifecycle flip
(`overflow-y:auto`→`hidden`→`auto`) with abort / supersession / held-ghost interleavings — the precise shape of
this saga's stale-token bugs (the `beginRestore` stale-finalizer, the `.89` connect finalizer, cited §8). The
by-construction mitigations are real (`dataset.st` is ELEMENT-LOCAL so supersession cannot strand it; the
`!parked` guard blocks the clamp-overwrite; the restore is idempotent per reveal) — but whether a mid-gesture
home re-scroll, a commit-then-abort, or a supersede-during-held-ghost can land a STALE or 0 `dataset.st` on the
visible reveal is an executed-counterexample question I do not settle here. **This warrants a Loki pass on M1**,
exactly as §8 self-recommends. I flag it, I do not attempt the interleavings.

**4. The three CI cells — well-formed, redden on mutations, on-screen outcomes honestly device-owed.**
- **M1SAVE** drives the real recorder (set `#home.scrollTop`, dispatch a `scroll` event on `#home`, assert
  `dataset.st`; add `.parked`, dispatch, assert unchanged). jsdom-safe (scrollTop/dataset are properties; a
  capture-phase document listener fires on a `#home`-dispatched scroll). Mutation "omit the `!parked` guard" →
  a parked scroll of 0 overwrites `dataset.st` → reddens. Tests the GUARD LOGIC (not the real overflow clamp,
  which is browser behavior) — the correct thing to gate.
- **M1RESTORE** drives the real `applyScreen` home branch (`resetScroll:false` → restore `dataset.st`;
  `resetScroll:true` → 0). jsdom-safe. Mutation "the `resetScroll:false` branch omits the restore" → stays 0 →
  reddens. Well-formed.
- **M2ALIGN** builds `ghostApp` against a fake env and asserts the clone `#library` padding resolves to the
  fixed-inset-aligned value, NOT `'46px'`. jsdom-safe (cloneNode + inline style). Mutation "revert to 46" →
  reddens. Honest limit: it is a REGRESSION guard (the builder uses the derived aligned constant, not the
  vestigial 46), not a proof the value is correct on screen — the plan states the on-screen zero-shift is
  device-owed, so M2ALIGN cannot and does not claim it. No vacuously-green paint cell exists; all three are
  wiring/guard/regression checks with the compositor outcomes correctly device-gated (§9).

## Findings

### F1 — Note (recommendation) — the M2 headline emphasizes the `53px` candidate, but Linnaeus's own measurement points to `calc(safe+65)`
The plan's headline and §3 lead with "the aligned `#library` padding-top is the notch-independent constant
`(51+14)−12 = 53px`." That derivation is correct ONLY if the clone `.app` padding contributes its
`calc(safe+12)` in the ghost. But Linnaeus measured the current ghost content at ≈46px from the viewport top
(`PROBE-home-shift` §2) — and 46 is the raw `#library` padding with NO `.app` contribution (if `.app`
contributed, the current content would sit at `safe+12+46 = safe+58`, not 46). So the probe's own data implies
the `.app` padding does NOT contribute as modeled → the aligned value is `calc(safe+65)`, not 53. The plan
acknowledges both candidates and defers to Brunel's device measurement (honest, so this is non-blocking), but
recommend Brunel weight the ≈46 measurement (→ `calc(safe+65)`) over the 53 headline, and confirm the aligned
value by measuring the clone's actual first-content viewport-Y against the real `#home`'s at `scrollTop=0`
rather than assuming the `.app`-contributes model. The M2ALIGN cell should assert whichever value Brunel
device-confirms, not a hard-coded 53.

## Coverage

- **F1** — no CI surface beyond M2ALIGN (already device-scoped): a Note steering Brunel's device measurement;
  the exact aligned value is layout-owed and settled on the home→books-from-top repro, not in jsdom.

## Prediction — where it could bite in execution

1. **Brunel hard-codes 53 from the headline** (F1) and the clone `.app` padding does not contribute as modeled
   (Linnaeus's ≈46) → the ghost is still ~7px off and the top-case shift persists on device. Weighting the
   measurement (→ `calc(safe+65)`) avoids it.
2. **An M1 interleaving lands a stale/0 `dataset.st`** on a superseded or re-aborted →home reveal — the Loki
   lane. The element-local `dataset.st` + `!parked` guard + idempotent restore are strong by-construction, but
   this is precisely the executed-counterexample question Loki owns; do not ship M1 without it.
3. **R-M2/R-M1 confirmations on device** — honestly device-owed; the design is correct in source, so these are
   confirmations, not defects. Do not call the shift clean until the home→books repro (top: M2; scrolled: M1)
   passes; flash C stays out.

## Handoff packet

- **Source artifact:** `Claude/Charpy/PLAN-home-shift-fix-charpy.md` (this casebook).
- **Verdict / status:** FORGE. M2 (geometry alignment) and M1 (scroll-preserve across the park) are both sound;
  the exact M2 constant and the on-screen shift are honestly device-owed; M1 warrants a Loki pass. One
  non-blocking Note (F1, the M2 candidate value).
- **Decisions confirmed against reality:** `#browse` shares `#home`'s exact fixed-inset geometry (css:150-154
  == css:126-131) so the single clone-padding fix aligns both ghosts with no browse regression; the abort
  finalize passes `resetScroll:false` (app.js:1227) so the restore covers abort→home while fresh-nav stays at
  top; the `!parked` guard skips the park's clamp because `.parked` is added before the overflow change.
- **Open questions / who each waits on:** F1 (weight the device measurement, not the 53 headline) — Brunel;
  the M1 interleavings — Loki; R-M2/R-M1/R-regress-browse — device, downstream.
- **Next owner:** Loki (the adversary) on M1's abort/supersession/held-ghost interleavings + the `!parked`-guard
  timing, then Curie (the three cells) + Brunel (M2 with the device-measured value, M1). M2 alone needed only
  this stress; M1 needs Loki.
- **Required evidence / gates:** the three CI cells green (M1SAVE, M1RESTORE, M2ALIGN — each mutation-verified);
  the device gates confirmed on the home→books repro (top: M2 zero-shift; scrolled: M1 no growing jump; browse
  ghost not regressed); the construction contracts PROVEN unchanged. Flash C explicitly NOT gated. The red
  `--page-bg` gradient stays untouched.

VERDICT: FORGE
