# Loki Strike — Stage 6g reveal promise (`#home { transform: translateZ(0) }`)

**Date:** 2026-07-27
**Commissioned target:** the Stage 6g base-rule promise, reveal-scoped.
**Artifact set read:** css/app.css, js/app.js, js/nav.js, js/swipe.js, js/browse.js,
js/nowplaying-screen.js, index.html, test/dom-fixture.js. Blind to the plan review and
rationale surfaces, per commission.

Verdict: **HELD_STONE**

---

## The promise (verbatim)

> With the base rule `#home { transform: translateZ(0) }` in place, NO un-park / REVEAL
> transition (a swipe gesture removing `.parked` from `#home`) leaves `#home`'s COMPUTED
> transform resolving to `none` at any frame of the reveal. The base `translateZ(0)` holds
> across the parked→un-parked cascade, so `#home` never demotes on a reveal.

Restated as testable behavior: for every reachable swipe-gesture path that removes
`.parked` from `#home`, at no style recalc during or after the removal does
`getComputedStyle(#home).transform` resolve to `none`. Pre-declared out of scope: the
`nav-in` slide (`navTo`/`goBack` → `slideInView(#home)` → `.nav-in-left/right`, keyframes
ending `to { transform: none }`, app.css:123-126) — a navigation animation, not a swipe
reveal.

## Ways the promise could break, and what was found at each

### 1. An inline transform write of `none` on the reveal path

An inline `transform: none` beats the stylesheet base rule. Swept every
`style.transform` write in js/ (app.js:555, 576, 615, 775, 1284, 2916-2917; nav.js:107,
168-177; swipe.js:258; scrollbar.js:83). Every write is either a concrete
`translateX/Y(...)` value or the empty string `''`. An inline `''` removes the inline
declaration and the cascade falls back to the base rule. No code path writes the literal
`none` to any element's inline transform.

The real `#home` is additionally never a swipe mover, so the drag/settle writes cannot
touch it on a reveal: for any X→home transition the outgoing mover is the real source
element (`real-source` → `appViewEl(from.v)` → `#browse` for every browse-family source
— swipe.js:140-141, nav.js:36) and the incoming mover is the `home-snapshot` clone
(swipe.js:144, 270-282), while the real `#home` stays `.parked` under the pane for the
whole gesture. For home→X the outgoing is an `app-ghost` clone (swipe.js:141), not the
real `#home`. The only inline writes `#home` ever receives are the `''` clears
(nav.js:107; app.js:775 touches movers only).

### 2. A competing stylesheet rule resolving `#home` to `transform: none`

index.html:20 links exactly one stylesheet (css/app.css); index.html:48 puts no inline
style on `#home`. Every `transform`-carrying rule in app.css that can select `#home`:

- `#home.parked` — `translateX(-101vw)` (app.css:103-108); specificity 1-1-0, wins while
  parked, gone with the class.
- the `#home` base rule (the Stage 6g rule, replacing the diagnostic at app.css:115);
  specificity 1-0-0, no later `#home` rule exists to beat it by order.
- `.view.nav-in-right/left` (app.css:125-126) — `#home` carries `class="view"`
  (index.html:48), and CSS animations override static declarations regardless of
  specificity, so these ARE the one mechanism that can make `#home`'s computed transform
  `none`. They are applied by exactly one function, `slideInView` (nav.js:145-152).
  See plane 4.
- The only media query touching any of this is `prefers-reduced-motion` (app.css:127),
  which disables the nav-in animation — it removes the `none` mechanism, never adds one.
- The `.210` diagnostic block (app.css:772-804) forces `animation: none` on cover art
  only; no transform effect on `#home`.

### 3. A frame gap inside the un-park itself

Every site that removes `.parked` from `#home`:

- nav.js:57 (`setView`) — the only site reachable from a swipe. Reached via
  `applyScreen`, which first runs `resetSwipeStyles` (nav.js:120 → 107, clearing any
  inline transform to `''`) and then `setView`, in one synchronous task. All four swipe
  finalize/recovery paths call it directly: commit→home held reveal (app.js:1171-1176),
  plain commit (app.js:1207), abort (app.js:1212), and begin()'s hard reset
  (app.js:442). No paint can occur between the inline clear, the class removal, and the
  end of the task, so the computed transform transitions `translateX(-101vw)` →
  `translateZ(0)` at a single style recalc. `none` is never an intermediate value of
  that cascade change.
