# Plan review — PLAN-swipe-declone.md, Stage 2 (`browse→browse`), round 3

Type: plan-review
Plan: `Claude/Plans/PLAN-swipe-declone.md` — the round-2 fold, landed at `6e37b25`
Scope: **the fold only.** Confirm that round 2's findings are resolved and that the fold introduced
nothing false. Stage 1 (shipped, device-confirmed), the CSS mechanism (measured clean in round 2), and
both discharged cross-plan conflicts are not re-opened.
Round: 3 — the closing round
Reviewed at: HEAD `6e37b25`, build `2026-07-31.290`, tree clean
Date: 2026-08-01

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/swipe.js:96-116","js/swipe.js:354-408","js/app.js:355-364","js/app.js:420-432","js/app.js:450-490","js/app.js:532-561","js/app.js:806-822","js/app.js:1255-1301","js/browse.js:155-211","js/browse.js:280-345","js/browse.js:480-500","css/app.css:86-91","css/app.css:805-814"],"callee_ranges":["js/swipe.js:222-261","js/swipe.js:276-333"]} -->

## Applicability

- **defining_records: true** — the fold newly reconciles four records it had not read in the reworked
  form (`js/swipe.js:96-116`, `js/browse.js:205-211`, the `endHold`/`showPage` pair, and the five
  `finPlan` readers). Each is struck below. Both cross-plan conflicts are discharged at `41f2933` and
  are not re-opened.
- **boundary_relocation: true** — the fold moves a second boundary on top of round 1's scroller
  relocation: **mover identity** for both `browse→browse` ends, and **ownership of which browse page is
  shown at a gesture's end**. Ledger below covers only the values the fold moves; round 2's ledger
  covers the scroller relocation and is unchanged.
- **callee_replacement: true** — the retired `ghostApp` cluster is unchanged by the fold. Declared
  ranges match rounds 1 and 2. Re-affirmed rather than re-derived; the one pre-mount effect is the
  `data-art` strip and §8 still assigns it.
- **contract_shape: true** — the fold adds two enum values (`sourceHost`/`destinationHost` gain
  `'browse-page'`), one exported accessor (`Browse.pageElFor`) and one argument (`Browse.endHold`'s
  `landed`). Exact-key gate impact below.

## Verdict

Verdict: TEMPER — the fold resolves every round-2 finding and I could not falsify one of its nineteen
newly-asserted claims, but it changes the signature of `Browse.endHold`, which runs on **every**
gesture, and specifies its new behaviour only for the case where the gesture lands on a browse page.
One Structural finding (F19) and three Weak (F20–F22). **The fix is one paragraph in §5.3.6 and one line
in `LANDEDPAGESHOWS`** — this is a tightening, not a rework, and nothing else in the fold needs to move.

**What survives the strike, and it is the whole of the fold's substance.** I checked the two cells the
brief singles out and both can fail on the defect they name; the third defect the fold found on its own
is real; and the arithmetic correction is right.

| Claim | Struck against | Result |
|---|---|---|
| F11 is real: both `browse→browse` mover slots resolve to `#browse` | `js/swipe.js:99-101` → `:357`, `:365`, `:387` → `js/app.js:541`, `:544` → `js/nav.js:36` | **Confirmed, every citation exact.** `sourceHost` is `'in-flow'`, `destinationHost` is `'browse-host'`, and both resolve to `d.byId('browse')`. |
| **`MOVERSDISTINCT` can fail on the defective construction** | the cell's assertions against the real `classifyTransition` | **Confirmed — and it is killed three ways over.** See F20 for the one mutant that escapes. |
| SF2 is real: the abort leaves the wrong list on screen | `js/browse.js:179-183` with `offscreen` at `:207` | **Confirmed by execution trace.** Source `.parked`, destination shown → `activeEntry()` returns the destination → `stillShown` is the destination → the loop un-parks the source and **adds `hidden` to it**. The fold's description is exact. |
| **D6's landing cell can fail on SF2** | `LANDEDPAGESHOWS`'s two mutants against the abort and commit paths | **Confirmed, both halves.** See below. |
| §12 item 15a: five `finPlan` readers, two outside the list | `js/app.js:428`, `:459`, `:484`, `:1229`, `:1261` | **Confirmed, all five, exact.** `:484` produces the field and `:459` reads it on the hard reset; deleting `finalizationPlanFor` without them makes `cur.finPlan.abortRender` a read on `undefined` and every settle throws. |
| The height loss is `T + B` = **164px**, not `2·(T + B)` | re-derived and cross-checked against round 2's measurement | **Confirmed.** `(744−110−54) − (744−220−108)` = `580 − 416` = `164` = `T + B`. The corrected figure is right and the conclusion is unaffected. |

