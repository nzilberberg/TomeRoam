# PLAN — the home→books SCROLL SHIFT: two grounded mechanisms, both fixed. **M2 (leading, scroll-independent):** the outgoing-home GHOST lays the id-stripped clone in NORMAL FLOW at the vestigial pre-6i `#library { padding-top: 46px }` model (swipe.js:276), but the real active `#home` is a `position:fixed` inset box at `top:calc(safe+51)`+`padding-top:14` (css:128/131) — a fixed ≈`safe+19`px ghost/real vertical gap realized when the ghost covers/uncovers the real `#home`. Fix: align the clone's first-content viewport-Y to the real fixed-inset content-top (change the builder's clone padding, not `46`). **M1 (additive, scroll-dependent):** parking `#home` at swipe start (app.js:485) flips `overflow-y:auto`→`overflow:hidden` (css:132→102), forcing `#home.scrollTop`→0, which the ghost captured first and nothing restores → an abort→home jump of `scrollTop` px. Fix: preserve `#home.scrollTop` across the park via an element-local `dataset.st` (mirroring the carousel `dataset.sl`), restored on the un-park reveal. Both are DEVICE-owed to confirm (compositor/layout paints the rAF log cannot see).

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor",
  "patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":true,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/swipe.js:274-292","js/app.js:478-486","js/app.js:548-551","js/app.js:442-448","js/app.js:1220-1229"],
  "affected_contracts":[],
  "staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md"],
  "blocking_questions":["M1RESTORE","M1FRESHNAV","M2ALIGN"]} -->

Status: **PLAN_READY (M1 re-designed after Loki KILL — `Claude/Loki/STRIKE-home-shift-m1.md`, HEAD `5167e8c`; M2 stays Charpy-FORGE'd `3940340`). Routes to Charpy quick re-stress → a Loki RE-strike on the patched M1 → Curie + Brunel.** Grounded by Linnaeus `PROBE-home-shift-2026-07-29.md` (HEAD `d96ca40`, `.267`). M2 (leading, scroll-independent, FORGE'd — UNTOUCHED): the ghost kept the pre-6i in-flow `#library` padding model while the real `#home`/`#browse` became fixed-inset boxes → a fixed ~19px ghost/real gap; the fix aligns the clone's content-top (§3). M1 (additive, scroll-dependent) — Loki KILL'd the FIRST design: a stale `dataset.st` survived a fresh-nav `resetScroll:true` reset that moves the visible scroll WITHOUT a scroll event (a 0→0 write on an already-clamped element), then won a later top-start gesture's abort reveal = a jump worth the stale value. **The re-design (Loki's direction 2) restores the abort→home scroll from the gesture's OWN `capture.ghostY` (swipe.js:289, stored `cur.ghostY` app.js:549) — the exact value the ghost was built from and the user watched throughout — retiring the recorder/`dataset.st` entirely, so there is NO separately-maintained record to desync (§4).** The shift-gone is DEVICE-decided (compositor/layout paints, Linnaeus [UD]); the stale-restore LOGIC is now CI-testable (§7 M1FRESHNAV). ⛔ the red `--page-bg` gradient (css:41) is NOT touched.

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
- **async_change: false** — no async boundary changes shape; M1 adds no listener — the abort/recovery restore is synchronous with the un-park; M2 is a static clone-geometry edit.
- **persistence_migration: false** — nothing persisted; `cur.ghostY` is in-memory per-gesture session state.
- **lifecycle_ownership: false** — no resource acquire/dispose lifecycle changes; `#home` is a pre-existing element and the scroll value is data, not an owned resource.

## 1. Defining records and authority

