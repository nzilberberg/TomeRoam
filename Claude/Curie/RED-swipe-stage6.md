# RED suite — Swipe/reveal Stage 6a (supersession pre-stack recovery)

Type: test-design (Curie)
Date: 2026-07-26
Input artifact: ratified plan `Claude/Plans/PLAN-swipe-stage6.md` at target `6e3a596`
Coverage Model realized: plan §8 (Mendeleev catalog) + §9 (coverage/mutation matrix)
Loki context: `Claude/Loki/STRIKE-swipe-stage6-recover-before-arm-r2.md` (HELD STONE)
Verdict: **RED_SUITE_READY** → Brunel

## 1. What was authored

- **`test/swipe-stage6.test.js`** (new) — the Stage-6a cells: red-first VR/OR/NC, green
  regression guards PS/OB, and the device-only KEEPER.
- **`test/app-harness.js`** (narrowly-necessary harness change) — an `opts.realBrowse` path
  that swaps the fake Browse for the REAL `js/browse.js` wired to the REAL `js/virtuallist.js`,
  plus faithful `getAuthors`/`getAuthor`/`getAuthorBooks` fakes (the real Plex has all three) so
  a browse→browse transition renders a real second page. Non-`realBrowse` boots are behaviourally
  unchanged (full suite 683 pass, below).

Production code was NOT touched. The policy ledger was NOT touched (see §5). No git commit.

## 2. Red command and captured result

```
C:/Users/nzilb/tools/node-dist/node.exe --test "test/swipe-stage6.test.js"
```

```
not ok 1 - OR — the source re-render precedes the successor arming ...
not ok 2 - NC — an overlay-source supersession issues NO spurious #browse re-render but still restores the scroll
not ok 3 - VR — superseding a live drag on a VIRTUALIZED browse->browse source keeps the source rows ACTIVE and realized ...
ok 4 - PS — a superseded pre-stack recovery leaves the stack on the source ...
ok 5 - OB — an orphan-pane hard reset (no live session) disposes as hard-reset ...
ok 6 - KEEPER ... # SKIP Device-only. jsdom cannot emit a browser-originated scroll ...
# tests 6 | pass 2 | fail 3 | skipped 1 | todo 0
```

Full suite (`--test "test/*.test.js"`): **tests 689 | pass 683 | fail 3 | skipped 1 | todo 2** —
the 3 fails are exactly VR/OR/NC; the 2 todos are the pre-existing SR/SC known-reds; every gate
(policy-ledger, descriptor-coverage, browse-virtual, contract-function, mutation-anchors) stayed
green. No regression from the harness change.

## 3. Cell → test → captured RED → judgment

Each red-first cell fails on its intended ASSERTION (`ERR_ASSERTION` / `testCodeFailure`), not on a
compile/import/harness error, and fails for the MISSING recovery — not a mis-stated assertion.

### VR (red-first) — the load-bearing cell. Test: `VR — superseding a live drag on a VIRTUALIZED browse->browse source keeps the source rows ACTIVE and realized ...`
- **Fixture:** `boot({ realBrowse:true, books: bigBooks(700) })` → REAL `browse.js`+`virtuallist.js`;
  `VL.setForceVirtual(true)` + injected metrics (the `test/browse-virtual.test.js` recipe); Authors
  under Books; Books deep-scrolled to `scrollY=40000` and realized; its realized row NODES stamped by
  identity; live Books→Authors drag (source SUSPENDED, rows kept — asserted as fixture sanity); a 2nd
  touch supersedes.
- **Discriminator (heeds Charpy r4):** asserts the source controller is **`active`** (realized against
  the settled scroll) AND every ORIGINAL stamped row survived (`kept === stamp.size`) AND `fresh === 0`.
  A `keptOriginalRows > 0` count alone is INSUFFICIENT — `suspend()` keeps the rows, so mutation (b)
  would silently pass a count-only check; the `state === 'active'` clause is what catches it.
- **Captured RED:** `expected: 'active', actual: 'inactive'` — "the superseded virtualized source must be
  ACTIVE (realized against the settled scroll); got 'inactive' — endHold never realized the kept rows".
