# CHARPY — plan review of `PLAN-one-screen-type.md`

Type: plan-review
Plan reviewed: `Claude/Plans/PLAN-one-screen-type.md` (PLAN_READY, HEAD `24dee42`, build `2026-07-30.278`)
Reviewed: 2026-07-30. Read-only on project code and tooling; this file is the only artifact written.

<!-- charpy-gate {"review_type":"plan-review",
  "patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":false,"contract_shape":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/nav.js:45-95","js/nav.js:127-155","js/app.js:478-498","js/app.js:515-539","css/app.css:207-227","css/app.css:772-791"],
  "callee_ranges":[]} -->

## Verdict

**TEMPER.** The central claim holds. I struck the load-bearing assumption — *"with `#home` parked and
`#browse` hidden, a settings screen needs no background of its own"* — across every state I could reach
by reading, and found no counter-state at rest: after Stage A1 the only thing behind a visible settings
screen is `body::before`, and the intermediate states inside `setView` are unobservable because no paint
can occur between them. Stage A1 closes the reported defect at its cause and is independently shippable.
The taxonomy change in Stage B is, as claimed, a pure re-partition that alters no construction value.

Two Structural findings stand between the plan and a build. **F1**: Stage B's migration set omits the two
test files that consume `STRUCTURAL_CASES` / `REPRESENTATIVE`, one of which hard-asserts a case count of
eight and therefore lands red. **F2**: the Coverage Model leaves the changed park guard unproven on every
gesture-finalize path, although the integration harness that could prove it already exists and is the
established instrument for exactly this class — and A1 adds two `browseWillHide` trigger edges the plan
does not enumerate. Neither shatters the plan; both will fail under execution or leave the change
unproven if not fixed first.

## Applicability

- **defining_records: true** — the decision log's final entry governs; the derived fact sheet gates the
  design; two source-comment records conflict with HEAD; two live tests conflict by design. §"Defining
  records".
- **boundary_relocation: true** — occlusion responsibility for six screens relocates from each screen's
  own `background` declaration to `Nav.setView`'s park-and-hide swap, and stacking responsibility
  relocates from explicit `z-index` to root-stacking DOM order. Ledger below.
- **callee_replacement: false** — no callee is replaced by a callback, adapter, event or other
  indirection. `setView` keeps its one body and its call-site set; one condition narrows and one branch
  collapses. `Swipe.kindOf` gains a membership test, not a new layer. No callee ranges are declared
  because none exists.
- **contract_shape: true** — `Swipe.kindOf`'s output domain gains a member and `Nav.isOverlay`'s
  membership narrows, changing four value domains and the frozen spec's structural-case set. I verified
  the plan's claim that no **exact-key** shape changes: `classifyTransition`, `constructionPlanFor` and
  `finalizationPlanFor` each keep every key, so `test/contract-function-gate.test.js` needs no edit and
  the exact-key contract gate is not implicated. That claim is correct.

## Defining records

**Materially AGREE, with two CONFLICTs that are correctly identified as deliberate and one GAP the plan
closes rather than leaves open.** I re-derived each rather than accepting the plan's reconciliation.

