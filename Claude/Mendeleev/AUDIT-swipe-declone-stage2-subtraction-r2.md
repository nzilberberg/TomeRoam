# Coverage audit round 2 — declone Stage 2, step 11: the subtraction pass

Date: 2026-08-05
Artifact audited: the test suite at HEAD `d4ae127`, against `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md` §8 and §10.
Gate: publish (the suite is green — 884 tests, 883 pass, 0 fail, 1 skip, re-run at `d4ae127`).
Supersedes: `Claude/Mendeleev/AUDIT-swipe-declone-stage2-subtraction.md` (round 1, verdict `GAPS_NAMED`, at `318fc96`). This file carries the `-r2` suffix so `artifactsOfRecord` treats round 1 as superseded rather than as a second opinion; round 1 is not edited.
What changed under audit since round 1: `4357775` (a rejected verdict is never outvoted), `ebf6b4b` (the test author's fold closing round 1's F1/F2/F3), `d4ae127` (this pass gets its own campaign manifest).

verdict: **ADEQUATE** — all nine §10 cells are swept, and **all eighteen of §10's designated mutants are now registered and were each re-executed at this HEAD and observed CAUGHT by their designated cells**, together with the seventh registration `S2-39` that closed round 1's counterexample. Round 1's three test-author findings are closed and each closure was verified by execution rather than read. **One residual is named and is not a suite shortfall:** §10 `MOVERSHAPE`'s *behaviour* sentence claims more than §10's own *fixture* sentence commissions, and an executed counterexample ships an orphaned key uncaught at whole-suite scope through the one route a source assertion cannot reach — that over-claim is internal to the plan and routes to the planner, with a measured structural occupant stated at N1.

## 1. What was executed rather than read

Every status below is backed by running something. This campaign's record is that the blast-radius enumeration was incomplete **eight** times and every one was found by executing or measuring, never by a further reading — so the plan's list, the test author's list and round 1's own list were all treated as hypotheses. This audit found a ninth (N1) and it was again found by execution.

All runs were in the foreground with explicit indices re-derived by name against the now **152**-entry registry. `git status` was verified empty and `*.mutbak`-free after every run, and after the whole audit.

- Full suite at `d4ae127`: **884 / 883 pass / 0 fail / 1 skip** — three times (baseline, and either side of the probes).
- `node tools/source-gate-sweep.mjs` run directly, never imported: exit 0, `swept 4 source-gate mutations: 0 uncaught, 0 not-behaviour-neutral`, all four fingerprints RED with the behavioural control GREEN.
- Targeted mutation sweeps over **all eighteen §10-designated mutants plus `S2-39`**, in four foreground batches — `145 146 147 148 149 150 151`, `145 146 147 148`, `13 19 20 31 113`, `137 138 139 140 141 143 144` — every batch reporting `0 uncaught, 0 unapplied, 0 stale flags`.
- **Four hand-applied probes against `js/app.js`**, each through an applier that refuses a missing or non-unique anchor, each restored from a pristine backup with the tree verified clean afterwards: two against the new source scanner's comment blindness, one against the post-construction key route, one measuring a candidate structural fix.
- The campaign stage gate run against the new manifest `Claude/Campaigns/swipe-declone-stage2-subtraction.json`.

## 2. Curie's three corrections, each tested independently

The fold at `ebf6b4b` corrects three things round 1 or the plan stated. Each was re-derived here rather than accepted.

