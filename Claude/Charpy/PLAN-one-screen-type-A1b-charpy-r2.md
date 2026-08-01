# Plan review, round 2 — PLAN-one-screen-type.md, Stage A1b ("Now Playing parks the page beneath it")

Type: plan-review
Plan: `Claude/Plans/PLAN-one-screen-type.md` — the A1b fold, commit `57e503d`
Round: 2 (conformance re-review of the fold of round 1's six Structural findings)
Round 1: `Claude/Charpy/PLAN-one-screen-type-A1b-charpy.md`, commit `35f0005` — **TEMPER**
Reviewed at: HEAD `57e503d`, build `2026-07-31.287`, tree clean, `npm test` 823 pass / 0 fail / 1 skip
Date: 2026-07-31

<!-- charpy-gate {"review_type":"plan-review",
  "patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":false,"contract_shape":false},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/nav.js:45-90","js/nav.js:128-156","js/nav.js:192-214","js/app.js:440-465","js/app.js:490-513","js/app.js:530-554","js/app.js:810-820","js/app.js:1240-1262"],
  "callee_ranges":[]} -->

## Applicability

- **defining_records: true** — round 1's fatal-adjacent finding was a claim *about* two records. The
  fold answers it by writing a third (`PROBE-np-uniqueness.md` §9) and a fourth
  (`DecisionLog:1195-1213`). Reconciling all four against each other and against source is this
  round's first duty, not background.
- **boundary_relocation: true** — unchanged from round 1 and re-verified at HEAD: occlusion of
  whatever sits beneath Now Playing relocates from `.nowplaying`'s own opaque full-bleed rule to
  `setView`'s park-and-hide swap. The declared ranges are round 1's, re-driven at `57e503d`; the fold
  moved no boundary and added no value. Ledger below.
- **callee_replacement: false** — the fold changed no callee and introduced no indirection. A1b is
  still the deletion of two conditions (`js/nav.js:51`, `js/nav.js:78`); `d.gestureOwnsMovers` is
  untouched. No `callee_ranges` are owed.
- **contract_shape: false** — the fold changed no returned key and no value domain. `Swipe.kindOf`,
  `Nav.isOverlay`, `classifyTransition` and `test/fixtures/swipe-plan-spec.mjs` remain Stage B's
  surface. Re-confirmed at HEAD: `docs/swipe-model.generated.txt` and
  `docs/transition-matrix.generated.txt` carry no park/hide/`npOpen` statement.

## Verdict

**TEMPER** — and the distance to FORGE is much shorter than round 1's.

**All six round-1 Structural findings are resolved, and I checked each against the thing itself
rather than against the fold's account of it.** F2 in particular: I did not take probe §9.1's proof
on trust, I re-derived it — enumerating every `classList.add|remove|toggle('hidden')` site across
`js/*.js` returns exactly two that can reach `#nowplaying`, the toggle at `js/nav.js:81` and the
remove-only `js/app.js:551`, with `js/nav.js:200` remove-only on settings elements. The shorter
proof holds, the record path is walked explicitly, and the false sentence is removed rather than
softened. F6's census is now correct assertion-by-assertion: every one of the ten citations into
`test/one-screen-type-finalize.test.js` and `test/one-screen-type.test.js` resolves exactly at HEAD.

**Three new Structural findings, and one of them is executed.**

**F14 is the one that stops the stage, and it is mechanical.** The fold's answer to round 1's F1 is a
manifest gate, and the plan now says twice that "A1b cannot be built on a TEMPER, and that is
mechanized." I ran it. `Claude/Campaigns/one-screen-type-a1b.json` declares
`verdictArtifactGlob: "Claude/Charpy/PLAN-one-screen-type-A1b-charpy.md"` — a literal filename with
no wildcard — so `globFiles` compiles `^PLAN-one-screen-type-A1b-charpy\.md$` and **cannot match this
file**. The tool has purpose-built `-rN` round-of-record logic (`stage-gate-check.mjs:90-113`), and
this manifest's glob is the one shape that never reaches it. The gate therefore reads round 1's
TEMPER forever, whatever verdict I file. It fails closed, which is safe — but step 1 as written is
undischargeable, and the mechanism the plan leans on to prove it is not is the thing that blocks it.

**F15 and F16 are the same class round 1 was about: a load-bearing sentence that is false.** The fold
is where new false sentences enter, and two did. F15 — edge 5's ruling rests on two grounds, and the
second is false: `Browse.deactivate()` does not no-op on edge 5's own reachability scenario, the
firing is not "extra", and the idempotence that actually protects the edge lives in
`js/virtuallist.js:255`, not in `setView` — so the ruling's named re-open condition points at the
wrong artifact. The ruling's *outcome* survives on its first ground. F16 — R-H hazard 3's cost claim
overstates what A1b adds; **and it overstates it because the fold faithfully transcribed my own
round-1 F10, which was wrong.** The render is paid today.

