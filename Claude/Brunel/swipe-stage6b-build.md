# BUILD — Swipe/reveal Stage 6b (cancel the finalize/reveal loser timer + frame handles)

Type: build log (Brunel)
Date: 2026-07-26
Input plan: `Claude/Plans/PLAN-swipe-stage6b.md` (`0d27701`), §2/§6
Input red suite: `Claude/Curie/RED-swipe-stage6b.md` — `test/swipe-stage6b-loser-cancel.test.js` (DF, RR(a), RR(b), RR(c))
Verdict: **BUILD_GREEN**

## 1. Exact slice completed

Realized plan §2/§6: the three bare loser continuations in `settle()`'s inner `finalize`
and `holdGhostUntilPaintable` (`js/app.js`) became session-owned handles, each cancelled
at exactly one resolver.

- `cur.settleTimer` — the 340ms finalize fallback (`setTimeout(finalize, 340)`) is now
  stored on the session at its scheduling site (`js/app.js:1182`) and cleared by
  `finalize()` (`js/app.js:1168`) alongside the existing `cancelAnimationFrame(cur.settleFrame)`.
- `cur.revealFrames` — the reveal paint gate's double-`rAF` (`js/app.js:806-812`) is a
  two-entry handle: the outer callback re-stores the inner frame id onto the same field
  before scheduling it, so the field always names the currently-pending frame. The
  winning `drop()` cancels it with one `cancelAnimationFrame(cur.revealFrames)`
  (`js/app.js:758`).
- `cur.revealTimer` — the reveal 600ms safety-net (`js/app.js:812`) is stored on the
  session and cleared by the winning `drop()` (`js/app.js:759`).

## 2. Files changed

- `js/app.js` — production. Four edits, all inside `settle()`'s `finalize`/
  `holdGhostUntilPaintable`: (1) `drop()` gains the two loser-cancels at its guard
  (`cancelAnimationFrame(cur.revealFrames)`, `clearTimeout(cur.revealTimer)`); (2) the
  reveal double-`rAF` stores the outer id and re-stores the inner id onto
  `cur.revealFrames`, and the 600ms safety-net is stored as `cur.revealTimer`; (3)
  `finalize()` gains `clearTimeout(cur.settleTimer)` alongside the shipped
  `cancelAnimationFrame(cur.settleFrame)`; (4) the 340ms fallback's `setTimeout` return
  value is stored as `cur.settleTimer`.
- `docs/swipe-model.generated.txt` — regenerated build tooling output (`node
  tools/gen-swipe-model.mjs`). Only one line changed: a stale source-line citation
  (`js/app.js:1250` → `js/app.js:1272`) in the append-census list, an artifact of the
  four production edits above shifting later line numbers. The four SOURCE FINGERPRINT
  hashes (`navTo stack rule`, `begin/nav-relation`, `end/state-routing`,
  `begin/supersession`) are unchanged — none of those mirrored regions were touched.
  Not a VERIFIED pin; this is the generator/committed-doc sync check
  (`test/swipe-model.test.js`), regenerated per the build assignment's model-gate note.

No test file, `test/app-harness.js`, or `Claude/Decisions/PolicyLedger.mjs` was touched.

## 3. Public paths exercised

`settle()` → `finalize()` (the `transitionend`-vs-340ms race) and `settle()` →
`holdGhostUntilPaintable()` → `drop()` (the decode/paint-gate-vs-600ms race), driven
through the real app-harness (`h.touch`, `h.clock`, `h.raf`) exactly as before — no new
public entry point, no new asynchronous surface.

## 4. Production behavior changed / deliberately unchanged

**Changed (resource release only, no user-visible effect):** a loser continuation that
previously stayed queued to fire a `done`/`dropped`-guarded no-op now leaves the fake
scheduler queue at its resolver, ~340ms/600ms/one-frame earlier than it would have fired.

**Deliberately unchanged (parity, per plan §2):**
- The shipped `cancelAnimationFrame(cur.settleFrame)` (.226) — untouched, same line,
  same position.
- The `done`/`dropped` exactly-once guards — untouched; the new cancels run inside the
  existing single-run bodies, after the guard is already set.
- The `transitionend` listener (`{once:true}`) — untouched; not session-owned, not
  removed (deferred, plan §11).
- The reveal choreography, `runFinalize`, `fadePanes`, the flash diagnostics, the
  finalize/drop bodies' effects — unchanged.
- No timing changed: the 340ms/600ms delays and the double-`rAF` structure are the same:
  only whether the loser is cancelled changed.

## 5. Parity vs new policy

