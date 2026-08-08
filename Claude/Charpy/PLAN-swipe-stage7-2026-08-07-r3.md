# Charpy — PLAN-swipe-stage7.md, round 3 (the verdict of record)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:346-374","js/app.js:700-717","js/app.js:1033-1056","js/app.js:1087-1097"],"callee_ranges":["js/browse.js:159-223","js/browse.js:242-248"]} -->

Artifact: `Claude/Plans/PLAN-swipe-stage7.md` as it stands at HEAD `592ad49`.
Prior rounds: `Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r1.md` (TEMPER, filed `5c2c065`) and
`Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r2.md` (TEMPER, filed `c2369f8`).
Date: 2026-08-07.

**Why this round exists.** Round 2 waived round 3 *on a condition* — that the amendment stay confined
to three named edits — and the condition was never verified by this seat. The plan then recorded the
condition as satisfied on its own authority. A waived round whose condition nobody checked leaves the
plan with **no verdict of record**. This round verifies the condition, reviews the two plan changes
filed since, and issues the verdict.

**State measured before and after, in the repo, tree clean throughout.** HEAD `592ad49`;
`main == origin/main`; `git status --porcelain` empty; no `*.mutbak` or `*.sgbak` anywhere;
`MUTATIONS.length` = **163**; suite **937 tests / 936 pass / 0 fail / 1 skipped** (count read from
`# tests`, not inferred; run with the checker's own exit status captured, never a pipe's).
`js/app.js` = 3112 lines, `js/browse.js` = 975.

---

## Verdict

verdict: **TEMPER.** One Structural finding, and it is the only thing between this plan and a forge.

**The round-2 amendment stayed confined, and every substantive claim it added is measured true at 163.**
That question is closed by execution, not by reading (below). Round 2's waiver was honoured.

**What blocks the forge is not the amendment. It is what the tree did underneath the plan.** The
settle-window nav-stack slice gave a commit a **third** outcome, and §13's Coverage Model — dimensions
4 and 3 — still enumerates the two that existed when it was written. §18 measures the discrepancy and
routes the *cell* question to the coverage auditor, which is correct; but §13's own text remains the
prescription the test author reads at the very next step, and it is false against HEAD. A plan whose
Coverage Model asserts a matrix the source contradicts does not pass temper.

**One further correction belongs on this record and is mine, not the planner's.** Round 2's F3b
prescribed a two-part mutation for `MOVERFROZEN`'s `NATURAL-b`. The planner executed it, measured that
it also survives, and substituted a registry-side mutant. **I re-executed both forms and the planner is
right: the round-2 prescription was the defective one.** That is a reviewer proposal failing the
standard it imposed, caught by the seat downstream of it.

**No conditional waiver is issued in this round.** Round 4 is owed, scoped to §13 dimensions 3 and 4;
it is a single-section read. The cost of the alternative is already in this record.

---

## Applicability

| Pattern | Value | Reason |
|---|---|---|
| `defining_records` | **true** | The plan, its two prior casebooks, the adversary's strike, `tools/mutate.mjs`, the `LANDEDPAGESHOWS` cells and `test/swipe-navstack-settle.test.js` all materially define whether this plan's Coverage Model and co-change set are true at HEAD. Reconciled below. |
| `boundary_relocation` | **false** | No code moves between modules; the plan's own declaration says so and I re-confirmed it by reading both files at `592ad49`. `beginHold`/`endHold`/`dropHold` are in `js/browse.js`; the wrappers are in `js/app.js`. No ledger is owed. |
| `callee_replacement` | **true** | The plan still replaces `Browse.endHold` with `Browse.finishGestureHold` and promotes `dropHold` to `invalidateGestureHold`. Callee ranges declared and re-read at HEAD; both files are byte-unchanged since `c2369f8`. |
| `contract_shape` | **true** | `js/browse.js:964` still loses two exported names and gains one. |

