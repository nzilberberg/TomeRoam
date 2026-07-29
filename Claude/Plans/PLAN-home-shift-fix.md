# PLAN — the home→books SCROLL SHIFT: two grounded mechanisms, both fixed. **M2 (leading, scroll-independent):** the outgoing-home GHOST lays the id-stripped clone in NORMAL FLOW at the vestigial pre-6i `#library { padding-top: 46px }` model (swipe.js:276), but the real active `#home` is a `position:fixed` inset box at `top:calc(safe+51)`+`padding-top:14` (css:128/131) — a fixed ≈`safe+19`px ghost/real vertical gap realized when the ghost covers/uncovers the real `#home`. Fix: align the clone's first-content viewport-Y to the real fixed-inset content-top (change the builder's clone padding, not `46`). **M1 (additive, scroll-dependent):** parking `#home` at swipe start (app.js:485) flips `overflow-y:auto`→`overflow:hidden` (css:132→102), forcing `#home.scrollTop`→0, which the ghost captured first and nothing restores → an abort→home jump of `scrollTop` px. Fix: preserve `#home.scrollTop` across the park via an element-local `dataset.st` (mirroring the carousel `dataset.sl`), restored on the un-park reveal. Both are DEVICE-owed to confirm (compositor/layout paints the rAF log cannot see).

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor",
  "patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":true,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/swipe.js:274-292","js/app.js:478-486","js/app.js:2887-2890","js/nav.js:45-112","js/nav.js:144-172","js/app.js:1220-1229"],
  "affected_contracts":[],
  "staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md"],
  "blocking_questions":["M1SAVE","M1RESTORE","M2ALIGN"]} -->

Status: **PLAN_READY — hand to Charpy (the plan reviewer) for TEMPER.** Grounded by Linnaeus `Claude/Linnaeus/PROBE-home-shift-2026-07-29.md` (HEAD `d96ca40`, build `.267`) — two source-cited mechanisms, split on scroll-dependence. M2 (leading, scroll-independent) is a 6i/decouple artifact: the ghost kept the pre-6i in-flow `#library` padding model while the real `#home` became a fixed-inset box, so the ghost's home content and the real home content sit at different viewport-Y. M1 (additive, scroll-dependent) is the park's `overflow:hidden` reset of `#home.scrollTop` with no save/restore. The shift-gone is DEVICE-decided (both are compositor/layout paints the rAF/`ghostVsReal` log is blind to — Linnaeus [UD]); this plan grounds the mechanisms and the fixes, it does not assert the shift clean. ⛔ the red `--page-bg` gradient (css:41) is NOT touched.

## Index
1. Defining records and authority (the Linnaeus probe; the 6i/decouple artifact; the cited source)
2. Scope boundary — what MOVES, STAYS, is DEFERRED (flash C + the decouple OUT)
3. M2 — the ghost/real geometry alignment (scroll-independent)
4. M1 — preserve `#home.scrollTop` across the park (scroll-dependent)
5. Ordering and atomicity (M1 capture-before-reset, restore-after-unpark) + the state-transfer treatment
6. State-transfer ledger (the `#home` scroll-state crossing)
7. Coverage Model (Mendeleev catalog) + coverage/mutation matrix
8. Risk registry + the gate-rigor recommendation (Charpy + a Loki pass on M1)
9. Device gate
10. Sequencing and handoff

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. One-line reason per pattern:
- **boundary_relocation: false** — no read/write surface relocates across a module seam; both fixes are local (a clone-geometry constant; an element-local scroll save/restore).
- **callee_replacement: false** — no callback/interface replaces direct logic.
- **contract_shape: false** — no exact-key contract/schema changes; the swipe classification/construction contracts are untouched.
- **state_transfer: true** — M1 PRESERVES a state value (`#home.scrollTop`) across the park lifecycle flip (`overflow-y:auto`→`hidden`), captured before the reset and restored after the un-park. The scroll-state crossing is traced in the `vitruvius-ledger` (§6) and its capture-before-reset ordering is pinned (§5).
- **async_change: false** — no async boundary changes shape; the recorder is a passive capture-phase listener (mirroring the existing carousel recorder), the restore is synchronous in `applyScreen`.
- **persistence_migration: false** — nothing persisted; `dataset.st` is in-memory element state.
- **lifecycle_ownership: false** — no resource acquire/dispose lifecycle changes; `#home` is a pre-existing element and the scroll value is data, not an owned resource.

