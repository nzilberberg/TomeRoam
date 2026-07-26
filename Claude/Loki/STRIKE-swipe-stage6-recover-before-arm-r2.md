# Loki strike — Stage-6a `recover-before-arm` (r2)

**Date:** 2026-07-26
**Input artifact:** ratified plan `Claude/Plans/PLAN-swipe-stage6.md` at commit `6e3a596`
**Promise id:** `recover-before-arm-r2`
**Verdict:** HELD STONE
**Blind:** filed without reading any prior strike (`STRIKE-swipe-stage6-recover-before-arm.md`), any Charpy casebook, or the DecisionLog rationale. Read set: the ratified plan and the current code only.

---

## 1. The promise (verbatim + testable)

Verbatim, from the plan §3 "Item 4 — the hold envelope" plus §6 "Ordering contract":

> The source re-render + scroll restore run while the Browse hold is STILL HELD, and the hold is
> released (`dropRowHold()` -> `Browse.endHold()`) only AFTER them. On a virtualized source, releasing
> the hold first deactivates the suspended source controller and dematerializes its kept rows
> (`browse.js` `endHold` -> `virtuallist.js` `deactivate()`), so the re-render rebuilds the page from
> nothing and the successor's `start()` snapshots a cover-less grid. Holding until after the render lets
> `endHold` do its single realization against the settled scroll REUSING the kept rows.

And §3 Basis U11's strongest word:

> The mechanism is fixed because **exactly one design satisfies the invariant**: reproduce the abort's
> full restore ENVELOPE — render + scroll INSIDE the hold, `endHold` LAST — not merely its middle pair.
> **There is one admissible behavior; no other section contradicts it.**

**Testable restatement.** On a new gesture that supersedes a LIVE browse→browse drag whose source is a
virtualized (>600-row) page scrolled deep, if `begin()` performs the teardown in the ratified order —
(2) release listeners keeping `session`/`d`/hold set → (3) re-render source into `#browse` iff
`d.clobbered` + `window.scrollTo(0, d.scroll0)` while the hold is held → (4) `dropRowHold()`→`endHold()`
LAST → (5) null `session`/`d` → (6) arm the successor — then after step 4 the visible `#browse` page is
the SOURCE page with its ORIGINAL row nodes still present and its controller `active`, so the successor's
`start()` `snapBrowse(true)` snapshots the kept-row source.

**Broken** = after the recovery the visible source page's realized rows are identity-new (rebuilt) or its
controller is not `active` (leaked/unrealized), i.e. the `.178/.202` wrong-content class the hold exists
to prevent.

## 2. Grain studied (current code, HEAD)

