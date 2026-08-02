# PLAN — a parked browse page rides on top of Home for the whole forward swipe: put the park offset OUT OF REACH of its container's own displacement (`.browsepage.parked` `translateX(-101vw)` → `-300vw`), a one-declaration CSS change

Type: plan

<!-- vitruvius-gate {"plan_type":"targeted-fix","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false}} -->

Status: **PLAN_READY — hand to the plan reviewer.** The defect is measured, not hypothesised:
`Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md` drove the deployed build `.303` in a
real Blink engine at 375×812 and sampled every `.browsepage`'s screen rect on every `touchmove` of the
user's exact repro. A parked chapter-list page tracked Home to within 4px at **all seven** move
samples, and the overlap detector fired at every one. The cause is arithmetic, not timing:
`.browsepage.parked` parks by `transform: translateX(-101vw)` (`css/app.css:118-121`) on a
`position: absolute; inset: 0` child of `#browse` (`css/app.css:95-99`), so the park is expressed in
**`#browse`'s** coordinate space — and on a `home→browse` drag `#browse` is itself the incoming mover
at `translateX(w + t)` (`js/app.js:651`), which composes to `homeX − 0.01w`. The park lands the page
on Home *by construction*, for the whole gesture. The fix moves the park beyond any displacement
`#browse` can take: `-300vw` — the form the after-run of that same measurement executed (overlap
detector silent at every sample; destination still settled correctly at 0). Six earlier hypotheses
missed this because every one of them sampled **at rest**, where the state is clean.

**Round 1 temper applied — 2026-08-02** (`Claude/Charpy/PLAN-parked-page-rides-home-charpy.md`,
verdict TEMPER, reviewed at HEAD `11de914`). **The shipped constant is unchanged at `-300vw`**; the
review re-derived the floor independently, including a term this plan had omitted, and checked it at
375px, 640px and 1000px without it moving. Two structural findings changed the ACCOUNT, not the
value: §4's proof that the outgoing-side transitions cannot overlap had the wrong sign for a back
gesture and has been replaced by the reason that actually holds (F1), and `PARKOUTOFREACH` claimed to
compute its floor while summing two literals and is now specified to derive its second term from the
`#browse` rule (F2). Five weak findings and two notes are folded at F3–F8. Each correction is marked
**[F*n*]** at the point it lands.

## Index

1. Defining records and authority
2. *(Applicability — unnumbered heading; the authoring gate matches it literally)*
3. Scope — the one-declaration change; what stays byte-identical
4. The mechanism, and the design as a distance LAW (not a magic number)
5. Options weighed — (a) chosen; (b) clip at the container; (c) narrow the park; (d) viewport-relative park
6. What must NOT regress, and the constraint each comes from
7. Compatibility and migration (U10) — the three mutation anchors
8. Coverage Model — the ten catalog dimensions, the two CI cells, the real-engine oracle, the device gate
9. Bench-answerable versus device-owed
10. Risk registry
11. Handoff

## 1. Defining records and authority

**Verdict: the measurement, the shipped source, the generated transition model, the decision log, and
the two standing park invariants AGREE. No settled decision is re-opened here — the decision log's
`.browsepage` entries settle the POSITIONING SCHEME (`position: absolute; inset: 0` inside a
`position: fixed` `#browse`), which this plan preserves exactly and depends on. One CONFLICT was
found in round 1 and is RESOLVED: this plan's own §4 contradicted `js/app.js:648` on the direction an
outgoing mover travels, and the arithmetic exemption it supported is withdrawn in favour of the
JavaScript fact that holds (F1). Three GAPs, named and owned: (1) nothing in HEAD states the
relationship between the park distance and the container's own displacement — the reason a `-101vw`
park could sit in the tree next to a `±w` mover for a whole stage without either record noticing the
other; (2) nothing states or gates that no page is parked at all when the destination is not a browse
page, which is the real protection for the outgoing-side pair (F1); (3) two records in HEAD state a
`.browsepage` park distance that this plan had claimed were absent (F4).** Precedence
(`Claude/EngineeringContract.md` §2): (1) the real-engine measurement; (2) verified HEAD source and
the generated (executed) transition model; (3) the recorded park invariants — Invariant P and the
`overflow: hidden` derivation; (4) this plan.

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md` | Before: parked page x = home x − 4px at 7/7 touchmove samples; the overlap detector fired at every one. After (`-300vw`, one property changed): parked page at −796/−935/−1073, detector silent, Books still settled at 0. The instrument was proven able to fire before its silence was read as evidence. | Real-engine measurement, real data, deployed build `.303` | GOVERNS the mechanism and the chosen distance. The after-run is the tested form, and it is the form this plan ships — never a variant of a tested fix. | Cite from the CSS comment and from the CI cell. |
| `css/app.css:118-121` — `.browsepage.parked { transform: translateX(-101vw); overflow: hidden; pointer-events: none; z-index: 0; }` | The park is a transform of −101vw and nothing else. | Code under change | ONE declaration changes value: `-101vw` → `-300vw`. The other three declarations are byte-identical. | Edit + extend the rule's comment (§4). |
| `css/app.css:95-99` — `.browsepage { position: absolute; inset: 0; … }` | A page is absolutely positioned inside `#browse`, so `#browse` is its containing block and the park transform composes onto `#browse`'s own. | Production interface (verified); the scheme is a SETTLED DECISION (`Claude/Decisions/DecisionLog.md:1114-1125` — `position: absolute` was chosen because a `position: fixed` page is re-contained by a transformed `#browse`) | UNCHANGED, and deliberately not re-opened. This is the half of the mechanism that makes the park container-relative; §5 option (d) records why reversing it is inadmissible on the settled ground as well as on Invariant P. | — |
| `docs/transition-matrix.generated.txt` (generated; guarded by `test/transition-matrix.test.js`) | The executed construction inventory: `home→browse` and `overlay→browse` render `browse-host` (so `#browse` is the INCOMING mover, base `±w`); `browse→home` and `browse→overlay` make `#browse` the OUTGOING mover (base 0); `browse→browse` renders `browse-page`, so the movers are the PAGES and `#browse` is not transformed at all. | Generated model (executed, not prose) | GOVERNS the composition matrix in §8 dimension 8, and NARROWS the defect: overlap is reachable only where `#browse` is the INCOMING mover — two transitions, `home→browse` (reproduced) and `overlay→browse` (same construction, unreproduced). §4 derives why the outgoing-side pair cannot overlap. | — |
| `css/app.css:101-117` — the park rule's comment: Invariant P + the `overflow: hidden` two grounds | The rule declares no position and no insets, parks by transform ALONE, carries no `!important`, and keeps `overflow: hidden`. | Recorded invariant (Invariant P; derived at `#home.parked`, `css:129-149`) | PRESERVED exactly. A distance change touches none of the four clauses — still transform-only, still no `!important`, still no position/insets, still `overflow: hidden`. §6 states each with the gate that holds it. | Comment gains the distance law (§4). |
| `css/app.css:158-163` — `#home.parked { position: fixed; … transform: translateX(-101vw); … }` | The identical `-101vw` is VIEWPORT-relative here, because this rule declares `position: fixed`. | Production interface (verified) | UNCHANGED, deliberately. `#home.parked` has no defect — it is the control case in the measurement — and its compositing form is device-validated (`.256` A/B). Editing it would be churn against a device-verified rule. | — |
| `js/app.js:505`, `:558`, `:602`, `:630`, `:648-651`, `:690`, `:791` | `d.w = window.innerWidth`; `off = ±d.w`; a mover's `base` is `0` (outgoing) or `±d.w` (incoming); the drag clamps `t` to `[−d.w, +d.w]`; each frame writes `translateX(base + t)`; the settle writes `0` or `±d.w`; finalize clears to `''`. | Code under change (read-only) | GOVERNS the bound. Every inline transform any mover can carry is within `±d.w` of 0, and `d.w = window.innerWidth = 100vw`. This is the first term of the floor in §4, pinned by the DRAGREACHBOUNDED cell. | — |
| `css/app.css:241-244` — `@keyframes navInRight` / `navInLeft` on `.view` | A button navigation animates a `.view` — which `#browse` is — between `translateX(±100%)` and `none`. | Production interface (verified) | INCLUDED in the bound: `100%` of `#browse` is its own border box, `min(640px, 100vw) ≤ 100vw`. So the keyframe path cannot displace `#browse` further than the drag path can. Completeness matters: the floor is a claim about EVERY transformer of `#browse`, not only the swipe. | — |
| `js/browse.js:338-342` — `toggle('parked', away && holdRows); toggle('hidden', away && !holdRows)` | While a hold is live, EVERY cached page that is not the shown one is un-hidden and parked — including a page that has been `display:none` since a previous navigation. | Production interface (verified) | UNCHANGED by the chosen fix. The honest cost of that is stated in §5 option (c): a non-participant page stays painted off-screen for the gesture. Once it is out of reach that is a cost with no user-visible defect, and narrowing it is a seam change with no measured gain. | Deferred item recorded (§3, §5). |
| `js/browse.js:132-140` (`beginHold`), `:165-223` (`endHold`) | The park is gesture-scoped: the hold is taken at `js/app.js:557` BEFORE the destination render, and `endHold` removes `.parked` from every page on both its landed (`:182-185`) and no-landed-page (`:206-210`) branches. | Production interface (verified) | UNCHANGED. Dimension 3's coverage already exists on both branches (`test/swipe-declone-stage2-browse.test.js:378`, `:390`, `:450`) — no new cell is owed. | — |
| **[F1]** `js/app.js:573-591` (`renderDestination`) + `js/browse.js:526`, `:538` (the only two `showPage` call sites) | Only the `'browse-page'` and `'browse-host'` branches call `showAppView` → `Browse.render` → `showPage`. The `'home'` branch (`:585`) only un-parks `#home`; the overlay branch only un-hides the overlay. So **a page is parked during a gesture only when the destination is a browse page.** | Production interface (verified independently this round) | GOVERNS the outgoing-side exemption, REPLACING the withdrawn arithmetic one. It is stronger than arithmetic and it covers both outgoing-side transitions, not just `browse→home`. It is currently ungated; §8 dimension 8 names the cheapest assertion that pins it. | Named as an invariant (§6 I10) with its gate. |
| **[F1]** `js/app.js:494-505`, `:648` | `fromLeft` ⇒ `dir = 'back'`; `t = d.dir === 'back' ? Math.max(0, dx) : Math.min(0, dx)`. So on a BACK gesture `t ≥ 0` and the outgoing mover travels `0 → +w` — right, not left. | Code under change (read-only) | CORRECTS this plan's own §4. `browse→home` is a back gesture, so the outgoing `#browse` slides RIGHT and the old claim that a parked page's right edge stays at `−0.01w` was wrong by a sign; the true figure is `+0.99w`. The FLOOR is unaffected — it takes `max |displacement|`, which is `w` for either sign. | §4 and §8 dim 8 restated. |
| **[F3]** `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r3.md:74-79` | The park-then-clear ordering has no paint in it: the inline-transform clear and the `.parked` removal are inside one synchronous `finalize()`, so "the source page cannot flash to `translateX(-101vw)` between the clear and the un-park." | Prior casebook, traced against source | ADOPTED as the missing half of §4's retention argument. This plan had demonstrated the gesture ENTRY only; the two EXIT windows rest on this ordering property. Its line citations have drifted; the current sites are `js/app.js:791`, `:1128`, `:1181` and the hard-reset pair `:481`/`:484`. | Cited in §4; named as invariant I11. |
| **[F4]** `test/swipe-declone-stage2-css.test.js:301`; `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60` | Both state a `.browsepage` park distance of `-101vw` — the first in the live `PARKLOSESTRANSFORM` gate's own header comment, the second as a derived fact. | Live gate comment; derived-facts record | GAP CLOSED: §7's claim that no other record in HEAD states a park distance was FALSE. Both are added as same-commit scrub targets. Neither reddens anything, which is exactly why they would have gone stale invisibly. | Scrub both (§7). |
| `css/app.css:101-107` + `js/browse.js:331-337` — why parking exists at all | `display:none` makes iOS drop decoded cover bitmaps; an aborted swipe then re-decodes every cover at once and the list visibly pops back in (device-measured: ROWS KEPT 68/68, src 22→22, +img 0). | Recorded device measurement | PRESERVED, and §4 derives WHY a distance change cannot touch it: the page whose retention is exercised is a MOVER, and a mover carries an inline transform that beats the class rule on every rendered frame, so the class distance never applies to it. | — |
| `Claude/Loki/STRIKE-home-shift-m1-derivation.md` | Removing `overflow: hidden` from a park rule measured a −80px reveal jump where shipped code measures 0px; `overflow: clip` breaks the fix twice over. | Adversary, real-engine-measured | HARD CONSTRAINT. `overflow: hidden` is retained verbatim, and §5 option (b) is judged against it. | — |
| `css/app.css:164-172` — the stage-6g falsification | `transform: translateZ(0)` was argued spec-equivalent to `will-change: transform` and FLASHED on real iOS. | Recorded device measurement | GOVERNS the epistemics: every compositing claim here is labelled spec-derived-and-device-owed unless something measured it. §9 does that labelling explicitly. | — |
| `tools/mutate.mjs:1103-1117` (S2-6, S2-7, S2-8) + `test/mutation-anchors.test.js` | Three registered mutants anchor on the literal text `.browsepage.parked {\n  transform: translateX(-101vw);`, and a gate test fails when any anchor stops matching its source. | Contract under change | The three anchors MUST be migrated in the same commit (§7). A rotted anchor does not announce itself — the mutant silently stops applying and the guard it defends becomes undefended. | Edit the three `from`/`to` strings. |
| `Claude/EngineeringContract.md` §4.10 (mutation verification), §4.14 (independent oracles), §4.8 (truthful test claims), §4.21 (narrow scope) | Every cell names the mutation that reddens it; a cell may not claim more than it checks; fix the invariant without redesigning adjacent systems. | Core rules | The change is one declaration; each new cell names its mutant; the geometry oracle is stated as NOT a CI cell, because jsdom returns all-zero rects and a jsdom cell claiming it could not fail. | Register both cells (§8). |

**Authority precedence.** The measurement governs the mechanism and the tested form. The verified
source and the generated matrix govern the bound and the transition set. The decision log governs the
positioning scheme, which this plan preserves. The recorded park invariants govern what may not move.
The one GAP — no record relates the park distance to the container's displacement — is closed by §4's
law and pinned by the two CI cells in §8, so it cannot re-open in silence.

## Applicability

Machine-readable declaration above. This is a TARGETED FIX — one CSS declaration's value changes in
one rule; no module, contract, resource, or sequencing changes. Per-pattern reason (all **false**):

- **boundary_relocation: false** — no runtime value's ownership crosses a module seam; nothing moves between modules. The chosen fix deliberately does NOT touch the `js/app.js` ↔ `js/browse.js` hold seam (§5, option c).
- **callee_replacement: false** — no callback, interface, or indirection replaces direct logic. No JavaScript executes differently.
- **contract_shape: false** — no classification, plan, schema, or state-output shape changes. The mutation-anchor migration (§7) updates three literal source excerpts, not a contract's shape.
- **state_transfer: false** — no runtime resource's ownership crosses a seam; the park/un-park lifecycle (`beginHold` / `endHold`) is untouched.
- **async_change: false** — no listener, timer, promise, or gate is added or moved; a stylesheet constant has no asynchrony. The one ordering that matters — the class rule losing the cascade to the per-frame inline write — is pre-existing, is Invariant P, and is already pinned by the PARKLOSESTRANSFORM gate; §6 carries it as a non-regression, not as a new sequencing obligation.
- **persistence_migration: false** — nothing is persisted or serialized.
- **lifecycle_ownership: false** — no resource is created, borrowed, released, or destroyed differently.

All-false → the trivial-plan exemption: no `vitruvius-*` machine blocks. The Coverage Model is
authored in prose (§8) across the whole catalog, with two CI cells, one real-engine oracle, and one
device gate.

## 3. Scope — the one-declaration change; what stays byte-identical

**Changes (production, `css/app.css`, the `.browsepage.parked` rule at 118-121):** the `transform`
declaration's value only — `translateX(-101vw)` → `translateX(-300vw)`. Nothing else in the rule.

**Changes (records and tooling, same commit):** the rule's comment gains the distance law (§4); the
three mutation anchors in `tools/mutate.mjs` are migrated (§7); the two CI cells are added (§8).

**Stays byte-identical (do NOT re-touch):**

- `overflow: hidden; pointer-events: none; z-index: 0;` in the same rule — `overflow: hidden` on the two recorded grounds (§6 I2).
- The ABSENCE of `position`, `top`, `bottom`, `left`, `right`, `max-width`, `margin` from the rule, and the absence of `!important` on the transform — Invariant P (§6 I1).
- The `.browsepage` base rule (`css:95-99`) — the `position: absolute; inset: 0` that makes the park container-relative is KEPT; it is a settled decision (`DecisionLog.md:1114-1125`) and §5 option (d) records why reversing it is inadmissible.
- `#home.parked` (`css:158-163`), including its own `-101vw` — a different element, viewport-relative, no defect, device-validated form.
- `#browse` (`css:224-229`) — no `overflow`, no `will-change`, no `transform`, no `z-index`; §5 option (b) records why adding a clip there is rejected.
- All of `js/` — the swipe, the hold, `showPage`, `endHold`. No JavaScript changes.

**Split across the seam:** none. One value changes in one declaration.

**Deferred, with the consumer that does not yet exist:** narrowing `showPage`'s park-vs-hide choice so
a page that is not a participant in the gesture is never un-hidden (§5, option c). Deferred because it
needs a fact the seam does not carry today — which page the gesture actually holds — and because its
gain over the chosen fix is *not painting an off-screen page*: no user-visible defect and no measured
cost. The consumer that would make it live is a measured paint or memory cost from the parked
non-participant; none exists today.

## 4. The mechanism, and the design as a distance LAW (not a magic number)

**The mechanism, in one line.** A park expressed in a container's coordinate space is off-screen only
while the container is at rest, and `#browse` is not at rest during a `home→browse` drag.

Written out, with `w = window.innerWidth = 100vw` (`js/app.js:505`):

```
parked page screen-x  =  browse-x + park-offset
                      =  (home-x + w)  +  (−1.01w)
                      =  home-x − 0.01w
```

which is Home's position less 4px at a 375px viewport — the measured Δ, at every sample.
`#home.parked` escapes the same arithmetic only because that rule declares `position: fixed`
(`css:159`), which makes its identical `-101vw` viewport-relative.

**Which transitions can express it. [F1 — corrected; the earlier arithmetic exemption is WITHDRAWN.]**
From the generated matrix, `#browse` is a mover in four transitions.

- **`#browse` as the INCOMING mover** (`base = +w`): `home→browse` (reproduced) and `overlay→browse` (same construction, unreproduced). A parked page composes onto the outgoing view, as measured.
- **`#browse` as the OUTGOING mover** (`base = 0`): `browse→home` and `browse→overlay`. **These are NOT arithmetically exempt.** `js/app.js:648` reads `t = d.dir === 'back' ? Math.max(0, dx) : Math.min(0, dx)`, and a left-edge grab sets `dir = 'back'` (`:494-500`) — which `browse→home` is. So on a back gesture the outgoing `#browse` travels `0 → +w`, sliding RIGHT, and a parked page's right edge would reach `+w − 1.01w + w = +0.99w` — almost a full viewport of overlap. An earlier version of this section asserted `t ∈ [−w, 0]` for the outgoing slot and concluded `−0.01w`; that was wrong by a sign, because `t`'s sign is set by the gesture's DIRECTION, not by the mover's slot. The plan's own supporting measurement agrees: on a forward drag the outgoing `#home` (base 0) runs `0 → −323`, following `t`.
- **What actually exempts them** is a JavaScript fact, and it is stronger than the arithmetic one: **no page is parked during those transitions at all.** `showPage` has exactly two call sites (`js/browse.js:526`, `:538`), both reached only through `Browse.render`, which a gesture reaches only through `showAppView` — and `renderDestination` calls `showAppView` only on its `'browse-page'` and `'browse-host'` branches (`js/app.js:573-580`). The `'home'` branch (`:585`) merely un-parks `#home`; the overlay branch merely un-hides the overlay. So parking happens **only when the destination is a browse page**, which covers both outgoing-side transitions at once rather than only `browse→home`.
- **`browse→browse`:** the movers are the pages themselves and `#browse` is not transformed at all.

The fix still covers all four by construction, because the floor takes `max |displacement|`, which is
`w` for either sign. What changed is the account, not the value. The exemption above is a JS
invariant that nothing currently gates (§6 I10); §8 dimension 8 names the cheapest assertion for it,
and until that lands the outgoing-side pair is protected by the floor as well as by the invariant —
which is the belt the wrong derivation had been standing in for.

**The design: make the offset exceed the container's maximum reach.** A parked page is unreachable
when its right edge cannot cross the viewport's left edge for ANY displacement the container can take:

```
park-offset  >  max |displacement of #browse|  +  (L + W)
             >  100vw                          +  100vw
             =  200vw                                        ← the FLOOR
```

**Precondition, stated because it is real [F5]:** this holds *for a gesture at a constant viewport
width*. `d.w` is captured once in `begin()` (`js/app.js:505`) and never revised; the park's `vw`
resolves at every style recalc. There is no `resize` or `orientationchange` listener anywhere in
first-party `js/` (verified — the only match is the vendored debug console, `js/vendor/eruda.js`), and
no path cancels an in-flight gesture on a viewport change. If the viewport width more than halves
mid-gesture — a landscape→portrait rotation on the target hardware, 812 → 375, satisfies
`w_start > 2·V_now` — a parked page re-enters even at `-300vw`. This is **not a regression**: at
HEAD's `-101vw` the same rotation is far worse. It is a clause of the law, and it belongs in the CSS
comment rather than being silently omitted from a claim of unconditional generality.

Both terms are derived, not assumed:

- **`max |displacement of #browse| = 100vw`.** Every writer of a transform on `#browse` is enumerated: the drag (`js/app.js:651`, with `base ∈ {0, ±d.w}` from `:602`/`:558` and `t` clamped to `[−d.w, +d.w]` at `:649`), the settle (`:690`, writes `0` or `±d.w`), the finalize clear (`:791`), and the button-navigation keyframes (`css:241-244`, `translateX(±100%)` of `#browse`'s own border box, `min(640px, 100vw) ≤ 100vw`). `d.w` is `window.innerWidth` (`:505`), so `d.w = 100vw`. Nothing writes a larger displacement — independently confirmed in round 1 against every `style.transform` write in `js/` (`js/nav.js:199-208`'s `overlayFilmstrip` moves only `overlayEl(v)`, never `#browse`; `js/nav.js:116` clears rather than displaces; `.app`, the only ancestor between `#browse` and the root, carries no transform).
- **`L + W ≤ 100vw` — the parked page's right edge in viewport space [F7].** The quantity the arithmetic needs is not "page width" but `L + W`, where `W` is `#browse`'s border-box width and `L` is its static left offset. `L` is **non-zero above 640px**, because `#browse` is `left: 0; right: 0; max-width: 640px; margin: 0 auto` (`css:224-229`) and is therefore centred. Worst case at viewport `V`: `W = min(640px, V)` and `L = (V − W)/2`, so `L + W = (V + min(640px, V))/2 ≤ V`. The bound is still 100vw and **the floor does not move** — checked at 375px, at 640px (the tight boundary, where the right edge sits exactly at 0 when the offset equals the floor, which is why the law is a strict inequality) and at 1000px. It is corrected here because §8's cell is now required to DERIVE this term from source, and a term derived from the wrong quantity is a derivation that only happens to be right.

**The shipped value is `-300vw`** — the floor plus a full viewport of margin, and the exact form the
measurement's after-run executed. Two independent reasons not to trim it to just past the floor
(`-201vw` clears the arithmetic with 4px to spare): the project's standing discipline is to ship the
tested form of a tested fix rather than a variant of it; and 4px of margin is precisely the margin
that produced this defect.

**Why the change cannot regress cover retention** — the property parking exists for. Parking keeps a
page painted so iOS does not drop its decoded cover bitmaps. Trace which pages the CSS constant
actually governs:

1. The page whose retention matters is the OUTGOING page of a `browse→browse` swipe — the one an abort brings straight back. That page is a **mover** (`js/app.js:604`), so `js/app.js:651` writes `style.transform` on it every frame, and Invariant P guarantees the inline write beats the class rule. Between the park landing (inside `start()`, via `renderDestination` → `showPage`, `js/app.js:579`) and the first inline write (`:651`) there is no rendered frame — both run inside the same `touchmove` task, and `start()` at `:630` writes a transform only for movers with `base ≠ 0`, so the outgoing page is genuinely bare until `:651`.
2. **The EXIT windows, and the premise that actually carries them [F3].** There are two windows in which that same page carries `.parked` with NO inline transform, and in both the class constant IS the governing value: **finalize** (`js/app.js:791` clears every mover's `style.transform`; `.parked` is not removed until `dropRowHold()` at `:1128` → `endHold`, `js/browse.js:182-185`) and **hard reset** (`resetSwipeStyles` via `applyScreen`, `js/app.js:481-482`, clearing every `.browsepage` transform at `js/nav.js:114-116`, before `dropRowHold()` at `:484`). Both windows are **entirely synchronous, so no frame paints inside them** — and that, not "the constant never applies," is the load-bearing premise. It is an established fact in this project's records: `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r3.md:74-79` traced exactly this ordering and concluded that the source page cannot flash to the parked offset between the clear and the un-park. **Consequence for the future:** any change that inserts an `await`, an `rAF`, or a deferred release between the transform clear and the un-park re-arms R2 with every gate green. Recorded as invariant I11 so the premise is written down rather than re-derived.
3. Every OTHER parked page is a non-participant: either it was already `display:none` when the hold began (its bitmaps were dropped then, so parking cannot warm them), or it is the previously-shown page, which `endHold` (`js/browse.js:182-185`) `display:none`s at the end of the same gesture without ever showing it. In neither case is retention exercised.

So the property is carried by the inline-transform path plus the no-paint-between ordering, not by
the constant this plan changes. That argument is source-derived; §9 still classifies the iOS raster
behaviour as device-owed, because this project has had a compositing spec argument falsified on real
iOS before.

**The comment the rule must carry** (the builder owns the wording; the content is not optional):

1. That the park is expressed in `#browse`'s coordinate space because the page is `position: absolute` inside it.
2. That `#browse` is itself a mover on four transitions and the INCOMING mover on two of them, so the offset must exceed its maximum displacement plus `L + W` — the 200vw floor, with both terms and their source lines.
3. That `-300vw` is the floor plus a viewport of margin and is the bench-measured form, with a pointer to the measurement record.
4. **The constant-viewport clause [F5]** — `d.w` is captured at touchstart and never revised, and nothing listens for `resize`; the bound holds for a gesture at a constant viewport width.

⛔ **The comment must NOT claim that the outgoing-side transitions are arithmetically exempt [F1].**
That was this plan's own error, and shipping it would put a proof that is wrong by a sign into the
stylesheet as a standing invariant, next to the value it purports to justify — where this project
treats comments as records and the next reader would take it as settled. If the comment mentions the
outgoing side at all, it states the reason that holds: parking happens only when the destination is a
browse page. The existing Invariant P and `overflow: hidden` paragraphs stay exactly as they are.

## 5. Options weighed — (a) chosen; (b) clip at the container; (c) narrow the park; (d) viewport-relative park

- **(a) Increase the park distance to `-300vw` — CHOSEN.** One declaration; no JavaScript; no box-model change; no new element and no new state. **Efficacy: measured** — the after-run of the same instrument, on the same repro, on the deployed build, with the detector proven able to fire first. **Generality: by construction, within a stated bound** — it removes the defect for every transition that transforms `#browse`, not only the one reproduced, because the floor is derived from the maximum displacement any writer can produce. **Honest residual:** it does not stop a non-participant page from being un-hidden and painted off-screen for the gesture — the cost option (c) would remove. That is a cost with no user-visible defect and no measured penalty.

- **(b) Clip parked children at `#browse`.** REJECTED — larger, and it re-opens a recorded break class for zero measured gain. `overflow: hidden` on `#browse` would make it a scroll container, which this project deliberately avoided even on `.app` (`css:236-240` records exactly that reasoning), adding a second scroll authority above the pages that own the scroller role (`css:78-99`). `overflow: clip` avoids the scroll-container problem but rests on a *spec argument* about what a clip does and does not contain — and `#browse` is the one element whose containing-block behaviour is load-bearing for the `position: fixed` `.alphaindex` strip, where the `.195`/`.196` break already happened once (`css:213-221`). The gain over (a) is nil: both keep the page off the viewport. Bigger blast radius, higher recorded risk, no measured benefit.

- **(c) Do not park pages that are not participants in the gesture** (`js/browse.js:338-342`). REJECTED as the fix; RECORDED as a deferred cleanliness item (§3). It is the more *principled* change — parking a page that was already `display:none` gives zero cover benefit, because its bitmaps were dropped when it was hidden, so the un-hide is pure cost. But **the cheap form of it does not remove the mechanism.** The cheap narrowing is "park only a page that is not already `.hidden`", and it does cover the user's repro (there, the chapter list had been hidden by a Books button-tap). A one-step variant defeats it: open the chapter list, tap Home (`js/app.js:535` hides `#browse` and leaves the chapter list as the shown page), then swipe forward to Books — the chapter list is now the shown page, is parked by the same toggle, and rides on Home exactly as before. The form that *does* remove the mechanism is "park only the page this gesture holds", and `showPage` cannot distinguish a `browse→browse` source from a merely-previously-shown page: that fact lives at the swipe seam and would have to be carried into `beginHold`. That is a contract change across `js/app.js` ↔ `js/browse.js`, in the most scar-laden code in this project, unmeasured, to remove a cost no instrument has reported — **bigger for no measured gain.** (a) and (c) are independent: (a) does not block (c), and if a paint or memory cost is ever measured, (c) lands on top of a fix that already holds.

- **(d) Make the park viewport-relative** — mirror `#home.parked` by adding `position: fixed`, or park with an inset instead of a transform. REJECTED outright, on two independent grounds. It violates Invariant P in both forms: `position: fixed` is a declared position and an inset is a declared inset, and the invariant is that the parked box must be the active box *by cascade*, never a separately-maintained restatement (`css:108-117`, `:129-139`, gated by PARKBOXEQUAL). And it re-opens a settled decision: `DecisionLog.md:1114-1125` records that a `position: fixed` page is re-contained by a transformed `#browse` and loses roughly 110px of position and 328px of height on a notched iPhone across four transitions, which is why `position: absolute` was chosen.

## 6. What must NOT regress, and the constraint each comes from

| # | Must not regress | The constraint it comes from | Held by |
|---|---|---|---|
| I1 | The park rule declares NO position, NO insets, and NO `!important` on its transform. | Invariant P (`css:108-117`, `:129-139`): the outgoing mover wears `.parked` for the whole of a `browse→browse` drag while `js/app.js:651` writes `style.transform` on it every frame, so the inline write must keep winning the cascade. | The existing gates PARKBOXEQUAL and PARKLOSESTRANSFORM (`test/swipe-declone-stage2-css.test.js:258`, `:304`) stay green. The change touches only the transform's VALUE. |
| I2 | `overflow: hidden` stays on the park rule, verbatim — not removed, not `clip`. | Two independent recorded grounds (`css:141-149`): it keeps the box a scroll container (CSS Overflow 3), and it un-suppresses Blink scroll anchoring under a non-none transform. Removing it measured a −80px reveal jump against a shipped 0px (`Claude/Loki/STRIKE-home-shift-m1-derivation.md`). | PARKBOXEQUAL asserts `overflow: hidden` on BOTH park rules from one list; mutants S2-7 and M1PARKRANGE-b/-c defend it. |
| I3 | A parked page still PAINTS — parking is not `display:none`. | `display:none` makes iOS drop decoded cover bitmaps; an aborted swipe then re-decodes every cover at once and the list visibly pops back in (device-measured: ROWS KEPT 68/68, src 22→22, +img 0 — `css:101-107`, `js/browse.js:331-337`). | Unchanged by construction (only the offset moves), plus the §4 derivation that the constant never governs a retention-exercising page, plus device gate item 2 (§8). |
| I4 | Parking stays gesture-scoped: no page is parked-and-painted after the gesture ends. | `js/browse.js:169-170` — "hand the pages back to `display:none` now, or every cached page stays painted for the rest of the session." A page parked 3 viewports away is *more* invisible, so a leak would be *less* detectable by eye. | The concurrency cell (§8 dimension 3) asserts `.parked` is cleared on BOTH `endHold` branches (`:182-185` landed; `:206-210` no-landed-page). |
| I5 | `#home.parked` keeps `-101vw` and its `position: fixed`. | It is the control case — the measurement shows it unaffected — and its compositing form is device-validated (`.256` A/B; the `.257` spec-equivalent variant flashed on device, `css:164-172`). | §3 lists it byte-identical; PARKBOXEQUAL reads both park rules, so a drive-by edit reddens. |
| I6 | The destination still renders and settles correctly (Books arrives at 0). | The fix must not trade one visual defect for another. | Measured in the after-run (`.303` + `-300vw`: 329 → 0, settling at 0); re-asserted by the real-engine oracle's settle sample (§8 dimension 10). |
| I7 | `#browse` keeps NO `overflow`, NO `will-change`, NO `transform`, NO `z-index` of its own. | It must establish no containing block for the `position: fixed` `.alphaindex` strip (the `.195`/`.196` break) and no stacking context (`css:213-223`). | §3 lists it byte-identical; option (b) is rejected partly on this ground. |
| I8 | The `.browsepage` positioning scheme stays `position: absolute; inset: 0` inside a `position: fixed` `#browse`. | Settled decision, `DecisionLog.md:1114-1125` — a `position: fixed` page is re-contained by a transformed `#browse`. | §3 lists it byte-identical; PAGEISVIEW pins it textually; option (d) is rejected on it. |
| I9 | Every registered mutation still applies. | `test/mutation-anchors.test.js` — "a rotted mutation does not announce itself"; the guard it defends becomes undefended in silence. | §7's same-commit anchor migration. |
| **I10 [F1]** | A gesture parks a page ONLY when its destination is a browse page. `renderDestination`'s `'home'` branch (`js/app.js:585`) and its overlay branch must not reach `showAppView` → `Browse.render` → `showPage`. | This is what exempts the two OUTGOING-side transitions (`browse→home`, `browse→overlay`), replacing the withdrawn arithmetic exemption. `js/app.js:573-591` + the only two `showPage` sites (`js/browse.js:526`, `:538`). | **Currently ungated — a real gap.** §8 dimension 8 registers the cheapest assertion: a `browse→home` gesture leaves no page `.parked` at any point, in the existing hold-release suite (`test/swipe-declone-stage2-browse.test.js`), whose harness already drives that transition. Until it lands, the floor is the only protection, which is exactly the belt the wrong derivation had been standing in for. |
| **I11 [F3]** | No frame paints between a mover's inline-transform CLEAR and its `.parked` REMOVAL. | Both exit windows — finalize (`js/app.js:791` → `:1128`) and hard reset (`:481-482` → `:484`) — are entirely synchronous. This, not "the constant never applies to a retention-exercising page," is the premise cover retention actually rests on (`Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r3.md:74-79`). | Not separately gated, and deliberately so — it is a property of synchronous control flow, not of a value. Recorded so that inserting an `await`, an `rAF`, or a deferred release between those two points is visibly a re-arming of R2 rather than an invisible one. |

## 7. Compatibility and migration (U10) — the three mutation anchors

Three registered mutants embed the literal text `.browsepage.parked {\n  transform: translateX(-101vw);`
and stop applying the moment the constant changes:

- `tools/mutate.mjs:1104-1107` — **S2-6** (re-declares `top: 0` → PARKBOXEQUAL)
- `tools/mutate.mjs:1108-1111` — **S2-7** (drops `overflow: hidden` → PARKBOXEQUAL)
- `tools/mutate.mjs:1114-1117` — **S2-8** (marks the transform `!important` → PARKLOSESTRANSFORM)

All three have their `from` and `to` strings migrated to the new constant **in the same commit as the
CSS change**. `test/mutation-anchors.test.js` is the gate that catches an omission, and it must be
green before the commit lands.

**Two further records in HEAD state the old park distance, and are same-commit scrub targets
[F4 — this section previously claimed there were none, which was false]:**

- `test/swipe-declone-stage2-css.test.js:301` — the `PARKLOSESTRANSFORM` header comment: *"would silently make the outgoing mover jump to `translateX(-101vw)` at drag start."* This is a **live gate's own explanation of mutant S2-8**, which this same commit migrates, in the very file the plan promises stays green.
- `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60` — a derived-facts record stating `.browsepage.parked` `transform: translateX(-101vw)`.

Neither reddens anything, which is precisely why they would have gone stale invisibly; the standards
call a second scrub pass a failure of the first (§6.6). The remaining `-101vw` hits across
`Claude/Plans/`, `Claude/Loki/` and prior casebooks are historical artifacts of completed work and are
NOT scrub targets. `Claude/Subsystems/swipe-reveal.md` speaks only of `#home.parked` and is unchanged.
`android/build/assets/www/css/app.css` holds a stale copy of the sheet but is git-ignored build output
(`.gitignore` — "Android build output, regenerated by android/build.ps1"), so it is not a scrub target
either. No other exact-key contract, serialized shape, public API, header, or log format is affected.

## 8. Coverage Model — the ten catalog dimensions, the two CI cells, the real-engine oracle, the device gate

Every dimension of the auditor's catalog appears; absence is a decision.

1. **Lifetime and reuse — APPLICABLE, and the reason this defect survived six hypotheses.** It needs a WARM page cache: a cached, non-destination `.browsepage` must exist, which is why the user's repro visits the track list first and why a cold app never shows it. Every cell below runs against a populated `pageCache` (≥2 pages, one of them away), never a fresh one. A fresh-state cell here is structurally blind.
2. **Trust boundaries and hostile inputs — NOT APPLICABLE.** Nothing is parsed, validated, or rejected; the change is a stylesheet constant with no entry path.
3. **Concurrency — APPLICABLE (the gesture-scoped park lifetime).** The interleaving that matters: `showPage` parks during a live hold and `endHold` must un-park on BOTH branches (`js/browse.js:182-185` landed; `:206-210` no-landed-page). The suite must prove no page remains `.parked` after a commit AND after an abort. **Reuse the existing hold-release coverage if a cell already asserts this; do not duplicate it.** The distance change makes a leak less visible to the eye, which raises the assertion's value without changing its content.
4. **Shape and platform matrices — APPLICABLE (viewport width).** Three points, because `L + W` and the viewport diverge across `#browse`'s 640px cap: **375px** (`L = 0`, `W = V` — the narrow case), **640px** (the tight boundary, where the parked page's right edge sits exactly at 0 when the offset equals the floor, which is why the law is a strict inequality), and **1000px** (`L = 180`, `W = 640`, so `L + W = 820 < V` and the margin grows). The real-engine oracle runs all three. **[F5]** The viewport is held CONSTANT within each run — a mid-gesture width change is outside the law's precondition and is recorded there, not covered here.
5. **Failure and rejection paths — NOT APPLICABLE.** A declaration has no error path. Its one failure mode — not being present as written — is covered textually by PARKOUTOFREACH.
6. **Numerical edges and determinism — APPLICABLE (small, but it is the whole fix). [F2 — claim corrected to match the cell.]** The floor is arithmetic, and at exactly 200vw the parked page's right edge lands exactly on the viewport's left edge — so the assertion is a STRICT inequality, `N > FLOOR`. PARKOUTOFREACH **derives both terms from source** — term 1 from the swipe's own bound, term 2 by parsing the `#browse` rule — so a change to either moves the floor rather than silently invalidating it. That claim is now true of the cell as specified below; in the pre-temper draft it was not, and the difference is the whole of F2.
7. **Contract claims — APPLICABLE.** Every absolute claim maps to a check. "Unreachable for any displacement `#browse` can take, at a constant viewport width" → PARKOUTOFREACH (the offset clears a floor derived from both terms) + DRAGREACHBOUNDED (the displacement stays inside term 1). "Cover retention cannot regress" → PARKLOSESTRANSFORM (already green) + invariant I11's no-paint-between premise + device gate item 2. "Invariant P is untouched" → PARKBOXEQUAL (already green). "A gesture parks a page only when the destination is a browse page" → the new NOPARKONHOME assertion (dimension 8). No claim is left unmapped, and none is asserted by a jsdom cell that could not fail.
8. **Composition — APPLICABLE, and the highest-value dimension here. [F1 — the outgoing-side exemption is re-based.]** The park rule composes with every mode that transforms `#browse`, enumerated from the generated matrix rather than from a grep:
   - `home→browse` and `overlay→browse` (`#browse` INCOMING, `base = +w`) — the two cells where overlap is expressible. Covered directly by the real-engine oracle (the first) and by the floor (both).
   - `browse→home` and `browse→overlay` (`#browse` OUTGOING, `base = 0`) — **exempt because NO PAGE IS PARKED during them (I10), not because of arithmetic.** The former arithmetic exemption was wrong by a sign: on a back gesture the outgoing mover travels `0 → +w`, which would put a parked page's right edge at `+0.99w`. Exempting two composition cells on a proof that does not hold is precisely the "each audits clean in isolation" failure this plan names as how six hypotheses were missed, so the exemption is re-based on the fact that does hold — and that fact is now *asserted* rather than assumed, below.
   - The `.view.nav-in-*` button-navigation keyframes — bounded by term 1; no hold is live on a button nav, so no page is parked either.
   - `browse→browse` (`#browse` untransformed; the pages are the movers and the inline write beats the class rule).

   The cross to make is {each transformer of `#browse`} × {a parked non-participant page present}, and the second factor is now known to be EMPTY for the outgoing-side pair — which is a stronger statement than the one it replaces. **New assertion, NOPARKONHOME (integration, jsdom-safe, cheapest available form):** in the existing hold-release suite (`test/swipe-declone-stage2-browse.test.js`, whose harness already drives this transition), assert that a `browse→home` gesture leaves no `.browsepage` carrying `.parked` at any point — sampled at drag start, mid-drag, and after finalize. **Mutation:** make `renderDestination`'s `'home'` branch call `showAppView(dest, true)` before returning `$('home')` (`js/app.js:585`) → a page parks during a `browse→home` drag → red. This pins I10, which nothing gates today.
9. **Persistence round-trip and version evolution — NOT APPLICABLE.** Nothing persisted, nothing versioned, nothing serialized.
10. **Functional achievement (the feature oracle) — APPLICABLE and load-bearing.** The oracle: drive the user's exact repro in a real layout engine and assert that NO `.browsepage` rect intersects the viewport at ANY touchmove sample of the forward `home→books` drag, and that the destination settles at 0. This is the claim the fix exists to make true, and it is the one thing no consistency oracle can see.

**Known-red: none introduced.**

### CI cell 1 — PARKOUTOFREACH (unit, CSS structural; node, no engine needed)

**[F2 — rewritten. The pre-temper brief summed two literals and put the provenance in a comment,
while §8 and R3 both claimed it computed the floor. A comment does not move when the source moves,
and term 2 was pinned by nothing at all, so a change to `#browse`'s box would have re-entered reach
with every cell green — the same shape as the defect being fixed.]**

- **Behavior:** the `.browsepage.parked` park offset strictly exceeds a floor DERIVED FROM SOURCE — the maximum displacement `#browse` can take, plus the parked page's right edge in viewport space (`L + W`) — so a parked page cannot compose onto the viewport at a constant viewport width.
- **Fixture / channel:** parse `css/app.css` (comments stripped first, using the parser already in `test/swipe-declone-stage2-css.test.js`). Then:
  - **Term 1 — `maxDisplacementVw`.** The swipe's bound, `100`. It is not re-derived here (a CSS test cannot read a JS clamp meaningfully); it is pinned independently by DRAGREACHBOUNDED against the real entry point, and the cell's comment names that cell as its keeper.
  - **Term 2 — `edgeVw`, DERIVED by parsing the `#browse` rule (`css/app.css:224-229`) [F7].** The quantity is `L + W`, not "page width": `#browse` is `left: 0; right: 0; max-width: M; margin: 0 auto`, so `W = min(M, V)` and `L = (V − W)/2`, giving `L + W = (V + min(M, V))/2`. Expressed in vw and maximised over `V`, that is `100` **only while `M` is a length that cannot exceed the viewport**. The cell therefore asserts the structural facts that make the bound hold — `left: 0` and `right: 0` present; a `max-width` present and expressed in `px` (or in `vw` with a value `≤ 100`); `margin` auto-centred; and no `width`, `min-width`, `padding`, or `border` on the rule that could push the border box past its containing block — and computes `edgeVw` from them. If `max-width` is a `vw` value greater than 100, `edgeVw` becomes that value.
  - **The assertions.** (i) `N > FLOOR`, `FLOOR = maxDisplacementVw + edgeVw` — STRICT, because at exactly the floor the right edge lands exactly on the viewport edge (the 640px boundary case). (ii) `N === 300`, the bench-measured shipped form.
- **Mutations (EC §4.10) — three, and the third is the one the pre-temper brief lacked:**
  - (m1) restore `translateX(-101vw)` → both (i) and (ii) redden. This is the shipped defect itself.
  - (m2) `translateX(-250vw)` → clears the floor, reddens (ii) alone. Pins the tested form independently of the arithmetic.
  - (m3) **`#browse { max-width: 640px }` → `max-width: 250vw`** → `edgeVw` becomes 250, `FLOOR` becomes 350, and **(i) reddens ALONE while (ii) stays green.** This is what gives the law-half genuine marginal detection. Without it, (i) was dominated by (ii) — every failing `N` failed both — so the assertion the plan called "the law" was itself undefended. Register m3 in `tools/mutate.mjs` targeting the `#browse` rule, with the anchor gate green.
- **Anti-vacuity:** assert the `.browsepage.parked` rule exists and declares a `translateX` before reading its magnitude, AND that the `#browse` rule was found and yielded a `max-width` — a parse miss on either side must fail loudly, never pass by absence. A cell that silently defaults `edgeVw` to 100 when it cannot find the rule is exactly the gate-greens-a-dirty-tree shape this project has already paid for.
- **Layer:** unit / source-structural. **Honest scope:** this asserts properties of CSS TEXT and arithmetic over them. It does not assert a resolved box; jsdom has no layout. Dimension 10 is where the geometry is actually witnessed. It also does not cover a mid-gesture viewport change — that is outside the law's stated precondition (§4, F5), not inside this cell's silence.

### CI cell 2 — DRAGREACHBOUNDED (integration, real entry point; jsdom-safe)

- **Behavior:** no transform any swipe writes on `#browse` exceeds `±w` from the origin, so the floor's first term is a fact about the code and not only about the plan.
- **Fixture / channel:** the app harness (`test/app-harness.js`, which boots the real `app.js`) drives a real forward `home→books` gesture, over-dragging well past `w`; capture every `style.transform` written to `#browse` across start, all moves, and the settle; parse each `translateX(Npx)` and assert `|N| ≤ w` for every sample, with at least one sample from each of the three writers (start `:630`, move `:651`, settle `:690`). This is a string on `style.transform` — observable in jsdom without layout.
- **Mutation (EC §4.10):** remove the clamp `t = Math.max(-d.w, Math.min(d.w, t))` (`js/app.js:649`) → an over-drag writes `|N| > w` → red. Register it in `tools/mutate.mjs`, with the anchor gate green.
- **Anti-vacuity:** assert at least one transform was captured and that at least one sample has `|N| > 0` — a cell that observes an untouched element passes vacuously.
- **Layer:** integration. **Why it exists:** without it, PARKOUTOFREACH's floor is a number nobody re-derives, and a later filmstrip change (a base beyond `±w`, a second concurrent mover, a wider page box) would silently re-enter reach. The two cells together are the structural form of the fix — the constant alone is a value; the constant plus the bound is a law.

### The real-engine oracle — PARKCLEARSHOME (deliberately NOT a CI cell)

- **What it proves:** dimension 10. At a fixed viewport, with a warm page cache holding a hidden non-destination page, sample every `.browsepage`'s `getBoundingClientRect()` on every touchmove of a forward `home→books` drag and assert each rect is entirely left of the viewport (`right ≤ 0`) at every sample; then assert the destination settles at 0.
- **Why it is not in `npm test`:** jsdom returns all-zero rects for everything, so a jsdom cell asserting this could not fail — a false witness, not weak coverage (EC §4.8). The repo carries no headless-engine dependency today.
- **How it runs:** authored as a **standalone script** any real engine can execute — the browser pane driving the deployed build (the instrument that produced the measurement), or a headless lane if one is ever added. Filed alongside the suite the way this project already files real-engine probes (`Claude/Loki/*.probe.js` precedent).
- **Anti-vacuity is IN THE SCRIPT, not in the operator's memory [F6].** `right ≤ 0` is satisfied by a `display:none` element, whose rect is all zeros in a real engine — `0 ≤ 0` passes — so a page that is HIDDEN rather than parked greens the oracle by degeneracy. Resting on the two-step "run it at `-101vw` first and watch it fire" protocol makes the one cell that witnesses dimension 10 depend on whether the next operator, who was not in this session, remembers a discipline; the standards name that as the fallback shape, not the normal one. The script therefore asserts, in-script and at every sample: (a) at least one `.browsepage` was sampled at all; (b) the parked page's rect is NON-DEGENERATE (`width > 0` and `height > 0`), so a hidden or unmounted page cannot satisfy the geometry claim by collapsing; and (c) the page under test actually carries `.parked`. This is the same anti-vacuity shape the plan already specifies for both CI cells, applied to the oracle. The `-101vw` fire-drill is KEPT as well — it is cheap and it validates the whole instrument rather than one assertion — but it is now a second line of defence rather than the only one.
- **Matrix:** run at 375px, 640px and 1000px (dimension 4), each at a viewport held constant for the run.
- **Rejected alternative:** add a headless-browser devDependency and a second test lane. It would make the oracle CI-resident at the cost of a browser download in CI and a new lane to maintain — churn the user has explicitly prioritised against, for a fix whose geometry is already measured. The condition that would change this answer: a third real-engine-only defect in this area, at which point the lane is cheaper than the repeated manual instrument.

### The device gate (real iOS — the fix is NOT called done without it)

1. **The user's exact repro:** refresh → Now Playing → swipe forward to the track list → Home → Books → swipe back to Home → swipe forward to Books. **Expect: no garbage over Home at any point of the forward drag.**
2. **Cover retention, unchanged:** a `browse→browse` swipe ABORTED mid-drag returns to the source list with covers already decoded — no pop-in, no re-decode of the whole list. This is the property parking exists for (I3) and the one §4 derives cannot regress. It is gated anyway, because a compositing spec argument has been falsified on real iOS in this project before.
3. **Honest limit:** if garbage remains after (1) passes, this fix removed *a* contributor and not *the* garbage — measurement item 4, which that record explicitly left open. The per-touchmove instrument already exists and re-runs.

## 9. Bench-answerable versus device-owed

**Bench-answerable — already answered, or answerable without a device:**

- The mechanism, the 4px Δ, and the `-300vw` after-run — **already measured** in a real Blink engine on the deployed build.
- The floor's two terms — term 1 source-derived from `js/app.js:505/558/602/649/690` and pinned by DRAGREACHBOUNDED; term 2 (`L + W`) derived from `css:224-229` by PARKOUTOFREACH and pinned by its m3 mutant. **[F5]** Both hold for a gesture at a constant viewport width, which is a stated clause of the law rather than an unnamed assumption.
- Invariant P and the `overflow: hidden` retention — CSS-textual, held by the two existing gates.
- The geometry across the viewport matrix, and the destination settle — the real-engine oracle (bench, not device).
- The park lifetime across a gesture — jsdom-observable class toggles.
- **[F1]** That no page is parked when the destination is not a browse page (I10) — jsdom-observable, and now asserted by NOPARKONHOME rather than assumed.

**Device-owed — real iOS, and labelled spec-derived until it passes:**

- **That a page parked 3 viewports away retains its decoded cover bitmaps exactly as one parked 1.01 viewports away does.** The argument is §4, in its corrected form **[F3]**: the page whose retention is exercised is always a mover, so an inline transform governs it on every frame of the drag, and in the two windows where it briefly wears `.parked` with no inline transform — finalize and hard reset — no frame paints, because both windows are entirely synchronous (invariant I11). The earlier form of this sentence claimed the constant *never* applies to such a page, which was too strong: it does apply, briefly, and is saved by an ordering property. Separately, both distances are entirely outside the viewport, so any interest-rect or tile-discard heuristic keyed on visibility treats them identically — one keyed on *distance* would need a threshold between 1.01 and 3 viewports. That remains a spec argument about compositing, and stage 6g's `translateZ(0)` was a spec argument about compositing that real iOS falsified. Device gate item 2 settles it.
- **Whether this is the whole of the reported garbage** (measurement item 4). Only the user's device can answer.
- Nothing else. In particular the geometry is NOT device-owed — it was measured on the bench, and it is arithmetic.

## 10. Risk registry

- **R1 — the fix removes one contributor, not all of the reported garbage.** Named openly by the measurement (item 4). Not mitigable by design; mitigated procedurally — the device gate is the user's exact repro, and the per-touchmove instrument that found this one is already built and re-runnable. The fix is correct and required either way: the parked page provably composites onto Home, whatever else may also.
- **R2 — cover retention at 3 viewports (device-owed).** Argued against on two independent grounds (§4, §9), one of which — I11's no-paint-between-clear-and-un-park — is now written down rather than assumed (F3), and gated (device gate item 2). Fallback if it bites: `-201vw` still clears the floor and roughly halves the distance, then option (c). **[F8 — a reviewer's note, deliberately NOT acted on now.]** Both fallbacks vary the same untested quantity or re-open the same seam, and no *distance-free* park form — one that keeps the box laid out and painted while making it invisible, rather than moving it — appears among the four options weighed. Pursuing one now would re-open the same device-owed compositing question R2 already carries, for no measured gain, and the present option set is adequate for the decision in front of us. It is recorded only so that if device gate item 2 fails, the fallback discussion starts from more than one candidate instead of being re-derived from scratch.
- **R3 — the floor rots. [F2 — the mitigation is now real rather than half-claimed.]** A later change to the filmstrip geometry (a mover base beyond `±w`, a wider `#browse` box, a new `#browse` transformer) could re-enter reach with the constant untouched, and nothing would report it. Mitigated structurally rather than by memory, on BOTH terms: DRAGREACHBOUNDED pins term 1 against the real entry point, and PARKOUTOFREACH now derives term 2 by parsing the `#browse` rule, with mutant m3 (`max-width: 250vw`) proving the derivation reddens when that box changes. The pre-temper draft claimed this mitigation while the cell summed two literals with the provenance in a comment — term 2 was pinned by nothing, so the exact rot this risk names would have landed with a full green suite and a CSS comment saying the case was covered by construction. That was the same shape as the defect this plan fixes: a constant and a container that each audit clean alone. **[F5]** The floor also carries a stated precondition — a constant viewport width for the gesture's duration — which is a limit of the law, not a gap in its enforcement.
- **R6 — I10 is load-bearing and, until NOPARKONHOME lands, ungated. [F1]** The exemption for the two outgoing-side transitions rests on `renderDestination`'s `'home'` and overlay branches never reaching `showPage`. If something later makes `browse→home` render browse content, or a concurrent hold parks a page across it, the real protection is gone — and the pre-temper draft would have left a stylesheet comment asserting an arithmetic proof that was wrong by a sign in its place. The floor still saves it at `-300vw`; the record would not have. Mitigated by registering the assertion and its mutant (§8 dimension 8) rather than by asserting the fact in prose.
- **R4 — mutation-anchor rot (mechanical).** Three anchors embed the old constant (§7). Caught by `test/mutation-anchors.test.js` if forgotten; listed as a same-commit obligation so it is not discovered later as three silently-undefended guards.
- **R5 — a reviewer reads the distance as a magic number.** It is not: §4 derives a floor, the shipped value is floor plus margin, and that value is the bench-tested form. Stated here because "just make it bigger" is the shape this fix superficially has, and an untested variant would have the same shape.