- **Judgment — fails for the intended reason.** Against HEAD `begin()` releases the hold FIRST
  (`dropRowHold()`→`endHold()` at app.js:365) — which, with the shown page being the destination,
  deactivates the suspended source and dematerializes its kept rows — and then `applyScreen(..., {render:false})`
  never re-renders the source. The source ends `inactive` with 0 rows: the exact `.178/.202` wrong-content
  class the recovery closes.
- **Reds on BOTH plan mutations (Loki-measured, `STRIKE-...-r2.md` §3):**
  (a) endHold BEFORE the recovery render → source rows rebuilt (`kept=0, fresh=13`) → the `kept` clause reds;
  (b) `session` nulled BEFORE `dropRowHold` → `endHold` never fires → source stays `suspended` (`kept=13`) →
  the `state==='active'` clause reds. Green target (Loki Scenario A: render inside hold, endHold last):
  `active / kept=13 / fresh=0` — so the test is genuinely green-able once the recovery lands.

### OR (red-first) — intermediate state (Engineering Contract §4.7). Test: `OR — the source re-render precedes the successor arming ...`
- **Fixture (fake-Browse harness):** live Authors→Books drag; a NEW gesture supersedes AND is driven
  live; the `browse.render` log after the supersede is sliced.
- **Captured RED:** "the recovery must re-render the SOURCE into #browse before the successor arms —
  renders after supersede = `["books"]`". The source (`authors`) is never restored; only the successor's
  destination render appears.
- **Judgment — intended reason.** HEAD performs no source re-render, so the recovery's `authors` never
  appears before the successor's `books`. Correct build → `[authors, books]` (green); recovery-after-render
  mutation → `[books, authors]` (the ordering clause reds).

### NC (red-first) — non-clobber (overlay source). Test: `NC — an overlay-source supersession issues NO spurious #browse re-render but still restores the scroll`
- **Fixture:** Options overlay over Books; live Options→Books back-swipe (overlay source moves as its
  real element, `#browse` not clobbered by the source, `d.clobbered === false`); supersede.
- **Captured RED:** the "no spurious `#browse` render" assertion PASSES (green half — HEAD already renders
  nothing on the hard reset), and the test fails on "a live supersession must still restore the scroll it
  started from" — no `scrollTo` was issued.
- **Judgment — intended reason.** HEAD restores no scroll on any supersession. Correct build →
  `d.clobbered` false so no `Browse.render` (guard held) + `scrollTo(0, d.scroll0)` issued (green).
  Mutation (recovery re-renders ignoring `d.clobbered`) reds the no-render clause; mutation (omit scrollTo)
  reds the scroll clause.

### PS (GREEN regression guard). Test: `PS — a superseded pre-stack recovery leaves the stack on the source ...`
- **Green now** — HEAD's hard reset pops nothing, so the next back-swipe offers the same transition. Pins
  invariants I11/I18: the recovery must NOT mutate the nav stack. Mutation (recovery pushes/pops) →
  the next gesture reports a different transition pair. Must STAY green.

### OB (GREEN regression guard). Test: `OB — an orphan-pane hard reset (no live session) disposes as hard-reset ...`
- **Green now** — an injected leftover `.nav-ghost` with `d === null` trips begin()'s hard reset; asserts
  it does not throw and issues no `scrollTo` (there is no session-start scroll on the orphan path; I17(b)).
  Mutation (recovery reads `d.scroll0`/`d.clobbered` unconditionally) → throw/spurious scroll on the null
  session. Must STAY green — this is the guard that forces the built recovery to key on the live session.

### KEEPER (device-only, skipped). Test: `KEEPER — a browser scroll between endHold and the successor's first move ...`
- **Disposition:** Loki's r2 named RESIDUAL suspicion `NB-post-endHold-scroll-realize` — a browser scroll
  fired after `endHold` (which un-suspends the shared VirtualList scroll dispatcher) but before the
  successor's `start()` (which fires on its first touchmove, not at `begin()`) could `_realize()` the
  active source at a transient offset and release the kept rows. **jsdom emits no browser-originated
  scroll**, so there is no honest jsdom body. Authored as a `{ skip }` test with a reason that names the
  device harness required — NOT faked as a jsdom repro. It is a guard to be exercised on device, recorded
  so it is not lost.

