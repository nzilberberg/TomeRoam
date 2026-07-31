# POIROT — Stage A1 of ONE SCREEN TYPE (Options and its subs become peers)

Type: code-review
Prior-review: POIROT-browse-decouple.md
Target: immutable commit `c4cfd7e` ("Stage A1 of one screen type: Options and its subs become peers", build `2026-07-30.280`), plus `90fc617` (the build log). Shipped, CI green, device-confirmed by the user ("Options screens seem to work as one would expect").
Range: 59fa9ee..90fc617
Plan of record: `Claude/Plans/PLAN-one-screen-type.md` (PLAN_READY, TEMPER folded — `Claude/Charpy/PLAN-one-screen-type-charpy.md`). RED suite: `Claude/Curie/RED-one-screen-type.md` + `test/one-screen-type.test.js` + `test/one-screen-type-finalize.test.js`. Build log: `Claude/Brunel/one-screen-type-stageA1-build.md`.

`Verdict: **FIX-THEN-SHIP**` — the product change is correct, complete against the stage spec, and its §8 hard constraint holds and is doubly gated. But the transparency A1 introduces makes a pre-existing mid-gesture residue *visible*, and one A1-specific consequence is a reachable defect I reproduced by execution: when `overlayFilmstrip`'s uncancelled reconcile fires during an active drag, the narrowed guard now `display:none`s **the incoming mover** for the remainder of the gesture. That is new at A1 — proven by running the same probe under mutant `#106`, which restores the pre-A1 guard and does not exhibit it. Two comment sites also assert an exclusivity universal that the plan explicitly warned against writing, and that I falsified by execution.

---

## The scene, and what it intends

Three edits and four comment scrubs. `js/nav.js` `setView`'s park-and-hide guard narrows from `if (!npOpen && !optOpen && !subOpen)` to `if (!npOpen)`, so entering a settings screen parks `#home`, hides `#browse` and fires `d.browseWillHide()` on the shown→hidden edge exactly as entering Browse does. The two-line settings visibility block — the `$('options').classList.toggle('hidden', !(optOpen || subOpen))` line that deliberately kept the hub mounted under its own sub-screen, plus the separate sub loop — collapses to one six-way loop. `css/app.css` loses `background: var(--page-bg)` from `#options` and from the five-sub group. Intent matches the plan; scope matches the description; no file outside the plan's declared ranges is touched except the four mandatory build stamps.

## The §8 hard constraint — HOLDS, and cannot be split later

`c4cfd7e` contains **both** halves: the two `background: var(--page-bg)` deletions (`css/app.css` `#options`, and the `#downloads, #general, #playback, #buffering, #diagnostics` group) **and** the visibility-block collapse (`js/nav.js:74`). Verified from `git show c4cfd7e -- js/nav.js css/app.css`, not from the log.

The constraint's live direction — backgrounds gone while the hub can still sit under its sub, which is exactly what `6c9e7e3` shipped and `2700b5c` reverted — is now **structurally** blocked, in two independent places:

- **`ONEPAGE`** (`test/one-screen-type.test.js:108`) reads nothing whatever about backgrounds, so restoring the hub-stays-mounted rule reddens it regardless of the CSS. Executed: mutant `#105` restores commit `6c9e7e3`'s exact shape and is caught by `ONEPAGE` *and* by the inverted `nav.test.js` cell.
- **`NOSETTINGSBG`** (`test/page-bg-single-painter.test.js`) fails in both directions on the CSS half. Executed: `#107` (`#options` regains a background) and `#108` (the sub group does) each redden both of its cells.

So a partial revert of either half reddens at pre-commit. The coupling is additionally stated in source, at both CSS sites, as the *reason* for the deletion ("so it needs no background of its own"), which is the right place for it — though the wording of that statement is finding **F2** below. I find nothing that makes it possible to reintroduce one without the other.

## The exclusivity claim — the LOOP is genuinely exclusive; the JUSTIFYING PROSE overreaches

The mechanism first. `for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);` is one operation over all six elements, `showPage`-shaped: there is no separate hide step that another call could skip or interleave. It sits in a second `if (!npOpen)` block, but that guard is the *literally identical expression* to the park block's, evaluated on an `npOpen` that nothing between lines 47 and 73 mutates — so the two blocks cannot diverge and the loop is not separable from the park. `optOpen`/`subOpen` have no remaining reader and are gone. Executed: `#105` is the mutant that would break it, and it is caught.

Charpy's point stands, and the build is uneven about it. The plan (§5.1) was careful — "At rest, exactly one of the six is un-hidden… a universal claim would be stronger than the mechanism delivers — and a guarantee the code does not make is exactly what a later refactor deletes something on the strength of." `ONEPAGE`'s own comment block is careful, and so is the commit message ("**the loop** … can never leave two settings screens un-hidden"). But three prose sites in the shipped artifacts state the universal anyway — see **F2**. I falsified it by execution (probe 2 below): a reachable drag leaves `#options` and `#general` both un-hidden and `#home` un-parked across multiple frames.

