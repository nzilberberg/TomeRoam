# STRIKE — Stage-6c stale-callback no-op promise (PLAN-swipe-stage6c.md @ f604290)

Date: 2026-07-26. Commission: pre-build strike on the ratified Stage-6c plan (commit
`f604290`, `Claude/Plans/PLAN-swipe-stage6c.md`) against the CURRENT `js/app.js`
(build 2026-07-26.250) and the real `test/app-harness.js`. Blind: no casebooks, no
DecisionLog rationale read before this filing. The design is NOT built; the strike
constructs it in scratch exactly as §3 prescribes and executes it.

## 1. The promise (verbatim, and as testable behavior)

Plan §4 (the invariant): "When a gesture supersedes a PANE-LESS session that is still
settling or finalizing (`begin()`'s narrowed supersession branch), the old session's
settle-phase continuations cannot mutate the successor" — mechanism "the ownership-identity
guard" (`cur === session`), items 2/3 (guarded settle rAF, guarded finalize), item 4
("`finishing` is cleared on supersession (liveness)"), item 5 (the NEGATIVE gate
`if (finishing && !(session && paneLess(session))) return;`). §4 Basis: "the invariant is
'a settle-phase continuation that fires after a successor has taken ownership performs
none of its effect.'"

Testable form: (a) drive a pane-less session A into settle; (b) a second touch must
supersede it and arm B; (c) deliver A's three stale continuations (settle rAF, 340ms
`settleTimer`, late `transitionend`) after B owns; B's borrowed-real mover transforms,
screen, and nav stack must be untouched; (d) a superseding tap that never arms must leave
the next swipe engaging.

