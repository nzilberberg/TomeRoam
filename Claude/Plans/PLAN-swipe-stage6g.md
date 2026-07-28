# PLAN — Swipe/reveal Stage 6g (keep `#home` a stable compositing layer through the reveal, so un-parking it cannot demote → eliminates the home→books ABORT flash)

Type: plan

<!-- vitruvius-gate {"plan_type":"refactor","patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},"project_adapter":"tomeroam-js-dom","source_ranges":["css/app.css:103-115"],"callee_ranges":[],"affected_contracts":["test/home-layer-invariant.test.js:1","tools/mutate.mjs:1","test/mutation-anchors.test.js:1"],"staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Decisions/DecisionLog.md","Claude/Plans/PLAN-swipe-reveal.md"],"blocking_questions":["PROMO","REVEAL"]} -->

Status: **PLAN_READY.** This formalizes the FIRST device-confirmed reveal fix in the swipe saga (build `.256`
controlled A/B) into a production-correct, reviewed change. Grounding against the real CSS, JS and test harness
resolved the one real production-form tradeoff (translateZ(0) vs will-change; permanent vs scoped) without a
user fork, so no escalation is owed — the design is stated below with the one device-verification watch item
that the eyeball-A/B cannot settle. Hand to Charpy.

## Index
1. Defining records and authority (incl. the invariant this slice deliberately reverses for `#home`)
2. Exact scope boundary (what changes, what stays, what is deferred)
3. The load-bearing promise and the single fracture for Loki
4. The production form — the two grounded decisions and why
5. Lifecycle-ownership section (the compositing layer) and runtime-dependency policy
6. Ordering (the cascade invariant)
7. Coverage Model (Mendeleev catalog)
8. Coverage and mutation matrix
9. Records reconciliation (apply on approval) + device-verification obligation
10. What this does NOT do (deferred, with reasons)
11. Sequencing and handoff

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **boundary_relocation: false** — no data value's ownership crosses a new producer→consumer seam; nothing
  moves between modules. A single CSS declaration is replaced in place.
- **callee_replacement: false** — no callback/interface/indirection replaces direct logic.
- **contract_shape: false** — no classification, record, plan, or state-output schema changes.
- **state_transfer: false** — no runtime resource's ownership crosses a seam.
- **async_change: false** — no async surface, timer, rAF, or continuation changes; the reveal hold, the
  settle rAF, and the finalize timers are all untouched.
- **persistence_migration: false** — no persisted shape; CSS is static.
- **lifecycle_ownership: true** — the subject IS the lifecycle of `#home`'s browser compositing layer: today
  the layer is CREATED when `#home` is parked (`will-change`/transform) and DESTROYED when `.parked` is
  removed at the reveal (the demote that flashes). This slice changes the layer's lifecycle to permanent —
  created unconditionally and never released across the parked↔un-parked cycle — so the reveal cannot demote
  it. §5 names create / hold / release / dispose / endpoint for that layer.

## 1. Defining records and authority

**Verdict: AGREE on the fix; ONE documented invariant is deliberately reversed for `#home` and is classified
NEW POLICY (EC §4.19).** The device A/B settled the target; the only reconciliation is the standing
"no compositing promotion on the real in-flow views" invariant, which this slice scopes an explicit
exception into for `#home`.

| Record | What it says | Authority | This plan | On approval |
|---|---|---|---|---|
| Saga refinement 2026-07-27 + build `.256` controlled A/B | `#home.parked` is a composited layer; removing `.parked` at the reveal DEMOTES it → iOS re-rasters → the home→books ABORT flash. A permanent promotion on `#home` (probe `#home { will-change: transform }`) made that flash CLEAN, one variable changed. | Device measurement (strongest evidence in the saga) | Realizes that exact fix in production form: keep `#home` a stable compositing layer THROUGH the reveal so removing `.parked` cannot demote it. | — (this plan IS the formalization) |
| `css/app.css` `#home.parked` (103-108) + the DIAGNOSTIC probe (109-115) | Parked `#home` promotes via `will-change: transform` + `transform: translateX(-101vw)`; un-parking drops BOTH → demote. The probe `#home { will-change: transform; }` is a temporary diagnostic, marked REVERT-after-test. | Code under change | Replace the diagnostic probe with the PRODUCTION form: an unconditional `#home { transform: translateZ(0); }` base rule (§4). The parked rule is left intact (its own `translateX` transform keeps the layer while parked). | Replace lines 109-115 (§9) |
| `js/app.js` "Deliberately NO will-change on the real in-flow views (#home/#browse) — promoting them to a layer can nudge the iOS fixed navbar" (552-554); the `tomeroam-js-dom` adapter (F) "no-promotion-on-real-panes invariant" | Do not promote the real in-flow views to a compositing layer — it risks a fixed-navbar "pop". | Subsystem invariant (code comment + plan-gate adapter) | **Deliberately reversed for `#home` only.** The `.256` A/B ran with `#home` permanently promoted and the navbar did NOT pop (device-confirmed narrowly: a probe-introduced pop would be visible with the probe live, and it is not). `#browse` stays governed by the invariant (its incoming-transform flash is deferred, §10). Classified NEW POLICY (EC §4.19): a scoped, device-justified exception for `#home`. Note the base `translateZ(0)` guarantees no DEMOTE on the un-park REVEAL path; a `nav-in` slide animation still resolves `#home` to `none` transiently at its end frame (benign, non-reveal — §3). | Update the app.js:552-554 comment to record the `#home` exception; update the subsystem contract; append DecisionLog (§9) |
| Saga DEAD-END `.195`/`.196` (permanent transform on `#browse` broke `.alphaindex`) + trap T7 (inline beats stylesheet) | A permanent transform on a real in-flow view makes it the containing block for its `position:fixed` descendants; `.alphaindex` (the A–Z strip) is such a descendant OF `#browse`, and broke. Inline transforms beat stylesheet ones. | Saga (measured) | Grounded as NOT applicable to `#home`: `.alphaindex` lives in `#browse`, not `#home`; `#home` has no `position:fixed` descendant that resolves against the viewport (the navbar/`#player`/`#nowplaying` are OUTSIDE `.app`, so `#home` becoming a containing block cannot capture them). The `.256` probe (`will-change: transform`, which per the CSS Will-Change spec creates the SAME containing block as an actual transform) ran on device with no reported strip/fixed-descendant breakage — empirical confirmation that the containing-block effect on `#home` is benign. The production form is a STYLESHEET rule, not inline, so trap T7 does not apply. | — |
| `test/swipe-invariants.test.js` I5 (277-290): after a settled swipe no real view carries an inline `transform`/`transition`/`will-change`; `test/swipe-stage6f.test.js` (44-46, 145-161): the real `#home` carries NO inline swipe transform mid-drag; `#home.parked`'s STYLESHEET transform is explicitly noted as not confounding those inline reads | The existing suite asserts only INLINE styles on `#home`; the standing `#home.parked` stylesheet transform is already known not to confound them. | Test contract (compatibility) | UNBROKEN by construction: the production form is a STYLESHEET rule (`#home { transform: translateZ(0) }`), so `#home.style.transform` stays `''` after a gesture (I5 green) and the mid-drag inline read (6f) is unaffected — exactly as `#home.parked`'s stylesheet transform already is. This is the decisive reason the form is stylesheet, not inline. | — |
| `EngineeringContract.md` §4.19 (parity vs policy), §4.10 (mutation verification; SOURCE_TEXT_GATES separation) | Classify every change; a source-text gate must be separated from behavioral sweeps and must not claim it caught runtime behavior. | Core rule | Classified NEW POLICY. The invariant is pinned by a SOURCE-TEXT gate over `css/app.css` (§8 PROMO), explicitly separated into the source-text sweep and explicitly NOT a runtime-compositing proof. No known-red is introduced (the new gate is GREEN on the shipped production form). | Register the mutation + gate (§9) |
| `PLAN-swipe-reveal.md` §7 step 6 + the saga "THE STRUCTURAL FIX" | Never transform/demote the real in-flow view; swap the real view invisibly. | Plan-of-record (strategic) | This is the REVEAL-side complement for `#home`: rather than swapping the view, keep its layer permanently alive so no demote frame can exist. The outgoing/incoming `#browse` transform families remain deferred (§10). | Annotate §7 step 6 with the 6g slice (§9) |

Authority precedence: the device A/B governs THAT the fix works and is the load-bearing evidence; EC §4.19
governs the NEW-POLICY classification and the reversal record; the test contracts (I5, 6f) govern that the
form must be a STYLESHEET rule; the CSS Will-Change spec + the `.256` probe govern that the containing-block
side effect is benign on `#home`.

## 2. Exact scope boundary

Behavioural ownership, not line numbers.

**Changes (production):**
- **`css/app.css` (109-115), replace the diagnostic probe with the production form.** Remove the temporary
  `#home { will-change: transform; }` diagnostic block and its REVERT comment. Add an unconditional base rule
  `#home { transform: translateZ(0); }` with a production comment stating: `#home` is permanently promoted to
  its own compositing layer so that removing `.parked` at the reveal cannot demote it (the home→books abort
  flash); a real `translateZ(0)` (not the droppable `will-change` hint) so the layer is never reclaimed under
  memory pressure; device-confirmed navbar-safe (`.256` A/B). Net CSS effect: `#home`'s computed `transform`
  is a persistent non-`none` value across the static `#home` cascade — `translateX(-101vw)` while parked (the more-specific
  `#home.parked` rule wins), `translateZ(0)` when un-parked (the base rule) — so there is no reveal path on
  which it becomes `none`.

**Changes (records-truth, not behaviour — flagged in §9, NOT applied by this plan):**
- **`js/app.js` (552-554 comment).** Update the "Deliberately NO will-change on the real in-flow views
  (#home/#browse)" comment to record the scoped `#home` exception (permanently promoted via a stylesheet
  `translateZ(0)`, device-confirmed navbar-safe; `#browse` remains un-promoted). No code changes; the comment
  is describing HEAD truth (StandardsDocument §6.6).

**Stays exactly as today (do NOT re-touch):**
- **`#home.parked` (103-108).** UNCHANGED. Its own `transform: translateX(-101vw)` already promotes and
  positions the parked layer; it overrides the base rule while parked (specificity `#home.parked` > `#home`).
  Its `will-change: transform` is now strictly redundant (a real transform already promotes) — noted as an
  optional venustas cleanup, NOT taken in this slice to keep the change surgical (§10).
- **`js/nav.js` `setView` un-park (57), `resetSwipeStyles` (102-108), `applyScreen` (116-142).** UNCHANGED.
  `resetSwipeStyles` sets `#home.style.transform = ''` (clears INLINE), which falls back to the stylesheet —
  now `translateZ(0)` when un-parked — so it never lands `#home` on `none`. The un-park removal of `.parked`
  is the very transition the production form protects; it needs no coordination.
- **`js/app.js` `showAppView` (482-483), the mid-drag mover parking (555), the transform clears (775), the
  reveal hold `holdGhostUntilPaintable` (commit→home path, 1171-1176), `dropPanes`, `fadePanes`.** UNCHANGED.
  During a drag `#home` (as a mover) carries an INLINE `translateX(...)` (non-`none`); on finalize the inline
  clears to `''` → stylesheet `translateZ(0)` — the layer is continuous throughout.

**Split across the seam:** none. Single CSS declaration replaced; one JS comment scrubbed for truth.

**Deferred (§10 expands):** the commit books→home flash (a DIFFERENT cause — the home-snapshot pane teardown,
still flashes WITH the `.256` probe, so it is NOT the un-park demote; its own controlled experiment); the
incoming-`#browse` headline flash (T8-forked); the outgoing-`#browse` transform on →home (the abandoned
Option-A direction — superseded, not needed for the felt flashes).

## 3. The load-bearing promise and the single fracture for Loki

**The load-bearing promise (single, SCOPED to the reveal).** *No un-park / REVEAL transition — any transition
that removes `.parked` from `#home` to make it the active view — leaves `#home` on `transform: none`. The base
`translateZ(0)` holds across the parked↔un-parked cascade, so the reveal cannot demote `#home`'s compositing
layer.* Concretely: the static rule cascade over `#home` is `{ #home { transform: translateZ(0) }, #home.parked
{ transform: translateX(-101vw) } }`; the parked rule (more specific) wins while parked, the base rule applies
the instant `.parked` is removed, and the inline mover transform during a drag is `translateX(...)` (cleared to
`''` → stylesheet on reset). Across that cascade `#home`'s transform is never `none`, so removing `.parked` at
a reveal produces no demote frame, so iOS does not re-rasterise the view.

**⚠️ The promise is NOT "non-`none` in every state" — that absolute is false, and stating it would mis-aim the
blind Loki.** `#home` carries class `view`, and a NON-reveal path resolves its transform to `none` by design:
`navTo(desc, anim)` (app.js:144) and the unconditional `goBack()` (app.js:151) call `slideInView(viewElFor(
'home'), …)` (nav.js:39/145), which adds `.nav-in-left`/`.nav-in-right`; those keyframes (app.css:123-124) END
at `to { transform: none }` held by `animation-fill-mode: both`. Reachable: bottom-nav to Books, then on-screen
Back → `#home` slides in via `nav-in-left` and its computed transform resolves to `none` at the animation's end
frame, until `animationend` removes the class (nav.js:151) → it reverts to the base `translateZ(0)`. **This is
BENIGN and NOT a flash regression:** it is a navigation ANIMATION (not the swipe un-park reveal), the running
animation itself composites `#home` throughout the slide, and it reverts to `translateZ(0)` at `animationend` —
strictly BETTER than today, where the same slide ends on `none` with no base transform to revert to. The slice
neither introduces nor worsens this path; the promise simply does not (and must not) claim to cover it.

**Basis (U11).** A device-confirmed correctness fix (the `.256` A/B), realized as a STRUCTURAL guarantee over
the REVEAL cascade (an unconditional base rule the un-park falls back to) rather than an enumerated defense:
the promotion is not "added at the reveal" (a place that can be missed) — it is a property `#home` always has
in its static cascade, that `.parked` temporarily re-expresses as an off-screen transform. Certification is
epistemic, not absolute: the base rule guarantees no DEMOTE frame on the un-park path; it does not (and is not
claimed to) make `#home`'s transform non-`none` under every animation the app can run. The choice of
`translateZ(0)` over `will-change` and of PERMANENT over SCOPED are the two design decisions, grounded in §4.

**The single fracture Loki attacks (with the known-benign path handed over, not hidden).** The promise fails
iff some **un-park / reveal** transition leaves `#home` on `transform: none` (a demote frame at the reveal).
The base rule is unconditional, so the only ways to defeat it on a reveal path are (a) an INLINE `transform:
none`/`''`-to-`none` write on `#home` at the reveal (grep the reveal/finalize/reset paths: the only inline
writes are `translateX(...)` during a drag and `''` on reset — `''` falls back to the stylesheet, never
`none`), or (b) a MORE-specific static rule setting `#home` transform to `none` in the un-parked state (there
is none). Loki's strike: drive the real reveal that lands on home (a home→books ABORT snap-back — the exact
device scenario) and any other reachable `applyScreen({v:'home'})`/gesture un-park path, and find a phase where
`#home`'s effective transform resolves to `none` at the reveal.