| Correction | Result under this audit's own execution |
|---|---|
| **The CRLF caveat does not apply to the registry.** Round 1 warned that a multi-line `from` must use `\r\n` because `js/nav.js` and `js/app.js` are CRLF. | **HOLDS, and round 1's caveat was true only of the applier round 1 used.** `resolveAnchor` (`tools/mutate.mjs:1770`) normalises `\r\n`→`\n` on the `from`, the CLI reads the pristine copy already normalised (`:1850`), and `test/mutation-anchors.test.js:33` normalises both sides. Confirmed by execution: the CRLF-targeted multi-line entry `S2-37` (`js/nav.js`) is written with `\n`, resolves, applies and is CAUGHT. Every anchor in the 152-entry registry matches at HEAD (the in-suite anchors gate is green). |
| **A killer COUNT is meaningless without its scope.** Round 1 measured `S2-38` at 3 failing and `S2-33` at 2, over two test files. | **HOLDS, measured.** Over the whole behaviour suite this audit measures `S2-38` at **42** failing and `S2-33` at **5** — Curie's numbers exactly. Neither set of numbers is wrong and a fresh sweep compared against round 1's would read as rot. The registrations now carry the scope, which is the repair. |
| **`#13`'s designated killers were FALSE, not missing.** Its old name cited I2/I20 pane cells that went with the panes. | **HOLDS, and it is the sharper form of round 1's F2.** Swept here: `#13 caught (1 failing)` — `RECOVERYPARITY.pillswept`, **and nothing else in the whole suite**. `#13` is §10 `RECOVERYPARITY`'s NATURAL-d, so the single-test kill is also the measurement that §10's decision to split the fourth assertion into its own named test delivered the per-cell attribution it was split for. |

## 3. Round 1's findings — each closure verified, not accepted

| R1 finding | Status | The execution that settles it |
|---|---|---|
| **F1** (Structural) — six of §10's eighteen mutants absent from the registry | **CLOSED** | Registered `S2-33`…`S2-38` at `#145`–`#150`. Swept here: `#145` caught 5 (`NOOWNEDPANE` + the four-test `NOGHOSTATALL` family), `#146` caught 1 (`NOOWNEDPANE` alone), `#147` caught 2 (`MOVERSHAPE` emitted-key-set + read-set), `#148` caught 16 (all three `MOVERSHAPE`, plus eslint and the transform readers — non-discriminating, disclosed), `#149` caught 1 (the `PILLSWEPT` **arity** test alone), `#150` caught 42 (all three `DESTROYEDMOVER` routes — non-discriminating, disclosed). Both non-discriminating entries name their unrelated channels in the registration, which is what makes "reddens for the right reason" checkable. |
| **F2** (Misleading) — `DESTROYEDMOVER` had no registration naming it | **CLOSED, and the enumeration was short by three** | Measured killer sets written into `#31` (7 failing, all three `DESTROYEDMOVER` routes), `#113` (2), `#20` (6, all three `RECOVERYPARITY` routes), `#19` (2, the `STALETOUCH` split witness), `#13` (1). Every one re-measured here and every number reproduced. |
| **F3** (Gap) — `MOVERSHAPE`'s key-set claim unproven, with an executed counterexample | **CLOSED for the route round 1 measured** | The counterexample is registered as `S2-39` (`#151`) and swept here: **caught, 1 failing — the emitted-key-set source test alone.** The repair is an addition: the cell is now three tests and each sees a class the others cannot. |

**The §10 mutant ledger, re-derived against §10 rather than incremented, and every entry re-executed at this HEAD.** A mutation result stops being true when the suite changes, and the suite changed twice since round 1, so round 1's results for the seven pre-existing entries were not carried forward — they were re-swept.

| Cell | §10 mutants | Registrations (indices re-derived by name) | Re-swept here |
|---|---|---|---|
| `NOGHOSTCLASS` | 1 | `S2-25` `#137` | caught 1 |
| `NOOWNEDPANE` | 2 | `S2-33` `#145`, `S2-34` `#146` | caught 5, caught 1 |
| `NOCLB` | 2 | `S2-26` `#138`, `S2-27` `#139` | caught 1, caught 1 |
| `MOVERSHAPE` | 2 (+1) | `S2-35` `#147`, `S2-36` `#148`, and `S2-39` `#151` beyond §10 | caught 2, caught 16, caught 1 |
| `RECOVERYPARITY` | 4 | `S2-31` `#143`, `#20`, `S2-32` `#144`, `#13` | caught 1, 6, 3, 1 |
| `DESTROYEDMOVER` | 3 | `S2-38` `#150`, `#113`, `#31` | caught 42, 2, 7 |
| `PILLSWEPT` | 2 | `S2-28` `#140`, `S2-37` `#149` | caught 2, caught 1 |
| `BORROWEDREALSURVIVES` | 1 | `S2-29` `#141` | caught 153 (non-discriminating, disclosed) |
| `STALETOUCH` | 1 | `#19` | caught 2 |

