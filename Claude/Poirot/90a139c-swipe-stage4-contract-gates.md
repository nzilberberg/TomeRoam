# Code Review — .233 (swipe stage-4 contract hardening + standing gates)

Type: code-review
Prior-review: f3ddd77-swipe-stage4-review-closure.md
Range: f3ddd77..90a139c (the .228 build tip → HEAD; builds .229–.233 + local pre-commit enforcement)
Reviewer: Poirot
Date: 2026-07-21
Plan of record: Claude/Plans/PLAN-swipe-reveal.md — stage 4 (§3.3, I16/§4.3); Claude/EngineeringContract.md

## Verdict

**fix-then-ship** (corrected 2026-07-22 — first pass wrongly read "Ship"). The production behaviour
change — `classifyTransition` emitting `{fromKind,toKind,decorations}` and `constructionPlanFor`
returning an independently deep-frozen CLONE of the decorations — is verified behaviour-preserving
against its real consumers (app.js:600, app.js:643), and the .228 open items (F-i/F-ii/F-iii, F8) are
closed. No application runtime defect. **But the .233 `--affected` selector (`changedFiles()`) is a
git-porcelain parser with four false-clean cases (F-cf1..F-cf4 below), each empirically reproduced.**
It is a dev-tool local fast-path with the full CI sweep as backstop, so nothing reachable-and-broken
ships — but the advertised "trustworthy local pre-commit gate" produces false-clean results on renames
and on new files in new untracked dirs, which a competent reviewer would require changed. That makes
the range fix-then-ship, not Ship.

**First-pass failure (2026-07-22).** The original review marked ledger row 15
(`changedFiles/targetsOf/--affected`) `C ✓ · RC ✓ · ABS ✓` and shipped it. An external cold-read
reviewer (ChatGPT) broke exactly that row. Root cause: the selector is contract-surface code (text →
set parser) and this seat's own .227/.228 discipline forbids filing a contract-surface review on
static reasoning without executed probes or a cold-read adversary — and I ran neither. The reassuring
comment `// git quotes paths with odd chars` (mutation-sweep.mjs:66) was marked RC-verified without
being tested; it is false. The confirming probes are **pure git, runnable on this host without
`node`** — the missing-runtime ceiling (W12) did not even apply to them.

One honest ceiling on the rest: `node` is absent on this review host, so the suite and the mutation
sweep were NOT executed here (W12). The behaviour claims were verified by reading the current source +
grep, and each new mutation traced to its guarding assertion; CI runs the full suite AND the full
mutation sweep on every push (.github/workflows/ci.yml).

## Prior-review watch-list — disposition

| Item | State | Evidence |
|---|---|---|
| W8 — stage-5 scope (pane builders move into swipe.js) | OPEN (carried) | Stage 5 not started; gated on user go. |
| W10 — F8 forward-check on the host fields | RESOLVED | .229/.233 REMOVED `sourceHost`/`destinationHost`/`sameBrowseHost` from the classification (not kept dead). Grep across `*.js/*.mjs/*.html` finds ZERO consumers; production reads the plan only (app.js:600). F8 does not reopen — the fields are gone, to be re-emitted only alongside a consumer + test. Enforced by the classification exact-key test + contract-function-gate. |
| W11 — O1 malformed live descriptor throws in start() | OPEN (carried) | Unchanged; low priority. A malformed live `authorBooks`/`files` still throws at the classify boundary inside start(); not shown reachable. |
| W12 — run npm test (mutations redden) before clearing | OPEN (carried) | `node` absent here. Structurally covered: CI runs `npm test` + `node tools/mutation-sweep.mjs` (full) per push; the mutation-anchors gate + mutation-sweep enforce exactly what W12 asked a human to remember. Not executed on this host. |
| W13 — F-i independent deep-immutability | RESOLVED | constructionPlanFor clones + freezes `c.decorations` at its own boundary (swipe.js:134). Guarded by the F-i test (direct hand-built classification, clone-not-shared, caller-not-frozen), the §14 contract-function-gate, and two distinct mutations (F-i no-freeze; §4.11 freeze-in-place-no-clone). |
| W14 — F-ii §4.3 enumeration completeness | RESOLVED | `GENERATED` in the spec fixture runs the four identity scenarios over BOTH parameterized families, covering the three the prior review named: `files(A)->files(A)`, `identical-descriptor-object` (`from:shared,to:shared` — one ref), `same-semantic-separately-allocated` (two distinct `A` objects). descriptor-coverage-gate enforces all seven §15 cases are tagged, with no typo tags. |
| W15 — F-iii module header describes the oracle backward | RESOLVED | swipe.js:7-13 now states production is CHECKED AGAINST an independent hand-written spec; matches the spec fixture header and the decision log. |

