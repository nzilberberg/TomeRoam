# PLAN — Swipe/reveal Stage 6f (structural fix, first slice: the OUTGOING in-flow source becomes an app-ghost for in-flow→overlay, so the real in-flow view is never transformed)

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/swipe.js:135-136"],"callee_ranges":[],"affected_contracts":["test/fixtures/swipe-plan-spec.mjs:55","test/fixtures/swipe-plan-spec.mjs:58","test/fixtures/swipe-plan-spec.mjs:181","test/swipe-transition.test.js:1"],"staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"blocking_questions":["SIbrowse","SIhome","GHOST","REVEAL"]} -->

Status: **DRAFT — for Charpy temper.** Stage 6f opens the STRUCTURAL-FIX axis of `PLAN-swipe-reveal.md`
§7 step 6 — the saga's identified honest fix (`tomeroam-swipe-repaint-saga`): *"Never transform the real
in-flow view. Move only out-of-flow panes (ghost/clone), and swap the real view once, invisibly, at the
end."* The full fix is too large and partly dead-ended for one stage (§1a). This slice is the FIRST bounded,
off-flash-surface step: for the **in-flow→overlay** transition family, the OUTGOING is represented by an
owned-pane **app-ghost** instead of the transformed real in-flow view, so the real `#browse` / `#home`
**is never a mover and never receives a swipe transform** — the observable structural invariant this slice
pins.

