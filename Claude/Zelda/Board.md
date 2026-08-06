# TomeRoam — Board (Zelda) · living tactical state

The single home of **tactical state**: what's in flight, what's shipped-unverified, what's
open, what's next. Update the SAME turn state changes. Derive the build from
`js/debug.js` / `build.json` — never a number written here. Derive HEAD from `git rev-parse HEAD`
— never a commit id written here: the commit that writes the line is the commit that moves HEAD, so
a board line naming HEAD is stale the instant it lands.

**Division — do not duplicate (each fact has one home):**
- Settled decisions → `Claude/Decisions/DecisionLog.md`
- Code reviews → `Claude/Poirot/`
- Plans → `Claude/Plans/`
- Durable process lessons + read-index → cross-session memory (`tomeroam-status-board`)
- Deep per-bug diagnostics → the per-bug memory sagas (linked below)

This board **points** to those for depth; it never restates them. They point back here for
tactical state instead of keeping their own copy.

---

## 📍 CURRENT STATE — 2026-08-06 (read this first)

**Handoff packet: `Claude/Zelda/HANDOFF-2026-08-06.md`** — written to be picked up *without* the
conversation that produced it. It carries the spine, the next action, the open items and the traps.

- **`main` == `origin/main`, tree clean · build `2026-08-05.2` · suite 900 / 899 pass / 0 fail /
  1 skip · 14 of 14 campaigns COMPLETE.** Re-executed and confirmed 2026-08-06: the suite via
  `node --test "test/*.test.js"`, the manifests via `tools/campaign/stage-gate-check.mjs` over
  every file in `Claude/Campaigns/`. The count rose from 887 when the `board-ids` gate landed.
- ⛔ **There is no "phase 1–10."** That framing exists in no plan and cost three failed attempts to
  answer "where are we". The spine is **`Claude/Plans/PLAN-swipe-reveal.md` §7, line 736 — PLAIN
  TEXT, not markdown**, which is why markdown-shaped greps never found it. Ten stages.
- **Stages 1–6 done** (6 sliced 6a…6i, each with its own sub-plan and manifest). **Stage 7 is IN PLAN
  REVIEW — round 2 owed.** Stages 8, 9, 10 not started.
- ⚠️ **Two independent numbering systems both say "stage"** — the reveal spine above, and the de-clone
  workstream whose numbers the campaign manifests use. Always say which one you mean.
- **NEXT ACTION — the adversary's strike on U1 (`§17` step 2), dispatched 2026-08-06.** Plan review is
  DONE: round 2 returned TEMPER (`c2369f8`) and the temper is applied (`734b393`) with every
  acceptance predicate executed. **No round 3 is owed.** The strike is commissioned blind — the two
  agreeing readings of the exit set are withheld from it, because two agreeing readings are two
  readings and this campaign's enumerations have now been incomplete ten times, every one found by
  executing. ⛔ Its result must NOT be treated as confirmatory of either reading.
- **Open, none blocking stage 7:** §14's deferred lifetime invariant, now trigger-gated by
  `MOVERLIFETIMETRIGGER`; two unbuilt tooling mechanisms (registry-vs-declared mutants;
  stated-vs-measured killers); **`T-LP1`** letter pickers (user-deferred, pre-existing, symptoms not
  yet derived — ask before routing); de-clone device item 5, which needs a >600-item library the user
  does not have. `tools/bench-virtual-swipe.mjs` narrows item 5 on Blink but **does NOT close it** —
  it reads DOM geometry, not paint, and says nothing about iOS WebKit.

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