**Handed to Loki explicitly (so a blind strike does not false-clear or bounce on it):** the `nav-in`
slide-animation path above DOES resolve `#home`'s transform to `none` at its end frame, but it is a NON-reveal
navigation animation and is OUT of the promise's scope — it composites during the slide and reverts to
`translateZ(0)` at `animationend`, so it is not a reveal demote. A strike that lands on the `nav-in` end frame
has found the accounted-for benign path, not a fracture of the reveal promise.

**⚠️ The promise is STRUCTURAL; the flash is DEVICE-confirmed, not CI-confirmed.** No CI cell asserts the
flash is gone — iOS compositing/rasterisation is off the main thread and invisible to the harness (saga: the
rAF frame detector was invalid for exactly this reason), and jsdom cannot compute a stylesheet `transform`.
CI pins ONLY the structural invariant (§8 PROMO: `#home` always carries a persistent non-`none`
layer-promoting transform in source; REVEAL: the real reveal path is the parked→un-parked transition the
invariant protects). That the eliminated demote WAS the home→books abort flash is established by the `.256`
device A/B and re-verified on device after this ships (§9), NOT by a green suite.

## 4. The production form — the two grounded decisions and why

The `.256` probe used a bare permanent `will-change: transform`. That is a DIAGNOSTIC; two decisions turn it
into the production form.

