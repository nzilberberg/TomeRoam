# RED suite — Stage 6g (Curie): keep `#home` a stable compositing layer through the reveal (source-text PROMO + real-reveal REVEAL)

Type: test-design (red-first)

Target plan: `Claude/Plans/PLAN-swipe-stage6g.md` (Charpy FORGE; Loki HELD_STONE — HEAD commit
`65817fd` "File Loki Stage-6g strike (HELD STONE) on the translateZ(0) reveal promise"). Authored against
production HEAD `65817fd`.

Suite files (both NEW; the only added tracked files):
- `test/home-layer-invariant.test.js` — cell **PROMO** (a SOURCE-TEXT gate over `css/app.css`, EC §4.10 style).
- `test/swipe-stage6g.test.js` — cell **REVEAL** (an integration test on the REAL app-harness reveal path).

No production code written. `css/app.css`, `js/app.js`, `js/nav.js`, `tools/` are pristine at HEAD (confirmed by
`git status` — the only added files are the two suites; `Claude/Linnaeus/` is a pre-existing untracked dir).

`Verdict: **RED_SUITE_READY**`

---

## 1. Cell → test map (plan §7/§8)

| Cell | Test(s) | Kind @HEAD | Channel |
|---|---|---|---|
| PROMO | `PROMO.base [SOURCE_TEXT] — the unconditional #home rule declares a persistent, layer-promoting, non-none transform` | **RED** | source text: `css/app.css` base `#home` rule's effective `transform` |
| PROMO | `PROMO.cascade [SOURCE_TEXT] — no static #home cascade state resolves to transform:none` | **RED** | source text: the static `{#home, #home.parked}` cascade |
| PROMO | `PROMO.parked [SOURCE_TEXT] — #home.parked declares a real, non-none transform` | green (guards the parked half) | source text: `#home.parked` effective `transform` |
| PROMO | `PROMO.parse-sanity — the source gate locates the base #home rule and the #home.parked rule` | green (non-vacuity guard) | source text: rule presence |
| REVEAL | `REVEAL — a real home→books ABORT reveal un-parks #home (carried .parked during the drag; not after)` | parity (green), mutation-proven | real DOM: `#home` `.parked` class-state via `h.touch` |

Every applicable Coverage-Model cell (§7) is realized: PROMO (the load-bearing structural invariant, red-first)
and REVEAL (the parity guard that the protected transition genuinely occurs on the real reveal path). Nothing
left bare.

---

## 2. RED run @HEAD — which fail, and that it is the RIGHT reason

`node --test test/home-layer-invariant.test.js test/swipe-stage6g.test.js` → **5 tests, 3 pass, 2 fail.**
Full suite `node --test test/*.test.js` → **736 tests, 733 pass, 2 fail, 1 skipped** — the two failures are
EXACTLY the two red-first PROMO cells; no collateral (the pre-existing skip is not in either new file).

| Test | Failure message (verbatim excerpt) | Right reason? |
|---|---|---|
| PROMO.base | `the base \`#home\` rule must declare a persistent, layer-promoting transform … Found transform=null. RED @HEAD: at HEAD the base rule is the .256 diagnostic \`#home { will-change: transform; }\` with no transform value.` | ✅ the base `#home` rule EXISTS but carries only `will-change`, no `transform` — the promotion is ABSENT, not a parse miss |
| PROMO.cascade | `no state of the static #home rule cascade may land #home on \`transform: none\` … Offending state(s): un-parked (#home) resolves to transform=null — not a layer-promoting non-none transform` | ✅ the un-parked static state (base `#home`) has no promoting transform at HEAD |

The RED is the invariant, not a parser/read error: **PROMO.parse-sanity PASSES** (the gate located both the
`#home` base rule and the `#home.parked` rule), so a RED PROMO.base is "transform absent", proven distinct from
"rule not found". **PROMO.parked PASSES** (HEAD `#home.parked { transform: translateX(-101vw) }` is a real
non-none transform). **REVEAL PASSES** at HEAD (the un-park already exists).

Brunel greens PROMO.base/PROMO.cascade by replacing the diagnostic `#home { will-change: transform; }` with the
production rule `#home { transform: translateZ(0); }` (plan §4). Confirmed achievable WITHOUT editing the file:
the source gate was run against the production form via an in-memory replace (`css/app.css` read, string
`will-change: transform` → `transform: translateZ(0)`), and PROMO.base + PROMO.cascade go **GREEN** while
PROMO.parked/parse-sanity stay green.

---

## 3. Falsifiability evidence (tests-must-be-able-to-fail)

- **PROMO (source-text, red-first).** The RED run @HEAD IS the falsifiability proof: both cells fail against
  pristine production for the exact cell reason (the base `#home` transform is absent). The plan-§8 PROMO
  mutation set was also exercised in-memory to confirm the gate is not one-sided:
  - base `translateZ(0)` → `none`: PROMO.base + PROMO.cascade RED (`transform="none"` fails the non-none check).
  - base rule DELETED: PROMO.base + PROMO.cascade RED, and PROMO.parse-sanity RED (rule absent).
  - base = bare `will-change`, no transform (= HEAD): RED (the recorded HEAD run).
  - `#home.parked` transform → `none`: PROMO.parked + PROMO.cascade RED (the parked half of the cascade).
  Each redden is on the correct channel (the source text of `css/app.css`).

