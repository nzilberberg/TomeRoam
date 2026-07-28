# STRIKE — Stage 6i plan (PLAN-swipe-noswap-home.md), 2026-07-28

Commission: attack the ratified Stage 6i plan's load-bearing CI-checkable promise before the
build. Readable set: the plan, HEAD `.261` source, the frozen model + spec. Blind to the
plan reviewer's casebook and the deriver's probe until the strike was executed (both read
only for §6 Reconciliation below).

## 1. The promise (verbatim, from the plan)

- Headline / §2: the change is "→home-scoped"; §2 STAYS: "the outgoing app-ghost machinery
  (`ghostApp`, `copyScroll`, `copyAnimPhase`, `ghostWrap`)" is listed "STAYS (do not
  re-touch)"; §12 PRESERVED repeats it.
- §9: "The complete live-on-home surface (Linnaeus D2; a missed one silently regresses
  home). Each re-homed to `#home`'s own scroll" — followed by exactly L1–L4 + C1.
- §11 R2: "a missed D2 consumer regresses home scrolling/pull/indicator. Mitigation: §9
  re-homes all four Linnaeus-D2 live consumers."

Restated as testable behavior: after the model overturn (active `#home` becomes
`position:fixed` own-scroll; its vertical scroll moves from `window.scrollY` to
`#home.scrollTop`), every transition whose construction rows the plan does not change —
`home→browse`, `home→overlay` among them — behaves as it does at HEAD. Broken means: a
non-→home transition observably regresses under the new model.

## 2. The plane chosen, and why

`ghostApp` (js/swipe.js:249-266) is the fifth live consumer of home's vertical scroll, and
it is in no table. On any gesture LEAVING home (`home→browse`, `home→overlay` — outgoing
`app-ghost` at HEAD and unchanged by the plan), the ghost is made faithful by exactly one
input: `clone.style.transform = 'translateY(' + (-env.scrollY()) + 'px)'` (swipe.js:257-258),
where `env.scrollY` is `() => window.scrollY || 0` (app.js:509). That input is home's scroll
ONLY under constraint E (home shares the document scroll — the very constraint §3 dissolves).
The plan re-homes L1–L4 + C1 (§9) and touches neither app.js:509 nor swipe.js:257; §2/§12
forbid touching `ghostApp` at all; §5 retires `copyScroll`-into-clone for →home and assigns
home's VERTICAL scroll no owner on the home-SOURCE direction. `js/swipe.js` contains zero
occurrences of `scrollTop` (probe output, §4): no construction code can ever see
`#home.scrollTop`.

The state that fractures it is plan-acknowledged ordinary: correction 1 (§1) makes home
content "CAN exceed the viewport," and the plan's own PTR cell (§10) fixtures exactly
"`#home` scrollTop greater than zero and window scrollY zero." The gesture is reachable:
from home with a non-empty forward stack, an edge swipe arms `home→books`
(app.js:460-464); `home→overlay` likewise per the transition matrix.

## 3. The instrument (reproducible)

Scratch probe `loki-6i-probe.js` (full text in §7), run with node v22 against HEAD `.261`.
It drives the REAL `Swipe.buildConstruction` (no simulation of the plan's code edits needed:
the `home→browse` row is unchanged, so HEAD swipe.js executed against the plan's world-state
IS the post-6i system for this transition) with the verbatim app.js:507-518 env, over the
real `index.html` in jsdom (signed-in state), twice:

- WORLD A (HEAD control): `#home` in-flow; user 500px down => `window.scrollY = 500`.
- WORLD B (Stage 6i): `#home` `position:fixed; overflow-y:auto`; user 500px down =>
  `#home.scrollTop = 500`, `window.scrollY = 0` (the PTR-cell state). jsdom has no layout,
  so the scrolled element state is modeled per-instance; the clone deliberately gets no such
  property, matching the DOM spec (cloneNode copies attributes and children, never scroll
  offsets).

Prediction by the promise: both worlds capture 500 (invisible real→ghost swap).
Prediction by the fracture: WORLD B captures 0.

## 4. Observed result (executed 2026-07-28)