**Decision 1 — `transform: translateZ(0)`, NOT `will-change: transform` (reliability).**
- `will-change: transform` is a HINT the browser MAY drop under memory pressure. If dropped while `#home` is
  un-parked with no actual transform, the layer demotes and the flash returns — INTERMITTENTLY. The saga's
  entire trauma is intermittent, hard-to-reproduce visual bugs; a droppable promise is precisely the failure
  mode to avoid.
- `transform: translateZ(0)` is a REAL, non-`none` transform: it forces a persistent compositing layer that
  is not a droppable hint, and — because the parked state also uses a real transform (`translateX`) — `#home`
  carries a genuine non-`none` transform CONTINUOUSLY across the whole parked↔un-parked cycle. The layer is
  kept alive by construction, not by a hint the compositor may revoke.
- Side effects are IDENTICAL to the device-tested `will-change` form, so the `.256` confirmation transfers:
  per the CSS Will-Change spec, `will-change: transform` already establishes the same containing block and
  stacking context that an actual transform does. So the containing-block behaviour (the `.195`/`.196` failure
  axis) and the navbar-pop axis were BOTH exercised on device by the probe and found benign; `translateZ(0)`
  does not introduce a new side effect over what `.256` already validated.
- The one axis where they differ is exactly the one that favours `translateZ(0)`: persistence.