## `showAppView`'s stale-settings sweep — **LIVE**, proven by execution, and A1b cannot kill it

§5.3.5 routes this to me with an explicit warning against asserting deadness from a reading, so I did not read it — I ran it.

`js/app.js:483` is `for (const s of ['options', ...SETTINGS_SUBS]) if (!d || d.from.v !== s) $(s).classList.add('hidden');`.

**The live case is `overlayFilmstrip`, not Now Playing.** `closeSub` (`js/app.js:171-178`) pops the nav stack **first**, so `currentDesc()` is already `'options'` when it calls `overlayFilmstrip(fromV, 'options', 'back')`, which then un-hides **both** panes (`js/nav.js:170`). A left-edge back-swipe started inside that window resolves `dest = navStack[-2]`; when that is a browse descriptor the transition takes `destinationHost === 'browse-host'`, which calls `showAppView(dest, true)` — and the sweep hides the lingering sub, which `d.from.v !== s` correctly spares only for the outgoing screen.

Executed (probe 1, `scratchpad/probe-showappview.test.js`, passing): the filmstrip window really does leave `['general','options']` un-hidden with `currentDesc()==='options'`; mid-drag `#browse` is un-hidden (so `showAppView` ran) and `#general` **is now hidden**. Nothing else adds `hidden` to a settings element in that window — `setView` is not called mid-drag and `renderDestination` only ever *removes* `hidden` — so only line 483 can have done it.

**Why A1b cannot make this dead.** The probe scenario never opens Now Playing. A1b's entire product change is the deletion of two `if (!npOpen)` guards; when `npOpen` is false those guards are already taken, so on a path where NP is never opened A1b is a provable no-op. The sweep therefore stays live after A1b. **Determination: keep it.** The §4 note that "its one live case is the NP one" is what is wrong — the live case is the filmstrip window, and it always was.

*(Honest limit on the probe: `test/app-harness.js` stubs `OptionsScreen` (`init: noop`), so the real `.hubrow[data-sub]` wiring is absent and the probe calls the real `Nav.overlayFilmstrip` with the exact arguments `js/app.js:177` passes, in the exact post-pop stack state `closeSub` leaves. `overlayFilmstrip`, `setView`, the swipe listeners and `showAppView` are all shipped code.)*

## F1 — the mid-drag reconcile now hides the incoming mover (the one real defect)

`js/nav.js:102` carries an absolute claim: *"Safe because applyScreen is NEVER called during an active drag."* It is false, and A1 changes what the falsity costs.

`overlayFilmstrip` schedules its reconcile twice — `toEl.addEventListener('transitionend', finish, {once:true})` and `setTimeout(finish, 340)` (`js/nav.js:182-183`) — and **neither is cancelled when a gesture arms**. `finish` → `reconcile` → `applyScreen(currentDesc(), {render:false})`, whose first act is `resetSwipeStyles` and whose second is `setView`.

Executed (probe 3, `scratchpad/probe-filmstrip-reconcile.test.js`), finger still down throughout:

```
BEFORE net: {"optionsTransform":"translateX(258px)","homeParked":true,"browseHidden":false}
AFTER  net: {"optionsTransform":"",               "homeParked":true,"browseHidden":true }
AFTER  move:{"optionsTransform":"translateX(338px)","homeParked":true,"browseHidden":true }
```

Two things happen. The outgoing mover's transform is wiped (it snaps to 0 for a frame, then the next `move` re-applies it) — **pre-existing**, the same before A1. And `#browse`, **the incoming mover the user is dragging toward**, is given `display:none` and stays hidden for the rest of the gesture, because only a `move` re-applies transforms and nothing re-un-hides it. The user drags and the destination never appears; it snaps in at commit.

**This half is A1's.** Proven, not argued: I re-ran the identical probe with registered mutant `#106` applied (it restores the settings exemption in the park guard — the pre-A1 condition) and `browseHidden` stayed `false` at every step. Before A1, `setView('options')` did not touch `#browse`; after A1 it hides it. Tree restored and verified clean (`git status --porcelain` empty, no `*.mutbak`).

Root vs surface: the **root** is `overlayFilmstrip`'s uncancelled `finish` plus the false invariant comment, both pre-existing; **A1 is the change that turns a one-frame transform glitch into a destination that is invisible for the remainder of the drag.** The window is 0–340ms after a hub↔sub back/forward tap (sooner in a real browser, where `transitionend` fires at ~240ms), i.e. tap Back on a sub-screen and immediately edge-swipe. Reachable by an ordinary impatient user.

