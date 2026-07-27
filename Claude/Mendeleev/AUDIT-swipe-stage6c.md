# Mendeleev coverage audit — Stage 6c (pane-less supersession + settle-phase identity guard)

Type: coverage-audit
Date: 2026-07-26
Input artifact: commit `ba1c59b` (the reviewed build). HEAD `d83386b` differs only by the Poirot
casebook (`git diff --name-only ba1c59b d83386b` = one `Claude/` record; all code/tests byte-identical),
so the working tree is a faithful stand-in for the audit target.
Coverage Model audited against: `Claude/Plans/PLAN-swipe-stage6c.md` §8/§9 (ratified `94f5567`).
Suite audited: `test/swipe-stage6c.test.js` (+ the regression guards in `test/swipe-invariants.test.js`,
`test/swipe-stage6.test.js`, `test/swipe-stage6b-loser-cancel.test.js`).
Node: `C:/Users/nzilb/tools/node-dist/node.exe` (v22.23.1).
Verdict: **ADEQUATE.**

## 1. What 6c owes (cell enumeration from §8/§9)

The ratified §9 matrix lists nine rows. They partition into three classes:

- **NEW red-first cells** (the Stage-6c promise; RED on HEAD, GREEN after the build): **G1, G2, G3, W**.
  Curie split W into two authored shapes — **W** (mid-screen tap, never arms) and **W(armed)** (edge-tap,
  arms then ends before the lock) — both discharging the §9 W obligation.
- **Boundary guard** (GREEN now and after; pins the deferral boundary EC §4.18 / subsystem §14): **PG**.
- **Existing shipped regression guards** (not re-authored here; live in other files): **RG226, RG6b, RG6a,
  RGend**.
- **Supplementary** (beyond the ratified §9 set, honestly labeled): **G-chain** (A→B→C misattribution).

Every applicable §8 dimension maps to at least one of these (Lifecycle→G1/G2/G3/W/RGend; Identities→G1/G2/G3
+ G-chain; Ordering→G1/G2/G3 + W + §7 guard placement; Async / Stale completions→G1/G2/G3 + RG226/RG6b;
Recovery authority→W + PG; Emergency disposal→PG; External side effects→G2/G3; Composition→G-chain + PG;
Concurrency/Observability→all G/W on the successor's real DOM). No applicable dimension is unmapped.

## 2. Per-cell proof and adequacy (semantic, not counts)

All oracles are FEATURE oracles: each drives the real `begin()`/`settle()`/`finalize()` through
`test/app-harness.js` and asserts the **successor's** real end-state (borrowed-real mover transforms, the
commit/abort SWIPE log line, `browse.endHold` calls, or subsequent-swipe engagement). None is a consistency
oracle. Executed evidence below (all runs this pass).

