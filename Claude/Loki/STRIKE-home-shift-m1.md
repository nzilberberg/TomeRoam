# LOKI STRIKE — PLAN-home-shift-fix.md M1 (`#home.scrollTop` preserved across the park) — 2026-07-29

**Verdict: KILL.** Executed counterexample below: a stale `dataset.st` from two navigations ago wins
the visible abort→home reveal of a gesture that began at `scrollTop=0` — a jump equal to the stale
value the instant the ghost drops.

Commissioned pre-build (blind strike on the design): PLAN-home-shift-fix.md M1, Charpy FORGE
`3940340`, HEAD `d96ca40` (`.267`). M2 (the ~19px constant geometry) and Flash C are out of scope.

## 1. The promise (verbatim)

> "After an abort→home swipe, the Home view's scroll position is restored to exactly what it was
> when the gesture began — no jump to 0, no stale value."

Restated as behavior: for every reachable interleaving of scrolls, parks, navigations, gestures,
commits, and aborts, the `scrollTop` that `applyScreen(home, {resetScroll:false})` lands on the
abort reveal equals `#home.scrollTop` at the moment the aborted gesture began (= the ghost's
`capture.ghostY`, swipe.js:289 — what the user watched for the whole gesture).

## 2. The pinned rules traced (design + verified source, HEAD `d96ca40`)

- **P1 (plan §4 mechanism):** adding `.parked` flips `overflow-y:auto` (css:132) → `overflow:hidden`
  (css:102), clamping `#home.scrollTop`→0. This is the premise M1 exists to fix.
- **P2 (browser semantics the design leans on, §5 O1):** a scroll event fires (async) when an
  element's scroll offset CHANGES — clamp or programmatic. **No change ⇒ no event.** Handlers read
  live element state at delivery.
- **P3 (§4 SAVE, verbatim):** recorder clause `if (t.id==='home' && !t.classList.contains('parked'))
  t.dataset.st = t.scrollTop` in the capture-phase document scroll listener (app.js:2887-2890).
- **P4 (§4 RESTORE, verbatim):** `applyScreen` home branch (nav.js:140), after `setView('home')`
  removes `.parked` (nav.js:57): `if (resetScroll) $('home').scrollTop = 0; else $('home').scrollTop
  = +$('home').dataset.st || 0;`. **The `resetScroll:true` branch never writes `dataset.st`.**
- **P5 (verified source):** `resetScroll` defaults TRUE (nav.js:128); fresh nav `goHome()` →
  `navTo({v:'home'})` → `applyScreen(desc)` with no opts (app.js:143/155); the abort finalize passes
  `resetScroll:false` (app.js:1227, and 1201 on the rerender path). Button-nav to Books parks home
  via `setView` (nav.js:57).
- **P6 (verified source):** the ghost captures `ghostY = #home.scrollTop` at gesture build
  (swipe.js:289) — per-gesture fresh.

## 3. The plane chosen, and why

The plan's staleness ledger (§5) swears three oaths for `dataset.st`: refreshed on every home scroll
while `!parked`; a park never overwrites it (the guard); supersession never strands it
(element-local). The oath that was never sworn is the **`resetScroll:true` fresh-nav reveal**: it
changes the visible scroll to 0 **without producing a scroll event** — under P1 the park already
clamped `scrollTop` to 0, so the branch's `scrollTop = 0` is a 0→0 write and P2 fires nothing. The
recorder never resyncs, the branch never invalidates, and `dataset.st` keeps the pre-park value
across any number of navigations. The next abort→home reveal (P4 else-branch) delivers it.

The plan's own equivalence claim (§4: the pre-park capture is "equivalently the ghost's
`capture.ghostY` … the same pre-park value") is false at exactly this plane: `ghostY` is per-gesture
fresh; `dataset.st` is last-scroll stale.

## 4. The instrument (reproducible)

`strike-m1-sim.js` — a Node simulation implementing exactly P1-P6 and nothing else (probe filed
beside this record as `STRIKE-home-shift-m1-probe.js`; run with any Node). It first runs the
design's intended path as a control — scroll 500 → park → abort → restored to 500 — which PASSES,
proving the simulator faithful to the design's happy path. Then the strike interleaving:

| # | Step | scrollTop | dataset.st | parked |
|---|---|---|---|---|
| 1 | user scrolls home to 500 (recorder fires) | 500 | 500 | no |
| 2 | taps Books — `setView` parks home; clamp 500→0; clamp event guard-skipped (by design) | 0 | 500 | yes |
| 3 | taps Home — `applyScreen(home)`, `resetScroll:true`; un-park; `scrollTop=0` is 0→0 ⇒ **no event, no resync** | 0 | **500 (stale)** | no |
| 4 | gesture begins on home-at-top; ghost captures `ghostY=0`; park (0→0, no event) | 0 | 500 | yes |
| 5 | ABORT — `applyScreen(home,{resetScroll:false})` → `scrollTop = +dataset.st` | **500** | 500 | no |

**Predicted by the promise:** reveal at 0 (what the gesture began at; what the ghost showed
throughout). **Predicted by the fracture:** reveal at 500. **Observed: 500.** The user watched a
top-of-home ghost for the whole gesture and the real view reveals 500px down — the same class of
jump M1 was commissioned to remove, now in the opposite direction and worth the full stale value.

No user scroll between steps 1 and 5 repairs it, and steps 2-3 compose: the stale value survives
arbitrarily many park/fresh-nav round trips (every one is a guard-skipped clamp followed by an
event-less 0→0 reset). Step 2 via commit-swipe instead of button, and step 3 via a commit
books→home swipe (`applyScreen(dest,{render:false})`, app.js:1222, `resetScroll` default true),
reach the same state — the button path is merely the shortest instrument.

## 5. Blast radius

- **The promise itself** — broken as stated ("no stale value").
- **The M1RESTORE coverage cell (§7)** is green over this fracture: it seeds `dataset.st` and
  asserts the restore, never the freshness of what is restored. Its named mutation (omit the
  restore) does not cover the missing-invalidation channel. The suite as designed ships the bug.
- **The device gate (§9 M1)** also passes over it: scroll → swipe → abort restores correctly (the
  control run). The fracture needs the intermediate fresh-nav, which the gate script does not do.
- **The §5 staleness ledger** ("the value is refreshed on every home scroll while `!parked`") is
  incomplete as a freshness claim: the visible scroll can change with no scroll event (the true-branch
  reveal onto an already-clamped element), and the ledger has no row for it.
- **The §4 `ghostY` equivalence claim** is false in general (per-gesture vs last-scroll).

The fracture point is one line wide: **the `resetScroll:true` home branch resets the visible scroll
but not `dataset.st`.** Any design that makes the true-branch resync/invalidate the saved value (or
restores the abort reveal from the gesture's own `capture.ghostY`) closes it — the choice is the
planner's, not this seat's.

## 6. Lesser planes struck (un-prosecuted, one line each)

- Clamp-event timing: the guard keys off the same class whose CSS flips the overflow — no ordering
  window where the clamp event finds `.parked` absent. Held.
- Late clamp event delivered after un-park+restore: the recorder reads live `scrollTop` at delivery,
  so it records the restored value, not the clamp's 0. Held.
- `+dataset.st || 0` on a legitimate 0: restores 0, which equals the live value — indistinguishable
  from correct. Held.
- Double-abort / re-abort: the restore is idempotent per reveal (same `dataset.st`). Held in
  isolation.
- Mid-gesture home re-scroll: parked home is `pointer-events:none` and off-screen (css:98-102); no
  user scroll can target it, and any programmatic change is guard-skipped. Held.

## 7. Reconciliation (post-strike read of the rationale)

The plan (§8 R-M1-interleave) and the temper (PLAN-home-shift-fix-charpy.md, "whether a mid-gesture
home re-scroll, a commit-then-abort, or a supersede-during-held-ghost can land a STALE or 0
`dataset.st` on the visible reveal") both named the question and routed it here unanswered — the
commission worked as designed. The flaw entered in the §5 staleness enumeration: it enumerated the
park (overwrite) and supersession (stranding) as the threats and treated the fresh-nav reveal as
"unchanged product behavior" (§4) — an exclusion, not a case. The excluded thing is the one the
promise silently depended on: a reveal that moves the visible scroll without the event channel the
recorder lives on. The failure is in the exclusions, not the reasoning; the durable lesson routes to
the planner's staleness-ledger checklist: **enumerate every writer of the observable, not every
writer of the record.**

VERDICT: KILL
