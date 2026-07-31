# PROBE — Now Playing's differences from the other screens

**Derived 2026-07-30. Reference version: HEAD `288504e`, build `2026-07-30.278`, tree clean.**
**Subject scope:** every axis on which `.nowplaying` differs from `#home`, `#browse` (and its
`.browsepage` peers), `#options`, and the five settings sub-screens (`#downloads`, `#general`,
`#playback`, `#buffering`, `#diagnostics`).

---

## VERDICT on the claim

The claim under test: *"the only thing unique about the NP screen is that it has its own
background."*

**FALSE — 13 other differences are load-bearing, and the background is not one of them, because the
background is not unique to Now Playing.** `background: var(--page-bg)` is declared identically by
`#options` (`css/app.css:222`) and by all five settings sub-screens (`css/app.css:787`), and
`test/page-bg-single-painter.test.js` pins exactly that set — `body::before`, `#options`,
`.nowplaying`, and the five subs — as the only legal painters of `--page-bg`. Now Playing's
background is the property it *shares* with six other screens, not the one that separates it.

---

## 1 — CSS

The whole `.nowplaying` rule is `css/app.css:502-515`. Every declaration, against its peers.

| # | Declaration | `.nowplaying` | The other screens | Mark |
|---|---|---|---|---|
| 1.1 | `position` | `fixed` (`css/app.css:506`) | `fixed` — `#home` `css:162`, `#browse` `css:185`, `#options` `css:215`, subs `css:780` | context — identical |
| 1.2 | insets | `inset: 0` (`css:506`) | `left:0; right:0; top: calc(var(--safe-top) + 51px); bottom: calc(var(--nav-h) + var(--nav-pad))` — `css:163-164`, `css:186-187`, `css:216-217`, `css:781-782` | **load-bearing** |
| 1.3 | `height` / `min-height` | `height: 100%; min-height: 100dvh` (`css:506`) — the only `dvh` unit in the file | none declare either; height comes from the inset stretch | unknown / device-owed |
| 1.4 | `z-index` | `60` (`css:506`) | `#home` `20` (`css:165`); `#browse` **declares none** (`css:184-190`, deliberate — `css:180-183`); `#options` `25` (`css:218`); subs `26` (`css:783`) | **load-bearing** |
| 1.5 | `overflow-y` | `auto` (`css:506`) | `auto` — `css:167`, `189`, `219`, `784` | context — identical |
| 1.6 | `overscroll-behavior` | `none` (`css:507`) | `contain` — `css:167`, `189`, `219`, `784` | unknown / device-owed |
| 1.7 | `-webkit-overflow-scrolling` | not declared | `touch` — `css:167`, `189`, `219`, `784` | unknown / device-owed |
| 1.8 | `display` | `flex; flex-direction: column` (`css:508`) | none declare it (block) | **load-bearing** (see 1.13) |
| 1.9 | `background` | `var(--page-bg)` (`css:511`) | `#options` `var(--page-bg)` (`css:222`); subs `var(--page-bg)` (`css:787`); `#home`/`#browse` declare none | context — **shared, not unique** |
| 1.10 | `padding` | `calc(var(--safe-top) + 14px) 20px 5px` (`css:514`) | `#home`/`#browse` `14px 16px 40px` (`css:166`, `188`); `#options`/subs `14px max(16px, calc((100% - 608px)/2)) 40px` (`css:223`, `788`) | **load-bearing** — a consequence of 1.2: the box starts at the physical top, so it must inset past the notch itself |
| 1.11 | `will-change` | not declared | only `#home` declares `transform` (`css:168`); `#browse`/`#options`/subs declare none | context — not an NP difference |
| 1.12 | content centering | none on the box; `.np-body { max-width: 460px; margin: 0 auto }` (`css:517`) | `#home`/`#browse` `max-width: 640px; margin: 0 auto` on the box (`css:166`, `188`); `#options`/subs centre via padding (`css:223`, `788`) | context — three mechanisms already exist across the set |
| 1.13 | internal flex layout | `.np-body { flex: 1; min-height: 100% }` (`css:517`) and `.np-controls { margin: auto 0 }` (`css:527`) both consume 1.8 | no peer has an equivalent | **load-bearing** |
| 1.14 | `body.has-player` companion rule | **none exists** | `#home` `css:170`, `#browse` `css:191`, `#options` `css:227`, subs `css:790-791` — each re-insets `bottom` by `+106px` | context — a consequence of 1.2, nothing to re-inset |
| 1.15 | native-scrollbar hide | **excluded** from `css:814-817` | `html, body, #home, #browse, #options` and all five subs are listed | **load-bearing** — `test/screens.test.js` asserts `!list.includes('#nowplaying')` with the message "Now Playing must keep its native scrollbar" |

