Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"","source_ranges":[],"callee_ranges":[]} -->

# Charpy conformance-verify — INSTALL-PATCH-build-gate-spec-corrections

Verified: 2026-07-24. Artifact: `Claude/Vitruvius/INSTALL-PATCH-build-gate-spec-corrections.md` (PROPOSED
drafted patch for `Brunel.md` + `Charpy.md`). Read-only; the patch is not edited. This note gates the
freeze-and-install step the patch's own install path requires.

## Applicability

- **defining_records: true** — the verify reconciles the patch text against the forged plan (§5 C1–C4, §6),
  the r1 temper (F1–F7), the r2 re-verify (F2r), and the two live specs the patch would install into.
- **boundary_relocation: false** — no code boundary moves; the patch edits spec prose.
- **callee_replacement: false** — no callee replaced.
- **contract_shape: false** — no code contract shape introduced.
- **project_adapter: none** — no source/callee ranges; no DOM/session pattern check applies.

## Verdict

**TEMPER.** The patch prose faithfully realizes the forged plan and every r1/r2 finding — verified
item-by-item below, and the REPLACE/INSERT anchors are precise against the live specs. But it is **not
freeze-ready**: adding D10 leaves three stale `D1–D9` enumerations across HEAD (F1), and the patch would
freeze a single project's file paths into a GLOBAL spec as "the mechanical basis" (F2, a scope decision
owed before a global freeze). Scrub the enumerations, decide the path scope, fix two nits, then freeze.

## Defining records

Verdict across the records: **AGREE on substance, CONFLICT on completeness.** The patch's corrective content
matches the forged plan and r1/r2 exactly; the conflict is that installing it as written extends an
enumerated range without the HEAD-wide scrub the standards require, and hard-codes project paths into a
global seat.

| Record | Authority | State vs patch |
|---|---|---|
| Forged plan §5 C1–C4 / §6 | Ratified plan | AGREE — every correction is realized (map below). |
| Charpy r1 (F1–F7) | Prior temper | AGREE — F1/F2/F3/F4/F5/F6 all realized; F7's two decisions are now decided/wired (patch §"NOT do" cites the DecisionLog). |
| Charpy r2 (F2r) | Re-verify | AGREE — the "…with the exact-key contract gate for destructured reads" clause appears in Brunel checkpoint 3, the mechanical-basis paragraph, and Charpy D10. |
| `Brunel.md` Local (lines 228–319) | REPLACE target | AGREE — anchor `### Enforced build protocol — two mandatory reconciliations` at 228; span runs to EOF (319); nothing orphaned. |
| `Charpy.md` Local (D9→applicability, 435→451) | INSERT target | CONFLICT — D10 inserts cleanly, but two `D1–D9` enumerations (305, 339) go stale and are not scrubbed. |
| `Vitruvius.md:507` (`D1–D9` pairing note) | Cross-reference in HEAD | CONFLICT — goes stale when D10 lands; outside the patch's file scope, so its own scrub is incomplete by construction. |

## Findings

(Findings below are this review's, numbered F1–F4. Findings from earlier rounds are cited with their round
prefix — `r1 F1`, `r2 F2r` — and are not the same items.)

### F1 — Structural — defect — the D10 insert leaves three stale `D1–D9` enumerations across HEAD

Adding `D10` extends an enumerated range. Three references describe the old range and the patch scrubs none:
`Charpy.md:305` ("disciplines D1–D9 below"), `Charpy.md:339` ("Universal disciplines (D1–D9)"), and
`Vitruvius.md:507` ("Charpy's D1–D9 and Vitruvius's U1–U13 are paired"). The last is in a file the patch
does not touch, so even a within-patch scrub misses it. Installing as written yields a spec that enumerates
its own disciplines as ending at D9 while D10 exists — a within-document scrub miss (StandardsDocument §7)
and a HEAD-wide scrub miss (§6.6). The irony is exact: the patch adds a Charpy sibling-sweep discipline
while committing the sibling-sweep miss that discipline exists to prevent. Required: the patch's PATCH 2
operation must also update all three references to `D1–D10` (two in Charpy.md, one in Vitruvius.md), which
makes Vitruvius.md a third install target. Blocking.

### F2 — Structural — conditional — a GLOBAL spec would freeze a single project's file paths as "the mechanical basis"