**Decision 2 — PERMANENT promotion, NOT scoped to the reveal window (correctness + simplicity).**
- The flash IS the demote. A promotion "scoped" to the reveal must be released later — and releasing it while
  `#home` is the visible active view is itself a demote of a visible view, re-introducing the flash. The only
  time it is safe to demote is when `#home` is off-screen/covered — which is when it is parked, and parking
  re-promotes it anyway. There is no scoped window that both avoids the reveal demote AND avoids a later
  demote; the layer is needed continuously, so permanent is the honest expression of the requirement.
- Cost of permanent: `#home` (which today composites only while parked) also composites while ACTIVE. GPU
  memory is one home-sized layer (a few MB — trivial). Scroll perf: `#home` scrolls with the document; a
  composited layer under document scroll is handled by the compositor and is typically neutral-to-favourable.
  The `.256` probe already ran with `#home` permanently promoted and the only side effect questioned was the
  navbar (confirmed absent).
- Simplicity: permanent is PURE CSS with zero JS coordination (Decision below). Scoped would require app.js to
  toggle the promotion around every reveal — more surface, more places to miss, exactly the enumerated-defense
  shape the planner discipline warns against.

**Pure-CSS?** YES. The fix is one unconditional stylesheet rule; the un-park (removing `.parked`) then cannot
demote *on the reveal path* because the base transform remains under it in the static cascade.
`resetSwipeStyles`'s `style.transform = ''` clears only the inline value and falls back to the stylesheet — no
JS change is required. (The guarantee is over the un-park cascade only; a `nav-in` slide animation still drives
`#home` to `none` transiently at its end frame — benign, non-reveal, §3.) The single JS touch (§2, §9) is a
COMMENT scrub for HEAD truthfulness, not a functional change.

**The one thing the eyeball A/B could not settle (device-verify watch, §9).** A permanent real 3D transform
rasterises the ACTIVE `#home` to a GPU texture; on some displays that can soften text versus the crisp
non-promoted render. The `.256` probe ran with `#home` promoted and no text-quality regression was reported,
so the risk is low — but it is device-only observable and is placed on the shipped-unverified device pass. If
active-home text softens perceptibly, the documented fallback is `will-change: transform` (the device-tested
form, accepting its droppability). This is an engineering choice with a device backstop, not a product fork —
hence no escalation.

