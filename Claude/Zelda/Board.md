# TomeRoam — Board (Zelda) · living tactical state

The single home of **tactical state**: what's in flight, what's shipped-unverified, what's
open, what's next. Update the SAME turn state changes. Derive the build from
`js/debug.js` / `build.json` — never a number written here.

**Division — do not duplicate (each fact has one home):**
- Settled decisions → `Claude/Decisions/DecisionLog.md`
- Code reviews → `Claude/Poirot/`
- Plans → `Claude/Plans/`
- Durable process lessons + read-index → cross-session memory (`tomeroam-status-board`)
- Deep per-bug diagnostics → the per-bug memory sagas (linked below)

This board **points** to those for depth; it never restates them. They point back here for
tactical state instead of keeping their own copy.

---

## ⛔⛔ Standing priority — real-device verification is OUTSTANDING
The whole `.164`+ durable-arbitration arc and the `.178`+ swipe work are **shipped-unverified**.
`test/DEVICE_VERIFICATION_CROSSDEVICE.md` (12 scenarios) has never been run. The device
bug-report log is the verdict, not local assertion. Do NOT mix new fixes into a verification
session. ⚠️ A new external review does NOT silently supersede this hold — if a new order
conflicts with it, ASK which wins; don't resolve toward coding because coding is the available move.

## ⛔ Active work — swipe/reveal rewrite (staged, review-per-stage)
Stage 4's between-stages review is **CLOSED** — the `.227` Poirot casebook
(`Claude/Poirot/14257f2-swipe-stage4-classify-construct.md`) was processed in build **`.228`**:
findings F1/F3/F4/F5/F6/F7 fixed (each red-first + mutation-verified), F2/F8 filed as records,
nothing deferred. **`.229`** then corrected F8 to conform to the new Engineering Contract item 17:
`classifyTransition` now emits only current-slice fields `{fromKind,toKind,decorations}` — the three
unconsumed `§3.3` host fields were removed (reintroduced each when first consumed), guarded by an
exact-key test. **`.230`** then closed the `.228` review (`Claude/Poirot/f3ddd77-…`, which an
independent second pass had corrected with 3 gaps): F-i `constructionPlanFor` independently
deep-immutable (clone+freeze at its own boundary), F-ii §4.3 enumeration completed (identical-object
`d→d`, independently-allocated-equal, `files(A)→files(A)`), F-iii swipe.js header corrected. Watch-list
now: W13/W14/W15 CLOSED (.230); W10 MOOT (.229 removed the host fields); W12 satisfied (suite ran, 636
pass, mutations verified); W11 (O1, low) stays OPEN (W8 stage-5 scope RESOLVED 2026-07-22 — scope B ratified). Disposition + stage-4 scope
decisions + stage-6 cleanup debt are all in DecisionLog. **`.234`** then closed the `.233` review
(`Claude/Poirot/90a139c-swipe-stage4-contract-gates.md`, verdict fix-then-ship): the
`mutation-sweep.mjs --affected` selector's four false-clean cases (F-cf1 rename source dropped, F-cf2
new file in a new untracked dir missed, F-cf3 odd-char names escaped / false comment, F-cf4 no selector
tests) are fixed by parsing `git status --porcelain=v1 -z --untracked-files=all` + a new selector test
set — each reproduced with real git and mutation-verified. **`.235`** then fixed **F-y**, a
worktree-column (Y=R, from `mv`+`git add -N`) rename false-clean that `.234` left — the X-only parser
dropped the rename source. Found by an external re-review (ChatGPT), MISSED by this project's own
re-review (`Claude/Poirot/009dbc9-selector-fix-rereview.md`); red-first regression added, both columns
now handled. Watch-list W17 + W19 CLOSED (.235); W11 (O1, low) stays OPEN (W8 stage-5 scope RESOLVED 2026-07-22). Also this
session: Poirot's coverage-ledger clear mark split into `✓` (executed, command cited) vs `~` (reasoned,
unverified), gate-enforced — the durable fix for the `✓`-on-reasoning miss (see DecisionLog). **`.236`**
sharded the CI mutation-sweep 8 ways (`--shard=I/N`, partitioned) — ~13 min → ~2 min, still every-push.

**Stage 5 is RATIFIED — cleared to build (2026-07-22, scope B).** `Claude/Plans/PLAN-swipe-stage5.md` is
APPROVED after Charpy rounds 1–2 (`Claude/Charpy/PLAN-swipe-stage5-2026-07-22.md` + `-r2.md`): round-1's
seven blockers (F1/F2/F4/F5/F6/F7/F8) + F3 and round-2's residuals (F1-r host-field projection +
frozen-spec value coverage; F2-r app-ghost-only `ghostY?`; F3-r narrower `env.renderDestination` signature)
are all resolved. **Scope B:** `buildConstruction(from, dest, env)` derives classification internally and
returns `{classification, plan, movers, capture, sourceWasClobbered}` [return since narrowed to FOUR keys
— `classification` dropped 2026-07-23, see the F1 item below], never the session `d`; the two
capture recipes + real `overlayEl`/`appViewEl` source resolution + the NP decoration builder move to
`swipe.js` behind the injected `env`, while the destination render dispatch and the Browse hold stay in
app.js until stages 6/7. The four ex-OPEN decisions (F0 scope→B, F1 seam, F3 hosts CARRIED and read by
`buildConstruction`, F6 pane `release()`/`dispose()`/`equivalence` deferred to stage 6) are SETTLED in
DecisionLog, and the three conflicting records (PLAN-swipe-reveal.md §7 step 5, the swipe.js header
lines 24–27, DecisionLog) are reconciled to B.

**Stage 5 BUILT to green (Brunel, build `.239`, 2026-07-23) — shipped-unverified, awaiting review.**
`Swipe.buildConstruction(from, dest, env)` added to `js/swipe.js`: the two capture recipes
(ghostApp/snapshotHome) + their helper cluster + the NP decoration builder relocated from `start()`
behind the injected `env`, reading the world only through it (no ambient DOM). `classifyTransition`
re-emits `sourceHost`/`destinationHost` with the fixed projection. `start()` is now the L3 adapter (env
build with the render dispatch as `env.renderDestination`; maps external movers → production
`{el,base,own}`; records capture/`clobbered`; outgoing-NP np-locked unlock). All 14 red-first `{ todo }`
markers green; `buildConstruction` registered NON_CONTRACT + `classifyTransition` flipped to the 5-key
set in both gate sites + the two PolicyLedger known-reds removed — atomically. F1b/F5b/F5c/F2-r-wiring/
F7b wiring guards added (`test/swipe-stage5-wiring.test.js`); the §8 mutations registered and each
verified to redden its test. Parity only — no behaviour change; the flash bug is untouched.
`docs/swipe-model.generated.txt` regenerated (line refs only). Build log →
`Claude/Brunel/swipe-stage5-build-2026-07-23.md`. Full suite: 680 tests, 0 fail, 2 todo (the pre-existing
KR-swipe-scroll-restore / -source-rerender). **Loki R2 still routed:** `test/swipe-invariants.test.js` is
the affected parity guard the plan §8 does not enumerate. **Poirot review: FIX-THEN-SHIP** (2026-07-23,
casebook `Claude/Poirot/6bf0d20-swipe-stage5-buildconstruction.md`). Runtime PARITY verified (full suite
680/0-fail, §8 mutation sweep 0-uncaught/19-swept, host projection executed for all 8 cases, cold-read
adversary no defects). **F1 (Significant, external review credit): `Construction.classification` is a DEAD
returned field** — no `start()` consumer reads it, violating the no-dead-fields rule the commit itself
invokes to withhold `sameBrowseHost`. This seat MISSED it (cleared "field-value-used-internally" ≠
"returned-field-has-a-consumer"); the original SHIP was wrong. **Durably gated for the CLASS** (`.240`
detector + `.241` widened): `tools/dead-return-fields.mjs` + `test/construction-consumers.test.js` — a
DRIFT GUARD riding the contract-gate meta-inventory (every object-returning NON_CONTRACT swipe seam must
be dead-field-registered, so stage-6's `finalizationPlanFor`/`planFor` can't escape) + hard gate +
known-red (PolicyLedger `KR-swipe-construction-dead-classification`); proven fail-on-defect,
pass-on-correct, catches-a-new-seam; residual = destructuring-consumed seams (concrete false-positive shown). Also
O1 (GHOST_BG per-gesture, plan-disclosed), O2/W11 (unwrapped throw), O5 (eager GHOST_BG, minor).
**F1 DECIDED (Vitruvius, 2026-07-23) — DROP `classification` (decision 1).** The `buildConstruction`
return narrows five keys → four `{ plan, movers, capture, sourceWasClobbered }`; reproduced 3 ways (grep
empty, L3 reads none of it, detector reports it); L3 has no render-mode/host need, so consuming it (dec. 2)
would be an invented read EC §17 forbids; `plan` stays (L3 reads `plan.decorations`). §3 + DecisionLog +
this board updated; §4 ledger already agreed (no return-row). **Next:** Charpy stresses the revised §3 →
Curie reconciles `CONSTRUCTION_KEYS` (`test/swipe-construction.test.js`) → Brunel makes the narrow code
change (on his commit the detector goes zero-dead, the known-red flips green, and
`KR-swipe-construction-dead-classification` + its `TRACKED_OPEN` entry are removed). Passes the wired
`vitruvius-plan-gate.sh` (exit 0, node-validated) — added `vitruvius-contract`/`-effects`/`-coverage`
blocks + disambiguated 3 multi-owner ledger rows. **Charpy r5 (2026-07-24) = TEMPER, RESOLVED:** (F1) the
return still carried a dead NESTED member — `plan.outgoing`/`incoming`/`renderDestination` were dead on the
return (only `plan.decorations` read by L3), same class as `classification` one level down. Fixed: hoist
`decorations` to top level, DROP the `plan` wrapper → return is `{ decorations, movers, capture,
sourceWasClobbered }`. (I owned this miss — I'd declined to narrow `plan` earlier as "gold-plating.") (F2)
the `vitruvius-coverage` `parking` row claimed a mutation the §8 prose calls parity-only/unobservable →
corrected to an honest `n/a — parity-only`. **Charpy r7 (2026-07-24) = TEMPER, RESOLVED:** (F1) sibling-
sweep miss — §3 said `c.decorations` but §2/§5 still instructed `plan.decorations` (abolished wrapper);
scrubbed both. (F2) the returned decoration carried a dead LEAF `role` (`{kind,role,base}` from
constructionPlanFor; L3 reads only kind/base) → the plan now projects `decorations` to `{kind,base}`,
stripping `role`. (F3) contract↔ledger reconciliation — reconciled `sourceWasClobbered`↔the clobber ledger
row (renamed + reclassed `boolean` to match by name+class); the flat-format limit (no qualified names, can't
distinguish two same-named fields) was VERIFIED against the gate and ROUTED as maker-owned gate-format work,
not written as unparseable syntax. Gate re-passes (exit 0). **Charpy r8 (2026-07-24) = TEMPER, RESOLVED:** my r7 F2 and F3 fixes contradicted
each other — the F3 justification claimed `classifyTransition.decorations` and `Construction.decorations`
are "the SAME value" (a divergence being "a future case"), but F2 projects the return to `{kind,base}` while
classifyTransition stays `{kind,role,base}` — they diverge in SHAPE NOW. Risk: a builder trusting "same
value/hoisted" hoists unchanged and re-adds the `role` leaf. Fixed the justification (the single flat row is
CLASS-accurate — both `object` — not shape-identical; the shape divergence is present, carried by prose + the
`{kind,base}` return type; scoped/shape-level representation is the routed maker gate-format work), and swept
sibling "hoisted" phrasings (status line + §3) to say "projected, never hoisted unchanged." Gate re-passes.
⚠️ Two routed maker-owned items (NOT built): nested-dead-return detector deepening; authoring-gate
qualified-name/reconciliation support. **Next: returns to the Stage-5 Charpy session (deliver only when the
user asks).** Fork-slowness: gate ~2-3min/run on this box; run it backgrounded. **Mendeleev** still
audits §8 incl. O3 (F5a payload), O4 (F1a L3-key), Loki R2 (`swipe-invariants` confirmed a genuine guard,
reddened by mutation #30). ⚠️ NOT folded into a real-device verification session (the standing hold applies).

**Stage 5 BUILT GREEN (2026-07-25) — bench only, not yet pushed/deployed.** `Swipe.buildConstruction` now
returns the four-key `{ decorations, movers, capture, sourceWasClobbered }`: `classification` is
derived+consumed internally (not returned), the `plan` wrapper is dropped, and `decorations` is hoisted +
projected to `{kind,base}`. Sole L3 consumer updated (`start()` reads `c.decorations`);
`docs/swipe-model.generated.txt` regenerated. Red-first: Curie reddened `test/swipe-construction.test.js`
(five→four keys) before the code change (`Claude/Curie/RED-swipe-stage5.md`); Brunel greened it
(`Claude/Brunel/swipe-stage5-buildconstruction-green.md`). **`KR-swipe-construction-dead-classification`
RETIRED** — detector reports zero dead fields, so its PolicyLedger entry + `{todo}` known-red +
`TRACKED_OPEN` allowlist are gone; the HARD GATE now asserts zero dead returned fields on
`buildConstruction` unconditionally. Charpy r1–r9 casebooks committed (`f6d6985`); plan FORGE at r9. Full
suite 683 / 0-fail / 2-todo (unrelated scroll-restore + source-rerender). ⚠️ On-device verification still
owed. Ratified §8 Mendeleev audit + Loki R2 remain pending as before.

**Stage 5 SCHEME-COMPLETE (2026-07-25) — bench, not pushed.** Poirot SHIP on `0049a13`
(`Claude/Poirot/0049a13-swipe-stage5-buildconstruction.md`, return_to none, verified by execution); Mendeleev
ADEQUATE (`Claude/Mendeleev/AUDIT-swipe-stage5.md`) — every in-scope Coverage Model cell proven by concrete
tests, the two contract cells NEW red-first, the no-dead-returned-field invariant now unconditional +
non-vacuous. Deploy/push DEFERRED — pending a user deploy decision. (On-device verification is DOWNSTREAM of a push,
not a gate on it: the device receives web builds only via OTA from GitHub Pages, so a build must be pushed
before it can be tested on-device.) **Stage-5 residual coverage — CLOSED 2026-07-26 (backfilled green, no latent bug; had been out of scope for 0049a13):** (F5a) no test asserts the full `dest`
payload reaches `env.renderDestination`/`showAppView` intact (only `v`); (F1a L3-half) `toMover`'s
`{el,base,own}` key-completeness is unpinned (a dropped `own` is uncaught; F1b pins only the `base` value);
(npLock, N1) no test asserts `document.body` loses `np-locked` on an NP-source swipe — the runtime effect
this `c.decorations` consumer edit exists to preserve. (N2) §7 comment scrub owed at
`test/swipe-invariants.test.js:97-105` (claims the pill test proves `start()` consumes decorations — an L1
effect since the relocation). ✅ **ALL CLOSED (build `2026-07-26.248`):** F5a / F1a-L3 / npLock authored
as live regression guards in `test/swipe-stage5-residuals.test.js` (each reds on a targeted mutation); Curie
found NO latent bug — the audit's predicted device failure shapes (empty drilled-in page from a dropped
payload; wrong-pane teardown from a dropped `own`) are correct on HEAD and now guarded. N2 comment corrected.

