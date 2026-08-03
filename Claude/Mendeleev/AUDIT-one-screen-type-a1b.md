# MENDELEEV — Coverage audit, Stage A1b of ONE SCREEN TYPE (Now Playing parks the page beneath it)

Type: coverage-audit (publish gate — the stage is already shipped)
Target: `e6a2f2e` (build `2026-07-31.290`), audited at HEAD `6fb3b21`, 2026-08-03.
Plan of record: `Claude/Plans/PLAN-one-screen-type.md` — §5.3 (design), §6a (casualty table),
§9 (the five `browseWillHide` edges), §13 steps 7–10, **§14 (the Coverage Model audited against)**.
Red suite of record: `Claude/Curie/RED-one-screen-type-a1b.md` — RED_SUITE_READY.
Build log: `Claude/Brunel/one-screen-type-stageA1b-build.md` — BUILD_GREEN.
Findings-apply: `Claude/Brunel/one-screen-type-a1b-findings-apply.md` (F1–F4 of the code review).
Code review: `Claude/Poirot/POIROT-one-screen-type-a1b-e6a2f2e.md` — PASS, fix-then-ship; its
**F5 and F6 are routed here** and are adjudicated below.
Adversary: `Claude/Loki/STRIKE-one-screen-type-a1b.md` — HELD_STONE; its **lesser plane 4** is
routed here and is adjudicated below.
Tree: clean before and after every command; no `*.mutbak` at any point.

Verdict: GAPS_NAMED — three bare cells, each with its occupant stated below.

The suite proves the stage's *statements*: every one of the eleven registered mutants on this
cell family is caught at HEAD, by the cell that names it, re-swept in the foreground this pass.
What it does not prove is the stage's *paths and its licence*. The one cell that drives the
Now Playing abort-reconcile path asserts a **relative** property and is therefore structurally
unable to fail on two of the three things that path must put back (G1). The single-writer
enumeration that licenses retiring a ratified user-decision item is verified by hand and gated by
nothing (G2). And the Coverage Model's own `NPUNTOUCHED` row names an assertion the cell has never
carried (G3). None of the three is a defect in shipped behaviour; all three are places where the
suite would stay green while the design stopped holding.

**The campaign gate accepts `ADEQUATE` alone, so this filing leaves the `coverage-audit` row of
`Claude/Campaigns/one-screen-type-a1b.json` unmet. That is the gate working, not a filing error.**
Closing it needs the three cells authored by the test author and a re-audit; proceeding to the
step-9 device gate without them is the user's call, made with the gaps in view.

---

## Phase 1 — The ground: what Stage A1b claims

A1b's product change is two deleted conditions in `js/nav.js` `setView()` and nothing else. Its
claims, taken from §5.3, §5.3.3, §5.3.6 and the shipped comments, are:

| # | Claim | Source |
|---|---|---|
| C1 | Entering Now Playing parks `#home`, hides `#browse` and hides all six settings screens, exactly as entering any other screen does | §5.3.3; `js/nav.js:48-70` |
| C2 | The `browseWillHide` hook fires once on the NP-entry shown→hidden edge, while `#browse` is still un-hidden | §9 edge 4 |
| C3 | An aborted NP gesture's own `applyScreen('nowplaying')` re-parks and re-hides whatever the gesture un-parked or un-hid, so screens cannot accumulate | §5.3.1, §5.3.3 |
| C4 | Edge 3 **relocates** to the abort; the NP close no longer crosses the edge at all | §5.3.4, §6a |
| C5 | Now Playing keeps every one of the 24 load-bearing differences at HEAD — background, `inset: 0`, `z-index: 60`, the navbar takeover, `np-locked` | S4; `DecisionLog:1147-1167` |
| C6 | **The licence.** `hidden` is *added* to `#nowplaying` in exactly one place in `js/`, and the same synchronous `setView` body un-hides the destination two lines earlier — so the destination is mounted at the instant NP is hidden, **on every path, by construction** | §5.3 step 3; `PROBE-np-uniqueness.md` §9.1 |
| C7 | A1b opens no second reconcile window: it adds no timer, listener, rAF or promise | §5.3.6 |
| C8 | A pending filmstrip reconcile firing after NP was opened by button is idempotent | §5.3.6 |
| C9 | Edge 5 (supersession while NP is current) needs no cell because its `setView` contract is byte-identical to edge 4's | §9, §14 |
| C10 | The user-visible outcome — no longer three screens rendering through each other — is **device-owed**, not CI's | §14, step 9 |

