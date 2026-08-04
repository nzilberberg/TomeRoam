# CURIE — Test design: the three tail items of Stage A1b

Type: test-design (tail close-out against a filed coverage audit and a plan step; the stage is
already shipped and device-passed)
Date: 2026-08-04
Audits of record: `Claude/Mendeleev/AUDIT-one-screen-type-a1b.md` (note N1) and
`Claude/Mendeleev/AUDIT-one-screen-type-a1b-r2.md` — ADEQUATE (note N4)
Plan of record: `Claude/Plans/PLAN-one-screen-type.md` — §9, §13 step 10a, §14
Prior test design for this stage: `Claude/Curie/one-screen-type-a1b-gapfill-test-design-2026-08-03.md`
Authored from HEAD `46df26f`.

Status: **CLOSED** — all three items authored, six mutants registered and **executed**, suite green.

Scope: test code and the mutation registry only. No file under `js/` or `css/` was changed. Nothing
here asserts geometry, stacking, occlusion or paint — jsdom has none of them, and a cell green
because a rect is zero is a false witness.

⛔ **Mutants are cited by NAME throughout.** The registry is 146 entries and inserting an entry
shifts every index above it; this project has already been burnt once by a stale index citation.

---

## 1. What was authored

| Item | Source | Where it landed | Mutants registered |
|---|---|---|---|
| Step 10a | plan §13 / §9 | `test/np-hidden-writer-set.test.js` — two assertions in the existing `NPHIDDENWRITER` synchrony cell | `NPHIDDENWRITER-e`, `NPHIDDENWRITER-e'` |
| N1 | audit round 1 | `tools/mutate.mjs` (registry only) + the `NPUNTOUCHED` cell note scrubbed | `one-screen-type NPFIXED`, `NPINSET`, `NPZ60` |
| N4 | audit round 2 | `test/np-hidden-writer-set.test.js` — `ALIAS_WRITE_SUFFIX`, `RESIDUALS`, scope cell, selftest | `NPHIDDENWRITER-f` |

---

## 2. Step 10a — §9's edge-5 re-open condition, made mechanical

### The claim

Plan §9 rules edge 5 of its `browseWillHide` enumeration — a supersession while Now Playing is the
current screen, `applyScreen(currentDesc(), …)` at `js/app.js:459` — deliberately uncovered, on the
ground that edge 5's `setView` body is byte-identical to edge 4's, which `NPPARKS` already drives.
§9 reduces that byte-identity to two source predicates, and until now neither was asserted
anywhere: the ruling was enforced by a re-check at plan step 16, which runs once and then closes
with the plan.

1. `setView` is declared with exactly one parameter (`js/nav.js:45`).
2. `applyScreen`'s Now Playing branch passes it the literal `'nowplaying'` and no options
   (`js/nav.js:150`).

### The cell

Both assertions were added to `NPHIDDENWRITER`'s existing synchrony test, which already locates and
reads `setView`'s body out of `js/nav.js`. Oracle kind: source scan — the same kind as the three
assertions beside them, and correctly not a runtime cell, because what is being asserted is that no
*channel* exists, which no execution of the current code can exhibit.

Each failure message names §9's ruling and states that the green is what keeps edge 5 uncovered, so
a red reads as "the ruling has lapsed; route it to the planner" rather than as a bug report.

### ⭐ The locator had to change first, and this is the load-bearing finding

The cell located `setView` with `src.indexOf('function setView(v)')` — the parameter list spelled
into the fixture guard. Under the acceptance mutant that locator returns `-1` and the cell fails on
`assert.ok(start >= 0, 'fixture: js/nav.js must declare setView')`. The cell would have gone red
**without either predicate having been evaluated** — a red obtained for the wrong reason, which is
no evidence at all, and precisely the failure mode this seat's own discipline names ("a test targets
its cell and fails for its reason").

The locator is now `/function\s+setView\s*\(([^)]*)\)/` — signature-agnostic, with the captured
parameter list becoming the subject of assertion 1. Confirmed by execution: under the mutant the
cell fails on assertion 1's message, not the fixture guard.

### Two mutants, not one, and the reason is mechanical

`assert` throws on the first failure. Under a mutant that breaks both predicates, assertion 1 fires
and assertion 2 is never reached — leaving the second assertion with no evidence it can fail, which
is note N1's complaint one level up. So:

- **`NPHIDDENWRITER-e`** (two-part, `js/nav.js`) — `setView(v)` → `setView(v, opts)` **and** the NP
  branch threads `opts` through. Kills assertion 1.
- **`NPHIDDENWRITER-e'`** (`js/nav.js`) — the NP branch threads `opts` while `setView` still takes
  one parameter. Legal JS, silently ignored, behaviourally inert. Kills assertion 2.

### The acceptance criterion was not literally met, and it is disclosed rather than tuned away

§13 step 10a asks for a mutant that reddens this cell **alone**. Measured: each of `-e` and `-e'`
also reddens `NPHIDDENWRITER`'s identity cell, on Direction 1 — registered identity entry #11 is the
whole `applyScreen` NP-branch line, so a changed argument list makes the derived site match no
registered entry and read as a new, unregistered one.

That firing is correct: the identity inventory is doing its stated job. The repair is **not** to
shorten entry #11's registered text so the mutant slips past it — all thirteen entries register a
whole line, and re-cutting one to suit a mutant is tuning the baseline to the test. Attribution was
established the stronger way instead, by reading each mutant's synchrony-cell failure message and
confirming it is the step-10a assertion's own text.

### The residual, restated in the cell

