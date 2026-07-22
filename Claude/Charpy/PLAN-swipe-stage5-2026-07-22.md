# Plan review — PLAN-swipe-stage5.md ("resolve the five Stage-5 questions; scope B")

Type: plan-review

<!-- value-crossing-ledger source=js/app.js ranges=470-496,564-580,588-650 -->

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (Vitruvius's resolution of F0/F1/F3/
F6 + F2/F4/F5 from `Claude/Charpy/PLAN-swipe-reveal-stage5-2026-07-22.md`). Grounded against HEAD:
`js/swipe.js`, `js/nav.js`, `js/app.js`, `test/contract-function-gate.test.js`, `test/app-harness.js`.
Revised after an independent read traced the full construction-block boundary (F5–F7 added; F3 raised).

## Verdict

**TEMPER** — fix-then-build. Scope B is the right boundary and was checked against later-stage
ownership; the five capture helpers relocate cleanly; the no-session return-capture direction is right;
the lifecycle deferral (§5) correctly avoids the dead-field trap F6 named; and `buildConstruction` as
`NON_CONTRACT` is sound. The defect is the **seam specification**, not the chosen boundary: the plan
does not trace every value that crosses today's `start()` construction block, so the moved builder is
handed a contract that cannot supply its own callbacks (F5), silently drops a live output the
finalizer still reads (F6), and states its return shape three inconsistent ways (F1). Seven things to
settle before a line is written; none shatters scope B.

## Defining records

The authorities that specify Stage 5, reconciled — verdict: **CONFLICT (unchanged at HEAD), with this
sub-plan as the proposed resolution to B**:
- **`PLAN-swipe-stage5.md`** (this sub-plan) — scope B; the artifact under review.
- **`PLAN-swipe-reveal.md` §7 step 5** — still reads boundary A. To be rewritten to B on approval (§8).
- **`js/swipe.js` header, lines 24–27** — still lists boundary C. To be rewritten to B on approval (§8).
- **DecisionLog 2026-07-21** — promises `sourceHost`/`destinationHost` reintroduced with a reader
  (B or C). To be settled to B on approval (§8).
- **`PLAN-swipe-reveal-stage5-2026-07-22.md`** (the prior review) — states the abort-rerender consumer
  is `sameBrowseHost`, deferred to stage 6. **Contradicted by the code:** the live consumer is
  `d.clobbered` (app.js:630/1260/1286), a stage-5 field distinct from the removed `sameBrowseHost`.
  Reality wins; see F6. The prior review is corrected on this point, not this plan.

The prior records still conflict at HEAD; the plan correctly defers their scrub to approval (§8,
StandardsDocument §6.6). That deferral is proper, not a finding.

## Value-crossing ledger — every value in/out of the `start()` construction block

The discipline this review turns on: enumerate every value the moved block reads (input) and writes
(output), and name its owner in the new seam. A value with no stated owner is a finding. Ranges:
`ghostApp` app.js:470–496, `snapshotHome` 564–580, `start()` construction 588–650.

| Value | Dir | Today (app.js) | Owner under the plan as written | Finding |
|---|---|---|---|---|
| `d.from` / `d.dest` (identity + payload) | in | 592, 622/633, 629 | **none** — `plan` carries no `v`/`desc` | F5 |
| `d.from.v` / `d.dest.v` (`fromV`/`toV`) | in | 622, 630, 633, 635 | **none** — env callbacks need it, unsourced | F5 |
| `d.dir`, `d.w` (→ `off`) | in | 592 | **none** — geometry for `base`; `d` barred, env lacks it | F1 |
| `fromOv = isOverlay(fromV)` | in | 593, 622, 630 | derivable in-module (Nav) but needs `fromV` | F5 |
| `window.scrollY` (→ `ghostY`) | in | 486 | reachable only via `env.document.defaultView` | F4 |
| `window.innerWidth` (→ `d.w`/`off`) | in | 540→592 | unsourced in the seam | F1/F4 |
| `d.movers` shape `{el, base, own}` | out | 620–650 | plan says `{element, base, ownership, capture}` | F1 |
| `d.ghostY` / `d.animSync` / `d.animRes` | out | 487, 495, 578 | `capture` — but contract stated 3 ways | F1 |
| `d.clobbered` | out | 630, read 1260/1286 | **none** — no-session bars `d`, return omits it | F6 |
| `revealBase = snapBrowse(true)` ordering | out | 590 (pre-render) | must precede `env.renderDestination`; unstated | F7 |
| `d.live = true` | out | 589 | stays in `start()` (trivially) | — |

