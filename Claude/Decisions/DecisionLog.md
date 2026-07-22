# TomeRoam — Decision Log

A contained, append-only record of settled decisions, so a later session does not
re-open and re-argue them. One entry per decision, dated, one fact per entry, newest at
the bottom. State current truth in plain language; when a decision is superseded, edit
the entry to current truth (git holds the history). Detail lives in the plan-of-record
(`Claude/Plans/PLAN-swipe-reveal.md`, `Claude/Plans/PLAN-durable-progress.md`) and the
cross-session memory; this file holds only the settled conclusions.

Records home: this project's own records tree, `<project-root>/Claude/`, committed to the
repo. Per the scheme, records are per-project; the persona specs and conventions are
global (`~/.claude/personas/`) and are not restated here. The tactical board is kept at
`Claude/Zelda/Board.md` (repo); the cross-session memory points to it, not the reverse.

---

- A CODE change (code, assets, tests, tooling) gets a new app build number, which labels
  the code tree state for review, OTA, and device bug-reports. Docs, plans, checklists,
  review docs, and the `Claude/` persona-records tree do NOT bump the build — they do not
  change what the device runs. (Corrected 2026-07-20 by the user: an earlier version of
  this entry listed "plans, docs" as bumping, which over-broadened the rule. Tests DO bump —
  they are code and are reviewed.) — 2026-07-20.

- The swipe/reveal rewrite plan (`Claude/Plans/PLAN-swipe-reveal.md`, draft 7) is the plan-of-record,
  approved after seven review rounds — 2026-07-20.

- The rewrite proceeds stage by stage with an external code review between stages; a
  stage is not started until the prior stage's review is closed — 2026-07-20.

- Stage 3 scope is the session owner plus identity plus the ownership endpoint, not
  callback enforcement — 2026-07-20.

- Stage-3 async-callback stale-guards (a superseded session's callback no-ops) are
  deferred to stage 6 — a `current-session` guard is unreachable while the `finishing`
  flag rejects every new gesture through the settle-to-finalize window, and guarding the
  finalize path risks skipping its own cleanup — 2026-07-20.

- Superseding a live browse-to-browse drag must re-render the source into the shared
  browse host — new policy, not extraction parity; tracked as a known-red test until the
  rewrite closes it — 2026-07-20.

- Superseding a live gesture must restore the starting document scroll — new policy, not
  extraction parity; tracked as a known-red test until the rewrite closes it —
  2026-07-20.

- The 1px Home-entry scroll is preserved for parity through the rewrite; its removal is a
  separate change made after on-device parity is confirmed — 2026-07-20.

- The reveal MutationObserver reference stays module-scoped, not session-owned, because a
  new reveal flushes the previous one's observer and it must outlive its session —
  2026-07-20.

- Cancellation ownership of the settle and reveal timers and the transitionend listener
  is deferred to stage 6 (centralize finalization and reveal ordering) — 2026-07-20.

- The frozen swipe model is generated from source, never hand-written, and the js/app.js
  regions its predicate mirrors are fingerprint-pinned; a fingerprint change requires
  re-verifying the mirrored rule before the pin is updated in the same commit —
  2026-07-20.

- OPEN: the service-worker surprise-auto-update on warm foreground is a live bug,
  confirmed on device (a controller change with no user tap). It is not caused by the
  swipe rewrite. The fix requires instrumenting what activates the waiting worker before
  editing sw.js. Waiting on: a decision to prioritize it against the rewrite — 2026-07-20.

- The persona scheme is adopted for ongoing work: seat vocabulary and dispatch, red-first
  and adversarial-mutation discipline, this decision log, and the tactical board at
  `Claude/Zelda/Board.md` — 2026-07-20.

- The `Claude/` records tree is committed to the repo, not gitignored. A committed
  artifact is the only channel a blind reviewer session has to reach the implementation
  session; a gitignored record cannot cross that boundary. The plan-of-record is already
  committed to this public repo, so committing the records adds no exposure that was not
  already present — 2026-07-20.

- Each code review is filed to `Claude/Poirot/` by the reviewing session and committed;
  the implementation session pulls and reads it. A review relayed only as pasted text is
  not a filed artifact and is lost once the conversation ends — 2026-07-20.

- Builds .224 and .225 bumped the app version for scheme-records commits in error; the
  app code at .225 is identical to .223. The numbers are not reclaimed, because OTA build
  comparison is monotonic and a device already on .225 must not be sent a lower number.
  The next product change is .226 — 2026-07-20.

- The .223 stage-3 code review is filed at `Claude/Poirot/33c7653-swipe-stage3-session-owner.md`.
  Two findings stand outside every standing deferral and are the gate before stage 4:
  (a) `finishing` is not restored in `runFinalize`'s `finally`, so a throw in `applyScreen`
  permanently wedges the swipe until reload — a one-line fix; (b) the held-reveal test
  asserts only the endpoint, so a mutation clearing the session at finalize survives — the
  test must pin intermediate ownership. The review's ownership-class findings (settle timer,
  transitionend listener, global-session cleanup helpers) fall inside the stage-6 deferral
  and are NOT reopened — 2026-07-20.