**`MOVERSDISTINCT` fails on the defect, and the brief's worry does not apply here.** The reason
`MOVERHASBOX` and `NOGHOSTATALL` were green on the defective construction is that neither asserts
anything about mover *identity*; this cell does, and identity is decidable in jsdom. Under the
defective projection (`sourceHost: 'in-flow'`), the cell's "each mover carries the `browsepage` class
and is not the browse host" clause reddens on the outgoing slot, and its second clause — "the
classification pins `sourceHost` and `destinationHost` to `browse-page` for that pair only" — reddens
on the real `classifyTransition` with no env involved at all. Independently, the frozen spec's
`expectedHosts` row for `browse→browse` (`test/fixtures/swipe-plan-spec.mjs:62`, asserted at
`test/swipe-transition.test.js:234-241`) reddens on the same mutation. Three independent reddenings on
the F11 defect. This is not a gate that cannot fail.

**`LANDEDPAGESHOWS` fails on SF2, and its second mutant is killed by the half that looks redundant.**
NATURAL-a *is* SF2: with the inference retained, the abort leaves the destination shown and the source
`.hidden`, so the cell's "the books page carries neither `parked` nor `hidden`" clause reddens.
NATURAL-b — the landed descriptor read too early — is invisible on the **abort** path, because an abort
mutates neither `navStack` nor `fwdStack`, so `currentDesc()` is identical before and after
`applyScreen`. It is killed by the **commit** half: the stack mutation is at `js/app.js:817-820`, ahead
of `applyScreen`, so a too-early read yields the source and the cell's mirror-image assertion reddens.
The cell's "then repeat with a COMMIT" clause is therefore load-bearing rather than symmetry, and it is
worth the plan saying so. The fixture is also constructible: `test/swipe-stage6d.test.js:113-118`
already drives a real abort through settle and finalize on the app harness.

**Two mechanisms I traced because a wrong answer would have been expensive, and both came back clean.**
The park-then-clear ordering has no paint in it — `runFinalize` clears the inline transform at
`js/app.js:816`, the abort's `applyScreen` runs at `:1261`, and `dropRowHold()` runs in the `finally` at
`:1299`, all inside one synchronous `finalize()`, so the source page cannot flash to
`translateX(-101vw)` between the clear and the un-park. And `evictLRU` (`js/browse.js:335-343`) cannot
take the outgoing page mid-drag, as the fold says.

---

## Defining records

Only records the fold newly relies on. Rounds 1 and 2 settled the rest.