## 1. Defining records and authority

**Verdict: the Linnaeus probe is DERIVED; both mechanisms are source-grounded and independently fixable; the leading cause (M2) is a scroll-INDEPENDENT layout artifact of the 6i fixed-`#home` + the `.267` fixed-`#browse` decouple (the ghost kept the old in-flow model); no unresolved GAP blocks the build — the residual is the DEVICE realization (Linnaeus [UD]).** Precedence (EC §2): (1) this assignment; (2) verified HEAD `d96ca40`/`.267` source; (3) Linnaeus `PROBE-home-shift-2026-07-29.md`; (4) the swipe subsystem contract.

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `PROBE-home-shift-2026-07-29.md` (Linnaeus, HEAD `d96ca40`/`.267`) | **M2 (scroll-INDEPENDENT):** the outgoing-home ghost clones `.app`, strips ids (swipe.js:277), and lays `#home` content in normal flow at `#library { padding-top: 46px }` (swipe.js:276; css:208) — the pre-6i in-flow model; but the real active `#home` is a `position:fixed` inset box at `top:calc(safe+51)`+`padding-top:14` (css:126-134) that ignores `#library`'s padding → a fixed ≈`safe+19`px ghost/real vertical gap, realized when the ghost covers/uncovers the real `#home`. **M1 (scroll-DEPENDENT):** `showAppView` parks `#home` at swipe start (app.js:485), flipping `overflow-y:auto`(css:132)→`overflow:hidden`(css:102), forcing `#home.scrollTop`→0; the ghost captured it first (swipe.js:289) and no save/restore exists → an abort→home jump of `scrollTop` px. The exact px + the compositor realization are [UD] (device). `released=23` is departing books rows, benign. | Deriver (source-grounded, cited) | GOVERNS both fixes (§3 M2, §4 M1) and the device gate (§9). | — |
| 6i (`PL-swipe-6i-home-fixed-ownscroll`) + the browse decouple (`PL-swipe-browse-fixed-ownscroll`, `.267`) | Active `#home` (6i) and `#browse` (`.267`) are `position:fixed` inset own-scroll boxes at `top:calc(safe+51)`+`padding:14` (css:128/131, 152/154); the pre-6i in-flow model cleared the fixed topbar via `#library { padding-top: 46px }` (css:208). | Active policy + shipped source | ROOT of M2: the ghost's `paddingTop:46` (swipe.js:276) is the vestigial in-flow model; the real views moved to fixed-inset, the ghost did not. The fix aligns the ghost to the fixed-inset geometry. Both real views share the geometry, so the fix is uniform (§3). | Note in the subsystem contract that the ghost geometry now tracks the fixed-inset model. |
| `js/app.js` carousel recorder (2887-2890) | A capture-phase `document` scroll listener records `t.dataset.sl = t.scrollLeft` for `.carousel` elements; read back by `copyScroll` (swipe.js:217). The PROVEN element-local save/restore idiom for a scroll value that a state change would otherwise lose. | Verified source (the pattern to mirror) | M1 mirrors it for `#home`'s vertical scroll: record `#home.dataset.st = #home.scrollTop` (guarded by `!parked`), restore on the un-park reveal (§4). | — |
| `EngineeringContract.md` §4.3 (explicit ownership), §4.7 (intermediate states), §4.21 (narrow scope), §4.10 (mutation) | One explicit owner per temporary state; assert both sides of a before/after; fix the invariant without redesigning adjacent systems; mutations test misattribution. | Core rules | M1's `#home.scrollTop` save/restore has one owner (the recorder + the `applyScreen` restore, element-local `dataset.st`); coverage asserts both sides (park-reset vs restore); the fixes are narrow (a constant; a save/restore); mutations name the channels (§7). | Register the mutations. |

