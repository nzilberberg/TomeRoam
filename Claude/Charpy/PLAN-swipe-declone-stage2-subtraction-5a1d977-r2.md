<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:474-487","js/nav.js:104-117"],"callee_ranges":[]} -->

<!-- NOTE on the declaration. Unchanged in shape from round 1: nothing relocates and no callee is
     replaced. The two declared ranges are the two regions this round re-traced value-by-value — the
     recovery block the collapse rewrites, and Nav.resetSwipeStyles, whose three effects decide
     whether the collapse is admissible and whether RECOVERYPARITY's new mutant can bite. -->

Type: plan-review

# Charpy — PLAN-swipe-declone-stage2-subtraction r2 (declone Stage 2, step 11: the subtraction pass)

Verdict: **TEMPER** — the deletion set and all five round-1 resolutions are correct in substance, and
three carry concrete residuals: a new exit condition that cannot be met at HEAD, a new mutant that
cannot exercise the assertion it is registered for, and a co-change enumeration that is short by one
with only a read-through checking it.

Target: `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md`, at git HEAD **5a1d977**.
Prior: `1ced95d` → TEMPER (`Claude/Charpy/PLAN-swipe-declone-stage2-subtraction-1ced95d.md`).
Reviewed: 2026-08-04. Read-only on the plan, on `js/`, on `test/` and on `tools/`.

Scope of this round, as set by the coordinator: the five structural resolutions **F1–F5** and the
**F3** scan-resolution decision. The weak findings and notes were confirmed applied and are recorded
under *What held* rather than re-argued. The deletion set is byte-for-byte identical to round 1 and
was not re-struck; round 1's proofs stand.

## Applicability

- **defining_records: true** — the plan now reconciles fourteen records, four of them added at [F1],
  [F2] and [F8]. The four additions are the subject of this round. See `## Defining records`.
- **boundary_relocation: false** — unchanged. Nothing moves; `BR`'s relocation is a test file moving,
  not an ownership boundary.
- **callee_replacement: false** — unchanged. `resetSwipeStyles` loses a parameter and keeps its one
  implementation and its one internal call site (`js/nav.js:129`).
- **contract_shape: true** — unchanged: `toMover` drops `own`. Round 1's gate-impact reading stands
  and is unaltered by this revision — the mover object is built inside `start()` and is not a
  `contract-function-gate.test.js` subject; that gate's exact-key / `NON_CONTRACT` machinery governs
  `buildConstruction`'s seam return, which this pass does not change. `MOVERSHAPE` remains the only
  mechanism holding the new two-key production shape, and the plan states that.

Project adapter `tomeroam-js-dom`, over the two declared ranges: the only session field crossing
either is `d.byId` (`js/nav.js:107`, `:128` — Nav's own element accessor, read-only and untouched by
every item in the plan). No `document.body.classList` mutation and no `removeAttribute('data-*')`
occurs in either range.

## Defining records

**AGREE, and the four records round 1 opened as GAPs are now reconciled correctly — with one of the
four reconciled against an incomplete reading of the record itself.**

| Record | The plan's call at 5a1d977 | My reading |
|---|---|---|
| `test/swipe-model.test.js` `VERIFIED.supersession` | GAP closed at [F1]: co-change C1, step-6 list, exit item 5 | **AGREE.** The pinned region is confirmed as `regionHash(…, 'function begin(x, y, target) {', 'if (target.closest', …)` and the co-change is correctly placed ahead of the deletions. |
| `tools/gen-swipe-model.mjs` — the ORPHAN prose | GAP closed at [F1]: co-change C2, "four sites: `:416`, `:431`, `:234`, `:473-474`" | **AGREE that the record is material; CONFLICT on the enumeration.** All four cited sites resolve exactly as claimed. A fifth — `:471`, "the supersede-not-reject routing + **orphan disposal**" — sits one line above two the plan does cite and is not listed, and a further cluster is unruled. **R3.** |
| `tools/source-gate-sweep.mjs` `begin/supersession` | GAP closed at [F2]: co-change C3, exit item 4 | **AGREE on the entry; CONFLICT on the exit condition.** The re-anchor is right. But the tool is **already red at HEAD on a different entry**, so `node tools/source-gate-sweep.mjs` cannot exit 0 at step 6. **R1.** |
| `tools/fuzz-ui.js:54` | AGREE, co-change C4 | **AGREE.** Confirmed constant after the pass; D3's argument one file out. |
| §13 decision 7 — the three per-token scan rules | The round's load-bearing new claim | **AGREE, and the `owned-pane` completeness argument holds.** Verified below. |

## Verdict

