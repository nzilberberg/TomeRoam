# BUILD — Swipe/reveal Stage 6d (finalizationPlanFor.abortRender + `clobbered` retirement)

Type: build log (Brunel)
Date: 2026-07-27
Input plan: `Claude/Plans/PLAN-swipe-stage6d.md` (RATIFIED/FROZEN), §2/§3/§4/§9
Input red suite: `Claude/Curie/RED-swipe-stage6d.md` — `test/swipe-stage6d.test.js` (FP, CLB, AB, RC)
Input Loki strike (context, HELD_STONE): `Claude/Loki/STRIKE-swipe-stage6d-r1.md`
Verdict: **BUILD_GREEN**

## 1. Exact slice completed

The abort/recovery re-render DECISION moved from a runtime byproduct (`sourceWasClobbered =
resolveSource() === hostEl`, observed during `buildConstruction`, stored as `d.clobbered`) to a
pure declared decision `Swipe.finalizationPlanFor(classification).abortRender`, computed at ARM
time and stored on the session as `cur.finPlan`. Behaviour is byte-identical on every reachable
transition (parity extraction, EC §4.19; no PolicyLedger entry). The declared rule is
`abortRender === 'rerender'` iff `fromKind==='browse' && toKind==='browse'`, else `'none'`.

## 2. Files changed (file:line)

### Production
- **`js/swipe.js`**
  - **Added `finalizationPlanFor(c)` (162–170)** — pure, DOM-free, deep-frozen exact-key
    `{ abortRender: 'rerender' | 'none' }`. No default branch: an unhandled `fromKind`/`toKind`
    THROWS (mirrors `constructionPlanFor`). Exported in the public surface (356).
  - **Retired `sourceWasClobbered`** — deleted its `let` init (was ~300), its compute
    `resolveSource() === hostEl` in the browse-host-render branch (was ~310), and its return
    member. The Construction contract return is now three keys `{ decorations, movers, capture }`
    (351). Header (14–26) and the return-contract comment (342–349) updated to current truth.
- **`js/app.js`**
  - **Arm-time compute (441–443)** — replaced `clobbered: false` in the session literal with
    `finPlan: Swipe.finalizationPlanFor(Swipe.classifyTransition({ from, to: dest }))`, so `finPlan`
    is defined for every non-null session (ARMED/DRAGGING/SETTLING alike), exactly as
    `clobbered: false` was.
  - **Deleted the `d.clobbered = c.sourceWasClobbered` set** (was ~516).
  - **Redirected the three read sites:**
    - supersession recovery reader (417): `render: cur ? (cur.live && cur.finPlan.abortRender ===
      'rerender') : false` — the `cur.live` conjunct reproduces `clobbered`'s build-ran half
      (byte-parity for the ARMED-supersession case).
    - held browse→browse abort selector (1160): `if (!commit && cur.finPlan.abortRender ===
      'rerender')`.
    - no-pane abort render arg (1187): `applyScreen(dest, { render: cur.finPlan.abortRender ===
      'rerender', resetScroll: false })`.
  - Comment sites updated: the recovery rationale (390–393) and the session-recording comment
    (466, `capture/finPlan/movers`).

### Co-changes (kept the retirement honest — the RG* cells depend on them)
- **`test/swipe-construction.test.js`** — `CONSTRUCTION_KEYS` 4→3 (`{capture, decorations,
  movers}`, line 33); dropped the `typeof c.sourceWasClobbered` assertion; the F6 test (was
  218–237, asserting `sourceWasClobbered` per transition) DELETED, its intent folded into cells
  FP+AB (a comment block records where it went).
- **`test/contract-function-gate.test.js`** — registered `finalizationPlanFor` as a CONTRACT entry
  (input = the `browse→browse` classification; keys = `['abortRender']`).
- **`test/construction-consumers.test.js`** — added `finalizationPlanFor` to `EXACT_KEY_GATED` (the
  drift guard sees a new object-returning export; it is covered by the exact-key gate, not the
  dead-field registry).
- **`tools/mutate.mjs`** — re-pointed the four recovery-line anchors (`HARDRESET_DISPOSE_FROM`,
  `VR_HOLD_ORDER_FROM/TO`, `RECOVERY_RENDER_LINE`, `F1_ORPHAN_RESETSCROLL_TO`) from `render: cur ?
  cur.clobbered : false` to `render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') :
  false`; re-pointed the swipe5 F6 anchor (`sourceWasClobbered = resolveSource() === hostEl → false`)
  to a `finalizationPlanFor` mutation (force `abortRender: 'none'`, reddens FP.oracle + AB.clobber);
  updated the anchor prose comments.
- **`tools/gen-swipe-model.mjs`** — updated the `TERMINATION` hard-reset row `where`/`screen` and
  the two §5 supersession prose blocks from `d.clobbered` to the `cur.live && cur.finPlan.abortRender
  === 'rerender'` derivation. Regenerated `docs/swipe-model.generated.txt`.
- **`test/swipe-model.test.js`** — updated the `supersession` fingerprint pin
  `c5ab2fae0fd03654 → 502467fc1286f5e1` (the arm-literal + recovery-reader edits land inside that
  fingerprinted region; SEMANTICS unchanged — byte-identical parity), with a re-verification note.
