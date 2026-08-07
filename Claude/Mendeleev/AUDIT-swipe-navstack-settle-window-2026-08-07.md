# MENDELEEV — coverage audit, the nav stacks inside the swipe settle window

Type: coverage-audit (publish gate — the now-green suite swept against the plan's Coverage Model)
Date: 2026-08-07.
Target: HEAD `8e114e0`, `main` == `origin/main`, tree clean, no `*.mutbak`, build `2026-08-05.4`,
`tools/mutate.mjs` registry **162**.
Plan of record: `Claude/Plans/PLAN-swipe-navstack-settle-window.md` §9 Coverage Model and its
`vitruvius-coverage` cell block.
Suite audited: `test/swipe-navstack-settle.test.js` (20 tests), plus the bearing set established in
§1 below.
Inputs read (as specifications, not as facts): Charpy `-r1/-r2/-r3`, Curie
`RED-swipe-navstack-settle-window.md`, Brunel `swipe-navstack-settle-window-build.md`, Poirot
`-8acbdff.md` and `-9506f3a.md`.

`Verdict: **ADEQUATE**` — every cell that carries this slice's promise is measured able to fail for
the reason it names: each of the twelve registered mutations for this slice reddens the cell the plan
declares and no other cell drifts into its place, the `nav=` token's three values are each shown able
to fail on their own token clause, and the throw oracle and the arming oracle are each shown to fire
through the app's own timer path in the built tree rather than only through the instrument probe. One
Misleading finding is filed and routed: the `NAVAPPLIES` newNav cell claims the branch "clears the
forward stack", and that clause is measured **unable to fail** — deleting `fwdStack.length = 0`
reddens no behavioural cell, and the newNav branch is reached exactly once in the whole 936-test
suite with `fwdStack` already empty. It is a sub-clause over a statement this slice does not change,
in a state no test constructs, so it leaves no part of the slice's promise unproven; it is routed to
the planner as a model correction with the two dispositions named.

---

## 1. The bearing set, established rather than assumed

The `nav=` settle token is asserted in exactly **one** file. A repo-wide grep for `nav=` over
`test/*.test.js` returns matches in `test/swipe-navstack-settle.test.js` only; every other hit is the
unrelated `data-nav=` selector. The rest of the bearing set was established by execution — the
mutation runs in §3 name every file whose cells move when this slice's source moves:

- `test/swipe-navstack-settle.test.js` — the slice's own 20 cells.
- `test/swipe-invariants.test.js` — I11 (the abort-leaves-the-stack cell that owns `NAVAPPLIES-a`),
  I7, I11/I20.
- `test/swipe-model.test.js` — the generated model and the `navStack` append census (2 cells move on
  any line-count change in `runFinalize`).
- `test/mutation-anchors.test.js`, `test/no-mutbak-gate.test.js` — the registry's own gates.
- `test/browse-empty-after-home-commit.test.js` — `EMPTYAFTERHOME` cells 1 and 2, which own the
  second re-anchoring this slice performed.
- `test/home-abort-writes.test.js` (M1NOWRITE, M1NAVWINS), `test/scroll-writer-set.test.js`
  (M1WRITERSET), `test/one-screen-type-finalize.test.js` (PEERFINALIZE, NPRECONCILE),
  `test/swipe-declone-stage1.test.js` (HOMESTAYSLIVE), `test/browse-decouple.test.js`
  (LANDEDPAGESHOWS), `test/swipe-stage6.test.js` (PS, ABORT, SNAPSHOTGONE) — all measured to move
  under this slice's mutants, so all are in the set.

## 2. Executed baseline

- Repo suite, count read from the runner: **936 tests / 935 pass / 0 fail / 1 skipped**, 23.2 s.
- The one skip is `test/swipe-stage6.test.js:290`, a device-only cell ("jsdom cannot emit a
  browser-originated scroll in the window between endHold …"). It is unrelated to this slice.
- `test/swipe-navstack-settle.test.js` alone: **20 tests / 20 pass / 0 fail**.
- Control copy — `git archive HEAD` extracted outside the repo with `node_modules` reached by a
  directory junction: **936 / 933 pass / 2 fail / 1 skip**. The two failures are the git-only gates
  (`every hook script is EXECUTABLE in git's index`, `THE REAL ARTIFACT: this repo's own history
  passes the gate`), which cannot pass in a tree with no `.git`. Every out-of-repo figure below is
  stated against this control.
- Two further cells fail in **every** mutated run and are measurement artifacts, not reddened cells:
  `every mutation anchor still matches the source it targets` and `the no-mutbak CLI exits 0 on the
  clean repo and 1 when a *.mutbak is present`. They are excluded from the attributions below.

## 3. Mutation sweep — each of the twelve registrations applied individually, foreground, whole suite

Each was applied with `tools/mutate.mjs`, the whole suite run, then `--restore`; `find` for `*.mutbak`
after each batch returned nothing and `git status --porcelain` was empty. Registrations are cited by
name; indices in this registry moved recently and are not durable.

| Registration | Killing cell the plan declares | Cells measured red | Agrees? |
|---|---|---|---|
| `NAVSTALE-a` | `NAVIDENT`, **not** `NAVSTALE` | NAVIDENT drive I, NAVIDENT drive S, NAVRECONCILE | yes — NAVSTALE stayed green |
| `NAVSTALE-b` | `NAVSTALE` drive B′ | NAVSTALE drive B′ **on the throw assertion** (`swipe-navstack-settle.test.js:283`, one recorded `Cannot read properties of undefined (reading 'v')`), + NAVIDENT I/S, NAVRECONCILE, 2 swipe-model cells | yes |
| `NAVSTALE-c` | `NAVSTALE` | NAVSTALE drive F **on the arming clause** (`:241`), + NAVIDENT I/S, NAVPAIR, NAVRECONCILE | yes |
| `NAVIDENT-a` | `NAVIDENT` drive I only | NAVIDENT drive I, alone | yes — drive S stayed green, so drive I is confirmed the only drive separating `===` from `.v` |
| `NAVTOTAL-a` | `NAVTOTAL` (source), no behavioural cell | NAVTOTAL source cell, alone | yes |
| `NAVTOTAL-b` | `NAVPAIR`, **not** `NAVTOTAL` | NAVPAIR drive T, alone | yes |
| `NAVAPPLIES-b` | `NAVAPPLIES`, all three branches | 30 cells, including all five NAVAPPLIES cells and every control in the file | yes |
| `NAVTOKEN-a` | `NAVAPPLIES` abort-token clause | the abort-token cell, **alone** | yes |
| `NAVRECONCILE-a` | `NAVRECONCILE` (panel-reset clause) | NAVRECONCILE | yes |
| `NAVRECONCILE-b` | `NAVRECONCILE` (document-scroll clause) | NAVRECONCILE + M1WRITERSET | yes |
| `NAVAPPLIES-a` (`swipe: abort mutates the nav stack like a commit`, re-anchored by this slice) | the existing I11 abort cell, **not** `NAVSTALE` | I11 (`swipe-invariants` "an ABORT leaves the stack on the source") + 14 others; NAVSTALE stayed green | yes — the re-anchoring preserved the mutant's meaning |
| `EMPTYAFTERHOME-a` (re-anchored by this slice's comment scrub) | EMPTYAFTERHOME cells 1 and 2 | exactly those two | yes — the second re-anchoring preserved the mutant's meaning |

## 4. Falsifiability probes — what no registered mutant reaches

Four transforms were applied to a copy of HEAD outside the repo, control first, to test clauses that
no registration isolates. The repo was never transformed.

| # | Transform | Measured |
|---|---|---|
| W1 | `fwdStack.length = 0` deleted from the newNav commit branch | **No behavioural cell reddens.** Only the anchor gate, the two generated-model cells (line-count pins) and the two git-only gates. `NAVAPPLIES (newNav)` stays green. |
| W2 | the back branch pushes nothing onto `fwdStack` (`fwdStack.push(navStack.pop())` → `navStack.pop()`) | `NAVAPPLIES (back branch)` reddens, plus 14 others. Defended. |
| W3 | the `superseded` arm collapsed to `applied` | **six** cells redden, each on its own token clause, each printing the lie: NAVSTALE F, NAVSTALE B′, NAVIDENT I, NAVIDENT S, NAVPAIR T, NAVRECONCILE. |
| W4 | the `applied` arm collapsed to `superseded` | **six** cells redden, each on its own token clause: the four drive controls, NAVPAIR control, and the abort-token cell's paired half. |

W3 and W4 together with `NAVTOKEN-a` close §9 dimension 4(c) by execution: each of the token's three
values is asserted and each is measured able to fail on the clause that names it.

**Reachability probe for W1.** The three commit branches were instrumented in the copy and the whole
suite run: the newNav branch is reached **1** time, and on that occasion `fwdStack` is **already
empty** (`0` reaches with a non-empty `fwdStack`); the forward-replay branch is reached **7** times,
which is the probe's positive control. The marker string is assembled at run time
(`'XNEW' + 'NAVHIT'`) because an earlier form of the same probe reported two "hits" that were
`test/swipe-model.test.js` echoing the probe's own source text in a diff — a false positive the
literal marker could not distinguish from a firing.

**The review's W86, closed by execution rather than by reading.** The code review judged, by reading,
that an identity-preserving `openSub`/`closeSub` pair on the **back** branch is not a defect. Driven
in the copy, control first, two forward replays deep: the drive and its control both settle to
`browse` with `nav=applied`; the first forward replay lands `options` in both; the second forward
replay arms and lands `general` in the drive and does not arm in the control. The single difference is
`closeSub`'s own `fwdStack` push, which is byte-for-byte what an explicit `goBack()` leaves. The
residual's claim holds as measured, so the kind-3 × back-branch cell is **not applicable, with the
reason**, rather than bare.

## 5. The matrix — all ten catalog dimensions, every cell with a status

| # | Dimension | Status | What was measured |
|---|---|---|---|
| 1 | Lifetime and reuse | **SWEPT** | The gesture's claim is valid arm-to-finalize only. `NAVSTALE` (F, B′), `NAVIDENT` (I, S), `NAVPAIR` (T), `NAVAPPLIES`. Each killed by its declared registration (§3). |
| 2 | Trust boundaries and hostile inputs | **NOT APPLICABLE** | The predicate reads `currentDesc()`, `navStack`, `fwdStack`, `cur.from`, `cur.dest`, `cur.dir`, `cur.newNav` — all in-process state the app itself wrote. No serialized, external or attacker-influenced input on the path. |
| 3 | Concurrency | **SWEPT** | The only interleaving is user input inside the 340 ms window. Five drives (F, B′, I, S, T), each with its own control, all present in the suite and all measured red under their registrations. Gesture-vs-gesture supersession is the stage-6c cells, green at HEAD. |
| 4(a) | Commit-branch matrix | **SWEPT for `back` and `fwd`; PARTIAL for `newNav`** | `back` and `fwd` are driven by both `NAVAPPLIES` and `NAVSTALE`, and W2 confirms the back branch's `fwdStack` push is defended. `newNav`'s *push* half is defended (`NAVAPPLIES-b` reddens the cell). Its *clears the forward stack* half is **BARE** — W1 and the reachability probe. Finding M1. |
| 4(b) | Interference matrix | **SWEPT — five cells, plus a sixth ruled not applicable** | Kind 1 (empties the stack read): drives F and B′. Kind 2 (right shape, top means something else): drives I and S. Kind 3 (top identity intact, other stack moved): drive T. Each killed by its declared registration and by no other cell. The sixth position — kind 3 × back branch — is ruled not applicable by the W86 execution above. |
| 4(c) | Token-value matrix | **SWEPT** | `applied` asserted 6×, `superseded` 6×, `abort` 1×; each measured able to fail on its own token clause (W4, W3, `NAVTOKEN-a`). This is the direct answer to the review's O3, by execution: `NAVTOKEN-a` reddens the abort-token cell **alone**. |
| 5 | Failure and rejection paths | **SWEPT** | The throw oracle is proven live through the app's own timer path in the **built** tree, not only through `assertInstrumentLive`: under `NAVSTALE-b`, drive B′ reddens on the throw assertion with exactly one recorded `Cannot read properties of undefined (reading 'v')`. `NAVSTALE-c` reddens drive F on the arming clause. The `try/finally` cell in `browse-virtual.test.js` stays green. |
| 6 | Numerical edges and determinism | **SWEPT, source-only, honestly labelled** | `NAVTOTAL` pins `navStack.length > 1` over source; `NAVTOTAL-a` reddens it and **no behavioural cell** (measured). The cell carries its own acceptance test, which runs the extractor over synthetic predicate text with and without the conjunct and over a two-declaration source — so the scan is proven unable to only ever say yes. |
| 7 | Contract claims | **SWEPT, three** | (a) `currentDesc()` is total — the arming clause, red under `NAVSTALE-c`. (b) a superseded gesture never re-decides where the user is — the landed-screen clauses, red under `NAVSTALE-a`, `NAVIDENT-a`, `NAVTOTAL-b`. (c) the token names the outcome that occurred — W3, W4, `NAVTOKEN-a`. The source comment's claim that the reported outcome "cannot disagree" with the mutation holds by construction: the log line, the mutation and the reconcile read the one `applies` binding, verified in `js/app.js:706-717` and `1047-1048`. |
| 8 | Composition | **SWEPT for five of six named occupants; one NOTE** | `closeSub` (drive S), same-view `navTo` re-tap (drive I), two navigations composed (drive T), a reconcile landing on a scroll-resetting screen (`NAVRECONCILE`), an overlay source (drives S and T are both overlay-sourced gestures). §9 also names "a browse→browse pair" and assigns it no cell — Note N1. |
| 9 | Persistence round-trip and version evolution | **NOT APPLICABLE** | Nothing on this path is serialized, stored or versioned. The build number bumps, which is a stamp, not a format. |
| 10 | Functional achievement (the feature oracle) | **SWEPT** | Every drive executes the real gesture through the real touch listeners against the real `js/app.js` and asserts the end state the user sees — the landed screen read from the classes `js/nav.js` writes, and back/forward reachability read from whether a fresh gesture arms. Not one consistency oracle: no cell asserts the system does the same thing twice. The device-log half is the token clause, and its oracle can fail (W3, W4, `NAVTOKEN-a`). |

**jsdom has no layout or paint — checked, not assumed.** `test/swipe-navstack-settle.test.js` contains
no `getBoundingClientRect`, `offsetWidth`, `offsetHeight` or `clientHeight`. The landed screen is read
from class state; the scroll clauses read a recorded `window.scrollTo` call count and a plain
`scrollTop` property. No cell rests on geometry.

## 6. Findings

| # | Severity | Finding | Owner |
|---|---|---|---|
| M1 | **Misleading** | `NAVAPPLIES`'s newNav cell asserts "a fresh forward navigation clears fwdStack — no forward gesture may arm after it", and that clause **cannot fail**: `fwdStack` is already empty when the drive reaches the newNav commit, so `armed === false` holds whether or not `fwdStack.length = 0` runs. Measured twice — W1 reddens no behavioural cell, and the branch is reached once in 936 tests with `fwdStack` empty. §9 dimension 4(a)'s cell text credits the clause. | the planner |
| N1 | Note | §9 dimension 8 lists "a browse→browse pair" among the settle window's occupants and assigns it to no cell. The suite could not see it as written: `landed()` collapses every browse-family view to `browse`, so a superseded settle that leaves the wrong browse *page* showing reads identical to a correct one. | the planner |
| N2 | Note | Drive F's throw assertion is reddened by no registered mutation (`NAVSTALE-b` guards the forward branch, `NAVSTALE-c` swallows the throw). Its non-blindness rests on drive B′'s identical assertion under `NAVSTALE-b`, which is measured. This is an observation about where the in-suite proof lives, not a hole. | — |

### M1 — the test that belongs in the bare half, stated

The disposition is a two-way ruling only the planner can make, and both arms are named so it does not
come back as a hole:

- **If the state is reachable in production** — a `newNav` commit (which is only ever
  Now Playing → the chapter list, `js/app.js:444`) taken while `fwdStack` is non-empty — then the cell
  is a Curie gap and its occupant is: an integration drive on the app harness that reaches Now Playing
  **with `fwdStack` non-empty**, commits the right-edge NP → chapter-list gesture, and then asserts a
  right-edge forward gesture does **not** arm. The assertion is unchanged; what the missing test must
  supply is the *precondition*, because the assertion is only an oracle when `fwdStack` had something
  in it to clear. It is a feature oracle (the forward history the user can reach), not a consistency
  oracle. It must be shown red against a build with `fwdStack.length = 0` deleted — W1's transform —
  and the acceptance is that W1 then reddens a behavioural cell.
- **If the state is unreachable** — every writer that puts an entry on `fwdStack` (`goBack`,
  `closeSub`, the back commit branch) also moves `currentDesc()` off Now Playing, and every route onto
  Now Playing either clears `fwdStack` (`navTo`) or pops the exact entry (the forward replay branch) —
  then `fwdStack.length = 0` on the newNav branch performs no work in any reachable state, §9
  dimension 4(a)'s cell text must stop claiming it, and the statement itself is a lead for the code
  reviewer under the no-dead-surface rule. This audit measured the suite, not production: across all
  936 tests the state never occurs. Whether it occurs in the app is the planner's determination, and
  it is a reading until someone executes it — which is the standing lesson of this campaign.

### N1 — the test that belongs in the bare cell, stated

A browse→browse cell needs an oracle `landed()` does not have. The occupant: an integration drive that
opens Authors over Books (the `onAuthorsOverBooks` fixture already exists in
`test/swipe-invariants.test.js`), commits a left-edge back-swipe Authors→Books, taps the Authors tab
inside the settle window, and asserts the **page** — read from the recorded `browse.render` argument,
not from the `#browse` hidden class — matches the page the stacks now name, with `nav=superseded`.
Route to the planner first: dimension 8 must either name that cell or record the not-applicable reason,
which is available and is that every shipped writer that can interfere calls `applyScreen` and
therefore renders the newer page itself, so the superseded reconcile's `render: false` cannot strand a
stale page. Stating that reason closes the position without a test; leaving it unassigned does not.

## 7. The forward read

The bare half of 4(a) is the only unswept position in the matrix, and it is on the one commit branch
whose interference cell §9 deliberately declines to construct (`newNav` "pushes a captured object and
reads nothing"). If a future change gives Now Playing a route that arrives with forward history — a
back-swipe out of the chapter list that replays forward into Now Playing, or a resume that pushes Now
Playing without going through `navTo` — then the newNav branch acquires a live `fwdStack.length = 0`
and no cell in the suite watches it. That is where the next externally-found bug in this subsystem
lands: not in the guard, which is defended on every branch by a mutant that reddens exactly one cell,
but in the branch the guard admits unconditionally.

## 8. Handoff

- **Verdict:** ADEQUATE. The coverage-audit gate of `Claude/Campaigns/swipe-navstack.json` is cleared.
- **Next owner:** the planner, for M1's two-way ruling and N1's dimension-8 assignment. Neither blocks
  this slice; both are model corrections over §9.
- **Not adjudicated here:** whether `fwdStack.length = 0` on the newNav branch is dead code. That is a
  correctness question and it goes to the code reviewer as a lead if the planner's ruling says the
  state is unreachable.
- **Records:** this case file. The board and the campaign manifest are the assistant's and were not
  touched.