## 11. Handoff

**Source artifact:** this plan (`Claude/Plans/PLAN-parked-page-rides-home.md`).

**Verdict / status:** **PLAN_READY (round-1 temper applied, 2026-08-02).** A parked browse page
composites onto Home for the entire duration of a forward `home→browse` swipe because its park is
expressed in `#browse`'s coordinate space while `#browse` is the incoming mover. The fix moves the
park beyond the container's maximum reach: `.browsepage.parked` `translateX(-101vw)` →
`translateX(-300vw)` — one declaration, no JavaScript. **The shipped constant did not change in the
temper**; the review re-derived the floor independently and it did not move.

**What the temper changed** (`Claude/Charpy/PLAN-parked-page-rides-home-charpy.md`, verdict TEMPER):

| # | Finding | Resolution |
|---|---|---|
| F1 | Structural — §4's proof that the outgoing-side pair cannot overlap had the wrong sign; `t = Math.max(0, dx)` for a back gesture, so the outgoing `#browse` travels `0 → +w` and the true figure is `+0.99w` of overlap, not `−0.01w`. | Arithmetic exemption WITHDRAWN. Re-based on invariant **I10** — a gesture parks a page only when the destination is a browse page (`renderDestination`'s `'home'` and overlay branches never reach `showPage`), which covers BOTH outgoing-side transitions rather than only `browse→home`. New assertion **NOPARKONHOME** with its mutant (§8 dim 8); new risk **R6**; the false derivation is explicitly BARRED from the shipped CSS comment (§4). |
| F2 | Structural — `PARKOUTOFREACH` summed two literals with provenance in a comment while §8 and R3 both claimed it computed the floor; term 2 was pinned by nothing, and assertion (i) had zero marginal detection. | Cell rewritten: term 2 is DERIVED by parsing the `#browse` rule; assertion (i) is a STRICT inequality; new mutant **m3** (`#browse { max-width: 250vw }`) reddens (i) alone. §8 dim 6 and R3 restated to match what the cell now does. |
| F3 | Weak — the retention argument was demonstrated at gesture ENTRY only; the two exit windows rest on an unstated premise already recorded elsewhere. | §4 gains the two exit windows and the real premise (no paint between the transform clear and the un-park), cited to `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r3.md:74-79` with its drifted line cites corrected. Recorded as invariant **I11**; §9's device-owed entry corrected from "never applies" to "applies briefly, saved by ordering". |
| F4 | Weak — §7's "no other record in HEAD states a park distance" was false. | Both counterexamples added as same-commit scrub targets: `test/swipe-declone-stage2-css.test.js:301` (a live gate's own comment) and `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60`. Historical artifacts explicitly excluded. |
| F5 | Weak — the floor mixes units: `d.w` is pixels captured at touchstart, the park is `vw` at render, and no `resize`/`orientationchange` handler exists. | Constant-viewport precondition stated in the law (§4), verified independently (the only match in `js/` is the vendored `eruda.js`), required in the CSS comment, and reflected in §8 dims 4/6 and §9. Named as a limit of the law, not a regression — at `-101vw` the same rotation is far worse. |
| F6 | Weak — the oracle's `right ≤ 0` is satisfied by a `display:none` element's all-zero rect. | In-script non-degeneracy assertions specified (a page was sampled; `width > 0` and `height > 0`; the page carries `.parked`). The `-101vw` fire-drill is kept as a second line rather than the only one. |
| F7 | Note — the floor's second term omits `#browse`'s centring offset. | Term corrected to `L + W` throughout §4 and folded into F2's derivation, with the worst case `(V + min(640, V))/2 ≤ V`. The 200vw floor is unchanged. |
| F8 | Note — R2's fallback ladder lists only a smaller dose of the same untested variable; explicitly not to be acted on now. | Recorded in R2 as a note, with the reason it is NOT pursued now and the trigger that would make it relevant. No option was added or re-opened. |

