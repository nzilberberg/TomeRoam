# Test design — Swipe/reveal Stage 5 (`buildConstruction` seam) — 2026-07-23

Type: test-design (Curie)

Realizes the Coverage Model in `Claude/Plans/PLAN-swipe-stage5.md` §8 into a concrete red suite.
Authored red before the build, independently of the implementer (Brunel). The plan is
APPROVED/RATIFIED (Charpy round-3 FORGE, `Claude/Charpy/PLAN-swipe-stage5-2026-07-22-r3.md`) and
the parity promise survived the adversary (`Claude/Loki/PLAN-swipe-stage5-strike-2026-07-23.md`,
HELD STONE), so §8 is a tempered model, not a draft.

## Index
1. What is being proven, and the red-first mechanism
2. The three test layers and how each cell reaches red
3. Cell → test map (every §8 row accounted)
4. The independent oracle for the host fields (F1-r)
5. Files authored / extended
6. Known-red registration (PolicyLedger) and the green-CI contract
7. Handoff to Brunel and Mendeleev
8. Findings routed (model gaps, R2)

## 1. What is being proven, and the red-first mechanism

Stage 5 splits the `start()` construction block (`js/app.js:588-655`) into three layers:
`buildConstruction` (L1, moved into `js/swipe.js` behind an injected `env`), an injected
`env.renderDestination` callback (L2, render dispatch stays app-side), and the `start()` adapter
(L3, geometry + assembly + session recording). Parity is the bar: the seam must produce
byte-identical observable effects to today's `start()`.

Two facts set how each cell reaches red:

- **The L1 seam does not exist yet.** `Swipe.buildConstruction` is unexported and the `env` shape
  is unbuilt. Every test that calls `Swipe.buildConstruction(from, dest, env)` fails today with
  `Swipe.buildConstruction is not a function` — genuine `red-unimplemented`.
- **The host fields are not emitted yet.** Build `.229` removed `sourceHost`/`destinationHost` from
  `classifyTransition` (no consumer then; the no-dead-fields rule). Stage 5 reintroduces them with a
  consumer. A test asserting the 5-key classification / the projected host values fails today because
  only 3 keys are emitted — genuine `red-unimplemented`.

The project expresses red-first as `{ todo }` known-red tests reconciled by
`test/policy-ledger-gate.test.js` against `Claude/Decisions/PolicyLedger.mjs`. That keeps CI green
(node:test runs a `{ todo }` test and reports its failure without failing the run) while the red
target stands. When Brunel builds, each todo goes green (`ok … # TODO`), and Brunel removes the todo
marker and the ledger entry in the same commit. This is the mechanism the stage-2 triage already
used (`test/swipe-model.test.js`).

## 2. The three test layers and how each cell reaches red

| Layer | What it drives | Red-first status |
|---|---|---|
| **recipe** | `Swipe.buildConstruction(from, dest, env)` directly, against a fake `env` whose `document` is a fresh JSDOM of the real `index.html`, with **no ambient** `document`/`window`/`Element`/`getComputedStyle` | `red-unimplemented` (export missing) — the bulk of the new value |
| **contract** | `classifyTransition`'s exact key set + the projected host **values** per registry pair, against the frozen spec | `red-unimplemented` (host fields not emitted) |
| **wiring / regression** | the real `start()` via `test/app-harness.js` | **parity guard, green now**; reddened by the extraction-gone-wrong mutation only after the build. Not dressed as red. |

The recipe layer is where the independent derivation has the most value: the whole point of the
extraction is that the moved builders become drivable through an injected seam with no ambient DOM,
which is exactly what a recipe test asserts and what today's private, app-embedded builders cannot
be tested for.

The wiring/regression cells assert behavior that already passes today (parity). Authoring them as
red would be dressing green as red, which the discipline forbids. Most are already guarded green by
`test/swipe-invariants.test.js` and `test/swipe-transition.test.js`; §3 maps each to its existing
guard or names the post-build mutation that reddens it, and they are **not** part of the red suite.

## 3. Cell → test map (every §8 row accounted)

Layer key: **R**=recipe (new, `{ todo }`), **C**=contract (new, `{ todo }`), **W**=wiring parity
guard (green; existing or noted for the build).