Six Weak and Note findings follow, all of them sentence-level. Nothing here shatters the specimen and
nothing touches the mechanism: the guard deletion is still sufficient for the defect it targets, and I
re-drove it at HEAD.

## Round-1 disposition — the answer the re-review was commissioned for

| Round 1 | Severity | Disposition | The citation that proves it |
|---|---|---|---|
| **F1** — status line claims a gate A1b never passed | Structural | **Resolved in the record; the mechanism it now cites cannot clear → F14** | Plan `:35-39` is a per-stage table; the A1b row carries `35f0005`, TEMPER, "Re-review OWED before build". §13 step 1 (`:1446`) is split per stage and states A1b is NOT discharged. |
| **F2** — "additivity was never among the reasons" is false | Structural | **RESOLVED — removed, not softened; and the licensing derivation is real** | Plan `:79-88` states the assertion "was false" in those words. The record path is walked at `:483-497`: probe §4.2 (`PROBE:115-117`) → `DecisionLog:1162-1163` (verified verbatim) → probe §9.1 supersedes to `context` (`PROBE:273-338`). §5.3.2's caller table is demoted at `:564-571` to "the per-path detail a builder and a device gate work from; the proof of record is §9.1". §1's probe row (`:154`) reads CONFLICT-resolved-by-dated-supersession. Probe §8 (`:248-251`) keeps 4.2 visible as retired rather than deleting it — §6.6 done correctly. **Independently re-derived, not accepted:** grep of every `classList.*('hidden')` site in `js/*.js` confirms `js/nav.js:81` is the only writer that adds `hidden` to `#nowplaying`. |
| **F3** — cites NP's background as its distinguishing property | Structural | **RESOLVED, with the 1.9 twist carried correctly** | All three sites re-worded: header `:73-77`, §4 STAYS `:263-269`, §5.3 `:476-478`. §5 `:350-359` states the co-required framing and forbids the old form outright ("No section of this plan may name the background, the inset and the z-index as NP's uniqueness"). The promotion is at §1 `:155` and probe §9.2 (`PROBE:340-365`), pinned by `test/page-bg-single-painter.test.js:28` — verified exact, and green in the run above. |
| **F4** — three different edge counts; the true count is five | Structural | **Enumeration RESOLVED; the edge-5 ruling has a false second ground → F15** | §9 `:1042-1088` is the single canonical list of five. Every deferring section checked: §2 `:189-196`, §7's ledger row `:968`, §10 `:1133-1141`, §14 `:1577-1584` — none restates a number of its own, and §10's edge 3 is now in its post-A1b abort form. Edge 5's `js/app.js:459` citation verified exact. |
| **F5** — §12 misses three shipped sites | Structural | **RESOLVED; one span defect in the fourth item → F17** | Items 34 (`js/nav.js:151`), 35 (`js/app.js:1343`), 37 (`css/app.css:508-509`) — all three citations verified byte-exact at HEAD. Step 17 `:1468` is re-scoped to the claims and names its own phrase-scrub blind spot. Item 36 (the sweep comment) is the added fourth. |
| **F6** — §6a's census undercounts and omits a file | Structural | **RESOLVED — every assertion citation resolves exactly** | §6a `:925-941`: "two registered mutants" and "three shipped cells across two files". The finalize row names all four turning assertions. Verified line-for-line: the cell is `:171-221`; `:186-188` and `:202-204` are the two fixture-sanity assertions; `rec` is installed at `:206`, after the abort; `:211-215` survives; `:216` is `rec.calls === 1`; `:218` is the `deepEqual`. Both mutant anchor strings match `tools/mutate.mjs:916` and `:933` byte-for-byte. §13 step 7 `:1458` carries all four plus the recorder-placement instruction. |
| F7 — "passes vacuously" backwards | Correction | **Resolved** | §5.3.4 `:633-638` states the opposite explicitly and names why it mattered. |
| F8 — stale citations, two-line vs seven-line comment | Correction | **Resolved** | Item 26 → `js/nav.js:78` (exact); item 27 → the seven-line `js/nav.js:71-77` (exact, verified as 71 through 77); §5.3.1 `:520-523` carries the vintage note. |
| F9 — popstate is a fourth writer | Weak | **Resolved** | §15 `:1744-1753`, `js/app.js:1319` exact. W44's exclusions re-verified true: `:2658` and `:3258` both test `d.v !== 'nowplaying'`; `:3165` admits only browse descriptors. |
| F10 — R-H omits the aborted-swipe cost | Weak | **Added as hazard 3 — and its cost claim is wrong → F16** | §15 `:1683-1700`, step 9 `:1460`. |
| F11 — `showAppView`'s sweep proof is sound | Note | **Recorded verified-closed and not re-opened** | §5.3.5 `:662-670` and step 10 `:1461`. Not re-raised here, per the standing constraint. |
| F12 — the second pre-existing residue | Note | **Folded** | §5.3 `:512-518`. |
| F13 — r2 covers A1b's new path; no second window | Note | **Folded, with one citation regression → F18** | §5.3.6 `:686-701`. |

