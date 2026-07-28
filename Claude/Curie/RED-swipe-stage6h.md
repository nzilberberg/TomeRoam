# RED suite — Swipe/reveal Stage 6h (commit→home cover-drop scroll-settle gate)

Author: Curie (test design). Date: 2026-07-28. Plan of record: `Claude/Plans/PLAN-swipe-stage6h.md`
(PLAN_READY, Charpy TEMPER + Loki HELD_STONE). Target git HEAD: `2b9c90e`.
Verdict: **RED_SUITE_READY**.

## What this suite proves (and does not)

It proves the GATE MECHANISM of the commit→home cover drop: on a scrolled-down commit→home
reveal the cover waits for a real scroll-settle signal (`window` `scrollend`), releases on a
bounded `SETTLE_MS` backstop when `scrollend` is absent, can NEVER strand (the pre-existing
600ms DIRECT net is the sole remover under a never-painting view), removes the cover EXACTLY
once and retires every owned handle, keeps the `window` `scrollend`-listener set bounded, and
leaves the abort→browse reveal and the top / small-scroll commit→home reveal byte-unchanged.

It does NOT assert the flash. The commit books→home flash is an iOS compositor scroll-collapse
snap, off the main thread and invisible to jsdom/rAF (the saga's withdrawn frame-detector
lesson). Its efficacy is DEVICE-only — the user's scroll-down repro (scroll down→flash / top→
clean) plus the drop `via=` log (PLAN §3/§9). No cell reads a paint/rAF flash proxy. The
suite's oracle is the drop itself (a code-execution event on the main thread), read off the
FLASH `via=` log line and the fake-timer / rAF handle ledgers.

## New / changed files

- `test/swipe-stage6h.test.js` — NEW. The 7-cell red suite.
- `test/app-harness.js` — the `h.setScrollY(n)` affordance (test infra; see below).
- `js/app.js` — UNCHANGED (pristine HEAD `2b9c90e`). It was TEMPORARILY patched with a
  minimal feature only to run the mutation battery, then restored (`git checkout`); verified
  byte-identical to HEAD, zero `TEMP-6H-PROOF` markers, empty `git diff`. Building the real
  gate is Brunel's.

## Harness affordance (REQUIRED — added as test infra, PLAN §9 note 5)

jsdom pins `window.scrollY` at 0, so `cur.scroll0` (app.js:466, captured at gesture start) is
always 0 and the conditional gate `cur.scroll0 > SETTLE_SCROLL_MIN` could NEVER engage in a
test — every gate-engaged cell would silently fall to the fast path and go vacuous.
`h.setScrollY(n)` defines a settable `window.scrollY`/`pageYOffset` (DEFAULT 0, so every
existing test is byte-unaffected — verified: swipe-invariants 23/23 and swipe-stage6b 4/4 stay
green). GATE/BACKSTOP/STRAND/ONCE/OWN set it to 12000 (above the threshold → gate engaged);
FASTPATH sets it 0 (fast path). Mirrors how `deferRaf` and the `scrollTo` recorder were added
for earlier swipe stages.

## Cell → test map (PLAN §8)

