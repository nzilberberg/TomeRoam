# PLAN — Swipe/reveal Stage 6d (finalizationPlanFor.abortRender: retire the runtime `clobbered` byproduct for a pure, oracle-verified finalization decision)

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor","patterns":{"boundary_relocation":true,"callee_replacement":false,"contract_shape":true,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false},"project_adapter":"tomeroam-js-dom","source_ranges":["js/swipe.js:122-145","js/swipe.js:300-327","js/app.js:516-516","js/app.js:413-421","js/app.js:1145-1188"],"callee_ranges":[],"affected_contracts":["test/fixtures/swipe-plan-spec.mjs:40","test/swipe-transition.test.js:57","test/contract-function-gate.test.js:24","test/swipe-construction.test.js:30"],"staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"blocking_questions":["FP","AB","CLB","RC"]} -->

Status: **DRAFT — for Charpy (r2, after r1 TEMPER)** (2026-07-26). First Stage-6d slice, following shipped
Stage 6a (supersession recovery), 6b (loser-cancel), 6c (pane-less supersession + settle-phase identity
guard, build `ba1c59b`, Poirot SHIP / Mendeleev ADEQUATE / Loki HELD STONE). Sub-slice of
`PLAN-swipe-reveal.md` §7 step 6.

**Revised after Charpy r1 TEMPER (target `00874b5`).** The slice choice, the D-before-F dependency claim,
the equivalence promise, the fracture, and the Coverage-Model non-vacuity all verified sound and are
UNCHANGED. Three corrections: **(F1, blocking)** §2/§9 now enumerate EVERY HEAD reference to
`clobbered`/`sourceWasClobbered` with a per-site action (the exact-key Construction contract, the F6 test,
five `mutate.mjs` anchors, the model mirror + fingerprint, and comment sites) — the r1 subset omitted
gated tests whose reddening falsified the RG* "stays green" cells; the co-changes are now in-slice (§2
"Co-changed in-slice", §9). **(F2, tighten)** the byproduct's branch location is corrected: it is
initialized at swipe.js:300 and computed at :310 inside the INCOMING `renderDestination==='browse-host'`
branch (reached by {home→browse, browse→browse, overlay→browse}), NOT the outgoing `app-ghost` branch —
so the fracture names both computed-but-false cases (home→browse AND overlay→browse). **(planner-found,
beyond r1)** a latent NON-parity neither r1 nor the TEMPER caught: the retired `clobbered` = `cur.live &&
(browse→browse)`, so at the pre-build ARMED-supersession recovery reader (415) a pure `abortRender`
substitution would flip an ARMED browse→browse from render-FALSE to a spurious `#browse` re-render. The
recovery reader now carries the `cur.live` conjunct (byte-parity), `finPlan` is computed at ARM time so it
is defined there, and cell RC pins all three boundary points. This keeps the FULL retirement and the
load-bearing promise intact — it corrects WHERE the equivalence holds, honestly.

**Slice chosen ON THE MERITS by dependency, NOT by symptom-appeal (planner directive).** The deferred
set from 6c §11 splits into a dependency graph (§1a). Its two roots that depend on nothing else in the
set are (D) the declarative finalization decision `finalizationPlanFor` and (F) the pane-lifecycle
interface `release()`/`dispose()`/`equivalence`. **D is next, and D precedes F**: the pane-removal
policy F enforces is itself a field of the finalization plan D introduces (parent §3.3 `paneRemovalPolicy`
+ §3.4 `pane.release()/dispose(reason)`), so building F first would hand-code a removal policy D then
re-declares — a duplicate source of truth (EC §4.16). D is also the lower-risk root: a pure classification
function plus a behaviour-preserving decision extraction, with the project's strongest coverage pattern
(the independent three-layer oracle already proven for `constructionPlanFor`), and it lands entirely OFF
the flash-timing surface. **The flash-sensitive reveal centralization (I10/I17) and pane-owning
supersession stay deferred** (§11) — they are downstream of F, which is downstream of D. This slice is the
declarative spine the rest of step 6 composes from.

**Grounding.** The independent oracle is already scaffolded: `test/fixtures/swipe-plan-spec.mjs` carries
FROZEN `expectedFinalization: { abortRender }` per STRUCTURAL_CASE (lines 39–62), INERT since stage 4,
explicitly "added as `expectedFinalization` when stage 6 builds `finalizationPlanFor()`" and NOT yet
compared against production. Grounded against shipped HEAD (`ba1c59b`): `js/swipe.js`
`constructionPlanFor` (122–145) and `buildConstruction` where `sourceWasClobbered` is computed as a
RUNTIME byproduct of the actual build — initialized `false` at swipe.js:300 and computed
`sourceWasClobbered = resolveSource() === hostEl` at swipe.js:310, inside the INCOMING
`else if (plan.renderDestination === 'browse-host')` branch (305–310), reached by every browse-destination
{home→browse, browse→browse, overlay→browse} and true only when the real source IS the `#browse` render
host (browse→browse); `js/app.js` `start()` storing `d.clobbered = c.sourceWasClobbered` (516);
the three `clobbered` READ sites — the 6c supersession recovery (415), the held browse→browse abort
selector + render arg (1159–1160), and the no-pane abort render arg (1185); the settle-time stack
mutation keyed on `cur.dir`/`cur.newNav` (751–753, which is NOT this slice — §11). Grounded against the
real harness `test/app-harness.js`: aborts are driven through `h.touch` and the observable channel is the
successor/destination REAL DOM — `Browse.render` into `#browse`, `applyScreen`, `window.scrollTo` — plus
the frozen-oracle comparison in `test/swipe-transition.test.js`.

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: true** — the abort-re-render DECISION relocates from a RUNTIME byproduct
  (`sourceWasClobbered`, observed during `buildConstruction` in `js/swipe.js`, stored as `d.clobbered` in
  `js/app.js` and read at finalize) to a PURE DECLARED decision `finalizationPlanFor(classification)
  .abortRender` in `js/swipe.js`, consumed by the `js/app.js` finalize/recovery paths. The plan value
  crosses the L1 seam (swipe.js producer → app.js consumer); §4b ledgers it.
- **callee_replacement: false** — no indirection layer, callback, adapter, service, or event replaces a
  direct call. The finalize path still calls `applyScreen`/`Browse.render`/`window.scrollTo` directly; only
  the DATA that parameterizes them (the render flag) is now read from a computed plan rather than a stored
  runtime flag. This is a data-driven decision extraction, not a callee swap. (The heuristic may fire on
  the word "retire/extract"; declared false deliberately.)
- **contract_shape: true** — `finalizationPlanFor` introduces a new deep-frozen, exact-key return contract
  `{ abortRender: 'rerender' | 'none' }` (EC §4.11, gated by `test/contract-function-gate.test.js`), and
  turns on the frozen `expectedFinalization` oracle. §4b-contract gives the structural schema.
- **state_transfer: false** — no ownership boundary relocates. The gesture session still owns every
  resource (subsystem §8); the finalization plan is an IMMUTABLE VALUE computed at arm time and stored on
  the session (`cur.finPlan`), not an owned resource with a lifecycle/cleanup. No value's OWNERSHIP crosses
  a seam.
- **async_change: false** — no asynchronous surface, timing, or continuation changes. The settle rAF, the
  340ms/transitionend finalize triggers, the reveal double-rAF and the 600ms safety-net are UNTOUCHED
  (6b/6c parity). This is a synchronous decision-derivation change.
