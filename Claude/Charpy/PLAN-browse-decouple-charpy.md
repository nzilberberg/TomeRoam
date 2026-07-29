# Charpy review — PLAN-browse-decouple (`#browse` fixed own-scroll)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom"} -->

Reviewed: `Claude/Plans/PLAN-browse-decouple.md` (Vitruvius, HEAD `6e2e6a7`, PLAN_READY), full. Ground truth
read in full: Linnaeus `PROBE-decouple-browse-scroll` (`7ee66ab`) and `PROBE-alphaindex-abort` (`8b328f5`),
plus HEAD `.266` source — `js/virtuallist.js` metrics/realize/anchor (144-318), `js/browse.js`
createController/recorder/applyScrollY (198-246, 625-644), `js/scrollbar.js` (86-96), `js/nav.js` `setView`
(44-108), and the `#browse`/`.alphaindex` CSS.

## Applicability

- **defining_records: true** — the plan reconciles the two Linnaeus probes, the `.266` probe being retired,
  the 6i `PL-swipe-6i-home-fixed-ownscroll` precedent, the frozen construction contract, and the subsystem;
  `## Defining records` below.
- **boundary_relocation: false (for THIS review)** — the PLAN relocates a scroll-read/write surface (window →
  `#browse.scrollTop`) and carries its own `vitruvius-ledger`; I review that relocation but author no
  relocation, so my casebook declares no source ranges of its own. The plan's ledger completeness is assessed
  in the findings, not re-declared here.
- **callee_replacement / contract_shape: false** — I concur with the plan: no callee is replaced (the `.266`
  pin is a pure deletion), and `classifyTransition`/`constructionPlanFor`/`finalizationPlanFor` + the frozen
  spec are genuinely untouched (verified — the only `swipe.js` change is a `ghostApp` internal).
- **project_adapter: tomeroam-js-dom.** The relocated writes are `#browse.scrollTop = …` and
  `app.style.minHeight` removal; the classList surface is the `.alphaindex` clone exclusion
  (`clone.querySelectorAll('.alphaindex').forEach(remove)`); no `d.<field>` contract member changes.

## Verdict

**TEMPER.** The design is sound and the biggest fracture point survives the strike: the books virtual-list
re-home is mathematically correct (the realize-window arithmetic genuinely ports to an element scroller, the
capture-phase document listener catches `#browse`'s non-bubbling scroll, the absolute consumers re-home
cleanly). The `.alphaindex` exclude, the KIND-model change, and the navbar claim all hold. Two Structural
tightenings block a clean build: **F1** — the REALIZE/RESTORE CI cells overclaim what jsdom can prove
(geometry is zero-height under no-layout), so the coverage prose must be scoped to the wiring/contract with the
real-geometry arithmetic marked device/manual-owed (the same honesty the plan already applies to GHOSTSCROLL);
**F2** — the atomic commit boundary is under-scoped: S3 (the browse `ghostY` re-home + the strip exclude) must
ship with S1+S2, or every browse→browse/overlay swipe builds a jump-to-top ghost. F3 is a minor scope
precision. No fatal crack — the relocation is correct and buildable.

## Defining records

**AGREE — no conflict.** Both Linnaeus probes are DERIVED and cited: `PROBE-decouple-browse-scroll` Q1
establishes the `.alphaindex` blocker is transform(/`will-change`)-ONLY (the recipe must omit `will-change` —
the load-bearing caveat, which §3 honors) and Q2 enumerates the six consumers; `PROBE-alphaindex-abort` Q3
establishes the decouple's own `#browse.scrollTop` ghost-offset re-couples the strip (so §9's exclude is owed)
and that flash C is coupling-independent (correctly deferred). `PL-swipe-6i-home-fixed-ownscroll` is the
governing precedent — this is its symmetric completion for `#browse`. The frozen construction contract is
verified untouched. The red `--page-bg` gradient (css:41) is referenced by the recipe, never altered — the
hard user constraint is honored.

## Load-bearing verification (the seven stress axes)

