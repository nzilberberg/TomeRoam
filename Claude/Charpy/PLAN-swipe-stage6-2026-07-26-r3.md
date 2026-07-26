# Charpy casebook — PLAN-swipe-stage6.md (Stage 6a), 2026-07-26 r3

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: HEAD `238c8bb` — `Claude/Plans/PLAN-swipe-stage6.md` (revised per the Loki KILL on
`recover-before-arm`, `Claude/Loki/STRIKE-swipe-stage6-recover-before-arm.md`). Working tree clean.
Round 3: re-gate of the Loki-KILL fix. The KILL is the ordering fracture r1/r2 were blind to — the
§9 fixtures were all small-list classic renders with no suspend/`endHold` path.

## Applicability

- **defining_records: true** — the fix is struck against `js/app.js` (`dropRowHold` 339-342,
  `finalize` finally 1127-1142, `begin()` 361-375), `js/browse.js` (`beginHold`/`endHold` 140-181,
  `showPage` 260-312), `js/virtuallist.js` (`deactivate`/`suspend`/`_realize` 197-299), the parent
  §3.7 sequence, and the Loki strike.
- **boundary_relocation: false** — no code moves across a module boundary; in-place behavior +
  ordering change in `begin()`. No ledger/source_ranges required.
- **callee_replacement: false** — no indirection introduced.
- **contract_shape: false** — no exact-key contract changes.

## Verdict

**TEMPER.** The revision correctly diagnoses the Loki KILL and its recovery-inside-the-hold-envelope
design is sound: I verified against the real `browse.js`/`virtuallist.js` that rendering the source
while the hold is held (so the returning suspended page is NOT reactivated, `browse.js:309-310`) and
releasing the hold LAST (so `endHold` does its single realize against the settled scroll reusing the
kept rows, `browse.js:170-174`) genuinely preserves the source's original rows — it mirrors the
abort's proven envelope. The new VR coverage cell is concrete and reds on exactly the killed defect;
NB1 is honestly folded in by the ordering; NB2-NB4 are honestly deferred as abort-shared, not
introduced here; §8's requirement wording is corrected to release-after-recover.

One Structural crack, NEW to this revision: **fixing the `endHold`-vs-render order, §6 introduced a
broken `session`-vs-`dropRowHold` order.** §6 nulls `session` (step 2) before calling `dropRowHold`
(step 4), but `dropRowHold` reads `session.hold` and no-ops when `session` is null — so the Browse
hold is never released. The abort template the plan cites documents the opposite order explicitly.
The invariant (endHold after recover) is right; the specified step sequence realizing it leaks the
lease. Fix §6/§5 and the plan is ratifiable.

## Defining records

**AGREE on the required behavior; the revision's envelope design matches the abort and §3.7.** The one
conflict is between §6/§5's specified step order and the real `dropRowHold` contract (F3) — a plan-vs-
reality collision, not a records-vs-records one.

- `PLAN-swipe-reveal.md` §3.7: "restore the source, **return its Browse lease**, ..." — restore
  BEFORE lease return. The revised §1 row now states the slice implements it "in §3.7's own order —
  restore the source BEFORE returning the Browse lease (endHold inside the restore envelope)."
  **AGREE** — the corrected framing matches the parent, reversing the pre-KILL inversion.
- `js/app.js` `finalize` 1127-1142 (the mirror template): `runFinalize()` renders+scrolls, then the
  `finally` at 1138-1139 runs `dropRowHold(); endOwnership();`. §3/§6's "mirrors `finalize()`'s
  `finally` (app.js:1138-1139)" is **accurate for the render/endHold axis.** But line 1132 also
  documents "Order matters: dropRowHold reads session.hold, so it must run BEFORE endOwnership clears
  the session" — which the revision violates on the session axis (F3).
- `js/browse.js` / `js/virtuallist.js`: the KILL mechanism is real and the fix defeats it — traced
  below. **AGREE** the design closes the fracture.

## KILL-resolution verification (traced against the real code, both orders)

Setup at supersession (live virtualized browse→browse drag): `start()` took the hold
(`beginHold` → `holdRows=true`, `setScrollSuspended(true)`, `browse.js:140-146`); the mid-drag render
suspended the source page (`showPage` `if (holdRows && c.suspend) c.suspend()`, `browse.js:283`, rows
KEPT) and parked it, shown page = destination, scroll = clamped.

