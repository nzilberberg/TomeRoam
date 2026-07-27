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

- RESOLVED 2026-07-22 (scope B ratified — see the RATIFIED entry below). Was OPEN — stage-5 SCOPE: which extraction boundary does stage 5 take? The records conflict and leave the
  boundary unresolved: plan §7.5 (two capture recipes → A), the `js/swipe.js` header lines 24–27 (five
  builders + render calls → C), and this log's 2026-07-21 host-field entry (at least host/mover resolution
  → B or C, ruling out A but not uniquely specifying B). They
  map onto three admissible boundaries — A: capture recipes only (`app-ghost`/`home-snapshot`); B: capture
  recipes plus real host/mover resolution, leaving application rendering in app.js behind injected callbacks;
  C: the whole construction boundary including decoration and destination-render dispatch. The middle boundary
  B may be the cleanest stage 5 (it delivers the host-field consumer without pulling render dispatch across
  the seam), but the choice is the planner's. Waits on the planner to choose one and scrub the records
  that do not match it (StandardsDocument §6.6) so plan step, swipe.js header, and this log state one scope.
  This is the root question — seam, host fields, and pane lifecycle are all downstream. Charpy finding F0 —
  2026-07-22.

- RESOLVED 2026-07-22 (see the RATIFIED entry below). Was OPEN — the stage-5 dependency SEAM (the W8 question). `ghostApp`/`snapshotHome` reference app.js closures
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

- RESOLVED 2026-07-22 (see the RATIFIED entry below — carried, read by `buildConstruction`). Was OPEN — whether stage 5 reintroduces `sourceHost`/`destinationHost` into `classifyTransition`. This is a
  CONSEQUENCE of the scope choice, not an independent question, and the 2026-07-21 entry that promised them
  unconditionally is thereby narrowed. No file reads the fields today (`.229` removed them), but stage 5 may
  create their first consumer: under scope B or C the moved boundary replaces the raw branching
  `fromOv ? overlayEl(fromV) : appViewEl(fromV)` and the `#browse`/overlay selection with host resolution
  that genuinely reads them, in the same commit that reintroduces them. Under scope A that resolution stays
  in app.js and the fields have no reader — reintroducing them would recreate the dead field `.229` removed.
  So: scope B or C ⇒ reintroduce and name the resolution line that reads each; scope A ⇒ do not reintroduce
  and correct this log. (`d.clobbered`, app.js:630, is `sameBrowseHost`, stage 6, under every scope.) Charpy
  finding F3 — 2026-07-22.

- RESOLVED 2026-07-22 (see the RATIFIED entry below — deferred to stage 6). Was OPEN — whether stage 5 begins the §3.6 pane abstraction or defers it. §3.6 defines a pane as `{ kind,
  element, source, pin, equivalence, release(), dispose(reason) }`; today the builders `return wrap` (a raw
  node, app.js:496/579). A raw-node return is not itself a defect — it is one only if stage 5 is intended to
  introduce the complete abstraction. Waits on the planner to STATE which: if pane-lifecycle ownership stays
  stage-6 work, stage 5 may retain a raw-node or capture-result representation and explicitly defer
  `release()`/`dispose()` to stage 6 (when finalization becomes their consumer). A partial capture result
  containing ONLY fields with genuine Stage-5 production consumers is one valid split — e.g. `{ element,
  capture }` if those are the only values consumed now; `source`/`equivalence`/`release()`/`dispose()` wait
  for the stage that introduces their runtime consumers (a test-only read does not justify a production
  field — the same no-dead-fields rule, Engineering Contract §17, that F3 applies). GENERAL RULE: the chosen
  representation must contain no field or method whose only consumer is a test or a later planned stage.
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

