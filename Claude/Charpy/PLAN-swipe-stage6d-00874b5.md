Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/swipe.js:122-145","js/swipe.js:300-327","js/app.js:413-421","js/app.js:505-524","js/app.js:1144-1189"],"callee_ranges":[]} -->

# Charpy — PLAN-swipe-stage6d (finalizationPlanFor.abortRender; retire the runtime `clobbered` byproduct)

Target: `Claude/Plans/PLAN-swipe-stage6d.md` at frozen HEAD `00874b5`.
Reviewed against shipped source at the same HEAD.

## Applicability

- **defining_records: true** — the plan reconciles the strategic plan (`PLAN-swipe-reveal.md` §3.3),
  the frozen oracle (`swipe-plan-spec.mjs`), the code under change (`js/swipe.js`, `js/app.js`), and
  four EngineeringContract rules (§4.14/§4.15/§4.16/§4.19). Reconciled in `## Defining records`.
- **boundary_relocation: true** — the abort re-render DECISION relocates from a runtime byproduct
  (`sourceWasClobbered` in `js/swipe.js`, stored `d.clobbered` in `js/app.js`) to a declared decision
  (`finalizationPlanFor(classification).abortRender`) crossing the swipe→app seam. Ledger below.
- **callee_replacement: false** — concur with the plan: no indirection/callback/adapter replaces a
  direct call; only the DATA parameterizing `applyScreen`/`Browse.render` changes source. No callee
  ranges.
- **contract_shape: true** — `finalizationPlanFor` introduces a deep-frozen exact-key
  `{ abortRender: 'rerender'|'none' }`, gated by `test/contract-function-gate.test.js`.

## Verdict

**TEMPER.** The specimen holds at its load-bearing weld. The central promise — that the declared
`abortRender` is byte-for-byte equal to the retired runtime `clobbered` on every reachable transition
— was struck against the real `buildConstruction` logic and the frozen oracle and it did not crack:
`sourceWasClobbered = resolveSource() === hostEl` is true iff browse→browse, and the frozen
`expectedFinalization` data is `'rerender'` for exactly and only browse→browse across all 8 structural
cases. The dependency claim (D is next; D precedes F) is grounded, not rationalized. The three
production read sites are enumerated completely and no late/async production reader exists.

The plan tempers on one Structural crack: **its retirement scope (§2) and scrub (§9) enumerate only a
subset of the HEAD references to `clobbered`/`sourceWasClobbered`, and the omitted set includes two
GATED tests that go red on the change** — so the RG* "existing suite stays green" cells are, as
written, false. That is fixable by completing the enumeration; the central claim survives. One Weak
tightening (a mislocated branch in the fracture analysis handed to Loki) and one Note round it out.

## Defining records

**AGREE.** No two defining records disagree on required behaviour, and I concur with the plan's own
AGREE call. Verified independently:

- `PLAN-swipe-reveal.md` §3.3 (read at HEAD): `planFor(classification) -> { ..., paneRemovalPolicy }`
  and "`clobbered` DOES NOT EXIST in the target vocabulary … browse→browse abort render:'rerender';
  everything else render:'none'." The plan realizes exactly the abort half of this. §3.4 confirms
  `pane.release()`/`dispose(reason)` is the ENFORCEMENT mechanism for the removal policy that §3.3
  makes a plan field. This grounds the D-before-F ordering as **forced**, not preferential (see F-note
  on dependency).
- `test/fixtures/swipe-plan-spec.mjs:53-62` (read at HEAD): `expectedFinalization.abortRender` is
  `'rerender'` for `browse→browse` alone and `'none'` for the other seven cases — matching both the
  §3.3 rule and the retired byproduct's value on every case. The fixture header (38-44) still carries
  the "NOT consumed / absence must NOT be read as verified" caveat the plan turns off.
- `test/swipe-transition.test.js` (read at HEAD): currently compares `expectedConstruction` only
  (lines 95/128/183); `expectedFinalization` is not yet compared. The plan's "turn the oracle on" is
  therefore a real, not-yet-present addition — accurately described.
- `js/swipe.js:300-327`, `js/app.js:413-421/505-524/1144-1189` — code under change; see F1/F2.

