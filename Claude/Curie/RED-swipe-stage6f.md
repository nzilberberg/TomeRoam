# RED suite — Stage 6f (Curie): in-flow→overlay outgoing becomes an app-ghost; the real in-flow view is never transformed

Type: test-design (red-first)

Target plan: `Claude/Plans/PLAN-swipe-stage6f.md` (Charpy FORGE `Claude/Charpy/PLAN-swipe-stage6f-cb7ae3d.md`;
Loki HELD_STONE `Claude/Loki/STRIKE-swipe-stage6f-r1.md`). Authored against production HEAD `494dd52`.

Suite file: `test/swipe-stage6f.test.js` (9 tests realizing the six §8 cells). Driven through
`test/app-harness.js` (the REAL `begin()`→`start()`→`move()`→`settle()`→`finalize()` gesture path via
`h.touch`) reading the REAL DOM (`#browse`/`#home` inline `style.transform`, `.nav-ghost`, `.np-pill-float`),
plus the production `Swipe.constructionPlanFor` oracle required directly (MODEL). No production code written;
`js/swipe.js`, `js/app.js`, `js/nav.js`, `test/fixtures/swipe-plan-spec.mjs`, `test/transition-matrix.test.js`
are pristine at HEAD (confirmed by `git status` — the only added file is the suite).

`Verdict: **RED_SUITE_READY**`

---

## 1. Cell → test map (plan §7/§8)

| Cell | Test(s) | Kind @HEAD | Channel |
|---|---|---|---|
| SIbrowse | `SIbrowse — a real browse→overlay gesture never writes a swipe transform onto the real #browse` | **RED** | real DOM: `#browse.style.transform` mid-drag via `h.touch` |
| SIhome | `SIhome — a real home→overlay gesture never writes a swipe transform onto the real #home` | **RED** | real DOM: `#home.style.transform` mid-drag via `h.touch` |
| GHOST | `GHOST — … disposed on COMMIT`, `GHOST — … disposed on ABORT` | **RED** | real DOM: `.nav-ghost` count during drag (RED) + after exit |
| MODEL | `MODEL — production constructionPlanFor makes the in-flow→overlay outgoing an app-ghost` (RED) + `MODEL — the flip does not over-broaden` (guard, green) | **RED** | production `Swipe.constructionPlanFor` (contract oracle) |
| REVEAL | `REVEAL — an aborted browse→overlay reveals with NO hold …` + `REVEAL non-vacuity control …` | parity (green), non-vacuity-proven | real DOM: `.nav-ghost` presence at finalize under `deferRaf` |
| DEC | `DEC — a browse→nowplaying gesture still clones the NP pill decoration (.np-pill-float)` | parity (green), mutation-proven | real DOM: `.np-pill-float` mid-drag via `h.touch` |

Every applicable Coverage-Model cell (§7) is realized. **Both in-flow sources are covered** — `#browse`
(SIbrowse, GHOST, REVEAL, DEC) and `#home` (SIhome, and MODEL over all five in-flow families). The
**NP-decorated member** is covered live (DEC drives a real `browse→nowplaying`) and in the oracle (MODEL
asserts `browse→nowplaying` and `home→nowplaying`). Representative overlay destinations: `options` (the live
cells) and all seven overlay kinds (`options`/`nowplaying`/`general`/`playback`/`buffering`/`downloads`/
`diagnostics`) in MODEL.

---

## 2. How each in-flow→overlay gesture is armed through the REAL nav (no navStack poke)

- **browse→overlay** — `tap [data-nav=options]` then `tap [data-nav=books]` → `navStack=[home, options, books]`;
  a left-edge back-swipe from `books` has `dest = navStack[-2] = options`. The source `#browse` resolves as the
  outgoing (`env.sourceEl('in-flow','books') → appViewEl('books') → #browse`).
- **home→overlay** — `tap [data-nav=options]` then `tap [data-nav=home]` → `navStack=[home, options, home]`;
  back-swipe from `home` has `dest = options`; the source `#home` resolves as the outgoing. Home is the visible
  source (not `.parked`), so the inline read is the swipe write, not the standing `#home.parked` stylesheet
  transform (Loki residual 3).
- **browse→nowplaying (DEC)** — seed `opts.lastPlayed = { book:'bookA', track:'bookA-t0', … }` so
  `enterApp → restoreLastPlayed` establishes `ctx`; `tap('#player')` (the real player bar → `openNowPlaying`)
  pushes `nowplaying`; `tap [data-nav=books]` → `navStack=[home, nowplaying, books]`; back-swipe → `dest = nowplaying`.
- **browse→browse (REVEAL non-vacuity control)** — `tap books` then `tap authors` → `authors`-over-`books`; the
  shipped app-ghost + HOLDING-abort path.

`h.touch` goes live and applies the first drag transform in one `move()` (past the 8px lock, `|dx|>|dy|`), so a
single mid-drag `move(80,302)` is the read point (`dx=70`, back → `t=70`; the outgoing base-0 mover receives
`translateX(70px)`… but with `move(120,302)` → `translateX(110px)`, the observed value).

---

## 3. RED run @HEAD — which fail, and that it is the RIGHT reason

`node --test test/swipe-stage6f.test.js` → **9 tests, 4 pass, 5 fail**. The five failures are the intended
red-first cells, each failing on its LOAD-BEARING assertion (not an import, boot, or fixture-sanity error):

