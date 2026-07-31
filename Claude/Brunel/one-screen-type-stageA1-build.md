# Brunel build log — Stage A1 of ONE SCREEN TYPE (Options and its subs become peers)

Plan of record: `Claude/Plans/PLAN-one-screen-type.md` (PLAN_READY — reviewed TEMPER, both
Structural findings folded; `Claude/Charpy/PLAN-one-screen-type-charpy.md`). Red suite:
`Claude/Curie/RED-one-screen-type.md` + `test/one-screen-type.test.js` +
`test/one-screen-type-finalize.test.js` + `test/page-bg-single-painter.test.js`. Build date:
2026-07-30. Build number: **2026-07-30.280**. Commit: `c4cfd7e`.

## Slice completed

`js/nav.js` `setView`'s park-and-hide guard narrows from `if (!npOpen && !optOpen &&
!subOpen)` to `if (!npOpen)`, so entering a settings screen parks `#home` and hides
`#browse` exactly as entering Browse does, including the `d.browseWillHide()` edge call.
The two-line settings visibility block that kept the Options hub mounted under its own
sub-screen (`js/nav.js:83-84` at HEAD) collapses to one six-way loop:
`for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);`
inside the retained `if (!npOpen)` guard. The local `optOpen`/`subOpen` consts are deleted.
`css/app.css` loses `background: var(--page-bg)` from `#options` and from the five-sub
group (`#downloads, #general, #playback, #buffering, #diagnostics`); the legal painter set
of `--page-bg` is now exactly `body::before` and `.nowplaying`.

## Production behavior changed

- **`js/nav.js` `setView`** — the guard narrows as above. Entering any settings screen now
  parks `#home`, hides `#browse` and fires `d.browseWillHide()` on the shown→hidden edge —
  three trigger edges that did not exist at HEAD (button-nav, abort of a settings→browse
  gesture, NP-close-to-settings after an `NP→files` abort), all proven by `PEERFINALIZE`.
- **`css/app.css`** — `#options` and the five-sub group declare no `background` at all.

## Production behavior deliberately unchanged

`js/nav.js:82`'s (now the second) `if (!npOpen) { ... }` guard — the NP-back-reveal
mechanism — is untouched in behavior; only its wrapped body collapses to the six-way loop.
`overlayFilmstrip` and both call sites, `Nav.SETTINGS_SUBS`/`isSub`/`overlayEl`/`viewElFor`,
every settings screen's inset geometry/padding/scroller/`scrollbar-width:none` membership,
every `.nowplaying` declaration, `css/app.css:41`'s red diagnostic gradient, the `z-index`
declarations on `#options`/the sub group (Stage A2), and the swipe taxonomy
(`isOverlay`/`kindOf`/`KINDS`/`STRUCTURAL_CASES`, Stage B) are all untouched.

## Comments scrubbed (plan §12 items 1, 2, 3, 4, 5, 9, 12 partial, 13; §16.1's item 22)

- `css/app.css` — both false "additive overlay" header comments (`#options`, the five-sub
  group) rewritten to the peer statement; both `background`-justifying comments deleted with
  the declarations.
- `js/nav.js` — the six-line false additive-premise comment (`:50-55` at HEAD) deleted, the
  guard given a one-line accurate rationale; lines 78-81 (the gone hub-mounted-under-sub
  mechanism) deleted while lines 76-77 (the retained guard's stated reason — "leave the
  settings overlays' hidden state untouched when going TO NowPlaying so whichever one was
  underneath stays for the NP-back reveal") are KEPT VERBATIM, per the plan review's F3 and
  the plan's own explicit warning that a guard with no visible purpose is what a later
  refactor deletes; the "additive overlays (like NP): no document scroll changes" claim in
  `applyScreen`'s settings-branch comment rewritten to "peer screens ... resets only its own
  panel."
- `test/page-bg-js-painter.test.js:4` — "the three additive overlays" scrubbed to name
  `.nowplaying` as the one deliberate additive overlay.

**Not scrubbed, out of my declared scope, flagged for the plan's step 13 (the assistant's
HEAD-wide scrub):** `js/app.js:1327`'s comment ("additive overlays (NP, Options) leave #home
un-hidden underneath") and `css/app.css:156`/`:691-695`'s "additive overlay" / "Options
paints OVER the still-visible browse view" language are now stale for Options — none of
these three lines is in the plan's declared `vitruvius-gate` source ranges or in §12's
deletion list, and the plan's own §13 step 13 explicitly assigns the HEAD-wide
"additive overlay" scrub to a later step and a different owner. Left as current HEAD state,
named here so the thread is not lost.

## Test changes

- `test/nav.test.js:36-44` inverted (plan §12 item 19): the test now asserts a sub-screen
  HIDES the hub, not the reverse. Its siblings (`:112` deactivate-before-hide, `:69` NP
  leaves the overlays alone) are unchanged and stay true.
- `test/page-bg-single-painter.test.js` rewritten per §16.1: the three superseded tests, the
  stale "THE MODEL" header, and the split `TRANSPARENT_SELECTORS`/`OPAQUE_SELECTORS` are
  gone; `NOSETTINGSBG` (already authored red by Curie) is the sole surviving contract, now
  unskipped.
- `test/one-screen-type.test.js` / `test/one-screen-type-finalize.test.js` — `{ skip: SKIP }`
  removed from all seven previously-skipped cells (`ONEPAGE`; `PEERPARK` x2; `PEERFINALIZE`
  x4); the now-dead `SKIP` consts and their scaffolding comments removed. One fixture-sanity
  assertion in `PEERFINALIZE` edge 2 had its "until the build lands this is the cell's first
  red" narrative scrubbed now that the build has landed.

