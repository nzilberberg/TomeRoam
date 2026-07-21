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
];
