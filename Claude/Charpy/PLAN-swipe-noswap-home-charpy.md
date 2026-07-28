# Charpy review — PLAN-swipe-noswap-home (Stage 6i)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["css/app.css:73-118","js/nav.js:81-81","js/nav.js:127-127","js/app.js:1210-1219","js/app.js:1332-1358"],"callee_ranges":["js/swipe.js:270-282","js/app.js:825-916"]} -->

Reviewed: `Claude/Plans/PLAN-swipe-noswap-home.md` (Vitruvius, PLAN_READY). Ground truth read in full:
the three Linnaeus probes (`PROBE-home-carousel-layers`, `PROBE-swap-necessity`, `PROBE-home-scroll-surface`,
all 2026-07-28), plan-of-record `PLAN-swipe-reveal.md` §2.1–§2.4, `EngineeringContract.md`, and HEAD `.261`
source (`js/swipe.js` `constructionPlanFor`/`paneBuilders`, `js/app.js` hold/choreography/pull-to-refresh,
`js/nav.js` `setView`/`applyScreen`, `js/scrollbar.js`, `css/app.css:56-118,610-629`).

## Applicability

- **defining_records: true** — the plan reconciles the user recalibration, plan-of-record §2.1/§2.4
  (constraint E), Linnaeus D1–D3, the frozen `constructionPlanFor` interface + spec oracle, and the
  subsystem contract. Reconciled in `## Defining records`.
- **boundary_relocation: false** — I concur with the plan: no runtime value's ownership crosses a NEW
  module seam. The construction decision stays in `js/swipe.js`, the choreography in `js/app.js`. No
  ledger required by this pattern.
- **callee_replacement: true** — the plan replaces two callees (`snapshotHome`, swipe.js:270-282; the
  `→home` branch of `holdGhostUntilPaintable`, app.js:825-916) with the real fixed `#home` slide. Their
  observable channels are traced in `## Callee behaviour`.
- **contract_shape: true** — `constructionPlanFor`'s emitted enum domain for `→home` changes
  (`home-snapshot` leaves `incoming`; `home-host` enters `renderDestination`; `browse→home` outgoing
  `real-source`→`app-ghost`). The exact-key/enum gate is `test/contract-function-gate.test.js`; the
  independent oracle is `test/fixtures/swipe-plan-spec.mjs` rows 56/59.
- **project_adapter: tomeroam-js-dom.**
  - `snapshotHome` (callee swipe.js:270-282) observable classList tokens: `.classList.remove('hidden','parked')`
    on the clone (swipe.js:272) — RETIRED (no clone built; the real `#home` un-parked via `home-host` is the
    incoming mover). `copyScroll` carousel `scrollLeft` (swipe.js:279) — RETIRED (real `#home` keeps its own).
  - `holdGhostUntilPaintable` (callee app.js:825-916) has NO `document.body.classList` mutation in range;
    its observable channels are `img.decode()` on src-bearing covers (827/888), the double-`rAF` paint gate
    (899-901), the 600ms safety timer (902), and — for `→home` ONLY — the `scrollend` listener + `SETTLE_MS`
    timer (908-915). The `→home` scroll-settle channel is deleted; the `abort→browse` decode+paint channel is
    preserved (verified below).
  - body-class mutation in the seating range: `document.body.classList.toggle('home-tall', …)` (nav.js:81) —
    RETIRED under A1 / KEPT as a bare spacer under A2 (see F1/F2).
  - `d.<field>` session writes in the pull-to-refresh range (app.js:1332-1358): none; the L1 re-home moves
    the at-top signal from ambient `window.scrollY` (app.js:1340,1347) to `#home.scrollTop`, not a session field.

## Verdict

**TEMPER.** The central mechanism is sound and buildable: making active `#home` a `position:fixed`
own-scroll view genuinely removes the tall-`#browse`→short-`#home` document-collapse reposition of the
carousels (mechanism i), and the delete-list (`snapshotHome`, the `→home` scroll-settle gate) is correctly
scoped — I verified `opts.scrollSettle` is set at exactly one site (app.js:1218, commit→home) and
`snapshotHome`'s only live consumer is the `home-snapshot` incoming branch (swipe.js:331), so both deletions
are `→home`-only and `abort→browse` is left intact. No fatal crack: the flash claim is honestly device-gated
and the architecture has independent, user-sanctioned value.

But three load-bearing weaknesses must be fixed before the build, all in the navbar-seating rework and the
flash-elimination framing:

1. **F1** — retiring `css:73` (the base `.app` min-height) is a silent regression on short BROWSE pages, a
   path the plan declares untouched. `css:73` is the generalized runway, not a home-scoped rule.
2. **F2** — A1's "viewport-anchored seating" inverts the recorded device truth (iOS-26 seats the fixed bar
   ONLY on a tall document); framed as "preferred/expected stable," it is the configuration the record says
   fails, and with `css:73` retained (required by F1) A1 collapses into A2 anyway.
3. **F3** — the flash cause is one of TWO unconfirmed hypotheses; the design eliminates only one, the other
   (the parked→`translateX(0)` transform-clear on `#home`'s own layer) survives the design and IS R1(a).
   §3's "eliminates the flash / the underived re-raster trigger" overstates the probes and contradicts R1(a).

F4–F8 are tightenings. None is fatal; all are fixable by Vitruvius without redesign.

## Defining records

**AGREE on the mechanism and the delete-scope; GAP on the seating rework's true blast radius; the
flash-elimination framing over-reads the DERIVED records.**

- **User recalibration (2026-07-28)** — sanctions retiring the navbar hack; hard requirement = the fixed bar
  stays stable; escalate only for unbounded churn. AGREES with a bounded seating rework. The plan honors the
  hard requirement ONLY via A2 (F2); A1 as written risks violating it (F1/F2).
- **Correction 1 (home height is DYNAMIC)** — `#dlSection` conditional Downloads carousel (index.html:55-58);
  content can exceed the viewport. The plan treats active `#home` as a real `overflow-y:auto` scroller sized
  to dynamic content (§3/§6). AGREE — no place in the plan assumes viewport-sized/short home. Confirmed.
- **Plan-of-record §2.1/§2.4 + constraint E** — two in-flow views sharing the document scroll cannot coexist,
  which FORCES the snapshot. The design dissolves E by making `#home` fixed-own-scroll (not in-flow). AGREE
  the dissolution is coherent; it is NEW POLICY overturning §2.1 for `#home` (R3, ledgered). Correctly classified.
- **`constructionPlanFor` (swipe.js:140-146) + spec rows 56/59** — verified against source. The plan's enum
  changes are accurate in §4. The headline's "ONE decision edited" undercounts §4's three value changes (F4).
- **CSS seating record (css:56-81) — the GAP.** css:63-73 states plainly that the base `.app { min-height:
  calc(100%+12vh) }` (css:73) is the GENERALIZED runway covering "the OTHER short in-flow views too (a 1-book
  author, an empty/short list)"; `body.home-tall .app` (css:81) is redundant with it and is the sole
  home-scoped part. The plan's §8/§12 treat "css:73/81" as one home-path unit and retire both under A1. This
  is a material GAP: css:73 governs short browse pages the plan claims are untouched (F1).
