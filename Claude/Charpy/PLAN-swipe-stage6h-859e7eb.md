# Charpy verdict — PLAN-swipe-stage6h r3 (conditional settle-gate + minimal SETTLE_MS)

Verdict: **FORGE**
Target: 859e7eb (frozen committed plan `Claude/Plans/PLAN-swipe-stage6h.md`)
Prior: 656494c → TEMPER; dbad3be → FORGE (B1/B2/H1); Loki HELD STONE (435da0e); this r3 folds a Loki-flagged UX regression fix.
Date: 2026-07-28 · Stage: 6h · Reviewer: Charpy (plan review, read-only on the plan)

---

## 0. Judgment

The r3 change is a UX-regression fix (conditional engagement + minimal `SETTLE_MS`), not a correctness
change, and it is sound. The lifecycle promise Loki held as a stone is not reopened — the conditional
only routes the small-clamp case to the already-verified non-`scrollSettle` path. The new FASTPATH
cell is non-vacuous, the `SETTLE_MS` band is honestly bounded, and B1/B2/H1 from the dbad3be FORGE are
intact. One non-blocking stale count (Status line "Six cells"). **FORGE.**

## 1. Conditional engagement is sound; the lifecycle promise is NOT reopened. CLOSED.

- **Right value, right place, no new ambient read.** The 1175 call becomes
  `holdGhostUntilPaintable($('home'), cover, { scrollSettle: cur.scroll0 > SETTLE_SCROLL_MIN })`.
  Verified against real code: `cur.scroll0 = window.scrollY || 0` is captured at gesture start
  (app.js:466), which for a commit books→home is the pre-collapse books scroll (~11481 scrolled, ~0 at
  top) — the exact |Δscroll| the flash tracks per Linnaeus (`finalize=11481`). It is already read by the
  abort path (`window.scrollTo(0, cur.scroll0)`, app.js:1188/1213), so this introduces no new ambient
  scroll read — it reuses an owned session value. `cur` is in scope at 1175 (same closure that already
  reads `cur.revealFrames`/`cur.scroll0`). The comparison is a plain boolean over a guaranteed-number
  field and a constant — no new failure path.
- **No new interleaving.** When `scrollSettle` is false (`cur.scroll0 ≤ SETTLE_SCROLL_MIN`), `settled`
  starts true → the EXACT pre-6h fast path (no listener, no timer, gate `= decoded && painted`) — the
  same path abort→browse and every pre-6h reveal already take. When true, it is the large-clamp path
  Loki struck across 1022 interleavings (HELD STONE, 435da0e). The routing therefore adds no new
  interleaving: the engaged path is byte-identical to what Loki cleared, and the non-engaged path is
  the pre-existing fast path. §3's promise is correctly updated to fold the small-clamp/top case into
  "every other path — `settled` starts true." The lifecycle promise is conditionally *engaged*, not
  *weakened*.

## 2. FASTPATH is non-vacuous, and its harness dependency is real and correctly specified. CLOSED.

- FASTPATH sets pre-gesture scroll to 0 → `cur.scroll0 = 0` → `scrollSettle: 0 > SETTLE_SCROLL_MIN`
  false → no `scrollend` listener, no `SETTLE_MS` timer; asserts cover removed on `decoded && painted`
  with no timer queued. Mutation "force `scrollSettle` true unconditionally at 1175" queues a
  `SETTLE_MS` timer and makes the cover wait → the "no timer queued / removed on paint" assertion
  reddens. The mutation directly produces the checked observable. Non-vacuous.
- **Load-bearing harness dependency, verified and correctly flagged.** §9 note (5) requires a settable
  pre-gesture scroll (`h.setScrollY(n)` / boot option). I confirmed the cited pin at
  **app-harness.js:263-266** ("jsdom pins window.scrollY at 0, so `cur.scroll0` is always 0 here") —
  accurate. Without the affordance, `cur.scroll0` is always 0, so GATE/BACKSTOP/STRAND/ONCE/OWN would
  all silently fall to the fast path and be vacuous, and only FASTPATH would pass (for the wrong
  reason). The affordance is feasible (jsdom `scrollY` is overridable via `Object.defineProperty`, as
  the harness already overrides `scrollTo` two lines below the pin), analogous to the `deferRaf`
  affordance built for prior stages, default 0 so existing tests are unaffected. This is exactly the
  kind of silent-vacuity trap the coverage matrix depends on catching, and the plan caught it with the
  grounded file:line. Strength, not a gap.

