# RED cell — the THIRD `FILMSTRIPDRAG` window: the post-release SETTLE window

Author: Curie (test design). Date: 2026-07-31. Plan of record:
`Claude/Plans/PLAN-one-screen-type.md` §5.4 (the restated invariant and its boundary table), §5.4a
(why the first fix failed), §14 (the three-window `FILMSTRIPDRAG` row and its three mutants), §13
step r2. Source finding: `Claude/Loki/STRIKE-one-screen-type.md` (KILL, 2026-07-31), whose probe
`Claude/Loki/probe-settle-window.test.js` is the instrument this cell inherits. Windows one and two
are `Claude/Curie/RED-one-screen-type-filmstrip.md`. Authored at HEAD `de53955`, build
`2026-07-31.282`; committed at build `2026-07-31.283`. The build is step r2b.

**VERDICT: RED_SUITE_READY.**

## 1. The defect the cell reproduces, on shipped `.282` code

The A1-fix predicate is `gestureLive() = !!d && d.live` (`js/app.js:213`). `d` is the ACTIVE-DRAG
handle and `end()` nulls it at finger-up (`js/app.js:618`: `const cur = d; d = null;`). `session` is
the owner and outlives it: `sessionDone(cur)` runs only at finalize (`js/app.js:1262`) or at the
reveal drop (`js/app.js:893`), and nothing ever sets `.live` back to false. So for the entire
post-release settle phase — finger up, movers animating to their final positions, finalize not yet
run — the predicate reads **false** while the session still owns and animates those movers.

A pending `overlayFilmstrip` reconcile that fires in that gap is therefore not suppressed. It runs
`applyScreen(currentDesc(), { render:false })` against the **pre-commit** descriptor `'options'`:
`resetSwipeStyles` wipes both movers' inline transforms (destroying the settle animation, which also
cancels the settle transition and kills its `transitionend` finalize), then `setView('options')`
hides `#browse` — the destination the user just committed to — and un-hides `#options`. The
destination is restored only when the settle's 340ms fallback finalize runs: **hidden→shown with no
gesture and no animation.**

**The invariant the cell defends** (plan §5.4, restated on the correct lifetime): *a pending
`overlayFilmstrip` reconcile must not change the visibility or the transform of an element a gesture
**SESSION** owns as a mover, for the whole of that ownership — beginning when the gesture goes LIVE
and ending when the session releases at finalize or reveal-drop, NOT when the drag handle is nulled
at finger-up.*

## 2. Files

| File | State | Contents |
|---|---|---|
| `test/one-screen-type-filmstrip.test.js` | **CHANGED** | window three added (`hiddenLedger`, `flickBackToBooks`, the settle-window cell). Windows one and two are byte-unchanged. |
| `build.json`, `index.html`, `js/debug.js`, `sw.js` | **CHANGED** | build stamped to `2026-07-31.283` via `tools/stamp-build.mjs` |
| `tools/mutate.mjs` | **UNTOUCHED** | the third mutant cannot be registered yet — §6 specifies it verbatim for the r2b build, and names two existing anchors that rot |
| `js/**`, `css/**` | **UNTOUCHED** | production source is the builder's. `git status` shows no modification to `js/app.js` or `js/nav.js`. |

## 3. The exact gesture and release timing the cell drives

Every step is a production path; no test-only export was added to `js/app.js` or `js/nav.js`. Steps
1–3 are the shipped `toSubThenBack` helper the first two cells already use.

1. Books (bottom-nav) → Options (bottom-nav) → **Diagnostics** via the real
   `.hubrow[data-sub="diagnostics"]`; the forward filmstrip's own 340ms net is advanced out.
2. **`‹ Back`** via the real `#dgBack`, which `js/app.js` wires straight to `closeSub`. `closeSub`
   pops the stack **before** `Nav.overlayFilmstrip(fromV,'options','back')`, so `currentDesc()` is
   already `'options'` and `navStack[-2]` is the Books descriptor. Exactly one 340ms net is pending.
