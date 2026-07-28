<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":["css/app.css:103-127"],"callee_ranges":[]} -->

<!-- NOTE: source_ranges holds only the single production change site (css/app.css). The plan
     relocates no code and replaces no callee (both false above), so no ownership ledger is owed.
     js/app.js and js/nav.js were READ for verification (a comment scrub + un-park/reset behaviour),
     not changed as code — they are cited inline in Defining records, not declared as moved ranges. -->

Type: plan-review

# Charpy — PLAN-swipe-stage6g (keep `#home` a stable compositing layer through the reveal)

Target: `Claude/Plans/PLAN-swipe-stage6g.md`, frozen at git HEAD **331f5f1**.
Reviewed: 2026-07-27. Read-only posture; no edit to the plan.

## Applicability

- **defining_records: true** — the plan reconciles seven records (the `.256` device A/B, the CSS, the
  app.js no-promotion comment, a saga dead-end, two test contracts, EC §4.19/§4.10, the plan-of-record).
  Reconciled in `## Defining records`.
- **boundary_relocation: false** — no data value's ownership crosses a new producer→consumer seam. One CSS
  declaration is replaced in place; one JS comment is scrubbed for truth. No ledger owed.
- **callee_replacement: false** — no callback/interface/indirection replaces a direct callee. Pure CSS +
  a comment. No callee-behaviour analysis owed.
- **contract_shape: false** — no classification/record/plan/state-output schema changes.

Project adapter `tomeroam-js-dom`: no `d.<field>` crossing, no `document.body.classList` mutation, no
callee `classList` token, no contract-shape key set is introduced by this plan — the adapter's checks
have no live subject here (a pure-CSS + comment slice), and that absence is itself verified, not assumed.

## The claim (what the plan says it will do)

Replace the live `.256` diagnostic probe (`css/app.css:109-115`, `#home { will-change: transform; }`)
with a permanent production rule `#home { transform: translateZ(0); }`. Because the rule is
unconditional, `#home` keeps a real, layer-promoting transform across the parked↔un-parked cycle, so
removing `.parked` at a reveal cannot demote `#home`'s compositing layer — which the build `.256`
device A/B confirmed is the mechanism of the home→books **abort** flash. New policy (EC §4.19): a scoped
reversal, for `#home` only, of the standing "no compositing promotion on the real in-flow views"
invariant. Pure CSS; one JS comment scrubbed; two coverage cells (PROMO source-text gate, REVEAL
integration); the flash itself is device-verified, not CI-verified.

I confirmed the central mechanism claim against the record: the `.256` A/B (memory
`tomeroam-swipe-repaint-saga`, "SPLIT RESULT") establishes that the home→books abort flash **is** the
`#home` un-park demote and that a permanent promotion made it clean — one variable changed. The fix
addresses that confirmed cause. The commit books→home flash is correctly excluded as a different,
still-open cause (§10).

## Defining records

**Verdict on the set: AGREE on the fix and the classification; ONE finding — the plan's own
load-bearing promise over-states its scope against code the plan lists as unchanged.** The records the
plan reconciles do not conflict with each other; the crack is between the plan's §3 promise and the
real reveal surface, not between two records.

Grounding I performed against HEAD 331f5f1 (each claim struck against the thing itself, not plausibility):

- **`css/app.css` 103-115 — VERIFIED.** `#home.parked` (103-108) carries `transform: translateX(-101vw)`
  + `will-change: transform`. The diagnostic probe is exactly `#home { will-change: transform; }` at line
  115 under a REVERT-after-test comment (109-114). Specificity is as the plan relies on it:
  `#home.parked` (1,1,0) beats base `#home` (1,0,0), so the parked transform wins while parked and the
  base rule applies when un-parked — cascade holds by construction, order-independent.
- **`js/nav.js` — VERIFIED.** `setView` un-parks via `$('home').classList.toggle('parked', v!=='home')`
  (57). `resetSwipeStyles` (102-108) sets `el.style.transform=''` (INLINE clear, cascades to the
  stylesheet — never `'none'`). `applyScreen` (116-142) calls it at the reconcile point.
