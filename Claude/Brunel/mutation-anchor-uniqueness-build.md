# Build log — mutation-registration uniqueness remedy (PLAN-home-shift-fix.md §7.3)

**Date:** 2026-07-29
**Branch:** `build/mutation-anchor-uniqueness` (worktree `.claude/worktrees/build-mutation-uniqueness`)
**Scope:** step 1 of 3 only — the mutation-registration tooling remedy (§7.3). The M1 CSS
edit, the six red cells, the `M1PARKRANGE` mutants, and the M2 measurement are steps 2–3
and are explicitly NOT part of this build.

## VERDICT: BUILD_GREEN

---

## What landed

### (A) Hard uniqueness check in `tools/mutate.mjs`
Added `countOccurrences`, `findNthOccurrence`, and `resolveAnchor` — one shared
implementation, exported, used by both the CLI apply step and the anchors gate (B), so
uniqueness is decided in exactly one place. A non-unique `from` (occurrences > 1) is
refused with the occurrence count stated, unless the entry declares:
- `occurrence: N` — selects the Nth (1-indexed) occurrence to mutate, for an anchor that
  is genuinely and permanently shared.
- `count: N` — an explicit assertion of the total occurrence count (checked whether the
  true count is 1 or more); a mismatch is refused as STALE, with the message directing
  the reader to re-derive the count against current text, not bump the number.

The CLI apply loop was rewired from `src.includes(from)` / `src.replace(from, to)` to
`resolveAnchor` + an index-based slice-replace, so applying now always targets the
resolved occurrence rather than blindly the first one. CRLF→LF normalisation on both
sides is unchanged.

