# Plan review — PLAN-swipe-reveal.md stage 5 ("move pane builders into swipe.js")

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-reveal.md` §7 step 5, grounded by §3.2,
§3.6, §4.2. Baseline: build `.235`, working tree clean at HEAD `c38c888`. Stage 4 closed.

## Verdict

**TEMPER** — fix-then-build. The stage's architecture is sound and buildable: the swipe
subsystem's construction belongs in one module, the two pane recipes are that module's, and there
is exactly one consumer (`start()`) so the seam is clean. But the step as written rests on one word
— "unchanged" — that is false against the code, and on one DecisionLog promise that has no consumer
in reality. Both must be resolved by the planner before the build opens. Neither is fatal; the
central claim holds.

## The claim under review

Step 5 (§7): "Move pane builders unchanged into swipe.js." Grounded by the plan's model:
- §3.6 — panes are "one interface, two recipes": `app-ghost` and `home-snapshot`.
- §3.2 — movers are typed by ownership; `owned-pane` is a ghost/snapshot.
- DecisionLog (2026-07-21) — stage 5 additionally reintroduces `sourceHost`/`destinationHost`
  into `classifyTransition`, "each with its consumer … the two hosts in the stage-5 pane/mover
  construction that reads them."

The two pane builders are `ghostApp()` (app.js:470) and `snapshotHome()` (app.js:564). Both are
called only from `start()` (app.js:588) — single consumer, single seam.

## Assumptions struck against reality

| # | Assumption the step rests on | Struck against | Result |
|---|---|---|---|
| A1 | The builders can move "unchanged." | app.js:470–496, 564–580 | CRACKED — see F1 |
| A2 | `swipe.js` can host impure DOM builders. | test/contract-function-gate.test.js:47–56 | CRACKED — see F2 |
| A3 | `sourceHost`/`destinationHost` have a stage-5 consumer. | grep of all `*.js`/`*.mjs` | CRACKED — see F3 |
| A4 | Relocation preserves parity (T1–T4, the .207 ordering). | plan §5, app.js:492–495, 575–578 | HOLDS if F1's seam carries `d` and the after-insertion order; a risk to name, not a crack |
| A5 | The wiring seam is covered so a mis-wire reddens. | §4.11 gate + app-harness (.228 F1 law) | UNSTATED for stage 5 — see F4 |

## Findings

### F1 — Structural — "unchanged" is not compilable; the dependency seam is unspecified

`ghostApp()` and `snapshotHome()` reference identifiers that live in app.js's closure and do not
exist in `swipe.js`: `freezeArt` (app.js:376), `ghostWrap` (app.js:464), `copyScroll` (app.js:382),
`copyAnimPhase` (app.js:419), `lastAnimResidual` (app.js:418), the session object `d`, and the `$`
element resolver. Moved verbatim, every one is an unbound reference.

So "unchanged" cannot be literal. The step is a behaviour-preserving relocation behind a dependency
seam, and the plan does not specify the seam. This is the open W8 scope question the board already
carries; it is load-bearing for stage 5 and must be resolved before the build, not during it.

The seam is a genuine open unknown, not a defect to patch — the plan must resolve it, not the
builder mid-flight. Three shapes exist (injected dependencies; relocate the helper cluster too;
minimal literal move with args). The choice is the planner's and the user's; the requirement Charpy
files is that the step name the seam explicitly and state which app.js helpers move, which are
injected, and what the builder's new signature is — before a line is written.

### F2 — Structural — impure builders as `swipe.js` exports trip the export meta-gate

`test/contract-function-gate.test.js` (§4.11) requires every export of `js/swipe.js` to be either a
registered exact-keyed deep-immutable contract factory or listed in `NON_CONTRACT` with a reason
(lines 47–56). The pane builders are neither: they return live DOM nodes, not frozen contract
objects. The step must state that the builders are exported-but-exempt `NON_CONTRACT` entries, and —
because that exemption removes them from the gate's coverage — must name what covers them instead
(F4). A move that reddens this gate blocks its own build.

Note: `swipe.js` is `require()`d in a no-DOM node context (the gate loads it directly). Builders that
touch `document`/`window` only inside their bodies are safe at module-load; a top-level DOM reference
introduced by the move would break every `swipe.js` unit test. The step must keep DOM access lazy.

### F3 — Structural — `sourceHost`/`destinationHost` have no consumer; reintroducing them resurrects a dead field

No file reads `sourceHost` or `destinationHost` (grep, all `*.js`/`*.mjs`). `start()`'s construction
uses `fromOv` (`isOverlay`), `appViewEl(fromV)`, `overlayEl(fromV)`, and `$('browse')` directly. The
one host-shaped read — `d.clobbered = !fromOv && appViewEl(fromV) === $('browse')` (app.js:630) — is
`sameBrowseHost` territory, which the DecisionLog assigns to stage 6 (abort re-render), not stage 5.

The DecisionLog states stage 5 reintroduces the two hosts "in the pane/mover construction that reads
them." Against the code, that construction has no such reader. Reintroducing the fields to honour the
DecisionLog, absent a real consumer, recreates precisely the dead field the no-dead-fields rule
(Engineering Contract §17) removed in `.229`. The plan must either name the genuine stage-5 consumer
that forces each host field (with the construction line that reads it), or drop the reintroduction
from stage 5 and leave each host to the stage that truly consumes it. It cannot do both.

### F4 — Structural — the wiring seam's coverage obligation is unstated for stage 5

After the move, `start()` calls `Swipe.<builder>()` instead of a local function. The `.228` F1 law
(DecisionLog): proving the builder exists and is correct in `swipe.js` is not proving `start()` calls
the right one and wires its node — a wiring mutation must redden an app-harness test. The step must
carry that obligation: an app-harness assertion that a browse-destination swipe builds the ghost from
the moved builder and an overlay-source back-swipe builds none, each mutation-verified. F2 makes this
mandatory, not optional — it is the coverage the gate exemption gives up.

### F5 — Weak — parity risks to name in the step

The `.207` fix requires `copyAnimPhase`/`copyScroll` to run AFTER the clone is inserted into the
document (app.js:492–495, 575–578); T2 requires pruning `.hidden`/`.parked` without testing the clone
root (snapshotHome's source is `#home.parked`); T3/T4 are iOS compositor/decode hazards. The move is
behaviour-preserving only if the seam carries `d` (the builders write `d.ghostY`/`d.animSync`/
`d.animRes`) and preserves insertion-then-sync order. Name these in the step as parity invariants the
relocation must hold; they are not cracks, but they are where a careless "unchanged" move regresses.

## Prediction — where this breaks in execution if built as written

The builder starts the move, discovers on the first `node --test` run that `freezeArt`/`ghostWrap`/
`copyScroll`/`copyAnimPhase`/`d` are undefined in `swipe.js`, and invents a dependency seam on the
spot — mid-build, unreviewed, under the pressure of a red module. That improvised seam is exactly the
decision the plan exists to make deliberately (plan §1: "its behaviour cannot be determined by
reading it"), and an improvised seam is how this subsystem earned its twenty-hour saga. Separately,
the builder reintroduces `sourceHost`/`destinationHost` to satisfy the DecisionLog, finds no consumer,
and either writes a contrived one (a dead field wearing a use) or leaves them unread (the dead field
outright) — and the contract gate or the reviewer catches it a full build later. Both failures are
visible now, in the plan, and cost a specimen here instead of a build there.

## What passes temper

The architecture is sound: one construction module, two recipes, one consumer, a clean single seam.
There is no sequencing error — stage 5 rests only on stage 4 (shipped) and the frozen model (§7.1–2).
Nothing later in the plan gates it. The step is buildable the moment F1 and F3 are resolved by the
planner and F2/F4 are written into it.
