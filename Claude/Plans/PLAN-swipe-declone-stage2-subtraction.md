# PLAN — declone Stage 2, step 11: the subtraction pass. Delete the machinery the de-clone made unreachable, and make each unreachability structural rather than argued

Type: plan

<!-- vitruvius-gate {"plan_type":"subtraction",
  "patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":true,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/app.js:113-115","js/app.js:261-266","js/app.js:385-399","js/app.js:425-436","js/app.js:474-487","js/app.js:560-563","js/app.js:594-595","js/app.js:601-617","js/app.js:696-699","js/app.js:766-771","js/app.js:1114-1120","js/app.js:1151-1154","js/nav.js:104-106","js/nav.js:129-130","js/swipe.js:244-277"],
  "callee_ranges":[],
  "affected_contracts":["js/app.js:603","js/nav.js:104","test/swipe-stage5-residuals.test.js:1","tools/mutate.mjs:1","docs/swipe-model.generated.txt:1"],
  "staged_records":["Claude/Plans/PLAN-swipe-declone.md","Claude/Zelda/Board.md","Claude/Zelda/OBSOLESCENCE-CANDIDATES.md","Claude/Decisions/DecisionLog.md"],
  "blocking_questions":["NOGHOSTCLASS","NOOWNEDPANE","NOCLB","MOVERSHAPE","RECOVERYPARITY","DESTROYEDMOVER","PILLSWEPT"]} -->

Status: **PLAN_READY — hand to the plan reviewer.** This plan executes `PLAN-swipe-declone.md` §13
step 11 against the §12 deletion list. It is subordinate to that plan and does not restate it: §12
remains the authoritative inventory, and every row of §4 below cites the §12 item it discharges.

**Why subtract at all, in one sentence.** Every branch that can no longer be reached still audits
clean in isolation, and the defect that opened this campaign was two things each correct alone and
catastrophic together — leftover scaffolding is the machine that manufactures that shape, and
deletion is the only permanent reduction of it.

**What makes this pass different from every other stage in the campaign.** A deletion cannot be
mutation-tested: there is no code left to mutate. So each item below is admitted only on a stated
proof of unreachability, and — for the two that a future edit could silently falsify — the proof is
converted into a **source-scan gate** so that the unreachability is held by structure rather than by
this document. Reachability claims have been wrong four times in this campaign, each backed by a
careful source argument, each settled only by execution.

## Index

1. Defining records and authority
2. *(Applicability — unnumbered heading; the authoring gate matches it literally)*
3. Scope — what is deleted, what stays, what is deferred
4. The deletion set, item by item, with the proof of unreachability
5. The cascade the parent's §12 does not name — the orphan-recovery collapse
6. Contract and seam — the one shape change, and the rule that decides it
7. Lifecycle and ownership — the `owned-pane` kind ceases to exist
8. Test, tooling and generated-record residue
9. What must NOT be deleted, and the measured evidence each carries
10. Coverage Model
11. Sequence, owners and the exit condition
12. Risk registry
13. Decisions this plan settles
14. Deliberately out of scope, with the consumer named

## 1. Defining records and authority

**Verdict: the parent plan, the code review, the coverage audit and the shipped source AGREE on what
remains to be deleted. Two CONFLICTS are declared and resolved below; one GAP is closed.**

