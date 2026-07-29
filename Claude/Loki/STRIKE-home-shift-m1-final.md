# LOKI FINAL STRIKE — PLAN-home-shift-fix.md M1 (source-gated `cur.ghostY` restore) — 2026-07-29

**Verdict: KILL.** Executed, control-validated counterexample below: a HOME-source abort's
designed restore fires 340ms AFTER an interleaved fresh navigation to home has already swept the
settling ghost, revealed home, and deliberately reset it to top — so the restore clobbers the
user's navigation with the gesture's `ghostY`, a visible 0→`ghostY` lurch. The source gate passes
legitimately (`cur.from.v === 'home'` is true); what no term of the gate proves is that the reveal
the write lands on still belongs to the gesture. Shipped code is stable on the same interleaving
(home stays 0), so the designed fix REGRESSES it.

Commissioned as the third strike on this promise: PLAN at commit `8cebe7d`, HEAD `5d27739`
(pre-build — the design is struck by construction). Prior kills:
`STRIKE-home-shift-m1.md` (stale `dataset.st` record), `STRIKE-home-shift-m1-restrike.md`
(destination-gated restore). M2 and Flash C out of scope.

## 1. The promise (verbatim, from the commission)

> "After an abort→home or supersession-recovery→home reveal, `#home`'s visible scroll equals the
> position the ghost displayed — no jump, no stale value, no cross-source value, and no visibly
> wrong intermediate paint."

## 2. The plane chosen, and why

The commission's enumeration question: which mechanisms move the observable `#home` scroll
WITHOUT an assignment (the only shipped assignment being nav.js:140). The answer that kills is a
mechanism that moves the REVEAL, not the scroll: **`navTo`'s same-view branch (app.js:140-143)
replaces the stack top and still runs `applyScreen(desc)` with default opts.** A Home tap
(navbtn app.js:2873-2875 or brand app.js:2880 → `goHome`, app.js:155) landing mid-settle of a
home-source abort therefore does three things at once, all shipped:

- `resetSwipeStyles` (nav.js:131 → 113-114) removes every `.nav-ghost` — the settling abort
  ghost is SWEPT, which is the reveal;
- `setView('home')` (nav.js:57) un-parks home;
- `$('home').scrollTop = 0` (nav.js:140, `resetScroll` defaults true) — the deliberate fresh-nav
  reset the design's own §7 normal-completion row asserts ("a fresh →home nav … stays at top").

The gesture's finalize still runs: the tap's own touchstart is rejected by the begin() gate
(app.js:385 — the settling session owns a pane) and touches nothing; nav.js clears neither
`session` nor `finishing` nor the `settleTimer`; the identity guard (app.js:1257) is
`cur !== session` and no nav moves `session`. Sweeping the ghost detaches the `transitionend`
anchor (app.js:1270), so the 340ms `settleTimer` (app.js:1271) is the guaranteed finalize. It
reads `dest = currentDesc()` fresh (app.js:793) = home, takes the no-hold abort branch
(home→books `abortRender === 'none'`, swipe.js:186), runs
`applyScreen(dest,{resetScroll:false})` (app.js:1227) — and then the designed line's gate is
satisfied by construction: `cur.from.v === 'home'` (the source WAS home) and
`cur.ghostY != null` (an app-ghost was built, swipe.js:149-150/289). The write lands on a reveal
the user's navigation owns.

Both prior kills were interleavings of exactly this family (an external nav in the settle
window); the plan's §4 defense enumerates only the destination-moved-AWAY case ("home is parked →
the write clamps to 0 → harmless"). The destination-moved-TO-HOME case — the same-view tap, a nav
that "goes nowhere" — is the exclusion the oath skipped.

## 3. The pinned rules (all source-verified at HEAD `5d27739`)

- **P1** navTo same-view: replace top + `applyScreen(desc)` with defaults — app.js:138-145.
- **P2** applyScreen: ghost sweep unless `keepGhosts` (nav.js:113-114/131); home branch un-parks
  and writes 0 iff `resetScroll` (nav.js:140, default true per 128).
- **P3** begin() gate rejects a touchstart while a pane-owning session settles — app.js:385,
  app.js:251 (`paneLess`), swipe.js:343 (app-ghost = `owned-pane`).
- **P4** finalize: `done` guard, identity guard `cur !== session` (app.js:1257) — blind to navs;
  `settleTimer` 340ms (app.js:1271); `finishing = true` at settle (app.js:607).
