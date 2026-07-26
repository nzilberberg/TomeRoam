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

// No active known-red policies. The two swipe-supersession known-reds
// (KR-swipe-scroll-restore, KR-swipe-source-rerender) were retired in Stage 6a
// once begin() implemented the recovery — their tests are now live green guards
// in test/swipe-invariants.test.js. New known-red entries are appended here as
// they are introduced.
export const POLICY_LEDGER = [];