## Defining records

| Record | Standing | Reconciliation |
|---|---|---|
| `Claude/Decisions/DecisionLog.md:1147-1167` — the USER DECISION | **Governing** | **AGREE with the plan as folded.** Round 1's two conflicts are closed. `:1162-1163` ("Thirteen further NP differences are load-bearing, itemised with citations in the probe") verified verbatim; the plan no longer claims the exemption was absent from the set it incorporates. `:1167` ("do not cite its background as its distinguishing property") verified verbatim; the plan no longer does. The entry is correctly **not rewritten** — `:1157-1158`'s stale sentence and `:1162`'s stale number are the user's to amend, and the plan says so. |
| `Claude/Decisions/DecisionLog.md:1195-1213` — the supersession pointer, new in the fold | Records pointer | **AGREE, and it is a correctly built record.** Span verified exact. It states the supersession, names the two stale sentences of the ratified entry without editing them, and states that the decision's conclusion is unchanged. Every citation inside it resolves: `js/nav.js:81`, `js/nav.js:78-80`, `css/app.css:44`, `css/app.css:510`, `test/page-bg-single-painter.test.js:28`. |
| `Claude/Linnaeus/PROBE-np-uniqueness.md` §9.1 | Derived fact sheet, gates this design | **AGREE, and the proof is stronger than the plan needed.** §9.1.a's enumeration is complete — I re-ran it independently over `js/*.js` and reached the same two sites. §9.1.b's three-lines-earlier ordering is exact at HEAD (`js/nav.js:78-80` then `:81`). §9.1.f's disagreement-with-the-comment finding is true: the comment at `js/nav.js:71-77` attributes `#browse`'s warmth to the settings-loop guard, and `#browse`'s toggle is `js/nav.js:69`, inside the *other* guard. |
| Same record, §9.3 — the count | Derived fact | **AGREE. The arithmetic checks out against §9.3 rather than against the plan's restatement of it.** §9.3's enumerated list (`PROBE:383-384`) is 24 distinct fact numbers and includes 1.9, excludes 4.2. §8's grouped list is 16 groups summing to 24 (1+1+2+1+1+2+1+1+1+1+1+1+1+1+1+7). The ratified set is the same list with 1.9 replaced by 4.2 — also 24 — so 23 are common. **Both of the plan's counts are correct and the "they cancel" claim is true.** One wobble in the plan's restatement is filed as F20. |
| `Claude/Campaigns/one-screen-type-a1b.json` — the plan-review gate | Live mechanical gate, cited by the plan as the reason A1b cannot be built | **CONFLICT with §13 step 1, executed.** The manifest's verdict glob cannot match a re-review artifact, so step 1 has no reachable discharge. F14. |
| `js/nav.js:71-77`, `js/nav.js:151`, `js/app.js:1343`, `css/app.css:508-509` — the shipped comments A1b falsifies | Subordinate source comments | **AGREE with §12 as folded.** All four verified byte-exact at HEAD and all four are listed (items 27, 34, 35, 37). |
| `js/app.js:494-497` — the sweep's justifying comment | Subordinate source comment | **GAP.** §12 item 36 and probe §9.1.g both cite the comment as `494-496`; it runs to `:497`, and `:496-497` is the still-true exception clause. F17. |
| `test/one-screen-type-finalize.test.js:171-221`, `test/one-screen-type.test.js:195-216` | Live shipped cells | **CONFLICT by design, and now correctly listed.** Round 1's F6 omission is closed. |

## Value and ownership ledger — the A1b relocation, re-driven at `57e503d`

The fold moved no boundary. This ledger is round 1's, re-verified against HEAD, with the citations
the fold corrected now confirmed rather than asserted. **No new field is added, none changes owner,
and A1b remains pure subtraction of two conditions** — the relocation is of a *responsibility*.

