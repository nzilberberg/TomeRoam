# Charpy casebook — PLAN-swipe-stage6c (I12 ownership half), round 2

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":[],"callee_ranges":[]} -->

Input artifact: **9a331fc** (HEAD) — `Claude/Plans/PLAN-swipe-stage6c.md`, revised after r1 TEMPER
(`Claude/Charpy/PLAN-swipe-stage6c-2026-07-26-r1.md`, input `90af572`, F1/F2 blocking + F3/F4 folded).
Re-grounded against `js/app.js` (build `2026-07-26.250`), `test/app-harness.js`,
`test/swipe-invariants.test.js`, and the r1 code facts (real cancel/splice at app-harness.js:241/356-359;
`finishing` set at app.js:540, cleared only at 792/1151/1177, read at 352; `sessionDone` at 242;
`revealPending` set true only by the held-reveal branches at 558-559).

## Applicability

- **defining_records: true** — the review reconciles the records that define the slice (Option-A auth, the
  I12 in-code rationale, the "Owed to stage 6" ledger entry, EC §4.6/§4.15/§4.18, the swipe-reveal subsystem
  disposal boundary, `PLAN-swipe-reveal.md` §7 step 6), plus the internal consistency of the plan's own §3
  gate spec against its §9 coverage matrix.
- **boundary_relocation: false** — no ownership boundary relocates across a module seam; the plan is an
  in-place gate narrowing + `finishing` clear + an identity guard on two callbacks (plan
  `state_transfer:false`). No source-range ledger required of this review.
- **callee_replacement: false** — no direct callee is replaced by an indirection; existing callbacks gain a
  guard. ("supersede/successor" is gesture supersession.)
- **contract_shape: false** — no exact-key contract changes; `d`/`cur` is exempt mutable lifecycle state; no
  field added; no `PBSwipeSession` extension (plan §2.6).

## Verdict

**TEMPER** → Vitruvius. F1 is fully and correctly resolved and F2's intent is right, but the F2 wedge-fix is
specified in a way that makes its own verification cell (W) vacuous: §3 narrows the gate to
`if (finishing && paneOwning(session)) return;` (a POSITIVE pane-owning check), under which a stuck
`finishing = true` with `session === null` does NOT reject — so omitting the `finishing = false` clear (cell
W's mutation) causes NO wedge, W stays green, and the `finishing` clear is a dead write. §9-W states the
opposite (the mutation "rejects the next swipe"). The two sections contradict each other on begin()'s
behaviour for `finishing && !session`, and the §3 reading reproduces the exact vacuous-cell class this
re-gate exists to prevent. One blocking finding; small fix (pin the gate to the negative form). Not a scrap —
the identity-guard spine and the A/B split remain clean.

## Defining records

**AGREE** (external records). The user's Option-A authorization (precedence 1), the I12 in-code rationale
(app.js:219-234), the "Owed to stage 6" ledger entry (correctly recorded as NOT discharged — §1 row 3, §10),
EC §4.6/§4.15/§4.18, the subsystem disposal boundary (swipe-reveal.md:69-70), and `PLAN-swipe-reveal.md` §7
step 6 are mutually consistent and faithfully cited. Line citations re-verified accurate (begin 351-412,
gate 352, recovery 361-390, settle rAF 551-553, finalize 1159-1179, settleTimer 1182, transitionend 1181,
paneKindOf 686-692, mover reset that clears transition 712, sessionDone 242, throw-wedge guard :623-646).

**One INTERNAL conflict (filed F5):** §3 (gate narrowing) and §9-W (mutation-reddening) disagree on what
begin() does when `finishing === true` and `session === null` — §3's positive pane-owning check falls
through (engages the next swipe), §9-W requires a reject (wedge). This leaves the F2 fix's load-bearingness
and cell W's non-vacuity unresolved (StandardsDocument §7; Charpy D1).

## Findings

### F1 (from r1) — RESOLVED (verified)

The settle-phase null-writes and the `transitionListener` session-ownership/removal are shrunk out; the
`cur === session` identity guard is the sole mechanism this slice lands. Verified against the four r1
sub-checks:

- **(a) contradiction gone.** §4.15 (§1 row 5, §4 line 253-259) now states 6c adds NO field — the guard
  reads the existing module `session`; the null-writes are NOT added. §4b ledger (279-291) rows only the two
  identity reads + the `finishing` clear, explicitly "No handle is nulled (F1), so no retired-null record is
  rowed." §4/U11 (246-251) names the identity check as the single mechanism and labels only the LOCUS a
  recommendation. §9 G1/G2/G3 mutations are uniformly "remove the `cur === session` guard." No section still
  claims the null is consumed. The §4/U11-vs-§4.15/§9 contradiction is genuinely gone.
- **(b) G1/G2/G3 non-vacuous.** Confirmed against the harness: begin() does NOT cancel the settle rAF or the
  340ms timer and does NOT remove the transitionend listener (§3 line 190-204, §5 line 299-305), so each
  stale callback stays queued and fires; the real cancel/splice semantics (app-harness.js:241/356-359) mean
  a fired stale callback is observable only because it was NOT cancelled. Removing the identity guard then
  lets the settle rAF write `translateX` on the successor's borrowed-real movers (observable via
  `el.style.transform`, the `swipe-invariants.test.js:598-616` channel) — G1; and lets `finalize_A` run
  `runFinalize_A` (applyScreen/nav-stack over B, observable in the log) via the 340ms timer — G2 — or via the
  still-attached `{once}` transitionend listener — G3. All three redden on "remove the guard."
