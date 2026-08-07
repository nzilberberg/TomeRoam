# POIROT — the settle-window nav-stack staleness guard

Type: code-review
Prior-review: POIROT-swipe-declone-stage2-subtraction-49efe4f.md
Target: `8acbdff` (build `2026-08-05.3`), reviewed at HEAD `1ed2756` (a records-only commit on top).
Range: `eeda8e9..8acbdff` — nine files.
Plan of record: `Claude/Plans/PLAN-swipe-navstack-settle-window.md` — FORGE at plan-review round 3
(`Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r3.md`); no adversary gate is bound.
Red suite: `Claude/Curie/RED-swipe-navstack-settle-window.md` (`eeda8e9`, 12 skipped-red cells).
Build log: `Claude/Brunel/swipe-navstack-settle-window-build.md`, verdict BUILD_GREEN.
Tree: `git status --porcelain` empty before and after every command below; `find . -name "*.mutbak"`
empty in the repo throughout and in the scratch tree after every restore. Every mutant was applied
and restored on a copy OUTSIDE the repo, whose untransformed control reads 935 / 932 pass / **2
fail** / 1 skip — the two git-only gates (`every hook script is EXECUTABLE in git's index`, `THE REAL
ARTIFACT: this repo's own history passes the gate`), which cannot pass in a tree with no `.git`. A
mutant adds two further structural failures (`every mutation anchor still matches the source`, `the
no-mutbak CLI exits 0 on the clean repo`), so the noise floor under any mutant is **4**; every count
below is stated against that floor.

`Verdict: PASS — fix-then-ship.`

The guard is correct and the evidence behind it is real, not argued. §4.1's prescribed text is in the
tree **verbatim and contiguously, exactly once** for both blocks; the corollary the whole design rests
on — `currentDesc()` is total — holds against every stack writer read in full; all nine new mutants
fire on the cells the plan names and, where the plan claims exclusivity, only those; the throw oracle
is proven able to fail *in every build* by a live probe rather than by a citation. The builder's
`EMPTYAFTERHOME-a` disclosure is accurate in figure, in cause and in remedy — I re-derived it
independently, control first, and the re-anchored mutant still kills exactly the two cells it names.

Four findings, none reachable-and-broken in behaviour. Two a reviewer would require changed before
this closes: a production diagnostic that now asserts a false state on **every aborted swipe**, and
two mandatory record scrubs the plan assigned to this commit that the commit did not make. Two more
are measured enumerations in the build log that execution falsifies — the campaign's own recorded
failure class, arriving for the fourteenth time.

---

## Phase 1 — The scene

The change is a defect fix with an unusually tight declared shape: three executable edits and two
comment scrubs inside one function, plus the tooling co-change they force. The commit message scopes
itself accurately, names the deviation it found rather than burying it, and does not oversell — the
opposite of the "commit that scopes itself down" failure this seat's local disciplines warn about.

The design in one line: `runFinalize`'s commit branch stops writing the nav stacks unconditionally and
writes them only while the stacks still describe the navigation the gesture planned. The predicate is

```js
const applies = commit && currentDesc() === cur.from
  && (cur.dir === 'back' ? navStack.length > 1
    : cur.newNav ? true
      : fwdStack[fwdStack.length - 1] === cur.dest);
```

`applies` gates three consumers: the log token, the stack mutation, and the reconcile. It is a
function-local `const` evaluated once above the log line, so the reported outcome and the mutation
cannot disagree — verified by reading the whole region, not the hunk.

The unusual thread worth pulling at the outset is the one the brief hands over: the plan makes the
**exact characters** of §4.1 load-bearing, because a paraphrase would collide with `js/app.js:1038`
and turn two registrations non-unique. That is a claim a diff cannot settle and a `String.includes`
can, so it was the first thing measured.

## Phase 2 — The history

The two comments this commit corrects are the same sentence stated twice — at `dropRowHold`'s
declaration and again at its call site — and both were written by the stage that made
`dropRowHold`'s *position* a shipped defect fix (the empty-Books-page class). That history is why the
plan lists them separately: a scrub that fixes only the declaration leaves the call site asserting the
retired sentence, and the call site is the one a reader reaches first when tracing a settle.

