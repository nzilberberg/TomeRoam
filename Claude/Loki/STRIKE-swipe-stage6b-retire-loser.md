# STRIKE — Stage-6b "retire the correct loser" promise — 2026-07-26

Commission: pre-build strike on the ratified Stage-6b plan (`Claude/Plans/PLAN-swipe-stage6b.md` at
commit f83c4a5), against HEAD `js/app.js` and the real fake-scheduler harness `test/app-harness.js`.
Blind until filed: no casebook, no prior strike, no decision-log rationale was read before this record.
The plan is unbuilt; the strike executes the plan's construction applied verbatim, as specified, to an
in-memory copy of `js/app.js` (production untouched).

## 1. The promise (verbatim, and as testable behavior)

Plan §3 item 2: "The winning `drop(why)` cancels its losers: `cancelAnimationFrame(cur.revealFrames)`
and `clearTimeout(cur.revealTimer)`. Because `drop` runs exactly once (the `dropped` guard, unchanged),
the two losing gates of the decode-vs-paint-vs-600ms race leave the scheduler queue rather than firing
`dropped`-guarded no-ops."

Plan §3 item 3: "Each resolver closes over its own `cur`, so it cancels exactly the phase's loser and
never a wrong handle."

Plan §2 (`cur.revealFrames` bullet): "when the decode gate or the 600ms safety-net won, this cancels
the still-pending paint frame."

Testable behavior, on the plan's own declared channel (§9: `h.raf.pending()` = `rafQ.length`,
`h.clock.pending()` = `tq.length`): after the winning `drop()` returns, no reveal continuation of the
retired session remains pending on the scheduler queues — across BOTH the gate-driven and the
timeout-driven drop interleavings.

## 2. The plane chosen, and why

The reveal paint gate is a DOUBLE rAF on one source line (`js/app.js:794`):
`requestAnimationFrame(() => requestAnimationFrame(() => { painted = true; gate('paint'); }))`.
Two scheduler entries, two distinct handle ids — the inner id exists only after the outer callback runs,
and the outer callback discards it.

The plan stores ONE handle. §2: "the reveal outer `requestAnimationFrame` (794) is stored on the
session" as `cur.revealFrames`, and `drop()` issues one `cancelAnimationFrame(cur.revealFrames)`. No
sentence in the plan re-stores the inner id or cancels it.

So the promise's strongest words ("cancels exactly the phase's loser", "leave the scheduler queue")
cross the artifact's weakest seam at one interleaving: **the outer frame has fired (scheduling the
inner), the inner paint frame is pending, and the 600ms safety-net wins the drop.** The stored handle
is then a spent id; the still-pending paint frame is a different id stored nowhere.

The interleaving is real, and the code names its own trigger: `js/app.js:792-793` — "rAF does not fire
in a hidden tab (a known trap here) — the safety net below is what releases the ghost in that case."
A tab hidden AFTER the first reveal frame but before the second is exactly that documented case: the
outer fires, the inner stalls, the 600ms drops the pane.

## 3. The instrument (reproducible)

Probe filed beside this record: `STRIKE-swipe-stage6b-retire-loser.probe.js`. Node
`C:/Users/nzilb/tools/node-dist/node.exe`, run from the repo root. It:

1. Intercepts `fs.readFileSync` for `js/app.js` only and applies the plan's five specified edits,
   line-count-stable, each anchor asserted to match exactly once:
   - `cur.settleTimer = setTimeout(finalize, 340)` (§2)
   - `clearTimeout(cur.settleTimer)` adjacent to the shipped `cancelAnimationFrame(cur.settleFrame)` (§7)
   - `cur.revealFrames = requestAnimationFrame(...)` at line 794 — the OUTER handle, as §2 specifies
   - `cur.revealTimer = setTimeout(() => drop('timeout'), 600)` (§2)
   - in `drop()`, after the `dropped` guard: `cancelAnimationFrame(cur.revealFrames);
     clearTimeout(cur.revealTimer);` (§2/§7)
2. Boots the real harness (`boot({ fakeTimers: true, deferRaf: true })`) and wraps the scheduler fakes
   with an attributing ledger (eval stack line numbers identify each entry's scheduling site: reveal
   frames = line 794; the watchFrames diagnostic tick = line 682; drop-spawned, not a loser).
3. Reaches the held commit→home reveal by the existing RGH recipe
   (`test/swipe-invariants.test.js:569`): tap Authors, committing back-swipe, `clock.advance(400)` —
   the 340ms finalize wins and `holdGhostUntilPaintable` queues the outer reveal frame.
