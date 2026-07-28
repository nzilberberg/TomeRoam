# Charpy verdict — PLAN-swipe-stage6h (commit→home scrollend cover-gate)

Verdict: **TEMPER**
Target: 656494c (frozen committed plan `Claude/Plans/PLAN-swipe-stage6h.md`)
Date: 2026-07-27
Stage: 6h · Reviewer: Charpy (plan review, read-only on the plan)

---

## 0. One-paragraph judgment

The plan is grounded, correctly scoped, and its safety spine is sound: I verified every load-bearing
code claim against the real source at HEAD 656494c, and the never-strand mechanism, the home-scoping
proof, exactly-once, and the supersession cleanup all hold. It returns for TEMPER on **two concrete
coverage-non-vacuity defects** — the STRAND cell and the OWN cell each name a mutation that provably
**cannot redden** the cell as written — plus **one honesty sharpening** (`scrollend` may not fire at
all for a programmatic instant scroll, distinct from the sufficiency risk already flagged). None of
these touch the fix-shape; they touch the proof. Fix the two cells and the honesty line and this is a
FORGE.

---

## 1. What I verified against real code (grounding is SOUND)

Every structural claim the plan makes about production is accurate at HEAD 656494c:

- `holdGhostUntilPaintable = (rootEl, cover) =>` at **app.js:809**; two args today. ✅
- `drop = (why) => { if (dropped) return; dropped = true; … }` at **813-814** — exactly-once guard present. ✅
- Loser-cancel block: `cancelAnimationFrame(cur.revealFrames); clearTimeout(cur.revealTimer);` at **821-822**. ✅
- `gate = (why) => { if (decoded && painted) drop(why); };` at **860** — the predicate the plan extends to `decoded && painted && settled`. ✅
- **`cur.revealTimer = setTimeout(() => drop('timeout'), 600)` at 875 calls `drop` DIRECTLY, not through `gate`.** This is the never-strand backstop, and the plan's central safety claim rests on it. **Confirmed it bypasses the gate.** ✅
- `revealTimer` is *set* only at 875 and *cleared* only at 822 (inside `drop`). **Nothing cancels the 600ms net outside `drop()`** — I grepped the whole file. This is the fact that makes never-strand survive supersession (see §2). ✅
- Two callers only: **1175 `holdGhostUntilPaintable($('home'), cover)`** and **1192 `holdGhostUntilPaintable($('browse'), cover)`**. No third caller inherits the gate — the home-scoping surface is exactly as claimed. ✅
- Commit→home block app.js:1171-1177; abort→browse block 1185-1193. ✅
- `sessionDone = (s) => { if (session === s) session = null; }` at **242** — idempotent under supersession, as the plan states. ✅
- **nav.js:127** `if (!desc || desc.v === 'home') { setView('home'); …; if (resetScroll) window.scrollTo(0, 1); return; }`, `resetScroll` defaults true (117). The single scroll write, before the hold. ✅
- Harness: `toHeldRevealPending(h)` (`test/swipe-stage6b-loser-cancel.test.js:87`) drives **Authors→Home**, i.e. the real **commit→home** held reveal, to the "double-rAF outer frame queued + 600ms net pending" state. `global.window` (app-harness.js:210) is jsdom's window, so a synthetic `window.dispatchEvent(new window.Event('scrollend'))` reaches a real `window.addEventListener('scrollend', …)`. `clock.pendingDump()` (789) exposes timers by `ms`; `deferRaf` is a queue separate from the fake clock (238, 811-818). **The mechanism cells are drivable on a real, existing fixture.** ✅

**Safety properties I confirmed hold (not just asserted):**

- **Never-strand under the new gate.** With `settled` added, the 600ms net still `drop('timeout')`s directly, so decode/paint/settle all failing to complete cannot strand the cover. ✅
- **Never-strand under supersession.** New gesture → `begin()` hard-reset branch (398-447) disposes owned panes and nulls `session`/`d` but does **not** cancel `cur.revealTimer`. The superseded session's own 600ms net therefore still fires `drop('timeout')`, which retires the two new handles. Verified there is no path that cancels the 600ms net outside `drop`. ✅
- **Abort→browse byte-unchanged.** 1192 passes no `opts` → `settled = !undefined = true` → `decoded && painted && true` reduces to the pre-6h predicate; no listener, no settle-timeout; `drop()`'s two new retirements are no-ops (`cur.revealScrollEnd` undefined → guarded; `clearTimeout(undefined)` → spec no-op). Provably unchanged. ✅
- **Exactly-once.** `dropped` guard makes every later producer a no-op; losers cancelled in the same `drop()`. ✅

The plan's agreement with the Linnaeus derivation, the retirement of the prior escalation via the
scroll-dependence oracle, and the classification of the three flash roots (A/B/C distinct) are all
correct and consistent with the records.

---

