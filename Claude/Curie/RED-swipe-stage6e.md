# RED suite — Stage 6e (Curie): owner-driven `disposeOwnedPanes(session, reason)`

Type: test-design (red-first)

Target plan: `Claude/Plans/PLAN-swipe-stage6e.md` (Charpy FORGE `Claude/Charpy/PLAN-swipe-stage6e-3e1b158.md`;
Loki HELD_STONE `Claude/Loki/STRIKE-swipe-stage6e-r1.md`). Authored against production HEAD build
`2026-07-27.253`.

Suite file: `test/swipe-stage6e.test.js` (9 tests, one per §8 cell plus the anti-no-op split into two
linked assertions). Driven through `test/app-harness.js` (the real `begin()`→supersession path via
`h.touch`) and the real DOM / labelled PBDebug trace. No production code written; `js/app.js` and
`js/nav.js` are pristine at HEAD (confirmed by `git status`).

`Verdict: **RED_SUITE_READY**`

---

## 1. Cell → test map (plan §7/§8)

| Cell | Test(s) | Kind @HEAD | Channel |
|---|---|---|---|
| NOOP (Loki residual 1, anti-no-op) | `NOOP.mechanism`, `NOOP.attribution` | **RED** | real DOM + `document.querySelectorAll` spy/neutralize |
| RSN | `RSN [DIAGNOSTIC]` | **RED** | PBDebug SWIPE trace (labelled diagnostic, EC §4.10) |
| DP | `DP.browse-browse`, `DP.browse-home` | parity (green), mutation-proven | real DOM (`.nav-ghost`, successor `start` log) |
| BR (Loki residual 2 invariant) | `BR` | parity (green), mutation-proven | real DOM (`#browse` survives; snapshot gone) |
| HR | `HR` | parity (green), mutation-proven | real DOM (orphan `.nav-ghost` gone before arm) |
| DEC | `DEC` | parity (green), mutation-proven | real DOM (`.np-pill-float` gone) |
| RGreveal | `RGreveal` | parity (green), mutation-proven | held-reveal `holds` signature |
| RGsup | reconciled by reference (block at file end) | — | owned by swipe-stage6c/6d cells |

Every applicable Coverage-Model cell (§7) is realized or reconciled; nothing is left bare.

---

## 2. The anti-no-op cell — design (Loki residual 1, the crux)

Loki's strike proved (`STRIKE-swipe-stage6e-r1` §3/§6) that **no stray `.nav-ghost` is constructible**:
every connected `.nav-ghost` under a live session is that session's owned-pane mover. The consequence is
adversarial: on the owned recovery branch the **DOM outcome is byte-identical whether the DOM-global
sweep runs or `disposeOwnedPanes` does** — the same node is removed either way. So a pure DOM-outcome cell
(DP) *cannot* catch a build that threads `keepGhosts:true` at neither site — or at only one of the two —
and lets the global sweep keep doing the removal. In that build `disposeOwnedPanes` is a behavioural
**no-op** and the slice's structural value (EC §4.3, "do not operate through whatever is global") is
silently lost while every DOM assertion stays green. Loki residual 2's second observation names the two
sweep sites precisely: the explicit `resetSwipeStyles()` at `app.js:416` **and** `applyScreen`'s internal
`resetSwipeStyles(opts.keepGhosts)` at `app.js:417` → `nav.js:120`. Both must pass `keepGhosts:true` on the
owned branch, or the sweep still fires.

The cell therefore observes the **mechanism**, in two linked assertions:

- **`NOOP.mechanism`** — install a counting spy on `document.querySelectorAll` and count every call with the
  exact selector `'.nav-ghost'` during the supersession's recovery. `resetSwipeStyles` (nav.js:103) is the
  *only* caller of that exact selector; the `.spent` clear uses `'.nav-ghost.spent'` and the recovery
  predicate uses `querySelector` (singular) — neither is counted. Assert the count is **0**. RED @HEAD:
  the sweep runs **twice** (both `:416` and `:417`). A build that suppresses the sweep at only one site
  still trips this (count 1); only suppressing it at **both** greens it. This is the assertion that fails
  if the owned branch still runs the global sweep — the whole point Loki demanded.
