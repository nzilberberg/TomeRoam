# Charpy — PLAN-swipe-navstack-settle-window.md, round 3

Type: plan-review
Artifact: `Claude/Plans/PLAN-swipe-navstack-settle-window.md` (ROUND-2 TEMPER APPLIED, filed by the planner 2026-08-06 at `7d44127`)
Round 1: `Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r1.md`, verdict TEMPER, reviewed at `13a97b0`
Round 2: `Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r2.md`, verdict TEMPER, reviewed at `decfbd9`
HEAD at review: `9a12a34f1c281b66f88e4b3d669bf4ab7151b60f`, `main` == `origin/main`, tree clean, no `*.mutbak`
HEAD moved during the review (`7d44127` → `9a12a34`); `git diff --name-only 7d44127 9a12a34` names **`Claude/Zelda/Board.md` only**, so every figure below stands at the new HEAD.
Suite at review, count read from the runner: **916 tests / 915 pass / 0 fail / 1 skip**, `node --test "test/*.test.js"`
`tools/mutate.mjs` at HEAD, counted by importing the module: **152** registrations across **161** anchor parts
Date: 2026-08-06

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:350-356","js/app.js:698-707","js/app.js:1022-1032"],"callee_ranges":[]} -->

---

## Verdict

verdict: **FORGE.** The plan is cleared to build as written. No amendment is required and no
round 4 is owed.

All four round-2 dispositions hold under independent re-derivation, control first, by execution
rather than reading. Every cell of §5's seven-build × three-drive table reproduces exactly, including
the one this round exists to judge: at HEAD drive T lands **`playback`**, its control lands
`general`, and `NAVTOTAL-b` is the only predicate build that reproduces the wrong landing. F10's
two figures reproduce against the two tree states §13 5b now names — **1** and **0** — and the split
makes the rule satisfiable by correct work in both halves. F11's drive B′ produces **1** recorded
throw at HEAD against its control's **0**, through the shipped `#dgBack` listener, driven and not
merely read. F12's non-uniqueness subtest is green on the pristine and built trees (6/6, count read
from the runner) and **red** on the nested-block writing, with `M1NOWRITE` and `S2-24 ABORTNORENDER`
each named NON-UNIQUE at 2 occurrences.

**The judgement this round was asked for, and the bar it was held to.** Round 2 reversed the plan
because `NAVTOTAL`'s source-only status rested on a measurement over three drives and a conclusion
about all reachable drives. The same bar applies to what survives: `NAVTOTAL-a`. I did not argue it
this time either. I ran an **exhaustive search over sequences of shipped controls** inside the settle
window — ten controls, every sequence up to length 3, across three fixtures including the shallowest
stack a back gesture can arm on — comparing the specified predicate against `NAVTOTAL-a` on landed
screen, `nav=` token and recorded throws. **2333 sequences, zero difference.** The same machinery,
unchanged, finds `NAVTOTAL-b`'s killer at length 2 (8 witnesses, drive T among them) and
`NAVSTALE-a`'s at length ≤2 (98 witnesses), so a null result is a real negative and not a blind
instrument. `NAVTOTAL-a`'s source-only status is honest, and its label — indistinguishable across the
drives this plan constructs, never a claim about all reachable drives — is now *weaker* than what I
measured, which is the correct direction for it to err.

**The one openly-stated residual was struck directly and survived.** §13 names §12's
closure-under-composition question as this seat's target. I built an oracle for it — under the
specified predicate, `nav=applied` claims the stacks still describe the planned navigation, so the
landed screen must be the one the no-interference control lands — proved it able to fail (7 firings
on `NAVTOTAL-b`), and ran it over 2333 sequences on the specified predicate. **Zero
mis-classifications, zero recorded throws.** That does not prove closure and the plan does not claim
it does; it bounds the residual with a measurement where the plan had only a reading.

Two findings, F13 and F14. **Neither blocks and neither requires a plan edit** — both are recorded
so the next reader does not re-derive them.

---

## Applicability

