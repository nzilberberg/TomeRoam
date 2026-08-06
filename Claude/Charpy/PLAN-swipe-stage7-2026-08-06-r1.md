# Charpy — PLAN-swipe-stage7.md, round 1

Type: plan-review
Artifact: `Claude/Plans/PLAN-swipe-stage7.md` (DRAFT, filed by the planner 2026-08-06)
HEAD at review: `79840d7b52359ec81cf4718d034a242dc286ea0b`, tree clean, suite 887 / 886 pass / 0 fail / 1 skip
Date: 2026-08-06

<!-- charpy-gate {"review_type":"plan-review",
  "patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":true,"contract_shape":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/app.js:346-374","js/app.js:398-431","js/app.js:497-558","js/app.js:1015-1086"],
  "callee_ranges":["js/browse.js:165-223","js/browse.js:245-248"]} -->

---

## Verdict

verdict: **TEMPER.** The plan's central claim holds — stage 7 really does collapse to the Browse
hold boundary, and I re-derived eight of the ten inheritance rows against HEAD myself rather than
accepting them. What does not hold is the plan's own verification machinery: its headline MEASURED
co-change list was measured from a transform narrower than the one §5 declares (measured here: 9
rotted registrations, not 1, before the mandated freeze adds 3 more), the release status has no
production consumer because the trace it names does not exist at HEAD, and the gate R7 leans on to
catch a half-landed §14 is made vacuous by the same commit's mandatory re-anchoring. Three fixes,
none of them a redesign; the scope determination survives intact.

---

## Applicability

| Pattern | Value | Reason |
|---|---|---|
| `defining_records` | **true** | The parent plan §3.5/§7, the two de-clone plans, the Engineering Contract, the PolicyLedger and the subsystem addendum all bear on the same boundary and were reconciled below. |
| `boundary_relocation` | **false** | No code moves between modules. `beginHold`/`endHold` stay in `js/browse.js`; the swipe wrappers stay in `js/app.js`. Only the interface between them is reshaped. Confirmed by reading both files at HEAD. |
| `callee_replacement` | **true** | `Browse.endHold` becomes `Browse.finishGestureHold` and `dropHold` gains the public entry `invalidateGestureHold`. Both carry observable effects beyond their signatures; the callee ranges are declared and their behaviour is traced below. |
| `contract_shape` | **true** | `js/browse.js:963-969`'s export object loses two names and gains one, and `finishGestureHold` gains a return value. The exact-key contract-gate reference is stated below (and F5 records that the plan's own reference to it dangles). |

