# RED cell — Stage A1-fix of ONE SCREEN TYPE (the mid-drag reconcile must not hide the incoming mover)

Author: Curie (test design). Date: 2026-07-31. Plan of record:
`Claude/Plans/PLAN-one-screen-type.md` §5.4 (the fix design), §14 (the `FILMSTRIPDRAG` Coverage
Model row), §13 step 6a (this step). Source finding: `Claude/Poirot/c4cfd7e-one-screen-type-stageA1.md`
F1 (Significant), watch-list `[W37]`. Authored at HEAD `e49eedc`, build `2026-07-30.280`; committed
at build `2026-07-31.281`. The build is step 6b; the device gate is step 6c.

**VERDICT: RED_SUITE_READY.**

## 1. The defect the cell reproduces, on shipped code

`js/nav.js:102` states *"Safe because applyScreen is NEVER called during an active drag."* It is
false. `Nav.overlayFilmstrip` schedules its reconcile twice — `toEl.addEventListener('transitionend',
finish, { once: true })` and `setTimeout(finish, 340)` (`js/nav.js:182-183`) — and cancels neither
when a gesture arms. `finish` → `reconcile` → `applyScreen(currentDesc(), { render: false })`, whose
first act is `resetSwipeStyles` and whose second is `setView`.

Stage A1 changed what that costs. Before A1, `setView('options')` did not touch `#browse`; after A1
its narrowed park guard hides it. So a reconcile landing mid-drag gives `#browse` — **the incoming
mover the user is dragging toward** — the `hidden` class, and nothing re-un-hides it for the rest of
the gesture, because only a `move` re-applies transforms. The user drags, the destination never
arrives, and it snaps in at release.

**The invariant the cell defends** (plan §5.4): a pending `overlayFilmstrip` reconcile must not
change the visibility or the transform of an element that a live gesture owns as a mover.

## 2. Files

| File | State | Contents |
|---|---|---|
| `test/one-screen-type-filmstrip.test.js` | **NEW** | `FILMSTRIPDRAG` — two cells (live-drag; arm-vs-live trap) |
| `test/app-harness.js` | **CHANGED** | `opts.realOptions` (default off); `touch.move/end/cancel` return the dispatched event |
| `tools/mutate.mjs` | **CHANGED** | one mutant registered (`#110`); the two §14 mutants specified for the build commit |
| `build.json`, `index.html`, `js/debug.js`, `sw.js` | **CHANGED** | build bumped to `2026-07-31.281` |
| `js/**`, `css/**` | **UNTOUCHED** | production source is the builder's; nothing here edits it |

## 3. The exact gesture and timing the cell drives

Every step is a production path. No test-only export was added to `js/app.js` or `js/nav.js`.

1. Books (bottom-nav) → Options (bottom-nav). `navStack` is `[home, books, options]`.
2. **Diagnostics** via the shipped `.hubrow[data-sub="diagnostics"]` button, which
   `js/options-screen.js` wires to `app.js`'s `openSub`. That filmstrips forward; its own 340ms net
   is then advanced out, so exactly one pending reconcile exists below.
3. **`‹ Back`** via the shipped `#dgBack` button, which `js/app.js` wires straight to `closeSub`.
   `closeSub` pops the stack **before** calling `Nav.overlayFilmstrip(fromV, 'options', 'back')`, so
   `currentDesc()` is already `'options'` and `navStack[-2]` is the Books descriptor. One 340ms net
   is now pending and both panes are un-hidden and inline-transformed.
4. **The impatient thumb.** A left-edge touch at `x = 2` arms the gesture; two moves lock it and
   `start()` goes live toward `books`, so `env.renderDestination` un-hides `#browse` and it becomes
   the incoming mover at base `-w`. The swipe log reads `start back options→books`.
5. **The clock advances past the 340ms net with the finger still down** — no `touchend`, no
   `touchcancel`. This is the window: 0-340ms after the `‹ Back` tap, and sooner in a real browser
   where `transitionend` fires at ~240ms.
6. A further `move` follows, because only a `move` re-applies transforms — a build that lets the
   next move paper over the wiped transform still leaves the element `display:none` for the rest of
   the gesture, and this is the assertion that separates the two.

Why the 340ms net rather than `transitionend`: jsdom runs no transitions and fires no
`transitionend`, so the net is the sole scheduler here. It is the slower of the two real paths, not
an artificial one; the fix must cover both, and covering the net covers the listener by
construction — both call the same `finish`.

