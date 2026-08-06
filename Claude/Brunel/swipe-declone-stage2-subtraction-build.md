# Build log — declone Stage 2 subtraction pass (PLAN-swipe-declone-stage2-subtraction.md §11 step 5b, step 6)

Plan: `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md`, RATIFIED, FORGE at round 3, adversary
struck (fracture folded as §4a C5). Starting HEAD `f250a45`.

## Step 5b — the collapse-applied trial run

**Instrument.** `Claude/Loki/probe-stage2-subtraction-transform.js` was read in full before use.
Confirmed by reading, not assumed: it writes nothing to disk (only patches `fs.readFileSync` and
`Module._extensions['.js']` in the current process's memory), and `replaceOnce` throws on a
missing anchor (`indexOf < 0`) and on a non-unique one (a second `indexOf` past the first match) —
so it cannot silently no-op or pass vacuously.

**Baseline confirmed before the trial.** `node --test test/*.test.js` at HEAD `f250a45`: 884 tests,
880 pass, 3 fail (`532` NOOWNEDPANE, `721` PILLSWEPT-arity, `722` MOVERSHAPE), 1 skip — matches the
plan's stated red-suite status exactly.

**First trial run used the plan's literal command and produced 8 undeclared failures — an
instrumentation artifact, not a blast-radius finding.**
`COLLAPSE=1 NODE_OPTIONS="--require ./Claude/Loki/probe-stage2-subtraction-transform.js" node --test test/*.test.js`
(relative path, run from the project root) reddened 19 tests, 8 of which are not named anywhere in
§4a or §8: `test/campaign-gate-precommit.test.js`'s gate test, `test/mutation-applier.test.js`'s
three `MUTUNIQ` tests, and `test/revert-keeps-records.test.js`'s four hook tests. All four of those
files `spawnSync`/`execFileSync` a **child** `node` process against a **temp-directory** sandbox
(cwd ≠ project root) to drive the real CLI/hook scripts under test. `NODE_OPTIONS` is an
environment variable, so it is inherited by every such child; the probe's relative
`--require` path cannot resolve against the sandbox's cwd, and the child crashes at startup with
`MODULE_NOT_FOUND` before it does anything related to swipe. Reproduced directly: running
`COLLAPSE=1 NODE_OPTIONS="--require ./Claude/Loki/probe-stage2-subtraction-transform.js" node x.js`
from an unrelated directory throws exactly that error.

**Fix: pass `--require` as a CLI flag on the top-level invocation instead of via `NODE_OPTIONS`.**
CLI flags are not inherited by a spawned child's `argv`, only environment variables are, so a
child spawned without an explicit `env` override no longer attempts to load the probe at all
(`COLLAPSE=1` alone, with no `--require`, is inert — the probe's preload branch never runs). Node's
own `--test` runner still applies `--require` to each test file's own subprocess (it forwards
`execArgv`), so the collapse is still applied everywhere the instrument needs it. Confirmed: the
re-run below reproduces every genuine collapse-radius failure the first run found, and drops
exactly the 8 subprocess-crash artifacts and nothing else.

**Clean measurement:**
`COLLAPSE=1 node --require ./Claude/Loki/probe-stage2-subtraction-transform.js --test test/*.test.js`
— 884 tests, 872 pass, 11 fail, 1 skip.

Failing set: `268, 272, 299, 532, 597, 722, 763, 764, 785, 786, 798`.

Reconciliation against baseline (`532, 721, 722`):

- **Persisting (unrelated to the collapse region):** `532` NOOWNEDPANE, `722` MOVERSHAPE — both red
  for D8/D12 reasons the collapse doesn't touch; expected to stay red until step 6's deletions land.
- **Flips green under the collapse, exactly as the plan states:** `721` PILLSWEPT's arity half —
  "flips to green under the collapse probe and nothing else does." Confirmed: it is the only
  baseline-red test absent from the collapsed failing set.
- **New (9), the measured radius:**

| # | Test | Declared by |
|---|---|---|
| 268 | `every mutation anchor still matches the source it targets` (`test/mutation-anchors.test.js`) | §8 D13 (#13, #17, #61 named for de-registration/re-anchor), D13d (#16/#22 the merged duplicate pair, decision 19) |
| 272 | `every source-gate anchor still matches its target, or is a KNOWN rot` (`test/mutation-anchors.test.js`) — names `begin/supersession (swipe-model)` | §4a C3(a) |
| 299 | `resetSwipeStyles clears inline transforms off every screen + drops ghosts` (`test/nav.test.js`) | §8 D14 (the `.nav-ghost` sweep cell in `test/nav.test.js`, deleted) |
| 597 | `M1WRITERSET — …` (`test/scroll-writer-set.test.js`) — names entry `#10` | §4a C5 |
| 763 | `the committed model is exactly what the generator produces` (`test/swipe-model.test.js`) | §4a C1 ("the commit lands red here first") / D17 (regeneration) |
| 764 | `every mirrored js/app.js region still matches what was verified` (`test/swipe-model.test.js`) | §4a C1 |
| 785 | `OB — …` (`test/swipe-stage6.test.js`) | §8 D14 |
| 786 | `OB-home — …` (`test/swipe-stage6.test.js`) | §8 D14 |
| 798 | `HR — …` (`test/swipe-stage6e.test.js`) | §8 D14 |

Every failure-detail block was read, not just the test title (`node`'s `--test` reporter output),
confirming each names exactly the mutants/anchors/cells the plan's tables name (e.g. `268`'s error
lists anchors `#13`, `#16`, `#17`, `#22`, `#61`, `#152`, `#153` — all seven map to named D13/D13b/D13d
rows; `272`'s error names `begin/supersession (swipe-model)` exactly). `test/swipe-stage6e.test.js`'s
`DP.browse-home` and `DEC` (also named in D14) do not fail under the in-memory collapse — not a
contradiction of exit condition 0, which is about no undeclared surplus, not that every declared
deletion must redden a test under this instrument (D14's own note: `DEC`'s behaviour survives and is
re-homed, not deleted-as-a-failure).

**Exit condition 0 — SATISFIED.** The measured failing set equals §4a plus §8's declared radius,
item for item, once the trial is run without the `NODE_OPTIONS` subprocess-inheritance artifact. No
surplus. Nothing routed back to the planner.

## Step 6 — the subtraction commit

### What was deleted / changed, by item

- **D1** `env.scrollY` supplier — removed (`js/app.js`, `start()`'s `env` literal).
- **D2** capture-recording block (`if (c.capture) {...}`) — removed.
- **D3** `ghostDiff`, `cover.ghostY`, the `ghostY=` trail token — removed; historical device-log
  excerpts inside investigation comments (`.202`/`.203` narrative) left as past-tense record.
- **D4** `dropPanes` and its call — removed.
- **D5** `revealPending` and `endOwnership`'s guard — removed; `endOwnership` collapses to
  `() => sessionDone(cur)`.
- **D6** `paneKindOf`, `watchFrames`'s `paneKind` parameter, the `pane=` FLASH token — removed
  (both token and parameter dropped, per the plan's recommendation).
- **D7** `disposeOwnedPanes` and its call — removed.
- **D8** `paneLess` and its comment; `begin()`'s gate collapses to `if (finishing && !session) return;`.
- **D9** `.nav-ghost` surfaces — the `.spent` sweep, the recovery predicate's disjunct, the `ghosts=`
  diagnostic token (`start()`'s log line), `js/nav.js:105`'s sweep — all removed.
- **D10** the ORPHAN branch and its three ternaries — collapsed per §5 exactly: the explicit
  dispose+reset call pair removed outright (adjacency: `applyScreen` reaches the full reset as its
  own first statement); `resetScroll: cur ? false : undefined` → `resetScroll: false`; `if (cur)
  window.scrollTo(...)` → unconditional.
- **D11** `keepGhosts` — `js/app.js:114`'s wrapper, the `applyScreen` option, `js/nav.js`'s
  parameter and its `applyScreen` argument — all removed. `js/nav.js:106` (the `.np-pill-float`
  sweep) verified UNCHANGED and unconditional.
- **D12** `toMover`'s `own` field — removed; production mover shape is now `{ el, base }`.
- **D13/D13b/D13c/D13d** `tools/mutate.mjs` — de-registered by name: `swipe6e DP/attribution`, `swipe6e
  DEC`, `swipe6e HR`, `r223 4`, `stage6a F1`, `stage6i SCOPE` (all named in the plan), plus **`swipe6e
  RSN-emit`** — found during this build, not named in the plan's D13 table (a sixth instance of R10's
  class, in the mutation registry rather than the co-change list; its subject, the disposal-trace
  event inside `disposeOwnedPanes`, has no replacement). Re-anchored: `#13` (`HARDRESET_DISPOSE_FROM`
  now the single surviving `applyScreen` line), `S2-31`, `S2-32` (`VR_HOLD_ORDER_FROM`/`_TO`, now
  3 lines not 5). Merged (decision 19): `#16`+`#22` → one entry naming all three killers (SC, NC,
  I20); its anchor needed a 2-line form (the preceding `applyScreen` statement) because the bare
  scroll-restore line's 8-space indent is a literal substring of the OTHER abort site's 10-space
  line — `indexOf` doesn't require a line-boundary match, and the first merge attempt tripped the
  anchors gate's non-uniqueness check on exactly this. Replaced (D13b): `swipe6e BR` → a new mutant
  broadening `js/nav.js`'s `resetSwipeStyles` to REMOVE the elements it clears, disclosed
  non-discriminating. Kept with an expected-killer note (D13c): `S2-23 NOGHOSTATALL` (measured: its
  `killed by:` list now includes `NOGHOSTCLASS` and `NOOWNEDPANE` alongside `NOGHOSTATALL`, confirmed
  by the full sweep — 13 killers total).
- **§4a C1** `test/swipe-model.test.js` `VERIFIED.supersession` — re-pinned `b07e422a493b8fff` →
  `ce3a96a2ead88f31` behind a recorded line-by-line re-verification (see below), not a re-hash.
- **§4a C2** `tools/gen-swipe-model.mjs` — all five ORPHAN-prose sites rewritten to describe the
  post-collapse code, avoiding the retired vocabulary itself (not just describing it as retired) so
  the new `orphan`/`ghost` token-scan assertion is satisfiable — the first draft still said "sweep a
  stray ghost from" and "the ORPHAN sub-case", which the token scan correctly caught; rewritten a
  second time with zero occurrences of either token, verified by direct grep on the regenerated doc.
- **§4a C3** `tools/source-gate-sweep.mjs` — (a) `begin/supersession` re-anchored onto `const cur = d
  || session;` (equivalent rewrite: `d ? d : session`). (b) `transition branches` entry DELETED
  (tombstone of a mirror retired at stage 4). Header/rationale corrected to name one fingerprint gate,
  not two. `test/transition-matrix.test.js:12-20`'s header corrected (one thing guarded, not two).
  `tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES` reason corrected to name both real channels
  (js/nav.js SETTINGS_SUBS derivation, js/swipe.js `require` at generator load) instead of the false
  fingerprint claim. `test/mutation-anchors.test.js`'s `KNOWN_ROTTED` map emptied (the exemption
  entry removed with the fix, not left stale).
- **§4a C4** `tools/fuzz-ui.js`'s `ghosts: all('.nav-ghost').length` probe field — removed, along
  with its now-dead violation check (`ORPHANED GHOST NODES`, could never fire) and its mention in
  the file's header comment and the per-action log entry. Initially missed during the main pass
  (found only while writing this log's exit-condition table, by re-reading the plan against the
  change list rather than by an instrument — `fuzz-ui.js` is a manual browser tool with no
  automated-suite coverage, so its omission produced no test failure and no sweep miss). Fixed
  before this commit rather than left as a disclosed gap.
- **§4a C5** `test/scroll-writer-set.test.js` — entry `#10`'s text collapsed to match `#11`'s exactly
  (shared-text GROUP), Direction 3's nesting comment corrected, drift message extended to name both
  candidate entries by `#n (owner)`.
- **D14** deleted whole: `test/swipe-stage6e.test.js` (`DP.browse-home`, `HR`, `DEC`; `BR` already
  relocated by Curie before this build started). `OB`/`OB-home` deleted from
  `test/swipe-stage6.test.js`. The `.nav-ghost` assertions removed from `test/nav.test.js`'s
  `resetSwipeStyles` cell (kept: the transform-clearing assertions). `F2-r WIRING` deleted from
  `test/swipe-stage5-wiring.test.js` (its `flashLog`/`realSleep` helpers, now unused, removed with
  it).
- **D15** vacuous `ghosts(h) === 0` assertions removed: `test/swipe-invariants.test.js` (2 sites),
  `test/swipe-stage6c.test.js` (3 sites, its now-unused `ghosts` helper removed too).
  `test/swipe-stage5-residuals.test.js` had no live use of its `ghosts` helper at HEAD (pre-existing
  residue from an earlier stage, out of this pass's scope, left alone).
- **D16b** comment scrubs, all confirmed: `js/app.js` `:401-407`(→`379-385` current, the ghostApp
  capture-recipe comment, itself already describing an already-retired function — rewritten),
  `:425-427`, `:429-434`, `:437-473`, `:475-479`, `:600-601`, `:693-696`, `:761-767` (all removed or
  rewritten as part of the code they annotated). `test/swipe-stage5-residuals.test.js:88-92`
  rewritten (the false "own is still load-bearing" note). `test/swipe-construction.test.js:160-168`
  wording-corrected (own is no longer a production key). Tombstones at `js/app.js:718-726`,
  `js/swipe.js:203-210`/`:254` confirmed unchanged (they stay, per [R6]).
- **§6 Compatibility (U10)** wording corrections: `test/np-hidden-writer-set.test.js` (dropped the
  `opts.keepGhosts` mention from its edge-5 prose).
- **D16c** `test/retired-concepts-purge.test.js` confirmed NOT added to `tools/mutation-sweep.mjs`'s
  `SOURCE_TEXT_GATES` exclusion list.
- **D17** `docs/swipe-model.generated.txt` and `docs/transition-matrix.generated.txt` regenerated
  (`node tools/gen-swipe-model.mjs`, `node tools/gen-transition-matrix.mjs`) after C2's rewrite —
  the transition-matrix doc is byte-identical (nothing about it changed; git shows it as touched
  only by CRLF normalization on write).
- **Build number** `build.json`: `2026-08-03.306` → `2026-08-05.1` (today's date; no prior
  `2026-08-05.N` bump existed). Stamped into `sw.js`, `js/debug.js`, `index.html` via
  `node tools/stamp-build.mjs`; `--check` confirms all four files agree.

### A finding beyond the plan's declared table (D8's own gate comment)

`begin()`'s own leading rationale comment ("Stage 6c narrowed gate... a PANE-OWNING session
(ghost/snapshot)...") was **not named** in D16b's list or in the vitruvius-gate `source_ranges`
(which start at `:425`, after this comment). It directly explains the gate D8 collapses and would
otherwise describe a PANE-OWNING/PANE-LESS distinction that no longer has two sides. Rewritten under
the same general rule D16b states ("a comment describing a mechanism as if it still governs... goes"),
applied to a spot the hand-enumeration missed — the same class of miss this campaign's own R10 already
names five times, found here a sixth time (see also `swipe6e RSN-emit` above) and a seventh
(`js/app.js`'s FLASH ".213: fires on the NO-PANE transitions too" comment, and the equivalent comment
in `test/swipe-gesture.test.js`'s `.213` cell — both described a pane/no-pane control-group
comparison that no longer has two sides to compare).

### The build-time-only lint finding

`js/app.js`'s local `resetSwipeStyles` delegator (`function resetSwipeStyles() { Nav.resetSwipeStyles();
}`) lost its only call site when §5's collapse removed the explicit recovery-time call. Confirmed by
running `test/lint.test.js` (ESLint's `no-unused-vars`), which reddened on exactly this. Removed the
now-dead delegator. Its sibling delegators (`setView`, `setNavActive`, `applyScreen`, ...) are
unaffected (each keeps other call sites).

### Exit-condition-by-exit-condition

0. **SATISFIED** — see step 5b above.
1. **SATISFIED** — every §4/§4a/§8 item discharged, per the item-by-item list above.
2. **SATISFIED** — the nine §10 cells are green (full suite, see below); `test/retired-concepts-purge.test.js`
   run in isolation: all fire-drill positive/negative controls pass (Curie's authored fire drill,
   unchanged by this build; confirmed still green after the deletions land).
3. **SATISFIED** — full suite green (878 tests, 877 pass, 1 skip — the device-only KEEPER cell — 0
   fail); full mutation sweep run in 12 shards (`--shard=0/12` .. `--shard=11/12`, 146 mutants total,
   matching `MUTATIONS.length`): **0 uncaught, 0 unapplied, 0 stale flags across every shard.** No
   `*.mutbak` anywhere in the tree after (`find . -name "*.mutbak"` empty, excluding
   `node_modules`/`.claude/worktrees`).
4. **SATISFIED** — `node tools/source-gate-sweep.mjs` exits 0, all 4 remaining entries anchor, all
   4 fingerprints caught with the behavioural control holding (0 uncaught, 0 not-behaviour-neutral).
   Run twice: once mid-build (before C1's re-pin landed, so its positive result for
   `begin/supersession` was confounded by an already-red baseline test) and once after the full
   green baseline was restored — the second run is the trustworthy one and is what this item cites.
5. **SATISFIED, procedurally** — `VERIFIED.supersession` moved behind a recorded line-by-line
   re-verification in `test/swipe-model.test.js` itself (dated 2026-08-05, describing the three
   consequences inside the pinned region: the explicit dispose+reset calls gone, `resetScroll`
   collapsed to the literal, the scroll-restore guard gone) — not a bare re-hash. This build log
   records the same re-verification as the required second location.
6. **SATISFIED** — new test `'the rendered model names neither retired concept — no "orphan", no
   "ghost"'` in `test/swipe-model.test.js`, case-insensitive, over `gen.render()`'s live output —
   green.
7. **SATISFIED** — build number moved, `2026-08-05.1`, stamped and `--check`-verified.

### Suite result

Before (baseline, HEAD `f250a45`): 884 tests, 880 pass, 3 fail (red-first), 1 skip.
After (this commit's tree, pre-commit): 878 tests, 877 pass, 0 fail, 1 skip (six fewer net tests:
+9 new §10 cells already counted in the 884 baseline via the red suite, −15 deleted D14/D15/F2-r
cells, net matches the item-by-item deletion list above).

### Build number

Bumped: `2026-08-03.306` → `2026-08-05.1`. Judged CODE (js/app.js, js/nav.js changed) — required by
`tools/hooks/shipping-change-bumps-check.mjs`'s own rule. `test/`, `tools/`, `docs/`, `Claude/`
changes in this same commit do not themselves require it, but the js/ changes do.

### Commit

`49efe4f` — all pre-commit gates passed (no-mutbak, no-partial-sequence, stamp, staged-stamp, lint,
typecheck, tests, campaign-gates, stage-manifest, retired-name, device-gate, shipping-bump,
decisionlog-citations). HEAD verified via `git rev-parse HEAD`, not the commit command's exit code.
Not pushed. Handoff: the code reviewer (Poirot), then the coverage auditor (Mendeleev), then the
records scrub (this plan's status, the parent's §12/§13, the campaign manifest's falsified `note`,
the decision log — §11 step 8).

## Fix-then-ship response to Poirot's review (2026-08-05)

Review: `Claude/Poirot/POIROT-swipe-declone-stage2-subtraction-49efe4f.md` (`dc1a9ad`), verdict PASS
— fix-then-ship. Applied the six sanctioned findings (F1–F6). O1/O2 left alone (routed to the
planner, per the review). This is a between-stages fix: no behaviour change, no new stage started.

- **F1 (Significant, registry).** `tools/mutate.mjs` registered `BORROWEDREALSURVIVES`'s replacement
  mutant twice — index 54 (this build's own D13b entry) and index 142 (`S2-29`, already registered by
  Curie at `b2327f5`, unknown to the plan/build). Executed proof: both reported `caught (153 failing)`
  with byte-identical `killed by:` lists. **Fix:** deleted the duplicate (the D13b entry); `S2-29` is
  the sole registration. Comment at its former site corrected to point at `S2-29` rather than claim a
  new registration.
- **F2 (Significant, comment).** `js/app.js`'s SESSION OWNER block (one function above `begin()`)
  stated a PANE-OWNING rejection ("`begin()` still rejects any new gesture there") that D8 deleted —
  the gate is now `if (finishing && !session) return;`, uniform, no PANE-OWNING/PANE-LESS split left
  to gate. Rewritten to state that the split has no second side any more, per decision 12's
  discriminator (a live account of a gone mechanism, not a tombstone).
- **F3 (Minor, vacuous assertions).** Removed `test/swipe-invariants.test.js:462`
  (`assert.equal(ghosts(h), ghostsAfter, ...)`, inside the very cell already repaired once for
  inertness) and `test/swipe-stage6.test.js:340` (`assert.equal(ghosts(h), 0, ...)`) — both
  structurally 0-vs-0 always, no first-party surface can write `.nav-ghost`. Both now-unused
  `ghosts(h)` helpers removed with their last call site. **Not applied:**
  `test/swipe-stage6i.test.js:91`/`:109` — the review names these as the class, not a required fix
  ("may ride with a later purge"); a file this commit does not otherwise touch. Left untouched.
- **F4 (Minor, comment residue).** Four `js/app.js` sites rewritten: the `.213` frame-sampler comment
  (dropped the "pane type logged beside it" claim — the `pane=` token is gone); the "panes go NOW"
  line above `dropAt` (there is no pane to drop any more, not merely an immediate one); "runFinalize
  has THREE exits — the two ghost-held reveals return early" (one exit, no held reveals); the
  `finishing`-restore comment beside the try/finally (dropped the "held path must KEEP it true" branch
  that no longer exists). **Not applied:** `test/home-abort-writes.test.js:249` — the review notes
  this file is untouched by the commit under review and records the citation "as the class." Left
  untouched.
- **F5 (Minor, dead code).** `tools/mutate.mjs:91` `RECOVERY_RENDER_ALWAYS_FALSE` — a dead constant
  (one occurrence, its own declaration) holding the exact pre-collapse line whose byte-identical twin
  (`RECOVERY_RENDER_LINE`) this build already deleted. Removed.
- **F6 (Minor, dead regex).** Two `.replace(/ ghosts=\d+$/, '')` calls on `SWIPE start` log lines
  (`test/swipe-invariants.test.js:297`, `test/swipe-stage6.test.js:267`) — the token they strip is
  gone (D9), so the calls were no-ops; the comparisons now read the full strings directly.

**Registry re-derivation (F1 shifted every index after the removed entry).** Confirmed by re-import:
145 mutants (was 146). Re-derived names → indices: `#13` (`HARDRESET_DISPOSE`, unchanged),
`#20` (the merged scroll-restore entry, unchanged), `S2-28 PILLSWEPT` → `#140` (was 141),
`S2-29 BORROWEDREALSURVIVES` → `#141` (was 142, now the sole entry), `S2-31` → `#143` (was 144),
`S2-32` → `#144` (was 145).

**Targeted mutation sweep** (foreground, explicit indices, never backgrounded):
`node tools/mutation-sweep.mjs 13 20 140 141 143 144` → `swept 6: 0 uncaught, 0 unapplied,
0 stale flags`. `#13` killed by `RECOVERYPARITY.pillswept` (the §5 adjacency, unchanged). `#141`
(`S2-29`, now sole) caught `(153 failing)` — the same count Poirot measured across both
duplicates, confirming the surviving entry alone carries the full designated-kill evidence.
`#140`/`#143`/`#144` all caught exactly as the original build measured. No `*.mutbak` after.

**Docs regenerated.** `js/app.js`'s comment edits (F2, F4) shifted line numbers below them;
`node tools/gen-swipe-model.mjs` / `gen-transition-matrix.mjs` re-run. Diff is three navStack
append-site line numbers only (`707→704`, `708→705`, `1183→1181`); `VERIFIED.supersession`'s hash is
UNCHANGED (both F2 and F4's edits sit outside the pinned `begin()`→`if (target.closest` region) —
confirmed by the unchanged hash in the diff, not asserted.

**Full suite:** 878 tests, 877 pass, 0 fail, 1 skip (device-only), re-run three times (after the
test/comment fixes; after doc regeneration; after the build bump) — green each time after the doc
regen landed (the FIRST post-fix run redenned `763` on the stale doc, as expected, before regenerating).

**`node tools/source-gate-sweep.mjs`** (never imported): exit 0, all four fingerprints RED with the
behavioural control GREEN, `0 uncaught, 0 not-behaviour-neutral`. No `js/app.js.sgbak` left.

**Build number.** Bumped `2026-08-05.1` → `2026-08-05.2`. Judged CODE: `js/app.js` changed
(comment-only), and this project's shipping-bump rule states "in-code comment fixes explicitly
included" — a comment-only edit to a shipping file still bumps. `tools/mutate.mjs`,
`test/swipe-invariants.test.js`, `test/swipe-stage6.test.js` are not shipping paths and would not by
themselves require it. Stamped and `--check`-verified across `sw.js`/`js/debug.js`/`index.html`.

**Not applied, and why:** O1 (the euphemism the token-scan forces into the generated doc) and O2
(`regionHash` pins comments) are Observations the review itself routes to the planner (O1: allow the
tokens inside an explicitly-tombstoned block, or accept and say so; O2: a gate-improvement candidate).
Neither is a finding this seat can close — both require a planning decision about the mechanism, not
a local edit. Left untouched, per "implement ONLY the sanctioned findings."

### Commit

`6b25a15` — all pre-commit gates passed (same twelve as the subtraction commit). HEAD verified via
`git rev-parse HEAD`. Not pushed. This is a between-stages fix; no new stage started. Next: the
user's go to continue (re-review, or the coverage auditor).

## Verdict

verdict: BUILD_GREEN

Declared against HEAD `05d454e` (re-verified 2026-08-05, after Poirot's fix-then-ship review, this
seat's response at `6b25a15`, and Curie's two coverage-audit gap closures) — not against the `49efe4f`
state this log was originally written for. Re-run at that HEAD: full suite 884 tests / 883 pass /
0 fail / 1 skip; full mutation sweep 152/152 mutants (12 shards) / 0 uncaught / 0 unapplied / 0 stale
flags / no `*.mutbak`; `node tools/source-gate-sweep.mjs` (run directly, not imported) exit 0, 4/4
fingerprints caught, 0 not-behaviour-neutral, no `.sgbak` left; tree clean throughout.