- **CSS seating record (css:63-66) — the CONFLICT with A1.** "iOS 26 only seats a `position:fixed; bottom:0`
  bar correctly when the document is genuinely scrollable — a viewport-sized document displaces the fixed nav
  bar ~5-10px UP (the black-band saga)." A1's viewport-anchored-without-a-runway seating is the displacing
  configuration on record. The plan frames A1 as preferred/expected-stable, inverting the record (F2).

Authority precedence (EC §2): the recalibration + plan-of-record govern shape; the verified css:56-81
seating record governs the seating-mechanism claims and is where A1/A2 must be reconciled; the frozen
interface governs the construction edit; Linnaeus D2 governs re-homing completeness (confirmed complete via
independent grep for `home-tall`/`scrollSettle`).

## Callee behaviour (callee_replacement)

- **`snapshotHome` (swipe.js:270-282)** — builds a detached `#home` clone in a fixed `ghostWrap`, strips id,
  removes `hidden`/`parked` on the clone (272), `freezeArt` (273), mounts in `.app`/`#library` shell, then
  `copyScroll` copies each carousel `scrollLeft` (279) and `copyAnimPhase` seeks clone animations (280).
  REPLACED by the real fixed `#home` un-parked via `home-host`. Every observable effect is re-assigned in the
  plan's §5 effects block; I concur the re-assignment is complete: the clone's class-strip → real `#home`'s
  `.parked` removal at drag start; `copyScroll` → real `#home` keeps its own element-local `scrollLeft`
  (parity with nav.js:123-126 no-restore). The `copyAnimPhase` cover-animation sync (280) is DROPPED — a real
  un-parked `#home` never restarted its animations, so there is no phase to re-sync; the plan's §5 does not
  explicitly name `copyAnimPhase` among the retired effects (minor — folded into "no clone is built").
- **`holdGhostUntilPaintable` `→home` branch (app.js:825-916)** — the `→home` invocation (app.js:1218) passes
  `scrollSettle`, arming the `scrollend` listener (910) + `SETTLE_MS` timer (912) + the `settled` third gate
  (833/887). DELETED for `→home` (no hold over home; the outgoing ghost drops off-screen). Verified the
  `abort→browse` invocation (app.js:1235) passes NO opts, so `settled = !opts.scrollSettle` is already `true`
  there and the gate already reduces to `decoded && painted` — deleting the `scrollSettle` plumbing leaves
  `abort→browse` byte-equivalent, exactly as the plan's SCOPE cell asserts. The delete-scope claim SURVIVES.

## Findings

### F1 — Structural (defect) — Retiring `css:73` (base `.app` min-height) regresses short BROWSE-page bar seating — a path the plan declares untouched

The plan's §8 "Sizing (honest)" and §12 SUBTRACTIVE list "the `.app`/`home-tall` runway min-height (css:73/81)"
as a single home-path unit, retired under A1. But css:73 is NOT home-scoped. The CSS comment directly above
it (css:63-68) states its purpose: *"Every base view carries a real scroll runway (12vh past the viewport)…
Home already proved this fix works via `body.home-tall`; generalizing it to `.app` covers the OTHER short
in-flow views too (a 1-book author, an empty/short list)."* And `body.home-tall .app` (css:81) carries the
identical `calc(100%+12vh)` value, so on the home view it is redundant with the base rule; `home-tall`
(nav.js:81) is set only when `#home` is un-parked, i.e. never during Browse.

Consequence: short browse pages (a 1-book author, the files view of a short book, an empty/short list) rely
SOLELY on css:73 for their document height. Retiring css:73 removes that runway and reintroduces the exact
iOS-26 fixed-bar displacement css:73 was generalized to prevent — on Browse, which the plan lists under STAYS
("`#browse`'s in-flow document-scroll model — untouched") and PRESERVED, and which R1(b) does not device-gate
(R1(b) observes "a fixed own-scroll `#home`", the home view only). A builder following the sizing list
literally ships a silent regression on short browse pages.

Fix (the invariant, not a prescription): the home-scoped retirement is `css:81` + the `home-tall` toggle
(nav.js:81) + the home-entry `scrollTo(0,1)` (nav.js:127) ONLY. `css:73` must be RETAINED for the other short
in-flow views — or, if the plan intends to touch it, short-browse-page bar seating must become an explicit
device gate. State which.

### F2 — Structural (defect) — A1 ("viewport-anchored seating") inverts the recorded device truth; with `css:73` retained it collapses into A2

§8 A1 is framed as *"PREFERRED, cleaner… the modern, newer-code-compatible mechanism… Why it should be
stable: … removing the document-height dependency and anchoring to the viewport removes the exact input
… the 30-round churn fought."* The recorded device truth runs the opposite way. css:63-66: *"iOS 26 only
seats a `position:fixed; bottom:0` bar correctly when the document is genuinely scrollable — a viewport-sized
document displaces the fixed nav bar ~5-10px UP (the black-band saga)."* The .30/.28 sagas' CONCLUSION was
that document height is the FIX, not "the input the churn fought." A1 proposes seating the bars WITHOUT a tall
document — the precise configuration the record says displaces them. Calling it "preferred/expected stable"
is a calibration inversion (D4: the claim runs opposite to its own cited evidence).

