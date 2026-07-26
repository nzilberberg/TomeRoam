# Stage-5 coverage residuals — regression guards

Type: test-design (Curie)
Date: 2026-07-26
Target: HEAD (build 2026-07-26.247)
Source: `Claude/Mendeleev/AUDIT-swipe-stage5.md` (W22 bare_cells + N1 npLock, N2 comment scrub)
Verdict: **COVERAGE_FILLED** — three guards authored, all GREEN on HEAD (behavior confirmed + now guarded). No latent bug found.

## Cells filled (all in `test/swipe-stage5-residuals.test.js`, driving the real `start()` via the app-harness)

| Cell | Test | Result | What it pins / non-vacuity |
|---|---|---|---|
| **F5a** | `F5a — the mid-drag render forwards the FULL dest descriptor payload (not just .v) into showAppView` | **GREEN** | An NP→files FORWARD swipe has `dest = filesDescForCurrent()` = `{v:'files', book:{ratingKey:'bookA'}}`. Asserts the fake `Browse.render` received the `.book` payload (`args[1].ratingKey === 'bookA'`), proving `env.renderDestination` forwards the whole `dest` to `showAppView`, not just `.v`. Mutation forwarding `{v:dest.v}` → payload `null` → red. |
| **F1a-L3** | `F1a-L3 — toMover emits the \`own\` key: a held-reveal owned-pane is disposed by its own type, borrowed-real views survive` | **GREEN** | A commit→home HELD reveal builds an owned-pane snapshot. On the held path `applyScreen(dest,{keepGhosts:true})` (app.js:1092) keeps the ghost, so the **own-gated** `fadePanes` (app.js:641, `m.own !== 'owned-pane'` → skip) is the SOLE disposer. Asserts the pane leaves the DOM (`ghosts → 0`) and the borrowed-real `#home` survives. A `toMover` emitting only `{el,base}` (dropping `own`) → `fadePanes` matches nothing → pane stranded → red. This is the one path where `own` is uniquely load-bearing (on non-held paths `resetSwipeStyles` removes ghosts regardless of `own`, which is why F1a-L3 must use a held reveal). |
| **npLock** | `npLock — an NP-source back-swipe unlocks document.body.np-locked (the decorations consumer effect)` | **GREEN** | Opening NP sets `body.np-locked` (nav.js:77). Drives a live NP-SOURCE back-swipe and asserts the class is removed by `start()`'s decorations loop (app.js:491-492). jsdom-observable (unlike the Stage-6 device-only KEEPER). Dropping the decorations loop → `np-locked` stuck on → red. |

## N2 — comment scrub (StandardsDocument §7)

`test/swipe-invariants.test.js:97-105` claimed the WIRING pill test proves `start()` consumes
`plan.decorations`. Post-Stage-5 relocation the pill CLONE is an **L1** effect built inside
`Swipe.buildConstruction` (`npPillClone`), not by `start()`'s decorations loop — so the test proves the
end-to-end L1 pill build, and `start()`'s own decorations consumer is the np-locked unlock (now guarded
by the `npLock` cell above). Corrected the comment to state what the test actually proves and to
cross-reference the npLock guard. Not a coverage change.

## Why no bug

The audit's forward read predicted two device-only failure shapes if these stayed bare — a drilled-in
page rendering empty after a swipe (F5a payload dropped), and a teardown freeing the wrong pane type
(F1a-L3 `own` dropped). Both behaviors are CORRECT on HEAD: the payload passes through intact, the
owned-pane is disposed by its `own` type while borrowed-real views survive, and the outgoing-NP unlock
fires. Each is now a live regression guard.

## Full suite

`C:/Users/nzilb/tools/node-dist/node.exe --test "test/*.test.js"` → **693 tests, 692 pass, 0 fail,
1 skipped (Stage-6 KEEPER), 0 todo**. No production touched; no commit.

```json
{"persona":"curie","task":"stage5-residuals","verdict":"COVERAGE_FILLED","cells":["F5a","F1a-L3","npLock"],"bugs":[],"full_suite":"692 pass / 0 fail"}
```
