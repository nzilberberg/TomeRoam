# Charpy — PLAN-swipe-navstack-settle-window.md, round 1

Type: plan-review
Artifact: `Claude/Plans/PLAN-swipe-navstack-settle-window.md` (AUTHORED, filed by the planner 2026-08-06 at `13a97b0`)
HEAD at review: `13a97b08744f9fe2398c0ec582ac79479458baf3`, `main` == `origin/main`, tree clean
Suite at review, count read from the runner: **916 tests / 915 pass / 0 fail / 1 skip**, `node --test "test/*.test.js"`
Date: 2026-08-06

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:699-707","js/app.js:1021-1041"],"callee_ranges":[]} -->

---

## Verdict

verdict: **TEMPER.** The central claim holds and I did not take it on trust: I reproduced §1's
forward branch myself against the real `js/app.js` through `test/app-harness.js`, with the harness's
throw-swallowing timer instrumented so the throw is observed rather than inferred, and I confirmed
the specified predicate removes it. The six-writer enumeration held under my own grep, and the four
`gen-swipe-model` fingerprints held under execution of the generator, not under a reading.

What does not hold is the plan's verification machinery, and it fails in two places that this
campaign has already been burned by.

1. **§8's MEASURED blast radius was measured from a transform containing one of the plan's three
   edits.** With all three, the rotted set is at least **three** registrations, not one, and it
   includes a failure class §8 does not contemplate — a **non-unique** anchor, which the anchors gate
   refuses differently from a rotted one. §13 makes "a measured set larger than §8's declared set" a
   halt, so the plan as written halts its own builder on correct work. This is the same defect
   round 1 found in stage 7's §11 (`Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r1.md` F1), reproduced
   one plan later.
2. **Two of the four coverage cells rest on things measurement shows cannot fire.** §1's stated
   consequence "a left-edge back gesture … silently fails to arm" is **false as driven** on branch F —
   the gesture arms — and `NAVSTALE`'s oracle is derived from it. And the **identity conjunct**, the
   predicate's semantic core and the entire reason §4.12 is cited, has **no cell that can kill it**:
   on sequence F the full predicate, the predicate with the identity conjunct deleted, and the
   predicate with `.v` equality substituted are indistinguishable on every observable the plan names.
   The plan is honest about `NAVTOTAL`'s vacuity and does not apply the same test to the clause that
   carries the design.

Four fixes. The design is not at fault and the standalone-versus-fold-in ruling survives; F2 narrows
its supporting arithmetic, not its conclusion.

---

## Applicability

| Pattern | Value | Reason |
|---|---|---|
| `defining_records` | **true** | The subsystem addendum, the Engineering Contract §4.6/§4.12/§4.15, the stage-7 plan, the adversary's casebook and the mutation registry all bear on this change and are reconciled below. |
| `boundary_relocation` | **false** | No code moves between modules or ownership boundaries. Both specified edits are inside `runFinalize` in `js/app.js`; `navStack`/`fwdStack` stay module-local to the same IIFE. Confirmed by reading `js/app.js:125-127` and the whole of `runFinalize`. |
| `callee_replacement` | **false** | This plan replaces no call with an indirection. F6 records that it changes the *argument value* one existing callee receives on one new path; changing an argument is not replacing a callee, and the callee's own body is untouched, so no callee range is declared. |
| `contract_shape` | **false** | No exported shape, contract object, descriptor member or return value changes. `applies` is a function-local `const` and the `nav=` token is a substring of an existing diagnostic line. Confirmed against `js/app.js` — nothing in either declared range crosses a module boundary. |

**Declared-range completeness reason.** The plan declares `js/app.js:702-707` and `1032-1041`. I
declare `699-707` and `1021-1041` instead, and the difference is itself finding F5: §4's edit 3
changes `699-700`, which the plan's own `source_ranges` omit, and §7's one-source-of-truth rule
forces the predicate to be hoisted **above** that line, so edit 1's true range starts at 699 and not
702. On the lower range I start at `1021` rather than `1032` because `1021` is the throw site the
whole plan exists to retire and `1026` is the `dropRowHold()` whose argument value this change moves
(F6); a review declaring only `1032-1041` would leave both unchecked.

**Adapter-visible items, named so no check can pass by omission.**

