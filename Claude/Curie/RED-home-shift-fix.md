# RED suite — the home→books SCROLL SHIFT (M1 park scroll-neutrality + M2 ghost/real alignment)

Author: Curie (test design). Date: 2026-07-29. Plan of record:
`Claude/Plans/PLAN-home-shift-fix.md` (PLAN_READY; Loki 5th strike HELD_STONE `8d47465`; Charpy
post-reversal re-stress TEMPER `e1f2866`; every gate run and cleared).
Branch: `build/mutation-anchor-uniqueness`, worktree `.claude/worktrees/build-mutation-uniqueness`.
Base of this work: `e45a82b`. Commits: `1de38dc`, `cdfa1ea`.

## VERDICT: RED_SUITE_READY

---

## 1. What this suite proves, and what it deliberately does not

It proves the CI-checkable half of both fixes:

1. **M1PARKRANGE** — the shipped `#home.parked` rule declares the REQUIRED `overflow-x/-y: hidden`
   and nothing outside a three-tier permitted set, with `top` and `bottom` ABSENT.
2. **M1WRITERSET** — every code path that TEXTUALLY moves an element's vertical scroll offset in
   first-party `js/` is registered, in both directions, and exactly one targets `#home`.
3. **M1NOWRITE** — a clean home-source abort→home reveal makes ZERO writes to `#home.scrollTop`.
4. **M1NAVWINS** — an external navigation landing inside the 340ms settle window owns the reveal:
   exactly one write of 0 in window A, none in window B.
5. **MUTUNIQ** — the mutation APPLIER refuses a non-unique anchor and applies a disambiguated
   entry to the intended occurrence only.
6. **M2ALIGN** — the outgoing app-ghost builder lays the clone's active-view content-top at the
   real fixed-inset content-top, not the vestigial in-flow `46px`.

**It proves no paint, no computed geometry, and no engine behaviour.** Both §7.2 prohibitions are
honoured, and each is honoured by ABSENCE of a cell, which is recorded here so a later reader can
tell the absence was a decision:

- **NO cell asserts that `#home.scrollTop` survives the park.** jsdom stores `scrollTop` verbatim
  and never clamps, so such a cell passes identically with the fix removed — vacuously green. No
  clamp shim was built either. The preservation is DEVICE-owed (§9 R-M1-cause).
- **NO cell asserts scroll-anchoring behaviour, and no cell is credited with INVARIANT P's third
  axis.** jsdom implements no scroll anchoring at all, so a cell either way would be a fiction
  about the engine. M1PARKRANGE's Tier 0 asserts the DECLARATION whose measured effect is the
  axis; the behaviour is DEVICE-owed (§9 R-M1-anchor, Android/Blink specifically).

**No `js/` or `css/` file was edited.** Verified mechanically: `git diff --name-only e45a82b..HEAD`
returns only `test/*` and `tools/*`. The red `--page-bg` gradient at `css/app.css:41` is
byte-untouched.

## 2. New / changed files

| File | Status | Contents |
|---|---|---|
| `test/home-park-recipe.test.js` | NEW | M1PARKRANGE + its 10 acceptance tests |
| `test/scroll-writer-set.test.js` | NEW | M1WRITERSET (gate + scope + selftest) |
| `test/home-abort-writes.test.js` | NEW | M1NOWRITE + M1NAVWINS |
| `test/mutation-applier.test.js` | NEW | MUTUNIQ — the applier half only (see §6) |
| `test/ghost-clone-geometry.test.js` | NEW | M2ALIGN + its derivation guard |
| `tools/mutate.mjs` | EDITED | 8 mutant registrations (indices 95–102) + 4 assembled anchor consts |
| `tools/mutation-sweep.mjs` | EDITED | one `SOURCE_TEXT_GATES` entry (see F-C3 / §5) |

## 3. SKIP-PENDING-BUILD — how the red cells pass the pre-commit hook

The pre-commit battery runs the whole suite and blocks on any plain failure, and this project does
not use `--no-verify`. So the two cells that are RED AT HEAD are committed `{ skip: SKIP }`, exactly
as the `browse-decouple` red suite was. Each was CONFIRMED RED with the skip removed (§4) and the
skip restored afterwards. **Brunel removes the `{ skip: SKIP }` on each of the two cells to drive
them red, then makes them green. No assertion was weakened to green a cell.**