| Pattern | Value | Reason |
|---|---|---|
| `defining_records` | **true** | The subsystem addendum, the Engineering Contract, the stage-7 plan, the mutation registry and the generated model all bear on this amendment and are reconciled below. |
| `boundary_relocation` | **false** | No code moves between modules or ownership boundaries. All three executable edits are inside `runFinalize` in `js/app.js`; `navStack`/`fwdStack` stay module-local to the same IIFE (`js/app.js:125-127`, re-read at this HEAD). Unchanged from rounds 1 and 2. |
| `callee_replacement` | **false** | No call is replaced by an indirection. The change moves the *argument value* one existing callee (`Browse.endHold`, via `dropRowHold()`) receives on one new path; the callee's own body is untouched, so no callee range is declared. Round-1 F6 settled this and the plan's Applicability row states it correctly. |
| `contract_shape` | **false** | No exported shape, contract object, descriptor member or return value changes. `applies` is a function-local `const`; the `nav=` token is a substring of an existing diagnostic line. |

**Declared-range completeness reason.** I declare the plan's own three ranges — `js/app.js:350-356`,
`698-707`, `1022-1032` — unchanged from round 2, because no source text moved between `decfbd9` and
this HEAD (`git diff --name-only decfbd9 9a12a34` names two records and nothing else). `698-707`
contains the whole edit-1+3 replacement and the `const dest = currentDesc();` the ordering rule pins;
`1022-1032` contains edit 2 and the sibling comment scrub; `350-356` contains the `dropRowHold`
declaration sentence the change falsifies.

**Adapter-visible items, named so no check can pass by omission.** Extracted by an executed scan of
exactly those three line ranges at this HEAD, not carried forward from round 2.

- Session fields crossing the declared ranges — the session object is `d` at construction
  (`js/app.js:449`) and `cur` at the settle site, so these are the same `d.<field>` set:
  `d.dest`, `d.dir`, `d.from`, `d.id`, `d.movers`, `d.newNav`. The plan adds **no** session field;
  `applies` is a function-local binding.
- `document.body.classList` mutation inside a declared range: **none exists** at HEAD — executed
  scan returns 0. Named explicitly so a later silent addition cannot pass unremarked.
- `removeAttribute('data-*')` pre-mount effect inside a declared range: **none exists** at HEAD —
  executed scan returns 0.
- Callee `classList` tokens: not applicable — `callee_replacement` is false, no callee range
  declared. The executed scan also finds **no** `classList` token of any kind in the declared ranges.
- Exact-key contract-gate reference: not applicable — `contract_shape` is false.

---

## Defining records

