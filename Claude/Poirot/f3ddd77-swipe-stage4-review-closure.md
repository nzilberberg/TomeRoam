# Code Review — .228 (closure of the .227 stage-4 review)

Type: code-review
Prior-review: 14257f2-swipe-stage4-classify-construct.md
Commit: f3ddd77 — ".228: close the .227 stage-4 review — F1,F3,F4,F5,F6,F7 fixed; F2,F8 filed"
Reviewer: Poirot
Date: 2026-07-21
Plan of record: Claude/Plans/PLAN-swipe-reveal.md — stage 4 (§3.3, I16/§4.3)

## Verdict

Ship — proceed to stage 5 on the user's go. `.228` is an apply-review commit that closes
the eight `.227` findings, and each fix independently re-verifies as correct, regression-free,
and genuinely able to fail. Nothing from the prior review was skipped; the only prior open
item (W8, the stage-5 builder move) is correctly carried forward, not addressed here.

Not executed: `node` is absent on the review host, so the suite's 635-pass claim was not
reproduced. Every fix and every new test was verified by reading and by grep against the
real code — not by running. One run is still owed (see W-probes note in the watch-list).

## Re-verification — each claimed fix confirmed against the code, not the commit message

| Finding | Fix | How confirmed |
|---|---|---|
| F1 | NP-source wiring test drives real `start()` and asserts a `.np-pill-float` mover | `npPillClone` (app.js:350-353) clears then adds exactly `.np-pill-float`; the test's pre-swipe `npFloats===0` isolates the swipe-built clone; dropping the decorations loop reddens it. Real, correctly-isolated. |
| F3/O1 | classification + plan DEEP-frozen | swipe.js freezes each decoration, the array, and both objects; `constructionPlanFor` passes the frozen array through; the new test push-corrupts under a shallow freeze. Correct. |
| F4 | descriptor scenarios (identity-varying, same-identity, malformed) | These are same-NAME pairs the 132-loop skips (`f.v===t.v`), so genuinely new coverage; the `wellFormed()` helper feeds the 132-loop payloads so F5 doesn't throw on it. Correct. |
| F5 | `requirePayload` rejects payload-less `authorBooks`/`files` | Field names match the REAL descriptors — `openAuthor`→`{author:{ratingKey}}`, `openFiles`→`{book:…}` (app.js:182-183), browse.js:22 keys on `d.author.ratingKey`. Does NOT throw on valid swipes. `== null` guard is correct. |
| F6 | `constructionPlanFor` throws on unhandled `fromKind` | `KINDS.indexOf(c.fromKind) === -1` throws before the outgoing ternary can absorb a bad kind into `real-source`. Correct; tested both kinds. |
| F7 | exact-key assertion replaces the whitelist | `assert.deepEqual(Object.keys(p).sort(), CONSTRUCTION_KEYS)` runs inside `projectStablePlan`, so it fires on every one of the 132 pairs and every scenario; an added field reddens. This is the real fix for the backwards comment. |
| F2 | phase-split filed in the decision log | Entry present and accurate: construction/finalization split of §3.3, `classifyTransition` ships whole. |
| F8 | host fields dispositioned as spec-mandated, not dead | The `classifyTransition` test asserts `sourceHost`/`destinationHost`/`sameBrowseHost`; §3.3 mandates them as boundary output. Sound disposition — with a forward check (W10). |
| same-destination | documented impossible-before-the-planner | Verified against app.js:141 (bare same-`v` REPLACES the top) + :143 (`fwdStack` cleared on nav): the stack cannot hold adjacent bare same-`v`, so neither back nor forward-replay can present it. A production guard would be dead code. Correct to document, not branch. |

## Interaction checks (the class the .227 pass would have missed)

- **F5 regression surface:** the only callers of `classifyTransition`/`constructionPlanFor`
  are production (app.js:600, real payload-bearing descriptors) and the swipe-transition
  tests (now `wellFormed`). `tools/gen-transition-matrix.mjs` only *mentions* them in a
  comment — it renders the spec, it does not call the classifier — so `.228` did not break
  doc generation or the census. No bare parameterized name reaches `requirePayload`.

## Findings

| # | Severity | Finding |
|---|----------|---------|
| O1 | Observation | F5's rejection is reachable from production `start()` (app.js:600): a malformed live `authorBooks`/`files` descriptor now throws at the classification boundary inside `start()` instead of crashing downstream at `browse.js` `keyOf`. This is an improvement (named error, earlier), not a regression — a malformed descriptor always failed. It remains an uncaught throw in the gesture path; not worth a guard unless a malformed live descriptor is ever shown to be reachable. |

No Critical, Significant, or Minor findings. The apply-review was done red-first and
mutation-verified, and the independent re-verification agrees.

## Watch-list

The bounded continuity artifact. Carries forward the prior review's open item (W8) and adds
what this review surfaced. The next review (stage 5) MUST forward every OPEN item below.
Enforced by `test/poirot-casebook-gate.test.js`.

- [W8] (open) Stage 5 scope — the pane builders (ghostApp/snapshotHome/overlayEl/appViewEl/npPillClone) move into swipe.js. Watch the builder-move for behaviour drift on the seams checkable only by decision, not by a moved builder. Stage 5 is gated on the user's go.
- [W10] (open) F8 forward-check — `.228` dispositioned `sourceHost`/`destinationHost`/`sameBrowseHost` as "stage-6-consumed" boundary outputs, not dead fields. Verify stage 6 (finalization) actually consumes them; if it does not, they are permanently production-dead (test-asserted only) and F8 reopens.
- [W11] (open, minor) O1 — confirm `start()`'s behaviour on a thrown `classifyTransition` (malformed live descriptor) is acceptable, or wrap the classify call. Low priority; malformed live descriptors are not a normal condition.
- [W12] (open) `.228`'s fixes and this review were both static-only (`node` absent). Run `npm test` (expect 635 pass) and confirm each new test reddens under its stated mutation, before stage 5 is declared clear.
