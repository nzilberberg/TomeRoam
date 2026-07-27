# Charpy casebook — PLAN-swipe-stage6c (I12 ownership half), round 3

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: **e4c0839** (HEAD) — `Claude/Plans/PLAN-swipe-stage6c.md`, revised after r2 TEMPER
(`Claude/Charpy/PLAN-swipe-stage6c-2026-07-26-r2.md`, input `9a331fc`, F5 blocking; F1 resolved, F2 core
resolved, F3/F4 folded). Re-grounded against `js/app.js` (build `2026-07-26.250`), `test/app-harness.js`,
`test/swipe-invariants.test.js`, and the r1/r2 code facts (real cancel/splice at
app-harness.js:241/356-359; `finishing` set at app.js:540, cleared only at 792/1151/1177, read at 352;
`sessionDone` at 242; `revealPending` set true only by the held-reveal branches at 558-559; `d` nulled at
end() 531; movers init at begin() 407).

## Applicability

- **defining_records: true** — the review reconciles the records that define the slice (Option-A auth, the
  I12 in-code rationale, the "Owed to stage 6" ledger entry, EC §4.6/§4.15/§4.18, the subsystem disposal
  boundary, `PLAN-swipe-reveal.md` §7 step 6), plus the internal consistency of §3's negative gate against
  §1/§4/§7/§9-W.
- **boundary_relocation: false** — no ownership boundary relocates across a module seam; the plan is a gate
  narrowing + `finishing` clear + an identity guard on two callbacks (plan `state_transfer:false`). No
  source-range ledger required of this review.
- **callee_replacement: false** — no direct callee is replaced by an indirection; existing callbacks gain a
  guard.
- **contract_shape: false** — no exact-key contract changes; `d`/`cur` is exempt mutable lifecycle state; no
  field added; no `PBSwipeSession` extension.

## Verdict

**FORGE.** The r2 blocking finding (F5) is resolved: the gate is pinned to its negative form
`if (finishing && !(session && paneLess(session))) return;` (with `paneLess(s) = !s.movers.some(m => m.own
=== 'owned-pane')`) consistently across §1, §3, §4 (items 4/5), §7, and §9-W. §3 and §9-W now agree on
begin()'s behaviour for every `(finishing, session)` combination; cell W is non-vacuous and load-bearing;
the negative gate over-rejects nothing that should engage; and all F1 items still hold. No residual
contradiction, no new finding. The specimen absorbed every blow. Build it.

## Defining records

**AGREE.** No two defining records disagree on required behaviour, and the plan is now internally consistent
(the r2 §3↔§9-W conflict is gone — verified below). External records unchanged from r2: Option-A auth
(precedence 1), the I12 in-code rationale (app.js:219-234), the "Owed to stage 6" ledger entry (correctly
recorded NOT discharged, re-homed to 6d/7 — §1 row 3, §10), EC §4.6/§4.15/§4.18, the subsystem disposal
boundary (swipe-reveal.md:69-70), and `PLAN-swipe-reveal.md` §7 step 6, all faithfully cited.

## Findings

No blocking findings. Resolution of the prior findings and the requested verifications:

### F5 (from r2) — RESOLVED (verified)

The gate is pinned to the negative form throughout (§1 row `begin()` line 96; §3 lines 170-185; §4 items 4
and 5, lines 245-255; §7 lines 372-377; §9-W line 417 and the machine block line 432). Verified against all
four reachable `(finishing, session)` combinations of `if (finishing && !(session && paneLess(session)))
return;`:

| finishing | session | `!(session && paneLess(session))` | gate | correct? |
|---|---|---|---|---|
| false | any (incl. null) | short-circuits (`finishing` false) | ENGAGE | ✓ a fresh/normal swipe (no settle running) always engages — no legitimate swipe blocked |
| true | live pane-LESS | `!(true && true)` = false | FALL THROUGH → supersede | ✓ the intended new behaviour |
| true | live pane-OWNING | `!(true && false)` = true | REJECT | ✓ PG — no owned pane disposed |
| true | null (stuck flag) | `!(null)` = true | REJECT | ✓ the F5 fix — stuck `finishing` wedges |