| Record | Standing | My call |
|---|---|---|
| `Claude/Decisions/DecisionLog.md` final entry, 2026-07-30 | Governing | **AGREE.** The plan executes both settled decisions and re-opens neither. Nothing in it touches `.nowplaying`; I checked every stage against the four `.nowplaying` surfaces (`css/app.css:502-515`, `body.np-locked`, the pill and pill clone, `js/nav.js:82`) and none is added, removed or re-timed. |
| `Claude/Linnaeus/PROBE-np-uniqueness.md` | Derived fact sheet, gates the design | **AGREE.** §7.3's two independent reasons are load-bearing and correct: the ordinary inset geometry puts the topbar's and transport's boxes outside the settings screen's box, and `z-index: 25`/`26` sit below `30`/`35`. Removing the background and the stacking from the settings screens therefore cannot change what covers those bars. §1.9's "the background is shared, not unique" is confirmed at `css/app.css:222`, `:787`, `:511`. |
| `js/nav.js:50-55` — the additive-model rationale | Subordinate source comment | **CONFLICT with HEAD, resolved by deletion — confirmed false at HEAD.** Every screen under `#library` declares `position: fixed` (`css:161`, `184`, `215`, `506`, `780`; `.topbar` `css:236`), so `#library` contributes no flow height and hiding a screen cannot shrink the document. The premise the comment asserts does not hold. |
| `css/app.css:220-221`, `:785-786` | Subordinate source comments | **AGREE with HEAD; both become false when A1 lands.** Deleting them with the declarations they justify is correct, and is the treatment §6.6 of the standards requires. |
| `test/page-bg-single-painter.test.js:25-29` | Live gate | **CONFLICT by design.** `OPAQUE_SELECTORS` pins the split the decision reverses. §16.1's replacement fails in both directions; verified against the file's actual assertions. |
| `test/nav.test.js:36-44` | Live test | **CONFLICT by design.** Read in full: it asserts `hidden('options') === false` while `downloads` is applied. That assertion *is* the defect. Inverting rather than deleting is right — the dimension survives, only the answer changes. |
| `Claude/Subsystems/swipe-reveal.md:396-403` | Subsystem contract, live trigger | **AGREE.** The overlay-background trigger genuinely fires and is genuinely answered in the same record by the superseding Stage-1 entry. Recording it rather than silently passing it is correct. |
| **GAP** — no record states why a settings screen needs a `z-index` once nothing lives underneath | — | **Closed by the plan, not left open.** Both stated causes (`css:210`, `:775-776`) are removed by A1. See F5/F6 for what the plan gets wrong about the *consequence* of closing it. |

**No material conflict leaves required behaviour, scope, ownership, sequencing or acceptance
unresolved.** The two live-test conflicts are the intended product of the decision, and each names its
replacement.

## Value and ownership ledger

Boundary crossings over the declared source ranges. Each has a named owner in the proposed design; none
is unresolved.

| Crossing | Range | Direction | Owner after the change | Verification |
|---|---|---|---|---|
| `d.byId` — the injected element lookup resolving all six screen ids | `js/nav.js:45-95`, `:127-155` | in | `Nav.setView` / `Nav.applyScreen`, unchanged | ONEPAGE |
| `d.browseWillHide` — the injected Browse-deactivation hook | `js/nav.js:45-95` | out | `Nav.setView`, unchanged in shape, **newly reached on three edges** (F2) | PEERPARK, plus the edges F2 requires |
| `d.isSignedIn` — gates the navbar hidden toggle | `js/nav.js:45-95` | in | untouched by every stage | fixture sanity only |
| `d.updatePlayerUI` — the trailing reconcile after every `setView` | `js/nav.js:45-95` | out | untouched; behaviour at the re-routed settings entries is unchanged | fixture sanity only |
| `document.body.classList` token `np-locked` | `js/nav.js:45-95`, `js/app.js:515-539` | out | untouched by every stage; keyed to Now Playing, which the decision puts out of scope | NPUNTOUCHED |
| `d.renderScreen` — the settings render dispatch | `js/nav.js:127-155` | out | untouched; same call on the same condition for all six screens | ONEPAGE fixture |
| `d.renderNowPlaying` — the Now Playing render dispatch | `js/nav.js:127-155` | out | untouched; the NP branch is not read, re-ordered or re-conditioned | NPUNTOUCHED |
| `d.renderBrowse` — the Browse render dispatch | `js/nav.js:127-155` | out | untouched in shape; newly reached returning from a settings screen to Browse, through the same branch a return from Home already uses | PEERPARK |
| `d.from` — the gesture session's source descriptor, read by the stale-settings sweep | `js/app.js:478-498` | in | `showAppView`, unchanged; the sweep is correctly retained (its live case is the NP one) | see F2 |
| `d.live`, `d.dir` — the gesture session's liveness and direction | `js/app.js:515-539` | inout | `start()`, untouched by every stage | existing swipe cells |
| settings-screen occlusion | `css/app.css:207-227`, `:772-791` | inout | relocates from the `background` declaration to `Nav.setView`'s park-and-hide swap | NOSETTINGSBG + device row R-C |
| settings-screen stacking | `css/app.css:207-227`, `:772-791` | inout | relocates from explicit `z-index` to root-stacking DOM order | device row R-F; see F5/F6 |