**1. B1 — the books virtual-list re-home (the biggest risk) — SOUND.** I verified each part against source:
- **The realize-window arithmetic ports.** `_realize` computes `top = metrics.scrollY() - metrics.listTop()`
  (virtuallist.js:206). With the default metrics `scrollY=window.scrollY`, `listTop=window.scrollY +
  rect.top` (virtuallist.js:164-168), this cancels to `-rect.top` — a viewport-relative quantity independent
  of the scroll ORIGIN. Re-homing to `scrollY→#browse.scrollTop`, `listTop→#browse.scrollTop + listRect.top -
  browseRect.top` preserves the cancellation: `top = browseRect.top - listRect.top ≈ #browse.scrollTop`
  (padding aside) — the scroll offset into the list within `#browse`'s box. The absolute consumer
  `anchorEntryY = y + listTop()` (virtuallist.js:317) ALSO cancels the current scroll cleanly under the
  re-home (`y + #browse.scrollTop + listRect.top - browseRect.top = y + listContentOffset_in_browse`,
  scroll-independent) — the exact analog of the document version. So the plan's claim ("the window math is
  scroll-origin-relative; swap the origin and every consumer follows") is CORRECT.
- **The capture-phase listener catches `#browse`'s scroll.** Moving virtuallist.js:150
  (`window.addEventListener('scroll', onDocScroll)`) to `document.addEventListener('scroll', …,
  {capture:true})` works: scroll events do not bubble but ARE dispatched in the capture phase on ancestors, so
  a `#browse` scroll reaches a capture-phase document listener. This mirrors the proven scrollbar.js:95
  pattern (verified). `onDocScroll` reads no `e.target`, so it needs only to FIRE; its `activeCtl`/`isVisible`
  guards scope it to the active browse controller (home/`#home` scroll → `activeCtl` null → early-return).
- **The metrics injection is a NEW addition (worth an explicit build-note).** browse.js:633-641 currently
  injects NO `metrics` (it uses the window default) and injects `scrollTo: (y) => window.scrollTo(0, y)`. So
  the re-home ADDS a `#browse`-relative `metrics` object AND changes the injected `scrollTo` to
  `#browse.scrollTop = y`. The plan's §6 B1 specifies this ("inject scroller-relative metrics keyed to
  `#browse`") and cites browse.js:640 — accurate, but the CURRENT absence of an injection (default used)
  should be stated so Brunel adds rather than edits. Verdict on B1: the arithmetic is correct; the rework is
  real but well-specified. (See F1 on whether the CI cell can PROVE the geometry.)

**2. The `.alphaindex` exclude — SOUND and correctly scoped.** The exclude removes `.alphaindex` only from the
transient outgoing GHOST clone (`ghostApp`, built for `home→browse`/`browse→browse`/`browse→overlay`
outgoings). The REAL strip on the live/incoming/restored `#browse` is untouched — on a browse→browse commit
the incoming real `#browse` keeps its strip; on an abort `applyScreen(source)` re-renders the source page WITH
its real strip and the ghost drops. So browse→browse (both pages have strips) is not broken — no real strip is
removed. It is a NET IMPROVEMENT: today the ghost's strip renders MISPOSITIONED (dy = scroll, Linnaeus
`alphaindex dy=13631`) because the clone transform re-parents the fixed strip; excluding it removes a
visibly-wrong element rather than adding one. The outgoing ghost sliding out without its rail is device-owed
(R-strip/R-browse2browse) but is strictly better than a floating misplaced rail. `browse→home` is unaffected
(its outgoing is the real `#browse`, not a ghost — option (a)); `browse→overlay`'s ghost is covered by the
opaque overlay. The exclude on a home-source clone is a harmless no-op (home has no strip). Correctly scoped;
flash C (the in-list divider re-raster) is a DIFFERENT element and correctly OUT (§13).

