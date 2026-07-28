# Coverage audit — Swipe/reveal Stage 6g (`#home` permanent compositing layer)

Type: coverage-audit (publish gate)

Target: production HEAD `5cc0f14` ("Stage 6g BUILD_GREEN: #home { transform: translateZ(0) }").
Plan: `Claude/Plans/PLAN-swipe-stage6g.md` (Coverage Model §7; matrix §8 — two cells: PROMO, REVEAL).
Red suite: `Claude/Curie/RED-swipe-stage6g.md`. Audited independently of Poirot's parallel code review.

`Verdict: **ADEQUATE**` (after remediation — see §5 Re-audit). The original publish-gate audit against
`5cc0f14` returned **BARE_CELLS** (§1–§4 below, kept as the record of the finding); Brunel's applied fix
closed it, confirmed by execution in §5.

---

## 1. Verdict

**BARE_CELLS — one Structural finding, on PROMO's Mutation-cases dimension.**

Both cell *assertions* are non-vacuously live and were verified RED by execution:
- **PROMO** (`test/home-layer-invariant.test.js`) reddens on a real channel (the source text of
  `css/app.css`) when the base `#home` transform is neutralised — confirmed by executing mutant #79.
- **REVEAL** (`test/swipe-stage6g.test.js`) reddens on a real channel (the live DOM `.parked`
  class-state of `#home` through the app-harness) — confirmed by executing mutant #80, correctly
  anchored at the effective un-park site `js/nav.js` `setView:57`.

