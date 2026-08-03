# MENDELEEV — Coverage audit, Stage A1b of ONE SCREEN TYPE — ROUND 2 (the gap-fill re-audit)

Type: coverage-audit, round 2 (re-audit of the three bare cells filed in round 1)
Round 1: `Claude/Mendeleev/AUDIT-one-screen-type-a1b.md` — GAPS_NAMED (G1, G2, G3; M1–M3; N1–N3).
**Round 1 is not edited; this round supersedes it.**
Target: `e6a2f2e` (build `2026-07-31.290`) as filled by `48b19f9`, audited at HEAD `4250401`, 2026-08-03.
Gap-fill of record: `Claude/Curie/one-screen-type-a1b-gapfill-test-design-2026-08-03.md` — GAPS_FILLED.
Plan of record: `Claude/Plans/PLAN-one-screen-type.md` §14.
Scope of this round: the three occupants round 1 specified, and nothing else. Every dimension round 1
decided is unchanged unless named below. No product code changed between the rounds
(`git diff 551f582 HEAD -- js/ css/` is empty).
Tree: clean before and after every command; no `*.mutbak` at any point.

Verdict: ADEQUATE — all three occupants witness what they claim, proven by execution in this seat.

Each of the three bare cells is filled by a test that *forces* its condition and asserts an outcome
that *can* fail, and in each case the acceptance test round 1 specified in advance is met by a
mutant this seat applied itself. The suite now proves the stage's paths and its licence, not only
its statements. Three new notes are filed and none of them is a bare cell.

⚠️ **One operational fact outranks the verdict, and it is measured, not read: the campaign's
`coverage-audit` gate cannot see this file.** Its `verdictArtifactGlob` is a literal filename with
no wildcard, so `AUDIT-one-screen-type-a1b-r2.md` does not match and the gate keeps reading round
1's `GAPS_NAMED`. This is the F14 defect that was found and fixed on this same manifest's
`plan-review` gate, still live on this one — it is the **only** one of the six gates that carries
it. Details, the executed proof, and the one-token fix are in §5. **I have deliberately not applied
the fix myself: a seat widening the glob that gates its own verdict is a shape no one should
accept, however right the fix.**

---

## 1. What I executed (this seat, at HEAD `4250401`)

Node is not on PATH on this machine (`C:\Users\nzilb\tools\node-dist\node.exe`).

```
git diff --stat 551f582 HEAD    -> 7 files; js/ and css/ untouched
node --test "test/*.test.js"    -> 830 tests / 829 pass / 0 fail / 1 skipped (22.7s)
                                   the one skip is the pre-existing device-only KEEPER cell
git status --porcelain          -> empty, before and after every command
find . -name "*.mutbak"         -> none, before and after every sweep
```

**Mutation indices re-derived from NAMES against the 140-entry registry**, then swept in the
**foreground** in two targeted batches. The whole family was re-swept rather than only the new
mutants, because the suite changed and a mutation result stops being true when it does.

```
node tools/mutation-sweep.mjs 76 85 86 87 88 89 90 91  -> swept 8: 0 uncaught, 0 unapplied, 0 stale
node tools/mutation-sweep.mjs 92 93 94 95 96 97 98 99  -> swept 8: 0 uncaught, 0 unapplied, 0 stale
```

Killer counts I observed, against round 1's:

| # | Mutant | r1 | now | The line that matters |
|---|---|---|---|---|
| 89 | `NPPARKS-a` | **1** | **2** | + `NPRECONCILE` — **round 1's stated acceptance test for G1, met** |
| 91 | `NPPARKS-b` | 2 | **3** | + `NPRECONCILE` settings companion |
| 95 | `NPNAVBAR` (new) | — | 1 | `NPUNTOUCHED` **alone** — G3 |
| 96 | `NPHIDDENWRITER-a` (new) | — | 1 | `NPHIDDENWRITER` alone — the group-count direction |
| 97 | `NPHIDDENWRITER-b` (new) | — | 2 | `NPHIDDENWRITER` alone (two of its tests) — the alias direction |
| 98 | `NPHIDDENWRITER-c` (new) | — | 1 | `NPHIDDENWRITER` alone — the loop-list direction |
| 99 | `NPHIDDENWRITER-d` (new) | — | 1 | `NPHIDDENWRITER` alone — the synchrony half |
| 76, 85–88, 90, 92–94 | unchanged | 1,6,2,2,5,3,2,2,7 | same | no regression, no killer lost |