Same root, worth one line: the `{once:true}` `transitionend` listener is never removed when the 340ms net wins, so it retains its closure until the element next transitions. Pre-existing; noted, not charged to this build.

## F2 — the exclusivity universal is written into three shipped prose sites

The plan's §5.1 forbids exactly this wording. Falsified by probe 2 (`scratchpad/probe-filmstrip-residue.test.js`, passing), which drives a home-destination swipe inside the filmstrip window — `renderDestination`'s `'home'` branch (`js/app.js:532`) only un-parks `#home` and never calls `showAppView`, so the sweep that repaired probe 1 does not run. Mid-drag, across multiple frames: `#home` un-parked (painted), `#options` **and** `#general` both un-hidden — three screens live, all of them transparent since A1. It self-heals at finalize, so this is a mid-gesture-only state.

The three sites, all of which read as unconditional current truth:

- `css/app.css` `#options` header — "when it is shown, **every other screen is parked or hidden**, so it needs no background of its own".
- `css/app.css` sub-group header — "when one is shown, **every other screen is parked or hidden**, so none needs a background of its own".
- `test/page-bg-single-painter.test.js:4-11` — line 5 correctly says "never co-visible with a sibling **at rest**", then line 7 says "so **nothing live is ever** behind it"; the same universal is repeated in the assertion message at `:64-66`.

These are the *justification for deleting the backgrounds*, which is what makes the overreach matter rather than being pedantry: a future reader checking whether a background is still unnecessary reads a guarantee the code does not make. The fix is the plan's own wording — scope each to *at rest*, and name the filmstrip/gesture window as the deliberate exception.

## F3 — Stage A1b will land red on two mutant anchors and two NPUNTOUCHED cells the plan does not list

The mutant durability call. `#104`'s re-anchor is correct and unique **today** — `from: "    if (!npOpen) {\n      for (const s of ['options', ...SETTINGS_SUBS])"` disambiguates the second occurrence, and `test/mutation-anchors.test.js` passes 4/4. But A1b (§12 items 25-26) **deletes both `if (!npOpen)` guards**, so:

- `#104` (`NPUNTOUCHED`) loses its anchor → `ANCHOR NOT FOUND`. Its *cell* also retires: `NPUNTOUCHED`'s first two unit tests assert `hidden('options') === false` after applying `nowplaying`, which A1b makes false by design. Intent dead → de-register.
- `#106` (`PEERPARK/PEERFINALIZE-a`) anchors `"    if (!npOpen) {\n      $('home').classList.toggle('parked', v !== 'home');"` → also gone. Its intent (restore the settings exemption) stays valid → re-point, do not delete.

The plan asserts the opposite: §6 item 5 says "a sweep of all 102 registered mutants confirms this is the only one", and §13 step 8 says A1b changes "**Nothing else**". That sweep predates A1b's existence and is now false. This is a *scheduled, loudly gated* rot rather than a silent one — the anchors gate and the two red cells both fire at the A1b commit — so it costs the next builder a stop, not a defect. Recorded here so that stop is expected.

## F4 — the retained comment (nav.js:71-72) is correct today and known-inaccurate as of yesterday

Item 12's invariant was honoured: lines 78-81 (the gone hub-under-sub mechanism) are deleted and 76-77 are kept verbatim, so the retained `if (!npOpen)` guard carries its stated reason. Correct at build time, and its A1b deletion is already scheduled and explicitly reconciled in the plan (§12's closing note supersedes item 12).

What has changed since: the plan's own §5.3.2, added 2026-07-31, traced all six NP-close paths and found that the benefit the comment states — "so whichever one was underneath stays for the NP-back reveal" — **is supplied by `renderDestination`/`applyScreen` on every one of them**, so the exemption is not load-bearing for it. HEAD therefore now carries a comment stating a benefit the plan of record has determined is not the real one, against §6.6 (HEAD holds only current truth). Not stale in the sense of describing gone machinery; inaccurate in what it claims that machinery buys. One clause, deleted at A1b anyway — mark it or correct it rather than leave it to rot.

## F5 — the "additive overlay" scrub routing is correct and complete for the term

Confirmed by grep over HEAD (excluding `.claude/worktrees/**` and `android/build/**`, which are stale copies, and `js/plex.js:693`, an unrelated use of "additively"). Exactly the three sites Brunel flagged remain: `js/app.js:1327`, `css/app.css:156`, `css/app.css:691-695`. I read each and confirm all three are **inaccurate, not load-bearing**:

