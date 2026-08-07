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

`NAVAPPLIES` carries **no skip by design**. It is the preservation cell — the thing that stops the
guard being written so tight the ordinary case breaks — so it must be live from the moment it lands,
not from the moment the build opens.

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
`null` when the line exists but carries no token, so "absent" and "wrong value" are distinguishable
and the HEAD red is `expected 'applied', actual null` rather than a silent pass. Proven able to
fail: it reads `applied` on every control and `superseded` on every interfering drive under the
prescribed build, and `null` at HEAD.

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

**Handoff:** the test author → **the builder** (remove the skips first, drive them red, then build
to green; then the coverage auditor). The suite is filed at
`test/swipe-navstack-settle.test.js` and this record is its companion.