**Authority precedence.** This assignment + the verified `.267` source govern the shape; the device home→books repro (top vs scrolled) governs the shift verdict; Linnaeus governs the two mechanisms and marks the exact px/compositor realization [UD] (device). No two sources conflict. M2 is the leading cause for the logged `ghostY=0` persist (scroll-independent); M1 is additive when home is scrolled.

⛔ **HARD CONSTRAINT (user):** the red `--page-bg` gradient (css:41) is NOT stripped/altered. Neither fix touches it.

## 2. Scope boundary

**MOVES (fixed):**
- M2 — the outgoing-home (and -browse) ghost's clone geometry: align the clone's first-content viewport-Y to the real fixed-inset view's content-top (§3).
- M1 — `#home.scrollTop` preservation across the park: an element-local `dataset.st` save (recorder) + restore on the un-park reveal (§4).

**STAYS (do not re-touch):**
- The swipe classification/construction/finalization contracts and the three-layer oracle — UNCHANGED (no plan-value change).
- The real `#home`/`#browse` fixed-inset recipes (css:126-158) and the `.app` runway (css:74) — untouched; M2 changes only the CLONE geometry (swipe.js), M1 only adds a save/restore.
- The `#library { padding-top: 46px }` real-app rule (css:208) — vestigial (both real views are fixed and ignore it) but harmless; NOT edited (out of scope; the fix is on the clone only).
- The carousel `dataset.sl` recorder (app.js:2887) — reused/extended for `#home`, not replaced.
- The red `--page-bg` gradient (css:41).

**DEFERRED (explicitly OUT):**
- **Flash C** — the browse→browse abort in-list divider re-raster (a separate, coupling-independent track).
- The `#browse` decouple — SHIPPED (`.267`); not reopened. (M2 incidentally aligns the browse ghost too, which is a fix, not a decouple change — §3.)

## 3. M2 — the ghost/real geometry alignment (scroll-independent, the LEADING cause)