---

## 2. The three occupants — does each witness what it claims?

### G1 — CLOSED. The absolute half of the abort reconcile

**What was bare.** `NPRECONCILE` asserted `after === entry`, a relative property, so it could not
fail wherever the defect was already present at entry. `#89` had exactly one killer and this cell
passed under it; the `after1 === entry` assertion had never failed under any mutant.

**What was authored.** (a) An **absolute** `parked('home') === true` after abort 1, asserted against
the constant, placed after the gesture so it cannot halt the cell before one is driven — the exact
occupant round 1 specified. (b) A **settings-source companion cell**: from the Options hub, open NP,
drive a back-swipe NP→options to abort, assert `isHidden('options') === true` absolutely.

**Does it witness?** Yes, and I confirmed it rather than reading it. `#89` now reports **two**
killers, the second being `NPRECONCILE` — the acceptance test named in advance, met. `#91` now
reports **three**, the third being the companion. Both cells retain their fixture-sanity assertions
that the mid-drag render really did un-park `#home` / un-hide `#options`, so the forcing is
witnessed and not assumed; the growth assertions are untouched, so nothing was traded away.

**The finding inside the fill is the sharper craft point, and it is Curie's own.** The companion
*had* to use the **back** swipe. On the forward NP→chapter-list abort, `showAppView`'s mid-drag
sweep (`js/app.js:522`) hides every settings overlay that is not the gesture's own source, so
`#options` would end up hidden by `js/app.js` whatever `setView` did — the cell would have passed
under `#91` for a reason with nothing to do with its claim. That is a vacuously-green cell caught
during authoring rather than at audit, and it is the second time on this stage that the *direction*
of a gesture decided whether a cell could fail. Recorded so the next author of an NP-abort cell
does not have to rediscover it.

### G2 — CLOSED, in the full form. `NPHIDDENWRITER`

Round 1 offered a cheaper half (pin only the synchrony claim) and required that taking it be stated.
The full inventory was taken **and** the synchrony half with it. Five tests, four mutants, a
selftest.

**Does it witness?** Yes, on all four routes, each caught by this cell **and nothing else** in 830
tests — which is itself the proof that the mutants are behaviourally inert and that the cell is
attributable:

- `#96` a duplicated writer → the identity **group-count** direction. This is the direction that
  exists because a duplicate matches its registered entry textually and only a count can see it.
- `#97` the `npEl` alias made to write the hidden class → the **alias closure**, the one route that
  reaches the element without naming it.
- `#98` `showAppView`'s sweep widened by one word to include `nowplaying` → the **loop-list**
  direction. This is round 1's forward-read item 1 executed as a mutant: the one-word change to a
  sweep that already exists twice in `js/app.js`.
- `#99` `setView` reordered so `#nowplaying` is hidden first → the **synchrony** half. The writer
  count is unchanged; C6 is broken anyway.

**`#99` is the result worth pausing on.** A reordering of `setView` that breaks the NP-back reveal
is caught by **one test in the entire suite**, and before this round there was none. That is not a
gate tidying up an argument — it is a live hole this cell closed.

**And it is genuinely swept, which I verified rather than accepted.** `np-hidden-writer-set.test.js`
is **not** in `tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES` (read at HEAD), so it runs against
every mutant in the family. Across `#76` and `#85`–`#95` — eight of which mutate `js/nav.js` or
`js/app.js`, the two files this gate scans — it appears as a killer of **none** of them. That is the
executed evidence that it is not a source-text false-caught, and it is why this gate carries real
mutation evidence where `M1WRITERSET` had to be excluded and fall back on its selftest alone.

#### The judgement asked for: does registration-only-where-underivable weaken the three directions?

**No. It relocates them to where they bind, and it is stronger where it differs.** The architecture
is two inventories that close each other, and reading it that way is what settles the question:

- **The identity inventory is the gate.** It carries all three directions — an unregistered site
  fails, a rotted registration fails, a group-count drift fails. Any route to the element that
  *names* it (the quoted id or a selector) lands here. That includes `document.querySelector('#nowplaying')`,
  which the alias derivation does **not** match: I checked, and the write on such a binding fails
  *twice* — once as an unregistered identity site, once as an unregistered `local` receiver.
- **The write inventory is the reach.** Its receiver classes are handled by whether the target is
  derivable: `id-literal` and `id-loop` are resolved **mechanically** (and cross-checked — the
  registered `hidden-write` role and the derived `npWrites.length === 1` are computed independently
  and must agree), while `local` (16 entries) and `query` (1) require a hand-written reason because
  nothing else can supply one. `id-var-unresolved` and `unclassified` **fail**, which is the clause
  that makes the classification exhaustive rather than a filter.

A mechanically-derived target is better evidence than a hand-written reason, because a derivation
cannot rot and a sentence can. Registering `$('someid')` sites would have added ~40 entries that say
nothing the derivation does not already compute, and every one of them would have been a future
rot-red.

Two consequences of the departure I checked rather than assumed, so the next round does not
re-litigate them:

1. **The write inventory lacks directions 2 and 3.** A vanished `LOCAL_RECEIVERS` entry does not
   fail, and a *duplicated* local write does not fail. Neither is a hole: those registrations are
   "reasons this receiver is not `#nowplaying`", so a stale one is noise rather than a leak, and
   duplicating `bar.classList.toggle('hidden')` still targets `bar`. The duplication that *would*
   matter — of the NP writer itself — is covered twice, by the identity group-count direction and by
   `npWrites.length === 1`, and `#96` proves it by execution.
2. **`LOCAL_RECEIVERS` is keyed by `(file, name)` only**, so re-using a registered name inside the
   same file for a different element inherits its reason. Backstopped by the identity inventory: any
   binding to `#nowplaying` must name it, and naming it lands in the inventory that has all three
   directions. Sound, and worth stating because it looks like a hole until the backstop is traced.

#### The judgement asked for: are the five residuals honest bounds or a hole wearing a label?

**Honest bounds — with one member missing, which I found by execution and file as N4.** Each of the
five names a real limit, says why it cannot be closed cheaply, and says where the class *is* covered
instead. The `className =` residual is the largest and the most honest: it states ~50 first-party
sites (I counted **47**, so the disclosure is accurate), states that the class is covered only
through a registered alias or by naming the element, and the **selftest proves that alias arm fires**
rather than asserting it. The `classList.add(cls)` residual is load-bearing rather than decorative —
`js/nav.js`'s `slideInView` does exactly that, so requiring the `hidden` literal is what keeps the
gate from being red on arrival against code that cannot hide anything.

Two file-set bounds I checked independently and found honest: `js/vendor/**` is excluded with its
reason *referenced* to the existing content-hash pin rather than duplicated, and `index.html` ships
**33 `<script>` tags, every one with `src=`** — there is no inline script for the `js/`-only glob to
miss.

### G3 — CLOSED. The navbar stacking assertion

`NPUNTOUCHED` gains a `ruleBody('body.np-locked .navbar')` read with the same anti-vacuity `!= null`
guard the `.nowplaying` read already applies, then asserts the rule declares a `z-index` at all and
that it is **strictly greater** than `.nowplaying`'s. Both values are *derived* by a `zIndexOf`
helper and compared; the literal `70` is reported in the failure message rather than pinned as the
claim. That is the right form — the ratified decision names the *relationship*, so the relationship
is what is asserted, and a future re-tier of the whole stack does not produce a false red.

**Does it witness?** Yes: `#95 NPNAVBAR` deletes `z-index: 70` from that rule and is caught by
`NPUNTOUCHED` **alone**. Before this round, deleting it reddened nothing.

Correctly a **source scan** and not a rendered-stacking assertion — jsdom has no compositing, and
such a cell could not fail. The cell says so in the assertion message and points at step 9.

### M1 — CLOSED, and wider than I filed it

