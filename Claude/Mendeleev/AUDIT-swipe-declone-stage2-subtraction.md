# Coverage audit — declone Stage 2, step 11: the subtraction pass

Date: 2026-08-05
Artifact audited: the test suite at HEAD `318fc96`, against `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md` §8 and §10.
Gate: publish (the suite is green — 878 tests, 877 pass, 0 fail, 1 skip, re-run at `318fc96`).
Preceding gates: plan review FORGE (round 3), adversary HELD (one fracture folded as §4a C5), code review PASS — fix-then-ship, six findings applied at `6b25a15`.

verdict: **GAPS_NAMED** — all nine §10 cells exist, are green, and were each driven to red by execution against their own specified mutants; two gaps are filed. `MOVERSHAPE` asserts less than its stated behaviour claim, proven by an executed counterexample that ships a third mover key silently; and six of §10's eighteen mutants have no entry in `tools/mutate.mjs`, so the standing sweep reports `0 uncaught` over 145 while a third of the Coverage Model's own mutants are absent from it.

Neither gap is load-bearing on the safety of the twelve deletions. The reachability claims §5's collapse rests on are held by `NOGHOSTCLASS`, `NOOWNEDPANE` and `NOGHOSTATALL`, and all three were executed and observed to fire during this audit.

## 1. Method, and what was executed rather than read

The matrix in §3 was written before the sweep. Every cell status below is backed by running something, not by reading a test name. This campaign's record is that seven blast-radius enumerations were incomplete and every one was found by executing rather than by a further reading, so this audit treated §8, §10, the build log and its own dimension list as hypotheses.

Executed during this audit, all in the foreground, all restored, with `git status` verified empty and no `*.mutbak` or `*.sgbak` left behind:

- Full suite at `318fc96`, twice (before and after the mutation experiments): 878 / 877 pass / 0 fail / 1 skip both times.
- `node tools/source-gate-sweep.mjs` run directly (never imported): exit 0, all 4 entries anchoring, all 4 fingerprints RED with the behavioural control GREEN, `0 uncaught, 0 not-behaviour-neutral`.
- Targeted mutation sweeps at HEAD over every mutant designated to a §10 cell, with indices **re-derived by name** against the 145-entry registry: `13 19 20 31 113 123 137 138 139 140 141 143 144` → `swept 13: 0 uncaught, 0 unapplied, 0 stale flags`; then `31 113` → `swept 2: 0 uncaught, 0 unapplied, 0 stale flags`.
- **Seven mutants applied by hand and run**, because §10 specifies them and the registry does not contain them (§4 F1) or because a cell's stated claim needed a counterexample (§4 F3). Each was applied through an exact-anchor applier that refuses a missing or non-unique anchor.
- Both halves of §4a C5's group-count claim, by deleting each document-scroll writer in turn.
- A positive control for §4a C2's token scan, by injecting the retired token back into the generator.

## 2. What the executed mutants measured

| # | Mutant | §10 identity | Registered? | Result |
|---|---|---|---|---|
| 1 | `toMover` re-adds `own: m.ownership` | `MOVERSHAPE` NATURAL-a | no | CAUGHT — `MOVERSHAPE` read-set test alone (1 failing) |
| 2 | `toMover` drops the base key | `MOVERSHAPE` NATURAL-b | no | CAUGHT — `MOVERSHAPE` ×2 + `DESTROYEDMOVER.midscreen` (3 failing) |
| 3 | `resetSwipeStyles` regains a parameter guarding the pill sweep | `PILLSWEPT` NATURAL-b | no | CAUGHT — the **arity** assertion **alone** (1 failing) |
| 4 | the ownership tag inline at a mover construction site | `NOOWNEDPANE` NATURAL-a | no | CAUGHT — `NOOWNEDPANE` + `NOGHOSTATALL` (2 failing) |
| 5 | the ownership tag as an unreferenced named module constant | `NOOWNEDPANE` NATURAL-b | no | CAUGHT — `NOOWNEDPANE` **alone** (1 failing) |
| 6 | the 340ms settle fallback removed | `DESTROYEDMOVER` NATURAL-a | no | CAUGHT — all three `DESTROYEDMOVER` routes (3 failing) |
| 7 | `toMover` emits a third key with a **constant** value | *(not in §10)* | n/a | **UNCAUGHT — 29 tests, 29 pass, 0 fail.** §4 F3 |

