# POIROT — Stage A1b of ONE SCREEN TYPE (Now Playing parks the page beneath it)

Type: code-review
Prior-review: POIROT-parked-page-rides-home-b358f73.md
Target: `e6a2f2e` (build `2026-07-31.290`), reviewed at HEAD `690162c` (2026-08-03).
Range: ff55286..e6a2f2e
Plan of record: `Claude/Plans/PLAN-one-screen-type.md` §5.3, §6a, §12 items 25–28 / 34–37, §13 step 8, §14.
Plan review of record: `Claude/Charpy/PLAN-one-screen-type-A1b-charpy-r3.md` — **FORGE**, `20c1663`.
Red suite: `Claude/Curie/RED-one-screen-type-a1b.md` — RED_SUITE_READY.
Build log: `Claude/Brunel/one-screen-type-stageA1b-build.md` — BUILD_GREEN.
Adversary: `Claude/Loki/STRIKE-one-screen-type-a1b.md` — **HELD_STONE**, struck on glass at `cef1093`.
Tree: clean before and after every command below; no `*.mutbak` at any point.

`Verdict: PASS — fix-then-ship.` The product change is exactly what the plan specifies and nothing
else — two deleted conditions in one function, verified against the diff file by file, with no fourth
category. Its correctness is proven by execution rather than argued: all nine touched or registered
mutants were re-swept in the **foreground** at HEAD this pass and every one is caught, each by the cell
that names it; both generated documents reproduce HEAD content-identically; the whole pre-commit battery
is green. `NPUNTOUCHED`'s source-scan cell — the standing guard on the ratified "Now Playing stays
unique" constraint — is untouched and still mutation-killed. **Nothing found changes a rendered pixel.**

What is required before this closes is a scrub of four false statements in HEAD, **two of which this
commit created**: a "CONFIRMED" provenance claim that names a mutant this same commit de-registered
(F1), and the red suite's own `js/nav.js` citations — including the text printed when the cell fails —
which now land on a *different* `hidden` writer (F2). Neither blocks the step-9 device gate, which
remains the only thing standing between this change and "fixed".

---

## The scene, and what it intends

`Nav.setView(v)` had two `if (!npOpen)` wrappers: one around the park-and-hide block, one around the
six-way settings-visibility loop. Entering Now Playing therefore parked nothing and hid nothing, and
an aborted NP gesture's own `applyScreen('nowplaying')` reconcile put nothing back — so every abort
left one more screen mounted beneath NP, and they accumulated. That is the mechanism behind the
three-plus-screens render the user photographed. Stage A1 did not create it; A1 made the settings
screens transparent and stopped masking it.

The change deletes both wrappers. The two blocks now run unconditionally, in the same order, so
entering Now Playing parks `#home`, hides `#browse` (firing `d.browseWillHide` on the shown→hidden
edge) and hides all six settings screens — exactly as entering any other screen does. Everything else
in the diff is a comment corrected to match, a test casualty, the mutation registry, or the build stamp.

**The shape matches the plan.** `git show --stat e6a2f2e` touches fifteen files; the only production
bytes that change outside the build stamp are the two deleted `if (!npOpen) {` lines with their
closing braces, the de-indent that follows them, and six comment sites the plan enumerates as §12
items 27, 28, 34, 35, 36, 37. **There is no fourth category.**

⛔ **Now Playing stays unique, and it is.** `git show e6a2f2e -- css/app.css` is four lines: two
comment lines replaced, immediately above `background: var(--page-bg)`. No declaration in the
`.nowplaying` rule is touched — `position: fixed`, `inset: 0`, `z-index: 60` and the background all
stand, and `NPUNTOUCHED`'s source-scan cell asserting them is green and is killed by a registered
mutant (executed below).

---

## The history, and what the seat before me left

The prior casebook (`POIROT-parked-page-rides-home-b358f73.md`) carried **[W39]** and **[W40]** — both
A1b-scheduled, both filed at the Stage A1 review: mutants `#104`/`#106` anchor text A1b deletes,
`NPUNTOUCHED`'s two class-state cells invert at A1b, and `js/nav.js:71-72`'s comment states a
back-reveal benefit the plan has since refuted. **Both are discharged by this build** — `#104` is
de-registered, `#106` is re-pointed and still caught, the two class-state cells are retired with their
subject relocated to `NPPARKS`, and the seven-line comment block is gone whole.