**Decisions made:** (a) over (b) and (c). (b) re-opens the `.alphaindex` containing-block break class
and adds a scroll authority for zero measured gain. (c) is more principled, but its cheap form does
not remove the mechanism — a one-step variant of the repro defeats it — and its complete form is a
seam contract change with no measured gain, so it is deferred, not rejected on merit. (d) violates
Invariant P and re-opens a settled positioning decision. The shipped value is the bench-tested form,
not the minimum that clears the floor.

**Open questions / who each waits on:** R1 (is this the whole of the garbage) — DEVICE, downstream of
the build. R2 (cover retention at the new distance) — DEVICE, strongly argued against, fallback
specified.

**Next owner:** **Charpy**, for a round-2 read of the two structural resolutions only (F1's re-based
exemption and F2's derived cell) — the rest of the plan was struck in round 1 and survived, and is not
re-opened. Then Curie (three CI cells — PARKOUTOFREACH, DRAGREACHBOUNDED, NOPARKONHOME — plus the
real-engine oracle script, red first), then Brunel (the one-declaration change, the comment, the three
mutation anchors, the two F4 scrub targets), then the device gate.

**Required evidence / gates:** PARKOUTOFREACH green and mutation-verified on **all three** mutants,
including m3 reddening assertion (i) ALONE; DRAGREACHBOUNDED green and mutation-verified; NOPARKONHOME
green and mutation-verified; `test/mutation-anchors.test.js` green after the anchor migration;
PARKBOXEQUAL and PARKLOSESTRANSFORM still green; the real-engine oracle run at all three viewport
widths with its in-script non-degeneracy assertions active; both device-gate items. The defect is NOT
called fixed without the device gate.

**Records to scrub on approval:** the `.browsepage.parked` comment gains the distance law and its
constant-viewport clause (`css/app.css:101-121`); three anchors in `tools/mutate.mjs`; **the two F4
targets — `test/swipe-declone-stage2-css.test.js:301` and
`Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60`**; a decision entry in
`Claude/Decisions/DecisionLog.md`; a board row in `Claude/Zelda/Board.md`. The measurement record
(`Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md`) is annotated as realized by this
plan — its four open items are answered here as: (1) §4 plus device gate item 2; (2) §5; (3) §6 I1;
(4) R1, still open and device-owed.

VERDICT: PLAN_READY — round-1 temper applied 2026-08-02; F1–F8 resolved as tabled in §11; shipped
constant unchanged at `-300vw`.
