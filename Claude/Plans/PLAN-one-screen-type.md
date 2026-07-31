# PLAN — one screen type: Options and its subs become `.browsepage` peers

**The decision (settled, not re-opened).** `Claude/Decisions/DecisionLog.md`, final entry, 2026-07-30:
**all screens are the same type.** `#options` and the five settings sub-screens become peers of the
same kind as a `.browsepage` — swapped one at a time, never co-visible, painting no background of
their own. **Now Playing stays unique**, decided against derived facts
(`Claude/Linnaeus/PROBE-np-uniqueness.md`); nothing in this plan touches `.nowplaying`.

**The defect this closes.** Their present additive-overlay form produced a device screenshot with the
Options hub and the General sub-screen rendered through each other simultaneously. The mechanism is
`js/nav.js:83` — `#options` is deliberately kept mounted underneath its own sub-screen.

**Why this is smaller than it looks.** `#options` (`css/app.css:215-217`) and the five subs
(`css/app.css:780-782`) already declare the **exact same two-bar inset geometry** as `#home`
(`css:162-164`) and `#browse` (`css:185-187`), and each is already its own `overflow-y: auto`
scroller. They are already six real, separately-transformable fixed boxes. Becoming peers is
therefore **four deletions and one guard edit** — no new host element, no new geometry, no new
markup. The plan is long because the deletion list, the transition-kind consequences and the honest
device-owed set are long; the product change is not.

<!-- vitruvius-gate {"plan_type":"refactor",
  "patterns":{"boundary_relocation":true,"callee_replacement":false,"contract_shape":true,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/nav.js:45-95","js/nav.js:127-155","js/swipe.js:56-63","js/swipe.js:91-117","js/swipe.js:146-183","js/swipe.js:196-205","js/app.js:478-498","js/app.js:515-539","css/app.css:207-227","css/app.css:772-791"],
  "callee_ranges":[],
  "affected_contracts":["test/fixtures/swipe-plan-spec.mjs:58","test/page-bg-single-painter.test.js:25","test/page-bg-js-painter.test.js:4","test/nav.test.js:36","test/swipe-declone-stage1.test.js:70","test/swipe-stage6d.test.js:148","docs/transition-matrix.generated.txt:12","docs/swipe-model.generated.txt:62"],
  "staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Zelda/Board.md","Claude/Decisions/DecisionLog.md"],
  "blocking_questions":["ONEPAGE","PEERPARK","PEERFINALIZE","FILMSTRIPDRAG","NPPARKS","NPRECONCILE","NOSETTINGSBG","NPUNTOUCHED","OVERLAYISNP","KINDPLAN"]} -->

## Status — stated PER STAGE

A plan-review certifies the stages that existed when it ran. This plan has gained stages since its
first review, so one document-wide status line cannot be true; each stage carries its own gate state.