4. Executes two timeout-driven interleavings:
   - **RUN A (control — the plan's covered case):** no frame fires; `clock.advance(600)` → `drop('timeout')`.
   - **RUN B (the strike):** `h.raf.frame()` once — the outer reveal frame fires and schedules the
     inner — then `clock.advance(600)` → `drop('timeout')`.

Prediction stated before the strike landed: the promise predicts zero pending reveal continuations
after the resolver in both runs; the fracture predicts RUN B leaves the inner frame pending and the
cancel hits a fired id.

## 4. The observed result (executed 2026-07-26)

```
== RUN A — timeout drop, outer frame NEVER fired (the plan's covered case) ==
after finalize: raf.pending=1 reveal-frame ids so far=[2]
drop fired: via=timeout confirmed
reveal frames scheduled(line 794)=[2] ran=0 cancelRaf calls=[1,2]
raf.pending after resolver=1 (watchFrames tick from line 682: yes)
PENDING REVEAL (loser) FRAMES AFTER RESOLVER: []

== RUN B — timeout drop AFTER the outer frame fired (inner paint frame pending) ==
after finalize: raf.pending=1 reveal-frame ids so far=[2]
after 1 frame: raf.pending=1 reveal-frame ids=[2,3]
drop fired: via=timeout confirmed
reveal frames scheduled(line 794)=[2,3] ran=1 cancelRaf calls=[1,2]
raf.pending after resolver=2 (watchFrames tick from line 682: yes)
PENDING REVEAL (loser) FRAMES AFTER RESOLVER: [3]
```

(`cancelRaf` id 1 is the settle rAF cancelled at finalize — the shipped .226 cancel, intact. Id 2 is
`cur.revealFrames` cancelled by `drop()`.)

RUN A: the design works exactly as promised — the pending outer frame leaves `rafQ` at the resolver.

RUN B: `drop('timeout')` cancelled id 2, the OUTER handle, which had already fired. The inner paint
frame (id 3), scheduled from the same line 794, stayed pending on `rafQ` after the resolver —
`h.raf.pending()` reads 2 where the covered interleaving reads 1. Drained afterward, the leftover frame
fires a `dropped`-guarded no-op — the precise behavior §3 claims the cancel removes ("leave the
scheduler queue rather than firing `dropped`-guarded no-ops").

**Verdict: KILL.** The promise "after a resolver runs no loser timer/frame stays pending on the
scheduler queue" is false in the timeout-driven drop interleaving where the outer reveal frame has
fired; the construction cancels a spent handle (the wrong-handle axis §3 item 3 claims impossible by
construction) and the phase's actual loser — the inner paint frame — survives its resolver.

## 5. Blast radius

- **§3 items 2-3 (the load-bearing invariant)** — false as constructed for the reveal phase. The
  single-outer-id design cannot express ownership of the second scheduler entry the double-rAF creates.
- **I14** ("every acquired timer/listener/lease/pane/animation callback released or invalidated") —
  the inner frame is acquired by the session's reveal machinery, stored nowhere, released nowhere.
- **Cell RR (§9) goes green over the leak.** Its timeout-driven fixture, as specified ("let one gate
  win the drop"), corresponds to RUN A; nothing in the fixture family fires the outer frame before the
  timeout. The planned suite cannot redden on this defect — the "misattribution" mutation the matrix
  guards against is realized by the plan's own construction in this interleaving.
- **The deferred I12 stage inherits a false premise.** It will null and read these handles so "the
  session object describes LIVE ownership"; with `cur.revealFrames` holding a single outer id, nulling
  at drop would claim no live frame while the inner is pending — the bookkeeping the field exists to
  enable is unimplementable for the reveal frames as designed.
- **Severity, honestly bounded:** the leaked frame is `dropped`-guarded, so there is no user-visible
  effect; the breach is on the resource/queue plane — which is exactly the plane this slice claims as
  its value and the channel its tests observe. The fix (not this seat's pen: re-store the inner id from
  inside the outer callback, or hold both ids) belongs to the planner.

## 6. Lesser planes, un-prosecuted (one line each)

- `cur.settleTimer` (single `setTimeout`, cleared in the once-guarded `finalize` closing over its own
  `cur`): struck by study, no fracture found — one handle, one entry, no half-fired state exists.
- Cross-session misattribution (a resolver cancelling a successor's handle): blocked by construction —
  each resolver closes over its own `cur`, and a superseded session is pre-`settle()` and holds none of
  these handles; not prosecutable.

## 7. Reconciliation (read after the strike was filed)

The plan-review casebook (`Claude/Charpy/PLAN-swipe-stage6b-2026-07-26-r3.md`, the r3 FORGE) came
closest at non-blocking F6: it split cell RR into a timeout-driven fixture (revealFrames pending) and a
gate-driven fixture (revealTimer pending) — but both fixtures leave the double-rAF unfired or fully
fired; the half-fired state between the two frames was not in the review's interleaving set, and the
plan's §2 "stores the outer" wording passed through r1-r3 unremarked. The flaw entered at the plan's
§2 construction (a two-entry resource modeled as a one-id handle), not in scope choices and not in the
review's findings; it is genuinely novel to this strike.

---

{"persona":"loki","stage":"6b","input_artifact":"f83c4a5","promise_id":"retire-correct-loser","verdict":"KILL","nonblocking_ids":[],"return_to":"vitruvius"}
