# Plan review — PLAN-swipe-reveal.md stage 5 ("move pane builders into swipe.js")

Type: plan-review

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-reveal.md` §7 step 5, grounded by §3.2,
§3.6, §4.2. Baseline: build `.235`, working tree clean at HEAD `c38c888`. Stage 4 closed.

## Verdict

**TEMPER** — fix-then-build. The end-state architecture (the swipe subsystem's construction in one
module) is sound and buildable. But the step cannot open, for a reason larger than one bad word: the
records that define stage 5 conflict and leave three admissible scopes unresolved, and the step
rests on a dependency seam none of them specifies. The planner must settle five things before a line is written.
None is fatal; the end-state holds. The build is blocked on decisions, not on a broken design.

The five things the planner must resolve:
1. **Scope** — which extraction boundary stage 5 takes, among three (F0): capture recipes only;
   capture recipes plus real host/mover resolution (render dispatch stays in app.js behind injected
   callbacks); or the whole construction boundary including decoration and render dispatch.
2. **Seam** — the exact dependency and result contract of the moved builders (F1). The preferred
   contract returns capture metadata rather than receiving the mutable session (F5).
3. **Host fields** — whether `sourceHost`/`destinationHost` gain a genuine consumer in the chosen
   boundary (F3) — a consequence of the scope choice, not an independent question.
4. **Pane lifecycle** — whether stage 5 begins the §3.6 pane abstraction or explicitly defers
   `release()`/`dispose()` to stage 6, keeping a raw-node or capture-result representation now (F6).
5. **Export + coverage** — the new public surface's export-gate classification (F2) and behavior-level
   recipe + production-wiring tests (F4).

## Defining records

The authorities that specify stage 5, reconciled — verdict: **CONFLICT** (on scope):
- **Plan §7 step 5** — "Move pane builders unchanged into swipe.js" → two capture recipes.
- **`js/swipe.js` header, lines 24–27** — five builders (`ghostApp`/`snapshotHome`/`overlayEl`/
  `appViewEl`/`npPillClone`) plus the render calls → the whole construction boundary.
- **DecisionLog, 2026-07-21** — reintroduce `sourceHost`/`destinationHost` "in the pane/mover
  construction that reads them" → host-based mover resolution.

The three do not agree on what stage 5 moves. That disagreement is finding F0; F1, F3, and F6 are
downstream of it.

## The claim under review

Three records define stage 5, and they do not agree on its scope:
- **Plan §7 step 5** — "Move pane builders unchanged into swipe.js" (narrowest: two capture recipes).
- **`js/swipe.js` header (lines 24–27)** — "the pane BUILDERS (`ghostApp`/`snapshotHome`/`overlayEl`/
  `appViewEl`/`npPillClone`) and the render calls stay in app.js until stage 5 moves them here"
  (broadest: five builders plus the render dispatch — the whole construction boundary).
- **DecisionLog (2026-07-21)** — stage 5 reintroduces `sourceHost`/`destinationHost` "in the stage-5
  pane/mover construction that reads them" (implies stage 5 includes at least real host/mover
  resolution: scope B or C, but does not determine whether render dispatch and decoration also move).

Grounded by the plan's model: §3.6 defines a pane as an object `{ kind, element, source, pin,
equivalence, release(), dispose(reason) }` — "one interface, two recipes" (`app-ghost`,
`home-snapshot`); §3.2 types movers by ownership (`owned-pane` = a ghost/snapshot).

Today `ghostApp()` (app.js:470) and `snapshotHome()` (app.js:564) each `return wrap` — a raw DOM
node, not the §3.6 pane object — and are called only from `start()` (app.js:588), which also does the
real-mover resolution (`fromOv ? overlayEl(fromV) : appViewEl(fromV)`), the destination render
(`showAppView`/`renderScreen`/`renderNowPlaying`), the decoration build (`npPillClone`), and the
`d.movers` assembly. Whether "stage 5" is the two recipes or all of that is exactly the unsettled
scope.

## Assumptions struck against reality

| # | Assumption the step rests on | Struck against | Result |
|---|---|---|---|
| A0 | The three records agree on what stage 5 moves. | plan §7.5, swipe.js:24–27, DecisionLog 2026-07-21 | CRACKED — records conflict, scope unresolved (plan→A, header→C, log→B/C) — see F0 |
| A1 | The builders can move "unchanged." | app.js:470–496, 564–580 | CRACKED — see F1 |
| A2 | `swipe.js` can host impure DOM builders. | test/contract-function-gate.test.js:47–56 | HOLDS with a classified public surface — see F2 |
| A3 | `sourceHost`/`destinationHost` have a stage-5 consumer. | grep of all `*.js`/`*.mjs` | CONDITIONAL on scope (yes under B/C, no under A) — see F3 |
| A4 | Relocation preserves parity (T1–T4, the .207 ordering). | plan §5, app.js:492–495, 575–578 | HOLDS if insertion-before-sync, pruning semantics, and capture diagnostics are preserved — coupling is a separate concern, see F5 |
| A5 | The wiring seam is covered so a mis-wire reddens. | §4.11 gate + app-harness (.228 F1 law) | UNSTATED for stage 5 — see F4 |
| A6 | Stage 5's pane representation is defined. | app.js:496, 579 (both `return wrap`) | UNSTATED — plan does not say whether stage 5 delivers the §3.6 pane object or a capture-result; see F6 |

## Findings

### F0 — Structural — open-unknown — conflicting records leave three admissible Stage-5 scopes unresolved

The scope of stage 5 is not settled, because its three defining records disagree (see "The claim
under review"): plan §7.5 says two capture recipes; the `swipe.js` header says five builders plus the
render dispatch (the whole construction boundary); the DecisionLog's host-field reintroduction implies
host-based mover resolution. This is the root finding — F1, F3, and F6 are all downstream of it. The
records conflict and leave the extraction boundary unresolved: the plan specifies the narrow A
boundary, the `swipe.js` header the broad C boundary, and the DecisionLog requires at least host/mover
resolution — therefore permitting B or C but conflicting with A. It does NOT uniquely specify B. The
planner must explicitly select one of the three admissible boundaries:

- **A — capture recipes only.** Move `app-ghost` and `home-snapshot`; leave real-mover resolution
  (`overlayEl`/`appViewEl`), decoration, and render dispatch in app.js. No host-field reader under this
  scope, so do NOT reintroduce them (F3).
- **B — capture recipes plus host/mover resolution.** Move the recipes AND real host resolution, so
  `sourceHost`/`destinationHost` gain a genuine consumer (F3); leave application rendering in app.js
  behind injected callbacks. This middle boundary may be the cleanest stage 5 — it delivers the
  host-field consumer the DecisionLog wants without pulling render dispatch across the seam — but it is
  the planner's call, not a finding.
- **C — the whole construction boundary.** Move recipes, host resolution, decoration building, and
  destination-render dispatch. Largest single-review blast radius; matches the `swipe.js` header's
  stated intent.

The middle boundary was silently dropped in the first version of this finding; all three are
admissible. Whichever is chosen, the records that do not match it are scrubbed
(StandardsDocument §6.6): plan step, swipe.js header, and DecisionLog must state one scope, not three.

### F1 — Structural — open-unknown — "unchanged" is not compilable; the dependency seam is unspecified

`ghostApp()` and `snapshotHome()` reference identifiers that live in app.js's closure and do not
exist in `swipe.js`: `freezeArt` (app.js:376), `ghostWrap` (app.js:464), `copyScroll` (app.js:382),
`copyAnimPhase` (app.js:419), `lastAnimResidual` (app.js:418), the session object `d`, and the `$`
element resolver. Moved verbatim, every one is an unbound reference.

So "unchanged" cannot be literal. The step is a behaviour-preserving relocation behind a dependency
seam the plan does not specify (the open W8 question). It is a genuine open unknown, not a defect to
patch — the plan must resolve it, not the builder mid-flight. The requirement filed is that the step
answer, before a line is written: which helper functions move with the builders; which dependencies
are injected; what each builder accepts; what it returns; and where the capture diagnostics (`ghostY`,
`animSync`, `animRes`) are recorded. The shape (inject deps / relocate the helper cluster / minimal
move with args) is the planner's call; F5 states the preferred contract (return capture, not the
session).

### F2 — Structural — requirement — stage 5's new public surface must be classified by the export gate and covered

`test/contract-function-gate.test.js` (§4.11) requires every export of `js/swipe.js` to be either a
registered exact-keyed deep-immutable contract factory or listed in `NON_CONTRACT` with a reason
(lines 47–56). Whatever public surface stage 5 adds must satisfy that gate. The requirement is the
surface being classified and covered — not a specific export shape: individual `ghostApp`/
`snapshotHome` exports (each a `NON_CONTRACT` entry) is one option; a single `createPaneBuilders(deps)`
factory, an `init(deps)` plus builder methods, or one construction function keeping the recipes private
are equally admissible, and each classifies differently. The step must name its chosen surface and its
gate classification. The gate checks only classification and contract-factory properties — it never
proves DOM-builder behaviour — so the builders' behaviour is carried by the separate recipe and
production-wiring tests F4 requires, whatever the surface shape.

Note: `swipe.js` is `require()`d in a no-DOM node context (the gate loads it directly). Builders that
touch `document`/`window` only inside their bodies are safe at module-load; a top-level DOM reference
introduced by the move would break every `swipe.js` unit test. The step must keep DOM access lazy.

### F3 — Structural — conditional — the host fields are a scope inconsistency, not proven-dead

No file reads `sourceHost` or `destinationHost` today (grep, all `*.js`/`*.mjs`); `.229` removed them
for exactly that reason. But this does not prove they lack a valid stage-5 consumer — stage 5 may be
the change that *creates* their first reader. Under scope B or C (F0), the moved boundary replaces the
raw branching `fromOv ? overlayEl(fromV) : appViewEl(fromV)` and the `#browse`/overlay destination
selection with host resolution driven by `sourceHost`/`destinationHost` — a genuine consumer, in the
same commit that reintroduces the fields. Under scope A, that resolution stays in app.js and the fields
have no reader, so reintroducing them recreates the dead field `.229` removed.