**Stage A1b BUILT + SHIPPED (build `2026-07-31.290`, `Claude/Brunel/one-screen-type-stageA1b-build.md`,
BUILD_GREEN) — its adversary/code-review/coverage gates skipped at ship time are being cleared
retroactively, in that order.** **Adversary gate CLEARED (2026-08-03): Loki HELD_STONE**
(`Claude/Loki/STRIKE-one-screen-type-a1b.md`, struck blind at HEAD `cef1093`). Both enumerations
verified exhaustively at source (`js/nav.js:71` is the sole `hidden`-adder on `#nowplaying` in all of
`js/`, vendor included; the synchrony claim holds across every re-entry point) and the behavior
executed in real Blink: at-rest exclusivity after every NP open/abort/commit leg (the §5.3.1
accumulation is dead on glass), §9 edge 5 (supersession with NP current) executed and benign as
claimed, the filmstrip-window residue closed and its reconcile idempotent, and a plane the plan's
cost census never named — Books scroll across the new `display:none` — executed and PRESERVED
(engine primitive + full path, 900→900). Named residual for the step-9 device gate: the scroll proof
is Blink; the device is WebKit — *scroll Books deep, open NP, close it, you must come back where you
were*. Four un-prosecuted lesser planes in the casebook (incl. nothing gates single-writer-ness — a
future second `hidden` writer greens the suite; Mendeleev's).

**Code-review gate CLEARED (2026-08-03): PASS — fix-then-ship**
(`Claude/Poirot/POIROT-one-screen-type-a1b-e6a2f2e.md`, target `e6a2f2e`, reviewed at HEAD `690162c`).
The product change is two deleted conditions and nothing else — no fourth category in the diff — and
all nine touched/registered mutants were re-swept **in the foreground at HEAD this pass** (indices
re-derived from names; the build log's numbers have shifted): 0 uncaught, 0 unapplied, 0 stale, tree
clean throughout. Both generators reproduce HEAD content-identically; the full battery is green;
`NPUNTOUCHED`'s source-scan cell is untouched and still mutation-killed (`NOSETTINGSBG-b`). Each of
the five test casualties is a genuine casualty of the design change — three unskips with no weakened
assertion, two retirements whose subject A1b abolishes — and the casualty the plan's §6a table missed
(`test/nav.test.js`) was **inverted, not deleted**, and is a live killer of `NPPARKS-b`. **Four false
statements in HEAD to scrub, two created by this commit**, none blocking the device gate: F1 a
"CONFIRMED" claim naming the mutant this commit de-registered; F2 the red suite's `js/nav.js:81`/`:78`
citations, which at HEAD land on the navbar's own `hidden` toggle; F3 the plan's Status table still
saying A1b's build is not open (`:39`, `:98`) while §13 steps 1/8 in the same file say it is; F4 the
CELL MAP still describing the retired NP-back-reveal behaviour. Two Observations routed to Mendeleev
(§14 vs the shipped cells; the ungated single-writer property). **Next per the dispatcher: the
coverage audit (`Claude/Mendeleev/AUDIT-one-screen-type-a1b.md`), then the step-9 device gate —
which should carry the adversary's added item (scroll Books deep, open NP, close it) and has no
`DEVICE-*` record.**

**Findings F1–F4 applied (2026-08-03, Brunel apply-review of `POIROT-one-screen-type-a1b-e6a2f2e.md`;
no product code touched, per the review's own verdict).** F1: `test/one-screen-type.test.js`'s
NPUNTOUCHED preservation-cell comment now names its live registered mutant, `one-screen-type
NOSETTINGSBG-b` (plan §14's stated replacement for the retired `NPUNTOUCHED` mutant), and states the
narrower truth (only the `background` assertion is mutant-defended); confirmed by execution — mutant
`#86`, killed by NPUNTOUCHED's source-scan cell together with NOSETTINGSBG. F2: the two stale
`js/nav.js:81`/`:78-80` citations in `test/one-screen-type-npparks.test.js` (the header at `:12-13`
and the NPPARKS-from-settings assertion message at `:128-129`) are corrected to `:71`/`:69-70`,
re-verified against `js/nav.js` at HEAD (`:71` is the sole `#nowplaying` `hidden`-adder; `:78` is the
navbar's own toggle). F3: the plan's Status table (`:39`), the "next stage" sentence (`:98`), and
§13 steps 1, 8 and 10 now read the shipped truth — round 3 FORGE, build `e6a2f2e` / `.290` SHIPPED,
code review PASS fix-then-ship, adversary HELD_STONE; step 9 also gains Loki's named residual
(scroll Books deep, open NP, close it — WebKit-owed, Blink-proven). F4: the CELL MAP no longer states
the retired NP-back-reveal behaviour. Full suite green, mutant `#86` executed this pass, tree clean,
no `.mutbak`. Build log `Claude/Brunel/one-screen-type-a1b-findings-apply.md`. **F5/F6 are NOT this
pass's — they stay routed to the coverage auditor.**

**Coverage-audit gate RUN, NOT CLEARED (2026-08-03): GAPS_NAMED**
(`Claude/Mendeleev/AUDIT-one-screen-type-a1b.md`, audited at HEAD `6fb3b21`). The suite proves the
stage's **statements** — all eleven mutants on the `one-screen-type` family re-swept in the
foreground at HEAD (indices re-derived from names; `76 85–94`): 0 uncaught, 0 unapplied, 0 stale,
tree clean, no `.mutbak`; full battery 824/823 pass, the one skip pre-existing and unrelated. Every
one of the five test casualties leaves its dimension defended. The device-owed set is **not**
over-claimed at any of the four sites that state it. **Three bare cells, each filed with the
properties of the test that fills it, all routed to Curie.** **G1** — `NPRECONCILE` asserts a
*relative* property (`after === entry`), so it cannot fail wherever the defect is already present at
entry: mutants `#89` (`NPPARKS-a`, the `#home` park) and `#91` (`NPPARKS-b`, the settings loop) both
**pass** it, and its `after1 === entry` assertion has never failed under any mutant or at pre-A1b
HEAD. The abort-reconcile path therefore proves the `#browse` re-hide and nothing else; the `#home`
re-park is proven on the button-nav path only — the exact gap shape `PEERFINALIZE` exists to close.
Occupant: one **absolute** `parked('home')` assertion after abort 1, which must make `#89` gain
`NPRECONCILE` as a second killer. **G2** — Loki's routed finding upheld: nothing gates
single-writer-ness of `hidden` on `#nowplaying`, and that enumeration **is** the licence for
retiring ratified probe mark §4.2. Occupant: a source-derived writer-set gate on the
`test/scroll-writer-set.test.js` (`M1WRITERSET`) pattern — three directions, a named textual bound,
anti-vacuity, an additive mutant and a selftest. **G3** — Poirot's F5 first half confirmed: §14's
`NPUNTOUCHED` row requires a `body.np-locked .navbar` stacking assertion (`css/app.css:629`,
`z-index: 70`) the cell has never carried; deleting it today reddens nothing. Also filed: **M1**
Poirot's F6 **widened** — `test/page-bg-single-painter.test.js` states the retired NP-back-reveal
mechanism at `:12-14` **and again at `:55-56`, inside the assertion message**, which carries no
"additive overlay" phrase and so escapes step 17's scrub (owner Brunel, not deferrable). **M2** §14's
`NPRECONCILE` fixture spec says "exactly one screen element besides nowplaying lacks both hidden and
parked" — under A1b that number is **zero**; "one" describes the defective state, and it is the model
sentence directly upstream of G1. **M3** Poirot's F5 second half is one instance of a wider drift:
§14's mutation column declares 17 mutants whose total is right only by coincidence — four registered
mutants (`#90`, `#93`, `#94`, `#95`) appear in no §14 row and three are double-counted. M2/M3 route
to the planner. **The campaign `coverage-audit` gate accepts `ADEQUATE` alone, so it reads FAIL —
filed verdict `GAPS_NAMED`. That is the gate working.** Proceeding to step 9 with the gaps in view is
the user's call.

**Curie gap-fill COMPLETE — G1/G2/G3 + M1 authored, every new mutant EXECUTED (2026-08-03)**
(`Claude/Curie/one-screen-type-a1b-gapfill-test-design-2026-08-03.md`). **G1** — `NPRECONCILE` gains
an ABSOLUTE `parked('home') === true` after abort 1 plus a settings-source companion cell (from the
Options hub, open NP, back-swipe NP→options to abort, assert `hidden('options')` absolutely — the
FORWARD abort cannot witness it, `js/app.js:522`'s sweep hides `#options` whatever `setView` does).
Acceptance met by execution: `#89` `NPPARKS-a` now `caught (2)` with `NPRECONCILE` as its second
killer (it had exactly one), and `#91` `NPPARKS-b` `caught (3)` with the companion. **G2** — new cell
`test/np-hidden-writer-set.test.js` (`NPHIDDENWRITER`, 5 tests): the FULL inventory, not the cheaper
half, plus the synchrony pin. It registers BY CLASS according to whether the derivation can resolve
the target — a `$('someid')` receiver's id is derived (invariant: exactly one names `nowplaying`), a
`$(v)`-over-a-same-line-list receiver has the LIST checked for the token, and only unresolvable
receivers (16 locals + 1 query selector) carry hand-written reasons. Plus an ALIAS closure covering
all five write routes including `className =`, a spread-constant closure, three directions,
anti-vacuity, four residuals stated in the cell, and a selftest. ⭐ **MEASURED, not assumed: it does
NOT need a `SOURCE_TEXT_GATES` exclusion** — exactly five of the 140 registry entries inject a
hidden-write or `nowplaying` payload (`#85 #87 #88 #90 #91`), each was applied and this gate ran
green under all five, so `tools/mutation-sweep.mjs` was left untouched and the gate carries real
executed sweep evidence. Four behaviourally-inert mutants `NPHIDDENWRITER-a/-b/-c/-d` (duplicate
writer / alias write / a sweep widened by one word / setView reordered) — all four `caught`, each by
this cell ALONE. **G3** — `NPUNTOUCHED` gains a `ruleBody('body.np-locked .navbar')` assertion with
its own anti-vacuity guard, asserting the navbar's z-index is STRICTLY above `.nowplaying`'s; mutant
`one-screen-type NPNAVBAR` deletes `z-index: 70` and is `caught (1)` by that cell alone. **M1** — the
retired NP-back-reveal mechanism was in FOUR places in `test/page-bg-single-painter.test.js`
(`:1-2`, `:12-14`, and twice in the assertion message at `:53`/`:55-56`), all replaced with the
current co-required-properties reason. Suite **830/829 pass, 0 fail, 1 pre-existing skip**; the whole
family re-swept against the FINAL state (`76 85–99`, two foreground batches): 0 uncaught, 0
unapplied, 0 stale, no `.mutbak`. ⚠️ Registering `NPNAVBAR` before the `FILMSTRIPDRAG` block **shifted
every later mutant index by one** — M3's `#90/#93/#94/#95` citations must be re-derived by NAME.
**Next: the coverage auditor, for the re-audit the `coverage-audit` gate needs to accept `ADEQUATE`.**

**Coverage-audit ROUND 2 — ⭐ ADEQUATE, 2026-08-03**
(`Claude/Mendeleev/AUDIT-one-screen-type-a1b-r2.md`, re-audited at HEAD `4250401`; round 1 is not
edited and is superseded). All three bare cells **closed**, each verified by a mutant this seat
applied itself rather than read: full suite 830/829 pass, family re-swept in two foreground batches
(`76 85–91`, `92–99`, indices re-derived from names against the 140-entry registry) → 0 uncaught, 0
unapplied, 0 stale, tree clean, no `.mutbak`. **G1** — `NPRECONCILE` gains an absolute
`parked('home')` after abort 1 plus a settings-source companion; `#89 NPPARKS-a` goes from **1
killer to 2** (the acceptance test named in advance, met) and `#91` from 2 to 3. ⭐ Curie's own catch
inside the fill: the companion had to use the **back** swipe, because on the forward NP→files abort
`showAppView`'s sweep hides `#options` whatever `setView` does — the forward direction would have
passed vacuously. **G2** — new gate `NPHIDDENWRITER` (5 tests, `test/np-hidden-writer-set.test.js`,
mutants `#96`–`#99`), each caught by that cell **alone**. ⭐ `#99` (a `setView` reorder that breaks
the reveal without changing the writer count) is caught by **one test in the whole suite** and by
none before this round. Verified independently that the gate is **not** in `SOURCE_TEXT_GATES` and
appears as a killer of **none** of `#76`/`#85`–`#95` despite eight of those mutating the files it
scans — so it carries real sweep evidence where `M1WRITERSET` needed an exclusion. Its
registration-only-where-underivable departure is **upheld as equal-or-stronger**: the identity
inventory keeps all three directions and is the backstop, the write inventory is the reach, and the
two cross-check. Residuals **upheld as an honest bound** (`className` disclosure says ~50, measured
47; `index.html` has 33 script tags, all `src=`). **G3** — `NPUNTOUCHED` gains a derived
strictly-greater navbar-vs-NP z-index comparison; `#95 NPNAVBAR` caught by that cell alone. **M1**
was **four** sites, not the two filed — all corrected. New: **N4** two inline-style routes
(`style.cssText`, `setAttribute('style'…)`) escape the alias closure and are unnamed in `RESIDUALS`
— executed; Note not Gap (zero such sites at HEAD, and every naming route is still caught), one-line
fix stated. **N5** the write inventory's missing rot/group-count directions judged sound, recorded so
it is not re-opened. **C1** correcting my own M3: only **one** index shifted, not four — the
`FILMSTRIPDRAG` 340ms mutant is now `#100`; `#90`/`#93`/`#94` still address what M3 says.

⛔⛔ **THE GATE CANNOT READ THE VERDICT — the F14 defect, on a second gate.**
`Claude/Campaigns/one-screen-type-a1b.json`'s **`coverage-audit`** gate is the **only one of the six**
whose `verdictArtifactGlob` carries no wildcard (`Claude/Mendeleev/AUDIT-one-screen-type-a1b.md`).
`globFiles` compiles it to an exact-filename anchor, so `-r2.md` never matches and
`artifactsOfRecord` never sees it — the gate reports round 1's `GAPS_NAMED` forever. This is exactly
what `3c89349` fixed on this manifest's `plan-review` gate; that fix was applied to the one gate that
had just failed and the other five were never swept. **Fix is one token:**
`…/AUDIT-one-screen-type-a1b*.md`. **Proven by execution against a scratch copy, the campaign file
untouched:** as shipped → `INCOMPLETE: 1 gate(s) not cleared`; with the wildcard → the gate reads
`ADEQUATE` and **all six report COMPLETE**. ⛔ **Deliberately NOT applied by the auditing seat** — a
seat widening the glob that gates its own verdict is a shape not to accept, however right the fix.
Owner: whoever owns the campaign record, and the same sweep should check every other manifest in
`Claude/Campaigns/` for the literal-glob class.

**Planner tail CLOSED — M2, M3 (with C1) and N3, 2026-08-04** (`Claude/Plans/PLAN-one-screen-type.md`,
records-only, no build bump). **M2** — §14's `NPRECONCILE` fixture said "exactly one screen element
besides nowplaying lacks both hidden and parked" after each abort; under A1b that number is **zero**,
so the model stated the pre-A1b defect as the expectation and a literal reading of it authors a
permanently-red cell. Rewritten to what A1b guarantees, with the shipped cell's **absolute**
assertions specified beside the relative ones and the reason for both. ⭐ **Same staleness found in a
second row the audit did not name: `PEERFINALIZE`'s fixture listed three gestures and never the
A1b-relocated edge-3 scenario** the shipped cell has driven since `e6a2f2e` — corrected. **M3** — the
"seventeen mutants" total reconciled only because four unlisted mutants cancelled three
double-counted ones. §14 now carries a per-cell accounting table: **nineteen distinct registered
mutants across nine shipped cells**, shared mutants named in both rows and counted in exactly one,
plus the **new `NPHIDDENWRITER` row** owed since round 1's G2 (it existed in `test/` and in no §14
row). ⛔ **Mutants are now cited by NAME, never by index** — every index in the plan was re-derived
against `tools/mutate.mjs --list`; the Status section's `#113`/`#111`/`#112` all addressed different
mutants and are now named. **C1 confirmed independently: the `FILMSTRIPDRAG` 340ms net is `#100`**
(`#95` is `NPNAVBAR`), and `#90`/`#93`/`#94` still address what M3 said. **N3** — edge 5's exclusion
STANDS; what was missing was a trigger, since §9's re-open condition was re-checked only at step 16,
which runs once at the end of Stage B and then closes with the plan. §9 now states the identity as
**two source predicates** (`setView` takes exactly one parameter, `js/nav.js:45`; `applyScreen`'s NP
branch passes the literal `'nowplaying'` and no options, `js/nav.js:150`) which close it by
construction, and **new §13 step 10a** routes both to Curie as two assertions in `NPHIDDENWRITER`'s
synchrony cell plus one mutant. ⚠️ **Found in passing: every line citation into the decision log
moved by +12** — the ratified NP entry is `:1159-1179`, not `:1147-1167`; an entry was INSERTED above
it instead of appended. The plan's eighteen citations are corrected; **the probe, the A1b audits and
this board still carry the pre-shift numbers.**

**Curie tail CLOSED — §13 step 10a, N1 and N4, 2026-08-04**
(`Claude/Curie/one-screen-type-a1b-tail-test-design-2026-08-04.md`; test + tooling only, no product
code read for editing and none changed, no build bump — `test/`, `tools/` and `Claude/` are outside
`shipping-change-bumps-check.mjs`'s shipping set by construction). **Step 10a** — §9's two edge-5
predicates are now asserted inside `NPHIDDENWRITER`'s synchrony cell: `setView`'s declared parameter
list is exactly `['v']`, and `applyScreen`'s NP branch passes exactly `['nowplaying']`. Each message
names §9's ruling and states that the green is what keeps edge 5 uncovered, so a red reads as "the
ruling has lapsed, route it to the planner". ⭐ **The cell's `setView` locator had to change first,
and this is the finding**: it spelled `indexOf('function setView(v)')`, so the acceptance mutant made
it fail on the FIXTURE guard with neither predicate evaluated — a red for the wrong reason, which is
no evidence. It is now signature-agnostic and the captured parameter list IS assertion 1's subject.
**TWO mutants, not one**, because `assert` throws on the first failure and one mutant would leave
assertion 2 unproven: `NPHIDDENWRITER-e` (two-part — second parameter + option threaded) kills
assertion 1, `NPHIDDENWRITER-e'` (option threaded into a still-one-parameter `setView`, legal and
ignored) kills assertion 2. ⚠️ **§13 step 10a's "reddens this cell alone" is NOT literally met and is
disclosed rather than tuned away** — each also reddens the identity cell on Direction 1, because
registered entry #11 is the whole NP-branch line, so a changed argument list reads as a new
unregistered site. That firing is correct; ⛔ shortening entry #11 to let the mutant past would be
tuning the baseline to the test. Attribution was established the stronger way, by reading each
mutant's synchrony-cell failure message. **N1** — `NPUNTOUCHED`'s three undefended assertions gain
`one-screen-type NPFIXED`, `NPINSET` and `NPZ60`, each deleting one declaration from `.nowplaying`'s
shared line; **no assertion was found unmutatable**. The one needing care was `z-index: 60`: with the
declaration gone `zIndexOf` returns `null` and the cell's `navZ > npZ` comparison still passes on
coercion, so the kill had to be confirmed to land on the `z-index: 60` match assertion itself — it
does. The cell's note claiming those three had no mutant was scrubbed. **N4** — the audit's one-line
fix applied: `ALIAS_WRITE_SUFFIX` widened to `(?:display|cssText)` and `['"](?:class|style)`, so both
routes the audit measured as escaping are caught; `NPHIDDENWRITER-f` proves the new arm bites on real
source. Deliberately NOT added to `WRITE_PATTERNS` — site-inventorying `cssText` would derive every
DOM-builder call in `js/debug.js`; same treatment as `className =`, and the asymmetry is now stated.
**The residual bound is MEASURED**: the selftest executes the two routes that still escape
(`style.setProperty`, a computed `el.style['display']`) and the scope cell now requires them to be
named in `RESIDUALS`. Suite **835/834 pass, 0 fail, 1 pre-existing skip**; twelve mutants re-swept
against the FINAL state in two foreground batches (`86 95–99`, `100–105`, indices re-derived from
names against the 146-entry registry) → 0 uncaught, 0 unapplied, 0 stale, no `.mutbak`. ⛔ Those
indices are of-this-commit only — cite by name.

**Still open in this campaign:** r2's successor stages — A1b (**shipped `.290`; adversary HELD_STONE,
code review PASS, F1–F4 scrubbed, G1/G2/G3+M1 filled by Curie, coverage audit round 2 **ADEQUATE**
2026-08-03, device gate step 9 **PASSED all four items** 2026-08-03, planner tail M2/M3/C1/N3
**CLOSED** 2026-08-04, Curie tail step 10a/N1/N4 **CLOSED** 2026-08-04. Owed: the one-token
campaign-manifest glob fix so the `coverage-audit` gate can read the verdict**), A2
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

**Step 11 — the SUBTRACTION PASS is DESIGNED, not built (2026-08-04, the planner, plan HEAD
`b539f71`).** `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md`, **PLAN_READY — next is the plan
reviewer.** Twelve source deletions in `js/app.js` + `js/nav.js` and five test/tooling/generated
surfaces, each admitted only on a stated proof of unreachability (a value argument where a grep would
not do). ⭐ **One cascade §12 does not name:** deleting the `.nav-ghost` disjunct from `begin()`'s
recovery predicate makes its ORPHAN branch unreachable and collapses three ternaries — including
`resetScroll: cur ? false : undefined`, whose orphan value is the pre-6a home-scroll-to-top parity the
code review's F1 preserved. That collapse is admissible ONLY behind a new source-scan gate
(`NOGHOSTCLASS`), which turns the reachability reading into a structure; four reachability readings
have already been wrong in this campaign. ✅ **Step 10b (the device gate on the shipped Stage-2 form)
PASSED — all six items, build `2026-08-03.306`, commit `1ced95d`** (`Claude/Zelda/DEVICE-GATE-swipe-declone-stage2-2026-08-04.md`).
It was the plan's risk 3: had it failed, the cheapest repairs would have been exactly the branches
this pass deletes, so nothing is kept as insurance. The build gate is clear.
Planner-owned inheritances all CLOSED in the plan §13 + DecisionLog: audit **M1** (no new guard; widen
the cell, `DESTROYEDMOVER`), audit **M3** (the CLB purge gate is re-homed, `NOCLB`), addendum **A8**
(`constructionPlanFor.outgoing` retained as a stated exemption under Rule R), **A2 does not ride
along** (never batch two removals into one build), and §12 item 14's `nav.js:105`/`:106` mis-citation
(independently = code review **W50**). Still OPEN with the planner and OUT of this pass: **W46** (the
same-key `browse→browse` mover collision — a correctness question, needs its own plan), **A7**
(`sourceEl` ignores its `v` arg), audit **M5** (mechanise the sweep's designated-killer check). Seven
coverage cells, seventeen mutants, all source/key-set/class-state/call-count/DOM-identity — no
geometry. ⚠️ `Claude/Campaigns/swipe-declone-stage2.json`'s `note` still claims `display: contents`
and "THE PLAN WAS NEVER REVIEWED"; both falsified — owed to the assistant at the records scrub.

**Step 11 plan review — TEMPER (2026-08-04, the plan reviewer, review HEAD `1ced95d`).**
`Claude/Charpy/PLAN-swipe-declone-stage2-subtraction-1ced95d.md`. **Owner: the planner.** Every §4
reachability proof was struck against source and every one HELD — D1's consumer-set argument, D2's
one-`return` value proof, D5's writer-less `let`, D8's three-literal producer set, D12's four `.own`
readers, the `nav.js:105`/`:106` correction, the residuals-comment CONFLICT, and `NOCLB`'s subject
(both identifiers occur zero times under `js/`). Seven findings block: **F1** the frozen model's
`VERIFIED.supersession` pin covers exactly the §5 collapse region and its ORPHAN prose is hard-coded
in `tools/gen-swipe-model.mjs`, so regenerating the doc does not fix it — neither file is in any list
in the plan; **F2** D9 deletes `js/app.js:428`, the sole anchor of `tools/source-gate-sweep.mjs`'s
`begin/supersession` entry, which is that fingerprint's ONLY mutation evidence and is invisible to
the anchors gate; **F3** `NOOWNEDPANE`/`NOCLB` leave their scan resolution unspecified where
`NOGHOSTCLASS` specifies it, and the bare-token reading is RED on six unscrubbed comment sites;
**F4** the declared source ranges are line-incomplete and skip `js/app.js:437-473` entirely — the
prose form of the branch being collapsed; **F5** R2's list is short by two — `DEC` and `BR` are the
only witnesses of behaviours that SURVIVE (the recovery sweeping the pill float; borrowed-real
`#browse`/`#home` surviving a supersession); **F6** §5 justifies deleting the explicit
`resetSwipeStyles` call by one of its three effects (the other two survive only via
`js/nav.js:129` — verified, but unstated); **F7** D15 misses the vacuous transform assertion at
`test/swipe-invariants.test.js:426-427`/`:450-451`, whose deletion guts the cell. F8–F10 are
non-blocking. Step 10b PASSED on `.306` (`1ced95d`), so the build gate is clear and the plan is the
only thing holding step 6.

**Step 11 round-1 TEMPER APPLIED (2026-08-04, the planner) — back to the plan reviewer for round 2.**
All ten findings folded. ⭐ **The deletion set did NOT move**: every reachability proof held under the
strike, so D1–D12 are unchanged and nothing was added to or removed from what gets deleted. What
changed is **blast radius and witnesses**. New **§4a — co-changes that are not deletions** carries the
four surfaces that break or lie when §5 lands and were in no list: C1 `test/swipe-model.test.js`'s
`VERIFIED.supersession` (the pin covers exactly the collapse region — it moves ONLY behind a recorded
line-by-line re-verification, never a re-hash), C2 `tools/gen-swipe-model.mjs`'s four hard-coded
ORPHAN prose sites (regenerating reproduces them verbatim), C3 `tools/source-gate-sweep.mjs`'s
`begin/supersession` anchor (the fingerprint's only mutation evidence, invisible to the anchors gate
— `node tools/source-gate-sweep.mjs` is now exit item 4), C4 `tools/fuzz-ui.js:54`'s ghost counter.
**F3 scan resolution DECIDED — three tokens, three rules, matched to what each token IS:** a retired
CSS class ⇒ resolve the class WRITE; a retired tag VALUE ⇒ match a string literal in any quoting form
(catches the named-constant form, which the quoted-at-comparison-site reading misses); retired
IDENTIFIERS ⇒ code position only, so a comment explaining the retirement does not redden. Each proved
by a fire drill with a **negative** control. **F5 — two witnesses rescued:** `DEC`'s behaviour (the
recovery still sweeps the pill float) re-homes onto `RECOVERYPARITY`'s new fourth assertion + mutant;
`BR` is **relocated intact** into `test/swipe-stage6.test.js` with a replacement mutant, so
`test/swipe-stage6e.test.js` still goes whole. **F7** — the stale-event transform assertion is
re-anchored onto a surviving mover, not deleted. **F4** — D16b now lists every comment site including
`js/app.js:437-473`, the 37-line prose form of the collapsed branch. Coverage **7 cells / 17 mutants →
9 / 18** (`BORROWEDREALSURVIVES`, `STALETOUCH` added; `RECOVERYPARITY` gains a mutant), recounted not
incremented. Risk registry: **R3 replaced** — the retired rollback-surface risk gives way to *the
fingerprint pin is greened by a re-hash*, the likeliest way step 6 goes wrong. Six new DecisionLog
entries. ⭐⭐ **R2 materialised inside this plan and was caught by review, not by my own pass**: the
round-1 revision named one deleted-witness instance and missed two of the same class, because the
question was asked against each cell's stated *mechanism* instead of against its *behaviour* — and
those two had come apart in exactly the cells this pass deletes.

**Step 11 plan review round 2 — TEMPER (2026-08-04, the plan reviewer, review HEAD `5a1d977`).**
`Claude/Charpy/PLAN-swipe-declone-stage2-subtraction-5a1d977-r2.md`. **Owner: the planner.** All five
round-1 structural resolutions are right in their reasoning; the deletion set is byte-for-byte
unchanged and was not re-struck. F4 holds clean. F3's three per-token scan rules are sound and the
`owned-pane` "the literal must exist somewhere" completeness claim survives the strike — the
named-constant form matches, and the tree carries zero such literals once the four comparison sites
go. Three residuals block. **R1:** `tools/source-gate-sweep.mjs` is **already red at HEAD** on its
`transition branches` entry, whose anchor `const incomingBrowse = !toOv && toV !== 'home';` left
`js/app.js` at `14257f2` (stage 4, "retire the branch mirror"), so the new exit item 4 is
unsatisfiable — and `test/transition-matrix.test.js`'s fingerprint has had no mutation evidence for
nine stages, the same hole C3 closes one entry over. **R2:** `RECOVERYPARITY`'s new NATURAL-d cannot
produce its stated effect — moving `applyScreen` later still executes it, and `js/nav.js:129` →
`:106` sweeps the pill unconditionally, so it reddens on hold-ordering (NATURAL-c's subject) and the
re-homed `DEC` witness ships undemonstrated; the mutant that bites REMOVES the call. **R3:** C2's
"four sites" is short by one (`tools/gen-swipe-model.mjs:471`, "orphan disposal"), with `:413`,
`:491-495` and `DISPOSE_REASONS`' `deepEqual` pin at `test/swipe-model.test.js:272` unruled, and exit
item 6 is a read-through where a two-line assertion over the already-read rendered output is
available. R5 (non-discriminating `BORROWEDREALSURVIVES` mutant) and R6 (opposite rulings on
retirement tombstones) are non-blocking. Next: the planner folds round 2, then the adversary at step 3.

**Step 11 round-2 TEMPER APPLIED (2026-08-04, the planner) — back to the plan reviewer for round 3.**
Review at `5a1d977` (`Claude/Charpy/…-5a1d977-r2.md`); the deletion set was **not re-struck and did
not move — second round running**, and all five round-1 resolutions were confirmed sound, including
F3's load-bearing "the literal must exist somewhere" claim and F4's scrub list. ⭐⭐ **R1 resolved
differently from either option offered.** `tools/source-gate-sweep.mjs`'s `transition branches` entry
is **deleted, not re-anchored, and no per-entry `file` field is needed** — the fingerprint it
evidences was **retired at stage 4 by the same commit (`14257f2`) that moved the predicate**
(`test/transition-matrix.test.js:42-47` says so; the file has no fingerprint assertion, and the
entry's `mustSay` matches no test title there, so even a valid anchor would have read UNCAUGHT). It is
the tombstone of a retired mirror; nothing becomes unevidenced; **exit item 4 is now satisfiable**,
and `test/mutation-anchors.test.js`'s `KNOWN_ROTTED` exemption (landed at `fad819e`) is emptied in the
same commit. ⚠️ Why it stayed invisible for nine stages: `test/transition-matrix.test.js:12-20` still
advertises the fingerprint its own `:42-47` retired, and the tool's header and the sweep's exclusion
reason both repeat that claim — three records agreeing with each other and disagreeing with the code.
All three scrubbed; the **exclusion ENTRY stays** (that gate still derives from `js/nav.js` text) and
only its reason is corrected. **R2 — `RECOVERYPARITY`'s NATURAL-d was a mutant that could not bite:**
moving the `applyScreen` call still executes it (`Nav.applyScreen` calls `resetSwipeStyles` first, no
early return; the pill sweep is unconditional), so it reddened on hold-ordering, which NATURAL-c
already covers — and the re-homed `DEC` witness would have shipped never shown to fail. **The biting
form REMOVES the call**; `PILLSWEPT` stays green so the kill is attributable, and the fourth assertion
becomes its own named test so the sweep names it. ⛔ Third mutant-reddens-for-the-wrong-reason in this
campaign, and the first two were other people's. **R3 — C2 was short by one** (`gen-swipe-model.mjs:471`,
one line above two that WERE cited), and **exit item 6 is now MECHANIZED**: a new assertion in
`test/swipe-model.test.js` that the rendered model carries no `orphan` token, catching all four
generator sites incl. the missed one. Item 5 (the pin) stays a discipline — nothing distinguishes a
re-verified hash from a pasted one — and the one C2 site the assertion cannot see is stated. The
third swipe-model surface (`DISPOSE_REASONS` + its `deepEqual` pin, `:413`, `:491-495`) is ruled
**OUT of scope with the reason**: it states `PLAN-swipe-reveal.md` §3.4's design commitment, not a
deleted call site. **R4** — each purge rule's *every* exclusion gets an executed control, and
`NOCLB`'s positive control is placed after a line whose string contains `//`, to catch an
over-stripping scanner. **R5** — `BORROWEDREALSURVIVES`'s mutant is non-discriminating by nature;
disclosed + expected-killer set recorded. ⭐ **R6 shrank the pass**: the tombstone discriminator (*a
comment naming a retired symbol + authority + why, past tense, survives; prose describing a mechanism
as if it still governs goes*) takes `js/app.js:718-726` and `js/swipe.js:203-210`/`:254` back OFF the
scrub list — three fewer edits — and makes `:798`'s retention principled instead of arbitrary. Counts
unchanged at 9 cells / 18 mutants. Seven new DecisionLog entries.

**Step 11 plan review round 3 — ✅ FORGE (2026-08-05, the plan reviewer, review HEAD `157a2e1`).**
`Claude/Charpy/PLAN-swipe-declone-stage2-subtraction-157a2e1-r3.md`. **The plan is cleared to build.
Next: the adversary at §11 step 3, then the test author at step 5.** R1/R2/R3 all hold, each verified
against the artefact. **R1** is resolved better than either option the review offered: I confirmed
`test/transition-matrix.test.js` carries **no fingerprint assertion at all** — three tests, no
`regionHash`, no pin — and its `mustSay: 'predicate still mirrors'` matches no title, so the
`transition branches` entry would have reported UNCAUGHT even with a valid anchor. It is a tombstone,
deletion loses nothing, and the `KNOWN_ROTTED` discharge is genuinely structural (the gate's
`staleExemptions` predicate reddens if the map is not emptied). Exit item 4 is satisfiable — the four
remaining entries all target `js/app.js` and all anchor. **R2:** NATURAL-d's removal form
discriminates (`PILLSWEPT` is a unit cell on `js/nav.js` and stays green), and the split gives
exclusive attribution — NATURAL-a/-b/-c all leave `applyScreen` executing so the pill is still swept
and the split test stays green under all three. No gate maps a coverage id to one test title, so the
split breaks nothing. **R3:** `orphan` occurs at exactly four lines in the rendered model, all four
the in-scope sites, so the assertion is complete over them and false-positive-free; the out-of-scope
ruling on `DISPOSE_REASONS`/`:413`/`:491-495` is principled (normative commitment vs description of a
reachable path) and cannot collide with the gate, since none of those sites carries the token.
**One recommendation, non-blocking:** `ghost` occurs exactly once in the rendered model (line 134) and
once in `render()` (`:416`) — both the one site the `orphan` token misses — so adding it to the same
assertion mechanizes 5 of 5 and is verified safe at HEAD. Two notes: the corrected `SOURCE_TEXT_GATES`
reason names the weaker of two false-CAUGHT channels (`gen-transition-matrix.mjs:34` `require`s
`js/swipe.js` at load), and decisions 9 and 11 apply two different exclusion criteria without stating
either — the operative one is already written in `scroll-writer-set.test.js`'s own entry.

**⭐ Step 11 plan review round 3: FORGE — the subtraction plan is RATIFIED (2026-08-05), cleared to
the adversary.** `Claude/Charpy/PLAN-swipe-declone-stage2-subtraction-157a2e1-r3.md` (review at
`157a2e1`), G1–G3 folded, none blocking. All three round-2 resolutions verified against the artefact.
**R1 came back stronger than stated:** `test/transition-matrix.test.js` holds exactly three tests, no
`regionHash`, no pin, no `VERIFIED` map, and the deleted entry's `mustSay` matches none of the three
titles — so it could never have produced evidence, not merely since stage 4. Exit item 4 confirmed
satisfiable (four entries remain, all on `APP`, all anchoring); the `KNOWN_ROTTED` discharge is
structural; the exclusion-entry distinction is right. R2's exclusive attribution was traced mutant by
mutant — NATURAL-a/-b/-c all leave `applyScreen` executing, so the split test stays green under all
three and only NATURAL-d reddens it. R3's out-of-scope ruling is judged principled and its token is
false-positive-free. **G1 closed the last unmechanized site with one word:** `ghost` occurs at exactly
one line of the rendered model (`:134`) and one of the generator (`:416`) — the very site `orphan`
misses — so exit item 6 asserts **neither** token and mechanizes **5 of 5**. ⛔ Lesson recorded: an
honest disclosure of a residual is not a discharge when the mechanism costs one word. **G2** — the
corrected sweep-exclusion reason names **both** false-CAUGHT channels (`js/nav.js` text, and
`gen-transition-matrix.mjs:34`'s `require` of `js/swipe.js`, which registered mutants actually
travel), because R1's whole lesson is that a *true-but-incomplete* reason survives nine stages
precisely because every reader who checks it finds it true. **G3** — the exclusion list has ONE
criterion, the measured one already written in its `scroll-writer-set` entry: *reddens on mutations
unrelated to its own subject*, not *reddens on every mutation*; decisions 9 and 11 then follow from a
single rule and the list stops reading as false against its own entries. ⭐⭐ **New risk R9, carried
from Charpy's closing prediction:** three rounds confirmed every reachability proof **by reading**,
and this campaign's record is four readings settled only by execution. Exit item 5 (the fingerprint
re-verification) is now **the one load-bearing step with no mechanism behind it**, and it sits over
§5's collapse. **That is exactly what the adversary is commissioned against at step 3** — not the
deletions, which are cheap to undo, but the claim that the collapse changes no behaviour. Three new
DecisionLog entries. **Next: the adversary (§11 step 3), then the test author (steps 4–5).**

**⭐ Step 11 adversary strike DONE (2026-08-05, at `8dac588`) — ONE executed fracture; the §5
behavioural promise itself HELD.** Casebook
`Claude/Loki/PLAN-swipe-declone-stage2-subtraction-strike-2026-08-05.md` (+ two filed probes). The
collapse was applied in memory (product source untouched) and the real app driven through the
harness on both forms: every producible entry route into `begin()`'s recovery has `cur` non-null,
the resetScroll axis is behaviourally identical (pre-set scroll survives on both forms), and the
orphan input is constructible only by injecting a ghost — the control fired both ways, demonstrating
R1's exact stake in motion. Full suite: HEAD 849/0-fail; collapsed 9 fail, **eight inside the plan's
declared blast radius and ONE outside it — the fracture: `test/scroll-writer-set.test.js`
`M1WRITERSET` baseline entry #10 registers §5's third ternary by exact text (`if (cur)
window.scrollTo(0, cur.scroll0);`), so step 6's commit lands red on a gate on none of the plan's
lists** (§4a, step 6, the file is cited only for the exclusion criterion). Repair is a baseline
restructure, not a text bump: post-collapse #10's text equals #11's, erasing the nesting
distinguisher the gate's Direction-3 attribution is built on. **Owner: the planner** — add the file
to §4a/step 6 and specify the #10/#11 shared-text group. Then the test author (steps 4–5).

**⭐⭐ Step 11 ADVERSARY STRIKE (2026-08-05): the promise HELD under execution; ONE FRACTURE, folded.**
`Claude/Loki/PLAN-swipe-declone-stage2-subtraction-strike-2026-08-05.md` (`f89bd14`), both probes
filed. **Held:** no first-party producer of the retired class; a six-scenario harness battery
(mid-drag supersession, settling supersession, armed-only second touch, post-finalize clean entry,
options-source supersession) entered the recovery with a non-null handle **every time**; the collapsed
variant's unconditional `cur.scroll0` read — which throws on null — never threw across the battery or
the 849-test suite; the `resetScroll` axis was behaviourally identical in both forms. ⭐ **The control
fired:** an *injected* ghost took the orphan branch at HEAD and diverged completely under the collapse,
so the negative is evidence, not silence. The orphan input is constructible only by injection.
⛔ **THE FRACTURE — a fifth rot check, on no list:** `test/scroll-writer-set.test.js` `M1WRITERSET`
baseline **entry #10 registers §5's third ternary by its exact text**, which the collapse rewrites —
green at HEAD, red under the collapse, so **exit condition 3 was unsatisfiable as enumerated**. The
plan had cited that file twice, both times only as the source of the sweep-exclusion criterion, never
as blast radius. **The repair is a restructure, not a text bump:** post-collapse #10's text becomes
identical to **#11**'s (the abort restore), erasing the containment-nesting Direction 3's attribution
rule is built on. **RULING — #10 is re-derived into a shared-text GROUP with #11**: the group-count
direction (which the gate already ships, built for exactly this) still reddens if **either** writer
vanishes; what is lost is per-site attribution, disclosed and softened by naming both candidates in
the message. Rejected and recorded: a trailing comment to restore nesting (compensating-constant
shape; an innocuous edit would then redden a gate whose header forbids the cheap repair) and keying by
enclosing function (**the better gate** — exact attribution, no rot on edits above — rejected as
SCOPE, deferred with its consumer named). ⭐⭐ **New risk R10, and a new step:** this is the **THIRD**
executed instance of the plan's own class *"a deletion list is not the same thing as a blast radius"* —
rounds 1 and 2 found two by reading and each declared the set complete; the third was found only by
**running** the collapse, and it is the one that broke an exit condition. **§11 gains step 5b — apply
the collapse in memory, run the whole suite, and require the failing set to equal the declared radius
item for item**, as a PRECONDITION of the build (as an exit item it would merely duplicate "the suite
is green" and find the radius at its most expensive moment). The instrument qualifies as a step because
it transforms at load time, **writes nothing to disk**, and **throws on a missing or non-unique
anchor**, so it cannot pass vacuously. Exit condition 0 is the measured-equals-declared check. R9 is
**materially reduced but retained** — a promise held under the strikes that were run is exactly that.
**The deletion set did not move.** Four new DecisionLog entries. **Next: the test author (§11 steps
4–5), then the builder's step 5b.**

**Step 11 RED SUITE AUTHORED (2026-08-05, Curie, `b2327f5`) — planner fold applied; next is the
builder at step 5b.** `Claude/Curie/RED-swipe-declone-stage2-subtraction.md`. 884 tests / 880 pass /
**3 intentional red-first cells** (`NOOWNEDPANE`, `MOVERSHAPE`, `PILLSWEPT`-arity) and nothing else,
against an 849/0 baseline; committed `--no-verify` because the hook blocks a red tree, after every
non-test gate passed. Mutants executed **individually against their target file**, not by sweep —
with three cells red at HEAD a sweep reports CAUGHT for the wrong reason on everything. ⭐
`PILLSWEPT`'s arity red **flips green under the collapse probe and nothing else does**. ⭐ Curie
caught `#21` killing `I20` on its *second* assertion, so the re-anchored transform witness was never
reached — split per decision 13 and re-executed. ⛔⛔ **R10 INSTANCE FOUR — and this fold MEASURED a
fifth.** Two anchors rot on **§5's third ternary, the same line** whose `M1WRITERSET` registration
became §4a C5: the search stopped at the finding instead of at the line. Rather than enumerate a
fifth time, the planner **derived** the set — applied the collapse in memory, tested every registered
anchor, **with a control pass on pristine source required to report zero first**. The control earned
its keep: run one ignored `also.file` and produced a false positive. **Measured: seven anchors rot,
FOUR on no list** — the two reported plus **`S2-31` and `S2-32`, which are `RECOVERYPARITY`'s own
NATURAL-a and NATURAL-c**; uncaught, that cell would have shipped with three of its four mutants
unrunnable. All four re-anchored (none de-registered — every subject survives); the two duplicates
are **byte-identical in `from`/`to`** and are merged into one entry naming all three killers.
**Four spec defects fixed:** `MOVERSHAPE`'s fixture was not constructible (`d.movers` is
module-private) → **confirmed as source-structural**, since a runtime observer would be a production
field whose only consumer is a test, which Rule R forbids one section earlier; `DESTROYEDMOVER`'s
"three mutants" were two fixture route variants + one mutant → re-derived to **one mutant per
ASSERTION over three route coordinates**; [R4]'s claim that `NOCLB` was the only gate needing
comment/string stripping is **false** (`NOOWNEDPANE` needs the opposite half, and `js/app.js:386`
makes its negative control live at HEAD) → one shared fire-drilled primitive; step 5b's `$PWD`
**fails under MSYS** → relative path, verified. Also recorded: `VR_HOLD_ORDER_FROM/_TO` sat
declared-but-unregistered since stage 6a, so the recovery's hold-release ordering — whose fix came
from an executed counterexample — had **no runnable mutation evidence at all**; now `S2-32`.
⭐⭐ **RULING ASKED FOR AND GIVEN (R10):** five hand enumerations of one blast radius, five times
incomplete, including two by readers looking specifically for what they missed — and two of the
missed entries **did not exist when the plan was written**, so no care at authoring time could have
named them. Step 5b is **necessary and NOT sufficient**: it makes the list's incorrectness cheap and
early, it does not make the list correct. **The co-change list should be DERIVED, not authored** —
routed as tooling in §14 with the D13d measurement as its prototype, deliberately not built inside a
subtraction pass. **The deletion set did not move.** Six new DecisionLog entries.

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
| parked browse page rides on top of Home for a whole forward swipe | high | MEASURED on `.303` (7/7 touchmove samples, Δ = −4px): `.browsepage.parked`'s `translateX(-101vw)` is relative to `#browse`, which is itself the incoming mover at `+w` on `home→browse`, so a parked page composes onto Home by construction. Fix planned: `-300vw` (out of reach of any container displacement), one CSS declaration. Plan reviewed twice 2026-08-02. Round 1 **TEMPER** (F1 outgoing-mover sign, F2 the floor cell pinned a number not a law), applied at `dcebdb1`. Round 2 **TEMPER**: both resolutions are the right design, but both new witnesses cannot fail — F9 NOPARKONHOME's mutant is equivalent (`showAppView({v:'home'}, true)` takes the home branch and never reaches `Browse.render`); F10 the cell gives two contradictory computations of term 2, and under the one §4 derives, mutant m3 is equivalent too. **Round-2 temper APPLIED**: both mutants replaced (F9 breaks the `desc.v === 'home'` comparison; F10 states one computation and adds `width`/`min-width` mutants, the latter the only one non-equivalent in layout), I10 narrowed to its mechanism, and a non-waivable exit condition added — no cell counts until its mutant is registered and the sweep executes it. Round 3 **TEMPER**: the exit condition binds and m4's CSS 2.1 §10.4 argument is verified correct, but both replaced mutants still miss — F12 `showAppView` is unreachable on `browse→home` (two call sites, both gated on a browse host), F13 m3′/m4 delete the `max-width` their own justifications need, so each reddens anti-vacuity instead of its named assertion. **Round-3 temper APPLIED — ✅ PLAN RATIFIED, no round 4** (F12's mutant re-sited to `js/app.js:585` with every link re-verified; F13's made additive; m4's `L + W = 200vw` derived exactly via §10.4 + §10.3.7). **Loki HELD_STONE (2026-08-02, real-engine executed battery — `Claude/Loki/parked-page-rides-home-strike-2026-08-02.md`):** both enumerations verified at source and struck at their worst cases (repro drag, over-drag both sides, R7 settle-window nav + sustained worst-case keyframe, I10 witnessed live on `browse→home`); instrument proven able to fire at `-101vw` first (7/7 class-governed hits, Δ=−4px). Only executed re-entry = the admitted F5 constant-viewport clause, quantified: 50px strip at 812→375 mid-gesture (needs w_start > 2·V_now). One wording caveat for the CSS comment (say "composed by the park offset" — the parked browse→browse OUTGOING mover overlaps by design) + 4 un-prosecuted lesser planes in the casebook (PARKOUTOFREACH one-rule parse scope; `#library` omitted from the ancestor enumeration). **Curie DONE (2026-08-02):** red suite filed and RED for the right reason — with the skips removed, 2 fail, both the arithmetic cells, derived floor 200vw vs shipped 101vw; landed behind `SKIP-PENDING-BUILD` per this repo's red-first convention, builder lifts them FIRST. Five mutants registered at `tools/mutate.mjs` 126–130 and executed, sweep exit 0, four killing exactly one named test each; Loki's parse-scope finding closed by real selector matching over every contributing rule. ⛔ Two mutants OWED AT THE BUILD (m1 and m2 both target the skipped arithmetic cells; m1 is additionally a no-op at HEAD — the source IS m1) — five anchors will embed the constant post-build, not three. Next: **Brunel**. Value, floor and option set unchanged throughout all three rounds, the strike and the suite. | `Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md` +  `Claude/Plans/PLAN-parked-page-rides-home.md` + `Claude/Charpy/PLAN-parked-page-rides-home-charpy.md` (+ `-r2`, `-r3`) + `Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md` |

The latter two share a root — **conn flapping relay↔local**; pinning board reads to the fast local path would help both.

## 🔭 Planned / backlog (designed, not built)
- **Parked-page-rides-Home fix — ✅ RATIFIED (2026-08-02) after three rounds; Loki HELD_STONE — next Curie:**
  `Claude/Plans/PLAN-parked-page-rides-home.md`, reviews at
  `Claude/Charpy/PLAN-parked-page-rides-home-charpy.md`, `…-charpy-r2.md` and `…-charpy-r3.md`. One CSS declaration —
  `.browsepage.parked` `translateX(-101vw)` → `-300vw` — derived as a distance LAW (the offset must
  exceed `#browse`'s max displacement, 100vw, plus the parked page's right edge `L + W`, 100vw).
  **The value, the 200vw floor, Invariant P compatibility and the option set all survived the strike;
  the shipped constant did not change.** Both blocking findings are resolved in the plan (§11 tables
  F1–F8): **F1** — the outgoing-side arithmetic exemption is WITHDRAWN (a BACK gesture drives the
  outgoing mover to `+w`, so the true figure was `+0.99w` of overlap, not `−0.01w`) and re-based on
  invariant I10, that a gesture parks a page only when the destination is a browse page — which covers
  `browse→overlay` too, not just `browse→home` — now asserted by a new NOPARKONHOME cell instead of
  assumed, and the false derivation is explicitly BARRED from the shipped CSS comment. **F2** —
  `PARKOUTOFREACH` now DERIVES term 2 by parsing the `#browse` rule, asserts a strict inequality, and
  gains mutant m3 (`max-width: 250vw`) intended to redden the law-half ALONE; §8 dim 6 and R3 restated
  to match. Four Weak + two Notes folded (F3 the retention premise + its prior-casebook citation; F4
  two stale `-101vw` records added as scrub targets; F5 the constant-viewport precondition; F6
  in-script non-degeneracy for the oracle; F7 `L + W`; F8 recorded, not acted on).
  **Round 2 (2026-08-02) — TEMPER again, two Structural, both "a cell that cannot fail":** **F9** —
  NOPARKONHOME's mutant is EQUIVALENT: `showAppView({v:'home'}, true)` takes the `desc.v === 'home'`
  branch (`js/app.js:535`) and never reaches `Browse.render`, so no page parks and the cell stays
  green; I10's mechanism is verified true and exhaustive, but its only witness is undefended. **F10** —
  `PARKOUTOFREACH` states two contradictory computations of `edgeVw` one bullet apart; under §4's own
  formula (`L + W = (V + min(M,V))/2`) a `max-width` above 100vw is not binding, so m3 yields
  `edgeVw = 100` and assertion (i) stays green — m3 equivalent too, and round-1 F2 not closed. A
  `width: 200vw` mutant on `#browse` reddens the law-half under either reading. Plus **F11** (Weak) —
  I10's scope over-reaches: a button nav also reaches `showPage` during a live hold
  (`js/app.js:2774` → `js/nav.js:153`), so R6 files a present path as a future one.
  **Round-2 temper APPLIED (2026-08-02) — PLAN_READY, awaiting Charpy r3 (F9/F10 resolutions only):**
  F9's mutant replaced with a source-verified one (break the `desc.v === 'home'` comparison at
  `js/app.js:535` so a home destination falls into the `else` branch → `Browse.render` → cache-miss →
  `showPage`); specified as a string change and **not** `if (false)`, because the suite runs lint and a
  constant condition would redden the LINT cell instead of the named one. F10 resolved by stating ONE
  computation (`max-width` can only CAP the box, so `edgeVw = 100` for every `M`), reclassifying the
  >100vw `max-width` rule as a **structural guard rather than a term of the arithmetic**, keeping m3
  only as that guard's witness, and adding two mutants that redden the law-half alone: `width: 200vw`
  (the reviewed form) and **`min-width: 200vw` — added beyond the review**, being the only one
  non-equivalent in LAYOUT, since `min-width` beats `max-width` per CSS 2.1 §10.4 so the box genuinely
  becomes 200vw and the floor genuinely moves. F11 folded: I10 restated as its mechanism, and the
  button-nav path promoted to **R7, a named present path** covered by the floor and by an unpinned
  ordering inside `applyScreen`. **New non-waivable exit condition:** no cell counts as coverage until
  its mutant is registered in `tools/mutate.mjs` and confirmed to redden it **by executing
  `tools/mutation-sweep.mjs`**, which exits nonzero on a survivor — never on the plan's say-so, and
  registration comes BEFORE the cells are written.
  **Round 3 (2026-08-02) — TEMPER again, two Structural, both still reachability claims:** the exit
  condition BINDS (instrument named, exit line verified verbatim at `tools/mutation-sweep.mjs:239`) and
  m4's CSS 2.1 §10.4 argument is VERIFIED correct — including the §10.3.7 over-constrained-margin step
  the plan's "~200" skips, which is what makes `L = 0` and the floor 300 rather than 250. But **F12** —
  the replacement NOPARKONHOME mutant is equivalent too: `showAppView` has exactly two call sites
  (`js/app.js:579`, `:580`), both gated on a browse host, and `browse→home` passes
  `destinationHost = 'home'` (`js/swipe.js:114`, `:260`) into the `:585` branch, which calls neither —
  so nothing inside `showAppView` is reachable on that gesture. Killing mutant with every link checked:
  add `Browse.render(dest)` to `:585`'s home branch. **F13** — m3′ and m4 REPLACE `max-width: 640px`,
  deleting it, while both justifications assume it survives; that trips the cell's own anti-vacuity
  clause, so each reddens the missing-`max-width` check instead of its named `no-width`/`no-min-width`
  assertion, leaving both undefended. Fix: make them additive. **This is the class the new exit
  condition cannot catch** — both mutants do kill the cell, so the sweep goes green. Plus **F14**
  (Note) — the exit condition binds at CELL granularity only; per-assertion attribution stays a
  judgement made when the mutant is chosen.
  **✅ ROUND-3 TEMPER APPLIED — PLAN IS RATIFIED (2026-08-02), no round 4.** F12's mutant replaced with
  `Browse.render(dest)` added to `js/app.js:585`'s home branch, every link re-verified by the planner
  at source (`dest`/`Browse` in scope; `keyOf`→`'home'`; `placeholderFor` skeletons any non-`files`
  descriptor; `showPage` runs SYNCHRONOUSLY at `js/browse.js:538` before the fetch `try`, so `async`
  does not defer it; `holdRows` already true via `takeRowHold()` at `js/app.js:557`, before
  `buildConstruction` at `:596`). F13's two mutants made ADDITIVE. m4's derivation stated EXACTLY —
  `L + W = 200vw` via §10.4 + §10.3.7 (margins would be −50vw so `margin-left` is set to 0, giving
  `L = 0`); had they centred, the floor would be 250 and `N = 300` would have cleared it, making the
  mutant equivalent. F14 folded as one clause. **Ratified by the dispatcher on the reviewer's own
  recommendation**: every finding after round 1 was a REACHABILITY claim, and reading has been wrong
  about reachability three times — a fourth round would predict it by reading again. Execution settles
  it instead. **Loki gate CLOSED — HELD_STONE (2026-08-02):**
  `Claude/Loki/parked-page-rides-home-strike-2026-08-02.md` (+ `.probe.js`). The §12 promise survived
  an executed real-engine battery at both enumerations' worst cases; the instrument fired at `-101vw`
  before its silence at `-300vw` was read as evidence; the only executed re-entry is the plan's own
  admitted F5 clause (rotation-class viewport shrink mid-gesture, 50px at 812→375). Casebook carries
  a wording caveat the builder's CSS comment must honour ("composed by the park offset" — the parked
  browse→browse outgoing mover overlaps by design) and four un-prosecuted lesser planes for the
  reviewers (incl. PARKOUTOFREACH's one-rule parse scope and the ancestor enumeration's `#library`
  omission). **Curie gate CLOSED — the RED suite is filed (2026-08-02):**
  `Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md`, cells in
  `test/parked-page-rides-home-css.test.js` (8 tests, 2 RED@HEAD) and
  `test/parked-page-rides-home-browse.test.js` (3 tests, GREEN@HEAD gates), oracle at
  `Claude/Curie/parked-page-rides-home-oracle.probe.js`. With the two skips removed, `npm test` =
  823 tests, **2 fail — both the red-first arithmetic cells and nothing else**; the derived floor
  computes to 200vw against a shipped 101vw. They land behind `SKIP-PENDING-BUILD` (this repo's
  red-first convention, as at `be7da1c`) because the pre-commit hook runs the suite and blocks a red
  tree; **the builder removes both skips FIRST, drives each red, then makes them green.** **Five
  mutants registered at `tools/mutate.mjs` 126–130 and EXECUTED**
  (`node tools/mutation-sweep.mjs 126 127 128 129 130` → swept 5, 0 uncaught, 0 unapplied, 0 stale,
  exit 0); FOUR kill exactly ONE test each and it is the one they name — the per-assertion
  attribution the plan's F14 says the gate cannot otherwise reach, obtained by splitting the cell
  into eight named tests. No `*.mutbak` remains and `css/`+`js/` are untouched. Loki's parse-scope finding is CLOSED:
  the cell scans every rule that can contribute to `#browse`, matched by a real selector engine against
  the real element with ancestor conditions dropped and the element class-augmented, so
  `body.has-player #browse` and `.view.nav-in-*` are both in scope. ⛔ **TWO MUTANTS ARE OWED AT THE
  BUILD, not waived**: m1 (`-300vw`→`-101vw`) and m2 (→`-250vw`) both target the arithmetic cells,
  and a SKIPPED test cannot be a killer — m1 is additionally a literal no-op at HEAD, which the
  anchors gate refuses, *because at HEAD the source IS m1*. m2 WAS registered and executed before the
  skips (caught, shipped-form cell alone, flipping the inequality cell green — proof both arithmetic
  assertions are independently reachable) and withdrawn only after **re-running the sweep confirmed
  `UNCAUGHT`** behind the skip. Post-build, five registered anchors will embed the constant, not
  three. ⭐ Lesson recorded: **a mutation result stops being true when the suite around it changes, so
  re-run the sweep after any change to the CELLS, not only to the source.** Exact strings + the
  post-build sweep re-run in the design artifact §6. **Next: Brunel.**
  Device-owed, unchanged: cover retention at the new distance, and whether this is the whole of the
  reported garbage. *(SUPERSEDED — this row is the pre-build snapshot. Both skips were removed and
  driven red by the build, m1/m2 are registered at 126/127, and two further bars gained mutants at
  133/134 after the coverage audit; current state is in the BUILD_GREEN, CODE REVIEW and COVERAGE
  AUDIT rows below.)*
- **parked-page-rides-home BUILD_GREEN (2026-08-02, Brunel, build `2026-08-02.304`).** Both
  `SKIP-PENDING-BUILD` skips removed and driven red first (`101vw does not strictly exceed 200vw`;
  `want translateX(-300vw)` — exact output in the build log), then `css/app.css:118-121`
  `.browsepage.parked` `transform: translateX(-101vw)` → `translateX(-300vw)`, the one declaration the
  plan specifies; the rule's comment gained the distance law (both floor terms + source lines, the
  constant-viewport precondition), stating I10 rather than the withdrawn arithmetic exemption, and
  "composed BY THE PARK OFFSET" rather than "cannot overlap" per the plan's bar. Full suite green: 823
  tests, 822 pass, 0 fail, 1 pre-existing skip. Anchors S2-6/S2-7/S2-8 migrated to `-300vw`; two new
  mutants (PARKM1 restore `-101vw`, PARKM2 `-250vw`) registered from Curie's exact §6 strings. All
  **seven** park-coverage mutants (indices 126–132 post-insertion) swept in the foreground and
  **CAUGHT**, matching the test design's predicted killers exactly (m1 reddens both arithmetic tests;
  m2 the shipped-form test alone; the drag-clamp and NOPARKONHOME mutants as designed). No `*.mutbak`
  anywhere in the tree. Build log: `Claude/Brunel/BUILD-parked-page-rides-home-2026-08-02.md`. **Open
  item, explicitly out of this build's writable scope:** the plan's two F4 scrub targets
  (`test/swipe-declone-stage2-css.test.js:301`, `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md:60`,
  both still quoting `-101vw`) were not touched — the invocation's Writable list did not include them.
  **F4 scrub CLOSED same day (commit `e11ecf3`):** the coordinator extended the Writable list to
  exactly those two files; both corrected to `-300vw` (comment/prose only, no assertion changed);
  `Claude/Linnaeus/PROBE-swipe-reveal-teardown.md`'s stale `css:91-96` citation corrected to
  `css:144-147`. A sibling sweep of `test/`, `tools/`, `js/` found no other live statement of the
  `.browsepage.parked` distance — every other `-101vw` hit is `#home.parked` (unchanged, still
  `-101vw`), the parked-page-rides-home suite's own historical narrative, or PARKM1's intentional
  restore. Suite re-run green (823/822/0-fail/1-skip); all seven mutants re-swept in the foreground,
  still CAUGHT. Device gate (R1, R2) remains owed, unchanged. **Next: Poirot.**
