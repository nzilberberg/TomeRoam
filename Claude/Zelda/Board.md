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

## 🐞 Open known bugs (diagnosed, not fixed)
| Bug | Sev | One-line | Depth |
|---|---|---|---|
| SW surprise-auto-update | — | warm-foreground: waiting worker self-activates (`userApply=false`) → reload with no tap; the `.74` fix is incomplete + shipped-unverified. **Instrument what activates the waiting worker before editing sw.js** (`.1`–`.6`/`.20`/`.74` graveyard). | DecisionLog (OPEN) |
| iOS lock-screen play-from-paused | med | AVAudioSession PLATFORM limit, not web-fixable (WebKit #198277 / Apple DevForums 762582); `.99` mitigates (defer + auto-resume on unlock); true fix = native audio. | `[[tomeroam-lockscreen-resume-kill-bug]]` |
| resume plays nothing (1st tap dead) | med | download-index restore race → a downloaded book streams; cold-relay stream stalls with no retry (stall ≠ error). Fix = `Downloads.whenReady()` gate. | `[[tomeroam-resume-stream-race-bug]]` |
| cross-device resume ~10s out of sync | med | relay-degraded device reads peer board stale → falls back to un-extrapolated durable pos; NOT a sync-math bug; `.157`/`.164` fixed contributing mechanisms, primary diagnosis untouched — re-measure on device. | `[[tomeroam-crossdevice-stale-sync-bug]]` |

The latter two share a root — **conn flapping relay↔local**; pinning board reads to the fast local path would help both.

## 🔭 Planned / backlog (designed, not built)
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
- **Plugin activation:** staged plugin changes need an admin `install-plexbooks.bat` reinstall (resume-playlist rename, Presence mesh, PlexDb read-only) to activate LMS→app cold resume. The app is unaffected until then; app-only users never need it.

## ✅ Recently closed (kept only as "don't re-investigate")
- **"iOS keeps an unclearable cover cache" — DISPROVEN, CLOSED (`.149`).** Epoch-clean reading proved every cover goes through the SW and re-caches; covers just re-download fast, which *looks* like nothing cleared. Airplane mode is not a valid test of the clear.
- **Options→HUB refactor · library-scaling virtualization · durable-progress spine + device-delete** — all built; scaling on-device gate passed → `[[tomeroam-durable-progress-plan]]`, `[[tomeroam-library-scaling-plan]]`.
