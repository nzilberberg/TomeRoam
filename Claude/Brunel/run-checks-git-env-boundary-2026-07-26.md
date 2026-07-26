# Brunel build log — pre-commit runner boundary git-env unset

**Date:** 2026-07-26
**Build:** `2026-07-26.244`
**Type:** tooling hardening (structural belt for a known corruption class)

## Brief

No Vitruvius plan of record governs this change; the brief is the hazard writeup in memory
`git-subprocess-in-tests-must-strip-git-dir` plus the per-call fix already shipped in commit `e1a0c46`
(`tools/mutation-sweep.mjs` `cleanGitEnv`, threaded through the git-shelling tests). Because there is no
`vitruvius-contract`/`vitruvius-ledger` for this change, Gate A's contract reconciliation does not apply;
the build still follows red-first proof, bench verification, and honest handoff.

The hazard: git runs hooks with `GIT_DIR`/`GIT_INDEX_FILE` exported into the environment, and every child
a hook spawns inherits them. An ambient `GIT_DIR` OVERRIDES `cwd` for repo resolution, so a throwaway-repo
`git init`/`git config`/`git add` a test runs (passing only `{ cwd }`) silently operates on the hook's REAL
repo — which once flipped this repo to `core.bare=true` and leaked junk into its config. `cleanGitEnv` fixes
this per call, but the RUNNER did not strip the vars, so a FUTURE git-shelling test that forgot to call
`cleanGitEnv` could re-expose the real repo.

## What was built

- `tools/hooks/run-checks.mjs`: added `GIT_LOCATION_VARS` (the seven git location vars, matching
  `mutation-sweep.mjs`) and `stripGitLocationEnv(env = process.env)` (exported). Refactored the top-level
  script body into an exported `runChecks({ steps } = {})` whose FIRST action is
  `stripGitLocationEnv(process.env)` — the boundary belt, run once before reading git config or spawning any
  step. Every spawned child (the whole battery) then inherits a location-free env. A CLI guard
  (`isCli`, mirroring `mutation-sweep.mjs`) runs `runChecks()` only when executed directly, so the file can
  be imported by its test without launching the battery.
  - `opts.steps` overrides the default battery and is used only by the regression test to drive a single
    probe step through the same hardened boundary. The `tomeroam.hooks` toggle governs only the default
    battery, so an injected step list always runs. Default behavior (both hook entry points) is unchanged:
    same steps, same `✓`/`✗` output, same exit-code contract (0 pass / 1 fail).

- `test/run-checks-strips-git-env.test.js`: the regression gate. Self-validating —
  - TREATMENT drives a NAIVE git-write probe (a temp script that does `git config` with no env sanitizing,
    exactly like a test that forgot `cleanGitEnv`) through `runChecks({ steps: [...] })` under a poisoned
    ambient `GIT_DIR`, and asserts the probe write landed in the throwaway work repo and the ambient repo is
    UNTOUCHED.
  - CONTROL runs the SAME probe WITHOUT the boundary (a direct poisoned spawn) and asserts it DID hijack the
    ambient repo — proving the poison is real and the belt is the only thing preventing it.
  - Also asserts the location vars are gone from the runner's own `process.env` after the boundary ran.
  - Skips when no `git` is on PATH; all repos are throwaways under `os.tmpdir()`.

## Bench proof

- New test green: `node --test test/run-checks-strips-git-env.test.js` → 1 pass / 0 fail.
- Non-vacuous: commenting out the boundary `stripGitLocationEnv(process.env)` line in `runChecks` turns the
  treatment red (`fail 1`) — the "ambient repo is UNTOUCHED" assertion fires. Restored after.
- Full suite green: `node --test test/*.test.js` → 684 tests, 0 fail, 2 todo (pre-existing
  `KR-swipe-scroll-restore` + `KR-swipe-source-rerender`). Count is 683 + this one test.
- Runner CLI end-to-end: `node tools/hooks/run-checks.mjs` → `✓ stamp`, lint/typecheck skipped (not
  installed locally; CI enforces), `✓ tests`, `PASS`, exit 0.
- Build stamp: `build.json` bumped `.243` → `.244`; `node tools/stamp-build.mjs` propagated to `sw.js`,
  `js/debug.js`, `index.html`; `--check` clean.

## Records

- `Claude/Decisions/DecisionLog.md` — appended the structural-belt decision.
- `Claude/Zelda/Board.md` — tactical state updated.
- Memory `git-subprocess-in-tests-must-strip-git-dir` — the hazard is now guarded at both layers.

## Handoff

Ready for Poirot review (builder does not review own work). Belt-and-suspenders now both structural: the
runner unset makes the whole class impossible; `cleanGitEnv` keeps a single out-of-runner git call correct.

## Poirot review + apply (2026-07-26)

Independent review (`Claude/Poirot/67bc895-runner-git-env-boundary.md`): **SHIP (PASS)** — belt correct,
regression test proven non-vacuous by execution (green; red-on-neuter; full suite 684/0-fail/2-todo; real
repo config confirmed untouched). One Minor + two Observations, none blocking. Applied the Minor as a
hardening in the review round:

- **F1 (Minor) — test guarded only 2 of 7 vars.** `poison()` set only `GIT_DIR`/`GIT_INDEX_FILE`, so the
  "was stripped" loop was vacuously true for the other five. Fixed: `poison()` now sets all seven location
  vars at the ambient repo, and save/restore loops over `GIT_LOCATION_VARS` — the strip assertion is now
  non-vacuous for every var the belt claims to clear.
- **Obs-2 (assertion naming) — folded in.** Reordered the treatment assertions so "ambient repo is
  UNTOUCHED" is checked first; it is the assertion that reddens first on neuter, so the comment and this log
  now name it accurately (re-verified: neuter fails on the ambient-untouched assertion).
- **Obs-3 (`GIT_LOCATION_VARS` duplication) — left as-is.** Considered-and-rejected: sharing would couple
  the fast runner to `mutate.mjs`'s top-level `await import` side effect, and the two functions differ in
  contract (mutate-in-place vs copy). Poirot concurred.

Re-verified after apply: new test green; neuter reddens on the ambient-untouched assertion; restored.
