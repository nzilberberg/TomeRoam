# LOKI 5th STRIKE — PLAN-home-shift-fix.md M1 ADOPTED form (one deletion: `top: 0` out, `overflow: hidden` kept) — 2026-07-29

**Verdict: HELD STONE.** Executed in a real Blink engine (HeadlessChrome 150, the Android WebView
APK's engine family), controls green before any finding was read: **the adopted park anchors
identically to SHIPPED — 0px reveal delta on the 4th strike's kill scenario, where the retired
two-deletion form measures −80px in the same run** — anchor selection/adjustment matches the
active box to the exact integer across a six-shape mutation matrix, and the park is clamp-free at
every depth (parked `clientHeight`, `scrollHeight` and `maxScroll` all EQUAL to active, the 71px
delta gone). The plan's inference about the fourth form is executed-TRUE on every row. No
admissible fracture was found; the named device-owed residuals below remain open.

Commissioned as the narrowly-aimed 5th strike on this promise: PLAN at HEAD `4253fa4`
(PLAN_READY; pre-build). Prior record: `STRIKE-home-shift-m1.md`, `-restrike.md`, `-final.md`
(three KILLs of the retired deferred-write design), `-derivation.md` (4th KILL of the
two-deletion form; its instrument is reused here). M2 and Flash C out of scope.

## 1. The promise (from the commission)

The commission's reason to strike: the 4th strike executed THREE state classes — active, shipped
park (`transform` + `overflow: hidden` + `top: 0`), and the two-deletion park — and the ADOPTED
form (`transform` + `overflow: hidden`, WITHOUT `top: 0`) is a FOURTH, whose anchoring behaviour
was only inferred from the suppressor isolation. Restated as testable behaviour, three claims:

- **(a)** the one-deletion park anchors like SHIPPED: a content mutation landing while parked is
  absorbed and the abort reveal shows a **0px** delta, not −80px;
- **(b)** anchor SELECTION on the adopted parked box matches the active box (with `top: 0` gone
  the heights are equal, so a differently-placed anchor node was the remaining divergence path);
- **(c)** the geometry is clamp-free at every depth with `overflow: hidden` PRESENT (the 4th
  strike measured parked-pre at active + 71px with `hidden` present — exactly the `top` delta —
  so deleting `top: 0` should take the delta to zero).

## 2. The instrument (reproducible from this record alone)

The 4th strike's bench (`-derivation.md` §3), extended with one more state class and a selection
matrix. A single HTML page replicating `#home`'s recipes structurally verbatim from `css/app.css`
at `4253fa4` (vars pinned `--safe-top: 20px`, `--nav-h: 56px`, `--nav-pad: 12px`, so
`safe+51 = 71px`; scrollbars zero-width per css:772-775):

- `#home` = css:126-135 exactly (fixed, both insets, `padding: 14px 16px 40px`,
  `overflow-y: auto`, `z-index: 20`, `will-change: transform`).
- `.parkedpre` = css:98-103 exactly (SHIPPED: `top: 0` + restatements + `translateX(-101vw)` +
  `overflow: hidden` + `pointer-events: none` + `z-index: 0` + `will-change: transform`).
- `.parkedadopted` = **shipped minus `top: 0` ONLY** — the plan §4.2 fix, byte-for-byte.
- `.parkedtwodel` = shipped minus both deletions (the 4th strike's killed form — sensitivity
  control).
- Fragility variants over the adopted form: `translate3d(-101vw,0,0)` for `translateX`;
  `will-change: auto`; `overflow: clip` for `overflow: hidden`. Control: `overflow-anchor: none`.

Content: a mutable `#above` region (3 blocks) over 30 blocks, 100px + 4px margin each (pitch
104, first offsetTop 14); a `nested` variant wraps ten of them in a `#sect` container spanning
the viewport; a `short` variant has 4 below-blocks (`scrollHeight` 782). Viewport 526×800 →
`clientHeight_active` = 661. Each anchoring scenario: build fresh, scroll the ACTIVE box to 600,
settle real frames, record the watched block's `getBoundingClientRect().top` (= what the ghost
displays), apply the state class, settle, mutate, settle, read in-state `scrollTop`, remove the
class, settle, read revealed `scrollTop` + the watched block's top (jump = reveal − ghost), then
5 more settles for a late-adjustment check. Geometry scenarios park at a chosen depth with no
mutation. Run: `chrome --headless=new --disable-gpu --user-data-dir=<scratch>
--window-size=480,900 <probe url>`, page served by a local Node server that also receives the
POSTed results (plain real-time; per the 4th strike, virtual-time/frame-less environments
silently report "no anchoring" — the vacuous-green shape).

