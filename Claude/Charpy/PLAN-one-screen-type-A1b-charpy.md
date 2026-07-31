# Plan review — PLAN-one-screen-type.md, Stage A1b ("Now Playing parks the page beneath it")

Type: plan-review
Plan: `Claude/Plans/PLAN-one-screen-type.md` §5.3, §5.3.1–§5.3.5, §6a, §9, §10, §12 items 25–28, §14, §15 R-H
Reviewed at: HEAD `20d4b78`, build `2026-07-31.285`, tree clean
Date: 2026-07-31

<!-- charpy-gate {"review_type":"plan-review",
  "patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":false,"contract_shape":false},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/nav.js:45-90","js/nav.js:128-156","js/nav.js:192-214","js/app.js:440-465","js/app.js:490-513","js/app.js:530-554","js/app.js:810-820","js/app.js:1240-1262"],
  "callee_ranges":[]} -->

## Applicability

- **defining_records: true** — A1b's central claim is a claim *about* two records (`Claude/Linnaeus/PROBE-np-uniqueness.md` and the governing `Claude/Decisions/DecisionLog.md` entry), so reconciling them is the review's first duty, not background.
- **boundary_relocation: true** — responsibility for occluding whatever is behind Now Playing relocates from `.nowplaying`'s own opaque full-bleed rule (which alone masks the accumulated stack today) to `setView`'s park-and-hide swap. Ledger below; declared source ranges cover `setView`, `applyScreen`, `overlayFilmstrip`, and every `js/app.js` site that un-parks, un-hides, or reconciles across the seam.
- **callee_replacement: false** — no function is replaced by a callback, adapter, event or indirection. A1b deletes two `if (!npOpen)` conditions; `setView` keeps its one body and its call-site set, and `d.gestureOwnsMovers` (the one injected predicate in this region) is untouched by A1b. No `callee_ranges` are owed.
- **contract_shape: false** — A1b changes no returned key and no value domain. `Swipe.kindOf`, `Nav.isOverlay`, `classifyTransition` and `test/fixtures/swipe-plan-spec.mjs` are Stage B's surface, not A1b's. Verified: `docs/swipe-model.generated.txt` and `docs/transition-matrix.generated.txt` contain no park/hide/`npOpen` statement, so A1b regenerates neither and reddens no guard test.

## Verdict

**TEMPER.**

The mechanism holds. I drove §5.3.1's accumulation and §5.3.2's close-path table against source and both are correct: the abort really does reconcile through `applyScreen(currentDesc())` (`js/app.js:820` binds `dest = currentDesc()`, and an abort mutates neither stack, so on an NP source it resolves to `nowplaying`), and every one of the six close paths restores its own destination in the same synchronous block that hides NP, so no close path needs the exemption for an instant reveal. Deleting the two guards is sufficient for the defect it targets.

What fails is the plan's reconciliation with its own defining records, on precisely the axis the user fenced off. §5.3 asserts — three times, under a ⛔ — that *"additivity was never among the reasons given for NP's uniqueness"* and that *"the probe's §8 list of thirteen load-bearing differences does not include the park exemption."* **The probe's §8 lists it explicitly**, and the governing USER DECISION incorporates those thirteen by reference. A1b may still be the right change; it is not a change that leaves the user's decision untouched, and the plan certifies that it does. That certification is the load-bearing sentence for the whole stage and it is false as written (F2).

Five further Structural findings: the plan's header claims a review gate A1b never passed (F1); it cites NP's background as its distinguishing property, which the governing record forbids in as many words (F3); the `browseWillHide` edge enumeration carries three different counts in three sections and the true count is five (F4); the §12 deletion list misses three shipped source sites that state the mechanism A1b removes (F5); and §6a's casualty census — the table whose stated purpose is that the builder's stop be *expected* — undercounts the shipped cells and omits the file two of them live in (F6).

None of these shatters the specimen. Each is a claim to be corrected or an enumeration to be completed before step 8 opens.

## Defining records

