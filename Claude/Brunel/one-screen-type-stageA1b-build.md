# Brunel build log — Stage A1b of ONE SCREEN TYPE (Now Playing parks the page beneath it)

Plan of record: `Claude/Plans/PLAN-one-screen-type.md` §5.3, §6a (casualty table), §13 step 8.
Plan review of record: `Claude/Charpy/PLAN-one-screen-type-A1b-charpy-r3.md`, **FORGE**, `20c1663`.
Red suite: `Claude/Curie/RED-one-screen-type-a1b.md`, **RED_SUITE_READY**. Build date: 2026-07-31.
Build number: **2026-07-31.290**.

## The change — two deletions, and nothing else

`js/nav.js` `setView()` deleted both `if (!npOpen)` guards, at `:51` (the park/hide block) and
`:78` (the six-way settings-visibility loop). Both blocks now run unconditionally, so entering
Now Playing parks `#home`, hides `#browse` (firing `d.browseWillHide` on the shown→hidden edge)
and hides all six settings screens, exactly as entering any other screen does. `npOpen` the
variable, the `hidden` toggle on `#nowplaying` (`:81`) and the `np-locked` body toggle (`:82`) are
unchanged. No guard was added, no ordering was changed, no markup changed. This closes the
defect §5.3.1 derives: an aborted Now Playing gesture previously left whatever the mid-drag render
had un-parked/un-hidden permanently mounted beneath NP, and repeated aborts accumulated screens —
the mechanism behind the three-plus-screens-through-each-other render reported on device.

⛔ **Now Playing stays unique.** `.nowplaying`'s background, `inset: 0`, `z-index: 60` and coverage
of the topbar/transport are untouched — confirmed by diff (only two comment lines change in
`css/app.css`, no declaration touched) and by `NPUNTOUCHED`'s surviving source-scan cell, which
stays green throughout.

## Comments corrected — six sites, zero behaviour (plan §12 items 27, 28, 34, 35, 36, 37)

- `js/nav.js:48-51` (item 28) — the "Now Playing alone stays an additive overlay (S4)" sentence
  is false after A1b; rewritten to state NP is now a peer for parking/hiding purposes while
  keeping its own background/geometry/stacking.
- `js/nav.js:71-77` (item 27) — the seven-line exemption comment is deleted whole, per the plan's
  explicit instruction (its benefit belongs to the *other* guard and its own closing lines
  announced retirement at A1b).
- `js/nav.js` in `applyScreen` (item 34, was `:151`) — "the page underneath must stay exactly as
  it was" is false after A1b (the page underneath is now parked/hidden); rewritten to state only
  that there is no document scroll to reset.
- `js/app.js` in `bindPullRefresh` (item 35, was `:1343`) — "additive overlays (NP, Options) leave
  #home un-hidden underneath" is false; rewritten to state #home stays parked (mounted,
  off-screen) underneath every screen.
- `js/app.js` `showAppView` (item 36, was `:494-497`) — the sweep's justifying comment named "NP
  opened from Options → an NP→chapter-list swipe would show it through", a scenario A1b retires
  (opening NP from Options now hides `#options`). Rewritten to name the `overlayFilmstrip` window,
  which `PROBE-np-uniqueness.md` §9.1 and the plan's §5.3.5 execution-verified determination
  (**KEEP**) establish as the sweep's real live case. The exception clause ("But NOT the one
  that's the OUTGOING screen...") is preserved, not orphaned. The sweep's own line (`:498`) is
  untouched.
- `css/app.css:508-509` (item 37) — "NP is an ADDITIVE overlay ... so it needs its own background"
  is false; rewritten to the co-required-properties reason (`DecisionLog:1158-1161`): an opaque
  background, `inset: 0` and `z-index: 60` together cover the topbar and the transport. The
  `background: var(--page-bg)` declaration at `:510` is untouched.

## Tests — §6a's casualty table executed, plus one casualty the plan's table missed

- **`NPPARKS`** (3 cells, `test/one-screen-type-npparks.test.js`), **`NPRECONCILE`**
  (`test/one-screen-type-npreconcile.test.js`) and the relocated **`PEERFINALIZE` edge 3**
  (`test/one-screen-type-finalize.test.js:194`) — skips removed, all confirmed green. No
  assertion was weakened.
