# Code Review — Swipe/reveal Stage 5 (`buildConstruction` four-key return) — build 2026-07-25.242

Type: code-review
Prior-review: 6bf0d20-swipe-stage5-buildconstruction.md
Range: f6d6985..0049a13 (the single commit 0049a13; HEAD)
Reviewer: Poirot
Date: 2026-07-25
Plan of record: `Claude/Plans/PLAN-swipe-stage5.md` (APPROVED/RATIFIED, §3 CONTRACT REVISION 2026-07-24).
Red suite: `Claude/Curie/RED-swipe-stage5.md`. Build log: `Claude/Brunel/swipe-stage5-buildconstruction-green.md`.

The scene was staged for me generously — plan, red report, build report, the exact claim. I took every
fact and none of the conclusions. What follows is what I confirmed with my own eyes and my own commands.

## Verdict

**SHIP (PASS).** The return narrows to exactly the ratified four keys
`{ decorations, movers, capture, sourceWasClobbered }`; `classification` and the `plan` wrapper are gone;
`decorations` is hoisted and projected to `{ kind, base }`; the sole consumer `start()` was migrated to
`c.decorations` in the same commit and reads a shape and semantics that match what the seam now produces.
No dead returned field remains — proven by execution, not by argument. The dead-classification known-red
(watch item **W21**) is genuinely resolved and correctly retired. No blocking finding; nothing a competent
reviewer would require changed before submit.

## Findings table

| # | Severity | Finding |
|---|---|---|
| — | — | None. |

## The investigation

**The intent (Phase 1).** One coherent change: shrink `buildConstruction`'s return from the pre-revision
five keys to the ratified four, dropping the internally-consumed `classification` and the dead `plan`
wrapper, hoisting `plan.decorations` to the top level projected to `{ kind, base }`, and migrating the one
L3 consumer. Scope matches the description exactly; the rest of the diff is the mechanical consequences
(one doc regeneration, the retired known-red, the build stamp).

**The production seam (`js/swipe.js:272–328`, read in full).** The return literal is
`{ decorations, movers: { outgoing, incoming, decoration }, capture, sourceWasClobbered }` — four keys,
matching plan §3 (lines 144–159) and Curie's `CONSTRUCTION_KEYS`. `decorations` is
`plan.decorations.map(({ kind, base }) => ({ kind, base }))` — the `role` leaf stripped. `classification`
is still `const`-derived at line 273 and consumed internally (host resolution line 275, plan derivation
line 274); it is simply not a member of the return. The `plan` wrapper's other fields
(`plan.outgoing`/`incoming`/`renderDestination`) are consumed only inside the function (lines 291/301/305).
No dead returned member.

**The consumer (`js/app.js:440–484`, read in full).** `const c = Swipe.buildConstruction(...)` (line 450).
The reads: `c.movers.{outgoing,incoming,decoration}` (458–459), `c.capture` with `'ghostY' in c.capture`
and `c.capture.animSync/animRes` (464–467), `c.sourceWasClobbered` (470), and `c.decorations` iterated at
476 reading `deco.kind` and `deco.base` (477). Every read is a property access (`c.<field>`), not a
destructure. All four returned keys are consumed, and the shapes line up: the projected `{ kind, base }`
gives the consumer exactly the two leaves it reads. `deco.base` is the slot string (`'outgoing'`), the same
value the internal loop uses as the mover slot — consistent. This is behaviour-preserving: the old
consumer iterated `c.plan.decorations` (raw, with `role`) under the identical `kind`/`base` filter, so the
iterated logical set is unchanged; only the unread `role` leaf is gone.

**The regenerated doc (`docs/swipe-model.generated.txt`).** The only change is three `navStack`-citation
line numbers shifted +2 (698/699/1233 → 700/701/1235), the exact consequence of the +2 net comment lines
added at `app.js:473–475`. No mirrored rule, census, or fingerprint changed. Confirmed clean by the model
gate (below).

**Repo-wide scrub (Phase 4).** Grep for any surviving `c.plan.`, `.plan.decorations`, or `.classification`
read across the tracked tree: none in production or tests. The `app.js:475`, `construction-consumers.test.js:6`,
and `dead-return-fields.mjs:10` hits are explanatory comments referencing the historical case, not live
reads. The `.claude/worktrees/**` hits are in git-ignored, untracked detached worktrees (verified:
`git ls-files` empty, `git check-ignore` positive) — not part of HEAD, so no §6.6 scrub gap in the
committed tree. `buildConstruction` has exactly one production call site (`start()`), correctly registered
as the sole consumer in `tools/dead-return-fields.mjs` `SEAM_REGISTRY`.

## Coverage Ledger

Every changed symbol enumerated from the diff × the review dimensions. `✓` = cleared by a command run this
pass (cited); `~` = cleared by reading/reasoning; `n/a` = not applicable.

