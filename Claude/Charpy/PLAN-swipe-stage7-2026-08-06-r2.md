# Charpy — PLAN-swipe-stage7.md, round 2

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:346-374","js/app.js:398-431","js/app.js:497-558","js/app.js:1015-1086"],"callee_ranges":["js/browse.js:165-223","js/browse.js:245-248"]} -->

Artifact: `Claude/Plans/PLAN-swipe-stage7.md` (status line "TEMPER APPLIED (round 1)", temper applied at `e9783f4`)
Prior round: `Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r1.md`, verdict TEMPER, filed at `5c2c065`
HEAD at review: `5c96f8c` (moved from `c22b527` during this review; the two commits between touch
`Claude/Zelda/Board.md` and `Claude/Zelda/HANDOFF-2026-08-06.md` only — no source, no plan, so every
measurement below stands). Tree clean before and after. Suite **887 tests / 886 pass / 0 fail / 1 skip**
(count read, not inferred).
Date: 2026-08-06

<!-- charpy-gate {"review_type":"plan-review",
  "patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":true,"contract_shape":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/app.js:346-374","js/app.js:398-431","js/app.js:497-558","js/app.js:1015-1086"],
  "callee_ranges":["js/browse.js:165-223","js/browse.js:245-248"]} -->

---

## Verdict

verdict: **TEMPER.** Scope of this round was F1, F2, F3 and nothing else.

**F1 is repaired and the repair survived execution.** I re-ran the measurement control-first and §11's
re-measured table reproduces exactly — 0 / 1 / 9 / 9 / 3 / 12 / 13 — and class (b) measures nine
registrations, the same nine §11 names. §17 step 5b's equality rule is now satisfiable by correct work.
One residual: §11's class (c) declares one non-registry reader and there are ten, nine of them
undeclared; eight are caught loudly by step 5b's "whole suite green", and one — `tools/gen-swipe-model.mjs`
with its generated `docs/swipe-model.generated.txt` — is caught by nothing.

**F2 is repaired, including the coverage half.** The trace line is a genuine production consumer:
`js/debug.js` is loaded by the shipped shell, the harness captures `PBDebug.log`, the wrapper's own
guard makes the new line unable to throw on the `finally` path, and `LEASEINVALID`'s trace clause plus
`NATURAL-d` supply the test that proves the consumer reads the value.

**F3 is not repaired.** The retraction is right and the direction of the repair is right, but the repair
carries two defects I measured. Its soundness argument — "every one of the three re-anchoring candidates
keeps `Object.freeze(` on its `to` side" — is false at HEAD: all three `to` strings lack the wrapper, so
that property is an unstated obligation on the builder's edit rather than a verified fact, and the
minimal re-anchoring reintroduces the exact vacuity round 1 measured. And `MOVERFROZEN`'s `NATURAL-b`
cannot kill: weakening a `some()` predicate that is already true changes nothing.

Three surgical edits, all named below with an acceptance predicate each. **No round 3 is owed** if the
amendment is confined to them — each is checkable against a stated predicate without a further reading
pass, and this campaign's legitimate lever is less ceremony.

---

## Applicability

| Pattern | Value | Reason |
|---|---|---|
| `defining_records` | **true** | The Engineering Contract §4.15, `PLAN-swipe-declone-stage2-subtraction.md` §14, the mutation registry, the second (source-gate) registry and `StandardsDocument.md` §6.6 all bear on F1/F2/F3 and are reconciled below. |
| `boundary_relocation` | **false** | No code moves between modules. `beginHold`/`endHold`/`dropHold` stay in `js/browse.js`; the wrappers stay in `js/app.js`. Re-confirmed by reading both files at `5c96f8c`. |
| `callee_replacement` | **true** | `Browse.endHold` → `Browse.finishGestureHold` with a return value, and `dropHold` gains the public entry `invalidateGestureHold`. Callee ranges declared; behaviour traced below. |
| `contract_shape` | **true** | `js/browse.js:964`'s export object loses two names and gains one, and the callee gains a return value. |

