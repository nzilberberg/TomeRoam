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