- The uncancelled settle `requestAnimationFrame` (a same-gesture stale write onto a real
  Home/Browse/overlay element after finalize when the page was hidden during settle) is
  PULLED FORWARD and fixed: the settle rAF is stored on the session and cancelled in
  finalize (build .226). Ruling: it is not covered by the stage-6 deferral rationale and
  it has a real user-facing failure mode, so it is closed now, not deferred — 2026-07-20.

- The .223 review is closed. Fixed now (build .226): finding 2 (finishing restored on a
  throw, throw-path only), finding 1a (settle rAF cancelled), finding 4 (the held-reveal
  test pins intermediate ownership, not just the endpoint), finding 5 (the decorative
  pill tag is noted in-code as unread). Deferred to stage 6, unchanged: the settle timer,
  the transitionend listener (finding 1b), and the global-session cleanup helpers
  (finding 3) — 2026-07-20.

- Records division of responsibility: settled decisions and code reviews are canonical in
  this repo tree — decisions here, reviews in `Claude/Poirot/`, plans in `Claude/Plans/`.
  The maintainer's private cross-session memory (outside the repo) holds orientation, deep
  lessons, and non-repo projects, and it POINTS to these records rather than restating them.
  A decision restated in both places is a second copy that drifts; each fact has one home,
  and for decisions and reviews that home is the repo. New decisions and reviews are written
  here, not into the private memory — 2026-07-20.

- Plans and review correspondence are relocated into the `Claude/` records tree
  (`Claude/Plans/` for plans, `Claude/Poirot/` for review correspondence) to follow the
  persona scheme's filing directive: Vitruvius owns `Claude/Plans/`; reviews live in
  `Claude/Poirot/`. This SUPERSEDES the earlier "plans in the repo `PLAN-*.md`" convention,
  which merely recorded the pre-scheme file locations with no rationale behind them. The move
  was verified to have no functional dependency: every in-tree reference to a plan filename
  is a prose citation in a source/test/tool comment or a generated-file label, not a path
  that is read — so no test, gate, tool, or build opens a plan by path. Source-code comments
  that cite a plan by bare filename are left as-is (the filename still resolves); records and
  cross-session-memory pointers were updated to the new paths — 2026-07-20.

- OPEN (deferred, from the `.171`/`.172` identity audit — full analysis in
  `Claude/Poirot/REVIEW-QUESTION-identity-deferred.md`): `dev8` (last 32 bits of the client
  id) is used both as a shard-set key and as proof-of-self, so a collision causes title-
  namespace collapse, a misattributed `verify-mismatch`, and a colliding device becoming
  invisible/undeletable with Delete destroying both. Deferred on ~1e-6 birthday probability
  and write-path risk. Cheapest insurance (read-path only): in `devices()` skip a shard set
  only on full-client-id match, not on dev8 alone. Decision pending: fix now / fix later /
  document — 2026-07-20.

- OPEN (deferred, same audit): `pb_prog2Keys` is a bare `{prefix: ratingKey}` hint map with
  no device qualifier, so a partial storage loss that keeps the map but drops the client id
  can write the new dev's payload into the old dev8's board — a permanently unreadable archive
  that reports itself healthy, with no self-heal. Trigger is unproven (could not be constructed
  from the code). Two-line fix (`{dev, keys}` + drop on `dev !== myDev8`). Decision pending —
  2026-07-20.

- OPEN (deferred, same audit): a Plex `ratingKey` change (re-scan/path/agent change) orphans
  a download — the book-keyed index survives the blob-presence-only reconciliation, tiles read
  "Downloaded", storage stays charged, and playback silently falls through to the stream while
  banking early-returns. Availability/accounting bug, not wrong-audio (Plex does not reuse
  keys). Fix is a design choice (opportunistic revalidation vs detect-and-report). Blocked on
  an unknown: how often ratingKeys actually change in normal Plex operation — 2026-07-20.