- **Mutant `#104` (`NPUNTOUCHED`) de-registered** — its anchor was the deleted `:78` guard; its
  intent (restore the settings exemption) no longer has a defect to model.
- **Mutant `#106` (`PEERPARK`/`PEERFINALIZE-a`) re-pointed** — the wrapper it anchored is gone, so
  it now guards the park toggle and the browse-hide toggle independently via a two-part (`also`)
  mutation, preserving its original intent (a settings screen skips park-and-hide).
- **`NPUNTOUCHED`'s two class-state cells retired** (`test/one-screen-type.test.js`, was `:196`
  hub and `:211` sub) — their subject (a settings screen staying un-hidden under NP) is exactly
  what A1b retires; their assertions are inverted and now live in `NPPARKS`. `NPUNTOUCHED`'s
  header comment is rewritten to state the narrowing; the source-scan cell (inset/z-index/
  background) is unchanged and is now the whole of what the cell guards, per the plan's
  determination.
- **A casualty the plan's §6a table did not enumerate**: `test/nav.test.js`'s "Now Playing leaves
  the settings overlays as they were" asserted the identical retired invariant in a third file the
  table never named. Reddened loudly on the first full-suite run after the deletion (exactly the
  "fails loudly" property §6a describes for its own enumerated casualties). Retired the same way
  as `NPUNTOUCHED`'s class-state cells, with a comment naming `NPPARKS` as where the subject now
  lives — this is the design the plan already ratified reaching a test site its own enumeration
  missed, not a new decision.
