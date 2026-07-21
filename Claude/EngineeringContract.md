# TomeRoam Durable Engineering Contract

Treat this as a living engineering system, not a fixed list of historical rules.

Its purpose is to preserve sound reasoning, ownership, testing, and review practices as
TomeRoam's architecture grows or changes. Do not blindly apply a rule whose architectural
assumptions are no longer true. Instead, identify the mismatch and update the appropriate
contract layer before implementation.

> **Where the three layers live in this repo** (see §1):
> - **Core contract** — this file (§4 rules + the meta sections).
> - **Subsystem contracts** — `Claude/Subsystems/<subsystem>.md` (addenda, §5 template).
> - **Decision ledger** — `Claude/Decisions/DecisionLog.md` (the ledger, §1.C fields).
>
> **Mechanized rules (gates, not vigilance — the project's rules-vs-gates law):**
> - §4.10 mutation verification → `tools/mutate.mjs` + `tools/mutation-sweep.mjs` + `test/mutation-anchors.test.js` (behavioral vs source-text sweeps separated via `SOURCE_TEXT_GATES`).
> - §4.11 exact schema + deep immutability + clone-before-freeze + direct-call contract → `test/contract-function-gate.test.js`.
> - §4.9 no silent coverage exits → `test/no-silent-coverage-exit-gate.test.js`.
> - §4.14 / §4.20 descriptor-scenario coverage + generation → `test/descriptor-coverage-gate.test.js` (+ generated scenarios in `test/fixtures/swipe-plan-spec.mjs`).
> - Build-stamp coherence → `test/build.test.js`; source-fingerprint pins → `test/transition-matrix.test.js`, `test/swipe-model.test.js`.
> - **Not yet gated (process or needs design):** §4.19 structured policy-ledger assertion (needs a machine-readable ledger); §3/§6/§7/§10 procedures; §8 report-claim wording. Flagged honestly rather than claimed.

======================================================================
## 1. CONTRACT STRUCTURE
======================================================================

Maintain three separate layers.

### A. CORE ENGINEERING CONTRACT

Contains architecture-independent principles that should remain valid across: playback,
navigation, synchronization, persistence, downloads, service workers, native wrappers,
future subsystems, and future framework or platform changes.

Examples: inspect the real interface before designing a fake; explicit resource ownership;
stale-continuation protection; independent test oracles; truthful coverage claims;
intermediate-state assertions; mutation verification; exact contract schemas; separation of
identity, namespace, storage location, and ordering; parity versus policy classification.

Core rules must not mention specific current implementation objects such as: Browse leases,
swipe panes, `dev8`, Plex playlist boards, Media Session handlers, particular build stages,
or specific screen names. Those belong in subsystem contracts.

### B. SUBSYSTEM CONTRACTS

Each major subsystem has its own addendum describing its current architecture, invariants,
identities, ownership, asynchronous boundaries, recovery rules, public entry points, and
test strategy (examples: swipe and reveal; playback and Media Session; progress replication;
presence; downloads; navigation; service worker and caching; Android wrapper).

Subsystem rules may change when the architecture changes. They must be reviewed rather than
silently carried forward.

### C. DECISION LEDGER

Contains temporary or product-specific decisions: known-red behavior; behavior intentionally
preserved for parity; deliberate bug fixes inside an extraction; new recovery policy;
temporary staged exceptions; deferred risks; migration decisions; rejected alternatives and
why they were rejected.

Ledger items must have stable IDs and must state: subsystem; decision; reason; status;
introduced build or date; expected removal or review trigger; tests that enforce it.

Do not put temporary decisions into the permanent core contract.

======================================================================
## 2. PRECEDENCE AND CONFLICT HANDLING
======================================================================

When instructions conflict, use this precedence:

1. The current explicit user-approved assignment or plan.
2. The current active decision ledger.
3. The verified current production interface and behavior, for claims of parity.
4. The relevant subsystem contract.
5. The core engineering contract.
6. Historical examples, commit messages, and old review notes.

Production behavior does not automatically define desired policy. It is authoritative only
when the work claims to preserve current behavior. If an approved plan intentionally changes
production behavior, the approved plan wins and the difference must be recorded as new policy
or a known-red repair.

If any two sources still conflict: do not silently choose one; identify the exact conflict;
state the consequences of each interpretation; request or make an explicit policy decision
before implementation. Never resolve a contradiction merely by creating a vague "sanctioned
exception."

======================================================================
## 3. START-OF-TASK PROCEDURE
======================================================================

Before changing code:

1. Identify the subsystem or subsystems involved.
2. Read the relevant subsystem contracts and active ledger entries.
3. Inspect the real current production interfaces.
4. Trace the complete public production path.
5. State the exact stage or implementation slice being attempted.
6. Identify which behavior is: parity; known-red repair; new policy; unrelated cleanup.
7. Identify which contract fields will have real consumers in this slice.
8. Identify every resource acquired and who owns it.
9. Identify every asynchronous continuation and stale-completion risk.
10. Identify the independent test oracle.
11. Identify the exact mutations that should turn new tests red.

Do not begin implementation based only on old review summaries, comments, or architectural
memory.

======================================================================
## 4. CORE ENGINEERING RULES
======================================================================

### 4.1 VERIFY REAL INTERFACES
Before designing a fake, test, or failure path, inspect the real production contract. Record:
synchronous vs asynchronous; return values; thrown exceptions vs status/sentinel returns;
callbacks and completion side effects; whether operations can complete out of order; whether
cancellation exists; whether retry is internal or external. A fake must not be materially
kinder or harsher than the real dependency. Do not: make synchronous methods asynchronous
merely to create a race; make a status-returning method throw; make a genuinely asynchronous
operation resolve immediately when pending behavior matters; settle a fake promise without
performing the real completion side effect the test claims to cover.

### 4.2 DRIVE REAL PUBLIC ENTRY POINTS
Integration tests must use the real public path whenever the defect concerns wiring (click
the real UI control; invoke the real captured Media Session handler; dispatch the real
visibility event; use the real navigation action; trigger the real playback coordinator; use
the real production module with controlled boundary dependencies). Do not call an internal
invalidation helper in place of testing whether the public action invokes it.

### 4.3 EXPLICIT OWNERSHIP
Every asynchronous or temporary resource must have one explicit owner (listeners; timers;
animation frames; transition callbacks; deferred requests; retries; watchdogs; panes;
synthetic DOM nodes; temporary styles on borrowed real nodes; lifecycle leases; temporary
storage transactions). The owner must store the resource handle and retire it explicitly.
Cleanup functions should receive the owner (`retireTimers(session)`, `releaseListeners(session)`,
`finishLease(session)`, `disposeOwnedNodes(session)`). Do not operate through "whatever object
is currently global."

### 4.4 BORROWED VERSUS OWNED RESOURCES
Every resource that may be cleaned up must state whether it is borrowed, owned, shared, or
externally managed. Borrowed real DOM nodes have temporary state removed but are not deleted.
Owned synthetic nodes are removed or disposed. Shared resources require a defined lease or
reference policy. Do not use a broad cleanup verb that can delete borrowed objects.

### 4.5 OWNER ENDPOINT
Define exactly when an operation or session stops being active. An active owner must mean it
still controls live resources or externally visible state. Do not retain a completed owner
merely for logging convenience. Diagnostics may retain an immutable ID or snapshot after
ownership ends.

### 4.6 STALE CONTINUATIONS
Every asynchronous continuation must capture: owner identity; operation identity where
needed; lifecycle phase; immutable arguments required for retry or completion. Before acting,
verify: the owner remains valid; the phase still permits the action; the resource has not
already been retired; finalization has not already occurred; a successor has not taken
ownership. Tests must deliberately deliver stale callbacks after supersession, source change,
navigation change, pause, seek, sign-out, finalization, retry cancellation, and successor
session startup.

### 4.7 ASSERT INTERMEDIATE STATES
Do not test only eventual outcomes when the contract contains words such as before, after,
until, while, pending, exactly once, only after. Assert both sides of the boundary (owner
remains active while a pane remains; pane remains before the paint barrier and disappears
after it; old source is restored before a successor arms; timeout winner removes the
transition listener; stale frame cannot rewrite transforms after finalization; outgoing
progress commits before incoming ownership becomes current). A test named "only after" must
contain an assertion before and after the event.

### 4.8 TRUTHFUL TEST CLAIMS
The name and documentation of a test may not exceed what the test proves. Before accepting a
test, ask: what counterexample would still pass? Do not claim exhaustive coverage while
skipping parameterized cases; deep immutability while freezing only the outer object;
ordering while dependencies use separate logs; failure isolation when fake completion has no
real side effect; derived registries when part of the list is hand-maintained; an async path
covered when the test can return before reaching it.

### 4.9 NO SILENT COVERAGE EXITS
A coverage test must fail if its intended operation never occurs. Prohibited:
`const op = findOperation(); if (!op) return;`. Required:
`const op = findOperation(); assert.ok(op, 'the production trigger must start this operation');`.
*(Gated: `test/no-silent-coverage-exit-gate.test.js` fails on the canonical `if (!x) return;`
form in a test body; the mutation sweep is the semantic backstop — a test that silently skips
its subject shows as UNCAUGHT in `tools/mutation-sweep.mjs`.)*

### 4.10 MUTATION VERIFICATION
Every important new assertion must be mutation-verified. Record: exact mutation; target file;
intended failing test; intended failing assertion. Mutations must test misattribution and
wrong ordering, not only total omission (wrong owner ID rather than no owner ID; old listener
mutates successor rather than all cleanup removed; older write assigned to newer entity
rather than write removed; wrong handler rather than missing handler). Mutation evidence must
remain runnable in repository tooling. Separate behavioral mutation sweeps from source-contract
or fingerprint sweeps; a source-text gate must not claim it caught runtime behavior.
*(Gated: `tools/mutate.mjs` registry, `tools/mutation-sweep.mjs` sweep, `test/mutation-anchors.test.js`.)*

### 4.11 EXACT CONTRACT SCHEMAS
For classifications, plans, records, diagnostics, and state outputs: validate exact keys;
validate every enum; reject missing required identity payloads; reject unknown fields when the
contract is closed; reject impossible combinations; deeply freeze immutable output; clone
caller-owned objects before freezing. Do not use a projection function that discards
unexpected fields when the requirement is "no dead fields." Every exported pure function must
satisfy its own contract when called directly; it must not depend silently on another function
having sanitized its input first. *(Gated: `test/contract-function-gate.test.js`.)*

### 4.12 IDENTITY DISCIPLINE
For every identifier used as a key, proof of identity, an ownership claim, a deletion target,
an ordering value, or a storage location, document: who creates it; collision behavior;
persistence lifetime; recreation behavior; migration behavior; whether it can repeat, regress,
or be reused; consequences if two entities share it. Never treat these as interchangeable:
identity; namespace; storage location; content identity; ordering value; object reference. A
shortened ID may be a namespace without being proof of identity. A storage key may locate a
payload without proving who owns it. Object identity is not semantic identity.

### 4.13 ORDERING DISCIPLINE
When records compete, use one centralized comparator everywhere they compete (live merge;
replica adoption; archive collapse; publication; reset; purge; diagnostics). The comparator
must produce the same winner for every observer; do not include observer-relative preferences
such as "my record wins." If timestamps can repeat or regress, use a logical or hybrid
ordering value; a logical clock must advance when issuing or observing relevant durable values.

### 4.14 INDEPENDENT TEST ORACLES
Use three separate layers: (1) independent declarative specification; (2) production
implementation; (3) tests and documentation tools that compare or render the specification. Do
not duplicate production branch logic in the generator; generate expected output from
production output; or make production consume the test expectation table. Enums, validation
schemas, and production registries may be shared; expected decisions must remain independent.

### 4.15 NO DEAD FIELDS
Do not introduce a field until the same implementation slice contains a real production
consumer and a test proving that consumer uses it. A future stage is not a consumer. A field
may exist temporarily only when ALL of: the boundary must ship atomically; splitting would
create more risk than the temporary field; the exception is explicit; the field is
time-bounded; the next scheduled stage consumes or removes it; an exact test prevents it from
becoming permanent. This exception should be rare — do not create permanent "sanctioned
exceptions." When adding a field, report its production consumer; its test; its removal or
consumption stage if temporarily unused. *(Gated for contract objects: the exact-key check in
`test/contract-function-gate.test.js`.)*

### 4.16 NO DUPLICATE SOURCES OF TRUTH
Do not store both a cause and a separately mutable derived consequence unless both are
independently required (raw descriptor plus separately supplied host classification;
`clobbered` plus abort rerender policy; short identity plus assumption it proves full identity;
comparator result plus separate diagnostic arbitration; ownership in a session plus ownership
in globals; pane kinds plus a separately mutable `hasPane`). Derive convenience values at the
use site.

### 4.17 PHASE-AWARE RECOVERY
Identify the authority boundary for every transaction. Before authority changes: preserve
authoritative state; restore the source; restore starting position as policy requires. After
authority changes: the new authoritative state wins; render from that authority; do not restore
a source that now contradicts it. Recovery policy must be centralized rather than separately
invented per failure reason.

### 4.18 NORMAL RELEASE VERSUS EMERGENCY DISPOSAL
Normal completion and emergency teardown may have different obligations. Normal release must
honor readiness; ordering; ownership; paint or visibility barriers where required;
exactly-once behavior. Emergency disposal may bypass normal visual ordering only for named
reasons. A successor may not dispose resources still owned by a valid active operation unless
the policy explicitly defines supersession at that phase.

### 4.19 PARITY VERSUS POLICY
Classify every production change as behavior-preserving extraction; known-red repair; new
policy; migration; or unrelated cleanup. Do not hide a bug fix inside a parity extraction. Do
not preserve a known defect merely because it exists unless parity was explicitly chosen.
Maintain an exact structured policy ledger; tests must assert its complete active contents.
*(Not yet gated — needs a machine-readable ledger artifact; the DecisionLog is prose today.)*

### 4.20 MECHANICAL DERIVATION
Generate inventories where possible (screen registries; descriptor scenarios; transition
combinations; required globals; event-handler registrations; schema members; source append
sites). When a list cannot be fully derived, describe it honestly as derived; pinned; or
partly derived and partly pinned. Do not call a hand-maintained list exhaustive.

### 4.21 NARROW SCOPE
Fix the violated invariant without redesigning adjacent systems. Do not change a synchronous
API into asynchronous for testing; broaden a platform test boundary without evidence; redesign
durable storage to solve a diagnostic issue; migrate an identity namespace when full-identity
validation contains the risk; alter unrelated visible behavior during an extraction. Record
adjacent cleanup separately.

### 4.22 REVIEWABLE STAGES
Each implementation stage must state: exact slice completed; production fields consumed;
production behavior changed; behavior deliberately unchanged; tests added; mutations run;
deferred work; why the stage is complete. Do not call a stage complete when only bookkeeping
or identity scaffolding has landed. Use explicit names (e.g. "Stage 3a — session identity",
"Stage 3b — resource ownership") when the full stage is incomplete.

======================================================================
## 5. SUBSYSTEM CONTRACT TEMPLATE
======================================================================

Every new major subsystem must have an addendum (`Claude/Subsystems/<name>.md`) answering:

1. Purpose and boundaries. 2. Public entry points. 3. Authoritative state. 4. State machine or
lifecycle phases. 5. Identities used and their guarantees. 6. Ordering model. 7. Resources
acquired. 8. Resource owner. 9. Ownership endpoint. 10. Asynchronous operations. 11. Possible
stale completions. 12. Normal completion behavior. 13. Recovery authority boundary.
14. Emergency disposal rules. 15. Persistence model. 16. External side effects. 17. Independent
test oracle. 18. Invariants. 19. Mutation cases. 20. Known-red behavior. 21. Current
policy-ledger references. 22. Explicitly out-of-scope behavior. 23. Conditions requiring this
addendum to be revised.

Do not build a substantial new subsystem without creating this addendum.

======================================================================
## 6. CONTRACT UPDATE TRIGGERS
======================================================================

Review and, where necessary, revise the relevant contract whenever TomeRoam adds or changes: a
persistence mechanism; a device or process writer; a synchronization transport; a durable
identifier; an ordering field; a retry mechanism; a lifecycle or background state; a navigation
entry point; a playback entry point; a test fake; a recovery path; a native-platform boundary;
a service-worker boundary; a framework; a storage schema; a public planner or contract object;
a new subsystem. Do not allow architecture-specific rules to remain normative after their
architecture disappears. When a subsystem is removed or replaced: retire its addendum; migrate
still-valid principles into the core only if genuinely general; close or migrate its ledger
entries; remove stale examples.

======================================================================
## 7. END-OF-TASK CONTRACT MAINTENANCE
======================================================================

At the end of every significant implementation: (1) compare the resulting architecture with the
relevant subsystem contract; (2) update the contract if a verified assumption changed; (3)
update the decision ledger for new policy, resolved known-reds, new temporary exceptions,
retired exceptions; (4) remove fields or rules that became dead; (5) add update triggers for new
architectural dependencies; (6) ensure examples are labeled non-normative; (7) ensure no
build-specific workaround has silently become a permanent core rule. A contract update is
required when the code has changed the truth of the contract.

======================================================================
## 8. COMPLETION REPORT
======================================================================

At the end of each build, report: exact stage and slice completed; files changed; public paths
exercised; production behavior changed; production behavior deliberately unchanged; parity
repairs; new policy; contracts introduced or modified; identities introduced or reinterpreted;
resources moved under ownership; ownership endpoints; asynchronous continuations controlled;
intermediate states asserted; exact mutation evidence; known-red tests still open; dead fields
introduced, consumed, or removed; temporary exceptions and expiration stage; deferred work and
assigned stage; full test, lint, typecheck, build-coherence, behavioral-mutation, and
source-gate results; any statement from the assignment that had to be narrowed after inspecting
production. Do not use claims such as complete, exhaustive, fully derived, deeply immutable,
fully owned, or all paths covered unless the tests prove those exact claims.

======================================================================
## 9. REQUIRED RESPONSE TO CONTRACT CONFLICTS
======================================================================

When a task conflicts with this contract, do not simply refuse or silently violate it. Respond
with: (1) the exact conflicting rule; (2) the current code or assignment that conflicts with it;
(3) whether the conflict is a stale subsystem rule, an intentional new policy, a temporary
staged exception, or an implementation mistake; (4) the smallest safe resolution; (5) whether a
core rule, subsystem addendum, or ledger entry must change; (6) the tests and expiration
condition for any temporary exception. The contract exists to improve decisions, not to
prohibit updating the architecture.

======================================================================
## 10. FIRST ACTION ON EVERY NEW TASK
======================================================================

Before coding, state internally: which core rules apply; which subsystem addenda apply; which
ledger entries apply; which assumptions were verified against current code; whether the
requested change requires a contract update. Then perform the task.
