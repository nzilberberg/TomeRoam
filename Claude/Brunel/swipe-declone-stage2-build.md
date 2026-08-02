# BUILD LOG — PLAN-swipe-declone.md Stage 2 (the `browse→browse` de-clone)

**Date:** 2026-08-01
**Plan:** `Claude/Plans/PLAN-swipe-declone.md` §13 step 10 (the whole functional change, ONE commit).
**Forge:** `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r4.md`.
**Red suite:** `Claude/Curie/RED-swipe-declone-stage2.md` (`RED_SUITE_READY`, committed at `be7da1c`).
**Built against:** HEAD `be7da1c`, build `2026-08-01.291`.
**Shipped as:** build `2026-08-01.292`.
**Verdict:** `BUILD_GREEN`.

---

## 1. The reachability finding the stop-condition asked for

**A same-key `browse→browse` pair is UNREACHABLE, and the derivation is a trigger census, not a
stack-mechanics argument.**

The concern is real in shape: `Browse.pageElFor` is keyed on `keyOf(desc)`, so a same-identity pair
(`authorBooks(A) → authorBooks(A)`) would resolve BOTH mover slots to one cached node, which
Invariant D6 forbids and which the plan does not address.

A gesture's two endpoints are always ADJACENT nav-stack entries — `from = currentDesc()`, and `dest`
is `navStack[len-2]` (back) or the `fwdStack` top (forward), and the forward stack is only ever fed
by popping the nav stack. So the question reduces to: can two adjacent stack entries share a
`keyOf`?

- The seven append sites are PINNED in `docs/swipe-model.generated.txt` §2 and asserted by
  `test/swipe-model.test.js`'s `VERIFIED_APPEND_SITES`.
- A BARE descriptor can never be adjacent-duplicated: `navTo` REPLACES the stack top when
  `cur.v === desc.v` and the descriptor carries neither `author` nor `book`. `openSub`'s push is
  guarded on the current view being `options` and pushes a sub, which is never `options`.
- A PARAMETERIZED descriptor always pushes, so the census is of its TRIGGERS:
  - `authorBooks(A)` is pushed only by `openAuthor`, whose only trigger is `authorRow`
    (`js/browse.js:753`), and `authorRow` is rendered only on the **authors** page
    (`listView(el,'Authors',…)` and its `patchRows` twin). Predecessor key: `authors`.
  - `files(B)` is pushed only by `openFiles` — triggered by `bookRow` (`js/browse.js:783`), rendered
    only on the **books** and **authorBooks** pages, and by the home-screen tile
    (`js/app.js:1547`) — and by the Now-Playing forward nav (`filesDescForCurrent`). Predecessor
    key: `books`, `author:<rk>`, `home` or `nowplaying`.

At every push site the current descriptor's key differs from the pushed one's, so no two adjacent
entries share a key and `buildConstruction` can never receive a same-key browse pair.

**⚠️ A TENSION WITH A RATIFIED RECORD, recorded rather than resolved here.**
`test/fixtures/swipe-plan-spec.mjs:105` and `docs/swipe-model.generated.txt` §2 both state that
`authorBooks(A) → authorBooks(A)` IS reachable. Their stated ground is only *"navTo pushes it"* —
they reason about the replace/push guard and never trace the trigger set. Their PURPOSE is also
narrower than it reads: the claim exists to forbid a production throw for the pair (an UNREACHABLE
guard is the dead-code pattern this project rejects), not to assert that a user can perform the
gesture. Both readings are consistent with the census above.

**Consequence for this build:** nothing is added. No same-key guard is written, because a guard for
an unreachable coordinate is exactly the dead code the frozen spec's own comment forbids. The
fragility is that this rests on a TRIGGER census, which is not structurally pinned the way the
append sites are — **a new author link on an `authorBooks` page, or a book row on a `files` page,
re-arms it.** That is a finding for the planner, filed here rather than acted on.

## 2. The mechanism that landed

`#browse` KEEPS its `position: fixed` inset box and gives up only `overflow-y: auto` and its
padding. Each `.browsepage` becomes `position: absolute; inset: 0` inside it, carrying the padding
and the scroll declarations.

