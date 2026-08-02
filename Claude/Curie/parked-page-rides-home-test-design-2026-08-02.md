# Test design — PLAN-parked-page-rides-home.md · 2026-08-02

Type: test design

Authored by the test author from `Claude/Plans/PLAN-parked-page-rides-home.md` (VERDICT: RATIFIED,
2026-08-02), at HEAD `04739c9`, after the adversary's strike
(`Claude/Loki/parked-page-rides-home-strike-2026-08-02.md`, VERDICT: HELD_STONE) and BEFORE the
one-declaration build.

**Current as of the coverage audit's remediation.** The build has shipped (`2026-08-02.304`), the
code review passed, and the coverage audit
(`Claude/Mendeleev/parked-page-rides-home-coverage-audit-2026-08-02.md`, VERDICT: GAPS NAMED) named
five items, all now closed: two unwitnessed structural bars (§5 F-D) and two oracle instrument
defects (§5 F-E), plus this record's own state statements. **Nothing in `css/` or `js/` is touched
by this work** — the fix is shipped and reviewed.

## Index

1. What was authored, and where it lives
2. The Coverage Model realized — every applicable dimension to a cell or a recorded absence
3. The cells, assertion by assertion
4. The mutants — registered, executed, and the measured result of each
5. Findings (five, all measured)
6. The build's owed items — discharged, and what the sequence proved
7. Handoff

## 1. What was authored, and where it lives

**State is current as of the coverage audit's remediation** (build `2026-08-02.304`; the fix is
shipped, `SKIP-PENDING-BUILD` is gone, both arithmetic cells are live and green). The derivations
below are unchanged — only the state statements are.

| Artifact | Path | State now |
|---|---|---|
| PARKOUTOFREACH (unit, CSS structural) | `test/parked-page-rides-home-css.test.js` | **8 tests, all GREEN, all eight mutation-witnessed** |
| DRAGREACHBOUNDED + NOPARKONHOME (integration, real entry point) | `test/parked-page-rides-home-browse.test.js` | 3 tests GREEN (gates) |
| PARKCLEARSHOME (the real-engine oracle) | `Claude/Curie/parked-page-rides-home-oracle.probe.js` | standalone; deliberately outside `npm test`. **Fail-closed on bench staleness and on animation override** (§5 F-D, F-E) |
| Nine park-family mutants | `tools/mutate.mjs` 126–134 | registered, anchors green, **all executed and caught** |

`npm test` = **823 tests, 822 pass, 0 fail, 1 skipped** (the one skip is pre-existing and unrelated).

**How the two arithmetic cells got here, since the sequence is the point and not the trivia.** They
were authored against the shipped `-101vw`, RUN red — the exact failure output is preserved in §7 —
and landed behind `{ skip: SKIP_* }`, this project's established red-first convention (the Stage-2
red suite, `be7da1c`, landed the same way). The repo's pre-commit hook runs the full suite and
blocks a red tree, so that was the sanctioned route rather than `--no-verify`. The build removed
both skips FIRST, drove each red, and only then made them green; a skip lifted after the constant
has already changed would have proven nothing. Both cells are now defended by registered mutants
rather than by that history (§4).

## 2. The Coverage Model realized

The plan's §8 names ten catalog dimensions. Each is realized or recorded as deliberately absent.