**The mechanism (cited).** The outgoing app-ghost clones `.app` (swipe.js:275), removes the topbar (swipe.js:278), strips ALL ids (swipe.js:277) — so the cloned `#home`/`#browse` LOSES its fixed-inset id-rule and falls to NORMAL FLOW — and sets `#library { padding-top: 46px }` on the clone (swipe.js:276), the pre-6i in-flow topbar-clearance. The ghost simulates the current scroll by `translateY(-ghostY)` on the whole clone (swipe.js:292). For the ghost to align with the real view it covers/uncovers, **the clone's first-content viewport-Y must equal the real view's content-top.** Post-6i/decouple the real content-top is the fixed-inset `top:calc(var(--safe-top)+51px)` (css:128/152) + `padding-top:14px` (css:131/154) = `calc(var(--safe-top)+65px)`. The clone lays content at `.app` padding-top (css:74, `calc(var(--safe-top)+12px)`) + `#library` padding-top (the builder's `46`) — a DIFFERENT viewport-Y → the fixed ≈`safe+19`px gap (Linnaeus §2, [UD] exact px).

**The fix (option (b), grounded — the ghost-builder applies the fixed-inset-aligned offset).** Change swipe.js:276 so the clone's active-view first content lands at the real `calc(var(--safe-top)+65px)`, replacing the vestigial in-flow `46`. **Why option (a) [move the inset onto a class the clone keeps] does NOT work:** the ghost REQUIRES the clone view in NORMAL FLOW (fully laid out, unclipped) so `translateY(-ghostY)` shows the content at offset `ghostY`; a `position:fixed`+`overflow-y:auto` clone view (inside the transformed clone) would be re-parented to the clone by the transform AND clip its content to the box (scrollTop 0), breaking the translate-based scroll simulation. So the clone must stay normal-flow and only its content-top OFFSET is corrected — which is exactly what the builder's `#library` padding line already controls.

**The aligned value (derivation; the exact px is DEVICE/layout-owed).** Setting the clone content-top equal to the real content-top: `clone.app padding-top + #library padding-top = calc(safe+65)`. If the clone `.app` retains its `calc(safe+12)` padding-top (css:74), the `--safe-top` term CANCELS and the aligned `#library` padding-top is the notch-independent constant `(51 + 14) − 12 = 53px` (replacing `46`). **Because the clone `.app`'s effective padding contribution is a layout fact jsdom cannot compute (and the probe read the ghost content at ≈46, i.e. it may not contribute as modeled), Brunel measures the clone's actual `.app` padding-top against the real layout and sets the value that lands the clone's first content at the real `calc(safe+65)`** — the candidate is `53px` if `.app` padding contributes, `calc(var(--safe-top)+65px)` (applied so the safe-top is present once) if it does not. Cite the derivation from css:128/131 (`#home` inset) and css:74 (`.app` padding) in a builder comment. **DEVICE-confirmed** (Linnaeus [UD]): home→books from the TOP shows NO ghost/real shift.

**Uniform across both ghosts, no regression (EC §4.21).** `#browse` shares the identical fixed-inset geometry (`top:calc(safe+51)`+`padding:14`, css:152/154), so the same clone-padding fix aligns the BROWSE ghost too (which carries the same latent gap today) — an improvement, not a regression. The clone always contains exactly the active view (the builder removes `.hidden`/`.parked` at swipe.js:279), so the single `#library` padding applies to whichever source's content is present. `--safe-top` and `has-player` do not change the content-top (`top` and `padding-top` are unaffected by `has-player`; only `bottom` changes), so the aligned value is stable across both.

## 4. M1 — preserve `#home.scrollTop` across the park (scroll-dependent, additive)

**The mechanism (cited).** At swipe start `showAppView(books,true)` (app.js:515 via `renderDestination` browse-host) runs `$('home').classList.add('parked')` (app.js:485). `#home` is `overflow-y:auto` (css:132); `#home.parked` is `overflow:hidden` (css:102) — flipping to `hidden` clamps `#home.scrollTop`→0 (an `overflow:hidden` box has no scroll offset). The ghost captured the real `scrollTop` FIRST (buildConstruction builds the outgoing ghost before `renderDestination` parks home, swipe.js:341/289) but NOTHING restores it (only carousel horizontal `dataset.sl` is saved). On the abort→home reveal the real `#home` un-parks at `scrollTop=0` while the ghost showed it at `scrollTop` → a jump of `scrollTop` px when the ghost drops (Linnaeus §3).

**The fix (mirror the carousel `dataset.sl` — element-local save/restore).** Two pieces:
- **SAVE (recorder).** Record `#home`'s vertical scroll into `#home.dataset.st` while home is active, guarded so the park's clamp does not overwrite it. Extend the EXISTING capture-phase carousel recorder (app.js:2887-2890) with one clause: `if (t && t.id === 'home' && !t.classList.contains('parked')) t.dataset.st = t.scrollTop;`. The `!parked` guard is load-bearing: when the park adds `.parked` (overflow:hidden) the subsequent clamp-to-0 scroll event finds `.parked` already present → skipped, so `dataset.st` retains the PRE-park value (§5 O1). Exactly the carousel idiom, which survives its own state change the same way.
- **RESTORE (on the un-park reveal).** In `applyScreen`'s home branch (nav.js:157) — the reconcile point every →home reveal routes through — restore the saved scroll on the SCROLL-PRESERVING paths and keep the top-reset on the fresh-nav paths: `setView('home'); setNavActive('home'); if (resetScroll) $('home').scrollTop = 0; else $('home').scrollTop = +$('home').dataset.st || 0;`. The abort→home reveal passes `resetScroll:false` (the abort finalize `applyScreen(dest=home,{render:false,resetScroll:false})`, app.js:1220-1229) → the ELSE branch restores `dataset.st`; a fresh nav to home (commit/button) passes `resetScroll` default-true → stays at top (unchanged product behavior). The restore lands AFTER `setView('home')` removes `.parked` (nav.js:57), so `overflow-y:auto` is back and `scrollTop` is settable, and the content is present (home is painted while parked) (§5 O2).

**Why `applyScreen`/`dataset.st`, not the session or a new field (EC §4.3, §4.16).** The scroll value is owned element-locally by `dataset.st` (the proven carousel pattern), so it survives supersession and needs no session plumbing; `applyScreen` is the existing scroll-policy owner (it already does the `resetScroll` top-reset, nav.js:157/140), so the restore lives with the policy it belongs to — no duplicate source of truth. The pre-park capture is the recorder's last write (equivalently the ghost's `capture.ghostY`, swipe.js:289 — the same pre-park value; `dataset.st` is preferred because it also covers non-swipe un-parks).

