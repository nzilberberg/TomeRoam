<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:474-487","js/nav.js:104-117"],"callee_ranges":[]} -->

<!-- NOTE on the declaration. Unchanged from r2: nothing relocates, no callee is replaced. The two
     declared ranges are the ones this round re-traced for R2 — the post-collapse recovery block and
     Nav.resetSwipeStyles, which together decide whether the replacement mutant reaches the pill
     sweep and whether PILLSWEPT can stay green under it. -->

Type: plan-review

# Charpy — PLAN-swipe-declone-stage2-subtraction r3 (declone Stage 2, step 11: the subtraction pass)

Verdict: **FORGE** — R1, R2 and R3 all hold, each verified against the artefact rather than the
plan's prose; one non-blocking recommendation that removes the last stated limit at the cost of one
word, and two notes. Nothing here needs a fourth round.

Target: `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md`, at git HEAD **157a2e1**.
Prior: `1ced95d` → TEMPER; `5a1d977` → TEMPER (`…-1ced95d.md`, `…-5a1d977-r2.md`).
Reviewed: 2026-08-05. Read-only on the plan, on `js/`, on `test/` and on `tools/`.

Scope of this round, as set by the coordinator: **R1, R2, R3**. R4–R6 were confirmed applied and are
recorded below without re-argument. The deletion set is byte-for-byte identical for the third round
running and was not re-struck; rounds 1 and 2 settled it.

## Applicability

- **defining_records: true** — three records are added this round, two of them read directly from
  source (`test/transition-matrix.test.js:42-47`, and the `KNOWN_ROTTED` exemption landed at
  `fad819e`). Both are the subject of R1. See `## Defining records`.
- **boundary_relocation: false** — unchanged. Deleting a tool entry and splitting a test are neither.
- **callee_replacement: false** — unchanged.
- **contract_shape: true** — unchanged and untouched this round: `toMover` drops `own`, the seam
  return is unaltered, and rounds 1–2's reading stands — the mover object is built inside `start()`
  and is not a `contract-function-gate.test.js` subject, whose exact-key / `NON_CONTRACT` machinery
  governs `buildConstruction`'s return. `MOVERSHAPE` remains the sole holder of the two-key
  production shape.

Project adapter `tomeroam-js-dom`, over the two declared ranges: the only session field crossing
either is `d.byId` (`js/nav.js:107`, `:128`), Nav's own element accessor, read-only and untouched. No
`document.body.classList` mutation and no `removeAttribute('data-*')` in either range.

## Defining records

**AGREE. The one absence claim this round rests on is verified, and it is stronger than the plan
states.**

| Record | The plan's call at 157a2e1 | My reading |
|---|---|---|
| `test/transition-matrix.test.js:42-47` — "The MIRROR IS RETIRED (stage 4) … nothing to fingerprint and no test to keep here" | CONFLICT with the same file's `:12-20` header; the retirement is current truth, and it decides [R1] | **CONFIRMED, and the file is doubly dead as an evidence target.** Three tests, none a fingerprint: the committed-inventory comparison, the SETTINGS-SUB derivation, and the frozen-spec self-consistency check. No `regionHash`, no pin, no `VERIFIED` map. The within-document contradiction at `:12-20` is exactly as described. |
| `test/mutation-anchors.test.js`'s `KNOWN_ROTTED` exemption (`fad819e`) | AGREE, discharged by C3, structurally because the gate reddens on a stale exemption | **CONFIRMED by reading the gate.** `staleExemptions = [...KNOWN_ROTTED.keys()].filter((k) => !rotted.includes(k))` — deleting the entry removes it from `rotted`, so a commit that deletes the entry and leaves the map populated **fails**. The discharge is enforced, not remembered. |
| `tools/gen-swipe-model.mjs:257` `DISPOSE_REASONS` + its pin, `:413`, `:491-495` | OUT OF SCOPE, ruled rather than left silent | **AGREE, and the ruling is principled.** See R3 below. |

## Verdict

**FORGE.** Three rounds, and each of the three resolutions this round carries is right for a reason I
could check rather than accept. **R1** is resolved better than either option I offered: the entry is
not a rot to repair but the tombstone of a fingerprint retired by the same commit that moved the
predicate, and I verified the gate carries no fingerprint assertion at all — so the entry would have
reported UNCAUGHT even with a valid anchor, and deleting it loses nothing. The `KNOWN_ROTTED`
discharge is genuinely structural. **R2**'s replacement mutant discriminates as claimed and the split
leaves neither half unwitnessed; I traced the exclusivity mutant by mutant. **R3** is mechanized
correctly, its stated limit is honest, and its out-of-scope ruling holds against the test I set for
it. What remains is one recommendation that would close R3's last site for one word — verified
false-positive-free at HEAD — and two notes about a reason and a criterion. None of them is a reason
to hold the plan. Send it to the adversary.

