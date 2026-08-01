# Plan review — PLAN-swipe-declone.md, Stage 2 (`browse→browse`), round 4

Type: plan-review
Plan: `Claude/Plans/PLAN-swipe-declone.md` — the round-3 fold, landed at `2b6d0ed`
Scope: **F19 and the fold that closed it, only.** Everything else is closed across rounds 1–3 and was
not re-examined: F11, F12, SF2, §12 item 15a, the 164px geometry, the CSS mechanism, both new gates'
failability, both discharged cross-plan conflicts, and the §19.1 assertions spot-checked in round 3.
Round: 4 — the closing round
Reviewed at: HEAD `2b6d0ed`, build `2026-07-31.290`, tree clean
Date: 2026-08-01

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:126-152","js/app.js:350-364","js/app.js:528-568","js/browse.js:155-196","js/browse.js:280-345"],"callee_ranges":["js/swipe.js:222-261","js/swipe.js:276-333"]} -->

## Applicability

- **defining_records: true** — one record decides this round: `Browse.endHold`'s behaviour over the
  whole domain of `currentDesc()`. Round 3 filed it as a GAP; the fold closes it. Struck below against
  source, together with the two records the closure newly leans on (`keyOf`/`pageCache` totality, and
  `showPage`'s park-under-hold).
- **boundary_relocation: true** — the boundary is unchanged from round 3 (ownership of which browse
  page is shown at a gesture's end). Only the rows F19 touches are re-struck; every other row of rounds
  2 and 3 stands unre-examined.
- **callee_replacement: true** — the retired `ghostApp` cluster is **closed at round 3 and was not
  re-examined**. Ranges are declared unchanged so the gate's coverage does not silently narrow between
  rounds. Re-affirmed, not re-derived.
- **contract_shape: true** — round 3's exact-key ruling stands and the fold adds no contract-object
  key. Re-stated below, not re-derived.

## Verdict

Verdict: FORGE — F19 is closed, and closed the way I asked plus one degree better: the fold defines
`endHold` over the whole domain of `currentDesc()` rather than patching the missing case, and it routes
the miss through a probe that **cannot** throw, so the wedge coordinate is shut by construction rather
than by a guard. I could not falsify anything the fold newly asserts. **NATURAL-c can fail**, and I
verified the mechanism it needs exists and is already exercised in jsdom. The mutant recount is right —
I counted it mechanically: 28 before, 29 after, 16 cells. Four residual soft spots (F23–F26), none of
which can make Stage 2 ship wrong or unattributable; each is caught in CI or is a records correction.
They are the builder's to carry, not a gate.

**What survives the strike.**

| Claim | Struck against | Result |
|---|---|---|
| The construction's probe is total — `keyOf(landed)` cannot throw for any value `currentDesc()` returns | `js/browse.js:22-23` against `js/app.js:126`, `:147` | **Confirmed.** `navStack` is seeded `[{v:'home'}]` and `goBack` refuses to pop past the root, so `currentDesc()` always returns a descriptor object. `keyOf` reads `d.author`/`d.book` only on the two branches whose descriptors carry them; every other descriptor takes the `d.v` tail. No accessor on the miss path throws. |
| `Browse.pageElFor` is off the miss path **by construction** | §5.3.6's construction bullet; `keyOf` and `pageCache` are module-scope in `js/browse.js:19-23`, the same closure as `endHold` | **Confirmed structural.** The probe is the cache lookup itself, not a call to the throwing accessor guarded by a check. There is no code path from the miss to `pageElFor` to omit. |
| The wedge coordinate the throw would have hit is real | `js/app.js:1298-1301` | **Confirmed in round 3, unchanged.** It is now unreachable rather than avoided. |
| `endHold` reaches the activation at `js/browse.js:186` on a `browse→home` gesture | `js/browse.js:179-186` with `offscreen` at `:207` | **Confirmed.** No page carries `.parked` on that gesture, so the loop is empty; `activeEntry()` returns the started-from page, which is neither `hidden` nor `parked`; `activate()` **and `_realize()` are called**. The mutant removes a real call. |
| **NATURAL-c can redden** | `test/app-harness.js:609-618`, `:667-669`; `test/browse-virtual.test.js:168-192` | **Confirmed — see the ruling below.** |
| The matrix carried 28 mutants before the fold, not 29 | mechanical count of every `NATURAL`, `NATURAL-<letter>` and `ADDITIVE` in the `vitruvius-coverage` block at `ddb28c7` and at HEAD | **Confirmed.** 20 lettered + 6 bare + `NOAPPCLONE`'s 2 injections = **28** before; 21 + 6 + 2 = **29** after; **16** cells both times. The prior figure was one high and the recount is right. |

## Ruling — can NATURAL-c fail?

**Yes.** This is the claim most worth checking, because the fold rests the whole silent reading on it,
and the assertion that carries it is a **call count** — the one assertion shape that goes vacuously
green when the thing being counted was never constructible.

It is constructible. `test/app-harness.js:609-618` loads the **real** `js/virtuallist.js` into the
harness rather than the default fake, with the reason stated in place: realization "is unobservable
against the fake." The harness then exposes `VirtualList` for "force + metrics knobs after boot"
(`:667-669`). `test/browse-virtual.test.js:168-192` already drives **this exact edge** in jsdom under
`setForceVirtual(true)` — suspend, abort, then `Browse.endHold(tok)` — and asserts at `:190` that
`endHold` is what activates the returning page. So a controller exists, its activation is observable,
and the precedent fixture is written.

Under HEAD on a `browse→home` gesture the count is ≥ 1 (`activate()` then `_realize()` at
`js/browse.js:186`). Under NATURAL-c the landed lookup misses, `shown` is null, and the count is 0.
The two are distinguishable in jsdom with no device and no layout.

**The one precondition the cell does not name is F23.** If the fixture builds a classic (sub-threshold)
page, `el._vctl` is `undefined`, HEAD's count is 0, the mutant's count is 0, and the cell passes on the
defect. That is a fixture defect, not a plan defect, and the mutation sweep reports NATURAL-c as a
**survivor** rather than shipping it — the same containment that made F20 Weak in round 3. It costs the
builder a round at step 9, so it is Weak, and it is worth one clause in the cell so it costs nothing.

---

## Defining records

Only the records this round's question turns on.

| Record | Standing | Reconciliation |
|---|---|---|
| `js/browse.js:164-196` — `endHold`'s body, and its in-place comment that `activate()` "is a no-op for a page that was never suspended … this is the ONE realization the gesture gets" | HEAD source, read directly | **AGREE, and round 3's GAP is closed.** §5.3.6 now defines the function for every value `currentDesc()` can return, and the miss branch preserves this comment's behaviour verbatim rather than dropping the realization. |
| `js/browse.js:22-23` (`keyOf`) + `:19` (`pageCache`) | HEAD source, read directly | **AGREE.** Both are module-scope in `endHold`'s own closure and both are total over the descriptor set. This is what makes the fold's "by construction" claim true rather than aspirational. |
| `js/app.js:126`, `:147` — `navStack` seeded with the root and `goBack`'s `length <= 1` refusal | HEAD source, read directly | **AGREE.** The probe's input is never null, so the miss branch has no null coordinate of its own. |
| `js/browse.js:299-303` — `showPage`'s `classList.toggle('parked', away && holdRows)` | HEAD source, read directly | **CONFLICT with §5.3.6's third bullet, and it is F24.** A page **is** parked mid-drag on `home→browse` and `overlay→browse`, whose aborts land on a non-browse descriptor and therefore take the miss branch. The miss branch is not the no-op case there; it does real work. The bullet's *evidence* (verified at §19.2) is scoped correctly to gestures that leave browse by transform; only the bullet's own heading generalizes past it. |
| `js/app.js:543-544` — `renderDestination`'s `'browse-host'` branch calling `showAppView(dest, true)` | HEAD source, read directly | **AGREE, and it is what makes F24 reachable:** the destination render is what runs `showPage` mid-drag on a `home→browse` gesture. |
| §7's two ledger rows for the landed descriptor and browse-page selection (`Claude/Plans/PLAN-swipe-declone.md:716-717`) | The plan's own record | **CONFLICT with §5.3.6 as corrected, and it is F25.** Both rows still describe the reconciliation as landed-descriptor-only. The Owner and Verification columns are right; the producer/consumer prose is the pre-correction claim. |
| `test/app-harness.js:609-618`, `:667-669` | HEAD source, read directly | **AGREE with the fold's "no new device-owed row".** The harness carries the real virtualizer and the force knob, so the call-count half is decidable at the layer the cell names. |

---

## Value and ownership ledger — the rows F19 moves

Rounds 2 and 3 carry the rest unchanged. **UNOWNED** rows are findings; there are none this round.

| Value | Class | Dir | Producer | Consumer | Owner after the fold | Lifecycle | Verification |
|---|---|---|---|---|---|---|---|
| the landed screen descriptor at hold release | identity | in | `dropRowHold` reading `currentDesc()` after `applyScreen` (`js/app.js:360-364`) | `Browse.endHold`'s reconciliation | the finalize path | per gesture | **Round 3's PARTLY UNOWNED row is now owned over the whole domain.** `LANDEDPAGESHOWS`, both halves. |
| browse page selection after a gesture ends — **landed hits the cache** | behavior | inout | `Browse.endHold` using the landed descriptor | `showPage` and controller activation | `Browse.endHold` | per gesture | `LANDEDPAGESHOWS` browse→browse half + R7 |
| browse page selection after a gesture ends — **landed misses the cache** | behavior | inout | `Browse.endHold` running HEAD's `activeEntry()` inference unchanged | the park loop's `stillShown` (`js/browse.js:179`) and the activation target (`:185`) | `Browse.endHold`, preserving HEAD | per gesture | `LANDEDPAGESHOWS` browse→home half, mutant NATURAL-c. **Owned.** |
| the throw coordinate inside the finalize `finally` | error | out | would have been `Browse.pageElFor` | `js/app.js:1300`'s `if (!ok) finishing = false;` | **eliminated** — no path reaches the throwing accessor from the miss | per gesture | By construction; nothing to gate |
| `session.hold` — the row-hold token | identity | inout | `takeRowHold` (`js/app.js:359`) | `dropRowHold` (`:360-364`) → `Browse.endHold` | the session, unchanged | per gesture | Untouched by the fold |
| `d.live`, `d.dir`, `d.w`, `d.from`, `d.dest` — the session fields inside the declared `start()` range | behavior/identity | in | the arm block | `start()`'s `off`, `snapBrowse`, `buildConstruction(d.from, d.dest, env)` | the session, unchanged | per gesture | Untouched by the fold; carried from round 3 |
| `d.movers` — the mover list `start()` writes at `js/app.js:568-569` from the construction's two slots plus any decoration | identity | out | `start()` mapping `c.movers` through `toMover` | the drag transform writes at `js/app.js:594` and `:615` | the session | per gesture | **Unchanged by this fold, and the reason it is listed:** F19 concerns `endHold`'s reconciliation *after* the gesture ends, which never reads `d.movers`. The `browse→browse` element identities that flow into this list were settled at round 3 (F11, `MOVERSDISTINCT`) and were not re-examined. |
| `document.body.classList` token `np-locked` | behavior | inout | `js/app.js:551` (the NP branch inside `env.renderDestination`), `js/nav.js:72` | the navbar button/pill swap | unchanged — the fold adds no NP path | per NP transition | Verified unchanged against the declared range |

---

## Callee behaviour — the retired `ghostApp` cluster

**Closed at round 3 and not re-examined this round.** Ranges are re-declared so coverage does not
narrow silently between rounds. As filed in rounds 1–3: in the declared ranges the only live-element
write is `wrap.className = 'nav-ghost'` on the builder's own wrapper; the one pre-mount attribute effect
is the **`data-art`** strip at `js/swipe.js:222`, which §8 assigns; every other mutation targets the
detached clone; no `classList` mutation on a live element and no `d.<field>` write in either range. The
round-3 fold touched none of it.

## Contract shape

**Round 3's ruling stands and this fold adds nothing to it.** `Browse.endHold`'s positional argument and
`Browse.pageElFor`'s export are module-surface changes, not contract-object shapes, so neither is
exact-key gated; `finalizationPlanFor`'s `CONTRACT` registration
(`test/contract-function-gate.test.js:33`, `keys: ['abortRender']`) still ships in the same commit as
the function; the two new enum *values* change no key. The fold adds no contract member, so D10's
pre-FORGE consumer verification has nothing new to check.

---

## Findings

No Fatal. No Structural. Four Weak/Note, none blocking.

### F23 — Weak, defect: `LANDEDPAGESHOWS`'s call-count assertion goes vacuously green unless the fixture forces virtualization

The new half's sole killer for NATURAL-c is "the controller activation call count for the started-from
page equals the count HEAD produces." A browse page only carries `_vctl` past
`VirtualList.FULL_RENDER_MAX`, or under `setForceVirtual(true)`. On a classic page, `js/browse.js:186`'s
guard `shown.el._vctl` is falsy, HEAD's count is 0, the mutant's count is 0, and the cell passes on the
defect — the count-nothing-and-compare-it-to-nothing shape.

The machinery to avoid it is already in the harness and already used for this precise edge
(`test/app-harness.js:667-669`; `test/browse-virtual.test.js:170`, `:189-190`), so this costs a clause,
not a design. **Recommendation, not a requirement:** name the precondition in the cell's fixture field —
the started-from page is built under forced virtualization, or the assertion spies `_vctl.activate` on a
page that has one. The builder may satisfy it another way; what the cell should not do is leave the
precondition unstated when the mutant's only channel depends on it.

Not blocking: an unforced fixture leaves NATURAL-c **surviving**, and the mutation sweep reports a
survivor. This costs a round at step 9, exactly as F20 did in round 3; it cannot ship.

### F24 — Weak, defect: §5.3.6's "the miss branch preserves the no-op case" is false for an aborted `home→browse`

The third bullet of the new paragraph states, as a heading over the whole miss branch, that what it
preserves "is already the no-op case," and justifies it with the browse-leaving gesture: `showPage`
never runs, no page is parked, the loop iterates to nothing.

That justification is correct and correctly scoped in §19.2. The heading is not. The miss branch also
covers an **aborted `home→browse`** and an aborted `overlay→browse`: the destination render ran
mid-drag (`js/app.js:544` → `showPage`), which parks the previously-shown browse page
(`js/browse.js:301`), and the abort lands on a non-browse descriptor, so `keyOf` misses. There the park
loop does real work — it un-parks that page and adds `.hidden` to it, because `activeEntry()` is the
destination page the render revealed. That is HEAD's behaviour and preserving it is right; it is simply
not a no-op.

The **requirement is unaffected**: the construction bullet directly above says the miss runs HEAD's
inference unchanged "for both the park loop's `stillShown` and the activation target," which is exactly
correct for this case too. Only the justification over-generalizes. It matters because a reader who
takes "the miss branch is a no-op" literally writes an early return, which strands a parked page
off-viewport after an aborted `home→browse`. **Recommendation:** qualify the heading to gestures that
leave browse by transform, and name the aborted-into-browse case as the miss that does real work.

Not blocking: an early-return miss branch also drops the `browse→home` activation, which NATURAL-c
reddens on, so the wrong reading is caught in CI before the device.

### F25 — Weak, defect: §7's two ledger rows still state the pre-correction claim

`Claude/Plans/PLAN-swipe-declone.md:716-717` describe the landed descriptor as consumed by "`Browse.endHold`
reconciling park and hide and activation" and browse-page selection as produced by "`Browse.endHold`
using the landed descriptor," with no miss branch in either row. The Owner and Verification columns are
right; the producer/consumer prose is what §5.3.6 said before this fold.

This is the value-crossing ledger cell — one of the seven surfaces a corrected finding has to be swept
across, and the one this fold missed. The fold swept D6's *Landing* clause, §4's MOVES line, §14, §18
and §19.2, and stopped one surface short. **Recommendation:** split the second row in two, or add the
miss branch to both, so the ledger states the same domain the specification does.

Not blocking: the ledger is a summary of the specification, the cell that gates the row already covers
both halves, and NATURAL-c reddens on a builder who implements only the row.

### F26 — Note, defect: §18 Round 3's "not stated as a universal anywhere in the plan" is contradicted by §18 Round 2's own entry

The Round 3 record says D6's Landing clause and §4's MOVES line "are qualified to match, so the
invariant is not stated as a universal anywhere in the plan." Both qualifications are real and I
verified them. But `:1496-1500` — the Round 2 entry, four lines above — still states D6 unqualified:
`endHold` "is told the landed screen and reconciles park, hide and [activation]," and "that also removes
an existing inference."

Leaving a dated round's record as that round wrote it is correct; §18 is history, and rewriting it would
falsify the sequence. The overclaim is the Round 3 sentence's scope. **Recommendation:** narrow it to
the plan's live specification surfaces (§4, §5, §5.3.6, §7, §14), which is what it actually establishes.

---

## Round-3 findings — disposition

| Finding | Disposition |
|---|---|
| **F19** (Structural) | **CLOSED, and by the stronger construction.** §5.3.6 defines `endHold` over every value `currentDesc()` can return; the miss preserves HEAD's `activeEntry()` inference for both the park target and the activation target; the throwing accessor is off the path **by construction**, not by a guard, because the probe *is* the non-throwing cache lookup. The four shipped Stage-1 transitions are unchanged by the specification. Residuals F24 and F25 are surface corrections, not a re-opening. |
| **F20** (Weak) | **RESOLVED.** The third assertion moves to the app-harness layer, the mutant's description names the app-side `env` literal as its site, and the layer field records the split (`unit … for the first two mutants plus app harness over the real env literal for the third`). `test/swipe-stage5-wiring.test.js` is the right precedent and the plan cites it for the right reason. |
| **F21** (Weak) | **RESOLVED, and better than asked.** The false reason is corrected **in place with its falsification stated**, rather than deleted, and the requirement is retained unchanged with its ground restated as cache residency. The §5.3.6 sibling sentence is corrected to match — the sweep I would have had to ask for was already run. |
| **F22** (Weak) | **RESOLVED.** `MOVERHASBOX`'s invariant is narrowed to the id-resolved hosts, the idless `Browse.pageElFor` path is named as the reason, and `PAGEISVIEW` is named as the page's cover with the two declarations it pins. |
| **The commit half's load-bearing note** | **RECORDED as specified** (§14). It states the asymmetry correctly: an abort mutates neither stack so `currentDesc()` is identical across `applyScreen` and NATURAL-b is invisible on it; the commit's stack mutation at `js/app.js:817-820` sits ahead of the read, so only the commit kills it. The "do not simplify it away" framing is the right shape for a note whose whole purpose is to survive a future tidy-up. |
| **The class note** | **RECORDED** (§18 Round 3). Names the class — a change to a shared function or value is specified for every caller it already has — identifies F19 as the fourth instance, and names the three priors (the CSS/JS half split, `abortRender`'s two jobs, the `finPlan` reader list). The observation that the durable defence is domain-completeness rather than a wider sweep is the correct generalization. |
| **The two self-corrections beyond the list** | **VERIFIED.** D6's *Landing* clause (`:216-225`) and §4's MOVES line (`:157-161`) are both qualified, and the qualification is the right one. The **recount is correct**: counted mechanically over the coverage block at `ddb28c7` and at HEAD — 20 lettered + 6 bare + 2 `NOAPPCLONE` injections = 28 before, 29 after, 16 cells. Recounting rather than incrementing was the right move and it produced the right number. |
| **No new device-owed item** | **CONFIRMED.** Both halves of the new fixture assert class state and a call count. Class state is trivially jsdom-decidable; the call count is decidable because the harness loads the real virtualizer and exposes the force knob. Step 10b's re-confirmation of the four Stage-1 transitions remains the backstop, not the primary. |

---

## Coverage

**No blocking findings.** The four residuals map as follows, all inside work already scheduled.

| Finding | Verification | Layer |
|---|---|---|
| F23 | One clause in `LANDEDPAGESHOWS`'s fixture field naming forced virtualization (or an `activate` spy on a page that has a controller). Verified at step 9 when NATURAL-c is killed rather than survives. | records + integration |
| F24 | Qualify §5.3.6's third bullet to browse-leaving gestures and name the aborted `home→browse` miss. Records only. | records |
| F25 | Split or extend §7's two ledger rows to carry the miss branch. Records only. | records |
| F26 | Narrow §18 Round 3's scope sentence to the live specification surfaces. Records only. | records |

---

## Prediction — where this breaks in execution if built as written

The builder writes step 10 and `endHold` takes its argument. The miss branch is a two-line cache probe
with HEAD's existing body behind it, so `browse→home`, `browse→overlay` and both aborts into browse
behave as they did; nothing wedges, because there is no throwing call on that path to wedge on. That
was round 3's expensive prediction and it is now unreachable.

The residual cost lands at step 9, not step 10b, and it is one round: the `LANDEDPAGESHOWS` fixture is
written against a classic page, NATURAL-c survives the sweep, and the builder adds
`setForceVirtual(true)` — the same knob `test/browse-virtual.test.js` already uses eleven lines from the
assertion it needs. That is a caught, attributable, cheap failure, which is what the whole four-round
sequence was buying.

**The assumption I would watch, and it is not a defect.** The miss branch's correctness rests on
"HEAD's behaviour on these four transitions is right," which is evidence from the device, not from the
plan. If step 10b surfaces something wrong on `browse→home`, the miss branch is the wrong place to look
— it is specified to change nothing there — and the plan should be read as saying so.

## What I could not test

- Whether `LANDEDPAGESHOWS`'s new half kills NATURAL-c **in fact**. I established that it *can*: the
  distinguishing observable exists, is non-zero at HEAD, is zero under the mutant, and is already
  asserted in jsdom by an existing test at the same seam. Executing it is step 8's, and F23 names the
  one fixture property that decides it.
- Anything requiring WebKit. Unchanged from round 3: R8's retention, overlay-scrollbar behaviour,
  scroll anchoring at the park/un-park edge, and whether an off-viewport absolutely-positioned mover
  paints. Round 2's Blink measurements stand and are not asserted for WebKit.
- Whether a **third** reading of the non-browse landing exists beyond the two I filed. The fold is
  honest about this in §19.2's closing paragraph, and defining the whole domain is the construction that
  makes the question stop mattering: any reading that is not "leave it as HEAD leaves it" is outside the
  specification, whether or not anyone enumerated it.