| Record | Standing | Reconciliation |
|---|---|---|
| `Claude/Decisions/DecisionLog.md:1147-1167` — "ONE SCREEN TYPE, with Now Playing the deliberate exception", USER DECISION | **Governing** | **CONFLICT with the plan, twice.** (a) `:1162-1163` — "Thirteen further NP differences are load-bearing, itemised with citations in the probe" — incorporates the probe's §8 set by reference; item 4.2 of that set is the guard §12 item 26 deletes. (b) `:1167` — "do not cite its background as its distinguishing property" — the plan does exactly this at its header, §4 and §5.3. Neither conflict is acknowledged. F2, F3. |
| `Claude/Linnaeus/PROBE-np-uniqueness.md` | Derived fact sheet, **gates this design** (plan §1) | **CONFLICT on §4.2, not AGREE.** `:115-117` marks "going to NP leaves the settings overlays' hidden state untouched" (`js/nav.js:82`, the settings-loop guard) **load-bearing**; `:240` carries it into §8's thirteen as "4.2 the settings overlays left mounted underneath". Plan §1's row for this record reads AGREE and must not. Resolvable by a dated supersession in the probe, not by assertion. F2. |
| Same record, §4.1 (`:112-114`) | Derived fact | **AGREE.** The *park* guard (`js/nav.js:51`, §12 item 25) is marked **context**, not load-bearing. The plan's claim is therefore true for one of the two deleted guards and false for the other — the finding is that narrow, and the plan should state it that way. |
| Same record, §1.9 (`:245`) | Derived fact | **CONFLICT, latent.** The background is marked "Context / not a difference — shared with six screens". Stage A1 has since shipped and made it unshared, so the mark is stale at HEAD independently of A1b. The plan leans on the background as a uniqueness property while its gating record says it is not one. F3. |
| `Claude/Poirot/c4cfd7e-one-screen-type-stageA1.md` determination on `showAppView`'s sweep (plan §5.3.5) | Executed finding, closed | **AGREE, and the proof is sound — verified, not re-opened.** F11. |
| `js/nav.js:71-77` — the exemption comment as it exists at HEAD | Subordinate source comment | **GAP.** The plan (§5.3.2, §12 item 27) describes a *two-line* comment quoting "so whichever one was underneath stays for the NP-back reveal". A1-fix rewrote it to seven lines that refute that very sentence. The plan describes the pre-A1-fix artifact. F8. |
| `js/nav.js:151`, `js/app.js:1343`, `css/app.css:508-509` | Subordinate source comments | **CONFLICT with the post-A1b world, unlisted.** Each states the mechanism A1b removes. None appears in §12. F5. |
| `test/one-screen-type-finalize.test.js:171-221` | Live shipped cell (PEERFINALIZE edge 3) | **CONFLICT by design, and unlisted in §6a.** Four assertions depend on the exemption. F6. |
| `docs/swipe-model.generated.txt`, `docs/transition-matrix.generated.txt` | Executed whole-system models | **AGREE — no bearing.** Grepped for `npOpen`/park/hidden/underneath/exempt: zero hits. A1b changes no classification, so the plan's silence about them is correct rather than an omission. |

## Value and ownership ledger — the A1b relocation

Occlusion of what sits beneath Now Playing moves owner. Every boundary-relevant value crossing a declared source range, named — including the ones A1b leaves alone.

| Crossing | Class | Producer | Consumer | Owner after A1b | Lifetime | Verification |
|---|---|---|---|---|---|---|
| `#home` `parked` class under NP | state | `setView`'s park block, `js/nav.js:52` (guard deleted) | the compositor; `js/app.js:1349`'s pull-refresh arm test | `Nav.setView` | NP entry → next non-NP `applyScreen` | NPPARKS |
| `#browse` `hidden` class under NP | state | `setView`, `js/nav.js:69` (guard deleted) | the compositor; `Browse.activeEntry` | `Nav.setView` | NP entry → next browse `applyScreen` | NPPARKS |
| six settings screens' `hidden` class under NP | state | the six-way loop, `js/nav.js:79` (guard deleted) | the compositor | `Nav.setView` | NP entry → next settings `applyScreen` | NPPARKS |
| `d.browseWillHide` firing on the shown→hidden edge | ordering | `js/nav.js:55-61` | `Browse.deactivate()` (`js/app.js:2870`), which reads real geometry before `display:none` | `Nav.setView` | one call per browse exit, across **five** edges (F4) | NPPARKS + PEERFINALIZE — **incomplete as specified** |
| `hidden` removed from NP mid-gesture | state | `env.renderDestination`, `js/app.js:551` | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE |
| `#home` un-parked mid-gesture | state | `env.renderDestination` home branch, `js/app.js:547` | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE |
| `#browse` un-hidden mid-gesture | state | `showAppView`, `js/app.js:512` | the incoming mover | `js/app.js` `start()` | drag start → finalize | NPRECONCILE |
| stale settings sweep | state | `showAppView`, `js/app.js:498` | the six settings elements | `js/app.js` `showAppView` | per gesture render | KEPT, unaffected (F11) |
| `document.body.classList` token `np-locked` | state | `js/nav.js:82` toggle; removed at `js/app.js:549` and `:586` | the navbar button/pill swap rule | `Nav.setView` | **UNTOUCHED by A1b** — named because it crosses a declared range | NPUNTOUCHED fixture sanity |
| `d.gestureOwnsMovers()` suppression of the pending filmstrip reconcile | ordering | `js/app.js:250` | `js/nav.js:195` | `js/app.js` session | go-live → `sessionDone` | FILMSTRIPDRAG (shipped `.284`) — **verified sufficient for A1b, F13** |