- **§3 ↔ §9-W agree.** §3's negative gate rejects when `finishing === true && session === null`; §9-W's
  mutation description states the same ("finishing stays true and session is null → the NEGATIVE gate
  rejects the next swipe"). The r2 contradiction (positive check falling through on `paneOwning(null) ===
  false`) is gone; §3 now explicitly names the positive form as the rejected alternative and why (lines
  179-181), matching §7's contrast (lines 376-377). No residual §3↔§9-W conflict.
- **W is non-vacuous and load-bearing.** Correct build: the recovery clears `finishing = false`, so the
  fresh swipe sees `finishing === false` → engages → W passes green. Mutation (omit the clear): after the
  superseding tap, `finishing === true` and `session === null` (recovery nulls identity last, app.js:242
  pattern) → the negative gate rejects → the fresh swipe never reaches `settle` → W reddens. The mutation
  distinguishes the two builds, so the `finishing = false` clear is proven load-bearing (the r2 vacuity is
  closed). Constructible: the 2nd touch reaches the recovery (recovery-entry predicate `(finishing &&
  session)` true for a pane-less settle) before the edge check at app.js:397-399, per the throw-wedge
  template `swipe-invariants.test.js:623-646`.
- **No over-rejection.** The gate fires ONLY when `finishing` is true; a normal no-session begin()
  (`finishing === false`, `session === null`) short-circuits and engages. A live pane-less session still
  falls through (supersedable). The 6a DRAGGING supersession (finishing false, `d` non-null) is untouched —
  the gate does not fire during a drag (finishing is set true only at settle(), app.js:540), so RG6a holds.
  The `session &&` short-circuit means `paneLess(null)` is never evaluated — no null deref.

### F1 (from r1) — still holds (verified unchanged)

The r2→r3 diff is confined to the gate wording (F5); the F1-relevant sections are unchanged and still
correct: the `cur === session` identity guard is the sole mechanism (§4 item 1); no field is added
(§4.15, §4b ledger rows only the two identity reads + the `finishing` clear, no retired-null record); G1/G2/G3
mutations are "remove the `cur === session` guard" (§9), non-vacuous because begin() does not cancel the
settle rAF / 340ms timer and does not remove the transitionend listener (§3 lines 198-212, §5 lines 313-319)
so each stale callback stays queued and fires (harness fires only queued callbacks); the settle-phase nulls
and `transitionListener` ownership/removal are deferred honestly to 6d/7 (§11); the "Owed to stage 6" debt
is recorded NOT discharged (§1 row 3, §10).

### F3 (from r1) — folded, honest; carried to Brunel

§2.3 (lines 128-135) and §11 (506-511) keep both caveats (mover reset must clear `transition` — flagged for
Brunel to confirm on `Nav.resetSwipeStyles`; the committing pane-less supersession can surface the known-open
aborted-swipe repaint). Non-blocking; the plan hands the confirmation to Brunel (§12).

### F4 (from r1) — present; carried to Curie

§9 PG row (418) and §12 (522-523) carry the note for Curie to confirm the ghost pane materializes under
`opts.realBrowse` and that PG's mutation disposes it, else PG is vacuous. Non-blocking.

## Coverage

No blocking findings remain, so nothing requires a coverage mapping to clear this review. For the record,
the plan's own §9 blocking cells are confirmed non-vacuous: G1/G2/G3 redden on removing the `cur === session`
guard (observable on the successor's real DOM — transforms for G1, `browse.render`/`applyScreen`/nav for
G2/G3); W reddens on omitting the `finishing = false` clear (the negative gate wedges the next swipe). The
machine blocks match: `blocking_questions` `["G1","G2","G3","W"]` (vitruvius-gate line 5) each have a
complete `vitruvius-coverage` row; PG pins the deferral boundary; RG226/RG6b/RG6a/RGend pin shipped parity.

## Prediction

Built as written, this holds. The one place a builder can still go wrong is silent: implementing the gate as
the positive `paneOwning` check instead of the pinned negative form — which would re-open the r2 F5 vacuity
(W green in both builds). §3 lines 179-181 and §9-W now name that trap explicitly, so a builder who reads the
plan will not fall into it; the exact-key/mutation gates and Mendeleev's audit are the backstop if one does.
The two carried caveats surface at build, not as cracks: Brunel confirms `Nav.resetSwipeStyles` clears
`transition` (else a superseded pane-less mover animates to rest after the successor arms — a motion
artifact, not the flash), and Curie confirms PG's ghost pane genuinely forms under `opts.realBrowse` (else PG
is vacuous). Neither blocks the build; both are handed to the seat that owns them. Loki's strike on the §4.6
stale-callback race (the misattribution/identity axis of G1/G2/G3) is the next gate.

```json
{"persona":"charpy","stage":"6c","round":3,"input_artifact":"e4c0839","verdict":"FORGE","blocking_ids":[],"return_to":"none"}
```
