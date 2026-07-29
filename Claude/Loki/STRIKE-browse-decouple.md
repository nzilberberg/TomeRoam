# STRIKE — the `#browse` scroll DECOUPLE (PLAN-browse-decouple.md), 2026-07-29 — HELD STONE

Commission: break the load-bearing promise of the `#browse` fixed-own-scroll decouple
(Charpy-FORGE'd, HEAD `4d9200d`) — "making `#browse` fixed/own-scroll + re-homing B1–B6
preserves EVERY behavior; nothing else reads `window.scrollY` assuming `#browse` in-flow;
the KIND-model change is coherent; browse→browse/overlay swipes work with a fixed
`#browse` mover." BLIND pre-build. Both my prior `#home`-decouple KILLs (the `env.scrollY`
ghost-jump seam-miss; the browse→home cover-warmth) were the asymmetric `#home` version;
this is the symmetric `#browse` version. I hunted the analogous and the new, executed the
two most promising surfaces, and the stone held. Device-class paints (R-flash/navbar/
strip/browse2browse) and flash C are out of scope per the commission and were not struck.

## Planes struck

### Plane 1 — seam-completeness (my specialty; I found the `env.scrollY` launder before). HELD.
The plan re-homes SIX window-scroll consumers (B1 virtual list, B2 recorder, B3
`applyScrollY`, B4 `playingTrackY`, B5 scrollbar, B6 swipe `scroll0`/`srcScroll`/`ghostY`).
**Attack:** exhaustive grep of the seam across `js/` (non-vendor) —
`window.scrollY`/`pageYOffset`/`scrollingElement`/`documentElement.scrollTop`/
`document.body.scrollTop`/`window.scrollTo`/`env.scrollY`/`scrollIntoView`, then a second
sweep of `getBoundingClientRect`/`.scrollTop`/`.scrollHeight`/`.clientHeight`/`.offsetTop`/
`scrollTo(`/`scrollBy`, then `position:sticky`/inline scroll handlers in css+index.html.
**Result:** every window-scroll reader/writer is one of B1–B6 or a grounded CONTEXT
survivor — pull-to-refresh is home-only (`app.js:1316` returns unless `currentDesc().v ===
'home'`; already `#home.scrollTop` after 6i), the A–Z `scrollIntoView` (`browse.js:827`)
scrolls the nearest scroll ancestor (now `#browse`) and the jump rect is viewport-relative
(`browse.js:839`), the NP/Options panel touch is overlay-only, the debug panel is its own
`body.scrollTop`, the reveal `mark()`/scrollTo-patch are diagnostics. **No `position:sticky`
anywhere** (css grep empty) and no inline scroll handler — so no descendant silently
re-anchors to the new scroll container. **No 7th consumer.** The seam is complete.

### Plane 2 — the `srcScroll` / abort-restore interleaving (the sharpest lane). HELD (executed).
The plan leaves `app.js:445` (supersession) and `app.js:1228` (non-rerender abort) as
`window.scrollTo(0, cur.scroll0)` NO-OPS under the decouple, justified: "browse stays the
outgoing/real view, **never re-rendered**." **Attack:** I found that justification FALSE —
`finalizationPlanFor(browse→browse).abortRender === 'rerender'`, so `releaseGesture`
(app.js:444) fires `applyScreen(source, {render: cur.live && abortRender==='rerender'})`
= `render:true` and DOES re-render a browse→browse source on supersession. **Executed**
(`loki-bdec-model` via the real `Swipe.finalizationPlanFor`): browse→browse is the ONLY
transition whose supersession re-renders the source; all others are `abortRender:'none'`.
So the premise is wrong — a promising KILL.

**But I executed the consequence and it HELD.** The decisive question: is the swipe's
`scroll0` restore the SOLE restorer (→ the no-op strands the scroll), or does
`Browse.render` restore it independently? **Executed against the REAL `browse.js` + real
virtualizer in jsdom** (`loki-bdec-restore.js`, modeling B3: `window.scrollTo` →
`surface.scrollTop`): `Browse.render` on a CACHE HIT (browse.js:478-483) calls
`positionOnEnter → applyScrollY(saved sy)`, which under B3 writes `#browse.scrollTop`:
```
before return: surface.scrollTop = 0  (swipe scroll0 restore NOT applied — 445 no-op)
after Browse.render(books) cache hit: surface.scrollTop = 500   (restored: true)
suspended-return (beginHold→authors→books): surface.scrollTop = 500  (restored: true)
```
So the browse page's OWN `positionOnEnter/applyScrollY` restores the scroll on both the
normal and the returning-from-swipe (suspended) path, re-homed by B3 — **independent of the
swipe's `scroll0`/`srcScroll`**. The `app.js:445` no-op does NOT strand the scroll; the
plan's CONCLUSION (445 harmless) holds, though its stated REASON is wrong. No KILL.

### Plane 3 — the KIND-model / classifier / reveal machinery under `window.scrollY≡0`. HELD (executed).
The plan claims `classifyTransition`/`constructionPlanFor`/`finalizationPlanFor` UNCHANGED.
**Executed** (real model): `kindOf` still maps browse-family → `'browse'`; every transition
emits identical keys+values; the frozen spec is untouched. The reveal machinery: `scroll0`
stays window-based (=0 under the decouple). **Attack on the 6h dormant-gate premise:**
the plan (R4/§6-B6) keeps `scroll0` window-based "so the 6h commit→home settle gate stays
DORMANT" — but **grep of HEAD shows the 6h gate does not exist** (no `SETTLE_SCROLL_MIN`/
`scrollSettle`/`SETTLE_MS`; 6i deleted the commit→home held branch, app.js:1210+). So the
premise references a removed mechanism. Consequence: `scroll0`'s only real consumers are
the three restore sites (445/1203/1228), and keeping it window-based is harmless (the
restores are covered by `positionOnEnter`, Plane 2). A stale reason, not a runtime break.