- **(c) nothing dead ships.** No field is added; the nulls + `transitionListener` ownership defer to 6d/7
  (§11 line 467-473) by the correct rule — their reddening reader (retired-WHILE-`cur === session`) exists
  only in the held reveal, which stays gated. The deferral is honest.
- **(d) debt correctly recorded.** §1 row 3 and §10 both record the "Owed to stage 6" null-handle debt as
  NOT discharged by 6c and re-home the whole debt (settle + reveal nulls) to 6d/7.

### F2 (from r1) — core RESOLVED; residual F5 on gate structure

The `finishing = false` clear is added to the supersession recovery (§3 line 178-182, §4 item 4, §7 liveness
requirement) and the recovery-entry predicate is broadened to admit a pane-less settling session
(`if (d || document.querySelector('.nav-ghost') || (finishing && session))`, §3 line 176). The predicate
genuinely reaches the pane-less session: `finishing && session` is true for a pane-less settle (d===null, no
`.nav-ghost`), so the recovery runs. The intent — clear `finishing` so a superseding gesture that never arms
cannot wedge — is correct. The residual defect is that the gate's reject condition (below, F5) determines
whether that clear is load-bearing and whether cell W can observe its omission.

### F5 (NEW; residual of F2) — the §3 gate spec makes the `finishing` clear dead and cell W vacuous, contradicting §9-W (Structural; nature: defect)

