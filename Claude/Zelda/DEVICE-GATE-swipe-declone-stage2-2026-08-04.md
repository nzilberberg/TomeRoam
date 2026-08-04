# Device gate — swipe de-clone Stage 2 (`PLAN-swipe-declone.md` §13 step 10b)

Filed by Zelda, 2026-08-04. **Status: OWED — never run.** Confirmed by absence: no device verdict
for this campaign exists in `Claude/Zelda/` (only the A1b and parked-page ones).

## Why this is being surfaced NOW, ahead of the subtraction pass

`PLAN-swipe-declone-stage2-subtraction.md` is filed and names this as its **risk 3**: if this gate
fails, the cheapest repairs are *exactly the branches that pass deletes*. Subtracting first converts a
cheap revert into a re-derivation. So this runs first.

⚠️ **A Stage 1 device pass is not evidence about Stage 2.** Stage 2 touches the element all four
transitions use as a mover. That sentence is the plan's, and it is why "it worked before" does not
carry.

**Build under test:** `2026-08-03.306` (current HEAD ships it). Stage 2's code has been live since
before the parked-page fix; this gate is confirming the *shipped* form, not a new build.

---

## Item 1 — `browse→browse`, both directions, commit AND abort

**Source:** `js/app.js:198` (`EDGE = 44`, `THRESH = 0.42`, `FLICK_V = 0.4`), `js/app.js:496`
(`fromLeft`/`fromRight` — a swipe arms only within 44px of an edge).

- **Gesture:** from a drilled-in browse page (Books → tap a book → its chapter list), swipe **back**
  from the far **left** edge, and **forward** from the far **right** edge. Do each twice: once
  dragging past halfway and releasing (**commit**), once stopping short of halfway, holding still a
  beat, then lifting (**abort** — do not flick; a fast release commits regardless of distance). Run
  the set on a **long** list and on a **short** one.
- **Observable:** the slide is clean, one page on screen at a time, no second page's rows showing
  through. On **commit** you land on the new page; **on abort you return to the page you started on**
  — landing anywhere else is the failure.

## Item 2 — the outgoing page must not jump at drag start

**Source:** `js/app.js:496-500` (arming), `Claude/Plans/PLAN-swipe-declone.md` §5.3.6 (the named
observation).

- **Gesture:** begin a `browse→browse` drag and watch the **first moment** the page starts to move.
- **Observable:** the page you are leaving slides smoothly from where it sits. The failure is a
  **jump** — it flicks off-screen or snaps to a different position at the instant the drag starts,
  before any smooth movement.

## Item 3 — browse scroll position survives a trip to Home

**Source:** `js/browse.js:274-275` (`applyScrollY` writes `page.scrollTop`), `js/browse.js:266`
(Invariant D4 — a page keeps its own `scrollTop`). This is §18 round 2 F15.

- **Gesture:** scroll a browse list well down, tap **Home** in the navbar, then return to that same
  browse page.
- **Observable:** the list is where you left it. Jumping back to the top is the failure.

## Item 4 — the A–Z strip during a drag

**Source:** `js/app.js:489` (the strip is deliberately NOT excluded from the forward-swipe surface),
`js/browse.js:481` (the strip is per-page), `js/app.js:1235` (it is excluded from pull-to-refresh).

- **Gesture:** on a list showing the A–Z letter strip down the right edge, perform a `browse→browse`
  drag and a `browse→home` drag, watching the strip throughout.
- **Observable:** the strip rides with its own page and re-anchors on landing. Failures: it stays
  stuck to the screen while the page slides away, it is clipped or cut off mid-drag, or two strips
  appear at once.

## Item 5 — a virtualized list

**Source:** `js/virtuallist.js:33` — `FULL_RENDER_MAX = 600`; a list longer than 600 items switches
to windowed rendering, a different code path from every short list above.

- **Gesture:** open a browse list with **more than 600 items** (Authors, or Books if your library is
  large enough), then repeat item 1's four gestures on it.
- **Observable:** same as item 1 — plus rows must be present as the page slides. Blank or grey rows
  in the moving page, or a page that arrives empty and fills in afterwards, is the failure.

## Item 6 — re-confirm the four cross-screen transitions

- **Gesture:** `home→browse`, `browse→home`, `browse→overlay` (open Options over a browse page) and
  `overlay→browse`, each **committed once and aborted once**, using the same edge-and-release
  technique as item 1.
- **Observable:** as item 1 — one screen at a time, and an abort returns you where you began.
- **Source:** `js/app.js:496-500`; these four are re-confirmed because Stage 2 changed the element
  all of them use as a mover.

---

## Status

**OWED — all six items.** Nothing here has been run on a device. The subtraction pass is filed and
waits on this deliberately, per its own risk 3.
