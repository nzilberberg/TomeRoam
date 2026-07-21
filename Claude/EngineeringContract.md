# TomeRoam Engineering Contract

Standing requirements for all TomeRoam implementation, testing, planning, and review
work — not suggestions. Authored by the maintainer 2026-07-21. The goal is not merely to
make a requested test pass; it is to avoid repeating the bug classes found during the
`.90–.228` review cycle.

This contract is a per-project standard layered on the global `StandardsDocument.md`. It
is committed so a blind reviewer session and every future implementation session are
governed by the same rules. Per this project's own hard-won lesson (`tomeroam-
maintainability-gates`), a filed rule is only as strong as its loading/gating mechanism —
mechanizable items below should be turned into gates, not trusted to memory.

---

## 1. Verify the real interface before designing a fake or fix
Before changing a dependency, inspect its production signature and behavior. Record:
sync vs async; whether it returns a value/promise/status/sentinel/nothing; whether it
throws or converts failures to return values; whether completion can occur out of order;
whether callbacks have side effects beyond their return value. Do not create a fake
kinder or harsher than production. Prohibited: making a synchronous Presence method
deferrable; making an adapter throw when it returns `0`/`null`; making `audio.play()`
resolve immediately when the scenario depends on it staying pending; resolving a fake
promise without reproducing the real completion side effect. When only one method is
async, control that method only.

## 2. Trace the complete production path before modifying it
For every requested behavior identify: the public entry point; the real production
modules it calls; the resources it acquires; the state/identity that owns those
resources; every async continuation; every cleanup path; every alternate entry point for
the same action; the final externally observable state. Do not test an internal helper in
place of the public action. Drive the real DOM event; invoke the actual registered Media
Session handler; use the real stack/descriptor flow; use the real `app.js` coordination
path.

## 3. Distinguish identity, namespace, storage location, and ordering
Never assume one identifier proves another. For every identifier used as a key, equality
test, ownership claim, or ordering signal, document: who creates it; entropy/collision
behavior; whether it survives reinstall/reload/recreation/migration/partial storage loss;
whether it is globally unique, locally unique, or a namespace hint; whether it can
regress/repeat/be reused; what happens if two entities share it. Specifics: `dev8` may be
a namespace but is not proof of device identity; a Plex `ratingKey` identifies a current
library object, not permanent content identity; object identity ≠ semantic descriptor
identity; a timestamp is not a total order unless monotonicity is established across all
writers; a board/rating key is a storage location, not necessarily the payload's
identity; destructive actions must verify full identity, not a shortened namespace.

## 4. Use one global comparison rule everywhere records compete
Centralize the comparator. The same rule must be used in live-board merging, replica
adoption, archive/shard collapse, publication selection, reset arbitration, purge
arbitration, and diagnostics that report the winner. No separate UI vs durability
comparator. It must be observer-independent — never prefer "my" record differently per
device. If two distinct same-origin writes can share a timestamp, add a real
discriminator rather than relying on input order.

## 5. Separate wall-clock time from logical ordering
If a value controls durable ordering, reset/purge floors, or LWW decisions, do not rely
solely on a clock that can repeat or move backward. Use a logical or hybrid monotonic
stamp that advances when the device: issues a new durable record; restores its own
previous durable records; observes a newer foreign record; observes a reset; observes a
purge; loads replica/shard state. A new local write must be greater than every relevant
value the device has OBSERVED, not merely every value it previously issued.

## 6. One owner must own every asynchronous resource
A session/operation that acquires a resource retains its handle and retires it explicitly.
Resources: event listeners; timers; animation frames; deferred promises/request tokens;
panes and synthetic DOM nodes; borrowed real DOM nodes with temporary styles; Browse hold
leases; transition listeners; retry/watchdog callbacks. Do not divide ownership between a
session object, module-level booleans, closure-local timers, global cleanup functions,
CSS classes, or unrelated module state. Cleanup functions accept the owner explicitly
(`releaseGesture(session)`, `finishBrowseLease(session)`, `retireSettleResources(session)`).
No stale callback may act through "whatever session is globally current."

## 7. Distinguish borrowed and owned resources
Every movable DOM resource declares ownership: `{ element, ownership: 'borrowed-real' |
'owned-pane' | 'owned-decoration', role }`. Borrowed real nodes have temporary styles
removed but are never deleted; owned decorations are removed; owned panes are released
after readiness + the paint barrier, or disposed for a specifically allowed emergency
reason. Never use one vague "dispose movers" operation.

## 8. Define the active-owner endpoint
A session id is not enough — define exactly when the session stops owning live UI
resources. ARMED end: after listeners released. Vertical abandonment: after listeners and
acquired resources released. Commit/abort without a pane: after finalization completes.
Held reveal: only after the pane is actually released. Emergency recovery: after every
owned resource is disposed/invalidated. `activeSession !== null` must mean the session
currently owns live resources. Do not retain completed sessions as the active owner for
logging convenience.

## 9. Guard every stale continuation by owner and phase
Every async callback captures the operation/session identity and, before acting, verifies:
the owner is still current; the operation is in a phase where the callback is legal; the
resource has not been retired; finalization has not happened; it is not acting on a
successor session. A numeric generation check is insufficient if a session can complete
while remaining globally current. Tests must deliver stale callbacks after supersession,
pause, book switch, source change, sign-out, finalization, reveal completion, and a
successor session beginning.

## 10. Test dangerous intermediate states, not only eventual outcomes
An eventual green endpoint hides incorrect ownership/ordering. When a requirement says
"until," "before," "after," "only once," or "while pending," assert both sides of the
boundary. Examples: session stays active while the reveal pane remains; the pane remains
through the paint barrier; the old Browse source is restored before the replacement
gesture arms; the transition listener is removed when the fallback timer wins; an old
animation frame cannot restore transforms after finalization; finalization runs once when
both `transitionend` and timeout fire; the outgoing progress commit occurs exactly once
before the incoming track becomes current. Do not name a test "only after" when it checks
only the final state.

## 11. Mutation verification must target the actual claim
A green test proves little until a precise defect turns it red. For every important test,
record the mutation, the exact expected failing test, and the detecting assertion.
Mutation examples must include MISATTRIBUTION, not only omission. Weak: remove the session
id from a log. Strong: log the successor session's id instead of the superseded one's.
Weak: remove all listener cleanup. Strong: leave only the old target's move listener
attached and prove it mutates the successor. Mutation tooling must preserve and rerun the
evidence — manual mutation checks must not disappear into a commit message. Source-
fingerprint mutations and behavioral mutations use separate sweeps so a source-text gate
cannot falsely claim it detected runtime behavior.

## 12. Test claims may not exceed what the test proves
Before naming/documenting a test, ask: what exact counterexample would still pass?
Overclaims to avoid: "registry is fully derived" when half is hand-maintained; "all
transitions" when same-screen parameterized transitions are skipped; "deeply immutable"
when only the outer object is frozen; "ordering proven" when audio and Presence use
separate logs; "async refresh covered" when the test returns early if no request exists;
"failure isolation covered" when the fake completion has no production side effect. Use
narrower names when the proof is narrow.

## 13. No silent early returns in coverage tests
A test must not treat "the operation never happened" as success. Prohibited:
`const op = findOperation(); if (!op) return;`. Required: `const op = findOperation();
assert.ok(op, 'the production trigger must start this operation');`. A test that can pass
without reaching its subject is worse than no test.

## 14. Exact schema checks for contract objects
For plans, classifications, records, diagnostics, and state-machine outputs: assert exact
keys; validate every enum; reject unknown values; reject missing required payloads; reject
impossible combinations; deeply freeze immutable output; clone caller-owned arrays and
objects before freezing. Do not use a projection helper that silently discards unexpected
fields when the requirement is "no dead fields." Test direct calls to each exported
function — one function's correctness must not compensate for another's incomplete
contract.

## 15. Parameterized descriptors require semantic scenarios
Do not reduce navigation coverage to screen names. Include: same type, different identity;
same semantic identity with separately allocated objects; the identical descriptor object
at both endpoints; malformed parameterized descriptors; missing identity payload; unknown
screen type; no-op/same-destination behavior. Semantic equality must be explicit — do not
accidentally use object reference equality.

## 16. Keep the frozen oracle independent
Production must not generate its own expected output. Three layers: (1) independent
declarative scenario-and-expectation DATA; (2) production implementation; (3) tests and
doc generators that compare/render the independent data. Do not reimplement production
branching in the generator, call production `planFor()` to generate the frozen
expectation, or make production consume the test expectation table. Share enums,
registries, and validation schemas; do not share expected decisions. An intentional policy
change requires BOTH a production change AND an explicit frozen-spec + policy-ledger
change.

## 17. Do not create dead fields for future stages
Implement only fields consumed in the current stage. Staging: Stage 4 = construction
fields only; Stage 5 = pane builders and typed mover resources; Stage 6 = finalization,
commit/abort, scroll, recovery, reveal policy. Do not return the final rich object early
merely because the plan eventually calls for it. When adding a field, identify its current
production consumer and a test proving that consumer uses it.

## 18. Avoid duplicate sources of truth
Do not return both a cause and a separately stored derived answer unless both are
independently necessary. Avoid: `clobbered` plus `abort.render`; raw descriptors plus
caller-supplied source/destination hosts; timestamp winner plus a separately implemented
diagnostic winner; resource ownership in both a session and module globals; `hasPane` plus
outgoing/incoming pane kinds. Derive the convenience result at the use site.

## 19. Separate normal release from emergency disposal
Normal visual release honors under-view semantic readiness, the paint barrier, single
ownership, and exact-once removal. Emergency disposal may bypass the paint barrier only for
named reasons. A new gesture must not dispose a pane owned by an active SETTLING,
FINALIZING, or REVEALING session. An orphan pane with no owner is a different condition.

## 20. Recovery must be phase-aware
Once the navigation stack has changed, the stack is authoritative. One rule: pre-stack
failure restores source and starting scroll; post-stack failure renders the current stack
top and applies destination scroll policy. Apply consistently to lease invalidation,
destination disappearance, finalization exceptions, supersession during finalization, and
other failures crossing the authority boundary. Do not restore the source beneath a stack
that already names the destination.

## 21. Separate parity from new policy
Classify every change as: behavior-preserving extraction; known-red repair; new recovery
policy; or unrelated cleanup. Do not smuggle a bug fix into a parity refactor. Maintain a
structured exact policy ledger and assert its full contents; adding/removing a new-policy
item requires an explicit ledger change.

## 22. Mechanical derivation beats confident reading
Where inventories can be generated, generate them: registered screen types; settings
sub-screens; descriptor scenarios; transition combinations; source append sites; required
harness globals. Do not hand-maintain exhaustive prose lists. When full derivation is
impossible, describe the mechanism honestly as "partly derived and partly pinned," and
fingerprint the pinned sources.

## 23. Do not widen the scope in response to a finding
Fix the violated invariant, not nearby architecture. Do not: run `sw.js` in Node merely
because app integration needs SW failure coverage; make sync methods async to create race
tests; redesign download storage keys merely to detect stale rating keys; widen a shard
namespace when full-id validation can contain the risk; restore a hidden Browse host
during abort as part of a behavior-preserving extraction. Record adjacent cleanup
separately.

## 24. Staged extraction must preserve reviewable deltas
Each stage has: a narrow production change; explicit fields newly consumed; unchanged
legacy behavior outside the stage; stage-specific tests; mutation evidence; an honest
completion statement. Do not call a stage complete when only its first bookkeeping slice
has landed. Name partial owner stages honestly (e.g. "Stage 3a: session identity").

## 25. Before reporting completion
Answer all of: (1) which exact public paths are exercised; (2) which dependencies remain
fake; (3) which fake behaviors match the production interface; (4) which intermediate
states are asserted; (5) which resources are owned and explicitly retired; (6) which stale
callbacks were delivered after supersession; (7) which exact mutation turns each new test
red; (8) which required scenarios remain missing; (9) which fields are present but not
consumed; (10) which claims are narrower than the original assignment; (11) which behavior
is parity, known-red repair, or new policy; (12) did the full suite, lint, typecheck,
build coherence, behavioral mutation sweep, and source-gate sweep pass. Do not describe
work as complete when any required item remains deferred. State the completed slice
precisely.

---

## Required implementation-report format
At the end of each build, report: exact stage and slice completed; files changed;
production behavior changed; production behavior deliberately unchanged; contracts
introduced or modified; resources moved under explicit ownership; public paths tested;
intermediate states tested; mutations run and the test each triggered; known-red tests
still open; deferred work and the stage where it belongs; full verification results; any
assignment claim that was narrowed after inspecting the real code. The report must be
auditable against the repository. Avoid "fully covered," "exhaustive," "deeply immutable,"
or "complete owner" unless the tests establish those exact claims.
