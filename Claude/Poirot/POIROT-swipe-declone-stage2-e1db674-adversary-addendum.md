# Addendum — cold-read adversary pass over the Stage 2 de-clone diff

Filed by Zelda, 2026-08-01. **Source:** the cold-read adversary subagent Poirot dispatched during
`POIROT-swipe-declone-stage2-e1db674.md`. Poirot's verdict (**PASS**, fix-then-ship) did **not**
depend on it and closed before it reported. Recorded here because its findings existed only in a
handoff message — unfiled work is a dropped thread regardless of its quality.

**Diff under review:** `be7da1c..e1db674` (builds `.291`→`.293`). It formed its own account of the
change before reading any persona artifact.

---

## ⚠️ Environment hazard — concurrent tree mutation, and it was ours

While the adversary was sweeping, **another agent in the same dispatch tree ran
`tools/mutation-sweep.mjs --shard=0/12` against the same working tree** (PID 22380), applying mutants
to `js/*.js` in place. Poirot and its own subagent were sweeping concurrently.

This is the `no-concurrent-tree-mutating-agents` hazard, and it arose **inside a single dispatch** —
a seat spawning a helper that mutates the same tree the seat is measuring. The dispatcher's fan-out
gate does not see that, because only one top-level agent was live.

The adversary handled it correctly: it re-verified on a confirmed-clean tree, re-ran the four mutants
its findings depend on, and confirmed `git status` clean with no `*.mutbak`. **It did not re-run all
24**, and says so. Its findings stand; the residual is that three early sweep batches may have
overlapped the other run.

⭐ **The transferable rule:** a seat that dispatches a helper must not let it mutate a tree the seat
is concurrently measuring. Sequence them, or give the helper its own worktree.

---

## Findings

### A1 — the ABORT phase of `LANDEDPAGESHOWS` (`browse→home`) is a false witness. *Significant*
`test/swipe-declone-stage2-browse.test.js:409-447`. The cell's title, header and assertion message
all claim it drives a gesture landing on **no** browse page through *both* an abort and a commit. It
does not. On a `browse→home` **abort**, `currentDesc()` is still the browse source, so
`keyFor(landed)` = `'books'`, which **is** in `pageCache` → `js/browse.js:172` takes the LANDED
branch, not the fallback the cell claims to guard.

Measured by wrapping `Browse.endHold` and recording the branch:

| gesture | landed | key | branch |
|---|---|---|---|
| `browse→browse` abort | books | books | LANDED |
| `browse→browse` commit | authors | authors | LANDED |
| `browse→home` **abort** | books | books | **LANDED** ← claimed "miss" |
| `browse→home` commit | home | home | miss |

Mutant `#119` (`landedKey != null && pageCache.has(landedKey)` → `landedKey != null`) is a **no-op on
the abort path**, so that phase is structurally incapable of failing on the defect. The mutant *is*
caught — solely by the commit phase. No coverage is lost; half the cell asserts a property it can
never test. Same shape the plan's §14 warns about one row above.

### A2 — `js/browse.js:192-193`'s fallback comment is wrong about three of the four transitions it names. *Minor (comment)*
It claims `browse→home`, `browse→overlay`, `home→browse`, `overlay→browse` all land on no cached
browse page. Measured: only **one outcome of each pair** takes the miss branch. The adversary traced
both branches and could construct **no behavioural divergence** (`deactivate()` early-returns for a
non-active/suspended controller, `js/virtuallist.js:255`; the class toggles reach the same end state
because `showPage` guarantees at most one non-offscreen page). A documentation defect — but it is the
comment that made A1 findable.

### A3 — `js/app.js:990` reads `cover.diff`, whose only writer this commit deleted. *Minor*
`js/app.js:709-710` says *"Its one reader, the `ghostVsReal=` field on the reveal report, goes with
it."* It did not. `:990` still evaluates the field, now permanently `''`. Harmless at runtime; dead
code left by a pulled-forward deletion whose comment claims completeness.

### A4 — the generated transition matrix still advertises a removed column. *Minor*
`tools/gen-transition-matrix.mjs:84,86`. The abort column was removed from the data and header rows,
but `:84` still emits *"abort is frozen finalization data"* and `:86` still carries a 7th separator.
The frozen spec explicitly warns its absence "must NOT be read as 'finalization is verified'" — and
the generated doc, which is what a reader actually consults, says the opposite.

### A5 — the harness fake `Browse.pageElFor` never throws, while its comment claims it throws "exactly as the real accessor does". *Significant*
`test/app-harness.js:582-596`. The fake synthesises and appends a `.browsepage` on every miss
(`:586-592`); the `throw` at `:595` is reachable only if `#browse` is absent, which the fixture
guarantees it is not. Measured: `pageElFor` returned an attached node for `{v:'books'}`,
`{v:'nowhere'}` and `{v:'home'}` — the real accessor throws for all three.
⇒ **Every harness test driving a `browse→browse` gesture without `realBrowse:true` is immune to the
one failure mode the new accessor exists to make loud.** This is the `FAKE FIDELITY IS LOAD-BEARING`
class: a fake kinder than reality hides the seam it fakes.

### A6 — dead test helpers. *Minor*
`test/browse-decouple.test.js:28-29,35` — `realSetTimeout`/`realSleep`/`mkGhostEnv` have no call
sites after `GHOSTSCROLL`, `STRIPEXCLUDE` and `RESTORE` were deleted. Nothing catches it:
`eslint.config.js:17` ignores `test/**`, so `no-unused-vars` never sees them.

