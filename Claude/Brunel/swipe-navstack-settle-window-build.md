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
| `NAVAPPLIES-a` (re-anchor) | I11 abort test (`test/swipe-invariants.test.js`) | **Fires on the intended assertion** (stack mutated on abort). Collateral: also reddens `I7` and `NAVRECONCILE` control 2 — because `applies` now also gates edit 2's reconcile branch, so a re-anchoring that only touches the mutation's own predicate line broadens the abort's reconcile path too. Not one of the nine; noted, not fixed (the plan specifies this exact re-anchor text). |
| `NAVSTALE-a` | `NAVIDENT` (I, S) + `NAVRECONCILE`, NOT `NAVSTALE` | Matches plan exactly, extra witness as documented. |
| `NAVIDENT-a` | `NAVIDENT` drive I only, not S | Matches plan exactly. |
| `NAVTOTAL-a` | `NAVTOTAL` (source) only, no behavioural cell | Matches plan exactly. |
| `NAVTOTAL-b` | `NAVPAIR` (drive T) only, not `NAVTOTAL` | Matches plan exactly. |
| `NAVSTALE-b` | `NAVSTALE` drive B′ | Fires. Collateral: `NAVIDENT` (I, S) and `NAVRECONCILE` also redden — the RED record's own caveat anticipated this ("the registration the builder writes may be narrower [or not]"). |
| `NAVAPPLIES-b` | `NAVAPPLIES`, all four branches | Fires; broad collateral expected (the whole mutation mechanism is deleted). |
| `NAVSTALE-c` | `NAVSTALE`, via drive F's arming clause | **Confirmed the throw assertion PASSES (swallowed) and only the arming clause fails** — exactly the model the RED record described and declined to build. Drive B′ stays green under this mutant (its test has no arming-clause assertion to witness the same class). Collateral: `NAVIDENT`, `NAVPAIR`, `NAVRECONCILE`. |
| `NAVRECONCILE-a` | `NAVRECONCILE`, `#options.scrollTop` clause | Clean single-cell kill, 300 → 0 exactly as measured. |
| `NAVRECONCILE-b` | `NAVRECONCILE`, `window.scrollTo` clause | Clean single-cell kill, 0 → 1 exactly as measured. |

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