### Plane 4 — browse→browse / browse→overlay as a fixed `#browse` mover. HELD (device-conceded surface).
A fixed `#browse` incoming/outgoing mover with a transient `translateX` re-parents its own
`.alphaindex` for the slide (desired) and clears at finalize — the exact 6i pattern proven
for `#home`. The visible slide/strip-ride/re-anchor is a PAINT the plan concedes to
R-browse2browse/R-strip, not asserted clean. No CI-checkable structural fracture: the model
is unchanged (Plane 3), the mover ownership is unchanged, the `.alphaindex` exclude is the
only clone change (Plane 5).

### Plane 5 — the `.alphaindex` abort-ghost exclude. HELD (no dependency on the strip in the ghost).
The plan excludes `.alphaindex` from the `ghostApp` clone so the browse-source
`translateY(-#browse.scrollTop)` does not re-parent/misposition it. **Attack:** does any
browse→browse (both pages have strips) or browse→overlay path depend on the GHOST having
the strip? No — the ghost is a transient cover; the incoming REAL `#browse` keeps its live
strip (rides the slide via the transient transform), and on abort `applyScreen(source)`
re-renders the real page with its real viewport-anchored strip. The excluded strip on the
outgoing ghost is cosmetic (device-owed R-strip). No structural path reads the ghost's
strip. Note: `app.js:451`'s "`.alphaindex` deliberately NOT excluded" is a DIFFERENT
exclusion (the edge-band swipe-ARM), unrelated to the clone exclude — no conflict.

## Reconciliation (read after the strike)
Two reasoning errors in the plan, NEITHER a runtime break (each conclusion holds for a
different reason than stated):
1. **§6 B6 / R4** — "`scroll0` stays window-based to feed the dormant 6h gate." The 6h gate
   was deleted by 6i (grep-confirmed absent in HEAD). The reason is stale.
2. **§6 B6** — "`app.js:445` supersession ... browse never re-rendered." browse→browse
   supersession DOES re-render (executed model fact). The no-op is safe anyway because
   `Browse.render`'s `positionOnEnter/applyScrollY` restores the scroll (executed, Plane 2).

Both route to Vitruvius for record accuracy (EC §6.2), not a code change.

## Residual doubts named (honest; NOT KILLs — no runtime body)
- **The `scroll0`/`srcScroll` restore machinery is functionally REDUNDANT with
  `Browse.render`'s `positionOnEnter/applyScrollY`** (executed, Plane 2): on a browse→browse
  abort, positionOnEnter already writes `#browse.scrollTop = saved sy` BEFORE the re-homed
  `app.js:1203` writes `#browse.scrollTop = srcScroll` (same value). The new `srcScroll`
  field may be a duplicate source of truth (EC §4.16) / near-dead field (EC §4.15) — a
  Charpy/Mendeleev simplification question, not a runtime break. Given the 6h gate is gone
  and positionOnEnter covers the restore, the whole `scroll0`/`srcScroll` split may be
  unnecessary; Vitruvius should re-examine whether S3 needs it at all.
- The device-class paints (R-flash, R-navbar, R-strip, R-browse2browse) are conceded by the
  plan and out of a blind pre-build CI strike — the next strike, with a device budget, is a
  device pass on those, not another model/seam probe (those are exhausted and green).

## Why HELD (the honest boundary of this pass)
I attacked all five commissioned surfaces and executed the two with a plausible runtime
body — the seam (grep-exhaustive, no 7th consumer, no sticky/inline reader) and the abort/
supersession restore (real `browse.js` proves `positionOnEnter` restores the scroll
independent of the no-op'd swipe restore). The model overturn is contract-unchanged
(executed). The `.alphaindex` exclude has no structural dependency. Every remaining risk is
a device paint the plan honestly concedes. The plan carries two stale reasoning premises
(the removed 6h gate; the "never re-rendered" supersession) and a likely-redundant
`srcScroll` field, but each is a record-accuracy/simplification matter — none breaks a
non-→home... non-preserved behavior at runtime.

## Handoff
- **Source artifact:** this casebook; target `Claude/Plans/PLAN-browse-decouple.md` (HEAD
  `4d9200d`).
- **Verdict / status:** HELD_STONE — no executed runtime counterexample survived; five
  surfaces struck, two executed clean (seam, restore), model overturn executed unchanged.
- **Instruments (re-runnable, session scratch):** `loki-bdec-restore.js` (real browse.js +
  virtualizer restore), the inline model run (real `Swipe.finalizationPlanFor` over the 8
  transitions).
- **Residuals routed to Vitruvius (record-accuracy / simplification, NOT build blockers):**
  the stale 6h-gate reason (§6 B6/R4); the false "never re-rendered" supersession premise
  (§6 B6); the likely-redundant `srcScroll` vs `positionOnEnter` (S3, EC §4.15/§4.16).
- **Next owner:** Curie (the 8 CI cells) + Brunel (atomic S1+S2+S3). Device gates
  R-flash/R-navbar/R-strip/R-browse2browse remain owed downstream, as the plan discloses.
- **Records updated:** this casebook filed + committed; no other record touched.

VERDICT: HELD_STONE