**Declared-range completeness reason.** This round's subject is scope and currency, so the ranges
declared are the ones §18's findings and my F1 actually turn on: `js/app.js:346-374` (the wrapper pair
and the single landed-descriptor read), `js/app.js:700-717` (the `applies` binding and the guarded
stack mutation — the third arm), `js/app.js:1033-1056` (the release site and the three-branch screen
application), `js/app.js:1087-1097` (the finalize `finally` and its leak-guard release). The
acquire site (`js/app.js:500`) and the recovery release (`:427`) are outside these ranges and are
unchanged in identity — measured, not assumed. I did **not** re-derive §3's ten inheritance rows; they
were re-derived in full at round 1, every one held, and re-striking them is churn the user has ruled out.

**Adapter-visible items, named so no check passes by omission.**

- **Session `d.<field>` crossings inside the declared ranges: none.** MEASURED — the four ranges use
  `session.` and `cur.` scoping (`session.hold`, `cur.movers`, `cur.from`, `cur.dest`, `cur.dir`,
  `cur.newNav`, `cur.id`, `cur.scroll0`), and a `d.`-scoped extraction over all four returns empty.
- **`document.body.classList` mutation inside a declared range: none.** MEASURED — empty over all four.
- **`removeAttribute('data-*')` pre-mount effect: none** in any declared range at `592ad49`.
- **Callee `classList` tokens inside `js/browse.js:159-223`: `parked` and `hidden`.** Both are toggled
  by the replaced callee on shared `.browsepage` elements and both survive the replacement on the same
  layer; §8 of the plan assigns each. `js/browse.js:242-248` (`dropHold`) toggles **no** class token —
  it clears `holdRows`, bumps `holdGen`, clears `heldRepaints` and releases the scroll suspension.
- **Exact-key contract gate.** `test/contract-function-gate.test.js` governs the `Swipe.*`
  `CONTRACT`/`NON_CONTRACT` exact-key classification and does not reach `js/browse.js`. The gate over
  the new Browse surface is `LEASECONTRACT` (§13). Unchanged since round 2 and not re-struck; stated
  because a contract-shape change must state its gate impact.

---

## Defining records

| Record | Bears on | Call |
|---|---|---|
| `Claude/Plans/PLAN-swipe-stage7.md` §13 (Coverage Model) vs. `js/app.js:706-717`, `:1047-1056` | whether the plan's landing matrix is true at HEAD | **CONFLICT, and it is material.** §13 dimension 4 states the matrix over "both the commit and the abort outcome"; HEAD has three outcomes. Dimension 3 states supersession as the one permitted interleaving; the settle-window navigation is a second. See F1. |
| `Claude/Plans/PLAN-swipe-stage7.md` §18 vs. §13 | the same fact, inside one artifact | **CONFLICT, unresolved by the artifact.** §18.3(1) records three arms; §13 still states two. The status block's supersession clause covers *line citations* in §1–§17, not prose enumerations, so nothing in the plan resolves this. See F1. |
| `tools/mutate.mjs` (163 entries at `592ad49`) | §11's co-change set and §12's predicate | **AGREE — re-measured independently, control first.** Class (a) = 10 + 3 `toMover` = thirteen, by the same names §11 lists; class (b) = nine, same names; exactly one `to` injects `.hold` (`stage6c G2/G3`); none of the three `MOVERSHAPE` `to` strings contains `Object.freeze(`. §18.3(3) reproduces exactly. |
| `Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r2.md` F3b vs. `test/swipe-declone-stage2-subtraction.test.js:693` | `MOVERFROZEN`'s `NATURAL-b` | **CONFLICT, resolved AGAINST the reviewer.** MEASURED: the two-part form round 2 prescribed leaves `registered` true and the assertion passing — the mutant survives. The registry-side form the plan substituted reddens. See the confinement audit. |
| `Claude/Loki/STRIKE-swipe-stage7-lease-exits-2026-08-06.md` (HELD STONE) vs. the slice | whether the slice invalidated the strike | **AGREE — it did not, and I re-measured rather than accepting §18's word.** The slice adds 29 lines to `js/app.js` and **zero** contain a `return` token (oracle proven able to fire on a synthetic control); every hunk lands at `350`, `699→712`, `702→713`, `1022→1033`, `1032→1043`, all inside the comment block or `runFinalize`; the acquire (`:500`) and all three releases (`:427`, `:1037`, `:1095`) are unchanged in identity. Not re-litigated. |
| `Claude/Plans/PLAN-swipe-navstack-settle-window.md` (amended at `a630d40`) | whether `a630d40` is a change to this artifact | **NOT AN AUTHORITY OVER THIS ARTIFACT.** MEASURED: `a630d40` changes exactly one file and it is not this plan. See the confinement audit. |
| `test/swipe-declone-stage2-browse.test.js` (the `LANDEDPAGESHOWS` cells) + `test/swipe-navstack-settle.test.js` | whether the third arm is already covered at the lease boundary | **GAP.** The `LANDEDPAGESHOWS` cells drive commit and abort only. `NAVRECONCILE` drives a stack-superseded settle, but reads the landed screen from the classes `js/nav.js` writes — not through the hold release. No cell drives a superseded descriptor into the reconciliation. See F1. |

