# RED cells — EMPTYAFTERHOME (the Books page that arrives with structure and no rows)

Author: the test author (test design). Date: 2026-08-01. Source artifact:
`Claude/Linnaeus/empty-books-page-fact-sheet-2026-08-01.md` **§10**, which supersedes that sheet's
earlier sections (two hypotheses were retracted there; §10.7 is the what-changed table). Working
reproduction of the same mechanism against the modules in isolation:
`Claude/Linnaeus/repro-empty-books-page.js` (7/7 green). Authored at HEAD `feb3494`, build
`2026-08-01.300`, tree clean.

**VERDICT: RED_SUITE_READY.**

## 1. The defect the cells reproduce, on shipped code

The Books page arrives completely empty — header, section letters, row containers at their correct
heights and the A–Z strip all present, zero rows — and does not self-heal.

1. Navigating Books→Home tears the list down **correctly**. `Nav.setView` calls `browseWillHide()`
   → `Browse.deactivate()` → `dematerialize()` before `display:none` lands (`js/nav.js:55-61`,
   `js/browse.js:371`). Nothing is wrong at this step; a hidden page is supposed to hold zero rows.
   Device: `#14 commit→home … realized 15→0 released=15`.
2. The row hold is released **after** the container is hidden. `runFinalize` calls
   `applyScreen(dest, …)` at `js/app.js:1120`; `dropRowHold()` runs in `finalize`'s `finally` at
   `js/app.js:1163-1164` — strictly later. By then `currentDesc()` is `home`,
   `pageCache.has('home')` is false, so `Browse.endHold` takes its **else** branch, whose last act
   is `activate(); _realize()` on a browse page inside a `display:none` box
   (`js/browse.js:211-212`).
3. A zero-measuring box realizes zero rows by arithmetic. `overscan()` is
   `Math.round(viewportH() * 1.5)` (`js/virtuallist.js:177`), so a viewport of 0 gives an overscan
   of 0, and `windowFor` then has `from === to` (`js/virtuallist.js:79-94`).
4. The controller is left **active**, registered as `activeCtl`, holding zero rows — `activate()`
   sets both before realizing (`js/virtuallist.js:238-240`). That state closes every later refill:
   `activate()` early-returns at `js/virtuallist.js:236`, and `positionOnEnter` writes nothing
   because `captureAnchor()` returned null in the zero box, so `applyScrollY` — the only other
   `_realize()` caller on the re-entry path — is never reached (`js/browse.js:310-313`). Device:
   `#15 commit→books … rows=0 imgs=0 withSrc=0`.

⭐ `js/browse.js:174-177` and `js/nav.js:56-58` state this exact ordering rule in their own words
("a hidden box measures zero"), which is why `deactivate()` is called *before* the hide. The else
branch does the opposite, *after* it.

**The invariant the cells defend, stated so it does not presume where the fix lands:** a commit
that leaves Browse must not leave a browse controller **active with zero rows**, and the next entry
into that page must show it **with rows**.

## 2. Files

| File | State | Contents |
|---|---|---|
| `test/browse-empty-after-home-commit.test.js` | **NEW** | `EMPTYAFTERHOME` — two cells, both red at HEAD, both `{ skip: SKIP }` |
| `tools/mutate.mjs` | **CHANGED** | one mutant registered (`#123`); two more specified for the build commit (§6) |
| `build.json`, `index.html`, `js/debug.js`, `sw.js` | **CHANGED** | build bumped |
| `js/**`, `css/**` | **UNTOUCHED** | production source is the builder's; nothing here edits it (`git diff -- js/ css/` is empty) |

## 3. The sequence the cells drive — every step a production path

No test-only export was added to any production module. The cells run the **real `js/app.js`**
through `test/app-harness.js` with `realBrowse: true`, so the real `js/nav.js`, `js/browse.js` and
`js/virtuallist.js` are the code under test and the **ordering itself** is exercised rather than
assumed.