**The `#home` park/un-park surface (complete, so no un-park is missed).** PARK (add `.parked`): app.js:485 (mid-drag `showAppView`), nav.js:57 (`setView` when `v!=='home'`). UN-PARK (remove): app.js:484 (`showAppView` home), app.js:520 (`renderDestination` home-host), nav.js:57 (`setView` when `v==='home'`). Every terminal →home reveal reconciles through `applyScreen`→`setView('home')` (nav.js:157/57), so the single restore in `applyScreen`'s home branch covers the visible result of ALL of them (the mid-drag transient parks/un-parks are under the held ghost and are reconciled at finalize). The recorder's `!parked` guard covers every park site (it keys off the class, not the site).

## 5. Ordering and atomicity + the state-transfer treatment

**State transferred (M1):** the value `#home.scrollTop`, across the park lifecycle flip (`overflow-y:auto`→`hidden`→`auto`). Producer: the capture-phase recorder (into `#home.dataset.st`). Consumer: `applyScreen`'s home-branch restore. Owner: `#home.dataset.st` (element-local). Staleness: the value is refreshed on every home scroll while `!parked`; a park never overwrites it (the guard); supersession never strands it (element-local, not session-bound). This is the §6 ledger.

**Ordering invariants (pin the invariant, not the line — EC §4.7):**
- **O1 (M1 capture-before-reset).** The recorder's write to `#home.dataset.st` must occur while `#home` is active (`overflow-y:auto`, real `scrollTop`), and the park's `overflow:hidden` reset must NOT overwrite it. Guaranteed by the `!parked` guard: `.parked` is added BEFORE the clamp-scroll fires, so the clamp event is skipped and `dataset.st` holds the pre-park value. `@order`: record (while `!parked`) → park adds `.parked` (overflow:hidden clamps `scrollTop`→0) → `dataset.st` retains the pre-park value.
- **O2 (M1 restore-after-unpark).** The restore `#home.scrollTop = dataset.st` must occur AFTER the un-park removes `.parked` (restoring `overflow-y:auto` so `scrollTop` is settable). `applyScreen` calls `setView('home')` (which removes `.parked`, nav.js:57) BEFORE the restore line. `@order`: `setView('home')` removes `.parked` → set `#home.scrollTop = dataset.st`.
- **O3 (M2, incidental).** The ghost is built (with the aligned clone geometry) BEFORE `renderDestination` parks the real `#home` (swipe.js:341 outgoing-first) — unchanged; the M2 fix does not alter this ordering, only the clone's padding constant.

**Atomicity.** M2 (one clone-geometry constant, swipe.js) and M1 (recorder + restore, app.js/nav.js) are INDEPENDENT and may land in one commit or two — neither gates the other (M2 fixes the scroll-independent gap; M1 the scroll-dependent jump). One commit is fine and preferred (one device pass covers both).

