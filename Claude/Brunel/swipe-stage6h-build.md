# Brunel build — Swipe/reveal Stage 6h (commit→home scroll-settle cover-drop gate)

Author: Brunel (build). Date: 2026-07-28. Plan of record: `Claude/Plans/PLAN-swipe-stage6h.md`
(PLAN_READY, Charpy TEMPER, Loki HELD_STONE). Red suite: `test/swipe-stage6h.test.js`
(Curie, `Claude/Curie/RED-swipe-stage6h.md`). Build base: git HEAD `2b9c90e`.

Verdict: **BUILD_GREEN**

## Files changed

- `js/app.js` — the gate (§2 below).
- `tools/mutate.mjs` — the seven behavioral mutations registered (§4 below).
- `docs/swipe-model.generated.txt` — regenerated (`node tools/gen-swipe-model.mjs`). The only
  diff is one pinned line reference shifting (`js/app.js:1346` → `1389`) because the new code
  was inserted above it; no semantic change. Required to keep `test/swipe-model.test.js`
  (a fingerprint gate) green after the source region moved.
- `test/app-harness.js`, `test/swipe-stage6h.test.js`, `Claude/Curie/RED-swipe-stage6h.md` —
  pre-existing uncommitted Curie output (the `h.setScrollY` affordance + the seven-cell red
  suite); not touched by this build.

## 1. Exact slice built

Plan §2, in full: the `opts`/`settled` gate + `scrollend` listener + `SETTLE_MS` backstop
inside `holdGhostUntilPaintable`, the two owned handles and their retirement in `drop()`, the
`settleVia` diagnostic stamp, the two named constants, and the conditional `{ scrollSettle:
cur.scroll0 > SETTLE_SCROLL_MIN }` at the commit→home call site. The abort→browse call site is
byte-unchanged (no third argument).

## 2. Production changes (`js/app.js`)

- **`js/app.js:823-824`** — new constants, declared in the same closure as the pre-existing
  `FADE_MS` (line 701, same function scope as `holdGhostUntilPaintable`):
  ```js
  const SETTLE_SCROLL_MIN = 0.5 * window.innerHeight;
  const SETTLE_MS = 100;
  ```
- **`js/app.js:825`** — `holdGhostUntilPaintable` signature gains `opts = {}`.
- **`js/app.js:828`** — `dropped`/`decoded`/`painted` declared, unchanged.
- **`js/app.js:833`** — `let settled = !opts.scrollSettle;`, new, declared immediately after.
- **`js/app.js:844-849`** (inside `drop()`, alongside the existing `cancelAnimationFrame`/
  `clearTimeout` cancels) — retirement of the two new handles:
  ```js
  if (cur.revealScrollEnd) cur.revealScrollEnd();
  clearTimeout(cur.revealSettleTimer);
  ```
- **`js/app.js:884-885`** — the FLASH log line gains the settle-source stamp:
  `` `hold ${...}ms covers=${...} via=${why} settle=${cover.settleVia || 'n/a'} fade=${...}ms` ``.
- **`js/app.js:887`** — gate predicate: `decoded && painted` → `decoded && painted && settled`.
- **`js/app.js:903-915`** — the settle-signal + backstop, created only when
  `opts.scrollSettle`:
  ```js
  if (opts.scrollSettle) {
    const onSettle = () => { settled = true; cover.settleVia = 'scrollend'; gate('scrollend'); };
    window.addEventListener('scrollend', onSettle);
    cur.revealScrollEnd = () => window.removeEventListener('scrollend', onSettle);
    cur.revealSettleTimer = setTimeout(() => {
      settled = true; cover.settleVia = 'settle'; gate('settle');
    }, SETTLE_MS);
  }
  ```
- **`js/app.js:1218`** — commit→home call site, now conditional:
  `holdGhostUntilPaintable($('home'), cover, { scrollSettle: cur.scroll0 > SETTLE_SCROLL_MIN });`
