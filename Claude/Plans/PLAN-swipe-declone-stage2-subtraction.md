# PLAN — declone Stage 2, step 11: the subtraction pass. Delete the machinery the de-clone made unreachable, and make each unreachability structural rather than argued

Type: plan

<!-- vitruvius-gate {"plan_type":"subtraction",
  "patterns":{"boundary_relocation":false,"callee_replacement":false,"contract_shape":true,"state_transfer":false,"async_change":false,"persistence_migration":false,"lifecycle_ownership":true},
  "project_adapter":"tomeroam-js-dom",
  "source_ranges":["js/app.js:113-115","js/app.js:261-266","js/app.js:385-399","js/app.js:425-487","js/app.js:560-563","js/app.js:594-595","js/app.js:601-617","js/app.js:693-699","js/app.js:718-726","js/app.js:761-771","js/app.js:1114-1120","js/app.js:1151-1154","js/nav.js:104-106","js/nav.js:129-130","js/swipe.js:203-210","js/swipe.js:244-277"],
  "callee_ranges":[],
  "affected_contracts":["js/app.js:603","js/nav.js:104","test/swipe-stage5-residuals.test.js:1","test/swipe-model.test.js:36","tools/gen-swipe-model.mjs:69","tools/source-gate-sweep.mjs:64","tools/fuzz-ui.js:54","tools/mutate.mjs:1","docs/swipe-model.generated.txt:1"],
  "staged_records":["Claude/Plans/PLAN-swipe-declone.md","Claude/Zelda/Board.md","Claude/Zelda/OBSOLESCENCE-CANDIDATES.md","Claude/Decisions/DecisionLog.md"],
  "blocking_questions":["NOGHOSTCLASS","NOOWNEDPANE","NOCLB","MOVERSHAPE","RECOVERYPARITY","DESTROYEDMOVER","PILLSWEPT"]} -->

