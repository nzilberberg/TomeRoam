# BUILD — Swipe/reveal Stage 6c (pane-less supersession + settle-phase identity guard)

Type: build log (Brunel)
Date: 2026-07-26
Input plan: `Claude/Plans/PLAN-swipe-stage6c.md` (`94f5567`), §3/§4/§7
Input red suite: `Claude/Curie/RED-swipe-stage6c.md` — `test/swipe-stage6c.test.js` (G1, G2, G3,
G-chain, W, W(armed), PG)
Verdict: **BUILD_GREEN**

## 1. Exact slice completed

Realized plan §3/§4/§7 in `js/app.js`, all inside `bindSwipeBack`'s `begin()`, `settle()`'s rAF
callback, and `settle()`'s inner `finalize`:

- **`begin()`'s `finishing` gate narrowed to its NEGATIVE form** — `if (finishing &&
  !(session && paneLess(session))) return;` — replacing the blanket `if (finishing) return;`.
  Rejects when `finishing` is true and there is no live PANE-LESS session to supersede (a null
  `session`, or a PANE-OWNING one); only a live pane-less session falls through.
- **The leftover-state recovery's entry predicate broadened** — `if (d || document.querySelector
  ('.nav-ghost') || (finishing && session))` — to admit a pane-less settling session (`d === null`,
  no `.nav-ghost`), reading `cur = d || session` for the render/scroll fields the recovery restores.
- **`finishing = false` added to the recovery**, after `dropRowHold()` and before the identity is
  nulled last, so a superseding touch that never arms cannot leave `finishing` stuck (cell W).
- **`cur === session` identity guard added to the settle rAF callback** (writes borrowed-real
  mover transforms) and to `finalize`** — placed after the `done` set and the two shipped cancels
  (`cancelAnimationFrame`/`clearTimeout`), before the `try { runFinalize() } finally {...}` block,
  so a stale post-supersession fire cannot enter the `finally` and drop the successor's row hold.
- **New helper `paneLess(s) = !s.movers.some(m => m.own === 'owned-pane')`**, added once near the
  session declarations, read by the gate.

## 2. Files changed

- `js/app.js` — production. The four edits above, plus two comment corrections for accuracy
  (Standards §7 — a comment directly contradicting the code it sits beside is a self-contradiction):
  the stage-3 "STAGE 3 IS THE OWNER + IDENTITY, NOT ENFORCEMENT... UNREACHABLE BY CONSTRUCTION"
  rationale comment (219-234 pre-build) rewritten to state the guard is now reachable and
  load-bearing for the pane-less window, still deferred for the pane-owning/held-reveal window.
- `tools/mutate.mjs` — build tooling. Six of the pre-existing stage-6a mutation anchors (`d ?
  d.clobbered : false` / `if (d) window.scrollTo(0, d.scroll0)` / the `dropRowHold();
  session = null; d = null;` ordering triple) had rotted against the edited source (variable
  renamed `d`→`cur`, a new `finishing = false;` line inserted) — re-anchored to the current text,
  same mutation semantics. Three new mutations registered and mutation-verified (§10): stage6c W
  (omit the `finishing = false` clear), stage6c G1 (remove the settle-rAF guard), stage6c G2/G3
  (remove the finalize guard).
- `docs/swipe-model.generated.txt` — regenerated build tooling output (`node
  tools/gen-swipe-model.mjs`). The `begin/supersession` SOURCE FINGERPRINT moved
  (`d39534854e3cc348` → `c5ab2fae0fd03654`) because the mirrored region (`begin()`'s whole gate +
  hard-reset block) is exactly what this build changed; three navStack-append-census line-number
  citations shifted with it. Per the build assignment's MODEL-GATE NOTE, the VERIFIED pin in
  `test/swipe-model.test.js` was **not** edited — see §16.

No test file, `test/app-harness.js`, or `Claude/Decisions/PolicyLedger.mjs` was touched.

## 3. Public paths exercised

`begin()` → the narrowed gate → the (possibly widened) leftover-state recovery, and `settle()`'s
rAF / `finalize` (the `transitionend`-vs-340ms race), all driven through the real app-harness
(`h.touch`, `h.clock`, `h.raf`) — the SUCCESSOR's real DOM (borrowed-real mover transforms) and the
real SWIPE log are the observable channel, exactly as the plan and red report specify. No new
public entry point.

## 4. Production behavior changed / deliberately unchanged

**Changed (the Stage 6c promise):** a second gesture on a genuinely pane-less transition
(`{home,browse,overlay}→overlay`, `overlay→browse`) can now arm while the first is still
settling/finalizing, instead of being rejected outright; the first session's stale settle-phase
continuations (settle rAF, 340ms `settleTimer`, a late `transitionend`) then no-op instead of
mutating the successor.

**Deliberately unchanged (parity, per plan §3):**
- Pane-OWNING sessions (`home↔browse`, every `→home`) still reject a second touch in every phase —
  cell PG.
- The `.226` `cancelAnimationFrame(cur.settleFrame)` and the 6b `clearTimeout(cur.settleTimer)`
  loser-cancels — untouched, same position; the identity guard is additive.
- The `done`/`dropped` exactly-once guards — untouched.
- `holdGhostUntilPaintable` and the entire reveal-paint path — untouched.
- The `transitionend` listener (`{once:true}`) — untouched, not re-owned or removed; its
  harmlessness after supersession comes from the `finalize` identity guard (cell G3), not removal.
- Stage 6a's DRAGGING-supersession recovery and its pane disposal — untouched (regression RG6a).

## 5. Parity vs new policy

New policy (Engineering Contract §4.19): supersession of a live pane-less session is newly
DEFINED and permitted — previously undefined/rejected. Classified in the plan (§2.3/§4) as the
honest, narrowed delivery of Option A; not a parity extraction.

## 6. Contracts / identities / dead fields

No `vitruvius-contract` exact-key schema touched (plan: `contract_shape: false`). No new field:
the guard reads the existing module `session`; no handle is nulled and no `PBSwipeSession` shape
extension was added (plan §2.6, F1) — confirmed not written by this build. `finishing` is an
existing boolean, not a new field.

## 7. Resources moved under ownership / ownership endpoints

No resource changed owner. The pane-less session's release sequence in the recovery is: reset
movers/scroll/render (reading `cur`) → `dropRowHold()` (reads `session.hold`) → `finishing = false`
→ `session = null` → `d = null` — dropRowHold before the identity-null (unchanged 6a invariant,
app.js:1132-class ordering), `finishing` cleared before the identity-null (plan §7 ordering
contract).

## 8. Asynchronous continuations controlled

The settle rAF and `finalize` (reached via the 340ms `settleTimer` or a `transitionend`) each read
the live module `session` at call time and compare to the captured `cur`; supersession installs the
successor as `session` before either can fire, so a stale fire always observes `cur !== session` and
no-ops. No continuation is newly cancelled/nulled — EC §4.6's "owner remains valid" check, not a
cancel.

## 9. Intermediate states asserted

Verified by the target suite directly: G1/G2/G3 assert the successor's transforms/log are
UNCHANGED both before and after the stale callback fires; W/W(armed) assert the swipe count before
the superseding tap and again after the next full swipe.

## 10. Exact mutation evidence (Gate B, per-cell)

### Cell W (and W(armed))
- Designated tests: `W — a superseding mid-screen tap that never arms leaves the next swipe
  working`, `W(armed) — a superseding edge-tap that arms then ends before the lock leaves the next
  swipe working` (`test/swipe-stage6c.test.js`)
- Production seam: the supersession recovery, `finishing = false;` (`js/app.js`, between
  `dropRowHold();` and `session = null;`)
- Registered mutation: `tools/mutate.mjs` #19 "stage6c W: the supersession recovery omits the
  finishing=false clear"
- Green before mutation: confirmed (`node --test test/swipe-stage6c.test.js`, 7/7 pass).
- Mutation applied: `node tools/mutate.mjs 19` (drops the `finishing = false;` line).
- Designated tests failing on the intended assertion: both W and W(armed) fail at `'RED-FIRST:
  after a superseding tap the recovery must clear finishing so the next swipe engages'` (`starts(h)
  .length` stays at `before`, i.e. the next swipe never engages) — G1/G2/G3/PG/G-chain stay green.
- Restored to green: confirmed (`node tools/mutate.mjs --restore`; `test/swipe-stage6c.test.js`
  7/7 pass).

### Cell G1
- Designated test: `G1 — a stale settle rAF from a superseded pane-less session writes no
  transform onto the successor` (`test/swipe-stage6c.test.js`)
- Production seam: the settle rAF callback, `if (cur !== session) return;` (`js/app.js`, inside
  `cur.settleFrame = requestAnimationFrame(() => {...})`)
- Registered mutation: `tools/mutate.mjs` #20 "stage6c G1: the settle-rAF cur===session guard is
  removed"
- Mutation applied: `node tools/mutate.mjs 20`.
- Designated test failing on the intended assertion: G1 fails at `'G1: the stale rAF must not
  overwrite B's #options transform'`; the supplementary G-chain cell also fails on the same
  mechanism (both stale rAFs now stain C). G2/G3/W/W(armed)/PG stay green.
- Restored to green: confirmed (`node tools/mutate.mjs --restore`; 7/7 pass).

### Cell G2/G3
- Designated tests: `G2 — a 340ms settleTimer firing after supersession runs no finalize over the
  successor`, `G3 — a late transitionend after supersession runs no finalize over the successor`
  (`test/swipe-stage6c.test.js`)
- Production seam: `finalize`, `if (cur !== session) return;` (`js/app.js`, after the `done` set
  and the two shipped cancels, before the `try { runFinalize() } finally {...}` block)
- Registered mutation: `tools/mutate.mjs` #21 "stage6c G2/G3: the finalize cur===session guard is
  removed"
- Mutation applied: `node tools/mutate.mjs 21`.
- Designated tests failing on the intended assertion: G2 fails at `'G2: a stale finalize must not
  commit/abort over B'`; G3 fails at `'G3: a late transitionend must not run finalize_A over B'`;
  the supplementary G-chain cell fails too. G1/W/W(armed)/PG stay green.
