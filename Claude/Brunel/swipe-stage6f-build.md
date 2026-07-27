# Build log — Stage 6f: in-flow→overlay outgoing becomes an app-ghost

Type: build log

Target plan: `Claude/Plans/PLAN-swipe-stage6f.md` (Charpy FORGE `Claude/Charpy/PLAN-swipe-stage6f-cb7ae3d.md`;
Curie RED `Claude/Curie/RED-swipe-stage6f.md`; Loki HELD_STONE `Claude/Loki/STRIKE-swipe-stage6f-r1.md`).
Built against production HEAD `494dd52`.

`Verdict: **BUILD_GREEN**`

---

## 1. Exact slice completed

The OUTGOING half of the structural fix for the in-flow→overlay family (plan §2/§4): the sole production
edit is the `outgoing` decision value in `js/swipe.js constructionPlanFor` (135-138). For in-flow sources
(`home`/browse-family) going to any non-home destination, `outgoing` is now `'app-ghost'` (previously only
for `toKind==='browse'`); `toKind==='home'` and `fromKind==='overlay'` are unchanged at `'real-source'`.
No other production code changed. Everything downstream (`buildConstruction`'s existing app-ghost branch,
`start()`'s mover mapping, disposal, the plain no-hold reveal) is byte-identical — it already shipped for
browse→browse.

## 2. app.js-untouched confirmation

**`js/app.js` was not modified.** `git diff --stat js/app.js` is empty throughout the build. The two
transient mutation applications that touched `js/app.js` (mutant #78, the REVEAL hold probe) were applied,
verified, and restored via `node tools/mutate.mjs --restore`; `git status` and a repo-wide `*.mutbak` scan
confirm no residue and a clean `js/app.js` at every checkpoint. The fingerprint test
(`test/swipe-model.test.js` — "every mirrored js/app.js region still matches what was verified") stayed
green throughout, independently confirming the mirrored app.js regions the model hashes were never touched.

## 3. Files changed (production + co-changes)

| File | Change |
|---|---|
| `js/swipe.js` | The one-line `outgoing` ternary (135-138) + its leading doc-comment (114-119) restated to current truth. |
| `test/fixtures/swipe-plan-spec.mjs` | Three expected-outcome flips (`outgoing:'real-source'`→`'app-ghost'` at the home→overlay row, the browse→overlay row, and the browse→nowplaying `MODIFIER_CASES` entry) + the `STRUCTURAL_CASES` rule comment restated. |
| `test/transition-matrix.test.js` | The spec self-consistency predicate (line 85) and its doc-comment (line 83) updated to "GHOST iff source is not an overlay AND destination is NOT home" (T1 residual, per Charpy FORGE). |
| `docs/transition-matrix.generated.txt` | Regenerated (`node tools/gen-transition-matrix.mjs`) — outgoing/pane columns for `home→overlay`/`browse→overlay` flip to `app-ghost`/`yes`; pane-count summary 27→62 of 132. |
| `docs/swipe-model.generated.txt` | Regenerated (`node tools/gen-swipe-model.mjs`) — the `books()→nowplaying()` construction row's pane flips `no`→`yes`. Mirrored-region fingerprints (`gen-swipe-model.mjs:44-61`) are byte-identical to HEAD — verified by diff and by the fingerprint test staying green. |
| `tools/mutate.mjs` | Two new registered mutants (#77, #78) — see §5. |

Not modified: `js/app.js`, `js/nav.js`, `test/swipe-stage6f.test.js` (Curie's suite, pristine), any file
outside this table.

## 4. SIbrowse/SIhome — the real view carries no transform post-build

Both cells are the load-bearing proof and both are green post-build:

- `SIbrowse` — drives a live `browse→overlay` gesture (`books`→`options`) via `h.touch`, reads
  `#browse.style.transform` mid-drag: `''` (was `'translateX(110px)'` pre-build).
- `SIhome` — the home-source twin (`home`→`options`), reads `#home.style.transform` mid-drag: `''`.
- `GHOST` (commit + abort) — a `.nav-ghost` owned pane is present during the drag (was 0 pre-build) and
  disposed exactly once on both exits.

`node --test test/swipe-stage6f.test.js` → **9/9 pass** (was 4/9 pre-build, matching Curie's recorded RED
run exactly on the five cells this build was authored to green).

## 5. Mutation evidence (EC §4.10; Brunel Gate B, synchronous, no backgrounding)

Two new mutants registered in `tools/mutate.mjs`, each applied, run, and restored **synchronously** (never
backgrounded), with a `git status` + repo-wide `*.mutbak` scan confirming a clean tree after every restore.

| Mutant | Target | Applied → | Restored → |
|---|---|---|---|
| **#77** — `constructionPlanFor` outgoing reverts to the pre-6f rule (`toKind==='browse'` only) | `js/swipe.js` | `SIbrowse`/`SIhome`/`GHOST`-commit/`GHOST`-abort/`MODEL` all fail on their load-bearing assertion (5/9 red, exact fixture-sanity guards still pass); `MODEL`-over-broaden and `REVEAL`/`DEC` stay green (not disturbed) | clean; `git diff js/swipe.js` shows only the intended build edit |
| **#78** — the `browse→overlay` ABORT reveal is routed through the paint-gated hold | `js/app.js` | `REVEAL` fails on its intended assertion (`ghostCount` 1 vs expected 0, `AssertionError`); all other 8 cells stay green | clean; `git diff --stat js/app.js` empty |

DEC's existing mutant (**#38**, `swipe4 F1: buildConstruction ignores plan.decorations`) was re-applied
and confirmed still maps: it reddens **only** `DEC` on its intended assertion (`.np-pill-float` absent),
all other 8 cells stay green. Restored clean.

`node --test test/mutation-anchors.test.js` → 2/2 pass (every anchor, including the two new ones, still
matches; no mutation is a no-op).

## 6. T4 opacity precondition — verified

All seven overlay kinds paint an opaque `background: var(--page-bg)` over their own rect at HEAD
(re-verified against `css/app.css`, unchanged by this build):
`#options` :134, `#nowplaying` :421, `#downloads`/`#general`/`#playback`/`#buffering`/`#diagnostics` (the
shared selector at :687) :695. The precondition holds; the slice is not blocked.

## 7. Full suite + meta-gates

`node tools/hooks/run-checks.mjs` → stamp / lint / typecheck / tests all **PASS**.

`node --test test/*.test.js` → **731 tests, 730 pass, 0 fail, 1 skipped.** The one skip is
`test/swipe-stage6-*.test.js` cell `KEEPER — a browser scroll between endHold and the successor's first
move...` (Loki NB-post-endHold-scroll-realize) — a pre-existing, explicitly-documented device-only skip
from an earlier stage (`Claude/Loki/STRIKE-swipe-stage6-recover-before-arm-r2.md §5`), unrelated to and
untouched by this build.

Meta-gates, each run and confirmed green independently:

| Gate | Result |
|---|---|
| `test/mutation-anchors.test.js` | 2/2 pass |
| `node tools/dead-return-fields.mjs` | "Every registered seam: all returned fields have a consumer." (exit 0) — N/A impact: `constructionPlanFor`'s return shape is unchanged, no new contract member |
| `test/policy-ledger-gate.test.js` | pass (part of full-suite run; unaffected — no known-red introduced, no ledger entry owed per plan §9) |
| `test/contract-function-gate.test.js` | pass |
| `test/swipe-model.test.js` | pass, incl. the fingerprint test and the exact `§8A NEW_POLICIES` set (unchanged, per plan §9 — this is a construction-representation change, not a policy deviation) |
| `test/transition-matrix.test.js` | pass, both the generated-doc match and the (now co-changed) spec self-consistency predicate |
| `test/construction-consumers.test.js` | pass |

## 8. Gate A/B reconciliation (Brunel Local)

**Gate A (admission).** The plan's Applicability block declares `boundary_relocation`, `callee_replacement`,
`contract_shape`, `state_transfer`, `async_change`, `persistence_migration` all `false` — no
`vitruvius-contract`/`vitruvius-ledger` is owed by this plan (verified: `constructionPlanFor`'s return keys
are unchanged, only one string value flips). The code-level returned-key reachability gate
(`tools/dead-return-fields.mjs`) was run before and after the build and is green. No `PLAN_DEFECT` applies.

**Gate B (completion).** Every Coverage Model cell this plan assigns a NEW mutant to (SIbrowse, SIhome,
GHOST-commit, GHOST-abort, MODEL, REVEAL) is proven by its designated test: green pre-mutation → mutant
applied → the designated test reds on its named assertion (not "some test failed") → restored green. DEC is
proven by its existing designated mutant (#38), re-confirmed the same way. No `COVERAGE_OPEN` applies.

## 9. Production behavior — changed vs. deliberately unchanged

**Changed (new policy, EC §4.19):** `constructionPlanFor`'s `outgoing` value for `browse→overlay`,
`home→overlay`, `browse→nowplaying`, `home→overlay`-family NP-modified cases, and the five settings-sub
destinations — `'real-source'` → `'app-ghost'`. Classified new policy (not a parity extraction, not a
known-red repair); the visual-parity claim (the ghost is a faithful clone; the topbar/navbar band exposure
for inset destinations) is device-verified downstream (plan §9), not asserted by any cell here.

**Deliberately unchanged:** the four transform-write/clear sites (app.js 555/576/615/775) — the real view
simply never enters the mover set they iterate; `buildConstruction`'s app-ghost branch and `start()`'s
mover mapping (already shipped for browse→browse); the paint-gated reveal/hold surface
(`holdGhostUntilPaintable`, `dropPanes`, `watchFrames` — in-flow→overlay never enters it); `js/nav.js`;
`browse→home` outgoing (deferred, home-reveal hold surface); the INCOMING real-`#browse` transform for
`browse→browse`/`home→browse`/`overlay→browse` (T8-forked headline, deferred); overlay-source transforms
(out of the invariant's scope).

## 10. Deferred work (unchanged from plan §10, not this build's scope)

`browse→home` outgoing (home-reveal hold surface); the INCOMING real-`#browse` transform (the headline
`browse→browse`, T8-blocked fork, plus `home→browse`/`overlay→browse`); workstream C (I10/I17 paint-gated
reveal centralization); the borrowed-real OVERLAY transforms. Each names its consumer/stage in the plan;
none is opened by this build.

## 11. Records reconciliation NOT applied by this build

Per plan §9, the following defining-record edits are staged but **not** applied by this build step — they
are left for the handoff chain (Poirot review → Mendeleev audit → Loki re-strike → Zelda's close-out
commit), consistent with "leave everything staged in the working tree, do not bump the build number":
`Claude/Subsystems/swipe-reveal.md` (§7/§8/§17/§18/§23), `Claude/Decisions/DecisionLog.md` (the new-policy
entry), `Claude/Plans/PLAN-swipe-reveal.md` §7 step 6 (the 6f-slice annotation), the build-number bump, and
`Claude/Campaigns/swipe-stage6f.json` (the stage-gate manifest). None of these gate the code build itself.

## 12. Honesty carried forward

Structural-green here (the real in-flow view carries no transform) is **not** proof the compositor flash is
fixed — that is device-only and downstream, exactly as the plan states first. No test in this build, and
nothing in this report, claims otherwise.

---

`Verdict: **BUILD_GREEN**`
