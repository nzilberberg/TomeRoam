# POIROT — Stage 2 of PLAN-swipe-declone (retire the last swipe clone)

Type: code-review
Prior-review: c4cfd7e-one-screen-type-stageA1.md
Target: `e1db674` (build `2026-08-01.293`), covering `ee1080f` (the functional commit, build `.292`), `375e11f` (build-log count correction) and `e1db674` (mutation-registry reconcile, build `.293`). Tree clean, CI green.
Range: be7da1c..e1db674
Plan of record: `Claude/Plans/PLAN-swipe-declone.md` §13 step 10 (forge `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r4.md`). RED suite: `Claude/Curie/RED-swipe-declone-stage2.md`, committed at `be7da1c`. Build log: `Claude/Brunel/swipe-declone-stage2-build.md`.

`Verdict: PASS` — the product change is correct and complete against the Stage 2 specification, and the two invariants the whole stage turns on (D6 distinctness, D6 landing) are real in the code and proven by execution. Three findings are required fixes before the stage closes — *fix-then-ship* in this seat's grammar — and **none of them blocks the device gate**. The one thing that does gate the device pass is not a defect in this build: plan §9 item 5 makes **step 10a a gate ordering**, and step 10a has not been run.

---

## The scene, and what it intends

`browse→browse` was the last transition whose two ends shared one real host, so it covered the view with a clone of `.app` while `#browse` was overwritten for the incoming render. The change makes it move two real elements like every other transition, and then deletes the copying machinery.

The mechanism is a split of one role in two. `#browse` keeps its `position: fixed` inset box and gives up only `overflow-y: auto` and its padding; each `.browsepage` becomes `position: absolute; inset: 0` inside it and takes the padding, the overflow and its own `scrollTop`. Because a page then owns its offset natively, the `sy` cache, its scroll listener, the `restoring`/`restoreGen` token pair and the two-frame finalizer are deleted outright, and the entry rule inverts from "write the remembered Y" to "write only a derived Y, else write nothing."

The JavaScript half is the part the plan's round-2 review had to force, and it landed: `classifyTransition` projects a new `'browse-page'` host on **both** ends for a browse pair only, resolved app-side through one new `Browse.pageElFor(desc)`; `Browse.endHold` is told the screen the gesture landed on and reconciles park/hide/activation from it, replacing the abort re-render that was the only thing putting the page selection back; `finalizationPlanFor`, its `abortRender` decision, every `finPlan` reader and the `Construction.capture` field go with the clone. `resetSwipeStyles` widens to every `.browsepage` — the first borrowed mover carrying no id — and `ScrollBar.surfaceKind` gains the page case.

Scope matches the description. Three commits, one of them functional; the other two are the build log and a mutation-registry reconcile that touches one test cell and `tools/mutate.mjs`. No production file outside the plan's declared ranges is touched except the four build stamps.

## What I checked by running it, not by reading it

**The contract surface holds on every axis I could feed an input to.** `constructionPlanFor` throws on a garbage `fromKind` *and* on a garbage `toKind` — both parameters it branches on, which is the exact gap a prior review of this module missed. `classifyTransition` rejects a malformed descriptor in **both** roles (`authorBooks` with no author as source, `files` with no book as destination) and an unknown screen name. Both returns are deep-frozen, and a caller-owned decorations array is cloned rather than frozen in place. `capture` is genuinely **absent as a key**, not nulled — and `test/swipe-construction.test.js` was migrated to `!('capture' in c)`, which is the stronger assertion.

**`Browse.pageElFor` never returns a null mover.** Nine shapes fed directly — a cached hit, an uncached view, `home`, a parameterized descriptor with its payload missing, `undefined`, `{}`, `null` — every miss throws. There is no path where `undefined` reaches a transform write.

**`Browse.endHold` is total over its argument domain, and that was the plan's F19 coordinate.** Fourteen landed values driven directly, including `null`, `undefined`, `{}`, `{v:'garbage'}` and both parameterized descriptors with their payloads stripped: **not one throws.** That matters more than it looks — a throw there runs inside the finalize `finally`, past `if (!ok) finishing = false;`, and would wedge every future swipe. The non-throwing `keyFor` probe closes it by construction, exactly as specified.