- Restored to green: confirmed (`node tools/mutate.mjs --restore`; 7/7 pass).

### Re-verification of the six re-anchored stage-6a mutations (#14-#18 in the list; VR-tagged)
Two spot-checked directly against their designated suite (`test/swipe-stage6.test.js`) after the
`d`→`cur`/`finishing`-insertion re-anchoring, to confirm the re-anchor did not silently change what
each mutation catches:
- #14 (Browse-hold-before-render ordering) and #15 (identity-null-before-hold-release ordering):
  both still redden exactly `VR — superseding a live drag on a VIRTUALIZED browse->browse source
  keeps the source rows ACTIVE and realized, not rebuilt or leaked` and nothing else in that file,
  then restore green (6/7 pass, 1 pre-existing device-only skip, both before and after).
`test/mutation-anchors.test.js` (both tests: anchor-match + no-op-check) — green, confirming all
21 anchors (the pre-existing 18 plus the 3 new) match current source and each mutation's `to`
differs from its `from`.

All seven mutations above are omission mutations on a real production seam (Engineering Contract
§4.10), each reddened its DESIGNATED test(s) on the INTENDED assertion (not a broad suite
failure), and each was restored to green before the next was applied. `git diff js/app.js` after
the full mutate/restore cycle shows only the intended production edits — no mutation artifact
remains.

