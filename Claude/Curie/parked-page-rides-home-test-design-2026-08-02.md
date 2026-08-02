# Test design — PLAN-parked-page-rides-home.md · 2026-08-02

Type: test design (the red suite that gates the build)

Authored by the test author from `Claude/Plans/PLAN-parked-page-rides-home.md` (VERDICT: RATIFIED,
2026-08-02), at HEAD `04739c9`, after the adversary's strike
(`Claude/Loki/parked-page-rides-home-strike-2026-08-02.md`, VERDICT: HELD_STONE) and BEFORE the
one-declaration build. The working tree ships `translateX(-101vw)`; nothing in `css/` or `js/` is
touched by this work.

## Index

1. What was authored, and where it lives
2. The Coverage Model realized — every applicable dimension to a cell or a recorded absence
3. The cells, assertion by assertion
4. The mutants — registered, executed, and the measured result of each
5. Findings from authoring (three, all measured)
6. ⛔ OWED AT THE BUILD — two mutants that cannot exist until the constant changes
7. Handoff

## 1. What was authored, and where it lives

| Artifact | Path | State at HEAD |
|---|---|---|
| PARKOUTOFREACH (unit, CSS structural) | `test/parked-page-rides-home-css.test.js` | 6 tests GREEN, **2 tests RED, landed behind `SKIP-PENDING-BUILD`** |
| DRAGREACHBOUNDED + NOPARKONHOME (integration, real entry point) | `test/parked-page-rides-home-browse.test.js` | 3 tests GREEN (gates) |
| PARKCLEARSHOME (the real-engine oracle) | `Claude/Curie/parked-page-rides-home-oracle.probe.js` | standalone; deliberately outside `npm test` |
| Five mutants | `tools/mutate.mjs`, indices 126–130 | registered, anchors green, **all five executed, all caught** |
| Two mutants | — | **specified, not registered** — owed at the build (§6) |

**RED, and how it lands.** The two arithmetic assertions are RED at HEAD. They were RUN red before
any skip was applied — the exact failure output is in §7 — and are then committed behind
`{ skip: SKIP_* }`, which is this project's established red-first convention (the Stage-2 red
suite, commit `be7da1c`, landed the same way). The repo's pre-commit hook runs the full suite and
blocks a red tree, so this is the sanctioned route rather than `--no-verify`. **The builder removes
both skips FIRST, drives each red, and only then makes them green** — a skip lifted after the
constant has already changed proves nothing.

