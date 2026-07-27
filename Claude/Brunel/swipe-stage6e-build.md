# Build log — Stage 6e: owner-driven `disposeOwnedPanes(session, reason)`

Type: build log

Ratified plan: `Claude/Plans/PLAN-swipe-stage6e.md` (Charpy FORGE `Claude/Charpy/PLAN-swipe-stage6e-3e1b158.md`;
Loki HELD_STONE `Claude/Loki/STRIKE-swipe-stage6e-r1.md`; red suite `Claude/Curie/RED-swipe-stage6e.md`).
Built against production HEAD `02bff948` (build `2026-07-27.253`).

`Verdict: **BUILD_GREEN**`

## 1. Exact slice built

The F(dispose) half of the pane-lifecycle interface (`PLAN-swipe-stage6e.md` §2/§3/§4/§6): a session-owned
`disposeOwnedPanes(owner, reason)` helper, and the redirection of the `begin()`-recovery owned-pane removal
from the DOM-global `.nav-ghost` sweep to that typed call, with `keepGhosts:true` threaded at both sweep call
sites on the owned branch so the sweep does not duplicate the removal. No reveal timing, no paint gate, no
`nav.js` change, no async-surface change — exactly the plan's scope boundary (§2).

## 2. Files changed

- `js/app.js:350-364` — new helper `disposeOwnedPanes(owner, reason)`, added beside the existing session-cleanup
  helpers `releaseGesture`/`dropRowHold`. Iterates `owner.movers`, removes each `own==='owned-pane'` mover whose
  `el.parentNode` is set, and emits the PBDebug `SWIPE` trace with `reason` only when a pane was actually
  disposed. The parameter is named `owner` (not `session`) to keep it lexically distinct from the module-level
  `session`/`d` state it must never read (EC §4.3) — the parameter never reads ambient module state; the
  plan's structural notation names the conceptual argument `session: {movers}`, which this satisfies.
- `js/app.js:434-442` (the `begin()`-recovery block) — added `if (cur) disposeOwnedPanes(cur, 'superseded');`
  before the reset; changed `resetSwipeStyles();` to `resetSwipeStyles(cur ? true : undefined);`; added
  `keepGhosts: cur ? true : undefined` to the `applyScreen(...)` opts object. Updated the recovery comment
  block (402-433) to name the typed owner-driven path instead of the retired "dispose the old pane / stray
  ghosts" phrasing plus a note on the `keepGhosts`-at-both-sites requirement.
- `tools/mutate.mjs` — re-anchored three existing multi-part mutation constants whose literal source text
  changed under the edit above (`HARDRESET_DISPOSE_FROM/TO`, `VR_HOLD_ORDER_FROM/TO`, `RECOVERY_RENDER_LINE` +
  its two dependents `RECOVERY_RENDER_ALWAYS_FALSE`/`F1_ORPHAN_RESETSCROLL_TO`) to the new three-statement
  recovery-disposal block, preserving each mutation's original defect semantics (verified: `HARDRESET_DISPOSE`
  now guts the dispose call too, so "recovery disposes nothing" still means nothing — neither remover runs).
  Registered three new mutants (§4 below).
