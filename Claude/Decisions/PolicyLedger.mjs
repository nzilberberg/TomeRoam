// PolicyLedger.mjs — the MACHINE-READABLE policy ledger (Durable Engineering Contract
// §1.C / §4.19). test/policy-ledger-gate.test.js asserts its COMPLETE ACTIVE CONTENTS
// against the suite: every known-red test must be declared here, every declared known-red
// must actually still be red, and every `tests` name must exist. This is the structured,
// enforced companion to the prose ledger in DecisionLog.md — items with a TEST signature
// (known-red behavior, or a policy pinned by a named test) live here so they cannot drift;
// decisions without a test signature stay in the prose ledger.
//
// Each entry states the §1.C fields: id (stable, unique), subsystem, decision, reason,
// status, introduced (build or date), removalTrigger (when this entry retires / is reviewed),
// and tests (the test name(s) that enforce it). `knownRed: true` means the listed tests are
// expected to be `{ todo }` (red by design) until removalTrigger fires.

export const POLICY_LEDGER = [
  {
    id: 'KR-swipe-scroll-restore',
    subsystem: 'swipe-reveal',
    decision: 'Superseding a live drag must restore the starting document scroll.',
    reason: 'New policy, not extraction parity: begin() hard reset performs no scroll restore, '
      + 'so a superseded browse->browse drag is left at the destination scroll.',
    status: 'known-red',
    introduced: '2026-07-20',
    removalTrigger: 'Stage 6 finalization implements the scroll restore; the test then goes '
      + 'green and this entry is removed.',
    tests: ['I20 — superseding a live drag restores the starting scroll'],
    knownRed: true,
  },
  {
    id: 'KR-swipe-source-rerender',
    subsystem: 'swipe-reveal',
    decision: 'Superseding a live browse->browse drag must re-render the SOURCE into #browse.',
    reason: 'New policy: begin() hard reset calls applyScreen(currentDesc(), {render:false}), so '
      + 'the shared #browse keeps the destination content while the stack returns to the source.',
    status: 'known-red',
    introduced: '2026-07-20',
    removalTrigger: 'Stage 6 (or the swipe rewrite) implements the source re-render; the test '
      + 'then goes green and this entry is removed.',
    tests: ['I11/I20 — superseding a live browse->browse drag re-renders the SOURCE into #browse'],
    knownRed: true,
  },
  {
    id: 'KR-swipe-stage5-buildconstruction',
    subsystem: 'swipe-reveal',
    decision: 'The Stage-5 L1 seam Swipe.buildConstruction(from, dest, env) and its env contract are '
      + 'specified and pinned red before the build (recipe layer, test/swipe-construction.test.js).',
    reason: 'Red-first (TDD): the moved capture recipes, source resolution, and NP decoration builder '
      + 'become drivable through an injected env with no ambient DOM — a seam that does not exist yet, so '
      + 'every recipe test fails with "buildConstruction is not a function".',
    status: 'known-red',
    introduced: '2026-07-23',
    removalTrigger: 'Brunel builds Swipe.buildConstruction to the plan §3/§7 contract; each test goes '
      + 'green and this entry is removed in that commit.',
    tests: [
      'buildConstruction returns the exact Construction contract shape',
      'movers carry the external {element,ownership,slot} shape, not the production keys',
      'overlay->overlay builds no owned pane: capture is null and both sides are borrowed-real',
      'an app-ghost capture carries ghostY; a home-snapshot capture never does',
      'buildConstruction runs with no ambient document/window and builds the pane in env.document',
      'copyAnimPhase syncs animation phase through the env Element, not a global one',
      'sourceWasClobbered is true only when the destination render clobbers the source host',
      'the outgoing pane is mounted before env.renderDestination is ever called',
      'the ghost background resolves through env.getComputedStyle, not an ambient or cached read',
      'the nav-ghost wrapper carries its full fixed/clipped/non-interactive contract',
      'the NP pill decoration is cloned, stripped, classed, and slotted by endpoint',
      'both owned-pane recipes strip data-art before the clone is mounted',
    ],
    knownRed: true,
  },
  {
    id: 'KR-swipe-stage5-classify-hosts',
    subsystem: 'swipe-reveal',
    decision: 'classifyTransition must re-emit sourceHost/destinationHost with the projected values '
      + '(contract layer, test/swipe-transition.test.js).',
    reason: 'Red-first: build .229 removed the two host fields as dead (no consumer then). Stage 5 '
      + 'reintroduces them WITH a consumer (buildConstruction reads them). The tests fail today because '
      + 'only three keys are emitted.',
    status: 'known-red',
    introduced: '2026-07-23',
    removalTrigger: 'Brunel emits the host fields with the plan §3 projection (and flips the exact-key '
      + 'gates atomically); the tests go green and this entry is removed in that commit.',
    tests: [
      'classifyTransition emits exactly the five stage-5 fields including the two hosts',
      'every registry pair projects the sourceHost/destinationHost the frozen spec fixes',
    ],
    knownRed: true,
  },
];