| Record | Standing | Reconciliation |
|---|---|---|
| `Claude/Plans/PLAN-swipe-declone.md` §12 (the deletion list) and §13 step 11 | Ratified, FORGE at plan review round 4 | **Governing.** This plan is step 11's execution design. §12 stays the inventory; §4 here adds the per-item proof §12 does not carry, because §12 was written before the code it describes existed. |
| `PLAN-swipe-declone.md` §13 step 11's exit condition — "every item is listed with the reason it is unreachable at step 10's HEAD" | Ratified | **AGREE, and it is the whole shape of §4.** An item that cannot be shown unreachable is not a subtraction and does not appear below. |
| `PLAN-swipe-declone.md` §12 item 14 — "the `nav.js:105` sweep line stays for the NP pill float" | Ratified claim, **falsified by the shipped source** | **CONFLICT, resolved by correcting the citation.** At `js/nav.js` line 105 is the `.nav-ghost` sweep; the `.np-pill-float` sweep is line 106. The retention reason names 105 and describes 106. Line 106 STAYS and is load-bearing (§9); line 105 is a clean deletion (§4 D9). Found independently here and by the code review, which files it as W50 with the same reading. |
| `PLAN-swipe-declone.md` §12 item 15 — "the `owned-pane` filters at `:266`, `:376`, `:688`, `:743`, `:794`" | Ratified, citations against pre-step-10 HEAD | **AGREE on the set, CONFLICT on the count.** Two of the five (`fadePanes` and its `spent` marking) were already deleted in step 10. Four survive at HEAD `b539f71`: `js/app.js:266`, `:396`, `:698`, `:769`. §4 D4/D6/D7/D8 name them by symbol, not by line. |
| `Claude/Mendeleev/AUDIT-swipe-declone-stage2.md` finding **M1** (Structural) — a `browse→browse` mover is a cache-owned node three paths destroy mid-gesture, and no cell drives any of them; **"close it before step 11"** | Ratified audit, verdict ADEQUATE | **AGREE, and it is a precondition.** The intended behaviour is ruled in §7 and the cell is `DESTROYEDMOVER` (§10). The audit is right that step 11 walks precisely this region. |
| `Claude/Mendeleev/AUDIT-swipe-declone-stage2.md` finding **M3** (Gap) — the `CLB` source-text purge gate went out with `test/swipe-stage6d.test.js`; its subject is still live and §12 never listed it. **Owner: the planner** | Ratified audit | **GAP, closed here.** Ruled in §13 decision 3: the gate is still owed and is re-homed into the new purge file as one of three registered tokens (§10 `NOCLB`). |
| `Claude/Poirot/POIROT-swipe-declone-stage2-e1db674.md` watch-list **W44** (a mid-gesture `applyScreen(d, {render:true})` clears both page movers' transforms, unguarded) | Ratified review, open, owner the builder | **AGREE, and it is the same region as M1.** §7 rules that no guard is added by this pass and states why; the coordinate is covered by `DESTROYEDMOVER` as an observation, not repaired. |
| `Claude/Poirot/…-adversary-addendum.md` **A8** — `constructionPlanFor.outgoing` lost its last production consumer, and the exact-key gate cannot see a key with no consumer | Ratified observation, open, owner the planner | **AGREE, and answered in §6 Rule R.** `outgoing` STAYS, with the exemption stated rather than left silent: its consumer is the frozen spec's structural comparison over all eight cases, which executes on every commit. |
| `test/swipe-stage5-residuals.test.js:88-92` — step 10's own note that "the `own` key itself is NOT retired and is still load-bearing — it is what keeps teardown from touching a borrowed-real view. Its remaining owned kind is the NP pill decoration, and the DEC cell … is what observes that disposal" | HEAD source comment, read directly | **CONFLICT, and the comment is FALSE at HEAD.** Nothing keys teardown on `own` except the two `'owned-pane'` filters, and neither can match: `dropPanes` and `disposeOwnedPanes` both compare against `'owned-pane'`, never `'owned-decoration'`, so the pill decoration was never disposed through `own` at all — it is swept by `js/nav.js:106`, which reads a class and not a tag. The comment survived step 10 because it was written about the pane and edited only where the pane was named. It is the strongest single argument for D12, and it is scrubbed with the rest of the residue (§8). |
| `Claude/Poirot/…-adversary-addendum.md` **A6** — `realSetTimeout` / `realSleep` / `mkGhostEnv` in `test/browse-decouple.test.js` have no call sites, and `eslint.config.js:17` ignores `test/**` so nothing catches it | Ratified observation | **AGREE.** Step-10 residue; §8 D16 removes it. |
| `Claude/Loki/STRIKE-swipe-declone-stage2.md` (verdict HELD_STONE) | Ratified strike on the Stage-2 build | **AGREE.** It exercised the recovery under a degenerate mover and found it sound. It did **not** exercise a detached mover or an absent `.nav-ghost` producer, so it is not evidence for this pass; §11 routes a fresh strike at this plan's own promise. |
| `Claude/Zelda/OBSOLESCENCE-CANDIDATES.md` "How to work this list", rule 4 — **"Never batch two removals into one build. Attribution is the whole point."** | Standing working rule | **AGREE, and it decides the Stage A2 question.** §13 decision 5: A2 does not ride along. |
| `Claude/Zelda/OBSOLESCENCE-CANDIDATES.md` §10 — Stage A2's premise-coupling to declone Stage 2, **RESOLVED 2026-08-01** | Ratified record | **AGREE, and it is a reason A2 is UNBLOCKED, not a reason to merge it.** `#browse` keeps its `position: fixed` box, so `PLAN-one-screen-type.md` §5.5 stays true and A2 loses no premise. §13 decision 5. |
| `Claude/Campaigns/swipe-declone-stage2.json` — the `note` field still describes `#browse` becoming `display: contents` and states "THE PLAN WAS NEVER REVIEWED" | Campaign manifest | **CONFLICT.** Both clauses were falsified at `735601d` and by four review rounds. The manifest is not this plan's writable surface; §11 step 8 routes the correction to the assistant with the rest of the records scrub. |
| **GAP, closed** | — | No record stated what happens to the recovery block's ORPHAN branch when the `.nav-ghost` disjunct that is its only entry condition is deleted. §5 closes it: the branch is unreachable and collapses, and three ternaries collapse with it. |

## Applicability

- **boundary_relocation: false** — nothing moves. Every item is removed from HEAD and nothing takes
  its place; no ownership boundary shifts.
- **callee_replacement: false** — no callee is replaced by an indirection. `paneKindOf()` is not
  replaced by a supplier; it and its parameter are removed together (§4 D6).
- **contract_shape: true** — the L3 session mover loses its `own` field, so the shape recorded on
  `d.movers` changes. §6 carries the schema and the rule that decides which fields survive.
- **state_transfer: false** — no state moves between owners. `revealPending` and the capture fields
  are removed, not re-homed, because they have no writer.
- **async_change: false** — no asynchronous surface changes. The settle rAF, the
  `transitionend`/340ms race and the reveal window are untouched. `revealPending`'s removal deletes
  a branch that no longer exists, not an ordering.
- **persistence_migration: false** — nothing here is persisted.
- **lifecycle_ownership: true** — the `owned-pane` ownership kind ceases to exist, taking one
  disposal path (`disposeOwnedPanes`), one teardown (`dropPanes`) and one supersession predicate
  (`paneLess`) with it. §7.

## 3. Scope — what is deleted, what stays, what is deferred

**DELETED.** Twelve source items in `js/app.js` and `js/nav.js` (§4 D1–D12), the test and tooling
residue that has no subject left (§8), and one stale set of generated inventories. Every one is
listed with the reason it is unreachable at HEAD `b539f71`.

**ADDED — one file, and it is not new scope.** `test/retired-concepts-purge.test.js` (§10). Three
of this pass's deletions rest on "no first-party source produces X". That is a claim a future edit
can falsify silently, and this project's standing law is that a rule enforced by memory is
vigilance. The file converts three such claims into one mechanical scan, and it simultaneously
discharges the coverage audit's M3, which is owed independently of this pass.

**STAYS.** Everything in §9, and everything §12 already lists as not deleted. In particular: the
whole reveal diagnostic apparatus except the three capture fields that have no writer; the
`.np-pill-float` sweep; `mover.ownership` at the classification seam; `constructionPlanFor.outgoing`;
`gestureOwnsMovers`; the row hold and every session-identity guard; all of `#nowplaying`.

**DEFERRED, with the consumer named** — §14. In summary: W46 (the same-key `browse→browse` mover
collision) is a correctness question and must not be folded into a pass that changes no behaviour;
A7 (`sourceEl` ignores its `v` argument on the `browse-page` branch) is a contract-accuracy defect
whose fix is a signature change; M5 (mechanise the designated-killer check in the mutation sweep) is
tooling; A9 (the read-after-`applyScreen` invariant on a throwing path) is a comment correction the
code review already owns.

## 4. The deletion set, item by item, with the proof of unreachability

**How to read the Proof column.** A grep is evidence for a *textual* name and nothing else. Where a
symbol could be reached dynamically, through a string, or via a computed property, the proof states
the *value* argument instead, and — where a future edit could falsify it — names the gate that holds
it. Line numbers are against HEAD `b539f71` and are given as an aid; every item is identified by
**symbol**, because line numbers move.

| # | §12 item | What goes | Proof it is unreachable |
|---|---|---|---|
| D1 | 11 | `env.scrollY` supplier, `js/app.js:562` | `env` is a plain object literal built at one call site and consumed only inside `js/swipe.js`'s `buildConstruction` and `paneBuilders`. Those two functions read `env.document`, `env.navPill`, `env.sourceEl`, `env.renderDestination` and nothing else — the whole module is 283 lines and contains no other `env.` read. Complete because the consumer set is one module. |
| D2 | 12 | The capture-recording block, `js/app.js:607-617` | **A value proof, not a grep.** `buildConstruction` returns the two-key literal `{ decorations, movers }` (`js/swipe.js:276`) and there is exactly one `return` in the function. `capture` is not a key, so `if (c.capture)` is constant-false on every path. |
| D3 | 12 | The capture diagnostic readers: `ghostDiff` (`js/app.js:1003-1004`), `cover.ghostY` (`:1064`) and the `ghostY=` token in the scroll trail (`:1015`) | With D2 there is no writer of `d.ghostY` / `d.animSync` / `d.animRes` anywhere in `js/`. Each reader is a `== null ? '?' : …` that now prints a constant `?`. A diagnostic field with one constant value is not a measurement. |
| D4 | 13, 15 | `dropPanes` (`js/app.js:698`) and its sole call (`:1115`) | Its loop body is guarded by `m.own === 'owned-pane'`, which D8 proves can never match. |
| D5 | 13 | `revealPending` (`js/app.js:697`) and `endOwnership`'s guard (`:1153`), which collapses to `sessionDone(cur)` | The identifier occurs exactly twice in `js/`: the `let … = false` declaration and the read. **There is no assignment**; both held branches that set it were deleted in step 10. A `let` with no writer is a constant. |
| D6 | 15 | `paneKindOf` (`js/app.js:768-771`), `watchFrames`'s `paneKind` parameter and the `pane=` token in its FLASH line | D8 makes the filter empty, so the function returns the literal `'none'` on every call. **This changes a device-log line's format** and is called out as such in §12's terms rather than done silently — see the note below this table. |
| D7 | 15 | `disposeOwnedPanes` (`js/app.js:385-399`) and its call (`:480`) | Its loop is `own === 'owned-pane'`-filtered (D8), so `disposed` never becomes true and the `pane disposed reason=` diagnostic never fires. The function is a no-op with a log line that cannot be emitted. |
| D8 | 15 | `paneLess` (`js/app.js:266`); `begin()`'s gate collapses to `if (finishing && !session) return;` | **The load-bearing proof of this pass.** `d.movers` has exactly one producer: `toMover` over the three movers `buildConstruction` returns (`js/app.js:603-605`). `buildConstruction` calls `mover(...)` in exactly three places and passes `'borrowed-real'` twice (`js/swipe.js:251`, `:260`) and `'owned-decoration'` once (`:265`). There is no fourth call and no computed ownership value. `'owned-pane'` therefore has no producer. **Held structurally by `NOOWNEDPANE`** (§10), because "no producer" is exactly what a later edit can falsify. |
| D9 | 14 | The `.nav-ghost` surfaces: the `.spent` sweep (`js/app.js:428`), the recovery predicate's disjunct (`:435`), the `ghosts=` diagnostic token (`:595`), and the sweep at `js/nav.js:105` | The sole producer of the class was `ghostWrap`, deleted in step 10. No first-party file writes `nav-ghost` to a `className`, `classList` or `class` attribute; the class survives at HEAD only in these four readers and in comments. `.spent` was written only by `fadePanes`, also deleted in step 10. **Held structurally by `NOGHOSTCLASS`** (§10). |
| D10 | — *(the cascade §12 does not name)* | The ORPHAN branch of `begin()`'s recovery, and the three ternaries that exist only to serve it | §5. |
| D11 | 14 | `keepGhosts`: `js/app.js:114`, the `applyScreen` option at `:482`, the `js/nav.js:104` parameter and the `js/nav.js:129` argument. ⛔ `js/nav.js:106` STAYS | With D7 there is no owner-driven disposal for the parameter to complement, and with D9 there is no `.nav-ghost` sweep for it to suppress. §12 item 14's retention clause cites the wrong line; §9 states what line 106 actually carries. |
| D12 | — *(consequence of D4/D6/D7/D8)* | `own` on the L3 mover: `js/app.js:603` becomes `({ el: m.element, base: baseOf(m.slot) })` | After D4/D6/D7/D8 the four `.own` readers in `js/` are gone and no reader remains, in production or in a gate. §6 Rule R. |

**On D9 and the start diagnostic.** The `SWIPE start` line at `js/app.js:595` loses only its
`ghosts=${…}` token. The session fields on that same line — `d.dir`, `d.from` and `d.dest` — are
read, not written, and are untouched by every item here; they are named so the declared range is
accounted for rather than silently trusted.

**On D6 and the device log.** The FLASH line is an instrument the user reads on device, and this
project's standing scar is that an instrument must be validated before its silence is trusted. Two
admissible forms: keep the token and pass the literal `'none'`, or drop the parameter and the token.
**Recommended: drop both.** A field that is constant on every line invites the reader to ask what a
non-`none` value would have meant, and there is no longer an answer. The change is named in the
build log and in the board so a future reader of an older device log knows why the token stops
appearing; it is not an invariant, so no cell holds it.

## 5. The cascade the parent's §12 does not name — the orphan-recovery collapse

`begin()`'s recovery entry predicate is `if (d || document.querySelector('.nav-ghost') || (finishing
&& session))` (`js/app.js:435`). Inside the block, `const cur = d || session` (`:474`) is null on
**exactly one** entry route: when the `.nav-ghost` disjunct was the only true one. D9 deletes that
disjunct, so `cur` is non-null on every reachable entry, and three expressions written to serve the
null case become constant:

| Expression at HEAD | Collapses to | What the orphan value was for |
|---|---|---|
| `resetSwipeStyles(cur ? true : undefined)` | *(the whole call goes with D9/D11 — the sweep it suppressed no longer exists)* | keep the full sweep when no session owns the pane |
| `applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined })` | `applyScreen(currentDesc(), { render: false, resetScroll: false })` | `resetScroll: undefined` kept `js/nav.js`'s default `true`, so an orphan hard reset on a home source still scrolled to top — pre-Stage-6a parity, the code review's F1 |
| `if (cur) window.scrollTo(0, cur.scroll0)` | `window.scrollTo(0, cur.scroll0)` | an orphan has no session-start scroll to restore |

⛔ **This is the single most dangerous edit in the pass, and it is dangerous in one specific
direction.** If `.nav-ghost` is reachable after all, the collapsed form changes `resetScroll` from
default-`true` to `false` on that path — a live behaviour change, invisible to every cell, on the
exact axis (`#home`'s scroll on a reveal) this campaign has already shipped a defect on. The
argument that it is unreachable is a reading, and readings about reachability have been wrong four
times here.