Eighteen designated, eighteen present, eighteen CAUGHT. Round 1's F1 enumeration of the six absentees is confirmed complete by this independent recount.

## 4. The matrix — every cell, with its round-2 status

| Cell | Status | Evidence at this HEAD |
|---|---|---|
| `NOGHOSTCLASS` | **SWEPT** | `S2-25` caught. Gate green over `js/` excluding the vendored bundle. |
| `NOOWNEDPANE` | **SWEPT — both mutants now registered** | `S2-33` and `S2-34` caught, with the second killed by the textual gate *alone*, which is the shape an inline-only reading misses and the reason the rule matches a literal rather than a call. |
| `NOCLB` | **SWEPT** | `S2-26`, `S2-27` caught. |
| `MOVERSHAPE` | **SWEPT — with a named residual (N1)** | Three tests, each with its own executed mutant: `S2-35` (both halves), `S2-36` (all three), `S2-39` (emitted-key-set alone). Round 1's bare half is closed. The residual is a route outside the fixture §10 commissions. |
| `RECOVERYPARITY` | **SWEPT** | All four mutants caught, and NATURAL-d's single-test kill confirms the split-out `.pillswept` witness carries its own attribution. |
| `DESTROYEDMOVER` | **SWEPT — now has a registration naming it** | `S2-38` is the first entry designating this cell; `#31` and `#113` now name it as a measured killer. |
| `PILLSWEPT` | **SWEPT** | `S2-28` caught; `S2-37` caught by the **arity** assertion alone while its sibling pill-removal test stays green — the measurement that makes the arity assertion load-bearing rather than a restatement. |
| `BORROWEDREALSURVIVES` | **SWEPT** | `S2-29` caught, non-discriminating and disclosed in its own registration. |
| `STALETOUCH` | **SWEPT** | `#19` caught, and the split-out witness appears by name in the `killed by:` list. |

**Nine cells swept, no bare cell.** The §4a co-change items and the §10 "no cell" table were resolved in round 1 by execution and nothing at `ebf6b4b` or `d4ae127` disturbs them; `js/` and `css/` were not touched by either commit.

## 5. Findings

### N1 — Gap. §10 `MOVERSHAPE`'s behaviour sentence over-claims against §10's own fixture sentence, and an orphaned key still ships uncaught. Owner: the planner.

§10's **behaviour** text is absolute: the production mover the adapter records on the session "carries exactly the element reference and the base offset and **no third key** so a dropped or an **orphaned key cannot ship silently**." §10's **fixture** text for the same row commissions something narrower: "assert over SOURCE that the adapter's mover-construction **expression** reads exactly the two seam fields it is entitled to and emits exactly the two production keys."

The suite realizes the fixture sentence completely. It cannot realize the behaviour sentence, and the gap between the two is measurable.

**Executed counterexample, whole-suite scope.** Leaving the `toMover` literal untouched, one existing line in `start()` is rewritten line-for-line so that the recorded movers gain a third key after construction:

```
      for (const m of d.movers) { if (m.base) m.el.style.transform = 'translateX(' + m.base + 'px)'; m.own = 'borrowed-real'; }
```