**Controls, all green before any finding was read (each reproduces a 4th-strike row):**

| Control | in-state | revealed | jump | Verifies |
|---|---|---|---|---|
| C1 active + above-shrink (−80) | 520 | 520 | 0 | anchoring live on the active recipe |
| C2 active + `overflow-anchor: none` | 600 | 600 | −80 | the instrument measures anchoring and nothing else |
| C3 SHIPPED park, same mutation | 520 | 520 | **0** | shipped parks anchor (4th strike reproduced) |
| C4 TWO-DELETION park, same mutation | 600 | 600 | **−80** | the killed regression reproduces — the instrument can see the fracture it is hunting |

## 3. (a) DECISIVE — the adopted park anchors like SHIPPED. EXECUTED: YES, 0px.

The 4th strike's kill scenario, fourth state class: home scrolled to 600, parked, content
mutation lands while parked (the `onFresh` background-revalidate shape, `home-screen.js:124`),
abort reveal preserves the offset (app.js:1227).

| Row | at park `clientHeight` | in-state | revealed | reveal jump | late |
|---|---|---|---|---|---|
| **A1 adopted + above-shrink (−80)** | **661 (= active)** | **520** | **520** | **0px** | 520 |
| A2 active + `renderCarousel` rebuild (wipe + rebuild, one block removed, −104) | — | 496 | 496 | 0px | 496 |
| **A3 adopted + the same rebuild** | 661 | **496** | **496** | **0px** | 496 |
| (C3 shipped, same scenario) | 732 | 520 | 520 | 0px | 520 |
| (C4 two-deletion, same scenario) | 661 | 600 | 600 | **−80px** | 600 |

The adopted form behaves exactly as shipped on the axis the 4th strike killed the two-deletion
form over: the parked box anchors, the mutation is absorbed while parked, the reveal is
seamless, and no late adjustment fires after the reveal. The inference "suppressor = `transform`,
un-suppressor = `overflow: hidden`, `top` anchoring-inert" holds when composed — this time the
variant of the validated finding survived its own execution.

## 4. (b) Anchor selection matches the active box. EXECUTED: exact-integer parity, all six shapes.

Final `scrollTop` from 600, per mutation shape, per state (shipped run as a third column):

| Mutation | active | **adopted** | shipped | reveal jump (active / adopted / shipped) |
|---|---|---|---|---|
| shrink above viewport (−80) | 520 | **520** | 520 | 0 / 0 / 0 |
| grow above viewport (+80) | 680 | **680** | 680 | 0 / 0 / 0 |
| shrink the block straddling viewport TOP | 600 | **600** | 600 | −80 / −80 / −80 |
| shrink a fully-visible in-view block | 600 | **600** | 600 | 0 / 0 / 0 |
| shrink a below-viewport block | 600 | **600** | 600 | 0 / 0 / 0 |
| nested (`#sect` children span the viewport), shrink above | 520 | **520** | 520 | 0 / 0 / 0 |

Adopted equals active on every cell. Two notes for the record:

- **The straddle row's −80 jump is NOT a park defect** — it is identical in the ACTIVE control:
  when the mutated node is the engine's own anchor, its block-start edge does not move, so no
  adjustment fires and the content below it shifts. Park-independent, present in shipped today,
  no regression axis for any form.
