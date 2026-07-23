# Loki strike — PLAN-swipe-stage5 — 2026-07-23

Verdict: **HELD STONE.** The central parity promise survived every plane constructed against it.
No behaviour-divergence body produced. Two non-blocking residuals named (§Residual).

## 1. Commission

- **Artifact:** `Claude/Plans/PLAN-swipe-stage5.md` (the plan document; the promise is a claim IN the
  plan, so the plan is the artifact, not a pointer — packet accepted, not a bluff).
- **Promise (verbatim, §11):** "Does not change the finalize/settle/reveal path, the diagnostics, or
  any behavior — parity is the bar." Reinforced by the plan's proudest words: "cannot disagree" (§3
  F5), "mutually exclusive" (§3 F1.3), "the home value cannot reach this signature" (§7 F3-r),
  "verified to have no consumer outside the two recipes" (§2), "both update in the same commit" (§3 F2).
- **Readable set (blind until filed):** the plan; HEAD `js/app.js`, `js/swipe.js`, `js/nav.js`,
  `js/browse.js`; `test/swipe-invariants.test.js`. NOT read pre-strike: `Claude/Charpy/PLAN-swipe-stage5-2026-07-22.md`,
  the DecisionLog rationale, the alternatives.
- **Restated as testable behaviour:** for every transition class, the Stage-5 seam (L1 `buildConstruction`
  / L2 `env.renderDestination` / L3 `start()` adapter) must produce byte-identical observable effects to
  HEAD `start()` — same DOM mutations, same `d.movers` shapes, same `d.ghostY/animSync/animRes/clobbered`,
  same ordering. The promise breaks if any constructed input yields a different observable result.
- **Method note:** Stage 5 is unbuilt, so strikes are by construction — a concrete input traced
  step-by-step through the plan's pinned rules (§2–§7) against HEAD's actual code. Factual claims
  (§2 no-consumer, §3 F2 two-sites) were executed by grep/read over HEAD.

## 2. Ask Frigg — the exclusions checked against the promise

| Excluded / deferred (§2, §11) | Does parity silently depend on it? |
|---|---|
| Pane `release()/dispose()/source/equivalence/pin` (Stage 6) | No — consumers are Stage-6 finalization; absent today. |
| Normalized `sameBrowseHost` (Stage 6) | No — Stage 5 keeps the live `d.clobbered` carrier; traced equal (Plane G). |
| Browse hold / `snapBrowse` reveal (Stage 7, stays app-side) | No — L3 runs them before L1, order preserved (Plane F). |
| `GHOST_BG` recomputed fresh-per-gesture (F8) | **DISCLOSED behaviour change**, not hidden — see Residual R1. |

## 3. Planes struck (input → predicted-by-promise vs predicted-by-fracture → result)

**A. Stranded helper (the strongest factual claim).** §2 asserts the moved helper cluster
(`freezeArt`, `copyScroll`, `copyAnimPhase`, `ghostWrap`, `GHOST_BG`, module state `lastAnimResidual`)
"has no consumer outside the two recipes." A left-behind consumer would break at parity.
Instrument: grep HEAD `js/app.js` for every identifier. Result: every reference is inside
`ghostApp`/`snapshotHome` (or their comments). `dataset.sl` (app.js:2926) is a DOM-carried value read
by `copyScroll` off the source node, not a function-call dependency — survives the move via `env.document`.
**Claim holds. Stone unbroken.**

**B. Two owned panes → capture aggregate ambiguity.** §3 F1.3: "app-ghost XOR home-snapshot; mutually
exclusive → `capture` is a single object or null." Traced the branch algebra of `constructionPlanFor`
(swipe.js:128–134): `app-ghost` outgoing requires `toKind==='browse'`; `home-snapshot` incoming requires
`toKind==='home'` — contradiction, cannot co-occur. `home-snapshot` only ever pairs with a `real-source`
(borrowed) outgoing. No transition builds two owned panes. **Exhaustive. Holds.**

**C. np-locked / npPillClone reordering.** HEAD removes `np-locked` from `document.body` BEFORE
`npPillClone()` (app.js:645→646, decorations loop). The plan makes `npPillClone` L1 (inside
`buildConstruction`) and keeps the outgoing-NP unlock in L3 (app.js:645, runs AFTER `buildConstruction`
returns) — a genuine order REVERSAL for the NP-source case. Predicted fracture: the clone captures a
different DOM. Traced: `npPillClone` = `navPill().cloneNode(true)`; `np-locked` sits on `document.body`
(an ancestor), and `cloneNode` copies the cloned subtree's structure/attributes, NOT ancestor classes
or computed style. No synchronous paint occurs between the reversed ops (JS runs to completion first).
Final painted state identical both sides. **Reversal real, effect nil. Holds.**