## 5. Lifecycle-ownership section (the compositing layer) and runtime-dependency policy

**Lifecycle ownership (lifecycle_ownership).** The managed resource is `#home`'s browser compositing layer.
Named concerns:
- **CREATE.** The layer is created by the unconditional base rule `#home { transform: translateZ(0) }` —
  present for the entire lifetime of `#home` (a permanent-mount `.view`). Owner of the create: the stylesheet,
  not app code. (Today the layer is instead created lazily on park via `will-change`/`translateX` and this is
  the change: creation becomes unconditional.)
- **BORROW.** No runtime resource is borrowed. The layer is not a borrowed real node handed between owners;
  it is a browser-managed layer held open by a stylesheet property. `#home` itself is a permanent-mount real
  node that is never borrowed-then-restored by this slice (contrast the swipe's mover panes, which borrow the
  real view — this slice does the opposite for the layer: it never lets go of it).
- **HOLD / MUTATE across state change.** While parked, the more-specific `#home.parked` rule MUTATES the
  transform to `translateX(-101vw)` (still a real transform → the SAME layer is held, off-screen). While a
  drag is in flight, an INLINE `translateX(...)` mover transform mutates it. Across the parked → drag →
  un-park states the transform stays non-`none`, so the reveal never destroys the layer — it is the same
  promotion throughout. (Exception, out of scope: a `nav-in` slide animation drives the transform to `none`
  at its end frame, but the running animation itself holds the layer during the slide and it reverts to
  `translateZ(0)` at `animationend` — §3.)
- **RELEASE / DISPOSE.** The layer is NEVER released or disposed by app code across the parked↔un-parked
  cycle — that release IS the demote this slice forbids. `resetSwipeStyles` clears the INLINE transform to
  `''`, which cascades back to `translateZ(0)` (a re-expression of the same promotion), not a release. The
  browser MAY reclaim a layer only when its promotion is a droppable hint; choosing a real transform over
  `will-change` (§4) removes even that reclaim path. The only true dispose is `#home`'s own teardown, which
  does not occur in normal operation.
- **ENDPOINT.** The promotion's lifetime equals `#home`'s lifetime (permanent). There is no per-gesture or
  per-reveal ownership endpoint to manage — which is the point: no endpoint means no demote frame.

**Runtime-dependency policy (U9).** The change is a static stylesheet declaration — it reads no ambient
global, closure, service, or environment value, caches nothing, and adds no runtime coupling. Module/import
evaluation is unaffected (CSS is not JS). The `require()`-no-DOM gate is untouched.

## 6. Ordering (the cascade invariant)

There is no temporal/async ordering to sequence (no operations race). The one ordering-like invariant is a
CSS-CASCADE invariant, pinned by cell PROMO: **`#home.parked` (specificity `#home.parked`) must always win
over the base `#home` rule while parked, and the base rule must always apply when `.parked` is absent — so at
no cascade resolution does `#home`'s transform become `none`.** This holds by construction (the parked rule is
strictly more specific and sets a real transform; the base rule is unconditional). A wrong cascade (e.g. a
future `!important none`, or a more-specific rule setting `transform: none`) would break it — which is exactly
what the PROMO source gate detects. No `@order` runtime section is owed.

## 7. Coverage Model (Mendeleev catalog)

| Dimension | Applicable? | What the suite must prove / why N/A |
|---|---|---|
| Lifecycle / phases | Yes | `#home`'s compositing layer is created unconditionally and never released across parked↔un-parked; the reveal (un-park) does not demote it (cells PROMO, REVEAL). |
| Identities | N/A | No identifier is created, changed, or reinterpreted. |
| Ordering | Yes (cascade) | The `#home.parked` rule wins while parked and the base rule applies when un-parked, so `#home` transform is never `none` (cell PROMO). No async ordering. |
| Resources: acquired / owner / endpoint | Yes | The layer is the resource; owner is the stylesheet; endpoint is `#home`'s lifetime (permanent) — never released at a reveal (cell PROMO). |
| Async operations | N/A | No async surface, timer, rAF, or continuation changes; the reveal hold and finalize timers are untouched. |
| Stale completions | N/A | No callback/continuation is added or changed. |
| Normal completion | Yes | Every reveal that lands on home (commit→home, abort→home) leaves `#home` un-parked WITHOUT demoting its layer (cells PROMO, REVEAL). |
| Recovery authority boundary | N/A | No authority/finalization decision changes. |
| Emergency disposal | N/A | No teardown path is added or changed. |
| Persistence | N/A | Static CSS; nothing persisted. |
| External side effects | Yes (device) | The visible effect (the home→books abort flash going clean; the navbar not popping; active-home text quality) is device-only and on the shipped-unverified pass (§9); explicitly NOT a CI cell. |
| Invariants | Yes | The load-bearing promise §3 (no reveal path lands `#home` on `transform: none`) — cell PROMO; REVEAL pins that the real reveal path is the parked→un-parked transition the invariant protects. |
| Mutation cases | Yes | PROMO's mutation neutralises the base `#home` transform (source text); REVEAL's mutation breaks the un-park. |
| Known-red | N/A | New policy; the source gate is GREEN on the shipped form; no known-red, no PolicyLedger entry (§9). |
| Composition | Yes | The permanent base transform composes with FOUR states: `#home.parked` (more-specific override), the mid-drag inline mover transform, `resetSwipeStyles`'s inline clear (falls back to the stylesheet) — none of which produces a `none` frame on the reveal (cell PROMO) — and the `nav-in` slide animation, which DOES resolve to `none` at its end frame but is a benign non-reveal path that composites during the slide and reverts to `translateZ(0)` at `animationend` (§3, accounted, not a reveal demote). |
| Contract claims (exact schema) | N/A | No contract object/schema changes. |
| Concurrency | N/A | Static CSS; single-writer irrelevant. |
| Observability | Yes | PROMO reads `css/app.css` source (the only channel where the promotion is observable — jsdom cannot compute a stylesheet transform); REVEAL reads the real `#home` class state through the harness reveal path. The compositor demote/flash is NOT observable in CI — device-only (§9). |
| Flash (visual, device) | Device-only (downstream) | The home→books abort flash going clean, the absence of a navbar pop, and active-home text quality are confirmed on device (§9), NOT gated on this stage. |

