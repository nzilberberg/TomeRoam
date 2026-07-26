# Poirot casebook — 8e968fb — Swipe/reveal Stage 6b (loser-continuation cancel)

Type: code-review
Prior-review: none
Range: build.json, docs/swipe-model.generated.txt, index.html, js/app.js, js/debug.js, sw.js,
test/app-harness.js, test/swipe-stage6b-loser-cancel.test.js, Claude/Brunel/swipe-stage6b-build.md,
Claude/Curie/RED-swipe-stage6b.md
Input artifact: commit 8e968fb (HEAD, working tree clean)
Date: 2026-07-26

## Verdict

**SHIP / PASS.** The four production edits in `js/app.js` `settle()` implement the ratified plan's
§2/§6 loser-cancel exactly, in the two-id reveal-frame shape Loki cleared as HELD_STONE. The change is
correct, complete for its slice, and mutation-verified by execution this pass. Every reassuring comment
and the one absolute claim ("always names the currently-pending frame") is verified against executed
behaviour, not read past. No code defect found. One standing NON-CODE obligation — the plan §10 records
reconciliation — is left un-applied in HEAD; it is explicitly plan-deferred to on-approval work (owner:
Zelda), so it is not grounds to return the code to a maker, but it must close before the stage is
called complete (Prediction / W1).

## The scene (what the commit does)

`settle()`'s three bare loser continuations become session-owned handles, each cancelled at one
resolver:
- `cur.settleTimer` — the 340ms finalize fallback, stored at `js/app.js:1182`, cleared by `finalize()`
  at `:1168` (beside the shipped `.226` `cancelAnimationFrame(cur.settleFrame)` at `:1163`).
- `cur.revealFrames` — the reveal double-`rAF` at `:809-810`, a TWO-entry handle: the outer callback
  re-stores the inner id onto the same field before scheduling it, so the field always names the
  currently-pending frame; `drop()` cancels it once at `:758`.
- `cur.revealTimer` — the reveal 600ms safety-net, stored at `:812`, cleared by `drop()` at `:759`.