- **REVEAL (parity) — MUTATION-PROVEN capable of failing.** Temporarily applied the plan-§8 REVEAL mutation
  "break the un-park (make the reveal leave `.parked` on `#home`)" to `js/nav.js` `setView` (line 57,
  `$('home').classList.toggle('parked', v !== 'home')` → `toggle('parked', true)`), ran `test/swipe-stage6g.test.js`
  → REVEAL **RED**; restored `js/nav.js` via `git checkout -- js/nav.js` (working tree pristine, confirmed).
  - The reddening surfaced at the REVEAL fixture-sanity un-park assertion, because the setup commit (Books→Home)
    and the abort reveal (home→books→home) un-park through the SAME `setView('home')` code — so a single
    production mutation that breaks the un-park breaks both. The final cell assertion is protected from vacuity
    STRUCTURALLY by the paired assertions it carries: `.parked` present DURING the drag AND absent AFTER the
    reveal cannot both hold unless a genuine parked→un-parked transition occurred.
  - **Pinpoint for Brunel's registered REVEAL mutation:** the effective un-park on the abort reveal is
    **`js/nav.js` `setView` (line 57)**, NOT `js/app.js` `showAppView` (line 482). Verified: mutating
    app.js:482's `$('home').classList.remove('parked')` to a no-op left REVEAL **GREEN** (that un-park is
    redundant on the abort reveal path). A REVEAL mutant registered against app.js:482 would read UNCAUGHT; it
    must target nav.js:57 `setView`. (app.js restored via `git checkout` — tree pristine.)

Mutation discipline: every temporary production mutation was applied and restored SYNCHRONOUSLY (never
backgrounded); `git status` confirms `js/nav.js` and `js/app.js` are unmodified. No `*.mutbak`/committed mutant.

---

## 4. Honest scope — the flash is DEVICE-ONLY; NO cell asserts it (plan §3/§8/§9, saga)

- **Neither cell asserts the flash, the compositing demote, or layer promotion.** iOS compositing/rasterisation
  is off the main thread and invisible to any harness (saga: the rAF frame detector was invalid for exactly this
  reason — trap #5 / the withdrawn "panes are not the mechanism" conclusion), and jsdom has no layout so it
  cannot compute a stylesheet `transform`. PROMO pins the STRUCTURAL invariant in the CSS SOURCE TEXT (the static
  `#home` cascade never resolves to `transform: none`); REVEAL pins the DOM CLASS-STATE transition
  (parked→un-parked) the CSS fix depends on. That the eliminated demote WAS the home→books abort flash, and that
  the production `translateZ(0)` form keeps it clean, is established by the build `.256` device controlled A/B and
  re-verified on device after ship (plan §9 device-verification obligation: (a) abort flash clean, (b) no navbar
  pop, (c) active-home text quality) — NOT by this suite.
- **PROMO deliberately excludes the transient animation-added classes** (`.view.nav-in-left`/`.nav-in-right`),
  whose keyframes END at `transform: none`. Those are a NON-reveal navigation animation, accounted-for-benign and
  out of the reveal-cascade scope (plan §3). The gate selects rules by EXACT `#home` / `#home.parked` selector,
  which naturally excludes the `.view.nav-in-*` rules.
- REVEAL's gesture is driven via `h.touch` at the REAL start target through the REAL
  `begin()→start()→move()→settle()→finalize()` path (saga trap #5: the swipe path is touch-based; the harness
  reproduces the real start-target dispatch). The home→books abort + un-park transition was verified empirically
  before authoring (a scratch probe: `#home.parked` = true mid-drag, false after the abort reveal) — not reasoned
  from the (saga-warned-unreliable) prose.

---

## 5. Handoff

- **Brunel** greens PROMO with the one-line `css/app.css` change (replace the `.256` diagnostic
  `#home { will-change: transform; }` at 109-115 with `#home { transform: translateZ(0); }` + production comment,
  plan §4/§9), bumps the build number (PWA deploy rule), and lands the §9 co-changes THIS suite deliberately does
  NOT touch:
  - **Wire `test/home-layer-invariant.test.js` into `SOURCE_TEXT_GATES`** in `tools/mutation-sweep.mjs` (the map
    at ~line 119), with its reason — a source-text gate fails BY CONSTRUCTION under any `css/app.css` mutation, so
    counting it as "caught" is a FALSE CAUGHT. **REQUIRED and not yet done** (flagged here honestly). It is not yet
    load-bearing only because no `css/app.css` mutation exists at HEAD; it becomes load-bearing the instant Brunel
    registers the PROMO css mutation below. `test/swipe-stage6g.test.js` (REVEAL) must STAY OUT of
    SOURCE_TEXT_GATES — it is a behavioural test and must run in the sweep to catch its mutation.
  - **Register the PROMO mutation** (neutralise the `css/app.css` base `#home` transform) under the source-text
    sweep, and the **REVEAL mutation** (break the un-park) under the behavioural sweep — targeting
    **`js/nav.js` `setView` line 57** (see §3 pinpoint; NOT app.js:482). Grounding note (plan §9): confirm
    `tools/mutate.mjs` can target a non-JS file (`css/app.css`); extend it if the registry is JS-only today.
  - Comment scrub `js/app.js` 552-554 (the "Deliberately NO will-change on the real in-flow views" comment) to
    record the scoped `#home` exception, and the DecisionLog / subsystem / plan-of-record reconciliations (plan §9).
- **Mendeleev** audits this suite against the §7 Coverage Model (two cells: PROMO, REVEAL).
- **Loki** already HELD_STONE on the §3 promise (HEAD commit `65817fd`).

Cell reconciliation: both §8 cells realized — PROMO (red-first, source text, 4 tests) and REVEAL (parity,
mutation-proven, 1 test). The flash is device-only and asserted by NO cell (stated §4).

`Verdict: **RED_SUITE_READY**`