3. **Virtual time advances 130ms.** This is the release timing the cell is about. The strike's
   reachability derivation (`Claude/Loki/STRIKE-one-screen-type.md` §5) puts the real-engine band at
   a release **~125–340ms** after the tap: late enough that the 340ms net still beats the settle's
   own ~216ms `transitionend`, early enough that the net has not already been consumed while the
   gesture was live. **130ms sits just inside that band.**
4. A left-edge back-flick through the real touch listeners: arm at `x=2`, three moves to
   `dx≈498` of `w=1024` (`prog≈0.49 > THRESH 0.42`), so the swipe log reads
   `start back options→books` and the release **commits**.
5. **Release.** `settle(cur, true)` begins; its 340ms fallback finalize is now pending. Two 340ms
   timers sit at **distinct dues — 210 and 340** — which the cell asserts, because equal dues would
   collapse the window it exists to drive.
6. Advance 220ms: **the net fires; the finalize has not.** This is the settle window, and it is
   where every load-bearing assertion is read.
7. Advance 130ms more: the fallback finalize fires and the committed end-state lands.

**Why the 340ms net rather than `transitionend`:** jsdom runs no transitions and fires no
`transitionend`, so the net is the sole scheduler — and with no `transitionend` the settle's only
finalize is its own 340ms fallback. That makes the virtual race simpler than the device's, not
kinder: the same two production timers, at the same two production delays.

## 4. What the cell asserts

At the settle-window checkpoint (step 6), with the session proven still the owner:

- `#browse` (the committed incoming mover) does **not** carry `hidden`;
- `#browse` and `#options` both still carry a non-empty inline `transform` — the settle animation is
  intact, not wiped;
- `#options` does not yet carry `hidden` — the source has not snapped back to its at-rest state
  while the gesture leaving it is still leaving.

Across the whole window and through finalize:

- an ordered **ledger** of every `class` write on `#browse` contains no `hidden` state at all inside
  the settle window, and **no `true → false` adjacency anywhere** from release to finalize. That
  second assertion is the "no hidden→shown flip" the Coverage Model names — the pop-in itself.
- the commit finalize still runs and logs (`commit back options→books`), so suppressing the reconcile
  does not cost the gesture its own finalize;
- the end state is correct and nothing is stranded: `#browse` shown, `#options` hidden, both inline
  transforms cleared, and `PBSwipeSession()` back to `null` — so a reconcile arriving *after* this
  point is correctly no longer suppressed.

**The ledger, and why it is not a pair of samples.** The defect's signature is a flip that *heals*
inside the window. Two point samples either side of it read identical and prove nothing. The ledger
is a `MutationObserver` on `#browse`'s `class` attribute with `attributeOldValue`, drained
synchronously with `takeRecords()`, reconstructing the ordered sequence of `hidden` states: the state
after record *i* is the `oldValue` of record *i+1*, and after the last record it is the element's
current state. It is still pure class state — a list of booleans read off `class` strings.

## 5. The RED run at HEAD `de53955` / build `.282`, skip removed — CONFIRMED

```
node --test test/one-screen-type-filmstrip.test.js

ok 1 - FILMSTRIPDRAG — a pending overlayFilmstrip reconcile must not hide the INCOMING
       MOVER of a live gesture
ok 2 - FILMSTRIPDRAG — the ARM-vs-LIVE trap
not ok 3 - FILMSTRIPDRAG — the SETTLE window: a pending overlayFilmstrip reconcile that
           fires after finger-up but before finalize must not hide or un-transform the
           COMMITTED movers the session still owns, and no hidden→shown flip may occur
           at finalize
  error: "THE DEFECT (Loki KILL; plan §5.4a): the pending overlayFilmstrip reconcile was
          NOT suppressed after finger-up — the shipped .282 predicate reads the DRAG
          HANDLE (!!d && d.live), which end() nulled at release, while the SESSION still
          owns and animates these movers. So it ran applyScreen('options') and gave
          #browse — the destination the user just COMMITTED to — the `hidden` class in
          the middle of its snap. A pending reconcile must not change the visibility of
          an element a gesture SESSION owns as a mover, for the whole of that ownership."
  code: 'ERR_ASSERTION'
  expected: false
  actual:   true
  operator: '=='
  stack: test/one-screen-type-filmstrip.test.js:317
# tests 3 / pass 2 / fail 1
```

