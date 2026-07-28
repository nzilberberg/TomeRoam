# Build log — Stage 6g review application (F1 critical, F2 observation)

Type: build log (review-application, not a new stage)

Source review: `Claude/Poirot/POIROT-swipe-stage6g-5cc0f14.md` (verdict FINDINGS) and
`Claude/Mendeleev/AUDIT-swipe-stage6g.md` (verdict BARE_CELLS) — same defect, independently
confirmed. Target commit reviewed: `5cc0f14`. Applied on top of `5cc0f14` (working tree, not a
new commit, per the caller's explicit instruction).

`Verdict: **BUILD_GREEN**`

---

## 1. Findings applied

- **F1 (Critical)** — applied. The CI mutation-sweep reported mutation #79 (`css/app.css`,
  cell PROMO) UNCAUGHT because its only catcher, `test/home-layer-invariant.test.js`, sits in
  `SOURCE_TEXT_GATES` and is excluded from the sweep's general behavioural run. #79 lands in
  shard 7/8, which `ci.yml` runs on every push — CI mutation-sweep would go red on the next
  push.
- **F2 (Observation)** — applied. `css/app.css:115` and `js/app.js:552-561` overclaimed
  "device-confirmed navbar-safe" for the shipped `translateZ(0)` rule; the `.256` device A/B
  confirmed the `will-change` probe form, not the shipped form.
- **F3** — no change (Poirot recorded it as documented non-vacuous design, not an open finding).

## 2. F1 mechanism — general, not a #79 special case

Reproduced first: `node tools/mutation-sweep.mjs 79` → `#79 UNCAUGHT`, exit 1, before any
change — matches the casebooks exactly.

Chose Poirot's `caughtBy`-marker shape over Mendeleev's `source-gate-sweep.mjs`-relocation
alternative: it keeps one sweep entry point (`tools/mutation-sweep.mjs`, the one `ci.yml`
already runs by shard) rather than adding a second CI job, and it generalizes to any future
source-text-only mutation without touching the sweep's shard math or `ci.yml`.

- `tools/mutate.mjs:562-573` — mutation #79's entry gains `caughtBy: 'home-layer-invariant.test.js'`.
  Any future source-text-only mutation names its own gate the same way; no per-mutation code
  change is needed in the sweep for the next one.
- `tools/mutation-sweep.mjs:119-133` — new `gateTestsFor(mutation)` helper: if the mutation
  carries `caughtBy`, the sweep runs *that one gate file* directly (`['--test', 'test/<gate>']`)
  instead of the general `behaviourTests()` set, and counts the gate's own reddening as the
  catch. The `SOURCE_TEXT_GATES` exclusion list is unchanged — it still keeps
  `home-layer-invariant.test.js` out of the *general* run (so it cannot false-catch an
  unrelated mutation); `caughtBy` only opens a *targeted* run of that gate for the one mutation
  that legitimately breaks it.
- `tools/mutation-sweep.mjs:192-220` — the main sweep loop calls `gateTestsFor(MUTATIONS[i])`
  instead of always calling `behaviourTests()`, and the console output for a caught mutation
  names the gate it went through (`caught (N failing) via source-text gate <file>`) so a reader
  of the sweep's own output sees which channel defended it.

No `benignAlone` marker was used anywhere in this fix — that would have asserted #79 is
survivable, which is false; it is caught, just not by the general behavioural run.

**Proof the gate genuinely reddens** (not asserted, executed):

```
$ node tools/mutation-sweep.mjs 79
#79  caught (2 failing) via source-text gate home-layer-invariant.test.js — stage6g PROMO [SOURCE_TEXT]: ...
swept 1: 0 uncaught, 0 unapplied, 0 stale flags
EXIT=0
```

```
$ node tools/mutation-sweep.mjs 79 80
#79  caught (2 failing) via source-text gate home-layer-invariant.test.js — stage6g PROMO ...
#80  caught (3 failing) — stage6g REVEAL: setView stops un-parking #home on a reveal ...
swept 2: 0 uncaught, 0 unapplied, 0 stale flags
EXIT=0
```

```
$ node tools/mutation-sweep.mjs --shard=7/8      # the exact CI shard that carries #79
--shard 7/8: 10 of 81 mutation(s).
#7 #15 #23 #31 #39 #47 #55 #63 #71 all caught
#79  caught (2 failing) via source-text gate home-layer-invariant.test.js — ...
swept 10: 0 uncaught, 0 unapplied, 0 stale flags
EXIT=0
```

Mutation applied synchronously by index, restored via `node tools/mutate.mjs --restore` after
the standalone check; `git status` and a filesystem search confirm no `*.mutbak`/`*.sgbak` left
behind at any point.

## 3. F2 — comment softening (css/app.css, js/app.js; no logic touched)

