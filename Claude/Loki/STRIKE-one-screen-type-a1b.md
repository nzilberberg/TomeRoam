# Strike — Stage A1b of PLAN-one-screen-type (NP parks the page beneath it) · 2026-08-03

Commissioned against `Claude/Plans/PLAN-one-screen-type.md` §5.3 and the shipped build
`Claude/Brunel/one-screen-type-stageA1b-build.md` (BUILD_GREEN, build `2026-07-31.290`), at HEAD
`cef1093` — struck AFTER shipping, with the adversary/code-review/coverage gates being cleared
retroactively. Blind to the three Charpy casebooks (`PLAN-one-screen-type-A1b-charpy*.md`) per the
commission; the plan §5.3, the build log, `js/` source, and the prior strike's bench recipe
(`Claude/Loki/parked-page-rides-home-strike-2026-08-02.md`) were the handed artifact.

## The promise (verbatim, from the commission; plan §5.3 step 3 / probe §9.1)

> On every path, the destination screen is already mounted at the instant `#nowplaying` is hidden —
> so parking the screen beneath NP can never leave the user revealed to an unmounted or wrong
> screen. The stated proof: `hidden` is *added* to `#nowplaying` in exactly one place in `js/`, at
> `js/nav.js:81`, and three lines earlier the same synchronous `setView` body clears `hidden` from
> the destination (`js/nav.js:78-80`).

(Line numbers are the plan's vintage `02b388f`; at HEAD `cef1093` the same statements are
`js/nav.js:71` and `js/nav.js:52/69/70`.)

Restated as behavior: after any operation that removes `#nowplaying` from the screen, exactly one
destination screen is un-hidden (or `#home` un-parked), with no reachable interleaving — gesture
commit, gesture abort, button nav, filmstrip window, supersession, sign-out — that leaves zero
screens or a wrong screen; and no sequence of aborted NP gestures accumulates un-hidden screens
(the §5.3.1 defect this stage retires).

## VERDICT: HELD_STONE

Both enumerations were verified exhaustively at source, the synchrony claim was verified against
every re-entry point, and the behavior was executed in a real Blink engine at 375×812 against the
live tree — including the plan's one deliberately uncovered edge and a plane the plan's cost
census never named (scroll state across the new `display:none`). The instrument was proven able
to fire before any zero was trusted. No fracture was found.

## Phase 2 — the exclusions read

- **§9 edge 5** (supersession while NP is current) — deliberately uncovered by the suite, claimed
  benign. **Executed here** (run E5): the claim holds.
- **Plan §15 R-H / build log device-owed set** — iOS cover re-decode on NP close to Books, restore
  flash, repeated-half-swipe cost. iOS-specific bitmap behavior; unprosecutable on a Blink bench;
  remains the user's step-9 device gate. Not claimed either way.
- **Step-6f flick band** (125–340ms) — pre-existing, unchanged by A1b, out of this commission.
- **"NP stays unique"** — ratified user decision; not a strike surface.

## Phase 3 — the grain: the two enumerations, verified at source (HEAD `cef1093`)

**Enumeration 1 — "exactly one place in `js/` adds `hidden` to `#nowplaying`." HOLDS, exhaustively.**

- Every `hidden` classList writer in `js/` (vendor included) enumerated by grep. Writers that ADD
  `hidden` to screen elements: `js/nav.js:69,70,71` (setView), `js/app.js:69` (signin/library
  only), `js/app.js:522` (showAppView sweep — options + the five subs only), `js/app.js:535`
  (`#browse` only). `overlayFilmstrip` (`js/nav.js:198`) and `renderDestination`
  (`js/app.js:589`) only ever *remove*. **The only statement that can add `hidden` to
  `#nowplaying` is `js/nav.js:71`.**
- No `className` assignment, no `setAttribute('class'…)`, no `style.display` write, and no
  `el.hidden =` property write targets `#nowplaying` anywhere in `js/`. The token `nowplaying`
  appears only in `app.js` (nav intents, gesture dest, transport wiring, the touchmove bounce
  guard at `:2842`), `nav.js`, `swipe.js` (pure classifier, no DOM), and `nowplaying-screen.js:1`
  (a comment). `js/vendor/eruda.js` never references it.