`--page-bg` is `radial-gradient(140% 120% at 50% 0%, #ff2d2d 0%, var(--bg) 55%)` (`css:41`); `--bg`
is `#14171c` (`css:4`). Both stops are fully opaque — relevant to §7.

---

## 2 — DOM

- **2.1 — Now Playing is a direct child of `<body>`, a sibling of `.app`.** `index.html:154`, sitting
  between `#player` (`index.html:133`) and `#navbar` (`index.html:176`). Mark: context (see 2.4).
- **2.2 — every other screen is `div.app > section#library > div`.** `#home` `index.html:48`,
  `#browse` `62`, `#options` `67`, `#general` `80`, `#playback` `97`, `#buffering` `106`,
  `#downloads` `115`, `#diagnostics` `126`. Mark: context.
- **2.3 — Now Playing alone does not carry `class="view"`.** It carries `class="nowplaying hidden"`
  (`index.html:154`); the eight in-library screens all carry `class="view …"` (the eight lines
  above). `.view` has exactly one consumer: the two button-nav keyframe hooks `.view.nav-in-right` /
  `.view.nav-in-left` (`css:204-205`). No JavaScript reads the class (grep over `js/**`: the only
  hits are `scrollbar.js:66,68`, an unrelated local named `view`). Mark: **load-bearing** — it is
  what makes the slide-in animation inapplicable to NP, and it agrees with `Nav.viewElFor` (3.6).
- **2.4 — `.app` establishes no containing block for its fixed descendants.** Its complete rule set
  is `css:75` (`min-height`, `padding`, `max-width`, `margin`), `css:76` (`padding-bottom`) and
  `css:201` (`overflow-x: clip`). It declares no `transform`, `filter`, `backdrop-filter`,
  `will-change` or `contain` (grep over `css/app.css` for `contain:` / `filter:` returns only
  `css:239`, `290`, `375`, `480`, `565` — none on `.app`). So the eight in-library fixed screens
  resolve their containing block to the viewport exactly as NP does, and NP's position outside
  `.app` is not what lets it paint over the bars. Mark: incidental with respect to §7. *jsdom has no
  layout or paint; this is derived from the absence of the triggering declarations, not measured.*
- **2.5 — NP's rule is class-selected (`.nowplaying`, `css:502`); every other screen's is
  id-selected (`#home`, `#browse`, `#options`, and the five-id sub rule at `css:777`).** No consumer
  depends on the selector form — `Nav.overlayEl` resolves by id and NP's id is `nowplaying`
  (`js/nav.js:34-35`). Mark: incidental.

---

## 3 — JS classification

- **3.1 — `isOverlay('nowplaying')` is true.** `js/nav.js:34`:
  `v === 'options' || v === 'nowplaying' || isSub(v)`. NP sits in the same bucket as `#options` and
  the five subs. Mark: context.
- **3.2 — `SETTINGS_SUBS` excludes NP** (`js/nav.js:32`), so `isSub('nowplaying')` is false
  (`js/nav.js:33`). Mark: context.
- **3.3 — `Swipe.kindOf('nowplaying')` returns `'overlay'`** via `NAV.isOverlay` (`js/swipe.js:58-63`).
  Mark: context.
- **3.4 — `classifyTransition` treats NP identically to `#options`/subs on host projection.**
  `sourceHost = 'overlay'`, `destinationHost = 'overlay'` (`js/swipe.js:99-101`). Mark: context.
