# Charpy verdict — PLAN-swipe-stage6f (target HEAD 3300e8f)

Type: review

Verdict: **TEMPER**

Artifact under review: `Claude/Plans/PLAN-swipe-stage6f.md` at git HEAD `3300e8f` (immutable).
Reviewer: Charpy (plan review). Read-only on the craft; this file is the verdict artifact.
Date: 2026-07-27.

The slice is structurally sound and its central promise is real and correctly gated. Four
corrections are required before FORGE: one that would redden CI as written (T1), one mislabelled
records obligation (T2), and two rigor/honesty corrections to the §4 no-peek argument (T3, T4).
None of the four threatens the CI-gated structural invariant; all four concern the plan's
records-scrub completeness and the accuracy of its prose. This is TEMPER, not SCRAP: the target
shape is correct and every defect is a local edit to §2/§4/§9.

---

## What was verified against real code (grounding CONFIRMED)

Every claim below was read in the source at HEAD 3300e8f, not accepted from the plan's prose
(saga rule: prose about this subsystem is a guess until executed).

1. **The transform-on-the-real-view hypothesis is real — there IS something to remove.**
   `js/app.js` start():555 parks INCOMING movers (`if (m.base)`, base≠0); move():576 writes
   `translateX` to ALL movers (`for (const m of d.movers) m.el.style.transform = …`); the settle
   rAF:615 writes the settle target over `cur.movers`; finalize:775 clears
   transform/transition/willChange over `cur.movers`. Today, browse→overlay has
   `outgoing:'real-source'` → `buildConstruction` (swipe.js:322) mints the outgoing mover as
   `resolveSource()` = the real `#browse` (`env.sourceEl('in-flow', …)`), so the real `#browse`
   enters `d.movers` and receives `translateX` at move()/settle(). The code's own comments confirm
   the author's awareness (app.js:606-607 "writing a stale translateX onto the real
   Home/Browse/overlay (borrowed-real movers)"; app.js:637 "the structural fix (never transform
   the real in-flow view)"). The plan's §1a line-citations are accurate.

2. **The one-line change is logically correct.** Current `js/swipe.js:135-136`:
   `outgoing = c.fromKind==='overlay' ? 'real-source' : (c.toKind==='browse' ? 'app-ghost' : 'real-source')`
   — matches the plan byte-for-byte. Proposed:
   `… : (c.toKind==='home' ? 'real-source' : 'app-ghost')`. Enumerated: overlay-source →
   real-source (unchanged); in-flow→home → real-source (browse→home deferred); in-flow→browse →
   app-ghost (unchanged, ships today); in-flow→overlay → app-ghost (NEW). Exactly the intended
   classification, no over/under-reach.