**Git-env boundary hardening — LANDED (build `2026-07-26.249`).** `tools/hooks/run-checks.mjs` now strips
git's location env vars ONCE at the runner boundary (`stripGitLocationEnv(process.env)` before any git read
or child spawn), so no future git-shelling test can reintroduce the ambient-GIT_DIR corruption by forgetting
per-call `cleanGitEnv` — the structural belt to that per-call suspender. Guarded by a self-validating gate
(`test/run-checks-strips-git-env.test.js`: CONTROL corrupts an ambient repo, TREATMENT through the boundary
stays pristine). Done in the task-chip session (branch `claude/pensive-faraday-0d5932`, Poirot SHIP), grafted
onto main (branch was pre-Stage-6a-stale; only the two boundary files + records taken). The stale branch +
`origin/claude/pensive-faraday-0d5932` are now redundant — safe to delete.

**Stage 6b SCHEME-COMPLETE (2026-07-26) — bench, not pushed.** Async-handle ownership (RELEASE half):
settle()'s finalize/reveal path session-owns + retires the 340ms settle fallback (`cur.settleTimer`), the
reveal double-`rAF` (`cur.revealFrames`, a two-id handle always naming the currently-pending frame), and the
600ms reveal safety-net (`cur.revealTimer`) at one resolver each — no loser leaks the scheduler queue. Ran
under full automation: Vitruvius→Charpy (r1/r2 TEMPER on vacuous coverage cells, r3 FORGE, **Loki KILL** on
the one-id double-`rAF` inner-frame leak → two-id fix → r4 FORGE), a fresh **Loki HELD_STONE** on the two-id
promise (10 interleavings), Curie red-first (DF + RR a/b/c via a per-id delta oracle, never emptiness; RR(b)
half-fired = the discriminator), Brunel green, **Poirot PASS**, **Mendeleev ADEQUATE**. §10 records scrub
done (subsystem §8/§21 + parent §7 step 6 reconciled; no known-red this slice). Completion gate 6/6 (caught +
fixed a manifest glob mismatch — the value of the gate). Build `2026-07-26.250`; **not pushed — on-device
owed**. **Deferred to 6c/7** (PLAN-swipe-stage6b.md §11): the I12 null-half (finishing-gate + I12
enforcement), finalizationPlanFor/`sameBrowseHost`/pane-lifecycle, and the **I10 reveal centralization** —
the one that fixes the headline aborted-swipe flash bug.

**Stage 6c SCHEME-COMPLETE (2026-07-26) — bench, not pushed.** Pane-LESS supersession + settle-phase identity
guard (Option A, ownership half). begin()'s finishing gate narrowed to the negative form so a live pane-less
session (overlay-involving set) is supersedable; `cur === session` guard on the settle rAF + before finalize's
try/finally makes a superseded session's stale settle-phase continuation no-op on the successor; recovery
clears `finishing` on every exit (never-arming tap no longer wedges). Ran under full automation with real
teeth: an ESCALATION (I12 vacuous under the standing gate → user chose Option A → clean A/B split) → Charpy
r1/r2 TEMPER (coverage vacuity, gate form) → **Loki KILL** (mis-enumerated pane-less DOMAIN — home↔browse is
pane-OWNING per the frozen spec) → re-enumerate → Charpy r4 FORGE → **Loki HELD_STONE** (90 checks) → Curie
red-first → Brunel green (one bench catch: a stuck-mutation artifact from an interrupted sweep, restored) →
**Poirot PASS** → **Mendeleev ADEQUATE**. Completion gate 6/6 (caught + fixed a manifest glob). §10 scrub done
(subsystem §8/§21, parent §7 step 6, app.js:722 false comment). Build `2026-07-26.251`; not pushed — on-device
owed (guard-absorbed / resource-plane). **Deferred to 6d/7:** PANE-OWNING supersession (home↔browse, →home —
the flash surface), null-writes/listener (I12), and the I10/I17 reveal centralization (headline flash bug).
Review/audit seats ran on Opus 5.0 per the user's 5.0 directive.

