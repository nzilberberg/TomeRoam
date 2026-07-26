# Charpy casebook — PLAN-swipe-stage6.md (Stage 6a), 2026-07-26 r2

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: HEAD `2b2abf3` — `Claude/Plans/PLAN-swipe-stage6.md` (the §10 revision landed in
`b90939b`). Working tree clean. Round 2: re-gate of the r1 TEMPER fix (F1). Scope of this round is the
§10 change only; sections confirmed sound at r1 are not reopened, and the diff since the r1 target
(`4244984`) is a single §10 hunk that disturbs nothing else.

## Applicability

- **defining_records: true** — the resolution is scrubbed against `PolicyLedger.mjs`, `tools/mutate.mjs`,
  `test/mutation-anchors.test.js`, `test/policy-ledger-gate.test.js`, and `tools/mutation-sweep.mjs`.
- **boundary_relocation: false** — no code moves; the revision is a records-reconciliation checklist
  edit. No ledger/source_ranges required.
- **callee_replacement: false** — no indirection introduced.
- **contract_shape: false** — no exact-key contract changes.

## Verdict

**FORGE.** The r1 Structural finding is resolved and the fix introduces no new contradiction. §10 now
enumerates the `tools/mutate.mjs` obligation, correctly ties it to the same commit as the ledger
removal, declines re-pointing on a verified-true basis, confirms the gate stays green, and flags the
lost gate-coverage as a deferred coverage-audit decision rather than dropping it. The plan is
ratifiable. One non-blocking Note (F2) carries forward from r1 as a close-step reconciliation.

## Defining records

**AGREE.** The r2 change is internally consistent with the plan and factually correct against HEAD.
Every claim in the two revised §10 bullets was struck against the real files:

- `tools/mutate.mjs:275-278` — the mutation `§4.19: a policy-ledger known-red test reference is
  dangled` exists at that location; its `from` anchor is the literal `restores the starting scroll'],`,
  targeting `Claude/Decisions/PolicyLedger.mjs`. That string is line 25 of the ledger, inside the
  `KR-swipe-scroll-restore` entry §10 removes. **The bullet's citations are accurate.**
- `test/mutation-anchors.test.js:50` — `if (!readFile(file).includes(lf(part.from))) rotted.push(...)`,
  asserted at line 54. Removing the ledger entry without deleting the mutation rots the anchor and reds
  this gate. **Accurate.**
- "After removal `POLICY_LEDGER` holds no `knownRed` entry (it held exactly these two)" — verified:
  the array has exactly the two 6a entries, both `knownRed: true`. Re-pointing has no target.
  **Accurate.**
- "The gate's three assertions still pass on an empty ledger" — verified against
  `test/policy-ledger-gate.test.js`: it iterates entries (none → passes), reconciles declared-vs-actual
  known-red sets (both empty → passes), and checks `tests`-name existence (no entries → passes).
  **Accurate.**

No record contradicts another on the required behavior; the only divergence remains Stage 6's total
size, which the plan bounds.

## Resolution of F1 (r1 Structural) — verified closed

The r1 finding was: §10 removed the two `PolicyLedger.mjs` entries but did not enumerate the
`tools/mutate.mjs` anchor bound to the removed line, so a build following §10 reds
`test/mutation-anchors.test.js`.

The revised §10 directs: **delete the `§4.19 ... is dangled` mutation from `tools/mutate.mjs` in the
SAME commit as the ledger removal**, record the now-undefended guard in the commit message, and confirm
`node --test test/mutation-anchors.test.js` is green after both edits.

I verified this closes the gate red, and that deleting that specific mutation reds nothing else:

- **The rotted-anchor failure is eliminated at its root.** With the whole mutation deleted (not just
  the ledger line), `test/mutation-anchors.test.js` "every anchor still matches" has no rotted entry;
  its "no mutation is a no-op" assertion is unaffected (a removed entry, not a no-op one); and
  `MUTATIONS.length > 0` still holds — many mutations remain. Gate goes green.
- **No external dependency on the deleted mutation.** The name `§4.19: a policy-ledger known-red test
  reference is dangled` appears only at its own definition (`tools/mutate.mjs:275`) — no manifest,
  fixture, or test enumerates it.
- **No count/index breakage.** `tools/mutation-sweep.mjs` computes shard/affected indices from the live
  `MUTATIONS.length` (lines 104-109, 151, 161) with no hard-coded range; deleting one entry re-indexes
  cleanly.
- **`SOURCE_TEXT_GATES` unaffected.** It is keyed by TEST-FILE name (`mutation-anchors.test.js`,
  `swipe-model.test.js`, `transition-matrix.test.js` — `mutation-sweep.mjs:119-123`), not by mutation
  name or index, and its self-guard (lines 129-133) checks only that those excluded FILES still exist.
  Deleting a mutation from the table does not touch it.

So a build that follows §10 leaves `mutation-anchors`, `policy-ledger-gate`, and the sweep all green.
F1 is closed.

## Honesty of the deferral — confirmed a decision owed, not an obligation dropped

The revised §10 flags that deleting the specimen leaves the policy-ledger gate with zero defending
mutations, and routes restoring that structural coverage to a future known-red re-seed or a
replacement guard, owned by the coverage audit (Curie/Mendeleev), explicitly out of 6a scope.

This is honest on the load-bearing point: **the policy-ledger gate itself keeps running and keeps
enforcing.** Its live failure modes — an untracked `{ todo }` known-red, a stale declared exception, a
dangling `tests` name, a missing §1.C field — all remain active on every run. What lapses is only the
registered mutation that PROVES the gate can fail. Engineering Contract §4.10 ("every important new
assertion must be mutation-verified") governs NEW assertions; 6a adds no assertion here — it removes
the specimen of a pre-existing gate's pre-existing mutation, so §4.10 imposes no re-seed obligation on
this slice, and §4.19's enforcement is not weakened (the gate still reconciles the ledger against the
suite). Routing the re-seed to the coverage auditor is the correct owner under the scheme. The deferral
is named, owned, and scoped — a decision owed, not a silent loss.

## Findings

### F2 — [Note] (recommendation) `Claude/Zelda/Board.md` carries three lines describing the two known-reds as open Stage-6 work

Severity: **Note.** Nature: **recommendation.** Carried forward unchanged from r1; the §10 revision
does not touch it. `Board.md:80,140,188` reference the two known-reds as open/deferred; stale once 6a
closes them. Not a §10 defect — the board is Zelda's living tactical layer, reconciled at the
base-layer close step, not a defining record a plan's records-reconciliation must enumerate. Recorded
so the close step reconciles it. (Dated Brunel/Curie/Poirot casebooks and `DecisionLog.md:809-810` are
point-in-time history, not scrub targets; `.claude/worktrees/**` are other sessions' worktrees, out of
this HEAD's scope.)

## Coverage

No blocking findings this round — F1 (r1 Structural) is verified closed above; F2 is a non-blocking
Note. Nothing requires a coverage mapping to clear the verdict.

```json
{"persona":"charpy","stage":6,"round":2,"input_artifact":"2b2abf3","verdict":"FORGE","blocking_ids":[],"return_to":"none"}
```