- The tactical board is adopted at `Claude/Zelda/Board.md` (repo, committed), superseding the
  earlier "no separate board — the cross-session memory serves that view." Reason: the memory
  status board was the one working-record living outside the repo, which broke the records-
  division rule (canonical records in the repo, memory points) AND left a blind reviewer session
  unable to see current tactical state. It had also begun to drift — the memory board read "stop
  before stage 3" while the hub read "stage 4 shipped." Single home now: open bugs, in-flight
  work, backlog, standing priority, and shipped-unverified state live ONLY on the board; the
  memory `tomeroam-status-board` was slimmed to durable process-lessons + a read-index and points
  here; the memory hub points here; `project-hub-maintenance` was updated so the OPEN list is
  canonical on the board, not duplicated in the hub. Durable process lessons and deep per-bug
  sagas stay in memory (the board points to them) — 2026-07-20.

- The frozen swipe model is a THREE-LAYER oracle (stage 4), superseding the fingerprint-pinned
  app.js branch MIRROR: an independent hand-written contract (`test/fixtures/swipe-plan-spec.mjs`,
  DATA) → production (`js/swipe.js`, `classifyTransition` + `constructionPlanFor`) → tests compare
  real production output against the contract exhaustively. The old scheme reimplemented start()'s
  branches in the generator and a hash proved the two copies had not drifted — "the one weak link"
  (two copies a pin can only prove EQUAL, never CORRECT). Now there is one decision and one contract;
  the generator RENDERS the contract and reimplements nothing, so there is nothing to fingerprint.
  The app.js branch-fingerprint mirror is RETIRED; the navTo / nav-relation / gesture-end /
  supersession fingerprint pins for OTHER app.js regions stay. Recorded now (owed from .227) —
  2026-07-21.

- Stage 4 ships the CONSTRUCTION subset of the plan-of-record §3.3 `planFor()` under the name
  `constructionPlanFor()` — `{ outgoing, incoming, renderDestination, decorations }`, every field
  consumed by `start()` today. The FINALIZATION half of §3.3 (`commit`/`abort`/`scroll`/
  `stackEffect`/`paneRemovalPolicy`) is deferred to stage 6, which adds `finalizationPlanFor()` and
  composes the rich §3.3 `planFor()` from both halves. This is a deliberate phase-split of §3.3/§7.4,
  driven by the project's no-dead-fields rule (a finalization field with no consumer would be dead
  until stage 6). Reconciles the .227 review finding F2 (the split had been recorded only in a commit
  message, which the standards do not treat as the record) — 2026-07-21.

- `classifyTransition()` emits ONLY the fields a current-slice consumer reads: `{ fromKind, toKind,
  decorations }` (fromKind/toKind → constructionPlanFor; decorations → start()). §3.3 also lists
  `sourceHost`/`destinationHost`/`sameBrowseHost`, but no stage-4 consumer reads them, so per the
  no-dead-fields rule (Engineering Contract item 17) they are NOT emitted; each is reintroduced in the
  commit that first consumes it, with its consumer and test — `sameBrowseHost` in stage 6 (abort
  re-render), the two hosts in the stage-5 pane/mover construction that reads them. Build .229 removed
  all three (none had a stage-4 consumer, and .229 is not the stage-5 commit). This SUPERSEDES the
  earlier .228 disposition that kept the three fields as "the whole §3.3 boundary ships atomically" —
  that was too permissive: "a later stage may use them" is not a current consumer, and a boundary test
  asserting a field is not a production consumer of it. This is a STAGING-CONTRACT correction, not a
  behaviour or product-policy change, so it is NOT a new-policy ledger item — 2026-07-21.

- A SAME-DESTINATION swipe (a bare same-`v` source/destination pair, e.g. books→books) is documented
  IMPOSSIBLE-BEFORE-THE-PLANNER, not given a production branch (the §4.3 option). `navTo` (app.js:141)
  REPLACES the stack top for a bare same-`v` descriptor, so the nav stack never holds two adjacent bare
  same-`v` entries and the gesture's destination (navStack[-2] / fwdStack top / files) is never the bare
  source. A production throw would be an UNREACHABLE guard — the dead-code pattern this project forbids.
  A same-IDENTITY parameterized pair (authorBooks(A)→authorBooks(A)) IS reachable (navTo pushes it) and
  IS a valid browse→browse transition, so it yields a plan — it is not this case. Reconciles .227 review
  finding F4's same-destination half — 2026-07-21.

- A MALFORMED parameterized descriptor (a parameterized name — authorBooks/files — missing its required
  payload: author/book) is REJECTED by `classifyTransition` with a named reason, never planned (plan
  §4.3, I16). This is the normalization boundary's well-formedness contract, exercised directly by test
  even though production never builds such a descriptor — distinct from an unreachable stateful guard.
  The stage-4 structural proof now feeds WELL-FORMED descriptors (a representative payload attached to
  the parameterized registry names) so the "screen-name not descriptor" gap the review named (F4) is
  closed. Implemented in build .228 — 2026-07-21.