- **`test/fixtures/swipe-plan-spec.mjs`** — removed the header caveat ("NOT consumed / absence
  must NOT be read as verified"); states `expectedFinalization.abortRender` is now the live oracle.
  DATA unchanged (frozen — I wired the comparison, did not touch the values).
- **Comment/message-only sites:** `test/swipe-invariants.test.js:378`, `test/swipe-stage6.test.js`
  (NC + OB + OB-home blocks), `test/swipe-stage6b-loser-cancel.test.js:53`.

## 3. Retirement proof (grep)

`grep -rniE "sourceWasClobbered|\.clobbered|clobbered:" js/` → **NONE** (zero production code
references in `js/app.js` / `js/swipe.js`). The word `clobber` survives only in unrelated generic
comments (`snapBrowse clobbers #browse`, `don't clobber newer playback`, etc.) and in other
subsystems' code (shardstore/syncqueue/plexconn — a different concept), all pre-existing and out of
scope per plan §2.

In `test/`, the retired identifiers appear only as:
- the CLB gate's own required search literals — `const RETIRED_TOKENS = ['sourceWasClobbered',
  '.clobbered', 'clobbered:']` in `test/swipe-stage6d.test.js` (Curie's FROZEN suite; the gate MUST
  name the tokens to assert their absence in production — not mine to edit and correct by design);
- explanatory doc-comments in the co-changed tests describing the retirement (`swipe-construction`,
  `swipe-model`), and Curie's suite doc-comments.

No `test/**` file READS or WRITES a `.clobbered`/`sourceWasClobbered` field as code. Archival
`Claude/Loki/` casebooks retain their historical mentions (out of scope, StandardsDocument §6).

## 4. Exact test counts (read from the runner output — not estimated)

- **Full suite** `node --test "test/*.test.js"`: **711 pass / 0 fail / 1 skip** (712 tests, 0 todo,
  0 cancelled). The 1 skip is the pre-existing device-only Loki KEEPER.
- **`node tools/hooks/run-checks.mjs`**: `✓ stamp  ✓ lint  ✓ typecheck  ✓ tests` →
  `tomeroam pre-commit checks: PASS`.
- **`test/swipe-stage6d.test.js`** (the slice's RED suite): **7 pass / 0 fail** (FP.contract,
  FP.oracle, CLB, AB.clobber, AB.noclobber-overlay, AB.noclobber-home, RC.armed).

## 5. Meta-gate results

| Gate | Command | Result |
|---|---|---|
| mutation-anchors | `test/mutation-anchors.test.js` | **PASS** (2/0/0) — every anchor matches, no no-op |
| dead-return-fields | `tools/dead-return-fields.mjs` (CLI) + `test/construction-consumers.test.js` | **PASS** (CLI exit 0; test 2/0/0) |
| policy-ledger-gate | `test/policy-ledger-gate.test.js` | **PASS** (3/0/0) — ledger unchanged (parity, no known-red) |
| contract-function-gate | `test/contract-function-gate.test.js` | **PASS** (4/0/0) — `finalizationPlanFor` exact-key + deep-frozen on a direct call |
| swipe-model (fingerprint) | `test/swipe-model.test.js` | **PASS** (11/0/0) — regenerated doc matches; supersession pin re-verified |
| mutation-sweep (full) | `tools/mutation-sweep.mjs` | see §6 |

## 6. Mutation-sweep (full, all mutations)

The re-pointed anchors were individually verified during the build:
- **#54** (`finalizationPlanFor → abortRender:'none'`): reddens exactly **FP.oracle + AB.clobber**.
- **#16** (recovery render forced false): reddens the browse→browse recovery cells (I11/I20, OR, VR).
- **#18** (F1 orphan resetScroll:false): reddens OB-home.
- **#13** (begin() stops hard-resetting): reddens I2/I20, I11/I20, OR, VR, OB-home.

Full sweep result: <SWEEP_RESULT_PLACEHOLDER>

## 7. Parity classification (EC §4.19 / §8 completion report)

Behaviour-preserving EXTRACTION. Production behaviour changed: **none** (byte-identical on every
reachable transition — the retired byproduct equalled `cur.live && (browse→browse)` at every read
site; the Loki r1 strike found 0 divergences over 132 pairs and HELD_STONE). Production behaviour
deliberately unchanged: reveal timing, hold/drop control flow, commit path, scroll policy, the 6b
loser-cancels, the 6c identity guard. New contract introduced: `finalizationPlanFor` returning
`{ abortRender }`. Identities: none introduced/reinterpreted. Resources: none moved under ownership
(`finPlan` is an immutable value, not an owned resource). Dead fields: none introduced; one retired
(`sourceWasClobbered` on the Construction return, `d.clobbered` on the session). No known-red,
no temporary exception, no PolicyLedger entry.

## 8. Deferred (unchanged from plan §10)

The rest of the finalization plan (`commit`/`abort-scroll`/`stackEffect`/`reveal`/`paneRemovalPolicy`),
the unified `planFor()` wrapper, host fields (`sourceHost`/`destinationHost`/`sameBrowseHost`), the
pane-lifecycle interface (F), pane-owning supersession (B), I10/I17 reveal centralization (C, the
flash core), the `recoverSession` matrix (G), and the null-bookkeeping (A). None built here.

## 9. Handoff

→ Poirot (code review), then Mendeleev (coverage audit), then Loki (strike the §3 promise on the
corrected domain). Nothing committed — left staged/uncommitted for Zelda to commit as the
BUILD_GREEN immutable target. (Note: `js/app.js.mutbak` is the mutation-sweep's transient backup;
it is removed on sweep completion and is untracked either way.)
