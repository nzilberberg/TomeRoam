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
- **F3** (coverage re-stress) — no new cell; a defect in the mutation REGISTRATION that would mis-credit
  M1CROSSSRC. Verified at registration: each per-site `from` occurs EXACTLY ONCE in `js/app.js`, and the sweep
  is read against a stated expected-killing-cell per mutant. Detail in the coverage re-stress section below.
- **F4** (coverage re-stress) — gates M1RESTORE, M1SUPERSEDE and M1SUPCROSS: without a synchronous,
  correctly-keyed clamp model those cells cannot fail. Verified by removing each restore line and confirming
  the corresponding cell reddens (the plan's own §10 prerequisite, run as the shim's acceptance test).
- **F5** (coverage re-stress) — gates the second (write-observation) oracle on M1CROSSSRC and M1SUPCROSS.
  Verified by the same per-site mutant runs: with the mutant applied BOTH the residual and the write
  assertion must fail; with the fix in place both must pass.
- **F6** (coverage re-stress) — no runtime surface: a within-document count correction in the plan's §7.

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

---

## M1 re-stress after the Loki KILL — patched plan HEAD `2792c4f` (2026-07-29)

Scope: the M1 PATCH ONLY (fix 2 — restore the abort/recovery→home reveal from the gesture's own `cur.ghostY`,
dropping the KILL'd recorder/`dataset.st`/`applyScreen`-branch entirely). **M2 stays FORGE'd — not revisited.**
Read the Loki KILL (`STRIKE-home-shift-m1.md`, `5167e8c`) and the source at the two restore sites (app.js:444
supersession recovery, app.js:1220-1229 abort, app.js:548-551 `ghostY` storage, swipe.js:274-292 capture).
**Verdict on the M1 patch: TEMPER — one Structural coverage finding (F1); the design itself is sound and
closes the KILL by construction.**

### 1. Does fix 2 close the KILL? — YES, and the record is truly removed (not left alongside)

I verified the recorder / `dataset.st` / nav.js restore-branch are NOT built, from three angles: the
`vitruvius-gate` `source_ranges` dropped `app.js:2887-2890` (recorder) and `js/nav.js:144-172` (restore branch)
and now list only `app.js:548-551` (the pre-existing `ghostY` storage), `app.js:442-448` (supersession), and
`app.js:1220-1229` (abort); §2 (line 63) says the carousel recorder is UNTOUCHED and no `#home` clause is
added; §4 (line 88) and §8 R-scope (line 155) both state "no recorder, no `dataset.st`, no `applyScreen`/nav.js
restore branch." So the ONLY value is `cur.ghostY`, captured per-gesture pre-park at swipe.js:289 and stored at
app.js:549. **No persisted last-scroll record exists to carry a pre-nav value forward** — the exact desync the
KILL exploited. The KILL's interleaving is closed: the top-start gesture captures `ghostY=0` FRESH from the
live (already-reset) `scrollTop=0`, so the abort restores 0, and there is no stale 500 anywhere in the
gesture's state. Confirmed.

### 2. The new app.js:444 supersession-recovery site — LOGIC self-consistent (the re-strike plane)

I traced the KILL's own plane. The added line (§4) is `if (cur && cur.ghostY != null && currentDesc().v ===
'home') $('home').scrollTop = cur.ghostY;`, placed after the recovery's `applyScreen(currentDesc(), …)`
(app.js:444). Here `cur` is the SUPERSEDED session (the one `disposeOwnedPanes(cur,'superseded')` is tearing
down, app.js:442). A superseded gesture never committed, so `navStack` sits at its SOURCE → `currentDesc()` is
that source. Therefore `currentDesc().v === 'home'` ⟺ the superseded gesture's source is home ⟺ that gesture
built a home app-ghost ⟺ `cur.ghostY` is that gesture's own pre-park home scroll. So the recovery restores the
SUPERSEDED session's OWN `ghostY` — self-consistent with the ghost that session showed — for double-abort,
supersede-during-held-ghost, and rapid re-gesture: each gesture carries its own per-session `ghostY`; no
cross-session or stale value can reach this site (there is no shared/last-scroll record left). `cur.ghostY` is
never stale (set once at build, never mutated) and never from the wrong session (the `currentDesc().v==='home'`
gate binds it to the home-source case). The logic holds by the same construction as the abort site. (The
executed interleavings remain Loki's to run — see the RE-strike scope.)

### 3. `cur.ghostY` freshness + the null gate — sound

`cur.ghostY` is set at app.js:549 from `c.capture.ghostY` (swipe.js:289), per-gesture, pre-park. Every
home-SOURCE gesture builds an outgoing app-ghost of home (source in-flow, dest ≠ home ⇒ app-ghost), and the
app-ghost ALWAYS carries `ghostY` (app.js:543) — so `cur.ghostY` is set exactly when a home reveal needs it;
there is no home-reveal path where it is needed but null (⇒ no regression-to-0). The `!= null` + `dest.v /
currentDesc().v === 'home'` gates correctly exclude non-home sources: a books→books abort has `dest.v ==='browse'`
→ skip (it does NOT restore a home scroll, even though `cur.ghostY` holds the browse ghost's value); browse→home
is a fresh-nav top-reset (commit) or aborts back to browse (`dest.v==='browse'` → skip). Confirmed.

### F1 — Structural (defect) — the app.js:444 supersession-recovery restore has NO CI cell, yet the ledger and coverage matrix claim M1FRESHNAV covers it
The `vitruvius-ledger` (line 114) attributes "home scroll ghostY recovery … recovery home restore@S2 …
M1FRESHNAV cell," and the §7 dimension rows (Recovery authority boundary line 128, Composition line 135,
Concurrency line 137) all credit M1FRESHNAV with the supersession-recovery restore. But M1FRESHNAV's fixture
(line 143) drives an ABORT (scroll → nav-away → nav-home → swipe-from-top → **abort** → assert), which
exercises the abort finalize (app.js:1227) — NOT the supersession recovery (app.js:444). So **the NEW restore
site, on the exact plane the KILL lived on, is exercised by no CI cell**, while the ledger says it is. This is
the same coverage-blindness the KILL exploited (Loki §5: "the M1RESTORE cell is green over this fracture … the
suite as designed ships the bug") — and the plan's own §8 R-M1-interleave (line 153) contradicts the ledger by
naming the supersession site a "residual for the RE-strike," i.e. Loki-owned, not M1FRESHNAV-covered. Resolve
the inconsistency: **preferably add a `M1SUPERSEDE` cell** that drives the recovery (start a home→X gesture so
`cur.ghostY` captures a home scroll, supersede it with a second gesture, and assert `#home.scrollTop ===` the
superseded gesture's `ghostY`, not a stale/wrong value or 0 — the restore-VALUE logic is jsdom-drivable via the
harness's supersede path, the same way the stage-6b loser-cancel tests trigger supersession; the on-screen
paint stays device-owed). Failing that, correct the ledger/dimensions to state the supersession-restore value
is Loki/device-owned and drop the M1FRESHNAV attribution. Given the first KILL was *caused* by a cell that
claimed coverage it did not have, adding the regression cell is the disciplined resolution — do not ship the
supersession site with only a one-shot Loki pass and no regression gate.

