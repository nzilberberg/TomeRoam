# PLAN — the nav stacks survive a navigation inside the swipe settle window

Type: plan

<!-- vitruvius-gate {"plan_type":"defect-fix",
  "patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":false,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/app.js:702-707","js/app.js:1032-1041"],
  "callee_ranges":[],
  "affected_contracts":["tools/mutate.mjs:322","docs/swipe-model.generated.txt:1","build.json:1","Claude/Subsystems/swipe-reveal.md:174","Claude/Subsystems/swipe-reveal.md:178"],
  "staged_records":["Claude/Subsystems/swipe-reveal.md","Claude/Zelda/Board.md","Claude/Decisions/DecisionLog.md","Claude/Campaigns/swipe-navstack.json"],
  "blocking_questions":["NAVSTALE","NAVAPPLIES","NAVRECONCILE","NAVTOTAL"]} -->

Status: **AUTHORED — not reviewed, not cleared to build.** Next seat is the plan reviewer.
Closes board row **`T-S7M`**, which routed this defect to the planner with two obligations:
reproduce it, and rule on fold-into-stage-7 versus standalone. §1 is the reproduction; §10 is
the ruling.

Input state, executed at authoring: HEAD `d0201d7`, `main` == `origin/main`, tree clean, build
`2026-08-05.2`, suite **916 tests / 915 pass / 0 fail / 1 skip** (count read from the runner, not
inferred), no `*.mutbak`. `tools/mutate.mjs` holds **152** registrations (counted by importing the
module, not by grep). HEAD moved to `0f26282` while this was being authored; `git diff --stat`
shows that commit touches `Claude/Zelda/Board.md` and nothing else — no source, no tooling, no
generated document — so every measurement below stands unchanged.

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

| # | Drive | Result |
|---|---|---|
| **F** (forward) | Home → Books → Options; back-swipe committed, leaving `fwdStack = [options]`. Right-edge forward swipe Books→Options released to commit. A bottom-nav tap inside the settle window runs `navTo`, whose `fwdStack.length = 0` (`js/app.js:141`) empties the stack. The 340 ms fallback fires. | `fwdStack.pop()` returns `undefined`, `navStack.push(undefined)`, `currentDesc()` is `undefined`, and **`TypeError: Cannot read properties of undefined (reading 'v')` is thrown at `js/app.js:1021:61`**, inside the `reportReveal(...)` argument list, called from `finalize` at `js/app.js:1078`. |
| **B** (back) | Home → a chapter list opened from a home tile, so `navStack = [home, files]`. Left-edge back-swipe Files→Home released to commit. A tap on the chapter list's own drill back button inside the settle window runs `goBack()`, popping to `navStack = [home]`. The 340 ms fallback fires. | `navStack.pop()` runs unguarded, `navStack` becomes `[]`, `currentDesc()` is `undefined`, and **the same `TypeError` is thrown at the same line**. |
| **F-control** | Drive F with no mid-settle tap. | No throw. |
| **F-control-late** | Drive F with the tap AFTER the settle window closes. | No throw. |
| **B-control** | Drive B with no mid-settle tap. | No throw. |

Branch **B is new**: the adversary's casebook (`Claude/Loki/STRIKE-swipe-stage7-lease-exits-2026-08-06.md`
§5) reports only the forward branch. The back branch is user-reachable through the shipped chapter-list
back button and produces the identical throw.

**Consequences at HEAD.** The reveal diagnostic is lost; the commit's screen reconcile
(`js/app.js:1032`) never runs, so the visible screen and the descriptor stack disagree; and on
branch F `navStack` retains an `undefined` entry, after which a left-edge back gesture resolves
`dest = navStack[navStack.length - 2]` to `undefined` and **silently fails to arm** (`js/app.js:447`) —
executed and observed. The row hold is still released: the `finally` at `js/app.js:1079` covers it,
which is why the adversary's own commission held.

**Non-throwing corruption of the same class, also executed.** Where the settle-window navigation
leaves the stacks non-empty, no throw occurs and the commit still mutates the wrong entry: a
back-commit from a settings sub-screen whose ‹ Back was tapped mid-settle lands with the Options hub
visible and `currentDesc()` naming Home. The throw is the loud instance of a quiet class.

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

