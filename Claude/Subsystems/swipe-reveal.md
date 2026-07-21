# Subsystem Contract — Swipe / Reveal

Addendum to the Durable Engineering Contract (§5 template). Describes the CURRENT
architecture; revise per §6/§7 when it changes. Plan of record: `Claude/Plans/PLAN-swipe-reveal.md`.
Deep saga + traps: cross-session memory `tomeroam-swipe-repaint-saga`.

**1. Purpose and boundaries.** The horizontal edge-swipe navigation gesture and its
pane/reveal choreography — back-swipe, forward-swipe, and the mid-drag panes that make the
destination appear to slide in. Owns the gesture lifecycle and the classification of a
transition into what must be BUILT. Does NOT own the nav stacks (Nav) or playback.

**2. Public entry points.** The touch listeners bound in `begin()` (touchstart/move/end/
cancel) in js/app.js; the pure boundary `Swipe.classifyTransition()` / `Swipe.constructionPlanFor()`
in js/swipe.js. Tests drive the REAL gesture through `test/app-harness.js` `h.touch`.

**3. Authoritative state.** The nav stacks (`navStack`/`fwdStack`, owned by Nav) are
authoritative for WHERE; the active gesture session `d`/`session` is authoritative for the
in-flight drag. After the stack mutates at commit, the stack wins (see 13).

**4. State machine / lifecycle phases.** ARMED (edge grabbed, not yet past the lock) →
DRAGGING (`live`, panes built) → SETTLING (released, animating) → FINALIZING (applyScreen +
stack mutation) → REVEALING (held pane awaiting paint) → done. Gesture-ending inputs route by
STATE, not by input (I19).

**5. Identities and guarantees.** `d.id = ++sessionSeq` — a per-gesture monotonic id, unique
for the process lifetime, used to detect supersession. Not persisted; not cross-device. A
successor gesture gets a strictly greater id before the old one is released (I20).

**6. Ordering model.** Single-writer within the process (one gesture owns transforms/stack/
scroll at a time); supersession is ordered by `sessionSeq`. No cross-device ordering here.

**7. Resources acquired.** Touch listeners (on the start target); the settle
`requestAnimationFrame`; settle/reveal timers; a `transitionend` listener; owned panes
(ghost, home-snapshot); the NP pill clone (owned-decoration); borrowed real nodes
(#home/#browse/overlay) with temporary transforms; a row hold.

**8. Resource owner.** The gesture session (`d`/`cur`). Stage 3 stamped the session id;
resource-handle ownership (settle rAF stored on the session, cancelled in finalize) landed at
`.226`. **OPEN (stage 6):** the settle/reveal timers and the transitionend listener are not
yet session-owned handles that null on cancel/fire (DecisionLog).

**9. Ownership endpoint.** `sessionDone(cur)` / `endOwnership()`. ARMED end: after listeners
released. Vertical abandon: after listeners + resources released. Commit/abort without a pane:
after finalize. Held reveal: only after `drop()` releases the pane. `session !== null` must
mean live ownership — do not retain a completed session for logging (§4.5).

**10. Asynchronous operations.** The settle rAF; the settle/reveal timers; the transitionend
listener; the paint-gated pane release (I10). All can fire after the gesture that scheduled
them was superseded or finalized.

**11. Possible stale completions.** A settle rAF firing after finalize (fixed `.226`: cancel
on session). A transitionend or timeout firing after the other already finalized (must
finalize exactly once). A superseded session's listener firing on a detached start target
(the harness reproduces detached-target dispatch deliberately — do NOT re-target to document).

**12. Normal completion behavior.** Commit: mutate the stack, applyScreen the destination,
release panes after the paint barrier. Abort: restore the source; browse→browse re-renders the
source into #browse; restore starting scroll. Both honor exactly-once finalize.

**13. Recovery authority boundary.** The nav-stack mutation. PRE-stack failure → restore source
+ starting scroll. POST-stack failure → render from the stack top + destination scroll (I18,
§4.17). Do not restore a source beneath a stack that already names the destination.

**14. Emergency disposal rules.** `begin()`'s hard reset disposes an ORPHAN pane (no owner)
before arming. It must NOT dispose a pane owned by an active SETTLING/FINALIZING/REVEALING
session (I17). Emergency disposal may bypass the paint barrier only for that named reason.

**15. Persistence model.** None — the gesture is entirely in-memory and per-process.

**16. External side effects.** Renders into #browse (Browse.render); toggles body classes
(np-locked); calls Nav.applyScreen; mutates the nav stacks at commit.

**17. Independent test oracle.** THREE layers: `test/fixtures/swipe-plan-spec.mjs` (hand-written
declarative expectations) → `js/swipe.js` (production decision) → `test/swipe-transition.test.js`
compares them; `tools/gen-transition-matrix.mjs` RENDERS the spec (it must NOT call the
production planner — enforced by convention + the spec-import structure; §4.14). The app.js
branch-fingerprint mirror is RETIRED.

**18. Invariants.** classifyTransition emits ONLY current-slice fields `{fromKind,toKind,
decorations}` (no dead §3.3 host fields until a consumer lands — §4.15); its output and the
construction plan are DEEP-frozen and independently immutable (§4.11); every descriptor
scenario yields a plan or is rejected with a named reason (I16/§4.3, all seven §15 cases
covered); no default branch (unhandled kind THROWS); same-destination (bare same-v) is
documented impossible-before-the-planner, not a production branch.

**19. Mutation cases.** Registered in `tools/mutate.mjs` (swipe4 F1/F3/F4/F5/F6/F7/no-dead-
fields/F-i/F-ii/§15/§4.11), each mapped to the test it reddens; re-run by
`tools/mutation-sweep.mjs`, anchors gated by `test/mutation-anchors.test.js`.

**20. Known-red behavior.** Two stage-2 NEW-POLICY todos remain red by design (DecisionLog):
I20 superseding a live drag restores starting scroll; I11/I20 superseding a live browse→browse
drag re-renders the SOURCE into #browse. Also OPEN, unrelated: the headline aborted-swipe
repaint/flash (memory `tomeroam-swipe-repaint-saga`).

**21. Current policy-ledger references.** DecisionLog: the staged-review policy; construction-
only planFor phase-split; three-layer oracle + mirror retirement; same-destination
documented-impossible; the stage-6 cleanup debt (null the timer/listener handles).

**22. Explicitly out of scope.** Cross-device sync; the visual flash bug's root cause
(separate open investigation); playback; the nav stacks themselves (Nav).

**23. Conditions requiring revision.** Stage 5 (move the pane builders into swipe.js); stage 6
(finalization half — commit/abort/scroll/stackEffect + reintroducing sourceHost/destinationHost/
sameBrowseHost with their consumers); any change to navTo's push/replace rule (the same-
destination-impossible argument depends on it); adding a screen kind or a parameterized
descriptor family.
