# Plan review (round 2) — PLAN-swipe-stage5.md (revised: resolves F1/F2/F4/F5/F6/F7/F8)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:345-356","js/app.js:358-497","js/app.js:547-580","js/app.js:582-655"],"callee_ranges":["js/app.js:550-558","js/app.js:632-638"]} -->
<!-- note: re-review of the revised plan; round 1 (the seven blocking findings) is PLAN-swipe-stage5-2026-07-22.md, cited unchanged. -->

Reviewed: 2026-07-22 · Plan: `Claude/Plans/PLAN-swipe-stage5.md` (Vitruvius's revision resolving the
seven blocking findings + F3 of `Claude/Charpy/PLAN-swipe-stage5-2026-07-22.md`). Grounded against HEAD:
`js/swipe.js`, `js/app.js`, `test/contract-function-gate.test.js`, `test/swipe-transition.test.js`.
Each claimed resolution was struck against the code it cites, not accepted on the plan's prose. Two
residuals survive; the seam architecture and the chosen boundary pass.

## Applicability

Declared change patterns (machine-readable declaration above; project adapter `tomeroam-js-dom`):
- **defining_records: true** — parent plan, `swipe.js` header, DecisionLog still CONFLICT at HEAD; the
  plan defers their scrub to approval (proper, not a finding).
- **boundary_relocation: true** — the capture recipes + source resolution + NP decoration builder move
  `app.js`→`swipe.js`; ranges declared and re-traced in the ledger.
- **callee_replacement: true** — `showAppView` (550–558) and the overlay branch (632–638) are replaced
  by behaviour split across L1/L2/L3; both callee ranges declared, every effect assigned in the plan's §5
  and re-checked here.
- **contract_shape: true** — `classifyTransition` gains `sourceHost`/`destinationHost`, changing its
  exact-key contract (F1-r).

## Verdict

**TEMPER** — build after two tightenings. The revision earns it: it resolves all seven round-1 blockers
against the code. F1 mapping (`{element,ownership,slot}`→`{el,base,own}`, `base` owned by L3) and F1.2
geometry are pinned; F2 routing is closed by deriving classification inside `buildConstruction` from
`from`/`dest` (the two-source hazard is gone) and the exact-key contract is pinned in **both** real sites
(verified exhaustive — there is no third); F4 routes every ambient read through `env` including the sharp
`Element`-feature-check bypass; F5 gives descriptor identity and a complete effect-ownership table; F6
assigns `sourceWasClobbered`→`d.clobbered`; F7 pins outgoing-capture-before-clobbering-render with a
reddening mutation; F8 resolves `GHOST_BG` fresh per gesture; F3's one-sentence justification is present;
and every named parity obligation (`np-locked`, `freezeArt`, `.nav-ghost`, `npPillClone`, no-new-
`will-change`, initial mover parking) has a mutation-verified row. **Two residuals** block a clean build:
one Structural (the new host fields are added to the frozen-model boundary without a value projection or
frozen-spec coverage), one Weak (the `Capture` type is stated uniform but the two owned panes produce
different fields). Neither shatters scope B.

## Defining records

Verdict: **CONFLICT (unchanged at HEAD); this sub-plan is the proposed resolution to boundary B** — same
as round 1, correctly deferred to approval (StandardsDocument §6.6).
- **`PLAN-swipe-stage5.md`** (revised) — the artifact under review; scope B, host carried.
- **`PLAN-swipe-reveal.md` §7 step 5** — still reads boundary A; rewritten to B on approval (plan §9).
- **`js/swipe.js` header, lines 24–27** — still lists boundary C; rewritten to B on approval (plan §9).
- **`DecisionLog.md` 2026-07-21** — `sourceHost`/`destinationHost` "reintroduced with a reader"; the plan
  honours it (host fields carried, read by `buildConstruction`). Settled to B on approval (plan §9).
- **`PLAN-swipe-stage5-2026-07-22.md`** (round 1) — the seven blocking findings; each resolved below.
  Filed unchanged, cited as authority.

The `swipe.js` header comment (lines 67–78) independently confirms the staging contract the plan relies
on: the host fields are "reintroduced in the stage that first consumes them … the hosts with the stage-5
pane/mover construction that reads them, each with its consumer and test in the same commit." The plan is
the honouring of that recorded contract, not a departure from it — AGREE.

## Value-crossing ledger — verification of the plan's §4 owners against HEAD

Every moved value re-traced; each row confirms or corrects the plan's assigned owner. Ranges: `npPillClone`
345–356; `GHOST_BG`+helpers+`ghostApp` 358–497; `snapshotHome` 547–580; `start()` construction 582–655.
Callee ranges: `showAppView` 550–558; overlay branch 632–638.

