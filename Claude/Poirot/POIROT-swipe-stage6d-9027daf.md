# Poirot casebook — 9027daf — Swipe/reveal Stage 6d (retire the runtime `clobbered` byproduct → declared `finalizationPlanFor.abortRender`)

Type: code-review
Prior-review: ba1c59b-swipe-stage6c.md
Range: js/app.js, js/swipe.js, test/swipe-stage6d.test.js (new), test/swipe-construction.test.js,
test/contract-function-gate.test.js, test/construction-consumers.test.js, test/fixtures/swipe-plan-spec.mjs,
test/swipe-invariants.test.js, test/swipe-model.test.js, test/swipe-stage6.test.js,
test/swipe-stage6b-loser-cancel.test.js, tools/mutate.mjs, tools/gen-swipe-model.mjs,
docs/swipe-model.generated.txt, Claude/Brunel/swipe-stage6d-build.md, Claude/Curie/RED-swipe-stage6d.md
Input artifact: commit 9027daf (HEAD, working tree clean)
Date: 2026-07-27
Runtime: node v22.23.1 at C:/Users/nzilb/tools/node-dist/node.exe

## Verdict

**SHIP / PASS.** This is a byte-parity extraction that does exactly what the ratified plan §2/§3 specifies.
The runtime `sourceWasClobbered`/`clobbered` byproduct is fully retired from `js/**`; the abort/recovery
re-render decision is now the pure, deep-frozen, throws-on-unhandled-kind `finalizationPlanFor(c).abortRender`
(`'rerender'` iff `fromKind==='browse' && toKind==='browse'`), computed once at ARM time and stored frozen on
the session as `cur.finPlan`. I re-derived the equivalence on every reachable (transition, phase) and
EXECUTED the load-bearing mutations this pass: the declared decision equals the retired byproduct
byte-for-byte at the two finalize reads (where `cur.live` is provably always true — `end()` early-returns a
non-live session at app.js:564 before `settle()`/`finalize()` can run) and at the pre-build recovery reader
(where the `cur.live` conjunct reproduces the "build-ran" half, verified load-bearing: dropping it reddens
RC.armed with `recovery renders=["authors"]`). The pure function throws on a malformed EITHER kind (the .227
garbage-fromKind lesson), is exact-key deep-frozen (contract gate), and is registered on both the exact-key
gate and the dead-return drift guard. The flash surface (hold/drop control flow, reveal timing) is untouched
— the diff moves only the render-FLAG value at three sites. Co-changes (construction 4→3 key contract + F6
fold, five re-pointed `mutate.mjs` anchors + new #54, `gen-swipe-model` mirror + regenerated fingerprint,
comment/message sites) are complete and honest. No code defect. The only open items are the plan-sequenced
apply-on-approval records/build-number obligations (§9, Zelda) and continuity items carried from 6c — none of
which a code reviewer requires changed in this immutable target before ship.

## The scene (what the commit does)

A behaviour-preserving relocation of one decision from a runtime byproduct to a declared plan field:

- **`js/swipe.js` — `finalizationPlanFor(c)` added (151–171).** Pure, DOM-free. Validates `fromKind` AND
  `toKind` against `KINDS` (each throws with a named reason on an unhandled value), then returns
  `Object.freeze({ abortRender })` where `abortRender = (c.fromKind==='browse' && c.toKind==='browse') ?
  'rerender' : 'none'`. Exported in the public surface (356).
- **`js/swipe.js` — `sourceWasClobbered` retired from `buildConstruction`.** The `let sourceWasClobbered =
  false` init, the `resolveSource() === hostEl` compute in the `browse-host` incoming branch, and the return
  member are DELETED. The return narrows 4→3 keys `{decorations, movers, capture}`. `resolveSource` now
  serves only the borrowed-real outgoing mover (comment corrected, 302).
- **`js/app.js` — arm literal computes `finPlan` (440–443).** `clobbered: false` is replaced by
  `finPlan: Swipe.finalizationPlanFor(Swipe.classifyTransition({ from, to: dest }))`, so `finPlan` is defined
  (and frozen) for every non-null session, armed or built — load-bearing for the recovery reader that runs on
  a pre-build ARMED session.