Result: **884 tests, 883 pass, 0 fail, 1 skip — UNCAUGHT.** The emitted-key-set test reads the literal and sees `{el, base}`; the read-set proxy sees no seam field read; nothing downstream reads the key, so no behavioural cell can see it. A field with no reader ships on every session mover, which is the precise class the pass exists to delete.

**Two neighbouring shapes were also executed, and their kills are borrowed rather than earned.** A version of the same defect that *inserts* a line reddens `test/swipe-model.test.js` ("the committed model is exactly what the generator produces"); a version that edits the `toMover` line itself reddens the anchors gate, because three registrations anchor on that exact text. Both are witnesses for *text having moved*, not for *a third key existing* — the line-neutral form above evades both, which is what makes them incidental rather than covering.

**Why the existing dead-field mechanism does not reach it.** `tools/dead-return-fields.mjs` detects exactly this class — a returned contract field no consumer reads — but is scoped to registered **seam returns**. The session mover is an internal object, not a seam return, so it is out of that tool's registry by construction.

**The test that fills it, with the occupant's properties measured rather than proposed.** The cell's position — dimension 7, a contract claim on a module-private object with no runtime observer, under §13 decision 20's ruling that no production observer may be added to serve a test — admits one cheap structural occupant, and it was measured here:

```
      const toMover = (m) => Object.freeze({ el: m.element, base: baseOf(m.slot) });
```

Measured at whole-suite scope: **no behavioural test reddens.** The only two failures are the anchors gate (three registrations anchor that exact line and would be re-anchored with the change) and the emitted-key-set test's own fixture-sanity assertion, which refuses because its anchor `const toMover = (m) => ({` no longer matches — the reader detecting rot, working as designed. So the change is behaviour-neutral to the suite and the test must be authored to accept the wrapped form.

⚠️ **Two properties the occupant must carry, both derived rather than assumed.** `js/app.js` is a non-strict IIFE (no `'use strict'`, plain `(() => {` at file top), so a post-construction assignment onto a frozen mover **silently no-ops** rather than throwing. Freezing therefore makes the defect *inert*, not *loud* — which is the correct outcome for this class but means the source assertion must **also** assert the `Object.freeze(` wrapper is present, or a later removal of the wrapper re-opens the route with nothing reddening. Its mutant is the wrapper's deletion, and it belongs in the registry.

**The routing.** The over-claim is internal to the plan: two sentences of one `vitruvius-coverage` row disagree about scope. Either §10's behaviour sentence is narrowed to what its own fixture sentence commissions and the residual is closed as a stated limit, or the structural occupant above is commissioned — in which case the freeze is a **build** task and the widened source assertion plus its mutant are the **test author's**. Mendeleev does not choose between them; the plan's claim is the planner's to settle.

### N2 — Misleading. The emitted-key-set reader has no comment state, and its negative fire drill's name claims coverage the drill does not have. Owner: the test author.

`test/swipe-declone-stage2-subtraction.test.js`'s negative drill is named *"a clean two-key literal is never mis-split by a comma, brace, colon **or comment** inside a value"*. Its twelve control cases cover a comma, a brace, a colon, a template, a nested object, an array, a ternary, a trailing comma, line breaks and quoted keys. **Not one of them contains a comment**, and `scanBalanced` tracks quote state and bracket depth but has no comment state at all.

**Executed, at whole-suite scope.** The adapter rewritten across lines with a line comment carrying an apostrophe — the key set still **exactly** `{el, base}`, i.e. correct source:

```
      const toMover = (m) => ({
        el: m.element,          // the gesture's borrowed element
        base: baseOf(m.slot),
      });
```

Result: `not ok — MOVERSHAPE — the L3 adapter EMITS exactly { el, base } and no third key`. The apostrophe in `gesture's` opens a phantom quote and the reader mis-reads a correct literal. **The drill's own POSITIVE, NEGATIVE and ROT tests all stay green**, which is exactly the accident the file's own header names: "the controls someone thinks to write are the ones that sit where the bug is not."

