# CURIE — Test design: the three bare cells of Stage A1b's coverage audit

Type: test-design (gap-fill against a filed coverage audit; the stage is already shipped)
Date: 2026-08-03
Audit of record: `Claude/Mendeleev/AUDIT-one-screen-type-a1b.md` — GAPS_NAMED (G1, G2, G3; M1)
Plan of record: `Claude/Plans/PLAN-one-screen-type.md` — §5.3, §9, §14
Red suite of record for the stage: `Claude/Curie/RED-one-screen-type-a1b.md`
Authored from HEAD `551f582`; the cells, the mutants and this artifact are commit `48b19f9`.

Status: **GAPS_FILLED** — the three occupants the audit specified are authored, every new mutant is
registered and **executed**, and the acceptance test the audit named for G1 passes.

Scope: test code only. No file under `js/` or `css/` was read for editing and none was changed; the
product behaviour A1b ships is reviewed, adversary-struck and correct, and these cells assert what
it already does. Nothing here asserts geometry, stacking, occlusion or paint — jsdom has none of
them, and a cell green because a rect is zero is a false witness.

---

## 1. What was authored

| Gap | Cell | File | Mutant(s) registered |
|---|---|---|---|
| G1 | `NPRECONCILE` — an absolute post-abort assertion, plus a settings-source companion cell | `test/one-screen-type-npreconcile.test.js` | none new; the acceptance evidence is that EXISTING mutants gain this cell as a killer |
| G2 | `NPHIDDENWRITER` — a source-derived single-writer gate on `#nowplaying`'s hidden state, 5 tests | `test/np-hidden-writer-set.test.js` (new) | `NPHIDDENWRITER-a`, `-b`, `-c`, `-d` |
| G3 | `NPUNTOUCHED` — the `body.np-locked .navbar` stacking assertion | `test/one-screen-type.test.js` | `one-screen-type NPNAVBAR` |
| M1 | the retired NP-back-reveal mechanism removed from four sites in one file | `test/page-bg-single-painter.test.js` | n/a (prose) |

The registry is 140 entries at the commit. **Registering `NPNAVBAR` before the `FILMSTRIPDRAG`
block shifted every later index by one**, which is the standing reason this project re-derives
sweep indices from mutant NAMES and never from a prior log's numbers. The audit's M3 cites
`#90`/`#93`/`#94`/`#95` by index; those citations now address different mutants and must be
re-derived by name when the planner takes M3.

---

## 2. G1 — the absolute half of the abort reconcile

### The defect in the measurement

`NPRECONCILE` read `entry = liveBeneathNP(h)` as an instrument reading and asserted
`after1 === entry` and `after2 === entry`. A **relative** assertion cannot fail when the defect is
present at entry as well, because the defective entry moves the baseline with it. Measured, not
argued: mutant `NPPARKS-a` (the `npOpen` guard restored on the park toggle alone) left `#home`
un-parked at NP entry, so `entry` became `['home']`, and both aborts compared equal to it. The cell
passed. Same shape under `NPPARKS-b`. The `after1 === entry` assertion had never failed under any
registered mutant nor at pre-A1b HEAD.

The consequence was not cosmetic: `NPRECONCILE` is the only cell that drives
`applyScreen('nowplaying')` on a gesture-finalize path, so claim C3 — the abort puts back what the
gesture took away — was proven for `#browse` and for nothing else. Step 1 of the accumulation
narrative the cell's own header quotes (the `#home` re-park) was proven on the button-nav path only.

### The occupants

**(a) An absolute assertion after abort 1, in the existing cell.**
`h.$('home').classList.contains('parked') === true`, asserted against the constant, not against
`entry`. Oracle kind: **feature oracle on the finalize path** — it drives a real NP→home back-swipe
to abort through the shipped touch listeners and asserts the world's end state. The objection that
produced the relative form (a pinned entry state halts on `NPPARKS`'s invariant before any gesture
runs) does not reach it: it runs *after* a gesture has been driven. The two `entry`-relative growth
assertions are unchanged; this is purely additive.

