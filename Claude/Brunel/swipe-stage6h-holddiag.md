# Stage 6h hold-diagnostic — post-`scrollend` extra hold

Diagnostic iteration on shipped Stage 6h (build `.259`). Device confirmed the settle gate
engages exactly as designed (`via=paint settle=scrollend`) and still flashes: `scrollend`
fires before the iOS compositor finishes the under-cover re-tile (PLAN-swipe-stage6h.md §10's
named fallback, Risk 2 realized). This round ships the named fallback — a generous fixed hold
past `scrollend` — as a controlled experiment: if the flash vanishes, hold duration is the
lever and gets tuned down; if it still flashes, the cover-hold approach is wrong and the next
step is a rethink, not more tuning.

## The change

`js/app.js`, `holdGhostUntilPaintable` (function starts at line 836; settle-gate section
~903-944):

- **New diagnostic constant**, line 835: `const SETTLE_HOLD_MS = 280;` next to the existing
  `SETTLE_SCROLL_MIN` (833) and `SETTLE_MS = 100` (834). Comment block above (823-832) states
  the device finding and that this is a deliberately generous, untuned value.
- **`onSettle` handler** (932-938, inside the `if (opts.scrollSettle)` block, 923-944): no
  longer drops on scrollend directly. It now:
  1. `clearTimeout(cur.revealSettleTimer)` — cancels the SETTLE_MS backstop immediately. A
     real scrollend arrived, so the backstop is moot; left pending it would otherwise fire at
     100ms (before the 280ms hold elapses) and drop the cover through the exact early path
     this round is testing against.
  2. `clearTimeout(cur.revealScrollHoldTimer)` — defensive re-arm guard for a repeated
     scrollend (some browsers can fire it more than once per gesture); prevents two hold
     timers coexisting.
  3. Arms `cur.revealScrollHoldTimer = setTimeout(..., SETTLE_HOLD_MS)`, whose callback sets
     `settled = true`, stamps `cover.settleVia = 'scrollend+hold'`, and calls
     `gate('scrollend+hold')`.
- **`drop()`** (845-901): added `clearTimeout(cur.revealScrollHoldTimer);` at 864, alongside
  the existing `revealFrames` / `revealTimer` / `revealScrollEnd` / `revealSettleTimer`
  retirements — a no-op when the hold was never armed (opts.scrollSettle unset, or drop
  reached via a different path) or already fired.
- **SETTLE_MS backstop path is untouched.** The device log shows `scrollend` firing on
  build `.259`, so the backstop is not the path under test this round; per the assignment's
  own "leave it (grounded call)" option, it keeps its pre-existing ~100ms release with no
  added hold.

## Never-strand preserved

- **The 600ms `cur.revealTimer` DIRECT `drop('timeout')` net is untouched** (line 917, same
  as shipped Stage 6h) — it still calls `drop()` unconditionally, bypassing the `settled`
  gate. `SETTLE_HOLD_MS(280) + scrollend-arrival(~20ms observed on device) ≈ 300ms < 600ms`,
  so the net still strictly bounds every interleaving; the diagnostic hold cannot make the
  cover outlive the net.
- **The hold timer (`cur.revealScrollHoldTimer`) is session-owned and retired exactly like
  the other four reveal handles** — created only inside `holdGhostUntilPaintable` when
  `opts.scrollSettle` is set, held on `cur`, and cleared in the single `drop()` retirement
  block (864). No new disposal path, no parallel supersession handling — reuses the existing
  single-endpoint discipline (EC §4.21 narrow scope).
- **`drop()` stays `dropped`-guarded** (846) — unchanged, so every one of the five (now six
  counting the hold) async producers reaches a no-op after the first drop. Exactly-once holds
  under the added producer the same way it held under the prior four.

## Test updates (`test/swipe-stage6h.test.js`)

- Added a test-local `SETTLE_HOLD_MS = 280` constant (mirrors app.js's value; a drift between
  the two now shows up as a red test, not a silent no-op).