- `js/app.js:1327` — "additive overlays (NP, Options) leave `#home` un-hidden underneath" justifies a pull-to-refresh guard that keys on `currentDesc()` and on `#home.parked`, both of which are correct after A1. Comment wrong, code right.
- `css/app.css:156` — "below every additive overlay" is a naming staleness; the z-order fact (20 < 25/26) still holds.
- `css/app.css:691-695` — "Options paints OVER the still-visible browse view" is now false at rest (A1 hides `#browse`), but the declaration it justifies (`z-index: 24`) is unaffected today.

Routing to step 13's HEAD-wide scrub is correct. One caveat for Stage A2, which deletes `z-index: 25/26`: §5.2 dismisses `.alphaindex` (z24) as "a `.browsepage` child … hidden with `#browse`", which is true at rest but **not** during a browse↔settings gesture, where `#browse` is an un-hidden mover. The conclusion still holds there, but for a different reason than the one §5.2 gives — as a mover `#browse` carries an inline `transform`, which establishes a stacking context and contains `.alphaindex` inside it. That is the argument A2 should rest on; the stated one does not cover the gesture window.

## What the suite cannot see

jsdom has no layout, paint, compositing or stacking. Read in full, every cell of the changed suite asserts source text, class state, a call count or a call ordering — I found **no device overclaim**, and both new test files say so in their own headers. Specifically, a reader must not conclude any of these are verified:

- **That a settings screen occludes what is behind it.** Nothing paints in CI. `NOSETTINGSBG` proves a *textual* property of `css/app.css` and says so.
- **That the reported two-screens-through-each-other render is gone.** CI proves the *mechanism* (exactly one of six un-hidden at rest). The user's device pass is the only evidence for the outcome, and it is the right evidence.
- **That nothing shows through during a gesture.** Probes 2 and 3 show the class state that would be painted; whether it *looks* wrong is device-owed. Unlike the plan's synchronous-window arguments, a live drag spans many frames by construction, so these states are painted rather than skipped.
- **R-B (cover re-decode on browse→settings), R-E (the home↔settings park/un-park flash), R-G (the two-transparent-pane filmstrip)** — all correctly device-owed and unclaimed.

## Findings

| # | Severity | Where | Finding | Fix |
|---|---|---|---|---|
| F1 | Significant | `js/nav.js:102` invariant + `js/nav.js:182-183`; consequence via the narrowed guard at `:51` | `overlayFilmstrip`'s `transitionend`/340ms reconcile is not cancelled when a gesture arms, so `applyScreen` **does** run during an active drag, contradicting the absolute claim at `:102`. A1 makes that reconcile `display:none` **the incoming mover** (`#browse`) for the remainder of the drag. Executed both ways: shipped code flips `browseHidden` false→true mid-drag; the same probe under mutant `#106` (pre-A1 guard) does not. | Cancel the pending `finish` when a gesture arms, or make `reconcile` a no-op while a drag session is live. Then correct or delete `:102`'s claim. |
| F2 | Minor | `css/app.css` `#options` header; `css/app.css` sub-group header; `test/page-bg-single-painter.test.js:4-11` and `:64-66` | The background-deletion justification is written as a universal ("every other screen is parked or hidden", "nothing live is ever behind it"). Falsified by execution: a drag started inside the filmstrip window leaves two settings screens un-hidden and `#home` un-parked across multiple frames. The plan (§5.1) explicitly forbids this wording; the commit message and `ONEPAGE` got it right. | Scope all three to *at rest*, naming the filmstrip/gesture window as the deliberate exception, as §5.1 words it. |
| F3 | Minor | `tools/mutate.mjs` `#104`, `#106`; `test/one-screen-type.test.js` `NPUNTOUCHED` | Both mutants anchor text Stage A1b deletes, and `NPUNTOUCHED`'s two unit cells assert what A1b inverts. The plan claims the anchor migration is complete (§6 item 5) and that A1b changes "nothing else" (§13 step 8). Loudly gated, not silent. | In the A1b commit: de-register `#104` and retire/invert its two cells; re-point `#106`. Correct §6 item 5 and §13 step 8. |
| F4 | Minor | `js/nav.js:71-72` | The kept comment states a benefit ("stays for the NP-back reveal") that the plan's own §5.3.2 has since shown every close path supplies without the exemption. Correct when written; inaccurate in HEAD now. | Mark it superseded or correct the clause; it is deleted at A1b regardless. |
| O1 | Observation | `PLAN-one-screen-type.md` §5.2 | A2's `.alphaindex` argument ("hidden with `#browse`") does not cover the browse↔settings gesture window, where `#browse` is an un-hidden mover. The conclusion holds, via transform-induced stacking-context containment — a different mechanism. | State the real reason before A2's gate is read. |
| O2 | Observation | `js/nav.js:51` and `:73` | Two adjacent blocks now carry the identical guard, separated only by a comment. Harmless (they cannot diverge), and it is what forced `#104`'s re-anchor. A1b deletes both. | None. Recorded so the collision is not re-discovered. |

