# PROBE — park geometry, step 10a of PLAN-swipe-declone.md

**Date:** 2026-08-01
**Commission:** `Claude/Plans/PLAN-swipe-declone.md:1034` (§13 step 10a), gate-ordered by `:811-813`
(§9 item 5) and `:1345` (§18 F5). Risk rows: `:1133-1136` (R-D), `:1171-1174` (R2c), `:1187-1192` (R5).
**Subject:** the resolved box and the scroll-anchoring behaviour of `.browsepage` with and without
`.parked`, in Blink, on the form at HEAD.
**HEAD measured:** `51f2edb`, build `2026-08-01.295`, tree clean.

## Verdict

**The gate PASSES. Both halves read 0.** The sequence may proceed to step 10b.

| Half | Quantity | Measured |
|---|---|---|
| A | box delta across the `.parked` toggle — border-box height, `clientHeight`, `scrollHeight` | **0 / 0 / 0** |
| B | reveal delta on a mid-park content mutation | **0** |

Both were measured against the **shipped** CSS at HEAD, extracted from `css/app.css` by selector
rather than transcribed. Step 10a as written anticipated measuring the planned rule; the Stage 2
build has since landed (`ee1080f`), so the measured form is the form that ships.

## The instrument

`chrome --headless=new`, HeadlessChrome/150.0.0.0, real time — no `--virtual-time-budget`. Exact
invocation:

```
"C:/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --user-data-dir=<scratch> --window-size=526,844 \
  http://127.0.0.1:<port>/probe.html
```

`--window-size=526,844` yields an inner viewport of **526 × 744**, which reproduces the round-2
review's geometry (`Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r2.md:34-35`). CSS variables
pinned `--safe-top: 59px; --nav-h: 54px; --nav-pad: 0px`, so `#browse` resolves to top 110, bottom
690, height 580.

The probe page declares the rules **extracted verbatim** from `css/app.css` at HEAD by exact selector
match — `#browse` (`css/app.css:224-229`), `body.has-player #browse` (`:230`), `.browsepage`
(`:95-99`), `body.has-player .browsepage` (`:100`), `.browsepage.parked` (`:118-121`), and the
native-scrollbar suppression (`:858-862`, a precondition of the geometry per `:852-857`). Variants
used as controls are generated from the extracted blocks by string transform, so they cannot drift
from the shipped text.

Reproducers filed beside this record:
`Claude/Linnaeus/PROBE-park-geometry-2026-08-01.gate.mjs` (the two gate halves and their controls)
and `Claude/Linnaeus/PROBE-park-geometry-2026-08-01.probe.mjs` (the isolation runs). Each serves the
generated page over loopback and collects the result by POST.

## Half A — box equality across the `.parked` toggle

Method: settle the active page, read `getBoundingClientRect().height`, `clientHeight` and
`scrollHeight`; add `.parked`; settle 6 real frames; read the same three.

| State class | height | clientHeight | scrollHeight | delta |
|---|---|---|---|---|
| **`.parked` (SHIPPED)** | 580 → 580 | 580 → 580 | 3354 → 3354 | **0 / 0 / 0** |
| `.parked` + `position: fixed; top: 0` (the pre-rework shape) | 580 → 744 | 580 → 744 | 3354 → 3354 | **+164 / +164 / 0** |
| `.parked` minus `overflow: hidden` | 580 → 580 | 580 → 580 | 3354 → 3354 | 0 / 0 / 0 |

The round-2 review read 580 / 580 / 4054 on the same three axes; the `scrollHeight` figure differs
only because this probe's content differs. The measured quantity is the delta, and it is 0 in both.

**The axis can read non-zero.** The pre-rework shape reads **+164** — the defect `§5.3.3`
(`Claude/Plans/PLAN-swipe-declone.md:360-381`) was written to remove. 164 = `T + B` = 110 + 54, which
independently confirms the corrected figure in §18 F13 (`:198-204`) and falsifies the retired 328px
one a second time.

## Half B — reveal delta on a mid-park content mutation

Method, taken from the `#home` strike that established the −80px number
(`Claude/Loki/STRIKE-home-shift-m1-derivation.md:56-60`): content is a mutable region of three 100px
blocks over thirty 100px blocks. Scroll the active page to 600, settle 8 real frames, read the
watched block's `getBoundingClientRect().top`; apply the state class; settle; shrink the first block
100px → 20px (−80px of content **above** the viewport); settle 10 frames; remove the state class;
settle 10 frames; read the watched block's top again. Then settle 10 further frames to catch a late
adjustment.

| State during the mutation | in-state `scrollTop` | watched top pre → revealed | reveal delta | anchored |
|---|---|---|---|---|
| active (control) | 600 → 520 | 124 → 124 | 0 | yes |
| active + `overflow-anchor: none` (negative control) | 600 → 600 | 124 → 44 | **−80** | no |
| **`.browsepage.parked` (SHIPPED)** | 600 → 520 | **124 → 124** | **0** | yes |

Un-park delta 0. Late drift over 10 further frames 0. The negative control fires at −80, so the
instrument measures anchoring and can read non-zero; the reading of 0 on the shipped rule is a
measurement, not a silence.

