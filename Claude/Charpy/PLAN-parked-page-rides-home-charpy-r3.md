# Plan review — PLAN-parked-page-rides-home.md, round 3

Type: plan-review
Plan: `Claude/Plans/PLAN-parked-page-rides-home.md` — the round-2 temper applied at `ba10c72`
Scope: **F9's and F10's resolutions, and the new §11 exit condition.** Rounds 1 and 2 struck
everything else and it survived. F11's scoping application was read only far enough to confirm it
disturbed neither resolution — it did not.
Round: 3
Finding numbering: continues the series (round 1 filed F1–F8, round 2 F9–F11), so this round opens
at **F12**.
Reviewed at: HEAD `ba10c72`, tree clean
Date: 2026-08-02

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

## Applicability

- **defining_records: true** — both resolutions turn on records: F9's on the call graph that reaches
  `showAppView` (`js/swipe.js:106-114`, `:260`; `js/app.js:573-591`), F10's on the `#browse` rule's
  declaration text and CSS 2.1 §10.3.7/§10.4. Both struck against source this round.
- **boundary_relocation: false** — unchanged across all three rounds. Two replaced mutants, one added
  mutant, one exit condition; no ownership moves.
- **callee_replacement: false** — unchanged. No JavaScript executes differently.
- **contract_shape: false** — unchanged. No returned or serialized shape changes.

## Verdict

Verdict: **TEMPER.** The reasoning this round asked me to check is sound, and one part of it is
better than what I gave. **m4's CSS 2.1 §10.4 argument is correct** — I verified it rather than
accepting it, and it holds including the step the plan hedges past. And the **§11 exit condition
genuinely binds**: it names the instrument, quotes its real exit line (`tools/mutation-sweep.mjs:239`,
verbatim at HEAD), and makes a survivor a blocking finding rather than a waiver. It cannot be
satisfied on a say-so at the granularity it operates on.

It does not hold that either replaced mutant works.

**F9's replacement is equivalent for the same structural reason the original was, one link earlier in
the chain.** `showAppView` has exactly two call sites — `js/app.js:579` and `:580` — both inside
`renderDestination` and both gated on `host === 'browse-page'` / `'browse-host'`. A `browse→home`
gesture computes `destinationHost = 'home'` (`js/swipe.js:114`), passes it at `js/swipe.js:260`, and
takes the `host === 'home'` branch at `js/app.js:585`, which calls neither. **`showAppView` never runs
on that gesture**, so breaking its guard at `:535` — by any means, string change or otherwise — is
unobservable there and NOPARKONHOME stays green (F12).

**This one is mine.** My round-2 casebook proposed that exact mutant and called it "checked against
source". What I checked was the half that could throw — `keyOf` keying `'home'` to itself — and not
the half that decides whether the mutation is reached at all. Vitruvius adopted the candidate and
improved it (the string-change-not-`if (false)` point is right, and I had missed the lint interaction
entirely), but the reachability premise came from me and was never re-derived. That is D6 failing in
the direction it exists to catch: a reviewer's proposal held to a lower standard than the plan's.
Below I give a replacement with **every link in the chain checked and named**, so it can be verified
rather than trusted.

**F10's resolution is right where it matters and wrong in its two new mutants' texts.** The
arithmetic is now stated once, the `>100vw` `max-width` rule is correctly reclassified as a structural
guard, and m3 is honestly relabelled. But m3′ and m4 are both specified as *replacing* the
`max-width: 640px` declaration, which deletes it — while both of their justifications depend on it
surviving ("the surviving `max-width`"; "`min-width` BEATS `max-width`"). Deleting it trips the cell's
own anti-vacuity clause, which requires the `#browse` rule to yield a `max-width`. So each mutant
reddens the missing-`max-width` check rather than the `no-width` / `no-min-width` assertion it is
registered to witness, and those two assertions end up with no discriminating mutant — round-1 F2's
domination shape, one level down in the precondition set (F13). The fix is to make both additive:
`max-width: 640px;` → `max-width: 640px; width: 200vw;` and `max-width: 640px; min-width: 200vw;`.
That also makes m4's §10.4 citation literally true, since the formula it invokes needs a `max-width`
to beat.