C6 is the load-bearing one. It is what licenses retiring probe §4.2, an item the user's ratified
decision incorporates **by reference** (`DecisionLog:1162-1163`). Everything else in the stage is
downstream of it.

## Phase 2 — The matrix (fixed before the sweep)

Ten cells, derived by crossing §14's A1b rows with the claims above and with the catalog. Every
cell appears in Phase 3 with a status.

| Cell | The provable claim | Where it should live |
|---|---|---|
| M1 | NP entry hides `#browse` and fires the hook once, observed un-hidden | `NPPARKS` (from Browse) |
| M2 | NP entry hides the settings screen it was opened over | `NPPARKS` (from a settings screen) |
| M3 | NP entry parks `#home` | `NPPARKS` (from Home) |
| M4 | NP entry leaves `np-locked` set and `#nowplaying` un-hidden | `NPPARKS` |
| M5 | An aborted NP gesture **re-hides** the `#browse` its own mid-drag render un-hid | `NPRECONCILE`, `PEERFINALIZE` edge 3 |
| M6 | An aborted NP gesture **re-parks** the `#home` its own mid-drag render un-parked | `NPRECONCILE` |
| M7 | The `browseWillHide` edge fires at the **abort** and NOT again at the NP close | `PEERFINALIZE` edge 3 relocated |
| M8 | `.nowplaying` keeps its background, `inset: 0`, `z-index: 60`, `position: fixed` | `NPUNTOUCHED` source-scan |
| M9 | The `body.np-locked` navbar rule still raises the navbar above NP's `z-index: 60` | §14 assigns this to `NPUNTOUCHED` |
| M10 | `hidden` is added to `#nowplaying` in exactly one place in `js/` — and a second writer cannot appear silently | §14 assigns it nowhere |

## Phase 3 — The sweep, cell by cell

**Executed this pass** (node at `C:\Users\nzilb\tools\node-dist\node.exe`; `node` is not on PATH):

```
node --test "test/*.test.js"        -> 824 tests / 823 pass / 0 fail / 1 skipped (28.0s)
                                       the one skip is the pre-existing device-only KEEPER cell
                                       (test/swipe-stage6*.test.js), unrelated to this stage
git status --porcelain              -> empty, before and after
find . -name "*.mutbak"             -> none, before and after
```

**Mutation sweep — re-derived from NAMES, not from any prior log's indices** (the registry is 135
entries at HEAD; the build log's numbers no longer address the same mutants). Run in the
**foreground** with an explicit timeout, targeted, on the whole `one-screen-type` family plus the
`browse-decouple` mutant the A1b de-indent re-anchored:

```
node tools/mutation-sweep.mjs 76 85 86 87 88 89 90 91 92 93 94
  #76 caught (1)  browse-decouple PINGONE
  #85 caught (6)  one-screen-type PEERPARK/PEERFINALIZE-b
  #86 caught (2)  one-screen-type NOSETTINGSBG-b     — NPUNTOUCHED + NOSETTINGSBG
  #87 caught (2)  one-screen-type ONEPAGE
  #88 caught (5)  one-screen-type PEERPARK/PEERFINALIZE-a
  #89 caught (1)  one-screen-type NPPARKS-a          — NPPARKS from Home, ALONE
  #90 caught (3)  one-screen-type NPPARKS-a'         — PEERFINALIZE edge 3, NPPARKS from Browse, NPRECONCILE
  #91 caught (2)  one-screen-type NPPARKS-b          — nav.test.js (inverted cell) + NPPARKS from settings
  #92 caught (2)  one-screen-type NOSETTINGSBG-a
  #93 caught (2)  one-screen-type NOSETTINGSBG-a'
  #94 caught (7)  one-screen-type PEERPARK-c
  swept 11: 0 uncaught, 0 unapplied, 0 stale flags
```

This re-sweep was necessary rather than ceremonial: the F1–F4 apply pass edited two of these test
files after the code review's own sweep, and a mutation result stops being true when the suite
changes. It reproduces the review's nine and adds `#92`/`#93`.

**The single line of that output that carries this audit's headline finding is `#89`.** It is
caught by `NPPARKS` from Home and by **nothing else** — `NPRECONCILE` passes under it.