| Record | Standing | Reconciliation |
|---|---|---|
| `js/swipe.js:96-98` — "the single place the kind→host mapping policy lives", pinned per structural case in the frozen spec's `expectedHosts` | Ratified source comment, read directly | **AGREE, and it is why the fold's construction is the right one.** Extending the projection rather than re-pointing `appViewEl` obeys the comment; a second mapping would be the divergence it exists to prevent. The frozen spec then makes the change self-enforcing, exactly as §6's migration note claims. |
| `test/fixtures/swipe-plan-spec.mjs:59-66` — `expectedHosts` for all eight structural cases | Live gate, independent hand-written oracle | **AGREE.** Row `:62` carries `sourceHost: 'in-flow', destinationHost: 'browse-host'` today and must change to `'browse-page'` on both. Verified the assertion consumes it (`test/swipe-transition.test.js:234-241`). |
| `js/browse.js:155-160` (`beginHold`) + `js/app.js:535` (`takeRowHold`) + `:360-364` (`dropRowHold`) + `:461`, `:1299` (its two call sites) | HEAD source, read directly | **CONFLICT with §5.3.6's `endHold(token, landed)` specification, and it is F19.** `takeRowHold()` is unconditional in `start()`, `beginHold` sets `holdRows = true` unconditionally, and `dropRowHold` calls `Browse.endHold` whenever `session.hold` is truthy — so `endHold`'s body runs on **every** gesture, `browse→home`, `browse→overlay`, `home→browse` and `overlay→browse` included. The fold specifies `landed` only for a browse landing. |
| `js/browse.js:156-159` — `beginHold`'s own comment: "a page that is never hidden during the gesture (swiping back to Home moves the real `#browse` by transform, so `showPage` never runs)" | Ratified source comment | **CONFLICT, and it sharpens F19.** The hold mechanism's own rationale names the `browse→home` gesture as the case a piece of it exists for. That is precisely the case `endHold`'s new argument does not cover. |
| `js/app.js:1266-1270` — the `try`/`finally` comment: "so the row hold can never be stranded … A finally covers every return AND the throw" | Ratified source comment | **AGREE, with a boundary the fold must respect.** The protection covers a throw inside `runFinalize`, not one inside `dropRowHold` — a throw there propagates past `if (!ok) finishing = false;` at `:1300`. Relevant because `Browse.pageElFor` is specified to throw. (The fold cites this comment as `:1266-1271`; `:1271` is `endOwnership`, so the range is one line long. Immaterial to the claim.) |
| `js/browse.js:205-211` — `offscreen()`/`activeEntry()`, "exactly one browse page is non-offscreen" | Ratified source comment | **AGREE.** The fold's claim that it becomes a constraint is right, and the four consumers it names are the four that exist (`endHold` at `:179` and `:185`, the view-level `deactivate`/`activate` at `:332-333`, the realize path at `:379`, and the late-fetch guard at `:546`). |
| `js/app.js:428`, `:459`, `:484`, `:1229`, `:1261` — the five `finPlan` readers | HEAD source, read directly | **AGREE with §12 item 15a.** All five confirmed at the cited lines; the comment mention sits at `:428`, inside the cited `:425-429`. |
| `css/app.css:86-91` — `.browsepage.parked` | HEAD source, read directly | **AGREE.** `transform: translateX(-101vw)`, `overflow: hidden`, `pointer-events: none`, `z-index: 0`, and **no `!important`** — so the inline drag transform wins the cascade, as §5.3.6 says and `PARKLOSESTRANSFORM` gates. |
| `css/app.css:811-814` — the native-scrollbar suppression list | HEAD source, read directly | **AGREE.** By id (`html, body, #home, #browse, #options, …`), no `.browsepage`. F17's subject, now in §9 item 4's commit set. |
| `js/browse.js:487`, `:499` — `showPage` on the cache-hit and cache-miss paths | HEAD source, read directly | **AGREE.** Both calls precede the `try {` that opens the fetch, so the incoming page node exists synchronously when `renderDestination` returns, on both paths. |
| **GAP** | — | No record states what `Browse.endHold` does when the gesture lands on a screen that is not a browse page. At HEAD the question does not arise, because the answer is inferred from `activeEntry()`. The fold removes that inference. This is F19. |

---

## Value and ownership ledger — the values the fold moves

Round 2's ledger covers the scroller relocation and stands. These are the rows the fold adds or changes.
**UNOWNED** rows are the findings.