| Crossing | Class | Producer | Consumer | Owner after A1b | Lifetime | Verification |
|---|---|---|---|---|---|---|
| `#home` `parked` class under NP | state | `setView`'s park block, `js/nav.js:52` (guard at `:51` deleted) | the compositor; `js/app.js:1349`'s pull-refresh arm test | `Nav.setView` | NP entry → next non-NP `applyScreen` | NPPARKS |
| `#browse` `hidden` class under NP | state | `setView`, `js/nav.js:69` (guard at `:51` deleted) | the compositor; `Browse.activeEntry` | `Nav.setView` | NP entry → next browse `applyScreen` | NPPARKS |
| six settings screens' `hidden` class under NP | state | the six-way loop, `js/nav.js:79` (guard at `:78` deleted) | the compositor | `Nav.setView` | NP entry → next settings `applyScreen` | NPPARKS |
| `d.browseWillHide` firing on the shown→hidden edge | ordering | `js/nav.js:55-60` | `Browse.deactivate()` (wired at **`js/app.js:2890`**, not `:2870` — F19) | `Nav.setView` | one call per browse exit, across five edges (§9) | NPPARKS + PEERFINALIZE — **complete as specified; edge 5's ruling is F15** |
| `hidden` removed from NP mid-gesture | state | `env.renderDestination`, `js/app.js:551` | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE |
| `#home` un-parked mid-gesture | state | `env.renderDestination` home branch, `js/app.js:547` | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE |
| `#browse` un-hidden **and re-rendered** mid-gesture | state + cost | `showAppView`, `js/app.js:512` (`Browse.render` on the same line) | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE — **and this is where F16's cost claim goes wrong: this crossing is paid today** |
| stale settings sweep | state | `showAppView`, `js/app.js:498` | the six settings elements | `js/app.js` `showAppView` | per gesture render | KEPT, unaffected (round 1 F11, verified-closed) |
| `document.body.classList` token `np-locked` | state | `js/nav.js:82` toggle; removed at `js/app.js:549` and `:586` | the navbar button/pill swap rule | `Nav.setView` | **UNTOUCHED by A1b** — named because it crosses a declared range | NPUNTOUCHED fixture sanity |
| `d.gestureOwnsMovers()` suppression of the pending filmstrip reconcile | ordering | `js/app.js:250` | `js/nav.js:195` | `js/app.js` session | go-live → `sessionDone` (**`js/app.js:257`** — F18) | FILMSTRIPDRAG (shipped `.284`) |

**Injected/session fields crossing each declared range** (adapter obligation, per range):
`js/nav.js:45-90` — `d.byId`, `d.browseWillHide`, `d.isSignedIn`, `d.updatePlayerUI`; module-scope `npOpen`; `document.body.classList` token `np-locked` at `:82`.
`js/nav.js:128-156` — `d.byId`, `d.renderScreen`, `d.renderNowPlaying`, `d.renderBrowse`.
`js/nav.js:192-214` — `d.gestureOwnsMovers`, `d.currentDesc`, `d.byId` (via `overlayEl`).
`js/app.js:440-465` — `d`/`session` as `cur`, `cur.live`, `cur.finPlan.abortRender`, `cur.scroll0`.
`js/app.js:490-513` — `d.from.v` (the outgoing-screen spare at `:498`).
`js/app.js:530-554` — `d.live`, `d.dir`, `d.w`, `d.movers`, `d.ghostY`, `d.animSync`, `d.animRes`; `document.body.classList` token `np-locked` removed at `:549`.
`js/app.js:810-820` — `cur.movers`, `cur.dir`, `cur.dest`, `cur.newNav`, `cur.from.v`, `cur.id`, `cur.tgt`.
`js/app.js:1240-1262` — `cur.finPlan.abortRender`, `cur.scroll0`.

No `removeAttribute('data-*')` pre-mount effect exists in any declared range, and no
`@crossing:`/`@effect:` annotation appears in one.

---

## Findings

### F14 — The plan-review gate the fold cites as the mechanism cannot read a re-review, so step 1 has no reachable discharge
**Severity: Structural. Nature: defect.**

**Executed, not read.** `node tools/campaign/stage-gate-check.mjs Claude/Campaigns/one-screen-type-a1b.json` at `57e503d`:

```
✗ plan-review [charpy] — FAIL — filed verdict(s) [TEMPER] not in [FORGE]
```

That verdict is round 1's, and it is the only verdict the gate can ever read. The manifest declares

```
"verdictArtifactGlob": "Claude/Charpy/PLAN-one-screen-type-A1b-charpy.md"
```

with no wildcard. `globFiles` (`tools/campaign/stage-gate-check.mjs:27-29`) compiles the basename to
`^PLAN-one-screen-type-A1b-charpy\.md$`, which does not match `…-charpy-r2.md`. The tool carries
purpose-built round-of-record logic for exactly this shape — `roundOf` and `artifactsOfRecord`
(`:102-113`), whose own comment records that it exists because "r1 FORGE followed by r2 SCRAP reads
as cleared" — and a glob with no `*` is the one shape that never reaches it.

**The consequence is not that the gate is unsafe. It is that it is unclearable.** The plan states at
`:41-44` that "A1b cannot be built on a TEMPER, and that is mechanized", and §13 step 1 (`:1446`)
states that "step 8 does not open until that verdict is filed". A FORGE filed in the file the review
request names cannot be filed anywhere the gate will look. The two survivable readings are both bad:
either step 8 never opens, or someone reaches for the round-1 casebook and edits its verdict — which
is the record of what was found and must not move.

This is the residue of round 1's F1. The record half is genuinely fixed; the mechanical half was
built one character short.

**Plan text to change.** The manifest's `plan-review` glob becomes
`Claude/Charpy/PLAN-one-screen-type-A1b-charpy*.md`, which engages `artifactsOfRecord` and makes the
highest `-rN` the verdict of record. **Invariant, not prescription:** the gate must read the *latest*
round of this review and no earlier one; the wildcard is the cheap form and the tool already
implements the rest. Worth checking in the same pass whether any other manifest declares a
no-wildcard Charpy glob against a review that could go to a second round.