| Dim | Plan's disposition | Realized as |
|---|---|---|
| 1 Lifetime and reuse | APPLICABLE — needs a WARM page cache (≥2 pages, one away) | Both integration cells assert this as a named fixture precondition and fail loudly without it. `booksOverHomeWithAuthorsCached` taps home BETWEEN the two browse tabs so navStack's penultimate entry stays `home` while two pages stay cached — without that the gesture is `browse→browse` and the cell witnesses a different transition. |
| 2 Trust boundaries | NOT APPLICABLE — a stylesheet constant has no entry path | Absent, deliberately. |
| 3 Concurrency (gesture-scoped park lifetime) | APPLICABLE — reuse existing coverage, do not duplicate | Reused: `test/swipe-declone-stage2-browse.test.js:378`, `:390`, `:450` already assert `.parked` is cleared on both `endHold` branches. No new cell. |
| 4 Shape/platform matrix (375 / 640 / 1000) | APPLICABLE | The real-engine oracle's `report()` REFUSES to pass until all three widths have a run, naming 640 as the tight boundary. Not expressible in jsdom. |
| 5 Failure and rejection paths | NOT APPLICABLE | Absent, deliberately. |
| 6 Numerical edges and determinism | APPLICABLE — STRICT inequality, both terms derived | PARKOUTOFREACH's strict-inequality cell; term 2 computed by parsing `#browse`'s box, term 1 pinned by DRAGREACHBOUNDED. |
| 7 Contract claims | APPLICABLE — every absolute claim maps to a check | See §3. No claim left unmapped; none asserted by a cell whose mutant cannot redden it (§4). |
| 8 Composition | APPLICABLE, highest value | NOPARKONHOME, in the SCOPED form (I10 as narrowed by the plan's F11) — plus its own anti-vacuity witness. |
| 9 Persistence round-trip | NOT APPLICABLE | Absent, deliberately. |
| 10 Functional achievement (feature oracle) | APPLICABLE and load-bearing | The real-engine oracle. NOT a CI cell: jsdom returns all-zero rects, so `right <= 0` passes on `0 <= 0` and a jsdom cell could not fail. |

**Known-red introduced: none.** The two red tests are red-first cells for an unbuilt change, not
policy exceptions, so no `Claude/Decisions/PolicyLedger.mjs` entry is owed (that gate tracks
`{ todo }` markers).

## 3. The cells, assertion by assertion

### PARKOUTOFREACH — `test/parked-page-rides-home-css.test.js`

Eight separately-named tests rather than one. The plan's §11 gate proves *this mutant reddens this
CELL*; its F14 records that it cannot prove *this mutant reddens this ASSERTION*, and that finer
level is where two of the plan's three review rounds found a defect. Splitting the assertions makes
the sweep's own `killed by:` output the attribution, mechanically, at no extra cost.

| # | Test | State @HEAD | Witnessed by |
|---|---|---|---|
| 1 | fixture sanity — sheet parsed, `#browse` box found, park transform found, scope augmentation real | GREEN | — (it is the anti-vacuity) |
| 2 | `#browse` is an auto-centred `left:0/right:0` box | GREEN | mutant **#134** PARKINSET |
| 3 | no rule contributing to `#browse` declares a `width` | GREEN | mutant **#129** PARKM3P |
| 4 | no rule contributing to `#browse` declares a `min-width` | GREEN | mutant **#130** PARKM4 |
| 5 | no rule contributing to `#browse` declares a `padding` or `border` | GREEN | mutant **#133** PARKPAD |
| 6 | `#browse`'s `max-width` is `px`, or `vw` ≤ 100 | GREEN | mutant **#128** PARKM3 |
| 7 | the park offset STRICTLY exceeds the derived floor | GREEN | mutant **#126** PARKM1 |
| 8 | the park offset is the bench-measured shipped form | GREEN | mutants **#126** and **#127** PARKM2 (alone) |

**The floor is derived, not typed twice.** Term 2 (`edgeVw`) is computed from `#browse`'s own
`left/right/margin/max-width` — `edgeVw = (100 + min(M, 100))/2`, which is 100 for every `M`
because `left:0; right:0` means `max-width` can only CAP the box. Term 1 (100vw) is not derivable
from CSS and is pinned independently by DRAGREACHBOUNDED. Derived floor: **200vw**; shipped
offset: **300vw** (it was 101vw when these cells were authored, which is what made them red).

**⭐ THE BARS CARRY THE WHOLE DETECTION, and that is sharper than "preconditions" suggests.** The
coverage audit's D6.2 makes the consequence explicit: because `edgeVw` is 100 for every admissible
box, **the derived floor is invariant at 200vw and can only ever move downward**. `derivedFloorVw()`
reads `max-width` and nothing else. So a widened `#browse` is detected *entirely* by the five
structural bars — the arithmetic cell cannot see it at all. Test 7 computes over the box and does
not re-assert tests 2–6, which is what keeps each mutant reddening exactly one test; the refusal to
certify an unboundable box is carried by tests 2–6 being required-green members of the same suite.
That trade is a deliberate departure from the plan's "preconditions of (i)" wording, and it is only
safe because **every one of the five bars now has a mutant behind it** — two of them did not until
the audit named it (§5 F-D).

**⭐ THE PARSE SCOPE — the adversary's finding, closed.** The strike's lesser plane 1: *"a second
rule matching `#browse` added later (media query, body-class variant) carrying `width`/`min-width`
would widen the box with the cell green."* The cell does not parse "the `#browse` rule". It scans
**every rule that can contribute a declaration to the element**, decided by a REAL selector engine
(jsdom `matches()`) against the REAL `index.html` element, with two deliberately fail-closed
relaxations:

1. **Ancestor conditions are dropped** — only the SUBJECT compound is matched, so
   `body.has-player #browse` contributes even though the at-rest body carries no such class.
2. **The element is class-augmented** with every class `#browse` can carry at runtime
   (`view`, `hidden`, `nav-in-left`, `nav-in-right`), so `.view.nav-in-right` contributes —
   `#browse` IS a `.view`.

The fixture-sanity test asserts all three of those routes actually landed rules in the scanned set,
so a relaxation that stopped working is a failure rather than a silent narrowing. It also asserts
every pinned runtime class still occurs in the shipped sources: a vanished one means the scope has
rotted and some other, unpinned class is now invisible.

**Residual, stated:** a rule whose subject compound keys on a class `#browse` never carries is out
of scope by construction. The pinned class set is the seam; it is cross-checked, not proven
complete.

### DRAGREACHBOUNDED — `test/parked-page-rides-home-browse.test.js` (GREEN@HEAD, GATE)

Drives a **real forward `home→books` gesture** through the app harness (which boots the real
`app.js`) and over-drags to ~3.5 viewports, then asserts every inline `translateX` written on
`#browse` satisfies `|N| ≤ w`.

- **Interception, not sampling.** `start()` and the first live `move()` both write inside ONE
  touchmove dispatch; a test that sampled between calls would see only the last of them and could
  never witness the `start()` writer.
- **All three writers are asserted present** (start `js/app.js:630`, move `:651`, settle `:690`),
  so the bound is not pinned against whichever one the fixture happens to reach.
- **The phase attribution is itself proven**: the first write of the lock-crossing dispatch must
  equal the incoming mover's base, `±w`.
- **Anti-vacuity:** at least one `translateX` captured, and at least one with `|N| > 0` — a cell
  that observed an untouched element passes perfectly.
- **The over-drag is the point.** A gesture that stayed inside the viewport would pass this cell
  with the clamp deleted.

### NOPARKONHOME — `test/parked-page-rides-home-browse.test.js` (GREEN@HEAD, GATE)

Asserts a `browse→home` gesture leaves no `.browsepage` carrying `.parked` at **drag start, after
`start()`, mid-drag, and after finalize**.

**⚠️ The mid-drag sample is the one that discriminates, and this was MEASURED before the cell was
written, not reasoned to.** Under mutant #131 both cached pages carry `.parked` from the first live
move through mid-drag, and `endHold` clears them again by finalize. A cell sampling only after
finalize would be GREEN under the mutant — a fourth equivalent witness for this invariant, after
the three the plan's own review rounds found and discarded.

**Its anti-vacuity is a second test, and it is not optional.** "No page carries `.parked`" is
satisfied equally by a broken selector, an empty page set, or a build where nothing parks anything
ever. The companion test drives a `browse→browse` gesture in the same fixture and asserts a page IS
parked mid-drag, so the negative claim is a fact about the transition rather than about the
instrument.

**Scope, stated rather than overclaimed:** the cell asserts I10 in its SCOPED form — *the gesture's
own destination render* parks no page — never the universal "a gesture parks a page only when its
destination is a browse page". A button nav during the settle window reaches `showPage` by a
different route and CAN park pages while a `browse→home` gesture settles (plan R7, executed by the
adversary). That path is covered by the floor, not by this invariant.

### PARKCLEARSHOME — the real-engine oracle (NOT a CI cell)

`Claude/Curie/parked-page-rides-home-oracle.probe.js`. In-script anti-vacuity per the plan's F6, on
every run: a `.browsepage` was sampled at all; at least one sampled page carried `.parked`; and that
page's rect was NON-DEGENERATE (`width > 0` AND `height > 0`). The `-101vw` fire drill is kept as a
second line of defence rather than the only one.

**The HIT rule requires NO INLINE TRANSFORM**, and that clause is load-bearing. A parked
`browse→browse` outgoing mover overlaps the viewport BY DESIGN — Invariant P, executed by the
adversary at `-300vw` (right +70, inline present). An oracle without the clause would fire on the
shipped, intended filmstrip. This is the same distinction the strike's wording caveat requires of
the shipped CSS comment: the promise is true of pages **composed by the park offset**.

`report()` refuses to pass until 375, 640 and 1000 each have a run, naming 640 as the tight
boundary.

**⭐ TWO MORE THINGS ARE NOW ASSERTED RATHER THAN ASSUMED, and both were found by the coverage
audit EXECUTING this script — which is the first time it had been run by anyone but its author.**

*Which rule the run is testing (`preflight()`).* The oracle recorded `parkDeclaration` and printed
it, but no failure path depended on it. Measured: one browser profile held two shell caches
(`…2026-08-01.303` and `…2026-08-02.304`) with the older serving, so the bench applied
`translateX(-101vw)` while the tree shipped `-300vw`. That direction is loud — the run reports
hits. **The dangerous direction is the mirror**: a warm good cache over a REGRESSED tree, where
nothing in the geometry can see the problem and `report()` prints "dimension 10 witnessed at all
three widths." `preflight()` now asserts the served park offset IS the shipped value, and
cross-checks the live `build.json` against the shell-cache names — `build.json` being trustworthy
here **by route, not by luck**: the service worker routes it `'probe'`, network-only and never
cached (`js/swkit.js` `routeFor`, `sw.js` `probeOnly`), so it reports what the TREE serves while
`caches.keys()` reports what the PAGE may be running. `run()` and `report()` both FAIL without a
passing preflight.

*Whether the instrument is exposed to the gesture at all.* An animation beats an inline style in
the cascade, so a stuck `nav-in-*` PINS every rect the oracle reads while the drag scrolls past
underneath. Measured: `#browse`'s inline ran `translateX(863px) → translateX(40px)` across 8
samples while its rect stayed at left 820 for all 8. `js/nav.js:163` removes the class on
`animationend`, which never fires on a hidden pane — a bench fact the adversary had recorded and
nobody had carried into the oracle as an assertion. At `V ≤ 640` the pinned position coincidentally
equals the gesture maximum so the run is still worst-case; **at `V = 1000` it understates
displacement by 360px — the one width the matrix exists to vary `L` and `W` at.** Contamination is
now checked PER SAMPLE (so an animation starting mid-drag is caught, not averaged away) and fails
the run, with `repair()` offered as the fix rather than as the guard.

**Both were verified to FIRE, not merely written.** `run()` without a preflight, a two-cache bench,
a cache/tree build mismatch, a non-shipped served value, a stuck animation, a live rule that is not
the value the run claims, and `report()` without a preflight — nine paths, each driven in a stubbed
jsdom bench and each observed to produce its failure. Writing an assertion whose failure path is
never executed is the exact defect being repaired here.

## 4. The mutants — registered, executed, measured

The suite is fully green, so **every `killed by` line below is a true delta** and needs no
interpretation. Run against the FINAL state of the cells (not an intermediate one):

`node tools/mutation-sweep.mjs 104 105 106 126 127 128 129 130 131 132 133 134`
→ **swept 12: 0 uncaught, 0 unapplied, 0 stale flags.**

Nine of the twelve kill exactly ONE test, and it is the one they are registered to witness — the
per-assertion attribution the plan's F14 records the gate cannot otherwise reach.

| # | Mutant | Result | Killed by |
|---|---|---|---|
| 104 | `.browsepage.parked` re-declares `top: 0` | caught (1) | `PARKBOXEQUAL` (Invariant P, reused) |
| 105 | `.browsepage.parked` drops `overflow: hidden` | caught (1) | `PARKBOXEQUAL` |
| 106 | the parked transform is marked `!important` | caught (1) | `PARKLOSESTRANSFORM` |
| 126 | **PARKM1** — the park offset restored to the shipped defect, `-101vw` | caught (2) | the strict-inequality cell **and** the shipped-form cell — the defect this suite was authored against, now a registered regression guard |
| 127 | **PARKM2** — `-250vw`: clears the floor, not the shipped form | caught (**1**) | the shipped-form cell **alone**. Proves the two arithmetic assertions are independently reachable — the inequality can be green on a value the shipped-form cell still rejects |
| 128 | **PARKM3** — `#browse { max-width: 250vw }` | caught (**1**) | the max-width bar **alone**. The floor did NOT move — the plan's F10 reclassification proven by execution rather than argued |
| 129 | **PARKM3P** — `#browse` gains `width: 200vw` (additive) | caught (**1**) | the no-`width` bar **alone** |
| 130 | **PARKM4** — `#browse` gains `min-width: 200vw` (additive) | caught (**1**) | the no-`min-width` bar **alone**. Note the correction: an earlier prediction here said it would redden the strict-inequality cell too. It does not — `derivedFloorVw()` never reads `min-width`, so the floor stays 200. Execution corrected a prediction that reading had got wrong, which is the whole reason for the ordering |
| 131 | **PARKDRAG** — the drag clamp removed | caught (**1**) | `DRAGREACHBOUNDED` **alone** |
| 132 | **PARKNOHOME** — the home branch also calls `Browse.render(dest)` | caught (2) | `NOPARKONHOME` — plus `LANDEDPAGESHOWS`, a pre-existing cell the mutant legitimately disturbs (it creates a third page keyed `home` and changes which page is shown) |
| 133 | **PARKPAD** — `#browse` gains `padding-left: 16px` (additive) | caught (2) | the no-`padding`/`border` bar — plus `PAGEISVIEW`, which independently pins that `#browse` carries none of the retired scroller's padding. **The audit predicted this one would kill alone; execution says two.** Not a mis-attribution — the named bar reddened — but a prediction corrected by running it |
| 134 | **PARKINSET** — `#browse`'s `right: 0` becomes `right: -400px` | caught (**1**) | the centring cell **alone** |

**The plan's m2 was registered and EXECUTED before the skips were applied, and its result is worth
keeping even though the mutant is now withdrawn (§6).** With both arithmetic cells live, m2
(`-250vw`) was `caught (1 failing)`, killed by the **shipped-form** cell **alone**, and it flipped
the **strict-inequality** cell GREEN (250 > 200). That is a stronger witness than its post-build
form: it proves both arithmetic assertions are independently reachable — the inequality *can* be
green, and shipped-form reddens on a value that passes the arithmetic. It is withdrawn only
because its single killer is now skipped, which was **confirmed by re-running the sweep** (`#126
UNCAUGHT`), not concluded by reading.

**Both `width` and `min-width` mutants are ADDITIVE** — they keep `max-width: 640px` in place. The
plan's F13 records why: specified as replacements they delete the declaration their own
justifications appeal to, trip the cell's anti-vacuity check instead of the assertion they witness,
and the sweep cannot see the difference because both texts kill the cell either way.

**The NOPARKONHOME mutant is a string change, never `if (false)`** — `npm test` runs
`test/lint.test.js` and a constant condition would redden the LINT cell, mis-attributing the kill.
Verified: no lint cell appears among #131's killers.

**No `*.mutbak` remains anywhere in the tree**, and `git diff -- css js` is empty: the sweep
restored cleanly and no production file was touched by this work.

## 5. Findings (five, all measured)

F-A to F-C are from authoring; F-D and F-E are from the coverage audit's remediation.

**F-A — the mutant this plan's I10 needed was reachable, and that was settled by execution before
the cell existed.** Three earlier candidates were provably equivalent (plan F9, F12). Before writing
NOPARKONHOME, its mutant (now #132) was applied and a throwaway probe drove a real `browse→home` gesture: at
HEAD no page is parked at any sample; under the mutant both cached pages carry `.parked` from the
first live move through mid-drag, and a third page keyed `home` is created. **This also produced
the cell's design**: the after-finalize sample is clean under BOTH, so a cell sampling only there
would have been the fourth equivalent witness. Reading would not have found that.

**F-B — the widened parse scope produced two false positives, both real defects in the cell, both
found by running it.** (1) jsdom THROWS on vendor pseudo-elements, and the fail-closed catch then
counted `.np-seek::-moz-range-thumb { width: 13px }` as a rule widening the browse host.
(2) Stripping the pseudo-element and matching the remainder was worse: `#browse::-webkit-scrollbar
{ width: 0 }` then matched `#browse` and its scrollbar's width read as `#browse`'s own. The correct
rule is to EXCLUDE a part whose subject compound carries a pseudo-element — such a rule styles a
generated box and can never change the originating element's border box. Both are recorded in the
cell's own comment, because the next person widening a parse scope will meet them again.

**F-C — the plan's ordering is not fully satisfiable, and the unsatisfiable part is named in §6
rather than worked around.** The plan requires every named mutant registered and executed before
its cell counts as coverage, with the test author running before the builder. **Two of the seven
mutants cannot be caught yet, because the cells they target are the red-first ones and a red-first
cell lands behind a skip** — and a skipped test cannot be a killer. m1 is additionally a literal
no-op at HEAD, which the anchors gate refuses.

This is a structural consequence of mutation-verifying a red-first cell against the very constant
the cell is about, not a defect in the plan's reasoning. But it means **"all five PARKOUTOFREACH
mutants executed" cannot be true at this point in the sequence**, and recording otherwise would be
exactly what §11 exists to prevent. The plan's own precedent agrees: the Stage-2 red suite
(`be7da1c`) specified 24 mutants rather than registering them for the same class of reason.

**And the discovery itself was made by execution, not by reasoning.** m2 was registered, swept, and
measured as `caught (1 failing)` with both arithmetic cells live. Only when the skips were applied —
which the pre-commit hook forced, since it runs the full suite and blocks a red tree — did the
sweep report `#126 UNCAUGHT`. Had the skip been applied without re-running the sweep, a registered
mutant witnessing nothing would have shipped, with its earlier green result on record as evidence.
That is the plan's own scar shape one level out: **a mutation result stops being true when the
suite around it changes, so the sweep is re-run after any change to the cells, not only after a
change to the source.**

**F-D — two of the five structural bars were labelled `GATE` with nothing behind them, and that was
worse than it reads.** The coverage audit's M1/M2. A `GATE` label is a claim that a mutant defends
the cell; for the no-`padding`/`border` and the centring bars, none did. The sharpening is what
makes it a gap rather than tidiness: because `edgeVw` is 100 for every admissible box, the derived
floor is **invariant at 200vw**, so a widened `#browse` is detected *entirely* by the bars — and one
of the two undefended bars, the centring one, guards **the only admissible edit that genuinely
breaks `L + W ≤ 100vw`**: a negative inset. With `right: -400px` at V = 375 the used
`W = min(640, 775) = 640`, `L = 67.5`, `L + W = 707.5px = 188vw`, and the arithmetic cell cannot see
it because `derivedFloorVw()` never reads `left` or `right`. Both bars now have additive, executed
mutants (#133, #134). **The code review did not find the centring one** — it took a sweep of the
coverage model against the mutation registry.

**F-E — the oracle recorded the value it was testing and never asserted it, and an instrument that
records without asserting is the defect this whole campaign is about.** Found by the audit RUNNING
the script — the first time anyone but its author had. Two ways for it to report PASS while
measuring something other than the shipped rule under a live gesture: a stale shell cache serving a
different stylesheet, and a stuck `nav-in-*` animation pinning every rect it reads. Both are now
failure paths, and **all nine were driven and observed to fire** rather than merely written (§3).
The general form is worth keeping: *a field in a verdict object that no failure path reads is
decoration, and decoration in an instrument is indistinguishable from a guarantee.*

## 6. The build's owed items — DISCHARGED, and what the sequence proved

All five obligations this section carried before the build are closed. Recorded because the *reason*
they existed is reusable, not because the checklist is:

- **m1 (`-300vw` → `-101vw`) and m2 (→ `-250vw`) are registered** at `tools/mutate.mjs` 126 and 127,
  and both are executed (§4). Neither could exist before the build: they target the arithmetic
  cells, which were red and therefore behind `SKIP-PENDING-BUILD`, and **a skipped test cannot be a
  killer**. m1 was additionally a literal no-op at HEAD, which the anchors gate refuses outright —
  *because at HEAD the source WAS m1*.
- **Five anchors now embed the constant, not three** (S2-6, S2-7, S2-8 migrated, plus m1 and m2).
- **Both skips were removed before the constant changed**, each cell driven red, then made green.

**The reusable lesson, which cost a withdrawn mutant to learn.** m2 was registered and executed
*before* the skips were applied and reported `caught (1 failing)`. Applying the skips silently made
it UNCAUGHT — discovered by re-running the sweep, not by reasoning about it. Had the earlier green
result been trusted, a mutant witnessing nothing would have shipped with evidence on record. **A
mutation result stops being true when the suite around it changes, so the sweep is re-run after any
change to the CELLS, not only after a change to the source.** The coverage audit re-checked exactly
this across the fix commit and found attribution intact; this pass re-checks it again across the
audit remediation (§4).

## 7. Handoff

**Source artifact:** `Claude/Plans/PLAN-parked-page-rides-home.md` (RATIFIED), struck HELD_STONE.

**Status:** the suite is green and every cell is mutation-witnessed. `npm test` = **823 tests, 822
pass, 0 fail, 1 skipped** (the skip is pre-existing and unrelated); park family re-swept at the
final state — **swept 12: 0 uncaught, 0 unapplied, 0 stale flags** (§4).

**The red-first evidence, preserved because it is the proof these cells can fail.** Before the
build, with the two `SKIP-PENDING-BUILD` skips removed, the suite failed exactly here and nowhere
else:

```
not ok 344 - PARKOUTOFREACH — the park offset STRICTLY exceeds the floor derived from #browse's own box
    .browsepage.parked { transform: translateX(-101vw) } — 101vw does not strictly exceed 200vw
not ok 345 - PARKOUTOFREACH — the park offset is the bench-measured shipped form, not merely a value that clears the floor
    .browsepage.parked { transform: translateX(-101vw) } — want translateX(-300vw)
# tests 823 / pass 820 / fail 2
```

Both failures named the shipped constant and the derived floor — 200vw, computed from `#browse`'s
own box rather than typed in. Nothing failed on a parse error, an absent rule, or a mis-stated
assertion. That redness is now carried forward as mutant **#126 (PARKM1)**, so the same two cells
are defended by a registered guard rather than by this quotation.

**Decisions made:** eight named tests instead of one cell, so mutant attribution is per-assertion
(§3). Structural bars held at suite level rather than inside the arithmetic (§3). Parse scope by
real selector matching rather than by rule-name text (§3). Both integration cells green-at-HEAD
gates rather than red cells, matching this project's established `MOVERHASBOX` /
`PARKLOSESTRANSFORM` shape.

**Open questions:** none for the test author. The plan's R1 (is this the whole of the reported
garbage) and R2 (cover retention at the new distance) remain **DEVICE-owed**, and the coverage audit
confirmed that no record, cell or comment over-claims either.

**What stands between this change and "fixed": the device gate, and nothing in the suite.** Plan §8
device item 1 (the user's exact repro shows no garbage over Home) and item 2 (cover retention across
an aborted `browse→browse` at the new distance). Bench evidence is complete — the oracle has been
executed at 375, 640 and 1000 px with the instrument proven able to fire first — and is filed as
bench evidence, not as the gate.

**One standing obligation for whoever runs the oracle next:** run `await PARKORACLE.preflight()`
first. It is not a courtesy step — `run()` and `report()` now FAIL without it, because a stale shell
cache can serve a stylesheet that is not the one the tree ships, and the mirror of that produces a
silent PASS (§3, §5 F-E).

**Records updated:** this artifact; `Claude/Zelda/Board.md`.
