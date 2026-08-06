# Test design — synthetic 600+ browse↔browse swipe bench · 2026-08-05

Type: test-design artifact (an instrument, not a suite cell)
Commission: close, or narrow, `Claude/Zelda/DEVICE-GATE-swipe-declone-stage2-2026-08-04.md`
**item 5**, which the user deferred on 2026-08-04 with *"I dont have a list over 600 items so cant
test. defer"*.
HEAD at authoring: `bc2c7f6`. No file under `js/` or `css/` was modified.

## 1. What item 5 asks for, restated as measurable facts

Item 5's own text (gesture and observable, recorded at the gate) is item 1's four browse↔browse
gestures — back-commit, back-abort, forward-commit, forward-abort — run on a list past
`FULL_RENDER_MAX`, with one extra observable: *"rows must be present as the page slides. Blank or
grey rows in the moving page, or a page that arrives empty and fills in afterwards, is the failure."*

Verified at source, not taken from the commission:

- `js/virtuallist.js:33` — `const FULL_RENDER_MAX = 600;`, `:34` `OVERSCAN_FACTOR = 1.5`.
  `:45` `usesVirtual = (n) => (forceVirtual && n > 0) || n > FULL_RENDER_MAX`.
- `js/virtuallist.js:38-41` — `pb_forceVirtual`, read from localStorage at load; `js/debug.js:690-702`
  owns the Options → Diagnostics → "Windowed browse" toggle that writes it.
- `js/app.js:197` — `EDGE = 44, FLICK_V = 0.4, THRESH = 0.42`.
- `js/app.js:580` — `d.vx` is recomputed **only** when `performance.now() > d.lastT + 8`.
- `js/app.js:593-595` — the commit decision is `!flickNo && (flickGo || prog > THRESH)`.

Turned into cells:

| Cell | Claim | Oracle |
|---|---|---|
| C1 ROWS_WHILE_SLIDING | At every sampled instant of the drag, any page whose list **content box** intersects the viewport has ≥1 row box also intersecting it | feature — execute the drag, read `getBoundingClientRect` |
| C2 REVEAL_NOT_EMPTY | The landed page had rows on the viewport at the last sample before the finger lifted, not only after the settle | feature |
| C3 SKELETON_WHILE_SLIDING | No page slides onto the viewport showing `.skrow` placeholder rows | feature |
| C4 LANDING (abort) | An aborted drag ends on the page the drag started on, read from the app at drag start | feature |
| C5 LANDING (commit) | A committed drag ends on a different page, and exactly one page is composited on the viewport at rest | feature |
| C6 no page left `.parked` at rest | | feature |
| C7 anti-vacuity | The exercised controller's model really holds > `FULL_RENDER_MAX` items and `realizedCount` is far below it | structural |
| C8 armed | Some page moved during the drag | structural |

C7 and C8 are not observables of the product. They are the two ways this bench could report a
pass while measuring nothing, so they are asserted alongside the cells rather than assumed.

## 2. Red-first does not apply here; a positive control replaces it

This bench is authored against code that already ships and is device-confirmed on every path the
user's library can reach. There is no unimplemented behaviour for it to fail against, so it cannot
be red-before-green and no such claim is made. What stands in its place is an executed **fire
drill**: `VB.fireDrill()` starts a real drag and then calls `deactivate()` on every windowed
controller mid-gesture, which drops every realized row and keeps the group shells — exactly what a
lost row-hold would leave behind. The drill is run **before** the battery, on the real repro state,
and the run is scored a failure if it does not fire.

Three further checks are known to fire because they did, on real runs of earlier revisions of this
same bench:

- C1 fired 4 times per drag while it was scoped to the page box instead of the list content box.
- C4/C5 fired 3 times (`C2/C3/C5-deep`) while the abort drags were registering as flicks.
- C8 fired once (`B6-fwd-abort`) on a gesture that never armed and would otherwise have scored ok.

## 3. Volume, not the flag

The user has already rejected `pb_forceVirtual` as a stand-in for real data. The bench does not use
it to produce its result: the fixture is 900 books / 900 authors / a 700-book author page, so
`usesVirtual()` returns true on `itemCount > FULL_RENDER_MAX` with the flag written `'0'`, which is
the branch a device with a large library would take. The run asserts both that the flag is off
(`usesVirtual(10) === false`) and that the largest model exercised exceeds 600.