No dead value is added. The two rows recording narrowings are exactly the ones that would otherwise
survive in both places.

## What survived the strike

Recorded because a claim that was tested and held is worth as much as one that cracked, and because the
adversarial commission should be aimed at what is left rather than at what I closed.

**1 — The no-background claim is sound for every state reachable by reading.** I enumerated every writer
that can remove `hidden` from a settings screen: the collapsed loop in `Nav.setView`, `Nav.overlayFilmstrip`
(`js/nav.js:180`) and `env.renderDestination` (`js/app.js:536`). For each I traced what is behind the
screen at that moment.

- *At rest.* `#home` parked (`css:127-131`, `translateX(-101vw)`, painted but off-viewport), `#browse`
  `display: none`, the other five settings screens `display: none`, `.nowplaying` `display: none`. Only
  `body::before` is behind. The three fixed bars paint above but lie outside the screen's box.
- *`overlayFilmstrip` (hub ↔ sub).* Both call sites (`js/app.js:166`, `:177`) require the current screen to
  be a settings screen, so `setView` has already parked `#home` and hidden `#browse`. Both panes are
  transparent over `body::before`.
- *Mid-gesture.* `home→settings` and `browse→settings` move the source and the destination as one
  filmstrip; the source is beside the destination, never behind it. `settings→settings` likewise.
  `NP→settings` runs with `#home` parked and `#browse` hidden, because entering the settings screen
  parked them and `setView('nowplaying')` leaves that state alone.
- *Ordering inside `setView`.* The park, the browse hide and the six-way loop are consecutive statements
  in one task. `d.browseWillHide()` between them forces layout, not paint. No frame can be painted in an
  intermediate state, so the window is unobservable.
- *Abort and commit.* `resetSwipeStyles` clears the transforms and `setView` applies the new visibility
  inside one synchronous `applyScreen` call (`js/nav.js:131` then `:140`/`:145`). The fully-overlapped
  instant exists but is never painted.
- *Supersession.* The hard reset ends in `applyScreen(currentDesc())`, a full reconcile. After A1 that
  reconcile parks `#home` and hides `#browse` for a settings current, so supersession is self-healing —
  strictly more so than at HEAD.

A1 also removes a residue rather than adding one: at HEAD, closing Now Playing back to Options leaves
`#browse` un-hidden underneath, covered only by `#options`'s opaque background. After A1 that path runs
the park block and hides it.

**2 — The exclusivity mechanism does match `.browsepage`, at rest.** I read `Browse.showPage`
(`js/browse.js:299-303`) in source: one loop over the whole cache, `away = k !== key`, no separate
"hide the previous" step. The proposed six-way loop has the same shape and the same property. The
qualification is F4.

**3 — Stage B's arithmetic and its three trailing counts are correct, verified against the artifacts.**
Four kinds give sixteen pairs; `home→home` and `overlay→overlay` are excluded, leaving fourteen, and the
seven retained plus seven added rows reconcile. The registry stays at 12 screens and 132 ordered pairs.
Pane-building pairs stay 12 (the four browse screens give sixteen ordered pairs less four same-name),
abort-rerender pairs stay 12 (same set), NP-pill pairs stay 22 (11 + 11). None of the three moves.

**4 — Deleting `overlay→overlay` is safe, and provably so from source.** `test/swipe-transition.test.js:95-104`
asserts a structural case exists for every kind-pair produced by the 132 concrete pairs, skipping
`f.v === t.v`. With `overlay` reduced to one member, no concrete pair can produce `overlay→overlay`, so
the assertion never asks for the deleted row. This is the same rule that already justifies `home→home`'s
absence — the deletion is precedented, not novel.

**5 — `MODIFIER_CASES` genuinely needs no change.** Its two NP cases are `nowplaying→books` and
`books→nowplaying`; after Stage B they remain `overlay→browse` and `browse→overlay`, and the case names
in the fixture prose stay literally correct. The plan's instruction not to "fix" them is right.

