# Brunel — build log: the settle-window nav-stack staleness guard

Type: build log

Plan: `Claude/Plans/PLAN-swipe-navstack-settle-window.md`, cleared to build at round 3
(`Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r3.md`, verdict FORGE, no round 4 owed).
Red suite: `test/swipe-navstack-settle.test.js`, authored by the test author against HEAD `eeda8e9`
(`Claude/Curie/RED-swipe-navstack-settle-window.md`, verdict RED_SUITE_READY).
Input HEAD for this build: `eeda8e9ccda7e71a4cb4a8d91ca610244a6cd90e`, `main` == `origin/main`, tree
clean, no `*.mutbak`, `tools/mutate.mjs` holding 152 registrations, suite 935 / 922 pass / 0 fail /
13 skipped.

Verdict: **BUILD_GREEN**.

---

## 1. Red-first, reproduced (not inherited)

Removed the 12 `SKIP-PENDING-BUILD` skips from `test/swipe-navstack-settle.test.js` (the only edit
made to that file — no assertion, oracle or drive touched) and ran it against unmodified HEAD:

```
19 tests / 7 pass / 12 fail / 0 skipped
```

This matches the test author's own measurement exactly. Red-first is confirmed, not inherited.

## 2. The three prescribed edits (§4.1), verbatim

Edit 1+3 (`js/app.js:699-702` at HEAD) hoists the `applies` predicate above the SWIPE log line and
adds the `nav=` token; edit 2 (`js/app.js:1032`) adds the stack-superseded reconcile case. Both were
typed character-for-character from §4.1's prescribed text — no paraphrase, no reformat. After the
edits the six-stack-writer sites the plan's mutation-registration comment `NAVSTALE`'s length
conjunct depends on land at `js/app.js:715` (`navStack.push(cur.dest); fwdStack.length = 0;`) and
`716` (`else navStack.push(fwdStack.pop());`) — the census pins the plan predicted.

## 3. The two comment scrubs (§8 items 3 and 4)