- Consequence verified: `#nowplaying` can become hidden only through `setView(v)` with
  `v !== 'nowplaying'`.

**Enumeration 2 — the synchrony claim. HOLDS.** Between the destination un-hide
(`:52` home un-park / `:69` browse / `:70` settings loop) and the NP toggle (`:71`) there is no
`await`, no rAF, no timer, no event dispatch, and no early return on any branch. The one call-out
in the body, `d.browseWillHide()` (`:60` → `Browse.deactivate()`, `js/browse.js:371`), captures a
scroll anchor and returns — it cannot re-enter `setView`. `#home` is never `hidden` by anything
(parked only — every writer greped; `js/app.js:2675` states the same), so the home destination
needs only the un-park at `:52`, which precedes `:71`.

**Path census (all setView reachers traced):** `applyScreen`'s four branches; `navTo`/`goBack`;
gesture commit/abort finalize (`js/app.js:1134/1140` — synchronous `resetSwipeStyles` + `setView`
inside one task, mover styles cleared at `:791` first, no paint between); begin()'s supersession
hard reset (`:482`); the popstate re-anchor (`:1203`); signOut (`:2389`, `Browse.reset()` before
`setView('home')` — destination is home, mounted). Gesture paths mount the destination inside
`start()` (renderDestination) synchronously before the first transform write, so no paintable
frame exists with NP translated and the destination unmounted.

## Phase 4 — the execution (real Blink, 375×812, live tree at `cef1093`)

**Bench.** `node tools/serve.mjs --port 8899`; disposable root `identity` file (probeConn 200 →
localhost adopted as PMS; all API 404 = safe 4xx); library seeded via `Store.cacheBooks/
cacheAuthors/cacheTracks` (26 books, 12 tracks). Playback ctx obtained through the real UI (Books
→ book → chapter tap); the stream 404s so **no audio ever exists** — the transport and NP still
arm. NOTE for the next bench: cached tracks must carry the *normalized* shape (`partKey` directly
on the track, `js/plex.js:488-499`) or `playTrack` throws at `streamUrl` — and the files page
must be re-entered after re-seeding (the rendered page holds the stale list).

**Instrument** (`STRIKE-one-screen-type-a1b.probe.js` beside this record): `LK.state()` counts
un-hidden screens across all nine (`#home` counted by park state); `LK.dragCtl()` drives fully
synchronous TouchEvents with a stationary spin-tail so `vx` reads 0 and only `prog` decides
commit/abort. (First attempt without the tail produced `vx > FLICK_V` from an 8ms timestamp gap
and silently committed an intended abort — run 1 was re-run.)

**Fire drill.** Hand-constructed accumulation (un-hide `#browse` + `#options` under `#home`):
counter read **3**. Restored, read 1. The zeros below are therefore evidence.

| Run | Construction | Result |
|---|---|---|
| open | NP opened from files / from Home / from Books (transport tap) | **count 1** `[nowplaying]`, home parked, browse hidden, np-locked — A1b's park-and-hide live on glass |
| AB1 | NP→back abort (dest files; mid-drag un-hides `#browse`), prog 0.24, vx 0 | mid-drag count 2 (the deliberate live-filmstrip pair) → at rest **count 1** `[nowplaying]`, np-locked restored |
| AB2 | NP→chapter-list fwd abort (right edge) | same: transient 2 → at rest **count 1** |
| AB3 | NP→back-to-HOME abort, held mid-drag | `#home` un-parked at `translateX(-225px)`, NP at `+150` — rects `[-225,150)`+`[150,525)`, **gap 0**, viewport fully covered; at rest **count 1**, home re-parked |
| C1 | NP→back commit to files; NP fwd→files commit | landed **count 1** `[browse]`, np-locked off; stack sane (subsequent navs correct) |
| E5 | **The uncovered edge executed**: full fwd commit, second touchstart inside the settle glide → begin() hard reset with `currentDesc()==='nowplaying'` | after reset **count 1** `[nowplaying]`; stale finalize a no-op (rest stable). Benign, as the plan claims |
| FW | **The second residue**: options→general filmstrip live (count 2), transport tapped inside the ~340ms window | NP open **count 1** — both panes hidden at NP entry; after the pending reconcile fires: still **count 1** (idempotent, as §5.3.6 claims) |
| SCROLL | **The novel plane** (below) | preserved exactly |