Round 1 named two sites in `test/page-bg-single-painter.test.js`. There were **four**: `:1-2`,
`:12-14`, and twice inside the painter-set assertion message. All four now state the current reason
(the three co-required properties that cover the topbar and the transport), which is the same reason
`css/app.css` records at the declaration itself. Both tests in the file stay green and its three
mutants are unaffected — I re-swept `#86`, `#92`, `#93` and all three are still caught by their own
cells. My round-1 enumeration was short by two; recorded as a correction to my own finding.

---

## 3. The matrix rows that moved

Only the rows round 1 marked bare are re-walked; every other cell keeps its round-1 status.

| Cell | r1 | now | Evidence |
|---|---|---|---|
| M6 — an aborted NP gesture **re-parks** `#home` | **BARE** | **SWEPT** | absolute assertion; `#89` gains `NPRECONCILE` |
| — (new) an aborted NP gesture **re-hides** the settings screen | not separately celled | **SWEPT** | companion cell; `#91` gains `NPRECONCILE` |
| M9 — the `np-locked` navbar outstacks NP | **BARE** | **SWEPT** | `#95`, killed by `NPUNTOUCHED` alone |
| M10 — single-writer-ness of `hidden` on `#nowplaying` | **BARE** | **SWEPT** | `#96`, `#97`, `#98`, each by `NPHIDDENWRITER` alone |
| — (new) the **synchrony** half of C6 | not celled, not filed | **SWEPT** | `#99`, by `NPHIDDENWRITER` alone |

**Catalog dimensions that move.** Dimension 1 (lifetime/reuse): the hole G1 named is closed — the
warm-state cell can now fail on the `#home` axis. Dimension 3 (concurrency): single-writer violation,
the explicitly named member that was bare, is now gated. Dimension 7 (contract claims): **C6 gains a
gate, in both halves** — the writer count and the ordering — which was the largest residue on the
stage. Dimensions 2, 4, 5, 6, 8, 9 and 10 are unchanged from round 1; in particular dimension 4
(platform) remains device-owed and nothing authored in this round claims any part of it.

---

## 4. Findings from this round

| # | Severity | Finding | Owner |
|---|---|---|---|
| N4 | Note | **Two inline-style routes escape the alias closure and are not in `RESIDUALS`.** Executed against the shipped `ALIAS_WRITE_SUFFIX`: `npEl.style.cssText = 'display:none'` and `npEl.setAttribute('style', 'display:none')` both **escape**, while the five listed routes are all caught. `cssText` is live in first-party code (`js/debug.js:431, :570, :733`), so the route is not hypothetical. **Not a gap:** zero such sites exist on any NP path at HEAD, and the escape requires writing through one of exactly two already-registered aliases — every route that *names* the element is still caught by the identity inventory's three directions. It is a completeness defect in the **disclosure**, and the cell's own standard is that the residual list is what stops its silence being read as coverage. **Fix, one line:** add `style\s*\.\s*cssText\s*=` and widen the `setAttribute` arm from `['"]class` to `['"](?:class\|style)` in `ALIAS_WRITE_SUFFIX` — or, if that is judged out of proportion, name the family as a sixth residual. | Curie, whenever the file is next touched |
| N5 | Note | The write inventory carries direction 1 only (no rot check, no group-count). **Judged sound** — reasoning in §2 — and recorded here so a later round does not re-open it as a gap. | none; recorded |
| C1 | Correction (mine) | Round 1's M3 said the index shift moved four citations. It moved **one**. `NPNAVBAR` was inserted at index 95, so `#90`, `#93` and `#94` still address `NPPARKS-a'`, `NOSETTINGSBG-a'` and `PEERPARK-c` as M3 states; only the fourth moved — **the `FILMSTRIPDRAG` 340ms-safety-net mutant is now `#100`, not `#95`** (`#95` is `NPNAVBAR`). M3's substance is unchanged: those four are still registered mutants that appear in no §14 row. | the planner, with M3 |

**Carried forward from round 1, unchanged and not this round's to close.** **M2** (§14's `NPRECONCILE`
fixture spec states a count that is zero under A1b) and **M3** (§14's mutation column has drifted;
its total is right only by coincidence) are model defects routed to the planner and were correctly
left untouched by the test author. **N1** is narrowed but open: `position: fixed`, `inset: 0` and
`z-index: 60` still have no registered mutant, and the cell now says so in as many words. **N2** and
**N3** stand as filed.

