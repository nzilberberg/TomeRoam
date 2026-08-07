# PLAN — the nav stacks survive a navigation inside the swipe settle window

Type: plan

<!-- vitruvius-gate {"plan_type":"defect-fix",
  "patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/app.js:350-356","js/app.js:698-707","js/app.js:1022-1032"],
  "callee_ranges":[],
  "affected_contracts":["tools/mutate.mjs:322","docs/swipe-model.generated.txt:1","build.json:1","Claude/Subsystems/swipe-reveal.md:174","Claude/Subsystems/swipe-reveal.md:178"],
  "staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Plans/PLAN-swipe-stage7.md","Claude/Zelda/Board.md","Claude/Decisions/DecisionLog.md","Claude/Campaigns/swipe-navstack.json"],
  "blocking_questions":["NAVSTALE","NAVIDENT","NAVAPPLIES","NAVRECONCILE","NAVTOTAL","NAVPAIR"]} -->

Status: **BUILT AND CODE-REVIEWED; a POST-REVIEW AMENDMENT is applied and a second build is owed.**
The slice was forged at plan-review round 3, built at `8acbdff` (build `2026-08-05.3`) and reviewed at
`Claude/Poirot/POIROT-swipe-navstack-settle-window-8acbdff.md`, verdict **PASS — fix-then-ship**. The
review's F1 lands on text §4.1 prescribes verbatim, so the correction is this amendment and not a
builder decision. Next seats: **the test author** for §13 step 9a, then **the builder** for step 9b.

**What this post-review amendment changes (2026-08-06), and why.** Three things, all of them
consequences of one measured defect and one measured omission.

1. **§4.1's `nav=` token gains a third arm** (`abort`). `applies` is `commit && …`, so on an abort it
   is false *by construction* and the shipped two-arm ternary printed `nav=superseded` on every plain
   abort — asserting a supersession that did not happen on roughly half of all settle lines, in a
   plan whose §5 defines *stack-superseded* only for a commit. §4 item 3, §4.1, §5 and §9 are
   corrected together. F1 in §16.
2. **§8's declared blast radius is corrected from 1 refusal to 2**, because the transform it was
   measured from was the three code edits only while §8 itself mandates two comment scrubs in the
   same commit. The scrubs alone rot `EMPTYAFTERHOME-a`, whose anchor uses the scrubbed comment as
   its uniqueness disambiguator. Three rounds of plan review did not see this; executing the complete
   change did. §16's blast-radius entry carries the re-derivation.
3. **§13 step 8's owner count is corrected** (five → three owned outside the build commit) and §9
   gains the abort-token clause the review's O3 named. §16 rules on O3.

**Input state at this post-review amendment, executed.** HEAD `e80fcbe`, `main` == `origin/main`,
tree clean, no `*.mutbak` anywhere, build `2026-08-05.3`, `tools/mutate.mjs` holding **161**
registrations across **171** anchor parts (counted by importing the module). Suite at HEAD:
**935 / 934 pass / 0 fail / 1 skip**, count read from the runner. Every figure introduced by this
amendment was produced on copies of the tree outside the repo, control first, with `node_modules`
reached by a directory junction; the untransformed control copy reads **935 / 932 pass / 2 fail /
1 skip**, the two failures being the git-only gates that cannot pass in a tree with no `.git`.
`tools/mutate.mjs` was imported (it is CLI-guarded); `tools/source-gate-sweep.mjs` was never
imported, because importing it mutates `js/app.js`.

The round-2 temper is `Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r2.md` (verdict
TEMPER, reviewed at `decfbd9`); round 1 is `…-r1.md` (reviewed at `13a97b0`) and its dispositions are
in §14. **What changed at round 2:** `NAVTOTAL`'s source-only status is corrected — it holds for the
`navStack.length` conjunct and is measurably false for the forward conjunct, which has a behavioural
killer (drive T, §1) and now has its own cell `NAVPAIR` (§9); §5's per-writer identity argument is
corrected to a per-*sequence* one; §9 dimension 4(b)'s interference matrix gains its third cell;
§13 step 5b names the tree state each of its two refusal figures was measured against; §12's
branch-B residual is retired by drive B′; §8 cites the gate that enforces "closed by construction".
**What did not change:** the design, the predicate, the three prescribed edits, the standalone-and-first
ruling, §8's blast radius and line delta, §10's rebase arithmetic, and every round-1 disposition —
all eight were re-derived by the reviewer, control first, and none was re-opened. **What remains
unexecuted:** §1's branch-B *chapter-list* route (the drill-back tap on a real chapter list) is still
not driven; it is no longer load-bearing, because drive B′ produces the same throw with no library
data. Whether drive T's two-tap interleaving is reachable inside a real 340 ms window on a device is
a reading of the interaction, not a measurement — §12.

Closes board row **`T-S7M`**, which routed this defect to the planner with two obligations:
reproduce it, and rule on fold-into-stage-7 versus standalone. §1 is the reproduction; §10 is
the ruling.

Input state at the ROUND-2 amendment — the tree state every figure in §8's rows, §10's table and §15
was measured against, kept here so no figure is readable without the tree it belongs to: every
round-2 measurement was taken against the tree at
`decfbd9`; HEAD is now `c92c6fb`, whose only change from `decfbd9` is `Claude/Zelda/Board.md`
(`git diff --name-only decfbd9 HEAD` — one record, no source, tooling, test or generated file), so
every figure below stands unmoved. `main` == `origin/main`, build `2026-08-05.2`, no `*.mutbak`
anywhere. `tools/mutate.mjs` holds **152** registrations across **161** anchor parts (counted by
importing the module, not by grep). Suite at this amendment, count read from the runner:
**916 tests / 915 pass / 0 fail / 1 skip**. Every measurement below was produced on a copy of the
tree outside the repo, control first; `git status --porcelain` in the repo named no source, tooling,
test or generated file before or after any probe. The round-2 amendment changes **no source text**,
so §8's measured blast radius and §10's measured shifts are carried forward unchanged rather than
re-measured.

---

## Index