**Neither finding changes the constant, the floor, the option set, the sequence, or `css/app.css`.**
Both are corrections to a mutant's text.

**What survives the strike.**

| Claim | Struck against | Result |
|---|---|---|
| **m4's layout argument — the load-bearing new claim of this round** | CSS 2.1 §10.4 and §10.3.7, applied to `#browse`'s box | **Confirmed, and it holds for a reason the plan does not state.** §10.4: the used width is re-solved with `min-width` as the computed width when the max-width result is smaller, so `min-width: 200vw` beats `max-width: 640px` and `W = 200vw`. The step the plan's "`edgeVw` really would be ~200" skips: with `left: 0`, `right: 0`, `width` now non-auto and both margins `auto`, the box is over-constrained, and §10.3.7 says equal margins are used *unless that makes them negative* — here they would be −50vw each, so for `ltr` `margin-left` is set to **0** and `margin-right` solves to −100vw. Hence `L = 0`, `L + W = 200vw`, `FLOOR = 300`, and `N = 300` fails the strict inequality. Had the margins centred instead, `L` would be −50vw, `L + W = 150vw`, `FLOOR = 250`, and `N = 300` would have cleared it — so the conclusion depends entirely on that clause. The answer is right; the derivation is worth writing down, because "~200" is the difference between a killing mutant and an equivalent one. |
| The single computation of `edgeVw`, and the reclassified `max-width` bar | §8 cell 1 against `css/app.css:224-229` | **Confirmed and correct.** `edgeVw = (100 + min(M, 100))/2` maximised over `V` is 100 under the preconditions, for every `M` — which is exactly why the `>100vw` bar is a guard and not a term. The plan now says so in the same bullet where it used to contradict itself. |
| That assertion (i) now has detection independent of (ii) | the five-mutant set against (i)/(ii) | **Confirmed in principle.** m1 reddens both, m2 reddens (ii) alone, and m3/m3′/m4 redden (i)'s precondition half while (ii) stays green. Round-1 F2's domination is broken. F13 is about *which* precondition each one reddens, not about whether (i) can fail. |
| F9's equivalence diagnosis itself | `js/app.js:535-536` | **Confirmed, independently and in the same terms.** The home branch never reads `render`. |
| The replacement mutant's non-throw half | `js/browse.js:22` (`keyOf`), `:97-98` (`placeholderFor`) | **Confirmed.** `keyOf` falls through its ternary to `d.v`; `placeholderFor` returns the skeleton for any non-`files` descriptor. Neither throws for `{v:'home'}`. This half of the round-2 candidate was right. |
| The string-change-not-`if (false)` refinement | `test/lint.test.js` running under `npm test` | **Accepted, and it is a real catch I missed.** A constant condition would redden the LINT cell and mis-attribute the kill. |
| §11's exit condition binds by execution | `tools/mutation-sweep.mjs:239` | **Confirmed verbatim:** `process.exit(uncaught.length \|\| unapplied.length \|\| staleBenign.length ? 1 : 0)`. A survivor exits nonzero. See F14 for the one granularity it cannot reach. |
| F11's application did not disturb either resolution | §8 dim 8, dim 7, R7 | **Confirmed.** I10 is restated as its mechanism, dimension 8's "second factor is empty" is narrowed to the gesture's own destination render, and the button-nav path is promoted to R7 with the `resetSwipeStyles`-before-`renderBrowse` ordering named as unpinned rather than relied on silently. |

## Defining records

**AGREE on the arithmetic, on m4's layout argument, and on the exit condition. Two CONFLICTs, both
between a mutant's specified text and the source or the cell it is meant to exercise.**