- **P5** runFinalize abort no-hold: fresh `dest = currentDesc()` (app.js:793); `dropPanes`
  parentNode-guarded (app.js:633 — a pre-swept ghost is a no-op);
  `applyScreen(dest,{render:false,resetScroll:false})` (app.js:1227); then the plan §4 designed
  restore `if (cur.from.v === 'home' && cur.ghostY != null) $('home').scrollTop = cur.ghostY;`.
- **P6** ghost capture: `ghostY = #home.scrollTop` pre-park (swipe.js:289, outgoing-first 341);
  `renderDestination('browse-host')` parks home (app.js:484-485); the park clamp is a geometry
  fact of `.parked` (css:98-102, bottom inset dropped → content-height box).

## 4. The instrument (reproducible)

`STRIKE-home-shift-m1-final-probe.js` (filed beside this record; runs on any Node) implements
exactly P1-P6 plus the two designed restore lines. **Controls, both PASS before the kill:**

- **Control 1** — home@500 → home→books swipe → abort, no interleave → reveal restores **500**.
  The design's happy path works; the simulator is faithful.
- **Control 2** — the 2nd kill's interleaving (browse-source abort, `#browse@800`, Home tap
  mid-settle) → the source gate refuses; home stays **0**. The gate is modeled faithfully and
  does what the design claims.
- **Baseline** — the strike interleaving on SHIPPED code (no designed lines) → home stays **0**,
  stable. Today this interleaving has no jump.

**Strike** — the interleaving:

| # | Step | source | visible paint |
|---|---|---|---|
| 1 | home scrolled to 500; forward-swipe home→books arms; ghost captures `ghostY=500`; home parked | swipe.js:289/341, app.js:484-485 | ghost (home@500) |
| 2 | ABORT (lift) — `finishing=true`, settle armed, `settleTimer` 340ms | app.js:603-607, 1271 | ghost (home@500) |
| 3 | +150ms: user taps **Home**. touchstart → begin() gate rejects (pane-owning session). click → `goHome` → `navTo({v:'home'})`: same-view replace-top; `applyScreen(home)` sweeps the ghost, un-parks home, writes `scrollTop = 0` | app.js:385/2873/155/140-143; nav.js:131/114/57/140 | **home@0** (ghost gone; ghost had displayed 500) |
| 4 | +340ms: `settleTimer` → finalize: guards pass (`cur === session`); `dest = currentDesc() = home`; no-hold abort branch; `applyScreen(home,{resetScroll:false})`; designed restore: `cur.from.v==='home'` ✓, `ghostY=500` → `#home.scrollTop = 500` | app.js:1257/793/1227 + plan §4 | **home@500** |

**Promise predicts:** no jump, no visibly wrong intermediate paint — and the design's own §7
normal-completion row predicts a fresh →home nav stays at top. **Fracture predicts:** home paints
at 0 for ~190ms after the tap, then lurches to 500. **Observed (probe): reveal at 0, final 500.**
The user tapped Home, saw the top of home, and a fifth of a second later the view lurched 500px
down — the exact symptom class this campaign exists to remove, introduced by the fix on an
interleaving where shipped code is stable.