**It is red for the settle-window suppression gap, not for an incidental error.** Every fixture-
sanity and instrument assertion ahead of it passed, and together they pin that the cell is genuinely
inside the window:

- the forward filmstrip landed and `closeSub` scheduled exactly one 340ms net;
- the gesture went **live** toward a browse destination (`start back options→books`) and `#browse`
  was un-hidden and inline-transformed before release;
- **post-release `PBSwipeSession()` is non-null with `dragging:false`** — the session owns the movers
  while the drag handle is gone, which is the asymmetry under test;
- after release the two 340ms timers sat at distinct dues `[210, 340]`;
- at the checkpoint the net had fired, the finalize had **not** (no commit logged), and the session
  was **still the owner**.

Only then does `#browse.classList.contains('hidden')` read `true`.

## 6. Discrimination — the cell pins the predicate, and pins it jointly with window two

Three ephemeral one-line substitutions of `js/app.js:213`, each run and then reverted (`git checkout
-- js/app.js`; the committed tree leaves `js/` untouched):

| Predicate | Cell 1 (live) | Cell 2 (arm trap) | Cell 3 (settle) |
|---|---|---|---|
| `!!d && d.live` — **shipped `.282`** | pass | pass | **FAIL** |
| `!!session && session.live` — **the planned repair** | pass | pass | pass |
| `!!session` — **the wrong repair the plan flags** | pass | **FAIL** | pass |

So the suite admits exactly the predicate whose truth boundaries coincide with the session's
ownership boundaries, and rejects both neighbours. **Window two is not weakened**: it still reddens
on `!!session` alone, with its own message — *"A fix that suppresses it at ARM strands the outgoing
pane holding an inline translateX forever."* Windows one and two are byte-unchanged and both pass at
HEAD.

## 7. Mutations

### Specified for registration in the r2b build commit — `FILMSTRIPDRAG-c` (§14 NATURAL-c)

It cannot be registered at step r2, and the reason is mechanical, not a deferral: **its anchor is the
repaired predicate, which does not exist in `js/app.js` yet**, and a `from` that does not occur
reddens `test/mutation-anchors.test.js` with `ANCHOR NOT FOUND`. This is the same build-time
registration windows one and two used, for the same reason.

| Field | Value |
|---|---|
| **Intent** | Restore the shipped `.282` **drag-liveness** form of the predicate, so the guard reads the nulled drag handle instead of the session. |
| **Effect** | Suppression stops at finger-up instead of at finalize, so a pending reconcile that fires in the settle window runs `applyScreen` against the pre-commit descriptor: the committed incoming mover is hidden mid-snap, both settle transforms are wiped, and the destination is restored only at the fallback finalize. |
| **Expected killing cell** | `FILMSTRIPDRAG` — the SETTLE window cell: the `#browse` not-hidden assertion at the checkpoint, and the no-`hidden→shown`-flip ledger assertion. |
| **File** | `js/app.js` |
| **`to`** | `    const gestureOwnsMovers = () => !!d && d.live;   /* mutated: guards the DRAG HANDLE's lifetime, not the SESSION's */` |

**The `from` is the builder's**, because plan §5.4 requires the predicate to be **renamed** along
with the repair (`gestureOwnsMovers`, or equivalent — "a predicate whose name survives its meaning is
the staleness class this plan has already corrected three times"), and the chosen name is not fixed
here. Transcribe the anchor verbatim from whichever form ships, carrying disambiguating context from
the start per `tools/mutate.mjs`'s own convention (in this repo an anchor is assumed non-unique until
the tool proves otherwise). If the shipped line is exactly
`    const gestureOwnsMovers = () => !!session && session.live;` that whole line is the anchor and it
is naturally unique — the predicate is defined at exactly one place in `js/app.js`. **Keep the `to`
above unchanged whatever the name**: the mutant's whole subject is the *lifetime the predicate reads*,
so the mutated line must keep the new name and swap only the operand.

### ⚠️ Two ALREADY-REGISTERED anchors rot at r2b, and re-transcribing them is not optional