- The shipped column also matched active on every row, so no selection divergence surfaced even
  for the 71px-taller pre-fix box on this content shape — consistent with Blink selecting from
  the viewport TOP downward. With the adopted form the question is closed more strongly: the
  candidate viewport is geometrically IDENTICAL to active (equal `clientHeight`, equal offset),
  executed as the parity above.

## 5. (c) Clamp-free with `overflow: hidden` present. EXECUTED: the 71px delta is zero everywhere.

| Row | active ch / max | parked ch / max | parked st | revealed st |
|---|---|---|---|---|
| **G1 adopted, mid-range (600)** | 661 / 2825 | **661 / 2825** | 600 | 600 |
| **G2 adopted, bottom of range** | 661 / 2825 | **661 / 2825** | **2825** | **2825** |
| G3 shipped, bottom of range | 661 / 2825 | 732 / 2754 | 2754 | 2754 (−71, survives un-park) |
| **G4 adopted, short content, bottom** | 661 / 121 | **661 / 121** | **121** | **121** |
| G5 shipped, short content, bottom | 661 / 121 | 732 / 50 | 50 | 50 (−71, survives) |

With `overflow: hidden` present and `top: 0` gone, parked `clientHeight`, `scrollHeight` and
`maxScroll` are byte-equal to active on both content sizes — `overflow: hidden` contributes zero
geometry (scrollbars are zero-width, css:772-775), confirming the 4th strike's isolation of the
whole delta to `top`. There is no depth at which a clamp can occur, because the loss expression's
only term (the range delta) is measured zero. Stated honestly: the `short` rows here have
`maxScroll` 121 > 71, exercising the last-71px window (shipped clamps 121 → 50, exactly −71);
the whole-range-smaller-than-71 case was not separately driven, and is subsumed — a clamp
requires a range delta, and the adopted form has none on either content size. The 4th strike's
short-library rows (pre-fix max 649 → 578; post-geometry zero loss) corroborate the family.

## 6. Fragility of the anchoring equivalence (R-M1-anchor-quirk, commissioned "if cheap")