---

## Applicability

| Pattern | Value | Reason |
|---|---|---|
| `boundary_relocation` | false | No code moves between modules or ownership boundaries; both edits are inside `runFinalize` in `js/app.js`. |
| `callee_replacement` | false | No call is replaced by an indirection; no callee's observable effects are redistributed. ⚠️ The plan gate raises its heuristic warning here, correctly and harmlessly: §11 discusses routing the mutation through the nav intents and **defers it**. The warning is the heuristic firing on deferral prose, not on a change this plan makes. |
| `contract_shape` | false | No exported shape, no contract object, no return value changes. `applies` is a function-local binding. |
| `state_transfer` | false | No state changes owner or home. `navStack`/`fwdStack` stay exactly where and whose they are. |
| `async_change` | false | No scheduling, timing, cancellation or promise behaviour changes. The 340 ms fallback and the `transitionend` race are untouched. |
| `persistence_migration` | false | Nothing here is serialized, stored or versioned; the gesture is entirely in-memory (subsystem item 15). |
| `lifecycle_ownership` | **true** | The whole subject is *when a settling gesture still owns the right to mutate the nav stacks*, and when that ownership lapses. §6 is that section. |

---

## 4. Exact scope boundary (U2)

**What changes — three edits, all in `js/app.js`, all inside `runFinalize`.**

1. **The commit stack mutation becomes conditional** (`js/app.js:702-706`). The condition is stated
   in §5. The three mutation branches themselves are unchanged, character for character.
2. **The settle's screen reconcile gains its third case** (`js/app.js:1032-1040`). A settle whose
   stack mutation was skipped reconciles the CURRENT screen with no render and **no scroll write** —
   it must not restore the pre-gesture scroll (that belongs to a screen the user has left) and must
   not let `resetScroll` default to true (`js/nav.js:125` writes `$(v).scrollTop = 0` for home,
   Options and every settings sub-screen, so the default would jump the newer screen to its top).
3. **The existing SWIPE log line gains one token** (`js/app.js:699-700`). It already carries
   `#seq`, direction, endpoints, target liveness and session id; it gains `nav=applied` or
   `nav=superseded`. This is the production consumer required by §4.15 and it is what a device log
   needs to tell "the stack moved" from "the stack deliberately did not" — the standing discipline
   that a diagnosis is owed a device log first.

**What stays.**

- The three mutation expressions, the `commit`/abort split, the `cur !== session` ownership guard at
  `js/app.js:1070`, the `try/finally` leak guard at `1077-1081`, `dropRowHold`'s position at `1026`,
  the 340 ms fallback, and every `Browse` interaction. None of them is a cause and none is touched.
- `goBack` and `closeSub` keep their own guards. They are already correct.

**What is SPLIT across the seam.** Nothing. Both edits sit inside one function and one commit.

**What is DEFERRED.** See §11. Each deferral names the consumer that does not exist yet.

**No new field.** `applies` is a function-local `const`, consumed on the next line and by edit 2 in
the same function. Per §4.15 it is not a field and creates no dead surface.

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

**Why the identity conjunct is the semantic guard.** `cur.from` is the descriptor object
`currentDesc()` returned when the gesture armed (`js/app.js:441`). An **executed** grep for every
write to either stack across `js/*.js` returns six sites, all in `js/app.js`: `navTo` (`139`, `140`,
`141`), `goBack` (`147`), `openSub` (`163`), `closeSub` (`174`), `runFinalize` itself (`703-705`),
and the `enterApp` rebind (`1181`). Every one of them replaces or removes `navStack`'s top, so the
identity check detects all of them.

