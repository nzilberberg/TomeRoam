# AUDIT — the suite after Stage 2 of PLAN-swipe-declone

**Artifact:** `git diff be7da1c..9883d45` — the whole of Stage 2 (the red suite at `be7da1c`, the
build, the code review and its application, the adversary strike).
**Gate:** publish-style, scoped to plan §13 step 13: *every deleted assertion accounted for, no
dimension left bare by the deletions, and every migrated gate re-derived rather than narrowed.*
**Date:** 2026-08-01. **HEAD audited:** `9883d45`, build `2026-08-01.295`.

Verdict: **ADEQUATE**

The deletions are accounted for with **one** named exception; **no** migrated gate was narrowed —
two were strengthened; and every cell of the plan's §14 Coverage Model is genuinely swept, with the
designated killer confirmed by execution on the six mutants I ran. Two cells are bare and are filed
below with their occupants' properties. Neither is a cell that passes for the wrong reason: both are
absences, and the more serious one is a dimension Stage 2 **created** rather than one the deletions
removed — which is why it sits outside the three questions the step asks and is filed anyway.

---

## 1. What I ran, and what it establishes

- `node --test "test/*.test.js"` → **810 tests, 809 pass, 0 fail, 1 skipped.** The one skip is
  `test/swipe-stage6.test.js:360`, carrying its own reason: jsdom cannot emit a browser-originated
  scroll in the window between `endHold` and the settle. A recorded device-owed deferral, not a
  silent hole.
- `node tools/mutation-sweep.mjs 110 113 116 118 119 122` — the six highest-risk Stage 2 mutants →
  **6 swept, 0 uncaught, 0 unapplied.** Every one named its **designated** cell among the killers:
  S2-12→PAGEOWNSSCROLL, S2-15→ENTRYNOZERO, S2-18→MOVERSDISTINCT (app-harness half), S2-20 and
  S2-21→LANDEDPAGESHOWS, S2-24→ABORTNORENDER. `git status --porcelain` empty and no `*.mutbak`
  afterwards.
- Registry count: **123 mutants**, of which **24** are `S2-*`. That matches plan §14 exactly —
  24 Stage 2 + NOGHOSTINFLOW 1 + HOMESTAYSLIVE 2 + NOAPPCLONE 2 = 29 over sixteen cells.

**A green count is execution, not coverage.** 809/810 is stated above as an execution fact. The
coverage claim in this document rests on the sweep below and on nothing else.

---

## 2. Ground — what Stage 2 must be proven against

The plan's §14 Coverage Model is the starting map (sixteen cells). Audited against the catalog, it
is complete for the transition it changes and for the four Stage-1 transitions it must not disturb,
with **one dimension absent from it** — §6, finding M1.

Stage 2's contract, restated as what must hold: Invariants D1–D6; the §6 contract change
(`outgoing` collapses, `capture` removed, `finalizationPlanFor` deleted); the §12 deletion list
**as split across steps 10 and 11**; the four shipped transitions unchanged; and §15's device rows.

**Step 11's subtraction has not run, and that is not a gap.** `finalizationPlanFor`, `abortRender`,
`app-ghost`, `owned-pane`, `keepGhosts`, `revealPending`, `dropPanes`, `holdGhostUntilPaintable`,
`ghostY`, `animSync` and the `.nav-ghost` sweeps are still present in `js/app.js`. I verified they
are unreachable rather than merely unused: `js/swipe.js:242,251,260,265` produce only
`'borrowed-real'` and `'owned-decoration'`, so every `m.own === 'owned-pane'` filter is
constant-false. Coverage for machinery whose deletion is scheduled is not owed.

---

## 3. The sweep — the §14 Coverage Model, cell by cell

