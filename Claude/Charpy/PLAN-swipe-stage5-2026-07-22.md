# Plan review — PLAN-swipe-stage5.md ("resolve the five Stage-5 questions; scope B")

Type: plan-review

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (Vitruvius's resolution of F0/F1/F3/
F6 + F2/F4/F5 from `Claude/Charpy/PLAN-swipe-reveal-stage5-2026-07-22.md`). Grounded against HEAD:
`js/swipe.js`, `js/nav.js`, `js/app.js`, `test/contract-function-gate.test.js`, `test/app-harness.js`.

## Verdict

**TEMPER** — fix-then-build. The end-state and the scope decision hold: scope B is justified and was
checked against later-stage ownership; the five capture helpers relocate cleanly; the no-session
return-capture design is right; the lifecycle deferral (§5) correctly avoids the dead-field trap F6
named; and the `NON_CONTRACT` classification of `buildConstruction` is sound. But the seam contract
this plan exists to close — the prior review's F1 — is not fully closed: §5's returned pane shape is
not reconciled with the real `d.movers` consumer shape, and one of its fields (`base`) cannot be
produced from the seam §3 grants. Separately, adding the host fields (§4) silently changes the
exact-key contract of two functions the export gate pins. Three things to settle before a line is
written; none shatters scope B.

## Defining records

The authorities that specify Stage 5, reconciled — verdict: **CONFLICT (unchanged at HEAD), with this
sub-plan as the proposed resolution to B**:
- **`PLAN-swipe-stage5.md`** (this sub-plan) — scope B; the artifact under review.
- **`PLAN-swipe-reveal.md` §7 step 5** — still reads "move pane builders" (boundary A). To be
  rewritten to B on approval (this plan §8).
- **`js/swipe.js` header, lines 24–27** — still lists five builders + render calls (boundary C). To be
  rewritten to B on approval (§8).
- **DecisionLog 2026-07-21** — promises `sourceHost`/`destinationHost` reintroduced "in the pane/mover
  construction that reads them" (B or C). To be settled to B on approval (§8).

The three prior records still conflict at HEAD; the plan does not scrub them now, correctly deferring
the scrub to approval per §8 and StandardsDocument §6.6 (a record is not reconciled to an unapproved
decision). That deferral is proper, not a finding. The conflict is resolved the moment B is approved.

## Assumptions struck against reality

| # | Assumption | Struck against | Result |
|---|---|---|---|
| A1 | The five capture helpers are used ONLY by the two recipes, so they relocate cleanly. | grep of `js/app.js` for `ghostWrap`/`freezeArt`/`copyScroll`/`copyAnimPhase`/`lastAnimResidual` | HOLDS — `freezeArt` 480/567, `copyScroll` 492/575, `copyAnimPhase` 494/577, `ghostWrap` 489/570, `lastAnimResidual` 460/495/578; no other caller. |
| A2 | `Nav.overlayEl`/`Nav.appViewEl` exist and resolve source elements. | nav.js:35–36, app.js:109–110 | HOLDS — real Nav members; the env wrappers are backed. |
| A3 | `buildConstruction` as `NON_CONTRACT` satisfies the gate without an immutability check on its live-DOM return. | contract-function-gate.test.js:47–58 | HOLDS — the exact-key/deep-immutable loop iterates `CONTRACT` only (line 58); `NON_CONTRACT` gets the classification check only (47–56). |
| A4 | The stage-6/7 surfaces B leaves in app.js are real and injectable. | app.js:339 (`Browse.beginHold`), 557 (`Browse.render`), 2892 (`renderBrowse` injected into Nav) | HOLDS — all three exist; the injected-callback precedent is real. |
| A5 | The pane shape `{ element, base, ownership, capture }` carries only fields with a Stage-5 production consumer, producible by `buildConstruction`. | app.js:620–646 (mover build), 654/675/708/716/797/1313 (consumers) | CRACKED — `base` is not producible from §3's seam; field names differ from the consumers — see F1. |
| A6 | `classifyTransition` can emit `sourceHost`/`destinationHost` while it "remains a contract function." | contract-function-gate.test.js:22–33 | CRACKED — the gate pins its exact keys; emitting two new fields reddens it unless the registration is updated — see F2. |
| A7 | The host fields gain a genuine (non-redundant) consumer under B. | nav.js:35–36; swipe.js:79–99, 115–138 | CONDITIONAL — host is a pure function of kind, already carried by `fromKind`/`incoming`/`renderDestination`; the "consumer" is existing kind-logic rerouted — see F3. |