**Therefore the collapse is admissible only behind `NOGHOSTCLASS`**, which turns the reading into a
structure: no first-party source may write the class, so the branch cannot be re-armed by an edit
that does not also redden a gate. The gate lands in the same commit as the collapse — not before,
because at HEAD it would be a gate with nothing to guard, and not after, because a commit that
collapses the branch without it ships an argument where a structure was owed.

**Residual, stated rather than guarded.** The gate is textual. A `.nav-ghost` element injected by a
non-first-party surface, or by a class name assembled at runtime from fragments, is outside it. No
such surface exists at HEAD; the honest form of the claim is "this class cannot re-enter by the
routes source text can see", which is the same limit `NOAPPCLONE`'s own header already states.

## 6. Contract and seam — the one shape change, and the rule that decides it

**The change, as a signature.**

```
// js/app.js, start(), the L3 adapter
toMover : { element, ownership, slot } -> { el, base }      // was: -> { el, base, own }
```

The classification seam is **unchanged**: `buildConstruction` keeps returning `{ decorations, movers
}` and each mover keeps `{ element, ownership, slot }`.

```vitruvius-contract
# field | class
el | element reference
base | number
own | DELETED field
ownership | string enum retained at the seam
outgoing | string constant retained on constructionPlanFor
```

**Rule R — stated once, applied three times.** *A field survives this subtraction if and only if a
consumer READS it at HEAD after the pass: a production reader, or a gate that executes on every
commit. A field whose only prospective reader is a future stage does not survive.*

