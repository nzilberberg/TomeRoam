# Device gate — swipe de-clone Stage 2 (`PLAN-swipe-declone.md` §13 step 10b)

---

## ⭐ STEP 7 RE-CONFIRM AFTER THE SUBTRACTION — 2026-08-05, build `2026-08-05.2`

Run again after the subtraction pass deleted twelve items of dead machinery from `js/app.js` and
`js/nav.js`. This is the **re-confirm**, distinct from the 2026-08-04 pass below which cleared the
de-clone itself. A deletion pass is checked for what **stopped** working, not for anything new.

> *"1-4 pass. 6 passes. I dont have a list over 600 items so cant test. defer"* — the user.

- **Items 1, 2, 3, 4: PASS** — browse↔browse commit and abort on long and short lists; no jump at
  drag start; scroll surviving a trip to Home; the A–Z strip through both drag kinds.
- **Item 6: PASS** — all four cross-screen transitions, committed and aborted.
- **Item 5: DEFERRED — NOT TESTED, and not a pass.** The user has no library list exceeding
  `FULL_RENDER_MAX = 600` (`js/virtuallist.js:33`), so the windowed-rendering path has no fixture on
  their device. ⛔ Do not record this as cleared, and do not let a later reader infer it from "the
  device gate passed": past 600 items the app renders through a **different code path**, and that
  path is the one this item exists to exercise.

**Consequence, stated so it is not rediscovered.** The subtraction is device-confirmed on every path
the user's library can reach. The virtualized path is confirmed only by the suite and by
`test/browse-virtual.test.js` — jsdom, therefore no layout and no paint. Closing item 5 needs either
a library that crosses the threshold or a bench with a synthetic one. The second is cheap and is the
better answer, because it does not depend on the user's collection growing.

**Gesture / Observable / Source for item 5 are unchanged** — they are recorded at item 5 below and
remain runnable the moment a qualifying list exists.

---

Filed by Zelda, 2026-08-04. **Status: PASS — all six items, run on build `2026-08-03.306`.**

> *"All six pass."* — the user, 2026-08-04.

**Step 10b is DISCHARGED.** This was the campaign's only unrun device gate, and its absence was the
subtraction plan's risk 3: had it failed, the cheapest repairs would have been exactly the branches
that pass deletes. It did not fail, so the subtraction is unblocked and no branch is being kept as
insurance against an unrun gate.

**What this covers, and its ceiling.** Six items, each with a derived gesture and a distinguishable
failure: `browse→browse` commit and abort in both directions on long and short lists; no jump at drag
start; scroll surviving a trip to Home; the A–Z strip through two drag kinds; a list past
`FULL_RENDER_MAX = 600`; and the four cross-screen transitions re-confirmed. It is a human
observation pass — it rules out failures large enough to see, which is what a compositing and
gesture gate can rule out, and no more.

**Separately reported by the user in the same message, and NOT covered here:** long-standing issues
with the letter pickers (the A–Z strip), explicitly stated as **pre-existing and not caused by any
recent work**, minor, and deferred by the user until the current campaign is finished. Item 4 above
passed, so whatever those are, they are not the drag-time behaviour this gate exercises. Captured on
the board so the thread is not lost; **not** folded into this campaign.

---

## The original filing (retained — the items as issued)

**Was: OWED — never run.** Confirmed by absence: no device verdict for this campaign existed in
`Claude/Zelda/` (only the A1b and parked-page ones).

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

**PASS — all six items**, user-run on build `2026-08-03.306`, 2026-08-04.

Step 10b is discharged and the subtraction pass is unblocked.
