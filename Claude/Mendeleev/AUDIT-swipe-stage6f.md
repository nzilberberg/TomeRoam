# Mendeleev — coverage audit, Stage 6f (in-flow→overlay outgoing → app-ghost)

Type: coverage-audit
Target: build `54a4d27` (SHIP'd by Poirot `POIROT-swipe-stage6f-54a4d27.md`); audited at working HEAD
`2df6bd0`, which adds only Poirot's review casebook on top of `54a4d27` — production and test code
are byte-identical to the SHIP'd artifact (`git diff 54a4d27 2df6bd0` touches only a `.md`).
Coverage Model: `Claude/Plans/PLAN-swipe-stage6f.md` §7/§8 (cells SIbrowse, SIhome, GHOST, REVEAL, DEC,
MODEL). Suite: `test/swipe-stage6f.test.js` (9 tests). Curie map: `Claude/Curie/RED-swipe-stage6f.md`.
Date: 2026-07-27. Auditor: Mendeleev (read-only + test/mutant execution). Node: `C:\Users\nzilb\tools\node-dist\node.exe`.

`Verdict: **ADEQUATE**`

Every Coverage-Model cell is non-vacuously covered on a real observable channel, and every cell has a
registered, sweep-runnable mutant that reddens the intended cell by execution. Two coverage-hygiene
observations are recorded below; neither is a bare cell (each concerns the mutation-sweep mechanism, not
a missing test — the behavior in question reddens under a real break in CI).

---

## 1. Executed evidence

All runs synchronous, by index; working tree restored after each; final `git diff` empty, no `*.mutbak`.

- **[E1]** `node tools/mutation-sweep.mjs 77 78 38` → `swept 3: 0 uncaught, 0 unapplied, 0 stale flags`
  (#77 caught 7 failing, #78 caught 3, #38 caught 3).
- **[E2]** `node tools/mutate.mjs 77` + `node --test test/swipe-stage6f.test.js test/swipe-transition.test.js`
  → reddens exactly: SIbrowse, SIhome, GHOST-commit, GHOST-abort, MODEL (5 of the 6f cells) **plus** the two
  `swipe-transition` oracle tests ("every ordered registry pair yields exactly the construction plan the spec
  fixes"; "the named modifier cases hold"). 7 total = the sweep count. `--restore` → clean.
- **[E3]** `node tools/mutate.mjs 78` + `node --test test/swipe-stage6f.test.js` → reddens **only REVEAL**
  (test 7); SIbrowse/SIhome/GHOST×2/MODEL/DEC and both REVEAL-adjacent controls stay green. `--restore` → clean.
- **[E4]** `node tools/mutate.mjs 38` + `node --test test/swipe-stage6f.test.js` → reddens **only DEC**
  (test 9); all other cells green. `--restore` → clean.
- **[E5]** Manual over-broaden probe — `constructionPlanFor` outgoing forced to `'app-ghost'` for every
  non-overlay source (i.e. in-flow→home wrongly ghosts): reddens the MODEL over-broaden guard, the
  `swipe-transition` frozen-spec oracle, and a frozen-plan assertion. Restored via `git checkout`.
- **[E6]** Manual `:85`-predicate revert probe — `transition-matrix.test.js:85` reverted to the pre-6f rule
  (`c.to === 'browse'`) while the spec stays at the 6f values: the swept behaviour set (which **excludes**
  `transition-matrix.test.js`) catches nothing; `transition-matrix.test.js` itself reddens ("the frozen spec
  builds a pane exactly when the GHOST/SNAPSHOT rules say"). Restored via `git checkout`.

---

## 2. Cell-by-cell adequacy

| Cell | Channel | Registered mutant → reddens intended cell | Non-vacuity |
|---|---|---|---|
| SIbrowse | real DOM `#browse.style.transform` mid-drag via `h.touch` (real browse→overlay gesture) | #77 [E1,E2] | RED-first @HEAD + fixture-sanity guard (`starts===1`); independently pinned (drives `#browse` only) |
| SIhome | real DOM `#home.style.transform` mid-drag (real home→overlay gesture) | #77 [E1,E2] | RED-first @HEAD + `#home` not-`.parked` guard; independently pinned (drives `#home` only) |
| GHOST | real DOM `.nav-ghost` present during drag, disposed once on commit AND abort | #77 [E1,E2] | RED-first @HEAD (0 pane); during-drag RED folds the disposal so no vacuous green |
| MODEL | production `constructionPlanFor` over all 35 in-flow×overlay pairs + over-broaden guard | #77 [E1,E2]; over-broaden [E5] | 35-pair enumeration is the finest defender; both directions redden |
| REVEAL | real DOM `.nav-ghost` at finalize under `deferRaf` (no-hold vs shipped-hold) | #78 [E1,E3] | dedicated single-cell mutant + shipped-hold non-vacuity control (browse→browse abort) |
| DEC | real DOM `.np-pill-float` mid-drag (real browse→nowplaying gesture) | #38 [E1,E4] | dedicated single-cell mutant; decoration path orthogonal to the outgoing branch |

**Does ONE revert mutant (#77) adequately defend FOUR distinct cells?** Yes, and each cell is *additionally*
pinned at a finer grain than #77 alone:
- **SIbrowse vs SIhome are genuinely distinct and independently pinned.** SIbrowse drives a real
  browse→overlay gesture and reads `#browse`; SIhome drives a real home→overlay gesture and reads `#home`.
  A build that fixed only one source would fail the other's cell — a browse-only fix leaves SIhome red, a
  home-only fix leaves SIbrowse red. Confirmed by construction: the two tests read different real elements
  reached through different sources.
- **A narrower classification break than #77's full revert does not slip through.** MODEL asserts `app-ghost`
  over all five in-flow families × seven overlays (35 pairs), so a single-pair break (e.g. `authorBooks→diagnostics`
  wrongly `real-source`) reddens MODEL even where the two live SI cells — which drive `books→options` and
  `home→options` specifically — would not. The over-broaden direction (a distinct mis-classification #77's
  revert cannot produce) is caught by the MODEL over-broaden guard and the `swipe-transition` oracle [E5].
- **GHOST** is the owned-pane axis (`.nav-ghost` presence/disposal), reddened by #77 because reverting to
  `real-source` builds no pane.

**MODEL / three-layer oracle** — catches both required divergences: production-vs-spec divergence reddens
`swipe-transition` (registered mutant #77 [E2]); production-vs-predicate divergence reddens the 6f MODEL cell
(production-vs-literal, #77). The `transition-matrix.test.js:85` spec-self-consistency predicate co-change
reddens when reverted [E6] — covered by a CI test, so not bare (see §3, Obs-1 for the sweep-hygiene note).

**Device-only residuals correctly unclaimed.** The inset-overlay visual no-peek (plan T3) and the
ghost-teardown compositor flash (Loki's parting observation) are marked device-only/downstream in plan §7
and §9, and NO cell claims them: the suite header states "NOTHING here speaks to the visual flash — device-only
and downstream," and the §7 "Flash (visual, device)" row is "explicitly not a CI cell." No vacuous coverage
claim exists. Correct.

---

## 3. Coverage-hygiene observations (NOT bare cells — routed, non-blocking)

These do not gate the stage: in each case a real break reddens a test that runs in CI's `node --test test/*.test.js`.
They concern the mutation-sweep mechanism (the runnable-non-vacuity proof), which is the recurring 6d/6e
pattern worth naming before it recurs.

- **Obs-1 — the `SOURCE_TEXT_GATES` exclusion for `transition-matrix.test.js` is stale, and it suppresses the
  `:85` spec-self-consistency predicate from the sweep.** `tools/mutation-sweep.mjs` excludes the file with the
  reason "fingerprints the js/app.js transition-branch region." That mirror was **retired at stage 4** — the
  file documents this itself (lines 42-47) and now holds only the committed-inventory match, the settings-sub
  derivation, and the `:85` spec-self-consistency predicate. None of those fail "by construction" under a
  production mutation, so the original rationale is void. Consequence: no registered mutant exercises the `:85`
  predicate (or the committed-inventory test) through the sweep; its non-vacuity is proven only by [E6] here,
  not by repository tooling. Not a bare cell (a `:85` revert reddens `transition-matrix.test.js` in CI [E6]),
  but the sweep-side rationale should be corrected and the exclusion re-evaluated (removing it appears safe —
  a production mutation leaves all three tests green, so no false-CAUGHT — and would let the sweep exercise
  spec-side drift against the self-consistency predicate). Route: Curie / mutation-sweep tooling. Overlaps the
  Poirot watch-list W12 pattern (an assertion with no registered single-site mutant).

- **Obs-2 — the three-layer oracle's SPEC-side non-vacuity is not proven by a registered mutant.** #77 proves
  the oracle reddens on a PRODUCTION drift (production diverges from the frozen spec). A drift on the SPEC side
  (a typo in an `expectedConstruction.outgoing` value) also reddens `swipe-transition` — but no registered
  mutant corrupts a spec `outgoing` value to demonstrate that half runnably; it is proven only by the HEAD
  red-first record and [E5]/[E6] here. Minor completeness note under EC §4.10 ("evidence must be runnable in
  tooling"): the primary oracle direction (production drift) is covered by #77; the spec-side is the same
  W12-class gap. Route: Curie / Mendeleev-catalog — a registered spec-`outgoing` mutant would close it.

---

## 4. Records reconciliation

No records edits made by this audit (read-only + test/mutant execution only). The stage's apply-on-approval
records remain Poirot's W13 (owner Zelda) and the device pass W14 — unchanged by this audit.

`Verdict: **ADEQUATE**`

{"persona":"mendeleev","stage":"6f","verdict":"ADEQUATE","target":"54a4d27","artifact":"Claude/Mendeleev/AUDIT-swipe-stage6f.md","bare_cells":[],"return_to":"curie"}