1. Boot, force the windowed renderer (`VirtualList.setForceVirtual(true)`), library of 145 books —
   the device's size, from `CACHE getBooks live: 145 books`. Forcing is not optional: 145 ≤
   `FULL_RENDER_MAX` (600), and the device had "Windowed browse" on — settled in the fact sheet at
   F51, because the log's `realized 15→0` field is producible only by a live virtual controller (a
   classic page prints `realized -1`).
2. Navbar tap to Books. Fixture sanity confirms a real controller, `state === 'active'`, and
   `realizedCount() > 0`.
3. **Gesture #14** — a left-edge back-swipe with the finger on a **real realized row** of the Books
   page (not a synthetic node), driven past the 8 px lock and committed. Fixture sanity confirms the
   swipe log reads `start back books→home`, that the settle was a **commit**, and that `#browse`
   ends up carrying `hidden`.
4. **Re-entry** — a navbar tap back to Books.

### Why the re-entry is a navbar tap rather than the device's 42 ms return swipe

It is the **stronger** witness, not a weaker one. A tap runs no gesture, so it takes no row hold and
reaches no `endHold` at all — there is no landed-branch `_realize()` (`js/browse.js:189-190`) that
could refill the page a moment after the user saw it blank. What cell 2 measures is therefore the
**resting** state of the page the user is looking at: revealed, and permanently empty. It also makes
the cell independent of the fact sheet's open **U6** (whether `endHold`'s landed `_realize()` ran on
#15), which is deliberately not relied on anywhere here.

The path is production end to end: `applyScreen` → `Nav.setView('browse')` un-hides the container
(`js/nav.js:151`, so the box measures again) → `renderBrowse` → `Browse.render` cache **hit** →
`showPage('books')` → `activate()` early-returns → `positionOnEnter` derives nothing.

### The one injected quantity, and why it is not a cheat

jsdom has no layout, so every element measures 0 forever; with production metrics the row count
would be 0 in every state and neither cell could fail. The viewport height is therefore injected —
but as a **function of the real `#browse` `hidden` class**, which the real `js/nav.js` `setView` is
the only thing that toggles. So the **app**, not the test, decides when the box stops measuring,
and the injected value encodes exactly the rule the source states in its own words. This is
strictly stronger than the reproduction script's hand-set `view.viewportH = 0`. `scrollY` is a
constant 0, which is both the device's state and what makes `captureAnchor()` return null at the
deactivate (`top > 0` false, `js/virtuallist.js:247-249`).

## 4. The RED run at HEAD `feb3494`, skip removed — CONFIRMED

```
node --test test/browse-empty-after-home-commit.test.js

not ok 1 - EMPTYAFTERHOME — a commit that leaves Browse must not leave the Books controller
           ACTIVE with zero realized rows
  error: "THE DEFECT (fact sheet §10.2, F42-F46): … Got state='active' realizedCount=0."
not ok 2 - EMPTYAFTERHOME — returning to Books after a commit to Home shows a page WITH ROWS,
           and it stays that way with no gesture to repair it
  error: "THE DEFECT (fact sheet §10.3, F47): … Got 0 row nodes."
# tests 2 / pass 0 / fail 2
```

**They are red for the defect, not for an incidental error.** Every fixture-sanity assertion ahead
of each failure passed, which is what pins that: the Books page was virtualized with a live
controller, active, holding 19 realized rows; the gesture went live as `start back books→home` and
**committed**; `#browse` ended hidden; and on the re-entry the **same cached page node** came back
with `#browse` un-hidden and its chrome byte-for-byte intact (letterheads and A–Z strip unchanged),
which is the "structure present, rows absent" shape the screenshot shows and the fact sheet's §10.4
resolution to E2.

Committed state: both cells carry `{ skip: SKIP }` so the pre-commit battery stays green
(`core.hooksPath = tools/hooks`; this project does not use `--no-verify`). **The builder removes the
skip to drive them red, then builds to green. No assertion may be weakened to green them.**

## 5. The cells are GREENABLE — proven, not assumed

A red cell nobody can green is worse than no cell. Confirmed by emulating the fix at **runtime**,
with `js/browse.js` untouched on disk: the public `Browse.endHold` was wrapped so that, when
`#browse` is hidden, any controller left `active` is returned to its correct resting state. Running
the identical sequence then reported:

