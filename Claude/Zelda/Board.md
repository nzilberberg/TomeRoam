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
Stage 4 shipped + pushed, **awaiting the between-stages external review**; do NOT start stage 5
without the user's go. Plan of record → `Claude/Plans/PLAN-swipe-reveal.md`; the stages-gated-by-
review policy → DecisionLog. **The headline flash bug is STILL OPEN** — depth, dead-ends, and the
8 environment traps → `[[tomeroam-swipe-repaint-saga]]` (READ BEFORE TOUCHING THE SWIPE /
VIRTUALIZER / browse.js). 🔴 A RED test gradient (`--page-bg`) is still live in `css/app.css` —
remove once background movement is confirmed fixed. **Two decisions still owed to DecisionLog**
(stage-4 scope: three-layer oracle / construction-only planFor / mirror retirement; and the
stage-6 cleanup "null the stored session handles when timers cancel or fire") — content is in the
swipe session's hub notes; the swipe session files them.

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