### F2 — Note (recommendation) — M1FRESHNAV's declared mutation is a design-revert, not a natural code-mutant of fix 2
M1FRESHNAV's mutation column says "the restore reads a persisted last-scroll record instead of the gesture's
own `ghostY` so the stale five hundred survives." But fix 2 has NO persisted record to mutate — the only
home-scroll value in the top-start gesture is `ghostY=0`, so no single-line mutation of fix 2's code produces
the 500 that reddens the cell; the reddening variant must REINTRODUCE the KILL'd persisted-record design. That
is a valid regression-lock (the cell's PASS meaningfully proves the interleaving lands 0, and the OLD design
would fail it), but per EC §4.10 Curie must register the mutant explicitly as a "stale-record restore"
injection in `tools/mutate.mjs` and confirm it reddens — it is not a one-liner. Note this so the
mutation-verification is not assumed automatic. (M1RESTORE's mutation — "the abort omits the `ghostY` restore"
→ reveals at the clamped 0 → reddens — IS a clean natural mutant and is fine.)

### The cells that are sound

M1RESTORE (abort→home restores `cur.ghostY`, mutation omits-the-restore → reddens) and M1FRESHNAV (the Loki
interleaving lands 0, regression-lock) are well-formed and jsdom-safe (scrollTop is a settable/readable
property; the ghost captures from the set scrollTop); the on-screen shift stays honestly device-owed (§9).
M2ALIGN is untouched (M2 stays FORGE'd). No vacuously-green paint cell exists.

## Verdict — re-stress: TEMPER (F1 coverage; the M1 design is sound)

Fix 2 closes the Loki KILL by construction — no separate record, the restore value IS the gesture's own
per-gesture-fresh `capture.ghostY`, and both restore sites (abort app.js:1227, supersession app.js:444) are
self-consistent (the `currentDesc()/dest.v === 'home'` gate binds the value to the home-source gesture that
built it). The re-strike plane (app.js:444) holds in LOGIC. The one blocking gap is COVERAGE: the supersession
site is credited to M1FRESHNAV in the ledger/matrix but exercised by no cell — the same coverage-blindness that
produced the first KILL. On F1 (add a `M1SUPERSEDE` cell, or honestly reconcile the ledger to Loki-owned) plus
F2 (register M1FRESHNAV's design-revert mutant explicitly), the patch is FORGE-ready.

**The Loki RE-strike scope is confirmed and correctly routed** (§8): the NEW supersession-recovery→home site
(app.js:444), double-abort, supersede-during-held-ghost, and Loki's own lesson (enumerate every writer of the
visible scroll the `cur.ghostY` restore might still miss). Do NOT skip it — fix 2 is structurally stronger but
adds a restore site on the exact plane the KILL lived on. M2 stays FORGE'd; the red `--page-bg` gradient is
untouched; flash C is out.

VERDICT: TEMPER

---

## COVERAGE re-stress after the Loki 2nd KILL + the source-gate fold — plan HEAD `8cebe7d` (2026-07-29)

Scope: the amended **COVERAGE half only** — the two new cross-source cells (M1CROSSSRC, M1SUPCROSS), the V1
jsdom clamp finding and its prescribed remedy, the per-site mutant registration rule, the V2 reachability
correction, and the ledger/§7/count coherence. The DESIGN half (source-gating both restore sites on
`cur.from.v`) stays approved. **M2 stays FORGE'd — not revisited.** Flash C out; the red `--page-bg`
gradient (css:41) untouched. **Verdict: TEMPER — three Structural coverage defects (F3, F4, F5); the two
new cells are the RIGHT cells and every claim I could reach in source holds.**

**Record note (a filing gap, not a technical one).** The design-half re-stress of the source-gated fix was
performed in a session that died before it filed anything, so no design-half verdict exists in this casebook.
This section therefore also records the design-adjacent facts I re-derived from source here (V2 below, and
`cur.from` immutability), so the record does not depend on a lost transcript.

### 1. The V2 reachability correction — HOLDS, verified from source

Every link in the plan's §1 V2 chain is in the shipped source at HEAD `8cebe7d`:
- `paneLess` is a STATIC predicate over the session's movers — `const paneLess = (s) => !s.movers.some((m) => m.own === 'owned-pane');` (app.js:251), and `movers` is assigned once at app.js:539 (`d.movers = [toMover(c.movers.outgoing), toMover(c.movers.incoming)]`, plus an optional decoration push at 540) and never spliced.
- The outgoing app-ghost mover is tagged `owned-pane` — `outgoing = mover(g.wrap, 'owned-pane', 'outgoing')` (swipe.js:343), inside `if (plan.outgoing === 'app-ghost')` (swipe.js:341), and that branch is the only producer of `capture` (swipe.js:344), i.e. of `ghostY`.
- The `begin()` gate rejects a pane-owning session while finishing — `if (finishing && !(session && paneLess(session))) return;` (app.js:385).

So `cur.ghostY != null` ⟹ an app-ghost was built ⟹ the session owns a pane ⟹ it can never pass app.js:385
while `finishing` is true. The reachable route is therefore `finishing === false` with `d` non-null → the
admission `if (d || document.querySelector('.nav-ghost') || (finishing && session))` (app.js:400) → the
recovery block, `const cur = d || session` (app.js:436) → `applyScreen(currentDesc(), …)` (app.js:444).
**Mid-drag, not the held-ghost window — the correction is right, and the consequence is right too:** the
recovery site needs a second touch while the first finger is still down, so it is LESS common than the abort
site. The strike's FRACTURE and its fix direction stand unamended — the defect at app.js:444 is real (the
recovery renders `currentDesc()`, which an external actor can have moved to home) and the source gate closes
it. One useful detail for the fixture: the recovery block at app.js:400-450 runs BEFORE the target-exclusion
bail (app.js:457) and BEFORE the edge test (app.js:458), so ANY second touchstart that passes app.js:385
drives the recovery — the second touch does not need to be at an edge.