| Field | Reader after the pass | Ruling |
|---|---|---|
| `mover.ownership` (seam, `js/swipe.js`) | `NOGHOSTATALL` (`test/swipe-declone-stage2-construction.test.js`) asserts no mover carries `'owned-pane'`, over all eight structural cases | **STAYS.** It is the subject of the gate that structurally replaces every branch this pass deletes. Removing the tag would delete the gate's subject and trade a structural defence for a cosmetic one. |
| `constructionPlanFor.outgoing` | the frozen spec `test/fixtures/swipe-plan-spec.mjs`, compared structurally over all eight cases | **STAYS, as a stated exemption** — this is A8's answer. `outgoing` is a constant at HEAD and has no production reader; its consumer is the project's transition oracle, which executes on every commit. The exemption is recorded here because A8 is right that the exact-key gate cannot see a key with no consumer, so silence would leave the rule unenforced exactly where it was newly stressed. |
| `mover.own` (L3, `js/app.js`) | **none** — the four `.own` readers go with D4/D6/D7/D8, and no gate asserts over it | **DELETED (D12).** |

⛔ **The one record that says otherwise is wrong, and its wrongness is the argument.**
`test/swipe-stage5-residuals.test.js:88-92` states that `own` "is what keeps teardown from touching a
borrowed-real view" and that its remaining owned kind is the pill decoration. Both clauses are false
at HEAD: the only two readers of `own` compare against `'owned-pane'`, so an `'owned-decoration'`
mover was never disposed through the tag, and the pill float is swept by `js/nav.js:106` on a class,
not a tag. `own` has been decorative since the pane went; D12 removes a field whose stated
justification does not survive reading it.

**Compatibility (U10).** ⚠️ There is **no** surviving key-completeness cell to migrate — the `F1a-L3`
cell that pinned `toMover`'s key set was **deleted in step 10** (`test/swipe-stage5-residuals.test.js:80-86`
retains only its retirement note), on the correct ground that its fixture required a built pane.
`MOVERSHAPE` is therefore a **new cell**, and its layer is chosen accordingly: the app harness over a
real gesture, because the fake-env construction layer never executes `toMover`. The nearest survivor,
`test/swipe-construction.test.js`'s `F1.1`, asserts the *external* mover does not emit the production
keys — a different subject, kept, with a wording correction where it names `own` as a production key.
`js/nav.js`'s `resetSwipeStyles` loses a parameter; `test/np-hidden-writer-set.test.js`
mentions `opts.keepGhosts` in prose only and asserts nothing about it, so it needs a wording
correction and no assertion change. `docs/swipe-model.generated.txt` and
`docs/transition-matrix.generated.txt` are regenerated in the same commit.

