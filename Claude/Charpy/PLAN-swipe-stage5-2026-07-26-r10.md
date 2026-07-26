# CHARPY CASEBOOK — PLAN-swipe-stage5 §3 re-gate (round 10) — 2026-07-26

Fresh Charpy instance (r1–r9 ran in a non-resumable session). Re-gated against the artifacts at
commit `c743c49` (HEAD), not against remembered rationale.

## Scope

NARROW. Not a re-review of Stage 5 (ratified FORGE at r9). This gates ONLY the single
post-ratification edit that `c743c49` made to §3 of `Claude/Plans/PLAN-swipe-stage5.md`, because
editing a ratified plan re-opens that scope.

**The edit:** §3 line 150 changed the `Construction.decorations` field type from
`Readonly<{ kind; base }[]>` to `{ kind; base }[]`, adding a note that the projection is a fresh
UNFROZEN NON_CONTRACT array and the prior transitive freeze is intentionally not preserved. A
paired DecisionLog entry (2026-07-26, on Loki strike NB1) records the ruling as DOCUMENTARY.

## What I verified (primary evidence, read directly)

1. **`buildConstruction` is genuinely registered NON_CONTRACT.**
   `test/contract-function-gate.test.js` @0049a13 lists it in the `NON_CONTRACT` map (line ~35–37,
   reason: "returns a Construction carrying LIVE DOM nodes"). Only `classifyTransition` and
   `constructionPlanFor` are in `CONTRACT` and thus gated for deep-freeze / clone-before-freeze.
   `buildConstruction` is exempt by the gate itself, not by assertion. VERIFIED.

2. **The return genuinely carries live DOM nodes → cannot be deep-frozen.**
   §3 `Mover = { element: Node, ownership, slot }`; the return
   `{ decorations, movers: { outgoing, incoming, decoration }, capture, sourceWasClobbered }`
   (`js/swipe.js:327` @0049a13) reaches live DOM through `movers[].element`. A deep freeze would
   recurse into and freeze the DOM nodes — semantically broken. The §4.11 gate's NON_CONTRACT
   exemption is legitimate, not a convenience. VERIFIED.

3. **The projection IS unfrozen at 0049a13 (current truth is stated accurately).**
   `js/swipe.js:326` `const decorations = plan.decorations.map(({ kind, base }) => ({ kind, base }));`
   then `:327` returns it with NO `Object.freeze`. Contrast: the two CONTRACT functions freeze
   explicitly (`classifyTransition` `:104–105`, `constructionPlanFor` `:143–144`). The plan writes
   `Object.freeze` everywhere it wants a runtime freeze; the projection deliberately omits it.
   §3 line 150's "FRESH UNFROZEN array … not runtime-frozen" matches the code exactly. VERIFIED.

4. **The prior freeze was transitive/incidental, not a buildConstruction-authored promise.**
   The old five-key return embedded `c.plan` (the frozen output of `constructionPlanFor`), so
   `c.plan.decorations` was frozen for free. `buildConstruction` never authored a freeze on its own
   top-level return. Dropping the `plan` wrapper (ratified at r5) and hoisting a fresh projection
   naturally yields an unfrozen array. The freeze was a side effect of embedding a frozen sub-object,
   not a property of the seam. VERIFIED.

5. **Internal consistency — line 150 was the SOLE immutability claim on `decorations` (Vitruvius's
   claim, independently confirmed).**
   HEAD-wide scrub of the plan @c743c49 for `readonly|frozen|freeze|immutab`: the only
   decorations-immutability assertion was the old line 150. Every other hit is unrelated —
   `freezeArt` (a DOM `data-art` helper), "frozen spec / frozen-model" (the independent declarative
   transition spec), "no scroll freeze" (ghostY capture), and "immutability/exact-key gate" (the
   CONTRACT-function gate, which covers `classifyTransition`/`constructionPlanFor`, not
   `buildConstruction`). The machine-readable `vitruvius-contract` block (`decorations | object`) and
   the §4 ledger row (line 279) record class only, no immutability — no contradiction with the edited
   §3. Also confirmed the type block never annotated `movers`/`capture`/`Mover`/`Capture` as
   `Readonly` — the asymmetry corroborates that `Readonly<decorations>` was documentary, not policy.
   VERIFIED.

6. **DecisionLog entry is well-formed.** Appended at the bottom (not inserted), dated 2026-07-26,
   states current truth, references the Loki strike NB1 it rules on. Complies with records standard.

## Findings

None blocking.

**Non-blocking observation (not a finding, recorded for the next stage):** the residual risk Loki's
NB1 named — a future L3 consumer could mutate the now-unfrozen array where the old shape would have
thrown — is honestly accounted, not a silent gap: it is stated in the Loki strike (NB1), in the
edited line 150 ("intentionally not preserved"), and in the DecisionLog entry. The declined freeze
is not load-bearing the way the CONTRACT-function freezes are: `buildConstruction`'s return is a
fresh per-gesture object that `start()` consumes read-only and discards, so a hypothetical future
mutation cannot leak across gestures or corrupt shared/cached state (unlike the shared classification
object the `classifyTransition` freeze protects, per the `js/swipe.js:101–103` comment). Loki's
one-line hardening (freeze the `decorations` sub-array alone — it is plain `{kind,base}` data and is
freezable even though the whole Construction is not) remains available to a future stage; nothing in
this edit forecloses it. It blocks nothing here.

## Verdict

**FORGE.** The §3 edit is sound and may be re-ratified.

- The DOCUMENTARY ruling holds against primary evidence: `buildConstruction` is a genuinely
  NON_CONTRACT seam whose return carries live DOM nodes and is legitimately exempt from the §4.11
  deep-freeze gate; `Readonly` was a compile-time annotation documenting an incidental transitive
  freeze, not a runtime promise the seam authored. Not `Readonly` weakened to fit the implementation.
- §3 states current truth accurately and completely: the projection is unfrozen at 0049a13, and the
  edit says so plainly.
- No other part of the plan or its machine-readable blocks contradicts the edited line 150.
- The one residual (future mutation of the unfrozen per-gesture array) is named and deferred
  honestly, and is not load-bearing given the object's ephemeral, read-only-consumed lifecycle.

```json
{"persona":"charpy","stage":5,"round":10,"input_artifact":"c743c49","verdict":"FORGE","blocking_ids":[],"return_to":"none"}
```
