# Loki Strike — Stage 6e, owner-driven owned-pane disposal at begin()-recovery (r1)

**Date:** 2026-07-27
**Commission:** Stage 6e pre-build gate. Blind instance: no plan-review or rationale surface read
before or after this strike (commission ordered full blindness; reconciliation deferred to the
dispatcher).
**Artifact:** `js/app.js` begin() recovery (lines 357–446), `js/nav.js` resetSwipeStyles (102–108),
`js/swipe.js` (whole module), `js/browse.js` render entry (475), `index.html` (196), at the current
working tree (HEAD f25fc4f).

Verdict: **HELD_STONE**

---

## 1. The promise (verbatim)

> At the begin()-recovery owned-pane disposal site, the new owner-driven
> `disposeOwnedPanes(session,'superseded')` removes from the DOM EXACTLY the set of nodes the old
> DOM-global `.nav-ghost` sweep removed at that site — byte-for-byte, on every reachable gesture
> state — and NEVER removes a borrowed-real view (the real #home/#browse/overlay nodes) or leaves
> an owned pane stranded.

Restated as testable behavior: at every reachable entry into the recovery block (app.js:383) that
takes the owned branch (`cur = d || session` non-null), the set
`{ n : n matches '.nav-ghost' and n is connected }` must equal the set
`{ m.el : m in cur.movers, m.own === 'owned-pane', m.el connected }`. Any reachable state where the
two sets differ is the fracture: a member of the first set only is a STRANDED ghost (new code
leaves it, old sweep removed it); a disposal of a node outside the first set is a WRONGLY-REMOVED
node.

## 2. The plane chosen

The promise's strongest word is "EXACTLY ... on every reachable gesture state." Its one load-bearing
invariant: **every `.nav-ghost` in the document is always the element of an `owned-pane` mover of
the live session, whenever a live session exists.** Everything else (the orphan branch, the `.spent`
sweep) is unchanged by stage 6e. So the strike is a hunt for one reachable state where a connected
`.nav-ghost` is not in the live session's movers.

## 3. Planes struck, and what closed each

- **P1 — a prior gesture's ghost alive during a new session's lifetime.** Closed by ordering:
  begin() runs recovery BEFORE arming (app.js:383–423 precede 440–445), and the orphan branch (no
  live session) keeps the full sweep. By induction over begin(), the DOM is ghost-clean at every
  arm; during a session's life only its own build (Swipe.buildConstruction) mounts ghosts.
- **P2 — a `.spent` fading pane coexisting with the recovery.** Closed: the spent sweep
  (app.js:376) precedes the recovery predicate unconditionally, and `drop()` marks panes spent
  (fadePanes, app.js:683) before `sessionDone` in the same synchronous block — no observable state
  has an un-spent pane with a dead owner on that path.
- **P3 — supersession mid-BUILD (movers not yet populated, ghost already mounted).** The only
  window where the invariant could break: between `doc.body.appendChild(wrap)` (swipe.js:256/273)
  and `d.movers = ...` (app.js:507). begin() cannot interleave a synchronous handler, so the window
  opens only via a synchronous THROW inside it. Every throw source in the window is closed:
  `Browse.render` is `async function` (browse.js:475) — an async function converts sync-section
  throws into a rejected promise, never a synchronous unwind (executed, probe check 12);
  `env.navPill()` cannot be null (`.np-actions` is static, index.html:196); showAppView's
  `$(s).classList` targets static ids; copyScroll/copyAnimPhase are null-guarded/try-caught;
  the classify/requirePayload throws (swipe.js:70) fire BEFORE any mount (executed, probe check 11).
- **P4 — an orphan ghost coexisting with a live session.** Closed: every orphan-creation path
  (a finalize throw before `revealPending` is set → `endOwnership` in the `finally`, app.js:1197,
  1224–1227; a drop() timeout) nulls the session first, and the next begin() then takes the ORPHAN
  branch (full sweep, unchanged by 6e) before any new session arms.
- **P5 — supersession during a held reveal (pane covering past finalize).** Closed by the stage-6c
  gate (app.js:368): a pane-OWNING session rejects every new begin() until drop() has removed its
  panes and cleared `finishing`; the recovery site is unreachable in that phase.
- **P6 — a borrowed-real removed, or a mis-tagged mover.** Closed: ownership is assigned statically
  at the three build sites (swipe.js:319/328 'owned-pane', 322/332/334 'borrowed-real', 340
  'owned-decoration'); no borrowed element carries `.nav-ghost` (executed, all 10 transition
  classes).
- **P7 — movers naming an already-detached node** (e.g. a mid-drag tap-nav's applyScreen swept the
  ghost while the session stayed live). Equal by DOM no-op: removing a detached node changes
  nothing; the old sweep also finds no connected ghost. Byte-for-byte equality holds.
- **P8 — two owned panes from one session.** Closed by construction: app-ghost requires
  toKind='browse', home-snapshot requires toKind='home' — XOR (executed: max one ghost per build).
- **P9 — `d` and `session` diverging as handles at the site.** Closed: `session = d` at arm
  (app.js:444) and every exit nulls d first or both; d non-null implies session === d, so
  `disposeOwnedPanes(session)` and `cur` name the same object.

## 4. The instrument

`STRIKE-swipe-stage6e-r1.probe.js` (filed beside this record; run
`node Claude/Loki/STRIKE-swipe-stage6e-r1.probe.js` with the repo's jsdom). It drives the REAL
`js/swipe.js` buildConstruction over all 10 reachable transition classes and asserts, per build:
DOM `.nav-ghost` set === owned-pane mover element set (identity, not count); no non-owned mover
carries the class; malformed descriptors throw with zero nodes mounted; and an async function's
sync-section throw does not propagate synchronously. Result 2026-07-27: 12/12 OK.

## 5. Result

Predicted by the promise: set equality on every reachable owned-branch state. Observed: no
reachable divergent state found; the identity invariant executed clean across the full transition
space, and every non-executed plane closed by source reading cited above. The stone held.

## 6. Residual doubt (suspicions, not findings)

- **The invariant is unguarded.** P3 closes because today's one mid-window callback happens to be
  async. A future synchronous throw inside `env.renderDestination` (or a sync rewrite of
  Browse.render) silently reopens the exact stranding state — a live session with empty movers and
  a mounted ghost — and under 6e that strands an opaque full-viewport pane (z-28,
  pointer-events:none) until the next non-keepGhosts applyScreen. Under the old global sweep the
  same state self-healed at the next begin(). Not prosecutable today; named for the coverage owner.
- **The site's applyScreen call decides whether 6e is real.** Recovery also calls
  `applyScreen(currentDesc(), ...)` (app.js:417), whose first act is
  `resetSwipeStyles(opts.keepGhosts)` (nav.js:120). If the owned branch does not also pass
  `keepGhosts:true` there, the global sweep still runs one line later and the change is a
  behavioral no-op (equality trivially true, ownership claim decorative). If it does, equality
  rests entirely on the invariant above. Which of the two ships is a build-time fact this blind
  strike could not observe; the builder should state it.

## 7. Where I would strike next with a bigger budget

Boot the full app harness (test/app-harness.js) and drive multi-touch begin/move/end sequences with
a fault-injected renderDestination to measure the stranded pane's real user-visible lifetime; audit
js/virtuallist.js and browse.js showPage for any future sync path into the mid-build window.
