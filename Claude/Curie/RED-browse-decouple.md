# RED suite — the `#browse` scroll DECOUPLE (fixed own-scroll `#browse`, symmetric completion of 6i)

Author: Curie (test design). Date: 2026-07-29. Plan of record:
`Claude/Plans/PLAN-browse-decouple.md` (PLAN_READY, Charpy FORGE + Loki HELD_STONE, HEAD `cb9c933`).
Branch: `browse-decouple-curie-red-suite`. Verdict: **RED_SUITE_READY**.

## What this suite proves (and does not)

It proves the CI-checkable WIRING/CONTRACT of making active `#browse` a `position:fixed` +
`overflow-y:auto` own-scroll view whose six window-scroll consumers re-home to `#browse.scrollTop`:
(1) the `#browse` base CSS rule is fixed own-scroll with NO `will-change`/transform (BROWSEFIXED);
(2) the scrollbar recognises `#browse` as a supported surface (SCROLLBAR); (3) the outgoing
app-ghost of a scrolled browse source reads its offset from `#browse.scrollTop` (GHOSTSCROLL);
(4) the abort ghost clone excludes the fixed `.alphaindex` (STRIPEXCLUDE); (5) the virtual-list
scroll listener is capture-phase on document so a `#browse` scroll reaches realize, and the pure
`windowFor` model is correct for injected numbers (REALIZE); (6) `browse.js` `virtualView` injects
`#browse`-relative metrics into the controller (METRICS); (7) the browse scroll memory writes the
`#browse.scrollTop` surface on a browse→browse abort re-render (RESTORE); (8) `→home` from a
scrolled browse never pins `app.style.minHeight` — the `.266` probe is retired (PINGONE).

It does NOT assert any paint OR any real-geometry landing. The Books→Home flash (R-flash), navbar
seating (R-navbar), the strip anchoring/clip (R-strip), and browse→browse as a fixed mover
(R-browse2browse) are DEVICE gates. And the production real-geometry windowing — the `listTop`
`getBoundingClientRect` arithmetic and the clamp landing value — is DEVICE/manual-owed (jsdom
returns 0 for every rect/`scrollHeight`): REALIZE/METRICS/RESTORE are scoped to wiring/contract, not
the on-screen row window or the clamped value. GHOSTSCROLL asserts only the offset SOURCE, never
the on-screen jump.

## New / changed files

- `test/browse-decouple.test.js` — NEW. The 8-cell red suite.
- `Claude/Decisions/PolicyLedger.mjs` — the `PL-swipe-browse-fixed-ownscroll` entry added.
- `js/*`, `css/*`, `test/fixtures/*` — UNCHANGED (the construction contract is UNCHANGED — no
  frozen-spec edit). Building the feature + the lockstep test edits is Brunel's; see below.

## SKIP-PENDING-BUILD (how the red suite passes the pre-commit hook)

The pre-commit hook (`tools/hooks/run-checks.mjs`, `tomeroam.hooks=true`) runs the whole suite and
blocks on any plain failure; the project does not use `--no-verify`. So every cell is committed
`{ skip: SKIP }` (skipped-pending-build), keeping the committed suite green (full battery:
`no-mutbak/stamp/lint/typecheck/tests` all ✓). Each was CONFIRMED RED with the skip removed (run
below). **Brunel removes the `{ skip: SKIP }` on each cell to drive it red, then builds to green.**
No assertion is weakened to green a cell.

## Cell → test map (§11)

| Cell | Test name | @HEAD | Mutation it catches |
|---|---|---|---|
| BROWSEFIXED | `BROWSEFIXED — the active #browse base rule is a position:fixed overflow-y:auto own-scroll view with NO will-change/transform (source)` | **RED** | add `will-change`/transform to the `#browse` rule (would re-parent the fixed `.alphaindex`). |
| SCROLLBAR | `SCROLLBAR — surfaceKind recognises the fixed own-scroll #browse as a supported browse surface` | **RED** | `#browse` left out of the supported set → `surfaceKind` returns null. |
| GHOSTSCROLL | `GHOSTSCROLL — the outgoing app-ghost of a scrolled BROWSE source reads #browse.scrollTop, not window.scrollY` | **RED** | a browse source reads `window.scrollY` → captured `ghostY` is 0. |
| STRIPEXCLUDE | `STRIPEXCLUDE — the abort ghost clone excludes the fixed .alphaindex strip` | **RED** | the `.alphaindex` exclusion is removed → the clone still contains the strip. |
| REALIZE | `REALIZE — a #browse-dispatched scroll reaches the virtual-list realize handler (capture-phase document); the pure windowFor model is correct` | **RED** | the listener stays on `window` only → a `#browse` scroll never reaches the handler. |
| METRICS | `METRICS — browse.js virtualView injects #browse-relative metrics into the virtual controller` | **RED** | `browse.js` injects no metrics → the controller falls to the window default. |
| RESTORE | `RESTORE — a browse→browse abort re-render writes the #browse.scrollTop surface via positionOnEnter/applyScrollY` | **RED** | `applyScrollY` still calls `window.scrollTo` → `#browse.scrollTop` is never written. |
| PINGONE | `PINGONE — going to home from a scrolled browse never pins the app min-height (the .266 probe is retired)` | **RED** | the retired `.266` pin is reintroduced → `setView(home)` pins `app.style.minHeight`. |