- **persistence_migration: false** — the gesture and its plan are in-memory, per-process (subsystem §15).
- **lifecycle_ownership: false** — no resource lifecycle or ownership endpoint changes. The retired
  `clobbered` was a plain boolean, not an owned resource; the new `abortRender` is an immutable plan field.
  No create/borrow/release/dispose semantics move.

## Index
1. Defining records and authority
1a. Dependency analysis over the deferred set (why D is next; the graph)
2. Exact scope boundary
3. The finalization-decision contract (invariant, not prescription)
4. Value-crossing ledger and the finalization-plan contract schema
5. Runtime-dependency policy
6. Ordering contract
7. Coverage Model (Mendeleev catalog)
8. Coverage and mutation matrix
9. Records reconciliation (apply on approval)
10. What this does NOT do (deferred, with reasons)
11. Sequencing

## 1. Defining records and authority

**Verdict: AGREE.** No two defining records disagree on required behaviour. The strategic design
(`PLAN-swipe-reveal.md` §3.3) already mandates `finalizationPlanFor` and that `clobbered` "DOES NOT EXIST
in the target vocabulary"; the frozen spec already carries the `expectedFinalization.abortRender` data;
the subsystem §23 revision condition names stage 6 as the finalization-centralization stage. This slice
lands the smallest sound piece of that: the abort-re-render decision, oracle-verified, retiring the
`clobbered`/`sourceWasClobbered` duplicate. One reconciliation note (not a conflict): subsystem §23 also
names `sourceHost`/`destinationHost`/`sameBrowseHost` reintroduction — those are DEFERRED to the slice
whose consumer needs them (the pane/lease/source-resolution work), because `abortRender` is derivable from
`fromKind`/`toKind` alone and emitting host fields now would be dead fields (§4.15/§10).

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `PLAN-swipe-reveal.md` §3.3 | `planFor(classification)` returns `{ ..., commit, abort, ..., paneRemovalPolicy }`; "`clobbered` DOES NOT EXIST in the target vocabulary. Its only consequence is expressed directly: browse→browse abort `render:'rerender'`; everything else `render:'none'`." | Plan-of-record (strategic) | Realizes the abort half of `planFor` as `finalizationPlanFor(classification).abortRender` (`'rerender'` iff `fromKind==='browse' && toKind==='browse'`), and RETIRES `clobbered`/`sourceWasClobbered`. `commit`/`scroll`/`stackEffect`/`reveal`/`paneRemovalPolicy` DEFER to later slices with their consumers (§10) | Annotate §7 step 6 sub-sliced (§9) |
| `test/fixtures/swipe-plan-spec.mjs` (39–62) | Carries FROZEN `expectedFinalization: { abortRender: 'rerender'\|'none' }` per STRUCTURAL_CASE ('rerender' only for browse→browse); "NOT consumed by production in stage 4 (`finalizationPlanFor` lands in stage 6) and NOT compared against production yet." | Independent oracle (verified tooling, EC §2 precedence 3) | Turns the frozen data ON: `test/swipe-transition.test.js` now compares production `finalizationPlanFor` against `expectedFinalization` across all 8 cases (§4.14 three-layer oracle; cell FP). The DATA is unchanged — only made live | Remove the "NOT consumed / absence must not be read as verified" caveat from the fixture header (§9) |
| `js/swipe.js buildConstruction` (300, 310) | `sourceWasClobbered` initialized `false` at :300, computed `resolveSource() === hostEl` at :310 inside the INCOMING `else if (plan.renderDestination === 'browse-host')` branch — a RUNTIME byproduct of the actual build. The compute runs for EVERY browse-destination {home→browse, browse→browse, overlay→browse}; the value is `true` only for browse→browse (source IS the `#browse` host). | Code under change | RETIRED. The abort decision is no longer an observed build byproduct but a declared `finalizationPlanFor` decision from the classification kinds. This closes the fracture that `sourceWasClobbered` (runtime, computed in the browse-host-render branch) could diverge from the intended static rule (sameBrowseHost = browse→browse only) — see the Loki target, §3 | — |
| `js/app.js` `clobbered` set (516) + reads (415, 1159–1160, 1185) | `d.clobbered = c.sourceWasClobbered` (516); read at the 6c recovery render arg (415), the held browse→browse abort branch SELECTOR + render arg (1159–1160), and the no-pane abort render arg (1185). | Code under change | All read sites consume `cur.finPlan.abortRender === 'rerender'` instead; `clobbered` and `sourceWasClobbered` are DELETED (EC §4.16 — no cause + separately-stored derived consequence). Byte-identical behaviour (§3 parity; the retired byproduct equals the declared decision on every reachable transition) | — |
| `EngineeringContract.md` §4.16 | "Do not store both a cause and a separately mutable derived consequence ... Derive convenience values at the use site." | Core rule | The exact rule this slice satisfies: `clobbered`/`sourceWasClobbered` was a stored derived consequence of the transition class; it is replaced by deriving `abortRender` from the classification. No `sameBrowseHost` FIELD is stored either (it too is derivable from `fromKind`/`toKind`) — the decision is derived at its one use site, `finalizationPlanFor` | — |
| `EngineeringContract.md` §4.14 | Three independent layers: declarative spec → production → comparison; "generate expected output from production output" is forbidden. | Core rule | `finalizationPlanFor` is layer 2; the frozen `expectedFinalization` is layer 1 (hand-written, not generated); `swipe-transition.test.js` is layer 3 (cell FP). The generator `gen-transition-matrix.mjs` RENDERS the spec, never calls the planner (subsystem §17) — unchanged | — |
| `EngineeringContract.md` §4.15 | "Do not introduce a field until the same implementation slice contains a real production consumer and a test proving that consumer uses it." | Core rule | `abortRender` has a current-slice consumer (the finalize/recovery render decision) and a test proving consumption (cell AB). No host field (`sourceHost`/`destinationHost`/`sameBrowseHost`) is emitted — no consumer for them in this slice (§10) | — |
| `EngineeringContract.md` §4.19 | Classify every change as extraction / known-red / new policy / migration / cleanup. | Core rule | Behaviour-preserving EXTRACTION (parity): the abort render behaviour is byte-identical; only its DERIVATION relocates from runtime byproduct to declared decision. No known-red, no new policy, no PolicyLedger entry added | — |
| `PLAN-swipe-reveal.md` §7 step 6 | "Centralize finalization and reveal ordering (I10, I17)." | Plan-of-record (staging) | Delivers the first declarative-finalization decision (`finalizationPlanFor.abortRender`) — the spine the reveal-ordering (I10/I17) and pane-removal-policy work compose from. The reveal-ordering/paint half stays deferred (§10) | Annotate §7 step 6 sub-sliced (§9) |
| `Subsystems/swipe-reveal.md` §17/§23 | §17: the three-layer oracle + `finalizationPlanFor` composes the rich `planFor()`. §23: stage 6 "reintroduc[es] `sourceHost`/`destinationHost`/`sameBrowseHost` with their consumers." | Subsystem addendum | §17 realized for `abortRender`. §23: the host-field reintroduction is DEFERRED to its consumer slice (not 6d) — an explicit scoping decision (§4.15), recorded, not a contradiction | Rewrite §17/§23 to current truth (§9) |