- **parked-page-rides-home CODE REVIEW: PASS — fix-then-ship (2026-08-02, Poirot, target `b358f73`).**
  Casebook `Claude/Poirot/POIROT-parked-page-rides-home-b358f73.md`, range `9cfd621..b358f73`. The
  one-declaration change is correct and complete against the plan; the comment carries all four
  mandated items and neither of the two the plan barred (it states I10 in its F11-scoped form and says
  "composed BY THE PARK OFFSET"); Invariant P and `overflow: hidden` byte-identical. Verified by
  execution this pass, not from the build log: full suite 823/822/0-fail/1-skip; `mutation-sweep 126
  127 128 129 130 131 132` → 7 caught, 0 uncaught/unapplied/stale, each `killed by:` the cell it names;
  **and the three migrated anchors re-swept separately** (`104 105 106` → 3 caught) — the check the
  anchors gate does not make, since it proves the `from` string matches but not that the mutant still
  bites. Tree clean, no `*.mutbak`. **Ten findings, all records/citation-accuracy; none changes a
  rendered pixel and none blocks the device gate.** Six required (F1-F6): three stale `css:` citations
  created by this build's own +25 lines (`css/app.css:125` and `test/parked-page-rides-home-css.test.js:331`
  now point into `#home`; `:411`'s `css:119` points at the comment), two live failure diagnostics still
  asserting `-101vw` at HEAD (`:411`, `:432`), two dead skip constants (`:382`, `:385`), and two unfilled
  plan §11 record items — no `DecisionLog.md` build entry (its ratification entry still reads "not yet
  built" / "`css/app.css` is still untouched" at `:1242-1246`) and the measurement record not annotated
  as realized. Four observations (F7-F10): PARKM4's registered name claims a strict-inequality kill the
  sweep disproves; `css/app.css:140-141`'s "nothing in js/ listens for resize" is falsified by the
  vendored console; the no-padding/border cell is a GATE with no mutant; the real-engine oracle has no
  recorded run at 375/640/1000px. The builder's scrub CALL on the seven remaining `-101vw` hits is
  **correct** — each verified `#home.parked`, a historical probe, or PARKM1's deliberate restore.
  **Next: Brunel (apply-review), then the device gate — which is what stands between this and "fixed".**
- **parked-page-rides-home COVERAGE AUDIT: GAPS NAMED (2026-08-02, Mendeleev, audited at `b55fef9`)
  — all five findings now CLOSED by Curie.** Case file
  `Claude/Mendeleev/parked-page-rides-home-coverage-audit-2026-08-02.md`. The suite spans its
  contract: 43 matrix cells, 35 swept, 4 N/A (two with their reasons corrected), 2 bare, 3 owed.
  **Dimensions 4 and 10 — genuinely bare in HEAD — were swept by EXECUTING the real-engine oracle** at
  375/640/1000px with the instrument proven able to fire first (fire drill: 8 class-governed hits,
  parked page at left −4/right +371, reproducing the measurement record's Δ=−4px independently);
  `report()` → pass, 0 hits per run, 8 non-degenerate parked samples each. Two bench defects were
  found by that run and are the audit's M3/M4. **Curie remediation (2026-08-02):** (1) M1/M2 — the
  no-`padding`/`border` and centring bars were labelled GATE with no mutant; **PARKPAD (#133)** and
  **PARKINSET (#134)** registered and executed. The centring bar matters most: because `edgeVw` is 100
  for every admissible box the derived floor is **invariant at 200vw**, so a widened `#browse` is
  detected ENTIRELY by the bars — and the centring one guards the only admissible edit that really
  breaks `L + W ≤ 100vw` (a negative inset: `right:-400px` → `L+W = 188vw` at V=375, invisible to the
  arithmetic because `derivedFloorVw()` never reads `left`/`right`). **The code review did not find
  it.** (2) M3/M4 — the oracle recorded the park value it was testing and never asserted it, and read
  `getBoundingClientRect()` through a stuck `nav-in-*` animation without noticing. Both are now
  failure paths: `preflight()` asserts the SERVED park offset is the shipped value and cross-checks
  the live `build.json` (network-only by SW route) against the shell-cache names, and `run()`/
  `report()` FAIL without it; animation contamination is checked PER SAMPLE. **All nine fail-paths
  driven and observed to fire** in a stubbed jsdom bench — writing an assertion whose failure path is
  never executed is the defect being repaired. (3) M5/M6 — the stale `SKIP-PENDING-BUILD` block and
  header table in the css cell, and the design record's pre-build state statements, corrected to
  current truth. **Whole park family re-swept at the FINAL state: `104 105 106 126–134` → swept 12,
  0 uncaught, 0 unapplied, 0 stale**; nine kill exactly one named test. Suite 823/822/0-fail/1-skip;
  no `*.mutbak`; `css/` and `js/` untouched. ⭐ Two predictions corrected by execution: PARKM4 does
  NOT redden the strict-inequality cell (the floor never reads `min-width`), and PARKPAD kills two
  cells, not one (`PAGEISVIEW` independently pins `#browse`'s padding). **Next: the device gate — the
  only thing now standing between this change and "fixed".**
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

**⭐ Step 11 RED SUITE FILED (2026-08-05) — §11 steps 4 and 5 DONE; next is the builder (step 5b, then step 6).**
`Claude/Curie/RED-swipe-declone-stage2-subtraction.md`. All nine §10 cells authored plus coverage-audit
**M2** (the `Browse.pageElFor` throw cell and its `keyFor` sibling negative). Suite 849 → **884 tests,
3 fail** — and the three are the red-first cells, nothing else: `NOOWNEDPANE` (the tag literal at the
four sites D4/D6/D7/D8 delete), `MOVERSHAPE` (the adapter still reads `ownership`) and `PILLSWEPT`'s
arity half (`resetSwipeStyles` still declares `keepGhosts`). Eight mutants registered (`S2-25`…`S2-32`)
and **every one executed and observed to redden its named cell** — per-file, foreground, tree checked
clean after each, because with three cells red at HEAD a whole-suite sweep would report every mutant
CAUGHT for the wrong reason. Four existing mutants were executed as this pass's defenders too (#13,
#16, #21, `S2-13`). Six mutants are deliberately **not** registered — they target the collapsed
recovery, the parameterless reset, or a gate already red — and are derived with exact anchors for step 6.

⛔⛔ **A FOURTH EXECUTED INSTANCE OF R10, and again only running found it.** The collapse-probe run
(884 tests, 11 fail) put **every** failure inside the plan's declared radius except the two red-first
cells — but `test/mutation-anchors.test.js`'s rot list under the collapse holds **two entries on no
plan list**: `stage6a: recovery stops restoring the session-start scroll` and `swipe: supersession
recovery stops restoring the session-start scroll`. Both anchor on §5's third ternary
(`if (cur) window.scrollTo(0, cur.scroll0);`) — **the same source line §4a C5 already caught the
`M1WRITERSET` baseline registering, where the search stopped**. Neither is a de-registration: their
subject SURVIVES and is `RECOVERYPARITY`'s own `NATURAL-b`, executed here. They need **re-anchoring**
on step 6's list. They are also **byte-identical duplicates of each other**. **Owner: the planner**,
before step 6 starts.

⭐ **Four smaller findings routed with it.** §10 `MOVERSHAPE`'s fixture as specified is not
constructible — `d.movers` has no observer (`window.PBSwipeSession()` reports `{id, dragging}`), so the
cell asserts the adapter's seam-field READ set and says so in its own header, with the `base` half
additionally covered behaviourally. §10 `DESTROYEDMOVER`'s "three mutants" are two FIXTURES and one
mutant. [R4]'s claim that `NOCLB` is the first gate needing comment stripping is FALSE — `NOOWNEDPANE`
needs it too, because this codebase's comments use markdown backticks and `js/app.js:386` carries
`owned-pane` inside one, in backticks. And `VR_HOLD_ORDER_FROM`/`_TO` have sat declared-but-unregistered
in `tools/mutate.mjs` since stage 6a, so the recovery's hold-release ORDERING — an executed
counterexample's fix — had no runnable mutation evidence at all; wired up as `S2-32` and executed.
⚠️ The plan's step-5b command needs a drive-letter path: `$PWD` expands to `/c/…` under MSYS and node
cannot resolve it.

**⭐ Step 11 BUILD GREEN (2026-08-05) — §11 step 5b then step 6 DONE; next is the code reviewer.**
`Claude/Brunel/swipe-declone-stage2-subtraction-build.md`. **Step 5b:** the plan's literal trial
command (`NODE_OPTIONS` env var) leaked into child processes three test files spawn in temp
sandboxes, crashing them for a reason unrelated to §5's collapse — fixed by passing `--require` as
a CLI flag instead (env vars are inherited by children, CLI flags are not); the clean re-measurement
matched §4a+§8's declared radius item for item, no surplus. **Step 6:** all twelve D1–D12 deletions
landed in `js/app.js`/`js/nav.js`; `tools/mutate.mjs` de-registered/re-anchored/merged/replaced per
D13/D13b/D13c/D13d, plus a sixth undeclared R10 instance found by execution (`swipe6e RSN-emit`,
its disposal-trace subject fully gone with `disposeOwnedPanes`); `tools/source-gate-sweep.mjs`'s
`begin/supersession` re-anchored and `transition branches` deleted as a retired mirror's tombstone;
`test/swipe-model.test.js`'s hash re-pinned behind a recorded line-by-line re-verification, plus a
new mechanized token-scan assertion (no "orphan", no "ghost" in the rendered model — the generator's
first-draft rewrite still used both words describing their own absence, caught by the new assertion
and rewritten clean); `test/scroll-writer-set.test.js`'s M1WRITERSET entries #10/#11 merged into a
shared-text group (hit the same indentation-substring anchor trap the plan's own history warns
about — fixed with a 2-line anchor). Full suite 878/877/0-fail/1-skip (device-only). Full mutation
sweep run in 12 shards (146 mutants, matching the registry): **0 uncaught, 0 unapplied, 0 stale
flags**, no `*.mutbak` left anywhere. `source-gate-sweep.mjs` exits 0, all 4 remaining entries
anchor and fire. Build bumped `2026-08-03.306` → `2026-08-05.1` (stamped, `--check` clean).
**Not yet committed or pushed** — the build log records every exit condition; next is Poirot, then
Mendeleev, then the records scrub (this plan's status, the parent's §12/§13, the campaign
manifest's falsified note, this board, the decision log — step 8, not done here).

**⭐ Step 11 CODE REVIEW: PASS — fix-then-ship (2026-08-05, target `49efe4f`).**
`Claude/Poirot/POIROT-swipe-declone-stage2-subtraction-49efe4f.md`. Nothing on §9's keep list was
deleted (each verified at HEAD, `css/` and `js/swipe.js` not in the diff at all), and **exit item 5 —
the one load-bearing step with no mechanism — is substantiated**: the pinned region extracted from
both commits and diffed code-only shows exactly seven changed statements, and the recorded
re-verification names all seven. Verified by execution: suite 878/877/0-fail/1-skip;
`source-gate-sweep.mjs` exit 0 (4/4 fingerprints red, controls hold); targeted sweeps of the touched
families (`13 20 54 142`, `13 141 144 145`) 0 uncaught / 0 unapplied / 0 stale, no `*.mutbak`;
mutant `#13` killed by `RECOVERYPARITY.pillswept`, which proves §5's adjacency ([F6]) — the recovery
still reaches the pill sweep through `applyScreen` alone; a harness probe counts 0 `.nav-ghost` at
boot and after a nav. **Two required fixes:** [W70] `tools/mutate.mjs` indices 54 and 142 are one
mutant registered twice (byte-identical `from`, executed byte-identical 153-test `killed by:` lists
— decision 19's own class, created by the commit that applied it); [W71] `js/app.js:221-227` still
states a `begin()` PANE-OWNING rejection D8 deleted. **Four minors + two observations:**
[W72]–[W75] vacuous ghost assertions, comment residue, a dead registry constant holding the deleted
line, and two `ghosts=` token strippers; [W76]–[W77] the generated model's "marker element"
euphemism and `regionHash` pinning comments as well as code. **[W78] — the seventh enumeration miss,
and its shape is new: every one is in `test/` or `tools/`, outside the `js/`-scoped purge gates,
outside `mutation-anchors.test.js`'s `MUTATIONS`-only read, and outside ESLint's surface.** Four
prior watch items resolved by this build ([W9] [W10] [W12] [W50]). Next: apply-review, then the
coverage auditor, then step 7's device gate ([W79]).

**⭐ Step 11 REVIEW FIXES APPLIED (2026-08-05), between-stages — [W70]–[W75] closed.**
`Claude/Brunel/swipe-declone-stage2-subtraction-build.md` (fix-then-ship response section).
[W70]/F1: the duplicate `BORROWEDREALSURVIVES` mutant deleted, `S2-29` (Curie's, `b2327f5`) is the
sole registration. [W71]/F2: `js/app.js`'s SESSION OWNER comment no longer claims a PANE-OWNING
rejection D8 deleted. [W72]/F3: the two vacuous `ghosts(h)` comparisons in D15's declared scope
removed (`swipe-invariants.test.js`, `swipe-stage6.test.js`); the two outside it
(`swipe-stage6i.test.js`) left as the review scoped them — not required. [W73]/F4: four stale
`js/app.js` comments rewritten (frame-sampler, "panes go NOW", `runFinalize`'s exit count, the
`finishing`-restore note); `test/home-abort-writes.test.js` left untouched, outside the reviewed
commit's diff per the review's own framing. [W74]/F5: the dead `RECOVERY_RENDER_ALWAYS_FALSE`
constant removed. [W75]/F6: the two dead `ghosts=` token strippers removed. **[W76] O1 and [W77] O2
NOT applied — routed to the planner**, as Observations the review itself does not sanction as
required. Verified by execution: full suite 878/877/0-fail/1-skip (regenerated docs after the
comment edits shifted navStack append-site line numbers — hash unchanged, only line numbers);
`source-gate-sweep.mjs` exit 0 (4/4); targeted sweep of the re-derived indices
(`13 20 140 141 143 144`, since F1's deletion shifted everything after it) 0 uncaught/unapplied/
stale, `#13` still killed by `RECOVERYPARITY.pillswept`, `#141` (S2-29 alone) still `caught (153
failing)`. Build bumped `2026-08-05.1` → `.2` (comment-only edit to a shipping file, judged CODE
per the shipping-bump rule's own "in-code comment fixes explicitly included"). **[W78] not
actioned — it names a tooling gap (the derived co-change tool's surface must extend past
`tools/mutate.mjs`), owner Vitruvius, not a code fix.** Committed at `6b25a15`; its SHA recorded at
`318fc96`. (This paragraph read "Not committed yet" until the coverage audit reconciled it against
git — filed as that audit's F6.)

**⭐ Step 11 COVERAGE AUDIT DONE (2026-08-05, at `318fc96`) — verdict GAPS_NAMED, two gaps filed,
neither load-bearing on the deletions.** `Claude/Mendeleev/AUDIT-swipe-declone-stage2-subtraction.md`.
All nine §10 cells exist, are green, and **each was driven to red by execution** against its own
specified mutants; the reachability gates §5's collapse rests on (`NOGHOSTCLASS`, `NOOWNEDPANE`,
`NOGHOSTATALL`) all fired. Executed, not read: full suite 878/877/0-fail/1-skip ×2;
`source-gate-sweep.mjs` exit 0 (4/4 anchoring and firing); targeted sweeps of 15 re-derived indices
at HEAD, 0 uncaught/unapplied/stale; **seven mutants applied by hand**; both halves of C5's
group-count claim; a positive control for C2's token scan. Tree verified clean after every one.
⛔ **[W80] F1 (Structural) — SIX of §10's eighteen mutants have no entry in `tools/mutate.mjs`**
(`NOOWNEDPANE` ×2, `MOVERSHAPE` ×2, `PILLSWEPT` NATURAL-b, `DESTROYEDMOVER` NATURAL-a). Five were
filed as *owed at step 6* in Curie's own owed-mutant table and never landed; the sixth was never
filed, because that record's F-5 read §10's `DESTROYEDMOVER` row in its **superseded** round-1 form.
All six were executed here and all six are CAUGHT by their designated cells — so the cells are sound
and what is missing is the standing demonstration. **This is the EIGHTH instance of R10's class**,
one layer in from the seventh: the seventh was anchor *rot inside* the registry, this is the
registry's *completeness against §10*, and no mechanism in the tree compares the two. **Owner: the
test author.** ⛔ **[W81] F3 (Gap) — `MOVERSHAPE` asserts less than its stated claim, with an
executed counterexample:** `own: 'borrowed-real'` (a third key with a CONSTANT value) ships with
29/29 green. §10 and decision 20 specify a SOURCE assertion over the emitted key set; the shipped
cell uses a runtime read-recording proxy over the seam-field READ set, so a key not sourced from a
seam field is invisible. **Owner: the test author.** [W82] F2 (Misleading) — `DESTROYEDMOVER`'s two
demonstrated mutants (#31, #113) are registered under other cells' names, so it has no designated
entry of its own. [W83] F5 (Note) — the manifest's `coverage-audit` glob matches BOTH audits and
neither carries an `-rN` suffix, so **this audit's GAPS_NAMED does not redden the gate**; the earlier
audit's ADEQUATE clears it (confirmed by running the gate). Owner: the assistant. [W84] F6 (Note) —
the plan's Status line still reads "RED SUITE AUTHORED"; both records go on step 8's scrub list.
**Step 7 (device re-confirm) is UNRUN and nothing claims otherwise; step 8 (records scrub) is not
done.**

**⭐ [W80] [W81] [W82] CLOSED (2026-08-05, authored at `4357775`) — the coverage audit's three
test-author findings, each closed by execution.** `Claude/Curie/RED-swipe-declone-stage2-subtraction.md`
§9; writable set was `test/`, `tools/mutate.mjs` and records only — nothing under `js/` or `css/`.
**F1:** the six absent §10 mutants registered as `S2-33`…`S2-38`, every one applied and its failing
list read — all CAUGHT by their designated cells. **All eighteen of §10's mutants are now
registered**, recounted against §10 rather than incremented. **F3:** the counterexample was
reproduced FIRST over the whole behaviour suite (uncaught, 0 failing at 880 tests), then closed by
adding the SOURCE assertion §10 and decision 20 specify — the emitted key set, composed with the
existing read-set test rather than replacing it. Registered as `S2-39`; after the repair it is
CAUGHT by that cell **alone**. Its reader carries a 19-control fire drill, and **the drill caught a
real defect in the reader before any mutant did** (a separator inside a string at the entry's own
depth mis-split the key list; every case that passed did so because its string sat one level
deeper). **F2:** the measured expected-killer sets written into the registrations that carry
`DESTROYEDMOVER`. ⭐⭐ **The audit's F2 enumeration was short by three, found by executing the
neighbours:** `#20` and `#19` likewise cover `RECOVERYPARITY` NATURAL-b and `STALETOUCH` without
naming them, and **`#13`'s designated killers were FALSE, not merely missing** — its name read
"(-> I2/I20 pane test)", those cells went with the panes, and its only killer in the whole suite is
`RECOVERYPARITY.pillswept`. It had reported `caught` on evidence unrelated to the guard it claimed.
Suite **884 / 883 / 0 fail / 1 skip**; no build bump (test + tooling + records only). ⛔ **Still not
built:** the check that every mutant a plan's `vitruvius-coverage` block declares exists in the
registry (plan §14, owner the planner) — until it exists this gap can reopen with nothing
reddening; and nothing compares a registration's *stated* killers against its *measured* ones,
which is what let `#13` rot. **[W83] F5 and [W84] F6 remain open (the assistant, step 8); F4
remains routed to a later purge.** Next: the user's go — step 7's device gate, or step 8's scrub.

**⭐ Round-2 coverage audit ADEQUATE (`b4c8cee`), and its one test-author finding N2 is CLOSED
(2026-08-05, authored at `b4c8cee`).** `Claude/Mendeleev/AUDIT-swipe-declone-stage2-subtraction-r2.md`
→ `Claude/Curie/RED-swipe-declone-stage2-subtraction.md` §10. **N2 was a FALSE ALARM ON CORRECT
CODE**, which is the urgent direction: the emitted-key-set reader tracked quote state but had no
COMMENT state, so an ordinary apostrophe in a line comment (`// the gesture's borrowed element`)
opened a phantom quote and the cell reddened on a correct, correctly-reformatted adapter. The
recorded scar is that a gate firing on correct work gets switched off — this project has lost
gates that way three times. ⛔⛔ **The negative drill's NAME already claimed the missing control**
("…comma, brace, colon **or comment** inside a value") and contained no comment case — worse than
an unmentioned gap, because the name is what a later reader checks. **This is the SECOND instance
of the identical accident inside one cell** (the first was quote state, caught by the drill before
any mutant). Closed with comment state (line + block, openers tested before quote openers,
comment text dropped from entry text) and the three controls the name promised, plus the
false-NEGATIVE half. **Measured in both directions:** with comment state disabled, 13 tests / 11
pass / **2 fail** — the negative drill fails on the apostrophe case (the false alarm) AND the
positive drill fails on a third key hidden behind block comments (a real orphaned key reading as
clean). Restored: 13 / 13. Re-swept against the final suite, indices re-derived by name over the
152-entry registry: `S2-33`…`S2-39` all CAUGHT, `0 uncaught / 0 unapplied / 0 stale flags`;
`S2-39` still killed by the emitted-key cell **alone**. Suite **884 / 883 / 0 fail / 1 skip**; no
bump (`test/` only). Durable rule now stated in the file: **a case added to a drill list is added
to the NAME and the ARRAY together.** ⛔ **N1 is the planner's** (§10 `MOVERSHAPE`'s behaviour
sentence over-claims against its own fixture sentence) and was deliberately not re-derived here;
**N3 and N4 are the assistant's at step 8** — N3 notes the new manifest reports `red-suite`,
`build` and `adversary` red on verdict-token grounds, not coverage; **N5** carries F4 forward.

**⭐ N5 CLOSED (2026-08-05, authored at `855004d`) — the two vacuous assertions and BOTH dead
helpers deleted.** `Claude/Curie/RED-swipe-declone-stage2-subtraction.md` §11. **The absence claim
was re-verified independently, not accepted** (this campaign's absence claims have been wrong
twice): the retired class survives under `js/` at exactly one site — prose in a comment at
`js/swipe.js:207`; every case-insensitive `ghost` hit elsewhere is a comment or the unrelated
`GHOST_MS` peer-liveness timeout; the only `'nav-` fragments are `nav-in-left`/`nav-in-right` in
`js/nav.js`; `index.html` has none; and **`js/vendor/eruda.js` has zero** — checked deliberately
because `NOGHOSTCLASS` excludes the vendored bundle, which is exactly where a writer could hide
from the gate holding this property. ⭐⭐ **Then MEASURED, which is what settles it**: applying
`S2-23 NOGHOSTATALL` — the one registered mutant that actually mounts a `.nav-ghost` — leaves
`SNAPSHOTGONE` GREEN. Reading cannot prove an assertion is unable to fail. **Disposition: delete,
not disclaim** — the property is held twice by cells that CAN fail, both re-executed here
(`S2-23`→`NOGHOSTATALL`, 13 failing; `S2-25`→`NOGHOSTCLASS`, 1 failing, alone), and a disclaimer
beside a live `assert.equal(…, 0, 'must build NO home-snapshot pane')` does not stop the next
audit counting the MESSAGE as coverage — the class this pass has paid for three times.
Re-anchoring was not honestly available: the pass's subject is that no such node exists.
`test/swipe-stage6i.test.js`'s `ghosts` helper went with its last two call sites (leaving it would
have created the very dead-helper class N5 names next door); `test/swipe-stage5-residuals.test.js`'s
had zero call sites already. **Nothing hollowed**: `SNAPSHOTGONE` is still a named killer for
`S2-36` (16 failing) and `S2-38` (42 failing). Suite **884 / 883 / 0 fail / 1 skip** (unchanged —
assertions removed, not tests); sweep of `S2-23`/`S2-25`/`S2-36`/`S2-38` by re-derived index:
`0 uncaught / 0 unapplied / 0 stale flags`; no bump (`test/` only). ⚠️ **New, filed not fixed:**
`.claude/worktrees/agitated-albattani-669a34/` holds a stale pre-declone tree where
`js/app.js:466` still reads `wrap.className = 'nav-ghost'`. Not on any test path and no gate walks
it, so not a purge hole — but a repo-wide grep for a retired token hits it first and reads as a
surviving writer. Owner: the assistant, whenever that worktree is reaped.

**⭐ Step 11 coverage audit ROUND 2: ADEQUATE — the suite spans §10 and every designated mutant is
registered and executed.** `Claude/Mendeleev/AUDIT-swipe-declone-stage2-subtraction-r2.md` (audited
at `d4ae127`; supersedes the round-1 file, which is not edited — the `-rN` suffix makes
`artifactsOfRecord` drop the unsuffixed original, and the coverage-audit gate now reads `pass
(ADEQUATE)` on the new manifest). **All eighteen §10-designated mutants plus `S2-39` were re-swept
at this HEAD in four foreground batches — `0 uncaught, 0 unapplied, 0 stale flags` on every one** —
because a mutation result stops being true when the suite changes and it changed twice. Suite 884 /
883 / 0 fail / 1 skip; `source-gate-sweep.mjs` run directly, exit 0. **[W80] [W81] [W82] confirmed
closed by independent execution**, and all three of the test author's corrections (the CRLF caveat
does not apply to the registry; a killer count is meaningless without its scope — `S2-38` measured
at 42 and `S2-33` at 5 here; `#13`'s only killer is `RECOVERYPARITY.pillswept`) hold under this
audit's own runs. **[W83] F5 CLOSED at `d4ae127`.** ⛔⛔ **[W85] N1 (Gap) — the NINTH incomplete
blast-radius enumeration, again found by executing.** §10 `MOVERSHAPE`'s *behaviour* sentence claims
more than §10's own *fixture* sentence commissions: a third key attached to the recorded mover **one
line after** construction ships **UNCAUGHT at whole-suite scope** (884 / 883 / 0 fail, measured). The
source assertion reads one expression; the read-set proxy sees no seam read; the two witnesses that
catch the inserting form (the model fingerprint, the anchors gate) witness text movement, not the
property, and a line-neutral edit evades both. **Owner: the planner** — narrow the sentence, or
commission the measured occupant: `Object.freeze` on the adapter literal, which was applied and
measured **behaviour-neutral to the whole suite**. ⚠️ `js/app.js` is a non-strict IIFE, so the freeze
silences the write rather than throwing — the source assertion must also assert the wrapper, or its
removal re-opens the route silently. [W86] N2 (Misleading) — the emitted-key-set reader has **no
comment state** and its negative drill is *named* for comments while containing none; executed: a
correct two-key literal with an apostrophe in a line comment REDDENS the cell, with all three drills
green. A gate that fires on correct code gets switched off. **Owner: the test author.** [W87] N3
(Note) — the new manifest's narrow globs expose three gates red on non-coverage grounds
(`red-suite` and `build` declare no verdict token; the adversary's line parses as `ONE`), so the
campaign still reads INCOMPLETE and this audit's ADEQUATE is not the blocker. **Owner: the
assistant, step 8.** [W84] N4 — F6 is larger than round 1 named: the plan's Status line **and**
§11's step rows 5, 5b and 6 still read `open`. **Step 7 (device re-confirm) is UNRUN and nothing in
the suite or the records claims otherwise; step 8 (records scrub) is not done.**

**⭐ [W85] N1 CLOSED (2026-08-06) — the planner NARROWED the sentence rather than commissioning the
occupant.** `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md` §10 `MOVERSHAPE`, §13 decision 22,
§14. §10's behaviour sentence now claims the **one adapter EXPRESSION** its fixture reads, and says in
the row itself that the recorded mover's key set over its LIFETIME is not claimed here. **Both of the
audit's measurements were re-derived independently at `fb191bc`, not accepted:** the line-neutral
post-construction third key ships **884 / 883 / 0 fail / 1 skip — UNCAUGHT**, and the `Object.freeze`
occupant reddens **exactly two** tests (the anchors gate, and the emitted-key cell's own
fixture-sanity assertion) with no behavioural cell firing. ⭐ **One measurement the audit did not
make:** with the freeze in place *and* the offending write stacked on it, the failing set is
**identical** — so in this non-strict file the guard makes the defect **inert, not loud**, which is
why the occupant is only sound shipped together with a source assertion pinning the wrapper. Grounds
for narrowing: decision 20 forbids adding production surface to serve a test; decision 17 is the
precedent for deferring a better gate rather than folding it into a closed commit; and a freeze
changes the shipped form of a pass whose device gate stands at 5 of 6. §14 carries the deferral with
an owner, a **trigger** (the next change that writes to a `d.movers` member outside `toMover`), a
consumer and the measured two-part design. Three DecisionLog entries. **Records only — no build bump,
no source or test change.** ⛔ **One scrub follows and is the test author's:**
`test/swipe-declone-stage2-subtraction.test.js:89` still states the old lifetime claim in the cell's
header, thirty-seven lines above the same header's own honest-limit paragraph that contradicts it —
the exact shape this campaign already filed against a gate file whose header advertised a guard it no
longer had.

## ✅ Recently closed (kept only as "don't re-investigate")
- **"iOS keeps an unclearable cover cache" — DISPROVEN, CLOSED (`.149`).** Epoch-clean reading proved every cover goes through the SW and re-caches; covers just re-download fast, which *looks* like nothing cleared. Airplane mode is not a valid test of the clear.
- **Options→HUB refactor · library-scaling virtualization · durable-progress spine + device-delete** — all built; scaling on-device gate passed → `[[tomeroam-durable-progress-plan]]`, `[[tomeroam-library-scaling-plan]]`.

| T-LP1 | Letter picker (A–Z strip) — long-standing minor issues, user-reported | unassigned | DEFERRED by the user 2026-08-04 until the current campaign lands | derive the symptoms from the user, then route | waiting on the campaign | `Claude/Zelda/DEVICE-GATE-swipe-declone-stage2-2026-08-04.md` |
| T-VB1 | Device gate item 5 (browse↔browse on a >600 list) — synthetic-library bench | the test author | BENCH BUILT AND RUN 2026-08-05, PASS on 18 gestures at HEAD `bc2c7f6`; item 5 NARROWED, not closed | record item 5 as bench-covered for row presence / landing / reveal and still device-owed for paint on iOS | none | `Claude/Curie/windowed-browse-swipe-bench-test-design-2026-08-05.md`, `tools/bench-virtual-swipe.mjs` |

| T-S7A | Swipe stage 7 (the Browse lease boundary) — plan review | the adversary | ROUND 2 TEMPER APPLIED 2026-08-06 (`734b393`), all three edits landed with their acceptance predicates EXECUTED and the measured results recorded beside them. **No round 3 is owed** — the amendment stayed confined | the §17 step-2 strike on U1, dispatched blind to both readings of the exit set | none | `Claude/Plans/PLAN-swipe-stage7.md`; `Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r2.md` (r1 is the prior round) |
| T-S7E | Stage 7 F1 — §11's co-change set and its non-registry reader class | the builder (at build) | CLOSED 2026-08-06 in `734b393`. Class (c) went from one reader to three: `ADAPTER_DECL`, the ungated `tools/gen-swipe-model.mjs` / `docs/swipe-model.generated.txt` pair, and three current-truth comments no gate reads — the comments found by EXECUTING, absent from the reviewer's own table. Eight live-reference test files declared as a suite-caught class; step 5b clause 2 gains `.hold`; declared figure now thirteen. MEASURED: the grep predicate returns 6 lines in 2 files at HEAD, the pre-build baseline it must drive to zero, and no mutation anchor sits on any comment site | the build drives the grep predicate to zero and regenerates the doc in the same commit | none | `Claude/Plans/PLAN-swipe-stage7.md` §11 |
| T-S7F | Stage 7 F2 — the release status had no production consumer | — | CLOSED 2026-08-06. The guarded `PBDebug.log` in `returnLease` is a real production consumer (`index.html:233` loads `js/debug.js`); the harness captures it (`test/app-harness.js:632`); `LEASEINVALID`'s trace clause + `NATURAL-d` are the proving test. EC §4.15 satisfied on both halves | none | none | `Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r2.md` F2 |
| T-S7G | Stage 7 F3 — clause 3's `registered` check, vacuous through two successive repairs | the builder (at build) | CLOSED 2026-08-06 in `734b393`. (a) §12's "verified" wording is gone; the `to`-side property is now an OBLIGATION on the builder's edit with a fourth step-5b check. MEASURED against `MUTATIONS`: control 0 matches, minimal re-anchoring 3 (all false wrapper-deletions — the vacuity is real), obligated re-anchoring exactly 1 and it is the wrapper-deletion mutant. (b) `NATURAL-b` is now a REGISTRY-side mutant, because measurement showed the review's own prescribed two-part form ALSO cannot kill — widening a `some()` that is already true cannot fail the assertion | the build lands the obligated re-anchoring; step 5b's fourth check verifies it | none | `Claude/Plans/PLAN-swipe-stage7.md` §12, §13 |
| T-S7K | `LEASEINVALID`'s supersession route may be undrivable — surfaced by the plan reviewer, deliberately NOT struck | the adversary | OPEN 2026-08-06 | treat as an input to the §17 step-2 strike (its subject is exit reachability, which is U1), and to the test author at step 3 | none | `Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r2.md` "Outside scope, surfaced not struck" |
| T-S7I | `test/swipe-model.test.js` cannot detect prose rot in the model it guards: its comparison is generator-versus-generated, so both drifting together is green by construction | the coverage auditor | QUEUED 2026-08-06 behind the campaign — a gap in a gate stage 7 merely exposes, and it outlives stage 7 | dispatch the coverage auditor once the campaign lands; the routing is unambiguous and needs no decision. It is the mechanism behind T-S7E's ungated half, so brief it with that | agents run sequentially; the strike holds the slot | `Claude/Charpy/PLAN-swipe-stage7-2026-08-06-r2.md` "Outside scope, surfaced not struck" |
| T-S7B | The stage-6 DEFERRED-to-7 clause is verified against source: 7 of 10 items have NO SUBJECT | the planner | DONE 2026-08-06, per-item table with citations | none — a deferred item whose subject was deleted is closed, not carried forward | none | `Claude/Plans/PLAN-swipe-stage7.md` §3 |
| T-S7C | `Claude/Subsystems/swipe-reveal.md` is STALE: it describes disposeOwnedPanes, holdGhostUntilPaintable, dropPanes and the translateZ(0) home rule as current; none exists at HEAD | the assistant | OPEN 2026-08-06, found while verifying the stage-7 inheritance | scrub to current truth at stage 7 step 8, or sooner | none | `Claude/Plans/PLAN-swipe-stage7.md` §2, §11 |
| T-S7D | The stage-6 entry's two device-pending claims are false at HEAD: 6h's scroll-settle fix was deleted by the subtraction pass, and 6g's translateZ(0) form was reverted after it flashed on device | the assistant | OPEN 2026-08-06 | scrub the parent plan's stage-6 entry so it stops promising two fixes the tree does not contain | none | `Claude/Plans/PLAN-swipe-stage7.md` §3; `css/app.css:190-197`; `js/app.js:708` |
| T-S7J | `tools/mutate.mjs:432-438` — the `swipe4 no-dead-fields` mutant's comment still says `sameBrowseHost` is "STILL unconsumed until stage 6"; stage 6 has passed and the field's planned consumer was retired | the assistant | OPEN 2026-08-06 | scrub the rationale; the mutant itself is live and correct | none | `Claude/Plans/PLAN-swipe-stage7.md` §11 |
| T-S7H | The plan gate takes minutes per plan and exits 0 when handed a path in argv instead of a hook payload on stdin | the assistant | OPEN 2026-08-06, found by a negative control | treat a gate PASS as necessary and never sufficient; do not cite it as evidence | none | `Claude/Plans/PLAN-swipe-stage7.md` §15 R8 |
