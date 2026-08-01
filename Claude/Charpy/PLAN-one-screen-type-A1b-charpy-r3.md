# Plan review, round 3 — PLAN-one-screen-type.md, Stage A1b ("Now Playing parks the page beneath it")

Type: plan-review
Plan: `Claude/Plans/PLAN-one-screen-type.md` — the round-2 fold, commit `23220ee`
Round: 3 (conformance re-review of the fold of round 2's three Structural and six Weak/Note findings)
Round 1: `Claude/Charpy/PLAN-one-screen-type-A1b-charpy.md`, commit `35f0005` — **TEMPER**
Round 2: `Claude/Charpy/PLAN-one-screen-type-A1b-charpy-r2.md`, commit `607d8b9` — **TEMPER**
Reviewed at: HEAD `de84349`, build `2026-07-31.288`, tree clean, `npm test` 822 pass / 0 fail / 1 skip
Date: 2026-07-31

*(`de84349` changed `Claude/Zelda/Board.md` only. The plan text under review is byte-identical to `23220ee`.)*

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":["js/nav.js:45-90","js/nav.js:128-156","js/nav.js:192-214","js/app.js:440-465","js/app.js:490-513","js/app.js:530-554","js/app.js:810-820","js/app.js:1240-1262"],"callee_ranges":[]} -->

## Applicability

- **defining_records: true** — round 2's blocking finding was a claim about a *live mechanical* record
  (the campaign manifest), and the fold's answer is that the record was repaired by tooling rather
  than by plan text. Reconciling the manifest, the executed gate, the plan's account of both, and the
  board is this round's first duty.
- **boundary_relocation: true** — unchanged across all three rounds and re-verified at HEAD: occlusion
  of whatever sits beneath Now Playing relocates from `.nowplaying`'s own opaque full-bleed rule to
  `setView`'s park-and-hide swap. The declared ranges are round 1's, re-driven at `de84349`. The
  round-2 fold moved no boundary and added no value. Ledger below.
- **callee_replacement: false** — the fold changed no callee and introduced no indirection. A1b is
  still the deletion of two conditions (`js/nav.js:51`, `js/nav.js:78`). No `callee_ranges` are owed.
- **contract_shape: false** — the fold changed no returned key and no value domain. Re-confirmed at
  HEAD: `docs/swipe-model.generated.txt` and `docs/transition-matrix.generated.txt` carry no
  park/hide/`npOpen` statement, and `test/fixtures/swipe-plan-spec.mjs` is untouched.

## Verdict

**FORGE** — all nine round-2 findings are resolved, every claim the fold newly asserted resolves
against source, and no Structural defect remains. Build it.

**The three Structural findings are closed, and I checked each against the thing itself rather than
against the fold's account of it.**

**F14 is closed by execution, not by reading.** I ran `globFiles` and `artifactsOfRecord` directly
against HEAD: the widened glob matches both rounds, `artifactsOfRecord` returns `…-charpy-r2.md`
alone, and the gate reports the `plan-review` row against round 2's TEMPER. The selection logic is
`tools/campaign/stage-gate-check.mjs:108-113`, exactly as the plan cites it, and the plan's
parenthetical about an unsuffixed artifact being the superseded original matches the code's own
comment at `:112`. **This round is the first time the gate can read the verdict of record** — when
this file lands, `artifactsOfRecord` selects `-r3` and the gate reads FORGE.

**F15's correction is complete in all four places, which is the check that mattered** — a partial fix
here would have been the exact shape of round 1's F4. §7's ledger row (`:1004`), §9 (`:1113-1140`),
§10 (`:1189-1196`) and §14 (`:1647-1655`) now all rest the edge-5 ruling on byte-identity alone; none
of them carries the extra-firing ground; and the two surfaces that still mention `js/browse.js:332`
describe it correctly, as a no-op that does *not* apply on the edge's own reachability scenario.
`applyScreen`'s differing preamble is named and shown not to reach the park/hide block — verified:
`resetSwipeStyles` (`js/nav.js:114-120`) writes only `transform`/`transition`/`willChange`/`zIndex`
and touches no class, so `js/nav.js:51-69` is untouched on that path. The re-open condition is
re-aimed at edge 5's `setView` body diverging from edge 4's, which is the artifact that actually
decides it.

**F16's inversion is right, and the fold derived it rather than transcribing it.** `js/app.js:541-542`
hard-codes `render` true into `showAppView`, `js/app.js:512` un-hides `#browse` and runs
`Browse.render(desc)` on the same line, and `renderDestination` never calls `setView` — so the render
is paid today and A1b does not reach it. `js/virtuallist.js:262`'s `dematerialize()` is the last
statement of `deactivate()`, with the comment the plan quotes. Hazards 1 and 3 are correctly stated as
one mechanism, and step 9's device question now asks about the compounding cost, which is the question
the corrected model actually poses.

**All six Weak/Note findings are folded, and I swept for residuals of each corrected class rather than
spot-checking the named sites.** No `2870`, no `css/app.css:506`, no `js/app.js:250`-as-`sessionDone`,
no scroll-reset-at-`js/nav.js:147` survives anywhere in the plan; the two surviving `js/nav.js:147`
citations are the render dispatch, which is correct at HEAD. §6a's placement is fixed and the moved
text lands cleanly.

**§13 step 1a is the right structural answer to the pattern round 2 named**, and it earned its place
the same turn it was written — applying it caught two off-by-one citations (`js/nav.js:114-120`,
`:132`, and §5.2's `:141`/`:146`) that no review had filed. All four of those resolve exactly at HEAD.

**Four new findings, none blocking: two Weak, two Note.** Three are sentence-level; one is a records
staleness that arose *after* the fold and is not a fold defect. None of them touches the mechanism,
none changes a cell, and none can send the builder to a wrong line at step 8. **They are filed as
tidy-ups, not as a gate.** The distance from here to a built stage is the build.

## Round-2 disposition

| Round 2 | Severity | Disposition | The evidence that proves it |
|---|---|---|---|
| **F14** — the plan-review gate cannot read a re-review, so step 1 has no reachable discharge | Structural | **RESOLVED by tooling, verified by execution — not by reading the plan's account** | `Claude/Campaigns/one-screen-type-a1b.json`'s `plan-review` glob is now `Claude/Charpy/PLAN-one-screen-type-A1b-charpy*.md`. Executed against HEAD: `globFiles` matches `-r2.md` and the unsuffixed original; `artifactsOfRecord` returns `-r2.md` alone; `verdictsIn` returns `TEMPER`. `roundOf`/`artifactsOfRecord` are at `:102-113`, and `:112`'s comment states the unsuffixed-is-superseded rule the plan cites. The plan records the closure at `:47-58` and correctly assigns it **no** §13 step and **no** owner. |
| **F15** — edge 5's ruling has a false second ground; its re-open condition points at the wrong artifact | Structural | **RESOLVED in all four places, checked as four separate reads** | §7 ledger `:1004` — "deliberately uncovered **because it reaches the same setView body NPPARKS already drives**"; no idempotence term. §9 `:1113-1126` — "**One fact decides it, and it is sufficient alone**", then an explicit "What this ruling does NOT rest on" paragraph covering **both** counts (no extra firing to excuse; the `js/browse.js:332` no-op does not apply here). §10 `:1189-1196` — re-attributes controller idempotence to `js/virtuallist.js:251-262` and says `setView` does not own it. §14 `:1647-1655` — single ground, and states outright that the ruling does not rest on an extra firing being harmless. **Every source claim re-derived:** `js/browse.js:208-211` (`activeEntry` tests the *page* for `hidden`/`parked`), `js/browse.js:332`, `js/virtuallist.js:255`'s state guard, `js/app.js:512`, `js/app.js:459`, `js/nav.js:55`, `js/nav.js:132`. All exact. |
| **F16** — R-H hazard 3's cost claim is overstated; the render is paid today | Structural | **RESOLVED, and inverted rather than softened** | §15 R-H hazard 3 (`:1754-1785`) now heads with the teardown, carries an explicit correction naming that an earlier revision said the render was new, and derives the mechanism: `js/app.js:541-542` → `:512` unreached by A1b; `js/nav.js:60` teardown + `:69` hide are what A1b adds; `js/virtuallist.js:262`'s `dematerialize()` is why the *next* render rebuilds rows. Hazards 1 and 3 stated as one mechanism — both `#browse` going `display:none` — which is why one fallback closes both. Step 9 (`:1529`) re-aimed at the repeated half-swipe and states the cost is compounding, not first-pass. |
| **F17** — §12 item 36 truncates the comment by one line | Weak | **RESOLVED, with the invariant stated and the choice left to the builder** | Item 36 (`:1457-1468`) is now `js/app.js:494-497`, states the comment is four lines and only the first two false, quotes the `:496-497` exception clause, and gives the invariant ("no fragment of the retired sentence survives and no true clause is orphaned"). Step 8 (`:1528`) carries the same span and the same clause. The probe's identical truncation is named as **owed to the deriver, not fixed by this plan** — correct ownership. Verified at HEAD: `:494-497` is the four-line comment; `:498` is the sweep line. |
| **F18** — `sessionDone` cited at `js/app.js:250` | Weak | **RESOLVED at both sites** | §5.3.6 `:727` and §5.4's table note `:800` both read `js/app.js:257`. At HEAD `:250` is `gestureOwnsMovers` and `:257` is `sessionDone`; the plan's three remaining `:250` citations are all `gestureOwnsMovers`, which is correct. |
| **F19** — three citation-sweep residues | Weak | **RESOLVED, all five sites; swept for survivors rather than spot-checked** | `browseWillHide` → `js/app.js:2890` at §3.5 (`:275`) and §9 (`:1077`); a search for `2870` returns nothing anywhere in the plan. `.nowplaying`'s `inset`/`z-index` → `css/app.css:505` at §12 (`:1491`) and §15 R-A (`:1667`); a search for `app.css:506` returns nothing. Settings scroll reset → `js/nav.js:148` at §2 (`:214`) and §4 DEFERRED (`:336`), with the line quoted inline; the two surviving `js/nav.js:147` citations (`:621`, `:1153`) are the render dispatch and are correct. All verified byte-exact at HEAD. |
| **F20** — §5's arithmetic under-claims what is untouched | Note | **RESOLVED** | `:376-380`: "23 members are common to both sets — that is the intersection — and all 24 of the HEAD set are untouched by every stage", with 1.9 named and the closing clause "the number that is 23 is a fact about the overlap, not about what moves." Exactly the distinction. |
| **F21** — §2's pre-correction "a fourth" clause | Note | **RESOLVED** | `:224-229`: "A1b relocates the third rather than adding an edge of its own on that path — the relocation moves *when* edge 3 fires, it does not raise the count", plus a pointer to §9 as the canonical list. The ambiguous "a fourth" is gone. |
| **F22** — §6a stranded item 6 and the verification paragraph | Note | **RESOLVED** | Item 6 (`:958-959`) and the verification + "Not implicated" paragraphs (`:961-970`) now sit above `## 6a` (`:972`). §6a runs `:972-994` and closes into §7 at `:996`. Nothing else moved and nothing new is stranded. |

## Defining records

| Record | Standing | Reconciliation |
|---|---|---|
| `Claude/Campaigns/one-screen-type-a1b.json` — the A1b gate manifest | **Live mechanical gate; the record round 2 blocked on** | **AGREE, executed.** The `plan-review` glob is widened; `artifactsOfRecord` selects the highest round; the gate reads round 2's TEMPER and fails, which is the gate working. The plan's account of the repair at `:47-58` is accurate in every particular including the line span `:108-113`. The manifest's "NOW PLAYING STAYS UNIQUE" and "do not re-open the sweep" constraints are unchanged and the plan honours both. |
| `tools/campaign/stage-gate-check.mjs:102-113` | Gate implementation | **AGREE.** `roundOf` matches a numeric round suffix; `artifactsOfRecord` returns only the maximum round when any round suffix is present. **A consequence worth stating: this file, once landed, becomes the sole verdict of record** and rounds 1 and 2 stop being read by the gate. That is the intended semantics and it is why round 1's and round 2's casebooks must stay unedited — they remain the record of what was found. |
| `Claude/Decisions/DecisionLog.md:1147-1167` — the USER DECISION | **Governing** | **AGREE, unchanged from round 2.** The plan still does not cite NP's background as its distinguishing property, and still does not rewrite the ratified entry. Its two stale sentences remain with the user; the plan says so and cites the supersession pointer instead. |
| `Claude/Decisions/DecisionLog.md:1195-1213` — the supersession pointer | Records pointer | **AGREE, unchanged and untouched by this fold.** |
| `Claude/Linnaeus/PROBE-np-uniqueness.md` §9.1, §9.3 | Derived fact sheet, gates this design | **AGREE, with one owed correction correctly assigned outward.** §9.1.g's truncated span is the same defect as F17 and is the deriver's to fix; §12 item 36 names it as owed rather than silently correcting another seat's artifact. §9.3's count reconciles with §5's corrected arithmetic. |
| `Claude/Zelda/Board.md`, commit `de84349` — step 6f satisfied | Tactical record, **newer than the fold** | **CONFLICT with the plan's sequencing text, resolved in the board's favour and non-blocking.** The board records step 6f satisfied and states A1b is no longer sequenced behind that gate. The plan still reads OWED at `:38`, `:1528` and `:1564`. F25. Verified the board's own ground: `git diff 01cbaf1 HEAD -- js/ css/` differs only in `js/debug.js`'s build-number constant, so the app behaviour the user read is the shipped A1-fix-r2 predicate. |
| `js/nav.js`, `js/app.js`, `js/browse.js`, `js/virtuallist.js`, `css/app.css` | Source under the plan's claims | **AGREE.** Every citation the fold newly asserted or newly re-worded resolves exactly at HEAD. The two exceptions are F24 (an argument stated more broadly than source supports, ruling unaffected) and F26 (a span the fold did not newly assert). |

## Value and ownership ledger — the A1b relocation, re-driven at `de84349`

The fold moved no boundary and added no value. **A1b remains pure subtraction of two conditions** —
what relocates is a *responsibility*. This ledger is round 1's, re-verified against HEAD source for a
third time, with round 2's corrected citations now confirmed rather than asserted.

| Crossing | Class | Producer | Consumer | Owner after A1b | Lifetime | Verification |
|---|---|---|---|---|---|---|
| `#home` `parked` class under NP | state | `setView`'s park block, `js/nav.js:52` (guard at `:51` deleted) | the compositor; `js/app.js:1349`'s pull-refresh arm test | `Nav.setView` | NP entry → next non-NP `applyScreen` | NPPARKS |
| `#browse` `hidden` class under NP | state | `setView`, `js/nav.js:69` (guard at `:51` deleted) | the compositor; `Browse.activeEntry` | `Nav.setView` | NP entry → next browse `applyScreen` | NPPARKS |
| six settings screens' `hidden` class under NP | state | the six-way loop, `js/nav.js:79` (guard at `:78` deleted) | the compositor | `Nav.setView` | NP entry → next settings `applyScreen` | NPPARKS |
| `d.browseWillHide` firing on the shown→hidden edge | ordering | `js/nav.js:55-60` | `Browse.deactivate()` (wired at `js/app.js:2890`) | `Nav.setView` | one call per browse exit, across five edges (§9) | NPPARKS + PEERFINALIZE; edge 5 ruled deliberately uncovered on byte-identity alone |
| `hidden` removed from NP mid-gesture | state | `env.renderDestination`, `js/app.js:551` | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE |
| `#home` un-parked mid-gesture | state | `env.renderDestination` home branch, `js/app.js:547` | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE |
| `#browse` un-hidden **and re-rendered** mid-gesture | state + cost | `showAppView`, `js/app.js:512` (`Browse.render` on the same line) | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE — **paid today; A1b does not reach it** (F16, resolved) |
| stale settings sweep | state | `showAppView`, `js/app.js:498` | the six settings elements | `js/app.js` `showAppView` | per gesture render | KEPT, unaffected — verified-closed, not re-opened |
| `document.body.classList` token `np-locked` | state | `js/nav.js:82` toggle; removed at `js/app.js:549` and `:586` | the navbar button/pill swap rule | `Nav.setView` | **UNTOUCHED by A1b** — named because it crosses a declared range | NPUNTOUCHED fixture sanity |
| `d.gestureOwnsMovers()` suppression of the pending filmstrip reconcile | ordering | `js/app.js:250` | `js/nav.js:195` | `js/app.js` session | go-live → `sessionDone` (`js/app.js:257`) | FILMSTRIPDRAG (shipped `.284`) |

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

### F23 — Weak, defect: the fold's account of why §13 step 1a exists miscounts its own evidence

Two surfaces carry the same sentence. `:86-89`: "**All three of round 2's new Structural findings sit
in text the *round-1 fold* newly wrote or newly certified**: F15's second ground, F16's cost claim …,
and **F18's citation**." §13 step 1a (`:1515`) repeats it: "All three of round 2's new Structural
findings landed in text the round-1 fold newly wrote or newly certified."

Round 2's three Structural findings were **F14, F15 and F16**. F18 was **Weak**, and the round-2
casebook labels it so. F14 — the actual third of the three — did not sit in plan text at all; it was
the campaign manifest's glob, and the fold itself says so two paragraphs earlier ("F14 is discharged
by tooling, not by this plan"). So the sentence is wrong twice over: the count is wrong, and one of
the three named items is not a member of the set it is offered as evidence for.

**The step it justifies is right, and its evidence is still strong** — that is why this is Weak and
not a hedge about the step. Stated at the tightest correct bound: **two of round 2's three Structural
findings (F15, F16), plus one Weak (F18), sat in text the round-1 fold newly wrote or newly
certified** — and F16 in particular was a review finding transcribed faithfully into the plan while
being wrong, which is the sharpest single piece of evidence in the set and survives the correction
untouched.

This is filed rather than waved through because the sentence is the rationale a future session reads
when deciding whether step 1a still earns its cost, and because a plan that miscounts findings in the
paragraph introducing a step against miscounted claims invites exactly the reading it is trying to
prevent.

**Plan text to change.** The enumeration at `:86-89` and its restatement at `:1515`.

### F24 — Note, defect: §9 states edge 5's `applyScreen` options unconditionally, but `js/app.js:459` makes all three ternary on the superseded session

§9 `:1116-1118`: "`applyScreen`'s preamble differs on this path (`resetSwipeStyles` at `js/nav.js:132`,
and **edge 5 passes `keepGhosts: true` and a computed `render`**)".

At HEAD `js/app.js:459` reads:

```
applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });
```

Every option is ternary on `cur`, and `cur` can be null — `js/app.js:455-456`'s own comment names "the
orphan branch (`cur` null)" as a live case. So on the orphan branch `keepGhosts` is `undefined`, not
`true`. "A computed `render`" is accurate; "passes `keepGhosts: true`" is the half that over-states.

**The ruling is unaffected on either branch, and I verified that rather than assuming it.**
`resetSwipeStyles` (`js/nav.js:114-120`) writes `transform`, `transition`, `willChange` and `zIndex`
and removes `.nav-ghost`/`.np-pill-float` nodes; it touches no class on any screen element, so
`js/nav.js:51-69` is untouched whichever value `keepGhosts` takes. `render` reaches only
`d.renderNowPlaying()` at `js/nav.js:152`, outside the park/hide block. The byte-identity ground
therefore holds on both branches — which is a slightly *stronger* statement than the one the plan
makes.

**Plan text to change.** One clause: edge 5 passes `keepGhosts` and `render` computed from the
superseded session (`js/app.js:459`), and the park/hide block is unreachable from either, on both the
session branch and the orphan branch.

### F25 — Weak, defect: the plan's step-6f sequencing text is stale as of `de84349`, and it is the sentence a builder reads before opening step 8

Three surfaces gate A1b on a device reading that the board now records as satisfied:

- `:38` — the status table: "**Device gate step 6f is OWED.**"
- `:1528` — step 8: "DOES NOT OPEN until step 1's A1b re-review is filed and accepted, **and until
  step 6f has read on device**."
- `:1564` — "BINDING — A1b MUST NOT SHIP BEFORE THE A1-fix-r2 DEVICE GATE (step 6f) HAS READ."

`Claude/Zelda/Board.md` at `de84349` records step 6f **satisfied**, on the ground that the user reports
the app fine on a build at or above `.284` and that app code is unchanged from `.284` to HEAD. I
verified that ground: `git diff 01cbaf1 HEAD -- js/ css/` differs only in `js/debug.js`'s
build-number constant, so the reading covers the shipped A1-fix-r2 predicate whichever build it ran
on. The board also records the honest residual — a casual pass may not have driven the deliberate fast
release, so the roughly 125–340ms band is untested rather than proven clean — and states that A1b is
no longer sequenced behind the gate.

**This is not a fold defect.** The fold is `23220ee`; the board entry is `de84349`, later. It is filed
because §13's step table is the artifact the builder executes from, and a builder reading `:1528`
today stops at a precondition that is no longer owed. It fails closed, which is why it is Weak rather
than Structural — nothing ships wrongly, the build simply does not start.

**Plan text to change.** The three surfaces above, brought to the board's current state, with the
untested timing band carried forward as the recorded residual rather than dropped. §15 R-I is the
existing home for the residual if it needs one.

### F26 — Note, defect: §3.5 spans the `browseWillHide` call over six lines; the call is one line and the span's tail is an unrelated comment

§3.5 (`:275`): "**`js/nav.js:60-65`** calls `d.browseWillHide()` — wired to `Browse.deactivate()` at
`js/app.js:2890` — on the shown→hidden edge only, **before** `display: none` lands".

At HEAD the call is `js/nav.js:60` alone; `:61` closes the edge-test block; and `:62-68` is the
retired stable-height-probe comment, which has nothing to do with this hook. The gating edge test is
`js/nav.js:55`. §9 (`:1076`) cites the same hook at `js/nav.js:60` with no span and is correct.

**Not a fold defect and not newly asserted** — the fold corrected the `js/app.js` half of this
sentence (`:2870` to `:2890`, F19) and left the `js/nav.js` span as it found it. It is recorded
because the sentence was touched and because §3.5 is a derived-from-source section whose value is
that its spans can be checked.

**Plan text to change.** `js/nav.js:60`, or `js/nav.js:55-61` if the edge test is meant to be inside
the span.

---

## Coverage — how each finding is verified

**No finding in this round is blocking, and none owes a test cell.** All four are corrections to plan
prose, citations, or records currency; none has a runtime surface, so no red cell can express any of
them and none should be written.

| Finding | Verification |
|---|---|
| **F23** | **Record check, no runtime surface.** The corrected enumeration is verified by reading the round-2 casebook's own severity labels (F14, F15, F16 Structural; F18 Weak) against the two plan surfaces `:86-89` and `:1515`. No cell is owed and none is removed. |
| **F24** | **Source read, no runtime surface.** Verified against `js/app.js:459` and `js/nav.js:114-120`. The edge-5 ruling it touches is itself a ruling rather than a cell, so the coverage position is unchanged: `NPPARKS` proves the `setView` body both edges reach, on both the session and the orphan branch. |
| **F25** | **Records reconciliation, no runtime surface.** Verified by executing `git diff 01cbaf1 HEAD -- js/ css/` (only `js/debug.js`'s build constant differs) and by reading `Claude/Zelda/Board.md` at `de84349`. The residual timing band stays device-owed and untestable in jsdom, exactly as recorded. |
| **F26** | **Source read, no runtime surface.** Verified against `js/nav.js:55-68`. No cell asserts a comment span. |

**The one coverage claim I re-drove this round is the edge-5 ruling**, because a ruling is what step
16 audits against rather than a cell. It now rests on a single ground I verified by reading both call
paths: edge 5 (`js/app.js:459`) and edge 4 both reach the same `setView` body, and nothing on edge 5's
path — `resetSwipeStyles`, `keepGhosts`, or the computed `render` — reaches `js/nav.js:51-69`.
`NPPARKS` proves that body. **No cell is owed for edge 5, and the ruling is now defensible to the seat
that will audit it.**

The Coverage Model is otherwise unchanged from round 2 and remains adequate: `NPPARKS`,
`NPRECONCILE`, the relocated `PEERFINALIZE` edge-3 cell, `NPUNTOUCHED`'s retained source-scan cell,
and the three device-owed R-H questions at step 9.

---

## Prediction — where this breaks in execution if built as written

**The build itself will not break on the mechanism.** I have now driven the guard deletion against
source in three separate rounds — every path that opens Now Playing, every path that closes it, and
the abort reconcile — and it is complete on all of them. Two deleted conditions, six comment sites,
and §6a's casualty table. The casualties are enumerated, so the builder's reds are expected rather
than diagnosed, which is the difference between a stop and an hour.

**The first friction is administrative, not technical, and F25 is it.** A builder opens §13, reads
step 8's precondition, finds step 6f named as owed, and stops — while the board two commits away says
it is satisfied. That costs a session's start, not a defect, and one edit closes it.

**The place to watch on device is step 9, and the corrected model changes what a null reading means.**
Under the old text, "the aborted swipe feels fine" would have read as "the new render is not felt."
Under the corrected text the cost is compounding, so a single half-swipe proves nothing and the
reading only exists if the user repeats it on a long list. Step 9 now says exactly that. The risk is
no longer a wrong model — it is that the step is read casually and a compounding cost is missed, which
is why the step's own wording ("does the list get slower or **emptier** the more times it is
repeated") is worth preserving verbatim when it reaches the user.

**The residual nobody can close by reading, stated as the ceiling.** Whether the `dematerialize()`
teardown is *felt* on a long virtualized list is device-only: jsdom has neither decode nor row
realization, so no cell can settle it and the plan is right not to write one. The `#browse.parked`
fallback is pre-designed and unbuilt, and building it is correctly a decision for after the reading
rather than a hedge folded in now.

**What the three rounds actually produced.** Round 1 found six Structural defects, all in the plan's
justification and enumerations. Round 2 found three more, all in text round 1's fold had newly written
— and the plan answered that pattern with a step, not a promise. Round 3 finds none of that class:
every claim the fold newly asserted resolves against source, including the two the planner caught
himself under the new step. **The specimen absorbed the blow. Build it.**