It is also why `EMPTYAFTERHOME-a` rotted. Its anchor is `"…\n        dropRowHold();"`, and the comment
line in front of it is not decoration: `        dropRowHold();` occurs **twice** in `js/app.js` (the
hard-reset at `:427` and the finalize at `:1037`), so the comment prefix is the uniqueness
disambiguator. Scrub the comment and the anchor dies. The plan's §8 measured its transform as "§4.1's
prescribed text, all three edits together" and never included the two scrubs §8 itself mandates in the
same commit — so this rot was structurally invisible to three rounds of plan review. That is the
history that produced the disclosure, and it is confirmed below by execution rather than accepted.

## Phase 3 — Killer vs witness

The surface defect the plan fixed is real and the fix is at the root: the mutation is conditioned at
the one site that writes the stacks, not patched at the throw site. Nothing here convicts a witness.

The findings below split the other way. F1's killer is the plan (§4.1 prescribes the token expression
verbatim and forbids the builder from deviating), and the commit is the witness that carried it into
shipped code. F2's killer is likewise partly the plan — §13 step 8 miscounts §8's own owner column —
but the commit is a genuine co-defendant, because §8's table is unambiguous about who owns items 1
and 2 and when.

---

## Phase 4 — The investigation

### 4.1 The prescribed text is in the tree verbatim — executed, not eyeballed

`js/app.js` is CRLF in the worktree and the plan is LF, which is exactly the trap (T6) this project has
already been bitten by, so the comparison was normalised on both sides the way
`test/mutation-anchors.test.js` does:

```
node -e "… blocks = [...plan.matchAll(/```js\n([\s\S]*?)```/g)] … app.replace(/\r\n/g,'\n')"
  block 0 contiguous present: true occurrences: 1 at line 698
  block 1 contiguous present: true occurrences: 1 at line 1043
```

Both prescribed blocks appear **contiguously, exactly once**. The anchor-collision §4.1 exists to
foreclose is therefore foreclosed by the text actually shipped, not by the text the plan quoted.

### 4.2 The corollary the design rests on — `currentDesc()` is total

The plan states it as an absolute ("`navStack` is never empty … `js/app.js:1021` cannot throw"), which
is a checkable assertion wearing the voice of settled fact. Every stack writer was read in full:

| Writer | Line | Can it empty `navStack`? |
|---|---|---|
| `navTo` | `:139-141` | No — replaces the top or pushes. |
| `goBack` | `:145-147` | No — `if (navStack.length <= 1) return;` guards the pop. |
| `openSub` | `:163` | No — pushes. |
| `closeSub` | `:172-177` | No — pops only when `navStack[len-2]` exists, else delegates to guarded `goBack`. |
| `runFinalize` | `:713-716` | No — now behind `applies`, whose back arm requires `length > 1`. |
| `enterApp` | `:1197` | No — rebinds to `[{ v: 'home' }]`. |

The corollary holds. Separately, the branch conjuncts make each read total *by construction* rather
than by that enumeration: the back arm requires `length > 1`; the forward arm requires `fwdStack`'s
top to be `cur.dest`, which entails non-empty; the `newNav` arm reads nothing and pushes a captured
object. A seventh writer would not break totality, only classification — which is precisely the
residual §12 already owns.

### 4.3 The blast radius, re-derived independently, control first

Four states measured with the real exported `resolveAnchor`, counting **both** refusal classes, all
sources LF-normalised as the gate does. The code-edits-only state was reconstructed from the built
tree by reverting *exactly* the two comment scrubs, with a guard asserting each replaced text occurred
exactly once.

| registry | `js/app.js` state | REFUSED | which |
|---|---|---|---|
| pristine (152) | pristine | **0** | — (the probe reports a difference, not a constant) |
| pristine (152) | three code edits only | **1** | `swipe: abort mutates the nav stack like a commit` |
| pristine (152) | **built** (code edits + both scrubs) | **2** | the above **+ `EMPTYAFTERHOME-a`** |
| built (161) | built | **0** | — |

The builder's disclosure is confirmed in every part: the plan's declared `1` is exactly right *for the
transform §8 declared*, the commit's actual transform refuses `2`, and the extra is `EMPTYAFTERHOME-a`
rotted by the mandatory comment scrubs alone. Half (ii) is `0`, matching the plan.

### 4.4 Judgement on the `EMPTYAFTERHOME-a` disclosure and its re-anchoring

