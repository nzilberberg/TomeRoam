# Poirot casebook — ba1c59b — Swipe/reveal Stage 6c (pane-less supersession + settle-phase identity guard)

Type: code-review
Prior-review: 8e968fb-swipe-stage6b.md
Range: build.json, docs/swipe-model.generated.txt, index.html, js/app.js, js/debug.js, sw.js,
test/swipe-model.test.js, test/swipe-stage6c.test.js, tools/mutate.mjs, Claude/Brunel/swipe-stage6c-build.md,
Claude/Curie/RED-swipe-stage6c.md
Input artifact: commit ba1c59b (HEAD, working tree clean)
Date: 2026-07-26

## Verdict

**SHIP / PASS.** The three production seams in `js/app.js` implement the ratified plan's §3/§4/§7 exactly,
on the domain the Loki KILL corrected: the negative finishing gate admits ONLY a live pane-less session and
rejects both a null session and a pane-owning session; the `finishing = false` clear sits before the
identity-null-last in the supersession recovery; and the `cur === session` guards sit as the first statement
of the settle rAF and — in `finalize` — after the `done` set and the two shipped cancels and BEFORE the
`try/finally`, so a stale finalize cannot drop the successor's row hold. The change is scoped to the
pane-less path; pane-owning behaviour is untouched (the gate still rejects it, and the `ghostY` assignment at
:511 is the ORIGINAL conditional — no §21 mutation artifact survived). The deferred null-writes and
`transitionListener` ownership are confirmed absent. The re-pinned fingerprint reflects the sanctioned
region. I mutation-verified the guards load-bearing THIS pass (stripping both reddens G1/G2/G3/G-chain,
leaves W/W(armed)/PG green). No code defect. The only open items are plan-sequenced records obligations
(§10, apply-on-approval) and Loki-flagged design/coverage consequences already routed to their owners —
none of which a code reviewer requires changed in the code before ship.

## The scene (what the commit does)

Three edits inside `bindSwipeBack`, plus one helper and one comment correction:
- **`paneLess` helper (`js/app.js:251`)** — `(s) => !s.movers.some((m) => m.own === 'owned-pane')`. Reads the
  runtime `own` tag `Swipe.buildConstruction` assigns each mover.
- **`begin()` negative gate (`:368`)** — `if (finishing && !(session && paneLess(session))) return;` replaces
  the blanket `if (finishing) return;`.
- **Recovery block (`:383-420`)** — entry predicate broadened to `|| (finishing && session)`; body reads
  `cur = d || session`; `finishing = false` (`:418`) sits after `dropRowHold()` and before `session = null`.
- **Settle rAF guard (`:588`)** — `if (cur !== session) return;` as the first statement of the rAF callback.
- **Finalize guard (`:1215`)** — `if (cur !== session) return;` after `done = true` (`:1197`) and the two
  cancels (`:1200`, `:1205`), before the `try { runFinalize() } finally {...}` (`:1222`).
- **Stage-3 rationale comment (`:216-234`)** — rewritten from "UNREACHABLE BY CONSTRUCTION" to current truth
  (guard now reachable/load-bearing for the pane-less window, deferred for pane-owning), avoiding a
  code-contradicting comment (Standards §7).

