# RED suite — PLAN-swipe-declone.md Stage 2 (`browse→browse` de-clone)

**Date:** 2026-08-01
**Plan:** `Claude/Plans/PLAN-swipe-declone.md` §14 Coverage Model, step 9 of §13.
**Forge:** `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r4.md`.
**HEAD authored against:** `9bd3dfe`, build `2026-07-31.290`.
**Verdict:** `RED_SUITE_READY`.

The thirteen Stage-2 cells the plan names are authored. Every cell that CAN be red at HEAD IS red at
HEAD, verified by running each with its skip removed; the quoted failure of each is in §2. The cells
that cannot be red are named as gates or guards rather than counted as red — a gate protects a
shipped invariant, so it is green at HEAD by construction and its mutants are what give it teeth.

## 1. Files

| File | Cells |
|---|---|
| `test/swipe-declone-stage2-css.test.js` | PAGEISVIEW, PARKBOXEQUAL, BROWSESURFACE, MOVERHASBOX, PARKLOSESTRANSFORM |
| `test/swipe-declone-stage2-construction.test.js` | MOVERSDISTINCT (recipe layer), NOGHOSTATALL, NPPILLIDS |
| `test/swipe-declone-stage2-reset.test.js` | RESETCOVERSPAGES |
| `test/swipe-declone-stage2-browse.test.js` | MOVERSDISTINCT (app-harness layer), PAGEOWNSSCROLL, ENTRYNOZERO, LANDEDPAGESHOWS, ABORTNORENDER |

Every red cell is committed behind `{ skip: SKIP_* }` (the SKIP-PENDING-BUILD convention
`test/one-screen-type-filmstrip.test.js` and `test/home-park-recipe.test.js` established), because
the pre-commit battery runs the whole suite and this project does not use `--no-verify`. **The
builder removes each skip to drive the cell red, then makes it green. No assertion is weakened to
green a cell.** The skip string on each cell names the plan section and the change that clears it.

## 2. Cells, and what each discriminates

State is against HEAD `9bd3dfe`.

| Cell | State | What it discriminates | Quoted red |
|---|---|---|---|
| PAGEISVIEW | RED | the page is the scroller and the host is not, with the page's scroll/content declarations byte-equal to the ones the retired `#browse` scroller carried | `there is NO '.browsepage' base rule at all` |
| PARKBOXEQUAL | RED | the parked page box cascades from the base rule instead of restating it | `.browsepage.parked declares top: 0` |
| BROWSESURFACE | RED | the indicator claims a `.browsepage`, and the native-scrollbar suppression covers it | `surfaceKind keys on t.id === 'browse' … the indicator REMOVES ITSELF on browse` |
| RESETCOVERSPAGES | RED | an interrupted gesture cannot strand a page at `translateX(±w)` | `.browsepage[0]: transform, transition, willChange, zIndex` |
| MOVERSDISTINCT (recipe) | RED | the classification projects `browse-page` on both ends for the browse→browse pair only | `browse->browse: got in-flow/browse-host want browse-page/browse-page` |
| MOVERSDISTINCT (harness) | RED | the **app-side `env` literal** resolves those hosts to pages, not the host | `#browse carries an inline transform (translateX(-914px)) … 0 .browsepage nodes carry a drag transform` |
| NOGHOSTATALL | RED | no owned pane, no `.nav-ghost` node, no `capture` key | `browse->browse still plans outgoing: 'app-ghost'` |
| ABORTNORENDER | RED | an abort is a transform reset and nothing else | `renders after finger-up: ["books"]` |
| PAGEOWNSSCROLL (container) | GREEN, guard | `o.mount` keeps the container role — the role is SPLIT, not re-pointed | — |
| PAGEOWNSSCROLL (measured element) | RED | each controller measures the page it was built for | `Reads of the page's own scrollTop: 0` |
| ENTRYNOZERO (no write) | RED | re-entry writes nothing unless a position is derived | `host <- 0` |
| ENTRYNOZERO (derived write) | GREEN, anti-vacuity | a build that satisfies "zero writes" by deleting `positionOnEnter` still reddens | — |
| LANDEDPAGESHOWS (contract) | RED | the landing OWNER is named rather than inferred | `expected 2, actual 1` (`Browse.endHold` arity) |
| LANDEDPAGESHOWS (browse→browse) | GREEN, mutant-killer | abort returns to its source and commit lands on its destination, page state and activation both | — |
| LANDEDPAGESHOWS (browse→home) | GREEN, mutant-killer | a landing that names no browse page leaves HEAD's behaviour untouched | — |
| MOVERHASBOX | GREEN, GATE | every id-resolved mover host generates a principal box | — |
| PARKLOSESTRANSFORM | GREEN, GATE | no `.browsepage` rule declares an `!important` transform | — |
| NPPILLIDS | GREEN, GUARD | the pill decoration still strips ids after the ghost builder is deleted | — |

