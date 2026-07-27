# PLAN — Swipe/reveal Stage 6c (the I12 consumer stage) — SLICE ESCALATION

Type: plan

<!-- vitruvius-gate {"plan_type":"escalation","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":false},"project_adapter":"","source_ranges":[],"callee_ranges":[],"affected_contracts":[],"staged_records":[],"blocking_questions":[]} -->

Status: **ESCALATION — for the user (strategic slice decision), then Charpy** (2026-07-26). This document
specifies NO code change. It is the grounded output of the Stage-6c scoping pass, which found that the
slice 6c was chartered to deliver — the null-on-retire bookkeeping, the `transitionend` listener's
session-ownership/removal, and the I12 stale-callback enforcement that READS the nulled handles — **cannot
be bounded as a non-vacuous, ratifiable slice while the `finishing` gate stands**, and the one change that
would make it non-vacuous (retiring the `finishing` gate in favour of the finalize state machine) is the
I10/I17 reveal-centralization restructure the 6c charter explicitly forbids pulling in. That is a genuine
strategic fork plus a scope contradiction, so it is raised rather than resolved unilaterally. All-patterns-
false by policy: no boundary moves, no callee is replaced, no contract shape changes, no state transfers,
no async surface is added, no persistence migrates, and no lifecycle-ownership code is authored here —
because no code is authored here. Grounded against post-6b HEAD `js/app.js` (build `2026-07-26.250`):
`begin()` (351-352), `settle()`/`finalize()`/`holdGhostUntilPaintable()` (539-1183), the I12 rationale
comment (219-234); and against the real harness `test/app-harness.js` (the `clock.pendingDump`/
`raf.pendingIds` per-id channels, and `PBSwipeSession` exposing only `{id,dragging}`).

## Applicability

Machine-readable declaration above; no project adapter (no code ranges are declared because no code
change is specified). Reason for each pattern — all false, because this document authors no implementation:
- **boundary_relocation: false** — nothing moves across a module boundary; no code is written.
- **callee_replacement: false** — no direct call is replaced by an indirection; no code is written.
- **contract_shape: false** — no exact-key contract changes; the analysis below concludes a `PBSwipeSession`
  shape extension would be a dead field, so it is NOT proposed for implementation.
- **state_transfer: false** — no ownership boundary relocates; no code is written.
- **async_change: false** — no asynchronous surface is created, cancelled, or reordered; the discussion of
  the existing async continuations is analysis of HEAD, not a change to it.
- **persistence_migration: false** — N/A; the gesture is in-memory (subsystem §15).
- **lifecycle_ownership: false** — no resource lifecycle is authored; the discussion of the existing
  handles' lifecycles is analysis of HEAD, not a change to it.

## Index
1. Defining records and authority
2. The finding — why the chartered 6c slice is vacuous while the `finishing` gate stands
3. Exact scope — why no bounded non-vacuous slice exists under the charter's constraints
4. The fork (options, with a recommendation)
5. What a ratifiable 6c actually requires (the grounding owed once a fork is chosen)
6. Records reconciliation (flagged, not applied)
7. The escalation

## 1. Defining records and authority

Every record that materially defines Stage 6c, its authority, and what it presupposes. **Verdict: the
records AGREE on the required END-STATE and on the sequencing; the material finding is a GAP, not a
conflict among them — no defining record describes a bounded slice, smaller than the `finishing`-gate
retirement, that supplies a non-vacuous consumer for the null-on-retire writes. The contradiction is
between the 6c CHARTER (this task: deliver the I12 reader that consumes the nulls, but do NOT pull in the
I10 reveal-centralization) and the code reality that the I12 reader only becomes reachable/load-bearing
INSIDE that reveal-centralization restructure. That fork is §4 and is escalated.**