### F15 — Edge 5's "deliberately uncovered" ruling has two grounds and the second is false; its named re-open condition therefore points at the wrong artifact
**Severity: Structural. Nature: defect.**

The fold's answer to round 1's F4 is a ruling, and the plan is emphatic that it is one: §14 `:1583`
— "**This is a plan ruling, not a bare cell**" — and §9 `:1079` — "the reason is recorded so step 16
reads it as a ruling." Step 16 audits the suite against it. So the ruling's grounds are load-bearing
text, and I drove both.

**Ground A holds.** §9 `:1080-1082`: "the contract on edge 5 is byte-identical to edge 4's — the same
`setView('nowplaying')` body, the same `js/nav.js:55` test, the same hook call with `#browse`
observed un-hidden". Verified: `js/app.js:459`'s `applyScreen(currentDesc(), …)` with
`currentDesc().v === 'nowplaying'` reaches `js/nav.js:152`, which calls the same `setView` body.
`applyScreen`'s own preamble differs (`resetSwipeStyles` at `:132`, and edge 5 passes
`keepGhosts: true` and a computed `render`), and none of it touches the park/hide block at
`js/nav.js:51-69`. **`NPPARKS` proves the behaviour edge 5 reaches. Ground A alone carries the
ruling, and I am not asking for a cell.**

**Ground B is false, in three separate ways.** §9 `:1083-1085`: "an extra firing is harmless:
`Browse.deactivate()` is idempotent (`js/browse.js:332` no-ops when `activeEntry()` or `_vctl` is
absent)."

1. **The no-op clause does not apply on edge 5's own reachability scenario.** `js/browse.js:332` is
   `function deactivate() { const cur = activeEntry(); if (cur && cur.el._vctl) cur.el._vctl.deactivate(); }`,
   and `activeEntry()` (`js/browse.js:208-211`) returns the first page whose element is neither
   `hidden` nor `parked` — a property of the *page*, not of `#browse`. The scenario §9 `:1070-1072`
   gives as the edge's reachability proof is "an `NP→files` gesture un-hides `#browse` at
   `js/app.js:512`" — and that same line runs `Browse.render(desc)`, which activates a page through
   `showPage()`. So `activeEntry()` is truthy and `_vctl` is present, and the call reaches the real
   controller. The stated no-op never fires on the path the ruling is about.
2. **It is not an extra firing.** On edge 5 the hook fires once, and it is the first and correct
   firing on that path. A duplicate is impossible by construction, because `js/nav.js:55`'s
   shown→hidden test is itself the guard: a second `setView('nowplaying')` finds `#browse` already
   carrying `hidden` and does not fire. Ground B answers a question the edge test makes unreachable.
3. **The idempotence that does protect the edge lives somewhere else, and `setView` does not own
   it.** `js/virtuallist.js:251-262`'s `deactivate()` opens with
   `if (state !== 'active' && state !== 'suspended') return;` — *that* is the real idempotence, one
   layer below `js/browse.js:332`. The ruling's re-open condition (§9 `:1086-1088`, restated at §14
   `:1583-1584`) reads: "if `setView`'s NP path ever gains an effect that is *not* idempotent, this
   edge stops being free." **A change to `js/virtuallist.js`'s state guard would invalidate the
   ruling without touching `setView`'s NP path at all**, and nothing would fire.

**Why this is Structural rather than a note.** The ruling's outcome survives, so no cell is owed and
the sequencing does not move. What does not survive is the *record*: step 16 is instructed to read
these grounds as settled, and the coverage auditor will be auditing a bare cell against a stated
reason that is wrong about the mechanism and a re-open trigger aimed at the wrong file. Round 1's
lesson was that a plan's load-bearing sentence can be false while its conclusion is right; this is
the same shape, one section over.

**Plan text to change.** §9 `:1079-1088` and §14 `:1580-1584`. Ground A stands as written and is
sufficient — say so, and say that it is sufficient alone. Either drop ground B or restate it
correctly: the extra-firing question does not arise (the shown→hidden edge test prevents it), and
where controller idempotence *is* relied on the citation is `js/virtuallist.js:251-262`, not
`js/browse.js:332`. Re-aim the re-open condition at what actually decides it — the invariant is that
edge 5 stays uncovered only while its `setView` body is the same body `NPPARKS` drives; the moment
edge 5's path acquires an effect edge 4's does not have, it owes a cell.

### F16 — R-H hazard 3's cost claim is overstated: the `Browse.render` is paid today, and the true coupling between hazards 1 and 3 is the sharper fact the section misses
**Severity: Structural. Nature: defect.**

**This error is mine before it is the plan's.** Round 1's F10 wrote "every aborted NP-back swipe now
pays a full render plus a controller teardown … Today the abort leaves `#browse` un-hidden and
active and pays neither." The fold transcribed it faithfully into §15 R-H hazard 3. It is wrong, and
a reviewer's proposal is held to every standard imposed on the plan.

