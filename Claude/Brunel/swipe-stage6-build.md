# Build log — Swipe/reveal Stage 6a (supersession pre-stack recovery)

Type: build-log (Brunel)

Built from `Claude/Plans/PLAN-swipe-stage6.md` (input artifact `6e3a596`) against Curie's red suite
(`Claude/Curie/RED-swipe-stage6.md`, `test/swipe-stage6.test.js`). Behavior-changing: closes the two
standing known-red supersession policies (`KR-swipe-source-rerender`, `KR-swipe-scroll-restore`).

## What was built

- **`js/app.js`** — `begin()`'s hard-reset branch (superseding a live/armed gesture or an orphan pane)
  now performs the plan §6 pre-stack recovery, in the ratified order:
  1. `releaseGesture()` — unchanged (listeners released first).
  2. `resetSwipeStyles()` — unchanged position; disposes the superseded pane / stray ghosts.
  3. `applyScreen(currentDesc(), { render: d ? d.clobbered : false, resetScroll: false })` — NEW: restores
     the source screen, re-rendering it into `#browse` only when the superseded drag clobbered the shared
     host (`d.clobbered`, set by `start()` only for a live browse→browse mid-drag render). `d` is null on
     the orphan-pane path, so this degrades to the prior `render:false` top-level restore (I17(b), guard
     for cell OB).
  4. `if (d) window.scrollTo(0, d.scroll0)` — NEW: restores the session-start document scroll.
  5. `dropRowHold()` — POSITION CHANGED: moved from before the recovery (old code) to AFTER it, so
     `Browse.endHold()` realizes the source's suspended rows against the now-settled scroll instead of
     dematerializing them (the Loki-measured virtualized-source defect).
  6. `session = null; d = null;` — POSITION CHANGED: moved to the last step, after the hold release,
     because `dropRowHold()` reads `session` and no-ops when it is null (would otherwise leak the hold).

  No other function was touched; `js/swipe.js` was not touched (per the plan's applicability
  declaration — no boundary relocation, no contract-shape change).

## Bench proof — stage-6a cells

`node --test "test/swipe-stage6.test.js"`: **6 tests, 5 pass, 0 fail, 1 skip** (KEEPER, device-only, as
authored). VR, OR, NC — all red-first per Curie's handoff — are now green on the first implementation
pass. PS and OB (green regression guards) stayed green throughout.

`node --test "test/swipe-invariants.test.js"`: the two existing `{ todo }` tests now pass their assertion
(`ok ... # TODO`, not `not ok`) — SR (`I11/I20 — superseding a live browse->browse drag re-renders the
SOURCE into #browse`) and SC (`I20 — superseding a live drag restores the starting scroll`). Per the
assignment, the `{ todo }` markers were left in place — dropping them is the separate §10 scrub, not
performed here. PD and ST (existing green guards) stayed green.

## Mutation evidence (`tools/mutate.mjs`, Gate B)

Re-anchored one pre-existing mutation whose literal anchor the recovery necessarily rewrote, and
registered four new ones for the cells this build closes. Each was applied, ran red on the intended
assertion, then restored — verified individually below.

| # | Mutation | Designated test | Captured red |
|---|---|---|---|
| 13 (re-anchored) | Hard reset's pane-disposal pair removed | `I2/I20 — superseding a LIVE drag disposes its pane...` | pane stranded (ghosts>0) |
| 14 | Browse hold released BEFORE the recovery render | VR | `kept 0/13 (rebuilt=13)` — exact Loki-measured mutation (a) |
| 15 | `session`/`d` nulled BEFORE the hold release | VR | `state 'suspended', not 'active'` — exact Loki-measured mutation (b) |
| 16 | Recovery never re-renders a clobbered source (`render:false` forced) | SR (also reddens OR and VR, sharing the line) | `renders=["books","authors","books"]` — the exact .218 measurement the plan cites |
| 17 | Recovery omits the scroll restore | SC known-red + NC's scroll clause | both designated assertions reddened |

**One planned mutation dropped, verified false.** The plan's §9 description for cell NC ("recovery
re-renders unconditionally, ignoring `d.clobbered`") was tried as a `render:true`-forced mutation and
run against the full 689-test suite — it reddened nothing. Cause: NC's fixture supersedes from an
OVERLAY source, and `Nav.applyScreen` dispatches on `desc.v` *before* it ever consults the `render` flag
(the options/sub-screen branch calls `renderScreen()`, never `Browse.render()`), so the flag's value
cannot leak into a spurious `#browse` render for that fixture regardless of its truthiness. This is not
an implementation gap — going through `applyScreen`'s existing branch dispatch (rather than calling
`Browse.render` directly) makes that specific defect unreachable by construction. I did not register a
mutation that doesn't catch anything (Engineering Contract §4.8, truthful test/mutation claims); NC's
genuine proof is mutation #17 above, which reddens its scroll-restore clause.