| Cell | Status | Evidence |
|---|---|---|
| M1 | **SWEPT** | `one-screen-type-npparks.test.js:90-114` asserts `hidden('browse')`, `hook.calls === 1` and `hiddenWhenCalled === [false]`. Forced by `#90`; also killed by `PEERFINALIZE` edge 3 and `#94`. |
| M2 | **SWEPT** | `…-npparks.test.js:116-137` asserts `unhiddenOfSix() === []` from an `options` source. Forced by `#91`, with `test/nav.test.js`'s inverted cell as a second killer. |
| M3 | **SWEPT** | `…-npparks.test.js:139-156` asserts `parked('home')` from the Home source — the only source that isolates the park toggle. Forced by `#89`. |
| M4 | **SWEPT** | Same cell, `:151-155`: `#nowplaying` un-hidden, `np-locked` set. Not independently mutated; both are single statements adjacent to the deleted guards and their absence would redden other cells. |
| M5 | **SWEPT** | `PEERFINALIZE` edge 3 (`one-screen-type-finalize.test.js:229-233`) asserts `isHidden('browse') === true` **absolutely** after the NP→files abort. Forced by `#90`. `NPRECONCILE` also reddens under `#90`, at its second abort. |
| M6 | **BARE — G1** | `NPRECONCILE` is the only cell that drives it and it cannot fail on it. See G1. |
| M7 | **SWEPT** | `…-finalize.test.js:234-251`: `rec.calls === 1` at the abort, still `1` after the NP close, recorder installed **before** the abort. The second half — that the edge *moved* rather than duplicating — is asserted, which is what makes the relocation a proof rather than a re-point. |
| M8 | **SWEPT, narrowly** | `one-screen-type.test.js:202-216`. Green at HEAD by construction; its failability is carried by mutant `#86`, confirmed by execution here. **Narrowly**: only the `background` assertion is mutant-defended; `position: fixed`, `inset: 0` and `z-index: 60` are not — now disclosed in the cell itself by the F1 apply. Graded Note (N1), not a gap: those three assertions can still fail, they merely have no registered mutant proving it. |
| M9 | **BARE — G3** | No test in the suite reads `body.np-locked .navbar`'s `z-index: 70` (`css/app.css:629`). Grepped: `np-locked` appears in four test files, always as a **body class** assertion, never as the CSS stacking rule. §14 requires it of `NPUNTOUCHED`; the cell has never carried it. This is Poirot's F5, first half — **confirmed**. |
| M10 | **BARE — G2** | No gate. See G2. This is Loki's lesser plane 4 — **confirmed**. |

### The casualty census — all five accounted for

§6a enumerates four; five occurred. Each was checked against the design change rather than against
convenience, and in each case the dimension survives in a cell that can still fail:

| Casualty | Disposition | Does the dimension survive? |
|---|---|---|
| `NPUNTOUCHED`'s hub class-state cell (`one-screen-type.test.js:196`) | Deleted | **Yes** — subject relocated to `NPPARKS` from a settings screen, which asserts the inverted truth over the same element and kills `#91`. |
| `NPUNTOUCHED`'s sub class-state cell (`:211`) | Deleted | **Yes** — same relocation; `SETTINGS_SUBS` are inside `unhiddenOfSix()`. |
| `test/nav.test.js`'s "NP leaves the settings overlays as they were" | **Inverted**, not deleted | **Yes**, and it is a live second killer of `#91`. This is the casualty §6a's table missed; the build recorded it. |
| Mutant `#104` (`NPUNTOUCHED`) | De-registered | **Yes** — its intent (restore the settings exemption) is now modelled by `NPPARKS-b`; the cell it defended is defended by `NOSETTINGSBG-b` instead, executed. |
| Mutant `#106` (`PEERPARK`/`PEERFINALIZE-a`) | Re-pointed as a two-part `also` | **Yes** — `#88`, five killers. |

No assertion was weakened to green a cell: the three A1b cells were unskipped, not edited, and the
diffs are the skip constant and re-indentation.

### The device-owed set is not over-claimed anywhere

Checked at four sites: the build log's "What remains device-owed", plan §15 R-H and §13 step 9,
`Claude/Zelda/Board.md`, and the three A1b test files' own scope headers. All four state plainly
that jsdom has no layout or paint and that no cell asserts visibility, occlusion or stacking. I
looked for a cell quietly claiming the visual outcome and found none — `NPRECONCILE`'s header is
explicit that it asserts class state and calls the reported outcome device-owed. **Step 9 remains
unrun**, and it now correctly carries the adversary's added item (scroll Books deep → open NP →
close → you must land where you were), which is Blink-proven and WebKit-owed. Nothing claims it
covered.

---

## Phase 4 — The bare cells, each with its occupant

### G1 — Gap. `NPRECONCILE` asserts a relative property, so it is blind wherever the defect is already present at entry

