# Brunel build log — Swipe Stage 6i (fixed own-scroll `#home` slide-and-leave)

Plan of record: `Claude/Plans/PLAN-swipe-noswap-home.md` (PLAN_READY, Charpy FORGE + Loki
HELD_STONE). Red suite: `Claude/Curie/RED-swipe-stage6i.md` + `test/swipe-stage6i.test.js`
(7 cells). Build date: 2026-07-28. Build number: **2026-07-28.262** (swipe build);
**2026-07-28.263** (the `.mutbak` gate, separate commit).

## Slice completed

Active `#home` becomes a `position:fixed` own-scroll view that never leaves the DOM; a
`→home` transition un-parks the real fixed `#home` as the incoming mover and leaves it —
NO home-snapshot, NO held reveal, NO scroll-settle gate. The construction enum's `→home`
INCOMING flips `home-snapshot`→`real-destination` with a new `home-host` render; the
`browse→home` OUTGOING stays `real-source` (option (a), Loki KILL #2 — the real never-hidden
`#browse` mover keeps its covers warm on an abort). The home vertical scroll re-homes off the
document onto `#home.scrollTop` (pull-to-refresh, the custom scrollbar, the outgoing
app-ghost's source-aware fidelity offset).

## Production behavior changed

- **`js/swipe.js constructionPlanFor`** — `→home` incoming `home-snapshot`→`real-destination`;
  renderDestination `none`→`home-host`. `home-snapshot` leaves the value domain. Outgoing
  unchanged (`real-source`). No default branch relaxed.
- **`js/swipe.js buildConstruction` / `paneBuilders`** — `snapshotHome()` DELETED (the second
  owned-pane recipe); the incoming home-snapshot branch removed (→home now takes the
  borrowed-real else-branch). `ghostApp(fromKind)` gains a source-aware offset: a HOME source
  reads `#home.scrollTop` (a fixed own-scroll view), a browse source keeps `env.scrollY()`;
  both feed the same whole-clone `translateY(-offset)` content-translate.
- **`js/app.js`** — `env.renderDestination` gains a `host === 'home'` branch (un-parks the
  real `#home`, does NOT hide `#browse`). The commit→home held-reveal branch DELETED (→home
  falls through to the plain no-hold finalize). The 6h scroll-settle gate DELETED entirely:
  `holdGhostUntilPaintable` reverts to `decoded && painted` (its sole caller now is
  abort→browse); `SETTLE_MS`, `SETTLE_SCROLL_MIN`, `opts.scrollSettle`, the `scrollend`
  listener, `cur.revealScrollEnd`, `cur.revealSettleTimer`, `settled`, `cover.settleVia` all
  removed. Pull-to-refresh reads `#home.scrollTop` (both the arm gate and the disarm gate).
- **`js/nav.js`** — the home-scoped `body.home-tall` toggle DELETED (setView); the home-entry
  document `scrollTo(0,1)` replaced by `#home.scrollTop = 0` (applyScreen).
- **`js/scrollbar.js`** — `surfaceKind` recognises `#home` as a supported `'home'` surface.
- **`css/app.css`** — the active `#home` rule gains `position:fixed` + inset scroll-box
  geometry + `overflow-y:auto` + `-webkit-overflow-scrolling:touch` +
  `overscroll-behavior:contain` + opaque background; the redundant `body.home-tall .app`
  DELETED. `#home` joins the scoped native-scrollbar hide. **`.app` css:73 runway RETAINED**
  (F1 — it still seats the bars for short `#browse` pages).

## Production behavior deliberately unchanged (parity)

`browse→home` outgoing stays `real-source`; the abort→browse held reveal is byte-identical
(it never passed `scrollSettle`, so removing the third gate reduces it to the pre-6h
`decoded && painted`); `#browse`'s document-scroll model + `.alphaindex` handling untouched;
the frozen swipe model APIs + three-layer oracle unchanged except the two `→home` spec rows.

## Classification (EC §4.19)

NEW POLICY — overturns plan-of-record §2.1/§2.4 (`#home` leaves the in-flow
shared-document-scroll class, joins the fixed-own-scroll class; the SNAPSHOT-iff-home rule
retired). Ledgered as `PL-swipe-6i-home-fixed-ownscroll` in `Claude/Decisions/PolicyLedger.mjs`
(added by Curie, `knownRed:false`; the two enforcing tests SNAPSHOTGONE + HOMEFIXED are green
guards). SUBTRACTIVE on the `→home` path (net line count down).

## Lockstep edits (the frozen model + matrix + dependent suites)

- `test/fixtures/swipe-plan-spec.mjs` — rows `browse→home` (56) and `overlay→home` (59)
  flipped to `incoming:'real-destination'`, `renderDestination:'home-host'`; `paneOf` drops
  the `home-snapshot` clause; header comment scrubbed.
- `tools/gen-swipe-model.mjs` — RESOLVED_RULES `scroll policy` entry rewritten (retires
  `body.home-tall`; the `.app` runway is the retained seater; `#home.scrollTop` reset).
- `docs/swipe-model.generated.txt` + `docs/transition-matrix.generated.txt` — REGENERATED.
- `test/transition-matrix.test.js` — the spec-consistency test rewritten (SNAPSHOT retired;
  GHOST is the only pane rule; `home-host` iff destination home).
- `test/swipe-construction.test.js` — the two `home-snapshot` tests rewritten to the
  pane-less reality (browse→home builds no capture; the freezeArt test drives a home SOURCE
  ghost instead of a home-snapshot).
- `test/swipe-stage6e.test.js` — DP.browse-home and BR rewritten: browse→home is now
  pane-LESS (both movers borrowed-real; disposeOwnedPanes no-ops; #home re-parked on recovery).
- `test/swipe-stage5-wiring.test.js` (F2-r WIRING), `test/swipe-stage5-residuals.test.js`
  (F1a-L3), `test/swipe-invariants.test.js` (HELD-reveal endpoint),
  `test/swipe-stage6b-loser-cancel.test.js` (toHeldRevealPending), `test/swipe-gesture.test.js`
  (.206 retired), `test/swipe-stage6.test.js` (OB-home re-homed), `test/screens.test.js`
  (`#home` in the scoped scrollbar hide) — all re-pointed off the retired commit→home held
  reveal / home-snapshot onto the surviving abort→browse held reveal or the re-homed channel.
- `test/swipe-stage6h.test.js` — DELETED (its subject, the 6h scroll-settle gate, is removed).

## Mutations (EC §4.10)

Registered in `tools/mutate.mjs`: 8 new stage6i mutants (SNAPSHOTGONE, home-host, SCOPE,
ABORT, PTR [two-part, both gates], SCROLLBAR, GHOSTSCROLL, HOMEFIXED). Removed 3 mutants whose
defect is now unreachable (their targets deleted): `swipe5 F2-r` (home-snapshot capture
ghostY), `swipe5 F2-r-wiring` (L3 synthesizes ghostY on the home path), and the 7 `stage6h`
mutants (the deleted scroll-settle gate). Re-anchored `swipe5 F7a`/`S5_ORDER` for the
`ghostApp(fromKind)` signature.

**Full mutation sweep (all 85 registered mutants, 3 shards): 0 uncaught, 0 unapplied, 0 stale
flags.** Each new mutant is caught by its NAMED defender (per-mutant verified): 7 of the 8 by
their designated integration/source cell; **the 8th (`stage6i CONTRACT`, the constructionPlanFor
→home value revert) is caught by the INDEPENDENT ORACLE `test/swipe-transition.test.js`, NOT by
an integration cell** — it is runtime-inert (buildConstruction branches on
`plan.renderDestination`, never reads `plan.incoming`; both `'none'` and `'home-host'` hit the
same borrowed-real else-branch, and the un-park is driven by `destinationHost==='home'`), so it
changes only the frozen contract value the three-layer oracle reconciles (EC §4.14). Its
registry name states this explicitly (Poirot Finding 1 — the mutant was previously misnamed
`SNAPSHOTGONE`; SNAPSHOTGONE's true behavioral guard is the separate `stage6i home-host`
mutant). The PTR mutant needed a two-part edit (both the arm and disarm gates) — reverting only
the arm gate was UNCAUGHT because the still-correct disarm gate disarms on the first move. Three
mutants were removed whose defect is unreachable post-6i (targets deleted): `swipe5 F2-r`
(home-snapshot capture ghostY), `swipe5 F2-r-wiring` (L3 synthesizes ghostY on the home path),
and the 7 `stage6h` mutants (the deleted scroll-settle gate). Re-anchored `swipe5 F7a`/`S5_ORDER`
for the `ghostApp(fromKind)` signature.

**Sweep-hygiene fix (Poirot re-verify pass):** the new `test/no-mutbak-gate.test.js` asserts the
`.mutbak` check exits 0 on a CLEAN repo — but the sweep applies a mutation that leaves a
`*.mutbak` backup, so the repo is never clean mid-sweep and the test failed for EVERY mutation
(a false CAUGHT that flipped the pre-existing benign-alone playback mutant #4 to "stale"). Added
`no-mutbak-gate.test.js` to `SOURCE_TEXT_GATES` in `tools/mutation-sweep.mjs` (the same
fails-by-construction class as the anchors gate) — the sweep is now honest (0 stale) and the
normal `npm test` battery still runs the gate test (where the repo is genuinely clean).

## Verification

- Full suite: **740 tests, 739 pass, 0 fail, 1 skip** (the device-only KEEPER cell) at the
  Poirot re-verify HEAD. The 7 `test/swipe-stage6i.test.js` cells un-skipped and green.
- Lint (`eslint js sw.js`): clean. Typecheck (`tsc -p jsconfig.json`): clean.
- Build stamp coherence (`stamp-build --check`): PASS at 2026-07-28.264.
- `.mutbak` pre-commit gate built (`tools/hooks/no-mutbak-check.mjs`, wired first in
  `run-checks.mjs`) + proven both ways (blocks with a dummy `zzz.mutbak` exit 1, passes clean
  exit 0) + regression test `test/no-mutbak-gate.test.js` (3 cases green). Separate commit (.263).

## Poirot review dispositions (Findings 1 & 2 + O4, build .264)

- **Finding 1 (mutation misattribution) — FIXED.** Reproduced first: `#77` applied leaves
  SNAPSHOTGONE green (7/0) and reddens only the oracle `swipe-transition` (12/1). Reframed the
  mutant's name/attribution to `stage6i CONTRACT … (-> swipe-transition oracle, NOT SNAPSHOTGONE)`
  and corrected the per-mutant claim in this log (above). Re-verified: the CAUGHT attribution is
  now truthful.
- **Finding 2 (incomplete concept-scrub) — FIXED.** Updated three stale `snapshotHome`/
  `home-snapshot` comments (`js/app.js` paneBuilders header, the capture-record comment, the
  paneKindOf header) to current truth; **removed the dead `'snapshot'` arm** in `paneKindOf`
  (verified unreachable from source: the only owned-pane recipe post-6i is the app-ghost, which
  requires `toKind !== 'home'`, so `cur.dest.v === 'home'` can never coincide with an owned pane)
  — `paneKindOf` now returns `p.length ? 'ghost' : 'none'`.
- **O4 (vestigial if/else) — DONE.** Collapsed `buildConstruction`'s incoming branch
  (`swipe.js`) — both arms wrapped the identical `env.renderDestination(...)` borrowed-real mover
  — to one line with a comment naming the per-host dispatch. O3/O5 left as Poirot directed.
- Regenerated `docs/swipe-model.generated.txt` (the comment additions shifted the app.js
  line-number census the frozen model prints).

## Device-owed (NOT built here, NOT claimed)

The flash is NOT claimed fixed. R1(a) carousel-blank on the scrolled repro (surviving
hypothesis (ii), the parked→translateX(0) transform-clear), R1(b) bar seating, R1(c)
nested-scroll, R1(d) the L5 on-screen zero-jump, R1(e) the browse→home abort cover-warmth +
no-`#browse`-demote — all DEVICE-owed (jsdom sees no paint). The CI cells assert SOURCE/branch,
not paint. 6g's `#home{will-change}` deletion is device-gated (plan §12).

## Ambiguities interpreted

- **Where to re-home the ABORT re-park assertion.** The plan says the abort re-parks `#home`;
  the cell asserts `#home.classList.contains('parked')` post-abort. The re-park is effected by
  `setView('home'`/`v!=='home')`'s `classList.toggle('parked', v !== 'home')` when applyScreen
  reconciles to the source (books) — I anchored the ABORT/DP.browse-home mutant on that
  setView line rather than inventing a new re-park call, since setView already owns parking.
- **The `#home` z-index.** The plan specifies "above the unpositioned `#browse`, below every
  additive overlay" without a number. `#browse` is unpositioned (z auto/0); `#options` is z25.
  I used **z-index:20** (above 0, below 25) to occlude `#browse` during the filmstrip while
  staying under all overlays. Flagged for review.
- **The `#home` inset/padding.** The plan says "sized to dynamic content, inset between the
  fixed bars" without exact values. I mirrored the `#options`/`#downloads` inset-scroll-box
  geometry (top = topbar bottom, bottom = navbar top, `padding: 14px 16px 40px`,
  `body.has-player` bottom bump) so home matches the established overlay scroll-box pattern.
  Flagged for review.

VERDICT: BUILD_GREEN

---

## Follow-on build — books→home scroll-clamp pre-empt (build .265)

Plan: `Claude/Plans/PLAN-swipe-clamp-fix.md` (Charpy FORGE, `Claude/Charpy/PLAN-swipe-clamp-fix-charpy.md`).
Separate, targeted fix on top of shipped 6i (fixed `#home` KEPT — orthogonal, not reverted).

**Diagnosis (device-confirmed, not mine to re-derive):** the persisting books→home carousel flash
is the window-scroll CLAMP that rides the outgoing `#browse` `display:none` collapse — hiding a
tall, scrolled-down in-flow `#browse` shrinks the document and the browser clamps `window.scrollY`
in the same frame, forcing an iOS recomposite that re-rasters the fixed `#home` carousel layers.
6i's fixed-`#home` insulated the carousels from the document scroll but did NOT remove the clamp,
so the flash survived (device oracle: flashes only scrolled-down, clean from the top).

**The fix (one guarded call, `js/nav.js` `setView`, the `!npOpen && !optOpen && !subOpen` block):**
inserted `window.scrollTo(0, 0)` AFTER `browseWillHide()` and BEFORE the `#browse`
`classList.toggle('hidden', …)`, so the window scroll is zeroed while `#browse` is still tall (a
valid in-range scroll, not a clamp) → the subsequent collapse forces no clamp (the device-proven
top-clean case). **F2 (Charpy): GUARDED** — restructured the former single-line `browseWillHide`
guard into a block gated by `v !== 'browse' && !browseEl.classList.contains('hidden')` (going to a
non-browse view while `#browse` is shown), so the scroll fires ONLY on the `→home` hide path, not
on `setView('browse')`. **F1 (Charpy): ANNOTATED** — the code comment states why it is safe and
invisible: the `scrollTo` and the `#browse` `display:none` run in ONE synchronous `setView` with no
paint between them (so `#browse` is never composited scrolled-to-0-while-tall), and across that
single frame the viewport is covered by the opaque fixed `#home` band + the fixed topbar/navbar/
transport; `#home` is `position:fixed` so a window scroll does not move it or re-raster its layers.
Home's OWN scroll reset (`$('home').scrollTop = 0` in applyScreen) is untouched — this touches only
the window/document scroll, now a pure clamp-surface.

**CLAMP CI cell (`test/swipe-stage6i.test.js`, red-first):** drives a real commit `Authors→Home`
(with `h.setScrollY(600)` modelling the scrolled case), spies `window.scrollTo`, and asserts a
`(0,0)` call fires while `#browse` is STILL SHOWN (before its `display:none`). ORDER only — jsdom
does no layout, so the compositor re-raster/flash is DEVICE-owed (plan §7 device gate); the cell
comment scopes this honestly. **Red-first proof:** RED at HEAD before the fix (7 pass / 1 fail — no
pre-hide `(0,0)` window scroll exists), GREEN after (8/8). **Mutation** `tools/mutate.mjs` #85
(move the `scrollTo(0,0)` to AFTER the `#browse` hide → the `(0,0)` fires while `#browse` is already
hidden → the before-the-hide assertion reddens): applied, reddens ONLY the CLAMP cell (7 pass / 1
fail), restored clean; foreground sweep of #85 → **caught (1 failing), 0 uncaught, tree clean**.

**Verification:** full suite **741 tests / 740 pass / 0 fail / 1 device-only skip**; lint + typecheck
clean; build stamp coherent at **2026-07-28.265**. Files changed: `js/nav.js` (the guarded call +
F1 comment), `test/swipe-stage6i.test.js` (CLAMP cell), `tools/mutate.mjs` (mutation #85), plus the
four stamp files.

**Device-owed (NOT claimed fixed):** the flash is NOT called fixed until the reliable on/off device
oracle passes — a scrolled `books→home` commit shows no carousel flash (clean from the top either
way). R1 (does the pre-emptive scroll itself flash) is strongly grounded against (occluded band +
fixed bars + single synchronous frame + viewport-anchored fixed `#home`); the option-2 stable-height
document is the specified fallback if it bites.

VERDICT: BUILD_GREEN