- **3.5 — `classifyTransition` emits a decoration when NP is either endpoint, and only then.**
  `js/swipe.js:108-109` produces `[{ kind: 'now-playing-pill', role: 'mover', base: 'outgoing' |
  'incoming' }]`. No other screen produces any decoration; the decorations list is empty for every
  other pair. Mark: **load-bearing**.
- **3.6 — `Nav.viewElFor('nowplaying')` returns `null`; it returns an element for every other
  screen.** `js/nav.js:39-40`. Consequence: `navTo` calls `slideInView(viewElFor(desc.v), anim)`
  (`js/app.js:144`) and `goBack` calls `slideInView(viewElFor(d.v), 'left')` (`js/app.js:151`); with
  a null element `slideInView` returns immediately (`js/nav.js:159`). Now Playing is the one screen
  that never gets a button-nav slide-in. Mark: **load-bearing**.
- **3.7 — `npOpen` is a module-level flag exported as live state.** Declared `js/nav.js:24`, set at
  `js/nav.js:47` (`npOpen = v === 'nowplaying'`), exported `js/nav.js:200`, aliased `js/app.js:111`,
  and read at `js/app.js:1758, 2201, 2334, 2336, 2374, 2464` to gate live playback re-render. The
  sibling flags `optOpen` and `subOpen` are function-local consts inside `setView`
  (`js/nav.js:48-49`) and are not observable outside it. Mark: **load-bearing**.
- **3.8 — `constructionPlanFor` and `finalizationPlanFor` treat NP exactly as any overlay.**
  `toKind === 'overlay'` → `incoming: 'real-destination'`, `renderDestination: 'none'`
  (`js/swipe.js:169`); `abortRender: 'none'` (`js/swipe.js:203`). Mark: context.

---

## 4 — Show/hide and parking

- **4.1 — all three overlay kinds skip the home/browse park-and-hide block.** `js/nav.js:56`:
  `if (!npOpen && !optOpen && !subOpen) { … }` guards the `#home.parked` toggle and the `#browse`
  `.hidden` toggle. Mark: context.
- **4.2 — going to NP leaves the settings overlays' hidden state untouched.** `js/nav.js:82`:
  `if (!npOpen) { $('options').classList.toggle(…); for (const s of SETTINGS_SUBS) … }`. Whichever
  settings overlay was showing stays mounted under NP for the back-reveal. Mark: **load-bearing**.
- **4.3 — `setView` toggles a body class for NP and for no other screen.** `js/nav.js:87`:
  `document.body.classList.toggle('np-locked', npOpen)`. Mark: **load-bearing** (its effects are §6).
- **4.4 — `applyScreen`'s NP branch skips both the nav-tab highlight and the scroll reset.**
  `js/nav.js:151`: `if (desc.v === 'nowplaying') { setView('nowplaying'); if (render)
  d.renderNowPlaying(); return; }`. Compare `#home` (`js/nav.js:140` — `setNavActive('home')` and
  `$('home').scrollTop = 0`), `#options`/subs (`js/nav.js:144-149` — `setNavActive('options')` and
  `$(desc.v).scrollTop = 0`), and browse (`js/nav.js:152-154` — `setNavActive`). Mark:
  **load-bearing**.
- **4.5 — the swipe's destination-render dispatch has an NP-only branch.** `js/app.js:534`:
  `if (dest.v === 'nowplaying') { renderNowPlaying(); document.body.classList.remove('np-locked'); }`
  against `else renderScreen(dest.v)` for options and every sub (`js/app.js:535`). Mark:
  **load-bearing**.
- **4.6 — `showAppView`'s stale-overlay sweep covers `['options', ...SETTINGS_SUBS]` and not NP.**
  `js/app.js:483`. Mark: context.
- **4.7 — `.hidden` is uniform.** `css:77` (`display: none !important`) is how every screen
  including NP is concealed (`js/nav.js:74, 83, 84, 86`). Mark: context.
- **4.8 — the transport is deliberately left in the DOM under NP.** `js/app.js:2321-2325` — the
  recorded reason is that removing it changed page height. Mark: context.

---

## 5 — Scroll model

