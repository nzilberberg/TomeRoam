# Charpy verdict — PLAN-swipe-stage6h r2 (commit→home scrollend cover-gate)

Verdict: **FORGE**
Target: dbad3be (frozen committed plan `Claude/Plans/PLAN-swipe-stage6h.md`)
Prior: 656494c → TEMPER (`Claude/Charpy/PLAN-swipe-stage6h-656494c.md`)
Date: 2026-07-28 · Stage: 6h · Reviewer: Charpy (plan review, read-only on the plan)

---

## 0. Judgment

The three blocking findings from the 656494c TEMPER are genuinely closed, each verified against the
real code semantics (not just against the plan's prose). The fix-shape, grounding, never-strand
spine, home-scoping, and exactly-once were already verified sound at 656494c and are unchanged. This
revision fixes the proof, not the fix. **FORGE.**

---

## 1. B1 — the vacuous STRAND cell is now a correct split. CLOSED.

The single STRAND cell that could not redden is now two distinct, non-vacuous cells:

- **STRAND (r2)** drives `painted=false` — decode only, no `h.raf.frame()`. Verified against real code:
  `painted` is set true only inside the inner rAF (app.js:873), and under `deferRaf` not calling
  `h.raf.frame()` leaves the outer frame queued, so `painted` provably stays false. The gate predicate
  `decoded && painted && settled` (app.js:860 extended) is therefore blocked on `painted` — **neither
  `scrollend` nor the gated `SETTLE_MS` timeout can drop**, because both route through `gate()`. The
  600ms `drop('timeout')` (direct, app.js:875, bypasses `gate`) is the sole remover. The mutation
  "route the 600ms net through `gate()`" now genuinely strands: with `painted` false the gate never
  opens → cover never removed → "removed after 600ms" reddens. This is the true worse-than-flash
  guard, and it now actually reddens.
- **BACKSTOP (new)** is the distinct partner: `painted=true`, no `scrollend`, the gated `SETTLE_MS`
  timeout flips `settled` and completes the gate → removed at `SETTLE_MS`; mutation "omit the
  `SETTLE_MS` timeout" → `settled` never flips → not removed at `SETTLE_MS` → reddens. Non-vacuous and
  disjoint from STRAND (gated releaser vs direct drop).

The §9 Curie grounding note (3) explicitly instructs "do NOT call `h.raf.frame()` on the STRAND
fixture," so the `painted=false` precondition will not be accidentally violated. **B1 closed.**

## 2. B2 — OWN observes listener removal directly. CLOSED.

OWN now spies `window.removeEventListener` and asserts it was called with `('scrollend', <the exact
handler drop added>)`; the mutation "omit `cur.revealScrollEnd()` in `drop()`" makes that call never
happen → the spy assertion reddens. This observable depends directly on the mutated line and does not
rely on drop-counting — which I confirmed at 656494c is vacuous because `drop()`'s `dropped` guard
(app.js:814) makes a post-drop `scrollend` an inert no-op. §3 fracture (c) is reworded from "flips a
dead session's flag" (which the guard neutralizes) to **unbounded `window`-listener accumulation**,
the real cost. The §9 note (3) records the rationale for Curie so the spy approach is not
second-guessed. **B2 closed.**

## 3. H1 — the honesty finding is named and the classification is conditional. CLOSED.

§3 now separates the two device-only risks: **Risk 1 EXISTENCE** (an instant programmatic
`scrollTo(0,1)` may emit no `scrollend` on iOS → silent degrade to the `SETTLE_MS` heuristic) and
**Risk 2 SUFFICIENCY** (fires before the compositor re-tile finishes). §4's classification is
downgraded honestly: "PRINCIPLED IF `scrollend` fires on a programmatic scroll; else a bounded
heuristic hold — the device `via`/`settle` log tells us which." Device-verify (§9) is bound to reading
`via=scrollend|settle|timeout` off the FLASH log, and the plan explicitly distinguishes reading that
logged string from the discredited rAF frame-detector (saga law honored). The `settleVia` stamp is a
diagnostic-only addition with no behavior dependent on it. This is the right resolution: the fix
carries its own device-observable for the one unknown that makes-or-breaks its "principled" claim.
**H1 closed.**

## 4. Advisories folded (verified present)

- `SETTLE_MS < 600` stated as an invariant with its reason (§4), plus the 340/600-distinctness note for
  `pendingDump` identifiability (§9). ✅
- `js/app.js:1185-1193` (abort→browse) added to `source_ranges` in the vitruvius-gate. ✅
- The bounded transient double-listener under supersession is named for Loki (§3, §6) so it is not
  misread as the unbounded-accumulation fracture. ✅
- `blocking_questions` updated to the six cells `["GATE","BACKSTOP","STRAND","ONCE","SCOPE","OWN"]`. ✅

## 5. Residual advisory (NON-blocking — for Brunel, not a hold)

§9's mutation-registration bullet still reads "register the **five** behavioral mutations" while the
matrix and the `vitruvius-coverage` block now carry **six** (BACKSTOP was added by B1). A stale count
in the scrub bullet, not a defect in the coverage model — the matrix itself is correct and complete.
Brunel/Curie should register six mutations (one per cell) and the maker should correct the word
"five" → "six" when applying §9. Flagged, not blocking.

## 6. What remains verified from 656494c (carried forward, unchanged)

- Never-strand is real on every path: the 600ms direct-drop (app.js:875) is uncancellable outside
  `drop()` (set at 875, cleared only at 822), so it survives the new gate, hidden-tab/never-paints,
  unsupported `scrollend`, and supersession (the superseded session's own net fires `drop`).
- Home-scoping is airtight: only two callers (1175 home / 1192 browse); the flag is set at exactly one
  site; abort→browse reduces to the pre-6h predicate and its two new retirements are no-ops.
- Exactly-once holds under the full {decode, double-rAF, scrollend, settle-timeout, 600ms,
  supersession} race via the `dropped` guard.
- Coverage cells are drivable on the real, existing `toHeldRevealPending` fixture; a synthetic
  `scrollend` reaches the real `window` listener (`global.window` is jsdom's); `clock.pendingDump()`
  exposes timers by `ms`; deferRaf is a queue separate from the fake clock.
- The FLASH is correctly NOT a CI cell — device-only via the scroll-down repro + the `via` log;
  nothing is overclaimed as flash-fixed.
- Structural completeness intact (Applicability, §3 single scoped promise + fracture for Loki, §5/§6
  lifecycle+async, §7 catalog, §8 six-cell matrix + machine-readable block, §9 scrub, §10 deferrals,
  §11 handoff).

---

## 7. Disposition

All three blocking findings (B1/B2/H1) genuinely closed; all folded advisories present; one
non-blocking count typo flagged for the maker. The plan is sound to build.

Verdict: **FORGE**

Handoff: Curie (red suite — six cells, STRAND at `painted=false`, OWN spying `removeEventListener`) →
Brunel (green + register six mutations + `SETTLE_MS<600` + `settleVia` stamp + build bump) → Poirot →
Mendeleev → Loki (strike the §3 promise: strand under never-paints, double-drop, or unbounded listener
accumulation). Device-verify downstream, reading the `via`/`settle` stamp to resolve §3 Risk 1.