**Injected/session fields crossing each declared range** (adapter obligation, per range):
`js/nav.js:45-90` — `d.byId`, `d.browseWillHide`, `d.isSignedIn`, `d.updatePlayerUI`; module-scope `npOpen`.
`js/nav.js:128-156` — `d.byId`, `d.renderScreen`, `d.renderNowPlaying`, `d.renderBrowse`.
`js/nav.js:192-214` — `d.gestureOwnsMovers`, `d.currentDesc`, `d.byId` (via `overlayEl`).
`js/app.js:440-465` — `d`/`session` as `cur`, `cur.live`, `cur.finPlan.abortRender`, `cur.scroll0`.
`js/app.js:490-513` — `d.from.v` (the outgoing-screen spare at `:498`).
`js/app.js:530-554` — `d.live`, `d.dir`, `d.w`, `d.movers`, `d.ghostY`, `d.animSync`, `d.animRes`.
`js/app.js:810-820` — `cur.movers`, `cur.dir`, `cur.dest`, `cur.newNav`, `cur.from.v`, `cur.id`, `cur.tgt`.
`js/app.js:1240-1262` — `cur.finPlan.abortRender`, `cur.scroll0`.
**No new field is added and none changes owner** — A1b is pure subtraction of two conditions. The relocation is of a *responsibility*, not of a value.

---

## Findings

### F1 — The plan's status line claims a review gate Stage A1b never passed
**Severity: Structural. Nature: defect.**

Line 30 reads `Status: **PLAN_READY — reviewed (TEMPER), findings folded.**` and attributes it to `Claude/Charpy/PLAN-one-screen-type-charpy.md`. That review is commit `e979a41`; §5.3 Stage A1b was added afterwards in `8e9b4b6` (both confirmed by `git log -S"### 5.3 Stage A1b"`). §13 step 1 ("Stress this plan; verdict forge/temper/scrap") likewise reads as discharged. A reader arriving at step 8 sees a plan certified ready and builds an unreviewed stage.

This is independent of A1b's content: a plan whose header claims a gate it has not had is a defect in the record whatever the stage says.

**Plan text to change:** line 30's status must scope its claim to the stages the cited review covered, and carry A1b's own gate state separately — and, once this review is folded, cite this file. §13 step 1 needs the same split.

### F2 — "Additivity was never among the reasons given for NP's uniqueness" is false against both the gating probe and the governing decision
**Severity: Structural. Nature: defect.**

The plan states it at the header (`:48-49`), in §4's "MOVED OUT OF STAYS" bullet, in §5.3's ⛔ paragraph, and in S4 (`:277-279`): *"That exemption is not on the probe's list of load-bearing differences."*

It is on the list.

- `Claude/Linnaeus/PROBE-np-uniqueness.md:115-117`, §4.2: *"going to NP leaves the settings overlays' hidden state untouched. `js/nav.js:82`: `if (!npOpen) { $('options').classList.toggle(…); for (const s of SETTINGS_SUBS) … }`. Whichever settings overlay was showing stays mounted under NP for the back-reveal. Mark: **load-bearing**."* That is verbatim the guard §12 item 26 deletes.
- `PROBE:240`, §8 "Load-bearing differences (13)": *"…3.7 the exported `npOpen` live-state flag; **4.2 the settings overlays left mounted underneath**; 4.4 no nav-highlight and no scroll reset…"*
- `Claude/Decisions/DecisionLog.md:1162-1163`, the USER DECISION: *"Thirteen further NP differences are load-bearing, itemised with citations in the probe."* The decision incorporates the set by reference; it does not re-derive it.

**The bound, stated tightly.** The claim is false for exactly one of the two guards A1b deletes. The probe marks §4.1 — the *park-and-hide* guard, `js/nav.js:51`, §12 item 25 — as **context** (`PROBE:112-114`, and `:246` lists 4.1 under "Context / not a difference"). So for the park guard the plan is right and for the settings-loop guard it is wrong.

**This does not make A1b wrong.** The probe marks 4.2 load-bearing *for a stated reason* — "stays mounted under NP **for the back-reveal**" — and §5.3.2's close-path table refutes that reason, which I verified independently against source: every close path un-parks or un-hides its own destination in the same synchronous block that hides NP (`js/app.js:547` for home, `:512` for browse, `:551` for a settings screen, and `js/nav.js:141/146/153` for the two button paths), so nothing waits on the exemption. The probe's mark is **superseded**, and superseding it is legitimate.