**The call to file it as a finding rather than halt was right.** §13's equality rule exists to catch a
*wrong transform* — a measured set larger than declared meaning the builder wrote something other than
what was specified. Here the transform was proven byte-correct by an isolating execution (code edits
alone reproduce the declared `1` exactly), so the surplus is a plan omission, not a build deviation.
Halting on it would have fired the rule on correct work for the fourth time in this project's history,
which is the exact failure §13's own round-2 note (F10) was rewritten to stop.

**The re-anchoring is sound, and this is measured, not argued.** A re-anchored mutant that no longer
expresses the defect it names is this project's recorded failure mode, so it was tested, not read:

```
node tools/mutate.mjs 135  →  node --test "test/*.test.js"  →  node tools/mutate.mjs --restore
  935 tests / 928 pass / 6 fail   (4 = the noise floor above)
  FAIL: EMPTYAFTERHOME — a commit that leaves Browse must not leave the Books controller ACTIVE with zero realized rows
  FAIL: EMPTYAFTERHOME — returning to Books after a commit to Home shows a page WITH ROWS, and it stays that way …
```

Exactly its two designated cells, in order, and nothing else. The `to` is unchanged, so the mutation's
*meaning* — remove the early `dropRowHold()` — is untouched; only the disambiguating comment prefix
moved, and it moved onto the same call site (`:1037`, the finalize one, not `:427`). The failure mode
the brief named does not apply here.

### 4.5 Every registered mutant, executed individually, foreground

Ten mutants applied one at a time on the out-of-repo copy, whole suite each time, restored each time,
`*.mutbak` checked after each restore and after the last (none, anywhere). Cited by name; the four
noise-floor failures are subtracted from every row.

| Mutant | Plan's declared killing cell | MEASURED |
|---|---|---|
| `NAVAPPLIES-a` (the re-anchor, `#22`) | I11 abort, **not** any NAV cell | I11 fires ✓ — **plus 13 further behavioural cells** (see F3) |
| `NAVSTALE-a` | `NAVIDENT` (I and S), **not** `NAVSTALE` | `NAVIDENT` I ✓, `NAVIDENT` S ✓, `NAVRECONCILE` ✓; `NAVSTALE` stays green ✓ |
| `NAVIDENT-a` | `NAVIDENT` drive **I only**, not S | drive I alone ✓ — the `===`-vs-`.v` separation is real |
| `NAVTOTAL-a` | `NAVTOTAL` source cell, **no behavioural cell** | `NAVTOTAL` alone ✓ — the source-only label is honest |
| `NAVTOTAL-b` | `NAVPAIR`, **not** `NAVTOTAL` | `NAVPAIR` alone ✓ |
| `NAVSTALE-b` | `NAVSTALE` drive B′ | B′ ✓ + `NAVIDENT` I/S + `NAVRECONCILE` (disclosed) + two gen-model gates |
| `NAVAPPLIES-b` | `NAVAPPLIES`, all four | all four ✓, broad collateral (disclosed and expected) |
| `NAVSTALE-c` | `NAVSTALE` **via the arming clause only** | see below — confirmed at assertion level |
| `NAVRECONCILE-a` | `NAVRECONCILE` `#options.scrollTop` | single clean kill ✓ |
| `NAVRECONCILE-b` | `NAVRECONCILE` `window.scrollTo` | `NAVRECONCILE` ✓ — **plus `M1WRITERSET`** (see F4) |

### 4.6 The oracle is proven able to fail — the brief's hard constraint, discharged

The plan warns that a bare "did not throw" assertion is vacuous, because `h.clock.advance` swallows a
throwing timer callback. Two independent proofs, both executed:

1. **The vacuity model, driven.** Under `NAVSTALE-c` — mutation unconditional *and* the throw
   swallowed at `reportReveal` — the drive-F cell fails, and the failing assertion is read from the
   runner's own output:

   > `error: 'currentDesc() must stay total: after the superseded settle AND one further navigation a
   > fresh left-edge back gesture must still go live …'`
   > `location: test/swipe-navstack-settle.test.js:198` — `stack: … :226:12`

   The **throw** assertion passes under that mutant and the **arming** assertion is what catches it.
   That is exactly the model the plan describes, and it means the cell is not resting on the
   swallowing harness.
