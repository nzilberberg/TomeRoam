# Coverage audit — the parked-page park-distance fix (`.browsepage.parked` `-101vw` → `-300vw`)

Type: coverage-audit
Gate: **publish** (the suite is green; the build landed at `1c0b62a`, build `2026-08-02.304`).
Audited at HEAD `b55fef9`. Plan of record: `Claude/Plans/PLAN-parked-page-rides-home.md` (RATIFIED,
three rounds of temper), Coverage Model §8, ten catalog dimensions.

Suite under audit: `test/parked-page-rides-home-css.test.js` (PARKOUTOFREACH, eight named tests),
`test/parked-page-rides-home-browse.test.js` (DRAGREACHBOUNDED, NOPARKONHOME + its anti-vacuity
companion), the reused park-lifetime cells in `test/swipe-declone-stage2-browse.test.js`, and the
real-engine oracle `Claude/Curie/parked-page-rides-home-oracle.probe.js`.
Test design: `Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md`.
Adversary: `Claude/Loki/parked-page-rides-home-strike-2026-08-02.md` — HELD_STONE.
Code review: `Claude/Poirot/POIROT-parked-page-rides-home-b358f73.md` — PASS, F9 and F10 routed here.

**VERDICT: GAPS NAMED.** Every applicable dimension has a witness, and dimensions 4 and 10 — bare
in HEAD before this pass — were swept by **executing** the real-engine oracle at 375, 640 and
1000 px, with the instrument proven able to fire first. Two bare cells remain, both load-bearing
preconditions of the floor with no registered mutant (§7 M1, M2), and the oracle that carries
dimension 10 has two instrument defects measured this pass, either of which lets it report PASS
while witnessing something other than the shipped rule under a live gesture (§7 M4, M5).
The device gate stands unclaimed and nothing in the suite or the records over-claims it (§3, D-DEV).

## Index

1. Phase 1 — the ground
2. Phase 2 — the matrix
3. Phase 3 — the sweep, cell by cell
4. Phase 4 — the bare cells, each with its occupant
5. Phase 5 — the verdict
6. Matrix summary
7. Findings
8. Phase 6 — the forward read
9. Commands run this pass

## 1. Phase 1 — the ground

What the change claims, enumerated before a test was read:

| # | Claim | Source |
|---|---|---|
| C1 | A parked `.browsepage` cannot be composed onto the viewport **by the park offset**, for any displacement `#browse` can take, at a constant viewport width. | plan §12; `css/app.css:119-142` |
| C2 | The floor is `max \|displacement of #browse\| (100vw) + (L + W) (≤100vw) = 200vw`, STRICT, both terms bounded by construction. | plan §4 |
| C3 | `-300vw` is that floor plus a viewport of margin AND the exact bench-measured form. | plan §4; MEASUREMENT record |
| C4 | Invariant P is untouched — no position, no insets, no `!important`. | plan §6 I1 |
| C5 | `overflow: hidden` stays verbatim. | plan §6 I2 |
| C6 | Cover retention cannot regress at the new distance. | plan §6 I3, §9 — **device-owed** |
| C7 | Parking stays gesture-scoped — no page is parked after the gesture ends. | plan §6 I4 |
| C8 | The destination still settles at 0. | plan §6 I6 |
| C9 | A gesture's own destination render parks no page on the two outgoing-side transitions (I10, scoped). | plan §6 I10 |
| C10 | No frame paints between a mover's transform CLEAR and its `.parked` removal (I11). | plan §6 I11 |
| C11 | Every registered mutation still applies. | plan §6 I9 |

The plan calls dimensions **2, 5 and 9 not applicable**. Those calls are audited in §3, not accepted
on the plan's say-so.

## 2. Phase 2 — the matrix

Fixed before the sweep. Every cell gets a status in §3; no cell was added afterwards.