**The landing genuinely decides.** Driven directly from the mid-gesture class state: an abort of `books→authorBooks(A)` leaves `books` shown and `authorBooks` hidden; the commit is the mirror image. The entry rule writes `[]` for a list page and `[0]` for a files page.

**The generated inventories are truthful.** Re-running both generators leaves `git status` empty — the committed `docs/*.generated.txt` are exactly what the current frozen spec produces.

**Two mutation shards, run here rather than taken on trust:** 22 mutants, `0 uncaught, 0 unapplied, 0 stale flags`, tree clean and no `*.mutbak` afterwards. Those shards happen to include the new `BROWSESURFACE`, `NPPILLIDS`, `NOGHOSTATALL` and `PAGEOWNSSCROLL` mutants and both `FILMSTRIPDRAG` cells.

## Where the gates were migrated rather than narrowed

This was risk R-F, and it did not happen. `BROWSEFIXED` did not merely drop its `overflow-y: auto` assertion — it **inverted** it to `assert.doesNotMatch(body, /overflow-y/)`, so leaving a second scroll authority on `#browse` now reddens. `paneOf` went from `c.outgoing === 'app-ghost'` to `c.outgoing !== 'real-source'`, so a *newly-named* copy outcome is reported as a pane instead of passing silently. `NOGHOSTINFLOW` lost its `app-ghost` expectation and gained three explicitly named rows for the shipped in-flow transitions. The M1WRITERSET baseline was re-derived entry by entry with the group-count check preserved. The `NOAPPCLONE` temporary exception is gone and the gate is green with one permanent entry.

The red suite was **un-skipped, not rewritten**: every edit to `test/swipe-declone-stage2-*.test.js` in this range is the removal of a `SKIP-PENDING-BUILD` marker. The only assertion that changed value is `NOGHOSTINFLOW`'s, and it had to.

## The same-key mover pair — what the code actually does

The tension is filed for the planner and I am not resolving it. What is in my scope is whether the shipped code is safe under **both** readings, and the answer is: under one of them it is not.

Executed: `authorBooks(A) → authorBooks(A)` classifies as a browse pair, projects `'browse-page'` on both ends, and `buildConstruction` returns **the same node in both mover slots** — `SAME NODE IN BOTH SLOTS? true`. That is the D6 distinctness failure the plan describes in terms: the second transform write wins, the single page slides off at `base + t` and nothing arrives. No guard exists, and `MOVERSDISTINCT` cannot see it — both its fixtures use two different keys, so the cell is green on the defect.

Two things sharpen this. First, before Stage 2 the same pair was **benign**: the outgoing slot was a clone, so the two slots were distinct by construction. Stage 2 converts a harmless coordinate into a broken one. Second, the only thing standing between HEAD and that outcome is a trigger census that is not pinned by anything — and its citations do not resolve (finding **F5**).

I traced the reachability independently and reached the builder's conclusion: `navTo` (`js/app.js:138-145`) replaces the stack top only for a bare descriptor, so a parameterized one always pushes; but no screen offers a control that opens itself — `authorRow` renders only on the authors page, `bookRow` only on books/authorBooks, the home tile only on home, and the NP forward nav has an overlay source. So it is not demonstrably reachable today. It is undefended, ungated, and one new link away.

## Findings

