# Charpy casebook — PLAN-swipe-stage6c (I12 ownership half), round 4

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: **454edce** (HEAD) — `Claude/Plans/PLAN-swipe-stage6c.md`, revised after a Loki KILL on the
promise DOMAIN (`Claude/Loki/STRIKE-swipe-stage6c-stale-callback.md`, input `f604290`). History: Charpy r1
TEMPER (F1/F2) → r2 TEMPER (F5) → r3 FORGE → Loki KILL (domain misclassification) → this r4. Grounded
against the FROZEN spec `test/fixtures/swipe-plan-spec.mjs` (`STRUCTURAL_CASES` + `paneOf`), `js/app.js`
(build 2026-07-26.250), `test/app-harness.js`, and the Loki strike's executed probes.

## Applicability

- **defining_records: true** — reconciles the records that define the slice, and INDEPENDENTLY derives the
  pane-less domain from the frozen oracle `paneOf`/`STRUCTURAL_CASES` (the r3 miss).
- **boundary_relocation: false** — in-place gate narrowing + `finishing` clear + identity guard on two
  callbacks; no ledger required.
- **callee_replacement: false** — existing callbacks gain a guard; no indirection introduced.
- **contract_shape: false** — no exact-key contract changes; no field added; no `PBSwipeSession` extension.

## Verdict

**FORGE.** The Loki KILL (the pane-less DOMAIN was misclassified — its G/W fixtures were pane-OWNING, so the
negative gate rejected them and the cells were unsatisfiable) is resolved. §2.1 is now DERIVED CORRECTLY
from the frozen spec (I re-derived `paneOf` over all eight `STRUCTURAL_CASES` independently and it matches
the plan exactly, with home↔browse and →home correctly PANE-OWNING); G1/G2/G3/W are re-targeted onto a
genuinely pane-less transition (overlay→browse / options→books) that the negative gate admits, and each cell
reddens on its mutation — not by argument but by Loki's EXECUTED probes (`noguard` stained B, `noclear`
wedged). 6c's delivered window is honestly stated (overlay-involving pane-less set; home↔browse and →home
deferred to 6d/7). §10 writes the true boundary and the app.js:686 comment fix; the finalize guard is pinned
BEFORE the try/finally. F1/F2/F5 are intact and no new contradiction was introduced. The vacuity theme is
closed — I hunted for a third materially-equivalent vacuous cell and found none (see Coverage). Build it.

## Defining records

