# Code Review — Swipe/reveal Stage 5 (`buildConstruction` seam) — build 2026-07-23.239

Type: code-review
Prior-review: 009dbc9-selector-fix-rereview.md
Range: 73c27de..6bf0d20 (the single commit 6bf0d20; HEAD)
Reviewer: Poirot
Date: 2026-07-23
Plan of record: `Claude/Plans/PLAN-swipe-stage5.md` (APPROVED/RATIFIED). Sub-plan of
`PLAN-swipe-reveal.md` §7 step 5. Test design: `Claude/Curie/swipe-stage5-test-design-2026-07-23.md`.
Build log: `Claude/Brunel/swipe-stage5-build-2026-07-23.md`.

## Verdict

**Ship.** This is a faithful parity extraction: the pane-construction block leaves `app.js` `start()`
for `Swipe.buildConstruction(from, dest, env)` in `js/swipe.js` behind an injected `env`, `start()`
becomes the L3 adapter, and every observable effect of the pre-extraction `start()` is reproduced. One
full coverage-ledger pass returns zero findings a competent reviewer would require changed before
submit. The single behaviour change (`GHOST_BG` per-gesture) is plan-sanctioned and disclosed (§7 F8 /
Loki R1); it is filed as an Observation, not a blocker, and needs no code change.

The correctness bar the invocation set is met, by execution this pass:
- **Full suite** green: `node --test "test/*.test.js"` → 680 tests, 678 pass, 0 fail, 2 todo (the two
  pre-existing ledger-tracked known-reds `KR-swipe-scroll-restore` / `KR-swipe-source-rerender`, both in
  `test/swipe-invariants.test.js`, both the deliberate rewrite-policy items — NOT stage 5).
- **Gates** green (part of the 680 + the sweep): policy-ledger, contract-function-gate,
  transition-matrix, swipe-model, mutation-anchors, lint, build.
- **Every §8 cell mutation-verified**: `node tools/mutation-sweep.mjs 30 36 42..58` →
  `swept 19: 0 uncaught, 0 unapplied, 0 stale flags`. Each mapped mutation reddens a behaviour test.

## Prior-review watch-list — disposition

| Item | State | Evidence |
|---|---|---|
| W8 — stage-5 scope (pane builders move into swipe.js) | **RESOLVED (this build)** | The move happened and is parity-verified: recipes `ghostApp`/`snapshotHome`/`npPillClone` + helpers relocated behind `env`; `overlayEl`/`appViewEl` source resolution via `env.sourceEl`; `start()` consumes the Construction. No behaviour drift found (ledger below). |
| W16 — stage 5/6 host-field re-introduction tripwire | **PARTLY RESOLVED; sameBrowseHost half still open** | `sourceHost`/`destinationHost` re-emitted WITH real consumers (`env.sourceEl(sourceHost,…)`; `destinationHost`→`env.renderDestination`), and BOTH exact-key gates flipped atomically in the same commit (`contract-function-gate.test.js:24`, `swipe-transition.test.js` `CLASSIFICATION_KEYS`). `sameBrowseHost` is still withheld — its exact-key gate stays the stage-6 tripwire. |
| W11 — O1: start() on a thrown classifyTransition (malformed live descriptor) | **OPEN (carried, minor)** | Unchanged exposure. `classifyTransition` now throws inside `buildConstruction`, which `start()` calls at app.js:450 with no try/catch — same unguarded propagation as stage 4 (`start()` previously called `constructionPlanFor(classifyTransition(...))` at the same point). Not made worse; not addressed. Descriptors come from the nav stack, so unreachable in normal flow. |
| W18 — `changedFiles`/`parseChangedFiles` grammar coupling (mutation-sweep.mjs) | **OPEN (carried, observation)** | Unrelated to swipe; `mutation-sweep.mjs` is a pre-existing dirty file, NOT part of 6bf0d20. Untouched. |

## Investigation notes

**The scene.** The diff moves the two capture recipes (`ghostApp`/`snapshotHome`), their helper cluster
(`ghostWrap`/`freezeArt`/`copyScroll`/`copyAnimPhase`, `GHOST_BG`), and the NP pill builder
(`npPillClone`) out of `app.js` `start()` into `Swipe.buildConstruction` behind an injected `env`;
`classifyTransition` re-emits `sourceHost`/`destinationHost`. `start()` keeps geometry (numeric
base/width/direction), session recording (capture/clobbered/movers), the row hold + reveal snapshot, and
the outgoing-NP `np-locked` unlock. The destination render dispatch stays app-side as `env.renderDestination`
(L2). Intent matches the plan's boundary B exactly.

