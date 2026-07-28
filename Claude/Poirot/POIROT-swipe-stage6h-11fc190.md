# POIROT — Stage 6h code review (commit→home scroll-settle cover-gate)

Type: code-review
Prior-review: POIROT-swipe-stage6g-apply.md
Target: immutable commit `11fc190` ("Stage 6h BUILD_GREEN: commit->home scroll-settle cover-gate").
Range (git diff `11fc190~1` → `11fc190`): `js/app.js`, `tools/mutate.mjs`, `test/app-harness.js`,
`test/swipe-stage6h.test.js`, `docs/swipe-model.generated.txt`, `Claude/Brunel/swipe-stage6h-build.md`,
`Claude/Curie/RED-swipe-stage6h.md`.
Plan of record: `Claude/Plans/PLAN-swipe-stage6h.md` (PLAN_READY, Charpy TEMPER + Loki HELD_STONE).

`Verdict: **SHIP**` — the built gate is faithful to the plan, all three Loki structural properties are
preserved (so the HELD_STONE transfers), never-strand and exactly-once are exhaustively held and tested,
abort→browse is byte-unchanged, and the seven mutations each redden their named cell (three spot-checked
in isolation this pass). Nothing a competent reviewer would require changed.

---

## The scene, and what it intends

The change is additive: `holdGhostUntilPaintable` gains an optional third gate (`settled`) that, on the
commit→home held reveal WITH a large outgoing clamp, holds the cover until a real `window` `scrollend`
(or a bounded `SETTLE_MS=100` backstop) fires — so the iOS compositor's under-cover `scrollTo(0,1)`
scroll-collapse snap finishes before the cover lifts (flash A). Everything else in the reveal machine is
untouched. The gate is home-scoped by a per-call flag set at ONE site (app.js:1218), engaged only when
`cur.scroll0 > SETTLE_SCROLL_MIN` (≈0.5·innerHeight). The flash itself is device-only; CI proves the
mechanism.

## The three Loki structural properties — all preserved (HELD_STONE transfers)

Loki's HELD_STONE (`Claude/Loki/STRIKE-swipe-stage6h-r1.md` §5) named three invariants its 1022-interleaving
proof rests on. The built code preserves all three:

1. **`drop()` stays `dropped`-guarded (exactly-once).** `js/app.js:835` — `if (dropped) return; dropped =
   true;` is the first line of `drop()`, untouched by the diff (the diff adds lines only AFTER 843). A
   scrollend / SETTLE_MS / 600ms firing after drop reaches a `dropped`-guarded no-op. Held.
2. **The 600ms `revealTimer` calls `drop('timeout')` DIRECTLY (bypassing the gate) and is cancellable ONLY
   inside `drop()`.** `js/app.js:902` — `setTimeout(() => drop('timeout'), 600)` is untouched; it calls
   `drop` not `gate`, so `settled` never flipping cannot strand it. Grep confirms `revealTimer` appears at
   exactly two sites — set (902) and clear (843, inside `drop()`); no new clear was added. Held. The STRAND
   mutation (#81, routing the net through `gate()`) reddens STRAND ONLY (spot-checked in isolation this
   pass), confirming this is the never-strand backstop and it is guarded.
3. **`begin()`'s pane-owning rejection is untouched.** The diff touches only `holdGhostUntilPaintable`
   (806-916) and the two call sites (1218, 1235); `begin()`/`end()`/recovery (372-448) are not in any hunk.
   Held.

**loki_properties_hold: true.** A fresh Loki strike against the built code remains the plan's next gate
(§11), but the structural preconditions its stone rested on are intact — no re-strike is forced by this
review.

## Never-strand, exhaustively (the worse-than-flash guard)

- **View never paints (`painted=false`).** Both settle paths call `gate()`, which still requires
  `decoded && painted && settled` — so neither can drop while `painted` is false. The 600ms DIRECT
  `drop('timeout')` is the sole remover. STRAND cell proves it (`via=timeout`); confirmed green at HEAD and
  reddened by #81 in isolation.
- **`scrollend` never fires.** `SETTLE_MS=100` flips `settled` and completes the gate → `via=settle`.
  BACKSTOP proves it.
