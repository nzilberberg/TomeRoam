# Code Review — .227 swipe stage 4 (classifyTransition + constructionPlanFor)

Commit: 14257f2 — "swipe stage 4 — extract classifyTransition() + constructionPlanFor(), retire the branch mirror"
Reviewer: Poirot (between-stages blind review, per the staged-extraction process)
Date: 2026-07-21
Plan of record: Claude/Plans/PLAN-swipe-reveal.md — stage 4 (§7.4: "Extract classifyTransition() + planFor(); prove every registry pair")

## Verdict

Do not start stage 5. The extraction's core is sound — behaviour-identical to the .226
inline logic (verified by reading every path), the 132-pair decision proven against an
independent contract, load order / SW cache / version stamps correct, no broken-swipe
risk. But the normalization boundary and its oracle are not complete: two untested seams
(F1, and the descriptor scenarios of F4/F5), a shallow-immutability overclaim (F3), a
half-validated "no default branch" (F6), a comparison helper that defeats its own drift
claim (F7), and dead fields against the project's own rule (F8). Close F1 and F4–F8, and
file F2, before stage 5 builds on this boundary.

Test suite was NOT executed in the review environment (node is not installed on the
Lyrion host where this review ran). All findings are from static analysis and grep; the
commit's claim of 631 pass / 0 fail / 2 todo was not independently reproduced here.

## Two-review note

F4–F8 were surfaced by an independent second review and confirmed here against the code;
they are the class this seat's local disciplines now gate for ("execute the probe for each
element of an enumerated/absolute claim"). F1 and F2 were surfaced only by this pass (the
production wiring seam; the records deviation). Neither pass dominated — the union is the
disposition.

## Findings

| # | Severity | Finding |
|---|----------|---------|
| F1 | Significant | The NP-pill decoration wiring seam has no running test. `start()` builds the pill from `plan.decorations`; no harness test drives a `nowplaying` transition and asserts a pill mover is built. A mutation making `start()` ignore `plan.decorations` leaves the whole suite green — the same blind-spot class the commit found and closed for the OUTGOING seam, left open for the decoration seam. |
| F2 | Significant (records) | The stage-4 phase-split (`constructionPlanFor` = a subset of the plan-of-record §3.3 `planFor()`, finalization fields deferred to stage 6) deviates from the approved plan. Its only record is the commit message, which the standards do not treat as the record. Plan §3.3 and §7.4 both still specify `planFor()` with commit/abort/scroll/stackEffect/paneRemovalPolicy; the shipped code has none and no reconciling decision-log entry. The commit's Records note admits the entry is "owed." |
| F3 | Minor | `constructionPlanFor` claims immutability but `Object.freeze` is shallow: the returned `decorations` is the same array reference as the classification's (`c.decorations`), unfrozen, so `plan.decorations.push(...)` / `plan.decorations[0].base = ...` both succeed and corrupt the classification too. The freeze test (swipe-transition.test.js:112) exercises only a top-level scalar write. Fix: deep-freeze (`decorations.map(d => Object.freeze({...d}))` then freeze the array), and mutation-check both a field change and a push. |
| F4 | Significant | The "exhaustive" proof is screen-name exhaustive, not descriptor exhaustive. The 132-pair test iterates a 12-NAME registry and skips every `f.v===t.v` pair, so reachable identity-varying transitions `authorBooks('A')→authorBooks('B')` and `files('A')→files('B')` (valid browse→browse) are never generated, and same-descriptor cases `books()→books()` / `d→d` are silently omitted rather than planned-or-rejected. This is against a FROZEN plan invariant (§4.3 / I16: "DESCRIPTOR SCENARIOS, NOT SCREEN NAMES"). Add these scenarios to the spec and the production comparison; freeze the same-destination policy (reject as `same-destination` or document as impossible-before-the-planner). |
| F5 | Significant | Malformed parameterized descriptors are not rejected. `classifyTransition` reads only `.v`, so `{v:'authorBooks'}` with no author and `{v:'files'}` with no book classify as browse and plan silently. Plan §4.3 requires rejection with a named reason. The spec's `MODIFIER_CASES` "malformed/unknown descriptor" rejection covers only invented screen NAMES (`not-a-screen`), so the commit's "malformed-descriptor rejection" claim is overstated. Add missing-payload rejection with a named reason and a test. |
| F6 | Low | The "no default branch — unhandled classification THROWS" contract is half-implemented. `constructionPlanFor` throws for an unknown `toKind` but not `fromKind`: `{fromKind:'nonsense', toKind:'browse'}` returns an `app-ghost` plan. (Unreachable in production — `kindOf` throws first — so a contract/robustness gap, not a live bug.) Validate `fromKind` against its enum too. |
| F7 | Low | The comparison helper defeats the drift class it advertises. `projectStablePlan` (swipe-transition.test.js:26) whitelists four keys, so an added or dead field on the plan is DROPPED before `deepEqual` and passes — the opposite of its comment "so an added field can't silently pass." Assert exact keys on the construction plan, and mutation-check by adding an unused field (the minimal-field test must go red). |
| F8 | Low | Dead fields against the project's own rule. `classifyTransition` returns `sourceHost`, `destinationHost`, `sameBrowseHost`; `start()` discards the classification and reads only the construction plan, so no consumer reads these in .227. The commit invokes "this project forbids dead fields" to justify deferring finalization while shipping three dead fields. Tolerable only if stage 5 consumes them immediately; otherwise defer them to the stage that makes them live. |
| O1 | Observation | The `classifyTransition` result is not frozen at all (only `constructionPlanFor`'s is), though the plan calls it "THE ONE NORMALIZATION BOUNDARY" whose fields "cannot disagree." (Subsumed by F3's fix if the whole boundary is frozen.) |
| O2 | Observation (cleared) | Checked and DISMISSED: the `np-locked` body-class removal moved from the OUTGOING block (before the incoming render, .226) to the decorations loop (after it). Verified inert — `np-locked` is a `.navbar`-only CSS hook (css/app.css:460-475), touches no `#home`/`#browse`/overlay geometry, `start()` is synchronous with no intervening paint, and the pill clone still follows the class removal in both versions. Not a finding. |