The flag is kept as `--force-virtual` for one purpose: a differential, to answer whether it behaves
like real volume. Measured 2026-08-05 — it does, on these cells (§5).

## 4. The instrument

- `tools/bench-virtual-swipe.mjs` — the driver. Zero-dependency: node 22's built-in `WebSocket`
  speaks CDP directly to a headless Chrome it launches on a throwaway profile, at 375×812 with
  touch emulation. It starts `tools/serve.mjs` if the port is free, seeds the fixture, injects the
  instrument, runs the battery, prints the report and exits non-zero on any violation.
- `tools/bench-virtual-swipe.page.js` — the in-page instrument, `window.VB`.

Run it:

```
export PATH="/c/Users/nzilb/tools/node-dist:$PATH"     # node is not on PATH
node tools/bench-virtual-swipe.mjs                      # the volume run
node tools/bench-virtual-swipe.mjs --headful            # watch it
node tools/bench-virtual-swipe.mjs --books 100 --authors 100 --author-books 80   # ≤600 control
node tools/bench-virtual-swipe.mjs --force-virtual --books 100 --authors 100 --author-books 80
node tools/bench-virtual-swipe.mjs --json               # machine-readable
```

Fixture facts. Signed-in state is a fabricated non-credential `pb_token`; `pb_server` is pinned to
localhost; a disposable root file `identity` answers `probeConn`'s `GET /identity` with 200 so the
bench never contacts plex.tv (every other API call 404s — a 4xx, never the 401→signOut path). The
library is seeded through `Store.cacheBooks/cacheAuthors/cacheTracks` and
`Store.kvSet('authorBooks:a1', …)`. `tools/serve.mjs` answers `/photo/:/transcode`, so every row's
cover really loads.

Three routes, six gestures each, all four gesture kinds in both directions:

- **A** — Books (900, windowed) ⇄ a book's chapter list (12 rows, classic).
- **B** — Authors (900, windowed) ⇄ a 700-book author page (windowed). A windowed page on **both**
  ends of the browse↔browse swipe.
- **C** — the same, with the windowed Books page scrolled to 60% of its height, so the realized
  window is a slice out of the middle of the model rather than its first rows.

## 5. Measured results — 2026-08-05, HEAD `bc2c7f6`

| Run | Gestures | Fire drill | Largest model | Result |
|---|---|---|---|---|
| Volume, flag off (900/900/700) | 18 | fired | 900 | **PASS — 0 violations** |
| Flag on, small library (100/100/80) | 18 | fired | 100 | PASS — 0 violations |
| ≤600 control, flag off (100/100/80) | 18 | could not fire (nothing windowed to break) | 0 | 18 VACUOUS + drill-did-not-fire, **and 0 behavioural violations** |

Numbers from the volume run, per gesture: the fewest rows any page with its list on the viewport
showed at any instant of the slide was **7** (routes A and B at the top of the list), **6** (the
author page), **9** (route C, scrolled deep). Never 0. The landed page carried 19 realized rows of
a 900 model at the top and 31 of 900 when deep — the window tracks the scroll rather than the
model. Every abort landed on its source page; every commit landed elsewhere; no page was left
`.parked`; exactly one page was composited on the viewport at rest in all 18; the settle timeline
was live in all 18.

The ≤600 control is the differential the deletion pass wants: the same 18 gestures on the classic
branch produced the same clean behaviour, so nothing measured here is specific to the windowed
path. It also demonstrates the bench's pass is not free — below the threshold it refuses to report
one, because C7 fails on every gesture and the fire drill has no controller to break.

## 6. What it witnesses, and what it does not

Witnesses:

- The `> 600` branch is really taken, by volume, and the realized window is a small slice of a
  900-item model.
- Row boxes are laid out on the viewport at every sampled instant of every gesture, at the top of
  the list and 60% into it.
- Commit and abort land where item 1 says they must, with one page on the viewport at rest.
- No placeholder rows and no empty-then-fill reveal on the landed page.

Does **not** witness:

- **Paint.** It reads DOM geometry. A row box laid out on the viewport is not proof the row was
  painted, that its cover had decoded, or that the compositor showed one frame rather than two.
  "Blank or grey" is answered only in the DOM sense (no rows / placeholder rows).