One reconciliation note (not a conflict): subsystem §23 names `sourceHost`/`destinationHost`/
`sameBrowseHost` reintroduction "in stage 6". The plan defers the host fields to their consumer slice
because `abortRender` is derivable from `fromKind`/`toKind` alone (§4.15 no-dead-fields). This is a
scoping deferral, correctly recorded; the fixture keeps `expectedHosts` inert, consistent with it.

## Value-crossing ledger (boundary_relocation)

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
d.finPlan.abortRender decision read at the three abort/recovery finalize sites | string | in | finalizationPlanFor@swipe.js | app.js finalize/recovery render decision@app.js | finalizationPlanFor | per-gesture immutable stored on session at start() | FP oracle + AB real-abort DOM test + RC 6c fixture
d.clobbered stored byproduct REMOVED at the set site | boolean | removed | buildConstruction sourceWasClobbered@swipe.js | (deleted; no consumer) | n/a | retired | CLB source-text gate asserts absence
```

Adapter (`tomeroam-js-dom`) notes on the declared ranges:
- **Session field `d.<field>`**: `d.finPlan` is ADDED at `js/app.js` `start()` (frozen), read at 415,
  1159, 1185; `d.clobbered` (init 439, set 516) is DELETED. Both named per §2/§9.
- **`document.body.classList`**: the only body-class mutation in the 505-524 range is
  `document.body.classList.remove('np-locked')` at app.js:523 (the outgoing-NP unlock). This slice
  does NOT touch it — UNCHANGED (parity). Named so the crossing is accounted, not perturbed.
- **Callee `classList` tokens**: N/A — callee_replacement is false; no callee range.
- **Contract shape**: exact-key + closed-enum + deep-freeze validated by
  `test/contract-function-gate.test.js` (EC §4.11) — the plan §4b invokes it correctly.

## Findings

### F1 — [Structural] [defect] Retirement scope/scrub enumeration is INCOMPLETE; two GATED tests go red on the change
Severity: **Structural** — Nature: **defect**

The plan's §2 scope and §9 scrub name only `js/app.js`, `js/swipe.js`,
`test/fixtures/swipe-plan-spec.mjs`, `test/swipe-transition.test.js`, the records, and
`docs/swipe-model.generated.txt`. A HEAD grep for `clobber` shows the retirement touches more than
that, and the omitted set includes **gated** tests that will fail the moment the field is deleted —
which directly falsifies the RGabort/RGheld/RGcommit cells' claim that the existing suite stays green.
StandardsDocument §6.6 and EC §7 require the scrub to be exhaustive on the first pass; a second pass to
find what was missed is a failure of the first.

Confirmed against source at HEAD:

1. **`tools/mutate.mjs` — 5 anchors reference the retired lines; `test/mutation-anchors.test.js`
   (gated, EC §4.10) reddens.** The anchor gate (`test/mutation-anchors.test.js:23-58`) asserts every
   mutation's `from` string still occurs in its target file. These `from` strings anchor on the exact
   text being changed:
   - `HARDRESET_DISPOSE_FROM` (mutate.mjs:57-60) and `VR_HOLD_ORDER_FROM`/`_TO` (64-75) and
     `RECOVERY_RENDER_LINE` (99) — all contain
     `applyScreen(currentDesc(), { render: cur ? cur.clobbered : false, ... })` (app.js:415), used by
     mutations at 216-217, 219-220, 223-224, 228-229.
   - `swipe5 F6` (399-402) anchors on `sourceWasClobbered = resolveSource() === hostEl;` (swipe.js:310)
     — the exact line §2 deletes.
   Redirect 415 to `cur.finPlan.abortRender === 'rerender'` and delete swipe.js:310, and every one of
   these `from` strings rots → the anchor gate fails. The plan never mentions `tools/mutate.mjs`.

2. **`test/swipe-construction.test.js:219-237` — the F6 test asserts the DELETED return member.** It
   asserts `c1.sourceWasClobbered === true` and `c2.sourceWasClobbered === false` on
   `buildConstruction`'s return. Delete `sourceWasClobbered` from the return and both assertions read
   `undefined` and FAIL. The plan's §9 lists no test file other than `swipe-transition.test.js`. This
   coverage moves to FP (oracle) + AB (real abort); the F6 construction test must be deleted or
   replaced as part of the retirement, and the plan must say so.

3. **`tools/gen-swipe-model.mjs` (235, 242, 412-413, 434) + its fingerprint pin.** The generator
   hard-codes prose `render: d.clobbered` / "rerender iff d.clobbered". §9 says only "regenerate
   docs/swipe-model.generated.txt" — but regeneration alone still emits the retired field name because
   the mirrored rule is hard-coded in the generator SOURCE. Separately, `test/swipe-model.test.js`
   (30, 76-77, 92-93) fingerprints the js/app.js regions the generator mirrors (415/1159/1185); those
   regions change, so the fingerprint pin FAILS and requires the mirrored rule + the `VERIFIED`
   fingerprint to be updated in the same commit. §9 addresses neither the generator's mirrored
   `d.clobbered` strings nor the fingerprint reconciliation.

4. **Comment/message-only references the scrub omits** (non-gated, but §6.6 scrub obligations):
   `js/app.js:466` ("the session recording (capture/clobbered/movers)"); `test/swipe-stage6.test.js`
   (18, 108, 110, 112, 123, 136, 268, 288, 299 — comments and an assertion message referencing
   `d.clobbered`); `test/swipe-invariants.test.js:378`; `test/swipe-stage6b-loser-cancel.test.js:53`.
   §9 lists app.js comment 391 but not 466, and none of the test comment sites.

5. **Sub-point — the 415 recovery site's render-TRUE boundary value.** The plan's RC cell and §7
   "Recovery authority boundary" row describe the recovery render as "always 'none' for the reachable
   pane-less/overlay set." That is correct for the 6c pane-less path, but the SAME redirected read site
   (415) also serves the stage-6a MID-DRAG supersession recovery of a browse→browse session, where the
   value is TRUE (`finPlan.abortRender === 'rerender'` → render true), pinned by the shipped stage-6a
   SR test (the `RECOVERY_RENDER_LINE` mutation at mutate.mjs:223). Confirmed by 6c §11 (lines 187-188:
   `cur.clobbered` is set only by a browse→browse mid-drag render). The redirect must be proven green
   on BOTH boundary values at site 415, not only the pane-less 'none' value the RC cell names.

**Required change (blocking):** §2 (scope) and §9 (scrub) must enumerate EVERY HEAD reference to
`clobbered`/`sourceWasClobbered` (the grep set above) and state, per site, the concrete action:
re-point each `tools/mutate.mjs` anchor to the new `finPlan.abortRender` line (or delete the mutation
with a stated now-undefended guard); delete/replace `test/swipe-construction.test.js` F6 by FP+AB;
update the mirrored `d.clobbered` rule in `tools/gen-swipe-model.mjs` AND reconcile the
`test/swipe-model.test.js` fingerprint + regenerate; update the comment/message sites. Add the 415
render-TRUE (superseded browse→browse) case to the coverage so both boundary values at that site are
pinned. Until then the RGabort/RGheld/RGcommit "existing suite green" claim is unproven.

### F2 — [Weak] [defect] The fracture analysis mislocates WHERE `sourceWasClobbered` is computed
Severity: **Weak** — Nature: **defect**

Three prose sites state `sourceWasClobbered` is "set ONLY inside the `plan.outgoing === 'app-ghost'`
branch": the Grounding paragraph, the defining-records row for `js/swipe.js buildConstruction
(300–327)`, and §3.3 item 3. Verified against source: it is INITIALIZED at `js/swipe.js:300` (top of
the INCOMING section, unconditionally `false`) and COMPUTED at `js/swipe.js:310`, inside the INCOMING
branch `else if (plan.renderDestination === 'browse-host')` (`:305`) — NOT the OUTGOING app-ghost
branch (`:291-297`, which only sets `outgoing`/`capture`). `renderDestination === 'browse-host'` iff
`toKind === 'browse'`, so the flag is computed for **{home→browse, browse→browse, overlay→browse}** —
a superset of the plan's stated app-ghost set {home→browse, browse→browse}.

This does NOT break the equivalence: the extra member overlay→browse computes
`resolveSource() === hostEl` = (overlay element === #browse) = FALSE, so it agrees with the declared
`abortRender: 'none'`; I verified all 8 cases match. The naive-app-ghost fracture at home→browse is
correctly identified. And cell AB already drives overlay→browse, so coverage is correct. But the
branch identity and reachable-set are load-bearing framing in the analysis handed to a rationale-blind
Loki, and they are wrong as written.

**Required change (tighten, non-blocking to build):** correct the three sites to describe the real
branch — initialized at swipe.js:300, computed at swipe.js:310 in the `renderDestination==='browse-host'`
(incoming) branch, reached by all `toKind==='browse'` transitions {home→browse, browse→browse,
overlay→browse}, true iff `resolveSource()===hostEl` (i.e. `fromKind==='browse'`). Keep the
(correct) conclusion.

### F3 — [Note] [recommendation] Historical Loki probe files still reference `d.clobbered`
Severity: **Note** — Nature: **recommendation**

`Claude/Loki/PROBE-stage6b-r2-round2.js`, `probe-stage6c-r2-abort-chain.js`,
`probe-stage6c-r2-stale-battery.js`, and `STRIKE-swipe-stage6-recover-before-arm.probe.js` reference
`d.clobbered`. These are dated strike artifacts, not current-truth production/records describing the
system. It would be reasonable to leave them as archival casebook entries rather than scrub them; this
is a judgment call for Zelda at scrub time, not a plan defect. Flagged only so it is a decision rather
than an oversight.

## Coverage

Blocking finding → verification it maps to:

- **F1** — verified by the CI run itself going green after the completed scrub: `test/mutation-anchors.test.js`
  (all anchors re-point and match), `test/swipe-construction.test.js` (F6 removed/replaced by FP+AB),
  `test/swipe-model.test.js` (generator mirrored rule + fingerprint reconciled), and the RG* cells
  (now actually green because the tooling/tests were updated). The plan's own FP/AB/CLB/RC cells stand;
  F1 is about the tests/tooling the plan forgot to bring along, whose proof is the green gated suite.

Non-blocking: F2 (prose accuracy — no test), F3 (records judgment — no test).

## Prediction — where this breaks in execution if built as written

Brunel builds the pure `finalizationPlanFor` and the three redirects correctly (the keying rule and
read sites are stated precisely and are sound), computes a green FP oracle and AB abort tests — and
then the FIRST full `npm test` / CI run goes red on `test/mutation-anchors.test.js` (rotted
`cur.clobbered`/`sourceWasClobbered` anchors), `test/swipe-construction.test.js` (F6 asserting the
deleted return member), and `test/swipe-model.test.js` (fingerprint of the changed app.js regions,
plus stale `d.clobbered` in the regenerated doc). None of these three is in the plan's field list, so
the builder discovers the true scrub surface with the change half-landed — the exact late-and-
expensive discovery the scrub-exhaustive rule exists to prevent. Completing the §2/§9 enumeration now
(F1) forecloses it. The equivalence promise and the dependency spine will hold; the crack is entirely
in the un-enumerated retirement surface.

## Advisory notes (do not block)

- The D-before-F dependency claim is SOUND and verified against parent §3.3/§3.4: `paneRemovalPolicy`
  is literally a field of `planFor()`'s return (§3.3 line 347) and `pane.release()`/`dispose(reason)`
  (§3.4) is its enforcement mechanism, so building F first would hand-code a policy D re-declares
  (EC §4.16). D is the correct next foundation and its smallest sound inhabitant (`abortRender`, the
  one finalization field already frozen in the oracle with a live consumer) is the right slice. No
  escalation warranted.
- The Coverage Model is non-vacuous. FP binds to the independent three-layer oracle; AB drives real
  aborts through `h.touch` on browse→browse / home→browse / overlay→browse and observes the real
  `#browse` render flag + `window.scrollTo` (so it cannot pass vacuously — the `app-ghost`-keying
  mutation reddens the real home→browse DOM); CLB is a labeled SOURCE_TEXT sweep kept distinct from
  behavioural cells (§4.10); RC re-runs the shipped 6c overlay→browse fixtures. Non-vacuity confirmed
  — subject to F1 adding the 415 render-TRUE case so AB/RC cover both boundary values at the recovery
  site.
- Retire-safety on the PRODUCTION read side is clean: exactly three field reads (415, 1159, 1185), all
  enumerated; no timer/listener/recovery path reads `.clobbered` elsewhere. The gaps are all in
  tooling/tests, per F1.