| Cell | Status | Basis |
|---|---|---|
| NOGHOSTINFLOW | swept | `swipe-declone-stage1.test.js` — value changed (every pair is `real-source`), and the three shipped in-flow rows are now asserted **by name** as well as inside the loop, so a re-scoped loop cannot silently drop them |
| HOMESTAYSLIVE | swept | unchanged this stage; two mutants registered |
| PAGEISVIEW | swept | `stage2-css.test.js:196` — position/inset asserted; every scroll and padding declaration compared against `RETIRED_BROWSE_SCROLLER`, a snapshot of the host rule as it shipped, not a hardcoded list; the has-player override checked; the host asserted to declare **no** `overflow-y` and no padding |
| MOVERHASBOX | swept | `stage2-css.test.js:401`; invariant deliberately narrowed to the id-resolved hosts with `PAGEISVIEW` named as the page's cover — the narrowing is stated in the cell and is honest |
| PARKBOXEQUAL | swept | the two park rules compared **against one another**, not a list, so a weakening of Invariant P on either reddens |
| PARKLOSESTRANSFORM | swept | textual `!important` check over the whole sheet |
| PAGEOWNSSCROLL | swept | container half + measured-element half; **S2-12 executed, designated killer confirmed** |
| RESETCOVERSPAGES | swept | drives the real `Nav.resetSwipeStyles` against the real `index.html` fixture — **for pages that are in the document**; see finding M1 |
| ENTRYNOZERO | swept | records every write rather than reading back an offset; the earlier retention clause was correctly removed as a false witness and re-filed as device row R8. **S2-15 executed** |
| MOVERSDISTINCT | swept | three mutants across two layers; the third lives in the app-side `env` literal no fake-env fixture executes and runs at the harness layer. **S2-18 executed** |
| LANDEDPAGESHOWS | swept | **S2-20 and S2-21 executed.** The `browse→home` cell was reworked after the adversary pass found its ABORT phase a false witness; it now states per phase which branch each takes and which phase kills the mutant. The commit half is what kills NATURAL-b and is not symmetry |
| BROWSESURFACE | swept | `surfaceKind` + the native-scrollbar suppression selector, the latter a stated precondition of §5.3.2's geometry derivation |
| NPPILLIDS | swept | the retained id-strip occurrence, the one the deletion list warns is a text-directed-deletion trap |
| NOGHOSTATALL | swept | asserts `capture` is **absent as a key**, not falsy — the stronger form |
| ABORTNORENDER | swept | **S2-24 executed** |
| NOAPPCLONE | swept | temporary exception 2 deleted with the clone it allowed; the gate now runs with no allowance. Rot protection would have reddened had the exception outlived the clone |

**Sixteen cells, sixteen swept.** No cell in this model is bare.

---

## 4. Deleted assertions — the accounting

**52 `test()` declarations deleted, 18 added.** Thirteen of the deletions are migrations that kept
their subject and changed their value; the rest lost their subject. I walked all 52.

**Migrated, subject alive, value changed** — BROWSEFIXED, `entryScrollY` ×3, the Construction shape
cell, the overlay↔overlay capture cell, NOGHOSTINFLOW, LANDEDPAGESHOWS (`browse→home`), I11/I20,
`1a`, OR, the frozen-spec pane rule, the outgoing-before-render cell. Each carries an in-file note
saying what moved and why.

**Deleted with the subject** — the clone-fidelity family (GHOSTSCROLL, STRIPEXCLUDE, M2ALIGN ×2,
`copyAnimPhase`, `freezeArt`, the wrapper background and z-order contract, `.205`, `.208`), the
reveal/hold family (the cover-flash cell, `.198`, `.199`, `.201`, the held-reveal endpoint, RR(a),
RR(b), RR(c), RGreveal), the owned-pane family (I2/I20, F1a-L3, PG, DP.browse-browse, NOOP ×2, RSN),
the `sy`/restore-token family (RESTORE, both stale-finalizer cells), and the whole of
`test/swipe-stage6d.test.js` (FP.contract, FP.oracle, AB ×3, RC.armed) with
`finalizationPlanFor`.

I checked each of these for a surviving successor where the *property* outlived the *mechanism*, and
found the successor named in every case but one:

- The abort re-render's successor is **ABORTNORENDER**, inverted (zero renders where AB.clobber
  asserted one).
- The abort scroll restore's successor is **I7**, which survives and still covers the reachable
  abort path; only the held-abort mutant was de-registered with its deleted branch.
