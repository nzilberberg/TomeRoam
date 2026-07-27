# RED suite — Swipe Stage 6d (finalizationPlanFor.abortRender + `clobbered` retirement)

Date: 2026-07-27
Author: Curie (test design)
Plan: `Claude/Plans/PLAN-swipe-stage6d.md` (FORGE'd by Charpy, HELD_STONE by Loki), §7 Coverage Model + §8 matrix.
Grounded against shipped HEAD (Stage 6c baseline).
New test file: `test/swipe-stage6d.test.js` (7 tests).
Handoff: → Brunel (green) and Mendeleev (audit). Not committed (per assignment).
Verdict: **RED_SUITE_READY** (initial suite + BC-1 remediation; Mendeleev re-audit ADEQUATE).

## 1. What this slice is (why most cells are parity)

Stage 6d moves the abort/recovery re-render DECISION from a runtime byproduct
(`sourceWasClobbered = resolveSource() === hostEl`, stored as `d.clobbered`) to a pure declared
`finalizationPlanFor(classification).abortRender` (`'rerender'` iff `fromKind==='browse' &&
toKind==='browse'`), computed at ARM time. Per plan §3 and §4.19 the user-visible behaviour is
**byte-identical on every reachable transition** — a behaviour-preserving extraction.

That classification is load-bearing for the red suite: only the two cells that assert a NON-behavioural
fact fail against HEAD, and they are what make the suite red-first.

- **FP** and **CLB** are RED @HEAD (substantive): the declared function does not exist; the byproduct
  identifiers are still present.
- **AB** and **RC** assert PARITY behaviour, so they are GREEN @HEAD and RED only under their §8
  mutations. Each is mutation-verified below, so every cell is capable of failing per the
  `tests-must-be-able-to-fail` law.

**Advisory to Brunel/dispatcher (EC §2/§9 conflict surfaced, not silently resolved).** The invocation
grouped AB and RC as "must be RED at HEAD". That is over-specified relative to the plan's own
byte-identical-parity classification: a behavioural cell cannot honestly be red at HEAD when the
behaviour does not change. Forcing AB/RC red at HEAD would require either a consistency oracle (which
cannot see wrong-but-deterministic — Curie's dimension-10 rule) or an assertion of a behaviour change
the plan says does not happen. They are therefore authored as parity feature oracles (green @HEAD,
mutation-red), and the SUITE is red-first via FP+CLB. This is the correct realization of the model.

## 2. Cell → test map

| Cell | Test (`test/swipe-stage6d.test.js`) | Channel | @HEAD | Mutation that reddens it |
|---|---|---|---|---|
| FP | `FP.contract` + `FP.oracle` | three-layer oracle: production `finalizationPlanFor` vs frozen `expectedFinalization` (spec `test/fixtures/swipe-plan-spec.mjs`) | **RED** (function absent) | key abortRender on `toKind==='browse'` / flip a case → diverges from the hand-written spec |
| CLB | `CLB [SOURCE_TEXT]` | source sweep of `js/app.js` + `js/swipe.js` for `sourceWasClobbered`/`.clobbered`/`clobbered:` (EC §4.10, labelled SOURCE_TEXT — not behavioural) | **RED** (10 occurrences present) | reintroduce any `clobbered`/`sourceWasClobbered` read |
| AB | `AB.clobber`, `AB.noclobber-overlay`, `AB.noclobber-home` | REAL `h.touch` abort → `Browse.render` on `#browse`, the held-reveal `FLASH/hold` line, `window.scrollTo` | GREEN (parity) | see M1/M3 below |
| RC | `RC.armed` | REAL `h.touch` supersession recovery → `Browse.render` on `#browse` | GREEN (parity) | see M2 below |
| RGabort / RGheld / RGcommit | reconciled by reference (block at end of file) | existing suites | GREEN | — |

Notes on the observable choices (honesty):
- **FP** fails as a clean ASSERTION (`typeof Swipe.finalizationPlanFor === 'function'`), not a TypeError
  from calling `undefined` — the "right reason" required.
- **AB false cases** do NOT key on `Browse.render`: a wrongly-`'rerender'` overlay→browse or home→browse
  abort re-renders `currentDesc()` (the SOURCE — an overlay / `#home`), and `Browse.render` fires only
  for a browse-screen dest, so a bare "no Browse.render" assertion is VACUOUS there. The load-bearing
  discriminator is the HELD-reveal branch: `holdGhostUntilPaintable` is the ONLY emitter of a
  `PBDebug 'FLASH' / 'hold …'` line and is called from exactly the two held branches. A false-case abort
  must add ZERO `hold` lines (measured as a delta, because a `commit→home` setup swipe holds too). This
  was a real defect caught and fixed during authoring — the first draft's `Browse.render`-count
  assertion for the false cases was inert.
- **AB browse→browse (true)** keys on `Browse.render('authors')` in finalize (source re-render) plus a
  `hold` delta.
- **RC.armed** keys on `Browse.render`: an armed browse→browse's `currentDesc()` IS a browse screen
  (Authors), so a wrongly-true recovery render fires `Browse.render` — a valid discriminator here.

## 3. Exact RED run output @HEAD

`node --test test/swipe-stage6d.test.js` (7 tests; 4 pass, 3 fail):

```
not ok 1 - FP.contract — finalizationPlanFor returns the exact-key, frozen, closed-enum { abortRender } contract
    AssertionError: js/swipe.js must export finalizationPlanFor (the declared abort decision) — RED @HEAD until stage 6d builds it
      (typeof Swipe.finalizationPlanFor === 'undefined' !== 'function')
not ok 2 - FP.oracle — production finalizationPlanFor.abortRender equals the frozen expectedFinalization for all 8 structural cases
    AssertionError: js/swipe.js must export finalizationPlanFor — RED @HEAD until stage 6d builds it
not ok 3 - CLB [SOURCE_TEXT] — the clobbered/sourceWasClobbered byproduct no longer exists in js/app.js or js/swipe.js
    AssertionError: ... Still present:
      js/app.js: "sourceWasClobbered" @35842
      js/app.js: ".clobbered" @27160   (415 recovery reader)
      js/app.js: ".clobbered" @29173   (516 set)
      js/app.js: ".clobbered" @35827   (516 read of c.sourceWasClobbered site)
      js/app.js: ".clobbered" @81329   (1159 held abort selector)
      js/app.js: ".clobbered" @82988   (1185 no-pane abort render arg)
      js/app.js: "clobbered:" @30816   (439 session literal init)
      js/swipe.js: "sourceWasClobbered" @19380 / @19994 / @21193
ok 4 - AB.clobber ...
ok 5 - AB.noclobber-overlay ...
ok 6 - AB.noclobber-home ...
ok 7 - RC.armed ...
```

Why each RED is the right reason:
- **FP.contract / FP.oracle** — a clean assertion that the exported function exists fails first;
  `finalizationPlanFor` is genuinely not in `js/swipe.js`'s public surface at HEAD
  (`exports = [classifyTransition, constructionPlanFor, buildConstruction, BROWSE_FAMILY]`). Not a
  syntax/import error, not a TypeError.
- **CLB** — a return-value assertion (`deepEqual(hits, [])`); the byproduct identifiers are present at
  the exact sites the plan retires (439/516/415/1159/1185 in app.js, buildConstruction in swipe.js).

## 4. Mutation verification (AB/RC are capable of failing)

Each parity cell was verified by temporarily mutating HEAD's `clobbered` mechanism, running, and
restoring `js/app.js` with `git checkout` (working tree confirmed clean afterwards). Every mutation
reddened exactly the intended assertion on its real channel:

| Mutation (temporary, on `js/app.js`) | Proxy for the §8 mutation | Result |
|---|---|---|
| M1: `d.clobbered = c.sourceWasClobbered` → `= true` (516) | abort/recovery decision forced `'rerender'` (compute-branch keying) | `AB.noclobber-overlay` + `AB.noclobber-home` **RED** (wrongly take the held branch → `hold` delta ≥ 1); `AB.clobber`/`RC.armed` stay green |
| M3: `d.clobbered = …` → `= false` (516) | browse→browse wrongly `'none'` | `AB.clobber` **RED** (no `Browse.render('authors')`, no `hold`); others green |
| M2: recovery reader (415) `render: cur ? cur.clobbered : false` → `cur ? true : false` | "drop `cur.live`" — armed recovery wrongly renders | `RC.armed` **RED** (`Browse.render('authors')` fires on the armed recovery); others green |

M1 leaving `RC.armed` green is itself informative: the armed session never runs `start()`, so the 516
set does not affect it — which is exactly the boundary the plan's `cur.live` conjunct protects, and why
RC needs its own recovery-reader mutation (M2).

## 5. Regression cells GREEN @HEAD (parity guards, reconciled by reference)

The parity-regression cells are the existing shipped tests; they stay green through the byproduct
retirement (byte-identical behaviour) and are NOT duplicated (one owner per cell). Confirmed green:

`node --test` over `swipe-invariants`, `swipe-stage6`, `swipe-stage5-residuals`, `swipe-construction`,
`swipe-transition`, `mutation-anchors`, `contract-function-gate` → **62 pass, 0 fail, 1 skip**
(the device-only Loki KEEPER). Meta-gates `no-silent-coverage-exit-gate` + `policy-ledger-gate` → 4 pass.

- **RGabort** = `swipe-invariants.test.js` I7 (aborted browse→browse scroll restore) + AB.* (abort
  re-render outcome on the real DOM).
- **RGheld** = the held-reveal choreography — `swipe-stage5-residuals.test.js` F1a-L3 (commit→home held
  pane) and the reveal hold/drop timing tests. 6d touches only the abort RENDER-FLAG derivation, never
  reveal TIMING or hold/drop control flow (the flash surface is untouched — plan §2/§10).
- **RGcommit** = commit finalization (destination screen + scroll) unchanged; guarded by the existing
  commit fixtures.
- **RC boundary reconciliation** — the other two RC boundary points are already owned and stay green:
  the DRAGGING/built browse→browse render-TRUE by `swipe-invariants.test.js` I11/I20, the overlay→browse
  render-FALSE by `swipe-stage6.test.js` NC. RC.armed is the NEW boundary (no prior owner).

## 6. Scope boundaries respected (NOT authored here — Brunel's in-slice co-changes)

Per the plan §2/§9 and the assignment (write the NEW red cells; leave the mechanical re-point/regenerate
to Brunel), this suite does NOT touch:
- `test/swipe-construction.test.js` CONSTRUCTION_KEYS (four keys → three) or the F6 test deletion.
- `tools/mutate.mjs` anchor re-pointing (five anchors) or `test/mutation-anchors.test.js`.
- `tools/gen-swipe-model.mjs` mirror + `docs/swipe-model.generated.txt` regeneration + the fingerprint
  pin in `test/swipe-model.test.js`.
- `test/fixtures/swipe-plan-spec.mjs` header caveat removal (records reconciliation, applied on approval).
- `test/contract-function-gate.test.js` registration of `finalizationPlanFor` (Brunel adds it as a
  CONTRACT entry; FP independently checks the same contract here).

CLB asserts the source-text ABSENCE of the identifiers; it does not pre-edit any of the above artifacts,
so it does not hide Brunel's build.

## 7. Model gaps

None. Every applicable §7/§8 cell is realized with a red test or a referenced regression guard. The
Coverage Model was sufficient to author every assertion; no cell was too vague to bind to a real
observable channel.

## 8. BC-1 remediation (2026-07-27, post-Mendeleev audit at HEAD 9027daf)

Mendeleev's audit of the shipped Stage 6d suite returned BARE_CELLS with one gap: the new
`finalizationPlanFor` unhandled-kind throw guards (`js/swipe.js` finalizationPlanFor, the two
`KINDS.indexOf(...) === -1` blocks) were untested — making BOTH guards inert left the whole swipe
suite green (37/37). The sibling `constructionPlanFor` guards have both an `assert.throws` pair and a
registered mutant (`swipe4 F6`); the mirrored 6d guard shipped neither. Production code is CORRECT and
UNCHANGED — this is a pure coverage/tooling closure. No `js/**` was touched.

### New test (1)
- `test/swipe-transition.test.js` — `finalizationPlanFor throws on an unhandled source kind and on an
  unhandled destination kind`. Two `assert.throws` (fromKind, toKind), mirroring the constructionPlanFor
  sibling immediately above it (same file, same convention). PASSES at HEAD (the guards exist).

### New registered mutants (3), `tools/mutate.mjs`
Anchored on the UNIQUE throw line, not the bare `if (KINDS.indexOf(c.fromKind) === -1) {` — that
statement is byte-identical to constructionPlanFor's own guard, so a bare-line anchor would mutate the
wrong function (first-match `replace`). Each `void 0`'s the guard body (same shape as `swipe4 F3`), so
an unhandled kind falls through to the abortRender ternary and silently answers `'none'`.

| idx | mutant | reddens |
|---|---|---|
| 66 | `swipe6d BC-1a` — finalizationPlanFor no longer throws on an unhandled fromKind (`js/swipe.js`) | the new throw test |
| 67 | `swipe6d BC-1b` — finalizationPlanFor no longer throws on an unhandled toKind (`js/swipe.js`) | the new throw test |
| 68 | `swipe6d RC` — recovery reader drops the `cur.live` build-ran conjunct (`js/app.js:417`) | `RC.armed` (committed) |

Mutant 68 closes the §4.10 tooling loop for the RC.armed cell: the test already caught the dropped
`cur.live`, but no registered mutant recorded it. Dropping `cur.live &&` makes an ARMED (pre-lock,
never-built) browse→browse recovery read `finPlan.abortRender` directly (`'rerender'`) and wrongly
re-render `#browse`; a DRAGGING/overlay supersession is unchanged (`cur.live` true / `abortRender`
`'none'`), so only RC.armed reddens.

### Verification (executed, restored)
- Full suite: `node --test test/*.test.js` → **713 tests, 712 pass, 0 fail, 1 skip** (device-only KEEPER).
- `test/mutation-anchors.test.js` green — all three new anchors match the source.
- Per-index sweep (synchronous, not backgrounded): `node tools/mutation-sweep.mjs 66 67 68` →
  ```
  #66  caught (1 failing) — swipe6d BC-1a: finalizationPlanFor no longer throws on an unhandled fromKind
  #67  caught (1 failing) — swipe6d BC-1b: finalizationPlanFor no longer throws on an unhandled toKind
  #68  caught (1 failing) — swipe6d RC: recovery reader drops the cur.live build-ran conjunct
  swept 3: 0 uncaught, 0 unapplied, 0 stale flags
  ```
- `node tools/mutate.mjs --restore` → no `js/*.mutbak` / `test/*.mutbak` remain; `git status js/` clean
  (no production code touched). Working-tree changes: `test/swipe-transition.test.js`, `tools/mutate.mjs`.