---

## Callee behaviour across the replacement (`js/browse.js:159-223`, `:242-248`)

Both ranges are **byte-unchanged since `c2369f8`** (`git log c2369f8..HEAD` on `js/browse.js` returns
no commit), so round 2's full trace stands and is not repeated. Re-confirmed at `592ad49`: the early
return at `:166` is `token !== holdGen || !holdRows` — two conditions, and the second is what makes a
second call with a live token inert. The order is flag-clear → scroll-suspension release → landed key
→ deactivate loop → `parked` removed / `hidden` set on every non-landed page → landed activate+realize,
else the fallback branch → deferred-repaint replay → status. `dropHold` (`:242-248`) performs none of
those effects and touches no class token.

**What changed is not the callee, it is the ARGUMENT.** The slice did not touch this range; it changed
what `currentDesc()` returns at the call site on one arm. That is the whole of F1, and it is why F1 is
a Coverage Model finding rather than a callee-behaviour finding.

---

## The confinement audit — did the round-2 amendment stay within its three edits?

**Answer: YES. Judged by scope, not by craft already judged.**

`734b393` changes exactly one file, `Claude/Plans/PLAN-swipe-stage7.md`, in **14 hunks**. Every hunk
traces to F1, F3a, F3b, or bookkeeping those three force:

| Hunk region | Traces to |
|---|---|
| status block rewrite | bookkeeping for all three (one defective sentence — F2 below) |
| §11 transform table emphasis 12 → 13; class (a) restated as thirteen | F1 |
| §11 `MOVERSHAPE` `to`-side warning | F3a cross-reference |
| §11 class (c) one → three; the eight suite-caught test files; the build-time grep predicate | F1 |
| §11 scrub list: generated document, three comment sites, the decision-log correction | F1 |
| §12 "verified" wording removed; the new **OBLIGATION** subsection with its measured table | F3a |
| §12 the new `NATURAL-b` subsection with its measured table | F3b |
| §13 `MOVERFROZEN` cell row rewritten | F3b |
| §15 R7 mitigation cell | F3a + F3b cross-reference |
| §17 step 1 state, step 5b headline, clauses 1–4, exit condition, handoff order | F1 + F3a + F3b consequences |

**Nothing outside that set moved.** §3 (the scope determination and its ten inheritance rows), §5, §6,
§7, §8, §9, §10, §14 and §16 are untouched by the diff; §15 changed one cell. The user's stated concern
— that the scope determination stay settled — is satisfied by measurement, not by assurance.

**Two places the amendment went past round 2's literal words. Both are admissible, and I say why.**

1. **Class (c) grew to three items where F1 named two.** F1's recommendation was explicitly labelled
   *recommendation, not a requirement on shape*, over an invariant that says the list must name **every**
   reader the transform touches, including readers no gate watches. The added third item — three
   comment-only files — is inside that invariant, and I MEASURED it true rather than accepting it: a
   word-boundary sweep of `js/`, `test/` and `tools/` for the five retired identifiers returns
   **exactly sixteen files**, and after removing the three declared source files, `tools/mutate.mjs`,
   `tools/gen-swipe-model.mjs` and the eight live-reference test files, the remainder is exactly
   `js/virtuallist.js`, `test/parked-page-rides-home-browse.test.js` and `test/swipe-model.test.js` —
   the three the amendment names, at the lines it names. The eight suite-caught files are the same eight
   round 2 measured.