| Record | What it says | Authority | Bearing on 6c |
|---|---|---|---|
| `js/app.js` I12 rationale comment (219-234) | "The plan's 'every async callback captures session.id and no-ops when superseded' (§3.2, I12) is DELIBERATELY NOT added here ... today `finishing` already rejects every new gesture for the entire settle→finalize window ... So a `cur === session` guard on those callbacks is UNREACHABLE BY CONSTRUCTION right now ... That guard becomes reachable, load-bearing and testable only once STAGE 6 retires the `finishing` gate in favour of the state machine — so it lands there, with the test that can fail." | In-code decision (verified current, precedence 3) | GOVERNING. States directly that the I12 enforcement is vacuous until the `finishing` gate is retired for the state machine — the exact finding of §2. |
| `DecisionLog.md` "Owed to stage 6" (2026-07-21) | NULL the stored session handles when the settle rAF / settle/reveal timers / transitionend listener are cancelled OR fire, "so the session object describes LIVE ownership rather than stale numeric handles ... part of the stage-6 finalization-centralization work." | Active decision ledger | Names the null-writes as part of the FINALIZATION-CENTRALIZATION work — i.e., bundled with the restructure, not a standalone bounded step. Names no reader. |
| `PLAN-swipe-stage6b.md` §11 | Defers to "the I12 stage" (= 6c): the null-on-retire writes (consumer = "the I12 retirement-check, §4.6 'the resource has not already been retired'"); the `transitionListener` ownership + removal (same consumer); the per-handle-liveness observability surface (a `PBSwipeSession` extension, "scoped WITH the I12 stage, where the reader justifies the accessor"). | Ratified plan-of-record (6b) | The charter for 6c. Its PREMISE — that 6c supplies a non-vacuous reader that consumes the nulls — is what §2 tests and finds false while the `finishing` gate stands. |
| `PLAN-swipe-stage6b.md` §11 + `PLAN-swipe-stage6.md` §11 | The `finishing`-gate retirement + `cur === session` enforcement (I12/I20), `finalizationPlanFor`, `sameBrowseHost`, pane `release`/`dispose`, the I10 paint-gated reveal centralization + I17, and the `recoverSession` matrix are ALL deferred together to "Stage 6c/7 (the finalization/reveal centralization)." | Ratified plans-of-record | The I12 enforcement is filed IN THE SAME deferred bundle as the I10 reveal-centralization. The charter's instruction to deliver the former while excluding the latter splits a bundle the records keep together — the fork. |
| `EngineeringContract.md` §4.6 | A stale continuation must verify "the resource has not already been retired; finalization has not already occurred; a successor has not taken ownership" before acting; "Tests must deliberately deliver stale callbacks after supersession ..." | Core rule | The rule the I12 reader would satisfy. §4.6 requires a TEST that delivers a stale callback — which requires the callback be REACHABLE post-retirement. §2 shows it is not, under the `finishing` gate. |
| `EngineeringContract.md` §4.15 | "Do not introduce a field until the same implementation slice contains a real production consumer and a test proving that consumer uses it. A future stage is not a consumer." | Core rule | The wall the null-writes hit: their only candidate consumer under the charter is a `PBSwipeSession` liveness mirror that merely reports the field it mirrors (circular) — a dead field. §2/§4. |
| `Subsystems/swipe-reveal.md` §8 | After 6b: "Still deferred to the I12 stage (its consumer): the NULL-on-retire writes, the `transitionend` listener's session-ownership/removal, and a per-handle-liveness observability surface (no testable/consumed surface exists until I12)." | Subsystem addendum | Restates the charter and its premise. "no testable/consumed surface exists until I12" is precisely the claim §2 examines and finds does not become true at 6c unless the `finishing` gate is retired. |
| `test/app-harness.js` (777-789, 814-824, 245) | `clock.pendingDump()` / `raf.pendingIds()` are the per-id scheduler-queue channels (the 6b channel). `PBSwipeSession()` (app.js:245) exposes `{id, dragging}` and returns null post-completion; the harness records no session-field read and adds "NO test-only exports" to app.js (29). | Verified test tooling (precedence 3) | GOVERNS observability: a null-write to `cur.settleTimer` is invisible through every existing surface, exactly as in 6b. A new surface to observe it is a production accessor whose only consumer is the test — the §4.15/harness-posture problem. |

Authority precedence: the in-code I12 rationale (219-234) and the harness (both precedence-3 verified
current behaviour/tooling) GOVERN what is reachable and observable; the 6b/6a/parent plans govern the
staged intent; the Engineering Contract governs the rules the slice must satisfy. They do not disagree
with each other. The disagreement is charter-vs-reality (§4).

## 2. The finding — why the chartered 6c slice is vacuous while the `finishing` gate stands