Compounding: A1's mechanism is unspecified — "(dynamic-viewport sizing / an explicit viewport-anchored
shell)" is a parenthetical, not a named mechanism, against a record that says the class of approach fails.
And the collapse: F1 requires css:73 to be RETAINED. With css:73 retained, the home view's document stays
tall via css:73 even with `#home` fixed (the `.app` min-height floor is independent of `#home`'s flow
participation) — which is exactly A2's mechanism ("`.app` retains its tall min-height so the document stays
scrollable and the bars seat by today's exact mechanism"). So A1 differs from A2 ONLY by additionally
retiring css:73, which F1 forbids. A1 as a distinct "preferred" option does not survive.

Fix: make A2 (retain the css:73 runway; `#home` fixed own-scroll on top) the expected, primary seating path —
it satisfies the user's one hard requirement by today's verified-stable mechanism. If A1 (a genuinely
document-height-independent bar anchoring) is still to be attempted, re-frame it as speculative and
contra-record, name its actual mechanism, and gate it on R1(b) as the exception, not the default.

### F3 — Structural (defect) — The flash-elimination claim over-reads the DERIVED probes and contradicts R1(a); the surviving mechanism (transform-clear) is not made first-class
(claim calibration + internal inconsistency)

The plan headlines "make active `#home` fixed … so the reflow-driven raster-from-empty (the camera-confirmed
flash) is ELIMINATED, not masked", and §3 says the carousels "do not reposition on the collapse (the
reposition Linnaeus home-carousel §5 identifies as the underived re-raster trigger)." This over-reads the
records on two counts:

1. The probes carry TWO competing, both-[UD] hypotheses for the flash, neither confirmed: (i) the
   document-collapse repositions the carousel boxes and their layers re-raster (`PROBE-home-carousel` §5,
   marked [UD]); (ii) un-parking = clearing `#home`'s `translateX(-101vw)` on its `will-change:transform`
   layer forces the descendant carousel scroll-layers to re-raster from empty (`PROBE-swap-necessity` §5/§6
   item 1, marked [UD]). `PROBE-home-carousel` §5 does NOT "identify the reposition as the trigger" — it
   marks it [UD] and names the same competing hypothesis. §3's phrasing promotes one [UD] hypothesis to "the
   trigger."
2. The design eliminates only mechanism (i). Mechanism (ii) SURVIVES: the incoming mover is the real `#home`
   slid from its parked `translateX(-101vw)` (via un-park + an inline mover transform) to `translateX(0)` —
   the same transform-clear on the same `will-change` layer whose descendants are the carousels. This is
   exactly what R1(a) asks ("does clearing parked `translateX(-101vw)→translateX(0)` still one-frame-blank
   the carousels, even fixed and un-occluded?"). So the plan simultaneously asserts "eliminated" (§3/headline)
   and "may still one-frame-blank" (R1(a)) — an internal inconsistency (D5): a flash-fix plan cannot both
   headline elimination and hold the elimination hostage to an untested device bet on the same page without
   saying so plainly.

Fix: state that the flash cause is one of two [UD] hypotheses; the design provably removes only the
reflow-reposition (i); mechanism (ii) survives the design and IS R1(a); and R1(a)'s own "slide via an
ancestor/wrapper so `#home`'s own layer is not transform-mutated" fallback is the mechanism-(ii) mitigation,
in-scope and buildable if R1(a) reddens. This keeps the device bet honest without weakening the (real)
architecture value. It does not require redesign — only recalibrated prose and an explicit "flash NOT claimed
fixed until R1(a)" already present in §11 (lift that qualification into the headline).

### F4 — Weak (recommendation) — "ONE construction-decision edit" undercounts §4's three enum-value changes

The title, §1, and §12 assert "the ONE decision edited" / "one construction-decision edit." §4 correctly
enumerates THREE value changes on the `→home` rows: `browse→home` incoming `home-snapshot`→`real-destination`
AND outgoing `real-source`→`app-ghost`; `renderDestination` `none`→`home-host`; `overlay→home` incoming
`home-snapshot`→`real-destination`. The outgoing `real-source`→`app-ghost` flip is a genuinely separate
decision with its own choreography (§3 builds the outgoing app-ghost of `#browse`) and its own mutation need
(F8). Recommend aligning the headline count with §4 so the builder scopes the full edit; the object-shape-vs-
value-domain framing in §4 is accurate and should be the canonical statement.

### F5 — Weak (defect) — The machine-readable `source_ranges` under-declare the actual edit surface

The plan's `vitruvius-gate` `source_ranges` = `["js/app.js:1332-1358","js/nav.js:81-81","css/app.css:103-118"]`.
The plan's own prose edits sites OUTSIDE these ranges: `css/app.css:73` and `:81` (the `.app`/`home-tall`
runway retired/kept, §8/§12), `js/nav.js:127` (the home-entry `scrollTo(0,1)` retired → `#home.scrollTop=0`,
§5/§9), and `js/app.js:1210-1219` + `:775` (the commit→home choreography branch replaced, §3/§5/§12). Since
`boundary_relocation` is false the ledger is not required, but the declared ranges feed the adapter's
completeness checks and a reviewer's boundary map; an undeclared edit site escapes both. Add the missing
ranges (css:73/81, nav.js:127, app.js:1210-1219,775).

### F6 — Weak (open-unknown) — The seating blast radius omits the additive-overlay-over-home base case from R1(b)
Open question the plan owes: **whether** NP-over-home and Options-over-home seating stays stable under the
fixed-`#home` model — the plan must **decide** to extend R1(b)'s device observation to those cases.