## 7. Lifecycle and ownership — the `owned-pane` kind ceases to exist

Before Stage 2 a swipe could **create** a full-viewport pane it owned, hold it across the settle, and
**dispose** of it on three routes. After Stage 2 no transition constructs one. This pass removes the
kind itself, and with it one predicate, one disposal path and one teardown.

| Concern | Before | After this pass |
|---|---|---|
| **Create / construct / acquire** | `ghostWrap` built a `.nav-ghost` pane; `toMover` tagged it `owned-pane` | No producer. Both view movers are **borrowed** real elements the gesture does not own; the one decoration is an owned `.np-pill-float`. |
| **Borrow** | `borrowed-real` movers were borrowed for the gesture's life | Unchanged, and now the only view case. The borrow is what makes an abort free. |
| **Mutate** | the gesture wrote `transform` / `transition` / `willChange` on every mover | Unchanged. |
| **Release** | `endOwnership` deferred `sessionDone` when a held reveal kept a pane alive | `sessionDone(cur)` unconditionally (D5). No path defers ownership any more. |
| **Dispose / destroy** | `disposeOwnedPanes` on supersession, `dropPanes` at finalize, the DOM-global sweep as a backstop | All three removed (D4, D7, D9). The one owned resource left, the pill decoration, is swept by `js/nav.js:106` via `applyScreen`, which is unchanged and is the only sweeper it ever had. |
| **Failure / error** | a throwing `runFinalize` left the row hold to the `finally` | Unchanged. The `finally` still runs `dropRowHold()` and `endOwnership()`; only `endOwnership`'s guard collapses. |

**M1 — what a mid-gesture destruction of a mover must do. RULED: nothing new.** The invariant is
already this project's, stated at `test/swipe-gesture.test.js:24-25` — *a gesture must settle even
when the DOM it started on is destroyed mid-drag; the gesture does not own that node and must not
depend on it.* Stage 2 widened the set of destructible non-owned nodes from `{touch target}` to
`{touch target, outgoing mover, incoming mover}`, and the correct response is to widen the **cell**,
not to add a guard. The shipped code already satisfies it: a detached mover receives inert style
writes; `Nav.resetSwipeStyles`'s document query cannot reach it and does not need to, because a
detached node paints nothing; the `transitionend` listener on a detached anchor never fires and the
340ms `settleTimer` is the backstop that already exists for exactly that; `sessionDone` runs from the
`finally`. **No guard is added**, and `gestureOwnsMovers` is deliberately not extended to the refresh
handlers — that is the code review's W44, a pre-existing class with its own owner, and folding a
behaviour change into a no-behaviour-change pass is how attribution is lost.

**Residual, named.** A destruction landing between the outgoing resolution (`Browse.pageElFor(d.from)`)
and the destination render inside one synchronous `buildConstruction` call would throw at the seam.
Nothing runs between them that can call `Browse.clearCache()`, so it is unreachable at HEAD; it is
recorded because `DESTROYEDMOVER` does not drive it.

## 8. Test, tooling and generated-record residue

**Rule, inherited from §12 item 27:** an assertion about the *classification* survives and changes
value; an assertion about the *pane* is deleted. A third case this pass adds: an assertion that has
become **vacuous** — one that can no longer fail because its subject cannot exist — is deleted, not
kept as reassurance. A cell that cannot fail is a false witness, and this campaign has filed that
finding four separate times.