**What the section says.** `:1683` heading — "A full render plus a controller teardown on every
ABORTED NP-back swipe, **where today there is neither**." `:1691-1693` — "So every aborted NP-back
swipe now pays **a full Browse render plus a virtual-controller teardown**."

**What source says.** The render is not new. `env.renderDestination` (`js/app.js:541-542`) dispatches
`host === 'browse-host'` to `showAppView(dest, true)` with `render` hard-coded `true`, and
`js/app.js:512` runs `Browse.render(desc)`. That happens **mid-drag, on every NP-back drag, today,
whether it aborts or commits**. A1b does not reach it — A1b's whole product change is two deleted
conditions inside `setView`, and `renderDestination` never calls `setView`. The section's own middle
sentence gets this right (`:1687` — "**Today the abort stops there**"), which is the internal
contradiction: the heading and the summary say the render is new, the body says it is not.

**What A1b actually adds, and it is worth stating because it is more useful than what is written.**
A1b adds the teardown and the hide. The teardown is `d.browseWillHide()` → `Browse.deactivate()` →
`js/virtuallist.js:251-262`, whose last act is `dematerialize()` — the comment on that line is
"hidden pages hold ~0 realized rows". So the new cost is not a second render; it is that **the render
that was already being paid becomes more expensive, because the previous abort tore down and
dematerialized the rows it must now rebuild.** That makes hazards 1 and 3 one mechanism seen twice
(dropped decoded covers, dropped realized rows), which is why the same `#browse.parked` fallback
closes both — a fact the section already asserts (`:1697-1699`) without having derived it.

**Why this is Structural.** R-H is the plan's honest-cost section, step 9 (`:1460`) sends the user to
drive exactly this path, and the plan tells them a repeated half-swipe now pays a render it did not
pay before. If they feel it, the stated mechanism mis-attributes half the cost; if they do not, a
hazard has been named that was never new. Either way the reading is spent on a wrong model, and the
`#browse.parked` fallback is weighed against an inflated number.

**Plan text to change.** §15 R-H hazard 3's heading and its `:1691-1693` summary. The corrected claim:
the mid-drag `Browse.render` is unchanged by A1b; what A1b adds on every aborted NP-back swipe is a
`Browse.deactivate()` teardown plus the hide, and the teardown's `dematerialize()` is what makes the
*next* swipe's already-paid render rebuild rows it would otherwise have kept. Step 9's question at
`:1460` should ask about the repeated half-swipe on a long list, which is the right question either
way.

### F17 — §12 item 36 truncates the comment it re-writes by one line, stranding a clause with no antecedent
**Severity: Weak. Nature: defect.**

The sweep's justifying comment at HEAD runs four lines:

```
494  // Hide a STALE settings overlay lurking over the base view (NP opened from
495  // Options → an NP→chapter-list swipe would show it through). But NOT the one
496  // that's the OUTGOING screen of THIS swipe (back from Options → tracks): there
497  // it's the mover that must slide out, so hiding it makes it vanish mid-drag.
498  for (const s of ['options', ...SETTINGS_SUBS]) if (!d || d.from.v !== s) $(s).classList.add('hidden');
```

§12 item 36 (`:1395`) cites it as `js/app.js:494-496` and instructs that it be "rewritten to name the
`overlayFilmstrip` window". `PROBE-np-uniqueness.md` §9.1.g carries the same span.