## 2. BLOCKING changes (must fix before FORGE)

### B1 — STRAND cell: the named mutation cannot redden it. The 600ms *direct-drop* backstop is never exercised as the remover.

**The defect.** STRAND runs `decode + h.raf.frame()×2` (so `painted` becomes true), dispatches no
`scrollend`, then advances the clock 600ms and asserts the cover is removed; its mutation is "route
the 600ms net through `gate()` so it respects `settled` → cover strands."

But the **SETTLE_MS backstop (~250ms) also flips `settled`** and, because `decoded && painted` are
both already true, drops the cover **via `gate` at ~250ms** — before the 600ms net is even reached.
So:

- Unmutated: cover removed at ~250ms (settle-timeout). Assertion "removed after 600ms" passes.
- Mutated (600ms-net→gate): the settle-timeout at ~250ms still flips `settled`, `gate` sees
  `decoded && painted && settled` → drops at ~250ms. **Assertion still passes → the mutation does NOT redden.**

The mutation's own reasoning ("with `settled` never flipped") is false: the settle-timeout flips it.
As written, STRAND tests the *settle-timeout* backstop, but its mutation targets the *600ms
direct-drop* net — a mismatch. The **600ms direct-drop — the only backstop that survives decode/paint
never completing, i.e. the actual worse-than-the-flash strand guard Loki attacks — is never the
remover in this cell**, so its removal/re-routing is invisible.

**Required fix.** Re-specify STRAND so the 600ms direct-drop is the sole remover and its mutation
reddens: drive the cell into the state where `gate` **cannot** fire — i.e. leave `painted` false
(omit the rAF frames / model the hidden-tab case the code comment at 863-864 calls out), dispatch no
`scrollend`, advance past 250ms (settle-timeout fires, flips `settled`, but `gate` no-ops because
`painted` is false), then advance to 600ms and assert removal. Under the mutation (600ms→`gate`),
`gate` still sees `painted === false` → no drop → strand → reddens.

Recommend **splitting into two cells**, since they are two distinct guarantees:
- STRAND-A: settle-timeout backstop (decode+paint done, no `scrollend`) drops at SETTLE_MS; mutation = don't flip `settled` in the settle-timeout → drop deferred to 600ms (or, cleaner, target the settle-timeout's `gate` call).
- STRAND-B: 600ms direct-drop backstop with `painted` never true; mutation = route the 600ms net through `gate()` → strand.

### B2 — OWN cell: the listener-leak mutation cannot redden it. `drop()`'s `dropped` guard neutralizes the observable.

**The defect.** OWN drives `drop()` via `scrollend`, dispatches a second `scrollend`, and asserts "no
second drop"; its mutation is "omit `cur.revealScrollEnd()` (leave the listener attached)."

But `drop()` is `dropped`-guarded (814). With the listener left attached, the second `scrollend` →
`onSettle` → `gate('scrollend')` → `drop('scrollend')` → **`if (dropped) return;` → no-op.** So "no
second drop" **stays green under the mutation**. The cell's other assertion (settle-timeout id absent
from `pendingDump`) is also untouched by the listener mutation (the `clearTimeout` line is not the
mutated line). **Neither OWN assertion reddens the OWN mutation.**

A leaked `scrollend` listener is functionally *inert* (dropped-guarded); its real harm is **unbounded
accumulation on `window`**, which drop-counting cannot see.

**Required fix.** Observe the removal **directly**: spy `window.removeEventListener` (assert it was
called with `('scrollend', onSettle)` at `drop`), or assert no `scrollend` listener remains
registered after `drop`. Keep the settle-timeout-id-absent assertion for the separate
`clearTimeout(revealSettleTimer)` mutation, but give the **listener** mutation an observable that
actually depends on the removed line.

**Corollary (same edit).** §3's fracture **(c)** — "the `scrollend` listener not removed at drop, so
a later scroll on a NEW gesture's reveal flips a dead session's flag" — overstates the hazard: a dead
session's `settled`/`gate`/`drop` are dropped-guarded and inert, so a leaked listener causes no
spurious drop. Restate (c) as the *real* risk: **unbounded listener accumulation on `window`** across
repeated superseded commit→home reveals (each superseded listener self-removes only when its own
600ms net fires, ≤600ms — so removal-at-drop is what keeps accumulation bounded). This keeps the Loki
promise honest about what the leak actually is.

---

## 3. REQUIRED honesty sharpening (blocking as a wording change; trivial to apply)

### H1 — Name the `scrollend` EXISTENCE risk, not only the SUFFICIENCY risk; tie device-verify to the logged `via`.