3. **Downstream already handles an app-ghost outgoing.** `buildConstruction` (swipe.js:317-323),
   the `start()` mover mapping (app.js:526-555, base-0 outgoing skipped at 555), and `dropPanes`
   (app.js:623) are unchanged and already build/own/dispose an app-ghost outgoing — browse→browse
   ships it. Flipping the plan value routes in-flow→overlay through shipped machinery with no new
   build code. `ghostApp` (swipe.js:244-261) prunes `.hidden`/`.parked`, so it captures whichever
   in-flow view is active (#browse for a browse source, #home for a home source) — faithful for
   both, no new capture recipe.

4. **Classification completeness — the frozen-oracle edit (spec 55/58/181) IS the complete,
   correct mirror.** Verified against `test/swipe-transition.test.js`: the main pair-proof
   (lines 91-119) derives every concrete pair's expected `outgoing` from `STRUCTURAL_CASES` by
   KIND, overriding only `decorations` from the input. So home→nowplaying and browse→nowplaying
   both take their `outgoing` from the structural home→overlay (:55) / browse→overlay (:58) rows —
   editing those two rows covers the NP-decorated members in the main proof. `MODIFIER_CASES`
   independently hard-codes browse→nowplaying (:181), which must also flip. There is **no
   home→nowplaying entry in MODIFIER_CASES**, so nothing there is missed. Overlay-source cases
   (:59-61, :175) and browse→home (:56, and the hard-coded `real-source` assertion at
   swipe-transition.test.js:137) correctly stay `real-source`. No back-route into `d.movers`: the
   real view is simply never minted as a mover.

5. **Coverage cells are non-vacuous and observable.** SIbrowse/SIhome read `#browse`/`#home`
   `.style.transform` — a readable jsdom string that move():576 actually writes; the
   revert-to-real-source mutation restores the real view to `d.movers` so it gets `translateX`,
   genuinely reddening the "transform empty" assertion at DRAGGING/SETTLING (ARMED is trivially
   empty on both sides — a §4.7 intermediate-state pin, load-bearing only at the two active
   phases). GHOST (`.nav-ghost` presence/disposal), DEC (`.np-pill-float`), and MODEL (three-layer
   oracle deepEqual) are observable. The compositor flash is asserted by NO cell and is correctly
   stated as device-only/downstream throughout (§3, §7, §9). REVEAL is a weaker off-surface
   regression pin (acceptable).

6. **Regression surface is sound.** `constructionPlanFor` returns `renderDestination:'none'` for
   `toKind==='overlay'` (swipe.js:138) and `finalizationPlanFor` returns `abortRender:'none'`
   (swipe.js:169, only browse→browse is 'rerender') — so `#browse` is never rendered into or
   re-rendered mid-drag; no scroll write touches it; it stays at its natural scroll behind the
   panes. The `.alphaindex` claim is correct: with no transform on `#browse`, `#browse` does not
   become the containing block for the fixed strip on these transitions — strictly better than
   today.

7. **nowplaying is full-viewport opaque** (`css/app.css:414-421`: `position:fixed; inset:0;
   height:100%; z-index:60; background:var(--page-bg)`).

---

## Required changes (TEMPER)

### T1 — SCRUB GAP that reddens CI: §9 omits `docs/transition-matrix.generated.txt` (BLOCKING)

`tools/gen-transition-matrix.mjs` imports `STRUCTURAL_CASES`/`paneOf` from the spec and renders the
`outgoing` and `pane` columns (render() lines 92-93) plus the "concrete pairs building a pane: N"
summary (line 99). The committed `docs/transition-matrix.generated.txt` today reads:

```
  home     overlay   real-source   real-destination  none         no     none
  browse   overlay   real-source   real-destination  none         no     none
  …
concrete pairs building a pane: 27 of 132
```

The spec edits (55, 58) change both rows to `app-ghost … yes` and raise the pane count (home→7
overlays + browse-family(4)→7 overlays add 35 pane-building pairs → 27 becomes 62).
`test/transition-matrix.test.js:34-40` is a **byte-exact** comparison of the committed file against
a fresh `render()`; it goes RED unless the file is regenerated.

Required: add to §9's scrub list (and to the vitruvius-gate `affected_contracts`) the obligation to
run `node tools/gen-transition-matrix.mjs` and commit the regenerated
`docs/transition-matrix.generated.txt` in the same commit; name `test/transition-matrix.test.js` as
the gate that otherwise reddens. This is a StandardsDocument §6.6 / EC §4.20 exhaustive-first-pass
scrub obligation the plan currently misses. (The saga's whole thesis is "gates, not rules" — a
scrub list that omits a byte-exact generated artifact defeats the gate it relies on.)

### T2 — §9/§2 mislabel the swipe-model obligation as a "fingerprint pin" update

`docs/swipe-model.generated.txt` IS affected (`tools/gen-swipe-model.mjs:29,190,192,207` imports
the spec and renders `outgoing`/`pane`), and `test/swipe-model.test.js:78-84` byte-matches it — so
regenerating it is correct and the plan rightly names it. But the plan (§2 line 172-173, §9 line
381) instructs "update the fingerprint pin in the same commit." The swipe-model `VERIFIED`
fingerprints (`test/swipe-model.test.js:36-57`: navTo/navRelation/gestureEnd/supersession) mirror
`js/app.js` regions this slice does **not** touch (it changes `js/swipe.js` + the spec). Those
fingerprints must NOT change; re-pinning them would be an unjustified edit to a verification
constant. Required: correct the instruction to "regenerate the doc (exact-match, test 1); the
mirrored-region fingerprints are unaffected and must not be re-pinned."

Additionally: confirm in §9 that regenerating `swipe-model.generated.txt` does **not** perturb the
§8A ledger data-assertion (`test/swipe-model.test.js:212` pins the EXACT `NEW_POLICIES` id set to
three ids) or the pane-inventory data assertions. This slice is classified NEW POLICY (§1, §4.19);
the plan must state explicitly whether that policy belongs in the frozen model's §8A `NEW_POLICIES`
(and if so, that `swipe-model.test.js:215` must be updated in the same commit) or does not (the
§8A ledger scopes the rewrite's recovery/supersession policies, not the construction-plan value —
a defensible reading, but it must be stated, not left for Brunel to discover when the assertion
fires).

### T3 — §4 no-peek geometry is not rigorous; it conflates two geometrically distinct overlay families

The overlay destinations are NOT uniform, and only one of the two families is full-viewport:

- **nowplaying** — `inset:0; z-index:60` (above topbar z30 / navbar z40): full-viewport, opaque.
- **options** (`css/app.css:125-136`, z25) and the five **settings subs**
  (`css/app.css:687-697`, z26) — `top: calc(var(--safe-top)+51px); bottom: calc(var(--nav-h)+var(--nav-pad))`:
  **vertically inset**, painted BELOW the fixed topbar and navbar, covering only the mid band.

The §4 argument "the two width-`w` movers span `[t, t+2w] ⊇ [0,w]`, so the real view never peeks"
is only strictly true **horizontally**, and vertically-complete only for nowplaying. Horizontally
there is no mid-band peek (ghost `[t,t+w]` and overlay `[w+t,2w+t]` are adjacent and cover `[0,w]`
— confirmed). But for options/settings, the **topbar and navbar bands** are outside the overlay's
rect; during a forward drag the ghost (full-height, `.nav-ghost inset:0`) covers only `[t,t+w]`
there, and the remaining band-sliver `[t+w, w]` is covered only by the fixed topbar
(`rgba(20,23,28,.86)` + `backdrop-filter: blur`) and navbar — through which the now-**stationary**
real view sits (today the real view was the mover and had translated away). Required: correct the
§4 claim to (a) state the overlays' vertical inset and the two-family distinction, (b) restrict the
positive no-peek claim to the horizontal mid band, and (c) fold the top/bottom-band exposure
(stationary real view behind the ~14%-transparent blurred topbar) into the §9 device-verification
obligation, since it is a real visual delta this slice introduces for the options/settings members.
(This does not threaten the CI-gated structural invariant, which is transform-elimination, not
no-peek — but an over-claimed positive geometry statement in THIS subsystem is exactly the retracted
-verification pattern the saga warns against.)

### T4 — the "exclude any non-opaque overlay from the slice" escape hatch is not mechanically expressible

§4 line 274 says "any overlay that is not opaque over the covered region is EXCLUDED from the
slice." `constructionPlanFor` keys on `toKind==='overlay'` and cannot distinguish options from
diagnostics without a screen-NAME branch — which would break the kind-based classifier and the
kind-organized frozen spec, contradicting §Applicability's "one value flips / contract_shape:
false." The opacity precondition is therefore ALL-OR-NOTHING, not per-overlay. Required: replace the
escape hatch with an enumerated precondition covering all SEVEN overlay-kind destinations —
`options, nowplaying, general, playback, buffering, downloads, diagnostics` — each verified opaque
over its own rect BEFORE merge; if any fails, the slice is BLOCKED, not "that member excluded."
(Verified: all seven paint `background: var(--page-bg)` over their own rect, so opacity-over-own-rect
holds today; the residual is the inset-band exposure of T3, which is device-visual and not a
per-overlay kind exclusion.)

---

## Advisories (non-blocking; carry to the makers)

- **A1 (to Curie/Brunel).** SIbrowse/SIhome depend on `test/app-harness.js` driving the real
  `begin()→move()→settle()` such that a real mover set exists and `#browse`/`#home`
  `.style.transform` is written. Confirm `h.touch` reaches move():576 with the production
  `constructionPlanFor` (env-trap #5 in the saga: synthetic TouchEvents don't emit PointerEvents —
  irrelevant to a DOM-transform assertion, but confirm the harness path actually arms and drags).
- **A2 (to Brunel).** The abort case (the flash-relevant moment) is geometrically clean for ALL
  overlay members: on abort the full-viewport `.nav-ghost` (inset:0, opaque) returns to base 0 and
  covers `[0,w]` full-height before `dropPanes` reveals the untouched real view — the inset concern
  (T3) is confined to the active forward-drag portion, not the reveal.
- **A3 (to Loki).** The load-bearing promise (§3) is well-formed and single: no reachable
  in-flow→overlay path lets the real in-flow view receive a swipe transform. The three named
  fracture kinds (classification hole / back-route into `d.movers` / tiling break) are the right
  attack surface; the CI-observable ones are (1)/(2) on the real DOM via `h.touch`.

---

## Verdict

**TEMPER.** Blocking changes: T1 (add `transition-matrix.generated.txt` regen — otherwise
`test/transition-matrix.test.js` reddens), T2 (correct the swipe-model "fingerprint" mislabel and
resolve the §8A ledger question), T3 (correct the §4 no-peek geometry for the inset overlays), T4
(convert the opacity escape hatch to an enumerated all-seven-or-block precondition). The target
shape, the one-line change, the oracle mirror, the coverage cells, and the honesty framing (flash is
device-only, headline browse→browse is a disclosed fork) are all sound; every required change is a
local edit to §2/§4/§9. On these four, re-issue for FORGE.

Verdict: **TEMPER**
