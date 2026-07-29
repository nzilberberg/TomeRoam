# Charpy quick-stress — PLAN-stableheight-probe (pin the document tall across the `#browse` hide)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom"} -->

Scope: a QUICK stress on the two flagged side-effects (navbar seating + pin set/clear symmetry) plus the
`window.scrollY`-misread grounding note — NOT a full temper; the flash discriminator is device-decided. Read:
`Claude/Plans/PLAN-stableheight-probe.md` (Vitruvius, HEAD `2c603bb`) and the shipped `.265` source it edits —
`js/nav.js` `setView` (44-108) + `applyScreen` (140-153), `js/app.js` `showAppView`/`renderDestination`
(478-525) and `bindPullRefresh` (1303-1335), `js/scrollbar.js` `surfaceKind`/`metrics` (41-59), `css/app.css`
seating records (52-54, 73, 123-133).

## Applicability

- **defining_records: true** — reconciles Linnaeus `PROBE-clamp-preempt` (delta relocated not eliminated), the
  device oracle, and the shipped `.265` source; `## Defining records` below.
- **boundary_relocation / callee_replacement / contract_shape: false** — one synchronous inline-style toggle
  (`.app.style.minHeight`) added inside the existing `setView` view-switch, plus removal of one `scrollTo`
  call. No module seam, callee, or schema change. No source/callee ranges declared.
- **project_adapter: tomeroam-js-dom.** The added DOM writes are `app.style.minHeight = …` (set/clear) beside
  the existing `browseEl.classList.toggle('hidden', …)` (nav.js:87); no `d.<field>` write added.

## Verdict

**FORGE (safe to build as a probe).** The two flagged side-effects hold up under source inspection: pin
set/clear symmetry is sound (every terminal browse entry clears via `setView('browse')`), navbar seating moves
in the grounded-safe direction (taller, never short) and is correctly device-owed, and the
`window.scrollY`-misread grounding note is **satisfied** — pull-to-refresh was re-homed to `#home.scrollTop`
in 6i (it shipped) and no other home-active consumer reads `window.scrollY`. Two non-blocking notes (F1
placement, F2 a new device-check for the home→books transient). Nothing is a fracture. The flash itself stays
device-decided by the reliable scrolled books→home on/off oracle, as the plan states.

## Defining records

**AGREE — no conflict.** Linnaeus `PROBE-clamp-preempt` derives that the `.265` pre-empt RELOCATED the scroll
delta rather than eliminating it (a scrolled commit still travels it; the device-clean top case has none), and
that a document held tall across the `#browse` hide removes the forced change entirely. The device oracle
governs the discriminator outcome. The `.265` source is verified (the pre-empt at nav.js:85, the `#browse`
hide at nav.js:87). The probe is minimal and revertable by construction (restore nav.js:85, drop the toggle).
No record contradicts another.

## Side-effect verification (the three asks)

### 1. Navbar seating — grounded-safe DIRECTION, correctly DEVICE-OWED

The seating records are consistent with the plan's reasoning: css:52-54 and the css:73 runway rationale state
that a **short (~viewport) document is what displaces the iOS-26 fixed bars**; a genuinely-scrollable (tall)
document seats them (this is why `.app { min-height: calc(100%+12vh) }` exists, and why 6i A2 retained it). The
pin forces the document TALLER (~14676) while home is active, never short — the seating-preferred direction. So
the reasoning is sound from source, not just plausible.

The honest residual (which the plan already marks): the exact state — **home active as a fixed view + a
persistent tall document scrolled to ~10211 behind it** — is NEW (pre-probe, `→home` collapsed to the ~895
runway). Whether a fixed bar seats under a tall-AND-scrolled document with home active is an iOS-runtime fact;
it is the same class as the 6i R1(c) phantom-document-scroll gate (the probe enlarges that surface from ~895 to
tall-scrolled, but does not change its class). **This is correctly DEVICE-OWED — the device gate (§7 item 2)
covers it; CI cannot settle it, and the plan does not claim it can.** No source contradiction; the `.28`/`.30`
scar is about short documents, and the pin never produces one. Call: grounded-safe direction, device-confirmed.

### 2. Pin set/clear symmetry — every terminal `→browse` clears (YES)

I traced every `#browse`-show path:
- **`setView('browse')`** (nav.js, the CLEAR point) is reached by every `applyScreen(browse)`: commit
  (app.js:1222), abort (app.js:1227), browse→browse abort rerender (app.js:1201), button-nav (app.js:143/150),
  and the browse refreshes (app.js:2625/3127/3220). All clear.
- **`showAppView` (app.js:478-486, line 485 `$('browse').classList.remove('hidden')`)** is the only browse-show
  outside `setView`. It has exactly one caller — `renderDestination`'s `browse-host` branch (app.js:515) —
  which runs DURING a swipe drag. It is **non-terminal**: every drag that shows `#browse` ends in a terminal
  `applyScreen`→`setView('browse')` (commit/abort-to-browse → clears) or `setView('home')` (abort/return to
  home → the pin-set guard `v!=='browse' && !#browse.hidden` re-fires since `#browse` is shown mid-drag, so the
  pin is re-set consistently and `#browse` hidden). No terminal browse-show bypasses `setView('browse')`. So
  **the single clear in `setView`'s `v==='browse'` branch covers every browse entry — no persistent leak.**
- The pin is SET only inside `setView('home')` under `v!=='browse' && !#browse.hidden` (i.e. a `→home` that
  hides a shown `#browse`), which runs at commit/nav, never during a drag. `books→books` never sets it (stays
  on browse). Overlay-over-home keeps it (additive; home fixed; cleared on the eventual `→browse`).

Answer to the coordinator: **every `→browse` clears — YES.** (See F1 for the placement build-note.)