| # | Severity | Where | What |
|---|---|---|---|
| F1 | Significant | `test/browse-render-race.test.js:52-65` | The guard cell for the late-fetch scroll guard is now **vacuous** — it cannot fail |
| F2 | Significant | `js/swipe.js:107-111`; `js/app.js:557`, `:566` | A same-key browse pair resolves both mover slots to one node; no guard, and `MOVERSDISTINCT` is green on it |
| F3 | Minor | `js/browse.js:192-193` | The miss-branch comment names four transitions; two of them take the **landed** branch |
| F4 | Minor | `docs/transition-matrix.generated.txt:12`; `tools/gen-transition-matrix.mjs:84` | Header still advertises "abort is frozen finalization data" for a column this commit deleted |
| F5 | Minor | `Claude/Brunel/swipe-declone-stage2-build.md` §1 | All three `file:line` citations in the trigger census — the sole defence for F2 — point at the wrong lines |
| O1 | Observation | `tools/mutate.mjs` (NOOP de-registration); plan §12 item 14 | States `keepGhosts` guards a sweep "RETAINED for the NP pill float"; it guards the `.nav-ghost` sweep, `js/nav.js:105`. The pill sweep is `:106` and is unguarded |
| O2 | Observation | `js/swipe.js:86-88` | Module comment still says `sameBrowseHost`'s "only consumer is the stage-6 abort re-render" — a consumer this commit deletes |
| O3 | Observation | `js/browse.js:560-570` | Comment describes `applyScrollY → window.scrollTo` yanking *another* page's scroll. Neither is true now: the write is `page.scrollTop`, and a late fetch can only move its own page |

### F1 — the late-fetch guard has no cell that can fail

`js/browse.js:571` carries `if (browseVisible() && !offscreen(page)) positionOnEnter(desc, page);` — a guard added for an externally-reported (MED) defect where a slow fetch for page A scrolled the page the user had moved to. Its cell is `test/browse-render-race.test.js:52`, which drives `{ v: 'books' }`.

After Stage 2 a **list page derives no entry position at all**, so `positionOnEnter` writes nothing whether the guard fires or not. Executed both readings against the file's own fixture:

```
A (navigated away — guard SHOULD suppress): []
B (stayed on the page — guard NOT engaged): []
CONTROL (files page, stayed):               [0]
```

Reading B is the discriminator, and it is empty. The assertion `assert.deepEqual(scrolls, [])` is satisfied by a build with the guard deleted.

What makes this a required fix rather than an observation: the builder identified this exact vacuity class **in this exact file**, wrote it into the file's rewritten header ("a host-only spy would record nothing and every 'must not scroll' assertion below would pass vacuously"), and applied the fix — switch the descriptor to a files page — to the control at `:75` and to the third cell at `:98`. This one was left on a list page. The fix is the same one word.

### F2 — see *The same-key mover pair* above

Severity Significant on fragility, not on present breakage: I could not construct a UI path, so it is not reachable-and-broken and does not make this do-not-ship. It is undefended by construction, invisible to its own cell, and asserted to be reachable by a live gate file (`test/fixtures/swipe-plan-spec.mjs:105`). Either the frozen spec's prose is corrected, or the coordinate is closed — leaving both is what a later session will trip over.

### F3 — two shipped transitions take the branch the comment says they don't

`js/browse.js:192-193` reads: *"A landing that names NO cached browse page — browse→home, browse→overlay, home→browse, overlay→browse."* Executed: with `books` in the cache, `endHold(tok, {v:'books'})` takes the **landed** branch. `home→browse` and `overlay→browse` land on a browse page that the drag-start render has just cached, so two of the four named transitions take the landed branch, not the miss branch.

The behaviour is correct — arguably better, because the landed branch deactivates non-landed controllers *before* `.hidden` lands, which is the ordering `showPage` states and the miss branch does not follow. But the enumeration is false, it is the same enumeration plan §5.3.6 makes, and the consequence is that the plan's claim that all four shipped transitions are "exactly as HEAD leaves them" is unevidenced for two of them: `LANDEDPAGESHOWS`'s miss half drives `browse→home` only.

### F5 — the census citations

The census in §1 of the build log is the entire justification for shipping F2's coordinate unguarded, and every `file:line` in it misses:

| Log says | Actually at that line | Correct line |
|---|---|---|
| `authorRow (js/browse.js:753)` | `const rm = wrap.querySelector('.readmore');` | `js/browse.js:771` |
| `bookRow (js/browse.js:783)` | `el.onclick = () => o.onOpenAuthor(a);` — inside **authorRow** | `js/browse.js:788` |
| home tile `(js/app.js:1547)` | `const nm = pl.querySelector('.pname'), …` | `js/app.js:1409` (`renderTile` at `:1388`) |

The conclusion is right — I re-derived it — but an argument that rests on an enumeration must be walkable, and this one sends the next reader to three wrong places, one of which lands inside the sibling function.