### The three cells that are green at HEAD and stay green — read this before auditing

MOVERHASBOX, PARKLOSESTRANSFORM and NPPILLIDS assert invariants that HOLD at HEAD and that Stage 2
must not break. They are not red-first cells and are not counted as such:

- **MOVERHASBOX** is the structural form of round-1 F1 — the defect where `display: contents` on
  `#browse` made the drag transform inert on four SHIPPED transitions. Its stated invariant is
  narrowed to the id-resolved hosts because Stage 2 adds a fourth resolution path returning an
  element with no id; **PAGEISVIEW is the page's cover**, pinning the base rule's `position:
  absolute` and `inset: 0` textually.
- **PARKLOSESTRANSFORM** guards a cascade dependency the whole `browse→browse` gesture rests on: the
  outgoing mover carries `.parked` for the whole drag and only the absence of `!important` keeps the
  inline write winning.
- **NPPILLIDS** guards the double-occurrence trap in §12 item 4: `js/swipe.js:312` and
  `js/swipe.js:339` are byte-identical and only the first is on the deletion list.

### F23, discharged

`LANDEDPAGESHOWS`'s `browse→home` half **forces virtualization** (`h.VirtualList.setForceVirtual(true)`,
`realBrowse: true`, `books: bigBooks(700)`). NATURAL-c's only channel is a controller-activation CALL
COUNT, and a call count goes vacuously green when the counted thing was never constructible: with the
harness's default two-book library the list renders classic, no `_vctl` exists, and the count is 0 at
HEAD and under the mutant alike. Forced, HEAD's count is ≥ 1 and the mutant's is 0. The cell's own
fixture-sanity assertion states this in its failure message, so a future edit that drops the force
knob fails loudly instead of going quiet. The same reasoning applies to PAGEOWNSSCROLL's
measured-element half, which also forces the virtual path — and which deliberately does **not**
inject `vlOpts` metrics, because the injected-metrics recipe every other virtual test uses REPLACES
the production closure that is the code under test.

### F24, honoured

`ENTRYNOZERO` and `LANDEDPAGESHOWS` are authored to §5.3.6's **construction**, not to its prose. The
plan's sentence "the miss branch is the no-op case" is false for an aborted `home→browse`, where the
destination render has already parked a page (`js/app.js:544` → `js/browse.js:301`). No cell asserts
that no page is ever parked on a miss; the `browse→home` cell asserts what the construction promises
— HEAD's `activeEntry()` inference runs unchanged, observed as an activation count and as class
state on the page the gesture started from.

## 3. Mutants to register at build time

**None of these can be registered at HEAD**: every anchor targets text the build creates, and
`test/mutation-anchors.test.js` fails with `ANCHOR NOT FOUND` on an anchor whose `from` does not
occur. They are registered in the SAME commit as the build (§13 step 10). Anchors marked
**PROVISIONAL** depend on wording the builder chooses; the *identity* of the anchor is fixed, the
literal is not.

