# RED suite — Swipe/reveal Stage 6i (no-swap: slide the real fixed `#home` in and leave it)

Author: Curie (test design). Date: 2026-07-28. Plan of record:
`Claude/Plans/PLAN-swipe-noswap-home.md` (PLAN_READY, Charpy FORGE + Loki HELD_STONE, HEAD `3b368a6`).
Branch: `stage6i-curie-red-suite`. Verdict: **RED_SUITE_READY**.

## What this suite proves (and does not)

It proves the CI-checkable MECHANISM of making active `#home` a `position:fixed` own-scroll
view that slides in as the real incoming mover: (1) a committed `browse→home` builds NO
home-snapshot pane and the real fixed `#home` is the un-parked incoming mover, the outgoing
being the real `#browse` still shown (SNAPSHOTGONE); (2) the `→home` scroll-settle gate is
deleted — a scrolled `browse→home` commit no longer holds nor queues the `SETTLE_MS` timer
(SCOPE); (3) an aborted `browse→home` re-parks the fixed `#home`, restores `#browse`, and
restores the start scroll (ABORT); (4) pull-to-refresh arms on `#home.scrollTop`, not
`window.scrollY` (PTR); (5) the custom scrollbar recognises `#home` as a supported surface
(SCROLLBAR); (6) the outgoing app-ghost of a scrolled HOME source reads its offset from
`#home.scrollTop`, not `window.scrollY` (GHOSTSCROLL); (7) the active `#home` rule is
`position:fixed` own-scroll (HOMEFIXED, the source-text half of the policy-ledger entry).

It does NOT assert any paint. The carousel flash R1(a), bar stability R1(b), nested-scroll
coherence R1(c), the L5 on-screen zero-jump R1(d), and the `browse→home` abort
cover-warmth/no-`#browse`-demote R1(e) are all DEVICE-owed (jsdom does no layout). GHOSTSCROLL
asserts only the SOURCE the ghost offset is read from, never the on-screen position — deliberately,
per the vacuously-green-harness scar.

## New / changed files

- `test/swipe-stage6i.test.js` — NEW. The 7-cell red suite (6 §10 CI cells + HOMEFIXED).
- `test/nav.test.js` — the two `home-tall` assertions RETIRED (see "home-tall retirement" below).
- `Claude/Decisions/PolicyLedger.mjs` — the `PL-swipe-6i-home-fixed-ownscroll` entry added.
- `js/*`, `css/*`, `test/fixtures/*`, `docs/*` — UNCHANGED. Building the feature (and the
  lockstep oracle/inventory edits) is Brunel's; see "Brunel build + lockstep" below.

## SKIP-PENDING-BUILD (how the red suite passes the pre-commit hook)

The pre-commit hook (`tools/hooks/run-checks.mjs`, toggle `tomeroam.hooks=true`) runs the WHOLE
suite and blocks on any plain failure; the project does not use `--no-verify`. So every NEW cell
is committed `{ skip: SKIP }` (skipped-pending-build), keeping the committed suite green
(745 tests, 737 pass, **0 fail**, 8 skipped). Each was CONFIRMED RED with the skip removed (run
output below). **Brunel removes the `{ skip: SKIP }` on each cell to drive it red, then builds to
green.** No assertion is weakened to green a cell.

## Cell → test map (§10)