## What is owed before the device gate, and it is not a defect in this build

Plan §9 item 5 and §18 F5 make **step 10a a gate ordering, not a code ordering**: the real-engine park-geometry probe must read **zero** on the reveal delta after a mid-park content mutation *before* step 10b puts this in front of a device. It has not been run. The box-equality half already reads 0 on three axes from the round-2 measurement; the reveal-delta half is what remains.

The reason it matters is attribution, not caution. Stage 2 deliberately changes one variable at the scroll-anchoring surface (its identity moves from `#browse` to `.browsepage`) so the open abort-repaint symptom has one candidate cause when the device looks at it. If the park box is not provably identical, there are three, and the device pass cannot separate them — which is precisely the confound the plan's sequencing ruling exists to remove.

## Prediction

If F1 is left, the guard at `js/browse.js:571` is unprotected, and it is a guard this project has already had to add once after an external report. The next change that touches `positionOnEnter`'s call conditions — step 11's subtraction is the obvious candidate, since it walks that region — can delete or invert it and ship green.

If F2 is left, nothing happens until somebody adds an author link to an author's page or a book row to a files page. That is a small, plausible, entirely reasonable feature request. When it lands, the swipe between two of those screens slides one page off and reveals whatever is behind it, and the two things that would normally catch it — `MOVERSDISTINCT` and the frozen spec — will both be green, because one uses two different keys and the other says the case is fine.

F3 and O1–O3 cost a future reader a wrong turn each. F5 costs whoever re-audits the census the time to find the three functions themselves.

---

## Coverage Ledger

Dimensions: **C** correctness/data-flow · **D** deferred-resource cancellation · **L** object lifetime / cross-call state · **T** teardown symmetry · **R** reassuring-comment verification · **E** absolute/enumerated claim executed · **F** dead returned field · **P** plan-conformance (Stage 2 spec) · **V** test vacuity / mutation.

Mark grammar: `✓` cleared by a command run **this pass** (commands cited below) · `~` cleared by reading/reasoning, not executed · `n/a` · a finding id.

