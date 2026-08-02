# Plan review — PLAN-parked-page-rides-home.md, round 1

Type: plan-review
Plan: `Claude/Plans/PLAN-parked-page-rides-home.md` — filed 2026-08-02, `VERDICT: PLAN_READY`
Scope: the whole plan. Nothing was previously reviewed.
Round: 1
Reviewed at: HEAD `11de914`, build `2026-08-01.303`. Tree carries the plan, the measurement, and
modified `Board.md` / `DecisionLog.md`, all uncommitted; no production file is modified.
Date: 2026-08-02

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

## Applicability

- **defining_records: true** — the plan is built on a real-engine measurement, the generated
  transition model, two recorded park invariants, and a settled positioning decision. Every one is
  struck below against the thing itself.
- **boundary_relocation: false** — confirmed against the plan's scope section and the diff it
  describes: one CSS declaration's value, three mutation-anchor literals, two new test cells. No
  runtime value's ownership crosses a module seam, so no source ranges are declared and no ledger
  is owed.
- **callee_replacement: false** — confirmed: no JavaScript executes differently. No callback,
  interface, or indirection is introduced or replaced, so no callee ranges are declared.
- **contract_shape: false** — confirmed: no returned object, descriptor, classification, or
  serialized shape changes. The three mutation anchors are literal source excerpts, not a contract.

## Verdict

Verdict: **TEMPER.** The central claim holds and I could not break it. A `.browsepage.parked` park of
`-101vw` is expressed in `#browse`'s coordinate space, `#browse` is the incoming mover at `+w` on
`home→browse`, and the composition lands the page on Home — verified independently at
`js/app.js:505`, `:558`, `:602`, `:648-651` and `css/app.css:95-99`, `:118-121`, and consistent with
the measurement's own sign conventions. The 200vw floor is correct, `-300vw` clears it with a full
viewport to spare, and I re-derived the worst case including a term the plan omits (below, F7) and
the floor did not move. Invariant P is untouched, and neither `PARKBOXEQUAL` nor `PARKLOSESTRANSFORM`
pins the constant, so both stay green — verified by reading
`test/swipe-declone-stage2-css.test.js:240-324`, which asserts absence of properties and absence of
`!important`, never a distance.

What does not hold is a **derivation** and a **coverage claim**, and both are load-bearing enough to
be worth one round. §4's proof that the two outgoing-side transitions cannot overlap has the wrong
sign for a back gesture, so the exemption dimension 8 grants them rests on arithmetic that is false
(F1). And `PARKOUTOFREACH` does not compute its floor from its terms as §8 and R3 both state it does
— one of the two terms is an unpinned literal, and the cell's law-half contributes no detection
under the stated mutant set (F2). In a project whose named scar is a gate that greens a dirty tree,
a cell that claims to pin a law and pins a number is the finding this seat exists for.

**The shipped value does not change.** Nothing here asks for a different constant, a different
option, or a different sequence. F1 and F2 change what the builder writes into the CSS comment and
what the test author is briefed to assert — not what ships.

**What survives the strike.**

