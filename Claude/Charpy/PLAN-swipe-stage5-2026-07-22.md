# Plan review — PLAN-swipe-stage5.md ("resolve the five Stage-5 questions; scope B")

Type: plan-review

<!-- value-crossing-ledger source=js/app.js ranges=345-356,368-496,564-580,588-650 -->

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (Vitruvius's resolution of F0/F1/F3/
F6 + F2/F4/F5 from `Claude/Charpy/PLAN-swipe-reveal-stage5-2026-07-22.md`). Grounded against HEAD:
`js/swipe.js`, `js/nav.js`, `js/app.js`, `test/contract-function-gate.test.js`, `test/app-harness.js`.
Revised twice after independent reads traced the full construction-block boundary — object, geometry,
closure-constant, DOM-side-effect, and ordering values (F5–F9; F3 recalibrated; F6 reframed).

## Verdict

**TEMPER** — fix-then-build. Scope B is the right boundary and was checked against later-stage
ownership; the five capture helpers are single-caller; the no-session return-capture direction is
right; the lifecycle deferral (§5) correctly avoids the dead-field trap; and `buildConstruction` as
`NON_CONTRACT` is sound. The defect is the **seam specification**, not the chosen boundary: the plan
does not trace every value crossing today's `start()` construction block, so the moved builder is
handed a contract that cannot supply its own callbacks (F5), silently drops a live output the
finalizer reads (F6), carries a closure constant whose initializer touches the DOM at module load
(F8), and orphans a global body-state effect (F9). Nine things to settle before a line is written;
none shatters scope B.

## Defining records

The authorities that specify Stage 5, reconciled — verdict: **CONFLICT (unchanged at HEAD), with this
sub-plan as the proposed resolution to B**:
- **`PLAN-swipe-stage5.md`** (this sub-plan) — scope B; the artifact under review.
- **`PLAN-swipe-reveal.md` §7 step 5** — still reads boundary A. To be rewritten to B on approval (§8).
- **`js/swipe.js` header, lines 24–27** — still lists boundary C. To be rewritten to B on approval (§8).
- **DecisionLog 2026-07-21** — promises `sourceHost`/`destinationHost` reintroduced with a reader
  (B or C). To be settled to B on approval (§8); whether they are carried or derived is F3.
- **`PLAN-swipe-reveal-stage5-2026-07-22.md`** (the prior review) — treats the abort-rerender as
  stage-6 (`sameBrowseHost`). Reconciled: `d.clobbered` (app.js:630) is the **live stage-5 carrier of
  the same-browse-host condition**; `sameBrowseHost` is its planned stage-6 normalized replacement.
  Same semantics, different staging — the plan must not open a gap where neither is produced (F6).

The prior records still conflict at HEAD; the plan correctly defers their scrub to approval (§8,
StandardsDocument §6.6). That deferral is proper, not a finding.

## Value-crossing ledger — every value in/out of the moved construction surface

The discipline this review turns on: enumerate every value the moved code reads (input) and writes
(output) — object, geometry, closure constant, DOM side effect, and ordering precondition — and name
its owner in the new seam. A value with no owner is a finding. Ranges: `npPillClone` app.js:345–356,
`GHOST_BG`+helpers+`ghostApp` 368–496, `snapshotHome` 564–580, `start()` construction 588–650.