- **5.1 — NP is its own scroll container with no scroll save and no scroll reset.** `overflow-y:
  auto` (`css:506`); grep over `js/**` finds no write to `#nowplaying`'s `scrollTop` — the only
  reference to its scroll metrics is the touchmove guard's read at `js/app.js:2938`. `js/nav.js:151`
  explicitly performs no reset. Mark: **load-bearing** (it is the only screen with neither).
- **5.2 — `#home` is its own scroller, reset to 0 on entry.** `css:167`; `js/nav.js:140`.
- **5.3 — `#browse` is its own scroller with per-page save and restore.** `css:189`;
  `js/browse.js:71` (`cur.sy = o.mount.scrollTop || 0`), `js/browse.js:228`
  (`o.mount.scrollTop = clampY(…)`).
- **5.4 — `#options` and the five subs are their own scrollers, reset to 0 on entry.** `css:219`,
  `css:784`; `js/nav.js:147`.
- **5.5 — `overscroll-behavior` differs in keyword.** NP `none` (`css:507`); every other screen
  `contain` (`css:167, 189, 219, 784`). Mark: unknown / device-owed — jsdom has no scroll chaining
  or bounce, so the practical difference between the two keywords here is not derivable from source.
- **5.6 — NP is the only screen with a JavaScript touchmove bounce guard.** `js/app.js:2936-2939`:
  `npEl.addEventListener('touchmove', e => { if (npEl.scrollHeight <= npEl.clientHeight + 1 &&
  !e.target.closest('input')) e.preventDefault(); }, { passive: false })`. `css:228-232` records
  that a `body` `position:fixed`/overflow lock was rejected in its place. Mark: **load-bearing**.
- **5.7 — NP keeps its native scrollbar; `scrollbar.js` returns `null` for it.**
  `js/scrollbar.js` `surfaceKind` matches only `#home`, `#browse`, `OVERLAY_SEL`
  (`'#options,#general,#playback,#buffering,#downloads,#diagnostics'`) and the document; everything
  else returns `null`. Same fact as 1.15, from the JS side. Mark: **load-bearing**.

---

## 6 — Decorations that exist only for Now Playing

- **6.1 — the action pill is markup hosted inside `#navbar`.** `index.html:196-202`
  (`div.np-actions` with `#npSpeedMount`, `#npInfo`, `#npAirplay`, `#npSleep`, `#npMarks`), styled
  `css:540-549`, `display: none` by default. Mark: **load-bearing**.
- **6.2 — `body.np-locked` swaps the navbar's contents.** `css:550`
  (`body.np-locked .navbar .np-actions { display: flex }`) and `css:551`
  (`body.np-locked .navbar .navbtn { display: none }`). Mark: **load-bearing**.
- **6.3 — `body.np-locked` restyles the navbar itself and raises it above NP.** `css:565`:
  `background: transparent; border-top: 0; backdrop-filter: none; z-index: 70; padding-bottom: 0`.
  70 > NP's 60. Mark: **load-bearing** (it is the mechanism of §7's navbar answer).
- **6.4 — a detached pill clone rides the NP swipe.** `.np-pill-float` `css:557-562` (z 62, fixed,
  `pointer-events: none`); built by `npPillClone()` `js/swipe.js:336-343`; attached as an
  `owned-decoration` mover `js/swipe.js:392`; swept by `Nav.resetSwipeStyles` `js/nav.js:115`.
  Mark: **load-bearing**.
- **6.5 — two of the six swipe-exclusion selectors exist only for NP.** `js/app.js:457`:
  `target.closest('#player, input, .navbtn, .np-controls, .np-actions, .carousel')`. Mark:
  **load-bearing**.
- **6.6 — NP is the only screen that synthesizes a forward-swipe destination from an empty forward
  stack.** `js/app.js:463`: `else if (from && from.v === 'nowplaying') { dir = 'fwd'; dest =
  filesDescForCurrent(); newNav = true; }`, ahead of the general `else if (fwdStack.length)` at
  `js/app.js:464`. `filesDescForCurrent` is `js/app.js:185-189`. Mark: **load-bearing**.