```
baseline           state=active   rows=19  nodes=19
after commit→home  state=inactive rows=0    browseHidden=true      CELL 1: GREEN
after re-entry     state=active   rows=19  nodes=19                CELL 2: GREEN
```

Both cells assert an **outcome**, not a repair, so both fix families green them: a guard that keeps
the hold release from activating into a hidden container, and a reordering that releases the hold
while the container still measures.

## 6. Mutations

### Registered now — `#123`, swept, caught

```
node tools/mutation-sweep.mjs 123
#123  caught (3 failing) — EMPTYAFTERHOME over-broad fix: the LANDED branch stops activating
      and realizing the page the gesture landed on
      killed by: LANDEDPAGESHOWS — an ABORTED browse->browse leaves the page it started on shown
                 and activated, and a COMMITTED one leaves the page it landed on
      killed by: LANDEDPAGESHOWS — a browse->home gesture: COMMIT … ABORT …
      killed by: VR — superseding a live drag on a VIRTUALIZED browse->browse source keeps the
                 source rows ACTIVE and realized, not rebuilt or leaked
swept 1: 0 uncaught, 0 unapplied, 0 stale flags
```

Anchor: the two-line block `const shown = pageCache.get(landedKey);` + the `activate(); _realize()`
line (`js/browse.js`). The two-line form is load-bearing — **the `if` line alone occurs twice**, the
else branch's copy being byte-identical, so the preceding `const shown = …` is what disambiguates
it. This is registered rather than specified because its anchor is the **shipped landed branch**,
which exists today; it will not rot at the build, because the defect is in the else branch.

It exists because the cheapest wrong repair is to delete the `activate(); _realize()` pair from
**both** branches. The result is measured above: the suite already catches that, so **no
preservation cell of my own was written**. Naming a real, measured protection is the correct answer
here; adding a cell to re-prove it would be invented coverage.

### Specified for registration in the build commit — two mutants that anchor on the fix

Neither can be registered now, and the reason is mechanical rather than a deferral: **both anchor on
a condition the fix introduces**, which does not occur in the source yet, and a `from` that does not
occur reddens `test/mutation-anchors.test.js` with `ANCHOR NOT FOUND`. Same convention, for the same
reason, as the `FILMSTRIPDRAG` cells and the six build-time Stage A1 mutants. What is fixed here is
each mutant's **intent**, its **observable effect**, and its **expected killing cell**; the anchor
text is transcribed from whichever form ships, carrying disambiguating context from the start (in
this repo an anchor is assumed non-unique until the tool proves otherwise — see `#123` above for
exactly that trap).

| Mutant | Change to the shipped fix | Effect | Expected killing cell |
|---|---|---|---|
| `EMPTYAFTERHOME-a` | Remove the fix's condition, restoring the shipped behaviour — the hold release again activates and realizes a browse controller while `#browse` is hidden | The controller ends active with zero rows and the next entry shows an empty page | Both cells; cell 1 first |
| `EMPTYAFTERHOME-b` | The **half** fix: suppress the `_realize()` but still let the controller reach `state = 'active'` (or set the state without realizing) | Rows are still zero *and* the controller is still active, so every later refill stays closed — the page looks fixed at the hold release and is not | Cell 1, whose assertion is the **conjunction** precisely so this cannot pass; then cell 2 |

## 7. ⭐ A measured constraint on the fix's shape — read this before building

**An unconditional guard on `endHold`'s else branch is not admissible.** Measured, not argued: a
throwaway probe mutant that removed the else branch's `activate(); _realize()` outright was **caught
by three existing cells**:

- `test/browse-virtual.test.js:77` — *swipe hold: showPage SUSPENDS the outgoing page (rows kept)
  instead of dematerializing*
- `test/browse-virtual.test.js:171` — *swipe hold: a page returning from SUSPENDED waits for endHold
  to activate*. It calls `Browse.endHold(tok)` **with no landed descriptor**, so `keyFor` returns
  null and the else branch is what must activate the returning page.
- `test/swipe-declone-stage2-browse.test.js:419` — the `LANDEDPAGESHOWS` browse→home cell.