Eight other files are non-behavioural: build.json / js/debug.js / sw.js / index.html are the mechanical
`.250 → .251` build-stamp + cache-bust bump (index.html diff is EXCLUSIVELY version strings — a
non-version filter returns empty); docs/swipe-model.generated.txt is the fingerprint/citation regen;
tools/mutate.mjs re-anchors six rotted stage-6a mutations (`d`→`cur`, inserted `finishing = false`) and
registers three new ones (W/G1/G2-G3); the two Claude/* files are records; test/swipe-stage6c.test.js is
Curie's suite (audited by Mendeleev, not re-authored here); test/swipe-model.test.js is Curie's fingerprint
re-pin.

## What I verified (executed this pass — node v22.23.1 at C:/Users/nzilb/tools/node-dist/node.exe)

- **Negative gate, all (finishing, session) combinations (read + executed).** finishing=false → falls
  through (pre-6c parity); finishing=true + session=null → `!(false)`=true → REJECT (stuck-finishing wedges,
  F5); finishing=true + pane-owning → `paneLess`=false → `!(false)`=true → REJECT (cell PG); finishing=true +
  pane-less → `!(true)`=false → falls through (G1/G2/G3/W). Admits ONLY a live pane-less session. The
  recovery-entry `(finishing && session)` at `:383` is reachable only after the gate rejected every other
  combination, so `session` there is always pane-less — the absolute claim in the `:377-382` comment,
  verified.
- **`paneLess` faithfully mirrors the frozen-spec `paneOf` (read).** `js/swipe.js:293/303` tag `owned-pane`
  ONLY on the `app-ghost` outgoing and the `home-snapshot` incoming branches; borrowed-real movers get
  `borrowed-real` (`:296/307/312`), the NP pill gets `owned-decoration` (`:318`). So
  `!movers.some(own==='owned-pane')` ≡ `!(outgoing==='app-ghost' || incoming==='home-snapshot')` = `!paneOf`.
  Curie's F4 per-fixture `paneOf` assertions execute this equivalence in the target suite (below).
- **Guards are load-bearing (EXECUTED mutation this pass).**
  `node --require <scratch>/strip-guards.cjs --test test/swipe-stage6c.test.js` (an fs-interceptor that
  strips both `if (cur !== session) return;` lines in-memory at harness read — zero production files
  modified) → G1, G2, G3, G-chain FAIL; W, W(armed), PG stay pass. The guard is the entire mechanism; without
  it the stale settle rAF/finalize corrupt the successor. Independently reproduces Brunel §10 and Loki r2
  probe 6.
- **Target suite green on the committed tree.** `node --test test/swipe-stage6c.test.js` → 7/7
  (G1, G2, G3, W, W(armed), PG, G-chain).
- **Fingerprint honest.** `node --test test/swipe-model.test.js` → 11/11. The pin
  `supersession: 'c5ab2fae0fd03654'` (`test/swipe-model.test.js:50`) equals `gen.supersessionFingerprint()`
  (`:86`) over the current source — the region that changed (begin's gate + hard-reset block) is exactly the
  mirrored region, the fingerprint moved with it, and the pin was re-pinned to the new source. Not gamed.
- **Full suite green.** `node --test "test/*.test.js"` → 705 tests, 704 pass, 0 fail, 1 skip (the
  pre-existing device-only KEEPER). Matches Brunel §15. Working tree still clean after the probe run.
- **Out-of-scope / pane-owning untouched.** The `ghostY` assignment at `js/app.js:511` is
  `if ('ghostY' in c.capture) d.ghostY = c.capture.ghostY;` — the ORIGINAL conditional, NOT the always-assign
  `to`-text of mutation #64; Brunel's §21 restore held, no artifact at HEAD. `git show ba1c59b -- js/app.js`
  touches only the six regions above; the pane-owning path (gate rejection, held-reveal, pane disposal) is
  unchanged.
- **Deferred items confirmed absent.** `grep -nE "(settleFrame|settleTimer|revealFrames|revealTimer)\s*=\s*null"`
  → none (settle/reveal null-on-retire writes deferred, F1/§11). The `transitionend` listener at `:1228` is
  the bare `{once:true}` local — not session-owned, not removed (deferred). No `sameBrowseHost`,
  `finalizationPlanFor`, or returned `classification` field introduced — no §4.15 dead field.
- **Recovery ordering / null-safety.** `dropRowHold` (`:346`) is `if (!session || !session.hold) return;` —
  null-safe on the orphan path, confirming the `:410-411` comment; `sessionDone` (`:242`) nulls only if
  `session === s` (supersession-safe). The recovery order render+scroll → `dropRowHold` (reads session) →
  `finishing = false` → `session = null` → `d = null` matches plan §7.

## Coverage ledger (all cells filled — ✓ executed this pass / ~ read-reasoned / n/a)

| Changed symbol / file | Correctness / data-flow | Deferred-resource / cancel sweep | Lifetime / teardown-symmetry | Comment / absolute-claim | Out-of-scope / pane-owning | Fingerprint / gate |
|---|---|---|---|---|---|---|
| `paneLess` helper (`:251`) | ✓ target suite F4 paneOf assertions + ~ swipe.js `own`-tag read | n/a | ~ pure read of movers | ~ `:247-250` matches classifier | ~ keys `owned-pane` only, not `owned-decoration` | ✓ target suite |
| `begin()` negative gate (`:368`) | ✓ all 4 (finishing,session) combos read + G1/G2/G3/W green | n/a | ~ no resource | ✓ `:358-367` "negative form load-bearing" verified | ✓ pane-owning REJECTs (PG green + strip-probe PG pass) | n/a |
| recovery block (`:383-420`) | ✓ full suite + strip-probe W green | ✓ releaseGesture/dropRowHold; no new deferred resource | ✓ `finishing=false` before identity-null-last; dropRowHold null-safe (`:346` read) | ✓ `:377-382` "session always pane-less" + `:405-412` clear-before-null verified | ✓ predicate unreachable for pane-owning (gate rejects first) | n/a |
| settle rAF guard (`:588`) | ✓ strip-probe → G1/G-chain redden without it | ✓ `.226` cancel at `:1200` preserved | ~ borrowed-real movers, guard gates write | ✓ `:583-587` verified | ✓ no pane-owning effect | n/a |
| finalize guard (`:1215`) | ✓ strip-probe → G2/G3/G-chain redden without it | ✓ 6b `clearTimeout` at `:1205` preserved; pre-guard cancels touch only `cur`'s own ids | ✓ placed before try/finally → stale finalize cannot drop successor row hold (G2 endHolds tripwire) | ✓ `:1206-1214` verified against control flow | ✓ pane-owning finalize unreachable (gated) | n/a |
| stage-3 comment (`:216-234`) | n/a | n/a | n/a | ✓ rewritten to current truth, no code contradiction | n/a | n/a |
| `js/app.js:722` classifier comment | n/a | n/a | n/a | finding (Observation O2) — pre-existing false "app-ghost (browse→browse)", records-owed §10 | n/a | n/a |
| build.json / js/debug.js / sw.js | ✓ `.250→.251` stamp | n/a | n/a | n/a | n/a | ✓ build.test lockstep (full suite) |
| index.html | ✓ version/cache-bust only (non-version filter empty) | n/a | n/a | n/a | n/a | ✓ build.test |
| docs/swipe-model.generated.txt | n/a | n/a | n/a | ~ citation/fingerprint regen | n/a | ✓ swipe-model.test 11/11 |
| tools/mutate.mjs | ✓ 3 new + 6 re-anchored | n/a | n/a | ~ re-anchor comments | n/a | ✓ mutation-anchors.test (full suite) |
| test/swipe-stage6c.test.js | ✓ 7/7 green + red-under-strip | n/a | n/a | n/a | n/a | → Mendeleev (suite audit) |
| test/swipe-model.test.js | ✓ re-pin 11/11 | n/a | n/a | n/a | n/a | ✓ |
| Claude/Brunel, Claude/Curie md | n/a | n/a | n/a | n/a | n/a | n/a records |

Cited commands for ✓ cells: `node --test test/swipe-stage6c.test.js`;
`node --require <scratch>/strip-guards.cjs --test test/swipe-stage6c.test.js` (both-guards-stripped mutation
→ G1/G2/G3/G-chain red, W/W(armed)/PG green); `node --test test/swipe-model.test.js`;
`node --test "test/*.test.js"`; `git show ba1c59b -- js/app.js index.html build.json`;
`grep -nE "(settleFrame|settleTimer|revealFrames|revealTimer)\s*=\s*null" js/app.js`.

## Findings

| # | Severity | Finding | Owner |
|---|---|---|---|
| — | (none blocking) | No code defect. The slice is correct, scoped, mutation-verified this pass, and complete for its stated boundary. | — |
| O1 | Observation | Loki r2 lesser-plane (`any-touch-cancels-committed-settle-ux`): because the recovery precedes `begin()`'s target/edge early-returns, ANY touchstart during a pane-less COMMIT settle (incl. a mid-screen tap or an excluded control) now tears the settle down and re-applies the source — the in-flight overlay transition is rolled back. This is the intended, ratified consequence of cell W (the recovery must run before the arm-check to clear `finishing`), Brunel built exactly what §7 specifies, and Loki executed it as HELD — so it is a DESIGN consequence, not a code defect. Surfaced because the plan's §2.3/§4 "correctness gain" framing under-foregrounds it. | Design seat (Miyamoto/Bastiat) / Zelda-to-log |
| O2 | Observation | `js/app.js:722` comment "app-ghost (browse→browse) and the home snapshot (→home)" is false against `constructionPlanFor` (an app-ghost forms for ANY non-overlay→browse, incl. home→browse). PRE-EXISTING (untouched by this commit) and plan-deferred to §10 apply-on-approval records work — but it is the Loki-named entry point for the r3-draft misclassification, so its correction must be verified before Stage 6c is called complete (StandardsDocument §6.6). | Zelda (records) |

Disposition: O1/O2 are not do-not-ship and not returned to a maker. O1 is a ratified design consequence
already routed by Loki to the design seat; O2 is pre-existing and plan-sequenced (§12: Poirot → Mendeleev →
Loki, records on approval), governed by plan-of-record precedence (EC §2). Both surfaced so neither slips.

## Prediction

The guards are correct and the mechanism is singular, so the code is safe. The hazard is records drift and
scope creep at the next stage:
- If O2's `:722` comment is not corrected on approval, the next session extending supersession to the
  pane-owning families (6d/7) may re-read it and re-derive the same false "browse→browse only" pane-less
  membership that caused the r3 KILL — the exact drift §6.6 forbids and Loki already killed once.
- The "guard, not cancel" choice (§5) is robust to a missed cancel today because on the pane-less path a
  stale callback ALWAYS fires `cur !== session`. When 6d/7 makes the held-reveal supersedable, a
  retired-while-`cur === session` state finally exists, and the deferred null-on-retire writes become
  load-bearing (their absence stops being safe). The plan already schedules them there (F1/§11); the
  prediction is that 6d/7 must land them WITH the pane-owning supersession, not after.
- O1's rollback-on-stray-touch will become materially worse when 6d/7 extends supersession to home↔browse
  (the dominant family): a stray touch during a home↔browse commit settle would then roll back a primary
  navigation. The design seat should decide the arm-check-vs-recovery ordering before that stage, not after.

## Watch-list

- **[W1] open** — Stage-6b records reconciliation (`Claude/Subsystems/swipe-reveal.md` §8, DecisionLog "Owed
  to stage 6", `PLAN-swipe-reveal.md` §7) still un-applied in HEAD; carried from 8e968fb. Now compounded by
  6c's own §10 debt. Owner Zelda; must close before the stage line is called complete.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition landing
  between the outer and inner frames is un-executed (resource-plane only, `dropped`-guarded). Carried from
  8e968fb; unaffected by 6c. Carry until an on-device strike or the 6d/7 reveal-centralization.
- **[W3] open** — Campaign artifact-name reconciliation: the `swipe-stage6` gate globs do not match a
  `stage6c` name (open since 6b §10; now also 6c §10). A tooling/records decision owed before 6c can be
  checked complete. Owner Zelda; not a code matter.
- **[W4] open (new, 6c)** — Plan §10 apply-on-approval records for 6c: rewrite the `js/app.js:216-234` (done
  in the build) vs the `:722` classifier comment (O2, NOT done); narrow `swipe-reveal.md` §8/§13/§14 to
  PANE-OWNING and record the true pane-less/pane-owning boundary; re-home the "Owed to stage 6" null-handle
  debt to 6d/7 and append the dated Stage-6c decision (true boundary, identity-guard-as-sole-mechanism,
  F2/F5 wedge fix, Option-A honest scope); annotate `PLAN-swipe-reveal.md` §7 step 6. Owner Zelda.
- **[W5] open (new, 6c)** — Loki r2 lesser-planes for the downstream seats: `recovery-overlay-visibility-
  unpinned` (the recovery's `applyScreen` reconciles the superseded incoming overlay's visibility only via
  `setView` side effects; nothing pins it per-transition) → coverage seat (Mendeleev, next); and
  `paneless-predicate-phase-coupling` (`paneLess([])` reads pane-less-true; unreachable while `finishing`
  implies `settle()` ran, but coupled only by argument — a one-line build assert would make it structural) →
  optional hardening, owner Brunel.
- **[W6] open (new, 6c)** — O1 design consequence (`any-touch-cancels-committed-settle-ux`): a stray touch
  during a pane-less commit settle rolls back the transition. Ratified for 6c; the design seat should settle
  the arm-check-vs-recovery ordering before 6d/7 extends it to home↔browse. Owner design seat.

---

{"persona":"poirot","stage":"6c","input_artifact":"ba1c59b","verdict":"PASS","blocking_ids":[],"return_to":"none"}