- `js/app.js` `begin()` 351-397 (current hard reset 361-375), `start()` 427-484 (`d.clobbered =
  c.sourceWasClobbered` at 470; `takeRowHold` at 430; `revealBase = snapBrowse(true)` at 429),
  `dropRowHold` 339-343 and `releaseGesture` 324 (both READ module-scoped `session`), `finalize()`'s
  `finally` 1138-1139 (the abort's proven `dropRowHold(); endOwnership()` after `runFinalize`), the
  clobbered-abort mirror at 1090-1098 / 1116-1117.
- `js/browse.js` `beginHold` 140-148 (`setScrollSuspended(true)`), `endHold` 149-181 (clears `holdRows`,
  `setScrollSuspended(false)` FIRST, then unparks/hides, then `activate()`+`_realize()` on the shown
  page, then `deactivate()` on still-suspended pages), `showPage` 260-312 (`holdRows` → `suspend()` the
  outgoing; `returningFromSwipe = holdRows && state==='suspended'` DEFERS activation), `render` 475-540
  (cache-hit branch 478-484 = `showPage(key); o.onRender(); positionOnEnter(...)`), `applyScrollY`
  218-234, `evictLRU`/`MAX_PAGES=12` 328-337.
- `js/virtuallist.js` `suspend` 273-278, `deactivate` 245-257 (dematerializes), `activate`/`_realize`
  204-235, the shared scroll dispatcher `onDocScroll` 144-149 gated by `scrollSuspended`.
- `js/nav.js` `applyScreen` 116-142 (`render:true` → `d.renderBrowse` → `Browse.render`; `setView('browse')`
  does NOT fire `browseWillHide` when the target IS browse).

Confirmed within scope: for browse→browse, `sourceHost`='in-flow' → `appViewEl`=`#browse` and the dest
render host is `$('browse')`, so `sourceWasClobbered = (#browse === #browse) = true` always — `d.clobbered`
is always true for the scoped case, so step-3's `render` flag always fires. `currentDesc()` is the source
(a pre-settle live session never mutated the nav stack). `d.scroll0` is the source's start scroll.

## 3. Strike — the plane and the executed body

**Plane chosen:** the strongest word — "exactly one design satisfies the invariant … the successor's
`start()` snapshots the RESTORED, kept-row source." I attacked whether the ratified §6 order, executed
against the REAL `browse.js`/`virtuallist.js` on a forced-virtual deep-scrolled source, actually keeps the
source rows through the re-render and realizes them, and whether either prescribed mutation breaks it.

**Instrument (disposable probe, jsdom, harness mirrors `test/browse-virtual.test.js`).** Forced-virtual
700-row `books` source + `authors` dest; source realized at scroll 20000 (13 rows) and its row NODES
captured in a Set (node identity = a kept row is the SAME element — Loki's stamp, matching `snapBrowse`).
Live drag = `beginHold()` then `showPage('authors')` (the mid-drag dest render, which `suspend()`s the
source). Recovery = the supplied choreography. Step 3's `applyScreen(currentDesc(),{render:true,
resetScroll:false})` is driven by its provably-equal cache-hit internals `showPage('books') +
positionOnEnter(...)` (`browse.js` render 478-484). Measured: shown page identity, kept original nodes,
fresh rebuilt nodes, controller state, realized count. Run with `C:/Users/nzilb/tools/node-dist/node.exe`
from the repo root (so `jsdom` resolves).

**Predicted split before running:** promise → `keptOriginalRows>0, srcState=active`; fracture →
`keptOriginalRows=0` (rebuilt) or `srcState≠active`.

**Executed result:**

| Scenario | keptWhileSuspended | shownIsSource | srcState | keptOriginalRows | freshRebuilt | Outcome |
|---|---|---|---|---|---|---|
| A. Plan §6 order (render inside hold, `endHold` LAST) | 13 | true | active | **13** | 0 | **PROMISE MET** |
| B. Mutation (a): `endHold` BEFORE the re-render (current code's order) | 13 | true | active | **0** | 13 | promise BROKEN (rebuilt) |
| C. Mutation (b): `session` nulled before `dropRowHold` ⇒ `endHold` never fires | 13 | true | **suspended** | 13 | 0 | promise BROKEN (leaked, unrealized controller) |

The promise, built exactly as §6 prescribes (Scenario A), **holds**: the 13 original row nodes survive the
re-render and the controller is `active` and realized against the settled scroll — the successor's
`snapBrowse(true)` would snapshot them. Both prescribed mutations break it exactly as the plan's cell VR
(a)/(b) predict: releasing first rebuilds all 13 rows from nothing; nulling identity first leaves the hold
leaked (`state='suspended'`, the WS1c "live hidden controller" the design forbids).

**Additional plane — eviction (the promise's precondition "source rows stay SUSPENDED").** `evictLRU`
(`MAX_PAGES=12`) picks the LOWEST `order`. The source is shown immediately before the drag, so it is the
MRU (highest `order`). Executed check: with the cache filled to 16 and `keepKey='authors'`, the first
eviction victim is `seed0`, never `books`. So `evictLRU` cannot destroy the source during its own drag —
the plan's NB4 "eviction" scoping is **sounder than stated**: source-eviction is unreachable in the swipe
path (only a mid-drag `clearCache` can destroy it, which is the genuinely-async NB4 residual).

## 4. Verdict — HELD STONE, with reasoning

The corpse the commission asked for did not appear: the ratified construction delivers the promise on the
real virtualized modules, and the two ordering defects the plan claims are load-bearing genuinely are. The
"exactly one admissible order" claim survived a direct, executed attack. Every sub-case where the promise
WOULD break is one the plan already enumerated and scoped out:

- **NB4 cache-miss/eviction async re-render** — real but bounded; I verified normal-swipe eviction of the
  source is impossible (MRU), narrowing it to mid-drag `clearCache`, which the plan flags.
- **NB2 SWR replay through `endHold`'s `heldRepaints`** — shared identically with the normal abort's
  `endHold`; the plan names it.
- **NB3 display:none cover drop / NB1 recovery-window scroll write** — flash-class / addressed by the
  `endHold`-after-scroll ordering; the plan closes NB1 by construction (§7) and defers NB3 as parity.

## 5. Planes struck, residual doubt, where I'd strike next (held-stone rigor)

Struck and held: the core VR ordering (A vs mutation a); the identity-null ordering (mutation b); the
`d.clobbered`-always-true reasoning for browse→browse; `currentDesc()`=source pre-stack; the cache-hit
re-render keeping the source suspended (`returningFromSwipe`); eviction-of-source unreachability.

**Named residual suspicion (NOT an executed body — filed as a suspicion, not a finding).** Between step 4
(`endHold`, which sets `scrollSuspended=false` and leaves the source controller `active`) and the
successor's `start()` (which runs on the successor's first `touchmove`, not at `begin()`), the shared
scroll dispatcher (`virtuallist.js onDocScroll`) is LIVE. A browser-originated `scroll` event in that
window — plausibly emitted when the recovery removes the outgoing `.nav-ghost` (no `keepGhosts`) or
display:none's the dest and iOS re-seats layout — would `_realize()` the active source at a transient
offset and could release the kept rows before `start()` snapshots them. This is adjacent to but distinct
from the plan's NB1 (which addressed the scroll WRITE inside the recovery, while the hold is still
suspended); this concerns a scroll AFTER `endHold`. jsdom emits no such scroll (rAF/scroll are synthetic),
so I could not construct an executed body — it needs a real-browser/device harness. **This is where I would
strike next with a device budget.** Recommend it as a Curie keeper cell: "after supersession recovery on a
virtualized source, a scroll event fired before the successor's first move must not release the kept rows."

Probe kept beside this record for reproduction:
`C:/Users/nzilb/AppData/Local/Temp/claude/.../scratchpad/probe.js` (scratch; not committed).

---

```json
{"persona":"loki","stage":6,"input_artifact":"6e3a596","promise_id":"recover-before-arm-r2","verdict":"HELD_STONE","nonblocking_ids":["NB-post-endHold-scroll-realize"],"return_to":"none"}
```
