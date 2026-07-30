# LOKI STRIKE — PLAN-home-shift-fix.md M1 V3 derivation (the two CSS deletions) — 2026-07-29

**Verdict: KILL — on the campaign's adopted regression standard, with the promise's letter
recorded as holding.** Executed, control-validated counterexample in a real Blink engine
(HeadlessChrome 150, the Android WebView APK's engine family): **the post-fix park disables
browser scroll anchoring on `#home`** — a non-none `transform` on the scroll container suppresses
every anchoring adjustment in Blink, and the shipped `overflow: hidden` is what un-suppresses it —
so a content mutation landing while home is parked produces a **measured 80px visible jump at the
abort reveal** (revealed content top 29px where the ghost displayed it at 109px), on an
interleaving where SHIPPED code measures **0px** (the shipped park anchors identically to an
active home and absorbs the mutation invisibly). Of the plan's two deletions, deleting
`overflow: hidden` is the one that flips this. The V3 cascade geometry itself was attacked and
**held, numerically exact** (§6).

Commissioned as the 4th strike on this promise, plane (iii), aimed at scroll anchoring: PLAN at
HEAD `8834b32` (pre-build; the design is struck by execution in a real engine). Prior kills:
`STRIKE-home-shift-m1.md`, `-restrike.md`, `-final.md` — all against the retired deferred-write
design; none of their planes is re-struck here (the write is gone and its removal is confirmed as
structural). M2 and Flash C out of scope.

## 1. The promise (verbatim, from the commission)

> "After the two deletions, parking and un-parking `#home` is scroll-neutral: home's visible
> scroll position on reveal equals what it was when parked — no jump, no clamp, no visibly wrong
> intermediate paint — and nothing outside the registered textual writer set moves it."

And the claim under strike (plan §8 R-writer-enum, verbatim): *"anchoring … is a function of the
content, the anchor node and the current offset — not of the box's inset geometry. Post-fix the
parked box has the same `clientHeight`, the same `scrollHeight` and the same scroll range as the
active box, so anchoring computes the SAME adjustment in both states: the park stays
scroll-neutral under anchoring, which is INVARIANT P. Pre-fix it is worse rather than better."*

## 2. The plane, and why it was executable after all

The commission marked scroll anchoring "not executable in jsdom" and steered toward
source-plus-spec reasoning with device-owed residuals. jsdom is not the only engine on this
machine: a desktop Chrome (Blink 150) runs headless with a full lifecycle, and Blink is the
engine of the Android WebView APK — a shipped target. The claim "computes the same adjustment in
both states" is a two-branch A/B a real engine answers in milliseconds. It was executed, with
controls, in three probes.

## 3. The instrument (reproducible from this record alone)

A single HTML page replicating `#home`'s recipes structurally verbatim from `css/app.css` at
`8834b32` (vars pinned `--safe-top: 20px`, `--nav-h: 56px`, `--nav-pad: 12px`, so `safe+51 = 71px`):

- `#home` = css:126-135 exactly (fixed, both insets, `padding: 14px 16px 40px`,
  `overflow-y: auto`, `z-index: 20`, `will-change: transform`, scrollbars hidden per css:772).
- `#home.parkedpre` = css:98-103 exactly (the SHIPPED park: `top: 0`, restatements,
  `translateX(-101vw)`, `overflow: hidden`, `pointer-events: none`, `z-index: 0`, `will-change`).
- `#home.parkedpost` = parkedpre **minus `top: 0` minus `overflow: hidden`** (the plan §4.2 fix).
- Isolation classes over the ACTIVE recipe: `transform: translateX(-101vw)` alone;
  `transform: translateX(2px)` alone (on-screen); `pointer-events: none` alone; `z-index: 0`
  alone; both without transform; `overflow: hidden` alone; `overflow-anchor: none`.

Content: a mutable `#above` region (3×100px blocks) over 30×100px blocks — the `renderCarousel`
shape (`home-screen.js:40-48` rebuilds/patches rows above lower content). Each scenario: scroll
the ACTIVE box to 600, settle real frames, apply the state class, settle, shrink `#a1` 100→20px
(−80px above the viewport), settle, read `scrollTop` in-state, remove the class, settle, read
revealed `scrollTop` and the watched block's `getBoundingClientRect().top`.

Run: `chrome --headless=new --disable-gpu --user-data-dir=<scratch> <probe url>`, results POSTed
to a local sink. (rAF does not fire in a non-composited pane or reliably under
`--virtual-time-budget` chained frames; plain real-time new-headless composites and is required —
anchor selection happens at lifecycle updates, so a frame-less environment silently reports
"no anchoring", which is the vacuous-green shape this campaign keeps meeting.)

**Controls, all PASS before any finding was read:**

- Active `#home` recipe anchors: 600 → **520** on the −80 shrink (anchoring live, instrument hot).
- `overflow-anchor: none` on the active box: stays **600** (the instrument measures anchoring and
  nothing else).
- Anchoring resumes normally after a park/un-park cycle (a later active shrink adjusts −80).
- No late adjustment fires after a reveal (10 frames observed).

## 4. Executed results (Blink 150; scrollTop after the −80 shrink from 600)

| State during the mutation | in-state | revealed | anchored? |
|---|---|---|---|
| active (control) | 520 | 520 | YES |
| **pre-fix `.parked` (SHIPPED)** | **520** | **520** | **YES — identical to active** |
| **post-fix `.parked` (THE FIX)** | **600** | **600** | **NO — suppressed** |
| `translateX(-101vw)` alone | 600 | 600 | NO |
| `translateX(2px)` alone (on-screen) | 600 | 600 | NO |
| `pointer-events: none` alone | 520 | 520 | YES |
| `z-index: 0` alone | 520 | 520 | YES |
| `pointer-events`+`z-index`, no transform | 520 | 520 | YES |
| `overflow: hidden` alone | 520 | 520 | YES |

**Isolation:** the suppressor is the **transform** — any non-none transform on the scroll
container, on-screen or off, persistent across settled frames (not a same-frame suppression
trigger; spec §"suppression triggers" covers property CHANGES, so this persistence is Blink
implementation behavior, not spec-mandated). **`overflow: hidden` un-suppresses a transformed
scroller** (shipped park: transform + hidden ⇒ anchors). The fix deletes exactly that.

**The paint (the watched block's viewport top, ghost-time vs reveal):**

| Scenario | ghost displayed | reveal shows | visible jump |
|---|---|---|---|
| active watching | 109 | 109 | 0 |
| **pre-fix park (SHIPPED)** | 109 | 109 | **0** |
| **post-fix park (THE FIX)** | 109 | 29 | **−80px** |
| post-fix + `overflow-anchor: none` in the park rule | 109 | 29 | −80px (does not help) |

## 5. The fracture

**Mechanism.** Post-fix, `#home.parked` retains `transform: translateX(-101vw)` and loses
`overflow: hidden`. In Blink, the retained transform suppresses all scroll-anchoring adjustments
on the parked box, and the deleted `overflow: hidden` is what restored them in shipped code. So a
home content mutation landing while parked — `renderCarousel` (home-screen.js:40-48, driven by
`load()`'s `onFresh` background revalidate at home-screen.js:124, which paints whenever a
revalidation returns and `!document.hidden`, park or no park), `renderDownloaded`'s `#dlSection`
toggle (home-screen.js:53-59), or the offline clears (app.js:1436-1437) — is absorbed invisibly
by SHIPPED code (anchoring keeps the user's content-relative place, executed) and is NOT absorbed
by the FIXED code.

**The wrong paint.** The abort reveal (`applyScreen(dest,{resetScroll:false})`, app.js:1227)
preserves the offset; the swept ghost is a static id-stripped clone (swipe.js:275-292) showing
park-time content, while the mutation landed on the real parked `#home` (ids live only there). At
the ghost→real swap the content the user watched shifts by the mutation's above-viewport delta —
**measured −80px on the probe's shape; bounded by the content delta, not by the park geometry**
(a carousel switching skeleton/empty/content moves ~150-200px), at ANY scroll depth. Shipped
code, same interleaving, same engine: 0px.

**Reachability.** The offset-preserving reveal is the aborted home→X gesture, so the collision
window is gesture-scoped — and the highest-frequency mutator lands exactly there: the first
seconds of every app open with a cached library, when the cache paints instantly and the
background revalidate (`onFresh`) resolves mid-interaction. Scroll home, swipe toward Books,
abort while the revalidate lands: the reveal jumps by the repaint's height delta on Blink.

**The standard it breaks.** The promise's scrollTop letter HOLDS on every executed row (revealed
= parked value, always — §6). What breaks is the campaign's own binding regression axis, adopted
when the plan accepted the 3rd strike in full (plan §1, the 3rd-KILL row): *a fix for a
device-reported visible shift that introduces a new visible reveal shift on an adjacent
interleaving where shipped code is stable fails the campaign's goal even where the promise's
letter is arguable.* Executed here: shipped 0px, fixed −80px, controls green. And INVARIANT P —
"parking may change ONLY where the box paints and whether it takes input" — is executed-incomplete:
the park (its retained transform, times the fix's overflow deletion) also changes **whether the
engine's scroll-anchoring machinery operates on the box**, a third behavioral axis the invariant
does not name and M1PARKRANGE's allow-list cannot see (both properties are Tier-1-permitted).

## 6. What was attacked and HELD (the derivation itself)

- **The V3 cascade geometry is exact in a real engine.** Parked-pre `clientHeight` = active + 71
  = `safe+51` to the pixel; max scroll shrinks by exactly 71; bottom-of-range park clamps by
  exactly 71 and the loss survives the un-park; mid-range park loses zero; the short-library case
  clamps to the derived value (max 649 → 578) pre-fix and loses zero post-fix. Every §4.1 number
  reproduced.
- **The [UD] retention premise, Blink branch:** an `overflow: hidden` box RETAINS its offset
  (600 through a hidden/unhidden cycle). The `safe+51` magnitude bound is the true branch in
  Blink. WebKit retention stays device-owed. Post-fix no state ever computes `overflow: hidden`
  (both rules `auto`; a class toggle is one atomic style recalc), so the premise is moot for the
  FIX by construction — confirmed in that no probe row post-fix ever clamped except by content.
- **Content clamp parity:** removing content below (scrollHeight drops under scrollTop) clamps
  identically parked-post and active (3145 → 2937 both). The "content changes while parked"
  route is park-neutral post-fix for CLAMPS — the non-neutral channel is anchoring (§5).
- **The promise's scrollTop clause:** revealed offset equals parked offset on every executed
  post-fix row — held, and held BECAUSE the mover is disabled while parked, which is the fracture
  wearing the promise's own clothes.
- **No fixed-position descendant exists in `#home`'s subtree** (index.html:48-58: titles,
  statuslines, carousels, `#dlSection`; the only fixed elements are overlays outside it), and
  `will-change: transform` is verbatim in both rules — the containing-block question is vacuous
  and state-identical. `pointer-events`/`z-index` are executed anchoring-inert.

## 7. Blast radius

- **Plan §8 R-writer-enum, three sentences executed-false:** "anchoring computes the SAME
  adjustment in both states" (parked computes none); "pre-fix it is worse rather than better"
  (pre-fix parked anchors identically to active outside the last 71px, and the clamp does not
  precede anchoring at mid-range); "a refresh landing while home holds a non-zero offset
  therefore adjusts that offset, parked or not" (post-fix parked: it does not).
- **The temper's endorsement of that reasoning** ("does it affect the CSS-only fix? NO") is
  falsified with it — the reasoning modeled anchoring as geometry-only; the engine's machinery
  has a third input (the scroll container's own transform/overflow state) that geometry equality
  does not capture.
- **INVARIANT P is incomplete** (§5) and its gate M1PARKRANGE structurally cannot catch this
  axis: `transform` is Tier-1 "geometry-inert — permitted with ANY value," which is true for
  layout and false for anchoring participation.
- **Coverage:** no CI cell can see the fracture — jsdom implements no anchoring; M1NOWRITE/
  M1NAVWINS observe scripted writes and an anchoring adjustment is not one; M1PARKRANGE is
  static. **The device gate excludes the interleaving by its own protocol** (R-M1-cause demands
  "no intervening home re-render"), so the suite AND the gate pass over it — the same shape as
  all three prior kills and V1: the crossing nothing drives.
- **R-M1-cause's BEFORE measurement is contaminated in a way the plan does not name:** shipped
  (pre-fix) parked home ANCHORS in Blink, so a mid-measurement re-render moves the offset at ANY
  depth and is attributed to the park; a mid-range BEFORE loss would be misread against §4.1
  (which predicts zero there) as "the cause was mis-derived / the [UD]-discard branch" — a false
  cause-re-derivation trigger. The protocol's "no intervening home re-render" condition has no
  witness; it needs an instrument (count `renderCarousel`/`renderDownloaded` executions between
  the readings — PBDebug already logs CACHE lines) before its readings can be believed. The
  post-fix AFTER reading is anchoring-immune in Blink (stronger than the plan claims) and
  WebKit-owed on iOS.
- **Engine split, stated plainly:** WebKit does not implement scroll anchoring (`overflow-anchor`
  unsupported in Safari per caniuse/MDN as read today), so on iOS neither shipped nor fixed code
  anchors — the mid-park-mutation reveal jump PRE-EXISTS there in shipped code and the fix
  regresses nothing on iOS. The executed regression is the **Android WebView (Blink) APK** — and
  the iOS-primary device pass would never see it, which is one more way every gate in this
  campaign misses this fracture.

## 8. Executed vs device-owed

**EXECUTED (real Blink 150, controls green):** anchoring liveness on the active recipe; the
isolation of the suppressor to `transform` (on- and off-screen) and the un-suppression by
`overflow: hidden`; pre-fix parked anchoring parity; post-fix parked anchoring blackout,
persistent across settled frames, with no late post-reveal adjustment and clean resumption; the
reveal paint delta (0px shipped / −80px fixed); the full V3 geometry table; Blink [UD] retention;
content-clamp parity; `overflow-anchor: none` in the park rule failing to restore seamlessness.

**REASONED FROM SOURCE (not app-executed):** the composition into the app path — ghost =
static id-stripped clone (swipe.js:275-292), mutations land on the real parked home
(home-screen.js via `d.byId`), abort reveal preserves the offset (app.js:1227), `onFresh`
collides with gesture windows (home-screen.js:124). Each link is a plain read of shipped source;
none was run end-to-end in a real engine (the app needs a Plex server the bench does not have).

**DEVICE-OWED:** whether the user's iOS WebKit build has gained scroll anchoring (if yes, the
Blink findings apply there too; if no, the iOS story is as §7 states); WebKit's
`overflow: hidden` offset retention (the [UD]'s other branch, unchanged); the compositor
realization of the measured jump on real devices; Android WebView version drift from desktop
Blink 150.

## 9. The `overflow-anchor: none` question (commissioned)

**As a repair for this fracture: NO — executed.** Adding `overflow-anchor: none` to the park
rule leaves the −80px reveal jump intact (§4, last row): the seamless shipped behavior requires
anchoring to RUN while parked, and `overflow-anchor: none` is a second way of stopping it, not a
way of restoring it. **What the finding actually forces is a decision about the
`overflow: hidden` deletion**, the plan's second deletion: keeping it (deleting `top: 0` alone —
the "LOOSER change" the temper already identified) closes the geometric clamp channel this
derivation confirmed to the pixel, while preserving Blink's anchoring-while-parked seamlessness;
its cost is that the no-clamp claim then rests on the retention branch of the [UD], which is now
EXECUTED for Blink (retains) and stays device-owed for WebKit only. Alternatively
`overflow-anchor: none` on the park rule pins the blackout declaratively and cross-engine so the
fix's behavior at least stops depending on an unspecified Blink transform quirk — a consistency
argument, not a repair, and it fails M1PARKRANGE's current allow-list (on neither tier), so
adopting it is a plan amendment either way. The choice is the planner's; this seat notes only
that the fracture lives entirely in the second deletion — the first deletion (`top: 0`) is
confirmed correct by execution and no finding touches it.

## 10. Lesser planes struck (un-prosecuted, one line each)

- The three prior kill interleavings: structurally closed by the write's removal; not re-struck
  (the commission's instruction, and §2 of the final strike's own confirmation method).
- Same-frame park+mutate vs settled park: identical outcome (suppression persistent); no
  transient/ordering window. Held.
- Anchor selected while parked, re-resolved on reveal: no deferred adjustment lands after
  un-park (10 frames), and a fresh active mutation re-anchors correctly. Held.
- `pointer-events: none` / `z-index: 0`: anchoring-inert and scroll-inert, executed. Held.
- Pre-fix taller-scrollport anchor SELECTION near the bottom edge (a 71px-taller parked
  scrollport could pick a different anchor than active would): un-prosecuted — pre-fix-only and
  subsumed by the clamp rows for the reveal observable.
- The `hiddenonly` + transform interaction inverting per-property intuition (hidden alone
  anchors; transform alone doesn't; together they anchor): recorded as engine behavior worth
  re-measuring on WebView drift; no further consequence post-fix (neither state has `hidden`).

## 11. Reconciliation (post-strike read of the rationale)

The plan did not miss anchoring — it found it, named it the sharp target, and aimed this strike
at it. What failed is the DISPOSITION: the anchoring finding was filed as a writer-set residual
("it falsified a CLAIM about the writer set, not the fix") on the strength of a geometry-parity
argument that no one could execute in jsdom — and "not executable in jsdom" was allowed to mean
"device-owed" when a desktop Blink, the actual engine of one shipped target, executes the claim
in minutes. The plan reviewer verified the argument as an argument; it was internally valid and
empirically false: the engine's anchoring has an input the model lacked (the scroll container's
own transform/overflow state), and both the suppression and the un-suppression sit outside the
spec's text, where only execution reaches. The failure entered in the reasoning, not the
exclusions — the first time in this campaign's four strikes. The durable lesson, completing my
three: *enumerate every writer of the observable; gate each write on the identity it belongs to;
a delayed write must prove it still owns its reveal; and* **an engine-behavior claim a unit
harness cannot execute is not thereby device-owed — a real desktop engine sits between the
harness and the device, and "the same in both states" claims are exactly what it kills cheaply.**

VERDICT: KILL
