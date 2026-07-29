# LOKI RE-STRIKE — PLAN-home-shift-fix.md M1 (fix 2, `cur.ghostY` restore) — 2026-07-29

**Verdict: KILL.** Executed, control-validated counterexample below: an aborted BROWSE-source
gesture's `cur.ghostY` (a `#browse` scroll) is written onto `#home.scrollTop` when a navbar/brand
tap moves `currentDesc()` to home during the gesture's settle window. The restore gate keys on the
DESTINATION view (`dest.v === 'home'`), but `cur.ghostY` is the gesture's SOURCE scroll — equal only
while `navStack` has not moved since capture. Home lurches from 0 to a browse-list scroll ~340ms
after the user tapped Home.

Commissioned as the one re-strike on the patched M1: PLAN at HEAD `480cf77`; the first design was
KILL'd in `STRIKE-home-shift-m1.md` (HEAD `5167e8c`) and re-designed to restore from `cur.ghostY`.
Blind pre-build strike on the design. M2 and Flash C out of scope.

## 1. The promise (verbatim)

> "After an abort→home swipe, the Home view's scroll position is restored to exactly what it was
> when the gesture began — no jump to 0, no stale value."

## 2. Target 1 — is the original KILL closed? YES, by construction.

The first KILL was a SEPARATELY-MAINTAINED `#home.dataset.st` that desynced from the visible scroll
across a fresh-nav `resetScroll:true` reveal (a 0→0 write with no scroll event). Fix 2 removes that
record entirely. I verified there is NO residual persisted `#home` vertical-scroll value anywhere in
the readable set:

- The only capture-phase scroll recorder (app.js:2887-2890) writes `dataset.sl = scrollLeft` for
  `.carousel` elements — HORIZONTAL, never `#home.scrollTop`, and untouched by fix 2.
- `grep dataset\.st js/` returns nothing (the KILL'd clause was never built).
- The only restore value is `cur.ghostY`, set per-gesture in `start()` (app.js:548-551) from the
  ghost capture (swipe.js:289), read only by that gesture's own reveal (app.js:1154 diagnostic;
  1227/444 restore). `cur.scroll0` is `window.scrollY` (document, ~0 for fixed views), not `#home`.

No module var, dataset, closure, or session field carries a last-`#home`-scroll forward across
gestures. **The original fresh-nav interleaving is dead: a top-start gesture captures `ghostY=0`
fresh and no persisted value can survive to a later reveal.** That half of the re-design is sound.

## 3. The plane — the restore gate validates the wrong thing (targets 2 & 3)

The two invariants the defense rests on, both source-verified at `480cf77`:

- **(I-A) `cur.ghostY != null` ⟺ the gesture built an app-ghost ⟺ `toKind !== 'home'`** —
  swipe.js:149-150 (`outgoing='app-ghost'` iff `fromKind` in-flow AND `toKind !== 'home'`).
- **(I-B) `cur.ghostY` is the gesture's SOURCE scroll** — swipe.js:289-291
  (`ghostApp(fromKind)`: `home.scrollTop` for a home source, **`browse.scrollTop` for a browse
  source**, else `window.scrollY`).

Charpy's defense (temper casebook): *a superseded/aborted gesture never committed, so `navStack`
sits at its source, so `currentDesc().v === 'home'` ⟺ the source was home ⟺ `cur.ghostY` is that
gesture's own home scroll.* The biconditional's load-bearing clause is **"navStack sits at its
source."** It holds for the gesture's OWN mechanics — an abort never moves the stack (app.js:788
`if (commit)` only), and a commit that DOES move it lands `currentDesc = dest`, but `dest === 'home'`
kills the ghost by (I-A). So no home/browse-ghost coincidence arises from swipes alone.