Boot-driven cells (METRICS, RESTORE, PINGONE) use `boot({realBrowse:true?, fakeTimers:true,
deferRaf:true})`. METRICS/RESTORE need `realBrowse` (the real `browse.js`/`virtuallist.js`); METRICS
forces the virtual path (`VL.setForceVirtual(true)`) on the small books page and intercepts the opts
`virtualView` passes to `createController`. GHOSTSCROLL/STRIPEXCLUDE drive `Swipe.buildConstruction`
through a fake env (the §7 recipe seam). REALIZE/SCROLLBAR/BROWSEFIXED are unit/source.

## RED-run at HEAD `cb9c933` (skips removed) — CONFIRMED

```
not ok 1 BROWSEFIXED  'a base `#browse { … }` rule must exist in css/app.css (the decouple recipe)'
not ok 2 SCROLLBAR    'surfaceKind(#browse) must return a supported (non-null) surface kind …; got null'
not ok 3 GHOSTSCROLL  'the ghost offset SOURCE for a BROWSE source must be #browse.scrollTop (500), not window.scrollY (0)'
not ok 4 STRIPEXCLUDE 'the ghost clone must EXCLUDE the fixed .alphaindex …'
not ok 5 REALIZE      'a scroll event dispatched on #browse must reach the virtual-list realize handler …'
not ok 6 METRICS      'virtualView must INJECT a `metrics` object into createController (today it injects none …)'
not ok 7 RESTORE      'the abort re-render must restore via #browse.scrollTop …, not window.scrollTo …'
not ok 8 PINGONE      'setView(home) from a scrolled browse must NOT pin app.style.minHeight …'
# pass 0  # fail 8
```

Each fails for its RIGHT reason (the fixed-`#browse` behaviour is absent). Probe evidence at HEAD:
no base `#browse {…}` CSS rule; `surfaceKind(#browse)=null`; `buildConstruction` browse→browse with
`#browse.scrollTop=500`/`scrollY=0` → `capture.ghostY=0`, clone `translateY(0px)`; the ghost clone
contains the injected `.alphaindex`; a `#browse`-dispatched scroll leaves the active controller's
`_realize` uncalled (listener on `window`); `virtualView`'s `createController` opts have
`metrics=undefined`; a browse→browse abort writes `#browse.scrollTop` 0 times (applyScrollY hits
`window.scrollTo`); `setView(home)` from a shown scrolled browse sets `app.style.minHeight='0px'`.

### Note — honest scoping (jsdom does no layout), matching the plan's F1 rescoping

