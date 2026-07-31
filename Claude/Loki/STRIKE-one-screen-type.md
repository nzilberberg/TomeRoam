# LOKI STRIKE — PLAN-one-screen-type Stage A1-fix (the settle-window reconcile) — 2026-07-31

**Verdict: KILL.** Executed, control-validated counterexample against HEAD `8e65f91` (build
`2026-07-31.282`, the Stage A1-fix build), run through `test/app-harness.js` over the real shipped
`app.js`/`nav.js` touch listeners with fake timers: **a pending `overlayFilmstrip` reconcile that
fires in the SETTLE window of a committed, already-released gesture is not suppressed — it
`display:none`s the destination the user just committed to, mid-snap, and destroys the settle
animation; the destination pops back in up to ~340ms later at the settle's fallback finalize.**
The A1-fix's predicate `d.gestureLive()` reads `!!d && d.live` (`js/app.js:213`), and `d` is
nulled at `end()` (`js/app.js:618`) while `session` owns the movers through the whole
settle/finalize phase (`js/app.js:219-226`, stage-3 owner comments). Liveness ends at
finger-up; ownership ends at finalize. The fix keyed suppression to the wrong one.

Commissioned per plan §13 step 6, aimed per §16.4 at the class *"a writer outside `setView`
un-hides or un-parks a screen, and a frame is painted in that state"*, on paths not owned by
Stage A1b (unbuilt) or the A1-fix (shipped). The original A1 claim — settled by the plan review's
reading — was not struck.

## 1. The promise (verbatim)

Plan §5.4, the invariant the fix must satisfy:

> "A pending `overlayFilmstrip` reconcile must not change the visibility or the transform of an
> element that a live gesture owns as a mover. The reconciliation duty is not lost when it is
> skipped: **the gesture's own finalize `applyScreen` is a superset** … So skipping is safe, not
> merely cheaper."

And the shipped form of the argument, `js/nav.js:107-110` (rewritten at the A1-fix commit):

> "applyScreen DOES run during a drag: overlayFilmstrip's pending reconcile is the one path that
> calls it while a gesture session exists. But that reconcile is a no-op whenever the gesture is
> LIVE … **so this reset never lands on an element a live gesture owns as a mover.**"

Restated as testable behavior: on every reachable interleaving, a pending filmstrip reconcile
either (a) is suppressed while the gesture animates its movers, or (b) runs at a moment when no
gesture-owned mover's visibility or transform can be wrongly changed. The counterexample is an
interleaving where the reconcile runs, mutates session-owned movers, and the state is held across
a multi-frame window.

## 2. The plane

The gesture has three phases with distinct predicate values:

| Phase | `d` | `session` | `gestureLive()` | Movers owned? | Reconcile behavior |
|---|---|---|---|---|---|
| armed (no lock) | set, `live:false` | set | false | none taken | runs — CORRECT (the arm-vs-live trap, covered by the shipped second cell) |
| live drag | set, `live:true` | set | **true** | yes | suppressed — CORRECT (shipped first cell) |
| **settle (released → finalize)** | **null** | **set, animating the movers** | **false** | **yes** | **runs — THE FRACTURE** |