| Value | Class | Dir | Producer | Consumer | Owner after the fold | Lifecycle | Verification |
|---|---|---|---|---|---|---|---|
| the `browse→browse` outgoing mover element | identity | out | `env.sourceEl('browse-page', v)` → `Browse.pageElFor` | the outgoing mover slot (`js/swipe.js:365`), then the drag transform writes | the `classifyTransition` host projection | per gesture | `MOVERSDISTINCT` + R7. **Round 2's UNOWNED row is now owned.** |
| the `browse→browse` incoming mover element | identity | out | `env.renderDestination(dest, 'browse-page')` → `Browse.pageElFor` | the incoming mover slot (`js/swipe.js:387`) | the `classifyTransition` host projection | per gesture | `MOVERSDISTINCT` + R7. **Owned.** |
| `d.from` / `d.dest` — the pair the projection keys on | identity | in | the arm block (`js/app.js:482`) | `classifyTransition` via `buildConstruction(d.from, d.dest, env)` | the session | per gesture | Verified: the pair, not either kind alone, is what selects `'browse-page'`. |
| `d.dir` — drag direction, and `d.live` | behavior | in | the arm block | `start()`'s `off`, and the hard reset's `cur.live &&` guard at `:459` | the session, unchanged | per gesture | Verified untouched by the fold. `d.live` is one of the two conjuncts §12 item 15a deletes with the field. |
| the landed screen descriptor at hold release | identity | in | `dropRowHold` reading `currentDesc()` after `applyScreen` | `Browse.endHold`'s park/hide/activate reconciliation | the finalize path (`js/app.js:360-364`) | per gesture | **PARTLY UNOWNED — F19.** Owned for a browse landing (`LANDEDPAGESHOWS`); unstated for a home or overlay landing, which is every Stage-1 transition. |
| browse page selection after a gesture ends | behavior | inout | `Browse.endHold` using the landed descriptor | `showPage` and the virtual controller activation | `Browse.endHold` | per gesture | `LANDEDPAGESHOWS` + R7 for `browse→browse`; **no cell and no derivation for a non-browse landing — F19.** |
| virtual-controller activation at hold release | behavior | out | `endHold`'s `shown = activeEntry()` (`js/browse.js:185`) → `activate()` + `_realize()` | the page's rows, against the settled scroll | **UNOWNED after the fold — F19.** The fold removes the `activeEntry()` inference and replaces it only for a browse landing. | per gesture | F19 |
| `document.body.classList` token `np-locked` | behavior | inout | `js/app.js:551` (the NP render branch inside `env.renderDestination`), `js/nav.js:72` | the navbar button/pill swap | unchanged — the fold adds no NP path and the `'browse-page'` branch is disjoint from the overlay branch | per NP transition | Verified against the declared range; §10's "UNTOUCHED" still holds. |
| `Browse.pageElFor` — the page accessor | resource | in | `Browse` | both `'browse-page'` host branches in the app-side `env` literal | `Browse` (an export, not an injected reference) | session | Verified: §7's "no second injected pointer into `js/browse.js`" survives, because the value leaves `Browse` rather than entering it. |

---

## Callee behaviour — the retired `ghostApp` cluster

Unchanged by the fold, and re-affirmed rather than re-derived. In the declared ranges the only live-element
write remains `wrap.className = 'nav-ghost'` on the builder's own wrapper; the one pre-mount attribute
effect is the **`data-art`** strip at `js/swipe.js:222`, which §8 assigns; every other mutation targets
the detached clone. No `classList` mutation on a live element and no `d.<field>` write in either range.
The fold's one addition here is a sequencing claim, not a behavioural one: `ghostApp`'s
`#browse.scrollTop` read at `js/swipe.js:324` makes the clone a live consumer of the retired scroller,
which is F12's basis and is correct.

## Contract shape