W39 does not close clean, though. It leaves a residue this commit made worse rather than better, and
that is F1.

**[W41]** — the `showAppView` sweep is LIVE and must be KEPT, determination filed with an executed
probe at the A1 review. It is not re-opened here. I confirmed only what the invocation asks me to
confirm: that the sweep's line (`js/app.js:522`) is byte-identical in the diff and that item 36's
invariant holds — no fragment of the retired "NP opened from Options" sentence survives, and the
still-true exception clause (`d.from.v !== s`, the outgoing mover) is preserved rather than orphaned.
Read at HEAD: it is.

---

## What I checked that the build log asserts, and how

**The mutation sweep, re-run rather than read.** The build log's nine indices (`92 102 103 104 105
106 107 108 111`) do **not** address the same mutants today — de-registrations and later campaigns
have shifted the array from ~120 to 135 entries. I re-derived every index from its **name** (the
prior casebook's own warning: never from the numbers), then swept those nine in the foreground with an
explicit timeout, and confirmed the tree clean before and after.

```
node --test "test/*.test.js"                          -> 824 tests / 823 pass / 0 fail / 1 skipped (25s)
node tools/hooks/run-checks.mjs                       -> no-mutbak, no-partial-sequence, stamp,
                                                         staged-stamp, lint, typecheck, tests,
                                                         campaign-gates, stage-manifest,
                                                         retired-name, device-gate -> PASS
node --test test/mutation-anchors.test.js             -> 4/4 ok (anchors apply; none is a no-op;
                                                         none non-unique; `also` parts covered)
node tools/mutation-sweep.mjs 76 85 86 87 88 89 90 91 94
  #76 caught (1)  browse-decouple PINGONE
  #85 caught (6)  one-screen-type PEERPARK/PEERFINALIZE-b
  #86 caught (2)  one-screen-type NOSETTINGSBG-b      — killed by NPUNTOUCHED source-scan + NOSETTINGSBG
  #87 caught (2)  one-screen-type ONEPAGE
  #88 caught (5)  one-screen-type PEERPARK/PEERFINALIZE-a   (the two-part `also` mutant)
  #89 caught (1)  one-screen-type NPPARKS-a           — killed by NPPARKS from Home
  #90 caught (3)  one-screen-type NPPARKS-a'          — PEERFINALIZE edge 3, NPPARKS from Browse, NPRECONCILE
  #91 caught (2)  one-screen-type NPPARKS-b           — nav.test.js (the inverted cell) + NPPARKS from settings
  #94 caught (7)  one-screen-type PEERPARK-c
  swept 9: 0 uncaught, 0 unapplied, 0 stale flags
git status --porcelain                                -> empty, before and after
find . -name "*.mutbak"                               -> none, before and after
```

The killer sets have drifted from the build log's (e.g. `#94` now has seven killers including
`ENTRYNOZERO`); that is later-commit drift, not a defect. **Every mutant the build claims is caught, is
caught, at HEAD, by execution.**

**The generated documents.** `node tools/gen-swipe-model.mjs` and `node tools/gen-transition-matrix.mjs`
both reproduce HEAD **content-identically** — `git diff --stat` reports no content change (the
transition matrix showed a `git status` entry from an LF/CRLF write only, and I restored it with
`git checkout --` so the tree ends where it started; that is tree hygiene after my own probe, not an
edit to the artifact under review, and it is the only write verb I used).

**The test casualties — each one, against the design change rather than against convenience.** Five,
where §6a's table enumerates four:

