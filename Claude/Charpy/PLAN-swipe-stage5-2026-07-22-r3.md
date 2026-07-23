# Plan review (round 3) — PLAN-swipe-stage5.md (revised: resolves F1-r, F2-r, F3-r)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:345-356","js/app.js:358-497","js/app.js:547-580","js/app.js:582-655"],"callee_ranges":["js/app.js:550-558","js/app.js:632-638"]} -->
<!-- note: round 3. Round 1 = the seven blockers (PLAN-swipe-stage5-2026-07-22.md); round 2 = F1-r/F2-r/F3-r (…-r2.md). Both cited unchanged. -->

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (Vitruvius's revision resolving the two
round-2 residuals). Grounded against HEAD: `js/swipe.js`, `js/app.js`, `test/swipe-transition.test.js`,
`test/contract-function-gate.test.js`, `test/fixtures/swipe-plan-spec.mjs`. Each resolution was struck
against the artifact it cites, not accepted on prose.

## Applicability

Declared patterns (machine-readable declaration above; adapter `tomeroam-js-dom`):
- **defining_records: true** — parent plan, `swipe.js` header, DecisionLog still CONFLICT at HEAD; scrub
  deferred to approval (proper, not a finding).
- **boundary_relocation: true** — the capture recipes + source resolution + NP builder move
  `app.js`→`swipe.js`; ranges traced in the ledger.
- **callee_replacement: true** — `showAppView` (550–558) and the overlay branch (632–638) are replaced by
  behaviour split across L1/L2/L3; both callee ranges declared, every effect assigned (§5).
- **contract_shape: true** — `classifyTransition` gains `sourceHost`/`destinationHost` (F1-r); exact-key
  registrations and the frozen-spec host values update in the same commit.

## Verdict

**FORGE** — build it. Every finding across three rounds is resolved and verified against HEAD: round 1
(F1, F2, F4, F5, F6, F7, F8), round 2 (F1-r Structural, F2-r Weak, F3-r Note). The seam is fully
specified — every value and order in the ledger has one owner, the host projection is written and pinned
in the frozen model, the capture shape matches the code, and the ordering invariant is mutation-guarded.
The chosen boundary B was re-checked against later-stage ownership and holds. No blocking finding remains;
one trivial cosmetic tidy is noted below, non-blocking.

## Defining records

Verdict: **CONFLICT (unchanged at HEAD); this sub-plan is the proposed resolution to boundary B**, scrub
deferred to approval (StandardsDocument §6.6) — same standing as rounds 1–2, correctly unchanged.
- **`PLAN-swipe-stage5.md`** (revised) — the artifact; scope B, host carried, projection written.
- **`PLAN-swipe-reveal.md` §7 step 5** / **`js/swipe.js` header 24–27** / **`DecisionLog.md` 2026-07-21**
  — reconciled to B on approval (plan §9).
