Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"","source_ranges":[],"callee_ranges":[]} -->

# Charpy temper — PLAN-build-gate-spec-corrections (Gate A / Gate B / `[cell-id]`)

Reviewed: 2026-07-23. Artifact: `Claude/Plans/PLAN-build-gate-spec-corrections.md` (PROPOSED, authored by
Vitruvius). Read-only temper; the plan is not edited. Corrections are staged into `Brunel.md` and
`Charpy.md` on FORGE only — this note gates that install.

## Applicability

- **defining_records: true** — the plan reconciles a user review, the installed Gate A/B spec, the
  Vitruvius plan-gate spec, two live code-level gates, and the motivating Stage-5 incident; those must be
  reconciled to judge C1–C4.
- **boundary_relocation: false** — a process/spec plan; no code ownership boundary moves. No source ranges.
- **callee_replacement: false** — no callee is replaced by an indirection.
- **contract_shape: false** — the plan changes no exact-key code contract (it discusses the *plan-format*
  contract block, but introduces no new code contract shape of its own).
- **project_adapter: none** — the review declares no source/callee ranges, so no DOM/session source-pattern
  check applies; the adapter is intentionally empty.

## Verdict

**TEMPER.** The central claim holds — the Gate A/B spec is close, the three-plus-one defects are real, and
the corrections must be tempered before install rather than self-installed. C2's four-checkpoint division,
C3's designated-test proof, and C4's `[cell-id]` protocol are sound in direction. The crack is in **C1 and
the C2 mechanical/Charpy split**: as written, they relocate the F1 dead-returned-field defense *away from*
the live code-level gate that actually catches that class, onto (a) a plan-records reconciliation that
cannot detect the class and (b) a pre-FORGE Charpy read that cannot cover a consumer the same plan
introduces. C1 also re-describes as a new build-side check a reconciliation the Vitruvius authoring gate
already performs. Fix C1's basis and the C2 checkpoint boundaries, then install.

## Defining records

Verdict across the records: **CONFLICT** — the plan's C1 root-cause narrative conflicts with two installed
authorities (the Vitruvius plan gate and the code-level dead-returned-field gate), and one motivating
record (the Stage-5 plan) is in a state its own status line contradicts.

| Record | Authority | State vs this plan |
|---|---|---|
| User review 2026-07-23 (3 defects + wording) | Authoritative direction | AGREE — each defect is real; the plan maps them to C1–C4. |
| `Brunel.md` Local § Gate A/B (installed, T10) | Artifact under correction | CONFLICT — its installed mechanical basis is a code-level returned-key reachability check (preamble, lines 240–249), not the "prose scrape / parse §3 type" the plan's D1 describes. |
| `Vitruvius.md` gate spec + `vitruvius-plan-gate.sh` | Governing authoring gate | CONFLICT — the gate already *requires* a `vitruvius-contract` block when `contract_shape:true` (gate line 313) and already compares each contract field's class against the ledger (gate line 298). C1 presents that reconciliation as a new build-side check. |
| `test/construction-consumers.test.js` + `tools/dead-return-fields.mjs` | Live code-level gate | GAP — this is the gate that caught F1 (`Construction.classification` returned, no `start()` consumer). The plan never mentions it, yet §5 "rewrites Gate A's basis" away from exactly this kind of check. |
| `PLAN-swipe-stage5.md` (motivating incident) | Sub-plan, marked RATIFIED | CONFLICT — run against `vitruvius-plan-gate.sh` today it FAILS with 6 violations, incl. "contract_shape=true but no `vitruvius-contract` block." "Prose was the only handle" is an authoring-gate escape, not a build-gate deficiency. |
| `Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md` (F1) | The incident | AGREE — F1 is a dead *returned* field; the code-level gate is its standing defense. |

## Findings

### F1 — Structural — defect — C1/§5 rewrites Gate A's basis onto a check that cannot catch the F1 class