Registry arithmetic: 24 new + Stage 1's 5 already registered (NOGHOSTINFLOW 1, HOMESTAYSLIVE 2,
NOAPPCLONE 2) = **29**, matching plan §14.

| # | File | `from` → `to` | Killed by |
|---|---|---|---|
| S2-1 | `css/app.css` | `.browsepage` base: delete `overflow-y: auto;` | PAGEISVIEW |
| S2-2 | `css/app.css` | `.browsepage` base: `padding: 14px 16px 40px` → `padding: 14px 12px 40px` (any value ≠ the retired host's) | PAGEISVIEW |
| S2-3 | `css/app.css` | `#browse` base: re-add `overflow-y: auto;` (two scroll authorities) | PAGEISVIEW |
| S2-4 | `css/app.css` | `#browse` base: `position: fixed` → `display: contents` | MOVERHASBOX |
| S2-5 | `css/app.css` | `#browse` base: delete `position: fixed;` (falls to flow) | MOVERHASBOX |
| S2-6 | `css/app.css` | `.browsepage.parked`: re-add `top: 0;` | PARKBOXEQUAL |
| S2-7 | `css/app.css` | `.browsepage.parked`: delete `overflow: hidden;` | PARKBOXEQUAL |
| S2-8 | `css/app.css` | `.browsepage.parked`: `transform: translateX(-101vw);` → `transform: translateX(-101vw) !important;` | PARKLOSESTRANSFORM |
| S2-9 | `css/app.css` | native-scrollbar suppression: remove `.browsepage` from the `scrollbar-width: none` selector list | BROWSESURFACE |
| S2-10 | `js/scrollbar.js` | `surfaceKind`: delete the `.browsepage` case (returns null) | BROWSESURFACE |
| S2-11 | `js/browse.js` | container ops re-pointed at the active page — PROVISIONAL: `o.mount.innerHTML = ''` → `activeEntry().el.innerHTML = ''` in `reset()` | PAGEOWNSSCROLL (container) |
| S2-12 | `js/browse.js` | `virtualView` metrics closure reads a shared reference — PROVISIONAL: `scrollY: () => m.scrollTop` → `scrollY: () => o.mount.scrollTop` (and `listTop` with it) | PAGEOWNSSCROLL (measured element) |
| S2-13 | `js/nav.js` | `resetSwipeStyles` keeps its id-only element list (drop the `.browsepage` sweep) | RESETCOVERSPAGES |
| S2-14 | `js/browse.js` | `entryScrollY` returns `0` instead of `null` for a list page | ENTRYNOZERO |
| S2-15 | `js/browse.js` | `positionOnEnter` writes even when the derived value is null (drop the null guard around `applyScrollY`) | ENTRYNOZERO |
| S2-16 | `js/swipe.js` | `sourceHost` projection: delete the `browse-page` case so it falls back to `'in-flow'` | MOVERSDISTINCT (recipe) |
| S2-17 | `js/swipe.js` | `destinationHost` projection: delete the `browse-page` case so it falls back to `'browse-host'` | MOVERSDISTINCT (recipe) |
| S2-18 | `js/app.js` | the `env` literal's `browse-page` destination branch returns `$('browse')` instead of `Browse.pageElFor(dest)` | MOVERSDISTINCT (harness) — **and only the harness half; no fake-env fixture executes this branch** |
| S2-19 | `js/browse.js` | `endHold` infers the landed page from the first non-offscreen page instead of the landed descriptor | LANDEDPAGESHOWS (browse→browse abort) |
| S2-20 | `js/app.js` | the landed descriptor is read BEFORE the screen is applied (move the `currentDesc()` read above `applyScreen` in the finalize path / `dropRowHold`) | LANDEDPAGESHOWS (browse→browse **commit**) |
| S2-21 | `js/browse.js` | a landed descriptor naming no cached page is routed through the landed lookup anyway (drop the `pageCache` hit test on the miss branch) | LANDEDPAGESHOWS (browse→home) |
| S2-22 | `js/swipe.js` | `npPillClone`: delete `clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));` — the SECOND occurrence, the one the deletion list retains | NPPILLIDS |
| S2-23 | `js/swipe.js` | re-add the `app-ghost` branch for browse→browse (a pane is built and a capture returned) | NOGHOSTATALL |
| S2-24 | `js/app.js` | restore the abort re-render branch (`applyScreen(dest, { render: true, … })` on abort) | ABORTNORENDER |

**S2-20 is why LANDEDPAGESHOWS's COMMIT half is load-bearing and must not be simplified away.** An
abort mutates neither `navStack` nor `fwdStack`, so `currentDesc()` returns the identical descriptor
before and after `applyScreen` and a too-early read is INVISIBLE on the abort. The commit's stack
mutation sits at `js/app.js:817-820`, ahead of `applyScreen`, so only the commit reddens.

**S2-18 must be registered against the app-harness cell, not the recipe cell.** Every
construction-seam fixture in this suite hand-writes its `env`, so a mutant on the app-side literal
registered against the recipe layer would survive the sweep — which costs the builder a round.

## 4. Anchors this stage's deletions will ROT

Derived by evaluating `MUTATIONS` out of `tools/mutate.mjs` (116 entries) and testing each anchor's
literal `from` against §12's deletion targets. **Plan §12 item 24 names four of these; the other
fourteen are not on that list.** `test/mutation-anchors.test.js` reddens with `ANCHOR NOT FOUND` on
every one of them, so this is a hard build blocker, not tidy-up.

**On §12 item 24's list already:** `#101` M2ALIGN, `#88` STRIPEXCLUDE, `#59` `S5_FREEZEART`, and the
two `const g = ghostApp();` anchors.

**NOT on it — flagged here:**

| # | File | Anchor text (abridged) | Why it rots |
|---|---|---|---|
| 53 | `js/swipe.js` | `const clone = doc.querySelector('.app').cloneNode(true);` | inside `ghostApp` (§12 item 1) |
| 56 | `js/swipe.js` | `if (plan.outgoing === 'app-ghost') {` + `const g = ghostApp();` | the branch and the callee both go (§12 items 1, 7) |
| 65 | `js/swipe.js` | `throw … 'Swipe.finalizationPlanFor: unhandled source kind …'` | §12 item 8 |
| 66 | `js/swipe.js` | `throw … 'Swipe.finalizationPlanFor: unhandled destination kind …'` | §12 item 8 |
| 76 | `js/swipe.js` | `const outgoing = (c.fromKind === 'browse' && …) ? 'app-ghost' : 'real-source';` | **Stage 1's own NOGHOSTINFLOW mutant.** The ternary collapses (§12 item 7), so the anchor that defends the SHIPPED Stage-1 narrowing dies with it and must be re-anchored on the collapsed form, not dropped |
| 87 | `js/swipe.js` | `const ghostY = doc.getElementById('browse').scrollTop \|\| 0;` | inside `ghostApp` |
| 68, 69 | `js/app.js` | `if (m.own === 'owned-pane' && m.el.parentNode) { … }` | §12 item 15 retires the `owned-pane` filters |
| 39 | `js/app.js` | `const endOwnership = () => { if (!revealPending) sessionDone(cur); };` | §12 item 13 deletes `revealPending` |
| 13, 14, 16, 18, 72 | `js/app.js` | the hard-reset `applyScreen(currentDesc(), { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, … keepGhosts … })` at `:459` | §12 item 15a (the `finPlan` reader) **and** item 14 (`keepGhosts`) both hit this one line — five anchors on it |
| 25, 97, 98 | `js/app.js` | `applyScreen(dest, { render: cur.finPlan.abortRender === 'rerender', resetScroll: false });` at `:1261` | §12 item 15a |
| 67 | `js/app.js` | `render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false` | §12 item 15a |
| 90 | `js/browse.js` | browse-decouple `METRICS` — the whole `metrics: { scrollY: () => o.mount.scrollTop, … }` block | §5.3.4 moves the closure to the page; **re-anchor, do not drop — S2-12 is its successor and they defend the same seam from opposite sides** |
| 91 | `js/browse.js` | browse-decouple `RESTORE` — `o.mount.scrollTop = clampY(y, …)` | `applyScrollY`'s write target changes; §10 already deletes the RESTORE *cell*, and this is its mutant |

**Rule for the builder, from plan §15 R-F:** an anchor whose target text is DELETED is
de-registered; an anchor whose target text MOVED is RE-ANCHORED on the new text with the same
mutation intent. Dropping a moved anchor removes exactly the coverage the next adversarial pass
targets, and it is the cheapest wrong move available at step 10.

### Non-mutation surfaces the plan's §10/§12 do not name

These redden or go stale on the same commit and are not in the plan's migration table:

- **`test/swipe-construction.test.js`** — `CONSTRUCTION_KEYS = ['capture', 'decorations', 'movers']`
  is an EXACT-key assertion (25 references to the retired concepts in that file). Removing `capture`
  reddens it directly. NOGHOSTATALL is its successor for the key's absence.
- **`test/swipe-stage6d.test.js`** — 39 references; it is `finalizationPlanFor`'s own suite and goes
  with the function.
- **`test/construction-consumers.test.js`**, **`test/swipe-invariants.test.js`** — 3 and 4
  references each; apply §12 item 27's rule (a classification assertion survives and changes value;
  a clone assertion is deleted).