| Cell | File | Test name | @HEAD | Red-driver / mutation it catches |
|---|---|---|---|---|
| SNAPSHOTGONE | `test/swipe-stage6i.test.js` | `SNAPSHOTGONE — a committed browse→home builds no home-snapshot pane; the real fixed #home is the incoming mover` | **RED** | `constructionPlanFor` keeps `incoming:'home-snapshot'` for →home → a snapshot `.nav-ghost` is built and `#home` stays parked. |
| SCOPE | `test/swipe-stage6i.test.js` | `SCOPE — a scrolled browse→home commit deletes the scroll-settle gate: no SETTLE_MS timer, no held reveal` | **RED** | keep the →home scroll-settle gate / →home held reveal → a `SETTLE_MS(100ms)` timer is queued and the session is held past finalize. |
| ABORT | `test/swipe-stage6i.test.js` | `ABORT — an aborted browse→home re-parks the fixed #home, restores #browse, and restores the start scroll` | **RED** | the abort omits re-parking `#home` → it lingers un-parked over `#browse` (post-build). RED @HEAD via the mid-drag precondition (see note A). |
| PTR | `test/swipe-stage6i.test.js` | `PTR — pull-to-refresh reads #home.scrollTop, not window.scrollY: a scrolled fixed #home does not arm the pull` | **RED** | pull still reads `window.scrollY` → arms while the document is at 0 and `#home` is scrolled. |
| SCROLLBAR | `test/swipe-stage6i.test.js` | `SCROLLBAR — surfaceKind recognises the fixed own-scroll #home as a supported home surface` | **RED** | `#home` left out of the supported-surface set → `surfaceKind(#home)` returns null. |
| GHOSTSCROLL | `test/swipe-stage6i.test.js` | `GHOSTSCROLL — the outgoing app-ghost of a scrolled HOME source reads #home.scrollTop, not window.scrollY` | **RED** | a HOME source reads the offset from `window.scrollY` → captured `ghostY` is 0, clone `translateY(0px)`. |
| HOMEFIXED | `test/swipe-stage6i.test.js` | `HOMEFIXED — the active #home rule is a position:fixed own-scroll view (source)` | **RED** | the active `#home` base rule stays in-flow (no `position:fixed` / `overflow-y:auto`). |

All boot-driven cells run under `boot({ fakeTimers:true, deferRaf:true })`; `boot` lands on Home,
so `#home` is the un-parked current screen. `toAuthors(h)` pushes Authors so a left-edge back-swipe
is Authors→Home. `h.setScrollY(600)` (>`SETTLE_SCROLL_MIN`=0.5·768=384) arms the HEAD settle gate.

## RED-run at HEAD `3b368a6` (skips removed) — CONFIRMED

```
not ok 1 SNAPSHOTGONE  'browse→home must build NO home-snapshot pane — the real fixed #home is the incoming mover (not a clone)'
not ok 2 SCOPE         'the →home scroll-settle gate is deleted — no SETTLE_MS(100ms) timer may be queued; got [{ms:500},{ms:600},{ms:100}]'
not ok 3 ABORT         'PRECONDITION (new behaviour): mid-drag the real #home is the UN-PARKED fixed incoming mover — so the abort has something to re-park'
not ok 4 PTR           'a downward drag on a #home scrolled to 500 must NOT arm the pull — it must gate on #home.scrollTop, not window.scrollY'
not ok 5 SCROLLBAR     'surfaceKind(#home) must return a supported (non-null) surface kind ...; got null'
not ok 6 GHOSTSCROLL   'the ghost offset SOURCE for a HOME source must be #home.scrollTop (500), not window.scrollY (0) — the Loki 500px jump-to-top source'
not ok 7 HOMEFIXED     'the active #home must be position:fixed (a fixed own-scroll view laid out against the viewport), not in-flow'
# pass 0  # fail 7
```

Each cell fails for its RIGHT reason (the fixed-`#home` behaviour is absent). Probe evidence at
HEAD: `browse→home` mid-drag builds `ghosts=1`, `#home.parked=true`, `#home.style.transform=""`,
`#browse` shown; a scrolled `browse→home` commit queues `pendingDump=[{ms:500},{ms:600},{ms:100}]`
and `PBSwipeSession()={id:1,dragging:false}` (held); `surfaceKind(#home)=null`; buildConstruction
`home→books` with `#home.scrollTop=500`/`scrollY=0` → `capture.ghostY=0`, clone `translateY(0px)`.

### Note A — ABORT is RED @HEAD via its mid-drag precondition (honest)

The post-abort assertions (`#home` re-parked, `#browse` shown, `scrollTo` issued) are green at
HEAD: at HEAD `#home` is never un-parked during a `browse→home` drag, so it is already parked
after the abort — those assertions are the ones the NAMED post-build mutation (abort omits
re-parking) reddens. To make ABORT red-first at HEAD, the cell asserts the NEW-behaviour
precondition mid-drag — the real `#home` is the un-parked fixed incoming mover — which is false at
HEAD (`#home` stays parked under the snapshot). That precondition is the HEAD red-driver; the
re-park is the mutation-catcher. Both are load-bearing; the cell can fail on either.

### Note B — SCOPE is realised as the "→home settle gate deleted" half (reconciliation FINDING)