**TEMPER.** Every one of the five resolutions is right in its reasoning; three ship with a residual
that would be discovered inside step 6's single commit. **R1** makes the new exit condition
unsatisfiable at HEAD, on a rot that predates this pass by nine stages — the builder meets a red they
did not cause at the end of a fourteen-item commit, which is the plan's own R5 pattern one file over.
**R2** registers a mutant for `RECOVERYPARITY`'s new fourth assertion that cannot produce the effect
it claims, so the plan's answer to round-1 F5 — "the only witness that the recovery still reaches the
pill sweep" — arrives without demonstrated evidence, which is the "reddens for the wrong reason"
hazard this plan records twice against other people's mutants. **R3** presents C2's site list as
complete and it is short by one, guarded only by a read-through where a two-line assertion is
available in a test that already reads the rendered output. None of the three touches the deletion
set, and none needs re-derivation. This is a short round.

## What held under the strike

**F4 holds clean.** The comment-scrub list is now the item I would have written. `js/app.js:437-473`
is declared, absorbed into the widened `js/app.js:425-487` range, and called out on its own merits as
the argument for the branch being removed rather than as a gate side-effect — which is the correct
ordering, since [F3]'s resolution means the residue does not redden `NOOWNEDPANE`. The list resolves
against source at every site I checked. (One trivial imprecision: `:761-765` stops two lines short of
the `paneKindOf` comment, which runs to `:767` — the declared source range `:761-771` covers it, so
nothing is lost.)

**F3's decision is sound, and the `owned-pane` completeness claim survives the strike.** Neither
reading I posed in round 1 was right, and the plan is correct that the three tokens are three kinds of
thing. On the load-bearing one — *"the literal has to exist somewhere for a mover to carry that
value"*:

- The claim is **true for every shape a re-introduction realistically takes.** `mover(w, 'owned-pane', …)`
  matches; `const KIND = 'owned-pane'; mover(w, KIND, …)` matches, which is the shape the
  quoted-at-comparison-site reading would have missed and is the reason the rule is right. Naming
  three quoting forms covers the template-literal shape.
- The **disclosed** residual (a value assembled at runtime from fragments) is the only escape I could
  construct, and the plan discloses it in the same terms `NOAPPCLONE`'s header already uses.
- **The tree cooperates.** After the four `own === 'owned-pane'` comparison sites go (`js/app.js:266`,
  `:396`, `:698`, `:769`), there is **no** string literal with that content anywhere under `js/` —
  `js/swipe.js` carries the token only in the `:254` comment. So the gate is green at authoring, and
  the round-1 ambiguity that made a red unattributable is genuinely resolved rather than papered over.
- Not stated, and worth knowing rather than fixing: `NOOWNEDPANE` is a textual belt over a
  **behavioural** brace — `NOGHOSTATALL` already asserts no constructed mover carries `'owned-pane'`
  across all eight structural cases, and that assertion is immune to the concatenation residual. §6's
  Rule R table says so; D8's "Held structurally by `NOOWNEDPANE`" reads as though the textual gate is
  the sole holder. It is the weaker of two.
- `NOCLB`'s code-position rule is likewise justified, and I checked the objection I expected to
  raise: the codebase **does** carry retirement tombstones naming retired identifiers in exactly the
  form a bare-token rule would redden (`js/app.js:798`, `holdGhostUntilPaintable — DELETED (…)`), so
  the exclusion protects a real project pattern rather than a hypothetical.

**F5's re-homing is correct in fixture, on both halves.** `RECOVERYPARITY`'s fourth assertion drives
the real recovery on the app harness with a pill float present and asserts it is gone — the same
layer and the same path `DEC` covered, which is what round 1 said `PILLSWEPT` could not reach. `BR`'s
relocation is the right call over deletion: its assertion is about the borrowed-real views, its
rationale is what dies, and moving it lets `test/swipe-stage6e.test.js` go whole. Only its **mutant**
fails (R2), and only for the first half.

**F2's mechanism is right for the entry it names.** I checked the two constraints the coordinator
asked about, and both are enforced mechanically rather than by the plan's prose: `source-gate-sweep`
requires the fingerprint subtest to go RED *and* `test/swipe-invariants.test.js` +
`test/swipe-gesture.test.js` to stay GREEN under the same mutation, reporting `NOT BEHAVIOUR-NEUTRAL`
otherwise. So deferring the target line to the builder is safe **provided a valid target exists**, and
one does: the post-collapse region retains `const cur = d || session;`, the hard-reset log line and
`releaseGesture()`, and the tool's own header sanctions a log-string change as a valid mutation form.

