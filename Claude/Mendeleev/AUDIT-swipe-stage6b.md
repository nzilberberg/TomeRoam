# Coverage audit — Swipe/reveal Stage 6b (loser-continuation cancel)

Type: coverage-audit (Mendeleev), publish gate
Date: 2026-07-26
Input artifact: commit `8e968fb` (the reviewed build; HEAD `afcbb7f` is the Poirot record on top —
`git diff 8e968fb afcbb7f -- js/app.js test/` is empty, so the audited code and suite are identical
to the audit target).
Coverage Model audited: `Claude/Plans/PLAN-swipe-stage6b.md` §8 (catalog) + §9 (coverage/mutation matrix).
Suite audited: `test/swipe-stage6b-loser-cancel.test.js` (new cells), `test/swipe-invariants.test.js`
(regression guards), `test/app-harness.js` (the observable channel).
Verdict: **ADEQUATE** — every applicable cell is swept by a concrete, non-vacuous test; the load-bearing
RR(b) discriminator and each cell's non-vacuity were reproduced by independent mutation this pass; the
deferred set is honestly consumer-deferred, not a bare cell this slice owes.

## 1. Ground — what the slice claims (Phase 1)

The slice takes three async continuations that are bare locals today and makes each a session-owned
handle cancelled at exactly one resolver: `cur.settleTimer` (340ms finalize fallback, cleared by
`finalize` when `transitionend` wins); `cur.revealFrames` (the reveal double-`rAF`, a two-entry handle
whose outer callback re-stores the inner id so the field always names the currently-pending frame,
cancelled by the winning `drop`); `cur.revealTimer` (600ms reveal safety-net, cleared by the winning
`drop`). The observable channel is the fake scheduler's queues — a cancelled loser leaves the queue; an
omitted or misattributed cancel leaves it pending. Behaviour is parity at the user layer; the value is at
the resource plane (Engineering Contract §4.3/§4.14, invariant I14).

## 2. Baseline (Phase 3 preamble)

- New cell suite at the audit target: `node --test test/swipe-stage6b-loser-cancel.test.js` → **4/4 pass**.
- Regression guards: `node --test test/swipe-invariants.test.js` → **23/23 pass** (includes
  RGcancel/RG13/RGH/RGT/RGend).
- The suite genuinely forces its conditions — verified by independent mutation, §4 below (a green suite
  count claims execution, not coverage; the sweep is what claims coverage).

## 3. The matrix — every catalog dimension resolved (Phase 2)

The plan's §8 catalog is the swipe subsystem's local catalog; each row is cross-checked against
Mendeleev's master catalog (the ten dimensions) so no master dimension is silently dropped.

| Master dimension | This slice | Cell(s) / disposition |
|---|---|---|
| 1. Lifetime & reuse (warm/cross-call) | Applicable, covered-by-construction | Each `cur` is per-gesture; a superseded session is pre-`settle()` and owns none of these handles; each resolver closes over its own `cur`. Cross-session misattribution is blocked by construction and was executed (Loki S5/S6, HELD). Existing distinct-id guards (`swipe-invariants` stage-3 :465/:488) + RGend pin it. Not a bare cell. |
| 2. Trust boundaries / hostile inputs | N/A | No external input; scheduler tokens only. |
| 3. Concurrency | Applicable (parity) | `begin()` rejects while `finishing`, so no second session arms while these handles are live (Loki S6 executed re-entry-during-hold, HELD). Single-writer; cancel runs inside the single-threaded resolver with the guard already set. |
| 4. Shape / interleaving & platform matrix | Applicable — in-harness covered; one real-browser axis at the tool ceiling | The reveal interleaving matrix (outer-pending / half-fired / gate-won / timeout) is spanned by RR(a)/RR(b)/RR(c). The un-covered axis is real iOS WebKit at a hidden-tab transition landing exactly between the outer and inner reveal frames — un-executable in-harness (tool ceiling), resource-plane only, `dropped`-guarded (no user-visible effect). Named as a could-not-determine cell (Loki r2 §6 / Poirot W2), NOT a Curie-fillable hole. |
| 5. Failure / rejection paths | Applicable, swept | RGT — a throw in `finalize` restores `finishing` (the new `clearTimeout(cur.settleTimer)` runs inside the single `finalize` body; RGT proves it does not swallow the throw path). |
| 6. Numerical edges / determinism | N/A | No numeric surface. |
| 7. Absolute contract claims | Applicable, swept | The code's absolute claim "`cur.revealFrames` always names the currently-pending frame" (`js/app.js:754`,`:804`) maps to RR(b): the half-fired state is exactly where a single-id design makes the claim false. Independently reddened under the single-id mutation (§4). Distinct from the §8 row "Contract claims (exact schema)" = N/A, which is `contract_shape:false` (no exact-key schema) — correct N/A; the absolute-claim axis is NOT dismissed, it is covered by RR(b). |
| 8. Composition | Applicable, swept | RGH (loser-cancel composes with the held-reveal ownership boundary — owner survives finalize, ends at drop), RG13 (composes with the `done` exactly-once guard), RGT (composes with the throw/finally). The double-`rAF` composition is RR(b). |
| 9. Persistence round-trip | N/A | In-memory, per-process (subsystem §15). |
| 10. Functional achievement (feature oracle) | Applicable, swept | DF/RR(a/b/c) each DRIVE the real `finalize()`/`drop()` and assert the end-state (the captured loser id is absent from the queue, winner continuations present). This is a feature oracle — it asserts the world reaches the intended state, not that the system does the same thing twice. Not a consistency oracle. |