**Declared-range completeness reason.** `js/app.js`'s changed surface is the hold wrapper pair
(`346-374`), the recovery release site (`398-431`), the acquire site inside the L3 adapter block
(`497-558`, which is also where §12's freeze lands), and the finalize release pair (`1015-1086`).
The Browse side is the reconciliation body (`165-223`) plus `dropHold` (`245-248`), which the plan
promotes to a public entry point and which the plan's §8 table describes; a review declaring only
`165-223` would leave the promoted function's own effects unchecked.

**Adapter-visible items, named so no check can pass by omission.**

- Session fields (`d.<field>` / `session.<field>`) crossing the declared ranges: `d.hold`
  (→ `d.lease`), `d.live`, `d.movers`, `d.scroll0`, `d.settleFrame`, `d.settleTimer`,
  `d.releaseListeners`, `d.id`, `d.tgt`, `d.dir`, `d.from`, `d.dest`, and the plan's proposed new
  `d.<status field>` (unnamed in the plan — see F2).
- `document.body.classList` mutation inside a declared range: `document.body.classList.remove('np-locked')`
  at `js/app.js:529` and `:551`. Unchanged by this stage; named because it sits inside declared range
  `497-558` and a silent change to it would otherwise pass unremarked.
- Callee `classList` tokens inside `js/browse.js:165-223`: `parked` (removed at `:183`, toggled at
  `:208`) and `hidden` (toggled at `:184`, added at `:209`). The plan's §8 names both. `dropHold`
  (`245-248`) touches **no** class token — it clears `holdRows`, bumps `holdGen`, clears
  `heldRepaints` and calls `VL.setScrollSuspended(false)`. This matters: the plan's §8 row for
  `invalidateGestureHold` says it performs none of the reconciliation effects, and that is correct
  at HEAD, including the scroll-suspension release, which `dropHold` does perform (`js/browse.js:247`).
- `removeAttribute('data-*')` pre-mount effect: **none exists** in any declared range at HEAD.
- Exact-key contract gate: `test/contract-function-gate.test.js`. It governs `Swipe.*` contract-object
  factories only (its `CONTRACT`/`NON_CONTRACT` classification is over the Swipe exports); it does
  **not** govern `js/browse.js`'s export object today. Verified by reading the gate. See F5.

---

## Defining records

| Record | Bears on | Call |
|---|---|---|
| `Claude/Plans/PLAN-swipe-reveal.md` §3.5 | the lease signature | **CONFLICT, correctly resolved.** §3.5 (`:424-429`) gives `finishGestureHold(lease, { visibleDescriptor, settledScrollY })` returning `{ status, ready: Promise }` with an `await paintBarrier()` after it. `paintBarrier` and `reveal(` occur **nowhere** in `js/` at HEAD. The plan's precedence ruling (source wins, plan-of-record amended) is sound. |
| `Claude/Plans/PLAN-swipe-reveal.md` §7 "DIAGNOSTICS RETAINED THROUGH MIGRATION" | whether the release status has a consumer | **CONFLICT the plan did not detect.** The clause names a structured trace "exposed as `Swipe.debugSnapshot()` / `Swipe.debugTrace()`". Neither identifier occurs anywhere in `js/`, `test/` or `tools/`, and none of the three `PBDebug.log('SWIPE', …)` lines (`js/app.js:399`, `:535`, `:699`) mentions the hold. The trace is a future deliverable, not a retained one. This is F2. |
| `Claude/Plans/PLAN-swipe-reveal.md` §7 stage-6 DEFERRED-to-7 clause | what stage 7 inherits | **CONFLICT with source, correctly resolved.** Re-derived independently below; the plan's determinations hold. |
| `PLAN-swipe-declone-stage2-subtraction.md` §14 | whether the two-part freeze is owed | **APPLIES.** §14's trigger text is exactly as the plan quotes it, and the second clause ("threads any new value to the settle path") does fire: the status is recorded on the session inside `returnLease`, called from `runFinalize` (`js/app.js:1026`). The plan's ruling is right. |
| `Claude/EngineeringContract.md` §4.15 | the status field | **CONFLICT with the plan's §7 U4 claim.** §4.15 reads "a real production consumer **and** a test proving that consumer uses it… A future stage is not a consumer." As §5 scopes the work, nothing in production reads the recorded status. This is F2. |
| `Claude/EngineeringContract.md` §4.21 | the `ready: Promise` refusal | **AGREE.** "Do not change a synchronous API into asynchronous for testing" is on point and the refusal is well-founded. |
| `Claude/Decisions/PolicyLedger.mjs` `PL-swipe-browse-fixed-ownscroll` | the `settledScrollY` refusal | **AGREE.** The entry exists (`:40`) and says exactly what the plan cites. `endHold` (`js/browse.js:165-223`) reads no scroll value; verified by reading the whole body. |
| `Claude/Subsystems/swipe-reveal.md` | the subsystem addendum | **GAP, correctly identified.** Not an authority for this design; scrub is already on the board as T-S7C. |
| `tools/mutate.mjs` (the anchor registry) | §11's co-change list | **CONFLICT.** The registry is the record §11 claims to have measured against; measured here it disagrees. This is F1. |

---

## What I re-derived myself, and whether it held

Eight of the ten inheritance rows assert an absence, which is the shape this campaign has been wrong
about. Each was checked against HEAD by reading the cited lines and by searching `js/`, `css/`,
`test/` and `tools/` for the named subject.

| Row | Claim | Re-derived? | Result |
|---|---|---|---|
| 1 | `F(release)` / the paint-gated pane release — subject deleted | yes | **HELD.** `holdGhostUntilPaintable`, `fadePanes`, `FADE_MS` occur in `js/` only as tombstone comments (`js/app.js:645`, `:708`). `cover.dropAt` is set unconditionally at `:1015`. `js/swipe.js:181-191` emits only `real-source`/`real-destination`. No `paintBarrier`, no `reveal(` anywhere in `js/`. |
| 2 | finalization plan — SPLIT | yes | **HELD.** The three-branch stack effect is inline at `js/app.js:702-706`; commit screen+scroll at `:1032`; abort at `:1038-1039`. `finalizationPlanFor` / `abortRender` survive only as tombstones (`js/swipe.js:19`, `:88`). |
| 3 | `sourceHost`/`destinationHost` built; `sameBrowseHost` subject deleted | yes | **HELD, with a wording caveat (F6).** Both hosts are projected at `js/swipe.js:111-114`, emitted at `:129`, consumed at `:240`/`:251`/`:260` and branched on at `js/app.js:511-513`/`:515-533`. `sameBrowseHost` is not emitted. |
| 4 | pane object + `dispose(reason)` enum — subject deleted | yes | **HELD.** `disposeOwnedPanes` and `dropPanes` occur nowhere under `js/`; `paneRemovalPolicy` occurs nowhere in the repo. |
| 5 | PANE-OWNING supersession — subject deleted | yes | **HELD.** `js/app.js:386-390` states the split has one side; `begin()`'s gate is the narrowed `if (finishing && !session) return;`. |
| 6 | `recoverSession` matrix — still deferred | yes | **HELD.** `recoverSession` occurs nowhere. Pre-stack recovery is inline at `js/app.js:398-431`; a throwing `runFinalize` clears only `finishing` (`:1077-1081`) and leaves the stack mutated. |
| 7 | I12 null-on-retire — partially built | yes | **HELD.** `s.releaseListeners = null` at `:330`; `settleFrame`/`settleTimer` cancelled at `:1055`/`:1060` and never nulled; the transitionend listener is `{once:true}` at `:1084` with no session handle; the invariant itself is unconditional at `:616` and `:1070`. |
| 8 | `.nav-ghost` production guard — subject deleted | yes | **HELD.** `resetSwipeStyles` (`js/nav.js:104-116`) takes no arguments, sweeps no class, and `keepGhosts` occurs nowhere in `js/`. `js/swipe.js:207-210` is a tombstone. |
| 9 | browse→home OUTGOING transform — premise inverted | yes | **HELD.** `js/swipe.js:181` fixes `outgoing = 'real-source'` as the only value, by design and by the anti-cloning gate's own account. |
| 10 | INCOMING real-`#browse` transform — premise inverted | yes | **HELD.** `js/swipe.js:188-191` renders the destination into `#browse` or the destination `.browsepage` and moves it as the incoming mover. |
| §3 footnote | 6h's fix deleted; 6g reverted | yes | **HELD.** `SETTLE_SCROLL_MIN` / `scrollSettle` survive only in `test/swipe-stage6i.test.js:142-166` and a `tools/mutate.mjs` comment. `css/app.css:190-197` records the `translateZ(0)` device flash of 2026-07-27 and the revert to `will-change: transform`. `test/home-layer-invariant.test.js` does not exist. |

**The scope determination is sound.** Stage 7 is the Browse hold boundary and nothing else. I found
no row where a live subject was written off.

---

## Callee behaviour across the replacement (`js/browse.js:165-223`, `:245-248`)

Read in full at HEAD. The plan's §8 table is accurate on the reconciliation body: the early return
(`:166`) is `token !== holdGen || !holdRows` — **two** conditions, and the second is what makes a
second call with a live token inert today, which is the idempotency the plan's §6 promises. The
order is flag-clear (`:167`) → scroll-suspension release (`:168`) → landed key (`:171`) →
deactivate loop (`:178-181`) → `parked`/`hidden` toggles (`:182-185`) → landed activate+realize
(`:189-190`), else the fallback branch (`:205-216`) → deferred-repaint replay (`:220-222`). Every
row of §8 maps to a real statement in that order. Nothing crosses that the plan's ledger omits.

`dropHold` (`:245-248`) sets `holdRows = false`, bumps `holdGen`, clears `heldRepaints` **and**
releases the scroll suspension. The plan's claim that promoting it to `invalidateGestureHold` is a
pure parity promotion is correct on the body. Note that it is idempotent only *observably*: it bumps
`holdGen` on each call, so two calls consume two generations. Nothing depends on generation
contiguity (`beginHold` returns `++holdGen`, so `0` is never issued), so this is sound — but the
plan's flat "Idempotent" should be read as "idempotent in observable effect", not in state.

**Non-throwing `keyFor` is correctly identified as a trap.** `js/browse.js:141-158`'s own comment
gives the reason and it checks out against `js/app.js:1077-1080`: a throw from the release path runs
inside the finalize `finally`, past `if (!ok) finishing = false;`, wedging every future swipe. The
plan's §5 protection of this is the right call.

---

## Findings

### F1 — §11's MEASURED co-change list was measured from a narrower transform than §5 declares, and step 5b's equality rule turns the gap into a halt

**Severity: Structural. Nature: defect.**

§11 states that applying the lease transform and running the anchors gate "reddens exactly one
registration", `#120 S2-20 LANDEDPAGESHOWS`, and §17 step 5b requires the builder's measured failing
set to **equal** that declared set, treating any larger set as a blast-radius miss that stops the
commit.

**MEASURED, not read.** I applied the transform in memory to a copy of `js/app.js` (the repo was
never written to; `git status` clean before and after) and re-ran the anchors gate's own predicate —
`readFile(file).includes(lf(part.from))` over `MUTATIONS` and each `m.also`, with the gate's CRLF
normalisation — against the transformed source. Control first: **0 rotted at HEAD with no transform.**

| Transform applied | Rotted registrations |
|---|---|
| **§12's probe as described** (`session.hold`, `Browse.beginHold`, `Browse.endHold` only), comments untouched | **1** — `#120` |
| §12's probe, identifiers renamed in comments too | 2 — `#18`, `#120` |
| **§5 as written** (adds `takeRowHold`→`takeLease`, `dropRowHold`→`returnLease`), comments untouched | **9** — `#14`, `#15`, `#16`, `#31`, `#53`, `#120`, `#126`, `#127`, `#144` |
| §5 as written, identifiers renamed in comments too | **10** — the nine above plus `#18` |
| **§12's freeze alone** (`Object.freeze(` on the `toMover` literal) | **3** — `#147`, `#148`, `#151` |

The §11 figure is reproducible **only** against the narrower transform in §12's probe table, which
does not rename the wrappers. §5 renames them. Both land in the same commit per §17's handoff line.
So the builder at step 5b measures at least twelve rotted registrations against a declared one, plus
the `test/swipe-declone-stage2-subtraction.test.js` fixture-sanity assertion whose anchor
`ADAPTER_DECL = 'const toMover = (m) => ({'` (`:211`) stops matching once the literal is frozen —
which §11 does not list either, in a file §11 does not name.

**What it costs if built as written.** Step 5b is R1's only mitigation and the plan's stated defence
against the failure it says four earlier passes committed. As written it fires on correct work at a
ratio of twelve to one. The recorded outcome for a gate that fires on correct work in this project is
that the gate gets switched off; the alternative outcome is a mid-build re-plan round.

**And the re-anchoring is not mechanical.** `#14`'s injected text (`FINALIZE_ORDER_TO`,
`tools/mutate.mjs:100-104`) contains `dropRowHold();`, as does `HARDRESET_DISPOSE_TO` and `#15`'s
`VR_IDENTITY_ORDER_TO`. After the rename those `to` strings inject a call to a function that no
longer exists. The anchors gate checks `from` only, so the mutant still *applies*; it then kills its
designated cell with a `ReferenceError` rather than with the ordering defect it names. That is the
"reddens for the wrong reason is indistinguishable from working" hazard this campaign already
recorded for `S2-23 NOGHOSTATALL`. The `to` sides need the rename too, and §11 does not say so.