**3. browse→browse as a fixed mover — device-owed, no source regression found.** Today the incoming `#browse`
is in-flow (clipped by `.app overflow-x:clip`); under the decouple it is a `position:fixed` transformed mover
— the same pattern 6i proved for `#home`-as-incoming-mover. The transient mid-drag transform re-parents
`.alphaindex` to ride the slide and clears at finalize (exactly as today's in-flow transform does, css:633).
The commit/abort finalize clears the transform (app.js movers loop). No source path assumes `#browse` stays
in-flow during the slide. The slide PAINT (off-screen bleed, strip re-anchor) is honestly device-owed
(R-browse2browse); STRIPEXCLUDE/RESTORE/GHOSTSCROLL gate the CI-visible seams. No regression identified in
source.

**4. The KIND-model change — SAFE under `window.scrollY ≡ 0`.** I checked the classifier/spec/reveal for an
in-flow/shared-scroll assumption that breaks: (a) `classifyTransition`/`constructionPlanFor`/
`finalizationPlanFor` are pure kind-model functions (view names), read no scroll — genuinely unchanged, browse
stays `'browse'`; (b) the 6h commit→home settle gate triggers on `cur.scroll0 > SETTLE_SCROLL_MIN` where
`scroll0 = window.scrollY ≡ 0`, so it stays DORMANT — CORRECT, because a fixed `#browse` never collapses the
document, so there is no clamp/snap to settle (and the 6i commit→home hold branch is already retired,
app.js:1188-1192); (c) the abort restores `window.scrollTo(0, cur.scroll0)` become `scrollTo(0,0)` no-ops
except the re-homed browse→browse restore (`#browse.scrollTop = cur.srcScroll`), which is correct — on
non-rerender aborts `#browse` is not re-rendered so its `scrollTop` is undisturbed. The `scroll0`-stays-window
/ `srcScroll`-added split (§6 B6, R4) correctly prevents the 6h gate from spuriously engaging on a
browse→home commit. The ghost-offset SOURCE change is a `ghostApp` pane-builder internal, not the frozen
contract (contract_shape=false is right). The change is genuinely narrow.

**5. Navbar seating — the claim is TRUE from source; residual honestly device-owed.** The plan claims a fixed
`#browse` presents the SAME runway-only document 6i proved for home. Verified: `position:fixed` removes
`#browse` from document flow, so when browse is active the document height is the `.app` css:73 runway
(`viewport + 12vh`) — IDENTICAL to the home-active state where `#browse` is `display:none` (also out of flow).
So the navbar's seating context (a runway-only document, no tall in-flow view) is the exact state 6i
device-confirmed for home; the bars are viewport-anchored and do not care which fixed view is visible. This is
strongly de-risked and the plan marks it CONFIRM-not-discover device-owed (R-navbar) rather than claiming it
clean — the correct honesty, since iOS-26 fixed-layer seating is the saga's recurring surprise. With the
`.266` pin retired, the runway is the small ~895 (not the pinned 14676), so the phantom-scroll surface is
SMALLER than the probe — a de-risk, not a new risk. No source contradiction; residual correctly device-owed.

**6/7 covered in the findings and below.** Retire-the-pin completeness (§7): the `.266` pin lives only in
`setView`'s `→home` block (SET nav.js:84, CLEAR nav.js:90, comment 68-83); retiring all three is clean and
PINGONE guards it. The Home→Books glitch is genuinely gone-by-construction (no pin to unwind). Flash C is
correctly OUT of scope and out of the device gate. The `.265` preempt is confirmed already gone. EC: the
NEW-POLICY classification + PolicyLedger entry + atomicity are present (see F2 on atomicity scope).

## Findings

### F1 — Structural (defect) — REALIZE and RESTORE overclaim what jsdom can prove; scope them to the wiring/contract and mark the real-geometry arithmetic device/manual-owed
The plan's §11 matrix says REALIZE proves "the window is computed from `#browse scrollTop` so rows for the new
position materialize" and RESTORE proves the page "restores to the saved value." Both depend on GEOMETRY jsdom
does not compute: `getBoundingClientRect()` returns zero rects and `scrollHeight`/`clientHeight` are 0 under
no-layout. So with PRODUCTION metrics the realize `top` degenerates (`browseRect.top - listRect.top = 0`) and
`applyScrollY`'s `clampY(y, scrollHeight=0, clientHeight=0)` clamps every restore to 0 — a cell asserting a
real-scroll outcome would be vacuously RED, and one that passes must inject/stub the geometry. What the cells
CAN prove (and their mutations DO redden): the LISTENER re-home (mutation "listener stays on window" → a
`#browse` scroll never reaches a bubble-phase window listener → no realize → reddens) and the WRITE surface
(mutation "applyScrollY keeps `window.scrollTo`" → `#browse.scrollTop` stays 0 → reddens), plus the windowing
CONTRACT with INJECTED `#browse`-relative metrics. The real-geometry arithmetic (the `listTop` formula
`#browse.scrollTop + listRect.top - browseRect.top`, the clamp bounds) is NOT jsdom-verifiable and is
device/manual-owed. Fix: scope REALIZE/RESTORE's coverage prose to "listener + write wiring + windowing
contract under injected metrics," mark the production real-geometry windowing/clamp device-owed (mirroring the
GHOSTSCROLL "source-branch only, on-screen device-owed" honesty the plan already applies), and add a
structural check that `browse.js` injects `#browse`-relative metrics + the `#browse.scrollTop` `scrollTo`
(browse.js:633-641) so the production wiring — which the arithmetic rests on — is gated somewhere. This does
not weaken the design; it stops the CI gate from appearing to prove B1's arithmetic when jsdom cannot.