2. **The instrument is proven live in every build.** `assertInstrumentLive` schedules a
   deliberately-throwing timer through the *same* wrapped `setTimeout` and asserts the counter caught
   it, so a post-build "0 throws on both drive and control" reading cannot be vacuous. The file also
   states in its header that the `@reveal` report is used as an oracle nowhere — the failed oracle the
   brief names is explicitly refused, not merely avoided.

### 4.7 Red-first, re-derived rather than inherited

The built test file run against the **pristine** `js/app.js`:

```
19 tests / 7 pass / 12 fail / 0 skipped
```

Matching the builder's figure exactly, and the 12 failures are exactly the 12 lifted cells. The test
file's own diff is **12 skip removals and nothing else** — no assertion, oracle, drive or message
changed (`git show 8acbdff -- test/swipe-navstack-settle.test.js`, every `+`/`-` pair is
`{ skip: SKIP }, async () => {` → `async () => {`).

### 4.8 Generated artefacts and the stamp

`node tools/gen-swipe-model.mjs` on a clean copy of the built tree produces a document **byte-identical
to the committed one** — regenerated, never hand-edited — with the three census pins reading `715`,
`716`, `1197` as the plan predicted. `node tools/stamp-build.mjs --check` → *all files match build.json
(2026-08-05.3)*, so `index.html`, `sw.js`, `js/debug.js` and `build.json` agree.

### 4.9 Every citation in the new prose, checked