- The Charpy spec gains a fifth discipline (D5): correct the class, not the instance — when a finding,
  claim, or wording is corrected, sweep the whole review for every sibling of the same class before filing.
  Comprehension-bound like D4, and deliberately NOT gated: a checkbox certifying a sweep without forcing it
  would be structure for its own sake, so the honest fix is to run the sweep every time. Earned because
  three successive critiques of the stage-5 review each found a fresh instance of a class already corrected
  elsewhere in the same document (an absolute verdict that was conditional; a lower bound rounded to the top
  of its range; a coupling concern fused into a behavioural-parity claim). The stage-5 casebook's three
  fourth-round fixes were then followed by a full-document sweep for further siblings (none found): A4 no
  longer makes parity depend on avoiding `d` (coupling is F5's separate concern); F6's raw-node option is
  valid under any scope A–C that defers the §3.6 lifecycle, not only under scope A; and the prediction says
  the improvised seam "relocates code but fails to establish a clean ownership boundary" rather than
  "achieves nothing structural." — 2026-07-22.

- D5's gateable core is converted from a rule to a gate: the Charpy casebook gate now blocks a finding
  tagged `conditional` unless its body names the condition it depends on (an if/when/unless/under/scope
  token), so a scope-conditional flaw can no longer be filed as an unconditional verdict — the most-repeated
  review error. Correcting the earlier claim that D5 "resists structure" (a comfortable stop): the D2 core
  was gateable and is now gated; only cross-prose consistency and the full semantic sweep (D4/D5 residual)
  resist a cheap gate, because a token-lint for over-strong language false-fires on legitimate unconditional
  defects and an over-firing gate gets skipped. The durable backstop for that residual is an INDEPENDENT
  read of the review — Charpy is every plan's adversary and has none of his own; the repeated manual
  critiques were that missing pass. Gate check proven able to fail (a conditional finding with no named
  condition reddens a fixture; a conditioned one and the real casebook pass). Global files (spec/hook); this
  entry records that this project's Charpy reviews are held to it — 2026-07-22.

- The Charpy casebook gate gains two more per-finding checks, gating every mechanizable slice of D3/D5:
  a `recommendation` finding using hard-law language (prohibited/forbidden/must-not/…) without a hedge is
  blocked (D3 — a preference cannot be filed as a rule, the F5 "prohibited" error), and an `open-unknown`
  finding that never names its unresolved question is blocked (D5 — it must read as a decision owed). Both
  proven able to fail on fixtures; the real casebook passes. A dogfooding bug was found and fixed in the
  process: the tag word "recommendation" contains "recommend" (a hedge token), so scanning the heading made
  every recommendation self-satisfy the hedge check — the gate now strips the nature-tag words from the
  heading before scanning — 2026-07-22.

- The "adapt durably" obligation is enforced by a hook, not stored as a memory (a memory is the ignorable-
  rule category this project's rules-vs-gates law rejects). A UserPromptSubmit hook
  (`~/.claude/hooks/adapt-durably-guard.sh`, wired in `~/.claude/settings.json`) injects the mandatory
  loop (fix → sweep siblings → build a gate/hook that makes the class mechanically impossible → prove it
  fails on a fixture and passes on the real artifact → record; discipline only for the residual that
  provably resists a cheap gate, shown with a concrete false-positive, never asserted). It does NOT key on
  critique PHRASING — the cue is being confronted with a substantive correction one could have guarded
  against, regardless of wording, and a prompt-text hook cannot detect that (a neutral factual correction
  carries no critique markers; a fresh task carries correction-shaped words), demonstrated by both false
  cases. So the explicit phrase "adapt durably" injects the full loop, and EVERY other prompt gets a short
  STANDING situational directive that states the cue and self-nullifies if the prompt is not such a
  correction. Corrects the earlier phrasing-matched design (which keyed on hardcoded critique phrases from
  the very session that produced it). Global files; this entry records the governing rule — 2026-07-22.

- Every mechanizable slice of the seven GLOBAL feedback rules (`~/.claude/memory/`) was gated or its
  resistance demonstrated, per the "adapt durably = max enforcement" rule; each memory now carries an
  `**Enforcement:**` line stating its status. NEWLY GATED: `tests-must-be-able-to-fail` — a global
  PostToolUse hook (`~/.claude/hooks/test-can-fail-gate.sh`) blocks a test file that declares test blocks
  but contains no assertion (vacuously green), across JS/Python/Go/Rust conventions; proven able to fail
  (a no-assertion test file reddens a fixture; an asserting one, a non-test file, and every real project
  test pass). ALREADY GATED in-project: the commit/CI slice of `no-assumed-success`/`no-fixed-before-
  confirmation` (pre-commit battery + ci-watch + [[git-commit-verify]]). RESISTS a clean gate, each with a
  concrete false-positive recorded in its memory: `speak-plainly-no-codenames` (path/filename/artifact
  references), `establish-dependency-surface` (cannot tell shared from local symbols), `no-bandaid-fixes`
  and `debug-transient-visual-bugs` (semantic judgment / methodology, no mechanical signal), and the
  cross-turn core of the two success rules (block-only Stop hook would block a truthful report of a
  prior-turn fix). Global files; this entry records the audit — 2026-07-22.

- The stage-5 review's records-conflict framing is corrected: the three records do NOT each authorize a
  distinct scope (that overstated the mapping as a bijection). The plan specifies A, the swipe.js header
  specifies C, and the DecisionLog requires at least host/mover resolution — permitting B or C, ruling out
  A, but NOT uniquely specifying B. The correct statement is: the records conflict and leave three
  admissible boundaries unresolved; the planner selects one. Swept across all three records that carried the
  error — the casebook (verdict, F0 title, F0 body, and the "two records that do not match" scrub line,
  which was arithmetically wrong for scope C where two records match), this DecisionLog scope entry, and
  Board.md. A D4 instance ("a range — {B,C} — is not a point — B") that survived because the D5
  whole-document sweep was not run; both disciplines already exist. NOT gate-able (demonstrated
  false-positive: a lint for "three records → three scopes" fires on the legitimate "one of three admissible
  scopes", and "two records that do not match" is only wrong given the actual record→scope mapping a script
  cannot know) — backstop is the D5 sweep plus an independent read — 2026-07-22.

- A second instance of the same records-conflict class was found after the first fix — F3 said the records
  "authorize all three scopes" and the prediction said "three records answer differently", both attributing
  scope-selection to the records instead of describing them as conflicting/unresolved. Corrected (F3 →
  "collectively leave three possible extraction boundaries unresolved"; prediction → "the records conflict
  and do not select one extraction boundary"). ROOT CAUSE of the survival: the prior D5 sweep grepped the
  FLAGGED STRINGS ("authorize three", "two records that do not match") rather than the semantic class, so
  differently-worded siblings slipped through. D5 in the Charpy spec is sharpened accordingly: sweep the
  meaning with a broad net (every construction that could express the error), not the corrected wording. A
  broad class-level re-grep now shows every records+scope construction across casebook/DecisionLog/Board
  uses the conflict/unresolved framing — 2026-07-22.

- F6's proposed stage-5 capture object is corrected: it justified `source`/`equivalence` fields by the I8
  equivalence TESTS, which recreates the dead field the same review's F3 forbids under the no-dead-fields
  rule (Engineering Contract §17) — a test-only read is not a production consumer. Corrected to: a capture
  result contains ONLY fields with genuine Stage-5 production consumers (e.g. `{ element, capture }`);
  `source`/`equivalence`/`release()`/`dispose()` wait for the stage that introduces their runtime consumers.
  General rule now stated in F6 and the DecisionLog F6 entry: the chosen representation must contain no field
  or method whose only consumer is a test or a later planned stage. Class-swept — the sibling in the
  DecisionLog F6 entry was fixed too; the PLAN-swipe-reveal §3.6/I8 hits are the plan's own definitions, not
  proposals. New Charpy discipline D6 (police your own proposals by the plan's rules). Enforcement split:
  a SHIPPED dead field is caught by the exact-key gate/§17 only where the surface is a registered contract
  function — an exempt impure builder return is not, so the review REQUIRES a per-field-production-consumer
  check for that return; the review-prose side (proposing the dead field) resists a cheap gate (demonstrated:
  a lint cannot tell a consumed field set from a test-only one without knowing production's reads), backstop
  = D6 + independent read — 2026-07-22.

- The stage-5 plan review (`Claude/Charpy/PLAN-swipe-reveal-stage5-2026-07-22.md`) is FINAL: verdict TEMPER
  stands, and every finding (F0–F6) has been confirmed correct across the review-of-the-review passes. The
  last editorial item — "Defining records" and "The claim under review" duplicating the record enumeration —
  is resolved: "Defining records" stays the canonical gate-required list with the conflict verdict, and "The
  claim under review" now points to it (and to F0 for the per-record boundaries) and keeps only its unique
  §3.6-model grounding and current-code analysis. The review is ready to hand to the planner; the four OPEN
  decisions (F0 scope A/B/C, F1 seam, F3 host-field consumer, F6 pane-lifecycle) plus the F2/F4/F5 step
  requirements are the planner's, and the build stays blocked on them — 2026-07-22.

- APPROVED (2026-07-22 — see the RATIFIED entry below): the planner's resolved Stage-5 plan
  (`Claude/Plans/PLAN-swipe-stage5.md`) recommends SCOPE B — move the two capture recipes + real
  source/host mover resolution + the Now Playing decoration into swipe.js behind an injected `env`; leave
  the Browse render dispatch and Browse hold in app.js behind narrow callbacks. Rationale grounded in code:
  B closes the decision/execution split swipe.js exists to own and gives the host fields a real consumer,
  while stopping at the Browse boundary that STAGE 7 (the lease interface, §7.7) redesigns — so it pulls no
  later-stage surface forward. A rejected as under-delivering §1 (construction still split across two
  modules; host fields still dead); C rejected on sequencing (moving Browse.render into swipe.js is
  re-touched by stage 7 — churn). The plan also settles the seam (`buildConstruction(plan, env) →
  { movers, capture }`, returns capture, never receives the session — F5), host-field consumers (F3),
  pane-lifecycle deferral of release/dispose/equivalence to stage 6 (F6), NON_CONTRACT export
  classification (F2), and two coverage layers with a Mendeleev pass (F4). The four OPEN F0/F1/F3/F6
  decisions were reviewed (Charpy rounds 1–2) and are now SETTLED; on approval the three records
  (PLAN-swipe-reveal.md §7 step 5, the swipe.js header, this log) reconcile to B. Not yet implemented — 2026-07-22.

- RATIFIED (2026-07-22): the Stage-5 plan (`Claude/Plans/PLAN-swipe-stage5.md`) is APPROVED — **SCOPE B**.
  Charpy's round-1 seven blockers (F1/F2/F4/F5/F6/F7/F8) and round-2 residuals (F1-r host-field projection +
  frozen-spec value coverage; F2-r app-ghost-only `ghostY?`; F3-r narrower `env.renderDestination` signature)
  are all resolved; the round-2 TEMPER is cleared. This SETTLES the four OPEN stage-5 decisions above: **F0**
  scope → B; **F1** seam → `buildConstruction(from, dest, env)` derives classification internally and returns
  `{classification, plan, movers, capture, sourceWasClobbered}` [SUPERSEDED 2026-07-23: return narrowed to
  FOUR keys — `classification` dropped as a dead field; see the 2026-07-23 §3-revision entry below], never
  receiving the session `d`; **F3** →
  `sourceHost`/`destinationHost` are CARRIED (not derived) and read by `buildConstruction`, honouring the
  2026-07-21 host-field entry, with the kind→host projection pinned in the frozen spec
  (`swipe-plan-spec.mjs`) and asserted per registry pair; **F6** → pane `release()`/`dispose()`/`equivalence`
  deferred to stage 6 (Stage 5 movers carry only `element`/`ownership`/`slot` + `capture`). The three
  conflicting records are reconciled to B this pass: `PLAN-swipe-reveal.md` §7 step 5, the `js/swipe.js`
  header (lines 24–27), and this log. Build may proceed — 2026-07-22.

- §3 CONTRACT REVISION — `Swipe.buildConstruction` drops `classification` from its return: the ratified
  return shape narrows from five keys to **four**, `{ plan, movers, capture, sourceWasClobbered }`.
  Decision 1 of the F1 resolution (Poirot review `Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md`,
  verdict fix-then-ship). Reproduced three ways before deciding: `grep '\.classification' js/` empty; L3
  (`start()`, app.js:458–475) reads `movers`/`capture`/`sourceWasClobbered`/`plan.decorations` and never
  `classification`; `node tools/dead-return-fields.mjs` reports `classification`. `classification` is still
  DERIVED and consumed INTERNALLY by `buildConstruction` (host resolution + plan derivation); only its slot
  in the returned object is removed. Decision 2 (consume it in L3) was rejected — L3 has no render-mode or
  host responsibility that needs it, so any L3 read would be the invented/meaningless read the review and
  EC §17 forbid. This applies the SAME no-dead-fields rule (EC §17) the stage already invokes to withhold
  `sameBrowseHost`, and follows the `.229` pattern: a classification/host field returns in the commit that
  first CONSUMES it, not on spec — if Stage 6's `finalizationPlanFor`/`planFor` needs the classification it
  returns then, with its consumer. The `plan` field STAYS (live: L3 reads `plan.decorations` for the
  outgoing-NP `np-locked` unlock); narrowing `plan` to `decorations` was considered and declined as
  out-of-scope gold-plating (`plan` is not a dead returned field — EC §17 fires at returned-key
  granularity and `plan` has a consumer). The §4 ledger already carried no return-row for `classification`
  (only an L1-derives input row), so §3 now AGREES with §4. Handed to Charpy to stress → Curie to reconcile
  `CONSTRUCTION_KEYS` (`test/swipe-construction.test.js`, the exact-shape test) → Brunel for the narrow code
  change; on Brunel's commit the detector reports zero dead, the "every `Swipe.buildConstruction` returned
  field is consumed by `start()`" known-red flips green, and `KR-swipe-construction-dead-classification` +
  its `TRACKED_OPEN` allowlist entry are removed. Not yet implemented (bench only; the on-device hold
  applies) — 2026-07-23.

- The build-gate spec corrections plan (`Claude/Plans/PLAN-build-gate-spec-corrections.md`) is **RATIFIED**
  (Charpy FORGE after a TEMPER round; casebook `Claude/Charpy/PLAN-build-gate-spec-corrections-2026-07-23.md`)
  and its approved wording is **FROZEN** (registered in `~/.claude/frozen-artifacts.txt`; freeze-guard
  verified to deny edits). It corrects the installed Gate A/B build-gate spec (Brunel.md Local §) for the
  user's defects, WITHOUT weakening the defense that caught F1: (C1) the code-level returned-key gate
  (`dead-return-fields.mjs`/`construction-consumers.test.js`) STAYS Gate A's mechanical basis — the
  contract↔ledger reconciliation is a plan-authoring complement the Vitruvius authoring gate already runs
  (`vitruvius-plan-gate.sh` 298/313), NOT a build-side re-invention, and it structurally cannot catch a dead
  RETURNED field (one consumed before the return passes it); (C2) the semantic "does production genuinely
  read this" check is split by DECIDABILITY — Charpy pre-FORGE for EXISTING consumers, the code-level gate at
  Brunel admission for consumers the plan newly builds — never the author self-certifying; (C3) Gate B must
  prove the DESIGNATED test reddens on the mutation's intended assertion (bare sweep `CAUGHT` rejected),
  mechanized later by `campaign-gate.mjs` (designed, deferred); (C4) `[cell-id]` test/mutation tagging is a
  new machine protocol, manual until `campaign-gate.mjs` reads it. Corrections are cleared to INSTALL into
  Brunel.md/Charpy.md per §6 as a SEPARATE step (not done at ratification). CONFIRMED ROOT CAUSE recorded:
  an AUTHORING-GATE ESCAPE — the Stage-5 plan is RATIFIED yet FAILS `vitruvius-plan-gate.sh` today with 6
  violations (no `vitruvius-contract`/`-effects`/`-coverage` blocks; 3 ambiguous-owner ledger rows); the
  gate exists but is unwired, so ratification outran it, and the prose return contract is why F1 could hide.
  Two items left OPEN (§9, decision owed): (1) wire the Vitruvius authoring gate to block ratification
  (legacy-plan migration cost is why it is unwired); (2) review-gate persona-spec edits (freeze-guard on
  `~/.claude/personas/**`). The Brunel.md/Charpy.md specs are GLOBAL (outside this repo); this entry records
  that this project's build-gate work follows the ratified plan — 2026-07-24.

- The two OPEN §9 items of the build-gate corrections plan are DECIDED and BUILT (the authoring-gate escape
  and the persona-spec hand-edit are now mechanically closed; supersedes their "OPEN" in the now-frozen
  plan). (1) The **Vitruvius authoring gate is WIRED**: `~/.claude/hooks/vitruvius-plan-gate-hook.sh`
  (PostToolUse Edit|Write|MultiEdit, in `~/.claude/settings.json`) runs `vitruvius-plan-gate.sh` on any
  `Claude/Plans/*.md` write and blocks (exit 2) a structurally-incomplete plan. It applies to NEW, MODIFIED,
  and RATIFIED plans; untouched legacy plans are GRANDFATHERED BY CONSTRUCTION — a PostToolUse-on-write hook
  never fires on a plan that is never written, so a legacy plan is gated only the first time it is modified.
  The gate keys on `Type: plan` OR a `vitruvius-gate` declaration, so a plan cannot dodge it by omitting the
  declaration (a `Type: plan` file with no declaration is blocked). (2) **Persona specs are INSTALL-ONLY**:
  `~/.claude/hooks/persona-spec-guard.sh` (PreToolUse Edit|Write|MultiEdit|NotebookEdit) DENIES a direct
  edit to any `~/.claude/personas/**` file. A persona-spec change must come from a Charpy-FORGED process
  plan and be installed MECHANICALLY by Zelda from the frozen approved patch (a Bash apply, which the hook
  does not intercept — same honest scope as freeze-guard: it closes the ad-hoc-hand-edit path, not the
  filesystem). This makes the exact 2026-07-23 miss (Vitruvius hand-editing Brunel.md) mechanically
  impossible. Both proven able to fail (fixture) and pass (real): the gate blocks the 6-violation Stage-5
  plan and a declaration-less `Type: plan` file, passes the ratified build-gate plan, and skips non-plan
  paths; the persona guard denies Brunel.md/Charpy.md and allows plans/code. GLOBAL hooks (like the Poirot/
  Charpy/adapt-durably gates); they go live after a `/hooks` reload or restart. This project's DecisionLog
  records the governing rule — 2026-07-24.

- The ratified build-gate plan's §6 CLAIMED the drafted persona replacement text was "held with this plan
  for the installer" — but that artifact never existed (an overclaim in the now-frozen plan; the verbatim
  text was never produced). Zelda correctly refused to compose unreviewed persona wording on the spot. It
  is now produced as a SEPARATE companion: `Claude/Vitruvius/INSTALL-PATCH-build-gate-spec-corrections.md`
  — verbatim Brunel.md (Gate A/B Local §) replacement + a Charpy.md D10 insertion, conforming to plan §5/§6,
  Charpy r1 (F1–F7), and Charpy r2 FORGE including **F2r** (state the code-level check as the returned-key
  reachability gate WITH the exact-key contract gate for destructured reads, since a `<var>.<field>` scan
  cannot see `const {x}=obj`). Status PROPOSED: it goes to Charpy for a conformance-verify, is then frozen,
  and only then applied MECHANICALLY by Zelda (the persona-spec-guard blocks hand-editing). The frozen plan
  is NOT edited (the overclaim is corrected by this superseding record, not by touching the frozen artifact).
  Filed under `Claude/Vitruvius/`, not `Claude/Plans/` — it is not a plan; the newly-wired plan gate
  correctly flagged it as mis-filed when first written to `Claude/Plans/` (a `Status:` line there reads as a
  plan), which is the gate working, not a defect — 2026-07-24.

- The install-patch's Charpy conformance-verify was TEMPER
  (`Claude/Charpy/INSTALL-PATCH-build-gate-spec-corrections-2026-07-24.md`, F1–F4); resolved this pass,
  pending re-verify. TWO settled points. (1) **F2 scope decision:** Brunel's Gate A/B protocol is
  consciously scoped **TomeRoam-specific** — it lives in Brunel's project-Local section and names TomeRoam
  gate files (`tools/dead-return-fields.mjs` / `test/construction-consumers.test.js`); the patch states this
  so a global reader does not take the paths as universal. Abstracting the code-level check to the universal
  principle + a Brunel project adapter (mirroring the Charpy/Vitruvius seats) is FUTURE work, taken when a
  second project first needs it — not built now (single-project machine; smallest sound thing). (2) The
  patch adds THREE install targets now (Charpy's F1): D10 extends the discipline range, so the HEAD-wide
  scrub updates the three `D1–D9` enumerations (`Charpy.md:305`/`:339`, `Vitruvius.md:507`) to `D1–D10`;
  confirmed those three are the complete set. ADAPT-DURABLY note: the "numbered-range enumeration goes stale
  when the range is extended" class is left to DISCIPLINE (Charpy D5 sweep + the §6.6/§7 HEAD-wide scrub —
  which is what caught it), not a gate: a cheap max-heading-vs-range lint has a concrete false-positive on a
  legitimate NARROWER sub-range (e.g. "the structural disciplines D1–D3") or a historical quote of an old
  range, so it would misfire — 2026-07-24.

- The Stage-5 plan (`Claude/Plans/PLAN-swipe-stage5.md`) is FINALIZED and now PASSES the wired Vitruvius
  authoring gate (exit 0, node-validated) — the authoring-gate escape recorded above is closed for this
  plan. Corrected the six gate violations without touching the technical design: added the machine-readable
  `vitruvius-contract` block (§3 — the four-key return `{plan, movers, capture, sourceWasClobbered}`;
  `classification` absent, finalizing the dead-field removal), the `vitruvius-effects` block (§5, the
  replaced-callee effects each assigned one L1/L2/L3 owner), and the `vitruvius-coverage` block (§8, every
  blocking question F1/F2/F4/F5/F6/F7/F8 covered by a complete row); and disambiguated the three multi-owner
  ledger rows to a single accountable owner (`destinationHost`→L1 reads+forwards; `capture`→L1 produces+
  returns; `d.clobbered`→L3 records the session field finalize reads). The contract classes reconcile with
  the ledger (`sourceHost`/`destinationHost`/`capture` = object in both). Returned to the same Stage-5
  Charpy session for review; the §3-revision chain (Charpy → Curie `CONSTRUCTION_KEYS` → Brunel drops the
  field) resumes from Charpy. Gate runtime is ~2 min on this box (MSYS fork-slowness); run it backgrounded —
  2026-07-24.

- Charpy r5 (`Claude/Charpy/PLAN-swipe-stage5-2026-07-24-r5.md`) re-reviewed the finalized Stage-5 plan and
  returned TEMPER; both findings resolved this pass (plan re-passes the authoring gate). F1 (dead NESTED
  return member): the four-key return `{plan, movers, capture, sourceWasClobbered}` still carried dead data
  — `plan.outgoing`/`incoming`/`renderDestination` are consumed only inside `buildConstruction`
  (swipe.js:291/301/305); only `plan.decorations` is read by L3, so the `plan` wrapper is dead on the return,
  the same no-dead-fields class as `classification` one level down. Fix: HOIST `decorations` to the top level
  (L3 reads `c.decorations`) and DROP the `plan` wrapper — the return is now `{ decorations, movers, capture,
  sourceWasClobbered }`. This corrects my earlier decision (2026-07-23) that declined to narrow `plan` as
  "gold-plating" — that reasoning was wrong: `plan` was live only via one sub-field, and the others were
  dead returned members. §3 type + `vitruvius-contract` block + §2/§3 prose updated; a `decorations`
  return-crossing row added to the §4 ledger. F2 (false coverage claim): the `vitruvius-coverage` `parking`
  row asserted a mutation the §8 prose correctly marks parity-only/unobservable (`move()` overwrites the
  parking transform the same tick) — corrected to an honest `n/a — parity-only` mutation cell (the gate
  requires a non-dash string, so honest text, not a fabricated mutation). Charpy also filed a RECOMMENDATION
  (not reviewer-merged): deepen the dead-return detector to NESTED granularity — routed to proper plan/test/
  build ownership, NOT built here. The chain resumes at Charpy; on FORGE, Curie reconciles `CONSTRUCTION_KEYS`
  and Brunel hoists `decorations`/drops the wrapper — 2026-07-24.

- Charpy r7 (`Claude/Charpy/PLAN-swipe-stage5-2026-07-24-r7.md`) returned TEMPER on three more; all resolved
  this pass (plan re-passes the authoring gate, exit 0). F1 (sibling-sweep miss — mine): §3 was scrubbed to
  `c.decorations` but §2 (the outgoing-NP unlock note) and §5 (the effect-table row) still instructed
  `plan.decorations`, the abolished wrapper — a self-contradictory spec. Scrubbed both to `c.decorations`.
  F2 (dead LEAF one more level down): the returned `decorations` objects are `{ kind, role, base }`
  (`constructionPlanFor`, swipe.js:97–98) but L3 reads only `deco.kind`/`deco.base` (app.js:475), so `role`
  ships as a dead cross-boundary leaf — a type annotation does not strip it. Fix: the plan now specifies
  `buildConstruction` returns `decorations` as an explicit projection
  `plan.decorations.map(({ kind, base }) => ({ kind, base }))`. F3 (machine contract↔ledger reconciliation):
  (a) VERIFIED against the gate that the `vitruvius-contract` format is FLAT `field | class` with lead-word
  reconciliation and does NOT support qualified/scoped names — so a case needing two distinct same-named
  fields, or richer reconciliation, is a gate-format enhancement ROUTED to maker-owned process work (a plan →
  Charpy → mechanical gate change), not written here as syntax the gate cannot parse; (b) reconciled the
  `sourceWasClobbered ↔ d.clobbered` name+class mismatch — the ledger clobber row is renamed/reclassed to
  `sourceWasClobbered (recorded onto d.clobbered) | boolean` so it matches the contract field by name and
  class. Two maker-owned tooling items are now routed (NOT built, NOT reviewer-merged): the nested-dead-return
  detector deepening (r5) and the authoring-gate qualified-name/reconciliation support (r7); both go through
  proper plan/test/build ownership. The chain still resumes at Charpy on FORGE → Curie → Brunel — 2026-07-24.

- Charpy r8 (`Claude/Charpy/PLAN-swipe-stage5-2026-07-24-r8.md`) returned TEMPER on one self-contradiction my
  r7 fixes introduced; resolved (plan re-passes the gate). The r7 F3 justification claimed
  `classifyTransition.decorations` and `Construction.decorations` are "the SAME value" (justifying one flat
  `decorations | object` contract row) and framed a divergence of two same-named fields as "a future case" —
  but the r7 F2 projection makes `Construction.decorations` `{ kind, base }` while `classifyTransition.decorations`
  stays `{ kind, role, base }`: they diverge in SHAPE NOW. The named risk: a builder trusting "same value /
  hoisted" hoists `decorations` unchanged and re-introduces the `role` dead leaf. Fix: the single flat row is
  accurate because the format records CLASS (both `object`), NOT shape; the shape divergence is PRESENT (the
  F2 projection), carried by the §3 prose + the `{ kind, base }` return type, with scoped/shape-level contract
  representation being the routed maker-owned gate-format work. Also swept the sibling "hoisted" phrasings
  (the status line and §3) to state "projected to `{kind,base}`, never hoisted unchanged," closing the
  builder-risk. This is the U13 internal-consistency class (a fix in one section contradicting a claim in
  another) — caught by Charpy's independent read; a mechanical gate for cross-prose contradiction is
  infeasible (NL semantics), so the residual stays on discipline + the review. Chain resumes at Charpy on
  FORGE → Curie → Brunel — 2026-07-24.

- The build-gate spec corrections are INSTALLED into the three global persona specs — 2026-07-24. Ratified
  Charpy FORGE (r2), then Zelda applied the frozen install patch mechanically: Brunel.md Local § Gate A/B
  rewritten to the four-checkpoint split (mechanical authoring gate → Charpy pre-FORGE on existing consumers
  → Gate A admission running the code-level returned-key gate for newly-built consumers → Gate B
  designated-test proof), with the code-level gate (`tools/dead-return-fields.mjs` /
  `test/construction-consumers.test.js`, plus the exact-key contract gate for destructured reads) named as
  Gate A's mechanical basis and explicitly TomeRoam-scoped; Charpy.md gained discipline D10 (pre-FORGE
  contract-member consumer verification, bounded by decidability); the three `D1–D9` range enumerations
  (Charpy.md:305/:339, Vitruvius.md:507) scrubbed to `D1–D10`. Post-apply verify: HEAD-wide `D1–D9` returns
  0 hits; git diff touched exactly those three files. The Brunel project-adapter abstraction remains future
  work (single-project machine).

- Stage-5 `Swipe.buildConstruction` four-key return IMPLEMENTED and green — 2026-07-25. The return narrows
  to `{ decorations, movers, capture, sourceWasClobbered }`: `classification` is derived and consumed
  inside `buildConstruction` but no longer returned; the `plan` wrapper is dropped, with `decorations`
  hoisted to top level and projected to `{kind,base}` (the `role` leaf stripped). The sole production
  consumer, `start()` in `js/app.js`, reads `c.decorations` (was `c.plan.decorations`);
  `docs/swipe-model.generated.txt` regenerated. Red-first: Curie proved `test/swipe-construction.test.js`
  red against the old five-key shape before any code change (`Claude/Curie/RED-swipe-stage5.md`); Brunel
  greened it (`Claude/Brunel/swipe-stage5-buildconstruction-green.md`). `tools/dead-return-fields.mjs`
  reports zero dead fields, so `KR-swipe-construction-dead-classification` is retired — its PolicyLedger
  entry, its `{todo}` known-red in `test/construction-consumers.test.js`, and the `TRACKED_OPEN` allowlist
  are removed, and the HARD GATE now asserts zero dead returned fields on `buildConstruction`
  unconditionally. Full suite 683 tests / 0 fail / 2 todo (the unrelated `KR-swipe-scroll-restore` +
  `KR-swipe-source-rerender`). Ratified plan `Claude/Plans/PLAN-swipe-stage5.md` (Charpy FORGE r9;
  r1–r9 casebooks committed `f6d6985`). Bench only; the on-device hold applies; not yet pushed/deployed.

- The `Readonly` on `Construction.decorations` in `PLAN-swipe-stage5.md` §3 is DOCUMENTARY, not a
  runtime-immutability requirement — 2026-07-26. Ruling on Loki strike NB1
  (`Claude/Loki/STRIKE-swipe-stage5-narrowing.md`), which noted the narrowed return (commit `0049a13`)
  hands `start()` a fresh UNFROZEN projected `decorations` array where the old five-key return handed a
  deep-frozen one. Primary evidence: `Swipe.buildConstruction` is registered `NON_CONTRACT` in
  `test/contract-function-gate.test.js` and `js/swipe.js` (the return carries live DOM nodes, so it is
  deliberately exempt from the §4.11 deep-freeze gate — the whole Construction is by ratified design not
  runtime-frozen). §3's type block is explicitly "TypeScript-style notation; project is vanilla JS," in
  which `Readonly<T>` is a compile-time annotation with no runtime effect; only `decorations` carries it
  while `movers`/`capture`/`Mover`/`Capture` do not, the asymmetry of a documentary type annotation rather
  than a freeze policy. The prior freeze was INCIDENTAL — transitive from embedding `constructionPlanFor`'s
  deep-frozen contract output by reference (`c.plan.decorations`); it was never a property `buildConstruction`
  authored on its own top-level return, and the ratified narrowing replaced the embedded frozen sub-object
  with a projection (`plan.decorations.map(({kind,base}) => ({kind,base}))`) the plan authored WITHOUT an
  `Object.freeze` wrapper, whereas everywhere the plan wants a freeze it writes `Object.freeze` explicitly.
  Consequence: no implementation gap at `0049a13`; commit `0049a13` meets the plan as now stated. §3 line 150
  edited to drop `Readonly` and state the fresh-unfrozen truth. Because this edits a RATIFIED plan, the §3
  scope re-opens ratification and routes to Charpy to re-gate. No general immutability gate for NON_CONTRACT
  object-returning seams is in scope — NON_CONTRACT returns cannot be deep-frozen (live DOM), so there is no
  hole to close there.

- Stage 6a (swipe supersession recovery) IMPLEMENTED and green — 2026-07-26. On a gesture superseding a live
  drag, begin() now recovers the old session's source INSIDE the Browse hold — re-render into #browse iff
  `d.clobbered`, restore `d.scroll0` while the rows stay suspended — then releases the hold LAST
  (`dropRowHold`→`endHold` after the render+scroll), nulls the session/`d` identity LAST, and only then arms,
  so the successor's start() snapshots the restored, kept-row source even on a virtualized library. Closes
  the two supersession known-reds (KR-swipe-scroll-restore, KR-swipe-source-rerender); their tests
  (I20, I11/I20) are now live green guards and both PolicyLedger entries + the dangled-anchor mutation are
  removed. `begin()`'s recovery `applyScreen` forces `resetScroll:false` only when a live session exists
  (`resetScroll: d ? false : undefined`), preserving the orphan hard-reset's reset-to-top (Poirot F1). Scope
  bounded to these two policies (Stage 6a); the larger finalization / `sameBrowseHost` / pane-lifecycle work
  is deferred to a future 6b with recorded reasons (PLAN-swipe-stage6.md §11). Gates: Charpy FORGE (r4, after
  a Loki KILL on the original release-before-recover order + an F3 coupled-order TEMPER), Loki HELD_STONE on
  the corrected promise, Curie red-first (VR/OR/NC/OB-home), Brunel green, Poirot PASS, Mendeleev ADEQUATE.
  Built + reviewed at build `2026-07-26.246` (bench); on-device verification owed. The one residual: a
  device-only KEEPER guard (Loki NB-post-endHold-scroll-realize) is `{skip}` in jsdom — exercised on device.

- Pre-commit runner git-env boundary hardening LANDED — 2026-07-26. tools/hooks/run-checks.mjs now strips
  git's location env vars (GIT_DIR, GIT_INDEX_FILE, GIT_WORK_TREE, GIT_PREFIX, GIT_COMMON_DIR,
  GIT_OBJECT_DIRECTORY, GIT_ALTERNATE_OBJECT_DIRECTORIES) ONCE at the boundary — `stripGitLocationEnv(process.env)`
  before reading git config or spawning the test suite — so no FUTURE git-shelling test can reintroduce the
  ambient-GIT_DIR corruption (a throwaway-repo git write escaping to the real repo, flipping it bare/leaking
  config) by forgetting the per-call cleanGitEnv. This is the structural belt to the per-call cleanGitEnv
  suspenders in tools/mutation-sweep.mjs — the belt makes the class impossible. Guarded by
  test/run-checks-strips-git-env.test.js, a self-validating gate: its CONTROL corrupts an ambient throwaway
  repo under a poisoned GIT_DIR; its TREATMENT through the runner boundary stays pristine; deleting the
  boundary line reds it. Authored + Poirot-SHIP-reviewed in a separate task-chip session (branch
  claude/pensive-faraday-0d5932); grafted onto main — the branch was stale (pre-Stage-6a), so only the two
  boundary files + their Brunel/Poirot records were taken, never the branch's diverged tree. Build 2026-07-26.249.

- Stage 6b (async-handle ownership, RELEASE half) IMPLEMENTED and green — 2026-07-26. settle()'s
  finalize/reveal path now session-owns and retires three loser continuations at one resolver each:
  `cur.settleTimer` (340ms finalize fallback, cleared when the transitionend path wins), `cur.revealFrames`
  (the reveal double-`rAF` as a TWO-ID handle — the outer callback re-stores the inner id so the field always
  names the currently-pending frame; the winning `drop` cancels whichever is pending), and `cur.revealTimer`
  (600ms reveal safety-net, cleared at the winning `drop`) — so no loser timer/frame leaks onto the scheduler
  queue. Scope = the RELEASE half only; the NULL-on-retire writes, the `transitionend` listener's
  session-ownership/removal, and a per-handle-liveness observability surface are deferred to the I12 stage
  (their consumer — adding them now is unobservable/dead, §4.15). Gates: Charpy FORGE (r4, after r1/r2 TEMPER
  on vacuous coverage cells and a Loki KILL on the one-id double-`rAF` design → two-id fix → r3/r4), Loki
  HELD_STONE on the two-id promise (survived ten constructed interleavings), Curie red-first (DF + RR a/b/c
  via a per-id delta oracle, never queue emptiness — the winner's own continuations share the queues; RR(b)
  half-fired is the load-bearing discriminator), Brunel green, Poirot PASS, Mendeleev ADEQUATE. Build
  `2026-07-26.250` (bench; on-device owed). The Loki KILL is the headline: the ratified one-id handle leaked
  the inner paint frame in the half-fired timeout-drop interleaving (rAF stalled in a hidden tab), caught
  pre-build. Part of PLAN-swipe-reveal.md §7 step 6; the finalization centralization (I10/I17) + the rest of
  the seven deferred workstreams remain 6c/7.

- Stage 6c (pane-less supersession + settle-phase identity guard) IMPLEMENTED and green — 2026-07-26. Under
  the user's Option-A authorization (retire the `finishing` gate's ownership concern), begin()'s finishing
  gate is narrowed to its negative form `if (finishing && !(session && paneLess(session))) return;` so a live
  PANE-LESS session (the overlay-involving set {home→overlay, browse→overlay, overlay→overlay, overlay→browse}
  per the frozen spec paneOf) is supersedable; a `cur === session` identity guard on the settle rAF and BEFORE
  finalize's try/finally makes a superseded session's stale settle-phase continuation (settle rAF, 340ms
  fallback, late transitionend) no-op on the successor; the recovery clears `finishing = false` on every exit
  path (a superseding tap that never arms no longer wedges) and drops the session identity last. Gates: Charpy
  FORGE (r4, after an escalation on I12-vacuity-under-the-standing-gate → Option-A A/B split, then r1/r2 TEMPER
  on coverage vacuity + gate form, and a Loki KILL on a mis-enumerated pane-less DOMAIN → re-enumerate from the
  frozen spec → FORGE), Loki HELD_STONE on the corrected domain (90 checks), Curie red-first (G1/G2/G3/W/
  W(armed)/PG/G-chain, per-fixture paneOf assertion), Brunel green, Poirot PASS, Mendeleev ADEQUATE. Build
  `2026-07-26.251` (bench; on-device owed). DEFERRED to 6d/7: PANE-OWNING supersession (home↔browse, →home —
  the flash surface), the NULL-on-retire writes + transitionListener ownership (I12 consumer), finalizationPlanFor/
  sameBrowseHost/pane-lifecycle, and the I10/I17 paint-gated reveal centralization (the headline flash bug).