**Why the branch conjuncts are kept even though that argument makes them redundant.** The argument
above is an enumeration, and this campaign's enumerations have been wrong repeatedly — every miss
found by executing, never by a further reading. The branch conjuncts do not depend on it: they make
the `pop()` and the `fwdStack` read **total by construction**, so a future stack mutator that
somehow preserved the top's identity still cannot produce `undefined`. A defence that holds by
construction closes the coordinate; a defence that holds because a list was complete does not.
**Honest consequence:** no drive reachable at HEAD reddens the conjuncts alone, so they are pinned by
a SOURCE assertion (`NAVTOTAL`), not by a behavioural cell. That is stated rather than hidden — a
clause whose mutation no cell can kill is exactly the vacuity this project has shipped before.

**The stale outcome.** When `commit` is true and `applies` is false, the gesture is *stack-superseded*:
the animation showed a transition the stacks no longer sanction. The stacks win (subsystem item 3),
so the settle reconciles to `currentDesc()` and writes no scroll. It does not attempt to re-run the
newer navigation and it does not undo it.

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

Three orderings, each labelled as a correctness requirement or as incidental.

1. **CORRECTNESS.** `applies` is evaluated **before** any stack write, and `const dest = currentDesc()`
   is read **after** the conditional block. Evaluating the predicate after a partial write, or
   hoisting the `dest` read above the block, reintroduces the defect in a new shape.
2. **CORRECTNESS.** The predicate reads `currentDesc()` **inside** `runFinalize`, not at `begin()`.
   The whole point is that the settle window sits between them.
3. **INCIDENTAL.** The position of the SWIPE log line relative to the predicate. It is emitted at
   `js/app.js:699-700`, before the mutation; edit 3 requires the token to be computed from the same
   predicate, which means either hoisting the predicate above the log line or emitting the token with
   the existing line's other late-computed values. Either is admissible; the builder chooses. What is
   NOT admissible is computing the token twice from two expressions — one source of truth (§4.16).

Everything else in `runFinalize` keeps its existing order. In particular `dropRowHold()` stays before
`applyScreen` at `js/app.js:1022-1026` — that ordering is a shipped defect fix (the empty-books-page
class) and is out of scope here.

---

## 8. Blast radius, MEASURED (U10)

Every figure below was produced by executing the transform in memory against `js/app.js` and
comparing, **control first**. Nothing in this section is a reading.

**Control.** With no transform applied, **0** of the 152 mutation registrations rot. The measurement
can therefore report a difference rather than a constant.

| # | Consequence | How it was measured | Result |
|---|---|---|---|
| 1 | `tools/mutate.mjs` registration **`swipe: abort mutates the nav stack like a commit (-> I11 abort test)`** rots | Imported `MUTATIONS` and tested every `from` (and `also.from`) against the transformed source | **Exactly one registration rots**, this one. It anchors on `'        if (commit) {'` + the back line (`tools/mutate.mjs:30-37, 322-323`). |
| 2 | The other 151 registrations are unaffected | Same measurement | 151 still match. |
| 3 | The four mirrored-region fingerprints in `tools/gen-swipe-model.mjs` | Re-implemented the generator's `regionHash` on the transformed string, **validated against the generator's own live values first** (`navTo` and `gestureEnd` both matched, so the re-implementation is faithful) | **`navTo`, `navRelation`, `gestureEnd`, `supersession` — all four UNCHANGED.** The edit sits inside `settle()`, past every fingerprinted region's end mark. `VERIFIED` in `test/swipe-model.test.js` needs no edit. |
| 4 | `navStackAppendCensus()` — the append-site inventory | Ran the generator's regex over the transformed string | **The `text` array is byte-identical**, so `VERIFIED_APPEND_SITES` in `test/swipe-model.test.js` needs no edit. |
| 5 | `docs/swipe-model.generated.txt` | The census **line numbers** shift `704→708`, `705→709`, `1181→1185`; each of the seven census lines is pinned in the generated document by `js/app.js:NNN` (checked by regex against the committed file) | **Regeneration required** (`node tools/gen-swipe-model.mjs`). Without it, `test/swipe-model.test.js`'s "the committed model is exactly what the generator produces" goes red. Regenerate; never hand-edit. |
| 6 | Line delta | Diffed line counts | **+4** lines in `js/app.js` before edits 2 and 3. |
| 7 | The build stamp | `js/app.js` is a shipping file and `test/shipping-change-bumps.test.js` gates it | **Bump required** — `node tools/stamp-build.mjs`, in lockstep with `sw.js` and `js/debug.js`, per the standing PWA deploy rule. |
| 8 | `android/build/assets/www/js/app.js` holds a stale copy of these lines | `git check-ignore` | **Ignored (`android/.gitignore:1`), untracked — not a co-change.** |
| 9 | Any other file carrying the changed source text | Repo-wide grep for `if (commit) {`, `navStack`, `fwdStack`, `newNav` outside `js/` | The only source-literal consumer is `tools/mutate.mjs` (item 1). Every other hit is a record or the generated document (item 5). |