- The .227 stage-4 code review (`Claude/Poirot/14257f2-swipe-stage4-classify-construct.md`) is closed.
  Fixed in build .228 (each red-first + mutation-verified): F1 (a harness test proves `start()` builds
  the NP pill mover from `plan.decorations`), F3+O1 (the classification boundary and the plan are
  DEEP-frozen so a consumer's push cannot corrupt the shared decorations), F4 (the oracle covers §4.3
  descriptor scenarios — identity-varying yields a plan, same-destination is documented impossible,
  malformed is rejected), F5 (malformed-payload rejection), F6 (`constructionPlanFor` throws on an
  unhandled source kind, not only destination), F7 (the test's plan projection now asserts EXACTLY the
  four contract keys instead of whitelisting them, so an added/dead field reddens). F2 and F8 filed as
  records above; no code deferred from this review — 2026-07-21.

- The TomeRoam Engineering Contract (`Claude/EngineeringContract.md`) is adopted as a standing,
  committed per-project standard governing all implementation, testing, planning, and review work —
  25 rules generalized from the `.90–.228` review cycle, plus a required implementation-report
  format. It layers on the global `StandardsDocument.md`. Per the project's rules-vs-gates lesson a
  filed rule needs a loading/gating mechanism to hold; the mechanizable items (exact-schema checks,
  no-silent-early-return, dead-field detection, separated source-fingerprint vs behavioral-mutation
  sweeps, derived inventories) are gate candidates, not memory candidates — 2026-07-21.

- The .228 review (`Claude/Poirot/f3ddd77-swipe-stage4-review-closure.md`, corrected by an
  independent second pass) is closed. Fixed in build .230 (each reproduced against the code,
  red-first + mutation-verified): F-i / W13 — `constructionPlanFor` is now independently
  deep-immutable (clones and freezes the caller's decorations at its own boundary, so its
  "Immutable" contract holds on a directly-built classification, not only the composed path;
  clone-not-freeze-in-place per Engineering Contract item 14); F-ii / W14 — the §4.3 descriptor
  enumeration is completed (identical descriptor object `d->d` same ref, independently-allocated
  semantically-equal for both parameterized names, `files(A)->files(A)`); F-iii / W15 — the
  swipe.js module header is corrected to say production is CHECKED AGAINST the independent frozen
  spec, not that the frozen model derives from production. W10 (the F8 forward-check) is MOOT —
  build .229 removed `sourceHost`/`destinationHost`/`sameBrowseHost` entirely under Engineering
  Contract item 17, so there are no host fields left to be stage-6-dead. W12 (run the suite +
  mutations) is satisfied: node was available this session — 638 tests, 636 pass, 0 fail, 2 todo
  (the pre-existing known-red stage-2 NEW-POLICY items), and each new/changed test was
  mutation-verified. W11 (O1, wrap the malformed-live-descriptor throw in start()) stays OPEN,
  low priority. W8 (stage-5 scope) stays OPEN, gated on the user's go — 2026-07-21.

