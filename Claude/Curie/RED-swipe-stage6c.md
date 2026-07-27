# RED suite — Swipe/reveal Stage 6c (Curie)

Type: test-design / red report
Date: 2026-07-26
Input artifact: `Claude/Plans/PLAN-swipe-stage6c.md` (ratified, target 94f5567) — §8 Coverage Model, §9 coverage/mutation matrix.
Suite file: `test/swipe-stage6c.test.js` (test-only; no production changed).
Red command: `C:/Users/nzilb/tools/node-dist/node.exe --test "test/swipe-stage6c.test.js"`
Harness: `test/app-harness.js` (boots the REAL `js/app.js`; observability = the successor's real DOM + SWIPE log).
Verdict: **RED_SUITE_READY** → Brunel (green) and Mendeleev (audit).

## 1. What Stage 6c must make true (the promise these tests gate)

`begin()`'s `finishing` gate (js/app.js:352) today blanket-rejects every gesture during
settle: `if (finishing) return;`. Stage 6c narrows it to admit ONLY a live PANE-LESS session
(`if (finishing && !(session && paneLess(session))) return;`), so a successor can arm
mid-settle; lands the `cur === session` ownership guard on the settle rAF (551-553) and on
`finalize` (1159-1179) so a stale continuation after supersession no-ops on the successor;
and clears `finishing = false` in the supersession recovery so a superseding tap that never
arms cannot wedge future swipes.

## 2. Why every NEW cell is red on current HEAD (red-for-the-right-reason)

The intended pane-less supersession is entirely absent today, so each new cell reddens on the
behavior the build introduces — not on a setup artifact. Proof: in every G-cell the failure
lands at the supersession assertion (the F4 `paneOf` checks, the `A settling` check, and the
runtime `ghosts === 0` check all pass first); in the W-cells the failure is the wedged next
swipe (`starts` stays 1).

Captured run (current HEAD, unbuilt):

```
not ok 1 - G1  → app-harness.js line 112: 'the narrowed gate must admit a pane-less supersession so successor B arms'  (expected true, actual false)
not ok 2 - G2  → line 144: same narrowed-gate assertion (B never arms)
not ok 3 - G3  → line 178: same narrowed-gate assertion (B never arms)
not ok 4 - W        → line 214: next swipe engages — expected 2, actual 1 (finishing stuck true → wedge)
not ok 5 - W(armed) → line 233: next swipe engages — expected 2, actual 1 (wedge)
ok   6 - PG   (boundary guard: pane-owning session correctly rejected; ghosts===1 asserted → non-vacuous)
not ok 7 - G-chain (supplementary) → line 299: gate must admit B superseding pane-less A (B never arms)
# tests 7 # pass 1 # fail 6
```

- **G1/G2/G3, G-chain** redden at *B (or C) never arms*: the blanket gate rejects the second
  touch, so the successor-protection guard is unreachable. This is the intended missing
  behavior (narrowed gate + identity guard together — plan §2.4). On the built-but-guardless
  code the same tests instead redden at their guard assertion (Loki's NOGUARD probe 6 proved
  the stale rAF stains B and the stale finalize commits over B and drops B's row hold), so the
  cells also carry their §9 mutation.
- **W / W(armed)** redden at *the next swipe wedges*: with no recovery to clear `finishing`,
  the flag stays true (A's 340ms finalize is deliberately NOT advanced), so the fresh swipe is
  rejected. On the built-but-clearless code the same test reddens (Loki's NOCLEAR probe 7
  proved the wedge under the negative gate).

## 3. Per-fixture pane-less assertion (Charpy F4, BINDING)

Every G/W cell calls `assertPaneLessFixture()` before the supersession step, which asserts —
IN the test — that the fixture transition is genuinely pane-less two independent ways:

1. Frozen oracle: `paneOf(STRUCTURAL_CASES[overlay→browse].expectedConstruction) === false`
   (`test/fixtures/swipe-plan-spec.mjs`).
2. Production classifier for the concrete screens:
   `paneOf(Swipe.constructionPlanFor(Swipe.classifyTransition({from:{v:'options'}, to:{v:'books'}}))) === false`.

It then asserts the RUNTIME paneLess equivalent — `ghosts(h) === 0` while A is settling — so
the actual gesture materialized no owned pane. The fixture is **overlay→browse (options→books)**,
Loki's working Probe B/C fixture. A secretly pane-owning fixture would make the narrowed gate
reject the second touch and the cell would be unsatisfiable — the exact KILL that hit the r3
draft; these assertions prevent it. PG is the symmetric pin: it asserts the browse→browse
structural case is pane-OWNING (`paneOf === true`) and that a real `.nav-ghost` materialized
(`ghosts === 1`), so the boundary it pins is non-vacuous.

## 4. Cell → test → oracle → mutation inventory

All oracles are FEATURE oracles: each executes the real `begin()`/`settle()`/`finalize()`
through the harness and asserts the successor's real end-state (mover transforms, the
commit/abort log line, endHold calls, subsequent-swipe engagement) — never a consistency
oracle.

| Cell | Kind | Test (name) | Behavior asserted | Red-now reason | Built-code mutation that reddens it |
|---|---|---|---|---|---|
| G1 | NEW (red-first) | `G1 — a stale settle rAF …` | after A's stale settle rAF fires, B's `#options`/`#browse` transforms are unchanged from B's drag | B never arms (blanket gate) | remove the settle-rAF `cur === session` guard → stale frame stains B |
| G2 | NEW (red-first) | `G2 — a 340ms settleTimer …` | A's stale 340ms `settleTimer`→finalize runs no commit/abort, drops no row hold, leaves B intact | B never arms | remove the finalize `cur === session` guard → `finalize_A` commits over B and drops B's hold |
| G3 | NEW (red-first) | `G3 — a late transitionend …` | a late `transitionend` on A's anchor (`#options`) runs no `finalize_A` over B | B never arms | remove the finalize `cur === session` guard → late `transitionend` finalizes over B |
| W | NEW (red-first) | `W — a superseding mid-screen tap …` | a superseding tap that never arms leaves the next full swipe engaging | `finishing` stuck true → wedge | omit `finishing = false` in the recovery → next swipe wedges under the negative gate |
| W(armed) | NEW (red-first) | `W(armed) — a superseding edge-tap …` | an armed-then-unlocked superseding tap leaves the next swipe engaging | wedge | omit `finishing = false` in the recovery |
| PG | BOUNDARY guard (green now + after) | `PG — a pane-owning settling session stays rejected …` | a pane-owning (browse→browse ghost) session stays rejected; its held pane is not disposed | (green — blanket gate rejects; stays green once the gate narrows to pane-less only) | narrowed gate wrongly supersedes a pane-owning session → recovery disposes its held pane |
| G-chain | SUPPLEMENTARY (red-first; beyond §9) | `G-chain … A→B→C …` | across A→B→C both superseded generations' stale rAFs/timers/`{once}` listeners no-op onto live C | B/C never arm | remove either `cur === session` guard → a stale generation stains/finalizes over C |

## 5. New-vs-guard inventory (what is red-first vs what must stay green)

- **NEW red-first cells (the Stage-6c promise; must be RED now, GREEN after the build):**
  G1, G2, G3, W, W(armed). Plus the supplementary G-chain.
- **Boundary guard (GREEN now and after; the deferral boundary EC §4.18 / subsystem §14):**
  PG — a pane-owning session stays rejected. Green today only because the blanket gate rejects
  everything; Brunel must keep it green by narrowing the gate to admit pane-less sessions ONLY.
- **Existing shipped regression guards RG226 / RG6b / RG6a / RGend (NOT re-authored here):**
  these already live in `test/swipe-invariants.test.js` (e.g. `:598` the `.223` finding-1a
  cancelled-settle-rAF test = RG226; `:623` the throw-does-not-wedge test = the wedge class W
  extends; `:588`/`:569` the endpoint tests = RGend; the 6b loser-cancel and 6a
  dragging-recovery suites = RG6b/RG6a). Per the commission they stay green and are not
  duplicated in this file. Brunel/Mendeleev run the whole `test/*.test.js` set; these guards
  must remain green through the 6c change.

## 6. Disposition of Loki's extra interleavings (r2 held-stone, §6)

Loki's r2 strike named two interleavings beyond the ratified §9 set, both HELD on the scratch
build. Judgment:

- **Chained supersession A→B→C** — ADDED as the supplementary cell `G-chain`. It strengthens
  the misattribution axis (Identities / Composition, §8): it proves the identity guard is not a
  single-generation special case — two superseded generations' stale continuations must all
  no-op onto the live third owner. Low cost, proven skeleton (Loki probe 9), same pane-less
  fixture, red-first for the same reason (the gate must admit B and C). Kept clearly labeled
  supplementary so it does not masquerade as a ratified §9 cell.
- **A pane-OWNING successor B superseding a pane-less A** (Loki probe 2) — NOT added as a 6c
  cell; recorded as a NOTE. The gate reads the SUPERSEDED session (A), not the successor (B), so
  admitting is correct regardless of B's kind — and this cell adds no distinct red-first signal
  (B still cannot arm today). Its natural home is 6d/7, where PANE-OWNING supersession (and the
  held-reveal window it needs) becomes the subject; today PG already pins that a pane-owning
  session is not superseded. Flagged for Mendeleev as an optional strengthening for the 6d/7
  window.

No Coverage-Model gap was found: the §8/§9 model is Charpy-tempered (plan header records the
r4 ratification after the Loki KILL correction), every applicable dimension maps to at least
one authored cell above, and the fixtures were derivable to concrete assertions without any
missing or too-vague cell. Nothing is routed back to the planner.

## 7. Notes for Brunel (green) — watch-points the tests will enforce

- Place the `finalize` identity guard AFTER the `done` set and the two shipped cancels
  (`cancelAnimationFrame`/`clearTimeout`) and BEFORE the `try { runFinalize() } finally { … }`
  block (plan §7). Inside the `try`/`finally`, a stale `finalize_A` would run `dropRowHold()` /
  `endOwnership()` against the module `session` — dropping the SUCCESSOR's row hold. G2's
  `endHolds` assertion is the tripwire for that misplacement.
- The recovery must clear `finishing = false` under the NEGATIVE gate form
  (`if (finishing && !(session && paneLess(session))) return;`). A positive pane-owning check
  would make the clear a dead write and W vacuous (Charpy r2 F5). W/W(armed) enforce the clear;
  PG enforces that pane-owning sessions still reject.
- `Nav.resetSwipeStyles` must clear the `transition` property as well as `transform` (plan §2.3
  F3) so a superseded borrowed-real mover does not animate to its reset value after B arms.

## 8. Post-build note (2026-07-26)

Brunel's Stage-6c build greened all 7 cells of `test/swipe-stage6c.test.js` (red→green as
designed). The build moved the begin/supersession SOURCE fingerprint
`d39534854e3cc348` → `c5ab2fae0fd03654` (confirmed via `gen.supersessionFingerprint()`);
`test/swipe-model.test.js` `VERIFIED.supersession` was updated to match and the file is
11/11 green. Full suite: 705 tests, 702 pass, 1 skip, **2 fail** — both outside this
task's scope and both traceable to Brunel's `js/app.js` edit, not to the pin update:
mutation anchor #64 (`swipe5 F2-r-wiring` source text moved) and
`test/swipe-stage5-wiring.test.js:103` (back→home now synthesizes `d.ghostY=0` where it
must be left untouched) — flagged to Brunel/coordinator.
