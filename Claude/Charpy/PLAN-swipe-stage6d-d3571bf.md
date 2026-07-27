Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/swipe.js:122-145","js/swipe.js:300-327","js/app.js:438-443","js/app.js:473-516","js/app.js:1145-1188"],"callee_ranges":[]} -->

# Charpy — PLAN-swipe-stage6d r2 (finalizationPlanFor.abortRender; retire `clobbered`; ARMED-supersession conjunct)

Target: `Claude/Plans/PLAN-swipe-stage6d.md` at frozen HEAD `d3571bf`.
Prior strike: `Claude/Charpy/PLAN-swipe-stage6d-00874b5.md` (TEMPER). Re-struck against shipped source
at HEAD `d3571bf`.

## Applicability

- **defining_records: true** — reconciles the strategic plan (`PLAN-swipe-reveal.md` §3.3), the frozen
  oracle (`swipe-plan-spec.mjs`), the code under change, and EC §4.14/§4.15/§4.16/§4.19. See
  `## Defining records`.
- **boundary_relocation: true** — the abort/recovery re-render DECISION relocates from the runtime
  byproduct `sourceWasClobbered` (stored `d.clobbered`) to the declared
  `finalizationPlanFor(classification).abortRender`, crossing the swipe→app seam. Ledger below.
- **callee_replacement: false** — concur: no indirection replaces a direct call; only the DATA
  parameterizing `applyScreen`/`Browse.render` changes source.
- **contract_shape: true** — `finalizationPlanFor` returns a deep-frozen exact-key
  `{ abortRender: 'rerender'|'none' }`, gated by `test/contract-function-gate.test.js`; the co-change
  narrows the Construction contract from four keys to three.

## Verdict

**FORGE.** The specimen absorbed every blow, including the one the r1 strike did not think to swing.
Both r1 findings are closed, and the planner-found ARMED-supersession non-parity — the deepest crack
in this slice — is grounded in the exact HEAD semantics and correctly repaired. Two advisory
tightenings (one Weak, one Note) are recorded; neither blocks the build, and neither needs a
re-review — the planner may fold them in on the way to Curie.

I verified the load-bearing new claim by construction, not by trusting the prose:
`clobbered ≡ cur.live && (browse→browse)` is the literal HEAD behaviour (`d.live` is set `false` in the
arm literal at `js/app.js:438` and `true` only at `:474`, start's first statement, which runs only at
the 8px lock `:535→541→543`; the `:516` set of `d.clobbered` lives inside `start()`). The `cur.live`
conjunct at the recovery reader (`:415`) restores byte-parity across all three reachable recovery
states, and the finalize sites (`:1159/:1185`) correctly OMIT it because `:563`
(`if (!cur.live) { sessionDone(cur); return; } // ARMED end … no settle`) proves a session that never
locked never reaches finalize.

## Defining records

**AGREE.** No two defining records disagree on required behaviour. The r1 AGREE call stands and the
corrections do not disturb it. Verified independently at HEAD:

- `PLAN-swipe-reveal.md` §3.3 — target vocabulary has no `clobbered`; abort `render:'rerender'` iff
  browse→browse. Realized exactly.
- `swipe-plan-spec.mjs:53-62` — `expectedFinalization.abortRender` is `'rerender'` for browse→browse
  alone; matches both §3.3 and the retired byproduct on all 8 cases.
- `js/swipe.js:300/310` — the r2 defining-records row (117) and Grounding (45-51) now correctly place
  the compute in the INCOMING `renderDestination==='browse-host'` branch, reached by
  {home→browse, browse→browse, overlay→browse}, true only for browse→browse. Matches source. (r1 F2
  closed.)
- `js/app.js:438/474/516` — `d.live:false` at arm, `d.live=true` at `:474`, `d.clobbered` set at `:516`
  inside `start()`. Grounds `clobbered ≡ cur.live && browse→browse` exactly.