- **Both settle handles present but never flip `settled`.** They are cleared only inside `drop()`
  (848-849), so they cannot be disarmed without the drop that would already have removed the cover; the
  600ms net remains. No strand path exists.
- **Retirement in EVERY drop path.** `drop()` is the single removal function; the listener removal (848)
  and `clearTimeout(cur.revealSettleTimer)` (849) sit alongside the pre-existing cancels, so both retire on
  the gated path and the direct-timeout path alike.

## Exactly-once, ownership, and stale continuation across the async wait

- Both new handles are `cur`-owned (`cur.revealScrollEnd`, `cur.revealSettleTimer`), retired exactly once
  in the `dropped`-guarded `drop()` — the identical channel the pre-existing `revealFrames`/`revealTimer`
  use. No parallel supersession-side retirement was invented (EC §4.21). ONCE cell proves exactly-once +
  loser retirement; #82 (omit the settle-timeout cancel) reddens ONCE ONLY.
- A post-drop `scrollend` cannot double-drop: `drop()` removes the listener synchronously (848) and the
  guard makes any late gate a no-op. OWN cell spies `window.removeEventListener('scrollend', …)` fires
  exactly once per drop, so the `window` listener set stays bounded; #84 (omit the removal) reddens OWN
  ONLY (spot-checked in isolation this pass).
- The handlers read the live module `cur`, matching the existing reveal handles. This is safe because
  Loki property 3 (begin() rejects a successor while the pane-owning session holds) blocks reassignment of
  `cur` during a held reveal — the new handles inherit that same protection, introducing no new
  stale-continuation surface.

## Conditional correctness

`{ scrollSettle: cur.scroll0 > SETTLE_SCROLL_MIN }` (1218). `cur.scroll0` is the gesture-start outgoing
document scroll (`scroll0: window.scrollY || 0`, verified at app.js:466) — for a commit→home the tall
scrolled browse offset that clamps. It is an already-owned session value, so no new ambient `window.scrollY`
read is introduced (EC §4.16). `SETTLE_SCROLL_MIN = 0.5·window.innerHeight` (app.js:823). `cur.scroll0 ≈ 0`
provably takes the fast path (0 > ~384 is false → `settled` starts true → no listener/timer, gate =
`decoded && painted`); FASTPATH cell proves it (scroll0=0 arms no SETTLE_MS timer, `via=paint`), and #85
(force the flag unconditionally) reddens FASTPATH ONLY (spot-checked in isolation this pass). The
engage-above-half-a-screen boundary is the plan §4 default and is device-tunable; the only hard invariant
(top → fast path) holds.

## Other dimensions

- **`SETTLE_MS = 100`** — distinct from the reveal's own {60, 340, 500, 600} delays and `< 600`; inside the
  plan §4 band (80–120). The suite's `settleTimersOf` filter excludes {60,340,500,600} and isolates exactly
  one timer under this value (ONCE/BACKSTOP green confirm).
- **abort→browse (1235) byte-unchanged** — verified: `holdGhostUntilPaintable($('browse'), cover)` takes no
  third arg → `opts={}` → `settled = !undefined = true` → gate reduces to `decoded && painted`, no listener,
  no timer, drop retirements are no-ops (`revealScrollEnd` unset; `clearTimeout(undefined)` a spec no-op).
  SCOPE cell proves it; #83 (add `{scrollSettle:true}` there) reddens SCOPE ONLY.
- **The `via=`/`settle=` log** (885) — `via=` already names the releasing gate (scrollend|settle|timeout|
  paint|decode); the new `settle=${cover.settleVia || 'n/a'}` additionally records which settle-signal
  flipped `settled`, so a device repro can distinguish "scrollend fired but paint dropped last"
  (via=paint settle=scrollend) from "scrollend never came" (settle=settle). Fully diagnosable per plan §3.
  Diagnostic-only; `cover.settleVia` is consumed only by this log line — no behavior depends on it, and it
  is not a dead field.
- **Coverage honesty** — the 7 cells pin the mechanism; no cell reads a paint/rAF flash proxy, and the
  suite header + Curie's RED doc both state the flash is device-only. `h.setScrollY` defaults 0 (getter
  returns the same pinned 0 jsdom already gave), so existing tests are byte-unaffected — full suite 737
  pass confirms. No overclaim.
