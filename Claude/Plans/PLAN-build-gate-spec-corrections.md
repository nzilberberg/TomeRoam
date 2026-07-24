# PLAN — Build-gate spec corrections (Gate A / Gate B / `[cell-id]` protocol)

Type: plan

<!-- vitruvius-gate {"plan_type":"process","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[],"affected_contracts":[],"staged_records":["~/.claude/personas/Implement/Brunel/Brunel.md","~/.claude/personas/Plan/Charpy/Charpy.md"],"blocking_questions":[]} -->

Status: **PROPOSED — awaiting Charpy temper.** Authored by Vitruvius. Nothing in this plan is installed
into any persona spec or tool until Charpy returns a verdict and it is ratified. This is a *process/spec*
plan: no production code, tests, or tooling change; all seven change-patterns are false, so by policy it
carries no machine blocks (the one documented exemption).

## Applicability

Process/spec plan — no code boundary moves, no callee replacement, no contract-shape change, no state
transfer, no async/persistence/lifecycle change. The staged records are two GLOBAL persona specs that
would be edited *on ratification*, by the installer, not by this authoring pass.

## Index
1. Goal and scope
2. Defining records and authority
3. The defect being corrected (why the current spec is not builder-ready)
4. Proposed corrections C1–C4
5. Exact proposed edits (applied only on FORGE)
6. What this does NOT do
7. Open question routed to Charpy/the user
8. How Charpy verifies this plan

## 1. Goal and scope

Correct the **Gate A / Gate B build-gate specification** — currently installed in the Local section of
`~/.claude/personas/Implement/Brunel/Brunel.md` (added by the earlier T10 process task) — for three
defects and one wording error the user surfaced on review. The corrected spec must be durable (not
Stage-5-specific) and must not place a semantic self-certification on the seat that authored the claim.

Out of scope, explicitly: implementing `campaign-gate.mjs` (deferred by the user); any change to the
Stage-5 plan or its build (that is a *separate* unresolved chain — §6); installing the corrections into
the persona specs before ratification.

## 2. Defining records and authority

| Record | Role | This plan |
|---|---|---|
| The user's 2026-07-23 review (three defects + wording correction + disposition) | Authoritative direction | Treated as the spec to satisfy; each defect maps to a correction in §4 |
| `~/.claude/personas/Implement/Brunel/Brunel.md` Local § (Gate A/B, from T10) | The artifact under correction | §5 proposes the edits; not touched until ratified |
| `~/.claude/personas/Plan/Charpy/Charpy.md` | Gains the pre-FORGE semantic-verification duty (C2) | §5 proposes a new discipline; not touched until ratified |
| `Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md` (F1) | The incident the spec generalizes | Cited as the illustrative miss; unchanged |
| Vitruvius spec — "does not review his own plan"; Charpy is the independent temper | Governing scheme rule | This plan exists *because* the correction must be tempered, not self-installed |

Authority note: the corrections change how three seats divide a duty (mechanical gate / Charpy / Brunel /
Vitruvius). A division recorded in only one seat's spec is half-filed, so C2 deliberately stages an edit
to **both** Brunel.md and Charpy.md — but as proposals for the installer to apply after FORGE.

## 3. The defect being corrected

The installed Gate A/B spec is close but not builder-ready, for three reasons the user named:

- **D1 — Gate A scrapes prose.** Its mechanical basis was "parse the §3 type `Construction`," which is
  Stage-5-specific and fragile: the next plan with another type name or notation bypasses it. Root cause:
  the Stage-5 return contract lives in a prose `ts` type, and the plan carries **no** `vitruvius-contract`
  block (it declares `contract_shape:true` but only a `vitruvius-ledger` block exists) — so scraping prose
  was the only handle. A durable gate must reconcile the two *machine-readable* blocks.
- **D2 — semantic confirmation was placed on the author.** The spec let the plan's own consumer
  justification stand and had the authoring seat effectively certify it. The F1 miss happened precisely
  because "the plan says L3 consumes it" was accepted without an independent check that L3 *actually reads
  the returned value*. A mechanical gate cannot prove genuine consumption, and the author must not certify
  it — that verification belongs to the independent reviewer (Charpy), before FORGE.
- **D3 — Gate B trusts a bare `CAUGHT`.** A mutation reported only as "some test failed" has a false-pass
  path: an unrelated test may catch it, leaving the *designated* assertion unproven. This is the smallest
  real tooling gap.

Plus a wording error: "no format changes" is true only of the *plan* format; the `[cell-id]` tagging of
Curie/Brunel test and mutation names is a new machine protocol and must be recorded as one.

## 4. Proposed corrections

**C1 (fixes D1) — Gate A reconciles machine-readable records.** The durable Gate A check reconciles the
plan's `vitruvius-contract` block against its `vitruvius-ledger` block: every contract member must resolve
to a ledger row naming a production producer, a production consumer, the behaviour that depends on it, and
a verification. It keys ONLY on the two fenced machine blocks — never a prose type, never a hard-coded
type name. Consequence: a plan's **return contract must live in the `vitruvius-contract` block** (each
returned member a row); a prose `ts` type is not machine-reconcilable. This is the existing protocol used
as intended (the block is already required when `contract_shape:true`), so it is *not* a new plan format.