**It does NOT hold against an interleaved EXTERNAL navigation.** The restore runs at *finalize*, and
`dest = currentDesc()` is read FRESH there (app.js:793, inside `runFinalize`, invoked on
`transitionend` or the 340ms `settleTimer`, app.js:1270-1271) — long after the finger lifted.
`goHome()`/a navbar tab/the brand tap (app.js:2880) call `navTo → applyScreen`, which pushes
`navStack` and un-parks home, and **do not clear `finishing`/`session`/`settleTimer`** (they run
through nav.js, disjoint from the gesture module). So a tap landing inside the ~200-340ms settle of
an aborted BROWSE gesture moves `currentDesc` to home while `cur` is still the browse gesture with
`cur.ghostY = browse.scrollTop`. At finalize, `dest.v === 'home'` passes and the browse scroll is
written onto `#home`.

The fix restores the wrong element's scroll because its gate proves the wrong proposition: it checks
where the user IS NOW (`dest`), not what the aborted gesture's SOURCE was (`cur.from.v`).

## 4. The instrument (reproducible)

`restrike-sim.js` (filed beside this record as `STRIKE-home-shift-m1-restrike-probe.js`; runs on any
Node) implements exactly the pinned rules C1-C6 cited in its header — the app-ghost condition, the
source-scroll capture, the abortRender held/no-hold split, the fresh `dest = currentDesc()` read at
finalize, the fix line, and `goHome`. **Two controls prove fidelity before the kill:**

- **Control 1** — home(scroll 500)→books abort, no interleave → home restored to **500**. PASS: the
  design's happy path works and the simulator is faithful.
- **Control 2** — browse(books, scroll 800)→options abort, no interleave → `dest = source = books`,
  gate `dest.v==='home'` false, `#home` untouched (0). PASS: the fix correctly does nothing when the
  reveal is not home.

**Strike** — the interleaving:

| # | Step | source line | `#home.scrollTop` | `currentDesc` |
|---|---|---|---|---|
| 1 | on books, `browse.scrollTop=800`, home parked at 0 | — | 0 | books |
| 2 | swipe books→options armed & aborted; ghost captures `ghostY=800` (browse scroll); `finishing=true`, settling | swipe.js:150/290, app.js:607 | 0 | books |
| 3 | user taps **Home** during the settle → `navStack.push(home)`, home un-parked & reset to 0 | app.js:2880/138, nav.js:140 | 0 | **home** |
| 4 | settle 340ms `settleTimer` fires → `runFinalize`: `dest=currentDesc()=home`; no-hold abort branch; `if (dest.v==='home' && cur.ghostY!=null) home.scrollTop=cur.ghostY` | app.js:793/1227 + fix | **800** | home |

**Promise predicts:** home reveals at 0 (where the Home tap left it). **Fracture predicts:** 800.
**Observed: 800.** The user tapped Home, saw home at the top, and one-third of a second later it
lurches 800px down to a scroll position belonging to a browse list — a stale value from a different
view. The promise's exact words ("no jump to 0, no stale value") are broken.

## 5. Two sites, one defect

- **Abort-finalize site (app.js:1227, the instrument above).** Deterministic: the 340ms `settleTimer`
  guarantees finalize; only two natural actions (abort a swipe, tap Home). Requires a browse-SOURCE,
  no-hold, app-ghost gesture — i.e. **browse→overlay** (abortRender `'none'`, swipe.js:186), reached
  by having an overlay in `fwdStack` (e.g. back-swipe options→books, then forward-swipe books→options
  and abort). browse→browse does NOT reach this line (it takes the HELD path, app.js:1200, which
  returns before the fix).
- **Supersession-recovery site (app.js:444, the NEW site).** Same defect, no `abortRender` gate, so
  it fires for **browse→browse** (the common list swipe): abort a browse→browse (ghost held,
  `finishing` stays true) → tap Home (moves `currentDesc`, clears the held ghost) → start any new
  edge-swipe → `begin()` recovery reads `cur=session` (the browse gesture, `ghostY=browse scroll`)
  and `currentDesc()==='home'` → `$('home').scrollTop = cur.ghostY`. Reachable but needs a third
  action inside the held-ghost drop window (decode + double-rAF), so the abort-finalize site is the
  cleaner repro; both admit the identical wrong value through the identical gate.

