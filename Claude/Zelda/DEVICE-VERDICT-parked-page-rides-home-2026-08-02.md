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

### Item 2 — iOS cover-bitmap retention at the new distance. **STILL OWED. NOT ANSWERED.**

The whole reason `.browsepage.parked` exists is that `display:none` makes iOS drop decoded cover
bitmaps, so an aborted swipe re-decodes every cover at once and the list visibly pops back in
(`css/app.css`, the park rule's own comment). The fix moved the park from 1.01 viewports away to 3.

⛔ **The user was asked to watch for this and did not report on it. Silence is not a pass.** They
reported on what they went looking for — the swipe garbage — and this is a different observation on a
different gesture (abort a swipe into a book list; watch whether the covers pop).

The bench cannot close it. The plan's §4 argument is that retention is carried by the inline-transform
path plus a no-paint-between ordering (invariant I11) rather than by the park constant, so a distance
change cannot regress it *by construction* — but that is a **spec argument about compositing, and this
project has had exactly that kind of argument falsified on real iOS before** (stage 6g's
`translateZ(0)`, which was "spec-identical" to `will-change: transform` and flashed on device anyway).

## Standing rule this record exists to honour

A gate verdict is filed, not left in a conversation. And a device symptom gets the device log before a
diagnosis — the converse holds too: a device *result* gets recorded with its stated scope intact,
because the next session reads this file and not the chat.

## Status

- **Item 1: PASS** (user-reported, scope as quoted).
- **Item 2: OWED** — one observation, cheap, on any aborted swipe into a book list.
- **Plan risk R1: OPEN.**