| Row (changed symbol / file) | C | D | L | T | R | E | F | P | V |
|---|---|---|---|---|---|---|---|---|---|
| `js/swipe.js` module header (SCOPE, D1 note) | ~ | n/a | n/a | n/a | O2 | n/a | n/a | ~ | n/a |
| `classifyTransition` — `browsePair`, `sourceHost`, `destinationHost` | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `constructionPlanFor` — `outgoing` const, `renderDestination: 'browse-page'` | ✓ | n/a | n/a | n/a | ~ | ✓ | ~ | ✓ | ✓ |
| `paneBuilders` — clone-fidelity cluster deleted, `npPillClone` retained | ✓ | n/a | n/a | ~ | ~ | ✓ | n/a | ✓ | ✓ |
| `buildConstruction` — `capture` removed, comments | ✓ | n/a | n/a | n/a | ~ | ✓ | ✓ | ✓ | ✓ |
| `finalizationPlanFor` + `abortRender` — deleted | ✓ | n/a | n/a | ~ | ~ | ✓ | ✓ | ✓ | ✓ |
| `js/browse.js` `init` — `sy` scroll listener deleted | ✓ | ✓ | ~ | ✓ | ~ | n/a | n/a | ✓ | ✓ |
| `restoring`/`restoreGen`/`beginRestore`/`endRestore`/2-frame rAF — deleted | ✓ | ✓ | ~ | ✓ | ~ | n/a | n/a | ✓ | ✓ |
| `keyFor` (new) | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `endHold(token, landed)` — landed + miss branches | ✓ | n/a | ✓ | ~ | **F3** | ✓ | n/a | ✓ | ✓ |
| `pageElFor` (new) | ✓ | n/a | ~ | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `entryScrollY` / `positionOnEnter` / `applyScrollY(page,y)` | ✓ | ✓ | ✓ | n/a | O3 | ✓ | n/a | ✓ | **F1** |
| `playingTrackY(book, page)` read target | ~ | n/a | ~ | n/a | ~ | ~ | n/a | ✓ | ✓ |
| `showPage` — comment only | ~ | n/a | ~ | ~ | ~ | n/a | n/a | ✓ | ✓ |
| `virtualView` metrics/`scrollTo` closures → `m` | ✓ | n/a | ✓ | n/a | ~ | ~ | n/a | ✓ | ✓ |
| `Browse` exports + `_test` (`isRestoring` dropped) | ✓ | n/a | n/a | n/a | n/a | ✓ | ✓ | ✓ | ✓ |
| `js/nav.js` `resetSwipeStyles` — `.browsepage` added | ✓ | n/a | ~ | ✓ | ~ | ~ | n/a | ✓ | ✓ |
| `js/scrollbar.js` `surfaceKind` + header comments | ✓ | ~ | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `js/app.js` `dropRowHold` → `currentDesc()` | ✓ | n/a | ✓ | ~ | ~ | ✓ | n/a | ✓ | ✓ |
| `js/app.js` hard-reset `applyScreen(render:false)` | ~ | n/a | ~ | ~ | ~ | ~ | n/a | ✓ | ✓ |
| `js/app.js` session `finPlan` removed | ✓ | n/a | ~ | n/a | ~ | ~ | ✓ | ✓ | ✓ |
| `js/app.js` `env.sourceEl` / `env.renderDestination` `'browse-page'` | ✓ | n/a | ~ | n/a | ~ | ✓ | n/a | **F2** | **F2** |
| `ghostVsReal` / `fadePanes` / `FADE_MS` — deleted | ✓ | ✓ | n/a | ✓ | ~ | ~ | ✓ | ✓ | ✓ |
| `holdGhostUntilPaintable` + abort held-reveal — deleted | ✓ | ✓ | ~ | ✓ | ~ | ~ | ✓ | ✓ | ✓ |
| `js/app.js` abort `applyScreen(render:false)` | ✓ | n/a | ~ | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `js/app.js` residual `revealPending` / `c.capture` / `cover.diff` readers | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✓ (step 11) | ~ |
| `js/debug.js` `BUILD` | ✓ | n/a | n/a | n/a | n/a | ✓ | n/a | ✓ | n/a |
| `css/app.css` `.browsepage` base + `body.has-player` | ✓ | n/a | n/a | n/a | ~ | ~ | n/a | ✓ | ✓ |
| `css/app.css` `.browsepage.parked` (Invariant P) | ~ | n/a | n/a | ~ | ~ | ~ | n/a | ✓ | ✓ |
| `css/app.css` `#home.parked` comment re-derivation | n/a | n/a | n/a | n/a | ~ | n/a | n/a | ✓ | ✓ |
| `css/app.css` `#browse` rule + comment; `body.has-player #browse` | ✓ | n/a | n/a | n/a | ~ | ~ | n/a | ✓ | ✓ |
| `css/app.css` native-scrollbar suppression list | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `index.html`, `sw.js`, `build.json` stamps | ✓ | n/a | n/a | n/a | n/a | ✓ | n/a | ✓ | n/a |
| `Claude/Decisions/PolicyLedger.mjs` `PL-swipe-browse-fixed-ownscroll` | ~ | n/a | n/a | n/a | ~ | ~ | n/a | ✓ | ✓ |
| `tools/gen-swipe-model.mjs` | ✓ | n/a | n/a | n/a | ~ | ✓ | ~ | ✓ | ✓ |
| `tools/gen-transition-matrix.mjs` | ✓ | n/a | n/a | n/a | **F4** | ✓ | ~ | ✓ | ✓ |
| `docs/swipe-model.generated.txt` | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `docs/transition-matrix.generated.txt` | ✓ | n/a | n/a | n/a | **F4** | ✓ | n/a | ✓ | ✓ |
| `tools/mutate.mjs` (24 registered / 13 re-anchored / 16 de-registered) | ~ | n/a | n/a | n/a | O1 | ✓ | n/a | ✓ | ✓ |
| `test/fixtures/swipe-plan-spec.mjs` (frozen oracle) | ✓ | n/a | n/a | n/a | **F2** | ✓ | n/a | ✓ | ✓ |
| `test/no-view-clone-gate.test.js` (exception 2 removed) | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/contract-function-gate.test.js` | ✓ | n/a | n/a | n/a | ~ | ✓ | ✓ | ✓ | ✓ |
| `test/construction-consumers.test.js` | ✓ | n/a | n/a | n/a | ~ | ✓ | ✓ | ✓ | ✓ |
| `test/scroll-writer-set.test.js` (M1WRITERSET) | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/browse-decouple.test.js` (BROWSEFIXED/SCROLLBAR migrated, RESTORE deleted) | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/browse-render-race.test.js` | ✓ | n/a | ~ | n/a | ~ | ✓ | n/a | ✓ | **F1** |
| `test/browse-virtual.test.js` | ✓ | n/a | ✓ | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/repaint.test.js` | ✓ | ✓ | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/screens.test.js` | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/app-harness.js` (fake `pageElFor`, `endHold` landed arg) | ✓ | n/a | ~ | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/swipe-declone-stage2-{browse,construction,css,reset}.test.js` (un-skipped) | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/swipe-declone-stage1.test.js` (NOGHOSTINFLOW re-subjected) | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/swipe-invariants.test.js` (1a mover-set repair, I2/I20 + held-reveal retired) | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | n/a | ✓ | ✓ |
| `test/swipe-stage5-wiring.test.js` (two-page mover assertion) | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/swipe-construction.test.js` (CONSTRUCTION_KEYS, capture cells) | ✓ | n/a | n/a | n/a | ~ | ✓ | ✓ | ✓ | ✓ |
| `test/swipe-model.test.js`, `test/swipe-transition.test.js`, `test/transition-matrix.test.js` | ✓ | n/a | n/a | n/a | ~ | ✓ | n/a | ✓ | ✓ |
| `test/swipe-gesture.test.js`, `swipe-stage5-residuals`, `stage6`, `stage6b-loser-cancel`, `stage6c`, `stage6e` | ✓ | ✓ | ~ | ✓ | ~ | ✓ | n/a | ✓ | ✓ |
| `test/swipe-stage6d.test.js`, `test/ghost-clone-alignment.test.js` — deleted | ✓ | n/a | n/a | n/a | ~ | ✓ | ✓ | ✓ | ✓ |
| `Claude/Brunel/swipe-declone-stage2-build.md` | ~ | n/a | n/a | n/a | **F5** | ✓ | n/a | ~ | ~ |