## 6. Blast radius

- **The promise** — broken ("no stale value").
- **M1RESTORE / M1SUPERSEDE coverage cells (§7)** are green over the fracture: both drive a
  same-source reveal (source home, or a supersede with no intervening nav) and assert the restore
  equals `cur.ghostY` — never that `cur`'s SOURCE matches the revealed view after an external nav.
  M1FRESHNAV reproduces only the OLD dataset.st interleaving. **No cell moves `navStack` externally
  during a settle**, so the suite as designed ships this bug — the same coverage-blind-spot shape the
  first KILL had (a real interleaving no cell exercises).
- **The device gate (§9)** passes over it: scroll→swipe→abort restores correctly; the gate never
  taps a navbar mid-settle.
- The wrong value **propagates**: a subsequent home→books gesture captures `ghostY = 800` (the now-
  corrupt `#home.scrollTop`) and re-restores 800 on its own abort.

## 7. The fracture point and a direction (one gate)

**Defect (one line, both sites):** the restore gate is `dest.v === 'home'` / `currentDesc().v ===
'home'` (app.js:1227 and 444) — it validates the current DESTINATION, but `cur.ghostY` is the
aborted/superseded gesture's SOURCE scroll (swipe.js:289-291). They diverge whenever an external
navigation moves `navStack` after the ghost captured and before finalize/recovery reads
`currentDesc()`.

**Direction (planner's to choose):** gate on the gesture's OWN source, not the live destination —
`cur.from.v === 'home'` (which, with (I-A), already implies the reveal is a home-source gesture and
`cur.ghostY` is a home scroll). That makes the restore self-consistent regardless of any interleaved
nav: if the user navigated away, home is parked and the write is harmless-until-revealed and correct
when revealed; a browse-source gesture never writes to `#home` because `cur.from.v !== 'home'`. The
device still owes the on-screen confirmation.

## 8. Lesser planes struck (un-prosecuted, one line each)

- Original fresh-nav interleaving (the first KILL): **closed** — no persisted record survives (§2).
- Double-abort / re-abort of the same source: one gesture, one `cur.ghostY`; idempotent, correct.
- Mid-gesture home re-scroll: parked home is `pointer-events:none`+offscreen (css:98-102); `ghostY`
  captured pre-park. Held.
- `cur.ghostY != null` on a legitimately-0 home: restores 0 = the live value; indistinguishable from
  correct. Held.
- Supersede a home-source gesture with a browse-source one, no external nav: mid-drag `navStack`
  unmoved, `currentDesc=home`, `cur.ghostY=home scroll`. Correct. (The break needs the external nav.)

## 9. Reconciliation (post-strike read of the rationale)

The plan (§8 R-M1-interleave) and the temper explicitly reasoned that fix 2 "closes the divergence
class by construction … there is nothing to desync." That is TRUE for the class the first KILL
belonged to (a separately-maintained last-scroll record) and I confirm it (§2). The new flaw is a
DIFFERENT class the re-design introduced: not a stale record, but a **mis-scoped gate** — the restore
is guarded by the live destination rather than the gesture's own source, so a value that is fresh and
correct *for its gesture* is applied to the *wrong reveal* when an external navigation reparents the
destination mid-settle. The failure entered in the reasoning, not the exclusions: §4 asserts "the
revealed scroll is self-consistent with what the user watched BY CONSTRUCTION," which is exactly the
clause the interleaved `goHome` falsifies — the user watched a browse ghost, then watched home, and
the browse value landed on home. The durable lesson extends my own from the first strike: **enumerate
every writer of the observable — and gate each write on the identity it belongs to (this gesture's
source), not on the ambient state at write time (the current destination), which another actor can
move underneath it.**

VERDICT: KILL
