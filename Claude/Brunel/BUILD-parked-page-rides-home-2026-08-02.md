# Build log — PLAN-parked-page-rides-home.md · 2026-08-02

Type: build log (Brunel)

Built from `Claude/Plans/PLAN-parked-page-rides-home.md` (VERDICT: RATIFIED), against the red suite
authored in `Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md`, at HEAD `9cfd621`.

## Index

1. The sequence, in order performed
2. The change
3. The mutation anchors and the two new registrations
4. The mutation sweep
5. The build number
6. Commit
7. Open item — not in this session's writable scope
8. Handoff

## 1. The sequence, in order performed

**Baseline, before any change.** `npm test` (`node --test "test/*.test.js"`): 823 tests, 820 pass, 0
fail, 3 skipped — matches the test design's recorded baseline exactly.

**Step 1 — skips removed, driven red.** Both `SKIP-PENDING-BUILD` skips removed from
`test/parked-page-rides-home-css.test.js` (the `{ skip: SKIP_FLOOR }` / `{ skip: SKIP_FORM }` options
only — nothing else in the file touched). Full suite re-run: 823 tests, 820 pass, 2 fail, 1 skipped
(the one pre-existing, unrelated skip). Exact failure output:

```
not ok 7 - PARKOUTOFREACH — the park offset STRICTLY exceeds the floor derived from #browse's own box
  error: RED @HEAD: the park is `translateX(-101vw)` (css:119) against a 200vw floor. ...
    .browsepage.parked { transform: translateX(-101vw) } — 101vw does not strictly exceed 200vw

not ok 8 - PARKOUTOFREACH — the park offset is the bench-measured shipped form, not merely a value
    that clears the floor
  error: RED @HEAD: the shipped park is -101vw. -300vw is the floor plus a full viewport of margin ...
    .browsepage.parked { transform: translateX(-101vw) } — want translateX(-300vw)
```

Both name the shipped constant and the derived floor; neither fails on a parse error or a mis-stated
assertion. This matches the test design's §7 quoted output exactly.

**Step 2 — the one-declaration change.** `css/app.css:118-121`, `.browsepage.parked`:
`transform: translateX(-101vw)` → `transform: translateX(-300vw)`. Nothing else in the rule changed
(`overflow: hidden; pointer-events: none; z-index: 0;` byte-identical). The rule's comment gained the
distance law (§2 below); the existing Invariant P and `overflow: hidden` paragraphs are untouched.
Full suite re-run: 823 tests, pass 820, **fail 1** — `test/mutation-anchors.test.js` (S2-6/7/8 anchors
no longer matched their source; the anchor rot the plan predicted).

**Step 3 — the three anchors migrated.** `tools/mutate.mjs` S2-6, S2-7, S2-8 (`.browsepage.parked`
mutants defending PARKBOXEQUAL / PARKLOSESTRANSFORM) had their `from`/`to` strings' `-101vw` changed
to `-300vw`. Full suite re-run: 823 tests, 822 pass, 0 fail, 1 skipped. Green.