| Claim | Struck against | Result |
|---|---|---|
| The park composes onto Home because it is container-relative while `#browse` is the incoming mover | `js/app.js:505`, `:558`, `:602`, `:630`, `:648-651`; `css/app.css:95-99`, `:118-121` | **Confirmed.** `off = ±d.w`, incoming base `= off`, `t` clamped to `[−d.w, +d.w]`, every frame writes `translateX(base + t)`. A `.browsepage` is `position: absolute; inset: 0` in a `position: fixed` `#browse`. The arithmetic is exactly as the plan states. |
| `d.w = window.innerWidth = 100vw` | `js/app.js:505` | **Confirmed for a gesture at a constant viewport width**, which is an unstated precondition — F5. |
| `#browse` is a mover on exactly four transitions, incoming on two | `docs/transition-matrix.generated.txt` (read; `home→browse` and `overlay→browse` render `browse-host`, `browse→browse` renders `browse-page`) | **Confirmed.** The narrowing is right. The plan's account of *why* the outgoing pair is safe is not — F1. |
| The `.view.nav-in-*` keyframes cannot displace `#browse` further than the drag can | `css/app.css:241-244` against `#browse { max-width: 640px; margin: 0 auto }` (`:224-229`) | **Confirmed.** A transform percentage resolves against the element's own border box, `min(640px, 100vw) ≤ 100vw`. |
| No other writer displaces `#browse` | grep of every `style.transform` write in `js/` | **Confirmed.** `js/nav.js:199-208` (`overlayFilmstrip`) moves only `overlayEl(v)` — the Options hub and its five sub-screens — never `#browse`. `js/nav.js:116` clears, never displaces. `.app` (the only ancestor between `#browse` and the root) carries no transform and is not a `.view`, so it introduces no third term. |
| Invariant P is untouched and both existing gates stay green | `css/app.css:101-121`, `:129-139`; `test/swipe-declone-stage2-css.test.js:252-324` | **Confirmed.** `PARKBOXEQUAL` asserts property *absence* over both park rules plus a literal `overflow: hidden`; `PARKLOSESTRANSFORM` asserts no `!important` transform. Neither reads the distance. A value-only edit cannot move either. |
| Option (c)'s cheap form is genuinely defeated | `js/app.js:535`, `js/nav.js:69`, `js/browse.js:338-342` | **Confirmed, and the counterexample is exact.** A Home tap hides `#browse` without calling `showPage`, so the chapter list stays the shown page and carries no `.hidden`; the next forward swipe parks it by `away && holdRows` regardless. The rejection is real, not convenient, and the deferral names a route back and a trigger condition. |
| Option (d) re-opens a settled decision | `Claude/Decisions/DecisionLog.md:1114-1125` | **Confirmed verbatim**, including the notched-iPhone geometry and the `position: absolute` rationale. |
| Dimension 3's "reuse the existing hold-release coverage" | `test/swipe-declone-stage2-browse.test.js:378`, `:390`, `:450` | **Confirmed the coverage exists** on both `endHold` branches. No new cell is owed, and the plan is right not to duplicate one. |
| The three mutation anchors are at the cited lines and embed the constant | `tools/mutate.mjs:1104-1117` | **Confirmed.** S2-6, S2-7, S2-8, all three `from` strings carrying `translateX(-101vw)`. The same-commit migration obligation is correctly scoped. |

## Defining records

**AGREE on the mechanism, the bound, the invariants, and the settled positioning decision. One
CONFLICT (F1) and two GAPs (F2, F4).**

| Record | Standing | Reconciliation |
|---|---|---|
| `Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md` | Real-engine measurement on the deployed build | **AGREE.** The before/after tables, the 4px Δ, and the `-300vw` after-run are consistent with the source arithmetic I re-derived. The plan ships the tested form. Its four open items are answered or carried forward honestly. |
| `docs/transition-matrix.generated.txt` | Generated, executed model | **CONFLICT with §4's outgoing-side derivation — F1.** The matrix's transition set is right; the plan's claim about the *direction* the outgoing mover travels is not, and the conflict is material because dimension 8 grants a coverage exemption on it. |
| `css/app.css:101-121` (Invariant P + the two `overflow: hidden` grounds) | Recorded invariant | **AGREE.** A value-only edit touches none of the four clauses. |
| `Claude/Decisions/DecisionLog.md:1114-1125` | Settled decision | **AGREE.** Preserved exactly; option (d) is correctly rejected on it. |
| `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r3.md:74-79` | Prior casebook, traced against source | **GAP — F3.** It already establishes that the park-then-clear ordering has no paint in it. That is the missing half of §4's retention argument, and the plan does not cite it. (Its line citations have drifted; the current sites are `js/app.js:791`, `:1128`, `:1181` and the hard-reset pair `:481`/`:484`. I re-traced all five.) |
| `test/swipe-declone-stage2-css.test.js:301`; `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60` | Live gate comment; derived-facts record | **GAP — F4.** Both state a `.browsepage` park distance of `-101vw`, which §7 claims no record in HEAD other than the rule's own comment does. |
| `Claude/EngineeringContract.md` §4.8, §4.10 | Core rules | **AGREE as cited, CONFLICT as applied — F2.** §8 and R3 claim more for `PARKOUTOFREACH` than the cell as specified delivers. |

---

## Findings

### F1 — §4's proof that the outgoing-side pair cannot overlap has the wrong sign for a back gesture

**Severity: Structural. Nature: defect.**

§4 states: *"Where `#browse` is the OUTGOING mover (`base = 0` — `browse→home` and `browse→overlay`)
its x is `t ∈ [−w, 0]`, so a parked page's right edge is at most `0 − 1.01w + w = −0.01w < 0` and
never crosses."* §8 dimension 8 repeats it as *"provably non-overlapping, §4."*

`js/app.js:648` reads `let t = d.dir === 'back' ? Math.max(0, dx) : Math.min(0, dx);`. For a **back**
gesture `t ≥ 0`, and `browse→home` is a back gesture — the finger starts at the left edge
(`js/app.js:496`, `:500`). So the outgoing `#browse` travels `0 → +w`, sliding right off the screen,
not left. The same holds for `browse→overlay` whenever it is reached by a back swipe. The plan's own
supporting measurement is consistent with this: on the forward drag it records `#home` (outgoing,
base 0) going `0 → −323` — the outgoing mover follows the sign of `t`, and `t`'s sign is set by
direction, not by slot.