### 3. `window.scrollY` misread — grounding note SATISFIED (not a build-time unknown)

The plan's benign-stale-scroll claim depends on no home-active path reading `window.scrollY` expecting 0. I
verified it shipped:
- **Pull-to-refresh reads `#home.scrollTop`, not `window.scrollY`** — app.js:1311-1313 comment cites 6i plan §9
  L1 ("`window.scrollY` is always 0 for a fixed `#home` and would mis-arm the pull"), and the guards are
  `$('home').scrollTop > 0` at app.js:1316 (touchstart) and 1323 (touchmove). So a stale `window.scrollY=10211`
  does NOT mis-arm or suppress the pull on home.
- **The custom scrollbar is dormant on home** — `surfaceKind(#home)` returns `null` (scrollbar.js:47-48:
  `#home` is neither `isDoc` nor in `OVERLAY_SEL`), so it never draws on home and never reads the stale
  `window.scrollY`; its `isDoc` `window.scrollY` read (scrollbar.js:57) is browse-only, and no document scroll
  event fires while the occluded document sits idle behind the fixed `#home`.
- On `home→books`, `Browse.applyScrollY` overwrites `window.scrollY` with the restored `savedY`; the browse
  scroll recorder (browse.js) is guarded by `browseVisible()` so the stale value never lands in `cur.sy`.

So the stale `window.scrollY` is genuinely invisible while home is active. The grounding note is **satisfied**,
not a residual to confirm at build.

## Findings

### F1 — Note (recommendation) — recommend placing the clear on `v === 'browse'` unconditionally; the mid-drag `showAppView` browse-show is benign
Recommend that Brunel reach the pin clear on every browse entry — e.g. `if (v === 'browse') app.style.minHeight
= ''` whenever `setView('browse')` runs — rather than nesting it inside the pin-SET guard (`v !== 'browse' &&
!#browse.hidden`), where it would not run for `v==='browse'`. The plan's §2 item 3 already scopes it to "the
`v === 'browse'` show path," so this is a build-note, not a plan defect. Separately, record that `showAppView`
(app.js:485) shows `#browse` mid-drag without touching the pin — verified benign (non-terminal; the terminal
`setView` clears/re-sets), so no clear is needed there.

### F2 — Note (open-unknown, device) — the home→books transition now starts from a stale non-zero `window.scrollY`; add it to the device gate
The unresolved question the plan owes: **whether** the `home→books` slide-in shows a visible wrong-scroll flash
before the browse restore corrects it. Because the probe removes the `.265` `scrollTo(0,0)` and leaves
`window.scrollY` at ~10211 on home (vs `.265`'s 0), the in-flow `#browse` slides in at scroll ~10211 until
`Browse.applyScrollY` overwrites it with the destination's saved position. For a return to the SAME books
(saved ≈ 10211) this is smoother than `.265` (no 0→10211 jump); for a nav to a DIFFERENT/fresh books (saved ≈
0) it is a transient ~10211→0 correction that `.265` did not have. The plan must **decide** to resolve this on
device — add "no wrong-scroll flash on `home→books`" to the device gate (§7 item 3, alongside the
short-page-range check). It is a transient corrected by the restore (end state correct), not a persistent bug,
so non-blocking — but it is a NEW device-observable, the visible face of the "stale `window.scrollY`"
side-effect, that the device gate should name explicitly.

## Coverage

- **F1** — no runtime surface beyond the STABLEHEIGHT cell already specified (§7 asserts pin-before-hide + no
  pre-empt + clear-on-browse; that cell's clear-on-browse assertion is exactly the F1 placement guard, and its
  mutation "omit the clear" reddens it). Build-note only.
- **F2** — device-owed, no CI surface (a transient paint jsdom cannot see); closed by adding the
  `home→books` no-wrong-scroll observation to the device gate. jsdom does no layout, so no CI cell should
  assert it (would be vacuously green).

## Handoff packet

- **Source artifact:** `Claude/Charpy/PLAN-stableheight-probe-charpy.md` (this casebook).
- **Verdict / status:** FORGE (safe to build as a revertable probe). Pin symmetry sound (every terminal
  `→browse` clears); navbar seating grounded-safe-direction + correctly device-owed; `window.scrollY` misread
  grounding note satisfied (pull-to-refresh reads `#home.scrollTop`, scrollbar dormant on home). Two
  non-blocking notes (F1 clear placement; F2 add the home→books transient to the device gate).
- **Decisions confirmed against reality:** pull-to-refresh reads `#home.scrollTop` (app.js:1316/1323, 6i
  shipped); the scrollbar returns `null` `surfaceKind` for `#home` (scrollbar.js:47); `showAppView`
  (app.js:485) is the only non-`setView` browse-show and is mid-drag/non-terminal (sole caller app.js:515);
  the seating records (css:52-54, 73) put the displacement on SHORT documents, and the pin only makes them
  taller.
- **Open questions / who each waits on:** the FLASH discriminator (device, §4); navbar seating under the new
  tall-scrolled-home state (device, §7 item 2); the home→books transient (device, F2). All downstream of the
  build; none is a source-settleable defect.
- **Next owner:** Brunel (the two-edit probe: remove nav.js:85, pin before the `#browse` hide on `→home`,
  clear on `v==='browse'`; land F1/F2) → Curie (STABLEHEIGHT cell) → the device gate (discriminator + seating +
  home→books scroll).
- **Required evidence / gates:** the STABLEHEIGHT CI cell green (pin-before-hide, no pre-empt, clear-on-browse,
  mutation-verified); the device test decides the discriminator and confirms navbar seating + browse scroll
  range + no home→books wrong-scroll flash.

VERDICT: FORGE