Re-checked for the fold's three additions and I found no defect. `finalizationPlanFor`'s
`CONTRACT` registration at `test/contract-function-gate.test.js:33` (`keys: ['abortRender']`) still must
go in the same commit as the function. `buildConstruction`'s registration is `NON_CONTRACT`
(`:42-44`) and prose-only, so removing `capture` does not trip the **exact-key** gate — and adding
`'browse-page'` to two enum *values* changes no key on any contract object, so the exact-key gate does
not see the fold's additions either. `constructionPlanFor` keeps all four keys with `renderDestination`'s
value domain widening. `Browse.endHold`'s new positional argument and `Browse.pageElFor`'s new export
are module-surface changes, not contract-object shapes, so neither is exact-key gated; the fold is right
to carry them in §10's migration table instead. The frozen spec's `expectedHosts` is the oracle that
actually enforces the enum change, and §6's migration note says so correctly.

---

## Findings

### F19 — Structural, defect: `Browse.endHold` gains an argument on a path that runs for every gesture, and the fold specifies its behaviour only for a browse landing

`endHold` is not a `browse→browse` function. `takeRowHold()` is unconditional in `start()`
(`js/app.js:535`), `beginHold` sets `holdRows = true` unconditionally (`js/browse.js:155-156`), and
`dropRowHold` calls `Browse.endHold(t)` whenever `session.hold` is truthy (`js/app.js:360-364`) — from
both the finalize `finally` (`:1299`) and the hard reset (`:461`). So `endHold`'s body runs on
`browse→home`, `browse→overlay`, `home→browse` and `overlay→browse` as well, all four of which are
**shipped and device-confirmed**.