What is not legitimate is asserting the mark was never there. The difference matters because §5.3's ⛔ paragraph uses this claim to certify that A1b *"does not re-open the user's decision, and must not be treated as doing so."* A1b deletes an item the decision ratified as load-bearing. It may be the right deletion; the user is entitled to see that it is one.

**Plan text to change.** Replace the four "never among them" / "not on the probe's list" assertions with the accurate form: the probe marks 4.2 load-bearing for the back-reveal reason; §5.3.2 refutes that reason against source; the mark is superseded by dated correction in `PROBE-np-uniqueness.md` itself (per §6.6 — HEAD holds only current truth), and the probe's thirteen become twelve. §1's authority row for the probe changes from **AGREE** to **CONFLICT on §4.2, resolved by supersession**, with the supersession named as a step in §13.

### F3 — The plan cites NP's background as its distinguishing property, which the governing record forbids in as many words
**Severity: Structural. Nature: defect.**

`Claude/Decisions/DecisionLog.md:1167` closes the USER DECISION with: *"Do not 'consistency-fix' NP into an ordinary screen; **do not cite its background as its distinguishing property**."* The entry says why at `:1156-1160`: the claim "the only thing unique about NP is its background" *"was tested and is FALSE… the background is SHARED with `#options` and all five subs"*, and covering the bars needs **three co-required** properties, of which the background is one.

The plan cites it as distinguishing anyway, in the three places that carry A1b's argument:
- header `:48` — "NP keeps its background, `inset: 0`, `z-index: 60` and its coverage of the bars";
- §4 `:230-231` — "NP's uniqueness is its background, `inset: 0`, `z-index: 60` and its coverage of the bars";
- §5.3 `:392-393` — "NP stays unique in exactly the ways the decision states…: its own background, `inset: 0`, `z-index: 60`, covering the topbar and the transport."

`PROBE:245` independently marks the background **1.9, context / not a difference**.

The consequence is not cosmetic. §5.3's argument is a syllogism — *NP's uniqueness is {background, inset, z-index, bar coverage}; the exemption supplies none of them; therefore deleting the exemption does not touch NP's uniqueness.* With F2, the minor premise is false; with F3, the major premise names a property the decision says is not distinguishing and omits ten the probe says are. The conclusion survives on §5.3.2's independent derivation, but the argument as written is invalid, and it is the argument the ⛔ paragraph rests on.

**Plan text to change.** In all three places, state NP's uniqueness as **the probe's thirteen** — which S4 (`:275-276`) already does correctly — and, where the four properties are wanted, use the decision's own framing: `inset: 0`, `z-index: 60` and an opaque background are **three co-required properties for covering the bars**, not three distinguishing ones. Then reconcile: after Stage A1 the background *is* now unshared, which makes `PROBE:245`'s 1.9 mark stale at HEAD for a reason unrelated to A1b; fold that into the same dated supersession F2 calls for.

### F4 — The `browseWillHide` edge enumeration carries three different counts, and the true count under A1b is five
**Severity: Structural. Nature: defect.**

Three sections state the count, and no two agree:
- §7's ledger row `browse virtual controller anchor capture`: *"one call per browse exit across **all three** new trigger edges enumerated in section 9"*;
- §9: enumerates **four** (button-nav browse→settings; abort of a settings→browse gesture; the NP→files abort, relocated by A1b; opening NP while Browse is showing);
- §10: *"gains **four** trigger edges across A1 and A1b, not one"* — then lists **three**, and describes edge 3 in its pre-A1b "Now-Playing close back to a settings screen" form that §5.3.4 explicitly relocates. §10 was not updated when §5.3.4 landed.

A fifth edge exists and is enumerated nowhere: **supersession while Now Playing is the current screen.** `begin()`'s hard reset calls `applyScreen(currentDesc(), …)` at `js/app.js:459`. With `currentDesc()` resolving to `nowplaying`, A1b makes that call run `setView('nowplaying')` → the shown→hidden test at `js/nav.js:55` → `d.browseWillHide()`. It is reachable: an NP→files gesture un-hides `#browse` at `js/app.js:512`, and a second touch arming while that gesture settles takes the hard-reset branch.

The behaviour is benign — `#browse` is genuinely un-hidden and about to be hidden, so `Browse.deactivate()`'s precondition holds, and it is idempotent (`js/browse.js:332`). The finding is not a crash. It is that §9's stated purpose is that *"'correct' was until now an unproven reading — §14's `PEERFINALIZE` and `NPPARKS` are what prove it"*, and an edge that is not enumerated is not covered by either cell. Step 16 audits the suite against this enumeration.

