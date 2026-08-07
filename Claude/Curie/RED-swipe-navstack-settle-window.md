# RED suite — the nav stacks survive a navigation inside the swipe settle window

Author: Curie (test design). Date: 2026-08-06. Plan of record:
`Claude/Plans/PLAN-swipe-navstack-settle-window.md`, cleared to build at round 3
(`Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r3.md`, verdict FORGE, reviewed at
`9a12a34`). Input HEAD for every measurement below: `aa69953` (`main` == `origin/main`, tree clean,
no `*.mutbak`, `tools/mutate.mjs` holding **152** registrations). The two commits between the FORGE
and this authoring (`b1cbcd0` → `aa69953`) name only `Claude/Campaigns/swipe-navstack.json` and
`Claude/Zelda/Board.md`, so no source moved under this work.
Suite file: `test/swipe-navstack-settle.test.js`.

Verdict: **RED_SUITE_READY**.

**This record covers three authoring rounds over the same suite file.** Sections 1–8 are the original
red suite (12 red cells + 7 live), measured at `aa69953` and built green at `8acbdff`; every count in
them is pinned to that HEAD and is not restated as current. **Section 9 is the post-review
amendment's one added cell** — `NAVAPPLIES`'s abort-token clause, plan §13 step 9a — authored and
measured at `c488677`. **Section 10 is the post-audit round's one added cell** — `NAVAPPLIES`'s
newNav clear clause with its precondition established, plan §17.5 item 1 — authored and measured at
`26cb18a`.

---

## Index

