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

---

## RE-STRESS of the REPLACED M1 (design AND coverage) â€” plan HEAD `afe54b8` (2026-07-29)

Scope: the M1 half in full â€” the V3 cascade derivation (Â§4.1), INVARIANT P and the two deletions (Â§4.2),
the closure-by-removal argument (Â§4.3), the rejected witnesses (Â§4.4), the six re-cut cells (Â§7.1), the
inverted fidelity prohibition (Â§7.2), the tooling remedy and the two live non-unique anchors (Â§7.3) â€” plus
the two disclosed edits inside M2's text. **M2's DESIGN stays FORGE'd and is not revisited.** Flash C out;
the red `--page-bg` gradient (css:41) untouched; read-only throughout (no tooling built, no code edited).

**The previous design-half approval does not carry, and neither does my own F4(b).** Vitruvius falsified
F4(b) and is right to: `.parked` declares no `bottom`, and in CSS a rule cannot un-declare a property, so
`#home`'s `bottom` (css:129, or css:136 under `body.has-player`) applies to a parked home and the box is
inset-sized, not content-sized. My substitute cause was wrong in the same direction as the deriver's
(both predicted a total loss). I applied the same skepticism to the replacement and it survives â€” see Â§A.

### A. The Â§4.1 derivation â€” HOLDS on every point I could reach in source, including one nobody had checked

Verified at HEAD, from `css/app.css` and `index.html`:

1. **The rule set is complete.** Exactly three rules can match a parked `#home`: `#home` (css:126-135),
   `#home.parked` (css:98-103), `body.has-player #home` (css:136), plus the scrollbar-hiding rules
   (css:772-775). No `@media` variant, no other selector, and no JavaScript writes `top`, `height` or
   `overflow` inline â€” `resetSwipeStyles` (nav.js:114-120) clears only `transform`, `transition`,
   `willChange` and `zIndex`. Confirmed by reading the rules and by grep over `js/`.
2. **`.parked` declares no `bottom`, `height`, `min-height` or `max-height`** (css:98-103) â€” confirmed
   verbatim. `#home` declares `top: calc(var(--safe-top) + 51px)` and
   `bottom: calc(var(--nav-h) + var(--nav-pad))` (css:128-129) â€” confirmed verbatim. So `bottom` cascades
   onto a parked home and the only geometric delta is `.parked`'s `top: 0`. **The cascade reading is
   correct.**
3. **`clientHeight_parked = clientHeight_active + (var(--safe-top) + 51px)`.** A `position:fixed`
   non-replaced box with both `top` and `bottom` set and `height:auto` has its height solved from the
   insets (CSS 2.1 Â§10.6.4) â€” universal, not engine-specific. `box-sizing: border-box` applies globally
   (css:24), no borders exist on either rule, and scrollbars are width/height 0 on `#home`
   (css:772-775), so `clientHeight` equals the inset-solved box height in both states. **Holds.**
4. **`scrollHeight` is identical parked and active â€” VERIFIED, not assumed, and this is the check nobody
   had run.** The claim only holds if no `#home` descendant sizes off `#home`'s own height; otherwise the
   taller parked box would grow the content too and partially cancel the delta. I read `#home`'s subtree
   (index.html:48-59): two `.section-title`, two `.statusline`, three `.carousel` rows and the
   `#dlSection` wrapper. None carries a percentage or viewport height; the only `height: 100%` rules in
   the stylesheet that could appear inside a card (`.tile .progress > i`, css:390) resolve against a
   fixed-height parent, not against `#home`. Content width, `padding-left/right`, `padding-top` and
   `padding-bottom` are identical in both states (`.parked` restates the two horizontal paddings at the
   same `16px`; it declares no block padding, so `#home`'s `padding: 14px 16px 40px` â€” or css:136's
   `padding-bottom: 20px` with a player â€” governs both). **So `scrollHeight` is height-independent and
   identical. Holds.**
5. **`maxScroll_parked = maxScroll_active âˆ’ (safe+51)`, and the clamp formula at Â§4.1 line 118 is
   correct** â€” including the inner `max(0, â€¦)`, which is what makes it right in the short-range case.
6. **`body.has-player` composes correctly.** With a player, `bottom` is css:136's value in BOTH states
   (`.parked` declares no `bottom`, and css:136 has higher specificity than `.parked` anyway), and
   `padding-bottom` is 20px in both. The delta stays exactly `safe+51`. A player appearing mid-park
   shrinks the box and *grows* max scroll â€” no clamp. **Holds.** (One precision gap: a player
   *disappearing* mid-park grows the box and does clamp, by up to 106px. Post-fix that is identical for a
   parked and an active home, so it is existing behaviour rather than a park effect â€” but Â§7's Composition
   row states only the appearing case. Recorded in F17.)
7. **A zero `--safe-top`** (no notch) makes the delta exactly 51px. The derivation is parameterized in
   `var(--safe-top)` throughout and does not depend on its value. **Holds.**
