# Coverage Audit — Swipe/reveal Stage 6a (supersession pre-stack recovery)

Type: coverage-audit (Mendeleev)
Date: 2026-07-26
Input artifact (audited build): `b4714ce` (working tree clean at HEAD `b734e31`, a docs-only Poirot
re-review commit atop `b4714ce`; the code and tests at HEAD are byte-identical to `b4714ce`).
Gate: **publish gate** (the suite is green; the audit confirms it genuinely sweeps what the pre-build
model said it must).
Coverage Model: `Claude/Plans/PLAN-swipe-stage6.md` §8 (catalog) + §9 (coverage/mutation matrix).
Suite: `test/swipe-stage6.test.js` (VR/OR/NC/PS/OB/OB-home/KEEPER); `test/swipe-invariants.test.js`
(SR/SC `{todo}`, PD/ST green); the full `test/*.test.js`.
Node: `C:/Users/nzilb/tools/node-dist/node.exe`.

## Verdict

**COVERED — ADEQUATE.** Every applicable cell of the Stage-6a Coverage Model is swept by a concrete
test that forces the cell's condition and asserts its outcome. The load-bearing cell VR discriminates
BOTH ordering mutations by execution (confirmed below, not read). The two long-lived known-reds (SR/SC)
are behaviourally implemented and mutation-defended; their `{todo}` markers + PolicyLedger entries
remain pending the sanctioned §10 records scrub — a records-hygiene retirement, not a coverage hole.
The device-only KEEPER is honestly marked `{skip}` with a reason that names why jsdom cannot reproduce
it. **The stage may complete after the §10 scrub.** No bare cell; no implementation gap; no
Coverage-Model gap. Findings below are Notes, none blocking.

## Matrix summary

| | cells | swept | red-first→green | green guard | bare |
|---|---|---|---|---|---|
| Stage-6a model (plan §9) | 9 + OB-home | 10 | VR, OR, NC, SR, SC, OB-home (6) | PS, OB, PD, ST (4) | 0 |
| Device-only (Loki NB residual) | KEEPER | n/a (honest `{skip}`) | — | — | 0 |

Execution reconciliation (this pass):
- `--test test/swipe-stage6.test.js` → **7 tests, 6 pass, 0 fail, 1 skip (KEEPER), 0 todo.**
- `--test test/swipe-invariants.test.js` → SR and SC pass their assertion as `ok … # TODO`
  (behaviour implemented; the `{todo}` marker is retained for the §10 scrub). 21 pass / 2 todo / 0 fail.
- `tools/mutation-sweep.mjs 14 15 16 17 18` → **all 5 CAUGHT; 0 uncaught, 0 unapplied, 0 stale.**
- `--test "test/*.test.js"` → **690 tests, 687 pass, 0 fail, 1 skip, 2 todo.** Gates
  (policy-ledger, mutation-anchors, swipe-model, descriptor-coverage, browse-virtual, contract-function)
  green.

## The catalog — every dimension a decision (plan §8, cross-checked against the Mendeleev catalog)

| Catalog dimension | Applicable? | Where proven / why N/A |
|---|---|---|
| 1. Lifetime & reuse (warm object) | Yes | **VR** — drives ONE virtualized source instance through realize→suspend→recover→realize and asserts the WARM row nodes survive (`kept === stamp.size`) and the controller is `active`. This is the warm-object proof, not fresh-state. |
| 2. Trust boundaries / hostile inputs | N/A | No new input path or validation; the recovery reads existing session fields. |
| 3. Concurrency | Yes (parity) | I17 `finishing`: `begin()` still REJECTS a settling/finalizing session — existing green + OB/PS engage only when `finishing` is false. |
| 4. Shape & platform matrices | Yes | Virtualized (>600) vs small-list shape split: **VR** forces the virtual path; the classic cache-hit path is disclosed (small-list fixtures reuse the page node, cannot see the suspend/realize machine — why VR exists). |
| 5. Failure & rejection paths | Yes | Orphan/interrupted-pane hard reset: **OB**, **OB-home**. |
| 6. Numerical edges & determinism | N/A | No numeric/bit-identity claim. |
| 7. Contract claims ("exactly one design") | Yes | The §3 U11 absolute ("exactly one admissible order") was struck by Loki r2 (HELD STONE), executed on the real modules. No exact-key schema change (contract_shape:false). |
| 8. Composition | Yes | **VR** — the successor's `start()` snapshots the RESTORED, realized source (`#browse` × the Browse-hold/VirtualList suspend-realize lifecycle × the next gesture's `ghostApp`). |
| 9. Persistence round-trip | N/A | Gesture is in-memory, per-process (subsystem §15). |
| 10. Functional achievement (feature oracle) | Yes | **Not bare.** VR/SR/SC/OR each EXECUTE the real `begin()` recovery and assert world end-state (source `active`+realized; `#browse` re-rendered to source; `scrollTo` issued; source restore precedes the successor render). These are feature oracles, not consistency oracles — a wrong-but-deterministic recovery fails them. |