The promise's DOMAIN is defined twice in the ratified plan:
- §2.1: "Pane-LESS transitions (home↔browse, browse↔overlay, overlay↔home, …)".
- §3 (the gate's predicate): `paneLess(s) = !s.movers.some(m => m.own === 'owned-pane')`.

## 2. The plane

The two definitions disagree, and every proof cell in §9 is specified on the wrong side
of the disagreement. The shipped classifier (`js/swipe.js` `constructionPlanFor`, lines
131-137) makes the outgoing an `app-ghost` **owned-pane** for ANY in-flow source bound
for a browse destination — including home→browse — and the incoming a `home-snapshot`
**owned-pane** for ANY →home. The project's own frozen spec agrees
(`test/fixtures/swipe-plan-spec.mjs` STRUCTURAL_CASES rows home→browse app-ghost,
browse→home / overlay→home home-snapshot; `paneOf` exported there). So of §2.1's named
pane-less flows, home→browse, browse→home, and overlay→home are PANE-OWNING; the true
pane-less set is {*→overlay} ∪ {overlay→browse} only. The plan's §2.1 citation
(app.js:686-692, "app-ghost (browse→browse)") is a comment that is itself wrong against
the classifier. G1's ratified fixture — repeated in the §8 machine block — is "a
pane-less home-to-browse live drag": the frozen spec's first PANE-OWNING row.

## 3. The instrument (reproducible)

Scratch clone of the tree (index.html, js/, test/app-harness.js, test/dom-fixture.js,
node_modules junction); the §3 design applied to the scratch `js/app.js` by five
exact-match substitutions (throw on missed anchor):

1. Gate: `if (finishing) return;` → `const paneLess = (s) => !s.movers.some((m) => m.own === 'owned-pane'); if (finishing && !(session && paneLess(session))) return;`
2. Recovery predicate: `if (d || document.querySelector('.nav-ghost'))` → `… || (finishing && session)`
3. Recovery body: read `session.clobbered`/`session.scroll0` when `d === null` and
   finishing-session; add `finishing = false;` before `session = null` (identity-null last).
4. Settle rAF callback: `if (cur !== session) return;` before the transform write.
5. `finalize`: `if (cur !== session) return;` after the `done` set and the two cancels,
   before the try/finally (§5's placement).

Probes (node --test, harness `boot({ fakeTimers: true, deferRaf: true })`):
- **Probe A** — the ratified G1 fixture. Arrange fwdStack=[books] (books, committed
  browse→home back-swipe, held reveal completed), then a right-edge home→books forward
  drag released into settle; second touch + moves.
- **Probe B** — a genuinely pane-less fixture. books → options; left-edge options→books
  back-swipe (overlay real-source outgoing, real #browse incoming — no pane) released
  into settle (commit, rAF + 340ms pending); second identical gesture supersedes and
  drags; then fire the old frame (`h.raf.frame()`), advance past 340ms, dispatch
  `transitionend` on the old anchor (#options); inspect B's transforms, the SWIPE
  finalize log, session identity; then B completes; then a fresh swipe.
- **Probe C** — cell-W shape on the genuine fixture: superseding bare tap at mid-screen
  (recovery runs, edge check returns, B never arms), stale fires, then a fresh full swipe.
- **Mutants**: `noguard` (design minus the two identity guards — the G-cells' §9
  mutation) run against Probe B; `noclear` (design minus `finishing = false` — W's §9
  mutation) run against Probes C and A.

## 4. Predicted vs observed (executed 2026-07-26, node v22.23.1)

| Run | The promise/plan predicts | Observed |
|---|---|---|
| Pure classifier over all kind pairs | §2.1: home↔browse, overlay↔home pane-less | home→browse `app-ghost`; browse→home and overlay→home `home-snapshot` — **PANE-OWNING**; pane-less = {*→overlay, overlay→browse} only |
| Probe A (built design, ratified G1 fixture home→browse) | G1: "a 2nd touch supersedes and arms B" | **B NEVER ARMED** — gate rejected (`paneLess(A)` false); 0 hard-resets, 0 new starts, session stayed A (sid unchanged) |
| Probe B (built design, options→books) | stale rAF/timer/transitionend no-op; B unstained | HELD: B's mid-drag transforms (`190px`/`-834px`) unchanged after all three stale fires; no stale finalize line; B finalized (`#1 commit back options→books sid=2`); endpoint null; next swipe engaged |
| Probe C (built design, W shape) | recovery clears `finishing`; next swipe engages | HELD: 1 hard-reset (`sid=1`), session null, stale fires no-op, fresh swipe engaged and finalized |
| Mutant `noguard`, Probe B | §9 G1 mutation "reddens … the old frame writes a stale translateX on the successor's movers" | REDDENED as predicted: after the stale rAF, `#options=translateX(1024px)`, `#browse=translateX(0px)` — A's settle targets over B's drag |
| Mutant `noclear`, Probe C (re-targeted fixture) | §9 W mutation "the next swipe … never engages" | REDDENED: fresh swipe starts+0, wedge |
| Mutant `noclear`, Probe A (ratified fixture class) | §9: "each with a mutation that reddens it" | **PASSED IDENTICALLY** — the recovery is never entered on a home→browse fixture, so W's mutation is invisible there; the cell cannot redden as specified |

## 5. Verdict — KILL (domain fracture), with the mechanism itself surviving

The §4 mechanism is sound and load-bearing **where its domain actually exists**: on the
true pane-less set the identity guard neutralized every stale continuation I could
construct, its removal provably stains the successor, and the `finishing` clear provably
prevents a wedge. That half is a genuine held stone and is evidence the §2 crux (the
owned-pane dividing line) is the RIGHT line.

The kill is the promise's ratified DOMAIN: the plan defines "pane-less" one way in the
gate (§3, the predicate the built code obeys) and the opposite way in §2.1 and every
G/W fixture (§8/§9). Executed consequence on the plan's own designated inputs:
- **G1/G2/G3 are unsatisfiable as ratified** — their fixture ("a pane-less
  home-to-browse live drag") is pane-owning, the gate rejects the second touch, B never
  arms, and the cells' premise fails before any assertion runs (Probe A). A red suite
  authored from §9 stays red against a CORRECT build of this design.
- **W is unfalsifiable as ratified** — its mutation cannot redden on that fixture class
  (mutant `noclear` + Probe A, identical pass), the exact §9-vacuity class the plan's own
  F1/F5 reasoning exists to exclude, and a violation of §9's ratified claim "Every
  load-bearing promise … maps to at least one production-facing test … with a mutation
  that reddens it."
- **The slice's scope claim is overstated** — §1/§2.3 promise supersedability for the
  window §2.1 enumerates; the delivered window is destination-overlay + overlay→browse
  only. home↔browse and →home — the dominant gesture families — remain wedged-until-
  finalize, contrary to what the ratified plan records Option A as buying in 6c.

Blast radius if built as ratified: Curie's red suite (handed "red suite from §9" per
§12) encodes the false boundary; §10's records edits would write "supersession is now
DEFINED for the pane-less phase" plus §2.1's wrong membership into the subsystem doc,
DecisionLog, and the I12 comment rewrite; the F3 caveat analysis (parity-with-abort) was
argued over transitions that cannot reach the superseded-commit path it caveats.

The fix is a boundary/fixture correction, not a mechanism redesign: re-enumerate the
pane-less set from the frozen spec (`paneOf`), re-target G1/G2/G3/W onto {*→overlay,
overlay→browse} fixtures (Probe B/C are working skeletons), correct §2.1 and the
app.js:686-692 comment, and decide explicitly whether home↔browse supersedability — most
of the user-visible value — moves to 6d/7 with the pane-owning half. Return to the
planner.

## 6. Lesser planes found, un-prosecuted (one line each)

- **finalize-guard placement**: if the guard lands inside the try (or at `runFinalize`'s
  top) instead of before it (§5's placement), a stale finalize's `finally` runs
  `dropRowHold()` against the MODULE session — dropping the successor's live row hold;
  build/review watch-point.
- **app.js:686-692 comment**: "app-ghost (browse→browse)" is false against
  `constructionPlanFor` (any in-flow→browse ghosts); the flaw's likely entry point —
  §10's comment rewrite should correct it, not inherit it.
- **F4 asymmetry**: the plan flags fixture-vacuity for PG ("confirm the ghost pane
  genuinely materializes") but not for G1/G2/G3/W, where the same class is certain, not
  merely possible.

## 7. Probe artifacts

Disposable, scratch-only (session scratchpad `tree/`, `tree-noguard/`, `tree-noclear/`,
`apply-design.js`, `apply-mutant.js`, `tree/test/probe-classifier.js`,
`tree/test/probe-built.js`); reproducible from §3 of this record. No production file,
test, or record was modified. Probe B/C route to the test author as red-candidate
skeletons for the re-targeted cells.

```json
{"persona":"loki","stage":"6c","input_artifact":"f604290","promise_id":"stale-callback-no-op","verdict":"KILL","nonblocking_ids":["finalize-guard-placement","app.js-686-comment-false","G-cells-missing-F4-note"],"return_to":"vitruvius"}
```