**AGREE**, and now internally consistent with the frozen oracle. The prior rounds' external records are
unchanged and consistent. The one place the plan had drifted from a defining record — its `pane-less`
DOMAIN vs the frozen spec — is corrected: §2.1 now cites `test/fixtures/swipe-plan-spec.mjs` `paneOf` +
`STRUCTURAL_CASES` and `js/swipe.js constructionPlanFor` as the authority (precedence 3, "verified current
production interface"), and explicitly notes the app.js:686-692 comment is WRONG against the classifier and
is corrected in §10, not relied on.

## Findings

No blocking findings. Independent verification of each requested point:

### Loki KILL (domain) — RESOLVED (independently re-derived)

I applied the frozen `paneOf(c) = c.outgoing === 'app-ghost' || c.incoming === 'home-snapshot'`
(swipe-plan-spec.mjs:66) to all eight `STRUCTURAL_CASES` (lines 54-61), reading each row's actual
`outgoing`/`incoming` — NOT trusting the plan's prose:

| transition | outgoing | incoming | paneOf | class |
|---|---|---|---|---|
| home→browse | app-ghost | real-destination | **true** | PANE-OWNING |
| home→overlay | real-source | real-destination | false | pane-less |
| browse→home | real-source | home-snapshot | **true** | PANE-OWNING |
| browse→browse | app-ghost | real-destination | **true** | PANE-OWNING |
| browse→overlay | real-source | real-destination | false | pane-less |
| overlay→home | real-source | home-snapshot | **true** | PANE-OWNING |
| overlay→browse | real-source | real-destination | false | pane-less |
| overlay→overlay | real-source | real-destination | false | pane-less |

Pane-LESS = {home→overlay, browse→overlay, overlay→overlay, overlay→browse}; PANE-OWNING =
{home→browse, browse→browse, browse→home, overlay→home}. The plan's §2.1 table (lines 143-152) and set
statements (154, 159) match this exactly. home↔browse is PANE-OWNING in BOTH directions (home→browse
app-ghost; browse→home home-snapshot) — the kill, correctly incorporated. The runtime gate
`paneLess(s) = !s.movers.some(m => m.own === 'owned-pane')` is a faithful realization of `paneOf` (Loki's
Probe A confirmed the gate REJECTS home→browse — its app-ghost is an owned-pane mover), so the gate was
always structurally correct; only the plan's prose enumeration and the fixtures were wrong, and both are now
corrected.

### G1/G2/G3/W fixtures — SATISFIABLE and reddenable (Loki-executed)

All four now use overlay→browse (options→books), which is pane-less (paneOf false), so the negative gate
admits the second touch (`!(session && paneLess(session))` = `!(A && true)` = false → no return → B arms).
Non-vacuity is not argued — it is executed in the strike (`boot({fakeTimers:true, deferRaf:true})`, node
v22.23.1):
- **G1** (remove settle rAF guard): Loki `noguard` on Probe B REDDENED — after the stale rAF,
  `#options=translateX(1024px)` over B's drag; with the guard, B's transforms (190px/-834px) unchanged.
- **G2/G3** (remove finalize guard, via 340ms timer / transitionend on `#options`): Probe B delivered all
  three stale continuations and HELD with the guard (no stale finalize line; B finalized `sid=2`); `noguard`
  runs `finalize_A` over B. Distinguishable by the sid-tagged SWIPE log line / extra stack mutation.
- **W** (omit `finishing = false`): Loki `noclear` on Probe C REDDENED — fresh swipe `starts+0`, wedge;
  correct build engaged. Under the negative gate the stuck `finishing===true`/`session===null` rejects.

The F4 fixture-vacuity note is present and made a Curie obligation: §9 lines 486-492 require asserting
`paneOf(constructionPlanFor(from,to))` is false per G-cell fixture BEFORE the supersession step, so a
pane-owning fixture can never silently re-enter the kill. This is the structural backstop that closes the
vacuity class (a discipline made a gate — per StandardsDocument §4).

### 6c's window — HONESTLY stated, no overstatement remaining

§1 row 1 (line 113), §2.3 (170-178), and §11 (580-587) all state that 6c delivers supersession only for the
overlay-involving pane-less set and that home↔browse and →home (the dominant families) are PANE-OWNING and
remain wedged-until-finalize, deferred to 6d/7. §2.3 explicitly says "This is smaller than the r3 draft
implied; §1 must not overstate Option A's ownership half." What lands for the whole gesture set is the
`cur === session` model + negative gate, on which 6d/7 extends supersession. No overstatement remains.

### §10 true boundary + comment fix; finalize-guard placement — PINNED

- §10 corrects the app.js:686-692 comment (lines 519-524): app-ghost forms for ANY non-overlay→browse
  (home→browse AND browse→browse), not just browse→browse; "do NOT inherit the flaw the r3 draft cited (it
  was the entry point for the domain misclassification)."
- §10 writes the TRUE boundary into the subsystem doc / DecisionLog (528-549): supersession DEFINED only for
  the pane-less set; pane-owning set incl. home↔browse and →home deferred; "Do NOT write the r3 draft's
  false 'home↔browse pane-less' membership."
- Finalize-guard placement (Loki lesser-plane) is pinned in §7 (425-432), §3 (255-256), §12 (613-614): the
  `if (cur !== session) return;` MUST sit after the `done` set + the two cancels and BEFORE the
  `try { runFinalize() } finally { dropRowHold(); endOwnership() }`. Verified against app.js:1159-1179 —
  `dropRowHold` reads the MODULE `session` (app.js:339-343), so a stale `finalize_A` entering the finally
  would drop the SUCCESSOR's row hold; guarding before the try makes it a total no-op. Correct.

### Prior fixes (identity guard, wedge clear, negative gate) — intact

Unchanged from r3 and still correct (r1 F1 / r2 F2 / r2 F5): identity guard is the sole mechanism, no field added, nulls +
`transitionListener` deferred honestly, "Owed to stage 6" recorded NOT discharged (F1); `finishing` clear +
recovery-entry predicate (F2); negative gate `if (finishing && !(session && paneLess(session))) return;`
consistent across §1/§3/§4/§7/§9-W (F5). The r4 domain edits did not disturb them.

