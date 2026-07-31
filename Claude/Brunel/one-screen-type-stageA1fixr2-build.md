# Brunel build log — Stage A1-fix-r2 of ONE SCREEN TYPE (the settle-window reconcile predicate)

Plan of record: `Claude/Plans/PLAN-one-screen-type.md` §5.4 (the restated invariant), §5.4a (why the
first fix failed), §13 step 6e, §14 (the `FILMSTRIPDRAG` Coverage Model row, third window). Source
finding: `Claude/Loki/STRIKE-one-screen-type.md` (KILL, 2026-07-31). Red suite:
`Claude/Curie/RED-one-screen-type-settle.md` + `test/one-screen-type-filmstrip.test.js`. Build date:
2026-07-31. Build number: **2026-07-31.284**.

## The defect closed

The Stage A1-fix predicate (`.282`) read `!!d && d.live` — the ACTIVE-DRAG handle, which `end()` nulls
at finger-up. `session` outlives `d` through the settle/finalize phase, so a pending `overlayFilmstrip`
reconcile firing in that gap (after release, before finalize) was not suppressed: it ran
`applyScreen(currentDesc(), {render:false})` against the pre-commit descriptor, giving the committed
incoming mover the `hidden` class mid-snap and wiping both settle transforms (destroying the settle
transition and its `transitionend` finalize). The destination was restored only by the settle's 340ms
fallback finalize — a pop-in. Struck and killed by the adversary (`Claude/Loki/STRIKE-one-screen-type.md`).

## Repair: replace, not supplement

Per plan §5.4 and the adversary's boundary table, the predicate is `!!session && session.live` —
`session` is set at arm and outlives `d` through settle; `.live` is set at go-live and never reset;
`sessionDone` nulls `session` only at finalize or the reveal drop. This predicate's truth boundaries
coincide exactly with the session's ownership of the movers: not earlier (covers the settle window),
not later (a reconcile after finalize is correctly no longer suppressed), and the armed-only trap stays
closed (`session.live` is `false` while merely armed, so that window still discharges normally). `!!session`
alone was considered and rejected — it would suppress during the armed phase and strand an
armed-but-never-locked gesture's filmstrip, which is exactly what the suite's second cell exists to
catch.

The predicate is renamed `gestureOwnsMovers` (with its injected dep) — plan §5.4, "naming goes with
it": a name describing liveness would misdescribe a predicate that now reads session ownership.

## Production changes

- **`js/app.js` `bindSwipeBack()`** — the predicate and its explanatory comment move from before
  `session`'s declaration to immediately after it (`let session = null, sessionSeq = 0;`), since the
  predicate now reads `session`. `return { gestureLive }` becomes `return { gestureOwnsMovers }`.
- **`js/app.js` `bind()`** — the `Nav.init(...)` injection renames `gestureLive` to
  `gestureOwnsMovers`, keeping the same `swipeApi`-closure indirection (unchanged call order).
- **`js/nav.js` `overlayFilmstrip`** — the `reconcile` closure's guard calls `d.gestureOwnsMovers()`.
  Its header comment (plan item 32/33) is rewritten to state the ownership lifetime and its two
  boundaries — begins at go-live, ends at finalize/reveal-drop, not at finger-up — checkable against
  `js/app.js`'s own stage-3 owner comments, and names the Loki KILL as the reason the drag-liveness
  form was replaced.
- **`js/nav.js` `resetSwipeStyles`** — its header comment's claim ("this reset never lands on an
  element a live gesture owns as a mover") is corrected to the session-scoped invariant, matching the
  `overlayFilmstrip` comment's boundaries.

## Production behavior deliberately unchanged

Both `if (!npOpen)` guards (Stage A1b), `css/app.css`'s `z-index: 25`/`26` (Stage A2), the swipe
taxonomy (Stage B), `showAppView`'s stale-settings sweep, `css/app.css:41`, `.nowplaying`, Stage 1's
de-cloning, the anti-clone gate, `#home`/`#browse` transparency and `browse→browse` are all untouched —
confirmed by diff: the edits touch only the predicate's definition/location, its two call sites, and
two comment blocks.

## Coverage — all three `FILMSTRIPDRAG` windows green

`test/one-screen-type-filmstrip.test.js`'s third cell (the settle window) had its `{ skip: SKIP_SETTLE }`
removed; `SKIP_SETTLE` and its explanatory comment are deleted (dead once nothing references it).
Confirmed red before the fix, green after, with no assertion weakened:

```
node --test test/one-screen-type-filmstrip.test.js
ok 1 - FILMSTRIPDRAG — a pending overlayFilmstrip reconcile must not hide the INCOMING MOVER of a
       live gesture: #browse stays un-hidden and transformed with the finger still down
ok 2 - FILMSTRIPDRAG — the ARM-vs-LIVE trap: a gesture that arms and never locks releases without
       applyScreen, so the pending reconcile must still run and clear the filmstrip
ok 3 - FILMSTRIPDRAG — the SETTLE window: a pending overlayFilmstrip reconcile that fires after
       finger-up but before finalize must not hide or un-transform the COMMITTED movers the session
       still owns, and no hidden→shown flip may occur at finalize
# tests 3 / pass 3 / fail 0
```