| # | Surface | Disposition |
|---|---|---|
| D13 | `tools/mutate.mjs` — **de-registered by NAME:** `swipe6e DP/attribution: disposeOwnedPanes' own filter never matches…`, `swipe6e BR: disposeOwnedPanes broadens to remove every mover…`, `swipe6e DEC: the .np-pill-float decoration removal is mistakenly guarded behind keepGhosts…`, `swipe6e HR: the recovery keeps ghosts on the ORPHAN branch too…`, `r223 4: endOwnership clears at finalize, ignoring revealPending…`, `stage6a F1: orphan sub-case forces resetScroll:false, dropping home scroll-to-top…`, `stage6i SCOPE: the commit→home held-reveal branch is reinstated…` | Each names a subject this pass deletes. ⛔ `stage6i SCOPE` is **already broken at HEAD** and its removal is a repair, not a loss: its replacement text calls `holdGhostUntilPaintable`, deleted in step 10, so the mutant now produces a `ReferenceError` and would be recorded CAUGHT for the wrong reason. Recorded because a mutant that reddens for the wrong reason is indistinguishable from a working one in the sweep output. |
| D13b | `tools/mutate.mjs` — **re-anchored, NOT dropped:** `swipe: begin() stops hard-resetting a superseded session (-> I2/I20 pane test)` | Its subject — that `begin()` hard-resets leftover state — survives the collapse. Only its anchor text changes. |
| D13c | `tools/mutate.mjs` — **kept unchanged:** `S2-23 NOGHOSTATALL: the app-ghost branch is re-added for browse->browse…` | It mutates `js/swipe.js` and reddens a fake-env unit cell; nothing in `js/app.js` is on its path. |
| D14 | **Cells deleted:** all of `test/swipe-stage6e.test.js` (`DP.browse-home`, `BR`, `HR`, `DEC` — every one's subject is `disposeOwnedPanes`, the orphan branch, or the `keepGhosts` guard); `test/swipe-stage6.test.js`'s `OB` and `OB-home`; the `.nav-ghost` sweep cell in `test/nav.test.js`; `test/swipe-stage5-wiring.test.js`'s `F2-r WIRING` cell | ⛔ `OB-home` is the only cell proving `resetScroll` defaults to `true` on the orphan path (pre-6a parity). It is deleted because the path is deleted, and that is admissible **only** because `NOGHOSTCLASS` holds the path unreachable. This is the one place in the pass where a deletion removes a witness rather than a redundancy, and it is named so the coverage audit does not have to rediscover it. |
| D15 | **Vacuous assertions removed:** the `ghosts(h) === 0` helper and its uses in `test/swipe-stage6c.test.js` (three), `test/swipe-invariants.test.js`, `test/swipe-stage5-residuals.test.js` and `test/swipe-stage6.test.js` | Each asserts a count that is now zero by construction. `test/swipe-construction.test.js`'s `.nav-ghost` assertions are **kept**: they run against the SEAM with a fake document, where the seam could still mount one, so they are not vacuous. |
| D16 | `test/browse-decouple.test.js` — `realSetTimeout`, `realSleep`, `mkGhostEnv` | Addendum A6. No call sites; `eslint.config.js:17` ignores `test/**`, so nothing else catches it. |
| D16b | **Comment scrubs, in the same commit:** `test/swipe-stage5-residuals.test.js:88-92` (the false "`own` is still load-bearing" note — §1, §6); `test/swipe-construction.test.js:160-168` (names `own` as a production key); `js/app.js:401-407` and `:600-601` (describe a capture recipe and a three-valued `own` that no longer exist) | A comment that describes a deleted mechanism is the same defect as the mechanism, one layer out, and the first of these is a record that actively contradicts D12. |
| D17 | `docs/swipe-model.generated.txt`, `docs/transition-matrix.generated.txt` | Regenerated in the same commit. Generated inventories that describe deleted branches are the cheapest form of the same defect this pass exists to remove. |

**The mechanical closure for D13.** `test/mutation-anchors.test.js` fails when a registered `from`
no longer occurs in its target file, so an anchor left behind reddens rather than rotting silently.
That gate — not this table — is the completeness check: the table names the mutants so the builder
knows what to expect, and the gate proves none was missed. After the pass, run the full sweep, not
only the anchors gate: an anchor can still match while its mutant has stopped biting.

## 9. What must NOT be deleted, and the measured evidence each carries

Before every deletion, the question is what measured evidence would go with it. These read
vestigial and are not.

| Kept | Why, and what would be lost |
|---|---|
| `js/nav.js:106` — the `.np-pill-float` sweep | **The retained `npPillClone` is the one owned resource left.** This line is its only sweeper on the recovery path, and it is *unguarded* by `keepGhosts` on purpose — that is what the deleted `DEC` mutant proved. Removing it with the `keepGhosts` machinery would leak a floating pill clone on every superseded Now Playing swipe. §12 item 14's retention clause is about this line and cites the wrong one. |
| `mover.ownership` at the seam | Rule R. It is `NOGHOSTATALL`'s subject. |
| `constructionPlanFor.outgoing` | Rule R, stated exemption (A8). |
| `cover.marks` / `mark()` / `cover.writes` / the `window.scrollTo` recorder | The live instruments for R5, the **still-open** repaint-on-abort symptom. They read constant only if the symptom is gone, and nothing has established that. |
| `snapBrowse` / `survivors` / `revealBase` / `stampGen` | Row-identity measurement — the one thing that separates "the page was rebuilt" from "the page was preserved". Two device logs were read wrongly before it existed. |
| `watchFrames` itself | Only its `paneKind` parameter goes (D6). The frame-gap sampler is the objective flash detector; it is what stopped the user being the instrument. |
| `gestureOwnsMovers` (`js/app.js:250`) | Reads `session.live`, not `own`. Untouched by every item here, and its predicate's exact form is an executed counterexample's fix. |
| `NOAPPCLONE`'s exception 1 and its rot check | The permanent registered exception for the pill clone, plus the mechanism that makes a stale registration fail. |
| `test/swipe-gesture.test.js`'s destroyed-touch-target cell | The sibling invariant `DESTROYEDMOVER` extends. Deleting or merging it would collapse two coordinates into one. |
| `PARKLOSESTRANSFORM`, `PARKBOXEQUAL`, `.parked { overflow: hidden }`, `#home.parked`'s `-101vw` | Not on any list here, and named because they are the campaign's standing scar: `overflow: hidden` is load-bearing on two measured grounds, and `#home.parked`'s distance is correct precisely because `#home` is `position: fixed`. Nothing in this pass touches `css/`. |

## 10. Coverage Model

**A deletion's Coverage Model is inverted, and the model says so.** For each item, one of three
things is true: (a) an existing cell already witnesses the behaviour that must survive; (b) the
deletion is textual and is gated by a source-scan cell, because a future edit could falsify the
reachability argument; or (c) nothing witnesses it and that is a named risk. **No cell here merely
asserts that code is absent** unless something depends on its absence — the three purge cells exist
because §5's collapse and §7's ruling *do* depend on it.

```vitruvius-coverage
# id | behavior | fixture | mutation | layer
NOGHOSTCLASS | no first-party script under js/ writes the retired ghost class to a className or classList or class attribute, so the recovery branch that only that class could arm cannot be re-armed by an edit | gate scan every js file excluding the vendored bundle for a class write whose value contains the retired token, by the same resolution rules the view-clone gate already uses, and fail naming file and line; the fixture must first PROVE it can fire by scanning a synthetic source that contains the write | ADDITIVE inject a class write of the retired token into an existing first-party file so the derived set gains a site and the gate reddens; expected killing cell NOGHOSTCLASS | gate source scan over first-party js
NOOWNEDPANE | the retired owned-pane ownership literal occurs nowhere under js/, so no mover can be tagged with an ownership kind for which no teardown path remains | gate scan every js file excluding the vendored bundle for the retired ownership literal and fail naming file and line; paired in the same file with the fire-drill precondition so a scan that matches nothing is distinguished from a scan that cannot match | ADDITIVE inject the retired ownership literal into an existing first-party file; expected killing cell NOOWNEDPANE | gate source scan over first-party js
NOCLB | the two retired clobber identifiers from the stage that removed the runtime build-side-effect byproduct occur nowhere under js/, closing the coverage audit finding that their purge gate was deleted with its file while its subject stayed live | gate the same scan as the two cells above with the two retired identifiers as its registered tokens; the registration list is checked for rot so a token that is no longer meaningful must be removed deliberately rather than left | ADDITIVE inject one of the two retired identifiers into an existing first-party file; expected killing cell NOCLB | gate source scan over first-party js
MOVERSHAPE | the production mover object the adapter records on the session carries exactly the element reference and the base offset and no third key so a dropped or an orphaned key cannot ship silently | integration drive a real gesture on the app harness and assert the recorded mover key set equals exactly the two-key set by deep comparison rather than by presence checks; it must run at the harness layer and not at the fake-env construction layer because the fake-env layer never executes the adapter mapping at all, which is why the retired key-completeness cell needed a built pane to observe anything | TWO mutants. NATURAL-a the adapter re-adds the retired ownership key so a field with no reader ships again. NATURAL-b the adapter drops the base key so the incoming mover has no offset. expected killing cell for BOTH is MOVERSHAPE | integration app harness over the real adapter
RECOVERYPARITY | the collapsed leftover-state recovery does exactly what the surviving branch did before the collapse namely suppress the screen reset restore the session-start scroll and release the hold in that order for every entry route that still exists | integration boot the app harness and drive the three surviving entry routes namely a mid-drag second touch and a settling session superseded before finalize and a live drag interrupted by a nav tap and assert for each that the source screen is restored without a re-render that the session-start scroll is written exactly once and that the row hold is released after the screen is applied | THREE mutants. NATURAL-a the collapsed call passes the default screen reset so the recovery scrolls the destination to top. NATURAL-b the session-start scroll restore is dropped. NATURAL-c the hold release is moved ahead of the screen application which dematerializes the kept rows. expected killing cell for ALL THREE is RECOVERYPARITY | integration app harness over the real recovery
DESTROYEDMOVER | a live browse to browse gesture whose two movers are destroyed mid drag by a cache clear still settles leaves no page carrying an inline transform and releases the session so the next touch does not trip the leftover-state hard reset | integration boot the app harness with the real browse renderer and fake timers drive a browse to browse past the direction lock so both movers carry inline transforms then clear the page cache the way the reconnect handler does then advance past the settle and the finalize and assert a settle line was emitted that no page in the document carries a non-empty inline transform and that the active session reads null | THREE mutants one per destruction route. NATURAL-a the page push is dropped from the style reset so a surviving page keeps its transform. NATURAL-b the container wipe route is driven instead of the cache clear. NATURAL-c a mid-gesture screen application with rendering enabled is driven instead. expected killing cell for ALL THREE is DESTROYEDMOVER | integration app harness with the real browse renderer
PILLSWEPT | the transient now playing pill decoration is still removed by the style reset after the ghost-sweep parameter is deleted so the one owned resource the swipe still creates cannot leak | unit drive the real style reset against the real index fixture with a pill float node present and assert it is removed and separately assert the reset is declared with no parameters so no caller can re-introduce a conditional on it | TWO mutants. NATURAL-a the pill float sweep line is deleted alongside the ghost sweep line which is the exact defect the parent plan's mis-cited retention clause invites. NATURAL-b the reset regains a parameter and guards the pill sweep behind it. expected killing cell for BOTH is PILLSWEPT | unit nav reset against the real fixture
```

**Seven cells, seventeen mutants.** Every one asserts a **source fact, a key-set fact, a class-state
fact, a call-count fact or a DOM-identity fact** — never a rendered geometry, for the same reason the
parent plan's §14 gives: jsdom has no layout, paint or scroll anchoring, so a geometry cell here
could not fail.

**Items with no cell, and why that is correct rather than a gap.**

| Item | Why no cell |
|---|---|
| D1, D2, D3 | The behaviour that must survive is *nothing* — these are a supplier with no reader and a diagnostic with a constant value. A cell asserting their absence would depend on nothing. The suite's existing FLASH-line cells prove the line still forms. |
| D4, D5, D7 | Their subjects were no-ops before the deletion, so no behaviour changes and no witness can distinguish before from after. `NOOWNEDPANE` covers the only way they could become live again. |
| D6 | A device-log format change, not an invariant. §4's note records it; nothing depends on it. |
| D12 | Covered by `MOVERSHAPE`, which is a migration of an existing cell rather than a new assertion. |
| D13–D17 | Held by the existing anchors gate and by the full mutation sweep, which is the mechanical completeness check §8 relies on. |

**The purge file's own hazard, stated because this project has been bitten by it.** A gate that
names its own forbidden token in a scannable form greens a dirty tree by matching itself, and a
counting shell idiom can exit nonzero while printing zero. The file must therefore exclude itself by
**file identity**, not by a path pattern, and every one of its failure paths must be **driven and
observed to fire** before it is accepted — a fire drill against a synthetic source that contains each
token. Writing an assertion whose failure path is never executed is the defect being repaired.

## 11. Sequence, owners and the exit condition

**No step depends on a later one.**

| # | Step | Owner | State |
|---|---|---|---|
| 1 | Stress this plan; verdict forge / temper / scrap. | the plan reviewer | open |
| 2 | ⛔ **`PLAN-swipe-declone.md` §13 step 10b — the device gate on the shipped Stage-2 form — PASSES.** Not yet run: there is no device verdict for this campaign in `Claude/Zelda/`. | the user | **open, and it gates everything below** |
| 3 | Strike this plan's promise: **"every item in §4 is unreachable at HEAD, and the §5 collapse changes no behaviour."** Aim at the reachability claims, not at the deletions. | the adversary | open |
| 4 | Close coverage-audit **M2** — the `pageElFor` throw cell and its `keyFor` sibling negative. Independent of this pass and owed either way. | the test author | open |
| 5 | Author the seven §10 cells red-first, with the purge file's fire drill run and recorded. `MOVERSHAPE` is a migration of the existing key-completeness cell, not a new file. | the test author | open |
| 6 | **The subtraction — ONE commit.** D1–D17 together, plus the purge file, plus both regenerated inventories. Bump the build. The frozen spec, the anchors gate and every mutation anchor whose target text goes are edited in the SAME commit; their rot checks redden otherwise. | the builder | open |
| 7 | **Device re-confirm** (`PLAN-swipe-declone.md` §13 step 11b): `browse→browse` commit and abort, plus the four Stage-1 transitions. Short, and run anyway — the form device-tested is the form that ships, and this commit changes the shipped form even where it cannot change behaviour. | the user | open |
| 8 | Review the commit; audit the suite; then the records scrub — this plan's status, the parent's §12/§13, the campaign manifest's falsified `note`, the board, the decision log. | the code reviewer, then the coverage auditor, then the assistant | open |

**Why step 2 gates step 6, stated as a cost rather than as ceremony.** If the device gate on the
shipped Stage-2 form fails, the cheapest repairs available are precisely the branches this pass
deletes — the abort re-render and the held reveal. Deleting them first does not make the repair
impossible, but it converts a revert into a re-derivation, and the standing precedent is a stage that
shipped to the device with three gates unrun and cost days to clean up.

**Exit condition.** Every §4 and §8 item is gone from HEAD; each was admitted on a stated proof; the
three purge cells are green and each has been observed to fire; the full suite and the full mutation
sweep are clean with no `*.mutbak` in the tree; both generated inventories agree with source; and the
build number moved.

## 12. Risk registry

- **R1 — the `.nav-ghost` reachability argument is wrong, and the §5 collapse silently inverts
  `resetScroll` on the orphan path.** The highest-consequence risk in the pass, on the exact axis
  (`#home`'s scroll at a reveal) this campaign has already shipped a defect on. Mitigated
  structurally by `NOGHOSTCLASS` and prosecuted by step 3. Residual: a class name assembled at
  runtime, which no textual gate can see.
- **R2 — a deleted cell was the only witness of a behaviour that SURVIVES.** The pass deletes roughly
  ten cells. `OB-home` is the known instance and is named in §8; the unknown instances are what the
  coverage auditor's per-assertion account is for, and that account has caught this class once
  already this campaign.
- **R3 — step 6 runs before step 2 and destroys the rollback surface.** Addressed by ordering, and by
  saying the cost out loud: this is a sequencing risk, not a technical one, so it fails by being
  convenient rather than by being hard.
- **R4 — a mutant is de-registered whose subject actually survives.** The anchors gate proves an
  anchor still matches; it does not prove the mutant still bites. Step 6's exit requires the **full
  sweep**, not the anchors gate alone.
- **R5 — the purge gate is written so it cannot fire.** Four recorded ways to green a dirty tree,
  including a gate that spells its own forbidden token. Addressed by the fire drill in §10 being an
  acceptance condition rather than a suggestion.
- **R6 — the device-log format change (D6) is noticed later as a regression.** Low, and cheap to
  avoid: named in the build log and on the board in the same commit.

## 13. Decisions this plan settles

1. **`mover.own` at L3 is deleted; `mover.ownership` at the seam is retained.** Rule R (§6): a field
   survives if a production reader or a per-commit gate reads it. `ownership` is `NOGHOSTATALL`'s
   subject; `own` has no reader after the pass.
2. **`constructionPlanFor.outgoing` is retained as a stated exemption** to the no-dead-fields rule,
   its consumer being the frozen spec's structural comparison. This answers addendum **A8**, whose
   point was that silence leaves the rule unenforced exactly where the change stressed it.
3. **The retired-concept purge gate is still owed and is re-homed**, closing coverage-audit **M3**,
   with the two clobber identifiers joining the two tokens this pass retires — one file, three
   registered claims, one rot check.
4. **A mid-gesture destruction of a mover requires no new guard** (coverage-audit **M1**): the
   invariant is the project's existing one and the shipped code already satisfies it; what is owed is
   the cell, not the guard. `gestureOwnsMovers` is deliberately not extended to the refresh handlers
   — that is W44, with its own owner.
5. **Stage A2 does not ride along with this pass.** Its premise-coupling to declone Stage 2 was
   resolved on 2026-08-01, which makes A2 *unblocked*, not *merged*. Three reasons: the standing
   working rule is that two removals are never batched into one build, because attribution is the
   whole point; A2's discriminator is a device observation about settings stacking, and step 7's is a
   device observation about swipes, so batching them puts two independent variables into one session;
   and batching does not reduce churn — a failed gate then costs two rollbacks instead of one.
6. **`PLAN-swipe-declone.md` §12 item 14's retention clause cites the wrong line.** The `.np-pill-float`
   sweep is `js/nav.js:106`; line 105 is the `.nav-ghost` sweep and is a clean deletion. The parent
   plan is corrected at step 8, not here.

## 14. Deliberately out of scope, with the consumer named

- **W46 / addendum F2 — a same-key `browse→browse` pair resolves both mover slots to one node.**
  Owner: the planner. A correctness question with a behaviour change as its fix; folding it into a
  pass that changes no behaviour would make the device re-confirm unattributable. The consumer that
  would need it is a browse page carrying a link back to its own key; the frozen spec asserts the
  pair is reachable, so the question is live and needs its own plan.
- **Addendum A7 — `sourceEl`'s `'browse-page'` branch ignores its `v` argument.** Owner: the planner.
  Its fix is a signature change at the seam (pass the descriptor, not the name), which is contract
  work, not subtraction. Consumer: the recipe-layer fake, which today cannot reproduce production for
  parameterised pages.
- **Coverage-audit M5 — mechanise the designated-killer check in the mutation sweep.** Owner: the
  planner, as tooling. This pass has an interest (it re-registers a lot of mutants) but the change is
  to `tools/mutation-sweep.mjs`, not to the swipe.
- **Addendum A9 — the read-after-`applyScreen` invariant holds only on non-throwing paths.** A
  comment correction; the code review already owns it.
- **`text-size-adjust`, the additive-overlay premise, the two disagreeing host vocabularies.** Named
  in the parent plan's §17 as deliberately not acted on. Unchanged.
