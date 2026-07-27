# PLAN — Swipe/reveal Stage 6e (pane-lifecycle foundation: owner-driven `disposeOwnedPanes(session)` — the §3.4 emergency-disposal half of F, off the flash-timing surface)

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor","patterns":{"boundary_relocation":false,"callee_replacement":true,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:415-418","js/app.js:598-598"],"callee_ranges":["js/app.js:415-418"],"affected_contracts":["test/swipe-model.test.js:44","test/swipe-model.test.js:214","tools/mutate.mjs:1"],"staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"blocking_questions":["DP","HR","BR","RSN"]} -->

Status: **DRAFT — for Charpy temper.** Second Stage-6e-eligible root after shipped Stage 6d (build
`2026-07-27.253`, the declarative finalization decision `finalizationPlanFor.abortRender`). Sub-slice of
`PLAN-swipe-reveal.md` §7 step 6. This is the FIRST inhabitant of workstream **F** (the pane-lifecycle
interface, §3.4/§3.6): the **emergency-disposal half** — a typed, session-owned `disposeOwnedPanes(session,
reason)` that replaces the DOM-global `.nav-ghost` sweep's owned-pane-removal effect at the one site that
disposes an OWNED pane by ownership today (the `begin()` supersession recovery of a live pane-owning drag).
It deliberately does NOT touch the paint-gated `release()` half (the held-reveal choreography
`holdGhostUntilPaintable`/`drop`/`fadePanes`), which is C's consumer and the flash surface.