The two skipped cells are `{ skip }`, not `{ todo }`, so no `Claude/Decisions/PolicyLedger.mjs`
entry is required — the ledger gate tracks known-red (`{ todo }`) tests, and a
skip-pending-build is not a policy exception.

## 4. Cell → state map, with each RED quoted

| Cell | @HEAD | How its ability to fail is established |
|---|---|---|
| M1PARKRANGE | **RED** (skipped) | the shipped `top: 0`; mutants `-a/-b/-c` sweep-owed post-fix |
| M2ALIGN | **RED** (skipped) | the shipped `46px`; mutant registration owed to step 3 (§7) |
| M1WRITERSET | GREEN — a LOCK | mutant #98 applied by hand (quoted below) + the in-file SELFTEST |
| M1NOWRITE | GREEN — a LOCK | real sweep #99, #100 → caught |
| M1NAVWINS | GREEN — a LOCK | real sweep #100, #99 → caught |
| MUTUNIQ (applier) | GREEN — a LOCK | real sweep #101, #102 → caught |

**Four of the six cells are GREEN at HEAD by design and that is not a defect.** M1WRITERSET,
M1NOWRITE, M1NAVWINS and MUTUNIQ assert behaviour shipped code ALREADY has and that the fix must
not change — they are regression locks, and the whole point of M1NAVWINS is that shipped code is
stable on the interleaving the 3rd KILL measured. A gate that was red on arrival would be the
defect (the previous plan revision's 7-entry writer-set baseline was exactly that). Their ability
to fail is therefore carried by mutants, not by an initial red.

### M1PARKRANGE — RED at HEAD (`{ skip }` removed, then restored)

```
not ok 1 - M1PARKRANGE — parking #home changes only where it paints and whether it takes input:
           the #home.parked rule declares the required overflow: hidden and nothing outside the
           permitted set (static stylesheet read)
  error: |-
    INVARIANT P (declarative half) is violated by the shipped `#home.parked` rule:

    [OUTSIDE-PERMITTED-SET] INVARIANT P VIOLATION: #home.parked declares `top: 0` (declared as
    `top`). `top` and `bottom` are on NO tier and must be ABSENT — that absence is what makes the
    parked box's block-direction geometry DERIVED from the active box by the cascade rather than
    restated beside it, and a `top` on the park rule makes the parked box taller than the active
    box by `var(--safe-top) + 51px`, shrinking its max scroll by the same and making the browser
    clamp `scrollTop` at every park (executed exact at 71px in real Blink). Even a byte-identical
    `top` is refused: it is the declaration a future editor is likeliest to EDIT rather than delete.
  operator: 'deepEqual'
```

**Exactly ONE failure, which is itself evidence:** `overflow: hidden` already satisfies Tier 0 at
HEAD and every other declaration already fits a tier, so the single `top: 0` deletion is the whole
distance between red and green. Acceptance test (1) confirms that directly — it runs the audit
against the real stylesheet with `top: 0` removed in memory and requires a PASS.

### M2ALIGN — RED at HEAD (`{ skip }` removed, then restored)

```
not ok 1 - M2ALIGN — the outgoing app-ghost builder sets the clone active-view content-top to the
           real fixed-inset content-top, not the vestigial in-flow 46px
  error: "the clone content-top must NOT be the vestigial pre-6i in-flow 46px: the real active view
   is a position:fixed inset box whose content starts at calc(var(--safe-top) + 65px) and which
   ignores #library's padding entirely, so 46px lays the ghost content at a different viewport-Y
   from the view it covers — realized as a fixed vertical jump every time the ghost covers or
   uncovers the real view."
  expected: '46px'
  actual: '46px'
  operator: '!='