Today `home-tall`/document-height also seats the NP pill and navbar when an additive overlay (NP, Options,
settings subs) paints OVER an un-parked `#home` — nav.js:80 comment: *"This also keeps the NP pill seated
when NP is over home."* Under the fixed-`#home` model with the runway reworked, that overlay-over-home base
case is subject to the same iOS-26 displacement question, but R1(b) as written observes only "a fixed
own-scroll `#home`" (bare home view). Decision the plan must record: R1(b)'s device observation includes
NP-over-home and Options-over-home seating, across scroll + rotation, not the bare home view alone.

### F7 — Weak (defect) — §3 Abort mis-cites the restoration path for `browse→home` abort

§3 "Abort (`browse→home`)" says restore `#browse` "via the existing `abort→browse` reveal." That reveal
(app.js:1228-1236, the held re-render) is guarded by `finalizationPlanFor.abortRender === 'rerender'`, which
is TRUE only for `browse→browse` (swipe.js:174). A `browse→home` abort has `abortRender = 'none'` and takes
the no-hold finalize path (app.js:1238-1257): `dropPanes()` + `applyScreen(dest=browse, render:false,
resetScroll:false)` + `window.scrollTo(0, cur.scroll0)`. The mechanism restores `#browse` correctly (its page
node persists; no destination was rendered into it since `renderDestination` is `home-host`, not
`browse-host`), so `abortRender:'none'` is the right decision — but the citation names the wrong path and
would send the builder to the rerender-hold branch. Correct the reference; keep `abortRender:'none'`.

### F8 — Note (defect) — Mutation coverage for the new `browse→home` OUTGOING value and for `overlay→home` is thin
(coverage)

SNAPSHOTGONE's named mutation targets only the INCOMING value (re-introduce `home-snapshot`). The
`browse→home` OUTGOING flip (`real-source`→`app-ghost`) is asserted only implicitly ("outgoing browse ghost
dropped off-screen"). EC §4.10 requires a mutation testing the specific new decision: add a mutation that
keeps `browse→home` outgoing at `real-source` (so no app-ghost is built and the outgoing-ghost assertion
reddens). Separately, no integration cell drives `overlay→home`; its construction values are covered by spec
row 59 + the descriptor-coverage gate, which is acceptable — state it explicitly so the coverage claim is not
read as integration-level for `overlay→home`.

## Coverage (blocking + defect/open-unknown findings → resolution)

- **F1** — Vitruvius revises §8/§12 so that `css:73` is retained (or short-browse seating is added as an
  explicit device gate); the home-scoped retirement is limited to `css:81` + `home-tall` toggle + the
  home-entry `scrollTo`. Verified by re-read that no STAYS/PRESERVED item (`#browse` in-flow model) is
  contradicted by the sizing list.
- **F2** — Vitruvius re-frames A2 as the primary/expected seating path (satisfies the hard requirement by the
  verified-stable mechanism); A1, if retained, is re-framed as speculative/contra-record with a named
  mechanism and R1(b) as its gate. Verified by reconciling §8's A1/A2 framing against css:63-66.
- **F3** — Vitruvius recalibrates the headline/§3 to state the two-hypothesis [UD] situation, that only
  mechanism (i) is eliminated, that mechanism (ii) survives and is R1(a), and that R1(a)'s wrapper-slide
  fallback is the in-scope mitigation. Verified by checking the headline no longer asserts unconditional
  elimination and R1(a) is not contradicted elsewhere.

- **F5** — no runtime surface: a declaration-hygiene fix (add the missing `source_ranges`). Owes no test;
  verified by re-reading the declaration against the plan's prose edit sites.
- **F6** — no CI surface (device open-unknown): closed by extending R1(b)'s on-device observation to
  NP-over-home and Options-over-home seating; no jsdom cell can settle it.
- **F7** — no runtime surface: a citation correction in the plan prose (`browse→home` abort takes the no-hold
  path, `abortRender:'none'`); the mechanism is already covered by the ABORT cell.

F4 and F8 are tightenings landing in the same revision; F4 is a headline-count alignment (no test), F8 adds
the `browse→home` outgoing mutation to the SNAPSHOTGONE cell.

- **F9** (re-verify residual) — no runtime surface: a within-document scrub of five stale pre-temper spots
  (§2 line 68, §2 line 78, §7 line 158, §13 lines 266-267) so no section still asserts A1-preferred /
  runway-retired / abort-via-hold. Verified by re-reading each spot against the corrected §8/§12/§3.
- **F10** (L5 repair) — has a runtime surface, jsdom-vacuous at the gate: the outgoing-ghost home-scroll
  fidelity fix. Closed only when the ghost clone's home is an ACTUAL scroll container (or the offset is applied
  to the home content), so `#home.scrollTop` reproduction is not a no-op after `ghostApp` strips ids; plus a
  DEVICE-owed fidelity check (the zero-jump is a paint the jsdom GHOSTSCROLL cell cannot observe). See F10.

## Prediction — where it breaks in execution if built as written

1. **The builder follows the §12 sizing list and retires `css:73`.** Home seating is device-checked under
   R1(b) and (if the fixed model holds) passes on the home view. Short BROWSE pages — a 1-book author, a short
   files view — are never on the R1(b) checklist, so the bar-displacement regression ships and surfaces later
   as an intermittent "the nav bar jumps on some authors" report, hard to bisect because the home view looks
   fine (F1). This is the most likely and most expensive miss.
2. **A1 is built as "preferred," device-tested, displaces the bar (per css:63-66), and falls back to A2** —
   a wasted build+device cycle that the plan's own recorded evidence already predicts (F2). Not silent, but
   avoidable by making A2 primary now.
3. **R1(a) reddens** (the flash is mechanism (ii), the transform-clear). The plan's §3 "eliminated" framing
   makes this read as a plan failure rather than the disclosed device bet it is; the wrapper-slide fallback is
   present but buried in R1(a)'s fallback list rather than named as the mechanism-(ii) remedy (F3). The build
   is recoverable via that fallback, but only if F3's recalibration made it first-class.

## Handoff packet

- **Source artifact:** `Claude/Charpy/PLAN-swipe-noswap-home-charpy.md` (this casebook).
- **Verdict / status:** TEMPER — three Structural findings (F1, F2, F3) blocking; F4–F8 tightenings. The core
  mechanism (fixed own-scroll `#home` slide-and-leave), the delete-scope, and the constraint-E dissolution are
  sound and verified against source; the defects are confined to the navbar-seating rework and the
  flash-elimination framing.
