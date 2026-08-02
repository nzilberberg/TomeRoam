# PROBE — Swipe reveal/teardown compositor flash (Linnaeus derivation, stage 6g)

Type: diagnostic (deriver — facts derived from the reference system: the real code + the
project's own frozen oracle). READ-ONLY. No code/plan/test edits. Not a build plan.

Grounds the three felt flashes (build `.255`) against `js/app.js` + `js/swipe.js` + `js/nav.js`
+ `css/app.css`, cross-checked against the reviewed frozen oracle
(`test/fixtures/swipe-plan-spec.mjs`, `docs/transition-matrix.generated.txt`). Every
representation claim is confirmed against that oracle, not read off a ternary (the saga burned
~8 confident-wrong reads; the oracle is the project's answer to exactly that).

The three transitions:
- **A** — commit/complete **books→home** (flashes).
- **B** — aborted **home→books** (flashes).
- **C** — aborted **books→books** (the headline saga flash).

---

## 0. THE HEADLINE FINDING (read this first)

**The flash is a REAL in-flow view being DEMOTED from a compositing layer at a moment its
result is uncovered — NOT the teardown of the covering ghost/snapshot pane.** The two are
routinely confused because they happen in the same frame at the same reveal, but the code
separates them decisively:

- The **6f device A/B already proved** removing the real-view transform makes a transition
  clean (`books→options` abort went clean when its outgoing stopped being the real `#browse`).
- **`books→options` abort ALSO tears down a full-viewport composited owned pane** (the outgoing
  `app-ghost`, `will-change:transform; position:fixed; inset:0`, css via `ghostWrap`
  swipe.js:243) on-screen at the reveal — **and it is CLEAN.** So a composited-pane teardown, by
  itself, does not flash. What differs in the clean case is that the real view revealed
  underneath (`#browse`) was **never promoted/demoted and was continuously painted.**

⭐ **This REFUTES the general form of "a full-viewport composited ghost yanked in one frame is
the flash."** It is not the yank; it is what the yank uncovers. The flash appears iff the
uncovered real view is itself mid-demote (its swipe `transform` just cleared, or its `.parked`
`will-change` layer just dropped) and iOS has not finished re-rasterising it into the page layer
when the cover lifts. The reveal's paint-gate (`holdGhostUntilPaintable`, a double-`rAF`) is
**blind to that re-raster** — `rAF` measures the main thread; iOS compositing/rasterisation is
off it (the saga's own withdrawn-frame-detector lesson). So the gate can drop the cover while the
demoted layer is still re-rastering.

**All three felt flashes unify to this one mechanism.** They differ only in *which* real view is
demoted and *how* it is uncovered.

---

## 1. Composited-layer inventory (per transition), with citations

Promotion sites (an element becomes its own compositing layer):
- Real in-flow view given an inline `transform` by the mover loop — parked incoming
  (`app.js:555`), drag (`app.js:576`), settle rAF (`app.js:615`). A `transform` promotes on iOS
  (the code even avoids `will-change` on the real view to limit this — `app.js:552-554`).
- `.nav-ghost` owned panes (`ghostApp` swipe.js:249 / `snapshotHome` swipe.js:270) mounted in
  `ghostWrap` (`swipe.js:240-245`): `position:fixed; inset:0; z-index:28; will-change:transform`
  — explicitly promoted, full-viewport.
- **`#home.parked`** (`css:103-107`): `transform: translateX(-101vw); will-change: transform;
  z-index:0` — a **promoted, off-screen-but-PAINTED** layer (nav.js:57 comment: "parked =
  off-screen but PAINTED"). Deliberate, so covers stay decoded.
- `.browsepage.parked` (`css:144-147`): `transform: translateX(-300vw)` (promoted by transform; no
  explicit `will-change`). Was `translateX(-101vw)` at the time of this probe (build `.255`);
  moved to `-300vw` by `Claude/Plans/PLAN-parked-page-rides-home.md` (2026-08-02) to put the park
  offset out of reach of `#browse`'s own displacement. The promotion/demotion mechanism this probe
  derives is unaffected — a non-`101` `translateX` still promotes.
- NP pill clone `.np-pill-float` (`swipe.js:285`) — owned-decoration, small, not full-viewport;
  not a flash surface.

Demotion / teardown sites:
- Mover transforms cleared to `''` — `app.js:775` (all movers, in `runFinalize`).
- `resetSwipeStyles` clears inline `transform/willChange/zIndex` on the real
  `#home/#browse/#options/...` — `nav.js:107` (runs at the top of every `applyScreen`).
- **`.parked` class removed (un-park)** via `setView`→`applyScreen` — `nav.js:57,64`. Removing
  `.parked` drops the `translateX(-101vw)` **and** the `will-change` → the layer **demotes** and
  iOS must re-rasterise the view into the page layer.
- Owned panes removed — `dropPanes` (`app.js:623`), `fadePanes` (`app.js:702`, `FADE_MS=0` so
  instant + 60ms), `disposeOwnedPanes` (`app.js:358`); the paint-gated `drop()` (`app.js:813`)
  calls `fadePanes` at `app.js:852`.

Representation per transition (**confirmed against the frozen oracle** —
`docs/transition-matrix.generated.txt:14-22`, `swipe-plan-spec.mjs:54-61`):

| transition | outgoing | incoming | render | abort |
|---|---|---|---|---|
| A books→home | **real-source (real `#browse`)** | home-snapshot (owned pane) | none | none |
| B home→books | app-ghost (home ghost, owned pane) | **real-destination (real `#browse`)** | browse-host | none |
| C books→books | app-ghost (owned pane) | **real-destination (real `#browse`)** | browse-host | rerender |

---

## 2. Per-flash mapping (promote → demote event, with confidence label)

### Flash A — commit books→home  → CONFOUNDED; lead cause = the revealed `#home` un-park demote (workstream C). Needs a device datapoint.

Layers and their fate (dir = `back`; `off=-w`):
1. **Outgoing = real `#browse`** (borrowed-real, base 0). Promoted by the drag transform
   (`app.js:576`); on **commit** the settle rAF drives it to `translateX(+w)` (off-screen right —
   `outTo = commit ? -off : 0 = +w`, `app.js:599/615`); demoted at `app.js:775` (transform → `''`
   → snaps to `translateX(0)` for one frame **under the still-present snapshot cover**), then
   `.hidden` by `applyScreen(home)` (`app.js:1172` → nav.js:64). **Its demote is off-screen /
   under cover / then hidden → not visible.** (Confirms Vitruvius's claim that the outgoing
   `#browse` demote is not the visible flash. — *code-decisive.*)
2. **Incoming = home-snapshot owned pane** (full-viewport composited, z28). At `translateX(0)`
   covering; **held** (`app.js:1175 holdGhostUntilPaintable($('home'))`) then dropped
   (`fadePanes`, `app.js:852`) at the reveal — the **on-screen teardown**.
3. **Real `#home`** was `.parked` (composited, off-screen, `css:107`) the whole time in browse;
   **un-parked at `applyScreen(home)` (`app.js:1172` → nav.js:57)** → **DEMOTE**, under the
   snapshot cover, revealed when the snapshot drops.

⚠️ **Vitruvius's "home-snapshot pane teardown is the flash" is directionally right about WHERE
(the visible event is at the snapshot drop) but WRONG about the mechanism.** `books→options`
proves a composited-pane teardown over a stable real view is clean. The operative event at A is
**#3 — the revealed `#home` un-parking (a real-view demote) uncovered before iOS re-rasterises
it.** The snapshot is the cover, not the culprit.

⚠️ **The 6f differential is CONFOUNDED for the →home row.** Between the clean `books→options` and
the flashing `books→home`, **two** variables differ: (i) the outgoing is real-transformed vs
ghosted, **and** (ii) the revealed view is a demoting `#home` vs a stable `#browse`. So 6f does
**not** isolate A's cause. Grounding rules out (i) as visible (it's off-screen on commit), leaving
(ii) — the `#home` un-park demote — as the lead, but it is **not device-confirmed for A
specifically.** *Confidence: physically-reasoned + code-grounded; not device-isolated. → device
datapoint recommended (§4).*

### Flash B — aborted home→books  → the revealed `#home` un-park demote, uncovered with NO paint gate. (physically-reasoned)

Layers (dir = `fwd`; user started AT home, so `#home` is un-parked at rest, then parked mid-drag):
1. **Outgoing = home ghost** (owned pane, `ghostApp` captures the active `#home`, swipe.js:249).
   Covers at `translateX(0)`; on abort → dropped **immediately** by `dropPanes` (`app.js:1198`,
   the no-hold path — abort `abortRender='none'`, dest=home≠browse) — **no paint gate at all.**
2. **Incoming = real `#browse`** (borrowed-real). Books rendered into it mid-drag
   (`renderDestination:'browse-host'`, app.js:513); promoted by transform; on abort retreats to
   `off`, demoted at `app.js:775`, then `.hidden` by `applyScreen(home)` (`app.js:1208`). **Under
   cover / hidden → not the visible event.**
3. **Real `#home`** was parked at `start()` (`showAppView(books)` adds `.parked`, app.js:483 →
   PROMOTE) and **un-parked at `applyScreen(home)` on abort (app.js:1208 → nav.js:57 → DEMOTE)**,
   revealed **immediately** when the home ghost drops (no hold).

⚠️ Same class as A #3: **the revealed `#home` un-park demote is the visible flash.** B is
arguably *worse* than A because the no-hold path uncovers it with zero paint gate. *Confidence:
physically-reasoned + code-grounded; not device-isolated.*

### Flash C — aborted books→books (headline)  → the revealed `#browse` (incoming) transform demote + re-render. (CONFIRMED-class by 6f)

Layers (dir = `fwd`):
1. **Outgoing = books app-ghost** (owned pane) — snapshot of the pre-render `#browse`; covers;
   **held** (`app.js:1192 holdGhostUntilPaintable($('browse'))`) then dropped at reveal.
2. **Incoming = real `#browse`** (borrowed-real) — destination rendered INTO it mid-drag
   (app.js:513); promoted by transform; on abort retreats, demoted at `app.js:775`, then
   **re-rendered** (`applyScreen(dest,{render:true})`, `app.js:1186`, abort `rerender`) and
   revealed under the held ghost.

The real `#browse` **is** promoted→demoted here — the exact class the 6f A/B confirmed as the
flash cause for the transform-on-real-view family. The reveal uncovers a `#browse` that was just
demoted and re-rendered; the double-`rAF` gate cannot see the compositor re-raster. *Confidence:
mechanism CONFIRMED-class (6f); the specific fix path is the T8-forked incoming rework.*

### Why the CLEAN control (`books→options` abort) is clean — the load-bearing contrast
outgoing = app-ghost (owned pane, torn down on-screen by `dropPanes`, no hold); incoming = options
overlay (own `position:fixed` layer); **the real `#browse` revealed underneath was never a mover
(never transformed) and never re-rendered (`renderDestination:'none'`) — it sat continuously
painted.** A composited pane is torn down over it and nothing flashes. This is the datum that
turns "pane teardown" into "revealed-view demote" as the true variable.

---

## 3. Confirm / refute summary vs Vitruvius's stage-6g grounding

| Vitruvius (PLAN-swipe-stage6g §0) | Linnaeus verdict |
|---|---|
| A's incoming `#home` is a snapshot owned pane; real `#home` never transformed | **CONFIRM** (oracle: browse→home incoming=home-snapshot; real `#home` never a mover). |
| A's outgoing `#browse` demote is off-screen/hidden by commit time → not the visible flash | **CONFIRM** (code: settle→`+w`, cleared under cover at :775, then `.hidden` at :1172). |
| A's felt commit flash's dominant suspect is the home-snapshot pane TEARDOWN (workstream C) | **REFINE.** The *reveal moment* is right, but the mechanism is not the pane teardown per se (refuted by clean `books→options`). It is the **revealed `#home` un-park demote** uncovered before re-raster. Same workstream C, sharper cause: eliminate the revealed-view demote, don't soften the cover. |
| Ghosting the browse→home outgoing does not touch the felt commit flash | **CONFIRM** (the outgoing demote is already off-screen; the visible cause is `#home`, untouched by Option A). |
| B suspect = incoming `#browse` transform-then-demote | **PARTIAL / REFINE.** The incoming `#browse` demote is under cover/hidden. The **visible** event is the revealed `#home` un-park demote (no paint gate). |
| C suspect = incoming `#browse` transform class | **CONFIRM** (real `#browse` promoted→demoted; 6f-confirmed class). |

Also refined: the saga's "every transition where a real in-flow view is still transformed
FLASHES" correlation is **decisive for the overlay family** but **confounded for →home / the
incoming families**, because in those the revealed view is *also* a demoting real view — a second
variable the correlation didn't separate.

---

## 4. Device datapoint — YES, for flash A (and it also settles B)

The one thing grounding cannot settle: is A's visible flash the **`#home` un-park demote** (lead)
or a residue of the outgoing `#browse` I've argued is off-screen? Two ways to get the datapoint,
cheapest first:

- **Cheapest, zero swipe-code risk (recommended pre-build probe):** add a persistent compositing
  layer to the base `#home` rule so removing `.parked` does **not** demote it — e.g. `#home {
  will-change: transform; }` (or `transform: translateZ(0)`) in `css/app.css`, so un-park changes
  only the layer's *position*, not its promotion, and iOS re-composites without re-rastering.
  Then swipe **commit books→home** and **abort home→books** on device. **Flash gone → the
  `#home` un-park demote is confirmed as the cause of A and B** (and the workstream-C fix is "keep
  the revealed view a stable layer / never demote it at the reveal"). Flash persists → the cause
  is elsewhere and C-scoping must widen. Note: `#home` has **no** `.alphaindex` (that lives in
  `#browse`), so this dodges the saga's T3 containing-block trap; still watch the fixed navbar for
  the `app.js:552-554` "pop", and pull it if it appears (one line). This is a *diagnostic* probe,
  not a ship.
- **Build-path experiment (Option A):** ship the browse→home outgoing app-ghost (PLAN-stage6g
  Option A). Per §9(c) there, the commit flash **surviving** confirms `#home`/C; it also
  definitively fixes the browse→home **abort** (outgoing `#browse` returns on-screen at
  `translateX(0)` and demotes on that path — grounded — so ghosting it removes a real on-screen
  demote). More risk (touches the commit→home hold branch) but doubles as forward progress.

---

## 5. The fix direction (concrete) and the recommended safe first slice

### Fix direction
The structural fix generalises to the reveal: **the real in-flow view that is UNCOVERED at the
reveal must never be mid-demote when the cover lifts.** Two sub-rules:
1. **Never transform the real in-flow view** (the shipped axis — outgoing done for
   in-flow→overlay in 6f; incoming is the T8-forked rework for C/B).
2. **Never demote the revealed view at the reveal** — specifically, do not keep `#home`
   `.parked` with `will-change` and un-park it under a cover; keep the revealed view a *stable*
   layer (retain promotion across the un-park) or in-flow-and-painted, so the cover lifts over a
   fully-composited surface.

Why cover-side softening cannot work (and why the saga's 120ms cross-fade failed): a cross-fade
softens the **cover's** exit, but the flash is the **revealed view** re-rastering. Fading between
the cover and a re-rastering view still shows the re-raster. The gate must ride the **compositor**
timeline, not a main-thread `rAF` — the reliable web signals are the cover's own `opacity`
`transitionend` (compositor-driven) or removing the cover only after the revealed layer is proven
stable — but the *cheaper and more robust* move is to remove the demote entirely (rule 2).

Prior-art pass (standard mobile flash-free reveal): the iOS/UIKit pattern is a **snapshot-view
cross-dissolve where the destination is fully rendered AND committed to the render tree before the
snapshot is removed**; the web analog is "render the destination into the real view *under* the
cover, keep that view a promoted layer so no demote happens at reveal, then remove the cover on a
compositor-timeline signal." Dead-ends to avoid (from the saga): T8 (float the incoming in a fixed
pane — breaks the document-scroll/`applyScrollY` model and the fixed `.alphaindex`); and parking a
permanent transform on `#browse` (.195/.196 — makes `#browse` the containing block for the fixed
`.alphaindex`, breaks the strip). The `#home` variant of rule 2 is safer precisely because `#home`
has no fixed descendant strip.

### Recommended safe first slice
**None of the three felt flashes has a truly one-slice fix — all three route to workstream C**
(A and B are the `#home` un-park demote; C is the incoming `#browse` demote). So do **not** chase a
felt-flash kill blind. Recommended sequence:

1. **First, gather the §4 device datapoint** (the `#home` `will-change` CSS probe — minutes, zero
   swipe-code risk). It converts A and B from "physically-reasoned" to confirmed, and tells C
   scoping whether the `#home`-layer-stability fix is the whole answer for A/B.
2. **Then the safest highest-value BUILD slice is PLAN-stage6g Option A** (browse→home outgoing
   app-ghost): it (a) removes a *confirmed on-screen* real-view demote on the browse→home
   **abort**, (b) completes the outgoing-transform-elimination axis, and (c) is the build-path
   disambiguator for A's commit. Its structural invariant is CI-observable; the flash itself is
   device-verified. Bounded medium risk (the commit→home hold-branch disposal), fully specified in
   PLAN-swipe-stage6g.
3. **Deferred:** workstream C proper — the paint-gated reveal that stops uncovering a demoting
   real view (rule 2 above), the shared root of A(commit)/B/C; and the T8-forked incoming
   representation for C/B. C should be **scoped** (a Loki probe on the `#home`-un-park / revealed-
   view-demote hypothesis, informed by the §4 datapoint) before a build.

If the user wants the single highest-value *felt* target: **A and B share one root (`#home`
un-park demote)** and a single rule-2 fix (`#home` stays a stable layer across un-park, cover
removed on a compositor signal) plausibly kills **both** — making the `#home` un-park demote the
best first *felt* target, pending the §4 datapoint that confirms it.

---

## What jsdom could and could not tell me
I derived the mover/representation facts from the code **and** cross-checked every one against the
project's reviewed frozen oracle (`swipe-plan-spec.mjs` / `transition-matrix.generated.txt`) — a
stronger ground than a fresh jsdom probe, since that oracle is the independent, hand-reviewed
source of truth the subsystem was built around. jsdom **cannot** observe the flash (it does not
composite or rasterise), so no harness run can confirm or refute a compositor-demote hypothesis —
that is inherently device-only, which is exactly why §4 asks for a device datapoint.