- **`NOOP.attribution`** — neutralize the sweep (make the exact `'.nav-ghost'` query return an empty
  NodeList — the Loki/Loftus causal move: disable the claimed cause and re-run) and assert the owned pane is
  **still removed**. RED @HEAD: with the sweep dead the ghost **survives** (HEAD has no owner-driven remover
  — actual `ghosts=1`, expected `0`). GREEN only when `disposeOwnedPanes` removes the pane through
  `cur.movers` (`el.remove()`), independent of the DOM query — which *positively attributes* the removal to
  the owner, not the sweep.

Together: (mechanism) the global sweep does not run on the owned branch, and (attribution) the pane is gone
anyway → the remover is `disposeOwnedPanes`. This is what makes the whole slice non-vacuous.

---

## 3. RED run against HEAD (the right reason, not an import error)

`node --test test/swipe-stage6e.test.js` → `# tests 9 / pass 6 / fail 3`. The three failures, each a clean
`AssertionError` (`ERR_ASSERTION`) driven through the real path — not a `TypeError` from a missing symbol,
not a compile/import error:

```
not ok 1 NOOP.mechanism   AssertionError expected 0 actual 2
  "…the sweep runs twice (explicit resetSwipeStyles at app.js:416 AND applyScreen's internal
   resetSwipeStyles at app.js:417/nav.js:120)… Global sweeps during recovery=2"
not ok 2 NOOP.attribution AssertionError expected 0 actual 1
  "…with the global sweep neutralized the owned ghost SURVIVES, because HEAD has no owner-driven
   remover… ghosts after recovery=1"
not ok 3 RSN [DIAGNOSTIC]  AssertionError expected true actual false
  "…must record reason 'superseded' in the PBDebug SWIPE diagnostic. No SWIPE line carries it at HEAD…
   SWIPE lines=['start back authors→books ghosts=0','leftover state on begin → hard reset sid=1']"
```

Each reddens because the mechanism the slice introduces (owner-driven, reason-tagged disposal + the
keepGhosts suppression) is genuinely absent at HEAD, reached through the real `begin()` recovery — exactly
the cell's reason.

---

## 4. Parity cells — mutation-proven capable of failing (tests-must-be-able-to-fail)

DP/BR/HR/DEC/RGreveal assert PARITY behaviour (the plan §3: "Nothing the user sees changes"; byte-for-byte).
Each is GREEN @HEAD and was driven, mutated, watched to redden, and restored — synchronously, one mutant at
a time (`node tools/mutate.mjs <i>` → run → `--restore`; no `*.mutbak`/`*.manualbak` remained after each).
Forcing them red at HEAD would require a consistency oracle (which cannot see wrong-but-deterministic —
Curie dimension-10) or asserting a behaviour change the plan says does not happen; the red-at-HEAD
non-vacuity is carried by NOOP and RSN, exactly as 6d carried it on FP/CLB while AB/RC were parity.

| Cell | Mutant | Result |
|---|---|---|
| DP.browse-browse | `#13` begin() stops hard-resetting a superseded session | RED (owned ghost stranded) ✓ |
| DP.browse-home | `#13` | RED (home-snapshot stranded) ✓ |
| BR (snapshot clause) | `#13` | RED ✓ |
| BR (borrowed-survives clause, Loki residual 2) | manual: broaden the recovery disposer to remove **every** `cur.movers` element (`for (const m of cur.movers) m.el.remove()`) | RED (`#browse` removed) ✓ |
| HR | `#13` | RED (orphan survives into the new gesture) ✓ |
| DEC | manual: drop the `.np-pill-float` removal at `nav.js:104` (`#13` also reddens it coarsely) | RED (pill leaks) ✓ |
| RGreveal | `#54` finalizationPlanFor forces `abortRender:'none'` | RED (`holds` delta 0 — the held-reveal branch never fires) ✓ |

Under `#13` the RGreveal cell stayed GREEN (the reveal path is untouched by the recovery mutation),
confirming RGreveal is a real flash-surface pin rather than a cell that reddens on anything.