### Commands run this pass (the basis for every `✓`)

- `node --test "test/*.test.js"` → **807 tests, 806 pass, 0 fail, 1 skipped**
- `node tools/mutation-sweep.mjs --shard=0/12` and `--shard=1/12` → 22 mutants, **0 uncaught, 0 unapplied, 0 stale flags** on both; `git status --porcelain` empty and no `*.mutbak` afterwards
- `node --test test/mutation-anchors.test.js` → 4/4 pass (no `ANCHOR NOT FOUND`)
- `node tools/stamp-build.mjs --check` → all files match `build.json` (`2026-08-01.293`)
- `npx eslint js sw.js` → exit 0; `npx tsc -p jsconfig.json` → exit 0
- `node tools/gen-swipe-model.mjs; node tools/gen-transition-matrix.mjs; git status --porcelain` → **empty** (generated docs reproduce byte-identically)
- Probe 1 (contract surface: all pairs, same-key pair, malformed input on each branching parameter, freeze/clone contracts, return keys) — `SAME NODE IN BOTH SLOTS? true` for the same-key pair
- Probe 2 (vacuity of `browse-render-race.test.js:52`) — readings A and B both `[]`, files control `[0]`
- Probe 3 (`pageElFor` throw contract ×9 shapes; `endHold` over 14 landed values; landing decides on abort and commit; entry-write rule) — no throw in any `endHold` row
- `grep -n "function authorRow\|function bookRow" js/browse.js` → `771` / `788`; `grep -n "openFiles(b)" js/app.js` → `1409` (F5)

Probes live under the session scratchpad, outside the repo; nothing in the working tree was modified.

### What the suite cannot see, by construction