| Value | Class | Dir | Today (app.js) | Plan owner | Verified |
|---|---|---|---|---|---|
| `from`/`dest` identity (+payload) | object | in | 592/622/633 | L3 passes to `buildConstruction` args | ✓ closes F5 two-source hazard |
| `sourceHost`/`destinationHost` | object | in | not emitted (swipe.js:79–99) | `classifyTransition` emits; L1 reads | ✓ routing / **✗ value projection unspecified (F1-r)** |
| `d.dir`/`d.w` → `off` | geometry | in | 592 | L3 computes `base` | ✓ width never crosses seam |
| `window.scrollY` → `ghostY` | geometry | in | 486 | `env.scrollY()` | ✓ F4 |
| `.app` clone source | domread | in | 471/492/494 | `env.document.querySelector('.app')` | ✓ F4 |
| `#home` clone source | domread | in | 565/575/577 | `env.document.getElementById('home')` | ✓ F4 |
| `Element` feature check | ambient | in | 420 | `env.document.defaultView.Element` | ✓ F4b silent-bypass closed |
| `GHOST_BG` page background | closureconst | in | 368–371, used 467 | resolved fresh per gesture via `env` | ✓ F8 |
| `navPill()` source | domread | in | 345/351 | `env.navPill()` | ✓ |
| clone build + `document.body.appendChild` | domeffect | out | 354/491/574 | L1 via `env.document.body` | ✓ |
| `.np-pill-float` stale removal; strip `[id]`; add `np-pill-float` | domeffect | out | 350/352/353 | L1 (`npPillClone`) via `env` | ✓ npPill row |
| `freezeArt` strips `img[data-art]` pre-connection | domeffect | out | 376/480/567 | L1 recipes | ✓ freezeArt row |
| `.nav-ghost` wrapper contract | domcontract | out | 466–467 | L1 (`ghostWrap`) | ✓ navGhost row |
| mover shape `{el,base,own}` | object | out | 620–646 | L1 emits `{element,ownership,slot}`; L3 maps | ✓ F1.1 |
| `d.ghostY`/`d.animSync`/`d.animRes` (capture) | object | out | 487/495/578 | top-level `Capture`, L1 returns/L3 records | **✗ shape not uniform (F2-r)** |
| `d.clobbered` same-host carrier | object | out | 630, read 1260/1286 | L1 computes `sourceWasClobbered`, L3 records | ✓ F6 |
| `document.body.classList.remove('np-locked')` incoming-NP | domeffect | out | 634 | L2 (`env.renderDestination`) | ✓ F5 |
| `document.body.classList.remove('np-locked')` outgoing-NP | domeffect | out | 645 | L3 via `plan.decorations` | ✓ |
| `$(s).classList.add('hidden')` stale-overlay cleanup | domeffect | out | 555 | L2 (reads `d.from.v` by closure) | ✓ F5 |
| `$('home').classList.remove('parked')` / `$('browse').classList.add('hidden')` host toggles | domeffect | out | 556–557 | L2 | ✓ F5 |
| `el.classList.remove('hidden')` overlay unhide | domeffect | out | 636 | L2 | ✓ F5 |
| outgoing capture BEFORE clobbering render | ordering | out | 604–605, 620→629 | L1 (step 4 before 5) | ✓ F7 |
| `revealBase = snapBrowse(true)`; `takeRowHold()` | ordering | out | 590/591 | L3 before L1 render | ✓ F7 |
| initial mover parking transform; no `will-change` on real panes | domeffect | out | 654/651–653 | L3 | ✓ parking/willChange rows |
| `d.movers` / `d.live` | object | out | 649/589 | L3 | ✓ |

## Findings

### F1-r — Structural — requirement — the new host fields join the frozen-model boundary without a value projection or frozen-spec coverage

`buildConstruction` derives classification internally from `from`/`dest`, so the exact-key contract change
is correct and its two pinning sites are exactly `contract-function-gate.test.js:24` and
`swipe-transition.test.js:57` — I grepped the whole `test/` tree and there is no third site, so the plan's
"both update in the same commit" is complete. That part passes.

What is unspecified is the **value** of the two new fields. `classifyTransition` today computes only
`fromKind`/`toKind` (swipe.js:79–99); the plan says it will now "emit" `sourceHost ∈ {overlay, in-flow}`
and `destinationHost ∈ {overlay, browse-host, home}` and calls `sourceHost` "a projection of `fromKind`"
(§3, F3), but never writes the kind→host mapping. The projection is nearly forced (all settings-subs are
overlays via `isOverlay`, so `overlay→overlay` / `home,browse→in-flow` for the source; `overlay→overlay`
/ `browse→browse-host` / `home→home` for the destination) — which is why this is a specification gap, not
a false claim.

The teeth are in coverage. This module exists because this exact mapping class was "hand-written wrong
twice" and is now guarded by ONE frozen spec that every registry pair is checked against (swipe.js:1–27;
`test/swipe-transition.test.js` line 90, against `test/fixtures/swipe-plan-spec.mjs`). The plan's §8 F2
row asserts only the exact-**key** set in the two pin sites; **no** test fixes the per-transition host
**value**. So a wrong projection — e.g. a source `home` mapped to `overlay`, or a settings-sub
mis-hosted — would pass every green test, because the frozen-model guard does not extend to the fields the
plan just added to the frozen-model boundary. The plan must (1) state the kind→host projection explicitly,
and (2) require the value pinned in `swipe-plan-spec.mjs` and asserted per registry pair (the
`STRUCTURAL_CASES` map gains `sourceHost`/`destinationHost`), so the guarantee the module is built to give
covers the new fields.