- **`js/app.js:1235`** — abort→browse call site — **verified unchanged**:
  `holdGhostUntilPaintable($('browse'), cover);` (no third argument, so `opts.scrollSettle` is
  `undefined` and `settled` starts `true`).

Nothing else in `holdGhostUntilPaintable`, `begin()`, `end()`, or the recovery block was
touched.

## 3. The two constants — chosen values and why they avoid the collisions

- **`SETTLE_MS = 100`.** Plan §4 band: ~80–120ms, floor ≥ the compositor snap duration,
  ceiling small enough to be imperceptible on the common (scrolled) path, and the invariant
  `SETTLE_MS < 600`. 100 sits inside that band. Curie's RED-suite finding (not just Plan §9's
  340/600) is that the reveal already schedules FOUR pre-existing delays the new timer must
  stay distinct from so `pendingDump()` can isolate it: 60ms (`fadePanes`' removal setTimeout),
  340ms (finalize fallback), 500ms (`reportReveal`'s diagnostic window), and 600ms (the
  never-strand net). 100 ∉ {60, 340, 500, 600} and is < 600 — both requirements met. The ONCE
  cell's `settleTimersOf(h)` filter (which excludes exactly `{60,340,500,600}`) isolates
  exactly one timer under this value, confirmed by the ONCE cell passing.
- **`SETTLE_SCROLL_MIN = 0.5 * window.innerHeight`.** Exactly the Plan §4 default (viewport-
  relative so it scales across devices, roughly half a screen). Read against `cur.scroll0`
  (app.js:466, the outgoing scroll captured at gesture start) at the single conditional call
  site (app.js:1218).

## 4. The three Loki structural properties — preserved

Loki's HELD_STONE (`Claude/Loki/STRIKE-swipe-stage6h-r1.md` §5) named three structural
invariants its 1022-interleaving proof depends on; the built code must preserve all three:

1. **`drop()` stays `dropped`-guarded (exactly-once).** Unchanged:
   `js/app.js:835` — `if (dropped) return; dropped = true;` — the very first line of `drop()`,
   untouched by this build.
2. **The 600ms `revealTimer` still calls `drop('timeout')` DIRECTLY, bypassing `settled`, and
   is cancellable only inside `drop()`.** Unchanged:
   `js/app.js:902` — `cur.revealTimer = setTimeout(() => drop('timeout'), 600);` — calls `drop`
   directly, not `gate`, so it is immune to `settled` never flipping. `clearTimeout(cur.revealTimer)`
   still appears exactly once, inside `drop()` (`js/app.js:843`). No other clear site was added.
3. **`begin()`'s pane-owning rejection is untouched.** `begin()`, `end()`, and the recovery
   block (`js/app.js:372-448` per Loki's trace) were not edited by this build — the entire
   change is confined to `holdGhostUntilPaintable` and the one commit→home call-site argument.

**Confirmed preserved: true.** The STRAND cell (Plan §8, the cell that specifically exercises
property 2 under a never-painting view) passes at HEAD-with-build, and its dedicated mutation
(#81, routing the net through `gate()`) reddens exactly that cell (see §5).

## 5. Mutation registration + sweep proof (`tools/mutate.mjs`, indices 79-85)

Seven mutations appended, each named `stage6h <CELL>: …`, anchored on the built code above.
`node tools/mutate.mjs --list` confirms indices 79-85.

**Cheap anchor gate:** `test/mutation-anchors.test.js` — 2/2 pass (every anchor matches; no
mutation is a no-op).

**Synchronous sweep (not backgrounded), the seven new indices only:**

```
node tools/mutation-sweep.mjs 79 80 81 82 83 84 85
#79  caught (5 failing) — stage6h GATE
#80  caught (3 failing) — stage6h BACKSTOP
#81  caught (3 failing) — stage6h STRAND
#82  caught (1 failing) — stage6h ONCE
#83  caught (9 failing) — stage6h SCOPE
#84  caught (1 failing) — stage6h OWN
#85  caught (4 failing) — stage6h FASTPATH

swept 7: 0 uncaught, 0 unapplied, 0 stale flags
```
Exit code: **0**.

**Gate-B rigor — the DESIGNATED cell, not merely "some test failed":** each mutation was also
applied individually with only `test/swipe-stage6h.test.js` run, to confirm the *named* cell is
among the reddened tests (not just any test in the wider suite):

| mutation | cell(s) reddened in swipe-stage6h.test.js | named cell present? |
|---|---|---|
| #79 GATE | GATE, BACKSTOP, ONCE, OWN | yes (superset — expected, Curie finding 2: omitting engagement is "no gate at all", so every engaged cell reddens) |
| #80 BACKSTOP | BACKSTOP, ONCE | yes (superset — expected, Curie finding 2: both depend on the same SETTLE_MS timer) |
| #81 STRAND | STRAND only | yes (clean) |
| #82 ONCE | ONCE only | yes (clean) |
| #83 SCOPE | SCOPE only | yes (clean) |
| #84 OWN | OWN only | yes (clean) |
| #85 FASTPATH | FASTPATH only | yes (clean) |

The wider-suite fail counts in the sweep table above (e.g. SCOPE's 9) include other pre-existing
suites (swipe-stage6b/swipe-gesture etc.) that also exercise the abort→browse reveal timing and
react to the mutated behavior — collateral breakage in the full suite, not evidence against the
designated-cell proof, which was confirmed directly per mutation.

**Restore verified:** `node tools/mutate.mjs --restore` after each individual apply (and again
after the sweep); `test/swipe-stage6h.test.js` returns to 7/7 green; no `*.mutbak` files remain
anywhere in the tree (checked with `find . -name "*.mutbak"`).

## 6. Suite counts (exact)

- **Stage 6h suite alone** (`test/swipe-stage6h.test.js`): **7 pass / 0 fail / 0 skip** — the
  four previously-red cells (GATE, BACKSTOP, ONCE, OWN) are now green; the three parity cells
  (STRAND, SCOPE, FASTPATH) stay green.
- **Full suite** (`node --test test/*.test.js`): **738 tests total — 737 pass / 0 fail /
  1 skipped** (the pre-existing device-only skip, `KEEPER — …NB-post-endHold-scroll-realize`,
  unrelated to this build — `Claude/Loki/STRIKE-swipe-stage6-recover-before-arm-r2.md` §5).
- **Meta-gates**, run explicitly: `test/mutation-anchors.test.js` 2/2,
  `test/construction-consumers.test.js` (dead-return-fields) 2/2,
  `test/policy-ledger-gate.test.js`, `test/contract-function-gate.test.js`,
  `test/swipe-model.test.js`, `test/transition-matrix.test.js` — all pass (all included in and
  reconfirmed by the full-suite run above).
- **`node tools/hooks/run-checks.mjs`** (stamp coherence, lint, typecheck, full test suite):
  **PASS** — `✓ stamp`, `✓ lint`, `✓ typecheck`, `✓ tests`.

## 7. What was deliberately not done

- No `git commit` / push. The build is staged in the working tree only, per instruction (Zelda
  bumps the build number at deploy).
- No build-number bump.
- No device verification — that is downstream (Plan §9's device-verification obligation),
  outside this stage's gate.
- No edit to `Claude/Decisions/DecisionLog.md`, `Claude/Subsystems/swipe-reveal.md`,
  `Claude/Plans/PLAN-swipe-reveal.md` §7, or `Claude/Linnaeus/PROBE-scroll-clamp-reveal.md` —
  Plan §9 flags these as records-reconciliation items "apply on approval"; left for the next
  stage of the handoff (Poirot → Mendeleev → Loki → Zelda) rather than assumed by the builder.

## 8. Handoff

To **Poirot** for code review of `js/app.js` and `tools/mutate.mjs` against
`Claude/Plans/PLAN-swipe-stage6h.md`. Loki's structural residual (§5 of the strike) — "a builder
deviation... is outside what this strike can clear" — is addressed by §4 above; a fresh Loki
strike against the built code remains the next required gate per the plan's sequencing (§11).