### A7 — `sourceEl`'s `'browse-page'` branch ignores its `v` argument. *Minor / observation*
`js/app.js:556-558` resolves `Browse.pageElFor(d.from)` — module-level session state — while
`buildConstruction` passes a screen **name**, which cannot key a parameterized page
(`author:<rk>`/`files:<rk>`). Values agree in production, so no current bug. Three consequences: the
plan §6 contract is inaccurate for one host value; a mutant corrupting the passed `v` is uncatchable
on that branch; and the recipe-layer fake cannot reproduce production for `authorBooks`/`files`,
which is why that layer only exercises `books→authors`.

### A8 — `constructionPlanFor.outgoing` lost its last production consumer. *Observation*
`grep -rn "plan\.\(outgoing\|incoming\|renderDestination\)" js/` returns nothing. The plan §6
ratifies keeping it, but `tools/dead-return-fields.mjs:98-101` exempts CONTRACT seams on the grounds
the exact-key gate covers them — **and an exact-key gate cannot see a key with no consumer**, so the
no-dead-fields rule is unenforced exactly where this change added to it. Separately, `js/swipe.js`'s
comment that the declared field and the operative host "cannot disagree" is not a structural
guarantee: nothing compares them, and the plan's §17 records that `'home-host'` and `'home'` already
disagree.

### A9 — the "read after `applyScreen`" invariant holds only on non-throwing paths. *Observation*
`js/app.js:359-371` + `:1160-1163`. `dropRowHold()` sits in the finalize `finally`, so it also runs
when `runFinalize()` threw. On a commit the stack mutation precedes `applyScreen`, so a throwing
`applyScreen` hands `endHold` the destination descriptor while the destination was never applied. The
comment asserts the single read is correct "on the commit branch, the abort branch and the hard reset
alike" with no throw caveat.

### A10 — `pageElFor`'s throw path uses `JSON.stringify(desc)`. *Observation, unreachable*
A cyclic descriptor yields a `TypeError` instead of the named error. Descriptors are plain in
production.

---

## Verified TRUE — the negatives worth keeping

Recorded because a checked-and-clean claim is evidence, and re-checking it later is waste. Each was
settled by execution, not reading.

- Full suite green on a verified-clean tree (807/806/0/1); tracked tree clean before and after.
- All 24 new Stage-2 mutants killed, none survived, no `*.mutbak`; anchors gate 4/4.
- `classifyTransition` projects `browse-page` on **both** ends for **exactly** the `browse→browse`
  pair, across all 9 kind pairs and all 16 browse-family pairs; the four shipped transitions are
  untouched.
- `constructionPlanFor` throws on an unhandled kind on both ends — no default branch. Malformed and
  unknown descriptors rejected on both endpoints across 14 garbage inputs.
- Both returns frozen, `decorations` deep-frozen. `finalizationPlanFor` gone from the exports.
- `entryScrollY` returns `null` (not `0`) for every non-files view; `positionOnEnter` writes nothing
  when nothing is derived.
- **`endHold` never throws on any of 11 malformed `landed` values** — the F19 wedge coordinate. And a
  throw there really would wedge `finishing`: `dropRowHold()` precedes `if (!ok) finishing = false;`.
- `Browse.render`'s cache-miss path creates, appends and caches the node **synchronously before its
  first `await`**, so `renderDestination`'s `pageElFor(dest)` cannot miss.
- `evictLRU` cannot evict the outgoing page mid-drag. Every `clearCache()`/`reset()` site either
  re-renders immediately or cannot run on a browse screen.
- `.browsepage` scroll events reach both consumers despite `scroll` not bubbling — both listen with
  `{ capture: true }` on `document`.
- `resetSwipeStyles` clears all four properties on every `.browsepage` document-wide, including an
  orphan outside `#browse`; `keepGhosts` still gates only the `.nav-ghost` sweep.
- **No new deferred resource introduced, none orphaned.** The change adds zero listeners/timers/rAF/
  promises and *removes* the browse scroll listener, `applyScrollY`'s two-frame rAF, and
  `holdGhostUntilPaintable`'s `Promise.all` + double-rAF + 600ms net. No dangling cancel sites.
- `PARKLOSESTRANSFORM`, `BROWSESURFACE`, `MOVERHASBOX` are **not** vacuous — each carries an explicit
  anti-vacuity assertion and the sweep kills all six of their mutants.
- The anti-clone gate's temporary exception is deleted and the gate is **not** narrowed.
- `BROWSEFIXED` was **strengthened**, not narrowed. The M1WRITERSET baseline was re-derived, not
  pattern-narrowed. The coverage matrix's "16 cells, 29 mutants" arithmetic checks out.

## Could not settle
Everything the plan files as real-engine or device-owed (R2b, R2c/step 10a, R3, R4/R5, R7, R8) — the
adversary did not run the Chrome headless instrument. **Whether a `pageElFor` throw is reachable in
production**: no route found across every cache-clearing site, the LRU and the arm paths, but not
*proven* absent; if one exists the blast radius is bounded — the gesture dies but the settle timer
self-heals it within one gesture. Whether its first three sweep batches overlapped the concurrent
run. And whether the large test deletions left a dimension bare — that is plan step 13, the coverage
audit.