**6 — `Nav.isOverlay` has exactly one production consumer.** A grep over first-party source returns the
definition (`js/nav.js:34`), the export (`js/nav.js:198`), the single call (`js/swipe.js:61`) and two
test references (`test/nav.test.js:105-106`). The plan's deletion-list scoping of line 105 is precise:
the `'nowplaying'` term on that line and the whole of line 106 stay true after Stage B.

**7 — The mutation registry is not disturbed by A1 or A2.** I swept `tools/mutate.mjs` (102 registered
mutants) for anchors pinning any text A1 or A2 deletes. None exists. The only `SETTINGS_SUBS` anchor
(`tools/mutate.mjs:498`) pins `showAppView`'s sweep line, which the plan explicitly retains. The plan's
single named anchor re-point (`:487-489`, Stage B) is therefore the complete anchor migration.

**8 — The generated model's four pinned source regions are untouched.** All four
(`tools/gen-swipe-model.mjs:57`, `:61`, `:65`, `:69`) fingerprint regions of `js/app.js` that no stage
edits. Regeneration will not churn a pin, and no manual re-verification of a pinned constant is owed.

**9 — Two adjacent guards are correctly excluded from the deletion list.** `js/nav.js:82`'s `if (!npOpen)`
is the mechanism of the settings-screen-under-NP back-reveal (probe §4.2) and must survive.
`js/app.js:483`'s sweep is not dead after A1: with NP opened from Options, `setView('nowplaying')` leaves
`#options` mounted, and an `NP→files` swipe reaches the sweep with `d.from.v === 'nowplaying'`, so
`#options` is genuinely hidden by it. Both stated reasons check out.

**10 — `test/screens.test.js` is not a conflict.** Read in full: it asserts hub/element/back-button
agreement, the `SETTINGS_SUBS` ↔ hub-row match, the `OVERLAY_SEL` match, membership of the subs in the
`position: fixed` rule, and the scoped `scrollbar-width: none` list. No assertion touches a background or
a `z-index`. Correctly absent from the plan's records table.

## Findings

### F1 — Stage B's migration set omits the two consumers of `STRUCTURAL_CASES` / `REPRESENTATIVE`; one lands red

**Severity: Structural. Nature: defect.**

§6's Migration (U10), §11.3 and §12 together enumerate what Stage B must edit: the frozen spec, both
generated docs, the `tools/mutate.mjs` host anchor, and `test/nav.test.js:105`. Two further files consume
the fixture and neither appears anywhere in the plan.

- `test/swipe-declone-stage1.test.js:81` —
  `assert.equal(spec.STRUCTURAL_CASES.length, 8, 'fixture sanity: there are eight structural cases')`.
  Stage B makes the length 14, so this assertion fails. It is a hard red in the same commit as the
  production edit. Its line 70 also restates the fixture inline
  (`const REP = spec.REPRESENTATIVE;   // { home: 'home', browse: 'books', overlay: 'options' }`), which
  becomes a wrong second copy of the contract — the same staleness class §1 of the plan records twice.
- `test/swipe-stage6d.test.js:148` — the test is named
  `FP.oracle — production finalizationPlanFor.abortRender equals the frozen expectedFinalization for all 8 structural cases`.
  It carries no length assertion, so it passes while its name asserts a count that is no longer true.

I checked whether either test's *body* breaks under the new representative: `NOGHOSTINFLOW` reads only
`outgoing` and `FP.oracle` reads only `abortRender`, and both yield the correct values for
`nowplaying` and for `options` in the new mapping. So the failure surface is exactly the one count
assertion plus the two stale claims — small, but it is the difference between Stage B landing green and
landing red, and an unlisted migration item is precisely what the deletion list exists to prevent.

**Invariant the plan must satisfy:** every artifact that reads `STRUCTURAL_CASES` or `REPRESENTATIVE`
migrates in the same commit as the fixture, and no restatement of the fixture survives that commit. The
plan already states this rule for `tools/mutate.mjs`; it must apply it to the fixture's own consumers.

### F2 — the changed park guard has no coverage on any gesture-finalize path, and A1 adds two unenumerated `browseWillHide` edges

**Severity: Structural. Nature: defect.**