`js/app.js:350-356` (the `dropRowHold` declaration comment) and the sibling at the call site
(originally `1022-1025`, now `1033-1036` after edit 1+3's +11 shift) both asserted "currentDesc() is
always the settled destination"; both are corrected to state the APPLIED case and the new
stack-SUPERSEDED case. **Both scrubs were written to hold the SAME LINE COUNT as the text they
replaced** (7 lines and 4 lines respectively) — this is load-bearing, not stylistic: the plan's §8
blast-radius section (item 5) and its declared census pins (`704→715`, `705→716`, `1181→1197`) were
measured from a transform that adds exactly +16 lines total (edits 1+3, +11; edit 2, +5) with the
comment scrubs assumed net-zero. Confirmed after regeneration: `enterApp`'s `navStack = [...]` rebind
now sits at `js/app.js:1197`, matching the plan exactly.

## 4. The re-anchoring (§8), plus ONE the plan did not enumerate — see §6

The rotted registration `swipe: abort mutates the nav stack like a commit` (`tools/mutate.mjs`, was
anchored on `if (commit) {` + the back-pop line) is re-anchored to the new predicate's first line,
dropping only the `commit &&` conjunct:
`const applies = commit && currentDesc() === cur.from` → `const applies = currentDesc() === cur.from`.
This is `NAVAPPLIES-a` — not new, per the plan.

## 5. Nine new registrations (`tools/mutate.mjs`, 152 → 161)

`NAVSTALE-a`, `NAVSTALE-b`, `NAVSTALE-c`, `NAVIDENT-a`, `NAVAPPLIES-b`, `NAVRECONCILE-a`,
`NAVRECONCILE-b`, `NAVTOTAL-a`, `NAVTOTAL-b`. Confirmed count via `node tools/mutate.mjs --list`:
161 lines (indices 0-160). `test/mutation-anchors.test.js`: **6 tests / 6 pass / 0 fail** on the
built tree.

Construction notes on the two that needed more than a one-line diff:
- `NAVSTALE-b` restructures the guard so the back branch runs whenever `commit && cur.dir==='back'`
  (ignoring the identity/length conjuncts) while the forward branches stay behind the full `applies`.
- `NAVSTALE-c` restructures the guard back to `if (commit)` (unconditional, as at HEAD) AND wraps the
  `reportReveal(...)` call — the one throw site, confirmed by reading `js/nav.js:137`'s null-safe
  `applyScreen` — in a `try/catch` that swallows the exception there, so the mutation runs and
  corrupts the stacks while the bare "did it throw" assertion passes; only the arming clause (a fresh
  gesture after ONE FURTHER navigation) witnesses it. This is exactly the model the RED record
  declined to build and left to the builder.

## 6. Step 5a — every named mutant executed individually, foreground, restored

Ten mutants run one at a time (`node tools/mutate.mjs <index>`, test, `node tools/mutate.mjs
--restore`), including the pre-existing re-anchored `NAVAPPLIES-a` for completeness. **No `*.mutbak`
anywhere after each restore, confirmed after the last one.**

| Mutant | Designated cell | Result |
|---|---|---|
| `NAVAPPLIES-a` (re-anchor) | I11 abort test (`test/swipe-invariants.test.js`) | **Fires on the intended assertion** (stack mutated on abort). **CORRECTED (Poirot F3, re-measured at the post-review amendment, §11.6; list corrected in place per Poirot F1 on `9506f3a`, §12):** the collateral stated here as "also reddens `I7` and `NAVRECONCILE` control 2" was wrong. MEASURED over the whole suite on a copy outside the repo: **14** further behavioural cells redden alongside I11 — `I7`, `NAVRECONCILE` control 2, `NAVAPPLIES` (abort), `NAVAPPLIES` (abort token), `PEERFINALIZE` ×2, `NPRECONCILE` ×2, `HOMESTAYSLIVE`, `LANDEDPAGESHOWS` ×3, `PS`, `ABORT` — because the re-anchor moves the mutation onto the line gating BOTH the stack write and edit 2's reconcile, replacing the whole abort reconcile path, not just the stack write. Not one of the nine; the coverage claim (I11 fires) survives, the enumeration above it does not. |
| `NAVSTALE-a` | `NAVIDENT` (I, S) + `NAVRECONCILE`, NOT `NAVSTALE` | Matches plan exactly, extra witness as documented. |
| `NAVIDENT-a` | `NAVIDENT` drive I only, not S | Matches plan exactly. |
| `NAVTOTAL-a` | `NAVTOTAL` (source) only, no behavioural cell | Matches plan exactly. |
| `NAVTOTAL-b` | `NAVPAIR` (drive T) only, not `NAVTOTAL` | Matches plan exactly. |
| `NAVSTALE-b` | `NAVSTALE` drive B′ | Fires. Collateral: `NAVIDENT` (I, S) and `NAVRECONCILE` also redden — the RED record's own caveat anticipated this ("the registration the builder writes may be narrower [or not]"). |
| `NAVAPPLIES-b` | `NAVAPPLIES`, all four branches | Fires; broad collateral expected (the whole mutation mechanism is deleted). |
| `NAVSTALE-c` | `NAVSTALE`, via drive F's arming clause | **Confirmed the throw assertion PASSES (swallowed) and only the arming clause fails** — exactly the model the RED record described and declined to build. Drive B′ stays green under this mutant (its test has no arming-clause assertion to witness the same class). Collateral: `NAVIDENT`, `NAVPAIR`, `NAVRECONCILE`. |
| `NAVRECONCILE-a` | `NAVRECONCILE`, `#options.scrollTop` clause | Clean single-cell kill, 300 → 0 exactly as measured. |
| `NAVRECONCILE-b` | `NAVRECONCILE`, `window.scrollTo` clause | **CORRECTED (Poirot F4, re-measured at the post-review amendment, §11.6):** stated here as "clean single-cell kill" — wrong. MEASURED on a copy outside the repo: **two** cells redden, `NAVRECONCILE` and `M1WRITERSET` (the derived vertical-scroll-writer registry gate), because the mutant introduces a new `window.scrollTo` occurrence that `M1WRITERSET`'s registry also tracks. |

## 7. Step 5b — the blast-radius probe, control first, two halves — ONE DEVIATION FOUND

Measured on scratch copies outside the repo (`git archive HEAD` + overlay), never touching the
working tree, using the real `resolveAnchor` from each half's own `tools/mutate.mjs`.

**Control** (pristine copy, both files untouched): **0** refused of 152 registrations / 161 anchor
parts. Confirms the probe reports a difference, not a constant.

**Half (i) — three source edits applied, `tools/mutate.mjs` UNCHANGED.** Plan's declared figure: 1.
**Measured: 2**, not 1:
- `swipe: abort mutates the nav stack like a commit` — ANCHOR NOT FOUND (the plan's own declared row).
- `EMPTYAFTERHOME-a` — ANCHOR NOT FOUND. **This is not in the plan's §8 blast-radius table.**

**Root cause, isolated by execution.** Applied ONLY the three §4.1 code edits (no comment scrubs) to
a fresh copy: refused = **1**, exactly the plan's declared figure — reproducing it exactly confirms
my edit-1/2/3 text is byte-identical to §4.1's prescription. Applied the two comment scrubs alone (no
code edits): `EMPTYAFTERHOME-a`'s anchor — `"// this function, well before this line.\n
dropRowHold();"`, the tail of the OLD call-site comment §8 item 4 requires scrubbing — no longer
matches, because the scrub's own wording changes that line. **The plan's §8 blast-radius section
states its transform is "§4.1's prescribed text, all three edits together" — it never included the
two comment scrubs §8 itself also mandates in the same commit, so this second rot was never
measured.** This is the same failure class the campaign has hit repeatedly (enumeration incomplete,
found by executing).

**Resolution, mechanical, same technique the plan already prescribes for the sibling rot.**
Re-anchored `EMPTYAFTERHOME-a` onto the new comment's new last line, preserving its `to` (and
therefore its meaning — "the early dropRowHold() is removed") unchanged. No design judgment was
involved: the fix is the identical preserve-meaning-move-the-anchor pattern §8 already specifies for
`NAVAPPLIES-a`, applied to one more site the plan's own measurement missed.