| Symbol / file (changed) | Correctness / data-flow | Dead-field (§17) | Consumer-match | Test-can-fail | Records / honesty |
|---|---|---|---|---|---|
| `js/swipe.js` `buildConstruction` return | ✓ keys `[capture,decorations,movers,sourceWasClobbered]` (probe) | ✓ detector `[]`, non-vacuous (probe) | ✓ `start()` reads all 4 (probe + read) | n/a (prod) | ~ comment accurate to code |
| `js/swipe.js` `decorations` projection | ~ strips `role`; `kind`/`base` preserved; parity with old set | n/a | ✓ `deco.kind`/`deco.base` read (read) | n/a | ~ |
| `js/app.js` `start()` consumer (`c.decorations`) | ~ shape+semantics match produced 4-key | ~ no new field | ✓ property-access reads (read) | n/a | ~ comment accurate |
| `docs/swipe-model.generated.txt` | ~ +2 line-shift only | n/a | n/a | n/a | ✓ model gate green (`swipe-model.test.js`) |
| `test/swipe-construction.test.js` | ~ exact-key sorted deepEqual | n/a | n/a | ✓ RED report + 13/13 green (test run) | ~ no stale deleted-constant refs (grep) |
| `test/construction-consumers.test.js` | ~ HARD GATE unconditional; DRIFT GUARD keeps seam registered | ✓ asserts `dead===[]` (test run 2/2) | n/a | ✓ 2 tests, 0 todo (retired KR gone) | ~ subsumption argument holds |
| `Claude/Decisions/PolicyLedger.mjs` | n/a | n/a | n/a | n/a | ✓ ledger gate green — no stale/undeclared (`policy-ledger-gate.test.js`) |
| `Claude/Decisions/DecisionLog.md` | n/a | n/a | n/a | n/a | ~ appended (not inserted), dated, current-truth (§6.2) |
| `build.json` / `sw.js` / `js/debug.js` / `index.html` | n/a | n/a | n/a | n/a | ✓ stamp-only; coherence gate green (`build.test.js`); index.html pure cache-bust (grep) |
| `Claude/Zelda/Board.md` | n/a | n/a | n/a | n/a | ~ tactical record (Zelda's craft) |

Commands cited for `✓` cells (all run this pass, `NODE=C:/Users/nzilb/tools/node-dist/node.exe`):
- `$NODE tools/dead-return-fields.mjs` → exit 0, "all returned fields have a consumer".
- Probe (`deadReturnFields`/`returnKeys`): parsed keys `[capture,decorations,movers,sourceWasClobbered]`;
  real `start()` dead `[]`; **synthetic consumer omitting `decorations` → dead `["decorations"]`** — the
  gate is non-vacuous, it can fail.
- `$NODE --test test/swipe-construction.test.js` → 13 pass / 0 fail / 0 todo.
- `$NODE --test test/construction-consumers.test.js` → 2 pass / 0 fail / 0 todo.
- `$NODE --test "test/*.test.js"` → 683 tests, 681 pass, 0 fail, 2 todo.
- `$NODE --test test/policy-ledger-gate.test.js test/build.test.js test/swipe-model.test.js` → 22/22.
- `grep -nE "CLASSIFICATION_KEYS|PLAN_KEYS" test/swipe-construction.test.js` → none.
- `git ls-files "*.claude/worktrees/*"` empty; `git check-ignore .claude/worktrees/` positive.

## The prediction (Phase 6)

Nothing here is scheduled to break. The narrowing removes the exact class the .239 review shipped by
accident — a returned field consumed internally yet dead on the object — and it is now gated
*unconditionally* rather than tracked-open: the HARD GATE in `construction-consumers.test.js` asserts
`seamDeadFields('buildConstruction') === []` for every registered seam, and the DRIFT GUARD forbids a
future NON_CONTRACT object-returning seam (Stage 6's `finalizationPlanFor`/`planFor`) from escaping the
registry. The one residual to watch is not this commit's: the gate's `<var>.<field>` scan cannot see a
consumer that *destructures* the result. `start()` uses property access, so the guard is honest today; if a
future consumer is added that destructures `c`, the detector would false-positive and the seam would have to
move to the exact-key gate — the residual already documented in `dead-return-fields.mjs` and in this seat's
disciplines. No action now.

## Watch-list

Carries forward every OPEN item from `6bf0d20-swipe-stage5-buildconstruction.md`; the next review MUST
forward every OPEN item below.

- [W11] (open, minor) O2 — `start()` calls `buildConstruction` un-wrapped; a malformed live descriptor
  would throw out of the touchmove handler. Unreachable in normal flow (nav-stack descriptors), unchanged
  by this commit (0049a13 changes only the return shape, not the call guard). Confirm acceptable or wrap.
- [W16] (open — `sameBrowseHost` half) The Stage-6 host field `sameBrowseHost` must return to the
  classification ONLY in the commit that adds its consumer (the abort re-render) + test. Untouched by
  0049a13; `classifyTransition`'s key set is unchanged (`swipe-transition.test.js` still green). The
  exact-key gates remain the tripwire.
- [W18] (open, observation) `changedFiles`/`parseChangedFiles` grammar coupling in `tools/mutation-sweep.mjs`
  (one of the three unrelated uncommitted files, out of scope for this review). Untouched by 0049a13.
- [W20] (open, standing) On-device parity verification for Stage 5 (and the whole swipe arc) is owed —
  everything shipped is SHIPPED-UNVERIFIED on device. The DecisionLog entry for this build correctly records
  "Bench only; the on-device hold applies; not yet pushed/deployed." Not folded into this bench review.
- [W21] (resolved: this build — 0049a13) F1 — `Construction.classification` dead returned field.
  `classification` is no longer a return member; `tools/dead-return-fields.mjs` reports zero dead fields
  (verified non-vacuous by probe this pass); the known-red `KR-swipe-construction-dead-classification` and
  its `{todo}` test + `TRACKED_OPEN` allowlist are removed, and the HARD GATE now asserts zero dead fields
  unconditionally. Coverage is subsumed by the standing DRIFT GUARD + HARD GATE (the removed test asserted a
  strict subset). Graduated.
- [W22] (open, → Mendeleev) Coverage gaps O3/O4: F5a payload-passthrough not pinned by a test/mutation;
  F1a's "L3 forgets a key" half has no registered mutation. Untouched by 0049a13 (it changes neither the L2
  payload path nor the L3 mover mapping). Still owed to the coverage auditor.

```json
{"persona":"poirot","stage":5,"input_artifact":"0049a13","verdict":"PASS","blocking_ids":[],"return_to":"none"}
```