**Verdict: the Linnaeus probe is DERIVED; both mechanisms are source-grounded and independently fixable; the leading cause (M2) is a scroll-INDEPENDENT layout artifact of the 6i fixed-`#home` + the `.267` fixed-`#browse` decouple (the ghost kept the old in-flow model); no unresolved GAP blocks the build — the residual is the DEVICE realization (Linnaeus [UD]).** Precedence (EC §2): (1) this assignment; (2) verified HEAD `d96ca40`/`.267` source; (3) Linnaeus `PROBE-home-shift-2026-07-29.md`; (4) the swipe subsystem contract.

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `PROBE-home-shift-2026-07-29.md` (Linnaeus, HEAD `d96ca40`/`.267`) | **M2 (scroll-INDEPENDENT):** the outgoing-home ghost clones `.app`, strips ids (swipe.js:277), and lays `#home` content in normal flow at `#library { padding-top: 46px }` (swipe.js:276; css:208) — the pre-6i in-flow model; but the real active `#home` is a `position:fixed` inset box at `top:calc(safe+51)`+`padding-top:14` (css:126-134) that ignores `#library`'s padding → a fixed ≈`safe+19`px ghost/real vertical gap, realized when the ghost covers/uncovers the real `#home`. **M1 (scroll-DEPENDENT):** `showAppView` parks `#home` at swipe start (app.js:485), flipping `overflow-y:auto`(css:132)→`overflow:hidden`(css:102), forcing `#home.scrollTop`→0; the ghost captured it first (swipe.js:289) and no save/restore exists → an abort→home jump of `scrollTop` px. The exact px + the compositor realization are [UD] (device). `released=23` is departing books rows, benign. | Deriver (source-grounded, cited) | GOVERNS both fixes (§3 M2, §4 M1) and the device gate (§9). | — |
| 6i (`PL-swipe-6i-home-fixed-ownscroll`) + the browse decouple (`PL-swipe-browse-fixed-ownscroll`, `.267`) | Active `#home` (6i) and `#browse` (`.267`) are `position:fixed` inset own-scroll boxes at `top:calc(safe+51)`+`padding:14` (css:128/131, 152/154); the pre-6i in-flow model cleared the fixed topbar via `#library { padding-top: 46px }` (css:208). | Active policy + shipped source | ROOT of M2: the ghost's `paddingTop:46` (swipe.js:276) is the vestigial in-flow model; the real views moved to fixed-inset, the ghost did not. The fix aligns the ghost to the fixed-inset geometry. Both real views share the geometry, so the fix is uniform (§3). | Note in the subsystem contract that the ghost geometry now tracks the fixed-inset model. |
| `Claude/Loki/STRIKE-home-shift-m1.md` (HEAD `5167e8c`) | KILL of the first M1 design: a separately-maintained `#home.dataset.st` desynced from the visible scroll (a `resetScroll:true` fresh-nav reveal moves the scroll with NO event → the record is never invalidated → a stale value wins a later abort reveal). Direction 2: restore from the gesture's own `capture.ghostY`. | Adversary (executed, control-validated) | GOVERNS the M1 re-design (§4): fix 2 restores from `cur.ghostY` (no separate record). The KILL'd recorder/`dataset.st` mirror of the carousel `dataset.sl` (app.js:2887, `copyScroll` swipe.js:217) is REJECTED — that recorder is untouched. | Note the exclusion so the `dataset.st` approach is not re-proposed. |
| `EngineeringContract.md` §4.16 (no duplicate source of truth), §4.7 (intermediate states), §4.21 (narrow scope), §4.10 (mutation) | Do not store a cause plus a separately-mutable derived consequence; assert both sides of a before/after; fix the invariant without redesigning adjacent systems; mutations test misattribution. | Core rules | Fix 2 obeys §4.16 — the restore value IS the gesture's own `cur.ghostY` (app.js:549), no separately-maintained record to desync; coverage reproduces the KILL interleaving (M1FRESHNAV); the fixes are narrow (a clone constant; two restore lines); mutations name the channels (§7). | Register the mutations. |

**Authority precedence.** This assignment + the verified `.267` source govern the shape; the device home→books repro (top vs scrolled) governs the shift verdict; Linnaeus governs the two mechanisms and marks the exact px/compositor realization [UD] (device). No two sources conflict. M2 is the leading cause for the logged `ghostY=0` persist (scroll-independent); M1 is additive when home is scrolled.

⛔ **HARD CONSTRAINT (user):** the red `--page-bg` gradient (css:41) is NOT stripped/altered. Neither fix touches it.

## 2. Scope boundary

**MOVES (fixed):**
- M2 — the outgoing-home (and -browse) ghost's clone geometry: align the clone's first-content viewport-Y to the real fixed-inset view's content-top (§3).
- M1 — the abort→home (and supersession-recovery→home) reveal restores `#home.scrollTop` from the gesture's OWN `capture.ghostY` (`cur.ghostY`, swipe.js:289 / app.js:549) — the value the ghost was built from. No recorder, no separately-maintained record (§4; Loki direction 2).

