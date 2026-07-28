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

// The two swipe-supersession known-reds (KR-swipe-scroll-restore, KR-swipe-source-rerender)
// were retired in Stage 6a once begin() implemented the recovery — their tests are now live
// green guards in test/swipe-invariants.test.js. New entries are appended here as they are
// introduced.
export const POLICY_LEDGER = [
  // Stage 6i (PLAN-swipe-noswap-home.md) — NEW POLICY overturning plan-of-record §2.1/§2.4:
  // active #home leaves the in-flow shared-document-scroll class and joins the fixed-own-scroll
  // class, dissolving constraint E (two in-flow views cannot coexist), which is what forced the
  // →home home-snapshot. Pinned by named GREEN guards (knownRed:false — enforced, not `{todo}`).
  { id: 'PL-swipe-6i-home-fixed-ownscroll',
    subsystem: 'swipe-reveal',
    decision: 'Active #home is a position:fixed own-scroll view (not an in-flow shared-document-scroll view); the SNAPSHOT-iff-home rule (plan-of-record §2.4) is retired — a →home reveal slides the real fixed #home in, with no home-snapshot pane.',
    reason: 'Overturns §2.1 two-in-flow constraint E to dissolve the forced snapshot and remove flash hypothesis (i) (the browse-leaving-flow reflow-reposition); §8 retains the css:73 `.app` runway so fixed-bar seating is unchanged.',
    status: 'active',
    introduced: '2026-07-28 (Stage 6i)',
    removalTrigger: 'if #home returns to the in-flow document-scroll model, or the SNAPSHOT-iff-home rule is reinstated',
    knownRed: false,
    tests: [
      'SNAPSHOTGONE — a committed browse→home builds no home-snapshot pane; the real fixed #home is the incoming mover',
      'HOMEFIXED — the active #home rule is a position:fixed own-scroll view (source)',
    ] },
];