## 4. New-vs-existing guard inventory

| Cell | Kind | Now | Location |
|---|---|---|---|
| VR | red-first (NEW) | RED | `test/swipe-stage6.test.js` |
| OR | red-first (NEW) | RED | `test/swipe-stage6.test.js` |
| NC | red-first (NEW) | RED | `test/swipe-stage6.test.js` |
| PS | regression guard (NEW) | GREEN | `test/swipe-stage6.test.js` |
| OB | regression guard (NEW) | GREEN | `test/swipe-stage6.test.js` |
| KEEPER | device-only guard (NEW) | SKIP | `test/swipe-stage6.test.js` |
| SR | red-first known-red (EXISTING `{ todo }` + ledger `KR-swipe-source-rerender`) | RED (todo) | `test/swipe-invariants.test.js` ~:391 |
| SC | red-first known-red (EXISTING `{ todo }` + ledger `KR-swipe-scroll-restore`) | RED (todo) | `test/swipe-invariants.test.js` ~:339 |
| PD | regression guard (EXISTING) | GREEN | `test/swipe-invariants.test.js` ~:253 |
| ST | regression guard (EXISTING) | GREEN | `test/swipe-invariants.test.js` ~:419 |

SR and SC are LEFT as the existing `{ todo }` known-reds; Brunel drops `{ todo }` and removes the two
ledger entries when they go green (plan §10). PD/ST are the existing green parity guards; not duplicated
here (one owner per cell).

## 5. Why the new red-first cells are NOT `{ todo }` / not ledgered

The repo's `{ todo }` marker is reconciled by `test/policy-ledger-gate.test.js`: every `{ todo }` test must
be a declared `knownRed` in `Claude/Decisions/PolicyLedger.mjs`, and vice-versa. VR/OR/NC are the failing
constraint Brunel makes green in the SAME 6a build — not a long-lived known-red spanning builds — so they
are authored as plain red-first failures (the plan §9 classifies them "wiring", not known-red). Making them
`{ todo }` would demand ledger entries the plan never budgeted and that Brunel would immediately remove; a
red-first Curie→Brunel handoff where the suite legitimately fails until implemented is the correct state.
The two long-lived known-reds this stage closes (SR/SC) stay `{ todo }` + ledgered until Brunel flips them.
The policy-ledger gate is GREEN as authored (verified in the full-suite run).

## 6. Coverage Model reconciliation (every applicable §8 cell accounted)

- Lifecycle/phases → OR, PS. Ordering → VR (hold-release-after-recover + identity-null-after-hold-release),
  OR (recover-before-arm). Resources/owner/endpoint → VR, PD. Recovery authority boundary → PS. Emergency
  disposal → OB, PD. External side effects → SR, SC, NC. Invariants I7/I11/I18/I2/I20 → SC/NC, SR/OR/PS,
  PS, PD, PS+ST. Known-red → SR, SC. Composition → VR (the successor snapshots the restored, realized
  source). Concurrency (I17 `finishing`) → covered by the existing green `2 — a throw in finalize ...` and
  the OB/PS orphan/pre-stack paths.
- **No Coverage-Model gap found** — every applicable dimension mapped to a test; no cell was too vague to
  assert against, so nothing routed back to the planner.

## 7. Handoff

- **Brunel:** make VR/OR/NC green by implementing the §6 recovery ordering (render source INSIDE the hold →
  `scrollTo(0, d.scroll0)` → `dropRowHold()` LAST → null `session`/`d` LAST), then drop `{ todo }` on SR/SC
  and apply the plan §10 ledger/records scrub. VR is the ordering oracle; it reds on either ordering defect.
- **Mendeleev:** audit this suite against §8 (author ≠ auditor).

## 8. Pin reconciliation (2026-07-26, post-build)

