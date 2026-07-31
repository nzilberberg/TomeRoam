# Brunel build log — Stage A1-fix of ONE SCREEN TYPE (the mid-drag reconcile must not hide the incoming mover)

Plan of record: `Claude/Plans/PLAN-one-screen-type.md` §5.4 (the fix design), §13 step 6b, §14
(the `FILMSTRIPDRAG` Coverage Model row). Source finding: `Claude/Poirot/c4cfd7e-one-screen-type-stageA1.md`
F1 (Significant), watch-list `[W37]`. Red suite: `Claude/Curie/RED-one-screen-type-filmstrip.md` +
`test/one-screen-type-filmstrip.test.js`. Build date: 2026-07-31. Build number: **2026-07-31.282**.

## The defect closed

`Nav.overlayFilmstrip` scheduled its reconcile twice (`transitionend` + a 340ms safety net) and
cancelled neither when a gesture armed. Since Stage A1 narrowed `setView`'s park guard, a
reconcile landing mid-drag ran `applyScreen('options', {render:false})`, whose `setView` gave the
INCOMING mover (e.g. `#browse`) the `hidden` class for the rest of the gesture — the destination
never arrived until release.

## Design chosen: the predicate, not cancellation

Plan §5.4 named two admissible designs. I took the recommended one: `overlayFilmstrip`'s
`reconcile` closure now checks an injected `d.gestureLive()` and no-ops while it is true, rather
than cancelling the pending `transitionend` listener / `setTimeout` at gesture go-live. Reasons:

- It is one condition at one call site (`js/nav.js`'s `reconcile`), consistent with how the
  module already reads the world only through injected deps (`d.browseWillHide` is the existing
  precedent for an optionally-present injected hook).
- It needs no new state to track and retire (no stored timer id, no listener-remover) — the
  cancellation design would have had to replicate the `settleTimer`/`revealFrames`/`revealTimer`
  idiom `js/app.js` already uses elsewhere for a comparable reason.
- It is self-healing by construction: if no gesture ever goes live, the reconcile runs exactly as
  it did before this fix.

**The trap the plan called out was avoided by construction, not by care.** `d.gestureLive()` is
wired to `!!d && d.live` — `js/app.js`'s gesture-session variable `d`, true only once `start()`
has set `d.live = true`. It reads `false` for the whole ARMED-but-not-live window, so a gesture
that arms and never locks does not suppress the reconcile — it still runs and discharges the
filmstrip's reconciliation duty on that path, exactly as required by the plan's second cell.

## Production behavior changed

- **`js/nav.js` `overlayFilmstrip`** — `reconcile` is now a no-op whenever `d.gestureLive()` is
  true. Every other line of `overlayFilmstrip` — the transform choreography, the `transitionend`
  listener, the 340ms net — is unchanged.
- **`js/app.js` `bindSwipeBack`** — gains a `gestureLive` accessor (`() => !!d && d.live`, reading
  the existing module-scoped gesture-session variable) and now `return`s `{ gestureLive }`.
- **`js/app.js` `bind()`** — declares `swipeApi` ahead of `Nav.init(...)`, passes
  `gestureLive: () => !!swipeApi && swipeApi.gestureLive()` into Nav's deps, and captures
  `bindSwipeBack()`'s return into `swipeApi` at the existing call site. No call-order change: the
  accessor is a closure over `swipeApi`, read only much later at gesture time, by which point
  `bind()` has already run to completion and `swipeApi` is set.

## Production behavior deliberately unchanged

The `if (!npOpen)` guards on the park/hide block and the six-way settings-visibility loop
(Stage A1b's job) are untouched. `css/app.css`'s `z-index: 25`/`26` declarations (Stage A2) are
untouched. The swipe taxonomy (`isOverlay`/`kindOf`/`KINDS`/`STRUCTURAL_CASES`, Stage B) is
untouched. `css/app.css:41`'s red diagnostic gradient, `.nowplaying`, Stage 1's de-cloning, the
anti-clone gate, `#home`/`#browse` transparency and `browse→browse` are all untouched.
`js/app.js`'s `showAppView` (the stale-settings sweep the A1 review determined LIVE and KEEP,
§5.3.5) is untouched — confirmed by diff: my edits sit strictly before and after it in the file,
touching neither its body nor its call sites.

## Comments corrected (plan §12 items 29, 30, 31)

- **`js/nav.js:102`'s false absolute** ("Safe because applyScreen is NEVER called during an
  active drag") is deleted. The `resetSwipeStyles` header now states the true invariant:
  `applyScreen` *does* run during a drag (via `overlayFilmstrip`'s pending reconcile), and that
  reconcile is a no-op while the gesture is live, so `resetSwipeStyles` never lands on a live
  mover.
- **F2 — the exclusivity universal**, scoped to *at rest* at all three shipped sites: the
  `#options` header comment, the sub-group header comment (both `css/app.css`), and
  `test/page-bg-single-painter.test.js`'s header block and its second assertion's failure
  message. Each now names the live filmstrip window as the deliberate exception rather than
  asserting "nothing live is ever behind it" unconditionally.
- **F4 — the superseded benefit clause at `js/nav.js:71-72`** is corrected, not deleted (deletion
  is Stage A1b's, which removes the guard itself). It no longer claims the exemption is what
  makes the NP-back reveal work — per plan §5.3.2, every NP-close path restores its own
  destination without it. It now states what the exemption actually buys: keeping `#browse`'s
  decoded cover bitmaps warm while NP is open.

## Coverage — the `FILMSTRIPDRAG` cell and its trap, both green

Both cells in `test/one-screen-type-filmstrip.test.js` pass:

```
node --test test/one-screen-type-filmstrip.test.js
ok 1 - FILMSTRIPDRAG — a pending overlayFilmstrip reconcile must not hide the INCOMING MOVER of a
       live gesture: #browse stays un-hidden and transformed with the finger still down
ok 2 - FILMSTRIPDRAG — the ARM-vs-LIVE trap: a gesture that arms and never locks releases without
       applyScreen, so the pending reconcile must still run and clear the filmstrip
# tests 2 / pass 2 / fail 0
```

The `{ skip: SKIP }` on the live-drag cell is removed (it was red at HEAD for the defect, per the
test author's own confirmation in `Claude/Curie/RED-one-screen-type-filmstrip.md`); no assertion
was weakened to green it.

### Mutants registered — `FILMSTRIPDRAG-a` (#111) and `FILMSTRIPDRAG-b` (#112)

Both were specified verbatim by the test author (intent, effect, expected killing cell) and
registered here now that the live-gesture condition they anchor on exists. `#111` reverts
`js/nav.js`'s `reconcile` to the shipped one-liner (drops the guard entirely). `#112` widens
`js/app.js`'s `gestureLive` predicate from `!!d && d.live` to `!!d` (ARMED counts as LIVE) — the
exact trap the plan warned against, realized as a mutation on the predicate's own definition
since that is where "one condition at one site" actually lives for this design.

```
node --test test/mutation-anchors.test.js           -> 4/4 (every anchor matches source; unique)
node tools/mutation-sweep.mjs 110 111 112
#110  caught (2 failing) — FILMSTRIPDRAG (pre-existing trap-preservation mutant: deleting the
      340ms net entirely) — killed by both FILMSTRIPDRAG cells
#111  caught (1 failing) — FILMSTRIPDRAG-a — killed by: FILMSTRIPDRAG live-drag cell (matches
      the declared expected killer)
#112  caught (1 failing) — FILMSTRIPDRAG-b — killed by: FILMSTRIPDRAG arm-vs-live trap cell
      (matches the declared expected killer)
swept 3: 0 uncaught, 0 unapplied, 0 stale flags
git status --porcelain                              -> no *.mutbak, before or after
```

## Build-stamp regeneration owed by the fix, and why

Adding `const gestureLive = ...` and a `return` statement inside `bindSwipeBack()` shifted every
line number after it in `js/app.js` by a fixed offset. `docs/swipe-model.generated.txt` pins
three `navStack`-append call sites by literal `js/app.js:NNN` line number
(`gen-swipe-model.mjs`'s append census), so `test/swipe-model.test.js` reddened
("stale or was hand-edited") until the doc was regenerated
(`node tools/gen-swipe-model.mjs`). The four content-hash fingerprints in that same doc
(`navTo`/`begin-nav-relation`/`end-state-routing`/`begin-supersession`) are byte-identical before
and after — confirming the edit touched none of those pinned regions' *content*, only line
numbers of unrelated text below them. `docs/transition-matrix.generated.txt` does not pin line
numbers and needed no regeneration.

## Full battery and build number

```
node --test "test/*.test.js"   -> # tests 796 / pass 795 / fail 0 / skipped 1
```
(The one skip is the pre-existing device-only `KEEPER` cell, unrelated to this build —
confirmed unchanged from the A1 review's baseline of 794/793/0/1: +2 tests, +2 passes, same
skip.) Build bumped to **2026-07-31.282** in `build.json`, `index.html` (all 35 occurrences:
the meta tag plus every `?v=` cache-buster), `js/debug.js` and `sw.js` — all four confirmed in
lockstep.

## What remains device-owed (plan step 6c)

Tap `‹ Back` on a settings sub-screen and immediately edge-swipe, within the ~240ms filmstrip
window (jsdom fires no `transitionend`, so this build's CI coverage exercises only the slower
340ms-net path — the fix covers both by construction, since both call the same `reconcile`, but
only the device can confirm the faster path in a real browser). Repeat toward Home and toward
Books. The destination must track the finger for the whole drag instead of appearing only at
release. Also owed from the plan's residual list, unclaimed by any cell here: the ~240ms
`transitionend` path behaving as the 340ms net path does in practice, and that no frame paints a
half-transformed or stranded screen (jsdom has no layout or paint, so no cell here asserts
either).

## Handoff

- **Source artifact** — `Claude/Plans/PLAN-one-screen-type.md` §5.4 / §13 step 6b.
- **Verdict** — `BUILD_GREEN`.
- **Next owner** — the user, for the step 6c device gate; the code reviewer, for step 6 area's
  review sequencing per the plan (A1b build is next, step 7 onward).
- **Records updated** — this file. `Claude/Zelda/Board.md` and the decision log are Zelda's to
  reconcile against this handoff.
