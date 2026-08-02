# Strike — PLAN-parked-page-rides-home §12 promise · 2026-08-02

Commissioned against `Claude/Plans/PLAN-parked-page-rides-home.md`, RATIFIED at HEAD `f65c4da`,
BEFORE the plan is built (working tree ships `translateX(-101vw)`; the candidate `-300vw` was
applied to the live CSSOM rule for the strike — same rule, no `!important`, cascade preserved).
Blind to the review casebooks per the commission; the plan's own §11 summary tables were part of
the handed artifact.

## The promise (verbatim, plan §12)

> A parked `.browsepage` cannot compose onto the viewport, for any displacement `#browse` can
> take, because `300vw > 100vw + (L + W)` — and both terms of that floor are bounded by
> construction.

Restated as behavior: with the park offset at `-300vw`, no `.browsepage` carrying `.parked` and
positioned by the class rule (no inline transform) may have a border-box rect intersecting
`[0, V)` horizontally, non-degenerately, at any instant of any reachable interleaving — at a
constant viewport width (the plan's stated precondition, §4 F5).

## VERDICT: HELD_STONE

Within its stated precondition the promise survived every plane struck. Both enumerations were
verified at source and then executed at their worst cases in a real Blink engine, with the
instrument proven able to fire first. The one fracture executed is the precondition the plan
itself admits (F5) — quantified below, filed as confirmation of the admitted clause, not as a
finding. One wording caveat and four un-prosecuted lesser planes are named at the end.

## Phase 2 — the exclusions read

- Constant viewport width (§4 F5) — admitted failure; executed and quantified below (run F).
- Cover retention on real iOS (R2) — device-owed, out of this bench's reach, not claimed.
- R7 (button nav during a live hold) — a named present path, covered by the floor; executed (runs C/C3).
- §8 dim 5 "a declaration's one failure mode is not being present as written" — deployment/cache
  staleness, outside the promise.

## Phase 3 — the grain: both enumerations verified at source

**Term 1 — every writer of a transform on `#browse` (claim: max |displacement| = 100vw).**
Verified complete at `f65c4da`:

1. `js/app.js:630` — start(): `base ∈ {0, ±d.w}` (`:558`, `:602`), `d.w = innerWidth` (`:505`).
2. `js/app.js:651` — move(): `base + t`, `t` sign-locked to direction (`:648`) and clamped to
   `[−d.w, +d.w]` (`:649`). Sign-locking means base and t oppose: |base+t| ≤ w.
3. `js/app.js:690` — settle rAF: writes `0` or `±w`; identity-guarded (`cur !== session`);
   settle transition `cubic-bezier(.2,.7,.2,1)` (`:676`) has y ∈ [0,1] — no overshoot.
4. `js/app.js:791` / `js/nav.js:116` — clears only.
5. `css/app.css:241-244` — `navInRight`/`navInLeft` keyframes on `.view` (`#browse` is a
   `.view`, `index.html:62`; applied via `slideInView`, `js/nav.js:157`, called with
   `viewElFor(v)` → `#browse` at `js/app.js:144/151`): `translateX(±100%)` of `#browse`'s own
   border box ≤ 100vw; bezier `(.22,.61,.36,1)` no overshoot; fill `both` terminal value `none`.
6. `js/nav.js:199-208` — `overlayFilmstrip` writes only `overlayEl(v)` (options/subs/NP), never
   `#browse`. Verified by reading the function, not the plan's claim.
7. No WAAPI `.animate()` anywhere in first-party `js/`; no other `transform` writer (grep over
   `js/` excluding vendor: the only `style.transform` writers are the sites above plus the
   pull-to-refresh spinner, the info-sheet panel, and the scrollbar thumb — none touch `#browse`
   or a `.browsepage`).

**Term 2 — every property that can widen `#browse`'s box (claim: L + W ≤ 100vw).**
Rules matching `#browse` in the whole tree: `css/app.css:224-229` (`position:fixed; left:0;
right:0; max-width:640px; margin:0 auto` — no width/min-width/padding/border), `:230`
(`body.has-player` — bottom only), `:858-862` (scrollbar suppression). Nothing else. The
`.browsepage` is `position:absolute; inset:0` (`css:95-99`) — its border box is exactly
`#browse`'s padding box; `* { box-sizing: border-box }` and no border on `#browse` make padding
box = border box. The A–Z strip (`position:fixed`, z24) is appended to the PAGE on every path
(`js/browse.js:707`, `:734`, `:482`), so a parked page's transform re-contains it and carries it
off with the page — no fixed descendant escapes the park.

**Ancestor chain** (a transformed ancestor would re-container the fixed `#browse`): the chain is
`#browse → #library → .app → body → html` (`index.html:24-62`). None carries transform, filter,
perspective, will-change, or contain at HEAD. NOTE: the plan's round-1 statement names `.app` as
"the only ancestor between `#browse` and the root" — **`#library` is omitted** (it carries only
`padding-top: 46px`, `css:284`, so the bound holds; the enumeration's statement is incomplete,
the set it bounds is not). Filed as lesser plane 2.

## Phase 4 — the execution

**Bench.** The real app served by the repo's own `tools/serve.mjs` on `http://localhost:8899`
(a server from a prior session was already bound to the port, serving this same tree live from
disk — reused). Real Blink engine (Claude browser pane), 375×812. Signed-in state = fixture:
`pb_token` set to a fabricated non-credential string; `pb_server` pinned to
`[{uri:'http://localhost:8899', local:true}]` so `_connect()` (`js/plex.js:234-256`) never
contacts plex.tv; a disposable root file named `identity` answered `probeConn`'s
`GET /identity` with a 200, making localhost the PMS base (all API calls then 404 — 4xx, never
the 401→signOut path). Library = 26 authors / 26 books / 12 tracks seeded through
`Store.cacheBooks/cacheAuthors/cacheTracks` (IndexedDB), the route `tools/serve.mjs` documents
as supported. Warm-cache repro state built through real UI paths only: Books tab → book row
(files page) → Home tab → Books tab → back-swipe commit → Home with `fwdStack=[books]` and the
chapter-list page cached.

**Instrument.** `window.LK` (filed as `parked-page-rides-home-strike-2026-08-02.probe.js`
beside this record): synthetic `TouchEvent`s dispatched at the document-level `touchstart`
handler (`js/app.js:1194`), fully synchronous per-move sampling of every `.browsepage`'s
`getBoundingClientRect()` — a HIT is `parked ∧ width>0 ∧ height>0 ∧ right>0 ∧ left<V`;
`CLASS_GOVERNED` additionally requires no inline transform (position governed by the park
offset itself). Anti-vacuity: every counted run must sample ≥1 non-degenerate parked page.

**Fire drill (the instrument proven able to fire).** At the shipped `-101vw`, the repro's
forward home→books drag: **7/7 move samples HIT, all CLASS_GOVERNED**, parked chapter list at
left −4 / right +371 (Δ = −4px — exactly the measurement record's per-sample figure, 1vw at
375px). The silence that follows is therefore evidence.

**The battery at `-300vw`** (CSSOM rule edited in place; other three declarations byte-identical):

| Run | Construction | Result |
|---|---|---|
| A | The user's repro: forward home→books drag, 7 moves, live per-move motion confirmed (`#browse` inline 327→40px, computed matrix tracking it) | Parked page right −423 → −710, mirroring the measurement's after-run. **0 hits**, parkedSampled 8. |
| B(i) | browse→home BACK over-drag, finger driven to x=1400 (3.7× viewport) | `#browse` inline clamps at exactly +375 (=w). **Zero `.parked` pages at every sample** — invariant I10 witnessed live on the outgoing-side transition. |
| B(ii) | home→books FORWARD over-drag to x=−900, then return and abort | `#browse` clamps at 0 (base+t never past either bound). Parked rights −400…−750. **0 hits.** |
| C | R7: commit forward home→books, navbar tap INSIDE the settle window (`holdRows` still true) | Both cached pages parked simultaneously, class-governed at right −750; new authors page at 0. **0 hits**; at rest no page left `.parked` (I4 lifetime clean). |
| C3 | R7 maximal: settle-window ROW drill (passes an anim) → `nav-in-right` lands on `#browse` and the frozen bench holds it at its `from` frame, `translateX(100%)` = the keyframe writer's maximum, sustained — with two class-governed parked pages | Parked rights exactly −375 (= browseX 375 + W 375 − 1125). **0 class-governed hits.** Also produced the designed parked-MOVER case: the browse→browse outgoing page wearing `.parked` with an inline transform, on-viewport at right +70 — detected, correctly non-class-governed (Invariant P live at −300vw: the inline write still beats the class rule). |
| F | The admitted precondition, executed: landscape 812×375, forward drag held at `#browse` = +800px inline (px, captured pre-shrink), parked page at right −910 (L=86, W=640 — the centred L>0 case, arithmetic exact) → viewport resized to 375×812 mid-gesture | **HIT, CLASS_GOVERNED: parked page left −325 / right +50** — a 50px strip of the parked chapter list on the viewport while the gesture is live. Predicted by the law: right = w_start + V_now − 3·V_now = 812+375−1125 = +62 at full base (+50 at the held +800). |

Destination-settle (I6) held throughout: after every run the landed page sat at 0 with the
correct page shown and all others `display:none`.

**Run F's blast radius (the admitted clause, quantified).** Re-entry requires
`w_start > 2·V_now` — a better-than-2× viewport-width shrink inside the ≲1s gesture+settle
window (on the target hardware: a landscape→portrait rotation mid-swipe). Worst overlap is
`(w_start + V_now) − 3·V_now` px — 62px at 812→375 — versus ~808px at the shipped `-101vw`
under the same rotation. The plan's F5 clause states exactly this; nothing here is new beyond
the executed numbers. Not a finding; the commission named it a starting point.

## Wording caveat (for whoever writes the CSS comment)

The §12 sentence taken hyper-literally has a **designed** counterexample the plan itself
documents as Invariant P: during a browse→browse drag the outgoing mover wears `.parked` while
fully on the viewport, positioned by its inline per-frame transform (executed in run C3: right
+70, inline present). The promise is true of pages *positioned by the park offset*; any
restatement of it — the shipped CSS comment above the rule especially — should say "composed by
the park offset" or "carrying no inline transform", or the comment will assert something the
next browse→browse drag visibly falsifies.

## Lesser planes, un-prosecuted (one line each, for the reviewers)

1. **PARKOUTOFREACH parses "the `#browse` rule"** — a *second* rule matching `#browse` added
   later (media query, body-class variant) carrying `width`/`min-width` would widen the box
   with the cell green; cheap hardening: assert exactly one `#browse` rule exists, or scan all
   matching rules. Gate-rot, not a present defect.
2. **The ancestor enumeration omits `#library`** (`index.html:36`, between `.app` and
   `#browse`) — inert today (padding only), but the plan's "only ancestor" statement is false
   as written and the CSS comment should not inherit it.
3. **`animation-fill-mode: both` + a lost `animationend`** leaves `nav-in-*` holding
   `transform` over every inline write (bench-observed under a frozen timeline; a hidden-tab
   or interrupted animation could produce it in the field) — it can freeze the swipe visually,
   but its displacement is bounded at ±100% so it cannot break the floor; swipe-saga material,
   not this promise.
4. **iOS pinch-zoom / visual-viewport divergence** — a cousin of the F5 precondition;
   `maximum-scale=1` is pinned (`index.html:8`); unprosecutable on this bench, listed so it is
   not mistaken for unconsidered.

## Bench facts (instrument traps, for the next real-engine session)

- A hidden browser pane freezes CSS animation/transition timelines and rAF entirely, and
  throttles timers to ~1s. Consequences met: `transitionend`/`animationend` never fire (a
  stuck `nav-in-right` overrode all gesture transforms — the cascade fact, animations beat
  inline styles, is what made the first drill samples constant); settle glides never move.
  `getBoundingClientRect` + fully synchronous event dispatch is the reliable oracle (confirms
  the measurement record's trap #4, and sharpens it: not just slower — timelines *stop*).
- A tool-call timeout mid-`await` abandons an in-flight async driver whose later dispatches
  wedge the app's gesture state (`finishing` stranded true, every subsequent `begin()` refused).
  Bench contamination, not a product path — reload rather than diagnose product from it.
- The `/identity` 200 trick keeps a fabricated-token bench entirely off plex.tv (the 401→
  `signOut()` path is the thing to avoid; localhost 404s are safely non-retried 4xx).

## Phase 6 — reconciliation

The single executed fracture lands in a clause the plan already carries as an admitted
precondition (F5) — a scope decision that was surfaced, not a reasoning error; this strike adds
only the executed numbers. The two enumeration gaps found (the `#library` omission; the
one-rule parse scope of PARKOUTOFREACH) are record- and gate-design-level, in the same
reachability class as the plan's own F9/F12/F13 history: complete-looking statements about sets,
wrong at the statement level while the bounded quantity survives. Nothing novel broke the floor.
The floor's strength showed exactly where the plan derives it: it takes max |displacement|, so
every ordering and interleaving struck (mid-settle nav, mid-drag nav, sustained worst-case
keyframe, over-drag) collapsed to the same bounded arithmetic.

## Reproduction

`parked-page-rides-home-strike-2026-08-02.probe.js` beside this record: the instrument, the
bench seed, and the battery in order, with observed numbers in comments. Requires
`node tools/serve.mjs --port 8899`, a Blink engine at 375×812, and the disposable root
`identity` file (created for the strike, deleted with it).

— Loki, 2026-08-02. The stone held. The one crack in it is the one the mason chiselled on the
label, and I can now tell him it is 50px wide.