## Findings

### F1 — Structural — open-unknown — the return contract is stated three ways and cannot produce `base`

Three inconsistencies in one contract:
1. **Field names.** Production movers are `{ el, base, own }` (app.js:620–646), read across drag,
   settle, teardown, diagnostics, reveal (654, 675, 701, 708, 716, 740–746, 795–798, 843–844, 867,
   1313). §5's `element`/`ownership` is a rename that scrubs the stage-6-owned finalize path — which
   §10 says Stage 5 will not touch.
2. **`base` is not producible.** `base` is the pixel position `0` or `off = d.dir==='back' ? -d.w :
   d.w` (app.js:592), and consumers depend on the number (`if (m.base)` 654; `m.base === 0` 708). But
   `buildConstruction(plan, env)` is given neither direction nor width, and the no-session rule bars
   `d`. It cannot compute the pixel `base`, nor emit a semantic one without breaking 654/708.
3. **`capture` has two shapes.** §3 signatures it as top-level `{ movers, capture }`; §3's prose says
   "RETURNS capture … per pane"; §5 puts `capture` on every mover. Production is session-level: one
   `ghostY`, an **accumulated** `animSync` (app.js:495 and 578 both `+= nSync`), one `animRes` — and
   the pill (a decoration) has no capture. The plan never states whether per-pane captures merge,
   whether only owned-panes carry capture, or whether `start()` reads the top-level or per-mover field.

The unresolved question: does `start()` attach `base`/`ownership` after `buildConstruction` returns
element+capture; or does the seam gain a numeric offset input; or does Stage 5 own the broader
mover-shape migration (renaming through the finalize path) — and is there **one** capture contract,
aggregate or per-mover? The plan must decide; it cannot leave it to the builder.

### F2 — Structural — requirement — host fields change two pinned exact-key contracts and are unreachable as routed

`classifyTransition` is pinned to exactly `['decorations','fromKind','toKind']`
(contract-function-gate.test.js:24); `constructionPlanFor` to its own set (line 30). Emitting
`sourceHost`/`destinationHost` (§4) reddens the gate unless both registrations are updated in the same
commit — §6 says they "remain contract functions" without noting this. Worse, `buildConstruction`
receives `plan` (constructionPlanFor output, swipe.js:137), which does not carry the host fields
`classifyTransition` emits, so as routed they never reach their stated consumer. The plan must choose
one: forward the fields through `constructionPlanFor` (changing its key set too), pass the
classification to `buildConstruction` separately, or remove the fields (F3).

### F3 — Structural — requirement — host fields are redundant unless they encode information kind does not

Raised from Weak: this sets the classification/construction contract, not documentation. Struck against
the code, `sourceHost` equals `fromKind==='overlay'` (nav.js:35–36: `overlayEl`/`appViewEl` split on
exactly that), and the destination handling is already fully determined by `plan.incoming` +
`plan.renderDestination` (swipe.js:127–129 → app.js:626–637). The genuinely meaningful browse→browse
distinction, `sameBrowseHost`, is deferred to stage 6. So routing existing kind-logic through
host-named fields gives them a reader but no independent information. Conditional on the DecisionLog's
promise, so filed as a requirement: show a transition where equal `fromKind`/`toKind` implies a
different host, or resolve from the existing fields and supersede the DecisionLog entry in the §8
reconciliation. Reintroducing a field whose reader already had the information recreates the redundancy
`.229` removed.

### F4 — Weak — requirement — the seam's scroll/viewport dependency set is not named

`ghostApp` reads `window.scrollY` for `ghostY` (app.js:486) and `base` needs `window.innerWidth` (F1).
"Reachable via `env.document.defaultView`" is not a specification for a plan whose whole purpose is to
define the complete seam. The plan must name the numeric geometry and scroll inputs explicitly, or
explicitly authorize `env.document.defaultView`, so the builder does not reach for a global the
`require()`-in-Node gate (contract-function-gate.test.js:15) trips at module scope.

### F5 — Structural — open-unknown — the seam has no source/destination descriptor identity