D1.1 warm-cache precondition · D1.2 oracle warm state · D2.1 no runtime entry path · D2.2 the gate's
own parser fails closed · D3.1 `endHold` landed branch · D3.2 `endHold` no-landed-page branch ·
D3.3 R7 button-nav inside a live hold · D4.1 375px · D4.2 640px (tight boundary) · D4.3 1000px ·
D5.1 declaration absent · D5.2 declaration present but overridden · D6.1 strict inequality ·
D6.2 term 2 derived from source · D6.3 shipped form · D6.4 term 1 pinned at the real entry point ·
B1 centring precondition · B2 no `width` · B3 no `min-width` · B4 no `padding`/`border` ·
B5 `max-width` readable and ≤100vw · B6 anti-vacuity of the parse · D7.C1–C11 one cell per absolute
claim · D8.1 `home→browse` · D8.2 `overlay→browse` · D8.3 outgoing-side exemption · D8.4
`browse→browse` (Invariant P) · D8.5 `.view.nav-in-*` keyframes · D8.6 R7 · D9.1 persistence ·
D10.1 the feature oracle · D-DEV the device gate.

## 3. Phase 3 — the sweep

Mark grammar: **SWEPT** — a passing test genuinely forces the condition and asserts the outcome;
**SWEPT (executed this pass)** — filled by a command I ran, cited in §9; **N/A** — with the reason;
**BARE** — occupant stated in §4; **OWED** — outside the bench, claimed by nobody.

### Dimension 1 — Lifetime and reuse — APPLICABLE

| Cell | Status | What actually witnesses it |
|---|---|---|
| D1.1 | SWEPT | Both integration cells assert the warm cache as a *loud fixture precondition*, not as setup: NOPARKONHOME asserts `pageCache.size >= 2` and `≥1` page carrying `.hidden` with messages naming why (`test/parked-page-rides-home-browse.test.js:234-240`). A fresh-state fixture fails rather than passing on an empty page set. |
| D1.2 | SWEPT (executed this pass) | The oracle refuses to pass on a cold cache (`VACUOUS: no .browsepage was sampled at all`). Every run this pass reported `parkedSampled = 8`, `nonDegenerateParked = 8` — the warm state was real, built through the app's own UI paths (Books → book row → Home → Books → back-swipe commit). |

### Dimension 2 — Trust boundaries and hostile inputs — **N/A, call CONFIRMED**

The product change is a stylesheet constant: no entry path, nothing parsed, validated or rejected.
The adjacent reading — *the gate itself* takes an input (the text of `css/app.css`) — was checked
rather than waved past, because a parser that defaults on an unreadable input is this project's
named scar. It fails **closed** on every form I traced (D2.2, SWEPT by reading):
an unparseable `translateX` yields `vw: null`, which the strict-inequality cell counts as *bad*
(`:404`); an unreadable `max-width` yields `capVwOf → null`, which makes `derivedFloorVw()` return
`null`, which the strict-inequality cell asserts against explicitly (`:401`) **and** which reddens
the `max-width` bar (`:366`). No silent default exists on either side.

### Dimension 3 — Concurrency (the gesture-scoped park lifetime) — APPLICABLE

| Cell | Status | Witness |
|---|---|---|
| D3.1 | SWEPT | `test/swipe-declone-stage2-browse.test.js:~388` — after a COMMIT, the landed page is not `.parked` and the source is `.hidden`. |
| D3.2 | SWEPT | `:~378` (ABORT) and `:~450` (`browse→home`, both outcomes) — the aborted-to page is not `.parked`. |
| D3.1/3.2 universality | SWEPT | `endHold` clears `.parked` by iterating **all of `pageCache`** on both branches (`js/browse.js:181-185`, `:206-210`) — one loop per branch, so the two-page fixtures exercise the whole path rather than two instances of it. |
| D3.3 (R7) | SWEPT (executed by the adversary) | Strike runs C and C3: a navbar tap inside the 340 ms settle window parks both cached pages simultaneously, class-governed at right −750 and −375, **0 hits**. Covered by the floor, and the suite does not pretend otherwise — NOPARKONHOME's header explicitly disclaims the universal form. |