**The invariant the plan must satisfy:** the declared co-change set is derived from the transform the
plan actually specifies, over every registry and reader the transform touches — not from a probe of a
subset. *Recommendation, not a requirement on shape:* either §11 absorbs the full measured set (and
§17 step 5b keeps its equality rule), or step 5b is re-scoped to the exact transform §11 measured and
a second declared set is measured for the rest. The plan's own R10 ruling — derive by executing —
already prescribes the method; what is missing is that it was executed on the wrong input.

Mapped to coverage: F1.

### F2 — the release status has no production consumer, because the trace it names does not exist at HEAD

**Severity: Structural. Nature: defect.**

§7's U4 check and §14's F1 both rest on this sentence: the status's consumer is "the retained
diagnostic trace that `PLAN-swipe-reveal.md` §7 requires to survive the migration". Measured:

- `Swipe.debugSnapshot` and `Swipe.debugTrace` occur **nowhere** in `js/`, `test/` or `tools/`.
- The three swipe trace lines at HEAD (`js/app.js:399`, `:535`, `:699`) log leftover-reset, start,
  and commit/abort. **None mentions the hold, the lease, or a release.**
- §5's scope for the consuming end is only that `returnLease` "reads the status and records the
  outcome on the session". §5, §13 and §17 nowhere require a trace line to be emitted.