## 4. The RED run at HEAD `e49eedc`, skip removed — CONFIRMED

```
node --test test/one-screen-type-filmstrip.test.js

not ok 1 - FILMSTRIPDRAG — a pending overlayFilmstrip reconcile must not hide the INCOMING
           MOVER of a live gesture: #browse stays un-hidden and transformed with the finger
           still down
  error: "THE DEFECT (plan §5.4 / review F1): the pending overlayFilmstrip reconcile ran
          applyScreen → setView('options'), and A1's narrowed park guard gave the INCOMING
          MOVER #browse the `hidden` class in the middle of the drag. A pending reconcile
          must not change the visibility of an element a live gesture owns as a mover."
  code: 'ERR_ASSERTION'
  expected: false
  actual:   true
  operator: '=='
  stack: test/one-screen-type-filmstrip.test.js:127

ok 2 - FILMSTRIPDRAG — the ARM-vs-LIVE trap
# tests 2 / pass 1 / fail 1
```

**It is red for the defect, not for an incidental error.** Every fixture-sanity assertion ahead of
it passed, which is what pins that: the forward filmstrip landed, `closeSub` scheduled exactly one
340ms net, both panes were un-hidden, the gesture went **live** toward a browse destination
(`start back options→books`), and `#browse` was un-hidden and carrying a non-empty inline transform
immediately before the net fired. The failure is `#browse.classList.contains('hidden')` flipping
`false → true` with the finger still down — the incoming mover hidden mid-drag, which is F1.

Committed state: the live-drag cell carries `{ skip: SKIP }` so the pre-commit battery stays green
(`core.hooksPath = tools/hooks`; this project does not use `--no-verify`). **The builder removes the
skip to drive it red, then builds to green. No assertion is weakened to green it.**

## 5. The second cell is the arm-vs-live trap, and it is GREEN at HEAD deliberately

Plan §5.4 names the trap explicitly: a fix may cancel the pending reconcile, but **at go-live
(`start()`), never at arm (`begin()`)**. Skipping the reconcile is safe only because the gesture's
own finalize `applyScreen` is a superset of it — and that superset does not exist for a gesture that
arms and never locks, because `end()` returns at `if (!cur.live)` (`js/app.js:611`) **without**
calling `applyScreen`. Suppressing the reconcile on the armed state therefore strands the filmstrip
with nothing scheduled to clear it.

The cell drives exactly that window: arm at the left edge, a 2px move that stays under the 8px lock
threshold, **the net fires while the finger is still down and the session is armed-but-not-live**,
then release. It asserts the reconciliation duty was discharged anyway — `#diagnostics` carries no
inline transform and does carry `hidden`; `#options` carries no inline transform and does not.

**It is a PRESERVATION cell — green at HEAD by construction**, because at HEAD nothing suppresses
anything. Its whole evidence of fail-ability is mutation, which is why mutant `#110` is registered
now rather than at build time (§6).

**Proving the gesture is genuinely armed.** Without that, the cell would pass vacuously whenever
`begin()` rejected and no gesture existed at all. The observable is non-invasive and real: `move()`
calls `ev.preventDefault()` on an armed session **before** returning under the lock threshold, so a
prevented sub-threshold move proves a session exists without starting one. `h.touch.move` now
returns the dispatched event so a test can read `defaultPrevented`. The cell also asserts the swipe
log contains no `start ` line, pinning that it did **not** go live.

## 6. Mutations

### Registered now — `#110`, swept, caught

```
node tools/mutation-sweep.mjs 110
#110  caught (1 failing) — one-screen-type FILMSTRIPDRAG: overlayFilmstrip loses its 340ms
      reconcile safety net, so a missed transitionend leaves the filmstrip un-reconciled — the
      outgoing pane keeps its inline transform and the sub-screen stays un-hidden
      killed by: FILMSTRIPDRAG — the ARM-vs-LIVE trap
swept 1: 0 uncaught, 0 unapplied, 0 stale flags
```

Anchor `    setTimeout(finish, 340);                                      // safety net`
(`js/nav.js`) — naturally unique, and the A1-fix touches the reconcile rather than the scheduling
line, so it does not rot at the build. It reaches the trap cell's end-state from the other side:
losing the net entirely, rather than suppressing it too early. Expected killing cell: the
`FILMSTRIPDRAG` arm-vs-live trap cell.