Condition: **if** Brunel's Gate A/B is ever invoked in a project other than TomeRoam. Brunel.md is a global
persona spec; the replacement text names `tools/dead-return-fields.mjs` / `test/construction-consumers.test.js`
(TomeRoam paths) as the code-level gate in checkpoint 3 and Gate A bullet 3. In any non-TomeRoam project,
Gate A instructs Brunel to confirm a gate that does not exist there. The sibling seats solved exactly this:
Charpy and Vitruvius keep the universal principle in the spec and put project paths in
`*-adapters/<name>.sh`. Brunel's Gate A/B is not three-layered and bakes the paths in. This is inherited
from the forged plan (r1/r2 named the paths too), so it is not a patch-vs-plan divergence — but the patch is
the artifact that would freeze it into a global spec, making this the last cheap moment. Resolution is a
decision, not a fix I may make (read-only, and the abstraction is Vitruvius's craft): either (a) abstract
the check to the universal principle + a Brunel project adapter, mirroring the sibling seats, or (b)
consciously scope Gate A/B as TomeRoam-only and state that scope in the spec so the project-only paths are
not read as universal. Blocking until decided.

### F3 — Note — recommendation — the "verbatim" replacement text is wrapped in `>` blockquote markup

PATCH 1 and PATCH 2 present the "verbatim" install text with a leading `> ` on every line (display framing).
A mechanical Bash/`git apply` that does not strip the `> ` would install a blockquoted spec. Recommend the
patch state explicitly that the leading `> ` is display quoting to be stripped on apply, so the frozen
version the installer applies is the un-quoted text.

### F4 — Note — recommendation — the new Brunel heading under-counts the mechanical gates

The replacement heading — "one mechanical gate, one independent review, two Brunel reconciliations" — counts
one mechanical gate, but the model has two: the Vitruvius authoring gate AND the code-level returned-key
gate that F1 elevated to "the mechanical basis." A heading that omits the code-level gate mildly inverts the
emphasis F1 established (D5: a heading must match the body). Recommend the heading name both mechanical
gates. Non-blocking.

## Conformance map (verified realized)

| Forged item | Realized in patch |
|---|---|
| §5 C1 / r1 F1, F3 — code-level gate stays Gate A's basis; reconciliation credited to authoring gate | Brunel checkpoint 1 + checkpoint 3 + Gate A bullet 3 + mechanical-basis paragraph ✓ |
| §5 C2 / r1 F2 — semantic duty split by decidability; admission runs the code-level gate for newly-built consumers | Brunel checkpoints 2–3; Gate A bullet 3 ✓ |
| §5 C3 — Gate B designated-test proof; bare `CAUGHT` rejected | Brunel Gate B + `COVERAGE_OPEN` shape ✓ |
| §5 C4 / r1 F6 — `[cell-id]` machine protocol, manual until read | Brunel `[cell-id]` subsection ✓ |
| §6-vi / r1 F4 — generalized `PLAN_DEFECT` example | "The miss this encodes" now uses `<contract member>` placeholders ✓ |
| r1 F5 — real ledger columns; "genuine" out of the mechanical layer | checkpoint 1 wording ✓ |
| r2 F2r — destructuring blind spot | "…with the exact-key contract gate for destructured reads" in checkpoint 3, mechanical-basis para, and D10 ✓ |
| §5 C2 / §6 (Charpy edit) — pre-FORGE consumer verification, existing consumers only | new Charpy D10 (Kind C, bounded by decidability) ✓ |

## Coverage

Blocking findings and how the revised patch is verified:

- **F1** — the revised PATCH 2 updates `Charpy.md:305`, `Charpy.md:339`, and `Vitruvius.md:507` to
  `D1–D10`, and adds Vitruvius.md as a third install target. Verify by re-running a HEAD-wide grep for
  `D1.D9` returning zero hits after the patch's declared edits.
- **F2** — the revised patch either abstracts the code-level gate to universal-principle + Brunel adapter,
  or states a TomeRoam-only scope for Gate A/B. Verify by reading the checkpoint-3 / Gate-A-bullet-3 text for
  a project-neutral basis or an explicit scope statement.

F3 and F4 are non-blocking tightenings to fold into the same revision.

## Prediction

Frozen and installed as written, the crack surfaces twice. First, immediately and silently: the specs ship
enumerating "D1–D9" with a D10 present, and the next reader (or the next Charpy self-load) inherits a
document that miscounts its own disciplines — the exact stale-enumeration class the standards' scrub exists
to kill. Second, conditionally: the first time Brunel runs Gate A/B in a non-TomeRoam project, bullet 3
names a gate file that is not there, and the builder either fabricates a pass or stalls on a global spec
that was only ever true for one project. Both are cheap to close now, before the freeze; neither is
recoverable by editing the frozen artifact afterward, since a frozen global spec is install-only.