- **Decisions confirmed against reality:** `opts.scrollSettle` is set at exactly one site (app.js:1218) →
  the settle-gate deletion is `→home`-only and `abort→browse` is byte-equivalent; `snapshotHome`'s only live
  consumer is the `home-snapshot` incoming branch (swipe.js:331) → deletable with the value flip; Linnaeus D2's
  four-consumer enumeration is complete (independent grep for `home-tall`/`scrollSettle` matched); `css:73` is
  the generalized (all-short-in-flow-views) runway, not a home-scoped rule (css:63-68).
- **Open questions / who each waits on:** F1 (retain vs device-gate css:73) — Vitruvius must choose; F2 (drop
  A1 or re-frame as speculative) — Vitruvius; F3 (recalibrate the elimination framing) — Vitruvius. R1(a/b/c)
  remain device, downstream of the build, unchanged by this review.
- **Next owner:** Vitruvius (temper the plan per F1–F3, land F4–F8), then re-submit or proceed to Brunel; Curie
  builds the suite from §10 with F8's mutation added.
- **Required evidence / gates:** the five CI mechanism cells green with F8's added `browse→home` outgoing
  mutation; the flash NOT called fixed without R1(a)+R1(b)+R1(c) on device; the §2.1 overturn entered in
  `Claude/Decisions/PolicyLedger.mjs` (policy-ledger-gate) with a stable ID + enforcing test.
- **Records updated:** this casebook filed; board/decision-log update routed to Zelda on the dispatcher's side.

---

## Re-verify pass — tempered plan HEAD `2809df5` (2026-07-28)

Vitruvius tempered the plan against F1–F8. I re-verified each resolution against the tempered plan AND
against HEAD `.261` source (I did not re-open any HELD axis; the temper touched only the seating rework, the
flash framing, coverage, and records). **The SUBSTANCE of all eight findings landed** in the authoritative
spec sections. **One residual blocks FORGE: an incomplete within-document scrub (F9) — the same D5
sweep-the-class failure my original review named** — leaving pre-temper text that contradicts the corrected
sections. Verdict of the re-verify: **TEMPER (single mechanical residual, F9).** No design change is owed; a
five-spot scrub then FORGE.

### Per-finding re-verify result

- **F1 — CONFIRMED.** `css:73` (base `.app` min-height) is retained everywhere load-bearing: §1 record row
  (line 49), §8 ("css:73 STAYS"), §9 L3 (now cites css:81 only), §12 ("css:73 … is NOT retired (F1)"), and
  the machine-readable `source_ranges` (css/app.css:81-81 + 103-118, css:73 correctly excluded). Home-scoped
  retirement is limited to css:81 + `home-tall` toggle (nav.js:81) + home-entry `scrollTo` (nav.js:127).
- **F2 — CONFIRMED IN SUBSTANCE; residual in the recap (see F9).** §8 drops the former "viewport-anchored, no
  tall document" A1 as contra-record and makes A2 (retain the css:73 tall-document runway; `#home` fixed
  own-scroll inside it) the PRIMARY seating; §1 row and §13-sequencing agree. BUT the coordinator's explicit
  acceptance test ("no residual text treats A1 as preferred") is literally failed at §13 line 266 ("A1
  preferred, A2 stable-by-construction fallback") and line 267 ("the runway is retired (A1)"), plus §2 lines
  68/78. Folded into F9.
- **F3 — CONFIRMED.** Two competing [UD] hypotheses stated in the title, the status headline (line 14), and §3
  (lines 84-88); the design "provably removes only (i)"; hypothesis (ii) (the parked→`translateX(0)`
  transform-clear) survives and IS R1(a) (line 220), with the wrapper-slide as the named in-scope mitigation;
  "flash is NOT claimed fixed until R1(a) device-clean." No unqualified "eliminates the flash" survives in an
  authoritative section (§13 line 266 scopes it to "eliminates the reflow", swept under F9 anyway).
- **F4 — CONFIRMED.** Three `→home` enum-value changes counted in §1 row 53, the §4 `vitruvius-contract`
  block, and §13 step 1.
- **F5 — CONFIRMED.** `source_ranges` extended with css/app.css:81, js/nav.js:127, js/app.js:1210-1219,
  js/app.js:775 (and css:73 correctly NOT added).
- **F6 — CONFIRMED.** §11 R1(b) (line 221) extends the device observation to NP-over-home and
  Options-over-home seating (nav.js:80), across scroll + rotation.
- **F7 — CONFIRMED IN §3; residual sibling in §7 (see F9).** §3 Abort (line 98) is corrected to the no-hold
  path (app.js:1238-1257, `abortRender:'none'`, explicitly NOT the rerender-hold branch). But §7 line 158
  still reads "restores `#browse` via the existing `abort→browse` reveal" — the exact phrasing F7 flagged,
  un-swept — and §11 R4 (line 225) still says "reuse the `abort→browse` hold." Folded into F9.
- **F8 — CONFIRMED.** SNAPSHOTGONE (§10 row 211) now carries BOTH mutations (re-introduce `home-snapshot`
  incoming; keep `browse→home` outgoing `real-source` → no app-ghost built) and asserts the outgoing is an
  owned-pane app-ghost; §13 line 263 states `overlay→home` is spec-level-only covered (row 59 +
  descriptor-coverage gate).
- **PolicyLedger — CONFIRMED.** §12 (lines 243-257) specifies `PL-swipe-6i-home-fixed-ownscroll` with all
  §1.C fields, `knownRed:false`, and the §2.1/§2.4 prose amendment; `staged_records` includes
  `Claude/Decisions/PolicyLedger.mjs`. The `tests` names are placeholders Curie fills (they must exist for
  `test/policy-ledger-gate.test.js` — correctly flagged as a build obligation).

### F9 — Structural (defect) — Incomplete within-document scrub: pre-temper A1-preferred / runway-retired / abort-via-hold text survives, contradicting the corrected sections

The F1/F2/F7 corrections landed in the authoritative sections (§8, §12, §3, §1, source_ranges) but were not
swept through the secondary and recap surfaces (StandardsDocument §7 within-document scrub; Charpy D5
sweep-the-class). Five stale spots now contradict the corrected plan:

1. **§2 MOVES (line 68):** "The navbar-seating basis — from the document-height runway to a viewport-anchored
   seating, with the A2 fallback (§8)." — Contradicts §8: A2 RETAINS the document-height runway (it is not
   "viewport-anchored") and is PRIMARY, not a fallback. Restate as: seating stays on the retained css:73
   tall-document runway; only the redundant home-scoped css:81/`home-tall`/`scrollTo` are retired.
