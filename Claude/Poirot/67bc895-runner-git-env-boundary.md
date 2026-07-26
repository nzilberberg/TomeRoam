# Code Review — Pre-commit runner boundary git-env unset (`run-checks.mjs`) — build 2026-07-26.244

Type: code-review
Prior-review: 0049a13-swipe-stage5-buildconstruction.md
Range: 6915985..67bc895 (the single commit 67bc895; HEAD)
Reviewer: Poirot
Date: 2026-07-26
Plan of record: none (no Vitruvius contract — a tooling-hardening belt). Brief = memory
`git-subprocess-in-tests-must-strip-git-dir` + the per-call fix already shipped in `e1a0c46`
(`mutation-sweep.mjs` `cleanGitEnv`). Build log: `Claude/Brunel/run-checks-git-env-boundary-2026-07-26.md`.

The room was laid out for me kindly — a build log naming the exact assertion that reddens, a commit
message stating the belt is faithful. I took the address and none of the conclusions, and I put the belt
on the bench myself: ran the guard green, neutered the boundary and watched it turn red, restored it, and
walked the real repo's own config to be sure the throwaway repos never touched it.

## Verdict

**SHIP (PASS).** The belt is correct: `runChecks()` deletes all seven git location vars from
`process.env` as its first action — before it reads git config and before it spawns any child — so every
step inherits a sanitized environment. All seven vars are covered; mutating `process.env` is sound here (no
step legitimately needs a location var); the `isCli` guard keeps the battery off on import and on at both
hook entry points; the exit-code contract (0/1), step set, and output are unchanged. The regression test is
genuine and proven non-vacuous: it reddens when the boundary unset is removed, and its control genuinely
corrupts a throwaway repo. One **Minor** (the test's seven-var completeness claim is only exercised for two
of the seven) and two Observations are recorded; none is a defect that ships broken code, and the Minor
replicates the coverage shape of the already-shipped sibling test, so nothing here is a blocker.

## Findings table

| # | Severity | Finding |
|---|---|---|
| 1 | Minor | The regression test's env-scan (`run-checks-strips-git-env.test.js:83`) asserts each of the seven vars "was stripped from the runner env", but `poison()` sets only `GIT_DIR`/`GIT_INDEX_FILE`. For the other five the assertion is vacuously true, so dropping one of them from `GIT_LOCATION_VARS` would leave the test green. Recommended (non-blocking) strengthening; production strips all seven correctly. |
| 2 | Observation | The build log's bench-proof and the test comments name the "ambient repo is UNTOUCHED" assertion (`:79`) as the one that reddens on neuter; the assertion that actually fires first is `:77` ("the probe write landed in the cwd work repo"). Both are treatment assertions; the load-bearing claim (treatment reddens, fail 1) is true and verified. |
| 3 | Observation | `GIT_LOCATION_VARS` is duplicated between `run-checks.mjs` and `mutation-sweep.mjs`. Considered and left: sharing it would couple the fast pre-commit runner to `mutation-sweep.mjs` (whose module load pulls in the mutation registry via a top-level `await import`), and the two functions differ in contract (`stripGitLocationEnv` mutates in place; `cleanGitEnv` returns a copy). |

## The investigation

**The intent (Phase 1).** One coherent change: strip the seven git "location" vars from `process.env` once
at the runner boundary so a git-shelling test operating on a throwaway repo cannot escape to the real repo
via an ambient `GIT_DIR` — the structural belt to `mutation-sweep.mjs` `cleanGitEnv`'s per-call suspenders.
The script body is refactored into an exported `runChecks()` behind an `isCli` guard so the regression test
can import it without launching the battery. Scope matches the description; the rest of the diff is the
build-stamp bump (.243→.244) and three records.

**The belt's correctness (`run-checks.mjs:32–96`, read in full).** `GIT_LOCATION_VARS` (line 32) lists all
seven — `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_PREFIX`, `GIT_COMMON_DIR`,
`GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES` — matching `mutation-sweep.mjs:75–76` and the
commit message exactly. `stripGitLocationEnv` (line 38) iterates the list and `delete`s each key,
defaulting to `process.env`. In `runChecks` (line 65) the FIRST statement is
`stripGitLocationEnv(process.env)` (line 68), which runs BEFORE the `gitcfg('tomeroam.hooks')` config read
(line 71) and BEFORE the `spawnSync` loop (line 81). Children are spawned without an explicit `env`, so
they inherit the mutated `process.env` — the sanitized environment. The ordering is correct: strip, then
read config, then spawn.