- `test/swipe-construction.test.js:30` — `CONSTRUCTION_KEYS` currently four keys incl.
  `sourceWasClobbered`; the co-change to three keys is correctly scoped. (r1 F1 closed.)

One reconciliation note (unchanged, not a conflict): subsystem §23 host-field reintroduction is a
scoping deferral to the consumer slice, per §4.15.

## Value-crossing ledger (boundary_relocation)

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
d.finPlan.abortRender read at the two finalize abort sites (1159/1185) | string | in | finalizationPlanFor@swipe.js | app.js finalize abort render decision | finalizationPlanFor | per-gesture immutable, computed at arm | FP oracle + AB real-abort DOM
d.finPlan.abortRender AND d.live read at the supersession recovery reader (415) | string+boolean | in | finalizationPlanFor@swipe.js + arm literal | app.js begin() recovery render decision | session | per-gesture; finPlan frozen at arm, live set at start() | RC three-boundary recovery DOM
d.clobbered / sourceWasClobbered stored byproduct REMOVED | boolean | removed | buildConstruction@swipe.js + start()@app.js | (deleted) | n/a | retired | CLB source-text + anchor gate
```

Adapter (`tomeroam-js-dom`) notes on the declared ranges:
- **Session field `d.<field>`**: `d.finPlan` ADDED at the arm literal (`js/app.js:438-439`, replacing
  `clobbered: false`), read at 415/1159/1185; `d.live` is an EXISTING field (arm literal :438, set
  :474) newly READ at :415; `d.clobbered` DELETED. All named per §2/§9.
- **`document.body.classList`**: the only body-class mutations in the declared range are the
  `np-locked` removes at `js/app.js:487` and `:523` (outgoing-NP unlock) — UNCHANGED by this slice
  (parity). Named so the crossing is accounted, not perturbed.
- **Callee `classList` tokens**: N/A — callee_replacement false, no callee range.
- **Contract shape**: exact-key + closed-enum + deep-freeze via `test/contract-function-gate.test.js`
  (EC §4.11); the Construction exact-key co-change (`CONSTRUCTION_KEYS` four→three) is the
  `contract_shape` surface the scrub touches.

## Findings

### F1 — [Weak] [defect] The §4.16 justification says "derived at its one use site"; the mechanism is store-at-arm
The defining-records §4.16 row (118-119, and the echo in §3 item 4 at 307-309) argues §4.16-compliance
by asserting "the decision is derived at its one use site, `finalizationPlanFor`." Verified against the
plan's own §2/§6/§4b: `finalizationPlanFor(classifyTransition(...))` is called ONCE at ARM
(`js/app.js:438-439`), its result STORED frozen as `d.finPlan`, and READ at THREE sites (415, 1159,
1185). So the phrase is imprecise on two counts — the value is derived at arm (not at the read sites),
and there are three readers (not one).

This is NOT a design defect: the slice IS §4.16-compliant, but on IMMUTABILITY grounds, not use-site
derivation. The retired `clobbered` was a plain MUTABLE boolean set separately from its cause (`:516`),
which is exactly the "separately mutable derived consequence" §4.16 names (its own example list cites
"`clobbered` plus abort rerender policy"). The replacement `d.finPlan` is `Object.freeze`d, computed
atomically at arm from the same `from`/`dest` that are fixed at arm, and cannot drift — so the §4.16
hazard is genuinely removed. The design is sound; only the record's explanation is loose.

**Advisory (non-blocking, no re-review):** tighten the §4.16 row and §3 item 4 to state that `finPlan`
is a derived IMMUTABLE snapshot computed once at arm and stored frozen (readable at three sites,
cannot drift), and rest §4.16-compliance on the frozen/atomic property rather than on "use-site
derivation." Brunel builds identical correct code either way.

### F2 — [Note] [recommendation] Moving `classifyTransition` to arm-time moves its throw-site earlier
`finPlan` is computed at arm via `Swipe.classifyTransition({ from, to: dest })`, which can throw
(`kindOf` on an unknown screen, `requirePayload` on a parameterized descriptor missing its payload).
Today `classifyTransition` runs at build (inside `buildConstruction`, `js/app.js:496`), i.e. only after
the 8px lock. After the change it runs at every arm — so for a gesture that arms and aborts BEFORE the
lock, a throw that previously never occurred (build never ran) now would.

This introduces no new throw for any descriptor the app actually navigates: the `from`/`dest`
value-space at arm is identical to the value-space at build (the same `from`/`dest` captured at :438
are passed to `buildConstruction` at :496), and `from = currentDesc()` plus a real nav-stack `dest` are
well-formed by construction. So the change is observable only if a malformed descriptor could arm but
never lock — not a normal path. §5 already notes the call is "new only in TIMING"; it is worth one
clause acknowledging that the timing move also moves the (I16 well-formedness) throw-site earlier, with
the value-space argument for why no real navigation gains a throw.

## Coverage

No blocking findings. F1 is a Weak record-accuracy tightening (design sound, build unaffected); F2 is a
Note. The plan's own FP/AB/CLB/RC cells and the RG* regression pins carry the verification; nothing in
this verdict gates the handoff to Curie.

## What I re-struck and what held (the ARMED-supersession claim)

1. **`clobbered ≡ cur.live && browse→browse` — exact HEAD semantics. HOLDS.** `d.live` set `false` at
   the arm literal (:438), `true` only at `:474` (start's first line); no other assignment (grep
   confirmed). `d.clobbered` set only at `:516`, inside `start()`, which runs only at the 8px lock
   (:535 `if (!d.locked)` → :541 `d.locked=true` → :543 `start()`). So `clobbered===true` iff
   (start ran) ∧ browse→browse iff `cur.live` ∧ browse→browse.
2. **Arm-time `finPlan` is sound. HOLDS.** Computed at the arm literal from `from`/`dest` already
   resolved at :431/:433-437; defined for every non-null session (ARMED/DRAGGING/SETTLING) exactly as
   `clobbered:false` was; the orphan (`cur` null) is guarded by the `:415` ternary. No reader touches
   `finPlan` before arm; nothing expects it absent.
3. **The `cur.live` conjunct restores byte-parity at ALL read sites with no new divergence. HOLDS.**
   - `:415` (recovery, armed-reachable via begin() leftover at :383): armed browse→browse
     `live:false` → FALSE (was `clobbered:false`); built browse→browse mid-drag → TRUE; overlay→browse
     → FALSE. All three match old `clobbered`. The settling-recovery sub-case only ever sees pane-less
     (overlay-involving) sessions — a settling browse→browse is pane-owning and stays gated (6c cell
     PG) — so `clobbered` there is always false and NEW is always false. No suppression bug.
   - `:1159/:1185` (finalize) correctly OMIT the conjunct: `:563` proves an armed (non-live) session
     ends via `sessionDone` and never settles/finalizes, so `cur.live` is invariably true there and
     `abortRender==='rerender'` alone reproduces `clobbered`.
4. **RC's three boundaries are reachable and observable. HOLDS.** The armed boundary is reached through
   the real `begin()` leftover-recovery path (:383 admits a non-null armed `d`); the "drop `cur.live`"
   mutation flips it to a spurious `#browse` re-render, observable on the real DOM — non-vacuous.

## Prediction

Built as written, this slice reaches green on the first full run: `finalizationPlanFor` + the arm-time
`d.finPlan` + the `cur.live` conjunct reproduce `clobbered` byte-for-byte on every reachable path, and
the completed co-change scrub (construction three-key contract, five re-pointed mutation anchors, model
mirror + fingerprint regeneration) keeps the gated `contract-function-gate`, `mutation-anchors`, and
`swipe-model` tests green rather than red — which is exactly what r1 predicted would break and r2 now
covers. The residual risk the plan should keep visible is the one it now owns explicitly: the recovery
reader's parity depends on `cur.live` reproducing the build-ran half — the "drop `cur.live`" mutation
(cell RC) is the standing guard against a future edit quietly deleting it.