§5.4's derivation analyzed the front edge of liveness (arm-vs-live) and stopped. The back edge —
`end()` nulls `d` while `settle()` is still animating session-owned movers for ~200ms plus the
finalize race — has the same shape and no guard. The superset argument ("a gesture that goes live
always finalizes through that call") is true and beside the point: the finalize discharges the
duty *after* the pending net has already fired *into* the gap and done the damage.

## 3. The instrument (reproducible)

`Claude/Loki/probe-settle-window.test.js` (filed beside this record; run
`node --test Claude/Loki/probe-settle-window.test.js` from the repo root). Production paths only,
mirroring the shipped FILMSTRIPDRAG cell's drive:

1. Books → Options (navbar) → Diagnostics (real `.hubrow`) → `#dgBack` (real `closeSub`). The
   back filmstrip's 340ms net is pending; `currentDesc()` is already `'options'`.
2. Advance virtual time 120ms (the net is now due at +220), then a left-edge back-flick toward
   Books through the real touch listeners: arm, lock, live (`start back options→books` logged),
   drag to prog≈0.49 > THRESH, **release**. Commit settle begins; its fallback finalize is due at
   +340 from release. Two 340ms timers now pend at distinct dues (+220 and +340) — the virtual
   image of a flick released 120ms after the ‹ Back tap.
3. Advance 230ms: the net fires; the settle finalize has not.
4. Advance 120ms more: the settle finalize fires.

## 4. Executed results (jsdom harness, real shipped listeners; controls green first)

**Controls, all green before the kill was read:**
- The shipped `test/one-screen-type-filmstrip.test.js` — 2/2 pass at HEAD (the fix works in the
  two windows it covers: live drag suppressed, armed-only discharged).
- CONTROL probe: identical drive with the net retired before the gesture — the settle window is
  clean end to end (`#browse` un-hidden with its settle transform intact at the same mid-settle
  checkpoint; finalize commits normally). The kill's wrong state is attributable to the net alone.
- In-kill instrument checks: exactly one net pending before release, two 340ms timers at distinct
  dues after, the net consumed at step 3 with no commit logged yet, `PBSwipeSession()` non-null
  with `dragging:false` post-release (the session owns the movers; `d` is gone).

**The kill (every assertion held):** at step 3 — after release, before finalize —
- `#browse` (the incoming mover of the committed gesture) carries `hidden`: the destination the
  user committed to is `display:none` mid-snap;
- `#options` (the outgoing source) is un-hidden: snapped back to fully visible;
- both movers' inline transforms are wiped: `resetSwipeStyles` destroyed the settle animation,
  which also cancels the settle transition, so the transitionend finalize is dead and only the
  340ms fallback remains;
- the session still owns the movers (`PBSwipeSession()` non-null) — the reconcile mutated
  session-owned elements.

At step 4 the fallback finalize runs (`#1 commit back options→books` logged),
`applyScreen(books)` un-hides `#browse` — **hidden→shown with no gesture and no animation: the
pop-in.**

Mechanism trace: the net's `finish` → `reconcile` → `gestureLive()` false (`d` null) →
`applyScreen(currentDesc()={v:'options'}, {render:false})` → `resetSwipeStyles` wipes every
mover's transform/transition → `setView('options')` parks `#home`, fires `d.browseWillHide()`
(a spurious mid-settle `Browse.deactivate()`), hides `#browse`, un-hides `#options`.

## 5. Reachability (derived from shipped constants; timings device-owed)

Real-engine window, from `js/nav.js` (.24s filmstrip transition, 340ms net) and `js/app.js`
(.2s settle transition, 340ms settle fallback): tap ‹ Back (or a hub row — the forward filmstrip
has the same shape) at t=0; edge-flick that locks before ~t≈240 (so the drag's transform writes
retarget the filmstrip transition and its transitionend never fires); **release at t=R with
commit**. The settle's own transitionend would fire at ~R+216 and is benign (see lesser planes),
so the kill needs the net (t=340) to beat it: **R ≳ 125ms**. And the net must fire after release
(else it is suppressed while live and consumed): **R < 340ms**. A flick released 125–340ms after
the tap — a fast but entirely human flick — puts the destination `display:none` from t=340 until
the fallback finalize at R+340: **125–340ms of wrong frames, then the pop-in.**

**The frame-painted bar.** jsdom paints nothing; what is executed is class state across the
window. The window itself is wall-clock real, bounded by two independent timers, with the app
idle between them — no synchronous continuation joins the net to the finalize (the reconcile
killed the settle transition, so nothing else runs). A multi-frame idle window during an
animation is painted by construction; this is the same argument the A1 code review used for its
mid-drag probes ("a live drag spans many frames by construction, so these states are painted
rather than skipped"), one phase later. What it looks like on glass is device-owed.

## 6. Could this be the user's unreproduced pop-in?

**It could, and the signature matches on all three axes; it is not confirmed.** (i) The
observable is literally a screen arriving late and popping in — the committed destination
vanishes mid-snap and reappears ~a third of a second later. (ii) The trigger window is a
125–340ms release band behind a back/forward settings tap — narrow, timing-dependent,
naturally unreproducible by deliberate repetition. (iii) It self-heals at finalize, leaving no
state to inspect afterward. Against it: the A1-fix's device gate (step 6c) drove held drags in
this window and read clean — a held drag (release after t=340) is exactly the case the fix
handles. Confirmation would need the flick form on device.

## 7. Verdict on the A1-fix's superset argument

**The superset half is TRUE and was never the load-bearing half.** Every live-gesture path does
discharge the reconciliation duty: settle finalize (`js/app.js:1263-1296`), supersession's hard
reset ending in `applyScreen` (`js/app.js:452`), and the throw path's `finally`. I found no path
where a gesture that went live ends without an `applyScreen`-equivalent — that part of §5.4
holds.

**What the derivation missed is that suppression is per-firing, not a transfer of the duty.** A
suppressed firing while live is consumed harmlessly. But the same pending timer, fired 100ms
later in the settle gap, is *not* suppressed — and it does not merely "run the duty early": it
runs `applyScreen` against the pre-commit `currentDesc()` with the session's movers mid-animation.
The invariant's own wording — "an element that a **live gesture** owns as a mover" — is the seed:
ownership is session-scoped and outlives liveness by the entire settle phase, which `app.js`'s
own stage-3 owner comments state explicitly. The correct scope for the guard is session
ownership (with the armed-only case still admitted — the shipped second cell pins that trap),
not drag liveness.

## 8. Blast radius

- **`js/nav.js:110`'s rewritten claim** — "this reset never lands on an element a live gesture
  owns as a mover" — is executed-false in the sense that matters: it lands on session-owned
  movers mid-settle. The A1-fix retired one false absolute (`:102`) and shipped a narrower one.
- **The FILMSTRIPDRAG coverage has a bare third cell.** The two shipped cells pin the live window
  and the armed window; nothing pins the settle window. Fill spec (route to the test author): the
  shipped drive, net fired between `touch.end` and the settle finalize; assert the incoming
  mover keeps its class state and the settle transforms; the shipped predicate form
  (`!!d && d.live`) must redden it.
- **The step-6c device gate's clean read is narrower than it looks**: it validated held drags,
  which release after the net has been consumed. The flick band was not exercised.
- **A1b widens the reach.** Once `setView('nowplaying')` parks and hides, the same settle-window
  reconcile reaches NP round trips — the app's most frequent transition — exactly as §5.4 already
  argued for the live-window form.
- **A second-order casualty, un-prosecuted:** the mid-settle reconcile fires
  `d.browseWillHide()` → `Browse.deactivate()` on the destination the commit is about to show,
  and the commit finalize runs `render:false`, which never re-activates it. A committed
  destination page left with a deactivated virtual controller is a real state; its user-visible
  cost was not driven.
- **The fix's repair is one predicate, not a redesign** — suppress while the session owns movers
  (e.g. `finishing || (d && d.live)`, or a session-scoped read), keeping the armed-only case
  open. The choice is the planner's; the trap inventory is: armed-only must still discharge
  (shipped cell 2), and supersession's hard reset must still run its own `applyScreen`.

## 9. Lesser planes struck or noted (un-prosecuted, one line each)

- Abort variant of the same interleaving: reconcile and finalize both apply `'options'` — the
  snap animation is destroyed and the retreating mover vanishes early, but the end state is
  right; milder, same fix.
- Forward variant (`openSub` hub-row tap, then immediate back-flick): same mechanism, panes
  reversed; not separately driven.
- Real-browser dual-listener path: the filmstrip's `finish` and the settle's `finalize` are both
  transitionend listeners **on the same element** (`#options`), so a settle transition that
  completes fires both in one tick, `finish` first — visually benign (no frame between), but the
  reconcile's side effects (`options.scrollTop = 0`, a spurious `browseWillHide`) still run
  before the finalize; noted only.
- Supersession: `begin()`'s hard reset ends in a full `applyScreen` — self-healing, held,
  matching the plan review's reading.
- W44's async refresh handlers (`js/app.js:2642`, `:3144`, `:3237`) call `applyScreen` outside
  any gesture guard and exclude `'options'` but not the five subs — a third writer of this same
  class, flagged by the A1 review as "worth a look"; not driven here (one strike, not twenty).

## 10. Executed vs reasoned vs device-owed

**EXECUTED (jsdom app-harness, real shipped `app.js`/`nav.js`/listeners, fake timers; controls
green before the kill):** the shipped fix's own two cells at HEAD; the clean-settle control; the
kill interleaving end to end — net consumed mid-settle, destination hidden + transforms wiped +
session still owner, no finalize yet, then the fallback finalize restoring the destination.

**REASONED FROM SOURCE (not executed):** that frames are painted in the net→finalize gap (idle
wall-clock window bounded by two timers; precedent accepted at the A1 review); the real-engine
timing band (derived from the shipped .24s/.2s/340ms constants); the real-browser dual-listener
benign path; the deactivated-controller second-order state.

**DEVICE-OWED:** the visual appearance of the wrong frames and the pop-in on glass; the exact
width of the release band on real transition timings (~240ms transitionend vs 340ms net); whether
this is the user's sighted pop-in (a flick released ~125–340ms after a settings back/forward tap,
committed toward Books or Home, is the repro to try).

## 11. Reconciliation (post-strike read of the rationale)

The failure entered in the **reasoning**, not the exclusions. §5.4 derived one boundary of the
suppression window (arm vs live) with enough care to ship a cell for it, and never asked about
the other boundary (live vs settling), although the codebase states in its own comments that the
session outlives the drag handle through settle — the fact was in the artifact, cited, and not
consulted by the derivation. The reviewer's re-aim (§16.4) named "a superseded drag whose
recovery reconciles late" as a likely carrier, which is this fracture's family. The durable
lesson is the one this project keeps meeting from a new side: **a guard keyed to a predicate must
be derived from the lifetime of the resource it protects, not from the phase that first exhibited
the defect** — the mover's protected lifetime is the session's, and the fix guarded only the
phase Poirot's probe happened to drive.

VERDICT: KILL