| Stage | Plan-review gate | State |
|---|---|---|
| A1, A2, B | `Claude/Charpy/PLAN-one-screen-type-charpy.md`, commit `e979a41`, 2026-07-30 — **TEMPER**, findings folded (§6 migration set completed; the `browseWillHide` edges enumerated; `PEERFINALIZE` added with its binding ordering; §16.4's strike re-aimed) | A1 **SHIPPED** `c4cfd7e`, build `2026-07-30.280`, device-confirmed. A2 and B not built. |
| A1-fix, A1-fix-r2 | No separate plan-review. Gated instead by the adversary: `Claude/Loki/STRIKE-one-screen-type.md` **KILLED** the A1-fix predicate; r2 (§5.4) is the replacement. | Both **SHIPPED** — `.282` and `.284`. **Device gate step 6f is OWED.** |
| **A1b** | `Claude/Charpy/PLAN-one-screen-type-A1b-charpy.md`, commit `35f0005`, 2026-07-31 — **TEMPER**, six Structural findings (F1–F6) | **Findings folded 2026-07-31, this revision** (fold summary below). **Re-review OWED before build.** |

**A1b cannot be built on a TEMPER, and that is mechanized.** `Claude/Campaigns/one-screen-type-a1b.json`
declares a `plan-review` gate whose `acceptVerdict` is `FORGE` alone, and
`tools/hooks/stage-has-manifest-check.mjs` blocks a build artifact for a stage whose manifest gate is
unmet. Step 1 of §13 is therefore **not discharged for A1b** and step 8 does not open until it is.

**Why the per-stage split exists.** §5.3 (Stage A1b) was added in commit `8e9b4b6`, *after* the review
at `e979a41`, while the header still read "PLAN_READY — reviewed (TEMPER)". A reader arriving at step
8 would have seen a plan certified ready and built an unreviewed stage. The mechanical guard now
exists; this table is the same fact in the record, and it is the reason the record is kept per stage
rather than per document.

**What the A1b fold changed — the answer a reader needs first: the stage's DESIGN did not move.**
A1b's product change is what it was: delete the two `if (!npOpen)` guards in `setView`
(`js/nav.js:51` and `js/nav.js:78`). No guard was added, no ordering changed, no cell's subject moved
because of the fold. What changed is the plan's **justification** (F2, F3 — a central premise was
false and is replaced by the supersession that actually licenses the change), its **enumerations**
(F4 five `browseWillHide` edges, F6 the casualty census), its **deletion list** (F5's three shipped
comment sites, plus a fourth the probe's supersession surfaced — no behaviour in any of them), and its
**honest cost** (F10 — a third device-owed hazard, on the abort). **The commit's file set grows by
four comment scrubs across three files** (`js/nav.js`, `js/app.js`, `css/app.css`); its behaviour does
not.

**Stage A1 is SHIPPED** — commit `c4cfd7e`, build `2026-07-30.280`, CI green, device-confirmed
("Options screens seem to work as one would expect"). The reported two-screens-through-each-other
render is gone and A1 is not revisited.

**Stage A1b is added, 2026-07-31, and is the next stage.** A1's transparency exposed a pre-existing
defect it did not cause: Now Playing is the last screen still exempt from parking what is beneath it,
so an aborted NP gesture leaves screens un-hidden and they accumulate — photographed twice on device
as three-plus screens rendering through each other mid-swipe. §5.3 derives the mechanism, shows the
exemption buys nothing any close path needs, and removes it.

**⛔ NOW PLAYING STAYS UNIQUE, and A1b removes the parking exemption ONLY.** NP keeps every property
the decision names — its background, its `inset: 0`, its `z-index: 60`, its coverage of the topbar and
the transport — and keeps **every one of the 24 load-bearing differences the probe itemises at HEAD**
(`PROBE-np-uniqueness.md` §9.3). **A1b deletes one thing: its exemption from parking and hiding what
is beneath it.**

**What A1b does re-open, stated plainly because an earlier draft of this plan denied it.** The
exemption *was* on the derived list the user's decision incorporates by reference: the probe marked
§4.2, the settings-loop guard, **load-bearing**. An earlier draft asserted three times that
"additivity was never among the reasons given for NP's uniqueness". **That assertion was false**, and
this revision removes it rather than softening it. What licenses A1b is not that the mark never
existed but that it has since been **superseded on a derivation of its own**:
`Claude/Linnaeus/PROBE-np-uniqueness.md` §9.1 retires 4.2 to `context` because the reason the mark
gave — "stays mounted under NP for the back-reveal" — is refuted at its root (§5.3.2, and the
supersession's own shorter proof). The user is entitled to see that an item their decision ratified
is being retired, and to see the derivation that retires it. See §1.

**Stage A1's code review returned FIX-THEN-SHIP** (`Claude/Poirot/c4cfd7e-one-screen-type-stageA1.md`,
2026-07-31). The §8 hard constraint HOLDS and is doubly gated, and the six-way loop is genuinely
exclusive — both verified by execution. Four findings are folded here. **F1 is a live shipped defect
A1 introduced** and becomes **Stage A1-fix** (§5.4), which lands *ahead* of A1b: `overlayFilmstrip`'s
uncancelled reconcile makes `applyScreen` run during an active drag, and A1's narrowed guard then
`display: none`s the incoming mover for the rest of the gesture. F2 (an exclusivity universal in three
shipped prose sites), F3 (mutant/cell casualties this plan wrongly denied — §6a) and F4 (a superseded
comment in HEAD) are folded as corrections. **§5.3.5 is corrected outright: `showAppView`'s sweep is
LIVE and is KEPT** — its live case is the `overlayFilmstrip` window, not Now Playing, proven by
running it, and A1b provably cannot kill it.

**The A1-fix was struck and KILLED** (`Claude/Loki/STRIKE-one-screen-type.md`, 2026-07-31, executed
with controls green). Its predicate guards **drag liveness** where the resource is **session-scoped**:
`d` is nulled at finger-up (`js/app.js:618`) while the session still owns and animates the movers
through settle, so a pending filmstrip net firing in that gap hides the *committed* destination
mid-snap and it pops back in at the fallback finalize. **Stage A1-fix-r2** (§5.4) replaces the
predicate with the session-ownership form. §5.4a records why the derivation missed it — suppression is
per-firing, not a transfer of duty — and names the pattern on its **second instance**: a guard and the
value it protects scoped to different lifetimes.

**Stage A1-fix-r2 is SHIPPED** — build `2026-07-31.284` (plan §13 step 6e): the predicate is replaced,
not supplemented, with `!!session && session.live` and renamed `gestureOwnsMovers` (with its injected
dep). All three `FILMSTRIPDRAG` windows are green; the settle-window mutant (`FILMSTRIPDRAG-c`, #113)
is registered and killed by its declared cell, and the two rotting anchors (`#111`, `#112`) are
re-transcribed and pass the anchors gate. `js/nav.js`'s two rewritten invariant comments (the
`resetSwipeStyles` header and the `overlayFilmstrip` header) now state ownership on the session's
lifetime, not the drag's. **Device gate step 6f (the flick-release band, ~125–340ms after the tap) is
owed** — CI proves the mechanism in jsdom; the look on glass is the device's.

Six stages, each independently shippable and independently device-testable. A1 (shipped) makes the
settings screens exclusive and transparent. A1-fix (shipped, `.282`) suppressed the reconcile during
the live drag. **A1-fix-r2 (shipped, `.284`) corrects the predicate to the ownership lifetime.** **A1b
makes Now Playing park the page beneath it.** A2 removes the now-dead stacking. B retires the
`overlay` classification for everything but Now Playing.

## Index

1. Defining records and authority
2. Applicability
3. How `.browsepage` peers actually work — derived from source
4. Exact scope boundary — MOVES / STAYS / SPLIT / DEFERRED
5. Target design — what Options becomes, and (5.3) Now Playing parking the page beneath it
6. Contract change
7. Value and ownership ledger
8. Ordering
9. Runtime-dependency policy
10. Lifecycle and ownership
11. The transition-kind consequences
12. The deletion list
13. Staged sequence with owners
14. Coverage and mutation matrix
15. Risk, and what only a device can settle
16. The gate — specification only
17. How this changes the assumptions of `PLAN-swipe-declone.md` Stage 2

---

## 1. Defining records and authority

| Record | Standing | Reconciliation |
|---|---|---|
| `Claude/Decisions/DecisionLog.md:1147-1167` — "ONE SCREEN TYPE, with Now Playing the deliberate exception", 2026-07-30, USER DECISION | **Governing** | Highest authority. It settles both the approach and the exception. This plan chooses only the sequence and the mechanism. **Two of its clauses bind this plan directly.** `:1162-1163` incorporates the probe's load-bearing set **by reference**, so retiring a member of that set is a change to what the decision rests on and must be visible (F2 — see the supersession row below). `:1167` states *"do not cite its background as its distinguishing property"*, which this plan violated in three places and no longer does (F3). **The entry is NOT rewritten by this plan** — amending a ratified USER DECISION is the user's call. |
| `Claude/Decisions/DecisionLog.md:1195-1213` — "A BY-REFERENCE ITEM OF THE NOW-PLAYING DECISION IS SUPERSEDED", 2026-07-31, records pointer | **Governing, and the correct citation for the superseded parts** | **AGREE, and this is the record to cite rather than the ratified entry.** It records that one member of the by-reference set is retired (4.2) and one added (1.9), and it names two sentences of the ratified entry as now stale — `:1157-1158`'s "the background is SHARED with `#options` and all five subs" (false at HEAD since Stage A1) and `:1162`'s "Thirteen" (the wrong number). **Where this plan needs either fact it cites this entry, never the stale sentences.** The three-co-required-properties derivation at `:1158-1161` holds unchanged at HEAD and is cited directly. |
| `Claude/Linnaeus/PROBE-np-uniqueness.md` §7.3, §9.2 | Derived fact sheet, gates this design | **AGREE.** §7.3 is the load-bearing fact: an ordinary two-bar-inset screen at z25/z26 could not cover the topbar or the transport for two independent reasons, so removing the background and the z-index from the settings screens cannot change what covers those bars — the settings screens never covered them. §9.2 confirms both reasons hold unchanged at HEAD. |
| Same record, §4.2 (`:115-117`) and its §8 entry | Derived fact, **ratified by reference** | **CONFLICT, resolved by dated supersession — not by assertion.** §4.2 marked the settings-loop guard (`js/nav.js:78` at HEAD) **load-bearing**, and §8 carried it into the set `DecisionLog:1162-1163` incorporates. That is the guard §12 item 26 deletes, so an earlier draft's claim that the exemption "is not on the probe's list" was **false**. Resolved at the record: **probe §9.1 retires 4.2 to `context`**, on the ground that `hidden` is added to `#nowplaying` in exactly one place (`js/nav.js:81`) and the same synchronous `setView` body clears `hidden` from the destination three lines earlier (`js/nav.js:78-80`) — so the destination is mounted at the instant NP is hidden **on every path**, and the mark's stated reason is refuted at its root. **The bound is narrow and this plan states it narrowly:** the claim was true for the *park* guard (`js/nav.js:51`, §12 item 25 — probe §4.1, marked **context**) and false for the settings-loop guard. |
| Same record, §1.9 (`:245`, superseded by §9.2) | Derived fact | **AGREE at HEAD, after a mark change in the opposite direction.** 1.9 (NP's background) was `context / not a difference — shared with six screens`, correct when derived at `288504e`. **Stage A1 removed the six shared declarations**, so probe §9.2 **promotes 1.9 to load-bearing**: at HEAD `--page-bg` is declared by `body::before` (`css/app.css:44`) and `.nowplaying` (`css/app.css:510`) alone, pinned by `test/page-bg-single-painter.test.js:28`. **The distinction this plan must get exactly right:** the background IS load-bearing, and it is STILL not NP's *distinguishing* property (`DecisionLog:1167`). It is one of **three co-required properties for covering the bars** (`DecisionLog:1158-1161`), which is a different claim. S4 states it that way. |
| Same record, §8 and §9.3 — the size of the load-bearing set | Derived fact | **CONFLICT with every count this plan previously used, resolved at the record.** The number is **24 distinct load-bearing facts in 16 grouped entries** (probe §9.3, enumerated there in full). It was never thirteen: the §8 heading's "13" matched neither its own list (15 groups) nor the body's marks (24), and §4.3 (`np-locked`) was marked load-bearing in the body while missing from the list. **The two mark changes cancel** — 4.2 leaves, 1.9 joins — so the supersessions do not move the total. Every count in this plan reads 24. |
| `PLAN-swipe-declone.md` §17 — "The additive-overlay premise is void, and nothing here depends on it" | Ratified, Stage 1 built | **AGREE, and it is the precedent.** It already re-derived by reading that with `#home` and `#browse` both `position: fixed`, no in-flow view drives document height, so hiding a view cannot shrink the document and the stated iOS-26 premise no longer holds. It deliberately did not act on it. This plan is the act. Re-verified independently in §15 R-A. |
| `js/nav.js:50-55` — the `setView` comment asserting the additive model is required because "hiding the tall view shrinks the document" | Subordinate source comment | **CONFLICT with HEAD, resolved by deletion.** Every screen under `#library` is `position: fixed` (`css:161`, `184`, `215`, `780`, `506`), so `#library` contributes no flow height and `.app`'s `min-height: calc(100% + 12vh)` (`css:75`) is the whole document height. The premise is false at HEAD. Scrubbed in Stage A1. |
| `css/app.css:220-221` and `css/app.css:785-786` — "these sub-screens are ADDITIVE overlays that paint over a live, un-parked page underneath, so they need their own background" | Subordinate source comments | **AGREE with HEAD, and both become false the moment A1 lands.** They are accurate descriptions of the current mechanism, which is what is being removed. Deleted with the declarations they justify, not left behind. |
| `Claude/Subsystems/swipe-reveal.md:396-403` — Stage 6f's ENUMERATED precondition that all seven overlay kinds paint an opaque `--page-bg`, and that any change to an overlay's background REOPENS it | Subsystem contract, live trigger | **REOPENED BY THIS PLAN, and already resolved in the same record.** Lines 393-396 record that Swipe-declone Stage 1 SUPERSEDED 6f on this axis — home→overlay and browse→overlay now move their real element directly, so "the ENUMERATED overlay-background precondition below is now moot for this axis (there is no ghost for those transitions to exclude an overlay from)". The trigger fires, is answered by the superseding entry plus A1's park/hide, and the residue is device-owed (§15 R-C). Recorded so this is not read as an unnoticed violation. |
| `test/page-bg-single-painter.test.js:25-29` | Live gate, pins the current split | **CONFLICT by design.** Its `OPAQUE_SELECTORS` is the exact pin the decision reverses. It changes with this work to `body::before` + `.nowplaying`; §16 specifies the replacement. |
| `test/nav.test.js:36-44` — "a sub-screen keeps the Options hub MOUNTED underneath it (build .106)" | Live test asserting the old arrangement | **CONFLICT by design.** This test asserts the co-visibility the decision abolishes. Its assertion inverts; its `.106` rationale (a forward slide-in exposing the base view) is separately checked in §15 R-D. |
| `Claude/Subsystems/swipe-reveal.md:407` — "`#home { transform: translateZ(0) }`" | Subsystem contract | **CONFLICT with HEAD, out of scope, recorded not fixed.** `css/app.css:133-141` records that `translateZ(0)` flashed on device and was reverted; `css:168` ships `will-change: transform`. This plan neither depends on nor changes it. Named so the next reader of §15 R-E does not take line 407 as current. |
| Commit `6c9e7e3` and its revert `2700b5c` — a prior attempt at this change | Executed history, materially defines acceptance | **AGREE, and it is the sharpest constraint in this table.** `6c9e7e3` parked `#home`/`#browse` **and** removed both backgrounds — two of the three things A1 does — and was reverted because "the hub and the sub render on top of each other simultaneously, statically, making Options unusable. The parking added in the same commit parks `#home`/`#browse` beneath the overlay stack; it does not help when one overlay sits on another." **The park was never the missing piece; `js/nav.js:83` was.** This plan differs from the reverted attempt in exactly one respect that matters — §12 item 11 deletes the hub-under-sub line — and that single difference is what makes A1 correct where `6c9e7e3` was not. §8 ordering 5 carries it as a hard constraint. |
| **GAP** | — | No record states why a settings screen needs a `z-index` at all once nothing lives underneath it. `css:210` and `css:775` give the reason as covering page content and stacking a sub above the hub — both of which this plan removes. The gap is closed by removing the z-index with its two stated causes (Stage A2), not by keeping it unexplained. |

## Applicability

*(Section 2. The heading is unnumbered because the authoring gate matches it literally.)*

- **boundary_relocation: true** — the responsibility for occluding whatever is behind a settings
  screen relocates from that screen's own `background` declaration to `js/nav.js` `setView`'s
  park-and-hide swap. Ledger in §7.
- **callee_replacement: false** — no function is replaced by a callback, adapter, event or
  indirection. `setView` keeps its one call site set and its one body; a condition inside it is
  narrowed and one branch is deleted. Nothing is routed through a new layer.
- **contract_shape: true** — `Swipe.kindOf`'s output domain gains a member and `NAV.isOverlay`'s
  membership narrows to one screen, which changes `classifyTransition`'s `fromKind`/`toKind`/
  `sourceHost`/`destinationHost` value domains and the structural-case set of the frozen spec
  `test/fixtures/swipe-plan-spec.mjs`. §6.
- **state_transfer: false** — no stored value moves owner. Each settings screen keeps its own
  `scrollTop` on its own element, exactly as today; the entry-time reset at `js/nav.js:147` is
  unchanged.
- **async_change: false** — no asynchronous surface changes shape. The settle rAF, the
  transitionend/340ms finalize race and the reveal hold are untouched. `overlayFilmstrip`'s
  rAF + 340ms safety net (`js/nav.js:186-193`) is unchanged in timing and structure.
- **persistence_migration: false** — nothing here is persisted. Screen visibility is in-memory
  class state.
- **lifecycle_ownership: true** — `Browse.deactivate()` gains **five** trigger edges across A1 and A1b
  that it does not have at the pre-A1 baseline. **All five are enumerated once, in §9, and every other
  section defers to that enumeration rather than restating a count** — three sections previously
  carried three different numbers, which is what let the fifth edge stay unnamed. Three come from A1
  (button-nav browse→settings; the abort of a `settings→browse` gesture; the `NP→files` abort residue),
  two from A1b (opening NP while Browse is showing; supersession while NP is the current screen), and
  A1b **relocates** the third rather than adding a fourth. The settings screens' mounted set shrinks
  from two to one. §10.

## 3. How `.browsepage` peers actually work — derived from source

This is the pattern being copied. Derived from `js/browse.js` and `css/app.css` rather than assumed.

**3.1 — The host owns the box; the pages own nothing.** `#browse` is a `position: fixed` inset
own-scroll box (`css/app.css:184-190`): `top: calc(var(--safe-top) + 51px)`,
`bottom: calc(var(--nav-h) + var(--nav-pad))`, `overflow-y: auto`, `max-width: 640px`. It
**deliberately declares no `z-index`** (`css:177-183` states the reason: plain `position: fixed`
creates no stacking context, so `.alphaindex` at z24 and `#home` at z20 stay in the root stacking
context) and **declares no background** (pinned by
`test/page-bg-single-painter.test.js:25`).

**3.2 — A page is a bare `div.browsepage`.** Created at `js/browse.js:494-497`
(`page.className = 'browsepage'`, appended to `o.mount`). Its **only** CSS rule in the whole
stylesheet is `.browsepage.parked` (`css/app.css:86-91`) — the gesture-scoped off-viewport park.
There is no base `.browsepage` rule at all: a page declares no position, no inset, no scroller, no
z-index and no background. It is an ordinary in-flow child of the host.

**3.3 — Exactly one page is on screen, by construction.** `Browse.showPage(key)`
(`js/browse.js:299-303`) is one loop over the whole cache:

```
for (const [k, v] of pageCache) {
  const away = k !== key;
  v.el.classList.toggle('parked', away && holdRows);
  v.el.classList.toggle('hidden', away && !holdRows);
}
```

Every page except `key` is marked away; `key` is marked neither. `offscreen(el)`
(`js/browse.js:207`) is `hidden || parked`, and `activeEntry()` (`js/browse.js:208-211`) returns the
first non-offscreen page. Co-visibility is impossible because the same loop that shows one hides all
the others — there is no separate "hide the previous one" call that could be skipped.

**3.4 — They need no background because nothing live is behind them.** The other pages are
`display: none` (`css:77`) or parked off-viewport, `#home` is parked off-viewport
(`css:127-131`, `transform: translateX(-101vw)`), and `#browse` itself paints nothing. What shows
through is `body::before` — the one fixed, never-moving `--page-bg` painter (`css:42-46`). A page
that painted its own copy of the gradient would render it at its own box's scale and origin and
would move with it during a swipe; that is the defect
`test/page-bg-single-painter.test.js:13-16` exists to prevent.

**3.5 — `Browse.deactivate()` and `d.browseWillHide` are the lifecycle seam, not the visibility
mechanism.** `js/nav.js:60-65` calls `d.browseWillHide()` — wired to `Browse.deactivate()` at
`js/app.js:2870` — on the shown→hidden edge only, **before** `display: none` lands, because a hidden
box measures zero and the virtual controller captures its scroll anchor from real geometry
(`js/browse.js:320-332`). Re-entry activation is deliberately **not** driven from there; it is owned
by `showPage()` (`js/browse.js:304-318`), which activates the exact page being rendered.

**3.6 — The peer property in one sentence.** A `.browsepage` peer is a screen that **declares no box
of its own, no stacking of its own and no background of its own**, is shown by removing one class and
hidden by adding it, and is never co-visible with a sibling because one operation decides all of
them. Only the first clause is architecturally about a host: `#browse` supplies the box because a
`.browsepage` has none. **The settings screens already have their own box, identical to `#browse`'s.**
That is why they need no host to become peers — §5.

## 4. Exact scope boundary — MOVES / STAYS / SPLIT / DEFERRED

**MOVES.** Occlusion responsibility for the settings screens, from each screen's own
`background: var(--page-bg)` declaration to `setView`'s park-and-hide swap (Stage A1). Stacking
responsibility, from explicit `z-index: 25`/`26` to root-stacking-context DOM order (Stage A2). The
settings screens' membership in the swipe's screen-kind taxonomy, from `overlay` to a kind of their
own (Stage B).

**STAYS, and is not touched by any stage.** `.nowplaying` — every declaration, its geometry, its
`z-index: 60`, its `inset: 0`, its `background: var(--page-bg)`, its `display: flex` column layout,
its retained native scrollbar, its touchmove bounce guard, `body.np-locked`, the navbar takeover, the
pill and the pill clone, the `npOpen` module flag and its six playback-UI consumers, and the
`$('nowplaying')` hidden toggle. Each settings screen's inset geometry, padding, own scroller, `scrollbar-width: none`
membership and entry-time `scrollTop = 0` reset. `overlayFilmstrip` (`js/nav.js:175-194`) and both
its call sites. `Nav.SETTINGS_SUBS`, `isSub`, `overlayEl`, `viewElFor`, `renderScreen`, every hub row
and every back button. The `#home.parked` recipe and `.browsepage.parked`.

**MOVED OUT OF "STAYS" AT STAGE A1b — recorded as a correction, not a silent change.** An earlier
draft of this section listed two things as permanently retained. A1b changes both, and saying so
plainly is cheaper than leaving a reader to find the contradiction:

- **The `if (!npOpen)` exemption was described as "what makes NP's uniqueness work", surviving
  verbatim. That was wrong, and so was the first attempt to say why.** The exemption is not what makes
  the NP-back reveal work: every NP-close path restores its own destination without it (§5.3.2), and
  the shorter proof is a property of `setView`'s own body — the destination is un-hidden three lines
  before Now Playing is hidden, in one synchronous block (`js/nav.js:78-80` then `:81`;
  `PROBE-np-uniqueness.md` §9.1). **What must not be said is that the exemption was never counted
  among NP's load-bearing differences.** It was — as probe §4.2 — and the correct account is that the
  mark is **superseded** (§1). A1b deletes the exemption (§12 items 25–28).
- **`showAppView`'s stale-settings sweep (`js/app.js:498`) was listed as "not dead — its live case is
  the NP one." That attribution was wrong, and the sweep STAYS.** The code review proved by execution
  that its live case is the **`overlayFilmstrip` window**, not Now Playing, and always was: `closeSub`
  (`js/app.js:171-178`) pops the nav stack *before* filmstripping, so both panes are un-hidden with
  `currentDesc() === 'options'`; a back-swipe started in that window with a browse destination reaches
  `showAppView`, whose sweep hides the lingering sub. **A1b provably cannot make it dead** — that path
  never opens Now Playing, and A1b only deletes two `if (!npOpen)` guards, which are already taken
  when `npOpen` is false. **Determination: KEEP. Closed, not routed** (§5.3.5).

**SPLIT across the seam.** `NAV.isOverlay` — its **name** and its **only consumer** separate in
Stage B. It stays a pure name-check in `js/nav.js`, but the thing it identifies stops being "an
additive overlay" and becomes "Now Playing". `Swipe.kindOf` (`js/swipe.js:58-63`), its single
consumer, gains a second membership test for the settings names.

**DEFERRED, with the consumer named.** Parking `#browse` off-viewport instead of `display: none` on
the way into a settings screen, to keep its decoded covers warm — the consumer is a
browse→settings→browse round trip on a long list, and no stage introduces it because the identical
cost already ships on browse→home (`js/nav.js:74`). Named in §15 R-B. Restoring a settings screen's
scroll position on re-entry the way a `.browsepage` does (`js/browse.js:489`) instead of resetting it
(`js/nav.js:147`) — the decision does not ask for it and no consumer needs it; deliberately out of
scope. Exporting one screen registry from `Nav` (already named as owed in
`docs/swipe-model.generated.txt:19-29`) — Stage B makes the case for it stronger but does not build
it.

## 5. Target design — what Options becomes

**Invariant S1 — a settings screen is a peer, not an overlay.** **At rest, exactly one of the six is
un-hidden.** The only screens that may be un-hidden simultaneously are the two panes of a *live
filmstrip*, which is deliberate — a filmstrip needs both panes on screen. The reported defect was
**static** co-visibility (the hub rendered through its own sub with no gesture in flight), and that is
what S1 forbids. Stated at this scope on purpose: the six-way loop is not the only writer of `hidden`
on those elements (§5.1), so a universal claim would be stronger than the mechanism delivers — and a
guarantee the code does not make is exactly what a later refactor deletes something on the strength of.

**Invariant S2 — no screen but `.nowplaying` declares a page background.** After Stage A1 the legal
painter set of `--page-bg` is exactly `body::before` and `.nowplaying`.

**Invariant S3 — entering a settings screen is a screen switch.** It parks `#home` and hides
`#browse`, exactly as entering Browse does. Nothing live remains behind it.

**Invariant S4 — Now Playing keeps every property the decision names.** Its `background:
var(--page-bg)`, its `inset: 0`, its `z-index: 60`, its coverage of the topbar (z30) and transport
(z35), its full-bleed geometry, its flex-column internal layout, its retained native scrollbar, its
touchmove bounce guard, `body.np-locked`, the navbar takeover, the pill and the pill clone — the
load-bearing differences `PROBE-np-uniqueness.md` §8 itemises, **24 distinct facts in 16 grouped
entries** (probe §9.3) — are untouched by every stage.

**Stage A1b removes exactly one thing from Now Playing and nothing else: its exemption from parking
and hiding the screens beneath it.** That exemption is probe **§4.2**, and stating its standing
correctly is part of this invariant:

- **It was a load-bearing mark, and the USER DECISION incorporates the set containing it by reference**
  (`DecisionLog:1162-1163`). Any claim that it was never on the list is false.
- **It is now `context`, by dated supersession in the probe itself** (§9.1), because the reason the
  mark gave is refuted at source. That supersession, not a denial, is what licenses A1b.
- **The set's size is unchanged by the two supersessions**, which cancel: 4.2 leaves and 1.9 joins
  (probe §9.1, §9.2). The count is 24 before and after.

**The arithmetic, spelled out, because "NP keeps all 24" and "A1b deletes 4.2" only look
contradictory.** The ratified set had 24 members **including 4.2 and excluding 1.9**. The set at HEAD
has 24 members **excluding 4.2 and including 1.9**. **23 members are common to both and are untouched
by every stage.** A1b removes 4.2 — which at HEAD is a `context` item, not a load-bearing one, because
the supersession has already retired it. So both statements are true at once: NP keeps every
load-bearing difference the probe itemises **at HEAD**, and A1b retires an item the decision ratified
**as of 2026-07-30**. The second sentence is the one the user is owed, and this plan does not hide it
behind the first.

**The background, stated exactly — this is the distinction the governing record turns on.** NP's
background **is load-bearing** at HEAD: probe §9.2 promotes 1.9 from `context` to load-bearing because
Stage A1 removed the six shared declarations, leaving `body::before` and `.nowplaying` as the only
painters, pinned by `test/page-bg-single-painter.test.js:28`. **It is still not NP's *distinguishing*
property**, and `DecisionLog:1167` forbids citing it as one in as many words. The decision's own
framing is the one to use: an opaque background, `inset: 0` and `z-index: 60` are **three co-required
properties for covering the bars** (`DecisionLog:1158-1161`) — remove any one and the bars are
exposed. Co-required is not distinguishing. **No section of this plan may name the background, the
inset and the z-index as "NP's uniqueness"**; what makes NP unique is the itemised set, and those
three are the subset that covers the bars.

**Invariant S5 — every screen parks or hides what is beneath it, without exception.** After Stage A1b
there is no screen for which entering it leaves another screen live underneath. This is what "all
screens are the same type" means operationally, and Now Playing is the last screen that does not
satisfy it.

### 5.1 Host element, per-page elements, show/hide mechanism

**Host element: none is added, and none is needed.** The `.browsepage` model needs a host only
because a page declares no box (§3.2). Each settings screen already declares the identical box:
`position: fixed; left: 0; right: 0; top: calc(var(--safe-top) + 51px); bottom: calc(var(--nav-h) +
var(--nav-pad)); overflow-y: auto` at `css:215-219` and `css:780-784`, byte-matching `#browse` at
`css:185-189`, with the same `body.has-player` re-inset at `css:227` and `css:790-791` matching
`css:191`. Introducing a host would mean moving six existing boxes into a seventh and re-parenting
the markup for no behavioural gain — it would be a larger change that delivers the same three
properties. **Requirement, not prescription:** S1–S3 must hold; a host is one way to reach them and
is rejected here on cost, not on correctness.

**Per-page elements: unchanged.** `#options`, `#general`, `#playback`, `#buffering`, `#downloads`,
`#diagnostics` keep their ids, their markup, their modules and their back buttons. `index.html` is
not edited by any stage.

**Show/hide mechanism.** `js/nav.js` `setView` loses two things and gains nothing:

*(**Stage A1, SHIPPED. Read §5.3 next**: the `if (!npOpen)` guard this section retains is the guard
**Stage A1b deletes**, so "Now Playing keeps the additive exemption" below describes A1's target
state, not this plan's end state. Line numbers here are A1's vintage — see §12's citation-vintage
note.)*

1. The park-and-hide guard at `js/nav.js:56` narrows from `if (!npOpen && !optOpen && !subOpen)` to
   `if (!npOpen)`. Now Playing keeps the additive exemption; the settings screens lose it. Entering
   `options` therefore parks `#home` and hides `#browse` through the code path already used by
   `browse` and `home`, including the `d.browseWillHide()` edge call.
2. The two-line settings visibility block at `js/nav.js:83-84` — `$('options').classList.toggle(
   'hidden', !(optOpen || subOpen))` followed by the sub loop — collapses to the single
   `showPage`-shaped loop that makes co-visibility impossible by construction:
   `for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden', v !== s);`
   inside the retained `if (!npOpen)` guard. The local `optOpen` and `subOpen` (`js/nav.js:48-49`)
   have no remaining reader and are deleted.

**The scope of the guarantee, stated exactly.** The loop can never leave two settings screens
un-hidden, so it makes *static* co-visibility impossible. It is **not** the only writer of `hidden` on
those six elements, and the claim must not be written as if it were. Three writers exist:

- **the six-way loop** — decides all six in one operation, so it can never leave two un-hidden;
- **`showAppView`** (`js/app.js:498`) — only ever **adds** `hidden`, so it can only reduce
  co-visibility, never create it;
- **`overlayFilmstrip`** (`js/nav.js:200`) and **`env.renderDestination`** (`js/app.js:551`) — these
  **remove** `hidden` from a second settings screen without consulting the loop.

The last two produce **deliberate, transient** co-visibility for the duration of a gesture or a
filmstrip. That is the intended behaviour, not a leak: both panes must be on screen for a filmstrip to
exist. `ONEPAGE` therefore proves the at-rest property by driving `applyScreen`, which is the correct
scope for it, and the residual — whether a frame can be painted while one of those two writers has
un-hidden a screen and the reconcile has not yet run — is the notch the adversarial strike is aimed at
(§16.4).

That is the whole product change for Stage A1. `applyScreen`'s settings branch (`js/nav.js:144-149`),
`setNavActive('options')`, the render dispatch and the scroll reset are untouched.

### 5.2 Stacking, after nothing lives underneath

`z-index: 25` on `#options` (`css:218`) exists to "cover page content" (`css:210`) and `z-index: 26`
on the subs (`css:783`) exists so "a sub-screen filmstrips ON TOP of it" (`css:775-776`). Stage A1
removes both causes: there is no page content underneath, and two sub/hub panes never occupy the same
screen space. Stage A2 deletes both declarations, putting the settings screens at `z-index: auto` —
the same tier `#browse` deliberately occupies (`css:177-183`).

**The primary reason A2 is safe: DOM order reproduces both deleted relationships exactly.** This
argument does not depend on the compositor at all, and it is stronger than the overlap argument below,
so it is stated first.

- `z-index: 26`'s stated cause is that a sub must paint above the hub during a filmstrip. All five subs
  sit **after** `#options` in the markup — `index.html:80, 97, 106, 115, 126` against `#options` at
  `:67` — so with both at `auto` in the root stacking context, the sub still paints above the hub.
- `z-index: 25`'s stated cause is covering page content. `#browse` (`index.html:62`) **precedes** every
  settings screen and deliberately declares no `z-index` (`css:177-183`), so a settings screen still
  paints above `#browse` wherever the two are simultaneously un-hidden.

**Nothing else depends on a settings screen outstacking anything.** Every `z-index` in `css/app.css`
that overlaps the settings box is 30 or higher and was already above 25/26. The single candidate below
them, `.alphaindex` at `z-index: 24`, is **a `.browsepage` child** (`js/browse.js:838`, `css:174`) — it
lives inside `#browse` and is hidden with it, so it is not a dependency on settings stacking and must
not be read as one.

**What the inversion actually is, qualified.** The plan previously said flatly that `#options` (25)
paints above `#home` (20) today and below it after A2. That holds **only while `#home` is un-parked**.
`#home.parked` declares `z-index: 0` (`css/app.css:127-131`), overriding the base `20`. So at rest —
the only state in which a settings screen is visible and `#home` is on screen at all — `#home` is at
`0`, the settings screens are at `auto`, and DOM order decides: `#home` (`index.html:48`) precedes
`#options` (`:67`), so the settings screen paints above the parked `#home` **both before and after
A2**. The inversion exists only for the duration of a `home↔settings` gesture and its synchronous
finalize window, which is what the A2 device gate should be looking at.

**The residual, and why A2 is still its own stage.** Within that gesture window the two movers do not
overlap: a filmstrip moves both panes with one shared delta and a fixed base separation, measured
edge-to-edge with zero gap or overlap for the entire live drag (`PLAN-swipe-declone.md` §15 R2,
real-engine measured, and the basis Stage 1 shipped on). At finalize, `resetSwipeStyles` clears the
transform and `setView` applies the park inside one synchronous `applyScreen` call (`js/nav.js:131`
then `:140`/`:145`), so no frame is painted between the two states. That is a synchronous-call
argument, not a compositor observation — **so A2 keeps its own shippable stage, its own device gate
and an isolated fallback (§15 R-F)**, even though the DOM-order argument above already de-risks it.
The topbar (30), transport (35) and navbar (40) all still paint above: `auto` is below every one of
them, the same relationship `#browse` already has and the same conclusion `PROBE-np-uniqueness.md`
§7.3 reaches for the inset screens.

### 5.3 Stage A1b — Now Playing parks the page beneath it

**The defect, and that it is not A1's.** A1 shipped at `c4cfd7e` (build `2026-07-30.280`), device-
confirmed: the reported two-screens-through-each-other render is gone. It exposed a second, older
defect. Two device screenshots show **three or more screens visible at once during an NP swipe** — NP
beside Home, with Books carousel cards present, and stray text fragments between the cards from a
further layer. **This is pre-existing structure that A1's transparency made visible; A1 did not create
it.** Before A1 the settings screens were opaque and masked the stack; now only `body::before` and
`.nowplaying` paint, so every un-hidden screen shows through every other.

**⛔ NOW PLAYING STAYS UNIQUE. A1b removes the parking exemption and nothing else.** NP keeps its
background, its `inset: 0`, its `z-index: 60` and its coverage of the topbar and the transport, and
keeps **every one of the 24 load-bearing differences the probe itemises at HEAD**. Every stage in this plan
leaves `.nowplaying`'s stylesheet rule untouched, and `NPUNTOUCHED`'s source-scan cell is the standing
guard on that (§6a, §14).

**What this stage does touch, stated without softening.** A1b retires an item the user's decision
ratified by reference. The record path is exact and a reader should be able to walk it:

1. `PROBE-np-uniqueness.md` §4.2 (`:115-117`) marked the settings-loop guard **load-bearing**, for the
   stated reason that "whichever settings overlay was showing stays mounted under NP for the
   back-reveal". §8 carried it into the load-bearing set.
2. `DecisionLog:1162-1163` incorporates that set **by reference**. So the mark was ratified.
3. The mark's stated reason is false. **Probe §9.1 supersedes it to `context`**, on a proof shorter
   than the close-path enumeration in §5.3.2: `hidden` is *added* to `#nowplaying` in exactly one
   place in `js/`, `js/nav.js:81`; three lines earlier the same synchronous `setView` body clears
   `hidden` from the destination (`js/nav.js:78-80`). So on **every** path the destination is mounted
   at the instant NP is hidden, whatever its state was while NP was open. The reason is refuted at its
   root, and the refutation is a property of one function body rather than an enumeration of callers
   that could be incomplete.
4. `DecisionLog:1195-1213` records the supersession against the ratified entry, and states that the
   decision's conclusion is unchanged and uncontradicted.

**An earlier draft of this section asserted the opposite — that "additivity was never among the
reasons given for NP's uniqueness" and that the probe's list "does not include the park exemption".
Both were false, and they were the load-bearing sentences for the whole stage.** They are removed
rather than softened. The correction matters beyond accuracy: this decision was settled once and the
user "had to repeat because it kept being re-litigated" (`DecisionLog:1148`), so a stage that
certifies "this does not re-open your decision" while deleting a ratified item spends exactly the
credibility it needs.

**The bound is narrow, and the plan states it narrowly.** A1b deletes **two** guards, and the false
claim was false for only one of them. Probe §4.1 marks the *park* guard (`js/nav.js:51`, §12 item 25)
**context**, not load-bearing — for that guard nothing was ratified and nothing is retired. It is the
*settings-loop* guard (`js/nav.js:78`, §12 item 26) that carried the ratified mark.

**A1b closes a second pre-existing residue this plan did not previously claim.** `overlayFilmstrip`
un-hides **both** panes (`js/nav.js:200`) and relies on its pending reconcile to restore exclusivity.
At HEAD, if Now Playing is opened by button inside that ~340ms window, `setView('nowplaying')` skips
the six-way loop — and so does the reconcile's own `applyScreen('nowplaying')` — so both filmstrip
panes stay un-hidden beneath NP until the next non-NP `setView`. A1b's unconditional loop hides them
at the NP entry. This is a second instance of the §5.3.1 class, reachable **by a button tap with no
gesture at all**, and it is independent evidence for the change.

**5.3.1 — The precise mechanism, derived rather than inferred.** *(Every `file:line` in §5.3 is against
HEAD `02b388f`, build `2026-07-31.287`. An earlier draft carried pre-A1-fix line numbers in this
section; since A1b's whole product change is two line deletions, the citations **are** the
specification and are re-pointed rather than approximated.)* `js/nav.js:51` and `js/nav.js:78`
both guard on `if (!npOpen)`, so **opening NP parks nothing and hides nothing**: `#home` keeps
whatever park state it had, `#browse` keeps whatever hidden state it had, and a settings screen keeps
whatever hidden state it had. That alone does not stack three screens, because the park/hide block
keeps `#home` and `#browse` mutually exclusive. The stacking comes from a second fact:

> **`env.renderDestination` and `showAppView` un-park and un-hide screens *during a gesture*, and when
> that gesture ends on NP the reconcile that would undo it is skipped.**

`js/app.js:547` removes `parked` from `#home`; `js/app.js:512` removes `hidden` from `#browse`;
`js/app.js:551` removes `hidden` from a settings screen. On **abort**, finalize calls
`applyScreen(currentDesc())` — which for an NP source is `setView('nowplaying')` — and **both blocks
are skipped, so nothing is put back.** Each aborted NP swipe therefore *leaves one more screen
un-hidden*, and they accumulate:

1. On Home, open NP. Swipe NP→back; `renderDestination(dest, 'home')` un-parks `#home`. Abort. `#home`
   is now permanently un-parked beneath NP.
2. Swipe NP→forward (the chapter list); `showAppView` un-hides `#browse` (`js/app.js:512`) and renders
   the files page. Abort. `#browse` is now also un-hidden.
3. If a settings screen was showing when NP opened, it is un-hidden too.

Three or four mutually-transparent screens, exactly as photographed — the fragments between the
carousel cards being the layer below. **NP's own opaque background hides all of it at rest; the
screenshots are mid-swipe, when NP has translated away and uncovered the stack.**

**5.3.2 — What the two exemptions actually buy. Traced at every NP-close path; the answer is one
thing, and it is not the stated one.**

| Close path | What restores the previous screen today | Does it need the exemption? |
|---|---|---|
| Swipe back to Home | `env.renderDestination(dest, 'home')` removes `parked` from `#home` (`js/app.js:547`) | **No.** The destination is un-parked by the gesture itself. |
| Swipe back to Browse | `showAppView(dest, true)` removes `hidden` from `#browse` and re-renders (`js/app.js:512`) | **No.** Same. |
| Swipe back to a settings screen | `env.renderDestination` removes `hidden` from the real overlay element (`js/app.js:551`) | **No.** Same. |
| Swipe forward NP→chapter list | `showAppView` un-hides and renders `#browse` (`js/app.js:512`) | **No.** |
| Button/back close (`goBack`) | `applyScreen(prev)` → `setView(prev)` runs the full park/hide/show, then renders | **No.** |
| Navbar tab from NP | `navTo` → `applyScreen` — same as above | **No.** |

**Every close path already restores its own destination without the exemption.** The stated benefit —
"stays for the NP-back reveal" — is supplied by `renderDestination`/`applyScreen` in every case, so
the exemption is not load-bearing for correctness on any of them.

**The supersession reaches the same conclusion by a shorter and stronger route, and it is the one to
cite.** This table is a caller enumeration, and a caller enumeration is only as complete as its
search. `PROBE-np-uniqueness.md` §9.1 does not need one: `hidden` is *added* to `#nowplaying` in
exactly one place in `js/` — the toggle at `js/nav.js:81` — so NP can become hidden **only** through
`setView(v)` with `v !== 'nowplaying'`, and inside that same synchronous body the destination is
un-hidden three lines earlier (`js/nav.js:78-80`). The destination is therefore mounted at the instant
NP is hidden on every path, by construction. The table is kept because it is the per-path detail a
builder and a device gate work from; **the proof of record is §9.1.**

**What each guard genuinely buys — per guard, because the two do different things and a shipped
comment gets this wrong.** An earlier draft answered "the exemption" as if it were one mechanism.

- **The park guard (`js/nav.js:51`) buys the one real benefit.** Its body is what hides `#browse`
  (`js/nav.js:69`), so exempting NP from it keeps `#browse` un-hidden and its **decoded cover bitmaps
  warm**. If NP hides `#browse`, iOS drops them (`css/app.css:78-85`, the measured reason `.parked`
  exists) and closing NP back to Books may re-decode. That is a real cost, it is the *only* real cost
  found, and it is the same R-B class this plan already carries with the same named fallback (a
  `#browse.parked` recipe, §4 DEFERRED). `#home` is parked, not hidden — parked means **painted** — so
  it costs nothing.
- **The settings-loop guard (`js/nav.js:78`) buys nothing.** Its effect is confined to `#options` and
  the five subs. Those hold **no cover bitmaps**, and they are re-rendered on entry anyway
  (`js/nav.js:147`). Retaining their `hidden` state under NP has no consumer once the back-reveal
  reason is refuted.

**⚠️ The shipped comment at `js/nav.js:71-77` attributes the first bullet's benefit to the second
bullet's guard.** It sits above the settings-loop guard and states that what that guard "actually
buys" is that "`#browse` stays un-hidden … keeping its decoded cover bitmaps warm" — but `#browse`'s
`hidden` toggle is `js/nav.js:69`, inside the *other* guard. The comment is wrong about which guard
produces the effect it names (`PROBE-np-uniqueness.md` §9.1.f). It is recorded here because the
comment is A1-fix's own rewrite and the next reader will trust it exactly as the last one did; A1b
deletes it outright (§12 item 27), so the error does not survive the stage.

**Nothing else requires the exemption.** I checked the six `npOpen()` consumers in `js/app.js`
(`:1758`, `:2201`, `:2334`, `:2336`, `:2374`, `:2464`) — every one gates a live playback-UI re-render,
none reads or writes screen visibility. `js/app.js:2321-2322`'s "removing it changed page height" note
concerns the **transport** `#player` being removed from the DOM, not a screen being hidden, and no
stage touches it.

**5.3.3 — What replaces it.** Both guards are deleted, so `setView('nowplaying')` runs the same
park/hide as every other screen: `#home` parked, `#browse` hidden (firing `d.browseWillHide` on the
shown→hidden edge), all six settings screens hidden, `#nowplaying` un-hidden. Closing NP is then
unchanged in mechanism — every path in the 5.3.2 table already restores its destination — and gains
one property it lacks: **an aborted NP gesture now reconciles**, because `applyScreen(nowplaying)` at
finalize re-parks and re-hides whatever the gesture un-hid. The accumulation in 5.3.1 becomes
impossible by construction rather than by nobody exercising it.

**5.3.4 — Interaction with A1's `browseWillHide` edges.** The set changes in three ways, all stated so
`PEERFINALIZE` is updated rather than silently left describing the old world. **§9 carries the single
canonical enumeration — five edges — and this section describes only what A1b changes about it.**

- **A new edge is added — opening NP while Browse is showing.** `setView('nowplaying')` now crosses
  `js/nav.js:55`'s shown→hidden test with `#browse` un-hidden, so the hook fires. §9 edge 4, covered
  by `NPPARKS`.
- **A second new edge is added — supersession while Now Playing is the current screen.** `begin()`'s
  hard reset calls `applyScreen(currentDesc(), …)` at `js/app.js:459`; with `currentDesc()` resolving
  to `nowplaying`, A1b makes that call run `setView('nowplaying')` and cross the same edge. **It is
  reachable**: an NP→files gesture un-hides `#browse` (`js/app.js:512`), and a second touch arming
  while that gesture settles takes the hard-reset branch. §9 edge 5. Its behaviour is benign and §9
  records it as deliberately uncovered, with the reason.
- **Edge 3 relocates rather than disappearing.** §9's edge 3 was "closing NP back to a settings screen
  after an `NP→files` abort left `#browse` un-hidden." After A1b that abort's own
  `applyScreen(nowplaying)` hides `#browse` itself, so the hook fires **at the abort**, not later at
  the NP close — by which time `#browse` is already hidden and the edge test is false.

**`PEERFINALIZE`'s edge-3 cell needs relocating, not a one-assertion edit — the correction is larger
than an earlier draft stated, in two ways.**

1. **After A1b the cell's *subject no longer exists*.** The hook does not fire at the NP close at all,
   so this is a relocation of the whole scenario to the abort, not a re-pointing of one assertion.
2. **It fails loudly; it does not pass vacuously.** An earlier draft justified the update's urgency by
   claiming the assertion "would pass vacuously against a hook that no longer fires there". The
   opposite is true: `test/one-screen-type-finalize.test.js:216` asserts `rec.calls === 1`, and after
   A1b the hook fires zero times at the NP close, so `assert.equal(0, 1)` throws. The error was in the
   safe direction, but §6a's entire framing turns on the fails-loudly / passes-silently distinction,
   and having it backwards in one section and right in the other was the internal inconsistency.

**Four of that cell's assertions turn, and two of them are fixture sanity** — which is why the work is
a relocation rather than an edit. They are enumerated with the rest of the casualty census in §6a.

**5.3.5 — `showAppView`'s sweep is LIVE and is KEPT. Settled by execution; not an open question.**
An earlier draft of this section suspected A1b might make `showAppView`'s stale-settings sweep
(`js/app.js:498`) dead, and routed it to the code reviewer to prove dead or keep. **The reviewer ran
it instead of reading it, and the suspicion was wrong on both halves.**

- **Its live case is the `overlayFilmstrip` window, not Now Playing — and always was.** `closeSub`
  (`js/app.js:171-178`) pops the nav stack **before** calling `overlayFilmstrip(fromV, 'options',
  'back')` at `js/app.js:177`, so `currentDesc()` is already `'options'` while the filmstrip un-hides
  **both** panes (`js/nav.js:200`). A left-edge back-swipe started inside that window resolves
  `dest = navStack[-2]`; when that is a browse descriptor the transition takes
  `destinationHost === 'browse-host'` → `showAppView(dest, true)` → the sweep hides the lingering sub,
  which `d.from.v !== s` spares only for the outgoing screen. Executed: the window really does leave
  `['general','options']` un-hidden, and mid-drag `#general` is hidden while `#browse` is un-hidden.
  Nothing else adds `hidden` in that window — `setView` is not called mid-drag and `renderDestination`
  only ever *removes* `hidden` — so only the sweep can have done it.
- **A1b provably cannot make it dead.** That scenario never opens Now Playing, and A1b's entire
  product change is deleting two `if (!npOpen)` guards, which are already taken whenever `npOpen` is
  false. On any path where NP is never opened, A1b is a no-op.

**Determination: KEEP the sweep. Closed, and VERIFIED at the A1b plan review rather than merely
restated.** The review checked the proof on its own terms and confirmed it holds: `npOpen` is assigned
at `js/nav.js:47` — `npOpen = v === 'nowplaying'` — at the top of `setView`, from the **current
call's** argument and **before either guard is read**. There is no path on which a guard reads a stale
value, so on any `setView(v)` with `v !== 'nowplaying'` both guarded blocks already execute at HEAD
and deleting the guards is a strict no-op on that call. **This must not be re-opened as an open
question at step 10.** §4's "its live case is the NP one" is corrected there. The lesson is recorded
rather than just the fix: the plan reasoned from a reading toward a deletion, and only an execution
caught it — which is why §5.3.5 asked for a proof rather than an opinion in the first place.

**A1b does, however, retire the scenario the sweep's own comment names — a comment scrub, not a
behaviour change.** `js/app.js:494-496` justifies the sweep with *"NP opened from Options → an
NP→chapter-list swipe would show it through"*, and `PROBE-np-uniqueness.md` §9.1.g records that this
consumer exists partly to compensate for the state the settings-loop guard retains. After A1b,
opening NP from Options **hides** `#options`, so that stated scenario can no longer arise by that
route. **The sweep still stays** — its live case is the filmstrip window, which is untouched — but its
comment would then justify a live mechanism with a dead example, which is the §12 item 31 class. It
joins the deletion list as §12 item 36, rewritten to name the filmstrip case that actually keeps it
alive. **No behaviour changes and the sweep line is not edited.**

**5.3.6 — Two A1b safety properties, VERIFIED at the plan review and recorded so they are not
re-derived.** This plan states that A1b makes the A1-fix-r2 defect worse if unfixed (§13), which
raises two questions a reader would otherwise have to re-answer. Both were checked directly against
source at the A1b review and both hold.

- **The shipped r2 predicate fully covers A1b's new parking path.** `gestureOwnsMovers = () => !!session
  && session.live` (`js/app.js:250`) is read at `js/nav.js:195` inside `reconcile`, and **its truth
  boundaries are the session's, not the drag's**: `session = d` at `js/app.js:486`, `.live` set in
  `start()` at `js/app.js:531`, `session` untouched by `end()`'s `const cur = d; d = null`, nulled only
  by `sessionDone` (`js/app.js:250`) from finalize or the reveal drop. **The predicate is orthogonal to
  *which* screen `currentDesc()` names**, so widening what `applyScreen` does for `nowplaying` cannot
  escape it. A1b needs no additional guard. *(This does not relax the step-6f sequencing constraint —
  6f is about whether the shipped predicate reads clean **on device**, which source cannot answer.)*
- **A1b opens no second reconcile window.** It adds no timer, no listener, no rAF and no promise — it
  deletes two conditions. The only asynchronous continuation in this region remains
  `overlayFilmstrip`'s `transitionend` + 340ms pair (`js/nav.js:212-213`), unchanged in count and in
  timing. **The one new interaction is benign and is the mechanism behind the second residue §5.3
  claims:** with no gesture live, a pending filmstrip reconcile firing after NP was opened by button
  runs `applyScreen('nowplaying', { render: false })`, which under A1b parks and hides — the same state
  `navTo({v:'nowplaying'})` just applied. Idempotent.

### 5.4 Stage A1-fix — the mid-drag reconcile must not hide the incoming mover

**A live, shipped defect that A1 introduced, found by executing rather than reading. It is the
priority, and it lands ahead of A1b.**

**The claim that was false.** `js/nav.js:102` states *"Safe because applyScreen is NEVER called during
an active drag."* It is not true. `overlayFilmstrip` schedules its reconcile **twice** —
`toEl.addEventListener('transitionend', finish, { once: true })` and `setTimeout(finish, 340)`
(`js/nav.js:182-183`) — and **cancels neither when a gesture arms**. `finish` → `reconcile` →
`applyScreen(currentDesc(), { render: false })`, whose first act is `resetSwipeStyles` and whose
second is `setView`.

**What A1 changed about the cost.** Two things happen when that reconcile lands mid-drag. The outgoing
mover's inline transform is wiped and re-applied on the next `move` — a one-frame glitch, and
**pre-existing**. And `#browse`, **the incoming mover the user is dragging toward**, is given
`display: none` and **stays hidden for the rest of the gesture**, because only a `move` re-applies
transforms and nothing re-un-hides it. The user drags, the destination never arrives, and it snaps in
at release. **That half is A1's**, proven by re-running the identical probe under registered mutant
`#106` (which restores the pre-A1 guard), where `browseHidden` stays false at every step: before A1,
`setView('options')` did not touch `#browse`; after A1 it hides it.

**Reachability.** 0–340ms after a hub↔sub tap — sooner in a real browser, where `transitionend` fires
at ~240ms. Tap `‹ Back` on a settings sub-screen and edge-swipe before the filmstrip finishes. One
impatient thumb.

**Why it lands ahead of A1b, not inside it.** Three reasons. It is **shipped and live now**, so every
day it waits is user-visible. It is a **different mechanism** from A1b's change — cancellation of a
pending continuation versus deletion of a guard — so bundling them would confound two device readings
and two mutation sets. And **A1b makes it worse**: once `setView('nowplaying')` parks and hides, the
same uncancelled reconcile reaches NP transitions, which are the app's most frequent round trip. Fixing
it first means A1b's device gate reads against a clean baseline, exactly as A1b precedes A2 for the
same reason.

**⚠️ THE SHIPPED FORM OF THIS FIX WAS KILLED. The invariant below is the RESTATED one; the
superseded wording and why it failed are in §5.4a.** The shipped `.282` predicate
`gestureLive() === !!d && d.live` (`js/app.js:213`) guards the wrong lifetime and is replaced, not
supplemented.

**The invariant the fix must satisfy (restated on the correct lifetime).** *A pending
`overlayFilmstrip` reconcile must not change the visibility or the transform of an element that a
gesture **session** owns as a mover — for the whole of that ownership, which begins when the gesture
goes LIVE and ends when the session releases ownership at finalize (or at the reveal drop), NOT when
the drag handle is nulled at finger-up.*

**The ownership signal, derived from source rather than chosen.** `js/app.js:216-226` states the
lifetime in its own words: "`session` is the single object that owns one gesture's whole lifecycle
(arm → drag → settle → finalize → reveal) … `d` remains the ACTIVE-DRAG handle (nulled at `end()` so
`move()`/`touchstart` see 'no drag in progress'); `session` outlives it through the settle/finalize
phase, where the captured `cur` IS this same object." The boundaries are explicit in code, and they
are exactly the boundaries the guard needs:

| Moment | Source | `session` | `session.live` |
|---|---|---|---|
| Arm | `session = d` (`js/app.js:479`) | set | `false` |
| Go live | `d.live = true` in `start()` | set (same object) | **`true`** |
| Vertical-intent abandon | `sessionDone(d)` (`js/app.js:598`) | **null** | — |
| Armed release (never locked) | `sessionDone(cur)` (`js/app.js:619`) | **null** | — |
| Finger-up on a live drag | `const cur = d; d = null;` (`js/app.js:618`) — `session` untouched | **set** | **`true`** |
| Finalize / reveal drop | `sessionDone(cur)` (`js/app.js:1262`, `:893`) | **null** | — |
| Supersession hard reset | `session = null` (`js/app.js:456`), then re-armed | null → set | — |

`sessionDone` is `if (session === s) session = null` (`js/app.js:250`). Nothing sets `.live` back to
false, so it stays true on the session object for the whole settle phase.

**Therefore the predicate is `!!session && session.live`** — and it ends exactly when ownership ends,
neither earlier nor later:

- **not earlier** — `session` survives `end()`'s `d = null`, so the settle window (the fracture) is
  covered;
- **not later** — `sessionDone` nulls it at finalize/reveal-drop, so a reconcile arriving afterward
  runs normally, as it should;
- **and the arm trap stays closed** — during the armed phase `session.live` is `false`, so the
  reconcile is **not** suppressed and discharges normally. This is why `!!session` **alone is wrong**:
  it would suppress during the armed phase, and an armed gesture that lifts without locking returns
  through `js/app.js:619` having consumed the net, stranding the filmstrip mid-transform with nothing
  scheduled to clear it. The shipped second cell pins that trap and must stay green.

**One variable, one lifetime.** `finishing || (d && d.live)` also covers the window and is admissible,
but it is **not recommended**: `finishing` is `begin()`'s re-entrancy gate, whose meaning Stage 6c
already narrowed once (to admit a live pane-less session), so overloading it as an ownership signal
couples this guard to a gate that has changed under it before. `session` is the object the stage-3
comments *designate* as the owner; reading ownership off the owner is the durable form.

**Naming goes with it.** `gestureLive` becomes the wrong concept the moment the predicate changes —
rename it (`gestureOwnsMovers`, or equivalent) along with the injected dep. A predicate whose name
survives its meaning is the staleness class this plan has already corrected three times.

### 5.4a Why the first fix failed — and the pattern, now on its second instance

**What held.** The superset argument's factual half is **true**: every live-gesture path does
discharge the reconciliation duty — the settle finalize, supersession's hard reset ending in
`applyScreen`, and the throw path's `finally`. No path was found where a gesture that went live ends
without an `applyScreen`-equivalent.

**What the derivation missed.** **Suppression is per-firing, not a transfer of the duty.** A firing
suppressed while live is consumed harmlessly; *the same pending timer fired 100ms later, in the settle
gap, is not suppressed* — and it does not run the duty early, it runs `applyScreen` against the
**pre-commit** `currentDesc()` while the session's movers are mid-animation. So the superset half was
true and was never the load-bearing half. §5.4 analysed one boundary of the suppression window (arm vs
live) carefully enough to ship a cell for it, and never asked about the other boundary (live vs
settling).

**The seed was in the invariant's own wording** — "an element that a **live gesture** owns as a
mover". Ownership is session-scoped and outlives liveness by the entire settle phase, and
`js/app.js`'s own stage-3 comments say so. **The fact was in the artifact, cited in this plan, and not
consulted by the derivation.**

**⚠️ This is the second instance of one pattern, and it is named here so it is not met a third time
from a new side: a guard and the value it protects scoped to different lifetimes.** The M1 campaign
was the first. The durable form: **a guard's predicate is derived from the lifetime of the resource it
protects, never from the phase in which the defect was first observed.** The A1-fix guarded the phase
Poirot's probe happened to drive. The check that catches it is mechanical and cheap — *name the
resource, find where its ownership begins and ends in source, and confirm the predicate's truth
boundaries coincide with those two points* — which is the table above, and which this plan should have
produced the first time.

**And the false claim goes with it.** `js/nav.js:102`'s "NEVER called during an active drag" is
deleted or corrected in the same commit. Leaving it is worse after the fix than before: it would then
describe a property the code newly *does* enforce, but for a reason the comment does not give, and the
next reader would rely on the absolute rather than on the predicate.

**Coverage:** the `FILMSTRIPDRAG` cell (§14). Its assertions are class state and inline-style presence
across a driven gesture — no geometry — so it can fail in jsdom.

### 5.5 Correction to §5.2's `.alphaindex` argument (affects Stage A2's gate)

§5.2 dismisses `.alphaindex` (z24) as "a `.browsepage` child … hidden with `#browse`". **That is true
at rest and does not cover the browse↔settings gesture window**, where `#browse` is an *un-hidden
mover*. The conclusion still holds, but by a different mechanism, and A2's device gate should be told
the real one: as a mover, `#browse` carries an inline `transform`, and a non-none transform
**establishes a stacking context**, so `.alphaindex` is painted inside `#browse`'s context and cannot
outstack a sibling of `#browse` whatever its own z-index. `#browse` then participates in the root
context at stacking level 0 and precedes every settings screen in DOM order (`index.html:62` before
`:67`), so a settings screen at `auto` still paints above it. **Containment, not hiding, is the reason
during a gesture.**

## 6. Contract change

```vitruvius-contract
# field | class
fromKind | identity
toKind | identity
sourceHost | identity
destinationHost | identity
```

Structural notation — the exact value domains, before and after. Stages A1 and A2 change **none** of
this; Stage B changes all of it.

```
BEFORE (HEAD)
  Nav.isOverlay(v)        -> v === 'options' || v === 'nowplaying' || isSub(v)
  Swipe.kindOf(v)         -> 'home' | 'browse' | 'overlay'
  classifyTransition(...) -> { fromKind: Kind, toKind: Kind,
                               sourceHost: 'overlay' | 'in-flow',
                               destinationHost: 'overlay' | 'browse-host' | 'home',
                               decorations: frozen [] }
  Swipe.KINDS             = ['home', 'browse', 'overlay']
  structural cases        = 8   (3 kinds, 9 pairs, minus home->home)

AFTER STAGE B
  Nav.isOverlay(v)        -> v === 'nowplaying'
  Swipe.kindOf(v)         -> 'home' | 'browse' | 'settings' | 'overlay'
  classifyTransition(...) -> { fromKind: Kind, toKind: Kind,
                               sourceHost: 'overlay' | 'in-flow',
                               destinationHost: 'overlay' | 'browse-host' | 'home',
                               decorations: frozen [] }
  Swipe.KINDS             = ['home', 'browse', 'settings', 'overlay']
  structural cases        = 14  (4 kinds, 16 pairs, minus home->home, minus overlay->overlay)
```

**`overlay->overlay` is DELETED, not re-valued.** After Stage B the `overlay` kind has exactly one
member, `nowplaying`, and a pair whose source and destination are the same bare screen name is
documented impossible-before-the-planner (`test/fixtures/swipe-plan-spec.mjs:98-106`). A retained
`overlay->overlay` row would be an unreachable expectation — the dead-branch pattern this project
forbids and the stage-3 review removed.

**The host projection keeps two kinds mapping to one value, deliberately.** `sourceHost` stays
`fromKind === 'overlay' ? 'overlay' : 'in-flow'` widened to `(fromKind === 'overlay' || fromKind ===
'settings') ? 'overlay' : 'in-flow'`, and `destinationHost` likewise. The value is correct for both:
it selects `env.sourceEl`'s `overlayEl(v)` branch (`js/app.js:524`), which is `byId(v)` — and both
kinds resolve their element by id. **Recommendation, not a requirement:** rename the value
`'overlay'` to `'by-id'` in the same commit, because a value name that survives its concept is the
exact staleness class §1 already records twice in this file. The invariant is that no shared name may
mean two different things; the rename satisfies it and so would a comment, so the choice is the
builder's. Renaming costs the same 14 `expectedHosts` rows Stage B rewrites anyway.

**Migration (U10) — the complete set. Every artifact that reads `STRUCTURAL_CASES` or
`REPRESENTATIVE` migrates in the same commit as the fixture, and no restatement of the fixture
survives that commit.** The plan already stated this rule for `tools/mutate.mjs`; it applies to the
fixture's own consumers, and two of them were missing from the first draft.

1. `test/fixtures/swipe-plan-spec.mjs` — the hand-written independent oracle, changed in the same
   commit as `js/swipe.js`. That two-part edit is deliberate and is what a review sees.
2. **`test/swipe-declone-stage1.test.js` — lands RED without this, and is the witness for the whole
   migration.** Line 81 asserts
   `assert.equal(spec.STRUCTURAL_CASES.length, 8, 'fixture sanity: there are eight structural cases')`
   — Stage B makes the length **14**, so this is a hard red in the same commit as the production edit.
   Line 70 restates the fixture inline as a comment
   (`const REP = spec.REPRESENTATIVE;   // { home: 'home', browse: 'books', overlay: 'options' }`),
   which becomes a wrong second copy of the contract — the staleness class §1 of this plan records
   twice. **Both change: the count reads 14, and the inline restatement is corrected to the four-entry
   mapping or deleted rather than left to rot.** Its test *body* is unaffected — `NOGHOSTINFLOW` reads
   only `outgoing`, which is correct for `nowplaying` under the new representative.
3. **`test/swipe-stage6d.test.js:148` — passes while asserting a false count in its own name.** The
   test is named `FP.oracle — production finalizationPlanFor.abortRender equals the frozen
   expectedFinalization for all 8 structural cases`. It carries no length assertion, so it stays green
   with a name that is no longer true. **The name changes to 14.** Its body is likewise unaffected — it
   reads only `abortRender`.
4. `docs/transition-matrix.generated.txt` and `docs/swipe-model.generated.txt` — regenerated in the
   same commit (`node tools/gen-transition-matrix.mjs`, `node tools/gen-swipe-model.mjs`) or their
   guard tests redden.
5. `tools/mutate.mjs:487-489` — pins the `sourceHost` projection line verbatim; re-pointed in the same
   commit or the anchors gate reddens with `ANCHOR NOT FOUND`. **This is the complete anchor migration
   *for Stage B*.** The original wording — "a sweep of all 102 registered mutants confirms this is the
   only one" — was true when written and is now false: that sweep predates Stage A1b's existence, and
   A1 has since registered six more mutants. **Stage A1b has its own casualties, listed in §6a.** The
   one `SETTINGS_SUBS` anchor (`tools/mutate.mjs:498`) pins `showAppView`'s sweep line, which §4 and
   §5.3.5 retain.

## 6a. Stage A1b's mutant and cell casualties — expected, gated, and listed

A1b deletes both `if (!npOpen)` guards, which is text **two registered mutants** anchor and behaviour
**three shipped cells across two files** assert. **This fails loudly rather than silently** — the
anchors gate and all three cells fire at the A1b commit — so the cost is a stop for the builder, not a
defect. It is listed here so that stop is *expected* rather than diagnosed.

**An earlier draft said "two shipped cells" and listed one file.** The undercount is what makes this
Structural rather than a note: §6a's stated purpose is that the builder's stop be *expected*, and a
red in a file this table does not mention is the diagnosed kind — an hour and a diagnosis, spent
working out whether A1b was supposed to do that.

| Artifact | What A1b does to it | Action, in the A1b commit |
|---|---|---|
| Mutant `#104` (`NPUNTOUCHED`) | Anchors `"    if (!npOpen) {\n      for (const s of ['options', ...SETTINGS_SUBS])"` — the text A1b deletes. Its *intent* (restore the settings exemption so a screen stays un-hidden under NP) is exactly what A1b abolishes, so the intent dies with the anchor. | **De-register.** Not re-pointed — there is no longer a defect for it to model. |
| Mutant `#106` (`PEERPARK` / `PEERFINALIZE-a`) | Anchors `"    if (!npOpen) {\n      $('home').classList.toggle('parked', v !== 'home');"` — also deleted. Its intent (restore the park exemption) **stays valid**: it is still the mutant that must redden `PEERPARK`, `PEERFINALIZE` and now `NPPARKS`. | **Re-point**, do not delete. |
| `NPUNTOUCHED`'s two class-state cells — `test/one-screen-type.test.js:196` (hub) and `:211` (a sub) | They assert `hidden('options') === false` after applying `nowplaying`. A1b makes that false **by design** — NP now hides the settings screens. | **Retire these two.** Their subject moves to `NPPARKS`, which asserts the new truth over the same elements, so the dimension is not left bare. |
| **`PEERFINALIZE` edge 3 — `test/one-screen-type-finalize.test.js:171-221`. The second file, absent from an earlier draft of this table.** | **Four assertions turn, and the cell's SUBJECT ceases to exist** (§5.3.4): after A1b the hook does not fire at the NP close at all. `:186-188` — *"fixture sanity: Now Playing must leave the settings screen mounted underneath — that is the retained npOpen exemption NPUNTOUCHED guards"*: reddens, A1b hides it by design. `:202-204` — *"fixture sanity: the NP→files abort must leave `#browse` un-hidden"*: reddens, A1b's abort reconcile hides it. `:216` — `rec.calls === 1`: goes to **0** (`rec` is installed at `:206`, *after* the abort, so the abort's relocated hook call is not recorded, and at the NP close `#browse` is already hidden so `js/nav.js:55`'s edge test is false). `:218` — `deepEqual(rec.hiddenWhenCalled, [false])`: goes to `[]`. **Its `:211-215` assertion survives** — `#browse` is still hidden at the end. | **Relocate the whole scenario to the abort**, do not re-point one assertion. **Two of the four are *fixture sanity***, so they redden regardless of where the cell's hook assertion is aimed — which is why "move its third assertion" does not describe the work. The stale `NPUNTOUCHED` reference in the `:188` message goes with it. §13 step 7 carries the corrected instruction. |
| `NPUNTOUCHED`'s source-scan cell | Asserts `.nowplaying` still declares its `inset`, `z-index` and `background` — the S4 guard. **Unaffected by A1b**, and more load-bearing after it, since A1b is the stage that touches NP at all. | **Keep, unchanged.** `NPUNTOUCHED` narrows to this cell alone (§14). |

**This is a real correction to the plan, not a note.** §13 step 8's "Nothing else" was wrong about
tests and tooling; it remains accurate about *product* source, which is what it was written to bound.
Step 8 now says so explicitly.
6. `test/nav.test.js:105` — the `'options'`/`'general'` terms only; the `'nowplaying'` term on that
   line and the whole of line 106 stay true after Stage B.

**Verification of the set is by execution, not by inspection:** the full `npm test` battery must be
green in the same commit as the Stage-B production edit, with `test/swipe-declone-stage1.test.js`'s
fixture-sanity assertion as the specific witness. No new cell is owed for F1 — the existing suite is
the oracle; the finding was that the plan must list the files it edits.

**Not implicated:** `classifyTransition`, `constructionPlanFor` and `finalizationPlanFor` keep every
key they have — no exact-key contract shape changes, only value domains — so
`test/contract-function-gate.test.js` needs no edit. The generated model's four pinned source regions
(`tools/gen-swipe-model.mjs:57, :61, :65, :69`) fingerprint `js/app.js` regions no stage edits, so
regeneration churns no pin and no manual re-verification of a pinned constant is owed.

## 7. Value and ownership ledger

```vitruvius-ledger
# name | class | dir | producer | consumer | owner | lifecycle | verification
settings screen occlusion | behavior | inout | the setView park-and-hide swap | the compositor painting the settings screen rect | Nav.setView | from screen entry to screen exit | PEERPARK cell plus device row R-C
settings screen exclusivity | behavior | out | the single setView visibility loop over options and every sub | the hidden class on each of the six screen elements | Nav.setView | from screen entry to screen exit | ONEPAGE cell
home parked state on entering a settings screen | behavior | inout | the narrowed setView park guard | the home element parked class | Nav.setView | from settings entry until a non-settings screen is applied | PEERPARK cell
browse hidden state on entering a settings screen | behavior | inout | the narrowed setView park guard | the browse element hidden class | Nav.setView | from settings entry until browse is applied again | PEERPARK cell
browse virtual controller anchor capture | behavior | out | the browseWillHide edge call in setView | Browse.deactivate which reads real geometry before display none lands | Nav.setView | one call per browse exit across all FIVE trigger edges enumerated in section 9 which is the single canonical count | PEERPARK second mutant for the button-nav edge and PEERFINALIZE for the two gesture-finalize edges and NPPARKS for the Now Playing entry edge with edge five recorded in section 9 as deliberately uncovered on the idempotence argument
settings screen mounted under Now Playing | behavior | inout | the retained npOpen guard | the settings element revealed when Now Playing closes | Nav.setView | from Now Playing entry to Now Playing exit | NPUNTOUCHED cell
fromKind | identity | out | Swipe.kindOf | constructionPlanFor and finalizationPlanFor | Swipe.kindOf | per gesture | KINDPLAN cell
toKind | identity | out | Swipe.kindOf | constructionPlanFor and finalizationPlanFor | Swipe.kindOf | per gesture | KINDPLAN cell
sourceHost | identity | out | the classifyTransition host projection | the env sourceEl branch selector in start | Swipe.classifyTransition | per gesture | KINDPLAN cell host assertions
destinationHost | identity | out | the classifyTransition host projection | the env renderDestination branch selector in start | Swipe.classifyTransition | per gesture | KINDPLAN cell host assertions
overlay kind membership | identity | out | Nav.isOverlay | Swipe.kindOf which is its only consumer | Nav.isOverlay | module lifetime | OVERLAYISNP cell
```

**No dead field is added.** Every row is an existing value whose producer, owner or membership
changes. Two rows record narrowings (`overlay kind membership`, `settings screen occlusion`) because
a responsibility whose owner changes is exactly the thing that otherwise survives in both places.

## 8. Ordering

Ordering requirements that are **correctness**, not incidental:

1. **The transform is cleared before the park is applied, at finalize.** `resetSwipeStyles`
   (`js/nav.js:113-119`) already runs at the top of `applyScreen` (`js/nav.js:131`), ahead of
   `setView`. Unchanged, and named because Stage A1 now makes `setView('options')` park `#home` on a
   path where it previously did not — a park applied while an inline `translateX` is still on the
   element would compose `translateX(-101vw)` with the gesture's residue.
2. **`d.browseWillHide()` runs before `.hidden` lands on `#browse`.** Already true at
   `js/nav.js:60-65`, and the reason is stated there: a hidden box measures zero, so the virtual
   controller's anchor capture must happen from real geometry. Stage A1 routes a new transition
   (browse→settings) through this edge, so the ordering becomes load-bearing on a path where it was
   previously never exercised.
3. **The six-way visibility loop is one operation.** Whatever form it takes, showing one settings
   screen and hiding the other five must not be split into a show-then-hide pair that another call
   could interleave — that split is the mechanism of the defect being fixed.
4. **Stage B's production edit and its frozen-spec edit land in one commit**, together with every
   consumer in §6's migration set. `js/swipe.js`'s kind domain and
   `test/fixtures/swipe-plan-spec.mjs`'s structural-case set are the two halves of one oracle;
   splitting them leaves the suite green against a spec that no longer describes production.
5. **The exclusivity loop is the load-bearing deletion, and the background deletion must not land
   without it.** This is the ordering that actually produced the reported defect, it was missing from
   the first draft, and it is the one item in this plan with **direct historical proof**. Commit
   `6c9e7e3` ("Park Options/subs like a real screen switch; stop painting their own background") did
   **both** halves this plan does — it parked `#home`/`#browse` *and* removed both backgrounds — and
   it was reverted by `2700b5c`, whose message states the cause exactly:

   > with no background, the hub and the sub render on top of each other simultaneously, statically,
   > making Options unusable. The parking added in the same commit parks `#home`/`#browse` beneath the
   > overlay stack; it does not help when one overlay sits on another.

   **The park was not the missing piece — `js/nav.js:83` was.** `6c9e7e3` left the hub mounted under
   its own sub, so removing the backgrounds exposed exactly that pair to each other. This plan
   succeeds where that commit failed for one reason: §12 item 11 deletes the hub-under-sub line. That
   makes the ordering a hard correctness constraint, not a tidiness preference — **the background
   deletion is safe only in a commit that also collapses the visibility block.** (The converse is
   merely inert: deleting the co-visibility without deleting the backgrounds fixes the defect and
   leaves dead declarations.) Step 3 puts both edits in one stage so the stage boundary enforces it,
   but it is named here because §8 is where the correctness orderings are enumerable, and a builder
   who splits step 3 for any reason must see the constraint — and see that it has already been
   violated once, in this repository, with a revert to show for it.

Incidental and free to move: the order in which the two CSS declarations are deleted in A1, the order
of the A2 z-index deletions, and the order in which the new structural-case rows are written.

## 9. Runtime-dependency policy

`js/swipe.js` stays DOM-free at module load and reads the world only through the injected `env`
(`env.document`, `env.navPill`, `env.sourceEl`, `env.renderDestination`). **This plan adds no ambient
read and no injected dependency.** Stage B changes only pure name-check and projection logic
(`kindOf`, the two host ternaries, the `KINDS` array) — none of which touches `env`. No value is
lazily cached, so there is no invalidation policy to define. No `getComputedStyle`, `window.innerWidth`
or `matchMedia` call is added anywhere.

**Every ambient and injected value crossing a declared range, named — including the untouched ones.**

- **`document.body.classList` token `np-locked`** — written at `js/nav.js:82` and cleared at
  `js/app.js:549` and `js/app.js:586`. **UNTOUCHED by every stage.** It is keyed to Now Playing, which S4 puts out
  of scope. No cell asserts it beyond NPUNTOUCHED's fixture sanity.
- **`d.browseWillHide`** (`js/nav.js:60`) — the injected hook wired to `Browse.deactivate()`
  (`js/app.js:2870`). **Not modified, but newly reached on FIVE edges, and this list is the plan's
  single canonical enumeration of them.**

  **⚠️ Three sections of this plan previously carried three different counts** — §7's ledger row said
  three, this list said four, §10 said "four" and then listed three in a pre-A1b form — **and a fifth
  edge was enumerated nowhere.** That disagreement is the tell that was available before the build:
  step 16 audits the suite against *this* section, so an edge missing here reads at that point as a
  test-design failure when it is a plan-enumeration failure, and routes to the wrong seat. **Every
  other section now defers to this list rather than restating a number.**
  1. **Button-nav browse→settings.** `setView('options')` crosses the shown→hidden edge on `#browse`
     for the first time on this path. Covered by `PEERPARK`.
  2. **Abort of a `settings→browse` gesture.** `showAppView` has already un-hidden and re-rendered
     `#browse` mid-drag (`js/app.js:496-497`), so the aborting `setView(settings)` hides it again and
     fires the hook. Covered by `PEERFINALIZE`.
  3. **An `NP→files` abort that left `#browse` un-hidden.** Covered by `PEERFINALIZE`'s edge-3 cell,
     `test/one-screen-type-finalize.test.js:171-221`. **Stage A1b relocates this edge**: before A1b
     the hook fires later, when NP is closed back to a settings screen; after A1b the abort's own
     `applyScreen(nowplaying)` hides `#browse`, so it fires **at the abort**. **The whole scenario
     moves, not one assertion** (§5.3.4, §6a) — four of that cell's assertions turn and two of them
     are fixture sanity. Left unchanged the cell **fails loudly** (`rec.calls` goes to 0 against an
     `assert.equal(…, 1)`); it does not pass vacuously.
  4. **Opening Now Playing while Browse is showing** — added by Stage A1b. `setView('nowplaying')`
     now crosses the shown→hidden test at `js/nav.js:55` with `#browse` un-hidden, so the hook fires.
     Covered by `NPPARKS`.
  5. **Supersession while Now Playing is the current screen** — added by Stage A1b, and enumerated
     nowhere before this revision. `begin()`'s hard reset calls
     `applyScreen(currentDesc(), { … })` at **`js/app.js:459`**. With `currentDesc()` resolving to
     `nowplaying`, A1b makes that call run `setView('nowplaying')` → the shown→hidden test at
     `js/nav.js:55` → `d.browseWillHide()`. **It is reachable**: an `NP→files` gesture un-hides
     `#browse` at `js/app.js:512`, and a second touch arming while that gesture settles takes the
     hard-reset branch. **Deliberately uncovered — a ruling, not an omission** (see below).

  The behaviour is correct at all five: in every case `#browse` is genuinely un-hidden and about to be
  hidden, so the deactivation precondition holds and the anchor is captured from real geometry before
  `display: none` lands. The point of enumerating them is that "correct" was until now an unproven
  reading — §14's `PEERFINALIZE` and `NPPARKS` are what prove it.

  **Edge 5 is deliberately uncovered, and the reason is recorded so step 16 reads it as a ruling.**
  Two facts decide it. First, **the contract on edge 5 is byte-identical to edge 4's** — the same
  `setView('nowplaying')` body, the same `js/nav.js:55` test, the same hook call with `#browse`
  observed un-hidden — so `NPPARKS` already proves the *behaviour*; what edge 5 adds is only a second
  *route* to it. Second, **an extra firing is harmless**: `Browse.deactivate()` is idempotent
  (`js/browse.js:332` no-ops when `activeEntry()` or `_vctl` is absent). Driving a real supersession
  through the harness to prove a route to an already-proven behaviour is cost without a defect class
  behind it. **The residual, stated rather than hidden:** if `setView`'s NP path ever gains an effect
  that is *not* idempotent, this edge stops being free and must gain a cell. That is the condition to
  re-open it on.
- **`d.isSignedIn`** (`js/nav.js:93`) — gates the navbar's `hidden` toggle. **UNTOUCHED**; no stage
  reads or writes it.
- **`d.updatePlayerUI`** (`js/nav.js:94`) — the trailing reconcile that runs after every `setView`,
  including the settings entries this plan re-routes. **UNTOUCHED**; its behaviour at those call sites
  is unchanged.
- **`d.byId`** — the single injected element lookup through which `setView` and `applyScreen` resolve
  every screen. **UNTOUCHED**; no call site changes and no new lookup is added. The collapsed
  visibility loop resolves the same six ids the two statements it replaces resolved.
- **`d.renderScreen`** (`js/nav.js:147`) — the injected settings-screen render dispatch, wired to
  `renderScreen` at `js/app.js:2869`. **UNTOUCHED**: `applyScreen`'s settings branch keeps its
  `if (render) d.renderScreen(desc.v)` call unchanged, on the same condition, for all six screens.
- **`d.renderNowPlaying`** (`js/nav.js:152`) — the injected Now Playing render dispatch. **UNTOUCHED
  by every stage**, and named explicitly because it crosses `applyScreen`, a declared range: S4 puts
  every Now Playing path out of scope, and the NP branch of `applyScreen` (`js/nav.js:152`) is not
  read, re-ordered or re-conditioned by any step.
- **`d.renderBrowse`** (`js/nav.js:155`) — the injected Browse render dispatch, wired to
  `Browse.render`. **UNTOUCHED in shape**, and newly reached on one path: returning from a settings
  screen to Browse now re-enters through the same `applyScreen` browse branch that a return from Home
  already uses, so `Browse.render` re-activates the page via `showPage()` (`js/browse.js:304-318`).
  No call site is added or removed.
- **`env.scrollY`** (`js/app.js:523`, `() => window.scrollY || 0`) — the one ambient scroll read in
  the declared `js/app.js:515-539` range. **Its seam route is unchanged and no stage touches it**: it
  crosses into `js/swipe.js` only as a field of the injected `env` object handed to
  `Swipe.buildConstruction` (`js/app.js:543`), never as an ambient `window` read inside `js/swipe.js`.
  Its sole reader is `paneBuilders`' clone path, which only `browse→browse` reaches; no settings
  transition builds a pane, so no stage here adds, removes or re-routes a read of it. It is named
  rather than omitted because a value crossing a declared range without a stated route is
  indistinguishable from one the plan forgot.
- **`NAV` in `js/swipe.js:49-50`** — the module-scope handle resolved from `window.Nav` or `require`.
  **UNTOUCHED in shape**; Stage B changes what `NAV.isOverlay` returns, not how it is reached.

## 10. Lifecycle and ownership

- **Creates.** Nothing is created by any stage. No element, no wrapper, no controller, no listener.
- **Borrows.** Unchanged. Every settings screen already moves as a `borrowed-real` mover on every
  transition (`js/swipe.js:379`, via `plan.outgoing === 'real-source'`), and still does after Stage B.
- **Mutates.** The gesture writes `style.transform` on the borrowed settings element and clears it in
  `resetSwipeStyles`, which already enumerates every settings id (`js/nav.js:116`). Unchanged.
- **Mounts and unmounts.** This is the one lifecycle change, and it lands in two steps. **Stage A1**
  shrinks the settings **mounted set** from at most two (a sub plus its hub) to exactly one, by
  deleting the hub-under-sub line; the surviving exception at that point is a settings screen kept
  mounted under **Now Playing**, behind the guard at `js/nav.js:78`. **Stage A1b removes that last
  exception**, so the mounted set is exactly one **unconditionally** — including while Now Playing is
  open. This is Invariant S5 in lifecycle terms, and it is the whole of A1b's effect on this section.
- **Deactivates.** `Browse.deactivate()` gains trigger edges across A1 and A1b — **five in total, and
  §9 is the one place they are counted.** This bullet deliberately states no number of its own: an
  earlier draft said "four" here and then listed three, in a pre-A1b form, and that disagreement is
  how the fifth edge stayed unnamed. Nothing owns a new handle: `deactivate()` is idempotent with
  respect to an already-inactive controller (`js/browse.js:332` no-ops when `activeEntry()` or `_vctl`
  is absent), and re-entry activation stays owned by `showPage()` (`js/browse.js:304-318`), which the
  existing `renderBrowse` path already calls. **Three of the five occur on a gesture-finalize or
  gesture-supersession path**, which is why `PEERFINALIZE` exists: the narrowed guard runs at every
  finalize through `applyScreen`, and no cell drove it there before A1.
- **Releases and destroys.** No pane, timer, frame, listener or observer is created or retired. The
  `.nav-ghost` sweeps, `disposeOwnedPanes`, the row hold and the session-identity guards are all
  outside this plan's surface.
- **Nothing added now is justified only by a later stage.** Stages A1 and A2 add no field and no
  branch — they are subtraction plus one narrowed condition. Stage B adds one kind name whose
  consumers exist in the same commit.

## 11. The transition-kind consequences

**11.1 — What `overlay` means after Stage B: Now Playing, alone.** `Nav.isOverlay(v)` returns `true`
for exactly one input, `'nowplaying'`, and `false` for every other screen name in the registry. This
is checkable end to end because **`isOverlay` has exactly one consumer in the entire codebase**:
`Swipe.kindOf` at `js/swipe.js:61`. A grep over `js/**` for `isOverlay` returns `js/nav.js:34` (the
definition), `js/nav.js:198` (the export) and `js/swipe.js:61` (the call). No other module, and no
production branch, reads it.

**11.2 — The generated matrix, row by row.** `docs/transition-matrix.generated.txt` today reports 12
screens in 3 kinds and an 8-row construction table. After Stage B:

- The `registry` block gains a fourth line. `home` keeps 1 member; `browse` keeps 4; a new `settings`
  line carries the 6 (`options`, `general`, `playback`, `buffering`, `downloads`, `diagnostics`);
  `overlay` drops to 1 (`nowplaying`). **12 screens and 132 ordered pairs are unchanged** — only the
  kind projection over them changes.
- The construction table goes from 8 rows to 14. **Retained unchanged in every column:** `home→browse`,
  `home→overlay`, `browse→home`, `browse→browse`, `browse→overlay`, `overlay→home`, `overlay→browse`.
  **Deleted:** `overlay→overlay` (its kind now has one member, so it is unreachable — §6).
  **Added, seven rows:** `home→settings`, `browse→settings`, `settings→home`, `settings→browse`,
  `settings→settings`, `settings→overlay`, `overlay→settings`.
- **No added row carries a new construction value.** Every `settings` row takes the value set the
  corresponding `overlay` row carries today: a settings source is `outgoing: 'real-source'`, a
  settings destination is `incoming: 'real-destination'` with `renderDestination: 'none'`, and
  `abortRender` is `'none'` for every one of them including `settings→settings` (the six screens are
  static, pre-existing, separately-mounted elements — showing General does not overwrite the
  `#options` node, so an abort has nothing to restore). Stage B is therefore a pure **classification**
  change: it renames and re-partitions membership and changes no decision the swipe makes.
- The three trailing counts are unchanged: pairs building a pane stays **12 of 132** (browse→browse
  only), pairs re-rendering on abort stays **12**, pairs carrying the NP pill stays **22** (11 + 11,
  NP at either endpoint).

**11.3 — What `test/fixtures/swipe-plan-spec.mjs` must become.**

- `REPRESENTATIVE` (line 29) gains a fourth entry and reassigns one:
  `{ home: 'home', browse: 'books', settings: 'options', overlay: 'nowplaying' }`. Reassigning
  `overlay` from `'options'` to `'nowplaying'` is load-bearing — leave it and every "overlay" case is
  exercised by a screen that is no longer an overlay.
  **One latent trap comes with that reassignment, and the fixture header must record it.**
  `classifyTransition` emits a `now-playing-pill` decoration whenever `nowplaying` is an endpoint
  (`js/swipe.js:108-109`), while every `STRUCTURAL_CASES` entry declares `decorations: []` and the
  header states "decorations `[]` for every structural case". This is safe today and stays safe: the
  two consumers that build inputs from `REPRESENTATIVE` read a single field each (`outgoing`,
  `abortRender`), and the per-pair test that *does* deep-compare constructions derives its inputs from
  the registry and injects the NP decoration from the concrete screen name
  (`test/swipe-transition.test.js:105-107`) rather than from `REPRESENTATIVE`. The hazard is the *next*
  consumer: one that deep-compares an `expectedConstruction` built from `REPRESENTATIVE[kind]` fails on
  the overlay row alone, and that failure reads as a production defect. **Stage B adds one comment to
  the fixture header stating that `REPRESENTATIVE.overlay` carries a decoration modifier and that any
  whole-construction comparison must inject it.** One comment, and the trap is gone.
- `STRUCTURAL_CASES` (lines 58-67) goes 8 rows → 14: delete the `overlay→overlay` row (line 66), add
  the seven `settings` rows listed in 11.2, each with `expectedHosts` following the widened
  projection — a settings endpoint projects `sourceHost: 'overlay'` / `destinationHost: 'overlay'`
  (or `'by-id'` if the §6 rename is taken).
- **`MODIFIER_CASES` (lines 178-201) needs no change and must not be "fixed".** Its two NP cases are
  `nowplaying→books` and `books→nowplaying`, which stay `overlay→browse` and `browse→overlay` — the
  case names in the prose already read "overlay->browse" and are still literally correct.
- The header comment block (lines 32-57) restates the projection formula verbatim; it changes with the
  formula or it becomes a second, wrong copy of the contract.
- `paneOf` (line 73), `NP_SCREEN`, `NP_DECORATION`, `SEC15_CASES`, `PARAM_FAMILIES` and every
  descriptor scenario are **unchanged** — none of them keys on the overlay kind.
- `docs/swipe-model.generated.txt` §2's case table renames two rows (`overlay -> overlay` becomes
  `settings -> settings`; `overlay -> browse  options() -> books()` becomes `settings -> browse`) and
  §3's "overlay->overlay reachability" note becomes a settings→settings reachability note — its
  content is unchanged, because the mechanism it describes is still `openSub()` pushing a sub-screen
  on top of Options (`js/app.js:162-168`).

**11.4 — What does not change in `js/swipe.js`.** `constructionPlanFor`'s outgoing rule
(`js/swipe.js:167`) keys on `browse && browse` and is untouched. `finalizationPlanFor`'s rule
(`js/swipe.js:203`) keys on the same and is untouched. `buildConstruction`, `paneBuilders`,
`ghostApp` and `npPillClone` are untouched. The edits are: `kindOf` gains a settings test, `KINDS`
gains a member (which makes the two guard throws at `:152`, `:197`, `:200` accept it), the two host
ternaries widen, and `constructionPlanFor`'s `toKind` chain gains a `settings` arm alongside the
existing `overlay` arm.

## 12. The deletion list

Removing machinery is the point of this plan. It is not complete until each of these is gone from HEAD.

**⚠️ Citation vintage — read this before executing any item.** Line numbers in this plan are not all
of one vintage, and pretending otherwise is how a builder deletes the wrong lines. **Items for
UNSHIPPED stages (A1b's 25–28 and 34–37, A2's 6–7, B's 14–16 and 20–24) are re-pointed to HEAD
`02b388f`, build `2026-07-31.287`, and are executable as written.** Items for **SHIPPED** stages
(A1's 1–5 and 8–13, A1-fix's 29–31, A1-fix-r2's 32–33) carry the line numbers that were current when
that stage was designed, and are kept as the record of what was done — **they are history, not
instructions, and must not be re-executed.** The same applies to §5.4's session-lifetime table. Where
a shipped item is still live for a later stage, it says so and points at the current item.

**css/app.css — Stage A1**

1. `background: var(--page-bg);` on `#options` (`css:222`).
2. The two-line comment justifying it (`css:220-221` — "#options is an ADDITIVE overlay that paints
   over a live, un-parked page underneath, so it needs its own background").
3. `background: var(--page-bg);` on the five-sub group (`css:787`).
4. The two-line comment justifying it (`css:785-786`).
5. The "Options = additive overlay, same iOS-26 reasoning as Now-Playing" framing in the `#options`
   header comment (`css:207-210`) and the matching "Same additive-overlay model as #options" framing
   in the subs header comment (`css:772-776`) — replaced by the peer statement, not merely edited.

**css/app.css — Stage A2**

6. `z-index: 25;` on `#options` (`css:218`) and the "z 25: covers page content" clause (`css:210`).
7. `z-index: 26;` on the five-sub group (`css:783`) and the "z 26: one above #options so a sub-screen
   filmstrips ON TOP of it" clause (`css:775-776`).

**js/nav.js — Stage A1**

8. The `optOpen` and `subOpen` terms in the park-and-hide guard (`js/nav.js:56`) — the guard becomes
   `if (!npOpen)`.
9. The six-line additive-overlay rationale comment (`js/nav.js:50-55`) — the false premise itself
   (§1), not merely its wording.
10. The `const optOpen` and `const subOpen` declarations (`js/nav.js:48-49`) — dead once 8 and 11 land.
11. The `$('options').classList.toggle('hidden', !(optOpen || subOpen))` statement (`js/nav.js:83`) —
    this line **is** the co-visibility defect — and the separate sub loop (`js/nav.js:84`), both
    replaced by one six-way loop.
12. **Lines 78-81 only** of the comment at `js/nav.js:76-81` — the part describing the gone mechanism
    (the hub kept mounted under its own child); its two claims are separately answered (§15 R-D).
    **Lines 76-77 are KEPT, or rewritten, and must not be deleted with them.** They state why the
    `if (!npOpen)` guard exists at all — "leave the settings overlays' hidden state untouched when
    going TO NowPlaying so whichever one was underneath stays for the NP-back reveal." That guard is
    the first entry on this plan's own "explicitly NOT deleted" list, and after A1 it wraps a loop
    that already handles all six screens correctly — so a reader who finds it undocumented sees a
    guard with no visible purpose, and the obvious simplification deletes it and silently breaks the
    Now Playing back-reveal. `NPUNTOUCHED`'s mutant catches that edit, but the comment is what stops
    it being attempted. **Invariant: the retained guard carries its stated reason in source.**
13. The "additive overlays (like NP): no document scroll changes" claim in `applyScreen`'s settings
    branch comment (`js/nav.js:141-143`).

**js/swipe.js — Stage B**

14. `'options'` and the `isSub(v)` term from `Nav.isOverlay` (`js/nav.js:34`) — it collapses to
    `v === 'nowplaying'`.
15. The `overlay → overlay` expectation, everywhere it is written: `test/fixtures/swipe-plan-spec.mjs:66`,
    the corresponding generated matrix row, and the `docs/swipe-model.generated.txt` §2 case row. It is
    unreachable after B (§6) and an unreachable expectation is dead code in a fixture.
16. The stale "overlay" wording in the `js/swipe.js` header (`:46-48`, "The overlay membership is the
    single source in Nav") and in `classifyTransition`'s projection comment (`:96-101`), where the word
    now names one screen instead of seven.

**test/ and tools/**

17. `#options` and `'#downloads, #general, #playback, #buffering, #diagnostics'` from
    `OPAQUE_SELECTORS` in `test/page-bg-single-painter.test.js:26-29` — they move to
    `TRANSPARENT_SELECTORS`; `OPAQUE_SELECTORS` becomes `['.nowplaying']` alone.
18. The whole "THE MODEL" header block of that file (`test/page-bg-single-painter.test.js:4-20`),
    which describes the additive split as the source of truth. Replaced, not amended.
19. `test/nav.test.js:36-44` — "a sub-screen keeps the Options hub MOUNTED underneath it (build .106)".
    Its assertion is the defect. The test **name and body invert** rather than being deleted: the cell
    it occupies (a sub-screen's effect on its hub) still needs coverage, now in the opposite direction.
20. `Nav.isOverlay('general') && Nav.isOverlay('options')` from `test/nav.test.js:105` (Stage B).
21. `tools/mutate.mjs:487-489` — the `sourceHost` projection anchor, re-pointed to the widened line in
    the same commit (Stage B). Any anchor whose target text this plan deletes is de-registered in the
    same commit, or `test/mutation-anchors.test.js` reddens with `ANCHOR NOT FOUND`. A sweep of all
    102 registered mutants confirms this is the only one; see §6 item 5.
22. **The stale "the three additive overlays" wording in `test/page-bg-js-painter.test.js:4`**
    (Stage A1). It is stale twice over — there are seven such screens at HEAD and one after A1. It was
    named only in §16.1's prose in the first draft, which meant a HEAD-wide scrub driven from this
    list alone would have missed it; §13 step 3 now carries it.
23. **The count `8` in `test/swipe-declone-stage1.test.js:81` and the inline `REPRESENTATIVE`
    restatement in its line 70** (Stage B) — the first lands red otherwise, the second becomes a wrong
    second copy of the contract. §6 item 2.
24. **The false count in `test/swipe-stage6d.test.js:148`'s test name** ("for all 8 structural cases",
    Stage B) — it passes while asserting something untrue, which is worse than reddening. §6 item 3.

**Stage A1-fix (§5.4) — deletions that accompany the F1 repair**

29. **The absolute claim at `js/nav.js:102`** — "Safe because applyScreen is NEVER called during an
    active drag." Falsified by execution. Deleted or corrected in the same commit as the fix, and it
    must not survive it: after the repair it would describe a property the code newly enforces, but
    for a reason it does not give.
30. **The exclusivity universal at three shipped prose sites** — `css/app.css`'s `#options` header
    ("when it is shown, every other screen is parked or hidden"), the sub-group header ("when one is
    shown, every other screen is parked or hidden"), and `test/page-bg-single-painter.test.js:4-11`
    plus its assertion message at `:64-66` ("so nothing live is ever behind it"). Each is **scoped to
    *at rest***, naming the filmstrip/gesture window as the deliberate exception, in §5.1's wording.
    These are the *justification for deleting the backgrounds*, which is what makes the overreach
    matter: a future reader checking whether a background is still unnecessary must not find a
    guarantee the code does not make. Falsified by execution — a drag inside the filmstrip window
    leaves `#options` and `#general` both un-hidden and `#home` un-parked across multiple frames.
31. **The superseded benefit clause at `js/nav.js:71-72`** — "so whichever one was underneath stays
    for the NP-back reveal." Correct when written; §5.3.2 has since shown every NP-close path supplies
    that benefit without the exemption, so HEAD carried a claim the plan of record contradicts
    (§6.6 — HEAD holds only current truth). **The A1-fix half is DISCHARGED**: A1-fix rewrote the
    comment into the seven lines now at `js/nav.js:71-77`, which state the clause is *not* what makes
    the reveal work. **The A1b half is item 27** — deleted whole with the guard it explains. *(The
    rewrite introduced an error of its own, attributing the surviving benefit to the wrong guard; see
    §5.3.2 and item 27. That is a second reason item 27 deletes rather than trims.)* **The standing
    rule this item established is what items 34–37 apply:** leaving a known-wrong claim in HEAD
    "because it is going away anyway" is the habit this plan's §1 records twice.

**Stage A1-fix-r2 (§5.4) — the replacement, and the second false absolute**

32. **The claim at `js/nav.js:110`, shipped by A1-fix itself** — "so this reset never lands on an
    element a live gesture owns as a mover." **Executed-false in the sense that matters**: it lands on
    *session*-owned movers mid-settle. A1-fix retired one false absolute (`:102`) and shipped a
    narrower one in its place; r2 must not repeat the move. The replacement states the **ownership**
    lifetime and its two boundaries (goes live → `sessionDone` at finalize/reveal-drop), so a future
    reader can check it against `js/app.js:216-226` rather than take it on faith.
33. **The predicate `gestureLive` and its injected dep name** — replaced, not extended. The name
    outlives its meaning the moment the body reads `session` instead of `d`, and a predicate named for
    the wrong concept is how the next reader re-derives the wrong lifetime.

**Stage A1b — the product change (items 25–26) plus the claims it falsifies (27–28, 34–37)**

**The BEHAVIOUR change is items 25 and 26 and nothing else: two deleted conditions, pure subtraction.**
Items 27–28 and 34–37 delete or rewrite **comments only** — zero behaviour, no declaration touched.
The split is stated because an earlier draft called the whole block "the stage's whole product change",
which invited a reader to think the comment scrubs were optional. They are not: §12 is the plan's
authority for what must be gone from HEAD, and item 31 already rules on this exact class —
*"leaving a known-wrong claim in HEAD 'because it is going away anyway' is the habit this plan's §1
records twice."*

25. **The `if (!npOpen)` guard on the park/hide block (`js/nav.js:51`)** — the block runs
    unconditionally, so entering Now Playing parks `#home`, hides `#browse` and fires
    `d.browseWillHide` exactly as entering any other screen does.
26. **The `if (!npOpen)` guard on the six-way settings loop (`js/nav.js:78`)** — the loop runs
    unconditionally, so entering Now Playing hides all six settings screens. *(An earlier draft cited
    `js/nav.js:73`; the probe cites `:82` and `test/one-screen-type.test.js:189` cites `:82` — both
    pre-A1 values. **`js/nav.js:78` is the line at HEAD `02b388f`.**)*
27. **The SEVEN-line exemption comment (`js/nav.js:71-77`), deleted whole.** *(An earlier draft called
    this "the two-line comment (`js/nav.js:71-72`)" and quoted it as justifying the exemption. **That
    describes a pre-A1-fix artifact.** A1-fix already rewrote it once, in discharge of item 31, into
    seven lines that **refute** the quoted sentence — "This is NOT what makes the NP-back reveal
    work". Lines 73-77 then state the exemption's supposed real benefit in the **present tense**, so a
    builder who deletes only "lines 71-72" strands a live description of a retired mechanism in HEAD.)*
    Two further reasons it goes whole rather than being trimmed: the benefit it names belongs to the
    **other** guard (§5.3.2, `PROBE-np-uniqueness.md` §9.1.f), and its closing lines already announce
    its own retirement at A1b.
28. **The A1-era comment fragment naming NP as the standing exception to the peer model**
    (`js/nav.js:48-50`, "Now Playing alone stays an additive overlay (S4)") — false after A1b.
    Replaced by the S4/S5 statement: NP keeps its background, geometry and stacking, and parks what is
    beneath it like every other screen.

**Stage A1b — three shipped comment sites that state the mechanism A1b removes, plus one whose example
A1b retires. Comments only; no behaviour and no declaration changes.**

34. **`js/nav.js:151`** — `// NP: no scroll reset — the page underneath must stay exactly as it was.`
    After A1b the page underneath is parked and hidden; it demonstrably does not stay as it was. **The
    code stays correct** — there is no document scroll to reset — but the stated reason is false, and
    it sits inside `applyScreen`, three lines from A1b's own edit, in the file the next reader opens
    first. **⚠️ This one also escapes step 17's scrub**, which is scoped to the phrase "additive
    overlay"; this sentence does not contain it. Without this item it is the durable residue.
35. **`js/app.js:1343`** — `// additive overlays (NP, Options) leave #home un-hidden underneath.`
    Already false for Options at HEAD (Stage A1 shipped) and fully false after A1b. **Comment only:**
    the pull-to-refresh guard at `js/app.js:1349` reads
    `$('home').classList.contains('parked')` and keeps behaving correctly either way.
36. **`js/app.js:494-496`** — the sweep's justifying comment, whose stated scenario is *"NP opened from
    Options → an NP→chapter-list swipe would show it through"*. After A1b, opening NP from Options
    **hides** `#options`, so that scenario cannot arise by that route. **The sweep itself is KEPT and
    its line is not edited** (§5.3.5, determination KEEP) — the comment is rewritten to name the
    `overlayFilmstrip` window, which is the case that actually keeps it alive and always was.
    `PROBE-np-uniqueness.md` §9.1.g records the sweep as a consumer that exists partly to compensate
    for the state item 26's guard retains.
37. **`css/app.css:508-509`** — `/* nav.js's setView(): NP is an ADDITIVE overlay that paints over a
    live, un-parked page underneath, so it needs its own background. */`, immediately above the
    `background: var(--page-bg)` at `css/app.css:510`. After A1b the justification is false while the
    declaration is **correctly retained**. **⛔ This is a `.nowplaying` COMMENT and nothing else. The
    declaration at `:510` is load-bearing (probe §9.2 marks it so) and S4 protects it; `NPUNTOUCHED`'s
    source-scan cell reddens if it is touched.** Rewrite the comment to the co-required-properties
    reason (`DecisionLog:1158-1161`): an opaque background, `inset: 0` and `z-index: 60` are what
    cover the topbar and the transport. This site is also the second shipped witness against the
    premise F2 corrected — a comment giving additivity as the reason for one of the properties an
    earlier draft called NP's uniqueness.

Note that §12 item 12's retained comment lines (`js/nav.js`, the `npOpen` guard's stated reason) are
**deleted by A1b**, not kept — the guard they explain no longer exists. Item 12's invariant was "the
retained guard carries its stated reason in source"; A1b retires the guard, which satisfies it
vacuously and correctly. This is the one place where A1b supersedes an earlier item of this list
rather than adding to it.

**Explicitly NOT deleted, and each for a stated reason** *(two entries of this list were themselves
stale and are corrected here — both described the pre-A1b world)*:

- **Every `.nowplaying` declaration**, including the `background: var(--page-bg)` at
  `css/app.css:510`, the `inset: 0` and the `z-index: 60` at `css/app.css:506`. **⛔ This is the
  standing user constraint** — `DecisionLog:1147-1167`. `NPUNTOUCHED`'s source-scan cell is the guard.
- **`js/app.js:498`'s stale-settings sweep.** *(Previously listed as "its live case is the NP one" —
  **that attribution was wrong**. Its live case is the `overlayFilmstrip` window, proven by execution;
  §5.3.5, determination KEEP.)* Its **comment** is rewritten at A1b (item 36); the sweep is not.
- **`npOpen` itself** — the module variable, its assignment at `js/nav.js:47`, the
  `$('nowplaying').classList.toggle('hidden', !npOpen)` at `js/nav.js:81` and the `np-locked` body
  toggle at `js/nav.js:82`. A1b deletes the two `if (!npOpen)` **guards**, not the flag; probe §3.7
  marks the exported flag load-bearing and §4.3 marks `np-locked` load-bearing. *(An earlier version
  of this list named `js/nav.js:82`'s guard as "the mechanism of NP's uniqueness" — **stale on both
  counts**: the line number is the `np-locked` toggle, and the guard it meant is deleted by item 26.)*
- **`overlayFilmstrip` and both call sites** (`js/app.js:166`, `js/app.js:177`); `Nav.SETTINGS_SUBS`,
  `isSub`, `overlayEl`, `viewElFor`.
- **The settings screens' geometry, padding, scrollers and `scrollbar-width: none` membership.**
- **`css/app.css:41`'s red diagnostic gradient — ⛔ a deliberate live diagnostic and a standing user
  constraint.** No stage touches it, and it must not be "cleaned up" as a stray debug value.

## 13. Staged sequence with owners

**One canonical list. Each step names its owner. No step depends on a later one.**

| # | Step | Owner |
|---|---|---|
| 1 | **Stress this plan, PER STAGE — this step is discharged separately for each stage and is NOT discharged for A1b.** A1/A2/B: done, `e979a41`, TEMPER, folded. **A1b: `35f0005` returned TEMPER with six Structural findings; they are folded in this revision, so A1b now owes a RE-REVIEW.** `Claude/Campaigns/one-screen-type-a1b.json`'s `plan-review` gate accepts `FORGE` alone, so step 8 does not open until that verdict is filed. Give the reviewer this revision's fold, not the original. | the plan reviewer |
| 2 | Author the Stage-A1 red cells: `ONEPAGE`, `PEERPARK`, **`PEERFINALIZE`**, `NOSETTINGSBG`, `NPUNTOUCHED`. Red at HEAD. **`PEERFINALIZE` is not optional and not deferrable past step 4 — see the binding note below.** | the test author |
| 3 | **Stage A1 build.** `js/nav.js`: narrow the park guard to `if (!npOpen)`; collapse the settings visibility block to one six-way loop; delete `optOpen`/`subOpen`; delete comment lines 78-81 while KEEPING or rewriting 76-77 (§12 item 12); scrub the false additive-premise comments. `css/app.css`: delete both `background: var(--page-bg)` declarations and their justifying comments; rewrite both header comments to the peer statement. Invert `test/nav.test.js:36-44`. Rewrite `test/page-bg-single-painter.test.js` to §16.1 and scrub `test/page-bg-js-painter.test.js:4`'s stale wording (§12 item 22). Bump the build number. | the builder |
| 4 | **Device gate A1.** Open Options; open each of the five subs and come back; Options from Home and from Books; swipe-back from a sub to the hub and from the hub to Books; open Now Playing from a sub and swipe back to it. **This is the step that answers the user's report** — the two-screens-through-each-other render must be gone. Watch specifically for cover re-decode returning Books→Options→Books (R-B) and for anything painting through a settings screen. | the user |
| 5 | Review the Stage-A1 build. | the code reviewer |
| 6 | **One adversarial strike, aimed per §16.4** — a reachable interleaving in which `env.renderDestination` or `Nav.overlayFilmstrip` un-hides a settings screen while `#home` is un-parked or `#browse` un-hidden, **and a frame is painted in that state**. Supersession and an abort interleaved with a button-nav are the likeliest carriers. **Not** the no-background claim, which is settled by reading (§16.4). | the adversary |
| 6a | Author the `FILMSTRIPDRAG` red cell (§14). Red at HEAD — it must reproduce F1 on shipped code before the fix exists. | the test author |
| 6b | **Stage A1-fix build — the shipped defect (§5.4), ahead of A1b.** Make `overlayFilmstrip`'s reconcile a no-op while a gesture session is live (or cancel the pending `finish` at go-live, never at arm). Delete or correct `js/nav.js:102`'s false invariant. Scope the three exclusivity universals to *at rest* (§12 item 30). Correct or mark the superseded clause at `js/nav.js:71-72` (§12 item 31). Bump the build number. | the builder |
| 6c | **Device gate A1-fix (RUN, clean — but narrower than it looked).** Tap `‹ Back` on a settings sub-screen and immediately edge-swipe; the destination must track the finger. It drove **held** drags, which release *after* the net is consumed — exactly the case the shipped fix handles — so it could not see the settle-window fracture. Recorded as narrow, not as wrong. | the user |
| 6d | Author the third `FILMSTRIPDRAG` cell — the post-release settle window (§14, window three). **Red at HEAD against the shipped `.282` predicate**, which is mutant NATURAL-c. | the test author |
| 6e | **Stage A1-fix-r2 build.** Replace the predicate with the session-ownership form (`!!session && session.live`, §5.4) — a replacement, not an addition — and rename `gestureLive` and its injected dep to name ownership rather than liveness. Correct `js/nav.js:110`'s claim, which is false in the sense that matters (the reset does land on session-owned movers mid-settle). Bump the build number. | the builder |
| 6f | **Device gate A1-fix-r2 — the FLICK form, which 6c could not see.** Tap `‹ Back` on a settings sub-screen (or a hub row for the forward variant), then edge-**flick** and **release with commit roughly 125–340ms after the tap**, toward Books and toward Home. **A held drag cannot exercise this band** — release must land inside it. Watch for the committed destination vanishing mid-snap and popping back in about a third of a second later. **This is also the candidate repro for the user's unconfirmed pop-in** (§15 R-I). | the user |
| 7 | Author the Stage-A1b red cells: `NPPARKS`, `NPRECONCILE`, and the **`PEERFINALIZE` edge-3 RELOCATION** — not a one-assertion edit. In `test/one-screen-type-finalize.test.js:171-221`, **four assertions turn and the cell's subject ceases to exist**: `:186-188` and `:202-204` are **fixture sanity** and redden regardless of where the hook assertion points; `:216` goes `1 → 0`; `:218` goes `[false] → []`. Re-aim the whole scenario at the **abort** (where the hook now fires) and install the recorder **before** the abort rather than after it, or the relocated call goes unrecorded. Strike the stale `NPUNTOUCHED` reference in the `:188` message. §5.3.4 and §6a carry the enumeration. Red at HEAD. | the test author |
| 8 | **Stage A1b build. ⛔ DOES NOT OPEN until step 1's A1b re-review is filed and accepted, and until step 6f has read on device (see the sequencing rule below).** **Behaviour — two deleted conditions, and nothing else:** `js/nav.js` delete both `if (!npOpen)` guards (**`:51`** and **`:78`**) so the park/hide block and the six-way loop run unconditionally. `npOpen` the variable, the `hidden` toggle (`:81`) and the `np-locked` toggle (`:82`) all stay. **Comments — six sites, zero behaviour (§12 items 27, 28, 34, 35, 36, 37):** delete `js/nav.js:71-77` **whole** (seven lines, not two); correct `js/nav.js:48-50`; correct `js/nav.js:151`, `js/app.js:1343`, `js/app.js:494-496` and `css/app.css:508-509`. **⛔ `css/app.css:510`'s `background: var(--page-bg)` is NOT touched** — item 37 is the comment above it only. **Tests and tooling — execute §6a's casualty table:** de-register mutant `#104`, re-point `#106`, retire `NPUNTOUCHED`'s two class-state cells (`test/one-screen-type.test.js:196`, `:211`; their subject moves to `NPPARKS`), keep its source-scan cell (`:218`), and land step 7's relocated `PEERFINALIZE` cell. Bump the build number. | the builder |
| 9 | **Device gate A1b — the NP-close path AND the aborted NP-back swipe.** Open NP from Home, from Books and from a settings screen; close each by swipe and by back. Abort an NP-back swipe and an NP→chapter-list swipe, then swipe again — the accumulation in §5.3.1 must be gone and no more than one screen may ever be visible beside NP. **Three honest questions, all three of §15 R-H:** (1) does closing NP back to Books re-decode the covers; (2) does the restore flash; (3) **on the aborted NP-back swipe — the path this step drives most — is the repeated render-plus-teardown felt?** R-H hazard 3 is new in this revision and names what to watch for; half-swipe back from NP repeatedly, as fast as is comfortable, on a long Books list. | the user |
| 10 | Review the Stage-A1b build. **The `showAppView` sweep is NOT an open question here** — it was settled by execution at the A1 review (§5.3.5, determination KEEP) and must not be re-opened. | the code reviewer |
| 11 | **Stage A2 build.** Delete `z-index: 25` and `z-index: 26` and their two stated causes from the comments. Bump the build number. | the builder |
| 12 | **Device gate A2.** The same swipe set as step 4, plus commit and abort on each, watching the two drag edges for any flash or paint-order artefact. Fallback if it regresses: restore both z-index declarations alone — they are independent of A1 and A1b, which stay shipped (§15 R-F). | the user |
| 13 | Author the Stage-B red cells: `OVERLAYISNP`, `KINDPLAN`. Red at HEAD. | the test author |
| 14 | **Stage B build.** `js/nav.js`: `isOverlay` collapses to `v === 'nowplaying'`. `js/swipe.js`: `kindOf` gains the settings test, `KINDS` gains `'settings'`, both host ternaries widen, `constructionPlanFor`'s `toKind` chain gains the settings arm. Rewrite `STRUCTURAL_CASES` to 14 rows and `REPRESENTATIVE` to four entries. Regenerate both `docs/*.generated.txt`. Re-point the `tools/mutate.mjs` host anchor. Bump the build number. | the builder |
| 15 | Build the classification gate to §16.2. | the builder |
| 16 | Audit the suite: every deleted or inverted assertion accounted for, no dimension left bare by the deletions. | the coverage auditor |
| 17 | Update `Claude/Subsystems/swipe-reveal.md` (the §23 overlay-background trigger, now answered), the board and the decision log; HEAD-wide scrub of "additive overlay" in records and comments that describe the settings screens **and Now Playing**. **⚠️ A phrase-scoped scrub is not sufficient and must not be relied on as the safety net for §12.** Searching for "additive overlay" reaches `js/app.js:1343` and `css/app.css:508` but **misses `js/nav.js:151`** ("the page underneath must stay exactly as it was"), which contains no such phrase. That is why those sites are §12 items struck at **step 8**, three stages and two device gates earlier, rather than left to this step. Scrub this step on the *claims* — the page underneath staying live, un-parked or un-hidden — not on one phrase. | the assistant |

**Where A1-fix-r2 sits, and why — RULED, not defaulted: its own increment, ahead of A1b.** The
standing reason to separate has been "two mechanisms, two device readings", and the tempting
counter-argument here is that r2 is a one-line predicate change in the same file region A1b touches.
**Size is not the criterion; the device reading is.** Three reasons, and the third is decisive.
(i) The reading r2 needs is the *flick band* (step 6f) — a specific release window on the filmstrip
path. A1b's reading is NP round trips. Bundled, a user seeing something wrong on an NP swipe could not
attribute it to the parking change or to the predicate, which is exactly the confound the standing
rule exists to prevent. (ii) r2 is a **correction to shipped code**, and the gate that passed it (6c)
was narrower than it looked; a correction whose first gate missed the defect earns its own gate in the
form that can see it. (iii) **A1b widens this defect's reach** — once `setView('nowplaying')` parks and
hides, the same settle-window reconcile reaches NP round trips, the app's most frequent transition. So
shipping A1b on top of a known-broken predicate makes the defect both worse and harder to attribute.
That is the same ordering argument that put A1-fix ahead of A1b, and it applies with more force now
that the defect is executed rather than predicted.

**Where A1b sits, and why: immediately after A1 and BEFORE A2 and B.** Three reasons, in order of
weight. (i) It is a **live, user-visible regression on a shipped build** — three screens rendering
through each other during the most frequent transition in the app is worse than anything A2 or B
addresses. (ii) **It would contaminate A2's device gate.** A2's gate asks the user to judge stacking
and flash at the drag edges; that reading is worthless taken on a build where the NP swipe already
renders a stack of screens through each other, and a defect found there could not be attributed. A2
must be judged against a clean baseline. (iii) It is the same guard in the same function as A1, so
the context is hot and the change is two deleted conditions. **A1b does not depend on A2 or B, and
neither depends on it** — the ordering is chosen on risk and on gate cleanliness, not on dependency.

**⛔ BINDING — A1b MUST NOT SHIP BEFORE THE A1-fix-r2 DEVICE GATE (step 6f) HAS READ.** This is a
hard sequencing constraint, not a preference, and it is stated in three places for the same reason
(here, in step 8's cell, and in `Claude/Campaigns/one-screen-type-a1b.json`). **Why it binds:** r2 is
a *correction to shipped code* whose first device gate (6c) drove **held** drags and therefore could
not see the fracture it was meant to clear; the form that can see it is the **flick released roughly
125–340ms after the tap** (step 6f). Until that reads, the shipped predicate is *unconfirmed on
device*. **A1b widens exactly that defect's reach** — once `setView('nowplaying')` parks and hides,
the same settle-window reconcile reaches NP round trips, the app's most frequent transition. Shipping
A1b first therefore makes the defect both worse and **unattributable**: a user seeing something wrong
on an NP swipe could not tell the parking change from the predicate, which is the confound the
one-mechanism-one-reading rule exists to prevent. The project's own record on this is explicit — **the
form that is device-tested is the form that ships** (§15, prior scars).

**BINDING ORDERING — `PEERFINALIZE` lands at step 2, before the step-4 device gate. Not after it.**
The device gate exercises the button-nav path, which is the path the user reports and the path
`PEERPARK` already covers. If the gesture-finalize cell is written after the device pass, **a
device-clean A1 gets read as evidence about paths no test ever drove** — which is the exact shape of
confidence error this project's records already document. The ordering is part of the sequence, not a
preference: step 2 is not complete until `PEERFINALIZE` is red at HEAD.

**Stage A1 is independently shippable and independently valuable.** If A2 and B are never built, the
reported defect is closed at its cause, no screen but Now Playing paints a background, and the
remaining residue is two unused `z-index` declarations and a kind name that reads wrong.

**A1 also removes an existing residue rather than adding one.** At HEAD, closing Now Playing back to
Options leaves `#browse` un-hidden underneath, covered only by `#options`'s opaque background. After
A1 that path runs the park block and hides it. The change is a net reduction in reachable states, not
a trade.

## 14. Coverage and mutation matrix

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
ONEPAGE | at most one of the six settings screens is ever without the hidden class and applying any settings screen hides the other five including the hub under its own sub-screen | unit drive Nav applyScreen over each of the six settings screen names in turn against the real index fixture and after each assert exactly one of the six lacks the hidden class and that it is the applied one | NATURAL restore the hub-stays-mounted rule so options is unhidden whenever a sub is applied which makes two of the six visible and reddens the exactly-one assertion expected killing cell ONEPAGE | unit nav screen-state against the real index fixture
PEERPARK | entering any settings screen parks home and hides browse exactly as entering browse does and the browse controller deactivation hook fires on the shown to hidden edge before the hidden class lands | unit apply books then apply options against the real index fixture with a recording browseWillHide dep and assert home carries parked and browse carries hidden and the hook fired exactly once and observed browse still unhidden at the moment it ran | TWO mutants because one cannot exercise both edges. NATURAL-a restore the settings exemption in the park guard so home is not parked and browse is not hidden which reddens both class assertions. NATURAL-b move the browseWillHide call after the hidden toggle which reddens the observed-unhidden assertion. expected killing cell for BOTH is PEERPARK | unit nav screen-state against the real index fixture
PEERFINALIZE | the narrowed park guard is correct on the GESTURE-FINALIZE path and not only on the button-nav path so a committed home to settings gesture leaves home parked and a committed browse to settings gesture leaves browse hidden with the browse deactivation hook fired exactly once while browse was still un-hidden and an aborted settings to browse gesture does the same after the mid-drag render already un-hid browse | integration boot the app harness with a recording browse deactivation dep and drive three real gestures to completion — commit home to options then commit books to options then abort options to books — and after each assert the home parked class and the browse hidden class and the hook call count and the hidden state observed at the moment the hook ran | TWO mutants. NATURAL-a restore the settings exemption in the park guard so neither home is parked nor browse hidden at finalize which reddens the class assertions on all three gestures. NATURAL-b move the browse deactivation call after the hidden toggle which reddens the observed-un-hidden assertion. expected killing cell for BOTH is PEERFINALIZE | integration app harness over the real shipped gesture listeners
FILMSTRIPDRAG | a pending overlayFilmstrip reconcile does not hide or un-transform an element a gesture SESSION owns as a mover across all three windows of that ownership — during the live drag and during the post-release settle phase before finalize — while an armed-only gesture that never locks still discharges the pending reconcile so the filmstrip is never stranded mid-transform | integration boot the app harness with fake timers and drive the real closeSub filmstrip three ways. window one arm and lock and hold and advance past the net and assert the incoming mover is not hidden and keeps its inline transform. window two arm without locking then release and assert the reconcile ran and no transform is stranded. window three arm and lock and RELEASE with commit before the net is due then advance past the net but not past the settle finalize and assert the committed incoming mover is still not hidden and both movers keep their settle transforms and the session still owns them then advance past finalize and assert no hidden to shown flip occurred | THREE mutants. NATURAL-a remove the ownership condition so the pending finish runs during the live drag which reddens window one. NATURAL-b make the condition test armed rather than live which strands the filmstrip transform and reddens window two. NATURAL-c restore the shipped drag-liveness form of the predicate so it reads the nulled drag handle instead of the session which stops suppressing after release and reddens window three | integration app harness over the real shipped filmstrip and gesture listeners
NPPARKS | entering Now Playing parks home and hides browse and hides all six settings screens exactly as entering any other screen does and fires the browse deactivation hook once on the shown to hidden edge while browse is still un-hidden | unit against the real index fixture apply books then apply nowplaying with a recording browse deactivation dep and assert home carries parked and browse carries hidden and all six settings screens carry hidden and nowplaying does not and the hook fired once observed with browse still un-hidden then repeat entering from options and from home | TWO mutants. NATURAL-a restore the npOpen guard on the park and hide block so home is not parked and browse is not hidden which reddens those assertions. NATURAL-b restore the npOpen guard on the six-way settings loop so a settings screen stays un-hidden under Now Playing which reddens the six-hidden assertion | unit nav screen-state against the real index fixture
NPRECONCILE | an aborted Now Playing gesture reconciles what the gesture un-hid so screens cannot accumulate underneath Now Playing across repeated aborts which is the mechanism that produced the three-screen render | integration boot the app harness and from Now Playing drive a back-swipe to home and abort it then a forward-swipe to the chapter list and abort it then assert after each abort that exactly one screen element besides nowplaying lacks both the hidden and the parked class and that the count does not grow across the two aborts | NATURAL restore either npOpen guard so the finalize applyScreen for a nowplaying current no longer re-parks and re-hides which lets the un-park from the first abort and the un-hide from the second both persist and reddens the count assertion on the second abort | integration app harness over the real shipped gesture listeners
NOSETTINGSBG | the page background variable is painted by exactly the fixed body pseudo-element and the Now Playing rule and by no other screen rule so every screen but Now Playing is transparent | gate read the shipped stylesheet and assert the set of selectors declaring the page background variable is exactly the body pseudo-element and the Now Playing selector and separately assert each of home browse options and the five-sub group declares no background property at all | TWO mutants. NATURAL-a re-add the page background to the options rule so the painter set gains a seventh member and the transparent assertion reddens. NATURAL-b delete the Now Playing background so the painter set loses its only screen and the painter-set assertion reddens. expected killing cell for BOTH is NOSETTINGSBG | gate source scan over the shipped stylesheet
NPUNTOUCHED | Now Playing keeps every property the user decision names so its rule still declares its own background and its full-viewport inset and its z-index above the topbar and the transport | source scan read the shipped stylesheet and assert the Now Playing rule declares background var page-bg and inset 0 and z-index 60 and that the body np-locked navbar rule still raises the navbar above it | NATURAL delete the Now Playing background declaration which reddens the painter assertion and also reddens NOSETTINGSBG from the other direction | gate source scan over the shipped stylesheet
OVERLAYISNP | the overlay screen kind has exactly one member across the whole screen registry and that member is Now Playing while every settings screen classifies as the settings kind | unit enumerate the whole registry from Nav SETTINGS_SUBS and the Swipe browse family plus home options and nowplaying then assert Nav isOverlay is true for exactly one name and that Swipe kindOf returns overlay for exactly that one name and settings for all six settings names | NATURAL restore the options term to isOverlay so the overlay kind regains a second member which reddens the exactly-one assertion and flips the kindOf result for options expected killing cell OVERLAYISNP | unit pure classification over the derived registry
KINDPLAN | every settings endpoint yields the same construction and finalization values the overlay endpoint yielded before the split so the taxonomy change alters no decision the swipe makes and the unreachable overlay to overlay case is absent from the contract | unit call the real classifyTransition and constructionPlanFor and finalizationPlanFor over all fourteen structural cases from the rewritten frozen spec and compare every field against the hand-written expectation and separately assert the frozen spec contains no case whose source and destination are both the overlay kind | TWO mutants. NATURAL-a change the settings arm of the toKind chain to render into the browse host which reddens every settings destination row. NATURAL-b narrow the source host projection to exclude the settings kind which reddens every settings source host row. expected killing cell for BOTH is KINDPLAN | unit three-layer oracle against the frozen spec
```

**`NPUNTOUCHED` is narrowed, not weakened.** Through Stage A1 it carried two jobs: the class-state
assertion that a settings screen stays un-hidden under NP, and the source guard that NP keeps its own
background, inset and stacking. **A1b abolishes the first by design**, so it retires (§6a) and its
subject moves to `NPPARKS`, which asserts the new truth over the same elements. What remains is the
**S4 guard** — the cell that fails if anyone "consistency-fixes" Now Playing into an ordinary screen,
which is precisely what the user's decision forbids. That job matters more after A1b, not less,
because A1b is the only stage that touches NP at all.

**Ten cells, seventeen mutants.** Every cell asserts a **source fact, a class-state fact, a call-count
or call-ordering fact, or a pure-function return** — never a rendered geometry, a paint order or a
composited result. **`NPPARKS` and `NPRECONCILE` are held to this strictly**: neither asserts that
fewer screens are *visible*, that NP *covers* anything, or that the stack no longer shows through —
those are stacking and paint, jsdom has neither, and such a cell could not fail. They assert only
class state and a count of un-hidden elements, which is the *mechanism* behind the defect. **The
outcome the user actually reported — no longer seeing three screens at once — is device-owed and is
step 9's job, not CI's.** That is deliberate: jsdom has no layout and no paint, so a CI cell asserting that a
settings screen occludes what is behind it, or that removing a z-index does not flash, **could not
fail** and would be a false witness. Those questions are §15's, and they are device-owed. This is the
discipline `PLAN-swipe-declone.md` §14 already recorded, applied here by not writing those cells at all.

**`PEERFINALIZE` is not blocked by that caution, and it is why the cell exists.** Everything it
asserts is class state and call ordering. The instrument already exists and is the established one for
this exact class: `test/app-harness.js` boots the real `app.js` and drives real touch sequences, and
`test/swipe-declone-stage1.test.js`'s `HOMESTAYSLIVE` is an existing cell of precisely this shape
asserting precisely this kind of fact about `#home.parked` across a live gesture. The "observed
`#browse` still un-hidden at the moment the hook ran" assertion is the shape `test/nav.test.js`'s
recording dep already implements, so it is proven implementable rather than merely proposed. **The
argument for writing it is this project's own history:** `.106` and `.107` both shipped past a fully
green suite because the code lived where no test could reach it — which is the stated reason
`js/nav.js` exists behind injected deps in the first place. A change to this guard that is proven only
on the button-nav path is the same shape of gap. **Recommendation, not a requirement:** one
integration cell covering the commit and the abort together satisfies the invariant; a unit cell
driving `applyScreen` through the finalize opts (`{render:false, resetScroll:false, keepGhosts:true}`)
would satisfy it equally. The invariant is that the narrowed guard is proven on a gesture-finalize
path and that the `browseWillHide` edges §9 enumerates are covered as §9 rules; the cell's shape is
the test author's call.

**Edge coverage against §9's five, stated so step 16 audits against a settled map rather than
reconstructing one.** Edge 1 (button-nav browse→settings) — `PEERPARK`. Edges 2 and 3 (the
`settings→browse` abort; the `NP→files` abort, relocated by A1b) — `PEERFINALIZE`. Edge 4 (opening NP
while Browse is showing) — `NPPARKS`. **Edge 5 (supersession while NP is current, `js/app.js:459`) —
DELIBERATELY UNCOVERED**, on the two grounds §9 records: its hook contract is byte-identical to edge
4's, which `NPPARKS` proves, and an extra firing is harmless because `Browse.deactivate()` is
idempotent (`js/browse.js:332`). **This is a plan ruling, not a bare cell.** Its re-open condition is
named in §9: if `setView`'s NP path ever gains a non-idempotent effect, edge 5 owes a cell.

**Cells that get inverted rather than kept:** `test/nav.test.js:36-44`. Its subject — what a
sub-screen does to its hub — is still a real dimension; only the correct answer changes. Deleting it
would leave the dimension bare, which is why §12 item 19 inverts it instead.

## 15. Risk, and what only a device can settle

**R-A — iOS fixed-bar seating. Verified independently; the mechanism is closed by construction.**
The hazard is that hiding a screen shrinks the document and trips iOS 26's ~50pt fixed-layer
displacement. Derived at HEAD rather than taken on trust: `#library` (`index.html:36`) contains
`.topbar` and the eight screen elements, and **every one of them is `position: fixed`** — `#home`
`css:161`, `#browse` `css:184`, `#options` `css:215`, the five subs `css:780`, `.nowplaying` `css:506`,
`.topbar` `css:236`. A `position: fixed` element contributes nothing to flow height, so `#library`
contributes nothing, and the signed-in document height is entirely `.app`'s
`min-height: calc(100% + 12vh)` (`css:75`) plus its padding. **Hiding or parking any screen cannot
change the document height, because none of them ever contributed to it.** The runway that seats the
bars is untouched by every stage. This is a source fact, and §16's second check pins it so a future
screen added without `position: fixed` reopens it loudly rather than silently. Residual: the *paint*
consequence is still a device observation, but there is no mechanism left for it to have.

**R-B — cover re-decode on browse→settings.** Today Options over Browse leaves `#browse` painted
(covered, not hidden); after A1 it is `display: none`, and iOS drops the decoded cover bitmaps of a
`display: none` subtree — the measured reason `#home.parked` and `.browsepage.parked` exist
(`css:78-85`, `css:92-97`). So returning Books→Options→Books may re-decode the list. **This is not a
new mechanism**: browse→home already hides `#browse` the same way at `js/nav.js:74` and ships. A1
extends an existing, accepted cost to one more transition. If it proves objectionable, the fix is a
`#browse.parked` recipe mirroring `#home.parked` — named, deliberately not built, and **not** a
reason to keep the additive model. Device row, step 4.

**R-C — the Stage 6f overlay-background precondition.** `Claude/Subsystems/swipe-reveal.md:396-400`
requires re-verification whenever an overlay's background changes. It fires here. It is answered in
the same record (lines 393-396): Swipe-declone Stage 1 superseded 6f on this axis, so there is no
ghost for the precondition to serve. What remains is the ordinary question of whether anything peeks
during an in-flow→settings drag now that the settings destination is transparent — and the answer
rests on `PLAN-swipe-declone.md` §15 R2's real-engine measurement of zero gap and zero overlap for
the entire live drag. **Device-owed, step 4**, because a measurement in Blink is not a claim about
WebKit compositing.

**R-D — the `.106` flash the hub-under-sub rule was built to prevent.** `js/nav.js:76-81` gives two
reasons for keeping the hub mounted. Both are re-derived here rather than assumed. (i) "the forward
slide-in exposes the base view": the hub→sub path uses `overlayFilmstrip` (`js/app.js:166`), which
moves **both** panes so they cover the viewport for the whole slide (`js/nav.js:167-174`) — the
exposure never applied to it. The `navTo` fallback path (`js/app.js:167`, reached from the book menu)
does use `slideInView`, which animates only the incoming pane; after A1 what shows behind it is
`body::before`, which is exactly what already shows during the shipped home→browse `navTo` slide.
(ii) "swipe-back would have no hub to filmstrip to": false at HEAD — `env.renderDestination`'s
settings branch removes `.hidden` from the destination itself (`js/app.js:551`) before it becomes the
incoming mover. **Both reasons are answered by reading; the visual result is device row, step 4.**

**R-E — the home↔settings park and un-park now takes the flash-suspect path.** After A1, opening
Options from Home parks `#home`, and swiping back un-parks it as the incoming mover — the same
un-park that Stage 6g identified as the home→books abort flash and mitigated with a permanent
compositing layer. The mitigation is the unconditional base rule at `css:168`
(`will-change: transform`, the device-validated form per `css:133-141`), so it already applies to the
new path. **Do not predict this either way**: it extends a known flash surface to a new transition,
the mitigation is present, and only the device settles whether it is clean. Device row, step 4.

**R-F — the z-index inversion (Stage A2 only), narrower than first stated.** The primary safety
argument is not the overlap measurement but **DOM order, which reproduces both deleted relationships
exactly and does not involve the compositor at all** (§5.2): the subs follow `#options` in the markup
so a sub still paints above the hub, and `#browse` precedes every settings screen and declares no
`z-index`, so a settings screen still paints above it. And the inversion against `#home` is narrower
than a flat reading suggests: `#home.parked` declares `z-index: 0` (`css:127-131`), so **at rest the
settings screen paints above the parked `#home` both before and after A2**, by DOM order. The
inversion exists **only while `#home` is un-parked** — the duration of a `home↔settings` gesture and
its synchronous finalize window. **That window is what the A2 device gate should be aimed at**, not
the at-rest screen. The residual is a synchronous-call argument, which is not a compositor
observation, so **A2 keeps its own stage, its own device gate and an isolated fallback**: restoring
the two declarations undoes A2 alone and leaves A1 shipped, because the background removal and the
stacking removal are independent.

**R-G — `overlayFilmstrip` between two transparent panes.** During a hub↔sub filmstrip both panes are
briefly unhidden and moving with no background of their own. They are set to their start transforms in
one synchronous block with `transition: none` before `void toEl.offsetWidth`
(`js/nav.js:200-203`), so no frame is painted with both at rest at the same place. Device row, step 4.

**R-H — Now Playing's exit paths are what to watch (Stage A1b). THREE distinct hazards, all
device-owed.** This is the honest cost of A1b and the reason step 9 exists. **Two sit on the CLOSE and
one on the ABORT** — and the abort is the path step 9 drives most, so an earlier version of this
section, which named only the two close hazards, sent the user to the right place without telling them
what to watch for.

1. **Cover re-decode.** Today `#browse` stays un-hidden under NP, so its decoded cover bitmaps stay
   warm. After A1b it is `display: none` for the duration, and iOS drops them (`css/app.css:78-85`) —
   so closing NP back to Books may re-decode the visible rows. This is the R-B class on a **much more
   frequent** transition: transport → NP → back is the app's most-used round trip, where
   browse→settings is occasional. **That frequency is what makes it worth a dedicated gate rather than
   a note.** Named fallback if it bites: the `#browse.parked` recipe already carried in §4 DEFERRED —
   park it off-viewport like `#home` instead of hiding it, which keeps it painted. That fallback is
   *pre-designed and not built*; building it is a decision for after the device reading, not before.
2. **A re-render or a flash on restore where today there is none.** Closing NP now restores a screen
   that was parked/hidden rather than one left live. The mechanism is unchanged — every close path
   already calls the same restore (§5.3.2) — but a parked `#home` being un-parked at an NP close is
   the **same un-park that Stage 6g identified as the home→books abort flash**, now reached from a new
   direction. 6g's mitigation is the unconditional `will-change: transform` at `css:168`, so it
   already applies. **Do not predict this either way**: the mitigation is present, the path is new,
   and only the device settles it.

3. **A full render plus a controller teardown on every ABORTED NP-back swipe, where today there is
   neither.** This hazard is on the abort, not the close, and it is the one step 9 exercises most.
   Mid-drag, `showAppView(dest, true)` un-hides `#browse` and runs `Browse.render(desc)`
   (`js/app.js:512`, reached from `renderDestination` at `js/app.js:542` with `render` hard-coded
   `true`). **Today the abort stops there**: `applyScreen(currentDesc())` resolves to
   `setView('nowplaying')`, both guarded blocks are skipped, and `#browse` is simply left un-hidden
   and active — the abort pays nothing. **After A1b the same abort runs the park/hide block**, which
   fires `d.browseWillHide()` → `Browse.deactivate()` (`js/nav.js:60`) and then hides `#browse`
   (`js/nav.js:69`). So every aborted NP-back swipe now pays **a full Browse render plus a virtual-
   controller teardown**, and it is repeatable as fast as the user can half-swipe, on a long
   virtualized list.

   **This is a cost of the fix, not a defect in it** — it is the same reconcile that makes the
   accumulation impossible (§5.3.3), and the end state is correct on every abort. What is unknown is
   whether it is *felt*. **Named fallback, the same one hazard 1 carries:** the `#browse.parked`
   recipe from §4 DEFERRED — parking `#browse` off-viewport instead of hiding it keeps it painted and
   closes hazards 1 and 3 together, since a parked `#browse` is neither re-decoded nor deactivated.
   Pre-designed, deliberately not built; building it is a decision for after the device reading.

**No hazard here is a reason to keep the exemption.** The exemption's cost is a defect the user
photographed twice; these are three regressions that may or may not appear and that have named,
pre-designed answers — two of the three closed by the same one. But they are why A1b ships on its own
with its own gate rather than riding with A2.

**R-I — the settle-window pop-in, and the user's unconfirmed sighting.** The killed `.282` predicate
puts the committed destination `display: none` for 125–340ms mid-snap and then restores it at the
fallback finalize — **hidden→shown with no gesture: a pop-in**. The user reported *"I thought I saw a
screen do an inappropriate pop in but until I can get that to repro again it's not worth chasing."*
**The signature matches on all three axes and it is NOT confirmed:** the observable is a screen
arriving late and popping in; the trigger is a narrow 125–340ms release band behind a settings
back/forward tap, which is naturally unreproducible by deliberate repetition; and it self-heals at
finalize, leaving nothing to inspect. Against it: gate 6c drove *held* drags and read clean, which is
exactly the case the shipped fix handles. **Step 6f's flick form is the repro to try, and it is the
only way to confirm or exclude it.** Do not record the sighting as explained until that gate reads.

**Un-prosecuted planes — recorded so they are not mistaken for cleared.** One strike returns one
executed counterexample; these were identified and deliberately not driven:

- **Abort variant of the same interleaving** — reconcile and finalize both apply `'options'`, so the
  snap animation is destroyed and the retreating mover vanishes early, but the *end state* is right.
  Milder, same mechanism, same fix; not separately driven.
- **Forward variant** (`openSub` hub-row tap, then an immediate back-flick) — same mechanism with the
  panes reversed. Step 6f drives it on device; no CI cell is proposed for it separately.
- **The real-browser dual-listener tick** — the filmstrip's `finish` and the settle's `finalize` are
  both `transitionend` listeners on the **same element** (`#options`), so a completing settle
  transition fires both in one tick, `finish` first. **Visually benign** (no frame between them), but
  the reconcile's side effects still run first: `options.scrollTop = 0` and a spurious
  `browseWillHide`. Noted only; jsdom cannot exercise it.
- **A second-order casualty of the fracture, un-prosecuted:** the mid-settle reconcile fires
  `d.browseWillHide()` → `Browse.deactivate()` on the very destination the commit is about to show,
  and the commit finalize runs `render: false`, which **never re-activates it**. A committed
  destination page left with a deactivated virtual controller is a real reachable state; its
  user-visible cost was not driven. The r2 predicate closes the path that produces it, which is why no
  separate fix is planned — but if r2 is ever narrowed, this returns with it.
- **W44's async refresh handlers** (`js/app.js:2658`, `:3165`, `:3258`) — they call `applyScreen`
  outside any gesture guard and exclude `'options'` but **not** the five sub-screens. **A third writer
  of this same class**, flagged by the A1 review as worth a look and not driven by the strike. It is
  not in this plan's scope and no stage here touches it; recorded because two writers of this class
  have now produced defects and the third is unguarded. **A1b does NOT widen them, and that is stated
  rather than left to inference:** `js/app.js:2658` and `:3258` both test `d.v !== 'nowplaying'` and
  `js/app.js:3165` admits only browse descriptors, so no A1b path reaches them.
- **`popstate` — a FOURTH writer of the same class, and the one A1b DOES give teeth.**
  `window.addEventListener('popstate', … applyScreen(currentDesc()))` at **`js/app.js:1319`** excludes
  nothing and is guarded by neither `gestureOwnsMovers` nor a screen test. Before A1b a stray popstate
  landing during an NP gesture ran `setView('nowplaying')`, which touched neither `#home` nor
  `#browse`. **After A1b the same event parks `#home` and hides `#browse` mid-drag** — the incoming or
  outgoing mover, on the app's most frequent transition. **Reachability is low by construction**, which
  is why this is recorded rather than actioned: history is deliberately pinned to a single entry
  (`js/app.js:121-125`), so a popstate is only a stray OS gesture. No stage here guards it and none
  needs to; it is named because §15's enumeration of this writer class is used as a safety argument,
  and an enumeration that omits the writer a stage newly arms is not one.
- **Supersession** — `begin()`'s hard reset ends in a full `applyScreen`, so it is self-healing. Held
  under strike, matching the plan review's reading.

**Prior scars this plan is exposed to.** The swipe and screen machinery has invalidated verifications
through environment traps before (memory `tomeroam-swipe-repaint-saga`, eight of them), and a
device-confirmed fix has been shipped in a *variant* form and flashed (`translateZ(0)` for
`will-change`, `css:133-141`). Consequence: **the form that is device-tested is the form that ships**,
and an A1 pass on device is not evidence about A2 or B.

## 16. The gate — specification only, not built here

Two checks, one file, `test/page-bg-single-painter.test.js` extended in place plus one new
classification test. Both read source text or call pure production functions, so neither can be made
vacuous by the environment.

**16.1 — No screen but Now Playing declares a page background.** Replaces the existing three tests in
`test/page-bg-single-painter.test.js`. `TRANSPARENT_SELECTORS` becomes
`['#home', '#browse', '#options', '#downloads, #general, #playback, #buffering, #diagnostics']`;
`OPAQUE_SELECTORS` becomes `['.nowplaying']`. The painter-set assertion becomes
`['body::before', '.nowplaying']`. **Fails in both directions**: a screen that regains a background
enters the painter set and reddens the equality; `.nowplaying` losing its background leaves it and
reddens the same assertion. The `stripComments` and `ruleBody` helpers are reused unchanged so a
comment mentioning `background` cannot be misread as a declaration. **Honest limit, stated in the
file's own header:** it proves a textual property of `css/app.css`. A background painted from
JavaScript is outside it — that is `test/page-bg-js-painter.test.js`'s job, and that file's own
"three additive overlays" wording (`:4`) is scrubbed in the same commit.

**Its prose is part of its specification, and is scoped to *at rest*.** The header block and the
assertion messages state *why* a screen may be transparent, so a future reader checks a background
against them. They must say "exactly one settings screen is un-hidden **at rest**", and must name the
filmstrip/gesture window as the deliberate exception — never "nothing live is ever behind it". The
shipped version overreached on exactly this and was falsified by execution (§12 item 30). This is not
pedantry about wording: it is the justification for having deleted the backgrounds, and a reader who
finds a guarantee the code does not make is a reader who deletes a background somewhere it *was*
load-bearing. This repository has already reverted one commit over that question.

**16.2 — The overlay classification cannot regrow a second member.** New unit test, the `OVERLAYISNP`
cell. It derives the registry rather than restating it — `Nav.SETTINGS_SUBS`, `Swipe.BROWSE_FAMILY`,
plus `home`, `options`, `nowplaying` — and asserts (a) `Nav.isOverlay` is true for **exactly one**
name across it, (b) that name is `nowplaying`, and (c) `Swipe.kindOf` agrees: `'overlay'` for exactly
that one, `'settings'` for all six settings names. Deriving the registry is what makes it fail when a
screen is added and forgotten, which is the same seam `test/screens.test.js:5-14` already guards from
the markup side. **Mutation evidence:** re-adding the `'options'` term to `isOverlay` must redden it;
adding a new settings screen to `SETTINGS_SUBS` without a `kindOf` arm must redden it. **Honest limit:**
it proves membership, not that the settings kind's plan values are right — that is `KINDPLAN`'s three-layer
oracle against the frozen spec.

**16.3 — Recommended, not required: every screen declares `position: fixed`.** R-A's whole safety
argument is that no screen contributes flow height. `test/screens.test.js:54-59` already asserts the
subs are in the fixed-overlay rule; widening that to every screen id would turn R-A's derivation into
a standing check. It is a recommendation because R-A holds at HEAD without it and adding it is not
needed for any stage to be correct.

**Wiring.** Both checks run in the normal `npm test` battery, therefore at pre-commit. 16.1 lands with
Stage A1 (it would fail on shipped code before it). 16.2 lands with Stage B, for the same reason.

### 16.4 — The adversarial strike, nominated

**Not the no-background claim.** An earlier draft nominated *"a reachable state in which a settings
screen is visible while something other than `body::before` is behind it."* That question has since
been **settled by reading**: the plan review enumerated all three writers that can un-hide a settings
screen (the six-way loop, `Nav.overlayFilmstrip` at `js/nav.js:200`, `env.renderDestination` at
`js/app.js:551`), traced what sits behind each, and covered rest, filmstrip, mid-gesture, abort,
commit and supersession — finding no counter-state and confirming that supersession is self-healing
because its hard reset ends in a full `applyScreen` reconcile. Sending the adversary at a question a
reviewer has already decided by reading spends the strike on a specimen that will not break, and a
held stone there would be **mistaken for safety on the part that is actually unproven**.

**The notch, one layer down:**

> Find a reachable interleaving in which a settings screen is un-hidden by `env.renderDestination`
> (`js/app.js:551`) or `Nav.overlayFilmstrip` (`js/nav.js:200`) while `#home` is un-parked or
> `#browse` is un-hidden, **and a frame is painted in that state.** Supersession of one gesture by
> another, and an abort that interleaves with a button-nav, are the likeliest carriers — they are the
> two paths where the reconcile that would restore the invariant has not run yet.

**The notch was cut in the right place, and the device has since confirmed it — which is worth
recording because it is rare to get the evidence.** The A1b defect (§5.3.1) is *exactly* an instance
of this class: `env.renderDestination` and `showAppView` un-park and un-hide screens during a gesture,
NP's exemption meant the finalize reconcile never put them back, and frames were painted in that state
— photographed twice. The strike was aimed at "a writer outside `setView` un-hides a screen and a
frame is painted"; that is what shipped. **Consequence for the remaining strike: A1b closes the
NP-shaped instance by making the finalize reconcile unconditional, so the adversary should now hunt
the class *elsewhere* — supersession, and an abort interleaved with a button-nav, on non-NP screens —
rather than re-running the NP case, which A1b makes self-healing.**

This is the right notch for three reasons. It targets the **two writers outside `setView`**, which are
the ones the six-way loop cannot constrain (§5.1) and where this project's defects actually live. It
is **executable** — a real counterexample, not a re-read. And it aims at the one thing reading cannot
settle: **whether a frame gets painted in a window the source says is synchronous.** The intra-`setView`
window is unobservable because no paint can occur between consecutive statements in one task; the
gesture windows are not obviously so.

**No strike for A2 or B.** A2 is two deleted declarations whose stated causes are obsolete, whose
fallback stacking reproduces both old relationships by DOM order (§5.2), and whose only inversion is
narrower than first stated — its residual is compositor behaviour, which a strike cannot reach and a
device gate can. B is provably a no-construction-value change, so the frozen-spec oracle is the right
check — **conditional on §6's migration set being complete**, which is what makes that oracle run
against the right artifacts.

## 17. How this changes the assumptions of `PLAN-swipe-declone.md` Stage 2

Stage 2 of that plan is separate work and this plan does not touch it. Three of its stated assumptions
move, and are recorded here so its next session does not re-derive them:

1. **§17's "the additive-overlay premise is void, and nothing here depends on it" stops being a
   recorded observation and becomes shipped behaviour.** Stage 2 should read the premise as already
   acted on rather than as an open note.
2. **The transition-kind table Stage 2 collapses gains a fourth kind (Stage B).** Stage 2's plan is to
   collapse `outgoing` to the single value `'real-source'` and `abortRender` to `'none'` once
   `browse→browse` stops cloning. That collapse is **unaffected in substance** — it is driven entirely
   by the `browse && browse` conjunction (`js/swipe.js:167`, `:203`), which Stage B does not touch —
   but it must be executed over **14 structural cases, not 8**, and it must not re-introduce an
   `overlay→overlay` row. If Stage B has not landed when Stage 2 runs, Stage 2 collapses 8 rows and
   Stage B re-expands them; the two orders are both correct and neither blocks the other.
3. **Stage 2's `#browse` → `display: contents` change does not generalize to the settings screens.**
   Stage 2 makes each `.browsepage` its own fixed inset own-scroll box and dissolves the host. The
   settings screens **already are** that shape, which is why this plan needs no host at all (§5.1).
   After both land, `.browsepage` and a settings screen are the same kind in the strong sense — each is
   its own fixed inset own-scroll box with no background and no stacking of its own — and the two plans
   converge rather than competing. Nothing in this plan makes Stage 2 harder; §5.1's choice not to add
   a host is what keeps them convergent, and adding one would have created the second model Stage 2 is
   trying to remove.

**Not changed by this plan:** Stage 1's de-cloning, the anti-clone gate
(`test/no-view-clone-gate.test.js`), `#home`/`#browse` transparency, and the `browse→browse` ghost.
None of them is read, edited or depended on by any stage here.

## Proportionality

Stage A1 is one narrowed condition, one collapsed loop, two deleted CSS declarations and four scrubbed
comments. Stage A2 is two deleted declarations. Stage B is a name-check, a kind name, two widened
ternaries and a rewritten fixture table that changes no value. **The change is small; the deletion
list, the transition-kind bookkeeping and the honest device-owed set are what make this document long.**
