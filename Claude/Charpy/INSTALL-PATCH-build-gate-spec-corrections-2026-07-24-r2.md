Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"","source_ranges":[],"callee_ranges":[]} -->

# Charpy conformance re-verify (r2) — INSTALL-PATCH-build-gate-spec-corrections

Re-verified: 2026-07-24. Artifact: `Claude/Vitruvius/INSTALL-PATCH-build-gate-spec-corrections.md`
(REVISED, resolves the conformance-verify TEMPER in
`Claude/Charpy/INSTALL-PATCH-build-gate-spec-corrections-2026-07-24.md`). Read-only; the patch is not
edited. This note gates the freeze-and-install step.

## Applicability

- **defining_records: true** — the re-verify reconciles the revised patch against the prior verify's F1–F4,
  the three specs it installs into, and a HEAD-wide sweep of the enumerated-discipline range.
- **boundary_relocation: false** — spec prose; no code boundary moves.
- **callee_replacement: false** — no callee replaced.
- **contract_shape: false** — no code contract shape introduced.
- **project_adapter: none** — no source/callee ranges; no DOM/session pattern check applies.

## Verdict

**FORGE.** The four conformance-verify findings (F1–F4) are resolved, and the revision introduces no new
contradiction. The substantive conformance verified in r1 is unchanged (only the heading, an added Scope
paragraph, an apply note, and the scrub operations changed). The patch is complete and freeze-ready:
freeze it (register in `~/.claude/frozen-artifacts.txt`) and hand to Zelda for the mechanical apply into
the three named specs.

## Defining records

Verdict across the records: **AGREE** — the revised patch now matches every authority struck against it,
and the one completeness gap (the stale enumeration range) is closed with an independently-verified
complete scrub set.

| Record | Authority | State vs revised patch |
|---|---|---|
| r1 conformance-verify (F1–F4) | Prior temper | AGREE — each finding resolved (verified below, not taken on trust). |
| Prior patch substance (Brunel checkpoints, Gate A/B, D10) | Forged plan + r1/r2 realization | AGREE — unchanged by this revision; the r1-verified conformance map still holds. |
| `~/.claude/personas/**` `D1–D9` range references | HEAD-wide scrub target | AGREE — my sweep finds exactly three range enumerations (`Charpy.md:305`, `:339`, `Vitruvius.md:507`); the patch scrubs all three. Other `D9` hits (416/435/495/498/515/521) are individual-discipline references that correctly stay. |
| `Brunel.md` REPLACE anchor (line 228) | Install target | AGREE — anchor unchanged and still present (no install has run; persona-spec-guard blocks direct edits). |

## Findings

(Findings track this review's prior round; `r1 F#` = the conformance-verify TEMPER being confirmed.)

### F1 — Note — defect(resolved) — stale enumeration scrub is complete

r1 F1 required scrubbing every `D1–D9` range reference that D10 makes stale. The revision adds PATCH 2
Operation 2b (`Charpy.md:305` and `:339` → `D1–D10`) and a new PATCH 3 (`Vitruvius.md:507` → `Charpy's
D1–D10`), plus a post-apply verify asserting zero `D1–D9` hits remain. I independently swept
`~/.claude/personas/**`: the three range enumerations are the complete set; the remaining `D9` hits are
references to the individual discipline, which stay valid. Complete; no action.

### F2 — Note — conditional(resolved) — Gate A/B scope is now explicit

r1 F2 required a conscious decision on the TomeRoam-only file paths in the global Brunel spec. The revision
takes option (b): a new **Scope** paragraph states Gate A/B lives in Brunel's project-Local section and is
TomeRoam-specific, names the universal principle (every returned member of every exported contract factory
read downstream), states that a second project realizes it via a Brunel adapter, and defers that adapter as
future work — so the named files "must not be read as universal." Sound and honest; the deferral matches the
smallest-sound-thing discipline (a single-project machine does not need the adapter yet). Resolved.

### F3 — Note — recommendation(resolved) — apply-time quoting is addressed

r1 F3 flagged the `>` blockquote display markup. The revision adds a top-level "NOTE ON APPLY
(display-quoting)" instructing the installer to strip the leading `> ` (and one following space) so the
mechanical apply operates on de-quoted text. Resolved.

### F4 — Note — recommendation(resolved) — heading no longer under-counts

r1 F4 noted the heading counted one mechanical gate. It now reads "two mechanical gates, one independent
review, two Brunel reconciliations" — naming both the authoring gate and the code-level returned-key gate.
Resolved.

## Coverage

All findings are resolved (verdict FORGE); none owes a runtime test. Each is cited here for the record:
**F1** (enumeration scrub) — verified complete by an independent HEAD-wide sweep, not by trusting the
patch's own verify line. **F2** (Gate A/B scope decision) — verified resolved by reading the new Scope
paragraph; no runtime surface, it is a spec-scope statement. **F3** (apply-time quoting) and **F4**
(heading count) — verified resolved by reading the revised patch text. No blocking finding remains open.

## Prediction

Frozen and applied as revised, the specs read correctly: no stale enumeration ships (the three range
references become `D1–D10`, the only three that exist), and a reader in a non-TomeRoam project meets an
explicit scope statement rather than a silent instruction to run a gate that isn't there. The one residual
is deliberate and named — the Brunel project adapter is unbuilt, so the first non-TomeRoam project to use
Gate A/B must build its own returned-key detector and move the paths into an adapter; that work is routed as
future, not hidden. Nothing blocks the freeze.