`PEERPARK` drives `Nav.applyScreen({v:'books'})` then `Nav.applyScreen({v:'options'})` — a button-nav
sequence. The narrowed guard also runs at every gesture finalize, through `applyScreen`, and A1 changes
what it does there on four paths. None of them is exercised by any of the six cells:

1. commit `home→settings` — `#home` is now parked at finalize where it previously was not;
2. commit `browse→settings` — `#browse` is now hidden and `d.browseWillHide` fires;
3. abort of `settings→browse` — `showAppView` has already un-hidden and re-rendered `#browse` mid-drag
   (`js/app.js:496`), so the aborting `setView(settings)` now hides it again **and fires
   `d.browseWillHide`**, an edge the plan does not name;
4. closing Now Playing back to a settings screen after an `NP→files` abort left `#browse` un-hidden —
   the same new `d.browseWillHide` edge on a second path.

§Applicability's `lifecycle_ownership` bullet, §9's `d.browseWillHide` entry and §10's Deactivates bullet
each name **one** new trigger edge ("entering a settings screen from Browse"). There are three. The
behaviour at each is correct — in every case `#browse` is genuinely un-hidden and about to be hidden, so
the deactivation precondition holds and the anchor is captured from real geometry — but the ledger row
`browse virtual controller anchor capture` is under-enumerated and the additional edges are unproven.

This is not a jsdom limitation. Every assertion needed is class state and call ordering, not geometry:
`test/app-harness.js` boots the real `app.js` and drives real touch sequences, and
`test/swipe-declone-stage1.test.js`'s `HOMESTAYSLIVE` is an existing cell of exactly this shape asserting
exactly this kind of fact about `#home.parked` across a live gesture. The instrument exists and the
project's own history — `.106` and `.107` both shipped past a fully green suite because the code lived
where no test could reach it, which is the stated reason `js/nav.js` exists behind injected deps — is the
argument for using it here.

**Invariant the plan must satisfy:** the narrowed guard is proven on the gesture-finalize path, not only
on the button-nav path, and every new `d.browseWillHide` trigger edge is enumerated in §9/§10 and covered.
**Recommendation, not a requirement:** one integration cell over the app harness driving a
`Books → Options` commit and a `Options → Books` abort would cover paths 2 and 3 together; the shape of
the cell is the builder's and the test author's call, and a unit cell that drives `applyScreen` through
the finalize opts (`{render:false, resetScroll:false, keepGhosts:true}`) would also satisfy the invariant.

### F3 — §12 item 12 deletes the rationale for the one line the plan itself keeps

**Severity: Weak. Nature: defect.**

Item 12 deletes `js/nav.js:76-81` whole, on the reason "the mechanism is gone". Lines 78-81 do describe a
gone mechanism (the hub kept mounted under its own child). **Lines 76-77 do not** — they state why the
`if (!npOpen)` guard exists at all:

> Leave the settings overlays' hidden state untouched when going TO NowPlaying so whichever one was
> underneath stays for the NP-back reveal.

That guard is the first entry on the plan's own "explicitly NOT deleted" list, and after A1 it wraps a
loop that already handles all six screens correctly — so a future reader sees a guard with no visible
purpose, and the obvious simplification deletes it and silently breaks the Now Playing back-reveal. The
`NPUNTOUCHED` mutant does catch that exact edit, which is why this is Weak rather than Structural; but the
comment is what stops the edit being attempted, and this file's own header records two defects born in
this code.

**Invariant:** the retained guard carries its stated reason in source. Deleting lines 78-81 and keeping or
rewriting 76-77 satisfies it.

### F4 — "co-visibility impossible by construction" is stronger than the mechanism delivers

**Severity: Weak. Nature: defect.**

§5.1 describes the collapsed loop as making co-visibility "impossible by construction", and §3.3 grounds
that in `Browse.showPage`. The parity is real at rest but not universal, because the six-way loop is not
the only writer of `hidden` on those six elements. Three writers exist:

- the loop itself, which can never leave two unhidden;
- `js/app.js:483` (`showAppView`), which only ever **adds** `hidden` and so can only reduce co-visibility;
- `js/nav.js:180` (`overlayFilmstrip`) and `js/app.js:536` (`env.renderDestination`), which **remove**
  `hidden` from a second settings screen without consulting the loop.