Baseline at HEAD as committed: `npm test` = **823 tests, 820 pass, 0 fail, 3 skipped** (the two
above plus one pre-existing). With the skips removed: **2 fail**, both PARKOUTOFREACH's arithmetic
assertions and nothing else.

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
| 2 | `#browse` is an auto-centred `left:0/right:0` box | GREEN | — |
| 3 | no rule contributing to `#browse` declares a `width` | GREEN | mutant **#127** |
| 4 | no rule contributing to `#browse` declares a `min-width` | GREEN | mutant **#128** |
| 5 | no rule contributing to `#browse` declares a `padding` or `border` | GREEN | — |
| 6 | `#browse`'s `max-width` is `px`, or `vw` ≤ 100 | GREEN | mutant **#126** |
| 7 | the park offset STRICTLY exceeds the derived floor | **RED** (skipped) | HEAD itself (= the plan's m1); owed: m1 (§6) |
| 8 | the park offset is the bench-measured shipped form | **RED** (skipped) | owed: m2 (§6), measured before the skip |

**The floor is derived, not typed twice.** Term 2 (`edgeVw`) is computed from `#browse`'s own
`left/right/margin/max-width` — `edgeVw = (100 + min(M, 100))/2`, which is 100 for every `M`
because `left:0; right:0` means `max-width` can only CAP the box. Term 1 (100vw) is not derivable
from CSS and is pinned independently by DRAGREACHBOUNDED. Measured floor at HEAD: **200vw**;
measured offset: **101vw**.

**The structural bars are preconditions, held at suite level rather than inside the arithmetic.**
Test 7 computes over the box and does not re-assert tests 2–6, so each mutant reddens exactly one
test. The refusal to certify an unboundable box is carried by tests 2–6 being required-green
members of the same suite: add `width: 200vw` to `#browse` and `npm test` fails. Same protection,
better attribution. This trade is stated here because it is a deliberate departure from the plan's
"preconditions of (i)" wording, not an omission.

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

## 4. The mutants — registered, executed, measured

`tools/mutate.mjs` 126–130. Run: `node tools/mutation-sweep.mjs 126 127 128 129 130`
→ **swept 5: 0 uncaught, 0 unapplied, 0 stale flags. Exit 0.**

With the two arithmetic cells behind their skips the baseline is fully green, so **every `killed by`
line below is a true delta** and needs no interpretation. Four of the five kill exactly ONE test,
and it is the one they are registered to witness — the per-assertion attribution the plan's F14
records the gate cannot otherwise reach.

| # | Mutant | Result | Killed by |
|---|---|---|---|
| 126 | `#browse { max-width: 250vw }` | caught (**1** failing) | `PARKOUTOFREACH — max-width is px, or vw ≤ 100` **alone**. The floor did NOT move — confirming by execution the plan's F10 reclassification that a >100vw cap is arithmetically inert. |
| 127 | `#browse` gains `width: 200vw` (**additive**) | caught (**1**) | `PARKOUTOFREACH — no rule … declares a width` **alone**. |
| 128 | `#browse` gains `min-width: 200vw` (**additive**) | caught (**1**) | `PARKOUTOFREACH — no rule … declares a min-width` **alone**. |
| 129 | the drag clamp `t = Math.max(-d.w, Math.min(d.w, t))` removed | caught (**1**) | `DRAGREACHBOUNDED` **alone**. |
| 130 | `renderDestination`'s home branch also calls `Browse.render(dest)` | caught (2) | `NOPARKONHOME` — plus `LANDEDPAGESHOWS`, a pre-existing cell the mutant legitimately disturbs (it creates a third page keyed `home` and changes which page is shown). |

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

## 5. Findings from authoring (three, all measured)

**F-A — the mutant this plan's I10 needed was reachable, and that was settled by execution before
the cell existed.** Three earlier candidates were provably equivalent (plan F9, F12). Before writing
NOPARKONHOME, its mutant (now #130) was applied and a throwaway probe drove a real `browse→home` gesture: at
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

## 6. ⛔ OWED AT THE BUILD — two mutants that cannot exist until the constant changes

**These are the builder's same-commit obligations, alongside the three anchor migrations the plan's
§7 already names.** The exact strings are written out so registration is mechanical.

**Why two mutants cannot exist yet.** Both target the arithmetic cells, which are red at HEAD and
therefore land behind `SKIP-PENDING-BUILD`. A skipped test cannot be a killer, so a registered
mutant aimed at one is UNCAUGHT and makes the sweep exit nonzero forever. This is the same shape as
the Stage-2 red suite (commit `be7da1c`), which specified 24 mutants rather than registering them
because their anchors targeted text the build had yet to create.

**(a) m1 — "restore `-101vw`". NOT REGISTRABLE AT HEAD, twice over.** It is a literal no-op at
HEAD, which `test/mutation-anchors.test.js`'s no-op gate refuses outright — *because at HEAD the
source IS m1*. Run the two arithmetic cells with their skips removed and they are red for exactly
the reason m1 predicts, with the output in §7. That is m1 executed, not m1 asserted. What is owed
after the build is its REGISTRATION, so that a later revert reddens:

```js
{ name: 'PARKM1 PARKOUTOFREACH: the park offset is restored to the shipped defect, -101vw '
    + '(-> PARKOUTOFREACH strict-inequality AND shipped-form cells)',
  file: 'css/app.css',
  from: ".browsepage.parked {\n  transform: translateX(-300vw);",
  to:   ".browsepage.parked {\n  transform: translateX(-101vw);" },
```

**(b) m2 — "clears the floor but is not the shipped form". REGISTER IT BACK.** It was registered and
executed at HEAD (§4) and withdrawn only because its one killer is now skipped. Post-build, both
arithmetic cells are live and it discriminates exactly as designed:

```js
{ name: 'PARKM2 PARKOUTOFREACH: the park offset becomes -250vw — clears the derived floor but is '
    + 'NOT the bench-measured shipped form (-> PARKOUTOFREACH shipped-form cell ALONE)',
  file: 'css/app.css',
  from: ".browsepage.parked {\n  transform: translateX(-300vw);",
  to:   ".browsepage.parked {\n  transform: translateX(-250vw);" },
```

**(c) THE THREE EXISTING ANCHORS (S2-6, S2-7, S2-8) still migrate**, as the plan's §7 requires.
With m1 and m2 added, **five registered anchors will embed the constant, not three.**
`test/mutation-anchors.test.js` is the gate that catches an omission and must be green before the
commit lands.

**(d) Remove the two `SKIP-PENDING-BUILD` skips FIRST, drive both cells red, and only then make
them green.** A skip lifted after the constant has already changed proves nothing about whether the
cell could ever fail.

**(e) Re-run `node tools/mutation-sweep.mjs` over the seven indices after the build.** Post-fix the
whole suite is green, so every killer line is a true delta. Expected: m1 reddens tests 7 AND 8;
m2 reddens 8 alone; the `min-width` mutant reddens 4 AND 7 (post-fix the floor really moves to 300
and the shipped 300 fails the strict inequality — the one mutant non-equivalent in layout as well
as in the precondition set).

## 7. Handoff

**Source artifact:** `Claude/Plans/PLAN-parked-page-rides-home.md` (RATIFIED), struck HELD_STONE.

**Status:** the red suite is filed and RED for the right reason. Exact failure output at HEAD, with
the two `SKIP-PENDING-BUILD` skips removed:

```
not ok 344 - PARKOUTOFREACH — the park offset STRICTLY exceeds the floor derived from #browse's own box
    .browsepage.parked { transform: translateX(-101vw) } — 101vw does not strictly exceed 200vw
not ok 345 - PARKOUTOFREACH — the park offset is the bench-measured shipped form, not merely a value that clears the floor
    .browsepage.parked { transform: translateX(-101vw) } — want translateX(-300vw)
# tests 823 / pass 820 / fail 2
```

Both failures name the shipped constant and the derived floor — 200vw, computed from `#browse`'s
own box rather than typed in. Nothing fails on a parse error, an absent rule, or a mis-stated
assertion. As committed (skips applied) the tree is green: 823 tests, 820 pass, 0 fail, 3 skipped.

**Decisions made:** eight named tests instead of one cell, so mutant attribution is per-assertion
(§3). Structural bars held at suite level rather than inside the arithmetic (§3). Parse scope by
real selector matching rather than by rule-name text (§3). Both integration cells green-at-HEAD
gates rather than red cells, matching this project's established `MOVERHASBOX` /
`PARKLOSESTRANSFORM` shape.

**Open questions:** none for the test author. The plan's R1 (is this the whole of the garbage) and
R2 (cover retention at the new distance) remain DEVICE-owed and downstream of the build.

**Next owner: the builder** — the one-declaration change (`-101vw` → `-300vw`), the CSS comment
(which must say composed **by the park offset**, never that the outgoing-side transitions are
arithmetically exempt), the three §7 anchor migrations **plus the two obligations in §6**, and the
two F4 scrub targets. **Then the coverage auditor**, on the suite this record describes. Then the
device gate.

**Required evidence before the build is called done:** these five tests green that are currently
red or newly registered; `test/mutation-anchors.test.js` green after the five-anchor migration;
`PARKBOXEQUAL` and `PARKLOSESTRANSFORM` still green; the sweep re-run per §6(c); the real-engine
oracle run at all three widths with `report()` passing; both device-gate items.

**Records updated:** this artifact; `Claude/Zelda/Board.md`.