## 6. State-transfer ledger (the `#home` scroll-state crossing)

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
home scrollTop save | geometry | out | homeScrollRecorder@S1 | home dataset.st@S1 | homeScrollRecorder | per-scroll | M1SAVE cell
home scrollTop restore | geometry | in | home dataset.st@S2 | applyScreen home branch@S2 | applyScreen | per-unpark | M1RESTORE cell
```

## 7. Coverage Model (Mendeleev catalog) + coverage/mutation matrix

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | `#home.dataset.st` is written while active and read on the un-park reveal (M1SAVE, M1RESTORE). |
| Identities | N/A | No identifier created/changed. |
| Ordering | Yes | Capture-before-reset (the `!parked` guard keeps the pre-park value) and restore-after-unpark (M1SAVE, M1RESTORE; §5 O1/O2). |
| Resources: acquired / owner / endpoint | Yes | No new owned resource; the scroll value is owned element-locally by `dataset.st`; the recorder is the existing capture-phase listener extended (M1SAVE). |
| Async operations | N/A | No async boundary changes; the recorder is passive, the restore synchronous. |
| Stale completions | Yes | A park's clamp-scroll event does not overwrite `dataset.st` (guard); a superseded/re-aborted gesture does not strand or restore a stale value (element-local, not session) — the Loki concern (§8). |
| Normal completion | Yes | Abort→home restores `#home.scrollTop` from `dataset.st`; a fresh →home nav (`resetScroll:true`) stays at top (M1RESTORE). |
| Recovery authority boundary | Yes | The restore lives in `applyScreen` (the scroll-policy owner) and respects `resetScroll` (M1RESTORE; EC §4.17). |
| Emergency disposal | N/A | No owned-pane lifecycle change. |
| Persistence | N/A | `dataset.st` is in-memory. |
| External side effects | Yes (device) | M2 zero ghost/real shift at `scrollTop=0` (home→books commit+abort from top); M1 no growing jump from a scrolled home; the browse ghost not regressed — DEVICE-only (compositor/layout paints jsdom cannot see, Linnaeus [UD]), NOT CI cells (§9). |
| Invariants | Yes | The ghost's clone content-top equals the real fixed-inset content-top (M2ALIGN, unit; the on-screen zero-shift device-owed); `#home.scrollTop` survives the park (M1SAVE/M1RESTORE). |
| Mutation cases | Yes | Each cell names a misattribution/omission mutation on a real channel (block below). |
| Known-red | N/A | None introduced; the suite is green on the shipped mechanism (device gates separate). |
| Composition | Yes | M1 composes with the swipe abort/supersession (the restore fires on any →home reveal via `applyScreen`); M2 composes with both the home and browse app-ghosts (M2ALIGN, M1RESTORE). |
| Contract claims (exact schema) | Yes | The swipe classification/construction contracts are UNCHANGED — the descriptor-coverage/transition gates stay green with no spec edit (asserts they were not touched). |
| Concurrency | Yes | Single-threaded; `dataset.st` is element-local so concurrent/superseded gestures cannot cross-contaminate it (M1RESTORE; §8). |
| Observability | Yes | M1SAVE/M1RESTORE are harness-observable (`#home.dataset.st`, `#home.scrollTop`); M2ALIGN is a unit check on the ghost builder's clone padding; the SHIFT paints are device-only. |

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
M1SAVE | the #home vertical-scroll recorder writes #home.scrollTop into #home dataset.st while home is active and does NOT overwrite it once home is parked so the pre-park value survives the overflow-hidden clamp | app harness set #home scrollTop to a value and dispatch a scroll event on #home then assert #home dataset.st equals that value then add the parked class and dispatch a scroll event and assert #home dataset.st is unchanged not zero | the recorder omits the not-parked guard so a parked scroll event of zero overwrites #home dataset.st and the unchanged-after-park assertion reddens | integration real home scroll recorder with the park guard
M1RESTORE | applyScreen home branch restores #home scrollTop from #home dataset.st when resetScroll is false the abort reveal and keeps the top reset when resetScroll is true a fresh nav | app harness set #home dataset.st to a value then call applyScreen home with resetScroll false and assert #home scrollTop equals that value then call applyScreen home with resetScroll true and assert #home scrollTop is zero | the resetScroll-false branch omits the dataset.st restore so #home stays at zero on the abort reveal and the restored-scroll assertion reddens | integration real applyScreen home branch
M2ALIGN | the outgoing app-ghost builder sets the clone active-view content-top to the real fixed-inset content-top not the vestigial in-flow forty-six padding so the ghost aligns with the real fixed-inset home and browse | unit build the app-ghost via ghostApp against a fake env and assert the clone #library padding-top or the clone active-view offset resolves to the fixed-inset-aligned value derived from the real top plus padding not the string forty-six px | the builder reverts to the in-flow forty-six px so the clone content-top no longer matches the real fixed-inset content-top and the aligned-value assertion reddens | unit ghostApp clone geometry
```

M1SAVE/M1RESTORE drive the REAL recorder/`applyScreen` under the harness; M2ALIGN is a unit check on `ghostApp`'s clone output (the on-screen zero-shift is DEVICE-owed, not a CI cell — jsdom does no layout). Each cell's named mutation is registered in `tools/mutate.mjs` + reddened in `tools/mutation-sweep.mjs`.

## 8. Risk registry + gate-rigor recommendation

- **R-M2 (device, LEADING) — is the ~19px ghost/real shift gone at `scrollTop=0`?** Device-only (Linnaeus [UD]: the exact px + the compositor realization). The M2ALIGN unit cell pins the builder's clone content-top to the fixed-inset-aligned value; the on-screen zero-shift is device-confirmed on the home→books repro (commit + abort) from the TOP. Brunel measures the exact aligned value against the real clone layout (§3).
- **R-M1 (device) — no growing jump from a scrolled home?** Device-only. M1SAVE/M1RESTORE gate the save/restore surface at CI; the on-screen no-jump is device-confirmed (home→books from a SCROLLED position → abort → home returns to its scroll, and the jump does not scale with depth).
- **R-M1-interleave (the Loki concern) — does the scroll save/restore survive the swipe abort / supersession / held-ghost interleavings?** The failure class this saga has repeatedly hit (the `beginRestore` stale-finalizer, the `.89` connect finalizer): a save/restore across a lifecycle flip that a superseded or re-entered gesture corrupts. Mitigations by construction: `dataset.st` is ELEMENT-LOCAL (not session-bound) → supersession cannot strand it; the `!parked` guard → a park's clamp cannot overwrite it; the restore is in `applyScreen` (idempotent per reveal) → a double reveal restores the same value. But whether a mid-gesture home re-scroll, a re-aborted gesture, or a supersede-during-held-ghost can land a STALE `dataset.st` (or a 0) on the visible reveal is exactly the executed-counterexample question — **this warrants a Loki pass on M1 (§ gate rigor).**
- **R-regress-browse (device) — does the M2 clone-padding change regress the browse ghost?** No by construction: `#browse` shares the identical fixed-inset geometry, so the aligned value fixes both uniformly (§3). Device-confirm a browse→X swipe shows no new shift.
- **R-scope — the fix must not alter the real `#home`/`#browse` or `#library:208`.** M2 edits only the CLONE (swipe.js); M1 only adds a recorder clause + a restore line. The real recipes and `#library:208` are untouched (EC §4.21).

