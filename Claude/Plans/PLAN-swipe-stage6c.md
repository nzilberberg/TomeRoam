# PLAN — Swipe/reveal Stage 6c (I12 ownership half: pane-less supersession + identity-guard enforcement)

Type: plan

<!-- vitruvius-gate {"plan_type":"feature","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":true,"persistence_migration":false,"lifecycle_ownership":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:351-352","js/app.js:551-553","js/app.js:1159-1182"],"callee_ranges":[],"affected_contracts":["test/swipe-invariants.test.js:588","test/swipe-invariants.test.js:623"],"staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"blocking_questions":["G1","G2","G3","W"]} -->

Status: **DRAFT — for Charpy (r4, after a Loki KILL on the promise DOMAIN)** (2026-07-26). History: Charpy
r1 TEMPER (F1/F2) → r2 fix → Charpy r2 TEMPER (F5, the negative gate) → r3 fix → a fresh blind Loki strike
(`Claude/Loki/STRIKE-swipe-stage6c-stale-callback.md`, input `f604290`) KILLED the promise BY CONSTRUCTION
on its DOMAIN (not its mechanism) → this r4.

**Correction (2026-07-26, Loki KILL on the pane-less DOMAIN, executed against a scratch build of §3).** The
mechanism (identity guard + `finishing` clear + negative gate) is SOUND and held on every stale continuation
Loki constructed — but the plan MISCLASSIFIED which transitions are pane-less. The shipped classifier
(`js/swipe.js constructionPlanFor`) and the project's FROZEN spec (`test/fixtures/swipe-plan-spec.mjs`
`STRUCTURAL_CASES` + `paneOf`) make the outgoing an `app-ghost` OWNED-pane for any non-overlay source bound
for browse (home→browse, browse→browse) and the incoming a `home-snapshot` OWNED-pane for any →home
(browse→home, overlay→home). So the r3 draft's named "pane-less" flows (home↔browse, overlay→home) are
PANE-OWNING; the TRUE pane-less set is **{dest is overlay} ∪ {overlay→browse}** only (home→overlay,
browse→overlay, overlay→overlay, overlay→browse). Loki's Probe A (the r3 G1 fixture home→browse) had the
negative gate REJECT the second touch — B never armed, G1/G2/G3 unsatisfiable and W unfalsifiable as
ratified; Probe B/C on a genuinely pane-less fixture (options→books, i.e. overlay→browse) HELD (guard
neutralized all three stale continuations, `noguard` stained B, `noclear` wedged). This r4 is a
boundary/fixture re-enumeration, NOT a mechanism redesign: §2.1 corrected from the frozen spec, G1/G2/G3/W
re-targeted onto genuinely pane-less transitions, and §1/§2/§10/§11 re-stated to record 6c's ACTUAL
supersession window (overlay-involving transitions) — with home↔browse/→home (the dominant families,
pane-owning) honestly deferred to 6d/7.