- Stage 6d (finalization decision extraction) IMPLEMENTED and green — 2026-07-27. The abort/recovery
  re-render decision moves from a RUNTIME build byproduct to a PURE DECLARED field: `Swipe.finalizationPlanFor(
  classification)` (js/swipe.js:162) returns a deep-frozen exact-key `{ abortRender }` — `'rerender'` iff
  `fromKind==='browse' && toKind==='browse'`, else `'none'` — throwing on an unhandled `fromKind` OR `toKind`
  (its own-contract guard, mirroring `constructionPlanFor`). It is the FIRST declared finalization field of the
  rich §3.3 `planFor()`, computed at ARM time from the resolved descriptors and stored on the session as
  `cur.finPlan` (js/app.js:442). The runtime byproduct `sourceWasClobbered` (js/swipe.js `buildConstruction`)
  and its stored session flag `d.clobbered` are RETIRED — a cause plus a separately-stored derived consequence
  (EC §4.16). `buildConstruction`'s return narrows from four keys to THREE (`{decorations, movers, capture}`).
  The three read sites consume the declared decision: the two finalize abort sites (app.js:1160/1187) read
  `cur.finPlan.abortRender === 'rerender'`; the begin() supersession recovery reader (app.js:417) reads
  `cur.live && cur.finPlan.abortRender === 'rerender'`. The `cur.live` conjunct is the load-bearing correctness
  point — the retired `clobbered` equalled `cur.live && (browse-to-browse)` (build actually ran AND the source
  `#browse` host was overwritten), so an ARMED browse-to-browse superseded before the 8px lock must render
  FALSE; dropping the conjunct would spuriously re-render `#browse` (a flash-adjacent repaint). Computing
  `finPlan` at ARM time (not at build) is what makes it defined for a pre-build ARMED session the recovery
  reader can run on. Behaviour-preserving EXTRACTION (byte-parity on every reachable transition), no known-red,
  no PolicyLedger entry (EC §4.19). The frozen `expectedFinalization: { abortRender }` oracle (inert since
  stage 4) is turned ON — `swipe-transition.test.js` now compares production `finalizationPlanFor().abortRender`
  against the hand-written frozen spec across all 8 structural cases (three-layer oracle, EC §4.14). Slice
  chosen on the dependency merits, not symptom-appeal: over the 6c-deferred set, D (the declarative finalization
  decision) and F (the pane-lifecycle interface) are the two roots, and D precedes F because the pane-removal
  POLICY F enforces is itself a field of D's plan (building F first would hand-code a policy D re-declares —
  EC §4.16); D is also the lower-risk root and lands entirely off the flash-timing surface. Co-changes landed
  in the same commit (the `clobbered`/`sourceWasClobbered` HEAD scrub): the Construction exact-key contract
  4-to-3 keys + its F6 test folded into cells FP+AB, five `mutate.mjs` anchors re-pointed + new mutants
  (FP/AB, RC, BC-1a/1b), the `gen-swipe-model` mirror + regenerated fingerprint, and comment/message sites.
  Gates: Charpy FORGE (after r1 TEMPER — enumerate every HEAD `clobbered` reference; the planner-found
  `cur.live`-conjunct non-parity), Loki HELD_STONE, Curie RED + BC-1, Brunel BUILD_GREEN, Poirot SHIP,
  Mendeleev ADEQUATE; completion gate COMPLETE. Ratified plan `Claude/Plans/PLAN-swipe-stage6d.md`. STILL
  DEFERRED to 7 (each behind its absent consumer): the I10/I17 reveal centralization (the flash core), the
  rest of the finalization plan (commit/abort-scroll/stackEffect/reveal + the unified `planFor()` wrapper),
  the host fields, the pane-lifecycle interface, pane-owning supersession, the `recoverSession` matrix, the
  I12 null-on-retire half, and `fadePanes`. Bench only; on-device verification owed.