| Value | Class | Dir | Today (app.js) | Owner under the plan as written | Finding |
|---|---|---|---|---|---|
| `d.from` / `d.dest` (identity + payload) | object | in | 592, 622/633, 629 | **none** — `plan` carries no `v`/`desc` | F5 |
| `d.from.v` / `d.dest.v` (`fromV`/`toV`) | object | in | 622, 630, 633, 635 | **none** — env callbacks need it, unsourced | F5 |
| `d.dir`, `d.w` (→ `off`) | geometry | in | 592 | **none** — geometry for `base`; `d` barred | F1 |
| `window.scrollY` (→ `ghostY`) | geometry | in | 486 | reachable only via `env.document.defaultView` | F4 |
| `GHOST_BG` (`getComputedStyle` at init) | closure const | in | 368–371, used 467 | **none** — DOM-touching initializer moved unchanged | F8 |
| `d.movers` shape `{el, base, own}` | object | out | 620–650 | plan says `{element, base, ownership, capture}` | F1 |
| `d.ghostY` / `d.animSync` / `d.animRes` | object | out | 487, 495, 578 | `capture` — but contract stated 3 ways | F1 |
| `d.clobbered` (same-browse-host carrier) | object | out | 630, read 1260/1286 | **none** — no-session bars `d`, return omits it | F6 |
| `document.body` `np-locked` removal | DOM effect | out | 634, 645 | **none** for the outgoing-NP case | F9 |
| `revealBase = snapBrowse(true)` | ordering | out | 590 (pre-render) | must precede the seam's render; unstated | F7 |
| `takeRowHold()` (Browse hold) | ordering | out | 591 (pre-render) | must precede the seam's render; unstated | F7 |
| `d.live = true` | object | out | 589 | stays in `start()` (trivially) | — |

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
   the pill (a decoration) has no capture. The plan must state whether per-pane captures merge,
   whether only owned-panes carry capture, and whether `start()` reads the top-level or per-mover field.

The unresolved question: does `start()` attach `base`/`ownership` after `buildConstruction` returns
element+capture; or does the seam gain a numeric offset input; or does Stage 5 own the broader
mover-shape migration — and is there **one** capture contract, aggregate or per-mover? The plan must
decide; it cannot leave it to the builder.

### F2 — Structural — requirement — host fields change two pinned exact-key contracts and are unreachable as routed

`classifyTransition` is pinned to exactly `['decorations','fromKind','toKind']`
(contract-function-gate.test.js:24); `constructionPlanFor` to its own set (line 30). Emitting
`sourceHost`/`destinationHost` (§4) reddens the gate unless both registrations are updated in the same
commit — §6 says they "remain contract functions" without noting this. And `buildConstruction`
receives `plan` (constructionPlanFor output, swipe.js:137), which does not carry the host fields
`classifyTransition` emits, so as routed they never reach their stated consumer. The plan must choose
one: forward the fields through `constructionPlanFor` (changing its key set too), pass the
classification to `buildConstruction` separately, or derive host selection in construction (F3).

### F3 — Weak — open-unknown — host fields are derived, not independent; carrying them is a contract-cost decision the plan must make

Recalibrated (was Structural/requirement). Struck against the code, `sourceHost` equals
`fromKind==='overlay'` (nav.js:35–36) and destination handling is already carried by `plan.incoming` +
`plan.renderDestination` (swipe.js:127–129 → app.js:626–637); the genuinely browse→browse distinction,
`sameBrowseHost`, is deferred to stage 6. So the fields are **derived projections of the
classification, not independent information.** That alone does not make them dead: `classifyTransition`
exists precisely as a normalization boundary, and exposing a derived host vocabulary that construction
reads directly is a legitimate way to move mapping policy out of the impure builder and stop it
reinterpreting `fromKind`/`toKind`. Once construction genuinely reads them they have a consumer, and
the no-dead-fields rule does not forbid derived projections. The decision the plan must make: does
carrying both `kind` and `host` in the exact-key contract earn its cost (a stated architectural
benefit — mapping policy centralized in classification), or should construction derive host selection
from the existing classification and the fields stay out? Either is admissible; the plan must choose
and state why, because the choice sets the classification/construction contract and F2's gate
expansion rides on it. (No project rule forbids derivable contract fields; if one existed this would
be Structural.)

### F4 — Weak — requirement — the seam's scroll/viewport dependency set is not named

`ghostApp` reads `window.scrollY` for `ghostY` (app.js:486) and `base` needs `window.innerWidth` (F1).
"Reachable via `env.document.defaultView`" is not a specification for a plan whose purpose is to define
the complete seam. The plan must name the numeric geometry and scroll inputs explicitly, or explicitly
authorize `env.document.defaultView`, so the builder does not reach for a global the `require()`-in-Node
gate (contract-function-gate.test.js:15) trips at module scope.