Occlusion, stacking, paint order, compositing, cover re-decode, flash, scroll anchoring, `transitionend`, and whether an off-viewport absolutely-positioned page paints outside the viewport. Every cell in this range asserts source text, class state, call counts, call ordering, DOM identity or a written property — I found no cell claiming a rendered geometry. Those questions are §15's and are device- or real-engine-owed; they are not gaps in this build.

---

## Watch-list

Carried from `c4cfd7e-one-screen-type-stageA1.md`:

- **[W1] [W4] [W7] [W11] [W13] [W16] [W18] open** — apply-on-approval records for stages 6b/6c/6d/6e/6f/6g/6h un-applied in HEAD. Owner Zelda.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device.
- **[W5] open** — Loki r2 lesser-planes (`recovery-overlay-visibility-unpinned`→Mendeleev; `paneless-predicate-phase-coupling`→Brunel). Note: `paneLess` (`js/app.js:266`) is now constant-true and is a step-11 subtraction item.
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat.
- **[W8] open** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda.
- **[W9] open** — Loki 6e residual 2: unguarded `.nav-ghost === owned-pane(live session)` invariant. Now vacuous in practice (no pane is built), formally open until step 11.
- **[W10] open** — `disposeOwnedPanes`/`dropPanes` byte-identical removers; both are now no-ops and both are step-11 items.
- **[W12] open** — 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Owner Mendeleev.
- **[W14] open** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device.
- **[W21] open** — a fresh Loki strike against the BUILT 6i code remains the plan's next gate. Owner Loki.
- **[W22] [W23] [W24] [W25] open** — 6i `#home` device gates R1(a)-(e). Owner on-device.
- **[W26] open** — 6i apply-on-approval records (plan §13 amendments/annotations). Owner Zelda.
- **[W28-residual] open** — pre-existing `(ghost/snapshot)` taxonomic comments over-listing the now-single pane-owning kind. **Widened by this build**: `js/swipe.js` and `js/app.js` still carry ghost-era vocabulary throughout the settle path. Plan §13 step 14 owns the HEAD-wide scrub. Owner Zelda/Brunel. Non-blocking.
- **[W29] open** — `plan.incoming` single-valued/production-unread. **Extended by this build**: `plan.outgoing` and `plan.renderDestination` are now production-unread too (only `plan.decorations` has an L3 consumer). All three are deliberate per plan §6 and are exact-key-gated by `test/construction-consumers.test.js`, so this is a standing decision to re-confirm, not a new dead field. Owner Vitruvius. Non-blocking.
- **[W30] [W31] [W32] [W33] open** — browse-decouple device gates R-flash / R-navbar / R-strip / R-browse2browse. Owner on-device.
- **[W34] open** — no `DecisionLog.md` NEW-POLICY entry for `PL-swipe-browse-fixed-ownscroll`. The ledger entry itself was correctly re-derived in this build. Owner Zelda. Non-blocking.
- **[W35] open** — build-log "Files changed" lists omit the four build-stamp files. **Third observation**: `Claude/Brunel/swipe-declone-stage2-build.md` names no stamp file either. The `stamp --check` gate covers the risk mechanically; this is a records-completeness pattern. Owner Brunel/Zelda. Non-blocking.
- **[W36] noted** — Flash C (browse→browse in-list divider re-raster) out of scope; not a regression of any build here.
- **[W37] RESOLVED: `js/nav.js:193` now guards `overlayFilmstrip`'s reconcile on `d.gestureOwnsMovers()`** (`js/app.js:250`, `!!session && session.live` — true from go-live to session release), so the reconcile cannot run during a live gesture's ownership of its movers. Verified by execution: mutants `#96` (FILMSTRIPDRAG-a, guard removed) and `#97` (FILMSTRIPDRAG-b, ARMED-vs-LIVE trap) are both caught in the shards I ran. This closes the item ahead of the widened `resetSwipeStyles`, which would otherwise have wiped both `.browsepage` movers mid-drag.
- **[W38] open** — three shipped prose sites state the exclusivity universal plan §5.1 forbids (`css/app.css` ×2, `test/page-bg-single-painter.test.js` ×2). Untouched by this build. Owner Brunel.
- **[W39] [W40] open** — A1b-scheduled mutant/comment rot (`#104`/`#106`, `NPUNTOUCHED`, `js/nav.js:71-72`). Untouched. Owner Vitruvius + the A1b builder.
- **[W41] open** — `showAppView`'s sweep is LIVE and must be KEPT; determination filed at the prior casebook and not to be re-opened. Owner Vitruvius/Zelda.
- **[W42] open** — plan §5.2's `.alphaindex` argument for A2 does not cover the browse↔settings gesture window. Owner Vitruvius.
- **[W43] open** — device-owed R-B / R-C / R-E / R-G, unclaimed by any cell. Owner on-device.
- **[W44] open** — `js/app.js:2523`, `:3030`, `:3123` refresh handlers call `applyScreen(d, { render: true })` for browse descriptors with **no** `gestureOwnsMovers` guard, unlike `overlayFilmstrip`. **Sharpened by this build**: such a call landing mid-drag now clears the inline transform on both `.browsepage` movers *and* re-runs `showPage`. The class is pre-existing and was arguably worse before (the same call removed the `.nav-ghost` node outright), so this is not a Stage 2 regression — but the victim changed and the guard pattern that fixes it now exists next door. Owner Brunel. Non-blocking.