All ten catalog dimensions are accounted for; none silently dropped.

## The sweep — cell by cell (proof, adequacy, new-vs-guard)

### VR — the load-bearing cell (red-first → green). ADEQUATE (STRONG).
`test/swipe-stage6.test.js` "VR — superseding a live drag on a VIRTUALIZED browse->browse source keeps
the source rows ACTIVE and realized …". Drives the REAL `js/browse.js` + `js/virtuallist.js`
(`realBrowse` harness), forced-virtual 700-row source deep-scrolled to `scrollY=40000`, realized rows
stamped by node identity, live browse→browse drag, supersede.

**Discriminator — verified by execution, this is the point the Loki strike put in doubt.** The
assertion pins THREE clauses: `state === 'active'` AND `kept === stamp.size` AND `fresh === 0`. The
Charpy-r4/Loki concern was that a count-only assertion would let ordering mutation (b) pass silently,
because `suspend()` KEEPS all rows. I applied mutation #15 in isolation and ran VR:

```
#15 (session/d nulled BEFORE dropRowHold → dropRowHold no-ops → endHold never fires):
  not ok 3 - VR …
  error: "the superseded virtualized source must be ACTIVE …; got 'suspended' — endHold never realized the kept rows"
  expected: 'active'   actual: 'suspended'
```

The source ends `suspended` — meaning every kept row is still present (`kept === stamp.size` would
PASS) — and only the `state === 'active'` clause reds. The discriminator is real: VR catches (b) on the
state clause, not the count. Mutation (a) (#14, hold released before the recovery render) reds the
`kept`/`fresh` clauses (Loki-measured `kept=0, fresh=13`). Sweep: #14 and #15 both CAUGHT. VR is a
genuine two-mutation ordering oracle. Green-able target (Loki Scenario A): `active / kept=13 / fresh=0`.
New red-first cell; fails against HEAD for the intended missing recovery.

### SR — source re-render (existing `{todo}` known-red → green). ADEQUATE (STRONG).
`test/swipe-invariants.test.js:391` "I11/I20 — superseding a live browse->browse drag re-renders the
SOURCE into #browse". Asserts `renders.at(-1) === 'authors'` (source) after supersession. Passes its
assertion now (`ok … # TODO`). Mutation #16 (recovery forced `render:false`) reds it —
`renders=["books","authors","books"]`, the exact `.218` measurement the plan cites. The cell is swept:
a passing test forces the source-re-render condition and asserts the outcome; a mutation removing the
behaviour reds it. The `{todo}` marker and the `KR-swipe-source-rerender` PolicyLedger entry remain by
design (the §10 coordinated scrub, W25). **Not a bare cell** — the behaviour is proven; the retirement
is records hygiene.

### SC — scroll restore (existing `{todo}` known-red → green). ADEQUATE (STRONG, with a disclosed Note).
`test/swipe-invariants.test.js:339` "I20 — superseding a live drag restores the starting scroll".
Asserts `scrollCalls.length > before` — a restore was issued. Passes now. Mutation #17 (recovery omits
`scrollTo`) reds it. Swept. **Note (disclosed, not a hole):** jsdom pins `window.scrollY` at 0, so SC
proves WHETHER `scrollTo` is issued, never WHICH coordinate. The exact-coordinate (`d.scroll0`)
correctness is owed to on-device verification (W20). This is honestly stated in the suite header and
the Curie report; it is a Note, not a bare cell, because the modelled cell ("issue the scroll restore")
is proven. Same `{todo}`/ledger retirement posture as SR.