| Cell | Test name | @HEAD | Oracle |
|---|---|---|---|
| GATE | `GATE — commit→home cover persists past the double-rAF and drops only on scrollend` | RED | cover present after decode+double-rAF (drops==0), removed only after synthetic `scrollend` (via=scrollend). Both sides (EC §4.7). |
| BACKSTOP | `BACKSTOP — no scrollend: the SETTLE_MS backstop releases the cover before the 600ms net` | RED | no scrollend; after advance(600) exactly one drop, `via=settle` (backstop won, not the 600ms net). |
| STRAND | `STRAND — view never paints: the 600ms DIRECT net is the sole remover (never-strand)` | GREEN (parity) | painted=false (no rAF frame run); advance(600) → one drop, `via=timeout`. |
| ONCE | `ONCE — exactly-once under the settle race, and the SETTLE_MS loser is retired at drop` | RED | capture the SETTLE_MS timer; scrollend → drop retires it AT the drop; advance(600) → still exactly one drop. |
| SCOPE | `SCOPE — abort→browse held reveal arms no settle machinery and drops on paint` | GREEN (parity) | abort→browse arms no SETTLE_MS timer, drops on paint (via=paint), no scrollend. |
| OWN | `OWN — drop() removes the scrollend listener (spied) so it cannot accumulate` | RED | spy `window.removeEventListener`; drop must call `removeEventListener('scrollend', …)` exactly once. |
| FASTPATH | `FASTPATH — commit→home at scroll0=0 keeps the pre-6h fast path (no settle machinery)` | GREEN (parity) | scroll0=0 arms no SETTLE_MS timer, drops on paint (via=paint). |

Fixtures build on swipe-stage6b's `toHeldRevealPending` (the commit→home held reveal). A new
`toAbortBrowseRevealPending` reaches the abort→browse held reveal for SCOPE. Synthetic settle:
`h.window.dispatchEvent(new h.window.Event('scrollend'))`. All under `boot({ fakeTimers:true,
deferRaf:true })`.

## RED-run at pristine HEAD (`2b9c90e`, no gate) — CONFIRMED

```
not ok 1 - GATE      error: 'the commit→home cover must NOT drop on decode+double-rAF alone — it must wait for a scroll-settle signal'
not ok 2 - BACKSTOP  error: 'with no scrollend, the SETTLE_MS backstop (not the 600ms net) releases the cover (via=settle)'
ok   3 - STRAND
not ok 4 - ONCE      error: 'fixture: exactly one SETTLE_MS backstop timer must be pending on the scrollSettle path; got [{"ms":500},{"ms":60}]'
ok   5 - SCOPE
not ok 6 - OWN       error: "drop() must removeEventListener('scrollend', …) exactly once ...; saw 0"
ok   7 - FASTPATH
# pass 3  # fail 4
```

Each RED cell fails for its RIGHT reason (feature absent): GATE — the cover drops on the bare
double-rAF (no `settled` gate); BACKSTOP — dropped `via=paint`, no SETTLE_MS backstop exists;
ONCE — no single SETTLE_MS backstop timer is pending (the reveal already dropped on paint and
queued its teardown timers); OWN — `removeEventListener('scrollend', …)` is never called
because no listener was ever added. The three parity cells assert current behavior and are
GREEN at HEAD.

## Right-reason validation + mutation battery

A minimal faithful feature (opts/`settled` gate + `scrollend` listener + `SETTLE_MS` backstop +
`{scrollSettle: cur.scroll0 > SETTLE_SCROLL_MIN}` at the commit→home call site; `SETTLE_MS=100`,
`SETTLE_SCROLL_MIN=0.5·innerHeight`) was TEMPORARILY installed in `js/app.js`, then restored.

- **Feature baseline: all 7 GREEN.** This proves the 4 RED cells were red purely for
  feature-absence (they go green when the gate exists), and that the 3 parity cells hold parity
  with the real feature present — not vacuously.
- **Mutation battery (each §8 mutation applied one at a time on the feature; named cell must
  redden):**

```
GATE      -> named-cell-red=YES  red=[GATE, BACKSTOP, ONCE, OWN]
BACKSTOP  -> named-cell-red=YES  red=[BACKSTOP, ONCE]
STRAND    -> named-cell-red=YES  red=[STRAND]
ONCE      -> named-cell-red=YES  red=[ONCE]
SCOPE     -> named-cell-red=YES  red=[SCOPE]
OWN       -> named-cell-red=YES  red=[OWN]
FASTPATH  -> named-cell-red=YES  red=[FASTPATH]
```