- **`tools/gen-swipe-model.mjs`** (10), **`tools/gen-transition-matrix.mjs`** (3),
  **`docs/swipe-model.generated.txt`** (8), **`docs/transition-matrix.generated.txt`** (1) — the
  GENERATED inventories are rendered from the frozen spec, which changes. Regenerate them in the
  same commit; the committed maintainability gate on the GENERATED transition inventory reddens
  otherwise.
- **`tools/source-gate-sweep.mjs`** (2).
- **M1WRITERSET entry 9** (`test/scroll-writer-set.test.js`) — its `target` prose says the injected
  seam "at HEAD is entry 4's browse mount", which becomes false with entry 4. Plan §18 named
  entries 3, 4 and entry 6's reason; entry 9 is a fourth.

## 5. What stays device-owed, and what no cell here claims

Unchanged from plan §15, and stated so no reader mistakes a green suite for a working swipe. jsdom
has no layout, paint, compositing, scroll anchoring or `transitionend`, so **not one assertion in
these four files speaks to**: the filmstrip animating or two pages travelling edge-to-edge (R7); the
A–Z strip's containing rectangle (R3); the virtualizer's anchoring under a changed scroller (R4);
the park/un-park reveal delta (R5, and step 10a's real-engine probe must read 0 BEFORE the device
sees anything); a page's `scrollTop` surviving `display: none` on WebKit (R8); whether an
off-viewport absolutely-positioned page paints outside the viewport (R2b's remaining half); iOS
fixed-layer displacement (R6).

`ENTRYNOZERO` in particular asserts the **absence of a write**, never retention — a retention claim
in jsdom passes on any engine behaviour, which is the correction plan §14 already carries.

## 6. One observation for the builder (not a cell)

`Browse.pageElFor(desc)` is keyed on `keyOf(desc)`, and a same-identity parameterized pair —
`authorBooks(A) → authorBooks(A)` — is reachable (the frozen spec records that `navTo` PUSHES a
parameterized descriptor, so the stack can hold it twice adjacently). Both mover slots would then
resolve to the SAME cached node, which Invariant D6 forbids. The plan specifies the null resolution
as an error but says nothing about a same-key resolution. No cell is authored for it: the Coverage
Model does not name one, and inventing coverage would couple the suite to a guess rather than to the
design. Flagged here so the builder either handles it or routes it to the planner.