```
--- WORLD HEAD (home→books, real buildConstruction) ---
capture.ghostY         : 500
ghost clone transform  : translateY(-500px)
ghost home scrollTop   : 0
ghost carousel scrollLeft: 120 (copyScroll DID carry the horizontal state)
=> jump at real→ghost swap: 0px          (instrument valid)
--- WORLD 6i (home→books, real buildConstruction) ---
user position          : #home.scrollTop=500, window.scrollY=0
capture.ghostY         : 0
ghost clone transform  : translateY(0px)
ghost home scrollTop   : 0
=> jump at real→ghost swap: 500px        (promise predicted 0)
js/swipe.js occurrences of "scrollTop": 0
```

The ghost of a scrolled home displays the TOP of home. At drag start the visible content
jumps 500px the instant the real view is swapped for the ghost — the "invisible real→ghost
swap" (plan §3 step 1 relies on it by name) becomes a visible jump on every swipe leaving a
scrolled home. The promise's prediction is dead; the fracture's stands.

Compounding, derived from source (not separately executed): `ghostApp` strips ids
(swipe.js:252), so whatever fixed/own-scroll geometry §6 keys on `#home` ("the base rule
gains the active-fixed geometry") cannot apply inside the clone; and cloneNode never copies
scroll offsets, so even a geometry-faithful clone shows scrollTop 0.

## 5. What it falsifies, and blast radius

Falsified: §9's completeness claim ("The complete live-on-home surface"), §11 R2's
mitigation (the enumeration IS the mitigation, and it is incomplete), and the headline /
§2-§12 claim that non-→home behavior is preserved — `home→browse` and `home→overlay` are
non-→home and regress.

Blast radius:
- Every swipe leaving a scrolled home: visible jump-to-top at drag start (forward-swipe
  home→books; home→overlay where swipe-reachable). Scrolled home is ordinary under
  correction 1 (dynamic carousels, conditional Downloads section).
- The ABORT of those gestures: the ghost slides back showing top-of-home, drops with no
  hold (`abortRender:'none'`), and the real `#home` re-appears at scrollTop 500 — a second
  jump at uncover. The plan's own diagnostic axiom (app.js:1120: "a reveal at a Y different
  from ghostY IS the flash") names this exact mechanism class — the class the plan exists
  to eliminate — reintroduced on the reverse direction.
- The repair is not a one-liner inside the plan as written: §2/§12 forbid touching
  `ghostApp`, and §5 assigns home's vertical scroll no owner on home-source gestures, so a
  builder following the plan faithfully ships the break.

Repair owner: Vitruvius. Sections: §9 (add the fifth consumer — the outgoing app-ghost's
scroll capture, app.js:509 / swipe.js:257-258 — and re-home it, e.g. capture
`#home.scrollTop` when the SOURCE is home and carry it into the clone, which also requires
lifting the §2 STAYS/§12 PRESERVED do-not-touch on `ghostApp` for that one recipe), §10 (a
cell fixturing a scrolled-home outgoing ghost; the PTR cell's state aimed at the ghost), §1
(annotate Linnaeus D2 — see §6).

## 6. Reconciliation (read only after the strike)

The flaw entered at the derivation layer, not the plan's reasoning. Linnaeus D2
(`PROBE-home-scroll-surface-2026-07-28.md` §D2) is self-described "grep-exhaustive over
`js/` for `window.scrollY`/..." with completeness marked load-bearing — yet has no row, in
any of its three tables, for app.js:509 (`scrollY: () => window.scrollY || 0`, a literal
match of the grep pattern) or swipe.js:257 (`env.scrollY()` — the injected-seam indirection
hides the ghost's read from a `window.scrollY` grep). The plan trusted D2 per its §1
authority table; the plan reviewer's casebook shows no scrolled-home/ghost-fidelity
concern. Durable lesson candidate (route via Zelda): a claimed-exhaustive grep over an
injected-seam codebase must sweep the seam's DEFINITIONS (`env.*` wiring) as first-class
consumers, or the seam launders a consumer out of the inventory.

## 7. Lesser planes, un-prosecuted (one line each)

- `paneKindOf` (app.js:751-755) labels →home's new app-ghost `'snapshot'` post-plan —
  diagnostic misattribution in FLASH logs.
- Abort of home→X restores `window.scrollTo(0, cur.scroll0)` where scroll0 is now the
  phantom document scroll — benign only because `#home.scrollTop` persists element-locally;
  the plan does not state it.
- §3's "`#browse` leaves document flow" at drag start rests the abort's decode-cleanliness
  on the browse-page park mechanism (css:83-96), not on the plan's stated reason ("nothing
  was rendered into it") alone — suspicion only, not executed.

## 8. The probe (verbatim, re-runnable)

```js
// LOKI PROBE — Stage 6i strike: the outgoing app-ghost of a SCROLLED home.
'use strict';
const fs = require('node:fs');
const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const { JSDOM } = require(REPO + '/node_modules/jsdom');
const Swipe = require(REPO + '/js/swipe.js');

const html = fs.readFileSync(REPO + '/index.html', 'utf8');

function makeWorld(model) {
  const dom = new JSDOM(html, { url: 'https://tomeroam.test/' });
  const { window } = dom;
  const doc = window.document;
  const home = doc.getElementById('home');
  // Signed-in, home-active state (the ghost prunes .hidden subtrees).
  doc.getElementById('library').classList.remove('hidden');
  doc.getElementById('clRow').dataset.sl = '120';
  if (model === 'HEAD') {
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
  } else {
    home.style.position = 'fixed';
    home.style.overflowY = 'auto';
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    // jsdom has no layout: model the scrolled element per-instance. The clone
    // gets no such property — matching the spec (cloneNode never copies scroll).
    Object.defineProperty(home, 'scrollTop', { value: 500, configurable: true });
  }
  return { window, doc, home };
}

function run(model) {
  const { window, doc, home } = makeWorld(model);
  const env = {                       // verbatim app.js:507-518 shape
    document: doc,
    scrollY: () => window.scrollY || 0,                    // app.js:509, unchanged by the plan
    sourceEl: () => { throw new Error('unused'); },
    navPill: () => { throw new Error('unused'); },
    renderDestination: (dest, host) => doc.getElementById('browse'),
  };
  const c = Swipe.buildConstruction({ v: 'home' }, { v: 'books' }, env);
  const clone = c.movers.outgoing.element.firstChild;
  const cloneHome = clone.querySelector('.view');
  console.log(model, 'ghostY=', c.capture.ghostY, 'transform=', clone.style.transform,
    'cloneHome.scrollTop=', cloneHome.scrollTop,
    'jump=', 500 - (model === 'HEAD' ? c.capture.ghostY : c.capture.ghostY + cloneHome.scrollTop));
}
run('HEAD');   // ghostY=500 transform=translateY(-500px) jump=0
run('6i');     // ghostY=0   transform=translateY(0px)    jump=500
console.log('swipe.js scrollTop reads:',
  (fs.readFileSync(REPO + '/js/swipe.js', 'utf8').match(/scrollTop/g) || []).length);  // 0
```

## Handoff

- **Source artifact:** this strike record (`Claude/Loki/STRIKE-swipe-stage6i.md`); target
  `Claude/Plans/PLAN-swipe-noswap-home.md` (Stage 6i, HEAD 3aba1d5).
- **Verdict / status:** KILL — executed counterexample, §3-§4.
- **Decisions made:** none (a strike decides nothing; it demonstrates).
- **Open questions:** whether the repair carries `#home.scrollTop` into the ghost (clone
  fidelity) or pins the home ghost at top by declared policy with a matching real-view
  reset — Vitruvius's call, not this seat's.
- **Next owner:** Vitruvius (repair §9/§10/§2/§12 + annotate Linnaeus D2), then Charpy
  re-temper of the amended sections.
- **Required evidence / gates:** the repaired plan names the fifth consumer and its owner;
  a coverage cell fixtures a scrolled-home outgoing ghost; the D2 annotation lands.
- **Records updated:** this casebook filed and committed; no other record touched (this
  seat is read-only on what it strikes).

VERDICT: KILL