Every cell CAN fail under its §8 mutation. Mutations used (exact):
- GATE: `{ scrollSettle: cur.scroll0 > SETTLE_SCROLL_MIN }` → `{ scrollSettle: false }` (engagement omitted).
- BACKSTOP: the `cur.revealSettleTimer = setTimeout(…, SETTLE_MS)` line removed.
- STRAND: `setTimeout(() => drop('timeout'), 600)` → `setTimeout(() => gate('timeout'), 600)` (net routed through the gate → strands under never-paints).
- ONCE: `clearTimeout(cur.revealSettleTimer)` in `drop()` removed (loser timer not retired).
- SCOPE: `{ scrollSettle: true }` added to the abort→browse call (app.js:1192).
- OWN: `cur.revealScrollEnd()` removed from `drop()` (listener not removed).
- FASTPATH: `{ scrollSettle: cur.scroll0 > SETTLE_SCROLL_MIN }` → `{ scrollSettle: true }` (forced unconditionally).

## Honest findings for Brunel / Mendeleev

1. **SETTLE_MS must be distinct from 60, 340, 500 AND 600** (PLAN §9 note 4 named only 340/600).
   The reveal already schedules a 60ms pane-fade removal (fadePanes), a 340ms finalize fallback,
   a 500ms reveal-diagnostic window (reportReveal, app.js:1099), and the 600ms net. The suite
   isolates the new SETTLE_MS timer by excluding `{60,340,500,600}` (`REVEAL_MS` in the test).
   Brunel's `SETTLE_MS` (target ~80–120ms) is naturally distinct — keep it so it stays
   identifiable in `pendingDump`.
2. **GATE and BACKSTOP mutations redden supersets, not single cells.** GATE's mutation (omit
   engagement) is the "no gate at all" state → it reddens every engaged cell (GATE/BACKSTOP/
   ONCE/OWN); STRAND/SCOPE/FASTPATH stay green. BACKSTOP's mutation (omit the SETTLE_MS timer)
   also reddens ONCE, which captures that same timer. STRAND/ONCE/SCOPE/OWN/FASTPATH mutations
   are clean single-cell. This is expected (both cells depend on the shared engaged-gate / the
   SETTLE_MS timer) — flagged so Mendeleev's audit and the mutation registry account for the
   overlap rather than expecting strict one-mutation-one-cell isolation for these two.
3. **ONCE's dropped-guard half is redundant given the loser-cancels.** `drop()` cancels every
   other producer (frames, net, settle-timer, listener) at the first drop, so removing ONLY the
   `dropped` guard cannot produce a second drop — the loser-cancels already enforce exactly-once.
   ONCE's load-bearing, catchable mutation is therefore "omit cancelling the settle-timeout"
   (caught by the retirement assertion). The guard is defense-in-depth; a guard-removal-only
   mutant is uncatchable by construction. Noted for the mutation registry.

## Device-only flash (restated)

No cell asserts the flash. After ship, device-verify via the user's reliable repro (scroll the
list DOWN → commit to home → confirm CLEAN; still clean from the top) and read the drop `via=`
log: `via=scrollend` = the principled primary fired; `via=settle` = `scrollend` never came and
the SETTLE_MS heuristic released it (PLAN §3 Risk 1 realized); `via=timeout` = never-paints. The
CI guarantee is mechanism + never-strand + bounded-listener only.

## Handoff

- To **Brunel**: build the real gate per PLAN §2 (opts/`settled`/`scrollend`+`SETTLE_MS`, the
  `settleVia` stamp, the two owned handles + their retirement in `drop()`, the conditional
  `{scrollSettle: cur.scroll0 > SETTLE_SCROLL_MIN}` at the commit→home call, the two named
  constants, the build bump), register the 7 mutations in `tools/mutate.mjs` /
  `test/mutation-anchors.test.js`, and make the suite green. The `h.setScrollY` affordance is
  already in `test/app-harness.js`.
- To **Mendeleev**: audit `test/swipe-stage6h.test.js` against PLAN §7's Coverage Model; note
  findings 2 and 3 above.
