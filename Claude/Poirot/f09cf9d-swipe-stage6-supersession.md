# Code Review — Swipe/reveal Stage 6a (supersession pre-stack recovery inside the Browse hold) — build 2026-07-26.245

Type: code-review
Prior-review: 0049a13-swipe-stage5-buildconstruction.md
Range: 974d3249..f09cf9d (the single commit f09cf9d; HEAD)
Reviewer: Poirot
Date: 2026-07-26
Plan of record: `Claude/Plans/PLAN-swipe-stage6.md` (ratified, Loki-corrected + Charpy-F3-corrected r3).
Red suite: `Claude/Curie/RED-swipe-stage6.md`. Build log: `Claude/Brunel/swipe-stage6-build.md`.
Strikes: Loki KILL `STRIKE-swipe-stage6-recover-before-arm.md` (the ordering that must NOT return);
Loki HELD-STONE `STRIKE-swipe-stage6-recover-before-arm-r2.md` (the ratified order, proven on the real modules).

The scene was staged generously — plan, red report, build report, two Loki strikes, the exact claim. I took every
fact and none of the conclusions. What follows is what I confirmed with my own eyes and my own commands.

## Verdict

**FIX-THEN-SHIP.** The load-bearing work is correct and, this time, the suite can see the defect that once slipped
past it: the ratified §6 teardown order is built exactly — recover inside the hold (re-render iff `d.clobbered`,
restore `d.scroll0` while rows stay suspended) → `dropRowHold()` LAST → null `session`/`d` LAST → arm — and BOTH
Loki-killed orderings are now reddened by an executed mutation against the real virtualizer (sweep #14/#15 CAUGHT).
The generator mirror is honest and its supersession fingerprint is the genuine hash of the real region. One Minor
blocks a clean bill: the hard-reset's shared `applyScreen` call forces `resetScroll:false` onto the ORPHAN sub-case
too, silently dropping the scroll-to-top the old hard reset performed on a home/options source — an unclassified
behavior change (Engineering Contract §4.19/§4.21) on a path the plan called parity, invisible to the OB test.
Trivial to fix or to classify; that it is small is why it is not do-not-ship, not a reason to call it ship.

## Findings table

| # | Severity | Finding | Routed |
|---|---|---|---|
| F1 | Minor | The hard-reset's `applyScreen(currentDesc(), { render: d?d.clobbered:false, resetScroll: false })` forces `resetScroll:false` on the ORPHAN branch (`d===null`) as well as the live-recovery branch. For an orphan hard-reset whose `currentDesc()` is `home` or an options/sub-screen, the old code reset scroll to top (nav.js:127/134, default `resetScroll:true`); the new code does not. Unclassified behavior change on a path the plan §2 called parity; not caught by the OB test (browse source, where `resetScroll` is inert). Not reachable-and-broken. | Brunel (guard the orphan sub-case, e.g. `resetScroll: !!d ? false : undefined`) / Vitruvius (classify + accept if intended) |
| F2 | Observation | Generated doc §6 TERMINATION table stamps the `hard-reset (leftover)` row `[parity]` while its own `screen`/`scroll` columns now carry the newly-implemented SR/SC policy, and §5 prose + the gated §10 (§8A) ledger both call those NEW POLICY. The authoritative, gated classification (§10) is correct — this is not a rubber-stamp — but the §6 label reads `[parity]` over policy behavior (StandardsDocument §7 within-document consistency). | Brunel (generator) |

## The investigation

**The intent (Phase 1).** One coherent behavior-changing slice: on a gesture that supersedes a LIVE drag, recover the
superseded source PRE-STACK *inside* the Browse hold, then release the hold, then drop identity, then arm — closing
the two standing known-red supersession policies (source re-render, scroll restore). The whole change is one block in
`js/app.js` `begin()` (lines 364-386); everything else is the honest tail — a regenerated doc, a re-anchored + four new
mutations, the new red cells, the harness realBrowse path, the fingerprint pin, the build stamp. Scope matches the
description.

**The night before (Phase 2).** This block has a history that is the entire reason the review matters. Loki's first
strike (`recover-before-arm`, KILL) proved that the *prior* draft's order — `dropRowHold()` before the recovery
render — dematerializes a virtualized source's kept rows (`virtuallist.js deactivate()`) and hands the successor a
cover-less grid: the .178/.202 wrong-content class the hold exists to prevent. The coupled Charpy F3 correction found
the sibling defect: nulling `session` before `dropRowHold` makes `dropRowHold` a no-op (it reads `session`), leaking
the hold so the rows are never realized. The r2 strike then executed the *corrected* order against the real
`browse.js`/`virtuallist.js` and returned HELD STONE (kept=13, active). My job was to confirm the built code is the
r2 order and not either corpse.

**Killer vs witness (Phase 3) — the built order.** Read at HEAD, `begin()` 364-386:
`releaseGesture()` → `resetSwipeStyles()` → `applyScreen(currentDesc(), { render: d?d.clobbered:false, resetScroll:false })`
→ `if (d) window.scrollTo(0, d.scroll0)` → `dropRowHold()` → `session = null` → `d = null`, then fall through to arm
(393+). This is the ratified §6 order exactly. The two real readers confirm the coupling: `dropRowHold` (339-343)
returns early on `!session || !session.hold`; `releaseGesture` (324) returns early on `!session`. So nulling `session`
before either would silently no-op the hold release — which is precisely why the null moved last. The abort
(`finalize()`/`runFinalize()`, 1101-1129 + the `finally` at 1149-1151) observes the identical envelope: render+scroll
under the hold, then `dropRowHold(); endOwnership()`. The built recovery mirrors the ENVELOPE, not merely the middle
pair — the fix the first strike demanded.

**The Investigation (Phase 4).** The recovery correctly reuses the existing carriers: `d.clobbered` (set in `start()`
481 from `c.sourceWasClobbered`), `d.scroll0` (recorded in `begin()` 404), `currentDesc()` (the source, since a
pre-settle live session never mutated the stack). No `sameBrowseHost` field was introduced — deliberately deferred
(plan §11), so no dead field. The classic (non-virtualized) path still restores through the same `applyScreen`+`scrollTo`;
the small-list fixtures reuse the cached page node with rows intact (why VR must force the virtual path). Nothing the
reordering touched is read elsewhere — the change is internal to `begin()`, and the one mutation whose anchor pointed
at the old one-liner was re-anchored (mutate.mjs `HARDRESET_DISPOSE_FROM`); the anchor gate confirms every anchor still
applies (2/2).

*The reassuring comments, each checked.* The 364-379 comment makes several absolute claims: "releasing it first would
deactivate a suspended virtualized source and dematerialize its kept rows" (verified — Loki r2 Scenario B, and sweep
#14 CAUGHT); "dropRowHold no-ops on a null session" (verified — app.js:340); "nulling it any earlier would leak the
hold" (verified — sweep #15 CAUGHT, and app.js:340). The `start()` comment "start() … snapshots the pre-render #browse"
holds (revealBase = snapBrowse(true) at 440, BEFORE the mid-drag render). None read past.

*The mutations are non-vacuous — and honestly so.* The registry documents that the NC force-render-TRUE mutation was
**tried and dropped** because `Nav.applyScreen` dispatches on `desc.v` before consulting the `render` flag, so it
reddens nothing for an overlay source — NC's genuine proof is the scroll mutation. That is the §4.10 discipline done
right, not gestured at.

**The one that slipped the parity label (F1).** The recovery legitimately needs `resetScroll:false` on the LIVE path
so `applyScreen` does not stomp the explicit `d.scroll0` restore. But the orphan sub-case (`d===null`) rides the same
`applyScreen` call and inherits `resetScroll:false`. For a browse source this is inert (nav.js:139-141 never resets
scroll). For a **home** or **options/sub** source it is not: the old `applyScreen(currentDesc(), { render:false })`
reset scroll to top (nav.js:127/134 under the default `resetScroll:true`); the new call does not. I executed it rather
than argue it: an orphan hard-reset with a home source issues no `scrollTo(0,1)` at HEAD (probe below). The plan §2
classified the orphan branch as parity ("Stays exactly as today"); it is not, for those two source kinds. The OB test
cannot see it — it drives a browse source. Benign on an anomalous defensive path (a leftover non-spent `.nav-ghost`
with no live session), but an unclassified behavior change nonetheless.

**The generator (Phase 4, oracle honesty).** The TERMINATION row's `where`/`screen`/`scroll` fields were honestly
rewritten to the new order; the §5 prose reclassifies both repairs as NEW POLICY prominently; the gated §10 (§8A)
ledger lists both under SUPERSEDED as NEW POLICY. The doc is a truthful mirror, not a rubber-stamp. The single blemish
(F2): the compact §6 row still carries `[parity]` as its basis while its columns render policy content — defensibly a
label about the supersede-not-reject *decision*, but it reads wrong beside the policy cells.

**The fingerprint is genuine.** `supersessionFingerprint()` computed from the real `app.js` region equals the pin
`9227f47ff3d3c7db`; the committed doc equals the generator's `render()` output byte-for-byte (normalized). Not a
hand-picked constant.

## Coverage Ledger

Every changed file × review dimensions. `✓` = cleared by a command run THIS pass (cited below); `~` = cleared by
reading/reasoning; `n/a` = not applicable.

| Symbol / file (changed) | Correctness / data-flow | Ordering (§6) | Resource/teardown | Mutation-can-fail | Parity/policy (§4.19) | Records / honesty |
|---|---|---|---|---|---|---|
| `js/app.js` `begin()` recovery block | ✓ order = ratified §6; readers `dropRowHold`/`releaseGesture` read `session` (read + sweep) | ✓ #14/#15 CAUGHT (hold-last, null-last both reddened) | ✓ hold released after recover, identity last; classic path intact (read + sweep) | ✓ #16 (OR+VR), #17 (NC) CAUGHT | **F1** orphan `resetScroll` flip unclassified (probe) | ~ 364-379 comment claims all verified |
| `js/app.js` `begin()` ORPHAN sub-case | ✓ `d?d.clobbered:false` + `if(d)` guards → no throw/no d.* read (read + OB run) | ~ same call, no scroll write on orphan | ✓ dropRowHold/releaseGesture no-op on null session (read) | ✓ OB green; probe shows behavior | **F1** (home/options: scroll-to-top dropped) | ~ |
| `tools/gen-swipe-model.mjs` TERMINATION + prose | ~ `where`/`screen`/`scroll` honestly rewritten | n/a | n/a | n/a | **F2** §6 row `[parity]` over policy; §10 ledger correct | ✓ committed==render() (probe) |
| `docs/swipe-model.generated.txt` | ✓ == generator output, normalized (probe) | n/a | n/a | n/a | ~ §10 NEW-POLICY ledger correct+gated | ✓ fingerprint pin genuine (probe) |
| `test/swipe-model.test.js` VERIFIED.supersession | ✓ pin == `supersessionFingerprint()` (probe) | n/a | n/a | ✓ model gate green (test run) | n/a | ~ pin comment accurate |
| `test/swipe-stage6.test.js` (VR/OR/NC/PS/OB + KEEPER) | ✓ 5 active pass, 1 skip (test run) | ✓ VR pins active+kept+fresh; OR intermediate-state | ✓ VR drives real hold/realize | ✓ each cell reddened by its §9 mutation (sweep) | ~ SR/SC referenced, not duplicated | ~ KEEPER honestly skipped (device-only), not faked |
| `test/app-harness.js` realBrowse + author fakes | ✓ VR fixture boots real browse.js/virtuallist.js (test run) | n/a | n/a | n/a | ~ fakes faithful to Plex triad | ~ getters expose real modules |
| `tools/mutate.mjs` (re-anchor + 4 new) | ~ anchors match new source | ✓ VR (a)/(b) + SR + SC/NC mutations | n/a | ✓ anchors apply 2/2; sweep #14-17 CAUGHT | ~ dropped-NC-mutation documented honestly | ~ |
| `build.json` / `sw.js` / `js/debug.js` / `index.html` | n/a | n/a | n/a | n/a | n/a | ✓ stamp-only `2026-07-26.245`; index pure cache-bust (grep); full suite green incl. build gate |
| `Claude/Brunel/swipe-stage6-build.md` | n/a | n/a | n/a | n/a | n/a | ~ build report (Brunel's craft) |
| `Claude/Curie/RED-swipe-stage6.md` | n/a | n/a | n/a | n/a | n/a | ~ red report (Curie's craft) |

Commands cited for `✓` cells (all run this pass, `NODE=C:/Users/nzilb/tools/node-dist/node.exe`):
- `$NODE --test test/swipe-model.test.js test/swipe-stage6.test.js test/swipe-invariants.test.js` → 40 tests, 37 pass, 0 fail, 1 skip, 2 todo.
- `$NODE --test "test/*.test.js"` → 689 tests, 686 pass, 0 fail, 1 skip, 2 todo (matches the commit claim).
- `$NODE -e '…'` render/fingerprint probe → `committed==generator: true`; `supersessionFingerprint(): 9227f47ff3d3c7db` (== VERIFIED pin).
- `$NODE tools/mutation-sweep.mjs 14 15 16 17` → all four CAUGHT; `swept 4: 0 uncaught, 0 unapplied, 0 stale flags`.
- `$NODE --test test/mutation-anchors.test.js` → 2 pass / 0 fail (every anchor still applies).
- Orphan probe (real harness, home source): orphan hard-reset trips, `scrollTo` calls = `[]`, `scrollTo(0,1)` issued = false — confirms F1's new behavior; the old `applyScreen(currentDesc(),{render:false})` issued `scrollTo(0,1)` per nav.js:117/127.
- `git show f09cf9d -- build.json sw.js js/debug.js index.html` → stamp + cache-bust only.

## The prediction (Phase 6)

The load-bearing order is sound and now guarded, so the failure that once slipped through will not: a future edit that
reverts either sub-step reddens VR (sweep-proven), and a change to the real `begin()` region reddens the fingerprint.
The residual to watch is the one Loki r2 could not give a body — a browser scroll fired between `endHold` and the
successor's first `move()` releasing the kept rows — correctly filed as the device-only KEEPER, and it stays a phantom
until on-device verification (W20). F1, left unfixed, will not break anything today; but the pattern it exemplifies —
a shared call inheriting a flag one branch needed — is exactly how a "parity" path quietly stops being parity, and the
next slice that generalizes this recovery (Stage 6b) would inherit the orphan's unclassified change as precedent. Fix
or classify it now, while it is one line and one ledger row.

## Watch-list

Carries forward every OPEN item from `0049a13-swipe-stage5-buildconstruction.md`; the next review MUST forward every
OPEN item below.

- [W11] (open, minor) `start()` calls `buildConstruction` un-wrapped; a malformed live descriptor would throw out of
  the touchmove handler. Unreachable in normal flow (nav-stack descriptors). Untouched by f09cf9d. Confirm acceptable
  or wrap.
- [W16] (open — `sameBrowseHost` half) The Stage-6 host field `sameBrowseHost` must return to the classification ONLY
  in the commit that adds its consumer. f09cf9d deliberately used the existing `d.clobbered` carrier and DEFERRED
  `sameBrowseHost` to 6b (plan §11) — correct, no dead field added. Remains open for 6b.
- [W18] (open, observation) `changedFiles`/`parseChangedFiles` grammar coupling in `tools/mutation-sweep.mjs`.
  Untouched by f09cf9d.
- [W20] (open, standing) On-device parity verification is owed for the whole swipe arc, and now specifically for the
  Loki r2 residual `NB-post-endHold-scroll-realize` — filed as the device-only KEEPER (skipped) in
  `test/swipe-stage6.test.js`, which has no honest jsdom body. SHIPPED-UNVERIFIED on device.
- [W22] (open, → Mendeleev) Coverage gaps O3/O4 from stage 5 (F5a payload-passthrough, F1a "L3 forgets a key").
  Untouched by f09cf9d. Still owed to the coverage auditor.
- [W23] (open, minor — F1, this review) The hard-reset's shared `applyScreen` forces `resetScroll:false` on the ORPHAN
  branch, dropping the scroll-to-top the old hard reset performed on a home/options source. Unclassified behavior
  change on a plan-declared-parity path; not caught by OB (browse fixture). Routed to Brunel (guard the orphan
  sub-case) / Vitruvius (classify + accept).
- [W24] (open, observation — F2, this review) Generated doc §6 TERMINATION `hard-reset` row labels `[parity]` over the
  now-policy `screen`/`scroll` columns; §10 (§8A) ledger is correct. Routed to Brunel (generator).
- [W25] (open, note) The §10 records scrub for this slice is DEFERRED by design: `KR-swipe-scroll-restore` /
  `KR-swipe-source-rerender` remain in `PolicyLedger.mjs` and their `{todo}` tests remain in
  `test/swipe-invariants.test.js` (suite shows 2 todo). This is the sanctioned post-review coordinated scrub, not an
  omission — the two known-reds are genuinely closed by the active VR/OR/NC cells (their behavior is mutation-proven,
  sweep #16/#17). The scrub commit retires the ledger entries + `{todo}` markers and deletes the now-undefended
  policy-ledger mutation anchor (plan §10). Confirm it lands.

```json
{"persona":"poirot","stage":6,"input_artifact":"f09cf9d","verdict":"IMPLEMENTATION_FINDINGS","blocking_ids":["F1"],"return_to":"brunel"}
```
