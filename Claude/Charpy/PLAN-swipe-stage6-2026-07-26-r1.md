# Charpy casebook — PLAN-swipe-stage6.md (Stage 6a), 2026-07-26 r1

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: commit `4244984` (HEAD) — `Claude/Plans/PLAN-swipe-stage6.md`.
Review target immutable; working tree clean at review time. Round 1.

## Applicability

- **defining_records: true** — the slice's authority rests on `PolicyLedger.mjs` (two known-red
  entries), the parent plan-of-record `PLAN-swipe-reveal.md` §3.7/§7 and invariants I7/I11/I18,
  the subsystem addendum `swipe-reveal.md` §13/§20/§23, the two `{ todo }` tests, and the
  `js/app.js` `begin()`/`start()`/`runFinalize()` code. All reconciled below.
- **boundary_relocation: false** — no code moves across a module boundary. The change is an
  in-place behavior addition in `js/app.js` `begin()`; `js/swipe.js` is untouched. No ledger /
  source_ranges required. (Confirmed against the code: the recovery lives inside the existing
  `begin()` hard-reset block, app.js:361-375.)
- **callee_replacement: false** — no indirection (callback/interface/adapter) replaces a direct
  call. Two synchronous restore effects are added to the existing supersession teardown.
- **contract_shape: false** — no exact-key contract changes; the recovery reads fields that already
  exist on the session (`d.clobbered`, `d.scroll0`, `d.live`). `classifyTransition`/construction
  shapes untouched.

## Verdict

**TEMPER.** The central claim is sound and holds under strike: the two standing known-red
supersession policies are closed by adding the abort's existing restore pair (source re-render iff
`d.clobbered`, `window.scrollTo(0, d.scroll0)`) to `begin()`'s supersession branch, before the
successor arms. Every code citation the plan makes is accurate, every load-bearing promise carries a
coverage cell with a concrete misattribution/ordering mutation, and the scope boundary is honest —
the deferred items (finalizationPlanFor, sameBrowseHost, pane lifecycle, finishing-gate, post-stack
recovery matrix) are genuinely separable and none is an obligation the two known-reds depend on.

One Structural crack blocks build as written: **§10's scrub is not exhaustive.** Removing the two
`PolicyLedger.mjs` entries deletes the exact source line a registered mutation anchor targets, which
reds `test/mutation-anchors.test.js` at build — a HEAD reference §10 does not enumerate. Fix §10 and
the plan is ratifiable; the finding is a checklist completeness gap, not a flaw in the recovery
design.

## Defining records

**AGREE on the required behavior; the only divergence is Stage 6's total size, which this plan
bounds as a planning decision — not a conflict resolution.** Verified against each record:

- `PolicyLedger.mjs` `KR-swipe-scroll-restore` (line 16-27) and `KR-swipe-source-rerender`
  (line 28-40): both `knownRed: true`, `removalTrigger` = "Stage 6 ... implements ...; the test then
  goes green and this entry is removed." The plan implements exactly these two deltas. **AGREE.**
- `PLAN-swipe-reveal.md` §3.7 (lines 470-513): the supersession RULE requires "restore the source,
  return its Browse lease, tear down its movers BY OWNERSHIP, release its listeners — and only then
  arms the new session," plus the ⚠️ one deliberate difference (restore the starting scroll). The
  §3.7 recovery table (lines 529-532) gives pre-stack: Navigation unchanged / restore source /
  restore session start. The plan implements the two MISSING deltas (source re-render + scroll
  restore) and claims lease-return / mover-teardown / listener-release already exist — verified
  against `begin()` (`releaseGesture`, `dropRowHold`, `resetSwipeStyles`, pane disposal) and the
  existing GREEN pane-dispose test `I2/I20 — superseding a LIVE drag disposes its pane` (test file
  line 253, not `{ todo }`). **AGREE.**
- I11 (lines 567-574): pre-stack recovery → authoritative descriptor is the original source; I18
  (lines 602-607): recovery keyed on PHASE. The plan's cell PS honors both (stack unmutated,
  `currentDesc()` returns the source pre-stack). **AGREE.**
- `swipe-reveal.md` §13 (lines 60-62): PRE-stack failure → restore source + starting scroll — this
  slice IS the pre-stack recovery for the `superseded` reason. §20 (lines 90-93): both todos close.
  §23 (lines 102-106): stage-6 revision condition, sliced by this plan. **AGREE.**
- `test/swipe-invariants.test.js:339` and `:391`: both `{ todo }`, assertions state the REQUIRED
  behavior (not inverted) — `:339` asserts `scrollCalls > before`; `:391` asserts
  `renders.at(-1) === 'authors'`. Names match the PolicyLedger `tests` fields exactly. **AGREE.**
- `js/app.js` `begin()` 361-375, `d.scroll0` init at 393, `d.clobbered` set at 470, `revealBase =
  snapBrowse(true)` at 429, abort restore pair at 1116-1117: **all citations verified accurate.** The
  abort mechanism the recovery mirrors exists exactly as described.

Authority precedence (D1): the two PolicyLedger entries + §3.7 GOVERN what must ship; subsystem
§20/§23 are subordinate records scrubbed on approval. No two records disagree on required behavior.

## Findings

### F1 — [Structural] (defect) §10's scrub checklist is not exhaustive: it omits the mutation anchor bound to the removed PolicyLedger line, which reds `mutation-anchors` at build