- **Three new mutants registered** — `NPPARKS-a`, `NPPARKS-a'`, `NPPARKS-b`, exactly as specified
  in `Claude/Curie/RED-one-screen-type-a1b.md` §4. Three rather than two because post-deletion the
  park/hide block has no enclosing brace to re-guard as a unit, so §14's single `NATURAL-a` splits
  across the block's two now-independent statements (`a`, `a'`); `b` guards the six-way loop.
- **Anchors re-pointed for the de-indent** (the block bodies moved from eight-space to six-space,
  or six-space to four-space, indentation once their enclosing `if (!npOpen) {` braces were
  deleted): `one-screen-type ONEPAGE` (its old anchor ended on the `:78` guard's own closing
  brace, which rotted unconditionally — flagged in advance by Curie's artifact), `one-screen-type
  PEERPARK/PEERFINALIZE-b`, `one-screen-type PEERPARK-c`, and — found only by running the anchor
  gate, not predicted by the plan or the RED artifact — **`browse-decouple PINGONE`** (`#92`), a
  pre-existing mutation from an earlier campaign anchored on the same `browseWillHide` block at
  its old eight-space indent. All four re-transcribed with text and intent unchanged, indentation
  only.
- **One further anchor rot, self-inflicted and self-corrected**: rewriting `css/app.css:508-509`'s
  comment (item 37) rotted mutant `one-screen-type NOSETTINGSBG-b`, which anchored a fragment of
  the retired comment text immediately above the `background: var(--page-bg)` declaration.
  Re-pointed to the new comment text; same declaration targeted, same intent.

```
node --test test/mutation-anchors.test.js
  every mutation anchor still matches the source it targets                         -> ok
  no mutation is a no-op                                                            -> ok
  no registered mutation anchor is non-unique without an explicit disambiguation     -> ok
  resolveAnchor refuses a non-unique anchor and accepts one that disambiguates       -> ok
```

## Mutation sweep — foreground, targeted, all nine touched/registered mutants

```
node tools/mutation-sweep.mjs 92 102 103 104 105 106 107 108 111
#92  caught (1 failing)  browse-decouple PINGONE            — killed by: PINGONE
#102 caught (6 failing)  PEERPARK/PEERFINALIZE-b            — killed by: nav.test.js deactivate-before-hide,
                                                                PEERFINALIZE edge 1/2/3, NPPARKS (Browse), PEERPARK
#103 caught (2 failing)  NOSETTINGSBG-b                      — killed by: NPUNTOUCHED source-scan, NOSETTINGSBG
#104 caught (2 failing)  ONEPAGE                             — killed by: "a sub-screen HIDES the Options hub", ONEPAGE
#105 caught (5 failing)  PEERPARK/PEERFINALIZE-a             — killed by: PEERFINALIZE (home, edge1, edge2), PEERPARK x2
#106 caught (1 failing)  NPPARKS-a                           — killed by: NPPARKS from Home            (declared killer, matched)
#107 caught (3 failing)  NPPARKS-a'                          — killed by: PEERFINALIZE edge 3 relocated, NPPARKS from Browse,
                                                                NPRECONCILE                              (declared killer, matched)
#108 caught (2 failing)  NPPARKS-b                           — killed by: nav.test.js (retired-cell replacement), NPPARKS
                                                                from a settings screen                   (declared killer, matched)
#111 caught (6 failing)  PEERPARK-c                          — killed by: nav.test.js deactivate-before-hide,
                                                                PEERFINALIZE edge 1/2/3, NPPARKS (Browse), PEERPARK
swept 9: 0 uncaught, 0 unapplied, 0 stale flags
```

`git status --porcelain` clean of `*.mutbak` before and after (a stray accidental full sweep from
an invalid `--help` invocation was caught mid-flight — one `.mutbak` present, no working-tree
corruption — stopped and restored via `node tools/mutate.mjs --restore` before this targeted sweep
ran; confirmed clean by diff against the intended edits before proceeding).

## Generated docs regenerated

`node tools/gen-swipe-model.mjs` — the two comment edits in `js/app.js` (items 35, 36) shifted
`docs/swipe-model.generated.txt`'s three pinned `navStack`-append line-number citations by a net
+2/+2/+3 (`:817/818/1398` → `:819/820/1401`). The four content-hash fingerprints are unchanged
(none of the edits touch a pinned region's content). `node tools/gen-transition-matrix.mjs`
produced no diff — it pins no line numbers into `js/nav.js` or `js/app.js`.

## Full battery and build number

```
node --test "test/*.test.js"        -> # tests 825 / pass 824 / fail 0 / skipped 1
node tools/hooks/run-checks.mjs     -> no-mutbak, stamp, lint, typecheck, tests, campaign-gates,
                                        stage-manifest, retired-name -> PASS
```
(The one skip is the pre-existing device-only `KEEPER` cell, unrelated to this build.) Build
bumped to **2026-07-31.290** in `build.json`, `index.html`, `js/debug.js` and `sw.js`, propagated
by `node tools/stamp-build.mjs` and confirmed in lockstep.

## What remains device-owed (plan §5.3.6, step 9)

Not one assertion in the new suite touches geometry, paint, stacking or occlusion — jsdom has none
of those, and a cell asserting them could not fail and would be a false witness. Device gate A1b
(plan §13 step 9) is the user's: open Now Playing from Home, from Books and from a settings
screen; close each by swipe and by back; abort an NP-back swipe and an NP→chapter-list swipe, then
swipe again — the three-plus-screens accumulation must be gone and no more than one screen may
ever be visible beside NP. Three honest questions carry forward unanswered by CI (plan §15 R-H):
whether closing NP back to Books re-decodes the covers, whether the restore flashes, and whether
repeated half-swipes back from NP make a long Books list slower or emptier the more times it is
repeated. The step-6f residual (the 125–340ms flick-release band, untested rather than proven
clean) is unchanged by this build.

## Handoff

- **Source artifact** — `Claude/Plans/PLAN-one-screen-type.md` §5.3 / §6a / §13 step 8.
- **Verdict** — `BUILD_GREEN`.
- **Next owner** — the user, for the step 9 device gate; the code reviewer, for step 10 (the
  `showAppView` sweep is settled — §5.3.5, determination KEEP — and must not be re-opened).
- **Records updated** — this file; `docs/swipe-model.generated.txt` (regenerated);
  `Claude/Plans/PLAN-one-screen-type.md`'s status header is Zelda's to reconcile against this
  handoff, along with `Claude/Zelda/Board.md` and the decision log.
