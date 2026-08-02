# Measurement — a parked browse page rides on top of Home for the whole forward swipe

Taken by Zelda, 2026-08-02, driving the **real deployed app** (`https://nzilberberg.github.io/TomeRoam/`,
build `2026-08-01.303`, signed in to the user's real Plex server) in a real Blink engine at a 375×812
mobile viewport. **This is a measurement record, not a derivation** — Zelda ran the instrument and
recorded the numbers. The mechanism's account belongs to the planner; the fix belongs to the builder.

## The defect being measured

The user's report, repeatedly reproduced on their phone: *"forward swipe from home had garbage"* —
a chapter/track list composited on top of Home for the duration of a forward `home→books` drag.
Clarified by the user: **the symptom is the garbage content, not a stuck gesture.** The yellow bar in
their screenshot is the currently-playing track from the chapter list.

The user's 100% repro: *refresh → Now Playing → swipe forward to the track list → Home button →
Books button → swipe back to Home → swipe forward to Books.*

## Why six earlier hypotheses missed it

Every prior probe sampled **at rest**, and at rest the state is clean — `parked: 0`, one page
visible, correct screen. The corruption exists only **during** the drag. The instrument had to sample
per-`touchmove`.

## The measurement — before

Sampling every `.browsepage`'s screen-x, its park state, and `#home`/`#browse` transforms on every
touchmove of the final forward swipe:

| step | `#home` x | `#browse` x | PARKED page x | Δ(parked − home) |
|---|---|---|---|---|
| at rest on Home | 0 | 0 | (not shown) | — |
| touchstart | 0 | 0 | (not shown) | — |
| move 1/7 | −46 | 329 | **−50** | −4 |
| move 2/7 | −92 | 283 | **−96** | −4 |
| move 3/7 | −138 | 237 | **−142** | −4 |
| move 4/7 | −185 | 190 | **−189** | −4 |
| move 5/7 | −231 | 144 | **−235** | −4 |
| move 6/7 | −277 | 98 | **−281** | −4 |
| move 7/7 | −323 | 52 | **−327** | −4 |
| settled | −379 | 0 | (not shown) | — |

The parked page (`"‹Twelve Months (Un…"` — the chapter list) tracks Home to within 4px for the
**entire** drag, and the overlap detector fired at every single move sample.

## The mechanism the numbers show

`.browsepage.parked` parks by `transform: translateX(-101vw)` (`css/app.css:118-121`). A
`.browsepage` is `position: absolute; inset: 0` inside `#browse` (`css/app.css:95-99`), so that
transform is **relative to `#browse`, not to the viewport**. It puts the page off-screen only while
`#browse` is itself at rest.

During a forward `home→books` drag both views are real movers: `#home → translateX(t)` and
`#browse → translateX(w + t)` (`js/app.js:651`). So a parked page renders at

    browseX − 1.01w  =  (homeX + w) − 1.01w  =  homeX − 0.01w

— i.e. **exactly on top of Home, by construction, for the whole gesture.** The 4px is `1vw = 3.75px`.

Contrast `#home.parked` (`css/app.css:158-163`), which carries `position: fixed`, so its identical
`-101vw` **is** viewport-relative and is not affected.

**Precondition:** a cached, non-destination browse page must exist — which is why the user's repro
needs the track list visited first, and why a cold app does not show it.

## The measurement — after (candidate fix, injected live, same instrument, same repro)

One property changed, nothing else: `.browsepage.parked { transform: translateX(-300vw) }`.

| step | `#home` x | `#browse` x | PARKED page x | overlap detector |
|---|---|---|---|---|
| move 1/7 | −46 | 329 | **−796** | none |
| move 4/7 | −185 | 190 | **−935** | none |
| move 7/7 | −323 | 52 | **−1073** | none |
| settled | −379 | 0 | (not shown) | none |

The destination still rendered and settled correctly (Books active at 329 → 0, settling at 0).

Rationale for the distance: `#browse`'s own inline transform ranges over `[−w, +w]` and a page is
`w` wide, so a park offset must exceed `2w` to be unreachable; `3w` leaves margin.

## What this measurement does NOT settle — for the planner

1. **Whether the distance change preserves the cover-retention property.** The whole reason parking
   exists is that `display:none` makes iOS drop decoded cover bitmaps (`css/app.css:101-107`).
   Both `-101vw` and `-300vw` are off-viewport and neither is `display:none`, so the property should
   be unchanged — but that is a **spec argument, and this project has had a spec argument about
   compositing falsified on real iOS before** (stage 6g's `translateZ(0)`). Device-owed.
2. **Whether a distance change is the right fix at all.** Alternatives exist and were not evaluated:
   clipping at `#browse`, or not parking pages that are not participants in the gesture. Choosing
   among them is the planner's call, not this record's.
3. **INVARIANT P compatibility** looks preserved (still transform-only, still no `!important`, still
   declares no position or insets) — but confirming it is the planner's and reviewer's job.
4. **Whether this is the whole of the reported garbage**, or one of several contributors.

## Standing discipline this measurement was run under

Prove the check can fire before trusting a negative. The overlap detector was proven able to fire
(it did, at every move sample, in the before-run) before its silence in the after-run was read as
evidence.

## Instrument trap re-encountered

Mid-run, the Browser pane was hidden; `document.hidden === true` throttles `setTimeout` to ~1/s and
blocks compositing entirely (screenshots time out). The capture still completed — `getBoundingClientRect`
is unaffected by tab visibility — but it ran ~20× slower. Already recorded as trap #4 in the swipe saga.