| Record | Standing | Reconciliation |
|---|---|---|
| `js/swipe.js:106-114` (`destinationHost`) + `:260` (the call) + `js/app.js:573-591` | HEAD source, read directly | **CONFLICT with §8 dimension 8's replacement mutant — F12.** `destinationHost` is `'home'` for a home destination; `renderDestination`'s `host === 'home'` branch (`:585`) calls neither `showAppView` nor `Browse.render`. Nothing inside `showAppView` is reachable on a `browse→home` gesture. |
| `js/swipe.js:187` (`renderDestination = 'home-host'`) vs `js/app.js:585` (`host === 'home'`) | HEAD source | **AGREE — not a defect, recorded because it is a trap for the next reader.** The plan field `renderDestination` (`'home-host'`, what the generated matrix prints) and the argument actually passed (`destinationHost`, `'home'`) are different values. A mutant or a cell written against the matrix's label would target a string the dispatch never sees. |
| §8 cell 1's anti-vacuity clause ("the `#browse` rule was found and yielded a `max-width`") vs m3′/m4's mutation texts | Both in the plan under review | **CONFLICT — F13.** Both mutants delete the `max-width` the anti-vacuity clause requires and their own justifications assume. |
| CSS 2.1 §10.4 and §10.3.7 | External specification, applied to `css/app.css:224-229` | **AGREE with m4's conclusion**, with the over-constrained-margin step supplied above. |
| `tools/mutation-sweep.mjs:239` | HEAD tooling, read directly | **AGREE.** The quoted exit line is exact. |

---

## Findings

### F12 — NOPARKONHOME's replacement mutant is equivalent too: `showAppView` is unreachable on a `browse→home` gesture

**Severity: Structural. Nature: defect.**

§8 dimension 8 now specifies: *"make the home destination fall into the `else` branch by breaking the
guard's comparison at `js/app.js:535` — `desc.v === 'home'` → `desc.v === 'home-unreachable'`. A
`browse→home` gesture then calls `Browse.render({v:'home'})` …"*

It does not, because `showAppView` is not on that gesture's path. The chain, each link read this
round:

1. `js/swipe.js:112-114` — `destinationHost = toKind === 'overlay' ? 'overlay' : browsePair ? 'browse-page' : toKind === 'browse' ? 'browse-host' : 'home'`. For `browse→home`, `toKind === 'home'`, so **`destinationHost === 'home'`**.
2. `js/swipe.js:260` — `env.renderDestination(dest, destinationHost)`. The second argument is `destinationHost`, **not** the plan's `renderDestination` field (which is `'home-host'`, `js/swipe.js:187` — the label the generated matrix prints).
3. `js/app.js:579-580` — `showAppView` is called in exactly two places, both guarded: `host === 'browse-page'` and `host === 'browse-host'`. A grep of `js/` confirms these are its only call sites anywhere.
4. `js/app.js:585` — `if (host === 'home') { $('home').classList.remove('parked'); return $('home'); }`. This is the branch a `browse→home` gesture takes. It calls neither `showAppView` nor `Browse.render`.

So mutating anything inside `showAppView` — its guard, its branches, its argument handling — is
unobservable on a `browse→home` gesture. No page parks; NOPARKONHOME stays green. The cell that is
the **only** witness for I10, which is itself what replaced the withdrawn arithmetic exemption, is
still undefended.

**Cost if built as written.** The §11 exit condition catches this one — the sweep would report the
mutant surviving and exit nonzero, which is the gate working. What it costs is the third round trip
on a one-declaration change, discovered at the point where the cells are already being written.

**Replacement, with every link checked and named so it can be verified rather than trusted.** Mutate
the branch the invariant is actually about — `js/app.js:585` — to reach the browse render path:

```
if (host === 'home') { $('home').classList.remove('parked'); Browse.render(dest); return $('home'); }
```