**Mutating `process.env` vs a per-spawn clean env — sound here.** The belt's mechanism is precisely that
the mutation is inherited by every child, so a per-spawn clean env would not achieve the "future test can't
re-leak" property. I verified no check step legitimately needs a location var: `stamp-build.mjs` does not
shell git at all (grep: no `git`/`execSync`/`spawnSync`); `eslint`/`tsc` do not touch git; and the only two
tests that shell git — `mutation-sweep-select.test.js` and `run-checks-strips-git-env.test.js` — build
throwaway repos and pass explicit `{ cwd }` + a stripped env, so neither relies on inheriting an ambient
`GIT_DIR`. Stripping the shared env therefore breaks nothing in the current step set. (The toggle-OFF path
now also strips before returning 0, but the process exits immediately with no children spawned, so that is
a harmless no-op.)

**The `isCli` guard (line 95).** `process.argv[1] && import.meta.url.endsWith(basename(argv[1]))` — the
same pattern `mutation-sweep.mjs:139` uses. Confirmed both directions: run directly, `argv[1]` basename is
`run-checks.mjs`, `import.meta.url` ends with it → `isCli` true → battery runs. Imported by the test,
`argv[1]` is the test runner, not `run-checks.mjs` → `isCli` false → battery does NOT run (proven: the test
imports the module and completes without launching the suite). Both production entry points —
`tools/hooks/pre-commit` (`exec "$NODE" "$DIR/run-checks.mjs"`) and `tools/hooks/claude-precommit.mjs`
(`spawnSync(process.execPath, [run-checks.mjs])`) — invoke it as a SUBPROCESS, hitting the CLI path with no
args, so both run `runChecks()` with the toggle respected. No importer of the module runs the battery.

**The `opts.steps` seam (lines 65–77).** A defensible production seam, not a test-only smell. When `steps`
is injected the `tomeroam.hooks` toggle is skipped — correct semantics: the toggle governs whether to run
the DEFAULT battery, and an explicit step injection is an explicit request to run those steps. No
real-world bypass hazard exists: to reach this path a caller must import the module and call
`runChecks({ steps })`, which only the regression test does; both production entry points spawn the CLI
(no args). The exit-code contract holds for injected steps too (returns 0/1).

**Refactor fidelity (diff read in full).** The old top-level toggle→`exit(0)` becomes the `if (!steps)`
block returning 0; the step loop is byte-identical except `process.exit(1)`→`return 1` and a trailing
`return 0`; the step set (`stamp`, `lint`, `typecheck`, `tests`) and all output strings are unchanged.
Confirmed on the bench: `node tools/hooks/run-checks.mjs` → `✓ stamp`, lint/typecheck skipped (not
installed; CI enforces), `✓ tests`, `tomeroam pre-commit checks: PASS`, exit 0.

**The regression test (`run-checks-strips-git-env.test.js`, read in full; executed).** The treatment drives
a naive git-write probe (a temp script doing `git config user.email` with NO env sanitizing) through
`runChecks({ steps: [...] })` under a poisoned ambient `GIT_DIR`, and asserts the write landed in the
throwaway `work` repo and the ambient repo is untouched. The control runs the SAME probe WITHOUT the
boundary and asserts it DID hijack the ambient repo. All repos are throwaways under `os.tmpdir()`.
- **Green:** `node --test test/run-checks-strips-git-env.test.js` → 1 pass / 0 fail. The control assertion
  (`:90`) passing confirms the poison is real (the naive spawn hijacks the throwaway ambient repo).
- **Non-vacuous (neuter):** commented out `stripGitLocationEnv(process.env)` at `:68` → the test reddens
  (`fail 1`). The assertion that fires is `:77` — `emailOf(work)` expected `probe@wrote`, got
  `work@work.work`: with the belt gone the probe inherited `GIT_DIR`=ambient and its write was diverted
  away from `work` (and onto ambient). This is a genuine treatment reddening — the belt is load-bearing —
  though it is `:77`, not the `:79` "ambient untouched" assertion the build log and comments name (Finding
  2). Restored the line; `git diff --stat` clean afterward.
