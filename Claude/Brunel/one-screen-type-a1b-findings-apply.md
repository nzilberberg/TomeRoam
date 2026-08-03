# Build log — Stage A1b review application (F1–F4; ONE SCREEN TYPE)

Type: build log (review-application, not a new stage)

Plan of record: `Claude/Plans/PLAN-one-screen-type.md` §5.3, §13 steps 1/8/9/10, §14.
Code review of record: `Claude/Poirot/POIROT-one-screen-type-a1b-e6a2f2e.md` — **PASS,
fix-then-ship**, target `e6a2f2e` (build `2026-07-31.290`), reviewed at HEAD `690162c`.
Adversary of record: `Claude/Loki/STRIKE-one-screen-type-a1b.md` — **HELD_STONE**.
Starting HEAD for this pass: `00e8c48`. **No product code (`js/`, `css/`) is touched — the
review's own verdict is that the product change is correct and complete.** This build applies
F1–F4 only, per the invocation's scope. F5 and F6 are routed to the coverage auditor and are
deliberately untouched here.

## F1 — the stale mutant-provenance claim, corrected and confirmed by execution

`test/one-screen-type.test.js`'s NPUNTOUCHED preservation-cell note claimed its failability was
carried by a registered mutant named `one-screen-type NPUNTOUCHED`. That mutant was de-registered
by the A1b build (its anchor, the `if (!npOpen)` settings-loop guard, no longer exists). The
comment now names the plan's §14-specified replacement, `one-screen-type NOSETTINGSBG-b`
(`tools/mutate.mjs`, unchanged by this pass — it was already registered in the A1b build), and
states the narrower truth: only the cell's `background` assertion is mutant-defended this way;
`position: fixed`, `inset: 0` and `z-index: 60` have no registered mutant at HEAD.

**Confirmed by execution, not assumed.** The registry has 135 entries; `NOSETTINGSBG-b` is index
`86` at this HEAD (re-derived from its name, not carried from any prior log's numbering):

```
node tools/mutation-sweep.mjs 86
#86  caught (2 failing) — one-screen-type NOSETTINGSBG-b: .nowplaying loses its own --page-bg
     background, so the one screen that must keep painting stops (-> NOSETTINGSBG painter-set
     equality; at HEAD, PAGE-BG-SINGLE-PAINTER)
       killed by: NPUNTOUCHED — the .nowplaying rule still declares its own inset, z-index and
                  background (source)
       killed by: NOSETTINGSBG -- exactly body::before and .nowplaying paint --page-bg; no other
                  screen rule does
swept 1: 0 uncaught, 0 unapplied, 0 stale flags
```

It reddens `NPUNTOUCHED` — the claim now made is true, and it is true by execution rather than by
assertion. Run twice: once during investigation, once again after the final edits to both test
files (the second run, quoted above, is the one that stands — a mutation result is only as current
as the suite it was measured against).

## F4 — the CELL MAP scrub, folded into the same edit

`test/one-screen-type.test.js:29-32`'s CELL MAP still described the retired NP-back-reveal
behaviour ("applying Now Playing leaves whichever settings screen was showing exactly as it was").
Rewritten to state the narrowed cell: the back-reveal subject retired at Stage A1b (moved to
NPPARKS), and what remains is the source-scan preservation of `.nowplaying`'s own inset/z-index/
background.

## F2 — stale `js/nav.js` citations in the stage's own proof of record

`test/one-screen-type-npparks.test.js` cited `js/nav.js:81` (the `hidden` toggle on `#nowplaying`)
and `js/nav.js:78-80` (the destination un-hide, three statements earlier) at two sites: the header
comment (`:12-13`) and the assertion message printed when `NPPARKS` from a settings screen fails
(`:128-129`). Verified independently at HEAD `js/nav.js` (not taken from Poirot's or Loki's brief):

- `:69` — `browseEl.classList.toggle('hidden', v !== 'browse')`
- `:70` — the six-way settings-screen `hidden` loop
- `:71` — `$('nowplaying').classList.toggle('hidden', !npOpen)` — the sole statement in `js/` that
  ever adds `hidden` to `#nowplaying`
- `:72` — `document.body.classList.toggle('np-locked', npOpen)`
- `:78` — `$('navbar').classList.toggle('hidden', !d.isSignedIn())` — a **different** `hidden`
  writer, confirming Poirot's finding that the stale citation lands on it

Both sites corrected: `:81` → `:71`, `:82` → `:72` (header); `:81` → `:71` and `:78-80` → `:69-70`
(assertion message), with "three lines earlier" corrected to "two lines earlier" to match the
shrunk range. The historical reference at `:126` to `js/nav.js:78` (the pre-A1b guard's own former
location, retired at Stage A1b) is untouched — it is a claim about history, not about HEAD, and
Poirot's finding does not reach it.

## F3 — the plan's status lines reconciled to shipped truth

`Claude/Plans/PLAN-one-screen-type.md`:

- `:39` (the Status table's A1b row) — added round 3 (`Claude/Charpy/PLAN-one-screen-type-A1b-charpy-r3.md`,
  `20c1663`, **FORGE**) to the Plan-review gate cell; replaced "Re-review OWED before build" with
  the shipped state: build `e6a2f2e` / `.290`, code review PASS fix-then-ship, adversary
  HELD_STONE, coverage audit of F5/F6 open, step-9 device gate OWED.
- `:98` ("Stage A1b is added, 2026-07-31, and is the next stage.") — corrected to state it is
  SHIPPED, with the commit/build and the two retroactive gate verdicts.
- §13 step 1 — was flagged "NOT discharged for A1b"; corrected to DISCHARGED, since round 3's
  FORGE is filed and the campaign gate reads it as the verdict of record and passes.
- §13 step 8 — was flagged "✅ BOTH PRECONDITIONS MET — this step is OPEN"; corrected to "✅ DONE
  — SHIPPED `e6a2f2e`, build `2026-07-31.290`", the rest of the cell (the description of what the
  build did) left as accurate historical record of the change.