Severity: **Structural.** Nature: **defect.**

§10 claims to be "The scrub obligations when this ships" and "the checklist the build closes." It
enumerates PolicyLedger removal, `{ todo }` drop, subsystem §20/§23, parent §7 step 6, DecisionLog
append, generated-txt regen, and stage naming. It does **not** enumerate `tools/mutate.mjs`.

`tools/mutate.mjs:275-278` registers a mutation ("§4.19: a policy-ledger known-red test reference is
dangled") whose `from` anchor is the literal string `"restores the starting scroll'],"`, targeting
`Claude/Decisions/PolicyLedger.mjs`. That string is line 25 of the ledger —
`tests: ['I20 — superseding a live drag restores the starting scroll'],` — inside the
`KR-swipe-scroll-restore` entry that §10 directs the build to **remove**.

`test/mutation-anchors.test.js:23-58` asserts every anchor's `from` still `includes()` in its target
file (line 50). When the entry is removed, the string vanishes, the anchor "rots," and the gate fails
with "these mutations no longer match the source, so they silently test NOTHING." So the build,
following §10 literally, removes the entry, drops `{ todo }`, runs the suite, and hits a red gate the
plan's own checklist never named — the exact "found late with a half-built change around it" failure
the scrub rule exists to prevent (StandardsDocument §6.6; Engineering Contract §4.10 "mutation
evidence must remain runnable," §7).

Failure scenario (concrete): Brunel applies §10 as written → `PolicyLedger.mjs` no longer contains
`"restores the starting scroll'],"` → `test/mutation-anchors.test.js` "every mutation anchor still
matches the source it targets" fails → CI red → the stage cannot be reported green on its own
checklist.

Second-order consequence the plan should surface, not silently inherit: after 6a, `POLICY_LEDGER` has
**no** `knownRed` entry remaining (it holds exactly these two), so the dangled-reference mutation has
no specimen to re-point at — it must be **removed**, which also removes the only mutation defending
the policy-ledger gate. (I verified `test/policy-ledger-gate.test.js` itself tolerates an empty
ledger: all three tests pass with zero entries, so no second gate breaks — the anchor gate is the
sole failure.)

Invariant the plan must satisfy (D3 — I state the invariant, not the mechanism): §10 must account for
**every** HEAD reference that removing the two ledger entries invalidates, including the
`tools/mutate.mjs` anchor and its `mutation-anchors` gate, so the build's own checklist leaves nothing
red. *Recommendation (not a requirement — Vitruvius's call):* either re-point the mutation to a
still-red known-red (none exists post-6a, so this is not available) or delete the mutation and record
in the commit which guard is now undefended, per the gate's own remedy text. Whether to preserve
structural coverage of the policy-ledger gate by some other means is a Curie/Mendeleev question the
plan may flag as deferred.

### F2 — [Note] (recommendation) `Claude/Zelda/Board.md` carries three lines describing the two known-reds as open Stage-6 work

Severity: **Note.** Nature: **recommendation.**

`Board.md:80,140,188` reference `KR-swipe-scroll-restore` / `-source-rerender` as open/deferred
Stage-6 new-policy work. When 6a closes them these lines become stale. This is not a §10 defect: the
board is Zelda's living tactical layer, reconciled continuously as the base-layer close step, not a
strategic/defining record a plan's records-reconciliation must enumerate. Recorded so the close step
reconciles it. (The dated historical casebooks under `Claude/Brunel|Curie|Poirot/` and the
stage-5 `DecisionLog.md:809-810` entry are point-in-time records that remain TRUE as history — not
scrub targets. The `.claude/worktrees/**` copies are other sessions' isolated worktrees, out of this
HEAD's scrub scope.)

## Coverage

Every blocking finding maps to a verification:

- **F1** → verified by construction against `tools/mutate.mjs:275-278` (the anchor's literal `from`
  string), `Claude/Decisions/PolicyLedger.mjs:25` (the line §10 removes), and
  `test/mutation-anchors.test.js:23-58` (the gate assertion at line 50). Resolution is verified when
  §10 adds the `tools/mutate.mjs` obligation and a run of `node --test test/mutation-anchors.test.js`
  is green after the ledger removal. F2 is non-blocking (Note).

## Prediction

If built as written, the build greens the two `{ todo }` tests, removes the ledger entries, and then
`test/mutation-anchors.test.js` turns red on the rotted anchor — discovered at the full-suite run,
after the behavior change is in place. Brunel would resolve it ad hoc (delete the mutation), which is
the right fix but arrives as an unplanned edit to tooling the plan declared out of scope, and the loss
of the policy-ledger gate's only mutation would land undocumented. Everything else in the plan absorbs
the strike: the recovery is the abort's proven restore pair, the ordering is recover-before-arm which
the current code already satisfies (so the `render:false`→`d.clobbered` change and the added scroll
write hold position by construction), and the `d && d.live` guard scopes the recovery correctly (cell
OB pins the orphan `d === null` throw; the armed-not-live case is an unobservable no-op — `d.clobbered`
false and `d.scroll0 === current` — so it needs no cell).

```json
{"persona":"charpy","stage":6,"round":1,"input_artifact":"4244984","verdict":"TEMPER","blocking_ids":["F1"],"return_to":"vitruvius"}
```