- Fixed `viaOf`'s regex from `/via=(\w+)/` to `/via=([\w+]+)/` — `\w` does not match `+`, so
  the new `scrollend+hold` reason was being truncated to `scrollend` before this fix (caught
  by running the suite, not inspected in advance).
- **GATE**: after dispatching `scrollend`, now asserts the cover has NOT dropped yet, advances
  the fake clock by `SETTLE_HOLD_MS`, then asserts exactly one drop with `via=scrollend+hold`.
- **ONCE**: retitled ("...retired on scrollend", not "...at drop" — the retirement site moved,
  see below) and extended: after `scrollend(h)`, asserts the SETTLE_MS backstop id is gone
  immediately (still true — see mutation re-anchor) AND that no drop has happened yet; after
  advancing 600ms total, asserts exactly one drop with `via=scrollend+hold`.
- **OWN**: added `await h.clock.advance(SETTLE_HOLD_MS)` between `scrollend(h)` and the
  listener-removal assertion, since `drop()` (and its `removeEventListener` call) no longer
  runs synchronously on scrollend.
- **BACKSTOP, STRAND, SCOPE, FASTPATH**: unchanged — none of them dispatch `scrollend`, so the
  hold path is never engaged and their assertions still describe production behavior exactly.

## Mutation re-anchor (`tools/mutate.mjs`, cell ONCE / id 82)

The pre-existing ONCE mutation removed `clearTimeout(cur.revealSettleTimer);` inside `drop()`.
That line still exists verbatim, but the retirement of the SETTLE_MS backstop is now also
performed earlier, synchronously inside `onSettle`, before the hold timer is armed (needed so
the backstop cannot race in during the 280ms hold). Because `String.prototype.replace` applies
to the FIRST textual match and the `drop()` copy sits earlier in the file, mutating the
`drop()` copy left the earlier, load-bearing retirement inside `onSettle` untouched — the
mutation swept UNCAUGHT on the first pass. Re-anchored the `from`/`to` pair to target the
`onSettle`-internal copy (disambiguated by including the enclosing `const onSettle = () => {`
line), and renamed the mutation to describe the retirement site accurately (EC §4.8 truthful
naming). Re-swept: caught (2 failing).

## Suite and sweep results

- `test/swipe-stage6h.test.js` alone: 7/7 pass.
- Full suite (`node --test "test/*.test.js"`): 738 tests, 737 pass, 0 fail, 1 skipped
  (pre-existing known-red, unrelated to this change).
- `node tools/hooks/run-checks.mjs`: stamp, lint, typecheck, tests all PASS.
- `node tools/mutation-sweep.mjs 79 80 81 82 83 84 85` (run synchronously, not backgrounded):
  all 7 caught, 0 uncaught, 0 unapplied, 0 stale flags. No `.mutbak` files left behind.
- `docs/swipe-model.generated.txt` regenerated (`node tools/gen-swipe-model.mjs`) — the only
  diff is a pinned line-number citation (`js/app.js:1389` → `js/app.js:1418`) shifting because
  this change added lines above it; no content or fingerprint change.

## What this is and is not

This is a DIAGNOSTIC value, not a tuned one. `SETTLE_HOLD_MS = 280` is deliberately generous
(scrollend + hold ≈ 300ms held-reveal duration on the engaged path) so the device round
answers cleanly whether more hold helps at all. Per PLAN-swipe-stage6h.md §10: if the flash
vanishes on device, tune `SETTLE_HOLD_MS` down toward the minimal imperceptible duration that
still hides the compositor re-tile; if a generous hold still flashes, the cover-hold approach
itself is wrong for this bug and the next move is a rethink, not further tuning. Not claimed:
that this fixes the flash — that is device-only and unverified until the user's scroll-down
repro (scroll down → flash; top → clean) comes back clean with the `via=scrollend+hold` log
line present.

Not committed / pushed / build-bumped per the assignment — left staged for Zelda to ship.