### Mutants re-transcribed and registered — `#111`, `#112` re-anchored; `FILMSTRIPDRAG-c` (`#113`) new

The rename rotted both existing anchors (they anchored on `gestureLive` text the repair replaced).
Re-transcribed per `Claude/Curie/RED-one-screen-type-settle.md` §7, verbatim where specified:

- `#111` (`FILMSTRIPDRAG-a`, `js/nav.js`) — anchor re-transcribed to the `reconcile` closure calling
  `d.gestureOwnsMovers()`; `to` unchanged (the unguarded one-liner).
- `#112` (`FILMSTRIPDRAG-b`, `js/app.js`) — anchor becomes the shipped predicate line; `to` becomes
  `!!session` (the ARMED-vs-LIVE widening, now expressed on `session`), same expected killing cell
  (the arm-vs-live trap).
- `#113` (`FILMSTRIPDRAG-c`, new, `js/app.js`) — restores the shipped `.282` drag-liveness form
  (`!!d && d.live`) as the mutant, so a regression to guarding the wrong lifetime is caught. Expected
  killing cell: the settle-window cell.

```
node --test test/mutation-anchors.test.js           -> 4/4 (every anchor matches source, no no-ops, none non-unique)
node tools/mutation-sweep.mjs 110 111 112 113
#110  caught (3 failing) — FILMSTRIPDRAG (pre-existing trap-preservation mutant) — killed by all
      three FILMSTRIPDRAG cells
#111  caught (2 failing) — FILMSTRIPDRAG-a — killed by: the live-drag cell (declared expected
      killer) and the settle-window cell
#112  caught (1 failing) — FILMSTRIPDRAG-b — killed by: the arm-vs-live trap cell (matches the
      declared expected killer)
#113  caught (1 failing) — FILMSTRIPDRAG-c — killed by: the settle-window cell (matches the
      declared expected killer)
swept 4: 0 uncaught, 0 unapplied, 0 stale flags
git status --porcelain                              -> no *.mutbak, before or after
```

`#111` and `#110` are now killed by more than their originally declared single cell — an expected,
stronger result: removing the guard entirely (`#111`) or the safety net entirely (`#110`) reaches both
the live-drag and settle windows, not just one. `#112` and `#113` each match their single declared
killer exactly.

## Generated docs regenerated (line-number shift only)

Moving the predicate's definition (and rewriting its comment) shifted every subsequent line number in
`js/app.js` by a net +7. `docs/swipe-model.generated.txt` pins three `navStack`-append call sites by
literal line number, so `node tools/gen-swipe-model.mjs` was run to re-pin them
(`js/app.js:810/811/1391` → `:817/818/1398`). The four content-hash fingerprints
(`navTo`/`begin-nav-relation`/`end-state-routing`/`begin-supersession`) are byte-identical before and
after, confirming the edit touched none of those pinned regions' content, only line numbers of
unrelated text below them. `docs/transition-matrix.generated.txt` pins no line numbers and needed no
regeneration.

## Full battery and build number

```
node --test "test/*.test.js"   -> # tests 797 / pass 796 / fail 0 / skipped 1
node_modules/.bin/eslint js sw.js   -> exit 0
```
(The one skip is the pre-existing device-only `KEEPER` cell, unrelated to this build — unchanged from
the A1-fix baseline. Total tests +1 versus `.283`: the settle-window cell moved from skipped to
passing.) Build bumped to **2026-07-31.284** in `build.json`, `index.html`, `js/debug.js` and `sw.js` —
all four confirmed in lockstep via `node tools/stamp-build.mjs --check`.

## What remains device-owed (plan step 6f)

Tap `‹ Back` on a settings sub-screen (or a hub row for the forward variant), then edge-**flick** and
**release with commit roughly 125–340ms after the tap**, toward Books and toward Home. A **held** drag
cannot exercise this band — release must land inside it; that is what step 6c's clean device read
missed. Watch for the committed destination vanishing mid-snap and popping back in about a third of a
second later — this is also the candidate repro for the user's unconfirmed pop-in (plan §15 R-I). CI
proves the mechanism (no pending reconcile changes a session-owned mover's visibility or transform for
the whole of that ownership, and the reconciliation duty is still discharged); the look on glass, the
exact real-engine timing band, and whether this is the user's sighted pop-in are the device's to
confirm.

## Handoff

- **Source artifact** — `Claude/Plans/PLAN-one-screen-type.md` §5.4 / §5.4a / §13 step 6e.
- **Verdict** — `BUILD_GREEN`.
- **Next owner** — the user, for the step 6f device gate; the code reviewer, for the next review pass
  in the plan's sequence (A1b build is next, step 7 onward).
- **Records updated** — this file; `Claude/Plans/PLAN-one-screen-type.md`'s status header (Stage
  A1-fix-r2 marked SHIPPED, build `.284`). `Claude/Zelda/Board.md` and the decision log are Zelda's to
  reconcile against this handoff.