**The novel plane — scroll state across the new `display:none`, executed and closed.** The
retired probe mark §4.2's reason ("stays mounted under NP for the back-reveal") was superseded on
the *visibility* half; a mounted screen also keeps scroll state, and the plan's cost census calls
decoded covers "the only real cost found" — scroll appears nowhere in it, and classic (≤600)
pages have **no restore mechanism at all** (Invariant D4: the element's own `scrollTop` is the
only copy). Executed:

- Engine primitive: `.browsepage` at `scrollTop` 900 → ancestor `#browse` `display:none` → reads
  **0 while hidden** → re-shown → **900 restored**. Blink preserves a scroller's offset across an
  ancestor `display:none` round trip.
- Full path: Books@900 → chapter tap → back-commit to Books (**900**) → NP open (browse hidden,
  reads 0) → NP back-commit → Books **900**. The mid-drag `showAppView → Browse.render →
  showPage → positionOnEnter` writes nothing (derived-only rule) and does not clobber it.

Not a fracture — filed because the plan never asked the question, and because it leaves one named
residual: **this bench proves Blink; the device is WebKit.** If WebKit dropped the offset the
defect would predate A1b (browse→home takes the same seam and is device-exercised daily), but the
NP round trip is the app's most frequent, so the step-9 device gate should include: *scroll Books
deep, open NP, close it — you must come back where you were.*

## Lesser planes, un-prosecuted (one line each, for the reviewers)

1. E5's hard reset swallows a *visually committed* swipe (the glide had landed browse; reset
   restores NP) — pre-existing supersession semantics, byte-identical pre-A1b (NP's z60 covered
   the un-reconciled stack then); not A1b's.
2. `d.browseWillHide()` → `Browse.deactivate()` now runs on **every** NP open from Browse — the
   app's most frequent round trip gains an anchor capture; cost unmeasured here (R-H q3 class).
3. `showAppView`'s sweep (`js/app.js:522`) spares `d.from.v` using the *drag handle* `d`, null in
   the settle window — the same two-lifetimes pattern §5.4a names; today unreachable with a
   settings `from` and a browse destination in that window (the sweep runs only from
   renderDestination, drag-live), listed so the pattern's third instance is not met from this side.
4. The promise's "exactly one place" is true of HEAD; nothing gates it (no test asserts
   single-writer-ness). A future second writer greens the suite. Gate-rot class, Mendeleev's.

## Bench facts (instrument traps, confirming and extending the prior strike's)

- A hidden pane freezes timers/rAF: an in-page `await sleep()` then wedges the *tool call*, not
  just the app — split drag and at-rest sampling into separate tool calls and let inter-call time
  be the settle window (340ms fires even throttled).
- Synchronous TouchEvent dispatch can still produce a **flick** commit: `vx` updates on any >8ms
  inter-move gap, and tool-driven moves can exceed 0.4 px/ms. End every intended abort with
  stationary moves ≥8ms apart so `vx` decays to 0.
- Screenshots need the pane displayed (compositing); `getBoundingClientRect` + class state is the
  full oracle and needs neither.

## Phase 6 — reconciliation

The commission barred the review casebooks, so reconciliation is against the plan and build log
only: nothing found contradicts them, and the two claims the suite could not carry — edge 5
benign, reconcile-after-NP-button idempotent — held under execution exactly as §5.3.4/§5.3.6
derive. The one question neither document asked (scroll across the new hide) resolves in the
design's favor on this engine and narrows to a one-line device check. Where I would strike next
with a bigger budget: the WebKit half of the scroll plane, and a perf probe on `deactivate()`
firing per NP open against a 600+ row virtualized Books list.

## Reproduction

`STRIKE-one-screen-type-a1b.probe.js` beside this record: seed, instrument, and the battery in
order with observed numbers. Requires `node tools/serve.mjs --port 8899`, a Blink engine at
375×812, and the disposable root `identity` file (created for the strike, deleted with it).

— Loki, 2026-08-03. Two enumerations, a synchrony claim, and one uncovered edge, all struck where
they were proudest; the stone held on every plane, including one nobody had thought to promise.
