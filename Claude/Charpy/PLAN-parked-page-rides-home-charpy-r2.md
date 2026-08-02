# Plan review — PLAN-parked-page-rides-home.md, round 2

Type: plan-review
Plan: `Claude/Plans/PLAN-parked-page-rides-home.md` — the round-1 temper applied at `dcebdb1`, 424 lines
Scope: **F1 and F2's resolutions only.** Everything else was struck in round 1 and survived;
re-reviewing it is ceremony. The four weak fixes were read only far enough to confirm they did not
disturb the two structural ones — they did not (see the closing note).
Round: 2
Finding numbering: continues round 1's series (which filed F1–F8), so this round opens at **F9**.
Reviewed at: HEAD `dcebdb1`, tree clean
Date: 2026-08-02

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

## Applicability

- **defining_records: true** — both resolutions rest on records: F1's on the `showPage` reachability
  graph (`js/app.js:515-537`, `:573-591`; `js/browse.js:521-538`), F2's on the `#browse` box rule
  (`css/app.css:224-229`). Both struck against source this round.
- **boundary_relocation: false** — unchanged from round 1. The resolutions add two test cells, one
  invariant, one risk and one mutant; no ownership moves.
- **callee_replacement: false** — unchanged. No JavaScript executes differently.
- **contract_shape: false** — unchanged. No returned or serialized shape changes.

## Verdict

Verdict: **TEMPER.** Both resolutions are the right *design*. F1's re-basing is genuinely stronger
than the framing I gave it — I10's mechanism is true, and I verified it exhaustively: `showPage` has
exactly two call sites (`js/browse.js:526`, `:538`), both inside `Browse.render`, and a gesture
reaches `Browse.render` only through `showAppView`'s else branch, which `renderDestination`'s `'home'`
branch never takes. F2's rewrite is a real repair: the cell now asserts the structural facts that
make the bound hold — `left`/`right` present, `margin` auto, and **no `width`, `min-width`, `padding`
or `border`** — which pins the properties that can actually widen the box, not just the one that
cannot. The `L + W` correction is folded in correctly and I re-checked the floor at 375px, 640px and
1000px; it does not move. The ⛔ barring the false derivation from the shipped comment is exactly
right.

What does not hold is that **both new witnesses cannot fail**, each for a concrete, checked reason,
and each on the precise axis round 1 named. NOPARKONHOME's registered mutant is equivalent —
`showAppView({v:'home'}, true)` takes the home branch at `js/app.js:535` and never reaches
`Browse.render`, so no page parks and the cell stays green (F9). And PARKOUTOFREACH gives two
mutually contradictory computations for `edgeVw` one sentence apart; under the derivation the plan
itself states, m3 is equivalent and assertion (i) is undefended again — the round-1 defect returning
in new clothing (F10). A gate that greens a dirty tree is this project's named scar and the carve-out
the verdict is reserved for, so it is TEMPER rather than a note on a FORGE.

**Neither finding changes the shipped constant, the option set, the floor, the sequence, or any prose
the reader will see.** Both are corrections to a mutant: one must be replaced, one must be
disambiguated. I have checked a candidate for each against source so the next pass is not a search.

**What survives the strike.**