**Plan text to change.** Fix §7's ledger row and §10's list to agree with §9; re-state §10's edge 3 in its post-A1b (abort) form; add the supersession edge as §9's fifth with its `js/app.js:459` citation, and either give it a cell or record it as deliberately uncovered with the idempotence argument as the reason.

### F5 — §12 items 25–28 are incomplete: three shipped source sites state the mechanism A1b removes
**Severity: Structural. Nature: defect.**

§12 is the plan's authority for what must be gone from HEAD, and §12 item 31 already rules on this exact class: *"leaving a known-wrong claim in HEAD 'because it is going away anyway' is the habit this plan's §1 records twice."* Three sites qualify and none is listed:

1. **`js/nav.js:151`** — `// NP: no scroll reset — the page underneath must stay exactly as it was.` After A1b the page underneath is parked and hidden; it demonstrably does not stay as it was. The *code* stays correct (there is no document scroll to reset), but the stated reason is false, and it sits inside `applyScreen`, three lines from A1b's own edit.
2. **`js/app.js:1343`** — `// additive overlays (NP, Options) leave #home un-hidden underneath.` Already false for Options at HEAD (Stage A1 shipped), fully false after A1b. Comment only: the guard at `js/app.js:1349` reads `$('home').classList.contains('parked')` and keeps behaving correctly — the pull-to-refresh arm is unaffected either way.
3. **`css/app.css:508-509`** — `/* nav.js's setView(): NP is an ADDITIVE overlay that paints over a live, un-parked page underneath, so it needs its own background. */` immediately above the `background: var(--page-bg)` at `:510` that S4 protects. After A1b the justification is false while the declaration is correctly retained. This is also the second source witness against F2: a shipped comment giving additivity as the reason for one of the properties the plan calls NP's uniqueness.

§13 step 17's HEAD-wide "additive overlay" scrub does eventually reach the wording, but it runs after Stage B — three stages and two device gates later — and §12, not step 17, is what the builder executes at step 8.

**Plan text to change.** Add all three to §12 under the Stage A1b block, with item 3 flagged as touching a `.nowplaying` **comment** only, so no reader mistakes it for an S4 violation.

### F6 — §6a's casualty census undercounts the shipped cells and omits the file two of them live in
**Severity: Structural. Nature: defect.**

§6a opens: *"A1b deletes both `if (!npOpen)` guards, which is text two registered mutants anchor and behaviour **two shipped cells** assert."* Its table then lists four artifacts, all in `tools/mutate.mjs` and `test/one-screen-type.test.js`.

A second file asserts it and is absent from the table: **`test/one-screen-type-finalize.test.js`**, the PEERFINALIZE edge-3 cell (`:171-221`). Four of its assertions turn at A1b:

- `:186-188` — `assert.equal(isHidden(h, 'options'), false, 'fixture sanity: Now Playing must leave the settings screen mounted underneath — that is the retained npOpen exemption NPUNTOUCHED guards')`. Reddens: A1b hides it by design.
- `:202-204` — `assert.equal(isHidden(h, 'browse'), false, 'fixture sanity: the NP→files abort must leave #browse un-hidden')`. Reddens: A1b's abort reconcile hides it. This is §5.3.4's relocation seen from the test side.
- `:216` — `assert.equal(rec.calls, 1)`. `rec` is installed at `:206`, *after* the abort, so the abort's (relocated) hook call is not recorded and the NP-close fires none — `#browse` is already hidden, so `js/nav.js:55`'s edge test is false. Goes to 0.
- `:218` — `assert.deepEqual(rec.hiddenWhenCalled, [false])`. Goes to `[]`.

Two of these are *fixture-sanity* assertions, which matters: they redden independently of where the cell's "third assertion" is pointed, so §13 step 7's instruction ("the `PEERFINALIZE` update — its third assertion moves from the NP close to the NP abort") does not describe the work the file actually needs. Worth noting too that after A1b the cell's **subject no longer exists**: the hook does not fire at the NP close at all, so this is a relocation of the whole scenario, not of one assertion.

§6a's own framing is what makes this Structural: *"This fails loudly rather than silently… so the cost is a stop for the builder, not a defect. It is listed here so that stop is *expected* rather than diagnosed."* A red in an unlisted file is the diagnosed kind.

**Plan text to change.** Correct §6a's census from "two shipped cells" to the true count, add a `test/one-screen-type-finalize.test.js` row to the casualty table naming all four assertions and the disappearance of the cell's subject, and expand §13 step 7 past "its third assertion".