| §8 cell | Claim proved | Test | Layer | Red now? |
|---|---|---|---|---|
| F1.1 shape | `Construction` carries exactly `{classification,plan,movers,capture,sourceWasClobbered}`; movers `{outgoing,incoming,decoration}` | `buildConstruction returns the exact Construction contract shape` | R | yes |
| F1.1 movers | Builder emits external mover shape `{element,ownership,slot}`, never production `{el,base,own}` | `movers carry the external {element,ownership,slot} shape, not the production keys` | R | yes |
| F1c | Overlay↔overlay builds no owned pane ⇒ `capture===null`, both movers `borrowed-real` | `overlay->overlay builds no owned pane: capture is null and both sides are borrowed-real` | R | yes |
| F2-r (recipe) | app-ghost capture has `ghostY`; home-snapshot capture has **no** `ghostY` | `an app-ghost capture carries ghostY; a home-snapshot capture never does` | R | yes |
| F4a | Builder reads `.app`/`#home`/scroll through `env`, drivable with no ambient DOM | `buildConstruction runs with no ambient document/window and builds the pane in env.document` | R | yes |
| F4b | `copyAnimPhase` seeks the clone via `env.document.defaultView.Element`, no global `Element` | `copyAnimPhase syncs animation phase through env's Element, not a global one` | R | yes |
| F6 | `sourceWasClobbered` is true iff the browse-host render overwrites the resolved source | `sourceWasClobbered is true only when the destination render clobbers the source host` | R | yes |
| F7a | Outgoing owned-pane is fully built before `env.renderDestination` is invoked | `the outgoing pane is mounted before env.renderDestination is ever called` | R | yes |
| F8 | No ambient DOM at module load; `GHOST_BG` resolves fresh through `env`, no ambient `getComputedStyle` | `the ghost background resolves through env.getComputedStyle, not an ambient or cached read` | R | yes |
| navGhost | `.nav-ghost` wrapper: fixed full-viewport, beneath bars (z 28), non-interactive, clipped, transform-capable | `the nav-ghost wrapper carries its full fixed/clipped/non-interactive contract` | R | yes |
| npPill | NP recipe removes stale `.np-pill-float`, strips ids, adds the class, appends, yields `owned-decoration`+slot | `the NP pill decoration is cloned, stripped, classed, and slotted by endpoint` | R | yes |
| freezeArt | Both recipes strip `img[data-art]` before the clone connects to the live document | `both owned-pane recipes strip data-art before the clone is mounted` | R | yes |
| F2 | `classifyTransition` keys are exactly `[decorations,destinationHost,fromKind,sourceHost,toKind]` | `classifyTransition emits exactly the five stage-5 fields including the two hosts` | C | yes |
| F1-r | The host **values** match the projection at every registry pair, pinned in the frozen spec | `every registry pair projects the sourceHost/destinationHost the frozen spec fixes` | C | yes |
| F1a | Production movers keyed `{el,base,own}` after L3 maps | existing: `WIRING — an overlay-source back-swipe moves the real overlay and builds NO ghost` guards the outgoing seam; add build-time wiring for the key mapping | W | no (parity) |
| F1b | Outgoing `base===0`, incoming `base===±d.w` signed | build-time wiring (mutation: wrong base owner/sign) | W | no (parity) |
| F5a | Payload descriptor reaches L2 render intact | existing: `supersession CONTROL — the mid-drag render really does put the destination in #browse` + build-time payload wiring | W | no (parity) |
| F5b | Overlay transition preserves resolve+render+unhide+incoming-`np-locked` | build-time wiring (mutation: old overlay-branch effect omitted) | W | no (parity) |
| F5c | Browse-host transition with a stale settings overlay present ends with correct host state | build-time wiring (mutation: stale-overlay cleanup dropped) | W | no (parity) |
| F2-r (wiring) | back→home records `animSync`/`animRes`, `d.ghostY` untouched | build-time wiring (mutation: L3 synthesizes `d.ghostY` on the home path) | W | no (parity) |
| F7b | `revealBase`+Browse hold precede the clobbering render | existing invariants cover the reveal/hold seam; build-time ordering wiring | W | no (parity) |
| npLock | Incoming/outgoing NP transitions preserve `np-locked` removal | existing: `WIRING — an NP-source back-swipe builds the Now Playing pill mover` guards the NP seam | W | no (parity) |
| willChange | Real `#home`/`#browse` movers gain no new `will-change` | existing: `I5 — after a settled swipe no real view carries an inline transform/transition` | W | no (parity) |
| parking | Initial mover parking retained (parity only) | existing invariants; parity-only | W | no (parity) |

The W rows are parity guards. The build must keep them green; each names the mutation that reddens
it once L1/L2/L3 exist. They are Brunel's to add against real code where no existing guard covers the
cell (F1b, F5b, F5c, F2-r-wiring, F7b), and Mendeleev audits that coverage. Curie does not author a
green test as a red one.

## 4. The independent oracle for the host fields (F1-r)

`test/fixtures/swipe-plan-spec.mjs` `STRUCTURAL_CASES` gains an `expectedHosts` field per case —
hand-written declarative data, the §4.14 independent oracle, never derived from production. The
projection (plan §3):

