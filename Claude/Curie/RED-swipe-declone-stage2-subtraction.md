# RED suite — declone stage 2, step 11 (the subtraction pass) — test design

Type: test design (the test author)
Date: 2026-08-05
Plan of record: `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md` (RATIFIED 2026-08-05), §11 steps 4–5
Authored against HEAD `d8333b4`

**Verdict: RED_SUITE_READY** — declared 2026-08-05 against HEAD `05d454e`, for all nine of §10's
cells realized with all eighteen of its mutants registered and executed (§8, §9), re-verified at
that HEAD: suite 884 / 883 pass / 0 fail / 1 skip, `node tools/source-gate-sweep.mjs` exit 0
(4 swept, 0 uncaught, 0 not-behaviour-neutral), and this pass's own entries `S2-33`…`S2-39`
re-swept by re-derived index — 0 uncaught, 0 unapplied, 0 stale flags.

⚠️ **This token is a milestone, not a present-tense claim that the suite is red**, and the
distinction is worth stating because three cells here (`NOOWNEDPANE`, `MOVERSHAPE`, `PILLSWEPT`'s
arity half) were red at authoring HEAD and are green now. That is the build satisfying the
constraint, which is the gate's whole purpose; it does not falsify the declaration. The gate order
is plan-review → **red-suite** → build, so this gate asserts the suite was authored and handed on
before the build opened — the same reading every completed campaign's Curie artifact carries.

---

## Index

1. What was authored, and where each cell lives
2. Red-at-HEAD, and what each red means
3. Executed mutation results — every mutant, by name
4. Mutants owed at step 6, with derived anchors — ALL LANDED, see §9
5. The collapse-probe measurement, and what it showed about these cells
6. Findings routed back — what the plan's enumeration missed
7. Departures from §10 as written, with the reason
8. Exit accounting — every §10 cell against its realization
9. The coverage audit's three gaps, closed — measured (2026-08-05)
10. Round 2's N2, closed — the same blind spot, one step further (2026-08-05)

---

## 1. What was authored, and where each cell lives

Nine §10 cells, plus coverage-audit **M2** (step 4). Every file below is test or tooling; no
`js/` or `css/` file was edited and nothing was deleted — the subtraction itself is the
builder's at step 6.

| Cell | File | Tests |
|---|---|---|
| `NOGHOSTCLASS` | `test/retired-concepts-purge.test.js` (NEW) | 1 gate + 4 fire-drill controls |
| `NOOWNEDPANE` | `test/retired-concepts-purge.test.js` (NEW) | 1 gate + 3 fire-drill controls |
| `NOCLB` | `test/retired-concepts-purge.test.js` (NEW) | 1 gate + 4 fire-drill controls |
| — (the scanner itself) | `test/retired-concepts-purge.test.js` (NEW) | 6 lexer drills, incl. one over every shipped `js/` file |
| `MOVERSHAPE` | `test/swipe-declone-stage2-subtraction.test.js` (NEW) | 2 |
| `RECOVERYPARITY` | `test/swipe-declone-stage2-subtraction.test.js` (NEW) | 3 routes + the pill witness as its own named test |
| `DESTROYEDMOVER` | `test/swipe-declone-stage2-subtraction.test.js` (NEW) | 3 destruction routes |
| `PILLSWEPT` | `test/swipe-declone-stage2-reset.test.js` | 2 |
| `BORROWEDREALSURVIVES` | `test/swipe-stage6.test.js` | 1 (the relocated `BR`) |
| `STALETOUCH` | `test/swipe-invariants.test.js` | the `I20` witness re-anchored, **plus a split witness test** (§7) |
| **M2** (step 4) | `test/browse-virtual.test.js` | 2 (the `pageElFor` throw + the `keyFor` sibling negative) |

Mutation registry: `tools/mutate.mjs` gains eight entries, `S2-25` … `S2-32`.

⛔ **Two relocations are NOT completed here, by design.** `BORROWEDREALSURVIVES` is authored in
its new home while the original `BR` still stands in `test/swipe-stage6e.test.js`; that file is
deleted whole at step 6 (§8 D14b), which is what resolves the duplication. Likewise the vacuous
`ghosts(h) === ghostsAfter` assertion inside `I20` is left standing — it is on §8 D15's removal
list and the removal is the builder's.

---

## 2. Red-at-HEAD, and what each red means

A deletion's Coverage Model is inverted, so most cells here are guards over behaviour that
SURVIVES and are green at HEAD by construction; their ability to fail is demonstrated by the
executed mutants in §3, not by a red. **Three cells are genuinely red-unimplemented** and go
green when the builder lands the subtraction:

| Red cell | Why it is red at HEAD | What turns it green |
|---|---|---|
| `NOOWNEDPANE` | the tag literal occurs at four sites — `js/app.js:266`, `:396`, `:698`, `:769` | §4 D4 / D6 / D7 / D8 |
| `MOVERSHAPE` | the L3 adapter reads `ownership`, i.e. still emits `own` | §4 D12 |
| `PILLSWEPT` (arity) | `resetSwipeStyles` declares `keepGhosts` (arity 1) | §4 D11 |

