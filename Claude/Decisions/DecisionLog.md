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

- Owed to stage 6 (from the .227 review's process note, recorded now so it is not lost): when the settle
  requestAnimationFrame, the settle/reveal timers, or the transitionend listener are cancelled OR fire,
  NULL their stored session handles (`cur.settleFrame = null`, etc.) so the session object describes LIVE
  ownership rather than stale numeric handles. Not a .228 blocker — it is part of the stage-6
  finalization-centralization work — 2026-07-21.
