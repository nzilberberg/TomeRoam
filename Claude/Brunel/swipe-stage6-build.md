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

## Poirot review fixes (build f09cf9d → this pass) — FIX-THEN-SHIP

Review: `Claude/Poirot/f09cf9d-swipe-stage6-supersession.md` (verdict FIX-THEN-SHIP, blocking id F1).
Both findings routed to Brunel; both fixed here.

### F1 (blocking, Minor — `js/app.js` `begin()`) — orphan sub-case lost its scroll-to-top

The recovery's shared `applyScreen(currentDesc(), { render: d?d.clobbered:false, resetScroll: false })`
forced `resetScroll:false` onto the ORPHAN branch (`d === null`) as well as the live-recovery branch.
`resetScroll:false` is only NEEDED on the live branch (so `applyScreen` does not stomp the explicit
`d.scroll0` restore). On the orphan branch, for a `home` or options/sub `currentDesc()`, the pre-6a code
reset the document scroll to top (nav.js:127/134, default `resetScroll:true`); f09cf9d silently dropped
it — an unclassified behavior change on a path plan §2 declared parity, invisible to the OB test (browse
source, where `resetScroll` is inert).

- **Reproduce-before-accept:** Curie's red-first guard `OB-home` (`test/swipe-stage6.test.js`, an orphan
  hard-reset on a HOME source asserting `window.scrollTo(0, 1)`) was RED on f09cf9d for exactly this
  reason. I did not touch that test.
- **Fix (js/app.js:385):** `resetScroll: d ? false : undefined` — forces `false` only when a live session
  exists; the orphan passes `undefined`, so `applyScreen` keeps nav.js's default (`resetScroll:true`) and
  home/options still resets to top. The recovery comment was corrected (it had claimed both expressions
  "degrade to the prior top-level nav restore" — the very bug F1 caught).
- **Mutation-verified (Gate B):** new registry mutation #18 (`F1_ORPHAN_RESETSCROLL_TO`, reverts to
  `resetScroll: false`) reddens OB-home and ONLY OB-home; OB/VR/OR/NC stay green. Sweep: `#18 caught`.

### F2 (non-blocking — `tools/gen-swipe-model.mjs`) — §6 label inconsistency

The §6 TERMINATION table stamped the `hard-reset` row `[parity]` while its own screen/scroll columns now
render the SR/SC repairs, which §10 (the gated §8A ledger) classifies as NEW POLICY — a within-document
label inconsistency (StandardsDocument §7). The swipe-model gate requires every TERMINATION row's DATA
`basis` to stay `'parity'` with a `where` (it means "verified against current code at the region"), so the
fix is in the RENDER, not the data:

- Added a `policyRef` field to the hard-reset row (leaves `basis:'parity'` intact — ledger test still
  green) and a basis-column legend clarifying `[parity]` = verified-current-code, distinct from the §10
  parity-vs-policy ledger.
- The hard-reset row now renders `[parity] †` with a footnote: its screen/scroll are the SR/SC repairs,
  NEW POLICY (§10), implemented 6a; the `[parity]` basis covers only the supersede-not-reject routing +
  orphan disposal; and the orphan sub-case keeps nav.js default scroll-to-top.
- Regenerated `docs/swipe-model.generated.txt` via `node tools/gen-swipe-model.mjs`.

### Fingerprint moved again (for Curie)

The F1 code change moves the `begin/supersession` SOURCE region again. New value:
**`gen.supersessionFingerprint()` = `d39534854e3cc348`** (was `9227f47ff3d3c7db`). Curie re-pins
`VERIFIED.supersession` in `test/swipe-model.test.js` to `d39534854e3cc348`. I did not edit the pin.

### Bench (this fix pass)

- `test/swipe-stage6.test.js`: **7 tests, 6 pass, 1 skip** — OB-home now GREEN; OB/VR/OR/NC/PS green;
  KEEPER skip.
- `test/swipe-model.test.js`: fail #1 (`committed model == generator`) GREEN; §8A ledger GREEN; only the
  `VERIFIED.supersession` pin red (Curie's, value handed off above).
- `test/mutation-anchors.test.js`: 2/2 green (re-anchored #13/#14/#16 to the new `applyScreen` line +
  the SR mutation's `render:false` target; added #18 for F1).
- `node tools/mutation-sweep.mjs 14 15 16 17 18`: all 5 CAUGHT, `0 uncaught, 0 unapplied, 0 stale flags`.
- Full suite `node --test "test/*.test.js"`: **690 tests, 686 pass, 1 fail, 1 skip, 2 todo.** The 1 fail
  is the `VERIFIED.supersession` pin (`expected 9227f47ff3d3c7db, actual d39534854e3cc348`) — Curie's
  re-pin. 1 skip = KEEPER (device-only). 2 todo = SR/SC (deferred §10 scrub). The suite gained one test
  (Curie's OB-home) vs the prior 689.

### Build number

The F1 change is a product change → requires a build-number bump from `2026-07-26.245` to the next
(`2026-07-26.246`) at commit time, per the PWA deploy rule (web-only OTA; no native change → no APK
rebuild). Named here; NOT applied — Zelda stamps at commit.

## Files changed

- `js/app.js` — the production change (`begin()`'s hard-reset/recovery branch); Poirot F1 fix
  (`resetScroll: d ? false : undefined`).
- `tools/mutate.mjs` — re-anchored the mutations the recovery's rewrites invalidated (the F1 `applyScreen`
  line change rotted #13/#14/#16 + the SR target); added the F1 mutation (#18, defends OB-home). Earlier:
  registered the four original stage-6a mutations (one candidate removed as empirically non-functional).
- `tools/gen-swipe-model.mjs` — supersession mirror updated (TERMINATION row + §5 prose) to the new
  behavior; Poirot F2 fix (basis-label footnote/legend).
- `docs/swipe-model.generated.txt` — regenerated from the updated generator.

```json
{"persona":"brunel","stage":6,"input_artifact":"f09cf9d","verdict":"BUILD_GREEN","findings_fixed":["F1","F2"],"files_changed":["js/app.js","tools/mutate.mjs","tools/gen-swipe-model.mjs","docs/swipe-model.generated.txt"],"suite_result":"686 pass / 1 fail / 1 skip / 2 todo (690 total) — the single fail is test/swipe-model.test.js's VERIFIED.supersession pin (expected 9227f47ff3d3c7db, actual d39534854e3cc348), a test-file constant this pass may not edit; handed to Curie","supersession_fingerprint":"d39534854e3cc348","handoff_to_curie":"re-pin VERIFIED.supersession to d39534854e3cc348 in test/swipe-model.test.js","build_bump_owed":"2026-07-26.245 -> .246 at commit (Zelda)","return_to":"poirot"}
```