### 2. Do the two new cells genuinely DRIVE the sites they are credited with? — YES, both

**M1CROSSSRC → the abort finalize (app.js:1227).** Traced end to end:
- `abortRender` is `'none'` for books→options: `const abortRender = (c.fromKind === 'browse' && c.toKind === 'browse') ? 'rerender' : 'none';` (swipe.js:186). So the held early-return `if (!commit && cur.finPlan.abortRender === 'rerender')` (app.js:1200) is NOT taken and control reaches the no-hold else branch at app.js:1223-1229. **The plan's parenthetical is correct and load-bearing** — a browse→browse abort takes the held path and never reaches the fix, so the cross-source cell had to use an overlay destination.
- The gesture arms: a right-edge forward swipe requires a non-empty `fwdStack` (app.js:464), which the fixture's committed back-swipe from Options supplies (the commit pushes `navStack.pop()` onto `fwdStack`, app.js:789).
- The outgoing pane is an app-ghost (source in-flow, destination not home — swipe.js:149-150), so `ghostY = #browse.scrollTop = 800` (swipe.js:290).
- The external nav survives to the finalize: `h.tap` dispatches a real bubbling `MouseEvent('click')` (app-harness.js:700-705) at the shipped listener (`document.querySelectorAll('#navbar [data-nav]')…click`, app.js:2873) → `goHome()` (app.js:155) → `navTo` → `applyScreen({v:'home'})` → `setView('home')` un-parks `#home` (`$('home').classList.toggle('parked', v !== 'home')`, nav.js:57) and nav.js:140 zeroes `#home.scrollTop`. Nothing on that path touches `finishing`, `session` or `settleTimer`, so the identity guard `if (cur !== session) return;` (app.js:1257) still passes when the 340ms `setTimeout(finalize, 340)` (app.js:1271) fires. **§5 O4's premise is verified, not assumed.**
- At the finalize `dest = currentDesc()` is read fresh (app.js:793) and is home, so the pre-fix `dest.v` gate would have passed — the mutant writes 800 onto an un-parked `#home`, which jsdom stores (probe below). **The site is reached and the mutant can redden it.**

