# Charpy — PLAN-swipe-navstack-settle-window.md, round 2

Type: plan-review
Artifact: `Claude/Plans/PLAN-swipe-navstack-settle-window.md` (ROUND-1 TEMPER APPLIED, filed by the planner 2026-08-06 at `6730c8b`)
Round 1: `Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r1.md`, verdict TEMPER, reviewed at `13a97b0`
HEAD at review: `6730c8b9decd1a365042e065076b42a9ef9feba8`, `main` == `origin/main`, tree clean
Suite at review, count read from the runner: **916 tests / 915 pass / 0 fail / 1 skip**, `node --test "test/*.test.js"`
`tools/mutate.mjs` registrations at HEAD, counted by importing the module: **152**
Date: 2026-08-06

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:350-356","js/app.js:698-707","js/app.js:1022-1032"],"callee_ranges":[]} -->

---

## Verdict

verdict: **TEMPER.** Every round-1 disposition holds under independent re-derivation — all eight, each
re-executed rather than read, control first. F1's structural fix works: prescribing the edit text
really does foreclose the anchor collision (measured 1 refusal against the naive writing's 3). F2's
arithmetic is exact to the line (+16, `704→715`, `705→716`, `1181→1197`, stage-7 shifts 0/0/0/+11/+16).
F3 and F4 reproduce to the value. The design, the predicate, the standalone ruling, the six-writer
enumeration and the four generator fingerprints are not re-opened and were not re-struck.

Two things fail, and neither is a design fault.

1. **`NAVTOTAL`'s source-only status is not honest — it is round-1 F4 returning on the other clause.**
   The plan states, as MEASURED, that "no drive reachable at HEAD reddens either conjunct on its own."
   What was measured is that drives F, I and S do not. **Drive T does** (§ *What I re-derived*, row 8):
   two settle-window navigations that cancel each other on `navStack` leave the top descriptor's object
   identity INTACT while replacing `fwdStack`'s top. Deleting the forward conjunct alone — the mutant
   `NAVTOTAL-b` — lands the user on a third screen that is neither the gesture's destination nor their
   last explicit action. It is red at HEAD, its control is green, and no other predicate build reddens
   it. So the branch conjuncts are not redundant, the argument that they are is measurably wrong, and a
   clause with a real killing cell is about to ship pinned by a source assertion.
2. **§13 step 5b's acceptance predicate cannot be satisfied by a correct build.** It requires the
   refused-registration set, measured **against the built tree**, to be exactly one. The built tree
   includes §8's re-anchoring (step 4 says so). Measured on that tree: **0**. §13's bolded rule makes a
   smaller measured set a stop, so the builder halts on correct work — the same shape as round-1 F1, one
   fix later.

Four findings, F9–F12. Two are blocking. None touches the design, the predicate or the ruling; the
repairs are one new drive, one corrected claim, one corrected step and one citation.

---

## Applicability

| Pattern | Value | Reason |
|---|---|---|
| `defining_records` | **true** | The subsystem addendum, the Engineering Contract, the stage-7 plan, the mutation registry and the generated model all bear on this amendment and are reconciled below. |
| `boundary_relocation` | **false** | No code moves between modules or ownership boundaries. All three executable edits are inside `runFinalize` in `js/app.js`; `navStack`/`fwdStack` stay module-local to the same IIFE. Unchanged from round 1 and re-confirmed against `js/app.js:125-127`. |
| `callee_replacement` | **false** | No call is replaced by an indirection. Round-1 F6 recorded that the change moves the *argument value* one existing callee receives on one new path; the callee's own body is untouched, so no callee range is declared. The plan's Applicability row now records the same reasoning and it is correct. |
| `contract_shape` | **false** | No exported shape, contract object, descriptor member or return value changes. `applies` is a function-local `const`; the `nav=` token is a substring of an existing diagnostic line. |

**Declared-range completeness reason.** I declare the plan's own three ranges this round —
`js/app.js:350-356`, `698-707`, `1022-1032` — because round-1 F5's correction landed and they now
describe the change: `698-707` contains the whole of the edit-1+3 replacement (HEAD `698-702`) and the
`const dest = currentDesc();` the ordering rule pins; `1022-1032` contains edit 2 and the sibling
comment scrub; `350-356` contains the `dropRowHold` declaration sentence the change falsifies (read
at HEAD: the sentence spans `352-354`). I did **not** re-declare round 1's `1021` and `1041`: `1021` is
the throw site the fix retires and is unchanged text, and nothing in this amendment moves it.

**Adapter-visible items, named so no check can pass by omission.**

- Session fields (`cur.<field>`) crossing the declared ranges, extracted by an executed scan of exactly
  those line ranges: `cur.dir`, `cur.from`, `cur.dest`, `cur.newNav`, `cur.movers`, `cur.id`. The plan
  adds **no** session field; `applies` is a function-local binding.
- `document.body.classList` mutation inside a declared range: **none exists** at HEAD, by an executed
  scan of the three ranges. Named explicitly so a later silent addition cannot pass unremarked.
- `removeAttribute('data-*')` pre-mount effect inside a declared range: **none exists** at HEAD, same
  executed scan.
- Callee `classList` tokens: not applicable — `callee_replacement` is false, no callee range declared.
- Exact-key contract-gate reference: not applicable — `contract_shape` is false.

---

## Defining records

| Record | What it materially defines | My call |
|---|---|---|
| `Claude/Subsystems/swipe-reveal.md` items 3, 12, 13 | Stack authority; commit behaviour; the recovery dichotomy | **AGREE, unchanged from round 1.** The scrub disposition and the third recovery outcome are right and the round-1 amendment did not disturb them. |
| `Claude/EngineeringContract.md` §4.6, §4.12, §4.15 | Stale-continuation duty; identity discipline; no dead fields | **AGREE, and §4.12 is now defended.** Round-1 F4's complaint was that the plan derived the identity check from §4.12 and filed no cell that could tell `===` from `.v`. `NAVIDENT-a` now does, and I measured it: the `.v` weakening lands drive I on `home` (wrong) while the specified predicate lands it on `browse`. The clause is no longer vacuous. |
| `Claude/Plans/PLAN-swipe-stage7.md` `vitruvius-gate` | The next slice over the same function | **AGREE, and the arithmetic is now exact.** Read at HEAD, stage 7 declares `js/app.js:346-374, 424-428, 499-500, 1022-1026, 1071-1081` (plus three `js/browse.js` ranges this slice does not touch). Measured against the transformed copy by locating each anchor: `1026→1037`, `1070→1086`, `1078→1094`; the first three ranges do not move. The plan's 0/0/0/+11/+16 and its corrected `1033-1037` / `1087-1097` are right. |
| `tools/mutate.mjs` — the 152-entry registry | Which registrations the change refuses | **AGREE for the transform; CONFLICT for §13 5b's tree state.** Measured with the real `resolveAnchor`: control **0**, §4.1's text **1**, edit 2 as a nested block **3**, edit 3 appended after `sid=${cur.id}` **2** — the plan's four figures exactly. But on the tree the builder actually holds at 5b, the count is **0**. F10. |
| `docs/swipe-model.generated.txt` + `tools/gen-swipe-model.mjs` | The census pins and the four region fingerprints | **AGREE.** Ran the real generator on both copies: the control's output is byte-identical to the committed document, and the transformed output differs on exactly three lines, all census pins, `704→715`, `705→716`, `1181→1197`. Fingerprint block unchanged; census `text` unchanged. |
| `Claude/Charpy/…-r1.md` (this seat's own prior round) | What the amendment owed | **AGREE.** All eight dispositions re-derived and held. The record of what round 1 could not test — branch B — is superseded by drive B' below. |

---

## What I re-derived myself, and whether it held

Every row is MEASURED unless it says READ. Control first in every case. The repo was never written to:
all transforms ran on copies of the tree outside it (`…\scratchpad\r2ctl`, `r2x`, `r2base`,
`node_modules` reached by a directory junction), and `git status --porcelain` in
`C:/Users/nzilb/OneDrive/Desktop/TomeRoam` was empty before and after every probe, with no `*.mutbak`.

| # | The plan's claim | How I tested it | Result |
|---|---|---|---|
| 1 | **F1** — control 0 refusals; §4.1's text 1; edit 2 nested 3; edit 3 appended 2 | Imported `MUTATIONS` and the real `resolveAnchor` from `tools/mutate.mjs` (CLI-guarded; `tools/source-gate-sweep.mjs` never imported) and counted refusals of every `from` and `also.from` per transform variant | **HELD, all four figures.** Control 0; prescribed **1** (`swipe: abort mutates the nav stack like a commit`, rotted); nested **3** (+ `M1NOWRITE…` and `S2-24 ABORTNORENDER…`, each `from` occurring **2×**); appended **2** (+ `stage3: session id not stamped on the finalize line…`, rotted). Prescribing the text does foreclose the collision. |
| 2 | **F2** — delta +16 (+11 from edits 1+3, +5 from edit 2) | Line counts across each variant | **HELD.** 3097 → 3108 (edits 1+3, **+11**) → 3113 (**+16**). |
| 3 | **F2** — census pins `704→715`, `705→716`, `1181→1197`, fingerprints unchanged | Ran `tools/gen-swipe-model.mjs` on the control copy and on the transformed copy and diffed both against the committed document | **HELD.** Control output byte-identical to the committed file. Transformed output differs on **exactly three lines**, all census pins, exactly those three. |
| 4 | **F2 / §10** — stage 7's five ranges shift by 0, 0, 0, +11, +16 | Located each of stage 7's anchors in the control and transformed copies | **HELD.** `dropRowHold` 427→427, `takeRowHold` 500→500, the settle guard 616→616; the finalize `dropRowHold()` 1026→**1037**; `if (cur !== session) return;` 1070→**1086**; `try { runFinalize()…` 1078→**1094**. |
| 5 | **F3** — branch F gives 1 recorded throw; a fresh gesture arms immediately and does NOT arm after one further navigation | Booted `test/app-harness.js` on a copy of the real `js/app.js`, with the harness's `clock.advance` patched so a throwing timer callback is **recorded** rather than swallowed, and drove Home→Books→Options, back-commit, forward-replay commit, bottom-nav tap inside the window, then 400 ms | **HELD to the value.** With the tap: **1** throw, `Cannot read properties of undefined (reading 'v')`; arms immediately **true**; arms after one further navigation **false**. Control: **0** throws, arms **true** in both positions. |
| 6 | **F4** — four predicate builds over drives I and S | Built HEAD, the specified predicate, the identity conjunct deleted, and the `.v` weakening; ran drives I and S plus their own controls against each | **HELD, cell for cell.** HEAD: I lands `home` (wrong), S lands `browse` (wrong, control `options`). Specified: I `browse` / `nav=superseded`, S `options`. Identity deleted: I `home`, S `browse`, both wrong, both `nav=applied`. `.v` weakened: I `home` (wrong), S `options` (correct) — so drive I is indeed the only one separating `===` from `.v`, and it is not droppable. Both drives red at HEAD. |
| 7 | **F4** — the registry goes 152 → 161 as a declaration about the build, not a change made | Read §13 step 4 and the plan's input-state paragraph; counted the registry at HEAD by import | **HELD and unambiguous.** The plan's header states 152 at input; step 4 is owned by the builder with state `owed` and says the registry "therefore goes from 152 to 161". Measured at HEAD: **152**. |
| 8 | **`NAVTOTAL`** — "a build with BOTH branch conjuncts deleted … is indistinguishable from the specified predicate on every observable of drives F, I and S", therefore no drive isolates them | Reproduced that measurement, then went past the plan's three drives: built the two conjuncts as **separate** mutants and searched for an interference that preserves the top descriptor's object identity while moving the OTHER stack | **HELD as stated, FALSE as generalized.** Both-deleted is indeed indistinguishable on F, I and S. But **drive T** distinguishes the forward conjunct: see F9. |
| 9 | **§12** — §1's branch-B throw was not re-derived because its fixture needs library data | Built the back branch's throw a different way: `navStack = [home, books]`, a back-commit toward home, and the production `goBack` intent fired inside the settle window | **The plan's statement about its OWN route holds; the consequence it draws does not.** Drive B' produces **1** recorded throw at HEAD, same message; control **0**; the specified predicate removes it (`nav=superseded`, 0 throws). No library data involved. F11. |
| 10 | **§8 item 10** — the full change plus the re-anchoring plus regeneration leaves the suite at the copy baseline | Ran the suite on a pristine copy first, then on the transformed + re-anchored + regenerated copy, counts read from the runner | **HELD.** Baseline copy **916 / 913 pass / 2 fail / 1 skip**; after the full change **916 / 913 pass / 2 fail / 1 skip**, and the two failures are the same git-only gates in both (`every hook script is EXECUTABLE in git's index`, `THE REAL ARTIFACT: this repo's own history passes the gate`), which cannot pass in a tree with no `.git`. No behavioural cell reddened. |
| 11 | **§13 5b** — the refused set on the built tree is exactly one registration | Applied §4.1's text AND §8's specified re-anchoring to the same copy, then counted refusals of that tree's own registry against that tree's own files | **FALSE. Measured 0.** F10. |

**Drive T, stated in full so the test author can build it without this casebook.** From the Options hub
with a settings sub on the forward stack — Home → Books → Options → General, then a committed back-swipe
General→Options, leaving `navStack = [home, books, options]` and `fwdStack = [general]` — release a
right-edge forward swipe (dir `fwd`, dest `general`). Inside the settle window perform **two**
navigations that cancel on `navStack`: tap the Playback hub row (`openSub`, which pushes and clears
`fwdStack`), then the sub-screen's own ‹ Back (`closeSub`, which pops it back and pushes it onto
`fwdStack`). At finalize `currentDesc()` is the **same object** the gesture captured as `cur.from`, so
the identity conjunct is satisfied, while `fwdStack`'s top is now `playback`, not `general`.

| predicate build | drive T landed screen | drive T `nav=` | T-control |
|---|---|---|---|
| HEAD (no guard) | **playback** ← wrong | *(no token)* | general |
| as specified | **options** | superseded | general |
| identity conjunct deleted (`NAVSTALE-a`) | options | superseded | general |
| identity weakened to `.v` (`NAVIDENT-a`) | options | superseded | general |
| `navStack.length > 1` deleted (`NAVTOTAL-a`) | options | superseded | general |
| **`fwdStack[…] === cur.dest` deleted (`NAVTOTAL-b`)** | **playback** ← wrong | **applied** | general |
| both branch conjuncts deleted | **playback** ← wrong | applied | general |

Drives F, I, S and B' are **unchanged** by `NAVTOTAL-a` and `NAVTOTAL-b` alike, so drive T is the
discriminator and it discriminates exactly one of the two conjuncts.

---

## Findings

### F9 [Structural / defect] — `NAVTOTAL`'s source-only status is measured false for the forward conjunct, and §9's interference matrix is missing the cell that shows it

**Severity: Structural. Nature: defect.**

Three statements in the plan rest on the same inference and all three are wrong.

- §5: "a build with BOTH branch conjuncts deleted … is indistinguishable from the specified predicate on
  every observable of drives F, I and S … **No behavioural cell reddens for it**, so the conjuncts are
  pinned by a SOURCE assertion, not by a behavioural cell."
- §9 dimension 6: "`NAVTOTAL` pins it over source, because **no reachable drive isolates it** — MEASURED,
  not assumed."
- §9's `NAVTOTAL` cell: "this is a SOURCE cell by necessity and the plan says so, because **no drive
  reachable at HEAD reddens either conjunct on its own**."

The premise measured is that drives F, I and S do not isolate the conjuncts. That premise is true — I
reproduced it. The conclusion drawn from it is a claim about **all reachable drives**, and it is false.
Drive T (above) reddens `NAVTOTAL-b` behaviourally, is red at HEAD, and has a green control.

**Why the argument fails, precisely.** §5 justifies the redundancy from the six-writer enumeration:
"Every one of them replaces or removes `navStack`'s top, so the identity check detects all of them."
That is true **per writer** and false **per sequence**. `openSub` followed by `closeSub` — two of the
six — compose to leave `navStack` byte-for-byte as it was, top object identity included, while moving
`fwdStack`. §12's residual anticipates the wrong failure: it says a mis-classification would need "a
seventh [writer] that this grep missed." It needs no seventh. A pair of the known six suffices, and the
pair is two taps of shipped controls inside one settle window.

**What it costs if built as written.** Three things, in order of weight.

1. **A user-visible corruption shape ships with no cell.** At HEAD drive T lands the user on `playback`
   — neither the gesture's destination (`general`) nor their last explicit action (`options`). The fix
   prevents it; nothing tests that it does. §9 dimension 4(b) enumerates the interference matrix as two
   cells — a navigation that EMPTIES the stack the gesture reads (`NAVSTALE`), or one that leaves it the
   right shape and changes what its top MEANS (`NAVIDENT`) — and declares "all four cells of (b) are
   driven." There is a third: a navigation **pair** that leaves `navStack`'s top *identical* and moves
   the other stack. It is driven by neither cell.
2. **`NAVTOTAL-b` ships pinned by a source assertion when a behavioural killer exists.** That is exactly
   the state round-1 F4 refused for the identity conjunct, and the plan's own §5 calls it "the vacuity
   this project has shipped before." The audit was re-run against the identity conjunct and passed; it
   was not re-run against the clause it was originally written for.
3. **The reason to keep the branch conjuncts is misstated, so the next reader may drop them.** §5 keeps
   them as defence-in-depth against an enumeration that "does not depend on" them. Measured, they are
   not redundant: with the forward conjunct removed the identity conjunct does not catch drive T. A
   later reader who trusts §5's redundancy argument and simplifies the predicate reintroduces a live
   defect with every cell green.

**The invariant the plan must satisfy** (stated as an invariant, not an implementation — which way to
meet it is the planner's): a predicate conjunct is pinned by a source cell only when its mutant is
measured indistinguishable across the drives the plan can actually construct, and that measurement is
reported with the drive set it ranged over rather than as a claim about all reachable drives. On the
evidence here `NAVTOTAL-a` (`navStack.length > 1`) meets the source-only bar — it is indistinguishable
across F, I, S, T and B', and no sequence can leave `cur.from` on top of a length-1 `navStack`, since
no writer removes from the bottom. `NAVTOTAL-b` does not: it has a red-first behavioural drive, so it
takes a behavioural cell, and the interference matrix takes its third cell.

### F10 [Structural / defect] — §13 step 5b requires a refused-registration count that a correct build cannot produce

**Severity: Structural. Nature: defect.**

§13 step 4 puts the three source edits, the two comment scrubs, **the §8 re-anchoring** and the nine new
registrations into one build. Step 5b then says: "re-run §8's measurement against **the built tree** and
require the **refused** set — rotted AND non-unique, both classes counted — to be exactly one
registration." The exit condition restates it: "§8's measured co-change set equal to its declared set on
all ten rows."

**MEASURED.** On a copy with §4.1's text applied to `js/app.js` **and** §8's specified re-anchoring
applied to `tools/mutate.mjs` — that is, the tree step 4 produces — the registry's own `resolveAnchor`
refuses **0** registrations. §13's bolded rule reads "**A measured set SMALLER is also a stop** — it
means the transform applied is not the transform specified." So the builder who does exactly what the
plan says measures 0 against a declared 1 and halts on correct work.

The plan already contains the disambiguating evidence: §8 item 10's own tree has the re-anchoring
applied and reports `test/mutation-anchors.test.js` **green**, which is the same statement as "0
refused". So §8 is internally consistent about which tree each figure came from; 5b is not, because it
names one tree and inherits a figure measured on the other.

**What it costs.** This is round-1 F1's consequence in a new place: a halt on correct work, and this
project has recorded that the second-order outcome is the gate being read as noisy and stepped past.
The repair is one sentence and does not move any measured number: 5b measures the refused set against
the tree with the **source edits applied and the registry unchanged** (declared: exactly one, the
rotted `swipe: abort mutates the nav stack like a commit`), and separately requires **0** refusals —
i.e. `test/mutation-anchors.test.js` green on all three subtests — on the built tree after the
re-anchoring. Both halves are already measured; only the step's wording binds them to the wrong trees.

### F11 [Weak / defect] — the back branch's throw is drivable at HEAD with no library data, so §12's "the fixture work is the library data" is wrong about what `NAVSTALE-b` needs

**Severity: Weak. Nature: defect.**

§12 records §1's branch B as the one drive not re-executed, because its route "reaches the chapter list
from a home tile, which needs library data the harness fixture does not supply out of the box," and
assigns the closure to the test author with "the fixture work is the library data." That is true of the
route §1 writes down. It is not true of the back branch.

**MEASURED — drive B'.** `navStack = [home, books]`; a left-edge back-swipe Books→Home released to
commit; inside the settle window the production `goBack` intent (`js/app.js:145` — the same function
`Browse`'s own back control is wired to at `js/app.js:2679`) pops `books`, taking `navStack` to length
1. The 340 ms fallback then runs the commit's back branch, `navStack.pop()` empties the stack,
`currentDesc()` is `undefined`, and the harness's instrumented timer records **1** throw,
`Cannot read properties of undefined (reading 'v')`. Its control records **0**. Under the specified
predicate the settle reports `nav=superseded` and records **0** throws. No library data, no chapter
list, no new fixture beyond a handle on the `goBack` intent.

So §1's branch-B claim — that the back branch produces the identical throw — is now re-derived at this
round by a second route, and it holds. What changes is the owed work: `NAVSTALE-b`'s red-first
demonstration does not wait on library data, and §12's substitution boundary ("drive S is admissible for
the back branch's staleness handling but is NOT a substitute for the branch-B throw" — which I confirm,
drive S records 0 throws) no longer has to be exercised. Recorded as Weak rather than a Note because
§12's sentence assigns the test author a fixture cost that measurement says is not owed, and a residual
that overstates a cost is how a red-first step gets quietly dropped.

### F12 [Note / recommendation] — §4.1's "closed by construction" does not name the mechanism that would catch a deviation

**Severity: Note. Nature: recommendation.**

§8 says of the non-unique-anchor collision: "This plan does not specify either [repair], because it does
not create the collision: **the collision is closed by construction in §4.1's text.**" Measured, the
prescribed text does foreclose it — 1 refusal against the naive writing's 3. But the construction is a
prescription in prose, and §4.1's escape hatch ("a builder who must deviate … re-runs §8's measurement
and amends §8 before committing") is a discipline, not a structure.

The structure exists and the plan does not cite it here: `test/mutation-anchors.test.js`'s
non-uniqueness subtest hard-fails on exactly this collision, which is why round 1 could name the two
affected registrations by name. It would be worth one clause in §4.1 saying so, because a reader who
believes "by construction" means the failure is impossible will not look for the gate, and a reader who
knows the gate exists will not treat a deviation as unbounded risk. Recorded as a recommendation, not a
requirement: the measured behaviour is correct either way, and this is a claim-calibration note on the
plan's own proof register.

---

## Coverage — how each blocking finding is verified

| Finding | Severity | Verified by |
|---|---|---|
| **F9** | Structural | A drive of the identity-preserving navigation **pair** (drive T's shape) shown **red at HEAD** on its landed screen, with its own no-interference control green, and `NAVTOTAL-b` re-registered against it so its expected killing cell is a behavioural one. `NAVTOTAL`'s source assertion is retained for `NAVTOTAL-a` with its honesty label restated as "indistinguishable across the drives this plan constructs — F, I, S, T, B'", never as a claim about all reachable drives. §9 dimension 4(b)'s interference matrix gains its third cell and its "all four cells are driven" sentence is re-counted. The acceptance predicate is the red-first demonstration, not a green-after result: this subsystem has produced two oracles that passed for the wrong reason (the `@reveal` FLASH line, and round-1 F3's arming clause). |
| **F10** | Structural | §13 5b re-run in two halves against the two trees it actually needs: refused set **1** against the source edits with the registry unchanged, and refused set **0** — `test/mutation-anchors.test.js` green on all three subtests — against the built tree after the re-anchoring. Both figures are already measured in this casebook, so the acceptance predicate is a wording correction with no new measurement owed. |

Non-blocking findings F11 and F12 carry no verification obligation. F11 is a correction to a residual's
cost statement and a re-derivation that closes the plan's one openly-unclosed drive; F12 is a
claim-calibration recommendation on §4.1's proof register.

---

## Prediction — where this breaks in execution if built as written

The build lands a working fix. The predicate is correct, including for drive T — that is the point of
F9: the plan is *right* and its stated reason is wrong.

**It halts at step 5b, once, on a correct tree.** The builder applies the edits and the re-anchoring,
runs the blast-radius probe, measures 0 refused against a plan that says exactly one, and reads §13's
"a measured set SMALLER is also a stop." The likely outcome is a mid-build question rather than a wrong
build, because §8 item 10 says in the same document that the anchors gate must be green — but the cost
is the same interruption round 1 predicted for the same rule, and the worse branch is the builder
concluding the probe is noisy on the second encounter.

**Then it fails where it did last time, one clause over.** The test author writes `NAVTOTAL` as a source
cell because the plan says a source cell is necessary. `NAVTOTAL-b` is registered, run, and found not to
redden any behavioural cell — which the plan predicted, so nobody investigates. What ships is a correct
predicate whose forward conjunct is defended only by a string match on the source, over an interference
shape (an `openSub`/`closeSub` pair inside the settle window) that is red at HEAD and has no cell at
all. The next person to touch `runFinalize` reads §5's redundancy argument, sees that the identity
conjunct "detects all six writers", simplifies the predicate to `commit && currentDesc() === cur.from`
— and every behavioural cell stays green while the wrong-entry class comes back. That is round-1 F4's
prediction, transcribed onto the clause the round-1 fix did not sweep.

**What I could not test.** Whether drive T's two-tap interleaving is reachable on a device inside a real
340 ms settle. It is constructible in the harness, which is what a coverage cell needs, and both taps
are shipped controls; but two deliberate taps in 340 ms is a tighter interaction than drives F, I, S and
B' require, and I state that as a reading of the interaction, not a measurement of a user. I did not run
the plan gate on the amended plan — that is the planner's gate, not this seat's, and a passing run of it
would not bear on any finding above. That is the tool ceiling for this round.
