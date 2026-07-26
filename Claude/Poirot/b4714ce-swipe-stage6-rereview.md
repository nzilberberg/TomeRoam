# Code Review (re-review) — Swipe/reveal Stage 6a fix (Poirot F1 + F2) — build 2026-07-26.246

Type: code-review
Prior-review: f09cf9d-swipe-stage6-supersession.md
Range: 80f07f3..b4714ce (the single fix commit b4714ce; HEAD)
Reviewer: Poirot
Date: 2026-07-26
Plan of record: `Claude/Plans/PLAN-swipe-stage6.md` (ratified). Red suite: `Claude/Curie/RED-swipe-stage6.md`.
Build log: `Claude/Brunel/swipe-stage6-build.md`. Prior verdict: FIX-THEN-SHIP (blocking F1; F2 observation).

A re-review is the same full coverage-ledger pass over the whole changelist, not a glance at the fix's diff.
I re-read `begin()`'s recovery block from scratch at HEAD, re-ran the load-bearing gates, and confirmed the two
findings are closed by an executed test that discriminates — not by a green suite that merely stopped complaining.

## Verdict

**SHIP (PASS).** Both findings are genuinely resolved and the fix introduced no regression. F1: the recovery's
`applyScreen` now forces `resetScroll:false` ONLY on the live-recovery branch (`resetScroll: d ? false : undefined`);
the orphan sub-case (`d===null`) passes `undefined`, which nav.js reads as its default `true` (its test is
`opts.resetScroll !== false`, and `undefined !== false`), so a home/options orphan hard-reset resets scroll to top
exactly as pre-6a. The new red-first OB-home cell proves it — RED on f09cf9d for the right reason, GREEN now — and
mutation #18 reverts the fix and reddens it (CAUGHT). The live path is untouched: VR/OR/NC/SR/SC all hold (sweep
#14–#17 still CAUGHT, full suite green). F2: the generated doc's §6 termination row now renders `[parity] †` with a
header and footnote that separate `basis` (verified-at-`where`) from the §10 (§8A) parity/policy classification, and
the footnote records the SR/SC columns as NEW POLICY and documents the orphan-scroll fix — internally consistent, and
still an honest mirror (doc == generator output; the re-pinned fingerprint genuinely matches the region). Nothing a
competent reviewer would require changed before submit.

## Findings table

| # | Severity | Finding |
|---|---|---|
| — | — | None. F1 and F2 resolved; no new defect. |

## The investigation

**The fix, read at HEAD (`js/app.js` 384-389).** `resetSwipeStyles(); applyScreen(currentDesc(), { render: d ?
d.clobbered : false, resetScroll: d ? false : undefined }); if (d) window.scrollTo(0, d.scroll0); dropRowHold();
session = null; d = null;`. The only functional change from f09cf9d is `resetScroll: false` → `resetScroll: d ? false
: undefined`. The load-bearing order (recover under hold → `dropRowHold` LAST → null identity LAST → arm) is byte-for-
byte the ratified §6, and the comment (365-383) was rewritten to state the fix accurately.

**F1 — the discriminator is correct, not merely green.** The guard keys on `d`, and that is exactly the right axis.
A superseded session that HAS a `d` owns a session-start scroll (`d.scroll0`), so the ratified SC policy applies:
suppress the default reset (`resetScroll:false`) and restore `d.scroll0`. An ORPHAN (`d===null`) is a corruption
cleanup with no session and no start scroll, so it must fall back to the pre-6a known-good reset — which
`resetScroll:undefined` restores. I checked the adjacent sub-case the guard could have gotten wrong: an
ARMED-but-not-live supersession (`d` truthy, `d.live` false). It correctly lands on the has-session branch —
`d.clobbered` is false so no source re-render, and `scrollTo(0, d.scroll0)` restores the arm-time scroll (the session
start), which IS the SC policy applied consistently, not the orphan's known-good reset. `d.scroll0`/`d.clobbered`
always exist when `d` is set (allocated at `begin()` 403-405), so no read throws. The `d` guard partitions
has-session (restore policy) from no-session (default reset) precisely; there is no third sub-case it mishandles.