- §13 step 10 — was an un-annotated instruction to review the build; prefixed with "**DONE**" and
  the code review's citation and verdict.
- §13 step 9 (device gate) — status unchanged (still OWED, correctly), but its item list gained a
  fourth check named by the adversary: scroll Books deep, open Now Playing, close it — the list
  must return to the same scroll position. Loki proved this holds in Blink (engine primitive and
  full path, 900→900); the device is WebKit and this is the named residual. Stated with an
  explicit gesture and observable, per this project's device-gate record convention, even though
  this edit is to the plan rather than to a `Claude/**/DEVICE-*.md` file (that file-format gate,
  `tools/hooks/device-gate-check.mjs`, does not scope to the plan).

`Claude/Zelda/Board.md` gained a dated entry recording this pass (F1–F4 applied, mutant `#86`
executed, next owner named) and the "Still open in this campaign" line for A1b was updated from
"four scrub items owed to Brunel/Zelda" to "F1–F4 scrubbed ... coverage audit (F5/F6) + the step-9
device gate owed."

## What was deliberately not touched

- **F5, F6** — routed by the review to the coverage auditor. Not applied here.
- **`js/`, `css/`** — read-only for this invocation; the review's verdict is that the product
  change is correct and complete, and nothing in F1–F4 implicates product code.
- **The plan's derivations** — §5.3's mechanism narrative, the load-bearing-set arithmetic, and
  every other section are untouched; this pass is status/state lines only, per its scope.
- **`Claude/Curie/RED-one-screen-type.md`** — a Stage-A1-era record of mutant `#104`'s original
  confirmation; historical and correctly scoped to that stage. `test/one-screen-type.test.js`'s
  preservation-cell note now points to this build log instead, since this is where today's
  confirmation of the *current* mutant is recorded.

## Verification

```
node --test "test/*.test.js"                 -> 824 tests / 823 pass / 0 fail / 1 skipped (33s)
node --test test/mutation-anchors.test.js    -> 4/4 ok
node tools/mutation-sweep.mjs 86             -> caught, killed by NPUNTOUCHED + NOSETTINGSBG
                                                 (run against the FINAL edited state, not an
                                                 intermediate one)
node tools/hooks/run-checks.mjs              -> no-mutbak, no-partial-sequence, stamp,
                                                 staged-stamp, lint, typecheck, tests,
                                                 campaign-gates, stage-manifest, retired-name,
                                                 device-gate -> PASS
git status --porcelain                       -> only the four intended files dirty, before and
                                                 after every command above
find . -name "*.mutbak"                      -> none, at any point
```

## Build number — not bumped, and why

This pass edits two test files (comments and an assertion diagnostic message only — no assertion
logic changed), a plan (status/state lines) and the board (a records entry). None of the four
files `tools/stamp-build.mjs` stamps (`build.json`, `sw.js`, `js/debug.js`, `index.html`) is
touched, and nothing that ships to a device changed — test files are never served to the client.
The project's own stamping rule is "bump the build on every web deploy," and this apply-review
pass is not a deploy: it corrects records and test provenance/citations against code that already
shipped at `e6a2f2e` / `.290`. Bumping the number here would assert a deploy that did not happen.
`node tools/hooks/run-checks.mjs`'s `stamp` and `staged-stamp` checks both pass unchanged, which is
the mechanical confirmation that the (unbumped) stamp is still coherent.

## Handoff

- **Findings applied:** F1, F2, F3, F4 (all four Poirot named as this invocation's scope).
- **Not applied, and not this invocation's:** F5, F6 (routed to the coverage auditor).
- **Suite:** green, 824/823/0/1, unchanged from Poirot's review pass.
- **Mutation:** `#86` (`one-screen-type NOSETTINGSBG-b`) executed against the final state, caught,
  killed by `NPUNTOUCHED` + `NOSETTINGSBG`.
- **Build number:** not bumped (records/test-comment-only change; see above).
- **Next:** the coverage auditor's audit of F5/F6, then the step-9 device gate (now carrying the
  scroll-preservation item).