1. [The defect, reproduced](#1-the-defect-reproduced)
2. [Defining records reconciled (U1)](#2-defining-records-reconciled-u1)
3. [Applicability](#applicability)
4. [Exact scope boundary (U2)](#4-exact-scope-boundary-u2)
5. [The invariant, and the design that satisfies it (U11)](#5-the-invariant-and-the-design-that-satisfies-it-u11)
6. [Lifecycle and ownership of the stack mutation](#6-lifecycle-and-ownership-of-the-stack-mutation)
7. [Ordering (U8)](#7-ordering-u8)
8. [Blast radius, MEASURED (U10)](#8-blast-radius-measured-u10)
9. [Coverage Model](#9-coverage-model)
10. [Why this is a standalone slice and not a stage-7 amendment](#10-why-this-is-a-standalone-slice-and-not-a-stage-7-amendment)
11. [What this does NOT do (U2 deferrals)](#11-what-this-does-not-do-u2-deferrals)
12. [Residual doubt](#12-residual-doubt)
13. [Sequence, owners, exit condition](#13-sequence-owners-exit-condition)
14. [Round-1 temper — per-finding disposition](#14-round-1-temper--per-finding-disposition)
15. [Round-2 temper — per-finding disposition](#15-round-2-temper--per-finding-disposition)
16. [Post-review amendment — per-finding disposition](#16-post-review-amendment--per-finding-disposition)

---

## 1. The defect, reproduced

A swipe that has been released is SETTLING for up to 340 ms before `runFinalize` runs. During that
window the rest of the UI is live: a tap can navigate. `runFinalize`'s commit branch
(`js/app.js:702-706`) then mutates the nav stacks using state the gesture captured when it armed,
without checking that the stacks still hold it.

```
        if (commit) {
          if (cur.dir === 'back') fwdStack.push(navStack.pop());
          else if (cur.newNav) { navStack.push(cur.dest); fwdStack.length = 0; }
          else navStack.push(fwdStack.pop());
        }
        const dest = currentDesc();
```

Both stack-reading branches can be invalidated inside that window, and both were **executed** against
the real `js/app.js` through `test/app-harness.js`, each with a passing negative control.

⚠️ **Provenance, so the routes are not confused.** Drive **F** and its controls were re-executed at
the round-1 temper. The back branch's throw was re-executed at the **round-2** temper by drive **B′**,
which reaches it with **no library data** — that measurement retires the fixture cost the plan
previously assigned to it (F11). Drive **B** as written below is the original authoring execution over
the chapter-list route and has still not been re-driven; it is no longer load-bearing, because B′
produces the same throw on the same branch. The throw counts below come from the harness's fake timer
**instrumented to record a throwing callback rather than swallow it** — `clock.advance` swallows one
otherwise, so an un-instrumented drive cannot see it at all (§12).

| # | Drive | Result |
|---|---|---|
| **F** (forward) | Home → Books → Options; back-swipe committed, leaving `fwdStack = [options]`. Right-edge forward swipe Books→Options released to commit. A bottom-nav tap inside the settle window runs `navTo`, whose `fwdStack.length = 0` (`js/app.js:141`) empties the stack. The 340 ms fallback fires. | `fwdStack.pop()` returns `undefined`, `navStack.push(undefined)`, `currentDesc()` is `undefined`, and **`TypeError: Cannot read properties of undefined (reading 'v')` is thrown at `js/app.js:1021:61`**, inside the `reportReveal(...)` argument list, called from `finalize` at `js/app.js:1078`. **1** recorded throw. |
| **B′** (back, no library data) | Books tab open, so `navStack = [home, books]`. Left-edge back-swipe Books→Home released to commit. Inside the settle window the shipped `closeSub` listener on `#dgBack` (bound unconditionally at boot, `js/app.js:3091`) runs; `books` is not a settings sub, so `closeSub` delegates to `goBack()` (`js/app.js:177` → `145`) and pops to `navStack = [home]`. The 340 ms fallback fires. | `navStack.pop()` runs unguarded, `navStack` becomes `[]`, `currentDesc()` is `undefined`, and **the same `TypeError` is thrown at the same line**: **1** recorded throw, message identical to drive F's. No chapter list, no library fixture, no drill-down. |
| **B** (back, chapter list) | Home → a chapter list opened from a home tile, so `navStack = [home, files]`. Left-edge back-swipe Files→Home released to commit. A tap on the chapter list's own drill back button inside the settle window runs `goBack()`, popping to `navStack = [home]`. The 340 ms fallback fires. | The same throw. **Authoring execution only** — not re-derived at either temper; superseded as the branch's witness by B′. |
| **F-control** | Drive F with no mid-settle tap. | **0** throws. |
| **F-control-late** | Drive F with the tap AFTER the settle window closes. | No throw. |
| **B′-control** | Drive B′ with no mid-settle tap. | **0** throws; lands `home`. |

The throw oracle is proven able to FAIL in both directions in the same run: the same instrumented
counter reads **1** on each interfering drive and **0** on each control, so a green control is not
the oracle being blind.

Branch **B is new to this plan**: the adversary's casebook
(`Claude/Loki/STRIKE-swipe-stage7-lease-exits-2026-08-06.md` §5) reports only the forward branch. The
back branch is reachable through more than one shipped control — the chapter-list drill back button
(drive B) and any `closeSub` control that falls through to `goBack` (drive B′) — and produces the
identical throw.

**Consequences at HEAD.** The reveal diagnostic is lost; the commit's screen reconcile
(`js/app.js:1032`) never runs, so the visible screen and the descriptor stack disagree; and on
branch F `navStack` retains an `undefined` entry. The row hold is still released: the `finally` at
`js/app.js:1079` covers it, which is why the adversary's own commission held.

**The arming consequence, MEASURED and CORRECTED (round-1 F3).** Re-driven at HEAD with the harness's
fake timer instrumented to record a throwing callback rather than swallow it:

```
drive F with the mid-settle tap → timer throws: 1  "Cannot read properties of undefined (reading 'v')"
  a fresh left-edge gesture attempted IMMEDIATELY after the settle  → ARMS      (true)
  a fresh left-edge gesture attempted after ONE further navigation  → does NOT arm (false)
drive F control (no tap) → 0 throws; arms in both positions
```

The `undefined` lands on **top** of `navStack` (`navStack.push(fwdStack.pop())`), so `begin()` reads
`from = undefined` — only stored, never dereferenced — and `dest = navStack[len - 2]`, which is still
a live descriptor. The gesture arms. It stops arming only once a further navigation pushes on top of
the `undefined` and moves it into the `len - 2` slot, where `js/app.js:447` reads it. **The consequence
is real; the drive that exhibits it needs one more step**, and any oracle that omits that step is green
at HEAD. §9's `NAVSTALE` states the oracle in its measured form for exactly this reason. (A prior
version of this section stated "silently fails to arm" without the further navigation; that statement
was wrong and is replaced, not softened.)

**Non-throwing corruption of the same class — driven, and now the coverage carrier.** Where the
settle-window navigation leaves the stacks the right shape and only changes which screen the top
descriptor names, no throw occurs and the commit still mutates the wrong entry. **Three** such drives
have been executed, control first, reading the landed screen from the classes `js/nav.js` `setView`
writes (`#home.parked`, every other view `.hidden`) — I and S at round 1, T at round 2:

| # | Drive | HEAD | With the §5 predicate |
|---|---|---|---|
| **I** (same-view replacement) | Books tab open, so `navStack = [home, books]`. Left-edge back-swipe Books→Home released to commit. **The Books tab — the one already open — is tapped inside the settle window**, so `navTo`'s same-view branch (`js/app.js:139`) REPLACES the top descriptor with a fresh object carrying the same `.v`. | Landed screen **home**: the commit popped the replacement, so the user tapped Books and was returned to Home. No throw. | Landed screen **browse**, settle line `nav=superseded`. |
| **I-control** | Drive I with no mid-settle tap. | Landed screen home (correct — the gesture's own destination). | Same, `nav=applied`. |
| **S** (settings ‹ Back) | Books → Options hub → a settings sub-screen, so `navStack = [home, books, options, sub]`. Left-edge back-swipe sub→Options released to commit. The sub-screen's own ‹ Back (`closeSub`, `js/app.js:170`) is tapped inside the settle window and pops the sub. | Landed screen **browse**: the commit popped `options` as well, so ‹ Back overshot the hub by one screen. No throw. | Landed screen **options**, settle line `nav=superseded`. |
| **S-control** | Drive S with no mid-settle tap. | Landed screen options. | Same, `nav=applied`. |
| **T** (identity-preserving PAIR) | Books → Options hub → the General sub, then a committed back-swipe General→Options, so `navStack = [home, books, options]` and `fwdStack = [general]`. Right-edge **forward** swipe Options→General released to commit. Inside the settle window **two** shipped navigations that CANCEL on `navStack`: the Playback hub row (`openSub`, `js/app.js:163` — pushes and clears `fwdStack`) and then that sub-screen's own ‹ Back (`closeSub`, `js/app.js:174` — pops it back and pushes it onto `fwdStack`). At finalize `currentDesc()` is the **same object** the gesture captured as `cur.from`, so the identity conjunct is satisfied; `fwdStack`'s top is now `playback`, not `general`. | Landed screen **playback** — neither the gesture's destination (`general`) nor the user's last explicit action (`options`). No throw. | Landed screen **options**, settle line `nav=superseded`. |
| **T-control** | Drive T with neither mid-settle tap. | Landed screen general (correct — the gesture's own destination). | Same, `nav=applied`. |

The throw is the loud instance of a quiet class, and drives I, S and T are the quiet class made
observable. §9's `NAVIDENT` is built on I and S; `NAVPAIR` is built on T, which is the only drive
that reaches the forward conjunct (§5).

---

## 2. Defining records reconciled (U1)

| Record | What it materially defines | Result |
|---|---|---|
| `Claude/Subsystems/swipe-reveal.md` **item 3** — "The nav stacks (`navStack`/`fwdStack`, owned by Nav) are authoritative for WHERE … After the stack mutates at commit, the stack wins" | Authority of the stacks over the gesture | **AGREE.** This plan does not move that authority; it makes the commit's write conditional on the stacks still describing the navigation the gesture planned. |
| `Claude/Subsystems/swipe-reveal.md` **item 12** — "Commit: mutate the stack, applyScreen the destination…" | Normal completion behaviour | **CONFLICT (with the fix, not within HEAD).** Item 12 states the mutation unconditionally. It is current truth today and becomes wrong on approval. Scrubbed in the same commit. |
| `Claude/Subsystems/swipe-reveal.md` **item 13** — "Recovery authority boundary. The nav-stack mutation. PRE-stack failure → restore source + starting scroll. POST-stack failure → render from the stack top + destination scroll" | Which recovery applies on either side of the mutation | **GAP.** Item 13 is a dichotomy over *failure*. The case this plan introduces is neither: the mutation is deliberately **not performed** because a newer navigation superseded the gesture's plan, and restoring the source would be actively wrong — the stack names a THIRD screen, not the source and not the gesture's destination. The gap is closed by naming a third outcome, **stack-superseded → render from the stack top, write no scroll**, and item 13 is extended to three cases on approval. |
| `Claude/EngineeringContract.md` **§4.6 Stale continuations** | What an asynchronous continuation must verify before acting | **AGREE, and it is the governing rule.** §4.6 requires a continuation to verify "the owner remains valid; the phase still permits the action" and names **navigation change** explicitly among the stale deliveries tests must drive. `finalize` already verifies session ownership (`cur !== session`, `js/app.js:1070`); it verifies nothing about the *stacks*. This defect is §4.6 applied to the one piece of state the check was never extended to. |
| `Claude/EngineeringContract.md` **§4.12 Identity discipline** — "Object identity is not semantic identity" | How the staleness check may be written | **AGREE, and it constrains the design.** `navTo` REPLACES the top descriptor with a new object for a same-view navigation (`js/app.js:139`), so a check on `desc.v` would miss it. The check is on **object identity** against `cur.from`, which is the reference the gesture captured at `js/app.js:441`. |
| `Claude/EngineeringContract.md` **§4.15 No dead fields** | Whether a new value may exist | **AGREE.** The one new observable value (the staleness outcome) gains a production consumer in the same slice — see §5, edit 3. |
| `Claude/Plans/PLAN-swipe-stage7.md` §5, §17 | The next slice over the same function | **AGREE — disjoint.** Stage 7's declared `js/app.js` ranges are `346-374`, `424-428`, `499-500`, `1022-1026`, `1071-1081`. This plan's are `702-707` and `1032-1041`. No overlap; see §10. |
| `Claude/Loki/STRIKE-swipe-stage7-lease-exits-2026-08-06.md` §5, §7 | The report this plan was commissioned from | **AGREE on branch F, INCOMPLETE on branch B.** §5 names only the forward producer. Both the throw site and the mechanism it reports were reproduced verbatim; the back-branch twin is added here. The casebook is a dated strike record and is not edited. |
| `tools/mutate.mjs` registration `swipe: abort mutates the nav stack like a commit (-> I11 abort test)` | A pinned defect over the exact lines being changed | **CONFLICT.** Its anchor is the two lines this plan rewrites; it rots. Re-anchoring is specified in §8. |
| `tools/mutate.mjs` registrations `M1NOWRITE…`, `S2-24 ABORTNORENDER…` (both anchored on `js/app.js:1038`) and `stage3: session id not stamped on the finalize line…` (anchored on the `sid=${cur.id}`) template close) | Anchor UNIQUENESS over the two lines edit 2 and edit 3 sit next to | **AGREE — and it is a constraint on how the edits may be written, not a conflict.** Each is refused by `resolveAnchor` if the new text duplicates `js/app.js:1038` or breaks the second template literal. MEASURED both ways in §8. §4 therefore prescribes the exact edit text rather than leaving the shape to the builder. |
| `js/app.js:350-356` — the `dropRowHold` declaration comment, "on a commit the stack mutation runs at the top of `runFinalize` … so the descriptor is already the settled destination by the time either caller reaches it" | What `Browse.endHold` is promised about its second argument | **CONFLICT (with the fix, not within HEAD).** On a stack-superseded settle the mutation deliberately does not run, so `currentDesc()` is a newer screen, not the settled destination. Current truth today; wrong on approval. Scrubbed in the same commit (§8). |
| `js/app.js:1022-1025` — the sibling comment at the `dropRowHold()` call site, "currentDesc() already reads the settled destination here" | The same promise, restated at the call site | **CONFLICT, same cause.** Named separately because a scrub that fixes only the declaration leaves the call site asserting the retired sentence. |
| `Claude/Plans/PLAN-swipe-stage7.md` `vitruvius-gate` `callee_ranges` = `js/browse.js:159-223` (`Browse.endHold`) | The callee stage 7 replaces with the lease interface | **GAP.** This slice changes an INPUT that callee receives on a path neither plan drives: after this lands, a superseded settle reaches `dropRowHold()` at `js/app.js:1026` with a real descriptor for a screen the gesture never targeted, where at HEAD the same path throws at `1021` and never reaches it. Disjoint text ranges cannot see this. Stage 7's ledger gains the landed-screen value as a crossing; that edit belongs to stage 7's own plan and is listed in §8's scrub set with its owner. |

---

## Applicability

| Pattern | Value | Reason |
|---|---|---|
| `boundary_relocation` | false | No code moves between modules or ownership boundaries; every executable edit is inside `runFinalize` in `js/app.js`, and the two remaining changes are comments. |
| `callee_replacement` | false | No call is replaced by an indirection; no callee's observable effects are redistributed. Two things could be mistaken for one and are not: §11 discusses routing the mutation through the nav intents and **defers it** (this is what makes the plan gate raise its heuristic warning — the heuristic firing on deferral prose, correctly and harmlessly); and a superseded settle changes the *argument value* `Browse.endHold` receives from `dropRowHold()` (§2). Changing what a callee is passed is not replacing the callee: `js/browse.js`'s body is untouched and no `callee_ranges` are declared. The consequence that IS owed — a source comment promising the old value, and stage 7's ledger — is §8's scrub items 3, 4 and 6. |
| `contract_shape` | false | No exported shape, no contract object, no return value changes. `applies` is a function-local binding. |
| `state_transfer` | false | No state changes owner or home. `navStack`/`fwdStack` stay exactly where and whose they are. |
| `async_change` | false | No scheduling, timing, cancellation or promise behaviour changes. The 340 ms fallback and the `transitionend` race are untouched. |
| `persistence_migration` | false | Nothing here is serialized, stored or versioned; the gesture is entirely in-memory (subsystem item 15). |
| `lifecycle_ownership` | **true** | The whole subject is *when a settling gesture still owns the right to mutate the nav stacks*, and when that ownership lapses. §6 is that section. |

---

## 4. Exact scope boundary (U2)

**What changes — three edits, all in `js/app.js`, all inside `runFinalize`, plus two comment scrubs.**

1. **The commit stack mutation becomes conditional** (`js/app.js:702`). The condition is stated in
   §5. The three mutation branches themselves are unchanged, character for character.
2. **The settle's screen reconcile gains its third case** (`js/app.js:1032`). A settle whose stack
   mutation was skipped reconciles the CURRENT screen with no render and **no scroll write** — it
   must not restore the pre-gesture scroll (that belongs to a screen the user has left) and must not
   let `resetScroll` default to true (`js/nav.js:125` writes `$(v).scrollTop = 0` for home, Options
   and every settings sub-screen, so the default would jump the newer screen to its top).
3. **The existing SWIPE log line gains one token** (`js/app.js:699`). It already carries `#seq`,
   direction, endpoints, target liveness and session id; it gains `nav=` carrying **one of three
   values** — `applied`, `superseded` or `abort`. This is the production consumer required by §4.15
   and it is what a device log needs to tell "the stack moved" from "the stack deliberately did not"
   — the standing discipline that a diagnosis is owed a device log first. **The third value is not
   decoration: `applies` is `commit && …`, so a two-value token reports `superseded` on every plain
   abort by construction** (§5, and F1 in §16).
4. **Two comments are scrubbed** — `js/app.js:350-356` and `js/app.js:1022-1025`, both of which
   assert that `currentDesc()` at `dropRowHold()` is always the settled destination. §8 carries the
   scrub; §2 carries why.

### 4.1 The prescribed source text

The edits are given as text, not as description. **Reason (U11): an external constraint requires it.**
Anchor uniqueness in `tools/mutate.mjs` is decided by the exact characters written here — a reconcile
statement that reproduces `js/app.js:1038` verbatim, or a token appended to the second template
literal, each enlarges the co-change set (§8 measures both). A shape left to the builder is a
co-change set that cannot be declared in advance, and §13 makes a mismatch a halt.

**Edit 1 + edit 3 — replacing `js/app.js:699-700` and `702`, inserting the predicate above the log
line** (the hoist is forced by §7 item 3; the `nav=` token goes in the FIRST template literal, which
no registration anchors on):

```js
        const seq = ++revealSeq;
        // The settle window runs up to 340ms and the rest of the UI is live inside it, so a
        // navigation can land between arm and finalize. The gesture BORROWS the nav stacks
        // (subsystem item 3); it may write them only while they still describe the navigation it
        // planned (Engineering Contract §4.6). Object identity, not `.v`: navTo REPLACES the top
        // descriptor for a same-view tap (app.js:139) and a `.v` compare would miss it (§4.12).
        // Evaluated ONCE, above the log line, so the reported outcome and the mutation cannot
        // disagree.
        const applies = commit && currentDesc() === cur.from
          && (cur.dir === 'back' ? navStack.length > 1
            : cur.newNav ? true
              : fwdStack[fwdStack.length - 1] === cur.dest);
        if (window.PBDebug) PBDebug.log('SWIPE', `#${seq} ${commit ? 'commit' : 'abort'} ${cur.dir} ${cur.from.v}→${cur.dest.v} nav=${!commit ? 'abort' : applies ? 'applied' : 'superseded'}`
          + ` tgt=${tg && tg.isConnected ? 'live' : 'detached'}:${tgDesc} sid=${cur.id}`);
        for (const m of cur.movers) { m.el.style.transition = ''; m.el.style.transform = ''; m.el.style.willChange = ''; }
        if (applies) {
```

**Why the token has THREE arms and not two, and why that is a planning decision (F1).** `applies` is
`commit && …`. On an abort it is false *by construction*, so a two-arm ternary emits
`nav=superseded` on every plain abort — MEASURED on the shipped build by driving an uninterfered
aborting left-edge swipe: `#1 abort back books→home nav=superseded tgt=live:div.book sid=1`. That
line asserts a supersession that did not happen, on roughly half of every device log's settle lines,
using a word §5 defines only for a commit. The token's job is to report **what the gesture did to the
nav stacks and why**, and that has three outcomes, not two: the gesture wrote them (`applied`); it
was entitled to write and a newer navigation invalidated the claim (`superseded`); it never claimed
the right, because the user did not complete the gesture (`abort`).

Three properties decided the shape, and the third is why the token is not simply suppressed on the
abort path:

- **One source of truth is preserved.** All three values come from the same two bindings the mutation
  and the reconcile read — `commit` and `applies` — so the reported outcome still cannot disagree
  with what the code did (§7 item 3).
- **`abort` is the word the line already uses** for that state, in the same statement's first
  interpolation. One vocabulary, not two.
- **The token's shape stays invariant: every settle line carries exactly one `nav=` value.** A
  suppressed token would make `nav=` absent on aborts, and absence is ambiguous between "this settle
  aborted" and "this build predates the token" — the failure the review predicts for a diagnostic
  that cannot be trusted uniformly. A three-valued token makes a `grep nav=` over a device log
  complete, and a missing token an unambiguous statement about the build.

**Edit 2 — replacing `js/app.js:1032`.** The superseded reconcile is written as a one-line
`else if`, at eight spaces of indentation, so its `applyScreen(dest, { render: false, resetScroll:
false });` is NOT preceded by the ten spaces that `M1NOWRITE` and `S2-24 ABORTNORENDER` anchor on:

```js
        // A stack-superseded settle mutated NEITHER stack, so `dest` is the screen a newer
        // navigation reached, not this gesture's destination. Reconcile it with no render and NO
        // scroll write: restoring cur.scroll0 would write a departed screen's offset, and letting
        // resetScroll default to true would jump the newer screen to its top (js/nav.js:125).
        if (applies) applyScreen(dest, dest.v === 'home' ? { render: false, resetScroll: false } : { render: false });
        else if (commit) applyScreen(dest, { render: false, resetScroll: false });   // stack-superseded
```

The `else {` abort block below it, and the two-statement `applyScreen`/`window.scrollTo` pair inside
it that `M1NAVWINS` anchors on, are untouched.

**A builder who must deviate** — because a lint rule or a later HEAD makes this text impossible —
re-runs §8's measurement against the text actually written and amends §8 before committing. The
declared figure and the transform it was measured from move together or not at all. A deviation that
re-creates the anchor collision this text forecloses is caught by `test/mutation-anchors.test.js`'s
non-uniqueness subtest, which is measured red on exactly that writing (§8) — the gate is named so
"closed by construction" is not read as "cannot happen".

**The corrected token preserves the property this section exists to protect — MEASURED, not
reasoned.** With the three-arm token applied and nothing else changed, `M1NOWRITE`'s anchor,
`S2-24 ABORTNORENDER`'s anchor, `M1NAVWINS`'s anchor and `stage3: session id not stamped on the
finalize line`'s anchor each still occur **exactly once** in `js/app.js` — the same counts as before
the change — and the whole 161-registration registry resolves with **0** refusals of either class.
No registration's `from` or `to` mentions the `nav=` token at all, so the token text is anchor-
neutral. The probe that produced those figures is proven able to fail: run against a source with one
anchor's text deliberately broken it reports **3** refusals, naming them (§16).

**What stays.**

- The three mutation expressions, the `commit`/abort split, the `cur !== session` ownership guard at
  `js/app.js:1070`, the `try/finally` leak guard at `1077-1081`, `dropRowHold`'s position at `1026`,
  the 340 ms fallback, and every `Browse` interaction. None of them is a cause and none is touched.
- `goBack` and `closeSub` keep their own guards. They are already correct.

**What is SPLIT across the seam.** Nothing. All three executable edits sit inside one function, and
the two comment scrubs land in the same commit as the code they describe.

**What is DEFERRED.** See §11. Each deferral names the consumer that does not exist yet.

**No new field.** `applies` is a function-local `const` with three consumers, all inside
`runFinalize`: the log line (edit 3), the mutation's condition (edit 1) and the reconcile's condition
(edit 2). Per §4.15 it is not a field and creates no dead surface.

---

## 5. The invariant, and the design that satisfies it (U11)

**Invariant (basis: current behaviour that must be preserved + Engineering Contract §4.6).**
*A committed gesture's stack mutation is applied only while the nav stacks still describe the
navigation that gesture planned. When they do not, the gesture mutates neither stack, and the settle
reconciles whatever the stacks now name.*

**Corollary, and it is the property the defect violates:** `navStack` is never empty and never
contains a non-descriptor, so `currentDesc()` is total and `js/app.js:1021` cannot throw.

**The predicate.** Implementation is prescribed here because implementation cannot begin without
choosing one and the choice is not free — §4.12 rules out the obvious `desc.v` comparison.

```
const applies = commit && currentDesc() === cur.from
  && (cur.dir === 'back' ? navStack.length > 1
    : cur.newNav ? true
      : fwdStack[fwdStack.length - 1] === cur.dest);
```

**Why the identity conjunct is the semantic guard, and exactly how far it reaches.** `cur.from` is
the descriptor object `currentDesc()` returned when the gesture armed (`js/app.js:441`). An
**executed** grep for every write to either stack across `js/*.js` returns six sites, all in
`js/app.js`: `navTo` (`139`, `140`, `141`), `goBack` (`147`), `openSub` (`163`), `closeSub` (`174`),
`runFinalize` itself (`703-705`), and the `enterApp` rebind (`1181`). Every one of them replaces or
removes `navStack`'s top, so the identity check detects **any single one of them**.

⚠️ **It does not follow that the identity check detects every settle-window interference, and the
round-2 temper measured that it does not (F9).** The enumeration is per *writer*; the window admits a
*sequence*. `openSub` followed by `closeSub` — two of the six — compose to leave `navStack`
byte-for-byte as it was, **top object identity included**, while `fwdStack`'s top is replaced. That
pair is two taps of shipped controls and it is drive **T** (§1). Against it the identity conjunct is
satisfied and the FORWARD conjunct is the only clause that refuses. The correct statement is
therefore: the identity conjunct detects every single-writer interference; the branch conjuncts are
what detect an identity-preserving *composition* of them.

**Where the identity conjunct is load-bearing, MEASURED (round-1 F4).** The round-1 review measured
that on §1's two sequences the identity conjunct decides nothing: the interfering navigation has
already falsified the branch conjunct (`navTo` sets `fwdStack.length = 0` on F; the pop takes
`navStack` to length 1 on B), so deleting the identity conjunct changes no observable there. That
measurement holds and is not disputed. It does **not** mean the conjunct is inert — it means §1's
sequences are the wrong witnesses. The witnesses are the *non-throwing* class, where the stacks keep
the right shape and only the top's meaning changes. Re-measured on drives I, S and T (§1), control
first, across seven builds of `js/app.js`. **Every cell below is a landed screen read from the view
classes `js/nav.js` writes, and each drive is paired with its own no-interference control, which
lands on the gesture's own destination in every build** (drive I control `home`, drive S control
`options`, drive T control `general`):

| `applies` predicate | drive I landed | drive I `nav=` | drive S landed | drive T landed | drive T `nav=` |
|---|---|---|---|---|---|
| HEAD (no guard) | home ← wrong | *(no token)* | browse ← wrong | **playback ← wrong** | *(no token)* |
| as specified | **browse** | superseded | **options** | **options** | superseded |
| identity conjunct deleted (`NAVSTALE-a`) | home ← wrong | applied | browse ← wrong | options | superseded |
| identity weakened to `.v` (`NAVIDENT-a`) | home ← wrong | applied | options | options | superseded |
| `navStack.length > 1` deleted (`NAVTOTAL-a`) | browse | superseded | options | options | superseded |
| **`fwdStack[…] === cur.dest` deleted (`NAVTOTAL-b`)** | browse | superseded | options | **playback ← wrong** | **applied** |
| both branch conjuncts deleted, identity kept | browse | superseded | options | **playback ← wrong** | **applied** |

Drives I, S and T are each red at HEAD, so `NAVIDENT` and `NAVPAIR` are both red-first. Drive I is
the only one that separates object identity from `.v` equality — which is precisely the distinction
§4.12 exists to force — so drive I is not droppable. Drive T is the only one that separates the
forward conjunct from everything else, so drive T is not droppable either.

**Why the branch conjuncts are kept, and what pins each of them.** The per-writer argument above is
an enumeration, and this campaign's enumerations have been wrong repeatedly — every miss found by
executing, never by a further reading. The branch conjuncts do not depend on it: they make the
`pop()` and the `fwdStack` read **total by construction**, so a stack mutator that preserved the
top's identity still cannot produce `undefined` or a wrong entry. A defence that holds by
construction closes the coordinate; a defence that holds because a list was complete does not.

**What is pinned by what, MEASURED at round 2 (F9), and stated with the drive set the claim ranges
over.** The two conjuncts are **not** interchangeable and the round-1 amendment's "both deleted is
indistinguishable" was true only of the drive set it ranged over:

- **`navStack.length > 1` — a SOURCE cell (`NAVTOTAL`).** Deleting it alone (`NAVTOTAL-a`) is
  indistinguishable from the specified predicate on every observable of **all five drives this plan
  constructs — F, I, S, T and B′**. No writer removes from the *bottom* of `navStack`, so no
  sequence can leave `cur.from` on top of a length-1 stack. The honesty label is exactly that
  sentence: indistinguishable across the drives this plan constructs, **never** a claim about all
  reachable drives.
- **`fwdStack[…] === cur.dest` — a BEHAVIOURAL cell (`NAVPAIR`).** Deleting it alone (`NAVTOTAL-b`)
  lands drive T on `playback` — neither the gesture's destination (`general`) nor the user's last
  explicit action (`options`) — with `nav=applied`, while its control stays green. It is therefore
  **not** source-only, and pinning it by a string match on the source would be the vacuity this
  project has shipped before. Round 1 ran that audit against the identity conjunct and it passed on
  the strength of `NAVIDENT`; round 2 ran it against this clause and it failed.

**The stale outcome, and the two others it must not be confused with.** When `commit` is true and
`applies` is false, the gesture is *stack-superseded*: the animation showed a transition the stacks
no longer sanction. The stacks win (subsystem item 3), so the settle reconciles to `currentDesc()`
and writes no scroll. It does not attempt to re-run the newer navigation and it does not undo it.

**`stack-superseded` is defined for `commit === true` only**, and the settle's reported outcome is
therefore three-valued, not two. This is the whole of the term's domain and nothing else may carry
the word:

| `commit` | `applies` | Outcome | `nav=` |
|---|---|---|---|
| true | true | the gesture wrote the stacks | `applied` |
| true | false | *stack-superseded* — the claim was invalidated inside the settle window | `superseded` |
| false | false, by construction | aborted — the gesture never claimed the right to write | `abort` |

The fourth row does not exist: `applies` cannot be true while `commit` is false, because `applies`
is `commit && …`. That is exactly why the token needs a third arm rather than a second condition —
the abort case is not a value of `applies`, it is the case in which `applies` carries no information
at all (§4.1, F1 in §16).

---

## 6. Lifecycle and ownership of the stack mutation

The mutation is a resource-like right with a lifetime, so it is stated in those terms.

- **Created / acquired.** The right to mutate the stacks is **acquired** when `begin()` constructs
  the session and captures `from`, `dest`, `dir` and `newNav` (`js/app.js:441-451`). Nothing is
  allocated; what is acquired is a *claim* that the stacks currently look a certain way.
- **Borrowed, not owned.** The gesture **borrows** the stacks; it never owns them. Ownership stays
  with Nav (subsystem item 3). A borrowed resource may only be written while the borrow is still
  valid — which is precisely the check this plan adds.
- **Mutated.** Exactly once, at `js/app.js:703-705`, and only on a commit whose claim still holds.
  An abort mutates nothing (unchanged). A superseded finalize mutates nothing (unchanged — the
  `cur !== session` guard at `1070` returns before this code).
- **Released.** The claim is **released** when `finalize` runs, whether or not the mutation applied.
  There is no separate release step and none is added; `endOwnership()` (`js/app.js:1079`) remains
  the session's single endpoint.
- **Disposed / destroyed.** Nothing is disposed by this change. No pane, no listener, no timer and
  no hold changes hands. The gesture's owned-pane disposal (`disposeOwnedPanes`) and the row hold are
  untouched.
- **Failure and error paths.** With the guard in place the mutation cannot **fail** with an `undefined`
  push or pop, so the one reachable producer of a throwing `runFinalize` is retired. The `try/finally`
  guard at `1077-1081` **stays**: it is structural cover for any throw in `applyScreen`, `Browse.render`
  or the reveal diagnostic, and this plan makes no claim that those cannot throw.
- **Invalidation is not an error.** A stack-superseded settle is a normal outcome, logged as such
  (edit 3), not a caught exception and not a recovery.
- **No ambient dependency is added (U9).** `currentDesc`, `navStack` and `fwdStack` are already
  lexically in scope at this site; `cur.from` and `cur.dest` are already read by the surrounding
  lines. The predicate introduces no global, no DOM read, no environment value and no cached value,
  so there is nothing to invalidate and no cache owner to name.

---

## 7. Ordering (U8)

Three orderings. All three are correctness requirements; item 3 was labelled INCIDENTAL until the
round-1 temper measured what its two admissible placements cost, and the label is corrected rather
than kept with a caveat.

1. **CORRECTNESS.** `applies` is evaluated **before** any stack write, and `const dest = currentDesc()`
   is read **after** the conditional block. Evaluating the predicate after a partial write, or
   hoisting the `dest` read above the block, reintroduces the defect in a new shape.
2. **CORRECTNESS.** The predicate reads `currentDesc()` **inside** `runFinalize`, not at `begin()`.
   The whole point is that the settle window sits between them.
3. **CORRECTNESS, and no longer a choice.** The predicate is evaluated **above** the SWIPE log line
   at `js/app.js:699`, and the `nav=` token goes inside that line's FIRST template literal. Edit 3
   requires the token to be computed from the same two bindings the mutation and the reconcile read,
   `commit` and `applies` — one source of truth (§4.16); the token reads no third expression of its
   own, which is what makes a reported outcome incapable of disagreeing with what the code did. Every
   interpolation on that statement is evaluated when the line runs, so there are
   no late-computed values to ride and the predicate must precede it. A previous version of this
   plan offered the builder a choice here; measurement removed it, because the alternative placement
   (appending to the second template literal, after `sid=${cur.id}`) rots a registration that anchors
   on that literal's close (§8). Computing the token twice from two expressions remains inadmissible.

Everything else in `runFinalize` keeps its existing order. In particular `dropRowHold()` stays before
`applyScreen` at `js/app.js:1022-1026` — that ordering is a shipped defect fix (the empty-books-page
class) and is out of scope here.

---

## 8. Blast radius, MEASURED (U10)

**The transform this section is measured from is the COMPLETE change set the commit mandates — §4.1's
prescribed text (all three edits) AND the two comment scrubs of §4 item 4.** That sentence has now
been corrected twice for the same reason. Round 1 struck it because the section measured edit 1 while
§4 declared three (§14 F1). **The post-review amendment strikes it again**, because the corrected
version still measured only the three *code* edits while §4 item 4 and this section's own scrub table
mandate two comment scrubs in the same commit — and the scrubs alone rot a registration. The declared
input and the declared change are now the same object at the granularity of the whole commit, not of
its executable subset, and any deviation from §4.1's text re-opens this measurement (§4.1, last
paragraph).

⭐ **The rule this cost is filed against.** A blast-radius probe that transforms a subset of the
mandated change measures a number that no correct build can reproduce, and §13's equality rule then
fires on correct work. Three rounds of plan review read this section and none caught it; executing
the complete change did, at build time. **The probe's input is the commit's whole declared change
set — code, comments, generated artefacts and registry — never the code-edit list.**

Every figure below was produced by executing that transform in memory against `js/app.js` and
comparing, **control first**, on a copy of the tree outside the repo. Nothing in this section is a
reading.

**Control.** With no transform applied, **0** of the 152 mutation registrations are refused. The
measurement can therefore report a difference rather than a constant. "Refused" counts BOTH failure
classes `resolveAnchor` distinguishes (`tools/mutate.mjs:1779-1798`): an anchor that no longer occurs,
and an anchor that occurs more than once without an explicit `occurrence`. The second is the class the
previous version of this section did not contemplate.

| # | Consequence | How it was measured | Result |
|---|---|---|---|
| 1 | **TWO** `tools/mutate.mjs` registrations rot: **`swipe: abort mutates the nav stack like a commit (-> I11 abort test)`** (rotted by the code edits) and **`EMPTYAFTERHOME-a`** (rotted by the two comment scrubs) | Imported `MUTATIONS` and tested every `from` (and `also.from`) against the transformed source, counting occurrences rather than testing membership | **Exactly two registrations are refused, both ANCHOR NOT FOUND.** The first anchors on `'        if (commit) {'` + the back line (`tools/mutate.mjs:30-37, 322-323`). The second anchors on `"…\n        dropRowHold();"` — and the comment line in front of `dropRowHold();` is not decoration but the **uniqueness disambiguator**, because `        dropRowHold();` occurs twice in `js/app.js` (the hard reset and the finalize). Scrubbing that comment kills the anchor. **Isolated by execution:** the three code edits with the comments left alone refuse **1**; the comment scrubs added refuse **2**. |
| 2 | The other 150 registrations are unaffected | Same measurement | 150 still resolve, each exactly once. |
| 3 | The four mirrored-region fingerprints in `tools/gen-swipe-model.mjs` | Ran the real generator on the transformed copy and diffed its whole output against the committed document — no re-implementation of `regionHash` is involved at this amendment | **`navTo`, `navRelation`, `gestureEnd`, `supersession` — all four UNCHANGED**, since the fingerprint block is not among the three differing lines (item 5). Every edit sits inside `settle()`, past every fingerprinted region's end mark. `VERIFIED` in `test/swipe-model.test.js` needs no edit. |
| 4 | `navStackAppendCensus()` — the append-site inventory | Same whole-document diff | **The census `text` is byte-identical** — only the three `js/app.js:NNN` pins differ (item 5) — so `VERIFIED_APPEND_SITES` in `test/swipe-model.test.js` needs no edit. |
| 5 | `docs/swipe-model.generated.txt` | Ran `tools/gen-swipe-model.mjs` on the transformed copy and diffed the regenerated document against the committed one | **Exactly three lines differ, all of them census pins:** `704→715`, `705→716`, `1181→1197`. **Regeneration required** (`node tools/gen-swipe-model.mjs`). Without it, `test/swipe-model.test.js`'s "the committed model is exactly what the generator produces" goes red. Regenerate; never hand-edit. |
| 6 | Line delta | Diffed line counts across the whole transform | **+16** lines in `js/app.js`: **+11** from edit 1 + edit 3 together, **+5** more from edit 2. (The previous `+4` was edit 1 alone, without its comment block.) |
| 7 | The build stamp | `js/app.js` is a shipping file and `test/shipping-change-bumps.test.js` gates it | **Bump required** — `node tools/stamp-build.mjs`, in lockstep with `sw.js` and `js/debug.js`, per the standing PWA deploy rule. |
| 8 | `android/build/assets/www/js/app.js` holds a stale copy of these lines | `git check-ignore` | **Ignored (`android/.gitignore:1`), untracked — not a co-change.** |
| 9 | Any other file carrying the changed source text | Repo-wide grep for `if (commit) {`, `navStack`, `fwdStack`, `newNav` outside `js/` | The only source-literal consumer is `tools/mutate.mjs` (item 1). Every other hit is a record or the generated document (item 5). |
| 10 | The suite itself | Applied §4.1's transform, the item-1 re-anchoring, `node tools/gen-swipe-model.mjs` and `node tools/stamp-build.mjs` to a copy, then ran `node --test "test/*.test.js"`, count read from the runner. Copy baseline measured first | **Baseline (untransformed copy): 916 / 913 pass / 2 fail / 1 skip** — the two failures are the git-only gates (`every hook script is EXECUTABLE in git's index`, `THE REAL ARTIFACT: this repo's own history passes the gate`), which cannot pass in a tree with no `.git`. **After the full change: 916 / 913 pass / 2 fail / 1 skip — the same two.** No behavioural cell reddens, `test/mutation-anchors.test.js` is green on all three of its subtests, and `test/swipe-model.test.js` is green. |

**Why §4.1 prescribes the text, MEASURED.** Two natural writings of the same two edits each enlarge
the set, and neither is visible from a description of the edit:

| Transform (registry = the pristine 152) | Registrations refused | Which |
|---|---|---|
| control — no transform | **0** | — (the probe reports a difference, not a constant) |
| §4.1's three code edits only, comments untouched | **1** | the rotted `swipe: abort mutates the nav stack like a commit` |
| **the COMPLETE mandated set — the three code edits AND the two comment scrubs** | **2** | the above **+ `EMPTYAFTERHOME-a`**, rotted by the scrubs alone. This is the declared figure. |
| the complete mandated set **with the corrected three-arm token** | **2** | the same two — the corrected token adds nothing |
| edit 2 written as a nested block, reproducing `js/app.js:1038` verbatim | **3** | the code-edit rot, plus `M1NOWRITE…` and `S2-24 ABORTNORENDER…`, each **NON-UNIQUE** (`from` occurs 2 times) |
| edit 3 written by appending the token after `sid=${cur.id}` | **2** | the code-edit rot, plus `stage3: session id not stamped on the finalize line…`, rotted — its anchor includes the template literal's closing backtick and paren |

The last two rows are measured against the code edits alone, which is why their totals do not carry
the scrub's `EMPTYAFTERHOME-a`; each is a statement about the *writing* of one edit, not a declared
co-change figure. The declared figure is the third row.

The repair for a non-unique anchor is a different repair from the one below (a longer `from`, or an
explicit `occurrence: N`, `tools/mutate.mjs:1792-1799`). This plan does not specify either, because
it does not create the collision: **the collision is closed by construction in §4.1's text.** That is
the structural form of the defence and it is why the co-change set carries no non-unique anchor at
all.

**And the construction is backed by a gate, named here so neither reading of "by construction" goes
wrong (F12).** The prescription is prose, and §4.1's escape hatch for a builder who must deviate is a
discipline. The structure that catches a deviation is **`test/mutation-anchors.test.js`**, whose
subtest *"no registered mutation anchor is non-unique without an explicit disambiguation"* hard-fails
on exactly this collision. **MEASURED, control first:** on the pristine tree and on the built tree
that subtest is green (6 tests / 6 pass / 0 fail in both); on a tree where edit 2 is written as a
nested block reproducing `js/app.js:1038` verbatim it is **red** — `not ok 3`, with `M1NOWRITE` and
`S2-24 ABORTNORENDER` each reported as a NON-UNIQUE ANCHOR occurring 2 times. So "closed by
construction" means *the prescribed text does not create it*, and a deviation that does create it is
caught by a gate rather than by anyone remembering to look. A reader who takes "by construction" to
mean the failure is impossible would not look for the gate; a reader who knows the gate exists does
not have to treat a deviation as unbounded risk.

**The re-anchoring, specified.** The rotted registration's meaning is "an abort mutates the nav stack
like a commit". Preserve it exactly by moving its anchor to the new predicate's first line:
`const applies = commit && currentDesc() === cur.from` → `const applies = currentDesc() === cur.from`.
MEASURED: with this and nothing else, the anchors gate is green (item 10). ⚠️ **Do not** re-anchor it
to `const applies = true`: that deletes the staleness guard as well, so the mutant would then be
killed by `NAVSTALE` instead of by the I11 abort cell, and a registration whose killing cell has
silently moved is a coverage claim about a defect nobody is testing for.

**The SECOND re-anchoring, recorded as shipped.** `EMPTYAFTERHOME-a`'s anchor was re-pointed onto the
scrubbed comment's replacement text at the same call site (`js/app.js`'s finalize `dropRowHold()`, not
the hard reset), with its `to` unchanged, so the mutation's meaning — remove the early
`dropRowHold()` — is untouched. MEASURED after the re-anchoring: the mutant still kills exactly its
two designated `EMPTYAFTERHOME` cells, in order, and nothing else. The registry therefore carries
**two** re-anchorings for this slice, not one.

### 8.1 The post-review amendment's own blast radius, MEASURED

The corrected token (§4.1) is a **single in-place edit to one line of `js/app.js`** and nothing else.
Measured against the built tree at `e80fcbe`, control first, on copies outside the repo:

| # | Consequence | How it was measured | Result |
|---|---|---|---|
| 1 | Mutation registrations refused | The 161-registration built registry resolved against the amended source, both refusal classes counted | **0** — unchanged from the control's 0. No anchor mentions the token, and `M1NOWRITE`, `S2-24 ABORTNORENDER`, `M1NAVWINS` and `stage3: session id not stamped…` each still occur exactly once. The probe is proven able to fail: on a source with one anchor deliberately broken it reports **3**, naming them |
| 2 | `docs/swipe-model.generated.txt` | Ran the real generator on an untransformed copy and on the amended copy and diffed both against the committed document | **Both byte-identical to the committed document — NO regeneration required.** The oracle is proven able to fail: the same generator run on a copy with one line inserted above `const dest = currentDesc()` moves a census pin (`1197`→`1198`) |
| 3 | Line delta | Line counts across the transform | **0** — 3112 lines before and after. The three census pins keep their built values `715`, `716`, `1197` |
| 4 | `tools/mutate.mjs` | One registration is ADDED, `NAVTOKEN-a` (§9) | Registry **161 → 162**. Its anchor resolves **uniquely** on the amended source, and the 162-registration registry refuses **0**. ⭐ Applying it to the amended source reproduces the shipped `js/app.js` at `e80fcbe` **byte-for-byte**, so the mutant *is* the defect F1 reported, not an approximation of it — and since the suite is green at `e80fcbe`, that same identity proves the mutant currently **survives**, which is what §9's new clause exists to fix |
| 5 | The build stamp | `js/app.js` is a shipping file gated by `test/shipping-change-bumps.test.js`, which judges a staged change list at commit time and therefore cannot be exercised by a suite run in a copy | **Bump required** — `node tools/stamp-build.mjs`, in lockstep with `sw.js`, `js/debug.js` and `index.html` |
| 6 | Lint and typecheck | `eslint js sw.js` and `tsc -p jsconfig.json` on both copies | Control **clean**, amended **clean**. The nested ternary raises nothing |
| 7 | The suite | Whole suite on both copies, count read from the runner, control first | Control copy **935 / 932 pass / 2 fail / 1 skip**; amended copy **935 / 932 pass / 2 fail / 1 skip** — the same two git-only gates. **No cell reddens, which is itself the finding: nothing in the suite asserts the abort token**, which is why F1 shipped (§16, O3) |

**Equality rule for the amendment build.** The declared refused set is **0** against the built tree
with the built registry, and **0** again once `NAVTOKEN-a` is registered. A measured set larger or
smaller is a stop, per §13.

**Records scrubbed on approval (§6.6, exhaustive on the first pass).** Seven, each with its owner.

| # | Record | What changes | Owner |
|---|---|---|---|
| 1 | `Claude/Subsystems/swipe-reveal.md` item 12 | The commit's stack mutation is conditional | the builder, same commit |
| 2 | `Claude/Subsystems/swipe-reveal.md` item 13 | A third recovery outcome: stack-superseded → render from the stack top, write no scroll | the builder, same commit |
| 3 | `js/app.js:350-356`, the `dropRowHold` declaration comment | The sentence "the descriptor is already the settled destination by the time either caller reaches it" is corrected: on a stack-superseded settle it is the screen a newer navigation reached | the builder, same commit |
| 4 | `js/app.js:1022-1025`, the sibling comment at the `dropRowHold()` call site | The same sentence, restated there | the builder, same commit |
| 5 | `Claude/Plans/PLAN-swipe-stage7.md` §14/§17 | The throwing finalize is described as a producer that exists in shipped code; after this lands it is retired and the sentence is historical. The sentence is corrected; the `finally` guard it justifies is not weakened (§6) | the planner, on approval of this slice |
| 6 | `Claude/Plans/PLAN-swipe-stage7.md` — its `vitruvius-gate` `source_ranges`, and its ledger | Two of its five ranges move (§10), and its ledger gains the landed-screen value `Browse.endHold` now receives on the superseded path (§2) | the planner, on approval of this slice |
| 7 | `Claude/Zelda/Board.md`, `Claude/Decisions/DecisionLog.md` | Per the tracking seat's normal duty | the assistant |

**State of this table at the post-review amendment.** Items **3 and 4 are done** in `8acbdff` and were
verified by the code review. Items **1 and 2 are NOT done** — `Claude/Subsystems/swipe-reveal.md`
items 12 and 13 were untouched by that commit — and remain owed to the builder; they are the review's
F2 and are not this amendment's to make. Items 5, 6 and 7 are owed outside the build commit and remain
open. **Four items are owned by the builder in-commit (1, 2, 3, 4) and three outside it (5, 6, 7)** —
the count §13 step 8 previously stated wrongly.

---

## 9. Coverage Model

Ten dimensions from the auditor's catalog, each applicable with what the suite must prove, or not
applicable with the reason. **Absence is a decision.**

⛔ **jsdom has no layout or paint.** No cell below asserts geometry or a measured rect. The scroll
clauses assert *whether a write was issued* (`window.scrollTo` is recorded by the harness; `scrollTop`
is a plain jsdom property), never a resulting position.

| # | Dimension | Applicable? | What the suite must prove |
|---|---|---|---|
| 1 | **Lifetime and reuse** | **Yes — the stage's core.** | The gesture's claim on the stacks is valid only from arm to finalize, and only while the stacks still match it. Applied exactly once on an uninterfered commit; not at all on an abort; not at all on a stack-superseded commit — including when the supersession is a *pair* of navigations that cancel on `navStack`. `NAVSTALE` + `NAVIDENT` + `NAVPAIR` + `NAVAPPLIES`. |
| 2 | **Trust boundaries and hostile inputs** | **No.** | The predicate reads only in-process state the app itself wrote. There is no external, serialized or attacker-influenced input anywhere on this path. |
| 3 | **Concurrency** | **Yes.** | The interleaving is a user input landing inside the 340 ms settle window — the only concurrency this subsystem has. Every drive in §1 — F, B′, I, S and T — is exactly that interleaving, and T is the one that is a *pair* of inputs rather than a single one. `NAVSTALE` + `NAVIDENT` + `NAVPAIR`. Gesture-vs-gesture supersession is already covered by the existing stage-6c cells, which must stay green. |
| 4 | **Shape and platform matrices** | **Yes, as THREE matrices.** | (a) The commit-branch matrix: `back`, `fwd` (the `fwdStack` replay) and `newNav` (NP → chapter list). `NAVAPPLIES` drives all three; `NAVSTALE` drives `back` and `fwd`, the two that read a stack. `newNav` pushes a captured object and reads nothing, which is why it has no stale drive and why that is a decision, not a hole. (b) The **interference matrix**, added at the round-1 temper and **re-counted at round 2 (F9), where it was measured to be missing a cell**. A settle-window interference is one of three kinds: it EMPTIES the stack the gesture reads (`NAVSTALE`); it leaves that stack the right shape and changes what its top MEANS (`NAVIDENT`), which splits again into a same-view replacement (identity vs `.v` disagree — drive I) and a cross-view pop (they agree — drive S); or it leaves the descriptor stack's top **object identity intact** and moves the OTHER stack (`NAVPAIR`, drive T). The third kind needs a *pair* of navigations, which is why a per-writer enumeration could not see it (§5). **Five cells, all driven** — the previous "all four cells of (b) are driven" was a count over the two-kind matrix and is superseded. (c) The **token-value matrix**, added at the post-review amendment. The `nav=` token has exactly three values and **every one is asserted somewhere**: `applied` by `NAVAPPLIES` and by every drive's control, `superseded` by `NAVSTALE`, `NAVIDENT` and `NAVPAIR`, and `abort` by `NAVAPPLIES`'s abort half. The third value had no cell in the shipped build, and that unasserted cell is precisely how a token that lied on every abort passed a code review's predecessors — an unasserted value of an observable is a hole whether or not it is a new one. |
| 5 | **Failure and rejection paths** | **Yes.** | `runFinalize` must not throw on §1's two THROW drives (F and B′), and the existing "a throw in finalize restores `finishing`" cell must stay green — the `finally` guard is retained, not replaced. `NAVSTALE`. Drives I, S and T add no failure path: none of them throws at HEAD either — T's HEAD damage is a wrong landing, not an exception. |
| 6 | **Numerical edges and determinism** | **Yes, narrowly.** | The one numeric edge is the stack length at which the pop becomes unsound: `navStack.length > 1`. `NAVTOTAL` pins **that conjunct** over source, and the claim is stated with the drive set it ranges over: deleting it is indistinguishable from the specified predicate across drives F, I, S, T and B′ — MEASURED, not assumed, and **not** a claim that no reachable drive isolates it (§5, F9). The forward conjunct is not a numeric edge and is not pinned here: it has a behavioural killer, `NAVPAIR`. |
| 7 | **Contract claims** | **Yes, three.** | (a) *`currentDesc()` is total* — `navStack` is never empty and never holds a non-descriptor. `NAVSTALE` asserts the observable form: after either §1 drive **and one further navigation**, a subsequent left-edge back gesture still ARMS (at HEAD it does not; measured — see §1). (b) *A superseded gesture never re-decides where the user is* — the screen the stacks name after the settle is the one the newer navigation reached. `NAVIDENT` asserts it as the landed screen for a single interfering navigation and `NAVPAIR` for a composed pair; the claim is the same one, asserted on two interference shapes. (c) *The settle line's `nav=` token names the outcome that actually occurred* — `superseded` appears on a settle line if and only if a commit's claim was invalidated inside the window, never on an abort, where the gesture never held a claim (§5's three-row table is the whole domain). `NAVAPPLIES` asserts the `abort` and `applied` values; `NAVSTALE`, `NAVIDENT` and `NAVPAIR` assert `superseded`. |
| 8 | **Composition** | **Yes.** | The guard crossed against the settle window's other occupants: a browse→browse pair, an overlay source, a settings sub-screen's own back control (`closeSub`, drive S), a same-view tab re-tap (`navTo`'s replacement branch, drive I), **two navigations composed inside one window** (`openSub` then `closeSub`, drive T), and a commit whose reconcile lands on a scroll-resetting screen (home / Options / a settings sub). `NAVIDENT` carries the two single-navigation cases, `NAVPAIR` the composed one, `NAVRECONCILE` the last. The composed case is the reason this dimension is not satisfied by driving each writer once. |
| 9 | **Persistence round-trip and version evolution** | **No.** | Nothing on this path is serialized, stored or versioned (subsystem item 15). No IndexedDB, no service worker, no `build.json` semantics — the build *number* bumps, which is a stamp, not a format. |
| 10 | **Functional achievement (the feature oracle)** | **Yes.** | End to end on the real app: after a settle-window navigation, the screen the user is looking at is the one their last explicit action reached, and back navigation from there still works. `NAVIDENT`'s landed-screen clause is the user-facing half for a single interfering navigation and `NAVPAIR`'s is the half for a pair of them, `NAVSTALE`'s arming clause the reachability half, `NAVRECONCILE` the scroll half. No new production surface is added to carry it. **The device log is the second user-facing consumer and it has its own oracle half:** a diagnostician reading a settle line must be able to trust the outcome it names, so `NAVAPPLIES` asserts that an uninterfered abort's line reports `abort` and not a supersession. A diagnostic that is wrong on half the lines is worse than one that is absent, because absence is visible. |

**New mechanism check (the amendment discipline).** One mechanism enters this plan — the staleness
predicate — and it was crossed against all ten dimensions above rather than only dimension 1. Its
one new observable value, the `nav=applied|superseded|abort` token, was crossed separately: lifetime —
it is emitted once per settle on the existing line; trust — it takes no external input; concurrency —
it is computed from the same bindings as the mutation, so it cannot disagree with it; failure — it
rides the already `window.PBDebug`-guarded line, so its absence is not a throw; contract — it is a
string on a diagnostic line and changes no shape; numerics and persistence — not applicable;
composition and oracle — it changes no outcome and is read by `NAVSTALE`, `NAVIDENT`, `NAVPAIR` and
`NAVAPPLIES` as a production channel.

⚠️ **This cross was run and was still incomplete, and the way it failed is the lesson.** Every
dimension above was walked against the token, and each answer was true *of the values the cross had
in mind*. What no dimension asked was **what the token emits on the paths the predicate does not
govern** — and `applies` governs the commit path only. The cross treated a two-valued observable as
total when its value domain is decided by *two* bindings, `commit` and `applies`, not one. The
generalisation, filed as a planning rule: **an observable's cross is over its VALUE DOMAIN, not over
the mechanism that prompted it** — enumerate every value the expression can emit, on every path that
reaches the emit site, and name the cell that asserts each. Dimension 4(c) is that enumeration made
a standing matrix so the next amendment cannot skip it.

**Re-cross at the amendment (the same discipline, applied again).** The round-1 temper adds no
mechanism to this plan — the predicate, the token and the reconcile case are unchanged. What it adds
is a cell, `NAVIDENT`, and a split of dimension 4 into two matrices. Every dimension was re-walked
against the predicate anyway rather than only the two that prompted the change: 2, 6 and 9 are
unchanged and their reasons still hold verbatim; 1, 3, 4, 7, 8 and 10 are updated above; 5 is
unchanged, because `NAVIDENT`'s drives produce no throw at HEAD and therefore add no failure path.

**Re-cross at round 2.** The round-2 temper likewise adds **no mechanism** — the predicate, the
token, the reconcile case and the three prescribed edits are character-identical to round 1. What it
adds is one cell, `NAVPAIR`, one interference kind, and two drives (T and B′). All ten dimensions
were re-walked against the predicate rather than only the ones that prompted the change: **1** gains
`NAVPAIR` to its cell list, since the claim it makes is about the same arm-to-finalize lifetime;
**2** unchanged — a composed pair is still only in-process state the app itself wrote; **3, 4, 6, 8
and 10** are updated above; **5** unchanged, because drive T produces no throw at HEAD (its damage
is a wrong landing) and drive B′ is the branch-B failure path the dimension already names; **7**
unchanged — `NAVPAIR` asserts contract claim (b), *a superseded gesture never re-decides where the
user is*, on a third interference shape rather than adding a claim; **9** unchanged, nothing on this
path is serialized. No new observable value enters, so the `nav=` token's own cross is unchanged.

**Re-cross at the post-review amendment.** This amendment adds **no mechanism** — the predicate, the
reconcile case and edits 1 and 2 are character-identical to round 3. What it adds is a **third value
of an existing observable**, which the discipline treats exactly as it treats a mechanism: all ten
dimensions were re-walked. **1** — unchanged in substance; the token still reports one outcome per
settle, and the abort outcome is the one where the gesture holds no claim, which is a lifetime
statement `NAVAPPLIES` already owns. **2** — unchanged; `commit` is in-process state the app wrote.
**3** — unchanged, and worth stating why: `commit` is fixed when the gesture is released, *before*
the settle window opens, so no interleaving can change which arm the token takes; the abort arm is
therefore not a concurrency surface. **4** — gains matrix (c), the token-value matrix, above. **5** —
unchanged; the token rides the existing `window.PBDebug` guard and the third arm adds no throw site.
**6** — unchanged; no numeric edge. **7** — gains claim (c). **8** — the token composes with the same
statement's own `${commit ? 'commit' : 'abort'}` interpolation, and the two are read from the SAME
binding, so a line cannot say `commit … nav=abort`; that is closed by construction, not by a cell.
**9** — unchanged; nothing here is serialized. **10** — gains the device-log oracle half. One cell
gains clauses (`NAVAPPLIES`); one registration is added (`NAVTOKEN-a`); no cell is created and none
is retired.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
NAVSTALE | a committed gesture whose stack precondition is invalidated inside the settle window mutates NEITHER stack and does not throw, on BOTH stack reading branches; concretely a forward commit whose forward stack is emptied by a navigation tap in the window and a back commit whose descriptor stack is reduced to its root by a shipped back control in the window each leave the stacks exactly as the interfering navigation left them, and the settle line reports the superseded outcome so the device log names it; the arming oracle is stated in its MEASURED form, namely that after the corrupt settle AND one further navigation a fresh left edge back gesture still ARMS, which at head it does not, and it is NOT stated for the gesture attempted immediately after the settle because that one arms at head too and would be green before the fix | integration boot the app harness and drive the FORWARD sequence F and the BACK sequence B prime from section 1 verbatim against the real app source, B prime being the route that needs NO library data because the back control it fires is the shipped close sub listener that falls through to go back, asserting no throw escapes the settle timer with the harness fake timer instrumented to RECORD a throwing callback rather than swallow it, then performing ONE further navigation and asserting that a subsequent left edge touch produces a live gesture session, and asserting the settle log line carries the superseded token; each drive is paired with its own control that omits the mid settle tap and must show the applied token, a normal landing, and a recorded throw count of ZERO against the interfering drive count of ONE | THREE named registrations. NAVSTALE-a the identity conjunct is deleted so applies keeps only the commit flag and the branch conjuncts; MEASURED that this does NOT redden on either section 1 sequence because the branch conjunct is already false there, so its expected killing cell is NAVIDENT and not this one. NAVSTALE-b the guard is applied to the forward branch only so the back sequence throws while the forward one passes. NAVSTALE-c the superseded settle still performs the mutation but swallows the throw with a try block so the stacks corrupt silently and the arming clause is the only witness. expected killing cell for -b and -c is NAVSTALE | integration app harness driving the real js app source through the real touch listeners
NAVIDENT | the object identity conjunct is load bearing and is defended, on BOTH stack reading branches, by the class of interference that leaves the stacks the RIGHT SHAPE and only changes WHICH screen the top descriptor names; concretely a back commit whose top descriptor is REPLACED by a same view tab tap inside the settle window must leave the user on the screen they tapped rather than silently returning them to the screen the gesture was heading for, and a back commit out of a settings sub screen whose own back control is tapped inside the window must land on the hub that control opened rather than one screen further back; the same view case is the one where object identity and value equality disagree, so it is the case that rules out the value comparison the identity discipline exists to forbid | integration two drives on the app harness. drive I open the books tab then release a left edge back gesture toward home and tap the SAME books tab inside the settle window, asserting the landed screen is the browse view and the settle line reports superseded; at head the landed screen is home and that is the red first demonstration. drive S open books then the options hub then a settings sub screen, release a left edge back gesture toward the hub and tap the sub screen back control inside the window, asserting the landed screen is the options hub; at head it is the browse view. each drive is paired with its own control that omits the mid settle tap and must land normally with the applied token | TWO named registrations. NAVSTALE-a the identity conjunct deleted, MEASURED to redden both drives. NAVIDENT-a the identity comparison weakened to a value comparison on the descriptor view field, MEASURED to redden drive I and NOT drive S, which is why drive I is the one that may not be dropped. expected killing cell for both is NAVIDENT | integration app harness driving the real js app source through the real touch listeners and reading the landed screen from the view classes nav writes
NAVAPPLIES | an UNINTERFERED committed gesture still mutates the stacks exactly as it does today on all three branches namely the back branch which moves the top of the descriptor stack onto the forward stack, the forward replay branch which moves the top of the forward stack back onto the descriptor stack, and the fresh forward navigation branch which pushes the captured destination and clears the forward stack; and an ABORTED gesture still mutates neither stack; AND the settle line the gesture emits names the outcome that actually occurred, meaning an uninterfered commit reports the applied token and an uninterfered ABORT reports the abort token and NEVER the superseded token, because an aborted gesture never held a claim on the stacks for a newer navigation to invalidate and the superseded word is defined for a commit alone | integration drive one clean commit per branch on the app harness and assert the landed screen and the subsequent back and forward reachability that each stack state implies, then drive an abort and assert both stacks are unchanged by reaching the same screens afterwards; the abort half is the existing I11 fixture and must keep passing unchanged; SEPARATELY drive one uninterfered aborting left edge swipe with no mid settle tap and read the settle line the debug channel recorded, asserting the token reads abort, and read the settle line of an uninterfered committing swipe in the same run asserting it reads applied, so the assertion cannot pass by matching everything | THREE named registrations. NAVAPPLIES-a is the RE ANCHORED existing registration swipe abort mutates the nav stack like a commit whose anchor moves onto the new predicate first line and whose replacement drops only the commit conjunct so an abort mutates the stack, expected killing cell the existing I11 abort cell not this one. NAVAPPLIES-b the applied path is made unconditional in the other direction by deleting the whole conditional block so a clean commit mutates nothing, expected killing cell is NAVAPPLIES. NAVTOKEN-a the abort arm is deleted from the settle line token so the two arm ternary returns and every plain abort again reports a supersession that did not happen, expected killing cell is NAVAPPLIES via the abort token clause and MEASURED to be the shipped defect exactly because applying it to the amended source reproduces the reviewed build byte for byte | integration app harness over the real gesture plus the retained I11 abort cell, reading the settle line from the recorded debug channel
NAVRECONCILE | a stack superseded settle reconciles the screen the stacks now name and writes NO scroll, meaning it neither restores the pre gesture document scroll which belongs to a screen the user has left nor allows the screen reset to default on and jump the newer screen back to its top, while an ordinary commit and an ordinary abort keep their existing scroll behaviour byte for byte | integration drive the forward sequence from section 1 with the mid settle tap landing on a scroll resetting screen namely home or the options hub or a settings sub screen whose panel scroll offset is set to a non zero value before the tap, then assert after the settle that the harness recorded no document scroll write attributable to the settle and that the panel scroll offset is unchanged; the two control drives assert the existing scroll writes are still issued on a plain commit and a plain abort | TWO named registrations, both anchored on the superseded reconcile statement section 4.1 prescribes. NAVRECONCILE-a drops the explicit no reset option from that statement so the screen reset defaults on and the newer screen jumps to its top. NAVRECONCILE-b appends the abort path scroll restore to that statement so the pre gesture document scroll is written over the newer screen. expected killing cell for BOTH is NAVRECONCILE | integration app harness asserting recorded calls and plain element properties never a measured rect
NAVTOTAL | the DESCRIPTOR STACK LENGTH conjunct is PRESENT in source so the descriptor stack pop cannot produce an absent value even if a future stack writer preserved the identity of the descriptor stack top; this conjunct alone carries a source cell, and the honesty label is that its mutant is indistinguishable from the specified predicate ACROSS THE FIVE DRIVES THIS PLAN CONSTRUCTS, namely F and I and S and T and B prime, never that no reachable drive isolates it | source assert over js app that the predicate expression contains the descriptor stack length comparison in the one adapter expression, and re pin the assertion so it stops matching when it is removed; this is a SOURCE cell for this one conjunct and the plan says so, with the drive set the claim ranges over stated in the same sentence; the forward stack conjunct is NOT covered here because it has a behavioural killer, which is NAVPAIR | ONE named registration. NAVTOTAL-a the descriptor stack length comparison is deleted from the predicate. expected killing cell is NAVTOTAL and no behavioural cell, which is MEASURED and not assumed by running that build against all five drives and finding every landed screen and every settle token identical to the specified predicate | source scan over the one predicate expression in js app
NAVPAIR | the FORWARD STACK conjunct is load bearing against an interference that the identity conjunct cannot see, namely a PAIR of settle window navigations that CANCEL on the descriptor stack while replacing the forward stack top, so the top descriptor object identity is intact and only the forward stack has moved; concretely a committed forward replay whose destination sits on the forward stack, interrupted inside the window by a hub row drill in followed by that sub screens own back control, must land the user on the hub they are actually standing on rather than on the third screen the pair left on the forward stack | integration drive T on the app harness. reach the options hub with a settings sub on the forward stack by opening the sub and committing a back swipe out of it, release a right edge forward swipe toward that sub, then inside the settle window drill into a DIFFERENT hub row and immediately fire its own back control, asserting the landed screen is the options hub and the settle line reports superseded; at head the landed screen is the second sub screen and that is the RED FIRST demonstration; paired with its own control that omits the two taps and must land on the gesture destination with the applied token | ONE named registration. NAVTOTAL-b the forward stack top identity comparison is deleted from the predicate, MEASURED to redden drive T and to redden NO other drive this plan constructs, so drive T is not droppable and is the only witness this registration has. expected killing cell is NAVPAIR | integration app harness driving the real js app source through the real touch listeners and the real navigation intents, reading the landed screen from the view classes nav writes
```

---

## 10. Why this is a standalone slice and not a stage-7 amendment

**Decision: a standalone slice, landing BEFORE stage 7 is built.** The reasons, in order of weight.

1. **It is a different promise.** Stage 7's commissioned promise is the row-hold lease. This is
   nav-stack integrity. The adversary filed it under "Lesser planes … different promise" and left it
   un-prosecuted for exactly that reason. Stage 7's §5 scope, §7 ledger, §8 effect table and §13
   Coverage Model are all about the lease; none of them has a cell this defect belongs in.
2. **Folding it in re-opens a plan that owes nothing.** A mechanism entering a plan obliges a
   re-cross of that plan's Coverage Model against the whole ten-dimension catalog — my own amendment
   discipline, and the reason stage 7's §13 carries its "new mechanism check". Stage 7 was tempered
   twice and its round 3 was waived **on the condition that the amendment stay confined to F1, F3a
   and F3b**. Adding an unrelated mechanism breaks that condition and buys a third review round.
   Churn on this campaign has cost up to ten hours per pass; that is the cost being avoided.
3. **The edit regions are disjoint, measured, not assumed.** Stage 7 declares `js/app.js:346-374`,
   `424-428`, `499-500`, `1022-1026`, `1071-1081`. This plan declares `350-356`, `698-707` and
   `1022-1032`. **They now touch in two places, and both are comment scrubs, not code:** `350-356`
   sits inside stage 7's `346-374`, and `1022-1025` inside its `1022-1026`. Both are the same
   sentence about what `currentDesc()` means at `dropRowHold()` (§2), which this slice falsifies and
   stage 7 relocates. No executable line is shared. Disjointness is therefore no longer the whole
   argument for landing separately; reasons (1), (4) and (5) are, and they do not depend on it.
4. **Neither gates the other, so sequencing is free.** This slice needs nothing stage 7 produces.
   Stage 7 needs nothing this slice produces. Landing this first is therefore pure benefit: stage 7's
   builder relocates the release inside a `runFinalize` whose stack mutation can no longer throw,
   instead of reasoning about both at once.
5. **This ships at HEAD today; stage 7 does not.** Stage 7 still owes the test author, the builder,
   the code reviewer and the coverage auditor. Binding a live defect's fix to that queue delays it
   for no gain.

**The one thing folding in would have bought, and why it is not enough.** Both slices touch
`runFinalize`, so one build would mean one rebase instead of two. **MEASURED against the transformed
copy, by locating each of stage 7's five anchors before and after** — there is no single constant,
and the previous version of this paragraph asserted one:

| Stage 7 declared range | Anchor located | Shift | Corrected range |
|---|---|---|---|
| `js/app.js:346-374` | `takeRowHold` 349→349, `dropRowHold` decl. 370→370 | **0** | `346-374`, unchanged |
| `js/app.js:424-428` | the hard-reset `dropRowHold()` 427→427 | **0** | `424-428`, unchanged |
| `js/app.js:499-500` | above every edit | **0** | `499-500`, unchanged |
| `js/app.js:1022-1026` | the finalize `dropRowHold()` 1026→1037 | **+11** | **`1033-1037`** |
| `js/app.js:1071-1081` | `if (cur !== session) return;` 1070→1086, `try { runFinalize()… }` 1078→1094 | **+16** | **`1087-1097`** |

Three ranges are unchanged, one shifts by 11 and one by 16, because edit 2 lands between them. The
correction to stage 7's declaration is four numbers, not two, and it is still a mechanical correction
and not a review round — but it is a correction that must be *stated*, which is why §8's scrub table
carries it as item 6 with an owner rather than leaving it to the rebase.

---

## 11. What this does NOT do (U2 deferrals)

- **It does not stop a settle-window navigation from happening.** Blocking input during the settle
  would be a product decision about feel, and it belongs to the designer, not here. **Consumer that
  does not exist yet:** none — no stage needs it.
- **It does not route the commit's stack mutation through `navTo`/`goBack`.** That would make the
  guard structural for the whole subsystem rather than for this function, and it is the better
  long-run shape. It is deferred because it rewrites the intent layer (`js/app.js:137-178`), which no
  current plan covers and which stage 7 would then be rebasing across. **Consumer that does not
  exist yet:** a future nav-ownership slice; none is scheduled, and this plan does not schedule one.
- **It does not add a mechanism for the non-throwing wrong-entry corruption beyond preventing it.**
  §1's drives I, S and T are three executed cases where a settle-window navigation made the commit
  mutate the wrong entry without throwing. The guard prevents all three — I and S because they fail
  the identity conjunct, T because it fails the **forward** conjunct with the identity conjunct
  satisfied. No separate production mechanism is added for them. **Two separate cells ARE owed and
  are filed**: `NAVIDENT` for I and S, `NAVPAIR` for T (§9). The round-1 version of this plan said no
  cell was owed at all and named `NAVSTALE`'s arming clause as the witness; the round-2 version filed
  one cell and called the forward conjunct source-only. Both were measured wrong, one round apart, on
  the same class.
- **It does not change the row hold, the lease, `dropRowHold`'s position, or the `finally` guard.**
  All four are stage 7's subject. It does change the descriptor `dropRowHold()` passes to
  `Browse.endHold` on the superseded path, and it corrects the two comments that promised otherwise
  (§8 scrub items 3, 4 and 6) — a value, not a position, and not a callee.
- **It owes no device gate.** No cell asserts geometry, stacking or paint, and the fix changes no
  animation. The standing device hold is unaffected either way.

---

## 12. Residual doubt

Stated epistemically. This design survived the strikes below; that is not a claim of safety.

- **The predicate rests on an enumeration for its *semantics*, not for its *totality* — and the
  enumeration has already been broken once, without a seventh writer.** Six stack writers were found
  by an executed grep and each one, taken alone, changes the top's identity. The round-1 version of
  this residual said a mis-classification would need "a seventh that this grep missed". **MEASURED at
  round 2 (F9): it needs no seventh.** A *pair* of the known six — `openSub` then `closeSub` —
  composes to leave `navStack`'s top identity intact while moving `fwdStack`, and that pair is drive
  T. So the coordinate to attack is not the completeness of the writer list; it is the **closure of
  the list under composition**, which nothing here proves and which a grep cannot decide. The branch
  conjuncts are what caught this instance, and they are what would catch a further one that keeps the
  descriptor stack's shape. A composition that left BOTH stacks' tops satisfying the predicate while
  meaning something new would still be mis-classified; no such sequence is known, and "not known" is
  a reading. The round-1 review re-ran the grep and got the same six sites, so the *membership* of
  the list has survived three executions by two seats; its closure has survived none.
- **`enterApp` was not driven.** It rebinds `navStack` wholesale (`js/app.js:1181`) and does **not**
  clear `fwdStack` — confirmed by reading `js/app.js:1170-1200`, so after a foreground re-entry the
  two stacks are inconsistent with each other independently of any gesture. That is a pre-existing
  hazard this plan does not create and does not close. `enterApp` is reachable only from boot and
  from sign-in, so it was traced unreachable mid-settle — and "traced unreachable" is a reading, not
  an execution. **The decision this waits on:** whether the open lock-screen resume thread gives
  `enterApp` a foreground re-entry caller. Until that is decided it cannot be classified either way.
  If it gains one it becomes a seventh writer and the drive is: settle a forward commit across an
  `enterApp`.
- **jsdom.** Every finalize in §1 fired from the 340 ms fallback. The on-device
  `transitionend`-vs-timer race is not represented; it changes *when* `runFinalize` runs, not what
  it reads, so the defect is timing-independent — but that is an argument.
- **The throw was captured by wrapping the harness's fake `setTimeout`.** The harness's
  `clock.advance` swallows a throwing timer callback, so an un-instrumented drive shows the defect
  only through its consequences. The suite cell must therefore assert the consequences (no corrupt
  stack; a gesture arms after one further navigation — §1's measured form, not the immediate one) or
  instrument the timer explicitly and say so. A cell that quietly asserts "no throw" against a
  harness that eats throws is vacuous. Every throw figure in §1 — drives F and B′ and both their
  controls — was taken with the instrumented form, and the instrumentation is a two-word change to
  `test/app-harness.js`'s timer catch. Whichever route the test author takes, the cell states which
  one it is; and the count must be read on the control too, because a counter that reads 0
  everywhere is the same vacuity in a new place.
- **The reveal report is NOT a usable oracle for "did it throw".** Measured: the `@reveal` FLASH line
  is emitted when the observation window closes, not at the reveal, so its absence at the end of a
  test means nothing. An earlier version of this reproduction used exactly that oracle and its
  negative control failed. Recorded so the test author does not re-derive it.
- **The back branch's throw is CLOSED, and the cost this residual used to state was wrong (F11).**
  The round-1 version of this entry assigned the test author a library-data fixture and offered drive
  S as a partial substitute. **MEASURED at round 2:** drive B′ (§1) produces the same throw at HEAD —
  **1** recorded, control **0** — with no library data, no chapter list and no new fixture; and drive
  S records **0** throws in every build, so it was never a throw substitute at all. `NAVSTALE-b`'s
  red-first demonstration therefore waits on nothing. What remains genuinely undriven is only §1's
  *chapter-list* route as literally written, and nothing depends on it.
- **Drive T's interleaving is constructible, not observed on a device.** Two deliberate taps inside
  one 340 ms window is a tighter interaction than F, B′, I or S require. Both taps are shipped
  controls and the harness builds the sequence deterministically, which is what a coverage cell needs;
  whether a user reaches it is a reading of the interaction, not a measurement. This does not weaken
  `NAVPAIR`: the cell's job is to keep the forward conjunct from being deleted, and it does that
  whatever the field frequency. It does mean the *severity* of the shipped defect drive T exhibits is
  stated as unquantified rather than as low or high.
- **`NAVPAIR`'s fixture reaches `openSub` through the harness's `realOptions` boot option**
  (`test/app-harness.js`, which wires the shipped `.hubrow[data-sub]` rows to the real `openSub`), and
  reaches `closeSub` through the `#dgBack` listener `js/app.js:3091` binds unconditionally at boot.
  Both are production paths; neither needs a new harness capability. The measurement above used
  exactly those two.
- **The `nav=` token's value domain is total only for the paths that reach the emit site TODAY, and
  that totality is enumerated, not structural.** The three-arm expression is exhaustive over
  `(commit, applies)` because `applies` implies `commit` — that much holds by construction. What does
  not hold by construction is that a future path reaching this log line means one of these three
  things. The shipped two-arm token was exactly this failure: an expression that was total over
  `applies` and silent about the binding that actually decided the abort path. The defence available
  is not a better enumeration — it is dimension 4(c)'s standing matrix, which forces every value of
  the token to name the cell that asserts it, so an unasserted value is visible as a hole rather than
  discovered on a device log. A value added without a matrix row would reproduce this defect exactly.

---

## 13. Sequence, owners, exit condition

| # | Step | Owner | State |
|---|---|---|---|
| 1 | Temper this plan | the plan reviewer | **done** — FORGE at round 3, `Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r3.md` |
| 2 | File `Claude/Campaigns/swipe-navstack.json` binding the gates below | the assistant | **done** |
| 3 | Author the red suite from §9 as `test/swipe-navstack-settle.test.js` | the test author | **done** — `Claude/Curie/RED-swipe-navstack-settle-window.md`, `eeda8e9`, 12 skipped-red cells |
| 4 | Build green: the three edits **as prescribed in §4.1**, the two comment scrubs in §8, the re-anchoring in §8, and **nine new registrations** in §9 — `NAVSTALE-a/b/c`, `NAVIDENT-a`, `NAVAPPLIES-b`, `NAVRECONCILE-a/b`, `NAVTOTAL-a/b`. `NAVAPPLIES-a` is the re-anchored existing registration and is not a new one; the registry therefore goes from 152 to 161 | the builder | **done** — `8acbdff`, `Claude/Brunel/swipe-navstack-settle-window-build.md` |
| 5a | Every named mutant executed individually, foreground, against its target file; confirm no `*.mutbak` anywhere afterwards. ⚠️ `NAVSTALE-a` and `NAVIDENT-a` are expected to redden **`NAVIDENT` and not `NAVSTALE`**, and `NAVTOTAL-b` is expected to redden **`NAVPAIR` and not `NAVTOTAL`** — a run that reddens the other cell means the drive has drifted, not that the mutant is stronger than declared | the builder | **done**, and re-derived independently by the code reviewer |
| 5b | Blast-radius probe, **control first**, in **two halves against two named tree states** — the figure and the check must never be taken against different trees (see the rule below). **(i) Tree = the COMPLETE mandated change set applied — the three source edits AND the two comment scrubs — with `tools/mutate.mjs` UNCHANGED:** the **refused** set — rotted AND non-unique, both classes counted — is **exactly two** registrations, the rotted `swipe: abort mutates the nav stack like a commit` and the rotted `EMPTYAFTERHOME-a`. ⚠️ The earlier "exactly one" was measured from the code edits alone and is the figure that fired the equality rule on correct work a fourth time; the scrubs are not optional decoration, they are mandated by §4 item 4 and §8's scrub table. **(ii) Tree = the built tree, i.e. (i) plus §8's TWO re-anchorings:** the refused set is **zero**, which is the same statement as `test/mutation-anchors.test.js` green — measured **6 tests / 6 pass / 0 fail**, count read from the runner. Both figures are measured in §8. Also on the built tree: the four fingerprints unchanged, the append-census text unchanged, and `docs/swipe-model.generated.txt` regenerated rather than hand-edited with its three census pins reading `715`, `716`, `1197` | the builder | owed |
| 5c | `node tools/stamp-build.mjs` — the build number bumped in lockstep with `sw.js` and `js/debug.js` | the builder | **done** — build `2026-08-05.3` |
| 6 | Code review | the code reviewer | **done** — `Claude/Poirot/POIROT-swipe-navstack-settle-window-8acbdff.md`, verdict **PASS — fix-then-ship**; F1 is this amendment, F2/F3/F4 are the builder's |
| 7 | Coverage audit | the coverage auditor | owed — starts from the review's O3, which §9 and §16 now answer |
| 8 | Records scrub (§8, seven items — **four owned by the builder in the build commit and three owned outside it**; the earlier "five owned outside" miscounted §8's own owner column) | the builder in-commit, then the assistant and the planner, per §8's owner column | items 3 and 4 done in `8acbdff`; items 1, 2, 5, 6, 7 owed |
| 9a | Extend `NAVAPPLIES` in `test/swipe-navstack-settle.test.js` with §9's abort-token clause, shown **red on `e80fcbe`** before the fix lands — at that HEAD an uninterfered abort's settle line reads `nav=superseded`, which is the red | the test author | owed |
| 9b | Apply §4.1's corrected three-arm token — the **single** changed line — register `NAVTOKEN-a` (§9), and re-stamp. §8.1 carries every declared figure | the builder | owed |

**The equality rule, and the two things it is measured against.** A measured set larger than §8's
declared set is a blast-radius miss and this plan is amended before the commit lands. **A measured
set SMALLER is also a stop** — it means the transform applied is not the transform specified. **The
rule is evaluated per half of 5b, each against the tree state named in that half**, because the
declared figure and the check are only comparable when both are taken against the same edit set AND
the same tree state: half (i) is `2` against the complete mandated change set with the registry
unchanged, half (ii) is `0` against the built tree after both re-anchorings. **The declared figures
are measured from §4.1's exact text**; a deviation from that text re-opens the measurement rather
than tripping the rule (§4.1). For the amendment build, §8.1 declares `0` against the built tree both
before and after `NAVTOKEN-a` is registered.

⚠️ **Why this step is written that way, and the FOURTH firing it did not prevent.** Round 2 measured
that the previous wording — one figure of `1`, checked against the *built* tree, where the answer is
`0` — halts a correct build at its last step (F10). That correction fixed the *tree state* axis and
left the *change set* axis wrong: the declared `1` was measured from the three code edits while the
commit mandates five changes, so a correct build measured `2` and the rule fired again, at build
time, after three rounds of plan review. **Both axes are now named in the step, and the durable
lesson is stated where a future planner will hit it:** a declared blast-radius figure is a statement
about a specific (change set, tree state) pair, and the change set is the COMMIT's, never the code
edits' — comment-only text is load-bearing to this project's tooling, which is the standing evidence
`EMPTYAFTERHOME-a` now supplies twice over. Board row `T-TOOL3` owns the durable tooling form; this
step's job is only to be self-describing, and it now is on both axes.

**Red-first is a step, not a report.** `NAVSTALE`'s, `NAVIDENT`'s and `NAVPAIR`'s drives must each be
shown red on unmodified HEAD before the fix lands, and their expected reds are named so a partial red
is not read as a red: at HEAD, `NAVSTALE`'s branch-F drive reddens on the throw assertion **and** on
the arming assertion taken after one further navigation, and its branch-B′ drive reddens on the throw
assertion (**1** recorded throw against its control's **0**); `NAVIDENT`'s drives I and S redden on
the landed screen; `NAVPAIR`'s drive T reddens on the landed screen (`playback`, where the control
lands `general`). A drive that reddens on fewer assertions than these has not been written as
specified.

**Red-first for the amendment.** `NAVAPPLIES`'s abort-token clause must be shown red on `e80fcbe`
before the corrected token lands, and the expected red is named: the recorded settle line for an
uninterfered aborting left-edge swipe reads `nav=superseded` where the clause requires `nav=abort`.
Its paired assertion — an uninterfered commit's line reading `nav=applied` — is green at `e80fcbe`
and must stay green, so the cell cannot pass by matching everything. **The proof that this red is
real and not a reading:** `NAVTOKEN-a` applied to the corrected source reproduces `e80fcbe`'s
`js/app.js` byte-for-byte (§8.1 item 4), and the suite is green at `e80fcbe`, so that mutant is
measured to survive the suite as it stands.

**Exit condition.** All of: every §9 cell active, green and mutation-verified, with `NAVTOTAL`'s
source-only status recorded rather than papered over **and recorded with the drive set it ranges over
(F, I, S, T, B′) rather than as a claim about all reachable drives**, `NAVSTALE-a`'s killing cell
recorded as `NAVIDENT`, and `NAVTOTAL-b`'s recorded as `NAVPAIR`; §8's measured co-change set equal to
its declared set on all ten rows **and §8.1's on all seven**, each row read against the tree state its
step names for it; the suite green at a count read from the runner, not inferred; the §8 records scrub
complete on all seven items; **the review's F1 closed by the amendment build (step 9b) and F2, F3 and
F4 closed by the builder**; the campaign manifest reading COMPLETE with every gate's verdict filed.
**CI-complete — no device gate is owed.**

**Handoff from this amendment:** **the test author** (step 9a) → **the builder** (step 9b, and the
review's F2, F3, F4) → **the coverage auditor** (step 7). The adversary is not commissioned again for
this slice: the defect it would hunt is the one already executed in §1, and the fix's own fracture
surface is the composition question named in §12, which the code review read in full and judged not a
defect. The plan reviewer is not re-commissioned either: this amendment changes one line of prescribed
text and its declared figures, not the design.

---

## 14. Round-1 temper — per-finding disposition

Casebook: `Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r1.md`, verdict TEMPER,
reviewed at `13a97b0`. Every disposition below carries the measured result that settles it; all
measurements were executed at the **round-1** amendment against `596c579`, control first, on a copy
outside the repo, and every one of them was re-derived independently by the reviewer at round 2.

| # | Finding | Disposition | The measurement that settles it |
|---|---|---|---|
| **F1** | §8's blast radius was measured from one of three edits; the naive writing adds two NON-UNIQUE anchors and, conditionally, a fourth rot | **RESOLVED, structurally.** §4.1 prescribes the exact edit text so the collision cannot be written; §8 is re-measured from all three edits and both failure classes; §13 5b counts refusals, not rots | control 0 refused; §4.1's text **1**; edit 2 as a nested block **3** (`M1NOWRITE` and `S2-24 ABORTNORENDER`, each `from` occurring 2×); edit 3 appended after `sid=${cur.id}` **2** (`stage3: session id not stamped…` rotted). Full change + the one re-anchoring + regeneration: suite **916 / 913 pass / 2 fail / 1 skip**, equal to the untransformed copy's baseline, with `test/mutation-anchors.test.js` green |
| **F2** | The `+4` delta and the census pins are edit-1-only; §10's "shifts by a constant" is wrong | **RESOLVED.** §8 items 5 and 6 re-measured; §10's counterweight replaced with a per-range table | delta **+16** (+11 from edits 1+3, +5 from edit 2); census pins `704→715`, `705→716`, `1181→1197` — the only three lines of the regenerated document that differ. Stage 7's five ranges shift by **0, 0, 0, +11, +16** — three constants, not one |
| **F3** | §1's "silently fails to arm" is false as driven; `NAVSTALE`'s oracle inherits it | **RESOLVED.** §1's consequence paragraph is replaced with the measured behaviour; `NAVSTALE`'s oracle now names the further navigation and says why | at HEAD, branch F with the mid-settle tap: 1 recorded timer throw; a fresh left-edge gesture **arms** immediately (true) and **does not arm** after one further navigation (false). Control: 0 throws, arms in both positions |
| **F4** | The identity conjunct has no killing cell; `NAVSTALE-a`'s expectation is false | **RESOLVED with a behavioural witness, not an argument.** §9 gains `NAVIDENT` over two executed drives; `NAVSTALE-a`'s expected killing cell is corrected to `NAVIDENT`; `NAVIDENT-a` registers the `.v` substitution §4.12 exists to forbid | across four builds: identity deleted lands drive I on **home** and drive S on **browse** (both wrong); the `.v` weakening lands drive I on **home** (wrong) and drive S correctly; the specified predicate lands both correctly. Both drives are red at HEAD. Drive I is the only one that separates `===` from `.v` |
| **F5** | Edit 3's range is absent from the declaration; §7 forces edit 1's range wider | **CORRECTED.** `source_ranges` now reads `js/app.js:350-356`, `698-707`, `1022-1032`; §7 item 3 is re-labelled CORRECTNESS and prescribes the placement | the hoist is forced by measurement, not by preference: the alternative placement rots `stage3: session id not stamped on the finalize line` (F1 row above) |
| **F6** | A superseded settle changes the value handed to `Browse.endHold`, and the comment justifying the old value is not on the scrub list | **CORRECTED, and widened by one.** §8's scrub table adds `js/app.js:350-356` **and its sibling at `js/app.js:1022-1025`**, which restates the same sentence at the call site; stage 7's ledger crossing is scrub item 6 with an owner; the Applicability row records why this is not `callee_replacement` | reading, as the review had it — no measurement is owed for a comment that contradicts a specified behaviour |
| **F7** | No cell drives a same-view `navTo` replacement | **ACCEPTED, and it became the fix for F4.** Drive I is exactly that interference, and it is the drive that kills `NAVIDENT-a` | drive I with the identity conjunct weakened to `.v`: landed screen **home**, `nav=applied` — the user tapped Books and was returned to Home |
| **F8** | `enterApp` rebinds `navStack` and does not clear `fwdStack` | **ACCEPTED into §12** with the `file:line` and the decision it waits on. Not closed here: it is a pre-existing hazard this plan neither creates nor removes | reading (`js/app.js:1170-1200`), stated as one |

**Round-2 note on this table.** The plan reviewer re-derived all eight dispositions above at round 2,
control first and by execution rather than by reading, and re-opened none of them. The round-1
statement that followed this table — that §1's branch-B route was uncovered and that drive S stood in
for it — was superseded by measurement at round 2 and is now §15's F11.

---

## 15. Round-2 temper — per-finding disposition

Casebook: `Claude/Charpy/PLAN-swipe-navstack-settle-window-2026-08-06-r2.md`, verdict TEMPER,
reviewed at `decfbd9`. Every disposition carries the measured result that settles it. **All four were
re-executed independently at this amendment against `decfbd9`, control first, on copies of the tree
outside the repo** (a pristine control copy, a drive copy whose harness fake timer records a throwing
callback instead of swallowing it, and three registry trees), with `node_modules` reached by a
directory junction. `git status --porcelain` in the repo named no source, tooling, test or generated
file before or after any probe, and no `*.mutbak` exists anywhere. `tools/mutate.mjs` was imported
(it is CLI-guarded); `tools/source-gate-sweep.mjs` was never imported, because importing it mutates
`js/app.js`.

| # | Finding | Disposition | The measurement that settles it |
|---|---|---|---|
| **F9** | `NAVTOTAL`'s source-only status is measured false for the forward conjunct; §12 anticipates the wrong crack; §9 dimension 4(b) is missing a cell | **RESOLVED, and the clause moved to a behavioural cell.** §5's per-writer argument is corrected to a per-sequence one and its table extended to seven builds × three drives; `NAVTOTAL` is narrowed to the `navStack.length` conjunct with its drive set stated in the sentence; **§9 gains `NAVPAIR`**, which owns `NAVTOTAL-b`; dimension 4(b) becomes a three-kind, five-cell matrix; §12's "seventh writer" residual is replaced by the closure-under-composition residual. The registration count is unchanged (152 → 161): only `NAVTOTAL-b`'s expected killing cell moves | drive T re-derived independently: at HEAD it lands **`playback`** — neither the gesture's destination `general` nor the user's last explicit action `options` — while its control lands `general`. Across seven builds: the specified predicate, `NAVSTALE-a`, `NAVIDENT-a` and `NAVTOTAL-a` all land T on **`options`** with `nav=superseded`; **`NAVTOTAL-b`** and both-deleted land it on **`playback`** with `nav=applied`. `NAVTOTAL-a` is indistinguishable from the specified predicate on every observable of **all five** drives F, I, S, T and B′; `NAVTOTAL-b` is distinguished by T and by T alone |
| **F10** | §13 step 5b requires a refused count a correct build cannot produce | **RESOLVED, and made self-describing.** 5b is split into two halves, each naming the tree state its figure was measured against; the equality rule is re-scoped to apply per half. No measured number moved | control (untransformed copy) **0** refused of 152 registrations / 161 anchor parts; the three source edits with `tools/mutate.mjs` unchanged → **1** (the rotted `swipe: abort mutates the nav stack like a commit`, ANCHOR NOT FOUND); the built tree, i.e. those edits **plus** §8's re-anchoring → **0**, and `test/mutation-anchors.test.js` **6 tests / 6 pass / 0 fail** on that tree, count read from the runner. The previous wording compared the first figure against the second tree |
| **F11** | The back branch's throw is drivable at HEAD with no library data, and drive S is not a throw substitute | **RESOLVED.** §1 gains drive B′ and its control and demotes the chapter-list route to a superseded authoring execution; §12's branch-B residual is retired and the fixture cost it assigned is withdrawn; `NAVSTALE`'s fixture names B′; §13's red-first list names B′'s expected red | drive B′ at HEAD: **1** recorded timer throw, `Cannot read properties of undefined (reading 'v')`; its control **0**. Under all six predicate builds: **0** throws and `nav=superseded`. Drive S records **0** throws in every build, so it never witnessed the throw. The interfering navigation is the shipped `closeSub` listener on `#dgBack` (`js/app.js:3091`) falling through to `goBack` (`js/app.js:177` → `145`) — no chapter list, no library data |
| **F12** | "Closed by construction" does not name the enforcing gate | **ACCEPTED.** §8's construction paragraph and §4.1's deviation paragraph both cite `test/mutation-anchors.test.js`'s non-uniqueness subtest, with the measured red that proves it fires | the subtest is green on the pristine tree and on the built tree (6/6 in both) and **red** on a tree where edit 2 is written as a nested block reproducing `js/app.js:1038` verbatim — `not ok 3`, `M1NOWRITE` and `S2-24 ABORTNORENDER` each NON-UNIQUE with `from` occurring 2 times. The gate is therefore proven able to fail, not merely present |

**What the ROUND-2 amendment does not cover.** §1's branch-B *chapter-list* route as literally written is
still not driven; nothing depends on it, because B′ drives the same branch to the same throw. Whether
drive T's two-tap interleaving occurs inside a real 340 ms window on a device is not measured and is
recorded in §12 as a reading. §8 item 10's *transformed-tree* suite run was not repeated: the round-2
changes are prose only and alter no source, tooling, test or generated file, so that figure stands as
measured. The repo's own suite WAS re-run at the round-2 amendment — **916 tests / 915 pass / 0 fail /
1 skip**, count read from the runner — and `git status --porcelain` afterwards named only this plan.

---

## 16. Post-review amendment — per-finding disposition

Casebook: `Claude/Poirot/POIROT-swipe-navstack-settle-window-8acbdff.md`, verdict **PASS —
fix-then-ship**, target `8acbdff`. This section disposes of **only the findings that land on this
plan**. F2's record scrubs (`Claude/Subsystems/swipe-reveal.md` items 12 and 13), F3 and F4 (the build
log's own collateral enumerations) and O1 are the builder's and are not amended here; O2's scrub items
5 and 6 already carry the planner as owner in §8's table and are unchanged by this pass.

Every figure below was executed at this amendment against `e80fcbe`, control first, on copies of the
tree outside the repo with `node_modules` reached by a directory junction. The untransformed control
copy reads **935 / 932 pass / 2 fail / 1 skip** (the two git-only gates). `git status --porcelain` in
the repo named no source, tooling, test or generated file before or after any probe, and no `*.mutbak`
exists anywhere. `tools/mutate.mjs` was imported (CLI-guarded); `tools/source-gate-sweep.mjs` was
never imported, because importing it mutates `js/app.js`.

| # | Finding | Disposition | The measurement that settles it |
|---|---|---|---|
| **F1** | Every plain ABORT logs `nav=superseded`; `applies` is `commit && …` so the two-arm ternary is false on an abort by construction | **RESOLVED, by a third arm rather than by suppression.** §4.1's token becomes `nav=${!commit ? 'abort' : applies ? 'applied' : 'superseded'}`; §4 item 3, §5's outcome table, §9 dimension 4(c) and contract claim (c), and §12's new totality residual are corrected together. Suppressing the token on aborts was considered and rejected: an absent `nav=` is ambiguous between "this settle aborted" and "this build predates the token", and the invariant worth having is that every settle line carries exactly one `nav=` value | the corrected token adds **0** refusals to the 161-registration registry, leaves `M1NOWRITE`, `S2-24 ABORTNORENDER`, `M1NAVWINS` and `stage3: session id not stamped…` at exactly **one** occurrence each, regenerates `docs/swipe-model.generated.txt` **byte-identical** to the committed document, changes the line count by **0**, and leaves the suite at **935 / 932 pass / 2 fail / 1 skip** — identical to its control. Lint and typecheck clean on both copies. Both oracles are proven able to fail: the refusal probe reports **3** on a source with one anchor deliberately broken, and the generator moves a census pin (`1197`→`1198`) on a source with one line inserted |
| **F2, second half** | §13 step 8 says "seven items, five of them owned outside the build commit" while §8's owner column has four in-commit and three outside | **CORRECTED.** §13 step 8 now reads four in-commit and three outside, and §8's scrub table gains a dated state line recording that items 3 and 4 are done in `8acbdff`, items 1 and 2 are not, and items 5, 6 and 7 are open | counted directly from §8's owner column: items 1, 2, 3, 4 = "the builder, same commit"; items 5, 6 = "the planner"; item 7 = "the assistant" |
| **O3** | The `nav=` token is a production observable with no cell on the abort path — F1 shipped precisely because nothing asserts it there | **RULED: the cell IS owed, and it is specified here rather than left to the auditor.** `NAVAPPLIES` gains the abort-token clause — an uninterfered abort's settle line reports `abort` and never `superseded`, paired in the same run with an uninterfered commit's line reporting `applied` so the assertion cannot pass by matching everything — and one registration, `NAVTOKEN-a`, which deletes the third arm. §9 dimension 4(c) makes the token's value matrix standing, so an unasserted value of this observable is visible as a hole rather than found on a device log. The coverage auditor verifies this cell; it does not have to invent it | the whole suite on the amended copy reddens **nothing** — 935 / 932 pass / 2 fail / 1 skip against an identical control — which is the direct measurement that no existing cell asserts the abort token. `NAVTOKEN-a` resolves **uniquely** on the corrected source, and applying it reproduces `e80fcbe`'s `js/app.js` **byte-for-byte**, so the registered mutant is the shipped defect exactly; `e80fcbe`'s suite being green is therefore a measurement that the mutant currently survives |
| **§8's declared blast radius** | Not a numbered finding, but the review's Phase 2 and the builder's disclosure both name it: §8 measured its transform as the three code edits while §8 itself mandates two comment scrubs in the same commit | **CORRECTED, on both axes of the equality rule.** §8's transform sentence, its items 1 and 2, its "why §4.1 prescribes the text" table and §13 step 5b half (i) all move from **1** to **2**; the second re-anchoring is recorded; §13's note now names the change-set axis alongside the tree-state axis, and states the durable form: a declared figure is a statement about a (change set, tree state) pair, and the change set is the commit's | re-derived here, control first, against the pristine 152-registration registry: control **0** refused of 152 registrations / 161 anchor parts; the three code edits alone **1** (the rotted `swipe: abort mutates the nav stack like a commit`); the complete mandated set including both comment scrubs **2** (the above plus `EMPTYAFTERHOME-a`, ANCHOR NOT FOUND); the complete mandated set with the corrected token **2** — the token adds nothing. `EMPTYAFTERHOME-a`'s anchor uses the scrubbed comment as its uniqueness disambiguator because `        dropRowHold();` occurs twice in `js/app.js` |

**What the POST-REVIEW amendment does not cover.** The design, the predicate, edits 1 and 2, the standalone
ruling, §10's rebase arithmetic and every round-1, round-2 and round-3 disposition are untouched; the
review re-derived the design's corollary independently and found it sound. §1's branch-B *chapter-list*
route is still undriven and nothing depends on it. Drive T's field reachability is still a reading.
The review's [W86] — an identity-preserving `openSub`/`closeSub` pair on the **back** branch passing
the guard — was read in full by the code reviewer and judged not a defect, on the ground that the
resulting `fwdStack` write is byte-for-byte what an explicit `goBack()` would have produced; that
judgement is a reading, not an execution, and it is the coordinate a future strike should aim at. It
is recorded in §12's closure-under-composition residual and is not closed by this amendment.