## Generator (build-tooling) update — supersession mirror

`tools/gen-swipe-model.mjs` reimplements (mirrors) `begin()`'s supersession behavior as prose + data
rather than executing it, so the mirror described the OLD hard-reset order after `js/app.js` changed.
Updated the mirror to describe the NEW §6 recovery (build tooling, not a test — no test file touched):

- **`TERMINATION` `hard-reset (leftover)` row** — `screen`/`scroll`/`where` now describe the recovery:
  `screen: 'currentDesc(); rerender iff d.clobbered'`, `scroll: 'restore d.scroll0 (live)'`, and a `where`
  naming the new order (releaseGesture → resetSwipeStyles → applyScreen(render:d.clobbered) →
  scrollTo(d.scroll0) → dropRowHold LAST → session/d=null LAST). Kept `basis: 'parity'` (the swipe-model
  ledger test requires every `TERMINATION` row parity-with-`where`; the row still factually describes
  current code at a named region).
- **§5 SUPERSESSION prose in `render()`** — replaced the old order and the "today does NOT / not yet
  implemented" framing with the new in-order sequence (recovery inside the hold, hold released last,
  identity nulled last, then arm) and marked both repairs `IMPLEMENTED (stage 6a)`. The two repairs stay
  classified new-policy (they do not reproduce pre-rewrite code; `NEW_POLICIES` ids unchanged, as the
  ledger test pins them exactly).

Regenerated `docs/swipe-model.generated.txt` via `node tools/gen-swipe-model.mjs` (which also refreshes
the embedded `begin/supersession` fingerprint printed in the doc).

## Full-suite bench

`node --test "test/*.test.js"`: **689 tests, 685 pass, 1 fail, 1 skip, 2 todo.**

- 1 skip = KEEPER (device-only, authored `{ skip }`).
- 2 todo = SR/SC, both now passing their assertion (expected — the `{ todo }`/ledger retirement is the
  deferred §10 scrub).
- **1 fail — `test/swipe-model.test.js` → `every mirrored js/app.js region still matches what was
  verified`** — `expected: 'c70d4ed49257af8e'`, `actual: '9227f47ff3d3c7db'`. This is the hard-coded
  `VERIFIED.supersession` pin **inside the test file**, which the assignment's hard constraint forbids me
  editing. It is Curie's to update. **Fingerprint handed to Curie: `9227f47ff3d3c7db`** (the value
  `gen.supersessionFingerprint()` now produces for the new region).
- **The companion fail — `the committed model is exactly what the generator produces` — is now GREEN**
  after the generator update + regeneration.
- All other gates green: `test/mutation-anchors.test.js` (both assertions), the swipe-model §8A ledger
  test (NEW_POLICIES set + parity-where rows intact), policy-ledger, descriptor-coverage, browse-virtual,
  contract-function, build-stamp, transition-matrix.

## Not done (explicitly, per the assignment)

- `Claude/Decisions/PolicyLedger.mjs` — not touched (still declares both known-reds; they are now green
  in practice but the ledger entries are not yet removed — deferred §10 scrub).
- `{ todo }` markers on the two `swipe-invariants.test.js` tests — not dropped (deferred §10 scrub).
- `test/swipe-model.test.js` `VERIFIED.supersession` pin — NOT touched (a test; Curie's, fingerprint
  handed off above).
- `Claude/Subsystems/swipe-reveal.md`, `Claude/Plans/PLAN-swipe-reveal.md` §7 step 6,
  `Claude/Decisions/DecisionLog.md` — not annotated (deferred §10 scrub).
- No git commit; no build-number stamp (Zelda's job at commit time, per the assignment).

## Files changed

- `js/app.js` — the production change (`begin()`'s hard-reset/recovery branch).
- `tools/mutate.mjs` — re-anchored one existing mutation the recovery's rewrite invalidated; registered
  four new stage-6a mutations (one candidate removed as empirically non-functional, see above).
- `tools/gen-swipe-model.mjs` — updated the supersession mirror (TERMINATION row + §5 prose) to the new
  behavior.
- `docs/swipe-model.generated.txt` — regenerated from the updated generator.

```json
{"persona":"brunel","stage":6,"input_artifact":"6e3a596","verdict":"BUILD_GREEN","files_changed":["js/app.js","tools/mutate.mjs","tools/gen-swipe-model.mjs","docs/swipe-model.generated.txt"],"suite_result":"685 pass / 1 fail / 1 skip / 2 todo (689 total) — the single fail is test/swipe-model.test.js's VERIFIED.supersession pin (expected c70d4ed49257af8e, actual 9227f47ff3d3c7db), a test-file constant this pass may not edit; handed to Curie","supersession_fingerprint":"9227f47ff3d3c7db","handoff_to_curie":"update VERIFIED.supersession to 9227f47ff3d3c7db in test/swipe-model.test.js","return_to":"poirot"}
```
