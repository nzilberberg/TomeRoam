# BUILD LOG — the home→books scroll shift fix (M1 + M2)

Author: Brunel (builder). Date: 2026-07-29. Plan of record: `Claude/Plans/PLAN-home-shift-fix.md`
(PLAN_READY; every gate run and cleared). Red suite: `Claude/Curie/RED-home-shift-fix.md`
(RED_SUITE_READY). Branch: `build/mutation-anchor-uniqueness`, worktree
`.claude/worktrees/build-mutation-uniqueness`. Base of this work: `d06316f`.
Commits: `4422dd9` (M2), `60f56e9` (M1).

## VERDICT: BUILD_GREEN

---

## 1. What was built

**M2** (`js/swipe.js:276`, commit `4422dd9`) — the outgoing app-ghost builder's clone `#library`
padding-top changed from the vestigial pre-6i in-flow `46px` to the measured fixed-inset-aligned
`53px`.

**M1** (`css/app.css:98-103`, commit `60f56e9`) — `top: 0` deleted from `#home.parked`;
`overflow: hidden` and every other declaration kept verbatim. A three-part comment added at the
edit site; a reciprocal pointer added at the `.app { overflow-x: clip }` comment (`css:161-165`,
now `css:189-193` post-edit).

## 2. M2's measured constant and its derivation

The plan left the exact px **Brunel-measures, device-owed**, weighting a probe's rough ≈46
reading over the 53 headline (Charpy F1) — because whether the clone's `.app` wrapper's own
padding-top contributes to the clone's layout (in which case `--safe-top` cancels and the answer
is the notch-independent `53px`) or not (in which case the answer carries `--safe-top` itself) is
a layout fact jsdom cannot resolve.

**Measured directly in a live Blink engine** (Chrome, via a local static server over this worktree
and the browser tool — not jsdom, not a guess): a page built the REAL `ghostApp('home')` clone
construction verbatim (cloning `.app`, stripping ids, removing `.hidden`/`.parked` nodes, setting
the `#library` inline padding-top) and measured `getBoundingClientRect()` on the first rendered
content (`.section-title`, "Continue Listening") in both the clone and the real `#home`.

- `.app`'s own CSS padding-top (`calc(--safe-top + 12px)`) **does contribute**: only ids are
  stripped from the clone, not classes, so `.app`'s class-based rule still applies in normal flow.
  Confirmed directly: `getComputedStyle(clone).paddingTop === '12px'` at `--safe-top: 0`, and the
  clone's `#library` section's own rect-top equals exactly 12 (i.e., `.app`'s padding-top, not 0).
- With the shipped `46px`: measured delta between the clone's rendered content and the real
  `#home`'s rendered content = **-7px** (not the probe's rough ≈19px estimate, which compared
  `#library`'s padding value directly against the real content-top without accounting for `.app`'s
  contribution).
- With **`53px`**: measured delta = **0px**, exactly.
- Confirmed **notch-independent**: re-measured with `--safe-top` overridden to `47px` (a typical
  iPhone notch value) — delta stayed -7px (shipped) / 0px (53px), unchanged.
- Confirmed **uniform across both ghosts**: repeated for `#browse` (giving it a matching
  `.section-title` first child) — same -7px (shipped) / 0px (53px) result.
- Confirmed **`body.has-player` does not move the content-top**: `#home`'s content-top measured
  identical (65px) with and without `.has-player` on `body` (only `bottom` changes, per the plan).

**Derivation, algebraically:** clone content-top = `.app` padding-top (12, safe-top cancels) +
`#library` padding-top (X). Real content-top = `#home` top (51) + `#home` padding-top (14) = 65.
Setting `12 + X = 65` gives `X = 53`. The measurement confirms this holds exactly, including
through a `.section-title` margin-top (22px) that collapses through the clone's id-stripped
`#home` (zero own padding) but not through the real, non-collapsed `#home` (14px padding blocks
collapse) — the two paths land on the same rendered pixel because both are measured relative to
the same `content-top` reference, and everything below that reference is identical DOM content.