**Step 4 — the two new mutants registered.** m1 and m2 (exact strings from the test design's §6)
added to `tools/mutate.mjs`, immediately before the existing PARKM3/PARKM3P/PARKM4 block. Full suite
re-run: unchanged, 822 pass / 0 fail / 1 skipped (registration alone does not run the sweep).

**Step 5 — the sweep, foreground, all seven park indices.** See §4.

**Step 6 — build number bumped.** See §5.

**Step 7 — final full-suite confirmation**, after the build stamp: 823 tests, 822 pass, 0 fail, 1
skipped. `find . -name "*.mutbak"` (excluding `node_modules`, `.claude`) returned nothing.

## 2. The change

`css/app.css:118-121` — the `.browsepage.parked` transform value only. The rule's comment gained a
new paragraph, "PARK-DISTANCE LAW", stating: the park composes onto `#browse`'s own transform because
the page is `position: absolute` inside it; `#browse` is a mover on four transitions, INCOMING (base
±w) on two of them; the floor is `max |displacement of #browse| (100vw) + L + W (≤100vw) = 200vw`,
strict, with both terms' source lines; `-300vw` is the floor plus a viewport of margin and the
bench-measured form, cited to the measurement record; and the constant-viewport precondition (`d.w`
captured once at touchstart, no `resize`/`orientationchange` listener in `js/`).

Per the plan's explicit bar, the comment does **not** claim the outgoing-side transitions are
arithmetically exempt — it states the reason that actually holds (I10: a gesture's own destination
render parks no page on `browse→home` / `browse→overlay`, gated by NOPARKONHOME). Per the same bar,
it says a parked page cannot be composed onto the viewport **by the park offset**, not that it "cannot
overlap the viewport" — a `browse→browse` outgoing mover overlaps by design, at `-300vw`, governed by
its own inline transform, with Invariant P live throughout.

## 3. The mutation anchors and the two new registrations

Three existing anchors migrated (array indices 104, 105, 106 — S2-6, S2-7, S2-8), all defending
PARKBOXEQUAL / PARKLOSESTRANSFORM, all embedding the literal `-101vw` text before this build.

Two new mutants registered, inserted immediately before the pre-existing PARKM3 block, using the
exact strings specified in `Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md` §6:

- **PARKM1** — restores `-101vw` (the shipped defect).
- **PARKM2** — `-250vw` (clears the floor, not the shipped form).

Inserting these two ahead of the five pre-existing park mutants shifted the latter's array indices by
+2. Current indices for the seven park-coverage mutants: **126 (PARKM1), 127 (PARKM2), 128 (PARKM3),
129 (PARKM3P), 130 (PARKM4), 131 (PARKDRAG), 132 (PARKNOHOME)**.

**Note on the invocation contract's mutant-index phrasing.** The contract's "THE MUTANTS" section
states indices 126–130 for the five pre-existing mutants and describes "five registered anchors
[that] embed the old constant and must be migrated." Checked against source: the five pre-existing
park mutants (PARKM3/PARKM3P/PARKM4/PARKDRAG/PARKNOHOME) do not contain the literal `-101vw` string in
either `from` or `to` — they target `#browse`'s box and the `js/app.js` swipe/dispatch code, not the
`.browsepage.parked` transform. The three mutants that do embed `-101vw` are S2-6/S2-7/S2-8, exactly
as the plan's own §7 names them. The test design's §6 is unambiguous that "seven total" means the five
pre-existing park mutants plus the two new ones (m1, m2), and that is the set the sweep in §4 below
runs against. Recorded here rather than silently reconciled, per the persona's discipline of not
inventing a design decision off the record.

## 4. The mutation sweep

Foreground, explicit indices, per the non-waivable exit condition:

```
node tools/mutation-sweep.mjs 126 127 128 129 130 131 132
```

Result — **all seven caught**, matching the test design's §6(e) predictions exactly:

| Index | Mutant | Result | Killed by |
|---|---|---|---|
| 126 | PARKM1 (restore `-101vw`) | caught (2 failing) | PARKOUTOFREACH strict-inequality AND shipped-form, both |
| 127 | PARKM2 (`-250vw`) | caught (1 failing) | PARKOUTOFREACH shipped-form, alone |
| 128 | PARKM3 (`max-width: 250vw`) | caught (1 failing) | PARKOUTOFREACH max-width bar, alone |
| 129 | PARKM3P (`width: 200vw` additive) | caught (1 failing) | PARKOUTOFREACH no-width, alone |
| 130 | PARKM4 (`min-width: 200vw` additive) | caught (1 failing) | PARKOUTOFREACH no-min-width, alone |
| 131 | PARKDRAG (clamp removed) | caught (1 failing) | DRAGREACHBOUNDED, alone |
| 132 | PARKNOHOME (home branch renders browse) | caught (2 failing) | NOPARKONHOME + LANDEDPAGESHOWS (a pre-existing cell the mutant legitimately disturbs, as the test design records) |

```
swept 7: 0 uncaught, 0 unapplied, 0 stale flags
```

**No `*.mutbak` anywhere in the tree**, confirmed after the sweep by `find . -name "*.mutbak"`
excluding `node_modules` and `.claude`. `git status --short` after the sweep showed only the files
this build intentionally changed — the sweep restored cleanly.

PARKBOXEQUAL and PARKLOSESTRANSFORM (the pre-existing gates the migrated S2-6/7/8 anchors defend)
stayed green throughout, as part of every full-suite run above.

## 5. The build number

This project's standing rule: any commit that changes the app gets a new build number.
`build.json`'s `build` bumped `2026-08-01.303` → `2026-08-02.304` (same numeric sequence, next
integer; date advanced to today). `node tools/stamp-build.mjs` propagated it to `sw.js`,
`js/debug.js`, and every `?v=` stamp plus the meta tag in `index.html`. `test/build.test.js`'s
lockstep assertion passed in the final full-suite run (§1, step 7).