So the trace is not *retained*; it would have to be *built*, and this stage does not build it. As
scoped, the status is written to a session field that no production code reads. Engineering Contract
§4.15 is not ambiguous on that case: "a real production consumer **and** a test proving that consumer
uses it… A future stage is not a consumer." Its temporary-field exception requires "the next
scheduled stage consumes or removes it"; §16 defers `recoverSession` with no scheduled stage and
explicitly calls the coupling "not a dependency".

The plan's own F1 concedes the shape ("whether the spirit is met is a
contract-interpretation question") but its premise — "a trace line is production code and the
harness records it" — asserts a trace line the stage does not produce. The harness does capture
`PBDebug.log` (`test/app-harness.js:632`), so the mechanism is available; it is simply not in scope.

**Note that the coverage cells do not close this.** `LEASEINVALID` asserts "the status the swipe
recorded is the invalidated one" — a test reading a session field. A test is not a production
consumer, and this review holds its own suggestions to the same rule.

**What it costs if built as written.** It ships the dead field at the exact seam this campaign exists
to keep clean — R4's own description, and the coordinate the coverage audit's forward read named as
the likeliest next externally-found defect.

Mapped to coverage: F2.

### F3 — R7's mitigation is made vacuous by the same commit's mandatory re-anchoring

**Severity: Structural. Nature: defect.**