- **The seven-var completeness gap (Finding 1):** the behavioral probe exercises only `GIT_DIR` (a
  `git config` write is governed by `GIT_DIR`, not the index). The env-scan at `:83` is the only assertion
  touching the full list, but `poison()` sets only `GIT_DIR`/`GIT_INDEX_FILE`, so for the other five vars
  `process.env[k] === undefined` is trivially true regardless of whether `stripGitLocationEnv` covers them.
  A mutation removing, say, `GIT_WORK_TREE` from `GIT_LOCATION_VARS` survives green. The identical
  limitation exists in the shipped sibling `mutation-sweep-select.test.js` (it poisons only
  `GIT_DIR`/`GIT_INDEX_FILE` too), so this is the repo's established, already-accepted coverage shape rather
  than a regression introduced here — which is why it is Minor and non-blocking, not a defect. A one-line
  strengthening (set all seven in `poison()`) would make `:83` honest to its own comment.

**Real repo integrity (Phase 4).** After every run including the neuter: `git config --get core.bare` is
unset (exit 1 — not bare) and `git config --get user.email` is `nzilberberg@gmail.com`. The neuter's
corruption landed only in a temp `ambient` repo under `os.tmpdir()`, never the real repo.

**Full suite.** `node --test test/*.test.js` → 684 tests, 682 pass, 0 fail, 2 todo (the pre-existing
`KR-swipe-scroll-restore` + `KR-swipe-source-rerender`). Matches the build log's count.

**Stamp files.** `build.json`/`sw.js`/`js/debug.js` are pure `.243`→`.244` bumps; `index.html`'s 70 changed
lines are all `?v=…243`→`.244` cache-bust query strings (grep for any changed line lacking `243`/`244`
returned nothing). Records are plain and professional (§6.5); the DecisionLog entry is appended (not
inserted), dated, single-fact, current-truth (§6.2).

## Coverage Ledger

Every changed symbol/file enumerated from the diff × the review dimensions. `✓` = cleared by a command run
this pass (cited below); `~` = cleared by reading/reasoning; `n/a` = not applicable.