## Coverage Ledger

Rows = every changed symbol (mechanical from the diff). Dimensions: **C** correctness/data-flow · **RT** reference-teardown · **OL** object-lifetime · **TS** teardown-symmetry · **DR** deferred-resource cancel · **RC** reassuring-comment verified · **ABS** absolute-claim checked. Cells: ✓ clear · n/a · FIND. No empty cells. Every ✓ was reached by reading + grep + mutation-trace, none by execution (`node` absent — W12).

| # | Changed symbol (mechanical from the diff) | C | RT | OL | TS | DR | RC | ABS |
|---|---|---|---|---|---|---|---|---|
| 1 | js/swipe.js module header (rewrite) | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 2 | HOST const — removed | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ |
| 3 | classifyTransition() — return shape + comment | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 4 | constructionPlanFor() — clone+freeze decorations | ✓ | n/a | ✓ | n/a | n/a | ✓ | ✓ |
| 5 | requirePayload / kindOf throw paths | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ |
| 6 | Build stamps: debug.js, sw.js, index.html, build.json | ✓ | n/a | n/a | n/a | n/a | ✓ | n/a |
| 7 | swipe-transition.test.js — projectStablePlan, F-i test, §4.3 test | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 8 | swipe-plan-spec.mjs — SEC15_CASES, GENERATED, DESCRIPTOR_SCENARIOS | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 9 | contract-function-gate.test.js (new) | ✓ | n/a | ✓ | n/a | n/a | ✓ | ✓ |
| 10 | descriptor-coverage-gate.test.js (new) | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ |
| 11 | no-silent-coverage-exit-gate.test.js (new) | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 12 | policy-ledger-gate.test.js (new) | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 13 | PolicyLedger.mjs (new) — 2 known-red entries | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ |
| 14 | mutate.mjs — new swipe-4 mutations + DEFAULT_FILE | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 15 | mutation-sweep.mjs — changedFiles/targetsOf/--affected | **FIND F-cf1/F-cf2** | n/a | n/a | n/a | ✓ | **FIND F-cf3** | ✓ |
| 16 | hooks/run-checks.mjs (new) | ✓ | n/a | n/a | n/a | ✓ | ✓ | n/a |
| 17 | hooks/claude-precommit.mjs (new) | ✓ | n/a | n/a | n/a | ✓ | ✓ | n/a |
| 18 | hooks/manage.mjs, pre-commit (new) | ✓ | n/a | n/a | n/a | n/a | n/a | n/a |
| 19 | .claude/settings.json (new) — PreToolUse wiring | ✓ | n/a | n/a | n/a | n/a | n/a | n/a |
| 20 | package.json scripts, ci.yml mutation-sweep job | ✓ | n/a | n/a | n/a | n/a | ✓ | n/a |

RT/TS are n/a across the board: the changed production code is two pure functions with no listeners, timers, rAF, or persistent state. The two load-bearing cells are #4 OL (constructionPlanFor independently deep-immutable on a direct call — F-i) and #4/#9 RC (the "Immutable"/"catches drift" claims verified against code + traced to guarding mutations).

**Notes (evidence behind the cells):**

- **js/swipe.js** — `classifyTransition` field removal is safe (no consumer of the removed fields
  anywhere in the tree; app.js:600 consumes only the plan). `constructionPlanFor` clone is
  behaviour-preserving: the sole production consumer (app.js:643) reads only `deco.kind`/`deco.base`,
  which `{...d}` preserves. `HOST` const removal left no dangling reference. Header reword correct.
  Rejection throw messages (`"Swipe: malformed <role> descriptor …"`, `"Swipe: unknown screen …"`)
  match the test regex on both branches; `kindOf` precedes `requirePayload`, so each malformed/unknown
  input reaches its intended branch.