**The re-anchoring, specified.** The rotted registration's meaning is "an abort mutates the nav stack
like a commit". Preserve it exactly by moving its anchor to the new predicate's first line:
`const applies = commit && currentDesc() === cur.from` → `const applies = currentDesc() === cur.from`.
⚠️ **Do not** re-anchor it to `const applies = true`: that deletes the staleness guard as well, so the
mutant would then be killed by `NAVSTALE` instead of by the I11 abort cell, and a registration whose
killing cell has silently moved is a coverage claim about a defect nobody is testing for.

**Records scrubbed on approval (§6.6, exhaustive on the first pass).**
`Claude/Subsystems/swipe-reveal.md` item 12 (the mutation is conditional) and item 13 (a third
recovery outcome). `Claude/Plans/PLAN-swipe-stage7.md` §14/§17 describe the throwing finalize as a
producer that exists in shipped code; after this lands that producer is retired and the sentence is
historical — the sentence is corrected, the `finally` guard it justifies is not weakened (§6).
`Claude/Zelda/Board.md` and `Claude/Decisions/DecisionLog.md` per the tracking seat's normal duty.

---

## 9. Coverage Model

Ten dimensions from the auditor's catalog, each applicable with what the suite must prove, or not
applicable with the reason. **Absence is a decision.**

⛔ **jsdom has no layout or paint.** No cell below asserts geometry or a measured rect. The scroll
clauses assert *whether a write was issued* (`window.scrollTo` is recorded by the harness; `scrollTop`
is a plain jsdom property), never a resulting position.

| # | Dimension | Applicable? | What the suite must prove |
|---|---|---|---|
| 1 | **Lifetime and reuse** | **Yes — the stage's core.** | The gesture's claim on the stacks is valid only from arm to finalize, and only while the stacks still match it. Applied exactly once on an uninterfered commit; not at all on an abort; not at all on a stack-superseded commit. `NAVSTALE` + `NAVAPPLIES`. |
| 2 | **Trust boundaries and hostile inputs** | **No.** | The predicate reads only in-process state the app itself wrote. There is no external, serialized or attacker-influenced input anywhere on this path. |
| 3 | **Concurrency** | **Yes.** | The interleaving is a user input landing inside the 340 ms settle window — the only concurrency this subsystem has. Both drives in §1 are exactly that interleaving. `NAVSTALE`. Gesture-vs-gesture supersession is already covered by the existing stage-6c cells, which must stay green. |
| 4 | **Shape and platform matrices** | **Yes, as the branch matrix.** | All three commit branches: `back`, `fwd` (the `fwdStack` replay) and `newNav` (NP → chapter list). `NAVAPPLIES` drives all three; `NAVSTALE` drives `back` and `fwd`, the two that read a stack. `newNav` pushes a captured object and reads nothing, which is why it has no stale drive and why that is a decision, not a hole. |
| 5 | **Failure and rejection paths** | **Yes.** | `runFinalize` must not throw on either drive in §1, and the existing "a throw in finalize restores `finishing`" cell must stay green — the `finally` guard is retained, not replaced. `NAVSTALE`. |
| 6 | **Numerical edges and determinism** | **Yes, narrowly.** | The one numeric edge is the stack length at which the pop becomes unsound: `navStack.length > 1`. `NAVTOTAL` pins it over source, because no reachable drive isolates it (§5). |
| 7 | **Contract claims** | **Yes.** | The absolute claim this plan makes is *`currentDesc()` is total* — `navStack` is never empty and never holds a non-descriptor. `NAVSTALE` asserts the observable form of it: after either drive, a subsequent left-edge back gesture still ARMS (at HEAD it silently does not). |
| 8 | **Composition** | **Yes.** | The guard crossed against the settle window's other occupants: a browse→browse pair, an overlay source, and a commit whose reconcile lands on a scroll-resetting screen (home / Options / a settings sub). `NAVRECONCILE` carries the last of these. |
| 9 | **Persistence round-trip and version evolution** | **No.** | Nothing on this path is serialized, stored or versioned (subsystem item 15). No IndexedDB, no service worker, no `build.json` semantics — the build *number* bumps, which is a stamp, not a format. |
| 10 | **Functional achievement (the feature oracle)** | **Yes.** | End to end on the real app: after a settle-window navigation, the screen the user is looking at and the screen `currentDesc()` names are the same one, and back navigation from there still works. `NAVSTALE`'s arming clause plus `NAVRECONCILE` are the oracle; no new production surface is added to carry it. |