**Half (ii) — the built tree, i.e. (i) plus BOTH re-anchorings.** Plan's declared figure: 0.
**Measured: 0**, matching. `test/mutation-anchors.test.js`: **6 tests / 6 pass / 0 fail**, count read
from the runner.

**This is a finding for the planner, not a blocked build:** the fix is narrow, mechanical, and already
verified (the anchors gate is green and `EMPTYAFTERHOME-a`'s own mutation still applies and still
kills its designed cells — reconfirmed by re-running it individually after the re-anchor). Recorded
here per the equality rule's own purpose (catching a wrong transform, not a plan that omitted a
co-change from a mandatory step) rather than treated as silent.

Also on the built tree, all measured exactly as declared: the four `gen-swipe-model.mjs` region
fingerprints unchanged; the append-census text unchanged; `docs/swipe-model.generated.txt`
regenerated (never hand-edited) with its three census pins reading **715, 716, 1197**.

## 8. Step 5c — build stamp

`build.json`'s `build` bumped `2026-08-05.2` → `2026-08-05.3` (this project's standing rule: any
commit touching app code bumps the build). `node tools/stamp-build.mjs` propagated it to `sw.js`,
`js/debug.js`, `index.html`; `node tools/stamp-build.mjs --check` confirms all four agree.

## 9. Final suite

`node --test "test/*.test.js"`, count read from the runner:

```
935 tests / 934 pass / 0 fail / 1 skipped
```

The one remaining skip is the pre-existing device-only `KEEPER` cell, unrelated to this build. All
12 lifted skips are green; `NAVAPPLIES`'s four preservation cells stayed green throughout.
`git status --porcelain` before this commit names exactly the files this build touched, plus
`Claude/Zelda/Board.md` (a concurrent records-only edit from the tracking seat, not part of this
build and not staged by it).

## 10. Scope discipline

Writable set respected: `js/app.js` (the three edits, two comment scrubs), `tools/mutate.mjs` (nine
registrations, plus the plan's own re-anchoring AND the one additional re-anchoring found in §7 — same
technique, same file, no new file touched), `docs/swipe-model.generated.txt` (regenerated only),
`build.json`/`sw.js`/`js/debug.js`/`index.html` (build stamp), `test/swipe-navstack-settle.test.js`
(skip removal only — no assertion, oracle or drive changed). The plan itself was not edited; the §7
finding is recorded here and belongs in the planner's records.

**Next owner: the code reviewer.**

---

## 11. Post-review amendment build (plan §13 step 9b) — 2026-08-06