### Specified for registration in the step-6b build commit — the two §14 mutants

Neither can be registered at step 6a, and the reason is mechanical, not a deferral: **both anchor on
the live-gesture condition the fix introduces**, which does not occur in `js/nav.js` yet, and a
`from` that does not occur reddens `test/mutation-anchors.test.js` with `ANCHOR NOT FOUND`. This is
the same build-time registration Stage A1 used for six of its nine mutants, for the same reason.

**Registering these two is part of step 6b and is not optional.** The `from` text is the builder's,
because plan §5.4 leaves the fix's shape open (U11 — the recommended injected `d.gestureLive()`
predicate, or the admissible cancel-at-go-live). What is fixed here is each mutant's **intent**, its
**observable effect**, and its **expected killing cell**; the anchor is transcribed from whichever
form ships, carrying disambiguating context from the start per `tools/mutate.mjs`'s own convention
(in this repo an anchor is assumed non-unique until the tool proves otherwise).

| Mutant | Change to the shipped fix | Effect | Expected killing cell |
|---|---|---|---|
| `FILMSTRIPDRAG-a` (§14 NATURAL-a) | Remove the live-gesture condition from `reconcile`, so the pending `finish` runs unconditionally — i.e. restore the shipped `const reconcile = () => applyScreen(d.currentDesc(), { render: false });` | The reconcile lands during the drag and `setView` hides the incoming mover | `FILMSTRIPDRAG` live-drag cell — the `#browse` not-hidden assertion (and its transform assertion) |
| `FILMSTRIPDRAG-b` (§14 NATURAL-b) | Make the condition test **armed** rather than **live** — the predicate form tests the existence of a session instead of `live`; the cancellation form cancels in `begin()` instead of `start()` | A gesture that arms without locking suppresses the only scheduled reconcile, and its `end()` never calls `applyScreen`, so the filmstrip is stranded mid-transform | `FILMSTRIPDRAG` arm-vs-live trap cell — the cleared-transform and re-hidden-sub assertions |

## 7. What this cell asserts, and what it cannot

**Every assertion is class state, inline-style presence, a call ordering, or a fixture-sanity
observation of the same kinds.** Nothing asserts geometry, paint, compositing, stacking or
occlusion. jsdom has none of those, so a cell claiming the destination "appears", that a screen
occludes what is behind it, or that a drag looks smooth **could not fail** and would be a false
witness. Confirmed by reading the file in full: the observables are exactly
`classList.contains('hidden')`, `classList.contains('parked')`, `element.style.transform` compared
against `''`, `h.clock.pendingDump()` entries filtered by their original 340ms delay,
`event.defaultPrevented`, and the `SWIPE` debug log lines.

**Device-owed, and claimed by nothing here — plan step 6c.** That the destination visibly tracks the
finger for the whole drag instead of appearing only at release; that no frame paints a
half-transformed or stranded screen; that the ~240ms `transitionend` path behaves as the 340ms net
path does in a real browser; and the residues already device-owed from the A1 review (`R-B`, `R-C`,
`R-E`, `R-G`, watch-list `[W43]`). CI proves the **mechanism** — that no pending reconcile changes a
live mover's visibility or transform, and that the reconciliation duty is still discharged on the
armed-and-released path. The outcome is the device's.

## 8. Lockstep — what the builder must also do (NOT done here)

1. Remove `{ skip: SKIP }` from the live-drag cell, confirm it is red, then build to green (§5.4).
2. Register `FILMSTRIPDRAG-a` and `FILMSTRIPDRAG-b` against the shipped fix (§6), and sweep them.
3. Delete or correct `js/nav.js:102`'s "NEVER called during an active drag" claim in the same
   commit (§5.4). After the fix it would describe a property the code newly does enforce, but for a
   reason the comment does not give.
4. The rest of step 6b as the plan states it: scope the three exclusivity universals to *at rest*
   (§12 item 30), correct or mark `js/nav.js:71-72` (§12 item 31), bump the build number.

## 9. Handoff

- **Source artifact** — `Claude/Plans/PLAN-one-screen-type.md` §5.4 / §14 / §13 step 6a.
- **Verdict** — `RED_SUITE_READY`. The live-drag cell is red at HEAD for the defect; the trap cell
  is green at HEAD and mutation-proven able to fail.
- **Next owner** — the builder, for step 6b; the coverage auditor, for the suite audit at step 16.
- **Records updated** — this file. No production source touched.