## Findings

### F1 — Structural — open-unknown — the returned pane shape is not reconciled with the `d.movers` consumers, and `base` cannot be produced from the seam

§5 states `buildConstruction` returns movers whose panes are `{ element, base, ownership, capture }`.
Two parts of that do not connect to the code:

1. **`base` is not producible from §3's inputs.** Today `base` is a pixel value: `0` for the outgoing
   mover and `off` for the incoming, where `off = d.dir === 'back' ? -d.w : d.w` (app.js:592, with
   `d.w = window.innerWidth`). The consumers depend on it being that number: `if (m.base)`
   (app.js:654) and `m.base === 0 ? outTo : inTo` (app.js:708) both break if `base` is a semantic
   string. But `buildConstruction(plan, env)` is handed neither direction nor width — `plan`
   (`constructionPlanFor` output = `{outgoing, incoming, renderDestination, decorations}`, swipe.js:137)
   carries neither, the enumerated `env` (§3) carries neither, and the no-session rule (§3/F5) bars
   passing `d`, which is where both live. So `buildConstruction` cannot compute the pixel `base`, and
   it cannot emit a semantic `base` without breaking app.js:654/708.

2. **The field names differ from every consumer.** Production movers are `{ el, base, own }`
   (app.js:620–646); `el` and `own` are read across the drag, settle, and teardown path — app.js:654,
   675, 701, 708, 716, 740–746, 795–798, 843–844, 867, 1313. §5's `element`/`ownership` are a rename.
   That path is stage-6-owned, and §10 states this plan "does not change the finalize/settle/reveal
   path" — so a rename contradicts §10, and keeping `el`/`own` contradicts §5.

The unresolved question the plan must state: does `start()` attach `base` (and `ownership`) after
`buildConstruction` returns `{ element/el, capture }`, or does `buildConstruction` receive a geometry
input the seam does not currently grant — and are the mover fields `el`/`own` (no rename) or
`element`/`ownership` (a rename whose scrub of app.js:654–1313 must then be owned here, not deferred to
stage 6)? This is the exact seam contract (F1 in the prior review) the rewrite exists to make
deliberately; §5 asserts a shape §3 cannot deliver.

### F2 — Structural — requirement — adding the host fields changes two pinned exact-key contracts the plan does not update