| Surface | Change |
|---|---|
| `css/app.css` | new `.browsepage` base rule (absolute, `inset: 0`, the retired `#browse` padding + overflow); `body.has-player .browsepage` padding-bottom; `.browsepage.parked` loses position/insets/max-width/margin and parks by transform alone; `#browse` loses padding + overflow; `body.has-player #browse` loses padding-bottom; the Invariant P comment re-derived (the two park rules now SHARE it); the `#browse` comment rewritten to a box that is not a scroller; `.browsepage` added to BOTH native-scrollbar suppression rules |
| `js/browse.js` | the `sy` cache, its scroll listener, `restoring`/`restoreGen`/`beginRestore`/`endRestore`, the two-frame finalizer and the `isRestoring` accessor DELETED; `applyScrollY(page, y)`; `playingTrackY` reads `page.scrollTop`; `virtualView`'s metrics + `scrollTo` closures read `m` (its own page node); `entryScrollY(descV, trackY)` returns `null` for a list page; `positionOnEnter` writes only a DERIVED position; `endHold(token, landed)` reconciles from the landing; new `Browse.pageElFor(desc)` (throws on a miss) |
| `js/swipe.js` | the kind→host projection gains `'browse-page'` on BOTH ends for the browse pair; `outgoing` collapses to `'real-source'`; `renderDestination` gains `'browse-page'`; `ghostApp`, `ghostWrap`, `freezeArt`, `copyScroll`, `copyAnimPhase` and `finalizationPlanFor` DELETED; `capture` REMOVED from the return |
| `js/app.js` | the env literal's two `'browse-page'` branches resolve through `Browse.pageElFor`; `dropRowHold` hands `endHold` the landed screen; the `finPlan` session field and every reader deleted; the held abort-reveal branch deleted |
| `js/nav.js` | `resetSwipeStyles` sweeps every `.browsepage` — the first borrowed mover with no id |
| `js/scrollbar.js` | `surfaceKind` gains the `.browsepage` case (a page carries no id, so the id test cannot see it) |

**⛔ The id-strip double-occurrence trap was honoured.** `js/swipe.js`'s id-strip line occurred
twice; only the `ghostApp` copy was deleted, by removing the whole function rather than by text
match. `npPillClone`'s copy is intact and `NPPILLIDS` proves it.

## 3. The thirteen cells

All thirteen are green, and the four files run 20 subtests green (the cells plus their
fixture-sanity and anti-vacuity halves). `PAGEISVIEW`, `PARKBOXEQUAL`, `BROWSESURFACE`,
`RESETCOVERSPAGES`, `MOVERSDISTINCT` (both layers), `NOGHOSTATALL`, `ABORTNORENDER`,
`PAGEOWNSSCROLL` (both halves), `ENTRYNOZERO` (both halves), `LANDEDPAGESHOWS` (all three) went
RED→GREEN; `MOVERHASBOX`, `PARKLOSESTRANSFORM` and `NPPILLIDS` were green at HEAD and stayed green.

**F23 is untouched:** the force-virtualization knob on `LANDEDPAGESHOWS`'s `browse→home` half and
on `PAGEOWNSSCROLL`'s measured-element half is retained, with its fixture-sanity failure message.

## 4. Mutants — 24 registered, 13 re-anchored, 16 de-registered

`tools/mutate.mjs` goes from 116 to 124 entries (116 − 16 + 24). **37 targeted indices swept in the
FOREGROUND, in batches inside the 600s window: 0 uncaught, 0 unapplied, 0 stale flags, and no
`*.mutbak` remains.**

**The rot was larger than Curie's forecast, and the extra ten are this build's own doing.** Curie's
§4 named 18 anchors the plan's deletions would rot; the anchors gate measured **28** against the
built tree. The additional ten are anchors on machinery this commit removed beyond the §12 list —
the held abort-reveal branch and the reveal diagnostics it fed (see §6). Of the 28: 14 were
re-anchored and 14 de-registered; the sweep then found `swipe6e NOOP-a`/`NOOP-b` inert and one more
re-anchored entry (`NOOP-b`) was de-registered with them, leaving 13 re-anchored and 16
de-registered.

**Three genuine findings the sweep produced, each fixed rather than accepted:**

1. **S2-21 came back UNCAUGHT.** `keyFor` pre-filtered non-browse views through a `BROWSE_VIEWS`
   set, which decided the miss BEFORE the cache lookup — so the registered mutant that drops the
   cache test applied cleanly and changed nothing. That was a deviation from §5.3.6, which names
   the cache lookup as the probe. `keyFor` now returns a key for every well-formed descriptor and
   `pageCache.has()` is the sole discriminator; S2-21 is killed by its designated cell.