### F7 — §5.3.4's failure-mode claim is false: the assertion fails loudly, it does not pass vacuously
**Severity: Correction. Nature: defect.**

§5.3.4: *"`PEERFINALIZE` needs updating, not replacing: its third assertion moves from the NP-close to the NP-abort… Left unchanged, that assertion would **pass vacuously** against a hook that no longer fires there."*

It fails. `test/one-screen-type-finalize.test.js:216` asserts `rec.calls === 1`; after A1b the hook fires zero times at the NP close, so `assert.equal(0, 1)` throws.

The error is in the safe direction, but the plan uses "passes vacuously" to justify the update's urgency, and §6a's entire framing turns on the fails-loudly / passes-silently distinction. Getting it backwards in one section and right in the other is the internal inconsistency, not the severity.

**Plan text to change.** §5.3.4's last sentence.

### F8 — Stale line citations for A1b's own edit sites, and one that mis-describes the artifact
**Severity: Correction. Nature: defect.**

A1b's product change is two line deletions, so the citations are the specification.

- The settings-loop guard is at **`js/nav.js:78`** at HEAD. §12 item 26 and §5.3.1 cite `js/nav.js:73`. (`PROBE:115` and `test/one-screen-type.test.js:189` cite `:82` — a third value, both pre-A1.)
- §12 item 27 calls the exemption comment *"the **two-line** comment (`js/nav.js:71-72`)"* and quotes it as *"Leave the settings overlays' hidden state untouched… so whichever one was underneath stays for the NP-back reveal."* **At HEAD that comment is seven lines, `js/nav.js:71-77`**, rewritten by A1-fix in discharge of §12 item 31. The quoted sentence survives only as a clause the rewritten comment refutes ("This is NOT what makes the NP-back reveal work"). Lines 73-77 state the exemption's real benefit — `#browse` keeping its covers warm — in the present tense, and a builder who deletes "lines 71-72" strands them in HEAD as a live description of a mechanism that no longer exists.
- §5.3.2's *"the exemption's own comment (`js/nav.js:71-72`) justifies it as a state convenience"* describes the same pre-A1-fix artifact. The current comment does not justify the exemption; it documents it as retired at A1b.

The park guard's citation (`js/nav.js:51`) and item 28's (`js/nav.js:48-50`) are correct at HEAD.

**Plan text to change.** §12 items 26 and 27, §5.3.1 and §5.3.2 — re-point to `js/nav.js:78` and `js/nav.js:71-77`, and re-describe item 27 as a seven-line comment already rewritten once by A1-fix, deleted whole at A1b.

### F9 — `popstate` is a fourth unguarded `applyScreen` writer, newly widened to Now Playing by A1b and unnamed in §15
**Severity: Weak. Nature: defect.**

§15's un-prosecuted planes name W44's async refresh handlers as *"a third writer of this same class… unguarded"*. Two facts belong beside that and are missing.

First, the reassuring one: those handlers **exclude** `'nowplaying'` (`js/app.js:2658` and `:3258` both test `d.v !== 'nowplaying'`; `:3165` admits only browse descriptors), so A1b does not widen them. The plan should say so — it currently leaves a reader to assume the opposite.

Second: `window.addEventListener('popstate', … applyScreen(currentDesc()))` at **`js/app.js:1319`** excludes nothing and is guarded by neither `gestureOwnsMovers` nor a screen test. Before A1b a stray popstate landing during an NP gesture ran `setView('nowplaying')`, which touched neither `#home` nor `#browse`. After A1b the same event parks `#home` and hides `#browse` mid-drag — the incoming or outgoing mover, on the app's most frequent transition.

Reachability is low by construction: history is deliberately pinned to a single entry (`js/app.js:121-125`), so a popstate is only a stray OS gesture. That is why this is Weak rather than Structural. It is still a writer of the class the plan enumerates as a safety argument, and A1b is what gives it teeth on the NP path.

**Plan text to change.** §15's un-prosecuted planes — add popstate as the fourth writer with its `js/app.js:1319` citation and its low-reachability reason, and record that W44 is *not* widened by A1b because it excludes `'nowplaying'`.

### F10 — §15 R-H's device-owed set omits the cost A1b adds to the aborted NP-back swipe
**Severity: Weak. Nature: defect.**

R-H is the plan's honest-cost section for A1b and names two hazards, both on the **close**: cover re-decode, and a flash on restore. A third sits on the **abort**, which is what step 9 asks the user to drive.