- **Doc regen** — `docs/swipe-model.generated.txt` diff is a single pinned line-reference shift
  (`js/app.js:1346` → `1389`, the +43 lines inserted above); fingerprints unchanged (swipe-model 11/11,
  transition-matrix green this pass).
- **EC compliance** — §4.3/§4.5 (one owner, single `drop()` endpoint) ✓; §4.6 (stale callbacks →
  guarded/removed) ✓; §4.7 (GATE asserts cover PRESENT after paint AND REMOVED after scrollend — both
  sides) ✓; §4.18 (normal release honors the settle gate; 600ms net is the named emergency backstop) ✓;
  §4.10 (mutations test misattribution — flag swaps, forced-on, net-rerouting — not only omission) ✓;
  §4.15 (no dead fields) ✓; §4.21 (narrow scope) ✓.

## Coverage Ledger

`✓` = cleared by EXECUTED evidence this pass (commands in "Executed evidence"); `~` = cleared by reading/
reasoning; `n/a`.

| Row (changed symbol / region) | Correctness / data-flow | Loki 3 properties | Never-strand | Exactly-once / ownership (§4.3/4.5/4.6) | Assert-both-sides (§4.7) | No dead fields (§4.15) | Mutation-verified (§4.10) | Suite / gates green |
|---|---|---|---|---|---|---|---|---|
| `SETTLE_SCROLL_MIN`/`SETTLE_MS` consts (823-824) | ✓ | n/a | n/a | n/a | n/a | ~ (both read) | ✓ (#85/#80) | ✓ |
| `holdGhostUntilPaintable` sig `opts={}` + `settled` (825,833) | ✓ | ~ | ✓ | ~ | n/a | n/a | ✓ (#79) | ✓ |
| `drop()` retirements (848-849) | ✓ | ~ (prop 1) | ✓ | ✓ | n/a | n/a | ✓ (#82/#84) | ✓ |
| gate predicate `&& settled` (887) | ✓ | n/a | ✓ | n/a | ✓ (GATE) | n/a | ✓ (#79) | ✓ |
| settle block: scrollend + SETTLE_MS + handles + `settleVia` (908-915) | ✓ | ~ (prop 2 untouched) | ✓ | ✓ | ✓ | ✓ (settleVia→log 885) | ✓ (#80/#84) | ✓ |
| FLASH `settle=` stamp (885) | ✓ | n/a | n/a | n/a | n/a | ✓ | ~ (diagnostic) | ✓ |
| commit→home call `{scrollSettle: …}` (1218) | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ (#79/#85) | ✓ |
| abort→browse call (1235, unchanged) | ✓ | n/a | ✓ | ✓ | n/a | n/a | ✓ (#83) | ✓ |
| `tools/mutate.mjs` #79-85 | ✓ | n/a | n/a | n/a | n/a | n/a | ✓ (anchors 2/2) | ✓ |
| `test/app-harness.js` `setScrollY` + settable scrollY | ✓ | n/a | n/a | n/a | n/a | n/a | ~ (default 0, no regression) | ✓ |
| `test/swipe-stage6h.test.js` (7 cells) | ✓ | n/a | ✓ (STRAND) | ✓ (ONCE/OWN) | ✓ (GATE) | n/a | ✓ | ✓ |
| `docs/swipe-model.generated.txt` (line-shift) | ~ | n/a | n/a | n/a | n/a | n/a | n/a | ✓ (fingerprints) |
| `Claude/Brunel/…`, `Claude/Curie/…` (records) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

No empty cells.

## Executed evidence (backs every `✓`)

- `node --test test/swipe-stage6h.test.js` → 7 pass / 0 fail.
- `node --test test/mutation-anchors.test.js` → 2 pass (every 6h anchor matches; no no-op mutation).
- `node tools/mutation-sweep.mjs 79 80 81 82 83 84 85` → all 7 `caught`, `swept 7: 0 uncaught, 0 unapplied,
  0 stale flags`, exit 0; no `*.mutbak` remains; `git status --porcelain js/app.js tools/mutate.mjs` clean.
- Isolation spot-check (apply one, run `test/swipe-stage6h.test.js` alone, restore): #81 → STRAND ONLY red;
  #84 → OWN ONLY red; #85 → FASTPATH ONLY red. Tree restored clean after each.
- `node --test "test/*.test.js"` → 738 tests / 737 pass / 0 fail / 1 skip (the pre-existing device-only
  KEEPER skip, unrelated).
- `node --test test/{swipe-model,transition-matrix,construction-consumers}.test.js` → 16 pass / 0 fail.
- Grep `revealTimer` in `js/app.js` → set@902, clear@843 (inside `drop()`) only; `holdGhostUntilPaintable`
  call sites → exactly 1218 (commit→home, conditional) and 1235 (abort→browse, no arg).
- Read `cur.scroll0` capture at app.js:466 (`scroll0: window.scrollY || 0`).

## Prediction

If the device repro (scroll down → commit→home) still flashes with a clean `via=scrollend`, plan §3 Risk 2
(scrollend fires before the compositor re-tile finishes) is realized and the deferred post-`scrollend`
frame-hold (§10) is the next lever — a heuristic, honestly labelled. If the log shows `via=settle`
dominating, `scrollend` does not fire on an instant programmatic scroll (Risk 1) and the fix is effectively
a tuned `SETTLE_MS` hold. Either way the cover never strands and is never worse than today — the CI
guarantee (mechanism + never-strand + bounded listener) holds regardless. This is the plan's own honesty
finding, correctly built in, not a defect.

## Watch-list

- **[W1] open** — 6b records reconciliation un-applied in HEAD. Owner Zelda. Carried.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device strike. Carried.
- **[W4] open** — 6c apply-on-approval records (incl. the `js/app.js` classifier comment stale text). Owner Zelda. Carried.
- **[W5] open** — Loki r2 lesser-planes (`recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` → Brunel). Carried.
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat. Carried.
- **[W7] open** — 6d apply-on-approval records un-applied in HEAD. Owner Zelda. Carried.
- **[W8] open** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda. Carried.
- **[W9] open** — Loki 6e residual 2: unguarded `.nav-ghost === owned-pane(live session)` invariant. Carried.
- **[W10] open** — `disposeOwnedPanes`/`dropPanes` byte-identical removers; collapse on F-pane unification. Carried.
- **[W11] open** — 6e apply-on-approval records un-applied in HEAD. Owner Zelda. Carried.
- **[W12] open** — 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Owner Mendeleev. Carried.
- **[W13] open** — 6f apply-on-approval records (plan §9). Owner Zelda. Carried.
- **[W14] open** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device strike. Carried.
- **[W16] open** — 6g apply-on-approval records un-applied in HEAD. Owner Zelda. Carried.
- **[W18] open** — 6h apply-on-approval records (plan §9): DecisionLog NEW-POLICY entry, `Subsystems/swipe-reveal.md` note, `PLAN-swipe-reveal.md` §7 annotation, `Linnaeus/PROBE-scroll-clamp-reveal.md` realized-by pointer, build-number bump. Owner Zelda. Not a code matter (Brunel deliberately deferred to the handoff, build §7).
- **[W19] open** — 6h DEVICE-VERIFICATION owed (plan §9): the user's scroll-down repro must be clean AND the `via=`/`settle=` log must show the intended path before "confirmed fixed". Owner on-device strike.
- **[W20] open** — `SETTLE_SCROLL_MIN` = 0.5·innerHeight is captured once at closure-definition time; a mid-session viewport change (rotation) leaves the threshold slightly stale. Non-blocking (a loose heuristic boundary, plan §4 default); noted for the device-tuning pass, not a finding.
- **[W21] open** — a fresh Loki strike against the BUILT code remains the plan's next gate (§11); this review confirmed the three structural preconditions its HELD_STONE rested on are intact, but did not re-run the strike. Owner Loki.

---

Verdict: **SHIP**

{"persona":"poirot","stage":"6h","verdict":"SHIP","target":"11fc190","loki_properties_hold":true,"loki_restrike_needed":false,"findings":[],"return_to":"mendeleev"}