**New mechanism check (the amendment discipline).** One mechanism enters this plan — the staleness
predicate — and it was crossed against all ten dimensions above rather than only dimension 1. Its
one new observable value, the `nav=applied|superseded` token, was crossed separately: lifetime — it
is emitted once per settle on the existing line; trust — it takes no external input; concurrency —
it is computed from the same predicate as the mutation, so it cannot disagree with it; failure — it
rides the already `window.PBDebug`-guarded line, so its absence is not a throw; contract — it is a
string on a diagnostic line and changes no shape; numerics and persistence — not applicable;
composition and oracle — it changes no outcome and is read by `NAVSTALE` as a production channel.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
NAVSTALE | a committed gesture whose stack precondition is invalidated inside the settle window mutates NEITHER stack and does not throw, on BOTH stack reading branches; concretely a forward commit whose forward stack is emptied by a navigation tap in the window and a back commit whose descriptor stack is reduced to its root by a drill back tap in the window each leave the stacks exactly as the interfering navigation left them, and after either settle a fresh left edge back gesture still ARMS which at head it silently does not, and the settle line reports the superseded outcome so the device log names it | integration boot the app harness and drive each of the two sequences from section 1 verbatim against the real app source, asserting no throw escapes the settle timer, asserting that a subsequent left edge touch produces a live gesture session, and asserting the settle log line carries the superseded token; each drive is paired with its own control that omits the mid settle tap and must show the applied token and a normal landing | THREE named registrations. NAVSTALE-a the identity conjunct is deleted so applies reduces to the commit flag alone and both sequences throw again. NAVSTALE-b the guard is applied to the forward branch only so the back sequence throws while the forward one passes. NAVSTALE-c the superseded settle still performs the mutation but swallows the throw with a try block so the stacks corrupt silently and the arming clause is the only witness. expected killing cell for ALL THREE is NAVSTALE | integration app harness driving the real js app source through the real touch listeners
NAVAPPLIES | an UNINTERFERED committed gesture still mutates the stacks exactly as it does today on all three branches namely the back branch which moves the top of the descriptor stack onto the forward stack, the forward replay branch which moves the top of the forward stack back onto the descriptor stack, and the fresh forward navigation branch which pushes the captured destination and clears the forward stack; and an ABORTED gesture still mutates neither stack | integration drive one clean commit per branch on the app harness and assert the landed screen and the subsequent back and forward reachability that each stack state implies, then drive an abort and assert both stacks are unchanged by reaching the same screens afterwards; the abort half is the existing I11 fixture and must keep passing unchanged | TWO named registrations. NAVAPPLIES-a is the RE ANCHORED existing registration swipe abort mutates the nav stack like a commit whose anchor moves onto the new predicate first line and whose replacement drops only the commit conjunct so an abort mutates the stack, expected killing cell the existing I11 abort cell not this one. NAVAPPLIES-b the applied path is made unconditional in the other direction by deleting the whole conditional block so a clean commit mutates nothing, expected killing cell is NAVAPPLIES | integration app harness over the real gesture plus the retained I11 abort cell
NAVRECONCILE | a stack superseded settle reconciles the screen the stacks now name and writes NO scroll, meaning it neither restores the pre gesture document scroll which belongs to a screen the user has left nor allows the screen reset to default on and jump the newer screen back to its top, while an ordinary commit and an ordinary abort keep their existing scroll behaviour byte for byte | integration drive the forward sequence from section 1 with the mid settle tap landing on a scroll resetting screen namely home or the options hub or a settings sub screen whose panel scroll offset is set to a non zero value before the tap, then assert after the settle that the harness recorded no document scroll write attributable to the settle and that the panel scroll offset is unchanged; the two control drives assert the existing scroll writes are still issued on a plain commit and a plain abort | TWO named registrations. NAVRECONCILE-a the superseded branch falls through to the ordinary commit reconcile so the screen reset defaults on and the newer screen jumps to its top. NAVRECONCILE-b the superseded branch falls through to the abort reconcile so the pre gesture document scroll is restored over the newer screen. expected killing cell for BOTH is NAVRECONCILE | integration app harness asserting recorded calls and plain element properties never a measured rect
NAVTOTAL | the two branch totality conjuncts are PRESENT in source so the descriptor stack pop and the forward stack read cannot produce an absent value even if a future stack writer preserved the identity of the descriptor stack top, which is the construction that makes the guarantee independent of the six site enumeration the identity conjunct rests on | source assert over js app that the predicate expression contains both the descriptor stack length comparison and the forward stack top identity comparison, in the one adapter expression, and re pin the assertion so it stops matching when either is removed; this is a SOURCE cell by necessity and the plan says so, because no drive reachable at head reddens either conjunct on its own | TWO named registrations. NAVTOTAL-a the descriptor stack length comparison is deleted from the predicate. NAVTOTAL-b the forward stack top identity comparison is deleted from the predicate. expected killing cell for BOTH is NAVTOTAL and for neither is any behavioural cell, which is stated so a green behavioural suite is not mistaken for cover | source scan over the one predicate expression in js app
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
   `424-428`, `499-500`, `1022-1026`, `1071-1081`. This plan declares `702-707` and `1032-1041`.
   No overlap, in either direction.