- `sourceHost = fromKind === 'overlay' ? 'overlay' : 'in-flow'`
- `destinationHost = toKind === 'overlay' ? 'overlay' : toKind === 'browse' ? 'browse-host' : 'home'`

The per-pair contract test loops the whole registry (as the existing construction proof does) and
asserts `classifyTransition`'s hosts equal the projected `expectedHosts` for the pair's kind. It is
`{ todo }` until the fields are emitted. `expectedHosts` is inert data until then: the generator
(`tools/gen-transition-matrix.mjs`) reads only `expectedConstruction`/`expectedFinalization`, so the
committed inventory and its fingerprint gate are unchanged (precedent: `expectedFinalization`).

## 5. Files authored / extended

- **`test/swipe-construction.test.js`** (new) — the recipe suite, all `{ todo }`. Builds `env` from a
  fresh JSDOM of the real `index.html` (dom-fixture doctrine: never a hand-rolled DOM) and poisons
  ambient `document`/`window`/`Element`/`getComputedStyle` so an ambient read reddens.
- **`test/fixtures/swipe-plan-spec.mjs`** (extended) — `expectedHosts` per structural case.
- **`test/swipe-transition.test.js`** (extended) — the two contract `{ todo }` tests (F2, F1-r).
- **`Claude/Decisions/PolicyLedger.mjs`** (extended) — two known-red entries (§6).

Not touched, by design (Brunel's atomic build-commit edits, so a green CI gate never sits red):
`test/contract-function-gate.test.js` (registers `buildConstruction` as `NON_CONTRACT`; flips
`classifyTransition` to the 5-key set) and the existing 3-key `CLASSIFICATION_KEYS` assertion in
`test/swipe-transition.test.js` (flips to 5 keys). These must change exactly when the code emits 5
keys; changing them now would sit a per-push gate red for no behavioral reason.

## 6. Known-red registration (PolicyLedger) and the green-CI contract

Two entries, each listing all its todo test names so the policy-ledger gate reconciles:

- **`KR-swipe-stage5-buildconstruction`** — the twelve recipe tests. Decision: the L1 `buildConstruction`
  seam and its `env` contract are specified and pinned red before the build. RemovalTrigger: Brunel
  builds `Swipe.buildConstruction`; the tests go green; entry removed.
- **`KR-swipe-stage5-classify-hosts`** — the two contract tests. Decision: `classifyTransition` must
  re-emit `sourceHost`/`destinationHost` with the projected values. RemovalTrigger: Brunel emits the
  host fields (and updates the exact-key gates atomically); the tests go green; entry removed.

Green-CI contract: after this suite lands, `fail` stays 0 and `todo` rises by 14; the policy-ledger
gate stays green (every todo declared); the transition-matrix fingerprint gate stays green
(generator output unchanged).

## 7. Handoff to Brunel and Mendeleev

- **Brunel (build to green):** implement `Swipe.buildConstruction(from, dest, env)` and the `env`
  seam to the plan §3/§7 contract; the red suite says exactly what "working" means. In the same
  commit: register `buildConstruction` as `NON_CONTRACT`; flip `classifyTransition` to the 5-key set
  in `contract-function-gate.test.js` and `CLASSIFICATION_KEYS`; remove the todo markers and the two
  PolicyLedger entries as each goes green; add the W-row wiring guards (F1b, F5b, F5c, F2-r-wiring,
  F7b) against the real `start()`; register the §8 mutations in `tools/mutate.mjs`.
- **Mendeleev (audit coverage):** sweep this suite against §8; confirm every applicable cell is a red
  test or a mapped green guard, and that the W rows are genuinely guarded post-build.

## 8. Findings routed (model gaps, R2)

- **No Coverage-Model gap found.** The plan §3/§7 fully specify the `env` shape, the `Construction`
  return, the kind→host projection, the two capture shapes, and the ordering contract — every recipe
  and contract cell was authorable without inventing coverage.
- **R2 (Loki residual) — confirmed at the test layer, routed.** `test/swipe-invariants.test.js` drives
  the exact `npPillClone`/ghost seams Stage 5 moves (its `.np-pill-float` and `.nav-ghost` wiring
  guards) and MUST stay green as parity guards, yet it is absent from the plan's machine-readable
  `affected_contracts`, §1 records table, and §8 mutation matrix. This is coverage-accounting, not a
  runtime fracture; Loki routed it to Charpy (plan completeness) / Mendeleev (suite adequacy). Curie
  records it here and does not invent around it.
- **R1 (Loki residual) — not a test-author concern.** `GHOST_BG` fresh-per-gesture is a disclosed
  behavior change; the recipe F8 test asserts the fresh-through-env resolution the plan specifies.