Authority precedence: the strategic plan (§3.3, `clobbered` does not exist) and the frozen oracle govern
the target shape; EC §4.14/§4.15/§4.16 govern that the decision is derived-not-stored and oracle-verified;
the harness (verified tooling) governs what is observable and therefore that the abort behaviour driven
through the real path is the load-bearing consumer proof.

## 1a. Dependency analysis over the deferred set (why D is next; the graph)

The 6c §11 deferred set, as a dependency graph (an arrow X → Y reads "Y requires X"):

- **D — `finalizationPlanFor` + declared finalization decisions.** Depends on nothing else in the set
  (pure classification + a behaviour-preserving decision extraction). **This slice = the `abortRender`
  first inhabitant of D.**
- **F — pane lifecycle `release()`/`dispose(reason)`/`equivalence` + `paneRemovalPolicy`.** Depends on
  nothing else in the set structurally, BUT the removal POLICY it enforces is a field of D's plan (parent
  §3.3 `paneRemovalPolicy`, §3.4 "pane.release() ... Obeys I10"). **D → F** (build the declared policy
  before its enforcement mechanism, else F hand-codes a policy D re-declares — EC §4.16 duplicate).
- **C — I10/I17 paint-gated reveal centralization (the flash-sensitive core).** `pane.release()` is the
  mechanism I10 is expressed in (parent §3.4). **F → C.**
- **B — pane-owning supersession {home→browse, browse→browse, browse→home, overlay→home}.** Requires
  disposing an owned pane on supersession (`dispose('superseded')`, parent §3.4) → **F → B**; and its
  reveal-phase sub-case disposes a held-to-paint pane → **C → B(reveal)**.
- **G — full `recoverSession({reason, phase})` pre/post-stack matrix.** Keys on the authority boundary,
  a finalization-plan concept, and post-stack recovery needs the finalize restructure. **D → G**, with C.
- **A — null-on-retire writes + `transitionListener` ownership.** Consumer is a retired-while-`cur===session`
  reader, which exists only once the HELD REVEAL is supersedable. **B/C → A** (unchanged from 6c §11 / 6b §11).
- **Independent** — the headline compositor flash (parent §6: JS cannot see it; not fixed by any of this)
  and the `fadePanes` per-pane `setTimeout` (belongs with the pane abstraction, F).

Roots (in-degree 0 within the set): **D** and **F**. D precedes F (above). Therefore **D is the correct
next foundation**, and its smallest sound inhabitant — the one finalization decision already frozen in the
oracle and already varying by transition with a live consumer — is `abortRender`. Everything else in the
set sequences strictly behind D→F. This is not the flash fix, and it is not even pane-owning supersession;
it is the declarative anchor both of those ultimately consume. **No escalation:** the two roots are not
equally-valid — the D-before-F ordering is forced by the paneRemovalPolicy-is-a-plan-field dependency, and
no defining record contradicts another (the §23 host-field note is a scoping deferral, resolved above).

## 2. Exact scope boundary

Behavioural ownership, not function names. The runtime CHANGES are: a NEW pure function in `js/swipe.js`;
the DELETION of the `sourceWasClobbered`/`clobbered` byproduct; and the redirection of the `clobbered` read
sites in `js/app.js` to the declared decision. No reveal timing, no paint gate, no hold/drop control flow,
no pane disposal, no async surface changes. Because `clobbered`/`sourceWasClobbered` is referenced across
the test/tooling surface (the exact-key construction contract, five mutation anchors, the model mirror +
fingerprint, and several comments), the retirement is only complete when EVERY HEAD reference is co-changed
in the same commit — enumerated below (Charpy r1 F1). Omitting them reddens gated tests, which would
falsify the RG* "existing suite stays green" cells; the behavioural suites stay green, the retirement-
touched contract/anchor/fingerprint tests are UPDATED in-slice (§9 states each).

**Changes:**
- **`finalizationPlanFor(classification)` added to `js/swipe.js` (near `constructionPlanFor`, ~122–145).**
  A pure, DOM-free function returning a deep-frozen exact-key `{ abortRender: 'rerender' | 'none' }`, with
  `abortRender === 'rerender'` iff `classification.fromKind === 'browse' && classification.toKind ===
  'browse'` (the sole same-browse-host transition), else `'none'`. No default branch — an unhandled kind
  THROWS, mirroring `constructionPlanFor`'s own-contract guard (§4-contract). Exported and included in the
  module's public surface alongside `classifyTransition`/`constructionPlanFor`.
- **`sourceWasClobbered` retired from `js/swipe.js buildConstruction` (300, 310), and `clobbered` retired
  from `js/app.js` (initialized at 439, set at 516).** The runtime byproduct and the stored session flag
  are DELETED (EC §4.16). The finalization plan is computed and stored on the session AT ARM TIME (the
  session literal, 439, replacing `clobbered: false`): `d.finPlan = Swipe.finalizationPlanFor(
  Swipe.classifyTransition({ from, to: dest }))` (frozen). `from`/`dest` are already resolved at arm
  (431/437), so `finPlan` is DEFINED for every non-null session — ARMED, DRAGGING, SETTLING alike — exactly
  as `clobbered: false` was defined at arm (this is load-bearing: the 415 recovery reader can run for an
  ARMED, not-yet-built session; §6).
- **The `clobbered` read sites in `js/app.js` consume the declared decision, reproducing `clobbered`
  byte-for-byte.** The retired `clobbered` equals `cur.live && (browse→browse)` — build ran (`d.live = true`
  at 474 gates the 516 set) AND the transition re-renders on abort — so it decomposes as
  `cur.live && cur.finPlan.abortRender === 'rerender'`:
  - **the finalize abort sites (built by construction — `finalize` runs only post-settle-post-build, so
    `cur.live` is always true there):** the held browse→browse abort branch SELECTOR (1159) and its render
    arg (1160) → `if (!commit && cur.finPlan.abortRender === 'rerender')` / `applyScreen(dest, { render: true, ... })`;
    the no-pane abort render arg (1185) → `applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', ... })`.
  - **the 6c/6a supersession recovery reader (415), which ALSO serves a pre-build ARMED session:**
    `render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false` — the `cur.live` conjunct
    reproduces `clobbered`'s "build actually ran" half, so an ARMED browse→browse superseded before the 8px
    lock still renders FALSE (byte-parity; without the conjunct it would wrongly re-render `#browse` — an
    unnecessary flash-adjacent repaint). Cell RC pins BOTH the render-TRUE (built browse→browse mid-drag)
    and render-FALSE (overlay→browse, and ARMED browse→browse) boundaries.
- **The frozen oracle turned on.** `test/swipe-transition.test.js` compares production `finalizationPlanFor`
  against `expectedFinalization.abortRender` for every STRUCTURAL_CASE (cell FP), and the fixture header
  caveat ("NOT consumed / absence must not be read as verified") is removed (§9). The DATA is unchanged.

**Co-changed in-slice — the complete `clobbered`/`sourceWasClobbered` HEAD scrub (Charpy r1 F1; without
these, gated tests go red):**
- **`test/swipe-construction.test.js` — the exact-key Construction contract (30, 122, 129) drops
  `sourceWasClobbered` (four keys → three: `{capture, decorations, movers}`); the F6 test (218–237,
  asserting `sourceWasClobbered` per transition) is DELETED, its intent folded into cells FP+AB.** This is
  an affected exact-key contract (declaration `affected_contracts`).