- **`js/app.js` — the `d.clobbered = c.sourceWasClobbered` set (was 516) DELETED.**
- **`js/app.js` — three read sites redirected.** The two finalize abort sites (1160 selector, 1187 render
  arg) → `cur.finPlan.abortRender === 'rerender'`; the begin() supersession recovery reader (417) →
  `cur.live && cur.finPlan.abortRender === 'rerender'`. Recovery/start comments (387–398, 466) rewritten to
  current truth.
- **The frozen oracle turned on.** `test/fixtures/swipe-plan-spec.mjs`'s "NOT consumed / absence must not be
  read as verified" caveat removed; the new `test/swipe-stage6d.test.js` FP.oracle compares production
  `finalizationPlanFor` against the hand-written `expectedFinalization` for all 8 structural cases.
- **Co-changes:** construction exact-key contract 4→3 + F6 test deleted (intent folded to FP+AB);
  `contract-function-gate` gains the `finalizationPlanFor` direct-call contract; `construction-consumers`
  adds it to `EXACT_KEY_GATED`; five `mutate.mjs` recovery anchors re-pointed + the swipe5 F6 anchor replaced
  by swipe6d #54; `gen-swipe-model` mirror updated and `docs/swipe-model.generated.txt` + the `supersession`
  fingerprint regenerated (`c5ab2fae…` → `502467fc…`); comment/message-only sites in four suites.

## The history (the night before)

The recovery reader's `cur.live` asymmetry is the crux, and the history explains it. Through stage 6c the
finalizer read `d.clobbered`, set at start()/build (app.js:516, gated by `d.live = true`) to
`sourceWasClobbered = resolveSource() === hostEl` — true only for browse→browse. So `clobbered ≡ live &&
(browse→browse)`. Stage 6c (ba1c59b, my prior PASS) widened the recovery reader to serve a pane-less SETTLING
session and to a THIRD entry case (`finishing && session`). Stage 6d's planner caught that a naive pure
substitution would flip an ARMED browse→browse (superseded before the 8px lock, `live===false`, nothing yet
rendered into `#browse`) from render-FALSE to a spurious `#browse` re-render — because the static
`abortRender` is `'rerender'` for browse→browse regardless of whether build ran. The fix — conjoin `cur.live`
at the recovery reader only, and compute `finPlan` at ARM time so it exists there — is exactly what the diff
does, and it is byte-parity, not a behaviour change.

## What I verified (EXECUTED this pass — commands cited)

- **FP oracle — parity on all 8 structural cases.** `node --test test/swipe-transition.test.js
  test/swipe-stage6d.test.js` → green; FP.oracle compares production `finalizationPlanFor.abortRender`
  against the frozen `expectedFinalization` for every case.
- **The declared decision equals the retired byproduct on every reachable transition (re-derived):**
  browse→browse → `'rerender'`/old true; home→browse (source `#home` ≠ `#browse` host) → `'none'`/old
  computed-false; overlay→browse (overlay source ≠ host) → `'none'`/old computed-false; every non-browse
  destination → `'none'`/old never-computed-false. Matches the frozen oracle exactly.
- **`cur.live` asymmetry justified by reading the control flow.** `end()` (app.js:564)
  `if (!cur.live) { sessionDone(cur); return; }` — a non-live (ARMED) session never enters `settle()`, and
  `settle()` has exactly one caller (568, after that guard). So at the two finalize reads `cur.live` is always
  true and its omission is correct; at the recovery reader — which DOES serve an ARMED session — the conjunct
  is required.
- **`cur.live` conjunct is load-bearing (EXECUTED mutation).** An fs-interceptor stripping `cur.live && ` from
  the recovery reader at harness read (zero production files modified) → RC.armed FAILS with
  `recovery renders=["authors"]` (the spurious re-render the plan warns of). Baseline RC.armed green.