- Session fields (`cur.<field>`) crossing the declared ranges: `cur.tgt`, `cur.id`, `cur.dir`,
  `cur.from`, `cur.dest`, `cur.newNav`, `cur.movers`, `cur.scroll0`. The plan adds **no** session
  field; `applies` is a function-local binding (§4, and I confirmed the predicate reads only names
  already lexically in scope at `js/app.js:702`).
- `document.body.classList` mutation inside a declared range: **none exists** at HEAD. Executed:
  `sed -n '699,707p;1021,1041p' js/app.js | grep body.classList` returns nothing. Named explicitly
  because a silent later addition inside these ranges must not pass unremarked.
- `removeAttribute('data-*')` pre-mount effect inside a declared range: **none exists** at HEAD, by
  the same executed check.
- Callee `classList` tokens: not applicable — `callee_replacement` is false and no callee range is
  declared.
- Exact-key contract-gate reference: not applicable — `contract_shape` is false.

---

## Defining records

| Record | What it materially defines | My call |
|---|---|---|
| `Claude/Subsystems/swipe-reveal.md` items 3, 12, 13 | Stack authority; commit behaviour; the recovery dichotomy | **AGREE with the plan's reading.** Item 12 does state the mutation unconditionally and becomes wrong on approval; item 13 genuinely has no third case. The plan's §2 handling — scrub both in the same commit, extend item 13 to three outcomes — is the right disposition and I add nothing to it. |
| `Claude/EngineeringContract.md` §4.6, §4.12, §4.15 | Stale-continuation duty; identity discipline; no dead fields | **AGREE.** §4.6 is correctly identified as the governing rule and `finalize`'s existing check really is ownership-only (`cur !== session`, `js/app.js:1070`). §4.12 correctly rules out a `.v` comparison — `navTo` at `js/app.js:139` replaces the top object for a same-view nav, which I confirmed by reading. **But see F4: the plan derives the right design from §4.12 and then files no cell that can tell the two apart.** |
| `Claude/Plans/PLAN-swipe-stage7.md` `vitruvius-gate` `source_ranges` | The next slice over the same function | **AGREE that the ranges are disjoint; GAP on what follows from it.** Stage 7 declares `js/app.js:346-374, 424-428, 499-500, 1022-1026, 1071-1081` (read from its gate block at HEAD). None intersects `699-707` or `1032-1041`. The disjointness claim is true. F2 records that the *consequence* §10 draws from it is arithmetically wrong, and F6 records a non-textual interaction disjointness cannot see. |
| `Claude/Loki/STRIKE-swipe-stage7-lease-exits-2026-08-06.md` §5 | The commissioning report | **AGREE — incomplete as the plan says.** The strike reports the forward producer only. The plan is right to widen it and right not to edit a dated strike record. |
| `tools/mutate.mjs` — the whole 152-entry registry | Which registrations the change rots | **CONFLICT, wider than the plan states.** The plan names one. Measured: three, plus a fourth conditional on an unspecified placement decision. F1. |
| `docs/swipe-model.generated.txt` + `tools/gen-swipe-model.mjs` | The pinned census line numbers and the four region fingerprints | **CONFLICT on the census figures, AGREE on the fingerprints.** Measured below. F2. |

---

## What I re-derived myself, and whether it held

Every row is MEASURED unless it says READ. Control first in every case. The repo was never written
to: all transforms were applied to a copy of the tree outside the repo
(`…\scratchpad\tr`, `node_modules` reached by a directory junction), and
`git status --porcelain` in `C:/Users/nzilb/OneDrive/Desktop/TomeRoam` was empty before and after
every probe.