Subsystem-catalog rows with no distinct master mapping: Identities (N/A — no id created/reinterpreted);
Recovery authority boundary (N/A — slice does not enter `begin()`/recovery); Emergency disposal (N/A —
no pane-disposal path changes); Known-red (N/A — none introduced; `policy-ledger-gate` green); Ordering
(covered — cancel-the-correct-loser, the misattribution axis, see §4); Async ops / Stale completions /
Resources / External side effects / Invariants / Observability (covered by DF/RR as tabulated in §9 of
the plan, and by §4 below).

## 4. The sweep — each cell swept and proven non-vacuous (Phase 3)

New-vs-guard distinction is explicit: DF and RR(a/b/c) are **NEW red-first cells** (authored red, greened
by the build); RGcancel/RG13/RGH/RGT/RGend are **EXISTING shipped-parity guards** named in plan §9, not
re-authored this campaign.

Independent non-vacuity was established by an in-process `fs.readFileSync` mutation of the committed
`js/app.js`, running the committed test file in the patched process (production never written; probe
disposable). Results:

| Mutation applied to `js/app.js` | DF | RR(a) | RR(b) | RR(c) | Reads |
|---|---|---|---|---|---|
| none (audit target) | pass | pass | pass | pass | green baseline in-process |
| omit `clearTimeout(cur.settleTimer)` | **FAIL** | pass | pass | pass | DF non-vacuous on omission; orthogonal to RR |
| omit both `drop` cancels | pass | **FAIL** | **FAIL** | **FAIL** | each RR cell non-vacuous on omission; orthogonal to DF |
| single-outer-id reveal frame (the Loki-killed design) | pass | pass | **FAIL** | pass | RR(b) is the UNIQUE discriminator |
| `finalize` clears the wrong handle (`revealTimer` not `settleTimer`) | **FAIL** | pass | pass | pass | DF non-vacuous on misattribution, not only omission |

### DF — `DF — finalize clears the 340ms settle fallback when transitionend wins`
- **Proof:** drives an abort browse→browse to SETTLING, captures the 340ms id (`ms===340`), fires
  `transitionend` so `finalize` runs while the fallback is pending, then asserts the captured id is gone
  AND the queue is still non-empty (the 600ms safety-net shares it). Feature oracle on the release.
- **Adequacy: ADEQUATE.** Reddens on both omission (DF_OMIT) and misattribution (DF_WRONG) at
  `js/app.js:1168`; fixture-sanity asserts the pending state before the resolver, so the red isolates to
  the cancel. The delta guard (`some(t=>t.ms===600)`) forbids the emptiness oracle Loki warned against.