After A1b, an aborted NP→Books swipe costs two things it costs nothing for today. Mid-drag, `showAppView(dest, true)` un-hides `#browse` and runs `Browse.render(desc)` (`js/app.js:512`, reached from `renderDestination` at `:542` with `render` hard-coded `true`). At the abort, `applyScreen(currentDesc() === 'nowplaying')` now runs `setView('nowplaying')`, which fires `d.browseWillHide()` → `Browse.deactivate()` (`js/nav.js:60`) and then hides `#browse`. So every aborted NP-back swipe now pays a full render plus a controller teardown, repeatable as fast as the user can half-swipe, on a long virtualized list. Today the abort leaves `#browse` un-hidden and active and pays neither.

The step-9 gate does drive aborts, so the user would be *in* the right place — they are simply not told what to watch for, and R-H is where that is written.

**Plan text to change.** Add it as R-H hazard 3, with the same named fallback R-H already carries for hazard 1 (the `#browse.parked` recipe from §4 DEFERRED, which closes both by keeping `#browse` painted rather than hidden).

### F11 — §5.3.5's proof that A1b cannot kill `showAppView`'s sweep is sound: verified-closed, not re-opened
**Severity: Note. Nature: defect (none — recorded as verified).**

Checked as instructed, and the proof holds on its own terms.

`npOpen` is assigned at `js/nav.js:47` — `npOpen = v === 'nowplaying'` — at the top of `setView`, before either guard is read, from the current call's argument. There is no path by which a guard reads a stale value. Therefore on any `setView(v)` with `v !== 'nowplaying'`, both guarded blocks already execute at HEAD, and deleting the guards is a strict no-op on that call. The plan's phrasing — *"which are already taken whenever `npOpen` is false"* — is exactly right.

The scenario the sweep serves opens no NP: `closeSub` pops the nav stack at `js/app.js:175` **before** `overlayFilmstrip(fromV, 'options', 'back')` at `:177`, so `currentDesc()` reads `'options'` while `js/nav.js:200` un-hides both panes; a left-edge back-swipe armed in that window with a browse destination reaches `showAppView`, whose sweep at `js/app.js:498` hides the lingering sub while sparing the outgoing screen via `d.from.v !== s`.

**Determination KEEP stands.** Recorded here as verified so a later session does not re-derive it, and not re-raised as an open question.

### F12 — A1b closes a second pre-existing residue the plan does not claim
**Severity: Note. Nature: defect (none — an unclaimed benefit).**

`overlayFilmstrip` un-hides **both** panes at `js/nav.js:200` and relies on its pending reconcile to restore exclusivity. At HEAD, if Now Playing is opened by button inside that ~340ms window, `setView('nowplaying')` skips the six-way loop, and so does the reconcile's own `applyScreen('nowplaying')` — so **both filmstrip panes stay un-hidden beneath NP until the next non-NP `setView`**. A1b's unconditional loop hides them at the NP entry.

This is a second instance of the §5.3.1 class, reachable by a button tap with no gesture at all, and it is evidence for the change. Worth one sentence in §5.3.

### F13 — Stage A1-fix-r2 covers A1b's new parking path, and A1b opens no second reconcile window
**Severity: Note. Nature: defect (none — recorded as verified, per the review request).**

Checked directly, since the plan states A1b makes the r2 defect worse if unfixed.

**Coverage.** `gestureOwnsMovers = () => !!session && session.live` (`js/app.js:250`) is read at `js/nav.js:195` inside `reconcile`, and its truth boundaries are the session's, not the drag's: `session = d` at `:486`, `.live` set in `start()` at `:531`, `session` untouched by `end()`'s `const cur = d; d = null` at `:625`, nulled only by `sessionDone` at `:257` from finalize (`:1269`) or the reveal drop (`:900`). The predicate is orthogonal to *which* screen `currentDesc()` names, so widening what `applyScreen` does for `nowplaying` cannot escape it. Confirmed sufficient.

**No second window.** A1b adds no timer, no listener, no rAF and no promise — it deletes two conditions. The only asynchronous continuation in this region remains `overlayFilmstrip`'s `transitionend` + 340ms pair (`js/nav.js:212-213`), unchanged in count and timing.

**The one new interaction, and it is benign.** With no gesture live, a pending filmstrip reconcile that fires after NP was opened by button runs `applyScreen('nowplaying', { render: false })`, which under A1b parks and hides — the same state `navTo({v:'nowplaying'})` just applied. Idempotent, and it is the mechanism behind F12.

---

## Coverage — how each blocking finding is verified

