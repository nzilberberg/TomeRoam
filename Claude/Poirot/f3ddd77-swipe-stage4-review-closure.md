# Code Review — .228 (closure of the .227 stage-4 review)

Type: code-review
Prior-review: 14257f2-swipe-stage4-classify-construct.md
Commit: f3ddd77 — ".228: close the .227 stage-4 review — F1,F3,F4,F5,F6,F7 fixed; F2,F8 filed"
Reviewer: Poirot
Date: 2026-07-21
Plan of record: Claude/Plans/PLAN-swipe-reveal.md — stage 4 (§3.3, I16/§4.3)

## Verdict

Fix-then-proceed — do NOT start stage 5 until three contract-completeness gaps close.
`.228` correctly closes all eight `.227` findings (each fix re-verified against the code —
regression-free and mutation-able). But an independent second review surfaced three gaps this
pass MISSED, all since confirmed against the code: `constructionPlanFor` is not independently
immutable (F-i), the §4.3 descriptor enumeration is still incomplete (F-ii), and the swipe.js
header describes the oracle backward (F-iii). None changes runtime behaviour today, but §4.3
identity and the immutability contract must be locked BEFORE stage 6 makes descriptor identity
and finalization-field ownership load-bearing — which is the reason to freeze them now.

CORRECTION: this casebook's first version filed a clean "ship" verdict with no findings. That
was wrong — see "Second-review reconciliation" below.

Not executed: `node` is absent on the review host, so the suite's 635-pass claim was not
reproduced, and the F-i/F-ii probes below were confirmed by reading, not running. A run is
owed (W12).

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
| F-i | Significant | `constructionPlanFor` is not independently deep-immutable. Its return `Object.freeze({… decorations: c.decorations})` neither clones nor freezes `c.decorations`; safety rides on `classifyTransition` having frozen it first. But `.228`'s OWN F6 test calls `constructionPlanFor` directly with a fresh `{fromKind, toKind, decorations:[]}`, so the unprotected path is live: `constructionPlanFor({fromKind:'home',toKind:'browse',decorations:[]}).decorations.push(x)` succeeds. The F3 fix froze the composed path only; the function's own "Immutable" contract is unhonored. Freeze at this boundary too (`decorations: Object.freeze((c.decorations||[]).map(d=>Object.freeze({...d})))`); add a test using a manually-built classification, mutation-checked by removing the freeze. |
| F-ii | Significant | The §4.3 descriptor enumeration is still incomplete. The plan explicitly lists identical-descriptor-object (`d -> d`, same reference), two-independently-allocated-but-semantically-equal, and same-type identity for BOTH parameterized names. `.228` adds different-identity plus a same-identity `authorBooks(A)->authorBooks(A)` that SHARES one nested `AUTHOR_A` ref — but omits the same-object case, the independently-allocated-equal case, and `files(A)->files(A)`. All yield the same plan today; freezing them now stops stage-6 finalization from using referential where semantic identity is meant. |
| F-iii | Minor | The swipe.js module header (js/swipe.js:7) says "both production (start()) and the frozen model derive from [here]." The frozen model derives from the INDEPENDENT spec (the generator renders the contract); swipe.js is COMPARED against it. As written the header describes the circular oracle the design exists to avoid, and contradicts the spec fixture's own header and the decision log. Reword: the production decision lives here and is checked against an independent frozen spec. |
| O1 | Observation | F5's rejection is reachable from production `start()` (app.js:600): a malformed live `authorBooks`/`files` descriptor now throws at the classification boundary inside `start()` instead of crashing downstream at `browse.js` `keyOf`. An improvement (named error, earlier), not a regression. Remains an uncaught throw in the gesture path; not worth a guard unless a malformed live descriptor is shown reachable. |

## Second-review reconciliation — the miss, and why it recurs

F-i, F-ii, F-iii were found by an independent, context-free contract review — NOT by this pass,
which filed a clean "ship." All three confirmed against the code here. This is the SAME class an
independent review caught on `.227` (§4.3 enumeration; immutability), and §4.3 was missed AGAIN
here even after `.228` partially closed it. The recurrence is the signal, not the individual miss.

Root cause: each finding is catchable by an EXECUTED check (push to a directly-built plan; tick
every §4.3 line against a test line) and this pass reasoned about them instead of running them —
"no node on the host" the recurring trigger. The seat's "execute the probe" and "build the
checklist from the enumeration" disciplines are prose, and prose is vigilance, which fails. The
structural adaptation is now in the seat (`~/.claude/…/Poirot.md`): a contract-surface review is
not complete without an EXECUTED independent contract-completeness pass — a cold-read adversary
reconciled in, or the enumerated checks written as probes and run. n=2, both rounds, the
independent pass caught this class and the context-rich pass did not.

## Watch-list

The bounded continuity artifact. Carries forward the prior review's open item (W8) and adds
what this review surfaced. The next review (stage 5) MUST forward every OPEN item below.
Enforced by `test/poirot-casebook-gate.test.js`.

- [W8] (open) Stage 5 scope — the pane builders (ghostApp/snapshotHome/overlayEl/appViewEl/npPillClone) move into swipe.js. Watch the builder-move for behaviour drift on the seams checkable only by decision, not by a moved builder. Stage 5 is gated on the user's go.
- [W10] (open) F8 forward-check — `.228` dispositioned `sourceHost`/`destinationHost`/`sameBrowseHost` as "stage-6-consumed" boundary outputs, not dead fields. Verify stage 6 (finalization) actually consumes them; if it does not, they are permanently production-dead (test-asserted only) and F8 reopens.
- [W11] (open, minor) O1 — confirm `start()`'s behaviour on a thrown `classifyTransition` (malformed live descriptor) is acceptable, or wrap the classify call. Low priority; malformed live descriptors are not a normal condition.
- [W12] (open) `.228`'s fixes and this review were both static-only (`node` absent). Run `npm test` (expect 635 pass) and confirm each new test reddens under its stated mutation, before stage 5 is declared clear.
- [W13] (open) F-i — make `constructionPlanFor` independently deep-immutable (freeze/clone `c.decorations` at its own boundary), with a test built from a manually-constructed classification. Close before stage 5.
- [W14] (open) F-ii — complete the §4.3 enumeration: identical descriptor object (`d->d`, same ref), two independently-allocated-but-semantically-equal, and `files(A)->files(A)`. Close before stage 5.
- [W15] (open) F-iii — correct the swipe.js module header so it states production is CHECKED AGAINST the independent spec, not that the frozen model derives from production. Close before stage 5.
