# Loki Strike — Stage 6f, round 1: the no-transform-on-the-real-view promise

**Date:** 2026-07-27
**Commission:** Stage 6f (pre-build) — `Swipe.constructionPlanFor` (js/swipe.js:135-136) changes so
in-flow→overlay transitions build an owned `app-ghost` outgoing pane instead of borrowing the real
`#browse`/`#home` as the mover.
**Blind:** the plan review for 6f was not read. The readable set was the promise, js/swipe.js,
js/app.js (gesture machinery), js/nav.js, css/app.css, index.html.

Verdict: **HELD_STONE**

---

## 1 — The promise (verbatim)

> On EVERY reachable in-flow→overlay gesture (every source∈{browse,home} × destination∈the seven
> overlay kinds, every drag position, both directions, NP-decorated members included), NO code path
> writes a CSS transform (style.transform / translate / translateZ / will-change promotion) onto the
> REAL in-flow view (#browse or #home). The real view is never a mover on these transitions.

Restated as testable behavior: after the 6f change, for all 35 members
({books, authors, authorBooks, files, home} × {options, nowplaying, general, playback, buffering,
downloads, diagnostics}), at every phase of a gesture (build, park, drag at any t, settle commit,
settle abort, finalize), `#browse` and `#home` carry no inline transform/will-change written by any
swipe code path and are absent from the session's mover set.

## 2 — The exclusions checked (Ask Frigg)

- The promise excludes browse→browse and →home transitions — those still borrow/transform real
  elements by design. Checked that no in-flow→overlay member can silently fall into those branches:
  the classification is `toKind` keyed off the one membership source (`Nav.isOverlay`, js/nav.js:34),
  and all seven overlay kinds are members (options, nowplaying, and SETTINGS_SUBS =
  general/playback/buffering/downloads/diagnostics, js/nav.js:32). No hole. Executed in the probe
  (assertion 1, all 35 members classify `toKind==='overlay'`).
- The promise covers gesture code paths, not standing stylesheet rules — see residual 2/3.

## 3 — The grain: the complete transform-writer inventory

Every writer of a transform/will-change in the app was enumerated (grep over js/ and css/):

| Writer | Target | Reachable on in-flow→overlay? |
|---|---|---|
| app.js:555 (start park), :576 (move), :615 (settle rAF), :775 (finalize wipe) | `d.movers` / `cur.movers` only | Yes — the ONLY gesture-time writers; all iterate the mover set |
| nav.js:107 `resetSwipeStyles` | real elements, writes `''` (clear) | Yes — clears only; cannot promote a layer |
| nav.js:168-177 `overlayFilmstrip` | `overlayEl(fromV)/overlayEl(toV)` — overlay elements by construction | No — button-nav (openSub/closeSub) only |
| nav.js:145-151 via `slideInView` | animation class on a view | No — button-nav (navTo/goBack) only |
| swipe.js:253 `ghostApp` | the CLONE (`clone.style.transform`) | Yes — clone only; original never written (probe-verified) |
| swipe.js:238 `ghostWrap` will-change | the owned pane | Yes — owned pane, not the real view |
| app.js:1284 (pull-refresh), :2916 (sheet), scrollbar.js:83 (thumb) | #ptr / sheet panel / scrollbar thumb | Not the real views |

So the promise reduces to: on these transitions the real view never enters the mover set, and the
build never writes to the original. Both are properties of `constructionPlanFor` +
`buildConstruction`, which are executable today.

## 4 — The strike (instrument + execution)

**Instrument:** `Claude/Loki/probe-swipe-stage6f-r1.js` (run from the repo root:
`node Claude/Loki/probe-swipe-stage6f-r1.js`). It loads js/swipe.js with the hypothesized 6f change
applied in-memory (the one decision line becomes
`: ((c.toKind === 'browse' || c.toKind === 'overlay') ? 'app-ghost' : 'real-source');` — the repo
file is untouched), drives it through the REAL js/nav.js membership and the REAL
`paneBuilders`/`buildConstruction` machinery under jsdom for all 35 members with an instrumented
env, then replays the four production transform-write loops (app.js 555/576/615/775) verbatim over
the mapped mover set — both directions, a seven-point drag sweep, commit and abort — asserting after
every phase that `#browse`/`#home`/`.app` carry no inline transform/will-change. It also asserts:
`env.sourceEl` is never called (the real source is never resolved into a mover), the outgoing mover
is a `.nav-ghost` owned pane that does not CONTAIN the real view (cloned, not moved), the incoming
mover is the real overlay element, and the NP-decorated members carry a pill CLONE, never the real
pill.

**Predicted by the promise:** 0 failures. **Predicted by the fracture:** at least one member/phase
with a transform on the real view.

**Observed:** `35 members driven; 2455 assertions; 0 failures.` The stone held.

**Baseline (the same instrument, un-patched repo code):** every member fractures — pre-6f,
books→options builds `outgoing='real-source'`, the real `#browse` enters the mover set and carries
`translateX(390px)`/`translateX(-390px)`/`translateX(0px)` through drag and settle. That is the
flaw 6f retires, demonstrated by the identical instrument, so the probe is proven able to detect the
fracture it hunts (it is not vacuously green).

## 5 — Planes struck that did not fracture (studied, one line each)

- **Mid-drag reclassification:** `d.dest`/`d.dir` are fixed at `begin()` (app.js:459-468); drag `t`
  is direction-clamped (app.js:573) — no path rebuilds the construction mid-gesture.
- **Stale settle rAF onto a successor:** app.js:614 (`cur !== session`) and finalize's app.js:1242
  guard; and post-6f these sessions' movers contain no real view, so even a stale fire cannot reach
  one on these transitions.
- **Supersession residue:** mid-drag hard reset runs `disposeOwnedPanes` + `resetSwipeStyles`
  (app.js:440-441 — clears only); a settling pane-OWNING session cannot be superseded at all
  (begin()'s gate, app.js:383, rejects while `finishing` unless pane-less — and post-6f every
  in-flow→overlay session owns a pane).
- **NP decoration:** the pill mover is a detached clone (`npPillClone`, swipe.js:280-287);
  the incoming-NP body-class change (`np-locked`) toggles no transform on the real views.
- **Home source special-casing:** none exists — `home` reaches the same `app-ghost` branch;
  `home-snapshot` is destination-side (`toKind==='home'`) only. Probe covers all 7 home-source members.
- **Ghost build side-effects:** `ghostApp` writes scroll/animation state onto the clone only;
  probe asserts the originals are style-clean post-build and the wrap does not contain them.
- **Finalize renders:** in-flow→overlay commits/aborts take the no-hold path (app.js:1197-1214) with
  `abortRender==='none'` — `applyScreen`/`setView` never swaps the in-flow views for additive
  overlays (nav.js:56) and writes no transforms.

## 6 — Residual doubt (named, not prosecuted)

1. **The instrument replays the four write loops; it does not boot the full app.js IIFE** (the 6f
   change cannot be injected into the closed-over production `start()` without editing the repo).
   The loops were copied verbatim from app.js 555/576/615/775 as of this commit. If the 6f build
   changes start()/settle beyond the classification line, this strike does not cover that delta —
   re-strike against the built artifact if the build touches app.js movers.
2. **`resetSwipeStyles` (nav.js:107) still writes `el.style.transform = ''` onto the real views** at
   every finalize/nav. A clear, not a transform: with no inline transform ever set, it is a no-op
   and cannot demote a layer that was never promoted. If the promise is read as "never touches
   `style.transform` at all," this line touches it.
3. **`#home.parked` (css/app.css:103-108) carries a standing `transform: translateX(-101vw)` +
   `will-change: transform`** on the real `#home` during every browse-source gesture. A stylesheet
   state rule, not a gesture-path write; pre-existing and outside 6f's blast, but it means "the real
   #home carries no transform during a browse→overlay gesture" is not literally true — it carries
   its parked transform the whole time.
4. **A concurrent button-nav mid-gesture** (`navTo`→`slideInView`) can put a transform ANIMATION
   class on `#browse` while an in-flow→overlay drag is live. Attributable to the button navigation's
   own transition, unchanged by 6f.
5. **The hypothesized diff:** this strike rendered "in-flow→overlay ⇒ app-ghost" as the
   `|| c.toKind === 'overlay'` variant of the one decision line. The built change must be that (or
   equivalent); a build that special-cases individual overlay kinds re-opens the membership hole the
   probe closed via `Nav.isOverlay`.

**Observation for the reviewers (not a promise break):** post-6f, in-flow→overlay finalize takes the
immediate `dropPanes()` path (app.js:1197-1198) — a full-viewport composited ghost destroyed in one
frame over the real view, the layer-teardown mechanism the flash saga suspects. The promise (no
transform on the real view) holds; whether the flash motivation is fully served by this slice is a
separate question for the plan's own gates.

## 7 — Reconciliation

Post-strike, the rationale surfaces were not read (none were needed to file, and the commission's
blindness is preserved for a possible r2 on the built artifact). Where the failure would have
entered — a membership hole, a home special-case, a non-mover writer — the study found the design
already closed each: one membership source, one classification boundary, a closed writer inventory.

---

Verdict: **HELD_STONE**