§4 and §7 have `classifyTransition` "additionally emit `sourceHost` and `destinationHost`." The
contract-function gate pins `classifyTransition`'s output to exactly `['decorations','fromKind',
'toKind']` (contract-function-gate.test.js:24) and asserts the key set is exact (line 66). Emitting two
new fields reddens that assertion unless `CONTRACT.classifyTransition.keys` is updated in the same
commit. §6 says both functions "remain CONTRACT functions (exact-keyed, deep-immutable)" without noting
this registration change — the plan must require the gate's key list be updated with the fields, and
(they being strings) they enter the exact-key set and the deep-immutable graph.

A second consequence is unstated: `buildConstruction` reads the host fields (§4), but its structured
input is `constructionPlanFor` output (§3), which does not carry them (swipe.js:137). Either
`constructionPlanFor` must forward `sourceHost`/`destinationHost` into its output — changing ITS pinned
key set too (test:30) — or `buildConstruction` must also receive the classification `c`. The plan must
state which; as written the field is emitted on the classification and read two hops away with no path
between.

### F3 — Weak — requirement — the host fields' "genuine consumer" resolves to kind-logic rerouted through a renamed field

Under B the plan gives `sourceHost`/`destinationHost` a consumer by driving source/destination
resolution from them (§4). Struck against the code, the fields carry no information kind does not:
`appViewEl`/`overlayEl` split on overlay-vs-in-flow (nav.js:35–36), which is exactly `fromKind ===
'overlay'`; and the destination split (home-snapshot / browse-host / real-destination overlay) is
already fully carried by `plan.incoming` + `plan.renderDestination` (swipe.js:127–129, consumed at
app.js:626–637). So `destinationHost` duplicates a split the plan object already encodes, and
`sourceHost` equals `fromKind`. The "genuine consumer" F0-B rests on is existing kind-logic rerouted
through a new field name.

This is conditional on the DecisionLog decision (which unconditionally promised the fields), so it is a
requirement on the plan, not an established defect: before reintroducing them, show a case where equal
`fromKind`/`toKind` implies a different host (host carries information kind does not) — otherwise
resolve source/destination from the existing `fromKind`/`incoming`/`renderDestination` and supersede
the DecisionLog's host-field promise as part of the §8 reconciliation. Reintroducing a field whose only
reader is logic that already had the information satisfies the letter of the no-dead-fields rule while
recreating the redundancy `.229` removed.

### F4 — Weak — requirement — the seam's external-read set is incomplete: the recipes read `window`, which `env` does not expose

The prior review's F1 required the step to state "what each builder accepts." §3 enumerates `env`
(`document`, `sourceEl`, `destOverlayEl`, `browseHost`, `renderDestination`, `navPill`) but the
recipes also read the window: `ghostApp` reads `window.scrollY` for `ghostY` (app.js:486) and `base`
needs `window.innerWidth` (F1). These are reachable via `env.document.defaultView`, so this is a
completeness gap, not a wall — but the seam is not fully specified until the recipes' entire
external-read set is named, `window` included. State it so the builder does not reach for a global the
`require()`-in-Node gate (contract-function-gate.test.js:15) would then trip at module scope.

## Prediction — where this breaks in execution if built as written

The builder relocates the two recipes cleanly (A1 holds) and wires `buildConstruction` — then hits the
return shape. `d.movers` transforms read `m.el`/`m.base` (app.js:654, 675) while the plan handed back
`element`/`base`, so either the drag does nothing or the builder invents the el↔element mapping and the
0-vs-`off` geometry on the spot — the exact F1 improvisation the rewrite exists to prevent, now landing
inside the finalize path §10 promised to leave alone. In parallel, the first `node --test` reddens the
contract gate the moment `classifyTransition` emits the host fields, because its key set is pinned
(test:24) and the plan never updated the registration. Both are visible now, in the records and the
gate, and cost a specimen here rather than a half-built stage-5 there.

## What passes temper

Scope B is sound and was genuinely checked against later-stage ownership: the render dispatch
(app.js:557) and Browse hold (app.js:339) it leaves in app.js are the surfaces stage 7 reworks, and
`renderBrowse` is already injected into Nav (app.js:2892), so the callback pattern is precedented (A4).
The five capture helpers are used only by the two recipes and relocate without breaking another caller
(A1). The no-session return-capture contract (§3/F5) is the right decoupling. The lifecycle deferral
(§5) correctly withholds `release()`/`dispose()`/`equivalence` until stage 6 consumes them, avoiding
the dead-field error F6 caught. And `buildConstruction` as `NON_CONTRACT` is correct: the gate's
immutability loop runs on `CONTRACT` only (A3), so a live-DOM return is not falsely held to the frozen
contract. The step is buildable once F1 (the return shape and who owns `base`), F2 (the pinned
key-set updates), and F3 (the host fields' non-redundancy or their removal) are settled.