- Stage 6e (owner-driven owned-pane disposal) IMPLEMENTED and green — 2026-07-27. The F(dispose) half of the
  pane-lifecycle interface (`PLAN-swipe-reveal.md` §3.4) lands for its one live consumer: a typed, session-owned
  `disposeOwnedPanes(session, reason)` (js/app.js, near `releaseGesture`/`dropRowHold`) removes exactly the
  session's `own==='owned-pane'` movers still attached, never a `borrowed-real` or `owned-decoration` mover (a
  structural guarantee of the `own` filter, EC §4.4). At the `begin()`-recovery site, the owned branch
  (`cur = d || session` truthy) calls `disposeOwnedPanes(cur, 'superseded')` and threads `keepGhosts:true` at
  BOTH the explicit `resetSwipeStyles` call and the `applyScreen` opts, so the DOM-global `.nav-ghost` sweep no
  longer duplicates the removal on that branch (closing the EC §4.3 "operate through whatever is global"
  anti-pattern for the owned case). The ORPHAN branch (`cur` null) is unchanged — the full `resetSwipeStyles`
  sweep still disposes a leftover ghost with no owning session. Behaviour-preserving EXTRACTION (byte-identical
  parity on every reachable state — the owner-driven removal set equals the set the old sweep removed for the
  owned case), no known-red, no PolicyLedger entry (EC §4.19). Dependency rationale: over the 6d-deferred set, F
  (the pane-lifecycle interface) is the correct next root now that D (the declarative finalization decision) is
  shipped; F splits into F(dispose) — this slice, off the flash-timing surface — and F(release), the paint-gated
  half the reveal centralization (C) is expressed in; C depends on F(release) and stays deferred; the compositor
  flash is promised by neither. Gates: Charpy FORGE (`Claude/Charpy/PLAN-swipe-stage6e-3e1b158.md`), Loki
  HELD_STONE (`Claude/Loki/STRIKE-swipe-stage6e-r1.md`, two residuals: the borrowed-real-never-removed invariant
  is tested (BR); the "every connected `.nav-ghost` is an owned-pane mover" invariant is unguarded and flagged
  owed, not constructible at HEAD), Curie RED-first (`Claude/Curie/RED-swipe-stage6e.md`; NOOP/RSN red at HEAD,
  DP/BR/HR/DEC/RGreveal parity + mutation-proven), Brunel BUILD_GREEN (`Claude/Brunel/swipe-stage6e-build.md`).
  Ratified plan `Claude/Plans/PLAN-swipe-stage6e.md`. STILL DEFERRED to 7: F(release) (the paint-gated
  `pane.release()` half, the flash core, = C); the SETTLING/REVEALING pane-owning supersession (B); the full
  pane object; the remaining `dispose(reason)` enum members and the folded orphan/decoration path (G); a
  production guard for the unguarded stranding invariant (Loki residual 2, routed to a plan amendment); the
  finalization remainder. Bench only; on-device verification owed.