- I2's "every pane released or disposed exactly once on every exit path" is vacuous for the only
  ownership kind left (`owned-decoration`), whose disposal is covered by **DEC** in
  `swipe-stage6e.test.js` and by the NP-source cells in `swipe-invariants.test.js:100-106`.
- PG's deferral boundary survives as **G1–G3 / W**, which now cover every reachable session because
  every session is pane-less.
- `.213` was kept with its expectation inverted (`pane=none` on every settle) — the §12 item 27 rule
  applied correctly.

**The one exception is CLB** — finding M3.

---

## 5. Migrated gates — re-derived, not narrowed

This is the question the step is most exposed to, and the answer is clean.

| Gate | Verdict |
|---|---|
| **BROWSEFIXED** | **Strengthened.** The `overflow-y: auto` assertion did not vanish: it became `assert.doesNotMatch(body, /overflow-y/)` on the host, and the positive claim moved to `PAGEISVIEW` on the page, compared against the retired rule's captured values. `position: fixed` and the two containing-block negatives are untouched and are now load-bearing for Invariant D5 |
| **M1WRITERSET** | **Re-derived in the same commit**, per the gate's own header. Entries 3, 4 and 9 re-pointed to the page node with new `why` text; entry 6's recorded container corrected; entries 11/12 collapsed to one with the group-count check named as what would have caught an unrecorded deletion; the `HORIZONTAL_CLASS` member de-registered with its clone rather than the class being pattern-excluded. No pattern was widened to swallow a red |
| **NOAPPCLONE** | Exception 2 deleted with the clone. Exactly one permanent exception remains |
| **SCROLLBAR** | **Widened** — now asserts both the host and a `.browsepage` |
| **METRICS** | Re-pointed to the page node; `PAGEOWNSSCROLL` named as the other half |
| **`contract-function-gate` / `construction-consumers`** | `finalizationPlanFor` de-registered; I confirmed the function is absent from `js/` (only comments remain), so this is a de-registration, not a coverage loss |
| **transition-matrix / swipe-model / GENERATED docs** | Re-derived. The `supersession` region hash re-verified line by line with both changes named; the `NEW_POLICIES` id renamed with the classification explicitly stated as unmoved; the generated docs reproduce byte-identically |
| **`screens.test.js` scrollbar-suppression inventory** | `.browsepage` added with the geometric reason, not as a cosmetic entry |
| **`browse-render-race`** | Repaired from vacuous to non-vacuous (files-page fixtures) after the review; I confirmed the control now reads `[0]` rather than `[]` |

Two gate fixtures were repaired for anti-vacuity in the same pass — the `1a` cell gained a "the drag
must actually have shifted something" precondition, and the harness fake `Browse.pageElFor` was made
to throw on a miss like the real one. Both are the right direction.

---

## 6. Findings

| # | Severity | Dimension | Subject |
|---|---|---|---|
| M1 | **Structural** | 1 (lifetime) × 8 (composition) | The mover's lifetime against its owner's destruction: both `browse→browse` movers are now cache-owned nodes that three reachable paths destroy or detach mid-gesture. No cell drives any of them |
| M2 | **Gap** | 5 (rejection paths) × 7 (contract claims) | `Browse.pageElFor`'s documented throw-on-miss is unproven against production |
| M3 | **Gap** | 7 (contract claims) | The CLB purge gate was deleted with its file; its subject is still live and is not in §12's deletion list |
| M4 | Note | 7 | `js/app.js:392`, `:397` still describe `ghostApp` as "the sole capture recipe" |
| M5 | Note | — | The designated-killer rule is a comment in the registry, not a check in the sweep |
| M6 | Note | — | Watch-list item W12 (owner: this seat) is discharged by deletion — close it |

### M1 — the mover's lifetime is no longer the session's, and nothing tests the difference

**The claim being audited.** Plan §11 declares `lifecycle_ownership: true` and states that "a
`.browsepage` becomes a mover for the first time, which gives it a new borrowed lifetime obligation
**at the reset point**." That obligation was discharged: `RESETCOVERSPAGES` proves
`Nav.resetSwipeStyles` reaches every `.browsepage`. The obligation at the **destruction** point was
not named and is not covered.