4. **Neither gates the other, so sequencing is free.** This slice needs nothing stage 7 produces.
   Stage 7 needs nothing this slice produces. Landing this first is therefore pure benefit: stage 7's
   builder relocates the release inside a `runFinalize` whose stack mutation can no longer throw,
   instead of reasoning about both at once.
5. **This ships at HEAD today; stage 7 does not.** Stage 7 still owes the test author, the builder,
   the code reviewer and the coverage auditor. Binding a live defect's fix to that queue delays it
   for no gain.

**The one thing folding in would have bought, and why it is not enough.** Both slices touch
`runFinalize`, so one build would mean one rebase instead of two. Measured, the rebase is trivial:
the ranges do not overlap and the `+4` line delta shifts stage 7's `1022-1026` and `1071-1081` ranges
by a constant. Stage 7's plan must have those two ranges re-stated once this lands — a two-number
edit to its declaration, which is a mechanical correction and not a review round.

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
- **It does not touch the non-throwing wrong-entry corruption beyond preventing it.** §1 records two
  executed cases where a settle-window navigation made the commit mutate the wrong entry without
  throwing. The guard prevents both, because both fail the identity conjunct. No separate mechanism
  is added for them and no separate cell is owed — `NAVSTALE`'s arming clause is the witness.
- **It does not change the row hold, the lease, `dropRowHold`'s position, or the `finally` guard.**
  All four are stage 7's subject.
- **It owes no device gate.** No cell asserts geometry, stacking or paint, and the fix changes no
  animation. The standing device hold is unaffected either way.

---

## 12. Residual doubt

Stated epistemically. This design survived the strikes below; that is not a claim of safety.

