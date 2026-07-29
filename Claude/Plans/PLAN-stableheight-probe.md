# PLAN — Stable-height PROBE: hold the document tall across the `#browse` hide on `books→home` so `window.scrollY` never changes (NO scroll delta) — a minimal, revertable DISCRIMINATOR of the scroll-delta hypothesis, not a permanent architecture

Type: plan

<!-- vitruvius-gate {"plan_type":"probe","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false}} -->

Status: **SUPERSEDED (2026-07-29) by `PLAN-browse-decouple.md`.** The discriminator this probe
built ANSWERED YES — the device-confirmed pin (log #21) removed the Books→Home flash by holding
the document tall across the `#browse` hide, proving the scroll DELTA was the driver. Per §4
below, a clean answer means "build the full `#browse` decouple as the clean version" — that build
is `PLAN-browse-decouple.md`, which makes active `#browse` a `position:fixed` own-scroll view (the
permanent form: the delta's SOURCE is removed, not relocated per-transition). The probe's pin
SET/CLEAR (nav.js, once at lines 68-90) and this plan's discriminator are RETIRED — Brunel deleted
the pin in the browse-decouple build; there is nothing left to revert. Kept for its historical
record of the delta-vs-flash reasoning (Records Standards §6.1); not an active plan.

---

Status (as shipped, historical): **PLAN_READY — recommend a QUICK Charpy stress on the two side-effects (navbar-seating + pin-lifecycle) before Brunel; see §6.** The `.265` clamp pre-empt (`window.scrollTo(0,0)` at nav.js:85) shipped and STILL FLASHED: Linnaeus `PROBE-clamp-preempt-2026-07-28.md` (dca795c) proves it RELOCATED the 10211→0 window-scroll change to before the collapse rather than ELIMINATING it — a scrolled commit still travels the full delta; the device-clean TOP case has NO delta (0→0). This probe tests whether the scroll DELTA is the driver by removing it entirely: keep the document height STABLE across the `#browse` hide so the collapse forces no clamp and `window.scrollY` stays put (no delta at all), and remove the now-counterproductive `.265` pre-empt. **This is an unproven DISCRIMINATOR — the device on/off test decides, not the reasoning:** on the reliable oracle (scroll books down, commit to home), if it goes CLEAN the delta was the driver and we then build the full `#browse` decouple as the clean version; if it STILL FLASHES the delta is not it and we pivot to the incoming `#home` slide-transform demote (Linnaeus Q5 candidate 3). Minimal and revertable by construction.

## Index
1. Defining records and authority (the .265 relocate-not-eliminate finding; the stable-height viability)
2. Scope — the minimal change (remove the pre-empt; pin/clear the document height)
3. The design — hold the document tall so no collapse → no clamp → no delta
4. The discriminator logic (what each device outcome means next)
5. Side-effects, addressed honestly (scroll end-state, navbar seating, pin lifecycle)
6. Charpy-or-direct-to-Brunel recommendation
7. Coverage Model + the CI mechanism cell + the device gate
8. Handoff

## Applicability

Machine-readable declaration above. This is a PROBE — a minimal, revertable discriminator: remove one line (`.265` pre-empt), add a synchronous view-state style toggle (`.app` min-height pinned on `→home`, cleared on `→browse`) in the same `setView` block that already toggles `.parked`/`.hidden` by view. Per-pattern reason (all **false**):
- **boundary_relocation / callee_replacement / contract_shape / state_transfer / persistence_migration: false** — no seam, callee, schema, cross-module ownership, or persistence changes.
- **async_change: false** — synchronous; no listener/timer/promise/gate added or removed (the removed `.265` write is also synchronous).
- **lifecycle_ownership: false** — the `.app` min-height is a synchronous VIEW-STATE inline style toggled by `v` inside `setView`, exactly like the existing `.parked`/`.hidden` toggles (nav.js:57,87) — set on `→home`, cleared on `→browse`, no async hold, no session ownership. The set/clear SYMMETRY is the load-bearing correctness and is addressed in §5 (prose), not via the async/lifecycle machinery.

All-false → trivial-plan exemption: no `vitruvius-*` machine blocks. The Coverage Model is prose (§7).

## 1. Defining records and authority

**Verdict: AGREE — Linnaeus derives the delta is RELOCATED not eliminated (.265) and that a stable document height REMOVES the forced scroll change; the device oracle governs the discriminator outcome; NO record conflict; the flash-vs-delta causality is the UNDERIVED question this probe exists to settle.** Precedence (EC §2): (1) the corrected assignment (probe the delta hypothesis, minimal + revertable); (2) the device oracle (scrolled-flashes / top-clean, `.265`-confirmed); (3) verified HEAD `.265` source; (4) Linnaeus `PROBE-clamp-preempt` + `PROBE-artrelease-reveal` + `PROBE-home-scroll-surface`.

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| `PROBE-clamp-preempt-2026-07-28.md` Q3/Q4 | The `.265` pre-empt RELOCATED the 10211→0 window-scroll change (explicit `scrollTo(0,0)` before the collapse) — it did NOT eliminate it; a scrolled commit still travels the full delta, the top case has none. The change is forced ONLY by the `#browse` collapse; home (fixed) does not require `window.scrollY=0`; a document height held STABLE across the `#browse` hide would remove the forced change entirely (no jump, like the top case) — reachable because fixed-`#home` decoupled home from the document height (css:73 is now purely the navbar runway). | Deriver (source + device log) | GOVERNS the probe: remove the delta by holding the document tall (no collapse → no clamp → `scrollY` unchanged) AND removing the `.265` pre-empt (else it re-introduces the delta). Q4 grounds that this is the sole forcing cause and that fixed-`#home` makes a stable-height document non-conflicting. | Annotate the probe as realized-as-a-discriminator (§8). |
| Device oracle (`.265` confirmed) | books→home flashes when books is scrolled down; top is clean. The clean top case is a collapse WITH NO scroll delta. | Device (deterministic on/off) | GOVERNS the discriminator OUTCOME. Removing the delta makes the scrolled case match the top case on the delta axis; the device test says whether that is sufficient (§4). The flash is NOT claimed fixed by reasoning — the device decides. | The device gate is a single scrolled books→home commit (§7). |
| `PROBE-clamp-preempt` Q5 (underived) | Three surviving compositor candidates: (1) the relocated window-scroll jump itself, (2) the `#browse`-collapse recomposite, (3) the incoming `#home` slide-transform demote — none source-settleable. | Deriver | This probe removes (1) AND (2) at once (no scroll change AND no collapse). If the flash persists, only (3) remains → pivot to the slide-transform demote (§4). So the probe is a clean discriminator between {(1) or (2)} and (3). | — |
| `js/nav.js` `setView` (44-108, shipped `.265`) | The `→home` `#browse`-hide block (nav.js:56-87): `browseWillHide()` (66) → the `.265` pre-empt `window.scrollTo(0,0)` (85) → `#browse` `display:none` (87, the collapse 14676→895). Home entry resets `#home`'s OWN scroll only (`$('home').scrollTop = 0`, nav.js:153); the document/window scroll is a pure clamp-surface. | Code under change | REMOVE nav.js:85 (the pre-empt — we want NO scroll change, not a relocated one). ADD, before nav.js:87: pin `.app` min-height to hold the document tall on `→home`. ADD, on the `v==='browse'` show path: clear the pin. §2/§3. | Edit the nav.js:56-87 block (§2). |
| `css/app.css` `.app` (73-74) + `#home` (123-133) | `.app { min-height: calc(100% + 12vh) }` (css:73) is now PURELY the navbar-seating runway (fixed-`#home` moved off it, css:72 comment); `#browse` in-flow content drives the tall document (14676) when scrolled, collapsing to the ~895 runway on hide. Active `#home` is `position:fixed` opaque own-scroll (css:123-131), viewport-anchored — a persistent tall document behind it is visually harmless (Linnaeus Q4). | Production interface (verified) | The pin overrides css:73's calc with an inline `min-height` = the current tall document height, so hiding `#browse` cannot collapse below the outgoing scroll → no clamp. `#home` fixed occludes the (still-tall, unscrolled) `#browse` behind it. Cleared on `→browse` so a SHORT browse page does not over-scroll into empty space. | — |
| `PROBE-home-scroll-surface` Q4 + 6i D2 re-homing | Home is fixed own-scroll; it does not read `window.scrollY`. 6i re-homed pull-to-refresh and the scrollbar off the document scroll onto `#home.scrollTop`. | Deriver | Grounds that leaving `window.scrollY` at 10211 while home is active is BENIGN — no home consumer reads it (§5 scroll end-state). *(Confirm the 6i D2 re-homing is in the shipped build — grounding note, §5.)* | — |
| `EngineeringContract.md` §4.4 (borrowed vs owned), §4.21 (narrow scope), §4.7 (assert intermediate states) | Temporary styles on borrowed real nodes are removed, not the node; fix the invariant without redesigning; assert both sides of a boundary. | Core rules | The `.app` min-height is a temporary borrowed-real style, cleared on `→browse` (never leaked); the CI cell asserts pin-before-hide and clear-on-browse (both sides). | Register the cell (§7). |

**Authority precedence.** Linnaeus governs that the delta is relocated-not-eliminated and that stable-height removes it; the device oracle governs whether removing the delta removes the flash (the whole point); the verified `.265` source governs the edit points. No conflict. The superseded idea — the `.265` pre-empt fixes the flash — is corrected by the device (it still flashed) and is REMOVED by this probe.

## 2. Scope — the minimal change

**Changes (production, `js/nav.js` `setView`, the `!npOpen && !optOpen && !subOpen` block ~56-87):**
1. **REMOVE** the `.265` pre-empt `window.scrollTo(0, 0)` (nav.js:85) and its comment block — we want ZERO scroll change on `→home`, not a relocated one.
2. **ADD** on the `→home` `#browse`-hide path (`v === 'home'` && `#browse` currently shown), BEFORE the `#browse` `display:none` (nav.js:87): pin the document height — capture the current tall content height and set it as an inline `min-height` on `.app` (`document.querySelector('.app')`), e.g. `app.style.minHeight = app.scrollHeight + 'px'` — so hiding `#browse` cannot collapse the document below the outgoing scroll.
3. **ADD** on the `→browse` show path (`v === 'browse'`, inside the same block): CLEAR the pin (`app.style.minHeight = ''`) so a subsequent short browse page uses its real height (no over-scroll into empty space).

**Stays byte-identical:** `browseWillHide()` (nav.js:66, still runs first); `$('home').scrollTop = 0` (nav.js:153, home's own scroll); the `#home` fixed geometry (css:123-133); `.app`'s css:73 runway (the pin overrides it inline on `→home` only, restored on `→browse`); everything in app.js / the construction / abort paths.

**Split across the seam:** none. Revert = restore nav.js:85 and drop the pin toggle (one commit).

## 3. The design — hold the document tall so no collapse → no clamp → no delta

The `.265` pre-empt removed the CLAMP but kept the DELTA (it scrolled 10211→0 explicitly, Linnaeus Q3). This probe removes the DELTA: pin the document height before hiding `#browse` so the collapse never happens, so the browser never has to move `window.scrollY` at all.

Sequence on a `books(scrolled 10211)→home` commit, inside `setView('home')`:
1. `browseWillHide()` (nav.js:66) — deactivate the books virtual controller, capture its anchor at real geometry (unchanged).
2. **PIN** `.app` min-height = its current `scrollHeight` (~14676) — the document is held tall.
3. `#browse` `display:none` (nav.js:87) — `#browse` leaves flow, but `.app`'s pinned min-height keeps the document ~14676, ≥ the outgoing scroll (10211) + viewport → the browser has nothing to clamp → **`window.scrollY` stays 10211, no delta.**
4. (No pre-empt scroll — removed.) `#home` (fixed, opaque, viewport-anchored, css:123-131) is the active view, unaffected by `window.scrollY`.

The scrolled case now matches the TOP case on the delta axis (no scroll change). The `#home` behind... in front: the opaque fixed `#home` occludes the still-tall unscrolled `#browse`. If the flash was the scroll delta (or the collapse recomposite), it is now gone; the device test confirms (§4).

## 4. The discriminator logic (what each device outcome means)

On the reliable oracle (scroll books to "P", commit back to home):
- **CLEAN → the scroll DELTA (or the collapse recomposite) was the driver.** Next: build the full `#browse` decouple as the clean permanent version (a `#browse` whose hide does not collapse the document — e.g. `#browse` own-scroll/fixed like `#home`, or a principled stable-height), replacing this probe's ad-hoc pin.
- **STILL FLASHES → the delta is NOT the driver.** The probe removed candidates (1) the window-scroll jump and (2) the collapse recomposite (Linnaeus Q5) — so only (3) the incoming `#home` slide-transform demote remains. Pivot there (e.g. the wrapper-slide that never transforms `#home`'s own layer). This probe's value is then the RULING-OUT, and it reverts.

Either way the probe earns its keep: it is the one cheap test that splits {delta / collapse} from {slide-transform demote}.

## 5. Side-effects, addressed honestly

- **Scroll end-state.** With the pin and no pre-empt, `window.scrollY` STAYS at 10211 on `→home` (no clamp, no explicit scroll). Home is `position:fixed` own-scroll and does not read `window.scrollY` (Linnaeus Q4); 6i re-homed pull-to-refresh and the scrollbar onto `#home.scrollTop` — so the stale 10211 is INVISIBLE and unread while home is active. On `home→books`, `setView('browse')` CLEARS the pin and `Browse` restores the browse page's own scroll (`applyScrollY` → `window.scrollTo(0, savedY)`), OVERWRITING the stale 10211. **Benign for the probe; navigation is not broken.** *(Grounding note: confirm at build that no home-active code path reads `window.scrollY` expecting 0 — the 6i D2 re-homing should have covered pull-to-refresh + scrollbar; verify it shipped.)*
- **Navbar seating (the `.28` / black-band zone).** The fixed bars seat off a TALL, genuinely-scrollable document; a SHORT (~viewport) document is what displaced them (`.28`, css:73 rationale). Today `→home` collapses to the ~895 runway (still seats via css:73). The pin makes the document TALLER (~14676) — the SAFE direction; it never makes it short. So navbar seating is unaffected-or-better. **Caveat (honest): "home active + a persistent 14676 document" is a NEW shipped state never exercised before** (pre-probe, `→home` collapsed). It is grounded safe (tall = the seating-preferred state, identical to an active browse), but it lives in the fragile `.28` zone the user has ~30 rounds of scar on — so it is a device-observable check (§7), and the reason §6 recommends a quick Charpy stress.
- **Pin lifecycle / leakage.** The pin is SET on `→home` (hiding `#browse`) and CLEARED on `→browse` (showing `#browse`), both in the same `setView` block. `books→books` stays on browse → never sets the pin (no leak). `home→books` → `setView('browse')` → clears it. Home↔overlay keeps the pin (additive; harmless, home fixed) and clears on the eventual `→browse`. **The load-bearing correctness: the clear must cover EVERY `→browse` entry** — all `→browse` paths (swipe commit, button-nav, abort-restore) route through `applyScreen(browse)`→`setView('browse')`, so the single clear in `setView`'s `v==='browse'` branch covers them. A missed clear would leave a short browse page over-scrollable into empty space (a reversible, device-visible bug). This symmetry is what a quick Charpy stress verifies (§6).

## 6. Charpy-or-direct-to-Brunel recommendation

**Recommendation: a QUICK Charpy STRESS on the two side-effects — NOT a full temper — then Brunel.** Rationale: the flash outcome is DEVICE-decided (no review can settle it), so Charpy's only useful surface is the side-effects, and two of them warrant a fast second look before a device build:
1. **Navbar seating** introduces a NEW shipped state (home active + a persistent tall document) in the `.28`/black-band zone the user explicitly warned against (~30 rounds of scar). It is grounded SAFE (tall is the seating-preferred direction, never short), but "grounded safe" has been wrong in that exact zone before — a 10-minute Charpy stress on the reasoning is cheap insurance.
2. **The pin set/clear symmetry** is load-bearing (a missed `→browse` clear = short-page over-scroll); Charpy can confirm every `→browse` entry routes through `setView('browse')`.
The scroll end-state is benign (home fixed, browse restore overwrites) and does not itself need Charpy.

This keeps the probe cheap (Charpy stresses two narrow points, not the whole plan) while respecting the `.28` scar. If the coordinator prefers to move faster given the probe is fully revertable and device-tested, it CAN go direct to Brunel with §7's device gate covering both side-effects — but the disciplined call in the fragile zone is the quick stress first.

## 7. Coverage Model + CI cell + device gate

Mendeleev catalog (applicable dimensions only; the change is a synchronous view-state toggle):
- **Ordering (applicable):** the `.app` min-height is PINNED before `#browse` is `display:none`'d on `→home`, and CLEARED on `→browse` — asserted both sides. The STABLEHEIGHT cell.
- **Composition (applicable):** the pin composes with `browseWillHide` (runs first) and the `#browse` hide (runs after); the `.265` pre-empt is removed (no `window.scrollTo(0,0)` on `→home`).
- **External side effect (device):** the flash discriminator; navbar seating in the new tall-home state; short-browse-page scroll range after `home→books` — all DEVICE, NOT CI cells.
- **Lifecycle / Identities / Async / Persistence / Recovery / Contract / Concurrency: N/A** — a synchronous style toggle.
- **Known-red: N/A.**

**The STABLEHEIGHT CI cell (harness-observable; Curie authors it).**
- **Behavior:** on a `→home` commit that hides a shown `#browse`, `.app` receives an inline `min-height` BEFORE `#browse` gets `display:none`, and NO `window.scrollTo(0,0)` is issued on `→home`; on the next `→browse`, the inline `min-height` is cleared.
- **Fixture / channel:** the app-harness drives the real `→home` then `→browse` via `setView`/`applyScreen`; spy `window.scrollTo` and read `.app.style.minHeight` and the `#browse` `hidden` class; assert (a) `minHeight` is set and non-empty before `#browse.hidden` is toggled on, (b) `window.scrollTo(0,0)` is NOT called on `→home`, (c) `minHeight` is `''` after a `→browse`.
- **Mutation (EC §4.10):** move the pin to AFTER the `#browse` hide (or omit it) → the "min-height set before the hide" assertion reddens; or re-add the pre-empt → the "no scrollTo(0,0)" assertion reddens; or omit the `→browse` clear → the "cleared after browse" assertion reddens.
- **Layer:** integration (real `setView` ordering + style state).

**The device gate (the discriminator + the side-effects).** On a scrolled `books→home` commit on device: (1) FLASH — clean or still flashing (the discriminator, §4); (2) NAVBAR — the fixed bars seat correctly with the persistent tall document while home is active; (3) BROWSE SCROLL — after `home→books`, a short browse page has the correct (not over-scrollable) range. The flash is not called fixed by reasoning; the device on/off test decides.

## 8. Handoff

**Source artifact:** this plan (`Claude/Plans/PLAN-stableheight-probe.md`). Supersedes the `.265` clamp-pre-empt approach (`PLAN-swipe-clamp-fix.md`) for `→home`, which relocated rather than eliminated the delta and still flashed.
**Verdict / status:** PLAN_READY — a minimal, revertable DISCRIMINATOR: hold the document tall (pin `.app` min-height) across the `#browse` hide + remove the `.265` pre-empt, so `window.scrollY` never changes (no delta). Unproven; the device on/off test decides whether the delta was the driver.
**Decisions made:** the delta is relocated-not-eliminated (Linnaeus Q3), so remove it entirely (stable height, no pre-empt); the probe removes candidates (1) jump and (2) collapse-recomposite at once, leaving only (3) the slide-transform demote to pivot to if it still flashes; fixed-`#home` KEPT (it makes a stable-height document non-conflicting).
**Open questions / who each waits on:** the FLASH outcome (device, §4); navbar seating in the new tall-home state (device, §5/§7); the 6i D2 re-homing shipped (grounding note, §5 — confirm at build).
**Next owner:** RECOMMENDED — a quick Charpy stress on the navbar-seating + pin-lifecycle side-effects (§6), then Brunel (the builder); then Curie (the STABLEHEIGHT cell); the device gate downstream. (Direct-to-Brunel is acceptable if speed is preferred, given full revertability — but the quick stress is the disciplined call in the `.28` zone.)
**Required evidence / gates:** the STABLEHEIGHT CI cell green (pin-before-hide, no pre-empt, clear-on-browse, mutation-verified); the device test decides the discriminator (clean → build the full `#browse` decouple; still-flashing → pivot to the slide-transform demote) and confirms navbar seating + browse scroll range.
**Records to scrub on approval:** annotate `PROBE-clamp-preempt` as realized-as-a-discriminator; note in the swipe subsystem contract that the `.265` pre-empt is replaced by the stable-height pin on `→home` (pending the device outcome). Route to Zelda.

VERDICT: PLAN_READY
