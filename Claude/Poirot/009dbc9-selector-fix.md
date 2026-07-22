# Code Review — .234 (mutation-sweep `--affected` selector fix)

Type: code-review
Prior-review: 90a139c-swipe-stage4-contract-gates.md
Range: 90a139c..009dbc9 (the single fix commit .234)
Reviewer: Poirot
Date: 2026-07-22
Plan of record: between-stages fix work — closes the .233 review's F-cf1..F-cf4. Stage 5 NOT started.

## Verdict

**Ship.** The commit rewrites `changedFiles()` to parse `git status --porcelain=v1 -z
--untracked-files=all` and closes all four .233 findings. Unlike the .233 review, this verdict rests on
executed evidence, not reading alone — `node` was located this session
(`C:\Users\nzilb\tools\node-dist\node.exe`, v22.23.1), so the runtime ceiling (W12) no longer applies:

- **The `-z` format assumptions were verified against real git**, not inferred: a rename emits
  `R  <dest>\0<src>\0` (dest first, source as a bare following token) — confirmed; `-z` emits paths
  verbatim even with `core.quotepath true` forced on (café.js came through as raw UTF-8, not octal) —
  confirmed; a new file under a new untracked dir is listed individually under `--untracked-files=all`
  rather than collapsed to `dir/` — confirmed.
- **All 9 selector tests pass**, including the end-to-end case that drives a throwaway real repo (not
  skipped — git present).
- **The tests are non-vacuous**: mutating the parser two ways (dropping the rename-source branch;
  reverting to the old ` -> ` split) each flips the F-cf1 assertion to false, i.e. the guard reddens.
- **Full suite: 658 tests, 656 pass, 0 fail, 2 known-red todo** — independently reproduced this
  session, matching the commit's claim.
- **The `isCli` guard is proven correct by execution**: the test imports the module; had the guard
  misfired to true on import, 42 full-suite sweeps would have run and mutated the tree — instead the
  9 tests finished in ~1.2s. Importing the helpers launches no sweep.

No finding a competent reviewer would require changed before submit.

## Prior-review watch-list — disposition

| Item | State | Evidence |
|---|---|---|
| W8 — stage-5 scope (pane builders move into swipe.js) | OPEN (carried) | Stage 5 not started; gated on user go. Untouched by .234. |
| W11 — O1 malformed live descriptor throws in start() | OPEN (carried) | Unchanged; .234 does not touch swipe.js/start(). |
| W12 — run the suite (mutations redden) before clearing | RESOLVED | `node` located this session; full suite executed green (658/656/0/2-todo), the 9 selector tests executed, and the selector tests mutation-verified as non-vacuous. The FULL 42-mutation sweep (each a full suite run) stays a CI job by the DecisionLog decision — that is design, not a gap. |
| W16 — stage 5/6 host-field re-introduction tripwire | OPEN (carried) | Stage 5/6 not started; the exact-key test/gate remains the tripwire. Untouched by .234. |
| W17 — `--affected` selector false-clean cases (F-cf1..F-cf4) | RESOLVED | This commit. Each mechanism reproduced with real git; the rewrite parses `-z`; 9 tests added and passing; non-vacuous by mutation. See findings dispositions below. |

## Coverage Ledger

Rows = every changed symbol (mechanical from the diff of 009dbc9). Dimensions: **C** correctness/data-flow
· **RT** reference-teardown · **OL** object-lifetime · **TS** teardown-symmetry · **DR** deferred-resource
cancel · **RC** reassuring-comment verified · **ABS** absolute-claim checked. Cells: ✓ clear · n/a · FIND.
No empty cells. Every ✓ backed
by reading the current file in full THIS pass (tools/mutation-sweep.mjs, tools/mutate.mjs,
test/mutation-sweep-select.test.js read whole) plus executed probes — no diff-hunk or snippet reads.

| # | Changed symbol (mechanical from the diff) | C | RT | OL | TS | DR | RC | ABS |
|---|---|---|---|---|---|---|---|---|
| 1 | mutation-sweep.mjs header + helpers note (rewrite) | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 2 | MUTATIONS/DEFAULT_FILE import moved above helpers | ✓ | n/a | n/a | n/a | n/a | ✓ | n/a |
| 3 | parseChangedFiles() — NEW | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 4 | changedFiles(cwd=ROOT) — rewritten to `-z` command | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 5 | targetsOf — relocated, logic unchanged | ✓ | n/a | n/a | n/a | n/a | n/a | n/a |
| 6 | affectedIndices() — NEW | ✓ | n/a | n/a | n/a | n/a | n/a | n/a |
| 7 | isCli guard + `if (isCli) {` wrapper | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 8 | run/restore/SIGINT relocated inside the guard | ✓ | n/a | n/a | n/a | ✓ | ✓ | n/a |
| 9 | `--affected` block now calls affectedIndices | ✓ | n/a | n/a | n/a | n/a | ✓ | n/a |
| 10 | test/mutation-sweep-select.test.js — 9 tests (new) | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 11 | build stamps: build.json, index.html, debug.js, sw.js | ✓ | n/a | n/a | n/a | n/a | ✓ | n/a |

RT/OL/TS n/a across the board: the changed code is a pure git-porcelain parser plus a test and stamp
bumps — no listeners, timers, rAF, or persistent state. DR is the one lifecycle dimension with content:
the sweep's `restore()` on SIGINT and in `finally` (rows 8) still always restores the working tree; the
relocation inside `if (isCli)` did not change that path (read in full — lines 112–176).

**Notes (evidence behind the cells):**