Full suite at HEAD with this suite in place: **884 tests, 880 pass, 3 fail, 1 skipped** — the
three above and nothing else. (Baseline before this work: 849 tests, 0 fail.)

⭐ **`PILLSWEPT`'s arity red flips to green under the collapse probe and nothing else does** (§5),
which is the strongest available evidence that it is red for its cell's reason rather than for a
fixture accident.

---

## 3. Executed mutation results — every mutant, by name

⛔ **Method, and why it is not the whole-suite sweep.** Three cells are red at HEAD, so a
whole-suite mutation sweep would report every mutant CAUGHT for the wrong reason. Each mutant was
therefore applied with `node tools/mutate.mjs <i>`, run **in the foreground** against its target
test FILE, and restored; the working tree was checked clean and `*.mutbak`-free after every one.
Indices are as of this commit — **cite these by NAME and re-derive the index**, since inserting an
entry shifts every later one.

| Mutant (name) | Applied to | Result | Cells reddened |
|---|---|---|---|
| `S2-25 NOGHOSTCLASS` (a class write of the retired token) | `js/nav.js` | **CAUGHT** | `NOGHOSTCLASS` — and nothing else in the file beyond the standing `NOOWNEDPANE` red |
| `S2-26 NOCLB` (declaration + read of `clobbered`) | `js/progressfmt.js` | **CAUGHT** | `NOCLB` |
| `S2-27 NOCLB` (bare READ of `sourceWasClobbered`, no declaration) | `js/progressfmt.js` | **CAUGHT** | `NOCLB` |
| `S2-28 PILLSWEPT` (the pill sweep deleted with the ghost sweep) | `js/nav.js` | **CAUGHT** | `PILLSWEPT` (the sweep test) |
| `S2-29 BORROWEDREALSURVIVES` (the reset REMOVES what it clears) | `js/nav.js` | **CAUGHT** | `BORROWEDREALSURVIVES` — **and all six other tests in `test/swipe-stage6.test.js`**; see the disclosure below |
| `S2-30 M2` (`pageElFor` returns null on a miss) | `js/browse.js` | **CAUGHT** | both M2 cells (the sibling's fixture-sanity discriminator uses the same accessor) |
| `S2-31 RECOVERYPARITY` (recovery drops `resetScroll:false`) | `js/app.js` | **CAUGHT** | `RECOVERYPARITY.mid-drag` |
| `S2-32 RECOVERYPARITY` (hold released BEFORE the screen application) | `js/app.js` | **CAUGHT** | `RECOVERYPARITY` — **all three routes** |
| `stage6a: recovery stops restoring the session-start scroll` (#16, existing) | `js/app.js` | **CAUGHT** | `RECOVERYPARITY` — all three routes. This is §10's `NATURAL-b`, already registered |
| `swipe: begin() stops hard-resetting a superseded session` (#13, existing) | `js/app.js` | **CAUGHT** | `RECOVERYPARITY.pillswept`. This is the HEAD analogue of §10's `NATURAL-d` — see below |
| `S2-13 RESETCOVERSPAGES` (the `.browsepage` push dropped, #122, existing) | `js/nav.js` | **CAUGHT** | `DESTROYEDMOVER.midscreen`. This is §10's `DESTROYEDMOVER NATURAL-a` |
| `swipe: supersession stops releasing the old target listeners` (#21, existing) | `js/app.js` | **CAUGHT** | `STALETOUCH` — see the split below |

**`S2-29`'s non-discrimination, disclosed rather than repaired (§8 D13b).** The style reset runs
at the top of every `applyScreen` over every view and every `.browsepage`, so removing those
elements reddens much of the harness suite: MEASURED, it reddens all seven live tests in
`test/swipe-stage6.test.js`. It demonstrates that *the suite* notices, not that *this cell* does.
It is the honest choice of mechanism — the ownership filter it replaces no longer exists — and
the compensating measure is exactly the one `S2-23` already carries: the expected killer set is
written into the registration comment so "reddens for the right reason" stays checkable.

**Why `NATURAL-d` was not registered as a new entry.** §10's fourth `RECOVERYPARITY` mutant is
"the screen application is REMOVED from the recovery". At HEAD that alone does **not** leak the
pill: the explicit `resetSwipeStyles(...)` call §5 deletes still runs and sweeps it. The faithful
HEAD analogue is removing BOTH statements — which is byte-for-byte what mutant #13 already does.
Registering a near-duplicate would have added registry noise without adding evidence, so #13 was
EXECUTED instead and confirmed to redden `RECOVERYPARITY.pillswept` specifically. The post-pass
single-line form is derived in §4.

**⭐ `STALETOUCH`'s mutant did NOT exercise the witness, and that was found by execution.**
Applying #21 reddens `I20` on its **second** assertion (`a stale event must not settle the live
gesture`), so the re-anchored transform witness is never reached and the sweep could only ever
report that the TEST died. That is R8's exact shape — a mutant registered for an assertion it
cannot exercise — landing on the witness this pass rescued. The repair is §13 decision 13's:
the witness is split into its own named test (`STALETOUCH — a stale touchmove must not write a
transform onto the NEW session's movers (the witness, alone)`), driven with a stale `touchmove`
and no stale `touchend`. Re-executed: #21 now reddens **that test, on that assertion**.

---

## 4. Mutants owed at step 6, with derived anchors

⛔ **ALL OF THESE HAVE LANDED — see §9 for each one's registered name and measured killer set.**
They are kept here as the derivation, because the anchors below are the ones §9's registrations
use and because **the cost of the deferral is the record worth keeping**: five of the six sat in
this table unregistered through the build, the review and the review fixes, and the standing
mutation sweep printed `0 uncaught` the whole time while a third of §10's declared mutants were
not in the set being swept. A table of things owed is not a mechanism. Nothing in the repo
compared this table against the registry, which is the durable gap the audit routes at plan §14.

The reason they were deferred: each targeted code that did not exist at HEAD, or a cell that was
already red at HEAD so its redness would have been unattributable, and registering any of them
then would have rotted `test/mutation-anchors.test.js` immediately. That reason was correct and
is not what failed; the follow-through is.

### 4a. New registrations owed

| Owed mutant | File | `from` (post-pass source) | `to` |
|---|---|---|---|
| `NOOWNEDPANE NATURAL-a` — the tag inline at a mover construction site | `js/swipe.js` | `outgoing = mover(env.sourceEl(sourceHost, from.v), 'borrowed-real', 'outgoing');` | `outgoing = mover(env.sourceEl(sourceHost, from.v), 'owned-pane', 'outgoing');` |
| `NOOWNEDPANE NATURAL-b` — the tag as a named module constant, never referenced | `js/swipe.js` | `  const BROWSE_FAMILY` *(the declaration line; re-derive)* | prepend `  const OWNED_PANE_KIND = 'owned-pane';` and read it once so lint stays green |
| `MOVERSHAPE NATURAL-a` — the adapter re-adds the retired key | `js/app.js` | `const toMover = (m) => ({ el: m.element, base: baseOf(m.slot) });` | `const toMover = (m) => ({ el: m.element, base: baseOf(m.slot), own: m.ownership });` |
| `MOVERSHAPE NATURAL-b` — the adapter drops the base key | `js/app.js` | same line | `const toMover = (m) => ({ el: m.element });` |
| `RECOVERYPARITY NATURAL-d` — the screen application removed from the recovery | `js/app.js` | `        applyScreen(currentDesc(), { render: false, resetScroll: false });\n` | `` (empty) |
| `PILLSWEPT NATURAL-b` — the reset regains a parameter and guards the pill sweep behind it | `js/nav.js` | `  function resetSwipeStyles() {\n    document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());` | `  function resetSwipeStyles(keepGhosts) {\n    if (!keepGhosts) document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());` |

⚠️ `NOOWNEDPANE NATURAL-b`'s `to` must keep ESLint green: `no-unused-vars` is an **error** on
`js/**`, so a genuinely unreferenced constant reddens `test/lint.test.js` and the kill is
attributed to the wrong cell. Give it one read in an existing expression. The gate still fires —
its rule matches the string LITERAL, wherever it sits.

### 4b. Re-anchors owed (subject survives, anchor text moves)

| Mutant | Why it rots | Post-pass anchor |
|---|---|---|
| `S2-31 RECOVERYPARITY` (mine) | anchors the pre-collapse `applyScreen` options | `        applyScreen(currentDesc(), { render: false, resetScroll: false });` → `        applyScreen(currentDesc(), { render: false });` |
| `S2-32 RECOVERYPARITY` (mine) | anchors the pre-collapse five-line recovery block | re-derive `VR_HOLD_ORDER_FROM`/`_TO` against the collapsed block |
| `stage6a: recovery stops restoring the session-start scroll` (#16) | **not on any plan list** — see §6 | `        window.scrollTo(0, cur.scroll0);` → `        /* mutated: no scroll restore */` |
| `swipe: supersession recovery stops restoring the session-start scroll` (#22) | **not on any plan list** — see §6 | identical to #16 (the two are byte-identical duplicates) |

---

## 5. The collapse-probe measurement, and what it showed about these cells

Run, foreground, against this suite:

```
COLLAPSE=1 NODE_OPTIONS="--require C:/Users/nzilb/OneDrive/Desktop/TomeRoam/Claude/Loki/probe-stage2-subtraction-transform.js" node --test test/*.test.js
```

⚠️ The plan's `$PWD` form of that command fails under MSYS: `$PWD` expands to `/c/Users/...`,
which node cannot resolve. Use the drive-letter path.

**Result: 884 tests, 872 pass, 11 fail, 1 skipped.**

| Failing under the collapse | Declared by the plan? |
|---|---|
| `every mutation anchor still matches the source it targets` | yes — §8 D13/D13b, **but its contents are short by two: see §6** |
| `every source-gate anchor still matches its target` | yes — §4a C3 |
| `resetSwipeStyles clears inline transforms off every screen + drops ghosts` (`test/nav.test.js`) | yes — §8 D14 |
| `M1WRITERSET` | yes — §4a C5 (the adversary's fracture) |
| `the committed model is exactly what the generator produces` | yes — §4a C2 / §8 D17 |
| `every mirrored js/app.js region still matches what was verified` | yes — §4a C1 |
| `OB`, `OB-home` (`test/swipe-stage6.test.js`) | yes — §8 D14 |
| `HR` (`test/swipe-stage6e.test.js`) | yes — §8 D14 |
| `NOOWNEDPANE` | not applicable — red at HEAD too; the probe does not carry D4/D6/D7/D8 |
| `MOVERSHAPE` | not applicable — red at HEAD too; the probe does not carry D12 |

**What it showed about the cells authored here, which is the reason to run it at this step.**

- ⭐ `PILLSWEPT`'s arity assertion goes **red → green** under the collapse, alone among the three
  red-first cells. It is red for its cell's reason.
- ⭐ Every OTHER cell authored here is **green under the collapse**: `NOGHOSTCLASS`, `NOCLB`,
  `RECOVERYPARITY` (all four tests), `DESTROYEDMOVER` (all three routes),
  `BORROWEDREALSURVIVES`, `STALETOUCH` (both), `PILLSWEPT` (the sweep), and both M2 cells. The
  cells written for a world that does not exist yet behave correctly in it.
- `NOOWNEDPANE` and `MOVERSHAPE` stay red because the probe carries only §5's collapse and the
  D9/D11 surfaces it rides on, not the twelve deletions — the plan's own stated limit on the
  instrument, confirmed rather than assumed.

---

## 6. Findings routed back — what the plan's enumeration missed

The plan names R10 — "the co-change ENUMERATION is the thing that keeps being incomplete, and only
execution has ever caught it" — and records three instances. **This is a fourth, and it was again
found by running the collapse rather than by reading.**

### F-1 — §8 D13/D13b's mutant enumeration is short by two. **Owner: the planner.**

Two registered mutants rot under §5's collapse and appear on **no list in the plan**:

- `stage6a: recovery stops restoring the session-start scroll (-> SC known-red test, NC scroll clause)`
- `swipe: supersession recovery stops restoring the session-start scroll (-> I20 test)`

Both anchor on `        if (cur) window.scrollTo(0, cur.scroll0);`, which §5's third ternary
rewrites. **Neither is a de-registration**: their subject — the recovery's session-start scroll
restore — SURVIVES the collapse untouched, and it is exactly `RECOVERYPARITY`'s `NATURAL-b`, which
was executed here and reddens all three routes. They need **re-anchoring**, and they belong on
step 6's same-commit list beside `swipe: begin() stops hard-resetting a superseded session`.

⭐ This is the same source line as the adversary's fracture: §4a C5 caught the `M1WRITERSET`
baseline registering that ternary by exact text, and stopped there. Two mutant anchors on the
identical line were not looked for.

### F-2 — those two mutants are byte-identical duplicates. **Owner: the planner (records).**

Same `file`, same `from`, same `to`; only the names and the cited cells differ. Not caused by this
pass and not repaired here, but it means the registry over-counts its own evidence by one, and a
re-anchor at step 6 must touch both or the anchors gate reddens on the survivor.

### F-3 — `VR_HOLD_ORDER_FROM` / `_TO` were declared in `tools/mutate.mjs` and never registered.

Present since stage 6a, anchoring cleanly, reachable by no sweep — so the recovery's
hold-release ORDERING, whose current form is an executed counterexample's fix
(`STRIKE-swipe-stage6-recover-before-arm`), had **no runnable mutation evidence at all**. They are
wired up here as `S2-32` rather than rewritten, and executed: they redden all three
`RECOVERYPARITY` routes.

### F-4 — §10 `MOVERSHAPE`'s fixture as specified is not constructible. **Owner: the planner.**

§10 requires asserting "the recorded mover key set equals exactly the two-key set by deep
comparison". The recorded movers live on the gesture session (`d.movers`) and **nothing observes
them**: the only production observer, `window.PBSwipeSession()`, reports `{ id, dragging }`, and an
object literal's key creation cannot be trapped from outside (a literal uses
`[[DefineOwnProperty]]`, which no prototype setter sees). The exact key set is not constructible at
the harness layer without a production change, which this pass forbids. What is asserted instead
is stated in §7 rather than substituted silently.

### F-5 — §10 `DESTROYEDMOVER`'s "three mutants" are two fixtures and one mutant.

`NATURAL-b` ("the container wipe route is driven instead of the cache clear") and `NATURAL-c` ("a
mid-gesture screen application with rendering enabled is driven instead") are alternative DRIVES,
not source mutations — which is how the coverage audit itself described them ("a `Browse.reset()`
variant and an `applyScreen(..., {render:true})` variant are the other two coordinates of the same
cell"). Only `NATURAL-a` is registrable, and it already exists (`S2-13`). Authored as three route
tests; the count in §10 reads as three mutants and is not.

### F-6 — `NOOWNEDPANE` needs comment stripping, which §10 attributes only to `NOCLB`.

[R4] states that `NOCLB` "is the first gate here that needs comment-and-string stripping at all".
It is not: this codebase's comments use markdown backticks, and `js/app.js:386` contains
`` `owned-pane` `` **inside a comment**. A three-quoting-form scan without comment stripping would
match it — contradicting `NOOWNEDPANE`'s own stated negative control ("a bare occurrence in a
comment … must NOT match"). Resolved here by stripping comments for `NOOWNEDPANE` too (strings are
preserved, since a string literal is what it looks for), and the over-stripping fixture [R4]
specifies is applied to both. Recorded because the plan's claim about which gate needs the
machinery is false, and because that machinery's failure is the silent one.

---

## 7. Departures from §10 as written, with the reason

**`MOVERSHAPE` asserted the adapter's seam-field READ set and not the produced key set — and that
substitution was WRONG, proven by an executed counterexample. CLOSED at §9 F3.** The departure is
recorded rather than deleted because the reasoning that justified it is the reasoning to distrust:
the read set was argued 1:1 with the emitted key set "for every shape the plan names", and a
mutant is not obliged to stay inside an enumeration. A third key whose value is a **constant**
reads no seam field, so the observer could not see it, and nothing downstream reads it, so no
behavioural cell could either. The cell now carries the SOURCE assertion §10 specifies **in
addition to** the read-set observer; the read-set test keeps its own job (it catches a field that
is read and discarded, which the source assertion cannot see). See finding F-4 for why §10's
original runtime fixture is not constructible, which remains true.

**`STALETOUCH` gains a split witness test.** §11 step 5 describes it as "the existing stale-event
cell re-anchored". The re-anchor alone would have shipped a witness never shown to fail (§3). The
split is §13 decision 13 applied where execution showed it was owed; it is an addition, not a
narrowing.

**`RECOVERYPARITY`'s `resetScroll:false` witness lives on one route only.** For a browse source
`applyScreen` performs no scroll reset at all, so the flag is unobservable there. The route that
carries it is driven from an OVERLAY source. Stated in the file so the cell does not read as
unevenly written.

---

## 8. Exit accounting — every §10 cell against its realization

| §10 cell | Realized | Mutation evidence |
|---|---|---|
This table records the state at the time the red suite was filed. **§9 supersedes its mutation-
evidence column**: every "owed" entry below has since landed and been executed.

| §10 cell | Realized | Mutation evidence at filing time |
|---|---|---|
| `NOGHOSTCLASS` | yes | `S2-25` executed, CAUGHT; fire drill positive ×3, negative ×1, all observed to fire |
| `NOOWNEDPANE` | yes, **red at HEAD** | 2 mutants owed at step 6 (§4a) — the gate is already red, so neither is attributable now; fire drill positive ×3 quoting forms, negative ×2 |
| `NOCLB` | yes | `S2-26`, `S2-27` executed, CAUGHT; fire drill positive ×2, negative ×2, the positive placed behind two `//`-bearing strings as [R4] specifies |
| `MOVERSHAPE` | yes, **red at HEAD** | 2 mutants owed at step 6; the `base` half additionally covered behaviourally |
| `RECOVERYPARITY` | yes — 3 routes + the pill witness split out | `NATURAL-a` = `S2-31` ✓, `NATURAL-b` = #16 ✓, `NATURAL-c` = `S2-32` ✓, `NATURAL-d` HEAD analogue = #13 ✓ (post-pass form owed) |
| `DESTROYEDMOVER` | yes — 3 destruction routes | `NATURAL-a` = `S2-13` ✓; the other two coordinates are fixtures, not mutants (F-5) |
| `PILLSWEPT` | yes, **arity half red at HEAD** | `NATURAL-a` = `S2-28` ✓; `NATURAL-b` owed at step 6 |
| `BORROWEDREALSURVIVES` | yes — `BR` relocated intact | `S2-29` ✓, non-discrimination disclosed with its measured killer set |
| `STALETOUCH` | yes — re-anchored **and split** | #21 ✓ against the split witness specifically (the entry named `swipe: supersession stops releasing the old target listeners`; **the index has since moved to #19** — cite it by name and re-derive) |
| **M2** (step 4) | yes — the throw cell + the `keyFor` sibling negative | `S2-30` ✓ (the exact mutant the audit names) |

⛔ **F-5 above is WRONG and the coverage audit corrected it.** It read §10's `DESTROYEDMOVER` row
as the superseded round-1 form (three route variants, only one registrable). The ratified §10 had
already been re-derived to **one mutant per ASSERTION**, all three registrable. Reading a
superseded revision of a row and filing a finding against it is how a count of three was satisfied
on paper by one registration — and the entry above then read as complete. §9 lands all three.

---

## 9. The coverage audit's three gaps, closed — measured (2026-08-05)

Closing `Claude/Mendeleev/AUDIT-swipe-declone-stage2-subtraction.md` (verdict `GAPS_NAMED`),
findings F1, F2, F3. Authored against HEAD `4357775`. **Nothing under `js/` or `css/` was
touched**: the subtraction is built and reviewed, and a test author does not change the behaviour
being asserted.

⛔ **Method.** Every mutant below was REGISTERED, then APPLIED, then its failing-test list READ,
before any claim about it was written. Every sweep ran in the FOREGROUND with explicit indices
re-derived by name; `git status` was verified clean and `*.mutbak`-free after each. The final
numbers are from a re-sweep against the FINAL suite, not against the state the mutant was first
measured in — a mutation result stops being true when the suite changes.

### F1 — the six §10 mutants that had no registry entry

| Registered as | §10 identity | Result — whole behaviour suite | Killing cells |
|---|---|---|---|
| `S2-33` | `NOOWNEDPANE` NATURAL-a (tag inline at a construction site) | CAUGHT, 5 failing | `NOOWNEDPANE` + the four-test `NOGHOSTATALL` family |
| `S2-34` | `NOOWNEDPANE` NATURAL-b (tag as an unreferenced module constant) | CAUGHT, 1 failing | `NOOWNEDPANE` **alone** |
| `S2-35` | `MOVERSHAPE` NATURAL-a (adapter re-adds the ownership key) | CAUGHT, 2 failing | `MOVERSHAPE` emitted-key-set + read-set |
| `S2-36` | `MOVERSHAPE` NATURAL-b (adapter drops the base key) | CAUGHT, 16 failing | all three `MOVERSHAPE` tests; NON-DISCRIMINATING |
| `S2-37` | `PILLSWEPT` NATURAL-b (the reset regains a guarding parameter) | CAUGHT, 1 failing | the `PILLSWEPT` **arity** test alone |
| `S2-38` | `DESTROYEDMOVER` NATURAL-a (the 340ms settle fallback removed) | CAUGHT, 42 failing | all three `DESTROYEDMOVER` routes; NON-DISCRIMINATING |

**All eighteen of §10's mutants are now registered.** Recounted against §10 rather than
incremented: `NOGHOSTCLASS` 1, `NOOWNEDPANE` 2, `NOCLB` 2, `MOVERSHAPE` 2, `RECOVERYPARITY` 4,
`DESTROYEDMOVER` 3, `PILLSWEPT` 2, `BORROWEDREALSURVIVES` 1, `STALETOUCH` 1 = 18. The audit's F1
enumeration of the six absentees is confirmed complete.

⭐ **The audit's CRLF caveat does not apply to `tools/mutate.mjs`, and following it would have been
harmless but for the wrong reason.** `js/app.js`, `js/nav.js`, `js/swipe.js` and `js/browse.js` are
all CRLF, but `resolveAnchor` normalises `\r\n` to `\n` on BOTH the source and the `from`
(`tools/mutate.mjs`, and the same normalisation in `test/mutation-anchors.test.js`), so a
multi-line `from` built with `\n` is correct and `\r\n` would work identically. The caveat is true
of an ad-hoc applier that reads the file raw — which is what the audit used — and is false of the
registry. Verified by execution: all six anchors resolve, the anchors gate is green, and every
mutant applied.

⚠️ **Two of the six are non-discriminating, disclosed rather than repaired** — the treatment
`S2-29` already carries. `S2-36` also reddens `eslint: no errors in shipped app code`, MEASURED as
`js/app.js:540 no-unused-vars — 'baseOf' is assigned a value but never used`; `S2-38` reddens 42
tests because jsdom fires no `transitionend`, so every harness cell that advances a clock past a
settle depends on the fallback. In both cases the designated cells fire, so attribution is shared
rather than lost, and the measured sets are written into the registrations.

⭐ **A killer COUNT is meaningless without the scope it was taken over.** The audit measured
`S2-38` at "3 failing" and `S2-33` at "2 failing" over two test FILES; over the whole behaviour
suite they are 42 and 5. Neither number is wrong. A future reader comparing a fresh sweep against
either would conclude the registry had rotted.

### F3 — `MOVERSHAPE`'s key-set claim, and the counterexample that shipped uncaught

⭐ **Reproduced first, over a wider scope than the audit used.** `S2-39` — the adapter emitting a
third key with a **constant** value, `own: 'borrowed-real'` — was registered and swept against the
ENTIRE behaviour suite BEFORE the repair: **UNCAUGHT — not one test failed.** The suite at that
point was 880 tests, 879 pass, 0 fail, 1 skip. The audit's finding holds at full scope, not only
over the two files it ran.

**The repair, and why it is an addition rather than a narrowing.** The cell is now three tests and
they are a set:

1. **the EMITTED key set, over SOURCE** (new) — catches a key sourced from anything at all,
   including a constant, a computed name or a spread. This is the assertion §10 specifies and §13
   decision 20 rules on: over source, not over a runtime observer, because an observer for
   `d.movers` would add exactly the surface the pass exists to remove.
2. **the READ set of seam fields, at RUNTIME** (existing) — kept, because it catches a field that
   is read and DISCARDED, which a source assertion cannot see.
3. **the base offset reaching a real transform** (existing) — the behavioural cover for `base`.

After the repair, `S2-39` is CAUGHT by test 1 **alone** (1 failing). The claim the cell states is
now the claim it witnesses.

⛔ **The new reader is a scanner, so it has a fire drill, and the drill CAUGHT A REAL DEFECT IN IT
BEFORE ANY MUTANT DID.** The first form of the reader tracked bracket depth but not quote state,
so a comma inside a STRING VALUE at the entry's own depth split the key list and the cell would
have reported a bogus key set. Every case that happened to pass did so because its string sat
inside a call, one level deeper — the accident that makes a scanner defect invisible: the controls
someone thinks to write are the ones that sit where the bug is not. **The same accident then
happened a second time, on comment state — see §10.**

The drill is now 9 positive controls, 13 negative controls and 2 rot controls (zero sites and two
sites both refuse rather than assert over the first).

⚠️ **The new test's own honest limit**, stated in the file rather than left to be discovered: a
source assertion cannot see a key attached elsewhere at runtime, and it reads ONE expression. Its
fixture-sanity assertion is what stops that from being silent — a renamed or duplicated adapter
binding FAILS the cell rather than finding nothing and passing.

### F2 — registrations that cover a cell without naming it

The audit filed this for `DESTROYEDMOVER`. **Executing the neighbouring entries found three more
in the same class, one of them worse than the class.** Each is closed the same way: the measured
expected-killer set written into the registration.

| Entry | Measured killer set (2026-08-05, whole behaviour suite) | What was added |
|---|---|---|
| `#31 stage3: finalize does not end ownership` | 7 failing: all three `DESTROYEDMOVER` routes, the endpoint cell, `FILMSTRIPDRAG`, `SCOPE`, and eslint (`'endOwnership' is assigned a value but never used`) | `DESTROYEDMOVER` named — §10 NATURAL-c |
| `#113 S2-13 RESETCOVERSPAGES` | 2 failing: `RESETCOVERSPAGES`, `DESTROYEDMOVER.midscreen` | `DESTROYEDMOVER.midscreen` named — §10 NATURAL-b |
| `#20 the recovery stops restoring the session-start scroll` | 6 failing: `I20`, `NC`, all three `RECOVERYPARITY` routes, eslint (`'cur' is assigned a value but never used`) | `RECOVERYPARITY` named — §10 NATURAL-b; the unmeasured `SC` clause dropped |
| `#19 supersession stops releasing the old target listeners` | 2 failing: `I20`, the `STALETOUCH` split witness | `STALETOUCH` named — §10's only mutant for that cell |
| `#13 begin() stops hard-resetting a superseded session` | **1 failing: `RECOVERYPARITY.pillswept` — and nothing else** | see below |

⭐⭐ **`#13`'s designated killers were not merely missing, they were FALSE.** Its registered name
read "(-> I2/I20 pane test)". Those cells went with the panes; the entry's only killer in the whole
suite is `RECOVERYPARITY.pillswept`, a cell the name did not mention. It had been reporting
`caught` on evidence that had nothing to do with the guard it claimed. This is one step past the
audit's F2 class — F2 is a cell with no registration naming it; this is a registration naming
cells that no longer fire — and it was invisible to every mechanism in the tree, because nothing
compares a registration's stated killers against its measured ones. It is also the designated
mutant for `RECOVERYPARITY`'s NATURAL-d, so a future re-anchor made in service of the stale name
would have removed that cell's only evidence.

### Suite and scope

- Full suite after the work: **884 tests, 883 pass, 0 fail, 1 skip** (the one skip is the
  device-only cell). Before: 880 / 879 / 0 / 1. The four new tests are the emitted-key cell and
  its three drills.
- Targeted sweeps, all foreground, all restored, `git status` clean and `*.mutbak`-free after
  each: `13 19 20`, `31 113 151`, `145 146 147 148 149 150`, and `151` twice (before and after the
  repair). Every run reported `0 unapplied, 0 stale flags`; the only `uncaught` was `S2-39` before
  the repair, which was the point of running it.
- **No build-number bump.** Only `test/`, `tools/` and `Claude/` changed; the shipping-bump gate's
  own cells state that tests and tooling never require one, and nothing under `js/`, `css/`,
  `sw.js` or `index.html` was touched.

### What is still owed, and to whom

- **The durable answer to F1's class is NOT built and is not the test author's to build**: a check
  that every mutant a plan's `vitruvius-coverage` block declares exists in the registry. Plan §14
  already routes it, and this pass is its second piece of evidence. Until it exists, the same gap
  can reopen on the next plan without anything reddening.
- **A registration's stated killers are still not compared against its measured ones.** `#13` is
  the concrete instance. The measured sets are now written into the registrations that carry them,
  which is a record, not a mechanism.
- Audit findings **F4** (vacuous assertions and a dead helper in `test/`), **F5** (the
  coverage-audit glob matching two subjects) and **F6** (plan Status and board row disagreeing
  with reality) are untouched here — F4 is routed to a later purge, F5 and F6 to the assistant.

---

## 10. Round 2's N2, closed — the same blind spot, one step further (2026-08-05)

Closing `Claude/Mendeleev/AUDIT-swipe-declone-stage2-subtraction-r2.md` (verdict **ADEQUATE**)
finding **N2**. Authored against HEAD `b4c8cee`. Round 2's other findings are not the test
author's: **N1** routes to the planner, **N3** and **N4** to the assistant at step 8, **N5** to a
later purge. N1 is deliberately not re-derived here.

⭐⭐ **THE FINDING IS A FALSE ALARM ON CORRECT CODE, WHICH IS THE URGENT DIRECTION.** `scanBalanced`
tracked quote state and bracket depth but had **no comment state**, so an ordinary apostrophe in a
line comment — `// the gesture's borrowed element` — opened a phantom quote that never closed and
the reader mis-read a **correct** two-key literal. The recorded scar is that a gate which fires on
correct work gets switched off, and this project has lost gates that way three times. A cell that
reddens on a legitimate reformatting of the adapter gets loosened to unblock, and the property
goes with it.

⛔⛔ **AND THE DRILL'S OWN NAME ALREADY CLAIMED THE MISSING CONTROL.** The negative test was named
*"…mis-split by a comma, brace, colon **or comment** inside a value"* and contained no comment case
at all. That is worse than an unmentioned gap: the name is what a later reader checks instead of
the array. **The durable rule now stated in the file: when a case is added to that list, it is
added to the NAME and the ARRAY together.** This is the second instance of the identical accident
in one cell — the controls someone thinks to write are the ones that sit where the bug is not —
and it argues the reader's shape, not just its state machine, is the thing to distrust.

### What changed

- `scanBalanced` gains **comment state**, line (`//` to end of line) and block (`/* */`), and its
  callback signature becomes `onChar(c, depth, inQuote, inComment)`. Comment openers are tested
  **before** quote openers, so a `'` inside a comment cannot open a quote and a `//` inside a
  string cannot open a comment; order is the whole separation. Exactly one callback per character
  is preserved, which the key-extraction indexing depends on.
- The splitter **drops** comment text rather than accumulating it. Keeping it would put a
  comment's own colon ahead of the entry's real separator and yield a "key" that is a sentence.
- The negative drill gains the three controls its name promised — a line comment with an
  apostrophe, a line comment with a comma, a block comment with a brace and a quote — and its name
  is corrected to enumerate what it now contains.
- The positive drill gains the **false-negative half**, which is the reason the fix is comment
  STATE and not a narrower rule against the false alarm: a third key bracketed by block comments
  carrying apostrophes, and a third key below a line comment carrying one.
- Each negative row now asserts `Array.isArray(keys)` **by name** first. Before, a desynchronised
  reader failed the whole test as a bare `keys is not iterable`, with no indication which case did
  it — that is exactly how it failed when first reproduced.

### Executed

**Red first.** The three negative controls were added BEFORE the fix and run: `not ok — MOVERSHAPE
fire drill — NEGATIVE`, failing as `keys is not iterable` — the phantom quote had swallowed the
literal's closing brace. Reproduced on the real function, not argued.

**The discriminator, measured in both directions.** With the two comment-opener lines disabled and
everything else final: **13 tests, 11 pass, 2 fail** — the NEGATIVE drill fails on *a LINE COMMENT
containing an apostrophe* (the false alarm) **and the POSITIVE drill fails on *a third key hidden
behind BLOCK COMMENTS carrying apostrophes*** (the false negative: a literal with a genuine third
key read as the clean two-key set and passed). Comment state restored: **13 / 13 / 0 fail.** The
blind spot cut both ways, which is why it is closed with state rather than with a rule aimed only
at the alarm.

**Re-swept against the FINAL suite** — a mutation result stops being true when the suite changes.
Indices re-derived by name against the now-152-entry registry, foreground, `0 uncaught, 0
unapplied, 0 stale flags` over all seven; no `*.mutbak` or `*.sgbak` left behind:

| Mutant | Result | Killing cells |
|---|---|---|
| `S2-39` | CAUGHT, 1 failing | the `MOVERSHAPE` emitted-key-set test **alone** |
| `S2-35` | CAUGHT, 2 failing | emitted-key-set + read-set |
| `S2-36` | CAUGHT, 16 failing | all three `MOVERSHAPE` tests; non-discriminating, unchanged |
| `S2-33` / `S2-34` / `S2-37` / `S2-38` | CAUGHT, 5 / 1 / 1 / 42 failing | unchanged from §9 |

Full suite: **884 / 883 pass / 0 fail / 1 skip** — unchanged in count, because the work added
controls to existing drill tests rather than new test cases. No build-number bump: `test/` only.

---

## Handoff

- **Source artifact** — this file; the plan is `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md`.
- **Status** — §11 steps 4, 5, 5b and 6 are DONE and the code review's fixes have landed. The
  coverage audit's three test-author findings (F1, F2, F3) are CLOSED at §9, every new mutant
  executed, suite green at 884 / 883 / 0 fail / 1 skip.
- **Next owner** — **the assistant**, for §11 step 7 (the device re-confirm, UNRUN) and step 8
  (the records scrub, which now also carries audit findings F5 and F6).
- **Open, and not the test author's** — audit F4 (vacuous assertions and a dead helper in
  `test/`) is routed to a later purge. The durable answer to F1's class — a check that every
  mutant a plan's `vitruvius-coverage` block declares exists in the registry — is routed by plan
  §14 and is **not built**; until it is, the same gap can reopen on the next plan with nothing
  reddening.
- **Routed to the planner** — findings F-1, F-2, F-4, F-6 in §6. **F-5 is WITHDRAWN**: it was
  filed against a superseded revision of §10's `DESTROYEDMOVER` row (see §8).
- **Not audited here** — `Claude/Mendeleev/` audits this suite; the test author does not audit
  their own. §9 closes findings that audit raised; it does not grade the suite.