| # | The plan's claim | How I tested it | Result |
|---|---|---|---|
| 1 | §1 branch F reproduces: a forward commit whose `fwdStack` is emptied by a settle-window nav tap throws `TypeError … reading 'v'` | Booted `test/app-harness.js` on a copy of the real `js/app.js`, patched the harness's `clock.advance` so a throwing timer callback is **recorded** rather than swallowed (the plan's own §12 says an un-instrumented drive cannot see it), drove Home→Books→Options, back-commit, forward-replay commit, bottom-nav tap inside the window, then advanced 400 ms | **HELD.** Control (no tap): 0 throws. With the tap: exactly 1, message `Cannot read properties of undefined (reading 'v')`. Reproduced with a Home tap **and** with a same-view Books tap. |
| 2 | The predicate in §5 removes it | Same drive with the §5 predicate applied verbatim | **HELD.** 0 throws in all three variants of the drive. |
| 3 | An executed grep finds exactly six stack-writer sites and every one changes `navStack`'s top | `grep -n "navStack\|fwdStack" js/*.js` | **HELD.** Six write sites, all in `js/app.js`: `139`, `140`+`141`, `147`, `163`, `174`, `703-705`, `1181`. Every one replaces, pops or rebinds the top. `fwdStack.length = 0` never occurs without a `navStack` top change in the same statement pair. |
| 4 | All four `gen-swipe-model` fingerprints are unchanged | Ran `tools/gen-swipe-model.mjs` on the transformed copy and diffed the fingerprint block against the committed document | **HELD.** `navTo stack rule 0e84abdf6d072586`, `begin/nav-relation ac356cd1a669c2a3`, `end/state-routing 9a82592f5d21db7b`, `begin/supersession ce3a96a2ead88f31` — byte-identical. The region needles all terminate at or before `function settle(cur, commit)` (`js/app.js:598`), so the edits sit past every end mark. |
| 5 | The other 151 registrations are unaffected | Imported `MUTATIONS` from `tools/mutate.mjs` (CLI-guarded at `:1812`; never imported `tools/source-gate-sweep.mjs`) and counted occurrences of every `from` and `also.from` against the transformed source | **HELD FOR EDIT 1 ONLY.** Control: 0 rotted at HEAD. Edit 1 alone: exactly 1 rotted, `swipe: abort mutates the nav stack like a commit (-> I11 abort test)`. **Does not hold for the specified change** — F1. |
| 6 | Existing behavioural cells stay green | Ran the full suite on the copy with edit 1 applied. Copy baseline first: 916 / 913 pass / 2 fail / 1 skip, both failures git-only gates (`every hook script is EXECUTABLE in git's index`, `THE REAL ARTIFACT: this repo's own history passes the gate`) that cannot pass in a tree without `.git` | **HELD.** With edit 1: 916 / 911 pass / 4 fail. The two new failures are exactly the two the plan predicts — `every mutation anchor still matches the source it targets` (§8 item 1) and `the committed model is exactly what the generator produces` (§8 item 5). **No behavioural cell reddened.** |
| 7 | The build stamp must bump and the android copy is gitignored | READ, not measured. `js/app.js` is a shipping file and `test/shipping-change-bumps.test.js` exists; `android/.gitignore` exists | Accepted. Low-risk, and the standing PWA deploy rule says the same. |

---

## Findings

### F1 [Structural / defect] — §8's MEASURED blast radius was measured from ONE of the plan's THREE edits, and §13's equality rule turns the gap into a halt

**Severity: Structural. Nature: defect.**

§8 opens "Every figure below was produced by executing the transform in memory against `js/app.js`
… Nothing in this section is a reading," and item 1 concludes **"Exactly one registration rots."**
Item 6 then says the line delta is "**+4** lines in `js/app.js` **before edits 2 and 3**" — which is
the tell: the transform §8 measured is edit 1 alone. §4 declares three edits and §13 step 4 puts all
three in one build.

**MEASURED.** Control first, on a copy outside the repo.