- **Build stamps** (index.html, sw.js, build.json, js/debug.js) — 228→233, consistent across all
  stamps; lockstep gate enforces it.
- **Gates** — contract-function-gate (meta-gate: every export classified; exact-key + deep-frozen +
  clone-not-in-place via a DIRECT hand-built call — the standing form of F7/F-i), descriptor-
  coverage-gate (§15 completeness + no-typo tags), no-silent-coverage-exit-gate (honest static scope,
  self-excluded, defers semantic backstop to the sweep), policy-ledger-gate (3-way reconcile of the
  ledger against `{ todo }` markers). Each traced to an assertion that reddens; all run under
  `node --test test/*.test.js`.
- **Mutation tooling** — new swipe-4 mutations map 1:1 to the findings; anchors match current source;
  the mutation-anchors gate (npm test) proves each still APPLIES; `--affected` is opt-in local-only
  and self-reports uncovered mutations (§4.20); CI runs the full sweep. F-i and §4.11 correctly share
  an anchor while testing distinct properties (no-freeze vs freeze-in-place-no-clone).
- **Hooks** (tools/hooks/*, .claude/settings.json) — dev-side only, no app runtime dependency. One
  shared toggle (`git config tomeroam.hooks`); node path recorded at install (not assumed on PATH);
  a missing tool is skipped-with-note, never a silent pass; `--no-verify` and `hooks:off` escape
  hatches; the Claude PreToolUse hook defers to the git hook to avoid double-running.

## Findings

The F-cf* row was added 2026-07-22 after an external cold-read review (ChatGPT) of the .233
`--affected` selector; all four mechanisms were empirically reproduced with pure git on the review
host. They were present at first pass and missed — a failure of the first review, recorded as such
(see Verdict, and the added discipline below).

| # | Severity | Finding |
|---|----------|---------|
| F-cf1 | Significant | `changedFiles()` (mutation-sweep.mjs:65) discards the SOURCE side of a rename: `p.split(' -> ').pop()` keeps only the destination. Confirmed: `git status --porcelain` emits `R  old -> new`. A mutation whose target is the old path is then silently skipped by `--affected` — the local gate reports clean while the mutation list is actually stale (anchor rot the full sweep would flag). Bites during the extractions/reorganizations this repo is doing now. Fix: add BOTH source and destination paths for a rename record. |
| F-cf2 | Significant | New files inside a NEW untracked directory are not detected. Default `git status --porcelain` (untracked-mode `normal`) collapses a wholly-new dir to a single `?? js/newmod/` entry — confirmed on host — so `changed.has('js/newmod/target.js')` is false and a mutation targeting that file is skipped: another false-clean local run while a new module + its mutation are developed pre-staging. Fix: `--untracked-files=all` (equivalently `-uall`). |
| F-cf3 | Minor | Quoted/escaped paths are not decoded. `p.replace(/^"|"$/g, '')` strips only surrounding quotes. Confirmed: git emits odd-char names quoted with octal/backslash escapes (`"js/tab\357\200\211name.js"`); after this code the set holds the ESCAPED bytes, not the real filename, so exact matching fails. No current mutation target has odd chars, so it does not bite today — but the comment `// git quotes paths with odd chars` (line 66) asserts this is HANDLED when it is not. Required as a Minor: a false reassuring comment. Fix (also fixes F-cf1/F-cf2 parsing cleanly): parse `git status --porcelain=v1 -z --untracked-files=all` — NUL-delimited, no quoting/escaping, rename record is `dest\0src`. |
| F-cf4 | Significant | The selector has no regression tests. The .233 commit added six changed files, none under `test/`, and recorded only two manual happy-path checks (clean tree; touched `js/browse.js`) — which cannot reveal F-cf1..F-cf3. Every other new gate in this range was traced "to an assertion that reddens"; this parser, uniquely, was marked `C ✓` with zero guarding test and the absence was not flagged. Add focused tests: staged/unstaged mod; deletion; rename (assert BOTH paths returned); untracked file in a new dir; names with spaces/tabs/quotes/`->`; a two-file mutation via `also.file`; zero selected mutations. |
| O1 | Observation | W12: the suite and mutation sweep were not executed on this review host (`node` absent). CI runs both in full on every push; the review's static half is reliable for the structure-and-record class, and each mutation was traced to its guarding assertion. Run `npm test` + `node tools/mutation-sweep.mjs` (or rely on CI green) to close W12. |
| O2 | Observation | run-checks.mjs runs the `tests` step with no installed-deps guard: on a fresh clone before `npm ci`, jsdom/fake-indexeddb are absent, so the pre-commit battery blocks every commit until deps are installed. Correct-by-intent (do not commit unrunnable tests) with `--no-verify`/`hooks:off` escapes; noted, not required. |

## The prediction

The one live risk is deferred, not present: the host fields (`sourceHost`/`destinationHost`/
`sameBrowseHost`) are now GONE, and the swipe.js comment promises they return "in the stage that
first consumes them, each with its consumer and test in the same commit." If stage 5/6 re-adds any of
them to the classification WITHOUT a consumer, the classification exact-key test and contract-function-
gate redden immediately — which is the intended tripwire. Watch that the re-introduction lands with its
reader, not ahead of it. Everything else in this range is enforced by a gate that fails loudly on
regression; the failure mode to fear is a NEW export or contract object added without registering it —
which the §14 meta-gate now blocks.

## Watch-list

Carries forward every OPEN item from the prior review and what this review adds. The next review
(stage 5) MUST forward every OPEN item below.

- [W8] (open) Stage-5 scope — the pane builders (ghostApp/snapshotHome/overlayEl/appViewEl/npPillClone)
  move into swipe.js. Watch the builder-move for behaviour drift on seams checkable only by decision.
  Stage 5 is gated on the user's go.
- [W11] (open, minor) O1 (prior) — confirm start()'s behaviour on a thrown `classifyTransition`
  (malformed live descriptor) is acceptable, or wrap the classify call. Low priority.
- [W12] (open) Execute `npm test` (full suite) and `node tools/mutation-sweep.mjs` (full) — confirm
  green and that each new swipe-4 mutation goes UNCAUGHT-free (i.e. every mutation is caught). Static
  verification only on the .229–.233 review host; CI runs both per push.
- [W16] (open) Stage 5/6 host-field re-introduction — `sourceHost`/`destinationHost`/`sameBrowseHost`
  must return to the classification ONLY in the commit that adds their consumer + test (per the swipe.js
  comment and the no-dead-fields rule). Verify the reader lands with the field, not after it; the exact-
  key test/gate is the tripwire if it does not.
- [W17] (open) `--affected` selector false-clean cases — F-cf1 (rename drops source path), F-cf2
  (new file in new untracked dir missed), F-cf3 (quoted/escaped paths not decoded; false comment),
  F-cf4 (no selector tests). Fix = parse `git status --porcelain=v1 -z --untracked-files=all` and add
  the selector test set. Until fixed, the local `--affected` gate can report clean on a renamed or
  newly-added mutation target; CI's full sweep is the backstop.
- [W10] (resolved: .229/.233 removed sourceHost/destinationHost/sameBrowseHost — zero consumers by grep; re-emission is now blocked by the classification exact-key test + contract-function-gate) F8 host-field forward-check.
- [W13] (resolved: .230 constructionPlanFor clones+freezes its own decorations; guarded by the F-i direct-call test, contract-function-gate §14, and two mutations) F-i independent deep-immutability.
- [W14] (resolved: .230 GENERATED covers both parameterized families incl. files(A)->files(A), same-ref d->d, and separately-allocated-equal; descriptor-coverage-gate §15 enforces all seven cases) F-ii §4.3 enumeration.
- [W15] (resolved: .233 swipe.js header now states production is CHECKED AGAINST the independent spec) F-iii backward-oracle header.