**M1SUPCROSS → the supersession recovery (app.js:444).** Same crossing on the mid-drag route of §1: `d` non-null, `finishing` false, second touchstart → app.js:400 → 436/444. The recovery's own `applyScreen(currentDesc(), { render: cur.live && cur.finPlan.abortRender === 'rerender', resetScroll: false, keepGhosts: true })` renders home (`currentDesc()` moved by the tap) and `setView('home')` un-parks it, while `resetScroll:false` means nav.js:140 does NOT zero — so the mutated `currentDesc().v` gate writes 800 onto an un-parked `#home`. **Site reached; mutant reddens.**

**One harness constraint that is not a defect but must be known before Curie writes these two.** `h.touch` keeps a SINGLE shared `target` closure variable (app-harness.js:744) that `start()` unconditionally reassigns (app-harness.js:760-767), so a second `h.touch.start(...)` mid-drag **overwrites the first gesture's binding**. That is still sufficient here — the second `touchstart` bubbles to the document listener (app.js:1278) and drives `begin()`, and the recovery itself calls `releaseGesture()` (app.js:403), so the first gesture is dead by design and needs no further driving. The constraint is only that **after the second `start()` the first gesture can no longer be moved or lifted**, so both recovery-site cells must assert without touching it again. No harness change is needed; a fixture written expecting two independently drivable touches would fail.

### 3. Two cells rather than one extension of M1SUPERSEDE — CONFIRMED the right call

Three independent reasons, each sufficient:
1. **Two separate gate expressions.** The shipped guards are two distinct statements — `cur.from.v === 'home'` in the abort finalize (app.js:1227 region) and `cur && cur.from.v === 'home'` in the recovery (app.js:444 region) — so a single mutant cannot exist per §7's own one-mutant-per-site rule, and a single cell cannot kill two mutants it does not both reach.
2. **Two different routes with different mechanics.** The abort site is reached asynchronously through the 340ms `settleTimer` (app.js:1271) with `finishing` true; the recovery is reached synchronously mid-drag with `finishing` false. One fixture cannot be in both states.
3. **Opposite oracles.** M1SUPERSEDE is the POSITIVE recovery cell (home source ⇒ restore equals `ghostY`); M1SUPCROSS is the NEGATIVE one (browse source ⇒ no write at all). Folding the negative into M1SUPERSEDE would couple two mutants to one cell — reintroducing precisely the F1 masking shape these cells exist to close.

The plan's own statement of (1) in the §7 Mutation-cases row and the handoff is accurate.

### 4. The V1 jsdom clamp finding — INDEPENDENTLY REPRODUCED; the remedy's ALTITUDE is right, its SPECIFICATION is not

**Reproduced.** I re-probed the project's jsdom 29.1.1 directly (scratchpad, not in the repo). Measured:
`scrollTop` writes are stored verbatim (500 stored; `scrollHeight`/`clientHeight` both 0 and no clamp is
applied against them); adding a class whose computed `overflow` resolves to `hidden` leaves `scrollTop`
unchanged at 500; a write of 700 WHILE parked sticks at 700; the value survives the un-park. **The plan's
measurement is correct, and so is its consequence** — with no clamp, M1RESTORE and M1SUPERSEDE assert a value
that is already correct before the restore line runs, so both pass with the fix removed and their named
natural mutants cannot redden them. That is the standing `tests-must-be-able-to-fail` violation, and the plan
is right to make the fidelity blocking and a prerequisite (§10). Two further measured facts matter downstream:
`Element.prototype.scrollTop` IS a configurable accessor (so a write-observing override is possible), and
`Element.prototype.scrollTo`/`scrollIntoView` do not exist in jsdom at all.