| Transform applied | Registrations the anchors gate refuses | Which, and why |
|---|---|---|
| **none (control)** | **0** | — |
| **edit 1 only** (the §5 predicate, verbatim) | **1** | `swipe: abort mutates the nav stack like a commit (-> I11 abort test)` — rotted, `from` occurs 0 times. This is §8 item 1, reproduced exactly. |
| **edits 1 + 2** | **3** | the above, **plus** `M1NOWRITE: the abort finalize passes resetScroll: true…` and `S2-24 ABORTNORENDER: the abort re-render is restored…`, each **NON-UNIQUE**, `from` occurs **2** times. |
| **edit 3**, if the token lands on `js/app.js:700` | **+1** | `stage3: session id not stamped on the finalize line (-> distinct-sids test)` anchors on ` tgt=${…}:${tgDesc} sid=${cur.id}`)` — the closing backtick and paren are part of the anchor, so appending ` nav=…` inside that template literal rots it. |

**Why edit 2 does it.** §4 edit 2 requires the superseded settle to reconcile the current screen
"with no render and **no scroll write**". `dest` at that point already *is* `currentDesc()`
(`js/app.js:707`), and the option pair §4 mandates is `{ render: false, resetScroll: false }` — so the
natural statement is character-identical to the abort branch's `js/app.js:1038`. I wrote exactly that
and measured the abort reconcile line going from **1 occurrence to 2**. `resolveAnchor` — the shared
predicate `tools/mutate.mjs` and `test/mutation-anchors.test.js` both run — then refuses both
registrations by name:

```
NON-UNIQUE ANCHOR for #72 [js/app.js] M1NOWRITE …: `from` occurs 2 times in its target file.
NON-UNIQUE ANCHOR for #124 [js/app.js] S2-24 ABORTNORENDER …: `from` occurs 2 times in its target file.
```

and `test/mutation-anchors.test.js` fails **two** subtests, not one: `every mutation anchor still
matches the source it targets` **and** `no registered mutation anchor is non-unique without an
explicit disambiguation`. The second is a failure class §8 does not contemplate at all. §8's
"re-anchoring, specified" paragraph gives a repair for the rotted registration only; a non-unique
anchor takes a different repair (a longer `from`, or an explicit `occurrence: N`), and it is not
specified for either affected entry.

**What it costs if built as written.** §13 step 5b and the exit condition both require the measured
co-change set to **equal** §8's declared set, and the plan states in bold that a larger measured set
"is a blast-radius miss and this plan is amended before the commit lands." As written the builder
measures three-to-four against a declared one and halts — on correct work. The recorded outcome in
this project for a gate that fires on correct work is that the gate gets switched off.

**Note on the edit-3 row.** It is conditional on a placement the plan never fixes: the token rots
that registration if it lands on line 700 and does not if it lands inside line 699's template
literal. §7 item 3 hands the placement to the builder as "either is admissible". That is admissible
only because §8 never measured it.

### F2 [Structural / defect] — the +4 line delta and the census line numbers are edit-1-only figures, and §10's rebase argument for stage 7 is built on them

**Severity: Structural. Nature: defect.**

§8 item 5 states the census lines shift `704→708`, `705→709`, `1181→1185`, and item 6 states the
delta is `+4`. §10 reason (2)'s counterweight paragraph then argues that folding into stage 7 buys
only one rebase instead of two, because "the `+4` line delta shifts stage 7's `1022-1026` and
`1071-1081` ranges **by a constant**" — a two-number edit, "a mechanical correction and not a review
round."

**MEASURED**, by running `tools/gen-swipe-model.mjs` on the copy.

| Transform | `docs/swipe-model.generated.txt` census pins | `js/app.js` line delta |
|---|---|---|
| **edit 1 only** | `708`, `709`, **`1185`** | **+4** |
| **edits 1 + 2** | `708`, `709`, **`1189`** | **+8** |

The edit-1-only column reproduces §8 exactly, which is how I know that is what §8 measured.

Two consequences.

- **§8 item 5's declared figure is wrong for the specified change.** The builder at step 5b regenerates
  and gets `1189`, compares against a plan that says `1185`, and hits the same halt as F1 — this time
  for a row §13's exit condition names explicitly ("§8's measured co-change set equal to its declared
  set on all nine rows").
- **§10's "by a constant" is wrong.** Stage 7's `1022-1026` sits **above** edit 2 and shifts by **+4**;
  its `1071-1081` sits **below** edit 2 and shifts by **+8**. Two different constants, and the second
  one is not a number the plan has measured, because edit 2's delta is outside §8's transform. The
  ruling to land standalone still survives — reasons (1), (4) and (5) are independent of this
  arithmetic and I do not contest them — but the counterweight paragraph's "two-number edit" is not
  established by anything §8 measured, and the number it does supply is the wrong one for one of the
  two ranges.

### F3 [Structural / defect] — §1's "silently fails to arm" consequence, and the NAVSTALE oracle derived from it, are measured FALSE on branch F as driven

**Severity: Structural. Nature: defect.**

§1 states, as executed fact: "on branch F `navStack` retains an `undefined` entry, after which a
left-edge back gesture resolves `dest = navStack[navStack.length - 2]` to `undefined` and **silently
fails to arm** (`js/app.js:447`) — executed and observed." §9's `NAVSTALE` turns that into its
behavioural oracle: "after either settle a fresh left edge back gesture still ARMS **which at head it
silently does not**."

**MEASURED**, on HEAD source, after the branch-F drive that I confirmed throws:

```
throws after corrupt settle: 1
A) immediate left-edge ARMS: true
B) after ONE further navigation, left-edge ARMS: false
```

The `undefined` lands on **top** of `navStack` (`navStack.push(fwdStack.pop())`), not one below it,
so `begin()` reads `from = undefined` (harmless — `from` is only stored) and
`dest = navStack[len-2]`, which is a live descriptor. The gesture arms. It stops arming only after a
further navigation pushes on top of the `undefined` and moves it into the `len-2` slot. I reproduced
the failing case too, so the *phenomenon* is real — the **drive** is missing a step.

**What it costs.** `NAVSTALE` is the killing cell the plan names for `NAVSTALE-a`, `-b` and `-c`, and
the arming clause is the only witness §11 offers for the entire non-throwing corruption class. As
written, that clause **passes at HEAD** on branch F: it is not red-first, and a green result from it
proves nothing about the branch it was written for. This is the second oracle in this subsystem that
proves nothing by construction; the plan's own §12 records the first (`@reveal` FLASH) and warns the
test author about it. The remedy is a drive step, not a redesign: the branch-F drive must perform one
further navigation after the corrupt settle before it reads the arming oracle, and the plan must say
so, because a test author reading §1 as written will not.

Branch B is unaffected: there `navStack` empties, so `begin()` returns at `navStack.length <= 1`
(`js/app.js:443`) and the oracle is genuinely red-first. **READ, not driven** — I did not build a
branch-B fixture.

### F4 [Structural / defect] — the identity conjunct has no cell that can kill it, and `NAVSTALE-a`'s declared expectation is measured false

**Severity: Structural. Nature: defect.**

§5 makes the identity conjunct the semantic core of the design: "the check is on **object identity**
against `cur.from`", justified by Engineering Contract §4.12 because a `.v` comparison would miss
`navTo`'s same-view replacement. The branch conjuncts are described as a separate, subordinate
defence that makes the reads "total by construction". §9 registers `NAVSTALE-a` as "the identity
conjunct is deleted so `applies` reduces to the commit flag alone and **both sequences throw again**",
with "expected killing cell … `NAVSTALE`".

**MEASURED.** I ran the branch-F drive against three predicates, everything else identical:

| Predicate | settle log | timer throws | fresh left-edge arms |
|---|---|---|---|
| `commit && currentDesc() === cur.from && <branch conjuncts>` (as specified) | `#2 commit fwd books→options` | **0** | true |
| `commit && <branch conjuncts>` (identity conjunct **deleted** — this is `NAVSTALE-a`) | `#2 commit fwd books→options` | **0** | true |
| `commit && currentDesc().v === cur.from.v && <branch conjuncts>` (the §4.12 mutant) | `#2 commit fwd books→options` | **0** | true |