The last two produce deliberate, transient co-visibility — a filmstrip needs both panes on screen. The
reported defect was static co-visibility ("static, not mid-swipe"), and the loop does make that
impossible. So the fix is right and the claim is over-broad by exactly the gesture window.

This matters because `S1` is the invariant the builder implements against and `ONEPAGE` is the cell that
proves it, and `ONEPAGE` correctly drives `applyScreen` only — it proves the at-rest property, not the
universal the prose asserts. **Invariant:** state S1 and §5.1 at the scope the mechanism actually
delivers — exactly one settings screen is un-hidden at rest, and the only screens that may be
simultaneously un-hidden are the two panes of a live filmstrip.

### F5 — §5.2 states the z-index inversion unqualified; `#home.parked` already declares `z-index: 0`

**Severity: Weak. Nature: defect.**

§5.2 says: "Today `#options` (25) paints above `#home` (20). After A2 it paints below it." `#home.parked`
(`css/app.css:127-131`) declares `overflow: hidden; pointer-events: none; z-index: 0; will-change: transform`.
The parked state overrides the base `z-index: 20` with `0`.

So at rest — the only state in which a settings screen is visible and `#home` exists on screen at all —
`#home` sits at `z-index: 0` and the settings screens sit at `auto`, and DOM order decides: `#home` is
`index.html:48`, `#options` is `:67`, so the settings screen paints above the parked `#home` both before
and after A2. The inversion the plan describes exists **only while `#home` is un-parked**, which is the
duration of a `home↔settings` gesture and its synchronous finalize window.

The plan's statement makes A2 look riskier than it is, which is the safe direction to be wrong in — but
it is still a claim stronger than its evidence, and it mis-scopes what the A2 device gate is looking for.

### F6 — A2's fallback stacking reproduces both deleted relationships exactly; the plan does not say so

**Severity: Note. Nature: recommendation.**

§5.2 justifies the deletions by removing their causes, and then rests the residual on the zero-overlap
measurement plus a synchronous-call argument. A third argument is available and is stronger than either,
because it does not depend on the compositor at all: after the deletions, root-stacking DOM order
reproduces both deleted relationships.

- `z-index: 26`'s stated cause is that a sub must paint above the hub during a filmstrip. All five subs
  are `index.html:80, 97, 106, 115, 126` — every one after `#options` at `:67`. With both at `auto`, the
  sub still paints above the hub.
- `z-index: 25`'s stated cause is covering page content. `#browse` (`:62`) precedes every settings screen,
  and `#browse` declares no `z-index` deliberately (`css:177-183`), so a settings screen still paints
  above `#browse` wherever the two are simultaneously un-hidden.

I also swept every `z-index` in `css/app.css` for a value that could newly outstack a settings screen at
`auto` and overlap its box. `.alphaindex` at `z-index: 24` is the only candidate below the old 25/26, and
it is a `.browsepage` child (`js/browse.js:838`, `css:174`) — it is inside `#browse` and goes away with it.
Everything else that overlaps the box is 30 or higher and was already above 25/26. **Nothing else depends
on the settings screens outstacking anything.** The z-index deletions are clean; the two stated causes are
genuinely obsolete, and where the old relationship still matters, DOM order preserves it.

This is a recommendation because A2 is correct without it. Stating it changes what the A2 device gate is
told to look for, which is worth the two sentences.

### F7 — §8 omits the one ordering that produced the reported defect

**Severity: Weak. Nature: requirement.**

§8 lists four correctness orderings. The ordering that actually produced the device screenshot is absent:
**the exclusivity loop must not land without the background deletion, and the background deletion must not
land without the exclusivity loop.** Stripping the backgrounds while the hub stays mounted under its sub
is exactly the reverted commit `6c9e7e3`, and it is the reason this plan exists.

Step 3 puts both edits in one stage, so the stage boundary enforces it in practice — which is why this is
Weak and not Structural. Naming it in §8 makes the constraint visible to a builder who splits step 3 for
any reason, and §8 is where the plan's correctness orderings are supposed to be enumerable.

### F8 — §12 presents itself as complete but one scrub item lives only in §16