So the else branch's `activate(); _realize()` is genuinely load-bearing **when the container is
visible** — an aborted browse→browse returns through it. The discriminator the fix must use is the
container's visibility (or, equivalently, ordering the release ahead of the hide), which is exactly
what the invariant in §1 says and what the source comments already state.

**One of those three collides with the fix regardless, and it is a finding, not a cell to quietly
edit.** `test/swipe-declone-stage2-browse.test.js:419`'s **commit** half asserts `counted.n >= 1` —
that on a browse→home COMMIT the controller *is still activated at the hold's release, "exactly as
HEAD activates it."* That is the defective act itself. It was authored as a Stage-2 "this path
changes nothing" preservation assertion, not as a claim that activating into a hidden container is
correct, and Stage 2 was not chartered to judge it. Whether it reddens depends on the fix's shape:

- a guard placed **before** the `activate()` call drops that count to 0 and **reddens** it;
- a reordering of the release ahead of the hide, or any repair that leaves the call site intact,
  keeps the count ≥ 1 and leaves it green.

**Its ABORT half is correct and must stay green** — an aborted browse→home returns to Browse,
`#browse` is not hidden, and the activation is legitimate. I have deliberately **not** edited that
file: narrowing an existing campaign's cell is a decision that belongs with the fix and its review,
not with the red-suite step.

## 8. What these cells assert, and what they cannot

**Every assertion is a controller-state read, a realized-row count, a DOM node count, a DOM-identity
fact, or a class-state fact.** Nothing asserts geometry, paint, compositing, stacking or occlusion.
jsdom has none of those, so a cell claiming the rows "appear" could not fail and would be a false
witness. The observables are exactly `_vctl.state()`, `_vctl.realizedCount()`,
`querySelectorAll('.book' | '.letterhead' | '.alphaindex').length`, `classList.contains('hidden')`,
page-node identity against `pageCache`, and the `SWIPE` debug log lines.

**Device-owed, and claimed by nothing here.** That the rows are visibly **painted** when the swipe
reveals the page; that the user-visible Books page is no longer blank after rapid back-and-forth
swiping; and that the 42 ms return-**swipe** re-entry (as opposed to the navbar tap cell 2 drives)
behaves as the mechanism predicts on a real engine. CI proves the mechanism; the outcome is the
device's.

**Not claimed, and not needed.** The fact sheet's **U7** — why gesture #15 printed `base n/a` at all
— remains unexplained under the corrected account. Nothing in these cells asserts an explanation for
it, and nothing in them depends on one; the mechanism in §1 is independently established. **U6** is
likewise untouched, by the design choice recorded in §3.

## 9. Lockstep — what the builder must also do (NOT done here)

1. Remove `{ skip: SKIP }` from both cells, confirm they are red, then build to green.
2. Honour §7: the repair must be conditional on the container's visibility (or must precede the
   hide). An unconditional removal breaks three existing cells.
3. Decide, in the open and with the reviewer, what happens to
   `test/swipe-declone-stage2-browse.test.js:419`'s **commit**-half `counted.n >= 1` assertion if
   the chosen shape reddens it. It encodes a claim now known to be a description of the defect. Its
   abort half stays.
4. Register `EMPTYAFTERHOME-a` and `EMPTYAFTERHOME-b` against the shipped fix (§6) and sweep them,
   together with `#123`.
5. Bump the build number.

## 10. Handoff

- **Source artifact** — `Claude/Linnaeus/empty-books-page-fact-sheet-2026-08-01.md` §10;
  `Claude/Linnaeus/repro-empty-books-page.js`.
- **Verdict** — `RED_SUITE_READY`. Both cells are red at HEAD for the defect and proven greenable.
- **Decisions made** — the re-entry is driven by a navbar tap, so no cell depends on the open U6;
  no preservation cell was written, because the measured sweep of `#123` shows the suite already
  protects the landed branch.
- **Open questions** — item 3 above (the colliding commit-half assertion), for the builder and the
  code reviewer. Fact-sheet U7 stays open and is not load-bearing here.
- **Next owner** — the builder, for the fix; the coverage auditor, for the suite audit.
- **Records updated** — this file. No production source touched.