## 11. Known-red tests still open

None. This slice introduces no known-red (plan §8; no `Claude/Decisions/PolicyLedger.mjs` entry
added or needed).

## 12. Dead fields introduced, consumed, or removed

None introduced (§6). The settle-phase NULL-on-retire writes and `transitionListener`
session-ownership/removal named in plan §11 were deliberately NOT added — confirmed absent from
the diff — because their reader (a retired-while-`cur === session` state) is unreachable until the
held-reveal phase is supersedable (6d/7).

## 13. Temporary exceptions and expiration

None.

## 14. Deferred work and assigned stage

Per plan §11, unchanged by this build: supersession of the PANE-OWNING set (`home↔browse`, every
`→home`) and the held-reveal-await-paint phase; the settle-phase and reveal-phase NULL-on-retire
writes; the `transitionListener` session-ownership/removal; `finalizationPlanFor`/rich
`planFor()`; `sameBrowseHost`; pane `release()`/`dispose(reason)`; the full `recoverSession`
matrix; I10/I17 paint-gated reveal centralization. All assigned to Stage 6d/7.

## 15. Full test / build-coherence / behavioral-mutation / source-gate results

- Target red suite before build (Curie's captured red run): 6 fail (G1, G2, G3, W, W(armed),
  G-chain), 1 pass (PG) — `Claude/Curie/RED-swipe-stage6c.md` §2.