## 8. Coverage and mutation matrix

Two cells. Both non-vacuous; each names a mutation that reddens it on a real channel. Per EC §4.10, PROMO is a
SOURCE-TEXT gate (separated into the source-text sweep; it does NOT claim to observe runtime compositing).
REVEAL is an integration check on the real reveal path. **Neither asserts the flash — the flash is
device-confirmed (`.256` A/B), stated §3/§9.**

| id | Behavior proved | Fixture / channel | Mutation that must fail it | Layer |
|---|---|---|---|---|
| PROMO | `css/app.css` declares an UNCONDITIONAL base `#home` rule whose `transform` is a persistent, layer-promoting, non-`none` value (`translateZ`/`translate3d`/`matrix`), and `#home.parked` also carries a real transform — so no resolution of the STATIC `#home` rule cascade `{#home, #home.parked}` lands `#home` on `transform: none` (this is the un-park/reveal guarantee; it does NOT cover transient animation-added classes like `nav-in`, which are non-reveal and out of scope, §3). | Source-text gate reading `css/app.css` (new `test/home-layer-invariant.test.js`); SOURCE_TEXT_GATES sweep. | Neutralise the base `#home` transform (change `translateZ(0)`→`none`, or delete the base rule, or replace it with a bare `will-change` and no transform) → the gate reddens. | source-contract (css text) |
| REVEAL | Driving a real transition that lands on home through the app-harness (a home→books ABORT snap-back — the `.256` device scenario), the real reveal path (`applyScreen({v:'home'})`→`setView`) removes `.parked` from `#home` — i.e., the un-park the permanent promotion must survive genuinely occurs on the reveal path. (Proves the reveal IS the protected transition; does NOT prove compositing — jsdom cannot, stated.) | app-harness `h.touch` home→books drag then abort; assert `#home` does not have class `parked` after the reveal (and had it during the drag). | Break the un-park (make the reveal leave `.parked` on `#home`, or skip `setView('home')`) → the assertion reddens. | integration (real DOM class state) |

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
PROMO | css app css declares an unconditional base home rule whose transform is a persistent layer promoting non none value translateZ or translate3d or matrix and home dot parked also carries a real transform so no cascade resolution lands home on transform none across parked and un parked | source text gate reading css app css in a new home layer invariant test run in the source text gates sweep | neutralise the base home transform by changing translateZ zero to none or deleting the base rule or replacing it with a bare will change and no transform so the gate reddens | source contract css text
REVEAL | driving a real home to books abort snap back through the app harness the real reveal path applyScreen home then setView removes the parked class from home so the un park the permanent promotion must survive genuinely occurs on the reveal path this proves the reveal is the protected transition not the compositing which jsdom cannot observe | app harness h touch home to books drag then abort asserting home lacks the parked class after the reveal and carried it during the drag | break the un park by making the reveal leave parked on home or skipping setView home so the assertion reddens | integration real DOM class state
```

## 9. Records reconciliation (APPLY ON APPROVAL) + device-verification obligation

Scrub obligations when this ships (StandardsDocument §6.6; EC §4.22/§7). NOT applied by this plan — each is a
defining-record edit flagged for the maker/Zelda.

- **`css/app.css` (109-115)** — replace the diagnostic probe block (`#home { will-change: transform; }` + its
  REVERT comment) with the production rule `#home { transform: translateZ(0); }` and a production comment
  (permanent compositing layer so un-parking cannot demote it; a real transform not the droppable `will-change`
  hint; device-confirmed navbar-safe, `.256` A/B). Confirm no other rule sets `#home` transform to `none`.