- **`tools/mutate.mjs` — five anchors embed the retired lines and would stale `test/mutation-anchors.test.js`.**
  Re-point the four recovery-line anchors (`HARDRESET_DISPOSE_FROM` 57–60, `VR_HOLD_ORDER_FROM/TO` 64–75,
  `RECOVERY_RENDER_LINE` 99, `F1_ORPHAN_RESETSCROLL_TO` 105) from `render: cur ? cur.clobbered : false` to
  the new `render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false` form (each anchor's
  PURPOSE is unchanged — pane-strand, hold-order, SR render-false, orphan resetScroll — only the embedded
  string moves). Re-point the swipe5 F6 anchor (399–402, `sourceWasClobbered = resolveSource() === hostEl` →
  `false`) to a `finalizationPlanFor` mutation (force `abortRender: 'none'`), reddened now by FP+AB. Update
  the anchor prose comments that mention `d.clobbered` (48–56, 92–97, 223).
- **`tools/gen-swipe-model.mjs` (235, 242, 412, 413, 434) — the model mirror hard-codes `d.clobbered` prose;
  and `test/swipe-model.test.js` FINGERPRINTS the changed `js/app.js`/`js/swipe.js` regions.** Update the
  mirror rule to the `finPlan.abortRender` derivation, then RECONCILE + REGENERATE `docs/swipe-model.generated.txt`
  and update the fingerprint pin — a build-step obligation Brunel runs in-slice (a source-text/fingerprint
  gate, kept separate from behavioural sweeps — §4.10).
- **Comment/message-only sites (behaviour parity; text update): `js/app.js:466`
  (`capture/clobbered/movers`), `test/swipe-invariants.test.js:378`, `test/swipe-stage6.test.js`
  (110, 112, 123, 136, 268, 288, 299 — the NC/orphan cells; behaviour is byte-parity because overlay-source
  `abortRender` is `'none'` == the old `clobbered:false`, and the orphan null-guard now reads `finPlan`),
  `test/swipe-stage6b-loser-cancel.test.js:53`.**

**Out of scope for the scrub (Charpy r1 F3): `Claude/Loki/` archived strike casebooks that reference
`d.clobbered`.** They are ARCHIVAL records of what was true when written (StandardsDocument §6 — a record
is not current-truth code) and STAY unchanged. Unrelated generic `clobber` usages
(`test/plexconn.test.js`, `test/shardstore.test.js`, `test/logic.test.js`, `test/app-integration.test.js`,
`test/OFFLINE_CHECKLIST.md`) are a different word, not the swipe field — untouched.

**Stays exactly as today (BEHAVIOURAL parity — do NOT re-touch):**
- **The reveal choreography.** `holdGhostUntilPaintable`, the reveal double-rAF and 600ms paint/timeout
  gates, `revealPending`, `dropPanes`, `drop`, `fadePanes`, `watchFrames`, the decode/paint marks — ALL
  UNCHANGED. 6d changes only the applyScreen RENDER-FLAG DERIVATION and the abort branch SELECTOR VALUE
  (byte-identical to `clobbered`), never reveal TIMING or the hold/drop control flow (cell RGheld pins this
  — the flash surface is untouched).
- **The commit path.** `commit → home` (held reveal) and `commit → browse/overlay` (render:false)
  decisions are unchanged (RGcommit); this slice touches ONLY the abort render flag.
- **The settle-time stack mutation (751–753, keyed on `cur.dir`/`cur.newNav`)** — the `stackEffect` /
  descriptor-identity decision is NOT `finalizationPlanFor`'s in this slice (deferred §10).
- **`scroll` policy.** The abort scroll-restore (`window.scrollTo(0, cur.scroll0)`, `resetScroll:false`)
  is uniform across aborts and stays inline — not extracted (deferred with the commit/scroll plan half, §10).
- **6b loser-cancels and the 6c identity guard / negative gate** — untouched (RG6bc regression).