§3's device-only finding covers **sufficiency** (does the compositor re-tile finish by `scrollend`).
It does **not** name the prior question: **does a programmatic *instant* `scrollTo(0,1)` emit
`scrollend` at all on iOS?** If it does not, the "principled primary" **silently degrades to the
`SETTLE_MS` heuristic on the very platform 6h targets** — and §4's "Overall classification:
PRINCIPLED" is then hollow (the release is a tuned 250ms hold, not a timeline event). This is not
hypothetical: §4 already concedes "a `scrollTo` that moves nothing emits no `scrollend`" for the
degenerate top case; the open question is whether a *large* instant programmatic scroll emits one on
iOS 17.4+. That is genuinely device-only.

The plan is not blind here, and the fix is cheap: `drop()` already logs `via=${why}` (858). So
`drop('scrollend')` vs `drop('settle')` vs `drop('timeout')` **already distinguishes which signal
fired**. Require two additions:
1. §3/§4: name the existence risk explicitly, alongside sufficiency, and state that if `scrollend`
   does not fire the mechanism is a bounded `SETTLE_MS` hold (never worse than today, never a strand)
   — so the "PRINCIPLED" label is conditional on the device showing `via=scrollend`.
2. §9 device-verification: check the logged `via` reason on the scroll-down repro — `via=scrollend`
   confirms the principled path fired; `via=settle`/`via=timeout` means it degraded to the heuristic
   and the principled claim must be withdrawn for iOS.

Given the saga's documented history of overclaimed "principled" fixes, this is worth making explicit
rather than leaving `scrollend`-fires as an unstated assumption inside a PRINCIPLED classification.

---

## 4. ADVISORY (non-blocking; apply if convenient)

- **A1 — `SETTLE_MS < 600` as a stated invariant.** The plan says ~250 and that the backstop "rarely
  bites," but never states the ordering constraint. If `SETTLE_MS ≥ 600`, the settle backstop is dead
  code (the 600ms direct-drop always wins first) and the classification changes. State `SETTLE_MS <
  600` (and distinct from 340/600 for harness identifiability, which §9 already requires).
- **A2 — source_ranges.** The `vitruvius-gate` `source_ranges` cite `809-876` and `1170-1177` but not
  the abort→browse call at **1185-1193 / 1192**, which is load-bearing to the home-scoping proof (the
  SCOPE cell asserts it byte-unchanged). Consider adding it as a read-verified range so the grounding
  surface matches what SCOPE depends on.
- **A3 — Transient double-listener under supersession is bounded, not leaked (record it as such).** I
  confirmed a superseded commit→home reveal's `scrollend` listener persists ≤600ms (until its own
  uncancelled net fires `drop`), during which a *successor* commit→home reveal may add a second
  listener; each closure owns its own `settled`/`cur`, so there is no cross-contamination and the old
  one self-removes. This is safe and bounded — worth one sentence in §5/§6 so Loki does not read the
  transient overlap as a fracture.

---

## 5. What I did NOT find (cleared)

- **Never-strand is real**, on every path I traced: new gate, hidden-tab (no paint), unsupported
  `scrollend`, supersession. The 600ms direct-drop is uncancellable outside `drop()`. ✅
- **Home-scoping is airtight** — only two callers; the flag is set at exactly one site; abort→browse
  and every no-hold path are provably untouched. ✅
- **Exactly-once holds** under the full {decode, double-rAF, scrollend, settle-timeout, 600ms,
  supersession} race via the `dropped` guard. ✅
- **The GATE, ONCE, SCOPE cells are non-vacuous and their mutations redden** (verified against the
  deferRaf/clock separation and the dropped guard). Only STRAND and OWN are defective. ✅
- **The FLASH is correctly NOT a CI cell** — device-only via the scroll-down repro, stated honestly;
  nothing is overclaimed as flash-fixed. ✅
- **The deferral of the post-`scrollend` heuristic frame-hold is honest and correctly out of scope**
  (§10) — it is the right next lever only if the device shows `scrollend` fires too early, and the
  plan labels it a heuristic, not a principled gate. ✅
- **Structural completeness** (Index, Applicability with per-pattern reasons, §3 single scoped promise
  + single fracture for Loki, §5 lifecycle, §6 async, §7 Coverage Model, §8 matrix + machine-readable
  block, §9 scrub obligations, §10 deferrals, §11 handoff) is present. The §9 scrub list is
  comprehensive (app.js, test, mutate/sweep/anchors, DecisionLog, Subsystems, PLAN-swipe-reveal,
  Linnaeus annotation, campaign json, build bump, red-gradient hold). ✅

---

## 6. Disposition

TEMPER on **B1, B2, H1** (blocking); A1–A3 advisory. The fix-shape is verified sound — this is a
proof-quality return, not a redesign. On a revision that (1) re-specifies STRAND so the 600ms
direct-drop is the exercised remover under a reddening mutation, (2) gives OWN a direct
listener-removal observable and restates §3 fracture (c) as accumulation, and (3) names the
`scrollend` existence risk and binds device-verify to the logged `via`, I expect to FORGE.

Verdict: **TEMPER**