§12 says "the gate's clause 3 already checks both directions and will redden if one half lands
without the other, which is what makes this cheap to get right", and R7's mitigation is "no new
mechanism is needed". Clause 3 (`test/swipe-declone-stage2-subtraction.test.js:670-701`) has two
assertions: `pinned === frozen` (the source assertion's `ADAPTER_DECL` must pin the wrapper), and
`registered === frozen`, where

```
registered = MUTATIONS.some((m) => [m, m.also].filter(Boolean)
  .some((p) => typeof p.from === 'string'
    && p.from.includes('Object.freeze(') && p.from.includes('toMover')));
```

The `pinned` half is sound. The `registered` half is not, once this commit lands. `#147`, `#148` and
`#151` all anchor on `'      const toMover = (m) => ({ el: m.element, base: baseOf(m.slot) });'` and
must be re-anchored to the frozen literal in the same commit (F1's table, third row). Their `from`
then contains **both** `Object.freeze(` and `toMover`, so `registered` is satisfied by the
re-anchoring alone — with no mutant that deletes the wrapper anywhere in the registry.

The gate's own comment records that it already produced one false positive by searching for
`Object.freeze(` without naming the adapter, and narrowed the search by co-occurrence with `toMover`.
That narrowing is exactly what this commit collapses: after the freeze, co-occurrence no longer
discriminates the wrapper-deletion mutant from the three key-set mutants that sit on the same line.

**What it costs if built as written.** §14's part 2 — the mutant that is the wrapper's only runnable
witness — can go missing with the whole suite green. §14's own text says neither half is sound alone,
and this is the half that would be missing. `MOVERFROZEN`'s cell does specify the mutant, so the
likely outcome is that it lands anyway; what fails is the plan's stated reason for believing it must.
The invariant: the freeze wrapper's deletion has a registered mutant **and** a check that can tell
that mutant apart from a re-anchored key-set mutant on the same expression.

Mapped to coverage: F3.

### F4 — §8's effects table names `LEASEPAIRED` as the witness for effects `LEASEPAIRED` does not assert

**Severity: Weak. Nature: defect.**

Three rows point at `LEASEPAIRED`:

- "clear the row-hold flag before anything else so a deferred repaint cannot re-defer" → `LEASEPAIRED cell`
- "release the virtual-list scroll suspension" → `LEASEPAIRED cell scroll suspension assertion`
- §7's ledger row `scroll suspension` → `LEASEPAIRED cell scroll suspension assertion`

The `LEASEPAIRED` cell as written asserts acquire count, release count, that every release presents
the current lease, and that a second release is a no-op, over four compositions — and its three
mutants are all acquire/release placement mutants. It declares no scroll-suspension assertion and no
flag-ordering assertion, and no mutant that would redden if either effect were dropped.

§8 exists so that "the body is unchanged" is a checkable claim rather than an assurance. For these
two effects it is currently an assurance with a citation attached. **Invariant:** every row of §8
names a cell that actually asserts that row's effect, with a mutant that removes it. *Recommendation:*
the cheapest correction is one added assertion and one mutant on `LEASEPAIRED` (the suspension is
released exactly once per gesture, and released on the invalidated path too), not a new cell.

Mapped to coverage: F4.

### F5 — the contract-gate reference dangles

**Severity: Weak. Nature: defect.**

The Applicability table says `contract_shape` is "Gated by the exact-key contract gate reference in
§6." §6 says the export object "is not a deep-frozen contract object, so
`test/contract-function-gate.test.js`'s exact-key check does not govern it today; **the migration in
§11 states which gate does**." §11 states no gate. Read as written, the chain terminates in nothing.

Verified: `test/contract-function-gate.test.js` classifies `Swipe.*` exports into `CONTRACT` /
`NON_CONTRACT` and does not reach `js/browse.js` at all. The gate that would actually govern the new
surface is `LEASECONTRACT` in §13 ("asserting the exported key set against an explicit list"), which
is adequate — the defect is the broken cross-reference, not a missing obligation. A reader following
the declared chain concludes the surface is ungated when it is not.

Mapped to coverage: F5.

### F6 — three of the four blocking questions are mis-assigned, and one is answerable now

**Severity: Note. Nature: recommendation.**

Detail in the rulings section below. In short: F2 (the plan's) is not independently rulable because
the plan bases its NEW POLICY classification on the reporting that F1 may remove; F3 (the plan's) is
by the plan's own account not answerable by reading, which is all this seat can do, so it is an
open-unknown owned by the adversary rather than a question for the plan reviewer; F4 (the plan's) is
answerable now and largely answered here.

### F7 — `sameBrowseHost` is a guarded refusal, not a deleted subject

**Severity: Note. Nature: defect.**

§3 row 3 and §16 place `sameBrowseHost` in the "no subject — must not be carried forward; a future
plan that revives one must first re-establish its subject" set. What exists at HEAD is different from
the other members of that set: `js/swipe.js:86-91` records a deliberate, reasoned refusal to emit the
field, and `tools/mutate.mjs:434-438` registers a **live** mutant that adds `sameBrowseHost: false`
to the frozen classification specifically so that a re-introduction reddens a no-dead-fields gate.
That is a defended absence with a witness, not a deleted concept. Flattening it into the same
category as `paneRemovalPolicy` (which occurs nowhere in the repo at all) loses the distinction that
a future plan would need. Incidental: that mutant's comment still says "STILL unconsumed until stage
6", which is now stale.

### F8 — §12's MOVERLIFETIMETRIGGER measurement shares F1's input defect; the ruling survives it

**Severity: Note. Nature: defect.**

§12's "the stage-7 shape" row applied the same narrow transform F1 identifies. The ruling is
nonetheless correct: the rename adds no assignment terminating at depth 1 on a mover-rooted
expression, and every mover-touching site in `js/app.js` (`:557`, `:578`, `:604`, `:617`, `:701`,
`:1083`) reads `m.el` / `m.base` or writes `m.el.style.…`, which the gate's discriminator explicitly
excludes. The positive control the plan reports is real and the negative is therefore evidence. The
second prose clause does fire. Recorded so the measurement gap is not repaired in §11 while §12
keeps the same unstated narrowing.

---

## Rulings on the plan's four blocking questions

**Plan-F1 — does a diagnostic required by the plan of record satisfy §4.15? BLOCKING, ANSWERABLE,
and the answer is determined by §4.15 rather than by interpretation.** The question as posed
presupposes a diagnostic that exists; it does not (finding F2). §4.15 requires a production consumer
in the same slice. **Ruling: ship the status only if this stage also emits it — one trace line in
`returnLease` reading the recorded status, and a cell asserting the harness records that line.** With
that, the letter and the spirit are both met and the plan's recommendation stands. Without it, take
the plan's own fallback and drop the status; do not ship a session field with no reader on the
strength of a trace scheduled for a later stage.

**Plan-F2 — rename or new policy? BLOCKING but NOT INDEPENDENTLY RULABLE; it resolves as a
consequence of F1.** The plan files it as NEW POLICY "on the strength of the reporting". If F1 takes
the fallback, the reporting is gone and what remains is a private function promoted to public with a
byte-identical body — a behaviour-preserving extraction plus a public-surface migration, i.e. a
**rename**, and the PolicyLedger entry must not be written. If F1 ships the status **with** its trace
line, the gesture learning the outcome of its own release is a genuine new observable and the NEW
POLICY entry is correct. **Ruling: conditional on F1 — one entry if the status ships with a
consumer, none otherwise.** The plan should state that dependency rather than presenting F2 as a free
choice.

**Plan-F3 — is the `LEASEPAIRED` exit set complete? GENUINELY BLOCKING, NOT ANSWERABLE AT THIS SEAT.**
The plan itself says the enumeration is a reading and that readings have been wrong eight times in
this campaign, every one found by executing. A plan reviewer can only read. **Ruling: re-classify as
an open-unknown owned by the adversary, whose strike is already step 2 of §17.** My own independent
walk of the exits, offered as a reading and nothing more: a live gesture's lease is released at
`js/app.js:427` (recovery, covering both supersession routes — `begin()`'s predicate at `:398` admits
`d` mid-drag and `finishing && session` while settling), at `:1026` (commit and abort), and at
`:1079` (throwing finalize). The two exits that release nothing — the vertical abandon at `:570` and
the armed end at `:591` — both precede or exclude `start()`, which is the sole acquire site (`:500`),
so neither can hold a lease. The one path that ends a live session without releasing is finalize's
stale guard at `:1070`, and it is correct precisely because the superseding `begin()` released first
at `:427`. I found no eighth exit; that finding is worth exactly what a reading is worth, which is
why the adversary step must stand and must not be treated as confirmatory.

**Plan-F4 — does the freeze disturb anything the adapter feeds? ANSWERABLE NOW, and NOT BLOCKING.**
Two halves. *Runtime:* nothing in `js/app.js` writes to a mover object after construction — every one
of the six mover-touching sites reads `.el`/`.base` or writes `m.el.style.…` — so `Object.freeze` on
the literal is behaviour-neutral in production, in a non-strict file where it would silence rather
than throw in any case. *Anchors:* measured above — `#147`, `#148`, `#151`, plus the
`ADAPTER_DECL` fixture-sanity reader. That is the same "exactly two tests" the subtraction pass
recorded, expressed as registrations. **Ruling: not a blocking question. It is a build-time
verification and §17 step 5b is its right home** — but its measured result must be folded into §11's
declared set (F1), not left inherited from another plan's §14.

---

## Coverage

Every blocking finding maps to what would witness it.

- **F1** → `tools/mutate.mjs` re-anchor set + `test/mutation-anchors.test.js`. The witness is the
  builder's step-5b probe run against the transform §5 declares, with the control-first method §12
  used. No new cell; the existing anchors gate is the instrument once the declared set is right.
- **F2** → `LEASEINVALID` and `LEASECONTRACT`. If the status ships, a cell must assert the
  **production trace line** carries the release reason (the harness's `PBDebug` capture,
  `test/app-harness.js:632`), not merely that a session field holds it. If the fallback is taken,
  `LEASECONTRACT` loses its status clauses and `LEASEINVALID` asserts over Browse's own state, as the
  plan's fallback already describes.
- **F3** → `MOVERFROZEN`, plus the `registered` half of clause 3 in
  `test/swipe-declone-stage2-subtraction.test.js:670-701`. The check must be able to distinguish the
  wrapper-deletion mutant from a re-anchored key-set mutant on the same expression.
- **F4** → `LEASEPAIRED`, which needs the scroll-suspension assertion §7 and §8 already cite it for,
  with a mutant that removes the release.
- **F5** → `LEASECONTRACT`'s exported-key-set assertion is the gate; the plan's §6/§11 cross-reference
  is what needs correcting, not the coverage.

---

## Prediction — where this breaks in execution if built as written

The builder renames the wrappers as §5 says, adds the freeze as §12 requires, runs step 5b, and gets
a failing set roughly twelve times the declared one. Step 5b's own rule then says this is a
blast-radius miss and the plan must be amended before the commit lands — so the build stops at its
last step and returns to the planner, having already written the code. That is the expensive place to
discover it. The second-order risk is worse: the equality rule is the sort of gate that, having fired
on correct work once, gets relaxed to "roughly equal" — and the next pass's genuine blast-radius miss
then rides through.

The status ships. Nothing reads it. It survives the code review because §5 says it feeds a trace, and
survives the coverage audit because `LEASEINVALID` asserts over it — a test consumer, which is
precisely the substitution §4.15 names and D6 forbids. It surfaces later as the dead field at the
seam, which is where the coverage audit's forward read already predicted the next defect would be
found, and it is found externally.

`MOVERFROZEN` lands with its mutant, so F3 probably costs nothing on this pass. What it costs is
later: the next person who reads §12 or R7 believes clause 3 guarantees the pairing, and removes the
wrapper's mutant in some future tidy-up with the gate still green.

The scope determination — the thing that would have been most expensive to get wrong, and the reason
this plan is small — holds. I could not break it.
