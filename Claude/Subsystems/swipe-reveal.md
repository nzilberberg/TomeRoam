# Subsystem Contract — Swipe / Reveal

Addendum to the Durable Engineering Contract (§5 template). Describes the CURRENT
architecture; revise per §6/§7 when it changes. Plan of record: `Claude/Plans/PLAN-swipe-reveal.md`;
current active plan: `Claude/Plans/PLAN-swipe-declone.md` (Stage 1 built 2026-07-30, Stage 2 not
built — retires the owned-pane clone from every transition but browse→browse, then from that too).
Deep saga + traps: cross-session memory `tomeroam-swipe-repaint-saga`.

**1. Purpose and boundaries.** The horizontal edge-swipe navigation gesture and its
pane/reveal choreography — back-swipe, forward-swipe, and the mid-drag panes that make the
destination appear to slide in. Owns the gesture lifecycle and the classification of a
transition into what must be BUILT. Does NOT own the nav stacks (Nav) or playback.

**2. Public entry points.** The touch listeners bound in `begin()` (touchstart/move/end/
cancel) in js/app.js; the pure boundary `Swipe.classifyTransition()` / `Swipe.constructionPlanFor()`
in js/swipe.js. Tests drive the REAL gesture through `test/app-harness.js` `h.touch`.

**3. Authoritative state.** The nav stacks (`navStack`/`fwdStack`, owned by Nav) are
authoritative for WHERE; the active gesture session `d`/`session` is authoritative for the
in-flight drag. After the stack mutates at commit, the stack wins (see 13).

**4. State machine / lifecycle phases.** ARMED (edge grabbed, not yet past the lock) →
DRAGGING (`live`, panes built) → SETTLING (released, animating) → FINALIZING (applyScreen +
stack mutation) → REVEALING (held pane awaiting paint) → done. Gesture-ending inputs route by
STATE, not by input (I19). **Stage 6h (2026-07-28):** on a commit→home REVEALING with a
large outgoing scroll clamp, the held-pane cover-drop gains an OPTIONAL third async gate and
waits for a scroll-settle signal before REVEALING→done, so the drop is deferred past the
compositor's under-cover scroll-collapse snap (§7/§10/§18). Every other reveal (abort→browse,
small/top commit→home) is unchanged.

**5. Identities and guarantees.** `d.id = ++sessionSeq` — a per-gesture monotonic id, unique
for the process lifetime, used to detect supersession. Not persisted; not cross-device. A
successor gesture gets a strictly greater id before the old one is released (I20).

**6. Ordering model.** Single-writer within the process (one gesture owns transforms/stack/
scroll at a time); supersession is ordered by `sessionSeq`. No cross-device ordering here.