Mutant 3 is worth stating precisely, because it is what makes `PILLSWEPT`'s second assertion load-bearing rather than decorative: with the parameter reintroduced, every production call site still passes no argument, so `keepGhosts` is `undefined`, `!keepGhosts` is true, the sweep still runs, and the pill-removal test stays green. The arity assertion is the only witness that fires. §10's claim that "an arity assertion is the only mechanical form of 'no caller can guard this'" is correct as measured.

Mutant 5 is the shape an inline-only reading would miss, and `NOOWNEDPANE` catches it with clean attribution.

## 3. The matrix — every cell, with its status

Nine cells, eighteen mutants declared by §10. **Nine cells swept. One cell carries a bare half. Twelve of eighteen mutants registered; six absent.**

| Cell | Status | Evidence |
|---|---|---|
| `NOGHOSTCLASS` | **SWEPT** | Gate green over `js/` excluding the vendored bundle. Fire drill: positive on `className=`, `classList.add`, a markup `class` attribute and a named-constant value; negative on a selector query and `classList.remove`. Registered mutant `S2-25` (#137) CAUGHT. |
| `NOOWNEDPANE` | **SWEPT; both mutants unregistered** | Gate green. Fire drill: positive in all three quoting forms; **both** stated negatives present (bare token in a comment, token inside an identifier). Both §10 mutants executed here and CAUGHT (§2 rows 4–5). |
| `NOCLB` | **SWEPT** | Gate green. Positive control placed **behind two URL strings containing `//`** — the specified over-stripping fixture — plus a bare-read positive; both stated negatives present. Registered `S2-26` (#138) and `S2-27` (#139) CAUGHT. |
| `MOVERSHAPE` | **BARE HALF — §4 F3** | Both §10 mutants executed and CAUGHT (§2 rows 1–2). The behavioural half (`base` reaches a numeric `translateX`) is genuine. The key-set half does **not** hold its stated claim: §2 row 7 is an executed counterexample. |
| `RECOVERYPARITY` | **SWEPT** | Four tests over three entry routes plus the pill witness split into its own named test. NATURAL-a = `S2-31` (#143) CAUGHT by `.mid-drag` alone; NATURAL-b = the merged scroll-restore entry (#20); NATURAL-c = `S2-32` (#144) CAUGHT by all three routes; NATURAL-d = re-anchored #13, CAUGHT by `.pillswept`. |
| `DESTROYEDMOVER` | **SWEPT; one mutant unregistered, two mis-designated — §4 F2** | NATURAL-a executed here, CAUGHT by all three routes (§2 row 6). NATURAL-b = #113 (`S2-13`), CAUGHT by `.midscreen`. NATURAL-c = #31, CAUGHT by all three routes. |
| `PILLSWEPT` | **SWEPT; NATURAL-b unregistered** | NATURAL-a = `S2-28` (#140) CAUGHT. NATURAL-b executed here, CAUGHT by the arity assertion alone (§2 row 3). |
| `BORROWEDREALSURVIVES` | **SWEPT** | `S2-29` (#141) CAUGHT. Non-discriminating (153 failing) and disclosed as such in its own registration. |
| `STALETOUCH` | **SWEPT** | #19 CAUGHT, and the split-out witness appears by name in the `killed by:` list, which is what the split was for. |

### The co-changes with no cell (§4a), each resolved

| Item | Resolution |
|---|---|
| C1 — the fingerprint pin | Correctly no cell. The recorded line-by-line re-verification is present in `test/swipe-model.test.js`, dated 2026-08-05, naming the three consequences inside the pinned region. Exit item 5 is satisfied in the only form available to it. |
| C2 — the generator's retired prose | Mechanized and **observed to fire**: injecting the retired token into the generator reddens the token-scan test. Not left to a read-through. |
| C3 — the source-gate anchors | `node tools/source-gate-sweep.mjs` exit 0, 4/4 anchoring and firing. The `transition branches` entry and the `KNOWN_ROTTED` exemption are both gone. |
| C4 — the fuzz probe field | Correctly no cell. A probe field with one constant value. |
| C5 — the `M1WRITERSET` group | **Executed both directions.** Deleting either document-scroll writer (`js/app.js:426` or `:1039`) reddens `M1WRITERSET`. The group-count claim §10 makes for C5 holds as measured, not as argued. |

### The "no cell" table (§10), each examined rather than accepted

| Item | Verdict on the N/A |
|---|---|
| D1, D2, D3 | **Correct, and its stated ground is true.** §10 rests this on "the suite's existing FLASH-line cells prove the line still forms". That cell exists: `test/swipe-gesture.test.js:210-224` (`.213`) asserts a settle emits a frame sample and matches its exact shape `worst=\d+ms long=\d+ gaps=\[`. |
| D4, D5, D7 | **Correct.** Their subjects were no-ops before deletion. Confirmed absent from `js/` (zero occurrences of `revealPending`, `dropPanes`, `disposeOwnedPanes`, `paneKindOf`, `paneLess`). `NOOWNEDPANE` covers the re-arming route and was executed. |
| D6 | **Correct.** A device-log format change. The FLASH line's formation is witnessed by the `.213` cell above, so the edit is not unwitnessed even though the token is not asserted. |
| D12 | Covered by `MOVERSHAPE` — with the bare half at §4 F3. |
| D13–D17 | Held by three registries. The anchors gate is green in-suite; `source-gate-sweep.mjs` was run directly; the behavioural sweep was exercised over 15 targeted indices at HEAD with `0 uncaught, 0 unapplied, 0 stale flags`. §4 F1 is the gap in what the first of those three registries *contains*, not in whether it runs. |

## 4. Findings

### F1 — Structural. Six of §10's eighteen mutants are absent from the registry. Owner: the test author.

`tools/mutate.mjs` holds 145 entries. Twelve of §10's eighteen mutants map to one; six do not:

| §10 mutant | Cell | Measured killer set (executed here) |
|---|---|---|
| NATURAL-a, the tag inline at a mover construction site | `NOOWNEDPANE` | `NOOWNEDPANE`, `NOGHOSTATALL` |
| NATURAL-b, the tag as an unreferenced named module constant | `NOOWNEDPANE` | `NOOWNEDPANE` alone |
| NATURAL-a, the adapter re-adds the retired ownership key | `MOVERSHAPE` | `MOVERSHAPE` read-set test alone |
| NATURAL-b, the adapter drops the base key | `MOVERSHAPE` | `MOVERSHAPE` ×2, `DESTROYEDMOVER.midscreen` |
| NATURAL-b, the reset regains a parameter guarding the pill sweep | `PILLSWEPT` | the `PILLSWEPT` **arity** test alone |
| NATURAL-a, the 340ms settle fallback removed | `DESTROYEDMOVER` | all three `DESTROYEDMOVER` routes |

Five of the six were filed as **owed at step 6**, with exact `from`/`to` text, in `Claude/Curie/RED-swipe-declone-stage2-subtraction.md`'s owed-mutant table. The sixth was never filed as owed: that record's F-5 reads §10's `DESTROYEDMOVER` row as the superseded round-1 form (three route variants, only one registrable) when the ratified §10 had already been re-derived to **one mutant per assertion**, all three registrable. So the count "three mutants, one per assertion" was satisfied on paper by one registration.

The consequence is the shape this project has a standing scar about: the sweep reports `0 uncaught` and the number is true, while a third of the Coverage Model's declared mutants are not in the set being swept. A green counter states execution, not coverage.

**This is the eighth instance of the pass's own R10 class**, and it is one layer in from the seventh. The seventh was *anchor rot inside* `tools/mutate.mjs`; this is *the registry's completeness against §10*. Both are invisible to the same three mechanisms: the purge scan walks `js/` only, the anchors gate reads `MUTATIONS` and asks only whether each registered anchor still matches, and ESLint ignores `test/**` and `tools/`. No mechanism in the tree compares the registry against a plan's Coverage Model.

**The test that fills it, stated as a specification.** Six registry entries, each carrying `name`, `file`, a unique `from` and a `to`, with the measured killer set written into the registration comment (the measure §8 D13c already applies to `S2-23`). The anchors verified above exist verbatim at HEAD: `const toMover = (m) => ({ el: m.element, base: baseOf(m.slot) });` in `js/app.js`; `outgoing = mover(env.sourceEl(sourceHost, from.v), 'borrowed-real', 'outgoing');` and `  const BROWSE_FAMILY` in `js/swipe.js`; `  function resetSwipeStyles() {` + its pill-sweep line in `js/nav.js`; `      cur.settleTimer = setTimeout(finalize, 340);` in `js/app.js`. ⛔ **`js/nav.js` and `js/app.js` are CRLF** — a multi-line `from` must use `\r\n` or the anchor silently misses, which is how the first attempt at mutant 3 failed here.

Durably, the gap is the one §14 already routes: a check that the mutants a plan's `vitruvius-coverage` block declares all exist in the registry. That is a mechanical comparison of two lists the repo already holds, and it would have caught this and the seventh instance both.

### F2 — Misleading. `DESTROYEDMOVER`'s only two registered mutants are designated to other cells. Owner: the test author.

`DESTROYEDMOVER`'s NATURAL-b and NATURAL-c are exercised by #113 (`S2-13 RESETCOVERSPAGES`) and #31 (`stage3: finalize does not end ownership`). Measured: #31 is killed by all three `DESTROYEDMOVER` routes, #113 by `.midscreen`. The evidence is real. What does not exist is any registration that *names* `DESTROYEDMOVER` as a designated killer, so the cell has no entry of its own in the registry. A future narrowing of #31 or #113 in service of the cells they do name would remove `DESTROYEDMOVER`'s mutation evidence with nothing reddening. This is deferred audit finding M5's class with a concrete instance; the one-line measure the pass already applies elsewhere is to record `DESTROYEDMOVER` in both registration comments as an expected killer.

### F3 — Gap. `MOVERSHAPE` asserts less than its stated claim, with an executed counterexample. Owner: the test author.

§10's behaviour text for the cell is: the production mover object "carries exactly the element reference and the base offset and **no third key** so a dropped or an **orphaned key cannot ship silently**." §13 decision 20 rules that the cell "asserts over source, not over a runtime observer", the reason given being that a runtime observer would add exactly the surface this pass exists to remove.

The shipped cell does neither. It wraps `Swipe.buildConstruction` and records, through accessor proxies, the set of **seam fields the adapter reads** — a runtime observer, and of the read set rather than the emitted key set. Its own header discloses the substitution and argues the read set is 1:1 with the produced key set "for every shape the plan names".

Executed counterexample: `const toMover = (m) => ({ el: m.element, base: baseOf(m.slot), own: 'borrowed-real' });` — a third key whose value is a constant rather than a read of a seam field. `test/swipe-declone-stage2-subtraction.test.js` and `test/retired-concepts-purge.test.js` together: **29 tests, 29 pass, 0 fail.** An orphaned key ships silently, which is the exact outcome the cell's stated claim forbids, and the residual is on the pass's own subject — fields with no reader are what it exists to delete.

**The test that fills it.** The source assertion §10 specifies and the runtime proxy replaced: read `js/app.js`, locate the adapter's mover-construction expression by its enclosing `toMover` binding, and assert the emitted key set is exactly `{el, base}` — a source fact, no production observer, the same kind the parent plan's `MOVERHASBOX` and `PAGEISVIEW` already use. It composes with the existing read-set assertion rather than replacing it: the read set catches a key sourced from a seam field, the emitted set catches a key sourced from anything. Its mutant is §2 row 7, textual and biting, and it belongs in the registry with F1's six.

### F4 — Note. Vacuous assertions and a dead helper remain in `test/`, outside every mechanism.

`test/swipe-stage6i.test.js:91` and `:109` are `assert.equal(ghosts(h), 0, …)` — structurally 0-vs-0 now that no first-party source can write the class. The code review named them and scoped them out as "the class, not a required fix". `SNAPSHOTGONE`'s other assertions are real, so the cell is not vacuous; these two lines are. Separately, `test/swipe-stage5-residuals.test.js:30` declares a `ghosts` helper with **zero call sites** — D16's exact class, disclosed in the build log as out of scope. Recorded so that a later purge has the list, not as an objection to this pass's scoping.

### F5 — Note. The manifest's coverage-audit gate cannot see this audit's verdict. Owner: the assistant.

`Claude/Campaigns/swipe-declone-stage2.json`'s `coverage-audit` glob is `Claude/Mendeleev/AUDIT-swipe-declone-stage2*.md`, which matches both `AUDIT-swipe-declone-stage2.md` (the Stage-2 build audit, verdict ADEQUATE) and this file. Neither carries an `-rN` suffix, so `artifactsOfRecord` returns both and the gate passes if **any** matched artifact declares an accepted verdict. This audit's `GAPS_NAMED` therefore does not redden the gate; the earlier audit's `ADEQUATE` clears it. That is the recorded any-accepted residual in `tools/campaign/stage-gate-check.mjs`, reached here by a second shape — two audits of *different subjects* under one glob, rather than two rounds of one review. The cheap fix is the one that file's own note gives: point the glob at one artifact.

### F6 — Note. Two records disagree with reality. Owner: the assistant, at step 8.

The plan's Status line still reads "RED SUITE AUTHORED — cleared to the builder (§11 step 5b, then step 6)"; the build, the review and the review fixes have all landed. `Claude/Zelda/Board.md`'s step-11 review-fix entry ends "Not committed yet"; the work is committed at `6b25a15`, with its SHA recorded at `318fc96`. Both are on step 8's scrub list, which is open and not yet due — recorded so the scrub has them enumerated rather than rediscovered.

## 5. What is owed and is NOT covered by anything above

- **Step 7, the device re-confirm, is UNRUN.** Nothing in the suite or in the records claims otherwise: §11 marks it `open`, and the board's next-action line names it. No cell in §10 asserts a rendered geometry, a stacking result or a paint, and the one skipped test is the device-only cell. The suite's green says nothing about the device, and no record read during this audit says it does.
- **Step 8, the records scrub, is NOT done.** The campaign manifest's `note` still carries both falsified clauses. §4 F6 adds two more items to that list.
- **Exit item 5, the fingerprint re-verification, remains the one load-bearing step with no mechanism behind it.** The record is present and in the required form; nothing can distinguish a re-verified pin from a pasted one, and this audit does not claim to have done so.

## 6. The forward read — where the next externally-found defect lands if the bare cells stay bare

Not on the deletions. Their reachability claims are the most heavily executed thing in the pass, and every gate holding them fired under this audit's own mutants.

It lands on **dimension 7, contract claims, at the L3 adapter seam** — the coordinate F3 names. The pass removed `own` because nothing read it; the cell that is supposed to keep a reader-less field from returning cannot see one whose value is a constant. The concrete route is a later stage that needs to thread a value from `start()` to the settle path and adds it to the mover literal directly rather than to the seam: `MOVERSHAPE` stays green because no new seam field is read, `NOOWNEDPANE` stays green because the value is not the retired tag, `NOGHOSTATALL` stays green because it asserts over the seam and not over L3, and the field ships with no reader into a codebase whose standing argument for deleting such fields is this very pass. That is the same shape as the `own` field itself — which, as §6 records, had been decorative since the pane went, under a comment asserting it was load-bearing.

The second-likeliest is **dimension 5, failure paths, via the registry**: with six declared mutants absent and two more designated to other cells, a future stage that de-registers or re-anchors #31, #113 or #20 for its own reasons removes evidence for `DESTROYEDMOVER` and `RECOVERYPARITY` while every gate stays green and the sweep still prints `0 uncaught`.

## 7. Routing

| Finding | Severity | Owner | Closes with |
|---|---|---|---|
| F1 — six §10 mutants unregistered | Structural | the test author | six registry entries; anchors and CRLF caveat given above |
| F2 — `DESTROYEDMOVER` has no designated registration | Misleading | the test author | expected-killer note in #31 and #113 |
| F3 — `MOVERSHAPE`'s key-set claim is unproven | Gap | the test author | the source assertion §10 already specifies, plus its mutant |
| F4 — residual vacuous assertions and a dead helper | Note | a later purge | deletion; no mechanism sees them today |
| F5 — the coverage-audit glob matches two subjects | Note | the assistant | point the glob at one artifact |
| F6 — plan Status and board row disagree with reality | Note | the assistant | step 8's scrub |

A durable answer to F1's class — a check that every mutant a plan's `vitruvius-coverage` block declares exists in the registry — is the same tool §14 already routes for the derived co-change list, and this audit is its second piece of evidence.