- **`js/app.js` (552-554)** — update the "Deliberately NO will-change on the real in-flow views
  (#home/#browse)" comment to record the scoped `#home` exception (permanently promoted via a stylesheet
  `translateZ(0)`, device-confirmed navbar-safe; `#browse` remains un-promoted, its transform flash deferred).
  Comment-only; no code change. Confirm this is the ONLY place in HEAD asserting "no promotion on `#home`" so
  the reversal leaves no stale contradiction (the adapter (F) invariant text is a plan-gate check, not a HEAD
  assertion, and needs no code edit).
- **`test/home-layer-invariant.test.js`** — NEW source-contract gate (Curie authors it red-first): assert the
  unconditional base `#home` rule carries a persistent layer-promoting `transform` and that no cascade lands
  `#home` on `none`. Wire it into the SOURCE_TEXT_GATES sweep, NOT the behavioral sweep (EC §4.10), and label
  it in-file as a source-text gate that does not observe runtime compositing.
- **`tools/mutate.mjs` + `tools/mutation-sweep.mjs` + `test/mutation-anchors.test.js`** — register the PROMO
  mutation (neutralise the `css/app.css` base `#home` transform) under SOURCE_TEXT_GATES and the REVEAL
  mutation (break the un-park) under the behavioral sweep. **Grounding note for the maker:** confirm
  `tools/mutate.mjs` can target `css/app.css` (a text mutation on a non-JS file); if the mutation registry is
  JS-only today, extend it to the css file — this is part of mechanizing the source gate, flagged honestly, not
  assumed.
- **`Claude/Decisions/DecisionLog.md`** — append a dated Stage-6g entry: NEW POLICY (EC §4.19) — `#home` is now
  permanently promoted to a compositing layer via an unconditional stylesheet `transform: translateZ(0)`, a
  scoped exception to the "no promotion on the real in-flow views" invariant, justified by the build `.256`
  device A/B (the home→books abort flash was the `#home` un-park demote; permanent promotion made it clean;
  navbar-pop confirmed absent). `translateZ(0)` chosen over `will-change` for non-droppable persistence;
  permanent chosen over scoped because a scoped release re-introduces the demote. `#browse` is NOT promoted
  (its transform flash deferred). No known-red; no PolicyLedger entry (the invariant is asserted GREEN by the
  new source gate, not held red). Reference this plan.
- **`Claude/Subsystems/swipe-reveal.md`** — record the `#home` permanent-promotion policy and its rationale in
  the invariants/known-behaviour sections; note that removing `.parked` at a reveal is guaranteed not to demote
  `#home`; note the deferred `#browse` transform families remain governed by the un-promoted invariant.
- **`Claude/Plans/PLAN-swipe-reveal.md` §7 step 6** — annotate: 6g eliminated the home→books ABORT flash by
  keeping `#home` a permanent compositing layer (the reveal-side complement of "never demote the real view");
  the commit books→home flash (home-snapshot teardown), the incoming-`#browse` families, and the outgoing
  →home transform remain deferred. Point to `PLAN-swipe-stage6g.md`.
- **`EngineeringContract.md` §4.22 reviewable-stage naming** — ships as "Stage 6g" so the deferred remainder
  stays visible.
- **Campaign definition** — `Claude/Campaigns/swipe-stage6g.json` to be authored (the stage-gate manifest lists
  every required gate incl. Loki), so the campaign stage-completion gate can verify the Loki verdict is filed.
- **Build number** — a code change bumps the build number (PWA deploy rule).
- **🔴 DO NOT remove the `--page-bg` red test gradient** (`css/app.css`) — a separate standing user instruction,
  tied to the still-open `#browse` movement, not this stage.

**DEVICE-VERIFICATION OBLIGATION (downstream, NOT a gate on this stage — deploy rule).** The `.256` A/B already
confirmed the mechanism with the `will-change` probe; the production form (`translateZ(0)`) must be re-verified
on device for three device-only claims: (a) the home→books ABORT flash is CLEAN with the production rule (the
formalized `.256` result); (b) the fixed navbar does NOT pop with the permanent `translateZ(0)` promotion; (c)
active-home text quality is unaffected (the §4 watch item — if it softens, fall back to `will-change:
transform`). These go on the standing shipped-unverified device pass; the stage is NOT gated on them. The
STRUCTURAL invariant (§3/§8) is CI-proven regardless. The `.256` diagnostic probe line is REPLACED by this
slice's production form (it is not left alongside).

## 10. What this does NOT do (deferred, with reasons)

Each deferral names the consumer/stage that introduces it (U2).

- **The commit books→home flash.** A DIFFERENT cause: it STILL flashes WITH the `.256` `#home` promotion probe
  live, so it is NOT the `#home` un-park demote (ruled out by the same A/B). The commit reveal builds a
  home-SNAPSHOT pane (`holdGhostUntilPaintable($('home'))` → `fadePanes`) that the abort path does not; that
  snapshot teardown is the standing suspect. Consumer: its OWN later controlled experiment (do NOT log-spelunk;
  run a change-one-variable A/B, per the saga method note). Out of this slice.
