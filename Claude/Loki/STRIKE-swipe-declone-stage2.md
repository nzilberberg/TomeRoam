# STRIKE — PLAN-swipe-declone.md Stage 2, as built

Date: 2026-08-01. Artifact: the Stage 2 build at `e1db674`, review applied at `e1208eb`, struck at
HEAD `b1111b0`, build `2026-08-01.295`. Commissioned post-build (a dispatcher sequencing error,
recorded in the commission; the standard is unchanged). Readable set: `Claude/Plans/PLAN-swipe-declone.md`,
the production source, the test fixtures, `test/app-harness.js`. The plan reviewer's FORGE and the code
reviewer's casebook were not read until after the strike executed (Reconciliation, below).

**Contamination note.** The commission packet itself reported the code reviewer's executed result — a
same-key pair puts one node in both mover slots — before any plane was chosen. The plane selection
below accounts for that: the strike targets what that result left unexecuted, not the result itself.

## The promise

Invariant D6, verbatim (`Claude/Plans/PLAN-swipe-declone.md` §5):

> **Invariant D6 — a transition's two mover slots resolve to two DISTINCT elements, and the element
> that is shown when the gesture ends is the one the gesture LANDED on.**

Distinctness is known violated for a same-key pair (`authorBooks(A) → authorBooks(A)`); no guard
exists; the sole defence is a trigger census, filed open for the planner. The commission sanctioned
striking the **consequence** of the pair and forbade adjudicating its reachability. What no one had
executed: the full gesture, through the real listeners, to its END state — is the violation a
transient glitch or a wedged UI? That end state is the entire price of leaving the coordinate
unguarded, so it is the plane chosen.

## Planes studied and not prosecuted (one line each)

- **Landing totality** (`endHold` defined for every `currentDesc()` value): armored by construction —
  `keyFor` (`js/browse.js:153-158`) is non-throwing for null, payload-less, and non-browse
  descriptors; every well-formed non-browse view keys to itself and misses the cache. Read, not run.
- **The unopposed-park window** (§5.3.6 "the drag's inline `style.transform` overrides
  `.browsepage.parked`'s transform for the whole gesture" vs. `start()` writing only the non-zero-base
  mover at `js/app.js:594`): closed by construction — `move()` calls `start()` at lock and falls
  through to the all-movers transform write (`js/app.js:635-642`) in the same task, so no frame can
  paint the outgoing page at `-101vw`.
- **The containing-block promise** (§5.3.2): a `position: fixed` `#browse` is already the containing
  block for absolutely-positioned descendants, transformed or not — CSS-spec-solid, and measured by
  the round-2 review (top delta 0 under transform). Not re-run.
- **Scroll ownership across `display: none`**: measured retained in Blink by the round-2 review;
  WebKit retention is the plan's own filed-open device row (R8). A filed-open row is not a promise;
  not struck.
- **The four shipped Stage-1 transitions**: `endHold`'s miss branch is HEAD's inference verbatim, so
  equivalence holds by construction; the `activate()`-on-a-hidden-box sequence on a `browse→home`
  commit is HEAD-identical and pre-existing, not a Stage-2 break.

## The instrument

`Claude/Loki/probe-swipe-declone-stage2-samekey.js` (filed beside this record; disposable, not
suite material). It boots the real app via `test/app-harness.js` (`{ fakeTimers: true,
realBrowse: true }`): real `app.js`, `browse.js`, `virtuallist.js`, `swipe.js`, `nav.js`, real touch
listeners.

**Forcing, and its honesty condition.** The adjacent same-key nav entries are forced by dispatching a
second click on the same author row after its page has been left — a synthetic dispatch at a hidden
element. `pushNav` (`js/app.js:140-142`) pushes every payload-carrying descriptor and clears
`fwdStack` on every new navigation, so `navStack` becomes `[home, authors, authorBooks(A),
authorBooks(A)]` and a left-edge back-swipe is a fully real same-key `browse→browse` gesture from
`begin()` onward. This record makes NO claim that a real user gesture reaches this state — that is
the census's question, owned by the planner and untouched here.

