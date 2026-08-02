# POIROT — the parked-page park-distance fix (`.browsepage.parked` `-101vw` → `-300vw`)

Type: code-review
Prior-review: POIROT-swipe-declone-stage2-e1db674.md
Target: `b358f73` (build `2026-08-02.304`), covering `1c0b62a` (the build), `e11ecf3` (the F4 scrub) and `b358f73` (records).
Range: 9cfd621..b358f73
Plan of record: `Claude/Plans/PLAN-parked-page-rides-home.md` (VERDICT: RATIFIED, three rounds of temper).
Adversary: `Claude/Loki/parked-page-rides-home-strike-2026-08-02.md` — HELD_STONE.
Test design: `Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md`. Build log: `Claude/Brunel/BUILD-parked-page-rides-home-2026-08-02.md`.
Tree: clean before and after every command below.

`Verdict: PASS — fix-then-ship.` The product change is correct, complete against the plan, and
proven by execution: the one declaration is the ratified value, the rule's comment states both
things the plan mandates and neither of the two it barred, Invariant P and `overflow: hidden` are
byte-identical and still mutation-defended, and all ten park-family mutants — the seven the plan
names plus the three migrated anchors — were re-swept in the foreground **this pass** and every one
is caught, each by the cell it names. **Nothing found changes a rendered pixel.** What is required
before this closes is a scrub: six statements in HEAD are false as written, and four of the six were
made false by this build's own 25 inserted lines. None of them blocks the device gate.

---

## The scene, and what it intends

A `.browsepage` is `position: absolute; inset: 0` inside `#browse`, so its park transform resolves
in `#browse`'s coordinate space rather than the viewport's. `#browse` is the INCOMING mover on
`home→browse`, sitting at `translateX(w + t)`, so a park of `-1.01w` composed to `homeX − 0.01w` and
the parked page rode on Home for the whole forward gesture — measured at Δ = −4px, 7/7 touchmove
samples, in a real Blink engine.

The change moves the offset past anything `#browse` can reach: `max |displacement| (100vw) + (L + W)
(≤100vw) = 200vw`, strict, and `-300vw` is that floor plus a viewport of margin and the exact form
the measurement's after-run executed. One declaration, no JavaScript. Around it: the rule's comment
gains the distance law, three mutation anchors migrate off the old literal, two mutants that were
un-registrable while their cells were skipped are registered, two records quoting the old constant
are corrected, and the build number advances.

The shape matches the plan exactly. Scope did not creep: `git diff 9cfd621 b358f73` touches eleven
files and the only production byte that changed outside the build stamp is the `translateX` value.

## The history

`git log e1db674..9cfd621` is the useful part of the night before, and it is not decoration. The
Stage 2 de-clone was reverted twice on a device-gate failure (`0474185`, `e787d12`) and re-landed
when the diagnosis proved false (`af16852`) — which is why this plan was tempered three times and
struck once before a single byte moved. Three of its four review rounds found a *named mutant that
could not redden its cell*. The plan's answer was to make execution the gate rather than reading,
and the test author's answer was to split PARKOUTOFREACH into eight separately-named tests so the
sweep's own `killed by:` line is the per-assertion attribution the plan records the gate cannot
otherwise reach. Both answers hold up under execution; see the ledger.

## The investigation

**The declaration.** `css/app.css:143-146`. `transform: translateX(-300vw);` and
`overflow: hidden; pointer-events: none; z-index: 0;` byte-identical to HEAD's. No `position`, no
inset, no `!important`, no `width`/`max-width`/`margin`. Invariant P intact, read at source.
Mutants #104 (re-declare `top: 0`) and #105 (drop `overflow: hidden`) both still kill PARKBOXEQUAL,
and #106 (mark the transform `!important`) still kills PARKLOSESTRANSFORM — executed this pass after
the anchor migration, which is the check the anchors gate alone does not make (`mutation-anchors`
proves the `from` string still matches; it does not prove the mutant still bites).