New this build:

- **[W45] open (NEW)** — **F1.** `test/browse-render-race.test.js:52-65` is vacuous; the late-fetch guard at `js/browse.js:571` has no cell that can fail. Executed both readings. One-word fix (files descriptor), already applied by the builder to the other two cells in the same file. Owner Brunel, via the apply-review of this casebook.
- **[W46] open (NEW)** — **F2.** A same-key browse pair puts one node in both mover slots (`js/swipe.js:107-111`; `js/app.js:557`, `:566`); executed. Undefended, and `MOVERSDISTINCT` is green on it because both its fixtures use two different keys. Safety rests entirely on an unpinned trigger census. `test/fixtures/swipe-plan-spec.mjs:105` asserts the pair IS reachable — under that reading the shipped code is unsafe. **Filed for the planner; not resolved here.** Re-armed by any new author link on an authorBooks page or book row on a files page. Owner Vitruvius.
- **[W47] open (NEW)** — **F3.** `js/browse.js:192-193` (and plan §5.3.6) name `home→browse` and `overlay→browse` as miss-branch transitions; they land on a cached page and take the landed branch. Executed. Behaviour correct, enumeration false, and no cell covers those two. Owner Brunel (comment) + Vitruvius (plan).
- **[W48] open (NEW)** — **F4.** `docs/transition-matrix.generated.txt:12` / `tools/gen-transition-matrix.mjs:84` advertise an `abortRender` column this commit deleted. Owner Brunel.
- **[W49] open (NEW)** — **F5.** All three trigger-census citations in `Claude/Brunel/swipe-declone-stage2-build.md` §1 point at wrong lines; the census is the sole defence for W46. Owner Brunel.
- **[W50] open (NEW)** — **O1.** `tools/mutate.mjs`'s NOOP de-registration reason (and plan §12 item 14) state that `keepGhosts` guards a `js/nav.js` sweep "RETAINED for the NP pill float". It guards the `.nav-ghost` sweep at `:105`; the pill sweep at `:106` is unguarded. Behaviourally inert; the stated retention reason for `:105` is therefore unsupported and `:105` is a clean step-11 deletion. Owner Vitruvius/Brunel. Non-blocking.
- **[W51] open (NEW)** — **step 10a gates step 10b.** The real-engine park-geometry reveal-delta probe has not been run, and plan §9 item 5 / §18 F5 make a non-zero result a stop condition for the device gate. Not a defect in this build; it is the deriver's row. Owner the deriver, **before** the user's device pass.
- **[W52] noted (NEW)** — the two uncaught mutants CI found on `375e11f` (`#34` r223-1a, `#60` RSN-mistag) are both reconciled in `e1db674` and the repair to the `1a` cell is sound and gains a real anti-vacuity check. I swept the class — `test/swipe-stage5-wiring.test.js:51` is the only other cell naming `#browse` in a transform assertion, and it correctly asserts the *absence* of a transform plus two page movers with signed bases. No further instance found. Recorded so the class is not re-swept from scratch.

---

Verdict: PASS
