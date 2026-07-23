# Build log — Swipe/reveal Stage 5 (`buildConstruction` seam) — 2026-07-23

Type: build-log (Brunel)

Built from `Claude/Plans/PLAN-swipe-stage5.md` (APPROVED/RATIFIED) against Curie's red suite
(`Claude/Curie/swipe-stage5-test-design-2026-07-23.md`). Parity is the bar — no behaviour change.

## What was built

- **`js/swipe.js`** — added `Swipe.buildConstruction(from, dest, env)` (the L1 seam) and its private
  pane builders (`ghostApp`/`snapshotHome`/`npPillClone` + the `ghostWrap`/`freezeArt`/`copyScroll`/
  `copyAnimPhase` cluster and per-gesture `GHOST_BG`), relocated from `js/app.js` `start()` behind the
  injected `env`. The builders read the world only through `env` (`env.document`/`env.scrollY`/
  `env.navPill`), never an ambient `document`/`window`/`Element`/`getComputedStyle`. `classifyTransition`
  re-emits `sourceHost`/`destinationHost` with the projection the frozen spec fixes (§3, F1-r).
- **`js/app.js`** — `start()` is now the L3 adapter: it builds `env` (with `renderDestination` = L2,
  the render dispatch staying app-side), calls `buildConstruction`, maps the external movers
  `{element,ownership,slot}` onto production `{el,base,own}` (base 0 / ±d.w by direction), records the
  owned pane's capture onto the session (no `ghostY` synthesized on the home path), records
  `d.clobbered`, and runs the outgoing-NP `np-locked` unlock. The moved builders were deleted; the
  now-unused `isOverlay` alias was removed.

## Contract flips (atomic, same change)

- `test/contract-function-gate.test.js` — registered `buildConstruction` as `NON_CONTRACT`; flipped
  `classifyTransition` keys to the 5-key set.
- `test/swipe-transition.test.js` — flipped `CLASSIFICATION_KEYS` to 5 keys; removed the 2 host-field
  `{ todo }` markers.
- `test/swipe-construction.test.js` — removed the 12 recipe `{ todo }` markers.
- `Claude/Decisions/PolicyLedger.mjs` — removed both stage-5 known-red entries
  (`KR-swipe-stage5-buildconstruction`, `-classify-hosts`).

## Wiring guards added (test-design §3, Brunel's to add)

`test/swipe-stage5-wiring.test.js` (new) — F1b (base geometry/sign), F5b (overlay resolve+render+unhide),
F5c (stale-overlay cleanup), F2-r (home path leaves `d.ghostY` untouched), F7b (row hold precedes the
clobbering render). All green as parity guards; each has a registered mutation that reddens it.

## Mutations (`tools/mutate.mjs`)

- Re-anchored the two existing swipe4 mutations the extraction moved (F1 decoration loop → `js/swipe.js`;
  the classifyTransition return line → 5-field).
- Registered 17 new §8 mutations (recipe/contract in `js/swipe.js`, wiring in `js/app.js`). Every one was
  applied and verified to redden its mapped test, then restored.

## Generated artifacts

- `docs/swipe-model.generated.txt` regenerated (only app.js line-number references moved; the mirrored
  rules/fingerprints are unchanged). `docs/transition-matrix.generated.txt` unchanged (the generator reads
  only `expectedConstruction`/`expectedFinalization`).

## Bench proof

Full suite `node --test "test/*.test.js"`: **680 tests, 678 pass, 0 fail, 2 todo**. The 2 todos are the
pre-existing ledger-tracked known-reds (`KR-swipe-scroll-restore`, `KR-swipe-source-rerender`), not
stage-5. All 14 stage-5 `{ todo }` markers are green. Gates green: policy-ledger, contract-function-gate,
transition-matrix, swipe-model, mutation-anchors, lint, build.

## Open / not done

- **Not committed / not deployed** — pending the user's confirmation of the build-number bump
  (`2026-07-23.238` → `.239`, web-only OTA; no APK rebuild) and deploy, per the standing rule.
- Change surface to stage (my work only): `js/swipe.js`, `js/app.js`,
  `test/contract-function-gate.test.js`, `test/swipe-construction.test.js`, `test/swipe-transition.test.js`,
  `test/swipe-stage5-wiring.test.js`, `Claude/Decisions/PolicyLedger.mjs`, `tools/mutate.mjs`,
  `docs/swipe-model.generated.txt`, and this build log. NOT the pre-existing unrelated dirty files
  (`.gitignore`, `tools/mutation-sweep.mjs`, `test/mutation-sweep-select.test.js`, `Claude/Plans/_probe.md`).
- Next: hand to Poirot (code review) and Mendeleev (suite audit against §8, incl. Loki R2 —
  `test/swipe-invariants.test.js` as the unenumerated parity guard).