**⚠️ HONESTY, STATED FIRST (this is a structural slice, not a flash fix).** Structural-green here (the real
in-flow view carries no transform) is **NOT** proof the flash is fixed. The flash is compositor-level and
invisible to CI/local instrumentation (`PLAN-swipe-reveal.md` §1/§6; the saga's device-elimination table);
its confirmation is **device-only and downstream** (§9, per the deploy rule — NOT a gate on this stage).
Moreover this slice deliberately does **NOT touch the headline transition** (browse→browse): its incoming
real `#browse` cannot be floated in a fixed pane (dead-end **T8**), so the headline's transform-elimination
is a larger, forked, higher-risk piece (§1a, §10). This slice establishes and safety-proves the
transform-elimination PATTERN on a non-headline, off-hold-surface family first.

## Index
1. Defining records and authority
1a. Decomposing the structural fix — why in-flow→overlay is the correct first slice; what is forked/deferred
2. Exact scope boundary
3. The structural invariant (the load-bearing promise) and the single fracture for Loki
4. The construction-plan change and its grounding
5. Lifecycle-ownership section, and runtime-dependency policy
6. Ordering
7. Coverage Model (Mendeleev catalog)
8. Coverage and mutation matrix
9. Records reconciliation (apply on approval) + device-verification obligation
10. What this does NOT do (deferred, with reasons)
11. Sequencing and handoff

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: false** — no DATA value's ownership crosses a NEW producer→consumer seam. The
  change is a DECISION-VALUE flip inside the existing pure `constructionPlanFor` (`js/swipe.js`), whose
  return SHAPE is unchanged; no new value is produced or handed across a boundary. No `vitruvius-ledger`
  owed.
- **callee_replacement: false** — no callback/interface replaces direct logic. The same two builders that
  already exist (`ghostApp` for an app-ghost outgoing, `resolveSource` for a real-source outgoing) are
  dispatched between by the plan value; the app-ghost branch (`js/swipe.js buildConstruction` 317-323) is
  UNCHANGED — this slice only causes it to be TAKEN for more classifications. No `vitruvius-effects` owed.
- **contract_shape: false** — `constructionPlanFor` returns the same exact keys `{ outgoing, incoming,
  renderDestination, decorations }`; only the string VALUE of `outgoing` changes for the in-flow→overlay
  cases (`'real-source'` → `'app-ghost'`). No exact-key schema is introduced or changed. No
  `vitruvius-contract` owed.
- **state_transfer: false** — no resource's ownership crosses a seam at runtime; the session already owns
  its movers (stage 3). What changes is which OWNERSHIP CLASS the outgoing mover is minted as — a lifecycle
  concern (below), not a transfer of an existing resource.
- **async_change: false** — no asynchronous surface, timing, or continuation changes. The settle rAF, the
  340ms/transitionend finalize, the reveal double-rAF + 600ms net, and `holdGhostUntilPaintable` are
  UNTOUCHED. The in-flow→overlay reveal is the PLAIN no-hold `dropPanes()` path both on commit and abort
  (grounded §4), so no hold surface is entered.
- **persistence_migration: false** — the gesture, its session, and its panes are in-memory, per-process
  (subsystem §15).
- **lifecycle_ownership: true** — this is precisely a resource-lifecycle/ownership change. For
  in-flow→overlay the OUTGOING mover changes ownership class from `borrowed-real` (the real in-flow view,
  styled-then-restored, never removed) to `owned-pane` (a NEW app-ghost clone that must be created and
  disposed exactly once on every exit — I2). §5 names create / borrow / mutate / release / dispose /
  endpoint and what moves vs stays.

## 1. Defining records and authority

**Verdict: AGREE, with one classification note.** No two defining records disagree on the target. The
strategic plan mandates the structural fix (§ below); the saga names it the honest fix; the subsystem
addendum lists the compositor flash as an open, separate investigation. The one thing to state plainly is
that this is **NEW POLICY, not a parity extraction** (EC §4.19): the construction PLAN changes (the
in-flow→overlay outgoing representation), and the independent frozen spec changes with it. The
user-*visible* intent is parity (the app-ghost is a faithful clone of the outgoing view; §4), but that
visual equivalence is a **device-verified** claim (§9), not a CI-green claim.

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `PLAN-swipe-reveal.md` §7 step 6 + the saga "THE STRUCTURAL FIX" | Never transform the real in-flow view; move only out-of-flow panes; swap the real view once at the end. Identified early, deferred, never done. | Plan-of-record (strategic) + saga | Realizes the OUTGOING half of the structural fix for the in-flow→overlay family: the outgoing in-flow view becomes an owned-pane app-ghost, so the real `#browse`/`#home` is never a mover and never transformed. The INCOMING half and the headline browse→browse remain deferred/forked (§1a, §10). | Annotate §7 step 6 with the 6f slice (§9) |
| `PLAN-swipe-reveal.md` §2.3 branch conditions + §2.4 matrix | OUTGOING is `ghostApp()` iff source is NOT overlay AND destination kind is browse; otherwise the real in-flow view (or a real overlay). A pane exists in 4 of 8 base combinations. | Plan-of-record | Widens the app-ghost condition: OUTGOING is an app-ghost iff source is in-flow (home/browse) AND destination is NOT home — i.e. adds in-flow→overlay to the app-ghost set. browse→home outgoing stays real-source (deferred, §10). The §2.4 pane count for in-flow→overlay changes from 0 to 1 (outgoing ghost). | Regenerate §2.4 matrix + `docs/swipe-model.generated.txt`; update the frozen spec (§9) |
| `js/swipe.js constructionPlanFor` (135-136) | `outgoing = fromKind==='overlay' ? 'real-source' : (toKind==='browse' ? 'app-ghost' : 'real-source')`. | Code under change | Becomes `outgoing = fromKind==='overlay' ? 'real-source' : (toKind==='home' ? 'real-source' : 'app-ghost')`. Sole production line changed. The downstream `buildConstruction` app-ghost branch (317-323), `start()` mover mapping, disposal, and the plain `dropPanes` reveal are UNCHANGED — they already handle an app-ghost outgoing (it is how browse→browse ships today). | — |
| `test/fixtures/swipe-plan-spec.mjs` (55, 58, 181; `paneOf` 66) | Hand-written INDEPENDENT oracle. home→overlay and browse→overlay expect `outgoing:'real-source'`; the NP-as-destination modifier (browse→nowplaying) expects `outgoing:'real-source'`. `paneOf` derives the pane from `outgoing==='app-ghost' \|\| incoming==='home-snapshot'`. | Independent oracle (§4.14) | Three expected-outcome lines flip `real-source`→`app-ghost` (home→overlay :55, browse→overlay :58, browse→nowplaying :181); `paneOf` auto-updates (no stored field). Overlay-SOURCE cases (:59-61, :175) are UNCHANGED (rule touches in-flow sources only). A deliberate two-part edit (production + oracle) a review can see. | Hand-edit the three lines + the STRUCTURAL_CASES rule comment (33) to current truth (§9) |
| `EngineeringContract.md` §4.19 (parity vs policy) | Classify every change; do not hide a fix inside a parity extraction; maintain the policy ledger; tests assert its active contents. | Core rule | Classified NEW POLICY (the outgoing representation changes). No known-red is introduced — the spec + model are updated to the new expected values and the suite stays green. The visual-parity claim is device-verified (§9), not a CI known-red, so no PolicyLedger entry is owed; recorded in DecisionLog as new policy. | Append the DecisionLog new-policy entry (§9) |
| `EngineeringContract.md` §4.3/§4.4 (ownership; borrowed vs owned) | Every temporary resource has one explicit owner; borrowed real nodes are restored not removed; owned synthetic nodes are removed/disposed. | Core rule | The new outgoing app-ghost is a session-owned owned-pane, disposed on every exit through the existing owned-pane paths (`dropPanes` no-hold; `disposeOwnedPanes` on supersession, stage 6e; the orphan sweep). The real in-flow view is now NOT borrowed as a mover at all for these transitions — it stays in flow, untransformed, never removed (the strongest form of §4.4). | — |
| `EngineeringContract.md` §4.8 (truthful claims) + §4.2 (drive real entry points) | A test may not claim more than it proves; drive the real public path. | Core rule | Every §8 cell drives the REAL gesture (`test/app-harness.js` `h.touch`) and asserts on the real DOM (`#browse`/`#home` inline transform, `.nav-ghost` presence). The invariant asserted is "the real in-flow view carries no swipe transform," NOT "the flash is gone" — the latter is device-only and is NOT claimed by any cell (§7). | — |
| `Subsystems/swipe-reveal.md` §22 + `PLAN-swipe-reveal.md` §1/§6 | The visual flash's root cause is a separate open investigation; the rewrite does not promise to fix it. | Subsystem + plan | Preserved. This slice makes structural progress on the transform axis but is not sold as a flash fix; §10 and the status-first note keep that honest. | Rewrite §7/§8/§18/§23 to current truth (§9) |

Authority precedence: the strategic plan + the saga govern the target shape; EC §4.15/§4.19 govern how the
change is classified and recorded; the independent frozen spec (§4.14) governs the oracle edit; the harness
(verified tooling) governs what is observable and therefore that the real gesture is the load-bearing proof.

## 1a. Decomposing the structural fix — why in-flow→overlay is the correct first slice; what is forked

**The hypothesis is CONFIRMED in code (not falsified — there IS a real-view transform to remove).** Every
site that writes a `transform` during the gesture iterates the mover set indiscriminately, and that set
includes `borrowed-real` movers (the real in-flow view):
- `start()` **app.js:555** — parks the INCOMING mover offscreen: `if (m.base) m.el.style.transform =
  'translateX(' + m.base + 'px)'`.
- `move()` **app.js:576** — the drag: `for (const m of d.movers) m.el.style.transform = ...`.
- `settle()` rAF **app.js:615** — the settle animation target, over `cur.movers`.
- `runFinalize()` **app.js:775** — CLEARS it: `m.el.style.transform = ''` over `cur.movers` (the demotion
  the saga's best-standing hypothesis fingers).
The code's own comments confirm the author's awareness: app.js:606-607 ("writing a stale translateX onto the
real Home/Browse/overlay (borrowed-real movers)") and app.js:637 ("the structural fix (never transform the
real in-flow view)").

**Which transitions put a transform on the real IN-FLOW view (the invariant's subject)?** Grounded against
`constructionPlanFor` (swipe.js:135-136) and the branch map:
- The real in-flow view is the OUTGOING borrowed-real mover iff `fromKind ∈ {home,browse}` AND `toKind ∈
  {home,overlay}` → **browse→home, browse→overlay, home→overlay** (the `'real-source'` outgoing).
- The real `#browse` is the INCOMING borrowed-real mover iff `toKind==='browse'` → **browse→browse,
  home→browse, overlay→browse** (the destination rendered into the real `#browse` mid-drag).
(Overlays are also borrowed-real movers with transforms, but they are `position:fixed` own-layer views, the
flash is not reported on them, and the stated invariant is the in-flow views — out of this slice's scope.)

**Why the fix cannot be sub-sliced as "remove the real-view transform" per-transition trivially — the
finding.** The transition is a filmstrip (app.js:487 "BOTH sides always move — a filmstrip, never a
reveal"). Making the real in-flow view APPEAR to move without transforming it REQUIRES representing the
moving view as an out-of-flow pane; there is no third option. So the fix is inseparable from "which view
becomes a pane." Two sub-cases behave very differently:

- **OUTGOING in-flow view → an app-ghost (SAFE, this slice).** For in-flow→overlay, replacing the outgoing
  real view with an app-ghost leaves the real view in flow, untransformed, at its natural scroll, **fully
  covered throughout the drag** by the tiling of (outgoing-ghost at base 0) ∪ (incoming-overlay at base +w)
  — the two width-`w` movers span `[t, t+2w] ⊇ [0,w]` for all `t ∈ [-w,0]`, so the real view never peeks
  (§4). This is the SAME ghostApp recipe browse→browse already ships, over a plain no-hold reveal, off the
  T8 dead end (T8 concerns the INCOMING). Lowest-risk, off the flash-timing surface.
- **INCOMING real `#browse` → a pane (FORKED, deferred — the headline).** browse→browse's transformed
  borrowed-real is the INCOMING `#browse` (the destination rendered into it mid-drag). Floating the incoming
  in a fixed pane is **dead-end T8** (breaks the document-scroll model; `applyScrollY` clamps against
  document height; `window.scrollTo` cannot move a fixed pane; `.alphaindex` would swallow the gesture). So
  the headline's transform-elimination needs a different, larger construction — swap the real view in once
  at the end under a covering pane released only after paint (that is workstream **C**, the I10/I17
  paint-gated reveal centralization) — AND it entangles the clone-fidelity surface the saga's ~8 retracted
  verifications live on. It is a genuine fork, deliberately left downstream.

**Off-surface bounding within the safe sub-case.** Of the three OUTGOING-in-flow transitions,
**browse→home** touches the home-reveal HOLD path on commit (`holdGhostUntilPaintable($('home'))`,
app.js:1175 — the C-adjacent flash surface), so it is deferred (§10). The two remaining —
**browse→overlay** and **home→overlay** — are PLAIN no-hold reveals on both commit and abort (§4), entirely
off the hold/paint surface. **That family — in-flow→overlay — is this slice.** (Its NP-decorated members,
browse→nowplaying and home→nowplaying, are in the family since nowplaying is an overlay; the decoration path
is orthogonal and unchanged, pinned by cell DEC.)

**No escalation, with the fork surfaced.** The premise is confirmed, not falsified; a clean, bounded,
ratifiable slice exists on the directed axis (the "outgoing-source representation"); and the genuine fork
(the T8-blocked headline incoming) is strictly DOWNSTREAM and does not gate this slice. The fork and the
"this does not touch the headline flash" limitation are surfaced here and in §10 for the user's strategic
awareness, not silently resolved — if the user would rather spend the stage on the forked headline work or
on C directly, the slice is cleanly redirectable; but a safe, real structural step is delivered here.

## 2. Exact scope boundary

Behavioural ownership, not function names.

**Changes:**
- **`js/swipe.js constructionPlanFor` (135-136), ONE line.** `outgoing = c.fromKind === 'overlay' ?
  'real-source' : (c.toKind === 'browse' ? 'app-ghost' : 'real-source')` becomes `outgoing = c.fromKind ===
  'overlay' ? 'real-source' : (c.toKind === 'home' ? 'real-source' : 'app-ghost')`. Effect: in-flow→overlay
  (browse→overlay, home→overlay, browse→nowplaying, home→nowplaying) now yields an `app-ghost` outgoing; all
  other classifications are byte-identical (in-flow→browse stays app-ghost; in-flow→home stays real-source;
  overlay-source stays real-source). Update the function's leading doc-comment (114-125) + the outgoing
  ternary comment to the new rule.
- **`test/fixtures/swipe-plan-spec.mjs`** — the three expected-outcome edits (:55 home→overlay, :58
  browse→overlay, :181 browse→nowplaying modifier): `outgoing:'real-source'` → `outgoing:'app-ghost'`; and
  the STRUCTURAL_CASES rule comment (:33) restated to "outgoing 'app-ghost' iff the SOURCE is in-flow AND
  the DESTINATION is NOT home." `paneOf` (:66) is a derivation and is NOT edited. (This is a defining-record
  edit staged for the maker via Curie's red-first pass, §9/§11 — not applied by this plan.)
- **BOTH generated inventory docs regenerated (T1/T2 — Charpy).** The spec edit changes the outgoing/pane
  columns that BOTH generators render from `expectedConstruction`/`paneOf`, so both regenerate in the same
  commit: `docs/transition-matrix.generated.txt` (`node tools/gen-transition-matrix.mjs`; byte-exact at
  `test/transition-matrix.test.js:34`, renders the outgoing/pane columns + the pane-count summary — the
  in-flow→overlay pairs move from no-pane to a pane) and `docs/swipe-model.generated.txt`
  (`node tools/gen-swipe-model.mjs`; byte-exact at `test/swipe-model.test.js:78`; `gen-swipe-model.mjs:186-192`
  reads `expectedConstruction.outgoing` + `paneOf`). The mirrored-region FINGERPRINTS in the model
  (`gen-swipe-model.mjs:44-61`: the `begin`/nav-relation/gesture-end/supersession app.js region hashes) are of
  UNTOUCHED app.js and MUST NOT change — this is NOT a fingerprint-pin update; only the rendered
  construction/pane rows regenerate. (Brunel build-step, EC §4.10, kept separate from behavioural sweeps.)
- **`test/transition-matrix.test.js` — the spec self-consistency predicate (T1 residual — Charpy).** The
  file's SECOND test (79-96, "the frozen spec builds a pane exactly when the GHOST/SNAPSHOT rules say")
  hard-codes the OLD ghost rule at line 85: `const expectGhost = c.from !== 'overlay' && c.to === 'browse';`.
  The spec flip makes `wrong` non-empty (home→overlay + browse→overlay diverge) so `assert.deepEqual(wrong,
  [])` FAILS. Co-change in the SAME commit as the spec edit: line 85 → `const expectGhost = c.from !==
  'overlay' && c.to !== 'home';`, and the doc-comment (line 83) → "GHOST iff source is not an overlay AND
  destination is NOT home" (the `paneOf` check at line 90 auto-follows; no other change). Verified against
  all 8 structural cases. Charpy confirmed this predicate is the ONLY other place in `test/`/`tools/`
  encoding the old rule (every spec importer enumerated; the 6c/6d/descriptor-coverage-gate fixtures are
  unaffected), so this completes the scrub.

**Stays exactly as today (do NOT re-touch):**
- **The transform-write/clear sites themselves (app.js:555/576/615/775).** UNCHANGED. They keep iterating
  `d.movers`/`cur.movers`; the invariant is achieved by REMOVING the real in-flow view FROM that set for
  these transitions (it is no longer a mover), not by editing the write sites. (Guard cell: the real view
  simply never appears in the set.)
- **The paint-gated reveal surface — the flash core.** `holdGhostUntilPaintable` (809-876), `drop`,
  `fadePanes` (702), the reveal double-rAF/600ms, `dropPanes` (623/1198), `watchFrames`, `ghostVsReal` — ALL
  UNCHANGED (cell REVEAL). in-flow→overlay never enters the hold path.
- **`buildConstruction`'s app-ghost branch (swipe.js:317-323)** and `start()`'s mover mapping (531-555) —
  UNCHANGED; they already build/own an app-ghost outgoing (browse→browse ships it). The stage-6e
  `disposeOwnedPanes` and the 6c/6d recovery are UNCHANGED and now simply also cover the new in-flow→overlay
  ghost as an owned-pane.
- **`js/nav.js`, `js/app.js` `begin()`/`move()`/`end()`/`settle()`/`finalize()` control flow.** No edits.

**Split across the seam:** none — this is not a callee_replacement or boundary relocation; it is a single
decision-value change with an unchanged downstream. The only "split" is the frozen-oracle two-part edit
(production value + independent spec value), which §4.14 exists to make visible.

**Deferred (§10 expands, with the consumer/stage each waits on):** the OUTGOING for browse→home (home-reveal
hold surface); the INCOMING real-`#browse` transform for browse→browse (headline, T8-forked) / home→browse /
overlay→browse; workstream C (I10/I17 paint-gated reveal centralization); the borrowed-real OVERLAY
transforms (out of the invariant's scope).

## 3. The structural invariant (the load-bearing promise) and the single fracture for Loki

**Invariant (the load-bearing promise, the single fracture point for Loki).** For every reachable
**in-flow→overlay** gesture — browse→overlay, home→overlay, and their NP-decorated members
browse→nowplaying / home→nowplaying — the real in-flow source view (`#browse` when the source is a
browse-family screen, `#home` when the source is home) is **never a mover and therefore never receives a
swipe-written inline `transform`** at any phase (ARMED, DRAGGING, SETTLING, FINALIZING, after). The outgoing
is an owned-pane app-ghost; the real in-flow view stays in flow at its natural position, untransformed, and
is never promoted to (nor demoted from) a compositing layer by the swipe. (During the drag the
(outgoing-ghost ∪ incoming-overlay) tiling covers the overlay's own rect — full-viewport for `nowplaying`;
for the vertically-inset overlay destinations the topbar/navbar bands are covered by the translucent
topbar/navbar, a device-verified visual detail, §4/§9. The STRUCTURAL invariant — no swipe transform on the
real view — holds regardless of coverage.)

**Basis (U11).** This realizes the OUTGOING half of `PLAN-swipe-reveal.md` §7-step-6 / the saga structural
fix for the in-flow→overlay family, and EC §4.3/§4.4 (the real view is not even borrowed as a mover — the
strongest form of "never remove a borrowed real view"). The LOCUS (a `constructionPlanFor` decision-value
change reusing the existing `ghostApp` recipe) is a **recommendation** grounded in "reuse the shipped,
faithful outgoing-ghost pattern rather than invent a new representation"; the invariant is the observable
"the real in-flow view carries no swipe transform for in-flow→overlay," not the specific line.

**⚠️ The invariant is STRUCTURAL, not the flash.** Structural-green does NOT assert the compositor flash is
gone — that is unobservable in CI/local and confirmed device-only + downstream (§9). No §8 cell claims
otherwise.

**The single fracture Loki attacks.** A reachable in-flow→overlay state in which the real in-flow view still
carries a swipe transform (or is visibly exposed while untransformed). Concretely, the fracture is one of:
1. **A classification hole** — some reachable in-flow→overlay descriptor for which `constructionPlanFor`
   still returns `outgoing:'real-source'` (so the real in-flow element is minted as the outgoing mover and
   gets `translateX` at 555/576/615). The strike executes the real gesture and reads `#browse`/`#home`
   `.style.transform`.
2. **A back-route into the mover set** — a path (a mis-slotted decoration, a supersession-recovery re-arm,
   an NP-decoration edge) that lands the real in-flow element in `d.movers` for an in-flow→overlay gesture
   despite the plan value.
3. **A coverage break beyond what §4 discloses.** §4 already CONCEDES the topbar/navbar-band exposure for
   the inset overlay destinations (T3, device-verified) and pins the T4 opaque-over-own-rect precondition
   for all seven overlay kinds. So the residual visual fracture is a coverage break §4 does NOT disclose —
   an overlay kind whose background is not `var(--page-bg)` (breaking T4) reaching the flip, or the
   ghost/overlay horizontal-tiling geometry (`ghost.base===0`, `overlay.base===+w`, both width `w`) failing
   so the rect itself is not covered. Primarily a device/geometry concern (§9); the STRUCTURAL fracture
   (1)/(2) remains the CI-observable one.
The primary, CI-observable fracture is (1)/(2): the real in-flow view carrying a transform. The load-bearing
promise is single: *no code path lets the real in-flow view receive a swipe transform on an in-flow→overlay
gesture.*

## 4. The construction-plan change and its grounding

**The rule.** `outgoing` becomes `app-ghost` for in-flow sources going to a non-home destination:
- in-flow→browse: `app-ghost` (UNCHANGED — already ships).
- **in-flow→overlay: `app-ghost` (NEW — this slice).**
- in-flow→home: `real-source` (UNCHANGED — browse→home deferred, §10).
- overlay→any: `real-source` (UNCHANGED — overlay source out of scope).

**Grounding — the downstream already handles it.** `buildConstruction` (swipe.js:317-323) already has the
`if (plan.outgoing === 'app-ghost') { const g = ghostApp(); outgoing = mover(g.wrap,'owned-pane','outgoing');
capture = g.capture; }` branch; `start()` (app.js:531-555) already maps an `owned-pane` outgoing mover and
parks INCOMING movers only (line 555 `if (m.base)` skips the base-0 outgoing). So flipping the plan value
routes in-flow→overlay through the SHIPPED app-ghost machinery with no new build code.

**Grounding — `ghostApp` is faithful for both in-flow sources.** `ghostApp` (swipe.js:244-261) clones
`.app`, prunes `.hidden`/`.parked`, strips ids, copies carousel scroll (`copyScroll`) and animation phase
(`copyAnimPhase`), and pins at `translateY(-scrollY)`. Because it prunes `.hidden`/`.parked`, it captures
whichever in-flow view is ACTIVE: for a browse source `#browse` is active (`#home.parked`), for a home
source `#home` is active (`#browse.hidden`). So the same recipe yields a faithful `#browse` ghost OR `#home`
ghost — the fidelity risk is identical to the shipped browse→browse outgoing ghost (T1/T2 already handled by
the recipe). No new capture recipe is introduced.

**Grounding — coverage is HORIZONTAL over the overlay's rect, and the reveal is of an unchanged view.**
During an in-flow→overlay drag the two movers are the outgoing ghost (base 0) and the incoming overlay
(base +w = off, both width `w`). For drag offset `t ∈ [-w, 0]` they span `[t, t+2w]` HORIZONTALLY, which
always contains the viewport width `[0, w]`. The overlay is opaque over its own rect (T4 precondition
below), so within that rect the stationary real view behind it is covered at every `t`. On COMMIT the
overlay lands covering; on ABORT the overlay retreats and the outgoing ghost returns to base 0 covering,
then `dropPanes()` removes the ghost to reveal the real in-flow view — which was **never re-rendered,
re-decoded, scrolled, or transformed** (the overlay destination is `renderDestination:'none'` — nothing was
written into `#browse`), so the reveal is of an already-painted, unchanged view. The reveal path is the
plain no-hold `dropPanes` for both commit and abort.

**⚠️ Corrected no-peek scope (T3 — Charpy; the earlier "full no-peek" claim was WRONG).** The tiling covers
the overlay's RECT, not necessarily the whole viewport. `#nowplaying` is `position:fixed; inset:0; z-index:60`
(full-viewport, above the topbar z30) — for it the coverage is total and no band is exposed. But `#options`
(z25) and the five settings sub-screens (`#general`/`#playback`/`#buffering`/`#downloads`/`#diagnostics`,
z26) are **vertically INSET** (`top: calc(var(--safe-top) + 51px)` — the bottom edge of the fixed `.topbar`;
bottom above the transport). For those destinations the TOPBAR band (0–51px, `.topbar` z30
`rgba(20,23,28,.86)` + `backdrop-filter: blur(14px)`) and the NAVBAR band (`.navbar` z40) are covered by the
translucent topbar/navbar, **behind which the now-STATIONARY real in-flow view is partially visible
(blurred)** — where today's transformed outgoing view was moving. The **STRUCTURAL invariant still holds**
(the real view carries no transform regardless), and the difference is confined to what shows through the
~86%-opaque blurred topbar/navbar bands. Whether that band difference is visible is **DEVICE-VERIFIED**
(§9), NOT proven in CI — this plan does **NOT** claim full no-peek for the inset overlay destinations.

**⚠️ CHECKED PRECONDITION (T4 — Charpy; an enumerated gate, not a per-overlay escape hatch).** A kind-level
`constructionPlanFor` flip applies to ALL overlay destinations at once — it cannot exclude a single overlay
— so the slice's opaque-over-own-rect requirement is an ENUMERATED precondition over **all seven overlay
kinds**, and the slice BLOCKS if any fails: `options`, `nowplaying`, `general`, `playback`, `buffering`,
`downloads`, `diagnostics`. **Evidence (verified at HEAD, css/app.css):** all seven paint `background:
var(--page-bg)` — `#options` (css/app.css:134), `#nowplaying` (:421), and the five subs
`#general/#playback/#buffering/#downloads/#diagnostics` (:695) — an opaque page-colour fill over their own
rect. So the precondition HOLDS
today. It is re-verified before merge; any change to an overlay's background (or adding a new overlay kind)
reopens it (subsystem §23 revision trigger).

**Grounding — the `.alphaindex` strip is touched only BENEFICIALLY.** The A–Z strip is `position:fixed`;
today a `transform` on `#browse` makes `#browse` its containing block and re-anchors it (saga trap T3). With this
slice `#browse` is NOT transformed on in-flow→overlay, so it does NOT become the strip's containing block on
those transitions — strictly better than today, and it does not break the strip. (The outgoing GHOST clone
has its own re-anchored strip inside its fixed wrap, exactly as browse→browse already ships — no new issue.)
This slice does not modify, exclude, or reposition the strip.

## 5. Lifecycle-ownership section, and runtime-dependency policy

**Lifecycle ownership (lifecycle_ownership).** Named concerns, what MOVES vs STAYS, for the in-flow→overlay
family:
- **CREATE** — a NEW owned-pane app-ghost is created for the outgoing (via the existing `ghostApp`), where
  today no pane was built. The pane count for in-flow→overlay goes 0 → 1.
- **BORROW** — the real in-flow view (`#browse`/`#home`) is NO LONGER borrowed as a mover for these
  transitions. The borrow is ELIMINATED: the real view stays in flow, untransformed, never entered into
  `d.movers`. (The incoming overlay stays a `borrowed-real` mover, unchanged — out of the invariant's
  scope.)
- **MUTATE** — drag transforms (555/576/615) apply to the outgoing ghost + incoming overlay movers, exactly
  as the mover loop already does; they NO LONGER reach the real in-flow view (it is not in the set).
- **RELEASE** — N/A: the reveal is the PLAIN no-hold path (overlay destination), so no paint-gated
  `release()` is involved. `holdGhostUntilPaintable` is not entered (cell REVEAL). This slice adds/moves no
  `release()`.
- **DISPOSE** — the new outgoing app-ghost is disposed exactly once on every exit through the EXISTING
  owned-pane paths: `dropPanes()` on the plain finalize (app.js:623/1198); `disposeOwnedPanes(session,
  'superseded')` on a supersession (stage 6e); the `resetSwipeStyles` orphan sweep on a hard reset. No new
  disposal code (I2 holds via the shipped paths).
- **ENDPOINT** — UNCHANGED: `sessionDone`/`endOwnership`. The plain no-hold path ends ownership at finalize
  (no `revealPending`), exactly as other no-hold transitions do today.

**Runtime-dependency policy (U9).** The changed line is in the PURE, DOM-free `constructionPlanFor`
(swipe.js) — it reads only its argument `c` (derived kinds), no ambient global, no DOM; the `require()`-no-
DOM gate is unaffected. The `ghostApp` build reads the world only through the injected `env` (unchanged,
stage 5). No value is cached; the decision is computed fresh per gesture from the classification. This slice
introduces strictly no new ambient coupling.

## 6. Ordering

No ordering invariant is introduced or changed (no `@order`). The outgoing pane is built in
`buildConstruction` BEFORE any destination render, exactly as today (swipe.js §6-step-5 ordering, unchanged)
— and for an overlay destination `renderDestination` is `'none'` for `#browse`, so there is no mid-drag
`#browse` clobber to order against at all. Disposal order (the plain `dropPanes` on finalize; the 6e
`disposeOwnedPanes`-before-render on supersession) is UNCHANGED.

## 7. Coverage Model (Mendeleev catalog)

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | The outgoing becomes an owned-pane created at build and disposed at finalize (plain no-hold); the real in-flow view is no longer a mover at any phase (cells SIbrowse, SIhome, GHOST). |
| Identities | N/A | No identifier is created, changed, or reinterpreted (`d.id`/`sessionSeq` unchanged). |
| Ordering | N/A | No ordering invariant added or changed (§6); the overlay destination has no mid-drag `#browse` render to order. |
| Resources: acquired / owner / endpoint | Yes | A new owned pane is acquired and disposed once per exit; the real in-flow view is no longer acquired as a mover; the ownership endpoint is unchanged (cells GHOST, SIbrowse). |
| Async operations | N/A | No async surface/timing changes; the reveal is the plain no-hold path; the settle rAF and hold timers are untouched (cell REVEAL). |
| Stale completions | Yes (regression) | The 6c settle-phase identity guards and 6e supersession disposal now also cover the new in-flow→overlay owned ghost; a superseded in-flow→overlay ghost must be disposed and not stranded (cell GHOST covers commit/abort/exit; the existing 6c/6e guards are pinned unchanged). |
| Normal completion | Yes | Commit→overlay and abort→browse take the plain `dropPanes` reveal, unchanged (cell REVEAL). |
| Recovery authority boundary | N/A (unchanged) | in-flow→overlay abort is `abortRender:'none'` (no re-render); the recovery/finalization decision is the shipped 6d value, unchanged. |
| Emergency disposal | Yes | A superseded in-flow→overlay outgoing ghost is disposed via the shipped `disposeOwnedPanes` (stage 6e) — now a live consumer for this family; the orphan sweep still disposes a leftover (cell GHOST). |
| Persistence | N/A | In-memory, per-process (subsystem §15). |
| External side effects | Yes | Driving the real gesture, the outgoing `.nav-ghost` appears then is disposed, and the real `#browse`/`#home` carries no inline transform (cells GHOST, SIbrowse, SIhome). |
| Invariants | Yes | The structural invariant §3 (real in-flow view carries no swipe transform for in-flow→overlay); I2 (the new ghost disposed exactly once); §4.4 (the real view is not even borrowed as a mover) (cells SIbrowse, SIhome, GHOST). |
| Mutation cases | Yes | Each §8 cell names a mutation on a real channel (revert the plan value; force real-source; suppress the ghost; introduce a hold; drop/mis-slot the decoration; desync the oracle). |
| Known-red | N/A | New policy; the spec + model are updated to new expected values and stay green; no known-red introduced; PolicyLedger unchanged (§4.19). |
| Composition | Yes | The new owned ghost composes with the shipped disposal (6e), the 6c/6d recovery, and the untouched reveal (REVEAL); the decoration path is orthogonal and unchanged (DEC). |
| Contract claims (exact schema) | N/A | `constructionPlanFor`'s return shape is unchanged (same keys); only a value flips. No exact-key contract obligation (§Applicability). |
| Concurrency | N/A | Single-writer within the process (subsystem §6). |
| Observability | Yes | SIbrowse/SIhome assert the real-view inline transform on the real DOM via `h.touch`; GHOST asserts `.nav-ghost` presence/absence; REVEAL pins the untouched no-hold timing; DEC asserts the pill float; MODEL is the three-layer oracle. **The compositor flash is NOT observable here and is asserted by NO cell — device-only, §9.** |
| Flash (visual, device) | Device-only (downstream) | The no-peek/opacity visual parity and any flash effect are confirmed on device (§9), NOT gated on this stage; explicitly not a CI cell. |

## 8. Coverage and mutation matrix

Every load-bearing promise maps to a production-facing test with a mutation that reddens it on a REAL
channel. SIbrowse/SIhome/GHOST/DEC drive the real `begin()`→drag→settle path through the app-harness
(`h.touch`) and assert on the real DOM; MODEL is the three-layer oracle; REVEAL pins shipped no-hold timing.

| id | Behavior proved | Fixture / transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| SIbrowse | driving a real browse→overlay gesture, the real in-flow `#browse` is never a mover and carries no inline `transform` at ARMED/DRAGGING/SETTLING/after | app-harness `h.touch` books→options drag through settle, reading `#browse.style.transform` at each phase | revert `constructionPlanFor` outgoing to `'real-source'` for in-flow→overlay → `#browse` becomes the outgoing mover and gets `translateX` | wiring (real DOM: `#browse` inline transform empty) |
| SIhome | driving a real home→overlay gesture, the real in-flow `#home` is never a mover and carries no inline `transform` | app-harness `h.touch` home→options drag, reading `#home.style.transform` | the same revert → `#home` becomes the outgoing mover and gets `translateX` | wiring (real DOM: `#home` inline transform empty) |
| GHOST | the outgoing is an owned-pane app-ghost — a `.nav-ghost` present during the drag and disposed exactly once on both commit and abort exit (I2) | app-harness browse→overlay commit, and a separate browse→overlay abort | force outgoing back to `'real-source'` so no ghost is built (`.nav-ghost` absent during drag) | wiring (real DOM: `.nav-ghost` present then absent) |
| REVEAL | commit→overlay and abort→browse take the plain no-hold `dropPanes` path; the reveal hold/timing surface is byte-untouched | the existing no-hold fixtures + browse→overlay commit/abort | route the overlay reveal through `holdGhostUntilPaintable` (introduce a hold) → the no-hold assertion reddens | wiring (existing green — off-surface pin) |
| DEC | a browse→nowplaying gesture still clones the NP pill decoration while the outgoing is an app-ghost — the decoration is unaffected | app-harness browse→nowplaying with a pill present | drop or mis-slot the decoration mover → the `.np-pill-float` assertion reddens | wiring (real DOM: `.np-pill-float` present) |
| MODEL | production `constructionPlanFor` outgoing for every in-flow→overlay structural and modifier case equals the frozen spec `app-ghost` | `swipe-transition.test.js` vs `swipe-plan-spec.mjs` (all matching cases) | leave the spec at `real-source` while production is `app-ghost` (or the reverse) → the oracle comparison reddens | contract (three-layer oracle) |

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
SIbrowse | driving a real browse to overlay gesture the real in-flow browse view is never a mover and carries no inline transform at arm drag settle or after | app harness h touch books over options drag through settle and read browse inline transform at each phase | revert constructionPlanFor outgoing to real-source for in-flow to overlay so browse becomes the outgoing mover and receives translateX | wiring real DOM browse inline transform empty
SIhome | driving a real home to overlay gesture the real in-flow home view is never a mover and carries no inline transform | app harness h touch home over options drag and read home inline transform | the same revert so home becomes the outgoing mover and receives translateX | wiring real DOM home inline transform empty
GHOST | the outgoing is an owned-pane app-ghost present as nav-ghost during the drag and disposed exactly once on both commit and abort exit per I2 | app harness browse to overlay commit and a separate browse to overlay abort | force outgoing back to real-source so no ghost is built and nav-ghost is absent during the drag | wiring real DOM nav-ghost present then absent
REVEAL | commit to overlay and abort to browse take the plain no-hold dropPanes path the reveal hold and timing surface is byte untouched | the existing no-hold fixtures and the browse to overlay commit and abort | route the overlay reveal through holdGhostUntilPaintable introducing a hold so the no-hold assertion reddens | wiring existing green off-surface pin
DEC | a browse to nowplaying gesture still clones the now-playing pill decoration while the outgoing is an app-ghost the decoration is unaffected | app harness browse to nowplaying with a pill float present | drop or mis-slot the decoration mover so the pill float assertion reddens | wiring real DOM np-pill-float present
MODEL | production constructionPlanFor outgoing for every in-flow to overlay structural and modifier case equals the frozen spec app-ghost | swipe transition test versus swipe-plan-spec fixture across all matching cases | leave the spec at real-source while production is app-ghost or the reverse so the oracle comparison reddens | contract three-layer oracle
```

## 9. Records reconciliation (APPLY ON APPROVAL) + device-verification obligation

Scrub obligations when this ships (StandardsDocument §6.6; EC §4.22/§7). NOT applied by this plan — each is
a defining-record edit flagged for the maker/Zelda.

- **`js/swipe.js`** — the one-line `constructionPlanFor` outgoing change (135-136) + its doc-comment (114-125
  and the outgoing ternary comment) restated to the new rule ("outgoing app-ghost iff source in-flow AND
  destination not home").
- **`test/fixtures/swipe-plan-spec.mjs`** — flip `outgoing` `real-source`→`app-ghost` on lines 55
  (home→overlay), 58 (browse→overlay), 181 (browse→nowplaying modifier); restate the STRUCTURAL_CASES rule
  comment (33). Independent-oracle edit, hand-written, reviewed (§4.14) — Curie authors it red-first before
  the production change.
- **BOTH generated docs regenerated in the same commit (T1/T2 — Charpy):** `node tools/gen-transition-matrix.mjs`
  → `docs/transition-matrix.generated.txt` (byte-exact `test/transition-matrix.test.js:34`; the
  outgoing/pane columns + pane-count summary change as the in-flow→overlay pairs gain a pane) AND
  `node tools/gen-swipe-model.mjs` → `docs/swipe-model.generated.txt` (byte-exact `test/swipe-model.test.js:78`;
  its construction/pane rows change). `test/swipe-transition.test.js` compares production `constructionPlanFor`
  vs the updated spec. **NOT a fingerprint-pin update:** the model's mirrored-region fingerprints
  (`gen-swipe-model.mjs:44-61` — `begin`/nav-relation/gesture-end/supersession hashes of UNTOUCHED app.js)
  must NOT change; a fingerprint change would falsely signal an app.js mirrored-region edit that did not
  happen.
- **`test/transition-matrix.test.js` spec-consistency predicate (T1 residual — Charpy):** co-change in the
  SAME commit as the spec edit — line 85 `const expectGhost = c.from !== 'overlay' && c.to === 'browse';` →
  `c.from !== 'overlay' && c.to !== 'home';`, and the line-83 doc-comment to "GHOST iff source is not an
  overlay AND destination is NOT home" (the second test at 79-96 otherwise fails `assert.deepEqual(wrong,
  [])` on the flipped in-flow→overlay cases; `paneOf` check at line 90 auto-follows). Verified against all 8
  structural cases; Charpy confirmed it is the ONLY remaining old-rule encoding in `test/`/`tools/`.
- **`§8A NEW_POLICIES` ledger decision (T2 — Charpy): NO new entry.** The frozen model's `§8A NEW_POLICIES`
  set (`tools/gen-swipe-model.mjs:266`, asserted as EXACT data at `test/swipe-model.test.js:214`) records
  deliberate DEVIATIONS from observable parity — its three entries (`phase-aware-recovery`,
  `supersession-restore-scroll`, `supersession-rerender-source`) are all recovery/supersession BEHAVIOURS
  that differ from today's production. This slice is an INTENDED observable-parity, construction-REPRESENTATION
  change (a faithful outgoing ghost replacing the transformed real view), not a behaviour deviation, so it is
  NOT added to `NEW_POLICIES` and the exact-set assertion at `:214` stays green. Silent reversion is instead
  guarded by the frozen `expectedConstruction` spec + the `swipe-transition` oracle (reverting
  `constructionPlanFor` to `real-source` reddens `test/swipe-transition.test.js`) — the correct guard for
  construction-data drift; `NEW_POLICIES` is not. **Residual, flagged:** if device verification (§9, the T3
  topbar/navbar-band exposure for inset destinations) reveals a REAL visible deviation, the classification
  becomes a policy decision at that point (fix it, exclude — noting T4 that a kind-level flip cannot exclude a
  single overlay — or record it in `NEW_POLICIES`); it is not pre-blessed here.
- **`tools/mutate.mjs`** — register the SIbrowse/SIhome/GHOST/REVEAL/DEC/MODEL mutations (revert the outgoing
  plan value; force real-source; suppress the ghost; introduce a hold; drop/mis-slot the decoration; desync
  the oracle), each mapped to the test it reddens; `test/mutation-anchors.test.js` resolves the anchors;
  `tools/mutation-sweep.mjs` sweeps them.
- **`Claude/Subsystems/swipe-reveal.md`** — §7 (resources: in-flow→overlay now builds an outgoing owned-pane
  ghost), §8 (the outgoing for in-flow→overlay is an owned pane, the real in-flow view no longer a mover),
  §17 (the frozen-spec expected outgoing for in-flow→overlay is now app-ghost), §18 (invariant: the real
  in-flow view carries no swipe transform for in-flow→overlay), §23 (structural-fix axis opened; the
  outgoing half of in-flow→overlay DONE; browse→home outgoing, the INCOMING real-`#browse` transform, and C
  deferred/forked).
- **`Claude/Decisions/DecisionLog.md`** — append a dated Stage-6f decision: NEW POLICY (EC §4.19) — the
  in-flow→overlay outgoing representation changes from the transformed real in-flow view to an owned-pane
  app-ghost, so the real `#browse`/`#home` is never a mover and never transformed on those transitions; the
  visual parity (faithful ghost over its opaque rect; the topbar/navbar-band exposure for inset destinations
  is device-verified, T3) is device-verified downstream, no known-red, no PolicyLedger entry, and NO `§8A
  NEW_POLICIES` entry (an intended-parity construction-representation change guarded by the frozen spec +
  `swipe-transition` oracle, not the behaviour-deviation ledger); the decomposition rationale
  (in-flow→overlay is the safe off-hold-surface outgoing slice; browse→home and the T8-forked headline
  incoming are deferred). Reference this plan.
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — extend the SLICED annotation: 6f opened the STRUCTURAL
  axis with the outgoing-in-flow-source app-ghost for in-flow→overlay (real in-flow view no longer
  transformed on those transitions); browse→home outgoing, the INCOMING real-`#browse` transform
  (browse→browse headline, T8-forked; home→browse; overlay→browse), and workstream C remain deferred. Point
  to `PLAN-swipe-stage6f.md`.
- **Build number** — a code change bumps the build number (PWA deploy rule).
- **Engineering Contract §4.22 reviewable-stage naming** — ships as "Stage 6f" so the deferred remainder
  (browse→home outgoing, the incoming transform, C) stays visible and the stage is not called complete on a
  partial structural fix.
- **Campaign definition** — `Claude/Campaigns/swipe-stage6f.json` to be authored (the stage-gate manifest
  lists every required gate incl. Loki).
- **🔴 DO NOT remove the `--page-bg` red test gradient** (`css/app.css`) — movement is confirmed device-only,
  downstream; not this stage (saga; standing user instruction).

**DEVICE-VERIFICATION OBLIGATION (downstream, NOT a gate on this stage — deploy rule).** Three claims are
device-only and cannot be asserted in CI: (a) the T4 opaque-over-own-rect precondition — verified as holding
at HEAD (§4, all seven overlays paint `var(--page-bg)`), re-confirmed against `css/app.css` before merge;
(b) the T3 band-exposure — for the vertically-inset overlay destinations (`options` + the five settings
subs) the now-STATIONARY untransformed real view is partially visible (blurred) through the ~86%-opaque
topbar (z30) and navbar (z40) bands the overlay does not cover; whether that reads as a visible change vs
today's moving outgoing view is device-verified (`nowplaying`, full-viewport z60, has no band exposure);
(c) whether the aborted in-flow→overlay swipe's visual behaviour is unchanged, and — as pure DIAGNOSTIC
data, not a promise — whether removing the real-view transform on this family changes any flash the user
observes there (a differential against the still-transformed browse→browse). These go on the standing
shipped-unverified device pass; the stage is NOT gated on them (a push precedes any on-device test). The
STRUCTURAL invariant (no swipe transform on the real view) is CI-proven regardless of all three.

## 10. What this does NOT do (deferred, with reasons)

Each deferral names the consumer/stage that introduces it (U2).

**Deferred within the OUTGOING structural fix:**
- **browse→home outgoing (the real `#browse` transform on browse→home).** Same OUTGOING-in-flow pattern, but
  its COMMIT reveal takes the home-reveal HOLD path (`holdGhostUntilPaintable($('home'))`, app.js:1175 — the
  C-adjacent flash surface). Deferred to keep this slice off the hold surface. Consumer: a later slice that
  handles the home-reveal hold (composes with C).

**Deferred and FORKED — the headline, T8-blocked:**
- **The INCOMING real-`#browse` transform (browse→browse [the headline], home→browse, overlay→browse).** The
  destination is rendered into the real `#browse` mid-drag and the real `#browse` slides in as the incoming
  mover. Eliminating its transform requires representing the incoming out of flow, and floating the incoming
  in a fixed pane is **dead-end T8** (breaks the document-scroll model; `.alphaindex` swallows the gesture).
  The sound path is to swap the real view in once at the end under a covering pane released only after paint
  — workstream **C** (the I10/I17 paint-gated reveal centralization) — plus a non-T8 incoming
  representation, entangling the clone-fidelity surface. A larger, higher-risk, genuinely forked piece;
  surfaced here for strategic awareness. Consumer: C + the incoming-representation slice.

**Deferred, unchanged (independent):**
- **Workstream C — I10/I17 paint-gated reveal centralization (the ghost-release flash surface).** Untouched;
  in-flow→overlay never enters the hold path. Consumer: the reveal-centralization slice.
- **The borrowed-real OVERLAY transforms.** Out of the invariant's scope (overlays are `position:fixed`
  own-layer views; the flash is not reported on them; the invariant is the in-flow views). Not planned.
- **The headline compositor flash itself.** Untouched and independent (`PLAN-swipe-reveal.md` §1/§6). This
  slice makes structural progress on the transform axis for a non-headline family; it is not sold as a flash
  fix, and it does not touch browse→browse.

## 11. Sequencing and handoff

This slice rests only on shipped Stage 3 (session ownership + `own`-tagged movers), Stage 4/5 (the frozen
three-layer oracle, `buildConstruction`'s app-ghost branch, the `{ element, ownership, slot }` mover shape),
and Stage 6c/6d/6e (the recovery guards and `disposeOwnedPanes` that now also cover the new owned ghost). It
does not gate, and is not gated by, the deferred work (§10). It is the first inhabitant of the STRUCTURAL
axis; the browse→home outgoing and the C-dependent headline incoming sequence strictly behind it.

Handoff order: **Charpy (temper)** → **Curie** (red suite from §8: SIbrowse/SIhome on the real-view inline
transform across a real in-flow→overlay drag; GHOST on the owned-ghost presence/disposal on commit AND
abort; REVEAL pinning the untouched no-hold path; DEC on the NP pill; MODEL the oracle — AND author the
independent frozen-spec edit red-first, §9) → **Brunel** (green: the one-line `constructionPlanFor` change +
comment, the spec edit, regenerate the model + fingerprint in the SAME commit, do NOT touch the write sites
or the reveal path; VERIFY the incoming overlays are opaque against `css/app.css`, §4) → **Poirot** (review)
→ **Mendeleev** (coverage audit) → **Loki** (strike the §3 load-bearing promise: find a reachable
in-flow→overlay state where the real in-flow view carries a swipe transform — a `constructionPlanFor`
classification hole, a back-route into `d.movers`, or a tiling/coverage break — provable on the real DOM).
Campaign definition-of-done: `Claude/Campaigns/swipe-stage6f.json`.