| Finding | Verification |
|---|---|
| **F1** | Record check, no cell: line 30 and §13 step 1 cite this file and scope the earlier review to the stages it covered. Confirmed by `git log -S"### 5.3 Stage A1b"` returning `8e9b4b6`, after `e979a41`. |
| **F2** | Record check plus a **dated supersession entry in `Claude/Linnaeus/PROBE-np-uniqueness.md`** retiring the §4.2 load-bearing mark with §5.3.2's refutation as its reason, and §8's count corrected from thirteen. §1's probe row reads CONFLICT-resolved-by-supersession. No new cell is owed: the *behaviour* is already covered by `NPPARKS` (mutant NATURAL-b restores the settings-loop guard); what is uncovered is the record, and records are not cell-verifiable. |
| **F3** | Record check: the three citations of the background as distinguishing are re-worded to the decision's own "three co-required properties" (`DecisionLog:1158-1160`), and `PROBE:245`'s stale 1.9 mark folds into F2's supersession. `NPUNTOUCHED`'s retained source-scan cell (§6a, kept) already guards the declaration itself. |
| **F4** | §9 gains the fifth edge with its `js/app.js:459` citation; §7's ledger row and §10's list are brought to the same count. Either `NPPARKS` gains a supersession-with-NP-current assertion, or the plan records the edge as deliberately uncovered on the `Browse.deactivate()` idempotence argument (`js/browse.js:332`) — the plan's call, not the reviewer's. |
| **F5** | The three sites join §12's A1b block and are struck at step 8. Mechanically checkable at pre-commit: no occurrence of "un-parked page underneath", "page underneath must stay exactly as it was", or "leave #home un-hidden underneath" survives the A1b commit. |
| **F6** | §6a gains the `test/one-screen-type-finalize.test.js` row; §13 step 7 names all four assertions. Verified by execution — the full `npm test` battery green in the A1b commit, with that file's four turned assertions as the specific witness, exactly as §6 item 2 uses `swipe-declone-stage1`'s fixture sanity for Stage B. |

Non-blocking findings (F7–F13) are corrections to plan or record text and to §15's enumeration; none gates the build.

---

## Prediction — where this breaks in execution if built as written

**The expensive one is F2, and it does not surface at the build.** Everything in CI goes green: `NPPARKS` and `NPRECONCILE` assert the new truth, `NPUNTOUCHED` narrows to its source-scan cell, the mutants re-point. The build is clean, the device gate at step 9 very likely reads clean too, because NP's own opaque full-bleed rule masks whatever is parked beneath it at rest — which is exactly why the accumulation went unnoticed until A1 made the stack transparent. The failure lands later and socially: the user, who settled this decision once and *"had to repeat because it kept being re-litigated"* (`DecisionLog:1148`), discovers that a stage which certified "this does not re-open your decision" deleted an item the decision's own record marks load-bearing. The plan will be right on the mechanism and will have spent the credibility it needs to say so. The fix is cheap now — one dated supersession in the probe and four corrected sentences — and cannot be made retroactively.

**F6 breaks at the build, in the ordinary way.** The builder runs step 8, `npm test` reddens in `test/one-screen-type-finalize.test.js` — a file §6a's table does not mention — and stops to work out whether A1b was supposed to do that. §6a exists to prevent exactly that pause, and it will not, because the census behind it is wrong. Cost is an hour and a diagnosis, not a defect.

**F5 is the one that survives the stage.** The three unlisted comments are not load-bearing for behaviour, so nothing fails and nothing prompts. They sit in HEAD across A1b, A2 and B until step 17's scrub, and step 17 is scoped to the phrase "additive overlay" — which catches `js/app.js:1343` and `css/app.css:508`, and **misses `js/nav.js:151`** ("the page underneath must stay exactly as it was") because that sentence does not contain the phrase. That one is the durable residue: a false statement about the NP mechanism, three lines from the guard A1b deleted, in the file the next reader opens first.

**F4's fifth edge is the sequencing crack.** It is invisible until step 16, where the coverage auditor audits the suite against §9's enumeration and finds the enumeration is what is short — a gap that reads at that point as a test-design failure when it is a plan-enumeration failure, and routes to the wrong seat. The plan's own §7 ledger already disagrees with §9 by a count of one, which is the tell that was available before the build.

**What will not break.** The guard deletion itself. I drove every path that opens Now Playing — `openNowPlaying` → `navTo`, gesture commit, gesture abort, `popstate`, `begin()`'s hard reset, and `renderDestination`'s mid-drag un-hide — and every path that closes it, and the reconcile is complete on all of them. The instant swipe-back reveal survives: `start()` un-parks the destination and applies the first translation inside the same `move()` call (`js/app.js:606` then `:613`), and the button paths do both inside one synchronous `setView`. No frame exists in which the destination is missing. That part of the specimen absorbed the blow.