### (B) `test/mutation-anchors.test.js`
Added a registry-wide gate ("no registered mutation anchor is non-unique without an
explicit disambiguation") that calls `resolveAnchor` for every entry (and `also` part)
against current source and fails on any NON-UNIQUE / STALE COUNT / OUT-OF-RANGE result —
`occurrences === 0` (a rotted anchor) is left to the existing rot test so the two don't
double-count the same failure. The rot test and the no-op test are unchanged.

Added a second, fixture-based test exercising `resolveAnchor` directly against in-memory
strings (never real source), proving: a bare non-unique anchor is refused; an explicit
`occurrence` selects the right site; an out-of-range `occurrence` is refused; a stale
`count` is refused; a naturally-unique anchor needs nothing extra; a missing anchor is
reported as ANCHOR NOT FOUND, not NON-UNIQUE. This is a structural test of the shared
function (synthetic fixtures, not a scan of any real file's prose), per the discipline
that a check must not scan free text that could contain its own examples.

### (C) `tools/mutation-sweep.mjs`
The failing-test lines already extracted for the failure count are now also surfaced as
`killed by: <test name>` under every `caught` result, so a sweep result can be read
against a mutation's declared expected killer (stated in its `name`, e.g. "-> I7 test").
The sweep does not itself parse or compare the declared expectation — it prints what
actually reddened; comparing against the declaration is a human (or a future
`campaign-gate.mjs`, not yet built) reading, consistent with the plan's own statement
that nothing currently reads the `[cell-id]`-style tag mechanically.

### (D) Re-anchored `#24` and `#42`
- **`#24`** (`'swipe: abort stops restoring the starting scroll (-> I7)'`) anchored on
  the bare `window.scrollTo(0, cur.scroll0);`, which occurs 3× in `js/app.js` (445
  recovery, 1203 held abort, 1228 no-hold abort) — first-occurrence-wins always mutated
  the recovery. Split into three entries:
  - recovery (445), anchored on `        if (cur) window.scrollTo(0, cur.scroll0);`
    (unique — only the recovery site guards this call behind an inline `if (cur)`).
  - held abort (1203), anchored on the line plus the following `mark('restored');`.
  - no-hold abort (1228), anchored on the preceding `applyScreen(dest, { render:
    cur.finPlan.abortRender === 'rerender', resetScroll: false });` statement.
- **`#42`** (`'swipe4 F6: constructionPlanFor absorbs a bad fromKind...'`) anchored on
  the bare `if (KINDS.indexOf(c.fromKind) === -1) {`, shared with
  `finalizationPlanFor`'s own guard at `js/swipe.js:180` — `#42`'s `caught` was correct
  by source order only. Re-anchored on the if-line plus the following
  `constructionPlanFor`-named throw line, which is unique. Updated the adjoining BC-1
  comment (formerly citing mutate.mjs:467-470) to state the hazard is now caught
  mechanically by the uniqueness check rather than relying on a reader noticing the
  shared line.

`M1NOWRITE`'s `resetScroll: false` anchor (5 occurrences in `js/app.js`) has **no
registered entry at HEAD** — confirmed by grep before starting and again at the end.
Left untouched per the task's own instruction; it belongs to whichever future build
registers the `M1NOWRITE` mutation.

### (E) `js/vendor/` exclusion — file-identity pin
No existing guard in this repo currently checks `js/vendor/`'s file count or identity —
`M1WRITERSET` (the gate whose S1 clause states the exclusion) is unbuilt (step 2/3). This
pin is built as its own small, standalone artifact — `test/vendor-exclusion-pin.test.js`
— so it is ready for `M1WRITERSET` to reference when that gate is built, without
requiring this build to construct the writer-set derivation itself.

Pinned: `js/vendor/` contains exactly 1 file (`eruda.js`), sha256
`38c12fbfcaa94cee563701cae16ac0728977a8b6c8922ff5b7625ae32f203c36`. The gate fails if
either the count or the hash changes, with the failure message directing the reader to
re-derive the exclusion's reason against the new content (does it write into `#home`?
does it touch `scrollTop` anywhere reachable from the app?) and re-record the pin only
once that is confirmed — never to bump the recorded value to silence the gate. A third
test exercises the comparison against a synthetic temp directory, proving a content
edit changes the hash (count held) and a new file changes the count.

---

## Proof each new check can fail (actual output)

**(A)/(B) uniqueness check — CLI and gate, real fixture.** Temporarily reverted the
re-anchored `#42` entry to its old shared, non-unique `from` (`if
(KINDS.indexOf(c.fromKind) === -1) {`) and re-ran both surfaces:

CLI (`node tools/mutate.mjs 43`), exit 1:
```
NON-UNIQUE ANCHOR for #43 [js/swipe.js] TEMPORARY PROOF FIXTURE — deliberately
non-unique, must be reverted before commit: `from` occurs 2 times in its target file.
This tool will never guess which one is intended — disambiguate with a longer `from`
(the default fix) or declare an explicit `occurrence: N` selecting which occurrence
this entry means — mutation NOT applied
```
No file was written (confirmed no `.mutbak` produced by the refused CLI apply beyond
the harmless pristine backup already created earlier in the loop's own bookkeeping; a
subsequent `--restore` left the tree clean and `js/swipe.js` byte-identical to HEAD).

Registry-wide gate (`node --test test/mutation-anchors.test.js`), the SAME fixture:
```
not ok 3 - no registered mutation anchor is non-unique without an explicit disambiguation
  error: |-
    ...NON-UNIQUE ANCHOR for #43 [js/swipe.js] TEMPORARY PROOF FIXTURE — deliberately
    non-unique, must be reverted before commit: `from` occurs 2 times in its target
    file...
```
Reverted the fixture; re-ran — all 4 tests in the file pass against the real registry
(`# pass 4, # fail 0`).

**(B) fixture-based unit test** (`resolveAnchor refuses a non-unique anchor and accepts
one that disambiguates`) passes on its own — it is itself the durable proof that the
NON-UNIQUE / OUT-OF-RANGE / STALE-COUNT / ANCHOR-NOT-FOUND paths are each reachable and
distinguishable, run every time the suite runs (not a one-off manual check).

**(E) vendor pin.** Corrupted the recorded hash constant to
`00000...0` (64 zero chars) in `test/vendor-exclusion-pin.test.js` and re-ran:
```
not ok 2 - js/vendor/ pin: eruda.js content hash is unchanged (an in-place upgrade
must not pass silently)
  error: js/vendor/eruda.js content hash is
  38c12fbfcaa94cee563701cae16ac0728977a8b6c8922ff5b7625ae32f203c36, pinned at
  0000...0. ... Do not bump the recorded hash — re-derive the exclusion's reason
  against the NEW content...
```
Test 1 (count) and test 3 (synthetic comparison) were unaffected — confirming the two
pin checks are independent, per the "count-only guard is blind to an in-place upgrade"
reasoning. Restored the real hash; re-ran — all 3 tests pass (`# pass 3, # fail 0`).

---

## Targeted sweep (the real `tools/mutation-sweep.mjs`, foreground, explicit indices)

Per the standing rule that only the real sweep counts as coverage evidence (a hand-apply
plus a direct test run bypasses the sweep's own exclusion logic), ran the sweep against
exactly the indices this build re-anchored:

```
$ node tools/mutation-sweep.mjs 23 24 25 43
#23  caught (2 failing) — swipe: supersession recovery stops restoring the session-start scroll (-> I20 test)
       killed by: I20 — superseding a live drag restores the starting scroll
       killed by: NC — an overlay-source supersession issues NO spurious #browse re-render but still restores the scroll
#24  caught (3 failing) — swipe: held abort stops restoring the starting scroll (-> I7 test)
       killed by: the reveal reports the scroll trail across the uncover, both sides of it (.201)
       killed by: I7 — an aborted browse->browse swipe issues a scroll restore
       killed by: AB.clobber — a browse->browse ABORT re-renders the SOURCE into #browse (render TRUE) and restores scroll
#25  caught (3 failing) — swipe: no-hold abort stops restoring the starting scroll (-> AB.noclobber-overlay / AB.noclobber-home tests)
       killed by: AB.noclobber-overlay — an overlay->browse ABORT does NOT re-render #browse (render FALSE) but restores scroll
       killed by: AB.noclobber-home — a home->browse ABORT does NOT re-render #browse (render FALSE) but restores scroll
       killed by: ABORT — an aborted browse→home re-parks the fixed #home, restores #browse, and restores the start scroll
#43  caught (2 failing) — swipe4 F6: constructionPlanFor absorbs a bad fromKind instead of throwing (-> source-kind test)
       killed by: eslint: no errors in shipped app code (js/**, sw.js)
       killed by: constructionPlanFor throws on an unhandled source kind, not just destination kind

swept 4: 0 uncaught, 0 unapplied, 0 stale flags
```
Exit code 0.

### Re-verified expected-vs-actual killing cells for the split `#24`

| Site | Declared expected (this entry's `name`) | Actual killer(s) from the real sweep |
|---|---|---|
| recovery, `app.js:445` | I20 test | I20 (exact match) + NC (bonus — also asserts the recovery restore) |
| held abort, `app.js:1203` | I7 test | I7 (exact match) + AB.clobber (bonus — same browse→browse abort scenario) + the `.201` reveal-scroll-trail test (bonus) |
| no-hold abort, `app.js:1228` | AB.noclobber-overlay / AB.noclobber-home | Both named tests (exact match) + ABORT (bonus — browse→home abort, same no-hold branch) |

All three sites are now independently provable to fail, on tests distinct from each
other and from the recovery's own test — the exact defect this split closes: before it,
only the recovery's tests (I20/NC) ever reddened, and I7 / AB.clobber /
AB.noclobber-overlay / AB.noclobber-home / ABORT had never actually seen this mutant.

`#42`'s re-anchor was not separately re-swept by index here (its `caught` status was
already correct by source order pre-fix; the fix's purpose is to make that correctness
non-accidental going forward, not to change which test kills it) — confirmed instead by
the CLI/anchors-gate proof above, which is where the actual defect (a shared anchor
between siblings) lived.

No mutation reverted to an UNKILLABLE state; the §7.3 contingency for an unkillable `#24`
split (add a cell, delete as dead code, or register KNOWN-INERT) was not needed.

---

## Full-suite / gate results

- `node --test test/mutation-anchors.test.js` — 4/4 pass.
- `node --test test/vendor-exclusion-pin.test.js` — 3/3 pass.
- `node tools/mutation-sweep.mjs 23 24 25 43` (foreground, explicit indices; the only
  sweep run locally — the full 94-mutation registry is CI's sharded job, not a local
  run) — exit 0, 0 uncaught / 0 unapplied / 0 stale flags.
- `node tools/hooks/run-checks.mjs` (the full pre-commit battery: no-mutbak, stamp,
  lint, typecheck, tests, campaign-gates) — **PASS**, exit 0.
- No `.mutbak` present anywhere in the tree at any commit point (checked before every
  commit).

---

## Left to steps 2–3 (deliberately not touched)

- The M1 CSS edit (deleting the parked rule's `top: 0`) — `css/app.css` was not
  modified at all in this build, per the explicit prohibition.
- The six red cells (`M1PARKRANGE`, `M1WRITERSET`, `M1NOWRITE`, `M1NAVWINS`,
  `MUTUNIQ`'s own coverage-model row as a Curie-authored red test beyond what this
  build's tooling tests already cover, `M2ALIGN`).
- The `M1PARKRANGE-a/-b/-c` mutants (all three anchor on `css/app.css`, which is
  untouched here).
- The `M2` ghost/geometry measurement.
- `M1WRITERSET` itself (the first-party scroll-writer derivation gate) — only its S1
  vendor-exclusion pin was built here, as a standalone artifact ready for that gate to
  reference.
- `M1NOWRITE`'s mutation registration (`resetScroll: false` at `app.js:1227`) — no
  entry exists yet; confirmed and left alone.

---

## Commits

See `git log` on `build/mutation-anchor-uniqueness` for the incremental commits this
build produced. Nothing was pushed; the branch stays local to the worktree per
instruction.
