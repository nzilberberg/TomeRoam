# POIROT — the settle line's third `nav=` arm (delta review)

Type: code-review
Prior-review: POIROT-swipe-navstack-settle-window-8acbdff.md
Target: `9506f3a` (build `2026-08-05.4`), reviewed at HEAD `9506f3a`.
Range: `a509115..9506f3a` — nine files.
Scope: **`9506f3a` alone.** `8acbdff` was reviewed and dispositioned in the prior casebook and is
not re-reviewed here. What is re-derived from that pass is only what this build claims to correct.
Plan of record: `Claude/Plans/PLAN-swipe-navstack-settle-window.md`, amended at `a630d40` (§4.1's
token, §8/§8.1, §13 step 9a/9b, §16).
Red cell: `a509115`. Build log: `Claude/Brunel/swipe-navstack-settle-window-build.md` §11,
verdict BUILD_GREEN.
Tree: `git status --porcelain` empty before and after every command below; no `*.mutbak` anywhere
in the repo or in the out-of-repo copy after every restore. Every mutant was applied and restored
on a copy OUTSIDE the repo, whose untransformed control reads **936 / 933 pass / 2 fail / 1 skip**
— the two git-only gates (`every hook script is EXECUTABLE in git's index`, `THE REAL ARTIFACT:
this repo's own history passes the gate`), which cannot pass in a tree with no `.git`. Under an
applied mutant two further structural gates fail (`every mutation anchor still matches the source
it targets`, `the no-mutbak CLI exits 0 on the clean repo…`), so the noise floor under any mutant
is **4**. Every count below is stated against that floor.

`Verdict: PASS — fix-then-ship.`

The one production line is right. §4.1's amended block is in the tree verbatim and contiguously,
**exactly once**, and the probe that says so is proven able to fail (run against the pre-amendment
source it reports the block absent). The token is anchor-neutral: the 162-registration registry
refuses **0**, and the four collision-sensitive anchors §4.1's verbatim-ness exists to protect
each still occur exactly once. All three emitted values have executed assertions and all are
green. `NAVTOKEN-a` expresses the shipped defect exactly — applied to the amended source it
reproduces `e80fcbe`'s `js/app.js` byte-for-byte, which I re-derived by hash — and it reddens
**exactly one** behavioural cell, the one it names.

Three findings, none reachable-and-broken. The `NAVAPPLIES-a` figure is settled below by
execution: **15** behavioural cells, which is the builder's number and not mine — my F3's 14 was
correct for the tree it was taken on and is superseded, exactly as the builder states. But the row
that carries the corrected figure names **13** cells while declaring 14, and the name it drops is
the one the whole correction is about. The F2 scrub landed on the sentence it was sent to fix and
left two retired mechanisms standing inside it.

---

## Phase 1 — The scene

One executable line, one registration, one skip removal, one records scrub, four stamp files and a
build log. The commit message scopes itself accurately and names each change against the finding
or plan step that ordered it.

`js/app.js:710` — the token becomes `nav=${!commit ? 'abort' : applies ? 'applied' : 'superseded'}`.
`git show --stat` reads `js/app.js | 2 +-`: one insertion, one deletion, and nothing else in that
file. `index.html`'s 70 lines are the `?v=` cache-bust bumps plus the build meta tag; `sw.js`,
`js/debug.js` and `build.json` are one stamp literal each.

The thread worth pulling first is the one the amendment itself creates: a nested ternary inside a
template literal, sitting two characters from a registration anchor, in a statement §4.1 prescribes
character-for-character *because* of that adjacency. That is measurable, so it was measured before
anything else.

## Phase 2 — The history

`e80fcbe`/`8acbdff`/`c488677` carry one identical `js/app.js` blob — the two-arm token. That is
what makes `NAVTOKEN-a`'s claim checkable rather than rhetorical: the mutant either reproduces that
blob or it does not.