### F2 — Structural (defect) — the atomic commit boundary must include S3 (the browse `ghostY` re-home + strip exclude), not only S1+S2
§4 and §14 declare S1 (the fixed-`#browse` recipe) + S2 (the six-consumer re-home) as one atomic commit, with
S3 (the swipe `ghostY` browse branch at swipe.js:281 + the `.alphaindex` exclude) as a later step. But S3 is
atomic-REQUIRED with S1: the moment `#browse` is `position:fixed` (window scroll ≡ 0), `ghostApp`'s browse
branch still reading `env.scrollY()` (= `window.scrollY` = 0) builds every outgoing browse ghost at the TOP —
the jump-to-top ghost that is 6i's own Loki counterexample (`PROBE-alphaindex-abort` Q3-A) — AND the clone
transform re-parents the un-excluded strip (dy = scroll). So an intermediate commit with S1+S2 but not S3
ships a visible jump-to-top-plus-misplaced-strip glitch on EVERY browse→browse and browse→overlay swipe. Fix:
extend the atomic boundary to S1+S2+S3 (the CSS recipe, the consumer re-home, AND the swipe ghost re-home +
strip exclude ship together). S4 (retire the `.266` pin) and S5 (PolicyLedger) may remain follow-ups — under a
fixed `#browse` the pin sets `min-height` to the ~runway height it already is, a benign redundant no-op, so
S4's non-atomicity does not regress. State S1+S2+S3 as the atomic unit.

### F3 — Weak (recommendation) — scope the "`window.scrollY` always 0" claim to the signed-in app views
§3/§7/§10 assert `window.scrollY` is "always 0" after both `#home` and `#browse` are fixed. This holds for the
signed-in app (home fixed, browse fixed, overlays additive/fixed), which is the swipe-reveal subsystem's
world. It is not literally always 0 — the signed-out `#signin` view is a separate in-flow pre-app state
outside the swipe flow. Non-load-bearing (sign-in is not part of any transition the plan touches), but
recommend scoping the claim to "the signed-in app views" so a future reader does not treat `window.scrollY ≡
0` as a global invariant that sign-in would violate.

## Coverage

- **F1** — has a CI surface: REALIZE and RESTORE must be re-scoped (prose + the added production
  metrics-injection structural check). Verified by re-reading §11 against jsdom's zero-geometry; the LISTENER
  and WRITE mutations already redden (kept), the geometry claim is the part to demote to device/manual-owed.