The equivalence (a transformed parked box anchors because `overflow: hidden` un-suppresses
Blink's transform suppression) is Blink implementation behaviour outside the spec's text. Three
executed perturbations of the adopted form, same kill scenario:

| Variant | in-state | revealed | jump | Reading |
|---|---|---|---|---|
| `translate3d(-101vw,0,0)` for `translateX(-101vw)` | 520 | 520 | 0 | robust to the transform FUNCTION form |
| `will-change: auto` (hint removed) | 520 | 520 | 0 | robust to `will-change` — not load-bearing for anchoring |
| **`overflow: clip` for `overflow: hidden`** | **0** | 600 | **−80** | **BREAKS — twice over** |

The `overflow: clip` row is the finding worth a line beyond the commission: `clip` makes the box
a non-scroll-container, so the in-park `scrollTop` OBSERVABLE collapses to 0 (anything reading
it while parked reads 0), anchoring blacks out (the mutation is not absorbed), and the reveal
jumps −80px — the killed two-deletion behaviour returns wearing a "modern CSS" edit. (The offset
itself resurfaced at reveal — Blink retains the saved scroll internally across a clip cycle —
which makes the failure worse to diagnose: `scrollTop` looks preserved after un-park while the
reveal still jumped.) **Consequence for §7.4: Tier 0's required-present entry must stay literal
on `overflow: hidden`** — the plan's acceptance test (6) already fails the `overflow-y: hidden`
narrowing; `overflow: clip` is now the executed second reason the entry can never be satisfied
by "an overflow declaration is present." The drift surface for R-M1-anchor-quirk is narrowed:
the transform's function form and `will-change` are not load-bearing; the `overflow` VALUE is.

## 7. EXECUTED vs REASONED vs DEVICE-OWED

**EXECUTED (real Blink 150, HeadlessChrome, controls green):** everything in §§3-6 — the adopted
form's anchoring parity with shipped (plain shrink and the `renderCarousel` rebuild shape), the
six-shape selection matrix at exact-integer parity, the geometry/clamp table on two content
sizes including bottom-of-range, the late-adjustment checks (none fires after any reveal), and
the three fragility rows.

**REASONED FROM SOURCE (not app-executed):** the composition into the app path — the ghost is a
static id-stripped clone (swipe.js:275-292), mutations land on the real parked `#home`
(`home-screen.js:124` `onFresh`; `renderDownloaded`; app.js:1436-1437), the abort reveal
preserves the offset (`applyScreen(dest,{resetScroll:false})`, app.js:1227), the park class
sites (app.js:484/485/520, nav.js:57). Identical links to the 4th strike's; `git diff
8834b32..4253fa4 -- js/ css/ index.html` is EMPTY (plan/records commits only), so the 4th
strike's source verification carries over verbatim.

**DEVICE-OWED (every residual still open, none closed by this strike):**
- **R-M1-retention (WebKit, iOS)** — whether WebKit retains `#home`'s offset across the
  `overflow-y: auto` → `overflow: hidden` flip. Unmeasured. If it discards, the loss is the full
  `scrollTop` at every depth and M1 is NOT fixed on iOS by this plan; the response is a new
  decision and re-adding the second deletion is NOT admissible (executed-regressive on Blink).
- **R-M1-anchor (device row, Blink/Android APK)** — this strike upgrades the row's "predicted,
  not executed for the exact adopted form" to EXECUTED ON DESKTOP BLINK 150; the in-app
  composition on a real Android WebView, and the compositor realization of the 0px, remain the
  device row. The row is still not optional — no CI cell can hold the axis.
- **R-M1-anchor-quirk (engine drift)** — the equivalence holds by measured Blink behaviour
  outside the spec's text and can drift with a WebView update; re-measure on drift (instrument
  reproducible from `-derivation.md` §3 or §2 above). §6 narrows what to watch: the `overflow`
  value is the load-bearing term.
- **iOS WebKit gaining scroll anchoring** in a future release would import the whole axis to
  iOS (unchanged from the 4th strike).
- **R-M1-cause / R-M1-flash** (the park-preserves-offset in-app measurement and the abort-flash
  regression check) — untouched by this strike, still owed per §9 of the plan.

## 8. Lesser planes struck (un-prosecuted, one line each)

- The three deferred-write kill interleavings: structurally closed by the write's removal;
  not re-struck (unchanged from the 4th strike's confirmation).
- Same-frame park+mutate: not re-driven this pass; the 4th strike executed it (no
  transient/ordering window) on the two-deletion form and the adopted form's anchoring is
  executed-live, so the plane offers no new purchase. Held.
- Post-reveal deferred adjustment: executed as the `late` column on every row — none fires. Held.
- The straddle-shrink −80: park-independent engine behaviour, identical in active shipped code
  today (§4); not a promise any form of M1 makes. Held.

## 9. Reconciliation (post-strike read of the rationale)

The plan's §4.2 reasoning — `overflow`'s only role is axis (ii); `overflow: hidden` contributes
zero geometry; the adopted form anchors because `hidden` un-suppresses the retained transform —
is executed-TRUE in full, including its honest-limit clause (the equivalence is measured engine
behaviour, not construction). The commission's distrust was still correct to fund: the claim was
an inference of exactly the shape that failed twice in this project ("anchoring computes the
same adjustment in both states"; `translateZ(0)` for `will-change`), the fourth state class had
never been driven, and the cost of execution was one page and minutes against the cost of a
fifth wrong shipment. The durable lesson this time is the cheap-confirmation corollary of my
4th: **when a fix is a variant of an executed finding, the variant's execution is not optional —
and when it is this cheap, it is not even a trade.** One new fact fell out for free (§6
`overflow: clip` breaks the axis twice over), which no reasoning pass had named. The failure
entered nowhere; the stone held.

VERDICT: HELD_STONE