**Declared-range completeness reason.** F1's transform lands in `js/app.js:346-374` (the wrapper pair and
the session field), `js/app.js:398-431` (the recovery release), `js/app.js:497-558` (the acquire site and
§12's freeze target at `:557`) and `js/app.js:1015-1086` (the finalize release pair). F2's new trace line
lands inside `346-374`. F3's subject is the freeze inside `497-558` plus the mutation registry, which is
not a source range. The Browse side is the reconciliation body (`165-223`) and `dropHold` (`245-248`),
which the plan promotes to a public entry point.

**Adapter-visible items, named so no check can pass by omission.**

- Session fields crossing the declared ranges: `session.hold` (→ `session.lease`, `js/app.js:349`, `:369`,
  `:371`, `:372`, `:1048`, `:1071`), `d.live`, `d.movers`, `d.scroll0`, `d.settleFrame`, `d.settleTimer`,
  `d.releaseListeners`, `d.id`, `d.tgt`, `d.dir`, `d.from`, `d.dest`, and the new **`status`** local the
  trace line reads (F2). The plan now names the status; round 1's "unnamed" objection is discharged.
- `document.body.classList` mutation inside a declared range: `document.body.classList.remove('np-locked')`
  at `js/app.js:529` and `:551`. Unchanged by this stage; named because it sits inside `497-558`.
- Callee `classList` tokens inside `js/browse.js:165-223`: `parked` (removed `:183`, toggled `:208`) and
  `hidden` (toggled `:184`, added `:209`). `dropHold` (`245-248`) touches no class token — it clears
  `holdRows`, bumps `holdGen`, clears `heldRepaints` and releases the scroll suspension.
- `removeAttribute('data-*')` pre-mount effect: **none exists** in any declared range at `5c96f8c`.
- Exact-key contract gate: `test/contract-function-gate.test.js` governs the `Swipe.*` contract-object
  factories and does not reach `js/browse.js`. The gate over the new Browse surface is `LEASECONTRACT`
  (§13). Round 1's F5 (the dangling §6→§11 cross-reference) is repaired: the Applicability table and §6
  both now name `LEASECONTRACT` explicitly. Verified by reading, not re-struck — F5 is out of round 2's
  scope and is recorded here only because the adapter requires the reference to be stated.

---

## Defining records

| Record | Bears on | Call |
|---|---|---|
| `tools/mutate.mjs` (the behavioural anchor registry, 152 entries at `5c96f8c`) | §11's co-change set | **AGREE.** Re-measured control-first; §11's table reproduces exactly. See F1. |
| `tools/source-gate-sweep.mjs` (the SECOND anchor registry, named as such in `test/mutation-anchors.test.js`) | whether §11 covered every registry | **AGREE — measured, and it is untouched.** No entry in that file mentions `beginHold`, `endHold`, `dropHold`, `takeRowHold`, `dropRowHold` or `.hold`. §11 does not name it and does not need to. Recorded because this campaign lost nine stages to that registry rotting unwatched. |
| `Claude/EngineeringContract.md` §4.15 | the release status | **AGREE with the plan's D1.** §4.15 requires "a real production consumer **and** a test proving that consumer uses it". Both halves are now in scope. See F2. |
| `PLAN-swipe-declone-stage2-subtraction.md` §14 + `test/swipe-declone-stage2-subtraction.test.js:665-706` | the freeze pairing | **CONFLICT.** §12's repaired predicate rests on a property of three registrations that does not hold at HEAD and that the plan does not require the builder to create. See F3. |
| `StandardsDocument.md` §6.6 (scrub is part of every plan, exhaustive on the first pass) | §11's declared set and scrub list | **GAP.** The scrub list omits `tools/gen-swipe-model.mjs` and `docs/swipe-model.generated.txt`, which carry the retired names in current-truth prose, and §11's headline "twelve" is the number produced only if the code comments are left describing a system that no longer exists. See F1. |
| `test/app-harness.js:632` + `index.html:233` | whether the trace line is a production consumer | **AGREE.** `js/debug.js` ships in the production shell and the harness installs a capturing `PBDebug`. See F2. |

---

## Callee behaviour across the replacement (`js/browse.js:165-223`, `:245-248`)

Re-read in full at `5c96f8c`; unchanged since round 1 and the round-1 trace stands. The early return at
`:166` is `token !== holdGen || !holdRows` — two conditions, and the second is what makes a second call
with a live token inert. Order: flag-clear (`:167`) → scroll-suspension release (`:168`) → landed key
(`:171`) → deactivate loop (`:178-181`) → `parked`/`hidden` toggles (`:182-185`) → landed
activate+realize (`:189-190`), else the fallback branch (`:205-216`) → deferred-repaint replay
(`:220-222`). `dropHold` (`:245-248`) clears `holdRows`, bumps `holdGen`, clears `heldRepaints` and
releases the scroll suspension. §8's table maps every row to a real statement in that order.

**One callee fact is load-bearing for F2 and is stated here rather than assumed.** The wrapper
`dropRowHold` (`js/app.js:370-374`) opens with `if (!session || !session.hold) return;`, so every
statement after that guard — including the new trace line — runs with `session` non-null. The
`finally`-wedge trap §5 flags for `keyFor` (`js/browse.js:141-158`) therefore does not reach the new
line: it cannot throw on `session.id`, and on the leak-guard call at `js/app.js:1079` the guard has
already returned because the first release nulled the field.

---

## Findings

### F1 — Weak — defect — the co-change measurement is repaired and reproduces; the declared reader class is still one of ten, and one of the nine undeclared readers is ungated

**Severity: Weak. Nature: defect.** *(The Structural half of round-1 F1 — a step-5b equality rule that
fires on correct work — is discharged. What remains is a completeness gap in the same section.)*

**MEASURED, not read.** I applied each transform layer in memory to copies of `js/app.js`,
`js/browse.js` and `test/app-harness.js` outside the repo, and re-ran the anchors gate's own predicate
(`readFile(file).includes(lf(part.from))` over `MUTATIONS` and each `m.also`, with the gate's CRLF
normalisation) against the result. `git status --porcelain` was empty before and after; no `*.mutbak`
or `*.sgbak` exists anywhere in the tree. Registry size at measurement: **152**, as §11 declares.

| Transform layer | §11 declares | I measured |
|---|---|---|
| CONTROL — none | 0 | **0** |
| §12's probe alone, code positions only | 1 | **1** (`S2-20 LANDEDPAGESHOWS`) |
| §5 as written, code positions only | 9 | **9** |
| §5 + the `js/browse.js` rename | 9 | **9** — the Browse-side rename rots nothing, as §11 says |
| §12's freeze alone | 3 | **3** (`S2-35`, `S2-36`, `S2-39 MOVERSHAPE`) |
| FULL, code positions only | 12 | **12** |
| FULL, identifiers renamed in comments too | 13 | **13** (adds `stage6c G2/G3`) |
| Class (b): `to` sides injecting a retired identifier | 9 | **9**, and they are the same nine §11 names |

Adding the `test/app-harness.js` fake rename to the transform rots **0** further registrations, so the
fact that §17 step 5b's transform list omits the harness cannot make the probe and the specification
drift apart. **§17 step 5b's equality rule is satisfiable by correct work.** That was round 1's
Structural complaint and it is closed.

**What is still incomplete: the reader class.** §11 class (c) declares "Non-registry source-text
readers — **one**: `ADAPTER_DECL`". I measured every `.js`/`.mjs` file under `test/`, `tools/` and
`js/` for live (non-comment) references to the five retired identifiers, plus the harness log-name
string literals `'browse.beginHold'` / `'browse.endHold'` that other cells consume. Outside the three
files §11 declares (`js/app.js`, `js/browse.js`, `test/app-harness.js`) there are **nine**:

| File | Live references | Caught by? |
|---|---|---|
| `test/browse-virtual.test.js` | 26 (direct calls on the REAL module) | step 5b clause 3 — suite red |
| `test/swipe-declone-stage2-browse.test.js` | 8 (spies `h.Browse.endHold`, asserts `orig.length`) | suite red |
| `test/swipe-stage6.test.js` | 4 | suite red |
| `test/swipe-gesture.test.js` | 4 (log-name literals) | suite red **only if the fake's log names change** |
| `test/swipe-stage5-wiring.test.js` | 3 (log-name literal) | same |
| `test/browse-empty-after-home-commit.test.js` | 2 | suite red |
| `test/swipe-declone-stage2-subtraction.test.js` | 2 (log-name literal at `:819`) | same |
| `test/swipe-stage6c.test.js` | 2 (log-name literal at `:55`) | same |
| **`tools/gen-swipe-model.mjs`** | 5 (`:246`, `:426`, `:430` — prose inside the generated model) | ⛔ **nothing** |

The eight test files are a loud, cheap build-time discovery: step 5b clause 3 already requires "the whole
suite green", so they cannot ride through. They do not fire the equality halt, because the halt is scoped
to class (a)'s rotted set and class (b)'s scan. **They are a naming gap in §11, not a defect in §17.**

`tools/gen-swipe-model.mjs` is different, and it is the one worth the finding. Its `endHold` /
`dropRowHold` occurrences are prose inside the generated model text, mirrored into
`docs/swipe-model.generated.txt:144` and `:148`. `test/swipe-model.test.js:116` asserts only that the
generated file **matches the generator**. Leave both alone and the suite stays green while a
current-truth model document describes two functions that no longer exist. §11's scrub list names
`PLAN-swipe-reveal.md`, `Subsystems/swipe-reveal.md`, `DecisionLog.md`, `Board.md`,
`Campaigns/swipe-stage7.json` and `tools/mutate.mjs:432-438` — neither of these. That is
`StandardsDocument.md` §6.6's scrub, missed on the first pass, with no gate behind it. This project
already lost nine stages to an unwatched second registry; this is the same shape one surface over.

**Two smaller residuals, both measured, neither blocking.**

1. **The class (b) scan's identifier list omits the session field.** §17 step 5b clause 2 scans `to`
   strings for `dropRowHold`, `takeRowHold`, `beginHold`, `endHold`, `dropHold` — but §5 also renames
   `session.hold` → `session.lease`. Measured: exactly one `to` string injects `.hold`
   (`stage6c G2/G3`), and it also injects `dropRowHold`, so the scan catches it. **The omission costs
   nothing at HEAD by coincidence, not by design** — a future `to` that injects the field alone would
   be invisible to the scan the plan calls "the only thing standing between a re-anchored registry and
   a mutant that kills its cell with a `ReferenceError`".
2. **The headline "twelve" is the number correct work will not produce.** `js/app.js:346-374`,
   `:398-431`, `:1048` and `:1071` name `takeRowHold`, `dropRowHold`, `session.hold` and
   `Browse.endHold` in current-truth explanatory comments. §6.6's scrub covers comments explicitly, so
   renaming them is not optional and the measured set is **thirteen**. §11 and step 5b both admit
   thirteen as an alternative, so nothing halts — but the plan leads with the number that corresponds
   to leaving the comments stale.

**Invariant the plan must satisfy:** the co-change list names every reader the transform touches,
including readers no gate watches, and the records scrub covers generated current-truth documents.
*Recommendation, not a requirement on shape:* one line added to §11 — class (c) becomes `ADAPTER_DECL`
plus `tools/gen-swipe-model.mjs` and its generated `docs/swipe-model.generated.txt`; the eight test
files are named as suite-caught rather than enumerated per-line.

**Acceptance predicate for the amendment:** `grep -rn 'endHold\|dropRowHold' docs/ tools/gen-swipe-model.mjs`
returns nothing after the build, and `docs/swipe-model.generated.txt` is regenerated in the same commit.

Mapped to coverage: F1.

### F2 — Note — defect (resolved) — the release status now has a production consumer, and the test proving the consumer reads it is specified

**Severity: Note. Nature: defect (resolved at round 1's temper; re-verified here).**

Round 1's ruling required two things: *one trace line in `returnLease` reading the recorded status, and
a cell asserting the harness records that line.* Both are present, and I checked the four ways this
kind of repair usually fails rather than accepting the plan's account.

- **Is the consumer real in production, or dev-only?** MEASURED: `index.html:233` loads
  `js/debug.js?v=2026-08-05.2`, and `js/debug.js` is the only definer of `PBDebug` in `js/`. The
  `if (window.PBDebug)` guard is therefore true in the shipped app, not merely in the harness. This is
  a production consumer that actually runs, not a guarded stub that never does.
- **Can the cell see it?** MEASURED: `test/app-harness.js:632` installs
  `PBDebug = { log: (tag, m) => log.calls.push({ name: 'debug', args: [tag, String(m)] }) }` on both
  `global` and `window`. A `PBDebug.log('SWIPE', 'lease released status=' + status + …)` inside
  `returnLease` lands in `log.calls` as `{name:'debug', args:['SWIPE', '…']}` and is assertable by
  message content. `LEASEINVALID`'s fixture asserts exactly that, over the invalidated routes and an
  ordinary commit.
- **Can the new line throw on the path that wedges every future swipe?** MEASURED by reading
  `js/app.js:370-374` and `:1071-1082`: the wrapper's first statement is
  `if (!session || !session.hold) return;`, so `session` is non-null wherever the trace line would sit,
  and the leak-guard call inside the finalize `finally` returns at the guard because the first release
  nulled the field. The trap §5 correctly flags for `keyFor` does not reach here.
- **Is the mutant killable?** `LEASEINVALID`'s `NATURAL-d` — "the trace line stops interpolating the
  status and logs a constant" — reddens the trace clause, because that clause asserts the *message
  carries the status*, not merely that a line was emitted. This is the half that keeps the field from
  silently going dead again, and unlike `MOVERFROZEN`'s `NATURAL-b` (F3) it genuinely can fail.

Engineering Contract §4.15 is satisfied on both halves in the same slice. §11's PolicyLedger entry is
correctly made conditional on D1 and D1 takes the branch that keeps it valid, which discharges round
1's ruling on the plan's own F2.

**One risk the test author should carry into step 3, stated as a READING and not a measurement.**
`LEASEINVALID`'s first route is "a supersession where a second gesture acquires while the first is
still settling and the first then releases". Reading `js/app.js:398-431` and `:1070`, the superseded
session's lease is released by the recovery at `:427`, which runs **before** the successor reaches
`start()`'s acquire at `:500`; and the superseded session's own finalize returns at `:1070`
(`cur !== session`) without releasing. If that reading holds, the supersession route yields `'ready'`,
not `'invalidated'`, and the only production producer of `'invalidated'` is
`invalidateGestureHold` — which is `LEASEINVALID`'s second route and is drivable. **The consumer proof
does not depend on the first route**, so this is not a defect in F2's resolution. Whether the first
route is drivable at all is exit-reachability, which is U1's subject and the adversary's; it is
recorded here so step 3 is not surprised, and it must not be treated as settling U1 in either
direction.

Mapped to coverage: F2.

### F3 — Structural — defect — the repaired clause-3 predicate rests on a property that does not hold at HEAD and the plan does not require, and its own mutant cannot kill

**Severity: Structural. Nature: defect.**

§12's repair adds a `to`-side discriminator to clause 3's `registered` predicate:

```
p.from.includes('Object.freeze(') && p.from.includes('toMover')
  && typeof p.to === 'string' && !p.to.includes('Object.freeze(')
```

The direction is right: it asks whether a registration actually *removes* the construct rather than
merely mentions it. Two things are wrong with it.

**(a) Its soundness argument is stated as verified and is false at HEAD.** §12 says the wrapper-deletion
mutant is "the unique registration whose `from` carries the wrapper and whose `to` does not — verified
against the three re-anchoring candidates, **every one of which keeps `Object.freeze(` on its `to` side**
because each only changes the key set inside the literal." MEASURED — the three `to` strings in the
registry at `5c96f8c`:

```
S2-35 MOVERSHAPE  to: "      const toMover = (m) => ({ el: m.element, base: baseOf(m.slot), own: m.ownership });"
S2-36 MOVERSHAPE  to: "      const toMover = (m) => ({ el: m.element });"
S2-39 MOVERSHAPE  to: "      const toMover = (m) => ({ el: m.element, base: baseOf(m.slot), own: 'borrowed-real' });"
```

**None of the three contains `Object.freeze(`.** They are full-line replacements written against the
unfrozen literal. The property the predicate depends on is therefore not a fact about existing
registrations — it is an **obligation on the builder's re-anchoring edit**, and the plan never states
it. §11 says "Every registration in classes (a) and (b) is re-anchored — `from` AND `to` — in the same
commit", but that sentence exists for class (b)'s identifier injections and names no property of the
`to` text; §17 step 5b checks class (b)'s five identifiers and nothing about the freeze. The minimal
correct-looking re-anchoring — update `from` to the frozen line, leave `to` — makes each of the three
match the repaired predicate as a false wrapper-deletion mutant, `registered` is satisfied with no
genuine one present, and **the exact vacuity round 1 measured returns through a different door**. Worse,
§12's "verified" wording is an active instruction not to check.

**Invariant:** the discriminator must identify the registration that *removes* the construct, and its
soundness must not depend on how a sibling registration's replacement text happens to be written.
*Recommendation, not a requirement on shape:* the cheapest correction is to state the obligation — the
three MOVERSHAPE `to` strings carry `Object.freeze(` after re-anchoring — and add it to §17 step 5b as a
fourth check. A structurally stronger alternative, if the test author prefers it, is a predicate that
compares `to` against `from` with the wrapper removed, which needs no obligation on siblings at all.

**Acceptance predicate for the amendment:** after the build, exactly one registration satisfies
`from.includes('Object.freeze(') && from.includes('toMover') && !to.includes('Object.freeze(')`, and it
is the wrapper-deletion mutant. Executable in four lines against the exported `MUTATIONS`.

**(b) `MOVERFROZEN`'s `NATURAL-b` cannot kill.** The cell registers it as "the repaired predicate's
replacement text clause is deleted so the check reverts to co-occurrence… expected killing cell for BOTH
is `MOVERFROZEN`." Read the assertion it must redden
(`test/swipe-declone-stage2-subtraction.test.js:670-706`): `assert.equal(registered, frozen)`, where
`registered` is a `MUTATIONS.some(…)`. Deleting a conjunct from a `some()` predicate can only move
`registered` from false toward true. In the post-commit state the registry contains the wrapper-deletion
mutant, so `registered` is **already true** and `frozen` is true — the assertion still passes and the
mutant survives. For the cell to redden, `NATURAL-b` must be a **two-part** mutation: weaken the
predicate **and** remove the wrapper-deletion registration. The registry supports exactly that through
`also`, and its own header says two-part mutations exist "because some defects only bite in pairs".

Two facts the test author needs alongside that. MEASURED: no registration targets a `test/*.test.js`
file today — the non-`js/` targets are `test/fixtures/swipe-plan-spec.mjs`, `css/app.css` and
`tools/mutate.mjs` — so mutating a test's own predicate is a new precedent for this registry, though
`MUTUNIQ-a`/`-b` mutating `tools/mutate.mjs` is the closest existing shape. And the cell `NATURAL-b`
must redden lives in the same file it mutates, which is the shape where a check is asked to witness its
own weakening; the two-part form is what makes that possible rather than circular.

**What it costs if built as written.** (b) is loud: `tools/mutation-sweep.mjs` reports a surviving
mutant at step 5a, so the cost is a late round trip — the same place round 1 predicted the build would
stop. (a) is silent: the suite is green, clause 3 passes, and §14's part 2 can go missing exactly as
round 1 described, with the plan now carrying a paragraph explaining why it cannot.

Mapped to coverage: F3.

---

## Coverage

Every blocking finding maps to what would witness it.

- **F1** → `test/mutation-anchors.test.js` (the class (a) instrument, already correct) plus the step-5b
  probe, and — for the ungated half — `test/swipe-model.test.js`'s generated-file comparison, which is
  green either way and therefore is **not** the witness. The witness for the ungated half is the §11
  scrub list naming `tools/gen-swipe-model.mjs` and `docs/swipe-model.generated.txt`, checked by the
  grep predicate stated in F1. No new cell.
- **F2** → `LEASEINVALID`'s trace clause over the harness `PBDebug` capture
  (`test/app-harness.js:632`), with `NATURAL-d` as the mutant that reddens if the line stops reading the
  value. Verified adequate; no change owed.
- **F3** → `MOVERFROZEN`, plus clause 3 of `test/swipe-declone-stage2-subtraction.test.js:670-706`. The
  repaired predicate must isolate the wrapper-deletion mutant without depending on sibling `to` text
  (F3a), and `NATURAL-b` must be two-part so the cell can actually redden (F3b).

---

## Prediction — where this breaks in execution if built as written

The builder applies the transform, measures twelve rotted `from` anchors against a declared twelve, and
step 5b passes on class (a) and class (b). Then the suite goes red in eight test files nobody declared;
that costs an hour and is recoverable, because the failures name their own lines. `tools/gen-swipe-model.mjs`
stays green and `docs/swipe-model.generated.txt` keeps describing `dropRowHold` and `endHold` after both
are gone — found, if ever, by the next person who reads the model document and cannot find the functions
in the source.

The three MOVERSHAPE registrations are re-anchored the minimal way, `from` only. Clause 3 goes green
because `S2-36`'s `to` now looks like a wrapper deletion. The suite is green, the plan says the pairing
is enforced, and §14's part 2 is defended by a predicate that would pass without it — which is precisely
the state round 1 measured and this revision was written to leave behind.

`MOVERFROZEN`'s `NATURAL-b` is executed at step 5a and survives. The sweep reports it, the builder
returns to the plan, and the round trip lands at the same late step round 1 predicted for a different
reason.

Nothing in F1, F2 or F3 threatens the scope determination, which I re-derived in full at round 1 and
did not re-strike here. The plan is close: three sentences and one two-part mutation separate it from a
forge.

---

## Handoff

- **Verdict:** TEMPER. F1 repaired with a Weak residual; F2 repaired; F3 not repaired, two Structural
  defects.
- **Next owner: the planner**, for a bounded amendment confined to the three edits named above — §11's
  class (c) and scrub list (F1), §12's `to`-side obligation plus a fourth step-5b check (F3a), and
  `MOVERFROZEN`'s `NATURAL-b` as a two-part mutation (F3b). **Then the adversary**, for §17 step 2 (U1),
  which is unchanged by this round.
- **Round 3 is not owed** if the amendment is confined to those three edits. Each carries an acceptance
  predicate that is executable without a reading pass, and re-reading a bounded amendment buys nothing
  this seat has not already stated.
- **U1 is untouched.** It remains an open unknown owned by the adversary. My round-1 walk of the exits
  is a reading and must not be treated as confirmatory; nothing in this round weakens the adversary's
  strike, and F2's supersession-route note is an input to it, not an answer.

---

## Outside scope, surfaced not struck

Recorded for the dispatcher to route. Neither was struck, and neither bears on the verdict.

1. **`LEASEINVALID`'s supersession route may be undrivable.** Detailed at the end of F2. It is exit
   reachability, which is U1's subject; it is an input for the adversary at step 2 and for the test
   author at step 3.
2. **`test/swipe-model.test.js` cannot detect prose rot in the model it guards.** Its comparison is
   generator-versus-generated, so both drifting together is green by construction. That is a gap in a
   gate this stage merely happens to expose, not a defect in this plan — but it is the mechanism behind
   F1's ungated half and it will outlive stage 7. Owner if pursued: the coverage auditor.