The 6c charter is: null the retired handles, make the `transitionend` listener a removed session resource,
and add the I12 "already-retired / `cur === session`" reader that CONSUMES the nulls — so the null-writes
become a live, tested consumer (not a §4.15 dead field) and observable through the reader's behaviour. The
grounding pass traced every asynchronous continuation the reader would guard, and found each is ALREADY
neutralized without a reader, so the reader gates nothing that can differ — a vacuous cell, which is the
failure mode that killed the 6b campaign twice.

**2.1 Supersession is blocked across the entire async lifecycle by the `finishing` gate.**
`begin()`'s first line is `if (finishing) return;` (app.js:352). `finishing` is set true at the top of
`settle()` (540) and set false only INSIDE the completion path: the no-pane finalize (`runFinalize`, 1151),
the held-reveal `drop()` (792), or a throw (1177). On a held-reveal path it is DELIBERATELY kept true from
finalize until `drop()` (comment 1170-1173). Therefore, from `settle()` until the terminal resolver, NO new
gesture can arm — so no successor `session` can exist while `cur.settleFrame`/`settleTimer`/`revealFrames`/
`revealTimer` or the `transitionend` listener are pending. A `cur === session` guard on those callbacks is
therefore always true when they fire: it can never take its false branch. Unfalsifiable → untestable →
vacuous. This is exactly what app.js:219-234 records.

**2.2 Double-fire within a single session is already caught by `done` / `dropped`.**
`finalize` is guarded by `let done = false; if (done) return; done = true;` (1160); `drop` by
`let dropped = false; if (dropped) return; dropped = true;` (751). Every candidate stale fire resolves to
these:
- the 340ms `settleTimer` firing after `transitionend` finalized → `finalize` → `done` no-op;
- a real `transitionend` firing after the 340ms finalized → `finalize` → `done` no-op (the leaked listener);
- the reveal double-`rAF` or the 600ms `revealTimer` firing after another gate dropped → `gate`→`drop` → `dropped` no-op.
A per-handle "read the nulled handle, return if already retired" reader placed on these callbacks is
REDUNDANT with the `done`/`dropped` booleans: it changes no behaviour, so no mutation reddens a test that
distinguishes it. Vacuous.

**2.3 The post-drop deferred timers touch no shared/session state.**
`fadePanes`'s per-pane removal `setTimeout` (649) is guarded by `if (el.parentNode)` and removes only its
own owned-pane element; `watchFrames`'s rAF chain (666-682) only calls `PBDebug.log`. These fire AFTER
`finishing` is false (post-drop), so a successor CAN exist during their window — but they mutate no session
state, no transforms, no stack, no scroll. A `cur === session` guard on them would gate nothing observable.
Vacuous.