- `dest` is in scope: `renderDestination: (dest, host) => {…}` (`js/app.js:573`).
- `Browse.render({v:'home'})` → `keyOf` (`js/browse.js:22`) falls through its ternary to `d.v` → key `'home'`; no throw.
- Cache miss (no `'home'` page is ever cached) → `placeholderFor({v:'home'})` (`js/browse.js:97-98`) returns the skeleton for any non-`files` descriptor; no throw.
- `js/browse.js:536-538` — the node is appended, cached, and **`showPage('home')` runs synchronously, before the `try` that opens the fetch.**
- `showPage` (`js/browse.js:338-342`) with `holdRows === true` — set by `takeRowHold()` in `start()` (`js/app.js:557`), which runs before `buildConstruction` and therefore before this branch — toggles `.parked` onto every other cached page.
- NOPARKONHOME's mid-drag sample sees a `.parked` `.browsepage` → **red.**
- The fixture precondition is already this plan's standing one: dimension 1 requires every cell to run against a populated `pageCache` (≥2 pages, one of them away).

This is also the realistic regression I10 guards — a `browse→home` destination render acquiring browse
content — which the original mutant was reaching for and missing. I state it as a candidate; what the
plan owes is a mutant whose reachability is derived from the dispatch, not from a neighbouring
function.

### F13 — m3′ and m4 delete the `max-width` their own justifications depend on, so each reddens the anti-vacuity check rather than the assertion it is registered to witness

**Severity: Structural. Nature: defect.**

Both new mutants are specified as replacing the declaration:

- m3′ — `#browse { max-width: 640px }` → `width: 200vw`
- m4 — `#browse { max-width: 640px }` → `min-width: 200vw`

Both leave the `#browse` rule with **no `max-width`**. The cell's anti-vacuity clause requires one:
*"assert … that the `#browse` rule was found and yielded a `max-width` — a parse miss on either side
must fail loudly, never pass by absence."* The structural assertion list requires one too (*"a
`max-width` present, and expressed in `px` or in `vw` with a value ≤ 100"*). So each mutant reddens
the missing-`max-width` check.

Both justifications assume the opposite. m3′'s reads *"m3′ leaves the used width capped at 640px by
**the surviving `max-width`**"* — there is no surviving `max-width` under the stated text. m4's rests
on *"`min-width` **BEATS** `max-width`"*, a comparison that needs both present to mean anything.

The consequence is round-1 F2's shape at one level down: the `no-width` and `no-min-width` assertions
have **no discriminating mutant**. Delete either from the cell and every registered mutant still
kills, because the missing `max-width` alone is enough. This project's test style collects failures
into a list and asserts it empty (`test/swipe-declone-stage2-css.test.js:268-288`), so the width entry
would appear in the message — but appearing in a message is not detection; the cell fails identically
with the assertion removed.

It also leaves the *realistic* regression unexercised. Nobody widens `#browse` by deleting its
`max-width`; they add a property beside it. No mutant in the set of five produces that shape.

**Cost if built as written.** This is the class the §11 exit condition **cannot** catch, which is what
makes it worth a verdict rather than a note. The sweep confirms that a registered mutant kills its
named cell; both of these do kill it. So the sweep goes green, §11 is satisfied, and the plan's
required-evidence line — *"m3/m3′/m4 each reddening assertion (i) ALONE"* — is recorded as verified
while two of the three assertions inside (i) remain unwitnessed.

**Fix, and it is two strings.** Make both additive so the `max-width` survives:

- m3′ — `max-width: 640px;` → `max-width: 640px; width: 200vw;`
- m4 — `max-width: 640px;` → `max-width: 640px; min-width: 200vw;`

Each then reddens exactly its named assertion, the anti-vacuity check stays green, and both
justifications become literally true — m3′'s "capped at 640px by the surviving `max-width`" is then
correct (`max(0, min(640px, 200vw)) = 640px`, no geometric change, precondition-only kill), and m4's
§10.4 formula has the `max-width` it is stated to beat (`max(200vw, min(640px, 100vw)) = 200vw`, a
real widening). m4's conclusion is unchanged in the additive form; I checked it both ways.