The verdict is BARE_CELLS because PROMO's **§4.10 mutation-verification mechanization is broken**, not
because the css behaviour is untested. The registered PROMO mutant (`tools/mutate.mjs` #79) is filed in
the **behavioural** sweep, whose sole defender for that cell is deliberately **excluded**
(`SOURCE_TEXT_GATES`). Executed result:

```
node tools/mutation-sweep.mjs 79 80
#79  UNCAUGHT  <-- no test fails  — stage6g PROMO [SOURCE_TEXT] ...
#80  caught (3 failing) — stage6g REVEAL ...
swept 2: 1 uncaught ... exit 1
```

So the plan §8 promise — "each [cell] names a mutation that reddens it on a real channel" as the
coverage mechanism — is not delivered for PROMO by execution, and the misfiling additionally **breaks
the CI mutation-sweep job** (#79 lands in shard `79 % 8 = 7`; that shard applies #79, sees the
behavioural suite stay green, reports UNCAUGHT, and exits 1). This is the exact recurring §4.10 gap the
prior stages (6d BC-1, 6e Mutation-cases remediation) were charged to close: a load-bearing assertion
whose registered mutant is not sweep-runnable-to-CAUGHT.

`npm test` (CI `test` job) is unaffected and green — PROMO's assertion runs there and defends the css
against an ordinary human edit. The break is confined to the `mutation-sweep` CI job and to the §4.10
"registered, sweep-runnable mutant" deliverable.

## 2. Matrix summary

| Cell | Channel | Assertion live in `npm test`? | Registered mutant reddens it, by execution? | Status |
|---|---|---|---|---|
| PROMO | `css/app.css` source text (`test/home-layer-invariant.test.js`) | Yes (verified: base+cascade RED on `none`; parse-sanity + parked stay green) | **No** — #79 UNCAUGHT in the sweep; not present in the source-text sweep (`tools/source-gate-sweep.mjs`) | **BARE (Mutation-cases)** |
| REVEAL | live DOM `.parked` class-state (`test/swipe-stage6g.test.js`, app-harness) | Yes | Yes — #80 at `js/nav.js:57` reddens REVEAL; app.js:482 alternative confirmed redundant (would be UNCAUGHT) | swept |

Cells total 2; assertions swept 2; mutation-mechanization swept 1; bare 1 (PROMO mutation-cases).

Coverage-Model dimensions (§7) reconciled: every dimension appears with a status. Applicable-and-swept:
Lifecycle/phases, Ordering(cascade), Resources, Normal-completion, Invariants, Composition,
Observability (all via PROMO+REVEAL assertions). **Mutation-cases: applicable and BARE for PROMO**
(REVEAL's is swept). N/A (with the plan's stated reason, accepted): Identities, Async, Stale-completions,
Recovery, Emergency-disposal, Persistence, Contract-claims, Concurrency, Known-red. External-side-effects
/ Flash: device-only, correctly NOT a CI cell.

## 3. Findings

### Structural — PROMO's registered mutant is not sweep-runnable-to-CAUGHT, and breaks CI

- **Promised behaviour.** Plan §8: PROMO "names a mutation that reddens it on a real channel";
  EC §4.10 (core rule): "every important new assertion must be mutation-verified … mutation evidence
  must remain runnable in repository tooling. Separate behavioral … from source-contract … sweeps."
  Curie RED §5 instructed explicitly: "Register the PROMO mutation … **under the source-text sweep**,
  and the REVEAL mutation … under the behavioural sweep."
- **What is wrong.** The PROMO mutant (`tools/mutate.mjs` #79, targeting `css/app.css`) is registered in
  the shared `MUTATIONS` table that feeds the **behavioural** sweep (`tools/mutation-sweep.mjs`). That
  sweep excludes `home-layer-invariant.test.js` via `SOURCE_TEXT_GATES` (correctly — a source-text gate
  fails by construction under any css edit, which would be a FALSE CAUGHT). PROMO's only defender is thus
  the one test the sweep does not run. No other behavioural test reads `css/app.css`, so #79 is UNCAUGHT.
- **Why no test catches its break (in the sweep).** Measured: `node tools/mutation-sweep.mjs 79` →
  `#79 UNCAUGHT`, exit 1. The designated "source-text sweep" (`tools/source-gate-sweep.mjs`) does **not**
  contain a PROMO entry, and is moreover hardcoded to mutate `js/app.js` (`const APP = …/js/app.js`) — it
  cannot target `css/app.css` as written. It is also not wired into `package.json` scripts or `ci.yml`
  (on-demand only). So the mutant is caught by neither sweep.
- **Blast radius.** (a) The §4.10 "registered, sweep-runnable mutant that reddens the intended cell by
  execution" deliverable is not met for PROMO. (b) CI `mutation-sweep` shard 7 (`79 % 8 = 7`,
  `MUTATIONS.length = 81`) applies #79, finds the behavioural suite green, and exits 1 → the mutation-sweep
  job is RED on this commit. (`npm test` is unaffected — PROMO's assertion is green there.)
- **Occupant (what is owed).** Relocate PROMO's mutant out of the behavioural `MUTATIONS` table into the
  source-text sweep: extend `tools/source-gate-sweep.mjs` to (i) mutate `css/app.css`
  (`#home { transform: translateZ(0); }` → `#home { transform: none; }`) and (ii) require
  `test/home-layer-invariant.test.js` to go RED on a PROMO subtest (`mustSay`-keyed on
  `PROMO.base`/`PROMO.cascade`), as the fingerprint entries already do for the two `js/app.js` gates —
  with the behavioural swipe suite as the negative control (must stay green, proving the source-text gate
  catches what no behavioural assertion can). Equivalently, teach `tools/mutation-sweep.mjs` to skip a
  mutation whose target file is a source-text gate's subject. Either way, remove #79 from the behavioural
  sweep so the CI job stops reporting UNCAUGHT. Consider CI-wiring `source-gate-sweep.mjs` so this class of
  evidence runs automatically (pre-existing gap — the fingerprint gates share it).
- **Route.** Build/tooling task (Brunel), per Curie RED §5 ("under the source-text sweep"). Not a test-
  authoring gap: `home-layer-invariant.test.js` itself is correct and non-vacuous.

### Note — cells swept; scope decisions accepted

- **PROMO non-vacuity (verified).** Under #79 (`transform: none`): PROMO.base FAIL, PROMO.cascade FAIL,
  PROMO.parse-sanity PASS (rule located → RED is "no promoting transform", not a parser miss),
  PROMO.parked PASS (`translateX(-101vw)` intact). The `PROMOTING = /translateZ|translate3d|matrix3d/`
  gate correctly rejects a bare `will-change` and a 2D `translate`, and would catch a revert to either.
  The exact-selector reader (`#home` vs `#home.parked`) correctly excludes the `.view.nav-in-*` animation
  rules whose keyframes end at `transform: none` — the accounted-for-benign non-reveal path (plan §3;
  Loki HELD_STONE). Static-cascade scoping is correct.
- **REVEAL anchor correctness (verified — the crux).** #80 is anchored at `js/nav.js` `setView:57`
  (`toggle('parked', v!=='home')` → `toggle('parked', true)`) and reddens REVEAL by execution. Curie's
  pinpoint is confirmed: neutralising the redundant un-park at `js/app.js:482` alone (with nav.js:57
  intact) leaves REVEAL **GREEN** — a mutant misfiled there would have read UNCAUGHT. Brunel anchored the
  load-bearing site.
- **Flash correctly not claimed.** Neither test asserts the compositor demote / repaint; both state
  device-only, per plan §3/§9 and the saga. No vacuous CI flash claim.
- **Two cells adequate for the assertion surface.** The commit→home flash (different cause) and the
  incoming-`#browse` families are explicitly deferred (§10); REVEAL is scoped to the home→books abort
  (the `.256` device scenario). No un-covered reachable reveal path was found that lands `#home` on
  `none` within scope.

## 4. Forward read

If the Structural finding stays open, the next failure is a **green-looking coverage claim over a red CI
gate**: the mutation-sweep job fails on shard 7 every push, and — because the failure is a *tooling*
misfile rather than a suite regression — the pressure will be to silence it (drop or `benignAlone`-flag
#79) rather than relocate it. That silences the one mechanism proving PROMO's css guard is defended,
returning Stage 6g's Mutation-cases dimension to exactly the unverified-by-tooling state 6e's remediation
was built to end. The css assertion would remain green in `npm test`, so the loss would be invisible
until a future `css/app.css` refactor neutralises the base `#home` transform and no sweep announces it.

---

## 5. Re-audit (post-apply) — 2026-07-27

Target: the working tree after Brunel's remediation of §3 (and Poirot's identical F1) atop `5cc0f14`;
Poirot re-reviewed → SHIP. The applied fix is a **general** source-text-mutation verification path (chosen
over relocating #79, to keep CI's single sweep entry point and the shard partition intact):

- `tools/mutate.mjs`: mutation #79 gains `caughtBy: 'home-layer-invariant.test.js'`.
- `tools/mutation-sweep.mjs`: new `gateTestsFor(m)` — `m.caughtBy ? ['test/'+m.caughtBy] : behaviourTests()`.
  A mutation with `caughtBy` has the sweep apply it and then run the **named source-text gate against the
  mutated file**, counting that gate's reddening as the catch. No `benignAlone`.

Also applied (Poirot comment-truth scrub, behaviour-neutral): `css/app.css` and `js/app.js:553-559` comments
corrected — the shipped `translateZ(0)` navbar-safety is EXPECTED (containing-block/stacking argument), with
device-confirmation of the shipped form still owed (plan §9b); only the `.256` `will-change` probe was
device-confirmed. The `#home { transform: translateZ(0); }` rule, `#home.parked`, and `js/nav.js:57` are
UNCHANGED, so PROMO's and REVEAL's targets are intact. The js/app.js comment added 3 lines, shifting
navStack line numbers; `docs/swipe-model.generated.txt` was regenerated to match (source-fingerprint gates).

### Confirmed by execution (node `C:\Users\nzilb\tools\node-dist\node.exe`)

| Check | Result |
|---|---|
| (a) `mutation-sweep.mjs 79 80` | `#79 caught (2 failing) via source-text gate home-layer-invariant.test.js`; `#80 caught (3 failing)`; `0 uncaught`, **exit 0** |
| (b) §4.10 deliverable is REAL, not vacuous | #79's catch is the sweep genuinely running `home-layer-invariant.test.js` against the MUTATED css and it going RED (2 failing = PROMO.base + PROMO.cascade, the right subtests). No `benignAlone`. Non-tautology proven: the gate on PRISTINE css = 4 pass / 0 fail, so absent a real break it produces 0 failures → the sweep's `failures===0 → UNCAUGHT` path fires. **A green gate reads UNCAUGHT — no false-CAUGHT path.** |
| (c) Mechanism is GENERAL | `gateTestsFor` keys on any `caughtBy`, not on #79. Any future source-text-only mutant names its own gate the same way; no #79 special-case in the sweep. |
| (d) No behavioural-sweep regression | `mutation-sweep.mjs --shard=7/8` → 10/10 caught, exit 0 — #79 (caughtBy) plus 9 non-`caughtBy` mutants (#7,15,23,31,39,47,55,63,71) all still caught via the unchanged `behaviourTests()` path. |
| REVEAL still caught, correct anchor | #80 at `js/nav.js:57` `setView` reddens REVEAL (3 failing). nav.js untouched by the apply; the app.js:482-redundancy finding from §3 still holds. |
| (e) Tree integrity | Sweeps self-restore; after the run: no `*.mutbak`/`*.sgbak`; `git status` shows only the intended apply edits + untracked records. |
| Full suite green on the applied tree | `node --test test/*.test.js` → 736 tests, **735 pass, 0 fail**, 1 skipped (the pre-existing skip). The comment scrub + fingerprint-doc regen is coherent; `swipe-model` / `transition-matrix` fingerprint gates pass. |

**Minor observation (not a finding, no test owed).** The `caughtBy` path counts any `not ok` from the named
gate as the catch (unlike `source-gate-sweep.mjs`, which keys on a `mustSay` subtest title). For #79 the
reddening is genuinely on PROMO.base/cascade, and PROMO.parse-sanity guards against a "rule-not-found" false
signal — so the catch is causally correct here. If more `caughtBy` mutants are added later whose gate has an
unrelated failure mode, a subtest-title key would harden the mechanism; unnecessary for this cell.

### Verdict

The PROMO §4.10 mutation-mechanization gap is genuinely closed: the registered mutant now reddens its cell
by execution through the sweep, generally and without a `benignAlone` crutch, and the sweep exits 0. REVEAL
remains swept and correctly anchored. No new bare cell. Every applicable Coverage-Model cell (§7) is
non-vacuously swept.

`Verdict: **ADEQUATE**`