The §10 SCOPE ROW text frames the mutation on the `abort→browse` path ("reintroduce the
scrollSettle gate on the abort to browse path"). But the `abort→browse` hold is BYTE-UNCHANGED —
it never passed `scrollSettle` (app.js:1235) — so a cell on that path is **green at HEAD and
cannot be red-first** (a pure no-regression guard). The Curie handoff instead points SCOPE at
`toHeldRevealPending` (the →home held reveal), and the Coverage dimension's PRIMARY clause is
"the →home scroll-settle gate deleted". SCOPE therefore realises THAT half — RED at HEAD, because
a scrolled →home commit arms `holdGhostUntilPaintable({scrollSettle:true})` at HEAD (a
`SETTLE_MS=100` timer + a held reveal). The `abort→browse` byte-unchanged drop-on-paint is already
a GREEN guard elsewhere (`swipe-stage6b-loser-cancel.test.js` RR(a/b/c) + `swipe-invariants.test.js`
"a HELD reveal keeps the owner THROUGH finalize"), so no coverage is lost. This is a realisation
of the model's stated intent, surfaced as a finding — not an invented cell.

## policy-ledger-gate fill (`PL-swipe-6i-home-fixed-ownscroll`)

`Claude/Decisions/PolicyLedger.mjs` now carries the §2.1/§2.4 overturn entry (all §1.C fields;
`knownRed:false` — the two enforcing tests are GREEN guards post-build, not `{todo}`). Its `tests`
name the two cells that pin it, both present in the suite so `test/policy-ledger-gate.test.js`
passes at HEAD:
- `SNAPSHOTGONE — a committed browse→home builds no home-snapshot pane; the real fixed #home is the incoming mover`
- `HOMEFIXED — the active #home rule is a position:fixed own-scroll view (source)`

(The gate is GREEN now: names exist; `knownRed:false` so they are not required to be `{todo}`. It
stays green once Brunel un-skips + greens them.)

## home-tall retirement (Loki-flagged) — what I did and what Brunel MUST regenerate

**Done here:** `test/nav.test.js` — the two `home-tall` assertions RETIRED (not inverted): the
`assert.ok(body.contains('home-tall'))` on the leaving-for-Home test (was line 65) and the
`assert.equal(body.contains('home-tall'), false)` on the browse-parks-Home test (was line 80) are
removed with comments explaining the Stage 6i retirement. Both tests keep their other assertions
and stay GREEN at HEAD and post-build (they no longer pin a concept being deleted). No stale
`home-tall` assertion reddens CI for the wrong reason.

**Brunel MUST regenerate (the FROZEN-MODEL parity will break when `home-tall` retires):**
- `tools/gen-swipe-model.mjs:284-285` — the `scroll policy` RESOLVED_RULES entry states "the
  navbar seater is `body.home-tall`". Update it to the Stage 6i reality (retire the `home-tall`
  toggle; the css:73 `.app` runway is the retained seater; active `#home` is fixed own-scroll).
- `docs/swipe-model.generated.txt` — regenerate: `node tools/gen-swipe-model.mjs`. The
  `test/swipe-model.test.js` parity test compares the generator output to this txt; removing
  `home-tall` from `js/nav.js` WITHOUT regenerating both the generator text AND the txt will
  redden that parity test. Do them together.

## Brunel build + lockstep test/oracle edits (flagged — NOT done here; reviewed by Poirot)

The frozen construction contract and its generated inventories are the INDEPENDENT oracle
(EC §4.14) — changed by a deliberate two-part edit (production + contract) a review sees. That is
Brunel's, in lockstep with `constructionPlanFor`. Flagged so nothing is missed:

1. `js/swipe.js constructionPlanFor` — for BOTH `→home` rows: `incoming` `home-snapshot`→
   `real-destination`, `renderDestination` `none`→`home-host`; `browse→home` outgoing STAYS
   `real-source` (Loki KILL #2). Remove `home-snapshot` from the value domain.
2. `test/fixtures/swipe-plan-spec.mjs` — flip STRUCTURAL_CASES rows 56 (`browse→home`) and 59
   (`overlay→home`) to `incoming:'real-destination'`, `renderDestination:'home-host'`; scrub the
   `incoming 'home-snapshot'` comment (line 34) and the `home-snapshot` term in `paneOf` (line 66).
3. Regenerate `docs/transition-matrix.generated.txt` (`gen-transition-matrix.mjs`); this + the
   frozen-model txt are the two inventories the plan §4 says regenerate.
4. `test/swipe-transition.test.js` and `test/transition-matrix.test.js:89` — go green once (2)+(1)
   agree; the snapshot-expectation pin follows the spec. No hand edit if driven off the spec.
5. `test/swipe-construction.test.js` — the two `home-snapshot` tests (F2-r "an app-ghost capture
   carries ghostY; a home-snapshot capture never does", lines ~180-195; and the home-snapshot
   `data-art` strip, lines ~302-309) assert a `browse→home` home-snapshot that no longer exists
   (post-build `browse→home` builds NO owned pane → `capture` is null). Brunel updates them to the
   pane-less reality (add the GHOSTSCROLL-style home-source ghost-offset recipe check here if
   desired).
6. `test/swipe-stage6e.test.js` — `DP.browse-home` (line 260) and `BR` (line 288) assert
   `browse→home` mints ONE owned `home-snapshot` `.nav-ghost` (`ghosts===1`) and the disposer
   removes it. Post-build `browse→home` is pane-LESS (both movers borrowed-real;
   `disposeOwnedPanes` is a no-op on →home — plan §6/§7). These BREAK when production changes and
   MUST be updated to the pane-less supersession reality. **Do not miss these** — they are the
   largest lockstep surgery.
7. The re-homing implementations (§9): `bindPullRefresh` (app.js:1340,1347) → `#home.scrollTop`;
   `ScrollBar.surfaceKind`/`metrics` (scrollbar.js) → support `#home`; `ghostApp` (swipe.js:257) →
   source-aware offset (`#home.scrollTop` for a home source). If Brunel wants a metrics CI
   assertion for SCROLLBAR, export `metrics` on `ScrollBar._test` (it is not today, so the CI cell
   asserts `surfaceKind` only).
8. CSS (§3/§6/§8): active `#home` gains `position:fixed`/`overflow-y:auto`/
   `-webkit-overflow-scrolling:touch`/`overscroll-behavior:contain` on the BASE `#home` rule;
   RETIRE `body.home-tall .app` (css:81), the `home-tall` toggle (nav.js:81) and the home-entry
   `scrollTo(0,1)` (nav.js:127); RETAIN css:73 `.app` runway (F1). 6g `#home{will-change}` deletion
   is device-gated on R1(a).
9. Register each cell's mutation in `tools/mutate.mjs` + `test/mutation-anchors.test.js` at build
   time (the mutation targets do not exist until the feature is built; at HEAD the "feature-absent"
   state IS the mutation, which is why every cell is already RED).

## Device-only cells (NOT CI — flagged per the plan §11 device-owed discipline)

- **R1(a)** carousel flash on the scrolled `browse→home` repro (the surviving hypothesis (ii)).
- **R1(b)** iOS-26 fixed-bar seating on the fixed own-scroll `#home` (bare, NP-over-home,
  Options-over-home; scroll + rotation).
- **R1(c)** nested vertical-`#home`/horizontal-carousel momentum + the A2 phantom double-scroll.
- **R1(d)** the L5 on-screen zero-jump at the real→ghost swap and abort uncover (GHOSTSCROLL
  proves only the SOURCE branch; the visible jump is a paint).
- **R1(e)** the `browse→home` abort cover-warmth + no `#browse` demote-flash (conceded, not
  asserted; behavior-preserving vs HEAD).

No CI cell reads any of these paints. Verify on the scrolled `browse→home` and `home→books` 60fps
repros (commit + abort) + a fixed-bar seating observation, per the subsystem device-owed rule.

## Handoff

- To **Brunel**: remove the `{ skip: SKIP }` on the 7 cells, build the feature (plan §13
  sequencing), do the lockstep oracle/inventory/test edits (1–9 above) and the `home-tall`
  regeneration, register the mutations, make the suite green.
- To **Mendeleev**: audit `test/swipe-stage6i.test.js` against §10; note the SCOPE reconciliation
  (Note B), ABORT's precondition red-driver (Note A), and that R1(a–e) are device-owed (not CI).

VERDICT: RED_SUITE_READY
