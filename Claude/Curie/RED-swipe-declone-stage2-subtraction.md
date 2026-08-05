# RED suite — declone stage 2, step 11 (the subtraction pass) — test design

Type: test design (the test author)
Date: 2026-08-05
Plan of record: `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md` (RATIFIED 2026-08-05), §11 steps 4–5
Authored against HEAD `d8333b4`

---

## Index

1. What was authored, and where each cell lives
2. Red-at-HEAD, and what each red means
3. Executed mutation results — every mutant, by name
4. Mutants owed at step 6, with derived anchors
5. The collapse-probe measurement, and what it showed about these cells
6. Findings routed back — what the plan's enumeration missed
7. Departures from §10 as written, with the reason
8. Exit accounting — every §10 cell against its realization

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

⛔ **These are NOT registered and are NOT claimed to work.** Each targets code that does not exist
at HEAD, or a cell that is already red at HEAD so its redness would be unattributable. Registering
any of them now would rot `test/mutation-anchors.test.js` immediately. This is the same split
stage 6e used when `disposeOwnedPanes` did not yet exist: the test author authors the cells, the
builder registers the defenders that only exist after the build. **Every one must be executed and
observed to redden its named cell before it is written down as working.**

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

**`MOVERSHAPE` asserts the adapter's seam-field READ set, not the produced key set.** Stated in the
cell's own header, not buried here. The oracle hands the real `start()` a Construction whose movers
expose their real values through recording accessors; the classification, the resolution and the
destination render all stay production. It is 1:1 with the produced key set for every shape the
plan names — the adapter reads `ownership` iff it emits `own`, and reads `slot` iff it computes
`base` — and a build that read a field and discarded it would pass. The `base` half is
additionally covered BEHAVIOURALLY by a second test: a dropped base offset writes
`translateX(NaNpx)` onto a real element, which is asserted directly. See finding F-4.

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
| `NOGHOSTCLASS` | yes | `S2-25` executed, CAUGHT; fire drill positive ×3, negative ×1, all observed to fire |
| `NOOWNEDPANE` | yes, **red at HEAD** | 2 mutants owed at step 6 (§4a) — the gate is already red, so neither is attributable now; fire drill positive ×3 quoting forms, negative ×2 |
| `NOCLB` | yes | `S2-26`, `S2-27` executed, CAUGHT; fire drill positive ×2, negative ×2, the positive placed behind two `//`-bearing strings as [R4] specifies |
| `MOVERSHAPE` | yes, **red at HEAD** | 2 mutants owed at step 6; the `base` half additionally covered behaviourally |
| `RECOVERYPARITY` | yes — 3 routes + the pill witness split out | `NATURAL-a` = `S2-31` ✓, `NATURAL-b` = #16 ✓, `NATURAL-c` = `S2-32` ✓, `NATURAL-d` HEAD analogue = #13 ✓ (post-pass form owed) |
| `DESTROYEDMOVER` | yes — 3 destruction routes | `NATURAL-a` = `S2-13` ✓; the other two coordinates are fixtures, not mutants (F-5) |
| `PILLSWEPT` | yes, **arity half red at HEAD** | `NATURAL-a` = `S2-28` ✓; `NATURAL-b` owed at step 6 |
| `BORROWEDREALSURVIVES` | yes — `BR` relocated intact | `S2-29` ✓, non-discrimination disclosed with its measured killer set |
| `STALETOUCH` | yes — re-anchored **and split** | #21 ✓ against the split witness specifically |
| **M2** (step 4) | yes — the throw cell + the `keyFor` sibling negative | `S2-30` ✓ (the exact mutant the audit names) |

**Every applicable cell is either realized above or routed as a finding in §6. Nothing is left
unwritten and nothing is silently narrowed.**

---

## Handoff

- **Source artifact** — this file; the plan is `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md`.
- **Status** — §11 steps 4 and 5 DONE. The red suite is filed and committed; every registered
  mutant has been executed.
- **Next owner** — **the builder**, for §11 step 5b (the collapse-applied trial run) and step 6
  (the subtraction commit). §5 of this file is the trial run already performed against THIS
  suite: its failing set is enumerated and every item is accounted for.
- **Also owed to the builder at step 6** — the mutants and re-anchors in §4, and the two
  relocations left deliberately incomplete (§1).
- **Routed to the planner** — findings F-1, F-2, F-4, F-5, F-6 in §6. F-1 is a fourth executed
  instance of R10 and belongs in §8 D13b before step 6 begins.
- **Not audited here** — `Claude/Mendeleev/` audits this suite; the test author does not audit
  their own.