2. **`stage6a (a)` came back UNCAUGHT.** Its subject — releasing the hold before the recovery
   RENDER — died with the render. The REQUIREMENT relocated (§9 item 6: the hold releases after the
   finalize path's `applyScreen`, which is what makes `currentDesc()` the landed screen), so the
   anchor was re-anchored there rather than dropped. Killed by `LANDEDPAGESHOWS`'s commit half.
3. **`M1NOWRITE`'s re-anchor mangled its own `to`** into a different defect (`render: true` instead
   of `resetScroll: true`), which is why an unrelated cell killed it while its designated cell
   stayed green. Corrected; both `M1NOWRITE` and `M1NAVWINS` are now killed by their own cells.

**`swipe6e NOOP-a` and `NOOP-b` were DE-REGISTERED after coming back uncaught.** Both asserted which
of two mechanisms disposes an OWNED PANE; none is built, so both sweeps remove nothing. Nothing is
left undefended: `keepGhosts` suppresses a sweep of a node kind that is never created and is itself
on the §12 item 14 subtraction list, and the `nav.js` sweep line it guards is RETAINED for the NP
pill float, whose removal the `DEC` cell defends.

Every other de-registration names the deleted text and the guard's status. Every re-anchor keeps the
mutation INTENT and states what moved.

## 5. The six non-mutation surfaces §10/§12 miss — all migrated

- `test/swipe-construction.test.js` — `CONSTRUCTION_KEYS` is now `['decorations','movers']`; four
  cells whose only subject was the built pane deleted with a note naming `NOGHOSTATALL` as successor.
- `test/swipe-stage6d.test.js` — DELETED with `finalizationPlanFor`.
- The GENERATED inventories **and their generators** — `tools/gen-swipe-model.mjs` and
  `tools/gen-transition-matrix.mjs` lost the `abortRender` column and field; the hard-reset
  TERMINATION row, the §5 supersession prose and the §10 policy ledger entry were rewritten to
  describe the code they mirror; both docs regenerated.
- `M1WRITERSET` — entries 3, 4, 6 and 9 re-derived; the 11/12 group is one member (the held abort
  path is gone); the S2 horizontal class lost its `js/swipe.js` member with a stated reason.
- Plus: `test/construction-consumers.test.js`, `test/swipe-transition.test.js`,
  `test/swipe-model.test.js` (the supersession fingerprint RE-VERIFIED line by line and the §8A
  ledger id renamed), `Claude/Decisions/PolicyLedger.mjs`, `test/screens.test.js`,
  `test/app-harness.js` (the fake Browse gains `pageElFor` and records `endHold`'s landed argument).

## 6. Pulled forward from step 11, and why

`holdGhostUntilPaintable`, `ghostVsReal`, `fadePanes`/`FADE_MS` are §12 item 12/13 subtraction
items. They are deleted HERE because deleting the held abort branch (required by §12 item 15a and by
`ABORTNORENDER`) removed their only callers, and an uncalled function is a **lint error** — this
commit must not leave a red gate on a half-migrated tree (§9 item 4). Each carries the reason it is
unreachable, which is step 11's exit condition satisfied early for those three.

## 7. Battery

`no-mutbak ✓  stamp ✓  lint ✓  typecheck ✓  tests ✓  campaign-gates ✓  stage-manifest ✓
retired-name ✓ — PASS`. Suite: 807 tests, 806 pass, 0 fail.

## 8. What remains OWED

- **Step 10a — the park-geometry probe, and it BLOCKS step 10b.** The reveal delta after a mid-park
  content mutation must read 0 on the real-engine instrument. Not run here: it is the deriver's row,
  and plan §9 item 5 makes it a gate ordering — a non-zero result stops the sequence, because the
  abort-repaint symptom would then have three candidate causes and the device gate could not
  separate them.
- **Step 10b — the device gate**, on the form that ships. Nothing in this commit speaks to R2b's
  remaining half (whether an off-viewport absolutely-positioned page PAINTS outside the viewport),
  R3 (the A–Z strip), R4 (virtualizer anchoring under a changed scroller), R5 (whether the abort
  repaint survives), R6 (iOS fixed-layer displacement), R7 (the filmstrip itself, no jump at drag
  start, an abort returning to its source) or R8 (a page's `scrollTop` surviving `display: none` on
  WebKit). jsdom has no layout, paint, compositing, scroll anchoring or `transitionend`.
- **Step 11 — the subtraction pass**, with its remaining items: `dropPanes`, `revealPending`, the
  `owned-pane` filters, the capture-recording block and its diagnostic readers, the `.nav-ghost`
  sweeps, the `keepGhosts` parameter and the `env.scrollY` supplier.
- **Step 12 — code review.** This build has not been reviewed.