| Casualty | What happened | Is it a genuine casualty? |
|---|---|---|
| `NPPARKS` ×3, `NPRECONCILE`, `PEERFINALIZE` edge 3 | `{ skip: … }` removed | Unskips, not casualties. Read in full: **no assertion was weakened**; the diffs are the skip constant and re-indentation. |
| `NPUNTOUCHED`'s two class-state cells | Deleted | Yes. They assert `hidden('options') === false` after applying `nowplaying` — precisely the invariant A1b abolishes. Their subject is asserted, inverted, in `NPPARKS`. |
| `test/nav.test.js`'s "NP leaves the settings overlays as they were" | **Inverted, not deleted** | Yes, and this is the casualty §6a's table missed. It now asserts `hidden('options') === true`. Executed: it is a **live killer of mutant `NPPARKS-b`** (#91), so the dimension is defended, not merely relabelled. |
| Mutant `#104` (`NPUNTOUCHED`) | De-registered | Yes — its anchor is the deleted guard and its intent (restore the settings exemption) has no defect left to model. §6a rules exactly this. |
| Mutant `#106` (`PEERPARK`/`PEERFINALIZE-a`) | Re-pointed as a two-part `also` mutation | Correct, and necessary: the wrapper it guarded as a unit is gone, so a settings exemption now takes two statements. Executed: caught, five killers. |

None of the five is a test that was in the way. Every one is either an unskip or a subject the design
change abolished, and in each case the dimension survives in a cell that can still fail.

**The device-owed set is not over-claimed anywhere.** The build log's "What remains device-owed"
section, the plan's §15 R-H rows and step 9, and the board all keep the step-9 gate open, and all
three state plainly that jsdom has no layout or paint and that no cell asserts visibility. I checked
the three new suites for a cell that quietly claims occlusion: there is none. `NPRECONCILE` is
explicit that it reads the entry set as an instrument rather than pinning it, and says why — pinned
to `[]` it would halt on `NPPARKS`'s invariant and never drive a gesture.

---

## Findings

### F1 — Significant. A "CONFIRMED" provenance claim naming a mutant this commit deleted

`test/one-screen-type.test.js:192-195`, above the surviving `NPUNTOUCHED` source-scan cell, is retained
verbatim from Stage A1:

> Its ability to fail is therefore carried by its registered MUTANT (tools/mutate.mjs, "one-screen-type
> NPUNTOUCHED"), which is CONFIRMED to redden it — evidence of the same kind, obtained the same way, as
> a red.

**This commit de-registers that mutant** (§6a row 1; `tools/mutate.mjs`, −13 lines). Executed: I
enumerated the registry at HEAD (135 entries) and **no mutant named `one-screen-type NPUNTOUCHED`
exists**. The comment is an absolute claim — "registered", "CONFIRMED" — about an artifact the same
diff removed, and it sits on the one cell that guards the user's ratified NP-uniqueness decision.

The correct replacement was already written and available: the plan's §14 `NPUNTOUCHED` row specifies
the mutation as *"NATURAL delete the Now Playing background declaration"* — that is `NOSETTINGSBG-b`,
which I swept (#86) and which is killed by this very cell. The builder had it and did not apply it.

**What it costs if left as shipped.** A maintainer verifying the guard on a standing user constraint
looks for the named mutant, finds nothing, and takes one of two wrong turns: re-registering a mutant
whose intent A1b abolished, or concluding the cell is undefended and weakening it. It also conceals a
true and narrower fact worth knowing — only the **`background`** assertion is mutant-defended;
`position: fixed`, `inset: 0` and `z-index: 60` have no registered mutant at HEAD (pre-existing:
`#104` only ever reddened the class-state cells, per `Claude/Curie/RED-one-screen-type.md:119-121`).

### F2 — Significant. The red suite's `js/nav.js` citations now land on a different `hidden` writer

`test/one-screen-type-npparks.test.js` states, **of the world A1b produces**, at `:12-13`:

> the `npOpen` variable, the `hidden` toggle on #nowplaying (js/nav.js:81) and the `np-locked` body
> toggle (js/nav.js:82) all stay.

and, in the **assertion message** at `:128-129` — the text printed when `NPPARKS` from a settings
screen fails:

> `hidden` is ADDED to #nowplaying in exactly one place (js/nav.js:81) and the same synchronous setView
> body un-hides the destination three lines earlier (js/nav.js:78-80)

At HEAD those statements are `js/nav.js:71` and `:72`; `:81` is blank. **`js/nav.js:78` is
`$('navbar').classList.toggle('hidden', !d.isSignedIn())`** — a different `hidden` writer that reads as
plausible to anyone following the citation. The adversary recorded the same drift independently
(`STRIKE-one-screen-type-a1b.md:18-19`).

This is not decorative. That sentence **is** the stage's proof of record — the single-writer argument
that licenses deleting the ratified settings-loop exemption (plan §5.3 step 3, probe §9.1). Weaker
instances of the same drift sit at `:9` and `:87` (`js/nav.js:51`/`:78` as the guards, present tense),
and in the plan's §12 "Explicitly NOT deleted" list, which gives `js/nav.js:81`/`:82` for what stays
*after* A1b.

**What it costs if left as shipped.** A maintainer debugging a `NPPARKS` failure reads the message,
opens `js/nav.js:81`, finds nothing, and the load-bearing proof reads as false at its own citation —
or worse, lands on `:78`'s navbar toggle and concludes the single-writer claim is wrong. This project
has already paid for a stale citation pointing into the wrong rule.

### F3 — Significant (records). The plan's Status table certifies a stage that has been live for three days as unbuilt

`Claude/Plans/PLAN-one-screen-type.md:39` names round 2 as "**the verdict of record**" and states
"**Re-review OWED before build**"; `:98` says "Stage A1b is added, 2026-07-31, and is the next stage."
Round 3 filed **FORGE** at `20c1663` and the build shipped at `e6a2f2e` on 2026-07-31.

The same document contradicts itself: §13 step 1 names round 3 and its FORGE, and step 8 says
"✅ **BOTH PRECONDITIONS MET — this step is OPEN**". Standards §7 forbids leaving a contradiction
softened or both sides kept.

The build log's handoff explicitly assigned this ("the plan's status header is Zelda's to reconcile
against this handoff"). `git log e6a2f2e..HEAD -- Claude/Plans/PLAN-one-screen-type.md` returns
nothing: it was never done. The board **is** current and correct; the plan is not, and the plan is
what a future session opens first.

### F4 — Minor. The same test file's CELL MAP still describes the retired behaviour

`test/one-screen-type.test.js:29-32` still reads:

> `NPUNTOUCHED` unit+source — applying Now Playing leaves whichever settings screen was showing exactly
> as it was (the NP-back reveal), and .nowplaying keeps its inset, its z-index and its background.

That is the exact inverse of what the code now does, ten lines above the block this same commit wrote
to document the narrowing. Step 17's scrub is phrase-scoped to "additive overlay" and does not reach
it; step 17's *claims* half would, but step 17 runs after Stage B. This is the same class as §12 item
34, which the plan deliberately pulled forward to step 8 so it would not become a durable residue.

### F5 — Observation, routed to the coverage auditor. §14 and the shipped cells have diverged in two places

- §14's `NPUNTOUCHED` row requires the cell to "assert ... that the body np-locked navbar rule still
  raises the navbar above it". The shipped cell asserts `position`, `inset`, `z-index` and `background`
  and says nothing about the navbar. Pre-existing (authored so at Stage A1), not A1b's doing.
- §14's `NPPARKS` row specifies "**TWO** mutants" (`NATURAL-a`, `NATURAL-b`). The build registered
  **three** (`-a`, `-a'`, `-b`) with a stated and, on reading, correct reason — post-deletion the
  park/hide block has no enclosing brace to re-guard as a unit. §14 was not amended, so an auditor
  counting against the model finds a discrepancy with no explanation in the model.

Neither is a defect in shipped behaviour; both are the auditor's to adjudicate against the coverage
model, and I flag rather than settle them.

### F6 — Observation. Two further sites state the retired NP-back-reveal mechanism

`test/page-bg-single-painter.test.js:13` describes `.nowplaying` as "mounted over an untouched settings
screen for the NP-back reveal". False after A1b. It is inside step 17's scope (the same file carries
"additive overlay" at `:53`, and the prior casebook's **[W38]** already holds this file for a different
reason), so it is named here for the scrub rather than charged to this build.

---

## Coverage Ledger

Rows derived mechanically from `git diff --name-only ff55286..e6a2f2e`, one per changed symbol.
Marks: `✓` = cleared by a command **executed this pass** (cited above); `~` = cleared by reading the
current source in full this pass; `n/a`; `F<n>` = finding.

| Changed symbol (file) | Correctness / data-flow | Scope vs plan §12 | Deferred-resource sweep | Reassuring / absolute claims | Citation accuracy | Mutation defence (executed) | Cross-call state |
|---|---|---|---|---|---|---|---|
| `setView()` — the two guard deletions (`js/nav.js:45-80`) | ~ clear: same statements, same order, `npOpen` still assigned first from the current call's argument | ~ clear: §12 items 25, 26 exactly | ~ clear: adds no timer, listener, rAF or promise; deletes two conditions | ~ clear: item 28's replacement comment states S1–S5 truthfully | ~ clear: `js/nav.js:55-69` cited from `js/app.js:368` still resolves correctly | ✓ clear: `#89`, `#90`, `#91`, `#88`, `#85`, `#94` all caught | ~ clear: `browseWillHide` still fires before `.hidden` lands; re-activation owned by `Browse.showPage` on every close path (all four traced) |
| `applyScreen()` — item 34 comment (`js/nav.js:148-149`) | n/a comment only | ~ clear: item 34 discharged | n/a | ~ clear: new text is true (no document scroll; setView parks the page beneath) | ~ clear: no `file:line` in the new text | n/a | n/a |
| `showAppView()` — item 36 comment (`js/app.js:516-522`) | ~ clear: `:522`'s sweep line byte-identical | ~ clear: item 36's invariant met — no fragment of the retired sentence survives, exception clause preserved | ~ clear | ~ clear: names the `overlayFilmstrip` window, the case §5.3.5 proved live | ~ clear | ✓ n/a — no mutant anchors this comment | ~ clear: `d.from.v` two-lifetimes pattern unchanged (Loki lesser plane 3) |
| `bindPullRefresh()` — item 35 comment (`js/app.js:1226-1228`) | ~ clear: guard reads `currentDesc()` **and** `.parked`; both true under NP | ~ clear: item 35 discharged | n/a | ~ clear: "a visibility check alone would misfire" is true — `parked` is not `hidden` | ~ clear | n/a | n/a |
| `.nowplaying` rule — item 37 comment (`css/app.css:505-513`) | n/a comment only; no declaration touched | ~ clear: item 37, and the ⛔ constraint held | n/a | ~ clear: co-required-properties reason matches `DecisionLog:1158-1161` | ~ clear | ✓ clear: `#86` (`NOSETTINGSBG-b`) caught, killed by this cell | n/a |
| `test/nav.test.js` — the inverted cell (`:70-83`) | ~ clear: assertion inverted to the new truth, not deleted | ~ clear: the casualty §6a's table missed; retired the same way | n/a | ~ clear: header names `NPPARKS` as the subject's new home | ~ clear | ✓ clear: live killer of `#91` | n/a |
| `test/one-screen-type.test.js` — `NPUNTOUCHED` narrowing + two retirements | ~ clear: the two retired cells asserted exactly what A1b abolishes | ~ clear: §6a rows 3 and 5 | n/a | **F1** — "registered MUTANT … CONFIRMED" names a mutant this commit de-registered | **F4** — CELL MAP `:29-32` still states the retired behaviour | ✓ clear: surviving source-scan cell killed by `#86` | n/a |
| `test/one-screen-type-npparks.test.js` — three unskips | ~ clear: read in full; no assertion weakened; scope disclaimer honest | ~ clear: plan step 7 / §14 `NPPARKS` | n/a | ~ clear: no absolute claim beyond the citations in F2 | **F2** — `:12-13`, `:128-129` cite `js/nav.js:81`/`:78-80`; at HEAD `:71`/`:69-70`, and `:78` is the navbar toggle | ✓ clear: kills `#89`, `#90`, `#91` (declared killers, matched) | n/a |
| `test/one-screen-type-npreconcile.test.js` — unskip | ~ clear: reads the entry set as an instrument, and states why | ~ clear: plan step 7 | ~ clear: real-clock guard retained for the `vx` resample trap | ~ clear: no unverified absolute | ~ clear: `js/app.js:547`, `:512` cited; both resolve | ✓ clear: kills `#90` | ~ clear: drives two consecutive aborts on one live app instance — the cross-gesture accumulation is the cell's subject |
| `test/one-screen-type-finalize.test.js` — edge-3 relocation unskip | ~ clear: recorder installed **before** the abort, as §6a requires; asserts the NP close does not re-fire | ~ clear: §6a row 4, all four turned assertions accounted | ~ clear: fake timers advanced past the 340ms net | ~ clear | ~ clear: `js/nav.js:55` still correct at HEAD | ✓ clear: kills `#85`, `#90`, `#94` | ~ clear: end-state assertions cover the second traversal |
| `tools/mutate.mjs` — MUTATIONS registry (7 entries changed) | ✓ clear: anchors test 4/4; `also` parts covered by both the applier and the uniqueness check | ~ clear: §6a rows 1–2 plus §14's three new mutants | n/a | ~ clear: each re-anchor carries its stated reason and the reasons check out against the diff | ~ clear: `js/nav.js:78` in the re-anchor notes is **historical** (the deleted guard), correctly tensed | ✓ clear: all nine swept, 0 uncaught / 0 unapplied / 0 stale | n/a |
| `docs/swipe-model.generated.txt` | ✓ clear: `gen-swipe-model.mjs` reproduces HEAD content-identically | ~ clear: regeneration is mandated, not optional | n/a | ~ clear: four content-hash fingerprints unchanged, as the log states | ✓ clear: the three pinned `navStack` citations re-derive | ✓ clear | n/a |
| Build stamp — `index.html`, `build.json`, `js/debug.js`, `sw.js` | ✓ clear: `stamp` + `staged-stamp` checks pass | ~ clear: step 8 mandates the bump | n/a | n/a | ✓ clear: all `?v=` values in lockstep at `.290` | n/a | n/a |
| Records — `Claude/Brunel/one-screen-type-stageA1b-build.md` (+ the plan it hands off to) | ~ clear: the log's own claims re-verified by execution above | ~ clear | n/a | ~ clear: device-owed section accurate and not over-claimed | **F3** — the plan's Status table still says the build is not open | n/a | n/a |

No cell is empty. Every `~` is a structural or textual claim settled by reading the current source in
full this pass; every behavioural, enumerable or tool-output claim carries a `✓` backed by a command
cited above.

---

## The prediction

Left as shipped, none of these four moves a pixel — and that is exactly what makes them expensive. F1
and F2 are both **provenance** claims: they tell the next reader where the evidence for a guard lives.
When that reader arrives — and on this campaign they arrive at Stage A2, which touches the same
stylesheet, and at Stage B, which touches the same `isOverlay` taxonomy — F1 sends them hunting a
mutant that does not exist, and F2 sends them to a line that holds a *different* `hidden` writer. The
predictable outcome is not confusion; it is a confident wrong conclusion. Either the reader decides
`NPUNTOUCHED` is undefended and relaxes it (the one cell standing on a user decision the record says
was re-litigated until the user had to repeat it), or they read `js/nav.js:78`'s navbar toggle as a
second `hidden` writer on `#nowplaying` and conclude the single-writer proof — the whole licence for
this stage — was never true. The adversary's fourth lesser plane says the same thing from the other
side: *nothing gates single-writer-ness*, so the only thing holding that proof is prose, and two of
its citations are now wrong.

F3 is the cheapest to fix and the most likely to be acted on wrongly. A future session that opens the
plan before the board reads "Re-review OWED before build" against a stage that has been on the user's
phone since 31 July, and the honest response to that sentence is to build it again.

---

## Watch-list

Carried from `POIROT-parked-page-rides-home-b358f73.md`. This build is two deleted conditions in
`js/nav.js` plus comments, tests and the mutation registry; it touches none of the swipe-subsystem or
park-distance items, which carry forward unchanged unless a status is given.

- **[W1] [W4] [W7] [W11] [W13] [W16] [W18] open** — apply-on-approval records for stages 6b–6h un-applied in HEAD. Owner Zelda.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device.
- **[W5] open** — Loki r2 lesser-planes (`recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` → Brunel).
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat.
- **[W8] open** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda.
- **[W9] open** — Loki 6e residual 2: unguarded `.nav-ghost === owned-pane(live session)` invariant.
- **[W10] open** — `disposeOwnedPanes`/`dropPanes` byte-identical removers, both now no-ops; step-11 items.
- **[W12] open** — 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Owner Mendeleev.
- **[W14] open** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device.
- **[W21] open** — a fresh Loki strike against the BUILT 6i code. Owner Loki.
- **[W22] [W23] [W24] [W25] open** — 6i `#home` device gates R1(a)-(e). Owner on-device.
- **[W26] open** — 6i apply-on-approval records (plan §13 amendments/annotations). Owner Zelda.
- **[W28-residual] open** — ghost-era vocabulary throughout the settle path in `js/swipe.js` and `js/app.js`. Non-blocking.
- **[W29] open** — `plan.incoming` / `plan.outgoing` / `plan.renderDestination` production-unread, deliberate and exact-key-gated. Owner Vitruvius. Non-blocking.
- **[W30] [W31] [W32] [W33] open** — browse-decouple device gates R-flash / R-navbar / R-strip / R-browse2browse. Owner on-device.
- **[W34] open** — no `DecisionLog.md` NEW-POLICY entry for `PL-swipe-browse-fixed-ownscroll`. Owner Zelda. Non-blocking.
- **[W35] open** — build-log "Files changed" lists omit build-stamp files. **Fifth observation, and A1b is a second counterexample**: `Claude/Brunel/one-screen-type-stageA1b-build.md` names `build.json`, `index.html`, `js/debug.js` and `sw.js` explicitly. The pattern is no longer general. Owner Brunel/Zelda. Non-blocking.
- **[W36] noted** — Flash C (browse→browse in-list divider re-raster) out of scope.
- **[W38] open** — three shipped prose sites state the exclusivity universal plan §5.1 forbids (`css/app.css` ×2, `test/page-bg-single-painter.test.js` ×2). Untouched by A1b. **Now compounded** — see [W64]. Owner Brunel.
- **[W39] RESOLVED by this build, with a residue** — mutant `#104` de-registered, `#106` re-pointed as a two-part `also` mutation and executed-caught (`#88`), and `NPUNTOUCHED`'s two class-state cells retired with their subject relocated to `NPPARKS` (executed: `NPPARKS` kills `#89`/`#90`/`#91`). The residue is **F1**, carried forward as [W62]. *Durable lesson graduating to the seat's disciplines: de-registering a mutant is an edit to every comment that cites it by name — the citation is a claim, and it goes stale in the same commit.*
- **[W40] RESOLVED** — `js/nav.js:71-77`'s seven-line exemption comment is deleted whole (plan §12 item 27), verified in the diff. The benefit it misattributed is gone with it.
- **[W41] open** — `showAppView`'s sweep is LIVE and must be KEPT; determination filed at the A1 review with an executed probe and **confirmed unchanged here** (`js/app.js:522` byte-identical; only its comment was rewritten). Not to be re-opened.
- **[W42] open** — plan §5.2's `.alphaindex` argument for A2 does not cover the browse↔settings gesture window. Owner Vitruvius.
- **[W43] open** — device-owed R-B / R-C / R-E / R-G, unclaimed by any cell. Owner on-device.
- **[W44] open** — `js/app.js:2543`, `:3050`, `:3143` call `applyScreen(d, {render:true})` for browse descriptors with no `gestureOwnsMovers` guard. Re-read this pass; unchanged by A1b. Owner Brunel. Non-blocking.
- **[W45] RESOLVED** (prior build, `e1208eb`) — recorded once; falls off after this entry.
- **[W46] open** — a same-key browse pair puts one node in both mover slots; `MOVERSDISTINCT` green on it because both fixtures use two different keys. Owner Vitruvius.
- **[W47] open** — `js/browse.js:192-193` and plan §5.3.6 name `home→browse` / `overlay→browse` as miss-branch transitions; they take the landed branch. Owner Brunel + Vitruvius.
- **[W48] RESOLVED** (prior build, `e1208eb`) — recorded once; falls off after this entry.
- **[W49] open** — the three trigger-census citations in `Claude/Brunel/swipe-declone-stage2-build.md` §1 point at wrong lines. Owner Brunel.
- **[W50] open** — `tools/mutate.mjs`'s NOOP de-registration reason misattributes what `keepGhosts` guards. Non-blocking.
- **[W51] RESOLVED** (step-10a probe run at `174a800`) — its durable lesson is already routed; falls off after this entry.
- **[W52] noted** — the `375e11f` uncaught-mutant class was swept and closed; not to be re-swept.
- **[W53] open** — F1 of the prior review: `css/app.css:125` cites `css:224-229`; the `navIn*` keyframes are uncited. Owner Brunel.
- **[W54] open** — F2+F3 of the prior review: three sites in `test/parked-page-rides-home-css.test.js` state a HEAD that no longer exists. **Same class as [W63] below; they should be scrubbed together.** Owner Brunel.
- **[W55] open** — F4 of the prior review: `SKIP_FLOOR` / `SKIP_FORM` dead. Owner Brunel.
- **[W56] open** — F5+F6 of the prior review: two plan §11 on-approval record items unfilled. Owner Zelda.
- **[W57] open** — F7 of the prior review: PARKM4's registered name claims a kill the sweep disproves. Owner Brunel/Curie.
- **[W58] open** — F8 of the prior review: `css/app.css:140-141`'s "nothing in js/ listens for resize". Owner Brunel.
- **[W59] open** — F9 of the prior review: the no-`padding`/no-`border` precondition cell is a GATE with no registered mutant. Owner Mendeleev.
- **[W60] open** — F10 of the prior review: the real-engine oracle has no recorded run at 375/640/1000px. Owner the deriver / bench.
- **[W61] open** — the parked-page device gate, plan §8 items 1 and 2, still unclaimed. Owner on-device.

New this build:

- **[W62] open (NEW)** — **F1.** `test/one-screen-type.test.js:192-195` asserts the surviving `NPUNTOUCHED` cell's failability is "carried by its registered MUTANT (tools/mutate.mjs, 'one-screen-type NPUNTOUCHED'), which is CONFIRMED to redden it". That mutant is de-registered by this commit; the registry at HEAD has no such name. The plan's §14 already specifies the replacement (`NOSETTINGSBG-b`, executed-caught as `#86`). While correcting it, state the narrower truth: only the `background` assertion is mutant-defended. Owner Brunel, via the apply-review of this casebook.
- **[W63] open (NEW)** — **F2.** `test/one-screen-type-npparks.test.js:12-13` and the assertion message at `:128-129` cite `js/nav.js:81` / `:78-80` for the post-A1b world; at HEAD those are `:71` / `:69-70`, and **`js/nav.js:78` is the navbar's own `hidden` toggle** — a false landing that reads as correct. `:9` and `:87` carry the same drift in weaker form, as does the plan's §12 "Explicitly NOT deleted" list. Same class as [W54]. Owner Brunel.
- **[W64] open (NEW)** — **F4 + F6.** Two sites state the retired NP-back-reveal mechanism as current: `test/one-screen-type.test.js:29-32` (the CELL MAP, which step 17's phrase-scoped scrub does **not** reach) and `test/page-bg-single-painter.test.js:13` (which it does). The first is the §12-item-34 class and should not wait for step 17. Owner Brunel; the second may ride with [W38] at step 17.
- **[W65] open (NEW)** — **F3.** `Claude/Plans/PLAN-one-screen-type.md:39` and `:98` state that A1b's build is not open and that round 2 is the verdict of record; round 3 filed FORGE at `20c1663` and the build shipped at `e6a2f2e`. §13 steps 1 and 8 in the same file say the opposite. The build log handed this to the assistant and it was never done. Owner Zelda.
- **[W66] open (NEW)** — **F5.** §14's `NPUNTOUCHED` row requires a `body.np-locked` navbar assertion the cell has never carried, and its `NPPARKS` row says "TWO mutants" where three are registered (with a correct stated reason). Adjudicate against the coverage model. Owner Mendeleev.
- **[W67] open (NEW)** — **the adversary's named residual, unclaimed by any record the user will read.** Loki proved Books scroll survives the new `display:none` **in Blink** and named the WebKit half as owed: *scroll Books deep, open NP, close it — you must come back where you were.* It is on the board; it is **not** in the plan's §13 step 9 device-gate list, which is what the user works from. Owner Zelda (to fold), then on-device.
- **[W68] open (NEW)** — **Stage A1b has no `DEVICE-*` record.** The `Claude/**/DEVICE-*.md` convention and its format gate (`tools/hooks/device-gate-check.mjs`) were built on 2026-08-02, after this build; the only such record is the parked-page one. The gate polices the format of records that exist and cannot notice a stage that has none, so A1b's step-9 gate — the one thing standing between this change and "fixed" — lives only as prose. Owner Zelda. Non-blocking on the code.
- **[W69] open (NEW)** — **the adversary's fourth lesser plane, routed and not re-argued here.** Nothing gates the single-writer property (`js/nav.js:71` is the only statement adding `hidden` to `#nowplaying`); a future second writer greens the whole suite. That property is the licence for this stage, and F2 shows its prose citation has already rotted once. Owner Mendeleev.

---

Verdict: PASS — fix-then-ship. Two deleted conditions, correct and complete against the plan, with
every mutant re-swept in the foreground this pass and every one caught; four false statements in HEAD
to scrub, two of them created by this commit, none of which blocks the step-9 device gate.
