# Mendeleev coverage audit — Swipe/reveal Stage 6d (finalizationPlanFor.abortRender + `clobbered` retirement)

Type: coverage-audit
Target: commit `9027daf` (HEAD, working tree clean apart from the untracked Poirot casebook)
Date: 2026-07-27
Coverage Model audited: `Claude/Plans/PLAN-swipe-stage6d.md` §7 (catalog) + §8 (matrix) — cells FP, AB, CLB, RC, RGabort, RGheld, RGcommit.
Suite audited: `test/swipe-stage6d.test.js`; co-changed `test/swipe-construction.test.js`, `test/contract-function-gate.test.js`, `test/swipe-transition.test.js`, `test/mutation-anchors.test.js`, `tools/mutate.mjs`.
Runtime: node v22 at `C:/Users/nzilb/tools/node-dist/node.exe`.

## Verdict

**BARE_CELLS.** Six of the seven cells are genuinely, non-vacuously covered — verified by executing the
distinguishing mutation for each on its real channel this pass. One promised behavior of the new
production function has **no test that fails if it breaks**: the `finalizationPlanFor` unhandled-kind
**throw guard**. It is shipped production code and a stated contract promise (plan §2, EC §4.11), its
sibling `constructionPlanFor` holds the exact bar (a dedicated `assert.throws` pair + a registered
mutant), and I proved by execution that neutralizing **both** of `finalizationPlanFor`'s guards leaves
the entire swipe suite green. That is a bare cell in the FP / contract-claims dimension and it routes
back to Curie as one owed test (+ one owed registered mutant).

## Method

Every "adequate" verdict below is backed by an executed mutation that reddened the owning assertion on
its real channel, restored afterward with zero committed-file changes (all mutations were load-time
`Module._compile` / `fs.readFileSync` interceptors in the scratchpad; `git status` clean, no `.mutbak`).

## Cells confirmed ADEQUATE (executed evidence)

- **FP — the three-layer oracle.** `FP.oracle` compares production `finalizationPlanFor(c).abortRender`
  against the hand-written frozen `expectedFinalization` for all 8 STRUCTURAL_CASES; `FP.contract`
  pins exact-key + closed-enum + frozen. It is a full truth-table, so ANY mis-keying that changes any
  of the 8 outputs diverges. Registered mutant **#54** (force `abortRender:'none'`) → **caught (10
  failing)**; the plan's fracture mutation (key on `toKind==='browse'`, verified upstream by Poirot) →
  FP.oracle + both AB false cases red. Non-vacuous.
- **Contract freeze / exact-key.** Stripping `Object.freeze` from the return → `contract-function-gate`
  §14 **and** `FP.contract` both red (executed). Exact-key `{abortRender}` is pinned. Adequate — *except
  the throw path* (bare cell below).
- **CLB — source-text retirement sweep.** Labeled SOURCE_TEXT (§4.10), honestly distinct from
  behavioral cells; sweeps `js/app.js` + `js/swipe.js` for `sourceWasClobbered`/`.clobbered`/`clobbered:`.
  RED @HEAD before the build (10 occurrences), green after. Reintroducing any read reddens it. Adequate.
- **AB — the abort re-render on the real DOM, incl. the rewired non-vacuity.** Curie's first draft used a
  "no `Browse.render`" assertion for the false cases, which is **vacuous** (a wrongly-`'rerender'`
  overlay/home abort re-renders `currentDesc()` — an overlay / `#home` — and `Browse.render` fires only
  for a browse dest). The rewire to the held-reveal `holds` delta (`holdGhostUntilPaintable` is the sole
  emitter of a `FLASH`/`hold` line, called only from the two held branches) **does** observe the
  decision: the held branch at `app.js:1160` is entered iff `cur.finPlan.abortRender==='rerender'`, so a
  false case flipped to `'rerender'` emits a `hold` line. Verified: mutant #54 + M3 redden `AB.clobber`
  (true case); the compute-branch keying reddens both false cases (Curie M1, Poirot key-on-toKind). The
  rewire is correct and there is no vacuous sibling remaining. Adequate.