**Severity: Note. Nature: defect.**

§12 opens "It is not complete until each of these is gone from HEAD" and runs twenty-one numbered items.
`test/page-bg-js-painter.test.js:4`'s "the three additive overlays" wording is named only in §16.1's
prose. It is a real scrub item — the wording is stale twice over, since there are seven such screens at
HEAD and one after A1 — and a HEAD-wide scrub driven from §12 alone would miss it. Item 13 of §13 assigns
the records scrub but not this source-comment scrub.

### F9 — reassigning `REPRESENTATIVE.overlay` to `nowplaying` makes the kind's representative the one screen that carries a decoration

**Severity: Note. Nature: recommendation.**

The reassignment is necessary and the plan's reason for it is correct: leave it at `'options'` and every
"overlay" structural case is exercised by a screen that is no longer an overlay. But
`classifyTransition` emits a `now-playing-pill` decoration whenever `nowplaying` is an endpoint
(`js/swipe.js:108-109`), while every entry in `STRUCTURAL_CASES` declares `decorations: []` and the
fixture header states "decorations `[]` for every structural case".

Today this is safe, and I verified why: the two consumers that build inputs from `REPRESENTATIVE` read a
single field each (`outgoing`, `abortRender`), and the per-pair test that does compare whole constructions
does not use `REPRESENTATIVE` — it derives its inputs from the registry and injects the NP decoration from
the concrete screen name (`test/swipe-transition.test.js:105-107`). The hazard is latent: the next
consumer that deep-compares an `expectedConstruction` built from `REPRESENTATIVE[kind]` will fail on the
overlay row alone, and the failure will read as a production defect.

Recording the constraint in the fixture header — that `REPRESENTATIVE.overlay` carries a decoration
modifier and a whole-construction comparison must inject it — costs one comment and removes the trap. It
is a recommendation; the plan is correct without it.

## Coverage

Every blocking finding maps to verification.

- **F1 (Structural)** — verified by execution: the full `npm test` battery must be green in the same
  commit as the Stage-B production edit. The specific witness is
  `test/swipe-declone-stage1.test.js`'s `NOGHOSTINFLOW` fixture-sanity assertion, which reddens today and
  must read 14. No new cell is owed; the existing suite is the oracle, and the finding is that the plan
  must list the files it edits.
- **F2 (Structural)** — a cell (or cells) covering the narrowed park guard on a gesture-finalize path,
  asserting: `#home` carries `parked` after a committed `home→settings` gesture; `#browse` carries
  `hidden` and `d.browseWillHide` fired exactly once, observed with `#browse` still un-hidden, after a
  committed `browse→settings` gesture; and the same after an **aborted** `settings→browse` gesture. Every
  assertion is class state or call ordering — no geometry, no paint — so the cell can fail in jsdom.
  Mutants: restoring the settings exemption in the park guard must redden the class assertions; moving the
  `d.browseWillHide` call after the `hidden` toggle must redden the observed-un-hidden assertion. §9 and
  §10 must enumerate all three trigger edges.

Non-blocking findings F3, F5, F7 and F8 are prose and comment corrections carried by the plan revision
itself. F4 is a wording correction to invariant S1 and §5.1; `ONEPAGE`'s scope is already right. F6 and F9
are recommendations.

**On the plan's own coverage, and the jsdom caution.** The six proposed cells are non-vacuous and each can
fail. Every one asserts a source fact, a jsdom class-state fact, or a pure-function return; not one asserts
rendered geometry, paint order or a composited result. I checked each against its stated mutant and against
an existing precedent in the suite — `PEERPARK`'s "observed `#browse` still un-hidden at the moment
`d.browseWillHide` ran" assertion is the shape `test/nav.test.js`'s recording dep already implements, so it
is proven implementable rather than merely proposed. The two §16 gates are likewise non-vacuous: 16.1 reads
stylesheet text and fails in both directions (a screen regaining a background enters the painter set;
`.nowplaying` losing its background leaves it), and 16.2 derives the registry rather than restating it, so a
screen added and forgotten reddens it. **I found no proposed cell that could not fail.** The plan's
decision to write no CI cell for occlusion, flash or paint order, and to assign those to §15's device rows
instead, is the correct call and is honestly stated: R-A's residual paint consequence, R-B, R-C, R-E, R-F
and R-G are all genuinely device-owed and are all labelled as such.