| Cell | Class | What it proves | Non-vacuity proof | Verdict |
|---|---|---|---|---|
| **G1** | NEW | A stale settle rAF fired after B arms writes no `translateX` on B's `#options`/`#browse` | `paneOf` false (frozen+prod) + runtime `ghosts===0` + the "B arms" assertion (`sess.id!==aId`, `starts===2`) must pass before the stale fire; mutation #20 (remove settle-rAF guard) **reddens G1** | ADEQUATE |
| **G2** | NEW | A stale 340ms `settleTimer`→`finalize` runs no `runFinalize` over B — no commit line, and crucially `endHolds` unchanged (the tripwire proving the guard sits BEFORE the `try/finally`, §7) | same fixture guards; mutation #21 (remove finalize guard) **reddens G2** | ADEQUATE — the `endHolds` assertion is the semantic teeth that distinguishes "no commit" from "no successor-row-hold drop," pinning the §7 placement |
| **G3** | NEW | A late `transitionend` on A's real anchor (`#options`) — the OTHER finalize trigger, driven via the real `{once}` listener (EC §4.2 real public path) — runs no `finalize_A` over B | same guards; mutation #21 **reddens G3** | ADEQUATE |
| **W** | NEW | A superseding mid-screen tap that never arms leaves the next full swipe engaging (recovery cleared `finishing`) | mutation #19 (omit `finishing=false`) **reddens W** under the NEGATIVE gate — the exact §4/F5 falsifiability the plan requires | ADEQUATE |
| **W(armed)** | NEW | An armed-then-unlocked edge-tap likewise leaves `finishing` clear | mutation #19 **reddens W(armed)** | ADEQUATE — a distinct arming path (recovery entered via arm, not bare tap), not a duplicate |
| **PG** | BOUNDARY | A pane-owning (browse→browse ghost) session stays REJECTED; its held pane is not disposed | `paneOf(browse→browse)` true + runtime `ghosts===1` (a real `.nav-ghost` materialized) + same-node survival; **I executed the §9 PG mutation myself** (drop the `paneLess` clause so the gate admits pane-owning) via an fs-interceptor — **PG reddens, and only PG** (see §3) | ADEQUATE |
| **G-chain** | SUPPL. | Across A→B→C both superseded generations' stale rAFs/timers/`{once}` listeners no-op onto live C (misattribution axis) | mutations #20 AND #21 both **redden G-chain** | ADEQUATE (bonus); honestly labeled supplementary, does not masquerade as a §9 cell |
| **RG226** | REGRESS. | The `.226` within-session settle-rAF cancel still prevents a stale transform | `swipe-invariants.test.js` 23/23 green at this tree | GREEN — preserved |
| **RG6b** | REGRESS. | The 6b loser-cancels still leave the queue at their resolver | `swipe-stage6b-loser-cancel.test.js` 4/4 green | GREEN — preserved |
| **RG6a** | REGRESS. | Stage-6a DRAGGING-supersession recovery still holds | `swipe-stage6.test.js` 6/6 green (1 pre-existing device-only KEEPER skip) | GREEN — preserved |
| **RGend** | REGRESS. | After a terminal resolver the session is null (endpoint parity) | within `swipe-invariants.test.js` green set | GREEN — preserved |

Baseline: `node --test test/swipe-stage6c.test.js` → **7/7 pass** on the committed tree.

## 3. The KILL-class vacuity re-verification (F4 — the stage's history)

The prior draft was KILLed because its G/W fixtures were secretly PANE-OWNING, so the narrowed gate rejected
the second touch, B never armed, and the cells were unsatisfiable (G) / unfalsifiable (W). This audit
re-verified, per fixture, that the recurrence is structurally impossible:

- **Oracle values (executed).** Frozen spec `paneOf(overlay→browse)` = **false**; production
  `paneOf(constructionPlanFor(classifyTransition(options→books)))` = **false** (`outgoing=real-source`,
  `incoming=real-destination`). PG's fixture `paneOf(browse→browse)` = **true**. All four claimed pane-less
  transitions ({home,browse,overlay}→overlay, overlay→browse) return `paneOf` false; all four claimed
  pane-owning ({home,browse}→browse via non-overlay, browse→home, overlay→home) return true. The corrected
  domain is exact.
- **In-test binding.** Every G/W cell calls `assertPaneLessFixture()` (frozen `paneOf` false AND production
  `paneOf` false for the concrete `options→books` screens) and asserts runtime `ghosts(h)===0` while A
  settles, THEN a hard `sess.id !== aId` / `starts===2` "B must arm" assertion. Because a secretly
  pane-owning fixture makes B fail to arm, the "B arms" assertion would FAIL (not silently pass) — so a GREEN
  suite is itself proof the fixtures are genuinely pane-less at runtime. The KILL cannot recur silently.