Revised after Charpy r1 TEMPER
(`Claude/Charpy/PLAN-swipe-stage6c-2026-07-26-r1.md`, input `90af572`, findings F1/F2 blocking + F3/F4
folded). The A/B split is confirmed clean and safe; two load-bearing defects are fixed:
- **F1 (honest shrink).** The settle-phase NULL-on-retire writes and the `transitionend` listener's
  session-ownership/removal are NOT independently load-bearing in the pane-less window — the `cur === session`
  IDENTITY guard subsumes them (a stale pane-less settle-phase callback ALWAYS fires with `cur !== session`),
  so removing only the null reddens nothing (§4.15-dead, the campaign's recurring vacuous-cell class). The
  IDENTITY guard is now THE mechanism this slice lands; the settle-phase nulls + the `transitionListener`
  session-ownership/removal DEFER to 6d/7 alongside the reveal-phase nulls, for the same reason (their
  already-retired reader — retired-while-`cur === session` — is unreachable until the held-reveal phase is
  supersedable). G1/G2/G3 mutations are "omit the IDENTITY guard," not "omit the null."
- **F2 (wedge closed).** `begin()`'s narrowed-gate supersession now clears `finishing = false` and the
  recovery-entry predicate is corrected to route a pane-less settling session (`d === null`, no `.nav-ghost`)
  into the recovery; a new cell W proves a superseding tap that never arms leaves future swipes working.

The user authorized Option A (6c MAY retire the `finishing` gate and land I12). The clean split: narrow the
`finishing` gate so a successor can arm mid-settle for PANE-LESS transitions — making `cur === session`
reachable and observable on the successor's real DOM — and land the identity guard, WITHOUT touching the
flash-sensitive paint-centralization (the pane-owning reveal path, deferred 6d/7 §11). Grounded against
post-6b HEAD `js/app.js` (build `2026-07-26.250`): `begin()` (351-412), the `finishing` gate (352), the 6a
recovery (361-390), the settle rAF (551-553), `finalize` (1159-1179), `settleTimer` (1182), `transitionend`
(1181), the FROZEN spec `test/fixtures/swipe-plan-spec.mjs` (`STRUCTURAL_CASES` + `paneOf`) and
`js/swipe.js constructionPlanFor` as the AUTHORITY for which transitions own a pane (the app.js:686-692
comment "app-ghost (browse→browse)" is itself WRONG against the classifier — corrected in §10, not relied
on here), the mover reset that clears `transition` (712), `sessionDone` (242), `++sessionSeq` (407), the
throw-wedge guard
(`swipe-invariants.test.js:623-646`). Grounded against the real harness `test/app-harness.js`: `h.touch`
drives a two-gesture interleave, `deferRaf`/`fakeTimers` expose the pending settle rAF / 340ms timer, and
the observable channel is the SUCCESSOR's real DOM (borrowed-real mover transforms; `browse.render`/
`applyScreen`/nav-stack state) — no `PBSwipeSession` extension. Sub-slice of `PLAN-swipe-reveal.md` §7 step
6, following Stage 6a (supersession recovery) and Stage 6b (loser-cancel). The Option-A escalation this
supersedes is preserved at `e273d70`; the r1 draft at `90af572`.

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: false** — no code moves across a module boundary; every change is in place in
  `js/app.js` (`begin()`, `settle()`'s rAF callback, `finalize`). `js/swipe.js` is untouched.
- **callee_replacement: false** — no indirection layer replaces a direct call. `begin()`/`finalize`/the
  settle rAF already exist; the slice narrows one gate and adds an ownership-identity guard to two existing
  callbacks. ("supersede/successor" is gesture supersession, not a callee-indirection swap — the heuristic
  warning is expected.)
- **contract_shape: false** — no exact-key contract changes. The in-memory gesture session `d`/`cur` is
  exempt mutable lifecycle state (subsystem §3/§18), not a registered contract. No closed schema moves; no
  `PBSwipeSession` shape extension is added (§2.6).
- **state_transfer: false** — no ownership boundary relocates across a seam. The session already owns its
  resources (subsystem §8); this slice makes a superseding gesture recover an old pane-less session and adds
  an identity guard to the old callbacks — it moves no value across a module boundary (as Stage 6a, also
  `state_transfer:false`).
- **async_change: true** — the subject is the ownership discipline over two asynchronous continuations under
  a NEW concurrency: a successor gesture arming while the old session's settle rAF or the 340ms/transitionend
  `finalize` trigger is still pending. Each gains a `cur === session` guard so a stale fire after
  supersession no-ops (§5).
- **persistence_migration: false** — the gesture is in-memory, per-process (subsystem §15).
- **lifecycle_ownership: true** — the subject is the session-ownership endpoint under supersession: who owns
  the gesture, when the old session stops owning (the `finishing` clear + identity-null-last), and how a
  stale continuation reads that it no longer owns before acting (§6).

## Index
1. Defining records and authority
2. The A/B split — the clean ownership/paint boundary (the crux)
3. Exact scope boundary
4. The enforcement contract (invariant, not prescription)
4b. Value-crossing ledger
5. Async operations — supersession, guards, exactly-once, stale completions
6. Lifecycle ownership — the supersession endpoint
7. Ordering contract
8. Coverage Model (Mendeleev catalog)
9. Coverage and mutation matrix
10. Records reconciliation (apply on approval)
11. What this does NOT do (deferred to 6d/7, with reasons)
12. Sequencing

## 1. Defining records and authority

**Verdict: AGREE.** No two defining records disagree on required behaviour. The user's Option-A
authorization (precedence 1) resolves the charter-vs-code contradiction the escalation raised. This plan
closes the GAP the escalation named (no bounded slice supplied a non-vacuous consumer for the I12 work) by
making a bounded pane-less supersession reachable, which makes the `cur === session` guard non-vacuous and
observable on the successor's real DOM — the smallest change that does so — and defers the pane-owning/paint
half and the null-bookkeeping (whose reader stays unreachable — F1).

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| User Option-A authorization (2026-07-26) | 6c MAY retire the `finishing` gate and land I12 (the `cur === session` reader; the null-writes; the `transitionListener` removal), the front edge of reveal-centralization. | Current explicit assignment (EC §2 precedence 1) | Lands the `cur === session` reader for the true PANE-LESS window — the overlay-involving set `{home→overlay, browse→overlay, overlay→overlay, overlay→browse}` (§2.1, frozen-spec `paneOf`; the one non-vacuous piece — F1). HONEST SCOPE (Loki KILL): 6c does NOT buy supersession of home↔browse or →home — those are PANE-OWNING and DEFER to 6d/7 (§11). The null-writes and `transitionListener` removal also DEFER (no reddening reader in this window — F1/§11) | — |
| `js/app.js` I12 rationale (219-234) | The `cur === session` guard is "UNREACHABLE BY CONSTRUCTION right now" and "becomes reachable, load-bearing and testable only once STAGE 6 retires the `finishing` gate in favour of the state machine." | In-code decision (precedence 3) | Realized for the pane-less half: narrowing the `finishing` gate lets a successor arm mid-settle, so the guard is reachable and testable | Rewrite the comment to current truth (§10) |
| `DecisionLog.md` "Owed to stage 6" (2026-07-21) | NULL the stored session handles when cancelled OR fire, "so the session object describes LIVE ownership rather than stale numeric handles ... part of the stage-6 finalization-centralization work." | Active decision ledger | NOT discharged by 6c. The settle-phase null-writes have no reddening reader in the pane-less window (the identity guard subsumes them — F1); the whole debt (settle + reveal nulls) re-homes to 6d/7, where the held-reveal phase gives a `retired-while-cur===session` reader | Re-home the debt to 6d/7 (§10) — 6c does NOT close it |
| `EngineeringContract.md` §4.6 | A stale continuation must verify "the owner remains valid ... a successor has not taken ownership" before acting; "Tests must deliberately deliver stale callbacks after supersession." | Core rule | The exact contract this slice satisfies via the `cur === session` (owner-still-valid / no-successor) check on the settle-phase callbacks; the tests deliver a stale callback after supersession (G1/G2/G3). The "resource not already retired" arm is the DEFERRED half (needs a retired-while-owner state — the held reveal — §11) | — |
| `EngineeringContract.md` §4.15 | "Do not introduce a field until the same implementation slice contains a real production consumer and a test proving that consumer uses it." | Core rule | 6c adds NO field. The identity guard reads the existing module `session`; the null-writes (a new per-handle record) are NOT added (their reader is unreachable — F1/§11), so no dead field ships | — |
| `EngineeringContract.md` §4.18 / subsystem §14 | "A successor may not dispose resources still owned by a valid active operation unless the policy explicitly defines supersession at that phase." "`begin()`'s hard reset ... must NOT dispose a pane owned by an active SETTLING/FINALIZING/REVEALING session (I17)." | Core rule + subsystem | Defines supersession for the pane-LESS settle/finalize phase only (no owned pane to dispose). A pane-OWNING session stays protected (cell PG); the reveal-await-paint disposal stays deferred | Narrow §14/I17 to "protects a PANE-OWNING settling/finalizing/revealing session" (§10) |
| `PLAN-swipe-reveal.md` I12 / I18 / I20 | I12: every async callback captures `session.id` and no-ops when superseded. I20: a superseding gesture recovers the old session and fully releases it before the new arms; only the new session may thereafter mutate transforms/stacks/scroll/panes. | Invariants (strategic) | I12 realized (via identity, not id, equivalently) for the settle-phase callbacks; I20 extended — a superseded pane-less session's settle continuations can no longer mutate transforms/stack | — |
| `PLAN-swipe-reveal.md` §7 step 6 | "Centralize finalization and reveal ordering (I10, I17)." | Plan-of-record (staging) | Delivers the ownership half (the `cur === session` model for the pane-less window); the reveal-ordering/paint half (I10/I17) stays 6d/7 | Annotate §7 step 6 as sub-sliced (§10) |
| `js/app.js` `begin()` gate (352) + recovery (361-390) | `if (finishing) return;` blanket-rejects new gestures during settle→drop. The 6a recovery (`if (d || .nav-ghost)`) restores source/scroll inside the Browse hold — but only for a DRAGGING (`d` non-null) session or a leftover ghost, NOT a pane-less settling session (`d === null` at end(), app.js:531; no `.nav-ghost`). `finishing` is cleared only in the completion path (792/1151/1177). | Code under change | Narrow the gate to its NEGATIVE form `if (finishing && !(session && paneLess(session))) return;` (supersede ONLY a live pane-LESS session; return for a pane-OWNING one AND for a null session — so a stuck `finishing` wedges, F5); CORRECT the recovery-entry predicate to route the pane-less settling session in; CLEAR `finishing = false` in the recovery (F2); read `cur.clobbered`/`cur.scroll0` since `d === null` | — |
| `js/app.js` `finalize`/`settle` rAF (551-553, 1159-1179) | The settle rAF writes transforms on borrowed-real movers; `finalize` (`done`-guarded) runs `runFinalize` (applyScreen + stack mutation); the 340ms `settleTimer` (1182) and `transitionend` (1181) both call `finalize`. `cancelAnimationFrame(cur.settleFrame)` (1163) and `clearTimeout(cur.settleTimer)` (1168) are shipped (.226/6b). | Code under change | Add the `cur === session` guard to the settle rAF callback and to `finalize` (before `runFinalize`, after the `done` set) so a stale fire after supersession no-ops. No handle nulling, no listener re-ownership (deferred) | — |
| `test/app-harness.js` (241, 356-359, 245, 732-763, 796-834) | `cancelAnimationFrame`/`clearTimeout` REALLY splice the pending callback; `h.raf.frame()`/`clock.advance()` fire only what is still queued (so a test observes a stale fire only if it was NOT cancelled). `h.touch` drives the two-gesture interleave; `browse.render`/`window.scrollTo`/nav recorded; `PBSwipeSession` exposes `{id,dragging}`, "NO test-only exports" (29). | Verified test tooling (precedence 3) | The observable channel: the SUCCESSOR's real DOM/log after a stale callback fires — a guarded no-op leaves it intact; an unguarded fire corrupts it (G1/G2/G3). Because a cancelled callback cannot fire, the guard (not a cancel/null) is what the test exercises — confirming F1's identity-is-the-mechanism | — |

Authority precedence: the user's Option-A assignment governs that 6c lands the reachable half of I12; EC
§4.6/§4.18 and the in-code I12 rationale govern the enforcement shape and the disposal boundary; the harness
(verified tooling) governs what is observable and therefore that the identity guard — not the null — is the
testable mechanism (F1).

## 2. The A/B split — the clean ownership/paint boundary (the crux)

Is there a SAFE ownership-only half that makes `cur === session` reachable (so the guard is non-vacuous)
WITHOUT the flash-sensitive paint-centralization? **Yes, and the dividing line is the OWNED PANE.**

**2.1 Two sub-regions of the finishing window (derived from the FROZEN spec, corrected per Loki KILL).**
A gesture's `settle()→finalize()→(held reveal)→drop()` window splits by whether the transition owns a
full-viewport cover pane. The classification is NOT a comment in `app.js`; it is the shipped classifier
`js/swipe.js constructionPlanFor` and the frozen oracle `test/fixtures/swipe-plan-spec.mjs`:
`paneOf(c) = c.outgoing === 'app-ghost' || c.incoming === 'home-snapshot'`, with `outgoing === 'app-ghost'`
iff source≠overlay ∧ dest=browse, and `incoming === 'home-snapshot'` iff dest=home. Applying `paneOf` to the
eight `STRUCTURAL_CASES`:

| transition | outgoing | incoming | paneOf | class |
|---|---|---|---|---|
| home → browse | app-ghost | real-destination | true | PANE-OWNING |
| home → overlay | real-source | real-destination | false | **pane-less** |
| browse → home | real-source | home-snapshot | true | PANE-OWNING |
| browse → browse | app-ghost | real-destination | true | PANE-OWNING |
| browse → overlay | real-source | real-destination | false | **pane-less** |
| overlay → home | real-source | home-snapshot | true | PANE-OWNING |
| overlay → browse | real-source | real-destination | false | **pane-less** |
| overlay → overlay | real-source | real-destination | false | **pane-less** |

- **Pane-LESS set = {dest is overlay} ∪ {overlay→browse}** = {home→overlay, browse→overlay, overlay→overlay,
  overlay→browse}. These slide REAL borrowed elements only; they finalize via `runFinalize`'s no-pane path
  (`revealPending` false, set true only by the held-reveal branches, app.js:558-559) and never enter
  `holdGhostUntilPaintable`. (`overlay` is the `options`/`nowplaying` family; `browse` is `books`/
  `authorBooks`/`files`.)
- **Pane-OWNING set = {non-overlay→browse} ∪ {→home}** = {home→browse, browse→browse, browse→home,
  overlay→home}. Each owns a pane (`app-ghost` or `home-snapshot`) from `start()` through settle, finalize,
  and the held reveal until `drop()`. **This INCLUDES home↔browse (the dominant gesture family) and every
  →home** — so those stay gated and defer to 6d/7 (§11); the r3 draft wrongly listed them pane-less
  (Loki KILL).

**2.2 Only the pane-OWNING region is flash-sensitive.** The flash saga (memory
`tomeroam-swipe-repaint-saga`; `holdGhostUntilPaintable`) is entirely about a full-viewport pane held to
cover the view UNTIL a paint frame lands, so the uncover is invisible. Disposing that pane early uncovers
un-painted / rebuilding content — the flash. A pane-less transition has no such pane.

**2.3 The split, precisely — and 6c's ACTUAL delivered window (Loki KILL, honest re-statement).** 6c makes
the **pane-LESS** set of §2.1 — {home→overlay, browse→overlay, overlay→overlay, overlay→browse}, i.e. the
overlay-involving transitions — SUPERSEDABLE; **pane-OWNING** sessions ({home→browse, browse→browse,
browse→home, overlay→home}) stay GATED (rejected) in every phase and DEFER to 6d/7. So the user-facing value
6c buys is supersession of overlay↔(home/browse/overlay) gestures; **home↔browse and →home — the dominant
gesture families — remain wedged-until-finalize in 6c** (deferred §11). This is smaller than the r3 draft
implied; §1 must not overstate Option A's ownership half. What DOES land for the whole gesture set is the
`cur === session` ownership MODEL and the negative gate, on which 6d/7 extends supersession to the
pane-owning families. Consequences:
- Superseding a pane-less session disposes NO pane (there is none) and touches NO reveal-PAINT code
  (`holdGhostUntilPaintable`, `drop`, the decode/paint/timeout gates, `fadePanes`, `watchFrames` — all
  unchanged). The flash-sensitive re-rasterization surface (an owned pane held to paint) is not touched.
  One honest caveat (F3): superseding a pane-less settle interrupts an ACTIVE 0.2s CSS `transition`
  (app.js:544-545) by clearing transforms — the mover reset MUST also clear the `transition` property (the
  codebase's mover reset does, app.js:712) so a borrowed-real mover does not animate to the reset value
  AFTER the successor armed; Brunel confirms `Nav.resetSwipeStyles` clears `transition`. The r3 draft's
  second F3 caveat (a committing supersession surfacing the known browse-repaint) is NOT reachable in 6c's
  domain and is withdrawn: `cur.clobbered` is set only by a browse→browse mid-drag render (6a), and
  browse→browse is PANE-OWNING (deferred) — no pane-less transition clobbers `#browse`, so the recovery
  runs `render:false` and no source re-render / repaint can occur (Loki §5: the caveat "was argued over
  transitions that cannot reach the superseded-commit path it caveats"). That caveat re-homes to 6d/7 with
  the pane-owning half.
- The reachable stale callbacks are exactly the settle-phase ones (settle rAF, and the 340ms `settleTimer` /
  `transitionend` that call `finalize`). The reveal-phase handles (`revealFrames`, `revealTimer`) fire only
  inside the pane-owning held reveal, which stays gated → unreachable → deferred (§11).

**2.4 Why this makes the guard NON-VACUOUS, and why the guard (not the null) is the mechanism (F1).** Under
the narrowed gate a successor B can arm while a pane-less session A is still settling. If A's settle rAF
then fires, it writes `translateX` onto the borrowed-real movers (#home/#browse/overlay) — now owned by B —
corrupting B's view. If A's 340ms `settleTimer` or a late `transitionend` fires, it runs
`finalize_A`→`runFinalize_A` (applyScreen + stack mutation for A's destination) OVER B — the wrong-page
class. `done_A` does NOT save this: A was superseded before it finalized, so `done_A` is false. The
`cur === session` guard is what makes each stale fire a no-op. It is NON-VACUOUS: removing it lets the stale
callback mutate B — observable on B's real DOM (G1/G2/G3). **The identity check alone is the mechanism**: at
the moment any pane-less settle-phase callback fires, `session` is the fresh successor B or `null`
(`sessionDone` nulls it, app.js:242; ids are monotonic `++sessionSeq`, 407, never returning to a retired A),
so `cur !== session` ALWAYS — a per-handle null-read would change nothing the identity check does not already
do (F1). The null-bookkeeping's only reddening reader is the retired-WHILE-`cur === session` state, which
exists only in the held reveal — deferred (§4, §11).

**2.5 Why the split is CLEAN (separable from the paint restructure).** 6c reuses Stage 6a's supersession
recovery (reset borrowed-real movers, restore source/scroll, release the Browse hold, identity-null last)
MINUS the pane disposal, PLUS the `finishing` clear (F2), PLUS the `cur === session` guard on the two
settle-phase callbacks. It adds no pane lifecycle method, no `finalizationPlanFor`, no `sameBrowseHost`, no
reveal gating, no session field. The pane-owning boundary is pinned by a regression cell (PG).

**2.6 No `PBSwipeSession` extension, and no null-bookkeeping.** The reader is consumed by CONTROL FLOW (the
guarded callback no-ops), read on the SUCCESSOR's real DOM — not a session-field accessor. So no
observability accessor is added, and (F1) no null-on-retire field is added either.

## 3. Exact scope boundary

Behavioural ownership, not function names. All changes are in `js/app.js` `begin()`, `settle()`'s rAF
callback, and `settle()`'s inner `finalize`. No other function, module, or user-visible behaviour changes.

**Changes:**
- **`begin()` gate narrowed to its NEGATIVE form + recovery-entry predicate corrected (app.js:352, 361)
  (F2/F5).** The blanket `if (finishing) return;` becomes phase-aware in its NEGATIVE form —
  `if (finishing && !(session && paneLess(session))) return;`, where
  `paneLess(s) = !s.movers.some(m => m.own === 'owned-pane')`. It REJECTS whenever `finishing` is true and
  there is NOT a live PANE-LESS session to supersede — i.e. when `session` is null (INCLUDING a stuck
  `finishing === true` left after a prior recovery nulled `session` last) OR the session OWNS A PANE
  (ghost/snapshot; held-reveal implies it; deferred, cell PG). ONLY a pane-LESS live session falls through
  to be superseded. The negative form is load-bearing for cell W (Charpy r2 F5): a stuck
  `finishing === true`/`session === null` state must REJECT (wedge) so that omitting the `finishing = false`
  clear reddens W. The POSITIVE form `if (finishing && paneOwning(session)) return;` would instead fall
  through on `paneOwning(null) === false`, engaging despite the stuck flag — which would make the
  `finishing = false` clear a DEAD write and W vacuous. The
  recovery block's entry predicate `if (d || document.querySelector('.nav-ghost'))` is broadened to also
  admit a pane-less finishing session — which has `d === null` (nulled at end(), app.js:531) and no
  `.nav-ghost` — e.g. `if (d || document.querySelector('.nav-ghost') || (finishing && session))`, so
  "extend the 6a recovery" reaches it.
- **`finishing = false` cleared in the supersession recovery (F2).** Because a superseded pane-less session's
  `finalize` never runs, nothing else clears `finishing`; the recovery MUST set `finishing = false` (before
  arming) so that if the superseding gesture never arms (a tap that never crosses the direction lock —
  `end()` returns at app.js:532 without `settle()`), future swipes still engage (cell W; the wedge class of
  `swipe-invariants.test.js:623-646`).
- **`begin()` recovery extended to the pane-less settling session.** When superseding it, run the 6a recovery
  reading the SESSION's fields (`cur.clobbered`/`cur.scroll0`, the same object `d` referenced — comment
  213-216) since `d === null`: `releaseGesture()`; reset the borrowed-real movers (clearing `transition` +
  `transform`, app.js:712 pattern / `Nav.resetSwipeStyles`); restore the source screen + scroll inside the
  Browse hold envelope (6a's order — render iff `cur.clobbered`, scroll, then `dropRowHold`→`endHold`);
  `finishing = false`; identity-null LAST (`session = null`, `d` already null). The pane-disposal steps of
  the 6a recovery are not reached (no pane).
- **`cur === session` guard on the two settle-phase callbacks — the mechanism.** The settle rAF callback
  (551-553) verifies `cur === session` before writing transforms; `finalize` (1159-1179) verifies
  `cur === session` before running `runFinalize` (placed AFTER the `done` set so it cannot re-enter). A
  stale fire after supersession no-ops (§4). No handle is nulled; no listener is re-owned.

**Stays exactly as today (parity — do NOT re-touch):**
- The `.226` `cancelAnimationFrame(cur.settleFrame)` (1163) and the 6b loser-cancel
  `clearTimeout(cur.settleTimer)` (1168) — the WITHIN-session defenses; the cross-session guard is ADDED
  alongside, not in place of them (regressions RG226, RG6b).
- The exactly-once guards `done` (1160) and `dropped` (751) — untouched.
- `holdGhostUntilPaintable` and the entire reveal-paint path (the decode/paint/timeout gates, `drop`,
  `fadePanes`, `watchFrames`, `cur.revealFrames`/`cur.revealTimer`) — UNTOUCHED.
- The `transitionend` listener (1181, `{once:true}`, a bare local) — UNTOUCHED (not re-owned, not removed —
  deferred §11). A late `transitionend` after supersession fires the existing listener → `finalize` → the
  `cur === session` guard no-ops it (cell G3); its harmlessness comes from the guard, not from removal.
- Stage 6a's DRAGGING-supersession recovery and its pane disposal — untouched (regression RG6a).
- Pane-OWNING sessions stay rejected by `begin()` in every phase (cell PG).

**Split across the seam:** none — no code relocates; this is a gate narrowing + `finishing` clear + an
in-place identity guard on two callbacks.

**Deferred (§11 expands, with the consumer each waits on):** the settle-phase NULL-on-retire writes and the
`transitionListener` session-ownership/removal (consumer = a retired-while-`cur === session` reader, which
exists only in the held reveal — 6d/7); supersession of PANE-OWNING sessions and the held-reveal-await-paint
phase (consumer = the paint-centralization / I10-I17 restructure, 6d/7); the reveal-phase handles' guards +
nulls; `finalizationPlanFor`/`sameBrowseHost`/pane `release`/`dispose`; the full `recoverSession` matrix.

## 4. The enforcement contract (invariant, not prescription)

**Invariant (the load-bearing promise).** When a gesture supersedes a PANE-LESS session that is still
settling or finalizing (`begin()`'s narrowed supersession branch), the old session's settle-phase
continuations cannot mutate the successor:

1. **The mechanism is the ownership-identity guard.** Each settle-phase continuation verifies
   `cur === session` (the captured session is still the module owner — i.e. no successor has taken over)
   before performing its effect. Because supersession installs the successor as `session` before the old
   callback runs, a stale fire reads `cur !== session` and no-ops. This is the EC §4.6 "owner remains valid
   / no successor has taken ownership" check; it is the ENTIRE mechanism in this window (F1) — no
   per-handle null-bookkeeping is required or added, because the identity check already differs on every
   reachable pane-less stale fire.
2. **Guarded settle rAF.** The settle rAF callback (551-553) checks `cur === session` before writing
   `translateX` on the borrowed-real movers. A frame that fires after the successor armed no-ops, so the
   successor's movers keep their own transforms (cell G1; EC §4.6).
3. **Guarded finalize.** `finalize` checks `cur === session` (after the `done` set, before `runFinalize`).
   A 340ms `settleTimer` or a late `transitionend` that fires after supersession — when `done` is false
   because the superseded session never finalized — no-ops, so it does NOT applyScreen or mutate the nav
   stack over the successor (cells G2, G3; EC §4.6).
4. **`finishing` is cleared on supersession (liveness).** The recovery sets `finishing = false` so a
   superseding gesture that never arms cannot wedge future swipes (cell W; F2). This clear is load-bearing
   ONLY under the NEGATIVE gate (item 5): because the gate rejects when `finishing` is true and there is no
   live pane-less session, a stuck `finishing === true`/`session === null` state REJECTS, so omitting the
   clear reddens W (F5).
5. **Deferral boundary (the NEGATIVE gate).** `begin()` supersedes ONLY a live PANE-LESS session; it
   REJECTS (`return`s) for every other `(finishing, session)` combination — a PANE-OWNING session
   (ghost/snapshot; held-reveal implies it) so no owned pane is disposed by supersession in this slice
   (cell PG; EC §4.18 — this slice DEFINES supersession for the pane-less phase only), AND a null `session`
   (so a stuck `finishing === true` after a recovery nulled `session` still wedges rather than falling
   through — the F5 fix). Gate: `if (finishing && !(session && paneLess(session))) return;`.
6. **Endpoint (parity).** The successor's ownership begins only after the old session's recovery completes
   and its identity is nulled last (6a's order, unchanged); `session === null` after a terminal path stays
   as shipped (`test/swipe-invariants.test.js:588`).

**Basis (U11).** Items 1-3 are the EC §4.6 stale-continuation contract and the in-code I12 rationale
(219-234), now reachable because item 5 narrows the gate exactly enough. The mechanism is fixed and singular
— the `cur === session` identity check — because in the pane-less window it is the only check that differs
when a continuation fires stale (F1). The LOCUS (an inline `if (cur !== session) return;` vs a shared
`stillOwns(cur)` helper) is a **recommendation**; the invariant is "a settle-phase continuation that fires
after a successor has taken ownership performs none of its effect."

**Why the null-bookkeeping is NOT in this slice (F1; §4.15).** The "Owed to stage 6" null-writes make the
already-retired (`cur === session` yet handle retired) check possible. That state is reachable only in the
HELD REVEAL, where a pane-owning session stays `session` past finalize (`revealPending`) — which 6c defers.
In the pane-less window a stale callback always fires with `cur !== session`, so the null-read would redden
no mutation the identity check does not already catch — a dead field (§4.15). Both the settle-phase nulls
and the reveal-phase nulls therefore re-home to 6d/7 (§11), by one rule: the null's reader needs a
retired-while-owner state, and only the pane-owning held reveal has one.

**Why the `transitionListener` removal is NOT in this slice (F1).** A late `transitionend` after
supersession is neutralized by the `finalize` identity guard (item 3), so removing/re-owning the listener
changes no reachable behaviour here (and `{once:true}` self-clears it on the next transition). Making it a
session-owned handle now would add a field with no reddening consumer (§4.15) — deferred to 6d/7 with the
null-bookkeeping.

**Why parity at the user layer (honesty).** A guarded no-op changes nothing on the single-gesture path
(no supersession, guard true, callback runs as today). It changes behaviour only on the SUPERSESSION path,
where today the gate rejected the second gesture entirely — so the new observable is "the second gesture is
now accepted and the first's stale callbacks cannot corrupt it," a correctness gain (for the overlay-
involving pane-less set only — §2.3), plus the F3 caveat (§2.3).

## 4b. Value-crossing ledger

Machine-readable ledger (prose mirrors the fenced block). The load-bearing value crossing this slice adds is
the OWNERSHIP-IDENTITY read (`session`) by each guarded callback, plus the `finishing` clear that keeps the
gate live. No handle is nulled (F1), so no retired-null record is rowed.

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
session-ref read at the settle rAF guard | identity | in | beginArm@S6c | settleRafGuard@S6c | settle rAF callback | per-gesture | G1 successor-transform test
session-ref read at the finalize guard | identity | in | beginArm@S6c | finalizeGuard@S6c | finalize | per-gesture | G2 and G3 successor-screen test
finishing cleared on pane-less supersession | boolean | out | beginRecover@S6c | begin gate reads finishing | beginRecover | per-gesture | W wedge test
```

Notes: the two identity reads are `in` — the guarded callback reads the live module `session` (produced when
`begin` arms the successor) and compares to its captured `cur`. The `finishing` clear is `out` — produced by
the recovery, consumed by the gate on the next `begin`. No settle/reveal HANDLE is rowed as
brought-under-ownership: 6b already session-owns `settleFrame`/`settleTimer`, and this slice adds no null
record and no `transitionListener` ownership (F1, deferred §11). No value is produced in a stage later than
consumed (all S6c).

## 5. Async operations — supersession, guards, exactly-once, stale completions

Named concerns for `async_change`. No NEW asynchronous surface is created and no timing changes; the change
is a new CONCURRENCY (a successor arming while settle-phase continuations are pending) and the identity guard
that makes it safe.

- **Cancellation / supersession.** `begin()`'s narrowed supersede path recovers the old pane-less session
  (reset movers, restore source/scroll, clear `finishing`, identity-null last). It does NOT hunt down and
  cancel the old settle rAF / 340ms timer — the old callbacks that still fire are neutralized by their
  `cur === session` guard (the EC §4.6 model, robust to a missed cancel). This is also why the guard is
  TESTABLE: the harness fires only still-queued callbacks (`h.raf.frame()`/`clock.advance()`; a cancelled
  one cannot fire — app-harness.js:241/356-359), so leaving the callback un-cancelled is what lets the test
  deliver the stale fire and observe the guard (F1).
- **Temporal / ordering.** The guard reads the module `session` at CALL time and compares to the captured
  `cur`; supersession sets `session` to the successor before the old callback runs, so "successor arms →
  old callback fires → guard sees `cur !== session` → no-op" holds. `finalize`'s `done` set precedes the
  guard so it cannot re-enter (§7).
- **Fail / error / reject.** The guard is a pure comparison + early return (no throw path). `finalize`'s
  existing `try/finally` (1175-1178) that restores `finishing` on a throw is unchanged; a superseded
  `finalize` returns at the guard before entering the try, leaving the successor's state untouched. The
  supersession recovery's own `finishing = false` covers the case where the superseding gesture never arms
  (cell W).
- **Concurrency / race (the load-bearing race, Loki target).** Two gestures: A settling (pane-less), B
  superseding. The race is A's settle rAF / 340ms `settleTimer` / late `transitionend` firing after B arms.
  The identity guard makes each a no-op; the tests deliver each stale callback deliberately after
  supersession (cells G1/G2/G3), per EC §4.6.
- **Within-session parity preserved.** The `.226` settle-rAF cancel and 6b's loser-cancels still handle the
  within-session (hidden-tab, double-fire) cases (regressions RG226, RG6b); the cross-session guard is
  additive.

## 6. Lifecycle ownership — the supersession endpoint

Named concerns for `lifecycle_ownership`.

- **Create / acquire.** `settle()` creates the settle rAF (551) and the 340ms `settleTimer` (1182) on the
  session (already session-owned since 6b). `begin()` creates (arms) the SUCCESSOR session
  (`d = { id: ++sessionSeq, … }`, app.js:407) only after the old pane-less session's recovery completes.
- **Borrow.** The settle rAF and `finalize` borrow the real movers (#home/#browse/overlay) — borrowed-real,
  never deleted. The guard reads the borrowed module `session` ref.
- **Mutate.** The guard adds no mutation; it gates the existing effects (transform write, finalize). The
  recovery mutates the borrowed movers back to rest (reset `transition`+`transform`) and clears `finishing`.
- **Release.** The old pane-less session is RELEASED by `begin()`'s recovery: `releaseGesture()` (listeners),
  reset movers, `dropRowHold`→`endHold`, `finishing = false`, identity-null LAST (the app.js:1132 invariant
  — `dropRowHold`/`releaseGesture` read `session`). No handle is nulled (deferred §11); the old callbacks
  release themselves by no-oping via the guard.
- **Dispose / destroy.** No node is disposed by this slice (pane-less path owns no pane). Pane disposal on
  supersession stays deferred (pane-owning sessions gated — cell PG).
- **Fail / error.** Release is idempotent and throw-free (null-safe `releaseGesture`, plain assignments); a
  guard read on a superseded session is a safe comparison. The `finishing = false` clear guarantees no wedge
  even if the successor never arms (cell W).
- **Endpoint (parity).** The successor's ownership begins only after the old session's identity is nulled
  last. `session === null` after a terminal path stays as shipped (`:588`). "`session !== null` means live
  ownership" (subsystem §9) is strengthened: a superseded pane-less session is fully released and its stale
  continuations no-op.

## 7. Ordering contract

**Correctness requirement (cells G1/G2/G3) — successor arms before the stale callback fires; the guard reads
the post-supersession `session`.** In `begin()`'s supersede path: (1) route the pane-less finishing session
into the recovery (predicate fix, F2); (2) release the old session (reset movers, restore source/scroll
inside the hold), CLEAR `finishing = false`, identity-null LAST (the app.js:1132 invariant, unchanged);
(3) set `session` to the successor when it arms. A subsequently-firing old callback reads `session` =
successor (or null), so `cur !== session`. The guard's placement is LOAD-BEARING (Loki lesser-plane
"finalize-guard-placement"): in `finalize` the `if (cur !== session) return;` MUST sit AFTER the `done` set
+ the two shipped cancels (1163/1168) and BEFORE the `try { runFinalize() } finally { dropRowHold();
endOwnership() }` block (1174-1178). If it is placed instead INSIDE the try or at `runFinalize`'s top, a
stale `finalize_A` would enter the `finally` and run `dropRowHold()` / `endOwnership()` against the MODULE
`session` — dropping the SUCCESSOR's live row hold and ending its ownership. Guarding before the try makes a
superseded `finalize` a total no-op (Brunel/Poirot watch-point; a mutation moving the guard into the try
must redden a successor-row-hold assertion).

**Liveness requirement (cell W) — `finishing` is cleared during the recovery, before any early return.** The
recovery must set `finishing = false` on every path out of the supersession branch, so a superseding gesture
that never arms leaves the gate open. This is VERIFIABLE only because the gate is the negative form (§3):
a stuck `finishing === true` with `session === null` REJECTS, so omitting the clear wedges the next swipe
(W reddens). Under a positive pane-owning check the stuck flag would fall through (`paneOwning(null)` is
false) and W would be vacuous — the Charpy r2 F5 defect this pins.

Incidental (not a new universal order): the `.226`/6b cancel positions in `finalize` are preserved; the 6a
recovery order (render+scroll → `endHold` → identity-null) is reused unchanged, with `finishing = false`
added within it before the identity-null.

## 8. Coverage Model (Mendeleev catalog)

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | A superseded pane-less session's continuations no-op; the recovery clears `finishing` and nulls identity last; the endpoint is parity (cells G1/G2/G3, W; RGend). |
| Identities | Yes | `cur === session` identity is the ownership proof the guards read (THE mechanism — F1); `d.id`/`sessionSeq` semantics unchanged but now LOAD-BEARING at the callbacks (cells G1/G2/G3). |
| Ordering | Yes | Successor arms (session reassigned) before the stale callback fires, so the guard sees `cur !== session` (G1/G2/G3); `finishing` cleared before any early return (W); guard after the `done` set (§7). |
| Resources: acquired / owner / endpoint | Yes | The old pane-less session is fully released by the recovery (listeners, movers, hold, identity-null last, `finishing` clear); no handle is nulled (deferred §11); endpoint parity (RGend). |
| Async operations | Yes | A settle-phase continuation firing after a successor arms no-ops via the guard rather than mutating the successor (G1/G2/G3; §5). |
| Stale completions | Yes | The cross-session stale fire (settle rAF / 340ms / transitionend after supersession) is neutralized by the identity guard (G1/G2/G3); the within-session .226/6b defenses stay green (RG226, RG6b). |
| Normal completion | Yes (parity) | The single-gesture settle/finalize path is unchanged — the guard is true, the callback runs as today (RG226, RG6b, and the existing finalize suite stay green). |
| Recovery authority boundary | Yes | Supersession recovery for a pane-less settling session restores source+scroll pre-stack and clears `finishing` (extends 6a); the pane-owning recovery stays deferred/gated (cell PG). |
| Emergency disposal | Yes (boundary) | This slice defines supersession for the pane-LESS phase (no pane disposed); a pane-OWNING session is NOT disposed by supersession (cell PG pins EC §4.18 / subsystem §14). |
| Persistence | N/A | The gesture is in-memory, per-process (subsystem §15). |
| External side effects | Yes | The successor's `browse.render`/`applyScreen`/`window.scrollTo`/nav-stack must show the SUCCESSOR's, never a stale finalize's (cells G2, G3). |
| Invariants | Yes | I12 (async callbacks no-op when superseded) realized for the settle phase via identity; I20 (only the successor mutates transforms/stack) extended; the deferral boundary (I17/§14) narrowed and pinned (cell PG); the no-wedge invariant of `:623` extended to the new supersession door (cell W). |
| Mutation cases | Yes | Each cell in §9 names a mutation observable on the successor's DOM (remove the identity guard so the stale callback corrupts the successor; omit `finishing = false` so the next swipe wedges; wrongly supersede a pane-owning session so its pane is disposed). |
| Known-red | N/A | This slice introduces no known-red; PolicyLedger has no active entries and none is added. |
| Composition | Yes | The identity guard composes with the within-session `done`/`dropped` + .226/6b cancels (belt to suspenders), with the 6a supersession recovery (extended to the settle phase + `finishing` clear), and with the DEFERRED pane-owning supersession (6d/7 completes it on this model) (G1/G2/G3, W; PG). |
| Contract claims (exact schema) | N/A | No exact-key contract changes; `d`/`cur` is exempt mutable lifecycle state; no field added; no `PBSwipeSession` shape extension (§2.6). |
| Concurrency | Yes | The new concurrency (successor arming while settle-phase continuations pend) is the subject; the guard reads `session` synchronously at call time (G1/G2/G3). |
| Observability | Yes | The cells assert on the SUCCESSOR's REAL DOM/log (mover transforms; `browse.render`/`applyScreen`/nav; and, for W, whether the next swipe engages) — no `PBSwipeSession` extension (§2.6, F1). |

## 9. Coverage and mutation matrix

Every load-bearing promise and parity obligation maps to at least one production-facing test driving the
real `begin()`/`settle()`/`finalize()` through the app-harness (`test/app-harness.js` `h.touch` + `h.raf` +
`h.clock`), each with a mutation that reddens it on the SUCCESSOR's real surface.

| id | Behavior proved | Fixture / transition | Mutation that must fail it | Layer |
|---|---|---|---|---|
| G1 | A stale settle rAF from a superseded pane-less session no-ops — it writes NO `translateX` onto the successor's borrowed-real movers | a genuinely pane-less **overlay→browse** (options→books, `paneOf` false — Loki's working Probe B fixture) live drag → release into settle with `deferRaf` (settle rAF pending); a 2nd touch supersedes and arms B; fire the old frame (`h.raf.frame()`); assert B's `#options`/`#browse` transforms are B's, unstained (the `:598-616` channel) | remove the `cur === session` guard on the settle rAF callback → the old frame writes a stale `translateX` on the successor's movers (Loki `noguard`: `#options=translateX(1024px)` over B's drag) | wiring (successor DOM transforms) |
| G2 | A 340ms `settleTimer` firing after supersession does NOT run `runFinalize` over the successor — no `applyScreen`/stack mutation for the old destination | a pane-less **overlay→browse** (options→books) live drag → settle with `fakeTimers` (340ms pending, `done` false); supersede → arm B; advance past 340ms so the old `settleTimer` fires `finalize_A`; assert no `browse.render`/`applyScreen` for A's dest and B's nav stack intact | remove the `cur === session` guard on `finalize` → `finalize_A` runs `runFinalize_A`, calling `applyScreen`/mutating the stack over B (the wrong-page class) | wiring (successor log + nav) |
| G3 | A late `transitionend` (the other `finalize` trigger) after supersession does NOT run `finalize_A` over the successor | a pane-less **overlay→browse** (options→books) live drag → settle; supersede → arm B; dispatch `transitionend` on the old anchor (`cur.movers[0].el` = `#options`, borrowed-real) firing the existing `{once}` listener; assert `finalize_A` performed no `applyScreen`/stack mutation over B | remove the `cur === session` guard on `finalize` → the late `transitionend` runs `finalize_A` over B | wiring (successor log + nav) |
| W | A superseding tap that never arms leaves future swipes working — the recovery cleared `finishing` | a pane-less **overlay→browse** (options→books) live drag → settle; a 2nd touch that supersedes but is a bare tap (touchstart+touchend, never crosses the lock, no `settle()`); then a fresh full pane-less **overlay→browse** swipe must engage (reach `settle`) — Loki's Probe C | omit `finishing = false` in the supersession recovery → `finishing` stays true and `session` is null (recovery nulled it) → the NEGATIVE gate `if (finishing && !(session && paneLess(session)))` rejects the next swipe, which never engages (the wedge class of `swipe-invariants.test.js:623-646`). (Under a positive pane-owning gate this mutation would NOT wedge — the F5 vacuity this pins.) | wiring (subsequent-gesture engagement) |
| PG | A PANE-OWNING (ghost/snapshot) settling session is STILL rejected by `begin()` — supersession does NOT dispose its held pane (the deferral boundary) | a browse→browse (ghost) live drag under `opts.realBrowse` → release into settle so a real owned pane exists; a 2nd touch; assert `begin()` returns (no recovery/arm) and the ghost pane is not disposed (`ghosts`/pane count unchanged). NOTE for Curie (F4): confirm the ghost pane genuinely materializes under `opts.realBrowse` and that the mutation disposes it, else PG is vacuous | the narrowed gate wrongly supersedes a pane-owning session → its owned pane is disposed mid-settle (the deferred, flash-unsafe path) | wiring (pane count, `opts.realBrowse`) |
| RG226 | The shipped `cancelAnimationFrame(cur.settleFrame)` still prevents a within-session stale transform after finalize (hidden-tab) | the .226 hidden-tab recipe (unchanged) | the slice drops the within-session settle-rAF cancel → the resumed rAF writes a stale transform | wiring (existing green) |
| RG6b | The 6b loser-cancels (`settleTimer`/`revealFrames`/`revealTimer`) still leave the scheduler queue at their resolver (within-session) | the 6b DF/RR fixtures (unchanged) | the slice drops a within-session loser-cancel → the loser stays pending | wiring (existing green) |
| RG6a | Stage 6a DRAGGING-supersession recovery (source re-render + scroll + kept rows) still holds | the 6a VR/SR/SC fixtures (unchanged) | the slice breaks the 6a recovery order | wiring (existing green) |
| RGend | After a terminal resolver the session is null (endpoint parity) | a pane-less commit and abort | the guard/recovery ends ownership early or leaves the session non-null | wiring (existing green, `:588`) |

**Fixture-vacuity note for Curie (F4, symmetric with PG — Loki lesser-plane "G-cells-missing-F4-note").**
G1/G2/G3/W require the fixture transition to be GENUINELY pane-less per the frozen spec `paneOf`
(`test/fixtures/swipe-plan-spec.mjs`) so the negative gate accepts the second touch and B actually arms. If
a fixture is pane-OWNING (e.g. home→browse, browse→browse, →home), the gate REJECTS, B never arms, and the
cell is UNSATISFIABLE (G) / unfalsifiable (W) — the exact Loki KILL. Curie MUST assert, per fixture, that
`paneOf(constructionPlanFor(from,to))` is false before the supersession step. overlay→browse (options→books)
and *→overlay are the safe choices; Loki's Probe B/C are working skeletons.

**Machine-readable coverage (gate).** Each blocking question (G1/G2/G3/W) has a complete row; PG pins the
deferral boundary; the RG* rows pin shipped parity.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
G1 | a stale settle rAF from a superseded pane-less session writes no translateX onto the successor borrowed-real movers | a genuinely pane-less overlay-to-browse options-to-books live drag paneOf false released into settle with deferRaf then a second touch supersedes and arms B then the old frame is fired and B movers inspected | remove the cur-equals-session guard on the settle rAF callback so the old frame stains the successor movers | wiring successor DOM transforms
G2 | a 340ms settleTimer firing after supersession does not run runFinalize over the successor so no applyScreen or stack mutation for the old destination | a pane-less overlay-to-browse options-to-books live drag settling with fakeTimers where a second touch supersedes and arms B then the clock advances past 340ms firing the old settleTimer | remove the cur-equals-session guard on finalize so finalize of the old session runs applyScreen and mutates the nav stack over B | wiring successor log and nav
G3 | a late transitionend the other finalize trigger after supersession does not run finalize of the old session over the successor | a pane-less overlay-to-browse options-to-books live drag settling where a second touch supersedes and arms B then transitionend is dispatched on the old anchor firing the existing once listener | remove the cur-equals-session guard on finalize so the late transitionend runs the old finalize over B | wiring successor log and nav
W | a superseding tap that never arms leaves future swipes working because the recovery cleared finishing | a pane-less overlay-to-browse options-to-books live drag settling then a second touch that supersedes but is a bare tap never crossing the lock then a fresh full pane-less overlay-to-browse swipe must reach settle | omit the finishing false clear in the supersession recovery so finishing stays true and begin rejects the next swipe which never engages | wiring subsequent-gesture engagement
PG | a pane-owning ghost settling session is still rejected by begin so supersession disposes no held pane | a browse-to-browse ghost live drag under realBrowse released into settle so a real owned pane exists then a second touch where begin must return and the ghost pane must not be disposed | the narrowed gate wrongly supersedes a pane-owning session disposing its held pane mid-settle | wiring pane count realBrowse
RG226 | the shipped settle-rAF cancel still prevents a within-session stale transform after finalize | the hidden-tab recipe deferring the settle rAF then finalizing then resuming the rAF | the slice drops the within-session settle-rAF cancel so the resumed rAF writes a stale transform | wiring existing green
RG6b | the 6b loser-cancels still leave the scheduler queue at their resolver | the 6b DF and RR fixtures | the slice drops a within-session loser-cancel so the loser stays pending | wiring existing green
RG6a | the stage 6a dragging-supersession recovery still re-renders the source and restores scroll and kept rows | the 6a VR and SR and SC fixtures | the slice breaks the 6a recovery order | wiring existing green
RGend | after a terminal resolver the session is null | a pane-less commit and abort | the guard or recovery ends ownership early or leaves the session non-null | wiring existing green 588
```

## 10. Records reconciliation (APPLY ON APPROVAL)

Scrub obligations when this ships (StandardsDocument §6.6; EC §4.22/§7). NOT applied by this plan — each is
a defining-record edit flagged for the maker/Zelda.

- **`js/app.js` I12 rationale comment (219-234)** — rewrite to current truth: the `cur === session` guard is
  now REACHABLE and LOAD-BEARING for the pane-less supersession window (6c); it remains deferred only for
  the pane-owning/held-reveal window (6d/7). The `finishing` gate is now NARROWED (pane-less supersedable),
  not blanket.
- **`js/app.js` `paneKindOf` / classifier comment (686-692) — CORRECT the false comment (Loki lesser-plane
  "app.js-686-comment-false").** The comment "app-ghost (browse→browse)" is WRONG against
  `constructionPlanFor`: an `app-ghost` forms for ANY non-overlay source bound for browse (home→browse AND
  browse→browse). The scrub must fix it to the classifier's actual rule (outgoing `app-ghost` iff
  source≠overlay ∧ dest=browse; incoming `home-snapshot` iff dest=home) — do NOT inherit the flaw the r3
  draft cited (it was the entry point for the domain misclassification).
- **`Claude/Subsystems/swipe-reveal.md`** — §8: the settle-phase callbacks (settle rAF, `finalize`) now
  no-op via `cur === session` when superseded; the null-on-retire writes and the `transitionListener`
  session-ownership/removal remain owed to 6d/7 (their reader — retired-while-owner — is unreachable until
  the held reveal is supersedable). §13/§14: narrow "must NOT dispose a pane owned by an active
  SETTLING/FINALIZING/REVEALING session" to a PANE-OWNING session, and record the TRUE supersession boundary
  — supersession is DEFINED (6c) ONLY for the pane-LESS set `{home→overlay, browse→overlay, overlay→overlay,
  overlay→browse}` (derived from the frozen-spec `paneOf`); the pane-OWNING set `{home→browse, browse→browse,
  browse→home, overlay→home}` — INCLUDING home↔browse and every →home — stays gated/deferred (6d/7)
  (EC §4.18). Do NOT write the r3 draft's false "home↔browse pane-less" membership. §11: add the
  cross-session stale-fire completions (settle rAF / 340ms / transitionend after supersession) as guarded by
  identity. §19: register the G1/G2/G3/W/PG mutations mapped to their tests. §20/§21: note the I12 ownership
  half (identity guard) landed in 6c for the pane-less/overlay-involving set; §23: annotate the stage-6
  revision condition as sub-sliced (6c = pane-less supersession + identity guard; 6d/7 = pane-owning
  (home↔browse, →home) + reveal supersession + null-bookkeeping + `transitionListener` + paint
  centralization).
- **`Claude/Decisions/DecisionLog.md`** — the "Owed to stage 6" entry (2026-07-21) is NOT discharged by 6c
  (F1): re-home the WHOLE null-handle debt (settle + reveal) to 6d/7, noting the reader (a
  retired-while-`cur === session` state) exists only in the held reveal. AND append a dated Stage-6c
  decision recording: the TRUE pane-less/pane-owning boundary from the frozen-spec `paneOf` (6c's delivered
  supersession window is the overlay-involving pane-less set; home↔browse and →home are pane-owning and
  DEFERRED to 6d/7 — the Loki KILL correction of the r3 draft's misclassification); the identity guard as
  the sole non-vacuous mechanism (the null-writes shrunk out per Charpy r1 F1); the `finishing`-clear wedge
  fix (F2) under the negative gate (F5); and the Option-A authorization with its honest scope (6c does NOT
  buy home↔browse supersession). Reference this plan, the r1/r2 casebooks, the Loki strike, the superseded
  escalation (`e273d70`), and the killed draft (`f604290`).
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — annotate: the ownership half of the finalization
  centralization (the `cur === session` model for the pane-less window) landed in 6c; the reveal-ordering/
  paint half (I10/I17), the null-bookkeeping, `transitionListener` ownership, `finalizationPlanFor`,
  `sameBrowseHost`, and pane lifecycle remain 6d/7. Point to `PLAN-swipe-stage6c.md`.
- **`docs/swipe-model.generated.txt`** — regenerate if line references shift; a code change bumps the build
  number (PWA deploy rule).
- **Engineering Contract §4.22 reviewable-stage naming** — this ships as "Stage 6c", so the deferred
  null-bookkeeping / pane-owning / paint half stays visible and the stage is not called complete on a partial
  delivery.
- **Campaign definition — FLAGGED (records/tooling decision owed, not resolved here).** The `swipe-stage6`
  campaign gate globs (`stage6-*`) do not match a `stage6c` artifact name (open since 6b §10). Before 6c can
  be checked complete, EITHER the globs widen OR a `swipe-stage6c.json` campaign is created. A tooling edit
  for Zelda; this plan neither chooses nor makes it.

## 11. What this does NOT do (deferred to 6d/7, with reasons)

Each deferral names the consumer that does not yet exist and the stage that introduces it (U2).

**Deferred to 6d/7 (the null-bookkeeping — F1):**
- **The settle-phase NULL-on-retire writes (`cur.settleFrame`/`cur.settleTimer` = null on retire) and the
  `transitionListener` session-ownership/removal.** Deferred: in the pane-less window a stale settle-phase
  callback always fires with `cur !== session`, so the identity guard subsumes them — the already-retired
  (retired-while-`cur === session`) reader that would redden them is unreachable until the held-reveal phase
  is supersedable. Adding them now is a §4.15 dead field. They land in 6d/7 with the pane-owning/reveal
  supersession that creates a retired-while-owner state.
- **The reveal-phase handles' guards + null-writes (`cur.revealFrames`, `cur.revealTimer`).** Deferred: they
  retire only inside the held reveal, which stays gated (below) — no successor can arm during it, so their
  guard/null is unreachable/vacuous today (§4.15). Land in 6d/7.

**Deferred to 6d/7 (the pane-owning / paint-centralization half):**
- **Supersession of the PANE-OWNING set `{home→browse, browse→browse, browse→home, overlay→home}` and the
  HELD-REVEAL-await-paint phase.** This set INCLUDES home↔browse (the dominant gesture family) and every
  →home — so in 6c those remain wedged-until-finalize; 6c does NOT buy their supersession (the honest
  re-statement of Option A's ownership half, §2.3; Loki KILL). Deferred because disposing a full-viewport
  cover pane on supersession — especially one held to cover the view until a paint frame lands — is the
  flash-sensitive paint operation the reveal saga is about (`holdGhostUntilPaintable`; memory
  `tomeroam-swipe-repaint-saga`). Its consumer is the paint-centralized reveal (I10/I17); 6d/7 extends
  supersession to this set on the `cur === session` model 6c establishes. Cell PG pins that it stays gated.
- **`finalizationPlanFor()` / rich `planFor()`; normalized `sameBrowseHost`; pane `release()`/
  `dispose(reason)`/`equivalence`; the full `recoverSession` reason/phase matrix; I10 paint-gated reveal
  centralization + I17.** Unchanged from the prior deferrals (6a/6b §11): their consumers are the
  restructured reveal/finalize path (6d/7); dead surface now.

**Deferred, unchanged (independent):**
- **The headline aborted-swipe repaint/flash.** Untouched and independent (`PLAN-swipe-reveal.md` §6); this
  slice adds no paint-gating and changes no reveal timing. The r3 draft's F3 caveat (a committing pane-less
  supersession surfacing this repaint) is WITHDRAWN for 6c and re-homed to 6d/7: `cur.clobbered` is set only
  by a browse→browse mid-drag render, browse→browse is PANE-OWNING (deferred), so no pane-less transition in
  6c's domain clobbers `#browse` — the recovery runs `render:false` and cannot reach the repaint path
  (Loki §5). The caveat becomes live only when 6d/7 makes browse→browse supersedable.
- **The `fadePanes` per-pane removal `setTimeout`** (app.js:649) — a self-guarded owned-decoration cleanup;
  belongs with the pane-lifecycle abstraction (6d/7).

## 12. Sequencing

This slice rests only on shipped Stage 5, Stage 6a (the supersession recovery it extends), and Stage 6b
(the loser-cancel it preserves). It does not gate, and is not gated by, the deferred 6d/7 work (§11); it is
the ownership foundation the paint-centralization builds on (6d/7 makes the pane-owning/reveal phase
supersedable on the `cur === session` model this slice establishes, and adds the null-bookkeeping once a
retired-while-owner state exists). It stops at the pane-less boundary so 6d/7 restructures the flash-sensitive
reveal path on a clean, guarded ownership base. Handoff order: Charpy (temper) → Curie (red suite from §9;
F4 — assert `paneOf` is false for every G1/G2/G3/W fixture so B arms, and confirm PG's ghost pane forms
under `opts.realBrowse`; overlay→browse (options→books) is the safe pane-less fixture, Loki Probe B/C are
skeletons) → Brunel (green; confirm `Nav.resetSwipeStyles` clears `transition` (F3), and place the finalize
identity guard BEFORE the `try/finally` — inside it drops the successor's row hold, §7) → Poirot (review) →
Mendeleev (coverage audit) → Loki (re-strike the §4 load-bearing promise on the CORRECTED domain — that a
settle-phase continuation firing after a successor takes ownership performs none of its effect; the
misattribution/race axis of cells G1/G2/G3 on genuinely pane-less fixtures, provable on the successor's real
DOM). Campaign definition-of-done: the `swipe-stage6` gates, with the 6c artifact-name reconciliation
flagged in §10.
