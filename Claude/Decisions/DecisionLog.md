# TomeRoam — Decision Log

A contained, append-only record of settled decisions, so a later session does not
re-open and re-argue them. One entry per decision, dated, one fact per entry, newest at
the bottom. State current truth in plain language; when a decision is superseded, edit
the entry to current truth (git holds the history). Detail lives in the plan-of-record
(`PLAN-swipe-reveal.md`, `PLAN-durable-progress.md`) and the cross-session memory; this
file holds only the settled conclusions.

Records home: this project's own records tree, `<project-root>/Claude/`, committed to the
repo. Per the scheme, records are per-project; the persona specs and conventions are
global (`~/.claude/personas/`) and are not restated here. No separate tactical board is
kept — the cross-session memory serves that view for the implementation sessions.

---

- A change to the PRODUCT (code, assets, tests, tooling, plans, docs in the repo) gets a
  new app build number, which labels a product tree state for review. The `Claude/`
  persona-records tree is scheme housekeeping, not product, and its commits do not bump
  the build — 2026-07-20.

- The swipe/reveal rewrite plan (`PLAN-swipe-reveal.md`, draft 7) is the plan-of-record,
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
  and adversarial-mutation discipline, and this decision log. No separate board is kept —
  2026-07-20.

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