**Gate-rigor recommendation.** **M2 is small and side-effect-free** (a single clone-geometry constant on a transient ghost) → **Charpy-quick-stress → Brunel** would suffice for M2 alone. **M1 is a save/restore across the park lifecycle with abort/supersession/held-ghost interleavings** — the precise shape this saga's stale-token bugs came from — so **M1 warrants a Loki pass.** Recommendation: **Charpy TEMPER the whole plan; route M1 to Loki (the abort/supersession/held-ghost interleavings + the `!parked`-guard timing); M2 needs only Charpy's quick stress. Then Brunel + Curie.** The shift-clean verdict is DEVICE-decided downstream, not asserted here.

## 9. Device gate

- **M2 (from the TOP):** home→books swipe, commit AND abort, with `#home` at `scrollTop=0` → NO ghost/real vertical shift (the ~19px gap gone). Repeat browse→X → no new browse-ghost shift (R-regress-browse).
- **M1 (from SCROLLED):** scroll `#home` down, home→books swipe, abort back → home returns to its scrolled position (no jump to top), and the jump does NOT grow with scroll depth.
- Both are compositor/layout paints the rAF/`ghostVsReal` log cannot see (Linnaeus [UD]) — device is the settle. NOT CI cells. Flash C is explicitly NOT in this gate.