## What held under the strike

### R1 — the absence claim is verified, and it is the strongest form of the argument

The load-bearing new claim was *"there is nothing to fingerprint, so nothing becomes unevidenced."*
It holds, and by a wider margin than the plan claims.

`test/transition-matrix.test.js` contains exactly three tests:

1. `'the committed inventory is exactly what the generator produces'`
2. `'the SETTINGS-SUB half of the registry is derived from nav.js, not hand-listed'`
3. `'the frozen spec builds NO pane for any structural case, and renderDestination follows the destination…'`

None is a fingerprint. There is no `regionHash` call, no `VERIFIED` map, no pin of any `js/app.js`
region — the file imports `gen-transition-matrix.mjs`, `swipe-plan-spec.mjs` and `js/nav.js`'s text,
and that is all. The entry's `mustSay: 'predicate still mirrors'` matches none of the three titles, and
`source-gate-sweep`'s `caught` predicate is `gateFails.some((l) => l.includes(e.mustSay))` — so **even
with a perfectly valid anchor the entry would have reported UNCAUGHT and exited 1.** The entry was
never capable of producing evidence, not merely disconnected from its subject. Deleting it is the only
disposition that is true, and both of the ones I offered in round 2 would have been wrong.

Three consequences I checked rather than took:

- **Exit item 4 is satisfiable.** After the deletion the tool holds four entries, all against the
  single `APP` constant, and all four anchor at HEAD: `js/app.js:140` (navTo), `:496` (nav-relation),
  `:664` (end/state-routing), and `:428` — which C3(a) re-anchors in the same commit. No per-entry
  `file` field is needed. The smaller change is the true one, as the plan says.
- **The `KNOWN_ROTTED` discharge is structural.** Verified above by reading the predicate: leaving the
  map populated after the entry goes fails `test/mutation-anchors.test.js`. This is the right shape —
  the plan does not have to remember to empty it.
- **The three stale records are real.** `test/transition-matrix.test.js:12-20` advertises a guard the
  same file retires thirty lines later; `tools/source-gate-sweep.mjs`'s header names that gate as one
  of two fingerprint gates; `tools/mutation-sweep.mjs`'s exclusion reason repeats the claim. The
  plan's reading — that a gate advertising a guard it no longer has is how nine stages passed with
  nobody wrong at any step — is correct and is the transferable half.

**The distinction the coordinator asked me to judge — keeping the exclusion entry while correcting
only its reason — is right.** `test/transition-matrix.test.js` genuinely can redden on a mutation that
has nothing to do with the transition inventory, so removing it would re-open the false-CAUGHT hole.
The stated reason names a real channel; it names the weaker of two (**G2**).

### R2 — the replacement mutant discriminates, and the split achieves exclusive attribution

Both halves check out, and I traced the second one mutant by mutant rather than accepting the claim.

**Discrimination.** NATURAL-d now removes the recovery's `applyScreen` call. That edit is confined to
`js/app.js`; `PILLSWEPT` drives `Nav.resetSwipeStyles` directly against the index fixture and never
enters `begin()`, so it stays green by construction. The redness is attributable to `RECOVERYPARITY`.

**The split leaves neither half unwitnessed, and attribution is exclusive:**

| Mutant | Main test (screen / scroll / hold) | Split test (pill float) |
|---|---|---|
| NATURAL-a — default screen reset | RED | green — `applyScreen` still executes, so `js/nav.js:129` → `:106` still sweeps |
| NATURAL-b — scroll restore dropped | RED | green, same reason |
| NATURAL-c — hold release moved ahead | RED | green, same reason |
| NATURAL-d — `applyScreen` REMOVED | RED (screen restore) | **RED, and only here** |

So the pill assertion has exactly one killer and it is the one registered for it; the other three
assertions keep their three. NATURAL-d over-kills into the main test, which is harmless — the sweep
prints a `killed by:` list and the split test's name settles which assertion moved.

I also checked the structural objection to splitting: **nothing in this repo maps a coverage id to
exactly one test title.** There is no manifest and no gate asserting it, and
`test/swipe-declone-stage2-css.test.js` is the convention precedent — one file, several `ID — …`
titles. Two named tests under `RECOVERYPARITY` breaks nothing.