### RR(a) — `RR(a) — timeout wins, no frame fired: drop() cancels the pending reveal frame`
- **Proof:** reaches the held commit→home reveal, captures the sole queued outer frame id, advances 600ms
  so `drop('timeout')` wins, asserts the outer id gone with the rAF queue non-empty (watchFrames present).
- **Adequacy: ADEQUATE.** Reddens under RR_OMIT; stays green under single-id (correct — the outer IS the
  pending frame here, so a single-id design cancels the right one). Non-vacuous, and correctly NOT the
  discriminator.

### RR(b) — `RR(b) — HALF-FIRED (outer spent, inner pending), timeout wins: drop() cancels the INNER frame` (LOAD-BEARING)
- **Proof:** fires EXACTLY ONE frame so the outer runs and schedules the inner (fixture asserts
  `mid.length===1` and `innerId!==outerId` — structurally pinning "outer spent, inner pending", not by
  comment), then advances 600ms so `drop('timeout')` wins while the inner is pending, and asserts the
  inner id is gone.
- **Adequacy: ADEQUATE, and it is the discriminator.** Under the single-outer-id design (the construction
  Loki KILLed in round 1) RR(b) is the ONLY cell that reddens — independently reproduced this pass, and
  matching Brunel §10 and Poirot's probe. It also reddens under plain omission. The exactly-one-frame
  structural guard is what prevents collapse into RR(c) (where the killed design would not redden); the
  harness's documented double-`rAF` semantics (a frame queued by a frame waits for the next
  `h.raf.frame()`) make the half-fired state genuinely expressible. This cell proves the absolute claim
  "`cur.revealFrames` always names the currently-pending frame" (master dimension 7).

### RR(c) — `RR(c) — the paint gate wins: drop() clears the pending 600ms reveal safety-net`
- **Proof:** fires both reveal frames (decode resolves on the microtask queue during the first) so
  `gate('paint')` → `drop('paint')` runs with no clock advance, captures the 600ms id (`ms===600`), and
  asserts it gone with the clock queue non-empty (500ms diagnostic + 60ms pane-fade present).
- **Adequacy: ADEQUATE.** Reddens under RR_OMIT; correctly stays green under single-id (both frames fired,
  so the frame-id axis is moot and the loser is the timer). Non-vacuous; the delta guard is real.

### Regression guards (existing, pinned)
- **RGcancel** (`swipe-invariants.test.js` "1a — a cancelled settle rAF cannot re-shift #browse"):
  parity pin that the slice preserves the shipped `.226` `cancelAnimationFrame(cur.settleFrame)`. Green;
  the new `clearTimeout(cur.settleTimer)` is added ADJACENT, `settleFrame` untouched (verified by grep —
  each field only at its own sites). ADEQUATE parity pin.
- **RG13** ("I13/I19 SETTLING — a duplicate end mid-settle is ignored"): pins the `done` exactly-once
  guard the loser-cancel runs inside. Green. ADEQUATE.
- **RGH** ("endpoint — a HELD reveal keeps the owner THROUGH finalize, releasing it only at drop"): the
  strongest composition guard — reworked (.223 finding 4) to assert the INTERMEDIATE ownership state
  (owner survives finalize, gone after drop), which is exactly the boundary the drop-phase cancels touch
  (Engineering Contract §4.7). Green. ADEQUATE.
- **RGT** ("2 — a throw in finalize restores finishing"): pins that the in-`finalize` clear does not
  swallow the throw/finally path. Green. ADEQUATE.
- **RGend** ("endpoint — after the terminal resolver the session is null"): endpoint parity — the
  loser-cancel does not move the ownership endpoint. Green. ADEQUATE.

## 5. The delta/id oracle (Loki HELD-STONE constraint)

Every new cell captures the SPECIFIC loser id at its scheduling site and asserts that id absent AND the
queue still non-empty — never queue emptiness. This is correct and load-bearing: after each resolver the
WINNER's own continuations occupy the same queues (`watchFrames` rAF chain, the 500ms reveal diagnostic,
the 60ms pane-fade), so `pending()===0` would be a false oracle that passes a build cancelling nothing.
The ids are monotonic (`rafSeq`/`nextTid` increment, never reused), so a captured loser id can never
collide with a later winner continuation — `!includes(id)` is sound. The RR_OMIT / DF_OMIT results (the
loser stays and the cell reddens) confirm the delta oracle discriminates the leak, not merely emptiness.

