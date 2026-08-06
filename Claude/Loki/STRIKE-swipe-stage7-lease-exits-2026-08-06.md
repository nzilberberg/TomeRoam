# Strike record — swipe stage-7 lease exits — 2026-08-06

**Verdict: HELD STONE.** Fourteen executed planes plus an eight-seed randomized
interleaving fuzz produced no reachable exit that ends a live gesture without
releasing its Browse row-hold. One real defect was found in passing on a
neighbouring promise (nav-stack integrity, not the hold); it is listed
un-prosecuted under "Lesser planes" for the owner.

## 1. The commissioned promise (verbatim)

> Every reachable exit that ends a live swipe gesture releases the gesture's
> Browse row-hold. Exactly one acquire and one effective release per live
> gesture; a second release is a no-op; a gesture that arms but never goes live
> acquires nothing.

Commissioned fracture: a reachable exit that ends a live gesture without
releasing its hold. The stage-7 lease interface does not exist in source; the
promise was attacked as a claim about the shipping mechanism at HEAD `734b393`
(js/ unchanged through `c32451f`, confirmed by `git diff --stat` — the only
commits under me touched records).

## 2. The exit set, derived independently from source

Derived by reading js/app.js `bindSwipeBack` (lines 203–1103) and js/browse.js
(lines 109–248) before reading any review or plan §14. Acquire:
`takeRowHold` (app.js:349), sole call site app.js:500, first statements of
`start()` after `d.live = true`. Release wrapper: `dropRowHold` (app.js:370).

Exits that end a live gesture:

- **E1 — finalize** (transitionend on the anchor mover, or the 340 ms
  `settleTimer`): `runFinalize` calls `dropRowHold` at app.js:1026, before the
  `applyScreen` that can hide `#browse`.
- **E2 — throwing finalize**: the `finally` at app.js:1078–1081 calls
  `dropRowHold` when `runFinalize` throws before reaching 1026.
- **E3 — hard reset in `begin()`** (app.js:398–431), two admissions: `d` set
  (mid-drag supersession) and `finishing && session` (mid-settle supersession).
  Calls `dropRowHold` at app.js:427, after the source restore, before nulling
  `session`.
- **E4 — stale finalize after supersession**: `cur !== session` return at
  app.js:1070; correct only because E3 already released. Guard is placed before
  the `try/finally` so a stale finalize cannot drop a successor's hold.
- **Non-live exits** (no acquire to release): vertical abandon (app.js:570),
  armed end (app.js:591).
- **External invalidation, not a gesture exit**: `Browse.dropHold`
  (browse.js:245), called from `reset()` (browse.js:68) and `clearCache()`
  (browse.js:77) — reachable mid-gesture via Net reconnect (app.js:3033),
  pull-to-refresh (app.js:1299), progress reset (app.js:2439), sign-out
  (app.js:2287). It clears `holdRows` and bumps `holdGen` itself; the gesture's
  later `endHold` is then token-stale and no-ops.

The grep sweep (2026-08-06) confirms the commission's call-site list is
complete: `dropRowHold` has exactly the three call sites 427 / 1026 / 1079,
`takeRowHold` exactly one, `Browse.beginHold`/`endHold` are called from app.js
only through those wrappers, and `dropHold` only from browse.js:68/77.

## 3. Instruments

All probes are disposable and live outside the repo
(scratchpad `probe-lease-exits.test.js`, 15 cells, run with the repo's pinned
node against `test/app-harness.js` with `realBrowse: true` — real app.js, real
browse.js, real virtuallist.js). Two instruments, both validated before any
verdict was read off them:

- **Accounting wrapper** over the real `Browse` export (`beginHold` / `endHold`
  / `clearCache` / `reset` are property-dispatched from app.js, so wrapping the
  module object intercepts every call): counts acquires, effective releases
  (token-current and active), stale releases, external drops.
- **Leak detector**: real `Browse._test.showPage(shownKey)` parks (rather than
  hides) away-pages iff `holdRows` is still true — a leaked hold is visible as
  a `parked` class on a cached page. Needs ≥ 2 cached pages; every use ensures
  that precondition (two early fuzz "failures" were this precondition returning
  null, not leaks — recorded here so the correction is on the record).
- **Validation (P1)**: a deliberate `beginHold()` with no release registers as
  a leak; the paired `endHold` clears it. The instrument can see the fracture
  it hunts.

## 4. Planes struck (all executed; all held)

| # | Plane | Drive | Result |
|---|---|---|---|
| P2/P2b | E1 abort and commit, browse→browse | edge drag, retreat / far drag | 1 acquire, 1 effective release, no leak |
| P3 | E3 mid-drag supersession | second edge touch mid-drag, successor aborts | 2 acquires, 2 releases, no leak |
| P4 | E3 mid-settle + E4 stale timer | touch in the settle window; successor live when the 340 ms timer of the superseded session fires | hard reset released #1; stale finalize called nothing at all; successor paired its own; no cross-release |
| P5 | external drop mid-drag | `clearCache()` + synchronous re-render (the shipped reconnect shape) while live | drop invalidates; gesture's `endHold` stale no-op; no leak; next gesture unwedged |
| P11 | external drop mid-settle | same, between finger-up and finalize | stale `endHold` observed; nothing left parked; no leak |
| P6 | cross-family end | stray mouse `pointerup` ends a live touch gesture; late real touchend inert | 1 acquire, 1 release, no leak |
| P7 | E3 with no successor arming | second finger off-edge mid-drag (reset runs, `begin` then returns) | release by reset alone; no owner survives |
| P8 | reentrant `applyScreen` mid-drag | `popstate` during a live drag | gesture still pairs 1/1, no leak |
| P9 | early finalize by bubbling | synthetic descendant `transitionend` reaching the anchor mid-settle, then the timer | exactly one release; timer inert |
| P12 | `endHold` fallback branch | back-swipe commit landing on home (no landed browse page) | 1/1 through the fallback, no leak |
| P13 | nav tap in the settle window | `navTo` + full render under the live hold | 1/1, nothing left parked |
| P14 | **E2, a real reachable throw** | forward-swipe commit whose `fwdStack` is emptied by a nav tap mid-settle: `runFinalize`'s commit branch pushes `fwdStack.pop()` = `undefined`, then dereferences `dest.v` and throws before its own `dropRowHold` | the `finally` released exactly once; `finishing` not wedged; next gesture arms. Throw confirmed by the `#N commit fwd` SWIPE line having no matching `@reveal` report |
| P10 | interleaving fuzz | 400 random actions × 8 seeds (touch/mouse events, cancels, clearCache+re-render, popstate, nav taps, clock advances) with the invariant checked at quiescence | no stranded hold, no surviving owner, any seed |