- The Engineering Contract's mechanizable sections are enforced by gates, not trusted to
  vigilance (the project's rules-vs-gates law). Item 11: the nine .228–.230 swipe-boundary
  mutations, verified by hand at the time, are now registered in `tools/mutate.mjs` — the
  durable behavioral-mutation sweep (`node tools/mutation-sweep.mjs`) re-runs them and
  `test/mutation-anchors.test.js` fails if an anchor rots. Item 14: `test/contract-function-
  gate.test.js` requires every exported contract function of js/swipe.js (`classifyTransition`,
  `constructionPlanFor`) to be exact-keyed and deep-immutable on a DIRECT hand-built call, and
  fails on any new export that is neither registered nor exempt — the standing form of the .228
  F7 / .230 F-i findings. Item 15: `test/descriptor-coverage-gate.test.js` fails unless the
  descriptor-scenario fixture tags at least one scenario for each of the seven enumerated §15
  cases (`SEC15_CASES`); the parameterized-identity scenarios are now GENERATED per §22 from the
  family list (inputs derived, expectations hand-authored per §16). These gates were built at the
  maintainer's direction after the tooling was flagged-and-ignored across three builds — 2026-07-21.

- The Engineering Contract is replaced by the DURABLE ENGINEERING CONTRACT v2
  (`Claude/EngineeringContract.md`) — a three-layer living system: CORE (architecture-
  independent §4 rules), SUBSYSTEM CONTRACTS (`Claude/Subsystems/<name>.md`, the §5 template),
  and the DECISION LEDGER (this file). Precedence when sources conflict: approved plan > active
  ledger > verified production (for parity claims) > subsystem contract > core > history. The
  first subsystem addendum, `Claude/Subsystems/swipe-reveal.md`, is authored; others are written
  when their subsystem is next touched (§6 triggers). Newly MECHANIZED this build (.231): §4.9
  (`test/no-silent-coverage-exit-gate.test.js` — the canonical `if (!x) return;` skip in a test
  body; the mutation sweep is the semantic backstop) and §4.11 clone-before-freeze (the §14 gate
  now asserts a contract function CLONES a caller-owned array rather than freezing it in place).
  NOT gated (process, not mechanizable): §3/§6/§7/§10 procedures; §8 report wording. §4.14 is
  enforced structurally (the generator renders the spec, never calls the planner) not by a gate
  (the planner names appear in its doc-comments, so a text gate would false-positive) — 2026-07-21.

- §4.19 (parity vs policy — "maintain an exact structured policy ledger; tests must assert its
  complete active contents") is now MECHANIZED (build .232). `Claude/Decisions/PolicyLedger.mjs`
  is the machine-readable ledger (each entry carries the §1.C fields: id, subsystem, decision,
  reason, status, introduced, removalTrigger, tests). `test/policy-ledger-gate.test.js`
  reconciles it against the suite: every known-red (`{ todo }`) test must be declared (no
  untracked policy), every declared known-red must still be red (no exception outliving its
  cause), every referenced test name must exist, and every entry must carry the required fields
  with a unique id. Seeded with the two stage-2 swipe known-reds. The prose DecisionLog remains
  the ledger for decisions without a test signature; the two are complementary, not duplicated
  (the structured ledger holds only test-enforced items). Mutation #41 (dangle a ledger test
  reference) reddens the gate; registered in the sweep — 2026-07-21.

- CI (`.github/workflows/ci.yml`) now runs the mutation SWEEP as its own job, not only the
  anchors gate. `npm test` (which CI runs) proves each mutation still APPLIES; the new job runs
  `tools/mutation-sweep.mjs` to prove each is still CAUGHT — a guard going undefended (a test that
  no longer fails when its target breaks) now fails CI on every push, server-side, independent of
  anyone remembering to run it. Confirmed green before enabling: the full sweep passed 42/42 (0
  uncaught / 0 unapplied / 0 stale) on the current tree. The ci.yml change is CI infrastructure,
  not app/test/tooling-under-test, so it does not bump the build number (same category as records).
  This closes the enforcement gap where a false-green could pass CI; the remaining un-enforceable
  rules are the judgment/process ones (§3/§6/§7/§10, §8 wording), which stay with the independent
  review — 2026-07-21.

- `tools/mutation-sweep.mjs --affected` runs only the mutations whose TARGET file changed vs
  HEAD — the fast local pre-commit check, so "affected-only locally, full sweep in CI" is a tool
  default rather than a per-turn judgment. It prints what it does NOT cover (§4.20: a partial run
  must not read as complete — mutations in unchanged files, and, if a test changed, a mutation
  that a test edit made inert in an unchanged file), with the full CI sweep as the backstop. This
  mechanizes one of the three dev-speed shortcuts; the other two are honestly un-mechanizable
  (batching independent tool calls is in-turn judgment; running the cheap path at all is still my
  choice, only made easier) — 2026-07-21.

- Local pre-commit enforcement is added, closing the last enforcement gap (a red/incoherent
  commit could be created locally; CI only caught it after push). TWO hooks run the same fast
  battery (`tools/hooks/run-checks.mjs`: stamp --check, lint, typecheck, full suite incl. every
  gate — NOT the mutation sweep, which stays in CI): a git `pre-commit` hook (any commit, any
  tool) and a Claude PreToolUse hook (`.claude/settings.json` → `claude-precommit.mjs`, the
  agent's commits). The Claude hook DEFERS when the git hook is installed, so they never
  double-run; it only covers the gap of a clone without the git hook. BOTH obey one toggle
  (`git config tomeroam.hooks`, default ON) so `npm run hooks:off` disables everything; a single
  commit bypasses with `git commit --no-verify`. Verified: the git hook blocks a commit with an
  incoherent stamp (HEAD unchanged) and the toggle turns it off/on. This is dev-workflow infra
  (like ci.yml), not app/test/tooling-under-test, so it does not bump the build. NOTE: the Claude
  hook loads only after `/hooks` or a restart (no `.claude/` existed at session start). Neither
  hook enforces the JUDGMENT half of the contract — only the checkable outcomes — 2026-07-21.

- Owed to stage 6 (from the .227 review's process note, recorded now so it is not lost): when the settle
  requestAnimationFrame, the settle/reveal timers, or the transitionend listener are cancelled OR fire,
  NULL their stored session handles (`cur.settleFrame = null`, etc.) so the session object describes LIVE
  ownership rather than stale numeric handles. Not a .228 blocker — it is part of the stage-6
  finalization-centralization work — 2026-07-21.

- The .233 stage-4 code review (`Claude/Poirot/90a139c-swipe-stage4-contract-gates.md`, verdict
  fix-then-ship) is closed. Fixed in build .234 — the `tools/mutation-sweep.mjs --affected` file selector
  now parses `git status --porcelain=v1 -z --untracked-files=all` (NUL-delimited, verbatim paths,
  `dest\0src` rename records) instead of the plain porcelain format. Each finding was reproduced with real
  git before accepting the reviewer's fix, and each fix was mutation-verified (reverting it reddens its
  guard): F-cf1 (rename records now return BOTH source and destination; the old `split(' -> ').pop()`
  dropped the pre-rename path); F-cf2 (`--untracked-files=all` lists each new file instead of collapsing a
  wholly-new untracked dir to one `dir/` entry); F-cf3 (`-z` paths are verbatim, so odd-character names are
  no longer octal-escaped and a literal ` -> ` in a name is not split — the false reassuring comment is
  removed); F-cf4 (the selector had zero tests — `test/mutation-sweep-select.test.js` is added, grounded in
  real `-z` bytes plus one end-to-end case against a throwaway real repo). The pure helpers
  (parseChangedFiles/changedFiles/targetsOf/affectedIndices) are extracted and exported behind an isCli
  guard so a test imports them without launching a sweep. O1/W12 satisfied: full suite run this session —
  658 tests, 656 pass, 0 fail, 2 known-red todo; the full mutation sweep stays in CI. O2 (run-checks has no
  installed-deps guard) noted, not required. W17 (the `--affected` false-clean cases) is CLOSED by .234.
  W8 (stage-5 scope) and W11 (O1, wrap the malformed-live-descriptor throw in start()) stay OPEN; stage 5
  is NOT started, gated on the user's go — 2026-07-21.

- CI verification after a push is enforced by a hook, not left to the agent's memory (the project's
  rules-vs-gates law applied to the agent's own workflow). A PostToolUse(Bash) hook
  (`.claude/settings.json` → `tools/hooks/ci-watch.mjs`, asyncRewake/background) fires after any Bash
  command containing `git push`, finds the CI run for the pushed HEAD SHA, watches it to completion, and
  then either surfaces a green `systemMessage` to the user or — on red — wakes the agent (exit 2) with the
  failing jobs so it diagnoses and reports instead of declaring success. Closes the gap where the user had
  to ask "is CI green?" every commit. It greps the command in-script rather than using an `if:
  "Bash(git push*)"` filter, because pushes are frequently `cd … && git push` and a prefix filter would
  miss them. Dev-workflow infra (like the pre-commit hook and ci.yml), so it does NOT bump the build.
  NOTE: partially verified 2026-07-22 — do not over-trust. The PreToolUse pre-commit hook in
  `.claude/settings.json` DOES load and fire this session ("tomeroam pre-commit checks: PASS" on each
  commit; there is no native `.git/hooks/pre-commit`, so that output is the Claude hook). The ci-watch.mjs
  SCRIPT is sound — invoked directly with a synthetic `git push` event it resolves `gh` and reaches the
  watch loop. BUT the PostToolUse asyncRewake watch did NOT spawn a watcher on the actual `.235` push: no
  `gh`/watch process existed while CI ran, and no background task surfaced. So the AUTO-watch is UNPROVEN
  end-to-end and did nothing this push; CI was watched by a manual `gh run watch` instead. The prior "both
  load together so it's live" claim was an inference from the PreToolUse half and was wrong about the
  async watch actually firing. Next real push: confirm a watcher/background task appears before trusting it
  — 2026-07-22.

- The `mutation-sweep.mjs --affected` selector's `parseChangedFiles` tests BOTH git status columns for
  rename/copy (`x==='R'||x==='C'||y==='R'||y==='C'`), not only the index column. A worktree-column rename
  (`mv` + `git add -N`, reported as ` R new.js\0old.js\0`) previously desynced the token loop and dropped
  the rename source — a false-clean, the F-cf1 class reopened on the Y column. Surfaced by an external
  reviewer on the `.234` re-review (finding F-y) and missed by this project's own re-review; fixed in
  `.235` with a red-first regression (Y-column parse fixture, copy-in-Y fixture, end-to-end `mv`+`git add
  -N`, all red before the fix and green after). CI's full sweep was the backstop that kept the local
  false-clean from shipping an undefended guard — 2026-07-22.

- Poirot coverage-ledger cells split the clear mark: `✓` means cleared by an EXECUTED command cited that
  pass; `~` means cleared by reading/reasoning only — admissible, but unverified, and the Phase 5 verdict
  must account for every `~`. The gate (`~/.claude/hooks/poirot-casebook-gate.sh`, check 5) blocks a
  casebook whose ledger has any bare `✓` but cites no command. Earned by the `.234` re-review stamping `✓`
  on a reasoned claim about git's output it never ran. This is a global scheme change (Poirot spec Local
  section, `~/.claude/personas/`), logged here because this project's review filings now follow it —
  2026-07-22.

- The stage-5 slice of `Claude/Plans/PLAN-swipe-reveal.md` (§7 step 5, "move pane builders into swipe.js")
  was stressed by the plan verifier before build; verdict TEMPER (fix-then-build), filed at
  `Claude/Charpy/PLAN-swipe-reveal-stage5-2026-07-22.md`. The end-state architecture passes (construction
  in one module, two well-defined capture recipes, correctly sequenced on the shipped stage 4, no later
  step gating it). The build is blocked on decisions, not a broken design: the planner must settle four
  OPEN decisions before it opens (the four OPEN entries below — scope, seam, host-field consumer, pane-
  lifecycle), and write into the step F2 (the new public surface is classified by the export gate — individual
  `NON_CONTRACT` exports OR a `createPaneBuilders(deps)`/`init(deps)`/private-recipe surface — with DOM
  access kept lazy so the no-DOM `swipe.js` unit tests still load) and F4 (two coverage layers: recipe-level
  clone/capture tests AND a mutation-verified production-wiring test that `start()` selects the correct
  recipe and its element participates in the production mover set with the correct ownership and ordering
  — stated as that invariant, not a `d.movers` internal, so it survives a legitimate relocation of mover
  assembly under scope C), and constrain the seam per F5 —
  2026-07-22.

- OPEN — stage-5 SCOPE: which extraction boundary does stage 5 take? Three records authorize three
  genuinely distinct scopes: plan §7.5 (two capture recipes), the `js/swipe.js` header lines 24–27 (five
  builders + render calls), and this log's 2026-07-21 host-field entry (host-based mover resolution). They
  map onto three admissible boundaries — A: capture recipes only (`app-ghost`/`home-snapshot`); B: capture
  recipes plus real host/mover resolution, leaving application rendering in app.js behind injected callbacks;
  C: the whole construction boundary including decoration and destination-render dispatch. The middle boundary
  B may be the cleanest stage 5 (it delivers the host-field consumer without pulling render dispatch across
  the seam), but the choice is the planner's. Waits on the planner to choose one and scrub the two records
  that do not match it (StandardsDocument §6.6) so plan step, swipe.js header, and this log state one scope.
  This is the root question — seam, host fields, and pane lifecycle are all downstream. Charpy finding F0 —
  2026-07-22.

- OPEN — the stage-5 dependency SEAM (the W8 question). `ghostApp`/`snapshotHome` reference app.js closures
  absent in `swipe.js` (`freezeArt`, `ghostWrap`, `copyScroll`, `copyAnimPhase`, `lastAnimResidual`, the
  session `d`, `$`), so plan §7.5's "unchanged" is not literal. Waits on the planner to state, before build:
  which helpers move with the builders, which dependencies are injected, what each builder accepts, what it
  returns, and where the capture diagnostics (`ghostY`/`animSync`/`animRes`) are recorded. PREFERENCE (F5,
  a design recommendation grounded in the coupling evidence, NOT an existing contractual rule): each builder
  RETURNS its capture (e.g. `{ element, capture: { scrollY, animationSyncCount, animationResidual } }`) and
  the construction owner records it onto the session; a narrow telemetry callback is acceptable. The seam
  should not receive or mutate the whole session object `d` unless the planner explicitly justifies that
  ownership — passing `d` retains the closure coupling the extraction removes and lets a recipe mutate
  caller-owned session state. Charpy findings F1+F5 — 2026-07-22.

- OPEN — whether stage 5 reintroduces `sourceHost`/`destinationHost` into `classifyTransition`. This is a
  CONSEQUENCE of the scope choice, not an independent question, and the 2026-07-21 entry that promised them
  unconditionally is thereby narrowed. No file reads the fields today (`.229` removed them), but stage 5 may
  create their first consumer: under scope B or C the moved boundary replaces the raw branching
  `fromOv ? overlayEl(fromV) : appViewEl(fromV)` and the `#browse`/overlay selection with host resolution
  that genuinely reads them, in the same commit that reintroduces them. Under scope A that resolution stays
  in app.js and the fields have no reader — reintroducing them would recreate the dead field `.229` removed.
  So: scope B or C ⇒ reintroduce and name the resolution line that reads each; scope A ⇒ do not reintroduce
  and correct this log. (`d.clobbered`, app.js:630, is `sameBrowseHost`, stage 6, under every scope.) Charpy
  finding F3 — 2026-07-22.

- OPEN — whether stage 5 begins the §3.6 pane abstraction or defers it. §3.6 defines a pane as `{ kind,
  element, source, pin, equivalence, release(), dispose(reason) }`; today the builders `return wrap` (a raw
  node, app.js:496/579). A raw-node return is not itself a defect — it is one only if stage 5 is intended to
  introduce the complete abstraction. Waits on the planner to STATE which: if pane-lifecycle ownership stays
  stage-6 work, stage 5 may retain a raw-node or capture-result representation and explicitly defer
  `release()`/`dispose()` to stage 6 (when finalization becomes their consumer). A partial capture object
  (`element`/`source`/`equivalence`/`capture` now, lifecycle methods in stage 6) is a good phase split — the
  same shape as `constructionPlanFor()` vs `finalizationPlanFor()` — but one valid option, not the only one.
  What is not admissible is leaving the representation unstated. Charpy finding F6 — 2026-07-22.

- The CI mutation-sweep runs SHARDED across an 8-way matrix (`.236`), not serially. Wall-clock drops from
  ~13 min to ~2 min while staying every-push. `tools/mutation-sweep.mjs --shard=I/N` computes shard I's
  slice `{ k : k % N === I }` from the live mutation count; the N shards partition the set (union = every
  mutation, no overlap), so no guard is silently skipped as mutations are added, and the sweep is complete
  only when all shards pass. Chosen over (a) moving the full sweep to a nightly schedule — rejected because
  every-push feedback is worth keeping now that it is fast; and (b) more than 8 shards — rejected because
  each shard re-pays a ~16s checkout+`npm ci` toll and GitHub caps ~20 concurrent jobs, so past ~8 the total
  runner-time rises for negligible wall-clock gain (floor is one suite run). Supersedes the earlier "full
  sweep stays in CI, serial" arrangement; it still stays in CI — 2026-07-22.

- The plan verifier (Charpy) is durably hardened against the three failure modes the stage-5 review
  exhibited (they took two user critiques to correct): (1) silently collapsing a conflict between the
  records that define the work to one reading instead of surfacing it; (2) filing a flaw that holds only
  under an unresolved decision as an unconditional defect; (3) prescribing the implementation, and stating a
  design preference as an existing rule. The fix is structural, not a reminder (the project's rules-vs-gates
  law): three disciplines added to the global Charpy spec Local section (`~/.claude/personas/Plan/Charpy/
  Charpy.md` — D1 reconcile-every-defining-record/enumerate-completely, D2 conditional-is-not-a-defect, D3
  requirement-not-prescription/preference-is-not-law), plus a global PostToolUse gate
  (`~/.claude/hooks/charpy-casebook-gate.sh`, wired in `~/.claude/settings.json` beside the Poirot gate) that
  blocks writing any `Claude/Charpy/*.md` declaring `Type: plan-review` unless it carries a `## Verdict`
  (forge/temper/scrap), a `## Defining records` section stating an explicit agree/conflict verdict across the
  authorities, and a severity + nature tag (defect/conditional/open-unknown/requirement/recommendation) on
  every `### F<n>` finding. The gate is proven able to fail (each failure mode reddens a fixture; a complete
  casebook and a non-casebook path pass). These files are global (outside this repo), so they are not
  committed here; this entry records that this project's Charpy filings now follow the schema. The stage-5
  casebook was updated to conform (Type header, Defining records = CONFLICT, per-finding nature tags — F3
  tagged `conditional`, F5 `recommendation`, the two mis-classifications the critiques corrected). Global
  scheme change, logged here per the Poirot-gate precedent — 2026-07-22.

- The Charpy spec gains a fourth discipline (D4): state the tightest correct bound, and keep an
  enumerated option set's references consistent across the whole review — "implies at least B" is not
  "implies the broadest," and a range is not a point. It is comprehension-bound, not gate-enforced (the
  casebook gate cannot tell "implies C" from "implies B or C"), so it is the within-document scrub
  (StandardsDocument §7) specialized to a review's option set. Earned by a third critique of the stage-5
  review: one section said the host-field record "implies the broad scope" while two findings correctly
  said "scope B or C" — a lower bound rounded to the top of the range, contradicting the review's own more
  careful statement. The stage-5 casebook's "claim under review" was corrected to "at least real host/mover
  resolution: scope B or C." — 2026-07-22.