**F1's mechanism is right, and §8's self-indictment is the strongest addition in the revision.** The
line *"a 'mechanical closure' that silently excludes one of the two anchor registries is the same
shape of false comfort as a cell that cannot fail"* is the correct generalisation and belongs in the
plan. R1 is that same sentence applied one entry further.

**Applied and confirmed undisturbed:** F6 (the `js/app.js:482` → `js/nav.js:129` adjacency is now
§5's stated reason the row is admissible, with the pill-leak consequence routed to `RECOVERYPARITY`);
F7 (`test/swipe-invariants.test.js:426-427`/`:450-451` is excluded from D15's vacuous set and
re-anchored as `STALETOUCH`); F8 (fuzz counter as C4; the purge file deliberately **not** added to
`SOURCE_TEXT_GATES`, with the right reason — it fires only on its own token); F9 (`S2-23`'s expected
killer set written into its registration comment); F10 (the inert self-exclusion clause dropped and
replaced by the true statement, with the correct conditional: if the scope widens past `js/`, the
exclusion becomes owed). None of them disturbs a structural resolution.

---

## Findings

### R1 — Structural (defect) — `tools/source-gate-sweep.mjs` is already red at HEAD on a second entry, so exit item 4 cannot be satisfied

C3 re-anchors the `begin/supersession` entry and §11 exit item 4 requires
`node tools/source-gate-sweep.mjs` to exit 0. It cannot, and not because of anything this pass does.

The tool's **first** entry — `transition branches (transition-matrix + swipe-model)`, gate
`test/transition-matrix.test.js` — is anchored on:

```
from: "const incomingBrowse = !toOv && toV !== 'home';"      // tools/source-gate-sweep.mjs:45
```

That line **does not exist in `js/app.js`** and has not since commit `14257f2` — stage 4, *"extract
classifyTransition() + constructionPlanFor(), retire the branch mirror"*. The identifier survives only
in a `js/swipe.js` comment and in a `test/fixtures/swipe-plan-spec.mjs` comment. On a miss the tool
prints `ANCHOR FAILED`, pushes to `uncaught`, and `process.exit(uncaught.length || notNeutral.length ? 1 : 0)`
returns 1 (`tools/source-gate-sweep.mjs:84-89`, `:136`).

Two consequences, and the second is the finding. First: `test/transition-matrix.test.js`'s fingerprint
has had **no runnable mutation evidence at all since stage 4** — precisely the hole §4a C3 exists to
close, one entry over and nine stages older, undetected for exactly the reason C3 identifies (nothing
runs the tool, and the anchors gate reads `tools/mutate.mjs` only). Second, and this is what makes it
Structural rather than a discovery: the plan converts that tool into an **exit condition** while
fixing only the entry D9 breaks. The builder reaches exit item 4 at the end of a fourteen-item single
commit, gets a red on an entry this pass never touched, and — by the plan's own R5, stated for the
sibling case — "cannot tell a working fixture from undeleted residue, and the cheapest resolution is
to narrow the match". Here the cheapest resolutions are to drop the exit item or to delete the rotted
entry, and both end with the fingerprint that just got re-pinned still holding no evidence.

**The invariant.** Making a tool an exit condition means the tool passes on a clean tree. Every entry
in `tools/source-gate-sweep.mjs` is swept for rot in this commit, not only the one D9 breaks, and the
`transition branches` entry is re-anchored onto a line that exists — or its removal is a stated,
dated decision recording that the transition-matrix fingerprint is knowingly unevidenced. Which of
those is the planner's call; that exit item 4 is unsatisfiable as written is not.

### R2 — Structural (defect) — `RECOVERYPARITY`'s NATURAL-d cannot produce the effect it is registered for, so the re-homed `DEC` witness ships undemonstrated

§10 registers the fourth mutant as: *"NATURAL-d the screen application is moved after the ownership
clear so the recovery no longer reaches the style reset and the pill float survives which is the leak
the deleted witness used to catch."*

Moving `applyScreen(currentDesc(), { render: false, resetScroll: false })` after `finishing = false;
session = null; d = null;` still **executes** it. `Nav.applyScreen` reads two option flags and `d.byId`,
then calls `resetSwipeStyles(opts && opts.keepGhosts)` as its **first** statement (`js/nav.js:125-129`),
with no early return before it; `resetSwipeStyles` sweeps `.np-pill-float` unconditionally
(`js/nav.js:106`), guarded by nothing and unaffected by session state. **The pill is swept either
way.** What NATURAL-d actually perturbs is the ordering against `dropRowHold()` — which NATURAL-c
already covers, inverted.

So the mutant registered to demonstrate the fourth assertion reddens on the third. That is the exact
hazard this plan records twice about other mutants — D13 on `stage6i SCOPE` ("a mutant that reddens
for the wrong reason is indistinguishable from a working one in the sweep output") and D13c on
`S2-23` — and it lands on the assertion the plan calls "the **only** witness that the recovery still
reaches the pill sweep now that the explicit style reset call is deleted".

**The invariant, and it is already stated in §5.** The property is *the recovery reaches
`Nav.resetSwipeStyles` at all*, and after [F6] the single path to it is the `applyScreen` call at
`js/app.js:482`. The mutant that exercises that is **removing the `applyScreen` call from the
recovery**, not moving it. It is also discriminating in the way the plan needs: `PILLSWEPT` drives the
reset directly at the unit layer and stays green, so the redness is attributable to
`RECOVERYPARITY`'s fourth assertion alone. §5 names this residual in prose — *"a future edit that
reorders or short-circuits `js/app.js:482` restores the pill leak"* — and the mutant should be the
short-circuit half, which is the reachable one.

### R3 — Structural (defect) — C2's site enumeration is short by one, and the only thing checking it is a read-through where a gate is two lines away

C2 states *"Four sites"* and names `:416`, `:431`, `:234`, `:473-474`. All four resolve exactly as
claimed. A **fifth** does not appear:

```
gen-swipe-model.mjs:471:  P('     the supersede-not-reject routing + orphan disposal (verified at `where`); the');
```

It is inside `render()`, in the same footnote paragraph as `:473-474`, one line above the first of
them. Rewriting the four named sites and regenerating leaves the generated model asserting that
orphan disposal is a verified behaviour of code the same commit deleted.

Unruled either way, and the planner should say which: `:413` ("that session's pane is **NOT
disposed** to make room"), `:491-495` (§8 PANE DISPOSAL — "release is the normal path, dispose is the
emergency"), and `DISPOSE_REASONS` (`:257`), whose `'superseded'` member is `disposeOwnedPanes`' own
reason string and which is pinned by `assert.deepEqual` at `test/swipe-model.test.js:272`. That pin is
a **third** swipe-model surface, beyond C1's hash and C2's prose, and it is in no list in the plan.
After the pass no pane exists to dispose, so a model section enumerating dispose reasons is the same
class of record C2 exists to correct — whether it is in scope is a judgment, but silence is not.

**This is also the direct answer to the coordinator's F1 question.** Exit item 5 *documents* the
re-hash risk; nothing can mechanically distinguish a re-verified hash from a pasted one, so it is
correctly a discipline and correctly placed. **Exit item 6 is the item that catches the consequence**
— and it is the one that is mechanizable and is not mechanized. `test/swipe-model.test.js` already
reads the rendered text (`assert.equal(lf(gen.render()), committed)`); one assertion that the rendered
model carries no reference to the retired orphan-recovery branch converts R3-the-risk from vigilance
into a gate. This project's standing law is that where a rule can be made structural it is made
structural, and this plan invokes that law itself to justify the purge file's existence. The argument
in §10's no-cell table — *"No new cell is owed and none would help: the risk is not that the gate
fails to fire but that the cheapest way to green it is a re-hash"* — is right about the hash and wrong
about the consequence, and `:471` is the standing proof: an enumeration short by one, guarded by a
human reading a 500-line generated document at the end of a fourteen-item commit.

### R4 — Weak (defect) — each purge cell's rule names two exclusion shapes and the fire drill exercises one

§10 requires *"a positive control … and, for `NOOWNEDPANE` and `NOCLB`, a **negative control** (the
same token in a comment)"*. Both rules exclude two shapes, not one:

- `NOOWNEDPANE`: *"a bare occurrence in a comment **or in an identifier** must NOT match"* — the
  identifier shape (e.g. a local named `ownedPaneCount`) is unexercised.
- `NOCLB`: *"outside comments **and outside string literals**"* — the string-literal shape is
  unexercised.

The second matters more than a symmetry complaint, because `NOCLB` is the first gate in this codebase
to need comment-and-string stripping at all: `test/no-view-clone-gate.test.js` scans raw source text
and has no such primitive, so the machinery is new. Its characteristic failure is **over-stripping** —
a `//` inside a string literal swallowing the remainder of the line — which makes the scan blind
*after* that point while both currently specified controls still pass, since they are appended to a
clean file. That is R5's "written so it cannot fire", surviving in the one cell that introduces novel
scanning machinery.

**The invariant.** Each exclusion a rule states is proved by an executed control, not by the sentence
that states it — the same standard §10 already applies to the positive path.

### R5 — Note (defect) — `BORROWEDREALSURVIVES`'s replacement mutant is non-discriminating

D13b replaces `BR`'s retired mutant with *"the style reset is broadened to REMOVE the elements it
clears rather than clearing them"*. `Nav.resetSwipeStyles`'s loop covers `#home`, `#browse`,
`#options`, `#nowplaying`, every settings sub, **every `.browsepage`** and the navbar pill
(`js/nav.js:107-116`), and it runs at the top of every `applyScreen`. Removing all of them on every
screen application reddens most of the harness suite, so the mutant demonstrates that *the suite*
notices, not that *this cell* notices — the attribution problem D13c writes an expected-killer set for
one row earlier. It is the honest choice of mechanism (the ownership filter it replaces is gone), so
the fix is the same one-line measure already applied to `S2-23`: record the expected killer set in the
mutant's registration comment.

### R6 — Note (defect) — the plan rules opposite ways on retirement tombstones with no stated discriminator

§13 decision 7 justifies `NOCLB`'s code-position rule on the ground that *"a comment explaining why
the concept was retired — exactly the record that should survive — does not redden the gate."* D16b
then deletes `js/app.js:718-726`, which the plan itself describes as *"the `ghostVsReal` and
`fadePanes` **tombstones**"*, while `js/app.js:798` (`holdGhostUntilPaintable — DELETED
(PLAN-swipe-declone.md §12 item 13)`) is kept and is not on any list. Both are the same class of
record. Neither disposition is wrong on its own; stating a principle in one section and applying its
inverse in another, with nothing that distinguishes them, hands the next reader an ambiguity together
with a gate built on the principle. A one-line discriminator settles it — a tombstone that names a
retired symbol and its authority survives; a comment that explains how a deleted mechanism *worked*
goes.

---

## Coverage — blocking findings

| Finding | Verified by |
|---|---|
| **R1** | `node tools/source-gate-sweep.mjs` exits 0 at step 6 with **every** entry anchoring, not only `begin/supersession`; or the `transition branches` entry's removal is a dated decision recording that the transition-matrix fingerprint is knowingly unevidenced. Existing tool — no new cell owed. |
| **R2** | `RECOVERYPARITY`'s fourth mutant removes the recovery's `applyScreen` call rather than reordering it, and is observed to redden `RECOVERYPARITY` while `PILLSWEPT` stays green — which is what makes the redness attributable to the fourth assertion. Cell: `RECOVERYPARITY`. |
| **R3** | `tools/gen-swipe-model.mjs:471` is on C2's list; `:413`, `:491-495`, `DISPOSE_REASONS` and its `deepEqual` pin at `test/swipe-model.test.js:272` are ruled in or out explicitly; and exit item 6 is mechanized as an assertion in `test/swipe-model.test.js` over the rendered output rather than left as a read-through. Existing cell, one assertion added. |
| **R4** | Each purge cell's fire drill exercises **every** exclusion its rule states — for `NOOWNEDPANE` a comment *and* an identifier; for `NOCLB` a comment *and* a string literal — with the `NOCLB` positive control placed after a line containing a string that itself contains `//`, so an over-stripping scanner is caught. Cells: `NOOWNEDPANE`, `NOCLB`. |

R5 and R6 are non-blocking and carry no coverage mapping.

## Prediction — where this breaks in execution if built as written

Step 6 now lands red on `test/swipe-model.test.js` first, exactly as the plan predicts and prepares
for, and C1/C2 carry the builder through it. The break moves to the end of the commit.

Exit item 4 is the first thing that fails for a reason the plan did not name: `source-gate-sweep`
reports `ANCHOR FAILED — transition branches`, one uncaught, exit 1 (R1). Nothing in the commit caused
it and nothing in the plan explains it, so the resolution taken under pressure is to drop the exit
item — which retires, in the same commit, the tool the revision added it to protect.

The second break is silent and arrives later. `RECOVERYPARITY` is authored with four mutants at
step 5; NATURAL-d reddens (via the hold-ordering assertion) and is recorded CAUGHT, so the fourth
assertion — the re-homed `DEC` witness, the only thing standing between a reordered `js/app.js:482`
and a pill float leaking on every superseded Now Playing swipe — ships never having been shown to
fail (R2). It is the same shape as the `stage6i SCOPE` mutant this plan flags, and it is invisible in
the sweep output for the same reason.

The third is a records defect that outlives the commit. `tools/gen-swipe-model.mjs:471` is not on C2's
list (R3), so the regenerated model still states that orphan disposal is verified behaviour. Exit item
6 is the only catcher, it is a read-through of a 500-line generated document at the end of a
fourteen-item commit, and the reviewer at step 8 inherits a document whose credibility is the whole
reason it is generated.