- Target suite after build: `node --test test/swipe-stage6c.test.js` — **7 pass / 0 fail**
  (G1, G2, G3, W, W(armed), PG, G-chain).
- Full suite after build, with Curie's fingerprint re-pin applied (`node --test "test/*.test.js"`)
  — **705 tests, 704 pass, 0 fail, 1 skipped, 0 todo**. The one skip is the pre-existing
  device-only `KEEPER` cell, unrelated to this slice. Every regression guard named in the plan's §9
  matrix is green: RG226, RG6b, RG6a, RGend
  (`test/swipe-invariants.test.js`, `test/swipe-stage6.test.js`, `test/swipe-stage6b-loser-cancel
  .test.js`), plus the §4.19 policy-ledger gate, the descriptor-coverage gate, the
  contract-function gate, the no-silent-coverage-exit gate, the build-stamp coherence test, and the
  transition-matrix fingerprint pin — all green.
- `test/mutation-anchors.test.js` — green (both tests; confirms the 3 re-anchored/6 stale
  constants and the 3 new mutations all resolve against current source, and none is a no-op).
- Gate A: not applicable — no `vitruvius-contract` block in this plan (§ Applicability:
  `contract_shape: false`); `test/construction-consumers.test.js` unaffected, green in the
  full-suite run.
- Gate B: closed for all four assigned cells (G1, G2, G3, W/W(armed)) — §10, full designated-test
  mutation evidence for each, via newly-registered `tools/mutate.mjs` entries #19/#20/#21. PG and
  G-chain are boundary/supplementary cells proven directly by the target-suite run (§15) rather
  than a dedicated registered mutation; PG's boundary is additionally exercised as the "no test
  fails" control in the G1/G2/G3/W mutation runs above (PG stayed green under all four).

## 16. Fingerprint / model-gate note (handoff to Curie)

`docs/swipe-model.generated.txt` was regenerated after the production edit changed the mirrored
`begin()` region's source text. The `begin/supersession` SOURCE FINGERPRINT **moved**:

```
was: d39534854e3cc348
now: c5ab2fae0fd03654
```

The other three fingerprints (`navTo stack rule`, `begin/nav-relation`, `end/state-routing`) are
unchanged — those regions were not touched. Per the build assignment's MODEL-GATE NOTE, Brunel did
**not** edit the VERIFIED pin in `test/swipe-model.test.js` — that is a test file. Curie has since
re-verified the mirrored rule and re-pinned it (`supersession: 'c5ab2fae0fd03654'`, line 50),
turning `test/swipe-model.test.js` green; that change is present in the working tree and is Curie's,
not Brunel's. With the re-pin applied the full suite is 0 fail (§15).

## 17. Charpy F3 confirmation