Finally, the plan's claim that the fourth assertion is *"the only witness that the recovery still
reaches the pill sweep"* is precise rather than loose: the main test's first assertion also witnesses
that the recovery reaches `applyScreen`, but a mutation to `js/nav.js:106` alone leaves it green and
the pill assertion red. Two distinct witnesses, correctly distinguished.

### R3 — mechanized correctly, honestly limited, and the out-of-scope ruling survives the test I set it

**The token gate does what it claims.** `orphan` occurs in the rendered model at exactly four lines —
`docs/swipe-model.generated.txt:149`, `:181`, `:184`, `:186` — and all four are the in-scope C2 sites
(`gen-swipe-model.mjs:431`, `:234`, `:471`, `:473`). There is no fifth occurrence, so the assertion is
**false-positive-free at HEAD** as well as complete over the four. `:416` genuinely carries no such
token, so the stated limit is accurate rather than a hedge. It is also removable — **G1**.

**The out-of-scope ruling is principled, not convenient,** and I set it a test rather than reading its
justification. The discriminator the plan uses is *normative commitment of the parent plan* vs
*description of a reachable path*, and it holds at each site: `DISPOSE_REASONS` is documented as
"the only reasons a pane **may** be disposed" — a permission over a domain that becomes empty, which
is vacuous but not false; `:413` states I17(a) as an invariant that must hold; `:491-495` states
§3.4's lifecycle design. None of them asserts that any code does anything after the pass. Compare
`:431`, which states that a path exists and describes what happens on it — false the moment the
commit lands. The same discriminator the plan adopted at [R6] for tombstones, applied consistently.

Two further checks that could have unmade it, both clean:

- It is not convenience dressed as principle: the ruling avoids touching the `deepEqual` pin at
  `test/swipe-model.test.js:270-274`, but the reason stands independently of that saving.
- **The ruling and the new gate cannot collide.** If an out-of-scope site carried the `orphan` token,
  the assertion would force an edit the plan just ruled out. None does — `DISPOSE_REASONS`'
  five members, `:413` and `:491-495` are all token-free. Verified, because a gate that contradicts a
  scope ruling in the same commit is precisely the shape this campaign keeps producing.

### Applied and confirmed undisturbed (R4–R6)

**R4** — every exclusion each rule states now has its own negative control, in a table, and the
`NOCLB` positive control is *specified* to sit after a line containing a string that itself contains
`//`, which is the over-stripping failure I named. That is the fixture designed against the scanner's
own failure mode rather than against its happy path. The `NOOWNEDPANE`-is-the-weaker-of-two note is
recorded where D8 needed it. **R5** — the non-discriminating mutant is disclosed rather than repaired,
with the expected-killer measure applied; disclosure is the right call since the ownership filter it
replaced no longer exists. **R6** — the tombstone discriminator is stated once and applied everywhere,
it makes `js/app.js:798`'s retention principled instead of arbitrary, and it *shrinks* the pass by
three edits. None of the three disturbs R1–R3.

---

## Findings

### G1 — Weak (recommendation) — R3's last unmechanized site closes for one word, and the addition is verified safe

Exit item 6 asserts the rendered model carries no `orphan` token, and states honestly that
`gen-swipe-model.mjs:416` — *"dispose the old pane / stray ghosts + clear inline styles"* — carries no
such token and therefore stays on item 5's re-verification. Four of five sites mechanized, and the
plan says which, which is the right way to state a limit.

The limit is removable, and I checked rather than assumed:

- `ghost` (case-insensitive) occurs in `docs/swipe-model.generated.txt` at **exactly one line — 134** —
  which is `render()`'s `:416`, the one site the `orphan` token misses.
- `ghost` occurs in `tools/gen-swipe-model.mjs` at **exactly one line — `:416`** — nowhere else in the
  generator, in data or in prose.

So asserting the rendered model carries **neither `orphan` nor `ghost`** mechanizes five of five and
is provably false-positive-free at HEAD, on the same authority: `ghost` is the retired concept of this
campaign, the one `NOGHOSTCLASS` is named for and `NOGHOSTATALL` before it. The same argument the plan
accepted for `orphan` applies unchanged.

