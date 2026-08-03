# Device gate verdict — parked-page-rides-Home, build `2026-08-02.304`

Filed by Zelda, 2026-08-02, from the user's own report on their phone against the deployed build.
This is the gate that `PLAN-parked-page-rides-home.md` §11 left owed and that no bench could answer.

## The gate had two items. One is answered. One is not.

### Item 1 — does the fix clear the reported garbage? **ANSWERED — PASS, with the user's own scope.**

The user's words, quoted rather than paraphrased because the scope is the point:

> *"I'm not saying there are no bugs but the bugs I was able to easily reproduce last round seem
> fixed."*

**What this establishes:** the defect measured at Δ = −4px across 7/7 touchmove samples no longer
reproduces on the device, driven by the person who could previously reproduce it at will — including
the 100% repro they authored (*Now Playing → forward-swipe to the track list → Home → Books →
back-swipe to Home → forward-swipe to Books*). That is the strongest evidence available for R1's
first half, and it comes from the only instrument that can give it.

**What this does NOT establish, and must not be recorded as if it did:**
- The user explicitly declined to claim the absence of bugs. "Seem fixed" and "easily reproduce" are
  both bounded, and the boundary is theirs, not ours.
- **Plan risk R1 stays OPEN.** The fix removes one *measured* contributor to the reported garbage.
  Nothing here proves it was the only one; a harder-to-reproduce sibling would look exactly like this.
- No claim is made about the rotation edge (the plan's admitted constant-viewport clause, which Loki
  executed and quantified at a 50px strip when the viewport shrinks 812→375 mid-gesture).

### Item 2 — iOS cover-bitmap retention at the new distance. **OWED, and NOT CRISPLY OBSERVABLE — the item was mis-stated when it was filed as a watchable test.**

⛔⛔ **CORRECTION, and the reason this section was rewritten.** Zelda asked the user to *"start a swipe
into a book list and abort it, then watch the covers."* The user answered: **"if you abort the swipe
into books you won't see the books. I don't understand."** They are right, and the instruction was
never derived — it was written as though the item were a simple watchable test. It is not, on two
counts:

1. **The gesture named nothing.** Abort a `home→books` swipe and you land back on Home; the Books
   covers are never revealed, so there is nothing to observe.
2. **The observable is far narrower than the gate item implies.** Per the plan's own §9 (in its
   corrected **[F3]** form): the page whose retention is exercised is always a **mover**, and a mover
   carries an inline transform that beats the class rule on every rendered frame. In the two windows
   where such a page briefly wears `.parked` with no inline transform — finalize and hard reset — no
   frame paints, because both windows are entirely synchronous (invariant I11). So for the pages whose
   covers actually matter, **the constant that changed largely does not govern what is composited.**

**What is therefore genuinely owed is not a test but an unresolved compositing question,** stated in
§9 and unchanged by this record: both distances are entirely outside the viewport, so any interest-rect
or tile-discard heuristic keyed on **visibility** treats `-101vw` and `-300vw` identically — but one
keyed on **distance** would need a threshold between 1.01 and 3 viewports. Whether WebKit has such a
threshold is unknown here and unmeasurable on the bench. Stage 6g's `translateZ(0)` is the standing
precedent for a compositing spec argument that real iOS falsified, which is why this stays labelled
spec-derived rather than settled.

**The honest ask, which replaces the fabricated test — stated in the two fields the gate now requires,
including the admission that the gesture is not a scripted one:**

- **Gesture:** ordinary use, with one thing watched for — an **aborted swipe between two browse
  pages** (drill into a book list, begin a swipe to another browse page, release it back). ⛔ NOT a
  swipe from Home into a list: aborting that returns to Home and reveals no covers at all. There is
  no single scripted run that settles this, and that is a property of the item, not an omission.
- **Observable:** on that abort, the returning list's covers visibly **pop in / re-decode** — a
  perceptible blank-then-fill of the whole grid at once, rather than covers that are simply already
  there. If they are already there, nothing is wrong.
- **Why it exercises the property:** the covers survive an abort because the page is parked rather
  than `display:none`d; a tile-discard heuristic keyed on distance rather than visibility would drop
  the bitmaps at 3 viewports where it kept them at 1.01, and the abort is the only moment the
  difference would surface.

Absence of that report over ordinary use is **weak** evidence at best — and for the period before this
correction it is **no** evidence at all, because the user was never given a workable instruction.

**Durable lesson from this exchange, routed rather than left here:** a device-gate item must name the
exact gesture AND the observable, both derived from source, at the time it is filed. This one named a
property instead, and the gap was papered over at the moment of asking by inventing a gesture. See
[[device-gate-item-must-name-gesture-and-observable]].

## Standing rule this record exists to honour

A gate verdict is filed, not left in a conversation. And a device symptom gets the device log before a
diagnosis — the converse holds too: a device *result* gets recorded with its stated scope intact,
because the next session reads this file and not the chat.

## Status

- **Item 1: PASS** (user-reported, scope as quoted).
- **Item 2: OWED** — one observation, cheap, on any aborted swipe into a book list.
- **Plan risk R1: OPEN.**
