<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:474-487","js/app.js:601-617"],"callee_ranges":[]} -->

<!-- NOTE on the declaration. boundary_relocation is false because nothing moves: every item is
     removed and nothing takes its place. The two declared source_ranges are the two regions this
     review traced value-by-value (the recovery collapse and the L3 adapter + capture block); they
     are declared so the adapter checks run over them, not because ownership relocates. -->

Type: plan-review

# Charpy — PLAN-swipe-declone-stage2-subtraction (declone Stage 2, step 11: the subtraction pass)

Verdict: **TEMPER** — every reachability proof holds; three surfaces that must change in the single
commit are in no list in the plan, two scan resolutions are unspecified, and two deleted cells are
the only witnesses of behaviours that survive.

Target: `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md`, at git HEAD **1ced95d**.
Reviewed: 2026-08-04. Read-only on the plan, on `js/`, on `test/`, on `tools/` and on every other casebook.

Note on the plan's own baseline: §4 states its line numbers are against HEAD `b539f71`. HEAD is now
`1ced95d`; `git diff b539f71 1ced95d -- js/ test/ tools/ css/ docs/` is empty except two added files
(`test/shipping-change-bumps.test.js`, `tools/hooks/shipping-change-bumps-check.mjs`), so every line
citation in the plan still resolves. This review is against `1ced95d` and re-derived every citation.

## Applicability

- **defining_records: true** — the plan reconciles ten records and declares two CONFLICTs and one
  GAP. Both CONFLICTs were checked against the shipped source and both hold. See `## Defining records`.
- **boundary_relocation: false** — nothing relocates. Every item is deleted from HEAD and no owner
  receives it. No ownership ledger is owed; the ownership question the pass does raise (the
  `owned-pane` kind ceasing to exist) is a deletion of a kind, not a move of a boundary, and is
  prosecuted in F3/F4 as residue rather than as a crossing.
- **callee_replacement: false** — no callee is replaced by an indirection. `paneKindOf` and its
  parameter are removed together; `resetSwipeStyles` loses a parameter but keeps its single
  implementation and its single internal call site.
- **contract_shape: true** — the L3 session mover loses `own`, so `d.movers`' recorded element shape
  changes from `{el, base, own}` to `{el, base}`. The plan states the change as a signature (§6) and
  routes key-completeness to the new `MOVERSHAPE` cell. Gate impact: the mover object is built inside
  `start()` and is not a `contract-function-gate.test.js` subject — that gate's exact-key /
  `NON_CONTRACT` machinery governs the seam return (`buildConstruction`'s two-key
  `{decorations, movers}`, explicitly registered `NON_CONTRACT` because it carries live DOM nodes),
  which this pass does **not** change. So no exact-key contract-gate entry moves, and `MOVERSHAPE`
  is the only mechanism that will hold the new two-key production shape. That is stated here because
  addendum **A8**'s point generalises: a shape the exact-key gate cannot see needs its guard named
  out loud, not assumed.

Project adapter `tomeroam-js-dom`, over the two declared ranges: the session fields crossing them are
`d.movers`, `d.ghostY`, `d.animSync` and `d.animRes` — all four named and traced below. No
`document.body.classList` mutation and no `removeAttribute('data-*')` occurs in either range (the
`np-locked` removal is at `js/app.js:624`, outside both, and is untouched by every item in the plan).

## The claim

Delete the machinery declone Stage 2 made unreachable — `dropPanes`, `disposeOwnedPanes`,
`paneKindOf`, `paneLess`, `revealPending`, the capture-recording block and its three diagnostic
readers, the four `.nav-ghost` surfaces, `keepGhosts`, the `env.scrollY` supplier, `mover.own`, and
the test/tooling residue — with each item admitted only on a stated proof of unreachability, and with
the two proofs a future edit could silently falsify converted into source-scan gates
(`NOGHOSTCLASS`, `NOOWNEDPANE`) that land in the same commit as the deletions they hold. One cascade
the parent's §12 does not name (`begin()`'s ORPHAN recovery branch and the three ternaries that serve
it) collapses with them. Seven cells, seventeen mutants, none geometric.

