Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"","source_ranges":[],"callee_ranges":[]} -->

# Charpy re-verify (r2) — PLAN-build-gate-spec-corrections

Re-verified: 2026-07-23. Artifact: `Claude/Plans/PLAN-build-gate-spec-corrections.md` (REVISED, resolves the
r1 TEMPER in `Claude/Charpy/PLAN-build-gate-spec-corrections-2026-07-23.md`). Read-only; the plan is not
edited. This note gates the install of the C1–C4 corrections into `Brunel.md` and `Charpy.md`.

## Applicability

- **defining_records: true** — the re-verify reconciles the revised plan against the installed Gate A/B
  spec, the Vitruvius gate, the two code-level gates, and the hook registration in `settings.json`.
- **boundary_relocation: false** — process/spec plan; no code boundary moves; no source ranges.
- **callee_replacement: false** — no callee replaced by indirection.
- **contract_shape: false** — introduces no new code contract shape.
- **project_adapter: none** — no source/callee ranges declared; no DOM/session pattern check applies.

## Verdict

**FORGE.** The three blocking findings from r1 (F1, F2, F3) are resolved soundly and without introducing a
new contradiction. F4–F7 are folded. The revision's one new load-bearing claim — that the Vitruvius
authoring gate is not wired — is verified true against `settings.json`. Install the C1–C4 corrections on
ratification per §6; carry the two non-blocking notes below into the drafted text.

## Defining records

Verdict across the records: **AGREE** — the revised plan now matches every installed authority I struck it
against; the one remaining conflict (the Stage-5 plan's RATIFIED-yet-gate-failing state) is correctly
routed out to the Stage-5 chain (§8), not left as this plan's contradiction.

| Record | Authority | State vs revised plan |
|---|---|---|
| r1 temper (F1–F7) | Prior review | AGREE — §10 maps each finding to a concrete resolution; each verified below, not taken on trust. |
| `Brunel.md` Local § Gate A/B | Artifact under correction | AGREE — §5 C1/§6-i keep the code-level returned-key gate as Gate A's mechanical basis; the records reconciliation is labelled a complement. |
| `Vitruvius.md` gate + `vitruvius-plan-gate.sh` | Authoring gate | AGREE — §5 C1 credits the contract↔ledger class-match to the authoring gate (298/313) rather than re-inventing it. |
| `tools/dead-return-fields.mjs` + `test/construction-consumers.test.js` | Live code-level gate | AGREE — named as retained; the admission checkpoint runs it (§5 C2, §6-iii). |
| `~/.claude/settings.json` (hook registration) | Wiring source of truth | AGREE, newly verified — registers `poirot-casebook-gate.sh` and `charpy-casebook-gate.sh` but NOT `vitruvius-plan-gate.sh`; the authoring gate is genuinely unwired, confirming §3/§7. |
| `PLAN-swipe-stage5.md` | Sub-plan, RATIFIED yet gate-failing | Conflict acknowledged and routed to the Stage-5 chain (§8) — not this plan's to resolve. |

## Findings

### F1r — Note — defect(resolved) — Gate A basis retained

r1-F1/F2/F3 verified resolved. §5 C1 (lines 96–99) states Gate A's mechanical basis **remains** the
code-level returned-key reachability gate and forbids "rewrite" from dropping it; §5 C2 puts the code-level
gate at the Brunel-admission checkpoint so a consumer newly built by the same plan is checked where it is
decidable (at build), not by a pre-FORGE read; §5 C1 credits the class-match reconciliation to
`vitruvius-plan-gate.sh` 298/313. No sibling of the r1 class survives: the plan no longer describes the
records reconciliation as Gate A's basis anywhere (§3, §5, §6, §10 all consistent). Resolved; no action.

### F2r — Note — recommendation — "genuinely read downstream" holds across two gates, not one

§5 C2 says the code-level gate "verifies that every returned member … is genuinely read downstream." The
gate (`construction-consumers.test.js`) documents a blind spot: a consumer that reads a returned field by
**destructuring** (`const { x } = obj`) is invisible to its `<var>.<field>` scan, and those seams are
covered instead by the exact-key contract gate (the `EXACT_KEY_GATED` split). So "genuinely read
downstream" is true in aggregate across the two gates, not the one C2 names. Non-blocking: recommend the
drafted Brunel text say "the code-level returned-key gate (with the exact-key contract gate for destructured
reads)" so the claim matches the mechanism's real coverage. Does not affect the verdict.

### F3r — Note — open-unknown — the authoring-gate wiring decision is correctly open

§7/§9 route two decisions to the user: gate persona-spec edits, and wire the authoring gate (accepting the
legacy-plan migration cost). Both are genuinely the user's call and correctly left unresolved — deciding
either by unilateral action would repeat the error that motivated the plan. One consideration for that
decision, recorded not prescribed: the gate already self-scopes to files carrying a plan marker, so the
migration surface may be narrower than "all legacy plans." Decision awaited from the user; no planner action
required.

## Coverage

No blocking findings remain (verdict is FORGE). F1r records the resolution of the r1 blocking set (r1-F1,
r1-F2, r1-F3), each verified against the named installed authority above. F2r and F3r are non-blocking notes
to fold into the drafted install text.

## Prediction

Built and installed as revised, the spec holds where r1 predicted it would crack: a plan that returns a
field read only by a newly-built consumer is now caught at Brunel admission by the retained code-level gate,
not waved through by a records reconciliation. The one residual risk is not in this plan but downstream —
the authoring gate stays unwired until the user decides §7, so another RATIFIED-yet-gate-failing plan (the
Stage-5 pattern) can still occur until that decision lands. That is named and routed, not hidden.