§5 directs the installer to "rewrite Gate A's basis to the contract↔ledger reconciliation + non-drift."
The installed Gate A basis (Brunel preamble, lines 240–249) is a **code-level returned-key reachability
check over every exported contract factory** — realized in the repo as `tools/dead-return-fields.mjs` +
`test/construction-consumers.test.js`. That gate reads the *actual returned keys of the built code* against
the *actual production consumer reads*, and is what caught F1 (`Construction.classification` returned but
`start()` reads only `movers`/`capture`/`sourceWasClobbered`/`plan`).

C1's contract↔ledger reconciliation operates on the **plan's declared records**, and proves only that the
records are internally complete (C2 states this). It **structurally cannot** catch the F1 class: a field
that is *used internally before the return* satisfies "has a consumer" in the ledger/prose while the
*returned* field is dead. The Stage-5 plan's own §3 says `classification` "is consumed INTERNALLY" — a
records reconciliation passes on exactly the field that was dead. Only a check that distinguishes
*returned-and-read-downstream* from *used-before-return* catches it, and that is the code-level gate C1's
"rewrite" displaces.

Required to temper: Gate A's **mechanical basis stays the code-level returned-key reachability gate**
(`dead-return-fields.mjs` / `construction-consumers.test.js`). C1's contract↔ledger reconciliation is a
*plan-authoring* complement, not a replacement — reposition it as such. The word "rewrite" in §5 must not
drop the code-level gate.

### F2 — Structural — defect — C2's pre-FORGE Charpy semantic duty cannot cover a consumer the same plan introduces

C2 assigns Charpy, *before FORGE*: "for each contract member, verify the named consumer genuinely reads
that specific boundary value in production, and that the member's designated test would redden if the value
disappeared." When the consumer is **new to the same plan**, its production code does not exist pre-FORGE —
Brunel writes it after ratification. Charpy pre-FORGE can verify an *existing* consumer and can stress the
plan's reachability logic, but cannot read production that is not yet written. So the "genuinely reads it in
production" check is only partially performable pre-FORGE, and the residual (every newly-introduced
consumer) is decidable only at/after build — which is precisely why the existing defense is a *code-level*
gate.

This is the "reading alone is vigilance and fails" antipattern the Brunel preamble itself names: C2 moves a
check that is currently mechanical and code-level onto a human pre-FORGE read. Required to temper: split the
duty by *when it is decidable* — Charpy pre-FORGE verifies existing consumers and reachability; the
build-time code-level gate (F1) verifies that newly-built consumers genuinely read each returned member.
C2's "Gate A, before Brunel (admission)" checkpoint is the natural home for the latter, but only if it runs
the code-level gate, not merely "confirms the reconciliation passes."

### F3 — Structural — defect — C1 duplicates the Vitruvius authoring gate; the motivating gap is an unenforced authoring gate

`vitruvius-plan-gate.sh` already (a) fails any `contract_shape:true` plan lacking a `vitruvius-contract`
block (line 313) and (b) compares each contract field's class against the ledger (line 298). C1's "durable
Gate A reconciles the contract block against the ledger" is, for the class-match part, the reconciliation
the authoring gate already performs. C1 acknowledges the *block* is already required, but not that the
*reconciliation* is already run — so it reads as a new build-side invention.

The reason the Stage-5 plan "had only prose to scrape" is that it never satisfied that authoring gate: run
today it fails with six violations, the missing `vitruvius-contract` block among them, while carrying a
RATIFIED status. That is an authoring-gate escape (a plan reaching ratification while gate-failing), not
evidence the *build* gate needs a fresh reconciliation.

Required to temper: state Brunel Gate A's genuine delta over the authoring gate precisely — it is
(i) the Vitruvius gate passed on the ratified plan, so the contract block exists and class-matches the
ledger, plus (ii) the non-drift check (records unchanged since FORGE), plus (iii) the code-level
returned-key gate of F1. Do not re-specify the class-match reconciliation as if Brunel invents it.

### F4 — Weak — defect — D1 mischaracterizes the installed Gate A mechanism