**Slice chosen ON THE MERITS by dependency, NOT by symptom-appeal (planner directive).** 6d landed D's
first inhabitant (`abortRender`) and confirmed the 6c dependency graph: over the deferred set, **D and F
are the two roots; D precedes F** (the pane-removal POLICY F enforces is a field of D's plan). D's
foundation is shipped, so **F is now the correct next foundation.** A FRESH dependency analysis (§1a)
re-confirms that **C — the I10/I17 paint-gated reveal centralization, the flash-sensitive core — depends on
F and is NOT safely reachable now**: the ratified design expresses I10 AS `pane.release()` and I17's
emergency teardown AS `pane.dispose(reason)` (§3.4/§3.6), so the reveal cannot be centralized into a pane
method that does not yet exist, and building it on raw movers would hand-code a removal policy the pane
interface then re-abstracts (EC §4.16 churn — the same D→F argument one level down). **So the flash-adjacent
work stays one stage out, stated plainly.** Moreover — honestly — even C is not a promised flash fix:
`PLAN-swipe-reveal.md` §1/§6 hold that the compositor flash is independent of the entire rewrite ("if the
rewrite lands and the flash remains, it still succeeded"; "JS cannot see it"). **No escalation** (§1a): F is
unambiguously before C, no defining record contradicts another, and there is no genuine independent F-vs-C
fork to surface.

**This slice lands entirely OFF the flash-timing surface** — a POINT IN ITS FAVOUR as the next foundation
(planner directive). It changes only WHO disposes an owned pane on a supersession and by WHAT typed,
owner-driven call; it changes no reveal TIMING, no paint gate, no hold/drop control flow (cell RGreveal
pins this, the flash-surface guard). It is a behaviour-preserving EXTRACTION (parity, §4.19): the owner-
driven disposal removes exactly the pane set the DOM-global sweep removed for the owned case, byte-for-byte.

**Grounding (against current HEAD, build `2026-07-27.253`).** The owned-pane teardown reality today:
- **Panes are movers** `{ el, base, own }` (app.js `toMover`, 506); `own ∈ {'owned-pane','borrowed-real',
  'owned-decoration'}` — the ownership STRING TAG `Swipe.buildConstruction` assigns each mover (swipe.js
  303/319/322/328/332/340), mapped to production shape in `start()`.
- **Owned-pane removal happens through FOUR ad-hoc paths, each re-implementing the `own==='owned-pane'`
  filter or a CSS-class query:** (a) `dropPanes()` (app.js:598), the immediate no-hold finalize removal
  (1173) — session-owned, no paint gate; (b) `fadePanes()` (app.js:677) inside `drop()` (827), the
  paint-gated HELD-reveal release (I10) — session-owned, the flash surface; (c) `begin()`'s `.nav-ghost.spent`
  clear (app.js:376), a CSS-class sweep of already-uncovered fading panes; (d) `resetSwipeStyles()`
  (nav.js:102-104), a **DOM-GLOBAL, UNOWNED, un-reason-tagged** `document.querySelectorAll('.nav-ghost')`
  sweep, called from the `begin()` recovery (app.js:416) AND as `applyScreen`'s baseline (nav.js:120).
- **The one site that disposes an OWNED pane by supersession today is `begin()`'s recovery (app.js:383-423).**
  A second touch during a live drag hits the leftover predicate (383, `if (d || ...)`); `cur = d || session`
  (415); `resetSwipeStyles()` (416) removes `cur`'s owned ghost via the DOM-global `.nav-ghost` sweep — the
  anti-pattern §4.3 forbids ("Do not operate through whatever object is currently global"). Confirmed a live
  path: a DRAGGING session (`finishing===false`, so the 6c gate at 368 does NOT reject) that owns a ghost
  (browse→browse) is hard-reset here, and `resetSwipeStyles` removes that ghost.
- **`resetSwipeStyles(keepGhosts)` (nav.js:102-116) already carries a `keepGhosts` guard on the `.nav-ghost`
  removal (line 103), but NOT on the `.np-pill-float` decoration removal (104) or the borrowed-real inline-
  style restore (105+).** So `keepGhosts:true` skips owned-PANE removal while retaining decoration removal +
  borrowed-style restore — the exact split this slice needs.
- **The `begin()`-recovery region is FINGERPRINTED** (`test/swipe-model.test.js:44`, re-verified for 6d at
  ~415), and the model already MIRRORS the dispose-reason vocabulary (swipe-model.test.js:214/253-254:
  "Recovery reasons and dispose reasons overlap but are NOT the same set; recovery has no 'hard-reset' (that
  is a begin()-time orphan cleanup)"). So a change in this region carries a fingerprint-regeneration
  obligation, and the reason vocabulary this slice wires must reconcile with that model (§9).
- **The harness** `test/app-harness.js` drives the REAL gesture via `h.touch`; a supersession is two touches;
  the observable channel is the successor/destination REAL DOM (the `.nav-ghost` presence, `#browse`/`#home`
  presence, and `Browse.render`), plus the `PBDebug` trace for the reason (§7 retained diagnostics).

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: false** — no DATA value's ownership crosses a new producer→consumer seam. The
  owned-pane movers are ALREADY session-owned (stage 3, `d.movers`); this slice relocates a removal EFFECT
  from an ambient DOM-global sweep to an owner-driven call, which is `callee_replacement` +
  `lifecycle_ownership`, not a value-crossing ledger. Declared false deliberately (the heuristic may fire on
  "relocate/replace"); no `vitruvius-ledger` is owed.
- **callee_replacement: true** — the `resetSwipeStyles()` call at the `begin()`-recovery site (app.js:416) is
  a broad multi-effect callee whose OWNED-PANE-REMOVAL effect is replaced by the typed, owner-driven
  `disposeOwnedPanes(cur, 'superseded')`; its other two effects (decoration removal, borrowed-style restore)
  STAY in `resetSwipeStyles(keepGhosts:true)`. §4b enumerates every effect and assigns each ONE owner
  (`vitruvius-effects`; `callee_ranges` names the app.js:415-418 recovery call site where the split lands —
  `js/nav.js resetSwipeStyles` itself is unchanged, only the call's `keepGhosts` argument changes).
- **contract_shape: false** — `disposeOwnedPanes` is a void, side-effecting session-cleanup helper (the §4.3
  `disposeOwnedNodes(session)` form), not a contract-object return. It introduces no exact-key deep-frozen
  contract. No `vitruvius-contract` block is owed. (The full pane OBJECT `{ kind, element, source, pin,
  equivalence, release(), dispose() }` of §3.6 is DEFERRED — most of its members are dead now, §10.)
- **state_transfer: false** — no resource's ownership crosses a seam. The session already owns its movers;
  the disposal AUTHORITY becomes owner-driven, a lifecycle concern (below), not an ownership transfer.
- **async_change: false** — no asynchronous surface, timing, or continuation changes. The settle rAF, the
  340ms/transitionend finalize, the reveal double-rAF + 600ms net, and `holdGhostUntilPaintable` are
  UNTOUCHED. Disposal is synchronous, in the same position `resetSwipeStyles`'s removal ran (app.js:416).
- **persistence_migration: false** — the gesture, its session, and its panes are in-memory, per-process
  (subsystem §15).
- **lifecycle_ownership: true** — this is precisely a resource-lifecycle/ownership change: owned-pane
  DISPOSAL becomes a session-owned, typed operation (§4.3 explicit ownership, §4.4 borrowed-vs-owned, §3.4
  `dispose(reason)`). §5-lifecycle names create / borrow / mutate / release / dispose / endpoint and what
  moves vs stays.

## Index
1. Defining records and authority
1a. Dependency analysis over the deferred set (why F is next; C depends on F; no escalation)
2. Exact scope boundary
3. The disposal contract (invariant, not prescription) — the load-bearing promise
4. Replaced-callee effect ownership (callee_replacement) and the disposer signature
5. Lifecycle-ownership section, and runtime-dependency policy
6. Ordering contract
7. Coverage Model (Mendeleev catalog)
8. Coverage and mutation matrix
9. Records reconciliation (apply on approval)
10. What this does NOT do (deferred, with reasons)
11. Sequencing

## 1. Defining records and authority

**Verdict: AGREE.** No two defining records disagree on the required behaviour. The strategic design mandates
the pane-lifecycle split (§3.4 `release()` vs `dispose(reason)`; §3.2 typed mover ownership; §4.3/§4.4 the
core rules); the stage-5 F6 chain deferred `release()`/`dispose()`/`equivalence` to "the stage that
introduces their runtime consumers" under the no-dead-fields rule; the subsystem §14 names emergency
disposal as a current concern; the model already mirrors the dispose-reason vocabulary. This slice lands the
smallest sound piece of F: the `dispose(reason)` half, wired to its ONE current consumer (the pane-owning
supersession recovery), leaving `release()` and the dead §3.6 members to their consumers.

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `PLAN-swipe-reveal.md` §3.4 | Two operations: `pane.release()` (paint-gated, I10, reveal-only) vs `pane.dispose(reason)` (idempotent emergency teardown, bypasses I10, permitted reasons only). `begin()` disposes an ORPHAN pane as 'hard-reset'; the active reveal is left to satisfy I10. | Plan-of-record (strategic) | Realizes the `dispose(reason)` half as `disposeOwnedPanes(session, reason)` — owner-driven removal of the session's OWNED panes on supersession (`reason:'superseded'`), replacing the DOM-global sweep's owned-pane effect. `release()` (paint-gated) is UNTOUCHED (C's consumer, §10). | Annotate §7 step 6 sub-sliced (§9) |
| `PLAN-swipe-reveal.md` §3.2 | Movers are three ownership classes; conflating them is "how a real view gets removed" — a broad "dispose its panes and movers" was broad enough to authorise removing the real `#home`. Borrowed-real: never remove. Owned-pane: release or dispose per policy. | Plan-of-record | The typed disposer filters `own==='owned-pane'`, so a borrowed-real mover CANNOT be removed by it — a structural guarantee (a type the disposer will not touch), not an enumerated list (cells BR, DP). | — |
| `EngineeringContract.md` §4.3 | "Every asynchronous or temporary resource must have one explicit owner ... The owner must store the resource handle and retire it explicitly. Cleanup functions should receive the owner (`disposeOwnedNodes(session)`). Do not operate through whatever object is currently global." | Core rule | The exact rule this slice satisfies for the owned-pane case: the DOM-global `document.querySelectorAll('.nav-ghost')` sweep at the recovery site is replaced by `disposeOwnedPanes(cur, reason)`, iterating `cur.movers`. | — |
| `EngineeringContract.md` §4.4 | "Borrowed real DOM nodes have temporary state removed but are not deleted. Owned synthetic nodes are removed or disposed. Do not use a broad cleanup verb that can delete borrowed objects." | Core rule | `disposeOwnedPanes` removes only `owned-pane` movers; borrowed-real movers are never removed by it (cell BR). The narrow verb replaces the broad `.nav-ghost`/class sweep FOR THE OWNED CASE. | — |
| `EngineeringContract.md` §4.16 | "Do not store both a cause and a separately mutable derived consequence ... Derive convenience values at the use site." — no two mechanisms for one truth. | Core rule | The owned-pane removal has ONE owner-driven mechanism at the recovery site: `disposeOwnedPanes(cur)` removes `cur`'s owned panes, and `resetSwipeStyles(keepGhosts:true)` then SKIPS pane removal (line 103 guarded), so the two do not both target owned panes. The orphan case (no owner) keeps the full sweep. No duplicate owned-pane remover. | — |
| `EngineeringContract.md` §4.18 | "Normal completion and emergency teardown may have different obligations ... A successor may not dispose resources still owned by a valid active operation unless the policy explicitly defines supersession at that phase." | Core rule | This slice types the EMERGENCY-disposal path (supersession of a pane-owning DRAGGING session — the phase the 6c/6d gate leaves supersedable). It does NOT dispose a pane owned by a SETTLING/REVEALING session (I17(a); that stays gated, §10). Normal-completion release (`dropPanes`/`fadePanes`) is untouched. | — |
| `EngineeringContract.md` §4.15 | "Do not introduce a field until the same slice contains a real production consumer ... A future stage is not a consumer." (the stage-5 F6 rule) | Core rule | Only the members with a current consumer land: `disposeOwnedPanes` + `reason` (consumed by the `PBDebug` trace, §7). `release()`, `equivalence`, `source`, `pin`, `kind`, and the reasons {'lease-invalid','destination-gone','finalize-threw','hard-reset'} have no current consumer and are NOT introduced (§10). | — |
| `js/nav.js resetSwipeStyles` (102-116) | A DOM-global `.nav-ghost` sweep (103, `keepGhosts`-guarded), a `.np-pill-float` sweep (104, unguarded), and a borrowed-real inline-style restore (105+). Called from `begin()` recovery (app.js:416) and `applyScreen` baseline (nav.js:120). | Code under change | At the recovery site ONLY, the owned-pane-removal effect (line 103) is taken over by `disposeOwnedPanes(cur, reason)` for the owned case; the call becomes `resetSwipeStyles(cur ? true : undefined)` so pane removal is owner-driven when a session owns the panes, and a FULL sweep for the orphan case (`cur` null). The nav.js function itself is UNCHANGED; the `applyScreen` baseline call (nav.js:120) is UNCHANGED. | — |
| `Subsystems/swipe-reveal.md` §7/§8/§14 | §7 resources incl. owned panes; §8 the session owns them; §14 "begin()'s hard reset disposes an ORPHAN pane ... must NOT dispose a pane owned by an active SETTLING/FINALIZING/REVEALING session (I17)." | Subsystem addendum | §14 realized for the owned SUPERSESSION case via the typed disposer; the SETTLING/REVEALING gate is untouched (I17(a), §10). §7/§8/§14/§19/§23 rewritten to current truth (§9). | Rewrite §7/§8/§14/§19/§23 (§9) |
| `test/swipe-model.test.js` (44, 214, 253) | The `begin()`-recovery region is fingerprinted; the model mirrors dispose reasons ("recovery has no 'hard-reset'; that is a begin()-time orphan cleanup"). | Independent model + fingerprint pin | The recovery-region change requires re-verifying the mirrored rule and regenerating the fingerprint in the same commit (§9, Brunel build-step). The wired reason 'superseded' reconciles with the model's dispose-reason set; 'hard-reset' stays the orphan sweep (not the typed disposer) this slice. | Regenerate the pin; reconcile the reason mirror (§9) |

Authority precedence: the strategic plan (§3.2/§3.4) and EC §4.3/§4.4/§4.18 govern the target shape; EC
§4.15 (via the stage-5 F6 chain) governs which members may land now; the harness (verified tooling) governs
what is observable and therefore that the supersession driven through the real path is the load-bearing
consumer proof.

## 1a. Dependency analysis over the deferred set (why F is next; C depends on F; no escalation)

The deferred set as a dependency graph (an arrow X → Y reads "Y requires X"), re-derived from 6d §1a against
current HEAD:

- **D — declarative finalization decisions (`finalizationPlanFor`).** Its FOUNDATION is SHIPPED (6d landed
  `abortRender` + the oracle turn-on). The remaining finalization fields (commit/scroll/stackEffect/reveal/
  `paneRemovalPolicy`) extend that shipped seam, each behind its own consumer.
- **F — pane lifecycle `release()`/`dispose(reason)`/`equivalence` + `paneRemovalPolicy`.** In-degree 0
  within the remaining set (depends on nothing else there); **D precedes F** (the removal POLICY F enforces
  is a field of D's plan — 6d §1a, unchanged). With D's foundation shipped, **F is now the root to build.**
  F itself splits by consumer: **F(dispose)** — the emergency `dispose(reason)` half, whose consumer (the
  pane-owning supersession recovery) EXISTS TODAY, off the paint-gated surface — and **F(release)** — the
  paint-gated `release()` half, whose consumer is the reveal centralization C. **This slice = F(dispose).**
- **C — I10/I17 paint-gated reveal centralization (the flash-sensitive core).** **F(release) → C**, and in
  fact `release()` IS the mechanism I10 is expressed in (§3.4/§3.6), so F(release) and C are effectively the
  same slice. **Fresh check demanded by the directive — is C reachable NOW without F?** No. The ratified
  design centralizes the reveal INTO `pane.release()`; there is no pane method to centralize into until F
  builds it, and centralizing on raw movers would hand-code the removal policy the pane interface re-declares
  (EC §4.16). So C is NOT safely reachable now, and the flash-adjacent work is one stage out — stated
  plainly. (Honesty, beyond the graph: `PLAN-swipe-reveal.md` §1/§6 hold the compositor flash independent of
  the ENTIRE rewrite, so even C is not a promised flash fix — no step-6 slice is.)
- **B — pane-owning supersession {home→browse, browse→browse, browse→home, overlay→home} at the SETTLING/
  REVEALING phase.** Requires disposing a HELD-to-paint pane (the flash operation). **F(dispose) → B** (the
  dispose verb) and **C → B(reveal)** (the held sub-case). Its DRAGGING-phase sub-case (a mid-drag ghost) is
  the very consumer THIS slice types; its SETTLING/REVEALING sub-case stays gated (§10).
- **G — full `recoverSession({reason, phase})` matrix.** Keys on the authority boundary and the finalize
  restructure. **D → G**, with C. Introduces the disposal reasons {'lease-invalid','destination-gone',
  'finalize-threw'} F(dispose) does NOT wire now (no current consumer, §10).
- **A — null-on-retire writes + `transitionListener` ownership (I12).** Its reader exists only once the held
  reveal is supersedable. **B/C → A** (unchanged).

Roots of the remaining set: **F** (D's foundation shipped). F(dispose) is the inhabitant with a live
current consumer that lands OFF the flash surface, so it is the correct next slice; F(release)=C and
everything else sequence strictly behind it. **No escalation:** F is unambiguously before C (C is
*expressed in* `release()`, which F builds), no defining record contradicts another, and there is no genuine
independent F-vs-C fork — the flash-adjacent slice cannot precede the interface it consumes. The honest note
worth surfacing (not a blocking decision): 6e = F(dispose); the flash-adjacent reveal centralization is the
next slice (F(release)=C); and the compositor flash itself is promised by none of it.

## 2. Exact scope boundary

Behavioural ownership, not function names. The runtime CHANGE is: a NEW session-owned helper
`disposeOwnedPanes(session, reason)` in `js/app.js`, and the redirection of the OWNED-pane-removal effect at
the `begin()`-recovery site from the DOM-global `resetSwipeStyles()` sweep to that typed helper. No reveal
timing, no paint gate, no hold/drop control flow, no `nav.js` change, no async surface change.

**Changes (all in `js/app.js`):**
- **`disposeOwnedPanes(session, reason)` added (near the session-cleanup helpers `releaseGesture`/
  `dropRowHold`, ~328-351).** For each mover in `session.movers` with `own === 'owned-pane'` whose element
  is still attached, remove that element; leave `borrowed-real` and `owned-decoration` movers untouched
  (§4.4 — a borrowed real view is never removed by this verb; the decoration stays owned by
  `resetSwipeStyles`'s `.np-pill-float` line this slice, §10). Idempotent (the `el.parentNode` guard). Feeds
  `reason` to the existing `PBDebug.log('SWIPE', ...)` recovery diagnostic (§7 retained diagnostics). Pure
  of the module `session`: it receives its owner explicitly (§4.3), never reads the global `session`/`d`.
- **`begin()` recovery (app.js:415-417) redirected.** Before the reset, add `if (cur) disposeOwnedPanes(cur,
  'superseded');` — the disposing session is `cur = d || session` (already computed at 415), and the reason
  is `'superseded'` because a new gesture is superseding the old (the only case that disposes an owned pane
  here: a live pane-owning DRAGGING `d`; an ARMED-not-started or pane-less settling `cur` owns no owned-pane
  mover, so the call no-ops). Then change `resetSwipeStyles()` (416) to `resetSwipeStyles(cur ? true :
  undefined)`: `keepGhosts:true` when a session owned (and just disposed) the panes, so pane removal is
  owner-driven and not duplicated (EC §4.16); a FULL sweep for the ORPHAN case (`cur` null — a leftover
  ghost with no owner, disposed as today by the class sweep, I17(b)).

**Stays exactly as today (BEHAVIOURAL parity — do NOT re-touch):**
- **The paint-gated `release()` half — the flash surface.** `holdGhostUntilPaintable` (784-851), the reveal
  double-rAF and 600ms net, `drop()` (788), `fadePanes()` (677), `dropPanes()` (598 and its no-hold call at
  1173), `watchFrames`, `revealPending`, `ghostVsReal`, the decode/paint marks — ALL UNCHANGED. 6e changes
  no reveal TIMING and no hold/drop control flow (cell RGreveal pins this).
- **`js/nav.js resetSwipeStyles` (102-116) itself.** UNCHANGED — only the recovery call site's `keepGhosts`
  argument changes. The `applyScreen` baseline call (nav.js:120) is UNCHANGED (the orphan safety net on every
  navigation).
- **The `.nav-ghost.spent` clear (app.js:376)** — the fading-pane class sweep at `begin()`; UNCHANGED
  (already-uncovered panes, not this slice's concern).
- **The 6c/6d recovery render decision (app.js:417).** `render: cur ? (cur.live && cur.finPlan.abortRender
  === 'rerender') : false` and the `cur.scroll0` restore are UNCHANGED (RGsup). This slice adds the disposal
  BEFORE this render, at the same point the old `resetSwipeStyles` pane removal ran (§6 ordering).
- **The 6c narrowed `finishing` gate (368), the pane-less supersession recovery, and the settle-phase
  identity guards (589, 1217)** — UNTOUCHED (RGsup regression).

**Split across the seam (callee_replacement):** the broad `resetSwipeStyles()` callee's three observable
effects at the recovery site split — owned-pane removal → `disposeOwnedPanes(session)` (new owner);
decoration removal + borrowed-style restore → `resetSwipeStyles(keepGhosts:true)` (stays). §4b enumerates
and assigns each. `@effect js/app.js:415-418` (the recovery call site where the effect split lands).

**Deferred (§10 expands, with the consumer each waits on):** the paint-gated `release()` half (C, the flash
surface); the full pane OBJECT `{ kind, element, source, pin, equivalence }` (dead members now); the reason
enum members {'lease-invalid','destination-gone','finalize-threw','hard-reset'-via-the-typed-disposer} (G/C/
the folded orphan path); folding the orphan `.nav-ghost` sweep and the owned-decoration removal into the
pane model; `paneRemovalPolicy` as a finalization-plan field (D's later slices); the SETTLING/REVEALING
pane-owning supersession (B); I10/I17 reveal centralization (C).

## 3. The disposal contract (invariant, not prescription) — the load-bearing promise

**Invariant (the load-bearing promise, the single fracture point for Loki).** For every reachable
`begin()`-recovery state, the owner-driven `disposeOwnedPanes(cur)` + `resetSwipeStyles(cur ? true :
undefined)` removes **exactly the same DOM node set** the old DOM-global `resetSwipeStyles()` sweep removed —
byte-for-byte — while NEVER removing a borrowed-real view:

1. **Owned panes: removed, by ownership.** `disposeOwnedPanes(cur)` removes precisely the `owned-pane`
   movers `cur` built (the `.nav-ghost` ghost/snapshot), through the session that owns them (§4.3), not a
   global class query. For the one live consumer — a pane-owning DRAGGING supersession (browse→browse ghost,
   or a →home snapshot mid-drag) — the disposed set equals the `.nav-ghost` the sweep would have removed
   (cell DP).
2. **Borrowed reals: never removed.** A `borrowed-real` mover (#home/#browse/an overlay) is not an
   `owned-pane`, so `disposeOwnedPanes` cannot touch it — a STRUCTURAL guarantee by the `own` filter, not an
   enumerated exclusion (§3.2/§4.4; cell BR). The old sweep never removed these either (it queried
   `.nav-ghost` only); parity holds.
3. **No stray divergence.** The keepGhosts:true path skips `resetSwipeStyles`'s owned-pane removal in the
   owned case, so the ONLY remover of `cur`'s owned panes is `disposeOwnedPanes`. A `.nav-ghost` present in
   the DOM but NOT in `cur.movers` (a stray from a prior session) is forbidden by I2 (every pane disposed
   exactly once) and, for fading panes, cleared at `begin()`:376 before this block; so no stray survives the
   owned case. The ORPHAN case (`cur` null) keeps the FULL sweep, disposing the orphan exactly as today
   (cell HR, I17(b)). **The fracture Loki attacks: is there any reachable state where a `.nav-ghost` in the
   DOM is neither in `cur.movers` nor an orphan on the `cur`-null branch — i.e. a stray alongside a live
   owned session that keepGhosts:true would strand?** The parity claim rests on I2 + the `.spent` clear; the
   strike constructs a coexisting stray if one exists.
4. **Decoration + borrowed-style restore unchanged.** `resetSwipeStyles(keepGhosts:true)` still removes the
   `.np-pill-float` decoration (nav.js:104, unguarded) and restores borrowed inline styles (105+), so those
   effects are byte-identical (cell DEC).
5. **Reason recorded.** The disposal reason `'superseded'` is fed to the existing `PBDebug` recovery
   diagnostic (§7 retained-diagnostics contract, "pane ... disposed+reason"); cell RSN.

**Basis (U11).** Items 1–4 realize `PLAN-swipe-reveal.md` §3.2/§3.4 and EC §4.3/§4.4/§4.18 as a
behaviour-preserving extraction; parity is byte-identical because the owner-driven set provably equals the
class-swept set for the owned case (item 3) and borrowed reals are outside both. The LOCUS (a standalone
`disposeOwnedPanes(session)` helper vs a method on a not-yet-built pane object) is a **recommendation** — the
§4.3 session-cleanup form is preferred as the seam `release()` and the full pane object extend into; the
invariant is "the owner-driven disposal removes exactly the owned panes the sweep removed, and no borrowed
real." The `reason` parameter is a **recommendation** grounded in §7/§14/§4.18 (a single value `'superseded'`
now, with the existing `PBDebug` consumer; the enum grows as G/C/the folded orphan path add reasons — not a
dead field because a diagnostic consumer reads it today).

**Why parity at the user layer (honesty).** Nothing the user sees changes: the owned pane still disappears on
supersession exactly as before, the borrowed views are preserved exactly as before, the recovery render and
scroll are byte-identical (6d/6a parity). The value is structural: owned-pane disposal is now owner-driven
and reason-tagged rather than a DOM-global sweep, closing the §4.3 "operate through whatever is global"
anti-pattern for the owned case, and establishing the `dispose(reason)` half of the pane interface that
`release()` (the flash-adjacent C) and pane-owning supersession (B) compose from.

## 4. Replaced-callee effect ownership (callee_replacement) and the disposer signature

### 4a — Replaced-callee effect ownership (`vitruvius-effects`)

At the `begin()`-recovery site (app.js:416) the broad `resetSwipeStyles()` callee's three observable effects
split; each is assigned to exactly ONE owner, preserving the transition-specific order (the disposal runs at
the same point the old owned-pane removal ran — §6). `@effect js/app.js:415-418` (the recovery call site where the effect split lands).

```vitruvius-effects
# effect | owner | predecessor | successor | verification
owned-pane .nav-ghost removal | disposeOwnedPanes(session) | releaseGesture done | borrowed-style restore | DP owned-dispose-parity test
owned-decoration .np-pill-float removal | resetSwipeStyles(keepGhosts true) | owned-pane removal | borrowed-style restore | DEC decoration-parity test
borrowed-real inline-style restore | resetSwipeStyles(keepGhosts true) | decoration removal | applyScreen recovery render | BR borrowed-preserved test
orphan .nav-ghost removal (cur null) | resetSwipeStyles(full sweep) | releaseGesture done | applyScreen recovery render | HR orphan-hard-reset test
```

Notes: the first effect's owner MOVES (from the DOM-global sweep to the session-owned disposer) only when a
session owns the panes; the second and third STAY in `resetSwipeStyles` (now called with `keepGhosts:true` on
the owned branch); the fourth is the orphan branch (`cur` null), where `resetSwipeStyles` keeps its full
sweep. No effect is assigned two owners; the borrowed-real restore is never assigned to the disposer.

### 4b — Disposer signature (structural notation, not a contract object)

`disposeOwnedPanes` is a void session-cleanup helper (§4.3 `disposeOwnedNodes(session)` form), NOT an
exact-key contract return — so no `vitruvius-contract` block is owed (contract_shape:false). Structural
notation for grounding:

```
disposeOwnedPanes(session: { movers: Array<{ el, base, own }> }, reason: 'superseded')
  -> void   // removes each mover with own==='owned-pane' whose el is attached; leaves
            //   borrowed-real and owned-decoration movers untouched; idempotent
```

The full pane OBJECT `{ kind, element, source, pin, equivalence, release(), dispose(reason) }` (parent §3.6)
is DEFERRED until its members have consumers (§10); 6e adds only the owner-driven disposal over the existing
`{ el, base, own }` movers.

## 5. Lifecycle-ownership section, and runtime-dependency policy

**Lifecycle ownership (lifecycle_ownership).** Named concerns, what MOVES vs STAYS:
- **CREATE** — owned panes are created in `Swipe.buildConstruction`/`start()` (unchanged). No new creation.
- **BORROW** — borrowed-real movers (#home/#browse/overlay) are borrowed with temporary transforms; their
  styles are restored (by `resetSwipeStyles`), and they are NEVER removed. This slice makes the "never
  removed by disposal" guarantee STRUCTURAL for the recovery path: `disposeOwnedPanes` cannot mint a removal
  of a borrowed mover (the `own` filter excludes it), so §4.4 holds by construction, not by a guarded list.
- **MUTATE** — drag transforms on movers (`move()`, unchanged).
- **RELEASE** — the paint-gated held-reveal release (`holdGhostUntilPaintable`→`drop`→`fadePanes`, I10) is
  UNCHANGED and DEFERRED to C (the flash surface). This slice does not add or move `release()`.
- **DISPOSE (new)** — the owner-driven emergency disposal `disposeOwnedPanes(session, 'superseded')` for
  pane-owning DRAGGING supersession, replacing the DOM-global sweep's owned-pane effect at the recovery site.
  It does NOT dispose a pane owned by a SETTLING/FINALIZING/REVEALING session (I17(a); that stays gated —
  §10). The ORPHAN disposal (I17(b)) stays the `resetSwipeStyles` full sweep this slice.
- **ENDPOINT** — the ownership endpoint is UNCHANGED: the superseded session still ends at the existing
  recovery null-out (`session = null; d = null;`, app.js:421-422), after the disposal + hold release, in the
  same order (§6). `disposeOwnedPanes` does not change when a session stops owning resources.

**Runtime-dependency policy (U9).** `disposeOwnedPanes` is L3 app.js code (it touches `el.parentNode`/
`el.remove()` on the session's own mover elements) — NOT the DOM-free `js/swipe.js` (so the require()-no-DOM
gate is unaffected). It reads NO ambient global: it receives its owner `session` explicitly (§4.3) and
operates only on that session's `movers` (elements the session created and owns) — it never reads the module
`session`/`d`, never `document.querySelector`, never a class query. This is strictly LESS ambient coupling
than the `resetSwipeStyles` DOM-global `document.querySelectorAll('.nav-ghost')` it replaces for the owned
case. No value is cached; the disposal is computed fresh per supersession from the live `session.movers`.

## 6. Ordering contract

**Correctness requirement (cells DP/HR/BR) — the disposal runs at the same point the old owned-pane removal
ran, before the hold release and the recovery render.** In `begin()`'s recovery block the order is preserved:
`releaseGesture()` (never leave a dead gesture's listeners) → **`disposeOwnedPanes(cur,'superseded')` +
`resetSwipeStyles(cur ? true : undefined)`** (at the old `resetSwipeStyles()` position, 416) → `applyScreen`
recovery render (417) → `window.scrollTo(cur.scroll0)` (418) → `dropRowHold()` (419, the Browse hold released
LAST) → `finishing=false` → identity null-out (421-422). This is the 6a recover-before-arm order (Loki
`STRIKE-swipe-stage6-recover-before-arm`): the hold is released AFTER the render so a suspended virtualized
source is not deactivated before the render reuses its kept rows, and the identity is nulled LAST because
`releaseGesture`/`dropRowHold` read `session`. The disposal slots in at the pane-removal position — it is NOT
a new universal order; it is the existing removal step, now owner-driven. `@order` is preserved, not
introduced.

## 7. Coverage Model (Mendeleev catalog)

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | Owned-pane disposal is now a session-owned lifecycle step at the DRAGGING-supersession recovery; the SETTLING/REVEALING gate and the reveal-hold phases are UNCHANGED (cells DP, RGreveal, RGsup). |
| Identities | N/A | No identifier is created, changed, or reinterpreted; `d.id`/`sessionSeq` unchanged. |
| Ordering | Yes | The disposal runs at the old owned-pane-removal position, before the hold release and render (§6; cells DP, HR). |
| Resources: acquired / owner / endpoint | Yes | Owned panes are now disposed through their explicit owner (§4.3); borrowed reals are never removed by the disposer (§4.4); the ownership endpoint (session null-out) is unchanged (cells DP, BR). |
| Async operations | N/A | No asynchronous surface, timing, or continuation changes; the reveal double-rAF/timers are untouched (RGreveal). |
| Stale completions | N/A | No new continuation; the 6c settle-phase identity guards and 6b loser-cancels are untouched (RGsup). |
| Normal completion | Yes (parity) | The no-hold immediate `dropPanes()` and the held `fadePanes()` (release()) are UNTOUCHED; only the emergency supersession disposal is typed (RGreveal). |
| Recovery authority boundary | Yes | The pane-owning DRAGGING supersession recovery disposes the owned pane through the owner and renders identically (the 6d/6a render decision at 417 unchanged); the pane-less recovery is unchanged (cells DP, RGsup). |
| Emergency disposal | Yes | The §14/§3.4 `dispose(reason)` half is realized for the owned supersession case; the orphan hard-reset (I17(b)) keeps the full sweep; a SETTLING/REVEALING owned pane is NOT disposed (I17(a), gated) (cells DP, HR; RGreveal). |
| Persistence | N/A | The gesture and its panes are in-memory, per-process (subsystem §15). |
| External side effects | Yes | Driving a real supersession, the superseded session's `.nav-ghost` is removed from the real DOM and the borrowed `#browse`/`#home` is NOT (cells DP, BR). |
| Invariants | Yes | I2 (every pane disposed exactly once) is preserved and is the parity basis for no-stray-divergence (§3 item 3); §4.4 (no broad verb removes a borrowed view) holds by construction (cell BR). |
| Mutation cases | Yes | Each §8 cell names a misattribution/broadening mutation on a real channel (remove borrowed-real too; skip the owned-pane removal; keepGhosts unconditionally so the orphan strands; mistag/omit the reason). |
| Known-red | N/A | Behaviour-preserving extraction; no known-red introduced; PolicyLedger unchanged (§4.19). |
| Composition | Yes | The typed disposal composes with the untouched reveal choreography (RGreveal), the 6c pane-less recovery + 6d render decision (RGsup), and is the `dispose(reason)` seam `release()` (C) and pane-owning SETTLING supersession (B) extend into (§10). |
| Contract claims (exact schema) | N/A | `disposeOwnedPanes` is a void session-cleanup helper, not an exact-key contract return (no `contract-function-gate` obligation; §4b). |
| Concurrency | N/A | Single-writer within the process (subsystem §6); no concurrency change. |
| Observability | Yes | DP/BR/HR assert on the REAL DOM via `h.touch` (`.nav-ghost` presence, `#browse`/`#home` presence, `Browse.render`); RSN asserts the reason on the `PBDebug` trace (a labelled diagnostic channel, §7 retained diagnostics); RGreveal/RGsup pin shipped timing/behaviour — no vacuous or unobservable cell. |

## 8. Coverage and mutation matrix

Every load-bearing promise and parity obligation maps to at least one production-facing test, each with a
mutation that reddens it on a REAL channel. DP/BR/HR drive the real `begin()`→supersession path through the
app-harness (`h.touch`, two touches) and assert on the real DOM; RSN asserts the reason on the `PBDebug`
trace (labelled diagnostic, kept separate from behavioural claims); RGreveal/RGsup pin shipped parity.

| id | Behavior proved | Fixture / transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| DP | driving a real pane-owning DRAGGING supersession, the superseded session's owned `.nav-ghost` is removed from the real DOM through `disposeOwnedPanes(cur,'superseded')`, and the successor's `start()` snapshots the restored source | app-harness `h.touch` live browse→browse (Authors-over-Books) drag, then a 2nd touch supersedes it (the ghost-owning DRAGGING case); also a →home mid-drag supersession (home-snapshot owned pane) | make `disposeOwnedPanes` skip the `own==='owned-pane'` filter and remove nothing → the superseded ghost leaks into the successor and trips `begin()`'s hard reset | wiring (real DOM: `.nav-ghost` presence, successor snapshot) |
| BR | on a supersession, a `borrowed-real` mover (#browse / #home / overlay) is NEVER removed by the disposer — the real view survives | app-harness `h.touch` browse→home mid-drag supersession (outgoing borrowed #browse, incoming owned home-snapshot): the snapshot must go, #browse must stay | broaden `disposeOwnedPanes` to remove every mover regardless of `own` → the borrowed #browse (or #home) is removed → the successor renders into a missing host | wiring (real DOM: #browse/#home presence) |
| HR | a leftover ORPHAN `.nav-ghost` with no owning session is disposed at `begin()` before arming (I17(b)), via the full `resetSwipeStyles` sweep on the `cur`-null branch | app-harness: a stray `.nav-ghost` present with no live session, then a fresh touch arms | change the recovery reset to `resetSwipeStyles(true)` unconditionally (so the orphan is never swept and no owner disposes it) → the stray ghost survives into the new gesture | wiring (real DOM: orphan `.nav-ghost` gone before arm) |
| RSN | the disposal reason `'superseded'` is recorded in the `PBDebug` recovery diagnostic (§7 retained diagnostics) | the DP supersession fixture, asserting the trace carries the disposal reason | omit/mistag the reason passed to `disposeOwnedPanes` (or drop the trace line) → the diagnostic assertion reddens | diagnostic (labelled — PBDebug trace, NOT a behavioural claim) |
| DEC | the owned-decoration `.np-pill-float` is still removed on the recovery (parity — it stays in `resetSwipeStyles`, unremoved by the keepGhosts:true guard) | an NP-involving supersession fixture (from/to nowplaying) with a pill-float clone present | mistakenly guard the `.np-pill-float` removal behind keepGhosts too → the pill float leaks | wiring (real DOM: `.np-pill-float` gone) |
| RGreveal | the paint-gated `release()` half is byte-untouched — the held-reveal choreography (`holdGhostUntilPaintable`/`drop`/`fadePanes`) and the immediate `dropPanes()` still fire at the same gates with the same reveal timing (the flash surface is not touched) | the existing held-reveal fixtures (commit→home, abort browse→browse) and the no-hold fixtures | any change to the reveal hold/drop timing, the double-rAF/600ms gates, `dropPanes`, or `fadePanes` → the reveal-timing regression reddens | wiring (existing green — flash-surface pin) |
| RGsup | the 6c pane-less supersession recovery, the 6d finalizationPlanFor render decision at 417, and the 6c settle-phase identity guards are unchanged | the shipped 6c overlay→browse supersession fixtures and the 6d recovery-parity fixtures | any change to the pane-less recovery, the `cur.live && abortRender` render decision, or the identity guards | wiring (existing green) |

**Machine-readable coverage (gate).** Each blocking question (DP/HR/BR/RSN) has a complete row; the RG*/DEC
rows pin shipped parity.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
DP | driving a real pane-owning dragging supersession the superseded session owned nav-ghost is removed through disposeOwnedPanes cur superseded and the successor start snapshots the restored source | app harness h touch live browse to browse drag then a second touch supersedes the ghost owning dragging case and a browse to home mid drag supersession | make disposeOwnedPanes skip the owned-pane filter and remove nothing so the superseded ghost leaks into the successor and trips the hard reset | wiring real DOM nav-ghost presence and successor snapshot
BR | on a supersession a borrowed-real mover browse or home or overlay is never removed by the disposer and the real view survives | app harness h touch browse to home mid drag supersession outgoing borrowed browse incoming owned home snapshot the snapshot goes the browse stays | broaden disposeOwnedPanes to remove every mover regardless of own so the borrowed browse or home is removed and the successor renders into a missing host | wiring real DOM browse and home presence
HR | a leftover orphan nav-ghost with no owning session is disposed at begin before arming via the full resetSwipeStyles sweep on the cur null branch | app harness a stray nav-ghost present with no live session then a fresh touch arms | change the recovery reset to resetSwipeStyles true unconditionally so the orphan is never swept and no owner disposes it and the stray ghost survives into the new gesture | wiring real DOM orphan nav-ghost gone before arm
RSN | the disposal reason superseded is recorded in the PBDebug recovery diagnostic per the retained diagnostics contract | the DP supersession fixture asserting the trace carries the disposal reason | omit or mistag the reason passed to disposeOwnedPanes or drop the trace line so the diagnostic assertion reddens | diagnostic labelled PBDebug trace not a behavioural claim
DEC | the owned decoration np-pill-float is still removed on the recovery parity it stays in resetSwipeStyles unremoved by the keepGhosts true guard | an NP involving supersession fixture from or to nowplaying with a pill float clone present | mistakenly guard the np-pill-float removal behind keepGhosts too so the pill float leaks | wiring real DOM np-pill-float gone
RGreveal | the paint gated release half is byte untouched the held reveal choreography and the immediate dropPanes still fire at the same gates with the same reveal timing the flash surface is not touched | the existing held reveal fixtures commit to home and abort browse to browse and the no hold fixtures | any change to the reveal hold or drop timing the double rAF or 600ms gates dropPanes or fadePanes so the reveal timing regression reddens | wiring existing green flash surface pin
RGsup | the 6c pane less supersession recovery the 6d finalizationPlanFor render decision at 417 and the 6c settle phase identity guards are unchanged | the shipped 6c overlay to browse supersession fixtures and the 6d recovery parity fixtures | any change to the pane less recovery the cur live and abortRender render decision or the identity guards | wiring existing green
```

## 9. Records reconciliation (APPLY ON APPROVAL)

Scrub obligations when this ships (StandardsDocument §6.6; EC §4.22/§7). NOT applied by this plan — each is
a defining-record edit flagged for the maker/Zelda.

- **`js/app.js`** — add `disposeOwnedPanes(session, reason)` near the session-cleanup helpers (~328-351); in
  `begin()`'s recovery, add `if (cur) disposeOwnedPanes(cur, 'superseded');` before the reset and change
  `resetSwipeStyles()` (416) to `resetSwipeStyles(cur ? true : undefined)`. Update the recovery comment
  block (387-414) that describes the pane disposal to name the typed owner-driven path.
- **`test/swipe-model.test.js` + `tools/gen-swipe-model.mjs`** — the `begin()`-recovery region is
  fingerprinted (line 44) and the model mirrors dispose reasons (214/253-254): re-verify the mirrored rule,
  reconcile the dispose-reason mirror to include the typed disposer's `'superseded'` (leaving 'hard-reset'
  as the orphan-sweep reason, per the model's existing note), REGENERATE `docs/swipe-model.generated.txt`
  and update the fingerprint pin in the same commit. A source-text/fingerprint gate obligation for Brunel
  (kept separate from behavioural sweeps, §4.10).
- **`tools/mutate.mjs`** — register the DP/BR/HR/RSN mutations (skip the owned-pane filter; broaden to remove
  every mover; `resetSwipeStyles(true)` unconditionally; mistag the reason), each mapped to the test it
  reddens; `test/mutation-anchors.test.js` resolves the new anchors, and `tools/mutation-sweep.mjs` sweeps
  them.
- **`Claude/Subsystems/swipe-reveal.md`** — §7 (resources: owned-pane disposal now owner-driven via
  `disposeOwnedPanes`), §8 (owner: the session disposes its owned panes explicitly), §14 (emergency
  disposal: the `dispose(reason)` half realized for the owned SUPERSESSION case via the typed disposer; the
  orphan hard-reset stays the `resetSwipeStyles` sweep; the SETTLING/REVEALING gate I17(a) untouched), §19
  (register DP/BR/HR/RSN mutations), §23 (stage-6 finalization/lifecycle: the pane-lifecycle `dispose(reason)`
  half DONE; `release()`/`equivalence`/the full pane object + the remaining reasons deferred to C/B/G).
- **`Claude/Decisions/DecisionLog.md`** — append a dated Stage-6e decision: the owned-pane emergency
  disposal is now the typed session-owned `disposeOwnedPanes(session, 'superseded')`, replacing the
  DOM-global `.nav-ghost` sweep's owned-pane effect at the `begin()`-recovery site (keepGhosts:true on the
  owned branch removes the duplication; the orphan case keeps the full sweep); behaviour-preserving
  extraction (§4.19), no known-red; the dependency rationale (F is the next foundation with D shipped; F
  splits into F(dispose)=this slice and F(release)=C; C depends on F and stays deferred; the compositor
  flash is promised by neither). Reference this plan and the 6d records.
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — extend the SLICED annotation: 6e landed F's
  emergency-disposal half (`disposeOwnedPanes`, owner-driven typed disposal on pane-owning supersession);
  the paint-gated `release()` half + I10/I17 reveal centralization (C), the SETTLING/REVEALING pane-owning
  supersession (B), the full pane object, the remaining reasons, and `paneRemovalPolicy` remain deferred.
  Point to `PLAN-swipe-stage6e.md`.
- **Build number** — a code change bumps the build number (PWA deploy rule).
- **Engineering Contract §4.22 reviewable-stage naming** — ships as "Stage 6e", so the deferred remainder
  (F(release), B, the full pane object) stays visible and the stage is not called complete on a partial F.
- **Campaign definition** — `Claude/Campaigns/swipe-stage6e.json` to be authored (permissive Poirot glob per
  the 6b lesson; the stage-gate manifest lists every required gate incl. Loki).
- **OUT OF SCOPE:** `Claude/Loki/` archived strike casebooks referencing the old sweep are ARCHIVAL records
  (StandardsDocument §6) and STAY. `js/nav.js resetSwipeStyles` itself is UNCHANGED (only the recovery call's
  argument changes); the `applyScreen` baseline call (nav.js:120) is UNCHANGED.

## 10. What this does NOT do (deferred, with reasons)

Each deferral names the consumer that does not yet exist and the stage that introduces it (U2).

**Deferred to the reveal-centralization slice (F(release) = C, the flash-sensitive core):**
- **The paint-gated `pane.release()` half (I10).** The held-pane-until-paint surface the reveal saga is
  about (memory `tomeroam-swipe-repaint-saga`; ~8 retracted verifications). 6e leaves
  `holdGhostUntilPaintable`/`drop`/`fadePanes` and the immediate `dropPanes()` byte-untouched (RGreveal).
  Consumer: the restructured reveal path. This is the next slice; even it is not a promised flash fix
  (`PLAN-swipe-reveal.md` §1/§6).
- **The SETTLING/FINALIZING/REVEALING pane-owning supersession (B, the held-pane disposal — the flash
  operation).** A successor may not dispose a pane owned by a valid active reveal (I17(a), §4.18); that stays
  gated as in 6c/6d. Consumer: C (the reveal restructure) + F(release).

**Deferred to their consumer slices:**
- **The full pane OBJECT `{ kind, element, source, pin, equivalence, release(), dispose(reason) }` (§3.6).**
  `equivalence` (the I8 manifest — test/future only), `source`, `pin`, and `kind` have no current production
  consumer, so introducing them now would be dead fields (§4.15; the exact stage-5 F6 rule). 6e adds only the
  owner-driven disposal over the existing `{ el, base, own }` movers.
- **The remaining `dispose(reason)` enum members** — {'lease-invalid','destination-gone','finalize-threw'}
  (G's `recoverSession` matrix) and routing the ORPHAN 'hard-reset' + the owned-decoration removal through
  the typed disposer (the folded-pane-model slice). No current consumer disposes for those reasons; the
  orphan/decoration paths stay in `resetSwipeStyles` this slice. Consumer: G, and the pane-model folding
  slice.
- **`paneRemovalPolicy` as a finalization-plan field.** A field of D's plan (parent §3.3); it returns in the
  finalization slice that first reads it, composing with `finalizationPlanFor` (D). No consumer now (§4.15).

**Deferred, unchanged (independent):**
- **The headline compositor flash.** Untouched and independent (`PLAN-swipe-reveal.md` §1/§6 — JS cannot
  observe it; not fixed by any step-6 slice). 6e adds no paint-gating and changes no reveal timing.

## 11. Sequencing

This slice rests only on shipped Stage 3 (session ownership + the `own`-tagged movers), Stage 5 (the mover
`{ element, ownership, slot }` shape and `buildConstruction`), Stage 6a (the recover-before-arm order it
extends), and Stage 6c/6d (the narrowed supersession gate and the recovery render decision it preserves). It
does not gate, and is not gated by, the deferred work (§10). It is the `dispose(reason)` FOUNDATION of the
pane-lifecycle interface F: F(release)=C composes the paint-gated release onto the same owner-driven
disposal vocabulary; B (SETTLING/REVEALING pane-owning supersession) composes the held-pane disposal on top;
G (`recoverSession`) adds the remaining reasons.

Handoff order: **Charpy (temper)** → **Curie** (red suite from §8 — DP across the browse→browse and →home
mid-drag supersessions; BR on the browse→home mid-drag case where the borrowed #browse must survive; HR on a
stray orphan; RSN on the trace) → **Brunel** (green; add `disposeOwnedPanes`, redirect the recovery site with
`keepGhosts:true` on the owned branch, do NOT touch the reveal path, AND regenerate the model
mirror + fingerprint in the SAME commit, else the fingerprint gate reddens) → **Poirot** (review) →
**Mendeleev** (coverage audit) → **Loki** (strike the §3 load-bearing promise: that the owner-driven
disposal removes exactly the owned panes the DOM-global sweep removed and never a borrowed real — the
fracture is a `.nav-ghost` in the DOM that is neither in `cur.movers` nor an orphan on the `cur`-null branch,
i.e. a stray alongside a live owned session that `keepGhosts:true` would strand, provable on the real DOM).
Campaign definition-of-done: `Claude/Campaigns/swipe-stage6e.json`.