Live re-confirmation this pass: after the final oracle run committed, `anyParked = 0` in a real
engine at the new distance (§9 cmd 12) — I4 witnessed outside jsdom, which no CI cell can do.

### Dimension 4 — Shape and platform matrices (viewport width) — APPLICABLE

**Bare in HEAD before this pass; SWEPT by execution now.** No CI cell can express it (jsdom has no
layout). The oracle is the only instrument, and it had no recorded run — Poirot's F10.

| Cell | Status | Measured |
|---|---|---|
| D4.1 375px (`L=0, W=V`) | SWEPT (executed) | 18 samples, 8 non-degenerate parked, **0 hits**; parked page at left −750 / right −375. |
| D4.2 640px (tight boundary, `W=V`, `L=0`) | SWEPT (executed) | 18 samples, 8 parked, **0 hits**; parked at left −1280 / right −640. |
| D4.3 1000px (`L=180, W=640`) | SWEPT (executed) | 18 samples, 8 parked, **0 hits**; per-move trace `browseLeft 1043→220`, parked right `−1317→−2140`. |

`PARKORACLE.report()` → **`pass: true`, `missing: []`, `failed: 0`**, widths `[375, 640, 1000]`.

### Dimension 5 — Failure and rejection paths — **N/A, call CONFIRMED; the plan's reason is incomplete**

The plan names one failure mode — the declaration *not being present as written* — and maps it to
PARKOUTOFREACH. There is a second, and it is better covered than the plan claims:

| Cell | Status | Witness |
|---|---|---|
| D5.1 absent / wrong value | SWEPT | PARKOUTOFREACH shipped-form cell; mutants #126 (`-101vw`, kills 2 cells) and #127 (`-250vw`, kills the shipped-form cell alone) — both executed this pass. |
| D5.2 **present but OVERRIDDEN** | SWEPT | `parkOffsetsVw()` collects the transform from **every** rule that can contribute to a parked page and requires *all* of them to be exactly 300 — not merely the last one to win. A second rule declaring a different park therefore reddens. The `!important` override is a separate path, held by PARKLOSESTRANSFORM and mutant #106, executed this pass. |

### Dimension 6 — Numerical edges and determinism — APPLICABLE

| Cell | Status | Witness |
|---|---|---|
| D6.1 strict inequality | SWEPT | `:398-415`; mutant **#126** kills it (executed this pass). Strictness matters only at exactly 200vw, which the 640px boundary makes reachable in principle. |
| D6.2 term 2 derived, not typed | SWEPT **with a stated limit** | The cell does parse `#browse`'s box. But under the structural bars `edgeVw = (100 + min(M,100))/2` is **100 for every admissible `M`**, so the floor is invariant at 200 and can only ever move *downward* (a `vw` cap below 100). It is a derivation whose value no admissible change raises — see M1/M2: the real detection of a widened box lives in the bars, not in the arithmetic. |
| D6.3 shipped form | SWEPT | `:424-434`; mutant **#127** kills it alone (executed). |
| D6.4 term 1 pinned at the real entry point | SWEPT | DRAGREACHBOUNDED over-drags to ~3.5 viewports through the real `app.js`, asserts `\|N\| ≤ w` across all three writers, and proves its own phase attribution (the first write of the lock-crossing dispatch equals `±w`). Mutant **#131** (clamp removed) kills it alone (executed). |

**The structural bars — the preconditions the arithmetic stands on:**

