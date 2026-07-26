# Charpy casebook — PLAN-swipe-stage6b, round 2

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: `8b27670` (HEAD, "Revise Stage-6b plan per Charpy r1 TEMPER (F1/F2 vacuous cells)").
Plan: `Claude/Plans/PLAN-swipe-stage6b.md`. Reviewed against HEAD `js/app.js`, `test/app-harness.js`,
`test/swipe-invariants.test.js`, `Claude/Subsystems/swipe-reveal.md`, `Claude/Decisions/DecisionLog.md`.
Round 1 casebook: `Claude/Charpy/PLAN-swipe-stage6b-2026-07-26-r1.md` (verdict TEMPER, blocking F1/F2).

## Applicability

Project adapter `tomeroam-js-dom`. One line per pattern (unchanged from r1, re-verified against the revised plan):
- **defining_records: true** — records reconciled below; the revision did not disturb §1.
- **boundary_relocation: false** — no code moves; in-place ownership addition inside `js/app.js` `settle()`.
- **callee_replacement: false** — no indirection replaces a direct call; `finalize`/`drop` already exist.
- **contract_shape: false** — session `d` is exempt mutable lifecycle state (subsystem §3/§18); no closed schema moves.

## Verdict

**TEMPER.** The revision resolved the r1 crack cleanly on three of four axes: the §2/§3/§5/§7
"continuation reads its handle" contradiction is genuinely gone, cell SS is removed, the DOM stale-write
property is correctly pinned by the shipped-cancel regression RGcancel (`:598`) with a reddening mutation,
and the §21 scrub (F3) is added. **But the r1 vacuity was relocated, not closed.** The null-on-retire
property — the actual subject of the "Owed to stage 6" debt — was moved onto a verification layer the plan
names as "field inspection" and "ownership spy," and **that layer does not exist in the test tooling and is
not scoped by the plan.** `window.PBSwipeSession()` (app.js:245) exposes only `{id, dragging}` and returns
`null` once the session completes; the harness records no `clearTimeout`/`cancelAnimationFrame`/
`removeEventListener` calls. Consequently SF is vacuous for the null, EP collapses to the pre-existing
`session===null` endpoint test, DF is only half-reddening (the `transitionListener` direction is
unobservable and guard-absorbed), and the null-on-retire still has no reddening test anywhere. The fix is
small and concrete — scope the observability the cells require, or recast them onto the one channel that
already exists — so this is a temper, not a scrap.

## Defining records