**Candidate accepted by the cell:** `'53px'` (the `cancelled` candidate in
`test/ghost-clone-geometry.test.js`'s `alignedCandidates()`), not the `carried` candidate
(`calc(var(--safe-top) + 65px)`), since the measurement confirms `.app`'s padding does contribute.

## 3. Six cells' status (all green)

| Cell | Status | Evidence |
|---|---|---|
| M1PARKRANGE | GREEN | main cell + all 11 tests in `test/home-park-recipe.test.js` pass (§5) |
| M1WRITERSET | GREEN (lock, unchanged) | `test/scroll-writer-set.test.js` — untouched by this build |
| M1NOWRITE | GREEN (lock, unchanged) | `test/home-abort-writes.test.js` — untouched |
| M1NAVWINS | GREEN (lock, unchanged) | `test/home-abort-writes.test.js` — untouched |
| MUTUNIQ | GREEN (lock, unchanged) | `test/mutation-applier.test.js` + `test/mutation-anchors.test.js` — untouched |
| M2ALIGN | GREEN | `test/ghost-clone-geometry.test.js` — both tests pass (§2) |

Full suite: **777 passed, 0 failed, 1 skipped** (778 total) — the one skip is
`test/swipe-stage6i.test.js`'s pre-existing, unrelated `SKIP-PENDING-BUILD`, not part of this
campaign.

## 4. The eight (nine) mutants — real sweep, expected vs. actual killing cell

Foregrounded, targeted indices only (`node tools/mutation-sweep.mjs <indices>`), never
backgrounded. Final consolidated sweep, clean baseline (777/778, 0 failing):

```
$ node tools/mutation-sweep.mjs 95 96 97 98 99 100 101 102 103
#95   caught (1 failing)  M1PARKRANGE-a   -> M1PARKRANGE                              [expected: M1PARKRANGE]
#96   caught (9 failing)  M1PARKRANGE-b   -> M1PARKRANGE + 8 cascading acceptance tests [expected: M1PARKRANGE]
#97   caught (9 failing)  M1PARKRANGE-c   -> M1PARKRANGE + 8 cascading acceptance tests [expected: M1PARKRANGE]
#98   benign alone        M1WRITERSET     -> (SOURCE_TEXT_GATE excluded from sweep, as declared)
#99   caught (2 failing)  M1NOWRITE       -> M1NOWRITE + M1NAVWINS                    [expected: M1NOWRITE]
#100  caught (2 failing)  M1NAVWINS       -> M1NAVWINS + M1NOWRITE (BOTH, as declared) [expected: BOTH]
#101  caught (1 failing)  MUTUNIQ-a       -> MUTUNIQ                                  [expected: MUTUNIQ]
#102  caught (1 failing)  MUTUNIQ-b       -> MUTUNIQ                                  [expected: MUTUNIQ]
#103  caught (1 failing)  M2ALIGN         -> M2ALIGN                                  [expected: M2ALIGN]

swept 9: 0 uncaught, 0 unapplied, 0 stale flags
```

Every mutant's actual killer(s) match its declared expected killing cell exactly (§7.1 of the
plan). #96/#97 additionally cascade through eight of M1PARKRANGE's own acceptance tests — expected
and benign: those tests derive their "post-fix" fixture from the live `#home.parked` rule via
`RAW()`, so mutating that rule's `overflow` declaration in place also trips their own internal
fixture-sanity assumptions (e.g., acceptance (1) asserts the post-fix variant still declares
`overflow: hidden`). This is not the misattribution the campaign's own defect shape warns against
— the DECLARED cell (M1PARKRANGE) is genuinely present in every case, confirmed independently
below (§5).

**Also confirmed:** M1PARKRANGE does **not** false-catch the unrelated
`browse-decouple BROWSEFIXED` mutant (`css/app.css`, index 87) — swept alone, the only killer is
`BROWSEFIXED`'s own test.

No `*.mutbak` present before or after any commit.

## 5. M1PARKRANGE's seven (eleven) acceptance tests

All eleven tests in `test/home-park-recipe.test.js` pass (the main cell + 9 acceptance tests +
COMMENTPROOF), covering the seven items §7.4 requires plus two the test author added:

1. Audit PASSES on the post-fix stylesheet — **pass**.
2. Re-adding `top: 0` FAILS, naming `top` — **pass**.
3. Adding `inset: 0` FAILS, naming `inset` (the case a denylist would pass) — **pass**.
4. Deleting the whole `#home.parked` block FAILS on guard (i) — **pass**.
5. Removing `overflow: hidden` FAILS as ABSENT, naming both grounds — **pass**.
6. Narrowing to `overflow-y: hidden` alone FAILS — **pass**.
7. Replacing `hidden` with `clip` FAILS with the WRONG-VALUE message, **textually distinct** from
   the ABSENT message — **pass** (confirmed distinct: the two messages are asserted
   `notStrictEqual` in the test itself).
8. Guard (ii) fires on a rule that stopped parking, distinguishable from Tier 0/guard (i) — **pass**.
9. Tier-2 `max-width` divergence FAILS, naming `scrollHeight` — **pass**.

Plus COMMENTPROOF (the mandated park comment, which necessarily contains the literal text
`top: 0` and `overflow: clip`, does not redden the cell — comments are stripped before parsing) —
**pass**.

## 6. The three-part park comment and the 161-165 reciprocal pointer

Both landed in commit `60f56e9`:

- **(a)** States INVARIANT P's three axes at the edit site, and states why `.browsepage.parked`
  (css:86) does not share it (in-flow, no `bottom` inset of its own to inherit).