## Review-process scar (why F4–F8 were missed on the first pass)

All four missed findings share one root cause: claims were reasoned about, not executed,
and a missing local `node` was allowed to downgrade the review to pure static reasoning.
Each miss needed one executed input (a payload-less descriptor, a push to a frozen object,
a garbage `fromKind`, an extra field). The gates are now in the seat's local disciplines
(`~/.claude/personas/Gates/Poirot/Poirot.md`, "the .227 second-review misses"). The
executable half of a review must be authored as probes and run even when the local runtime
is absent — static reading finds structure/record gaps; executed inputs find
claim/contract gaps.

## Parity analysis (the extraction itself — clean)

Reconstructed the .226 inline branch logic from `git show 14257f2 -- js/app.js` and mapped
every path to `js/swipe.js`:

- OUTGOING: `fromOv → real overlay` = `real-source` (overlay); `!fromOv && incomingBrowse → ghost`
  = (`fromKind!==overlay && toKind===browse`) `app-ghost`; else = `real-source`. Exact.
- INCOMING: `toOv → real overlay`, `toV==='home' → snapshot`, else `→ #browse render`, mapped to
  `incoming` ∈ {real-destination, home-snapshot} + `renderDestination` ∈ {none, browse-host}. Exact.
- DECORATIONS: pill iff NP is an endpoint (NP is always an overlay, so the old `fromOv&&fromV==='nowplaying'`
  / `toOv&&toV==='nowplaying'` guards reduce to the endpoint check); base `outgoing→0` / `incoming→off`. Exact.
- `d.clobbered` still computed identically, only in the browse-host branch.

The 8 STRUCTURAL_CASES in test/fixtures/swipe-plan-spec.mjs each match `constructionPlanFor`,
including case 7 (`overlay→browse → real-source`, the non-ghosting overlay source that was the
found blind spot). The 132-pair exhaustive test compares production against the spec, with
expectations sourced only from the hand-written spec (no feedback loop; the generator supplies
only the registry list, which the census test pins separately).

## Coverage map of the four plan-consumption seams introduced by this commit

- OUTGOING (ghost vs real): CLOSED — new swipe-invariants.test.js "WIRING" test (overlay→books, ghosts===0).
- INCOMING home-snapshot: covered indirectly — the .205/.206 gesture tests locate the snapshot's
  cover to assert phase-sync; a miswire to a ghost would fail them.
- renderDestination browse-host: covered — the abort / supersession-CONTROL tests assert `renders()`
  put the destination into #browse.
- DECORATIONS (NP pill): NOT covered (F1).

## Process / records

- Do NOT commit over the parallel session: the working tree carries that session's staged plan
  renames, a mid-edit DecisionLog.md, and untracked review files. This casebook is a new file
  (no collision); staging and commit are left to the reconciling session.
- Owed to the decision log once the parallel edit settles (per the commit's own note): (a) the
  stage-4 phase-split ruling (F2); (b) the stage-6 cleanup note — cancel+null the settle
  rAF/timer/listener handles when retired so the session object describes live ownership.

## Prediction (consequences of not closing F1 before stage 5)

Stage 5 moves the pane builders — including `npPillClone()` — into swipe.js. That is precisely
the edit most likely to disturb the decoration path, and it will land on the one seam with no
running guard. The outgoing seam earned its test by being caught mutating silently; the
decoration seam has the same shape and no such test, so a stage-5 miswire (pill not built, or
built at the wrong base) ships green and is found only on device — the failure mode this entire
rewrite exists to end. Cost to close now: one harness test driving a `home→nowplaying` (or
`nowplaying→home`) swipe that asserts a pill mover exists at the correct base, mutation-verified
by dropping the decorations loop.