- **The predicate rests on an enumeration for its *semantics*, not for its *totality*.** Six stack
  writers were found by an executed grep and all six change the top's identity. If a seventh exists
  that this grep missed, a stack-superseded settle could still be mis-classified as applicable. The
  branch conjuncts are what keep that from producing an `undefined`; they do not keep it from
  producing a *wrong* landing. The reviewer should attack the grep, not the predicate.
- **`enterApp` was not driven.** It rebinds `navStack` wholesale (`js/app.js:1181`) and does **not**
  clear `fwdStack`. It is reachable only from boot and from sign-in, so it was traced unreachable
  mid-settle — and "traced unreachable" is a reading, not an execution. If it ever gains a
  foreground re-entry caller (the open lock-screen resume thread would be one), it becomes a seventh
  writer and the drive is: settle a forward commit across an `enterApp`.
- **jsdom.** Every finalize in §1 fired from the 340 ms fallback. The on-device
  `transitionend`-vs-timer race is not represented; it changes *when* `runFinalize` runs, not what
  it reads, so the defect is timing-independent — but that is an argument.
- **The throw was captured by wrapping the harness's fake `setTimeout`.** The harness's
  `clock.advance` swallows a throwing timer callback, so an un-instrumented drive shows the defect
  only through its consequences. The suite cell must therefore assert the consequences (no corrupt
  stack, a subsequent gesture arms) rather than the throw, or instrument the timer explicitly and say
  so. A cell that quietly asserts "no throw" against a harness that eats throws is vacuous.
- **The reveal report is NOT a usable oracle for "did it throw".** Measured: the `@reveal` FLASH line
  is emitted when the observation window closes, not at the reveal, so its absence at the end of a
  test means nothing. An earlier version of this reproduction used exactly that oracle and its
  negative control failed. Recorded so the test author does not re-derive it.

---

## 13. Sequence, owners, exit condition

| # | Step | Owner | State |
|---|---|---|---|
| 1 | Temper this plan | the plan reviewer | owed |
| 2 | File `Claude/Campaigns/swipe-navstack.json` binding the gates below | the assistant | owed |
| 3 | Author the red suite from §9 as `test/swipe-navstack-settle.test.js` | the test author | owed |
| 4 | Build green: the three edits in §4, the re-anchoring in §8, and **eight new registrations** in §9 — `NAVSTALE-a/b/c`, `NAVAPPLIES-b`, `NAVRECONCILE-a/b`, `NAVTOTAL-a/b`. `NAVAPPLIES-a` is the re-anchored existing registration and is not a new one; the registry therefore goes from 152 to 160 | the builder | owed |
| 5a | Every named mutant executed individually, foreground, against its target file; confirm no `*.mutbak` anywhere afterwards | the builder | owed |
| 5b | Blast-radius probe, **control first**: re-run §8's measurement against the built tree and require the rotted set to be exactly one registration, the four fingerprints unchanged, the append-census text unchanged, and `docs/swipe-model.generated.txt` regenerated rather than hand-edited | the builder | owed |
| 5c | `node tools/stamp-build.mjs` — the build number bumped in lockstep with `sw.js` and `js/debug.js` | the builder | owed |
| 6 | Code review | the code reviewer | owed |
| 7 | Coverage audit | the coverage auditor | owed |
| 8 | Records scrub (§8, the four records) | the assistant | owed |

**A measured set larger than §8's declared set is a blast-radius miss and this plan is amended before
the commit lands. A measured set SMALLER is also a stop** — it means the transform applied is not the
transform specified.

**Exit condition.** All of: every §9 cell active, green and mutation-verified, with `NAVTOTAL`'s
source-only status recorded rather than papered over; §8's measured co-change set equal to its
declared set on all nine rows; the suite green at a count read from the runner, not inferred; the §8
records scrub complete; the campaign manifest reading COMPLETE with every gate's verdict filed.
**CI-complete — no device gate is owed.**

**Handoff:** **the plan reviewer** → the test author → the builder → the code reviewer → the coverage
auditor. The adversary is not commissioned again for this slice: the defect it would hunt is the one
already executed in §1, and the fix's own fracture surface is the enumeration named in §12, which is
the reviewer's target.
