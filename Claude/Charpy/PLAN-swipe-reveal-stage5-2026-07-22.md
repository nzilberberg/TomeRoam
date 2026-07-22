# Plan review — PLAN-swipe-reveal.md stage 5 ("move pane builders into swipe.js")

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-reveal.md` §7 step 5, grounded by §3.2,
§3.6, §4.2. Baseline: build `.235`, working tree clean at HEAD `c38c888`. Stage 4 closed.

## Verdict

**TEMPER** — fix-then-build. The end-state architecture (the swipe subsystem's construction in one
module) is sound and buildable. But the step cannot open, for a reason larger than one bad word: the
three records that define stage 5 authorize three different scopes, and the step rests on a
dependency seam none of them specifies. The planner must settle four questions before a line is
written (F0–F3 below). None is fatal; the end-state holds. The build is blocked on decisions, not on
a broken design.

The four questions the planner must resolve:
1. **Scope** — does stage 5 move only the two capture recipes, or the whole mover-construction
   boundary (real host resolution + decoration building + render dispatch)? (F0)
2. **Seam** — the exact dependency and return-value contract of the moved builders. (F1)
3. **Host fields** — whether and where `sourceHost`/`destinationHost` gain a real consumer, which is
   a consequence of the scope choice, not an independent question. (F3)
4. **Pane interface** — how §3.6's pane object (`release()`/`dispose()`) is phase-split so stage 5
   adds no dead method and pulls no stage-6 finalization forward. (F6)

## The claim under review

Three records define stage 5, and they do not agree on its scope:
- **Plan §7 step 5** — "Move pane builders unchanged into swipe.js" (narrowest: two capture recipes).
- **`js/swipe.js` header (lines 24–27)** — "the pane BUILDERS (`ghostApp`/`snapshotHome`/`overlayEl`/
  `appViewEl`/`npPillClone`) and the render calls stay in app.js until stage 5 moves them here"
  (broadest: five builders plus the render dispatch — the whole construction boundary).
- **DecisionLog (2026-07-21)** — stage 5 reintroduces `sourceHost`/`destinationHost` "in the stage-5
  pane/mover construction that reads them" (implies host-based mover resolution, i.e. the broad scope).

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
| A0 | The three records agree on what stage 5 moves. | plan §7.5, swipe.js:24–27, DecisionLog 2026-07-21 | CRACKED — see F0 |
| A1 | The builders can move "unchanged." | app.js:470–496, 564–580 | CRACKED — see F1 |
| A2 | `swipe.js` can host impure DOM builders. | test/contract-function-gate.test.js:47–56 | HOLDS with a classified public surface — see F2 |
| A3 | `sourceHost`/`destinationHost` have a stage-5 consumer. | grep of all `*.js`/`*.mjs` | CONDITIONAL on scope — see F3 |
| A4 | Relocation preserves parity (T1–T4, the .207 ordering). | plan §5, app.js:492–495, 575–578 | HOLDS only if the seam does NOT pass `d` and preserves insertion-then-sync — see F5 |
| A5 | The wiring seam is covered so a mis-wire reddens. | §4.11 gate + app-harness (.228 F1 law) | UNSTATED for stage 5 — see F4 |
| A6 | Builders return the §3.6 pane object. | app.js:496, 579 (both `return wrap`) | CRACKED — today they return a raw node; see F6 |

## Findings

### F0 — Structural — three records authorize three different scopes for stage 5

The scope of stage 5 is not settled, because its three defining records disagree (see "The claim
under review"): plan §7.5 says two capture recipes; the `swipe.js` header says five builders plus the
render dispatch (the whole construction boundary); the DecisionLog's host-field reintroduction implies
host-based mover resolution, which only exists under the broad scope. This is the root finding — F1,
F3, and F6 are all downstream of it. The planner must choose explicitly between two defensible shapes,
because the records currently authorize both:

- **Narrow stage 5** — move only the `app-ghost` and `home-snapshot` capture recipes; leave real-mover
  resolution (`overlayEl`/`appViewEl`) and the render dispatch in app.js; do NOT reintroduce the host
  fields (there is no reader under this scope — F3).
- **Construction stage 5** — move the whole mover-construction boundary: real host resolution,
  decoration building, and destination-render dispatch; reintroduce `sourceHost`/`destinationHost`
  because the moved construction genuinely reads them (F3).

Whichever is chosen, the two losing records are scrubbed to match (StandardsDocument §6.6): the plan
step, the swipe.js header, and the DecisionLog must state one scope, not three.

### F1 — Structural — "unchanged" is not compilable; the dependency seam is unspecified

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
move with args) is the planner's call; F5 constrains it (no `d`).

### F2 — Structural — stage 5's new public surface must be classified by the export gate and covered

`test/contract-function-gate.test.js` (§4.11) requires every export of `js/swipe.js` to be either a
registered exact-keyed deep-immutable contract factory or listed in `NON_CONTRACT` with a reason
(lines 47–56). Whatever public surface stage 5 adds must satisfy that gate. The requirement is the
surface being classified and covered — not a specific export shape: individual `ghostApp`/
`snapshotHome` exports (each a `NON_CONTRACT` entry) is one option; a single `createPaneBuilders(deps)`
factory, an `init(deps)` plus builder methods, or one construction function keeping the recipes private
are equally admissible, and each classifies differently. The step must name its chosen surface and its
gate classification, and — because a `NON_CONTRACT` exemption removes a builder from this gate's
coverage — name what covers it instead (F4).

Note: `swipe.js` is `require()`d in a no-DOM node context (the gate loads it directly). Builders that
touch `document`/`window` only inside their bodies are safe at module-load; a top-level DOM reference
introduced by the move would break every `swipe.js` unit test. The step must keep DOM access lazy.

### F3 — Structural — the host fields are a scope inconsistency, not proven-dead

No file reads `sourceHost` or `destinationHost` today (grep, all `*.js`/`*.mjs`); `.229` removed them
for exactly that reason. But this does not prove they lack a valid stage-5 consumer — stage 5 may be
the change that *creates* their first reader. Under the construction scope (F0), the moved boundary
replaces the raw branching `fromOv ? overlayEl(fromV) : appViewEl(fromV)` and the `#browse`/overlay
destination selection with host resolution driven by `sourceHost`/`destinationHost` — a genuine
consumer, in the same commit that reintroduces the fields. Under the narrow scope, that resolution
stays in app.js and the fields have no reader, so reintroducing them recreates the dead field `.229`
removed.