2. **F3b's prescription was overturned, and the plan is right.** Round 2 prescribed a two-part mutation
   (weaken the predicate **and** remove the wrapper-deletion registration). MEASURED over the exported
   `MUTATIONS` at 163, `frozen` true throughout, control first:

   | Applied mutation | `registered` | `assert.equal(registered, frozen)` |
   |---|---|---|
   | **CONTROL — repaired predicate over the obligated registry** | true | passes, correctly |
   | one-part: the `to`-side clause deleted | true | **passes — mutant SURVIVES** |
   | **two-part (round 2's own prescription)** | true | **passes — mutant SURVIVES** |
   | the wrapper-deletion registration removed, predicate intact | **false** | **fails — cell REDDENS** |
   | **the wrapper-deletion registration STOPS REMOVING the wrapper** | **false** | **fails — cell REDDENS** |
   | the same, under the pre-repair co-occurrence predicate | true | passes |

   The oracle is proven able to fail: two rows redden. Round 2's prescription was wrong for the reason
   the plan gives — both halves of the pair push `registered` in the same direction as the assertion.
   Substituting a form that works is not a departure from F3b; it is F3b discharged correctly.

**§12's obligation table also reproduces exactly at 163**, control first: repaired-predicate matches
over the untransformed registry = **0** (and 0 under the co-occurrence form); minimal re-anchoring
(`from` only) = **3**, and they are `S2-35`, `S2-36`, `S2-39 MOVERSHAPE`, every one a false
wrapper-deletion; obligated re-anchoring plus the wrapper-deletion mutant = **1**, and it is the
wrapper-deletion mutant. §12's OBLIGATION stands and §17 step 5b check 4 is the right home for it.

### `a630d40` — not a change to this artifact

MEASURED: `a630d40` changes **one** file, `Claude/Plans/PLAN-swipe-navstack-settle-window.md`. It does
not touch `PLAN-swipe-stage7.md`; the plan's own file history since round 2 is `734b393` then `747cf58`
and nothing else. So the §4.1 and §13 it amends are the *settle-window* plan's sections, not this
plan's. **My call: `a630d40` is out of scope as an amendment to the artifact under verdict.** Its only
bearing on this artifact is through the code the settle-window slice shipped, and that bearing is
entirely what §18 measures — which I verified independently above and in F1 below.

### `747cf58` (§18) — reviewed, and every figure reproduces

I re-derived §18's coordinates against the constructs rather than by offset, and independently
re-ran its registry measurement:

| §18 claim | Measured at `592ad49` |
|---|---|
| `js/app.js` 3096 → 3112 | **3112** |
| shift regimes 0 / +11 / +16 from two expansion hunks | hunks `@@ -350,5 +350,5 @@`, `@@ -699 +699,12 @@`, `@@ -702 +713 @@`, `@@ -1022,4 +1033,4 @@`, `@@ -1032 +1043,6 @@` — **confirmed** |
| the nine `vitruvius-gate` coordinates, two moved | all nine read at the named construct: `346`/`374`, `424`/`428`, `499-500`, **`1033`/`1037`**, **`1087`/`1097`**, `browse.js` `117`/`140`, `242`/`248`, `960-968`, `159`/`223` — **confirmed** |
| `js/browse.js:964` is the export line | `beginHold, endHold, pageElFor,` — **confirmed**, and §18.3(7)'s note that the literal is `963-969` is correct |
| class (a) thirteen / class (b) nine / one `.hold` injector | **13 / 9 / 1**, by the same names |
| the three `MOVERSHAPE` `to` strings carry no `Object.freeze(` | **none** — F3a's obligation stands |
| `grep -rn 'endHold\|dropRowHold' docs/ tools/gen-swipe-model.mjs` | **six lines in two files**, at `docs/swipe-model.generated.txt:144`, `:148` and `tools/gen-swipe-model.mjs:244`, `:246`, `:426`, `:430` — the declared coordinates |
| the six mover-touching sites are the same six | `.movers` at `:542`, `:543` (construction) and `:557`, `:578`, `:604`, `:617`, `:712`, `:1099` — **identical set**; no assignment terminating at depth 1 on a mover-rooted expression |
| the slice adds zero `return` tokens | **zero**, oracle proven able to fire |

§18 is sound work and I am not re-striking it. What it does not do — because it says so itself — is
change §13.

---

## Findings

### F1 — Structural — defect — §13's Coverage Model enumerates a commit/abort matrix that HEAD contradicts by one arm, and the same arm is missing from dimension 3

**Severity: Structural. Nature: defect.**

**MEASURED at `592ad49`.** `js/app.js:706-709` binds

```
const applies = commit && currentDesc() === cur.from
  && (cur.dir === 'back' ? navStack.length > 1
    : cur.newNav ? true
      : fwdStack[fwdStack.length - 1] === cur.dest);
```

and `:713-717` guards the stack mutation behind it, while `:1047-1056` is now **three** branches:
`if (applies) …` / `else if (commit) … // stack-superseded` / `else …` (abort). The source comments
this plan quotes were rewritten to say so, at `:350-354` and `:1033-1036`: *"on an APPLIED commit
currentDesc() already reads the settled destination here; on a stack-SUPERSEDED commit the mutation was
skipped, so it instead reads whatever screen a newer navigation already reached."*

`currentDesc()` is the value handed to `finishGestureHold` — §6 F3 calls it *the single read of the
landed screen (Invariant D6)*, and it selects the branch at `js/browse.js:172`. So on the third arm the
descriptor crossing the new boundary names **a screen that is not this gesture's destination.**

**§13 dimension 4 states the matrix as "the landed descriptor's two branches … on both the commit and
the abort outcome", and prescribes "Retained by the existing `LANDEDPAGESHOWS` cells … no new cell."
The second axis of that matrix has three values at HEAD, not two.** The same arm is missing one
dimension over: **dimension 3** states *"the interleaving the design permits is supersession: a second
gesture acquiring while the first is settling"* — the settle-window navigation is a second permitted
interleaving, and it is the one that produces the third arm. (Dimension 8 does list "a mid-gesture nav
tap" as a `LEASEPAIRED` composition, which is why this is an enumeration gap and not a blind spot.)

**Why this is not discharged by §18.** §18.3(1) measures the discrepancy honestly and says *"whether
the third arm owes a cell is the coverage auditor's call and is not decided here."* **The cell question
is the auditor's and I agree.** What is not the auditor's is §13's own prose, which is the plan's, and
which the test author reads at step 3 — the very next craft step. The artifact currently states the
matrix two ways in two sections and resolves neither; the status block's supersession clause covers
*line citations in §1–§17*, not prose enumerations, so nothing closes it.

**The gap is real at the lease boundary, and I measured how wide.** The retained `LANDEDPAGESHOWS`
cells (`test/swipe-declone-stage2-browse.test.js:324`, `:361`, `:419`) drive commit and abort only.
`NAVRECONCILE` (`test/swipe-navstack-settle.test.js:466`) does drive a stack-superseded settle — but it
reads the landed screen from the classes `js/nav.js` writes, not through the hold release. **No cell
drives a superseded descriptor into the reconciliation.** So dimension 4's "no new cell" rests on a
two-arm matrix, and the arm where the descriptor is surprising is the one unexercised.

**Nothing in stage 7's own change alters the behaviour** — the rename and the status carry the
descriptor through unchanged, and the suite is green at HEAD. This is parity, not a new defect. It is a
Coverage Model that is short one arm, stated as complete.

**Invariant the plan must satisfy:** the Coverage Model's landing matrix enumerates every outcome the
source produces at the commit it will be built against, and the interleaving dimension names every
interleaving the design permits. *Recommendation, not a requirement on shape:* dimension 4's cell names
three outcomes (applied commit, stack-superseded commit, abort) and states explicitly whether the third
arm is discharged by retained cells or routed to the coverage auditor; dimension 3's cell names the
settle-window navigation beside supersession. The cell decision itself stays the auditor's.

**Acceptance predicate for the amendment:** §13 dimension 4's "Applicable?" and "What the suite must
prove" cells name three outcomes and §13 dimension 3 names two interleavings — checkable by reading two
table cells, with no re-measurement.

Mapped to coverage: F1.

### F2 — Weak — defect — the plan certifies another seat's condition on its own authority

**Severity: Weak. Nature: defect.**

The status block reads *"The reviewer waived round 3 on the condition that the amendment stay confined
to its three edits, and it did"*, and §17 step 1's state cell reads *"Round 3 is NOT owed: the reviewer
waived it on condition the amendment stay confined to F1, F3a and F3b, and it did."* Both sentences
state a review seat's condition as satisfied, in the voice of the seat that had to satisfy it. **The
condition happened to be true — this round measured it — but the record could not have shown that, and
the board then propagated a "FORGED" status this plan never carried.** A conditional waiver whose
condition is self-certified is the mechanism that produced this round.

**Invariant:** a plan's status states which review artifact carries its verdict and what that verdict
is; it does not assert on its own authority that a reviewer's condition was met.
*Recommendation, not a requirement on shape:* the status block and §17 step 1 cite this casebook and
its verdict, and the "and it did" clauses are removed.

**Acceptance predicate for the amendment:** neither the status block nor §17 step 1 contains a clause
asserting a reviewer's condition satisfied; both name `PLAN-swipe-stage7-2026-08-07-r3.md` and its
verdict token.

Mapped to coverage: F2.

### F3 — Note — defect — two stated measurement INPUTS are stale, one of them undisclosed

**Severity: Note. Nature: defect.**

§11 states *"Registry size at measurement: 152"* and *"the registry is 152 entries"*; `MUTATIONS.length`
is **163**. §18.3(3) discloses this and re-measures the derived figures true, which I reproduced
independently — the derived figures are fine and **membership is identical**; the stale text is the
input.

**Undisclosed sibling, found by sweeping the class rather than the sentence §18 flagged:** the status
block states *"Suite at `8d0bc67`: **900 tests / 899 pass / 0 fail / 1 skip**"*. MEASURED at `592ad49`:
**937 / 936 / 0 / 1**. Same class, same fix, not named by §18.

**Invariant:** a stated measurement input matches the tree the plan will be built against, or is marked
superseded where it stands. *Recommendation:* both figures updated in place when §13 is amended.

Mapped to coverage: F3.

### F4 — Note — defect — §3 row 2's deferred subjects grew arms; the deferrals and their consumers are unaffected

**Severity: Note. Nature: defect.**

MEASURED, confirming §18.3(2): `commit.stackEffect` is no longer three unconditional branches — they
are guarded by `applies` (`js/app.js:713-717` behind `:706-709`); `commit.screen`/`commit.scroll`/
`abort.scroll` are no longer one line — they are three branches at `js/app.js:1047-1056`. §3 row 2's
description of the subjects is short by that much.

**Disposition: no bearing on the verdict.** §16 defers these as finalization DECISIONS against a
resource BOUNDARY stage, and names the consuming slice for each; a larger subject does not change the
deferral, the reason, or the consumer. Recorded so a future plan reviving row 2 sizes it correctly.

Mapped to coverage: F4.

---

## Coverage

Every finding maps to what would witness it.

- **F1 (blocking)** → the witness is `test/swipe-declone-stage2-browse.test.js`'s `LANDEDPAGESHOWS`
  cells (`:324`, `:361`, `:419`), which drive commit and abort and **are green either way on the third
  arm** — so they are *not* the witness for the gap. `test/swipe-navstack-settle.test.js:466`
  (`NAVRECONCILE`) drives the stack-superseded settle but reads the landed screen from `js/nav.js`'s
  classes, not through the hold release, so it is not the witness either. **The witness is the §13 text
  itself**, under the acceptance predicate stated in F1 — two table cells, read. Whether a new cell is
  owed at the lease boundary is the coverage auditor's decision at step 7 and is not decided here.
- **F2** → no runtime surface. The witness is the status block and §17 step 1 against F2's predicate.
- **F3** → no runtime surface. The witness is `MUTATIONS.length` (163) and the suite header
  (`# tests 937`), both executable in one command each.
- **F4** → no change owed; recorded only. `js/app.js:713-717` and `:1047-1056` are the citation.

---

## Prediction — where this breaks in execution if built as written

The test author takes §13 at its word, authors `LEASEPAIRED`, `LEASEINVALID`, `LEASEORDER`,
`LEASECONTRACT` and `MOVERFROZEN`, and discharges dimension 4 by retaining the `LANDEDPAGESHOWS` cells
— two outcome arms, exactly as the table says. The builder ships green. Step 5b's four checks pass,
because §11 and §12 are correct and I have measured them so. The code review passes, because nothing in
the diff is wrong.

**Step 7 is where it stops.** The coverage auditor reads dimension 4 against `js/app.js:1047-1056`,
finds the third arm, and has to decide whether the lease boundary owes a cell on a commit whose landed
descriptor names a foreign screen — with the plan's own model asserting two arms as complete and the
suite green. That is a re-opened Coverage Model after the build has landed, which is the most expensive
place in this sequence to find an enumeration short, and enumerations are where every one of this
campaign's defects has lived.

The second, quieter cost is F2's: a future session reads "round 3 is NOT owed … and it did", believes
the plan carries a clean verdict, and files a campaign manifest whose plan-review gate has nothing to
point at. That has already happened once; it is why this artifact exists.

Nothing in F1–F4 threatens §3's scope determination, the contract shape, the ordering requirements, the
co-change set, §12's freeze pairing, or the adversary's strike. **The plan is one table cell from a
forge.**

---

## Handoff

- **Source artifact:** `Claude/Plans/PLAN-swipe-stage7.md` at `592ad49`.
- **Verdict: TEMPER.** One Structural finding (F1), one Weak (F2), two Notes (F3, F4).
- **The round-2 waiver was honoured.** `734b393` stayed confined to F1/F3a/F3b and their forced
  bookkeeping — measured hunk by hunk — and every substantive claim it added reproduces at 163. Round 2
  is closed, correctly applied.
- **`a630d40` is not a change to this artifact** — it amends `PLAN-swipe-navstack-settle-window.md`.
- **`747cf58` (§18) is sound**; every coordinate and every registry figure re-derived and reproduced.
- **§18's three findings, disposed:** (1) the third commit arm **bears on the verdict** and is F1 —
  §18 correctly routes the *cell* to the coverage auditor, but §13's own text is the planner's and is
  false at HEAD; (2) §3 row 2's grown subjects **do not bear** — F4, Note; (3) the 152 → 163 registry
  input **does not bear** on the derived figures, which I re-measured true with identical membership —
  F3, Note, with one undisclosed sibling (the suite count) added.
- **Next owner: the planner**, for one bounded amendment — §13 dimensions 4 and 3 (F1), the two
  self-certifying clauses (F2), and the two stale figures (F3). F4 needs no change.
- **Round 4 IS owed**, scoped to §13 dimensions 3 and 4 and the two status sentences. **No conditional
  waiver is issued** — this round exists because the last one was never checked, and a second waiver
  would recreate the defect. Round 4 is a single-section read against F1's, F2's and F3's stated
  acceptance predicates.
- **Then, unchanged: the test author → the builder → the code reviewer → the coverage auditor.** The
  adversary's step is discharged; the strike returned HELD STONE and the slice did not disturb it
  (measured, not assumed).
- **Records that need the assistant, not me:** §17 step 2's state still reads "owed" and the status
  block still names the adversary as the next seat, while the strike is filed and returned. The board,
  the decision log and the campaign manifest are outside this seat's write surface.
- **U1 is resolved by execution and stays resolved.** Nothing in this round touches it, and my round-1
  walk of the exits remains a reading that must not be treated as confirmatory of anything.