- **`swipe-plan-spec.mjs`** — the frozen construction spec; the plan extends its `STRUCTURAL_CASES` with
  the host values (a deliberate two-part edit — production + contract — exactly the discipline the
  fixture's own header requires, lines 13–18). AGREE with that discipline.
- **Round-1 / round-2 casebooks** — cited as authority; filed unchanged.

## Value-crossing ledger — the two round-2 residuals re-struck against HEAD

Only the rows the round-2 residuals touched are re-verified here; every other row was confirmed in the
round-2 casebook. Ranges: `npPillClone` 345–356; `GHOST_BG`+helpers+`ghostApp` 358–497; `snapshotHome`
547–580; `start()` 582–655. Callee ranges: `showAppView` 550–558; overlay branch 632–638.

| Value | Class | Dir | Today (app.js) | Plan owner | Verified |
|---|---|---|---|---|---|
| `sourceHost`/`destinationHost` (values, not just keys) | object | in | not emitted (swipe.js:79–99) | `classifyTransition` computes; L1 reads | ✓ projection written (§3:160–169); matches `isOverlay`/`kindOf` and the app.js:622 source split; all 8 `STRUCTURAL_CASES` (swipe-plan-spec.mjs:45–54) values match; pinned + asserted per registry pair (F1-r **resolved**) |
| `d.ghostY` (capture) | object | out | 487 (`ghostApp` only) | `Capture.ghostY?` app-ghost only; L3 records only present fields | ✓ `snapshotHome` (578) emits only `animSync`/`animRes`; both readers null-guard (app.js:1163, 1212); L3 must not synthesize `ghostY` on the home path (F2-r **resolved**) |
| `d.animSync`/`d.animRes` (capture) | object | out | 495/578 | `Capture`, L1 returns/L3 records | ✓ both owned panes produce these |

Adapter (`tomeroam-js-dom`) source-pattern confirmations over the declared ranges: `d.ghostY`/`d.animSync`/
`d.animRes` (capture, 487/495/578); `d.movers`/`d.clobbered`/`d.live` (start(), 649/630/589);
`removeAttribute('data-art')` pre-mount (freezeArt, 376/480/567); `removeAttribute('id')` +
`classList.add('np-pill-float')` (npPillClone, 352/353); `document.body.appendChild` (354/491/574).
Callee-range classList tokens: `showAppView` — `classList.add('hidden')`, `classList.remove('parked')`,
`classList.add('hidden')` (555–557); overlay branch — `document.body.classList.remove('np-locked')` (634),
`classList.remove('hidden')` (636). All assigned to a single layer in §5, ordering preserved.

## Findings

The verdict is **forge**. No blocking finding remains: the three round-1 blockers (verified in the round-2
casebook) stand resolved, and the two round-2 residuals are resolved and re-verified below under *Prior
residuals*. The one open item this round is a cosmetic documentation tidy, filed as F1.

### F1 — Note — recommendation — the capture ledger row could mirror §3's optional `ghostY`

The machine-readable ledger row at plan §4:219 lists the capture value as `capture {ghostY,animSync,animRes}`,
naming all three fields, whereas §3:127 now marks `ghostY` optional (app-ghost only). This is a value-name
label rather than a type declaration, and the row's verification points at the capture test, so the
difference should mislead no reader. The planner might optionally tidy the label to signal `ghostY` as
app-ghost-only, for symmetry with §3 — a suggested cosmetic clarification, not binding, with no runtime
surface.

### Prior residuals — verified resolved (not open findings)

- **F1-r (was Structural) — resolved.** The kind→host projection is written out (§3:160–169), not left
  implicit, and I confirmed it is correct at every case, not merely plausible: `sourceHost` is `overlay`
  iff `fromKind==='overlay'` — identical to today's `fromOv = isOverlay(fromV)` gate on the source
  resolver (app.js:622); `destinationHost` maps `overlay→overlay`/`browse→browse-host`/`home→home`,
  matching `constructionPlanFor`'s branches (swipe.js:124–129). All eight `STRUCTURAL_CASES` host values
  match. The coverage now pins the host **values** (not just the key set) in the frozen spec and asserts
  them per registry pair, so a mis-projected host reddens the independent oracle — the guarantee the module
  exists to give now covers the fields the plan adds to it.
- **F2-r (was Weak) — resolved.** `Capture.ghostY` is optional and documented app-ghost-only (§3:127,
  180–187); L3 records only the fields the capture carries and must not synthesize `ghostY` on the home
  path — parity with today, where `snapshotHome` never sets it and both readers null-guard it.
- **F3-r (was Note) — resolved.** §7:319–322 states that a `home` destination takes `renderDestination
  'none'` and so never reaches `env.renderDestination`, making the two-value `Env` signature correctly
  narrower than the three-value classification field.

## Coverage

No blocking finding remains, so none is owed a new test. The plan's §8 matrix already carries the
verification for every resolved finding: F1-r (frozen-spec host values + per-pair proof), F2-r (back→home
records `animSync`/`animRes` with `d.ghostY` untouched), and the round-1 set. The cosmetic ledger-label
note owes no test (documentation only).

## Prediction — where this breaks in execution if built as written

It does not. The builder relocates the recipes behind `env`, and every wall the earlier drafts left
standing now has an owner: descriptor identity enters as `from`/`dest`, the host fields are computed by a
written projection and guarded per-pair by the frozen spec, the capture shape matches what each owned pane
actually produces, `d.clobbered` and the outgoing-capture-before-clobber order are pinned with reddening
mutations, and `GHOST_BG` resolves fresh through `env`. The one residual risk a plan review cannot retire —
that the implementation diverges from the specified seam — is exactly what the §8 matrix reddens. Build it.