**STAYS (do not re-touch):**
- The swipe classification/construction/finalization contracts and the three-layer oracle — UNCHANGED (no plan-value change).
- The real `#home`/`#browse` fixed-inset recipes (css:126-158) and the `.app` runway (css:74) — untouched; M2 changes only the CLONE geometry (swipe.js), M1 only adds a save/restore.
- The `#library { padding-top: 46px }` real-app rule (css:208) — vestigial (both real views are fixed and ignore it) but harmless; NOT edited (out of scope; the fix is on the clone only).
- The carousel `dataset.sl` recorder (app.js:2887) — UNTOUCHED (fix 2 needs no `#home` recorder; the KILL'd first design's recorder clause is not added).
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

**The fix (Loki direction 2 — restore from the gesture's OWN `capture.ghostY`; NO separate record).** The outgoing-home ghost already captures `ghostY = #home.scrollTop` at gesture build (swipe.js:289), BEFORE `renderDestination` parks home (buildConstruction is outgoing-first, swipe.js:341) — so `ghostY` is the PRE-park scroll, per-gesture fresh, already stored on the session as `cur.ghostY` (app.js:548-551) and already read for the reveal diagnostic (app.js:1154). It is the exact value the ghost DISPLAYED for the whole gesture. The fix restores the reveal from it, at the two sites where home un-parks as the aborted/recovered SOURCE:
- **Abort→home (no-hold, `abortRender:'none'` — every home-source abort).** In the no-hold abort branch (app.js:1223-1229), after `applyScreen(dest=home,{resetScroll:false})` un-parks home, add: `if (dest.v === 'home' && cur.ghostY != null) $('home').scrollTop = cur.ghostY;`. Synchronous with the un-park (no paint between), so home reveals at `ghostY`, not the clamped 0.
- **Supersession-recovery→home.** The `begin()`-recovery restores the source (app.js:442-445); when the superseded gesture's source is home, add the same restore after its `applyScreen(currentDesc())`: `if (cur && cur.ghostY != null && currentDesc().v === 'home') $('home').scrollTop = cur.ghostY;` — the same self-consistent value (that gesture's own `ghostY`).

Only home-SOURCE gestures build a home app-ghost, so `cur.ghostY` is set exactly when it is needed; a →home DEST reveal (browse→home) builds NO capture (`cur.ghostY` null, app.js:544) and is a fresh-nav `resetScroll:true` top-reset anyway. `cur.ghostY != null` guards the non-home paths. **No recorder, no `dataset.st`, no `applyScreen`/nav.js restore branch** — the KILL'd first design's pieces are NOT built.

**Why this is re-strike-robust — it kills the divergence CLASS by construction (the adversary discipline: defenses are structural, not enumerated; EC §4.16 no duplicate source of truth).** Loki's KILL was a SEPARATELY-MAINTAINED record (`dataset.st`) desyncing from the visible scroll: a `resetScroll:true` reveal moved the visible scroll to 0 WITHOUT a scroll event (a 0→0 write on an already-clamped element) and never invalidated the record, so a stale value survived arbitrarily many navigations and won a later gesture's abort reveal. Fix 2 removes the separate record ENTIRELY: the restore value IS the gesture's own `capture.ghostY`, the single source the ghost was already built from, so the revealed scroll is self-consistent with what the user watched BY CONSTRUCTION and there is nothing to desync. Against the enumerated re-strike planes:
- **The KILL's fresh-nav interleaving** (scroll 500 → nav-away → nav-home `resetScroll:true` → swipe-from-top → abort): the top-start gesture captures `ghostY=0` FRESH (swipe.js:289 reads the live, already-reset `scrollTop=0`); the abort restores 0 — the value the ghost showed — NOT the stale 500, because no persisted record carries the 500 forward. **Closed.**
- **Double-abort / re-abort:** one gesture = one `cur.ghostY`; the restore is idempotent (same session value); a new gesture captures its own fresh `ghostY`.
- **Supersede-during-held-ghost:** the recovery restores from the SUPERSEDED session's own `cur.ghostY` (its pre-park scroll) — self-consistent with the ghost that session showed; the successor captures its own `ghostY`. No cross-gesture value leaks.
- **Mid-gesture home re-scroll:** parked home is `pointer-events:none` + off-screen (css:98-102) — no user scroll reaches it, and `ghostY` was captured pre-park (Loki §6, held).