- **(b)** States `overflow: hidden` is REQUIRED and why (cross-engine scroll-container status;
  Blink anchoring un-suppression), with a pointer to
  `Claude/Loki/STRIKE-home-shift-m1-derivation.md`.
- **(c)** States `overflow: clip` is NOT a substitute and why the `css/app.css:161-165` argument
  (now at the `.app { overflow-x: clip }` rule, shifted by the new comment's line count) does not
  transfer — that argument is correct for `.app`, inverted for `#home.parked`.

The reciprocal pointer at the `.app { overflow-x: clip }` comment states the argument is scoped to
`.app` and does not transfer to `#home.parked`, without weakening the original reasoning (the
original sentences about `.app` are unchanged).

## 7. A test-fixture defect found and fixed at the bench — flagged for Curie

Applying the real M1 fix exposed a defect in `test/home-park-recipe.test.js`'s own fixture
machinery, invisible until the fix actually landed: `postFix()` derived its "post-fix" baseline by
regex-stripping `top: 0` out of the **live** stylesheet, then ran it through `withParkBody`'s
generic "the transform must actually change the rule" sanity guard. Once `top: 0` is genuinely
gone from the shipped rule, that strip is correctly a no-op — but the borrowed guard cannot
distinguish "legitimately nothing left to strip" from "a broken transform," so it threw, breaking
8 of 11 tests in the file (independently confirmed via a scratch verification script, not
committed, that drove the unmodified, exported `auditParkRule()` directly against both a
git-historical pre-fix snapshot and the live post-fix stylesheet — all nine acceptance properties
plus COMMENTPROOF held correctly throughout; the defect was purely in the fixture helper, never in
the cell logic).

This blocked the pre-commit hook (which runs the whole suite and this project does not bypass).
Per this project's real operating rule for a failing hook — investigate and fix the underlying
issue, not skip it — `postFix()` was rewritten to derive the same canonical post-fix body without
routing through the strict shared guard, tolerant of the now-legitimate no-op case. **No assertion,
expected value, or coverage claim changed anywhere in the file** — every other call site of
`withParkBody` (which do need the "must actually change" guarantee) is untouched. This is flagged
here, in the commit message, and via a separate routed task for the test author's review, rather
than treated as ordinary build work: it is a boundary-adjacent action (Brunel does not normally
edit Curie's test files) taken because the two hard rules — never skip the hook, never silently
weaken a test — did not by themselves resolve a fixture bug that only a live-source-derived helper
could have hidden until the real fix shipped.

## 8. Full-suite result

```
# tests 778
# pass 777
# fail 0
# skipped 1   (pre-existing, unrelated: test/swipe-stage6i.test.js)
```

Pre-commit battery (both commits): `no-mutbak` ✓, `stamp` ✓, `lint` ✓, `typecheck` ✓, `tests` ✓,
`campaign-gates` ✓.

Build stamped `2026-07-29.268` (M2 commit) then `2026-07-29.269` (M1 commit), propagated to
`sw.js`, `js/debug.js`, `index.html` via `tools/stamp-build.mjs` both times.

## 9. What remains device-owed (both fixes ship in one commit set; one device pass, both engines)

- **M2 (top-case, both engines):** home↔books swipe (commit and abort) with `#home` at
  `scrollTop=0` — confirm the ghost/real vertical shift is gone. Repeat browse→X for the browse
  ghost (R-regress-browse).
- **M1 on iOS (WebKit) — the retention question (R-M1-retention):** does WebKit retain
  `#home.scrollTop` across the `overflow-y: auto` → `overflow: hidden` flip? Blink is executed as
  retains; WebKit is unmeasured. If WebKit discards, the loss is the full `scrollTop` at every
  depth and this fix does not close that channel on iOS — the response is a new decision, not a
  second deletion (executed-regressive).
- **M1 on the Android WebView APK — the mid-park mutation reveal (R-M1-anchor):** does a home
  content mutation landing mid-park still reveal without a jump? Bench Blink measures 0px for the
  adopted form; the in-app composition and the real WebView are unmeasured. Requires the counted
  repaint-witness protocol in plan §9 (an unwitnessed clean run must be discarded, not recorded).
- **M1 abort flash (R-M1-flash):** confirm the park-recipe change (box height only, `overflow`
  and `will-change` both unchanged) does not regress the abort flash — look for a cover re-decode
  at the bottom edge of home after an abort from a scrolled position, not a whole-view flash.
- **R-M1-cause (both readings, before/after, both engines):** read `#home.scrollTop` immediately
  before the park and immediately after the un-park, at mid-range and at the bottom of home's
  range, with and without the player, on both a long and a short library — with the counted
  no-intervening-re-render witness the plan specifies (this is M1's first in-app observation, not
  a confirmation).

None of the above is CI-observable (jsdom does no layout, no clamping, no scroll anchoring); all
are named device rows in plan §9, not gaps in this build.