**M1FRESHNAV's exemption is correct.** It survives with no shim because nav.js:140 writes
`$('home').scrollTop = 0` in shipped code on a `resetScroll` nav — an explicit write, not a clamp. Verified at
nav.js:140. Worth keeping the reason in the record so the exemption is not "fixed" later.

**Altitude: harness-level is the RIGHT altitude, and the masking risk is empirically near-zero.** A per-fixture
zeroing step is a rule someone must remember at the moment it applies, which is the shape that has already
failed three times in this campaign; the harness is where the environment belongs (StandardsDocument §4), and
the harness already owns comparable environment fakes. I had the whole `test/` tree swept for blast radius: **no
existing test would change outcome** if `#home.scrollTop` were zeroed the instant `.parked` lands. The reason is
structural rather than lucky — every existing `boot()`-based test that parks `#home` (swipe-stage6i.test.js
ABORT at 168-198, swipe-stage6e.test.js DP.browse-home at 266-287) asserts only on the class, never on
`scrollTop`; every test that sets a `#home.scrollTop` it cares about does so while home is the CURRENT,
un-parked screen (swipe-stage6i.test.js PTR at 210-228; swipe-stage6.test.js OB-home at 320-343, whose expected
value is the same 0 nav.js:140 already writes); and the ghost-scroll cells reach `#home` through their own bare
`JSDOM` (swipe-stage6i.test.js:271, 288-300), structurally outside a harness shim. The pull-to-refresh guard
also already short-circuits on the class before it reads the offset (`$('home').classList.contains('parked') ||
$('home').scrollTop > 0`, app.js:1316), so the shim moves PTR toward browser behaviour, not away from it.

The three specification defects are F4 and F5 below. The altitude is not the problem; the fidelity spec is.

**Does the write-observation oracle distinguish "restored to `ghostY`" from "never written"? — Partly, and not
where it is most needed.** Stated precisely: in the two cross-source cells the pair (residual `=== 0` AND no
write) IS the correct oracle for "the gate refused", and it is strictly stronger than the residual alone — but
with `ghostY = 800` the residual check already separates the mutant from the fix, so the write oracle is
defence-in-depth there rather than load-bearing. Its real value is a case the residual can never catch: a future
restore that writes 0 — harmless in value, but still a browse-source gesture touching `#home`, which is the
policy the source gate exists to enforce. What the write oracle does NOT do is prove the site was REACHED; a
cell that silently never arrives satisfies "no write" perfectly. That is the fixture guard's job, and the plan
correctly requires one for both cells (see F7 for the observable it should use). Keep all three — residual,
write, reachability — and do not let the write oracle be read as a substitute for the guard.

### 5. Mutant registration — the per-site reasoning is RIGHT; the mechanics have an unguarded hole (F3)

The plan's reasoning is correct on every point I could check. `tools/mutate.mjs` is an explicit anchor list of
`{name, file?, from, to, also?}` literal substitutions with no generative operators; a `from` that does not
occur prints `ANCHOR NOT FOUND for #<i> in <file> — mutation NOT applied` and exits 1 (mutate.mjs:740-743), and
`test/mutation-anchors.test.js` fails on rot by checking every part's `from` (including `also.from`, resolved
against `part.file || m.file || DEFAULT_FILE`) still occurs in its file. So the plan is right that the only
question for any mutant is whether its `from` exists in shipped source; right that the two cross-source mutants
are NATURAL (`cur.from.v === 'home'` is shipped text, and the substitutions to `dest.v === 'home'` and
`currentDesc().v === 'home'` are literally the pre-fix gates the 2nd KILL executed against); and right to refuse
a combined `also` mutant — `also` is for defence-in-depth pairs where reverting one half is UNCAUGHT, whereas
these two guards protect two different reveals with a cell each, so a combined revert would die to either cell
and prove nothing about the sibling. **F2's sharpening is also correct:** a design-revert has no shipped `from`,
so it fails both `mutate.mjs` and the anchors gate and must be an additive two-part mutant whose parts both
anchor; note additionally that the anchors file carries a SECOND gate — no mutation may be a no-op (`from ===
to`) — so both parts of that additive mutant must genuinely change their target.

What the plan does not address is F3.