The r3 F3 committing-restore caveat is correctly WITHDRAWN (§2.3 186-191, §11 594-599): `cur.clobbered` is
set only by a browse→browse mid-drag render, browse→browse is PANE-OWNING (deferred), and no pane-less
transition in 6c's domain shares the `#browse` host as source (overlay→browse renders books into `#browse`
but its source is `#options`, not clobbered), so the recovery always runs `render:false` and the repaint
path is unreachable. Loki §5 confirms. The one remaining F3 caveat (mover reset must clear `transition`) is
correctly carried to Brunel.

### F6 — §2.3 "overlay-involving" gloss is imprecise (Note; nature: recommendation)

§2.3 glosses the pane-less set as "the overlay-involving transitions" (line 172); strictly, overlay→home is
overlay-involving but PANE-OWNING and excluded. The enumerated 4-member set and §2.1's precise "{dest is
overlay} ∪ {overlay→browse}" are always given alongside and are authoritative, and the F4 `paneOf`-false
assertion is the mechanical backstop, so nothing load-bearing depends on the gloss. Non-blocking; recommend
tightening it to "overlay-involving except overlay→home."

### F7 — §7 finalize-guard rationale slightly overstates "ending its ownership" (Note; nature: recommendation)

§7's rationale says a mis-placed finalize guard would "run dropRowHold()/endOwnership() … dropping the
successor's live row hold and ending its ownership." The load-bearing hazard (dropRowHold drops B's hold —
real, verified against app.js:339-343 reading the MODULE `session`) is correct; "ending its ownership"
slightly overstates, since endOwnership → sessionDone(cur=A) is `if (session===A) session=null` and no-ops
when session===B. Immaterial to the fix (guard-before-try makes the whole finalize a no-op). Non-blocking;
recommend trimming for accuracy.

## Coverage

No blocking findings remain. The plan's own §9 blocking cells are confirmed NON-VACUOUS on Loki-executed
fixtures: G1 (`noguard` stains B's `#options`/`#browse` transforms), G2/G3 (`noguard` runs `finalize_A` over
B, sid-distinguishable), W (`noclear` wedges the next swipe). The F4 `paneOf`-false per-fixture assertion
(§9 486-492, §12 611) structurally prevents a pane-owning fixture from silently re-entering the kill.

**Third-vacuity check (as instructed): none found.** I traced each of G1/G2/G3/W to a satisfiable premise on
the corrected pane-less fixture and to an executed reddening mutant in the strike. PG remains the only cell
carrying a fixture-materialization caveat, and it is correctly flagged (F4) and non-blocking. There is no
materially-equivalent third vacuous cell; no escalation is warranted.

Machine blocks match: `blocking_questions` `["G1","G2","G3","W"]` (vitruvius-gate line 5) each have a
`vitruvius-coverage` row on the overlay→browse fixture (lines 499-502); PG pins the deferral boundary; RG*
pin shipped parity.

## Prediction

Built as written, this holds — and this time the domain is anchored to the oracle, not to prose. The residual
risks are downstream and correctly assigned: Curie must assert `paneOf` false per G-fixture (the F4 gate that
prevents the kill from recurring) and confirm PG's ghost pane materializes under `opts.realBrowse`; Brunel
must place the finalize guard before the try/finally (else a stale `finalize_A` drops the successor's row
hold) and confirm `Nav.resetSwipeStyles` clears `transition`. The one lesson this round records against my
own seat (D8): the r3 review validated the negative gate across `(finishing, session)` but accepted §2.1's
pane-less ENUMERATION from the plan's prose rather than deriving it from the frozen `paneOf`/`STRUCTURAL_CASES`
— which is exactly where the fracture lived. Loki's execution caught it. The durable fix is now in the plan
itself: the domain is derived from the frozen oracle and the F4 assertion makes every G-fixture prove its own
pane-less-ness, so a future prose slip cannot silently unsatisfy a cell. The fresh Loki re-strike on the
corrected domain is the next gate.

```json
{"persona":"charpy","stage":"6c","round":4,"input_artifact":"454edce","verdict":"FORGE","blocking_ids":[],"return_to":"none"}
```