**7. Resources acquired.** Touch listeners (on the start target); the settle
`requestAnimationFrame`; settle/reveal timers; a `transitionend` listener; owned panes
(ghost, home-snapshot); the NP pill clone (owned-decoration); borrowed real nodes
(#home/#browse/overlay) with temporary transforms; a row hold. **Stage 6e:** owned-pane
disposal on a supersession is now a typed operation, `disposeOwnedPanes(session, reason)`
(js/app.js), not a resource of its own. **Stage 6f (in-flow→overlay outgoing app-ghost,
2026-07-27):** for the in-flow→overlay family (browse→overlay, home→overlay, and the NP-decorated
browse→nowplaying/home→nowplaying) the OUTGOING is now an owned-pane app-ghost (the shipped
`ghostApp` recipe), not the borrowed-real in-flow view with a temporary transform. The real
`#browse`/`#home` is no longer borrowed as a mover on these transitions — it stays in flow,
untransformed, never removed — and the new outgoing ghost is disposed once per exit through the
existing owned-pane paths (`dropPanes` on the plain no-hold finalize; `disposeOwnedPanes(session,
'superseded')` on supersession, stage 6e; the orphan sweep). One-line decision-value flip in
`constructionPlanFor` (js/swipe.js); js/app.js UNTOUCHED. **Stage 1 of PLAN-swipe-declone.md
(2026-07-30) NARROWS this back down** — see the dedicated paragraph below; the in-flow→overlay
family this stage 6f paragraph describes is CURRENT TRUTH ONLY for the historical record, not for
HEAD after 2026-07-30. **Stage 6g (`#home` permanent compositing layer,
2026-07-27):** `#home`'s browser compositing layer is now a PERMANENT resource, not a per-park one. An
unconditional stylesheet rule `#home { transform: translateZ(0); }` (css/app.css) holds the layer open for
`#home`'s whole lifetime; the more-specific `#home.parked { transform: translateX(-101vw) }` re-expresses the
same layer off-screen while parked, and the mid-drag inline mover transform re-expresses it during a drag.
The layer's owner is the stylesheet (not app code), its endpoint is `#home`'s lifetime (never released across
the parked↔un-parked cycle), so removing `.parked` at a reveal cannot demote it. A real `translateZ(0)` is
chosen over the droppable `will-change` hint so the compositor cannot reclaim it under memory pressure. This
is the ONE scoped exception to the "no promotion on the real in-flow views" invariant (§18); `#browse` stays
un-promoted. js/app.js is comment-only. **Stage 6h (commit→home scroll-settle gate, 2026-07-28,
build target 11fc190):** the commit→home held reveal acquires TWO more session-owned resources,
but ONLY on a large outgoing scroll clamp (`cur.scroll0 > SETTLE_SCROLL_MIN`, where
`SETTLE_SCROLL_MIN = 0.5·window.innerHeight`): a `window` `scrollend` listener (its remover held on
`cur.revealScrollEnd`; the `window` object is BORROWED, the listener registration is the owned
resource layered on it — EC §4.4) and a bounded settle-timeout `cur.revealSettleTimer`
(`SETTLE_MS = 100ms`). Both are created inside `holdGhostUntilPaintable` (js/app.js) only when its
new `opts.scrollSettle` argument is set, and retired in `drop()` alongside the existing
`revealFrames`/`revealTimer`. The abort→browse reveal passes no `opts`, so it acquires neither and
is byte-unchanged; the small/top commit→home passes `scrollSettle:false`, so it too takes the
pre-6h path.

**Browse-decouple (PLAN-browse-decouple.md, 2026-07-29):** active `#browse` joins `#home` in the
fixed-own-scroll class (css: `#browse`) — the symmetric completion of Stage 6i. Both are
borrowed-real movers with transient mid-drag/mid-park transforms; NEITHER is in-flow any longer,
so the document height comes ONLY from the `.app` runway (§8/css:73) regardless of which is
shown. The six window-scroll consumers (the virtual-list realize listener + metrics, the browse
scroll recorder/restore, `playingTrackY`, the custom scrollbar, and the outgoing app-ghost's
offset source) re-home to `#browse.scrollTop`. The `.266` stable-height probe (nav.js) that once
pinned `.app` min-height on `→home` is retired — a fixed `#browse` cannot collapse the document,
so there is nothing to pin against.

**Swipe-declone Stage 1 (PLAN-swipe-declone.md, 2026-07-30) SUPERSEDES Stage 6f's in-flow→overlay
outgoing decision.** `ghostApp()` cloned `.app` and stripped every id, so the copy's id-keyed
`position:fixed` inset rule stopped matching and the copy laid out in a different box than the real
view — the CAUSE of the 7px gap, the second moving background, and the reported swipe-start heading
reflow. `constructionPlanFor`'s `outgoing` narrows from stage 6f's "an in-flow source going to any
non-home destination" to `fromKind==='browse' && toKind==='browse'` — the ONE remaining pair whose
source and destination share the single real `#browse` host. home→browse, home→overlay and
browse→overlay now move their REAL view element (borrowed-real) directly; the owned-pane app-ghost
this section's stage-6f/6f paragraphs describe is now built ONLY for browse→browse. `showAppView`
(js/app.js) also stops parking `#home` synchronously inside the mid-drag render — the park is
deferred to commit (the existing `applyScreen`→`Nav.setView` toggle, unchanged) and never happens on
an abort. Stage 2 (not built) removes the clone from browse→browse too, at which point `ghostApp`,
`dropPanes`, the capture-recording block and the `.nav-ghost` sweeps are all deleted outright.

**8. Resource owner.** The gesture session (`d`/`cur`). Stage 3 stamped the session id;
resource-handle ownership (settle rAF stored on the session, cancelled in finalize) landed at
`.226`. **Stage 6b (release half, 2026-07-26):** the 340ms settle fallback timer, the reveal
double-`rAF` (a two-id handle that always names the currently-pending frame), and the 600ms reveal
safety-net timer are now SESSION-OWNED handles retired at their phase resolver (finalize/drop), so no
loser continuation leaks onto the scheduler queue. Still deferred to the I12 stage (its consumer): the
NULL-on-retire writes, the `transitionend` listener's session-ownership/removal, and a per-handle-liveness
observability surface (no testable/consumed surface exists until I12). **Stage 6c (pane-less supersession,
2026-07-26):** begin()'s finishing gate is narrowed to its negative form so a live PANE-LESS session (the
overlay-involving set {home→overlay, browse→overlay, overlay→overlay, overlay→browse}) is supersedable; a
`cur === session` identity guard on the settle rAF and before finalize's try/finally makes a superseded
session's stale settle-phase continuation no-op on the successor, and the recovery clears `finishing` on
every exit (a never-arming tap no longer wedges). Still deferred to 6d/7: the NULL-on-retire writes, the
`transitionend` listener ownership, PANE-OWNING supersession (home↔browse, →home), and the I10/I17 reveal
centralization (the flash core). **Stage 6d (finalization decision declared, 2026-07-27):** the abort/recovery
re-render decision is now a DECLARED arm-time frozen field, not a runtime build byproduct. `Swipe.finalizationPlanFor(
classification)` (js/swipe.js) is a pure, deep-frozen, throws-on-unhandled-kind function whose `abortRender` is
`'rerender'` iff `fromKind==='browse' && toKind==='browse'`, else `'none'`; it is computed at ARM time from the
resolved descriptors and stored on the session as `cur.finPlan` (js/app.js:442). The runtime byproduct
`sourceWasClobbered` (js/swipe.js `buildConstruction`) and its stored session flag `d.clobbered` are RETIRED
(EC §4.16 — no cause + separately-stored derived consequence); the three read sites now consume the declared
decision — the two finalize abort sites (app.js:1160/1187) as `cur.finPlan.abortRender === 'rerender'`, and the
begin() supersession recovery reader (app.js:417) as `cur.live && cur.finPlan.abortRender === 'rerender'` (the
`cur.live` conjunct reproduces `clobbered`'s build-ran half, so an ARMED browse→browse superseded before the 8px
lock still renders FALSE — byte-parity). Behaviour-preserving extraction (parity), no new policy. Still deferred to
7 (unchanged plus the finalization remainder): the pane-lifecycle interface (F, release/dispose/equivalence +
paneRemovalPolicy); PANE-OWNING supersession incl. home↔browse and →home (B); the I10/I17 reveal centralization
(C, the flash core); the rest of the finalization plan (commit/abort-scroll/stackEffect/reveal + the unified
`planFor()` wrapper); host fields `sourceHost`/`destinationHost`/`sameBrowseHost`; the `recoverSession` pre/post-stack
matrix (G); the NULL-on-retire writes + `transitionListener` ownership (A); `fadePanes`; and the headline
compositor flash. **Stage 6e (owner-driven owned-pane disposal, 2026-07-27):** the F(dispose) half of the
pane-lifecycle interface lands for its one live consumer. `disposeOwnedPanes(session, reason)` (js/app.js,
near `releaseGesture`/`dropRowHold`) removes exactly the session's `own==='owned-pane'` movers still
attached — never a `borrowed-real` or `owned-decoration` mover (a structural guarantee of the `own` filter,
not an enumerated exclusion). The `begin()`-recovery owned branch (`cur = d || session` truthy) calls
`disposeOwnedPanes(cur,'superseded')` and threads `keepGhosts:true` at BOTH the explicit `resetSwipeStyles`
call and the `applyScreen` opts, so the DOM-global `.nav-ghost` sweep (§4.3's "operate through whatever is
global" anti-pattern) no longer duplicates the removal on that branch. The ORPHAN branch (`cur` null) is
UNCHANGED — the full `resetSwipeStyles` sweep still disposes a leftover ghost with no owning session (§14).
Behaviour-preserving EXTRACTION (byte-identical parity — the owner-driven removal set equals the set the old
sweep removed for the owned case), no known-red. F(release) (the paint-gated `pane.release()` half, the flash
core) and the SETTLING/REVEALING pane-owning supersession (B) remain deferred — see 23. **Stage 6h
(2026-07-28):** the two commit→home settle-gate handles (`cur.revealScrollEnd`,
`cur.revealSettleTimer`) follow the SAME single-endpoint discipline as the 6b reveal handles —
retired exactly once in the `dropped`-guarded `drop()`, never on a parallel supersession path.
`drop()`'s `removeEventListener` is what keeps the `window` `scrollend`-listener set BOUNDED across
gestures; omitting it does NOT mis-drop (a leaked listener reaching a finished session hits a
`dropped`-guarded / `cur !== session` no-op), but accumulates listeners on `window` without bound —
so the cell OWN spies the removal call directly rather than asserting "no second drop".

**9. Ownership endpoint.** `sessionDone(cur)` / `endOwnership()`. ARMED end: after listeners
released. Vertical abandon: after listeners + resources released. Commit/abort without a pane:
after finalize. Held reveal: only after `drop()` releases the pane. `session !== null` must
mean live ownership — do not retain a completed session for logging (§4.5).

**10. Asynchronous operations.** The settle rAF; the settle/reveal timers; the transitionend
listener; the paint-gated pane release (I10). All can fire after the gesture that scheduled
them was superseded or finalized. **Stage 6h (2026-07-28):** the commit→home cover-drop composes
FIVE async producers over one `dropped`-guarded consumer — the decode microtask, the double-`rAF`,
the new `window` `scrollend`, the new `SETTLE_MS` settle-timeout, and the pre-existing 600ms net.
The gate predicate is `decoded && painted && settled`, and `settled` starts `false` only on a
large-clamp commit→home. The 600ms `cur.revealTimer` still calls `drop('timeout')` DIRECTLY
(bypassing the gate), so the cover can never strand even if `scrollend` never fires and the
settle-timeout is defeated — the never-strand backstop.

**11. Possible stale completions.** A settle rAF firing after finalize (fixed `.226`: cancel
on session). A transitionend or timeout firing after the other already finalized (must
finalize exactly once). A superseded session's listener firing on a detached start target
(the harness reproduces detached-target dispatch deliberately — do NOT re-target to document).
**Stage 6h (2026-07-28):** a `scrollend` or settle-timeout firing after `drop()` reaches a removed
listener / a `dropped`-guarded no-op. Under supersession the superseded session's `scrollend`
listener stays on `window` until that session's own `drop()` fires (at latest its 600ms net) — a
BOUNDED transient double-listener (at most one per concurrently-pending reveal), NOT the unbounded
accumulation a missing removal would cause.

**12. Normal completion behavior.** Commit: the stack mutation is conditional on the gesture's
claim still holding (`applies` — `PLAN-swipe-navstack-settle-window.md` §5). When it holds,
mutate the stack and applyScreen the destination with no re-render (`render: false`) — the
destination is already rendered live, so this reconciles rather than repaints; no pane machinery
is involved (there is no owned pane on this path, and no pane-release code exists anywhere in
`js/`). When it does not (stack-superseded, item 13), the mutation is skipped and no new claim is
asserted, and the destination is reconciled the same no-render way. Abort: applyScreen the
destination with no re-render — the source element was never overwritten, so there is nothing to
restore (PLAN-swipe-declone.md Invariant D3) — and restore starting scroll. All three outcomes
honor exactly-once finalize.

**13. Recovery authority boundary.** The nav-stack mutation, over three cases. PRE-stack failure
→ restore source + starting scroll. POST-stack failure → render from the stack top + destination
scroll (I18, §4.17). STACK-SUPERSEDED — `commit` true, `applies` false; a navigation inside the
settle window invalidated the gesture's claim before the mutation ran (`PLAN-swipe-navstack-
settle-window.md` §5) — → render from the stack top, write no scroll: neither the pre-gesture
source scroll (a screen the user has left) nor the destination's default reset (would jump the
newer screen back to its top). Do not restore a source beneath a stack that already names a
destination the gesture did not choose.

**14. Emergency disposal rules.** `begin()`'s hard reset disposes an ORPHAN pane (no owner)
before arming, via the DOM-global `resetSwipeStyles` sweep. A pane-owning DRAGGING supersession
(the one live consumer today) is disposed instead through the typed, owner-driven
`disposeOwnedPanes(session,'superseded')` (Stage 6e) — the same emergency-teardown obligation,
now attributed to its owner rather than a DOM-global query. It must NOT dispose a pane owned by
an active SETTLING/FINALIZING/REVEALING session (I17(a)) — unchanged, still gated by the 6c
`finishing` check before the recovery block is reached. **Owed (Loki `STRIKE-swipe-stage6e-r1`
residual 2, unguarded):** the invariant "every connected `.nav-ghost` under a live session is an
owned-pane mover" holds today only because the one mid-build callback
(`env.renderDestination`→`Browse.render`) is `async`, converting a sync-section throw into a
rejected promise rather than a synchronous unwind. A future synchronous throw in that path (or a
sync rewrite of `Browse.render`) would strand an opaque pane the owned branch's `keepGhosts:true`
no longer self-heals. No production guard exists for this; it is not constructible at HEAD, so no
red test could be authored for it (Curie, `RED-swipe-stage6e.md` §5). Routes to a plan amendment
before the next `renderDestination` change.

**15. Persistence model.** None — the gesture is entirely in-memory and per-process.

**16. External side effects.** Renders into #browse (Browse.render); toggles body classes
(np-locked); calls Nav.applyScreen; mutates the nav stacks at commit.

**17. Independent test oracle.** THREE layers: `test/fixtures/swipe-plan-spec.mjs` (hand-written
declarative expectations) → `js/swipe.js` (production decision) → `test/swipe-transition.test.js`
compares them; `tools/gen-transition-matrix.mjs` RENDERS the spec (it must NOT call the
production planner — enforced by convention + the spec-import structure; §4.14). The app.js
branch-fingerprint mirror is RETIRED. Stage 6d turned the frozen `expectedFinalization: { abortRender }`
data (per STRUCTURAL_CASE, inert since stage 4) ON: `swipe-transition.test.js` now compares production
`finalizationPlanFor().abortRender` against the frozen spec across all 8 cases, so the three-layer oracle
covers the abort re-render decision as well as construction. **Stage 6f (2026-07-27):** the frozen
`expectedConstruction.outgoing` for the in-flow→overlay cases (home→overlay, browse→overlay, and the
browse→nowplaying modifier) flipped from `real-source` to `app-ghost` in `swipe-plan-spec.mjs`;
`swipe-transition.test.js` compares production `constructionPlanFor().outgoing` against it, and both
generated inventories (`docs/transition-matrix.generated.txt`, `docs/swipe-model.generated.txt`)
regenerated (the in-flow→overlay pairs move from no-pane to a pane; the concrete pane count rose
27→62). The app.js mirrored-region fingerprints in the model are UNCHANGED, which proves app.js was
not touched. **Swipe-declone Stage 1 (2026-07-30) REVERSES this and goes further:** `home→overlay`
and `browse→overlay` flip back to `real-source` (undoing stage 6f), and `home→browse` — `app-ghost`
since stage 4's original wider rule, never touched by 6f — ALSO flips to `real-source` in
`swipe-plan-spec.mjs`; only `browse→browse` still returns `app-ghost`. Both generated inventories
were regenerated again. **Stage 6g (2026-07-27):** the `#home` permanent-promotion invariant (§18) has a SOURCE-TEXT
oracle, `test/home-layer-invariant.test.js` — it reads the TEXT of `css/app.css` (jsdom cannot compute a
stylesheet transform) and asserts the base `#home` rule carries a persistent layer-promoting transform and
that no `{#home, #home.parked}` cascade resolution lands `#home` on `none` (cell PROMO). It is a source-text
gate (in `SOURCE_TEXT_GATES`, `tools/mutation-sweep.mjs`), NOT a runtime-compositing proof — the flash itself
is device-only. **Stage 6h (2026-07-28):** the commit→home scroll-settle gate MECHANISM is
harness-observable — `test/swipe-stage6h.test.js` drives the real commit→home and abort→browse held
reveals under `boot({fakeTimers:true, deferRaf:true})`, delivers a synthetic `scrollend` via
`h.window.dispatchEvent(new h.window.Event('scrollend'))`, and reads the cover pane's DOM presence
plus the `h.clock`/`h.raf` handles across seven cells (GATE/BACKSTOP/STRAND/ONCE/SCOPE/OWN/FASTPATH).
A new harness scroll affordance sets a pre-gesture `window.scrollY` so `cur.scroll0` can exceed
`SETTLE_SCROLL_MIN` (the harness otherwise pins it at 0). The commit books→home FLASH ITSELF is NOT
CI-observable — it is off-main-thread compositor work — and is verified only by the user's device
scroll-down repro plus the drop `via=`/`settle=` log stamp.

**18. Invariants.** classifyTransition emits ONLY current-slice fields `{fromKind,toKind,
decorations}` (no dead §3.3 host fields until a consumer lands — §4.15); its output, the
construction plan, and the finalization plan `finalizationPlanFor().abortRender` are DEEP-frozen
(`Object.freeze`) and independently immutable (§4.11); every descriptor scenario yields a plan or
is rejected with a named reason (I16/§4.3, all seven §15 cases covered); no default branch
(unhandled kind THROWS — `finalizationPlanFor` throws on an unhandled `fromKind` OR `toKind`,
mirroring `constructionPlanFor`'s own-contract guard); same-destination (bare same-v) is
documented impossible-before-the-planner, not a production branch. **Stage 6f (2026-07-27)** adds
the structural invariant: for every reachable in-flow→overlay gesture (browse→overlay, home→overlay,
and their NP-decorated members) the real in-flow source view (`#browse` for a browse source, `#home`
for home) is NEVER a mover and never receives a swipe-written inline transform at any phase; the
outgoing is an owned-pane app-ghost and the real view stays in flow, untransformed, never promoted to
or demoted from a compositing layer by the swipe. This is the OUTGOING half of the §7-step-6
structural fix for the in-flow→overlay family ONLY — the INCOMING real-`#browse` transform
(browse→browse headline, home→browse, overlay→browse) and the browse→home outgoing transform are
still open (§22/§23). **SUPERSEDED (Swipe-declone Stage 1, 2026-07-30):** this invariant now holds
ONLY for browse→browse. home→overlay, browse→overlay and home→browse move their real element
directly instead — the opposite of "never a mover" — because every view is already its own
`position:fixed` inset own-scroll box and a copy bought nothing on those three transitions (it cost
the id-stripped clone's own geometry divergence, the reported cause of this campaign's three
symptoms). See the Stage 1 paragraph in §7. **Stage 6g (2026-07-27)** adds the REVEAL-SCOPED structural invariant for `#home`:
no un-park / reveal transition — any transition that removes `.parked` from `#home` to make it the active
view — leaves `#home` on `transform: none`. The unconditional base `translateZ(0)` holds across the parked↔
un-parked cascade (the more-specific `#home.parked` transform wins while parked; the base rule applies the
instant `.parked` is removed; a mid-drag inline mover transform clears to `''`→ the stylesheet on reset), so
removing `.parked` at a reveal produces no demote frame. The invariant is SCOPED to the reveal cascade and is
NOT "non-`none` in every state": a `nav-in` slide animation (`navTo`/`goBack` → `slideInView`) resolves
`#home`'s transform to `none` at the animation's END frame, but that is an accounted-benign NON-reveal
navigation animation — it composites `#home` throughout the slide and reverts to `translateZ(0)` at
`animationend` (nav.js), so it is not a reveal demote. This scopes an EXPLICIT exception into the "no
promotion on the real in-flow views" invariant for `#home` ONLY (NEW POLICY, EC §4.19); `#browse` stays
governed by the un-promoted invariant. The guarantee is STRUCTURAL (source-text, §17); the flash is
device-only (§22). **Stage 6h (2026-07-28)** adds the commit→home scroll-settle invariant: on a
large outgoing clamp (`cur.scroll0 > SETTLE_SCROLL_MIN`) the held cover is removed EXACTLY ONCE and
NEVER before a scroll-settle signal (a `window` `scrollend`, the bounded `SETTLE_MS` timeout, or the
600ms direct net) has had its chance to fire after the under-cover `scrollTo(0,1)` collapse; the
cover ALWAYS eventually drops (never-strand via the 600ms DIRECT drop); every session-owned reveal
handle is retired at that one drop; and the abort→browse reveal is byte-unchanged (its `opts` absent
→ `settled` defaults `true` → gate reduces to `decoded && painted`). Two bounds hold `SETTLE_MS`:
`< 600` (fires before the never-strand net) and `≥ the snap floor` (or it releases mid-snap and
still flashes) — both device-tuned. This is NEW POLICY (EC §4.19, an async-gate on the reveal
cover-drop); the guarantee is the MECHANISM — the flash going clean is device-only (§22).
**Browse-decouple (PLAN-browse-decouple.md, 2026-07-29):** `#browse` joins `#home`'s fixed-own-
scroll KIND class, but the "no promotion on the real in-flow views" un-promoted invariant is
UNCHANGED for `#browse` — the recipe carries NO `will-change`/transform (css: `#browse`), which
PRESERVES the invariant rather than lifting it; the fixed `.alphaindex` A–Z strip depends on
`#browse` staying un-promoted (a promoted `#browse` would establish a containing block for the
strip and re-parent/misposition it, the `.195`/`.196` break). The Stage 6f/6g "in-flow source
view" language above describes `#browse` BEFORE this stage: `#browse` is no longer in-flow (it is
now `position:fixed`, out of the document's normal flow), but the invariant those stages pin —
`#browse` is never a mover and receives no swipe-written inline transform outside its own
mid-drag mover role — is unaffected by the positioning change and still holds.

**19. Mutation cases.** Registered in `tools/mutate.mjs` (swipe4 F1/F3/F4/F5/F6/F7/no-dead-
fields/F-i/F-ii/§15/§4.11; stage-6d FP/AB — force `abortRender` to `'none'`; RC — drop the
recovery reader's `cur.live` build-ran conjunct; BC-1a/BC-1b — `finalizationPlanFor` no longer
throws on an unhandled `fromKind`/`toKind`; stage-6e DP/attribution — `disposeOwnedPanes`'s own
filter never matches, so it removes nothing; stage-6e BR — `disposeOwnedPanes` broadens to
remove every mover regardless of `own`; stage-6e DEC — the `.np-pill-float` removal in
`js/nav.js` is mistakenly guarded behind `keepGhosts` too; the pre-existing "begin() stops
hard-resetting" mutation re-anchored to also gut the `disposeOwnedPanes` call, still covering
DP/HR/BR's snapshot clause), each mapped to the test it reddens; re-run by
`tools/mutation-sweep.mjs`, anchors gated by `test/mutation-anchors.test.js`. **Stage 6g (2026-07-27)** adds
two: PROMO — neutralise the base `#home` transform in `css/app.css` (`translateZ(0)`→`none`), a SOURCE-TEXT
mutation reddening the `home-layer-invariant.test.js` gate; and REVEAL — make `js/nav.js` `setView` park
`#home` unconditionally so the reveal never un-parks it, reddening the REVEAL integration test. PROMO carries
a `caughtBy: 'home-layer-invariant.test.js'` marker (its catcher is excluded from the behavioural set, so
under the general run it would read UNCAUGHT — jsdom cannot observe a CSS change); the sweep's new
`gateTestsFor()` helper runs the named gate DIRECTLY against the mutated source and counts its reddening as
the catch. This is the GENERAL source-text-mutation verification path (any future source-text mutant names
its own gate the same way), closing the recurring §4.10 gap where a source-text mutant read false-UNCAUGHT →
CI-red.

**20. Known-red behavior.** No swipe known-red todos remain. The two stage-2 NEW-POLICY todos —
I20 (superseding a live drag restores the starting scroll) and I11/I20 (superseding a live
browse→browse drag re-renders the SOURCE into #browse) — were IMPLEMENTED and retired in Stage 6a:
begin() recovers the source inside the Browse hold (re-render iff clobbered + restore scroll, hold
released last, identity nulled last, then arm); their tests are now live green guards in
test/swipe-invariants.test.js and their PolicyLedger entries removed. Still OPEN, unrelated: the
headline aborted-swipe repaint/flash (memory `tomeroam-swipe-repaint-saga`). **Stage 6f
(2026-07-27)** introduced NO known-red — the frozen spec and generated model were updated to the new
`app-ghost` expected values and the suite stays green (new policy, EC §4.19; no PolicyLedger entry,
no `§8A NEW_POLICIES` entry). The headline aborted-swipe repaint/flash is NOT addressed by 6f: it is
the INCOMING real-`#browse` transform (T8-forked), still OPEN.

**21. Current policy-ledger references.** DecisionLog: the staged-review policy; construction-
only planFor phase-split; three-layer oracle + mirror retirement; same-destination
documented-impossible; the stage-6 cleanup debt — release-half done in 6b (settle/reveal timers session-owned + retired), pane-less-supersession + settle-phase identity guard done in 6c; **the finalization-decision extraction done in 6d — `sourceWasClobbered`/`d.clobbered` retired in favour of the declared frozen `finalizationPlanFor(classification).abortRender`, the FIRST finalization field of the rich §3.3 `planFor()`, behaviour-preserving (no PolicyLedger entry, EC §4.19);** **the owner-driven owned-pane disposal done in 6e — `disposeOwnedPanes(session,'superseded')` replaces the DOM-global `.nav-ghost` sweep's owned-pane effect at the `begin()`-recovery site, behaviour-preserving (no PolicyLedger entry, EC §4.19);** the null-write/listener half + pane-owning supersession (release half) + the finalization remainder deferred to 7.

**22. Explicitly out of scope.** Cross-device sync; the visual flash bug's root cause
(separate open investigation); playback; the nav stacks themselves (Nav). **Stage 6f note (2026-07-27):** 6f removes the OUTGOING
real-in-flow-view transform on in-flow→overlay transitions (a structural step on the transform axis),
but does NOT fix the compositor flash. The flash is compositor-level and invisible to CI/local
instrumentation; its confirmation is device-only and downstream; and the ghost-teardown/layer-demotion
suspect remains open on device — finalize yanks a full-viewport composited ghost in one frame (Loki
observation). Structural-green (no swipe transform on the real view) is not a flash fix.
**Swipe-declone Stage 1 note (2026-07-30):** 6f's in-flow→overlay ghost is ITSELF now superseded —
home→overlay and browse→overlay move their real element again, so the "no swipe transform on the
real view" property no longer holds for them at all (see §18). The ghost-teardown flash suspect Loki
named is correspondingly moot for those two transitions (there is no ghost to tear down); it remains
live only for browse→browse, unaffected by this stage. **Stage 6g note
(2026-07-27):** one flash CAUSE is now addressed — the home→books ABORT flash was the `#home` un-park DEMOTE
(removing `.parked` dropped `#home`'s compositing layer → iOS re-raster). Keeping `#home` a permanent layer
(§7/§18) eliminates that demote. This is DEVICE-CONFIRMED for the `will-change` probe form (build `.256`
controlled A/B); the SHIPPED `translateZ(0)` form is expected navbar-safe by the same argument but its device
confirmation is still OWED (plan §9b). The other felt Home flashes REMAIN, distinct causes: the commit
books→home flash is the home-SNAPSHOT pane teardown (a DIFFERENT cause — it still flashes WITH the `.256`
`#home` promotion probe live, so it is not the un-park demote; its own controlled experiment owed), and the
incoming-`#browse` headline flash (browse→browse, home→browse) is the T8-forked incoming-transform work.
Neither is fixed by 6g. The eliminated demote is CI-proven only as the STRUCTURAL invariant (§17/§18); that
it WAS the abort flash rests on the device A/B, not the suite. **Stage 6h (2026-07-28):** the commit
books→home flash (flash A) is now GROUNDED (Linnaeus, `Claude/Linnaeus/PROBE-scroll-clamp-reveal.md`)
as an iOS COMPOSITOR scroll-collapse snap: `applyScreen(home)` collapses the document (tall `#browse`
→ short `#home`) and clamps scroll under the cover, and the compositor is still scroll-snapping when
the main-thread double-`rAF` paint gate drops the cover. The device scroll-dependence oracle (flashes
only when the list is scrolled DOWN, clean from the top) confirms this and RULES OUT the earlier
snapshot-content-fidelity suspect (a clone/real mismatch would flash at any scroll position). This
SUPERSEDES the 6g note above that described the same flash as the 'home-SNAPSHOT pane teardown'.
Stage 6h ships a DEVICE-PENDING mechanism fix — the conditional scroll-settle cover-gate
(§7/§10/§18) — NOT a confirmed flash fix: efficacy waits on the device repro being clean AND the
`via=`/`settle=` log showing the intended path. The THREE Home flashes stay DISTINCT ROOTS: A commit
books→home = this scroll-clamp compositor snap (device-pending fix); B abort home→books = the `#home`
un-park layer demote (mitigated by Stage 6g's permanent `#home` compositing layer, device-owed); C
abort books→books headline = the incoming real-`#browse` transform (T8-forked, deferred).

**Browse-decouple (PLAN-browse-decouple.md, 2026-07-29):** flash A (the commit books→home
scroll-clamp compositor snap) is removed BY CONSTRUCTION, not by a settle gate — the clean,
permanent form of the device-proven `.266` stable-height probe (superseding
`PLAN-stableheight-probe.md`). Active `#browse` is now `position:fixed` (§7/§18), so it never
drives the document height; hiding it on `→home` cannot collapse the document, so there is no
scroll to clamp and no compositor snap to catch. This is DEVICE-PROVEN for the DIRECTION (the
`.266` probe achieved the same removal by pinning the document tall per-transition) but the
decouple's own clean-repro confirmation is a separate device gate (R-flash, downstream of this
build). Flash B is unaffected (a `#home` un-park layer concern, unrelated to `#browse`'s scroll
model). Flash C (the browse→browse abort in-list `letterhead` divider re-raster) is explicitly
UNCHANGED and stays open — it is the abort re-render/demote/teardown compositor re-raster of the
whole `#browse`, coupling-independent from the window-scroll removal this stage makes.

**23. Conditions requiring revision.** Stage 5 (move the pane builders into swipe.js — done); stage 6
finalization half: the `abortRender` field is DONE (Stage 6d — `finalizationPlanFor(classification)
.abortRender`, the abort/recovery re-render decision, retiring `clobbered`/`sourceWasClobbered`). The
pane-lifecycle interface's `dispose(reason)` half is DONE for its one live consumer (Stage 6e —
`disposeOwnedPanes(session,'superseded')` on a pane-owning DRAGGING supersession). Still owed: the
paint-gated `release()` half (the flash core, C); the SETTLING/REVEALING pane-owning supersession (B);
the full pane OBJECT `{kind, element, source, pin, equivalence}` (dead members, no consumer); the
remaining `dispose(reason)` enum members `{'lease-invalid','destination-gone','finalize-threw'}` (G) and
routing the orphan `'hard-reset'`/decoration removal through the typed disposer; `paneRemovalPolicy` as a
finalization-plan field; `commit` screen/scroll, `abort` scroll as a plan field, `stackEffect`,
`reveal`, the unified rich `planFor()` wrapper, and reintroducing `sourceHost`/`destinationHost`/
`sameBrowseHost` with their consumers (the pane/lease/source-resolution slice) — none of those has a
current consumer, so each returns in the commit that first reads it (§4.15). A production guard for the
unguarded stranding invariant named in §14 (Loki residual 2) is also owed, routed to a plan amendment.
Also: any change to navTo's push/replace rule (the same-destination-impossible argument depends on it);
adding a screen kind or a parameterized descriptor family; a synchronous rewrite of `Browse.render` or
`env.renderDestination` (reopens §14's residual). **Stage 6f (2026-07-27)** opened the STRUCTURAL-FIX
axis (never transform the real in-flow view) with its first slice — the in-flow→overlay OUTGOING is
now an owned-pane app-ghost, so the real `#browse`/`#home` is never a mover on browse→overlay/
home→overlay (and their NP members). **SUPERSEDED (Swipe-declone Stage 1, 2026-07-30): the opposite is
now true — home→overlay and browse→overlay move their real element directly; the ENUMERATED overlay-
background precondition below is now moot for this axis** (there is no ghost for those transitions to
exclude an overlay from). It rests on an ENUMERATED precondition: all seven overlay kinds
(`options`, `nowplaying`, `general`, `playback`, `buffering`, `downloads`, `diagnostics`) paint an
opaque `background: var(--page-bg)` over their own rect (css/app.css, verified at HEAD). A kind-level
`constructionPlanFor` flip cannot exclude a single overlay, so any change to an overlay's background,
or adding a new overlay kind, REOPENS this precondition and must re-verify it. The no-peek for the
vertically-INSET overlay destinations (`options` z25, the five settings subs z26) is DEVICE-VERIFIED
only — the translucent topbar (z30, ~0.86 opacity + blur) and navbar (z40) bands can expose the
now-stationary untransformed real view; `nowplaying` (full-viewport z60) has no band exposure. Still
owed on this axis: the browse→home OUTGOING transform (its commit takes the home-reveal HOLD path);
the INCOMING real-`#browse` transform (browse→browse headline [T8-forked], home→browse,
overlay→browse); and workstream C (I10/I17 paint-gated reveal centralization, the flash core).
**Stage 6g (2026-07-27)** makes `#home` a permanent compositing layer via `#home { transform: translateZ(0) }`
(§7/§18). Conditions that REOPEN the `#home` reveal invariant: any change to `#home`'s background or promotion
(a rule setting `#home` transform to `none`, e.g. a future `!important none` or a more-specific un-parked
rule, breaks the cascade — the PROMO source gate detects it); a new `position:fixed` descendant OF `#home`
that must resolve against the viewport (a permanent transform makes `#home` its containing block — today
benign only because the navbar/`#player`/`#nowplaying` live OUTSIDE `.app`, and `.alphaindex` lives in
`#browse`, not `#home`); switching the promotion from `translateZ(0)` back to `will-change` (reintroduces the
droppable-hint reclaim path). The source-text invariant is verified by `test/home-layer-invariant.test.js`
(cell PROMO), and 6g added the GENERAL source-text-mutation verification mechanism to `tools/mutation-sweep.mjs`
(`caughtBy` + `gateTestsFor()`) — see §19. DEVICE-owed: the shipped `translateZ(0)` form's navbar-safety and
active-home text quality (plan §9b). `#browse` remains un-promoted; its INCOMING/headline flash is still open.
**Stage 6h (2026-07-28)** conditions that REVISE the commit→home scroll-settle gate: whether iOS
emits `scrollend` on an INSTANT programmatic `scrollTo(0,1)` (if it does not, the gate degrades to
the `SETTLE_MS` heuristic hold — read off the device `via=`/`settle=` log); whether `scrollend`
fires late enough to cover the compositor re-tile (if not, the deferred lever is a post-`scrollend`
N-frame hold, honestly a heuristic); and tuning `SETTLE_MS` DOWN toward the snap floor if `via=settle`
dominates and the ~100ms hold is perceptible on the common scrolled-back-to-Home path. `SETTLE_SCROLL_MIN
= 0.5·window.innerHeight` is a LOOSE device-tuned threshold captured once at closure definition — it can
go STALE after a viewport rotation (Poirot watch); acceptable for a fuzzy engagement boundary whose only
hard requirement is that `cur.scroll0 ≈ 0` takes the fast path. Details: `Claude/Plans/PLAN-swipe-stage6h.md`.