### F3 — Structural (defect) — the two per-site mutants share identical anchor text, and `mutate.mjs` replaces only the FIRST occurrence with no uniqueness check
`mutate.mjs` applies a mutation as `byFile.set(f, src.replace(from, part.to…))` (mutate.mjs:745) —
`String.prototype.replace` with a string pattern, which replaces **the first occurrence only** — and nothing
anywhere counts occurrences. The two shipped guards are, per §4 of the plan,
`if (cur.from.v === 'home' && cur.ghostY != null) $('home').scrollTop = cur.ghostY;` (abort) and
`if (cur && cur.from.v === 'home' && cur.ghostY != null) $('home').scrollTop = cur.ghostY;` (recovery), so the
substring `cur.from.v === 'home' && cur.ghostY != null) $('home').scrollTop = cur.ghostY;` is **byte-identical at
both sites**, and the recovery site occurs FIRST in `js/app.js` (line ~444 vs ~1227). The plan's §7 mutation
column and the Curie handoff both specify these mutants as the bare gate substitution — "`cur.from.v === 'home'`
→ `dest.v === 'home'` at 1227, and → `currentDesc().v === 'home'` at 444". Registered literally that way, the
"abort" mutant mutates the RECOVERY site, dies to M1SUPCROSS, and reports as caught — while the abort gate is
never mutated at all and M1CROSSSRC is credited with killing a mutant it never saw. **This is the campaign's own
defect shape (a mutant/cell credited with a crossing it never drove) reproduced one level down, inside the
tooling built to detect it — and no gate catches it:** `mutation-anchors.test.js` only asserts the `from`
occurs (it does, at the wrong site); the no-op gate only compares `from` to `to`; and `mutation-sweep.mjs`
reports a COUNT of failures (`caught (${failures} failing)`, mutation-sweep.mjs:211), never WHICH cell killed
the mutant, so the sweep reads green over the mis-siting. **Required:** each of the two anchors must be a
per-site UNIQUE `from` — the full statement including its distinguishing prefix (`if (cur && cur.from.v` vs
`if (cur.from.v`) and its leading indentation, which is already this table's convention (see the PTR anchors at
mutate.mjs:620-624) — and Curie must confirm each `from` occurs EXACTLY ONCE in `js/app.js` before registering
it, since the tooling will not. State the expected killing cell beside each mutant name so a future sweep can be
read against intent.

### F4 — Structural (defect) — the prescribed clamp shim is specified against the wrong cause and in an ASYNCHRONOUS mechanism, and it under-models the half the design's own safety claim rests on
Three separable specification errors in the §7 fidelity note, each of which re-opens the hole V1 exists to close:
- **(a) The recommended mechanism is asynchronous.** The note recommends "a `MutationObserver` on `#home`'s class attribute that zeroes `scrollTop` when `.parked` lands". Measured in the project's jsdom: a `MutationObserver` callback does NOT run synchronously with `classList.add` — immediately after the add the value was still 123, and only after a microtask checkpoint did it become 0. The park happens inside `start()` during a synchronous `touchmove`; M1SUPERSEDE and M1SUPCROSS then drive a **second touch in the same synchronous run** with no awaited boundary in between. A fixture written that way sees NO clamp at the moment the recovery reads `#home.scrollTop`, so M1SUPERSEDE passes with the restore removed — the identical "cannot fail" defect, now hidden behind a shim that appears to fix it. **Required invariant: the modelled clamp must be observable SYNCHRONOUSLY at the instant the park lands**, i.e. keyed to the read/write rather than to an observer callback (or, if an observer is kept, every fixture must cross an awaited checkpoint between the park and the next assertion — a per-fixture discipline, which is what the harness altitude was chosen to avoid).
- **(b) The cause is mis-stated, and the mis-statement invites a shim that DOES mask real behaviour.** The note frames the gap as "a class whose computed `overflow` is `hidden` does not clamp `scrollTop`", inheriting Linnaeus's "an `overflow:hidden` box has no scroll offset" (probe §0/§3). That reason is false as a general fact: an `overflow:hidden` box is still a scroll container and IS programmatically scrollable, so a bare overflow flip would not clamp anything. The real clamp in this case is the geometry: active `#home` is a fixed box with BOTH insets (`top: calc(var(--safe-top) + 51px)` and `bottom: calc(…)`, css:128-129) so its content overflows a constrained height, whereas `#home.parked` sets `top: 0` with **no `bottom` and no `height`** (css:98-102) — the box becomes content-height, the scrollable overflow region collapses, and the offset is necessarily 0. The clamp is real, so M1's premise is untouched; but a shim keyed to computed `overflow: hidden` would be keyed to a non-cause and would fire on unrelated elements (`.browsepage.parked`, css:86, is a different rule on a different element the browser does not clamp this way). **Required: key the model to the specific park recipe on `#home` — the `.parked` class or the collapsed-height geometry — never to a generic "computed overflow is hidden ⇒ zero" environment rule.** This is the one way the harness altitude could genuinely mask real behaviour, and it comes from the mis-stated cause rather than from the altitude.
- **(c) The write-while-parked half is unmodelled, and one plan claim depends on it.** §4 asserts that when an external nav moves `dest` away mid-settle for a HOME-source gesture, "home is parked → the write clamps to 0 → harmless". That claim is TRUE on device (a content-height box has no scroll range, so any write clamps), but it is not true in jsdom (my probe: a write of 700 while parked stuck), and the recommended shim models only the clamp-on-park, not the clamp-of-a-write-while-parked. So a by-construction safety claim in the design is asserted, uncovered by any of the six cells, and actively contradicted by the environment the suite will run in. **Required: model both halves** (a single accessor on `#home.scrollTop` that reports/stores 0 while `.parked` is present satisfies (a), (b) and (c) at once, and subsumes the F5 recorder), **or** state the write-while-parked case explicitly as an uncovered device-owed residual in §8 rather than leaving it as an unqualified "harmless".