Indistinguishable on every observable §9 names, in both tap variants (a cross-tab Home tap and a
same-view Books tap). The reason is structural, not incidental: on sequence F the interfering
`navTo` sets `fwdStack.length = 0` (`js/app.js:141`), so `fwdStack[fwdStack.length - 1] === cur.dest`
is already false; the identity conjunct never gets to decide. On sequence B the interfering pop takes
`navStack` to length 1, so `navStack.length > 1` is already false — same redundancy (**READ**, from
source; I did not build the branch-B fixture).

So:

- **`NAVSTALE-a` as registered cannot be killed by `NAVSTALE`.** Its stated behaviour — "both
  sequences throw again" — is measured false for sequence F. Deleting the identity conjunct does not
  reduce `applies` to the commit flag; the branch conjuncts remain and they alone stop the throw.
- **The one case where the identity conjunct is load-bearing is the case the plan declines to
  cover.** It is the non-throwing wrong-entry class of §1's closing paragraph, where the stacks stay
  non-empty and only object identity distinguishes a superseded gesture from a live one. §11 states
  "no separate cell is owed — `NAVSTALE`'s arming clause is the witness," and F3 shows that clause
  does not witness what it claims even on the branch it was written for.
- **The plan applies this test to the wrong clause.** §5 is candid that `NAVTOTAL`'s conjuncts have no
  behavioural killer and pins them by a source assertion, calling an unkillable clause "exactly the
  vacuity this project has shipped before." The same audit run against the identity conjunct returns
  the same answer, and the plan does not run it.

