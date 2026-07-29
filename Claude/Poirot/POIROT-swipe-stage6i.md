# POIROT — Stage 6i code review (fixed own-scroll `#home` slide-and-leave + the `.mutbak` gate)

Type: code-review
Prior-review: POIROT-swipe-stage6h-11fc190.md
Target: two immutable commits — `e21b4c6` ("Swipe Stage 6i: fixed own-scroll #home slide-and-leave",
build .262) and `b8df043` ("Pre-commit gate: block a commit while a *.mutbak exists", build .263).
Range (git diff `e21b4c6~1` → `b8df043`): js/swipe.js, js/app.js, js/nav.js, js/scrollbar.js,
js/debug.js, css/app.css, index.html, sw.js, build.json, test/fixtures/swipe-plan-spec.mjs,
test/swipe-construction.test.js, test/swipe-gesture.test.js, test/swipe-invariants.test.js,
test/swipe-stage5-residuals.test.js, test/swipe-stage5-wiring.test.js, test/swipe-stage6.test.js,
test/swipe-stage6b-loser-cancel.test.js, test/swipe-stage6e.test.js, test/swipe-stage6h.test.js (deleted),
test/swipe-stage6i.test.js, test/screens.test.js, test/transition-matrix.test.js,
test/no-mutbak-gate.test.js (new), tools/mutate.mjs, tools/gen-swipe-model.mjs,
tools/hooks/no-mutbak-check.mjs (new), tools/hooks/run-checks.mjs,
docs/swipe-model.generated.txt, docs/transition-matrix.generated.txt.
Plan of record: `Claude/Plans/PLAN-swipe-noswap-home.md` (PLAN_READY, Charpy FORGE + Loki HELD_STONE).

`Verdict: **FINDINGS (fix-then-ship)**` — the core mechanism is correct and complete, coverage is
genuinely 0-uncaught, the three plan-ambiguities are resolved soundly, the removed mutant's defect is
genuinely dead, and no CI cell overclaims a device paint. Two Minor defects a house-rule-following
reviewer would require corrected before submit: a mutation MISATTRIBUTION (mutant #77 is named for a
cell it does not redden, and the build report overclaims per-mutant verification), and an INCOMPLETE
concept-scrub (three stale `snapshotHome`/`home-snapshot` comments + one dead branch in js/app.js).
Nothing is reachable-and-broken; both fixes are trivial.

---

## The scene, and what it intends