## The gate recommendation — adjudicated

The plan proposes: plan review on the whole plan; one adversarial strike on A1's single claim; no strikes
for A2 or B. **I concur with all three, and I would re-aim the strike.**

**Plan review on the whole plan — concur.** This review.

**One adversarial strike on A1 — concur, but not at the notch the plan cuts.** The plan nominates
*"a reachable state in which a settings screen is visible while something other than `body::before` is
behind it."* I struck that by reading and closed it: the writer set is three, each writer's state is
accounted for, and the intra-`setView` window cannot be painted. Sending the adversary at a question a
reviewer has already decided by reading spends the strike on a specimen that will not break.

The residual fracture surface is one layer down, and it is where this project's defects actually live:
**the two writers that unhide a settings screen outside `setView`.** The notch I would cut is —

> Find a reachable interleaving in which a settings screen is un-hidden by `env.renderDestination`
> (`js/app.js:536`) or `Nav.overlayFilmstrip` (`js/nav.js:180`) while `#home` is un-parked or `#browse`
> is un-hidden, **and a frame is painted in that state.** Supersession of one gesture by another, and an
> abort that interleaves with a button-nav, are the likeliest carriers, because they are the two paths
> where the reconcile that would restore the invariant has not run yet.

That is executable, it is the shape of a real counterexample rather than a re-read, and it targets the one
thing my reading could not settle: whether a frame gets painted in a window the source says is synchronous.

**No strike for A2 — concur.** A2 is two deleted declarations whose stated causes are genuinely obsolete
(verified), whose fallback stacking reproduces both old relationships by DOM order (F6), and whose only
inversion is narrower than the plan claims (F5). The residual is compositor behaviour, which a strike
cannot reach and a device gate can. Its own stage with its own gate and an isolated fallback is the right
instrument.

**No strike for B — concur, conditional on F1.** "Provably no construction-value change" is the right
standard and the frozen-spec oracle is the right check, and I verified the arithmetic, the retained rows,
the three trailing counts, the two renamed doc rows and the `overlay→overlay` deletion independently. But
the proof currently runs against an incomplete migration set. With F1 fixed, the frozen-spec oracle is
sufficient and no strike is earned.

**One thing I would add that the plan does not propose.** F2's coverage is owed *before* the A1 device
gate, not after it. Step 2 authors four red cells and step 4 is the device gate that answers the user's
report; if the gesture-finalize cell is written after the device pass, a device-clean A1 will be read as
evidence about paths no test ever drove. That is the shape of the confidence error this project's records
already document.

## Prediction — where this breaks in execution if built as written

**The cheap break, at the Stage-B commit.** The builder rewrites `STRUCTURAL_CASES` to fourteen rows,
runs the suite, and `test/swipe-declone-stage1.test.js` fails on `fixture sanity: there are eight
structural cases`. Ten seconds to diagnose, ten to fix. The cost is not the fix — it is that the plan's
deletion list, which opens by declaring itself the completeness criterion, was not complete, and the next
reader trusts it a little less.

**The expensive break, and the one that will not announce itself.** A1 ships, the device gate passes, and
the reported defect is gone — because the button-nav path is the path the user exercises and the path
`PEERPARK` covers. Weeks later something goes wrong on an aborted swipe out of Options: the Browse virtual
controller deactivates on an edge nobody enumerated, or `#browse` is left in a state the reconcile was
assumed to fix. The suite is green, because no cell ever drove the changed guard through a gesture
finalize. That is precisely how `.106` and `.107` shipped, and it is the reason the code being changed
lives behind injected deps in the first place.

**The prose break.** If §5.1's "impossible by construction" survives into the source comment that replaces
`js/nav.js:76-81`, the next refactor reads a guarantee the code does not make and removes something on the
strength of it. This file's own header records that exact sequence twice, and §1 of the plan records a
third instance — a comment whose premise was false surviving long enough to justify a design. The plan is
unusually good at spotting that class in records it inherited. F4 is the same class in the record it is
about to write.