So the fields are dead *only under scope A*. The defect is not "the fields are dead" — it is that the
records collectively leave three possible extraction boundaries unresolved while the DecisionLog
unconditionally promises the fields. Resolving
F0 resolves this: under B or C, name the resolution line that reads each host; under A, drop the
host-field reintroduction from stage 5 and correct the DecisionLog. (The `d.clobbered` read at
app.js:630 is `sameBrowseHost`, assigned to stage 6 under every scope.)

### F4 — Structural — requirement — the wiring seam's coverage obligation is unstated for stage 5

After the move, `start()` (or the moved construction owner) calls the moved builder instead of a local
function. The `.228` F1 law (DecisionLog): proving the builder exists and is correct in `swipe.js` is
not proving the production path selects and wires the right one — a wiring mutation must redden an
app-harness test. Stage 5 therefore owes two coverage layers: recipe-level tests for the clone/capture
behaviour, and a production-wiring test proving the construction plan selects the correct recipe and
that **its element participates in the production mover set with the correct ownership and ordering**.
Stated as that invariant, not as an internal shape — under scope C `swipe.js` may return the completed
mover collection and `start()` may never assemble `d.movers` directly, and the test must survive that
legitimate relocation. (One concrete pair: a browse-destination swipe builds the ghost from the moved
builder; an overlay-source back-swipe builds none — illustrative, not the only acceptable scenarios.)
This is required because the contract-function gate can only classify the public surface and check
contract-factory properties (F2) — it cannot prove DOM-builder behaviour, so the recipe and
production-wiring tests carry that proof.