The kill does not depend on which final value is deemed semantically correct: if the fresh nav's
0 is correct (nav semantics; the design's §7 row), the 500 is a stale clobber; if the ghost's 500
is correct (the promise's letter), the 0 was a visibly wrong intermediate paint and the 500
arrived by a visible jump. Every reading violates "no jump."

## 5. Executed vs device-owed

- **EXECUTED:** the entire interleaving. It is clamp-INDEPENDENT — the 0 is nav.js:140's explicit
  shipped write and the 500 is the designed line's write; jsdom's missing park clamp (Charpy V1)
  does not touch any step. The probe models the device clamp only for intermediate-state
  fidelity.
- **DEVICE-OWED:** the paint realization (that the 0-window and the lurch are visible frames —
  compositor territory); the tap window (the click must land before the finalize: before
  `transitionend` ≈200ms after lift; once the sweep detaches the anchor the finalize is pinned to
  the 340ms timer, so any tap inside ~200ms yields a guaranteed ~190ms wrong-paint window); the
  real clamp values mid-gesture.

## 6. Blast radius

- **The promise** — broken ("no jump", "no visibly wrong intermediate paint").
- **The design's §4 external-nav defense** enumerates only dest-moved-AWAY (parked → clamp →
  harmless). Dest-moved-TO-HOME is unenumerated and is the fracture.
- **The design's §7 "Normal completion" row** ("a fresh →home nav … stays at top") is falsified
  by this interleaving: the fresh nav lands 0 and is overwritten 190ms later.
- **§5 O4's invariant** ("the restore decision depends ONLY on terms fixed before the value
  existed") is satisfied by the design and the fracture lands anyway — the invariant is
  insufficient. Value-identity is proven; reveal-ownership is not a term.
- **Coverage (§7):** no cell drives a HOME-source abort with a mid-settle Home tap. M1CROSSSRC
  drives the browse-source crossing (gate refuses — green), M1RESTORE drives no interleave,
  M1FRESHNAV's nav completes before the next gesture. The suite as designed ships this bug —
  the same shape as both prior kills and V1: a crossing no cell drives.
- **The device gate (§9)** never taps mid-settle; it passes over the fracture.
- **Regression axis:** shipped behavior on this interleaving is correct and stable (0); the fix
  introduces the jump. A fix for a device-reported visible shift that adds a new visible shift
  on an adjacent interleaving fails the campaign's own goal even where the promise's letter is
  arguable.

## 7. The fracture point and a direction (one line, the planner's to choose)

**Defect:** the restore (both designed sites; executed at the abort site) proves the VALUE's
identity (this gesture's source) but has no term proving the gesture still OWNS the reveal it
writes into; an external `applyScreen` in the settle window transfers reveal ownership (ghost
sweep + fresh reset, nav.js:131/140) and the finalize cannot see it (app.js:1257 checks only
`session`).

**Direction:** give the finalize a one-bit witness of external reconciliation — e.g., skip the
restore when the gesture's owned pane was externally swept (`cur.movers[0].el` detached at
finalize: outside `dropPanes`, only an external `applyScreen`'s `resetSwipeStyles` removes a
`.nav-ghost`), or bump a nav epoch in `applyScreen` and compare a sample taken at `settle()`.
Either also covers the popstate route (app.js:1287 runs the same default `applyScreen`).

## 8. Lesser planes struck (un-prosecuted, one line each)

- **1st-kill fresh-nav interleaving:** closed by construction (no persisted record) — confirmed
  in Control 1's family; held.
- **2nd-kill cross-source interleaving:** closed by the source gate — executed as Control 2; held.
- **The recovery site (app.js:444) under the same tap crossing:** held — any nav tap's OWN
  touchstart triggers the recovery first, with the stack unmoved, so `cur.from.v === 'home'`
  there implies the recovery's reveal IS home and the restore is self-consistent; the nav's click
  then wins afterwards. Note for the test author: the M1SUPCROSS fixture ordering (nav moves
  `currentDesc` to home BEFORE the recovery) is producible in the harness only by a
  click-without-touchstart tap or a programmatic nav — a finger tap cannot produce it; the cell
  still proves the gate refuses, but its interleaving is not a device path.
- **Un-park → restore ordering (O2):** same-task synchronous, nothing re-parks before paint on
  the un-interleaved path; held (paint device-owed).
- **The park clamp defeating the restore:** the clamp precedes the un-park and the restore
  follows it synchronously; reasoned from css:98-102 + spec — jsdom-unreachable, device-owed;
  held.
- **`!= null` belt:** an unarmed superseded gesture (`live:false`) builds no capture and the
  gate skips; a legitimately-0 `ghostY` restores 0 = the live value; held.
- **`ghostY` exceeding the reveal's max scroll (content shrank mid-gesture):** the browser clamps
  to max — bounded residual, device-owed; held.

## 9. Reconciliation (post-strike read of the rationale)

The plan knew the actor: §7's concurrency row names GESTURE-vs-EXTERNAL-ACTOR as the real
concurrency, and §4 defends the mid-settle nav — but it enumerated the actor's landing spots by
DESTINATION and closed only dest ≠ home ("home is parked → the write clamps → harmless"). The
same-view Home tap fell through the enumeration because it "goes nowhere" — yet navTo's
replace-top branch runs the full `applyScreen`, which is simultaneously the ghost sweep, the
un-park, and the reset. The failure entered in the exclusions, as in the first kill — not in the
gate's reasoning, which is correct for what it checks. The durable lesson completes my previous
two: enumerate every writer of the observable; gate each write on the identity it belongs to; and
**a delayed write must also prove it still owns the reveal it writes into — value-identity
without reveal-ownership is a clobber wearing a correct value.** The witness already exists in
the gesture's own state (its swept pane); no ambient term is needed.

VERDICT: KILL