**Parity, verified against the removed lines** (`git show 6bf0d20 -- js/app.js`):
- **Mover geometry.** L3 `baseOf(slot) = slot==='outgoing' ? 0 : off`, `off = d.dir==='back' ? -d.w : d.w`;
  decoration base = its slot. Identical to old `out.base=0 / incoming.base=off / pill base=deco.base==='outgoing'?0:off`.
  The seam emits `{element,ownership,slot}` (swipe.js:277) and L3's `toMover` reads `.element`/`.ownership`
  (app.js:457) — the keys MATCH (both the adversary probe and the F1.1 recipe test confirm the mapped
  `d.movers` come out `{el,base,own}` fully populated; a mismatch would crash at app.js:481).
- **Capture / no-ghostY-on-home.** Exactly one owned pane produces capture (`app-ghost` XOR
  `home-snapshot`; the two write sites at swipe.js:294/302 are mutually exclusive on `toKind`). L3 records
  `if ('ghostY' in c.capture) d.ghostY = …` (app.js:465), so the home path leaves `d.ghostY` untouched —
  parity with old `snapshotHome` never setting it. Both readers null-guard (`cur.ghostY == null`,
  app.js:991 and 1040), so an absent `ghostY` is parity-safe.
- **`d.clobbered`.** New `sourceWasClobbered = resolveSource() === hostEl` in the browse-host branch
  (swipe.js:310); L3 always writes `d.clobbered = c.sourceWasClobbered`. Parity with old
  `!fromOv && appViewEl(fromV) === $('browse')`: `resolveSource()` uses `sourceHost`, so an overlay source
  resolves to an overlay element ≠ `$('browse')` — subsuming the `!fromOv` guard. Session default
  `clobbered:false` (app.js:393) equals the old untouched default, so writing it every gesture is
  parity-safe. `overlayEl`/`appViewEl` are side-effect-free `getElementById` lookups (nav.js:35-36), so
  reusing `resolveSource()` for both the mover and the clobber check changes nothing.
- **Ordering.** `revealBase = snapBrowse(true)` and `takeRowHold()` (app.js:429-430) precede
  `buildConstruction` (450); inside it the outgoing owned pane is built (swipe.js:291-297) before
  `env.renderDestination` runs (306/312) — the browse→browse ghost snapshots the pre-render `#browse`.
- **Env seam.** Relocated code reads only `env.document`/`doc.defaultView`/`env.scrollY`/`env.navPill`/
  `env.sourceEl`/`env.renderDestination` — no ambient `document`/`window`/`Element`/`getComputedStyle`.
  `GHOST_BG` resolved inside `paneBuilders(env)` (per gesture), not at module load.
- **np-locked reordering (benign).** The outgoing-NP unlock now runs after `npPillClone()` (old: unlock
  then clone). `cloneNode(true)` copies DOM structure, not the body's `np-locked` CSS effect, so the clone
  content is identical either way. The incoming-NP unlock rides with `env.renderDestination`, identical to
  the old overlay branch.