`css/app.css:109-118` (the `#home` promotion comment) and `js/app.js:552-562` (the mover-parking
comment) both now read: the `.256` device A/B confirmed navbar-safety for the `will-change`
probe form; the shipped `translateZ(0)` form is EXPECTED navbar-safe by the same
containing-block/stacking argument (plan §4), but its own device confirmation is still owed
(plan §9b). Neither file's executable/declarative content changed — the `#home { transform:
translateZ(0); }` rule and the `js/app.js` mover-loop line are byte-identical to `5cc0f14`; only
comment text was edited.

`docs/swipe-model.generated.txt` was regenerated (`node tools/gen-swipe-model.mjs`) because the
`js/app.js` comment grew by 2 lines, shifting three dynamically-derived line references
(783→786, 784→787, 1351→1354). Regenerating a second time produced a byte-identical file
(deterministic, line-shift only); the four SOURCE FINGERPRINTS are unchanged.

## 4. Files changed

| File | Change |
|---|---|
| `tools/mutate.mjs` | Mutation #79 gains `caughtBy: 'home-layer-invariant.test.js'` + updated comment explaining the general mechanism. No other mutation entry changed. |
| `tools/mutation-sweep.mjs` | New `gateTestsFor()` helper + sweep loop now runs a mutation's named `caughtBy` gate directly when present; `SOURCE_TEXT_GATES` comment for `home-layer-invariant.test.js` updated to describe the mechanism. No change to shard math, `--affected`, or CI wiring. |
| `css/app.css` | Comment only (lines 109-118) — softened navbar-safety claim. Rule at line 116 (`#home { transform: translateZ(0); }`) untouched. |
| `js/app.js` | Comment only (lines 552-562) — softened navbar-safety claim. Executable line below (mover transform loop) untouched. |
| `docs/swipe-model.generated.txt` | Regenerated — line-number shift only from the `js/app.js` comment growing by 2 lines; fingerprints unchanged. |

Not modified: `js/nav.js`, `js/swipe.js`, `test/home-layer-invariant.test.js`,
`test/swipe-stage6g.test.js`, `.github/workflows/ci.yml`, `package.json`,
`tools/source-gate-sweep.mjs` (left as-is; not the chosen mechanism), any file outside this
table.

## 5. Full suite, meta-gates, pre-commit battery (re-run after all edits above)

- `node tools/hooks/run-checks.mjs` → **stamp / lint / typecheck / tests — all PASS.**
- `node --test test/*.test.js` → **736 tests, 735 pass, 0 fail, 1 skipped** (same as the
  pre-existing `5cc0f14` baseline — the skip is unrelated and unchanged).
- `node --test test/home-layer-invariant.test.js test/swipe-stage6g.test.js` → **5/5 pass.**
- `node --test test/mutation-anchors.test.js` → **2/2 pass** (both #79/#80 anchors still match
  source; the `caughtBy` field addition does not affect anchor matching).
- `node --test test/construction-consumers.test.js` → **2/2 pass.**
- `node --test test/policy-ledger-gate.test.js` → **3/3 pass.**
- `node --test test/contract-function-gate.test.js` → **4/4 pass.**
- `node --test test/swipe-model.test.js` → **11/11 pass** (fingerprint-unchanged assertion
  holds — the four mirrored `js/app.js` regions are byte-identical; the comment edit sits
  outside every one of them).
- `node --test test/transition-matrix.test.js` → **3/3 pass.**
- `node tools/mutation-sweep.mjs 79 80` → **all CAUGHT, exit 0** (§2 above — the load-bearing
  proof this application closes).
- `node tools/mutation-sweep.mjs --shard=7/8` → **10/10 caught, 0 uncaught, exit 0** (the exact
  CI shard `ci.yml` runs on every push).

## 6. What this application did NOT do

- Did not touch the `css/app.css` `#home { transform: translateZ(0) }` rule itself, or any
  `js/app.js` logic — comment-only per the caller's constraint.
- Did not add a `benignAlone`/survivable marker for #79 — Poirot's finding named this
  explicitly as a false-reassurance trap; the mechanism instead proves #79 genuinely caught.
- Did not relocate #79 into `tools/source-gate-sweep.mjs` (Mendeleev's alternative shape) —
  that tool is unmodified and remains hardcoded to `js/app.js` only; the `caughtBy` mechanism
  was judged cleaner because it keeps one sweep entry point and needs no `ci.yml` change.
- Did not advance to a new stage, author a new plan, or open a new coverage cell — this is a
  review application on the existing `5cc0f14` slice.
- Did not commit, push, or bump the build number — the working tree is left uncommitted, for
  Zelda's housekeeping pass (per the caller's explicit instruction). The plan §9
  records-reconciliation items already carried as owed by the prior build log
  (`Claude/Brunel/swipe-stage6g-build.md` §3) are unaffected by this application and remain
  owed.
- Did not re-verify device navbar-safety of the shipped `translateZ(0)` form — F2 only
  corrected the comment to state that obligation honestly; the device pass itself stays on the
  standing shipped-unverified device-pass list (plan §9b).

---

Verdict: **BUILD_GREEN**