- **6.7 — the outgoing-NP unlock.** `js/app.js:571`: when NP is the swipe source, the decorations
  loop removes `np-locked` so the real nav buttons reappear as the pill slides out. Mark:
  **load-bearing**.

---

## 7 — What, today, paints over the fixed bars when NP is open

The three fixed bars: `.topbar` `z-index: 30` (`css:236`), `.player` `z-index: 35` (`css:291`),
`.navbar` `z-index: 40` (`css:372`).

**7.1 — The topbar and the transport are covered by the `.nowplaying` box itself, through three
co-required properties.** Removing any one leaves them visible:

- **geometry** — `inset: 0` (`css:506`) makes NP's box span the whole viewport, so it overlaps both
  bars' boxes;
- **stacking** — `z-index: 60` (`css:506`) paints it above 30 and 35;
- **opacity of the fill** — `background: var(--page-bg)` (`css:511`), whose two stops `#ff2d2d`
  (`css:41`) and `var(--bg)` = `#14171c` (`css:4`) are both fully opaque, so what covers them is
  opaque rather than see-through.

`body.np-locked` plays no part in covering these two bars; its rules (`css:550`, `551`, `565`) all
target `.navbar`.

**7.2 — The navbar is not covered at all.** `body.np-locked .navbar` (`css:565`) raises it to
`z-index: 70`, above NP's 60, and strips its chrome — transparent background, no `border-top`, no
`backdrop-filter`, `padding-bottom: 0`. It stays the topmost layer on purpose, because it is the
host element for NP's own action pill (6.1, 6.2).

**7.3 — Would a screen with the ordinary inset geometry plus a background declaration cover them?
No.** Two independent reasons, either sufficient on its own:

1. **Geometry.** The ordinary geometry is `top: calc(var(--safe-top) + 51px)` — the topbar's bottom
   edge — and `bottom: calc(var(--nav-h) + var(--nav-pad))`, or `+ 106px` more under
   `body.has-player` (`css:163-164`, `186-187`, `216-217`, `227`, `781-782`, `790-791`). The
   topbar's box lies entirely above that top edge and the transport's box entirely below that bottom
   edge. A background paints only inside its own box, so no background value of any color reaches
   either bar.
2. **Stacking.** `#options` is `z-index: 25` (`css:218`) and the subs `26` (`css:783`), both below
   the topbar's 30 and the transport's 35. Even given an overlapping box, the bars would paint on
   top.

**7.4 — This is already demonstrated by the shipped app.** `#options` and the five sub-screens carry
the same `background: var(--page-bg)` declaration NP carries (`css:222`, `css:787`) together with
the ordinary inset geometry, and they do not cover the topbar or the transport.

---

## 8 — Summary of marks

**Load-bearing differences (13):** 1.2 box geometry; 1.4 z-index; 1.8 + 1.13 the flex-column
internal layout; 1.10 self-applied safe-top padding; 1.15 / 5.7 the retained native scrollbar;
2.3 the absent `view` class; 3.5 the now-playing-pill decoration; 3.6 `viewElFor` → null;
3.7 the exported `npOpen` live-state flag; 4.2 the settings overlays left mounted underneath;
4.4 no nav-highlight and no scroll reset; 4.5 the NP-only render branch; 5.1 no scroll save and no
scroll reset; 5.6 the touchmove bounce guard; 6.1–6.7 the navbar takeover, the pill, the pill clone,
the swipe exclusions, the synthesized forward target and the outgoing unlock.

**Context / not a difference:** 1.1, 1.5, 1.9 (the background — shared with six screens), 1.11,
1.12, 1.14, 2.1, 2.2, 3.1–3.4, 3.8, 4.1, 4.6, 4.7, 4.8, 5.2–5.4.

**Incidental (deletable without effect):** 2.4 the DOM position outside `.app` with respect to
painting; 2.5 the class-selected rule.

**Unknown / device-owed — jsdom has no layout and no paint:** 1.3 whether `height: 100%` /
`min-height: 100dvh` are still required at HEAD; 1.6 / 5.5 the practical difference between
`overscroll-behavior: none` and `contain`; 1.7 the effect of the absent
`-webkit-overflow-scrolling: touch`.