**What changed.** Before Stage 2 every mover was either an id-bearing view that nothing removes
(`#home`, `#browse`, `#options`, `#nowplaying`) or a pane the session itself owned and disposed.
After Stage 2 the two `browse→browse` movers are `.browsepage` nodes owned by
`js/browse.js`'s `pageCache`, whose lifetime is governed by three paths with no gesture awareness:

- `Browse.clearCache()` — `js/browse.js:76-81`, which calls `el.remove()` on every page. Reached from
  `js/app.js:1384` (pull-to-refresh), `:2524`, `:3031`, and `:3118` (`Net.onReconnect`, whose own
  comment at `:3119` records that it "removed every rendered browse page — INCLUDING the one on
  screen").
- `Browse.reset()` — `js/browse.js:67-73` (`o.mount.innerHTML = ''`), reached from `js/app.js:2372`.
- A mid-gesture `applyScreen(d, { render: true })` at `js/app.js:2523`, `:3030`, `:3123`.

**Why the existing recovery does not close it.** `Nav.resetSwipeStyles` reaches pages through
`document.querySelectorAll('.browsepage')` (`js/nav.js:114`) — a document query. A page detached
before finalize is not in that set, so the widened sweep is structurally blind to exactly this case.
The adversary's strike exercised that recovery under a **degenerate** mover (one node in two slots)
and found it sound; a **detached** mover is a different input and was not run.

**Why this is a coverage finding and not a re-run of the code review.** The code-side half is
already filed — the code reviewer's W44 names the `applyScreen` route, prices the class as
pre-existing, and routes it to the builder. What is filed nowhere is the coverage statement, and it
is sharper than the code statement: **the project already holds this exact invariant and already
knows how to test it.** `test/swipe-gesture.test.js:24-25` states it in the header — *"a gesture must
settle even when the DOM it started on is destroyed mid-drag. The gesture does not own that node and
must not depend on it"* — and `:20-21` names all three destruction paths by name, including
`Net.onReconnect → Browse.clearCache()`. The cell that proves it (`a swipe settles even when the row
under the finger is DESTROYED mid-drag`) covers the **touch target**. Stage 2 widened the set of
non-owned, destructible nodes the gesture depends on from `{touch target}` to `{touch target,
outgoing mover, incoming mover}`, and the cell set did not widen with it. This is the same shape as
the finding that made `RESETCOVERSPAGES` necessary, one node-class further out.

**The occupant.** An integration cell, app harness, `realBrowse: true`, fake timers. It must
**force** the condition, not construct it: drive a live `browse→browse` past the lock so both movers
carry inline transforms, then call `Browse.clearCache()` (the `Net.onReconnect` shape), then advance
past the settle and finalize. It must assert, as a **feature oracle** on the resulting state — not a
consistency oracle:

1. the gesture still settles — a `#N abort` or `#N commit` SWIPE line lands (the invariant the
   header states);
2. no `.browsepage` in the document carries a non-empty inline `transform` afterwards;
3. the session is released (`activeSession(h)` is null), so the next touch does not trip the
   leftover-state hard reset that `.178` exists to prevent.

Registered mutants, one per route: drop the `.browsepage` push from `resetSwipeStyles`
(`js/nav.js:114`); and, once the intended behaviour is decided, remove whatever guard closes it.
A `Browse.reset()` variant and an `applyScreen(..., { render: true })` variant are the other two
coordinates of the same cell.

**Route.** The intended behaviour is not mine to state and is not settled — W44 is open with the
builder and the guard pattern (`d.gestureOwnsMovers()`, `js/app.js:250`, already used for
`overlayFilmstrip` per W37) exists next door. So: **the planner** decides what a destruction
mid-gesture must do, then **the test author** authors the cell above against that decision.
**Close it before step 11**, which walks precisely this region and would otherwise ship the
subtraction with the dimension still bare.

### M2 — `Browse.pageElFor`'s throw is a contract claim with no cell

Three records make it an absolute claim: `js/browse.js:224-228` ("THROWS rather than returning
null: a missing page must fail at the seam, not surface much later as a transform write on
`undefined`"), `js/app.js:557` repeating it at the consumer, and plan §5.3.6 ("A null resolution is
an error, not a null mover... the seam throws"). The throw is implemented at `js/browse.js:232-239`.

**No test calls the real accessor with an uncached descriptor.** Both places that appear to cover it
are independent re-implementations that throw on their own account: `test/app-harness.js:603-607`
and `test/swipe-declone-stage2-construction.test.js:74`. Change `js/browse.js:232` to
`return hit ? hit.el : null` and every fixture still throws from its own stand-in; the suite stays
green. The code reviewer executed the contract across nine shapes in a disposable scratchpad probe
(Probe 3) — that proves today's behaviour and leaves no durable cell behind it.

**The precedent is this project's own, and it is exact.** `finalizationPlanFor`'s unhandled-kind
guards shipped in Stage 6d with no throw test and no registered mutant, and this seat's BC-1 finding
recorded that making both guards inert left the whole swipe suite green. The cell that closed it
(`test/swipe-transition.test.js`, "finalizationPlanFor throws on an unhandled source kind and on an
unhandled destination kind") was deleted this stage **with its function** — correctly — and the new
seam that replaced it arrived without the equivalent.

**The occupant.** A unit cell against the real `js/browse.js` through `Browse._test`:
`assert.throws(() => pageElFor({ v: 'authorBooks', author: { ratingKey: 'never-rendered' } }),
/no cached browse page/)`. Its non-vacuity precondition is that a *cached* descriptor resolves in the
same cell, so "it throws" is not satisfied by a fixture in which nothing ever resolves. It must be
paired with the sibling negative the code deliberately depends on: `keyFor` (`js/browse.js:141-158`)
returns a **value** on the hold-release path and must not be made to throw, because a throw there
runs inside the finalize `finally` past `if (!ok) finishing = false;` and wedges every future swipe.
Registered mutant: `return hit ? hit.el : null`. **Owner: the test author.**

### M3 — the CLB purge gate went out with the file, and its subject did not

`test/swipe-stage6d.test.js` carried `CLB [SOURCE_TEXT]` — a source-text sweep asserting that
`clobbered` / `sourceWasClobbered` occur nowhere in `js/app.js` or `js/swipe.js`. Its subject is not
the clone and not `finalizationPlanFor`: it is the **permanent absence of a retired runtime
byproduct**, the second-source-of-truth that Stage 6d removed. Plan §12's deletion list does not name
CLB, so this is an unaccounted deletion rather than a sanctioned one.

I confirmed both identifiers are absent from `js/` at HEAD, and that no surviving gate holds them
absent — the seven test files that still mention `clobbered` do so in prose or in unrelated contexts.

It is a **Gap** rather than Structural because the re-entry route is narrow: re-deriving the abort
decision from an observed build side effect, when Stage 2 has deleted the decision itself. But
absence must be a decision, and right now it is an omission.

**The occupant, or the alternative.** Either a two-line source-text assertion in a surviving gate
file (the same shape `NOAPPCLONE`'s rot check already runs — scan `js/`, fail naming file and line),
or an explicit, dated record that the gate is no longer owed because the concept it guarded has no
surface left to re-enter through. **Route: the planner** decides which, then **the test author** if
it is the first. Do not leave it as neither.

### M4–M6 — notes

- **M4.** `js/app.js:392` and `:397` describe `ghostApp` as "the sole capture recipe". The function
  is deleted; only the comments survive. Plan §13 step 14's HEAD-wide scrub owns this, and the code
  reviewer's W28-residual already names the class. Recorded here so the scrub's inventory is
  complete, not as a coverage cell.
- **M5.** `tools/mutate.mjs` states that "the killer named in each entry is the DESIGNATED cell — a
  sweep result of merely CAUGHT is not closure," and `tools/mutation-sweep.mjs:196-202` prints the
  killing cells but never compares them to the registered name. The rule is therefore a discipline,
  and disciplines fail under schedule pressure. I checked six of the twenty-four Stage 2 mutants by
  execution and all six named their designated cell; the other eighteen rest on the unchecked rule.
  Mechanizing it is a small change to the sweep (parse the `(-> CELL)` suffix, require a killer whose
  name contains it). **Owner: the planner**, as a tooling item — it is not this stage's to fix.
- **M6.** Watch-list **W12** — "6e `sweeps===0` non-vacuity guard has no registered single-site
  mutant", owner this seat — is **discharged by deletion**. The `NOOP.mechanism` cell and both its
  mutants went out with the pane in this stage. Close it.

---

## 7. Absence as a decision — every catalog dimension, stated

| # | Dimension | Status for Stage 2 |
|---|---|---|
| 1 | **Lifetime and reuse** | **Partly bare — M1.** The warm-object half is covered: a `.browsepage` is a cached, long-lived node driven across show/hide/park/re-entry by `PAGEOWNSSCROLL`, `ENTRYNOZERO`, `LANDEDPAGESHOWS` and the `browse-virtual` eviction cells, and `hit.order = ++orderSeq` on every cache hit (`js/browse.js:525`) makes `evictLRU` unable to reach a live mover — that coordinate is **not applicable, by construction**. The destruction half is bare |
| 2 | **Trust boundaries and hostile inputs** | Covered for the seam: `buildConstruction` is driven with poisoned ambient globals; `constructionPlanFor` and `classifyTransition` throw on unhandled kinds with cells and mutants. **One documented rejection unproven — M2** |
| 3 | **Concurrency** | Covered. `browse-render-race` drives the late-fetch interleaving (repaired to non-vacuous this stage); the supersession family (I20, G1–G3, W, OR, G-chain) drives gesture interleaving; the row hold's release ordering is pinned by `LANDEDPAGESHOWS`. jsdom has no threads and none are claimed |
| 4 | **Shape and platform matrices** | Covered where decidable: empty/one/700-item pages (`bigBooks(700)`, `setForceVirtual`), files vs list vs author pages, `body.has-player` on and off (the padding override is asserted). The platform axis — WebKit vs Blink on scroll anchoring, `display:none` retention, overlay vs classic scrollbars — is **device-owed and recorded** (§15 R4, R8, and the 15px gutter measurement behind `BROWSESURFACE`) |
| 5 | **Failure and rejection paths** | Covered except M2. The abort path, the hard-reset path and the supersession recovery each have cells that force them rather than merely reach them |
| 6 | **Numerical edges and determinism** | Covered by the `clampY` cells (content shorter than viewport, target past the end, never negative, rounds) and by the generated-doc byte-identity checks. No bit-identity claim is made that is not pinned |
| 7 | **Contract claims** | Covered except M2, M3 and M4. Every absolute in the §14 model maps to a cell; `NOGHOSTATALL` asserts `capture` is absent **as a key**; `MOVERHASBOX` states its own narrowing rather than over-claiming; `PARKLOSESTRANSFORM` pins the cascade dependency the design rests on |
| 8 | **Composition** | Covered for `browse→browse` × {virtualized, files page, has-player, NP pill decoration, supersession, hard reset, abort, commit}. **Bare for `browse→browse` × {cache destruction} — M1** |
| 9 | **Persistence round-trip and version evolution** | **Not applicable.** Nothing Stage 2 touches is persisted; scroll state is in-memory and live, and the plan declares `persistence_migration: false`. The one durability question — whether a page's `scrollTop` survives `display: none` — is engine behaviour, not persistence, and is R8 |
| 10 | **Functional achievement (the feature oracle)** | Covered to the jsdom boundary and **correctly deferred past it.** `LANDEDPAGESHOWS` and `ABORTNORENDER` are genuine feature oracles: they execute the gesture and assert the world's end state (which page is shown, activated, parked, hidden; how many renders ran), not that the system does the same thing twice. `MOVERSDISTINCT`'s harness half executes the real `env` literal. What is **not** proven in CI — that the filmstrip animates edge-to-edge, lands correctly, and does not jump at drag start — is R7, and that a returning page keeps its offset is R8. Both are device-owed and named |

**Device-owed and recorded, not gaps** — §15 R2b (the paint half), R3 (the A–Z strip's containing
block during a `browse→browse` and a `browse→home` drag), R4, R5 (the open abort-repaint symptom),
R6, R7, R8; plus the single skipped cell at `test/swipe-stage6.test.js:360`. I found **no**
unrecorded device-owed dimension. Notably, the retired `STRIPEXCLUDE` cell's real subject — the
strip re-parenting under a transformed ancestor — is not lost: it is derived in §5.4, measured on the
round-2 real-engine instrument (`top=235`, `height=385` on both the new and the shipping case), and
filed as R3.

**One gate ordering remains owed before the device sees this**, and it is not mine: step 10a's
real-engine park-geometry reveal-delta probe has not been run, and §18 F5 makes a non-zero result a
stop condition for step 10b. Recorded here because a coverage audit that reported "adequate" while
that probe was outstanding would read as clearance for the device gate, which it is not.

---

## 8. The same-key mover pair — the coverage position only

Not adjudicated here; reachability is the planner's open question (W46), and the trigger census and
`test/fixtures/swipe-plan-spec.mjs:105` disagree about it.

The **suite's** position is clear and correctly labelled: the coordinate is **pinned, not guarded**.
`test/swipe-declone-stage2-construction.test.js:170` records that `authorBooks(A) → authorBooks(A)`
resolves both mover slots to the same cached page today, states in its own name and body that it is
a pin rather than a guard, and requires any change to it to land deliberately in the same commit.
`MOVERSDISTINCT` remains green on the coordinate because both its fixtures use two different keys —
which the cell now says out loud.

That is the right shape for a contested coordinate: the behaviour cannot drift silently in either
direction while the question is open, and nothing in the suite claims a safety it does not have.
When the planner rules, the pin becomes a guard or the pin's comment records why it stays a pin.

---

## 9. Forward read — where the next externally-found defect lands

Read off the resolved matrix, not guessed.

**It lands in dimension 1 × 8, on a refresh that arrives mid-swipe.** The path is specific: a user on
a slow relay swipes Books→Authors; `Net.onReconnect` fires during the drag; `Browse.clearCache()`
detaches both movers; `applyScreen` at `js/app.js:3126` renders a fresh page underneath while the
gesture's mover set still points at two nodes no longer in the document; `resetSwipeStyles`'
`document.querySelectorAll('.browsepage')` cannot reach them to clean up. The symptom the user
reports will be "the swipe froze" or "it went blank and came back wrong" — the same vocabulary as
the `.177` freeze, whose cell is one node-class away from covering this and does not.

The reason this is the prediction and not a worry is that every neighbouring cell is resolved: the
degenerate-mover recovery was executed by the adversary and held; the reset point is covered by
`RESETCOVERSPAGES`; the eviction coordinate is closed by construction; the row-hold half of
`clearCache` is covered by `browse-virtual.test.js:267`. The destruction of a **live mover** is the
one cell around them that is empty, and it is empty because Stage 2 created it and the Coverage
Model was written before it existed.

**Second, smaller:** dimension 5, at `Browse.pageElFor`. Step 11 walks the resolution region. A
subtraction pass that "simplifies" the throw to a null return ships green today, and the failure
surfaces as a transform write on `undefined` at a distance from its cause — which is the exact
outcome the throw's own comment says it exists to prevent.

---

## 10. Routed

| Finding | Owner | Action |
|---|---|---|
| M1 | the planner → the test author | Decide what a mid-gesture cache destruction must do (the `gestureOwnsMovers` guard pattern exists at `js/app.js:250`); then author the cell in §6 M1. **Before step 11** |
| M2 | the test author | Author the `pageElFor` throw cell + its `keyFor` sibling negative; register the null-return mutant |
| M3 | the planner → the test author | Rule whether the CLB purge gate is still owed; re-home it or record the decision |
| M4 | the assistant | Fold into §13 step 14's HEAD-wide scrub |
| M5 | the planner | Mechanize the designated-killer check in `tools/mutation-sweep.mjs` |
| M6 | the assistant | Close W12 — discharged by deletion |

No finding is routed to the code reviewer: nothing in this sweep surfaced a defect the review has not
already priced.
