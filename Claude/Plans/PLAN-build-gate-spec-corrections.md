# PLAN — Build-gate spec corrections (Gate A / Gate B / `[cell-id]`)

Type: plan

<!-- vitruvius-gate {"plan_type":"process","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[],"affected_contracts":[],"staged_records":["~/.claude/personas/Implement/Brunel/Brunel.md","~/.claude/personas/Plan/Charpy/Charpy.md"],"blocking_questions":[]} -->

Status: **RATIFIED / APPROVED — 2026-07-24 (Charpy FORGE).** Authored by Vitruvius; tempered and
re-verified by Charpy (`Claude/Charpy/PLAN-build-gate-spec-corrections-2026-07-23.md`). The approved
wording is **FROZEN** (registered in the freeze-guard `~/.claude/frozen-artifacts.txt`); any edit requires
an explicit unfreeze. The corrections are cleared to install into `Brunel.md`/`Charpy.md` per §6, by the
installer, as a **separate** step (not done by this ratification). The two items in §9 (wire the authoring
gate; review-gate persona-spec edits) remain OPEN. Process/spec plan: all seven change-patterns are false,
so by policy it carries no machine blocks (the one documented exemption).

## Applicability

Process/spec plan — no code boundary moves, no callee replacement, no contract-shape change. The staged
records are two GLOBAL persona specs edited *on ratification*, by the installer, not by this authoring pass.

## Index
1. Goal and scope
2. Defining records and authority
3. Root cause (corrected) — an authoring-gate escape, not a build-gate deficiency
4. The defects being corrected
5. Proposed corrections C1–C4
6. Exact proposed edits (applied only on FORGE)
7. Open recommendation — wire the authoring gate?
8. What this does NOT do
9. Open question routed to Charpy / the user
10. Charpy-temper resolution (F1–F7)
11. How Charpy re-verifies

## 1. Goal and scope

Correct the **Gate A / Gate B build-gate specification** — installed in the Local section of
`~/.claude/personas/Implement/Brunel/Brunel.md` (from the earlier T10 process task) — for the defects the
user surfaced, WITHOUT weakening the defense that actually caught the F1 dead-returned-field. The corrected
spec must be durable (not Stage-5-specific) and must not place a semantic self-certification on the seat
that authored the claim, nor relocate a working code-level check onto a records/read check that cannot see
the class.

Out of scope, explicitly: implementing `campaign-gate.mjs` (deferred by the user); wiring the Vitruvius
authoring gate (a real decision with a migration cost — §7, routed, not done); any change to the Stage-5
plan or its build (separate chain — §8); installing anything before ratification.

## 2. Defining records and authority

| Record | Authority | Reconciliation |
|---|---|---|
| User review 2026-07-23 (3 defects + wording) | Authoritative direction | AGREE — each defect real; mapped to C1–C4. |
| `Brunel.md` Local § Gate A/B (installed, T10) | Artifact under correction | Its installed mechanical basis is a **code-level returned-key reachability check** (preamble, lines 240–249) — realized as `tools/dead-return-fields.mjs` + `test/construction-consumers.test.js`. NOT a prose scrape. C1 is repositioned to respect this (F1/F4). |
| `Vitruvius.md` gate + `~/.claude/hooks/vitruvius-plan-gate.sh` | Governing authoring gate | It ALREADY fails a `contract_shape:true` plan lacking a `vitruvius-contract` block (line 313) and ALREADY class-matches each contract field against the ledger (line 298). C1 is NOT a new build-side reconciliation — it is that authoring-gate check (F3). |
| `tools/dead-return-fields.mjs` + `test/construction-consumers.test.js` | Live code-level gate | This is what caught F1. It STAYS Gate A's mechanical basis; C1 is a complement, never a replacement (F1). |
| `PLAN-swipe-stage5.md` (motivating incident) | Sub-plan, marked RATIFIED | Confirmed by running the gate 2026-07-23: it FAILS with **6 violations** (3 ambiguous-owner ledger rows; missing `vitruvius-contract`; missing `vitruvius-effects`; missing `vitruvius-coverage`) while RATIFIED — an authoring-gate escape (§3). |
| `Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md` (F1) | The incident | AGREE — F1 is a dead *returned* field; the code-level gate is its standing defense. |

## 3. Root cause (corrected)

F1 (`Construction.classification` returned but unread by `start()`) did **not** happen because the build
gate lacked a records reconciliation. It happened because:

- The return contract lived in a **prose `ts` type**, not a machine block, so no structural check could see
  it — and it lived in prose because the Stage-5 plan **never satisfied the Vitruvius authoring gate**. Run
  today that plan fails with 6 violations (including "contract_shape=true but no `vitruvius-contract`
  block") yet carries RATIFIED status. That is an **authoring-gate escape**: a plan reached ratification
  while gate-failing, because the authoring gate is not wired to block ratification.
- The defense that actually caught the dead *returned* field is the **code-level returned-key reachability
  gate** (`dead-return-fields.mjs` / `construction-consumers.test.js`), which reads the built code's
  returned keys against production's actual reads. A records/prose reconciliation **cannot** catch this
  class: a field consumed *internally before the return* satisfies "has a consumer" in the records while the
  *returned* field is dead — the Stage-5 §3 itself says `classification` "is consumed INTERNALLY."

So the corrections must (a) keep the code-level gate as the mechanical basis, (b) locate the semantic check
where it is decidable, and (c) name the authoring-gate escape as the real gap — not invent a build-side
reconciliation that duplicates the authoring gate and cannot see the class.

## 4. The defects being corrected

- **D1 (corrected per F4):** the durable Gate A must not be mechanized by **scraping a prose type** (the
  "parse the §3 type `Construction`" idea — a *proposed*, never-installed mechanization, Stage-5-specific
  and fragile). The *installed* basis is already the code-level returned-key check; D1 is the rejection of
  the prose-scrape proposal, not a claim that the installed spec scrapes prose.
- **D2:** the semantic "does production genuinely consume this" check must not sit on the author, and must
  be placed where it is decidable (Charpy pre-FORGE for existing consumers; the code-level gate at build for
  newly-built ones).
- **D3:** Gate B must not trust a bare sweep `CAUGHT` (an unrelated test may catch a mutation) — it must
  bind the mutation to its designated test and intended assertion.
- **Wording:** `[cell-id]` tagging is a new machine protocol, not a plan-format change.

## 5. Proposed corrections

**C1 (fixes D1/F1/F3/F4/F5) — records reconciliation is a plan-authoring COMPLEMENT the authoring gate
already runs; Gate A's mechanical basis stays the code-level gate.**
- The contract↔ledger reconciliation (every `vitruvius-contract` member resolves to a `vitruvius-ledger`
  row with non-empty `producer`, `consumer`, `verification` — stated in the **real** ledger columns
  `name | class | dir | producer | consumer | owner | lifecycle | verification`, F5) is **already performed
  by the Vitruvius authoring gate** (`vitruvius-plan-gate.sh` lines 298/313). It is a *plan-authoring*
  completeness check, run before Charpy — NOT a new build-side reconciliation and NOT Gate A's basis.
- It proves records completeness only. It **structurally cannot** catch a dead *returned* field (a field
  used-before-return passes it). Therefore **Gate A's mechanical basis remains the code-level returned-key
  reachability gate** (`dead-return-fields.mjs` / `construction-consumers.test.js`). "Genuine production
  consumer" language stays OUT of the records layer.
- The return contract must live in the `vitruvius-contract` block (each returned member a row) — this is the
  existing authoring-gate requirement used as intended, not a new plan format.

**C2 (fixes D2/F1/F2) — the semantic duty is split by WHEN it is decidable; no seat certifies its own claim.**
- **Vitruvius authoring gate (structural, pre-Charpy):** contract block present and class-matches the ledger
  (C1). Records complete — not consumer genuine.
- **Charpy, before FORGE (semantic, on what exists):** verify each contract member whose consumer **already
  exists** genuinely reads that value in production, and stress the plan's reachability logic. Charpy cannot
  read production code that Brunel has not written yet, so a consumer *introduced by the same plan* is not
  fully checkable pre-FORGE.
- **Code-level gate, at Brunel admission (semantic, on what was just built):** the returned-key reachability
  gate verifies that every returned member — including a newly-built consumer's — is genuinely read
  downstream. Gate A's admission step **runs this gate**, not merely "confirms the reconciliation passes."
- **Vitruvius:** fixes a member a gate or Charpy rejects (drops it, or gives it a real consumer) and
  re-submits — never self-certifies.

**C3 (fixes D3) — Gate B proves the DESIGNATED test catches the mutation** (unchanged; sound). Evidence per
cell: designated test green → targeted mutation applied → **designated test fails on the intended
assertion** → restore → green. A bare sweep `CAUGHT`, a full-suite pass, or "wiring is covered" does not
close a cell. Mechanizing this (a per-mutation gate binding the mutation to its own `[cell-id]` designated
test) is `campaign-gate.mjs` — **designed here, not built** (user deferral); until it exists the proof is
Brunel's manual per-cell obligation.

**C4 (fixes the wording error, + F6) — `[cell-id]` is a new machine protocol, manual until read.** A
`[cell-id]` tag in BOTH the Curie test name and the Brunel mutation name binds cell→test→mutation. It is a
new naming protocol on test/mutation names (not a plan-format change). **Until `campaign-gate.mjs` exists,
nothing reads the tag** — the binding is a manual per-cell obligation (the same caveat C3 carries), not an
enforced binding.

## 6. Exact proposed edits (applied only on FORGE, by the installer)

- **Brunel.md Local § (Gate A/B):** keep the four-checkpoint framing of C2, but (i) keep the code-level
  returned-key gate named as Gate A's mechanical basis — do NOT let "rewrite" drop it; (ii) label the
  contract↔ledger reconciliation a plan-authoring complement the Vitruvius gate already runs; (iii) state
  Brunel Gate A's delta precisely as **(authoring gate passed on the ratified plan) + (records unchanged
  since FORGE) + (the code-level returned-key gate runs at admission)**; (iv) strengthen Gate B to the
  designated-test proof (C3); (v) add the `[cell-id]` note (C4) and the `campaign-gate.mjs`-deferred note;
  (vi) generalize the illustrative `PLAN_DEFECT` example so it does not hard-code `Construction`.
- **Charpy.md Local § (new discipline):** add the pre-FORGE semantic check *bounded by decidability* (C2) —
  for each `vitruvius-contract` member with an **existing** consumer, confirm it genuinely reads the value
  and the designated test reddens on removal; note that a consumer newly introduced by the plan is verified
  by the build-time code-level gate, not pre-FORGE.

The drafted replacement text is held with this plan for the installer; it is not pasted into the specs now.

## 7. Open recommendation — wire the authoring gate?

The confirmed root cause (§3) is that `vitruvius-plan-gate.sh` is **not wired**, so a plan can be ratified
while gate-failing (Stage-5 is the standing proof). Wiring it (a PreToolUse gate on `Claude/Plans/*.md`, or
a ratification precondition) would close the escape. It is **not done here** because it has a real
migration cost the gate's own docs name: legacy plans predate the machine-block declaration and would fail
on first touch, so they must be migrated first. That is a decision with a tradeoff, and unilaterally wiring
it would repeat the "install without review" error — so it is **routed to Charpy/the user** (§9), not
executed.

## 8. What this does NOT do

- Does not implement `campaign-gate.mjs` (deferred).
- Does not wire the Vitruvius authoring gate (§7, routed).
- Does not install any edit into Brunel.md or Charpy.md — those happen on ratification, by the installer.
- Does not touch Stage 5. Stage 5 remains a separate open chain — **Vitruvius revised `Construction`
  (`classification` dropped) → Charpy ratifies → Curie → Brunel → Poirot → Mendeleev** — and it now carries
  a known authoring-gate failure (6 violations) that the Stage-5 chain must fix (populate the contract/
  effects/coverage blocks, disambiguate the three owner cells) so its RATIFIED status is earned, not
  escaped.

## 9. Open question routed to Charpy / the user

Two open items, both left unresolved by the planner (resolving either by unilateral action would repeat the
error that motivated this plan):
1. Should persona-spec edits be review-gated (a freeze-guard on `~/.claude/personas/**` until a ratification
   marker is present)?
2. Should the Vitruvius authoring gate be wired to block ratification (§7), accepting the legacy-plan
   migration cost?

## 10. Charpy-temper resolution (F1–F7)

| Finding | Nature | Resolution in this revision |
|---|---|---|
| F1 | defect | §5 C1 keeps the code-level returned-key gate as Gate A's basis; the records reconciliation is labelled a complement, never a replacement (§3, §5, §6-i/-iii). |
| F2 | defect | §5 C2 splits the semantic duty by decidability; the admission checkpoint RUNS the code-level gate for newly-built consumers (§5, §6-iii). |
| F3 | defect | §3 + §5 C1 name Brunel Gate A's delta precisely (authoring-gate-passed + non-drift + code-level gate); the class-match reconciliation is credited to `vitruvius-plan-gate.sh` (298/313), not re-invented. |
| F4 | defect | §4 D1 corrected: "parse §3 type" was a *proposed, never-installed* mechanization; the installed basis is the code-level check. |
| F5 | recommendation | §5 C1 states the check in the real ledger columns (`producer`/`consumer`/`verification`), keeping "genuine" out of the mechanical layer. |
| F6 | recommendation | §5 C4 adds the "manual until `campaign-gate.mjs`" note to `[cell-id]`. |
| F7 | open-unknown | §9 keeps the meta-question open (now two open items); no planner action taken. |

## 11. How Charpy re-verifies

- **F1:** §5 C1 / §6 name `dead-return-fields.mjs` / `construction-consumers.test.js` as RETAINED Gate A
  basis; "rewrite/replace" is not applied to the code-level gate.
- **F2:** §5 C2's admission checkpoint runs the code-level gate (not only a reconciliation pass); the
  pre-FORGE Charpy check is bounded to existing consumers.
- **F3:** §3 + §5 C1 credit the class-match reconciliation to the authoring gate (298/313) and state Brunel's
  delta as three named parts.
- **F4/F5/F6:** folded as above; **F7** left open in §9.