## Mutations registered/re-anchored (`tools/mutate.mjs`, indices 102-109)

`#104` (`NPUNTOUCHED`) re-anchored: A1's narrowed guard made `if (!npOpen) {` occur twice in
`js/nav.js`, colliding with `#104`'s original anchor exactly as Curie's artifact predicted.
Disambiguated by extending the `from` with the six-way loop that follows the second
occurrence, per `Claude/Curie/RED-one-screen-type.md` §7's verbatim spec. Six mutants
specified in that same section registered at build time (indices 105-109 plus the already-
registered 102-103): `ONEPAGE` (restores the hub-stays-mounted rule — commit `6c9e7e3`'s
exact shape), `PEERPARK/PEERFINALIZE-a` (restores the settings park-guard exemption),
`NOSETTINGSBG-a` / `NOSETTINGSBG-a'` (re-adds the background to `#options` / the sub group),
`PEERPARK-c` (deletes the `browseWillHide()` call entirely).

**Foreground sweep, indices 102-109, `0 uncaught, 0 unapplied, 0 stale flags`:**

| # | Mutant | Expected killer | Actual killer(s) |
|---|---|---|---|
| 102 | PEERPARK/PEERFINALIZE-b (hide before capture) | PEERPARK + PEERFINALIZE observed-un-hidden | nav.test.js deactivate-before-hide; PEERFINALIZE edges 1-3; PEERPARK hook |
| 103 | NOSETTINGSBG-b (.nowplaying loses its background) | NOSETTINGSBG painter-set equality | NPUNTOUCHED source scan; NOSETTINGSBG painter-set test |
| 104 | NPUNTOUCHED (npOpen exemption removed) | NPUNTOUCHED | eslint no-constant-condition (incidental); nav.test.js NP guard; PEERFINALIZE edge 3; both NPUNTOUCHED unit cells |
| 105 | ONEPAGE (hub-stays-mounted restored) | ONEPAGE | nav.test.js inverted cell; ONEPAGE |
| 106 | PEERPARK/PEERFINALIZE-a (park exemption restored) | PEERPARK + PEERFINALIZE class assertions | all 4 PEERFINALIZE gestures; both PEERPARK cells |
| 107 | NOSETTINGSBG-a (#options regains background) | NOSETTINGSBG (both assertions) | both NOSETTINGSBG cells |
| 108 | NOSETTINGSBG-a' (sub group regains background) | NOSETTINGSBG (both assertions) | both NOSETTINGSBG cells |
| 109 | PEERPARK-c (browseWillHide call deleted) | PEERPARK + PEERFINALIZE call-count | nav.test.js deactivate-before-hide; PEERFINALIZE edges 1-3; PEERPARK hook |

Every actual killer set is a superset containing its declared expected cell — no mutant is
caught only by an unrelated test.

## Verification

- **The five plan cells, all green:** `ONEPAGE`, `PEERPARK` (2 cells), `PEERFINALIZE`
  (4 cells), `NOSETTINGSBG` (2 cells), `NPUNTOUCHED` (3 cells) — 23/23 in the targeted run
  (`test/one-screen-type.test.js` + `test/one-screen-type-finalize.test.js` +
  `test/page-bg-single-painter.test.js` + `test/page-bg-js-painter.test.js` +
  `test/nav.test.js`). `NPUNTOUCHED` is the preservation cell (green at HEAD by design); its
  ability to fail is carried by mutant `#104`, confirmed above, not by a contrived red.
- **The background deletion and the visibility-block collapse land in the same commit**
  (`c4cfd7e`) — the hard constraint of plan §8 ordering 5, satisfying the reason commit
  `6c9e7e3` was reverted.
- **Full battery** (`node tools/hooks/run-checks.mjs`): `no-mutbak` / `stamp` / `lint` /
  `typecheck` / `tests` / `campaign-gates` / `retired-name` all PASS.
- No `*.mutbak` before the commit. `git log -1` confirms HEAD moved to `c4cfd7e`.

## Device-owed (NOT built here, NOT claimed)

Per plan §15 and Curie's §9: R-A's residual paint consequence, R-B (cover re-decode on
browse→settings), R-C (the 6f overlay-background residue), R-E (the home↔settings
park/un-park flash surface), R-F (Stage A2's stacking inversion — not this stage), R-G (the
hub↔sub filmstrip between two transparent panes). None of these is asserted by any cell
here; jsdom has no layout or paint. The step-4 device gate is the next step, owned by the
user, not built or claimed here.

## Ambiguities interpreted

- **The narrowed guard's replacement comment.** The plan requires deleting the false
  six-line rationale (§12 item 9) but does not mandate a replacement. I added one accurate
  line rather than leaving the guard bare, consistent with this file's existing dense-comment
  convention and the standards' requirement that a retained guard carry its reason in source
  (§12 item 12's invariant, applied here to the sibling guard for consistency, not because
  the plan required it for this specific line).
- **Scope boundary on the "additive overlay" HEAD-wide scrub.** Three stale references
  outside the plan's declared source ranges and outside §12 (`js/app.js:1327`,
  `css/app.css:156`, `css/app.css:691-695`) were found but not touched — flagged above for
  the plan's step 13, not fixed here, per Brunel's scope discipline (build only what the plan
  specifies) and the plan's own explicit ownership split between step 3 and step 13.

VERDICT: BUILD_GREEN