## 6. Deferral honesty (Phase 4 — the empty cells that are decisions, not holes)

The deferred set (§11: NULL-on-retire writes; `transitionListener` session-ownership + removal;
per-handle-liveness observability surface) is **honestly consumer-deferred to the I12 stage, NOT a bare
cell this slice owes.** Verified this pass:

- `window.PBSwipeSession` (`js/app.js:245`) exposes only `{ id, dragging }` and returns `null`
  post-completion — no handle-liveness field.
- The harness's `cancelRaf` (`app-harness.js:241`) and `fakeClearTimeout` (`:356`) splice from the queues
  but write NOTHING to `log`.

So the ONLY observable channel is the queue, which observes the RELEASE (the cancel), never a null-write.
A test asserting "the stored handle is null after retire" has no surface to read and would be vacuous;
and the null-write's only production consumer is the deferred I12 retirement-check. Writing it now would
be a dead write with no reddening test (Engineering Contract §4.15). Deferring is therefore the correct
call, and it is a DECISION with a named consumer and stage — not a silent drop (Mendeleev "absence must
be a decision"). The plan confirms the null is implementable on the two-entry model precisely because
`cur.revealFrames` always names the one pending frame (the property RR(b) proves), so nothing here
forecloses the I12 stage.

## 7. Verdict, summary, findings (Phase 5)

**ADEQUATE.** Every applicable cell of the fixed matrix is swept by a concrete test that genuinely forces
its condition and asserts the intended end-state; the load-bearing RR(b) discriminator and each cell's
non-vacuity were independently reproduced by mutation this pass; the RG guards pin the parity the slice
could break; the deferred set is honestly consumer-deferred with no observable surface to test now.

Matrix summary: master dimensions total 10 — swept 6 (1,4[in-harness],5,7,8,10), covered-by-construction
1 (dimension 1, with Loki-executed backing), N/A-with-reason 4 (2,6,9 + concurrency parity under 3);
one could-not-determine cell (dimension 4 real-browser axis, tool ceiling). New cells 4 (DF, RR a/b/c),
all swept and non-vacuous. Regression guards 5, all green and adequate.

| # | Severity | Finding | Owner |
|---|---|---|---|
| — | (none) | No bare cell, no misdirected cell, no vacuous cell. The suite spans the slice's contract. | — |
| N1 | Note | Dimension-4 real-browser axis (iOS WebKit hidden-tab transition landing exactly between the outer and inner reveal frames) is un-executed — a tool-ceiling cell, not a Curie-fillable in-harness hole. Resource-plane only, `dropped`-guarded (no user-visible effect). Already carried as Loki r2 §6 / Poirot W2. Close by an on-device strike or when the I10 reveal-centralization revisits it. | Loki/on-device (future) |
| N2 | Note (records, not coverage) | Plan §10 records reconciliation is un-applied in HEAD (subsystem §8 still calls the timers bare locals). Already Poirot O1 / W1, owner Zelda; outside coverage jurisdiction, surfaced only so it is not lost. | Zelda |

## 8. Forward read (Phase 6)

If the bare-cell set stayed bare, the next externally-found defect would land on the un-swept
dimension-4 real-browser axis: an iOS WebKit device backgrounded in the ~one-frame window between the
outer and inner reveal frames, where the harness's synchronous single-threaded frame model cannot prove
the inner-id re-store is atomic against a real compositor's frame scheduling. The in-harness cells prove
the LOGIC of the two-entry handle exhaustively; only the real-device timing of the re-store is unproven,
and the blast radius there is a `dropped`-guarded leaked frame — a resource-plane residue, not a
user-visible flash. No other dimension reads forward to a live hole: the release logic, the
misattribution axis, the exactly-once composition, and the endpoint parity are each swept by a
non-vacuous test.

---

{"persona":"mendeleev","stage":"6b","input_artifact":"8e968fb","verdict":"ADEQUATE","bare_cells":[],"return_to":"none"}
