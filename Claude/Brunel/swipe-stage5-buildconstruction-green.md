# BUILD — Swipe Stage 5 `buildConstruction` four-key contract (§3 revision)

Type: build-report
Date: 2026-07-25
Input artifact: `Claude/Plans/PLAN-swipe-stage5.md` (§3 CONTRACT REVISION, ratified 2026-07-24)
Red suite: `test/swipe-construction.test.js` (Curie, `Claude/Curie/RED-swipe-stage5.md`)

## The change

`Swipe.buildConstruction` (`js/swipe.js`) returned the pre-revision five-key shape
`{ classification, plan, movers, capture, sourceWasClobbered }`. Per plan §3 the ratified
return is the four-key `{ decorations, movers, capture, sourceWasClobbered }`:
`classification` is derived and consumed internally (host resolution, plan derivation) and is
not returned; the `plan` wrapper is dropped, and its one live field, `decorations`, is hoisted
to the top level, projected to `{ kind, base }` (the `role` leaf stripped — no consumer reads
it).

## Files changed

- **`js/swipe.js`** (`buildConstruction`, line ~321) — the production seam. Replaced the return
  statement with a hoisted, projected `decorations` and the four-key return:
  ```js
  const decorations = plan.decorations.map(({ kind, base }) => ({ kind, base }));
  return { decorations, movers: { outgoing, incoming, decoration }, capture, sourceWasClobbered };
  ```
- **`js/app.js`** (`start()`, line ~474) — the L3 adapter genuinely required by the same
  contract change: it was the sole L3 consumer of the dropped `plan` wrapper
  (`for (const deco of c.plan.decorations)`, the outgoing-NP `np-locked` unlock). With `plan`
  dropped, `c.plan` is `undefined` and the old read would throw. Changed to `c.decorations`
  (the plan's own ledger row: "decorations … | producer buildConstruction@S5 | consumer
  start()@S5"). Charpy r6 named this exact edit in advance ("Brunel's hoist
  (`c.plan.decorations` → `c.decorations`) is guarded by the `npLock` test") — not a discretionary
  addition.
- **`docs/swipe-model.generated.txt`** — regenerated (`node tools/gen-swipe-model.mjs`). Adding
  the explanatory comment block in `js/app.js` shifted three later line numbers the generator
  mirrors verbatim (`navStack` append-site citations at what were lines 698/699/1233, now
  700/701/1235). The diff is exactly those three line-number citations; no mirrored rule, census,
  or fingerprint changed (verified: `test/swipe-model.test.js` tests 2–4, unaffected before and
  after). Confirmed by baseline check (`git stash` of just the two production files) that
  `test/swipe-model.test.js` test 1 passes on unmodified HEAD and only regresses once the two
  production edits land — i.e. the regeneration is a consequence of this change, not a
  pre-existing gap.

No other file was touched. `test/swipe-construction.test.js` (Curie's red suite) was not edited.

## Bench 1 — the reconciled contract test

```
cd C:/Users/nzilb/OneDrive/Desktop/TomeRoam
C:/Users/nzilb/tools/node-dist/node.exe --test test/swipe-construction.test.js
```
Result: `# tests 13 / # pass 13 / # fail 0`. Both previously-red tests now pass:
- "buildConstruction returns the exact four-key Construction contract shape"
- "decorations is a top-level projected {kind, base} list with the role leaf stripped"

## Bench 2 — the full suite

```
cd C:/Users/nzilb/OneDrive/Desktop/TomeRoam
C:/Users/nzilb/tools/node-dist/node.exe --test "test/*.test.js"
```
(`package.json` `"test": "node --test \"test/*.test.js\""`.)

Result: `# tests 684 / # pass 681 / # fail 0 / # todo 3`. The 3 todo entries are pre-existing
known-red policy items unrelated to this change, declared in `Claude/Decisions/PolicyLedger.mjs`:
`I20` (superseding-drag scroll restore, not yet implemented) and `I11/I20` (superseding
browse→browse source re-render, not yet implemented) — both new-policy items deferred to a later
stage. The third todo is the KR this build resolves (Bench 3).

A first full-suite pass (before regenerating the doc) showed 1 fail —
`test/swipe-model.test.js`: "the committed model is exactly what the generator produces" — the
line-number drift described above. Regenerating `docs/swipe-model.generated.txt` cleared it; the
second full-suite pass is the 681/0/3 result above.

## Bench 3 — the dead-return / classification gate

`tools/dead-return-fields.mjs` / `test/construction-consumers.test.js`, PolicyLedger key
`KR-swipe-construction-dead-classification`.

```
cd C:/Users/nzilb/OneDrive/Desktop/TomeRoam
C:/Users/nzilb/tools/node-dist/node.exe tools/dead-return-fields.mjs
```
Output: `Every registered seam: all returned fields have a consumer.` — exit 0.

```
C:/Users/nzilb/tools/node-dist/node.exe --test test/construction-consumers.test.js
```
Result: `# tests 3 / # pass 2 / # fail 0 / # todo 1`. All three pass, including the KR-tracking
test (still carrying its `{ todo }` marker in source, so it TAP-reports under `# TODO` rather
than plain `ok` count — but its assertion `deepEqual(seamDeadFields('buildConstruction'), [])`
now succeeds):
```
ok 3 - every Swipe.buildConstruction returned field is consumed by start() # TODO F1 …
```
`classification` is no longer a member of the return at all (not "consumed but unread"), so it
cannot appear in `dead-return-fields`'s output by construction — the detector's `returnKeys()`
only inspects keys present in the returned object literal.

**The KR is proven closed by both required benches; it is not yet marked closed in the
records**, because closing it means removing the `{ todo }` marker and its explanatory text from
`test/construction-consumers.test.js`, removing the `TRACKED_OPEN` allowlist entry in that same
file, and closing/removing the `KR-swipe-construction-dead-classification` entry in
`Claude/Decisions/PolicyLedger.mjs` (that file's own comment: "remove the todo, this test,
TRACKED_OPEN's entry, and the ledger entry in that commit"). Editing `test/*.test.js` is outside
Brunel's craft surface under this build's hard constraints, and the ledger is a decision record,
not production code — flagging for the receiving reviewer/dispatcher rather than doing it here.

## Versioning

`build.json`'s `"build"` field (currently `2026-07-23.241`) is bumped on every commit per the
project's stamp-build convention (`tools/stamp-build.mjs`, `test/build.test.js`) and the
project's standing deploy rule (any commit → a new build number, stamped in lockstep across
`build.json`, `sw.js`, `js/debug.js`, and `index.html`). Not bumped here — reported for
whoever commits this change (`npm run stamp` equivalent: edit `build.json.build` to the next
`YYYY-MM-DD.N`, then `node tools/stamp-build.mjs`).

## What was NOT touched

Per the hard constraints on this build: `.gitignore`, `test/mutation-sweep-select.test.js`,
`tools/mutation-sweep.mjs` (three pre-existing unrelated dirty files), and
`test/swipe-construction.test.js` (Curie's red test) — all untouched. No test was edited,
skipped, xfailed, or loosened to reach green.

```json
{"persona":"brunel","stage":5,"input_artifact":"Claude/Plans/PLAN-swipe-stage5.md","verdict":"BUILD_GREEN","files_changed":["js/swipe.js","js/app.js","docs/swipe-model.generated.txt"],"suite_result":"681 pass / 0 fail / 3 todo (2 pre-existing known-red, 1 this build's KR now passing)","return_to":"poirot"}
```