```

### M1WRITERSET — RED under its own mutant (#98 applied via the CLI, then `--restore`)

```
applied #98 [js/nav.js]: M1WRITERSET: a SECOND textual writer of #home.scrollTop is injected …
not ok 1 - M1WRITERSET — every derived first-party vertical-scroll writer is registered, and every
           registered writer still occurs in source
  error: |-
    these code paths TEXTUALLY move an element's vertical scroll offset and are NOT in the
    registered baseline. A second writer of #home is the exact shape the 2nd adversary strike
    punished (a browse-source value written onto #home). REGISTER each with a target, an owner and
    a one-line reason it cannot reach #home — and ⛔ do NOT narrow the pattern or the file set to
    make this pass (that removes the scrollIntoView-class coverage the next adversarial pass
    targets):
      js/nav.js:148 [A] if (resetScroll) $('home').scrollTop = 0;   /* mutated: a second #home writer */
restored          (js/nav.js byte-pristine; no *.mutbak anywhere)
```

Red for direction 1 (an unregistered derived site) — the intended reason, not a rot artefact.

### M1NOWRITE / M1NAVWINS / MUTUNIQ — RED under the REAL sweep (foreground, targeted indices)

```
$ node tools/mutation-sweep.mjs 99 100 101 102
#99  caught (2 failing) — M1NOWRITE: the abort finalize passes resetScroll: true …
       killed by: M1NOWRITE — a home-source abort→home reveal performs ZERO writes to #home.scrollTop …
       killed by: M1NAVWINS — an external navigation landing during a home-source abort settle …
#100 caught (2 failing) — M1NAVWINS: the retired reveal-time cur.ghostY restore is re-introduced …
       killed by: M1NOWRITE — …
       killed by: M1NAVWINS — …
#101 caught (1 failing) — MUTUNIQ-a: the anchor uniqueness check is disabled …
       killed by: MUTUNIQ — the APPLIER refuses a non-unique anchor, names the occurrence count …
#102 caught (1 failing) — MUTUNIQ-b: the applier reverts to first-occurrence src.replace …
       killed by: MUTUNIQ — a disambiguated entry is applied to the INTENDED occurrence only …

swept 4: 0 uncaught, 0 unapplied, 0 stale flags
```

**#100 satisfies §7.1's BOTH-not-at-least-one rule:** it declares M1NAVWINS *and* M1NOWRITE as
expected killers and both reddened, so neither cell is masked over that crossing.

## 5. The eight registered mutants (indices 95–102), each with its expected killing cell

| # | Mutant | Target | Expected killing cell | Verified |
|---|---|---|---|---|
| 95 | `M1PARKRANGE-a` — re-add `top: 0` | `css/app.css` | M1PARKRANGE | sweep OWED post-fix (§7) |
| 96 | `M1PARKRANGE-b` — DELETE `overflow: hidden` | `css/app.css` | M1PARKRANGE (ABSENT red) | sweep OWED post-fix |
| 97 | `M1PARKRANGE-c` — `hidden` → `clip` | `css/app.css` | M1PARKRANGE (WRONG-VALUE red) | sweep OWED post-fix |
| 98 | `M1WRITERSET` — inject a second `#home` writer | `js/nav.js` | M1WRITERSET | manual apply, quoted §4 |
| 99 | `M1NOWRITE` — `resetScroll: false` → `true` | `js/app.js` | M1NOWRITE | real sweep ✓ |
| 100 | `M1NAVWINS` — re-inject the retired restore | `js/app.js` | M1NAVWINS **AND** M1NOWRITE | real sweep ✓ (both) |
| 101 | `MUTUNIQ-a` — disable the uniqueness check | `tools/mutate.mjs` | MUTUNIQ (applier refusal) | real sweep ✓ |
| 102 | `MUTUNIQ-b` — applier back to first-occurrence replace | `tools/mutate.mjs` | MUTUNIQ (intended occurrence) | real sweep ✓ |

Plus **M2ALIGN's mutant, which is OWED to the build step** — see §7. So the campaign carries
**NINE** registrations over six cells once step 3 lands, not eight: MUTUNIQ carries two, for the
same reason M1PARKRANGE carries three (see F-C6).

**Anchor uniqueness, treated as the default hazard.** Every new `from` carries disambiguating
context from the start, and the registry gate accepts all eight. Two specifics worth keeping:

- `-b`/`-c`'s anchor **needs the `will-change: transform;` tail.** Without it the text occurs
  TWICE and `.browsepage.parked` (css:90) is FIRST. Independently reproduced — see F-A1.
- **The two `tools/mutate.mjs` anchors are assembled from string pieces**, because a verbatim
  literal would make the anchor occur twice in its own target file (once as code, once as the
  registration's own `from`) and the uniqueness check would correctly refuse it. This is the
  self-poisoning shape §7.3 warns about, met in practice.

**`scroll-writer-set.test.js` is added to the sweep's `SOURCE_TEXT_GATES`, with evidence.** It pins
14 source lines BY TEXT (the anti-rot direction the plan requires), so any mutation that edits one
makes it fail by construction. This was not reasoned — it was MEASURED: a targeted sweep of the
pre-existing mutation #93 (`browse-decouple RESTORE`) printed
`killed by: M1WRITERSET — every derived first-party vertical-scroll writer is registered …`, a false
CAUGHT on a mutant that has nothing to do with the writer-set invariant. With the exclusion in
place, its own mutant #98 is UNCAUGHT by any other test (measured), so #98 carries `benignAlone`
with that structural reason recorded at the entry. If a behaviour test ever starts catching it, the
sweep reports STALE FLAG and the excuse must be re-derived — the property that stops the flag
outliving its reason.

## 6. MUTUNIQ — the decision, recorded

**Brunel's registry-wide gate IS the registration half of this cell, and it is not duplicated.**
`test/mutation-anchors.test.js` now carries (a) a gate calling `resolveAnchor` for every registered
entry and `also` part, failing on NON-UNIQUE / STALE COUNT / OUT-OF-RANGE while leaving
`occurrences === 0` to the existing rot test, and (b) a fixture unit test driving `resolveAnchor`
against synthetic strings. Those cover MUTUNIQ's first clause completely. I wrote nothing against
them.

**The gap was the APPLIER half, and it is real.** MUTUNIQ's specification also requires that a
disambiguated entry "then applies to the intended occurrence only". `resolveAnchor` only DECIDES an
index; the substitution that must honour it lives in the CLI, and no automated test executed it.
Reverting that one line to `src.replace(from, to)` — the original defect — leaves every existing
check green: `resolveAnchor` still returns the right index, the registry gate still passes, and
every mutation silently goes back to hitting the first occurrence. Likewise the CLI's own REFUSAL
(exit 1) was proven only by a one-off manual fixture, not by anything that runs each time.

So `test/mutation-applier.test.js` closes exactly that and nothing else: it drives the REAL CLI in a
temp directory (a copy of `tools/mutate.mjs` with two fixture entries injected at the head of its
registry, plus a synthetic target under that cwd), asserting (1) a non-unique entry exits 1, names
the count, and leaves the target byte-unchanged; (2) an `occurrence: 2` entry rewrites the SECOND
site and leaves the FIRST intact; (3) `--restore` returns pristine and removes the backup. The real
registry is not polluted, so no fixture entry can be swept and reported uncaught.

**And it is what makes MUTUNIQ-a sweepable at all** — see F-C3.

## 7. What remains for Brunel (step 3)

1. **Delete `top: 0` from `#home.parked` (`css/app.css:98-103`) and KEEP `overflow: hidden`** — one
   declaration. Then remove `{ skip: SKIP }` from M1PARKRANGE's cell (drive it red, watch it green).
   §4.2's RECOMMENDATION (also deleting the byte-equal Tier-2 restatements) is optional: Tier 2
   exists so the cell passes either way. ⛔ `overflow: hidden` is NOT in that recommendation.
2. **The three-part source comment in `#home.parked` (§10 step 3):** INVARIANT P's three axes and
   why `.browsepage.parked` does not share it; that `overflow: hidden` is REQUIRED and why; and that
   `overflow: clip` is NOT a substitute, with the **cross-reference to `css/app.css:161-165`** whose
   approving `clip` argument is correct for `.app` and fatal here, plus the reciprocal pointer at
   161-165 scoping that argument to `.app`. Do not weaken the original comment.
   ⚠️ **That comment is safe to write:** the M1PARKRANGE audit strips CSS comments before parsing,
   and the `COMMENTPROOF` acceptance test locks it — a comment containing the literal words
   `top: 0` and `overflow: clip` inside the park block does not redden the cell.
3. **M2: measure the aligned clone value** against the real clone layout and set it at
   `js/swipe.js:276`, weighting the ≈46 measurement over the 53 headline. The cell accepts either
   derived candidate — `53px` (the `.app` padding contributes, so `--safe-top` cancels) or
   `calc(var(--safe-top) + 65px)` (it does not) — and rejects `46px`. Then remove M2ALIGN's skip.
   *(jsdom stores the `calc()` form verbatim on an inline style — measured — so either form is
   assertable.)*
4. **Register M2ALIGN's mutant in the same commit as the M2 fix.** It cannot be registered now:
   its `from` is the POST-FIX line, so registering it at HEAD either rots the anchors gate
   (ANCHOR NOT FOUND) or is refused as a no-op. Exact shape:
   `{ name: 'M2ALIGN: the ghost builder reverts to the vestigial in-flow 46px … (-> M2ALIGN aligned-value test)', file: 'js/swipe.js', from: "<the post-fix paddingTop line verbatim>", to: "      const lib = clone.querySelector('#library'); if (lib) lib.style.paddingTop = '46px';" }`
   Confirm uniqueness at registration (the tool now enforces it).
5. **Sweep the four post-fix-only mutants** — 95, 96, 97 and M2ALIGN's — foreground, targeted
   indices, once the suite is green. They CANNOT be swept before the fix, because a sweep needs a
   green baseline and two cells are deliberately red; that is why their verification is owed here
   rather than done. **Check 96 and 97 produce TEXTUALLY DIFFERENT reds** (ABSENT vs
   PRESENT-WITH-A-WRONG-VALUE) — that distinction is a blocking part of §7.4, and mutants `-b`/`-c`
   SURVIVING is the only structural guard against a half-built M1PARKRANGE.
6. **Confirm M1PARKRANGE does not false-catch the one other `css/app.css` mutant** (the
   `browse-decouple BROWSEFIXED` entry, which edits the `#browse` rule). By construction it should
   not: the audit locates only the `#home.parked` and `#home` blocks by exact base selector. Worth
   one sweep line to confirm, since a false caught is worse than a false uncaught.
7. **A new build number** was NOT taken on these commits (nor on the three step-1 commits). Owed at
   merge/push, not per local commit — flagged so it is not lost (F-C8).

## 8. Findings

### Against the two test artifacts the builder authored (audited as their owner)

**Both were independently re-proven able to fail — I did not accept their own proofs.**

- **F-A1 (reproduced, no defect).** The non-uniqueness refusal fires at BOTH surfaces. Rather than
  re-run the builder's temporary `#42` fixture, I reproduced it with a REAL registration: mutant
  #96's anchor was temporarily written in the plan-documented bare form
  (`overflow: hidden; pointer-events: none; z-index: 0;`). Registry gate:
  `not ok 3 … NON-UNIQUE ANCHOR for #96 [css/app.css] … `from` occurs 2 times in its target file`.
  CLI (`node tools/mutate.mjs 96`): same message + `— mutation NOT applied`, exit **1**. This also
  independently confirms §7.3's claim that the bare anchor is non-unique and that
  `.browsepage.parked` is first. Anchor restored to the `will-change`-tailed form; gate green.
- **F-A2 (reproduced, no defect).** The vendor pin fails on both axes. Corrupting the recorded hash
  to 64 `a`s and the count to 2 produced `not ok 1` (count) and `not ok 2` (hash) while the
  synthetic comparison test stayed green — confirming the two pin checks are independent. Reverted;
  `git diff` clean. **And the pin is honest, not merely self-consistent:** I computed
  `sha256(js/vendor/eruda.js)` independently — `38c12fbf…f203c36`, matching the recorded value
  exactly — and verified its stated content claims (one file in `js/vendor/`, 500,198 bytes, 2
  `scrollTop =` writes, 2 `scrollTo(` calls, no `getElementById('home')`). The failure messages push
  toward re-deriving the exclusion's reason and explicitly forbid bumping the recorded value, which
  is the right direction.
- **F-C1 — BLOCKING for the next sweep operator. A REFUSED apply STRANDS a `.mutbak`.** Measured
  during F-A1: after the refused `node tools/mutate.mjs 96`, `css/app.css.mutbak` existed while
  `css/app.css` was byte-unchanged. The CLI copies the pristine backup BEFORE `resolveAnchor` runs
  and exits without removing it. This is not harmless — the builder's log calls it "the harmless
  pristine backup": (i) the pre-commit `no-mutbak` gate BLOCKS the commit, and (ii) this project's
  standing rule reads any `*.mutbak` as *an interrupted sweep with a mutant still applied — restore
  and re-green before committing*, so a refusal now triggers a false stranded-mutant investigation.
  **Fix (Brunel's, one line):** create the backup only after every part resolves, or unlink it on
  the refusal path. `--restore` does clear it, so the workaround is known.
- **F-C2 — records accuracy in `tools/mutate.mjs`.** The uniqueness section still opens, in the
  present tense, with *"The applier below is `src.replace(from, to)`"* — false since the same commit
  made the applier index-based. That sentence is exactly what a future reader consults to decide
  what the applier does, and HEAD must hold current truth. Re-word to the past tense (it is a
  correct statement of the defect's history) or state the current form.
- **F-C3 — where the fail-proof was placed left the check uncovered by the sweep.** The uniqueness
  check's automated coverage lived entirely inside `test/mutation-anchors.test.js`, which is listed
  in `SOURCE_TEXT_GATES` and therefore excluded from the sweep. Measured consequence: before
  `test/mutation-applier.test.js` existed, mutant #101 would have reported **UNCAUGHT** — the
  tooling built to stop a mutant being credited to a cell it never reached had no sweepable
  coverage of its own. Not a defect in what was built; a gap in where the proof was put, now closed.
- **F-C4 — minor, `test/vendor-exclusion-pin.test.js`.** A file SWAP (`eruda.js` removed and another
  file added) keeps `count === 1`, so it is caught only by test 2 comparing `undefined` against the
  pinned hash — the case IS caught, but the message reads "content hash is undefined", which
  under-explains. One line closes it: assert `live.files` deep-equals `PINNED.files`.
- **F-C5 — coupling, half-closed by me.** The pin was built standalone with no consumer, so nothing
  tied it to the S1 clause it serves: deleting either side would silently orphan the other.
  M1WRITERSET's scope test now asserts the pin FILE EXISTS and that the exclusion reason POINTS at
  it. The reciprocal half — the pin naming its consumer — is a one-line comment.
- **Scoping judgment:** I would not have scoped either artifact differently. The standalone pin was
  the right call (it was ready for M1WRITERSET to reference, and M1WRITERSET now does reference
  rather than restate it), and the `resolveAnchor` fixture test asserts the right things —
  refusal, honoured disambiguation, out-of-range, stale count, natural uniqueness, and the
  NOT-FOUND/NON-UNIQUE distinction — with nothing in it that cannot fail.

### Against the plan

- **F-C6 — §7.1's mutant count under-serves MUTUNIQ's own cell specification.** The cell requires
  both a refusal AND that a disambiguated entry "applies to the intended occurrence only", and the
  single declared mutant (disabling the uniqueness check) does not exercise the second clause at
  all. Registered `MUTUNIQ-b` for it, by the same reasoning the plan itself uses for
  M1PARKRANGE's three. **So the campaign carries NINE registrations over six cells, not eight** —
  named here rather than absorbed silently, for the auditor to accept or reject.
- **F-C7 — the plan's sequencing cannot verify four of its own mutants at step 2.** A mutation sweep
  needs a green baseline, and two cells are deliberately red until step 3, so M1PARKRANGE-a/-b/-c
  and M2ALIGN's mutant are structurally un-sweepable in this step. Carried into §7 as owed work.

## 9. Reading these cells later — the repairs that are NOT admissible

- **M1PARKRANGE:** do not drop Tier 2's byte-identity condition, do not revert to a
  forbidden-property denylist, and do not move `overflow` into a permission tier. The denylist form
  could not pass on its own fix (`z-index: 0` vs `#home`'s `z-index: 20`) and missed `inset`,
  `block-size` and `margin-top`; an optional `overflow` is the executed-regressive state. In
  particular, do not "repair" a `clip` red by widening Tier 0 to *a clipping value is present* —
  that admits the killed form, and the WRONG-VALUE message says so from the message alone.
- **M1WRITERSET:** do not narrow the pattern or the file set to green a red. Dropping `scrollTo` or
  excluding `app.js` removes exactly the `scrollIntoView`-class coverage the next adversarial pass
  targets. A red means a writer appeared (register it with its reason) or one vanished (re-derive).
- **M1NOWRITE / M1NAVWINS:** do not weaken the oracle to "no NON-ZERO write". That collapses it into
  a value check and stops catching a zero-valued policy violation — a future writer touching `#home`
  harmlessly is still a SECOND writer.
- **The baseline was derived by RUNNING the derivation, not hand-written**, and it reproduces the
  plan's 14 entries and the plan reviewer's independent re-derivation exactly — a third agreeing
  derivation. Re-derive rather than hand-edit it.

## VERDICT: RED_SUITE_READY