Code review: `Claude/Poirot/POIROT-swipe-navstack-settle-window-8acbdff.md`, verdict PASS —
fix-then-ship, F1/F2/F3/F4 owed to the builder. Plan amended at `a630d40` (§4.1's token gains a
third arm; §8 re-measured). Round-2 red cell: `Claude/Curie/RED-swipe-navstack-settle-window.md`
§9, authored against `c488677`. Input HEAD for this section: `a509115`, `main` == `origin/main`,
tree clean, no `*.mutbak`, `tools/mutate.mjs` holding 161 registrations, suite 936 / 934 pass /
0 fail / 2 skipped.

Verdict: **BUILD_GREEN**.

### 11.1 Red-first, reproduced (not inherited)

Removed the one remaining `SKIP-PENDING-BUILD` skip from `test/swipe-navstack-settle.test.js` —
the `NAVAPPLIES (abort token)` cell — and ran the file against unmodified HEAD:

```
20 tests / 19 pass / 1 fail / 0 skipped
```

Failing assertion, verbatim from the runner: `expected 'abort'`, `actual 'superseded'`, on
`#1 abort back books→home nav=superseded tgt=live:div.book sid=1`. Matches the test author's
record exactly (§9.2), same count, same message, same settle line. Red-first confirmed, not
inherited.

### 11.2 §4.1's amended token, verbatim — the single changed line