### F5 — Structural — open-unknown — the seam has no source/destination descriptor identity, and render-callback ownership is vague

`buildConstruction(plan, env)` is given only `plan` and `env`, but its callbacks are declared
`env.sourceEl(kind, v)`, `env.destOverlayEl(v)`, `env.renderDestination(host, desc)`. Neither `v` (the
screen name) nor `desc` (the descriptor with payload) exists in `constructionPlanFor` output
(swipe.js:137). So as specified the function cannot identify which source/destination overlay to resolve
(app.js:622/633 need `fromV`/`toV`), cannot render an `authorBooks`/`files` destination with its
required payload (swipe.js:58; `Browse.render` takes the full `desc`, app.js:557/2892), and cannot
invoke its callbacks per their declared signatures. This is broader than F2: even forwarding the host
fields supplies no screen identity or parameterized descriptor. Two things the plan must state: (1)
where canonical `from`/`to` identity enters `buildConstruction`, without creating independently-supplied
raw identity and derived classification that can disagree (a two-source-of-truth hazard); and (2) what
`env.renderDestination(host, desc)` owns exactly — does it own overlay visibility
(`el.classList.remove('hidden')`, app.js:636) and the destination-specific render calls
(`renderNowPlaying`/`renderScreen`/`Browse.render`), rather than the plan vaguely saying it "performs
the render"?

### F6 — Structural — open-unknown — Stage 5 drops `d.clobbered`, the live carrier of the same-browse-host condition

Today the browse-host branch sets `d.clobbered = !fromOv && appViewEl(fromV) === $('browse')`
(app.js:630) — the destination is rendering into the real `#browse` **and** the source is also the real
`#browse` — and finalization reads it in the abort path: `if (!commit && cur.clobbered)` (app.js:1260)
and `applyScreen(dest, { render: cur.clobbered, resetScroll: false })` (app.js:1286), to re-render the
source under the covering ghost on a browse→browse abort. `d.clobbered` is the **current operational
carrier of the same-browse-host condition**; Stage 6 replaces it with the normalized `sameBrowseHost`
classification — same semantics, later staging. Scope B moves the branch that sets it into
`buildConstruction`, which is barred from `d` and returns only `{movers, capture}`, so **no owner
produces `clobbered`** in the interim, and a browse→browse abort renders with `render:false` (1286) and
loses its reveal behaviour. Stage 5 must preserve the `d.clobbered` carrier until Stage 6 replaces it
with `sameBrowseHost`; moving construction cannot open a gap where neither representation is produced.
The plan must decide who owns it: does `buildConstruction` return it as construction metadata (e.g.
`{ sourceWasClobbered }`), does `start()` retain its computation, or does Stage 5 pull the stage-6
`sameBrowseHost` classification forward (which changes the staging decision, and the plan must state so)?

### F7 — Structural — requirement — the pre-render preconditions (snapshot AND Browse hold) are unstated

`start()` runs two steps before it constructs, both of which must precede any render into `#browse`:
`revealBase = snapBrowse(true)` at app.js:590 (the pre-clobber `#browse` snapshot feeding the reveal/
diagnostic path, 1121–1131), and `takeRowHold()` at app.js:591 (acquires the Browse row hold that must
outlive the gesture). §3 gives `buildConstruction` control of when the destination render fires
(`env.renderDestination` "to order the mid-drag render"), so the plan introduces an ordering constraint
it does not state: `start()` must capture `revealBase` **and** acquire the Browse hold before invoking
any construction path capable of rendering into `#browse`. Stated as only the snapshot, the seam could
preserve `revealBase` ordering while still moving the render ahead of the hold. The plan must state both
preconditions as invariants of the call site.

### F8 — Structural — open-unknown — the relocated helper cluster has an unstated top-level DOM dependency (`GHOST_BG`)