D1 says Gate A's "mechanical basis was 'parse the §3 type Construction,'" prose-scraping and
Stage-5-specific. No installed Gate A text scrapes the §3 prose type; the installed basis (Brunel preamble)
is the code-level returned-key reachability check. The plan is correcting the artifact it names, so its
root-cause statement should match that artifact. Correct D1 to describe the installed mechanism, or, if
"parse §3 type" refers to a never-installed proposed mechanization, say that explicitly so the "defect"
is not attributed to the installed spec.

### F5 — Weak — recommendation — C1's reconciliation schema does not match the real ledger columns

C1 requires each contract member to resolve to "a ledger row naming a production producer, a production
consumer, the behaviour that depends on it, and a verification." The actual `vitruvius-ledger` schema is
`name | class | dir | producer | consumer | owner | lifecycle | verification` — there is no distinct
"behaviour that depends on it" column (nearest are `consumer`/`owner`), and the word "production" attaches a
genuineness claim to what C2 correctly calls a *records-completeness* check. Recommend: state C1's
mechanical check in the real column terms (member → ledger row with non-empty `producer`, `consumer`,
`verification`), and keep "genuine production consumer" out of the mechanical layer — it belongs to F1's
code-level gate and F2's Charpy read.

### F6 — Note — recommendation — C4's `[cell-id]` tag is inert without a reader; say so as C3 does

C4 records `[cell-id]` in both the Curie test name and the Brunel mutation name so a reader can bind
mutation→designated test. Until `campaign-gate.mjs` exists (deferred, C3), nothing reads the tag — the
binding is a manual per-cell obligation, exactly the caveat C3 states for Gate B. Recommend C4 carry the
same "manual until `campaign-gate.mjs` exists" note, so the tag is not mistaken for an enforced binding.

### F7 — Note — open-unknown — §7's meta-question is correctly left open

§7 asks whether persona-spec edits should themselves be review-gated (a freeze-guard on
`~/.claude/personas/**` until a ratification marker is present). The plan flags it without resolving it,
which is correct — resolving it by unilaterally building the gate would repeat the very error that
motivated the plan. Decision awaited: the user's and Charpy's call on whether to mechanize the
"author-plans-not-installs" boundary or hold it as discipline plus this routing. No action required of the
planner beyond keeping it open.

## Coverage

Blocking findings (Fatal/Structural) and how the planner's revision is verified:

- **F1** — the revised §5 retains the code-level returned-key gate (`dead-return-fields.mjs` /
  `construction-consumers.test.js`) as Gate A's mechanical basis; C1's records reconciliation is labelled a
  complement. Verify by re-reading §5 and C1 for the word "replace/rewrite" applied to the code-level gate,
  and by confirming the gate is named as retained.
- **F2** — the revised C2 splits the semantic duty by decidability: Charpy pre-FORGE for existing consumers
  + reachability; the code-level gate at admission for newly-built consumers. Verify the "before Brunel
  (admission)" checkpoint runs the code-level gate, not only a reconciliation pass.
- **F3** — the revised C1 states Brunel Gate A's delta as (Vitruvius gate passed) + non-drift + code-level
  gate, and does not re-specify the class-match reconciliation as new. Verify by cross-reading C1 against
  `vitruvius-plan-gate.sh` lines 298 and 313.

Weak/Note findings (F4, F5, F6, F7) are non-blocking; fold them into the same revision.

## Prediction

Built as written, the crack surfaces the first time a plan introduces a returned field whose only reader is
a **new** consumer the same plan adds. C1's reconciliation passes (records complete), Charpy's pre-FORGE
read finds no production to contradict it (the consumer isn't built yet), and if §5's "rewrite" was taken
to drop the code-level gate, the dead-returned-field defense that caught F1 is no longer running — so the
next F1 ships green. The Stage-5 plan is the standing proof: it is RATIFIED yet fails its own authoring gate
today, which is the same escape one layer up. The fix is cheap now (retain one gate, re-word two checkpoint
boundaries) and expensive after the specs are installed and a build has trusted them.