| Claim | Struck against | Result |
|---|---|---|
| I10's mechanism — only the `browse-page`/`browse-host` branches reach `showPage` | `js/app.js:573-591` (`renderDestination`), `:515-537` (`showAppView`), `js/browse.js:521-538` | **Confirmed, and it is exhaustive.** `showPage` is called at exactly `js/browse.js:526` (cache hit) and `:538` (cache miss), both inside `render`. `showAppView` reaches `Browse.render` only in its `else` branch (`:536`); the `desc.v === 'home'` branch (`:535`) does not. `renderDestination`'s `'home'` branch (`:585`) and its overlay tail (`:586-590`) call neither. The exemption is stronger than the arithmetic one it replaces and it does cover `browse→overlay` as claimed. |
| I10's *scope* — that this is all a gesture can do | `js/app.js:2774`, `js/nav.js:125-153`, `js/app.js:420` | **Over-reaches — F11.** A second path reaches `showPage` while `holdRows` is true. |
| The `L + W` correction and the floor | `css/app.css:224-229`; re-derived at 375px / 640px / 1000px | **Confirmed.** `L + W = (V + min(640px, V))/2 ≤ V`, bound still 100vw, floor still 200vw, and the strict inequality is correctly motivated by the 640px boundary case where the right edge lands exactly on 0. |
| Term 2's cell now derives rather than pins | §8 cell 1's fixture spec | **Confirmed in structure.** It parses the `#browse` rule and asserts the properties that could push the border box past its containing block are absent. This is the right set — it is what `max-width` alone cannot tell you. The arithmetic it computes from them is where F10 sits. |
| The anti-vacuity clause on the new parse | §8 cell 1 | **Confirmed and well-aimed.** Requiring the `#browse` rule to be found and to yield a `max-width`, rather than defaulting `edgeVw` to 100, closes the specific silent-pass shape. |
| m2 still reddens (ii) alone | `N = 250` against (i) `N > 200`, (ii) `N === 300` | **Confirmed.** 250 clears the floor and fails the form pin. |
| The four weak fixes did not disturb the structural ones | §4 items 1-3 (I11), §4's precondition clause, §7's scrub list, §8's oracle | **Confirmed.** The exit-window premise is now stated and attributed (I11); the constant-viewport clause is stated as a clause of the law and routed into the CSS comment; both records I named are in the scrub list (`test/swipe-declone-stage2-css.test.js:301`, `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60`); none of them touches F1's or F2's machinery. |

## Defining records

**AGREE on both resolutions' design and on I10's mechanism. Two CONFLICTs, both between the plan and
the source its own mutants name.**

| Record | Standing | Reconciliation |
|---|---|---|
| `js/app.js:515-537` — `showAppView`'s `desc.v === 'home'` branch | HEAD source, read directly | **CONFLICT with §8 dimension 8's NOPARKONHOME mutant — F9.** The mutant calls `showAppView(dest, true)` on a home destination, which takes the home branch and never reaches `Browse.render`. |
| `js/browse.js:521-538` — `render`'s two `showPage` sites | HEAD source, read directly | **AGREE, and it is what makes I10's mechanism exhaustive.** Also confirms the killing mutant candidate below does not throw: a cache miss builds a page node and calls `showPage` for any key, and `keyOf` keys `'home'` to itself. |
| §4's term-2 derivation (`L + W = (V + min(M, V))/2`) vs §8 cell 1's rule ("if `max-width` is a `vw` value greater than 100, `edgeVw` becomes that value") | Both in the plan under review | **CONFLICT — F10.** The two give different answers for m3, and which one the test author implements decides whether assertion (i) has any detection at all. |
| `js/app.js:2774` (`renderBrowse: (desc) => Browse.render(desc)`) + `js/nav.js:153` + `js/app.js:420` | HEAD source, read directly | **GAP — F11.** A button nav reaches `showPage` during a live hold; `begin()`'s `finishing` gate guards gesture arming, not navigation. R6 files this as a future possibility; it is a present path. |

---

## Findings

### F9 — NOPARKONHOME's registered mutant is equivalent, so the gate that replaces the withdrawn exemption cannot fail

**Severity: Structural. Nature: defect.**

§8 dimension 8 specifies the mutation as: *"make `renderDestination`'s `'home'` branch call
`showAppView(dest, true)` before returning `$('home')` (`js/app.js:585`) → a page parks during a
`browse→home` drag → red."*

On a `browse→home` gesture `dest.v === 'home'`, and `showAppView` (`js/app.js:515-537`) branches on
exactly that:

```
if (desc.v === 'home') { $('home').classList.remove('parked'); $('browse').classList.add('hidden'); }
else { $('browse').classList.remove('hidden'); if (render) Browse.render(desc); }
```

The mutant therefore takes the **first** branch. It un-parks `#home` (already done on the line above
it) and hides `#browse`. It never reaches `Browse.render`, so it never reaches either `showPage` call
site, so **no page is parked and NOPARKONHOME stays green.** The `render` argument the mutant passes
is not read on that branch at all.