**The invariant the plan must satisfy** (stated as an invariant, not an implementation — the choice
among the ways to satisfy it is the planner's): every conjunct of the predicate must have a named
registration whose expected killing cell can be shown to redden, and the `.v`-substitution mutant
§4.12 exists to rule out must be one of them. A drive over the non-throwing class is the obvious
carrier and it is already written down in §1's closing paragraph; a source cell in the shape of
`NAVTOTAL` is an admissible alternative, with the same honesty label `NAVTOTAL` already carries.

### F5 [Weak / defect] — edit 3's source range is absent from the machine-readable declaration, and §7 forces edit 1's range wider than declared

**Severity: Weak. Nature: defect.**

§4 declares three edits: `702-706`, `1032-1040`, and **`699-700`**. The `vitruvius-gate` block
declares `source_ranges: ["js/app.js:702-707","js/app.js:1032-1041"]`. Edit 3's range is missing, and
so is every downstream use of it — §10's disjointness list, §8's per-row scope, and F1's edit-3 row
all inherit the omission.

There is a second, tighter reason the declared lower bound is wrong. §7 item 3 requires the `nav=`
token to be computed from **the same** predicate as the mutation ("one source of truth (§4.16)"), and
the log statement executes at `699-700`, before the predicate at `702`. The alternative §7 offers —
"emitting the token with the existing line's other late-computed values" — is not available: there
are no late-computed values on that statement; every interpolation is evaluated when the line runs.
So the predicate **must** be hoisted above line 699, and edit 1's true range begins at 699 as well.
Both are disjoint from stage 7 either way, so this is not a conflict — it is a declaration that does
not describe the change, which is what the gate block exists to prevent.

### F6 [Weak / conditional] — a superseded settle changes the value handed to `Browse.endHold`, which is the exact callee stage 7 replaces

**Severity: Weak. Nature: conditional.**

**Condition:** this applies only if stage 7 is built **after** this slice lands — which is the
sequencing §10 rules for. If the order were reversed the crossing would be re-measured against
stage 7's interface instead, and the finding would not arise in this form.

`dropRowHold()` calls `Browse.endHold(t, currentDesc())` at `js/app.js:373`, from
`js/app.js:1026`, and the declaration comment at `js/app.js:350-356` states the justification
explicitly: "on a commit the stack mutation runs at the top of `runFinalize` … so the descriptor is
already the settled destination by the time either caller reaches it." **That sentence stops being
true on a stack-superseded settle**, where by design the mutation does not run and `currentDesc()`
is the *newer* screen rather than the gesture's destination. At HEAD the same path throws at
`js/app.js:1021` before reaching `1026`, so `endHold` runs from the `finally` with
`currentDesc()` — i.e. `undefined` on branch F. After this change it runs from `1026` with a real
descriptor for a screen the gesture never targeted.

Stage 7's `vitruvius-gate` declares `callee_ranges: ["js/browse.js:159-223"]` — the body of exactly
this callee — and replaces it with the lease interface. This slice therefore changes an input to a
function stage 7 is rewriting, on a path neither plan's coverage drives. §10's disjointness argument
is textual and cannot see it. Two things are owed, and both are cheap: the current-truth comment at
`js/app.js:350-356` is scrubbed in the same commit (§8's records-scrub list does not include it,
and §6.6 requires it), and stage 7's ledger gains the new landed-screen value as a crossing.

### F7 [Note / recommendation] — no cell drives a same-view `navTo` replacement, the case §4.12 is cited for

**Severity: Note. Nature: recommendation.**

§9 dimension 4 enumerates the branch matrix (`back`, `fwd`, `newNav`) and dimension 3 the settle-window
interleaving, but no cell drives the specific interference `navTo`'s same-view branch produces —
re-tapping the tab you are already on, which replaces the top descriptor with a fresh object of the
same `.v` (`js/app.js:139`). That is the one shape where identity and `.v` disagree, and it is why
§4.12 is quoted. It would be worth adding as a drive under `NAVSTALE`; it is a small extension of a
cell that already exists rather than a new one, and it is the natural carrier for F4's missing
`.v`-substitution registration. Recorded as a recommendation, not a requirement: F4 states the
invariant, and this is one way to meet it rather than the only way.

### F8 [Note / open-unknown] — §12's `enterApp` residual is correctly scoped, and I extend it by one measured fact

**Severity: Note. Nature: open-unknown.**

**The decision this waits on:** whether the open lock-screen resume thread will give `enterApp` a
foreground re-entry caller. Until that is decided, `enterApp` cannot be classified as reachable or
unreachable mid-settle.

§12 already names this correctly and calls "traced unreachable" a reading rather than an execution,
which is the right label. The measured facts I add: `enterApp` rebinds `navStack` wholesale at
`js/app.js:1181` and does **not** clear `fwdStack` — confirmed by reading `js/app.js:1170-1200` — so
after a foreground re-entry the two stacks are inconsistent with each other independently of any
gesture. That makes it a pre-existing hazard rather than one this plan creates, which is why it is a
Note; it is recorded here so the resume thread inherits it with a `file:line`.

---

## Coverage — how each blocking finding is verified

| Finding | Severity | Verified by |
|---|---|---|
| **F1** | Structural | The builder's step 5b re-run of §8's measurement against the **full** three-edit tree, control first, with the declared set amended to the measured one. The mechanical witness already exists and needs no new cell: `test/mutation-anchors.test.js` must be green at the end of the build, and it fails **two** subtests today under edits 1+2, so a green result there is the acceptance predicate. The plan must additionally specify the repair for a non-unique anchor (a longer `from`, or `occurrence: N`) for each affected registration, because §8's re-anchoring paragraph covers only the rotted one. |
| **F2** | Structural | Regenerating `docs/swipe-model.generated.txt` on the built tree and reading the census pins off the regenerated file, against a declared figure produced from the same three-edit transform. `test/swipe-model.test.js`'s "the committed model is exactly what the generator produces" is the mechanical witness. Separately, §10's stage-7 rebase note must state the two shift constants it actually needs, or drop the arithmetic. |
| **F3** | Structural | `NAVSTALE`'s branch-F drive must be shown **red at HEAD** before the fix lands, with the drive extended by the one further navigation the arming oracle requires. A red-first demonstration is the acceptance predicate; the plan's §12 already establishes that this subsystem produces oracles that pass for the wrong reason, so a green-after result alone is not evidence. |
| **F4** | Structural | Each conjunct of the predicate gets a named registration whose expected killing cell is demonstrated to redden — including a `.v`-substitution mutant. `NAVSTALE-a`'s registered expectation is corrected or the mutant is re-scoped; the clause that carries §4.12's rationale must not ship in the state `NAVTOTAL` is already labelled with. |

Non-blocking findings F5–F8 carry no verification obligation; F5 and F6 are corrections to the plan's
declarations and records-scrub list, F7 is a recommendation, F8 is an open unknown owned by another
thread.

---

## Prediction — where this breaks in execution if built as written

The build itself will go smoothly and land a working fix; that is not where it fails.

**It fails at step 5b, twice, within the same hour.** The builder applies the three edits, runs the
blast-radius probe, and measures three-to-four rotted or refused registrations against a plan that
says one, and `1189` against a plan that says `1185`. §13's bolded rule says a larger measured set
"is a blast-radius miss and this plan is amended before the commit lands." The correct reading is
that the *plan's* measurement was narrow, but the builder cannot know that from the plan — §8 asserts
it executed the transform — so the likely outcome is a mid-build re-plan round, and the unlikely-but
worse one is the builder concluding the rule is noisy and proceeding past it. This project has
recorded that second outcome before; F1 is the same defect the round-1 review found in stage 7's §11
one plan earlier, which is why I expect it rather than merely allow for it.

**Then it fails quietly, and that is the expensive one.** The test author writes `NAVSTALE` from §9,
including the arming clause. On branch F that clause passes at HEAD, so the red-first step produces a
partial red — the throw assertion reddens, the arming assertion does not — and a partial red is
routinely read as red. `NAVSTALE-a` is then registered, run, and found not to redden, and the natural
repair under time pressure is to widen the mutant until something breaks rather than to ask why the
conjunct has no witness. What ships is a correct fix whose semantic core — the object-identity check
that the entire §4.12 argument exists to justify — is defended by nothing, over a corruption class
(§1's closing paragraph) that has no cell at all. The next person to touch `runFinalize` weakens
`===` to `.v` equality for readability, every cell stays green, and the silent wrong-entry class comes
back without a single test moving.

**What I could not test.** I did not build a branch-B fixture: the settings sub-screen drill-in does
not wire through `test/app-harness.js` without additional fixture work, and the chapter-list route
§1 uses needs library data. Branch B's arming oracle and the redundancy of the identity conjunct on
the back branch are therefore READ from source, not driven — I state them as readings. That is the
tool ceiling for this round; a test author with the fixture will settle both cheaply, and F4's
invariant is written so it does not depend on which of the two branches carries the drive.