| Cell | Status | Witness |
|---|---|---|
| B1 centring (`left:0`, `right:0`, `margin:auto`) | **BARE** | No registered mutant. See §7 M2 — this is the guard against a negative inset, which is the one admissible edit that makes `L + W > 100vw`. |
| B2 no `width` | SWEPT | mutant **#129** (`width: 200vw`, additive) kills it alone (executed). |
| B3 no `min-width` | SWEPT | mutant **#130** (`min-width: 200vw`, additive) kills it alone (executed). |
| B4 no `padding` / `border` | **BARE** | No registered mutant. Poirot F9, confirmed and sharpened — §7 M1. |
| B5 `max-width` readable, `px` or `vw ≤ 100` | SWEPT | mutant **#128** (`max-width: 250vw`) kills it alone (executed) — and the sweep confirms by execution that it does **not** move the floor, which is the plan's F10 reclassification proven rather than argued. |
| B6 anti-vacuity of the parse | SWEPT | The fixture-sanity cell requires >200 parsed rules, the real `#browse` element, a declared park transform, a declared `max-width`, **and** that all three scope relaxations actually landed rules in the scanned set (base rule, `body.has-player #browse`, a `.view.nav-in-*` rule) — so a relaxation that stopped working is a failure, not a silent narrowing. |

### Dimension 7 — Contract claims — APPLICABLE

| Claim | Status | Mapped to |
|---|---|---|
| C1 (the §12 promise) | SWEPT (executed) | The oracle at three widths, HIT rule requiring *no inline transform*; plus HELD_STONE. |
| C2 (the floor, both terms bounded) | SWEPT, with M1/M2 as the residual | PARKOUTOFREACH (term 2 + bars) and DRAGREACHBOUNDED (term 1). |
| C3 (the tested form) | SWEPT | shipped-form cell; mutant #127. |
| C4 (Invariant P) | SWEPT | PARKBOXEQUAL; mutants **#104**, **#105** executed this pass. |
| C5 (`overflow: hidden`) | SWEPT | PARKBOXEQUAL asserts it on both park rules from one list; **#105** executed. |
| C6 (cover retention at 3 viewports) | **OWED — device** | Argued in plan §4/§9, gated by device item 2. No cell claims it; §9's wording ("applies briefly, saved by ordering") is honest. |
| C7 (gesture-scoped park) | SWEPT + live | dimension 3 above; plus `anyParked = 0` in a real engine this pass. |
| C8 (destination settles at 0) | SWEPT (executed) | Post-commit at 640px: shown page `left 0`, `width 640`, `#browse` inline cleared (§9 cmd 12). |
| C9 (I10, scoped) | SWEPT | NOPARKONHOME, sampled at touchstart / after `start()` / **mid-drag** / after finalize, with a companion cell proving the parked observable is live on `browse→browse` in the same fixture. Mutant **#132** kills it (executed). The mid-drag sample is the discriminating one and was chosen by measurement, not reasoning. |
| C10 (I11, no paint between clear and un-park) | **N/A by decision, correctly** | A property of synchronous control flow, deliberately ungated (plan I11). Recorded so that inserting an `await`/`rAF` there is visibly a re-arming of R2. No cell can witness it; the plan says so rather than claiming one. |
| C11 (every mutation still applies) | SWEPT | `test/mutation-anchors.test.js` (match, no-op, uniqueness) **plus** the CI `mutation-sweep` job — see §7's judgement on the anchors question. |

### Dimension 8 — Composition — APPLICABLE (the highest-value dimension)

| Cell | Status | Witness |
|---|---|---|
| D8.1 `home→browse` (INCOMING) | SWEPT (executed) | The oracle's repro at three widths. |
| D8.2 `overlay→browse` (INCOMING) | SWEPT by derivation | `docs/transition-matrix.generated.txt:15,21` — an **executed** inventory, guarded by `test/transition-matrix.test.js`, showing both transitions render `browse-host`, so `#browse` takes the identical `base = ±w`. The floor bounds both. Residual: no gesture drives `overlay→browse` in any cell; the identity is a fact about the generated construction, not about a run. |
| D8.3 outgoing-side exemption (I10) | SWEPT | NOPARKONHOME + mutant #132; independently executed live by the adversary (run B(i): zero `.parked` pages at every sample of a `browse→home` over-drag). |
| D8.4 `browse→browse` (Invariant P) | SWEPT | PARKLOSESTRANSFORM + mutant #106; executed live at `-300vw` by the adversary (run C3: the parked outgoing mover on-viewport at right +70, correctly **not** class-governed). The oracle's HIT rule encodes exactly this distinction. |
| D8.5 `.view.nav-in-*` keyframes | SWEPT by derivation | `translateX(±100%)` of `#browse`'s own border box, `min(640px, 100vw) ≤ 100vw`; enumerated by the adversary at source. Not driven by any cell — and this pass produced the first *measured* consequence of that path (M5). |
| D8.6 R7 (button nav inside a live hold) | SWEPT (adversary) | Runs C / C3. Named as a present path, covered by the floor. |

