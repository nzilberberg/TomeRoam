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
pass, mutations verified); W11 (O1, low) + W8 (stage-5 scope) stay OPEN. Disposition + stage-4 scope
decisions + stage-6 cleanup debt are all in DecisionLog. **`.234`** then closed the `.233` review
(`Claude/Poirot/90a139c-swipe-stage4-contract-gates.md`, verdict fix-then-ship): the
`mutation-sweep.mjs --affected` selector's four false-clean cases (F-cf1 rename source dropped, F-cf2
new file in a new untracked dir missed, F-cf3 odd-char names escaped / false comment, F-cf4 no selector
tests) are fixed by parsing `git status --porcelain=v1 -z --untracked-files=all` + a new selector test
set — each reproduced with real git and mutation-verified. **`.235`** then fixed **F-y**, a
worktree-column (Y=R, from `mv`+`git add -N`) rename false-clean that `.234` left — the X-only parser
dropped the rename source. Found by an external re-review (ChatGPT), MISSED by this project's own
re-review (`Claude/Poirot/009dbc9-selector-fix-rereview.md`); red-first regression added, both columns
now handled. Watch-list W17 + W19 CLOSED (.235); W8 (stage-5 scope) + W11 (O1, low) stay OPEN. Also this
session: Poirot's coverage-ledger clear mark split into `✓` (executed, command cited) vs `~` (reasoned,
unverified), gate-enforced — the durable fix for the `✓`-on-reasoning miss (see DecisionLog). **`.236`**
sharded the CI mutation-sweep 8 ways (`--shard=I/N`, partitioned) — ~13 min → ~2 min, still every-push.

**Stage 5 is TEMPERED, not cleared to build (2026-07-22).** The plan verifier struck the stage-5 step
(`Claude/Charpy/PLAN-swipe-reveal-stage5-2026-07-22.md`, verdict TEMPER): end-state architecture sound, but
the build is blocked on **four planner decisions**, now OPEN in DecisionLog (waiting on the planner, not on
code): **F0 SCOPE** — conflicting records leave three admissible scopes unresolved (plan→A, header→C,
log→B or C, not uniquely B); pick one — A: capture recipes only; B: capture + real host/mover resolution
(rendering stays in app.js behind injected callbacks; B may be the cleanest); C: whole construction boundary
incl. render dispatch — and scrub the records that do not match. **F1 SEAM** — "move pane builders **unchanged**" is not compilable (`ghostApp`/`snapshotHome`
reference app.js closures — `freezeArt`/`ghostWrap`/`copyScroll`/`copyAnimPhase`/`lastAnimResidual`/`d`/`$` —
absent in `swipe.js`); state the deps/return contract. **F3 HOST FIELDS** — `sourceHost`/`destinationHost`
are dead only under scope A; a real consumer under B/C; a consequence of F0, not independent. **F6 PANE
LIFECYCLE** — state whether stage 5 begins the §3.6 pane abstraction or explicitly defers `release()`/
`dispose()` to stage 6 (a raw-node/capture-result return is valid if deferred). Plus into the step: **F2**
(classify the new public surface for the export gate; DOM access lazy; the gate can't prove builder
behaviour) and **F4** (recipe tests + a mutation-verified wiring test, asserting the element joins the
production mover set with correct ownership/ordering — not a `d.movers` internal), with the seam per **F5**
(prefer returned capture metadata; do not pass `d` without explicit justification).
**Do NOT start stage 5 until F0/F1/F3/F6 are resolved by the planner and F2/F4/F5 are in the step.**

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
- **Reset identity-envelope hardening** (reviewer-set order): `pb_prog2Keys` identity envelope; **dev8 collision CONTAINMENT** (keep the 32-bit title namespace, match self only on FULL client id — do NOT widen/migrate); download-staleness API split (`hasDownloadRecord`/`isDownloadUsable`/`isDownloadStale`). Depth + the probability-vs-proof reasoning rule → `[[tomeroam-reset-tombstone-plan]]`, `[[tomeroam-durable-progress-plan]]`, and the process lessons in `[[tomeroam-status-board]]`.
- **Native cross-app resume (no LMS):** capture the currently-discarded `PlaySessionStateNotification.viewOffset` → durable `Progress`; optional `/status/sessions` launch poll → `[[tomeroam-crossapp-resume]]`.
- **"Delete all downloads":** deferred by user (`.119`); a real data-loss gap (removing the iOS icon destroys everything silently), not a space issue.
- **Tombstone compaction:** the last unbuilt reset piece; low urgency → `[[tomeroam-reset-tombstone-plan]]`.
- **Records/memory hygiene (deferred 2026-07-20, not urgent):** (1) **Slim the memory hub** `tomeroam-rebrand` to repo-underivable content only (footguns / verified facts / architecture rationale / identity) and demote its cache-value — tactical status and "standing intent" that is really decisions — to pointers; it is ~60% source / ~40% cache and the cache half will drift like the old status board did. (2) **Run a `consolidate-memory` pass** — three stale/over-broad items surfaced just by being touched this session (the deploy-rule "docs bump" over-broadening, the hub-maintenance OPEN-list, the drifted status board), which signals rot being trusted at session start. Principle to apply: memory holds only what `git log` + `Board.md` + `DecisionLog.md` cannot derive.
- **Plugin activation:** staged plugin changes need an admin `install-plexbooks.bat` reinstall (resume-playlist rename, Presence mesh, PlexDb read-only) to activate LMS→app cold resume. The app is unaffected until then; app-only users never need it.

## ✅ Recently closed (kept only as "don't re-investigate")
- **"iOS keeps an unclearable cover cache" — DISPROVEN, CLOSED (`.149`).** Epoch-clean reading proved every cover goes through the SW and re-caches; covers just re-download fast, which *looks* like nothing cleared. Airplane mode is not a valid test of the clear.
- **Options→HUB refactor · library-scaling virtualization · durable-progress spine + device-delete** — all built; scaling on-device gate passed → `[[tomeroam-durable-progress-plan]]`, `[[tomeroam-library-scaling-plan]]`.
