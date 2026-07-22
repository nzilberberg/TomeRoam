# Code Review — .234 re-review (mutation-sweep `--affected` selector)

Type: code-review
Prior-review: 009dbc9-selector-fix.md
Range: 90a139c..009dbc9 (the single fix commit .234; HEAD code == this commit — later commits are records/hooks only, no build bump)
Reviewer: Poirot
Date: 2026-07-21
Plan of record: between-stages fix work — closes the .233 review's F-cf1..F-cf4. Stage 5 NOT started.

## Verdict

**Fix-then-ship.** CORRECTED 2026-07-22 after an external reviewer (ChatGPT) surfaced a Significant
false-clean this pass MISSED and this reviewer had wrongly certified as verified. The parser drops the
rename SOURCE when the rename appears in the **worktree column (Y)** rather than the index column (X) —
reachable via `mv` + `git add -N`, which git reports as ` R new.js\0old.js\0`. See finding F-y. The
original "Ship" below was WRONG: it rested on an X-column-only probe generalized to a claim about all
worktree renames. The rest of the pass (stamps, tests, orientation, isCli, CI backstop) stands.

**CLOSED in .235 (2026-07-22).** F-y fixed: the rename branch now tests both status columns
(`x==='R'||x==='C'||y==='R'||y==='C'`). Regression added — a Y-column parse fixture, a copy-in-Y fixture,
and an end-to-end `mv`+`git add -N` case — all three red before the fix, green after; full suite 656 pass /
0 fail / 2 pre-existing known-red todo. W17 and W19 resolved below.

Original pass narrative (retained; its Ship conclusion is superseded by F-y):

A re-review is a full coverage-ledger pass over the whole changelist, not a glance at the fix — and this
pass reproduced the prior clean bill from evidence generated THIS session, not from the prior casebook:

- **All 9 selector tests pass**, including the non-skipped end-to-end case that drives a throwaway real
  repo (git present this session, node v22.23.1 at `C:\Users\nzilb\tools\node-dist`).
- **Orientation re-anchored independently**: a throwaway repo built this pass emits `R  new.js\0old.js\0`
  — destination first, bare source as the next NUL token. The parser's load-bearing `dest\0src` assumption
  is confirmed against a fact generated here, not inferred and not taken from the prior review.
- **F-cf1 is non-vacuous**: the parser's `parseChangedFiles` was extracted verbatim and mutated (drop the
  `files.add(src)` rename-source branch); the F-cf1 assertion `has('old.js')` flips true→false, and the
  multi-record fixture drops rename source `c.js` — the exact under-selection direction the test defends.
- **Build stamps coherent**: build.json, index.html meta + every `?v=`, js/debug.js BUILD, sw.js BUILD all
  read `2026-07-19.234`; the three stamp-file diffs are stamp-only (no markup smuggled); the lockstep guard
  build.test.js runs 8/8 green this pass.