### Dimension 9 — Persistence round-trip and version evolution — **N/A, call CONFIRMED; the plan's reason is FALSE as written**

The plan says "nothing persisted, nothing versioned, nothing serialized." At the artifact level that
is not true and this pass measured it: `css/app.css` **is** persisted, in the service-worker shell
cache, and one browser profile held **two** shell caches simultaneously —
`tomeroam-shell-2026-08-01.303` and `tomeroam-shell-2026-08-02.304` — with the `.303` one serving
the page (§9 cmd 8). The dimension is real. It is nonetheless **not applicable to this change**,
because the old-reader/new-data axis is owned by the build-stamp lockstep (`test/build.test.js`,
green in the 823-test run), which this build advanced `.303` → `.304`. The park constant introduces
no new persisted or versioned shape.

The correction matters because **the same measured fact is what makes finding M4 live**: an
instrument that reads the *served* stylesheet, on a bench where a stale shell cache is the default,
must assert which value it is testing.

### Dimension 10 — Functional achievement (the feature oracle) — APPLICABLE and load-bearing

**Bare in HEAD before this pass** (Poirot F10 — the script existed; no run was recorded anywhere).
**SWEPT by execution this pass**, under conditions I verified rather than assumed:

1. **The instrument was proven able to fire first.** `PARKORACLE.fireDrill()` flipped the live rule
   to `-101vw` and reported **8 class-governed hits**, parked chapter list at **left −4 / right +371**
   — the measurement record's Δ = −4px and the adversary's figures, reproduced independently.
2. **The stylesheet under test was verified**, after the stale-cache defect described in M4 was
   found and cleared: `parkDeclaration = translateX(-300vw)`, `build.json = 2026-08-02.304`.
3. **The instrument's exposure was verified**, after the animation-override defect described in M5
   was found: with the stuck `nav-in-*` class cleared, `#browse`'s measured left tracks its own
   inline write (`1043 → 220` against `translateX(863px) → translateX(40px)`).
4. **The result:** 0 hits at every sample of every run, 8 non-degenerate parked samples per run,
   `report()` → `pass: true`, no missing width, no failed run.
5. **The destination settle (C8)** was confirmed after the commit: shown page at `left 0`,
   `width 640`, `#browse` inline cleared, `anyParked = 0`.

### The device gate — OWED, and nothing over-claims it

Plan §8 device items 1 (the user's exact repro shows no garbage over Home) and 2 (cover retention
across an aborted `browse→browse` at the new distance). I checked every record that could
over-claim them: the build log §8, the board row ("Device gate (R1, R2) remains owed"), the plan
§11 open questions, the test design §7, the CSS comment, and both test files. **None claims either.**
The oracle is bench evidence and is filed as such; C6 is labelled spec-derived-and-device-owed in
plan §9. The hygiene is clean. This, not any finding below, is what stands between the change and
"fixed."

## 4. Phase 4 — the bare cells, with their occupants

**B4 — no `padding` / `border` on `#browse`.** The cell needs a registered, *additive* mutant:
`css/app.css` `#browse { … max-width: 640px; }` → `max-width: 640px; padding-left: 16px;`.
Additive for the reason the plan's F13 records — a replacement deletes the declaration the cell's
anti-vacuity check requires and kills through that check instead of through the assertion it
witnesses. Predicted result: reddens the no-`padding`/`border` test **alone** (`derivedFloorVw()`
reads only `max-width`, so the strict-inequality cell stays green; the centring and `max-width`
cells are untouched). This is a **precondition-only kill by design**, exactly like #129 — under
`* { box-sizing: border-box }` padding cannot widen the border box, so the bar's real job is to keep
that assumption true: it is what forbids the one shape where the assumption fails
(`box-sizing: content-box` plus a large padding, where the border box exceeds the cap). Oracle kind:
structural precondition, not a feature oracle. Owner: **the test author**.