The other seven changed files are non-behavioural: build.json / js/debug.js / sw.js / index.html are the
mechanical `.249 → .250` build-stamp bump (PWA deploy rule, guarded by `test/build.test.js`);
docs/swipe-model.generated.txt is a regenerated line-citation shift; the two Claude/* files are records.

## What I verified (executed this pass)

- **Diff = plan.** `git show 8e968fb -- js/app.js` is exactly the four §2/§6 edits and comments —
  nothing else in app.js. Matches Brunel's build report and the plan's `contract_shape:false` shrink.
- **Suite green on the committed tree.** `node --test test/swipe-stage6b-loser-cancel.test.js
  test/swipe-invariants.test.js` → 27/27 (the 4 new cells + the 23 invariants incl.
  RGcancel/RG13/RGH/RGT/RGend). Full suite `node --test "test/*.test.js"` → 698 tests, 697 pass, 0 fail,
  1 skip, 0 todo — matches Brunel §15; the additive harness change is inert.
- **The tests can fail, and RR(b) is the discriminator.** A disposable probe intercepting the harness's
  `fs.readFileSync(js/app.js)` reverted the inner-id re-store to the Loki-killed single-outer-id design
  and ran the COMMITTED test file: RR(b) reddened on its intended claim assertion (`drop() must cancel
  the CURRENTLY-PENDING reveal frame (the inner), not the spent outer; inner id 3 still queued in
  [3,4]`) while DF / RR(a) / RR(c) stayed green — independently reproducing Brunel §10's misattribution
  evidence. The two-id design genuinely defeats the construction that killed the prior draft.
- **Gates green.** `node --test test/build.test.js test/swipe-model.test.js test/transition-matrix.test.js
  test/policy-ledger-gate.test.js test/no-silent-coverage-exit-gate.test.js` → 26/26. Build-stamp
  lockstep, model fingerprint, transition matrix, policy-ledger (no untracked known-red — the
  plain-failing-test representation holds), and the no-silent-coverage-exit gate all pass.
- **Generator honest, no gate gamed.** The docs diff changed ONE line (`js/app.js:1250 → :1272`); the
  four SOURCE FINGERPRINT hashes are absent from the diff and match Brunel's report
  (`0e84abdf6d072586`, `ac356cd1a669c2a3`, `9a82592f5d21db7b`, `d39534854e3cc348`). Line 1272 is
  verified to be `navStack = [{ v: 'home' }];`, so the citation is correct. `test/swipe-model.test.js`
  (the sync oracle) is green.
- **No field collision, no dead field.** `grep -rnE "settleTimer|revealTimer|revealFrames|settleFrame"
  js/` shows each new field only at its own producer/consumer sites; `settleFrame` is the untouched
  pre-existing `.226` handle. Each new field has a real consumer this slice (its resolver's cancel) —
  no §4.15 dead field. The deferred NULL-write half is confirmed NOT written.
- **Reassuring comments / absolute claim.** `:754-757`, `:802-808`, `:1164-1167` each verified against
  executed behaviour (RR mutation + DF + Loki r2 S1–S8). The absolute "always names the currently-pending
  frame" holds across every interleaving Loki executed and the half-fired case I re-ran.
- **Teardown-symmetry / re-entry.** The only exit path that ends these handles' ownership is the normal
  resolver (finalize/drop). A superseded session is pre-`settle()` and owns none of them; `begin()`
  rejects while `finishing`; a stale `{once:true}` transitionend is `done`-guarded before any cancel
  runs (Loki r2 S5/S6, HELD_STONE). Emergency disposal touches no settling session. No other exit
  leaves a loser live.

## Coverage ledger (all cells filled — ✓ executed / ~ read-reasoned / n/a)

| Changed symbol / file | Correctness | Deferred-cancel sweep | Lifetime / teardown-symmetry | Comment / absolute-claim | Fingerprint / gate |
|---|---|---|---|---|---|
| `drop()` cancels (`:758-759`) | ✓ RR(a/b/c) + single-id mutation | ✓ both reveal losers cancelled | ~ single owner `drop`, dropped-guarded | ✓ `:754-757` verified | n/a |
| reveal two-id `rAF` + `revealTimer` (`:809-812`) | ✓ RR(b) discriminates two-id vs single-id | ✓ pending frame always named | ~ re-store atomic (Loki r2 §4) | ✓ `:802-808` + "always" verified | n/a |
| `finalize` `clearTimeout(settleTimer)` (`:1168`) | ✓ DF executed | ✓ 340ms loser cleared | ~ done-guarded, single run | ✓ `:1164-1167` verified | n/a |
| `settleTimer` store (`:1182`) | ✓ DF | ✓ produced→consumed same slice | ~ set before any finalize fires | n/a | n/a |
| harness `+ms` field (`:349`) | ✓ full suite green | n/a | ~ additive, non-destructive | n/a | ✓ suite |
| harness `pendingDump`/`pendingIds` | ✓ used by cells | n/a | ~ read-only accessors | n/a | ✓ suite |
| test file DF/RR(a/b/c) | ✓ red under mutation, green on build | n/a | ~ per-id delta oracle, never emptiness | ~ Loki-HELD-STONE constraint honoured | ✓ policy-ledger |
| build.json / debug.js / sw.js / index.html | n/a | n/a | n/a | n/a | ✓ build.test lockstep |
| swipe-model.generated.txt | n/a | n/a | n/a | ~ one citation line only | ✓ swipe-model.test |
| Claude/Brunel, Claude/Curie md | n/a | n/a | n/a | n/a | n/a records |

Cited commands for ✓ cells: `node --test test/swipe-stage6b-loser-cancel.test.js test/swipe-invariants.test.js`;
the single-outer-id `fs.readFileSync` mutation probe (`--test-name-pattern="RR(b)"`);
`node --test test/build.test.js test/swipe-model.test.js test/transition-matrix.test.js test/policy-ledger-gate.test.js test/no-silent-coverage-exit-gate.test.js`;
`node --test "test/*.test.js"`.

## Findings

| # | Severity | Finding | Owner |
|---|---|---|---|
| — | (none blocking) | No code defect. | — |
| O1 | Observation | Plan §10 records reconciliation is un-applied in HEAD: `Claude/Subsystems/swipe-reveal.md` §8 (line 39) still states "the settle/reveal timers ... are not yet session-owned handles," which the shipped code makes false; the DecisionLog "Owed to stage 6" entry (line 319) and `PLAN-swipe-reveal.md` §7 step 6 are likewise un-updated. Plan §10 flags this as APPLY-ON-APPROVAL work and Brunel §19 confirms it is owed at commit time, so it is a scheduled records task, not a code defect — but HEAD currently carries an addendum contradicting the code (StandardsDocument §6.6). | Zelda (records) |

Disposition of O1: not do-not-ship and not returned to a maker — the plan deliberately sequenced the
scrub after the review pipeline (§12: Poirot → Mendeleev → Loki, records on approval), so per Engineering
Contract §2.1 the plan-of-record governs the sequencing. Surfaced so the stale-records gap is not lost.

## Prediction

If O1 is not closed before Stage 6b is marked complete, the next session reading
`Claude/Subsystems/swipe-reveal.md` §8 will believe the settle/reveal timers are still bare locals and
may re-do the loser-cancel or mis-scope the I12 null-bookkeeping on a false premise (exactly the drift
§6.6 forbids). The code is safe; the record is the hazard.

The deferred I12 null-write remains correctly deferred: because `cur.revealFrames` always names the one
currently-pending frame, nulling it at the resolver will be truthful — the property the killed one-id
design would have made false. Nothing in this slice forecloses it.

## Watch-list

- **[W1] open** — Plan §10 records reconciliation (subsystem §8, DecisionLog "Owed to stage 6",
  PLAN-swipe-reveal §7 annotation) is un-applied in HEAD; the subsystem addendum contradicts the shipped
  code. Owner Zelda; must close before Stage 6b is called complete. (Finding O1.)
- **[W2] open** — Real-browser (iOS WebKit) fidelity of the two-id re-store at a hidden-tab transition
  landing exactly between the outer and inner reveal frames is un-executed; the atomicity argument rests
  on single-threaded execution + per-callback microtask checkpoints, verified in-harness only (Loki r2
  §6 residual). Resource-plane only — the leaked frame would be `dropped`-guarded, no user-visible
  effect. Carry until an on-device strike or the I10 reveal-centralization revisits it.
- **[W3] open** — Campaign artifact-name reconciliation (plan §10 final bullet): the `swipe-stage6`
  gate globs do not match a `stage6b` name; a tooling/records decision owed before 6b can be checked
  complete. Owner Zelda. Not a code matter.

---

{"persona":"poirot","stage":"6b","input_artifact":"8e968fb","verdict":"PASS","blocking_ids":[],"return_to":"none"}