This is a false positive on correct code, and this project's recorded scar is that a gate which fires on correct work gets switched off — the very sentence `tools/campaign/stage-gate-check.mjs:166` cites when explaining why it measured before shipping. A contrived false *negative* also exists (a third key bracketed by two block comments whose apostrophes put the separating comma inside the phantom quote reads as `{el, base}` and passes locally), but at whole-suite scope that form is caught incidentally by the anchors gate, so the load-bearing half of this finding is the false positive.

**The test that fills it.** Comment state in `scanBalanced` — `//` to end of line and `/* */`, both suppressed from quote and separator handling — plus the negative controls the drill's name already promises: a line comment containing an apostrophe, a line comment containing a comma, and a block comment containing a brace, each on a literal whose key set is exactly `{el, base}`, each required to read as `['base','el']`. The drill's existing structure takes them as three more rows in its `clean` array.

### N3 — Note. This pass's new manifest reports three gates red for reasons that are not coverage. Owner: the assistant, at step 8.

Round 1's F5 is **CLOSED** at `d4ae127`: `Claude/Campaigns/swipe-declone-stage2-subtraction.json` now carries `Claude/Mendeleev/AUDIT-swipe-declone-stage2-subtraction*.md`, which is round-aware and cannot be swallowed by, or swallow, the Stage-2 glob. Verified by reading `artifactsOfRecord` (`tools/campaign/stage-gate-check.mjs:108`) and `roundOf` (`:102`): with an `-rN` file present, files without a suffix are treated as the superseded round 1, so this file supersedes round 1 cleanly rather than being outvoted by it under the `4357775` rule.

Running that gate at HEAD surfaces three failures the old swallowing glob had hidden, none of them about the suite:

| Gate | Reported | What it actually is |
|---|---|---|
| `red-suite` | UNDECLARED | `Claude/Curie/RED-swipe-declone-stage2-subtraction.md` declares no verdict token; the manifest expects `RED_SUITE_READY`. |
| `build` | UNDECLARED | `Claude/Brunel/swipe-declone-stage2-subtraction-build.md` declares no verdict token; the manifest expects `BUILD_GREEN`. |
| `adversary` | FAIL — filed verdict `[ONE]` | The strike file's line reads `**VERDICT: ONE executed fracture — …`, so the parser takes `ONE` as the token. The plan records the fracture as folded, which is `FRACTURE_FOLDED`. |

Recorded so that this audit's `ADEQUATE` is not misread as the blocker: the gate will still report INCOMPLETE after this file lands, for the three rows above.

### N4 — Note. Round 1's F6 is still open and is larger than round 1 enumerated. Owner: the assistant, at step 8.

`Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md:14` still reads `Status: **RED SUITE AUTHORED — cleared to the builder (§11 step 5b, then step 6).**` In addition to that line, §11's step table still marks steps **5, 5b and 6** `open` in the Owner/State column, though each is done and each carries its completion evidence in the same row. Round 1 named the Status line and one board row; the step table adds three more. `Claude/Zelda/Board.md` is current and accurate as of `ebf6b4b` — its step-11 rows now state the closures and explicitly state that step 7 is unrun and step 8 not done.

### N5 — Note. Round 1's F4 is unchanged. Owner: a later purge.

`test/swipe-stage6i.test.js:91` and `:109` remain `assert.equal(ghosts(h), 0, …)` — structurally 0-vs-0 now that no first-party source can write the class; `SNAPSHOTGONE`'s other assertions are real, so the cell is not vacuous. `test/swipe-stage5-residuals.test.js:30` still declares a `ghosts` helper with **zero call sites** (verified: zero occurrences of `ghosts(` in that file). Both are outside every mechanism in the tree; recorded so a later purge has the list.

## 6. What is owed, and is NOT covered by anything above