**B1 — the centring precondition (`left: 0`, `right: 0`, `margin: 0 auto`).** No mutant either, and
this one guards a path that is *not* conservative. The cell needs:
`#browse { … left: 0; right: 0; … }` → `left: 0; right: -400px;`. Derivation, stated because an
approximation here is the difference between a killing mutant and an equivalent one: with
`right: -400px` the available width becomes `V + 400`, so at `V = 375` the used `W = min(640, 775)
= 640`, `L = (775 − 640)/2 = 67.5`, and `L + W = 707.5px = 188vw > 100vw` — the floor's second term
is broken, and the *arithmetic cell cannot see it* because `derivedFloorVw()` never reads `left` or
`right`. Predicted result: reddens the centring test **alone**. Oracle kind: structural
precondition. Owner: **the test author**.

**Nothing else is bare.** C6 and the two device items are OWED, not bare — they are outside the
bench by nature and are correctly labelled everywhere they appear.

## 5. Phase 5 — the verdict

**GAPS NAMED.** The suite spans its contract: every applicable dimension has a witness, every N/A
survived audit (two with their *reasons* corrected), and the two dimensions that were genuinely
bare in HEAD — 4 and 10 — are swept by an execution recorded here rather than by an argument.
Proceeding is the user's call with two things in view: two precondition cells labelled GATE that no
mutant defends (M1, M2), and an oracle whose PASS is currently conditional on bench discipline no
script enforces (M4, M5).

## 6. Matrix summary

| Dimension | Cells | Swept | N/A | Bare | Owed |
|---|---|---|---|---|---|
| 1 Lifetime and reuse | 2 | 2 | — | — | — |
| 2 Trust boundaries | 2 | 1 | 1 | — | — |
| 3 Concurrency | 3 | 3 | — | — | — |
| 4 Shape / platform matrix | 3 | 3 (executed this pass) | — | — | — |
| 5 Failure and rejection | 2 | 2 | (dimension N/A, both paths covered anyway) | — | — |
| 6 Numerical edges + the 6 structural bars | 10 | 8 | — | **2** | — |
| 7 Contract claims | 11 | 9 | 1 (C10, by decision) | — | 1 (C6, device) |
| 8 Composition | 6 | 6 | — | — | — |
| 9 Persistence / version evolution | 1 | — | 1 | — | — |
| 10 Functional achievement | 1 | 1 (executed this pass) | — | — | — |
| Device gate | 2 | — | — | — | 2 |
| **Total** | **43** | **35** | **4** | **2** | **3** |

## 7. Findings