2. **§2 DEFERRED (line 78):** "the A1 seating cleanup can ship in the same slice or a follow-on (§8)." — A1 is
   dropped (§8). Remove or restate.
3. **§7 (line 158):** "An ABORT of `browse→home` … restores `#browse` via the existing `abort→browse` reveal"
   — the exact phrasing F7 corrected in §3; sweep it to the no-hold `abortRender:'none'` path. (§11 R4 line
   225 "reuse the `abort→browse` hold" is the same sibling — align it.)
4. **§13 handoff (line 266):** "the sanctioned navbar-seating rework is BOUNDED (A1 preferred, A2
   stable-by-construction fallback)" — literally treats A1 as preferred (the F2 acceptance test). Restate to
   A2-primary, A1-dropped.
5. **§13 handoff "Decisions made" (line 267):** "the runway is retired (A1) with a bounded fallback (A2)" —
   a RECORDS surface stating the OPPOSITE of the actual decision (the runway/css:73 is RETAINED; A2 is
   primary). Correct it: `#home` becomes fixed own-scroll INSIDE the retained css:73 runway; only the
   home-scoped redundant seating parts are retired.

Not fatal and not a design change: the build surface (§8/§12/§13-sequencing and the `source_ranges`, which
correctly exclude css:73) is unambiguous, so a builder reading the spec builds correctly. But an internal
contradiction in the plan's own "Decisions made" field and a literal "A1 preferred" in the handoff must be
resolved per StandardsDocument §7 (a contradiction is resolved, never both-kept), and the coordinator set
"no residual text treats A1 as preferred" as an explicit F2 acceptance criterion. Sweep the five spots; then
FORGE.

**Re-verify verdict: TEMPER — F9 only.** All other findings CONFIRMED resolved. On the F9 scrub landing (a
five-spot edit, no design or spec change), this plan is FORGE-ready.

---

## F9-confirmation pass — tempered plan HEAD `e1c78ad` (2026-07-28)

Vitruvius swept F9 (the five flagged spots plus three siblings it found in the full pass: the index/§8 title,
the §3 "one line" viewport-anchored term, and the §1 verdict "(A2 fallback)"). I verified by GREPPING the
plan for the three stale-claim classes — not by re-reading the old line numbers (they shifted) — and reading
the full context of every hit:

- **(a) A1 / viewport-anchored seating treated as preferred — NONE survive.** `A1 preferred`, `preferred, A2`,
  `A2 stable-by-construction fallback`, `to a viewport-anchored seating` return zero hits. Every A1 mention now
  reads "DROPPED as contra-record" / "not re-framed as 'preferred'" (§8 title, §8 body line 166, §2 MOVES line
  68, §2 DEFERRED line 78 "No A1 seating cleanup is deferred", §1 verdict, §13 status line 266 "A2 is
  PRIMARY").
- **(b) runway / css:73 said to be retired — NONE survive.** `runway is retired (A1)`, `retired (A1)` return
  zero. Every css:73 reference reads "RETAINED" as the primary seating (§1 row 49, §8 F1 line 168, §9 L3 line
  181, §12, §13 sequencing line 261, §13 "Decisions made" line 267). The only "retired" text is the
  home-scoped css:81 + `home-tall` toggle + home-entry `scrollTo`, and the SNAPSHOT-iff-home *rule* — both
  correct.
- **(c) browse→home abort via a HOLD path — NONE survive.** The two F7 siblings are corrected: §7 line 158 and
  §11 R4 line 225 both now read "the NO-HOLD `abortRender:'none'` finalize path (app.js:1238-1257) … NOT a hold
  branch (F7)." The one remaining "abort→browse hold" (§10 Composition, line 204) is the legitimately
  PRESERVED browse→browse abort hold, not a browse→home claim — correct.
- **Bonus (F3 residual class):** `eliminates the flash` returns zero; the flash is everywhere scoped to
  "provably removes hypothesis (i) … not called fixed until R1(a) is device-clean."

No design, spec, or build-surface change accompanied the scrub (I confirmed the `source_ranges` still exclude
css:73 and the §8/§12 seating spec is unchanged in substance). **F9 is RESOLVED.** All of F1–F8 and the
PolicyLedger were CONFIRMED on the prior pass and are not re-opened.

## Verdict — FINAL: FORGE

The plan is sound and internally consistent: the fixed own-scroll `#home` slide-and-leave mechanism, the
`→home` construction edit (three enum values, validated by the frozen spec), the delete-scope (verified
`→home`-only), the constraint-E dissolution (ledgered as `PL-swipe-6i-home-fixed-ownscroll`), the A2 seating
(retain the recorded css:73 tall-document runway; `#home` fixed inside it), and the honest device-gating of
the surviving flash hypothesis (R1(a)) all hold. Build it. The three device gates R1(a) carousel-blank, R1(b)
bar stability (incl. NP/Options-over-home), R1(c) nested-scroll remain device-owed downstream, exactly as
the plan states.

Next: Curie builds the suite from §10 (SNAPSHOTGONE/SCOPE/ABORT/PTR/SCROLLBAR + the PolicyLedger test names
filled so `test/policy-ledger-gate.test.js` passes); Brunel builds from the approved plan.

*(FORGE above was for HEAD `e1c78ad`. A Loki KILL then found a seam-laundered home-scroll consumer; Vitruvius
repaired it (HEAD `e727840`). The repair re-verify below SUPERSEDES the FORGE.)*

---

## L5 repair re-verify — tempered plan HEAD `e727840` (2026-07-28)

Scope: the Loki-KILL repair only (the outgoing-ghost home-scroll consumer + the §9 seam-aware re-sweep + the
§10 GHOSTSCROLL cell + the §1/§2/§12 notes). F1–F9 + PolicyLedger were confirmed on the FORGE pass and are
re-checked only for disturbance. **Verdict of this pass: TEMPER — one Structural finding (F10) on the repair
mechanism.** The seam-completeness (the thing that failed twice) is CLEAN; the fix's INVARIANT is right; but
the prescribed MECHANISM does not close Loki's device counterexample as written, and its CI gate cannot see
that it fails.

### Independent seam-completeness — no seventh consumer (CONFIRMED CLEAN)

I grepped the full scroll-source seam myself (`scrollY` / `scrollTop` / `pageYOffset` / `scrollingElement` /
`scrollTo` / `scrollend` / `env.scrollY` across `js/`), did not trust the count, and classified every hit:

- **Home-vertical-scroll consumers (the sweep's set):** L1 pull-to-refresh (app.js:1340,1347), L2 scrollbar
  (scrollbar.js:51-52), L3 navbar-seat (nav.js:81,127; css:81), L4 reveal machinery (app.js:466,443,1231,
  1256,1173; app.js:909-911 scrollend), L5 outgoing-ghost offset (swipe.js:257 ← app.js:509 `env.scrollY`),
  N1 abort `scroll0` restore (app.js:466→443/1231/1256), C1 carousel `scrollLeft` (horizontal, survives). All
  seven accounted for.
- **The injected-seam class (what the KILL exposed) has exactly ONE member:** `env.scrollY` (app.js:509) →
  `ghostApp` (swipe.js:257). It feeds no other home path (`snapshotHome` reads no scroll and is deleted; the
  NP-pill clone reads none). The other injected metrics seam, `virtuallist.metrics.scrollY` (virtuallist.js:
  164), is inside the BROWSE virtual controller (browse.js:640) and `onDocScroll` early-returns unless Browse
  is visible (virtuallist.js:145) — no-op on home. **No seventh home-vertical-scroll consumer exists.** The
  §9 sweep is complete on the seam.

### L5 closes Loki's counterexample? — NOT AS WRITTEN (F10)

The INVARIANT in §9 L5 is correct (the outgoing ghost of a scrolled home must reproduce home's own vertical
offset → zero jump). The GHOSTSCROLL mutation (revert to `window.scrollY` for a home source) does redden the
BRANCH-level assertion. But the prescribed mechanism does not close the DEVICE counterexample — see F10.

### F10 — Structural (defect) — the prescribed L5 mechanism is a device no-op after `ghostApp` strips ids, and its CI gate is jsdom-vacuous for the device jump

Two coupled defects on the repaired path:

1. **The clone's home is not a scroll container, so `clone-home.scrollTop = 500` does not offset it on device.**
   §9 L5 prescribes reproducing home's offset by "setting the CLONE's home element's `scrollTop` (a vertical
   analog of `copyScroll`)." But `copyScroll` works for carousels precisely because `.carousel`'s
   `overflow-x:auto` is **class-keyed** (css:327) and survives the clone. Home's own-scroll geometry is
   **id-keyed**: §3 (line 82) and §6 (line 148) put `position:fixed; overflow-y:auto` on the base `#home` rule,
   and `ghostApp` strips ALL ids on the clone (`clone.querySelectorAll('[id]').forEach(n =>
   n.removeAttribute('id'))`, swipe.js:252). So the cloned home loses `overflow-y:auto` → it is not a scroll
   container → setting its `scrollTop` is inert → the ghost renders home at TOP while the real home is at 500 →
   the exact jump Loki killed SURVIVES. The vertical analog of `copyScroll` breaks at the one property that
   makes `copyScroll` valid. Fix (invariant + precondition): either give the active home fixed-own-scroll
   geometry a **class** the clone retains (so `overflow-y` survives the id-strip and `scrollTop` takes), OR
   reproduce the offset by translating the home CONTENT within the clone (`translateY(-#home.scrollTop)` on the
   home inner wrapper, not the whole clone). State the invariant; require the clone's home to actually carry
   the offset.

2. **GHOSTSCROLL is jsdom-vacuous for the device artifact.** jsdom performs no layout and stores `scrollTop`
   as a plain number regardless of `overflow`, so a test asserting `clone-home.scrollTop === 500` passes even
   when the clone is not a scroll container — i.e. the cell is GREEN for the device-broken mechanism of (1).
   Loki's counterexample is a VISIBLE jump (a paint), and the jsdom cell cannot observe a paint. Promoting it
   to "the Loki counterexample … permanently gated" (§9 L5, §10 row) overclaims: the cell protects the
   source-aware BRANCH (home vs browse) and reddens on the window.scrollY mutation — keep it for that — but the
   on-screen zero-jump is DEVICE-owed, the same class as R1(a)/R1(b). Add a device-owed L5 fidelity gate (the
   ghost of a scrolled home shows home-at-offset on the real screen) and stop claiming the KILL is fully closed
   at CI. (This is the project's recurring "vacuously-green harness" scar — a jsdom-green cell over a
   device-only behaviour.)

Not fatal and not a seam-completeness miss: the invariant and the seam sweep are right, and both fixes are
buildable. But as written the repair does not close the device KILL and its gate can't see the failure — so it
must be tightened before Loki re-strikes (Loki's counterexample is device-visible; a jsdom-green GHOSTSCROLL
would let the same jump through).

### Other repair items — spot-checked, not blocking

- **§2 STAYS / §12 PRESERVED opened no wider than needed:** only the ghost's vertical scroll-source read
  (swipe.js:257) is opened; `ghostApp`/`copyScroll`/`copyAnimPhase`/`ghostWrap` otherwise preserved. Confirmed
  the do-not-touch is not widened (the id-strip line 252 and the clone assembly are untouched — which is
  exactly why F10 bites: the fix must live in the scroll-source read + the geometry keying, not by touching the
  strip).
- **N1 abort `scroll0` restore benign for a home source:** correct — `#home.scrollTop` persists element-locally
  across the gesture, and `window.scrollTo(0,0)` is inert on the retained runway. No re-home needed.
- **Lesser notes** (`paneKindOf` →home ghost label, abort decode-cleanliness reason css:83-96): non-blocking
  diagnostic/records corrections; not re-audited in depth.

### Prior findings (F1 through F9) + PolicyLedger — NOT disturbed by the repair

Re-checked the repair's blast radius: §3 still carries the two-hypothesis flash framing (F3, line 82/88); §8
L3/§12 still retain css:73 (F1, line 186); the abort is still the no-hold `abortRender:'none'` path (F7); the
PolicyLedger entry is unchanged. The repair touched §9/§10/§1/§2/§12 only and did not regress the FORGE'd
findings.

## Verdict — re-verify: TEMPER (F10 only)

The repair fixes the right thing (the seam-laundered home-scroll consumer) with the right invariant and a
complete seam sweep — but the prescribed mechanism (`scrollTop` on an id-stripped, non-scrolling clone) does
not close Loki's device jump, and the GHOSTSCROLL cell is jsdom-vacuous for it. On F10's fix (make the clone's
home carry the offset — class-keyed overflow or a content-translate — plus a device-owed L5 fidelity gate),
the plan is FORGE-ready. No other finding re-opens.

*(This TEMPER verdict was for HEAD `e727840`. Vitruvius fixed F10 (HEAD `3d2b7b3`, scope held to F10). The
F10-confirmation pass below SUPERSEDES it.)*

---

## F10-confirmation pass — tempered plan HEAD `3d2b7b3` (2026-07-28)

Scope: F10 only (the L5 mechanism + the GHOSTSCROLL/R1(d) honesty split). F1–F9, the seam sweep, and §2/§12
are not re-opened. **Both F10 fixes are landed, correct, and internally consistent — verified against
`ghostApp` (swipe.js:249-266). Verdict: FORGE.**

### F10.1 (mechanism) — CONFIRMED: content-translate closes Loki's counterexample

§9 L5 now reproduces home's offset by the SAME whole-clone content-translate the in-flow ghost already uses —
`clone.style.transform = translateY(-offset)` (swipe.js:258) — changing ONLY the offset SOURCE
(`window.scrollY` → `#home.scrollTop` when the source is home). Verified against source: `ghostApp` clones
`.app`, strips ALL ids (swipe.js:252) so the clone's home loses its id-keyed `overflow-y` and lays out its
FULL content from the top (not a scroll box); `translateY(-500)` shifts that full tree up 500px and
`ghostWrap`'s `overflow:hidden` (swipe.js:243) clips it to the viewport → the ghost shows home-at-500 → zero
jump at the real→ghost swap. This is precisely my F10.1 option (b), and the id-strip that BROKE the `scrollTop`
mechanism is exactly what MAKES content-translate valid. The plan states the scroll-container independence
explicitly ("the id-stripped clone holds the full home content laid out from the top … the offset is carried
by the whole-clone transform, not by clone `scrollTop`"), specifies the source-kind resolution (home →
`#home.scrollTop`; browse → `window.scrollY`; both into the one `translateY`), labels the earlier
"vertical-analog-of-`copyScroll`" draft WRONG with the class-keyed-vs-id-keyed reason, and carries no residual
"whole-clone translateY is wrong / shows blank" claim (grep-confirmed). Mechanism-level: closes the KILL.

### F10.2 (honesty) — CONFIRMED: GHOSTSCROLL demoted to the source-branch gate; R1(d) owns the visible jump

GHOSTSCROLL (§10 row 221) now asserts only the CI-checkable SOURCE branch — the captured offset
(`capture.ghostY` / the clone `translateY`) equals `#home.scrollTop` (500), not `window.scrollY` (0) — and
reddens on the `window.scrollY`-source mutation. `capture.ghostY` is a real value `buildConstruction` returns
(swipe.js:265), so the cell is well-formed and CI-observable, and it proves the code reads the right source and
nothing more. A new device gate **R1(d)** (§11 line 229) owns the on-screen zero-jump (scrolled `home→books`
and `home→overlay`, no jump at swap AND at abort uncover), explicitly stating "the Loki KILL is NOT closed at
CI — the on-screen zero-jump is device-owed." Every mention is correctly scoped — the dimension rows (204/205),
R2 (230: "honestly PARTIAL … the Loki KILL is not called closed at CI"), and the Curie handoff (286: "do NOT
write a CI cell asserting the on-screen jump — vacuously green"). No residual text claims CI closes the jump.
Six CI cells consistent across the dimension rows, the `blocking_questions` declaration, and the Curie handoff.
The project's "vacuously-green harness" scar is now correctly avoided by construction.

### Not disturbed

The F10 fix is scoped to §9 L5, §10 GHOSTSCROLL, §11 R1(d), the two dimension rows, and the Curie handoff.
F1–F9 (css:73 retained, two-hypothesis flash framing, no-hold abort) and the PolicyLedger entry are untouched.

## Verdict — FINAL: FORGE

The plan is sound and internally consistent. The `→home` construction edit (three enum values, frozen-spec
validated), the fixed own-scroll `#home` slide-and-leave, the complete seam-swept home-scroll re-homing
including the L5 content-translate ghost fidelity, the constraint-E dissolution (ledgered), the A2 seating
(retained css:73 runway), and the honest CI/device split (six CI cells; R1(a) flash, R1(b) bars, R1(c)
nested-scroll, R1(d) L5 zero-jump device-owed) all hold. Build it. The Loki KILL is repaired at the mechanism
level and its CI gate no longer overclaims — a fresh Loki re-strike now lands against a plan whose home-source
ghost reproduces the real scroll.

Next: Loki re-strike (fresh); then Curie builds the six-cell suite from §10 (PolicyLedger test names filled so
`policy-ledger-gate` passes) and Brunel builds. The four device gates R1(a/b/c/d) remain device-owed downstream
as the plan states.

VERDICT: FORGE
