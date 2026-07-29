# Build log — the `#browse` scroll decouple

Builder: Brunel. Date: 2026-07-29. Plan: `Claude/Plans/PLAN-browse-decouple.md` (PLAN_READY,
Charpy FORGE, Loki HELD_STONE). Red suite: `test/browse-decouple.test.js` (Curie,
`Claude/Curie/RED-browse-decouple.md`).

## Slice completed

S1 + S2 + S3 as one atomic unit (plan §4/§14 required this — an interim S1+S2 without S3 ships a
per-swipe jump-to-top plus a mispositioned A–Z strip), plus S4 (retire the `.266` probe) and S5
(the PolicyLedger entry, already staged by Curie). Nothing from the plan was deferred.

- **S1 — `#browse` fixed own-scroll (`css/app.css`).** A new `#browse { position:fixed; ... }`
  rule mirroring `#home`'s Stage 6i recipe, minus `will-change` and minus `z-index` (both
  explicitly excluded by the plan — the first would re-parent the fixed `.alphaindex`; the second
  would pull it into `#browse`'s own stacking context). `body.has-player #browse` bottom bump
  included. `#browse` added to the scoped native-scrollbar-hide rule (both the
  `scrollbar-width:none` selector list and the `::-webkit-scrollbar` list).
- **S2 — the six-consumer re-home to `#browse.scrollTop`.**
  - B1 (`js/virtuallist.js`): the shared scroll listener moved from `window` (bubble) to
    capture-phase `document`, mirroring `scrollbar.js`'s existing pattern.
  - B1 (`js/browse.js` `virtualView`): now injects `#browse`-relative `metrics`
    (`scrollY`/`viewportH`/`listTop`) and a `scrollTo` that write `o.mount.scrollTop` — previously
    injected nothing, so the controller fell to the window-based default.
  - B2 (`js/browse.js`): the scroll recorder's listener moved from a module-load-time `window`
    listener to an `o.mount`-bound listener registered inside `init()` (where `o.mount` first
    becomes available), reading `o.mount.scrollTop`.
  - B3 (`js/browse.js` `applyScrollY`): writes `o.mount.scrollTop = clampY(...)` directly instead
    of `window.scrollTo(0, ...)`.
  - B4 (`js/browse.js` `playingTrackY`): reads `o.mount.scrollTop` instead of `window.scrollY`.
  - B5 (`js/scrollbar.js` `surfaceKind`): a `'browse'` kind added, mirroring the existing `'home'`
    kind. No change to `metrics()` (already generic) or the `ignore` threshold (already `4` for
    any non-`'doc'` kind).