Substituting the correct range into the plan's own formula gives a parked page's right edge of at
most `+w − 1.01w + w = +0.99w`, i.e. **almost a full viewport of overlap**. The two outgoing-side
transitions are therefore not arithmetically exempt at HEAD; three of the four are expressible, not
two.

What actually keeps `browse→home` clean is a JavaScript fact the plan never states: that transition's
`renderDestination` is the `'home'` branch (`js/app.js:585`), which only un-parks `#home` and never
calls `Browse.render` → `showPage`, so **no page is parked during it at all** (the same fact
`js/browse.js:132-140`'s own comment records, and the same fact `endHold`'s no-landed-page branch
relies on). That is a real reason, it is stronger than the arithmetic one, and nothing pins it.

**Cost if built as written.** The plan requires the builder to put the transition analysis into the
shipped CSS comment (§4, "the comment the rule must carry ... is not optional"), so a false
derivation is written into the stylesheet as a standing invariant next to the value it justifies.
Dimension 8 exempts two composition cells on a proof that does not hold — which is precisely the
"each of these audits clean in isolation" failure the plan itself names as how six hypotheses were
missed. **The chosen fix is unaffected:** the floor takes `max |displacement|`, which is `w` for
either sign, so `-300vw` clears both directions. The correction is to the account, not the value.

### F2 — `PARKOUTOFREACH` does not compute its floor from its terms, and its law-half detects nothing

**Severity: Structural. Nature: defect.**

§8 dimension 6 claims: *"The CI cell **computes** the floor from its two terms rather than
hard-coding a number, so a future change to either term moves the floor instead of silently
invalidating it."* R3 repeats it as a structural mitigation: *"PARKOUTOFREACH computes the floor
from its terms instead of hard-coding it."* The cell as specified computes
`FLOOR = maxContainerDisplacementVw + pageWidthVw = 100 + 100`, with *"each term named with its
source line in the comment."* Two literals summed, with the provenance in a comment. A comment does
not move when the source moves. Nothing in the cell reads `js/app.js` or the `#browse` rule.

Two consequences, one fix.

**(a) The second term is pinned by nothing.** `DRAGREACHBOUNDED` genuinely pins term 1 against the
real entry point — that half of R3's mitigation is real. Term 2 (`#browse`'s border box, and hence a
`.browsepage`'s width, cannot exceed the viewport) rests on `#browse { left: 0; right: 0; max-width:
640px; margin: 0 auto }` at `css/app.css:224-229`, and no cell reads that rule. A future edit giving
`#browse` a width greater than the viewport re-enters reach with both cells green — the exact rot R3
says is mitigated structurally.

**(b) Assertion (i) has zero marginal detection under the stated mutant set.** The cell asserts
(i) `N ≥ FLOOR` and (ii) `N === 300`, with `FLOOR` constant at 200. Any `N` that fails (i) also fails
(ii), so (i) is dominated: delete it and every listed mutant still reddens. The plan's two mutants
confirm this rather than refute it — m1 (`-101vw`) reddens both, m2 (`-250vw`) reddens only (ii).
There is no mutant that reddens (i) alone, so the assertion the plan calls "the law" is itself
undefended, and the claim that "the constant plus the bound is a law" is not delivered by this cell.

**Cost if built as written.** The Coverage Model records a witness that does not witness what it
claims (EC §4.8), and R3's named structural mitigation is half memory. The fix is cheap and closes
both facets at once: derive term 2 by parsing the `#browse` rule (assert its box cannot exceed the
viewport) so that a mutant on `#browse`'s box reddens assertion (i) alone. Alternatively, state
honestly that term 2 is asserted textually and register a mutant against the `#browse` box rule.

### F3 — §4's retention argument is demonstrated only at gesture entry; the exit windows rest on an unstated premise already recorded elsewhere

**Severity: Weak. Nature: defect.**

§4 argues cover retention cannot regress because the retention-exercising page is always a mover and
"a mover's inline transform beats the class rule on every rendered frame," then demonstrates it for
the entry only: between the park landing in `start()` and the first inline write at `js/app.js:651`,
same `touchmove` task, no frame. That entry trace is correct — `start()` at `:630` writes a transform
only for movers with `base ≠ 0`, so the outgoing page is genuinely bare until `:651` in the same
task.

The **exit** is not addressed. There are two windows in which a retention-exercising page carries
`.parked` with no inline transform, and in both the class constant is the governing value:

- **Finalize:** `js/app.js:791` clears `style.transform` on every mover; `.parked` is not removed
  until `dropRowHold()` at `:1128` → `Browse.endHold` (`js/browse.js:182-185`).
- **Hard reset:** `resetSwipeStyles` (via `applyScreen`, `js/app.js:481-482`, clearing every
  `.browsepage` transform at `js/nav.js:114-116`) runs before `dropRowHold()` at `:484`.

Both windows are entirely synchronous, so no frame paints inside them and the conclusion stands. That
premise is already an established fact in this project's records —
`Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r3.md:74-79` traced exactly this ordering and
concluded "the source page cannot flash to `translateX(-101vw)` between the clear and the un-park" —
and the plan does not cite it.

**Cost if built as written.** The argument's actual load-bearing premise ("no paint between the
transform clear and the un-park") is never written down, so the record says the constant *never*
governs a retention-exercising page when in fact it does, briefly, and is saved by an ordering
property nothing gates. Any future change that inserts an `await`, an `rAF`, or a deferred release
between those two points re-arms R2 with every gate green. One sentence in §4 plus the citation
closes it.

### F4 — §7's HEAD-completeness claim is false

**Severity: Weak. Nature: defect.**

§7 states: *"No record in HEAD other than the rule's own comment states a `.browsepage` park
distance."* Two do:

- `test/swipe-declone-stage2-css.test.js:301` — the `PARKLOSESTRANSFORM` header comment: *"would
  silently make the outgoing mover jump to `translateX(-101vw)` at drag start."* This is a live gate's
  own explanation of the mutant S2-8 that the same commit migrates, in the very file the plan
  promises stays green.
- `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60` — a derived-facts record: `.browsepage.parked`
  `transform: translateX(-101vw)`.

(The other `-101vw` hits across `Claude/Plans/`, `Claude/Loki/` and prior casebooks are historical
artifacts of completed work and are not scrub targets; `Claude/Subsystems/swipe-reveal.md` speaks
only of `#home.parked`, exactly as §7 says.)

**Cost if built as written.** A second scrub pass, which the standards call a failure of the first
(§6.6). Neither occurrence reddens anything, so the cost is a stale comment in a live gate file and a
derived-facts record that disagrees with the sheet — both cheap now, both invisible later.

### F5 — the floor mixes units: the displacement term is pixels captured at touchstart, the park is `vw` resolved at render

**Severity: Weak. Nature: defect.**

§4 asserts *"`d.w` is `window.innerWidth` (`:505`), so `d.w = 100vw`."* `d.w` is captured once, in
`begin()` at `js/app.js:505`, and never revised; the park's `vw` is resolved by the engine at every
style recalc. There is no `resize` or `orientationchange` listener anywhere in `js/` (verified by
grep), and no path cancels an in-flight gesture on a viewport change. So the identity holds only
while the viewport width is constant for the gesture's duration.

Where it fails: if the viewport width more than halves mid-gesture, `w_start + V_now − 3·V_now > 0`
and the parked page re-enters the viewport even at `-300vw`. A landscape→portrait rotation on the
target hardware (812 → 375) satisfies `w_start > 2·V_now`.