## Defining records

**AGREE on the deletion set, with the plan's two declared CONFLICTs both CONFIRMED against source,
its one declared GAP correctly closed — and one further GAP this review opens: the frozen swipe
model and its fingerprint pin are material defining records for the §5 collapse and appear in no
record the plan reconciles.**

Verified independently, at `1ced95d`:

| Record | The plan's call | My reading |
|---|---|---|
| `PLAN-swipe-declone.md` §12 item 14 — "the `nav.js:105` sweep line stays for the NP pill float" | CONFLICT, resolved by correcting the citation | **CONFIRMED.** `js/nav.js:104` is `function resetSwipeStyles(keepGhosts) {`; `:105` is `if (!keepGhosts) document.querySelectorAll('.nav-ghost').forEach(...)`; `:106` is `document.querySelectorAll('.np-pill-float').forEach(...)`; `:129` is `resetSwipeStyles(opts && opts.keepGhosts)`. §12 item 14 names 105 and describes 106. Following item 14 literally deletes the pill sweep and retains the ghost sweep — the exact inversion. The plan's correction is right and is load-bearing. |
| `test/swipe-stage5-residuals.test.js:88-92` — "the `own` key … is still load-bearing" | CONFLICT, the comment is FALSE at HEAD | **CONFIRMED, both clauses.** The only readers of `own` in `js/` are `js/app.js:266`, `:396`, `:698`, `:769`, and all four compare against `'owned-pane'`; the pill decoration is tagged `'owned-decoration'` (`js/swipe.js:265`) and therefore never matched by any of them. It is swept by `js/nav.js:106`, which reads a class. |
| `PLAN-swipe-declone.md` §12 item 15 — five `owned-pane` filters | AGREE on the set, CONFLICT on the count; four survive | **CONFIRMED.** Exactly four, exactly the symbols named. |
| `Claude/Mendeleev/AUDIT-swipe-declone-stage2.md` **M3** — the CLB purge gate's subject is still live | GAP, closed by re-homing into the new purge file | **CONFIRMED and authorable green.** `clobbered` and `sourceWasClobbered` occur **zero** times under `js/` at HEAD, so `NOCLB` can be written and will pass. (Its scan-resolution question is F3, not a subject question.) |
| `test/swipe-model.test.js` `VERIFIED.supersession` and `tools/gen-swipe-model.mjs`'s mirrored §5 prose | *not reconciled — the plan does not name either file* | **GAP, and it is material.** The pin covers `js/app.js` from `function begin(x, y, target) {` to `if (target.closest` — precisely §5's collapse region. The mirrored prose describes the ORPHAN branch in four places. See **F1**. |
| `tools/source-gate-sweep.mjs` `begin/supersession` entry | *not reconciled — the plan does not name the file* | **GAP, and it is material.** Its anchor is `js/app.js:428`, which D9 deletes. See **F2**. |

## Verdict