**The two prohibitions.** The comment (`css/app.css:131-138`) says a parked page "cannot be composed
onto the viewport BY THE PARK OFFSET" and names the `browse→browse` outgoing mover as overlapping by
design under its own inline transform — which is exactly the distinction the adversary executed in
run C3 (parked mover on-viewport at right +70, correctly non-class-governed). And it exempts the
outgoing-side pair on I10 — "a gesture's own destination render parks no page on them at all" — in
the *scoped* form F11 narrowed it to, explicitly disclaiming the arithmetic ("not because they are
arithmetically out of reach"). Both bars are respected. It also carries the constant-viewport
precondition, which the plan required and which the adversary quantified at 62px of re-entry.

**Where the comment goes wrong is its provenance, not its content.** The build inserted 25 lines into
`css/app.css` above the `#browse` rule. `git show 9cfd621:css/app.css | sed -n '220,232p'` puts
`#browse` at 224-229 before the change; it is at 249-254 after it, and the keyframes the same
derivation depends on moved 241-244 → 266-269. The comment the build wrote cites `css:224-229` for
the floor's second term — lines that are now inside `#home`'s rule body. A reader following the
mandated source line for `L + W` lands on `#home`, the one rule in this file whose identical
`-101vw` is viewport-relative and correct. That is the exact confusion the whole plan exists to
dispel, and the same commit demonstrably knew the class: `e11ecf3` corrected the Linnaeus probe's
stale `css:91-96` to `css:143-146`.

**The tests.** Eight named cells in `test/parked-page-rides-home-css.test.js`, two in
`test/parked-page-rides-home-browse.test.js`. Each load-bearing one witnesses what it claims, and I
did not take that from the build log — the sweep's attribution is quoted in the ledger. The two
adversary lesser planes aimed at this cell are closed in the built form: the parse descends into
conditional at-rules and scans *every* contributing rule via a real selector engine (lesser plane 1),
and the shipped CSS comment does not inherit the "only ancestor" statement that omitted `#library`
(lesser plane 2). Anti-vacuity is real in both files — the fixture-sanity cell fails loudly on a
parse miss, DRAGREACHBOUNDED asserts a non-zero displacement and one sample from each of the three
writers, and NOPARKONHOME carries a companion cell proving the parked observable is live in the same
fixture on a `browse→browse` gesture.

**The scrub call.** The builder left seven other `-101vw` hits alone as still true. I checked each:
`css/app.css:186` and `js/app.js:527` and `test/swipe-declone-stage1.test.js:134` are all
`#home.parked`, which is `position: fixed` and correctly unaffected; the three `Claude/` probe files
are historical instruments; `tools/mutate.mjs:1283` is PARKM1's deliberate restore. **That call is
correct.** What the sweep missed is the *live* material inside the plan's own red suite — see F3.

## Coverage Ledger — Phase 4b

Mark grammar: `✓` cleared by a command run **this pass**, cited below; `~` cleared by reading;
`n/a` not applicable; otherwise the finding.

Commands run this pass (tree verified clean by `git status --porcelain` before and after each):

1. `git diff 9cfd621 b358f73` (+ `--stat`) — the composite diff, read in full.
2. `node --test "test/*.test.js"` → `# tests 823 # pass 822 # fail 0 # skipped 1`.
3. `node tools/mutation-sweep.mjs 126 127 128 129 130 131 132` → `swept 7: 0 uncaught, 0 unapplied, 0 stale flags`, with a `killed by:` line per mutant.
4. `node tools/mutation-sweep.mjs 104 105 106` → `swept 3: 0 uncaught, 0 unapplied, 0 stale flags`.
5. `find . -name "*.mutbak" -not -path "./node_modules/*" -not -path "./.claude/*"` → empty, after each sweep.
6. `node -e "import('./tools/mutate.mjs')…"` — enumerated MUTATIONS[124..132]; 126–132 are PARKM1/M2/M3/M3P/M4/PARKDRAG/PARKNOHOME as claimed; total 133.
7. `git show 9cfd621:css/app.css | sed -n '220,232p'` — `#browse` at 224-229 pre-change.
8. `grep -rn "101vw" --include=*.{js,mjs,css,html}` (node_modules/.claude/android excluded) — 18 hits, each classified.
9. `grep -rn "css:224-229|css:119|css:143-146|css:95-99" …` — the citation sweep.
10. `grep -rn "resize|orientationchange" js/` and `grep -o '"resize"|orientationchange' js/vendor/eruda.js | sort | uniq -c` → 7 + 1 in the vendored console; none in first-party `js/`.
11. `grep -n "SKIP_FLOOR|SKIP_FORM" test/parked-page-rides-home-css.test.js` — declared at 382/385, referenced nowhere.
12. `git log e1db674..b358f73`, `git show --stat 9cfd621`, `git show 9cfd621 -- tools/mutate.mjs`.

| # | Changed symbol / region | Correctness vs plan | Invariant P | `overflow:hidden` | Absolute claims | Citations | Mutation coverage | Dead code | Records lifecycle | Test-witness | Device-claim hygiene |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `css/app.css:144` — the `translateX` value | ✓ (2,3) | ~ (read; no position/inset/`!important`) | ✓ (4, #105) | n/a | n/a | ✓ (3, #126/#127) | n/a | ~ | ✓ (3) | n/a |
| 2 | `css/app.css:119-142` — PARK-DISTANCE LAW comment | ~ (all four mandated items present; both bars respected) | ~ | ~ | **F8** | **F1** | n/a | n/a | **F1** | n/a | ~ clean |
| 3 | `css/app.css:145` — the other three declarations | ✓ (4, #104/#105) | ~ byte-identical | ✓ (4, #105) | n/a | n/a | ✓ (4) | n/a | n/a | ✓ (4) | n/a |
| 4 | `tools/mutate.mjs` S2-6 anchor | ✓ (4) | n/a | ✓ (4) | ~ | ~ | ✓ (4, #104) | n/a | ~ | ✓ (4) | n/a |
| 5 | `tools/mutate.mjs` S2-7 anchor | ✓ (4) | n/a | ✓ (4, kills on drop) | ~ | ~ | ✓ (4, #105) | n/a | ~ | ✓ (4) | n/a |
| 6 | `tools/mutate.mjs` S2-8 anchor | ✓ (4) | ✓ (4, `!important` kills) | n/a | ~ | ~ | ✓ (4, #106) | n/a | ~ | ✓ (4) | n/a |
| 7 | `tools/mutate.mjs` PARKM1 (new, #126) | ✓ (3, 2 failing) | n/a | n/a | ~ name true | ~ | ✓ (3) | n/a | ~ | ✓ (3) | n/a |
| 8 | `tools/mutate.mjs` PARKM2 (new, #127) | ✓ (3, 1 failing) | n/a | n/a | ~ name true | ~ | ✓ (3) | n/a | ~ | ✓ (3) | n/a |
| 9 | `tools/mutate.mjs` — the rewritten de-registration comment | ✓ (3, both now registrable) | n/a | n/a | ~ | ~ | ✓ (3, 6) | ~ old text deleted, not retained | ~ | ✓ (3) | n/a |
| 10 | `tools/mutate.mjs` PARKM3/M3P/M4 (unchanged, #128-130) | ✓ (3) | n/a | n/a | **F7** | ~ | ✓ (3, one cell each) | n/a | ~ | ✓ (3) | n/a |
| 11 | `test/…-css.test.js:404` — `{skip: SKIP_FLOOR}` removed | ✓ (2, cell live; 3, #126) | n/a | n/a | ~ | **F2** | ✓ (3) | **F4** | ~ | ✓ (3) | n/a |
| 12 | `test/…-css.test.js:428` — `{skip: SKIP_FORM}` removed | ✓ (2; 3, #126/#127) | n/a | n/a | **F3** | **F3** | ✓ (3) | **F4** | **F3** | ✓ (3) | n/a |
| 13 | `test/swipe-declone-stage2-css.test.js:301` scrub | ✓ comment only; assertion at `:304` untouched (1) | ✓ (4, #106) | n/a | ~ | ~ | ✓ (4) | n/a | ~ | ✓ (4) | n/a |
| 14 | `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60` scrub | ✓ value + `css:143-146` both correct (1, 9) | n/a | n/a | ~ | ✓ (9) | n/a | n/a | ~ | n/a | n/a |
| 15 | `build.json` / `sw.js` / `js/debug.js` / `index.html` stamp | ✓ (2, `build.test.js` lockstep) | n/a | n/a | ~ | ~ | n/a | ~ | ✓ (2, no `.303` left, 8) | ✓ (2) | n/a |
| 16 | `Claude/Brunel/BUILD-…md` (new) | ~ matches what I executed | n/a | n/a | ~ its §4 table matches (3) | ~ | ~ | n/a | ~ | n/a | ~ clean — states R1/R2 device-owed |
| 17 | `Claude/Zelda/Board.md` row | ~ matches (3) | n/a | n/a | ~ | ~ | ~ | n/a | **F5**, **F6** (absent siblings) | n/a | ~ clean — "Device gate (R1, R2) remains owed" |
| 18 | Cells not in the diff but in the change's scope (`test/…-browse.test.js`, the padding/border cell) | ✓ (3, #131/#132) | n/a | n/a | ~ | ~ | **F9** | n/a | ~ | ✓ (3) | ~ |
| 19 | The plan's required-evidence set as a whole | ~ | ~ | ~ | ~ | ~ | ✓ (3, 4) | n/a | ~ | ~ | **F10** |

No cell is empty. Every `✓` names the command that filled it.

## Findings

| # | Severity | Finding |
|---|---|---|
| F1 | Minor (required) | `css/app.css:125` — the mandated provenance for the floor's second term cites `css:224-229`, which this same build moved to 249-254 by inserting 25 lines above it. Those line numbers now land inside `#home` / `body.has-player #home`. The `navIn*` keyframes the same derivation enumerates also moved (241-244 → 266-269) and are not cited in the comment at all. |
| F2 | Minor (required) | `test/parked-page-rides-home-css.test.js:331` — the centring cell's failure message carries the same `(css:224-229)`, correct when authored at `9cfd621`, invalidated by this build's own insertion. |
| F3 | Minor (required) | `test/parked-page-rides-home-css.test.js:411` and `:432` — the two now-green arithmetic cells still print `RED @HEAD: the park is translateX(-101vw) (css:119)` and `RED @HEAD: the shipped park is -101vw` as their **live failure diagnostics**. Both are false at HEAD, and `css:119` now points at the comment. The builder's sibling sweep classified these as "the red suite's own historical RED @HEAD narrative (already correct)" — the file's header block (`:6`, `:35-36`) and the skip constants are narrative; a failure message is not, it is what the next regression prints. |
| F4 | Minor (required) | `test/parked-page-rides-home-css.test.js:382` and `:385` — `SKIP_FLOOR` and `SKIP_FORM` are unreferenced after the skip removal (grep 11). Dead constants whose text still asserts the cells are pending the build (EC §17; standards §6.6). |
| F5 | Minor (required) | `Claude/Decisions/DecisionLog.md:1242-1246` still reads "`css/app.css` is still untouched" and "Not yet built", and cites `css/app.css:228/241-244` for the floor's terms — all three false at HEAD. The plan §11's on-approval record list names "a decision entry in `Claude/Decisions/DecisionLog.md`"; the log's last entry is the ratification, and no build entry was appended. |
| F6 | Minor (required) | `Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md` is untouched. Plan §11 required it be "annotated as realized by this plan", answering its four open items as (1) §4 + device gate item 2, (2) §5, (3) §6 I1, (4) R1 still open. In particular item 3 — "confirming Invariant P is the planner's and reviewer's job" — is now confirmed and mutation-gated, and the record still reads as open. |
| F7 | Observation | `tools/mutate.mjs:1329` — PARKM4's registered name claims "`-> PARKOUTOFREACH no-min-width cell; post-fix also the strict-inequality cell`". Executed at post-build HEAD: `#130 caught (1 failing)`, killed by the no-min-width cell **alone**. `derivedFloorVw()` (`test/…-css.test.js:395-401`) computes the floor from `max-width` only and never reads `min-width`, so the inequality cell stays green. Authored at `9cfd621`, but the clause is a claim about the post-fix state *this* build creates, and the build log's own §4 table recorded the true result (1 failing, no-min-width alone) without correcting the string. |
| F8 | Observation | `css/app.css:140-141` — "nothing in js/ listens for resize or orientationchange". `js/vendor/eruda.js` carries seven `"resize"` listeners and one `orientationchange` (grep 10). The plan's verified form was "first-party `js/`", and the load-bearing content (nothing revises `d.w`, nothing cancels a gesture) is true — but as written this is an absolute claim in a comment that one grep falsifies, and the comment is the standing record of the law's precondition. |
| F9 | Observation | `test/parked-page-rides-home-css.test.js:351` — the no-`padding`/no-`border` precondition is listed in the file's own header table as a `GATE` with no mutation named, and no mutant in `tools/mutate.mjs` reddens it. EC §4.10. Base-commit content; routes to the coverage auditor rather than to this build. |
| F10 | Observation | Plan §11's required-evidence list includes "the real-engine oracle run at all three viewport widths with its in-script non-degeneracy assertions active". `Claude/Curie/parked-page-rides-home-oracle.probe.js` exists; no run is recorded in the build log, the board, or anywhere in HEAD. **Nothing claims it ran** — the hygiene is clean; it is simply owed, alongside the two device-gate items. |

**Disposition note.** F1–F6 are each a false statement standing in HEAD, and the standards make the
scrub exhaustive on the first pass (§6.6) — that is why they are *required* rather than optional,
not because any is severe. None of them touches the CSS declaration, any assertion, or any mutant
anchor, so the whole set can be applied in one pass without re-running the sweep for correctness
(re-run it anyway: `tools/mutate.mjs` anchors are text-matched and F7's fix edits that file).

## The prediction

The floor is now a law with both terms pinned by executing cells, and the adversary broke it in
exactly one place — the precondition the plan wrote on the label. So the next failure in this area
will not be the arithmetic. It will be the *provenance*: this build has already produced three stale
`css:` citations by moving the file 25 lines, and the derivation's whole defence against rot is a
reader being able to follow those citations to the rule they name. Leave them and the next person who
needs to re-derive `L + W` reads `#home`'s box — a rule with a `max-width: 640px`, an auto margin,
*and* a `padding-left/right: 16px` that `#browse` deliberately does not have. They will conclude the
padding bar is violated, or that the floor has a term nobody accounted for, and the cheapest way out
of that confusion is to distrust the cell. A citation is load-bearing here in a way it usually is
not, because the plan made "both terms and their source lines" mandatory comment content precisely so
the floor could not become a magic number again.

The second prediction is smaller and more certain: `SKIP_FLOOR` / `SKIP_FORM` will be read as live.
They are two well-written sentences saying the arithmetic cells are pending a build that has landed,
sitting eighteen lines above the cells they no longer gate. This project's named scar is a gate that
greens a dirty tree; a dead skip constant is the same shape read from the other end.

---

## Watch-list

Carried from `POIROT-swipe-declone-stage2-e1db674.md`. This build is one CSS declaration plus records
and touches none of the swipe-subsystem items; they carry forward unchanged unless a status is given.

- **[W1] [W4] [W7] [W11] [W13] [W16] [W18] open** — apply-on-approval records for stages 6b–6h un-applied in HEAD. Owner Zelda.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device.
- **[W5] open** — Loki r2 lesser-planes (`recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` → Brunel).
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat.
- **[W8] open** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda.
- **[W9] open** — Loki 6e residual 2: unguarded `.nav-ghost === owned-pane(live session)` invariant.
- **[W10] open** — `disposeOwnedPanes`/`dropPanes` byte-identical removers, both now no-ops; step-11 items.
- **[W12] open** — 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Owner Mendeleev.
- **[W14] open** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device.
- **[W21] open** — a fresh Loki strike against the BUILT 6i code. Owner Loki.
- **[W22] [W23] [W24] [W25] open** — 6i `#home` device gates R1(a)-(e). Owner on-device.
- **[W26] open** — 6i apply-on-approval records (plan §13 amendments/annotations). Owner Zelda.
- **[W28-residual] open** — ghost-era vocabulary throughout the settle path in `js/swipe.js` and `js/app.js`. Plan §13 step 14. Non-blocking.
- **[W29] open** — `plan.incoming` / `plan.outgoing` / `plan.renderDestination` production-unread, deliberate per plan §6 and exact-key-gated. Standing decision to re-confirm. Owner Vitruvius. Non-blocking.
- **[W30] [W31] [W32] [W33] open** — browse-decouple device gates R-flash / R-navbar / R-strip / R-browse2browse. Owner on-device.
- **[W34] open** — no `DecisionLog.md` NEW-POLICY entry for `PL-swipe-browse-fixed-ownscroll`. Owner Zelda. Non-blocking.
- **[W35] open** — build-log "Files changed" lists omit build-stamp files. **Fourth observation**: `Claude/Brunel/BUILD-parked-page-rides-home-2026-08-02.md` §8 *does* name them (`build.json` / `sw.js` / `js/debug.js` / `index.html`), so this build is the counterexample to the pattern rather than another instance. Owner Brunel/Zelda. Non-blocking.
- **[W36] noted** — Flash C (browse→browse in-list divider re-raster) out of scope.
- **[W38] open** — three shipped prose sites state the exclusivity universal plan §5.1 forbids (`css/app.css` ×2, `test/page-bg-single-painter.test.js` ×2). Untouched. Owner Brunel.
- **[W39] [W40] open** — A1b-scheduled mutant/comment rot (`#104`/`#106` in the *old* numbering, `NPUNTOUCHED`, `js/nav.js:71-72`). ⚠️ Note for whoever picks this up: two mutants were inserted at 126/127 this build and the array is now 133 long — re-derive the indices from the names, never from the numbers in that item.
- **[W41] open** — `showAppView`'s sweep is LIVE and must be KEPT; determination filed, not to be re-opened.
- **[W42] open** — plan §5.2's `.alphaindex` argument for A2 does not cover the browse↔settings gesture window. Owner Vitruvius.
- **[W43] open** — device-owed R-B / R-C / R-E / R-G, unclaimed by any cell. Owner on-device.
- **[W44] open** — `js/app.js:2523`, `:3030`, `:3123` call `applyScreen(d, {render:true})` for browse descriptors with no `gestureOwnsMovers` guard. **Sharpened again**: the plan's own R7 records this same class from the other end (a button nav parks pages inside the 340ms settle window), and the adversary executed it (runs C/C3) — at `-300vw` the parked pages sat at right −750 and −375, so the park fix *covers* the geometric half of it while the transform-clear half stays unguarded. Owner Brunel. Non-blocking.
- **[W45] RESOLVED: `test/browse-render-race.test.js:52-65` now drives a FILES descriptor** (read at HEAD this pass), so the late-fetch guard at `js/browse.js:571` has a cell that can fail. Applied at `e1208eb`.
- **[W46] open** — a same-key browse pair puts one node in both mover slots; `MOVERSDISTINCT` green on it because both fixtures use two different keys. Filed for the planner. Owner Vitruvius.
- **[W47] open** — `js/browse.js:192-193` and plan §5.3.6 name `home→browse` / `overlay→browse` as miss-branch transitions; they take the landed branch. Owner Brunel (comment) + Vitruvius (plan).
- **[W48] RESOLVED: no `abortRender` remains in `docs/transition-matrix.generated.txt` or `tools/gen-transition-matrix.mjs`** (grep, this pass). Applied at `e1208eb`.
- **[W49] open** — the three trigger-census citations in `Claude/Brunel/swipe-declone-stage2-build.md` §1 point at wrong lines; the census is the sole defence for W46. Owner Brunel.
- **[W50] open** — `tools/mutate.mjs`'s NOOP de-registration reason states `keepGhosts` guards a sweep "RETAINED for the NP pill float"; it guards the `.nav-ghost` sweep, and the pill sweep is unguarded. Non-blocking.
- **[W51] RESOLVED: the step-10a park-geometry probe was run** — `174a800` ("both step 10a halves read 0 on the shipped rule"), recorded in the plan's step table at `c87db87`. Note the outcome graduates into this plan's history: a step-10a reading of 0 on the *shipped rule at rest* is precisely the "sampled at rest, where the state is clean" blindness that let six hypotheses miss the defect this build fixes. **Durable lesson, routed here:** a park-geometry probe that samples only at rest cannot see a container-relative park, because the container is at rest too.
- **[W52] noted** — the `375e11f` uncaught-mutant class was swept and closed; not to be re-swept.

New this build:

- **[W53] open (NEW)** — **F1.** `css/app.css:125` cites `css:224-229` for `#browse`, which this build moved to 249-254; the `navIn*` keyframes moved 241-244 → 266-269 and are uncited. Owner Brunel, via the apply-review of this casebook.
- **[W54] open (NEW)** — **F2 + F3.** `test/parked-page-rides-home-css.test.js:331` (`css:224-229`), `:411` (`the park is translateX(-101vw)` / `css:119`) and `:432` (`the shipped park is -101vw`) are live text stating a HEAD that no longer exists. Owner Brunel.
- **[W55] open (NEW)** — **F4.** `SKIP_FLOOR` / `SKIP_FORM` dead at `test/parked-page-rides-home-css.test.js:382`, `:385`. Owner Brunel.
- **[W56] open (NEW)** — **F5 + F6.** Two of the plan §11 on-approval record items are unfilled: no `DecisionLog.md` build entry (and its ratification entry still says "not yet built" / "`css/app.css` is still untouched" at `:1242-1246`), and `Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md` is not annotated as realized. Owner Zelda.
- **[W57] open (NEW)** — **F7.** PARKM4's registered name (`tools/mutate.mjs:1329`) claims a post-fix kill of the strict-inequality cell that the sweep disproves. Owner Brunel/Curie.
- **[W58] open (NEW)** — **F8.** `css/app.css:140-141`'s "nothing in js/ listens for resize" is falsified by the vendored console; the plan's verified form was "first-party `js/`". Owner Brunel.
- **[W59] open (NEW)** — **F9.** The no-`padding`/no-`border` precondition cell is labelled a GATE with no registered mutant. Owner Mendeleev.
- **[W60] open (NEW)** — **F10.** The real-engine oracle (`Claude/Curie/parked-page-rides-home-oracle.probe.js`) has no recorded run at 375/640/1000px. Plan §11 required evidence. Owner the deriver / bench, before the device pass.
- **[W61] open (NEW)** — **the device gate, unclaimed and owed.** Plan §8 items 1 (the user's exact repro shows no garbage over Home on the forward drag) and 2 (cover retention across an aborted `browse→browse` at the new distance). Nothing in this build claims either — verified against the build log §8 and the board row. Owner on-device. **This, not any finding above, is what stands between this change and "fixed."**

---

Verdict: PASS — fix-then-ship. The one-declaration change is correct, complete and execution-proven;
ten park-family mutants re-swept clean this pass; six false statements in HEAD to scrub, none of
which blocks the device gate.