**F1 — executed proof it discriminates.** The OB-home cell (`test/swipe-stage6.test.js` +40 lines) navigates to a home
source, injects an orphan `.nav-ghost` (`d===null`), trips the hard reset, and asserts `window.scrollTo(0, 1)` was
issued. It is RED against f09cf9d (which forced `resetScroll:false` → no reset) and GREEN now. Mutation #18
(`orphan sub-case forces resetScroll:false`) reverts precisely the fix and the sweep reports it CAUGHT (by OB-home).
The pre-existing OB (browse-source) cell stays green — browse is inert to `resetScroll` (nav.js 139-141 never resets
browse scroll), which is why OB was blind to F1 and OB-home was needed. The two cells together pin both source kinds.

**F2 — the doc is now internally consistent and honest.** `tools/gen-swipe-model.mjs` keeps `basis:'parity'` in the
data (the swipe-model gate requires every TERMINATION row to name where it is verified, and this row does) and adds a
`policyRef` field that renders a `†` on the basis cell plus a footnote. The rendered §6 gains a header stating
"`basis [parity]` = the row is VERIFIED against current code at its `where` … NOT the parity-vs-policy classification —
that is §10," and the footnote records "screen+scroll = SR/SC, NEW POLICY (§10)" and the orphan-scroll fix. The
contradiction the prior review named — `[parity]` reading as "not a policy change" over policy columns — is gone. The
authoritative, gated §10 (§8A) ledger already classified SR/SC as NEW POLICY and is unchanged, so no gate was gamed to
achieve consistency. The doc still equals the generator's `render()` output byte-for-byte (no hand edit).