`Nav.resetSwipeStyles` (`js/nav.js:102-108`) DOES clear the CSS `transition` property, matching the
`app.js:712`-pattern this build relies on: `for (const el of els) if (el) { el.style.transform =
''; el.style.transition = ''; el.style.willChange = ''; el.style.zIndex = ''; }`. Confirmed by
direct read, not inference. No gap.

## 18. Statements from the assignment narrowed after inspecting production

None. The plan's §3/§4/§7 mechanism (gate form, recovery-entry predicate, guard placement) matched
the actual `begin()`/`settle()`/`finalize()` structure at the bench exactly as described; no
deviation was needed.

## 19. Build-number bump owed

Not performed here — per the build assignment, Brunel does not commit; a build-number bump is
owed on this change (PWA deploy rule: any commit bumps the build number) at commit time.

## 20. Records reconciliation owed (plan §10, not applied by this build)

Scoped out of this build per the assignment (production files + build report only). Left for
Zelda/the next records-carrying session, per plan §10:
- `js/app.js` `paneKindOf`/classifier comment (686-692, pre-build numbering) — correct the
  pre-existing false "app-ghost (browse→browse)" claim against `constructionPlanFor`'s actual rule.
  Not touched by this build (unrelated to the edited region).
- `Claude/Subsystems/swipe-reveal.md` §8/§13/§14 — narrow the pane-disposal-protection rule to
  PANE-OWNING sessions and record the true supersession boundary.
- `Claude/Decisions/DecisionLog.md` — the "Owed to stage 6" null-handle entry is NOT discharged by
  6c (re-home to 6d/7); append the dated Stage-6c decision (true pane-less/pane-owning boundary,
  identity guard as sole mechanism, the F2/F5 wedge fix, Option-A's honest scope).
- `Claude/Plans/PLAN-swipe-reveal.md` §7 step 6 — annotate the ownership half as landed in 6c.
- Campaign-glob reconciliation (`swipe-stage6` gates vs a `stage6c` artifact name) — flagged open
  since 6b, not resolved by this plan or this build.

## 21. Incident — a stuck mutation-sweep left a false regression in the working tree

A bench gate re-run reported 702 pass / 2 fail after Curie's re-pin, both traced to the ghostY
line in the recovery block reading `d.ghostY = ('ghostY' in c.capture) ? c.capture.ghostY : 0;`
instead of the original `if ('ghostY' in c.capture) d.ghostY = c.capture.ghostY;`. Root cause,
confirmed against HEAD and the process table: that line was NOT a Brunel edit — it is mutation #64
(`swipe5 F2-r-wiring`)'s `to` text. The `node tools/mutation-sweep.mjs --affected` I launched in the
background was interrupted (MCP disconnect / concurrent activity) with mutation #64 still applied,
leaving the working tree mutated plus its `js/app.js.mutbak` pristine backup. `git show HEAD:js/app.js`
showed the original conditional; my diff never touched that line. Fix: `node tools/mutate.mjs
--restore` (restores from mutbak = my correct edits, removes mutbak). After restore the ghostY line
is the original conditional, the two failing tests (`swipe-stage5-wiring.test.js:103` F-regress,
`mutation-anchors.test.js` anchor #64 F-anchor) are both green, and no anchor re-pin was needed —
anchor #64's `from` matches the restored original again. Lesson: never leave a backgrounded mutation
sweep running unattended past the point another actor may read the tree; restore before handoff.

## 22. Handoff

- **Source artifact:** `Claude/Plans/PLAN-swipe-stage6c.md` (`94f5567`), §3/§4/§7.
- **Verdict:** BUILD_GREEN.
- **Next owner:** Poirot (code review), then Mendeleev (coverage audit), then Loki (re-strike the
  §4 load-bearing promise on the corrected pane-less domain), per plan §12 sequencing. The
  fingerprint move (§16) has been re-verified and re-pinned by Curie (`c5ab2fae0fd03654`).
- **Records:** this report filed at `Claude/Brunel/swipe-stage6c-build.md`. No git commit/add
  performed (per assignment); a build-number bump and the plan §10 records reconciliation (§20)
  remain owed at commit time.