**C2 (fixes D2) — the semantic verification is Charpy's, before FORGE; no seat certifies its own claim.**
The duty splits across four checkpoints:
- **Mechanical gate (structural):** the contract↔ledger reconciliation of C1 — proves the records are
  *complete*, not that the consumer is *real*.
- **Charpy, before FORGE (semantic):** for each contract member, verify the named consumer genuinely reads
  that specific boundary value in production, and that the member's designated test would redden if the
  value disappeared. Independent of the author.
- **Gate A, before Brunel (admission):** Brunel confirms the reconciliation passes on the ratified plan and
  the records are *unchanged since FORGE* (no drift). Brunel does not re-derive semantics.
- **Vitruvius:** *fixes* a member a gate or Charpy rejects (drops it, or gives it a real consumer) and
  re-submits — never self-certifies the semantic claim.

**C3 (fixes D3) — Gate B proves the DESIGNATED test catches the mutation.** For each builder-owned cell,
the evidence is: the designated test green normally → the targeted mutation applied → the **designated test
failing on the intended assertion** (not merely that the suite went red somewhere) → restoration → the
designated test green again. A bare sweep `CAUGHT`, a full-suite pass, or "wiring is covered" does not
close a cell. The mechanization of this (a per-mutation gate binding the mutation to its own designated
test) is named `campaign-gate.mjs` and is **designed here but deliberately not built** (user deferral);
until it exists, the designated-test proof is Brunel's manual per-cell obligation.

**C4 (fixes the wording error) — `[cell-id]` is a new machine protocol.** Binding a coverage cell to its
designated test and mutation requires a `[cell-id]` tag in BOTH the test name (Curie) and the mutation
name (Brunel), so a gate/reader can check the *designated* test reddens, not "some test." Record it as a
new naming protocol wherever test/mutation conventions live — it is not a plan-format change.

## 5. Exact proposed edits (applied only on FORGE, by the installer)

Presented so Charpy can stress the actual wording, and so ratification is a mechanical apply — not a
re-drafting. None of these is applied by this authoring pass.

- **Brunel.md Local § (Gate A/B):** replace the "two mandatory reconciliations" framing with the four-
  checkpoint split (C2); rewrite Gate A's basis to the contract↔ledger reconciliation + non-drift (C1/C2);
  strengthen Gate B's required evidence to the designated-test green→mutate→red-on-intended→restore chain
  (C3); add the `[cell-id]`-protocol note (C4) and the `campaign-gate.mjs`-deferred note (C3); generalize
  the illustrative `PLAN_DEFECT` example so it does not hard-code `Construction`/`buildConstruction`.
- **Charpy.md Local § (new discipline):** add the pre-FORGE contract-member semantic verification (C2) —
  for each `vitruvius-contract` member, confirm the named consumer genuinely reads the value and the
  designated test reddens on its removal; a plan's own justification is not sufficient evidence.

The drafted replacement text is held with this plan for the installer; it is intentionally *not* pasted
into the specs now.

## 6. What this does NOT do

- Does not implement `campaign-gate.mjs` (deferred).
- Does not install any edit into Brunel.md or Charpy.md — those happen on ratification, by the installer.
- Does not touch Stage 5. Stage 5 remains a separate open chain: **Vitruvius revised the `Construction`
  contract (done, prior turn — `classification` dropped) → Charpy ratifies → Curie updates the exact-shape
  test → Brunel removes the field → Poirot re-reviews → Mendeleev audits.** (Note for that chain, surfaced
  here: the Stage-5 plan lacks a populated `vitruvius-contract` block — its return contract is prose — which
  is why C1's reconciliation cannot yet run against it; adding that block is Vitruvius work inside the
  Stage-5 chain, not this plan.)

## 7. Open question routed to Charpy / the user

This very session exposed the meta-instance: an author seat (Vitruvius) edited an installed authoritative
persona spec directly, without the temper. Should persona-spec edits themselves be *review-gated* (e.g. a
freeze-guard-style block on `~/.claude/personas/**` until a ratification marker is present), or is that
over-mechanizing a judgment better held by the "author-plans-not-installs" discipline plus this routing?
Flagged, not resolved — resolving it by unilaterally building the gate would repeat the error. Charpy's and
the user's call.

## 8. How Charpy verifies this plan

Process plan, so the temper is about the division, not code:
- **C1:** confirm the reconciliation keys on `vitruvius-contract` ↔ `vitruvius-ledger` only, with no prose-
  type or type-name dependency; confirm the "return contract lives in the contract block" consequence is
  stated and is not mis-labelled a new plan format.
- **C2:** confirm the semantic check sits with Charpy pre-FORGE, that Vitruvius is fix-only, and that the
  division is staged into *both* specs (not half-filed).
- **C3:** confirm Gate B's evidence names the DESIGNATED test and the INTENDED assertion, and that a bare
  `CAUGHT` is explicitly rejected; confirm `campaign-gate.mjs` is deferred, not assumed built.
- **C4:** confirm `[cell-id]` is recorded as a new machine protocol distinct from the plan format.
- Confirm §6 keeps Stage 5 and the tooling out of scope, and §7's meta-question is left open, not decided.