Both existing `FILMSTRIPDRAG` mutants anchor on text the repair rewrites. Left alone they redden
`test/mutation-anchors.test.js` with `ANCHOR NOT FOUND`, and a rotted anchor silently stops testing
anything.

| Mutant | Registered anchor | Why it rots | Required re-transcription |
|---|---|---|---|
| `#111` `FILMSTRIPDRAG-a` | `js/nav.js` — the four-line `const reconcile = () => { if (d.gestureLive && d.gestureLive()) return; … }` | the injected dep is renamed with the predicate | re-transcribe against the shipped `reconcile`; `to` stays the unguarded `const reconcile = () => applyScreen(d.currentDesc(), { render: false });` |
| `#112` `FILMSTRIPDRAG-b` | `js/app.js` — `    const gestureLive = () => !!d && d.live;` | the whole line is replaced by the repair | anchor becomes the shipped predicate line; **`to` becomes `!!session`** (the armed-vs-live widening, now expressed on the session), keeping its expected killing cell: the arm-vs-live trap cell |

`#110` (the deleted 340ms safety net, `js/nav.js`) is unaffected — the repair touches the predicate,
not the scheduling line.

## 8. What this cell asserts, and what it cannot

**Every assertion is class state, inline-style presence, a pending-timer ledger entry, a call
ordering, or a fixture-sanity observation of the same kinds.** Confirmed by reading the cell in full;
the observables are exactly `classList.contains('hidden')`, `element.style.transform` compared
against `''`, `h.clock.pendingDump()` entries filtered by their original 340ms delay, the ordered
`class`-attribute mutation ledger, `window.PBSwipeSession()`, and the `SWIPE` debug log lines.

**Nothing asserts geometry, paint, compositing, stacking or occlusion.** jsdom has none of those, so
a cell claiming the destination "appears", that anything is visually hidden, that a screen occludes
what is behind it, or that the snap looks smooth **could not fail** and would be a false witness.

**Device-owed, and claimed by nothing here — plan step 6f.** That the committed destination visibly
completes its snap instead of vanishing and popping back in; that no frame paints the wrong state in
the net→finalize gap; the exact width of the real-engine release band on real transition timings
(~240ms `transitionend` vs the 340ms net); the real-browser dual-listener path, where the filmstrip's
`finish` and the settle's `finalize` are both `transitionend` listeners on the same element; and
whether this mechanism is the user's sighted, unreproduced pop-in (the repro to try: a flick released
~125–340ms after a settings back/forward tap, committed toward Books or Home). **CI proves the
mechanism — that no pending reconcile changes a session-owned mover's visibility or transform for the
whole of that ownership, and that the reconciliation duty is still discharged. The look on glass is
the device's.**

## 9. Lockstep — what the builder must also do (NOT done here)

1. Remove `{ skip: SKIP_SETTLE }` from the settle-window cell, confirm it is red, then build to green
   by re-scoping the predicate to `!!session && session.live` (plan §5.4). **No assertion is weakened
   to green it**, and windows one and two must stay green throughout.
2. Rename the predicate and the injected dep with it (plan §5.4, "naming goes with it"), and update
   `js/nav.js:107-110`'s rewritten claim — *"this reset never lands on an element a live gesture owns
   as a mover"* — which the strike showed executed-false for session-owned movers mid-settle.
3. Register `FILMSTRIPDRAG-c` per §7, and **re-transcribe `#111` and `#112`**, then sweep all three
   foreground with a targeted index list (never backgrounded; no `*.mutbak` may survive into a
   commit).
4. Bump the build number.

## 10. Handoff

- **Source artifact** — `Claude/Plans/PLAN-one-screen-type.md` §5.4 / §5.4a / §14 / §13 step r2;
  `Claude/Loki/STRIKE-one-screen-type.md`.
- **Verdict** — `RED_SUITE_READY`. Window three is red at HEAD `.282` for the settle-window
  suppression gap and green under `!!session && session.live`; windows one and two are unchanged and
  green, and the arm trap still reddens on `!!session` alone.
- **Next owner** — the builder, for step r2b; the coverage auditor, for the suite audit.
- **Records updated** — this file. No production source touched.