| Symbol / file (changed) | Correctness / data-flow | Boundary ordering / env-inheritance | Contract preserved (exit/steps/output) | Test-can-fail | Records / honesty |
|---|---|---|---|---|---|
| `run-checks.mjs` `GIT_LOCATION_VARS` | ~ all 7, matches `mutation-sweep.mjs` + commit msg (read) | n/a | n/a | ~ only 2 of 7 guarded (Finding 1) | ~ comment accurate |
| `run-checks.mjs` `stripGitLocationEnv` | ✓ deletes every listed key; runner env cleared (test `:83` + neuter) | ✓ mutates `process.env`; children inherit (CLI run + suite green) | n/a | ✓ neuter reddens (executed) | ~ |
| `run-checks.mjs` `runChecks` | ✓ strip-first ordering; toggle path; steps seam (read + CLI run) | ✓ strip before gitcfg + spawn (read) | ✓ exit 0/1, output unchanged (CLI run exit 0) | ✓ green + neuter-red (executed) | ~ |
| `run-checks.mjs` `defaultSteps` (extracted) | ✓ step set identical to prior (diff + CLI run) | n/a | ✓ `stamp/lint/typecheck/tests` unchanged (CLI run) | n/a (prod) | ~ |
| `run-checks.mjs` `isCli` guard + CLI entry | ✓ on as CLI / off on import (both hook wrappers spawn; test imports) | n/a | ✓ `process.exit(runChecks())` (CLI run exit 0) | ✓ import doesn't run battery (test green) | ~ |
| `run-checks.mjs` `gitcfg` (moved) | ~ unchanged body; now called after strip (read) | ✓ inherits sanitized env (read) | n/a | n/a | ~ |
| `test/run-checks-strips-git-env.test.js` | ✓ control genuinely corrupts throwaway; treatment pristine (test green) | ✓ drives real boundary via `runChecks` (test green) | n/a | ✓ non-vacuous: neuter → fail 1 at `:77` (executed) | ~ comment/build-log name wrong assertion (Finding 2) |
| `build.json`/`sw.js`/`js/debug.js`/`index.html` | ~ stamp `.243`→`.244` only; index.html pure cache-bust (grep) | n/a | n/a | ✓ suite incl. `build.test.js` green (suite run) | ~ |
| `Claude/Brunel/…-2026-07-26.md` | n/a | n/a | n/a | n/a | ~ honest; one imprecise assertion name (Finding 2) |
| `Claude/Decisions/DecisionLog.md` | n/a | n/a | n/a | n/a | ~ appended, dated, current-truth (§6.2) |
| `Claude/Zelda/Board.md` | n/a | n/a | n/a | n/a | ~ tactical record (Zelda's craft) |

Commands cited for `✓` cells (all run this pass, `NODE=C:/Users/nzilb/tools/node-dist/node.exe`):
- `$NODE --test test/run-checks-strips-git-env.test.js` → 1 pass / 0 fail (green; control confirms poison real).
- Neuter: commented out `run-checks.mjs:68` `stripGitLocationEnv(process.env)` → same command → `not ok 1`,
  fail 1, `AssertionError` at test `:77` (`expected 'probe@wrote'`, `actual 'work@work.work'`). Restored;
  `git diff --stat` clean.
- `$NODE --test test/*.test.js` → 684 tests, 682 pass, 0 fail, 2 todo.
- `$NODE tools/hooks/run-checks.mjs` → `✓ stamp`, lint/typecheck skipped, `✓ tests`, `PASS`, exit 0.
- `git config --get core.bare` → unset (exit 1); `git config --get user.email` → `nzilberberg@gmail.com`
  (real repo intact after all runs).
- `git show 67bc895 -- index.html | grep` for changed lines lacking `243`/`244` → none (pure cache-bust).

## The prediction (Phase 6)

Nothing here is scheduled to break. The belt makes the whole ambient-`GIT_DIR` class structurally
impossible for any child of this runner, and the suspenders (`cleanGitEnv`) still cover a git call made
outside it — belt-and-suspenders, both now structural. The one place a future failure could hide is Finding
1: if someone later trims a var from `GIT_LOCATION_VARS` (say `GIT_WORK_TREE`, which also overrides worktree
resolution), the regression test stays green because it only exercises `GIT_DIR`/`GIT_INDEX_FILE` — the
belt would develop a silent hole for that var and the guard would not notice. The primary corruption vector
(`GIT_DIR`) remains fully guarded regardless, which is why this is a defense-in-depth strengthening and not
a live break. The second place to watch is drift between the two identical `GIT_LOCATION_VARS` lists
(Observation 3): if git ever adds an eighth location var, both lists must be updated, and nothing couples
them.

## Watch-list

Carries forward every OPEN item from `0049a13-swipe-stage5-buildconstruction.md`; the next review MUST
forward every OPEN item below. (W21 was resolved/graduated in 0049a13 and correctly falls off.)

- [W11] (open, minor) O2 — `start()` calls `buildConstruction` un-wrapped; a malformed live descriptor
  would throw out of the touchmove handler. Unreachable in normal flow; untouched by 67bc895 (this commit
  is tooling only, no `js/` production change). Confirm acceptable or wrap.
- [W16] (open — `sameBrowseHost` half) The Stage-6 host field `sameBrowseHost` must return to the
  classification ONLY in the commit that adds its consumer (the abort re-render) + test. Untouched by
  67bc895.
- [W18] (open, observation) `changedFiles`/`parseChangedFiles` grammar coupling in `tools/mutation-sweep.mjs`.
  Untouched by 67bc895 (which touches `run-checks.mjs`, not `mutation-sweep.mjs`).
- [W20] (open, standing) On-device parity verification for the swipe arc is owed. Not relevant to this
  tooling change, which has no on-device surface.
- [W22] (open, → Mendeleev) Coverage gaps O3/O4: F5a payload-passthrough not pinned; F1a's "L3 forgets a
  key" half has no registered mutation. Untouched by 67bc895.
- [W23] (open, minor — this build, 67bc895) Finding 1 — `run-checks-strips-git-env.test.js:83` asserts all
  seven location vars were stripped but only `GIT_DIR`/`GIT_INDEX_FILE` are set by `poison()`, so five of
  the seven are checked vacuously; a var dropped from `GIT_LOCATION_VARS` survives the test green. Same
  coverage shape as the shipped sibling `mutation-sweep-select.test.js`. Non-blocking; strengthen by
  poisoning all seven. Production strips all seven correctly.
- [W24] (open, observation — this build, 67bc895) Finding 2 — the build log
  (`Claude/Brunel/run-checks-git-env-boundary-2026-07-26.md`) and the test comments name the `:79` "ambient
  untouched" assertion as the one that reddens on neuter; the assertion that actually fires first is `:77`.
  Substance is correct; the named line is imprecise. Correct the record when next touched.

```json
{"persona":"poirot","stage":"tooling","input_artifact":"67bc895","verdict":"PASS","blocking_ids":[],"return_to":"none"}
```