**Cost if built as written.** The plan's generality claim — *"unreachable for ANY displacement
`#browse` can take"* — carries an unnamed precondition, and the CSS comment would record it as
unconditional. This is **not a regression**: at HEAD's `-101vw` the same rotation is far worse. The
correction is one clause in the law ("for a gesture at a constant viewport width; `d.w` is captured
at touchstart and never revised"), not a different value.

### F6 — the real-engine oracle's anti-vacuity is a run-order discipline where a structure is available

**Severity: Weak. Nature: defect.**

The oracle asserts every `.browsepage` rect satisfies `right ≤ 0`. A `display:none` element's
`getBoundingClientRect()` is all zeros in a real engine, and `0 ≤ 0` passes — so a page that is
hidden rather than parked satisfies the assertion by degeneracy. The plan's guard against this is the
recorded discipline of running the detector against `-101vw` first and watching it fire. That is a
rule enforced by memory at the moment it applies, and the standards name that as the fallback shape,
not the normal one — particularly for a script that lives outside `npm test` and will be re-run by
someone who was not in this session.

**Cost if built as written.** The one cell that witnesses dimension 10 can go green on a degenerate
sample, and the only thing standing between that and a false "fixed" is whether the next operator
remembers a two-step protocol. The fix is an in-script assertion that the parked page's rect is
non-degenerate (`width > 0`) and that at least one page was sampled — the same anti-vacuity shape the
plan already specifies for both CI cells, applied to the oracle too.

### F7 — the floor's second term omits `#browse`'s centring offset

**Severity: Note. Nature: defect.**

§4 names the second term *"page width ≤ 100vw"*. The quantity the arithmetic needs is the parked
page's right edge in viewport space, which is `L + W`, where `L` is `#browse`'s static left offset —
non-zero above 640px, because `#browse` is `left: 0; right: 0; max-width: 640px; margin: 0 auto`
(`css/app.css:224-229`). Worst case at viewport `V`: `L + W = (V + min(640, V))/2 ≤ V`, so the term
is still bounded by 100vw and **the 200vw floor does not move** — I checked it at 375px, at 640px
(the tight boundary, right edge exactly 0 at the floor), and at 1000px. Recorded because F2's fix
asks the cell to derive this term from source, and a term derived from the wrong quantity is a
derivation that only happens to be right.

### F8 — R2's fallback ladder lists only a smaller dose of the same untested variable

**Severity: Note. Nature: recommendation.**

R2's fallback if cover retention regresses at 3 viewports is `-201vw`, then option (c). `-201vw` is
the same mechanism at a smaller magnitude, so if retention turns out to be distance-sensitive it is
not obviously a fix, and the plan says as much. No distance-free park form (one that keeps the box
laid out and painted while making it invisible, rather than moving it) appears among the four options
weighed. **This is a reviewer's observation, not a requirement, and it should not be acted on now** —
it would re-open the same device-owed compositing question R2 already carries, for no measured gain,
and the plan's option set is adequate for the decision in front of it. Recorded only so that if the
device gate's item 2 fails, the fallback discussion starts from more than one candidate.

---

## Coverage

Both blocking findings map to verification before the plan proceeds:

- **F1** — verified by re-reading `js/app.js:648` against `:496`/`:500` and the measurement's own
  sign convention; discharged when §4 and §8 dimension 8 state the correct range for a back gesture
  and replace the outgoing-side exemption's basis with the reason that holds (no `showPage` call, so
  no page is parked, `js/app.js:585`). If the planner wants that reason gated rather than asserted,
  the cheapest form is an assertion in the existing hold-release suite
  (`test/swipe-declone-stage2-browse.test.js`) that a `browse→home` gesture leaves no page `.parked`
  at any point — the harness already drives that transition.
- **F2** — discharged when `PARKOUTOFREACH` either derives term 2 from the `#browse` rule (and
  registers a mutant on that rule so assertion (i) reddens alone), or drops the "computes the floor"
  claim from §8 dimension 6 and R3 and states what it actually asserts. Either closes it; the first
  also closes the mutant-discrimination facet.

Non-blocking (F3–F8) are records and test-brief corrections; none gates the build.

Unchanged and re-affirmed: `PARKBOXEQUAL` and `PARKLOSESTRANSFORM` stay green (verified against
`test/swipe-declone-stage2-css.test.js:252-324`); dimension 3 needs no new cell (verified against
`test/swipe-declone-stage2-browse.test.js:378`, `:390`, `:450`); the three anchor migrations in
`tools/mutate.mjs:1104-1117` are correctly scoped as a same-commit obligation, gated by
`test/mutation-anchors.test.js`.

---

## Prediction — where this breaks in execution if built as written

**The builder does not hit anything.** One declaration, no JavaScript, two gates that cannot see the
value. The build is as small as the plan says it is, and I expect it to land clean.

**What breaks is later, and quietly.** The stylesheet acquires a standing comment asserting that the
two outgoing-side transitions provably cannot overlap, with an arithmetic proof that is wrong by a
sign. That comment will be read as settled by the next person to touch this rule — this project's
comments are load-bearing and are treated as records. The moment something makes `browse→home` render
browse content, or a concurrent hold parks a page across it, the real protection (no `showPage`
call) is gone and the recorded protection was never real. The floor still saves it at `-300vw`; the
record does not.

**The expensive late failure is F2's second term.** `DRAGREACHBOUNDED` will keep the displacement
term honest for years. Nothing keeps the page-width term honest, and the plan's own risk registry
says it does. A change to `#browse`'s box — a wider `max-width`, an asymmetric inset, a new wrapper —
re-enters reach with a full green suite and a CSS comment that says the case is covered by
construction. That is the same shape as the defect this plan fixes: a constant and a container that
each audit clean alone.

**The one I would bet on being raised again:** cover retention at the new distance (R2). The plan
argues it well and gates it on device, which is right. If it does bite, the plan's `-201vw` fallback
will not settle it, because it varies the same untested quantity — and the session that hits it will
re-derive the option set from scratch unless F8's note is on file.