`buildConstruction(plan, env)` is given only `plan` and `env`, but its own callbacks are declared
`env.sourceEl(kind, v)`, `env.destOverlayEl(v)`, `env.renderDestination(host, desc)`. Neither `v` (the
screen name) nor `desc` (the descriptor with payload) exists in `constructionPlanFor` output — that
output is `{outgoing, incoming, renderDestination, decorations}` (swipe.js:137). So as specified the
function cannot identify which source/destination overlay to resolve (app.js:622/633 need `fromV`/`toV`),
cannot render an `authorBooks`/`files` destination with its required payload (swipe.js:58; `Browse.render`
takes the full `desc`, app.js:557/2892), and cannot invoke its callbacks per their declared signatures.
This is broader than F2: even perfectly forwarding the host fields supplies no screen identity or
parameterized descriptor. The plan must state where canonical `from`/`to` identity enters
`buildConstruction` — and must not create independently-supplied raw identity and derived classification
that can disagree (a two-source-of-truth hazard). Name the source of `v`/`desc`.

### F6 — Structural — open-unknown — Stage 5 drops `d.clobbered`, a live output the finalizer reads

Today the browse-host branch sets `d.clobbered = !fromOv && appViewEl(fromV) === $('browse')`
(app.js:630), and finalization reads it in the abort path — `if (!commit && cur.clobbered)`
(app.js:1260) and `applyScreen(dest, { render: cur.clobbered, resetScroll: false })` (app.js:1286) — to
re-render the source under the covering ghost on a browse→browse abort. Scope B moves that branch's
render + host resolution into `buildConstruction`, which is barred from `d` and returns only
`{movers, capture}`, and §4 defers `sameBrowseHost` to stage 6. That leaves **no owner** setting the
still-live `d.clobbered`. This is not `sameBrowseHost`: `clobbered` is a distinct field, initialized at
app.js:541, live in the stage-5 baseline, and its loss makes a browse→browse abort render with
`render:false` (1286) and lose its reveal behaviour. The plan must decide who owns `d.clobbered`: does
`buildConstruction` return it as construction metadata (e.g. `{ sourceWasClobbered }`), does `start()`
retain its computation explicitly, or does Stage 5 pull the relevant stage-6 classification forward?
The third changes the staging decision and the plan must state which it chooses.

### F7 — Weak — requirement — the pre-render `#browse` snapshot ordering is unstated

`start()` takes `revealBase = snapBrowse(true)` at app.js:590, before the mid-drag render clobbers
`#browse`; `revealBase` feeds the reveal/diagnostic path (app.js:1121–1131). §3 gives
`buildConstruction` control of when the destination render fires (`env.renderDestination` "to order the
mid-drag render"). So the plan introduces an ordering constraint it does not state: the pre-render
`revealBase` snapshot must be captured before `buildConstruction` triggers the render. The plan must
state that `start()` snapshots `revealBase` before invoking the seam (or that the seam guarantees the
ordering), so the builder does not reorder the render ahead of the snapshot.

## Prediction — where this breaks in execution if built as written

The builder relocates the two recipes cleanly (helpers verified single-caller) and wires
`buildConstruction` — then hits three walls the plan left standing. First it needs `fromV`/`toV`/`desc`
to call `env.sourceEl`/`renderDestination` and finds them nowhere in `plan`, so it threads raw
identity in beside the classification — the two-source hazard F5 names. Then `d.movers` transforms read
`m.el`/`m.base` (654, 675) while it was handed `element`/`base` with no geometry, so it invents the
mapping and the `0`/`off` math in the finalize path §10 promised to leave alone (F1). Finally, nothing
sets `d.clobbered`, so the first browse→browse abort tested on device re-renders with `render:false`
and the source never repaints under the ghost (F6) — a silent behaviour loss no unit test in the plan's
coverage would catch, because the coverage never names `clobbered`. Each is a value crossing the old
construction block that the plan did not trace; each is visible now, in the code, and costs a specimen
here rather than a build there.

## What passes temper

Scope B is sound and was checked against later-stage ownership: the render dispatch (app.js:557) and
Browse hold (app.js:339) it leaves in app.js are stage-7 surfaces, and `renderBrowse` is already
injected into Nav (app.js:2892), so the callback pattern is precedented. The five capture helpers are
single-caller and relocate without breaking another consumer. The no-session return-capture direction
is the right decoupling. The lifecycle deferral (§5) correctly withholds `release()`/`dispose()`/
`equivalence` until stage 6 consumes them, avoiding the dead-field error F6-of-the-prior-review caught.
And `buildConstruction` as `NON_CONTRACT` is correct: the gate's immutability loop runs on `CONTRACT`
only (contract-function-gate.test.js:58), so a live-DOM return is not falsely held to the frozen
contract. The step is buildable once the seam is fully specified — every value in the ledger given an
owner: the mover shape and capture contract (F1), the gate + host propagation (F2/F3), the scroll/
viewport set (F4), the source/destination identity (F5), `d.clobbered`'s owner (F6), and the pre-render
ordering (F7).