Resource-release / lifecycle-ownership (Engineering Contract §4.3/§4.14), not new user
policy — classified in the plan (§3, "Why parity at the user layer") and unchanged by
the build.

## 6. Contracts / identities / dead fields

No `vitruvius-contract` exact-key schema was touched (plan: `contract_shape: false`; the
gesture session `d`/`cur` is exempt mutable lifecycle state, not a registered
`classifyTransition`/`buildConstruction` contract). No identifier was created or
reinterpreted. All three new fields have a real production consumer in this same slice
(their single resolver's cancel) — no dead field (§4.15); the deferred NULL-write half of
the "Owed to stage 6" debt was NOT added (plan §3, Charpy r2 F5 rationale) — confirmed
not written by this build.

## 7. Resources moved under ownership / ownership endpoints

`cur.settleTimer`, `cur.revealFrames`, `cur.revealTimer` are now session-owned handles
with one accountable owner each (`finalize` for the first, `drop` for the other two).
Ownership endpoint is unchanged: `sessionDone(cur)` still runs after the resolver
(`session === null` on the terminal path, regression `RGend`, unaffected).

## 8. Asynchronous continuations controlled

Each of the three loser continuations is now actively cancelled at the single resolver
that decides the race, rather than left to fire and hit its guard as a no-op. No new
continuation was introduced.

## 9. Intermediate states asserted

Not applicable to this build directly — the red suite (Curie) asserts the queue state
both before and after each resolver (fixture-sanity asserts the loser is pending before
the resolver runs, the claim assertion checks it is gone after).

## 10. Exact mutation evidence (Gate B, per-cell)

### Cell DF
- Designated test: `DF — finalize clears the 340ms settle fallback when transitionend wins`
  (`test/swipe-stage6b-loser-cancel.test.js:106`)
- Production seam: `finalize()`, `clearTimeout(cur.settleTimer)` (`js/app.js:1168`)
- Green before mutation: confirmed (`node --test test/swipe-stage6b-loser-cancel.test.js`,
  4/4 pass).
- Mutation applied: commented out `clearTimeout(cur.settleTimer);` in `finalize()`
  (omission mutation).
- Designated test failing on the intended assertion:
  `error: 'finalize must clear the 340ms settle fallback when transitionend wins; id 1
  still pending in [{"id":1,"ms":340,...},{"id":2,"ms":500,...},{"id":3,"ms":600,...}]'`
  — the exact claim assertion named in the red report, not a harness/import failure.
- Restored to green: confirmed (`--test-name-pattern="DF"`, 1/1 pass).

### Cell RR — omission mutation (all three interleavings)
- Designated tests: `RR(a)`, `RR(b)`, `RR(c)` (`test/swipe-stage6b-loser-cancel.test.js:147,179,212`)
- Production seam: `drop()`, `cancelAnimationFrame(cur.revealFrames)` /
  `clearTimeout(cur.revealTimer)` (`js/app.js:758-759`)
- Mutation applied: commented out both cancel lines in `drop()`.
- Designated tests failing on the intended assertion, all three:
  - RR(a): `outer id 2 still queued in [2,3]`
  - RR(b): `inner id 3 still queued in [3,4]`
  - RR(c): `id 3 still pending in [{"id":2,"ms":500,...},{"id":3,"ms":600,...},{"id":4,"ms":60,...}]`
- Restored to green: confirmed (`cancelAnimationFrame`/`clearTimeout` restored;
  `--test-name-pattern="RR"`, 3/3 pass).

### Cell RR(b) — misattribution mutation (the killed single-outer-id design)
- Designated test: `RR(b) — HALF-FIRED (outer spent, inner pending), timeout wins: drop()
  cancels the INNER frame` (`test/swipe-stage6b-loser-cancel.test.js:179`)
- Production seam: the reveal double-`rAF` (`js/app.js:806-812`) — reverted the inner
  callback's re-store so only the outer id is ever held in `cur.revealFrames` (the
  construction Loki killed).
- Mutation applied: `cur.revealFrames = requestAnimationFrame(() => { requestAnimationFrame(() => {...}); });`
  — inner id no longer re-stored.
- Result: **RR(b) reddens on its intended assertion** — `inner id 3 still queued in
  [3,4]` — while **RR(a) and RR(c) stay green** (2 pass / 1 fail on the `RR` pattern),
  confirming RR(b) is the cell that specifically distinguishes the two-entry design from
  the killed single-outer-id design, exactly as the plan (§3 item 3) and the red report
  state.
- Restored to green: confirmed (`--test-name-pattern="RR"`, 3/3 pass after restore).