| # | Severity | Finding | Owner |
|---|---|---|---|
| M1 | **Gap** | `test/parked-page-rides-home-css.test.js:351` — the no-`padding`/`border` cell is labelled `GATE` in the file's own header table with no registered mutant, and none in `tools/mutate.mjs` reddens it (EC §4.10). Confirms Poirot F9 and sharpens it: because the floor is invariant at 200vw under every admissible box (§3 D6.2), the *entire* detection capability for a widened `#browse` lives in the five structural bars — and this is one of two with no witness. Occupant specified in §4. | the test author |
| M2 | **Gap** | `test/parked-page-rides-home-css.test.js:319` — the centring cell (`left:0`, `right:0`, `margin:auto`) is likewise unwitnessed, and it is the **only** guard against the one admissible edit that genuinely breaks `L + W ≤ 100vw`: a negative inset. Worked example and mutant text in §4. Not found by the code review. | the test author |
| M3 | **Misleading** | `Claude/Curie/parked-page-rides-home-oracle.probe.js` never asserts **which park value it is testing**. It records `parkDeclaration` in the verdict and prints it, but no failure path depends on it. Measured this pass: on first load the bench served `translateX(-101vw)` from `tomeroam-shell-2026-08-01.303` while the tree shipped `-300vw` at `.304`. The dangerous direction is the mirror image — a warm `.304` cache over a tree regressed to `-101vw` makes `run()` report PASS and `report()` print "dimension 10 witnessed at all three widths." That is this project's named scar inside the one cell that witnesses dimension 10. The `HOW TO RUN` header has no unregister/clear-caches step. | the test author |
| M4 | **Misleading** | Same file — the oracle reads `getBoundingClientRect()` while a stuck `nav-in-*` animation can override the gesture's inline transform in the cascade, and it does not notice. Measured: `#browse`'s inline ran `translateX(863px) → translateX(40px)` across 8 samples while its rect stayed pinned at left 820 for all 8. `js/nav.js:163` removes the class on `animationend`, which never fires on a hidden pane (the adversary recorded the freeze as a bench fact; nobody carried it into the oracle as an assertion). At `V ≤ 640` the pinned position coincidentally equals the gesture's maximum (`+100%` of a border box that equals the viewport), so the run is still worst-case; at `V = 1000` it understates the displacement by 360px — the one width the matrix exists to vary `L` and `W` at is the one the frozen instrument under-exercises. | the test author |
| M5 | Note | `test/parked-page-rides-home-css.test.js:376-381` — the `SKIP-PENDING-BUILD` block still reads "The two tests below are RED at HEAD … THE BUILDER REMOVES BOTH SKIPS FIRST." Both skips are gone, both cells are live and green. Same class as the review's F3/F4, which named only the two constants (`SKIP_FLOOR`/`SKIP_FORM`) and the failure messages. Records lifecycle, standards §6.6. | the builder |
| M6 | Note | `Claude/Curie/…-test-design-2026-08-02.md` §1 and §3 still describe the two arithmetic cells as "RED, landed behind `SKIP-PENDING-BUILD`" and the baseline as "823 / 820 pass / 3 skipped". At HEAD the baseline is **823 / 822 pass / 1 skipped** and both cells are live. The record was true when filed and is a pre-build snapshot; it is now the only place a reader is told the cells are skipped. | the test author |

**The anchors-gate question Poirot routed here — judgement: NOT a coverage hole; no specification
owed.** `test/mutation-anchors.test.js` proves an anchor still *matches*; the claim that a mutant
still *kills* is proven by `tools/mutation-sweep.mjs`, and `.github/workflows/ci.yml` runs that sweep
**on every push**, sharded 8 ways over the live mutation count with the shards partitioning the whole
set. An anchor migration that turns a mutant equivalent therefore surfaces as an uncaught mutant on
the same push that lands it — structurally, not by anyone remembering. The residual is a window, not
a hole: the fast pre-commit battery deliberately excludes the sweep, so the gap is commit-to-CI, and
CI is the backstop by design. Doing the check by hand this pass was correct diligence, not evidence
of a missing gate.

**A mutation result stops being true when the suite changes — re-checked, and it held.** The review's
sweep ran at `b358f73`; `b55fef9` then edited both test files (F2/F3/F4) and `tools/mutate.mjs` (F7).
I re-swept all ten park-family mutants at HEAD: **swept 10: 0 uncaught, 0 unapplied, 0 stale flags**,
each killed by the cell it names, with #126 killing two arithmetic cells and #127, #128, #129, #130,
#131 each killing exactly one. Per-assertion attribution — the thing the plan's F14 says the gate
cannot reach — survives the fix commit intact.

## 8. Phase 6 — the forward read