§9 lists three ways the byte-identity could break. These two predicates close the second (a new
option reaching the park/hide block) and the third (a caller-specific hook) **by construction**. The
first — a branch inside `setView` keyed on module-scope state that only the supersession path sets —
would leave both predicates green and still break the identity. No such branch exists at HEAD;
closing it would need an identifier-set pin over the whole body. Stated in the cell so its silence
is not read as coverage.

---

## 3. N1 — `NPUNTOUCHED`'s three undefended assertions

`NPUNTOUCHED` is a preservation cell: green at HEAD by construction, because every property it
asserts must remain true. For such a cell a registered mutant is the only evidence its assertions
can fail at all. `NOSETTINGSBG-b` defended the `background` assertion and `NPNAVBAR` the
navbar-outstacks one; `position: fixed`, `inset: 0` and `z-index: 60` had none.

Three mutants registered, each deleting exactly one declaration from `.nowplaying`'s shared
declaration line in `css/app.css` (unique in the file): `one-screen-type NPFIXED`, `NPINSET`,
`NPZ60`. All three are invisible to every unit cell — jsdom has no layout and no compositing — so
each kill is attributable.

**No assertion was found unmutatable.** The one that needed checking was `z-index: 60`, because the
cell also computes `navZ > npZ` from the same declaration: with `z-index` deleted, `zIndexOf` returns
`null`, `70 > null` coerces to `true`, and that comparison still passes. Confirmed by execution —
`NPZ60` fails on the `z-index: 60` match assertion alone, which is the assertion N1 named.

The cell's own note claimed those three had no registered mutant. That claim is now false and was
scrubbed in the same change (HEAD holds only current truth).

---

## 4. N4 — `NPHIDDENWRITER`'s alias disclosure

The audit measured, against the shipped `ALIAS_WRITE_SUFFIX`, that
`npEl.style.cssText = 'display:none'` and `npEl.setAttribute('style', …)` both escape while all
five listed routes are caught, and that `style.cssText` is live first-party code
(`js/debug.js:431`, `:570`, `:733`). It graded this a Note, not a Gap: zero such sites exist on any
NP path, the escape needs one of two already-registered aliases, and every naming route is still
caught. It is a completeness defect in the cell's own **disclosure**, which is the standard that
cell sets for itself.

Applied the audit's one-line fix: the suffix's style arm widened to `(?:display|cssText)` and its
`setAttribute` arm to `['"](?:class|style)`.

**The two routes were deliberately NOT added to S2's `WRITE_PATTERNS`.** An alias is a reference the
derivation has already proven points at `#nowplaying`, so any hiding route through it counts; site-
inventorying `cssText` would derive every DOM-builder call in `js/debug.js` and demand a registered
reason for each. Same treatment as `className =`. That asymmetry is now stated at the suffix.

**The bound is measured, not read.** The selftest executes both newly-caught routes and both routes
that still escape (`el.style.setProperty('display','none')` and a computed `el.style['display']`),
and the escapes are named as a new `RESIDUALS` entry that the scope cell now requires to be present.
A future widening that closes one of them must move the residual with it.

`NPHIDDENWRITER-f` proves the widened arm bites on real source rather than only in the selftest:
the `npEl` alias hides the element through `style.cssText`. Distinct from `NPHIDDENWRITER-b`, which
drives the same alias through `classList.add`.

---

## 5. Executed evidence

Registry after the change: 146 entries. Indices below are **derived at this commit and are not
citable later** — re-derive from the name.

| Mutant | Index at this commit | Result | Killed by |
|---|---|---|---|
| `one-screen-type NPFIXED` | 96 | caught, 1 failing | `NPUNTOUCHED` — on `position: fixed` |
| `one-screen-type NPINSET` | 97 | caught, 1 failing | `NPUNTOUCHED` — on `inset: 0` |
| `one-screen-type NPZ60` | 98 | caught, 1 failing | `NPUNTOUCHED` — on `z-index: 60` |
| `NPHIDDENWRITER-e` | 103 | caught, 2 failing | `NPHIDDENWRITER` synchrony (assertion 1, by message) + identity (Direction 1) |
| `NPHIDDENWRITER-e'` | 104 | caught, 2 failing | `NPHIDDENWRITER` synchrony (assertion 2, by message) + identity (Direction 1) |
| `NPHIDDENWRITER-f` | 105 | caught, 1 failing | `NPHIDDENWRITER` alias closure |

Every kill above was confirmed twice: once by `tools/mutation-sweep.mjs` (caught/uncaught) and once
by applying the mutant and **reading the failing assertion's message**, because a kill count cannot
tell an intended assertion from a fixture guard. That second read is what caught the step-10a
locator defect in §2.

Suite at the final state: 835 tests, 834 pass, 0 fail, 1 skipped.

---

## 6. Build number

No build bump. Every changed file is under `test/`, `tools/` or `Claude/`, which
`tools/hooks/shipping-change-bumps-check.mjs` excludes from the shipping set by construction: tests
and tooling are code by the project rule but their bytes never reach a device.

---

## 7. Found in passing, named by none of the three items

- `test/one-screen-type.test.js`'s CELL MAP entry for `NPUNTOUCHED` describes the cell as asserting
  "its inset, its z-index and its background" — the cell also asserts `position: fixed`, and has
  since before this change. It is a wording drift inherited from plan §14's row, not a coverage
  defect. Left untouched: §14 is the planner's.
- The `NPHIDDENWRITER` identity cell keys registered entry #11 to the whole `applyScreen` NP-branch
  line, which makes any edit to that line — including edits the gate has no opinion about — read as
  an unregistered new site. That is the disclosed reason `-e`/`-e'` cannot kill the synchrony cell
  alone. It is a property of the registration convention, uniform across all thirteen entries, and
  changing it is a design question for the whole inventory rather than something to settle here.