**The cell.** `test/one-screen-type-npreconcile.test.js` captures `entry = liveBeneathNP(h)` as an
**instrument reading**, drives two real aborts, and asserts `after1 === entry` and
`after2 === entry`. The reason is recorded (`RED-one-screen-type-a1b.md` §"why the entry state is
read, not asserted"): pinned to `[]` the cell halts on `NPPARKS`'s invariant and never drives a
gesture. That reasoning is sound about the *entry* assertion. Its cost was never stated.

**The cost, by execution.** A relative assertion cannot fail when the defect is present *at entry
too*, because the defective entry moves the baseline with it.

- Under `#89` (`NPPARKS-a` — the `npOpen` guard restored on the park toggle alone): NP entry leaves
  `#home` un-parked, so `entry = ['home']`; abort 1 un-parks an already-un-parked `#home`, so
  `after1 = ['home'] === entry`; abort 2's `#browse` re-hide is unguarded, so `after2 = ['home']`
  too. **`NPRECONCILE` passes.** The sweep confirms it: `#89 caught (1 failing)`, and the one
  failing test is `NPPARKS` from Home.
- Under `#91` (`NPPARKS-b` — the settings loop restored): the same shape. `NPRECONCILE` opens NP
  from Home with all six settings already hidden and neither abort has a settings destination, so
  the mutant is invisible to it. Sweep: `#91`'s killers are `nav.test.js` and `NPPARKS` from a
  settings screen only.
- Only `#90` reddens it, and only at the **second** abort — exactly as the red run recorded
  (`RED-one-screen-type-a1b.md`: at HEAD, entry `[home]`, after abort 1 `[home]`, after abort 2
  `[home, browse]`). **The `after1 === entry` assertion has never failed, under any registered
  mutant or at pre-A1b HEAD.**

**Why this is a gap and not a quibble.** `NPRECONCILE` is the **only** cell that drives
`applyScreen('nowplaying')` on a gesture-finalize path. Claim C3 — the abort puts back what the
gesture took away — is proven there for `#browse` and for nothing else. The `#home` half is proven
only on the **button-nav** path, by `NPPARKS` from Home. That is precisely the shape of gap
`PEERFINALIZE` was written to close for Stage A1, in the plan's own words: *"A change to this guard
that is proven only on the button-nav path is the same shape of gap."* A1b re-created it on the NP
path. It is also step 1 of the plan's own three-step accumulation narrative — the step the cell's
own header quotes verbatim and cannot fail on.

**The occupant.** One additional assertion in the same cell, placed **after abort 1**, asserting
the `#home` park **absolutely**:

- **What it must force:** a real NP→home back-swipe driven to **abort** through the shipped touch
  listeners, whose mid-drag `renderDestination` has already removed `parked` from `#home` (the cell
  already asserts that as fixture sanity at `:93-95`, so the forcing is proven implementable).
- **What it must assert:** `h.$('home').classList.contains('parked') === true` after the abort
  settles — not equality with `entry`. Message: the abort's own `applyScreen('nowplaying')` must
  re-park the `#home` its own mid-drag render un-parked; §5.3.1 step 1.
- **Oracle kind:** feature oracle on the finalize path — it executes the reconcile and asserts the
  end state, rather than asserting the system did the same thing twice.
- **Why it cannot halt the cell early:** it runs after a gesture has been driven, so the objection
  that produced the relative form (halting on `NPPARKS`'s entry invariant before driving anything)
  does not apply to it. The `entry`-relative growth assertions stay exactly as they are; this is
  additive.
- **Mutation evidence it must produce:** `#89` (`NPPARKS-a`) must gain `NPRECONCILE` as a second
  killer. Today `#89` has exactly one, which is the measurable signature of this gap.
- **Recommended companion, same shape:** a third abort (or a second scenario) with a **settings**
  source and a settings destination, asserting `hidden('options') === true` absolutely after the
  abort, so `#91` likewise gains `NPRECONCILE` as a killer and the settings axis of C3 is proven on
  the finalize path rather than only at entry.

**Owner: the test author (Curie).** No production change is implied; the behaviour is correct.

### G2 — Gap. Nothing gates single-writer-ness on `#nowplaying`'s `hidden` — the stage's licence is a hand enumeration

**The claim.** C6. `hidden` is added to `#nowplaying` in exactly one place in `js/` (`js/nav.js:71`
at HEAD), and the same synchronous `setView` body un-hides the destination two lines earlier
(`:69-70`). This is not decoration: it is the proof that retires probe §4.2, an item
`DecisionLog:1162-1163` ratified **by reference**, and it is the whole difference between A1b being
a licensed change and an unlicensed one. §5.3 calls it "a property of one function body rather than
an enumeration of callers that could be incomplete", and the plan cites it in preference to the
close-path table for exactly that reason.

**What holds it up today.** A human enumeration, done twice — once by the deriver
(`PROBE-np-uniqueness.md` §9.1) and once, exhaustively and independently, by the adversary
(`STRIKE-one-screen-type-a1b.md` Phase 3: every `classList` add/toggle, every `className`
assignment, every `setAttribute('class'…)`, every `style.display` write, every `el.hidden =`
property write, vendor included). Both agree. **Neither is a gate.** A second writer added
tomorrow — in `js/app.js`, in a new module, or by a `className` assignment the eye skips — greens
the entire suite, and the stage's licence becomes false with no test reddening and no diff signal.
The plan's §14 assigns this claim to no cell at all; §16 specifies two gates and neither is this
one. Loki filed it as gate-rot and routed it here; **I agree it is a gap, and it is the sharpest
one on this stage** because it is the only finding where the suite's silence would be mistaken for
the design still holding.

**The occupant — and the project already ships the pattern.** `test/scroll-writer-set.test.js`
(`M1WRITERSET`) pins every textual vertical-scroll writer in `js/` by its **source text**, in both
directions, with a group-count direction, a selftest, a named vendor exclusion pinned by content
hash elsewhere, and an explicit statement of what it does **not** claim. Copy that shape:

- **What it must derive:** every textual site in `js/` (first-party; `js/vendor/**` excluded with
  its reason, reusing `test/vendor-exclusion-pin.test.js`'s identity pin) that can put an element
  into the hidden state — `.classList.add('hidden')` / `.toggle('hidden'…)` / `.className =` /
  `.setAttribute('class'…)` / `.style.display =` / `.hidden =`. Comments stripped, string-aware, as
  `M1WRITERSET` already does.
- **What it must assert, in three directions:** (1) every derived site is in a registered baseline
  carrying a **target**, an **owner** and a one-line reason it cannot reach `#nowplaying`; (2) every
  registered entry still occurs in source (so the inventory cannot rot); (3) exactly **one**
  registered entry targets `#nowplaying`, and it is `setView`'s `$('nowplaying').classList.toggle`.
- **What it must NOT claim, stated in the cell:** it is the **textual** bound. A target resolved at
  runtime, an aliased element reference, or a write through `Object.assign` is outside its reach —
  registered as a residual, never smoothed over. `M1WRITERSET`'s own wording is the model.
- **Anti-vacuity:** assert the derivation walked a non-empty file set and found a non-zero number
  of sites, exactly as `M1WRITERSET:247-250` does. A derivation over an empty glob passes every
  comparison silently, and this project has already paid for that class of gate.
- **Oracle kind:** a source-derived inventory gate — green at HEAD by design, a **lock**, not a red
  cell. Its ability to fail is carried by a registered **additive** mutant (inject a second
  `#nowplaying` hidden writer) plus a selftest driving the comparison against synthetic in-memory
  inventories, both of which `M1WRITERSET` demonstrates.
- **Second, cheaper half, if the full inventory is judged too much for this stage:** the **synchrony**
  half of C6 is also ungated — that the destination un-hide precedes the NP toggle *in the same
  synchronous body*. A source-order assertion (`js/nav.js`'s `setView` body contains the
  `browseEl` toggle and the six-way loop **before** the `$('nowplaying')` toggle, with no `await`,
  `requestAnimationFrame` or `setTimeout` between them) is a handful of lines and pins the half a
  reordering refactor would break.

**Owner: the test author (Curie),** with a §14 row owed from the planner so the cell has a home in
the Coverage Model rather than arriving as an orphan.

### G3 — Gap. §14's `NPUNTOUCHED` row requires a navbar assertion the cell has never carried

**Poirot's F5, first half — confirmed by grep and by reading the cell.** §14 specifies
`NPUNTOUCHED`'s fixture as *"read the shipped stylesheet and assert the Now Playing rule declares
background var page-bg and inset 0 and z-index 60 **and that the body np-locked navbar rule still
raises the navbar above it**"*. The shipped cell (`one-screen-type.test.js:202-216`) asserts
`position: fixed`, `inset: 0`, `z-index: 60` and `background` on the `.nowplaying` rule, and says
nothing about the navbar. Pre-existing — authored so at Stage A1 — and not A1b's doing, but
**`NPUNTOUCHED` is the standing guard on the ratified "Now Playing stays unique" constraint, and
the plan itself says that job "matters more after A1b, not less, because A1b is the only stage that
touches NP at all."** The navbar takeover is one of the 24 load-bearing differences S4 protects
(probe §4.3 marks `np-locked` load-bearing). Deleting `z-index: 70` from `css/app.css:629` today
reddens nothing.

**The occupant.** One assertion in the existing `NPUNTOUCHED` source-scan cell, using the same
`ruleBody` helper already in the file:

- **What it must force:** read `css/app.css` and resolve the rule whose selector is exactly
  `body.np-locked .navbar`.
- **What it must assert:** the rule exists (`body != null`, the anti-vacuity guard the cell already
  applies to `.nowplaying`) **and** its body declares `z-index: 70` — a value strictly above
  `.nowplaying`'s `60`, which is the property the decision names. Message: the navbar takeover is
  one of the load-bearing differences the user's decision protects; a navbar that stops outstacking
  Now Playing is Now Playing becoming an ordinary screen, which is what S4 forbids.
- **Oracle kind:** source scan — the same kind as the four assertions beside it, and correctly
  **not** a rendered-stacking assertion, which jsdom could not fail.
- **Mutation evidence:** register one additive mutant deleting `z-index: 70` from `css/app.css:629`
  and confirm it reddens this cell alone. Without it the assertion joins N1's undefended set.

**Owner: the test author (Curie).**

---

## Findings, by severity

| # | Severity | Finding | Owner |
|---|---|---|---|
| G1 | **Gap** | `NPRECONCILE`'s relative assertion cannot fail on the `#home` re-park (or the settings re-hide) at the abort; `#89` and `#91` pass it. C3 is proven on the button-nav path only. | Curie |
| G2 | **Gap (structural in effect)** | No gate on `#nowplaying` `hidden` single-writer-ness. The stage's licence (C6) rests on a hand enumeration; a second writer greens the suite. | Curie (+ a §14 row from the planner) |
| G3 | **Gap** | §14's `NPUNTOUCHED` row requires a `body.np-locked` navbar stacking assertion the cell has never carried. | Curie |
| M1 | **Misleading** | `test/page-bg-single-painter.test.js:12-14` states the retired mechanism as current — `.nowplaying` "mounted over an untouched settings screen for the NP-back reveal". **A second site in the same file**, the assertion message at `:55-56` (".nowplaying that stops painting exposes the settings screen it is mounted over"), states the same retired mechanism and is the text a maintainer reads at the moment the cell fails. Poirot's F6 named `:13`; the assertion message is the sharper of the two and was not named. | Brunel — and **not** deferred to step 17: `:55-56` contains no "additive overlay" phrase, so the phrase-scoped scrub does not reach it. Same class as §12 item 34. |
| M2 | **Misleading (model)** | §14's `NPRECONCILE` fixture spec reads *"assert after each abort that exactly one screen element besides nowplaying lacks both the hidden and the parked class"*. Under A1b that number is **zero**, not one — "one" describes the **defective** pre-A1b state. A test author following §14 literally would author a permanently-red cell; the shipped cell instead uses a relative form that matches no part of §14. This is the model sentence sitting directly upstream of G1. | the planner |
| M3 | **Misleading (model)** | §14's mutation column has drifted and its total is right by coincidence. It declares "seventeen mutants" across ten cells; the registry holds **14 distinct entries** for the eight shipped cells, of which §14 accounts for ten. Four registered mutants appear in **no** §14 row: `#90` `NPPARKS-a'`, `#93` `NOSETTINGSBG-a'`, `#94` `PEERPARK-c`, `#95` `FILMSTRIPDRAG` (the 340ms safety-net mutant). Three are double-counted: the `PEERPARK`/`PEERFINALIZE` pair is counted twice (`#88`, `#85` are one pair, not two), and `NOSETTINGSBG-b` (`#86`) is counted once as `NOSETTINGSBG`'s and again as `NPUNTOUCHED`'s. The two errors cancel to 17. **Poirot's F5 second half (`NPPARKS` "two" vs three registered) is confirmed and is one instance of this pattern, not an isolated slip** — the build's stated reason for splitting `NATURAL-a` into `a`/`a'` is mechanically correct and no dimension is added or dropped; the model was simply never amended. | the planner |
| N1 | Note | Three of `NPUNTOUCHED`'s four `.nowplaying` assertions (`position: fixed`, `inset: 0`, `z-index: 60`) have no registered mutant. Not a bare cell — the assertions can still fail on a real deletion — but for a preservation cell that is green at HEAD by construction, mutation is the only evidence of failability, and the cell now says so honestly after the F1 apply. Three additive mutants would close it for the cost of nine lines. | Curie, low priority |
| N2 | Note | C8 (a pending filmstrip reconcile after an NP-by-button open is idempotent) has **no CI cell**. It was executed by the adversary in a real Blink engine (run FW) and held. The cheap occupant is a fourth `FILMSTRIPDRAG` window: open the `closeSub` filmstrip with fake timers, tap the transport inside the ~340ms net, advance past it, and assert the un-hidden set is unchanged across the reconcile. Filed as a note rather than a gap because the behaviour is the six-way loop `NPPARKS` already proves plus an idempotence that was executed. | Curie, optional |
| N3 | Note | C9's re-open condition (edge 5 owes a cell the moment its path acquires an effect edge 4's path does not have) is a **discipline** checked at step 16, with no structure behind it. The plan's own standard is that a rule enforced by memory is vigilance. Naming it so the next audit does not read the ruling as permanent. | the planner |

**Not findings, checked and cleared.** The `showAppView` sweep is not re-opened (settled by
execution at the A1 review; `js/app.js:522` is byte-identical in the diff). The pull-to-refresh
guard (`js/app.js:1236`) is a genuine composition axis — A1b newly parks `#home` under NP and that
guard reads `.parked` — but it is clean by construction: the `currentDesc().v !== 'home'` clause
already returns before the park check on every NP path, so the new park cannot change its outcome.
No cell is owed.

---

## Catalog — every dimension, with a status

| # | Dimension | Status for Stage A1b |
|---|---|---|
| 1 | **Lifetime and reuse** | **Applicable, partly swept.** The long-lived objects here are `#browse`'s virtual controller and the screen elements' own state across repeated gestures. `NPRECONCILE` is the warm-state cell — it drives two consecutive aborts on **one** live app instance, which is the correct shape — but G1 is a hole in exactly this dimension: the cell is warm and still cannot see the `#home` half. A second lifetime fact, scroll offset surviving the new `display:none`, was executed by the adversary on Blink and is WebKit device-owed (step 9); no CI cell can reach it and none claims to. |
| 2 | **Trust boundaries and hostile inputs** | **Not applicable.** A1b changes no input surface. `setView`'s argument domain, `applyScreen`'s options and every injected dep are unchanged; the stage deletes two conditions and validates nothing new. |
| 3 | **Concurrency** | **Applicable, partly swept — and this is where G2 sits.** The interleavings the design permits are covered unevenly: the filmstrip-reconcile-vs-gesture windows by `FILMSTRIPDRAG` (three cells, four mutants, from A1-fix/r2); the abort/finalize interleaving by `NPRECONCILE` and `PEERFINALIZE` edge 3; supersession (edge 5) **deliberately uncovered** by a plan ruling on byte-identity, which the adversary then executed in a real engine and confirmed benign (run E5); the NP-inside-the-filmstrip-window residue executed but not celled (N2). **Single-writer violation is an explicitly named member of this dimension, and it is bare (G2).** |
| 4 | **Shape and platform matrices** | **Applicable, correctly device-owed.** The matrix here is jsdom vs WebKit. Every visual claim is on the device row and none is claimed by CI; the adversary's Blink bench is recorded as Blink, not as the device. **Step 9 is unrun** and the suite over-claims nothing about it. |
| 5 | **Failure and rejection paths** | **Not applicable.** A1b introduces no error path, no diagnostic and no degraded mode. Nothing in `setView` can now fail that could not before — the deleted conditions were guards, not validators. |
| 6 | **Numerical edges and determinism** | **Not applicable.** No arithmetic, no float, no hash, no pinned constant. (The nearest thing, the 340ms filmstrip net, is a timing constant owned by A1-fix's cells, not by this stage.) |
| 7 | **Contract claims** | **Applicable, and the dimension with the most residue.** C1–C5 and C7 map to cells and are swept. **C6 maps to nothing (G2).** C8 maps to nothing in CI (N2). C9 is a ruling with a memory-enforced re-open condition (N3). Two absolutes in shipped prose still state a retired mechanism (M1). |
| 8 | **Composition** | **Applicable, swept.** NP crossed with each coexisting mode: × Browse source (`NPPARKS`, `#90`), × settings source (`NPPARKS`, `#91`), × Home source (`NPPARKS`, `#89`), × gesture abort (`NPRECONCILE`, `PEERFINALIZE` edge 3), × filmstrip window (executed, N2), × supersession (ruled, executed), × pull-to-refresh (cleared above, no cell owed), × sign-out (destination is `home`, mounted — unchanged by A1b and covered by the existing nav suite). The one pair where composition is *asserted* but not *failable* is NP × abort on the `#home` and settings axes, which is G1. |
| 9 | **Persistence round-trip and version evolution** | **Not applicable to storage** — nothing here is persisted; screen visibility is in-memory class state. **The adjacent in-memory round trip — a scroller's offset across an ancestor `display:none` — is applicable, was executed on Blink by the adversary, and is device-owed on WebKit** (step 9, item 4). No CI cell can express it; none pretends to. |
| 10 | **Functional achievement (the feature oracle)** | **Applicable, swept at the mechanism level; the visual achievement is device-owed and correctly not claimed.** `NPRECONCILE` is a genuine feature oracle in shape — it boots the real app, drives real touch sequences through the shipped listeners, and asserts the world's end state rather than that the system did the same thing twice. It is not a consistency oracle and the suite is not built only from those. What it cannot assert is the achievement the user actually reported — *no longer seeing three screens at once* — which is paint. That is honestly assigned to step 9, and step 9 is **unrun**. G1 is the qualification on this row: the oracle executes the feature but asserts a relative end state, so on two of three axes it would report success against a world that did not reach the intended state. |

Every dimension appears. None was dropped silently.

---

## Phase 6 — The forward read: where the next externally-found defect on this stage lives

Read off the bare cells, not guessed:

1. **A second writer of `hidden` on `#nowplaying`, added by a future stage, that no test notices**
   (G2, dimensions 3 and 7). This is the highest-probability next defect on this surface and the
   one with the worst blast radius, because it does not break a test — it silently falsifies the
   argument that retired a ratified user-decision item, and the next reader finds a plan citing a
   proof that is no longer true. The likeliest carriers are Stage B (which rewrites `isOverlay`'s
   membership and touches `js/swipe.js`'s classification) and any future work that adds a
   `showAppView`-shaped sweep. Note that `js/app.js` **already** contains two sweeps that add
   `hidden` to screen elements (`:522` settings, `:535` `#browse`); a third, widened by one name to
   include `nowplaying`, is a one-word change that reddens nothing.
2. **A change to the NP finalize path that stops re-parking `#home`** (G1, dimensions 1 and 8).
   Reachable by any edit that makes `applyScreen`'s NP branch conditional, or that re-introduces a
   `keepGhosts`/`render`-style option reaching the park block. It would reproduce §5.3.1 step 1
   exactly — an aborted NP→home swipe leaving `#home` live beneath NP — under a fully green suite,
   and it would surface on the device as the same photograph that opened this stage.
3. **A "consistency fix" to `body.np-locked .navbar`** (G3, dimension 7). The navbar rule is the one
   member of the ratified 24 with no guard at all, and it is the kind of rule a stacking cleanup
   touches without malice. `NPUNTOUCHED` would stay green while the navbar dropped behind Now
   Playing.

The prediction is earned by the completed sort above, not by the interesting parts: every cell of
the Phase-2 matrix carries a status, all ten catalog dimensions carry a decision, and the three
bare cells are the only three.

---

## Handoff

- **Source artifact** — `Claude/Plans/PLAN-one-screen-type.md` §14, audited against the shipped
  suite at `6fb3b21`.
- **Status** — GAPS_NAMED. Three bare cells (G1, G2, G3), three misleading statements (M1, M2, M3),
  three notes (N1, N2, N3).
- **Decisions made** — Poirot's F5 is **confirmed in both halves** and its second half is a
  symptom of a wider §14 mutation-column drift (M3). Poirot's F6 is **confirmed and widened** to a
  second site in the same file that the phrase-scoped scrub cannot reach (M1). Loki's lesser plane
  4 is **confirmed as a coverage gap** and filed as a specification (G2). Edge 5's exclusion is
  **upheld** as a plan ruling, with its re-open condition noted as unmechanized (N3).
- **Open questions** — none for me; all three gaps are specified rather than raised.
- **Next owners** — the test author (G1, G2, G3, N1, N2); the planner (M2, M3, N3, and a §14 row for
  G2's cell); the builder (M1, and not deferred to step 17).
- **Required evidence before this stage's coverage-audit gate can accept** — G1's absolute
  post-abort assertion producing `NPRECONCILE` as a second killer of `#89`; G2's writer-set gate
  with its additive mutant and selftest; G3's navbar assertion with its additive mutant; then a
  re-audit.
- **Still owed and NOT covered by anything here** — the **step-9 device gate**, including the
  adversary's scroll-preservation item. Nothing in the suite or in the records over-claims it.
- **Records updated** — this file; `Claude/Zelda/Board.md`.

— Mendeleev, 2026-08-03. Eleven mutants swept in the foreground, ten cells walked, ten dimensions
decided. The suite proves what the stage does; three cells are missing before it proves what the
stage promised.