So the fields are dead *only under the narrow scope*. The defect is not "the fields are dead" — it is
that the records authorize both scopes while the DecisionLog unconditionally promises the fields.
Resolving F0 resolves this: if construction scope, name the resolution line that reads each host; if
narrow scope, drop the host-field reintroduction from stage 5 and correct the DecisionLog.
(The `d.clobbered` read at app.js:630 is `sameBrowseHost`, assigned to stage 6 either way.)

### F4 — Structural — the wiring seam's coverage obligation is unstated for stage 5

After the move, `start()` calls the moved builder instead of a local function. The `.228` F1 law
(DecisionLog): proving the builder exists and is correct in `swipe.js` is not proving `start()`
selects and wires the right one — a wiring mutation must redden an app-harness test. Stage 5 therefore
owes two coverage layers: recipe-level tests for the clone/capture behaviour, and a production-wiring
test proving the construction plan selects the correct recipe and that its returned element becomes
the owned mover in `d.movers`. (One concrete pair: a browse-destination swipe builds the ghost from
the moved builder; an overlay-source back-swipe builds none — illustrative of the obligation, not the
only acceptable scenarios.) F2's gate exemption makes this mandatory: it is the coverage the exemption
gives up.

### F5 — Structural — the seam must not pass the session object `d`; builders return capture metadata

The builders today mutate the gesture session directly: `d.ghostY`, `d.animSync`, `d.animRes`
(app.js:487, 495, 578). Preserving that by injecting `d` into `swipe.js` would retain the exact
closure coupling the extraction exists to remove, and would let a pane recipe mutate caller-owned
session state. The seam must instead have each builder RETURN its capture, e.g.
`{ element, capture: { scrollY, animationSyncCount, animationResidual } }`, and the construction owner
(`start()`, or the moved construction function) records that onto the session. A narrow telemetry
callback is an acceptable alternative; passing the whole session object is prohibited. This is a
constraint on F1's seam, not a separate defect — but it is load-bearing, because the wrong seam
re-couples the module it is meant to decouple.

The parity invariants the relocation must hold, named so they are not lost: `copyAnimPhase`/
`copyScroll` run AFTER the clone is inserted (the `.207` ordering, app.js:492–495, 575–578); pruning
`.hidden`/`.parked` must not test the clone root (snapshotHome's source is `#home.parked`, T2); T3/T4
are iOS compositor/decode hazards.

### F6 — Structural — the §3.6 pane interface has no stage-5 phase split

§3.6 defines a pane as an object `{ kind, element, source, pin, equivalence, release(), dispose(reason) }`.
Today the builders `return wrap` — a raw DOM node (app.js:496, 579). Stage 5 hits an unresolved
boundary the plan does not address:

- Return the full pane interface → `release()`/`dispose()` have no consumer until stage 6 centralizes
  finalization and reveal — dead methods, which this project forbids.
- Keep returning raw nodes → stage 5 has not delivered the target pane abstraction.
- Change cleanup to consume `release()`/`dispose()` now → stage 6 finalization work is pulled forward.

The plan needs the same phase split it already uses for `constructionPlanFor()` vs
`finalizationPlanFor()`: stage 5 returns a capture object carrying the fields construction and the I8
equivalence tests consume now (`element`, `source`, `equivalence`, `capture`); `release()`/`dispose()`
are added or activated in stage 6 when finalization becomes their real consumer. Without this, the
implementation invents the boundary while coding — the failure mode the whole rewrite exists to stop.

## Prediction — where this breaks in execution if built as written

Built from the current records, the builder first has to guess which scope "stage 5" means, because
three records answer differently — and picks whichever the red module in front of it makes easiest,
not whichever the plan intended. Then, on the first `node --test`, `freezeArt`/`ghostWrap`/`copyScroll`/
`copyAnimPhase`/`d` come back undefined and a dependency seam is invented on the spot — the exact
decision the plan exists to make deliberately (plan §1). If the improvised seam injects `d` (the
obvious move, since the builders write to it), the module stays coupled to the session and the
extraction achieves nothing structural. Separately the builder either wires a host consumer that the
chosen scope does not actually need (a dead field wearing a use) or leaves the fields unread, and the
pane's `return` shape is decided by whichever of the three §3.6 options costs least that afternoon —
raw node or full interface — with `release()`/`dispose()` either dead or dragging stage-6 work
forward. Every one of these is a boundary the plan could have set and did not; each is visible now, in
the records, and costs a specimen here instead of a build there.

## What passes temper

The end-state architecture is sound: the swipe subsystem's construction belongs in one module, the two
capture recipes are well-defined, and stage 5 rests only on stage 4 (shipped) and the frozen model
(§7.1–2) — no later step gates it. The step is buildable the moment the planner settles the four
questions (F0 scope, F1 seam, F3 host-field consumer, F6 pane-interface split), writes F2's classified
surface and F4's two coverage layers into it, and constrains the seam per F5.