## Coverage Ledger

`✓` = cleared by EXECUTED evidence run THIS pass (commands under "Executed evidence"); `~` = cleared by reading/reasoning only; `n/a`.

| Row (changed file / symbol) | Correctness / data-flow | Absolute-claim & comment verification | Deferred-resource / cancellation | Mutation-verified | Forward-fragility (A1b / A2) | Device-overclaim | Suite / gates |
|---|---|---|---|---|---|---|---|
| `js/nav.js` — `setView` park-and-hide guard narrowed to `if (!npOpen)` | ✓ (PEERPARK, PEERFINALIZE ×4) | **F1** (`:102` "NEVER during an active drag" — falsified) | **F1** (uncancelled `finish` reaches this guard) | ✓ (#106, #109 caught) | **F3** (#106 anchor dies at A1b) | ✓ (class state only) | ✓ |
| `js/nav.js` — six-way settings visibility loop | ✓ (ONEPAGE; one operation, no skippable step) | **F2** (universal in the justifying prose) | n/a | ✓ (#105 caught) | **F3** (#104 anchor + NPUNTOUCHED cells) | ✓ | ✓ |
| `js/nav.js` — `optOpen`/`subOpen` deleted | ✓ (no remaining reader; grep clean) | ~ | n/a | ✓ (#105/#106 exercise both) | ~ (nothing re-introduces them) | n/a | ✓ |
| `js/nav.js` — comments `:48-50` new, `:71-72` kept, `applyScreen` settings branch | ~ (accurate at A1) | **F4** (`:71-72` benefit superseded by §5.3.2) | n/a | n/a | **F4/O2** (both deleted at A1b) | n/a | ✓ |
| `css/app.css` — `#options` rule: `background` deleted, header rewritten | ✓ (NOSETTINGSBG both cells) | **F2** (header universal) | n/a | ✓ (#107 caught) | O1 (A2 z-index + `.alphaindex`) | ✓ (textual only; occlusion device-owed) | ✓ |
| `css/app.css` — five-sub group: `background` deleted, header rewritten | ✓ (NOSETTINGSBG both cells) | **F2** (header universal) | n/a | ✓ (#108 caught) | O1 | ✓ | ✓ |
| `test/nav.test.js:36-44` — assertion inverted | ✓ (subject preserved, answer inverted; siblings still true) | ~ (rationale rewritten correctly) | n/a | ✓ (#105 kills it) | ~ | ✓ | ✓ |
| `test/page-bg-single-painter.test.js` — rewritten to §16.1 | ✓ (painter set + per-selector, fails both ways) | **F2** (`:4-11`, `:64-66`) | n/a | ✓ (#103, #107, #108) | ~ | ✓ (honest limit stated in-file) | ✓ |
| `test/page-bg-js-painter.test.js:4` — wording scrubbed | ✓ (now names `.nowplaying` alone) | ✓ (accurate) | n/a | n/a | ~ (A1b makes "additive overlay" wrong for NP too) | ✓ | ✓ |
| `test/one-screen-type.test.js` — ONEPAGE / PEERPARK ×2 / NPUNTOUCHED ×3 unskipped | ✓ (read in full; each genuine and fail-able) | ✓ (ONEPAGE's own scoping comment is correct) | n/a | ✓ (#104, #105, #106, #109) | **F3** (NPUNTOUCHED ×2 invert at A1b) | ✓ (explicit scope header) | ✓ |
| `test/one-screen-type-finalize.test.js` — PEERFINALIZE ×4 unskipped | ✓ (all three `browseWillHide` edges + the park half, over real touch listeners) | ✓ | ✓ (fake timers advanced; no leaked handle) | ✓ (#102, #106, #109) | ~ (edge 3 relocates at A1b, §5.3.4 — planned) | ✓ (class/count/ordering only) | ✓ |
| `tools/mutate.mjs` — `#104` re-anchored + six registered | ✓ (anchors unique; each `to` a real defect) | ✓ (the re-anchor note is accurate) | n/a | ✓ (8/8 caught, 0 unapplied, 0 stale) | **F3** | n/a | ✓ (anchors 4/4) |
| `build.json` / `index.html` / `js/debug.js` / `sw.js` — stamps `.280` | ✓ (uniform `2026-07-30.280`, all four match) | n/a | n/a | n/a | n/a | n/a | ✓ (suite's stamp lockstep green) |
| `Claude/Brunel/one-screen-type-stageA1-build.md` — the build log | ✓ (every claim I checked reproduces; killer table exact) | ✓ (device-owed section claims nothing) | n/a | ✓ (sweep re-run independently) | ~ | ✓ | ✓ |

No empty cells.

## Executed evidence (backs every `✓`)

```
node --test "test/*.test.js"                    -> # tests 794 / pass 793 / fail 0 / skipped 1
node tools/mutation-sweep.mjs 102 103 104 105 106 107 108 109
                                                -> all 8 caught; "swept 8: 0 uncaught, 0 unapplied, 0 stale flags"
                                                   (#102 hide-before-capture, #103 .nowplaying loses bg, #104 NPUNTOUCHED,
                                                    #105 ONEPAGE hub-stays-mounted, #106 park exemption restored,
                                                    #107 #options regains bg, #108 sub group regains bg, #109 browseWillHide deleted)
node --test test/mutation-anchors.test.js        -> 4/4 (every anchor matches source; unique)
node --test scratchpad/probe-showappview.test.js -> PASS: filmstrip window leaves ['general','options'] un-hidden;
                                                    mid-drag #browse un-hidden (showAppView ran) and #general hidden (THE SWEEP IS LIVE)
node --test scratchpad/probe-filmstrip-residue.test.js
                                                -> PASS: home-destination drag leaves #home un-parked AND both
                                                   #options and #general un-hidden across multiple frames; heals at finalize
node --test scratchpad/probe-filmstrip-reconcile.test.js
                                                -> browseHidden false -> TRUE at the 340ms net, finger still down; transform wiped
node tools/mutate.mjs 106 ; <same probe> ; node tools/mutate.mjs --restore
                                                -> under the PRE-A1 guard browseHidden stays FALSE at every step
                                                   => F1's incoming-mover hide is NEW AT A1
git status --porcelain                           -> empty, before and after; no *.mutbak
git show c4cfd7e -- js/nav.js css/app.css tools/mutate.mjs test/nav.test.js test/page-bg-js-painter.test.js
git diff --name-only 59fa9ee..90fc617            -> 13 files, each carried as a ledger row
grep -rn "additive" --include=*.js --include=*.css --include=*.html --include=*.mjs .
                                                -> exactly the 3 flagged HEAD sites remain (worktrees/android build = stale copies)
```

Read in full this pass: `js/nav.js`, `js/app.js` 138-185 / 425-555 / 1318-1335, `css/app.css` 148-232 / 686-792, `test/one-screen-type.test.js`, `test/one-screen-type-finalize.test.js`, `test/page-bg-single-painter.test.js`, the `nav.test.js` and `page-bg-js-painter.test.js` diffs, `tools/mutate.mjs` 907-958, `PLAN-one-screen-type.md` (all 1199 lines), `Claude/Brunel/one-screen-type-stageA1-build.md`, `POIROT-browse-decouple.md`.

The three probes are disposable and live in the session scratchpad, outside the repo. None is proposed as a repo test here; **F1**'s repro is a specification for one if the finding is taken.

## Prediction

F1 is where this runs. The window is one impatient thumb — tap `‹ Back` on a settings sub-screen and edge-swipe before the ~240ms filmstrip finishes — and what the user sees is a drag with nothing arriving, then the destination snapping in at release. It will read as "the swipe is flaky again", which is the *hardest* symptom to route, because it will be blamed on the swipe machinery rather than on a screen-visibility guard that a navigation animation fires into. And it will get worse before it gets better: A1b makes `setView('nowplaying')` park and hide as well, so the same uncancelled reconcile will then reach NP transitions too, on the app's most frequent round trip. The cheap structural fix is not to argue about the window — it is to make `reconcile` refuse to run while a gesture session is live, which is one condition and retires the false `:102` invariant at the same time.

F2 is the pattern that spreads if left. The plan wrote the careful sentence and the code wrote the confident one, and the confident one is the register that steers the next reviewer's eye past it — which is exactly how a background gets deleted somewhere it *was* load-bearing. This project has already reverted one commit over that question.

## Watch-list

Carried from `POIROT-browse-decouple.md` (all still open; this build touches none of them):

- **[W1] [W4] [W7] [W11] [W13] [W16] [W18] open** — apply-on-approval records for stages 6b/6c/6d/6e/6f/6g/6h un-applied in HEAD. Owner Zelda.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device.
- **[W5] open** — Loki r2 lesser-planes (`recovery-overlay-visibility-unpinned`→Mendeleev; `paneless-predicate-phase-coupling`→Brunel).
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat.
- **[W8] open** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda.
- **[W9] open** — Loki 6e residual 2: unguarded `.nav-ghost === owned-pane(live session)` invariant.
- **[W10] open** — `disposeOwnedPanes`/`dropPanes` byte-identical removers; collapse on F-pane unification.
- **[W12] open** — 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Owner Mendeleev.
- **[W14] open** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device.
- **[W21] open** — a fresh Loki strike against the BUILT 6i code remains the plan's next gate. Owner Loki.
- **[W22] [W23] [W24] [W25] open** — 6i `#home` device gates R1(a)-(e). Owner on-device.
- **[W26] open** — 6i apply-on-approval records (plan §13 amendments/annotations). Owner Zelda.
- **[W28-residual] open** — pre-existing `(ghost/snapshot)` taxonomic comments (app.js:227,250,378 + subsystem doc) over-listing the now-single pane-owning kind. Owner Zelda/Brunel. Non-blocking.
- **[W29] open** — `plan.incoming` single-valued/production-unread. Owner Vitruvius. Non-blocking.
- **[W30] [W31] [W32] [W33] open** — browse-decouple device gates R-flash / R-navbar / R-strip / R-browse2browse. Owner on-device.
- **[W34] open** — no `DecisionLog.md` NEW-POLICY entry for `PL-swipe-browse-fixed-ownscroll`. Owner Zelda. Non-blocking.
- **[W35] open** — build-log "Files changed" lists omit the four build-stamp files. Owner Brunel/Zelda. Non-blocking. **Recurs in this build's log** (`Claude/Brunel/one-screen-type-stageA1-build.md` names no stamp file), so the pattern is now twice-observed rather than one-off.
- **[W36] noted** — Flash C (browse→browse in-list divider re-raster) is out of scope; not a regression of any build here.

New this build:

- **[W37] open (NEW)** — **F1.** `overlayFilmstrip`'s `transitionend`/340ms reconcile is uncancelled, so `applyScreen` runs during an active drag and A1's narrowed guard hides the incoming mover for the rest of the gesture. Executed both ways (shipped vs mutant `#106`). `js/nav.js:102`'s absolute claim is false. Owner Brunel, via the apply-review of this casebook. **Worsens at A1b** (the same reconcile then reaches NP transitions).
- **[W38] open (NEW)** — **F2.** Three shipped prose sites state the exclusivity universal the plan's §5.1 forbids (`css/app.css` ×2, `test/page-bg-single-painter.test.js` ×2 places). Falsified by probe 2. Owner Brunel.
- **[W39] open (NEW)** — **F3.** Mutants `#104`/`#106` anchor text A1b deletes, and `NPUNTOUCHED`'s two unit cells invert at A1b; plan §6 item 5 and §13 step 8 both say otherwise. Mechanically gated. Owner Vitruvius (plan) + the A1b builder.
- **[W40] open (NEW)** — **F4.** `js/nav.js:71-72`'s retained comment states an NP-back-reveal benefit that the plan's §5.3.2 has since shown is supplied without the exemption. Deleted at A1b regardless. Owner Brunel/Zelda.
- **[W41] open (NEW)** — **`showAppView`'s sweep (`js/app.js:483`) is LIVE and must be KEPT** — determination filed here with an executed probe. Its live case is the `overlayFilmstrip` window, **not** the NP path §4 names, and A1b cannot make it dead (the path never involves `npOpen`). §4's "its live case is the NP one" and §5.3.5's framing both need correcting. Owner Vitruvius/Zelda. **This closes step 10's `showAppView` adjudication ahead of time; it should not be re-opened as an open question at the A1b review.**
- **[W42] open (NEW)** — **O1.** Plan §5.2's `.alphaindex` argument for A2 does not cover the browse↔settings gesture window; the conclusion holds by transform-induced stacking-context containment instead. Owner Vitruvius, before A2's device gate is read.
- **[W43] open (NEW)** — device-owed and NOT claimed by any cell here: R-B (cover re-decode on browse→settings), R-C (6f overlay-background residue), R-E (home↔settings park/un-park flash), R-G (two-transparent-pane filmstrip). Step 4's device pass answered the reported defect; these four were not separately reported on. Owner on-device.
- **[W44] noted** — `js/app.js:2642`, `:3144`, `:3237` refresh handlers call `applyScreen` and exclude `'options'` but **not** the five sub-screens. Pre-existing, out of this stage's scope, not a defect I can demonstrate; recorded because F1 makes the class (an async `applyScreen` landing in an unexpected state) worth a look. Owner Brunel, non-blocking.

---

Verdict: **FIX-THEN-SHIP**

{"persona":"poirot","stage":"one-screen-type-A1","verdict":"FIX_THEN_SHIP","prior_verdict":null,"target":"c4cfd7e","range":"59fa9ee..90fc617","findings":[{"id":"F1","severity":"significant","where":"js/nav.js:102 invariant + :182-183 uncancelled reconcile; consequence via narrowed guard :51","what":"overlayFilmstrip's transitionend/340ms finish is not cancelled when a gesture arms, so applyScreen DOES run during an active drag (contradicting :102's absolute claim); A1 makes that reconcile display:none the INCOMING mover #browse for the rest of the drag. Executed: shipped flips browseHidden false->true mid-drag; same probe under mutant #106 (pre-A1 guard) does not","blocking":false},{"id":"F2","severity":"minor","where":"css/app.css #options header, css/app.css sub-group header, test/page-bg-single-painter.test.js:4-11 and :64-66","what":"background-deletion justification written as a universal ('every other screen is parked or hidden'); falsified by execution — a drag inside the filmstrip window leaves two settings screens un-hidden and #home un-parked across frames. Plan 5.1 explicitly forbids this wording","blocking":false},{"id":"F3","severity":"minor","where":"tools/mutate.mjs #104/#106; test/one-screen-type.test.js NPUNTOUCHED","what":"both mutants anchor text A1b deletes and NPUNTOUCHED's two unit cells invert at A1b, while plan 6-item-5 and 13-step-8 claim the migration is complete and nothing else changes. Loudly gated, not silent","blocking":false},{"id":"F4","severity":"minor","where":"js/nav.js:71-72","what":"retained comment states an NP-back-reveal benefit that plan 5.3.2 has since shown every close path supplies without the exemption; inaccurate in HEAD now, deleted at A1b anyway","blocking":false},{"id":"O1","severity":"observation","where":"PLAN-one-screen-type.md 5.2","what":"A2's .alphaindex argument does not cover the browse<->settings gesture window where #browse is an un-hidden mover; conclusion holds via transform stacking-context containment instead","blocking":false},{"id":"O2","severity":"observation","where":"js/nav.js:51 and :73","what":"two adjacent blocks now carry the identical guard; harmless, and it is what forced #104's re-anchor","blocking":false}],"section8_constraint":"HOLDS — c4cfd7e contains BOTH the two background deletions and the visibility-block collapse; the dangerous direction (backgrounds gone, hub still mounted under its sub = 6c9e7e3's shape) is structurally blocked by ONEPAGE (background-blind) and by the inverted nav.test.js cell, executed via mutant #105; the CSS half is independently gated by NOSETTINGSBG via #107/#108. Coupling is also stated in source at both CSS sites as the reason for the deletion. Nothing found that permits reintroducing one without the other","exclusivity_call":"the LOOP is genuinely exclusive — one operation over all six elements, no separate skippable hide step, and its guard is the literally identical expression to the park block's on an unmutated npOpen, so the two cannot diverge (#105 caught). The build's JUSTIFYING PROSE overreaches: three shipped sites state the universal the plan 5.1 forbids, falsified by executed probe 2. Commit message and ONEPAGE's own comment are correctly scoped","showappview_determination":"LIVE — KEEP. Proven by execution, not reading: closeSub pops the stack BEFORE overlayFilmstrip, so both panes are un-hidden with currentDesc()==='options'; a back-swipe started in that window with a browse destination reaches showAppView and its sweep hides the lingering sub (probe 1 passing). The scenario never opens NP, and A1b only deletes two if(!npOpen) guards which are already taken when npOpen is false, so A1b provably cannot make it dead. Plan 4's 'its live case is the NP one' is wrong — the live case is the filmstrip window","stale_comment_determination":"js/nav.js:71-72 kept verbatim per item 12; correct at build time and its A1b deletion is explicitly scheduled and reconciled in the plan's 12 closing note, so not stale-and-unmarked. It IS now inaccurate in a second way: plan 5.3.2 (added after the build) shows every NP-close path supplies the stated benefit without the exemption. Mark or correct; F4","mutant_durability":"#104's re-anchor is correct and unique today (anchors 4/4 green) but does NOT survive A1b — A1b deletes both if(!npOpen) guards, killing #104's anchor AND #106's, while NPUNTOUCHED's two unit cells invert. Scheduled, mechanically gated rot: de-register #104 + retire its cells, re-point #106, correct plan 6-item-5 and 13-step-8","suite_cannot_see":"occlusion, stacking, paint order, compositing, cover re-decode, flash; that the reported two-screens render is gone (mechanism only — the device pass is the evidence); whether the mid-gesture states probes 2/3 expose look wrong. No overclaim found — every changed cell asserts source text, class state, call count or call ordering, and both new files say so in their headers","stale_scrub_routing":"CORRECT and complete for the term — grep over HEAD leaves exactly the 3 sites Brunel flagged (js/app.js:1327, css/app.css:156, css/app.css:691-695); all three read inaccurate, none load-bearing; worktree/android-build hits are stale copies","full_suite":"794/793/0/1","mutation_sweep_rerun":true,"sweep_result":"8/8 caught, 0 uncaught, 0 unapplied, 0 stale; tree clean, no .mutbak","anchors_gate":"4/4","return_to":"zelda"}