- **Step 7, the device re-confirm, is UNRUN, and nothing in the suite or the records claims otherwise.** §11 marks it `open`; the board's tail states it plainly; the one skipped test is honestly labelled *Device-only* with the reason (jsdom cannot emit a browser-originated scroll in the endHold→successor window). No §10 cell asserts a rendered geometry, a stacking result or a paint. `Claude/Zelda/DEVICE-GATE-swipe-declone-stage2-2026-08-04.md` records the **parent** Stage-2 device gate (step 10b, build `.306`) and is not this pass's step 7 — the two must not be conflated in the scrub.
- **Step 8, the records scrub, is NOT done.** N3 and N4 add items to its list.
- **Exit item 5, the fingerprint re-verification, still has no mechanism.** N1 measured the consequence directly: those fingerprints redden on any text movement inside their regions, so they witness position rather than property, and nothing distinguishes a re-verified pin from a pasted one.
- **Two durable mechanisms remain unbuilt, and neither is the test author's.** (1) A check that every mutant a plan's `vitruvius-coverage` block declares exists in the registry — plan §14 routes it; this audit's independent recount is its third piece of evidence and had to be done by hand. (2) A comparison of a registration's *stated* killers against its *measured* ones — the absence of that is what let `#13` report `caught` on cells that no longer exist. Both are mechanical comparisons of two lists the repo already holds.

## 7. The forward read — where the next externally-found defect lands

Not on the deletions, and not on the adapter's literal. Both are now the most heavily executed things in the pass: every reachability gate and all nineteen registered mutants fired under this audit's own sweeps, and the literal route round 1 predicted is closed and mutant-backed.

It lands on **dimension 7, contract claims, one step out from where round 1 put it** — N1's coordinate. The concrete route is unchanged in kind and moved in place: a later stage needs to thread a value to the settle path, and rather than editing the adapter expression (now guarded) it attaches the field to the recorded mover in the loop that already iterates `d.movers`. The source assertion reads one expression and sees `{el, base}`; the read-set proxy sees no seam read; no behavioural cell reads the field; and the two incidental witnesses that would have caught an inserted line are evaded by writing it into a line that already exists. This is the same shape as the `own` field the pass deleted — decorative for a stage, under a comment asserting it was load-bearing — and it is measured here rather than argued.

The second-likeliest is **dimension 5, failure paths, via the scanner in N2**: the emitted-key-set reader is now the sole witness for the cell's headline claim, it has a blind spot its own drill's name says it does not have, and its failure mode on that blind spot is a false alarm on correct code. The predicted sequence is not a missed defect but a removed guard — the cell reddens on a legitimate reformatting of the adapter, the reformatting is correct, and the assertion is loosened or deleted to unblock, taking the property with it.

## 8. Routing

| Finding | Severity | Owner | Closes with |
|---|---|---|---|
| N1 — §10 `MOVERSHAPE`'s behaviour sentence over-claims against its own fixture sentence; an orphaned key ships uncaught | Gap | the planner | narrow §10's behaviour sentence to its fixture's scope, **or** commission the measured occupant: `Object.freeze` on the adapter literal (build) plus a widened source assertion covering the wrapper and its deletion mutant (the test author) |
| N2 — the emitted-key-set reader has no comment state; its negative drill's name claims otherwise | Misleading | the test author | comment handling in `scanBalanced`, plus the three negative controls the drill's name already promises |
| N3 — three campaign gates red on non-coverage grounds under the new manifest | Note | the assistant | step 8: declare the missing verdict tokens in the red-suite and build artifacts; state the adversary's verdict in the manifest's vocabulary |
| N4 — plan Status line and three step-table rows disagree with reality | Note | the assistant | step 8's scrub |
| N5 — vacuous assertions and a dead helper in `test/` | Note | a later purge | deletion; no mechanism sees them today |

Round 1's F1, F2 and F3 are closed; round 1's F5 is closed at `d4ae127`. Round 1's F4 carries forward as N5 and F6 as N4.