`app.js:139` (navTo's same-view replacement) ✓ · `js/nav.js:125` (`const resetScroll = !opts ||
opts.resetScroll !== false;`, the default this comment turns on) ✓ · Engineering Contract §4.6 STALE
CONTINUATIONS ✓, §4.12 IDENTITY DISCIPLINE, closing with "Object identity is not semantic identity" ✓
· subsystem item 3 (`swipe-reveal.md:18`, nav-stack authority) ✓.

### 4.10 The reconcile's exit paths, read in full

`runFinalize` sets `finishing = false` on every non-throwing path including the new superseded branch;
the `try/finally` in `finalize` still calls `dropRowHold(); endOwnership();` and restores `finishing`
only on a throw. The superseded branch adds no listener, timer, frame or hold, and cancels none — the
deferred-resource sweep over the changed scope finds nothing new to cancel. What the branch *does*
change is that a superseded settle now **reaches** `dropRowHold()` (at HEAD it threw at
`reportReveal` two lines earlier and the hold was released only by the `finally`), handing
`Browse.endHold` a descriptor for a screen the gesture never targeted. That is the crossing the plan
files as stage 7's ledger item; it is an improvement here, not a regression, and it is correctly owned
elsewhere.

---

## Phase 4b — The Coverage Ledger

Rows enumerated mechanically from `git show --stat 8acbdff`; every file in the Range has rows.
`✓` = cleared by a command run **this pass** (commands are cited in Phase 4); `~` = cleared by reading;
`n/a` = the dimension cannot apply.

Columns: **C** correctness/data-flow · **D** deferred-resource cancellation · **L** object lifetime
across calls · **X** teardown symmetry / exit paths · **R** reassuring-comment & absolute-claim ·
**F** dead field / dead return · **E** executed enumeration probe · **A** citation & record accuracy.

| # | Changed symbol / region | C | D | L | X | R | F | E | A |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `js/app.js` `dropRowHold` declaration comment (scrub) | ~ | n/a | n/a | ~ | ~ | n/a | n/a | ~ |
| 2 | `js/app.js` `const applies` predicate + its comment block | ✓ | n/a | ~ | ~ | ~ | ~ | ✓ | ~ |
| 3 | `js/app.js` SWIPE log line `nav=` token | **F1 (Significant)** | n/a | n/a | n/a | ~ | ~ | **F1 ✓** | ~ |
| 4 | `js/app.js` `if (applies) { … }` stack mutation | ✓ | n/a | ~ | ~ | ~ | n/a | ✓ | ~ |
| 5 | `js/app.js` `dropRowHold()` call-site comment (scrub) | ~ | n/a | n/a | ~ | ~ | n/a | ✓ | ~ |
| 6 | `js/app.js` reconcile `if (applies) / else if (commit)` + comment | ✓ | ~ | ~ | ~ | ~ | n/a | ✓ | ~ |
| 7 | `tools/mutate.mjs` `ABORT_STACK_FROM/TO` re-anchor (`NAVAPPLIES-a`) | ✓ | n/a | n/a | n/a | ~ | n/a | ✓ | **F3 (Significant)** |
| 8 | `tools/mutate.mjs` nine new NAV registrations | ✓ | n/a | n/a | n/a | ~ | ~ | ✓ | **F4 (Minor)** |
| 9 | `tools/mutate.mjs` `EMPTYAFTERHOME-a` re-anchor | ✓ | n/a | n/a | n/a | ~ | n/a | ✓ | ~ |
| 10 | `test/swipe-navstack-settle.test.js` — 12 skip removals | ✓ | ~ | n/a | ~ | ~ | n/a | ✓ | ~ |
| 11 | `docs/swipe-model.generated.txt` regeneration | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 12 | `build.json` / `sw.js` / `js/debug.js` / `index.html` stamp | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 13 | `Claude/Brunel/swipe-navstack-settle-window-build.md` | ~ | n/a | n/a | n/a | ~ | n/a | ✓ | **F3, F4** |
| 14 | Records the commit was required to touch and did not | n/a | n/a | n/a | n/a | ~ | n/a | ✓ | **F2 (Significant)** |

Row 12 covers `index.html` on the stamp axis only; the brief settled independently that its 70 changed
lines are entirely `?v=` cache-bust bumps plus the build meta tag, and `stamp-build --check` confirms
the four files agree, so no hand edit is reachable there.

---

## Phase 5 — The revelation

`Verdict: PASS — fix-then-ship.` Nothing is reachable-and-broken in behaviour. Two findings a
competent reviewer would require changed before this closes; two record-accuracy findings in the same
class this campaign keeps producing.

| # | Severity | Finding |
|---|---|---|
| **F1** | **Significant** | Every plain ABORT now logs `nav=superseded`. `applies` is `commit && …`, so it is false on every abort by construction, and the token's ternary has only two arms. MEASURED, by driving an uninterfered aborting left-edge swipe through the real app: `#1 abort back books→home nav=superseded tgt=live:div.book sid=1`. "Superseded" is a defined term here — plan §5 defines *stack-superseded* only for `commit === true`, and this commit's own reconcile comment glosses it as "the screen a newer navigation reached" — so roughly half of every device log's settle lines now assert a supersession that did not happen, in a subsystem where `sid=`/`revealWatch('superseded')` already own that word. No cell asserts the abort token. §4.1 prescribes the expression verbatim and forbids deviation, so the correction is a plan amendment (a third arm, or gating the token on `commit`) and then a build. |
| **F2** | **Significant** | §8 scrub items **1 and 2** — `Claude/Subsystems/swipe-reveal.md` items 12 and 13, owner "the builder, same commit" — are not done. `git log -- Claude/Subsystems/swipe-reveal.md` shows the last touch is `cf48e03`, well before this slice. Item 12 (`:174`) still states "Commit: mutate the stack, applyScreen the destination" unconditionally, which the plan's §2 itself labels "current truth today and becomes wrong on approval"; item 13 (`:178-180`) is still the two-case dichotomy §2 declares a GAP needing a third outcome. The build log's §10 scope list does not name the file, so the omission is undisclosed. The plan contributed: §13 step 8 says "seven items, **five** of them owned outside the build commit" while §8's owner column has **four** in-commit and **three** outside — that miscount is itself owed a correction. |
| **F3** | **Significant** | The build log's collateral enumeration for `NAVAPPLIES-a` is falsified by execution. It states "Collateral: also reddens `I7` and `NAVRECONCILE` control 2". MEASURED over the whole suite: **14** behavioural cells redden — I11 (the designated kill, which does fire) plus I7, NAVRECONCILE control 2, NAVAPPLIES (abort), PEERFINALIZE ×2, NPRECONCILE ×2, HOMESTAYSLIVE, LANDEDPAGESHOWS ×3, PS, and ABORT. The cause is structural and worth stating in the record: the re-anchor moves the mutation onto the line that gates **both** the stack write and edit 2's reconcile, so it replaces the entire abort reconcile path, not just the stack write. The coverage claim survives; the enumeration does not. |
| **F4** | **Minor** | The build log calls `NAVRECONCILE-b` a "Clean single-cell kill, 0 → 1 exactly as measured". MEASURED: it reddens `NAVRECONCILE` **and** `M1WRITERSET` (the derived vertical-scroll-writer registry gate), because the mutant introduces a new `window.scrollTo` occurrence. Two cells, not one. |
| **O1** | Observation | This build's +11/+16 shift invalidates all four `js/app.js` cites in open watch item **[W73]** (`665-666`, `1015-1016`, `1045-1046`, `1076-1078`); `:1045` now lands on this commit's own new comment. Re-derive when the item is worked. Same citation-drift class as [W49], [W53], [W62], [W63]. |
| **O2** | Observation | §8 scrub items **5, 6 and 7** (`PLAN-swipe-stage7.md` §14/§17, its `vitruvius-gate` `source_ranges` and ledger; the board and decision log) are owned outside this commit and remain open. Named so the plan's exit condition "the §8 records scrub complete on all seven items" is not read as satisfied by this build. |
| **O3** | Observation | The `nav=` token is a production observable with no cell of its own on the abort path — F1 shipped precisely because nothing asserts it there. Handed to the coverage auditor, whose gate is next. |

**Disposition of what is left unfixed by this review:** nothing. F1–F4 are defects, stated as defects,
each with a named owner. O1–O3 are pre-existing or out-of-scope and say which.

## Phase 6 — The prediction

F1 is the one that will cost something, and it will cost it at the worst moment. This project's
standing discipline is *device log before diagnosis*, and the next settle-path defect will be
diagnosed from a log in which every aborted swipe claims a newer navigation superseded it. The
diagnostician will either chase supersessions that never happened, or — having learned the token lies
on aborts — stop trusting it on commits too, which retires the instrument this slice was built to add.
A diagnostic that is wrong half the time is worse than one that is absent, because absence is visible.

F2 will surface as a contradiction rather than a bug. `swipe-reveal.md` is the *defining* record — the
plan's own §2 reconciles against it before designing — so the next plan over this subsystem will read
item 12, believe the commit mutation is unconditional, and design against a system that stopped
existing at `8acbdff`. Item 13 is worse in kind: it is a dichotomy over failure, and the third outcome
this slice created is neither of its two cases, so a recovery question asked against it returns a
confidently wrong answer rather than no answer.

F3 and F4 predict themselves. The next audit that needs to know what `NAVAPPLIES-a` reaches will read
"I7 and NAVRECONCILE control 2", scope its work to those two, and miss twelve. That is the fourteenth
instance in this campaign of an enumeration stated as complete and falsified by the first person to
execute it — and, once again, no amount of further reading would have found it.

---

## Watch-list

Carried from `POIROT-swipe-declone-stage2-subtraction-49efe4f.md`. Every prior open item carries
forward unchanged unless a status is given below. **No item is resolved by this build.**

- **[W1] [W4] [W7] [W11] [W13] [W16] [W18] (open)** — apply-on-approval records for stages 6b–6h un-applied in HEAD. Owner Zelda.
- **[W2] (open)** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device.
- **[W5] (open)** — Loki r2 lesser planes (`recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` → Brunel).
- **[W6] (open)** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat. ⚠️ Enlarged in kind by this slice: a settle-window tap now silently supersedes a committed gesture instead of corrupting the stack, which is correct but is still a feel decision nobody has ruled on.
- **[W8] (open)** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda.
- **[W14] (open)** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device.
- **[W21] (open)** — a fresh Loki strike against the BUILT 6i code. Owner Loki.
- **[W22] [W23] [W24] [W25] (open)** — 6i `#home` device gates R1(a)–(e). Owner on-device.
- **[W26] (open)** — 6i apply-on-approval records (plan §13 amendments/annotations). Owner Zelda.
- **[W28-residual] (open)** — ghost-era vocabulary throughout the settle path in `js/swipe.js` and `js/app.js`. Non-blocking. See [W73], whose cites this build invalidated.
- **[W29] (open)** — `plan.incoming` / `plan.outgoing` / `plan.renderDestination` production-unread, deliberate and exact-key-gated. Owner Vitruvius. Non-blocking.
- **[W30] [W31] [W32] [W33] (open)** — browse-decouple device gates R-flash / R-navbar / R-strip / R-browse2browse. Owner on-device.
- **[W34] (open)** — no `DecisionLog.md` NEW-POLICY entry for `PL-swipe-browse-fixed-ownscroll`. Owner Zelda. Non-blocking.
- **[W35] (open)** — build-log "Files changed" lists omit build-stamp files. **Fourth counterexample:** this build log's §10 names `build.json`/`sw.js`/`js/debug.js`/`index.html` explicitly. Recommend closing as no longer general. Owner Brunel/Zelda. Non-blocking.
- **[W36] (noted)** — Flash C (browse→browse in-list divider re-raster) out of scope.
- **[W38] (open)** — three shipped prose sites state the exclusivity universal plan §5.1 forbids. Owner Brunel.
- **[W41] (open)** — `showAppView`'s sweep is LIVE and must be KEPT. Not to be re-opened.
- **[W42] (open)** — plan §5.2's `.alphaindex` argument for A2 does not cover the browse↔settings gesture window. Owner Vitruvius.
- **[W43] (open)** — device-owed R-B / R-C / R-E / R-G, unclaimed by any cell. Owner on-device.
- **[W44] (open)** — `js/app.js`'s three `applyScreen(d, {render:true})` call sites for browse descriptors with no `gestureOwnsMovers` guard. Not re-read this pass; carried forward unchanged. Owner Brunel. Non-blocking.
- **[W46] (open)** — a same-key browse pair puts one node in both mover slots. Owner Vitruvius.
- **[W47] (open)** — `js/browse.js:192-193` and plan §5.3.6 name `home→browse` / `overlay→browse` as miss-branch transitions; they take the landed branch. Owner Brunel + Vitruvius.
- **[W49] (open)** — the three trigger-census citations in `Claude/Brunel/swipe-declone-stage2-build.md` §1 point at wrong lines. Owner Brunel.
- **[W53] (open)** — `css/app.css:125` cites `css:224-229`; the `navIn*` keyframes are uncited. Owner Brunel.
- **[W54] (open)** — three sites in `test/parked-page-rides-home-css.test.js` state a HEAD that no longer exists. Owner Brunel.
- **[W55] (open)** — `SKIP_FLOOR` / `SKIP_FORM` dead in a tool no linter reaches. Owner Brunel.
- **[W56] (open)** — two plan §11 on-approval record items unfilled. Owner Zelda.
- **[W57] (open)** — PARKM4's registered name claims a kill the sweep disproves. Owner Brunel/Curie.
- **[W58] (open)** — `css/app.css:140-141`'s "nothing in js/ listens for resize". Owner Brunel.
- **[W59] (open)** — the no-`padding`/no-`border` precondition cell is a GATE with no registered mutant. Owner Mendeleev.
- **[W60] (open)** — the real-engine oracle has no recorded run at 375/640/1000px. Owner the deriver / bench.
- **[W61] (open)** — the parked-page device gate, plan §8 items 1 and 2, still unclaimed. Owner on-device.
- **[W62] (open)** — `test/one-screen-type.test.js:192-195` cites a de-registered mutant by name. Owner Brunel.
- **[W63] (open)** — `test/one-screen-type-npparks.test.js` line citations drifted. Owner Brunel.
- **[W64] (open)** — two sites state the retired NP-back-reveal mechanism as current. Owner Brunel.
- **[W65] (open)** — `PLAN-one-screen-type.md:39` / `:98` contradict §13 steps 1 and 8 on A1b's verdict of record. Owner Zelda.
- **[W66] (open)** — §14's `NPUNTOUCHED` / `NPPARKS` rows disagree with the registered mutants. Owner Mendeleev.
- **[W67] (open)** — Loki's WebKit residual is on the board but not in the plan's device-gate list. Owner Zelda, then on-device.
- **[W68] (open)** — Stage A1b has no `DEVICE-*` record. Owner Zelda. Non-blocking on code.
- **[W69] (open)** — nothing gates the single-writer property on `#nowplaying`'s `hidden`. Owner Mendeleev.
- **[W70] (open)** — `tools/mutate.mjs` indices 54 and 142 are one mutant registered twice. Owner Brunel. ⚠️ Both indices have shifted by +9; re-derive by NAME, not index.
- **[W71] (open)** — `js/app.js:221-227` states a `begin()` rejection and a PANE-OWNING deferral that D8 deleted. Owner Brunel.
- **[W72] (open)** — vacuous ghost assertions at `test/swipe-invariants.test.js:462`, `test/swipe-stage6.test.js:340`, `test/swipe-stage6i.test.js:91`/`:109`. Owner Brunel.
- **[W73] (open)** — comment residue outside D16b's "full list". **Cites invalidated by this build** (see O1): `js/app.js:665-666`, `:1015-1016`, `:1045-1046`, `:1076-1078` all shifted by +11/+16 and none now lands on a ghost-vocabulary comment; `test/home-abort-writes.test.js:249` is unaffected. Re-derive before working. Owner Brunel.
- **[W74] (open)** — `tools/mutate.mjs:91` `RECOVERY_RENDER_ALWAYS_FALSE` is dead; `tools/**` is outside `eslint.config.js`'s scope entirely. Owner Brunel + Vitruvius/Mendeleev.
- **[W75] (open)** — `.replace(/ ghosts=\d+$/, '')` strippers for a deleted token at two sites. Owner Brunel.
- **[W76] (open)** — the generated swipe model describes a retired concept as "marker element". Owner Vitruvius.
- **[W77] (open)** — `regionHash` pins comments as well as code. **Second piece of evidence, from this build:** two comment-only scrubs rotted a mutation anchor (`EMPTYAFTERHOME-a`) for exactly the reason this item names — comment text is load-bearing to tooling. Owner Vitruvius. Non-blocking.
- **[W78] (open)** — the derived co-change tool; the surface set must extend past `tools/mutate.mjs`. **Seventh piece of evidence:** §8's blast-radius transform omitted the mandatory comment scrubs, so the tool must take *the commit's whole declared change set* as its input, not the plan's code-edit list. Owner Vitruvius.
- **[W79] (open)** — device gate on plan §11 step 7 of the browse-decouple slice, owed on build `2026-08-05.1`. Owner on-device.

New this build:

- **[W80] (open) (NEW)** — **F1.** Every plain abort logs `nav=superseded`. Fix is a plan amendment to §4.1's token expression (a third arm, or gate the token on `commit`) and then a build. Owner Vitruvius, then Brunel.
- **[W81] (open) (NEW)** — **F2.** `Claude/Subsystems/swipe-reveal.md` items 12 and 13 unscrubbed (§8 items 1 and 2, owner "the builder, same commit"). Owner Brunel. Carries a second half: plan §13 step 8's "five of them owned outside the build commit" contradicts §8's owner column (four in, three out). Owner Vitruvius.
- **[W82] (open) (NEW)** — **F3.** The build log's `NAVAPPLIES-a` collateral list names 2 cells; 14 redden. Owner Brunel.
- **[W83] (open) (NEW)** — **F4.** The build log calls `NAVRECONCILE-b` a single-cell kill; it also reddens `M1WRITERSET`. Owner Brunel.
- **[W84] (open) (NEW)** — **O2.** §8 scrub items 5, 6 and 7 open. Owners: the planner (stage 7 §14/§17, its gate ranges and ledger) and the assistant (board, decision log).
- **[W85] (open) (NEW)** — **O3.** The `nav=` token has no cell on the abort path, which is why F1 shipped. Owner Mendeleev, whose gate is next.
- **[W86] (open) (NEW)** — the plan's §12 closure-under-composition residual is now the *only* unclosed coordinate of this design, and it is untested by construction. The back arm reads only `navStack`, whose identity an `openSub`/`closeSub` pair preserves, so an identity-preserving pair on the **back** branch passes the guard. Read in full this pass and judged **not a defect**: the resulting `fwdStack` write is byte-for-byte what an explicit `goBack()` would have produced from the same state, so the gesture behaves as the user's own back control would. Recorded because the reasoning is a reading, not an execution, and because it is the coordinate a future strike should aim at. Owner Loki, if and when this subsystem is commissioned again.

---

**Handoff.** Source artifact: this casebook. Verdict: **PASS — fix-then-ship**; the code-review gate is
**cleared**. Next owner: **the coverage auditor** (plan §13 step 7), whose pass should start from
[W85]. Required before the slice closes: F1 via the planner then the builder; F2, F3 and F4 via the
builder; O2's three record items via their named owners.