- **parseChangedFiles (row 3)** — read in full (lines 49–64). The `-z` record grammar it assumes was
  verified against real git (rename order dest→src as a bare following token; verbatim paths; new-dir
  file listed individually). The rename-source consumption via `tok[++i]` traced by hand on the
  multi-record fixture `M  a.js\0R  d.js\0c.js\0?? e.js\0` → `{a.js,c.js,d.js,e.js}`, and confirmed by
  the passing "several records and a trailing NUL" test. `x === 'R' || x === 'C'` reads only the index
  (X) column; verified that a worktree-only rename (plain `mv`) does not produce an ` R` in Y under
  default config — it shows ` D` + `??`, both handled as ordinary paths.
- **RC — the load-bearing reassuring comments (rows 1, 3, 4)** — each verified, not read past:
  - `mutation-sweep.mjs:30` "mutate.mjs guards its CLI, so this import has no side effect" — verified by
    reading `tools/mutate.mjs` in full: lines 259–260 do guard the CLI (`const isCli = …; if (!isCli)
    { /* no CLI side effects */ } else { … }`). Also proven by execution — importing the module in the
    test launched no sweep.
  - the `-z` "verbatim, no escaping, no ` -> ` arrow" comment (lines 39–48) — verified by real-git probe.
- **isCli guard (row 7)** — read in full. Idiom is basename-suffix
  (`import.meta.url.endsWith(basename(argv[1]))`) rather than the stricter
  `import.meta.url === pathToFileURL(argv[1]).href`. Proven correct by execution for the actual usage
  (direct run → guard on; test import → guard off, no sweep fired). The looser idiom is Observation O3,
  not a defect: the only unsafe direction (sweep on import) requires the importing entry's basename to be
  a suffix of `mutation-sweep.mjs`, which no test file is.
- **Build stamps (row 11)** — 233→234 across build.json, index.html meta + every `?v=`, js/debug.js
  BUILD, sw.js BUILD. Coherence not eyeballed — the stamp-lockstep test is part of the full suite that
  ran green this session.

## Findings

| # | Severity | Finding |
|---|----------|---------|
| O3 | Observation | The `isCli` guard (mutation-sweep.mjs:109) uses a basename-suffix test rather than the stricter `import.meta.url === pathToFileURL(process.argv[1]).href`. Proven correct by execution for real usage, and the only failure direction under uncertainty is safe (guard goes off → no sweep). Take-it-or-leave-it; the stricter idiom would remove the residual reasoning. |
| O2 | Observation | (carried from .233, unchanged) run-checks.mjs has no installed-deps guard: on a fresh clone before `npm ci`, the pre-commit battery blocks until deps are installed. Correct-by-intent with `--no-verify`/`hooks:off` escapes; noted, not required. |

## The prediction

The selector is now correct and the parser is honest about the format it depends on, so the failure mode
to watch is not in this code — it is in the format assumption drifting out from under it. `parseChangedFiles`
hard-codes the `-z` porcelain-v1 record grammar (XY-space-path; rename/copy source as the next bare token).
Two things would silently break it, and neither is defended by a test today: (1) a caller invoking
`changedFiles` against a repo configured with `status.renames=copies` or aggressive copy detection, where
`C` records multiply and a copy's source is a still-unchanged file that would be needlessly swept — harmless
(over-selection, never under); (2) a future edit that drops `=v1` or `-z` from the command string in
`changedFiles` while leaving `parseChangedFiles` expecting NUL records — the parser would see one giant
token and select nothing, a silent false-clean. The end-to-end test guards the command as written; if the
command string is ever parameterized or templated, extend that test to pin the exact flags. Over-selection
degrades to running extra mutations (slow, safe); under-selection is the dangerous direction, and only the
`=v1 -z` pairing keeps the parser and the command in agreement.

## Watch-list

Carries forward every OPEN item from the prior review plus what this review adds. The next review MUST
forward every OPEN item below.

- [W8] (open) Stage-5 scope — the pane builders (ghostApp/snapshotHome/overlayEl/appViewEl/npPillClone)
  move into swipe.js. Watch the builder-move for behaviour drift on seams checkable only by decision.
  Stage 5 is gated on the user's go.
- [W11] (open, minor) O1 (prior) — confirm start()'s behaviour on a thrown `classifyTransition`
  (malformed live descriptor) is acceptable, or wrap the classify call. Low priority. Untouched by .234.
- [W16] (open) Stage 5/6 host-field re-introduction — `sourceHost`/`destinationHost`/`sameBrowseHost`
  must return to the classification ONLY in the commit that adds their consumer + test. The exact-key
  test/gate is the tripwire. Untouched by .234.
- [W18] (open, observation) `changedFiles` command string and `parseChangedFiles` grammar are coupled by
  the `=v1 -z` flags; the end-to-end test pins them as written. If that command is ever parameterized,
  extend the test to assert the exact flags — dropping `-z` silently yields a false-clean (see prediction).
- [W12] (resolved: node located this session; full suite executed green 658/656/0/2-todo, 9 selector tests
  executed, selector tests mutation-verified non-vacuous; full 42-mutation sweep is CI-by-design) Execute
  the suite before clearing.
- [W17] (resolved: .234 — `changedFiles` parses `git status --porcelain=v1 -z --untracked-files=all`;
  F-cf1 returns both rename paths, F-cf2 lists new-dir files, F-cf3 keeps odd names verbatim, F-cf4 adds
  test/mutation-sweep-select.test.js; verified by real-git probe + 9/9 tests + non-vacuous mutation)
  `--affected` false-clean cases.