**Why it is worth the one word, and why it is not worth a fourth round.** The residual site is guarded
by exit item 6's read of a 500-line generated document — and that is the mechanism already demonstrated
to fail on this exact file, since the round-1 read-through missed `:471` while reading the two lines
beneath it. Leaving one site on the catcher with a known miss rate, when a one-word addition removes
it, is the gap. But it is a stale sentence in a generated record with two downstream reviews behind
it, not a defect that ships wrong code, so it is a recommendation the planner folds on the way past —
not a reason to hold the plan. *Recommendation, not a requirement:* if the planner prefers the
narrower assertion, the limit as stated is honest and the plan is still FORGE.

### G2 — Note (defect) — the corrected exclusion reason names the weaker of two false-CAUGHT channels

C3 consequence 2 keeps `transition-matrix.test.js` in `SOURCE_TEXT_GATES` and corrects its reason to
"the gate still derives from `js/nav.js` source text". True, and the retention is right. It is not the
stronger channel: `tools/gen-transition-matrix.mjs:34` does `require('../js/swipe.js')` **at module
load** to take `BROWSE_FAMILY`, and registered mutants target `js/swipe.js` (`tools/mutate.mjs:454`,
`:1306-1309`). So the gate can redden on a `js/swipe.js` mutation that has nothing to do with the
transition inventory, by a route the corrected reason does not mention.

The whole lesson of R1 is that a reason which is true-but-incomplete survives for nine stages because
each reader who checks it finds it true. Naming both channels costs a clause and is the difference
between a reason that can be audited and one that merely reads well.

### G3 — Note (defect) — two exclusion-list rulings, two different criteria, neither stated

§13 decision 9 rules the new purge file **out** of `SOURCE_TEXT_GATES` because it "fires only on a
mutant carrying their own token", against the list's stated criterion ("fail BY CONSTRUCTION … under
any mutation"). Decision 11 keeps `transition-matrix.test.js` **in**, on a character that is similarly
narrow — it reddens only on mutations touching `SETTINGS_SUBS`, `BROWSE_FAMILY`, or `js/swipe.js`'s
loadability, not on every mutation. Both outcomes are right; the rule that separates them is nowhere.

It is already in the list, in the one entry written after a measurement:
`scroll-writer-set.test.js`'s reason says it "appeared as `killed by` on mutation #93 … which has
nothing to do with the writer-set invariant." **The operative criterion is "reddens on mutations
unrelated to its own subject", not "reddens on every mutation"** — and under it both rulings follow
from one rule: the purge cells redden only on their own subject, `transition-matrix.test.js` reddens
on other files'. Stating it turns two judgments into one rule and stops the list's header criterion
from reading as false against its own entries.

---

## Coverage — blocking findings

**None.** G1 is a recommendation and G2/G3 are notes; no finding blocks, so no finding carries a
coverage mapping. Recorded explicitly rather than by omission, per the round-1 and round-2 pattern
where every blocking finding was mapped.

For the record, the three in-scope resolutions are each held by a mechanism I verified rather than by
this document: **R1** by `test/mutation-anchors.test.js`'s stale-exemption assertion plus exit item 4;
**R2** by NATURAL-d's exclusive kill of the split test with `PILLSWEPT` green; **R3** by the new
no-`orphan` assertion in `test/swipe-model.test.js` beside the one already comparing rendered output.

## Prediction — where this goes from here if built as written

Step 6 lands red on `test/swipe-model.test.js`'s hash exactly as designed, and C1/C2 carry the builder
through it. Exit item 4 is now satisfiable and the `KNOWN_ROTTED` gate enforces its own discharge, so
the two ways round 2 predicted the commit would go wrong are closed by structure rather than by
attention.

The residual risk is where the plan itself now says it is, and I agree with its placement: **exit item
5**. Nothing can distinguish a re-verified pin from a pasted one, so the `supersession` re-verification
is the one load-bearing step in the commit with no mechanism behind it. Item 6 catches its most likely
consequence for four of five sites — five if G1 is folded — and the fifth, `js/app.js`'s recovery-order
paragraph, is the sentence a hurried re-pin leaves behind.

Beyond that, the next thing to find is not in this plan. Step 3 sends the adversary at the promise
*"every item in §4 is unreachable at HEAD, and the §5 collapse changes no behaviour"*, and the sharp
end is the first clause: three rounds have confirmed the reachability proofs by reading, and this
campaign's own record is that four reachability readings were confirmed by reading and settled only by
execution. The `.nav-ghost` residual the plan discloses — a class name assembled at runtime, invisible
to any textual gate — is the coordinate to aim at, and R1's own history is the reason to take the
disclosure seriously rather than as boilerplate: a textual check that everyone had read and nobody had
run was wrong for nine stages.