All four mutations were misattribution/omission on a real production seam (Engineering
Contract §4.10), not total-omission-only; each reddened the DESIGNATED test on its
INTENDED assertion (not a broad suite failure), and each was restored to green before
the next mutation was applied. `git diff js/app.js` after the full mutation/restore
cycle shows only the four intended plan §2 edits — no mutation artifact remains.

## 11. Known-red tests still open

None. This slice introduces no known-red (plan §8, confirmed by the build: no
`Claude/Decisions/PolicyLedger.mjs` entry added or needed).

## 12. Dead fields introduced, consumed, or removed

None introduced. All three new fields (`cur.settleTimer`, `cur.revealFrames`,
`cur.revealTimer`) have a real production consumer in this slice (§6 above).

## 13. Temporary exceptions and expiration

None.

## 14. Deferred work and assigned stage

Unchanged from plan §11 — deferred to the I12 stage: the NULL-on-retire writes on all
four handles (including the pre-existing `cur.settleFrame`), the `transitionListener`
session-ownership + removal, and the per-handle-liveness observability surface. Deferred
to Stage 6c/7: the finalize/reveal centralization, `finalizationPlanFor`,
`sameBrowseHost`, pane `release()`/`dispose(reason)`, I10 paint-gated reveal
centralization, the full `recoverSession` matrix, the `fadePanes` per-pane cleanup. None
of this was built in this slice, per plan §11.

## 15. Full test / build-coherence / behavioral-mutation / source-gate results

- Target red suite before build: `test/swipe-stage6b-loser-cancel.test.js` — 4 fail (DF,
  RR(a), RR(b), RR(c)), as captured in the Curie red report.
- Target suite after build: `node --test test/swipe-stage6b-loser-cancel.test.js` —
  **4 pass / 0 fail**.
- Full suite after build (`node --test "test/*.test.js"`) — **698 tests, 697 pass, 0
  fail, 1 skipped, 0 todo** (the pre-existing skip is unrelated to this slice). This
  includes the RG* regressions `RGcancel`/`RG13`/`RGH`/`RGT`/`RGend`
  (`test/swipe-invariants.test.js`), all green; the §4.19 policy-ledger gate, the
  descriptor-coverage gate, the contract-function gate, the mutation-anchors gate, the
  build-stamp coherence test, and the transition-matrix/swipe-model fingerprint pins —
  all green.
- Gate A: not applicable — no `vitruvius-contract` block in this plan (§ Applicability:
  `contract_shape: false`); the code-level returned-key reachability gate
  (`test/construction-consumers.test.js`) is unaffected and stayed green in the full-suite
  run.
- Gate B: closed for both assigned cells (DF, RR) — see §10, full designated-test
  mutation evidence for each.

## 16. Fingerprint / model-gate note

`docs/swipe-model.generated.txt` was regenerated (`node tools/gen-swipe-model.mjs`) after
the production edits shifted later line numbers in `js/app.js`. The only change is one
stale line-number citation (`js/app.js:1250` → `js/app.js:1272`); the four SOURCE
FINGERPRINT hashes in that document are **unchanged**:
`navTo stack rule 0e84abdf6d072586`, `begin/nav-relation ac356cd1a669c2a3`,
`end/state-routing 9a82592f5d21db7b`, `begin/supersession d39534854e3cc348`. No VERIFIED
pin was edited; `test/swipe-model.test.js` (11/11) and `test/transition-matrix.test.js`
are green in the full-suite run above.

## 17. Statements from the assignment narrowed after inspecting production

None. The plan's §2 mechanism (re-store the inner id onto `cur.revealFrames`) matched
the actual double-`rAF` structure at `js/app.js:794` (pre-build line) exactly as
described; no gap was found at the bench.

## 18. Build-number bump owed

Not performed here — per the build assignment, Brunel does not commit; a build-number
bump is owed on this change (PWA deploy rule: any commit bumps the build number) at
commit time.

## 19. Handoff

- **Source artifact:** `Claude/Plans/PLAN-swipe-stage6b.md` (`0d27701`), §2/§6.
- **Verdict:** BUILD_GREEN.
- **Next owner:** Poirot (code review), then Mendeleev (coverage audit), then Loki
  (strike the §3 correct-loser promise), per plan §12 sequencing.
- **Records:** this report filed at `Claude/Brunel/swipe-stage6b-build.md`. No git
  commit/add performed (per assignment); a build-number bump and the plan §10 records
  reconciliation (subsystem addendum, decision log, `PLAN-swipe-reveal.md` §7
  annotation) remain owed at commit time.