- **`js/app.js` — VERIFIED.** The "Deliberately NO will-change on the real in-flow views
  (#home/#browse) … a 'pop' at swipe start" warning lives at **552-554 only**. `showAppView` un-parks
  `#home` (482). Finalize clears movers' inline transform to `''` (775) — never `'none'`. There is **no
  inline `transform:none` write to `#home` anywhere** in the reveal/finalize/reset paths — the only
  inline writes are `translateX(...)` (drag) and `''` (reset/finalize). The plan's inline-safety claim
  holds.
- **`test/swipe-invariants.test.js` I5 (277-290) — VERIFIED.** Asserts `#home.style.transform`,
  `.transition`, `.willChange` are all `''` after a settled swipe — INLINE reads. A stylesheet
  `translateZ(0)` does not touch inline style, so I5 stays green. The in-file mutation note confirms it
  pins the inline OUTCOME. **The plan's decisive stylesheet-not-inline argument is sound.**
- **`test/swipe-stage6f.test.js` (40-46, 143-164) — VERIFIED.** The scope comment states the standing
  `#home.parked` STYLESHEET transform "is not an inline style and does not appear here"; SIhome reads
  `#home.style.transform`. A stylesheet `translateZ(0)` is equally invisible to those inline reads. Green.
- **Containing-block safety — VERIFIED.** `.alphaindex` is created into `#browse` (`js/browse.js:820`,
  read at `browse.js:435`), not `#home`. `#home` (index.html:48) is a permanent `.view` whose content is
  home carousels; no `position:fixed` descendant of `#home` resolves against the viewport (the
  navbar/`#player`/`#nowplaying`/toasts/sheets are outside `.app`). Per the CSS Will-Change spec,
  `will-change: transform` already establishes the same containing block + stacking context as an actual
  transform, so the `.256` probe exercised exactly this side-effect axis on device with no strip/fixed
  breakage. The plan's grounding here is correct and empirically backed.
- **NEW POLICY / no-PolicyLedger classification — VERIFIED sound.** EC §4.19 new policy; the source gate
  is GREEN on the shipped form (not a known-red), so no PolicyLedger known-red entry is owed — the
  DecisionLog + subsystem record carry it. Correct reading of §4.19/§4.10.

## Verdict

**TEMPER.** The fix is correct and its device evidence is sound: the CSS rule genuinely eliminates the
demote on the device-confirmed home→books abort path, is stylesheet-form so the test contracts stay
green, and is containing-block-safe. Do not change the CSS. But the plan's **load-bearing promise (§3)
over-states its own scope**: it asserts a `transform: none` frame on `#home` is "impossible by
construction … non-none in every state," and hands Loki an enumeration of the only two ways to defeat
the base rule — and that enumeration is incomplete. A third, reachable path exists in code the plan
itself lists as unchanged. The promise and the Loki handoff must be restated to the accurate, narrower
guarantee before the plan proceeds. This is a tightening of the claim, not a redesign of the fix.

## Findings

### F1 — Structural (defect) — The §3 promise ("impossible by construction, in every state") is falsified by a reachable state the enumeration omits: the `nav-in` slide animation resolves `#home`'s transform to `none`

§3 states the promise as absolute: *"a demote frame on `#home` is impossible by construction … `#home`'s
computed `transform` is a persistent, layer-promoting, non-`none` value in every state (translateX
parked; translateZ un-parked; inline translateX mid-drag; back to translateZ when inline clears)."* It
then tells Loki the **only** ways to defeat the base rule are **(a)** an inline `transform:none`/`''`→none
write and **(b)** a more-specific rule setting `transform:none`.

Struck against HEAD, the enumeration is incomplete — there is a path **(c): a CSS keyframe animation
whose value resolves `#home`'s transform to `none`.** Verified:

- `#home` carries class `view` (`index.html:48`). The button-nav slide animations select it:
  `.view.nav-in-right`/`.view.nav-in-left` (`css/app.css:125-126`) run `@keyframes navInRight/navInLeft`
  (123-124), whose final keyframe is **`to { transform: none; }`**, with `animation-fill-mode: both`.
- `#home` is animated by this on a reachable path: `goBack()` (`js/app.js:151`) **unconditionally** calls
  `slideInView(viewElFor(d.v), 'left')`, and `viewElFor('home')` returns `#home` (`js/nav.js:39`). Concrete
  sequence: bottom-nav to Books, then on-screen Back → `goBack()` → `applyScreen({v:'home'})` (un-parks
  `#home`) → `slideInView(#home,'left')` → `#home` gets `.nav-in-left` → its transform animates
  `translateX(-100%) → none`, then fill-`both` HOLDS `none` until the `animationend` listener
  (`js/nav.js:151`) removes the class. (`navTo(desc, anim)` at `app.js:144` is the forward twin, though
  the bottom-nav Home tab passes `anim=null` and does not animate.)

At the animation's `to`/fill frame, `#home`'s computed `transform` is `none` — regardless of the base
rule (an animated value overrides the base declared property). So "non-none in every state" is literally
false, and "the only ways to defeat the base rule are (a) and (b)" omits the animation.

**Calibration (D4 — tightest correct bound).** This is NOT a claim that the fix re-introduces a flash.
The opposite: during the animation `#home` is composited by the running transform animation, and at
`animationend` the class is removed and `#home` reverts to the base `translateZ(0)` — so with the fix the
slide-in **ends composited** rather than on `none` (today, without the fix, it ends on `none`). The fix
does not worsen this path; it improves it. Whether the transient fill-`none` frame demotes is off-main-
thread, device-only, and unknowable from reading — which is precisely why the plan must not assert
"impossible by construction."

**Why blocking.** The §3 promise is the plan's load-bearing artifact: the coverage cells, the DecisionLog
entry, and the subsystem-record text (§9) all encode it, and Loki is handed it **blind to the rationale**.
As written, one of two bad gate outcomes follows: (1) a thorough Loki drives `goBack`→home, observes the
`none` frame, and files a legitimate fracture against the literal "impossible" promise — the plan bounces
back late, at the gate, which is the expensive failure this seat exists to move upstream; or (2) Loki
trusts the (a)/(b) enumeration, never checks the animation, and falsely clears an over-broad promise —
and the false "by construction / in every state" absolute lands in HEAD records as truth
(StandardsDocument §5.3/§6.2 accuracy). The saga's headline lesson governs here: every prior draft of a
swipe plan "contained a confident error about code I had already read"; an absolute structural claim
falsified by unchanged code is exactly that class.

**Required to clear (planner's work — Charpy does not rewrite):**
1. Restate the §3 promise to the accurate, load-bearing guarantee: *no un-park / reveal transition
   (removing `.parked`) can leave `#home` on `transform: none` — the base `translateZ(0)` holds across the
   parked↔un-parked cycle.* Drop the absolute "impossible by construction / non-none in every state"
   language, or explicitly bound it to the parked↔un-parked reveal cycle.
2. Account for path (c) explicitly: name the `navInLeft`/`navInRight` slide-in (reachable via
   `goBack`/`navTo`) as a state where `#home`'s transform resolves to `none`, and state why it is not a
   demote the fix must prevent (the running transform animation composites `#home` throughout, and
   `animationend` reverts it to the base `translateZ(0)`).
3. Add (c) to the fracture set handed to Loki in §3, so the adversary verifies the accurate promise
   against the complete set of override paths (inline write; more-specific rule; keyframe animation).
4. Sweep the siblings of the corrected claim (D5): §1 row 2 ("no reveal path on which it becomes none"),
   §4 (Pure-CSS reasoning), §5 HOLD/MUTATE ("in every case the transform stays non-none"), §7 the
   Composition row ("reasons over all three states" — there are four), and §8 PROMO's "no cascade
   resolution lands `#home` on transform none across parked and un-parked" wording must all state the
   narrower guarantee, not the absolute one.

### F2 — Weak (defect) — Stale source citation: the "no-promotion / navbar-pop" warning is at `js/app.js:552-554` only; line 364 carries no such warning at HEAD

§1 (row 3), §2, and §9 cite the warning as *"552-554 comment; and 364"* / *"552-554, and the 364
warning."* At HEAD 331f5f1, `js/app.js:364` is the `disposeOwnedPanes` PBDebug log line; the
`grep` for `pop|will-change|nudge|navbar` returns the warning **only** at 552-554. The "364" reference is
a stale line number carried from an earlier build (the saga memory cites `app.js:364` from a prior
build; the code has since shifted the warning to 552-554). The scrub target 552-554 is correct and
present, so harm is low — but a plan required to be grounded at HEAD must not send the maker to a phantom
second site. Drop the "(and 364)" references in §1/§2/§9; the sole scrub target is 552-554.

### Notes (non-blocking; recorded, not requiring change)

- **N1 (advisory — verified sound).** The two grounded decisions hold up: `translateZ(0)` over
  `will-change` (a droppable hint vs a forced persistent layer — correct, given the saga's intermittent-
  flash trauma) and permanent over scoped (a scoped release must demote a visible `#home` → the flash
  returns — correct). The side-effect-identity argument (will-change establishes the same containing
  block/stacking context per spec, so `.256`'s device validation transfers to `translateZ(0)`) is
  correct. Shipping the untested-on-device form is acceptable given spec-identity + the device backstop +
  the `will-change` fallback; I agree it need not ship `will-change` first.
- **N2 (advisory — verified sound).** The decision that the flash is NOT a CI cell is correct and
  honestly stated: iOS compositing is off the main thread (the saga's rAF frame detector was invalid for
  exactly this reason) and jsdom cannot compute a stylesheet transform. PROMO (source-text gate, correctly
  separated into `SOURCE_TEXT_GATES`, non-vacuous — its mutation reddens the source gate) and REVEAL
  (integration un-park via the app-harness, non-vacuous, honestly disclaims it does not prove compositing)
  are adequate for the confirmed scope. No third cell is owed: nothing writes inline `none`, and I5
  already guards leftover inline styling. (PROMO's "reasons over all three states" wording is swept by F1
  step 4, not a separate finding.)
- **N3 (recommendation, hedged).** The `mutate.mjs` "may be JS-only, extend it to target `css/app.css`"
  flag (§9) is honest and correctly a maker grounding task, not a plan defect. It may be worth having
  Brunel confirm the css-file mutation target before Curie wires PROMO into the sweep, so a source gate
  is not registered against a mutator that cannot reach its file — but this is a build-time verification
  the plan already flags, not a blocker.
- **N4 (recommendation, hedged).** Deferring the now-redundant `#home.parked { will-change: transform }`
  (css:107) as an optional cleanup is a defensible narrow-scope call (EC §4.21). Fine to leave; fine to
  fold in at the maker's/Poirot's discretion as the plan already permits.

## Coverage — blocking findings mapped

- **F1 (Structural, blocking)** → the plan's §3 (promise + Loki fracture set) plus its D5 siblings §1
  row 2, §4, §5 HOLD/MUTATE, §7 Composition row, §8 PROMO wording. Cleared when the promise is restated
  to the parked↔un-parked-reveal scope, path (c) is accounted for, the Loki enumeration includes the
  keyframe-animation path, and every sibling states the narrower guarantee.
- **F2 (Weak, non-blocking)** → §1 row 3, §2, §9: remove the stale "364" citation.

No blocking finding rests on an untested assumption: every claim above was struck against HEAD 331f5f1
source. The one assumption I did not (and cannot) test — whether the transient animation fill-`none`
frame visibly demotes on device — is named as an open compositing unknown that is device-only by
construction, and is the reason F1 requires the promise to stop claiming "impossible," not the reason it
requires a code change.

## Prediction (where it breaks in execution if built as written)

Built as written, the CSS ships correctly and the confirmed abort flash goes clean on device — the fix
itself will not fail. The break is at the **Loki gate**: handed the absolute §3 promise blind, the
adversary either files the `goBack`→home `navInLeft` `to:none` frame as a fracture (a correct strike
against a literal "impossible," bouncing the plan back to the planner after the build has already landed
and the campaign manifest expects a clean verdict), or misses it against the (a)/(b) enumeration and
clears a promise that is false — writing "no reveal path can leave `#home` on `transform:none`" into the
DecisionLog and subsystem record as HEAD truth over a reachable counterexample. Tightening the promise to
its true scope now, in the rig, costs a paragraph; discovering it at the gate costs a gate cycle, and
discovering it in the records costs a future reader who trusts them.

---

Verdict: **TEMPER**