## 3. The `SETTLE_MS` band and its honesty are sound. CLOSED.

§4 specifies `SETTLE_MS` as a device-tuned BAND, not a fixed value: a FLOOR (`SETTLE_MS ≥ the
compositor snap duration`, or it fires mid-snap and still flashes) and a CEILING (imperceptible on the
common path). Grounded default ~80–120ms, explicitly NOT 250ms, with the correct rationale: scrolled-
down is the COMMON case (users scroll then swipe back to Home), so the backstop lands on the common
path and a 250ms hold would be a perceptible regression. It is tunable via the `via=`/`settle=` log
(`via=settle` → tune `SETTLE_MS` down toward the observed snap). Invariant restated as
`snap-floor ≤ SETTLE_MS < 600`, distinct from 340/600. This is honest: the floor is a real efficacy
constraint correctly marked device-only (CI cannot know the snap duration), the ceiling is UX, and
nothing is asserted-fine. Consistent with §2's `SETTLE_MS < 600` (the upper bound) — no contradiction.

## 4. B1/B2/H1 intact and unchanged. CONFIRMED.

- **B1** — BACKSTOP (painted, settle-timeout releases at `SETTLE_MS`; mutation omits the timer) and
  STRAND (painted=false, 600ms direct-drop sole remover; mutation routes the net through `gate()` →
  strands) both present and correct (§8 lines 162-163). Unchanged.
- **B2** — OWN spies `window.removeEventListener` directly; mutation omits `cur.revealScrollEnd()` →
  spy reddens (§8 line 166). r3 correctly adds "pre-gesture scroll ABOVE `SETTLE_SCROLL_MIN`" to the
  OWN fixture so the gate actually engages (else there is no listener to remove) — a correct
  consequence of the conditional, not a regression. Unchanged in substance.
- **H1** — §3 names Risk 1 (existence) and Risk 2 (sufficiency) separately; §4 classification is
  conditional ("principled IF `scrollend` fires, else a bounded heuristic hold — the log tells us
  which"); device-verify bound to `via=scrollend|settle|timeout`. Unchanged.

## 5. Non-blocking nit (for the maker — not a hold)

The **Status line (line 7) still says "Six cells; `SETTLE_MS < 600` … Hand to Charpy"** — stale from
r2. The machine-readable `blocking_questions` (line 5) correctly carries SEVEN
(`GATE,BACKSTOP,STRAND,ONCE,SCOPE,OWN,FASTPATH`), the §8 matrix header says "Seven cells", the §9
test bullet says SEVEN, and the mutate bullet (line 186) correctly says "the SEVEN behavioral
mutations" and enumerates all seven — so the prior r2 five→six count nit is fully resolved. Only the
narrative Status prose is stale. Correct the word "Six" → "Seven" when next touched. Not blocking (no
machine-readable or coverage surface depends on it).

## 6. Disposition

The conditional-engagement regression fix is sound and does not reopen the Loki-held lifecycle
promise; FASTPATH is non-vacuous with a feasible, correctly-specified harness affordance; the
`SETTLE_MS` band is honestly bounded; B1/B2/H1 stand. One cosmetic stale count flagged.

Verdict: **FORGE**

Handoff: Curie (red suite — seven cells; build the `h.setScrollY` affordance; gate-engaged cells set
scroll > `SETTLE_SCROLL_MIN`, FASTPATH sets 0; STRAND at `painted=false`; OWN spies
`removeEventListener`) → Brunel (green + `SETTLE_SCROLL_MIN` & minimal `SETTLE_MS` constants + register
seven mutations + `settleVia` stamp + build bump) → Poirot → Mendeleev → Loki (re-confirm the promise
holds under the conditional). Device-verify downstream, reading `via`/`settle` to resolve §3 Risk 1
and tune `SETTLE_MS`/`SETTLE_SCROLL_MIN`.