**(b) A settings-source companion cell in the same file.**
From the Options hub, open Now Playing, drive a back-swipe NP→options to abort, assert
`isHidden(h, 'options') === true` absolutely.

⚠️ **Only one gesture direction can witness this, and the wrong one passes vacuously.** The forward
NP→chapter-list abort cannot: its mid-drag `showAppView` sweep (`js/app.js:522`) hides every
settings overlay that is not the gesture's own source, so `#options` ends hidden by `js/app.js`
whatever `setView` does, and the assertion would pass under a re-guarded loop. The **back** swipe is
the one that works — its `renderDestination` un-hides `#options` mid-drag (`js/app.js:551`), so the
abort's own `applyScreen('nowplaying')` is the only thing that can put it back. The cell asserts
that un-hiding as fixture sanity, so the forcing is visible rather than assumed.

### Acceptance — executed

```
node tools/mutation-sweep.mjs 89 91
  #89 caught (2) one-screen-type NPPARKS-a
        killed by: NPPARKS — entering Now Playing from Home parks #home
        killed by: NPRECONCILE — an aborted Now Playing gesture reconciles what the gesture un-hid …
  #91 caught (3) one-screen-type NPPARKS-b
        killed by: Now Playing hides the settings overlay it opened over … (test/nav.test.js)
        killed by: NPPARKS — entering Now Playing from a settings screen hides that screen too
        killed by: NPRECONCILE — an aborted Now Playing gesture re-hides the settings screen its own
                   mid-drag render un-hid, absolutely
```

`#89` had exactly ONE killer at the audit and now has two, the second being `NPRECONCILE`. That was
the audit's stated acceptance test for G1, and it is met by execution. `#91` gained the companion
likewise.

---

## 3. G2 — `NPHIDDENWRITER`, the single-writer gate on `#nowplaying`

### What it gates

Claim C6: `hidden` is added to `#nowplaying` in exactly one place in `js/`, and the same synchronous
`setView` body un-hides the destination two lines earlier. C6 is what licenses retiring ratified
probe mark §4.2, an item the decision log incorporates by reference. Until this cell existed the
claim rested on two hand enumerations that agree — and an enumeration verified by hand is not a
gate. A second writer added by a later stage would green the whole suite while the argument that
retired a ratified decision item silently became false.

### The form taken — full, not the cheaper half

The audit offered a cheaper half (pin only the synchrony claim) and required that taking it be
stated. **The full inventory was taken, and the synchrony half is included as well** — it is one
short test and it pins the property a reordering refactor breaks without changing the writer count.

The gate departs from `M1WRITERSET` in one deliberate way, and the departure is an improvement
rather than a reduction. `M1WRITERSET` registers every derived site with a hand-written reason it
cannot reach its subject. That is right where the target cannot be derived and wasteful — and
rot-prone — where it can. `NPHIDDENWRITER` registers **by class, according to whether the
derivation can resolve the target**:

| Receiver class | Handling | Why |
|---|---|---|
| `$('someid')` and friends | the id is **derived**; the invariant is *exactly one such site names `nowplaying`* | the target is mechanical; a registered reason would add nothing and would rot |
| `$(v)` with a same-line `for (const v of [...])` | the **list** is derived and checked for the `nowplaying` token, and the list itself is registered with its owner | this is the audit's named highest-probability next defect: a one-word widening of one of `js/app.js`'s two existing sweeps |
| a bare identifier or dotted path | **registered** with target, owner and a one-line reason it is not `#nowplaying` (16 entries) | the target cannot be resolved textually |
| a `querySelector(...)` result | **registered** with its selector, and the selector is checked mechanically against `#nowplaying`/`.nowplaying` (1 entry) | the class that could reach the element without naming its id |
| an unresolved `$(v)`, or anything unclassified | **fails** | an unclassified receiver is an unproven one |

Five derivations run over first-party `js/` (vendor excluded, its reason referenced to the existing
identity pin rather than duplicated), comments stripped, string-aware:

1. **The identity inventory** — every code site naming the `#nowplaying` element (the quoted id or a
   selector), registered with a role. Exactly one carries role `hidden-write`. Case-sensitive and
   quote-anchored on purpose: `NowPlayingScreen`, `renderNowPlaying` and `npOpen()` are function and
   module names, and deriving them would make the inventory rot on every unrelated rename.
2. **The hidden-state write inventory** — `classList.add/toggle('hidden')`, `.style.display =`,
   `.hidden =`, `setAttribute('class'…)`, each site's receiver classified per the table above.
   The last two derive zero sites at HEAD and are kept in the pattern set deliberately, so a future
   first one arrives as an unregistered site rather than as an omission.
3. **The alias closure** — identifiers bound to the element directly (`const npEl = $('nowplaying')`)
   or through an id list mapped to elements (`const els = [… 'nowplaying' …].map(…)`). No write of
   **any of the five routes, `className =` included**, may have one of these as its receiver. This
   is the one route that reaches the element without naming it.
4. **The spread closure** — a registered loop list that spreads a named constant has that
   constant's own array literal checked for the token, with an anti-vacuity guard so a check against
   nothing cannot pass.
5. **The synchrony half** — inside `setView`'s body the `#browse` toggle and the six-way settings
   loop precede the `#nowplaying` toggle, and the body contains no `await`, `requestAnimationFrame`,
   `setTimeout`, `queueMicrotask` or `.then(`.

Three directions, per the audit's specification: an unregistered derived site fails; a registered
entry whose text no longer occurs fails; a group whose derived count differs from its registered
count fails. The group direction is load-bearing rather than ceremonial — a **duplicated** writer
matches the registered entry textually, so only the count can see it, and identity entries 4/4b are
a live two-member group (the same recovery guard occurs on two paths in `js/app.js`).

Anti-vacuity: the file set must exceed 20 files and both derivations must find a non-zero number of
sites.

### What it does NOT claim — the registered residuals, stated in the cell

- a `className =` site is not individually inventoried (~50 first-party sites, essentially all
  DOM-builder assignments on freshly created nodes). It is covered only where it could reach
  `#nowplaying`: through a registered alias, or by naming the element.
- a receiver resolved at RUNTIME — a collection query whose selector is built from a variable, a
  DOM traversal, or an element passed in as a parameter.
- a write through `Object.assign` or a computed property.
- a class added from a **variable** rather than a literal (`el.classList.add(cls)`); `js/nav.js`'s
  `slideInView` does exactly this with animation classes, which is why the classList arm requires
  the `hidden` literal — without it the gate is red on arrival against code that cannot hide
  anything.
- the CSS side: that `.hidden` still means `display: none` is `css/app.css`'s property.