- **iOS.** Desktop Blink under device-metrics emulation is not WebKit. Everything the campaign
  records about iOS dropping decoded covers on `display:none`, and iOS granting a native scroll
  when a touchmove goes non-cancelable, is out of reach here.
- **Real touch.** Synthetic `TouchEvent`s at the document handler, not the platform's input stack.
- **Real timing.** Drags are dispatched synchronously with a deliberate hold before release
  (see §7), so `d.vx` is pinned at 0 and the commit decision is `prog > THRESH` alone. The bench
  therefore says nothing about flick handling, and nothing about frame pacing.
- **The A–Z strip** (item 4) and **scroll survival across Home** (item 3) — not modelled.

## 7. Findings about the instrument, recorded so they are not rediscovered

1. **`.skrow` carries the class `book`** (`js/browse.js:92`). A `.book` row count therefore reports
   a page full of grey shimmer bars as a page full of rows — the exact failure item 5 names, scored
   as a pass. Skeletons are excluded from the row count and asserted against separately.
2. **`.browselist` has `padding-right: 34px`** (`css/app.css:460`) for the A–Z gutter, and the page
   is inset. The page's rightmost ~50px holds no row by construction, so demanding rows wherever
   the *page* overlaps the viewport reports a violation on the first frames of every correct
   back-drag — measured, 4 per drag. The check is scoped to the list's **content** box.
3. **Sampling perturbed the gesture.** `d.vx` updates only once a move lands >8ms after the last
   one (`js/app.js:580`), and reading every page's rect after every move forces a full layout. On
   the deep-scrolled page that pushed a step past 8ms, so a 12px synthetic step read as 1.3 px/ms —
   over `FLICK_V = 0.4` — and a 25%-of-width drag **committed as a flick**. It failed three abort
   gestures in route C while routes A and B passed. The fix is the device gate's own wording: hold
   still a beat before lifting. Four zero-displacement moves spaced 30ms apart drive `vx` to 0.
4. **The reconnect pass clears the browse page cache under a live drag.** With no Plex behind the
   fixture, `js/net.js`'s backoff poll keeps flipping `plexReachable`, and each unreachable→reachable
   flip runs `Browse.clearCache()` (`js/app.js:3033`). Observed as a destination page sliding in as
   a 9-row skeleton with no controller. This is real app behaviour with a dead server, not a
   windowed-path defect. The bench sets `pb_autoretry='0'` (the app's own opt-out,
   `js/net.js:151`), and additionally detects a `.browsepage` node replaced mid-gesture, marks that
   sample CONTAMINATED, and retries once rather than scoring it either way.
5. **A gesture that never arms scores as a clean abort.** Observed once (`B6-fwd-abort`, nothing
   moved across the whole drag, reported ok). Arming is now checked before anything else is
   believed.
6. **The first run left a file in the repo root.** The run was piped through `head`; the EPIPE
   killed the process before its cleanup, and the disposable `identity` file sat untracked while
   every later run saw it as pre-existing and left it alone. It is now written with a sentinel
   string and removed by content from `process.on('exit')` and the three signals, so only the
   bench's own file is deleted and it is deleted however the process ends.

## 8. Disposition of device gate item 5

**Narrowed, not closed — the closing call is the assistant's, not this seat's.** What the bench
now covers is the DOM-and-geometry half of item 5's observable, on a real fixture above the
threshold, with a positive control. What remains device-owed is the half a bench cannot reach:
paint, iOS WebKit, and real touch. Whoever updates
`Claude/Zelda/DEVICE-GATE-swipe-declone-stage2-2026-08-04.md` should record item 5 as
**bench-covered for row presence, landing and reveal; still device-owed for paint on iOS** — and
should not record it as PASS on this evidence alone, for the same reason the gate itself warns
against inferring it from "the device gate passed".

No build bump: `tools/` is excluded from the shipping-bump gate by its own registered rule
(`test/shipping-change-bumps.test.js`, "tests and tooling never require a bump"). Suite at the time
of filing: 884 tests, 0 fail, 1 skipped. `node tools/hooks/run-checks.mjs`: PASS, all 13 checks.