**Stage 6d SCHEME-COMPLETE (2026-07-27) — build target `9027daf`.** Slice chosen ON THE MERITS by dependency
(D-before-F), NOT aimed at the flash to placate: retired the runtime `clobbered`/`sourceWasClobbered`
byproduct (a build-time DOM-identity check stored on the session) for a pure, deep-frozen, throws-on-unhandled-kind
`Swipe.finalizationPlanFor(c).abortRender` — the first declared field of the rich §3.3 `planFor()`, computed at
ARM time as `cur.finPlan`. Byte-parity extraction (EC §4.19, no PolicyLedger entry); three read sites redirected,
the begin() recovery reader carrying a `cur.live` conjunct that preserves ARMED-supersession parity (a planner-found
non-parity beyond Charpy's TEMPER). Ran under full automation: Charpy r1 TEMPER (scope/scrub completeness) → r2
**FORGE** (`d3571bf`) → **Loki HELD_STONE** (132 reachable pairs executed, 0 divergence; grounded that the old
byproduct is a DOM-identity check that coincides with the kind-formula because `appViewEl` maps every non-home name
to `#browse`) → Curie red-first → **Brunel BUILD_GREEN** (two bench catches: Brunel's backgrounded mutation-sweeps
left a stuck mutant + a live racing sweep — both killed/restored by Zelda; suite 711/0/1) → **Poirot SHIP** (verified
by execution — stripping `cur.live` reddens RC.armed) → **Mendeleev BARE_CELLS** (the finalizationPlanFor throw
guards were untested — both inert left the suite green) → Curie BC-1 remediation (throw test + mutants #66/#67/#68)
→ **Mendeleev ADEQUATE** (713/712/0/1). Completion gate 6/6 (caught a missing Curie verdict token — fixed). §10
scrub done (subsystem §8/§11/§17/§18/§19/§23, parent §7 step 6, DecisionLog, the two folded Charpy plan advisories).
Full sharded mutation-sweep is CI's post-push gate (local unsharded run exceeds the window). **Deferred to 7+
(unchanged):** pane lifecycle + paneRemovalPolicy (F), I10/I17 reveal centralization / the flash core (C),
pane-owning supersession home↔browse/→home (B), rest of finalization (commit/scroll/stackEffect/reveal + unified
planFor()), host fields, recoverSession matrix (G), null-writes/listener (A), fadePanes, the compositor flash.

**Stage 6e SCHEME-COMPLETE (2026-07-27) — build target `1ebbf5d`.** The F(dispose) half — owner-driven typed
emergency disposal replacing the DOM-global `.nav-ghost` sweep at the one owned-pane supersession site (EC §4.3).
`disposeOwnedPanes(owner,reason)` (js/app.js) removes exactly the caller's `own==='owned-pane'` movers (parentNode
guard, traces only on real disposal — Charpy F2); the begin()-recovery OWNED branch calls it + threads
`keepGhosts:true` at BOTH sweep sites (explicit `resetSwipeStyles` :441 + `applyScreen` internal reset :442), the
ORPHAN branch keeps the full sweep. Vitruvius CONFIRMED (not assumed) C depends on F — the reveal centralization
is *expressed as* `pane.release()`/`dispose()`, so it can't precede the interface. **Off the flash surface**
(RGreveal pins reveal timing untouched) — the low risk is the point in its favour as the next foundation. Chain:
Charpy **FORGE** (first-pass, no TEMPER) → **Loki HELD_STONE** (12/12 probe, closed the mid-build-supersession
fracture; named two residuals) → Curie red-first with the **NOOP anti-no-op cell** (spies `.nav-ghost` sweeps=0 on
the owned branch — catches a build that threads keepGhosts at only one site; the DOM outcome alone can't, since no
stray ghost is constructible) → **Brunel BUILD_GREEN** (heeded the 6d lesson — sweep run synchronously, no stuck
mutant) → **Poirot SHIP** (verified by execution: dropped keepGhosts at each site, NOOP reddened both) →
**Mendeleev BARE_CELLS** (the anti-no-op guard had no *registered* single-site mutant — EC §4.10) → Curie
registered #72–76 (keepGhosts-drop ×2, RSN mistag/emit, HR orphan) → **Mendeleev ADEQUATE** (722/721/0/1).
Completion gate 6/6. **Loki residual 2 OWED** (the unguarded "every `.nav-ghost` under a live session is an
owned-pane mover" invariant — unconstructible at HEAD since `Browse.render` is async; a future sync-throwing
`renderDestination` would reopen it → wants a guard/plan-amendment in a later slice). **Still deferred (the flash
arc):** F(release)=C the I10/I17 reveal centralization (the flash fix), pane-owning supersession (B), the rest of
`planFor()`, recoverSession matrix (G), null-writes/listener (A). C is now next by dependency.

**Stage 6f SCHEME-COMPLETE (2026-07-27) — build target `54a4d27`, build `2026-07-27.255`.** The FIRST structural
slice toward the identified flash fix "never transform the real in-flow view." For in-flow→overlay transitions
(source #browse/#home → an overlay) the OUTGOING is now an owned **app-ghost** instead of the transformed
borrowed-real view — so the real #browse/#home is NEVER a mover and NEVER receives a swipe transform on those
transitions. A one-line `constructionPlanFor` flip (js/swipe.js: `toKind==='home' ? 'real-source' : 'app-ghost'`
after the overlay-source guard) routed through the shipped ghostApp machinery; **js/app.js UNTOUCHED** (Loki strike
stayed valid, fingerprints unchanged). ⭐ HONESTY (recorded, not overclaimed): this CI-verifies ONLY the STRUCTURAL
INVARIANT (real view carries no swipe transform on in-flow→overlay) — **it does NOT fix the headline browse→browse
flash** (that's the INCOMING #browse transform, a disclosed T8-forked deferral) and the visual no-peek for the
vertically-INSET overlays (options z25 / settings-subs z26) is **DEVICE-only** (topbar .86-opacity band can expose
the stationary real view). Loki's observation: finalize now yanks a full-viewport composited GHOST in one frame —
**the layer-teardown flash suspect is still in the room** (device question). The user chose this safe stepping-stone
knowingly over going straight at the headline. Chain: Charpy r1→r2→r3 (three TEMPERs: scope/scrub completeness,
no-peek geometry corrected to inset-band-device-only, transition-matrix predicate co-change) → **FORGE** → **Loki
HELD_STONE** (35 members × both dirs × drag sweep, 2455 assertions, 0 fractures; baseline proves the instrument
detects the pre-6f fracture) → Curie GENUINELY red-first (SIbrowse/SIhome red @HEAD because the real view IS
transformed today) → **Brunel BUILD_GREEN** (app.js untouched, no stuck mutant, 731/730/0/1) → **Poirot SHIP**
(verified by execution) → **Mendeleev ADEQUATE** first-pass (2 non-blocking sweep-hygiene observations → spawned as
a follow-up task, NOT bolted on). Completion gate 6/6. **OWED device pass:** the T3 inset no-peek + the ghost-teardown
flash differential + the actual headline flash (on your device — the only place the compositor flash is observable).
**Next by dependency:** the incoming-#browse structural work + the reveal centralization = the actual browse→browse
headline flash fix (the highest-risk, disclosed-fork piece).

**⭐ MECHANISM CONFIRMED ON DEVICE (2026-07-27, build `.256` A/B).** A controlled one-variable device test settled the
20-hour-open flash mechanism: adding `will-change:transform` to `#home` (so removing `.parked` doesn't demote its
layer) made the **home→books ABORT flash CLEAN** while the **complete books→home flash still flashed** — proving the
flash is a REAL compositing layer being DEMOTED and uncovered before iOS re-rasterises, NOT the covering pane's
teardown (the clean `books→options` abort tears down a full-viewport ghost too). See memory `tomeroam-swipe-repaint-saga`
top section. The Linnaeus derivation probe (`Claude/Linnaeus/PROBE-swipe-reveal-teardown.md`) mapped it: A(commit
books→home)=home-SNAPSHOT pane teardown uncovering the demoting view; B(abort home→books)=the #home un-park demote;
C(headline books→books)=incoming #browse transform-demote.

**Stage 6g SCHEME-COMPLETE (2026-07-27) — build target `5cc0f14`+apply `ea49dc2`, build `2026-07-27.256`→(bump on push).**
The device-confirmed reveal fix for flash **B**: `css/app.css:116 #home { transform: translateZ(0) }` — an unconditional
stylesheet rule making #home a PERMANENT compositing layer, so removing `.parked` at a reveal never demotes it →
eliminates the home→books ABORT flash. `translateZ(0)` over `will-change` (non-droppable, no intermittent flash return);
stylesheet not inline (existing tests assert inline #home styles); js/app.js **COMMENT-ONLY** (Loki HELD_STONE holds).
NEW POLICY (EC §4.19) reversing "no promotion on real in-flow views", SCOPED to #home. Promise reveal-scoped (nav-in
slide animation = accounted-benign non-reveal path). ⭐ HONESTY: CI proves only the STRUCTURAL invariant; the flash is
DEVICE-only — the abort flash device-confirmed for the `will-change` form, the shipped `translateZ(0)` navbar/text safety
DEVICE-OWED (§9b, expected-identical by spec). Chain: Charpy r1 TEMPER→r2 FORGE (narrowed an over-broad promise; nav-in
handed to blind Loki as accounted-benign) → **Loki HELD_STONE** (struck the carve-out seam: no swipe reaches slideInView)
→ Curie red-first (PROMO) → Brunel BUILD_GREEN → **Poirot FINDINGS (do-not-ship)** + **Mendeleev BARE_CELLS** — BOTH
independently caught a Critical: PROMO's source-text mutant #79 read UNCAUGHT → CI shard 7 would go red (the recurring
§4.10 mechanization gap, 3rd time) → Brunel apply: a GENERAL source-text-mutation verification mechanism
(`gateTestsFor()` + `caughtBy` marker runs the named gate against the mutated source, requires RED; no benignAlone) →
**Poirot SHIP / Mendeleev ADEQUATE** on sequential re-review. Completion gate 6/6. ⚠️ PROCESS: Poirot+Mendeleev were
wrongly run CONCURRENTLY (shared-tree race + wasted-audit-if-reject) — corrected, now sequential Poirot-first (memory
`no-concurrent-tree-mutating-agents`); and Zelda's build verification now ALWAYS runs `mutation-sweep <new idx>` (the
gap that let #79 reach the audit). **DEFERRED (distinct causes):** commit books→home = the home-SNAPSHOT pane teardown
(its own controlled experiment); incoming-#browse headline (browse→browse, home→browse — T8-forked reveal centralization).
**OWED device pass:** confirm the shipped translateZ(0) keeps the abort flash gone + navbar/text clean.

**⚠️ 6g CORRECTED ON DEVICE (2026-07-28) — translateZ REVERTED to will-change (`.258`).** The shipped `.257` translateZ(0)
FLASHED on device (constant) where the `.256` will-change was clean → the "spec-identical, ship the non-droppable form"
argument was FALSIFIED on real iOS (memory `device-only-fix-ship-tested-form`). git-reverted the 6g code to the `.256`
will-change form (`.258`, HEAD cc1908e; removed the translateZ PROMO test/mutants). Then the user's sharper read: `will-change`
only makes flash **B (abort home→books)** RARE, not gone — a rarity false-positive; the bug was always there. B stays
`.258`-mitigated (rare), NOT fixed.

**⭐⭐⭐ SCROLL-CLUE BREAKTHROUGH + Stage 6h SCHEME-COMPLETE (2026-07-28) — build target `11fc190`, build bump on push.**
The user's decisive device clue: **commit books→home flashes ONLY when the list is scrolled DOWN; at the top it's clean** —
a RELIABLE on-command repro (the oracle the saga lacked; matches ENV TRAP #4). Linnaeus grounded flash **A (commit books→home)**
as an iOS COMPOSITOR SCROLL-SNAP, NOT a layer demote: `applyScreen(home)` collapses the document (tall #browse 14676→short
#home 900) + clamps scroll (~11481→1) under the cover, and the main-thread double-`rAF` cover-drop fires while the compositor
is still scroll-snapping → the re-raster shows. (This RETIRES the earlier "snapshot-teardown" guess; scroll-dependence ruled
out content-fidelity too.) **FIX (6h): `holdGhostUntilPaintable` gains a `settled` gate — the commit→home cover waits for a
`window` `scrollend` (primary) or a `SETTLE_MS`=100ms backstop before dropping, then the existing 600ms DIRECT net is the
never-strand backstop. CONDITIONAL on `cur.scroll0 > SETTLE_SCROLL_MIN` (0.5·innerHeight) — the common NOT-scrolled reveal
keeps its ~40ms fast path (Loki-flagged regression fix); user corrected that scrolled-down is the COMMON case, so SETTLE_MS is
MINIMAL (~100ms band, NOT 250ms).** A `via=`/`settle=` FLASH-log stamp records which path fired. abort→browse byte-unchanged.
Chain: Charpy r1 TEMPER (vacuous STRAND/OWN cells + scrollend-existence honesty)→r2 FORGE→r3 FORGE (after Loki-regression
conditional + minimal SETTLE_MS) → **Loki HELD_STONE** (1022 exhaustive interleavings — never-strand/exactly-once/no-leak;
Poirot verified the 3 structural properties transfer to the built code) → Curie red-first (7 cells + the `h.setScrollY` harness
affordance) → **Brunel BUILD_GREEN** (SETTLE_MS=100 avoids the 60/340/500/600 collisions; sweep 79-85 all caught) → **Poirot
SHIP** → **Mendeleev ADEQUATE** (0 bare cells; superset-mutant concern cleared). Completion gate 6/6. ⭐ HONESTY: CI verifies
only the MECHANISM (7 cells); the FLASH is DEVICE-only. **NOT "confirmed fixed" until the user's scroll-down repro is clean AND
the `via=` log shows the intended path** — "principled IF scrollend fires (via=scrollend); else a bounded heuristic SETTLE_MS
hold (via=settle → tune SETTLE_MS toward the snap floor)." **THREE DISTINCT ROOTS:** A commit→home = scroll-snap (this, device-
pending); B abort home→books = #home un-park demote (`.258`-mitigated, rare); C abort books→books = incoming #browse transform
(T8-forked headline, deferred). **DEFERRED tuning levers:** SETTLE_MS-down (if via=settle + perceptible); post-scrollend N-frame
hold (if scrollend fires before the re-tile). ⚠️ PROCESS this session: two premature "confirmed fixed" claims + a "bank it and
stop" recommendation — all wrong (memories `device-only-fix-ship-tested-form`, `no-unsolicited-stopping-offers`); the win came
from the user's reproducible clue + Linnaeus grounding, not my theories.

**Browse-decouple BUILT GREEN (2026-07-29) — bench, not pushed.** `Claude/Plans/PLAN-browse-decouple.md`
(Charpy FORGE, Loki HELD_STONE) — the symmetric completion of Stage 6i: active `#browse` is now
`position:fixed`+`overflow-y:auto` own-scroll (NO `will-change`, so the fixed `.alphaindex` strip
stays viewport-anchored). With both in-flow views now fixed, `window.scrollY` is a constant 0 on
every signed-in app view, so hiding `#browse` on `→home` can no longer collapse the document — flash
A (the commit books→home scroll-clamp compositor snap) is removed **by construction**, not by the
Stage 6h settle gate (already superseded by 6i) or the `.266` stable-height probe (now retired,
`PLAN-stableheight-probe.md` marked superseded). Six window-scroll consumers re-homed to
`#browse.scrollTop` (virtual-list listener+metrics, scroll recorder/`applyScrollY`,
`playingTrackY`, the scrollbar's new `'browse'` kind, the outgoing app-ghost's offset source); the
abort ghost now excludes `.alphaindex` so the browse-source content-translate can't re-parent it.
Construction/classification/finalization contracts UNCHANGED. Curie's 8-cell red suite un-skipped
and green; 2 lockstep tests updated + 3 collateral tests fixed (pre-existing scroll-surface fakery
broken by the re-home) + `swipe-stage6i.test.js`'s `STABLEHEIGHT` cell removed (it asserted the
retired pin's presence, directly contradicting the new `PINGONE` cell). 8 new + 2 re-anchored
mutations, sweep 0-uncaught. Full suite 748/747/0-fail/1-skip (pre-existing device-only). Build log
`Claude/Brunel/browse-decouple-build.md`; build `2026-07-29.267`. **DEVICE-OWED, not claimed:**
R-flash (confirm the clean repro), R-navbar (bars seat with no in-flow view), R-strip (`.alphaindex`
anchored under a fixed `#browse` on iOS-26), R-browse2browse (browse→browse as a fixed mover). Flash
C (the browse→browse in-list `letterhead` divider re-raster) is untouched, stays open, T8-forked.

**HOME-SHIFT FIX — IN FLIGHT (2026-07-29), design only, NOTHING BUILT.** `Claude/Plans/PLAN-home-shift-fix.md`
(HEAD `8cebe7d`, PLAN_READY, plan gate exit 0). Target = the device-reported **home→books scroll SHIFT that
persisted after `.267`** (window scroll is now ≡0 under the decouple, so it is NOT the window clamp). Two
mechanisms: **M2** = align the outgoing-home ghost clone's padding so its first-content viewport-Y equals the
real fixed-inset `#home`'s `calc(safe+65)` — the constant ~19px, scroll-independent half; Charpy-FORGE'd; the
exact constant is **device-owed** (jsdom has no layout; Charpy flags Linnaeus's ≈46px measurement as evidence
against the 53 headline, so Brunel measures). Also fixes the browse ghost (identical geometry css:150-154 ==
css:126-131). **M1** = the scroll-dependent half, **KILLED TWICE by Loki pre-build**: (1) `STRIKE-home-shift-m1.md`
— recorder + `dataset.st`, a stale value survived a fresh-nav reset because a 0→0 `scrollTop` write fires no
scroll event; record dropped entirely, restore from the gesture's own `cur.ghostY`. (2)
`STRIKE-home-shift-m1-restrike.md` — the restore was gated on the live DESTINATION while `cur.ghostY` is the
gesture's SOURCE scroll; executed: browse-source abort + Home tap during the ~340ms settle → `#home.scrollTop=800`
(a browse scroll onto home). **Fix = gate on `cur.from.v === 'home'`** (captured immutably app.js:460/467 vs
`dest` read fresh app.js:793), applied at BOTH restore sites — abort finalize app.js:1227 + supersession recovery
app.js:444. Coverage 4→6 cells (M1RESTORE, M1FRESHNAV, M1SUPERSEDE, M2ALIGN, **M1CROSSSRC**, **M1SUPCROSS** —
one new cell per restore site, since the two sites are gated by two separate expressions and one cell would
credit a site its fixture never drives); natural per-site mutants in `tools/mutate.mjs`.
⛔ **BLOCKING coverage finding (Vitruvius-measured, jsdom 29.1.1): a class whose computed `overflow` is `hidden`
does NOT clamp `scrollTop`** (500 survived the park; a parked write stuck at 700). The browser clamp M1 exists to
repair never happens in test, so `M1RESTORE`/`M1SUPERSEDE` passed identically with the restore line REMOVED —
**cells that cannot fail**, their named mutants un-reddenable. Remedy required before Curie: model the park clamp
(harness-level shim preferred over per-fixture steps) + a write-observation oracle mirroring the harness's
`scrollTo` recorder. `M1FRESHNAV` survives only because nav.js:140 writes `scrollTop = 0` explicitly.
⚠️ **V2 reachability correction** (Vitruvius, §1): Loki's claim that app.js:444 fires for browse→browse via the
held-ghost window is WRONG — `paneLess` is static on `movers` (app.js:251), an app-ghost mover is `owned-pane`
(swipe.js:343), and app.js:385 refuses a pane-owning session. The recovery site is reached **mid-drag**
(`d` non-null, `finishing` false → app.js:400 → 442-445), making it LESS common than the abort site. Fracture +
fix unamended. **Gates run:** Charpy FORGE (M2 + M1 design), Loki KILL ×2 (both folded). **NEXT:** Charpy
re-stress of the coverage half (in flight) → one FINAL blind Loki strike prosecuting the **enumeration** question
(does `#home.scrollTop` have any writer outside the two known sites?) → Curie + Brunel → Poirot + Mendeleev →
device. ⭐ **Vitruvius's cross-cutting observation: all three failures this campaign are ONE defect shape — a
coverage cell credited with a crossing its fixture never drove.** The existing mutation sweep does catch that
class (an un-reddenable cell reports UNCAUGHT) but only after the build; that generator is still live.
**Unpushed stack** (bench, on top of pushed `d5b4532`): build `.267` + the campaign manifest + the
campaign-completion pre-commit gate + all home-shift plan/casebook/strike commits through `2b51030`
(**36 commits ahead of `origin/main`**, reconciled 2026-07-29).

**HOME-SHIFT M1 — LOKI KILL #3 (2026-07-29), `STRIKE-home-shift-m1-final.md` (`1ff4abd`). The fix would
INTRODUCE a regression shipped code does not have.** Executed + control-validated (2 controls passed first;
clamp-independent, so jsdom's missing clamp is irrelevant): home@500 → swipe home→books → abort (340ms
`settleTimer` armed) → at ~150ms **tap Home**. The touchstart is refused by the `begin()` gate (app.js:385,
pane-owning) and disturbs nothing, but the CLICK runs `goHome`→`navTo({v:'home'})`, whose **same-view
replace-top branch (app.js:140-143) calls `applyScreen(desc)` with DEFAULTS** — sweeping the settling ghost
(`resetSwipeStyles`, nav.js:131/114), un-parking home, writing the deliberate fresh-nav `scrollTop = 0`
(nav.js:140). Home is correctly revealed at 0. At 340ms the finalize fires anyway — the identity guard
(app.js:1257) checks only `cur !== session` and nav.js touches neither — reads `dest` fresh (app.js:793),
enters the no-hold abort branch (app.js:1227), and the source gate passes LEGITIMATELY (`cur.from.v==='home'`,
`ghostY=500`) → **home lurches 0→500, clobbering the user's fresh navigation.** Shipped code is stable at 0.
⭐ **ROOT SHAPE common to all three kills: M1 is a write deferred ~340ms into a SHARED observable, and nothing
verifies the gesture still OWNS the reveal it writes into.** Loki's direction (a real invariant, not another
enumerated patch): a **one-bit reveal-ownership witness** at finalize — the gesture's own swept pane
(`cur.movers[0].el` detached ⟺ an external `applyScreen` intervened) or a nav epoch sampled at `settle()`;
either also covers the popstate route (app.js:1287). Device-owed: the paint realization of the ~190ms
wrong-scroll window; the tap window is ~200ms post-lift (before `transitionend`), after which the sweep pins
the finalize to the 340ms timer. Blast radius: **no coverage cell drives a home-source abort with a mid-settle
Home tap**, and the M1SUPCROSS fixture's ordering is producible only by a click-WITHOUT-touchstart tap (a real
finger's touchstart triggers the recovery first) — for the test author.
**USER DECISION (2026-07-29): KEEP M1+M2 TOGETHER — no device build until BOTH are clean.** (Offered a split
shipping the FORGE'd, never-killed M2 alone — the leading, scroll-independent diagnosis of the reported
symptom — for a fast device read; the user chose one combined build instead. So M2 stays benched behind M1's
hardening, and the reported shift stays device-unverified until both land.)
**Charpy TEMPER on the coverage half (`5d27739`) — 3 blocking mechanics defects, all owed to makers:**
**F3** `mutate.mjs:745` is `src.replace(from,to)` = FIRST OCCURRENCE ONLY with no uniqueness check, so the
plan's two byte-identical `cur.from.v === 'home'` gates would mutate one site twice and report a FALSE GREEN.
**F4** the clamp-shim spec was wrong 3 ways — `MutationObserver` is ASYNC (measured) while the cells drive a
second touch in the SAME synchronous run, so M1SUPERSEDE would still pass with the restore removed BEHIND a
shim that looks like the fix; the cause was mis-stated; and the clamp-of-a-write-while-parked half was
unmodelled. ⚠️ **F4 IS NOW RETIRED — see V3 below; there is no restore line, so no cell asserts a restored
value and there is no shim to specify.** ⛔⛔ **BOTH earlier CAUSE statements were FALSE — do not re-cite either
(V3, Vitruvius `afe54b8`, Charpy-verified `5526fd9`):** Linnaeus's "an `overflow:hidden` box has no scroll
offset" is false (it remains a scroll container), and Charpy's F4(b) replacement — "`.parked` drops the
`bottom` inset → content-height box" — is ALSO false: `#home.parked` (css:98-103) declares no
`bottom`/`height`/`min-height`/`max-height`, and **a rule cannot un-declare a property**, so `#home`'s own
`bottom` (css:129, or css:136 under `body.has-player`) CASCADES onto a parked home and the box stays
inset-solved. **The real mechanism: `.parked`'s vestigial `top: 0`** (a pre-6i in-flow leftover, same era and
shape as M2's vestigial `46`) makes the parked box TALLER than the active box by exactly
`var(--safe-top) + 51px`, shrinking max scroll by the same amount. Loss =
`max(0, scrollTop − (maxScroll − (safe+51)))` — **bounded by `safe+51` and SATURATING, not scaling with scroll
depth.** Charpy verified the step nobody had: no `#home` descendant sizes off the box height (subtree is
section titles/statuslines/carousels, no % or viewport heights), so `scrollHeight` is identical parked vs
active — the delta is real, not cancelled. ⚠️ **The magnitude bound is CONDITIONAL on a [UD] premise:** if
WebKit discards the offset on `overflow:hidden`, the pre-fix loss is the FULL `scrollTop`. **The FIX is robust
either way; the magnitude claim is not.** M1 is also derived-but-never-OBSERVED (the only device datum,
`ghostY=0`/home-at-top, is silent on M1). Three sessions reasoned about a clamp none had derived correctly,
and the magnitude went unquestioned because both wrong readings predicted a TOTAL loss. **F5** the write oracle is unscoped in 2 of 3 statements and cites the wrong mechanism
(`scrollTop` needs `Object.defineProperty`, not the function-property `scrollTo` recorder). Charpy CONFIRMED:
two cells per site is right (2 distinct gate statements, 2 routes, opposite oracles), both fixtures reach their
sites, per-site mutants right, V2 holds, and a harness-level clamp shim masks NO existing test (whole `test/`
tree swept). ⛔ See [[tomeroam-maintainability-gates]] for the LIVE F3 fallout found by auditing all 93
mutations: `#24` ("abort stops restoring the starting scroll") has 3 occurrences and has been mutating the
**supersession recovery** (app.js:445), NOT either abort restore (1203/1228) — a live false-green candidate on
the very lines M1 touches; makers must re-anchor it per-site.

**M1 RE-DERIVED → CSS-ONLY, and Charpy TEMPER #2 (2026-07-29, plan `afe54b8`, casebook `5526fd9`).** Rather than
build Loki's ownership witness, Vitruvius attacked the CAUSE (V3 above) — so **M1 became CSS-ONLY: at this
point TWO deletions, `top: 0` and `overflow: hidden`, from `#home.parked`** (⚠️ **the SECOND deletion was later
KILLED by the 4th strike — M1 is now ONE deletion; see the 4th-strike paragraph below**) under **INVARIANT P**
(*parking `#home` may change only where the box paints and whether it takes input — never its scroll range or
scroll-container status*; since restated over a THIRD axis, below);
`will-change: transform` retained verbatim in both rules. **No restore, NO DEFERRED WRITE — so all three Loki
kill classes are unreachable by CONSTRUCTION** (no record to go stale K1, no gate to mis-scope K2, no reveal
ownership to prove K3). On Loki's own K3 interleaving the finalize makes no scroll write, so the Home tap's
`scrollTop = 0` stands — the shipped-stable behaviour the strike measured. Witnesses designed and REJECTED
(plan §4.4, so they are not rediscovered): **W-A swept-pane** (rests on intra-function ordering enforced by
memory; infers from an absence; fails OPEN on `keepGhosts:true`, CLOSED when `begin()` sweeps
`.nav-ghost.spent`) and **W-B nav epoch — FALSIFIED** (app.js:520 un-parks `#home` WITHOUT calling
`applyScreen`, so `applyScreen` is not the only reveal choke point). If a device measurement ever forces a
restore back, promote W-B with the bump inside `setView` — but re-derive the loss mechanism FIRST.
**Charpy verdict: design half SOUND** (derivation holds; **delete BOTH** — the `overflow` deletion adds no new
surface since a `hidden` box is already a scroll container already scrolled by `scrollIntoView`/focus reveal,
`overflow-x` computes to `auto` in both states, and covers-warm rests on being painted, not on overflow;
`top: 0` alone is the LOOSER change). ⛔ **That "delete BOTH" call is FALSIFIED BY EXECUTION — do not re-cite it**
(4th strike, below): the review stressed every axis then on the table and the axis that mattered, scroll-anchoring
participation, was on no one's table. **3 blocking coverage defects (F8/F9/F10):** **F8** `M1PARKRANGE`
**cannot pass on the fix it exists to lock** — its second clause demands every retained declaration be absent
from `#home` or byte-identical, but `.parked` keeps `z-index: 0` vs `#home`'s `z-index: 20` (and §4.2 says keep
it); dropping that clause is the cheap repair but it is the only half that stops `inset: 0` re-adding the
defect (the forbidden list is a DENYLIST missing `inset`, logical sizes, `margin-top`) → **invert to an
ALLOW-LIST of the four park effects.** **F9** `M1WRITERSET`'s write half is correct but its stated HEAD baseline
**omits ≥7 sites its own `scrollTo` pattern derives** (app.js:445/1203/1228, the reveal watcher's runtime
replacement of that API at app.js:1174/1186, browse.js:860/862) → **the gate is RED on landing**, and the cheap
repair narrows the pattern, dropping exactly the `scrollIntoView` coverage the next strike targets. **F10** the
invariant both cells carry — the writer set is one **"by construction"** — is **FALSIFIED: `overflow-anchor` is
unset anywhere, so scroll anchoring is at `auto` on `#home`, and `home-screen.js` re-renders the carousels and
toggles `#dlSection` under a live offset — a mover with NO API call and no text for any static gate to derive.**
⭐ **A THIRD live non-unique anchor found:** `M1NOWRITE`'s `resetScroll: false` occurs **5×**, first at the held
path the fixture never takes. **F4 retirement CONFIRMED correct**; **F5 airtight** and verified independently
(the Home tap takes navTo's same-view replace-top branch, `applyScreen` once with `anim` null ⟹ nav.js:140
writes 0 exactly once; `Object.defineProperty` precedent `test/browse-decouple.test.js:260-266` is real).
Charpy also confirmed the 2 disclosed M2-text edits are faithful to its F1 and harmless (KEPT). **NEXT:**
Vitruvius folds F8/F9/F10 + the 3rd anchor + the §4.1 line-120 formula (it drops the inner `max(0, …)` that
line 118 carries, over-stating the short-library case) → **4th Loki strike, re-aimed: SCROLL ANCHORING is the
highest-value plane** (it moves the observable with NO API call and is demonstrably live); the descendant-scroll
cases the plan lists have no shipped call site into `#home`'s subtree, so a strike aimed only there likely
returns a held stone → Curie + Brunel.

**⭐⭐ HOME-SHIFT M1 — LOKI KILL #4 (2026-07-29), `STRIKE-home-shift-m1-derivation.md` (`f63414a`), and the fix
NARROWED TO ONE DELETION (plan `0925e7f`, plan gate exit 0). The strike VALIDATED the derivation and killed only
the SECOND deletion.** Executed in a real Blink engine (HeadlessChrome 150, the Android WebView APK's engine
family), controls green first. **HELD, numerically exact:** the whole V3 cascade — parked `clientHeight` = active
+ 71px (`safe+51` with the vars pinned), the bottom-of-range clamp of exactly 71px surviving the un-park,
mid-range park losing zero, the short-library clamp (649 → 578 pre-fix, zero post-fix) — plus the [UD] retention
premise's **Blink branch: an `overflow: hidden` box RETAINS its offset.** **BROKE:** **a non-none `transform` on a
scroll container SUPPRESSES every Blink scroll-anchoring adjustment, and `overflow: hidden` UN-SUPPRESSES it**
(isolated: transform alone on- and off-screen suppresses; `pointer-events`, `z-index`, `overflow: hidden` alone
are each anchoring-inert). So the SHIPPED park anchors identically to an active home and the two-deletion park
anchors not at all → a home content mutation landing mid-park (`onFresh` background revalidate,
home-screen.js:124 — the highest-frequency mutator in the first seconds of every cached open) then abort →
**measured −80px reveal jump where shipped code measures 0px.** `overflow-anchor: none` in the park rule is
executed **NOT a repair** (the jump survives it) — it is a second way of stopping anchoring, not of restoring it.
**Vitruvius response, all folded:** (1) **the fix is now ONE deletion — `top: 0` goes, `overflow: hidden` STAYS**,
reclassified from vestigial to LOAD-BEARING (the park cannot drop its transform, so `overflow: hidden` is the
counterweight that keeps anchoring running); the reversal of Charpy's "delete both" is recorded traceably in the
plan §4.2. (2) **INVARIANT P restated over THREE axes** — paint position + input inertness only; never the scroll
range, the scroll-container status, the content width, the block padding, **or scroll-anchoring participation.**
(3) **`M1PARKRANGE` gains Tier 0 — `overflow-x/y: hidden` REQUIRED PRESENT**, the first cell in this campaign with
INVERTED polarity (it must FAIL on removal AND on a narrowing to one axis), plus a second mutant, six acceptance
tests, and both anti-vacuity guards kept. Cell count stays SIX; mutants become SEVEN. (4) **New device row
R-M1-anchor** (mid-park mutation → abort → reveal, **Android WebView/Blink ONLY** — WebKit implements no scroll
anchoring, so iOS cannot exhibit it and an iOS-primary pass reports clean regardless). ⛔ **NO CI cell can cover
this axis — jsdom implements no anchoring; a second §7.2 prohibition now forbids writing one.** (5) **The price
is stated, not hidden: keeping `overflow: hidden` leaves the retention [UD] OPEN on WebKit** (R-M1-retention) — if
iOS discards the offset on the flip, M1 is not fixed there, and re-adding the second deletion is NOT an admissible
answer. ⭐ **Durable lesson (the 4th strike's own):** *an engine-behaviour claim a unit harness cannot execute is
NOT thereby device-owed — a real desktop engine sits between the harness and the device, and "the same in both
states" claims are exactly what it kills cheaply.* Also: the plan NAMED anchoring as the sharp target and then
reasoned past it — naming a residual is not driving it. **NEXT: ONE narrow 5th Loki strike on the EXACT adopted
form** (transform + `overflow: hidden` without `top: 0` was never executed — a variant of a validated form is not
validated; the strike's instrument is reproducible from its own §3) → **Charpy re-stress of this revision** (its
own call was falsified, and the mixed-polarity cell is new) → Curie + Brunel. **Not gated by either: the M2 half,
the §7.3 tooling remedy, and the five cells other than M1PARKRANGE.**

**⭐ HOME-SHIFT — BOTH REMAINING GATES RAN AND CLEARED; THE PLAN IS NOW CLEARED TO BUILD (2026-07-29, plan HEAD
`2b51030`).** **Loki 5th strike = HELD STONE** (`Claude/Loki/STRIKE-home-shift-m1-adopted.md`, `8d47465`) on the
EXACT adopted one-deletion form, which the 4th strike had never executed (it ran active, shipped park, and the
two-deletion park — the adopted fourth state was inferred): in real Blink (HeadlessChrome 150, the Android
WebView engine family), controls green first, the adopted park measured a **0px reveal delta on the 4th strike's
own kill scenario where the retired two-deletion form measured −80px in the same run**, exact-integer
anchor-selection parity with the active box across a six-shape mutation matrix, and clamp-free geometry at every
depth (`clientHeight`/`scrollHeight`/`maxScroll` all equal to active — the 71px delta gone). **Charpy
post-reversal re-stress = TEMPER** (`Claude/Charpy/PLAN-home-shift-fix-charpy.md`, `e1f2866`) with **no sixth
strike warranted**; its eight findings **F19–F26 are all folded** across `68f86d3`/`5b7b98f`/`7a8dab3`/`61ed56b`/
`2b51030` — the `overflow: clip` inadmissibility directive + its `css/app.css:161-165` cross-reference, Tier 0
dual-grounded (scroll-container per CSS Overflow 3 = cross-engine, plus the Blink anchoring un-suppression), a
third M1PARKRANGE mutant for a wrong VALUE (cells stay SIX, mutants 7→**EIGHT**), a mandatory **counted repaint
witness** on device row R-M1-anchor (an unwitnessed clean run is discarded, not recorded), and the status/
sequencing/handoff reconciled to BUILD. **Design plane CLOSED BY EXECUTION on all three axes; no open question
can change the fix's shape and nothing waits on a reviewer or an adversary.** **NEXT, in the reviewer-endorsed
order:** (1) the **§7.3 mutation-tooling remedy** — uniqueness hard error + disambiguation field + anchors-gate
check + the sweep naming its killing cell + the MUTUNIQ cell + re-anchoring the two live non-unique mutations
(`#24` into three per-site entries, `#42` onto a function-naming anchor); it is first because no mutation result
in this repo is readable until it lands, and `M1PARKRANGE-b`/`-c` surviving the sweep is the only structural
guard against a half-built allow-list cell. (2) **Curie** — six red cells, eight mutants. (3) **Brunel** — M2's
measured clone constant + M1's ONE deletion (`top: 0` out of `#home.parked`, `overflow: hidden` KEPT) with the
three-part park comment. One commit, one build number, one device pass (standing user decision). **The device
gate spans TWO engines and a pass on one does not clear it:** R-M1-cause + R-M1-retention + R-M1-flash are
iOS/WebKit; **R-M1-anchor is Android WebView/Blink ONLY** (WebKit implements no scroll anchoring, so an
iOS-primary pass reports clean regardless — the reason every earlier gate missed the 4th strike's fracture).

**Loki gate (2026-07-26): HELD STONE on parity — but ONE open conformance finding.** Strike
`Claude/Loki/STRIKE-swipe-stage5-narrowing.md`: executed differential probe (parent `f6d6985` five-key vs
`0049a13` four-key), five gesture scenarios, byte-identical behavioral traces; `np-locked` unlock fired
true→false identically (non-vacuous; instrument proven able-to-fail). The consumer-parity promise HOLDS by
construction. ⚠️ **NB1 — OPEN, ratified-contract deviation:** §3:150 declares
`decorations: Readonly<{kind,base}[]>` and the OLD return handed a deep-frozen array, but the hoisted
projection at `0049a13` is UNFROZEN. Effect-free today (sole consumer reads only `kind`/`base`) — but it
misses the ratified §3 `Readonly` promise, and BOTH Poirot and Mendeleev missed it, because the immutability
gate (`test/contract-function-gate.test.js`) covers only CONTRACT seams and `buildConstruction` is
NON_CONTRACT (dead-field-gated only, no immutability gate). **Structural hole:** NON_CONTRACT
object-returning seams have no immutability gate. Disposition PENDING (user decision): (a) freeze the
projection + add an immutability cell — Brunel + Curie — if `Readonly` is load-bearing; or (b) reconcile
§3 to documentary — Vitruvius/Charpy. **Stage 5 is all-gates-run but NOT clean-closed until NB1 is
dispositioned.** Supersedes the "SCHEME-COMPLETE" line above.

**NB1 RESOLVED (2026-07-26): DOCUMENTARY — Stage 5 now CLEAN-CLOSED.** Vitruvius ruled `Readonly` a
compile-time annotation, not a runtime-freeze requirement: `buildConstruction` is NON_CONTRACT (its return
carries live DOM nodes, cannot be deep-frozen), exempt from the §4.11 gate by design; the prior freeze was
incidental-transitive from the now-dropped frozen `plan` wrapper. §3:150 restated to current truth
(fresh-unfrozen), committed `c743c49`; Charpy re-gated the edit **FORGE (r10)**
(`Claude/Charpy/PLAN-swipe-stage5-2026-07-26-r10.md`), independently scrub-confirming §3:150 was the sole
immutability claim. No code change (`0049a13` already conforms); no fresh Loki (documentary edit, no
behavior/contract/coverage change); no Curie/Brunel/Poirot/Mendeleev re-run. There is NO structural hole —
NON_CONTRACT object-returning seams are unfreezably-live by design, not a gate that failed. **All six gates
run (Charpy r1–r9 FORGE + r10 FORGE, Curie red, Brunel green, Poirot SHIP, Mendeleev ADEQUATE, Loki HELD
STONE), zero blocking findings. SHIPPED 2026-07-26.** Pushed + CI-green + deployed: build `2026-07-26.243` live on GitHub Pages (the
git-env tooling fix `e1a0c46` rode on top). **On-device: the user confirmed main-path swipe parity —
behavior unchanged, which is the PASS condition for this parity-only refactor** (the superseded-drag /
overlay-commit / NP-source / back→home scenarios were not separately exercised). **Stage 5 CLOSED** —
supersedes every "not pushed" / "deploy deferred" note above. The visible swipe-behavior changes
(scroll-restore, source-rerender) remain Stage-6 new-policy work.

**Stage 6a SUPERSESSION RECOVERY — SCHEME-COMPLETE (2026-07-26), bench, not pushed.** The two known-red
supersession policies are IMPLEMENTED: begin() recovers the source INSIDE the Browse hold (re-render iff
`d.clobbered` + restore `d.scroll0` while rows stay suspended), releases the hold LAST, nulls session/`d`
LAST, then arms — so a superseded live browse→browse drag restores the source page + starting scroll even on
a virtualized library. Ran under full automation: Vitruvius→Charpy (r1 TEMPER F1-scrub, r2 FORGE, **Loki
KILL** on the release-before-recover order → Vitruvius → Charpy r3 TEMPER F3-coupled-order → r4 FORGE), a
fresh **Loki HELD_STONE** on the corrected promise, Curie red-first (VR/OR/NC + OB-home for Poirot F1),
Brunel green, **Poirot PASS** (after a fix-then-ship F1 orphan-scroll / F2 label round), **Mendeleev
ADEQUATE**. §10 scrub done: SR/SC `{todo}` retired to live guards; both PolicyLedger entries + the dangled
mutation removed; PolicyLedger now empty. Completion gate (`stage-gate-check`) passes 6/6. Build
`2026-07-26.246`; **not pushed — on-device verification owed** (incl. the device-only KEEPER guard, Loki
NB-post-endHold-scroll-realize, `{skip}` in jsdom). **6b deferred** with reasons (finalization /
`sameBrowseHost` / pane-lifecycle / finishing-gate — PLAN-swipe-stage6.md §11).

**Contract = DURABLE ENGINEERING CONTRACT v2 (three-layer: Core / Subsystem / Ledger).**
`Claude/EngineeringContract.md` is the Core; `Claude/Subsystems/swipe-reveal.md` is the first
subsystem addendum; this DecisionLog is the Ledger. **Mechanized sections (gates, not vigilance):**
§4.10 mutations registered in `tools/mutate.mjs` + `tools/mutation-sweep.mjs` + `test/mutation-
anchors.test.js`; §4.11 `test/contract-function-gate.test.js` (exact-keyed, deep-immutable, clone-
before-freeze, new-export meta-check); §4.9 `test/no-silent-coverage-exit-gate.test.js`; §4.14/§4.20
`test/descriptor-coverage-gate.test.js` (all seven §15 cases; scenarios generated per §22); §4.19
`test/policy-ledger-gate.test.js` reconciles `Claude/Decisions/PolicyLedger.mjs` against the suite's
known-red set (no untracked/stale/dangling policy) + §1.C fields. NOT gated (process, not mechanizable):
§3/§6/§7/§10 procedures, §8 report wording; §4.14 oracle-independence enforced structurally. ⚠️ The
.230 batch landed only after its first commit silently failed
(`git commit` chained after a no-match `grep` in `&&`) and was falsely reported shipped — see
[[git-commit-verify]]. Plan of record → `Claude/Plans/PLAN-swipe-reveal.md`; the
stages-gated-by-review policy → DecisionLog. **The headline flash bug is STILL OPEN** — depth,
dead-ends, and the 8 environment traps → `[[tomeroam-swipe-repaint-saga]]` (READ BEFORE TOUCHING THE
SWIPE / VIRTUALIZER / browse.js). 🔴 A RED test gradient (`--page-bg`) is still live in `css/app.css`
— remove once background movement is confirmed fixed.

**Build .273 (2026-07-30) — the moving-background root cause found and fixed, device-unconfirmed:**
`js/swipe.js`'s ghost wrapper (`ghostWrap()`) painted its own copy of `--page-bg` (`GHOST_BG`) onto a
`will-change:transform` layer that then gets translated during every swipe except books→home — the
one CSS-invisible painter test/page-bg-single-painter.test.js's CSS-only audit could not see. The
wrapper no longer paints a background (transparent; `GHOST_BG` removed); a new sibling test
(`test/page-bg-js-painter.test.js`) scans `js/**` so a JS-painted page background reddens going
forward. **Untested for content bleed-through** (jsdom has no layout/paint) — a device check of an
app-ghost transition between a short outgoing snapshot and a taller destination is the residue before
the red `--page-bg` gradient above can be removed.

**Swipe-declone Stage 1 BUILT GREEN (2026-07-30), build `2026-07-30.274` — bench, not pushed, review
gates deliberately waived by the user for this stage.** `Claude/Plans/PLAN-swipe-declone.md`
(ratified `ed19791`). CAUSE: `ghostApp()` cloned `.app` and stripped every id, so the copy's
id-keyed `position:fixed` inset rule stopped matching and the copy laid out in normal flow — a
different box than the real view; the 7px gap (patched with the 53px constant), the second moving
background (fixed at `.273`), and the reported swipe-start heading reflow are that one non-identity
seen three ways. `constructionPlanFor`'s `outgoing` narrows from "in-flow source, non-home
destination" to `fromKind==='browse' && toKind==='browse'` — home→browse, home→overlay and
browse→overlay now move the REAL view element directly; only browse→browse still clones (Stage 2
removes that too). `showAppView` stops parking `#home` mid-drag (deferred to commit via the existing
`applyScreen`→`Nav.setView` path; never on abort). Pre-build real-engine measurement (headless
Chrome, plan §15 R1/R2): a real fixed mover shows zero content-top/font-size delta under transform,
a fixed mover at `translateX(±innerWidth)` does not extend `scrollWidth`, and the filmstrip's two
movers are edge-to-edge with zero overlap for the whole live drag — no clipping replacement needed.
R1 could not settle the reported heading-resize symptom itself (suspected WebKit font boosting,
invisible to Blink) — **stays device-owed**; if it survives on device the hypothesis is falsified,
and `text-size-adjust` is explicitly not the fallback. Deleted (not migrated):
`test/ghost-clone-geometry.test.js` (M2ALIGN) and `test/swipe-stage6f.test.js` (its whole premise is
the rule this stage reverses); `ghostApp`'s dead home-source offset branch + its `fromKind`
parameter, with their designated test. The 53px constant stays (still load-bearing for the live
browse→browse ghost) until Stage 2. Scrubbed a false `#home` CSS comment (claimed an opaque
background occludes `#browse`; `#home` has none). New: `test/no-view-clone-gate.test.js`
(NOAPPCLONE, built now rather than deferred to Stage 2 per instruction — an unresolvable clone
receiver fails rather than passing; two registered exceptions, the NP pill and a dated temporary
allowance for the browse→browse clone Stage 2 must remove) and
`test/swipe-declone-stage1.test.js` (NOGHOSTINFLOW + HOMESTAYSLIVE, every mutant proven
red-then-green). Full suite 783/782/0-fail/1-skip (pre-existing device-only); `hooks:check` all
green. Full decision detail → DecisionLog. **DEVICE-OWED:** the heading-reflow symptom (R-E); R3 (the
A–Z strip on a transformed `#browse`, untested in the `browse→*` direction). **Stage 2, not built:**
per-page `.browsepage` scrollers, the full §12 deletion list (`ghostApp` itself, `dropPanes`, the
capture block, the `.nav-ghost` sweeps), the gate's temporary exception removed.

**Mutation #101 (M2ALIGN) orphan CLOSED, build `2026-07-30.275`.** CI run `30565401541` on
`cf48e03` (Stage 1) went red on mutation-sweep shard 5: Stage 1 deleted
`test/ghost-clone-geometry.test.js` because it drove the retired HOME-source ghost path —
correct, that path is gone — but left mutation #101 registered against the `53px`
`#library` constant, which stays load-bearing for the still-live browse→browse ghost until
Stage 2. New `test/ghost-clone-alignment.test.js` restores a browse→browse-scoped guard
(derives both candidate aligned values from `css/app.css`, asserts neither is the vestigial
`46px`); fail-proof run (green → mutate #101 → red on the intended assertion → restore →
green) confirmed by execution. Shard 5's full 13-mutation range now sweeps 0 uncaught, 0
unapplied, 0 stale. Swept every mutation whose designated test Stage 1 touched
(`ghost-clone-geometry.test.js`, `swipe-stage6f.test.js`, the home-source GHOSTSCROLL cell)
— all have live killers; #101 was the sole orphan. Both the new test and the `53px`
constant are scheduled for deletion together in Stage 2 (`PLAN-swipe-declone.md` §12 items
5, 16). Full battery green (`tools/hooks/run-checks.mjs`), committed `020c2d9`, not yet
pushed.

**Mutation #98 (M1NAVWINS) CORRECTED, build `2026-07-30.276`.** ⚠️ SUPERSEDES this session's own
earlier claim that #98 was "pre-existing" — that was wrong; a control run confirmed CAUGHT at
`1577a0e` (immediately before Stage 1) and UNCAUGHT from `cf48e03` onward, so Stage 1 broke a
second shard, not one. CAUSE: the M1NAVWINS mutant restored `cur.ghostY` after the abort
finalize; Stage 1 narrows app-ghost-building to browse→browse only, so `cur.from.v === 'home'`
and `cur.ghostY != null` became mutually exclusive by construction (`d.ghostY` is never set for
a home-source gesture, `js/app.js:556-563`) — the mutant's own guard was an unsatisfiable
conjunction, applying cleanly but never executing its write. The test fixture in
`test/home-abort-writes.test.js` still drove the exact interleaving it always had; the mutant
went inert, not the cell. FIX: re-derived the mutant (`tools/mutate.mjs`) to restore
`cur.scroll0` instead — the one captured-scroll field still populated on every gesture
including home-source — a genuine write the same two designated tests (M1NOWRITE, M1NAVWINS)
still catch regardless of value; the safety property under test is unchanged, only the field a
reintroduced restore would plausibly reach for. Fail-proof confirmed by execution: green →
mutate #98 → both cells red on their intended assertions (`Got [0]`) → restore → both green.
Shard 2's and shard 5's full 13-mutation ranges each swept 0 uncaught, 0 unapplied, 0 stale.
Full battery green, committed `011111f`, not yet pushed.

## 🎬 ONE SCREEN TYPE campaign (2026-07-30 → 07-31) — `.270`–`.284`
⚠️ **This section was missing from the board until 07-31, and the cause was mechanical, not
forgetfulness** — see "records lost to a revert" below. Do not read its earlier absence as the work
not having happened.

**The root cause, found after three band-aids.** The swipe CLONED `.app` and stripped the clone's
ids (`js/swipe.js`), so the copy laid out differently from the original. That ONE cause produced
THREE symptoms, each patched separately before the cause was seen: (a) a ~7px geometry gap
"fixed" with a hand-tuned `paddingTop` constant, (b) a duplicate background that moved during the
swipe, (c) font boosting differing between copy and original → heading resize → reflow. The user
stopped the third patch: *"Stop cloning… When do you start looking at causes instead of
symptoms?"* Lesson, now also a gate: **a hand-tuned constant reconciling a COPY with the ORIGINAL
is a divergence report, not a fix** (`[[compensating-constant-is-a-cause-report]]`).

**Shipped and device-confirmed:** Stage 1 de-cloning; exactly ONE page background (`body::before`,
viewport-fixed, never moves); Options and its five settings subs demoted to ordinary peers; home
scroll preserved on commit (the `.parked { top: 0 }` deletion — `overflow: hidden` is LOAD-BEARING,
do not also remove it).

**`.282`–`.284`, the A1-fix and its repair.** `.282` shipped a guard suppressing a filmstrip
reconcile during a gesture, keyed to `!!d && d.live`. Loki KILLed it: `d` is nulled at `end()`
(`js/app.js:618`) while `session` still owns and animates the movers through settle, so a reconcile
firing 125–340ms after finger-up hid the committed destination mid-snap. `.284` (`01cbaf1`) replaces
it with **`!!session && session.live`**, derived from a boundary table rather than guessed. Curie's
three FILMSTRIPDRAG windows jointly admit exactly that predicate and reject both neighbours
(`!!d && d.live` → settle window red; `!!session` alone → arm trap red). CI green, all 8 mutation
shards.
⭐ **The class, twice now: LIFETIME MISMATCH** — guarding the phase where a defect was OBSERVED
instead of the lifetime of the resource being PROTECTED. The mechanical check is a boundary table:
name the resource, find where ownership begins and ends in source, confirm the predicate's truth
boundaries coincide. Required by the plan; it was skipped on the first pass and that is what shipped
`.282` wrong.

**Step 6f — SATISFIED 2026-07-31, with one recorded residual.** The user reports the app fine on a
build ≥ `.284`, and app code is **byte-identical `.284`→`.288`** (`git diff 01cbaf1 HEAD -- js/ css/`
is empty — every build since 10:18 that day is the same app), so the reading covers the r2 fix
whichever build it ran on. The sighted-once pop-in has not recurred.
⚠️ **RESIDUAL, not to be upgraded to "proven":** a pass in ordinary use may not have driven the
deliberate fast release (tap `‹ Back` and lift inside ~125–340ms). A **held** drag structurally
cannot reach that window at all. So the narrow timing band is **untested rather than proven clean**.
Do not re-ask for it — the user has said the pop-in is not worth chasing without a repro. If it ever
recurs, THAT is the repro, and this band is the first place to look.
⇒ **A1b is no longer sequenced behind this gate.**

**Stage A1b plan review round 2 — TEMPER, 2026-07-31**
(`Claude/Charpy/PLAN-one-screen-type-A1b-charpy-r2.md`, reviewed at `57e503d`). Round 1's six
Structural findings (`…-A1b-charpy.md`, `35f0005`) are **all resolved** in the fold at `57e503d` and
each was re-checked against source: the false "additivity was never among the reasons" premise is
removed rather than softened and licensed instead by `PROBE-np-uniqueness.md` §9.1's supersession
(re-derived independently — `js/nav.js:81` is the only writer that adds `hidden` to `#nowplaying`);
the count is 24 distinct facts in 16 grouped entries, checked against probe §9.3's enumeration; the
`browseWillHide` edges are five in one canonical place; §6a's casualty census is correct
assertion-by-assertion.
**Three new Structural findings gate the build, and one is executed.** **F14 —
`Claude/Campaigns/one-screen-type-a1b.json`'s `plan-review` gate declares a verdict glob with no
wildcard, so it can never read a re-review and step 1 has no reachable discharge.** Fix: widen it to
`Claude/Charpy/PLAN-one-screen-type-A1b-charpy*.md`; `artifactsOfRecord` then selects the highest
`-rN` (proven by running it). F15 — edge 5's "deliberately uncovered" ruling holds on its first
ground but its second is false, and its re-open condition names `setView` when the idempotence that
protects the edge lives at `js/virtuallist.js:251-262`. F16 — R-H hazard 3 says the aborted NP-back
swipe newly pays a `Browse.render`; it is paid today, and what A1b adds is the teardown whose
`dematerialize()` makes that render rebuild rows it would otherwise keep (this error originated in
round 1's own F10). Six Weak/Note findings are sentence-level.
**Not re-opened:** `showAppView`'s sweep — §5.3.5's proof is sound, KEEP stands, verified.
**Round 2 FOLDED 2026-07-31 into `Claude/Plans/PLAN-one-screen-type.md`; a THIRD round is owed
before step 8.** F14 is closed by tooling, not by plan text — `d9b3899` (highest `-rN` is the verdict
of record) and `3c89349` (glob widened) — verified by running the gate, which now reads round 2's
TEMPER. F15's edge-5 ruling stands on its byte-identity ground alone, the false second ground is
deleted, and the re-open condition is re-aimed at edge 5's `setView` body. F16's hazard 3 now names
the teardown as the new cost and the `dematerialize()` coupling as why the already-paid render gets
more expensive; hazards 1 and 3 are recorded as one mechanism. **A1b's DESIGN did not move in either
round.** §13 gained **step 1a**: every sentence a fold NEWLY asserts is verified against source before
the plan is handed back — the fold's own sweep found two further off-by-one citations (§8's and
§5.2's `resetSwipeStyles` call site) that no review had filed. **Owed elsewhere:**
`Claude/Linnaeus/PROBE-np-uniqueness.md` §9.1.g carries the same truncated `js/app.js:494-496` span
the plan corrected to `:494-497`; that record is the deriver's to fix.

**Stage A1b plan review round 3 — ⭐ FORGE, 2026-07-31**
(`Claude/Charpy/PLAN-one-screen-type-A1b-charpy-r3.md`, reviewed at `de84349`). **All nine round-2
findings resolved; step 1 of §13 is DISCHARGED and step 8 is open.** The manifest gate now reports
`✓ plan-review [charpy] — pass (FORGE)`, reading r3 as the verdict of record — the first round the
gate could read at all. Each Structural closure was checked against the thing itself, not the fold's
account of it: F14 by executing `globFiles`/`artifactsOfRecord` directly; F15 across **all four**
places (§7 ledger, §9, §10, §14 — a partial fix here would have been round 1's F4 shape); F16 by
re-deriving `js/app.js:541-542`→`:512` unreached by A1b and `js/virtuallist.js:262`'s
`dematerialize()`. Residual classes were **swept** rather than spot-checked — no `2870`, no
`css/app.css:506`, no `js/app.js:250`-as-`sessionDone`, no scroll-reset-at-`:147` survives.
**Four new findings, NONE blocking** (2 Weak, 2 Note, no cell owed by any): F23 — the fold's own
rationale for step 1a miscounts its evidence (F14 was the manifest, not plan text; F18 was Weak, not
Structural). F24 — §9 says edge 5 "passes `keepGhosts: true`"; `js/app.js:459` makes all three
options ternary on the superseded session, and the ruling holds on **both** branches. F25 — the
plan's step-6f sequencing text (`:38`, `:1528`, `:1564`) is stale against this board; **not a fold
defect**, it went stale at `de84349`. F26 — §3.5's `js/nav.js:60-65` span; the call is `:60` alone.
**Three rounds, and A1b's design never moved:** it is still the deletion of the two `if (!npOpen)`
guards at `js/nav.js:51` and `:78`.

**Still open in this campaign:** r2's successor stages — A1b (NP parks/hides beneath itself, **plan
FORGE'd r3 — build gate open; red suite owed first**), A2
(delete `z-index: 25`/`26`), Stage B (taxonomy: `overlay` becomes NP alone, 8→14 kind rows); and
`PLAN-swipe-declone.md` Stage 2, `browse→browse`, the last remaining clone and the last home of the
tuned `paddingTop = '53px'`. **Stage 2 plan review round 3 (`6e37b25`, the round-2 fold): TEMPER** —
every round-2 finding resolved and both new gates (`MOVERSDISTINCT`, `LANDEDPAGESHOWS`) proven able to
fail on the defect they name; one Structural residual, F19 — `Browse.endHold` gains a `landed` argument
on a path that runs for EVERY gesture, and the fold defined it only for a browse landing, so the four
shipped Stage-1 transitions had no stated behaviour.
**Stage 2 plan review round 4 (`2b6d0ed`, the round-3 fold): FORGE — the plan is cleared to build.**
F19 is closed over the whole domain, `MOVERSDISTINCT`/`LANDEDPAGESHOWS`/`MOVERHASBOX`'s tightenings are
in, the mutant recount is right (28 before, 29 after, 16 cells — counted mechanically), and nothing new
is device-owed. Four non-blocking residuals for the builder to carry, all caught in CI or records-only:
F23 (`LANDEDPAGESHOWS`'s call-count assertion needs a force-virtualized fixture or it is vacuous —
`VirtualList.setForceVirtual(true)`, as `test/browse-virtual.test.js:170` already does), F24 (§5.3.6's
"the miss branch is the no-op case" is false for an aborted `home→browse`, where `showPage` HAS parked a
page mid-drag), F25 (§7's two ledger rows still state the pre-correction, landed-only claim), F26 (a
scope overclaim in §18's Round 3 entry). `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r4.md`.
The round-3 fold: §5.3.6 defines `endHold` over every value
`currentDesc()` can return: a landing naming no cached browse page keeps HEAD's `activeEntry()`
behaviour unchanged, and the throwing `Browse.pageElFor` is kept off that path by construction, so the
wedge-every-future-swipe reading is closed rather than guarded. `LANDEDPAGESHOWS` gains a `browse→home`
abort-and-commit half plus a third mutant that reddens on the silent reading; both halves are
class-state and call-count assertions, so **no new device-owed row**. F20 (a mutant at a layer its
fake-env cell cannot reach), F21 (§9 item 1's false justification) and F22 (`MOVERHASBOX`'s id-derived
host set) are folded as records tightenings. `Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r3.md`.
**Stage 2 RED SUITE AUTHORED (2026-08-01, build `2026-08-01.291`) — plan §13 step 9 is done and the
build (step 10) is unblocked.** Thirteen cells across `test/swipe-declone-stage2-css.test.js`,
`-construction.test.js`, `-reset.test.js` and `-browse.test.js`. Every cell that can be red at HEAD is
red at HEAD, each verified by running it with its skip removed; red cells ship behind
`{ skip: SKIP_* }` (SKIP-PENDING-BUILD) and **the builder removes each skip to drive it red**.
MOVERHASBOX, PARKLOSESTRANSFORM and NPPILLIDS are green at HEAD and registered as gates/guards, not
as red cells. F23 is discharged: `LANDEDPAGESHOWS`'s `browse→home` half forces virtualization, so
NATURAL-c's activation call count is ≥1 at HEAD and 0 under the mutant instead of 0 on both. The
24 new mutants are SPECIFIED, not registered — every anchor targets text the build creates, so
registering them at HEAD would redden the anchors gate; they go in the build's own commit.
**⛔ 18 EXISTING MUTATION ANCHORS ROT on Stage 2's deletions and only four are on §12 item 24's
list** — including Stage 1's own NOGHOSTINFLOW anchor (`#76`), five separate anchors on the single
hard-reset `applyScreen` line at `js/app.js:459`, and the browse-decouple `METRICS`/`RESTORE` pair
(re-anchor, do not drop). Full list plus six non-mutation surfaces the plan's §10/§12 do not name
(incl. `test/swipe-construction.test.js`'s exact-key `CONSTRUCTION_KEYS` and the GENERATED swipe
inventories): `Claude/Curie/RED-swipe-declone-stage2.md`.
**Stage 2 BUILT (2026-08-01, build `2026-08-01.292`/`.293`, commits `ee1080f`/`375e11f`/`e1db674`) —
`browse→browse` moves two real `.browsepage` elements; the clone machinery is deleted.** Reviewed:
`Claude/Poirot/POIROT-swipe-declone-stage2-e1db674.md` (verdict PASS, fix-then-ship) plus a cold-read
adversary addendum (`Claude/Poirot/POIROT-swipe-declone-stage2-e1db674-adversary-addendum.md`,
findings A1–A10). **Both are CLOSED (2026-08-01, build `2026-08-01.294`, commit `e1208eb`):** F1/F5/F3
(+A2)/F4(+A4)/A1/A3/A5/A6/A9/A10, three comment observations (O1/O2/O3), fixed — each red-first or
mutation-verified where the finding named a coverage gap (A1 against mutant `#119`; F1 manually
against the guard's two halves). **F2 (same-key `authorBooks(A)→authorBooks(A)` collides in both
mover slots) is FILED FOR THE PLANNER, not resolved** — a same-key regression PIN was added to
MOVERSDISTINCT (`test/swipe-declone-stage2-construction.test.js`) that records the current colliding
output without deciding reachability. A7 (`sourceEl` ignores its `v` arg) and A8 (`plan.outgoing`'s
dead-field exemption) are also filed for the planner, untouched. Full 6-shard mutation sweep 123/123,
0 uncaught, matching CI's partition; full suite 808/807/0-fail/1-skip. **Step 10a (the park-geometry
device probe) still gates step 10b (the device pass) and step 11 (the subtraction pass) is still
pending** — neither was touched this session.

**Step 13 — coverage audit CLOSED (2026-08-01, `Claude/Mendeleev/AUDIT-swipe-declone-stage2.md`,
verdict ADEQUATE).** All 52 deleted `test()` declarations accounted for (13 migrated with their value
changed, 38 with their subject); no migrated gate narrowed — BROWSEFIXED and SCROLLBAR were
strengthened, M1WRITERSET re-derived; all sixteen §14 cells swept, with the designated killer
confirmed by execution on six Stage-2 mutants (`110 113 116 118 119 122`). **Three findings open:**
**M1 (Structural)** — a `browse→browse` mover is now a `pageCache`-owned `.browsepage`, and no cell
drives its destruction mid-gesture by `Browse.clearCache()` (reached from `Net.onReconnect`,
`js/app.js:3118`), `Browse.reset()`, or a mid-gesture `applyScreen(…, {render:true})`;
`resetSwipeStyles` cannot reach a detached page (`js/nav.js:114` is a document query). The sibling
invariant is already held and tested for the touch-target row (`test/swipe-gesture.test.js:24-25`).
Owner: the planner (intended behaviour, alongside W44) → the test author. **Close before step 11**,
which walks that region. **M2 (Gap)** — `Browse.pageElFor`'s documented throw-on-miss has no cell;
both stand-ins re-implement the throw, so a `return null` ships green. Owner: the test author.
**M3 (Gap)** — the `CLB` source-text purge gate (`clobbered`/`sourceWasClobbered` absent from `js/`)
went out with `test/swipe-stage6d.test.js`; §12 never listed it and its subject is still live. Owner:
the planner. Watch-list **W12** is discharged by deletion — close it.
**Standing:** NOW PLAYING STAYS UNIQUE (user decision, DecisionLog) — do not consistency-fix it.
The red `--page-bg` diagnostic gradient at `css/app.css:41` is DELIBERATE and stays until the user
says otherwise.

### ⛔ Records lost to a revert — the failed experiment, and the gate that now prevents the loss
`6c9e7e3` ("Park Options/subs like a real screen switch; stop painting their own background",
`.277`) made `#options` and the five settings subs transparent AND parked the view beneath them.
**It was wrong on-device:** the Options hub and the General sub rendered THROUGH each other
(screenshot). Reverted by `2700b5c`. **Do not retry transparency-plus-parking for the Options group
as one step** — the later, working approach demoted them to ordinary peers instead.
That revert also silently deleted 54 lines of records (25 board + 29 DecisionLog) that `6c9e7e3`
had carried, because a build commit here lands code AND records together — so reverting the code
reverts the record. A failed experiment's record is MORE valuable after the revert, not less.
**Now gated:** `tools/hooks/revert-keeps-records.mjs` + `tools/hooks/pre-push`, proven by
`test/revert-keeps-records.test.js`. ⚠️ The gate lives on **pre-push**, not commit-msg, because
`git revert --no-edit` fires NO hooks at all (measured); `commit-msg` is only an early catch.

## 🐞 Open known bugs (diagnosed, not fixed)
| Bug | Sev | One-line | Depth |
|---|---|---|---|
| SW surprise-auto-update | — | warm-foreground: waiting worker self-activates (`userApply=false`) → reload with no tap; the `.74` fix is incomplete + shipped-unverified. **Instrument what activates the waiting worker before editing sw.js** (`.1`–`.6`/`.20`/`.74` graveyard). | DecisionLog (OPEN) |
| iOS lock-screen play-from-paused | med | AVAudioSession PLATFORM limit, not web-fixable (WebKit #198277 / Apple DevForums 762582); `.99` mitigates (defer + auto-resume on unlock); true fix = native audio. | `[[tomeroam-lockscreen-resume-kill-bug]]` |
| resume plays nothing (1st tap dead) | med | download-index restore race → a downloaded book streams; cold-relay stream stalls with no retry (stall ≠ error). Fix = `Downloads.whenReady()` gate. | `[[tomeroam-resume-stream-race-bug]]` |
| cross-device resume ~10s out of sync | med | relay-degraded device reads peer board stale → falls back to un-extrapolated durable pos; NOT a sync-math bug; `.157`/`.164` fixed contributing mechanisms, primary diagnosis untouched — re-measure on device. | `[[tomeroam-crossdevice-stale-sync-bug]]` |
| parked browse page rides on top of Home for a whole forward swipe | high | MEASURED on `.303` (7/7 touchmove samples, Δ = −4px): `.browsepage.parked`'s `translateX(-101vw)` is relative to `#browse`, which is itself the incoming mover at `+w` on `home→browse`, so a parked page composes onto Home by construction. Fix planned: `-300vw` (out of reach of any container displacement), one CSS declaration. Plan reviewed 2026-08-02: **TEMPER** — value and floor confirmed, two Structural corrections owed (F1 outgoing-mover sign, F2 the floor cell pins a number not a law). | `Claude/Plans/PLAN-parked-page-rides-home.md` + `Claude/Charpy/PLAN-parked-page-rides-home-charpy.md` + `Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md` |

The latter two share a root — **conn flapping relay↔local**; pinning board reads to the fast local path would help both.

## 🔭 Planned / backlog (designed, not built)
- **Parked-page-rides-Home fix — TEMPER (2026-08-02), back with the planner:**
  `Claude/Plans/PLAN-parked-page-rides-home.md`, review at
  `Claude/Charpy/PLAN-parked-page-rides-home-charpy.md`. One CSS declaration —
  `.browsepage.parked` `translateX(-101vw)` → `-300vw` — derived as a distance LAW (the offset must
  exceed `#browse`'s max displacement, 100vw, plus the page width, 100vw). **The value, the 200vw
  floor, Invariant P compatibility and the option set all survived the strike; the shipped constant
  does not change.** Two blocking corrections: F1 — §4's proof that `browse→home`/`browse→overlay`
  cannot overlap has the wrong sign (a BACK gesture drives the outgoing mover to `+w`, not `−w`), so
  dimension 8's exemption rests on false arithmetic; the real reason is that `browse→home` never calls
  `showPage`, so no page is parked. F2 — `PARKOUTOFREACH` does not compute the floor from its terms as
  §8/R3 claim: term 2 is an unpinned literal and assertion (i) has zero marginal detection under the
  stated mutants. Four Weak + two Note besides. Next owner: Vitruvius (the plan is his to temper);
  then Curie, then Brunel. Device-owed, unchanged: cover retention at the new distance, and whether
  this is the whole of the reported garbage.
- **Build-gate spec corrections — RATIFIED + FROZEN (2026-07-24, Charpy FORGE):**
  `Claude/Plans/PLAN-build-gate-spec-corrections.md`, approved wording locked in `~/.claude/frozen-artifacts.txt`
  (freeze-guard verified). Corrects the installed Gate A/B spec (Brunel.md Local §) for the user's
  2026-07-23 defects. Charpy's crack (correct): C1 as first written would have relocated the F1 dead-
  returned-field defense OFF the live code-level gate (`dead-return-fields.mjs`/`construction-consumers.test.js`)
  — which is the only check that catches the class — onto a records reconciliation that can't (a field
  consumed BEFORE the return passes a records check). Revised: (C1) code-level gate STAYS Gate A's basis;
  the contract↔ledger reconciliation is a plan-authoring complement the Vitruvius authoring gate ALREADY
  runs (`vitruvius-plan-gate.sh` 298/313), not a new build check; (C2) semantic duty split by DECIDABILITY —
  Charpy pre-FORGE for EXISTING consumers, the code-level gate at Brunel admission for newly-built ones;
  (C3) Gate B designated-test proof, `campaign-gate.mjs` deferred; (C4) `[cell-id]` new protocol, manual
  until read. **Confirmed root cause = an AUTHORING-GATE ESCAPE:** the Stage-5 plan is RATIFIED yet FAILS
  `vitruvius-plan-gate.sh` today with 6 violations (missing contract/effects/coverage blocks + 3 ambiguous-
  owner rows) — the gate exists but is unwired, so ratification outran it. §7 routes "wire the authoring
  gate?" (legacy-plan migration cost) + §9 "review-gate persona-spec edits?" as OPEN — not unilaterally
  done. **§9 items DECIDED + BUILT (2026-07-24):** (1) Vitruvius authoring gate WIRED —
  `~/.claude/hooks/vitruvius-plan-gate-hook.sh` (PostToolUse, `Claude/Plans/*.md`) blocks a structurally-
  incomplete plan on write; new/modified/ratified plans gated, untouched legacy grandfathered by
  construction, and a `Type: plan` file can't dodge it by omitting the declaration. (2) Persona specs
  INSTALL-ONLY — `~/.claude/hooks/persona-spec-guard.sh` (PreToolUse) DENIES direct edits to
  `~/.claude/personas/**`; changes must come from a Charpy-FORGED plan + mechanical Zelda install of the
  frozen patch. Both proven (fixture-fail + real-pass); go live after a `/hooks` reload/restart. **Next:**
  corrections still cleared to INSTALL into Brunel.md/Charpy.md per §6 — now necessarily via the mechanical
  frozen-patch path (the persona guard blocks hand-editing), on request.
  **Install patch PRODUCED (2026-07-24):** `Claude/Vitruvius/INSTALL-PATCH-build-gate-spec-corrections.md`
  — verbatim Brunel.md (Gate A/B Local §) replacement + Charpy.md D10 insertion, conforming to plan §5/§6 +
  r2 F2r ("returned-key gate WITH the exact-key contract gate for destructured reads"). This is the
  artifact the frozen plan §6 CLAIMED was "held" but which never existed (§6 overclaimed; Zelda correctly
  refused to fabricate persona text on the spot). Charpy conformance-verify was **TEMPER**
  (`Claude/Charpy/INSTALL-PATCH-build-gate-spec-corrections-2026-07-24.md`), now **REVISED** (F1–F4),
  pending Charpy re-verify. Charpy's catch (correct + pointed): the patch ADDED the sibling-sweep
  discipline D10 while COMMITTING the sibling-sweep miss — three stale `D1–D9` enumerations
  (`Charpy.md:305`/`:339`, `Vitruvius.md:507`). Fixed: PATCH 2 gains the two Charpy scrubs + new PATCH 3
  scrubs Vitruvius.md (now **3 install targets**); HEAD-wide `D1–D9` set confirmed = those three. F2 (global
  spec bakes in TomeRoam paths) DECIDED **(b)**: Gate A/B scoped TomeRoam-only (lives in Brunel's
  project-Local §); the Brunel-adapter abstraction is future work when a 2nd project needs it. F3 (strip
  display `>` on apply) + F4 (heading names both mechanical gates) folded. Filed under `Claude/Vitruvius/`
  NOT `Claude/Plans/` — the wired plan gate correctly flagged it when first mis-filed there (a `Status:`
  line reads as a plan). Not installed; frozen plan untouched. **Next:** Charpy re-verify → freeze → Zelda
  mechanical install (de-quote the `>` on apply).
- **Reset identity-envelope hardening** (reviewer-set order): `pb_prog2Keys` identity envelope; **dev8 collision CONTAINMENT** (keep the 32-bit title namespace, match self only on FULL client id — do NOT widen/migrate); download-staleness API split (`hasDownloadRecord`/`isDownloadUsable`/`isDownloadStale`). Depth + the probability-vs-proof reasoning rule → `[[tomeroam-reset-tombstone-plan]]`, `[[tomeroam-durable-progress-plan]]`, and the process lessons in `[[tomeroam-status-board]]`.
- **Native cross-app resume (no LMS):** capture the currently-discarded `PlaySessionStateNotification.viewOffset` → durable `Progress`; optional `/status/sessions` launch poll → `[[tomeroam-crossapp-resume]]`.
- **"Delete all downloads":** deferred by user (`.119`); a real data-loss gap (removing the iOS icon destroys everything silently), not a space issue.
- **Tombstone compaction:** the last unbuilt reset piece; low urgency → `[[tomeroam-reset-tombstone-plan]]`.
- **Records/memory hygiene (deferred 2026-07-20, not urgent):** (1) **Slim the memory hub** `tomeroam-rebrand` to repo-underivable content only (footguns / verified facts / architecture rationale / identity) and demote its cache-value — tactical status and "standing intent" that is really decisions — to pointers; it is ~60% source / ~40% cache and the cache half will drift like the old status board did. (2) **Run a `consolidate-memory` pass** — three stale/over-broad items surfaced just by being touched this session (the deploy-rule "docs bump" over-broadening, the hub-maintenance OPEN-list, the drifted status board), which signals rot being trusted at session start. Principle to apply: memory holds only what `git log` + `Board.md` + `DecisionLog.md` cannot derive.
- **Plugin activation:** the LMS plugin was **renamed to "TomeRoam Bridge" (2026-07-29)** — repo
  `nzilberberg/TomeRoamBridge` (private, fresh history), tree `Desktop\TomeRoamBridge-src\TomeRoamBridge\`.
  Staged plugin changes still need an **admin reinstall** (resume-playlist rename, Presence mesh, PlexDb
  read-only) to activate LMS→app cold resume, and that deploy is now also the rename deploy: it must remove
  the superseded plugin directory (or LMS loads both) and migrate the old prefs file to
  `tomeroambridge.prefs`, or every setting including the Plex token is lost. **Exact paths and the full
  ordered procedure live in the private plugin records** (`tomeroam-bridge-plugin` memory) — deliberately
  not restated here, since this repo is public and the superseded name is being retired from it. The app is
  unaffected until the deploy runs; app-only users never need it.

## ✅ Recently closed (kept only as "don't re-investigate")
- **"iOS keeps an unclearable cover cache" — DISPROVEN, CLOSED (`.149`).** Epoch-clean reading proved every cover goes through the SW and re-caches; covers just re-download fast, which *looks* like nothing cleared. Airplane mode is not a valid test of the clear.
- **Options→HUB refactor · library-scaling virtualization · durable-progress spine + device-delete** — all built; scaling on-device gate passed → `[[tomeroam-durable-progress-plan]]`, `[[tomeroam-library-scaling-plan]]`.