**Reassuring comments — each checked, none read past:** "single source of identity, F5" (verified —
`buildConstruction` derives classification from `from`/`dest`, never accepts it alongside); "Exactly one
owned pane produces capture (app-ghost XOR home-snapshot)" (verified by branch analysis + mutations
#43/#44); "resolved FRESH per gesture (never cached at module load)" (verified — inside `paneBuilders`,
per call); "no `ghostY` synthesized on the home path" (verified + mutation #57); "Log BEFORE the build so
`ghosts=` reports any PRE-EXISTING leftover pane (parity)" (verified — log precedes `buildConstruction`);
"the typed `own` drives teardown by TYPE … unchanged from stage 3" (verified — `own = ownership`,
`paneKindOf` keys on `owned-pane`).

**Independent contract-completeness pass (required for contract-surface code).** A cold-read adversary
(blind to the commit message's account) ran executed probes across all 8 plan invariants and returned
**no defects**, independently confirming the mover-shape match, the capture XOR + null-for-borrowed-real,
the `d.clobbered` cases, the ordering, the env seam, the malformed/unhandled throws, and the L3 base
mapping. It surfaced the `GHOST_BG` behaviour change (see O1) as the one deviation from the commit's
"parity only" claim.

## Coverage Ledger

Rows = every file/symbol changed in `git diff 73c27de..6bf0d20`. Dimensions: **C** correctness/data-flow ·
**RT** reference-teardown · **OL** object-lifetime · **TS** teardown-symmetry · **DR** deferred-resource
cancel · **RC** reassuring-comment verified · **ABS** absolute-claim checked. Marks: **✓** cleared by an
EXECUTED command cited this pass · **~** cleared by READING/REASONING only · **n/a** · **FIND**. No empty
cells. Stage-5 adds NO listeners/timers/rAF/persistent state (async_change:false, lifecycle_ownership:false
per plan §Applicability), so RT/OL/TS/DR are n/a across the relocated code — the pane lifecycle is deferred
to stage 6.

Commands behind every `✓`: **[S]** `node --test "test/*.test.js"` (680: 678 pass/0 fail/2 todo);
**[M]** `node tools/mutation-sweep.mjs 30 36 42..58` (19 swept, 0 uncaught); **[H]** executed
`classifyTransition` probe over all 8 structural cases; **[I]** `mutate.mjs 30` + `node --test
test/swipe-invariants.test.js` (fail 1: the NP-pill WIRING test) + restore; **[G]** `git show 6bf0d20`
per-file diff.

| # | Changed file / symbol | C | RT | OL | TS | DR | RC | ABS |
|---|---|---|---|---|---|---|---|---|
| 1 | js/swipe.js `classifyTransition` (host fields re-emitted) | ✓ [H][M] | n/a | n/a | n/a | n/a | ✓ [M] | ✓ [H][M] |
| 2 | js/swipe.js `paneBuilders`/`ghostApp`/`snapshotHome` (relocated recipes) | ✓ [S][M][G] | n/a | n/a | n/a | n/a | ✓ [M] | ✓ [M] |
| 3 | js/swipe.js `copyAnimPhase` (env Element; returns {synced,residual}) | ✓ [M] | n/a | n/a | n/a | n/a | ✓ [M] | ✓ [M] |
| 4 | js/swipe.js `npPillClone` (relocated) | ✓ [M][I] | n/a | n/a | n/a | n/a | ~ | ✓ [M] |
| 5 | js/swipe.js `buildConstruction` (NEW L1 seam) | ✓ [S][M][G] | n/a | n/a | n/a | n/a | ✓ [M] | ✓ [M][H] |
| 6 | js/app.js `start()` → L3 adapter (env, toMover, capture/clobbered recording, np-locked) | ✓ [S][M][G] | n/a | n/a | n/a | n/a | ✓ [G] | ✓ [M][G] |
| 7 | js/app.js `isOverlay` alias removed (now unused) | ✓ [S][G] | n/a | n/a | n/a | n/a | n/a | n/a |
| 8 | js/app.js `paneKindOf` comment update (owned panes now built by buildConstruction) | n/a | n/a | n/a | n/a | n/a | ✓ [G] | n/a |
| 9 | test/contract-function-gate.test.js (classify→5 keys; buildConstruction NON_CONTRACT) | ✓ [S][G] | n/a | n/a | n/a | n/a | ~ | ✓ [S] |
| 10 | test/swipe-construction.test.js (todo markers removed; recipe suite live) | ✓ [S][M] | n/a | n/a | n/a | n/a | ~ | ✓ [M] |
| 11 | test/swipe-transition.test.js (CLASSIFICATION_KEYS→5; 2 host todos removed) | ✓ [S][M] | n/a | n/a | n/a | n/a | ~ | ✓ [M] |
| 12 | test/swipe-stage5-wiring.test.js (NEW: F1b/F5b/F5c/F2-r/F7b) | ✓ [S][M] | n/a | n/a | n/a | n/a | n/a | ✓ [M] |
| 13 | tools/mutate.mjs (2 re-anchored + 17 new §8 mutations) | ✓ [M] | n/a | n/a | n/a | n/a | ~ | ✓ [M] |
| 14 | Claude/Decisions/PolicyLedger.mjs (2 stage-5 KR entries removed) | ✓ [S][G] | n/a | n/a | n/a | n/a | n/a | n/a |
| 15 | docs/swipe-model.generated.txt (regenerated — line refs only) | ✓ [G] | n/a | n/a | n/a | n/a | n/a | ~ |
| 16 | build.json / index.html / js/debug.js / sw.js (build stamp .238→.239) | ✓ [G] | n/a | n/a | n/a | n/a | n/a | ✓ [G] |
| 17 | Claude/Brunel/swipe-stage5-build-2026-07-23.md (build log) | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

`~` accounting (verdict duty): every `~` is a structural read with no open executable claim — row 4 RC
(the `npPillClone` comment, its subject read; behaviour executed under [M]/[I]), rows 9-11/13 RC
(test-file intent comments verified by reading), row 15 ABS (the generated model's line-ref-only change,
diff-confirmed under [G]). None is a behavioural/enumerable claim left unrun. No `~` blocks the verdict.

Stamp coherence (row 16): build.json=`2026-07-23.239`, debug.js BUILD=.239, sw.js BUILD=.239, index.html
meta=.239; the index.html diff is `?v=` bumps + the meta stamp only — no smuggled markup.

## Findings

| # | Severity | Finding |
|---|----------|---------|
| O1 | Observation | The commit message asserts "Parity only -- no behaviour change," but `GHOST_BG` moved from `bindSwipeBack()` scope (evaluated once per bind) into `paneBuilders(env)` (evaluated per gesture). This is observably different if `--page-bg` changes mid-session: the old code used a value cached at bind, the new re-reads each gesture. It is REQUIRED by plan §7 F8 and disclosed as Curie's Loki R1 ("GHOST_BG fresh-per-gesture is a disclosed behavior change") — the code is CORRECT against the plan and is an improvement (it removes a latent stale-background class). No code change; the plan is the authoritative record and states the real story. Noted so the casebook does not carry the commit's overbroad claim as fact. |
| O2 | Observation | (from prior W11) `buildConstruction` throws (malformed parameterized descriptor → `classifyTransition`; unhandled kind → `constructionPlanFor`); `start()` calls it un-wrapped (app.js:450). Unreachable in normal flow (descriptors come from the nav stack) and unchanged from stage 4. Wrap-or-confirm is take-it-or-leave-it; carried on the watch-list, not required here. |

## The prediction

The seam is a clean split and the tests reach it — the failure mode to watch is not in this commit but at
the **stage-6 boundary it deliberately stops at**. Two threads are load-bearing there: (1) `sameBrowseHost`
is still withheld, and its exact-key gate is the only tripwire that will fire if a future stage re-emits it
without a consumer — the W16 pattern, one field later; the discipline that made this commit clean (consumer
+ test + both gates in the same commit) must repeat. (2) The pane lifecycle (`release()`/`dispose()`) is
deferred, so the owned panes `buildConstruction` mounts (`.nav-ghost` wrappers, the `.np-pill-float` clone)
are still torn down by `resetSwipeStyles`, not by a typed consumer — when stage 6 centralizes finalization,
the `owned-decoration` tag that is decorative today (no consumer reads it) becomes load-bearing, and the
teardown-symmetry sweep must confirm every exit path releases every mounted pane. Neither is a stage-5
defect; both are exactly where the next bug would concentrate if the stage-6 discipline slips.

## Watch-list

Carries forward every OPEN item from the prior review; the next review MUST forward every OPEN item below.

- [W8] (resolved: this build — the pane builders `ghostApp`/`snapshotHome`/`npPillClone` + `overlayEl`/
  `appViewEl` source resolution moved into `js/swipe.js` `buildConstruction` behind `env`; parity verified
  by the coverage-ledger pass, the §8 mutation sweep (0 uncaught), and the cold-read adversary (no defects))
  Stage-5 pane-builder move.
- [W11] (open, minor) O2 — `start()` calls `buildConstruction` un-wrapped; a malformed live descriptor
  throws out of the touchmove handler. Unreachable in normal flow (nav-stack descriptors), unchanged from
  stage 4. Confirm acceptable or wrap the call. Low priority.
- [W16] (partly resolved: `sourceHost`/`destinationHost` re-emitted this build WITH consumers + both
  exact-key gates flipped atomically; **sameBrowseHost half still OPEN**) The stage-6 host field
  `sameBrowseHost` must return to the classification ONLY in the commit that adds its consumer (the abort
  re-render) + test. The exact-key test/gate (`contract-function-gate.test.js`, `CLASSIFICATION_KEYS`)
  remains the tripwire.
- [W18] (open, observation) `changedFiles`/`parseChangedFiles` grammar coupling in `tools/mutation-sweep.mjs`
  (`=v1 -z`). Unrelated to swipe; untouched by 6bf0d20 (pre-existing dirty file). If that command is ever
  parameterized, extend the end-to-end test to pin the exact flags.
- [W20] (open, standing) On-device parity verification for stage 5 (and the whole swipe rewrite arc) is
  owed — everything shipped is SHIPPED-UNVERIFIED on device. The pane transforms are untouched so behaviour
  SHOULD match, but a device pass is owed. Per the standing hold, NOT to be folded into this bench review.