The floor is now defended by execution at both ends, and the bare cells are not in the arithmetic —
they are in the **preconditions the arithmetic silently assumes**. Read forward, that is where the
next externally-found defect in this area lands, and it has a specific shape: someone changes
`#browse`'s box for a reason that has nothing to do with the swipe — a tablet layout, a wider
reading pane, an inset for a new strip — and writes `right: -Npx` or a padding beside the
`max-width`. The strict-inequality cell will not see it: `derivedFloorVw()` reads `max-width` and
nothing else, so the floor stays 200 while `L + W` really grows. The only thing that reddens is a
bar, and the two bars covering exactly those two edits are the two with no mutant behind them. That
is not a hypothetical ordering — it is the same shape as the defect being fixed (a constant and a
container that each audit clean alone), one level out in the gate.

The second prediction is about the instrument rather than the product. Dimension 10 has exactly one
witness, it is manual, it lives outside `npm test`, and both defects found in it this pass (M3, M4)
are ways for it to report PASS while looking at something other than the shipped rule under a live
gesture. The next time it is run will be after a change, by an operator who was not in this session,
on a bench whose default state serves a stale stylesheet. Without M3's assertion the run will be
believed. **The durable fix is not a bigger `HOW TO RUN` block** — the standards call a discipline
the fallback shape — it is the two in-script assertions named in §7, which cost a few lines and turn
the whole instrument fail-closed the way its non-degeneracy assertions already are.

## 9. Commands run this pass

Tree verified clean (`git status --porcelain`) before and after; the only untracked file is this
audit. The bench artefact (`identity`, required by the strike's documented recipe) was created and
deleted; the static server was stopped.

1. `node --test "test/*.test.js"` → `# tests 823 # pass 822 # fail 0 # skipped 1`.
2. `node tools/mutation-sweep.mjs 104 105 106 126 127 128 129 130 131 132` → `swept 10: 0 uncaught, 0 unapplied, 0 stale flags`, with a `killed by:` line per mutant.
3. `find . -name "*.mutbak" …` → empty, after the sweep.
4. `node -e "import('./tools/mutate.mjs')…"` — enumerated the park family: 104/105/106 (S2-6/7/8) and 126–132 (PARKM1/M2/M3/M3P/M4/PARKDRAG/PARKNOHOME); total 133.
5. `cat .github/workflows/ci.yml`, `sed -n '1,80p' tools/hooks/run-checks.mjs` — the sweep runs in CI on every push, sharded 8 ways; it is deliberately absent from the fast pre-commit battery.
6. Read of `js/browse.js:165-223` (`endHold`) and `:325-350` (`showPage`), `js/nav.js:157-163` (`slideInView`), `css/app.css:24` (`* { box-sizing: border-box }`), `docs/transition-matrix.generated.txt:15,21`.
7. Bench: `node tools/serve.mjs --port 8899`, real Blink engine (browser pane), library seeded through `Store.cacheBooks/cacheAuthors/cacheTracks` per the strike's recipe; warm state built through the app's own UI paths.
8. **Stale-cache defect found:** first load served `translateX(-101vw)`; `getRegistrations()` → 1, `caches.keys()` → `["tomeroam-shell-2026-08-01.303", "tomeroam-shell-2026-08-02.304"]`. Unregistered and cleared; reload then served `translateX(-300vw)` at `build.json = 2026-08-02.304`.
9. `PARKORACLE.fireDrill()` → **8 class-governed hits**, parked page at left −4 / right +371.
10. **Animation-override defect found:** per-move capture showed `#browse` inline `863→40px` with its rect pinned at left 820 for all 8 samples, `animationName = navInRight`. Repaired by removing `nav-in-left`/`nav-in-right` from every `.view` — precisely what `animationend` does at `js/nav.js:163`. After the repair the rect tracks the inline (`1043 → 220`).
11. `PARKORACLE.run()` at 375, 640 and 1000 px with the repair applied → 0 hits each, 8 non-degenerate parked samples each. `PARKORACLE.report()` → **`pass: true`, `missing: []`, `failed: 0`**, widths `[375, 640, 1000]`.
12. Post-commit state at 640px: shown page `left 0 / width 640`, `#browse` inline cleared, `anyParked = 0`.

— Filed 2026-08-02. Two bare cells, both preconditions; the oracle owes two assertions before its
next silence can be read as evidence.