- **RC — the supersession-recovery boundary (three points).** The new ARMED point is `RC.armed`. I
  executed the plan's distinguishing mutation ("drop `cur.live`") via an `fs.readFileSync` interceptor
  that stripped `cur.live && ` from the recovery reader (`app.js:417`) at harness load: **`RC.armed`
  FAILS with `recovery renders=["authors"]`** — the spurious ARMED re-render the conjunct exists to
  prevent. The other two boundary points are owned and reconciled by reference, both confirmed present:
  dragging/built browse→browse render-TRUE = `swipe-invariants.test.js:384` (mutant #16 → caught, 3
  failing); overlay→browse render-FALSE = `swipe-stage6.test.js:114` (NC). Non-vacuous.
- **RGabort / RGheld / RGcommit.** Parity guards owned by shipped suites (I7 scroll restore; the
  commit→home held-reveal + reveal-timing tests; the commit fixtures). Flash surface untouched
  (Poirot read `app.js:1146–1191`; the diff moves only the branch-selector VALUE). Adequate as
  regression pins.

## BARE CELL

### BC-1 — `finalizationPlanFor` unhandled-kind throw guard: no test fails if it breaks

- **Promised behavior.** `finalizationPlanFor` THROWS on an unhandled `fromKind` OR `toKind`
  (`js/swipe.js:162–171`). The plan makes this an explicit contract term — §2: *"No default branch — an
  unhandled kind THROWS, mirroring constructionPlanFor's own-contract guard"* — and EC §4.11 requires
  every exported pure function to *"reject impossible combinations"* and *"satisfy its own contract when
  called directly."* Poirot's own coverage ledger marks it `~` (read-reasoned, **not executed**).