§3 (line 170-177) specifies the narrowed gate as a POSITIVE pane-owning check: "an in-flight finishing
session that OWNS A PANE (`session.movers.some(m => m.own === 'owned-pane')`) still returns … a PANE-LESS
finishing session falls through to be superseded." It is silent on `finishing === true` with `session ===
null`. Implemented literally — `if (finishing && paneOwning(session)) return;` with `paneOwning(null) ===
false` — that state does NOT reject.

Trace cell W's mutation (omit `finishing = false`) under that gate:
1. A pane-less settle: `finishing = true`, `session = A`.
2. The superseding 2nd touch reaches the recovery (before the edge check at app.js:397-399); the recovery
   nulls `session` last (§3 line 188) and — under the mutation — leaves `finishing = true`. Whether the 2nd
   touch is a non-edge tap (returns at 399, never arms) or an edge tap (arms `d_B`, then `end()` at
   app.js:532 → `sessionDone` → `session = null`), the resulting state is `finishing = true`, `session =
   null`.
3. The next full swipe's begin(): `if (finishing && paneOwning(session))` → `session === null` →
   `paneOwning(null) === false` → does NOT return → the recovery predicate `(finishing && session)` is also
   false → begin() proceeds and ARMS. The next swipe engages.

So under §3's gate the mutation causes NO wedge → W stays green in both correct and mutated builds → **W is
vacuous** (§4.10 mutation-verification failure), and the `finishing = false` clear is a dead write (omitting
it changes nothing observable). This is the same silent vacuous-green class the campaign has repeatedly died
on, now reappearing on the F2 fix.

§9-W (line 400) asserts the opposite: the mutation "→ `finishing` stays true → begin() (app.js:352) rejects
the next swipe, which never engages." For that to hold, begin() must reject on `finishing === true` even when
`session === null`. §3 and §9-W therefore contradict each other on begin()'s behaviour for `finishing &&
!session` — a required behaviour left unresolved (StandardsDocument §7; Charpy D1).

The fix is small and pins the design coherently: specify the gate in its NEGATIVE form — reject on
`finishing` UNLESS a pane-less session is actively being superseded, i.e.
`if (finishing && !(session && paneLess(session))) return;` (equivalently: `session === null` or
pane-owning → return). Under this gate the stuck `finishing = true`/`session === null` state rejects → the
next swipe wedges → W reddens → the `finishing = false` clear is load-bearing. Align §3's wording with
§9-W's mutation behaviour so a builder cannot implement the positive check and ship a vacuous W. (Verified
this negative gate is correct for every reachable state in correct code: `finishing === true` always carries
its running session, pane-owning → reject (PG), pane-less → supersede; `finishing && session === null` never
occurs in correct code, so rejecting there costs nothing and only closes the mutated-state test — D6 on my
own proposal.)

### F3 (from r1) — folded, honest (verified)

§2.3 (line 128-135) and §11 (489-494) drop "zero flash surface" and name both caveats: the mover reset must
clear the CSS `transition` (flagged for Brunel to confirm on `Nav.resetSwipeStyles`; the cited app.js:712 is
runFinalize's reset, correctly used as pattern-evidence, not as proof about resetSwipeStyles), and a
committing pane-less supersession can surface the known-open aborted-swipe repaint. Honest.

### F4 (from r1) — present (verified)

§9 PG row (401) and §12 (506) carry the note for Curie to confirm the ghost pane materializes under
`opts.realBrowse` and that the mutation disposes it, else PG is vacuous.

## Coverage (blocking findings → verification)

- **F5** — resolved by pinning the gate to the negative form (reject on `finishing` unless actively
  superseding a pane-less session) in §3, and aligning §3 with §9-W. Verified by: (a) §3's gate spec rejects
  when `finishing === true` and `session === null`; (b) cell W's mutation (omit `finishing = false`) then
  produces a genuine wedge that reddens W (the next swipe fails to reach `settle`); (c) §3 and §9-W state the
  same begin() behaviour for `finishing && !session`.

Non-blocking / already clean: F1 (resolved), F2 core (resolved), F3 (honest, Brunel confirms the
transition-clear), F4 (Curie confirms the ghost pane). G1/G2/G3 are non-vacuous as written.

## Prediction

Built as written, the crack opens at cell W. A builder implementing §3 literally writes
`if (finishing && paneOwning(session)) return;`; the `finishing = false` clear then guards a state the
narrowed gate already tolerates, so W passes green whether the clear is present or not. The coverage audit
(Mendeleev) reports W's mutation UNCAUGHT, or — worse — no one runs the mutation and a vacuous green cell
ships as proof of a wedge fix that was never load-bearing. The failure is silent because the gate is
genuinely correct for every state reachable in non-mutated code; only the mutation exposes the untested
corner, and §3 has quietly told the builder to make that corner harmless by a different route than the one W
checks. Pinning the gate to the negative form closes it.

```json
{"persona":"charpy","stage":"6c","round":2,"input_artifact":"9a331fc","verdict":"TEMPER","blocking_ids":["F5"],"return_to":"vitruvius"}
```