**The false part is `:494-495`** — the "NP opened from Options" scenario A1b retires. **`:496-497` is
the still-true exception clause** explaining `d.from.v !== s`, and it is one sentence spanning both
lines. A builder rewriting `494-496` leaves `:497` behind as "`// it's the mover that must slide out,
so hiding it makes it vanish mid-drag.`" — a dangling clause whose subject was just deleted.

This is round 1's F8 class returning on a new site, and it collides with a certification the fold
newly made: §12's vintage note (`:1230-1231`) states that items 34-37 "are re-pointed to HEAD
`02b388f` and are **executable as written**." Item 36 is not.

**Plan text to change.** Item 36's span, and probe §9.1.g's. Either `494-495` (replace only the
retired scenario, keep the exception clause intact) or `494-497` (rewrite the whole comment). The
invariant is that no fragment of the deleted sentence survives and no true clause is orphaned; which
span delivers it is the planner's call.

### F18 — §5.3.6 cites `sessionDone` at `js/app.js:250`; it is `:257`, and `:250` is a different function
**Severity: Weak. Nature: defect.**

§5.3.6 `:690-691`: "`session` untouched by `end()`'s `const cur = d; d = null`, **nulled only by
`sessionDone` (`js/app.js:250`)** from finalize or the reveal drop."

At HEAD `js/app.js:250` is `const gestureOwnsMovers = () => !!session && session.live;` and
`js/app.js:257` is `const sessionDone = (s) => { if (session === s) session = null; };`. The same
paragraph correctly cites `:250` for `gestureOwnsMovers` three lines earlier, so one line number is
carrying two functions.

**This is a fold regression, and that is what makes it worth filing rather than a typo.** Round 1's
F13 had it right — it cited `sessionDone` at `:257` — and §5.3.6 is the section that records F13's
verification, under the heading "**VERIFIED at the plan review** and recorded so they are not
re-derived." A verification the reviewer supplied has been transcribed with a citation the reviewer
did not make and which is false. §5.3's own preamble (`:520-521`) states that every `file:line` in
§5.3 is against HEAD, so the vintage note does not cover it (`js/app.js` is unchanged between
`02b388f` and `57e503d`).

**Plan text to change.** §5.3.6's `sessionDone` citation → `js/app.js:257`.

### F19 — Citation-sweep residue: three sites the fold's wider sweep did not reach
**Severity: Weak. Nature: defect.**

The fold claims a wider citation sweep and the five corrections it names are all right
(`js/app.js:483→:498`, `:532→:547`, `:497→:512`, `:536→:551`, `js/nav.js:180→:200` — each verified
exact). Three others did not move.

1. **`d.browseWillHide`'s wiring is `js/app.js:2890`, not `js/app.js:2870`.** The plan cites `:2870`
   twice — §3.5 (`:241-242`) and §9 (`:1041-1042`). At HEAD `:2890` is
   `currentDesc, browseWillHide: () => Browse.deactivate(),`; `:2870` is a `mediaSession` action
   handler. §9 is the section the fold rewrote as the plan's single canonical enumeration of this
   hook's edges, so the wiring citation inside it is the one a reader checks first.
2. **`.nowplaying`'s `inset: 0` and `z-index: 60` are `css/app.css:505`, not `:506`.** §12's
   "Explicitly NOT deleted" bullet (`:1423`) cites `:506`, in the same sentence as a correctly
   re-pointed `:510`. At HEAD `:505` carries `position: fixed; inset: 0; … z-index: 60;` and `:506`
   carries `overscroll-behavior: none`. §15 R-A (`:1596`) has the same value. This is a pre-A1
   number surviving inside the ⛔ standing-constraint bullet — mixed vintage in one sentence, which
   is the shape §12's own vintage note exists to prevent. Blast radius is small because
   `NPUNTOUCHED`'s source-scan cell reads the rule body rather than a line.
3. **The settings entry-time scroll reset is `js/nav.js:148`, not `:147`.** §2's `state_transfer`
   bullet (`:183`) and §4 DEFERRED (`:302`) both cite `:147`, which at HEAD is
   `if (render) d.renderScreen(desc.v);`. The plan's *other* uses of `:147` — §5.3.2 `:586` and §9
   `:1097` for the render dispatch — are correct, which is what makes the two scroll-reset uses
   detectable.

**Plan text to change.** The five citations above. None of them is an A1b edit site, so none of them
can send a builder to the wrong line at step 8; they are filed because §12's vintage note certifies a
level of citation hygiene this plan is otherwise now meeting.

### F20 — §5's arithmetic paragraph under-claims what is untouched
**Severity: Note. Nature: defect.**

§5 `:341-348` is the paragraph whose whole job is to make "NP keeps all 24" and "A1b deletes 4.2"
stop looking contradictory, and it does that correctly — I checked its three numbers against probe
§9.3's enumerated list rather than against the plan, and all three hold. One sentence is looser than
the rest: "**23 members are common to both and are untouched by every stage.**"

24 members are untouched. The HEAD set is 24 (excluding 4.2, including 1.9), A1b touches none of
them, and 1.9 — the member not common to both sets — is the background, which S4 protects most
explicitly of all. Stating the untouched count as 23 invites the reading that the 24th might move.
The set that is 23 is the *intersection*, which is a different fact.

**Plan text to change.** One clause: 23 members are common to both sets; all 24 of the HEAD set are
untouched by every stage.

### F21 — §2's lifecycle bullet carries a pre-correction phrase that collides with the corrected count
**Severity: Note. Nature: defect.**

§2 `:189-195` states the five edges correctly — three from A1, two from A1b — and then closes: "and
A1b **relocates** the third rather than adding a fourth." The intent is that relocating edge 3
creates no new edge. Placed immediately after "two from A1b (opening NP while Browse is showing;
supersession while NP is the current screen)", "a fourth" reads against edge 4, which A1b does add.
It is a survivor of the wording that was correct when the count was four — D5's in-body residue,
one surface past the numbers the fold corrected.

**Plan text to change.** §2's closing clause: the relocation of edge 3 adds no edge of its own.

### F22 — §6a is inserted inside §6's Stage-B migration list, stranding item 6 and the verification paragraph
**Severity: Note. Nature: defect.**

§6's migration set runs items 1-5 at `:895-921`, then `## 6a` opens at `:923` and runs to `:945`, and
then item **6** (`test/nav.test.js:105`) and the "Verification of the set is by execution" paragraph
appear at `:946-958` — below §6a's heading, table and closing note, but belonging to §6.