## 6. Commit

Not pushed — the dispatcher is holding the push deliberately; nine commits from five seats queue and
go out together. Committed on `main` (this project does not use a `feature/*` branch per commit; the
existing nine queued commits on `main` are the working precedent for this session). Commit SHA and
`git rev-parse HEAD` verification are in the return to the dispatcher, not restated here to avoid a
record that can drift from the actual HEAD.

## 7. Open item — not in this session's writable scope

The plan's §7 (F4) names two same-commit scrub targets: `test/swipe-declone-stage2-css.test.js:301`
(the PARKLOSESTRANSFORM header comment quoting `-101vw`) and
`Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60` (a derived-facts record quoting the same). This
session's invocation contract's Writable list is `css/app.css`, `tools/mutate.mjs`, the two test files
(skip removal only), this build log, and the build number — it does not include either scrub target.
Neither file was touched. Flagged rather than silently done or silently dropped: both are now stale
in the sense the plan predicted (F4), and remain owed.

**Resolved same day, follow-up commit `e11ecf3cb8db71cd771a540b18be8a0780b185b0`.** The coordinator
extended the Writable list to exactly these two files; both corrected to
`-300vw`, comment/prose only (neither file's assertions changed). `test/swipe-declone-stage2-css.test.js:301`
now reads `-300vw` in place of `-101vw`; `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md`'s
`.browsepage.parked` entry corrected to `-300vw` with its stale `css:91-96` citation updated to
`css:143-146` and a note that the value moved after the probe was written. A sibling sweep
(`grep -rn` across `test/`, `tools/`, `js/`) found no other live, non-historical statement of
`.browsepage.parked`'s distance — every other `-101vw` hit is either about `#home.parked` (unchanged
by this plan, still `-101vw`), inside the parked-page-rides-home red suite's own historical "RED
@HEAD" narrative (already correct), or inside `tools/mutate.mjs`'s PARKM1 mutant (which restores the
old value on purpose). Full suite re-run green (823/822/0-fail/1-skip); all seven park mutants
re-swept in the foreground and still CAUGHT (comment changes did not disturb any text-matching
cell); no `*.mutbak`.

## 8. Handoff

**Source artifact:** `Claude/Plans/PLAN-parked-page-rides-home.md` (RATIFIED); test design
`Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md`.

**Status: BUILD_GREEN.** Full suite green (823 tests, 822 pass, 0 fail, 1 pre-existing skip); all
seven park-coverage mutants registered and confirmed CAUGHT by execution; `test/mutation-anchors.test.js`
green; no `*.mutbak` in the tree; build number bumped in lockstep.

**Decisions made:** none beyond the plan's own — this was a one-declaration change built to
specification, with the two new mutants registered verbatim from the test design's §6.

**Open questions:** none remaining from this build — the §7 F4 scrub was resolved in the follow-up
commit noted above. Device gate items (R1, R2 in the plan) remain device-owed and downstream of this
build, as the plan already states.

**Next owner: the code reviewer (Poirot).**

**Records updated:** this build log; `css/app.css`; `tools/mutate.mjs`; `test/parked-page-rides-home-css.test.js`
(skips removed); `build.json` / `sw.js` / `js/debug.js` / `index.html` (build stamp);
`test/swipe-declone-stage2-css.test.js` and `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md` (the F4
scrub, follow-up commit).