| Test | Failure message (verbatim) | Right reason? |
|---|---|---|
| SIbrowse | `the real in-flow #browse must carry NO swipe transform mid-drag … got 'translateX(110px)'` | ✅ the real `#browse` IS the outgoing mover at HEAD and gets `translateX` at app.js:576 |
| SIhome | `the real in-flow #home must carry NO swipe transform mid-drag … got 'translateX(110px)'` | ✅ the real `#home` IS the outgoing mover at HEAD |
| GHOST (commit) | `the browse→overlay outgoing must be an owned-pane .nav-ghost during the drag; got 0` | ✅ HEAD builds NO pane for in-flow→overlay (outgoing is real-source) |
| GHOST (abort) | `… .nav-ghost during the drag; got 0` | ✅ same |
| MODEL | `every in-flow→overlay transition must build an app-ghost outgoing … books->options got 'real-source' want 'app-ghost'` (all 35 in-flow×overlay pairs) | ✅ production `constructionPlanFor` returns `real-source` at HEAD |

The fixture-sanity guards (`starts(h).length === 1`; `#home` not `.parked`) all PASS, confirming the gestures
armed and went live — so the red is the invariant, not a failure to reach the code under test.

The four passing tests are the parity/guard cells:
- **MODEL over-broaden guard** (green): in-flow→home stays `real-source`, in-flow→browse stays `app-ghost`,
  overlay→* stays `real-source`. Guards the flip against widening past the plan.
- **REVEAL** (green): `browse→overlay` abort leaves no `.nav-ghost` covering past finalize under `deferRaf`.
- **REVEAL non-vacuity control** (green): the SAME no-ghost-at-finalize check applied to a shipped
  `browse→browse` abort — which genuinely HOLDS (`holdGhostUntilPaintable`) — is rejected, proving the check
  distinguishes a hold from a no-hold rather than passing vacuously.
- **DEC** (green): `.np-pill-float` is cloned on `browse→nowplaying`.

---

## 4. Falsifiability evidence (tests-must-be-able-to-fail)

- **SIbrowse / SIhome / GHOST / MODEL** — the RED run @HEAD IS the falsifiability proof: each fails for its
  cell's exact reason against pristine production. The plan-§8 mutation for these (revert the outgoing to
  `real-source` / force real-source so no ghost builds) is precisely the HEAD state, and the recorded red run
  is the executed evidence.
- **DEC (parity)** — mutation-proven with the EXISTING registered mutant `tools/mutate.mjs #38`
  ("swipe4 F1: buildConstruction ignores plan.decorations, NP pill not built"). Applied → DEC reddens on its
  own assertion: `a browse→nowplaying gesture must clone the NP pill decoration (.np-pill-float) …`; `--restore`
  → clean (`restored`, no `*.mutbak`). This mutant drops the `for (const deco of plan.decorations)` loop in
  `buildConstruction`, so the pill is never cloned — the exact defect DEC guards.
- **REVEAL (parity)** — non-vacuity proven by the shipped-hold CONTROL (browse→browse abort genuinely holds the
  ghost past finalize, and the REVEAL check rejects it). REVEAL's own dedicated "introduce a hold on the
  in-flow→overlay reveal" mutant is a NEW production edit that does not exist at HEAD; per plan §9 its
  registration in `tools/mutate.mjs` is Brunel's build-step obligation. The control demonstrates the assertion
  is non-vacuous today without that mutant.

Mutation sweep discipline: mutant #38 was applied and restored SYNCHRONOUSLY (not backgrounded); `git status`
and an `ls *.mutbak` scan confirm no backup residue and pristine production after the run.

---

## 5. Honest scope (plan §3, saga traps)

- The cells pin the **STRUCTURAL** invariant only — no swipe transform on the real in-flow view, and the
  outgoing pane's presence/disposal. They assert on the REAL nodes' **inline `style.transform`** and
  `.nav-ghost`/`.np-pill-float` presence, NEVER on paint/compositing. The compositor FLASH is invisible to
  jsdom (saga: rAF-based flash detection is invalid; the flash is device-only, plan §9). No cell claims the
  flash is fixed.
- The `#home.style.transform` read (SIhome) is not confounded by the standing `#home.parked` STYLESHEET
  transform (Loki residual 3): the source home is visible (asserted not `.parked`), and `.style.*` reads only
  the inline swipe write.
- Gestures are driven via `h.touch` at the REAL start target (saga trap 5: synthetic touch emits no paired
  PointerEvent — the swipe path is touch-based, and the harness reproduces the real start-target dispatch).

---

## 6. Handoff

- **Brunel** greens the five red cells with the one-line `constructionPlanFor` change (swipe.js:135-136,
  `real-source` → `app-ghost` for in-flow→overlay), plus the §9 coordinated co-changes THIS suite deliberately
  does NOT touch: the frozen-spec edit (`swipe-plan-spec.mjs` 55/58/181 + comment 33), the
  `transition-matrix.test.js` predicate (line 85 + doc-comment 83), both generated-doc regens, and REGISTERING
  the SIbrowse/SIhome/GHOST/REVEAL(hold)/MODEL mutants in `tools/mutate.mjs`. MODEL asserts production-vs-literal
  (`'app-ghost'`), NOT against the spec file, so it is red now and green the moment production flips —
  independent of Brunel's spec re-freeze.
- **Mendeleev** audits this suite against the §7 Coverage Model.
- **Loki** already HELD_STONE on the promise (r1); a build-artifact re-strike is noted in its residual 1.

Cell reconciliation: all six §8 cells realized; both sources (`#browse`, `#home`) covered; NP-decorated member
covered live and in the oracle. Nothing left bare.

`Verdict: **RED_SUITE_READY**`