The plan relocates the capture helpers privately into `swipe.js` (§3) while promising module load stays
DOM-free (§6). But `ghostWrap` reads `GHOST_BG` (app.js:467), and `GHOST_BG` is initialized at
closure-init by an immediately-invoked function calling
`getComputedStyle(document.documentElement).getPropertyValue('--page-bg')` (app.js:368–371). Relocated
unchanged, that initializer runs when Node `require()`s `swipe.js`, touching the DOM at module load and
breaking every `swipe.js` unit test and the `require()`-in-Node gate — the exact constraint §6 sets.
This is the extraction dependency F1 was meant to enumerate; the first two passes missed it because the
ledger ranges did not cover the helper cluster. The plan must decide who owns the ghost background:
inject it, resolve it lazily inside the recipe via `env.document.defaultView.getComputedStyle`, or cache
it on the first runtime construction call. It cannot move the `GHOST_BG` initializer to `swipe.js`
unchanged.

### F9 — Structural — open-unknown — the moved block's `np-locked` body-unlock has no owner

Today the construction block removes the global `np-locked` body class in two cases:
`document.body.classList.remove('np-locked')` when Now Playing is the incoming overlay (app.js:634,
beside the render) and when Now Playing is the outgoing endpoint (app.js:645, inside the decoration
block). Scope B moves the decoration builder into `buildConstruction` but keeps all `np-locked` logic in
`app.js` (§2/§3), and the return contract is only `{movers, capture}` — so `app.js` gets no signal for
the **outgoing-NP case**, which may have no destination-render callback at all (e.g. NP→home snapshot,
`renderDestination:'none'`). The unlock cannot simply disappear because the decoration builder moved.
The plan must decide whether `start()` applies it from the immutable `plan` before construction,
`buildConstruction` receives a narrow callback, or construction returns an explicit effect `app.js`
consumes — and must not leave the outgoing-NP unlock unowned.

## Prediction — where this breaks in execution if built as written

The builder relocates the recipes and hits the walls the plan left standing, in order. It needs
`fromV`/`toV`/`desc` to call `env.sourceEl`/`renderDestination`, finds them nowhere in `plan`, and
threads raw identity in beside the classification — the two-source hazard (F5). It moves the helper
cluster and the first `node --test` reddens the moment `require('./swipe.js')` runs the `GHOST_BG`
`getComputedStyle` at module load with no document (F8). `d.movers` transforms read `m.el`/`m.base`
while it was handed `element`/`base` with no geometry, so it invents the mapping and the `0`/`off` math
in the finalize path §10 promised to leave alone (F1). Then two silent behaviour losses that no unit
test in the plan's coverage names: a browse→browse abort re-renders with `render:false` because nothing
sets `d.clobbered` (F6), and an NP→home swipe never removes `np-locked` because the outgoing-NP unlock
lost its owner when the decoration builder moved (F9). Each is a value crossing the old construction
block — object, closure constant, or DOM side effect — that the plan did not trace; each is visible now,
in the code, and costs a specimen here rather than a build there.

## What passes temper

Scope B is sound and was checked against later-stage ownership: the render dispatch (app.js:557) and
Browse hold (app.js:339) it leaves in app.js are stage-7 surfaces, and `renderBrowse` is already
injected into Nav (app.js:2892), so the callback pattern is precedented. The five capture helpers are
single-caller and relocate without breaking another consumer. The no-session return-capture direction
is the right decoupling. The lifecycle deferral (§5) correctly withholds `release()`/`dispose()`/
`equivalence` until stage 6 consumes them. And `buildConstruction` as `NON_CONTRACT` is correct: the
gate's immutability loop runs on `CONTRACT` only (contract-function-gate.test.js:58), so a live-DOM
return is not falsely held to the frozen contract. The step is buildable once every value in the ledger
has an owner: the mover shape and capture contract (F1), the gate + host propagation (F2) and the
carry-or-derive decision (F3), the scroll/viewport set (F4), the source/destination identity and
render-callback ownership (F5), `d.clobbered`'s owner (F6), the pre-render snapshot-and-hold ordering
(F7), the `GHOST_BG` background owner (F8), and the `np-locked` unlock owner (F9).