### F5 — Structural — recommendation — the seam should not pass the session object `d`; the preferred contract returns capture metadata

The builders today mutate the gesture session directly: `d.ghostY`, `d.animSync`, `d.animRes`
(app.js:487, 495, 578). Preserving that by injecting `d` into `swipe.js` would retain the exact
closure coupling the extraction exists to remove, and would let a pane recipe mutate caller-owned
session state. The preferred contract has each builder RETURN its capture, e.g.
`{ element, capture: { scrollY, animationSyncCount, animationResidual } }`, and the construction owner
(`start()`, or the moved construction function) records that onto the session; a narrow telemetry
callback is an acceptable alternative. The seam should not receive or mutate the whole session object
unless the planner explicitly justifies that ownership — this is a design recommendation grounded in
the coupling evidence, not an existing contractual rule. It is a constraint on F1's seam, not a
separate defect, but it is load-bearing: the wrong seam re-couples the module it is meant to decouple.

The parity invariants the relocation must hold, named so they are not lost: `copyAnimPhase`/
`copyScroll` run AFTER the clone is inserted (the `.207` ordering, app.js:492–495, 575–578); pruning
`.hidden`/`.parked` must not test the clone root (snapshotHome's source is `#home.parked`, T2); T3/T4
are iOS compositor/decode hazards.

### F6 — Structural — open-unknown — the plan must state whether stage 5 begins the §3.6 pane abstraction or defers it

§3.6 defines a pane as an object `{ kind, element, source, pin, equivalence, release(), dispose(reason) }`.
Today the builders `return wrap` — a raw DOM node (app.js:496, 579). The plan does not say whether
stage 5 delivers that abstraction or only relocates today's capture behaviour, and the three ways
forward have different costs:

- Return the full pane interface now → `release()`/`dispose()` have no consumer until stage 6
  centralizes finalization and reveal — dead methods, which this project forbids.
- Keep a raw-node or capture-result representation → valid if stage 5 explicitly defers the §3.6
  lifecycle methods to stage 6, regardless of which construction scope A–C is chosen.
- Change cleanup to consume `release()`/`dispose()` now → stage 6 finalization work is pulled forward.

So a raw-node return is not itself a defect; it is a defect only if stage 5 is intended to introduce
the complete §3.6 abstraction. The requirement filed is that the plan STATE which: if lifecycle
ownership stays stage-6 work, stage 5 may retain a raw-node or capture-result representation and
explicitly defer the methods. A partial capture object carrying the fields construction and the I8
equivalence tests consume now (`element`, `source`, `equivalence`, `capture`), with `release()`/
`dispose()` activated in stage 6, is a good phase split — the same shape as `constructionPlanFor()` vs
`finalizationPlanFor()` — but one valid option, not the only one. What is not admissible is leaving it
unstated, so the implementation invents the boundary while coding — the failure the rewrite exists to
stop.

## Prediction — where this breaks in execution if built as written

Built from the current records, the builder first has to guess which scope "stage 5" means, because
the records conflict and do not select one extraction boundary — and picks whichever the red module in
front of it makes easiest,
not whichever the plan intended. Then, on the first `node --test`, `freezeArt`/`ghostWrap`/`copyScroll`/
`copyAnimPhase`/`d` come back undefined and a dependency seam is invented on the spot — the exact
decision the plan exists to make deliberately (plan §1). If the improvised seam injects `d` (the
obvious move, since the builders write to it), the extraction relocates code but fails to establish a
clean ownership boundary. Separately the builder either wires a host consumer that the
chosen scope does not actually need (a dead field wearing a use) or leaves the fields unread, and the
pane's `return` shape is decided by whichever of the three §3.6 options costs least that afternoon —
raw node or full interface — with `release()`/`dispose()` either dead or dragging stage-6 work
forward. Every one of these is a boundary the plan could have set and did not; each is visible now, in
the records, and costs a specimen here instead of a build there.

## What passes temper

The end-state architecture is sound: the swipe subsystem's construction belongs in one module, the two
capture recipes are well-defined, and stage 5 rests only on stage 4 (shipped) and the frozen model
(§7.1–2) — no later step gates it. The step is buildable the moment the planner settles the five things
above: the scope (F0, one of three boundaries), the seam contract (F1, preferring returned capture over
the session per F5), the host-field consumer question (F3, a consequence of scope), the pane-lifecycle
now-or-deferred question (F6), and the export classification (F2) plus behaviour-level coverage (F4)
written into the step.