- **The incoming-`#browse` headline flash (browse→browse abort, home→browse, overlay→browse).** The destination
  renders into the real `#browse` and `#browse` slides in as the incoming mover; eliminating its transform needs
  an out-of-flow incoming representation (floating the incoming in a fixed pane is dead-end T8). A larger,
  forked piece. Consumer: the T8-forked incoming-representation / reveal-centralization work. `#browse` stays
  un-promoted (the invariant this slice reverses only for `#home`).
- **The outgoing-`#browse` transform on →home (the abandoned Option A).** Superseded: the felt Home flashes are
  the reveal-side demote (this slice) and the snapshot teardown (deferred above), not the outgoing `#browse`
  transform (which on commit is off-screen/hidden before its clear). Not needed for the felt flashes; not
  planned here.
- **Dropping the now-redundant `will-change: transform` from `#home.parked` (107).** With a permanent base
  real transform, the parked rule's `will-change` is redundant (its own `translateX` already promotes). An
  optional venustas cleanup; NOT taken here to keep the slice surgical and the device-verified surface minimal.
  Consumer: a future cleanup pass, or fold into the maker's discretion if Charpy prefers it in-slice.

## 11. Sequencing and handoff

This slice rests on nothing unbuilt: it is one unconditional CSS rule replacing a diagnostic already live on
device, plus a comment scrub and a source gate. It does not gate, and is not gated by, the deferred work (§10).

Handoff order: **Charpy (temper)** → **Curie** (red suite from §8: PROMO the source-text `css/app.css`
invariant gate, wired into SOURCE_TEXT_GATES; REVEAL the real home→books-abort un-park through the app-harness
— both red-first) → **Brunel** (green: replace the `css/app.css` probe with `#home { transform: translateZ(0) }`
+ production comment; scrub the app.js:552-554 comment; register the two mutations; bump the build) → **Poirot**
(review) → **Mendeleev** (coverage audit) → **Loki** (strike the §3 load-bearing promise: a reachable reveal
path — home→books abort snap-back or any applyScreen(home) — where `#home`'s effective transform resolves to
`none`, i.e., a demote frame the unconditional base rule fails to prevent). Campaign definition-of-done:
`Claude/Campaigns/swipe-stage6g.json`. Device-verify (§9) is downstream on the shipped-unverified pass.

## Outcome (SHIPPED — 2026-07-27)

SHIPPED through all six gates: Charpy FORGE, Loki HELD_STONE, Curie RED, Brunel BUILD_GREEN + apply-fix,
Poirot FINDINGS→SHIP, Mendeleev BARE_CELLS→ADEQUATE; the campaign completion gate is COMPLETE. Build target
is HEAD (`ea49dc2`). The shipped form is the production `css/app.css` `#home { transform: translateZ(0); }`
base rule (the diagnostic `.256` `will-change` probe is REPLACED, not left alongside); `js/app.js` is
comment-only, so Loki's HELD_STONE precondition holds.

Poirot findings applied (apply-review `Claude/Poirot/POIROT-swipe-stage6g-apply.md`, verdict SHIP):
- **F1 (Critical) — closed.** The source-text mutation (#79, `css/app.css` base `#home` transform) read
  UNCAUGHT in the CI sweep because its only catcher — the source-text gate `home-layer-invariant.test.js` —
  is excluded from the behavioural set and no behavioural test observes a CSS change. Brunel added a GENERAL
  mechanism: a `caughtBy` marker on the mutation plus a `gateTestsFor()` helper in `tools/mutation-sweep.mjs`
  runs the named gate directly against the mutated source and counts its reddening as the catch. Verified
  non-vacuous (green at baseline, red only under the mutation) and general (branches on the property, no
  `#79` special-case; no `benignAlone`). This closes the recurring §4.10 gap for source-text gates.
- **F2 (Observation) — applied.** The `css/app.css` + `js/app.js` navbar comments now state honestly that the
  `.256` device A/B confirmed navbar-safety for the `will-change` PROBE form, and the shipped `translateZ(0)`
  form is EXPECTED navbar-safe by the same containing-block/stacking argument (§4) but its own device
  confirmation is still OWED (§9b). No residual overclaim.

DEVICE-CONFIRMATION STILL OWED (§9b, standing shipped-unverified pass): the abort flash was device-confirmed
CLEAN for the `will-change` probe form only; the shipped `translateZ(0)` form's device pass — (a) the
home→books ABORT flash clean, (b) no navbar pop, (c) active-home text quality — is owed and is NOT a gate on
this stage. The CI-proven guarantee is STRUCTURAL only (§3/§8): `#home` carries a non-`none` layer-promoting
transform across the reveal cascade; the flash itself is off-main-thread and invisible to the harness.

DEFERRED, distinct causes, still open (not fixed by this slice): the commit books→home flash (the
home-SNAPSHOT pane teardown — a DIFFERENT cause, still flashes WITH the `.256` probe, its own controlled
experiment owed); the incoming-`#browse` headline flash (browse→browse + home→browse, T8-forked
reveal-centralization). See §10.