- **Reassuring comments verified**: mutation-sweep.mjs:30 ("mutate.mjs guards its CLI, so this import has
  no side effect") is true — mutate.mjs:249–250 guards the CLI, and the 9 tests importing the module
  launched no sweep. The `-z` "verbatim, no quoting/escaping/arrow" comment is confirmed by the real-git probe.
- **isCli guard safe in BOTH directions for real usage**: both invocations (package.json script; CI
  ci.yml:47) run it as `node tools/mutation-sweep.mjs`, so the basename-suffix test fires (sweep runs); a
  test import does not fire it (no sweep). The false-negative "CLI run silently no-ops" direction requires a
  non-standard basename that neither real caller uses.
- **CI backstop confirmed**: the ci.yml `mutation-sweep` job runs the FULL sweep (no `--affected`) with no
  `continue-on-error` — a hard gate. This bounds the local selector's worst case to "slower local feedback,"
  never "undefended guard ships."

The pass CONVERGED — one full ledger pass, zero findings a competent reviewer would require changed before
submit. That convergence, not a satisfied feeling, is the honest evidence of "no issues."

## Prior-review watch-list — disposition

| Item | State | Evidence |
|---|---|---|
| W8 — stage-5 scope (pane builders move into swipe.js) | OPEN (carried) | Stage 5 not started; gated on user go. Untouched by .234. |
| W11 — O1 malformed live descriptor throws in start() | OPEN (carried) | Unchanged; .234 does not touch swipe.js/start(). |
| W16 — stage 5/6 host-field re-introduction tripwire | OPEN (carried) | Stage 5/6 not started; the exact-key test/gate remains the tripwire. Untouched by .234. |
| W18 — `changedFiles` command/`parseChangedFiles` grammar coupled by `=v1 -z` | OPEN (carried) | The end-to-end test pins the command as written; re-confirmed this pass. Live until the command is ever parameterized. |
| W12 — run the suite before clearing | RESOLVED (re-confirmed) | node present; 9 selector tests + build.test.js executed green this pass; F-cf1 mutation-verified non-vacuous. Full 42-mutation sweep is CI-by-design. |
| W17 — `--affected` false-clean cases (F-cf1..F-cf4) | RESOLVED (re-confirmed) | Orientation re-probed, parser correct, 9 tests green, non-vacuous by mutation. |

## Coverage Ledger

Rows = every changed symbol (mechanical from the diff of 009dbc9). Dimensions: **C** correctness/data-flow
· **RT** reference-teardown · **OL** object-lifetime · **TS** teardown-symmetry · **DR** deferred-resource
cancel · **RC** reassuring-comment verified · **ABS** absolute-claim checked. Cells (new grammar): **✓**
cleared by an EXECUTED command cited this pass · **~** cleared by READING/REASONING only (unverified by
execution) · **n/a** · **FIND**. No empty cells. Every `✓` is backed by a command run this pass (the 9
selector tests, build.test.js, the real-git orientation probe, the parser mutation probe — all cited in
the evidence notes and the verdict); every `~` by reading the current file in full this pass
(tools/mutation-sweep.mjs, test/mutation-sweep-select.test.js read whole; tools/mutate.mjs:249–250; the
four stamp diffs) — no diff-hunk or recalled reads. F-y is the cell where the ORIGINAL pass wrote `✓` on
reasoning; under this grammar it would have been `~` (unrun) and the miss visible.

| # | Changed symbol (mechanical from the diff) | C | RT | OL | TS | DR | RC | ABS |
|---|---|---|---|---|---|---|---|---|
| 1 | tools/mutation-sweep.mjs header + helpers note (comment) | n/a | n/a | n/a | n/a | n/a | ~ | ~ |
| 2 | MUTATIONS/DEFAULT_FILE import moved above helpers | ✓ | n/a | n/a | n/a | n/a | ~ | n/a |
| 3 | parseChangedFiles() — NEW | **F-y (Sig)** | n/a | n/a | n/a | n/a | ✓ | **F-y (Sig)** |
| 4 | changedFiles(cwd=ROOT) — rewritten to `-z` command | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 5 | targetsOf — relocated, exported, logic unchanged | ✓ | n/a | n/a | n/a | n/a | n/a | n/a |
| 6 | affectedIndices() — NEW | ✓ | n/a | n/a | n/a | n/a | n/a | n/a |
| 7 | isCli guard + `if (isCli) {` wrapper | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 8 | run/restore/SIGINT relocated inside the guard | ~ | n/a | n/a | n/a | ~ | ~ | n/a |
| 9 | `--affected` block now calls affectedIndices | ✓ | n/a | n/a | n/a | n/a | ~ | n/a |
| 10 | test/mutation-sweep-select.test.js — 9 tests (new) | ✓ | n/a | n/a | n/a | n/a | ~ | ~ |
| 11 | build stamps: build.json, index.html, debug.js, sw.js | ✓ | n/a | n/a | n/a | n/a | ✓ | n/a |

RT/OL/TS n/a across the board: the changed code is a pure git-porcelain parser plus a test and stamp bumps
— no listeners, timers, rAF, or persistent cross-scope state. DR has one cell with content (row 8): the
sweep's `restore()` on SIGINT (line 115) and in the `finally` (lines 174–176) still restores the working
tree on every exit; relocating them inside `if (isCli)` did not change that — read in full (`~`, not run).

**`~` accounting (verdict duty under the new grammar):** the `~` cells are all structural reads with no
executable claim left open — row 8 (SIGINT/`finally` restore path: read, not triggered; the tests do not
exercise Ctrl-C, and driving it buys nothing over reading the two-line `finally`), and the RC/ABS comment
cells (rows 1, 2, 9, 10) where the reassurance is a code comment verified by reading its subject. None is a
behavioural or enumerable claim, so none is an unrun probe — the class F-y belonged to, and F-y is now a
finding, not a `~`. No `~` cell blocks the verdict.

**Evidence behind the load-bearing cells:**
- **Row 3 parseChangedFiles (C/ABS = F-y Significant)** — the rename branch tests only `rec[0]` (the
  index column X). This is a DEFECT: git also reports a rename in the worktree column (Y) — `mv` +
  `git add -N` yields ` R new.js\0old.js\0` (X=space, Y=R). The parser then skips the source-consuming
  `++i`, adds `new.js`, and on the next iteration treats the bare source `old.js` as a status record →
  `old.js.slice(3)` = `.js`. The rename SOURCE `old.js` is never returned, and a garbage `.js` leaks. A
  mutation on the pre-rename path is silently skipped by `--affected` → false-clean — the same class .234
  set out to close, reopened on Y. CONFIRMED by executing the real parser against real-git bytes this pass.
  The earlier assertion in this note — "worktree-only renames appear as `D`+`??`" — was FALSE and was the
  exact reasoning-instead-of-executing that let the miss through. Fix: `if (x==='R'||x==='C'||y==='R'||
  y==='C')`. The `dest→src order / verbatim paths / multi-record consumption` sub-claims remain verified.
- **Row 4 changedFiles (C/ABS)** — safe failure direction confirmed: `execSync().toString()` decodes `-z`
  bytes as UTF-8 (café.js verbatim in the e2e test). Over-selection (extra swept mutations) is the only
  degradation; under-selection is not reachable by this parser.
- **Row 7 isCli (C/RC/ABS)** — read line 109 + both real invocations. Fires for `node
  tools/mutation-sweep.mjs` (npm + CI); does not fire on import (proven — the 9 tests ran no sweep).
- **Row 11 stamps (C/RC)** — all four stamps == .234; three stamp-file diffs are stamp-only; lockstep guard
  green (build.test.js 8/8 this pass).

## Findings

| # | Severity | Finding |
|---|----------|---------|
| F-y | Significant | `parseChangedFiles` (mutation-sweep.mjs:57) tests only the index column (`rec[0]`) for `R`/`C`, so a rename reported in the WORKTREE column (`mv` + `git add -N` → ` R new.js\0old.js\0`) desyncs the token loop: the source `old.js` is dropped and a garbage `.js` leaks. A mutation targeting the pre-rename path is silently skipped by `--affected` — a false-clean, the class .234 was meant to close, reopened on Y. CONFIRMED by executing the real parser on real-git bytes. Fix: also test `rec[1]` (`\|\| y==='R' \|\| y==='C'`) and add a Y-column regression case (fixture + end-to-end `mv`+`add -N`). Reachable but backstopped by CI's full sweep, so Significant, not Critical. Credit: external reviewer (ChatGPT); this seat missed it. |
| O3 | Observation | (carried, re-confirmed) The `isCli` guard (mutation-sweep.mjs:109) uses a basename-suffix test rather than the stricter `import.meta.url === pathToFileURL(process.argv[1]).href`. Proven safe both directions for the two real invocations. Take-it-or-leave-it. |
| O4 | Observation | `changedFiles` uses `execSync(...).toString()` with Node's default 1 MB `maxBuffer`. A `git status -z` output over 1 MB (thousands of changed files) would make execSync THROW, aborting `--affected` loudly — never a silent false-clean. Implausible on a local pre-commit check and safe in direction; noted for completeness, not required. |
| O2 | Observation | (carried from .233, unchanged, pre-existing/out of scope) run-checks.mjs has no installed-deps guard: on a fresh clone before `npm ci`, the pre-commit battery blocks until deps are installed. Correct-by-intent with `--no-verify`/`hooks:off` escapes. |

## The prediction

The selector is correct and the parser is honest about the format it depends on, so the failure mode to
watch is the format assumption drifting out from under `parseChangedFiles`, which hard-codes the `-z`
porcelain-v1 record grammar (XY-space-path; rename/copy source as the next bare token). The one dangerous
direction is under-selection — a swept mutation silently skipped — and only two things reach it, neither
defended by a test today: (1) a future edit that drops `=v1` or `-z` from the command string in
`changedFiles` while `parseChangedFiles` still expects NUL records — the parser then sees one giant token
and selects nothing, a silent false-clean; (2) the command being parameterized/templated away from the
exact flags. Both are backstopped at the CI level: the ci.yml `mutation-sweep` job runs the FULL sweep as a
hard gate, so an under-selecting LOCAL `--affected` degrades to slower local feedback, not a guard shipping
undefended. The tripwire is W18: if that command string is ever parameterized, extend the end-to-end test
to pin the exact `=v1 -z` flags.

## Watch-list

Carries forward every OPEN item from the prior review. The next review MUST forward every OPEN item below.

- [W8] (open) Stage-5 scope — the pane builders (ghostApp/snapshotHome/overlayEl/appViewEl/npPillClone)
  move into swipe.js. Watch the builder-move for behaviour drift on seams checkable only by decision. Stage
  5 is gated on the user's go.
- [W11] (open, minor) O1 (prior) — confirm start()'s behaviour on a thrown `classifyTransition` (malformed
  live descriptor) is acceptable, or wrap the classify call. Low priority. Untouched by .234.
- [W16] (open) Stage 5/6 host-field re-introduction — `sourceHost`/`destinationHost`/`sameBrowseHost` must
  return to the classification ONLY in the commit that adds their consumer + test. The exact-key test/gate
  is the tripwire. Untouched by .234.
- [W18] (open, observation) `changedFiles` command string and `parseChangedFiles` grammar are coupled by the
  `=v1 -z` flags; the end-to-end test pins them as written. If that command is ever parameterized, extend
  the test to assert the exact flags — dropping `-z` silently yields a false-clean (see prediction).
- [W19] (resolved: .235 — rename branch now tests both columns `x||y R/C`; regression added: Y-column parse
  fixture, copy-in-Y fixture, and end-to-end `mv`+`git add -N` case, all red before the fix and green after)
  `parseChangedFiles` dropped a worktree-column rename source → false-clean.
- [W12] (resolved: re-confirmed this pass — 9 selector tests + build.test.js green, F-cf1 mutation-verified
  non-vacuous; full 42-mutation sweep is CI-by-design) Execute the suite before clearing.
- [W17] (resolved: .235 — both the X-column (.234) and the Y-column (.235, F-y) false-clean cases are
  fixed; the XY-matrix regression is green on the fixed parser) `--affected` false-clean cases.