- app.js:482 (`showAppView` home branch) — unreachable from a swipe: `showAppView` is
  invoked only via `env.renderDestination` with host `'browse-host'` (app.js:513), and
  the construction plan emits `renderDestination: 'browse-host'` only for browse-family
  destinations (swipe.js:145); a home destination gets `'none'` with a snapshot
  (swipe.js:144), so this branch never fires mid-gesture.
- app.js:2452 (`doSignOut` → `setView('home')`) — a button path, not a swipe.
- swipe.js:272 removes the class from a detached clone, never from `#home`.

### 4. The carve-out seam — can a swipe reveal ride `nav-in`? (the commissioned plane)

If any swipe gesture that un-parks `#home` routed through `slideInView`, the animation's
`to { transform: none }` (fill-mode both) would hold `none` on a genuine reveal and the
promise's scoping would collapse. Struck at three points:

- Direct: `slideInView`'s only callers are `navTo` (app.js:144) and `goBack`
  (app.js:151) — button navigation. The swipe's own commit/abort paths reconcile via
  `applyScreen` only (app.js:1171-1176, 1207, 1212); the gesture's stack effects are
  applied inline in finalize (app.js:776-779), never by calling `navTo`/`goBack`. The
  bottom-nav home tab (`goHome`, app.js:155) passes `anim = null` — no slide even there.
- Indirect: the one chain from a swipe into `goBack` is NowPlayingScreen.render's guard
  `if (!ctx) { d.goBack(); return; }` (nowplaying-screen.js:28), reachable mid-drag via
  `env.renderDestination` for an incoming Now-Playing pane (app.js:515). It cascades
  goBack→goBack and can land home with `slideInView`. Reachability requires
  `ctx === null` while `nowplaying` sits in `navStack`. ctx is nulled in exactly two
  places: `doSignOut` (app.js:2451 — which itself un-parks `#home` via `setView('home')`
  at 2452 on the button path and leaves the user on the sign-in screen), and
  `restoreLast`'s track-gone branch (app.js:2038 — which runs only after `enterApp` has
  already reset `navStack = [{v:'home'}]` at app.js:1346). Neither interleaving can put
  a null ctx together with a `nowplaying` stack entry, so the chain is unreachable. The
  popstate handler (app.js:1272) reconciles via `applyScreen` with no slide.
- Conclusion: no swipe gesture can apply `nav-in` to a parked `#home`. The carve-out's
  boundary ("nav-in is button navigation only") is true of the current source.

### 5. Executed probe

`STRIKE-swipe-stage6g-r1.probe.js` (filed beside this record): boots the real js/nav.js
against the real index.html (test/dom-fixture.js appDom), parks `#home` as a browse view
leaves it, plants a hostile inline `translateX(371px)` (worse than any state a swipe can
actually leave, per plane 1), then runs the exact reveal reconcile every finalize path
performs — `Nav.applyScreen({ v: 'home' }, { render: false })` — while recording every
inline-style mutation on `#home`.

Observed: `parked-after-reveal = false`, `inline-transform-after-reveal = ""`,
`inline-none-ever-written = false`. The un-park leaves the stylesheet in control, which
with the Stage 6g base rule resolves `#home` to `translateZ(0)`, not `none`. HELD.

## Residual doubt (unprosecuted; suspicions, not findings)

- **Stale nav-in overlap.** A button `goBack` to home starts a 260ms `nav-in-left`
  animation on `#home`; if a swipe armed and finalized before that animation's
  `animationend` removed the class, the animation's fill would hold `none` across the
  swipe's un-park. Timing trace says unreachable: the abort settle's transition is
  200ms and the no-transition fallback finalizes at 340ms (app.js:1256), and the tap →
  edge-grab → release sequence cannot compress the tap-to-finalize interval under
  260ms. The `none` frames would in any case come from the carved-out animation
  mechanism. Not executable in this environment; noted for the on-device pass.
- **jsdom cannot compute cascaded transforms.** The cascade half of this stone rests on
  the enumerated stylesheet sweep (plane 2), not on execution. The bigger-budget strike
  is an on-device frame capture of `getComputedStyle(#home).transform` across a
  books→home commit and a home→books abort.
- **Single-stylesheet assumption.** The base rule and `.parked` live in the same file,
  so no cross-stylesheet load-order gap exists. If the base rule ever ships in a second
  stylesheet, the parked→un-parked cascade gains a load-order seam and this promise
  should be re-struck.

## Where the promise is strongest

The design is one-directional in the right way: nothing in the codebase ever writes the
literal `none` to a transform, inline or stylesheet, outside the two nav-in keyframes —
so the only demote mechanism is the one the promise already names and fences. The reveal
funnel is narrow (one un-park site reachable from a swipe, always behind the same
synchronous reconcile), which is what made this stone hold.