Status: **COMPLETE — built, reviewed and audited; every campaign gate green.** Steps 1-6 and 8 are discharged (`Claude/Campaigns/swipe-declone-stage2-subtraction.json` reads COMPLETE: plan-review FORGE, red-suite RED_SUITE_READY, adversary FRACTURE_FOLDED, build BUILD_GREEN, code-review PASS, coverage-audit ADEQUATE r2). **The one thing still owed is step 7, the device re-confirm — the user’s, and unrun.**
The audit's five findings are closed: N2–N5 in code and records, and **N1 by the planner narrowing §10 `MOVERSHAPE`'s behaviour sentence to the adapter expression its fixture commissions**, with the lifetime invariant deferred, triggered and designed at §14 (§13 decision 22). One scrub follows N1 and is the test author's — `test/swipe-declone-stage2-subtraction.test.js:89`.
`Claude/Curie/RED-swipe-declone-stage2-subtraction.md` (`b2327f5`): 884 tests, 880 pass, **3
intentional red-first cells** (`NOOWNEDPANE`, `MOVERSHAPE`, `PILLSWEPT`'s arity half) and nothing
else, against an 849/0 baseline. Every mutant was executed **individually against its target file**
rather than by whole-suite sweep, because with three cells red at HEAD a sweep reports CAUGHT for the
wrong reason on everything. ⭐ `PILLSWEPT`'s arity red **flips to green under the collapse probe and
nothing else does** — red for its cell's reason, not for a fixture accident.

⛔ **R10 instance FOUR, and this fold measured a FIFTH.** Two mutation anchors on **§5's third
ternary — the same line** whose `M1WRITERSET` registration was folded as C5 — were on no plan list.
Rather than enumerate again, this fold **derived** the rot set by applying the collapse in memory and
testing every registered anchor against it, with a control pass on pristine source: **seven anchors
rot, four of them on no list** — the two reported, plus `S2-31` and `S2-32`, which are
`RECOVERYPARITY`'s own NATURAL-a and NATURAL-c. Uncaught, that cell would have shipped with half its
mutants unrunnable. §8 D13d carries all four. **The deletion set did not move.**

⭐⭐ **Ruled at R10: the co-change list should stop being authored by hand.** Four passes, four misses,
the fourth on a line the third had already identified — and the hand report of the fourth missed two
more. Step 5b makes the class cheap and early; it does not make the list correct. §14 routes the
derivation.

**RATIFIED, adversary struck, fracture folded (§11 step 3).**
`Claude/Loki/PLAN-swipe-declone-stage2-subtraction-strike-2026-08-05.md`. ⭐ **The commissioned claim
HELD under execution**: no first-party producer of the retired class exists, six driven scenarios all
entered the recovery with a non-null handle, the collapsed variant's unconditional read never threw
across the battery or the 849-test suite, and the `resetScroll` axis was behaviourally identical in
both forms. **The control fired** — an *injected* ghost took the orphan branch at HEAD and diverged
completely under the collapse — so the negative is evidence rather than silence, and the orphan input
is constructible only by injection.

⛔ **The fracture is the enumeration, again: a fifth rot check reddens on step 6's commit.**
`test/scroll-writer-set.test.js`'s `M1WRITERSET` baseline **entry #10 registers §5's third ternary by
its exact source text**, which the collapse rewrites. The gate is green at HEAD and red under the
collapse; exit condition 3 was unsatisfiable as enumerated. It is now **§4a C5**, and its repair is a
baseline **restructure**, not a text bump — §4a C5 carries the design. **The deletion set did not
move.**

⭐⭐ **This is the THIRD executed instance of this plan's own named class — "a deletion list is not
the same thing as a blast radius" — and all three were found by RUNNING the collapse, none by
reading it.** Three review rounds each declared the co-change set complete. §11 gains **step 5b**: the
collapse is applied in memory and the suite is run *before* the commit, and the measured radius must
equal the declared one. R10 carries the class.

**RATIFIED 2026-08-05 — FORGE at plan-review round 3.**
Three rounds, three TEMPERs resolved, then FORGE at `Claude/Charpy/PLAN-swipe-declone-stage2-subtraction-157a2e1-r3.md`.
⭐ **The deletion set never moved across any round.** Every reachability proof in §4 was struck against
source in round 1 and confirmed again in rounds 2 and 3; what each round changed was blast radius,
witnesses, mutant validity and mechanization. The round-3 recommendations (G1–G3) are folded here and
none blocked. ⛔ **Read R9 before step 3:** every one of those proofs was confirmed by *reading*, and
this campaign's record is four readings settled only by execution — which is what the adversary is
commissioned against.

This plan executes
`PLAN-swipe-declone.md` §13 step 11 against the §12 deletion list. It is subordinate to that plan and
does not restate it: §12 remains the authoritative inventory, and every row of §4 below cites the §12
item it discharges.

**What the round-1 review changed, in one line.** `Claude/Charpy/PLAN-swipe-declone-stage2-subtraction-1ced95d.md`
(verdict TEMPER) struck every reachability proof in §4 against source rather than against this plan's
prose, and **all of them held** — D1, D2, D3, D5, D8, D12, the `nav.js:105`/`:106` correction,
`NOCLB`'s subject, and the A2 exclusion. **The deletion set has not moved.** What the review found is
**blast radius this plan did not enumerate**: three surfaces that must change in step 6's single
commit appeared in no list here (§4a), two scan resolutions were unspecified where their sibling's
was specified (§10), the comment residue was under-declared (§8 D16b), and the deleted-cell set
dropped two witnesses of behaviours that survive (§9, §10). Each correction is marked **[F*n*]** at
the point it lands.

**Also changed since round 1:** `PLAN-swipe-declone.md` §13 **step 10b PASSED all six device items**
on build `.306` (2026-08-04). §11 step 2 is discharged and R3 is closed. Nothing is being retained as
insurance.

**What the round-2 review changed, in one line.** `Claude/Charpy/PLAN-swipe-declone-stage2-subtraction-5a1d977-r2.md`
(verdict TEMPER) did not re-strike the deletion set and confirmed all five round-1 resolutions sound —
including [F3]'s load-bearing claim that a tag value's literal must exist somewhere in source, and
[F4]'s scrub list. **The deletion set is unchanged for the second round running.** Three residuals
were found in what round 1 *added*: an exit condition unsatisfiable at HEAD (§4a C3), a mutant that
cannot produce the effect it is registered for (§10 `RECOVERYPARITY`), and a co-change enumeration
short by one guarded only by a read-through (§4a C2). Each correction is marked **[R*n*]**.

⭐ **One of them resolved differently from either option the review offered.** `tools/source-gate-sweep.mjs`'s
`transition branches` entry is not a rot to re-anchor and not a knowingly-unevidenced fingerprint: the
fingerprint it defends **was retired at stage 4, in the same commit that moved the predicate**
(`test/transition-matrix.test.js:42-47`). The entry is the tombstone of a retired mirror, so it is
deleted, no per-entry `file` field is needed, and nothing becomes unevidenced. §4a C3.

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
   - 4a. Co-changes that are not deletions and must land in the same commit
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
| `test/swipe-model.test.js`'s `VERIFIED.supersession` pin, and the ORPHAN prose hard-coded in `tools/gen-swipe-model.mjs` | Live gate + its generator; the project's frozen model | **GAP, closed at [F1].** The pinned region is `regionHash(read('js/app.js'), 'function begin(x, y, target) {', 'if (target.closest', 'begin/supersede')` — **exactly** §5's collapse region plus D9's `.spent` sweep. The §5 edit necessarily moves the hash, and the generated document is not hand-editable: the ORPHAN prose lives in `render()` at `tools/gen-swipe-model.mjs:416`, `:431`, `:234` and `:473-474`, so D17's "regenerate" reproduces it verbatim. Both files are now in §4a and on step 6's same-commit list. |
| `tools/source-gate-sweep.mjs`'s `begin/supersession (swipe-model)` entry | Live tool; the ONLY runnable mutation evidence for the fingerprint gates, which `tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES` deliberately excludes | **GAP, closed at [F2].** Its anchor is `document.querySelectorAll('.nav-ghost.spent')…`, which D9 deletes; `test/mutation-anchors.test.js` reads `tools/mutate.mjs` only, so the rot is invisible to the gate §8 called "the mechanical closure". The entry is re-anchored in §4a and the tool joins §11's exit condition. |
| `test/transition-matrix.test.js:42-47` — "**The MIRROR IS RETIRED (stage 4).** There used to be a test here pinning a fingerprint of `js/app.js`'s branch region… There is no second copy of the branch logic, so there is nothing to fingerprint and no test to keep here." | HEAD source, read directly | **CONFLICT with the same file's own header, and it decides [R1].** `:12-20` still advertises "TWO THINGS ARE GUARDED: … 2. the region of `js/app.js` the predicate MIRRORS is fingerprinted", thirty lines above the paragraph retiring it. The retirement is the current truth — the file contains no fingerprint assertion. **This is why nine stages of rot went unseen:** the header advertises a guard the file no longer has, `tools/source-gate-sweep.mjs`'s header names that gate as one of two fingerprint gates, and `tools/mutation-sweep.mjs`'s exclusion reason repeats the claim. All three are scrubbed with C3. |
| `test/mutation-anchors.test.js`'s `KNOWN_ROTTED` exemption for `transition branches`, landed 2026-08-04 at `fad819e`, naming this plan as owner | Live gate, added by the review round | **AGREE, and it is discharged by C3.** The gate reddens on a stale exemption as well as on a new rot, so the exemption is removed in the same commit that removes the entry — which is what makes the discharge structural rather than remembered. |
| `test/scroll-writer-set.test.js` — the `M1WRITERSET` registered baseline, **entry #10** (`if (cur) window.scrollTo(0, cur.scroll0);`) and **entry #11** (`window.scrollTo(0, cur.scroll0);`) | Live gate, its header forbidding a repair by narrowing | **CONFLICT, found by EXECUTION not by reading, and it is the adversary's fracture.** Entry #10 registers §5's third ternary **by its exact text**, which the collapse rewrites — so the gate is green at HEAD and red under the collapse, and exit condition 3 was unsatisfiable as enumerated. The plan cited this file twice before ([F8], decision 15) and both times only as the source of the sweep-exclusion criterion, never as blast radius. Resolved by re-derivation, not by a text bump: §4a **C5**. |
| `tools/gen-swipe-model.mjs:257` `DISPOSE_REASONS` and its `deepEqual` pin at `test/swipe-model.test.js:270-274` | Live gate; a **third** swipe-model surface beyond C1's hash and C2's prose | **OUT OF SCOPE, ruled rather than left silent [R3].** It states `PLAN-swipe-reveal.md` §3.4's closed set of *permitted* dispose reasons — a design commitment of the parent plan, not a description of a call site this pass deletes. Retiring it is a records decision about §3.4, owned by the planner alongside Stage B's taxonomy work. Same ruling for `:413` (I17(a)) and `:491-495` (§8 PANE DISPOSAL), and for the same reason. |
| `tools/fuzz-ui.js:54` — `ghosts: all('.nav-ghost').length` as a probe field | Live diagnostic tool | **AGREE, and it is D3's own argument one file out [F8].** After the pass it is constant 0. §4a. |
| `PLAN-swipe-declone.md` §13 step 10b — the device gate on the shipped Stage-2 form | Ratified sequence step | **DISCHARGED 2026-08-04: all six items PASS on build `.306`.** §11 step 2 is closed and R3 with it. |
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
listed with the reason it is unreachable at HEAD `b539f71` (re-derived against `1ced95d` by the
round-1 review; the intervening commits touched no file this plan cites).

**CO-CHANGED, and not deletions [F1, F2, F8].** Four surfaces contain nothing this pass removes and
break or lie the moment §5's collapse lands: the frozen swipe model's fingerprint pin, its
generator's hard-coded ORPHAN prose, the source-gate sweep's supersession anchor, and the fuzz
probe's ghost counter. §4a. They are called out separately from the deletion list because two of them
are gates, and a gate that reddens is the first thing step 6 shows the builder.

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

### 4a. Co-changes that are not deletions and must land in the same commit

**Added at [F1], [F2], [F8].** A deletion list is not the same thing as a blast radius. These three
surfaces contain no code this pass removes, yet each one *breaks or lies* the moment §5's collapse
lands, and none appeared in the round-1 revision. They are set out here rather than in §8's residue
table because two of them are gates, and a gate that reddens at step 6 is the first thing the builder
sees — ahead of all twelve deletions.

| # | Surface | What the collapse does to it | Required disposition |
|---|---|---|---|
| **C1** | `test/swipe-model.test.js` `VERIFIED.supersession` (currently `b07e422a493b8fff`) | The pinned region **is** the collapse region, so the hash moves. The commit lands red here first. | The pin moves **only behind a line-by-line re-verification recorded in the build log**, in the form the last four re-pins already used (`test/swipe-model.test.js:39-70` is the precedent: each records what changed inside the region and what was mirrored). ⛔ **A re-hash without the re-verification is the one weak link the frozen model exists to close** — `js/swipe.js:1-12` records that the generator reimplements conditions rather than executing them, so the pin is the only thing that makes the reimplementation falsifiable. |
| **C2** | `tools/gen-swipe-model.mjs` — the ORPHAN prose, hard-coded in `render()` | Regenerating the document **reproduces it verbatim.** **FIVE sites, not four [R3]:** the recovery-order paragraph (`:416`, "dispose the old pane / stray ghosts"), the ORPHAN-path sentence (`:431`), the `TERMINATION` row's `pane: 'dispose orphan'` cell (`:234`), the termination footnote's **`orphan disposal` clause (`:471`)**, and that footnote's `resetScroll:d?false:undefined` parity clause (`:473-474`). ⛔ `:471` sits one line above `:473` and the round-1 revision missed it while reading the two lines beneath it — which is the standing proof that a read-through of a 500-line generated document is not a check. | Rewrite all five to describe the post-collapse code: one entry route set, one screen/scroll policy, no orphan sub-case, and `resetSwipeStyles` reached once via `applyScreen` (§5, [F6]). Regenerate afterwards. **The document must describe the code it mirrors after the pass** — a generated model that still documents a deleted branch turns the one file meant to be trustworthy at a glance into the one that has to be cross-checked. **Mechanized at [R3]:** exit item 6 is no longer a read-through — see the assertion below. |
| **C3** | `tools/source-gate-sweep.mjs` — **two entries, and they need opposite treatments [R1]** | (a) The `begin/supersession (swipe-model)` entry is anchored on `js/app.js:428`, which D9 deletes, so the tool would print `ANCHOR FAILED` and exit nonzero. (b) The `transition branches (transition-matrix + swipe-model)` entry is **already rotted at HEAD and has been for nine stages** — its anchor left `js/app.js` at `14257f2` when the predicate moved into `classifyTransition`, so the tool exits 1 today, before this pass touches anything. | (a) **Re-anchor** onto a behaviour-neutral rewrite of a line that still exists inside the post-collapse region — `const cur = d || session;`, the hard-reset log line and `releaseGesture()` all survive it, and the tool's own header sanctions a log-string change. (b) **DELETE the entry** — see the ruling below. Then remove `test/mutation-anchors.test.js`'s `KNOWN_ROTTED` exemption in the same commit, which that gate enforces by reddening on a stale exemption. |
| **C4** | `tools/fuzz-ui.js:54` — `ghosts: all('.nav-ghost').length` | Constant 0 after the pass. | Remove the field. This is D3's own argument one file out: a diagnostic field with one constant value is not a measurement. |
| **C5** | `test/scroll-writer-set.test.js` — the `M1WRITERSET` baseline, entries **#10** and **#11** | **Executed red under the collapse.** #10 registers §5's third ternary by its exact text `if (cur) window.scrollTo(0, cur.scroll0);`; the collapse rewrites it to `window.scrollTo(0, cur.scroll0);` — which is **entry #11's text exactly**. So Direction 2 reddens on the rot, and the textual distinguisher between the recovery writer and the abort writer is erased at the same moment. | **Re-derive #10 into a shared-text GROUP with #11**, and correct the three prose sites the collapse falsifies. The design, and the two options rejected, are below. ⛔ The gate's header forbids repairing a red by narrowing the pattern, so deleting the entry is not available. |

### C5's design — how #10 and #11 stay distinguishable when their source text converges

**The chosen shape: one shared-text group of two, which is the mechanism the gate already ships.**
`groupKey` is `file + ' || ' + text`, so re-deriving #10 to the bare post-collapse text puts both
entries in one group, and the gate's three directions then behave as follows:

| Direction | Post-collapse behaviour | Does a silent loss still redden? |
|---|---|---|
| 1 — a derived site that is registered by no entry | the recovery site matches #11's text by containment | yes, unchanged |
| 2 — a registered text that no longer occurs | the text occurs (twice) | correctly quiet; the writer still exists |
| 3 — a group whose derived count ≠ its registered count | registered 2, derived 2 | ⭐ **yes: delete EITHER writer and the count falls to 1, and the gate reddens.** This is precisely what the group mechanism was built for, and the gate's own header says so about the retired 11/12 pair. |

**What it costs, stated rather than glossed.** The gate can no longer name *which* of the two
document-scroll writers vanished — it reports the group. Two mitigations, both free: the entries keep
their distinct `owner` and `why` fields, and Direction 3's failure message is extended to name both
candidates so the reader is not left to guess. Separately, the longest-match sort now chooses
arbitrarily between two identical texts; that is **absorbed by construction**, because both keys are
identical so whichever wins increments the same counter — recorded so a future reader does not read it
as a latent bug.

**Three prose sites become false and land in the same commit.** The baseline header's "Two entries may
legitimately share the same text (**11 and 12** do)"; Direction 3's comment that "Registered texts
NEST (entry 10's line CONTAINS entries 11/12's text) … otherwise the recovery site would be counted
into the abort-path group" — **after the collapse nothing nests, and the recovery site is in the
abort-path group deliberately**; and entry #11's own comment block, which narrates the retired 11/12
pair and concludes "the group has a single member now" — it has two again.

**Two designs rejected, recorded so they are not rediscovered.**

- **Restore the nesting with a trailing comment on the recovery line.** It would work: the derivation
  keys on the whole trimmed line, so a trailing comment makes the recovery site's text strictly
  contain #11's and the longest-match sort recovers today's structure exactly. **Rejected** — a
  comment written to satisfy a gate is the compensating-constant shape this project has a standing
  rule about, and it makes an innocuous comment edit redden a gate whose header forbids the cheap
  repair. The gate would then be teaching the wrong lesson to whoever met it.
- **Key entries by enclosing function rather than by text.** This is the *better* gate: it gives exact
  per-site attribution and, unlike `file:line`, does not rot on an edit above it. **Rejected as scope,
  not as design** — it is new derivation machinery in a gate this pass does not otherwise touch,
  landing at the end of a fourteen-item commit, and novel scanning machinery carries its own failure
  modes (`NOCLB`'s over-stripping hazard, one section over, is the same shape). Deferred with its
  consumer named in §14: the first task that needs per-site attribution on this gate.

**Why C3 is Structural and not tidy-up.** `tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES` excludes
the fingerprint gates by design — they fail under every mutation by construction, which would be a
false CAUGHT — and `source-gate-sweep.mjs` exists precisely because that exclusion "left the
fingerprints with NO runnable mutation evidence at all". So the fingerprint whose evidence C3(a)
restores is **the same one C1 re-pins**, over this pass's most dangerous edit. Re-pinning a gate in the
same commit that silently ends the demonstration of its ability to fire is the defect, not the rot.

⭐ **C3(b) — the `transition branches` entry is DELETED, and this is neither of the two dispositions
the review offered [R1].** The review's options were re-anchor, or remove with a dated decision
recording that the transition-matrix fingerprint is knowingly unevidenced. Reading the gate settles it
differently: **there is no fingerprint to evidence.** `test/transition-matrix.test.js:42-47` states in
its own words that *"The MIRROR IS RETIRED (stage 4) … there is nothing to fingerprint and no test to
keep here"*, and the file contains no fingerprint assertion — the entry's `mustSay: 'predicate still
mirrors'` matches no test title in it, so even with a valid anchor the entry would have reported
UNCAUGHT. The entry is a **tombstone of a retired mirror**, retired by the same commit (`14257f2`)
that moved the predicate; deleting it removes a dead check, and **nothing becomes unevidenced because
nothing has been evidenced by it since stage 4.**

**Three consequences, and the first is the one that saves work.**

1. **No per-entry `file` field is needed, and exit item 4 becomes satisfiable.** That design change was
   owed only if the entry had to follow the predicate into `js/swipe.js`. With the entry gone, all
   four remaining entries target `js/app.js`, the single `APP` constant stands, and
   `test/mutation-anchors.test.js`'s new one-file read needs no change either. The smaller change is
   also the truer one.
2. **Three stale records are scrubbed with it, and they are why nine stages went unnoticed.**
   `test/transition-matrix.test.js:12-20`'s header still advertises the fingerprint its own `:42-47`
   retired — a within-document contradiction; `tools/source-gate-sweep.mjs`'s header names
   `transition-matrix.test.js` as one of the two fingerprint gates; and `tools/mutation-sweep.mjs`'s
   `SOURCE_TEXT_GATES` reason for that file says it "fingerprints the `js/app.js` transition-branch
   region". ⚠️ **The exclusion ENTRY itself is not removed** — the gate still reddens on mutations
   unrelated to its own subject, which is the criterion that governs the list ([G3]). Only its stated
   reason is false, and only the reason is corrected. Deleting the entry on a false premise would
   re-open the false-CAUGHT hole the exclusion list exists to close.
   ⛔ **The replacement reason names BOTH channels, not the stronger-sounding one [G2].** The gate
   derives `SETTINGS_SUBS` from `js/nav.js` source text — and, more consequentially,
   `tools/gen-transition-matrix.mjs:34` `require`s `js/swipe.js` at module load, so **any** mutant
   targeting that file can fail it, and registered ones do (`tools/mutate.mjs:452-454`, and `S2-23` at
   `:1306-1309`). Naming only the `js/nav.js` channel would leave a reason that is true, checkable,
   and incomplete — **which is precisely how the record this finding corrects survived nine stages:
   every reader who checked it found it true.** A reason that can be verified without being sufficient
   is the failure mode, not a wrong reason.
3. **The lesson is filed, because it is the transferable half.** A gate that advertises a guard it no
   longer has produces exactly this: a tool anchored to the retired guard, excluded from both sweeps,
   red for nine stages, with nobody wrong at any step. It is the same shape as §8's anchor-registry
   self-indictment, one layer further out.

## 5. The cascade the parent's §12 does not name — the orphan-recovery collapse

`begin()`'s recovery entry predicate is `if (d || document.querySelector('.nav-ghost') || (finishing
&& session))` (`js/app.js:435`). Inside the block, `const cur = d || session` (`:474`) is null on
**exactly one** entry route: when the `.nav-ghost` disjunct was the only true one. D9 deletes that
disjunct, so `cur` is non-null on every reachable entry, and three expressions written to serve the
null case become constant:

| Expression at HEAD | Collapses to | What the orphan value was for |
|---|---|---|
| `resetSwipeStyles(cur ? true : undefined)` | *(the whole call goes — see the adjacency below, which is the reason it is deletable)* | keep the full sweep when no session owns the pane |
| `applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined })` | `applyScreen(currentDesc(), { render: false, resetScroll: false })` | `resetScroll: undefined` kept `js/nav.js`'s default `true`, so an orphan hard reset on a home source still scrolled to top — pre-Stage-6a parity, the code review's F1 |
| `if (cur) window.scrollTo(0, cur.scroll0)` | `window.scrollTo(0, cur.scroll0)` | an orphan has no session-start scroll to restore |

⛔ **Deleting the explicit `resetSwipeStyles` call rests on an ADJACENCY, not on the ghost sweep
alone — stated at [F6] because the round-1 revision named one of its three effects and left the other
two implicit.** `Nav.resetSwipeStyles` does three things: (a) sweep `.nav-ghost` (`js/nav.js:105`),
(b) sweep `.np-pill-float` (`:106`), and (c) clear `transform` / `transition` / `willChange` /
`zIndex` on every view, **every `.browsepage`**, and the navbar pill (`:107-116`) — effect (c) being
the "erratic after a while" class the reset exists to prevent. Only (a) dies with D9. **(b) and (c)
survive because the very next line, `applyScreen(…)` (`js/app.js:482`), reaches
`resetSwipeStyles(opts && opts.keepGhosts)` as the FIRST statement of `Nav.applyScreen`
(`js/nav.js:129`)** — so with `keepGhosts` gone that call performs the full reset, once, at the same
point in the sequence. The row is admissible for that reason and no other. Two consequences: the
adjacency is recorded in `tools/gen-swipe-model.mjs`'s rewritten prose (§4a C2), and a future edit
that reorders or short-circuits `js/app.js:482` restores the pill leak — which is why
`RECOVERYPARITY` gains an assertion that the recovery path sweeps the pill (§10, [F5]).

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
`MOVERSHAPE` is therefore a **new cell**, and it spans two layers: **a source scan over the one
`toMover` expression, which carries the headline key-set claim**, plus the app harness over a real
gesture for the seam read set and for the `base` half — the fake-env construction layer never executes
`toMover` at all, and the app harness cannot observe `d.movers`, which is module-private (§10, §13
decision 20). ⚠️ **This sentence said "the app harness over a real gesture" alone until 2026-08-06**,
which was the round-1 specification and was superseded at step 5 when that fixture was found not to be
constructible; it is corrected here with §10's row under decision 16, because a stale layer claim is
true, checkable and incomplete, which is the failure mode that survives. The nearest survivor,
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
| D13 | `tools/mutate.mjs` — **de-registered by NAME:** `swipe6e DP/attribution: disposeOwnedPanes' own filter never matches…`, `swipe6e DEC: the .np-pill-float decoration removal is mistakenly guarded behind keepGhosts…`, `swipe6e HR: the recovery keeps ghosts on the ORPHAN branch too…`, `r223 4: endOwnership clears at finalize, ignoring revealPending…`, `stage6a F1: orphan sub-case forces resetScroll:false, dropping home scroll-to-top…`, `stage6i SCOPE: the commit→home held-reveal branch is reinstated…` | Each names a subject this pass deletes. ⛔ `stage6i SCOPE` is **already broken at HEAD** and its removal is a repair, not a loss: its replacement text calls `holdGhostUntilPaintable`, deleted in step 10, so the mutant now produces a `ReferenceError` and would be recorded CAUGHT for the wrong reason. Recorded because a mutant that reddens for the wrong reason is indistinguishable from a working one in the sweep output. |
| D13b | `tools/mutate.mjs` — **re-anchored or REPLACED, not dropped:** `swipe: begin() stops hard-resetting a superseded session (-> I2/I20 pane test)` is **re-anchored** (its subject — that `begin()` hard-resets leftover state — survives the collapse; only its anchor text changes). `swipe6e BR: disposeOwnedPanes broadens to remove every mover regardless of own` is **replaced, not de-registered [F5]** — its cell moves and survives (D14b), so a new mutant is registered against the surviving mechanism: the style reset is broadened to REMOVE the elements it clears rather than clearing them, **with its expected killer set written into its registration comment [R5]** | A relocated cell with no mutant is a cell whose ability to fail stops being demonstrated at exactly the moment its rationale changes. The replacement targets the mechanism that now guarantees the property, which is the style reset, not the retired ownership filter. ⚠️ It is **non-discriminating** and that is disclosed rather than repaired: the reset runs at the top of every `applyScreen` over every view and every `.browsepage`, so removing those elements reddens much of the harness suite and demonstrates that *the suite* notices, not that *this cell* does. It is the honest choice of mechanism — the ownership filter it replaces no longer exists — so the measure is the same one-liner already applied to `S2-23` (D13c): record the expected killers so "reddens for the right reason" stays checkable by reading. |
| D13d | `tools/mutate.mjs` — **four anchors that rot on §5's collapse and were on NO list, DERIVED not enumerated.** Re-anchored, none de-registered: **`stage6a: recovery stops restoring the session-start scroll`** and **`swipe: supersession recovery stops restoring the session-start scroll`** — ⛔ **merged into ONE entry naming both designated killers** (next paragraph); **`S2-31 RECOVERYPARITY: the supersession recovery stops forcing resetScroll:false`** and **`S2-32 RECOVERYPARITY: the supersession recovery releases the row hold BEFORE applying the source screen`** | All four anchor text §5 rewrites, and **all four have subjects that SURVIVE** — the first pair is `RECOVERYPARITY`'s NATURAL-b, and `S2-31`/`S2-32` are its NATURAL-a and NATURAL-c. ⛔ **Uncaught, `RECOVERYPARITY` would have shipped with three of its four mutants unrunnable** — the cell carrying the re-homed `DEC` witness, which is exactly the hazard [R2] repaired for its fourth mutant one round earlier. `S2-31`/`S2-32` postdate this plan (Curie registered them at step 5), which is precisely why a list written once cannot stay complete. |
| D13c | `tools/mutate.mjs` — **kept, with its expected killer set recorded [F9]:** `S2-23 NOGHOSTATALL: the app-ghost branch is re-added for browse->browse…` | It mutates `js/swipe.js` and reddens a fake-env unit cell. ⚠️ Its replacement text contains **both** retired tokens (`w.className = 'nav-ghost'` and `mover(w, 'owned-pane', 'outgoing')`), and the two new gates scan `js/swipe.js` as well — so after the pass the sweep's `killed by:` list gains `NOGHOSTCLASS` and `NOOWNEDPANE`. Nothing breaks; a caught mutant stays caught. But with audit **M5** (mechanising the designated-killer check) deferred, the expected killer set is written into the mutant's own registration comment in this commit, so "reddens for the right reason" stays checkable by reading — the same hazard this table records one row up for `stage6i SCOPE`. |
| D14 | **Cells deleted:** `test/swipe-stage6e.test.js`'s `DP.browse-home`, `HR` and `DEC`; `test/swipe-stage6.test.js`'s `OB` and `OB-home`; the `.nav-ghost` sweep cell in `test/nav.test.js`; `test/swipe-stage5-wiring.test.js`'s `F2-r WIRING` cell. **`BR` is NOT deleted — it is relocated [F5]** (next row) | ⛔ `OB-home` is the only cell proving `resetScroll` defaults to `true` on the orphan path (pre-6a parity). It is deleted because the path is deleted, and that is admissible **only** because `NOGHOSTCLASS` holds the path unreachable. `DEC`'s subject — *the recovery path still sweeps the pill float* — is a behaviour that **survives**, so its witness is not deleted but re-homed onto `RECOVERYPARITY`'s fourth assertion (§10, [F5]); the unit-layer `PILLSWEPT` never touches that path and is not a substitute for it. |
| D14b | **`BR` relocated, not deleted [F5]:** `test/swipe-stage6e.test.js:172-192` ("on a `browse→home` supersession neither borrowed-real mover is ever removed") moves into `test/swipe-stage6.test.js`, beside `OR`/`NC`/`VR`/`PS`, with its rationale rewritten | Its **assertion** is about the borrowed-real views surviving a supersession, which this pass does not change; only its stated *rationale* (the `own` filter) dies. §8's own rule separates those. It is not vacuous either — `resetSwipeStyles` still removes nodes on that path (`js/nav.js:106`), so a broadened sweep would redden it. No other cell covers it: `RECOVERYPARITY` asserts screen, scroll and ordering; `DESTROYEDMOVER` asserts transforms and a null session. With `BR` moved, `test/swipe-stage6e.test.js` is deleted whole — a one-cell file named for a retired stage is worse records hygiene than the move. |
| D15 | **Vacuous assertions removed:** the `ghosts(h) === 0` helper and its uses in `test/swipe-stage6c.test.js` (three), `test/swipe-invariants.test.js`, `test/swipe-stage5-residuals.test.js` and `test/swipe-stage6.test.js`. ⛔ **`test/swipe-invariants.test.js:426-427` / `:450-451` is NOT in this set — it is RE-ANCHORED [F7]** | Each count assertion is now zero by construction. `test/swipe-construction.test.js`'s `.nav-ghost` assertions are **kept**: they run against the SEAM with a fake document, where the seam could still mount one, so they are not vacuous. The stale-event cell's `ghostEl && ghostEl.style.transform` comparison is **already inert at HEAD** (both sides `null`), and that cell's own header names exactly this assertion as the one whose absence "made the whole test inert" — so deleting it leaves the cell in the state its header records as broken. It is re-anchored onto a **surviving** mover (a `.browsepage`, or `#home`, whose transform a stale `touchmove` would actually write), which restores a witness the pass would otherwise have quietly removed. |
| D16 | `test/browse-decouple.test.js` — `realSetTimeout`, `realSleep`, `mkGhostEnv` | Addendum A6. No call sites; `eslint.config.js:17` ignores `test/**`, so nothing else catches it. |
| D16b | **Comment scrubs, in the same commit — the full list [F4].** In `js/app.js`: **`:437-473`**, the 37-line block that is the prose form of the branch §5 collapses (it describes `disposeOwnedPanes(cur,'superseded')`, the DOM-global `.nav-ghost` sweep, the ORPHAN-pane path and `resetScroll:undefined`'s parity role); `:401-407` (a capture recipe that no longer exists); `:425-427` (the `.spent` fade rationale); `:429-434` (the three-disjunct recovery predicate); `:475-479` (the `keepGhosts` dual-site rationale); `:600-601` (a three-valued `own`); `:693-696` (the held reveal and `holdGhostUntilPaintable`); `:761-767` ("the ONLY owned-pane recipe is the app-ghost"). In `test/`: `test/swipe-stage5-residuals.test.js:88-92` (the false "`own` is still load-bearing" note — §1, §6) and `test/swipe-construction.test.js:160-168` (names `own` as a production key). ⛔ **`js/app.js:718-726` and `js/swipe.js:203-210`/`:254` are REMOVED from this list at [R6]** — see the discriminator below. | **This is the item the round-1 revision under-declared, and `:437-473` is the sharpest case: it is the ARGUMENT for the branch being removed, so leaving it makes HEAD carry a careful justification for code that no longer exists.** D16b's own rule — a comment describing a deleted mechanism is the same defect one layer out — is what condemns it, and `js/app.js:437-473` was not even inside the round-1 declared ranges. Under `NOOWNEDPANE`'s resolution (§10, [F3]) this residue does **not** redden the gate, so the scrub is owed on its own merits and is an explicit exit item, not a gate side-effect. |
| D16c | **The sweep-exclusion decision for the new purge file, made rather than left to the builder [F8], under the criterion stated at [G3].** `test/retired-concepts-purge.test.js` is **NOT** added to `tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES` exclusion list | ⭐ **The operative criterion is "does it redden on a mutation UNRELATED to its own subject?", not "does it redden on every mutation".** The list's header says the latter and the list's own measurement-derived entry says the former — `scroll-writer-set.test.js`'s reason records that it *"appeared as `killed by` on mutation #93 … which has nothing to do with the writer-set invariant"*. Under the header's wording, decisions 9 and 11 look like two different rules; under the measured one they are a single rule applied twice. **The purge file fires only on a mutant carrying its own registered token and is inert under every other, so it is excluded from the exclusion** — putting it in would make its three ADDITIVE mutants report UNCAUGHT, a false clean of exactly the kind the list exists to prevent. The header's overstated wording is corrected in the same commit so the list stops reading as false against its own entries. |
| D17 | `docs/swipe-model.generated.txt`, `docs/transition-matrix.generated.txt` | Regenerated in the same commit — **after** `tools/gen-swipe-model.mjs`'s prose is rewritten (§4a C2). ⛔ Regeneration alone does **not** discharge this: the ORPHAN prose is hard-coded in the generator, so a regenerate-only step reproduces it verbatim. |

**The duplicate-anchor ruling, and how D13d was obtained.** The two scroll-restore entries are
**byte-identical in `from` and `to`** and differ only in `name` — one names `SC`/`NC` as its
designated killers, the other names `I20`. They are not an anchor-ambiguity: the text occurs once in
source, so the uniqueness gate passes them both legitimately. They are a **registry duplicate**, and
they are merged into one entry naming all three killers. Two reasons, and the second is the one that
matters: a sweep costs a full suite run per mutant, so a duplicate is measurable waste; and because
both produce byte-identical source, their `killed by:` lists are identical, so **neither entry's
designated killer is distinguishable from the other's** — the attribution hazard decision 13 exists to
close, in the registry rather than in a cell. Merging drops no coverage claim: the surviving entry
carries every killer either one named.

⭐ **How the set was obtained, because the method is the finding.** The two reported entries were
found by reading; enumerating from there would have been a fifth hand pass. Instead the collapse was
applied in memory through the adversary's own transform and **every** registered anchor was tested
against the result, with a **control pass on pristine source that had to report zero rot first**. The
control earned its keep immediately: the first run ignored `also.file` and produced a false positive
on `swipe: inline-style clearing removed, BOTH sites` — an entry whose second half targets `js/nav.js`
and is untouched. The measured answer is **seven anchors rot, four on no list**; the hand report named
two. **A derivation instrument needs a control on unmodified input, or it reports rot that is not
there** — the same standard §10 already applies to the purge cells' fire drill.

**The tombstone discriminator, and the three sites it takes back off D16b's list [R6].** §13 decision
7 justifies `NOCLB`'s code-position rule on the ground that a comment explaining why a concept was
retired is exactly the record that should survive — and the round-1 D16b list then deleted three such
comments while keeping their sibling at `js/app.js:798`, with nothing distinguishing them. The rule,
stated once and applied everywhere:

> **A tombstone survives: it names the retired symbol, its authority, and why it is gone, in the past
> tense.** What goes is prose that describes a mechanism **as if it still governs** — a live
> description of deleted code, or a branch documented as reachable.

Applied: `js/app.js:718-726` (`ghostVsReal — DELETED (…§12 item 12)`, `fadePanes / FADE_MS — DELETED
(…)`) and `js/swipe.js:203-210` (Stage 2 "retired the last view-copy recipe") are tombstones in
exactly that form and **stay**, which also makes `js/app.js:798` consistent instead of arbitrary.
`js/swipe.js:254`'s retirement parenthetical stays for the same reason and the rest of that comment
describes live host dispatch, so it needs no edit at all. Everything remaining on D16b's list is a
live description: `:401-407` says the deleted recipe "**is** now the sole capture recipe", `:437-473`
argues for a branch that will not exist, `:600-601` says a three-valued tag "**drives** teardown".
⭐ The discriminator **shrinks** this pass rather than growing it — three fewer edits, and the rule
that removes them is the one already load-bearing for `NOCLB`.

**The mechanical closure for D13.** `test/mutation-anchors.test.js` fails when a registered `from`
no longer occurs in its target file, so an anchor left behind reddens rather than rotting silently.
That gate — not this table — is the completeness check: the table names the mutants so the builder
knows what to expect, and the gate proves none was missed. After the pass, run the full sweep, not
only the anchors gate: an anchor can still match while its mutant has stopped biting.

⛔ **That closure has a hole, and §4a C3 is it [F2].** `test/mutation-anchors.test.js` imports
`tools/mutate.mjs`'s `MUTATIONS` **and nothing else**, so `tools/source-gate-sweep.mjs`'s own anchors
are outside it — and one of them is the line D9 deletes. Neither the anchors gate nor the behavioural
sweep can see that rot, so `node tools/source-gate-sweep.mjs` is named separately in §11's exit
condition. A "mechanical closure" that silently excludes one of the two anchor registries is the same
shape of false comfort as a cell that cannot fail.

## 9. What must NOT be deleted, and the measured evidence each carries

Before every deletion, the question is what measured evidence would go with it. These read
vestigial and are not.

| Kept | Why, and what would be lost |
|---|---|
| `js/nav.js:106` — the `.np-pill-float` sweep | **The retained `npPillClone` is the one owned resource left.** This line is its only sweeper on the recovery path, and it is *unguarded* by `keepGhosts` on purpose. Removing it with the `keepGhosts` machinery would leak a floating pill clone on every superseded Now Playing swipe. §12 item 14's retention clause is about this line and cites the wrong one. ⚠️ After §5 deletes the explicit `resetSwipeStyles` call, the recovery reaches this line **only** through `applyScreen` → `js/nav.js:129` ([F6]) — a single-path dependency that had no witness once `DEC` was slated for deletion, which is why `RECOVERYPARITY` gains its fourth assertion ([F5]). |
| The **behaviours** `DEC` and `BR` witness — the recovery path sweeps the pill float; the borrowed-real `#browse`/`#home` survive a supersession | **Both survive the pass; only their stated rationale dies.** Their witnesses are re-homed, not dropped: the first onto `RECOVERYPARITY`, the second by relocating `BR` intact (§8 D14/D14b). Named here because losing a witness in the same commit that removes the code guaranteeing the behaviour is the shape this whole campaign was opened by, and the coverage audit that would catch it runs *after* the build. |
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
NOOWNEDPANE | the retired ownership tag occurs nowhere under js/ AS A STRING VALUE in any quoting form, so no mover can be tagged with an ownership kind for which no teardown path remains, whether the tag is written inline at the call or held in a named constant | gate scan every js file excluding the vendored bundle for a STRING LITERAL in any of the three quoting forms whose content is exactly the retired tag, and fail naming file and line; a bare occurrence in a comment or in an identifier must NOT match, which the fire drill proves with a negative control alongside its positive one | TWO ADDITIVE mutants, one per re-introduction shape. NATURAL-a inject the tag inline at a mover construction site. NATURAL-b inject it as a named module constant that is never referenced, which the inline-only reading would miss. expected killing cell for BOTH is NOOWNEDPANE | gate source scan over first-party js
NOCLB | the two retired clobber identifiers from the stage that removed the runtime build-side-effect byproduct occur nowhere under js/ IN CODE POSITION, closing the coverage audit finding that their purge gate was deleted with its file while its subject stayed live | gate scan every js file excluding the vendored bundle for either identifier occurring outside comments and outside string literals, and fail naming file and line; a prose mention of the retired concept in a comment must NOT match, because a record explaining why a concept was retired is exactly what should survive, and the fire drill proves that with a negative control | TWO ADDITIVE mutants. NATURAL-a inject a declaration of one identifier into an existing first-party file. NATURAL-b inject a read of the other, so a scan that only sees declarations is caught. expected killing cell for BOTH is NOCLB | gate source scan over first-party js
MOVERSHAPE | the ONE adapter expression that constructs a production mover emits exactly the element reference and the base offset and no third key so the retired ownership field cannot be re-added at the site where session movers are built; the key set the recorded mover CARRIES over its lifetime is deliberately NOT claimed by this cell, because a key attached after construction is outside what any witness here can see, and that stronger invariant is deferred with its consumer named in section 14 | unit assert over SOURCE that the adapter's mover-construction expression reads exactly the two seam fields it is entitled to and emits exactly the two production keys, because the session movers are module-private and have no runtime observer; the base half is additionally covered behaviourally by the existing filmstrip cells which assert the incoming mover carries a signed offset so a dropped base is not source-only evidence | TWO mutants. NATURAL-a the adapter re-adds the retired ownership key so a field with no reader ships again. NATURAL-b the adapter drops the base key so the incoming mover has no offset. expected killing cell for BOTH is MOVERSHAPE | source scan over the one L3 adapter expression, plus integration app harness for the seam read set and for the base half
RECOVERYPARITY | the collapsed leftover-state recovery does exactly what the surviving branch did before the collapse namely suppress the screen reset restore the session-start scroll release the hold in that order AND sweep the transient now playing pill decoration for every entry route that still exists | integration boot the app harness and drive the three surviving entry routes namely a mid-drag second touch and a settling session superseded before finalize and a live drag interrupted by a nav tap and assert for each that the source screen is restored without a re-render that the session-start scroll is written exactly once that the row hold is released after the screen is applied AND that a pill float node present at the start of the recovery is gone at the end of it which is the only witness that the recovery still reaches the pill sweep now that the explicit style reset call is deleted and the path runs through the screen application alone | FOUR mutants. NATURAL-a the collapsed call passes the default screen reset so the recovery scrolls the destination to top. NATURAL-b the session-start scroll restore is dropped. NATURAL-c the hold release is moved ahead of the screen application which dematerializes the kept rows. NATURAL-d the screen application is REMOVED from the recovery so the recovery never reaches the style reset at all and the pill float survives which is the leak the deleted witness used to catch; moving the call instead does NOT bite because the screen application still executes and reaches the style reset as its first statement regardless of where it sits. expected killing cell for ALL FOUR is RECOVERYPARITY and the fourth assertion is authored as its own named test inside the cell so the sweep output names it | integration app harness over the real recovery
DESTROYEDMOVER | a live browse to browse gesture whose two movers are destroyed mid drag by a cache clear still settles leaves no page carrying an inline transform and releases the session so the next touch does not trip the leftover-state hard reset | integration boot the app harness with the real browse renderer and fake timers drive a browse to browse past the direction lock so both movers carry inline transforms then destroy the movers and advance past the settle and the finalize and assert a settle line was emitted that no page in the document carries a non-empty inline transform and that the active session reads null; the fixture drives THREE ROUTE COORDINATES with the same assertions namely the cache clear the container wipe and a mid-gesture screen application with rendering enabled | THREE mutants ONE PER ASSERTION not one per route since driving a different route is a fixture variant and not a source mutation. NATURAL-a the settle timer fallback is removed so a gesture whose transition-end anchor was detached never settles which reddens the settle assertion. NATURAL-b the page push is dropped from the style reset so a page still in the document keeps its transform. NATURAL-c the ownership release is removed from the finalize so the session survives and the next touch trips the hard reset. expected killing cell for ALL THREE is DESTROYEDMOVER | integration app harness with the real browse renderer
PILLSWEPT | the transient now playing pill decoration is still removed by the style reset after the ghost-sweep parameter is deleted so the one owned resource the swipe still creates cannot leak | unit drive the real style reset against the real index fixture with a pill float node present and assert it is removed and separately assert the reset is declared with no parameters so no caller can re-introduce a conditional on it | TWO mutants. NATURAL-a the pill float sweep line is deleted alongside the ghost sweep line which is the exact defect the parent plan's mis-cited retention clause invites. NATURAL-b the reset regains a parameter and guards the pill sweep behind it. expected killing cell for BOTH is PILLSWEPT | unit nav reset against the real fixture
BORROWEDREALSURVIVES | on a supersession neither borrowed-real view element is ever removed from the document so a teardown can never destroy a view the gesture only borrowed | integration the relocated cell drives a browse to home supersession on the app harness and asserts both view elements are the same objects and still connected afterwards its assertion unchanged from the form it has held since the stage that introduced typed ownership only its rationale rewritten because the ownership filter it used to cite no longer exists | NATURAL the style reset is broadened to REMOVE the elements it clears rather than clearing them which is the same defect class the retired ownership filter used to make structurally impossible expected killing cell BORROWEDREALSURVIVES | integration app harness over the real recovery
STALETOUCH | a touch move belonging to a superseded gesture never writes a transform onto the successor gesture movers and the witness for that is a transform read on an element that still exists after the pass | integration the existing stale-event cell keeps its four count assertions and its transform witness is re-anchored from the retired pane onto a surviving mover namely a browse page or the home view whose transform a stale move would actually write with the before and after values compared on a node that is not null so the comparison can fail | NATURAL the stale move guard is removed so a superseded gesture reaches the move handler and writes onto the successor movers expected killing cell STALETOUCH | integration app harness over the real listeners
```

**Nine cells, eighteen mutants** — the round-1 revision said seven and seventeen; `BORROWEDREALSURVIVES`
and `STALETOUCH` are added at [F5] and [F7], and `RECOVERYPARITY` gains a fourth mutant at [F5].
Recounted rather than incremented. Round 2 changed no count: `RECOVERYPARITY`'s fourth mutant is
**replaced, not added** [R2]. **The step-5 fold changes no count either, and corrects a
mislabelling:** `DESTROYEDMOVER`'s row called three things mutants when two of them were *fixture
route variants* — driving the container wipe instead of the cache clear mutates nothing. The row is
re-derived to **one mutant per ASSERTION** (settles / no stuck transform / session released) over
**three route coordinates**, so the count is unchanged at three and every one of them is now a source
mutation that can actually be applied. A fixture variant listed as a mutant is a mutant that will
report CAUGHT without ever having been run.

⛔ **Why `RECOVERYPARITY`'s fourth mutant had to be replaced, stated because the plan flags this exact
hazard twice against other people's mutants [R2].** The round-1 form *moved* the screen application
after the ownership clear. That still **executes** it: `Nav.applyScreen` reads two option flags and
calls `resetSwipeStyles` as its **first** statement with no early return before it, and the pill sweep
inside it is unconditional. So the pill was swept either way and the mutant reddened on hold-ordering
— which `NATURAL-c` already covers, inverted. The fourth assertion, which §9 calls the only witness
that the recovery still reaches the pill sweep, would have shipped **never having been shown to
fail**: the same defect as `stage6i SCOPE` in §8 D13, on the witness this plan rescued in round 1.
**The property is "the recovery reaches `Nav.resetSwipeStyles` at all", and after [F6] the single path
to it is the `applyScreen` call — so the mutant is the SHORT-CIRCUIT half of §5's stated residual, not
the reorder half.** It discriminates: `PILLSWEPT` drives the reset directly at the unit layer and
stays green, so the redness is attributable to this cell. ⚠️ Removing the call also reddens the cell's
screen-restore assertion, so **attribution within the cell is bought by splitting the fourth assertion
into its own named test** — the same measure the park-distance work used when it split a cell into
eight named tests to get per-assertion attribution the sweep cannot otherwise give. Every one asserts a **source fact, a key-set fact, a class-state
fact, a call-count fact or a DOM-identity fact** — never a rendered geometry, for the same reason the
parent plan's §14 gives: jsdom has no layout, paint or scroll anchoring, so a geometry cell here
could not fail.

**Items with no cell, and why that is correct rather than a gap.**

| Item | Why no cell |
|---|---|
| D1, D2, D3 | The behaviour that must survive is *nothing* — these are a supplier with no reader and a diagnostic with a constant value. A cell asserting their absence would depend on nothing. The suite's existing FLASH-line cells prove the line still forms. |
| D4, D5, D7 | Their subjects were no-ops before the deletion, so no behaviour changes and no witness can distinguish before from after. `NOOWNEDPANE` covers the only way they could become live again. |
| D6 | A device-log format change, not an invariant. §4's note records it; nothing depends on it. |
| D12 | Covered by `MOVERSHAPE`. |
| D13–D17 | Held by the anchors gate, the full mutation sweep, **and `node tools/source-gate-sweep.mjs`** — three registries, not two ([F2]); §8's closure note records why the first alone is not enough. |
| **C1 (§4a)** | Held by the existing `test/swipe-model.test.js`, which reddens by construction on the moved hash. **No new cell is owed for the HASH and none would help:** nothing can mechanically distinguish a re-verified pin from a pasted one, so exit item 5 is correctly a discipline. |
| **C2 (§4a)** | ⭐ **MECHANIZED at [R3], and COMPLETE at [G1] — one new assertion over two tokens, not a read-through.** The round-1 revision argued no cell would help; that was right about the hash and **wrong about the consequence**, and `:471` is the standing proof — an enumeration short by one, missed while reading the two lines beneath it. `test/swipe-model.test.js` already reads the rendered output (`assert.equal(lf(gen.render()), committed)`), so a sibling assertion goes beside it: **the rendered model contains no occurrence of `orphan` and none of `ghost`, both case-insensitive.** `orphan` catches four of C2's five sites (`:234`, `:431`, `:471`, `:473`); `ghost` catches the fifth (`:416`), which is the only site either token misses. **Verified false-positive-free at HEAD:** `ghost` occurs at exactly one line of the rendered model (`:134`) and at exactly one line of the generator (`:416`), and both are that same site — so the pair is complete, minimal, and green the moment C2 is done. Both tokens are this campaign's retired concepts, which is the assertion's authority, and it names that authority in its message so a future reader who legitimately needs either word meets a conversation rather than a chore. **Five of five sites mechanized; nothing in C2 is left to a read.** |
| **C3, C4 (§4a)** | C3 is held by running the tool (§11). C4 is a probe field with a constant value — D3's argument, and nothing depends on it. |
| **C5 (§4a)** | Held by `M1WRITERSET` itself, in the strongest form available: after the re-derivation its Direction-3 group count reddens if **either** document-scroll writer vanishes, which is the property the merge was chosen to preserve. No new cell is owed — the gate that found the fracture is the gate that holds the repair. The re-derivation is verified by step 5b, where the trial's failing set must no longer contain it. |

**The purge file's own hazard, stated because this project has been bitten by it — and narrowed at
[F10] to the part that is real.** The recorded hazard is that a gate naming its own forbidden token
in a scannable form greens a dirty tree by matching itself. **Here it does not arise**: the scan walks
`js/` and the gate lives in `test/`, so it cannot match itself under any resolution rule, and the
registered token literals are out of scan scope for the same reason. The round-1 revision required
self-exclusion "by file identity"; as specified that clause guards nothing, and an inert clause in the
header of a gate whose header IS its specification is how a later reader concludes a hazard was
handled when it was never present. **The clause is replaced by the statement of what actually holds:
the token registry is data the scan reads, never text the scan walks, and that is true by the scan's
scope rather than by an exclusion.** If the scope ever widens beyond `js/`, the exclusion becomes owed
and must be added with a fire drill of its own.

**What does the work is the fire drill, and it is an acceptance condition, not a suggestion.** Every
one of the three cells' failure paths must be **driven and observed to fire** before the file is
accepted — a positive control (a synthetic source containing the token in the matched form) and a
negative control for **every exclusion the rule states**, not one per cell [R4]. A rule states two
exclusions; a drill exercising one leaves the other where every specified control still passes:

| Cell | Positive control | Negative controls — **both** are required |
|---|---|---|
| `NOGHOSTCLASS` | a class write whose value contains the token | a selector query naming the class (a read, not a write) |
| `NOOWNEDPANE` | the tag as a string literal, in each of the three quoting forms | the bare token **in a comment**, and the bare token **inside an identifier** (`ownedPaneCount`) |
| `NOCLB` | the identifier in code position | the identifier **in a comment**, and the identifier **inside a string literal** |

**`MOVERSHAPE`'s layer is CONFIRMED as source-structural, not respecified.** The round-1 row said
"drive a real gesture on the app harness and assert the recorded mover key set" — **that fixture is
not constructible**: `d.movers` is module-private and `window.PBSwipeSession` exposes only `{id,
dragging}`. The two admissible answers were to add a runtime observer for `d.movers`, or to assert
over source. **Source, and the reason is this pass's own subject:** adding a production observer to
serve a test adds exactly the kind of surface this pass exists to remove, and it would be a field
whose only consumer is a test — which Rule R (§6) forbids one section earlier. The source form is the
same kind the parent plan's `MOVERHASBOX` and `PAGEISVIEW` already use and its two mutants are
textual edits to the adapter expression, so they bite. ⚠️ **Honest limit, and how it is bounded:** a
source assertion cannot see a key attached elsewhere at runtime. The `base` half is therefore *also*
covered behaviourally — the existing filmstrip cells assert the incoming mover carries a signed
offset — so a dropped `base` is not source-only evidence. The `own` half has no behavioural witness by
construction, because after D12 nothing reads it; that is the point of deleting it.

⛔ **[N1] The row's behaviour sentence is NARROWED to the expression, because the lifetime claim it
used to make was measurably false and this pass never built it.** The old sentence said the mover
"carries … no third key so a dropped or an orphaned key cannot ship silently" — a claim about the
recorded object over its whole life. The fixture sentence one cell to its right commissions
something strictly narrower: a source assertion over the adapter *expression*. **Re-measured here by
execution, not by reading, at HEAD `fb191bc`:** leaving the `toMover` literal untouched and rewriting
the single existing line `for (const m of d.movers) …` in place so that each recorded mover gains a
third key after construction ships **884 tests, 883 pass, 0 fail, 1 skip — UNCAUGHT**. The two
witnesses that catch the *inserting* form — the swipe-model region fingerprint and the anchors gate —
witness text having MOVED, not the property, so a line-neutral edit evades both;
`tools/dead-return-fields.mjs` cannot reach it either, because the session mover is an internal
object and that tool is scoped to registered seam returns by construction. **A cell whose stated
claim is false is worse than an absent cell, because an audit reads it as covered** — so the sentence
is brought down to what the cell witnesses and the stronger invariant is scheduled rather than
implied (§13 decision 22, §14). The row's layer field is corrected in the same edit under decision
16: the cell spans two layers and naming only the app-harness half was true, checkable and
incomplete, which is the failure mode that survives indefinitely.

⛔ **Both `NOOWNEDPANE` and `NOCLB` need comment-and-string discrimination, and they need OPPOSITE
halves of it — the round-2 claim that `NOCLB` was the first and only such gate is FALSE and is
corrected here.** `NOOWNEDPANE` matches a string literal and must not match a comment, and
`js/app.js:386` carries the token inside a comment today, so the rule's own negative control is live
at HEAD rather than hypothetical. `NOCLB` matches code position and must match neither. Neither is
served by raw-text scanning, which is all `test/no-view-clone-gate.test.js` has ever needed. **One
shared, fire-drilled primitive serves both** — two ad-hoc scanners would double the surface on which
the failure below can hide, and the two rules together exercise it from both sides, which is stronger
evidence than either alone. Its characteristic failure is **over-stripping**: a `//`
occurring *inside* a string literal swallowing the rest of the line, which blinds the scan **after**
that point while both controls still pass, because controls appended to a clean file never sit behind
the blind spot. So the fixture is specified, not left to the author: **the positive control is placed
after a line containing a string that itself contains `//`.** A drill that cannot catch its own
scanner's failure mode is the same defect the drill exists to repair, one layer in.

Writing an assertion whose failure path is never executed is the defect being repaired. A related
recorded failure applies to the implementation: a counting idiom can exit nonzero while printing zero,
so the pass/fail decision is taken from the collected site list, never from an exit code.

**And `NOOWNEDPANE` is the weaker of two guards, not the sole one — stated because D8 reads otherwise.**
`NOGHOSTATALL` already asserts that no constructed mover carries the retired tag, across all eight
structural cases, and that behavioural assertion is immune to the concatenation residual a textual scan
discloses. D8's "held structurally by `NOOWNEDPANE`" should be read as the textual belt over that
behavioural brace.

## 11. Sequence, owners and the exit condition

**No step depends on a later one.**

| # | Step | Owner | State |
|---|---|---|---|
| 1 | Stress this plan; verdict forge / temper / scrap. | the plan reviewer | **DONE — FORGE at round 3.** r1 TEMPER (`…-1ced95d.md`), r2 TEMPER (`…-5a1d977-r2.md`), r3 **FORGE** (`…-157a2e1-r3.md`); all folded, G1–G3 non-blocking and applied. The deletion set moved in none of them. |
| 2 | `PLAN-swipe-declone.md` §13 step 10b — the device gate on the shipped Stage-2 form. | the user | **DONE — all six items PASS on build `.306`, 2026-08-04.** It gated everything below and no longer does. |
| 3 | Strike this plan's promise: **"every item in §4 is unreachable at HEAD, and the §5 collapse changes no behaviour."** Aim at the reachability claims, not at the deletions. | the adversary | **DONE 2026-08-05 — the promise HELD; one fracture, in the co-change enumeration, folded as §4a C5.** `Claude/Loki/PLAN-swipe-declone-stage2-subtraction-strike-2026-08-05.md` |
| 4 | Close coverage-audit **M2** — the `pageElFor` throw cell and its `keyFor` sibling negative. Independent of this pass and owed either way. | the test author | **DONE** — filed with the red suite (`Claude/Curie/RED-swipe-declone-stage2-subtraction.md`) |
| 5 | **DONE 2026-08-05** (`b2327f5`): 884 tests, 880 pass, three intentional red-first cells and nothing else, against an 849/0 baseline. Every mutant executed **individually against its target file** — with three cells red at HEAD a whole-suite sweep reports CAUGHT for the wrong reason on everything. Author the nine §10 cells red-first, with the purge file's fire drill — positive **and** negative controls — run and recorded. `MOVERSHAPE`, `NOGHOSTCLASS`, `NOOWNEDPANE`, `NOCLB` and `DESTROYEDMOVER` are new; `RECOVERYPARITY` and `PILLSWEPT` are new; `BORROWEDREALSURVIVES` is the relocated `BR` with a replacement mutant; `STALETOUCH` is the existing stale-event cell re-anchored. ⛔ **There is no key-completeness cell to migrate** — it was deleted in step 10. | the test author | done |
| 5b | ⭐ **The collapse-applied TRIAL RUN — measure the blast radius before the commit, do not enumerate it.** Apply §5's collapse in memory and run the whole suite: `COLLAPSE=1 NODE_OPTIONS="--require ./Claude/Loki/probe-stage2-subtraction-transform.js" node --test test/*.test.js` ⛔ **relative, not `$PWD`** — under MSYS `$PWD` expands to `/c/…`, which Node cannot resolve, so the transform silently fails to load and the trial reports a clean radius it never measured. Verified: the relative form loads. **The set of failing tests must equal §4a plus §8's declared radius, item for item**; a failure the plan does not name is a fifth instance of R10 and is folded before step 6 starts, not repaired inside it. | the builder | done |
| 6 | **The subtraction — ONE commit.** D1–D17 together, plus **§4a's four co-changes**, plus the purge file, plus both regenerated inventories. Bump the build. **Edited in the SAME commit:** the frozen spec; `test/mutation-anchors.test.js`'s subjects in `tools/mutate.mjs`; **`test/swipe-model.test.js`'s `VERIFIED.supersession` and its new no-`orphan` assertion; `tools/gen-swipe-model.mjs`'s FIVE ORPHAN prose sites; `tools/source-gate-sweep.mjs`'s `begin/supersession` re-anchor AND its `transition branches` entry deletion; `test/mutation-anchors.test.js`'s `KNOWN_ROTTED` exemption; the three stale fingerprint records (§4a C3 consequence 2); **`test/scroll-writer-set.test.js`'s `M1WRITERSET` baseline entry #10 and the three prose sites the collapse falsifies (§4a C5)**; `tools/fuzz-ui.js`'s ghost field** — every one of these rot checks reddens otherwise, **and step 5b is what proves the list is now complete rather than merely longer.** | the builder | done |
| 7 | **Device re-confirm** (`PLAN-swipe-declone.md` §13 step 11b): `browse→browse` commit and abort, plus the four Stage-1 transitions. Short, and run anyway — the form device-tested is the form that ships, and this commit changes the shipped form even where it cannot change behaviour. | the user | 5 of 6 PASS 2026-08-05; item 5 (>600-item list) DEFERRED, no fixture on the device |
| 8 | Review the commit; audit the suite; then the records scrub — this plan's status, the parent's §12/§13, the campaign manifest's falsified `note`, the board, the decision log. | the code reviewer, then the coverage auditor, then the assistant | done (review+audit); scrub in this commit |

**Why step 2 gated step 6 — recorded now that it is discharged, because the reason is the transferable
part.** Had the device gate on the shipped Stage-2 form failed, the cheapest repairs available were
precisely the branches this pass deletes — the abort re-render and the held reveal. Subtracting first
would have converted a revert into a re-derivation. It passed on all six items, so **nothing is being
retained as insurance** and every item in §4 is admitted on its own proof rather than on doubt about
the stage beneath it.

**Exit condition.** All of the following, and the last three are additions at [F1], [F2] and [F3]:

0. ⭐ **Step 5b's measured radius equalled the declared one** — the trial's failing-test set matched
   §4a plus §8 item for item, with any surplus folded into the plan before step 6 began. This is the
   item that closes R10, and it is listed first because it is the only one that runs *before* the
   commit rather than after it.
1. Every §4, §4a and §8 item is discharged in HEAD, each admitted on a stated proof.
2. The nine §10 cells are green; each purge cell has been **observed to fire** on both its positive
   and its negative control.
3. The full suite passes and the **full mutation sweep** is clean, with no `*.mutbak` anywhere in the
   tree.
4. **`node tools/source-gate-sweep.mjs` exits 0 with EVERY entry anchoring** — the second anchor
   registry, invisible to the behavioural sweep, and the one carrying the supersession fingerprint's
   only mutation evidence. ✅ **Satisfiable as of [R1]:** the `begin/supersession` entry is re-anchored
   and the `transition branches` entry is deleted as the tombstone of a mirror retired at stage 4, so
   the tool has no rotted entry left. `test/mutation-anchors.test.js`'s `KNOWN_ROTTED` map is empty in
   the same commit — that gate reddens on a stale exemption, so the discharge is structural.
5. **`test/swipe-model.test.js` is green with `VERIFIED.supersession` moved behind a line-by-line
   re-verification recorded in the build log** — not a re-hash. A green from a pasted hash does not
   satisfy this condition and is the single most likely way step 6 goes wrong. Nothing can mechanize
   this half, which is why item 6 mechanizes the consequence instead.
6. **The rendered swipe model carries neither an `orphan` token nor a `ghost` token**, asserted by a
   new cell in `test/swipe-model.test.js` beside the one that already compares the rendered output —
   **not** by a read-through [R3, G1]. The two tokens together cover **all five** C2 sites, and both
   are verified false-positive-free at HEAD, so no part of C2 rests on reading a 500-line generated
   document. Both generated inventories otherwise agree with source.
7. The build number moved.

## 12. Risk registry

- **R1 — the `.nav-ghost` reachability argument is wrong, and the §5 collapse silently inverts
  `resetScroll` on the orphan path.** The highest-consequence risk in the pass, on the exact axis
  (`#home`'s scroll at a reveal) this campaign has already shipped a defect on. Mitigated
  structurally by `NOGHOSTCLASS` and prosecuted by step 3. Residual: a class name assembled at
  runtime, which no textual gate can see.
- **R2 — a deleted cell was the only witness of a behaviour that SURVIVES.** ⚠️ **This risk already
  materialised once, inside this plan, and was caught by review rather than by the plan's own pass.**
  The round-1 revision named `OB-home` as the single instance and missed two more of the same class:
  `DEC` (the recovery path sweeps the pill float) and `BR` (the borrowed-real views survive a
  supersession). Both behaviours survive; only their rationales died. They are re-homed at §8 D14b and
  §10 [F5]. The lesson is that the "is this a redundancy or a witness?" question has to be asked
  per-cell against the *behaviour*, never against the mechanism the cell's comment cites — the two had
  come apart in exactly the cells this pass deletes. The unknown instances remain the coverage
  auditor's per-assertion account, and that account runs **after** the build, which is why the known
  ones are named here.
- **R3 — the fingerprint pin is greened by a re-hash instead of a re-verification [F1].** ⭐ **Replaces
  the retired rollback-surface risk** (step 10b passed, so nothing is held as insurance). Step 6's
  commit lands red on `test/swipe-model.test.js` first — before any of the twelve deletions surfaces —
  and the cheapest way to green a hash mismatch is to paste the new hash. That is precisely the weak
  link the frozen model exists to close, and it would ship a generated model still documenting a
  branch the same commit deleted. Mitigated by making the recorded re-verification an exit condition
  (§11 item 5) rather than a step, and by putting the generator's prose on step 6's list (§4a C2).
- **R4 — a mutant is de-registered whose subject actually survives.** The anchors gate proves an
  anchor still matches; it does not prove the mutant still bites. Step 6's exit requires the **full
  sweep**, not the anchors gate alone.
- **R5 — the purge gate is written so it cannot fire, or is narrowed until it cannot see a real
  re-introduction [F3].** Two distinct failures with one cause: an unspecified match rule. The second
  is the likelier and the quieter — an author who meets a red `NOOWNEDPANE` at step 5 cannot tell a
  working fixture from undeleted residue, and the cheapest resolution is to narrow the match, leaving
  one gate that resolves *writes* beside one that matches *strings*. Addressed by §10 stating each
  cell's resolution explicitly, by D16b scrubbing the residue on its own merits so a red cannot be
  ambiguous, and by the fire drill's **negative** control making the chosen rule an executed fact.
- **R6 — `node tools/source-gate-sweep.mjs` is never run, and its rot surfaces the next time someone
  needs the supersession fingerprint's mutation evidence [F2].** Which, on the standing pattern, is
  the moment they can least afford it. Addressed by §11 exit item 4. ⚠️ **This risk was live in the
  other direction too and is now closed [R1]:** the exit item as written in round 1 could not be met
  at HEAD, so the builder would have met an unattributable red at the end of a fourteen-item commit
  and — by R5's own pattern — dropped the exit item, retiring the protection in the commit that added
  it. Both entries are now dispositioned.
- ⭐⭐ **R10 — the co-change ENUMERATION is the thing that keeps being incomplete, and only execution
  has ever caught it.** Three instances of this plan's own named class ("a deletion list is not the
  same thing as a blast radius"): round 1 found the frozen model and the source-gate anchor, round 2
  found `gen-swipe-model.mjs:471`, and the adversary found `M1WRITERSET` entry #10. **Each round
  declared the set complete, and each was wrong.** The first two were found by reading and the third
  only by running the collapse — and the third is the one that made an exit condition unsatisfiable.
  The structural answer is §11 **step 5b**: apply the collapse in memory, run the suite, and require
  the measured radius to equal the declared one. It is a **precondition** of step 6 rather than an
  exit item of it, because the value is finding the radius before the fourteen-item commit, not
  confirming it after — as an exit item it would merely duplicate "the suite is green". ⚠️ **Honest
  limit:** the instrument encodes §5's collapse plus the D9/D11 surfaces it rides on, not all twelve
  deletions, so it measures the radius of the *collapse* — which is where this class has bitten four
  times out of four.

  ⭐⭐ **RULING, asked for explicitly and given so the next campaign inherits it: step 5b is NECESSARY
  and NOT SUFFICIENT, and the co-change list should stop being authored by hand.** The evidence is no
  longer anecdotal. Four passes, four misses, each after a round declared the set complete; instance
  four sat on a line instance three had already identified; and **the hand report of instance four
  itself missed two more**, which this fold found only by deriving the set mechanically. That is five
  hand enumerations of one list, five times incomplete, including two by readers who were looking
  specifically for the thing they missed. The failure is not attention — it is that a list written
  once cannot stay complete while the tree moves underneath it: `S2-31` and `S2-32` did not exist when
  this plan was written, and no amount of care at authoring time could have named them.

  **What step 5b does and does not buy.** It moves the discovery from inside a fourteen-item commit to
  before it, which is a real and sufficient answer *for this pass*. It does **not** make the plan's
  list correct — it makes the list's incorrectness cheap and early, and it still requires a human to
  reconcile "what failed" against "what was declared".

  **The durable answer, ruled but deliberately not built here: the co-change list should be DERIVED
  and the plan should carry the derivation, not the enumeration.** A tool applies the declared
  transform, emits the set of surfaces that break, and a check requires the committed list to equal
  the derived one — the same shape as every other derived inventory this project already trusts over
  a hand-written one (the transition matrix was hand-written twice and wrong both times; the
  scroll-writer set and the clone gate are both derived). The prototype exists: the measurement in §8
  D13d is that tool for the anchor registry, and it needed its own control pass to be trustworthy.
  Routed in §14 with its owner and consumer, because building it inside a subtraction pass would be
  the scope error this plan has refused four times already.
- ⭐⭐ **R9 — every reachability proof in §4 has been confirmed by READING, three times, and this
  campaign's record is that four such readings were settled only by execution.** ✅ **Materially
  reduced 2026-08-05, and by execution rather than by another reading.** The adversary drove six
  scenarios into the recovery and the handle was non-null every time; the collapsed variant's
  unconditional read — which throws on null — never threw across that battery or the 849-test suite;
  the `resetScroll` axis was identical in both forms; and **the control fired**, an injected ghost
  taking the orphan branch at HEAD and diverging completely under the collapse, so the negative is
  evidence and not silence. The orphan input is constructible only by injection. **What remains** is
  the residual this plan has always disclosed — a class name assembled at runtime, or a non-first-party
  injection — which is outside every instrument available here, and the fingerprint re-verification
  (exit item 5), which stays the one load-bearing step with no mechanism behind it. Retained rather
  than closed, because a promise held under the strikes that were run is exactly that and no more. The
  gates now cover a great deal: `NOGHOSTCLASS`, `NOOWNEDPANE` and `NOCLB` hold the textual claims
  structurally; `NOGHOSTATALL` holds the behavioural one; exit item 6 is fully mechanized at [G1];
  exit item 4 is satisfiable at [R1]. **Exit item 5 — the fingerprint re-verification — is now the
  one load-bearing step in the pass with no mechanism behind it**, and it is load-bearing precisely
  over §5's collapse, the edit whose safety rests on a reachability reading. Three review rounds
  raised the cost of a wrong reading without changing its likelihood, because reading is what has
  been wrong before. **The adversary was commissioned against exactly that at step 3, and the
  behavioural half came back held under execution** — which is why this risk is now a residual rather
  than an open question. A plan could not have closed it; handing it to the seat that settles
  questions by running them is what closed the part that could be closed.
- **R8 — a mutant is registered for an assertion it cannot exercise [R2].** The pass registers
  eighteen mutants and one of them was already this shape after one round of review. Two structural
  answers rather than more care: a mutant's registration states the *mechanism* it perturbs and not
  just the effect it hopes for, and where a cell has several assertions the one a mutant targets is
  split into its own named test so the sweep's `killed by:` line settles attribution instead of a
  reader settling it.
- **R7 — the device-log format change (D6) is noticed later as a regression.** Low, and cheap to
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
7. **Each purge cell's match rule is chosen to fit what its token IS, not applied uniformly [F3].**
   The review posed two readings — bare token or quoted literal — and both are wrong as a blanket
   rule: the first reddens on comment residue, the second is strictly weaker than `NOGHOSTCLASS`,
   which resolves the *write*. The tokens are three different kinds of thing, so they get three rules.
   **`nav-ghost` is a CSS class** ⇒ resolve the class write. **`owned-pane` is a tag VALUE** ⇒ match a
   string literal in any quoting form whose content is exactly the tag, which catches both the inline
   form and the named-constant form, because the literal has to exist somewhere for a mover to carry
   that value. **`clobbered` / `sourceWasClobbered` are IDENTIFIERS** ⇒ match a code-position
   occurrence, outside comments and strings, so that a comment explaining why the concept was retired
   — exactly the record that *should* survive — does not redden the gate. Each rule's residual is the
   same one `NOGHOSTCLASS` already discloses: a value assembled at runtime from fragments escapes a
   textual scan, and no textual scan can close that.
8. **`BR` is relocated, not deleted; `DEC`'s behaviour is re-homed onto `RECOVERYPARITY` [F5].** The
   rule that decides it is §8's own, applied to the *behaviour* rather than to the comment: an
   assertion survives when what it asserts survives, even when the mechanism its rationale cites is
   the thing being deleted. `BR` moves into `test/swipe-stage6.test.js` beside the other supersession
   cells and gets a replacement mutant against the mechanism that now guarantees the property.
9. **The new purge file is NOT added to the mutation sweep's source-text-gate exclusion list [F8].**
   That list is for gates that fail under every mutation by construction; these three fire only on a
   mutant carrying their own token. Excluding them would make their three ADDITIVE mutants report
   UNCAUGHT — a false clean of exactly the kind the exclusion list was built to prevent.
10. **The purge file's self-exclusion clause is dropped as inert and replaced by the true statement
    [F10].** The scan walks `js/`; the gate lives in `test/`; it cannot match itself under any rule.
    An inert clause in a header that IS the specification teaches a later reader that a hazard was
    handled when it was never present. What is retained — and made an acceptance condition — is the
    fire drill, which is the part that does work.
11. **`tools/source-gate-sweep.mjs`'s `transition branches` entry is DELETED, not re-anchored, and no
    per-entry `file` field is added [R1].** The fingerprint it evidences was retired at stage 4 by the
    same commit that moved the predicate (`test/transition-matrix.test.js:42-47`), so the entry is a
    tombstone of a retired mirror and nothing becomes unevidenced. Its three surviving records — the
    gate file's own stale header, the tool's header, and the sweep exclusion's reason — are corrected;
    the exclusion **entry** stays, because that gate still derives from `js/nav.js` source text and
    only its stated reason was false.
12. **A tombstone survives; a live description of deleted code goes [R6].** A comment naming a retired
    symbol, its authority and why it is gone is the record `NOCLB`'s code-position rule exists to
    protect, and deleting one while quoting that principle in the same plan is a contradiction. The
    rule takes three sites back off D16b's list and makes `js/app.js:798`'s retention principled.
13. **Where a cell's assertions are killed by different mutants, the targeted assertion is its own
    named test [R2].** The sweep reports a killing test, not a killing assertion, so a multi-assertion
    cell cannot attribute a kill. The precedent is this project's own park-distance work, which split
    a cell into eight named tests for exactly this reason.
14. **Exit item 6 is mechanized over TWO tokens and is complete; exit item 5 cannot be mechanized and
    stays a discipline [R3, G1].** Nothing can distinguish a re-verified fingerprint from a pasted
    one, so the pin stays procedural. Its *consequence* — a generated model still describing a deleted
    branch — is a token scan over text a cell already reads. `orphan` covers four of C2's five sites
    and `ghost` covers the fifth; both are verified false-positive-free at HEAD, so **no part of C2
    is left to a read**. The standing law is that where a rule can be made structural it is made
    structural, and a five-site enumeration that was short by one after a careful read is the evidence
    that a read is not a check. ⚠️ Adding the second token was a **one-word** change that closed the
    last unmechanized site; the round-2 revision had stopped at "four of five, and saying which is the
    point", which is honest disclosure standing in for an available mechanism.
15. **The sweep-exclusion list has ONE criterion, and it is the measured one [G3].** *Does the gate
    redden on mutations unrelated to its own subject?* — not *does it redden on every mutation*, which
    is what the list's header says and what its own `scroll-writer-set.test.js` entry disproves by
    citing a specific unrelated mutant. Under the measured criterion, decisions 9 and 11 stop being
    two rules and become one applied twice. The header is corrected in the same commit.
16. **A gate-exclusion reason names every channel by which the gate can fail, not the first true one
    [G2].** The corrected transition-matrix reason names both the `js/nav.js` source-text derivation
    and the `js/swipe.js` `require` at generator load, the latter being the channel registered mutants
    actually travel. **This is the generalization of [R1]:** a reason that is true, checkable and
    incomplete survives indefinitely, because every reader who checks it finds it true. Incompleteness
    is the failure mode that hides; falsity is the one that gets caught.
17. **`M1WRITERSET` entries #10 and #11 become one shared-text GROUP; no textual distinguisher is
    manufactured [the strike].** Post-collapse the two document-scroll writers carry identical text,
    and the group-count direction — which the gate already ships and which was built for exactly this
    — still reddens when either vanishes. What is lost is per-site attribution in the failure message,
    and that is disclosed and partly repaired by naming both candidates in the message rather than
    hidden. **Rejected: a trailing comment to restore the nesting** (a comment written to satisfy a
    gate is the compensating-constant shape, and it would make an innocuous edit redden a gate whose
    header forbids the cheap repair) and **keying by enclosing function** (the better gate, rejected
    as scope not as design — new derivation machinery at the end of a fourteen-item commit; deferred
    with its consumer named in §14).
18. **The blast radius is MEASURED before the commit, not enumerated [the strike].** §11 gains step
    5b: apply §5's collapse in memory, run the suite, and require the failing set to equal the
    declared radius item for item. Three instances of one class, each after a round that declared the
    set complete, and the third — the one that made an exit condition unsatisfiable — found only by
    running it. The instrument is safe enough to be a step: it transforms at load time, **writes
    nothing to disk**, and **refuses to run if any anchor is missing or non-unique**, so it cannot
    pass vacuously. It is a precondition of step 6 rather than an exit item of it, because as an exit
    item it would only duplicate "the suite is green" and would find the radius at its most expensive
    moment.
19. **Two byte-identical mutation entries are merged into one naming both designated killers [step 5].**
    They are not an anchor ambiguity — the text occurs once, so the uniqueness gate passes them
    legitimately — but they produce identical source and therefore identical `killed by:` lists, so
    neither entry's designated killer is distinguishable from the other's. That is decision 13's
    attribution hazard living in the registry rather than in a cell, and it costs a full suite run per
    duplicate on every sweep.
20. **`MOVERSHAPE` asserts over source, not over a runtime observer [step 5].** The session movers are
    module-private and the alternative was to add a runtime observer for `d.movers` — a production
    field whose only consumer is a test, which Rule R forbids one section earlier and which adds
    exactly the surface this pass exists to remove. The `base` half is additionally covered
    behaviourally so the cell is not source-only where a behavioural witness exists.
21. **A fixture route variant is not a mutant [step 5].** `DESTROYEDMOVER`'s row named three mutants
    where two were "drive a different destruction route" — which mutates nothing and would report
    CAUGHT without ever being applied. Re-derived to one mutant per ASSERTION over three route
    coordinates. The general rule: a mutant edits source; anything that edits only the fixture is a
    coordinate, and counting it as a mutant inflates a coverage claim with something that cannot fail.
22. **`MOVERSHAPE` claims the adapter EXPRESSION, not the recorded mover's lifetime; the lifetime
    invariant is deferred with its consumer named [coverage-audit r2 N1].** The row's two sentences
    disagreed about scope and the behaviour sentence was the larger one, so it is narrowed to the
    fixture's scope rather than the fixture grown to the behaviour's. Four grounds, and the first two
    are this plan's own rulings applied consistently rather than new reasoning:
    - **Decision 20's ground forbids the occupant here.** Decision 20 ruled `MOVERSHAPE` over source
      because adding production surface to serve a test "adds exactly the kind of surface this pass
      exists to remove". The measured occupant — `Object.freeze` on the adapter literal — is
      production surface added to serve a coverage claim. Admitting it would reverse decision 20
      inside the same plan, and the new ground that would justify reversing it does not exist.
    - **Decision 17's precedent governs the timing.** A *better* gate was deferred there "as scope not
      as design — new derivation machinery at the end of a fourteen-item commit". This is the same
      shape: a real improvement arriving after its commit closed.
    - **The occupant is INERT, not loud, and that is measured rather than argued.** `js/app.js` is a
      classic script (`index.html:263`, no `type="module"`) with no `'use strict'`, so it is
      non-strict and a write onto a frozen mover silently no-ops. Measured at HEAD `fb191bc`: the
      freeze alone reddens exactly two tests, both by design — the anchors gate (three registrations
      anchor that exact line) and the emitted-key-set cell's own fixture-sanity assertion; **and with
      the offending post-construction write stacked on top of the freeze the failing set is
      identical**, so nothing throws and no behavioural cell fires. The occupant therefore does not
      make the defect visible; it makes it silent. It is the right occupant, and it is only sound
      when it arrives together with a source assertion pinning the `Object.freeze(` wrapper itself,
      because a later removal of the wrapper otherwise re-opens the route with nothing reddening.
    - **The pass is closed and the shipped form is device-gated.** §11 step 7's own rationale is that
      "the form device-tested is the form that ships". A freeze changes the shipped form, so
      commissioning it re-owes a device confirm that stands at 5 of 6 PASS with one item deferred for
      want of a fixture, and costs three mutation re-anchors and a re-review besides. That is not the
      smallest sound thing.
    **This is a narrowing, not a retreat into vigilance.** The standing law is that where a rule can
    be made structural it is made structural; §14 gives the invariant a scheduled structural home with
    an owner, a trigger and a measured design, which is that law applied at the right commit rather
    than abandoned.
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
  to `tools/mutation-sweep.mjs`, not to the swipe. ⚠️ **The deferral now has a stated cost [F9]:**
  after the pass, `S2-23 NOGHOSTATALL`'s `killed by:` list gains `NOGHOSTCLASS` and `NOOWNEDPANE`,
  because its replacement text injects both retired tokens into `js/swipe.js` and the new gates scan
  that file. Nothing breaks — a caught mutant stays caught — but `NOGHOSTATALL`'s evidence stops being
  uniquely attributable to `NOGHOSTATALL`, which is the "reddens for the wrong reason is
  indistinguishable from working" hazard this plan already records for `stage6i SCOPE`. The
  compensating measure costs one line and is in scope: the expected killer set is written into
  `S2-23`'s registration comment in the same commit (§8 D13c).
- ⭐ **The DERIVED co-change list — a tool that applies a declared transform and emits the surfaces
  that break.** Owner: the planner, as tooling; the R10 ruling is its justification and this plan is
  its fifth piece of evidence. **Consumer:** every future plan that deletes a branch — starting with
  Stage A2 and Stage B, both of which touch shared surfaces. The prototype is §8 D13d's measurement
  (apply the transform in memory, test every registered anchor, control on pristine source first);
  generalizing it means widening the surface set beyond `tools/mutate.mjs` to the other registries and
  emitting a list a plan can carry verbatim. **Deliberately not built here** — building a general
  derivation tool inside a subtraction pass is the scope error this plan has refused four times.
- **`M1WRITERSET`'s per-site attribution — keying baseline entries by enclosing function.** Owner: the
  planner, as a gate improvement. After §4a C5 the two document-scroll writers share one group, so a
  drift report names the group and not the site. The fix is real and is *better* than what the gate
  has — an enclosing-function key gives exact attribution and, unlike `file:line`, does not rot on an
  edit above it. It is deferred because it is new derivation machinery in a gate this pass otherwise
  only re-registers, at the end of a fourteen-item commit. **Consumer:** the first task that needs to
  know *which* document-scroll writer vanished; until then the group count still says *that* one did.
- ⭐ **The recorded mover's key set closed for its LIFETIME, not only at its construction expression
  [coverage-audit r2 N1].** Owner: the planner, as a contract guarantee; the build and the test author
  execute it. `MOVERSHAPE` witnesses the one adapter expression (§13 decision 22); a key attached to a
  recorded mover *after* construction ships uncaught, measured at HEAD `fb191bc` at whole-suite scope.
  **Trigger — the one condition that makes this owed rather than optional:** the next change that
  writes to a member of `d.movers` outside `toMover`, or that threads any new value to the settle
  path. The coverage audit's forward read names that as the likeliest coordinate for the next
  externally-found defect, so this deferral is a scheduled gate and not a backlog line.
  **Consumer:** that change's own coverage model, which cannot claim a closed key set without it.
  **The design, MEASURED here so it is inherited rather than re-derived, and it is TWO parts that must
  land together:**
  1. **Build** — wrap the adapter literal: `const toMover = (m) => Object.freeze({ el: m.element,
     base: baseOf(m.slot) });`. Behaviour-neutral to the whole suite; the only two tests that redden
     are the anchors gate (three registrations in `tools/mutate.mjs` anchor that exact line and are
     re-anchored in the same commit) and the emitted-key-set cell's fixture-sanity assertion, whose
     anchor `const toMover = (m) => ({` stops matching — the reader detecting rot, working as designed.
  2. **Test author** — the source assertion must ALSO pin the `Object.freeze(` wrapper, with the
     wrapper's deletion registered as its mutant. ⚠️ **Without part 2, part 1 is unguarded**: the file
     is non-strict, so the freeze silences the offending write instead of throwing, and a later
     removal of the wrapper re-opens the route with nothing reddening.
  ⛔ **Neither part is sound alone.** Shipping the freeze without the pin buys silence and no witness;
  shipping the pin without the freeze pins a wrapper that is not there.
- **Addendum A9 — the read-after-`applyScreen` invariant holds only on non-throwing paths.** A
  comment correction; the code review already owns it.
- **`text-size-adjust`, the additive-overlay premise, the two disagreeing host vocabularies.** Named
  in the parent plan's §17 as deliberately not acted on. Unchanged.