- **REALIZE** asserts ONLY the listener re-home (a `#browse` scroll reaches `onDocScroll` → the
  active controller's `_realize`) and the pure `windowFor` model for INJECTED numbers. The
  real-geometry `listTop`/clamp on-screen window is DEVICE/manual-owed — not asserted.
- **METRICS** asserts ONLY the metrics-injection wiring (`metrics.scrollY()` reads `#browse.scrollTop`;
  the injected `scrollTo` writes it) — property read/write, no geometry.
- **RESTORE** asserts ONLY the WRITE SURFACE (`applyScrollY`/`positionOnEnter` writes `#browse.scrollTop`,
  not `window.scrollTo`). The clamped landing VALUE clamps to 0 in jsdom (`scrollHeight`=0) and is
  device/manual-owed — not asserted.
- **GHOSTSCROLL** asserts the offset SOURCE (`#browse.scrollTop`); the on-screen zero-jump is device-owed.
- **STRIPEXCLUDE** asserts the clone excludes `.alphaindex`; the on-screen strip position is device-owed.

## policy-ledger-gate fill (`PL-swipe-browse-fixed-ownscroll`)

`Claude/Decisions/PolicyLedger.mjs` now carries the `#browse` fixed-own-scroll overturn entry (all
§1.C fields; `knownRed:false`). Its `tests` name the two cells that pin it, both present in the
suite so `test/policy-ledger-gate.test.js` stays green at HEAD:
- `BROWSEFIXED — the active #browse base rule is a position:fixed overflow-y:auto own-scroll view with NO will-change/transform (source)`
- `REALIZE — a #browse-dispatched scroll reaches the virtual-list realize handler (capture-phase document); the pure windowFor model is correct`

## Lockstep — what Brunel MUST update/regenerate (NOT done here; reviewed by Poirot)

The construction/classification/finalization contracts are UNCHANGED (browse stays `'browse'`), so
there is NO frozen-spec edit and the descriptor-coverage/transition gates stay green. But the
KIND-model change and the consumer re-home break two EXISTING tests + owe registrations:

1. **`test/swipe-construction.test.js` F2-r (≈lines 180-186)** — "an app-ghost capture carries
   ghostY; a browse→home transition builds no owned pane" builds a browse→browse ghost through
   `mkEnv({ scrollY: 137 })` and asserts `ghost.capture.ghostY === 137` ("the scroll the ghost is
   frozen at (env.scrollY)"). Post-decouple a BROWSE source reads `#browse.scrollTop` (0 in that
   ctx), NOT `env.scrollY()` — so this assertion BREAKS. Brunel updates it: set `#browse.scrollTop`
   in the ctx and assert `ghostY` against THAT (the browse-source ghost now reads `#browse.scrollTop`,
   mirroring the 6i home-source branch). **Do not miss this — it will redden when swipe.js:281 changes.**
2. **`test/screens.test.js` (≈line 72)** — the scoped native-scrollbar-hide list
   `['html','body','#home',…subs,'#options']` must ADD `#browse` in lockstep when Brunel adds
   `#browse` to the css scoped native-scrollbar-hide rule (so the native scrollbar is hidden and the
   custom indicator draws, matching the new `'browse'` `surfaceKind`). Green at HEAD; update it WITH
   the css change or it reddens for the wrong reason.
3. **`tools/mutate.mjs` + `tools/mutation-sweep.mjs`** — register each cell's §11 mutation at build
   time (the mutation targets do not exist until the feature is built; at HEAD the "feature-absent"
   state IS the mutation, which is why every cell is already RED). **BROWSEFIXED is a SOURCE-TEXT
   gate** — add it to `SOURCE_TEXT_GATES` with `caughtBy` its own gate (jsdom cannot compute a CSS
   transform), the INVERSE of the `#home` layer gate (home MUST be a fixed own-scroll view; browse
   MUST NOT be promoted). NOTE: the plan references `test/home-layer-invariant.test.js` as the mirror,
   but no file by that name exists — the closest existing home-layer source gate is `HOMEFIXED` in
   `test/swipe-stage6i.test.js`; `BROWSEFIXED` here is self-contained and needs no such file.
4. **Records scrub (route to Zelda)** — subsystem `swipe-reveal.md` §7/§18/§22 (`#browse` joins the
   fixed-own-scroll class); `PLAN-swipe-reveal.md` §2.1/§2.4 (`#browse` joins fixed-own-scroll; the
   in-flow class is empty); `PLAN-stableheight-probe.md` superseded; the css:73 comment
   ("#browse still needs it" → both views fixed) and the css:118-119 "unpositioned #browse" comment.
5. **S4 — retire the `.266` pin** (`js/nav.js` setView: the SET at line 84, the CLEAR at line 90, the
   discriminator comment 68-83) — PINGONE gates its removal. Keep the `browseWillHide()` deactivate-
   before-hide (nav.js:61-67, O3).
6. **B4 `playingTrackY`** (browse.js:245: `(window.scrollY||0) + …`) has NO dedicated CI cell — it is
   a real-geometry files-page offset (device/manual-owed), re-homed to `o.mount.scrollTop` in S2.
   Flagged so Brunel re-homes it though it is not gated at CI.

## Device-only cells (NOT CI — flagged per §12)

- **R-flash** — the Books→Home flash gone by construction (direction device-PROVEN by the `.266`
  probe; confirm the clean form on the scrolled Books→Home 60fps repro).
- **R-navbar** — the fixed bars seat with no in-flow view driving the document height (bare browse +
  NP-over-browse + Options-over-browse; scroll depth + rotation; transport present/absent).
- **R-strip** — iOS-26 keeps the fixed `.alphaindex` viewport-anchored + un-clipped under a
  `position:fixed`+`overflow-y:auto` `#browse` (BROWSEFIXED gates the source-text precondition only).
- **R-browse2browse** — browse→browse rendered as a fixed translateX mover (commit + abort): the
  slide clean, no off-screen bleed, the strip rides + re-anchors, the incoming page at its restored
  scroll (STRIPEXCLUDE + RESTORE + GHOSTSCROLL gate the CI-visible seams; the slide paint is device-owed).
- Plus the production **real-geometry windowing/clamp** (§6 B1): the `listTop`
  `getBoundingClientRect` arithmetic + the clamp landing value — device/manual-owed, not a CI cell
  (a cell asserting the on-screen window/landing would be vacuously green).

**Flash C (the browse→browse in-list `letterhead`/divider re-raster) is explicitly NOT in this
Coverage Model or its device gate** — coupling-independent, a separate deferred track.

## Handoff

- To **Brunel**: remove the `{ skip: SKIP }` on the 8 cells, build S1+S2+S3 as ONE ATOMIC COMMIT
  (§4/§14: the fixed `#browse` recipe, the six-consumer re-home incl. the `browse.js` metrics
  injection + the virtuallist listener→capture-document + the scrollbar `'browse'` kind, and the
  swipe.js:281 browse `ghostY` branch + `.alphaindex` exclude), then S4 (retire the `.266` pin) and
  S5 (records). Do the lockstep test edits (1–2), register the mutations (3), scrub the records (4).
  Make the suite green.
- To **Mendeleev**: audit `test/browse-decouple.test.js` against §11; note the wiring/contract
  scoping of REALIZE/METRICS/RESTORE (real geometry device-owed), and that R-flash/R-navbar/R-strip/
  R-browse2browse (and the real-geometry windowing/clamp) are device-owed, not CI.

VERDICT: RED_SUITE_READY
