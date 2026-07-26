# Charpy casebook — PLAN-swipe-stage6.md (Stage 6a), 2026-07-26 r4

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: HEAD `9d014e6` — `Claude/Plans/PLAN-swipe-stage6.md` (revised per Charpy r3 F3, the
coupled-order regression). Working tree clean. Round 4: re-gate of the F3 fix, scrutinizing the full
teardown order end-to-end against every reader — because F3 was itself a coupled-order regression
introduced while fixing the Loki KILL, so the failure mode is "fix one order, break another."

## Applicability

- **defining_records: true** — the teardown order is struck against every real reader of `session`/`d`
  in `js/app.js` (`releaseGesture` :324, `dropRowHold` :339-342, the recovery's `d` reads,
  `resetSwipeStyles` :114, `finalize` :1132-1139) and the row-state model in `js/virtuallist.js`
  (`suspend` 273-278, `deactivate` 245-256).
- **boundary_relocation: false** — no code moves across a module boundary; in-place teardown reorder in
  `begin()`. No ledger/source_ranges required.
- **callee_replacement: false** — no indirection introduced.
- **contract_shape: false** — no exact-key contract changes.

## Verdict

**FORGE.** F3 is resolved and the fix introduces no new coupled-order defect. The revised §6 defers
the identity drop (`session = null` / `d = null`) to the LAST teardown step, after both
`releaseGesture` and `dropRowHold`, exactly mirroring the abort's `dropRowHold(); endOwnership();`
order and the `app.js:1132` invariant. I traced every reader of `session`/`d` through the new
five-step teardown and confirmed none is stranded and none changes behavior from the identities living
longer. §2/§5/§6 are mutually consistent and honest about the two coupled position changes; §8's
Ordering and Resources rows now name all three coupled invariants; cell VR is one concrete cell whose
two named mutations each red a distinct part of its assertion. No previously-sound section is
disturbed. The plan is ratifiable — a fresh Loki strike on the revised `recover-before-arm` +
`hold-release` + `identity-last` promise is the correct next gate.

One non-blocking Note carries forward (F2, Board.md) and one new realizability Note for Curie on VR
mutation (b) — neither blocks.

## Defining records

**AGREE.** The new order is internally consistent with every reader, and consistent with the abort
template it mirrors.

- `js/app.js:1132` (the mirror invariant): "Order matters: dropRowHold reads session.hold, so it must
  run BEFORE endOwnership clears the session." The revised §6 obeys it — `dropRowHold` (step 4) before
  `session = null` (step 5). The current `begin()` obeys it too (`dropRowHold` :365 before `session =
  null` :373). **AGREE** — r3's F3 is closed at its root.
- `js/virtuallist.js`: `suspend` (273-278) KEEPS rows (state 'suspended', "Rows are deliberately NOT
  released"); `deactivate` (245-256) DEMATERIALIZES. This is the fact both VR mutations turn on and it
  holds. **AGREE.**
- No two records disagree; the r3 plan-vs-reality collision (F3) is gone.

## F3-resolution verification — full teardown-reader trace against the new order

New §6 order: (2) `releaseGesture()` + `resetSwipeStyles()`/pane dispose, session & d KEPT; (3) recover
inside hold (reads `d.clobbered`/`d.scroll0`); (4) `dropRowHold()` → `endHold()` (reads `session.hold`);
(5) `session = null`, `d = null` LAST; (6) arm.

Every reader of `session`/`d` in the teardown, checked against this order:

- **`releaseGesture` (`app.js:324`, `if (session && session.releaseListeners)`)** — runs step 2 with
  `session` still set, so it finds and calls `.releaseListeners`. NOT stranded. (The listener closure
  itself captures `s = session` at bind time, `app.js:314`, so it tears down its OWN target regardless;
  but `releaseGesture`'s lookup of `.releaseListeners` needs the module `session` non-null, which step 2
  provides.) ✓
- **`dropRowHold` (`app.js:339-342`, reads `session.hold`)** — runs step 4 with `session` still set →
  `session.hold` readable → `Browse.endHold(t)` fires. The exact reader r3 found no-op'd; now correct. ✓
- **the recovery render/scroll (reads `d.clobbered`, `d.scroll0`)** — runs step 3 with `d` still set; §6
  step 3 and §5 Restore both state the recovery runs "while … the old `session`/`d` are still set." ✓
- **`resetSwipeStyles` (`app.js:114` → `Nav.resetSwipeStyles(keepGhosts)`)** — reads no `session`/`d`, so
  §2/§6's claim that "their position is unconstrained" is honest; placing it in step 2 (before the hold
  release) matches the current reset-before-`applyScreen` relative order and clears the mover transforms
  before the recovery renders the source into `#browse`. ✓
- **`applyScreen` / `currentDesc`** — `applyScreen` is `Nav.applyScreen` (separate module) and
  `currentDesc` reads `navStack`; neither reads app-level `session`/`d`. So keeping the identities set
  longer disturbs NO incidental reader — the only effect of the deferral is that the recovery's own
  explicit `d`/`session` reads succeed, which is the intent. ✓