Every statement the fold makes about `landed` presumes it names a browse page: §5.3.6 ("it reconciles
`.parked`/`.hidden` and controller activation against **that page**"), the contract block
(`Browse.endHold(token, landed) -> void`), the ledger row, and `LANDEDPAGESHOWS`, whose fixture is
`browse→browse` only. `keyOf({ v: 'home' })` returns `'home'` (`js/browse.js:22-23`), which is a cache
miss, so there is no page to reconcile against — and the fold explicitly **removes** the fallback it
would otherwise have: "That also removes an existing inference — `endHold`'s `stillShown =
activeEntry()`" (§18 round 2 SF2).

Two admissible readings of the unstated case, with different costs, and the plan chooses neither:

- **Resolve `landed` through `Browse.pageElFor`.** That is the one accessor the fold introduces for
  "the page element for a descriptor", and it is specified to **throw** rather than return null. A throw
  inside `dropRowHold` is inside the `finally` at `js/app.js:1299` and therefore *past* the protection
  that block exists to give: `if (!ok) finishing = false;` at `:1300` never runs, so `finishing` stays
  true and **every future swipe is wedged**. The comment at `:1266-1270` is explicit that the `finally`
  covers a throw in `runFinalize`; it does not cover a throw in the release itself.
- **Treat a missing landed page as "no page is shown".** Then `shown` is null and the
  `activate()` + `_realize()` at `js/browse.js:185-186` never runs on a `browse→home` gesture. That call
  is described in place as "the ONE realization the gesture gets, against the settled scroll", and it
  exists because `showPage` deliberately defers activation for a page returning from suspended. Losing
  it changes virtual-list realization on a shipped transition.

The second reading is the dangerous one, because it is silent. Its symptom is browse rows
re-materializing on return from Home — which lands in step 10b's checklist beside R5's abort-repaint
attribution problem, R-H/R8's retention question, and the scroller relocation, with no named cause among
them. That is the *unattributable* failure this stage is sequenced specifically to avoid.

**The invariant, not the implementation.** `Browse.endHold`'s behaviour is defined for **every** value
`currentDesc()` can return, not only for a browse descriptor, and a gesture that lands outside browse
must leave the browse page state and controller activation exactly as HEAD leaves them — because those
four transitions are shipped and device-confirmed and Stage 2 is not chartered to change them.
**Recommendation, not a requirement, and the builder may satisfy the invariant otherwise:** the smallest
form is one sentence saying that a non-browse `landed` reconciles against no page and preserves HEAD's
`activeEntry()`-based activation, with `Browse.pageElFor` explicitly *not* on that path. A second
`LANDEDPAGESHOWS` fixture row — abort and commit a `browse→home` and assert the browse page state and
the activation call count match HEAD — is what makes it more than a sentence. The choice is the
planner's; what the plan cannot do is add an argument to a function on four shipped paths and describe
it for one.

### F20 — Weak, defect: `MOVERSDISTINCT`'s third mutant is not reachable at the layer the cell is specified at

The cell is specified as "unit construction seam **against a fake env**", and that is the right layer for
its first two mutants. NATURAL-c is not: "the `browse-page` destination branch returns the host element
instead of the page element" describes the branch in **`js/app.js`'s `env` literal** (`:543-555`), which
a fake-env cell never executes. Every construction-seam fixture in the suite hand-writes its env
(`test/swipe-construction.test.js:63-90`, `test/browse-decouple.test.js`'s `mkGhostEnv`), so mutating
the real branch to `return $('browse')` leaves `MOVERSDISTINCT` green.

Nor does another cell reach it. `MOVERHASBOX` is green because `#browse` generates a box.
`LANDEDPAGESHOWS` is green because `showAppView(dest, true)` still runs, so page class state and
activation are identical whichever element the branch returns.

The consequence is bounded — the mutation sweep reddens on a surviving mutant, so this costs the builder
a round at step 9 rather than shipping — which is why it is Weak rather than Structural. The plan should
either move that one assertion to the app-harness layer (where `test/swipe-stage5-wiring.test.js`
already drives the real `env` literal) or drop NATURAL-c and name the app-side branch's protection
explicitly. What it should not do is state "expected killing cell for ALL THREE is `MOVERSDISTINCT`"
when one of the three is out of the cell's reach.

### F21 — Weak, defect: §9 item 1's new justification is false under the fold's own construction

The fold reverses item 1 from "less load-bearing after Stage 2" to "**more** load-bearing, not less" and
gives this reason: "The destination render calls `showPage(destKey)`, which marks the outgoing page
`.parked`; resolving the source afterwards would have to pick it out of a set where the visible-page
inference no longer names it."

`env.sourceEl('browse-page', v)` resolves through `Browse.pageElFor(desc)`, which §5.3.6 defines as "the
cached `.browsepage` node for `keyOf(desc)`" — a keyed cache lookup, wholly independent of `.parked`,
`.hidden` and `activeEntry()`. Resolving after the render would return the identical node. There is no
visible-page inference in the new path; removing one is the fold's own point.

The **requirement** is right and unchanged — nothing in the code moves, and item 1's original ground
(the source `#browse` being clobbered by the mid-drag render) is what the ordering has always protected.
Only the new reason is wrong, and it is wrong in a way that teaches the next reader that source
resolution depends on visibility, which is what F19's other half already makes fragile. Correct the
sentence, or restate item 1's ground as the descriptor-keyed lookup requiring the source page to still
be *in the cache* — which `evictLRU` already guarantees, as §11 says.

### F22 — Weak, defect: `MOVERHASBOX`'s derived host set no longer covers every element a swipe can resolve as a mover

The cell's stated invariant is "**every** element a swipe can resolve as a mover generates a principal
box", and its derivation is "the ids `appViewEl` and `overlayEl` and `viewElFor` can return plus the
browse host returned literally by the browse-host render branch". The fold adds a fourth resolution
path — `Browse.pageElFor` behind the two `'browse-page'` hosts — that returns an element with **no id**,
so the derived set does not contain it and the cell's completeness claim stops being true in the same
commit that makes `.browsepage` a resolvable mover.

No coverage hole follows in fact: `PAGEISVIEW` pins the `.browsepage` base rule's `position: absolute`
and `inset: 0` textually against the retired host rule, so a change that made a page boxless would
redden there. That is why this is Weak. But the fold's own §14 note explains at length why
`MOVERSDISTINCT` had to exist — because two cells were green on the defect they appeared to cover — and
this is the same shape one row up. Either extend `MOVERHASBOX`'s derivation to the new accessor, or
narrow its stated invariant to the id-resolved hosts and name `PAGEISVIEW` as the page's cover.

---

## Claims spot-checked — not a finding, a verification record

Recorded so the checks are not repeated. I read the fourteen §19.1 rows whose subject is load-bearing
and confirmed each against HEAD at the cited lines: the mover-resolution chain (all seven citations
exact); `classifyTransition` as the single policy site; `start()`/`move()`'s transform-write asymmetry
and why one element in two slots produces a single translated view; `takeRowHold` at `:535` preceding
`buildConstruction` at `:560`; `showPage`'s park-not-hide under a hold and its suspend-not-deactivate
loop; `showPage` running synchronously before the first `await` on both cache paths; the abort re-render
as the only restorer of page selection; `endHold`'s `activeEntry()` inference at `:179`/`:185`; the hold
released after the synchronous `applyScreen`; `.browsepage.parked` carrying no `!important`; the `T + B`
re-derivation; the five `finPlan` readers; `dropRowHold` as the single wrapper with both paths applying
the screen first; `Browse.reset`'s `dropHold` invalidation; `evictLRU`'s exclusion of the rendered key;
and the absence of any `$('browse').scrollTop` write in `js/`. One citation is a line long
(`:1266-1271` for a comment ending at `:1270`) and nothing turns on it. §19.1's closing paragraph —
that the list proves the named surfaces were read, not that the enumeration is complete — is the
correct statement of what it establishes.

---

## Coverage

Every blocking finding, mapped to what would verify it.

| Finding | Verification | Layer |
|---|---|---|
| **F19** | One sentence in §5.3.6 defining `endHold`'s behaviour for a non-browse `landed`, plus a second `LANDEDPAGESHOWS` fixture row: abort and commit a `browse→home`, and assert the browse page's class state and the controller-activation call count match HEAD. Both halves are jsdom-decidable (class state and call counts), so this needs no device row — step 10b's existing re-confirmation of the four Stage-1 transitions remains the backstop, not the primary. | records + integration (app harness) |
| F20 | Move `MOVERSDISTINCT`'s NATURAL-c assertion to the app-harness layer, or de-register the mutant and name what protects the app-side branch. No new cell is needed either way. | records + unit |
| F21 | Records only — a corrected sentence in §9 item 1. No runtime surface. | records |
| F22 | Extend `MOVERHASBOX`'s derivation to the `Browse.pageElFor` path, or narrow its stated invariant and cite `PAGEISVIEW`. Records only; the mutants are unaffected. | records |

**§14's matrix is otherwise sound and I found no vacuous cell in it.** `ENTRYNOZERO`'s narrowing to the
absence of a write is the right correction and closes round 2's F15 cleanly — recording every write
rather than reading back an offset is jsdom-decidable and cannot pass on engine behaviour.
`PARKLOSESTRANSFORM` is a real gate on a real cascade dependency, and its mutant kills.
`LANDEDPAGESHOWS`'s two mutants both kill, for the reasons above.

---

## Round-2 findings — disposition

| Finding | Disposition |
|---|---|
| **F11** (Structural) | **RESOLVED.** The construction is right, it is the one the source comment at `js/swipe.js:96-98` demands, the "why not re-point `appViewEl`" argument is correct, and `MOVERSDISTINCT` fails on the defect. |
| **F12** (Structural) | **RESOLVED.** The split is collapsed, the device gate now falls on the shipped form, step 11's exit condition (every item listed with the reason it is unreachable) is a real gate rather than a hope, and step 11b re-confirms after it. |
| **SF2** (Structural, the fold's own) | **REAL, and resolved for the case it names.** I confirmed the defect by tracing `endHold`'s loop and confirmed the fix covers commit, abort and hard reset — all three route through `dropRowHold`, and both its call sites apply the screen first. F19 is the residual: the fix is stated for a browse landing only. |
| **§12 item 15a** | **RESOLVED.** All five readers confirmed at the cited lines. |
| **F13** (Weak) | **RESOLVED.** 164px is right, the correction is marked as a correction, and §18 round 1 F1a is updated to match. |
| **F14** (Weak) | **RESOLVED.** The conditionality is stated in both §5.3.2 and §5.4, the `browse→home` row's confused justification is corrected in place, and the suppression is carried as a precondition rather than a cosmetic fix. |
| **F15** (Weak, open-unknown) | **RESOLVED.** Named as R-H with device row R8 and a step 10b line, and `ENTRYNOZERO`'s fixture is narrowed to the absence of a write. The "if R8 fails, the `sy` deletion is what comes back into question, not the entry rule" sentence is the right decision statement. |
| **F17** (Weak) | **RESOLVED.** Both halves are in §9 item 4's commit set, §13 step 10 and §10's migration table. |
| **F16** (Note) | **DISCHARGED.** `:408` corrected with its reason, the `PLAN-one-screen-type.md` row re-scoped to item 3 with the second falsified clause named, and both reconciliations recorded as discharged at `41f2933` rather than as open obligations. |

---

## Prediction — where this breaks in execution if built as written

The builder writes step 10 and the mover half goes green: the projection change is two lines, the frozen
spec reddens if either row is missed, and `MOVERSDISTINCT` confirms the two slots are distinct pages.
`LANDEDPAGESHOWS` goes green on `browse→browse` and the abort returns to the page it started on.

Then `endHold` gets its argument. If the builder reaches for `Browse.pageElFor` — the accessor the same
plan introduces for exactly "the page element for a descriptor" — the first `browse→home` swipe throws
inside `dropRowHold`, `finishing` is never cleared, and every subsequent swipe in the session does
nothing. That failure is loud and lands at step 10b, where the four Stage-1 transitions are on the
checklist, so it gets caught; it costs a build and a device pass.

The quieter path is the expensive one. The builder guards the lookup, `shown` is null for a non-browse
landing, and the `activate()` + `_realize()` at `js/browse.js:185-186` stops running on
`browse→home`. Nothing reddens: no cell asserts activation on a non-browse landing, and the fixture for
the one cell that could is `browse→browse`. At step 10b the tester leaves a long browse list to Home and
comes back, and the rows re-materialize. That observation is already on the checklist — as R8, the
`display: none` retention question — and it is also what R5's abort-repaint attribution problem looks
like, and also what a scroller-relocation defect would look like. Three candidate causes for one
symptom, which is the exact condition §13 step 10a exists to prevent the device gate from being in.

**The single untested assumption that fails late** is the one the fold states without noticing it is an
assumption: that `Browse.endHold`'s new argument concerns `browse→browse`. It concerns every gesture,
because the row hold does. Round 1 corrected the CSS and left the JavaScript describing it; round 2
corrected the mover resolution and the step order; this fold correctly found that deleting `abortRender`
orphaned the page selection — and then re-homed it into a function whose reach is wider than the defect
that sent it there.

## What I could not test

- Whether the sweep found every JavaScript surface the CSS rework implies. The fold is honest that its
  list proves the named surfaces were read, not that the enumeration is complete. F19 is one more
  instance of the same class found by walking the fold's *own* additions rather than the CSS
  implications, which is the axis the sweep did not run.
- Anything requiring WebKit: R8's retention, overlay-scrollbar behaviour, scroll anchoring at the
  park/un-park edge. Round 2's Blink measurements stand and are not asserted for WebKit.
- Whether an off-viewport absolutely-positioned mover *paints* outside the viewport. Still R2b's owed
  half, and still not readable from a DOM dump.