This matters more than an ordinary dead mutant. NOPARKONHOME is the only witness for I10, and I10 is
what the plan substituted for the arithmetic exemption it withdrew. As specified, the substitution
trades a proof that is wrong for an assertion that cannot fail — and §8 dimension 7 lists *"A gesture
parks a page only when the destination is a browse page" → the new NOPARKONHOME assertion* as the
check that maps that absolute claim. R6 then describes I10 as mitigated *"by registering the
assertion and its mutant ... rather than by asserting the fact in prose."* With an equivalent mutant
it is still prose, now with a green test beside it.

**Cost if built as written.** Curie writes a cell, the sweep reports the NOPARKONHOME mutant
surviving, and the round trip lands at build time in the project whose top concern is churn — or,
worse, the mutant is recorded as verified on the strength of the plan's say-so and the invariant
ships undefended.

**Candidate killing mutant, checked against source so the next pass is not a search.** Delete the
`desc.v === 'home'` guard at `js/app.js:535` so a home destination falls into the else branch. Then a
`browse→home` gesture calls `Browse.render({v:'home'})`, which takes the cache-miss path
(`js/browse.js:533-538`) — `keyOf` keys `'home'` to itself, so no throw — builds a page node and
calls `showPage`, which parks every other cached page while the gesture is live. NOPARKONHOME
reddens. This is also the *realistic* form of the regression I10 guards: the branch that keeps a home
destination off the browse render path being lost. I state it as a candidate, not a requirement — the
test author owns the form; what the plan owes is a mutant that actually makes a home-destination
gesture reach `showPage`.

### F10 — PARKOUTOFREACH specifies two contradictory computations of `edgeVw`, and under the one §4 derives, m3 is equivalent

**Severity: Structural. Nature: defect.**

§8 cell 1 states the derivation and then a rule that contradicts it, in the same bullet:

> `W = min(M, V)` and `L = (V − W)/2`, giving `L + W = (V + min(M, V))/2`. Expressed in vw and
> maximised over `V`, that is `100` **only while `M` is a length that cannot exceed the viewport**.
> … If `max-width` is a `vw` value greater than 100, `edgeVw` becomes that value.

The formula and the "only while" clause disagree. For `M > V`, `min(M, V) = V`, so
`L + W = (V + V)/2 = V = 100vw` — the bound is 100 **for every `M`**, including `M = 250vw`. That is
not an accident of the algebra; it is the layout: `#browse` is `left: 0; right: 0`, so its available
width is 100vw and `max-width` can only cap it, never expand it. A `max-width` above 100vw is not
binding and changes no geometry.

So the two readings give different verdicts on the mutant the plan built to close round 1's F2:

- **Implement the derivation** (`edgeVw = (100 + min(M, 100))/2 = 100`): m3 yields `FLOOR = 200`,
  `N = 300 > 200`, **(i) stays green.** m3 is equivalent, assertion (i) is undefended, and round-1 F2
  is not closed — the law-half is dominated by (ii) exactly as before.
- **Implement the special case** (`edgeVw = 250`): `FLOOR = 350`, **(i) reddens alone** as the plan
  claims, and m2 confirms the converse. The cell works, but its arithmetic is then a deliberate
  conservatism — "a `max-width` above 100vw is barred as a structural red flag" — rather than the
  derivation §4 states, and nothing in the plan says so.