**2.4 The null-writes remain unobservable, exactly as in 6b.**
A null-write targets a field on the session object `cur`. No harness surface reads session fields:
`PBSwipeSession()` exposes only `{id, dragging}` and returns null once the session ends (app.js:245). So
`cur.settleTimer = null` is invisible through every existing channel — the identical gap that made 6b defer
the null-writes. The only way to observe it is a NEW `PBSwipeSession` liveness accessor. But that accessor's
sole consumer would be the test that reads it (the I12 reader being vacuous per 2.1–2.3): a production field
mirrored by a production accessor consumed only by a test is a §4.15 dead field with a diagnostic figleaf —
the precise anti-pattern 6b named and refused (6b §11: "scoping it now would add a production accessor ahead
of its consumer, against the harness's 'no test-only exports' posture").

**2.5 The `transitionend` listener removal is inert-by-`done`, and equally unobservable.**
Making the listener a session-owned handle and `removeEventListener`-ing it in finalize is pure resource
hygiene: a leaked `transitionend` listener on the borrowed-real anchor (`cur.movers[0].el`, a shared
`#browse`/`#home`/overlay node) fires `finalize` → `done` no-op, then auto-removes on the next real
transition (`{once:true}`, 1181). There is no non-`done` path for its effect and no harness listener-count
surface, so its removal has no non-vacuous observable — the same class as the 6b null-writes, which 6b
deferred for the same reason.

**Conclusion.** Under the `finishing` gate, none of the three chartered items has a reachable, non-vacuous,
observable consumer. The reader the charter names becomes real only when the `finishing` gate is retired in
favour of `cur === session` phase ownership — at which point a genuinely superseding gesture can arm
mid-finalize and its stale callbacks MUST no-op via the reader that reads the nulled handles. That
retirement is the finalize state machine, which app.js:219-234 and the parent plans bind together with the
I10/I17 reveal-centralization.

## 3. Exact scope — why no bounded non-vacuous slice exists under the charter's constraints

- **MOVES / STAYS / SPLIT: none.** This document authors no code. Nothing moves, stays, or splits.
- **What a compliant 6c would need to CHANGE, and why each is blocked from being a bounded slice now:**
  - *The null-on-retire writes* — blocked by §2.4 (no non-vacuous consumer or observable surface under the
    `finishing` gate; a liveness mirror is a §4.15 dead field).
  - *The `transitionListener` session-ownership + removal* — blocked by §2.5 (inert-by-`done`, unobservable;
    a release-only item with no test, which 6b's own precedent defers).
  - *The I12 `cur === session` / already-retired enforcement* — blocked by §2.1–2.3 (unreachable/redundant
    while `finishing` stands; §4.6 requires a test that delivers a stale callback, which cannot be
    constructed).
- **DEFERRED, with the consumer each waits on (unchanged from 6b §11, re-confirmed):** all three items wait
  on the SAME consumer — a reachable finalize state machine in which the `finishing` gate is retired so a
  successor can arm mid-finalize. That consumer is not introduced by any slice smaller than the
  reveal-centralization restructure. Naming a bounded 6c that introduces it while excluding I10/I17 is the
  fork (§4), not a scoping call this pass can make.
- **NOT pulled in (per charter):** `finalizationPlanFor` / `sameBrowseHost` / pane `release`/`dispose` /
  I10 paint-gated reveal centralization — correctly out of any 6c that is NOT the restructure. The finding
  is that the chartered 6c items depend on the head of that same bundle (the `finishing`-gate retirement),
  so they cannot be cleanly separated from it.

## 4. The fork (options, with a recommendation)

The strategic decision the user owns: the chartered 6c cannot be both (a) non-vacuous and (b) free of the
`finishing`-gate retirement. Choose one path.

- **Option A — RE-SCOPE 6c as the finalize-state-machine slice (RECOMMENDED).** Make 6c the stage that
  retires the `finishing` gate in favour of `cur === session` phase ownership, and land the null-on-retire
  writes + the I12 already-retired reader + the `transitionend` listener removal together, with the reader
  as their now-reachable consumer. This is the only path on which the null-writes get a non-vacuous, tested
  consumer and §4.6's "deliver a stale callback after supersession" test becomes constructible (a successor
  arming mid-finalize, its stale settle/reveal callbacks reading nulled handles and no-oping). It is a
  larger, flash-sensitive slice: it touches the ownership model the whole settle→reveal path keys off, so it
  needs its own grounding pass (§5) and will draw a Loki strike on the retirement race. It CONTRADICTS the
  charter's "do not pull in I10 reveal-centralization," because retiring the `finishing` gate is the head of
  that restructure — which is exactly why it needs the user's explicit go.
  - *Bounding note:* A/B split is possible — 6c could retire the `finishing` gate + I12 reader + null-writes
    (the ownership half) and STILL defer the paint-gated reveal timing / `finalizationPlanFor` /
    `sameBrowseHost` / pane-lifecycle (the flash-half of I10/I17) to 6d/7 — IF the grounding pass (§5)
    confirms the gate can be retired without changing reveal PAINT timing. That is the most attractive
    bounded shape, but whether it is safe is a §5 question, not assumable here.

- **Option B — Ship 6c as release-only hygiene, no test (NOT recommended).** Land the `transitionListener`
  removal + the null-writes as resource-release hygiene proven only by a source-level/mutation-sweep guard,
  with an explicit, recorded "unobservable in harness" note. This repeats what 6b deliberately declined; it
  adds a §4.15 dead field (the nulls still have no reader) and a release with no reddening test. It buys
  little and spends the "6c" name on non-load-bearing bookkeeping.

- **Option C — Retire the "6c = I12 consumer" framing; give 6c a different bounded subject (NOT
  recommended without the user's go).** Fold all three deferred items into the eventual restructure (Option
  A's content, renamed 6d/7) and spend 6c on a different parent-§11 workstream that DOES have a reachable
  consumer now. The 6c charter is specifically the I12 debt, so changing its subject is also a user call.

**Recommendation: Option A (with the A/B split of A pursued if §5 clears it).** It is the only option under
which the chartered debt is discharged with a real, tested consumer instead of a dead field. It requires the
user to authorize crossing the line the charter drew — retiring the `finishing` gate is inseparable from the
head of the reveal-centralization the charter excluded.

## 5. What a ratifiable 6c actually requires (the grounding owed once a fork is chosen)

If Option A is authorized, the follow-on plan must ground (Vitruvius Phase 2) before it can be bounded — and
these are the questions that decide whether the safe A/B split exists:

- **Can the `finishing` gate be retired without changing reveal PAINT timing?** The flash saga (memory
  `tomeroam-swipe-repaint-saga`) makes the reveal paint path radioactive. Determine whether `cur === session`
  phase ownership can replace `finishing`'s gesture-rejection role while leaving `holdGhostUntilPaintable`'s
  decode/paint/timeout gating byte-for-byte unchanged. If yes, the ownership half is separable (the
  attractive 6c); if no, 6c is the full restructure.
- **The exact reachable stale-callback set once a successor can arm mid-finalize.** Enumerate which of the
  now-live callbacks (settle rAF, settleTimer, revealFrames, revealTimer, transitionend) can fire after a
  successor arms, and what each would corrupt absent the reader (transforms on borrowed-real movers; the
  held pane; the stack). This is the Coverage Model's load-bearing set and the Loki target.
- **The observability channel for the reader.** With the gate retired, the reader's no-op IS observable
  through the successor's state staying intact (a stale callback that no-ops leaves the successor's
  transforms/pane/stack unmutated; one that does not, corrupts them) — a real, non-mirror consumer that
  needs no `PBSwipeSession` extension. Confirm this against the harness (`h.touch` two-gesture interleave +
  `deferRaf`/`fakeTimers`), so the null-writes are consumed by BEHAVIOUR, not by a diagnostic read-out.
- **Whether `PBSwipeSession` needs extending at all.** If the reader's behavioural channel above holds, the
  liveness surface 6b flagged is NOT needed — the nulls are consumed by the reader's control flow, and the
  intermediate-state assertion (§4.7) reads the successor's DOM, not the session's fields. Decide this
  explicitly; do not add the accessor by default.

## 6. Records reconciliation (flagged, NOT applied)

This document changes no code, so it triggers no code scrub. Two records should be reconciled to current
truth by the maker/Zelda WHEN A FORK IS CHOSEN (flagged, not done here, per the reviewer-edit and
records-lifecycle rules):

- **`Subsystems/swipe-reveal.md` §8 / §21** — the phrase "deferred to the I12 stage (its consumer)" presumes
  a bounded I12 stage supplies the consumer. Once the fork is chosen, correct it to: the null-writes /
  `transitionListener` removal / I12 reader land WITH the `finishing`-gate retirement (the finalize state
  machine), which is the head of the reveal-centralization bundle — not a bounded step before it.
- **`DecisionLog.md`** — append a dated entry recording this scoping finding: the "I12 stage" label
  conflated a small bookkeeping change (the null-writes) with the restructure that alone makes it
  consumable; 6c is escalated to the user to choose Option A (re-scope to the state-machine slice) vs
  deferring the debt into 6d/7. Reference this artifact.
- **Campaign name reconciliation (still open from 6b §10)** — the `swipe-stage6` campaign gate globs match
  `stage6-*`; a `stage6c` artifact name does not. Whichever fork is chosen, the globs must widen or a
  `stage6c` campaign be created before 6c can be checked complete. A tooling decision for Zelda; not made
  here.

## 7. The escalation

The Stage-6c charter — deliver the I12 reader that consumes the null-on-retire writes, without pulling in
the I10 reveal-centralization — is not satisfiable as written: the reader is vacuous-by-construction while
the `finishing` gate stands (app.js:219-234; §2), and retiring that gate is the head of the very
reveal-centralization the charter excludes. This is (a) a strategic decision the user owns (authorize
crossing that line, Option A; or defer the debt, Option C) and (b) a scope contradiction between the charter
and the code the plans-of-record already record. Per the planner's mandate, it is raised rather than
resolved by a silent guess or a §4.15 dead field. On a chosen fork, the follow-on plan grounds §5 and
returns to Charpy. No code is written and no defining record is edited by this document.