**TEMPER.** The central claim holds: every reachability proof in §4 is correct, and I confirmed each
against the thing itself rather than against the plan's prose. The `nav.js:105`/`:106` correction is
right and independently re-derived. `NOCLB`'s subject is genuinely absent. `mover.own` genuinely has
no reader left. The A2 exclusion is principled, not convenient. What the plan does not survive is its
own scrub obligation and its own R2: three surfaces that must change in step 6's single commit are
absent from every list in it (the frozen model's fingerprint pin and mirrored prose; the source-gate
sweep's only supersession anchor; the comment prose describing every deleted mechanism), the
`NOOWNEDPANE`/`NOCLB` scan resolution is left unspecified where `NOGHOSTCLASS`'s is specified and the
two readings differ in outcome, and the deleted-cell set drops two witnesses of behaviours that
survive rather than the one the plan names. None of this shatters the pass. All of it is discovered
expensively if it is discovered in the commit.

## What held under the strike — do not re-derive these

Recorded so the planner spends the tempering on the findings and not on re-proving the sound half.

- **D1 (`env.scrollY`).** The consumer-set argument is complete. `env` is built once
  (`js/app.js:560-592`) and passed to one call (`js/app.js:596`). Every `env.` read in the whole of
  `js/` is in `js/swipe.js`: `env.document` (216), `env.navPill` (221), `env.sourceEl` (251),
  `env.renderDestination` (260). No `scrollY` read exists outside `window.scrollY`.
- **D2 (the capture block).** The value proof is correct. `buildConstruction` contains exactly one
  `return`, `{ decorations, movers: { outgoing, incoming, decoration } }` (`js/swipe.js:276`). No
  wrapper adds keys — `c` at `js/app.js:596` is the direct result. `if (c.capture)` is constant-false.
- **D3 (the diagnostic readers).** With D2 there is no writer of `d.ghostY` / `d.animSync` /
  `d.animRes` anywhere in `js/`. The three readers named are the complete set (`js/app.js:1003-1004`,
  `:1015`, `:1064`), and `ghostDiff` is consumed exactly once, at `:1021`.
- **D5 (`revealPending`).** Verified by direct read, not by trusting the grep: `js/app.js:697` is the
  `let … = false` declaration, `js/app.js:1153` is the sole read. No assignment exists. A `let` with
  no writer is a constant, and `endOwnership` collapses to `sessionDone(cur)`.
- **D8 (the `owned-pane` producer).** The load-bearing proof holds. `d.movers` is written at
  `js/app.js:604` and appended at `:605`, both through `toMover` over `buildConstruction`'s three
  `mover(...)` calls; the ownership argument at each is a string literal — `'borrowed-real'`
  (`js/swipe.js:251`), `'borrowed-real'` (`:260`), `'owned-decoration'` (`:265`). There is no fourth
  call and no computed ownership value anywhere in the module. `'owned-pane'` has no producer.
- **D12 (`mover.own`).** Exactly four `.own` readers exist in `js/`, all four are deleted by
  D4/D6/D7/D8, and no test reads `m.own` at runtime — `test/swipe-construction.test.js:167` asserts
  its *absence* on the external seam mover, which survives the pass unchanged.
- **The `NOGHOSTCLASS` textual residual is narrower than the plan claims, in the plan's favour.** No
  `nav-ghost` token occurs in any `*.html` or `*.css` in HEAD, so no static markup can arm the branch;
  the class can only enter through script. The gate's `js/`-only scope is the same scope
  `test/no-view-clone-gate.test.js`'s `jsFiles()` already walks, and the untracked
  `.claude/worktrees/…/js/app.js` copy (excluded via `.git/info/exclude`) is outside that walk, so it
  cannot produce a phantom failure.
- **The A2 exclusion (§13 decision 5) is principled.** Three independent grounds, and the strongest is
  not the churn argument but the device one: step 7's discriminator is a swipe gesture and A2's is a
  settings-stacking observation, so batching puts two independent variables into one device session.
  The standing no-batching rule is a working rule with its own recorded reason, not a preference.

---

## Findings

### F1 — Structural (defect) — the frozen swipe model's fingerprint pin and its mirrored ORPHAN prose are in no list in the plan, and regenerating the doc does not fix them

`test/swipe-model.test.js` holds `VERIFIED.supersession = 'b07e422a493b8fff'`, checked by the test
*"every mirrored js/app.js region still matches what was verified"*. The pinned region is defined in
`tools/gen-swipe-model.mjs` as `regionHash(read('js/app.js'), 'function begin(x, y, target) {', 'if (target.closest', 'begin/supersede')`
— which is **exactly** §5's collapse region, plus D9's `.spent` sweep and the whole recovery block.
The §5 edit necessarily moves that hash.

The plan's only response is §6 and D17: "`docs/swipe-model.generated.txt` and
`docs/transition-matrix.generated.txt` are regenerated in the same commit." That is insufficient in a
way that matters. `docs/swipe-model.generated.txt` is not hand-editable — it is `render()`'s output,
and the ORPHAN prose is **hard-coded in the generator**, so regenerating reproduces it verbatim:

- generated line 134 — "dispose the old pane / stray ghosts + clear inline styles"
- generated line 149 — "On the ORPHAN path (d === null) there is no session-start state, so render + scroll degrade to the prior top-level restore."
- generated line 181 — the recovery table row's `dispose orphan` cell
- generated lines 186-187 — "(The ORPHAN sub-case, d===null, keeps nav.js default scroll-to-top — `resetScroll:d?false:undefined` — so only the live path is policy.)"

Neither `tools/gen-swipe-model.mjs` nor `test/swipe-model.test.js` appears anywhere in the plan: not
in `source_ranges`, not in `affected_contracts`, not in §8's residue table, not in §11 step 6's
"edited in the SAME commit" list (which names the frozen spec and the anchors gate and stops there).

**What it costs if built as written.** Step 6's single commit lands with `swipe-model.test.js` red.
The gate's own failure message says: *"Re-verify the mirrored rule in tools/gen-swipe-model.mjs
against js/app.js, regenerate, and update VERIFIED in the same commit."* The cheapest exit from a red
hash is to paste the new hash — and that is precisely the "one weak link" this project built the
frozen model to close (`js/swipe.js:1-12`: the generator "reimplements conditions rather than
executing them", so the pin is what makes the reimplementation falsifiable). A re-pin without the
prose rewrite ships a generated model that still documents a branch the same commit deleted, and the
document that exists to be trustworthy at a glance becomes the thing that has to be cross-checked.

**The invariant.** The frozen model must describe the code it mirrors after the pass, and the pin
must move only behind a re-verification, not a re-hash. Which lines of `render()` change is the
planner's call; that the file is on step 6's list, and that the re-verification is an acceptance
condition rather than a step, is not.

### F2 — Structural (defect) — D9 deletes the only anchor of the supersession fingerprint's only mutation evidence, and no gate in the plan's exit condition sees it rot

`tools/source-gate-sweep.mjs` exists because the behavioural sweep deliberately **excludes** the
fingerprint gates (`tools/mutation-sweep.mjs:112-123`: they fail under every mutation by
construction, a false CAUGHT). Its own header records that excluding them "left the fingerprints with
NO runnable mutation evidence at all", and it supplies that evidence one entry per fingerprint. Its
`begin/supersession` entry is anchored on:

```
from: "document.querySelectorAll('.nav-ghost.spent').forEach((n) => n.remove());"
```

That is `js/app.js:428` — the line **D9 deletes**. After the pass the tool prints `ANCHOR FAILED`,
pushes to `uncaught` and exits nonzero.

Three things compound. First, `test/mutation-anchors.test.js` imports `tools/mutate.mjs`'s
`MUTATIONS` and nothing else, so this rot is invisible to the anchors gate the plan's §8 names as
"the mechanical closure". Second, `source-gate-sweep` is not in `npm test` and is not in §11's exit
condition, which names the full suite and the full mutation sweep only. Third — and this is why it is
Structural rather than a Note — the fingerprint whose evidence dies is the **supersession** one,
i.e. exactly the gate F1 shows must be re-pinned in the same commit, over the plan's own most
dangerous edit.

**What it costs if built as written.** The supersession fingerprint is re-pinned at the same moment
its ability to fire on a same-behaviour source edit stops being demonstrated, and nothing in the
plan's exit condition runs the tool that would say so. The entry needs a replacement anchor inside
the post-collapse region — a behaviour-neutral rewrite of a line that still exists there — chosen and
recorded in the same commit, and `node tools/source-gate-sweep.mjs` needs to be an exit condition
alongside the mutation sweep.

### F3 — Structural (defect) — `NOOWNEDPANE` and `NOCLB` leave their scan resolution unspecified where `NOGHOSTCLASS` specifies it, and the two admissible readings differ in outcome

`NOGHOSTCLASS` is specified structurally: *"scan … for a class write whose value contains the retired
token, by the same resolution rules the view-clone gate already uses"*. `NOOWNEDPANE` is specified as
*"scan … for the retired ownership literal"* and `NOCLB` as *"the two retired identifiers"*. Neither
says whether a match is the **quoted string literal** or the **bare token**, and the readings are not
equivalent:

- **Bare-token reading — the gate is RED after the pass**, on residue the plan never scrubs.
  `owned-pane` survives as a bare token in comments at `js/app.js:441`, `:444`, `:693`, `:725`,
  `:762` and at `js/swipe.js:254` (plus `owned pane` at `:764`, `:765`). `NOCLB` is safe under either
  reading — both its identifiers are genuinely absent — but `NOOWNEDPANE` is not.
- **Quoted-literal reading — the gate is green but strictly weaker than its sibling.** It sees
  `own === 'owned-pane'` and misses a re-introduction routed through a constant or a variable, which
  is the shape a real re-introduction takes. `NOGHOSTCLASS` does not have that hole, because it
  resolves the *write*, not the *string*.

**What it costs if built as written.** Step 5 authors these red-first. The author hits a red
`NOOWNEDPANE`, cannot distinguish "the fixture is working" from "there is undeleted residue", and the
cheapest resolution is to narrow the match to the quoted literal — which silently makes the gate
weaker than the one it is paired with, in a file whose entire purpose is that the reading is held by
structure. The plan is explicit that this file's failure paths must be *driven and observed to fire*;
it needs to be equally explicit about what each of them matches.

### F4 — Structural (defect) — the declared source ranges are line-incomplete against the plan's own edits, and the residue they miss is exactly what D16b's rule condemns

D16b states the rule: *"A comment that describes a deleted mechanism is the same defect as the
mechanism, one layer out."* It then lists four comment scrubs. The declared `source_ranges` stop
short of the comment blocks attached to three deletions, and skip the largest one entirely:

| Deletion | Declared range | The prose that belongs to it |
|---|---|---|
| D5 `revealPending` | `js/app.js:696-699` | `:693-696` — the four-line comment explaining the held reveal, `holdGhostUntilPaintable` and "the session must stay the owner until that pane is released" |
| D6 `paneKindOf` | `js/app.js:766-771` | `:761-765` — "the ONLY owned-pane recipe is the app-ghost … a →home reveal builds NO owned pane at all" |
| D9/D10 the recovery | `js/app.js:425-436` **and** `:474-487` | `:437-473` — **undeclared entirely**: the 37-line comment block that describes `disposeOwnedPanes(cur,'superseded')`, the DOM-global `.nav-ghost` sweep, the ORPHAN-pane path and `resetScroll:undefined`'s parity role. It is the prose form of the branch §5 collapses. |
| — | — | `:720-726` — the `fadePanes` tombstone, "its `spent` marking applied to owned-pane movers"; `js/swipe.js:207` — "the `.nav-ghost` wrapper"; `js/swipe.js:254` — "retired the home-snapshot owned-pane outcome" |

**What it costs if built as written.** HEAD keeps prose describing every mechanism the commit
deleted — the §6.6 defect the pass exists to reduce, reproduced one layer out — and, under F3's
bare-token reading, the same residue is what keeps the new gate red. The 437-473 block is the
sharpest case: it is the *argument* for the branch being removed, so leaving it makes HEAD contain a
careful justification for code that no longer exists.

### F5 — Structural (defect) — R2's "known instance" list is short by two, and both are the same class as `OB-home`

The plan is admirably explicit that D14 removes a witness rather than a redundancy in the `OB-home`
case, and names it so the coverage audit does not have to rediscover it. Two more are in the same
table and are not named.

**`DEC` (`test/swipe-stage6e.test.js:230-248`).** It drives a real `browse→browse` supersession
through the app harness with a `.np-pill-float` node present and asserts the pill is gone after the
recovery. Its subject is not `disposeOwnedPanes`; it is *the recovery path still sweeps the one owned
resource the swipe creates*. Its stated replacement, `PILLSWEPT`, is a **unit** cell over
`Nav.resetSwipeStyles` against the index fixture, plus a signature assertion that the function takes
no parameters. Neither half exercises the recovery path. `RECOVERYPARITY` asserts screen restore,
scroll restore and hold ordering; it does not assert the pill is swept. So after the pass **no cell
witnesses that the recovery sweeps the pill float** — the resource §9 calls "the one owned resource
left", whose leak §9 says would occur "on every superseded Now Playing swipe".

That gap is sharpened by §5's first table row, which deletes the explicit
`resetSwipeStyles(cur ? true : undefined)` call at `js/app.js:481` outright. See F6.

**`BR` (`test/swipe-stage6e.test.js:172-192`).** It asserts that on a `browse→home` supersession the
borrowed-real `#browse` and `#home` are still the same elements and still connected. That property
**survives the pass**; what dies is only its stated rationale (the `own` filter). §8's own rule
separates these — "an assertion about the *classification* survives and changes value; an assertion
about the *pane* is deleted" — and `BR`'s assertion is about the borrowed-real views, not the pane.
Nor is it vacuous: `resetSwipeStyles` still removes nodes on that path (`js/nav.js:106`), so a
broadened sweep would redden it. `RECOVERYPARITY` does not assert element survival; `DESTROYEDMOVER`
asserts inline transforms and a null session, not survival on the recovery path.

**What it costs if built as written.** Two live behaviours lose their only witness in the same commit
that removes the code which guaranteed them, and R2's mitigation — the coverage auditor's
per-assertion account — runs *after* step 6, so the discovery is post-commit on a pass whose whole
premise is that nothing observable changes.

### F6 — Weak (defect) — §5 justifies deleting the explicit `resetSwipeStyles` call by one of its three effects; the other two are preserved only by an unstated adjacency

§5's first row deletes `resetSwipeStyles(cur ? true : undefined)` (`js/app.js:481`) with the reason
*"the whole call goes with D9/D11 — the sweep it suppressed no longer exists"*. That names one of the
call's three effects. `Nav.resetSwipeStyles` also (a) sweeps `.np-pill-float` (`js/nav.js:106`) and
(b) clears `transform` / `transition` / `willChange` / `zIndex` on `#home`, `#browse`, `#options`,
`#nowplaying`, every settings sub, **every `.browsepage`**, and the navbar pill (`js/nav.js:107-116`).
Effect (b) is the "erratic after a while" class that reset exists to prevent.

I verified the deletion is nonetheless safe: the very next line, `applyScreen(...)`
(`js/app.js:482`), reaches `resetSwipeStyles(opts && opts.keepGhosts)` as the **first statement** of
`Nav.applyScreen` (`js/nav.js:129`), and with `keepGhosts` gone that call performs the full reset.
So both effects survive, once, at the same point in the sequence.

**What it costs if built as written.** Nothing today. But the plan's proof for its most dangerous
edit is stated at one third of its actual surface, so the next reader — or the code review at step 8
— has to re-derive the other two thirds from scratch, and a future edit that reorders or
short-circuits `js/app.js:482` silently restores the pill leak with no cell to catch it (F5). State
the adjacency in §5; it is the reason the row is admissible.

### F7 — Weak (defect) — D15's vacuous-assertion list misses the one whose removal guts a cell

D15 removes "the `ghosts(h) === 0` helper and its uses" in five files, including
`test/swipe-invariants.test.js`. In that file the count helper is not the consequential ghost
reference. The stale-event cell computes:

```
const ghostEl = h.document.querySelector('.nav-ghost');
const transformAfter = ghostEl && ghostEl.style.transform;      // :426-427
…
assert.equal(ghostEl && ghostEl.style.transform, transformAfter,
  'a stale touchmove must not drag the NEW session\'s movers');  // :450-451
```

With no ghost constructible, both sides are `null` and the assertion cannot fail. The cell's own
header says of exactly this assertion: *"TRANSFORM is the assertion this test originally MISSED, and
missing it made the whole test inert."* It is already inert at HEAD, and D15 does not name it.

**What it costs if built as written.** Deleting per the list leaves the cell with its four count
assertions and **no transform witness** — the state its own header records as the inert one. The
correct disposition is not deletion: it is a re-anchor onto a surviving mover (a `.browsepage` or
`#home`, whose transform a stale `touchmove` would actually write), which is a behaviour that
survives the pass and currently has no other witness on the stale-event path.

### F8 — Note (defect) — two tooling surfaces are unaccounted: the fuzz probe's ghost counter, and the sweep-exclusion decision for the new purge file

`tools/fuzz-ui.js:54` reports `ghosts: all('.nav-ghost').length` as a probe field. After the pass it
is constant 0 — the same "a diagnostic field with one constant value is not a measurement" argument
D3 makes for `ghostY`. It is on no list in the plan.

Separately, `tools/mutation-sweep.mjs:112-123` carries a named EXCLUDE list for source-text gates,
with the stated rationale that they fail under *every* mutation. The three purge cells are **not**
that class — they fire only on a mutant that injects their own token — so they must not be excluded,
or the three §10 ADDITIVE mutants report UNCAUGHT. The plan does not make that call, and a builder
reading the exclusion list's rationale ("gates that assert on source text") could reasonably make the
wrong one.

### F9 — Note (defect) — the `S2-23` mutant now trips the two new gates, and M5 is deferred

`S2-23 NOGHOSTATALL` (`tools/mutate.mjs:1306-1309`) replaces a block in **`js/swipe.js`** with text
containing both `w.className = 'nav-ghost'` and `mover(w, 'owned-pane', 'outgoing')`. D13c keeps it
unchanged on the ground that "nothing in `js/app.js` is on its path" — true of `js/app.js`, but the
two new gates scan `js/swipe.js` as well. `tools/mutation-sweep.mjs` prints a `killed by:` list, so
after the pass `S2-23`'s list gains `NOGHOSTCLASS` and `NOOWNEDPANE`.

Nothing breaks — a caught mutant stays caught. But with coverage-audit **M5** (mechanising the
designated-killer check) deferred by §14, `NOGHOSTATALL`'s mutation evidence stops being uniquely
attributable to `NOGHOSTATALL`, which is the same "reddens for the wrong reason is indistinguishable
from working" hazard the plan itself records for `stage6i SCOPE` in D13. Recording the expected
killer set for `S2-23` in the same commit costs a line.

### F10 — Note (recommendation) — the purge file's stated self-exclusion protects nothing as specified

§10 requires the file to "exclude itself by **file identity**, not by a path pattern". As specified
the scan walks `js/` and the gate lives in `test/`, so it cannot match itself under any resolution
rule; the clause is inert. The real self-match surface is the registered token literals, and they are
out of scan scope for the same reason. *Recommendation, not a requirement:* keep the fire drill,
which is the part that does the work, and either drop the self-exclusion clause or restate it as what
it actually guards — that the token registry is data the scan reads, never text the scan walks.
Leaving an inert clause in the header of a gate whose header is its specification is how a later
reader concludes a hazard is handled when it was never present.

---

## Coverage — blocking findings

Every blocking finding (F1–F7) mapped to what would verify it. Non-blocking F8–F10 are recorded
without a mapping.

| Finding | Verified by |
|---|---|
| **F1** | `test/swipe-model.test.js` green at step 6 with `VERIFIED.supersession` moved **and** `tools/gen-swipe-model.mjs`'s ORPHAN prose rewritten; the build log records the line-by-line re-verification, not just the new hash. Existing cell — no new coverage owed. |
| **F2** | `node tools/source-gate-sweep.mjs` exits 0 at step 6, with the `begin/supersession` entry re-anchored inside the post-collapse region; added to §11's exit condition beside the mutation sweep. Existing tool — no new cell owed. |
| **F3** | `NOOWNEDPANE` and `NOCLB` each state their match rule in the file header, and each fire-drill fixture exercises **that** rule (a synthetic source containing the token in the matched form and, for the bare-token reading, one containing it in a comment) so the two readings are distinguished by an executed test rather than by a sentence. Cell: `NOOWNEDPANE`, `NOCLB`. |
| **F4** | No occurrence of `owned-pane`, `nav-ghost`, `keepGhosts`, `revealPending`, `holdGhostUntilPaintable`, `fadePanes` or `app-ghost` survives under `js/` after step 6 except where §9 keeps the mechanism itself. Held by `NOGHOSTCLASS` / `NOOWNEDPANE` under the bare-token reading (F3); otherwise owed as an explicit scrub item in §8. |
| **F5** | A cell witnesses that the **recovery path** removes the `.np-pill-float` — either `PILLSWEPT` widened to the harness layer or `RECOVERYPARITY` gaining a fourth assertion — and a cell witnesses that the borrowed-real `#browse`/`#home` survive a supersession. Cells: `PILLSWEPT`, `RECOVERYPARITY`. |
| **F6** | No new cell. §5's row states the `js/nav.js:129` adjacency as the reason the call is deletable; `PILLSWEPT`'s no-parameter assertion already guards the re-introduction half. |
| **F7** | The stale-event cell in `test/swipe-invariants.test.js` retains a transform witness re-anchored onto a surviving mover, and reddens under a mutation that lets a stale `touchmove` reach `move()`. Existing cell, re-anchored — not deleted. |

## Prediction — where this breaks in execution if built as written

Step 6 is one commit, and it lands red on `test/swipe-model.test.js` (F1) — the first thing the
builder sees will be a fingerprint hash mismatch, not any of the twelve deletions. The failure
message asks for a re-verification and the cheapest thing that turns it green is a re-hash, so the
most likely outcome is a green commit carrying a generated model that still documents the ORPHAN
branch in four places. That surfaces at step 8, where the code reviewer reads a document describing
code the same commit deleted, and the pass that exists to stop HEAD carrying dead descriptions ships
one.

The second break is quieter and later. `NOOWNEDPANE` is authored red at step 5 (F3), because six
comment sites the plan never scrubs still carry the token. The author cannot tell whether the fixture
works or the tree is dirty, narrows the match to the quoted literal, and the file ships with one gate
that resolves writes and one that matches strings — and the difference is invisible until something
re-introduces the kind through a constant, which is the only shape a re-introduction realistically
takes.

The third is the one that costs a device session. `DEC` and `BR` go out at step 6 (F5). Nothing then
witnesses that the recovery path sweeps the pill float. §5 simultaneously deletes the explicit
`resetSwipeStyles` call, so that sweep now depends entirely on `applyScreen` reaching `js/nav.js:129`
— a dependency the plan never writes down (F6). The pass changes no behaviour, so step 7's device
re-confirm passes, and the leak arrives on a later edit to the recovery's ordering with no cell, no
comment and no plan row pointing at it. The user's own scar for this class is a constant and its
container, each correct alone.

Finally, `tools/source-gate-sweep.mjs` (F2) never runs, because it is in no exit condition. Its rot
is discovered the next time someone reaches for the supersession fingerprint's mutation evidence to
prove the gate can fire — which, on the standing pattern, is the moment they can least afford it.