**No new regression.** The supersession fingerprint legitimately moved (the `app.js` region changed: expanded comment
+ the ternary), and I recomputed it — `supersessionFingerprint()` returns `d39534854e3cc348`, exactly the re-pinned
`VERIFIED.supersession`. Not a hand-picked constant. The full suite is 687 pass / 0 fail / 1 skip (device-only KEEPER)
/ 2 todo (SR/SC, pending the §10 scrub). The mutation sweep over 14–18 reports 0 uncaught: the two Loki-killed
orderings (#14 hold-before-recover, #15 identity-before-hold) are still reddened by VR against the real virtualizer,
and the re-anchored VR/SR mutations still apply (anchor gate 2/2) because their anchor text was updated to the new
line. Ancillary files are stamp-only (`2026-07-26.246`; index.html pure cache-bust).

## Coverage Ledger

Every file changed in the Range × review dimensions. `✓` = cleared by a command run THIS pass (cited below);
`~` = cleared by reading/reasoning; `n/a` = not applicable.

| File (changed in b4714ce) | Correctness / data-flow | Ordering (§6) unregressed | Finding closure | Mutation-can-fail | Records / honesty |
|---|---|---|---|---|---|
| `js/app.js` `begin()` recovery | ✓ `d?false:undefined` → nav.js default (undefined!==false); has-session vs orphan partition correct incl. armed-not-live (read) | ✓ §6 order byte-identical; sweep #14/#15 CAUGHT | ✓ F1 closed — OB-home green, #18 CAUGHT | ✓ #18 (F1), #14-17 (VR/OR/NC/SR/SC) CAUGHT | ~ comment 365-383 accurate to code |
| `test/swipe-stage6.test.js` OB-home | ✓ asserts scrollTo(0,1) on home orphan; RED@f09cf9d/GREEN now; OB browse stays green (suite) | n/a | ✓ discriminates F1 (red-first + #18) | ✓ #18 CAUGHT by this cell | ~ header names the F1 case truthfully |
| `tools/gen-swipe-model.mjs` §6 render | ~ `policyRef`→† + header/footnote; basis data unchanged | n/a | ✓ F2 closed — §6 no longer reads parity over policy | n/a | ✓ committed==render() (probe) |
| `docs/swipe-model.generated.txt` | ✓ == generator output, normalized (probe) | n/a | ✓ internally consistent (read §6) | n/a | ✓ fingerprint pin genuine (probe) |
| `test/swipe-model.test.js` fingerprint | ✓ pin == `supersessionFingerprint()` d39534854e3cc348 (probe) | n/a | n/a | ✓ model gate green (suite) | ~ re-pin comment accurate |
| `tools/mutate.mjs` (re-anchor + #18) | ~ anchors updated to new line text | ✓ VR/SR mutations still apply+catch | ✓ #18 added, CAUGHT | ✓ anchor gate 2/2; sweep 14-18 0 uncaught | ~ |
| `build.json` / `sw.js` / `js/debug.js` / `index.html` | n/a | n/a | n/a | n/a | ✓ stamp-only `.246`; index pure cache-bust (grep); build gate green (suite) |
| `Claude/Brunel/swipe-stage6-build.md` | n/a | n/a | n/a | n/a | ~ build report (Brunel's craft) — records the two fixes |
| `Claude/Curie/RED-swipe-stage6.md` | n/a | n/a | n/a | n/a | ~ red report (Curie's craft) — records the OB-home red-first cell |

Commands cited for `✓` cells (all run this pass, `NODE=C:/Users/nzilb/tools/node-dist/node.exe`):
- `$NODE -e '…'` → `committed==generator: true`; `supersessionFingerprint(): d39534854e3cc348` (== VERIFIED pin).
- `$NODE --test "test/*.test.js"` → 690 tests, 687 pass, 0 fail, 1 skip, 2 todo (matches the commit claim).
- `$NODE tools/mutation-sweep.mjs 14 15 16 17 18` → all five CAUGHT; `swept 5: 0 uncaught, 0 unapplied, 0 stale flags`.
- `$NODE --test test/mutation-anchors.test.js` → 2 pass / 0 fail (every anchor, incl. the re-anchored VR/SR, still applies).
- `git show b4714ce -- build.json sw.js js/debug.js index.html` → stamp + cache-bust only.

## The prediction (Phase 6)

The fix closes the parity gap on the exact axis that produced it — a shared call inheriting a flag one branch needed —
and it is now guarded on both source kinds (OB browse + OB-home) with a mutation that reverts it. A future edit that
re-forces `resetScroll:false` onto the orphan reddens OB-home (#18-proven); an edit to the recovery region reddens the
fingerprint. The one residual remains the device-only KEEPER (a browser scroll between `endHold` and the successor's
first move, `NB-post-endHold-scroll-realize`), which no jsdom body can exercise — carried as W20. Nothing here is
scheduled to break.

## Watch-list

Carries forward every OPEN item from `f09cf9d-swipe-stage6-supersession.md`; the next review MUST forward every OPEN
item below.

- [W11] (open, minor) `start()` calls `buildConstruction` un-wrapped; a malformed live descriptor would throw out of
  the touchmove handler. Unreachable in normal flow. Untouched by b4714ce. Confirm acceptable or wrap.
- [W16] (open — `sameBrowseHost` half) The Stage-6 host field `sameBrowseHost` must return only in the commit that
  adds its consumer (the 6b finalization). 6a used `d.clobbered`; still deferred. Untouched by b4714ce.
- [W18] (open, observation) `changedFiles`/`parseChangedFiles` grammar coupling in `tools/mutation-sweep.mjs`.
  Untouched by b4714ce.
- [W20] (open, standing) On-device parity verification is owed for the swipe arc, and specifically for the Loki r2
  residual `NB-post-endHold-scroll-realize` — the device-only KEEPER (skipped) in `test/swipe-stage6.test.js`.
  SHIPPED-UNVERIFIED on device.
- [W22] (open, → Mendeleev) Stage-5 coverage gaps O3/O4 (F5a payload-passthrough; F1a "L3 forgets a key"). Untouched.
  Still owed to the coverage auditor.
- [W23] (resolved: this build — b4714ce) F1 orphan-path scroll-reset regression. `resetScroll: d ? false : undefined`
  restores the pre-6a default on the orphan (`d===null`); OB-home cell green (was red for the right reason), mutation
  #18 defends it. Graduated — the design lesson (a shared call must not force one branch's flag onto another) lives in
  this casebook's prediction.
- [W24] (resolved: this build — b4714ce) F2 generator label. §6 renders `[parity] †` + header/footnote separating
  `basis` (verified-at-`where`) from the §10 parity/policy classification; doc internally consistent + honest mirror.
  Graduated.
- [W25] (open, note — NOT a finding) The §10 records scrub remains deferred by design: `KR-swipe-scroll-restore` /
  `KR-swipe-source-rerender` remain in `PolicyLedger.mjs` and their `{todo}` tests remain (suite shows 2 todo). This
  is the sanctioned post-review coordinated scrub; the two known-reds are genuinely closed by the active VR/OR/NC
  cells (mutation-proven, sweep #16/#17). Confirm the scrub commit retires the ledger entries + `{todo}` markers and
  deletes the now-undefended policy-ledger mutation anchor (plan §10).

```json
{"persona":"poirot","stage":6,"input_artifact":"b4714ce","verdict":"PASS","blocking_ids":[],"return_to":"none"}
```