Reproduce: `node --test Claude/Loki/probe-swipe-declone-stage2-samekey.js` (probe run 2026-08-01,
2 tests, 2 pass).

## Predictions, stated before the run

- The plan predicts mid-drag (D6 text): the second transform write wins; the single element
  translates at `base + t` with the incoming's `±w` offset; the view slides off with nothing arriving.
- The plan predicts nothing about the end state. The static trace predicts full recovery at finalize
  on both branches (`resetSwipeStyles` widened to `.browsepage`, plus `endHold`'s landed branch) and
  no wedge. The fracture prediction: a stuck transform, a wrong or hidden page, or a dead swipe
  afterward.

## Observed

Mid-drag, 110px into the locked back-swipe (jsdom viewport width 1024):

- Exactly ONE element carries a drag transform: the shown `authorBooks` page at
  `translateX(-914px)` — the incoming slot's write (`-w + t`); the outgoing slot's `translateX(110px)`
  was overwritten in the same `move()` pass. Node identity asserted against the cached page element.
- The `authors` page is `.parked` (off-viewport at `-101vw`); every other state as snapshotted in the
  probe output. No browse content occupies the viewport. The plan's mid-drag prediction is confirmed
  by execution.

Abort branch (`#1 abort back authorBooks→authorBooks`):

- End state: the page carries no transform, is shown, not parked; `authors` hidden, not parked.
- A follow-up gesture goes live and settles cleanly — `finishing` is not wedged, the hold token
  advanced, `beginHold`/`endHold` cycle intact.

Commit branch (`#1 commit back authorBooks→authorBooks`):

- End state identical: page shown, transform cleared, `authors` hidden, nothing parked.
- A follow-up gesture is a normal distinct-key pair (`start back authorBooks→authors`), goes live,
  settles cleanly.

## The finding

**The same-key consequence is bounded and self-healing.** The violation's full cost, executed
end-to-end, is one gesture's worth of visual anomaly: at drag start the only visible browse page
teleports a full viewport off-screen and rides the incoming slot's offset (the user sees the page
background with nothing on it, then the same page sliding in); at finalize — abort and commit
alike — `resetSwipeStyles` and `endHold`'s landed branch restore a fully correct, un-wedged state.
No stuck transform, no wrong page, no dead swipe machinery.

**Blast radius.** What stands on the fractured distinctness claim is re-priced, not re-opened: the
unpinned trigger census (the code reviewer's open W46/W49) is holding back a transient one-gesture
glitch, not a stuck UI. The recovery is carried by two Stage-2 mechanisms that this strike exercised
under the worst input they can receive — the widened `resetSwipeStyles` element set (round-1 SF1) and
the landed-branch reconciliation (round-2 SF2/F19) — both of which did their job. Residual doubt,
named: this is a jsdom execution; class/inline-style/identity state is proven, painted frames are
not. The mid-drag anomaly's visual severity on a device is estimable from the state (a blank
viewport for the drag's duration) but not measured here.

## Reconciliation (read after the strike)

The code reviewer executed the pair at the construction seam only (`SAME NODE IN BOTH SLOTS? true`,
Probe 1) and stated the mid-drag consequence in the plan's own words; the end state was never run —
W46 prices the risk as "under that reading the shipped code is unsafe," resting entirely on the
census. The r4 FORGE is scoped to F19 and does not touch the pair. So the failure entered as a
deliberate exclusion (the coordinate left unguarded on the census's word), and what was missing was
not knowledge of the fracture but the measurement of its price. That measurement is this record's
contribution: the planner's filed question (W46) should be weighed against a bounded, self-healing
downside, not an assumed catastrophic one. No new owner; nothing here changes who holds the pen.

Verdict: HELD_STONE — the one executable un-filed fracture candidate (the same-key consequence)
resolves to a bounded, self-healing anomaly; every other ratified promise studied is armored by
construction, measured, or HEAD-equivalent, with the plan's own filed device rows (R7/R8, R2b's
paint half) remaining the named residual doubt.