- **S3 — `js/swipe.js` `ghostApp`.** The outgoing-ghost offset gained a `fromKind === 'browse'`
  branch reading `doc.getElementById('browse').scrollTop`, alongside the existing `'home'` branch;
  `env.scrollY()` remains the (now-unreachable-from-`ghostApp`, per the plan's U7 note) defensive
  default — kept, not removed, per the plan's "Brunel's venustas call" framing. The ghost clone now
  excludes `.alphaindex` (`clone.querySelectorAll('.alphaindex').forEach((n) => n.remove())`)
  before `freezeArt(clone)`, so the browse-source content-translate cannot re-parent/misposition
  the fixed strip.
- **S4 — `js/nav.js` `setView`.** Deleted the `.266` stable-height pin SET, the `→browse` CLEAR,
  and the discriminator comment block. The `browseWillHide()` deactivate-before-hide ordering
  (O3) is untouched. The now-dead `appEl` local was removed (would otherwise be an unused var).
- **S5 — records.** `Claude/Decisions/PolicyLedger.mjs`'s `PL-swipe-browse-fixed-ownscroll` entry
  was already staged by Curie and needed no change (verified its two named tests exist verbatim).

## Lockstep (Curie-flagged, all landed)

1. `test/swipe-construction.test.js` F2-r — `mkEnv({ scrollY: 137 })` no longer drives a
   browse-source ghost (that branch now reads `#browse.scrollTop`). Re-anchored to
   `ghostCtx.doc.getElementById('browse').scrollTop = 137` before `build()`; the assertion text
   updated to name `#browse.scrollTop` instead of `env.scrollY`.
2. `test/screens.test.js` — `#browse` added to the expected scoped native-scrollbar-hide list, in
   lockstep with the CSS change and the new `'browse'` `surfaceKind`.
3. `tools/mutate.mjs` / `tools/mutation-sweep.mjs` — see "Mutation registration" below.

## Lockstep NOT flagged by Curie's RED note, found and fixed at the bench

Three existing test files drove `Browse`'s scroll surface directly (not through the app harness)
and broke once B2/B3/B4 moved the write surface from `window.scrollTo`/`window.scrollY` to
`o.mount.scrollTop`:

- `test/browse-virtual.test.js` — the `window.scrollTo` mock and the `document.documentElement`
  `scrollHeight` mock were re-homed to the `#mount` element (this file's stand-in for `#browse`);
  one assertion (`view.scrollY` → `document.getElementById('mount').scrollTop`) and one scroll
  dispatch (`window.dispatchEvent` → `document.getElementById('mount').dispatchEvent`, since the
  listener is now capture-phase `document` and never sees a `window`-dispatched event) were
  updated to actually exercise the new listener target rather than passing vacuously.
- `test/browse-render-race.test.js` — the `window.scrollTo` spy was replaced with a
  `scrollTop`-setter spy on `#mount` (same write-surface move).
- `test/repaint.test.js` — drives `applyScrollY`/`positionOnEnter` directly without ever calling
  `Browse.init`; `o.mount` was `undefined` under the old code path (harmless, since the old
  `applyScrollY` never touched `o.mount`) but would throw under the new one. Added a minimal
  `Browse.init({ mount })` call.

One further pre-existing test directly contradicted the plan's own retirement of the `.266` probe:
`test/swipe-stage6i.test.js`'s `STABLEHEIGHT` cell asserted that `→home` from a scrolled browse
DOES pin `appEl.style.minHeight` — the exact opposite of `PINGONE`. `STABLEHEIGHT` tested the
`.266` probe itself (`PLAN-stableheight-probe.md`), which this plan retires and supersedes;
removed, with a short note pointing to `PINGONE` as its permanent replacement.

## Mutation registration

Eight new mutations added to `tools/mutate.mjs` (one per red-suite cell), registered as plain
entries — the same pattern as the existing `stage6i HOMEFIXED`/`GHOSTSCROLL`/`SCROLLBAR` entries,
each caught by its own test living in the (non-source-text-gated) suite file. **Deviation from the
plan's literal instruction, recorded:** the plan and Curie's RED note both say to add
`BROWSEFIXED` to `tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES`. Inspecting the actual mechanism:
`SOURCE_TEXT_GATES` excludes an ENTIRE test FILE from the behavioural sweep run (its stated purpose
is files that fail on EVERY mutation for reasons unrelated to what they test — e.g.
`mutation-anchors.test.js`). `test/browse-decouple.test.js` contains seven genuine behavioural
cells alongside the one source-text cell; gating the whole file would silently exempt SCROLLBAR/
GHOSTSCROLL/STRIPEXCLUDE/REALIZE/METRICS/RESTORE/PINGONE from ever being checked as CAUGHT by the
sweep. `test/home-layer-invariant.test.js` (the plan's named mirror) does not exist, and the actual
precedent it points to — `HOMEFIXED` in `test/swipe-stage6i.test.js` — is NOT in `SOURCE_TEXT_GATES`
either; it is a plain registered mutation caught by its own test in a non-gated file, exactly the
pattern used here for `BROWSEFIXED`. Followed that working precedent instead of the literal
instruction. No `caughtBy` field or `gateTestsFor()` helper exists anywhere in
`tools/mutation-sweep.mjs` or `tools/mutate.mjs` (confirmed by search) — the subsystem doc's §19
description of such a mechanism (Stage 6g's `PROMO` note) is itself stale/aspirational and predates
this build; not touched (out of this plan's scrub list).

Two pre-existing mutations in `tools/mutate.mjs` rotted because their anchors were adjacent-line
text I altered: `swipe5 freezeArt` (its anchor's second line, `freezeArt(clone);`, is no longer
immediately preceded by the `.hidden, .parked` prune — the new `.alphaindex` exclude line sits
between them) and `stage6i GHOSTSCROLL` (its single-line home/else ternary became a three-line
home/browse/else chain). Both re-anchored to the current adjacent text with the same mutation
intent, confirmed by `test/mutation-anchors.test.js` and the sweep below.

## Coverage Model — the eight CI cells (Gate B evidence)

Each cell's designated test, green before mutation, red on the intended assertion after, green
again on restore (`tools/mutation-sweep.mjs 58 83 85 86 87 88 89 90 91 92`, foreground, single run):

| Cell | Designated test | Mutation | Result |
|---|---|---|---|
| BROWSEFIXED | `BROWSEFIXED — the active #browse base rule ...` | #85 (adds `will-change`) | caught (1 failing) |
| SCROLLBAR | `SCROLLBAR — surfaceKind recognises the fixed own-scroll #browse ...` | #86 (drops the `'browse'` kind) | caught (2 failing) |
| GHOSTSCROLL | `GHOSTSCROLL — the outgoing app-ghost of a scrolled BROWSE source ...` | #87 (drops the browse branch) | caught (2 failing) |
| STRIPEXCLUDE | `STRIPEXCLUDE — the abort ghost clone excludes ...` | #88 (drops the `.alphaindex` exclude) | caught (1 failing) |
| REALIZE | `REALIZE — a #browse-dispatched scroll reaches ...` | #89 (listener back on `window`) | caught (1 failing) |
| METRICS | `METRICS — browse.js virtualView injects ...` | #90 (drops the injected metrics/scrollTo) | caught (1 failing) |
| RESTORE | `RESTORE — a browse→browse abort re-render writes ...` | #91 (`applyScrollY` back to `window.scrollTo`) | caught (4 failing — RESTORE plus the three collateral tests re-homed to `#mount`/`#browse`.scrollTop above) |
| PINGONE | `PINGONE — going to home from a scrolled browse never pins ...` | #92 (reintroduces the `.266` pin) | caught (1 failing) |

Re-anchored existing mutations, re-verified in the same sweep: #58 `swipe5 freezeArt` — caught (2
failing); #83 `stage6i GHOSTSCROLL` (home) — caught (1 failing). `swept 10: 0 uncaught, 0
unapplied, 0 stale flags`. Working tree confirmed clean after the sweep (no `.mutbak`, `git status`
shows only the intended source/test edits).

## Production behavior changed

Active `#browse` is `position:fixed`+`overflow-y:auto` (was in-flow, sharing the document scroll).
`window.scrollY` is now a constant 0 on every signed-in app view. The `.266` stable-height pin no
longer fires on `→home`. This is the classified NEW POLICY the plan ledgers
(`PL-swipe-browse-fixed-ownscroll`); it is not a parity extraction.

## Production behavior deliberately unchanged

The construction/classification/finalization contracts (`classifyTransition`/
`constructionPlanFor`/`finalizationPlanFor`) — same keys, same values for every transition, browse
stays `'browse'`; `test/fixtures/swipe-plan-spec.mjs` untouched. `cur.scroll0` and its
`window.scrollTo(0, cur.scroll0)` consumers (app.js) — untouched; harmless no-ops under the
decouple (Loki R1: the real browse→browse abort restore is `positionOnEnter`'s, not a swipe-side
write). The `browseWillHide()` deactivate-before-hide ordering (O3). `.browsepage.parked`. The
red `--page-bg` gradient (css:41) — not touched.

## Device-owed, not claimed here

R-flash (Books→Home flash clean), R-navbar (fixed-bar seating with no in-flow view), R-strip
(`.alphaindex` viewport-anchored under a fixed `#browse` on iOS-26), R-browse2browse (browse→browse
as a fixed mover) — all paints jsdom cannot see, per the plan's own scoping. Flash C (the
browse→browse in-list `letterhead` divider re-raster) is untouched and stays open, per the plan's
explicit deferral — not folded into this build.

## Full suite / gates

`node --test "test/*.test.js"`: 748 tests, 747 pass, 0 fail, 1 skipped (pre-existing, unrelated:
`KEEPER — a browser scroll between endHold and the successor's first move ...`, documented
device-only). `npm run lint` (eslint js sw.js): clean. `npm run typecheck` (tsc -p jsconfig.json):
clean. `node tools/stamp-build.mjs --check`: matched before the bump below. `node
tools/hooks/run-checks.mjs`: PASS (no-mutbak / stamp / lint / typecheck / tests all green).

## Files changed

`css/app.css`, `js/browse.js`, `js/nav.js`, `js/scrollbar.js`, `js/swipe.js`, `js/virtuallist.js`,
`test/browse-decouple.test.js`, `test/browse-render-race.test.js`, `test/browse-virtual.test.js`,
`test/repaint.test.js`, `test/screens.test.js`, `test/swipe-construction.test.js`,
`test/swipe-stage6i.test.js`, `tools/mutate.mjs`, `Claude/Plans/PLAN-stableheight-probe.md`
(marked superseded), `Claude/Plans/PLAN-swipe-reveal.md` (§2.1/§2.4 amended),
`Claude/Subsystems/swipe-reveal.md` (§7/§18/§22 amended). `Claude/Decisions/PolicyLedger.mjs` was
already correct (Curie) — no change needed.


VERDICT: BUILD_GREEN