### F5 — Structural (defect) — the write-observation oracle is unscoped in two of three statements, and the cited precedent is the wrong mechanism
Two problems, both of which land on Curie:
- **Scoping.** M1CROSSSRC's fixture scopes it correctly ("no write to `#home.scrollTop` occurred **during the finalize**"), but the §7 fidelity note ("record writes to `#home.scrollTop` and assert NONE occurred") and M1SUPCROSS's fixture ("still 0 AND unwritten") are unscoped. Unscoped, the oracle is FALSE even with the fix in place, because at least two legitimate writes precede the assertion window: nav.js:140 writes `$('home').scrollTop = 0` on the Home tap, and the clamp shim's own zeroing write is itself a write to the same property. The literal oracle therefore yields a cell that cannot PASS — and the dangerous part is not the red, it is the natural repair: weakening it to "no NON-ZERO write" silently collapses the second oracle back into the residual-value oracle it was added to strengthen. **Required: the recording window must be armed after the external nav and closed around the restore site, and the three statements must say the same thing** (StandardsDocument §7 within-document scrub).
- **Mechanism.** The note says to mirror "the harness's existing `scrollTo` recorder". That recorder is a plain function-property replacement — `window.scrollTo = (x, y) => { log.calls.push(…) }` (app-harness.js:266) — which cannot work for `scrollTop`: it is an ACCESSOR on `Element.prototype` (confirmed present and configurable in my probe), and jsdom has no `Element.prototype.scrollTo` at all. The correct mechanism is an `Object.defineProperty` get/set override on the `#home` element, for which the repo already has precedent (`test/browse-decouple.test.js:264-266` does exactly this on `#browse`, pushing each write into an array; `test/browse-render-race.test.js:26-30` repeats the pattern). Naming the wrong precedent is the kind of detail that turns into an hour of dead ends. Note also that this same accessor is the natural home for F4's clamp, so one mechanism can serve both requirements.

### F6 — Weak (defect) — §7's cell-count sentence contradicts the six-cell arity it introduces
§7's summary paragraph opens "**SIX cells, each on a crossing no other cell reaches**" and then states "The
**four** M1 cells read `#home.scrollTop` after the reveal (not a record); the two cross-source cells
additionally observe that no write happened at all." There are FIVE M1 cells (M1RESTORE, M1FRESHNAV,
M1SUPERSEDE, M1CROSSSRC, M1SUPCROSS) plus M2ALIGN. "Four" matches neither reading: the two cross-source cells
ARE M1 cells, so "additionally" makes the correct figure five; and the non-cross-source M1 cells number three,
not four. It is a stale count from the pre-fold revision. Every other count in the plan is coherent — the gate
declaration's `blocking_questions` lists all six, §7's coverage block has six rows, §10 assigns three cells to
the abort site and two to the recovery site plus M2ALIGN, and the Required-evidence list names six. Fix the one
sentence.