### F2-r — Weak — defect — the single `Capture` type is not the shape both owned panes produce

§3 pins `Capture = { ghostY: number; animSync: number; animRes: number }` as "the sole owned-pane's
capture." Struck against the code, the two owned panes do not produce the same fields: `ghostApp` writes
`d.ghostY` **and** `d.animSync`/`d.animRes` (app.js:487, 495), but `home-snapshot` writes only
`d.animSync`/`d.animRes` (app.js:578) — a home snapshot is pinned at top with no scroll freeze, so there
is no `ghostY` for it. The stated type therefore over-specifies: for the `home-snapshot` branch there is
no `ghostY` to return.

This is Weak, not Structural, because both `d.ghostY` readers null-guard it (`cur.ghostY == null ? '?'`
at app.js:1163; `(cur.ghostY == null) ? null : …` at 1212 — both diagnostics), so recording an absent
`ghostY` on the home path is parity-safe (today it is untouched there too). But the wrong type will make
the builder invent a `ghostY` for the home capture where none exists. Fix: state `ghostY` as
app-ghost-only (`ghostY?` on `Capture`, or the home capture omits it) and have L3 record only the fields
present, preserving today's "no ghost ⇒ `d.ghostY` untouched" on the home path as it already does on the
overlay↔overlay path (§3, F1.3).

### F3-r — Note — recommendation — the `destinationHost` value set is wider than the `env.renderDestination` signature

§3 lists `destinationHost ∈ {overlay, browse-host, home}` (three), while §7's `Env` types
`renderDestination(dest, destinationHost: 'overlay' | 'browse-host')` (two). This is internally
consistent — a `home` destination takes `renderDestination === 'none'` (swipe.js:128), so L2 is never
invoked with `home` — but the narrower signature reads as a contradiction without that link. The plan
should add one line noting `home` never dispatches a render, so the `Env` type is correctly narrower than
the classification field. This is a suggested clarification, not binding; non-blocking.

## Coverage the revised plan must require

Only F1-r is blocking; its coverage is the load-bearing addition:
- **F1-r** — beyond the exact-key updates the plan already lists (§8 F2), the frozen spec
  (`swipe-plan-spec.mjs`) fixes `sourceHost`/`destinationHost` per structural case, and the every-registry-
  pair proof (`swipe-transition.test.js` line 90) asserts them, so a mis-projected host value reddens.
  Mutation that must fail: a source/destination host mapped to the wrong kind passes the key-set gate but
  disagrees with the spec.
- **F2-r** (non-blocking tightening) — a back-to-home transition records `animSync`/`animRes` with
  `d.ghostY` left untouched (parity with today); an app-ghost transition records all three. Mutation:
  L3 writing `d.ghostY = undefined` (or `0`) on the home path where today it is never assigned.
- **F3-r** (no runtime surface) — a documentation recommendation on the plan prose (one clarifying line
  linking `home ⇒ renderDestination 'none'` to the narrower `Env` signature); it owes no test.

## Prediction — where this breaks in execution if built as written

The builder relocates cleanly this time — the seam, the ledger, and the effect table give it an owner for
every crossing the round-1 draft left standing. It reaches the frozen spec and finds `classifyTransition`
now returns `sourceHost`/`destinationHost`, updates the two exact-key registrations, and every test stays
green — including a projection that is subtly wrong for one kind, because nothing pins the host **value**.
The mis-host ships silent behind a green frozen-model suite, which is the one failure this module was
built to make impossible (F1-r). Separately, at `snapshotHome`'s capture the builder must satisfy a
`Capture` type carrying a `ghostY` the home snapshot never had, and invents one — harmless on read
(diagnostics null-guard it) but a contract the code does not honour (F2-r). Both are visible now, in the
code the plan cites.

## What passes temper

The chosen boundary and the seam architecture are sound and were re-checked, not re-asserted. Deriving
classification inside `buildConstruction` from `from`/`dest` genuinely closes the round-1 two-source
hazard (identity and derived classification cannot disagree because there is one source). The exact-key
contract change is pinned in both real sites and nowhere else. Every ambient read is routed through `env`,
including the `Element`-feature-check silent-bypass that round-1 F4 flagged. The effect-ownership table
assigns all of `showAppView` and the overlay branch across L1/L2/L3 with ordering preserved, and L2 reads
`d.from.v` by closure so the stale-overlay exception survives. The outgoing-capture-before-clobber
invariant is pinned with a reddening mutation — the browse→browse flash guard. `GHOST_BG` fresh per
gesture removes the top-level DOM read and the staleness question together. The step is buildable once the
host projection is fixed in the frozen spec (F1-r) and the `Capture` type is corrected (F2-r).