1. [What this suite proves](#1-what-this-suite-proves)
2. [Cells, and the red/green status of each](#2-cells-and-the-redgreen-status-of-each)
3. [The oracles, and how each was proven able to FAIL](#3-the-oracles-and-how-each-was-proven-able-to-fail)
4. [Mutation verification](#4-mutation-verification)
5. [Mutant registration is DEFERRED to the build, and why](#5-mutant-registration-is-deferred-to-the-build-and-why)
6. [Coverage-Model findings routed to the planner](#6-coverage-model-findings-routed-to-the-planner)
7. [Honest limits](#7-honest-limits)
8. [How the measurements were taken](#8-how-the-measurements-were-taken)
9. [Round 2 — the abort-token clause (plan §13 step 9a)](#9-round-2--the-abort-token-clause-plan-13-step-9a)
10. [Round 3 — the newNav clear clause, precondition established (plan §17.5 item 1)](#10-round-3--the-newnav-clear-clause-precondition-established-plan-175-item-1)

---

## 1. What this suite proves

The plan's §9 Coverage Model, realized as 19 executable cells in one file. The promise under test
(plan §5): *a committed gesture's stack mutation is applied only while the nav stacks still describe
the navigation that gesture planned; when they do not, the gesture mutates neither stack and the
settle reconciles whatever the stacks now name.*

Every cell is an INTEGRATION drive through `test/app-harness.js`, which boots the real `js/app.js`
and drives the real touch listeners and the real navigation intents — except `NAVTOTAL`, which the
plan declares a SOURCE cell and which is written as one.

`test/app-harness.js` is NOT edited by this suite. The one instrument it needs is test-local
(§3).

---

## 2. Cells, and the red/green status of each

Counts read from the runner, never inferred.

**As committed** (skips in place), `node --test test/swipe-navstack-settle.test.js`:
**19 tests / 6 pass / 0 fail / 13 skipped.**

**With every skip removed, against unmodified HEAD source:**
**19 tests / 7 pass / 12 fail / 0 skipped.**

**With every skip removed, against §4.1's prescribed build:**
**19 tests / 19 pass / 0 fail / 0 skipped** — so every red cell is satisfiable by the build the
plan specifies, and none is an unsatisfiable cell handed to the builder.

**Full repo suite with this file added:** **935 tests / 922 pass / 0 fail / 13 skipped**
(baseline before it: 916 / 915 / 0 / 1).

| # | Cell | Skip? | At HEAD | The assertion that reddens at HEAD |
|---|---|---|---|---|
| 1 | `NAVSTALE` drive F | yes | **RED** | recorded timer throws — `1 × "Cannot read properties of undefined (reading 'v')"`, expected `[]` |
| 2 | `NAVSTALE` drive F control | yes | **RED** | `nav=applied` token absent from the settle line |
| 3 | `NAVSTALE` drive B′ | yes | **RED** | recorded timer throws — same message, `1` against the control's `0` |
| 4 | `NAVSTALE` drive B′ control | yes | **RED** | `nav=applied` token absent |
| 5 | `NAVIDENT` drive I | yes | **RED** | landed screen `home`, expected `browse` |
| 6 | `NAVIDENT` drive I control | yes | **RED** | `nav=applied` token absent |
| 7 | `NAVIDENT` drive S | yes | **RED** | landed screen `browse`, expected `options` |
| 8 | `NAVIDENT` drive S control | yes | **RED** | `nav=applied` token absent |
| 9 | `NAVPAIR` drive T | yes | **RED** | landed screen `playback`, expected `options` |
| 10 | `NAVPAIR` drive T control | yes | **RED** | `nav=applied` token absent |
| 11 | `NAVRECONCILE` | yes | **RED** | landed screen `general`, expected `options` |
| 12 | `NAVRECONCILE` control 1 (plain commit) | **no** | green | — preservation control, green at HEAD and after the build |
| 13 | `NAVRECONCILE` control 2 (plain abort) | **no** | green | — preservation control |
| 14 | `NAVAPPLIES` back branch | **no** | green | — preservation cell |
| 15 | `NAVAPPLIES` forward replay branch | **no** | green | — preservation cell |
| 16 | `NAVAPPLIES` newNav branch (NP → chapter list) | **no** | green | — preservation cell |
| 17 | `NAVAPPLIES` abort | **no** | green | — preservation cell |
| 18 | `NAVTOTAL` (source) | yes | **RED** | `NO PREDICATE: js/app.js declares no \`const applies = …\`` |
| 19 | `NAVTOTAL` acceptance (extractor accepts spec, refuses `NAVTOTAL-a`) | **no** | green | — the proof cell 18 can fail |

Every red matches the plan's §13 red-first list: drive F reddens on the throw assertion **and** on
the arming assertion taken after one further navigation; drive B′ on the throw assertion (`1`
recorded against its control's `0`); drives I and S on the landed screen; drive T on the landed
screen (`playback`, control `general`).

`NAVAPPLIES`'s four **stack** cells carry **no skip by design**. They are the preservation cells —
the thing that stops the guard being written so tight the ordinary case breaks — so they must be live
from the moment they land, not from the moment the build opens.

**This table is the round-1 suite and stops at cell 19.** Cell 20, `NAVAPPLIES`'s abort-token clause,
was added at the post-review amendment and is §9.

---

## 3. The oracles, and how each was proven able to FAIL

This subsystem has already shipped an oracle that proved nothing (the adversary's "no `@reveal`
report ⇒ it threw"; that line is emitted when the observation window CLOSES, so its absence proves
nothing, and the first probe built on it had a failing control). Every oracle here is therefore
demonstrated, not asserted. **The `@reveal` report is not used as an oracle anywhere in this file.**

### 3.1 The throw oracle — instrumented, and live in EVERY build

`h.clock.advance` swallows a throwing timer callback (`test/app-harness.js`: `try { next.fn(); }
catch { }`), so a bare "the settle did not throw" assertion against the unmodified harness is
vacuous. The plan offered two routes; this suite takes the instrumented one and says so.

`instrumentTimers(h)` wraps `global.setTimeout` **after boot**, records a throwing callback, and
re-throws so the harness swallows it exactly as before. **`test/app-harness.js` is not edited** —
the instrument is test-local and restored in the same `finally` as `h.dispose()`.

Proven able to fail three ways:

1. **Across builds.** At HEAD the interfering drive records `1` and its own control records `0`, in
   the same run. A counter reading `0` everywhere would be the same vacuity relocated, and the
   control is where that shows.
2. **Within every single run, including the built one.** `assertInstrumentLive` schedules a
   deliberately-throwing timer through the SAME wrapped `setTimeout` and asserts the counter caught
   it. This is what keeps the post-build cells honest: after the build both drive and control
   legitimately read `0`, and without this probe that pair of zeroes would be green whether the
   instrument worked or not.
3. **Negatively.** The oracle the project was burned by is absent.

### 3.2 The landed-screen oracle — read from classes, and NOT first-match

The landed screen is read from the classes `js/nav.js` `setView` writes (`#home.parked`, every other
view `.hidden`). **No cell asserts geometry, stacking, or a measured rect** — jsdom has neither
layout nor paint.

⛔ **A defect found by measuring, not by reading.** The first draft returned the FIRST shown view by
iteration order. `Nav.overlayFilmstrip` un-hides BOTH panes for the duration of an Options↔sub
slide, so that reader named one of two shown screens and an assertion could pass on an ambiguous
state — and it did: the `fixtureSub` assertion read `options` for a state where `options` and
`general` were both shown, and every drive S / T / `NAVRECONCILE` cell was failing in its FIXTURE
rather than on its subject. The reader now reports EVERY shown view joined by `+`, so an ambiguous
state fails loudly, and `fixtureSub` settles the filmstrip (its 340 ms safety net, `js/nav.js:210`)
before asserting.

Proven able to fail: it returns six distinct values across the builds measured — `home`, `browse`,
`options`, `general`, `playback`, and the joined ambiguous form.

### 3.3 The `nav=` token oracle

Read off the real SWIPE settle line through the harness's `PBDebug` recorder. `navToken()` returns
`null` when the line exists but carries no token and a named marker when there is no such line, so
"absent", "no line" and "wrong value" are three distinguishable readings rather than one silent
pass. Proven able to fail: it reads `applied` on every control and `superseded` on every interfering
drive under the prescribed build, and `null` at `aa69953`, where no token exists at all.

⛔ **A DEFECT IN THIS ORACLE, found by measurement at round 2 and corrected there (§9.4).** The
round-1 reader matched `/\bnav=(applied|superseded)\b/` — an *enumeration of the values expected
then*. Any value added later reads `null`, which is indistinguishable from "the line carries no
token", so the sentence above was false outside those two values. The reader now captures whatever
value is present.

### 3.4 The two scroll oracles — the ONLY ones the red-first demonstration does not prove

`NAVRECONCILE`'s two scroll clauses are GREEN at HEAD, because at HEAD the settle writes its scroll
to a different screen. They are therefore defended by mutants and by in-suite positive controls, and
this record says so rather than letting them ride on the cell's red:

- **`#options.scrollTop === 300`** (no panel reset). Positive control: `NAVRECONCILE` control 1
  reads the SAME property and gets `0`, because an ordinary commit still resets its destination
  panel. Mutant `NAVRECONCILE-a` drives it to `0` on the superseded drive — MEASURED.
- **`window.scrollTo` delta `=== 0`** (no document-scroll restore). Positive control:
  `NAVRECONCILE` control 2 reads the SAME delta on a plain abort and gets `1`. Mutant
  `NAVRECONCILE-b` drives it to `1` on the superseded drive — MEASURED.

Both controls are unskipped, so both positive controls run from the moment this suite lands.

### 3.5 The source oracle (`NAVTOTAL`)

`appliesPredicate()` extracts the single `const applies = …;` declaration and refuses a source with
none, or with more than one (no silent first-wins). Cell 19 runs that same extractor over synthetic
predicate text WITH and WITHOUT the conjunct and asserts accept/refuse in both directions — so the
source cell is not a scan that could only ever say yes. That cell is unskipped and green at HEAD.

---

## 4. Mutation verification

Executed against nine builds of `js/app.js` on a copy of the tree outside the repo, control first.
Every mutant is killed, and by exactly the cell the plan assigns it.

| Mutant modelled | Cells reddened | Plan's expected killing cell | Match |
|---|---|---|---|
| *(control: prescribed build)* | none — 19/19 pass | — | — |
| `NAVSTALE-a` (identity conjunct deleted) | `NAVIDENT` I, `NAVIDENT` S, `NAVRECONCILE` | **`NAVIDENT`, not `NAVSTALE`** | ✓ |
| `NAVSTALE-b` (guard on the forward branch only) | `NAVSTALE` B′ (+ others, see note) | `NAVSTALE` | ✓ |
| `NAVIDENT-a` (identity weakened to `.v`) | `NAVIDENT` I **only** — NOT S | `NAVIDENT` | ✓ |
| `NAVTOTAL-a` (`navStack.length > 1` deleted) | `NAVTOTAL` **only** — no behavioural cell | `NAVTOTAL` and no behavioural cell | ✓ |
| `NAVTOTAL-b` (forward conjunct deleted) | `NAVPAIR` **only** | **`NAVPAIR`, not `NAVTOTAL`** | ✓ |
| `NAVRECONCILE-a` (no-reset option dropped) | `NAVRECONCILE`, on the `#options.scrollTop` clause | `NAVRECONCILE` | ✓ |
| `NAVRECONCILE-b` (abort scroll restore appended) | `NAVRECONCILE`, on the `window.scrollTo` clause | `NAVRECONCILE` | ✓ |
| `NAVAPPLIES-b` (conditional block neutralised) | all four `NAVAPPLIES` cells (+ 8 others) | `NAVAPPLIES` | ✓ |

Three results worth carrying forward to step 5a:

- **`NAVIDENT-a` reddens drive I and NOT drive S** — reproduced here independently. Drive I is the
  only drive where object identity and `.v` equality disagree, so **drive I may not be dropped**.
- **`NAVTOTAL-a` is indistinguishable from the prescribed build on every behavioural cell in this
  suite** — 18/19 pass, the one failure being the source cell itself. The plan's honesty label holds
  across this suite's drives, and this is a measurement, not a reading.
- **`NAVSTALE-a` additionally reddens `NAVRECONCILE`'s landed-screen clause.** That is an extra
  witness, not drift. The builder should expect it at step 5a and not read it as a drifted drive.

⚠️ **Two model caveats, stated so the builder does not over-read this table.** `NAVSTALE-b` and
`NAVAPPLIES-b` are *modelled* here (`applies` restructured to guard the forward branch only; the
conditional neutralised to `if (false)`), because the registrations do not exist yet — see §5. My
`NAVSTALE-b` model also drops the back branch's length conjunct, which is why it reddens more cells
than `NAVSTALE` alone; the registration the builder writes may be narrower. `NAVSTALE-c` is NOT
modelled: it requires the mutation to run while the throw is swallowed, and the assertion that
witnesses it — the arming clause taken after ONE FURTHER navigation — is present, red at HEAD, and
independently verified (§2 row 1).

---

## 5. Mutant registration is DEFERRED to the build, and why

**No registration is added by this commit. `tools/mutate.mjs` still holds 152.** The plan's §13 step
4 assigns the nine new registrations to the builder, and that assignment is correct for a mechanical
reason this record measures rather than asserts.

MEASURED, control first, on a copy of the tree outside the repo:

- pristine copy, registry untouched: `test/mutation-anchors.test.js` **6 tests / 6 pass / 0 fail**;
- the same copy with ONE of the nine (`NAVTOTAL-a`, anchored on the new predicate's back-branch
  line) added at HEAD: **6 tests / 5 pass / 1 fail**, `not ok 1 — every mutation anchor still
  matches the source it targets`, reported as ANCHOR NOT FOUND.

All nine anchor on source text §4.1 introduces, which does not exist at HEAD. Registering them here
would land a red gate on a tree whose build has not opened. They belong in the build's own commit,
taking the registry from 152 to 161 there.

---

## 6. Coverage-Model findings routed to the planner

One finding. It does not block the build and no plan edit is required before the builder starts; it
is recorded so the next reader does not re-derive it.

### C1 [Note / defect] — `NAVRECONCILE`'s §9 fixture, driven literally, is VACUOUSLY GREEN at HEAD

**MEASURED, not read.** §9's `NAVRECONCILE` fixture text says to drive §1's FORWARD sequence with
the mid-settle tap landing on a scroll-resetting screen. Driven exactly that way, every clause of
the cell is green at HEAD:

- the forward sequence THROWS at `js/app.js:1021` before the reconcile is reached, so no scroll is
  written at HEAD either — both scroll clauses pass;
- and with the interfering tap landing on the Options hub, the HEAD landed screen already equals the
  post-fix value, so the reconcile-target clause passes too.

A cell red on nothing is exactly what the plan's own oracle warning is about, so this suite does not
write it that way. The cell instead drives the NON-THROWING interference the model's dimension 8
already sanctions ("a commit whose reconcile lands on a scroll-resetting screen"): a bottom-nav
Options tap inside a back-commit out of a settings sub. That reaches the reconcile at HEAD and is
red-first on the reconcile target.

**A second measurement inside the same finding, and it is why the interference is `navTo` rather
than `openSub`.** The first redesign used `openSub` as the interferer. Under the PRESCRIBED build
the panel offset it seeded came back `0`, because `openSub`'s own deferred `overlayFilmstrip`
reconcile calls `applyScreen(currentDesc(), { render: false })` with `resetScroll` defaulting to
true and re-zeroes the panel it just opened. A cell written that way would have been **unsatisfiable
by any correct build** — the builder could not have greened it. `navTo` runs no filmstrip, so
nothing re-reconciles the panel afterwards, and the clause is satisfiable and mutation-defended.

**For the planner:** §9's `NAVRECONCILE` fixture sentence names a drive that cannot carry the cell.
Nothing downstream depends on the literal wording — the cell's dimension-8 claim is realized and
mutation-verified — so this is a correction to make when the plan is next touched, not a round 4.

---

## 7. Honest limits

- **Every finalize fires from the 340 ms fallback.** The on-device `transitionend`-vs-timer race is
  not represented. It changes *when* `runFinalize` runs, not what it reads.
- **No cell asserts paint, geometry or stacking**, and none is device-owed: the plan owes no device
  gate and this suite adds none.
- **`NAVTOTAL` is a SOURCE cell and is labelled one in the test itself**, with the drive set its
  honesty claim ranges over stated in the same comment (F, I, S, T, B′ — indistinguishable, never a
  claim about all reachable drives). The plan reviewer's 2333-sequence search is cited there as the
  wider bound; this suite does not re-run it.
- **`NAVPAIR` has one witness in this suite (drive T).** The plan reviewer measured the CLASS at 8
  witnesses among shipped controls, the cheapest being a bottom-nav tap followed by `#dgBack`. Drive
  T is the one the plan constructs; the alternatives are recorded in the cell's comment as
  alternatives, not obligations.
- **Whether drive T's two-tap interleaving occurs inside a real 340 ms window on a device is a
  reading, not a measurement**, and the plan records it as one. The cell's job is to keep the
  forward conjunct from being deleted, which it does whatever the field frequency.
- **The suite does not audit itself.** The coverage audit is the auditor's.

---

## 8. How the measurements were taken

Control first in every case. The repo was never written to except by this file and this record:
every transform ran on a copy of the tracked tree outside it
(`…\scratchpad\tSPEC`), `node_modules` reached by a directory junction, and `git status --porcelain`
in `C:/Users/nzilb/OneDrive/Desktop/TomeRoam` named no source, tooling or generated file before or
after any probe, with no `*.mutbak` anywhere.

`tools/mutate.mjs` was imported (it is CLI-guarded). **`tools/source-gate-sweep.mjs` was never
imported, because importing it mutates `js/app.js`.** `tools/mutation-sweep.mjs` was not run at all:
the registrations it would sweep do not exist yet (§5).

The nine builds of `js/app.js` were produced by an in-memory transform of §4.1's prescribed text
that refuses if any anchor does not occur exactly once, so a silently-misapplied variant cannot be
measured as a result.

**Every red and every green in this record was read from the runner's own count.** A module whose
CLI runs at import kills the runner and reports a green `# tests 1` for a file holding many; the
count is the only tell, and this file's is 19.

---

---

## 9. Round 2 — the abort-token clause (plan §13 step 9a)

Authored 2026-08-06 against HEAD `c488677` (`main` == `origin/main`, tree clean, no `*.mutbak`,
`tools/mutate.mjs` holding **161** registrations, build `2026-08-05.3`). Repo suite before this
cell: **935 tests / 934 pass / 0 fail / 1 skip**, count read from the runner.

`js/app.js` is **one identical blob at `8acbdff`, `e80fcbe` and `c488677`** — `git diff` between any
pair names no change to it — so the plan's "red on `e80fcbe`" and this record's "red at `c488677`"
are statements about the same source.

### 9.1 The cell

One test added to the `NAVAPPLIES` block of `test/swipe-navstack-settle.test.js`:

> `NAVAPPLIES (abort token) — an uninterfered ABORT reports nav=abort and NEVER a supersession,
> paired IN THE SAME RUN with an uninterfered commit reporting nav=applied`

It realizes §9's contract claim (c), dimension 4(c)'s third token value and dimension 10's device-log
oracle half. It ships behind `SKIP-PENDING-BUILD`; the builder lifts the skip at step 9b.

**§9's pairing requirement, and how it is satisfied.** The commit half is read **first**, by the
**same** reader, from the **same** recorded debug channel, in the **same** booted app, before the
abort half is read. A cell asserting only "the abort line reads `abort`" would be satisfied by a
token that read `abort` on every settle line — the same class of worthless observable the shipped
two-arm token is, inverted. Two fixture assertions run ahead of both, reading the statement's own
`${commit ? 'commit' : 'abort'}` interpolation rather than the token under test, so a token failure
and a drive that did not do what it was asked cannot be confused.

### 9.2 The symptom, driven and read — not inferred

Counts read from the runner in every row.

| Run | Source | Result |
|---|---|---|
| the one file, skip removed, in the repo | `c488677` | **20 tests / 19 pass / 1 fail / 0 skipped** |
| the one file, skip removed, control copy outside the repo | `c488677` | **20 tests / 19 pass / 1 fail / 0 skipped** |
| the one file, skip removed, copy with §4.1's three-arm token | amended | **20 tests / 20 pass / 0 fail / 0 skipped** |
| whole suite, control copy outside the repo, skip removed | `c488677` | **936 / 932 pass / 3 fail / 1 skip** — the 2 git-only gates **+ this cell** |
| whole suite, copy with §4.1's three-arm token, skip removed | amended | **936 / 933 pass / 2 fail / 1 skip** — the 2 git-only gates alone |
| whole suite, in the repo, skip in place | `c488677` | **936 / 934 pass / 0 fail / 2 skip** |

The failing assertion, verbatim from the runner: `expected 'abort'`, `actual 'superseded'`, on the
recorded line

```
#1 abort back books→home nav=superseded tgt=live:div.book sid=1
```

That line is an **uninterfered** abort with no mid-settle input of any kind. What actually happened
to the nav stacks during that gesture is asserted independently and green at `c488677` by the
unskipped `NAVAPPLIES (abort)` cell: neither stack was mutated, because a following back commit still
reaches `home`. So the token asserts a supersession on a gesture that provably never touched the
stacks and never held a claim for a newer navigation to invalidate.

The other two values were read in the same suite run rather than assumed: `applied` on every
uninterfered control, and `superseded` on the disturbed commit `NAVRECONCILE` drives — both green
at `c488677`, both unskipped.

### 9.3 How the oracle was demonstrated able to FAIL

Not asserted — read off one run. In the failing run, the **same** `navToken` reader **accepted**
`applied` on settle line 1 and **rejected** `superseded` on settle line 0. An oracle that could not
fail would have passed both; an oracle that failed on everything would have failed the first. One
reader, one run, one value accepted and one rejected.

The satisfiability half is the fourth and fifth rows of §9.2: with §4.1's prescribed token and
nothing else changed, the cell is **green**, so it is not an unsatisfiable cell handed to the builder
(the failure class §6's C1 records).

### 9.4 A defect in the round-1 oracle, corrected here

`navToken` matched `/\bnav=(applied|superseded)\b/`. Against the amended source it would have
returned `null` for `nav=abort` — indistinguishable from "the line carries no token" — and the cell
would have been **unsatisfiable by the very build that fixes the defect**. The reader now captures
whatever value is present (`/\bnav=(\S+)/`). The generalisation is the plan's own §9 lesson landing
in the test file: the token's value domain is decided by **two** bindings, `commit` and `applies`, so
a reader enumerating the values of one of them repeats, in the oracle, the defect the cell exists to
catch. Measured harmless to the ten cells already using it: the repo suite reads **0 fail** with the
change in place.

### 9.5 `NAVTOKEN-a` — the plan's claim, verified by execution

Plan §8.1 item 4 and §16 O3 claim that applying `NAVTOKEN-a` to the amended source reproduces the
reviewed build's `js/app.js` byte-for-byte. **Verified, with negative controls, on the tracked blob**
(`git show e80fcbe:js/app.js`, which equals HEAD's):

| Measurement | Result |
|---|---|
| two-arm token occurrences in the shipped source | **1** |
| three-arm token occurrences in the amended source | **1** (so the anchor is unique) |
| line delta, shipped → amended | **0** |
| `NAVTOKEN-a(amended)` vs shipped `js/app.js`, byte-for-byte | **identical** |
| CONTROL — a *different* two-arm mutant vs shipped | **not identical** |
| CONTROL — the amended source itself vs shipped | **not identical** |

**Its killing cell, measured rather than assigned.** `NAVTOKEN-a` applied to the amended source *is*
the source at `c488677`, and the whole suite on that source reddens **exactly one** cell of 936 — this
one — plus the two git-only gates that cannot pass outside a git tree. No mutation sweep was run and
no `*.mutbak` was created anywhere; the identity above makes the sweep unnecessary for this mutant.

**Blast radius of the token change, measured for the builder.** `test/swipe-navstack-settle.test.js`
is the **only** consumer of the `nav=` token in `test/` or `tools/` — an executed grep for `nav=`
across both returns nothing else but `data-nav=` selectors.

### 9.6 The registration is DEFERRED to the builder, and this is why

**MEASURED, control first, on a copy outside the repo.** `NAVTOKEN-a`'s anchor is text §4.1
introduces, which does not exist at `c488677`:

| Tree | `test/mutation-anchors.test.js` |
|---|---|
| control — pristine registry, `c488677` source | **6 tests / 6 pass / 0 fail** |
| `NAVTOKEN-a` registered, `c488677` source | **6 tests / 5 pass / 1 fail** — `not ok 1 — every mutation anchor still matches the source it targets`, reported as ANCHOR NOT FOUND and naming `NAVTOKEN-a` |
| `NAVTOKEN-a` registered, amended source | **6 tests / 6 pass / 0 fail**; `MUTATIONS.length` **162** |

Registering it in this commit would land a red gate on a tree whose amendment build has not opened.
Plan §13 step 9b already assigns the registration to the builder, and this measurement is why that
assignment is correct. The registration text measured above, which the builder may take as written:
`from` = the three-arm token substring, `to` = the two-arm token substring — a single-line anchor
that resolves uniquely and needs no `occurrence`.

### 9.7 Honest limits of this round

- **Nothing was measured about a device.** The clause is a jsdom integration drive; it asserts a
  recorded diagnostic string, never geometry or paint.
- **The abort drive is one shape of abort** — a left-edge back gesture released back inside `THRESH`.
  Other abort routes (a cancelled touch, an abort on the forward edge) are not driven here. The
  token's abort arm reads a single binding, `commit`, which is fixed at release and before the settle
  window opens, so no interleaving can change which arm it takes; that reasoning is the plan's (§9
  dimension 3) and is a reading, not something this round measured.
- **The plan's §13 step 9a is satisfied; step 9b is not this seat's.** The source at HEAD still emits
  the two-arm token.
- **This suite is not audited by its author.** The coverage audit is the auditor's.

### 9.8 How this round's measurements were taken

Control first in every case. The repo's `js/app.js` and `tools/mutate.mjs` were never written to:
every transform ran on a copy of the tracked tree outside the repo
(`…\scratchpad\tTOK`), `node_modules` reached by a directory junction. `git status --porcelain`
in the repo named only `test/swipe-navstack-settle.test.js` and this record before and after every
probe, and no `*.mutbak` exists anywhere. `tools/mutate.mjs` was imported (it is CLI-guarded);
**`tools/source-gate-sweep.mjs` was never imported, because importing it mutates `js/app.js`**;
`tools/mutation-sweep.mjs` was not run at all. Every count above was read from the runner's own
totals — a module whose CLI runs at import kills the runner and reports a green `# tests 1` for a
file holding many, and the count is the only tell. This file's is **20**, and the repo suite's
is **936**.

---

## 10. Round 3 — the newNav clear clause, precondition established (plan §17.5 item 1)

Date: 2026-08-07. Input HEAD for every measurement in this section: `26cb18a` (`main` ==
`origin/main`, tree clean, no `*.mutbak`, `tools/mutate.mjs` holding **162** registrations, build
`2026-08-05.4`). Commissioned by plan §17.5 item 1, which the plan's §17 ruling derived from
`Claude/Mendeleev/AUDIT-swipe-navstack-settle-window-2026-08-07.md`.

### 10.1 The defect this cell closes

`NAVAPPLIES (newNav branch)` asserts that no forward gesture arms after a Now Playing → chapter-list
commit, and the suite credits the assertion. Its drive reaches Now Playing through `#player` →
`openNowPlaying` (`js/app.js:182`, `js/app.js:2751`) → `navTo`, and `navTo` empties `fwdStack` in the
same statement (`js/app.js:141`). The clear inside the commit branch (`js/app.js:715`) therefore has
nothing to clear on that drive, so the cell cannot fail: **the precondition it needs is never
established.** The audit measured the consequence — deleting that clear reddens no behavioural cell
anywhere in the suite.

### 10.2 The cell

One cell added to `test/swipe-navstack-settle.test.js`:
`NAVAPPLIES (newNav branch, NON-EMPTY fwdStack) — a NP → chapter-list commit reached with forward
history clears it, so no forward gesture arms after it (mutant NAVFWDCLEAR-a)`.

Drive: plan §17.1 route A, shipped gestures only. Now Playing → chapter list (right-edge commit);
chapter list → Now Playing (left-edge back commit, whose back branch pushes the chapter list onto
`fwdStack`, `js/app.js:714`); Now Playing → chapter list again. The third commit reaches the `newNav`
arm with `fwdStack` non-empty because that arm precedes the forward-replay arm on the right edge
(`js/app.js:444` ahead of `js/app.js:445`).

Oracle kind: **feature oracle** — the forward history the user can reach, executed and read as
whether a shipped right-edge gesture goes live. No consistency oracle, no geometry.

The precondition is **read, not assumed**: the back commit's settle line must report
`commit back files→nowplaying nav=applied`, and on the back branch `nav=applied` is the app's own
report that `fwdStack.push(navStack.pop())` ran.

Status on shipped source: **GREEN**, no skip. It is a preservation cell of the same shape as the
other three `NAVAPPLIES` stack cells, which carry no skip either; its red demonstration is under the
mutant, not against HEAD.

### 10.3 How the oracle was demonstrated able to FAIL, in the same run

`fwdGestureArms(h, el)` is a boolean reader, and one that returned `false` unconditionally would
green this cell forever. The **same function** is therefore run first at a state where a forward
gesture must go live — home, with `fwdStack` holding `books` after a committed back-swipe — where it
must read `true`, and then at the subject state where it must read `false`. One reader, one run, one
value accepted and one rejected. Under `NAVFWDCLEAR-a` the run reaches the second reading, so the
positive control is confirmed passing in the same execution that produces the failure.

### 10.4 The acceptance split, REPRODUCED — not inherited from §17.2

Plan §17.2 states a pre-measured acceptance split. It was re-run here from scratch on copies of the
tracked tree outside the repo, control first, before the cell was authored. Three probe cells sharing
one assertion — one at the empty-`fwdStack` state, one at route A's precondition, one at route B's:

| Source | Probe result |
|---|---|
| Shipped `js/app.js` | **3 tests / 3 pass / 0 fail** |
| W1 (`fwdStack.length = 0` deleted from the `newNav` commit branch) | **3 tests / 1 pass / 2 fail** — the empty-`fwdStack` probe passes; both route probes fail on the arming assertion (`expected false, actual true`) |

Route B's shipped book menu read `["Download book", "Manage downloads", "Reset Progress"]` and route
A's settle lines read `#1 commit fwd nowplaying→files nav=applied` then
`#2 commit back files→nowplaying nav=applied`, both matching §17.1's recorded readings.

**The authored cell then reproduces the split against the shipped companion cell**, in one file, in
one run:

| Source | `test/swipe-navstack-settle.test.js` |
|---|---|
| Shipped | **21 tests / 21 pass / 0 fail / 0 skip** |
| W1 | **21 / 20 / 1 / 0** — the ONE failure is the new cell, on the clause assertion (`expected false, actual true`); `NAVAPPLIES (newNav branch)`, the empty-`fwdStack` drive, PASSES in the same run |

That is plan §17.2's acceptance bullet, met exactly.

### 10.5 The audit's W1 suite figure, re-measured, and what changes

Full-suite set subtraction on the same two copies:

| Copy | Full suite |
|---|---|
| Clean, **before** this cell | **936 / 933 pass / 2 fail / 1 skip** |
| Clean, **with** this cell | **937 / 934 / 2 / 1** |
| W1, **with** this cell | **937 / 930 / 6 / 1** |

The two failures common to every out-of-repo run are the git-only gates (`every hook script is
EXECUTABLE in git's index`, `THE REAL ARTIFACT: this repo's own history passes the gate`), which
cannot pass in a tree with no `.git`. Subtracting this cell, the W1 delta is the same three
source-text gates the audit and §17.2 both name, so both figures are confirmed. **With this cell the
W1 delta gains a fourth entry, and it is behavioural**: `swipe-navstack-settle.test.js` is not in
`tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES` list. `NAVFWDCLEAR-a` therefore now has exactly one
behavioural killer, which is what plan §17.5's ordering exists to produce.

### 10.6 The registration is DEFERRED to the builder, and this is why

`NAVFWDCLEAR-a` is **not** registered in this commit.

- Plan §17.5 assigns it as item 2, to the builder, explicitly after item 1.
- `tools/mutate.mjs` is outside this seat's writable surface for this work.
- **Measured, so the deferral costs nothing:** `test/mutation-anchors.test.js` reads **6 tests /
  6 pass / 0 fail** in the repo with this cell in the tree. This commit adds no registration and
  changes no source, so it cannot rot an anchor. The anchor collision §17.2 warns of —
  `NAVSTALE-b` and `NAVAPPLIES-b` both carry the `newNav` commit line inside their multi-line `from`
  anchors (`tools/mutate.mjs:363` and `:379`) — is a hazard the builder meets while writing the new
  registration, not a state this commit produces.

The transform the builder needs, measured to apply uniquely against `js/app.js` at `26cb18a`:
`from` = the single line
`          else if (cur.newNav) { navStack.push(cur.dest); fwdStack.length = 0; }   // NP → chapters is a fresh forward nav`,
`to` = the same line with the `fwdStack` clear removed.

### 10.7 Honest limits of this round

- **Nothing was measured about a device.** jsdom has no layout or paint, so no drag geometry —
  threshold, velocity, committed distance — is modelled. The cell asserts call outcomes and state.
- **`fwdStack` is never read directly.** Its state is inferred from two behavioural readings: the
  app's own `nav=applied` settle line on the back branch, and whether a shipped gesture arms. Under
  W1 the arming reads `true` after the commit, and the commit's only `fwdStack` write is the deleted
  clear, so the stack is proven non-empty at the commit.
- **Route B is measured but not shipped as a cell.** Plan §17.2 retains it as a second witness only;
  its probe reproduced the split here and route A is the drive.
- **Nothing in plan §17 was found wrong.** Every figure re-measured in 10.4 and 10.5 matched the
  plan's, including the menu item list, the route-A settle lines, and the audit's W1 suite delta.
- **This suite is not audited by its author.** The coverage audit is the auditor's.

### 10.8 How this round's measurements were taken

Control first in every case. The repo's `js/app.js` and `tools/mutate.mjs` were never written to:
every transform ran on copies of the tracked tree (`git archive HEAD`) outside the repo, with
`node_modules` reached by a directory junction, so no probe could write to the repo.
`git status --porcelain` in the repo named only `test/swipe-navstack-settle.test.js` and this record
before and after every probe, and no `*.mutbak` exists anywhere in the repo.
**`tools/source-gate-sweep.mjs` was never imported, because importing it mutates `js/app.js`**;
`tools/mutation-sweep.mjs` was not run. Every count above was read from the runner's own totals — a
module whose CLI runs at import kills the runner and reports a green `# tests 1` for a file holding
many, and the count is the only tell. This file's is **21**, and the repo suite's is **937**
(936 pass, 0 fail, 1 skip).

---

**Handoff:** the test author → **the builder** (plan §17.5 item 2: register `NAVFWDCLEAR-a` in
`tools/mutate.mjs`, registry **162 → 163**, using the transform in 10.6; run it foreground and
individually; confirm no `*.mutbak`) → **the planner** (item 3: §9 dimension 4(a)'s newNav sub-cell
moves from PARTIAL to SWEPT). The suite is filed at `test/swipe-navstack-settle.test.js` and this
record is its companion.