- **F2** — no runtime surface of its own: a sequencing/atomicity correction to §4/§14 (S1+S2+S3 as the atomic
  unit). Verified against `PROBE-alphaindex-abort` Q3-A (the jump-to-top under `window.scrollY=0` without the
  `ghostY` re-home).
- **F3** — no runtime surface: a claim-scoping edit; `#signin` is outside every transition the plan touches.

## Prediction — where it breaks in execution if built as written

1. **Curie builds REALIZE/RESTORE to assert real-scroll outcomes** (per the §11 prose) and hits jsdom's
   zero-geometry: RESTORE clamps to 0 and reddens on correct code, or the cells get stubbed into proving less
   than the prose claims while reading as full B1 coverage (F1). The metrics-injection arithmetic — B1's
   load-bearing part — then rides to device unverified and unflagged.
2. **The build lands S1+S2 first, S3 next** (per §14's ordering): the interim build ships a jump-to-top ghost
   + misplaced strip on every browse→browse/overlay swipe (F2) — a visible regression that a bisect would pin
   to the "half-done decouple" commit.
3. **R-navbar / R-strip / R-flash reopen on device** — honestly device-owed and gated; the design is correct
   in source, so these are confirmations, not defects. Do not call the decouple clean until all four device
   gates pass; flash C stays out.

## Handoff packet

- **Source artifact:** `Claude/Charpy/PLAN-browse-decouple-charpy.md` (this casebook).
- **Verdict / status:** TEMPER — two Structural fixes (F1 coverage honesty on REALIZE/RESTORE; F2 atomicity
  must include S3), F3 minor. The core relocation is correct and verified: the B1 realize-window arithmetic
  ports, the `.alphaindex` exclude is scoped correctly, the KIND-model change is safe under `window.scrollY ≡
  0`, and the navbar claim is true-from-source with an honestly device-owed residual.
- **Decisions confirmed against reality:** the realize math cancels to a scroll-origin-relative offset
  (virtuallist.js:206/317) and re-homes cleanly; the capture-phase document listener catches `#browse`'s
  non-bubbling scroll (mirrors scrollbar.js:95); browse.js:633-641 injects no metrics today (the re-home ADDS
  the injection); a fixed `#browse` yields the same runway-only document as a `display:none` `#browse`; the 6h
  settle gate is correctly dormant (`scroll0 ≡ 0`).
- **Open questions / who each waits on:** F1 (re-scope REALIZE/RESTORE + add the metrics-injection check) —
  Vitruvius; F2 (S1+S2+S3 atomic) — Vitruvius. R-flash/R-navbar/R-strip/R-browse2browse remain device, unchanged.
- **Next owner:** Vitruvius (temper F1/F2, land F3), then Loki (the adversary) on the tempered plan, then
  Curie (the seven cells, with F1's scoping) + Brunel (the atomic S1+S2+S3 build).
- **Required evidence / gates:** the seven CI cells green with F1's honest scoping and each mutation reddened;
  the four device gates confirmed on their repros; the `PL-swipe-browse-fixed-ownscroll` ledger entry; the
  frozen construction contract PROVEN unchanged. Flash C explicitly NOT gated here.

VERDICT: TEMPER

---

## Confirmation pass on the three tempered findings — tempered plan HEAD `05aa99d` (2026-07-28)

Scope: the three tempered findings only; the design-sound parts (virtual-list re-home arithmetic,
`.alphaindex` exclude, KIND-model, navbar) are settled and not re-opened. **All three fixes landed and are
correct. Verdict: FORGE.**

### Finding-one (coverage honesty) — CONFIRMED resolved

- **REALIZE (§11 line 246)** is rescoped to the capture-phase listener wiring + the PURE `windowFor` model
  under INJECTED scroll numbers, with the explicit disclaimer "the production real-geometry listTop arithmetic
  and clamp are device or manual owned not asserted here." The overclaim ("rows for the new position
  materialize" from real scroll) is gone; the mutation (listener stays on window → a `#browse`-dispatched
  scroll never reaches the handler) still reddens the handler-ran assertion. Well-formed, non-vacuous.
- **RESTORE (§11 line 248)** is rescoped to the write SURFACE (the recorder captures `#browse.scrollTop`,
  `applyScrollY` writes `#browse.scrollTop` not the window, the abort restore targets `#browse.scrollTop`),
  with "the correct clamped landing value is real-geometry and device or manual owned not asserted here." The
  overclaim ("restores to the saved value" — which needed the clamp/geometry) is gone; the mutation
  (`applyScrollY` keeps `window.scrollTo` → the write stays off `#browse.scrollTop`) reddens. Well-formed.
- **METRICS (new, §11 line 247)** is exactly the structural production-wiring check F1 asked for: it builds a
  books controller through the real `Browse.virtualView`, sets `#browse.scrollTop`, and asserts the INJECTED
  `metrics.scrollY` returns it and the injected `scrollTo` writes `#browse.scrollTop` — pure property access,
  jsdom-safe (no layout). The mutation ("browse.js injects no metrics → `createController` falls back to the
  window default → injected `scrollY` reads `window.scrollY`") reddens the reads-`#browse` assertion. So the
  production metrics-injection — which B1's arithmetic rests on, and which browse.js:633-641 lacks today — is
  now CI-gated. Cell count 7→8; `blocking_questions` carries all eight. The three seams (listener, write
  surface, metrics-injection) are gated at CI; the real-geometry windowing/clamp is honestly device/manual-owned,
  mirroring the GHOSTSCROLL split. The overclaim is fully retired.

### Finding-two (atomicity) — CONFIRMED resolved

§4 (line 122) now states "S1 (the fixed `#browse` recipe) + S2 (the six-consumer re-home) + S3 (the
swipe.js:281 browse `ghostY` branch → `#browse.scrollTop` AND the `.alphaindex` clone exclude) must ship in ONE
commit," and explicitly "an interim S1+S2 (without S3) is not shippable" — with the jump-to-top-plus-misplaced-
strip rationale (S1 without S3 makes every outgoing browse ghost read `window.scrollY`=0). §14 (line 289) marks
S4 (retire the `.266` pin) as a permitted follow-up ("a benign redundant no-op under a fixed `#browse`") and S5
(the ledger) as records reconciliation. The sequencing now forbids the interim S1+S2 exactly as required.

### Finding-three (invariant scope) — CONFIRMED resolved

The `window.scrollY ≡ 0` invariant is scoped to the signed-in app views (`#home`/`#browse`) at all three sites:
§3 (line 85, a dedicated F3 paragraph), the §11 Invariants row (line 236), and the PolicyLedger `decision`
(line 210). `#signin` is named as a separate in-flow pre-app state outside the swipe flow in each. No residual
asserts a global always-0.

### Not disturbed / constraint honored

The design-sound parts verified last pass are untouched. The red `--page-bg` gradient (css:41) is referenced
by the recipe, never altered — the hard user constraint holds.

## Verdict — FINAL: FORGE

The plan is sound and its coverage is now honest. The `#browse` fixed-own-scroll decouple is the correct clean
form of the device-proven `.266` fix: the virtual-list re-home arithmetic ports (verified), the six consumers
re-home to `#browse.scrollTop` with the production metrics-injection now CI-gated (METRICS), the `.alphaindex`
exclude is scoped to the transient ghost, the KIND-model change is safe under a signed-in `window.scrollY ≡ 0`,
the navbar residual is honestly device-owed, and the eight CI cells gate the wiring seams without overclaiming
any device paint. The atomic S1+S2+S3 boundary prevents a half-done regression. Build it.

Next: Loki (the adversary) on the tempered plan, then Curie (the eight cells, honestly scoped) + Brunel (the
atomic S1+S2+S3 build). The four device gates R-flash/R-navbar/R-strip/R-browse2browse remain device-owed
downstream; flash C is explicitly out; the red gradient stays untouched.

VERDICT: FORGE