- **Why no test catches its break (executed).** Every test that calls `finalizationPlanFor` — `FP.contract`,
  `FP.oracle`, `contract-function-gate` §14, and all harness-driven AB/RC paths — feeds only VALID kinds.
  Making **both** guards inert (replacing each `throw` with `void 0`, via a `Module._compile` interceptor,
  `constructionPlanFor`'s guards untouched) leaves the whole swipe suite green:
  `swipe-stage6d + swipe-transition + contract-function-gate + swipe-construction + mutation-anchors`
  → **37 tests, 37 pass, 0 fail**. No assertion observes the guard.
- **Rigor asymmetry that proves it is owed.** The sibling `constructionPlanFor` has the identical dual
  guard AND both instruments: a dedicated `assert.throws` pair — `swipe-transition.test.js:194–198`
  (`/unhandled source kind/`, `/unhandled destination kind/`) — and a registered mutant, `tools/mutate.mjs`
  "swipe4 F6" (`if (false && KINDS.indexOf(c.fromKind) === -1)`). Stage 6d added `finalizationPlanFor`'s
  guard as a deliberate mirror but shipped **neither** the throw test nor a mutant. The `.227`
  garbage-fromKind lesson is exactly why the sibling guard is held to this bar.
- **What is owed (routes to Curie).**
  1. A throw test mirroring `swipe-transition.test.js:194–198`:
     `assert.throws(() => Swipe.finalizationPlanFor({ fromKind:'nonsense', toKind:'browse', decorations:[] }), /unhandled source kind/)`
     and its `toKind` twin (`{ fromKind:'browse', toKind:'nonsense' }`, `/unhandled destination kind/`).
     Natural home: the FP block of `test/swipe-stage6d.test.js`, or `swipe-transition.test.js` beside the
     `constructionPlanFor` throw test.
  2. A registered `tools/mutate.mjs` mutant per guard (the "swipe4 F6" shape:
     `if (false && KINDS.indexOf(c.fromKind) === -1)` and the `toKind` twin), so the mutation is runnable
     in repository tooling (§4.10) and the sweep proves the new test reddens.
- **Severity — real but low blast radius today.** On currently reachable inputs the nav stack is
  well-formed by construction (Poirot O1), so a dropped guard changes no user-visible behavior now. The
  gap is that a stated §4.11 own-contract promise on shipped production code has zero executable proof,
  while the project holds its exact sibling to a tested+mutated bar. This converts Poirot's honest `~`
  into a filed, specified test rather than an untested assertion.

## Observation (covered — not a bare cell)

- **OB-1 — RC.armed's `cur.live` discriminator has no *registered* mutant.** The behavior IS covered: the
  committed `RC.armed` test reddens when `cur.live` is dropped (executed above). But the distinguishing
  mutation lives only as an ad-hoc interceptor (Curie's temporary edit, Poirot's fs-interceptor, and this
  audit's), not in `tools/mutate.mjs`, so the mutation-sweep will not independently exercise it. Poirot's
  Prediction flags this conjunct as *"a parity subtlety a later refactor can silently drop."* Not a bare
  cell (a test fails if it breaks), but registering the drop-`cur.live` mutant alongside BC-1's guard
  mutants would close the §4.10 tooling loop for the same new code. Recommend folding into BC-1's
  remediation.

## Cross-check of the mandate's named hazards

- Vacuous assertions — the one Curie caught (AB "no Browse.render") is correctly rewired to the held-reveal
  discriminator, verified observing the decision; no vacuous sibling remains.
- Boundary completeness (RC three points) — all three pinned; the ARMED one driven through the real
  `begin()` recovery path and executed-red on the `cur.live` drop.
- Parity coverage at both finalize sites and the recovery site — true/false cases pinned at the finalize
  sites (AB) and the recovery site (RC.armed + I11/I20 + NC); no reachable (transition × read-site) flip
  is unguarded except the throw path (BC-1).
- Mutation adequacy — #54 and #16 caught (executed); #54 correctly re-points the retired F6 anchor. The
  only plausible mutation to the new code that no test catches is the throw guard (BC-1); the freeze and
  every keying mutation are caught.
- CLB — genuinely fails on a reintroduced read; honestly labeled source-text, distinct from behavioral.

## RE-AUDIT — BC-1 remediation (2026-07-27, target `9027daf` + Curie working-tree closure)

Curie closed BC-1 and OB-1 as pure coverage/tooling: **`js/` is byte-identical to `9027daf`**
(`git diff --stat 9027daf -- js/` empty — production unchanged, Poirot SHIP stands). Changed only
`test/swipe-transition.test.js` (one throw test) and `tools/mutate.mjs` (three mutants #66/#67/#68).

Verified by execution (restored after; `js/` empty-diff vs `9027daf`, no `.mutbak`):

- **(a) Full suite green.** `node --test "test/*.test.js"` → **713 tests, 712 pass, 0 fail, 1 skip** (the
  device-only KEEPER). The count is +1 vs the pre-remediation baseline — the new throw test.
- **(b) Each new mutant CAUGHT, reddening the INTENDED test — not merely some test.**
  `node tools/mutation-sweep.mjs 66 67 68` → all three **caught, each with exactly 1 failing test**
  (`0 uncaught, 0 unapplied, 0 stale flags`). Isolated per index:
  - **#66** (`swipe6d BC-1a`, fromKind guard inert) applied → `finalizationPlanFor throws on an unhandled
    source kind…` **FAILS**, and the sibling `constructionPlanFor throws on an unhandled source kind…`
    **still PASSES**.
  - **#67** (`swipe6d BC-1b`, toKind guard inert) applied → the same `finalizationPlanFor` throw test
    **FAILS** (on its destination-kind assertion), sibling **still PASSES**. The single throw test pins
    BOTH guards; #66 isolates the source guard, #67 the destination guard.
  - **#68** (`swipe6d RC`, drops `cur.live &&`) applied → **`RC.armed` FAILS** with the exact
    `recovery renders=["authors"]` spurious ARMED re-render. Right reason.
- **(c) Anchors target `finalizationPlanFor`, not the byte-identical sibling.** #66/#67 are registered
  `file: 'js/swipe.js'` and anchor on the UNIQUE throw lines (each literal string contains
  `Swipe.finalizationPlanFor`), so they structurally cannot match `constructionPlanFor`'s guard — and
  the (b) executions confirm it: under each mutant the sibling throw test stays green. #68 (`js/app.js`)
  anchors on the unique recovery-reader line. `mutation-anchors`/sweep report 0 stale, 0 unapplied — every
  anchor resolves to current source.

**BC-1 and OB-1 are genuinely closed.** The unhandled-kind guard now has both a throw test and per-guard
registered mutants (§4.10 tooling loop closed); the `cur.live` conjunct now has registered mutant #68
alongside the committed `RC.armed` test. No production behavior changed. No new bare cell appeared — the
remediation adds only tests/mutants, and each was executed-red for the right reason on the right function.

**Re-audit verdict: ADEQUATE.**

---

{"persona":"mendeleev","stage":"6d","verdict":"ADEQUATE","target":"9027daf+bc1","artifact":"Claude/Mendeleev/AUDIT-swipe-stage6d.md","bare_cells":[],"return_to":"zelda"}