Active `#home` stops being an in-flow document-scroll view and becomes a `position:fixed` own-scroll
box that never leaves the DOM. A `→home` transition un-parks the real fixed `#home` as the incoming
mover and leaves it — no `home-snapshot` clone, no held reveal, no scroll-settle gate. This dissolves
plan-of-record §2.1's constraint E (two in-flow views cannot coexist), which is what forced the
snapshot, and provably removes flash hypothesis (i) (the document-collapse carousel reposition); the
surviving hypothesis (ii) (the parked→translateX(0) transform-clear on `#home`'s own layer) is
device-gated R1(a) and the flash is NOT claimed fixed. The construction enum's `→home` INCOMING flips
`home-snapshot`→`real-destination` with a new `home-host` render; the `browse→home` OUTGOING stays
`real-source` (the real never-hidden `#browse` keeps its covers warm on an abort). The home vertical
scroll re-homes off the document onto `#home.scrollTop` (pull-to-refresh, the custom scrollbar, and the
outgoing app-ghost's source-aware fidelity offset — the Loki KILL). The second commit adds a
pre-commit `.mutbak` gate. The intent matches the plan faithfully.

## The three plan-ambiguities Brunel interpreted — all SOUND

**(a) `#home` z-index:20 — SOUND (no stacking regression in source).** Verified against every
positioned peer in css/app.css: `#browse` is unpositioned (paints in the in-flow block layer, BELOW
any positive-z positioned element); z20 sits above it and below every overlay — `#options` z25,
`#buffering`/`#diagnostics` z26, `.topbar` z30, transport z35, `.navbar` z40, popover z50, NP z60,
sheet z80, bookmenu z85. `.alphaindex` (z24) and `#scrollind` (z34) correctly remain ABOVE `#home`,
which is what the custom scrollbar now needs. The opaque `background: var(--page-bg)` occludes `#browse`
during the two-real-mover filmstrip. The only paint-level residual — whether promoting active `#home`
to a fixed z20 stacking context re-rasters the descendant carousels from empty — is exactly hypothesis
(ii)/R1(a), correctly device-owed. No regression is visible in source.

**(b) `#home` inset/padding geometry — SOUND (mirrors the verified `#options` scroll-box).** `#home`'s
`top: calc(var(--safe-top) + 51px)`, `bottom: calc(var(--nav-h) + var(--nav-pad))`, and the
`body.has-player` `+ 106px` bump are byte-identical to `#options` (css:155-156, 164) and
`#buffering`/`#diagnostics` (css:716-717, 724) — the established, device-verified inset-scroll-box
pattern between the fixed bars. Content is inset between the top/bottom bars with its own
`overflow-y:auto` (+`overscroll-behavior:contain`), so it does NOT clip under the bars; this IS the A2
seating (fixed own-scroll inside the retained css:73 runway). Padding `14px 16px 40px` is content
padding, consistent with the overlay pattern.

**(c) ABORT re-park anchored on `setView`'s `classList.toggle('parked', v!=='home')` — SOUND, and
mutation-verified.** On an aborted `browse→home`, `finalizationPlanFor` emits `abortRender:'none'`
(`'rerender'` is browse→browse-only, swipe.js:186), so finalize reaches app.js:1220 →
`applyScreen(browse-desc, {render:false, resetScroll:false})` → `setView('browse')` → nav.js:57
`$('home').classList.toggle('parked', 'browse'!=='home'=true)` re-parks `#home`, and nav.js:64
un-hides `#browse`. The un-park→transform (drag start: buildConstruction at app.js:529 then the mover
transform at app.js:560) and the transform-clear→re-park (finalize: app.js:780 then applyScreen at
1220) are each synchronous within one task, so there is no intermediate paint where an un-parked
transform-less `#home` flashes over `#browse`. Loki's borrowed-real recovery rests on this re-park and
it holds. Executed: mutant #80 (setView stops re-parking) reddens the ABORT cell (`not ok 3`).

## The removed mutant (`swipe5 F2-r-wiring`) — the defect is genuinely DEAD, removal is SOUND

The mutant guarded that L3 does not synthesize `d.ghostY=0` for a capture legitimately lacking a
`ghostY` (`if ('ghostY' in c.capture) d.ghostY = c.capture.ghostY;`, app.js:544). Post-6i the only
ghostY-less capture — the `home-snapshot` — is deleted; every SURVIVING capture is an app-ghost that
ALWAYS carries `ghostY` (swipe.js:288). So the guarded conditional is now always-true and both mutation
forms (`if (...)` vs `... ? ... : 0`) assign the identical value — no test can distinguish them (the
sweep reported it UNCAUGHT). This is a defect that is genuinely dead by construction (no ghostY-less
capture can exist), NOT reachable-and-now-unguarded. Removing an uncatchable mutant is correct — keeping
it would report a permanent false UNCAUGHT. The class stays covered: `→home` builds `capture===null`
(swipe-construction.test.js:193 asserts it), swipe5 F1c catches "capture set when it must be null", and
both `d.ghostY` readers null-guard (app.js:1098, 1147), so a null `→home` capture cannot leak a stale
`ghostY`. Sound.

## The core mechanism vs plan — faithful

- **L5 source-aware ghost offset (the Loki KILL) — correct.** `ghostApp(fromKind)` reads
  `#home.scrollTop` when `fromKind==='home'`, else `env.scrollY()` (swipe.js:281). Load-bearing check:
  `kindOf('home')` returns `'home'` (swipe.js:55), `classifyTransition` sets `fromKind=kindOf(from.v)`
  (swipe.js:88), and `buildConstruction` destructures `fromKind` and passes it to `ghostApp(fromKind)`
  (swipe.js:314,332) — so the home branch IS reached for home→browse / home→overlay (the rows this plan
  does not otherwise change). Executed: mutant #83 (revert to `window.scrollY`) reddens GHOSTSCROLL
  (`6 pass / 1 fail`). The on-screen zero-jump remains device-owed R1(d) — GHOSTSCROLL asserts only the
  captured offset VALUE (500), never a paint.
- **Scroll re-homing — correct.** Pull-to-refresh reads `$('home').scrollTop` at BOTH the arm
  (app.js:1305) and disarm (app.js:1313) gates; `surfaceKind` recognises `#home` (scrollbar.js:47);
  home entry resets `$('home').scrollTop=0` (nav.js:130). The PTR mutant is correctly two-part (both
  gates) — the plan's noted single-gate revert is uncaught because the disarm gate wins first.
- **Deletions complete + correct.** `snapshotHome` deleted; the `home-snapshot` incoming branch removed
  from buildConstruction; the whole 6h `→home` scroll-settle gate removed (no dangling `SETTLE_MS` /
  `scrollSettle` / `revealScrollEnd` / `revealSettleTimer` / `settled` / `settleVia` in `js/*.js` —
  grep clean, only narrative comments remain); `holdGhostUntilPaintable(rootEl, cover)` reverts to
  `decoded && painted`, sole caller abort→browse (app.js:1200).
- **The 2-row `→home` enum change + lockstep — correct.** constructionPlanFor emits
  `{incoming:'real-destination', renderDestination:'home-host'}` for `→home`, outgoing unchanged
  `real-source` (swipe.js:149-156); frozen spec rows 58/61 match (swipe-plan-spec.mjs); the oracle
  (swipe-transition.test.js) reconciles production against the spec (13/13); the generated model +
  matrix + dependent suites are re-pointed. `home-snapshot` has left the value domain.
- **`paneKindOf(→home)` → `'none'` — behaviourally correct** (no owned-pane movers on `→home`, so
  `p.length===0` returns 'none' before the ternary), BUT its comment and the `'snapshot'` arm are now
  dead — see Finding 2.

## The `.mutbak` gate — ROBUST, and it proved itself this pass

`findMutbaks` (no-mutbak-check.mjs) walks the whole tree with an explicit stack (deep-tree safe),
skips `node_modules`/`.git` by name at every level, and matches `endsWith('.mutbak')`. The
case-sensitivity of that match is a NON-issue: `bakOf = (f) => f + '.mutbak'` (mutate.mjs:15) always
writes lowercase, and Windows is case-insensitive at the filesystem anyway — so no real `.mutbak` can
be missed by casing. Nested dirs are walked; a `.mutbak` in an excluded dir is correctly ignored
(mutate.mjs never writes there). It is wired FIRST in run-checks.mjs (`defaultSteps()[0]`, ahead of
stamp/lint/typecheck/tests) so an interrupted-sweep state is un-committable before any time is spent.
`isCli` correctly suppresses `process.exit` on import. The regression test asserts findMutbaks both
ways, the real CLI's clean-exit(0), and the wired-first ordering — with real, fail-able assertions.
**Live proof:** an unbounded `mutation-sweep` I triggered this pass left `js/app.js.mutbak`; the gate
flagged it (`exit=1`, named the file) and `node tools/mutate.mjs --restore` cleaned it. (Observation 5:
the CLI's own exit-1 branch is exercised only by an inline reimplementation, not the real
`if(isCli){…process.exit(1)}` — a minor test-fidelity gap, low risk.)

## Findings

| # | Severity | Where | Finding | Fix |
|---|---|---|---|---|
| 1 | Minor | `tools/mutate.mjs` #77; build log "Mutations" | **Mutation misattribution + overclaim.** Mutant #77 ("stage6i SNAPSHOTGONE … (-> SNAPSHOTGONE test)") is runtime-INERT — buildConstruction branches on `plan.renderDestination` and never reads `plan.incoming`, and both `'none'` and `'home-host'` hit the same else-branch — so it does NOT redden the SNAPSHOTGONE cell (verified: stage6i `7 pass/0 fail` under #77). It is caught by the independent oracle `test/swipe-transition.test.js` (verified: `13→12/1`). The SNAPSHOTGONE integration cell is separately guarded by #78 (verified: reddens SNAPSHOTGONE). Coverage is NOT short (0-uncaught holds), but the registry names the wrong intended-failing-test (EC §4.10) and the build's "Each new mutant confirmed to redden its DESIGNATED cell (verified per-mutant)" is a false claim for #77. Plan §10's SNAPSHOTGONE mutation prose ("a snapshot pane is built over #home") is causally impossible post-retirement. | Re-point #77's name/attribution to the oracle (swipe-transition), or reframe it as a contract-value mutant; correct the per-mutant verification claim. |
| 2 | Minor | js/app.js:366, 541-542, 752-755 (+759) | **Incomplete concept-scrub (StandardsDocument §6.6/§7).** Three comments still describe the deleted `snapshotHome`/`home-snapshot` as present: :366 "the two capture recipes (ghostApp/snapshotHome)" (now one); :541-542 "A home snapshot has no ghostY, so … 'no ghost ⇒ d.ghostY untouched' holds" (no home snapshot exists; the invariant now holds because `→home` builds NO capture); :752-755 "The owned panes are the app-ghost … and the home snapshot (→home)". At :759 the `cur.dest.v==='home' ? 'snapshot' : 'ghost'` arm is now DEAD (no `→home` transition has an owned pane). The paneKindOf comment is actively misleading about control flow. (Plan §12 dispositioned paneKindOf's RETURN as moot/correct — but not the comment or the dead arm.) | Update the three comments to current truth; simplify or comment the dead `'snapshot'` arm. |

## Observations (non-blocking)

- **[O3] `plan.incoming` is now single-valued and production-unread.** Post-6i buildConstruction never
  reads `plan.incoming`; every spec row is `incoming:'real-destination'`. It survives only as an
  oracle-asserted contract field. This is WITHIN the project's established policy — constructionPlanFor
  is an exact-key-gated contract, exempt from the dead-return-field guard — and plan §4 deliberately
  preserved the object shape. Candidate for a future contract simplification; not a defect.
- **[O4] Vestigial `if/else` in buildConstruction incoming (swipe.js:341-347).** Both arms call
  `env.renderDestination(dest, destinationHost)` and wrap it in an identical borrowed-real mover; the
  branch differs only by a comment. Collapsible to one line. Harmless.
- **[O5] no-mutbak CLI exit-1 branch not directly exercised** by the committed test (an inline probe
  reimplements the exit logic). Low risk; the build-time manual proof covered it.

## No CI cell overclaims a device outcome — CONFIRMED

Read every stage6i assertion: SNAPSHOTGONE/ABORT assert DOM state (pane count, `.parked`, `hidden`,
inline-transform presence, restored scroll value); SCOPE asserts the timer-queue + held-session; PTR
asserts the handler arm state; SCROLLBAR asserts `surfaceKind`'s return; GHOSTSCROLL asserts the
captured offset VALUE (500), explicitly not the on-screen jump; HOMEFIXED is a source-text assertion.
None reads a paint/rAF flash proxy. The build's "Device-owed (NOT built here, NOT claimed)" section
correctly lists R1(a-e) as device-only and states the CI cells assert source/branch, not paint. No
overclaim.

## Coverage Ledger

`✓` = cleared by EXECUTED evidence this pass (commands in "Executed evidence"); `~` = cleared by
reading/reasoning; `n/a`.

| Row (changed symbol / region) | Correctness / data-flow | Ownership / lifetime (§4.3-4.5) | Async / stale (§4.6) | Assert-both-sides (§4.7) | Scrub / dead-code (§6.6/§4.15) | Mutation-verified (§4.10) | Device-overclaim | Suite / gates |
|---|---|---|---|---|---|---|---|---|
| `constructionPlanFor` →home enum (swipe.js:149-158) | ✓ | n/a | n/a | ~ | ✓ (home-snapshot gone from domain) | ✓ (#77 via oracle — **misattributed, Finding 1**) | n/a | ✓ |
| `ghostApp(fromKind)` offset source (swipe.js:273-288) | ✓ | ~ | n/a | n/a | ~ | ✓ (#83 reddens GHOSTSCROLL) | ✓ (offset value only) | ✓ |
| `buildConstruction` incoming branch (swipe.js:328-347) | ✓ | ✓ (borrowed-real both movers on →home) | n/a | n/a | ~ (vestigial if/else, O4) | ✓ (#78) | n/a | ✓ |
| `snapshotHome` DELETED (swipe.js) | ✓ | ✓ (owned-pane recipe retired) | n/a | n/a | ~ (stale comments remain, **Finding 2**) | ✓ (F2-r/F2-r-wiring removed, defect dead) | n/a | ✓ |
| `env.renderDestination` home-host (app.js:514) | ✓ | ✓ (un-park only, no #browse hide) | n/a | ~ | clear | ✓ (#78 SNAPSHOTGONE) | n/a | ✓ |
| `holdGhostUntilPaintable` 6h-gate deleted (app.js:815-885) | ✓ | ✓ (settle handles leave cur-owned set) | ✓ (no →home scrollend/settle to fire late) | ✓ (SCOPE both sides) | ✓ (no dangling refs — grep) | ✓ (SCOPE cell) | ✓ | ✓ |
| commit→home held-reveal branch deleted (app.js:1181) | ✓ | ✓ (no held session on →home) | ✓ | ~ | clear | ✓ (SCOPE reddens on reinstate) | n/a | ✓ |
| `paneKindOf` (app.js:756-760) | ✓ (returns 'none' on →home) | n/a | n/a | n/a | finding (Minor — dead 'snapshot' arm + stale comment, **Finding 2**) | ~ | n/a | ✓ |
| pull-to-refresh #home.scrollTop (app.js:1305,1313) | ✓ | n/a | n/a | n/a | clear | ✓ (#PTR two-part) | n/a | ✓ |
| `setView` home-tall retired / re-park (nav.js:57,78-83) | ✓ | n/a | n/a | ✓ (ABORT re-park both sides) | ✓ (home-tall gone) | ✓ (#80 reddens ABORT) | n/a | ✓ |
| `applyScreen` scrollTo→#home.scrollTop (nav.js:130) | ✓ | n/a | n/a | n/a | clear | ~ | n/a | ✓ |
| `surfaceKind` 'home' (scrollbar.js:47) | ✓ | n/a | n/a | n/a | clear | ✓ (SCROLLBAR cell) | n/a | ✓ |
| `#home` fixed own-scroll rule (css:108-133) | ~ (z-order + geometry read vs peers) | n/a | n/a | n/a | ✓ (home-tall .app deleted) | ✓ (#84 HOMEFIXED) | ✓ (raster = device R1a) | ✓ |
| swipe-plan-spec rows 58/61 + generated (fixtures/docs) | ✓ | n/a | n/a | n/a | ✓ (header scrubbed) | ✓ (oracle) | n/a | ✓ |
| `no-mutbak-check.mjs` findMutbaks + CLI (new) | ✓ | n/a | n/a | ~ | n/a | ~ (self-proved live this pass) | n/a | ✓ |
| `run-checks.mjs` no-mutbak wired first | ✓ | n/a | n/a | ~ | n/a | ~ | n/a | ✓ |
| `no-mutbak-gate.test.js` (new, 3 cells) | ✓ | n/a | n/a | ✓ (present/absent both ways) | n/a | n/a (O5) | n/a | ✓ |
| build stamps (index.html/sw.js/debug.js/build.json ×2) | ✓ (261→262→263 uniform) | n/a | n/a | n/a | n/a | n/a | n/a | ✓ |
| deleted swipe-stage6h.test.js + re-pointed suites | ~ | n/a | n/a | n/a | ✓ (subject removed) | n/a | n/a | ✓ |

No empty cells.

## Executed evidence (backs every `✓`)

- `node --test test/swipe-stage6i.test.js` → 7 pass / 0 fail (HEAD).
- `node --test test/{no-mutbak-gate,mutation-anchors,policy-ledger-gate,swipe-construction,transition-matrix,contract-function-gate,swipe-stage5-wiring,swipe-stage6e}.test.js` → all pass, 0 fail (mutation-anchors 2/2 confirms every rewritten mutation FROM-string matches source — no no-op mutants).
- `node --test "test/*.test.js"` → 740 tests / 739 pass / 0 fail / 1 skip (the device-only KEEPER).
- `node --test test/swipe-transition.test.js` → 13/13 (HEAD).
- Isolation (apply one via `node tools/mutate.mjs <n> --apply`, run the cell, `--restore`):
  - #83 GHOSTSCROLL → swipe-stage6i `6 pass / 1 fail` (GHOSTSCROLL reddens).
  - #80 ABORT → swipe-stage6i `not ok 3` ABORT (reddens).
  - #78 home-host → swipe-stage6i `5 pass / 2 fail` (SNAPSHOTGONE + ABORT redden — SNAPSHOTGONE's real guard).
  - #77 → swipe-stage6i `7/0`, swipe-construction `12/0`, contract-function-gate/transition-matrix/descriptor-coverage-gate/swipe-model/swipe-stage6e/swipe-stage6 all `0 fail`, but swipe-transition `12/1` — caught ONLY by the oracle (Finding 1).
- `node tools/hooks/no-mutbak-check.mjs` → correctly `exit=1` on a live interrupted-sweep `.mutbak`, `exit=0` after `--restore`. Tree left clean (`git status --porcelain` empty).
- Grep `SETTLE_MS|scrollSettle|revealScrollEnd|revealSettleTimer|settleVia|snapshotHome|home-snapshot|home-tall` in `js/*.js` → only narrative comments remain, no code refs.
- Read: css z-index peers (55-734), `#home`/`#options` geometry, nav.js setView/applyScreen, app.js finalize/abort (1180-1264), mover positioning (525-561), `env.renderDestination` (511-520), `plan.incoming` readers (none in production).

## Prediction

The build is behaviourally sound and its coverage is genuinely complete; the two findings are accuracy
debts, not time bombs — but each is the kind that compounds. The mutation misattribution (Finding 1) is
the more insidious: the next mutation audit will read "#77 → SNAPSHOTGONE", trust it, and never learn
that SNAPSHOTGONE's true guard is #78 — so if a later refactor deletes #78, the SNAPSHOTGONE cell
silently loses its only guarding mutation while #77 keeps the ledger looking green (caught elsewhere).
That is precisely how a vacuous cell survives an audit. The stale `snapshotHome` comments (Finding 2)
will, at the next `→home` touch, send a reader looking for a snapshot builder that no longer exists —
the same cost §6.6's scrub exists to prevent. The real risk this build carries is NOT in its findings;
it is R1(a): the design removed hypothesis (i) by construction but leaves (ii) — the parked→translateX(0)
transform-clear on `#home`'s own `will-change` layer — live, and the flash is not fixed until the
device says so. The build discloses this honestly and claims nothing. The wrapper/ancestor-slide is the
buildable next lever if R1(a) reddens.

## Watch-list

- **[W1] open** — 6b records reconciliation un-applied in HEAD. Owner Zelda. Carried.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device strike. Carried.
- **[W4] open** — 6c apply-on-approval records (incl. the js/app.js classifier comment stale text). Owner Zelda. Carried.
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
- **[W18] open** — 6h apply-on-approval records (DecisionLog NEW-POLICY entry, Subsystems/swipe-reveal.md note, PLAN-swipe-reveal.md §7, Linnaeus/PROBE-scroll-clamp-reveal.md pointer). Owner Zelda. Carried.
- **[W19] resolved: mooted** — 6h commit→home scroll-settle device repro. The 6h gate is DELETED in 6i (its subject reflow no longer occurs under a fixed `#home`); the device question is superseded by W22 (R1(a)). No longer a live device gate.
- **[W20] resolved: mooted** — `SETTLE_SCROLL_MIN` mid-session staleness. The whole SETTLE machinery is deleted in 6i; the concern no longer has a subject.
- **[W21] open** — a fresh Loki strike against the BUILT 6i code remains the plan's next gate; this review did not re-run Loki. The Loki KILL #2 (browse→home outgoing stays real-source) and the L5 KILL are built as directed and CI-guarded at the source branch, but the on-screen consequences are R1(d)/R1(e). Owner Loki.
- **[W22] open (NEW)** — R1(a) is the flash verdict and is UNCLOSED: fixed `#home` removes hypothesis (i) by construction but hypothesis (ii) (parked→translateX(0) transform-clear on `#home`'s own `will-change` layer re-rasters the descendant carousels) SURVIVES the design. The flash is NOT fixed until R1(a) is device-clean on the scrolled browse→home 60fps repro. In-scope fallback: the wrapper/ancestor slide. Owner on-device strike.
- **[W23] open (NEW)** — R1(b) bar-seating under the fixed own-scroll `#home` (the `.28`/`.30` displacement risk), including NP-over-home and Options-over-home base cases, across scroll + rotation. A2 (retain the css:73 runway) is stable-by-construction but device-owed. Owner on-device strike.
- **[W24] open (NEW)** — R1(c) nested vertical-`#home`/horizontal-carousel momentum coherence + the A2 phantom document double-scroll (mitigated by `overscroll-behavior:contain`, device-check). Owner on-device strike.
- **[W25] open (NEW)** — R1(d) the L5 on-screen zero-jump (device paint jsdom cannot see); R1(e) the browse→home abort cover-warmth + no-`#browse`-demote (conceded not asserted, behavior-preserving vs HEAD). Both verified on the scrolled home→books / browse→home repros. Owner on-device strike.
- **[W26] open (NEW)** — 6i apply-on-approval records (plan §13): amend plan-of-record §2.1/§2.4 (the §2.1 overturn — `#home` joins the fixed-own-scroll class); annotate `PROBE-swap-necessity` (constraint E omitted) + `PROBE-home-scroll-surface` D1 (dynamic Downloads carousel) + D2 (seam-laundered consumer); scrub subsystem 6g `translateZ(0)`→`will-change`; note §2.3's pre-6f branch; build-number bump landed. Owner Zelda.
- **[W27] open (NEW)** — Finding 1: mutant #77 is misattributed to SNAPSHOTGONE (it is caught by the oracle swipe-transition; SNAPSHOTGONE's true guard is #78). Owner Brunel (fix), then Mendeleev (the coverage-audit consequence: a cell whose named guard does not guard it is the vacuous-cell shape). Carried until the registry attribution is corrected.
- **[W28] open (NEW)** — Finding 2: incomplete concept-scrub — stale `snapshotHome`/`home-snapshot` comments (js/app.js:366, 541-542, 752-755) + dead `paneKindOf` 'snapshot' arm (:759). Owner Brunel. Carried until scrubbed.
- **[W29] open (NEW)** — O3: `plan.incoming` is now single-valued/production-unread (oracle-asserted contract field only). Candidate contract simplification; within current dead-return policy. Owner Vitruvius (design), non-blocking.

---

Verdict: **FINDINGS**

{"persona":"poirot","stage":"6i","verdict":"FINDINGS","target":"b8df043","range":"e21b4c6~1..b8df043","findings":[{"id":1,"sev":"minor","where":"tools/mutate.mjs#77 + build log","what":"mutation misattribution + per-mutant overclaim: #77 is caught by the oracle swipe-transition, not its named SNAPSHOTGONE cell (that cell is guarded by #78); coverage is 0-uncaught but the attribution and the report claim are wrong"},{"id":2,"sev":"minor","where":"js/app.js:366,541-542,752-755,759","what":"incomplete concept-scrub (StandardsDocument §6.6): three stale snapshotHome/home-snapshot comments + a dead paneKindOf 'snapshot' arm"}],"ambiguities":{"z_index":"sound","geometry":"sound","abort_reparft":"sound"},"removed_mutant_F2r_wiring":"sound-defect-dead","ci_device_overclaim":"none","loki_restrike_needed":true,"return_to":"brunel"}