**Still owed, and nothing in this round covers any of it:** the **step-9 device gate**, including the
adversary's scroll-preservation item. I re-checked the four sites that state the device-owed set and
the two new test files' scope headers; none over-claims, and `NPHIDDENWRITER` states outright that it
asserts no paint.

---

## 5. ⚠️ The gate cannot read this file — measured, with the fix stated but not applied

`tools/campaign/stage-gate-check.mjs`'s `globFiles` compiles a glob by escaping `.` and replacing
`*` with `.*`. A glob with no `*` therefore compiles to an exact-filename anchor. Executed:

```
glob 'Claude/Mendeleev/AUDIT-one-screen-type-a1b.md' -> /^AUDIT-one-screen-type-a1b\.md$/
  AUDIT-one-screen-type-a1b.md      MATCH
  AUDIT-one-screen-type-a1b-r2.md   NO MATCH
```

`artifactsOfRecord` — which is what would prefer the highest `-rN` round — only ever sees what the
glob already matched, so it never sees this file. **The gate will keep reporting round 1's
`GAPS_NAMED` no matter how many rounds are filed.**

**This is the F14 defect, on a second gate.** The plan's Status section records that this same
manifest's `plan-review` gate carried a wildcard-free glob that "could never match a `-rN`
re-review artifact and would have read round 1's TEMPER whatever verdict a later round filed", fixed
in `3c89349` by widening it to `…-charpy*.md`. That fix was applied to the one gate that had just
failed; the manifest's other five were never swept. Enumerated at HEAD:

| Gate | Glob | |
|---|---|---|
| plan-review | `…-A1b-charpy*.md` | wildcard |
| red-suite | `…-a1b*.md` | wildcard |
| build | `…-stageA1b*.md` | wildcard |
| code-review | `…*one-screen-type-a1b*.md` | wildcard |
| **coverage-audit** | **`Claude/Mendeleev/AUDIT-one-screen-type-a1b.md`** | **LITERAL — the only one** |
| adversary | `…-a1b*.md` | wildcard |

**The fix is one token:** `Claude/Mendeleev/AUDIT-one-screen-type-a1b*.md`. Demonstrated by
execution against a scratch copy of the manifest (the campaign's own file untouched): with the
wildcard, the glob matches both rounds, `artifactsOfRecord` selects `-r2.md` alone as the artifact of
record, the gate reads `ADEQUATE`, and **all six gates report COMPLETE**.

**I have not applied it.** The manifest is the campaign's definition of done and is outside this
seat's writable set, and a coverage auditor widening the glob that gates its own verdict is a shape
that should not be accepted even when the fix is correct and precedented. It belongs to whoever owns
the campaign record. The same sweep should check every other manifest in `Claude/Campaigns/` for the
literal-glob class, since this one was found only because a second round happened to be filed.

---

## 6. Handoff

- **Source artifact** — `Claude/Mendeleev/AUDIT-one-screen-type-a1b.md` (round 1), gaps G1/G2/G3 and
  finding M1, as filled by `48b19f9`.
- **Status** — ADEQUATE. Three occupants verified by execution in this seat; four new notes/corrections.
- **Decisions made** — G1, G2, G3 and M1 are **closed**. The registration-by-class departure is
  **upheld** as equal-or-stronger, with its reasoning recorded so it is not re-litigated (N5). The
  residual set is **upheld as an honest bound**, missing one member (N4). Round 1's M3 index citation
  is **corrected** (C1).
- **Open questions** — none for this round.
- **Next owners** — whoever owns `Claude/Campaigns/one-screen-type-a1b.json`, for the one-token glob
  fix in §5 **before this verdict can clear the gate**; the planner, for M2, M3 (with C1's
  correction) and N3; Curie, for N4 and N1 whenever those files are next touched.
- **Required evidence before the campaign can be called COMPLETE** — the glob fix, then the step-9
  device gate. Coverage is no longer the blocker.
- **Records updated** — this file; `Claude/Zelda/Board.md`.

— Mendeleev, 2026-08-03. Sixteen mutants swept in the foreground across two batches, five matrix rows
moved from bare to swept, and one gate found that could not read its own verdict.