## 10. Sequencing and handoff

**Internal sequencing (independent; one commit preferred):**
1. **M2** — the ghost clone-geometry alignment (swipe.js:276; Brunel measures the aligned value vs the real fixed-inset content-top) + the M2ALIGN unit cell.
2. **M1** — the `#home.scrollTop` recorder clause (app.js:2887) + the `applyScreen` home-branch restore (nav.js:157) + M1SAVE/M1RESTORE cells.
Neither gates the other; both device-owed.

**Source artifact:** this plan (`Claude/Plans/PLAN-home-shift-fix.md`).
**Verdict / status:** PLAN_READY. Two grounded mechanisms, both fixed: M2 (leading, scroll-independent) aligns the outgoing-home/browse ghost's clone content-top to the real fixed-inset content-top (a 6i/decouple artifact — the ghost kept the pre-6i in-flow `#library` padding model); M1 (additive, scroll-dependent) preserves `#home.scrollTop` across the park via an element-local `dataset.st` (mirroring the carousel `dataset.sl`), restored on the un-park reveal. The construction contracts are UNCHANGED. The shift-clean verdict is DEVICE-decided (Linnaeus [UD]).
**Decisions made:** M2 = the ghost-builder aligns the clone geometry (option b; option a breaks the translate-based scroll sim); the exact aligned px is Brunel-computes + device-owed; M1 = element-local `dataset.st` save (recorder, `!parked`-guarded) + `applyScreen` restore on `resetScroll:false` (leaving fresh-nav top-reset unchanged); both may land in one commit.
**Open questions / who each waits on:** R-M2, R-M1, R-regress-browse — all DEVICE, downstream of the build.
**Next owner:** Charpy (the plan reviewer) to TEMPER; then a Loki pass on M1 (the interleavings) per §8; then Brunel + Curie. The device gates are downstream.
**Required evidence / gates:** the THREE CI cells green (M1SAVE, M1RESTORE, M2ALIGN — each mutation-verified); the device gates confirmed on the home→books repro (top: M2; scrolled: M1); the construction contracts PROVEN unchanged (the transition gates stay green with no spec edit).
**Records to scrub on approval:** the swipe subsystem contract (note the ghost geometry now tracks the fixed-inset model; the `#home` scroll survives the park); route to Zelda.

## Coverage Model hand-off for Curie (the test author)

Build the three CI cells under `boot({fakeTimers:true, deferRaf:true})`. M1SAVE drives the real `#home` scroll recorder (set `#home.scrollTop`, dispatch a `scroll` event on `#home`, assert `#home.dataset.st`; then add `.parked`, dispatch again, assert unchanged). M1RESTORE drives the real `applyScreen` home branch (set `#home.dataset.st`, call `applyScreen(home,{resetScroll:false})`, assert `#home.scrollTop` restored; `{resetScroll:true}` → 0). M2ALIGN drives `ghostApp` against a fake env and asserts the clone's active-view content-top resolves to the fixed-inset-aligned value (NOT `'46px'`). Each cell's named mutation (§7 block) must be the test that reddens it — mutation-verify in `tools/mutate.mjs` + the sweep. The device gates (R-M2 zero-shift-at-top, R-M1 no-growing-jump, R-regress-browse) are DEVICE-only and NOT CI cells — record them device-owed. Do NOT write a CI cell asserting an on-screen shift (vacuously green — jsdom does no layout). Flash C is NOT in this Coverage Model.

VERDICT: PLAN_READY