One further honesty note carried in the cell: the **propagation** half of the alias check is
file-wide and therefore over-approximate (`el` is `resetSwipeStyles`'s loop variable and
`slideInView`'s parameter shares the name). Over-approximation is the safe direction — it can
produce a red that must be reasoned about, never a silent green — and the repair for such a red is
to rename or register the colliding binding, never to narrow the scan.

### It is SWEEPABLE, and that was measured, not assumed

`M1WRITERSET` is excluded from the mutation sweep as a SOURCE-TEXT GATE: it pins production lines by
text, so any mutation editing one makes it fail by construction — a FALSE CAUGHT. The obvious
expectation was that this gate would need the same exclusion, which would have cost it every
executed mutation result and forced its mutants to be `benignAlone`.

That expectation was wrong, and the shape-based receiver classification is why. Checked
mechanically over the whole 140-entry registry, exactly five mutants inject a payload containing a
hidden-write pattern or the `nowplaying` token — `#85`, `#87`, `#88`, `#90`, `#91`, all in
`js/nav.js`. Each was applied and this gate run alone:

```
mutant #85 -> # pass 5 # fail 0
mutant #87 -> # pass 5 # fail 0
mutant #88 -> # pass 5 # fail 0
mutant #90 -> # pass 5 # fail 0
mutant #91 -> # pass 5 # fail 0
```

Green under all five. **No entry was added to `SOURCE_TEXT_GATES` and `tools/mutation-sweep.mjs` was
not touched.** The gate therefore carries genuine executed sweep evidence rather than an excuse.

### Mutants — all four executed, all four attributable to this gate alone

Each is chosen to be **behaviourally inert**, so nothing else can claim it; a mutant that also broke
behaviour would be caught by twenty cells and would prove nothing about this one. That every one of
them was caught by exactly this cell is itself the proof that the inertness holds.

```
node tools/mutation-sweep.mjs 96 97 98 99
  #96 caught (1) NPHIDDENWRITER-a  a second, redundant `hidden` writer injected into setView
        killed by: NPHIDDENWRITER — exactly one first-party code path puts #nowplaying into the
                   hidden state …                                  [the group-count direction]
  #97 caught (2) NPHIDDENWRITER-b  the npEl alias made to write the hidden class
        killed by: NPHIDDENWRITER — exactly one first-party code path …   [unregistered local]
        killed by: NPHIDDENWRITER — the #nowplaying ALIAS closure …       [the alias direction]
  #98 caught (1) NPHIDDENWRITER-c  showAppView's sweep widened by one word to include nowplaying
        killed by: NPHIDDENWRITER — exactly one first-party code path …   [the loop-list direction]
  #99 caught (1) NPHIDDENWRITER-d  setView reordered so #nowplaying is hidden FIRST
        killed by: NPHIDDENWRITER — the SYNCHRONY half of claim C6 …
```

`-c` is the audit's forward-read item 1 executed as a mutant: the one-word widening of a sweep that
already exists twice in `js/app.js`. `-d` breaks C6 without changing the writer count at all, which
is the case the synchrony half exists for.

### The selftest

A fifth test drives the same derivation functions against synthetic in-memory sources: the identity
derivation sees a quoted id and a selector and ignores both a comment and a same-spelled function
name; the write derivation tells a literal id from a loop variable from an unresolvable variable
from a local from a query, refuses a `contains` READ, and survives a `//` inside a string; the three
attacks (duplicate writer, widened sweep, alias write including the `className` route) each surface
in the comparison the real cell runs; and a non-visibility use of the alias is proven not to be a
false positive, because `js/app.js` does exactly that.

### What G2 leaves uncovered

The residual list above is the answer, and the sharpest member is the runtime-resolved receiver: a
hidden-state write on an element obtained from a document-wide collection whose selector is built at
runtime, or passed in as a parameter, with no textual `nowplaying` anywhere. No first-party site of
that shape exists at HEAD (every query-receiver write is registered and its selector checked), but
the gate cannot prove a future one absent. It is the textual bound, stated as a bound.

---

## 4. G3 — the navbar stacking assertion

§14 has always specified `NPUNTOUCHED`'s fixture as reading the shipped stylesheet and asserting the
Now Playing rule declares its background, its `inset: 0` and its `z-index: 60` *"and that the body
np-locked navbar rule still raises the navbar above it"*. The cell never carried the second half, so
deleting `z-index: 70` from `css/app.css`'s `body.np-locked .navbar` rule reddened nothing.

The occupant is one addition to the existing source-scan cell, using the `ruleBody` helper already
in the file:

- resolve the rule whose whitespace-normalized selector is exactly `body.np-locked .navbar`, with
  the same anti-vacuity `!= null` guard the `.nowplaying` read already applies;
- assert it declares a `z-index` at all, and that the value is **strictly greater** than
  `.nowplaying`'s. The relationship is what the ratified decision names, so the relationship is what
  is asserted; the literal `70` is reported in the failure message rather than pinned as the claim.

Oracle kind: **source scan** — the same kind as the four assertions beside it, and deliberately not
a rendered-stacking assertion, which jsdom could not fail.

### Executed

```
node tools/mutation-sweep.mjs 95
  #95 caught (1) one-screen-type NPNAVBAR
        killed by: NPUNTOUCHED — the .nowplaying rule still declares its own inset, z-index and
                   background, and the body.np-locked navbar rule still outstacks it (source)
```

One killer, and it is the named cell. Audit note N1 is narrowed but not closed: `position: fixed`,
`inset: 0` and `z-index: 60` still have no registered mutant, and the cell says so.

---

## 5. M1 — the retired mechanism in `test/page-bg-single-painter.test.js`

The file stated the retired NP-back-reveal mechanism as current in four places, not one: the header
at `:1-2`, the model paragraph at `:12-14`, and — the site the code review did not name — twice
inside the painter-set assertion message at `:53` and `:55-56`, which is the text a maintainer reads
at the moment the cell fails. All four are replaced with the current reason: an opaque background,
`inset: 0` and `z-index: 60` are three co-required properties, and together they are what covers the
topbar and the transport, which the ratified "Now Playing stays unique" decision protects. That is
the same reason `css/app.css` records at the declaration itself.

The replacement states current truth directly rather than narrating the retirement (records standard
5.2, *what is, is*). Both tests in the file stay green; the file's mutants (`NOSETTINGSBG-a`, `-a'`,
`-b`) were re-swept after the edit and are unaffected.

Not touched: `test/page-bg-js-painter.test.js:4` carries the same "additive overlay" phrasing. It is
not named in M1, it is not in this seat's writable set for this invocation, and the plan's step-17
phrase-scoped scrub does reach it — which is precisely why M1 existed for the assertion message,
which that scrub cannot reach.

---

## 6. Results

**Suite** — `node --test "test/*.test.js"`: **830 tests, 829 pass, 0 fail, 1 skipped** (22.8s). The
one skip is the pre-existing device-only KEEPER cell in `test/swipe-stage6*.test.js`, unrelated to
this stage. The count rose from 824 by exactly the six tests authored here (one `NPRECONCILE`
companion, five `NPHIDDENWRITER`).

**Mutation** — the whole family re-swept **against the final state**, in the foreground, indices
re-derived from names, in two batches:

```
node tools/mutation-sweep.mjs 76 85 86 87 88 89 90 91   -> swept 8: 0 uncaught, 0 unapplied, 0 stale
node tools/mutation-sweep.mjs 92 93 94 95 96 97 98 99   -> swept 8: 0 uncaught, 0 unapplied, 0 stale
```

Counts at the final state: `#76` 1, `#85` 6, `#86` 2, `#87` 2, `#88` 5, `#89` **2** (was 1), `#90` 3,
`#91` **3** (was 2), `#92` 2, `#93` 2, `#94` 7, `#95` 1, `#96` 1, `#97` 2, `#98` 1, `#99` 1.

**Tree** — `git status --porcelain` clean of anything but the intended files; `find . -name "*.mutbak"`
empty before and after every sweep.

---

## 7. Handoff

- **Source artifact** — `Claude/Mendeleev/AUDIT-one-screen-type-a1b.md`, gaps G1/G2/G3 and finding M1.
- **Status** — GAPS_FILLED. Three cells authored, five mutants registered and executed, suite green.
- **Files changed** — `test/one-screen-type-npreconcile.test.js`, `test/one-screen-type.test.js`,
  `test/np-hidden-writer-set.test.js` (new), `test/page-bg-single-painter.test.js`,
  `tools/mutate.mjs`. **No file under `js/` or `css/` was changed**, and
  `tools/mutation-sweep.mjs` was not changed either — the exclusion it would have needed was
  measured away rather than assumed.
- **Next owner** — the coverage auditor (Mendeleev), for the re-audit that the campaign's
  `coverage-audit` gate needs in order to accept `ADEQUATE`.
- **Required evidence, all supplied above** — G1's absolute assertion producing `NPRECONCILE` as a
  second killer of `NPPARKS-a` (executed); G2's writer-set gate with four additive mutants and a
  selftest (executed, and shown not to need a sweep exclusion); G3's navbar assertion with its
  additive mutant (executed).
- **Still owed and NOT covered here** — the step-9 **device gate**, including the adversary's
  scroll-preservation item. Nothing authored here claims any part of it. M2 and M3 remain routed to
  the planner and were deliberately left alone; M3's index citations need re-deriving by NAME, since
  registering `NPNAVBAR` before the `FILMSTRIPDRAG` block shifted every later index by one.
- **Records updated** — this file; `Claude/Zelda/Board.md`.
