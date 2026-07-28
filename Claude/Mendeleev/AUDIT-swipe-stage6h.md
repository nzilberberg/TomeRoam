# MENDELEEV — Stage 6h coverage audit (commit→home scroll-settle cover-gate)

Type: coverage-audit (publish gate — the now-green suite swept against the plan's Coverage Model)
Target: immutable commit `11fc190` ("Stage 6h BUILD_GREEN: commit→home scroll-settle cover-gate").
Plan of record: `Claude/Plans/PLAN-swipe-stage6h.md` (PLAN_READY, Charpy TEMPER + Loki HELD_STONE), §7 Coverage Model + §8 the seven-cell matrix.
Suite audited: `test/swipe-stage6h.test.js` (7 cells) + the `h.setScrollY` affordance in `test/app-harness.js`.
Mutation registry: `tools/mutate.mjs` #79–85; anchor gate `test/mutation-anchors.test.js`.
Inputs read: Curie `RED-swipe-stage6h.md` (findings 1–3), Brunel `swipe-stage6h-build.md` (mutants 79-85), Poirot `POIROT-swipe-stage6h-11fc190.md` (SHIP), the saga memory (the flash is device-only — no cell asserts it, and that is correct).
Date: 2026-07-28.

`Verdict: **ADEQUATE**` — every applicable cell of the Coverage Model is non-vacuously swept on a real, main-thread-observable channel (the `drop()` event read off the FLASH `via=`/`settle=` log, the fake-timer pending ledger, the rAF handle ledger, and a `removeEventListener` spy), each pinned by a registered mutation that is CAUGHT (sweep exit 0), the two superset mutations still uniquely pin their named cell's own assertion, the device-only FLASH is honestly excluded from CI, and the `h.setScrollY` affordance is genuinely load-bearing.

---

## Executed evidence (this pass, independent of Curie/Brunel/Poirot)

- `node tools/mutation-sweep.mjs 79 80 81 82 83 84 85` → all 7 `caught`; `swept 7: 0 uncaught, 0 unapplied, 0 stale flags`; **exit 0**.
- Isolation of the two SUPERSET mutants against `test/swipe-stage6h.test.js` alone:
  - **#79 (GATE — omit engagement)** → red = {GATE, BACKSTOP, ONCE, OWN}; GATE's own message fires: *"the commit→home cover must NOT drop on decode+double-rAF alone — it must wait for a scroll-settle signal."* GATE's load-bearing assertion is the one reddened.
  - **#80 (BACKSTOP — omit the SETTLE_MS timer)** → red = {BACKSTOP, ONCE}; **GATE stays GREEN**; BACKSTOP's own message fires: *"with no scrollend, the SETTLE_MS backstop (not the 600ms net) releases the cover (via=settle)."* BACKSTOP's specific behavior is isolated.
- Restore verified: `git status --short js/app.js tools/mutate.mjs` clean; no `*.mutbak` anywhere.
- Read the built gate (`js/app.js:806-916`), the two call sites (1218 commit→home conditional; 1235 abort→browse no-arg), `cur.scroll0` capture (466), the registry (`tools/mutate.mjs:554-580`), and the affordance (`test/app-harness.js:268-278, 776-781`).

## The superset concern (Curie finding 2 + Poirot) — adjudicated ADEQUATE

A mutation that reddens a superset is acceptable ONLY if it still uniquely pins its named cell's own assertion. Both do:

- **GATE (#79).** The mutation is the "no gate at all" state, so it necessarily breaks every engaged-gate cell (GATE/BACKSTOP/ONCE/OWN). But GATE's own assertion — *cover PRESENT after decode+double-rAF, and removed only after a `scrollend`* — is among the reddened, and GATE alone owns the "cover persists past the bare double-rAF" claim. GATE is green at HEAD (feature present) and red under #79 (gate bypassed): it genuinely fails iff the gate is bypassed and passes iff it works. Not bare.
- **BACKSTOP (#80).** Reddens {BACKSTOP, ONCE} only — GATE, STRAND, SCOPE, OWN, FASTPATH all stay green — so the SETTLE_MS-releaser behavior (`via=settle` at `SETTLE_MS`, before the 600ms net) is uniquely pinned to BACKSTOP and its co-dependent ONCE. Not bare.

The two overlaps are structural (a shared engaged-gate for #79; a shared SETTLE_MS timer for #80, which ONCE captures by design), declared by Curie finding 2, and do not dilute either named cell's own assertion.

## The affordance is load-bearing (not scaffolding)

`h.setScrollY(n)` (default 0, so every existing suite is byte-unaffected — RED doc confirms swipe-invariants 23/23, swipe-stage6b 4/4 stay green). jsdom pins `window.scrollY` at 0, so without it `cur.scroll0` is always 0, `cur.scroll0 > SETTLE_SCROLL_MIN` is always false, and every gate-engaged cell would silently fall to the fast path and pass VACUOUSLY. Proof it is load-bearing: #79 sets `scrollSettle:false` (behaviorally identical to "affordance absent / scroll0=0"), and under it GATE RED-fails — i.e., GATE only tests the engaged path because the affordance drives `cur.scroll0` above the threshold. The five engaged cells set 12000; FASTPATH sets 0. Genuinely observable, genuinely required.

## Coverage matrix — the seven cells (all swept)

| Cell | Promised behavior | Observable channel (non-vacuous) | Registered mutant | Caught? | Isolation |
|---|---|---|---|---|---|
| GATE | cover persists past decode+double-rAF; drops only on `scrollend` (`via=scrollend`); BOTH sides asserted (EC §4.7) | FLASH `via=` log; drops==0 before signal, ==1 `via=scrollend` after synthetic `scrollend` | #79 (omit engagement) | ✓ | superset {GATE,BACKSTOP,ONCE,OWN}; GATE's own assertion pinned |
| BACKSTOP | no `scrollend` → bounded `SETTLE_MS` timer releases the cover `via=settle`, before the 600ms net | `advance(600)`; one drop, `via=settle` | #80 (omit SETTLE_MS timer) | ✓ | superset {BACKSTOP,ONCE}; GATE green — BACKSTOP pinned |
| STRAND | never-paints → the 600ms DIRECT `drop('timeout')` is the SOLE remover (worse-than-flash guard) | painted=false (no rAF frame); `advance(600)`; one drop `via=timeout` | #81 (route net through `gate()`) | ✓ | single-cell (STRAND only) |
| ONCE | exactly-once under the {`scrollend`, SETTLE_MS, 600ms} race; loser SETTLE_MS timer retired AT drop | pending-timer ledger: `settleId` gone from `pendingDump()`; `flashDrops`==1 after advance | #82 (omit settle-timer cancel) | ✓ | single-cell (ONCE only) |
| SCOPE | abort→browse byte-unchanged: no `scrollend` listener, no SETTLE_MS timer, drops `via=paint` | `settleTimersOf`==0; drops `via=paint` | #83 (add `{scrollSettle:true}` at 1235) | ✓ | single-cell (SCOPE only) |
| OWN | `drop()` calls `removeEventListener('scrollend', …)` so listeners cannot accumulate | spy on `window.removeEventListener`; exactly one `scrollend` removal | #84 (omit listener removal) | ✓ | single-cell (OWN only) |
| FASTPATH | scroll0≤threshold → no listener/timer; drops `via=paint` (common back-to-Home keeps ~40ms path) | `settleTimersOf`==0 at scroll0=0; drops `via=paint` | #85 (force flag unconditionally) | ✓ | single-cell (FASTPATH only) |

All four `via=` values (`scrollend`, `settle`, `timeout`, `paint`) are pinned across the suite. The three parity cells (STRAND/SCOPE/FASTPATH — GREEN at HEAD) are non-vacuous: their fail-ability is mutation-proven (#81/#83/#85), and under #79 they correctly stay GREEN (not coupled to the engaged gate).

## Catalog sweep — every dimension gets a status (absence is a decision)

| Catalog dimension | Status | Where |
|---|---|---|
| Lifetime / lifecycle / phases | Swept | two `cur`-owned handles created on the engaged path, held across the wait, retired at the single `drop()` — GATE, OWN, ONCE |
| Trust boundaries / hostile inputs | N/A | no new input surface; `opts` is an internal options object, not a parsed contract |
| Concurrency | Swept | five async producers over one `dropped`-guarded consumer — ONCE; deeper interleaving is Loki's gate (see N3) |
| Shape / platform matrices | N/A | no data-shape axis; the iOS-vs-jsdom axis is the device-only flash (excluded, correctly) |
| Failure / rejection paths | Swept | never-paints → STRAND (`via=timeout`); no-`scrollend` → BACKSTOP (`via=settle`); no rejection path is added |
| Numerical edges / determinism | N/A | no numeric/bit-identity claim |
| Contract claims ("never strand", "exactly once", "byte-unchanged") | Swept | STRAND (never strand), ONCE (exactly-once + retirement), SCOPE (abort→browse byte-unchanged) |
| Composition | Swept | `settled` composes with decode gate + double-rAF + SETTLE_MS + 600ms net + abort→browse default-true — GATE/BACKSTOP/STRAND/ONCE/SCOPE |
| Persistence round-trip / version evolution | N/A | nothing persisted |
| Functional achievement (feature oracle) | **Device-only, honestly excluded** | the commit books→home flash going CLEAN is an iOS compositor scroll-collapse snap, off the main thread, invisible to jsdom/rAF (saga's withdrawn frame-detector). NO cell asserts it — verified device-only via the user's scroll-down repro + the `via=`/`settle=` log (plan §3/§9). The CI oracle is the DROP (a main-thread code event), not a flash proxy. This is the CORRECT classification, not a bare feature-oracle cell. |
| Conditional engagement | Swept | scroll0>threshold engages (GATE et al.); scroll0=0 fast path (FASTPATH) |
| Ownership / owner endpoint / stale continuation | Swept (single-fault) / routed (interleaving) | endpoint is `drop()`; retirement pinned by OWN/#84 and ONCE/#82; the SUPERSESSION interleaving is Loki's — N3 |

## Findings — no Structural, no Gap, no Misleading. Three Notes.

- **N1 (over-determination, honestly declared — not a gap).** ONCE's *exactly-once count* assertion (`flashDrops==1`) has no dedicated single-site mutant, because exactly-once is over-determined: the `dropped` guard AND the per-producer loser-cancels each independently prevent a second drop, so no single fault can produce a double-drop (Curie finding 3). ONCE's load-bearing, catchable half — *the loser SETTLE_MS timer is retired AT the drop* — IS uniquely pinned by #82. The count assertion remains non-vacuous (it would fail if a double-drop ever occurred) but is un-reddenable by construction. This is the same class as open watch-item **W12** (6e `sweeps===0` guard with no single-site mutant). No test owed — a mutant that requires a double fault is not buildable, and demanding one would be theatre.
- **N2 (loose-heuristic boundary — N/A with reason).** The conditional's threshold DIRECTION at the exact point `cur.scroll0 == SETTLE_SCROLL_MIN` (`>` vs `>=`) has no boundary test and no mutant. Immaterial: `SETTLE_SCROLL_MIN = 0.5·innerHeight` is an explicitly loose, device-tuned heuristic (plan §4, "bias toward engaging"), whose only HARD invariants — top/near-zero → fast path, large clamp → engage — ARE pinned (FASTPATH/#85 and GATE/#79). An off-by-one at the exact half-screen point changes nothing the plan promises. Relatedly, Poirot's **W20** (threshold captured once at closure-definition time; a mid-session rotation leaves it slightly stale) is already carried as a device-tuning item, not a finding.
- **N3 (supersession routed to Loki — correct division, not a suite gap).** Supersession of a *settle-gated* reveal (a new gesture arriving before a pending commit→home reveal drops; the transient bounded double-listener) is NOT a Mendeleev CI cell — it is the interleaving promise assigned to Loki (plan §3/§6/§11). The two new handles inherit the EXISTING 6b stale-continuation discipline (retired only in `drop()`, `sessionDone(cur)` no-ops on a superseded owner), and Loki struck the plan-level promise HELD_STONE at 1022 interleavings; Poirot confirmed all three structural preconditions intact so the stone transfers. A FRESH Loki strike against the BUILT code remains the plan's next required gate (**W21**). The suite's adequacy for the mechanism is complete; adequacy for the interleaving promise rests on that pending strike — honestly staged, not owed to this audit.

## Forward read (Phase 6)

With the bare-cell count at zero, the next externally-found problem does NOT live in the CI-provable surface (mechanism + never-strand + bounded-listener are pinned). It lives where CI is structurally blind and the plan says so: the DEVICE compositor. Two named device-only risks survive to the on-device pass (plan §3, W19): **Risk 1** — `scrollend` may not fire on an instant programmatic `scrollTo(0,1)`, degrading the gate silently to the `SETTLE_MS` heuristic (readable as `via=settle` dominating in the log); **Risk 2** — `scrollend` may fire BEFORE the compositor re-tile finishes, so the flash survives a clean `via=scrollend`. Neither is a suite hole; both are the honestly-labelled device unknowns the `via=`/`settle=` stamp was built to resolve. The one process dependency that is a real open loop is **W21** (fresh Loki strike on built code) — the interleaving promise is not closed until it lands.

## Cell accounting

Every one of the seven Phase-2 cells appears above with a status (all swept). Every catalog dimension appears with a status (swept / N-A-with-reason / device-only-excluded / routed-to-Loki). No cell silently dropped. The FLASH is excluded from CI by design and stated as such in the suite header, the RED doc, the plan, and Poirot — no overclaim of "flash fixed."

---

Verdict: **ADEQUATE**

{"persona":"mendeleev","stage":"6h","verdict":"ADEQUATE","target":"11fc190","artifact":"Claude/Mendeleev/AUDIT-swipe-stage6h.md","bare_cells":[],"return_to":"zelda"}