No teardown reader is stranded by the new order, and no reader's behavior changes from `session`/`d`
living to step 5. F3 is closed without a new coupled-order defect. The arm block at step 6 re-allocates
`d`/`session`; between the step-5 null and step-6 arm nothing reads them, and an arm early-return leaves
the correct null "no active owner" state (parity with today).

## §2 / §5 / §6 consistency and honesty

- **§2** now lists TWO position changes under "not parity": `dropRowHold` (released after the recovery)
  AND the `session`/`d` null (deferred to last, because `releaseGesture`/`dropRowHold` read `session`).
  The "Stays exactly as today (parity)" list correctly no longer contains `session = null` — it is moved
  to the "position changed, not behavior" note. **Honest** — the reclassification matches what the code
  requires.
- **§5** Release bullet: listeners before recovery → hold after recovery → identity LAST, with the
  `app.js:1132` reason. Restore bullet notes the recovery runs while `session`/`d` are still set.
  **Consistent with §6.**
- **§6** states three coupled invariants (recover-before-arm / hold-release-after-recover /
  identity-null-after-hold-release) and a five-step order that satisfies all three. Internally
  consistent; each step's `session`/`d` precondition is met. ✓

## Cell VR — one concrete adequate cell, two distinct mutations

VR remains ONE cell: one behavior (successor snapshots the original rows, REALIZED, on a virtualized
source), one fixture (forced-virtual, deep-scrolled, identity-stamped source; live browse→browse drag;
supersede). Its two mutations each red a DISTINCT, measurable part of that assertion — this is
legitimate ordering coverage (Engineering Contract §4.10 wants wrong-ordering mutations, and there are
genuinely two ordering axes), not two vague halves:

- **(a) `dropRowHold`/`endHold` before the recovery render** → the suspended source `deactivate()`s and
  dematerializes → `keptOriginalRows=0, freshRebuiltRows>0` (Loki's measured fracture). Reds the
  "original rows survive" half.
- **(b) `session = null` before `dropRowHold`** → `dropRowHold` no-ops on a null `session`, `endHold`
  never fires, the hold leaks (`holdRows` stuck true), the suspended source is never activated/realized
  against the settled scroll. Reds the "REALIZED / hold released" half.

Both are concrete and observably distinct; the cell's behavior wording ("ORIGINAL rows, REALIZED") and
its two-mutation split name exactly the two discriminators. Adequate.

### Note (realizability, for Curie — non-blocking)

Because `suspend()` KEEPS rows (`virtuallist.js:273-278`, rows deliberately not released), mutation (b)
leaves `keptOriginalRows > 0` — the suspended rows are still in the DOM. So a VR assertion written as
`keptOriginalRows > 0` alone would catch (a) but SILENTLY PASS under (b). To red (b), the VR assertion
must check the discriminator the cell already names — that `endHold` fired / the hold released
(`holdRows` false) / the source controller reached `active` and realized against the settled scroll —
not merely that rows exist. The plan states this property ("REALIZED", "the hold LEAKS … never
realized"), so the cell is adequate as a spec; this note pins the exact observable so the authored test
does not under-assert. (Mendeleev's coverage audit is the backstop.)

## Findings

### F2 — [Note] (recommendation) `Claude/Zelda/Board.md` carries three lines describing the two known-reds as open Stage-6 work

Severity: **Note.** Nature: **recommendation.** Carried forward unchanged from r1-r3; untouched by this
revision. `Board.md:80,140,188` reference the two known-reds as open/deferred; stale once 6a closes
them. Not a §10 defect — the board is Zelda's living tactical layer, reconciled at the base-layer close
step. Recorded so the close step reconciles it.

## Confirmations (r1-r3 sound sections not disturbed)

The diff since r3 (`238c8bb → 9d014e6`) touches only: the correction note (added coupled-correction
paragraph), §2 (the new `session`/`d` position bullet + parity-list edit), §5 (Release/Restore bullets),
§6 (five-step order + third invariant), §8 (Ordering + Resources rows), and §9 (VR cell + gate line).
Every change is an improvement toward the corrected order. Sections confirmed sound earlier are intact:
the KILL-envelope mechanism (r3, verified against real `browse.js`/`virtuallist.js`); SR/SC/PS/OB/OR/
NC/PD/ST cells; the §10 scrub (F1 fix, r2); NB1 folded / NB2-NB4 honest deferrals; the defining-records
reconciliation. No new contradiction beyond none.

## Coverage

No blocking findings this round — F3 (r3 Structural) is verified closed above; F2 is a non-blocking
Note, and the VR-(b) realizability note is guidance for Curie, not a plan defect. Nothing requires a
coverage mapping to clear the verdict.

```json
{"persona":"charpy","stage":6,"round":4,"input_artifact":"9d014e6","verdict":"FORGE","blocking_ids":[],"return_to":"none"}
```