- `test/swipe-model.test.js:44-55` — re-verified the `supersession` fingerprint against the changed `begin()`
  region and updated the pinned constant from `502467fc1286f5e1` to `99b3ddb8778bcb57`, with a dated
  re-verification note (matching the file's own convention from prior stages).
- `docs/swipe-model.generated.txt` — regenerated via `node tools/gen-swipe-model.mjs` in the same commit as the
  fingerprint pin update (the generator embeds the live fingerprint in its output). `RECOVERY_REASONS` and
  `DISPOSE_REASONS` in `tools/gen-swipe-model.mjs` already carried `'superseded'` from an earlier stage, so no
  data change was needed there — only re-verification and regeneration.
- `Claude/Subsystems/swipe-reveal.md` — §7 (owned-pane disposal is now a typed operation), §8 (Stage 6e
  paragraph), §14 (emergency disposal rules updated; Loki residual 2 recorded as owed), §19 (three new
  mutants registered), §21 (policy-ledger reference), §23 (pane-lifecycle dispose-half DONE; release half and
  residual-2 guard still owed).
- `Claude/Decisions/DecisionLog.md` — appended a dated Stage 6e entry (implementation, gates, dependency
  rationale, deferred set).
- `Claude/Plans/PLAN-swipe-reveal.md` — extended the §7 step 6 `[SLICED: ...]` annotation with the 6e slice
  and its deferred remainder.

Not changed: `js/nav.js` (the `resetSwipeStyles` function itself is byte-identical; only the recovery call
site's argument changed, as the plan requires), `js/swipe.js`, the reveal/paint-gated path (`holdGhostUntilPaintable`,
`drop`, `fadePanes`, `dropPanes`), the 6c/6d supersession gate and render decision, `build.json` (left for
Zelda at deploy).

## 3. `keepGhosts`-at-both-sites proof (NOOP.mechanism)

Loki `STRIKE-swipe-stage6e-r1.md` residual 2 named two sweep call sites that both had to suppress the
DOM-global `.nav-ghost` query on the owned branch, or `disposeOwnedPanes` would be a behavioural no-op: the
explicit `resetSwipeStyles()` at the old `app.js:416`, and `applyScreen`'s own internal
`resetSwipeStyles(opts.keepGhosts)` (`nav.js:120`), reached from the recovery's `applyScreen(...)` call at the
old `app.js:417`. Both are now threaded: `resetSwipeStyles(cur ? true : undefined)` directly, and
`keepGhosts: cur ? true : undefined` in the `applyScreen` opts object.

`test('NOOP.mechanism — the global .nav-ghost sweep does NOT run on the owned recovery branch (both :416 and
applyScreen :417 suppress it)')` was RED at HEAD (`Global sweeps during recovery=2`) and is GREEN on this
build — the spy counts zero calls to `document.querySelectorAll('.nav-ghost')` across the owned recovery.
`NOOP.attribution` (the sweep neutralized, pane still removed) is likewise GREEN, positively attributing the
removal to `disposeOwnedPanes` rather than the sweep. Both were RED before this build and are GREEN after it,
for the reason the cell was designed to check.

## 4. Coverage Model cells assigned to Brunel (plan §9) — mutants registered

Three built-code mutants were registered in `tools/mutate.mjs` for cells whose true defenders target
`disposeOwnedPanes`, which did not exist when Curie authored the suite. Each was applied SYNCHRONOUSLY
(never backgrounded), the designated test run, the failure confirmed on the intended assertion, then restored
before the next mutation — `node tools/mutate.mjs --restore` after each, confirmed no `*.mutbak` remained.

| cell-id | mutation index / name | designated test | pre-mutation | mutated | restored |
|---|---|---|---|---|---|
| DP (attribution) | #69 `swipe6e DP/attribution` — `disposeOwnedPanes`'s own filter never matches (`if (false && ...)`) | `NOOP.attribution`, `DP.browse-browse`, `DP.browse-home` | green | RED on the intended assertion (`ghosts after recovery`, expected 0 got 1) — also reddened `NOOP.mechanism`/`BR`/`RSN` as collateral, correctly, since no pane is disposed by any path | green |
| BR | #70 `swipe6e BR` — `disposeOwnedPanes` broadens to remove every mover regardless of `own` | `BR` | green | RED on the intended assertion (`the borrowed-real #browse ... must SURVIVE`) — also reddened `DP.browse-browse`/`RSN` as collateral (the borrowed `#browse` incoming mover on that fixture was removed too) | green |
| DEC | #71 `swipe6e DEC`, `js/nav.js` — the `.np-pill-float` removal wrongly guarded behind `keepGhosts` | `DEC` | green | RED on the intended assertion (`the .np-pill-float decoration must still be removed`) — no other test affected | green |

`test/mutation-anchors.test.js` (both assertions — anchors still match; no mutation is a no-op) is GREEN after
the re-anchoring in §2 and the three new registrations.

HR is covered by the pre-existing mutation `#13` ("begin() stops hard-resetting a superseded session"),
re-anchored in §2 to also gut the new `disposeOwnedPanes` call — verified in the RED suite's own record
(`Claude/Curie/RED-swipe-stage6e.md` §4) that #13 reddens DP/HR/BR's snapshot clause; not re-verified again by
hand here since the anchor rot check (`mutation-anchors.test.js`) already confirms the re-anchored text
matches current source, and the semantic content (guts dispose + reset + applyScreen entirely) is unchanged
by the re-anchor. RSN and RGreveal were not assigned a new built-code mutant by this task's build list; RSN's
non-vacuity is carried by its own RED-at-HEAD status (per the RED suite, §6), and RGreveal is defended by the
pre-existing mutation `#54` (unaffected by this slice).

## 5. Loki residual 2 — left OWED, per instruction

The unguarded invariant ("every connected `.nav-ghost` under a live session is an owned-pane mover", which
today holds only because `env.renderDestination`→`Browse.render` is `async` and cannot synchronously unwind
mid-build) has no plan-specified production guard. No production code was added for it. It is recorded as
owed in `Claude/Subsystems/swipe-reveal.md` §14/§23 and in the DecisionLog entry, routed to a plan amendment.
`BR` (borrowed-real never disposed) is green and mutation-proven, per plan.

## 6. Suite and gate results

- `node --test test/*.test.js`: **722 tests, 721 pass, 0 fail, 1 skip** (the skip is
  `test/swipe-invariants.test.js`'s pre-existing device-only `KEEPER` cell, unrelated to this slice — present
  before this build).
- `node tools/hooks/run-checks.mjs` (stamp/lint/typecheck/tests): **all four steps PASS**.
- Meta-gates, all inside the full suite above and independently confirmed green: `test/mutation-anchors.test.js`
  (2/2), `test/swipe-model.test.js` (11/11, fingerprint re-verified), `test/contract-function-gate.test.js`,
  `test/policy-ledger-gate.test.js`, `test/construction-consumers.test.js` (the `dead-return-fields.mjs`
  consumer test — `disposeOwnedPanes` is not a contract-object factory, so it has no returned-key surface for
  that gate to check).
- Mutation sweep: not run as a full `tools/mutation-sweep.mjs` pass (that stays in CI per its own header
  comment); the three new mutants and the re-anchored `#13` were each proven synchronously per §4, matching
  Gate B's per-cell designated-test proof. No `*.mutbak`/`*.manualbak` file remained in the tree at any point
  (checked after every mutation and at the end).
- `git status --short js/` and the full tree: only the files listed in §2, plus the pre-existing untracked
  Charpy/Curie/red-suite files this build inherited. No stray files.

## 7. Deviations from the literal build-list wording, flagged honestly

- The plan's own §9 (and the RED suite's §7 handoff) describe the reconciliation obligation as "register the
  DP/BR/HR/RSN mutations"; this build's dispatch instructions named "a DP/attribution mutant, a BR mutant, and
  any DEC mutant." The RED suite's own §4 table is the more concrete source: it already names BR's
  "broaden the filter" and DEC's "guard `.np-pill-float` behind keepGhosts" as the two built-code mutants
  explicitly deferred to Brunel, with HR covered by the pre-existing `#13` and RSN carried by its own
  RED-at-HEAD status (no mutation needed for non-vacuity). This build registered exactly what the dispatch
  instructions and the RED suite's own record agree on: DP/attribution, BR, DEC — three mutants — and did not
  additionally invent an RSN-specific mutant beyond what either source called for. Flagged rather than silently
  resolved.
- The parameter name inside `disposeOwnedPanes` is `owner`, not the plan's structural-notation `session`, to
  avoid shadowing the module-scope `session` variable the function must never read. The behavioural contract
  (receives its owner explicitly; never reads ambient `session`/`d`) is unchanged.

## 8. Not done — explicitly out of scope for this slice (plan §10, unchanged)

The paint-gated `release()` half (I10, the flash core); the SETTLING/REVEALING pane-owning supersession (B);
the full pane object; the remaining `dispose(reason)` enum members and the folded orphan/decoration path (G);
`paneRemovalPolicy`; the headline compositor flash (independent of this entire rewrite, per the parent plan).

---

{"persona":"brunel","stage":"6e","status":"BUILD_GREEN","report":"Claude/Brunel/swipe-stage6e-build.md","files_changed":["js/app.js","tools/mutate.mjs","test/swipe-model.test.js","docs/swipe-model.generated.txt","Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"keepghosts_both_sites":true,"noop_cell_green":true,"suite":"721/0/1","meta_gates":"all-pass","new_mutants":["69:swipe6e DP/attribution","70:swipe6e BR","71:swipe6e DEC"],"return_to":"poirot"}