- **Fracture order (current code / cell VR mutation): `endHold` before render.** `endHold` un-parks,
  activates the shown DESTINATION, then `for … if (state==='suspended') c.deactivate()`
  (`browse.js:172-174`) → the suspended SOURCE controller `deactivate()` → `dematerialize()`
  (`virtuallist.js:245-256`) destroys the kept rows. The subsequent render rebuilds the source from
  nothing (`returningFromSwipe` is false because `holdRows` is now cleared) → `keptOriginalRows=0`,
  cover-less grid. Matches Loki's measured `keptOriginalRows=0, freshRebuiltRows=13, 48 covers
  released`. **Fracture confirmed in real code.**
- **Fixed order (§6 intent): render while held, `endHold` last.** Render the source while
  `holdRows=true` → `showPage(source)`: the returning source is suspended, so
  `returningFromSwipe = holdRows && state==='suspended'` is true → it is NOT reactivated
  (`browse.js:309-310`), rows stay kept; the destination is now suspended. `scrollTo(0, d.scroll0)`
  restores the real scroll while the dispatcher is still suspended. Then `endHold`: shown page =
  source → `activate(); _realize()` against the settled scroll, REUSING the kept rows
  (`browse.js:170-171`, the "reuses the rows it kept" contract 156-161) → `keptOriginalRows=13`.
  **The envelope defeats the fracture.** This is the abort's exact choreography, so it is proven.

The fix is mechanically correct — provided the hold is actually released. F3 is that it is not.

## Findings

### F3 — [Structural] (defect) §6/§5 null `session` before `dropRowHold`, but `dropRowHold` reads `session.hold` and no-ops when `session` is null — the corrected order leaks the Browse hold

Severity: **Structural.** Nature: **defect.** New to this revision.

`js/app.js:339-342`:
```
const dropRowHold = () => {
  if (!session || !session.hold) return;
  const t = session.hold; session.hold = 0;
  if (window.Browse && Browse.endHold) Browse.endHold(t);
};
```
The hold token lives on `session.hold`; `dropRowHold` no-ops if `session` is null.

The revised ordering places the session-clear before the hold release:
- §6 step 2: "Release the old session's listeners + identity — `releaseGesture()`, **`session = null`**.
  Do NOT drop the Browse hold yet."
- §6 step 4: "Release the hold LAST — **`dropRowHold()`** -> `Browse.endHold()` …"
- §5 Release bullet: "identity (`session = null`) … released **BEFORE the recovery** — UNCHANGED."

Executed in that order with the real helper, `dropRowHold` at step 4 sees `session === null` → returns
immediately → `Browse.endHold` is never called → `holdRows` stays `true` forever. That is a leaked
Browse hold (I3 / Engineering Contract §4.3 lease-returned-on-every-exit; `browse.js:127` "a LEAKED
hold degrades"), and worse than a cosmetic leak: with `holdRows` stuck true, every subsequent
`showPage` suspends the returning page instead of activating it (`browse.js:309-310`), so the source's
rows are never realized at all — the fix's own goal (realize the kept rows at `endHold`) never fires.

The plan's mirror template refutes the order directly. `finalize` (app.js:1127-1142) runs
`dropRowHold(); endOwnership();` in that sequence, with the explicit comment at **line 1132: "Order
matters: dropRowHold reads session.hold, so it must run BEFORE endOwnership clears the session."** The
current `begin()` hard reset obeys it too — `dropRowHold()` at :365 precedes `session = null` at :373.
The revision mirrors the template's render/`endHold` axis but inverts the session axis the same
template documents.

§2's reclassification is half-right and half-false as a consequence: "`dropRowHold`'s POSITION changes
… The CALL is unchanged; only its ordering is." The position change is correct in intent (release
after render); but you cannot move `dropRowHold` past `session = null` and keep the CALL unchanged and
working — the abort proves `dropRowHold` must precede the session-clear. So either the call changes
(capture the token into a local before nulling `session` and call `Browse.endHold(token)` directly) or
the session-clear moves; §2's "call unchanged, only ordering" is not achievable together with §5/§6 as
written.

Invariant the plan must state (D3 — invariant, not mechanism): `dropRowHold`/`endHold` must run while
`session.hold` is still readable (i.e. `session` non-null) AND after the recovery render+scroll. Both
constraints hold only if `session = null` moves to the LAST step, after the hold release — exactly the
`dropRowHold(); endOwnership();` sequence of the mirrored `finalize`. *Recommendation (Vitruvius's
call on realization):* place `session = null` in step 5 (after `dropRowHold`), mirroring
finalize's finally; then §5's "session = null before the recovery — UNCHANGED" and §6 step 2's
`session = null` must both be corrected to the new position (a coupled D5 sibling pair — correct both,
not just one).

### F2 — [Note] (recommendation) `Claude/Zelda/Board.md` carries three lines describing the two known-reds as open Stage-6 work

Severity: **Note.** Nature: **recommendation.** Carried forward unchanged from r1/r2; untouched by this
revision. `Board.md:80,140,188` reference the two known-reds as open/deferred; stale once 6a closes
them. Not a §10 defect — the board is Zelda's living tactical layer, reconciled at the base-layer close
step. Recorded so the close step reconciles it.

## Confirmations (struck and held)

- **VR cell — concrete and adequate, not bare.** Forced-virtual (`test/browse-virtual.test.js` recipe:
  injected metrics, >600-item list), deep-scrolled, realized rows identity-stamped; mutation =
  `dropRowHold`/`endHold` moved BEFORE the recovery render → `keptOriginalRows=0, freshRebuiltRows>0`.
  This reds on exactly the killed defect and, unlike the small-list cells, drives the real
  `browse.js`/`virtuallist.js` suspend/realize path. (Realizability caveat, Curie's to build not
  blocking: it depends on the app-harness being able to drive `begin()`/`start()` over a real
  forced-virtual Browse; the plan names a concrete recipe, so the spec is adequate.) On a CORRECTLY
  ordered fix (F3 resolved) VR's baseline is green and the mutation reds it.
- **NB1 — honestly folded and closed.** `endHold` un-suspends the scroll dispatcher
  (`setScrollSuspended(false)`, `browse.js:152`); §6 step 4 places `endHold` AFTER the step-3
  `scrollTo`, so the scroll write occurs while the dispatcher is still suspended and schedules no
  post-arm rAF realize. `async_change:false` holds by construction of the order. Verified against
  `beginHold`/`endHold` suspend/resume.
- **NB2-NB4 — honestly out of scope, abort-shared.** NB2 (`endHold` replays `heldRepaints`,
  `browse.js:176-180`) runs identically in the abort's own `finalize` finally — pre-existing Browse-
  hold behavior, not introduced here. NB3 (classic `display:none` cover round-trip, the .194 flash
  mechanism) is the abort's behavior too and rides the standing flash deferral. NB4 (cache-miss source
  makes the render async) is equally true of an abort re-render of an evicted source. Each is correctly
  bounded as parity-with-the-abort, not a defect this slice creates.
- **§8 requirement wording corrected.** The Resources row now reads release-after-RECOVER ("the Browse
  hold releases LAST (after the recovery render+scroll, cell VR)"), replacing the r1 release-before-arm
  framing the strike flagged as asserting the opposite of the defect.
- **No other new contradiction; r1/r2-sound sections intact.** SR/SC/PS/OB/NC/PD/ST cells, the §10
  scrub (F1 fix from r2), and the defining-records reconciliation are unchanged or improved. The only
  new inconsistency is F3.

## Coverage

- **F3** → verified against `js/app.js:339-342` (`dropRowHold` reads `session.hold`), `js/app.js:1132`
  (the "Order matters" comment mandating dropRowHold-before-session-clear), and the current
  `begin()` order (:365 before :373). Resolution is verified when §5/§6 place `session = null` after
  the hold release (or capture the token before nulling and correct §2's "call unchanged" claim) and a
  virtualized-supersession run shows `endHold` actually fires (`holdRows` returns to false,
  `keptOriginalRows>0`). F2 is a non-blocking Note.

```json
{"persona":"charpy","stage":6,"round":3,"input_artifact":"238c8bb","verdict":"TEMPER","blocking_ids":["F3"],"return_to":"vitruvius"}
```