**D. A third exact-key pinning site (breaks "same commit" atomicity).** §3 F2 claims `classifyTransition`'s
exact-key contract is pinned in exactly two sites, both updated together. A third un-updated site would
redden on build. Instrument: grep `test/` for `classifyTransition|CLASSIFICATION_KEYS|Object.keys`.
Result: exact-key assertions live only at `contract-function-gate.test.js:24` and
`swipe-transition.test.js:57` (+ the frozen spec `swipe-plan-spec.mjs`, which F1-r updates). The fourth
hit, `swipe-invariants.test.js`, matches only in COMMENTS — it asserts behaviour, not key sets. **No
third gate. Holds.** (But see Residual R2.)

**E. `home` reaching `env.renderDestination`.** §7 F3-r: "L2 is never invoked for a home destination."
Traced: `toKind==='home'` ⇒ `incoming='home-snapshot'`, `renderDestination='none'`; HEAD's home branch
(app.js:626–627) calls `snapshotHome()` and never `showAppView`. `home` cannot reach the narrowed
signature. **Holds.**

**F. Ordering: outgoing captured before clobbering render.** HEAD: `snapBrowse` → `takeRowHold` →
`ghostApp` (snapshots pre-render `#browse`) → `showAppView` render (app.js:590–629). Plan §6 pins the
same chain across L3→L1→L2. `ghostApp` clones `.app` (live `document`/`env.document` identical in prod).
**Preserved. Holds.**

**G. `d.clobbered` vs `sourceWasClobbered` (the deepest plane).** HEAD computes
`d.clobbered = !fromOv && appViewEl(fromV) === $('browse')` AFTER the render (app.js:630). The plan
computes `sourceWasClobbered` in `buildConstruction`, with source resolution ordered BEFORE the render
(§6). Predicted fracture: if `Browse.render` REPLACES the `#browse` node, a pre-render source reference
compared to a post-render host would diverge (old node ≠ new node), where HEAD (both sides re-looked-up
post-render) agrees. Traced the actual `render()` (browse.js:475–524) and the mount (`mount: $('browse')`,
app.js:2896): render only `appendChild`s/toggles child `.browsepage` nodes and mutates their `innerHTML`;
it NEVER replaces the element with `id="browse"`. `getElementById('browse')` is node-identity-STABLE
across render. And `appViewEl(v) = (v==='home' ? #home : #browse)` (nav.js:36) returns that same stable
node for every browse-family source. So `appViewEl(fromV) === $('browse')` is invariant in time — the
boolean is the same whether computed before or after the render. **Fracture predicted a divergence; the
node-stability of `#browse` denies it. Holds.**

## 4. Where I would strike next with a bigger budget

The only proof that closes this to certainty is a BUILT-parity differential harness: drive HEAD `start()`
and the Stage-5 `start()` through `test/app-harness.js` across all 8 structural cases + NP-source,
NP-dest, stale-settings-overlay-present, and browse→browse abort, capturing `{d.movers[].{el,base,own},
d.ghostY, d.animSync, d.animRes, d.clobbered}` and the emitted DOM-effect log, and asserting equality.
That is unavailable pre-build. Every plane above is a hand-trace against HEAD, not a running diff — the
residual doubt is exactly the gap a hand-trace cannot close: an effect neither the plan nor I enumerated.

## Residual (non-blocking, routed — not Loki findings)

- **R1 — `GHOST_BG` fresh-per-gesture is a real behaviour change, honestly disclosed (F8).** In the
  no-theme-change common case the value matches; it is not a hidden parity break. If HEAD's top-level
  `GHOST_BG` resolved before CSS `--page-bg` was live, the two differ even without a theme change — worth
  a one-line note in the build report, not a gate.
- **R2 — `test/swipe-invariants.test.js` is an affected parity guard the plan does not enumerate.** Its
  wiring tests drive the exact `npPillClone` and ghost seams Stage 5 moves (lines 79, 108) and MUST stay
  green as parity guards, yet it is absent from the machine-readable `affected_contracts`, §1's records
  table, and §8's mutation matrix. This is coverage-accounting hygiene → route to Charpy (plan
  completeness) / Mendeleev (suite adequacy), not a runtime fracture.

## 5. Reconciliation (rationale read post-strike)

Stayed blind to the Charpy casebook and DecisionLog rationale during the strike; the plan text itself
carries the F-labels, which is proper (the plan is the artifact). No kill entered, so there is no failure
to locate. The one thing that would have changed the strike is access to a BUILT Stage-5 to diff — a
budget limit, not a frame contamination. Strike is uncontaminated: no rationale surface was read before
this record.
