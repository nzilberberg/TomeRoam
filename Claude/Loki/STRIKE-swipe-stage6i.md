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

---

# RE-STRIKE — Stage 6i plan repaired + re-FORGE'd (HEAD 41d0f15), 2026-07-28

Re-commissioned after the first KILL was repaired. The L5 fix (source-aware ghost
offset via `translateY(-#home.scrollTop)`, GHOSTSCROLL CI gate + R1(d) device gate) is
in the plan; I did NOT re-prosecute that closed window. Blind pre-build still. Fresh
fracture found and executed.

## 1. The promise (verbatim, repaired plan)

- §3 "Abort (browse→home)": "**No re-decode of `#browse` covers on the return rests on
  the browse-page PARK mechanism** (Loki note #3): during the swipe `#browse`'s page node
  is PARKED — off-viewport but STILL PAINTED (`.browsepage.parked`, css:83-96) ... it
  restores with no re-decode."
- §11 R4: "Aborted `browse→home` re-parks `#home` + restores `#browse` **without
  re-decoding covers** ... so it restores with no re-decode — no hold branch needed (F7)."

This is a claim the plan ASSERTS (not one it concedes to device, unlike R1(a)/R1(d)): the
`browse→home` abort keeps `#browse`'s covers warm via `.browsepage.parked`.

Restated as testable behavior: on the `browse→home` path, `#browse`'s page carries
`.browsepage.parked` (painted), so an abort un-covers warm covers with no re-decode.

## 2. The plane chosen, and why

The repair elevated my earlier lesser note #3 into a LOAD-BEARING claim — the proud
sentence names its own fracture. The plan flips `browse→home` OUTGOING `real-source`→
`app-ghost` (§4, one of the three enum changes, extending 6f's "the real in-flow view is
never a mover"). That flip is the plane: TODAY the real `#browse` IS the warm-keeping
mechanism (it is the borrowed-real outgoing mover, slid by transform, never hidden —
`browse.js:142-145` and `158-159` say so verbatim: "swiping back to Home moves the real
`#browse` by transform, so showPage never runs ... never hides it"). The flip removes
`#browse` from the mover set, and the plan's own home-host un-park (modeled on
`showAppView(home)`, app.js:482: `$('browse').classList.add('hidden')`) display:none's the
`#browse` container. The plan's cited replacement — `.browsepage.parked` — is set ONLY
inside `showPage()` (browse.js:294), which `browse→home` never calls.

## 3. The instrument (reproducible)

Scratch probe `loki-6i-restrike.js` (full text §7), node v22 against HEAD `41d0f15`,
driving the REAL `Swipe.buildConstruction` over the real `index.html` in jsdom in the
browse-active state (signed in, `#browse` shown holding a `.browsepage > img[src]` warm
cover, `#home` parked). Four executed probes:
- **A** — HEAD `browse→home`: `buildConstruction` → the outgoing mover element.
- **B** — the app-ghost path for a browse source, driven via the REAL HEAD `browse→overlay`
  (outgoing `app-ghost`, the same value the plan assigns `browse→home`).
- **C** — the plan's `browse→home` end-state: apply the home-host un-park exactly as the
  plan models it (`#home` un-park + `#browse.classList.add('hidden')`), then inspect.
- **D** — source scan for every `.browsepage` `.parked` SET site.

## 4. Observed result (executed 2026-07-28)

```
A. outgoing.element === real #browse : true      | ownership: borrowed-real | #browse hidden? false
   → TODAY covers warm because #browse is a live transformed mover (NOT .browsepage.parked)
B. outgoing.ownership: owned-pane | is .nav-ghost: true | === real #browse: false
   → app-ghost outgoing ⇒ the real #browse is NOT a mover
C. #browse display:none (.hidden): true | any .browsepage parked (painted): false
   → display:none subtree, NO painted park
D. browsepage .parked SET sites: 294 (all inside showPage) ; browse.js:144/159 say
   showPage never runs / #browse never hidden on browse→home
```

Every prediction of the fracture stands; the promise's prediction (`.browsepage.parked`
painted on this path) is dead. `.browsepage.parked` is never set on `browse→home` (only
`showPage()` sets it, and it is not called), AND the home-host un-park display:none's the
`#browse` container. Nothing keeps `#browse`'s covers warm.

## 5. What it falsifies, and blast radius

Falsified: §3's abort paragraph ("`#browse`'s page node is PARKED — STILL PAINTED
(`.browsepage.parked`)") and §11 R4 ("restores `#browse` without re-decoding covers"). The
mechanism the plan names does not engage on this path, and the plan's two stated
mechanisms CONFLICT: "`#browse` leaves document flow (its ghost covers it)" (a display:none
per the home-host model) versus "`#browse`'s page node PARKED — still PAINTED" (needs
`showPage`, not called; and a painted park cannot survive a display:none'd container).

Blast radius:
- **A regression on the PRIMARY on-camera path.** TODAY `browse→home` abort is cover-clean
  precisely because `#browse` is a transformed real mover (never display:none'd). The
  outgoing `real-source`→`app-ghost` flip removes that, and nothing replaces it → the
  abort re-decodes every `#browse` cover on the return: the exact "cover images flash on
  each aborted swipe return" the `.178/.179/.198` saga fought (browse.js:286 documents iOS
  dropping decoded bitmaps of a display:none subtree). It is now reintroduced on
  `browse→home`, the plan's own headline path.
- **No net.** Unlike R1(a)/R1(d), the plan does not device-gate this abort — it asserts
  cleanliness. A builder following §3 believes `.browsepage.parked` handles it; it does
  not. The regression ships.
- **Honest caveat (why this is still a KILL, not an R1(d)-class concession):** the *visible*
  cover-drop is a device/paint behavior jsdom cannot render. But the plan's claim is
  STRUCTURAL and mechanistic ("PARKED — still PAINTED via `.browsepage.parked`"), and that
  structure is executably FALSE here — the class is never applied and the container is
  hidden. The plan asserts a mechanism that provably does not run; that is a falsified plan
  claim, not a device-owed unknown.

Repair owner: Vitruvius. Sections: §3 (Abort paragraph) and §11 R4 — the abort
cover-warmth for `browse→home` is not provided by `.browsepage.parked`. Two coherent
repairs: **(a)** keep `browse→home` OUTGOING at `real-source` (revert that one enum flip),
so `#browse` stays a warm transformed mover — this trades away 6f's "the real in-flow view
is never a mover" goal for `browse→home` and must be reconciled with §4/§12; or **(b)**
explicitly WIRE a painted park of the `#browse` page for `browse→home` (park the page
painted UNDER the ghost — do NOT display:none the `#browse` container in the home-host
un-park), and add a DEVICE gate (a new R1(e)) for `browse→home` abort cover-warmth, since
the visible result is device-class. Also scrub §5's effect-table line "`#browse` leaves
document flow (its ghost covers it)" against whichever repair lands.

## 6. Reconciliation (read after the strike)

The flaw entered in the REPAIR's reasoning, not the deriver's. My first KILL's lesser note
#3 flagged that the abort decode-cleanliness "rests on the browse-page park mechanism, not
the plan's stated reason." The repair took that pointer and ASSERTED the park mechanism as
the guarantee — without tracing that `.browsepage.parked` is a `showPage()`-only effect and
`browse→home` never calls `showPage()` (a fact `browse.js` states in two comment blocks it
did not consult). The elevation converted a hedge into a false guarantee. Durable lesson
candidate (route via Zelda): when a plan cites an EXISTING mechanism as a guarantee ("rests
on X"), trace X to the exact line that produces its effect and confirm that line is on the
path — a mechanism named is not a mechanism invoked.

## 7. The re-strike probe (verbatim, re-runnable)

Full text kept at `loki-6i-restrike.js` (session scratch). Core: build the browse-active
real-index DOM; (A) `buildConstruction({v:'books'},{v:'home'})` → assert
`movers.outgoing.element === #browse`, ownership `borrowed-real`, `#browse` not `.hidden`;
(B) `buildConstruction({v:'books'},{v:'options'})` (real HEAD app-ghost path) → assert
`movers.outgoing.ownership === 'owned-pane'`, element is a `.nav-ghost`, not `#browse`;
(C) apply `#home` un-park + `#browse.classList.add('hidden')` → assert `#browse` `.hidden`
and NO `.browsepage` carries `.parked`; (D) scan `browse.js` → the only `.parked` SET is
line 294 inside `showPage`.

## Re-strike handoff

- **Source artifact:** this casebook; target `Claude/Plans/PLAN-swipe-noswap-home.md`
  (Stage 6i, HEAD 41d0f15).
- **Verdict / status:** KILL — executed counterexample, §3 Abort / §11 R4.
- **Fracture:** the `browse→home` OUTGOING `real-source`→`app-ghost` flip removes the actual
  cover-warm mechanism (`#browse` as a live transformed mover) for `browse→home`, and the
  plan's cited replacement (`.browsepage.parked` painted-park) provably does not engage on
  this path (`showPage` not called; home-host display:none's `#browse`) → the abort-return
  cover flash returns on the primary on-camera path.
- **Next owner:** Vitruvius — repair §3 / §11 R4 (and §5 effect line) by either reverting
  the `browse→home` outgoing flip or wiring an explicit painted `#browse` park + a device
  gate; then Charpy re-temper.
- **Residual doubts named (held, un-prosecuted, one line each):**
  - `overlay→home` flips pane-OWNING→pane-LESS under the overturn (executed: the mover map
    yields no `owned-pane`), so `begin()`'s settle-phase supersession gate (app.js:383)
    newly ADMITS it — §7's "No new supersession interleaving is added" is imprecise; harmless
    only because reachability constrains `overlay→home` to options-over-home, where the
    non-re-parked `#home` is the correct additive-base state.
  - N1 "benign abort `scroll0` restore" HELD: the abort/supersession paths pass
    `resetScroll:false` (verified in nav.js applyScreen:117/127 + app.js:1255/416), so the
    home-entry reset does not fire and `#home.scrollTop` persists — benign as claimed.
  - The L5 content-translate refix HELD at the model level (GHOSTSCROLL source-branch is a
    real, mutation-reddenable cell); the on-screen fidelity is honestly device-owed (R1(d)).
- **Records updated:** this casebook appended + committed; no other record touched.

VERDICT: KILL