The `[W73]` thread runs further back than either the review or the build log took it. `git log -S`
on each of the four cited phrases names `6b25a15`, whose message reads *"F4 (Minor): four stale
js/app.js comments describing deleted pane/ghost machinery rewritten; test/home-abort-writes.test.js
left untouched (outside this commit's diff per the review)."* That is the apply-commit for the very
finding that opened `[W73]`, dated 2026-08-05. The item has been carried as fully open through three
casebooks since. See O2.

## Phase 3 — Killer vs witness

F1's killer is the same enumeration habit the prior pass filed as F3, arriving inside the row
rewritten to fix it: the total is re-measured and correct, the list beneath it is not.

F2's killer is partly the plan. §2's reconciliation table certifies subsystem item 12 as *"current
truth today"* apart from the conditionality, so a builder scrubbing item 12 under §8's mandate is
told, by the record it is reconciling against, that the rest of the sentence is sound. It is not.
The commit is the witness; §2 is the killer, and the fix is the builder's either way because the
sentence is wrong in HEAD now.

---

## Phase 4 — The investigation

### 4.1 The prescribed text is in the tree verbatim — executed, control first

The §4.1 code blocks were extracted from the plan and matched contiguously against `js/app.js`,
both sides LF-normalised (`js/app.js` is CRLF in the worktree — trap T6):

```
node scratch/verbatim.mjs <repo>
  blocks found in 4.1: 2
  block 0: contiguous present=true occurrences=1 atLine=698
  block 1: contiguous present=true occurrences=1 atLine=1043
```

**The probe is proven able to fail.** The same probe against `e80fcbe`'s `js/app.js` reports
`block 0: contiguous present=false occurrences=0` — the amended block is absent from the
pre-amendment source, and block 1 (edit 2, unchanged by this build) still resolves once. So the
`true/1` above is a difference the probe reported, not a constant it always prints.

Line count 3112 before and after, matching §8.1 item 3.

### 4.2 The token is anchor-neutral — the property §4.1's verbatim-ness exists to protect

The real exported `resolveAnchor` was run over every registration and `also` part, counting both
refusal classes:

```
node scratch/refusals.mjs <repo>
  registry: 162 registrations / 172 anchor parts
  REFUSED: 0
  M1NOWRITE: from occurs 1 time(s) in js/app.js
  S2-24 ABORTNORENDER: from occurs 1 time(s) in js/app.js
  M1NAVWINS: from occurs 1 time(s) in js/app.js
  stage3: session id not stamped: from occurs 1 time(s) in js/app.js
```

**Proven able to fail:** the same 162-registration registry against `e80fcbe`'s source reports
`REFUSED: 1 — ANCHOR NOT FOUND for #32 NAVTOKEN-a`. `test/mutation-anchors.test.js` on the repo:
**6 tests / 6 pass / 0 fail**, count read from the runner.

### 4.3 §13 step 5b, both halves, control first — measured, not accepted

| Tree state | Registry | REFUSED | Which | Plan declares |
|---|---|---|---|---|
| pristine `js/app.js` (`eeda8e9`) | pristine 152 | **0** | — | 0 ✓ |
| **half (i)** — current `js/app.js` | pristine 152 | **2** | `swipe: abort mutates the nav stack like a commit`, `EMPTYAFTERHOME-a` — both ANCHOR NOT FOUND | 2 ✓ |
| **half (ii)** — current `js/app.js` | built 162 | **0** | — | 0 ✓ |

Each figure taken against the tree state its half names, never across. Both halves match the
amended §13 and §8.1 exactly.

### 4.4 `NAVTOKEN-a` — it is the shipped defect, and it kills one cell

The registration's `from` is the three-arm token substring and its `to` is the two-arm one. Applied
to the current source and hashed against `e80fcbe`'s `js/app.js`:

```
anchor occurrences in amended source: 1
sha(mutated amended) : 261654409973c31f
sha(e80fcbe app.js)  : 261654409973c31f
IDENTICAL (LF-normalised): true      | unmutated amended differs from prior: true
```

So the mutant *is* the defect F1 reported, not an approximation. Applied for real on the
out-of-repo copy, whole suite:

```
node tools/mutate.mjs 32  →  node --test "test/*.test.js"  →  node tools/mutate.mjs --restore
  936 / 930 pass / 5 fail / 1 skip
  beyond the 4-cell noise floor: NAVAPPLIES (abort token) — and nothing else
```

**Exactly its designated cell.** The registration's name states the defect it expresses ("loses its
abort arm, so the two-arm ternary returns and every plain abort again reports a supersession that
did not happen") and that is what the `to` does.

### 4.5 The oracle can fail, and it does not infer from an absence

The brief's hard constraint. `navToken` (`test/swipe-navstack-settle.test.js:160`) extracts
`/\bnav=(\S+)/` and **returns whatever value is there** — it matches no enumeration, so a value the
reader did not list cannot masquerade as "no token". The cell asserts a fixture first (both settle
lines matched against the statement's own `${commit ? 'commit' : 'abort'}` interpolation, and the
landed screen), then the paired commit half (`applied`), then the clause (`abort`). Under
`NAVTOKEN-a` the runner reports:

> `error: 'an ABORTED gesture never held a claim … (line: "#1 abort back books→home nav=superseded …")'`
> `expected: 'abort'  actual: 'superseded'  operator: '=='`

A live assertion on the emitted value, red under the mutant, green without it. Nothing here rests
on the absence of a diagnostic line.

### 4.6 The emitted value on every path

Three arms, three executed witnesses, all green in the 936-test run: `applied` (uninterfered
commit, `:265`, `:309`, `:356` and the abort-token cell's paired half), `superseded`
(stack-superseded commit, `:231`, `:290`, `:343` across drives F/I/S/T), `abort` (`:708`). The
ternary's arms bind left-to-right on `!commit` first, so `commit === false` can only ever emit
`abort`; `applies` is `commit && …`, so the second and third arms are only reachable with `commit`
true — the value domain is exactly plan §5's three-row table with no unreachable arm.

### 4.7 `NAVAPPLIES-a`'s collateral — my own figure, re-derived

Applied individually, foreground, out-of-repo copy, restored afterwards:

```
node tools/mutate.mjs 22  →  node --test "test/*.test.js"
  control: 936 / 933 pass / 2 fail / 1 skip
  mutant:  936 / 916 pass / 19 fail / 1 skip     →  19 − 4 noise floor = 15
```

The fifteen, read from `not ok` lines: `I11` (designated), `I7`, `NAVRECONCILE` (control 2),
`NAVAPPLIES` (abort), **`NAVAPPLIES` (abort token)**, `PEERFINALIZE` ×2, `NPRECONCILE` ×2,
`HOMESTAYSLIVE`, `LANDEDPAGESHOWS` ×3, `PS`, `ABORT`.

**My measured figure is 15, and the builder's attribution is correct.** The fifteenth is the
abort-token cell, which this build unskipped; it was inert when my 14 was taken. My prior F3 figure
is superseded, not wrong for its tree — and the record now says so. See F1 for what the corrected
row still gets wrong.

### 4.8 `NAVRECONCILE-b` — F4's correction, re-derived

```
node tools/mutate.mjs 31  →  node --test "test/*.test.js"
  mutant: 936 / 929 pass / 6 fail / 1 skip   →  6 − 4 = 2
  NAVRECONCILE  +  M1WRITERSET
```

Two cells. §6's corrected row matches exactly.

### 4.9 The stamp and the generated model

`node tools/stamp-build.mjs --check` → *all files match build.json (2026-08-05.4)*. `build.json`,
`sw.js:30`, `js/debug.js:19` each carry one stamp literal; `index.html` carries 35 occurrences (33
script tags + the stylesheet + the meta tag) and no other change.

`node tools/gen-swipe-model.mjs` on a clean copy of the built tree produces
`docs/swipe-model.generated.txt` **byte-identical to the committed document**, so §8.1 item 2's
"no regeneration required" is confirmed rather than assumed. **The generator oracle is proven able
to fail:** the same run on a copy with one line inserted above `const dest = currentDesc()` moves a
census pin (`js/app.js:1197` → `1198`).

### 4.10 The test file's diff, and what the skip removal left behind

`git show 9506f3a -- test/swipe-navstack-settle.test.js` is one `+`/`-` pair, `{ skip: SKIP },
async () => {` → `async () => {`. No assertion, oracle, drive or message changed — the build log's
claim holds.

What it left behind is F3. The file now runs **20 tests / 20 pass / 0 skipped** (count read from
the runner), so no `{ skip: SKIP }` remains — and `const SKIP` at `:57` therefore has no consumer.
`eslint.config.js:17` ignores `test/**`, so `no-unused-vars` cannot reach it. The header's
"STATE OF THE SKIPS" paragraph (`:24-29`) still reads *"ONE skip remains: NAVAPPLIES's abort-token
clause"* in the present tense.

### 4.11 The F2 scrub against the code it describes

Item 13 is correct. Its third case reproduces plan §2's own GAP wording — *stack-superseded →
render from the stack top, write no scroll* — and `js/app.js:1048` is
`else if (commit) applyScreen(dest, { render: false, resetScroll: false });`, which reconciles
`dest = currentDesc()` (the stack top) and issues no scroll write on either channel.

Item 12 is not. Two clauses inside the sentence this commit rewrote describe machinery that no
longer exists, executed rather than eyeballed:

- *"release panes after the paint barrier"* — `grep -rn "pane" js/` returns **no executable
  occurrence anywhere in `js/`**; every hit is a comment. `js/swipe.js:245` states *"NO transition
  builds an owned pane any more"*, `js/app.js:387-388` states *"Every session is pane-less now that
  no transition constructs an owned pane"*, and `holdGhostUntilPaintable` is recorded as DELETED at
  `js/app.js:719`. There is no pane and no paint-gated release to perform.
- *"Abort: … browse→browse re-renders the source into #browse"* — the abort branch is
  `applyScreen(dest, { render: false, resetScroll: false })` at `js/app.js:1054`, i.e. **no
  re-render**, with the comment above it citing declone Invariant D3. `js/app.js:721-722` records
  the branch's removal in terms: *"Stage 2 removes that branch: an abort no longer re-renders
  anything."*

### 4.12 O1's disposition, and where the trail actually ends

The builder's measurement is right and I re-derived it: none of `[W73]`'s four cited `js/app.js`
phrases occurs in the current file (`grep -c -F` returns 0 for each), and the fifth cite,
`test/home-abort-writes.test.js:249`, is still present verbatim — so O1's "unaffected" holds for it.

The builder's *action* — leave my casebook alone — is correct twice over. A builder editing a
reviewer's filed record is authoring in another seat's artifact, and the citations could not be
renumbered in any case: the text they point at no longer exists, so there is no new number. A
dangling citation inside a dated casebook is acceptable; a casebook is a record of what was true
when it was filed, and git holds the rest.

Where both the builder and my own O1 stopped short is the cause. `git log -S` on each phrase names
**`6b25a15`** — *"Fix-then-ship: apply Poirot's six sanctioned findings on the subtraction pass"* —
whose message reads *"F4 (Minor): four stale js/app.js comments describing deleted pane/ghost
machinery rewritten"*. That is not an unrelated commit. It is the apply-commit for the finding that
opened `[W73]`, and it means `[W73]`'s `js/app.js` half was **closed on 2026-08-05** and has been
carried as open ever since. The watch-list is the one artifact a fresh session reads to reconstruct
continuity, so an item that reads "open" over work already done sends the next worker to fix
comments that were fixed nine commits ago. That correction is this seat's to make and it is made in
the watch-list below: `[W73]` resolved in its `js/app.js` half at `6b25a15`, residual =
`test/home-abort-writes.test.js:249`.

---

## Phase 4b — The Coverage Ledger

Rows enumerated mechanically from `git show --stat 9506f3a`; every file in the Range has a row.
`✓` = cleared by a command run **this pass** (commands cited in Phase 4); `~` = cleared by reading;
`n/a` = the dimension cannot apply.

Columns: **C** correctness/data-flow · **D** deferred-resource cancellation · **L** object lifetime
across calls · **X** teardown symmetry / exit paths · **R** reassuring-comment & absolute-claim ·
**F** dead field / dead return / dead binding · **E** executed enumeration probe · **A** citation &
record accuracy.

| # | Changed symbol / region | C | D | L | X | R | F | E | A |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `js/app.js:710` — the SWIPE settle line's `nav=` token | ✓ | n/a | n/a | n/a | ~ | ~ | ✓ | ✓ |
| 2 | `js/app.js` — anchor-uniqueness of the four collision-sensitive registrations | ✓ | n/a | n/a | n/a | ~ | n/a | ✓ | ✓ |
| 3 | `tools/mutate.mjs` — `NAVTOKEN-a` registration (161 → 162) | ✓ | n/a | n/a | n/a | ✓ | n/a | ✓ | ✓ |
| 4 | `test/swipe-navstack-settle.test.js` — the skip removal | ✓ | ~ | n/a | ~ | ~ | **F3 (Minor)** | ✓ | **F3 (Minor)** |
| 5 | `test/swipe-navstack-settle.test.js` — the abort-token cell's oracle and drive | ✓ | ~ | n/a | ~ | ✓ | n/a | ✓ | ~ |
| 6 | `Claude/Subsystems/swipe-reveal.md` item 12 | **F2 (Significant)** | n/a | n/a | n/a | **F2** | n/a | ✓ | **F2** |
| 7 | `Claude/Subsystems/swipe-reveal.md` item 13 | ✓ | n/a | n/a | ~ | ~ | n/a | ✓ | ✓ |
| 8 | `build.json` — stamp `2026-08-05.4` | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 9 | `sw.js` — stamp | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 10 | `js/debug.js` — stamp | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 11 | `index.html` — stamp + 33 `?v=` bumps | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| 12 | `Claude/Brunel/…-build.md` §6 `NAVAPPLIES-a` row | ~ | n/a | n/a | n/a | ~ | n/a | ✓ | **F1 (Minor)** |
| 13 | `Claude/Brunel/…-build.md` §6 `NAVRECONCILE-b` row | ~ | n/a | n/a | n/a | ~ | n/a | ✓ | ✓ |
| 14 | `Claude/Brunel/…-build.md` §11.1–11.11 (the amendment section) | ~ | n/a | n/a | n/a | ~ | n/a | ✓ | ✓ |
| 15 | `docs/swipe-model.generated.txt` — declared unchanged by §8.1 | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |

Row 15 carries no diff and is present because §8.1 makes a claim about it; the claim was executed.
Every `~` above is a record-prose read, and none of them is a behavioural or enumerable claim —
each such claim in this Range was executed and appears as a `✓`.

---

## Phase 5 — The revelation

`Verdict: PASS — fix-then-ship.` The production change is correct on every path, verbatim,
anchor-neutral and mutation-guarded by a registration that reproduces the shipped defect exactly.
Nothing is reachable-and-broken. Three findings a competent reviewer would require changed before
this slice closes, all in records.

| # | Severity | Finding |
|---|---|---|
| **F1** | **Minor** | `Claude/Brunel/swipe-navstack-settle-window-build.md` §6's corrected `NAVAPPLIES-a` row declares *"**14** further behavioural cells redden alongside I11"* and then names **13**: `I7`, `NAVRECONCILE` control 2, `NAVAPPLIES` (abort), `PEERFINALIZE` ×2, `NPRECONCILE` ×2, `HOMESTAYSLIVE`, `LANDEDPAGESHOWS` ×3, `PS`, `ABORT`. The omitted name is **`NAVAPPLIES` (abort token)** — the one cell §11.6 identifies as the entire difference between the prior review's 14 and this build's 15. MEASURED: 15 behavioural cells total (§4.7), so the figure 14-further is right and the list is one short. §11.6's own list is complete; §6 is the summary a future reader reaches first. Same class as the prior pass's F3, inside the row rewritten to close it. Owner: the builder. |
| **F2** | **Significant** | `Claude/Subsystems/swipe-reveal.md` item 12 states two retired mechanisms as current, inside the sentence this commit rewrote for the prior review's F2. (a) *"release panes after the paint barrier"* — no owned pane is built by any transition (`js/swipe.js:245`, `js/app.js:387-388`) and no pane-release code exists in `js/` at all; `grep -rn "pane" js/` returns comments only. (b) *"Abort: … browse→browse re-renders the source into #browse"* — the abort branch is `applyScreen(dest, { render: false, … })` (`js/app.js:1054`) and the branch it describes was removed at declone stage 2 (`js/app.js:721-722`). Both clauses are inherited rather than introduced, but §6.6 makes a scrub exhaustive on the first pass and this record is the one plan §2 reconciles against before designing. The plan contributed: §2 certifies item 12 as *"current truth today"* apart from the conditionality. Item 13 is correct and needs nothing. Owner: the builder; the §2 certification is the planner's. |
| **F3** | **Minor** | The skip removal left two stale artefacts in `test/swipe-navstack-settle.test.js`. (a) `const SKIP` at `:57` now has no consumer — MEASURED: the file runs 20 tests / 20 pass / **0 skipped**, and `eslint.config.js:17` ignores `test/**`, so `no-unused-vars` cannot reach it (same class as `[W55]`, `[W74]`). (b) The header's "STATE OF THE SKIPS" paragraph (`:24-29`) still reads *"ONE skip remains: NAVAPPLIES's abort-token clause"* in the present tense; zero remain. Owner: the builder. |
| **O1** | Observation | `PLAN-swipe-navstack-settle-window.md` §13's State column is stale on four rows: 5b reads "owed" (done, build log §11.8, and re-derived here), 9a reads "owed" (done at `a509115`), 9b reads "owed" (done at `9506f3a`), and step 8 reads "items 1, 2, 5, 6, 7 owed" (1 and 2 are done). Named, not touched — the plan is outside this seat's writable set. Owner: the planner / the assistant. |
| **O2** | Observation | `[W73]`'s `js/app.js` half is **resolved**, at `6b25a15` (§4.12), not merely stale. The builder's disposition — measure, do not edit the casebook, report — was the right action on the right measurement, and it stopped one `git log -S` short of the cause. Corrected in the watch-list below; the residual is `test/home-abort-writes.test.js:249`, confirmed still present. Owner: this seat, done here. |

**Disposition of what is left unfixed by this review:** nothing. F1–F3 are defects, stated as
defects, each with a named owner. O1 is out of this seat's writable set and says so; O2 is closed
here.

## Phase 6 — The prediction

F2 is the one with a cost, and it is the same cost the prior pass predicted for the unscrubbed
version — deferred, not avoided. `swipe-reveal.md` is the defining record; the next plan over this
subsystem opens item 12, reads that a commit releases panes after a paint barrier and that an abort
re-renders the source into `#browse`, and reconciles against a system that stopped existing two
stages ago. A half-scrubbed sentence is worse than an unscrubbed one, because the visible
correction certifies the rest of the line.

F1 predicts itself. An audit that needs to know what `NAVAPPLIES-a` reaches will read §6's list,
scope to thirteen, and miss the fourteenth — which is the abort-token cell, i.e. exactly the cell
this whole amendment exists to add. The number and the list disagree, and a reader who trusts one
does not check the other.

F3 is small and it is the seam by which a red cell is silently retired. A `SKIP` constant that no
test references still reads, to the next author, as the file's live skip mechanism; combined with a
header asserting that one skip remains, the next red-first authoring in this file starts from a
state description that is two builds out of date.

---

## Watch-list

Carried from `POIROT-swipe-navstack-settle-window-8acbdff.md`. Every prior open item carries
forward unchanged unless a status is given below.

- **[W1] [W4] [W7] [W11] [W13] [W16] [W18] (open)** — apply-on-approval records for stages 6b–6h un-applied in HEAD. Owner Zelda.
- **[W2] (open)** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device.
- **[W5] (open)** — Loki r2 lesser planes (`recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` → Brunel).
- **[W6] (open)** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat.
- **[W8] (open)** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda.
- **[W14] (open)** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device.
- **[W21] (open)** — a fresh Loki strike against the BUILT 6i code. Owner Loki.
- **[W22] [W23] [W24] [W25] (open)** — 6i `#home` device gates R1(a)–(e). Owner on-device.
- **[W26] (open)** — 6i apply-on-approval records (plan §13 amendments/annotations). Owner Zelda.
- **[W28-residual] (open)** — ghost-era vocabulary throughout the settle path in `js/swipe.js` and `js/app.js`. Non-blocking. Related to [W73], now narrowed.
- **[W29] (open)** — `plan.incoming` / `plan.outgoing` / `plan.renderDestination` production-unread, deliberate and exact-key-gated. Owner Vitruvius. Non-blocking.
- **[W30] [W31] [W32] [W33] (open)** — browse-decouple device gates R-flash / R-navbar / R-strip / R-browse2browse. Owner on-device.
- **[W34] (open)** — no `DecisionLog.md` NEW-POLICY entry for `PL-swipe-browse-fixed-ownscroll`. Owner Zelda. Non-blocking.
- **[W35] (open)** — build-log "Files changed" lists omit build-stamp files. **Fifth counterexample:** this build log's §11.11 names `build.json`/`sw.js`/`js/debug.js`/`index.html` explicitly. Recommend closing as no longer general. Owner Brunel/Zelda. Non-blocking.
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
- **[W55] (open)** — `SKIP_FLOOR` / `SKIP_FORM` dead in a tool no linter reaches. **Second instance this build:** `test/swipe-navstack-settle.test.js:57`'s `SKIP` (F3). Owner Brunel.
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
- **[W70] (open)** — `tools/mutate.mjs` indices 54 and 142 are one mutant registered twice. Owner Brunel. ⚠️ Indices have shifted again with `NAVTOKEN-a` (161 → 162); re-derive by NAME, not index.
- **[W71] (open)** — `js/app.js:221-227` states a `begin()` rejection and a PANE-OWNING deferral that D8 deleted. Owner Brunel.
- **[W72] (open)** — vacuous ghost assertions at `test/swipe-invariants.test.js:462`, `test/swipe-stage6.test.js:340`, `test/swipe-stage6i.test.js:91`/`:109`. Owner Brunel.
- **[W73] (open, NARROWED — the `js/app.js` half resolved: the four comments were rewritten at `6b25a15`, the apply-commit for the finding that opened this item; MEASURED, none of the four cited phrases occurs in current `js/app.js`)** — residual is the single remaining cite `test/home-abort-writes.test.js:249` ("which sweeps the settling ghost (nav.js:114)"), confirmed still present and deliberately left out of scope by `6b25a15`. Owner Brunel.
- **[W74] (open)** — `tools/mutate.mjs:91` `RECOVERY_RENDER_ALWAYS_FALSE` is dead; `tools/**` **and `test/**`** are outside `eslint.config.js`'s scope entirely (`eslint.config.js:17`). Owner Brunel + Vitruvius/Mendeleev.
- **[W75] (open)** — `.replace(/ ghosts=\d+$/, '')` strippers for a deleted token at two sites. Owner Brunel.
- **[W76] (open)** — the generated swipe model describes a retired concept as "marker element". Owner Vitruvius.
- **[W77] (open)** — `regionHash` pins comments as well as code. Owner Vitruvius. Non-blocking.
- **[W78] (open)** — the derived co-change tool; the surface set must extend past `tools/mutate.mjs`. Owner Vitruvius.
- **[W79] (open)** — device gate on plan §11 step 7 of the browse-decouple slice, owed on build `2026-08-05.1`. Owner on-device.
- **[W80] (resolved: the three-arm token is built at `9506f3a`; §4.1's text is verbatim in the tree, the abort arm's cell is active and green, and `NAVTOKEN-a` — byte-identical to the shipped defect — reddens it and nothing else)** — was F1 of the prior review.
- **[W81] (open, NARROWED)** — was F2. `Claude/Subsystems/swipe-reveal.md` items 12 and 13 are rewritten; item 13 is correct, item 12 still states two retired mechanisms (this pass's **F2**). The second half — §13 step 8's "five owned outside" — is **resolved** at `a630d40`. Owner Brunel.
- **[W82] (open, RESTATED)** — was F3. §6's `NAVAPPLIES-a` row is re-measured and its figure is now right (14 further / 15 total, which I re-derived), but the row names only 13 cells and drops `NAVAPPLIES` (abort token) — this pass's **F1**. Owner Brunel.
- **[W83] (resolved: §6's `NAVRECONCILE-b` row now states two cells, `NAVRECONCILE` + `M1WRITERSET`, which I re-derived by execution)** — was F4.
- **[W84] (open, NARROWED)** — §8 scrub items **5, 6 and 7** remain open (stage 7 §14/§17, its gate ranges and ledger; the board and decision log). Items 1–4 are done. Owners: the planner and the assistant.
- **[W85] (resolved: the abort-path token cell exists, is active, is green, and is killed by `NAVTOKEN-a` alone — the hole O3 named is closed by construction of the cell, not by an argument)** — was O3.
- **[W86] (open)** — the §12 closure-under-composition residual: an identity-preserving `openSub`/`closeSub` pair on the **back** branch passes the guard. Read in full at the prior pass and judged not a defect on the ground that the resulting `fwdStack` write is byte-for-byte what an explicit `goBack()` would have produced. Not re-read this pass; the amendment does not touch the predicate. Owner Loki, if this subsystem is commissioned again.

New this build:

- **[W87] (open) (NEW)** — **F1.** §6's corrected `NAVAPPLIES-a` row declares 14 further cells and names 13; the dropped name is `NAVAPPLIES` (abort token). Owner Brunel.
- **[W88] (open) (NEW)** — **F2.** `swipe-reveal.md` item 12's "release panes after the paint barrier" and "browse→browse re-renders the source into #browse" both describe deleted machinery. Owner Brunel; plan §2's certification of item 12 as current truth is the planner's. Related to [W71], the same retired pane vocabulary in `js/app.js`.
- **[W89] (open) (NEW)** — **F3.** `test/swipe-navstack-settle.test.js`'s `SKIP` const is dead and its "STATE OF THE SKIPS" header states a state this commit ended. Owner Brunel.
- **[W90] (open) (NEW)** — **O1.** `PLAN-swipe-navstack-settle-window.md` §13's State column is stale on rows 5b, 8, 9a and 9b. Owner the planner / the assistant.

---

**Handoff.** Source artifact: this casebook. Verdict: **PASS — fix-then-ship**; the code-review
gate is **cleared** for `9506f3a`. Next owner: **the coverage auditor** (plan §13 step 7). Required
before the slice closes: F1, F2 and F3 via the builder; O1's four State cells and §8 scrub items 5,
6 and 7 via the planner and the assistant.