**AGREE.** Unchanged from r1 and undisturbed by the revision. The DecisionLog "Owed to stage 6" entry
(2026-07-21, lines 319-323) and subsystem §8 govern the handle-nulling as Stage-6 ownership debt; the
plan-of-record §3.2/I13/I14 govern the target shape. The ledger entry defines the debt's purpose as making
"the session object describe LIVE ownership rather than stale numeric handles" — a truthfulness property.
The revised §3 item 3 now states this correctly ("a bookkeeping property... whose PRODUCTION consumer is
the deferred I12 retirement-check"). No records conflict. §1's authority table is accurate against source.

## What r1 asked, and what the revision achieved

- **F1(a) — the §2/§5 contradiction is genuinely gone.** Verified: §2 (114-122), §3 item 3 (163-171), §5
  (230-239), §7 (286-292) now all state that no continuation reads its own handle and the continuations'
  bodies are unchanged; the retirement's property is truthfulness, not a stale-write defense. RESOLVED.
- **F1(b) — RGcancel reddens and is not vacuous.** Verified: RGcancel's mutation "the retirement REPLACES
  (removes) the shipped settle-rAF cancel" reddens the existing passing regression `:598` — if
  `cancelAnimationFrame(cur.settleFrame)` (app.js:1146) is removed, the deferred rAF fires on resume and
  writes `translateX` onto `#browse`, failing `:598`'s `!nonZeroShift(...)` assertion. A real regression
  guard against the build accidentally dropping the shipped defense. RESOLVED.
- **F1(c) — the null-on-retire property is NOT covered by real field inspection; see F5.** NOT RESOLVED.
- **F2 — DF/RR misattribution: partially reddening; the "spy/field" mechanism is unbuildable; see F5.** NOT
  FULLY RESOLVED.
- **F3 — §21 scrub added.** Verified: §10 (378-380) now names "§21 — strike or update the 'the stage-6
  cleanup debt (null the timer/listener handles)' policy-ledger reference (swipe-reveal.md:100)." RESOLVED.
- **Machine blocks match prose.** Verified: the `vitruvius-gate` `blocking_questions` is now
  `["DF","SF","RR","EP"]` (SS removed); the `vitruvius-coverage` block lists DF/SF/RR/EP + the four RG*
  regressions, matching the §9 prose table exactly. Consistent. RG13/RGH/RGT pin the existing greens
  `:220`/`:569`/`:623` and RGcancel pins `:598` — all four exist. RESOLVED.

## Findings

### F5 — [Structural] (open-unknown) — The recast cells depend on a "field inspection / ownership spy" layer the tooling does not provide and the plan does not scope; the null-on-retire remains uncovered
Nature: **open-unknown**. Decision the plan must make: scope the observability surface, or recast the cells
onto the existing queue channel and reclassify the null.

§9's preamble (332-338) states the verification layer plainly: "an ownership SPY that the correct loser's
`clearTimeout`/`removeEventListener`/`cancelAnimationFrame` is invoked... plus FIELD INSPECTION that the
completed session names no live handle." Both mechanisms are named; **neither exists**, verified against HEAD:

- `js/app.js:245` — `window.PBSwipeSession = () => (session ? { id: session.id, dragging: !!d } : null);`.
  The only session accessor exposes exactly `{id, dragging}`, and returns `null` the moment the session
  completes (`session` is nulled by `sessionDone`). It cannot report whether `cur.settleFrame`,
  `cur.settleTimer`, `cur.transitionListener`, `cur.revealFrames`, or `cur.revealTimer` are null.
  `test/swipe-invariants.test.js:521` (`activeSession`) is built on this accessor.
- `test/app-harness.js` — `fakeClearTimeout`/`trackedClearTimeout` (338, 352-355) and `cancelRaf` (241)
  splice from the queue but record nothing into `log`; jsdom's `removeEventListener` is unwrapped. There is
  no ownership spy recording a retirement call or its argument. `app.js` was deliberately given "NO
  test-only exports" (harness line 29) beyond the minimal `PBSwipeSession` snapshot.

Consequences, cell by cell (each verified against the two mechanisms above and the shipped `done`/`dropped`
guards at app.js:1143/751):

- **SF is vacuous for the null.** Its mutation "leave `settleFrame` set after cancel/fire" mutates a field
  no test surface can read → non-reddening. The only observable proxy — "the settle rAF is no longer
  pending after finalize" — tests the shipped *cancel*, which is RGcancel/`:598`, not the null. SF adds
  nothing beyond RGcancel.
- **EP collapses to the existing endpoint test.** After the terminal resolver the accessor returns `null`
  whether or not the handles were nulled, so EP's mutation "retire only SOME phase handles → a non-null
  handle reachable on the released `cur`" is unobservable. EP reduces to `activeSession(h)===null`, already
  proven by `test/swipe-invariants.test.js:588`. Its distinctive null-on-retire claim is uncovered.
- **DF is half-reddening.** The `transitionend`-wins direction (loser = `settleTimer`) IS observable: an
  uncleared 340ms timer stays in the fake queue, catchable via `h.clock.pending()`. The 340ms-wins
  direction (loser = `transitionListener`) is NOT: there is no spy on `removeEventListener`, and a
  still-bound listener firing a late `transitionend` re-enters `finalize` and is swallowed silently by the
  `done` guard. So the `transitionListener` retirement specifically has no reddening test.
- **RR is reddening on the observable channel the plan does not name.** Both reveal handles are a
  frame/timer, so misattribution leaves a loser in `rafQ`/`tq`, catchable via `h.raf.pending()`/
  `h.clock.pending()`. RR genuinely reddens — but via queue inspection, not the "spy/field inspection" §9
  claims, and its "both slots null after" half is still unobservable.

Net: the null-on-retire — the recorded subject of the debt — has **no reddening coverage** (SF/EP can't see
it), and the `transitionListener` retirement has none either. This is the r1 finding's residual: F1/F2
named the surface that was vacuous (the DOM cells) and fixed it, but a sibling survived — the ownership
axis the cells were moved onto is itself unobservable with current tooling (D5: correct the class, not the
sentence). The revised §3 item 3 compounds it by admitting the null's only production consumer is the
deferred I12 stage — which, under §4.15, requires "an exact test [to] prevent it from becoming permanent,"
and no such test is writable.

Resolution (invariant, not prescription — either satisfies it):
1. **Scope the observability.** Add to §2's declared changes an extension of `PBSwipeSession()`
   (app.js:245) that reports per-handle liveness (e.g. a boolean "the session names any live handle," or
   the handle fields), and re-verify each field-inspection mutation (SF, EP, and DF's listener direction)
   reddens against it. This is a named production change and a new observable surface — it belongs in the
   scope boundary and the ledger, not implied by "field inspection." OR
2. **Recast onto the existing channel and reclassify the null.** Map DF/RR/SF to the frame/timer queue
   (`h.raf.pending()`/`h.clock.pending()`) for the cancel/remove of the timer/frame handles (settleTimer,
   revealFrames, revealTimer — all observable), pin the settleFrame cancel to RGcancel, and state honestly
   that (a) the `transitionListener` *removal* is parity-hygiene absorbed by `{once:true}`+`done` with no
   independent test this slice, and (b) the null-writes are recorded-but-deferred-consumer bookkeeping
   (consumed by I12, §11), not a field-inspection-covered property — a §4.15 time-bounded exception with
   its consuming stage named, rather than a coverage claim that cannot be written.

Either path is a small, local revision. Path 2 is closer to the shipped harness and the "no new test-only
exports" posture; path 1 buys a genuine truthfulness test at the cost of one production accessor line.

## Coverage

The one blocking finding maps to its verification:

- **F5 (Structural, open-unknown)** — verified against `js/app.js:245` (`PBSwipeSession` exposes only
  `{id, dragging}`, returns `null` post-completion), `test/app-harness.js:238-243` / `:333-363` (no spy
  records `cancelAnimationFrame`/`clearTimeout`; queue splice only), `test/swipe-invariants.test.js:521`/
  `:588` (existing accessor + endpoint test), and the `done`/`dropped` guards (`js/app.js:1143`/`:751`)
  that absorb the `transitionListener` late fire. Resolution: scope the observability surface (extend
  `PBSwipeSession`) OR recast SF/EP/DF/RR onto the queue channel and reclassify the null as
  deferred-consumer bookkeeping (§4.15) — either makes every blocking cell reddening against a real
  surface.

Non-blocking, resolved (no coverage owed): F1(a) contradiction removed; F1(b) RGcancel reddening; F3 §21
scrub added; machine blocks consistent; RG13/RGH/RGT/RGcancel pin `:220`/`:569`/`:623`/`:598`.

## Prediction — where this breaks in execution if built as written

Curie derives SF and EP as `PBSwipeSession`-based field inspection, boots the harness, and finds the
accessor returns `{id, dragging}` during the gesture and `null` after it — nowhere to read
`cur.settleFrame`. She then either (a) quietly extends `PBSwipeSession` (or adds a harness timer spy) — an
undeclared production/infra change that lands without its own scope entry or mutation anchor, exactly the
kind of drift the reviewable-stage discipline exists to prevent — or (b) falls back to queue-count tests
that cover the settleTimer/revealFrames/revealTimer cancels but silently leave the `transitionListener`
removal and every null-write untested, shipping the ownership debt's headline property (the session
truthfully names no live handle) green-but-unproven. That is the project's recorded "vacuously-green
harness" scar arriving one axis over from r1. Naming the observability surface now — deciding path 1 or
path 2 in §9/§2 before Curie opens the suite — closes it cheaply, and lets the subsequent Loki strike on
the misattribution/stale-fire promise land against a target that a red test can actually pin.

---

{"persona":"charpy","stage":"6b","round":2,"input_artifact":"8b27670","verdict":"TEMPER","blocking_ids":["F5"],"return_to":"vitruvius"}