8. **A reachable state that collapses the range to ZERO â€” yes, and the plan names it.** When home's
   content height falls between `clientHeight_active` and `clientHeight_parked`, `scrollHeight_parked`
   degenerates to `clientHeight_parked` and `maxScroll_parked` is 0, so the whole offset is lost. The plan
   states this ("the full `scrollTop` only when home's entire scroll range is smaller than `safe+51`px â€” a
   short library, which is a real and reachable case"). **A second route I checked: content changing while
   parked.** `home-screen.js` re-renders `#clRow`/`#raRow` and unhides `#dlSection` (home-screen.js:52,
   76-77, 118-120; cleared at app.js:1436-1437), so home's content height can change while parked and
   trigger a fresh clamp against the taller box. Post-fix that clamp is identical to an active home's, so
   it is park-neutral. Neither route falsifies the derivation.
9. **An engine that discards the offset on `overflow:hidden` despite the spec** â€” not reachable in source
   and not measurable in jsdom; the plan marks it [UD] and, critically, the fix removes the dependency by
   deleting the declaration. This is the one place the magnitude claim is exposed (F13), not the fix.

**Is the magnitude claim right? Bounded â€” yes; the loss expression as written â€” no.** The bound "at most
`var(--safe-top) + 51px`" holds universally, and "the loss does not scale with scroll depth, it saturates"
is correct: `loss = max(0, scrollTop âˆ’ K)` with `K = max(0, maxScroll_active âˆ’ (safe+51))`, so it is zero
below `K`, rises 1:1 across the last `safe+51`px of the range, and caps there. The expression printed at
Â§4.1 line 120 and in the headline, `max(0, scrollTop âˆ’ (maxScroll âˆ’ (safe+51)))`, drops the inner
`max(0, â€¦)` that line 118 has and therefore over-states the loss in exactly the short-library case the
prose gets right (F11).

### B. Deleting `overflow: hidden` â€” the trade is RIGHT; delete BOTH, not `top: 0` alone

I stressed every side-effect axis the brief names, and the deletion adds no new surface:

- **It creates no new input path.** An `overflow:hidden` box is already a scroll container and is already
  scrolled by a descendant `scrollIntoView` or a focus reveal. So that hazard exists at HEAD and is
  *unchanged* by the deletion â€” which is the strongest argument for it. Independently, nothing in `js/`
  focuses or scrolls into a `#home` descendant: the only `.focus()` calls are `debug.js:432` and
  `debug.js:571`, both on a textarea appended to `document.body`.
- **It creates no new user-scroll path.** The parked box keeps `pointer-events: none`, `z-index: 0` and
  `transform: translateX(-101vw)`; scrollbars are width/height 0 (css:772-775); there is no wheel on the
  target platform; `overscroll-behavior: contain` (css:132) cascades onto the parked box after the
  deletion exactly as it does today, so chaining is bounded either way.
- **`overflow-x` does not differ from the active box.** `#home` declares only `overflow-y: auto`, so
  `overflow-x` computes to `auto` (a `visible` value beside a non-`visible` sibling computes to `auto`).
  Post-deletion the parked box matches the active box on both axes. Nothing new can appear parked that
  does not already appear active.
- **It does not weaken `.parked`'s stated purpose.** The comment at css:92-97 attributes warm decoded
  covers to *being painted at all* (a `will-change` compositing layer instead of `display:none`);
  `overflow` plays no part in it. The `top: 0` deletion does shrink the painted region by `safe+51`px â€”
  but post-fix the parked box is geometrically identical to the active box at the same offset, so the
  painted region becomes exactly the region about to be revealed. That is a small improvement in warmth,
  not a regression. (The device gate should still be told what to look at â€” F17.)
- **And it is what makes INVARIANT P hold by construction.** Keeping `overflow: hidden` would leave the
  entire fix resting on one unverifiable engine claim â€” that WebKit retains the offset on a `hidden` box â€”
  which is precisely the class of claim this campaign has now been wrong about twice. Vitruvius's stated
  reason ("not because it is proven to clamp but because keeping it makes P depend on an unverifiable
  browser claim") is the correct reason, and `top: 0` alone would be the looser change, not the tighter
  one. **Delete both.**

### C. Deleting `top: 0` â€” regression surface: none I can find in source

- **Nothing visible or behavioural.** The parked box is translated `-101vw`, `pointer-events: none`, and
  at `z-index: 0` beneath every other layer. Moving its top edge from `0` to `calc(var(--safe-top)+51px)`
  changes only which off-screen band it occupies.
- **The abort-flash mitigations are untouched.** `will-change: transform` stays verbatim in BOTH rules
  (css:102 and css:134) â€” the `.256` device-validated form, and the plan's Â§2 STAYS pins it. The layer
  identity the css:104-112 contract cares about (fixed, transformed, `will-change`) is unchanged. What
  changes is the box's height and its overflow, and the plan routes that to R-M1-flash rather than
  claiming it clean. Correct handling.
- **The ghost geometry M2 targets is unaffected.** The builder clones `.app`, strips ids (swipe.js:277)
  and removes `.parked` nodes outright (swipe.js:279), so the park recipe cannot reach the clone. M2's
  constant and M1's deletions are genuinely independent.
- **`.browsepage.parked` (css:86) is correctly left alone** â€” a different element with an in-flow model
  and no `bottom` inset of its own to inherit. But after M1 the two park rules DIVERGE with nothing saying
  why, and "symmetrizing" them is exactly what a future editor would do (F17).

### D. The closure-by-removal argument and the rejected witnesses â€” both sound

Â§4.3's claim is structural rather than enumerated, and it holds: with no deferred write there is no
interleaving that can land one. I re-verified the one link that carries it for the 3rd KILL's own
interleaving â€” the abort finalize's `applyScreen(dest, { render: â€¦, resetScroll: false })` at app.js:1227
makes no scroll write at all, because nav.js:140's reset is gated on `resetScroll` â€” so the Home tap's
deliberate `scrollTop = 0` stands. Â§4.4's rejection of W-B is correct against shipped source: app.js:520
does `$('home').classList.remove('parked')` with no `applyScreen` call, so `applyScreen` is not the only
reveal choke point and a nav-epoch witness fails open there. W-A's three defects are all real (the
`dropPanes()`-at-1213-before-1227 and `disposeOwnedPanes`-at-442-before-444 orderings, the
inference-from-absence, and `begin()`'s `.nav-ghost.spent` sweep at app.js:393). Recording both as
REJECTED with reasons is the right disposition.

### E. F4's RETIREMENT is correct; F5's window scoping is airtight

**Retiring F4 is right, and a CSS-only fix does not need a fidelity cell.** With no restore line, no cell
asserts a restored value, so there is no subject for a shim to be mis-keyed or made asynchronous against.
The inversion into a PROHIBITION is the correct reading of the same measurement: jsdom stores `scrollTop`
verbatim and never clamps, so a "the scroll survives the park" cell would pass regardless of what
`#home.parked` declares â€” vacuously green. What CI can prove honestly is the RECIPE (a static stylesheet
read, which no environment can make vacuous) and the WRITE SET (observations, which need no clamp). There
is no third thing jsdom could prove about this fix: it does no layout and does not resolve `calc()` against
`env()`, so a computed-geometry cell would be a fiction. The preservation is correctly device-owed.

**F5's two windows are airtight for M1NAVWINS, and I verified the count.** Window A is the Home tap: the
navbar listener (app.js:2873-2879) calls `goHome()` â†’ `navTo({v:'home'}, null)` (app.js:155) â†’ because
`currentDesc().v` is still `'home'` on an aborted gesture, navTo takes the same-view replace-top branch
(app.js:140) and calls `applyScreen(desc)` **once** with defaults, so nav.js:140 writes 0 **exactly once**;
`anim` is `null` so no `slideInView` runs and nothing else on the path touches the property. **"Exactly one
write of value 0 in window A" is correct as specified.** Window B is the clock advance that fires the
340ms `settleTimer`; nothing writes between the abort lift and the arming, so A and B are contiguous and
exhaustive. The mechanism citation is also correct: `test/browse-decouple.test.js:260-266` is exactly the
`Object.defineProperty(el, 'scrollTop', {configurable:true, get, set})` write-recorder the note prescribes,
and the `window.scrollTo` recorder at app-harness.js:266 is correctly named as the wrong precedent. One
gap worth stating rather than fixing: the reachability guard requires advancing past 500ms *after* the
window-B assertions, which opens an unnamed third interval â€” say explicitly that no write is asserted
after B, so a future reader does not treat the guard advance as part of B.

### F. The re-cut coverage â€” the cells are the right six, but two of them do not do what the plan says

M1NOWRITE and M1NAVWINS genuinely drive the sites they are credited with (`abortRender` is `'none'` for
homeâ†’browse â€” swipe.js:186 â€” so the held early-return at app.js:1200 is not taken and control reaches
app.js:1223-1229), their mutants are correctly typed (M1NOWRITE natural, M1NAVWINS additive), and the
app.js:444 recovery site is honestly **not credited to any cell** â€” Â§7's Recovery-authority row says so
explicitly and routes the negative claim to M1WRITERSET file-wide, which is the correct answer to my own
F1 masking shape rather than a repeat of it. Counts are coherent everywhere I checked: the gate
declaration's `blocking_questions` (6), Â§7.1's rows (6), the "SIX cells" sentence, Â§7's Invariants row
(i)-(v), Â§10's sequencing (1 + 1 + 4), the Required-evidence list, and the Curie handoff all agree. My F6
is resolved. **The two defects are in M1PARKRANGE and M1WRITERSET â€” F8, F9 and F10 below.**

### G. The two live non-unique anchors â€” both confirmed, and Vitruvius's correction of the brief is right

- **`#24`** â€” `window.scrollTo(0, cur.scroll0);` occurs **three times** in `js/app.js`: 445 (recovery,
  inside `if (cur) `), 1203 (held abort, followed by `mark('restored')`), 1228 (no-hold abort, preceded by
  the `applyScreen(dest, â€¦)` statement). 445 is FIRST, so first-occurrence-wins mutates the recovery and
  neither abort restore has ever been proven able to fail. The plan's three disambiguating contexts each
  match source exactly. Remedy correct.
- **`#42`** â€” `    if (KINDS.indexOf(c.fromKind) === -1) {` occurs **twice** in `js/swipe.js`, at 140
  (`constructionPlanFor`) and 180 (`finalizationPlanFor`). The intended site is 140 and it is first, so
  the `caught` is legitimate by source order only. The unique re-anchor the plan names exists:
  `throw new Error('Swipe.constructionPlanFor: unhandled source kind "' â€¦` at swipe.js:141.
- **Vitruvius's correction of the dispatcher's brief is CORRECT.** The comment at mutate.mjs:467-470 is
  not false: it accurately states that BC-1a's own anchor (the `finalizationPlanFor` throw line) is unique
  and accurately warns that the bare `if (KINDSâ€¦)` line is shared. The defect is that sibling entry `#42`
  anchors on precisely that shared line, so the comment reads as if the hazard were handled where it is
  not. Confirmed.

### H. The two disclosed M2 edits â€” both FAITHFUL to F1 and harmless

- **The Â§3 clause "Weight the â‰ˆ46 measurement over the 53 headline (Charpy F1)."** Faithful. My F1 said
  exactly that, and the sentence adds nothing beyond it: it steers Brunel's measurement without changing
  the fix, the derivation, the candidates, or the device gate. It is also correctly placed â€” inside the
  paragraph that already names both candidates and defers to the device measurement, so it reads as a
  weighting of an existing open choice rather than a new commitment. M2's mechanism is untouched.
- **The `M2ALIGN` row gaining `NATURAL` and an expected-killing-cell label.** Faithful and harmless. The
  mutation's content is byte-unchanged ("the builder reverts to the in-flow forty-six pxâ€¦"); the row only
  adopts the labelling convention Â§7.1 now applies to all six mutants, and the label is correct (reverting
  a shipped constant is a natural substitution, and M2ALIGN is the cell that reads that constant).
  M2ALIGN's oracle stays value-agnostic ("the fixed-inset-aligned value â€¦ not the string forty-six px"),
  which is what my F1 asked for.

**Neither edit re-opens M2's mechanism, and I raise no finding against them.** Keeping them was the right
call; had either changed the fix or the candidate set, the correct disposition would have been to strip it
and route it back.

### F8 â€” Structural (defect) â€” M1PARKRANGE as specified CANNOT PASS on the prescribed fix, and its forbidden-property list is a denylist that already has holes
Two problems in one cell, both of which get "repaired" the same cheap way.

**(a) The second clause fails on `z-index`.** The cell must assert "every declaration it does carry is
either absent from the `#home` block or byte-identical to the value `#home` sets." After the fix
`#home.parked` carries `z-index: 0` while `#home` carries `z-index: 20` (css:130) â€” neither absent nor
byte-identical â€” so the clause is FALSE on the very implementation Â§4.2 prescribes, which explicitly says
to KEEP `z-index: 0`. Every other retained declaration passes (`position`/`left`/`right`/`max-width`/
`margin` restate `#home`'s values; `will-change: transform` is byte-identical to css:134; `transform` and
`pointer-events` are absent from `#home`). A cell that cannot PASS is repaired by whoever hits it, and the
cheapest repair is to drop the second clause â€” which deletes the only half that stops a geometry property
returning under a different name.

**(b) The first clause is a denylist and misses reachable equivalents.** Forbidding `top`, `bottom`,
`height`, `min-height`, `max-height`, `overflow`, `overflow-y` does not catch `inset: 0` (which re-adds
`top: 0` *and* overrides the inherited `bottom`), `inset-block`, `block-size`/`min-block-size`/
`max-block-size`, `margin-top`, or `translate`. Any one of them re-introduces the defect while the cell
stays green â€” a gate credited with an invariant it does not enforce, which is this campaign's own
generator.

**Required (one remedy fixes both): invert the second clause into an ALLOW-LIST.** Assert that
`#home.parked` declares NOTHING outside an explicit permitted set, and name the set as the park's four
effects (`transform`, `pointer-events`, `z-index`, `will-change`) plus whichever `#home`-restating
declarations Brunel elects to keep under Â§4.2's recommendation. An allow-list makes the forbidden list
unnecessary, cannot rot as new CSS properties appear, and passes on the prescribed fix. **Also specify
whether the comparison expands shorthands** â€” `.parked`'s `padding-left/right: 16px` versus `#home`'s
`padding: 14px 16px 40px` is exactly the ambiguous case, and it decides whether the cell reads
`padding-left` as absent or as byte-identical.

### F9 â€” Structural (defect) â€” M1WRITERSET's stated HEAD registered set is incomplete against its own stated derivation, so the gate is RED at HEAD and the cheap repair blinds it
The cell derives "every textual write to a `scrollTop` property and every `scrollTo`, `scrollBy` and
`scrollIntoView` call site" over `js/` and fails on any derived site that is not registered. The plan
states the HEAD registered set as seven entries: nav.js:140, nav.js:147, browse.js:228, browse.js:658,
browse.js:845, virtuallist.js:304, debug.js:533. My own derivation over `js/` finds those seven â€” the
five `scrollTop` writes are exactly nav.js:140/147, browse.js:228/658 and debug.js:533, so the WRITE half
of the inventory is complete and correct â€” **but at least seven further sites match the plan's own
`scrollTo` pattern and are unregistered**: `window.scrollTo(0, cur.scroll0)` at app.js:445, 1203 and 1228;
the reveal watcher's REPLACEMENT of the API itself at app.js:1174 and its restore at app.js:1186; and the
two calls of browse.js:845's local `scrollTo` helper at browse.js:860 and 862. Registered literally as
specified, the gate is red the moment it lands, and the cheapest repair is to narrow the pattern â€” drop
`scrollTo`, or exclude `app.js` â€” which removes `scrollIntoView`-class coverage, i.e. precisely the
residual R-writer-enum names as the highest-value target for the next adversarial pass. **Required: state
the derivation's SCOPING RULE before the baseline** â€” the inventory is of movers of an ELEMENT's vertical
scroll, and `window`-targeted document scrolls are a separate registered class whose registration records
why they cannot reach `#home` (window scroll is always 0 on the signed-in app views now that both `#home`
and `#browse` are fixed â€” the reasoning already recorded at css:146-149) â€” **then complete the baseline
against that rule, and give every entry an owner AND a one-line reason it cannot move `#home`.** The
app.js:1173-1186 monkey-patch of `window.scrollTo` deserves its own entry: a gate that inventories an API
while shipped code replaces that API at runtime must say so, or the next reader deletes the pattern.

### F10 â€” Structural (defect) â€” "the writer set of `#home`'s vertical scroll is exactly one, BY CONSTRUCTION" over-claims what any textual gate can prove, and a live, textless mover exists
Â§7's Identities row and Invariants (iii) both assert the writer set is one "by construction", and Â§4.3
leans on that wording to convert the 2nd KILL's durable lesson "from judgment into a failing gate". A
static derivation cannot support "by construction", and the gap is not hypothetical: **browser scroll
anchoring moves `#home.scrollTop` with no API call and no text of any kind for a pattern to find.**
`overflow-anchor` is not set anywhere in `css/app.css`, so it is at its `auto` default on `#home`, and
`#home`'s content height genuinely changes underneath a scroll position â€” `home-screen.js` re-renders
`#clRow` and `#raRow` and toggles `#dlSection` between hidden and shown (home-screen.js:52, 76-77,
118-120), and app.js:1436-1437 clears both rows. A refresh landing while home holds a non-zero offset
therefore adjusts that offset, parked or not, with nothing in `js/` to derive. This does NOT falsify
INVARIANT P â€” post-fix the parked box is geometrically identical to the active box, so anchoring behaves
the same in both states and the park stays scroll-neutral â€” and it is not a defect in the fix. It is a
defect in the **claim**: R-writer-enum names "a scroll-moving API the gate's patterns do not name" and
lists a descendant `scrollIntoView`, a focus scroll and a dynamic target, all of which are at least API
calls; it does not name the one mover that needs no API at all and is demonstrably live. **Required:
(i) state the invariant at the bound the gate actually proves** â€” the set of code paths that TEXTUALLY
move `#home`'s vertical scroll is exactly one â€” and drop "by construction" from the Identities row,
Invariants (iii), Â§4.3 and the handoff (StandardsDocument Â§7 within-document scrub: the phrase appears in
four places); **(ii) register scroll anchoring in R-writer-enum as a NAMED non-textual mover, routed to
device/judgment rather than to the gate.** Setting `overflow-anchor: none` on `#home` would close it but
is a behaviour change outside this plan's scope â€” do not fold it in without a decision.

### F11 â€” Weak (defect) â€” Â§4.1's loss expression drops the inner `max(0, â€¦)` that its own clamp formula carries
Line 118 states the clamp correctly:
`scrollTop_after = min(scrollTop_before, max(0, maxScroll_active âˆ’ (safe+51)))`. Line 120 and the headline
then state the loss as `max(0, scrollTop âˆ’ (maxScroll_active âˆ’ (safe+51)))`, which omits the inner
`max(0, â€¦)` and therefore yields a loss GREATER than `scrollTop` whenever
`maxScroll_active < safe+51` â€” impossible, and exactly the short-library case the same paragraph
describes correctly in prose. The exact expression is
`loss = scrollTop âˆ’ min(scrollTop, max(0, maxScroll_active âˆ’ (safe+51)))`. The BOUND ("at most
`safe+51`px") and the saturation claim are both correct under the exact expression and need no change; fix
the two printed formulas (Â§4.1 line 120 and the headline paragraph, which restates it).

### F12 â€” Weak (defect) â€” the Â§1 record row states a false specificity relation between `#home.parked` and `body.has-player #home`
The V3 row (Â§1, the `.parked` cascade entry) says `bottom` cascades "from `#home` (or from
`body.has-player #home`, equal specificity and later in source order)". The specificities are not equal:
`body.has-player #home` is (1 id, 1 class, 1 type) and `#home.parked` is (1 id, 1 class, 0 types), so
css:136 is HIGHER, not tied, and source order is not what decides it. The conclusion is unaffected â€”
the two rules declare no property in common, so nothing turns on which would win â€” but the stated reason
is wrong, and a wrong cascade reason in the record is what produced the two false cause statements this
pass just replaced. State it as: css:136 has higher specificity than `#home.parked` and declares
`bottom` and `padding-bottom`, neither of which `.parked` declares, so both apply to a parked home.

### F13 â€” Weak (recommendation) â€” the headline and Status assert the bounded magnitude without the [UD] hedge Â§4.1 carries, and nothing records that M1 has never been observed
Two calibration gaps that matter for how the device pass will be read.
**(a)** The title and Status state the magnitude as settled ("The park loses `max(0, â€¦)` â€” at most
`safe+51`px", "a bounded â‰¤`safe+51`px loss"), while Â§4.1 correctly marks the premise it rests on as [UD]:
"whether WebKit conforms on that point is not measurable in jsdom and is device-owed." If WebKit does NOT
retain the offset under `overflow: hidden`, the pre-fix loss is the FULL `scrollTop` and the headline's
magnitude is wrong. **The FIX is robust to that outcome â€” deleting `overflow: hidden` closes that channel
too â€” but the MAGNITUDE CLAIM is not**, and the two are stated with the same confidence. Hedge the
headline to match Â§4.1, or state that the bound holds conditional on offset retention and that R-M1-cause's
BEFORE reading is what settles it.
**(b)** The only observation that exists is silent on M1. The Linnaeus probe records the reported case at
`ghostY=0` â€” home at the top â€” with the shift persisting, and Â§1 of the probe itself notes that at
`scrollTop=0` M1 contributes nothing. So M1 is a DERIVED defect that has never been observed, and the new
magnitude does not conflict with the report because the report does not reach it. Recording that plainly
matters: it makes R-M1-cause's before/after reading the FIRST observation of M1 rather than a confirmation
of it, and it forecloses reading a small measured loss as evidence the fix failed.

### F14 â€” Note (defect) â€” M1NOWRITE's natural mutant anchor is FIVE-way non-unique, the third live instance of the F3 hazard
M1NOWRITE's declared mutant flips the abort finalize's `resetScroll: false` to `true` at app.js:1227. The
substring `resetScroll: false` occurs five times in `js/app.js` â€” 1201 (the HELD abort path), 1227 (the
intended site), 2625, 3127 and 3220 â€” with 1201 FIRST. Registered as the bare flip it would mutate the
held path, and since M1NOWRITE's fixture takes the no-hold branch (`abortRender` is `'none'` for
homeâ†’browse, swipe.js:186) the intended gate would never be mutated at all. Â§7.3's blanket "each must be
confirmed unique at registration (now mechanically)" does cover it once MUTUNIQ lands, and this is a third
independent instance of the hazard, which further justifies Â§10 sequencing the tooling remedy first. Worth
naming rather than leaving to the tool: the disambiguating context is the whole statement including its
`render: cur.finPlan.abortRender === 'rerender', ` prefix, which is unique.

### F15 â€” Note (defect) â€” the Â§6 ledger credits M2ALIGN with a crossing it does not assert
The ledger's fifth row gives `outgoing ghost capture ghostY` the verification "M2ALIGN cell plus the
existing swipe suite". M2ALIGN builds the app-ghost and asserts the CLONE's `#library` padding; it makes no
assertion about `ghostY`. The honest verification for that crossing is the existing swipe suite alone
(`test/swipe-gesture.test.js:387-389` asserts the reveal's `ghostY=<n>`). The row's prose is honest â€” it
exists to record that this plan REMOVES a consumer â€” so the fix is to drop `M2ALIGN` from that one cell.
Small, but it is the same false-credit shape as my F1 and it sits in the ledger a future audit reads first.

### F16 â€” Note (recommendation) â€” M1NAVWINS's mutant declares two expected killing cells without saying whether both must redden
Â§7.1's M1NAVWINS row ends "expected killing cells M1NAVWINS and M1NOWRITE". Both would in fact redden on
the additive design-revert: the appended restore writes `cur.ghostY` inside window B, which breaks
M1NAVWINS's "zero writes in B, still 0" and also M1NOWRITE's "zero writes in B" (M1NOWRITE's VALUE
assertion still passes, since the injected write restores the same seeded value it asserts). That is
honest, but the sweep-reading rule the plan introduces â€” read the result against the declared expected
killing cell â€” is ambiguous for a two-cell declaration. State whether the expectation is BOTH or AT LEAST
ONE; a mutant that only its sibling cell kills is the masked-cell shape these declarations exist to expose.

### F17 â€” Note (recommendation) â€” three small precision gaps around the park-recipe change
- **`.browsepage.parked` divergence.** After M1, css:86 keeps `top: 0` and `overflow: hidden` while
  css:98 has neither, and nothing says why. The asymmetry is correct (a `.browsepage` is in-flow and has no
  `bottom` inset to inherit), but it is invisible at the edit site and "symmetrizing the two park rules" is
  the obvious future edit. Ask Brunel for a one-line comment in `#home.parked` stating the invariant and
  why `.browsepage.parked` does not share it.
- **R-M1-flash should name the mechanism it wants looked at.** The risk currently says "what changes is
  the parked box's height and its overflow". The concrete consequence is that the parked box's PAINTED
  region changes â€” and, verified above, it changes toward warmth: post-fix the painted band equals the band
  about to be revealed. So the device check is looking for a cover re-decode at the bottom edge of home
  after an abort from a scrolled position, not a whole-view flash. Naming that is the difference between a
  device pass that can fail and one that reports "looked fine".
- **Â§7's Composition row covers only the player APPEARING mid-park.** A player *disappearing* mid-park
  grows the box by 106px and does clamp. Post-fix that is identical for a parked and an active home, so it
  is park-neutral and not a defect â€” state it, so the row's claim is complete rather than one-sided.

### F18 â€” Note (recommendation) â€” expect at least one of `#24`'s three per-site mutants to be UNKILLABLE, and say what happens then
All three `window.scrollTo(0, cur.scroll0)` sites write the DOCUMENT scroll, and `cur.scroll0` comes from
`env.scrollY()`, which is always 0 now that both `#home` and `#browse` are fixed own-scroll views (the
reasoning recorded at css:146-149). So each call is effectively `window.scrollTo(0, 0)`, and its removal is
observable only through the harness's `window.scrollTo` call recorder (app-harness.js:266), not through any
effect. Splitting `#24` into three entries will therefore produce three mutants whose killability depends
entirely on whether a cell asserts the RECORDED CALL at that specific site â€” and the recovery site
(app.js:445) has no such cell today. **A surviving mutant turns the sweep red with no instruction
attached.** Say in Â§7.3 what the correct response is: either a cell that asserts the call at that site, or
deletion of the vestigial call, or an explicit registration as known-inert â€” but not silent re-merging of
the anchors, which would restore the false green the split exists to remove.

## Coverage â€” the M1 re-stress (F8-F18)

- **F8** (blocking) â€” gates M1PARKRANGE, the cause-level cell. Verified by running the cell as specified
  against the POST-FIX stylesheet and confirming it FAILS on `z-index: 0` (it must pass), and by adding
  `inset: 0` to `#home.parked` and confirming the allow-list form FAILS while the denylist form passes.
- **F9** (blocking) â€” gates M1WRITERSET. Verified by running the derivation as specified over `js/` at
  HEAD and confirming the registered set accounts for EVERY derived site, with the scoping rule stated
  before the baseline rather than inferred from it.
- **F10** (blocking) â€” no new cell; a claim-calibration defect plus a named residual. Verified by the
  absence of "by construction" from the four places that currently assert it (Identities row, Invariants
  (iii), Â§4.3, handoff) and by scroll anchoring appearing in R-writer-enum as a non-textual mover routed
  to device/judgment.
- **F11, F12** â€” no CI surface; two corrections inside the derivation's own statement (a formula, a
  cascade reason). Verified by reading Â§4.1 and the Â§1 record row.
- **F13** â€” no CI surface; a hedge on the headline/Status magnitude and one recorded fact (M1 is
  unobserved). Verified against Â§4.1's own [UD] and the probe's `ghostY=0` case.
- **F14** â€” no new cell; a registration detail that MUTUNIQ will catch mechanically once it lands, named
  so it is not discovered as a red sweep.
- **F15** â€” no CI surface; one cell name dropped from one ledger row.
- **F16** â€” no CI surface; the sweep-reading rule for a two-cell mutant declaration.
- **F17** â€” no CI surface; a source comment, the R-M1-flash observable, and a one-sided Composition claim.
- **F18** â€” no new cell unless the answer chosen is "add one"; a stated response to an expected surviving
  mutant.

### Prediction â€” where this breaks in execution if built as written

1. **M1PARKRANGE lands red on `z-index` and is repaired by deletion** (F8). Brunel writes the cell, it
   fails on the very fix it is meant to lock, the second clause goes, and `inset: 0` becomes a silent way
   to re-add the defect â€” the cause-level cell reduced to a single denylist assertion.
2. **M1WRITERSET lands red on seven unregistered `scrollTo` sites and is repaired by narrowing the
   pattern** (F9). `scrollIntoView` leaves the derivation, and the residual R-writer-enum calls the highest
   value target for the next strike is the one the gate stops looking at.
3. **"By construction" survives into the subsystem record** (F10), and the next session reads the writer
   set as closed. A home refresh that re-renders the carousels while home holds an offset moves that offset
   with nothing in `js/` to derive, and the gate is green over it.
4. **The device pass reads a small measured loss as the fix having failed** (F13). Nothing records that M1
   was never observed and that the bound is conditional on offset retention, so a before-reading that shows
   the full `scrollTop` â€” the outcome the [UD] admits â€” is read as falsifying the derivation rather than as
   the overflow channel the fix already closes.

### Verdict â€” M1 re-stress: TEMPER (F8/F9/F10 blocking; the derivation and both deletions are sound)

The V3 derivation HOLDS. Every link is in the shipped stylesheet, the cascade reading is correct where my
own F4(b) was wrong, and the one load-bearing step nobody had checked â€” that no `#home` descendant sizes
off the box height, so `scrollHeight` really is identical parked and active â€” is verified rather than
assumed. `body.has-player`, a zero notch inset and a mid-park player transition all compose as claimed.
The magnitude claim is right in its BOUND (at most `var(--safe-top) + 51px`, saturating rather than
scaling with depth) and wrong in one printed FORMULA (F11), and it is stated more confidently than the
[UD] premise underneath it warrants (F13). Both deletions are correct and the trade is the right one:
`overflow: hidden` goes because keeping it would leave the whole fix resting on the single engine claim
this campaign has already been wrong about twice, and because deleting it adds no input, scroll, clipping
or warmth surface the active box does not already have; `top: 0` alone would be the looser change. The
closure-by-removal argument is structural and holds, and both witness rejections are correct against
shipped source.

What is not yet safe is the coverage half, in the same place as every previous round: **M1PARKRANGE cannot
pass on the fix it exists to lock (F8), M1WRITERSET's stated baseline is red at HEAD and its cheap repair
removes the pattern that covers the plan's own named residual (F9), and the invariant those two cells carry
is worded "by construction" when a live, textless mover of `#home.scrollTop` exists (F10).** All three are
cheap, all three are the campaign's own generator â€” a claim credited to a crossing nothing drove â€” and all
three are better found here than in the sweep. The two disclosed M2 edits are faithful to F1 and harmless;
keeping them was right. M2 stays FORGE'd. The red `--page-bg` gradient (css:41) is untouched. Flash C is
out.

**The 4th Loki strike should PROCEED, and (iii) is the right plane â€” with a sharper target than the plan
gives it.** The design half has no deferred write left to attack, so the interleaving plane is genuinely
empty; but the DERIVATION plane is not, and within it (iii) is where the campaign's own lesson still has
somewhere to land. The strike does not need to wait on F8/F9/F10 â€” none of them touches the derivation.
Two concrete inputs for it, from this pass: **scroll anchoring is a mover of `#home.scrollTop` that
requires no API call at all** (`overflow-anchor` unset anywhere in `css/app.css`, so `auto` on `#home`;
`home-screen.js:52/76-77/118-120` and app.js:1436-1437 change home's content height under a live offset),
which is strictly harder for M1WRITERSET to see than the `scrollIntoView`/focus/dynamic-target cases the
plan lists; and the descendant-scroll cases the plan does list have NO shipped call site into `#home`'s
subtree (the only `.focus()` calls are debug.js:432 and debug.js:571, on a textarea appended to
`document.body`), so a strike aimed only at those is likely to return a held stone. Plane (i) is closed by
this pass; plane (ii)'s short-library route is already named in the plan and its `overflow:hidden`-discard
route is device-owed, not executable. **Aim the strike at (iii), and at scroll anchoring first.**

VERDICT: TEMPER

---

## RE-STRESS after the 4th KILL's reversal and the 5th strike's HELD_STONE â€” plan HEAD `8d47465` (2026-07-29)

Scope: the one-deletion M1 (Â§4.1 calibration, Â§4.2's restated three-axis INVARIANT P and THE REVERSAL,
Â§7.1/Â§7.4's two-polarity M1PARKRANGE, Â§7.5's re-derived writer-set baseline, Â§7.3's five non-unique
anchors, Â§8's new risk rows, Â§9's `R-M1-anchor`), plus whether the 5th strike is ingested. **M2's
mechanism stays FORGE'd and its two disclosed text edits stay adjudicated faithful â€” not re-opened.**
Flash C out; the red `--page-bg` gradient (css:41) untouched; read-only throughout.

**âš ï¸ MY OWN Â§B CALL WAS FALSIFIED BY EXECUTION, and I record it before anything else.** I wrote *"`top: 0`
alone would be the looser change, not the tighter one. Delete both."* The 4th strike executed the
counterexample in real Blink: a non-none `transform` on a scroll container suppresses every scroll-anchoring
adjustment, `overflow: hidden` un-suppresses it, so the two-deletion park stops anchoring and produces a
measured **âˆ’80px reveal jump where shipped code measures 0px**. My Â§B stressed five axes (input paths,
user-scroll paths, `overflow-x` parity, the warm-cover purpose, the retention [UD]) and every one of those
readings still holds â€” the error was that **anchoring participation was not an axis I had, and I concluded
"no new surface" from a survey I had no reason to believe was complete.** The second error is worse and is
shared with the plan: I filed an engine claim as device-owed when a desktop Blink â€” the engine of a shipped
target â€” answers it in minutes. The correction I take forward: *"I found no new surface"* is only as strong
as the enumeration behind it, and an engine question is executable before it is device-owed. Â§4.2's THE
REVERSAL states this accurately and I have no correction to it.

### A. The third axis, with it now on the table â€” the one-deletion form satisfies P, and the reversal is sound rather than deferential

**Axis by axis, each now with execution behind it rather than argument:**
- **Axis (i) â€” scroll range, container status, content width, block padding.** Closed by the `top: 0`
  deletion alone and **independently of `overflow`**, exactly as Â§4.2 claims. The 5th strike's control (c)
  measured parked `clientHeight`/`scrollHeight`/`maxScroll` byte-equal to active on both content sizes with
  the 71px delta gone, and shipped clamping âˆ’71 where the fix holds. My own source verification from the
  previous pass (the cascade, CSS 2.1 Â§10.6.4, and the check that no `#home` descendant sizes off the box
  height) is now corroborated numerically. **Held.**
- **Axis (ii) â€” anchoring participation.** Preserved by retaining `overflow: hidden`. The 5th strike ran the
  exact adopted fourth form: 520/520 with a **0px** reveal jump, identical to shipped, **with the
  two-deletion form measuring âˆ’80px in the same run** â€” so the instrument demonstrably sees the fracture it
  hunts, which is the property that makes a HELD_STONE worth anything. Anchor *selection* matched active on
  all six mutation shapes at exact integers. **Held.**
- **Paint position and input inertness** â€” the only two things P permits the park to change â€” are unchanged
  by a `top` deletion on a box translated `-101vw` at `z-index: 0` with `pointer-events: none`. **Held.**

**Is `overflow: hidden` genuinely load-bearing, or is there a cleaner lever the plan skipped?** I looked for
one and there is none. `overflow-anchor` is the spec's own lever and it is **executed not-a-repair** â€” the
4th strike added `overflow-anchor: none` to the park rule and the âˆ’80px jump survived, because the shipped
behaviour requires anchoring to RUN while parked and `none` is a second way of stopping it; and there is no
inverse, because `auto` is already the default and the suppression sits outside the spec's text, so no
spec-level property can force participation back on. The plan's disposition (Â§8 R-writer-enum's last
bullet: closed, not open) is correct and correctly reasoned. **So `overflow: hidden` is the empirically
found counterweight and there is no cleaner one.** The reversal is sound on its own merits, not by deference
to the strike: I can reconstruct why the two-deletion form must fail from the isolated mechanism, and the
plan's Â§4.2 statement of it matches what was executed.

**And `overflow`'s requirement is stronger than the plan claims â€” it is not Blink-only.** Â§4.2 and Â§7.4
Tier 0 ground the requirement entirely in the Blink anchoring quirk. But the declaration's **value** is also
what keeps the parked box a scroll container at all, and that is spec-mandated and cross-engine: CSS
Overflow 3 gives `hidden` a scroll container and explicitly denies one to `clip`. A non-scroll-container
parked box has no scroll offset, so a value replacement breaks **axis (i)** on WebKit too â€” the very axis M1
exists to fix, on the only platform that ships. The plan states neither this nor its consequence (F20).

### B. `R-M1-anchor` â€” the observable can fail, but the row has no reachability witness (F21)

The row states a real, failable observable (the watched content sits at the same viewport position across
the ghostâ†’real swap; a jump is visible) and it is correctly engine-scoped: WebKit implements no anchoring,
so an iOS-primary pass reports clean regardless â€” which the plan names as how every gate in this campaign
missed this. Â§9's closing "engine coverage is a REQUIREMENT of this gate, not a detail" is the right
structural response. **The conflict with R-M1-cause is handled on one side only:** R-M1-cause requires no
intervening re-render and now carries an instrument for it (count `renderCarousel`/`renderDownloaded` and
discard any bracketed pair); R-M1-anchor requires *exactly one* intervening re-render and carries only a
statement that the passes must not be merged. The engine split (iOS vs Android) does most of the separation
work, so the merge hazard is small â€” the unwitnessed positive condition is the real gap, and it is F21.

### C. The two-polarity cell â€” the relaxation guards are strong on removal and narrowing, and absent on replacement

Â§7.4 carries five independent guards against Tier 0 being quietly relaxed: the polarity is called out in
prose as unusual; acceptance test (5) is the polarity test with a REQUIRED-naming message; test (6) refuses
the one-axis narrowing on the no-variant rule; Â§4.2's RECOMMENDATION explicitly carves `overflow: hidden`
out of the "delete the restating declarations" cleanup; and Â§10 step 3(b) requires a source comment at the
edit site saying it is required and why. Â§306 also settles the distinguishability question head-on â€” Tier 0
is deliberately not folded into anti-vacuity guard (ii), because "someone removed the anchoring
counterweight" and "the park itself is gone" must fail separately. The three failure reasons stay
distinguishable and each has a named message. **On the question asked â€” can an author satisfy half the
cell? â€” yes, and the guard that catches it is not an acceptance test.** A cell built as a pure allow-list
passes tests (1)-(4) and fails only (5) and (6), both of which are disciplines the same author writes. The
structural catch is **registered mutant M1PARKRANGE-b surviving the sweep**, which is only readable once
Â§7.3's remedy makes the sweep name the killing cell â€” so Â§10's step-1 sequencing is load-bearing for this
cell specifically, not just for the repo generally (F26). **What no guard covers is a value REPLACEMENT**
(F20): every one of the five is keyed to removal or narrowing.

### D. F9's re-derived baseline â€” complete against S1-S4 as far as I can independently derive, and it caught what I missed

I re-derived over `js/` and reproduce the plan's 14 entries exactly: Class A's five `scrollTop` assignments
(nav.js:140, nav.js:147, browse.js:228, browse.js:658, debug.js:533), Class B's four element call sites
(browse.js:845 `scrollIntoView`, browse.js:860 and 862 calling it, virtuallist.js:304 through the injected
seam), Class C's five `window` sites (app.js:445, 1203, 1228, and the 1174/1186 replacement-and-restore of
the API itself). Everything else my grep surfaces is a READ (browse.js:71/252/654/656, app.js:1316/1323,
app.js:2934, scrollbar.js:58/60, swipe.js:289/290, the virtuallist internals) or an S2 horizontal site
(swipe.js:217, app.js:2889). **`js/vendor/eruda.js` is the one my own previous derivation missed** â€” my grep
did surface the file and reported its match as an omitted long line, and I did not follow it up. The plan's
lesson stands as stated: running the derivation beats writing the baseline, and the miss demonstrates it.

**S1-S4 are the right boundaries.** Each excludes by a stated decision rather than by pattern convenience:
S3 registers the `window` class instead of dropping `scrollTo` (which was exactly the cheap repair that
would have blinded the gate), S2 registers the horizontal sites rather than filtering them, and S4 puts the
non-textual remainder outside the gate *by construction* with a named residual. The `android/build/assets`
and `.claude/worktrees` exclusions are correct and non-obvious â€” a glob over the build output would
double-count every entry. The both-directions comparison (unregistered-derived FAILS, rotted-registered
FAILS) is what stops the inventory growing monotonically, and Â§7.5's five stated "cannot cover" items are
the honest bound rather than a shrunk one. **Entry 6's caveat is the right call** â€” registering a site whose
target is resolved by a runtime-built selector, and saying the derivation cannot prove the target, puts S4's
boundary inside the registered set where it is visible.

**The `js/vendor/**` exclusion is sound in direction and keyed to the wrong invariant (F25).** Failing the
gate if the directory gains a second file is a clever structural guard on the exclusion's *stated reason*
("it is one vendored console") â€” but that reason is falsified equally by an in-place `eruda.js` upgrade,
which a file-count check cannot see. Low risk in fact (eruda writes inside its own injected overlay), so
this is a Note, not a blocker.

### E. The 5th strike is not ingested (F19), and its one new fact is not folded (F20)

The strike committed at `8d47465`; the plan's last content commit precedes it. So the plan still routes work
to a gate that has already returned: Â§1's authority table has **no row for
`STRIKE-home-shift-m1-adopted.md`**, Â§8's gate-rigor status describes the 5th strike as pending, Â§382 orders
"the 5th strike FIRST, then the re-stress", Â§404 lists "does the EXACT adopted form anchor like shipped?" as
"the one open question that can still change the fix", and Â§405's Next owner is "Loki â€” ONE narrow 5th
strike". All five are stale, and the plan's own three predictions for that strike are now answered green.

### F19 â€” Structural (defect) â€” the 5th strike is absent from the plan's authority table and from its sequencing, so the plan routes to a gate that has already returned HELD_STONE
`Claude/Loki/STRIKE-home-shift-m1-adopted.md` (HEAD `8d47465`) executed all three questions Â§8 set for it â€”
(1) the adopted form anchors like shipped (520/520, 0px, against âˆ’80px for the two-deletion form in the same
run), (2) anchor selection matches active on all six mutation shapes, (3) the geometry table shows a zero
`clientHeight` delta and no park clamp â€” and returned HELD_STONE with four controls green including a
same-run reproduction of the kill row. **None of that is in the plan.** Â§1's defining-records table, which
is the plan's authority ledger and the first thing a downstream seat reads, has rows for the 1st through 4th
strikes and none for the 5th; Â§8's gate-rigor status, Â§382's ordering, Â§404's open question (1) and Â§405's
Next owner all still describe it as the pending gate. A reader of the plan alone concludes the fix's only
fix-changing question is open and commissions a sixth strike on a closed plane â€” and, worse, cannot tell
that Â§8's stated condition *"if (1) fails, the fix has no admissible form left in this plan's scope and M1
returns to design"* has been discharged. **Required: add the 5th strike as a defining-records row with its
verdict and the three executed results; move question (1) from Open to CLOSED-by-execution; update the
gate-rigor status, Â§382's ordering and Â§405's Next owner to reflect that both gates have now run.** This is
D1 and the HEAD-holds-current-truth rule: the plan is materially stale on its own authority table while
carrying a PLAN_READY status.

### F20 â€” Structural (defect) â€” the strike's `overflow: clip` finding and its explicit directive to Â§7.4 are un-folded, and Tier 0's rationale is framed Blink-only when the requirement is cross-engine
The strike's Â§6 recorded a third perturbation beyond its commission: **`overflow: clip` for `overflow:
hidden` BREAKS the axis twice over** â€” in-park `scrollTop` collapses to 0 (the box is no longer a scroll
container), anchoring blacks out, and the reveal jumps âˆ’80px, i.e. the killed two-deletion behaviour returns
wearing a "modern CSS" edit; the strike notes the offset resurfaces at reveal, so `scrollTop` *looks*
preserved after un-park while the reveal still jumped, which makes it harder to diagnose than the form it
replaces. The strike states the consequence as a directive: *"Consequence for Â§7.4: Tier 0's required-present
entry must stay literal on `overflow: hidden`."* **The word `clip` appears nowhere in the plan** (its one
occurrence, Â§3 line 91, is unrelated M2 prose about clone clipping). Four separable gaps:

- **(a) Tier 0 rejects `clip` mechanically but never says so.** As specified Tier 0 requires the longhands
  `overflow-x: hidden` and `overflow-y: hidden` *with this value*, so `clip` fails on value inequality â€” the
  cell does go red. But `clip` is named nowhere, there is no acceptance test for it (the six stop at the
  one-axis narrowing), and **the failure message specified for test (5) is "naming `overflow` and saying it
  is REQUIRED"** â€” which is actively misleading for a `clip` edit, because the declaration *is* present. An
  author who sees `overflow: clip` present and a red saying `overflow` is required reads the cell as buggy,
  and the cheapest repair is to widen Tier 0 to "a clipping overflow value is present" â€” which admits the
  killed form. **Required: name `clip` explicitly as inadmissible, add it as acceptance test (7), and
  specify a distinct failure message for a wrong VALUE versus an absent declaration.**
- **(b) The requirement is framed as Blink-only, which invites its deletion on the primary platform.**
  Tier 0's "Why required" cites only the executed Blink anchoring chain, and Â§9 says WebKit implements no
  anchoring. Together those read as: this declaration buys nothing on iOS. That is a false and very
  reachable inference. **`overflow`'s value is also what makes the parked box a scroll container**, and CSS
  Overflow 3 mandates that cross-engine â€” so a non-scroll-container value collapses the in-park offset and
  breaks **axis (i)** on WebKit as well, defeating the fix on the platform that ships. **Required: state the
  cross-engine, spec-grounded half of the reason beside the Blink-measured half**, so the requirement does
  not read as dead weight wherever anchoring is absent.
- **(c) There is an approving in-repo precedent for exactly the fatal edit, sixty lines below the park
  rule.** `css/app.css:161-165` carries `.app { overflow-x: clip; }` under a comment arguing *for* `clip`
  over `hidden` on the ground that **"clip doesn't make .app a scroll container or a containing block"** â€”
  the very property that is fatal on `#home.parked`. A future editor tidying this file has a documented
  house argument pushing them toward the killed edit, and Â§10 step 3(b)'s required source comment currently
  covers only *why `overflow: hidden` is required*, not *why the `clip` reasoning at css:165 does not
  transfer*. **Required: extend the step-3(b) comment to say `clip` is not a substitute and why**, in the
  same rule the next editor is reading.
- **(d) Every existing guard is keyed to removal or narrowing, none to replacement.** M1PARKRANGE-b mutates
  a *deletion*; test (6) mutates a *narrowing*; Â§4.2's carve-out warns against *sweeping it up*. A value
  replacement passes through all of them and is caught only by Tier 0's value comparison â€” which is the one
  guard (a) shows is most likely to be relaxed. The mutant set should carry the replacement shape too.

### F21 â€” Structural (defect) â€” `R-M1-anchor` is the only coverage for INVARIANT P's third axis and has no reachability witness, so it can report clean for the wrong reason
The protocol is a race: open with a cached library so the background revalidate is in flight, scroll to
mid-range, begin a homeâ†’Books swipe, **"and abort it while the revalidate lands and repaints the
carousels."** Nothing in the row confirms the repaint actually landed inside the park window. If the
revalidate resolves before the swipe starts or after the reveal, the observable is 0px â€” a **pass, for the
environment's reason rather than the fix's.** That is precisely the defect class this plan spends Â§7.2 on
("a no-write oracle is satisfied perfectly by a fixture that never arrives") and makes **mandatory** for
both write-observation cells; the one row carrying an axis no CI cell can cover is the one place the
requirement is not imposed. It is also the campaign's own generator in its purest form â€” a claim credited to
a crossing nothing drove â€” on the row the 4th KILL exists to have created.

**Required: give the row the mirror of the instrument R-M1-cause already has.** R-M1-cause counts
`renderCarousel`/`renderDownloaded` executions between its two readings and **discards** any pair that
brackets one; R-M1-anchor must **require** exactly that bracket â€” confirm at least one carousel repaint
executed between the park and the reveal, from the PBDebug CACHE/`onFresh` logging cited one row above, and
discard any run that does not. Without it the row cannot distinguish "the parked box absorbed the mutation"
from "no mutation arrived", and a clean report is unfalsifiable. Two supporting notes: the strike's
`onFresh` (home-screen.js:124) is the right mutator to drive because it is the highest-frequency one in the
first seconds of a cached open, and the strike's clean-hands note â€” that a straddling-block shrink jumps
âˆ’80px in *every* state including active shipped code â€” means the row must also state which mutation shape it
is driving, or a tester who happens to shrink a straddling block will read a park-independent engine
behaviour as a regression.

### F22 â€” Weak (defect) â€” Â§4.2's reason that "the transform cannot be given up" is under-argued, and as written it hands a future editor a route back to the killed form
Â§4.2 justifies the transform's permanence with *"the transform is what puts the box off-screen, so it is the
one park effect that cannot be given up."* That is not sufficient on its own: `left: -101vw` / `right:
101vw` would also put the box off-screen with no transform at all, and a box with no transform is not in the
suppressing state, so an editor following the plan's own logic can conclude that swapping the transform for
inset offsets makes `overflow: hidden` unnecessary â€” reopening the two-deletion form by a different door,
and doing it while believing they are applying Â§4.2. **The load-bearing reasons are elsewhere in the plan
and are not invoked here:** the parked box's off-screen placement must be a compositing transform rather
than a layout offset because the `#home` layer contract (css:104-112) is what keeps the reveal from
demoting the layer â€” the abort-flash saga â€” and because Â§2 STAYS forbids shipping a variant of a
device-confirmed form (the `translateZ(0)`-for-`will-change` substitution flashed on device on exactly that
kind of spec argument). **State those two reasons at Â§4.2 instead of the off-screen one**, so the axis-(ii)
argument rests on the constraint that actually pins the transform.

### F23 â€” Weak (defect) â€” the non-unique-anchor counts contradict each other in three places
Â§7.3's heading and lead are correct at **five** ("FIVE NON-UNIQUE ANCHORS â€¦ Five of five anchors inspected â€¦
two already-live registrations and three this plan is about to register"), but the same paragraph then
reasons from **"at a 3-of-3 rate"** and **"these three entries"** / **"Re-anchoring the three"**, Â§267's list
header reads **"Re-anchor all three"** over four bullets covering five anchors, and Â§403's Decisions line
states **"three of three anchors inspected were non-unique."** The five-count is the right one (`#24`, `#42`,
M1NOWRITE's `resetScroll: false`, and both M1PARKRANGE mutants). The rate is load-bearing prose â€” it is the
evidence for making disambiguating context the default form and for sequencing the remedy first â€” so a stale
denominator weakens the argument it exists to carry. StandardsDocument Â§7 within-document scrub: fix all
four occurrences. (Â§370's "two registered mutations are non-unique" is correct and should stay â€” its scope
is the already-live registrations only.)

### F24 â€” Note (recommendation) â€” fold the strike's two robustness rows, which NARROW `R-M1-anchor-quirk` from a vague obligation to a one-value check
The strike executed two further perturbations of the adopted form and both HELD at 0px:
`translate3d(-101vw,0,0)` substituted for `translateX(-101vw)` (robust to the transform function form) and
`will-change: auto` with the hint removed (**`will-change` is not load-bearing for anchoring**). Its
conclusion: *"The drift surface for R-M1-anchor-quirk is narrowed: the transform's function form and
`will-change` are not load-bearing; the `overflow` VALUE is."* R-M1-anchor-quirk currently describes the
whole equivalence as driftable, which makes its standing re-measurement obligation open-ended and therefore
likely to be skipped. Folding the narrowing turns it into a single cheap check on one declaration's value,
and it is worth recording separately that `will-change`'s retention is now justified **only** by the
`.256` device-validated flash form (Â§2 STAYS) and not by the anchoring axis â€” so nobody later defends it
with the wrong reason.

### F25 â€” Note (recommendation) â€” S1's `js/vendor/**` exclusion guards addition but not replacement
The guard "the gate must FAIL if `js/vendor/` gains a second file" correctly ties the exclusion to its
stated reason ("it is one vendored console"), but that reason is falsified just as completely by an in-place
`eruda.js` upgrade that adds scroll writes, which a file-count check cannot see. Either pin the exclusion to
the file's identity (a recorded size or hash, or the vendored version string) or state that content drift is
accepted, with the reason (eruda injects and writes inside its own overlay, never into `#home`) â€” the same
standard Â§7.5 already applies to every baseline entry's "cannot reach `#home`" line.

### F26 â€” Note (recommendation) â€” say which guard actually catches a half-built M1PARKRANGE
A cell built as a pure allow-list â€” the natural reading of "M1PARKRANGE is the permission cell" â€” passes
acceptance tests (1)-(4) and fails only (5) and (6), which are disciplines written by the same author who
omitted Tier 0. The guard that catches it structurally is **registered mutant M1PARKRANGE-b surviving the
sweep**, and that is only readable once Â§7.3's remedy makes the sweep name the killing cell. Worth stating
at Â§7.4, because it means Â§10's step-1 sequencing is load-bearing for this cell in particular and not only
for the repo's mutation results in general.

## Coverage â€” the post-reversal re-stress (F19-F26)

- **F19** (blocking) â€” no CI surface; a defining-records and sequencing correction. Verified by the 5th
  strike appearing as an authority row with its verdict, and by Â§404's question (1) reading CLOSED.
- **F20** (blocking) â€” gates M1PARKRANGE. Verified by a seventh acceptance test: with `overflow` REPLACED by
  `clip` the cell must FAIL with a wrong-VALUE message distinct from the absent-declaration message; and by
  the step-3(b) source comment naming `clip` and why css:165's reasoning does not transfer.
- **F21** (blocking) â€” gates `R-M1-anchor`, which is the sole coverage for INVARIANT P's third axis.
  Verified by the row requiring a counted carousel repaint bracketed between the park and the reveal, and by
  naming the mutation shape it drives.
- **F22, F23** â€” no CI surface; a substituted justification at Â§4.2 and a four-place count scrub.
- **F24, F25, F26** â€” no CI surface; a narrowed drift surface, an exclusion keyed to identity rather than
  count, and a stated guard attribution.

### Prediction â€” where this breaks in execution if built as written

1. **Someone writes `overflow: clip` in the park rule** (F20), reading css:165's approving comment as house
   style. Tier 0 goes red with a message saying `overflow` is REQUIRED while the declaration is plainly
   present, the red is read as a cell defect, Tier 0 is widened to "a clipping value is present", and the
   âˆ’80px reveal jump ships â€” the killed form returning through the one door no guard watches.
2. **`R-M1-anchor` reports clean on the first Android pass** (F21) because the revalidate landed outside the
   park window, the axis the 4th KILL exists to protect is recorded as device-confirmed, and the next
   regression on it starts a fresh investigation with a green gate in the record.
3. **A sixth strike is commissioned on the adopted form** (F19), because the plan's own Open-questions list
   still names it as the one question that can change the fix.
4. **An editor swaps the transform for inset offsets and deletes `overflow: hidden`** (F22), following
   Â§4.2's stated reason correctly to the two-deletion behaviour, and the abort flash returns alongside it.

### Verdict â€” post-reversal re-stress: TEMPER (F19/F20/F21 blocking; the fix's SHAPE is now settled and nothing here touches it)

The one-deletion form is right, and it is the best-evidenced design this campaign has produced. Axis (i) is
closed by the `top: 0` deletion and measured byte-equal; axis (ii) is closed by retaining `overflow: hidden`
and measured 0px against âˆ’80px for the retired form in the same run; the reversal reasoning holds on its own
merits rather than by deference â€” I looked for a cleaner lever on anchoring participation and there is none,
because `overflow-anchor: none` is executed not-a-repair and the suppression sits outside the spec, so no
spec property can force participation back on. Â§4.1's calibration is now the most honest section in the
plan: the geometry is executed-exact, the retention [UD] is explicitly HALF-settled with the WebKit branch
named as a channel this fix deliberately leaves open, and the pre-emptive naming of the two ways a device
log will be misread is exactly right. Â§7.4's inversion to an allow-list is correct and its Tier 0 polarity
is well defended against the two failure modes it anticipates. Â§7.5's baseline is complete against a stated
rule and caught a file my own derivation missed.

**The three blockers are all about LOCKING and OBSERVING the fix, not about whether it is right.** The plan
has not ingested the gate that cleared it (F19), so it routes to a completed strike and reads its settled
question as open. The strike's one free finding â€” `overflow: clip` breaks the axis twice over, with an
explicit directive to Â§7.4 â€” is un-folded (F20), and that is the serious one: it is a live re-break path on
the single load-bearing declaration, the requirement is framed Blink-only when its value is cross-engine
and spec-mandated, every existing guard watches removal and narrowing rather than replacement, and the repo
carries an approving argument for the fatal edit sixty lines below the rule. And the device row that is the
*only* coverage for the axis the 4th KILL opened has no reachability witness (F21), so it can report clean
for the environment's reason â€” the campaign's own generator, on the row created to close it. All three are
cheap; none requires a design change.

**The sequencing the coordinator names is correct and I would not change it:** the tooling remedy first
(every mutation result, M1PARKRANGE-b included, is unreadable until it lands and F26 makes that specifically
load-bearing for this cell), then the red cells, then the CSS edit and the M2 measurement. **No sixth strike
is warranted** â€” the design plane is closed by execution on all three axes, and F19-F21 are review-owned
corrections rather than promises to break. M2 stays FORGE'd. The red `--page-bg` gradient (css:41) is
untouched. Flash C is out.

VERDICT: TEMPER