### OR — recover-before-arm intermediate state (red-first → green). ADEQUATE.
`test/swipe-stage6.test.js` "OR — the source re-render precedes the successor arming …". Asserts both
`ai >= 0` (source appears) AND `ai < bi` (before the successor's destination render) — an
Engineering-Contract §4.7 both-sides-of-the-boundary assertion. Mutation #16 reds the `ai >= 0` clause
(no source render → source never appears). **Note:** the ordering clause `ai < bi` is not independently
mutation-registered (a "move the recovery after `bindGesture`" specimen); the recover-before-arm
ordering it guards is, however, the exact subject of the Loki strike and is VR-adjacent. The clause is
present and would catch a recovery-after-arm; its independent mutation is optional hardening, not a gap.

### NC — non-clobber overlay source (red-first → green). ADEQUATE, with an honest by-construction note.
`test/swipe-stage6.test.js` "NC — an overlay-source supersession issues NO spurious #browse re-render
but still restores the scroll". The no-render clause is green against HEAD (nothing renders on the hard
reset); the scroll clause is red-first. Mutation #17 reds the scroll clause. The plan §9 also named a
"force `render:true` ignoring `d.clobbered`" mutation for the no-render clause; Brunel **tried and
dropped** it, verified non-functional — `Nav.applyScreen` dispatches on `desc.v` and takes the
options/sub branch (`renderScreen()`, never `Browse.render()`) before consulting the `render` flag, so
the defect is unreachable-by-construction for an overlay source. This is the §4.8/§4.10 discipline done
correctly (do not register a mutation that catches nothing); the no-render clause is proven by
construction, the scroll clause by #17. Documented in `tools/mutate.mjs` and both Poirot casebooks.

### OB-home — orphan home-source scroll parity (red-first for Poirot F1 → green). ADEQUATE (STRONG).
`test/swipe-stage6.test.js` "OB-home — an orphan hard-reset on a HOME source resets the document scroll
to top …". Added after Poirot F1: the recovery's shared `applyScreen` forced `resetScroll:false` onto
the orphan (`d===null`) sub-case, silently dropping the pre-6a scroll-to-top on a home/options source —
a parity regression the browse-source OB cell was blind to. RED against `f09cf9d`, GREEN under Brunel's
fix (`resetScroll: d ? false : undefined`). Mutation #18 reverts the fix and reds OB-home ONLY. The two
cells (OB browse, OB-home home) together pin both window-observable orphan source kinds.

### PS — pre-stack authority (green regression guard). ADEQUATE (non-vacuity confirmed).
`test/swipe-stage6.test.js` "PS — a superseded pre-stack recovery leaves the stack on the source …".
Green against HEAD (the recovery contains no `navStack` write — confirmed by Poirot's read of the
`begin()` block). Pins I11/I18: the recovery must not mutate the stack. **Non-vacuity verified:** the
`start` log it compares encodes `${d.dir} ${d.from.v}→${d.dest.v}` (app.js:464) — a stack-derived
transition; a recovery that popped or pushed the stack would change the next back-swipe's `from.v`, so
`later === first` genuinely discriminates. The fixture-sanity `first && later` gate fails if either
gesture does not engage (§4.9 satisfied). **Note (N1):** no registered mutation specimen; non-vacuity
rests on the stack-derived log + code inspection rather than an executed red. Optional graduation to
STRONG: register a "recovery pushes/pops the stack" mutation (plan §9 names it).

### OB — orphan no-session-scroll (green regression guard). ADEQUATE (non-vacuity confirmed).
`test/swipe-stage6.test.js` "OB — an orphan-pane hard reset (no live session) …". Asserts the orphan
branch does not throw and issues no `scrollTo` on a browse source. **Non-vacuity:** the fixture-sanity
`hardResets > hrBefore` proves the orphan branch genuinely tripped; and OB-home's mutation #18
independently proves the orphan `applyScreen` is exercised and discriminates. **Note (N1, shared with
PS):** OB itself has no registered mutation; its engagement is gated by fixture-sanity and its sibling
OB-home is mutation-proven. Adequate as a guard.

### PD — pane disposed once (existing green guard). ADEQUATE.
`test/swipe-invariants.test.js` I2/I20 pane-disposal. Mutation #13 (re-anchored to the new `applyScreen`
line) reds it (`ghosts>0`). Existing green; referenced by the Stage-6 file, not duplicated (one owner
per cell).

### ST — stale events harmless (existing green guard). ADEQUATE.
`test/swipe-invariants.test.js:419` I20 stale move/end/cancel. Existing green parity guard with its own
transform assertion; referenced, not duplicated.

### KEEPER — device-only (honest `{skip}`). CORRECTLY DISPOSED.
`test/swipe-stage6.test.js` "KEEPER — a browser scroll between endHold and the successor's first move …".
This is Loki r2's named RESIDUAL suspicion `NB-post-endHold-scroll-realize`: after `endHold` un-suspends
the shared VirtualList scroll dispatcher and before the successor's `start()` (which fires on its first
`touchmove`, not at `begin()`), a browser-originated scroll could `_realize()` the active source at a
transient offset and release the kept rows. **jsdom emits no browser-originated scroll**, so there is no
honest jsdom body. Authored as `{skip}` with a reason naming the device harness required — **not faked
as a jsdom repro, and its unexecutability is disclosed, not hidden.** This is the correct disposition:
an unreproducible cell recorded as a device guard (W20 SHIPPED-UNVERIFIED), not silently dropped and not
falsely marked green. Verified in execution: it reports `# SKIP Device-only …` with the full reason.