### F14 — the exit condition binds, and it binds at cell granularity only

**Severity: Note. Nature: recommendation.**

Answering the question directly: **it binds.** It names the executing instrument, quotes its real exit
line (verified verbatim at `tools/mutation-sweep.mjs:239`), states that registration precedes the cell
being called done, and routes a survivor back to design rather than to a waiver list. It cannot be
discharged by assertion, and it would have caught F12 on its own. Converting a twice-failed discipline
into an executed check is the right move and is the standards' own prescription.

Its blind spot is one level finer than it operates. The sweep proves *this mutant reddens this cell*.
It cannot prove *this mutant reddens this assertion within this cell* — which is where F13 lives, and
where round-1 F2 lived before it. **This is not a request to build anything;** per-assertion
attribution is not cheaply mechanizable and the cost of trying would exceed the risk. What is worth
one clause is recording the limit next to the gate, so that a future reader does not read "mutation-
verified" as more than the sweep can show: the gate proves a cell can fail, and which assertion it
fails on remains a judgement made when the mutant is chosen.

---

## Coverage

Both blocking findings discharge on an executed sweep result, not on prose — and the §11 exit
condition is the right instrument for the first of them:

- **F12** — discharged when NOPARKONHOME's registered mutant reaches `showPage` on a `browse→home`
  gesture and the sweep reports it killed. The `js/app.js:585` candidate above has every link in its
  chain named; any mutant with the same reachability closes it. The failure mode to avoid repeating is
  choosing the mutation site from a neighbouring function rather than from the dispatch that runs.
- **F13** — discharged when m3′ and m4 preserve the `max-width` declaration, so that each reddens its
  named assertion with the anti-vacuity check green. Because the sweep cannot see this (both texts
  kill either way), the check is a read of the two mutant strings, not a run.

Non-blocking: F14 is one clause recording what the exit condition proves. It gates nothing.

Unchanged and re-affirmed across all three rounds: the `-300vw` constant, the 200vw floor, the option
set, Invariant P compatibility, the three anchor migrations, DRAGREACHBOUNDED, the real-engine oracle,
and the device gate. `css/app.css` is untouched and nothing in this round asks for a different value.

---

## Prediction — where this breaks in execution if built as written

F12 breaks loudly and on schedule. Curie registers the mutant first, as §11 now requires, runs
`tools/mutation-sweep.mjs`, and it exits nonzero with the NOPARKONHOME mutant surviving. The gate
does its job; the cost is the round trip, and the diagnosis is one grep (`showAppView` has two call
sites, neither on this path) once someone thinks to ask whether the mutated function runs at all.

F13 breaks silently, and that is the one to weigh. Both mutants kill their cell, the sweep is green,
§11 is satisfied, and the plan's required-evidence line is ticked. What ships is a cell whose
`no-width` and `no-min-width` assertions have never been shown to do anything — so the day someone
adds `width: 100%` or a `min-width` to `#browse` beside its `max-width`, the guard that was written
for exactly that edit is the one nobody has tested. The floor still holds at `-300vw`, so no user sees
anything; the record says the box is pinned and it is pinned by one assertion out of three.

The pattern across three rounds is worth naming, because it is the same one each time and it is not
carelessness: every defect found has been a **claim about reachability** — whether an arithmetic case
is reachable (F1), whether a mutant's code path is reachable (F9, F12), whether an assertion is
reachable given what else fails first (F2, F10, F13). The plan's arithmetic, its option set and its
value have been right since round 1 and have not moved. What keeps needing another pass is the
question of what actually runs. A mutant is a claim that a specific line executes and changes a
specific outcome, and this plan has now had three of them written from an adjacent function or an
adjacent declaration rather than from the dispatch. The cheapest defence is not another review round —
it is §11's ordering, already written: register the mutant, run the sweep, and let execution answer
the reachability question before anyone writes the cell it is supposed to defend.