**The corrected §4 claim (Loki §4 lie retired).** The first design claimed `dataset.st` is "equivalently the ghost's `capture.ghostY` … the same pre-park value" — FALSE for a separately-maintained record (per-gesture `ghostY` vs last-scroll `dataset.st`). Fix 2 makes the equivalence TRUE by construction by USING `capture.ghostY` as the sole value rather than a copy that could diverge. The durable planning lesson (Loki §7): **enumerate every writer of the OBSERVABLE (the visible scroll), not every writer of the record** — fix 2 obeys it by not maintaining a record at all.

## 5. Ordering and atomicity + the state-transfer treatment

**State transferred (M1):** the value `#home.scrollTop`, across the park lifecycle flip (`overflow-y:auto`→`hidden`→`auto`). Producer: `ghostApp`'s capture (swipe.js:289) into `cur.ghostY` (app.js:549), taken PRE-park. Consumer: the abort/recovery→home restore (app.js:1227 / 444). Owner: the gesture session (`cur.ghostY`), per-gesture. **Staleness: NONE possible — the value is captured fresh per gesture and consumed only by THAT gesture's own reveal; there is no cross-gesture or last-scroll record to desync** (the Loki-KILL'd `dataset.st` is retired). §6 ledger.

**Ordering invariants (pin the invariant, not the line — EC §4.7):**
- **O1 (M1 capture-before-park).** `ghostApp` captures `ghostY = #home.scrollTop` (swipe.js:289) BEFORE `renderDestination` parks home (buildConstruction outgoing-first, swipe.js:341), so `ghostY` is the real pre-park scroll (a post-park capture would read the clamped 0). This ordering is EXISTING (the ghost's translate already needs it) and inherited unchanged. `@order`: build outgoing ghost (capture `ghostY`) → renderDestination parks home.
- **O2 (M1 restore-after-unpark).** The restore `#home.scrollTop = cur.ghostY` must occur AFTER `applyScreen(home)` un-parks (removes `.parked`, restoring `overflow-y:auto` so `scrollTop` is settable). The fix places it immediately AFTER `applyScreen(dest=home)` in the finalize/recovery (app.js:1227 / 444), synchronously (no paint between un-park and restore). `@order`: `applyScreen(home)` un-parks → set `#home.scrollTop = cur.ghostY`.
- **O3 (M2, incidental).** The ghost is built (with the aligned clone geometry) BEFORE `renderDestination` parks the real `#home` (swipe.js:341 outgoing-first) — unchanged; the M2 fix alters only the clone's padding constant.

**Atomicity.** M2 (the clone-geometry constant, swipe.js) and M1 (two restore lines in app.js finalize/recovery) are INDEPENDENT and may land in one commit or two — neither gates the other. One commit is preferred (one device pass covers both).

## 6. State-transfer ledger (the `#home` scroll-state crossing)

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
home scroll ghostY abort | geometry | in | ghostApp capture@S1 | abort home restore@S2 | gestureSession | per-gesture | M1RESTORE cell
home scroll ghostY recovery | geometry | in | ghostApp capture@S1 | recovery home restore@S2 | gestureSession | per-gesture | M1FRESHNAV cell
```

## 7. Coverage Model (Mendeleev catalog) + coverage/mutation matrix

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | `cur.ghostY` is captured pre-park (swipe.js:289) and read on the abort/recovery→home reveal (M1RESTORE, M1FRESHNAV). |
| Identities | N/A | No identifier created/changed. |
| Ordering | Yes | Capture-before-park (`ghostY` taken pre-park, swipe.js:289/341) and restore-after-unpark (app.js:1227/444) (M1RESTORE, M1FRESHNAV; §5 O1/O2). |
| Resources: acquired / owner / endpoint | Yes | No new owned resource and no new record; the restore value is the gesture session's own `cur.ghostY` (app.js:549), consumed at the abort/recovery reveal (M1RESTORE). |
| Async operations | N/A | No async boundary changes; the restore is synchronous with the un-park. |
| Stale completions | Yes | `cur.ghostY` is per-gesture and consumed only by that gesture's own reveal → NO stale value can survive a fresh-nav reset (the Loki KILL closed) or a supersession (M1FRESHNAV; §8). |
| Normal completion | Yes | Abort→home restores `#home.scrollTop` from the gesture's `cur.ghostY`; a fresh →home nav (`resetScroll:true`, `cur.ghostY` null) stays at top (M1RESTORE, M1FRESHNAV). |
| Recovery authority boundary | Yes | The supersession-recovery→home restore uses the SUPERSEDED session's own `cur.ghostY` — self-consistent with the ghost it showed (M1FRESHNAV; EC §4.17). |
| Emergency disposal | N/A | No owned-pane lifecycle change. |
| Persistence | N/A | `cur.ghostY` is in-memory per-gesture session state. |
| External side effects | Yes (device) | M2 zero ghost/real shift at `scrollTop=0` (home→books commit+abort from top); M1 no growing jump from a scrolled home; the browse ghost not regressed — DEVICE-only (compositor/layout paints jsdom cannot see, Linnaeus [UD]), NOT CI cells (§9). |
| Invariants | Yes | The ghost's clone content-top equals the real fixed-inset content-top (M2ALIGN, unit; the on-screen zero-shift device-owed); the abort→home reveal equals the gesture's own `capture.ghostY` — no separately-maintained record to desync (M1RESTORE, M1FRESHNAV). |
| Mutation cases | Yes | Each cell names a misattribution/omission mutation on a real channel (block below). |
| Known-red | N/A | None introduced; the suite is green on the shipped mechanism (device gates separate). |
| Composition | Yes | M1 composes with the swipe abort AND the supersession recovery (both restore from the same-gesture `cur.ghostY`, app.js:1227/444); M2 composes with both the home and browse app-ghosts (M2ALIGN, M1RESTORE, M1FRESHNAV). |
| Contract claims (exact schema) | Yes | The swipe classification/construction contracts are UNCHANGED — the descriptor-coverage/transition gates stay green with no spec edit (asserts they were not touched). |
| Concurrency | Yes | Single-threaded; `cur.ghostY` is per-gesture session state so concurrent/superseded gestures cannot cross-contaminate the restore (M1FRESHNAV; §8). |
| Observability | Yes | M1RESTORE/M1FRESHNAV are harness-observable (`#home.scrollTop` after the abort, `cur.ghostY`); M2ALIGN is a unit check on the ghost builder's clone padding; the SHIFT paints are device-only. |

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
M1RESTORE | on an abort to home the reveal restores #home scrollTop from the gestures own captured ghostY the value the ghost was built from not the clamped zero left by the park | app harness scroll home to a value then swipe home to books so the outgoing ghost captures ghostY equal to that value then abort and assert #home scrollTop equals that value the sessions ghostY not the clamped zero | the abort omits the ghostY restore so home reveals at the clamped zero and the restored-scroll assertion reddens | integration real abort home reveal from cur ghostY
M1FRESHNAV | a prior home scroll clamped by a park and then reset by a fresh nav does NOT leak into a later top-start gestures abort reveal the abort restores the gestures own ghostY of zero not the stale prior value | app harness scroll home to five hundred then nav away to books which parks and clamps to zero then nav home with resetScroll true which resets zero to zero with no scroll event then swipe home to books from the top so the ghost captures ghostY zero then abort and assert #home scrollTop is zero not five hundred | the restore reads a persisted last-scroll record instead of the gestures own ghostY so the stale five hundred survives the fresh-nav reset and reaches the abort reveal and the equals-zero assertion reddens | integration the Loki fresh-nav interleaving
M2ALIGN | the outgoing app-ghost builder sets the clone active-view content-top to the real fixed-inset content-top not the vestigial in-flow forty-six padding so the ghost aligns with the real fixed-inset home and browse | unit build the app-ghost via ghostApp against a fake env and assert the clone #library padding-top or the clone active-view offset resolves to the fixed-inset-aligned value derived from the real top plus padding not the string forty-six px | the builder reverts to the in-flow forty-six px so the clone content-top no longer matches the real fixed-inset content-top and the aligned-value assertion reddens | unit ghostApp clone geometry
```

M1RESTORE/M1FRESHNAV drive the REAL gesture abort + recovery under the harness (reading `#home.scrollTop` after the reveal, not a record); M1FRESHNAV reproduces the executed Loki interleaving (scroll→nav-away→nav-home→swipe-from-top→abort) and reddens on a stale-restore. M2ALIGN is a unit check on `ghostApp`'s clone output (the on-screen zero-shift is DEVICE-owed, not a CI cell — jsdom does no layout). Each cell's named mutation is registered in `tools/mutate.mjs` + reddened in `tools/mutation-sweep.mjs`.

## 8. Risk registry + gate-rigor recommendation

- **R-M2 (device, LEADING) — is the ~19px ghost/real shift gone at `scrollTop=0`?** Device-only (Linnaeus [UD]: the exact px + the compositor realization). The M2ALIGN unit cell pins the builder's clone content-top to the fixed-inset-aligned value; the on-screen zero-shift is device-confirmed on the home→books repro (commit + abort) from the TOP. Brunel measures the exact aligned value against the real clone layout (§3).
- **R-M1 (device) — no growing jump from a scrolled home?** Device-only. M1RESTORE gates the CI restore surface (abort→home restores `cur.ghostY`); the on-screen no-jump is device-confirmed (home→books from a SCROLLED position → abort → home returns to its scroll, jump does not scale with depth).
- **R-M1-interleave (WAS the Loki KILL — now CLOSED by construction, with a CI regression cell).** The first design (a separately-maintained `dataset.st`) was KILL'd: a `resetScroll:true` fresh-nav reveal moved the visible scroll WITHOUT a scroll event and never invalidated the record, so a stale value won a later abort reveal (Loki §4, executed + control-validated). Fix 2 CLOSES the class structurally — no separate record; the abort restores the gesture's own `capture.ghostY`, self-consistent with the watched ghost (§4). **Coverage blast radius (Loki §5, now fixed):** the KILL proved the OLD M1RESTORE cell AND the §9 device gate both PASSED over the fracture (neither exercised the intermediate fresh-nav). The new **M1FRESHNAV** cell reproduces exactly that interleaving and reddens on any stale-restore — the stale-value-cannot-survive logic is now CI-tested (the shift-gone on-screen stays device-owed). Residual for the RE-strike: the supersession-recovery→home site (app.js:444) is NEW and sits on the same plane — see gate rigor.
- **R-regress-browse (device) — does the M2 clone-padding change regress the browse ghost?** No by construction: `#browse` shares the identical fixed-inset geometry, so the aligned value fixes both uniformly (§3). Device-confirm a browse→X swipe shows no new shift.
- **R-scope — the fix must not alter the real `#home`/`#browse` or `#library:208`.** M2 edits only the CLONE (swipe.js); M1 only adds two restore lines (the abort finalize app.js:1227 and the supersession recovery app.js:444) — no recorder, no `dataset.st`, no `#library:208` / nav.js edit. The real recipes are untouched (EC §4.21).

**Gate-rigor recommendation — do NOT skip the RE-strike.** M1's FIRST design passed Charpy FORGE and its OWN coverage cell, yet Loki KILL'd it on an interleaving the coverage never exercised — so the interleaving space is proven subtle and the patched promise must be re-stressed adversarially. Recommendation (agreeing with the coordinator): **Charpy quick re-stress on the M1 patch** (the two restore sites, the `cur.ghostY != null` guard, the recovery-path correctness — no new seam) **→ a Loki RE-strike on the patched M1** (the NEW supersession-recovery→home site app.js:444; double-abort; and Loki's own lesson — enumerate every writer of the visible scroll the `cur.ghostY` restore might still miss) **→ then Curie + Brunel.** M2 stays FORGE'd (untouched — a re-stress need not revisit it). **Why not skip:** fix 2 is structurally stronger (no separate record) but adds a NEW restore site on the exact plane the KILL lived on; one blind Loki pass is cheap against another KILL cycle discovered after Brunel builds. The shift-clean verdict stays DEVICE-decided downstream, not asserted here.

## 9. Device gate

- **M2 (from the TOP):** home→books swipe, commit AND abort, with `#home` at `scrollTop=0` → NO ghost/real vertical shift (the ~19px gap gone). Repeat browse→X → no new browse-ghost shift (R-regress-browse).
- **M1 (from SCROLLED):** scroll `#home` down, home→books swipe, abort back → home returns to its scrolled position (no jump to top), and the jump does NOT grow with scroll depth.
- Both on-screen shifts are compositor/layout paints the rAF/`ghostVsReal` log cannot see (Linnaeus [UD]) — device is the settle. **But the M1 stale-restore LOGIC (the Loki fresh-nav interleaving) IS CI-tested (M1FRESHNAV, §7) — only the shift PAINT is device.** Flash C is explicitly NOT in this gate.

## 10. Sequencing and handoff

**Internal sequencing (independent; one commit preferred):**
1. **M2** — the ghost clone-geometry alignment (swipe.js:276; Brunel measures the aligned value vs the real fixed-inset content-top) + the M2ALIGN unit cell.
2. **M1** — the two `cur.ghostY` restore lines (the abort finalize app.js:1227 + the supersession recovery app.js:444) + M1RESTORE/M1FRESHNAV cells. No recorder, no `dataset.st`.
Neither gates the other; the on-screen shifts are device-owed, the M1 stale-restore logic is CI (M1FRESHNAV).

**Source artifact:** this plan (`Claude/Plans/PLAN-home-shift-fix.md`).
**Verdict / status:** PLAN_READY. M2 (leading, scroll-independent, Charpy-FORGE'd, UNTOUCHED) aligns the outgoing-home/browse ghost's clone content-top to the real fixed-inset content-top. M1 (additive, scroll-dependent) was Loki-KILL'd in its first form (a `dataset.st` that desynced across a fresh-nav reset); the re-design (Loki direction 2) restores the abort/recovery→home scroll from the gesture's OWN `capture.ghostY` (`cur.ghostY`) — no separately-maintained record to desync — closing the divergence class by construction. The construction contracts are UNCHANGED. The shift-clean verdict is DEVICE-decided (Linnaeus [UD]); the stale-restore logic is CI-tested.
**Decisions made:** M2 = the ghost-builder aligns the clone geometry (option b; option a breaks the translate-based scroll sim); the exact aligned px is Brunel-computes + device-owed. M1 = restore from the gesture's own `cur.ghostY` at the abort finalize AND the supersession recovery (Loki direction 2), retiring the KILL'd recorder/`dataset.st`; both fixes may land in one commit.
**Open questions / who each waits on:** R-M2, R-M1, R-regress-browse — DEVICE, downstream of the build; the M1 patch awaits a Loki RE-strike (§8).
**Next owner:** Charpy (quick re-stress on the M1 patch); then a Loki RE-strike on the patched M1 (§8); then Brunel + Curie. M2 stays FORGE'd. The device gates are downstream.
**Required evidence / gates:** the THREE CI cells green (M1RESTORE, M1FRESHNAV, M2ALIGN — each mutation-verified; M1FRESHNAV reproduces the Loki interleaving and reddens on a stale-restore); the device gates confirmed on the home→books repro (top: M2; scrolled: M1); the construction contracts PROVEN unchanged (the transition gates stay green with no spec edit).
**Records to scrub on approval:** the swipe subsystem contract (note the ghost geometry now tracks the fixed-inset model; the `#home` scroll survives the park); route to Zelda.

## Coverage Model hand-off for Curie (the test author)

Build the three CI cells under `boot({fakeTimers:true, deferRaf:true})`. **M1RESTORE** drives the REAL home→books gesture (scroll `#home` to a value → swipe so the ghost captures `ghostY` = that value → abort) and asserts `#home.scrollTop` equals the gesture's `cur.ghostY` after the reveal (not the clamped 0). **M1FRESHNAV** reproduces the executed Loki interleaving: scroll home to 500 → nav away to Books (parks, clamps to 0) → nav Home with `resetScroll:true` (0→0, no scroll event) → swipe home→books from the top (ghost captures `ghostY=0`) → abort → assert `#home.scrollTop` is 0, NOT 500; its mutation is "restore reads a persisted last-scroll record instead of the gesture's `cur.ghostY`" (the KILL'd design) → the stale 500 survives → reddens. **M2ALIGN** drives `ghostApp` against a fake env and asserts the clone's active-view content-top resolves to the fixed-inset-aligned value (NOT `'46px'`). Each cell's named mutation (§7 block) must be the test that reddens it — mutation-verify in `tools/mutate.mjs` + the sweep. The device gates (R-M2 zero-shift-at-top, R-M1 no-growing-jump, R-regress-browse) are DEVICE-only and NOT CI cells — record them device-owed. Do NOT write a CI cell asserting an on-screen shift (vacuously green — jsdom does no layout). Flash C is NOT in this Coverage Model.

VERDICT: PLAN_READY