Acquire-side clauses: the existing suite already pins "arms but never live
acquires nothing" (test/swipe-gesture.test.js vertical-abandon and
under-lock cells); P7 re-confirms against the real Browse. No plane produced a
second acquire for one gesture — `start()` runs once per `d` behind the
`locked` latch, and both input families share the one `d`.

## 5. Lesser planes, one line each, un-prosecuted

- **Real defect, different promise (nav-stack integrity):** a forward-swipe
  commit whose `fwdStack` is emptied mid-settle (any `navTo` — a nav tap — in
  the ~340 ms window) pushes `undefined` onto `navStack` and throws in
  `runFinalize` (app.js:1021, `dest.v`), losing the reveal report and the
  commit's screen reconcile. The hold survives (E2), but `currentDesc()` is
  then `undefined` — the next back-gesture or `applyScreen(currentDesc())`
  operates on a corrupt stack. Executed and reproducible (P14 drive).
  Routes to the owner; not this commission's fracture.
- **Suspicion, not executed:** the E3 hard reset never clears the superseded
  session's mover transforms/transitions (`runFinalize`'s style-reset at
  app.js:701 is the only clearer, and it never runs for a superseded session) —
  possible stranded `translateX` on a real view element after supersession.
  Visual, not a hold defect.
- Early finalize via any bubbling descendant `transitionend` on the outgoing
  mover (P9) is release-safe but settles the gesture before the animation
  lands — on-device visual snap risk only.
- The external-invalidation path makes a gesture exit's release vacuous by
  design; the planned lease interface names this (`invalidateGestureHold`), so
  the rename must keep drop-then-stale-release semantics token-compatible.

## 6. Residual doubt — where the stone was not pressed

- jsdom: no layout, no paint, no native `transitionend`. Every finalize here
  fired by the 340 ms timer or a synthetic bubble; the on-device
  transitionend-vs-timer race and the visual settle are device-owed.
- The NP → chapter-list forward pair (overlay source, `newNav`) was not driven
  (needs a playback fixture); its hold path is the same acquire/release code,
  but that is an argument, not an execution.
- `Browse.reset()` (sign-out) was not driven directly; `clearCache()` — the
  same `dropHold` family plus node removal — was.
- A `start()` that throws after `takeRowHold` (source `pageElFor` miss) was
  traced unreachable through shipped callers — every shipped cache teardown
  synchronously re-renders the current browse screen, and `evictLRU` cannot
  evict the shown page in the sequences examined — but "unreachable" here is a
  reading, not an execution. With a bigger budget: force the LRU-order
  staleness (back-swipe landings do not refresh `order`) and hunt an eviction
  of a page a live descriptor still names.

## 7. Reconciliation (read after §1–§6 were fixed)

Blind set read post-verdict: `Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r1.md`
(the Plan-F3 ruling's exit walk), `…-r2.md` (F2's supersession-route note,
"Outside scope" item 1), and `Claude/Plans/PLAN-swipe-stage7.md` §14 (D1–D3,
U1).

**U1 is resolved by this strike.** §14 U1's two agreeing readings — acquire at
`:500`; releases at `:427`, `:1026`, `:1079`; lease-free exits at `:570` and
`:591`; the stale guard at `:1070` correct because `:427` released first — are
the same set §2 above derived independently, and §4 executed it: fourteen
planes and an eight-seed fuzz found no further exit. Three readings and an
execution now agree; the execution is the one U1 said to wait for.

**Novel, in neither review:** the P14 defect (§5) — a forward-commit whose
`fwdStack` a mid-settle `navTo` empties pushes `undefined` onto `navStack` and
throws in `runFinalize`. Round 1's inheritance row 6 notes in the abstract that
a throwing finalize leaves the stack mutated; neither review identifies a
*reachable* throw or this producer. It also means E2 (`:1079`) is not merely a
guard for the hypothetical: it runs in shipped code under a two-input sequence.
Routes to the planner with the `recoverSession` deferral it lands beside.

**Round 2's supersession-route question is answered by execution.** r2 F2 read
(and flagged as unsettled) that a superseded session's own finalize never calls
the release, so the supersession route of `LEASEINVALID` cannot produce an
`'invalidated'` status. P4 observed exactly that: the stale finalize called
`endHold` zero times — the `:1070` guard sits before the `try/finally`, so a
stale finalize makes no release call at all, effective or stale. The only producer of an invalidated release outcome is the
external `dropHold` family — `LEASEINVALID`'s second route — which P5/P11
drove. The test author should scope the cell's first route accordingly.

Where would the failure have entered, had one existed? In the enumeration —
the class §14 names. It did not: the enumeration held under execution. Nothing
found contradicts D1–D3.