**Pre-existing, not fold-introduced** (`git show 35f0005:…` puts the same orphan at its line 736), and
Stage-B-scoped rather than A1b's, which is why it is a Note. It is filed because §6's migration set is
what step 14 executes and the fold's own §6 item 5 (`:915-921`) now cross-references §6a in both
directions, so the two sections are read together and the split is more visible than it was.

**Plan text to change.** Move item 6 and the verification paragraph above `## 6a`, or move `## 6a`
below them.

---

## Coverage — how each blocking finding is verified

| Finding | Verification |
|---|---|
| **F14** | **Mechanical and already executed.** After the manifest's glob is widened, `node tools/campaign/stage-gate-check.mjs Claude/Campaigns/one-screen-type-a1b.json` must report the `plan-review` row against the highest `-rN` artifact rather than the round-1 file. `test/stage-has-manifest.test.js` is the existing home if a standing check is wanted; `artifactsOfRecord` (`tools/campaign/stage-gate-check.mjs:107-113`) already implements the selection, so what is owed is the glob, not new logic. No cell is owed for the plan text. |
| **F15** | **Record check, no cell — and the ruling deliberately stays a ruling.** §9's ground A stands as written; ground B is dropped or restated with `js/virtuallist.js:251-262` as the citation, and the re-open condition is re-aimed at the divergence of edge 5's `setView` path from edge 4's. Step 16 audits against the corrected ruling. The *behaviour* remains covered by `NPPARKS`, which is unchanged — this finding adds no cell and removes none. |
| **F16** | **Record check, then device.** §15 R-H hazard 3's heading and summary are corrected to name the teardown as the new cost and the `dematerialize()` coupling as why the already-paid render gets more expensive; step 9's question is unchanged. The corrected mechanism is verified by reading (`js/app.js:541-542` → `:512`, unreached by A1b; `js/virtuallist.js:262`'s `dematerialize()`), and whether it is *felt* stays device-owed at step 9 — jsdom has neither decode nor row realization, so no cell can settle it and none should be written. |

Non-blocking findings (F17-F22) are corrections to plan, probe and record text, plus one section-order
fix. None gates the build.

---

## Prediction — where this breaks in execution if built as folded

**F14 breaks first, at step 1, and it breaks silently in the worst direction.** The gate fails
closed, so nothing ships wrongly. What happens instead is that a FORGE gets filed, the build does not
open, and the next session looks for the reason. The two ways out of that room are both wrong: widen
the glob (correct, but nobody knows that is the fix without reading
`stage-gate-check.mjs:90-113`), or edit the round-1 casebook's verdict line — which is the record of
what was found, is under a standing no-edit rule, and would leave the project with a Charpy file
whose verdict does not match the review inside it. The cheap fix is one character and it is available
now.

**F15 does not break at the build. It breaks at step 16, and it routes to the wrong seat again.**
That was round 1's F4 prediction and the fold answered it by enumerating the fifth edge — but it
answered the enumeration and left the ruling. The coverage auditor arrives, reads "deliberately
uncovered, on two grounds", checks the second ground against `js/browse.js:332`, finds that
`activeEntry()` is populated on the very scenario §9 names, and now has a bare cell defended by an
argument that does not survive a read. The likely outcome is a cell written for edge 5 that proves
nothing `NPPARKS` does not already prove — cost without a defect class behind it, which is exactly
what the ruling was right to refuse.

**F16 breaks at step 9, on the device, and it breaks as a mis-attribution rather than a defect.** The
user half-swipes back from NP repeatedly on a long Books list, as the step instructs. If it feels
slow, the plan says the cause is a render A1b added, and the fallback gets evaluated against that.
The real cause is that the teardown dematerialized the rows the (unchanged) render must rebuild — so
the fallback is more likely to work than the plan's model predicts, and a reading of "no, that is a
render, we cannot avoid it" would retire the right fix for the wrong reason. The device gate is the
one instrument that cannot be re-run cheaply, which is why an honest-cost section is worth getting
exactly right before it runs.

**What will not break, and what the fold genuinely earned.** The mechanism. I re-drove the guard
deletion at HEAD — every path that opens Now Playing, every path that closes it, and the abort
reconcile — and it is complete on all of them. The record path F2 demanded is now walkable end to
end, and its load-bearing step is a property of one function body rather than a caller enumeration:
`hidden` is added to `#nowplaying` in exactly one place, and the same synchronous `setView` body
clears it from the destination three lines earlier. I verified that independently rather than reading
the probe's account of it, and it holds. The count is right against §9.3's enumeration and not merely
against the plan's restatement of it. The casualty census is right assertion-by-assertion. **Six
Structural findings went in and six came out, which is the outcome a temper is for.** What is left is
one manifest glob and three sentences.