After Brunel implemented the §6 recovery in `js/app.js` and updated the generator mirror
(`tools/gen-swipe-model.mjs` + regenerated `docs/swipe-model.generated.txt`), the sanctioned begin()/
supersession region's source fingerprint changed. Updated `VERIFIED.supersession` in
`test/swipe-model.test.js` from `c70d4ed49257af8e` → `9227f47ff3d3c7db` (confirmed by running
`gen.supersessionFingerprint()`, not blind-pasted). Only that constant was touched. `test/swipe-model.test.js`
is fully green (11/11); full suite: 689 tests, 686 pass, 0 fail, 1 skipped (KEEPER), 2 todo (SR/SC) — the
three red-first cells (VR/OR/NC) are now green under the built recovery. The mirror's semantic correctness
is Brunel's and is Poirot's to review.

## 9. F1 regression guard (2026-07-26, post-Poirot review of f09cf9d)

Poirot F1 (`Claude/Poirot/f09cf9d-swipe-stage6-supersession.md`, W23): begin()'s shared
`applyScreen(currentDesc(), { render: d?d.clobbered:false, resetScroll: false })` forces
`resetScroll:false` onto the ORPHAN sub-case (`d===null`), not just the live-recovery branch. For an
orphan hard-reset whose `currentDesc()` is `home`, the pre-6a code reset the document scroll to top
(nav.js:127, `window.scrollTo(0, 1)` under default `resetScroll:true`); f09cf9d does not — an
unclassified parity regression the OB cell is blind to (it drives a BROWSE source, inert to resetScroll).

Added ONE red-first cell to `test/swipe-stage6.test.js`: **`OB-home — an orphan hard-reset on a HOME
source resets the document scroll to top (pre-6a parity; Poirot F1)`**. It injects a leftover
`.nav-ghost` with no live session on a home `currentDesc()`, trips the orphan hard reset, and asserts a
`window.scrollTo(0, 1)`. Captured RED against f09cf9d: `ERR_ASSERTION` — "an orphan hard-reset on a home
source must reset the document scroll to top (applyScreen home → window.scrollTo(0, 1)); got scrollTo
calls []" (the fixture-sanity "the orphan tripped the hard reset" assertion passed first — it fails for
the orphan-parity reason, not a harness error). Options/sub sources reset a panel `scrollTop`, not
window, so home is the window-observable source kind. Brunel's fix (`resetScroll: d ? false : undefined`,
so only the live-recovery branch forces false) greens it while the OB browse guard stays green.
`test/swipe-stage6.test.js`: 5 pass, 1 fail (OB-home, red-first), 1 skip (KEEPER). Did NOT re-pin
VERIFIED.supersession — Brunel's fix changes the region fingerprint; re-pin follows the fix.

## 10. Pin reconciliation #2 (2026-07-26, post-F1/F2 fix)

Brunel fixed F1 (orphan-scroll guard in `js/app.js`) + F2 (generator label) and regenerated the doc,
moving the begin()/supersession region fingerprint again. Re-pinned `VERIFIED.supersession` in
`test/swipe-model.test.js` `9227f47ff3d3c7db` → `d39534854e3cc348` (confirmed by running
`gen.supersessionFingerprint()`, not blind-pasted). Only that constant was touched. `test/swipe-model.test.js`
fully green (11/11); the OB-home F1 guard is now green under the fix. Full suite: 690 tests, 687 pass,
0 fail, 1 skipped (KEEPER), 2 todo (SR/SC).

```json
{"persona":"curie","stage":6,"input_artifact":"6e3a596","verdict":"RED_SUITE_READY","files_changed":["test/swipe-stage6.test.js","test/app-harness.js","Claude/Curie/RED-swipe-stage6.md"],"red_command":"C:/Users/nzilb/tools/node-dist/node.exe --test \"test/swipe-stage6.test.js\"","new_red_tests":["VR — superseding a live drag on a VIRTUALIZED browse->browse source keeps the source rows ACTIVE and realized, not rebuilt or leaked","OR — the source re-render precedes the successor arming: recovery restores the source before the new gesture renders its destination","NC — an overlay-source supersession issues NO spurious #browse re-render but still restores the scroll"],"return_to":"brunel"}
```