## New-vs-guard distinction (plan §9 / Curie §4)

- **New red-first (fail against HEAD for the intended missing recovery):** VR, OR, NC, OB-home. Each
  fails on its intended assertion (`ERR_ASSERTION`), not a compile/harness error, and greens under the
  built recovery.
- **Existing long-lived known-reds this stage CLOSES (`{todo}` + PolicyLedger, red-first spanning
  builds):** SR (`KR-swipe-source-rerender`), SC (`KR-swipe-scroll-restore`). Behaviour now implemented;
  markers + ledger entries retained pending §10.
- **Green regression guards (green before and after; pin an invariant the recovery must not break):**
  PS, OB (new); PD, ST (existing).
- **Device-only guard:** KEEPER (`{skip}`).

## Findings (by severity)

| # | Severity | Finding | Owner |
|---|---|---|---|
| N1 | Note | PS and OB (green regression guards) have no registered mutation specimen in the `14-18` set. Non-vacuity is established (PS by the stack-derived `start` log + fixture-sanity; OB by fixture-sanity + OB-home's #18), so neither passes silently — but neither has an executed red. Optional hardening: register the plan §9 "recovery pushes/pops the stack" mutation for PS and a "reads `d.*` unconditionally on the orphan" mutation for OB, graduating both to STRONG. Not blocking; the invariants they guard are independently proven (code inspection + OB-home). | Curie (optional) |
| N2 | Note | OR's ordering clause (`ai < bi`) is covered by #16 only on its source-appears half; the recover-after-arm reorder is not independently mutation-registered (the load-bearing ordering is Loki-struck + VR-adjacent). Optional specimen. | Curie (optional) |
| N3 | Note (records) | SR/SC `{todo}` markers and the two `PolicyLedger.mjs` known-red entries remain though the behaviour is green (the sanctioned §10 coordinated scrub, W25). Coverage is adequate; the retirement + deletion of the now-undefended policy-ledger mutation anchor (plan §10) is owed at the scrub commit. | Zelda / scrub commit |
| N4 | Note (out of THIS audit's scope) | Poirot's watch-list carries **W22** — Stage-**5** coverage gaps O3/O4 (F5a payload-passthrough; F1a "L3 forgets a key") "still owed to the coverage auditor." These are Stage-5 items, not Stage-6a; flagged here so they are not lost, but they belong to a Stage-5 coverage audit, not this one. | Mendeleev (separate Stage-5 audit) |

No **Structural** (whole dimension unswept), **Gap** (bare cell), or **Misleading** (test asserting less
than it appears) finding. No implementation gap. No Coverage-Model gap (Curie found the plan §8 model
complete; this audit concurs — all ten catalog dimensions are decided).

## The forward read (Phase 6)

With the bare-cell count at zero, the forward read is short. If the next externally-found bug lands, it
lands where jsdom cannot reach and the suite is honest about not reaching: the **device-only KEEPER** —
a real browser scroll fired between `endHold` and the successor's first `move()` releasing the
virtualized source's kept rows (`NB-post-endHold-scroll-realize`, W20). That is the one live suspicion
the sweep could not give a body, and it is correctly quarantined as SHIPPED-UNVERIFIED rather than
blessed. The optional N1/N2 mutations would harden the green guards but do not change where the next bug
lives. Nothing in the Stage-6a model reads forward to a bare cell.

## Disposition

- **Verdict:** COVERED — ADEQUATE. The stage may complete after the §10 records scrub (N3).
- **VR discriminator:** confirmed by execution to red on BOTH orderings — mutation (a) on `kept`/`fresh`,
  mutation (b) on `state === 'active'` (the count clause passes for (b); the state clause catches it).
- **KEEPER:** honestly `{skip}`, device-only, disclosed — not faked, not hidden.
- **SR/SC:** adequate now (mutations #16/#17 red; assertions pass); `{todo}`+ledger retirement is the
  owed §10 scrub, not a coverage hole.
- **Routing:** none blocking. N1/N2 → Curie (optional hardening). N3 → the §10 scrub commit (Zelda).
  N4 (Stage-5 W22) → a separate Stage-5 coverage audit.

```json
{"persona":"mendeleev","stage":6,"input_artifact":"b4714ce","verdict":"ADEQUATE","bare_cells":[],"return_to":"none"}
```