### F7 — Note (recommendation) — name the observable the required fixture guard uses
Both cross-source fixtures require a guard that the site was really reached with `ghostY = 800`, phrased as
"the reveal really reported `ghostY=800`". That maps to a real observable, and it is worth naming so Curie does
not have to rediscover it: `cover.ghostY` is set from `cur.ghostY` (app.js:1154) and printed in the reveal
FLASH line as `ghostY=<n>` (app.js:1105), with established precedent for asserting on it
(`assert.match(line, /ghostY=\d/)`, test/swipe-gesture.test.js:387-389, and the `/ghostY=\?/` negative at
test/swipe-stage5-wiring.test.js:124). One timing caveat: that line is emitted by the reveal watcher's
`finish()`, which runs on a 500ms timer (app.js:1116) or early on the next `touchstart`/`mousedown`
(app.js:1120-1123) — a `click` from `h.tap` does not trigger it — so under `fakeTimers` the clock must be
advanced past 500ms to read the guard, AFTER the `scrollTop` assertions at 400ms. A simpler synchronous
alternative for M1SUPCROSS, which has no settle: assert the ghost clone's own
`transform: translateY(-800px)` (swipe.js:292) while the pane is still mounted. Either satisfies the invariant;
recommend Curie pick one per cell rather than inventing a third.

## Coverage — coverage re-stress (F3–F7)

- **F3** — no new cell; it is a defect in the mutation REGISTRATION that would mis-credit M1CROSSSRC. Verified by Curie at registration time: each `from` occurs exactly once in `js/app.js`, and the sweep is read against a stated expected-killing-cell per mutant.
- **F4** — gates M1RESTORE, M1SUPERSEDE and (via (a)) M1SUPCROSS; without it those cells cannot fail. Verified by removing the restore line and confirming each reddens — the plan's own §10 prerequisite, which is the right acceptance test for the shim and should be run as one.
- **F5** — gates the second oracle on M1CROSSSRC and M1SUPCROSS. Verified by the same mutant runs: with the per-site gate mutant applied, both the residual and the write assertion must fail; with the fix in place, both must pass.
- **F6** — no CI surface; a within-document count correction.
- **F7** — no CI surface; steers the fixture guard both cross-source cells already require.

### Prediction — where the coverage half breaks in execution if built as written

1. **F3 fires silently.** Curie registers both mutants on the bare gate expression, both apply cleanly to the recovery site, the sweep prints two `caught` lines, and the abort-site gate ships with no mutation-verified cell — the exact shape of all three prior failures, this time inside the mutation tooling where the sweep's own output conceals it.
2. **F4(a) fires next.** The `MutationObserver` shim lands, M1RESTORE (which crosses an awaited clock advance) reddens correctly on its mutant, M1SUPERSEDE (which does not) passes with the restore removed, and the suite reads as fully mutation-verified while one of the two restore sites is still ungated.
3. **F5 gets repaired the wrong way.** The unscoped write oracle fails on the shim's own zeroing write, and the cheapest repair — "assert no non-zero write" — passes review as a clarification while quietly removing the only assertion that catches a zero-valued policy violation.
4. **F4(c) leaves a device-owed claim reading as proven.** The "the write clamps to 0 → harmless" sentence in §4 stays unqualified, is contradicted by the test environment, and is covered by nothing — a small instance of the campaign's generator rather than a new class.

### Verdict — coverage re-stress: TEMPER (F3/F4/F5 blocking; the cells themselves are right)

The amended Coverage Model is materially better than the one the 2nd KILL walked through. The two new cells
are the right two, each genuinely drives the site it is credited with (traced through `abortRender`, the
`fwdStack` arming precondition, the real nav listener, and the identity guard), the two-cells-per-site call is
correct for three independent reasons, the per-site mutant rule is correct and correctly justified, V2 holds in
source, F1's ledger mis-credit is properly folded, and the two §7 verdict changes (Identities, Async
operations) are both justified rather than decorative. What is not yet safe is the MECHANICS: the two per-site
mutants are specified in a form that silently mutates one site twice (F3), the clamp fidelity is specified
against the wrong cause in an asynchronous mechanism that leaves M1SUPERSEDE still unable to fail (F4), and
the second oracle is specified unscoped and against the wrong precedent (F5). All three are cheap; all three
are the campaign's own defect generator, which is the reason to fix them here rather than discover them in the
sweep.

**The final Loki strike should PROCEED, and it does not need to wait on F3/F4/F5** — none of them touches the
design half, and the strike's plane is the ENUMERATION question. One input for it, from my own grep of `js/`:
the only shipped WRITER of `#home.scrollTop` today is nav.js:140; app.js:1316 and app.js:1323 are pull-to-refresh
READS. So the enumeration the plan must defend is not "which assignments exist" — that set is small and known —
but which mechanisms move the OBSERVABLE without an assignment: the park's own geometry clamp (F4(b)), the
un-park, and anything that scrolls `#home` implicitly. That is the durable lesson the 2nd KILL filed, and it is
the right target.

M2 stays FORGE'd. The red `--page-bg` gradient (css:41) is untouched. Flash C is out.

VERDICT: TEMPER