The two **manual** mutations exist because their true built-code defenders (BR's "broaden the filter";
DEC's "guard `.np-pill-float` behind `keepGhosts`") target `disposeOwnedPanes`, which does not exist at
HEAD — so they are the plan §9 mutants **Brunel registers in `tools/mutate.mjs`** at build. The manual
edits here are channel-liveness proofs (each backed up, applied, run, and restored from backup); nothing
was left in the tree.

---

## 5. Invariant coverage (Loki residual 2)

- **Tested:** `BR` pins the load-bearing invariant that a `borrowed-real` mover (`#browse`/`#home`/overlay)
  is **NEVER** removed by `disposeOwnedPanes` — on a browse→home supersession the owned home-snapshot is
  disposed and the borrowed `#browse` survives. Mutation-proven (§4). This is EC §4.4 / plan §3.2 realized
  as a structural guarantee of the `own` filter. `invariant_tested = true`.

- **Owed (flagged, no production code written):** Loki residual 2's *deeper* invariant — "every connected
  `.nav-ghost` under a live session is an owned-pane mover" — is **currently UNGUARDED**. Loki's P3 closes
  today only because the one mid-build callback (`env.renderDestination` → `Browse.render`) is `async`, so a
  sync-section throw becomes a rejected promise, never a synchronous unwind that would strand a live session
  with empty `movers` and a mounted ghost. Under 6e that stranded pane would be an opaque full-viewport pane
  the owned-branch `keepGhosts:true` no longer self-heals (the old global sweep did). **This is not
  constructible at HEAD**, so no red test can be authored for it now — a test that cannot force its failure
  is worse than none. It is flagged as **owed**: a future synchronous `renderDestination` (or a sync rewrite
  of `Browse.render`) reopens it. Routing recommendation: a production GUARD (e.g. the mid-build mount is
  torn down on a synchronous throw, or the owned-branch retains a bounded self-heal) — which the plan does
  not specify — should route to a **plan amendment / Brunel guard**, with a Curie red test added once the
  guard gives the failure a constructible trigger. Recorded here so it loads before the next `renderDestination`
  change rather than being rediscovered.

---

## 6. Honest scope / classification notes

- **DP is parity, not red-at-HEAD.** The commission listed DP among "new-behavior cells RED against HEAD."
  On the real code that is not achievable for the right reason: at HEAD the global sweep already removes the
  owned ghost, so every DP DOM-outcome assertion is GREEN (byte-for-byte parity — plan §3 "Nothing the user
  sees changes"; Charpy S4). Making DP red would need a consistency oracle (dimension-10 violation) or an
  assertion of a behaviour change the plan denies. DP is therefore authored as a parity feature-oracle,
  mutation-proven capable of failing (`#13`). The red-at-HEAD non-vacuity the commission requires is carried
  by **NOOP** and **RSN**, which observe the absent mechanism directly. This is the same split 6d used
  (FP/CLB red; AB/RC parity).
- **RSN is a labelled diagnostic** (EC §4.10), kept out of the behavioural set. Its part (2) additionally
  pins Charpy's prediction / F2 — a pane-LESS supersession disposes nothing, so it must NOT emit a
  `'superseded'` reason; that clause is green @HEAD and load-bearing once the trace exists (its defender is a
  build that emits the reason unconditionally).
- **jsdom has no layout/paint**, so nothing here speaks to the compositor flash (plan §10 — independent of
  the entire rewrite). RGreveal pins the reveal branch/timing is untouched via the observable `holds`
  signature, not pixels.
- **Fingerprint / model-mirror regeneration** (`test/swipe-model.test.js:44`, the dispose-reason mirror at
  ~214) is a **Brunel** in-slice obligation (plan §9); the suite does not depend on it.

---

## 7. Handoff

- **To Brunel (green):** add `disposeOwnedPanes(session, reason)` near the session-cleanup helpers; in the
  `begin()` recovery add `if (cur) disposeOwnedPanes(cur, 'superseded');` before the reset, and thread
  `keepGhosts:true` on the owned branch at **BOTH** sites — `resetSwipeStyles(cur ? true : undefined)` at
  :416 **and** `keepGhosts: cur ? true : undefined` in the `applyScreen(...)` opts at :417 (NOOP.mechanism
  reddens if either is missed). Emit the `'superseded'` reason trace ONLY when a pane is actually disposed
  (RSN part 2 / Charpy prediction). Do NOT touch the reveal path (RGreveal). Register the DP/BR/HR/RSN/DEC
  built-code mutants in `tools/mutate.mjs` and regenerate the model mirror + fingerprint in the SAME commit
  (plan §9).
- **To Mendeleev (audit):** the suite realizes §7's applicable cells; the one **owed** item (§5, the
  unguarded sync-throw stranding invariant) is a coverage gap that cannot be red-authored at HEAD and routes
  to a plan amendment / guard.