`js/app.js:707` (the SWIPE log line's first template literal): the two-arm
`nav=${applies ? 'applied' : 'superseded'}` becomes the three-arm
`nav=${!commit ? 'abort' : applies ? 'applied' : 'superseded'}`, typed character-for-character
from §4.1. `git diff --stat js/app.js`: 1 file changed, 1 insertion(+), 1 deletion(-) — the only
change to that file. No other line in `runFinalize` touched.

### 11.3 `NAVTOKEN-a` registered (`tools/mutate.mjs`, 161 → 162)

`from` = the three-arm token substring, `to` = the two-arm token substring (§9.6's exact text),
placed after `NAVRECONCILE-b` in the existing NAV registration block. Confirmed via import:
`MUTATIONS.length` **162**. `test/mutation-anchors.test.js`: **6 tests / 6 pass / 0 fail**.

### 11.4 §8 scrub items 1 and 2 — done

`Claude/Subsystems/swipe-reveal.md` items 12 and 13 (Poirot F2) were unconditional/two-case as of
`8acbdff`. Item 12 now states the stack mutation is conditional on `applies`, with the
stack-superseded case deferring to item 13. Item 13 gains the third case, STACK-SUPERSEDED →
render from the stack top, write no scroll — the exact outcome plan §2 names as the GAP closed.
Items 3 and 4 (the `js/app.js` comment scrubs) were already done in `8acbdff`, per the review. All
four builder-owned items are now done; items 5, 6 (the planner, `PLAN-swipe-stage7.md`) and item 7
(the assistant, board/decision log) remain open and are outside this build's writable set.

### 11.5 Step 5a — the amendment's one new mutant, executed individually, foreground, restored

On a copy of the tree outside the repo (`node_modules` reached by a directory junction),
`node tools/mutate.mjs 32` (`NAVTOKEN-a`), full suite, `node tools/mutate.mjs --restore`:

```
control (unmutated copy):        936 / 933 pass / 3 fail / 0 skipped  (2 git-only + this cell,
                                  skip removed for the control run)
NAVTOKEN-a applied:               936 / 930 pass / 5 fail / 1 skipped
```

Fails under the mutant beyond the 4-failure noise floor (2 git-only gates + 2 structural failures
any applied mutant produces, `every mutation anchor still matches the source it targets` and `the
no-mutbak CLI exits 0 on the clean repo…`): **exactly one** — `NAVAPPLIES (abort token)`, the
designated cell, and nothing else. No `*.mutbak` anywhere after restore; `diff` against the
tracked `js/app.js` after restore: identical.

### 11.6 F3 and F4 — re-measured myself; §6's two rows corrected in place

Both re-derived on a fresh copy of the tree outside the repo, control first, per the standing
instruction that a prior build's enumeration is a claim to verify, not a fact to carry forward.

**F3 — `NAVAPPLIES-a` (index 22).** Applied individually, full suite:

```
control: 936 / 933 pass / 2 fail / 1 skipped   (the 2 git-only gates)
mutant:  936 / 916 pass / 19 fail / 1 skipped
```

19 fails − 4 noise floor (2 git-only + `every mutation anchor still matches…` +
`the no-mutbak CLI exits 0…`, both structural under this mutant since it reanchors onto the line
gating the reconcile too) = **15** behavioural cells: `I7`, `I11` (designated), `NAVAPPLIES`
(abort), `NAVAPPLIES` (abort token), `NAVRECONCILE` (control 2), `PEERFINALIZE` ×2, `NPRECONCILE`
×2, `HOMESTAYSLIVE`, `LANDEDPAGESHOWS` ×3, `PS`, `ABORT`. §6's original "14" (Poirot's own
build-time figure) and this build log's original "I7 and NAVRECONCILE control 2" are both
superseded here: **15**, one more than Poirot measured, because this build unskips a 15th cell
(`NAVAPPLIES (abort token)`) that lives on the same path and was not yet an active assertion when
Poirot's figure was taken. §6 corrected in place.

**F4 — `NAVRECONCILE-b` (index 31).** Applied individually, full suite:

```
control: 936 / 933 pass / 2 fail / 1 skipped
mutant:  936 / 929 pass / 6 fail / 1 skipped
```

6 fails − 4 noise floor = **2** behavioural cells: `NAVRECONCILE` and `M1WRITERSET`. Matches
Poirot's F4 exactly. §6 corrected in place.

Both mutants restored; no `*.mutbak` anywhere; `js/app.js` identical to the tracked copy after
each restore.

### 11.7 Poirot O1 — `[W73]`'s four citations, re-derived (not corrected to new numbers)

Executed, not read: grepped current `js/app.js` for each of the four original phrases the finding
that opened `[W73]` names (`POIROT-swipe-declone-stage2-subtraction-49efe4f.md` F4) —
`"pane type logged beside it"` / `"dozens of swipes in one report say whether long frames track
panes"` (old `665-666`), `"No hold on this path — the panes go NOW"` (old `1015-1016`), `"runFinalize
has THREE exits — the two ghost-held reveals return early"` (old `1045-1046`), `"the held path must
KEEP it true until drop()"` (old `1076-1078`).

**None of the four phrases occurs anywhere in current `js/app.js`.** The topic of the second
(`665→662` area) survives as different, already-accurate wording ("dozens of swipes in one report
say whether long frames are common or rare" — no `pane` token) and the topic of the third (`1015→
1023` area) likewise survives reworded ("No hold on this path — and no pane to drop, since no
transition builds an owned pane any more"). The first and fourth phrases' topics do not occur
anywhere in the file under any wording. This rewrite predates this build — it is not part of §4.1's
prescribed edits or the two mandated comment scrubs, and `git diff js/app.js` for this session
touches only the one token line (§11.2) — so it happened in an earlier, unrelated commit between
`49efe4f` and `a509115`. **The four line-number citations cannot be "corrected" to new numbers,
because the text they cite no longer exists to be pointed at.** This is a measured finding for
whoever next reconciles the watch-list (outside this build's writable set — casebooks and the
board are read-only here); it is not a claim that `[W73]` is closed, only that its citations are
stale in a different way than O1 described (content gone, not merely shifted).

### 11.8 Step 5b — the blast-radius probe, two halves against two named tree states

Never compared across tree states (board row `T-TOOL3`). Both measured on copies outside the
repo with the real exported `resolveAnchor`, counting both refusal classes.

**Control** — pristine registry (152, from `eeda8e9`) against pristine `js/app.js` (`eeda8e9`):
**0** refused.

**Half (i)** — pristine registry (152) against the tree with the COMPLETE mandated change set
applied (three source edits + two comment scrubs; the current `js/app.js`, which carries the
three-arm token — §16 records the corrected token adds nothing to this count): **2** refused —
`swipe: abort mutates the nav stack like a commit` and `EMPTYAFTERHOME-a`, both ANCHOR NOT FOUND.
Matches §8's declared figure exactly.

**Half (ii)** — the built tree (162-registration registry, current `js/app.js`) against itself:
**0** refused — `test/mutation-anchors.test.js` **6 tests / 6 pass / 0 fail**, count read from the
runner. Matches §8.1's declared figure exactly.

### 11.9 Step 5c — build stamp

`build.json`'s `build` bumped `2026-08-05.3` → `2026-08-05.4` (no source-affecting change ships
without a bump, per the standing PWA deploy rule; this session had no reason to anchor the stamp
to the calendar date rather than the campaign's running sequence). `node tools/stamp-build.mjs`
propagated it to `sw.js`, `js/debug.js`, `index.html`; `node tools/stamp-build.mjs --check`
confirms all four agree. `docs/swipe-model.generated.txt` regenerated and diffed against the
committed copy: **byte-identical, no change** — matching §8.1 item 2's prediction exactly.

### 11.10 Final suite, lint, typecheck

```
node --test "test/*.test.js"   →  936 tests / 935 pass / 0 fail / 1 skipped
```

The one remaining skip is the pre-existing device-only `KEEPER` cell (unrelated to this slice).
`node node_modules/eslint/bin/eslint.js js sw.js` — clean. `node node_modules/typescript/bin/tsc
-p jsconfig.json` — clean. `git status --porcelain` before commit named exactly the files this
section touched.

### 11.11 Scope discipline

Writable set respected: `js/app.js` (the one token line only), `tools/mutate.mjs` (`NAVTOKEN-a`),
`Claude/Subsystems/swipe-reveal.md` (items 12/13), `docs/swipe-model.generated.txt` (regenerated,
confirmed unchanged), `build.json`/`sw.js`/`js/debug.js`/`index.html` (stamp),
`test/swipe-navstack-settle.test.js` (skip removal only), this build log. The plan, both Poirot
casebooks, the board, the manifest and the decision log were read, not written.

**Next owner: the coverage auditor** (plan §13 step 7).

## 12. Fix-then-ship pass on Poirot's `9506f3a` review — 2026-08-07

Input HEAD: `0845590`, `main` == `origin/main`, tree clean, no `*.mutbak`, 162 registrations, suite
936 / 935 pass / 0 fail / 1 skipped. Review: `Claude/Poirot/POIROT-swipe-navstack-settle-window-9506f3a.md`,
verdict PASS — fix-then-ship. Three findings, F1–F3, all owned by this seat.

### 12.1 F1 — §6's `NAVAPPLIES-a` row, list corrected in place

Re-measured myself, control first, on a copy outside the repo (`node_modules` copied in — a bare
`git archive` copy has no `node_modules` and mass-fails on `Cannot find module 'jsdom'`, which is
not a defect in the source):

```
control: 936 / 933 pass / 2 fail / 1 skipped   (the 2 git-only gates)
mutant (index 22, NAVAPPLIES-a): 936 / 916 pass / 19 fail / 1 skipped
```

19 fails − 4 noise floor (2 git-only + `every mutation anchor still matches…` + `the no-mutbak CLI
exits 0…`) = **15** behavioural cells, matching Poirot's figure exactly. §6's declared "14 further"
(alongside designated cell I11) was already right; its list was one short, missing `NAVAPPLIES
(abort token)` — the cell the whole amendment exists to add. §6's row corrected in place to name
all fourteen. Mutant restored; no `*.mutbak` anywhere afterward.

### 12.2 F2 — `swipe-reveal.md` item 12 rewritten to current truth

Re-derived from source, not from the prior sentence. `grep -rn "pane" js/` returns no executable
occurrence, only comments (`js/swipe.js:245`, `js/app.js:387-388`); no pane-release code exists.
The abort branch (`js/app.js:1054`) is `applyScreen(dest, { render: false, resetScroll: false })` —
no re-render, per `js/app.js:721-722`'s own comment on the branch's removal. Item 12 rewritten to
state the current no-render reconcile on both commit and abort paths and to drop both retired
clauses. Item 13 read and confirmed still correct; not touched. §2's certification of item 12 is
the planner's and is not touched here.

### 12.3 F3 — dead `SKIP` constant and stale header removed

`test/swipe-navstack-settle.test.js:57-58`'s unused `const SKIP` deleted (zero `{ skip: SKIP }`
sites remain in the file, confirmed by grep). The "STATE OF THE SKIPS" header (`:24-29`) rewritten
to state that the thirteenth cell's skip was lifted at `9506f3a` and none remain. No assertion,
oracle, or drive touched.

### 12.4 Suite after all three fixes

```
node --test "test/*.test.js"   →   936 tests / 935 pass / 0 fail / 1 skipped
```

Same count as input HEAD — these are records/test-comment changes only. No shipped asset
(`js/`, `css/`, `index.html`, `sw.js`, `build.json`) was touched, so no build-number bump applies.

### 12.5 Scope discipline

Writable set respected: `Claude/Subsystems/swipe-reveal.md` (item 12 only), this build log (§6's
row, this section), `test/swipe-navstack-settle.test.js` (the dead constant and header only). The
plan, both Poirot casebooks, the campaign manifest, the board and the decision log were read, not
written.

**Next owner: unchanged — the coverage auditor** (plan §13 step 7); this pass does not advance the
campaign.

## 13. `NAVFWDCLEAR-a` registered (plan §17.5 item 2) — 2026-08-07

Input HEAD `e56ab21` (`main` == `origin/main`, tree clean, no `*.mutbak`, `tools/mutate.mjs` holding
**162** registrations, suite 937/936/0/1, build `2026-08-05.4`). Commissioned by plan §17.5 item 2,
after item 1 landed in `Claude/Curie/RED-swipe-navstack-settle-window.md` §10.

### 13.1 Transform verified against source, not pasted from the record

§10.6's stated `from` line was checked against `js/app.js:715` directly and matches byte for byte:
`          else if (cur.newNav) { navStack.push(cur.dest); fwdStack.length = 0; }   // NP →
chapters is a fresh forward nav`. This is the audit's W1 transform exactly — the bare clause, no
approximation.

### 13.2 Registration

Added to `tools/mutate.mjs`'s `MUTATIONS` array, immediately after `NAVTOKEN-a`: `NAVFWDCLEAR-a`
deletes the `fwdStack.length = 0;` clause from the `newNav` commit branch, leaving the `else if`
push unconditioned on clearing forward history. Registry **162 → 163** (confirmed by reading
`MUTATIONS.length`, not inferred). Named killing cell: `NAVAPPLIES (newNav branch, NON-EMPTY
fwdStack)` in `test/swipe-navstack-settle.test.js`, matching the test name verbatim (grepped from
the test file, not copied from the RED record).

### 13.3 Anchors gate, before and after

`test/mutation-anchors.test.js`: **6/6** on input HEAD before this edit; **6/6** after. The
`NAVSTALE-b`/`NAVAPPLIES-b` anchor collision §10.6 and plan §17.2 both name did not rot either
existing registration — both anchor on multi-line `from` blocks that still resolve uniquely; the
new single-line anchor is a distinct string from either.

### 13.4 Mutant run — individual, foreground, against `js/app.js` — the acceptance split reproduced

Applied by index (`node tools/mutate.mjs 33`, the index `NAVFWDCLEAR-a` resolved to at the time of
this run — cited here by name in every other place per the campaign's naming rule). Target file only
(`js/app.js`); no other file touched.

`test/swipe-navstack-settle.test.js` under the mutant: **21 tests / 20 pass / 1 fail / 0 skipped.**
`NAVAPPLIES (newNav branch, NON-EMPTY fwdStack)` — **FAILS**, on the intended assertion:
`expected: false, actual: true` ("the newNav commit must clear fwdStack even when it was NOT
empty... Under mutant NAVFWDCLEAR-a it reads true"). `NAVAPPLIES (newNav branch)` — **PASSES**, in
the same run. This reproduces plan §17.2's and RED §10.4's acceptance split independently, a third
time.

Restored (`node tools/mutate.mjs --restore`). `git status --porcelain` afterward names only
`tools/mutate.mjs`; no `*.mutbak` anywhere in the repo. `test/swipe-navstack-settle.test.js` back to
**21/21/0/0**.

### 13.5 Full suite

`node --test "test/*.test.js"` → **937 tests / 936 pass / 0 fail / 1 skipped** — unchanged from input
HEAD; this pass adds a mutation-table entry only, no test, no production source.

### 13.6 Build-number bump — not needed

No shipped asset (`js/`, `css/`, `index.html`, `sw.js`, `build.json`) changed; only `tools/mutate.mjs`,
a dev tool outside the deploy surface, was written. No bump applies.

### 13.7 Scope discipline

Writable set respected: `tools/mutate.mjs` (one registration added, nothing else touched), this
build log. `js/`, the plan, and both Curie/Mendeleev records were read, not written. No test file
edited.

**Next owner: the planner** (plan §17.5 item 3: §9 dimension 4(a)'s newNav sub-cell moves from
PARTIAL to SWEPT, now that item 1 is measured red under item 2). Board and decision log left
untouched, per this dispatch's boundary.