| Record | What it materially defines | My call |
|---|---|---|
| `Claude/Subsystems/swipe-reveal.md` items 3, 12, 13 | Stack authority; commit behaviour; the recovery dichotomy | **AGREE, unchanged from rounds 1 and 2.** The scrub disposition and the third recovery outcome stand; the round-2 amendment did not disturb them. |
| `Claude/EngineeringContract.md` §4.6, §4.12, §4.15 | Stale-continuation duty; identity discipline; no dead fields | **AGREE.** §4.12 is defended by `NAVIDENT-a`, re-measured here: the `.v` weakening lands drive I on `home` (wrong) while the specified predicate lands it on `browse`. §4.15 is satisfied — `applies` has three in-function consumers and the `nav=` token is the production channel. |
| `Claude/Plans/PLAN-swipe-stage7.md` `vitruvius-gate` | The next slice over the same function | **AGREE.** Its declared ranges are unmoved at this HEAD, and round 2's 0/0/0/+11/+16 arithmetic was re-derived there. Re-confirmed here only to the extent the transform reproduces: `js/app.js` 3097 → 3113 lines, **+16**. |
| `tools/mutate.mjs` — the 152-entry registry | Which registrations the change refuses | **AGREE, and §13 5b's CONFLICT is closed.** Measured with the real `resolveAnchor` on four trees: control **0**, source edits with the registry unchanged **1**, built tree **0**, nested-block writing of edit 2 **3**. Each figure now sits against the tree state the plan names for it. |
| `docs/swipe-model.generated.txt` + `tools/gen-swipe-model.mjs` | The census pins and the four region fingerprints | **AGREE.** Ran the real generator on the built tree: its output differs from the committed document on **exactly three lines**, all census pins, `704→715`, `705→716`, `1181→1197` — the three §13 5b names. |
| `Claude/Charpy/…-r1.md`, `…-r2.md` (this seat's own prior rounds) | What each amendment owed | **AGREE.** All four round-2 dispositions re-derived and held; the round-1 dispositions were not re-opened, per this round's scope. |

---

## What I re-derived myself, and whether it held

Every row is MEASURED unless it says READ. Control first in every case. The repo was never written to:
every transform ran on copies of the tree outside it (`…\scratchpad\r3ctl`, `r3drv`, `r3builds`,
`tSPEC`, `tTOTA`, `tTOTB`, `tNSA`, `tHEAD`, `bA`, `bB`, `bC`, `bD`), `node_modules` reached by a
directory junction, and `git status --porcelain` in `C:/Users/nzilb/OneDrive/Desktop/TomeRoam` named
no source, tooling, test or generated file before or after any probe, with no `*.mutbak` anywhere.
`tools/mutate.mjs` was imported (it is CLI-guarded); `tools/source-gate-sweep.mjs` was never
imported, because importing it mutates `js/app.js`. **Nothing in this casebook was reused from an
earlier round's scratchpad artifact** — the transform, the drives, the registry probe and the
instrumentation were all rewritten and re-run.

| # | The plan's claim | How I tested it | Result |
|---|---|---|---|
| 1 | **F9** — §5's seven-build × three-drive table | Rebuilt all seven variants of `js/app.js` from §4.1's prescribed text and ran drives I, S and T plus each drive's own no-interference control against every one | **HELD, every cell.** HEAD: I `home`/no token, S `browse`, T **`playback`**/no token. Specified: I `browse`/superseded, S `options`, T `options`/superseded. `NAVSTALE-a`: I `home`/applied, S `browse`/applied, T `options`/superseded. `NAVIDENT-a`: I `home`/applied, S `options`, T `options`/superseded. `NAVTOTAL-a`: I `browse`, S `options`, T `options`/superseded. `NAVTOTAL-b`: I `browse`, S `options`, T **`playback`/applied**. Both-deleted: identical to `NAVTOTAL-b`. Controls land `home`, `options`, `general` in every build. |
| 2 | **F9** — `NAVTOTAL-a` is indistinguishable from the specified predicate on every observable of all five drives F, I, S, T, B′ | Ran all five drives and their controls against both builds | **HELD.** Landed screen, `nav=` token and recorded throw count are identical on all five, interfered and control alike. |
| 3 | **F9** — `NAVTOTAL-b` is distinguished by T and by T alone | Same run | **HELD.** F, B′, I and S are byte-identical to the specified predicate; only T differs (`playback`/`applied` against `options`/`superseded`). |
| 4 | **F9, the judgement** — is `NAVTOTAL-a`'s source-only status honest, held to the bar round 2 reversed the plan on? | **Exhaustive search over interference SEQUENCES**, not over the plan's drive set: 10 shipped controls (4 bottom-nav buttons, 5 hub rows, `#dgBack`), every sequence of length ≤3 fired inside the settle window, on three fixtures — a deep back gesture (`[home,books,options,general]`), the **shallowest** stack a back gesture can arm on (`[home,books]`, where one pop reaches length 1), and a forward replay — comparing the specified predicate against `NAVTOTAL-a` on landed screen, `nav=` token and throw count | **HONEST — no isolating drive exists within the search.** back len≤3 **1111 sequences, 0 differences**; shallow len≤3 **1111 sequences, 0 differences**; fwd len≤2 **111 sequences, 0 differences**. **2333 sequences, 0.** |
| 5 | *(the oracle for row 4, proven able to fail)* | Ran the identical machinery on builds that DO differ | **FIRES.** `NAVTOTAL-b` on the fwd fixture at len≤2: **8 differences**, drive T's exact pair (`.hubrow[data-sub="playback"]` then `#dgBack`) among them. `NAVSTALE-a` on the SHALLOW fixture at len≤2: **98 differences** — so the shallow fixture, the one that returns 0 for `NAVTOTAL-a`, is independently proven able to discriminate. |
| 6 | **§12's residual** — closure of the writer list under composition is unproven | Built a mis-classification oracle: under the specified predicate `nav=applied` asserts the stacks still describe the planned navigation, so the landed screen must equal the no-interference control's; flagged any sequence reporting `applied` while landing elsewhere. Proved it able to fail, then ran it on the specified predicate over all three fixtures | **The residual SURVIVES a directed strike.** Negative control: **7** firings on `NAVTOTAL-b`. Specified predicate: fwd len≤2 **0**, back len≤3 **0**, shallow len≤3 **0** — **2333 sequences, 0 mis-classifications and 0 recorded throws**. The residual remains correctly stated as unproven: this bounds it at depth 3 over 10 controls and 3 fixtures, it does not close it. |
| 7 | **F10** — control 0 refused of 152 registrations / 161 anchor parts | Imported `MUTATIONS` and the real `resolveAnchor` from the tree's own `tools/mutate.mjs`, resolved every `from` and `also.from` against that tree's own files, counting BOTH refusal classes | **HELD.** Pristine copy: 152 registrations, **161** anchor parts, **0** refused. |
| 8 | **F10 half (i)** — the three source edits with `tools/mutate.mjs` unchanged refuse exactly one | Same probe on that tree | **HELD. 1** — `ANCHOR NOT FOUND` for `#22 swipe: abort mutates the nav stack like a commit (-> I11 abort test)`, occurrences 0. |
| 9 | **F10 half (ii)** — the built tree (half (i) plus §8's re-anchoring) refuses zero, and `test/mutation-anchors.test.js` is 6/6 | Applied §8's specified re-anchoring verbatim (`const applies = commit && currentDesc() === cur.from` → `const applies = currentDesc() === cur.from`), re-ran the probe, then ran the gate with the count read from the runner | **HELD. 0** refused; gate **6 tests / 6 pass / 0 fail**. |
| 10 | **F10, the judgement** — does the split make the rule satisfiable by correct work in both halves? | Constructed both named tree states and measured each against its own declared figure | **YES.** Half (i) measures 1 against a declared 1; half (ii) measures 0 against a declared 0. Neither half halts on correct work, which is the failure round 2 struck. See F14 for a naming imprecision that does not change this. |
| 11 | **F11** — drive B′ at HEAD gives 1 recorded throw, control 0, through the shipped `#dgBack` listener with no library data | Instrumented the drive copy's fake timer to RECORD a throwing callback instead of swallowing it (one site, `test/app-harness.js` `clock.advance`), then drove `[home,books]`, a left-edge back-swipe released to commit, and `h.tap('#dgBack')` inside the settle window | **HELD, and DRIVEN not read.** Interfered: **1** throw, `Cannot read properties of undefined (reading 'v')`. Control: **0**. Under all six predicate builds: **0** throws and `nav=superseded`. No chapter list, no library fixture, no new harness capability beyond the instrumentation. |
| 12 | **F11** — the route is `closeSub` on `#dgBack` falling through to `goBack` | Read `js/app.js:3091`, `177`, `145` at this HEAD | **HELD.** `3091` is `const dgBack = $('dgBack'); if (dgBack) dgBack.addEventListener('click', closeSub);`; `177` is `} else goBack();`; `145` is `function goBack() {`. The plan's `177 → 145` is exact. |
| 13 | **F11** — drive S records 0 throws in every build, so it was never a throw substitute | Read the instrumented counter on drive S in all seven builds | **HELD. 0** in every build, interfered and control alike. The withdrawal of the fixture cost is correct. |
| 14 | **F12** — the non-uniqueness subtest is green on the pristine and built trees and red on the nested-block writing | Ran `test/mutation-anchors.test.js` on four trees, count read from the runner | **HELD, and the gate is proven able to fail.** Pristine **6/6/0**; built tree **6/6/0**; nested-block writing with the registry unchanged **6 tests / 4 pass / 2 fail** (`not ok 1` and `not ok 3`); nested-block writing **plus** the re-anchoring — the tree a deviating builder actually holds — **6 tests / 5 pass / 1 fail**, `not ok 3` alone, naming `M1NOWRITE` and `S2-24 ABORTNORENDER` each as `NON-UNIQUE ANCHOR … occurs 2 times`. |
| 15 | **Residual 3** — §8 item 10's transformed-tree suite run was not repeated because the round-2 amendment is prose-only | `git diff --name-only decfbd9 7d44127`, then re-ran the figure anyway rather than accept the inference | **HONEST, and re-measured.** The amendment names one file, the plan. And measured directly at this round: baseline untransformed copy **916 / 913 pass / 2 fail / 1 skip**; built tree (three edits + re-anchoring + `tools/gen-swipe-model.mjs` + `tools/stamp-build.mjs`) **916 / 913 pass / 2 fail / 1 skip** — the same two git-only gates in both (`every hook script is EXECUTABLE in git's index`, `THE REAL ARTIFACT: this repo's own history passes the gate`), which cannot pass in a tree with no `.git`. No behavioural cell reddens. |
| 16 | **Residual 1** — §1's chapter-list route is undriven, and nothing depends on it | Grepped the whole plan for a dependency on drive B, and read every `vitruvius-coverage` cell | **HONEST.** No coverage cell names the chapter-list drill-back route; `NAVSTALE`'s fixture names F and B′. §9 dimension 4(a)'s "NP → chapter list" is the `newNav` commit branch, a different thing, owned by `NAVAPPLIES`. Drive B and drive B′ reach the identical writer (`goBack`, `js/app.js:145`) on the identical branch, and B′ is measured to produce the identical throw. |
| 17 | **Residual 2** — whether drive T's interleaving occurs in a real 340 ms window is a READING | Read §12's statement | **HONEST, and recorded as one.** §12 states it as constructible-not-observed and states the shipped defect's severity as unquantified rather than low or high. My own reachability result does not change the reading — see F13, which makes the class broader, not the window longer. |

---

## Findings

### F13 [Note / defect] — the `NAVPAIR` interference class is broader than drive T, and the plan's own count understates it

**Severity: Note. Nature: defect.** *(A defect in a stated count, not in the design; no amendment is
required and the plan is cleared to build with it as written.)*

§9's `NAVPAIR` mutation column says `NAVTOTAL-b` is "MEASURED to redden drive T and to redden NO
other drive this plan constructs, so drive T is not droppable and is **the only witness this
registration has**." Scoped to the drives this plan constructs, that is exactly right and I
reproduced it. Scoped to the shipped controls, it understates.

**MEASURED.** On the forward fixture, every sequence of two shipped controls, specified predicate
against `NAVTOTAL-b`: **8** sequences differ, not one. All eight are the same shape — any control
that pushes onto `navStack` and clears `fwdStack`, followed by any control that pops it back — and
they include `.navbtn[data-nav="home"]` then `#dgBack`, which is a bottom-nav tab tap followed by a
‹ Back press rather than two settings-hub taps.

**Why it is a Note and not blocking.** It errs in the safe direction on every axis. The cell's job is
to keep the forward conjunct from being deleted, and eight witnesses do that at least as well as one.
It cannot cause a wrong build: the test author writes drive T, which is measured red-first, and the
extra witnesses are alternatives rather than obligations. It does not change severity: still two taps
inside one 340 ms window, so §12's "unquantified" stands.

**Worth one sentence to the test author if the plan is ever touched for another reason, not on its
own account:** the cheapest witness of this class needs no second hub row — a bottom-nav tap followed
by `#dgBack` reddens `NAVTOTAL-b` identically.

### F14 [Note / recommendation] — §13 5b half (ii) glosses "the built tree" as excluding the nine new registrations, and step 4 includes them

**Severity: Note. Nature: recommendation.**

§13 step 4 puts the three source edits, the two comment scrubs, the re-anchoring **and nine new
registrations** into one build, taking the registry from 152 to 161. §13 5b half (ii) then names its
tree as "the built tree, **i.e. (i) plus §8's re-anchoring**" — a gloss that describes a 152-entry
registry, not the 161-entry one step 4 produces. My half-(ii) measurement, like round 2's, was taken
on the 152-entry form, because the nine registrations do not exist yet.

**Why it does not bite, and why I am not asking for an edit.** Both readings demand the *same*
figure. 5b half (ii) states its requirement twice — "the refused set is zero" and "which is the same
statement as `test/mutation-anchors.test.js` green" — and the gate runs over whatever registry the
tree holds. On a 161-entry tree the requirement is still zero refused and the gate still green, which
correct work produces; a refusal there would be a genuine defect in one of the nine new
registrations, and halting would be correct. I could construct no tree state where the imprecision
halts correct work, which is the failure class F10 exists to prevent. Recorded as a recommendation
so a future reader does not re-derive the question, explicitly **not** as a requirement: this project
has paid for churn on this plan and a fourth round for a gloss would be the wrong trade.

---

## Coverage — how each blocking finding is verified

**There are no blocking findings this round.** Every round-2 finding is verified as resolved by the
measurements in the re-derivation table above: F9 by rows 1–5 (the seven-build table, the five-drive
indistinguishability, and the 2333-sequence search with its two proven-able-to-fail positive
controls), F10 by rows 7–10 (the four-tree refusal counts against the two named tree states), F11 by
rows 11–13 (drive B′ driven at HEAD with its control, the route read at three line numbers, drive S's
zero throws), F12 by row 14 (the gate green 6/6 on two trees and red on two deviating writings).

F13 and F14 are Notes and carry no verification obligation, and neither requires a plan edit. The
plan proceeds to the test author as written.

---

## Prediction — where this breaks in execution if built as written

Nothing I can name blocks the build. What follows is where the remaining risk sits, so the next
seats know what to watch rather than what to fix.

**The test author's one real trap is the throw oracle, and the plan already names it.** A cell that
asserts "no throw" against `test/app-harness.js`'s un-instrumented `clock.advance` is vacuous — the
catch at that site swallows the callback silently. Every throw figure in this casebook was taken with
the timer instrumented to record instead of swallow, and the counter was read on the control in the
same run precisely because a counter that reads 0 everywhere is the same vacuity relocated. §12 says
this; the risk is that it reads as background rather than as the step it is.

**The builder's likeliest interruption is no longer 5b.** With the split, both halves are satisfiable
and I measured both. The residual friction is F14's gloss: a builder measuring half (ii) on the
161-entry tree gets the same required zero, so the worst case is a moment's re-reading, not a halt.

**Where it would fail late, if it failed.** Not in the predicate — the predicate survived a directed
2333-sequence strike with an oracle proven able to fire. It would fail in the *reason* the predicate
is kept. §5 now states the branch conjuncts' basis correctly (per-sequence, with `NAVTOTAL-a`'s claim
scoped to the drive set it ranges over), and `NAVPAIR` gives the forward conjunct a behavioural
killer. `NAVTOTAL-a` remains defended only by a source assertion. That is honest today because I
could not isolate it and because the structural reason is real — no shipped writer removes from below
`navStack`'s top, and the one wholesale rebind (`js/app.js:1181`) installs a fresh object that fails
the identity conjunct. **The re-open condition is exactly that sentence:** a future writer that
removes from below the top, or that rebinds `navStack` to an array retaining an existing descriptor
object, gives `NAVTOTAL-a` a behavioural killer and the source cell stops being honest. That belongs
in whichever record the next stack-writer change is planned in; it is not this plan's to carry.

**What I could not test.** Whether drive T's interleaving — or F13's cheaper siblings — occurs inside
a real 340 ms window on a device. It is constructible in the harness through production controls,
which is what a coverage cell needs; frequency in the field is a reading and the plan records it as
one. My sequence search is bounded at length 3 over 10 controls and 3 fixtures, so it bounds §12's
closure question rather than closing it; a composition of four or more taps, or one reaching a
control outside that set, is outside what I executed. I did not run the plan gate on the amended
plan — that is the planner's gate, not this seat's, and a passing run would not bear on any finding
above. That is the tool ceiling for this round.