**Cost if built as written.** One of the two readings re-opens the finding this round exists to
close, and the plan gives the test author no way to tell which is intended. §8 dimension 6, R3 (*"the
mitigation is now real rather than half-claimed … on BOTH terms"*) and the handoff's required-evidence
line (*"including m3 reddening assertion (i) ALONE"*) all assert the second reading; §4 and the
cell's own formula state the first.

**Cheapest resolution, and it is better than picking a side.** The cell already asserts that `width`,
`min-width`, `padding` and `border` are absent from the `#browse` rule — the properties that *can*
push the border box past its containing block. A mutant against one of those is a real widening, not
a notional one, and it reddens the law-half alone. `#browse { max-width: 640px }` → `width: 200vw` is
the direct form. Keeping m3 as well is fine if the plan says plainly that the >100vw `max-width` bar
is a structural guard rather than a term of the arithmetic — but on its own m3 cannot carry the
claim, because whether it kills depends on which of the plan's two sentences the author reads.

### F11 — I10 is stated more broadly than its mechanism supports; R6 files a present path as a future one

**Severity: Weak. Nature: defect.**

I10 reads *"A gesture parks a page ONLY when its destination is a browse page."* The mechanism given
— `renderDestination`'s `'home'` and overlay branches never reach `showPage` — is true and I verified
it exhaustively. But it is not the only path to `showPage` while a hold is live. `applyScreen` with
`render: true` calls `d.renderBrowse(desc)` (`js/nav.js:153`), injected as
`(desc) => Browse.render(desc)` (`js/app.js:2774`), which reaches both `showPage` sites. That is
reachable during a gesture's settle window: `holdRows` stays true until `dropRowHold()` at
`js/app.js:1128`, roughly 340ms after finger-up, and `begin()`'s `finishing` gate (`:420`) guards
**arming a new gesture**, not navigating. A navbar tap in that window parks pages while a
`browse→home` gesture is still settling — so dimension 8's second factor, *{a parked non-participant
page present}*, is not empty for the outgoing-side pair in the way I10 asserts.

Two things keep this off the blocking list. The fix covers it: at `-300vw` the right edge is at most
`+w − 3w + (L + W) ≤ −w`. And `applyScreen` runs `resetSwipeStyles` (`js/nav.js:129`) *before*
`d.renderBrowse` (`:153`), so `#browse`'s inline transform is cleared before any page is parked — the
two conditions are ordered apart on that path at HEAD.

**Cost if built as written.** R6 says *"if something later makes `browse→home` render browse content,
**or a concurrent hold parks a page across it**, the real protection is gone"* — filing as a future
contingency something that is a present code path guarded only by an ordering inside `applyScreen`
that nothing pins. The correction is scope, not substance: state I10 as its mechanism
(*`renderDestination`'s home and overlay branches never reach `showPage`*), which is what the
exemption needs and what NOPARKONHOME can witness, and move the button-nav path from R6's future
clause to a named present path covered by the floor.

---

## Coverage

Both blocking findings are mutant defects, and each discharges on a mutation-verification result
rather than on prose:

- **F9** — discharged when NOPARKONHOME names a mutant that makes a home-destination gesture actually
  reach `showPage`, and the sweep reports it killed. The candidate above (`js/app.js:535`'s guard) is
  checked against source and does not throw; any mutant with the same effect closes it.
- **F10** — discharged when the cell states one computation of `edgeVw` and names a mutant that
  reddens assertion (i) while (ii) stays green under *that* computation. A `width: 200vw` mutant on
  the `#browse` rule satisfies it under either reading; m3 alone does not.

Non-blocking: F11 is a scoping correction to I10's wording and one clause of R6. It gates nothing.

Unchanged and re-affirmed from round 1: the constant, the 200vw floor, the option set, Invariant P
compatibility, the three anchor migrations, DRAGREACHBOUNDED, and the device gate. Nothing in this
round asks for a different value or a different sequence.

---

## Prediction — where this breaks in execution if built as written

The build is still small and still lands clean. The break is one layer up, in the test lane, and it
is the same break twice: Curie writes both new cells to spec, runs the sweep, and two mutants come
back **surviving** — NOPARKONHOME's because it never reaches the render path, m3's if the `edgeVw`
derivation was implemented as §4 states it. Under the project's mutation gate that is a red lane, not
a silent pass, so the failure is loud. What it costs is the round trip: the sweep runs late, both
surviving mutants have to be diagnosed back to a plan sentence rather than a test bug, and the
diagnosis for m3 lands on a contradiction the plan holds inside a single bullet — the most expensive
kind to find from the outside, because both readings look deliberate.

The worse branch is the quiet one. If either mutant is recorded as verified on the plan's say-so —
and both are named with enough confidence to invite that — then the plan ships two green cells that
witness nothing, in place of one arithmetic proof that was wrong by a sign. That is a strictly worse
position than round 1, because a wrong proof reads as a claim someone can check and a vacuous gate
reads as settled. Registering both mutants first and confirming they redden **before** the cells are
written is what keeps this round from being the round that traded a visible error for an invisible
one.