## What the measurement revealed that the plan does not predict

### 1. The Blink ground recorded for `overflow: hidden` on `.browsepage.parked` does not hold for that box

`css/app.css:115-117` and `Claude/Plans/PLAN-swipe-declone.md:370-372` both state that
`overflow: hidden` stays on `.browsepage.parked` on the same two grounds recorded for `#home.parked`
at `css/app.css:141-148`: (1) it keeps the box a scroll container, and (2) it un-suppresses Blink's
scroll anchoring under the park transform.

**Ground (2) is reproduced exactly on `#home` and is not exhibited by `.browsepage`.**

| Box and state | in-state `scrollTop` | reveal delta | anchored |
|---|---|---|---|
| `#home` shipped `.parked` | 600 → 520 | 0 | yes |
| `#home.parked` minus `overflow: hidden` | 600 → 600 | **−80** | no |
| `#home` + transform alone | 600 → 600 | **−80** | no |
| `.browsepage` shipped `.parked` | 600 → 520 | 0 | yes |
| `.browsepage.parked` minus `overflow: hidden` | 600 → 520 | **0** | yes |
| `.browsepage` + `translateX(-101vw)` alone | 600 → 520 | **0** | yes |
| `.browsepage` + `translateX(2px)` alone | 600 → 520 | **0** | yes |

The `#home` rows reproduce `STRIKE-home-shift-m1-derivation.md:90-103` to the pixel on this
instrument, so the divergence is a property of the box and not an instrument artifact or a Blink
version change.

### 2. The discriminator is `position: fixed` versus `position: absolute`, isolated to one declaration

Same declarations, same 580px box, same content, same watched block, same parent — only `position`
changes:

| Box | reveal delta | anchored |
|---|---|---|
| `.browsepage` recipe, `position: absolute; inset: 0`, inside `#browse` (SHIPPED) | 0 | yes |
| same recipe, `position: fixed` with `#browse`'s resolved insets, inside `#browse` | **−80** | no |
| same recipe, `position: fixed`, direct child of `<body>` | **−80** | no |
| `#home` recipe (`position: fixed`), inside `#browse` | **−80** | no |

Ruled out individually, each removal leaving the −80 intact on `#home`: `will-change: transform`,
`z-index: 20`, `max-width: 640px; margin: 0 auto`. Parentage is not the discriminator — the fixed
variant suppresses under `#browse` and under `<body>` alike.

**Derived statement.** In Blink 150, a non-none transform on a `position: fixed` scroll container
suppresses scroll anchoring on it, and `overflow: hidden` on that container un-suppresses it. The
same transform on a `position: absolute` scroll container does not suppress anchoring, with or
without `overflow: hidden`. `.browsepage` is `position: absolute` (`css/app.css:96`), so
`overflow: hidden` in its park rule performs no anchoring work in Blink — there is no suppression on
that box to undo.

**This is a statement about ground (2) only.** Ground (1) — the box's scroll-container status,
argued cross-engine at `css/app.css:141-143` — is untouched by this measurement, and WebKit is not
Blink. No change is proposed here; deriving is this seat's whole output.

### 3. A transform on the fixed ancestor `#browse` does not suppress the page's anchoring

`.browsepage` inside `#browse`, with the transform applied to **`#browse`** rather than to the page:
`scrollTop` 600 → 520, watched top 124 → 124, reveal delta **0**, anchored. The shipping
`browse→home` and `home→browse` transitions, which transform `#browse` while a page is the scroller,
therefore introduce no anchoring suppression on that scroller.

### 4. The two halves of the gate are non-redundant, and half B alone would have passed the defect §5.3.3 removes

The pre-rework shape (`.parked` + `position: fixed; top: 0`) reads **+164 on half A** and **0 on half
B**: the parked box is displaced 110px for the whole park (watched top 14 rather than 124) and
returns to 124 on un-park, so the reveal delta is 0. Half A is what catches it. The plan's
requirement that **both** read 0 (`:1034`) is load-bearing rather than belt-and-braces.

## Underived — named with what it would take

- **WebKit / iOS behaviour on every row above.** Blink only. Requires the device; it is R5 and R8's
  standing content and step 10b is where it lands.
- **Whether an off-viewport `.browsepage` PAINTS outside the viewport** (§15 R2b's second half,
  `:1165-1170`). Not addressed by this probe and still owed; it is not readable from a DOM dump and
  needs a pixel capture or the device.
- **The Blink code path behind the `position: fixed` suppression.** Only the behaviour is derived,
  not the mechanism. Deriving it requires Blink source
  (`third_party/blink/renderer/core/layout/scroll_anchor.cc`), which is not present in this
  repository.

## Records divergence found while reconciling

`Claude/Plans/PLAN-swipe-declone.md:1032-1033` marks steps 9 and 10 **open**. Both have landed and
are ancestors of HEAD: the Stage 2 red suite at `be7da1c`, the Stage 2 build at `ee1080f`. The build
has since been code-reviewed (`5d37820`), review-applied (`e1208eb`), struck (`9883d45`) and
coverage-audited (`51f2edb`). Steps 10b onward are genuinely open. The plan is the planner's
artifact and is not edited here.