- Stage 6f (in-flow→overlay outgoing app-ghost — the FIRST slice of the structural fix) IMPLEMENTED and
  green — 2026-07-27. For the in-flow→overlay transition family (browse→overlay, home→overlay, and their
  NP-decorated members browse→nowplaying/home→nowplaying) the OUTGOING is now represented by an owned-pane
  app-ghost instead of the transformed real in-flow view: `Swipe.constructionPlanFor` (js/swipe.js:135-136)
  changes ONE decision value — `outgoing = fromKind==='overlay' ? 'real-source' : (toKind==='home' ?
  'real-source' : 'app-ghost')` (was `toKind==='browse' ? 'app-ghost' : 'real-source'`). CI-observable
  structural invariant: the real `#browse`/`#home` is NEVER a mover and never receives a swipe-written
  inline transform on those transitions (SIbrowse/SIhome drive the real gesture through
  `test/app-harness.js` and read the real DOM). The change routes through the already-shipped `ghostApp`
  recipe + `buildConstruction` app-ghost branch + `disposeOwnedPanes` (6e), so js/app.js is UNTOUCHED —
  Loki's HELD_STONE strike on the §3 promise stays valid (Zelda-verified app.js unchanged; the
  mirrored-region fingerprints in `docs/swipe-model.generated.txt` are unchanged, which proves it; the
  concrete pane count in the regenerated matrix rose 27→62). Classified NEW POLICY (EC §4.19 — the
  construction REPRESENTATION changes), with NO known-red (the frozen `expectedConstruction` spec + the
  generated model are updated to the new `app-ghost` expected values and the suite stays green), NO
  PolicyLedger entry, and NO `§8A NEW_POLICIES` entry (an intended observable-parity, construction-
  representation change guarded by the frozen spec + the `swipe-transition` oracle — reverting the value
  reddens `test/swipe-transition.test.js` — not the behaviour-deviation ledger). HONESTY: this CI-verifies
  ONLY the structural invariant (the real in-flow view is not transformed on in-flow→overlay). It does NOT
  fix the headline browse→browse flash — that is the INCOMING real-`#browse` transform, a disclosed
  T8-forked deferral. And the visual no-peek for the vertically-INSET overlay destinations (`options` z25,
  the five settings subs z26) is DEVICE-VERIFIED only: the translucent topbar (z30, ~0.86 opacity + blur)
  and navbar (z40) bands can expose the now-stationary untransformed real view; `nowplaying` (full-viewport
  z60) has no band exposure. Loki's residual observation stands as an owed device obligation — finalize
  yanks a full-viewport composited ghost in one frame, so the flash saga's layer-teardown suspect is still
  open on device. The slice rests on an ENUMERATED precondition: all seven overlay kinds (`options`,
  `nowplaying`, `general`, `playback`, `buffering`, `downloads`, `diagnostics`) paint an opaque
  `background: var(--page-bg)` over their own rect (css/app.css, verified at HEAD); a kind-level flip cannot
  exclude one overlay, so any overlay-background change or new overlay kind reopens it (subsystem §23
  trigger). Gates: Charpy FORGE, Loki HELD_STONE, Curie RED, Brunel BUILD_GREEN, Poirot SHIP, Mendeleev
  ADEQUATE; completion gate COMPLETE. Ratified plan `Claude/Plans/PLAN-swipe-stage6f.md`; build target
  54a4d27 (suite 731 tests / 730 pass / 0 fail / 1 skip). Bench only; on-device verification owed
  (re-confirm the T4 opaque precondition; the T3 inset-band exposure; and any flash differential against
  the still-transformed browse→browse). STILL DEFERRED: the browse→home OUTGOING transform (its commit
  takes the home-reveal HOLD path); the INCOMING real-`#browse` transform (browse→browse headline
  [T8-forked], home→browse, overlay→browse); workstream C (I10/I17 paint-gated reveal centralization, the
  flash core); and the borrowed-real OVERLAY transforms (out of the invariant's scope).