- **The AB false-case guards are not vacuous (EXECUTED the plan's stated fracture mutation).** A
  `Module._compile` interceptor keying `abortRender` on `toKind==='browse'` (so home→browse AND overlay→browse
  wrongly become `'rerender'`) → FP.oracle, AB.noclobber-overlay, AB.noclobber-home all FAIL (3/3). This is the
  Loki fracture; the two computed-but-false cases catch it.
- **Registered mutants redden (EXECUTED).** `node tools/mutate.mjs 54` (force `abortRender='none'`) →
  4 tests red across the FP/AB suites; `#16` (recovery never re-renders) → SR red; `#42` (construction stray
  field) → exact-key red. `mutate.mjs --restore` after each; `git diff --stat js/` clean.
- **Retirement complete in js/**.** `grep -rniE clobber js/` returns ONLY unrelated generic uses (restoreGen,
  snapBrowse comment, syncqueue/shardstore) — no swipe `clobbered`/`sourceWasClobbered` reader or writer
  survives. CLB source-text gate green.
- **`finPlan` is never undefined at a read site.** Sessions are created only at the arm literal (440–443),
  which always sets `finPlan`. Recovery `cur ? (cur.live && cur.finPlan…) : false` guards the orphan-null
  case; the two finalize reads run on a built session; `cur` at all sites traces to the arm object. No
  synthetic session bypasses arm-time compute.
- **Contract, exact-schema, drift.** `contract-function-gate.test.js` 4/4 (direct-call `finalizationPlanFor`
  with a hand-built classification proves the contract off the composed path — the .239 lesson);
  `construction-consumers.test.js` 2/2 (registered on the exact-key gate); FP.contract asserts frozen +
  closed enum + exact key.
- **Co-change gates green.** `swipe-construction.test.js` 12/12 (3-key contract, F6 folded);
  `mutation-anchors.test.js` 2/2 (all five re-pointed anchors + #54 resolve to current source);
  `swipe-model.test.js` 11/11 (the `supersession` pin `502467fc1286f5e1` equals the generator over the
  changed region — the fingerprint moved with the source it mirrors, not gamed).
- **RG parity — full suite.** `node --test "test/*.test.js"` → 712 tests, 711 pass, 0 fail, 1 skip (the
  pre-existing device-only KEEPER). Matches the commit's independent Zelda verification.
- **Flash surface untouched.** Read app.js:1146–1191 in full: both held branches (commit→home,
  abort-browse→browse) call `holdGhostUntilPaintable` identically; `dropPanes`/`revealPending`/the double-rAF
  and 600ms gates are unchanged. The diff moves only the branch-selector VALUE (`cur.finPlan.abortRender===
  'rerender'` vs the old `cur.clobbered`, byte-identical).
- **`swipe-transition.test.js` carries no stale finalization claim** (`grep` → no finalization/abortRender/
  clobbered reference); the oracle's home is the dedicated `swipe-stage6d.test.js`, and the one load-bearing
  caveat (the fixture's "NOT consumed") was correctly cleared.

## Coverage ledger (all cells filled — ✓ executed this pass / ~ read-reasoned / n/a)

| Changed symbol / file | Correctness / parity | Contract / exact-schema | Retirement / scrub | Deferred-resource / flash surface | Fingerprint / gate |
|---|---|---|---|---|---|
| `finalizationPlanFor` (swipe.js:151) | ✓ FP oracle all 8 + ✓ #54/toKind mutations redden | ✓ contract-gate direct call; ✓ FP.contract frozen/exact/enum; ~ throws on BOTH kinds (read) | ✓ pure, no stored flag (EC §4.16) | n/a (DOM-free pure fn) | ✓ swipe-model fingerprint |
| `buildConstruction` 4→3 key (swipe.js:340) | ✓ construction 12/12; ✓ #42 stray reddens | ✓ exact-key `{capture,decorations,movers}` | ✓ `sourceWasClobbered` init+compute+member deleted | ~ resolveSource still serves outgoing mover (read) | ✓ mutation-anchors, fingerprint |
| public surface export (swipe.js:356) | ✓ AB/RC drive it via harness | ✓ construction-consumers EXACT_KEY_GATED | n/a | n/a | ✓ |
| arm literal `finPlan` (app.js:440) | ✓ RC.armed green + ✓ drop-cur.live reddens | ~ frozen immutable value stored once (read) | ✓ replaces `clobbered:false` | ~ per-gesture, not an owned resource | n/a |
| `d.clobbered` set deleted (app.js:~516) | ✓ full suite green (parity) | n/a | ✓ CLB source-text gate absent | n/a | n/a |
| recovery reader (app.js:417) | ✓ EXECUTED drop-cur.live → RC.armed red; ~ 3 boundary re-derivation | n/a | ✓ reads `finPlan`, not `clobbered` | ✓ orphan `cur? :false` short-circuit (read + OB test) | n/a |
| finalize abort selector+arg (app.js:1160/1187) | ✓ AB.clobber TRUE + AB.noclobber FALSE (mutation-verified) | n/a | ✓ reads `finPlan` | ✓ hold/drop control flow unchanged (read 1146–1191; RGheld) | n/a |
| construction/contract/consumers tests | ✓ 12/12, 4/4, 2/2 | ✓ registered both gates | ✓ F6 deleted, intent folded FP+AB | n/a | ✓ |
| swipe-plan-spec.mjs caveat | n/a | n/a | ✓ "NOT consumed" removed; DATA unchanged | n/a | n/a |
| mutate.mjs anchors + #54 | ✓ mutation-anchors 2/2 | n/a | ✓ 5 anchors re-pointed, F6→#54 | n/a | ✓ anchor gate |
| gen-swipe-model + generated.txt | n/a | n/a | ~ mirror updated to finPlan derivation | n/a | ✓ swipe-model 11/11 (regen + re-pin) |
| comment/message sites (4 suites) | ~ read: text matches current code, no code contradiction | n/a | ✓ `clobbered`→declared-decision | n/a | n/a |

Cited commands for ✓ cells: `node --test test/swipe-transition.test.js test/swipe-stage6d.test.js`;
`node --require <scratch>/drop-curlive-fs.cjs --test --test-name-pattern="RC.armed" test/swipe-stage6d.test.js`
(RC.armed red, renders=["authors"]); `node --require <scratch>/key-on-tokind-compile.cjs --test
--test-name-pattern="AB.noclobber|FP.oracle" test/swipe-stage6d.test.js` (3/3 red);
`node tools/mutate.mjs 54|16|42` + `--restore`; `node --test test/swipe-construction.test.js
test/contract-function-gate.test.js test/mutation-anchors.test.js test/swipe-model.test.js
test/construction-consumers.test.js`; `node --test "test/*.test.js"` (711/712); `grep -rniE clobber js/`.

## Findings

| # | Severity | Finding | Owner |
|---|---|---|---|
| — | (none blocking) | No code defect. Byte-parity extraction, correct and scoped, mutation-verified on every reachable transition this pass, retirement complete in js/**, contract pure/frozen/throws, flash surface untouched. | — |
| O1 | Observation | The arm literal now runs `Swipe.classifyTransition({from, to:dest})` at touchstart (was at start()/build). `classifyTransition` throws on an unknown screen / a malformed parameterized descriptor. This opens a new window: a gesture that ARMS over a malformed stacked descriptor and is released/superseded BEFORE the 8px lock would throw at arm where the old `clobbered:false` literal did not. Reachable ONLY on already-broken state (a malformed descriptor on the nav stack would have thrown at start() the first time any gesture locked over it, so the stack is well-formed by construction). Already dispositioned OUT of the parity contract by Charpy (a §5 arm-time-throw plan-prose advisory, unfolded) and Loki (residual throw, "exception-only on an already-broken build"). NOT a code change a reviewer requires — surfaced so it does not slip. | Zelda-to-log / plan prose |
| O2 | Observation | The commit does not bump the build number, though it changes `js/`. Plan §9 explicitly sequences the build-number bump to Zelda's apply-on-approval step (this is the mid-pipeline immutable Poirot target; the 6c SHIP commit bumped, 6d ships after the gate chain). `build.test.js` stamp-coherence passes (the stamp is self-consistent, just not advanced). Records/deploy sequencing, not a code defect. | Zelda (records/deploy) |

Disposition: O1/O2 are neither do-not-ship nor fix-then-ship. O1 is dispositioned out of scope by two upstream
seats and by the ratified plan; O2 is plan-sequenced apply-on-approval. Both are surfaced for honesty so
neither slips (Poirot "account for everything"). No finding reopens a settled decision.

## Prediction

The extraction is correct and singular, so the code is safe; the hazards are downstream, in the deferred set:

- **The `finPlan` seam is now the anchor the rest of finalization composes into.** When the pane-lifecycle
  slice (F) and reveal-centralization (C) land `commit`/`stackEffect`/`paneRemovalPolicy`/`reveal`, they will
  extend `finalizationPlanFor` (a second field justifies the unified `planFor()` wrapper). The single-primitive
  `Object.freeze` is deep today ONLY because `abortRender` is a string; the moment a field carries an object or
  array, the contract needs a genuine deep freeze and a clone-before-freeze on any caller-owned input — the
  same class the exact-key gate already guards for `constructionPlanFor`. Whoever adds the second field must not
  read the current shallow freeze as proof deep-freeze is unnecessary.
- **O1's arm-time throw will stop being harmless the instant an arm-reachable descriptor can be malformed.**
  Today the nav stack is well-formed by construction; a future entry point that arms a swipe over a
  freshly-built or externally-supplied descriptor (before it has ever been through start()) would surface the
  throw on a live gesture, not a broken one. The cheap durable close is a plan/comment note that the arm-time
  `classifyTransition` is now a reachable throw site — the Charpy advisory that remains unfolded.
- **The `cur.live` conjunct is a parity subtlety a later refactor can silently drop.** It reads like
  redundant defensiveness next to the two finalize sites that omit it; a future "simplification" that unifies
  the three readers onto one predicate would reintroduce the spurious ARMED re-render. RC.armed is the guard;
  it must survive any such unification.

## Watch-list

- **[W1] open** — Stage-6b records reconciliation (`Claude/Subsystems/swipe-reveal.md` §8, DecisionLog "Owed
  to stage 6", `PLAN-swipe-reveal.md` §7) still un-applied in HEAD; carried from 8e968fb → ba1c59b. Owner
  Zelda; close before the stage line is called complete. Not a code matter.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition landing
  between the outer and inner frames is un-executed (resource-plane only). Carried from 8e968fb; unaffected by
  6d. Carry until an on-device strike or the 6d/7 reveal-centralization.
- **[W4] open** — Plan §10 apply-on-approval records for 6c, notably the `js/app.js:722` classifier comment
  (O2 of ba1c59b: false "app-ghost (browse→browse)") — the Loki-named entry point for the r3 misclassification,
  must be corrected before the stage line is complete (§6.6). Owner Zelda. (6c's W3 campaign-name item is
  resolved for 6d: `Claude/Campaigns/swipe-stage6d.json` exists under the permissive glob, plan §9.)
- **[W5] open** — Loki r2 lesser-planes: `recovery-overlay-visibility-unpinned` → coverage seat (Mendeleev,
  next); `paneless-predicate-phase-coupling` (a one-line build assert would make `paneLess([])` structural) →
  optional hardening, owner Brunel. Carried from ba1c59b; unaffected by 6d.
- **[W6] open** — O1(6c) design consequence `any-touch-cancels-committed-settle-ux`: a stray touch during a
  pane-less commit settle rolls back the transition; the design seat should settle the arm-check-vs-recovery
  ordering before 6d/7 extends supersession to home↔browse. Owner design seat. Carried from ba1c59b.
- **[W7] open (new, 6d)** — Plan §9 apply-on-approval records for 6d, un-applied in HEAD: rewrite
  `Claude/Subsystems/swipe-reveal.md` §17/§23 (finalizationPlanFor composes the abort decision; host-field
  reintroduction deferred to its consumer slice, not 6d); append the dated Stage-6d DecisionLog entry
  (`clobbered`/`sourceWasClobbered` retired → declared `finalizationPlanFor.abortRender`; behaviour-preserving
  extraction, no known-red, no PolicyLedger entry); annotate `PLAN-swipe-reveal.md` §7 step 6 (6d sliced); bump
  the build number (O2). Owner Zelda. Not a code matter.
- **[W8] open (new, 6d)** — The arm-time `classifyTransition` throw (O1) has no durable home yet — the Charpy
  §5 arm-time-throw plan-prose clause remains unfolded (Vitruvius session limit). A future arm-reachable
  malformed descriptor would surface it on a live gesture. Owner Vitruvius/Zelda; plan prose, not code.

---

{"persona":"poirot","stage":"6d","input_artifact":"9027daf","verdict":"SHIP","blocking_ids":[],"return_to":"none"}