**Split across the seam:** the finalization DECISION (produced by `finalizationPlanFor` in `js/swipe.js`,
stored on the session) crosses to its CONSUMER (the `js/app.js` finalize/recovery render decision). The
EFFECTS (`applyScreen`/`Browse.render`/`scrollTo`) stay in `js/app.js` (parent §7.5 "the destination render
dispatch and the Browse hold stay in app.js"). §4b ledgers the crossing.

**Deferred (§10 expands, with the consumer each waits on):** the rest of the finalization plan
(`commit` screen/scroll, `abort` scroll as a plan field, `stackEffect`, `reveal`/`paneRemovalPolicy`) and
the unified rich `planFor()` wrapper; host fields (`sourceHost`/`destinationHost`/`hiddenHostState`); the
pane-lifecycle interface (F); pane-owning supersession (B); I10/I17 reveal centralization (C, the flash
core); the `recoverSession` matrix (G); the null-bookkeeping + `transitionListener` ownership (A).

## 3. The finalization-decision contract (invariant, not prescription)

**Invariant (the load-bearing promise).** For every reachable transition, each abort/recovery re-render
decision that read `clobbered` now reads the pure declared `finalizationPlanFor.abortRender` (the recovery
reader additionally gated by `cur.live`), and the result equals the byte-for-byte behaviour the retired
runtime byproduct produced:

1. **The decision is declared, pure, and singular.** `finalizationPlanFor(classification).abortRender` is
   `'rerender'` iff the transition is browse→browse (both endpoints share the one `#browse` host), else
   `'none'`. It is a pure function of the classification kinds — no DOM, no build side effect, no stored
   flag (EC §4.16). The frozen `expectedFinalization` oracle proves it for all 8 structural cases (cell FP).
2. **The finalize path consumes it.** The finalize abort sites (the held browse→browse abort selector+arg
   1159–1160, the no-pane abort arg 1185) read `cur.finPlan.abortRender === 'rerender'`. Because `finalize`
   runs only post-settle-post-build, `cur.live` is always true there, so `abortRender==='rerender'` alone
   equals the retired `clobbered` at those sites. Driving a real abort, browse→browse re-renders `#browse`
   (`Browse.render`, `render:true`); every other abort does NOT (`render:false`); scroll is restored to
   start (cell AB).
2b. **The supersession recovery reader (415) reproduces `clobbered` in full — the build-ran conjunct.**
   `clobbered` was set true only when build ran (`d.live = true` at 474 gates the 516 set) AND the source
   `#browse` host was overwritten (browse→browse). So `clobbered ≡ cur.live && (browse→browse) ≡ cur.live
   && cur.finPlan.abortRender === 'rerender'`. The 415 reader — which ALSO serves a pre-build ARMED session
   (a second touch before the 8px lock) — reads `cur.live && cur.finPlan.abortRender === 'rerender'`, byte-
   parity with `clobbered` at every reachable recovery state: an ARMED browse→browse (`live:false`) renders
   FALSE (nothing was rendered into `#browse` to restore — dropping the `cur.live` conjunct would wrongly
   re-render it, a flash-adjacent repaint); a DRAGGING/built browse→browse renders TRUE; an overlay→browse
   renders FALSE. Cell RC pins all three boundary points; the mutation "drop `cur.live`" reddens the ARMED
   case.
3. **Parity with the retired byproduct (the fracture point — the Loki target).** The retired
   `sourceWasClobbered` was `resolveSource() === hostEl`, computed inside the INCOMING
   `renderDestination === 'browse-host'` branch — which runs for EVERY browse-destination
   {home→browse, browse→browse, overlay→browse}, and yields `true` ONLY for browse→browse (source IS the
   `#browse` host). The load-bearing risk is a transition where the OLD runtime byproduct and the NEW
   static decision DISAGREE. There are TWO computed-but-false cases the decision must not flip to
   `'rerender'`: **home→browse** (source `#home` ≠ the `#browse` host) and **overlay→browse** (source an
   overlay ≠ the `#browse` host). A naive `finalizationPlanFor` keyed on the compute-branch condition
   `renderDestination === 'browse-host'` would wrongly say `'rerender'` for BOTH; one keyed on
   `outgoing === 'app-ghost'` would wrongly say it for home→browse. `abortRender` MUST therefore key on
   `fromKind === 'browse' && toKind === 'browse'` (sameBrowseHost), NEVER on the browse-host-render branch
   nor on the app-ghost path. Grounded: with that keying, all 8 cases match the retired byproduct exactly
   (browse→browse: byproduct true, decision 'rerender'; home→browse and overlay→browse: byproduct computed
   false, decision 'none'; every non-browse-destination: byproduct never computed/false, decision 'none').
   Cell AB's mutation keys `abortRender` on `renderDestination === 'browse-host'` (the compute branch),
   reddening on BOTH home→browse and overlay→browse; the Loki strike attacks precisely whether any
   reachable state makes the declared decision diverge from the observed clobber it replaces.
4. **No duplicate source of truth.** `clobbered` and `sourceWasClobbered` are DELETED; every reader reads
   the declared decision (the recovery additionally reading `cur.live`, an existing session field, to
   reproduce the build-ran half) — EC §4.16; cell CLB.

**Basis (U11).** Items 1–2b realize `PLAN-swipe-reveal.md` §3.3 (`clobbered` does not exist; abort
`render:'rerender'` iff browse→browse) and the frozen oracle. The rule is fixed and singular because
exactly one predicate satisfies parity across all 8 cases: `fromKind==='browse' && toKind==='browse'`
(and, at the pre-build recovery reader, conjoined with `cur.live`). The
LOCUS (a standalone `finalizationPlanFor` vs folding into `constructionPlanFor`) is a **recommendation** —
a separate pure function is preferred because it is the seam later finalization fields extend into; the
invariant is "the abort re-render equals the declared same-browse-host decision, byte-identical to the
retired byproduct."

**Why parity at the user layer (honesty).** The abort render behaviour is byte-identical on every reachable
transition; nothing the user sees changes. The value is structural: the decision is now declared and
oracle-verified rather than an observed build byproduct, `clobbered` stops being a second source of truth,
and the finalization spine exists for the reveal-ordering / pane-removal-policy work to compose from.

## 4. Value-crossing ledger and the finalization-plan contract schema

### 4a — Value-crossing ledger (boundary_relocation)

The load-bearing crossing this slice adds is the declared finalization decision produced in `js/swipe.js`
and consumed by the `js/app.js` finalize/recovery render decisions. The retirement of `clobbered`/
`sourceWasClobbered` is a REMOVAL (documented in §2/§3/§9/CLB), not a crossing, so it is not rowed.

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
finPlan.abortRender decision read at the abort finalize sites | string | in | finalizationPlanFor@S6d | finalize abort branch@S6d | finalizationPlanFor | per-gesture | FP oracle and AB abort-render test
finPlan.abortRender decision read at the 6c supersession recovery | string | in | finalizationPlanFor@S6d | begin recovery@S6d | finalizationPlanFor | per-gesture | RC recovery-parity test
```

Notes: both rows are `in` — the finalize/recovery site reads the declared decision (produced by
`finalizationPlanFor` at arm time and stored on the session) and compares to `'rerender'`. The single
owner is `finalizationPlanFor`. No value is produced in a stage later than consumed (all S6d). No stored
`clobbered`/`sourceWasClobbered`/`sameBrowseHost` field is rowed — each is retired or derived at the use
site (§4.16).

### 4b — Finalization-plan contract schema (contract_shape)

`finalizationPlanFor` returns a deep-frozen, exact-key object with one member; the `abortRender` enum is
closed (`'rerender' | 'none'`) and validated by `test/contract-function-gate.test.js` (EC §4.11: exact
keys, every enum, deep freeze, clone-before-freeze for any caller array). No unknown fields; no dead field.

```vitruvius-contract
# field | class
abortRender | string
```

Structural notation (the exact return shape):

```
finalizationPlanFor(classification: { fromKind, toKind, decorations })
  -> Object.freeze({ abortRender: 'rerender' | 'none' })   // 'rerender' iff fromKind==='browse' && toKind==='browse'
```

The composed rich `planFor()` wrapper (parent §3.3, uniting construction + finalization + pane-removal) is
DEFERRED until ≥2 finalization fields justify it (§10); 6d stores `cur.finPlan = finalizationPlanFor(c)` at
ARM time (the session literal), immutable, so it is defined for every non-null session including a pre-build
ARMED one (§6).

## 5. Runtime-dependency policy

`finalizationPlanFor` reads ONLY its `classification` argument (`fromKind`/`toKind`) — no ambient
`document`/`window`/`Element`/`getComputedStyle`, no closure constant, no module-load DOM access. It is a
pure function that keeps `js/swipe.js` DOM-free at module load (the same posture as `classifyTransition`/
`constructionPlanFor`; the require()-no-DOM gate stays green). The `js/app.js` consumer introduces NO new
ambient read: it reads `cur.finPlan.abortRender` (and, at the recovery, the existing `cur.live` field),
computed at ARM time from `Swipe.classifyTransition({ from, to: dest })` — a pure call over descriptors the
session already resolved (431/437) — replacing reads of `cur.clobbered` that were themselves session state.
Calling `classifyTransition` at arm is new only in TIMING (it already runs in `buildConstruction`); it
touches no ambient global. The deleted `sourceWasClobbered` REMOVES an ambient dependency
(`resolveSource() === hostEl` compared a live DOM element during the build) — the new decision needs no DOM
at all. No value is lazily cached; `finPlan` is computed once per gesture at arm and frozen.

## 6. Ordering contract

**Correctness requirement (cells AB/RC) — the finalization plan is available before ANY reader.**
`cur.finPlan` is computed and frozen at ARM time (the session literal, replacing `clobbered: false`),
BEFORE the gesture can drag, settle, or be superseded. This is LOAD-BEARING for the recovery reader (415):
a second touch can supersede a not-yet-built ARMED session, and that reader dereferences `cur.finPlan` —
so `finPlan` must exist at arm, exactly as `clobbered: false` did. A design that computed `finPlan` at
`start()`/build instead would leave it `undefined` for an ARMED-superseded session and the reader would
throw (a regression on a reachable path). Every consumer — the finalize abort branch and the `begin()`
supersession recovery — therefore reads a plan that already exists (U5 reachability).

Incidental (not a new universal order): within `runFinalize`, the abort branch SELECTOR (1159) reads
`cur.finPlan.abortRender` at the same point it read `cur.clobbered`; the render args (415/1160/1185) are
substituted in place (415 gains the `cur.live` conjunct — §2/§3 item 2b). The reveal-hold ordering
(`revealPending` → `holdGhostUntilPaintable` → `drop`) and the 6b/6c cancel/guard positions are PRESERVED
unchanged — 6d moves no finalize ordering.

## 7. Coverage Model (Mendeleev catalog)

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes (parity) | The finalization plan is created at arm time (defined for ARMED sessions too) and read at settle→finalize / recovery; the reveal-hold phase sequence is UNCHANGED (cells FP, AB, RC; RGheld). |
| Identities | N/A | No identifier is created, changed, or reinterpreted; `d.id`/`sessionSeq` unchanged. |
| Ordering | Yes | `finPlan` is stored before any consumer reads it (§6); the abort branch selector reads the declared decision at the same point (cells AB, RC). |
| Resources: acquired / owner / endpoint | N/A | No resource lifecycle changes; `finPlan` is an immutable value, not an owned resource; the ownership endpoint is unchanged. |
| Async operations | N/A | No asynchronous surface, timing, or continuation changes (6b/6c handles untouched — RG6bc). |
| Stale completions | N/A | No new continuation; the 6c cross-session identity guard and 6b loser-cancels are untouched (RG6bc). |
| Normal completion | Yes (parity) | Commit finalization (screen/scroll) unchanged (RGcommit); abort finalization is byte-identical via the declared decision (AB, RGabort). |
| Recovery authority boundary | Yes | The 6c pane-less supersession recovery reads the declared decision instead of `clobbered` and behaves identically (always `'none'` for the reachable pane-less/overlay set) (cell RC). |
| Emergency disposal | N/A | No pane disposal path changes; the reveal drop / hard-reset are untouched (deferred §10). |
| Persistence | N/A | The gesture and its plan are in-memory, per-process (subsystem §15). |
| External side effects | Yes | The abort `Browse.render`/`applyScreen`/`window.scrollTo` outcome is driven by the declared decision — browse→browse re-renders `#browse`, others do not (cell AB). |
| Invariants | Yes | I11 (visible screen agrees with outcome) preserved — the abort screen/render is byte-identical; the §3.3 "clobbered does not exist" target is realized for the abort re-render (FP, AB, CLB). |
| Mutation cases | Yes | Each cell in §8 names a misattribution/wrong-derivation mutation observable on a real channel (key `abortRender` on `renderDestination==='browse-host'` so home→browse AND overlay→browse wrongly re-render; flip the oracle; reintroduce a `clobbered` read; leave a stale anchor). |
| Known-red | N/A | Behaviour-preserving extraction; no known-red introduced; PolicyLedger unchanged (§4.19). |
| Composition | Yes | The declared decision composes with the shipped finalize/reveal choreography (unchanged — RGheld), the 6c recovery (RC), and is the seam the deferred commit/scroll/stackEffect/reveal fields and the pane-removal policy extend into (§10). |
| Contract claims (exact schema) | Yes | `finalizationPlanFor` returns the exact-key deep-frozen `{ abortRender }` with a closed enum, gated by `test/contract-function-gate.test.js` (§4b; FP). |
| Concurrency | N/A | Single-writer within the process (subsystem §6); no concurrency change. |
| Observability | Yes | FP asserts on the independent-oracle comparison (`swipe-transition.test.js`); AB/RC assert on the REAL destination DOM via `h.touch` (`Browse.render`/`applyScreen`/`scrollTo`); CLB on a labeled source-text gate — no vacuous or unobservable cell. |

## 8. Coverage and mutation matrix

Every load-bearing promise and parity obligation maps to at least one production-facing test, each with a
mutation that reddens it on a REAL channel. FP is the independent three-layer oracle; AB/RC drive the real
`start()`→`settle()`→`finalize()`/`begin()` path through the app-harness (`h.touch`) and assert on the real
DOM; CLB is a labeled source-contract sweep (§4.10 — behavioural vs source-text sweeps kept separate).

| id | Behavior proved | Fixture / transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| FP | production `finalizationPlanFor(classification).abortRender` equals the frozen `expectedFinalization.abortRender` for all 8 STRUCTURAL_CASES ('rerender' only for browse→browse) | the frozen `swipe-plan-spec.mjs` STRUCTURAL_CASES compared in `swipe-transition.test.js` (three-layer oracle) | key `abortRender` on `renderDestination==='browse-host'` (so home→browse AND overlay→browse become 'rerender'), or flip any case → production diverges from the hand-written frozen spec | oracle (spec vs production) |
| AB | driving a real ABORT, browse→browse RE-RENDERS `#browse` (`Browse.render`, `render:true`) and every other abort does NOT (`render:false`); scroll restored to start; driven by `finPlan.abortRender`, not `clobbered` | app-harness `h.touch` live drag → release below threshold (abort) on browse→browse (books→books) AND on home→browse AND overlay→browse (the two computed-but-false cases) | key `abortRender` on `renderDestination==='browse-host'` (the byproduct's compute branch) → BOTH the home→browse and overlay→browse aborts wrongly re-render `#browse` (the fracture point, §3); OR revert a read site to a (removed) `clobbered` → wrong/undefined render | wiring (real DOM: `Browse.render`, `applyScreen`, `scrollTo`) |
| CLB | `cur.clobbered` and `sourceWasClobbered` no longer exist anywhere in HEAD (production + the co-changed contract/anchors); the Construction exact-key contract is `{capture, decorations, movers}` (three keys) and the finalize/recovery paths + the five mutation anchors reference `finPlan.abortRender` | a source-contract sweep asserting the identifiers are absent from `js/app.js`/`js/swipe.js`; `test/swipe-construction.test.js` CONSTRUCTION_KEYS has three keys; `test/mutation-anchors.test.js` resolves every re-pointed anchor | reintroduce a `clobbered`/`sourceWasClobbered` read, or leave `sourceWasClobbered` in the contract, or leave a stale anchor → the source-text/anchor gate reddens (labeled source-text, NOT behavioural — §4.10) | source-contract (SOURCE_TEXT + anchor gate) |
| RC | the supersession recovery reader (415) reproduces `clobbered` at all THREE reachable boundary points via `cur.live && abortRender==='rerender'`: render-TRUE for a DRAGGING/built browse→browse mid-drag; render-FALSE for an overlay→browse (abortRender 'none'); render-FALSE for an ARMED, not-yet-built browse→browse (`cur.live` false) | (true) the shipped 6a browse→browse (Authors-over-Books) dragging-supersession VR/SR fixtures; (false-overlay) the shipped 6c overlay→browse (options→books) supersession fixtures; (false-armed) a browse→browse armed then superseded before the 8px lock — all re-run with `clobbered` retired | drop the `cur.live` conjunct → the ARMED browse→browse recovery wrongly re-renders `#browse`; OR key on the wrong predicate so the built browse→browse stops re-rendering / the overlay one starts; OR leave a stale `clobbered` read | wiring (recovery real DOM, three boundaries) |
| RGabort | the shipped abort suite stays green — browse→browse re-render + scroll restore; overlay→browse and others no re-render | the existing abort fixtures (unchanged) | any behaviour change in the abort render/scroll outcome | wiring (existing green) |
| RGheld | the held-reveal choreography is UNTOUCHED — commit→home and browse→browse-abort still hold the pane and drop at the same paint/timeout gate; reveal TIMING unchanged (the flash surface is not touched) | the existing held-reveal fixtures (commit→home, abort browse→browse) | any change to the reveal hold/drop timing, the double-rAF/600ms gates, or `dropPanes` → the held-reveal timing regression reddens | wiring (existing green — flash-surface pin) |
| RGcommit | commit finalization (destination screen + scroll) is unchanged; only the abort render flag moved | the existing commit fixtures (commit→home, commit→browse, commit→overlay) | the slice alters a commit decision | wiring (existing green) |

**Machine-readable coverage (gate).** Each blocking question (FP/AB/CLB/RC) has a complete row; the RG*
rows pin shipped parity.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
FP | production finalizationPlanFor abortRender equals the frozen expectedFinalization abortRender for all eight structural cases rerender only for browse to browse | the frozen swipe-plan-spec STRUCTURAL_CASES compared against production in swipe-transition test as the three layer oracle | key abortRender on renderDestination equals browse-host so home to browse and overlay to browse become rerender or flip any case so production diverges from the hand written frozen spec | oracle spec versus production
AB | driving a real abort browse to browse re-renders the browse host with render true and every other abort does not with render false and scroll is restored to start driven by finPlan abortRender not clobbered | app harness h touch live drag released below threshold to abort on browse to browse and on home to browse and on overlay to browse the two computed but false cases observing the Browse render flag on the real browse element and window scrollTo | key abortRender on renderDestination equals browse-host the byproduct compute branch so both the home to browse and overlay to browse aborts wrongly re-render the browse host or revert a read site to a removed clobbered giving a wrong render | wiring real DOM Browse render applyScreen scrollTo
CLB | cur clobbered and sourceWasClobbered no longer exist anywhere in HEAD and the Construction exact-key contract is three keys and the finalize and recovery paths and the five mutation anchors reference finPlan abortRender | a source contract sweep asserting the identifiers are absent and swipe-construction CONSTRUCTION_KEYS has three keys and mutation-anchors resolves every re-pointed anchor | reintroduce a clobbered or sourceWasClobbered read or leave sourceWasClobbered in the contract or leave a stale anchor so the source text or anchor gate reddens labeled source text not behavioural | source contract SOURCE_TEXT and anchor gate
RC | the supersession recovery reader at 415 reproduces clobbered at all three boundary points via cur live and abortRender rerender render true for a dragging built browse to browse and render false for an overlay to browse and render false for an armed not yet built browse to browse | the shipped 6a browse to browse dragging supersession VR and SR fixtures and the shipped 6c overlay to browse supersession fixtures and a browse to browse armed then superseded before the lock all re-run with clobbered retired | drop the cur live conjunct so the armed browse to browse wrongly re-renders the browse host or key on the wrong predicate so the built browse to browse stops re-rendering or leave a stale clobbered read | wiring recovery real DOM three boundaries
RGabort | the shipped abort suite stays green browse to browse re-render plus scroll restore and overlay to browse no re-render | the existing abort fixtures unchanged | any behaviour change in the abort render or scroll outcome | wiring existing green
RGheld | the held reveal choreography is untouched commit to home and abort browse to browse still hold the pane and drop at the same gate with reveal timing unchanged | the existing held reveal fixtures commit to home and abort browse to browse | any change to the reveal hold or drop timing the double rAF or 600ms gates or dropPanes | wiring existing green flash surface pin
RGcommit | commit finalization destination screen and scroll is unchanged only the abort render flag moved | the existing commit fixtures commit to home commit to browse commit to overlay | the slice alters a commit decision | wiring existing green
```

## 9. Records reconciliation (APPLY ON APPROVAL)

Scrub obligations when this ships (StandardsDocument §6.6; EC §4.22/§7). NOT applied by this plan — each
is a defining-record edit flagged for the maker/Zelda.

- **`js/app.js`** — replace `clobbered: false` in the session literal (439) with the arm-time compute
  `finPlan: Swipe.finalizationPlanFor(Swipe.classifyTransition({ from, to: dest }))`; delete the `d.clobbered
  = c.sourceWasClobbered` set (516). Redirect the readers: the finalize abort sites (1159 selector, 1160,
  1185) → `cur.finPlan.abortRender === 'rerender'`; the supersession recovery reader (415) → `cur.live &&
  cur.finPlan.abortRender === 'rerender'` (the `cur.live` conjunct reproduces `clobbered`'s build-ran half —
  §3 item 2b). Rewrite the 6c recovery comment (391) and the session-recording comment (466) that mention
  `clobbered` to describe the declared decision.
- **`js/swipe.js`** — delete `sourceWasClobbered` from `buildConstruction` (300–327) and its return
  member; add `finalizationPlanFor` with its contract doc-comment; export it in the public surface.
  Update the module header (14–25) that names `finalizationPlanFor()`/`planFor()` as the deferred half —
  `finalizationPlanFor` now exists (the abort decision); the unified `planFor()` wrapper + the remaining
  finalization fields stay deferred.
- **`test/fixtures/swipe-plan-spec.mjs`** — remove the header caveat (39–44) that `expectedFinalization`
  is "NOT consumed by production" / "absence must NOT be read as verified"; state that
  `expectedFinalization.abortRender` IS now the live oracle for `finalizationPlanFor`. The DATA (the eight
  `abortRender` values) is unchanged. `expectedHosts` stays inert (its consumer is deferred — below).
- **`test/swipe-transition.test.js`** — the per-case comparison now asserts production `finalizationPlanFor`
  against `expectedFinalization.abortRender` (was construction-only). Register the FP/AB/CLB/RC mutations.
- **`test/swipe-construction.test.js`** — drop `sourceWasClobbered` from `CONSTRUCTION_KEYS` (30) and the
  exact-key/typeof assertions (122, 129): the Construction contract becomes `{capture, decorations, movers}`.
  DELETE the F6 test (218–237); its intent (browse→browse clobbers, home→browse does not) is folded into
  cells FP+AB.
- **`tools/mutate.mjs`** — re-point the four recovery-line anchors (`HARDRESET_DISPOSE_FROM` 57–60,
  `VR_HOLD_ORDER_FROM/TO` 64–75, `RECOVERY_RENDER_LINE` 99, `F1_ORPHAN_RESETSCROLL_TO` 105) to the new
  `render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false` form (purpose unchanged); re-point the
  swipe5 F6 anchor (399–402) from the deleted `sourceWasClobbered = resolveSource() === hostEl` to a
  `finalizationPlanFor` mutation (force `abortRender: 'none'`), reddened by FP+AB; update the `d.clobbered`
  prose comments (48–56, 92–97, 223). `test/mutation-anchors.test.js` then resolves every anchor (cell CLB).
- **`tools/gen-swipe-model.mjs` + `test/swipe-model.test.js`** — update the model-mirror rule that
  hard-codes `d.clobbered` (235, 242, 412, 413, 434) to the `finPlan.abortRender` derivation, then
  RECONCILE + REGENERATE `docs/swipe-model.generated.txt` and update the source-fingerprint pin over the
  changed `js/app.js`/`js/swipe.js` regions. Build-step obligation for Brunel; a source-text/fingerprint
  gate kept separate from behavioural sweeps (§4.10).
- **Comment/message-only sites (behaviour parity; text update):** `js/app.js:466`, `test/swipe-invariants.test.js:378`,
  `test/swipe-stage6.test.js` (110, 112, 123, 136, 268, 288, 299), `test/swipe-stage6b-loser-cancel.test.js:53`.
- **OUT OF SCOPE (Charpy r1 F3):** `Claude/Loki/` archived strike casebooks referencing `d.clobbered` are
  ARCHIVAL records (StandardsDocument §6) and STAY. Unrelated generic `clobber` usages
  (`test/plexconn.test.js`, `test/shardstore.test.js`, `test/logic.test.js`, `test/app-integration.test.js`,
  `test/OFFLINE_CHECKLIST.md`) are a different word, not the swipe field — untouched.
- **`Claude/Subsystems/swipe-reveal.md`** — §17: `finalizationPlanFor` now composes the abort decision of
  the rich `planFor()`; the oracle covers construction AND the abort re-render. §8/§18: `clobbered`/
  `sourceWasClobbered` retired; abort re-render is a declared decision. §19: register FP/AB/CLB/RC. §23:
  annotate stage 6 sub-sliced — 6d = `finalizationPlanFor.abortRender` + `clobbered` retirement; the
  host-field reintroduction (`sourceHost`/`destinationHost`/`sameBrowseHost`) DEFERS to the slice whose
  consumer needs them (pane/lease/source-resolution), NOT 6d (§4.15).
- **`Claude/Decisions/DecisionLog.md`** — append a dated Stage-6d decision: `clobbered`/`sourceWasClobbered`
  retired in favour of the pure declared `finalizationPlanFor(classification).abortRender` (`'rerender'`
  iff browse→browse); the frozen `expectedFinalization` oracle turned on; behaviour-preserving extraction
  (§4.19), no known-red; the dependency rationale (D is the next foundation, D precedes F). Reference this
  plan and the 6c records.
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — extend the SLICED annotation: 6d landed the first
  declarative finalization decision (`finalizationPlanFor.abortRender`, `clobbered` retired); the reveal
  centralization (I10/I17), the rest of the finalization plan, pane lifecycle, pane-owning supersession,
  the `recoverSession` matrix and the null-half remain deferred. Point to `PLAN-swipe-stage6d.md`.
- **Build number** — a code change bumps the build number (PWA deploy rule).
- **Engineering Contract §4.22 reviewable-stage naming** — ships as "Stage 6d", so the deferred remainder
  stays visible and the stage is not called complete on a partial delivery.
- **Campaign definition** — `Claude/Campaigns/swipe-stage6d.json` already exists (permissive Poirot glob
  per the 6b lesson); no glob widening owed. (Resolves the 6b/6c flagged campaign-name reconciliation.)

## 10. What this does NOT do (deferred, with reasons)

Each deferral names the consumer that does not yet exist and the stage that introduces it (U2).

**Deferred to the pane-lifecycle slice (F, the next foundation after D):**
- **Pane `release()`/`dispose(reason)`/`equivalence` and `paneRemovalPolicy`.** The removal policy is a
  finalization-plan field, but its ENFORCEMENT mechanism (the pane interface) is F; building it now would
  add methods with no live consumer (§4.15) and hand-code a policy this slice's plan will later declare
  (§4.16). Consumer: pane-owning supersession (B) and I10 reveal release (C).
- **The `fadePanes` per-pane removal `setTimeout`** — a self-guarded owned-decoration cleanup; belongs
  with the pane abstraction (F).

**Deferred to the reveal-centralization slice (C, downstream of F — the flash-sensitive core):**
- **I10 paint-gated reveal centralization + I17.** The held-pane-until-paint surface the reveal saga is
  about (memory `tomeroam-swipe-repaint-saga`; ~8 retracted verifications). 6d leaves reveal timing
  untouched (RGheld). Consumer: the restructured reveal path.
- **Pane-owning supersession {home→browse, browse→browse, browse→home, overlay→home}** (INCLUDING the
  dominant home↔browse family and every →home) — requires disposing an owned pane on supersession, whose
  reveal-phase sub-case disposes a held-to-paint pane (the flash operation). Consumer: F (dispose) + C
  (reveal). Stays gated as in 6c.

**Deferred to later finalization slices (extending this seam):**
- **The rest of the finalization plan** — `commit` screen/scroll, `abort` scroll as a plan field,
  `stackEffect` (the descriptor-identity push/replace decision at settle 751–753, and the referential-vs-
  semantic identity distinction the spec froze), `reveal`, and the unified rich `planFor()` wrapper.
  Deferred: each needs its own consumer wired; pulling them in now expands past the `abortRender` parity
  extraction and would add plan fields ahead of their consumers (§4.15). They extend `expectedFinalization`
  and `finalizationPlanFor` as they land.
- **Host fields `sourceHost`/`destinationHost`/`sameBrowseHost`/`hiddenHostState`** (subsystem §23). `abortRender`
  is derivable from `fromKind`/`toKind`, so no host field is needed now; emitting them would be dead
  fields (§4.15). Consumer: the source-resolution / overlay-vs-in-flow / hiddenHostState work.
- **The full `recoverSession({reason, phase})` pre/post-stack matrix (G).** Keys on the authority boundary
  and needs the finalize restructure; consumer is the restructured recovery path, with C.
- **The null-on-retire writes + `transitionListener` session-ownership (A).** Unchanged from 6c §11 / 6b
  §11: their reader (a retired-while-`cur===session` state) exists only once the held reveal is supersedable
  (B/C).

**Deferred, unchanged (independent):**
- **The headline compositor flash.** Untouched and independent (`PLAN-swipe-reveal.md` §6 — JS cannot
  observe it; not fixed by any step-6 slice). 6d adds no paint-gating and changes no reveal timing.

## 11. Sequencing

This slice rests only on shipped Stage 5 (`classifyTransition`/`constructionPlanFor` + the frozen oracle
scaffolding), Stage 6a/6b/6c (the finalize/recovery paths it reads), and the frozen
`expectedFinalization` data. It does not gate, and is not gated by, the deferred work (§10). It is the
declarative-finalization FOUNDATION the rest of step 6 composes from: F (pane lifecycle) enforces the
pane-removal policy this plan's seam will later declare; C (reveal centralization) and G (recoverSession)
build on the finalization plan; A (null-bookkeeping) lands last, once B/C make the held reveal supersedable.
Handoff order: Charpy (temper) → Curie (red suite from §8 — the FP oracle turn-on; AB across
browse→browse / home→browse / overlay→browse to catch the `renderDestination==='browse-host'`-keying
fracture on BOTH computed-but-false cases; RC's BOTH boundaries — the 6a browse→browse dragging-supersession
render-TRUE and the 6c overlay→browse render-FALSE) → Brunel (green; compute `cur.finPlan` at ARM time (the session
literal) before any consumer, add the `cur.live` conjunct at the 415 recovery reader, delete
`clobbered`/`sourceWasClobbered`, redirect the read sites, do NOT touch reveal
timing, AND complete the co-change scrub in the SAME commit — the construction exact-key contract, the five
re-pointed `mutate.mjs` anchors, and the model-mirror + fingerprint regeneration (§2/§9) — else the
construction/anchor/fingerprint gates go red) → Poirot (review) → Mendeleev (coverage audit) → Loki
(strike the §3 load-bearing promise on the CORRECTED domain — that the declared `abortRender` never
diverges from the retired runtime `sourceWasClobbered` byproduct it replaces; the home→browse and
overlay→browse browse-host-render-yet-not-sameBrowseHost fracture, provable on the real aborted `#browse`).
Campaign definition-of-done: `Claude/Campaigns/swipe-stage6d.json`.