- **PG symmetric pin (I closed the one open spot).** §9 specifies a PG mutation ("narrowed gate wrongly
  supersedes a pane-owning session → its pane is disposed"), but no `tools/mutate.mjs` entry was registered
  for it (Brunel §15 proved PG "directly by suite run"). I executed that exact mutation in-memory — replaced
  the gate `if (finishing && !(session && paneLess(session))) return;` with `if (finishing && !session)
  return;` (admits pane-owning) via a `--require` fs-interceptor, zero production files touched — and **only
  PG reddened** (`ghosts` drops from 1, the recovery runs, the pane is disposed); G1/G2/G3/W/W(armed)/G-chain
  stayed green because their pane-less fixtures are unaffected. PG is non-vacuous and genuinely pins the
  deferral boundary.

Each of the three registered mutations reddens exactly its designated cell(s) and nothing else, and the tree
restored clean after each:

```
#19 (omit finishing=false)     → W, W(armed) RED; G1/G2/G3/PG/G-chain green
#20 (remove settle-rAF guard)  → G1, G-chain RED; G2/G3/W/W(armed)/PG green
#21 (remove finalize guard)    → G2, G3, G-chain RED; G1/W/W(armed)/PG green
PG (drop paneLess clause)      → PG RED; all six others green
```

## 4. Deferral honesty (are any bare cells 6c owes?)

The deferred set — the settle/reveal NULL-on-retire writes, the `transitionListener` session-ownership/
removal, and supersession of the PANE-OWNING set + the held-reveal-await-paint phase — is genuinely
consumer-deferred to 6d/7, NOT a bare cell 6c owes. Confirmed:

- **Null-writes / transitionListener (F1).** Their only distinguishing reader is a
  retired-while-`cur === session` state. In 6c's pane-less window a stale settle-phase callback ALWAYS fires
  with `cur !== session` (`sessionDone` nulls `session`; ids are monotonic `++sessionSeq`), so the identity
  guard subsumes them; a null-read would redden no mutation the identity check does not already catch — a
  §4.15 dead field if added. The retired-while-owner state exists only in the held reveal, which is
  pane-owning and gated. Loki r2 independently closed "a fourth stale continuation beyond the three (none
  exists pre-finalize on the pane-less path)." Executed check: `grep -nE
  "(settleFrame|settleTimer|revealFrames|revealTimer)\s*=\s*null" js/app.js` → **none** — the deferred
  writes were correctly NOT shipped (honest; no dead field).
- **Pane-owning supersession + reveal-paint.** Its consumer is the paint-centralized reveal (I10/I17), 6d/7.
  6c defines supersession for the pane-less phase only, and PG pins that a pane-owning session stays gated —
  the boundary is asserted, not merely asserted-in-prose.

The deferrals each name a consumer that does not yet exist (§11); none is a coverage cell 6c is silently
skipping.

## 5. Bare / misdirected / vacuous cell scan

- **Bare?** No. Every §9 cell has a concrete authored test with a feature oracle and a reddening mutation
  (registered for G1/G2/G3/W/W(armed); executed-this-pass for PG).
- **Misdirected?** No. Every cell asserts on the SUCCESSOR's real surface, not a session-field accessor;
  G3 drives the real `{once}` `transitionend` listener (EC §4.2), not an internal call; the G2 `endHolds`
  assertion targets the exact §7 misplacement hazard rather than a generic outcome.
- **Vacuous?** No. The KILL-class vacuity is excluded three ways (§3): oracle values, the in-test "B arms"
  hard assertion, and per-cell mutation reddening. PG's vacuity (the one §9 spot lacking a registered
  mutation) is closed by direct execution.

## 6. Observations (non-blocking; not coverage gaps 6c owes)

- **[O-cov1] PG has no durable registered mutation.** PG's boundary is proven by the suite construction and
  (now) by my executed in-memory mutation, but `tools/mutate.mjs` carries no PG entry, so the guard's
  non-vacuity is not mechanized for future regressions. This is adequate for 6c (the boundary IS proven this
  pass) but is a HARDENING candidate: registering the "gate drops the `paneLess` clause" mutation would make
  PG's non-vacuity a standing gate rather than a one-time audit act. Owner Brunel (optional, 6c or 6d/7).
- **[O-cov2] Loki r2 lesser-plane `recovery-overlay-visibility-unpinned`** (Poirot W5, routed to the coverage
  seat): the recovery's `applyScreen` reconciles a superseded incoming overlay's visibility only via
  `setView` side effects; nothing pins it per-transition. HELD in every Loki probe. This is a RECOVERY-
  FIDELITY property, distinct from the §4 stale-callback promise 6c gates — it is not a §8/§9 cell 6c owes.
  Its natural home is the 6d/7 window (where the reveal path is restructured). Flagged for the Coverage
  Model, not routed back as a 6c gap.

Neither observation is a bare/inadequate cell in the 6c Coverage Model; both are recorded so they do not
slip. No Coverage-Model gap (nothing routes to the planner); no implementation gap (nothing routes to
Brunel as blocking); no bare/inadequate cell (nothing routes to Curie).

---

{"persona":"mendeleev","stage":"6c","input_artifact":"ba1c59b","verdict":"ADEQUATE","bare_cells":[],"return_to":"none"}
