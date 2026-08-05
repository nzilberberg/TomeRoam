# POIROT — the declone Stage 2 SUBTRACTION pass (twelve deletions + fourteen co-changes)

Type: code-review
Prior-review: POIROT-one-screen-type-a1b-e6a2f2e.md
Target: `49efe4f` (build `2026-08-05.1`), reviewed at HEAD `0f5c92d` (which records the SHA in the build log and changes nothing else).
Range: f250a45..49efe4f
Plan of record: `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md` — RATIFIED, FORGE at plan-review round 3, adversary struck (`Claude/Loki/PLAN-swipe-declone-stage2-subtraction-strike-2026-08-05.md`, promise HELD, one fracture folded as §4a C5).
Red suite: `Claude/Curie/RED-swipe-declone-stage2-subtraction.md` (`b2327f5`, three intentional red cells).
Build log: `Claude/Brunel/swipe-declone-stage2-subtraction-build.md`.
Tree: clean before and after every command below; `find . -name "*.mutbak"` empty after every sweep.

`Verdict: PASS — fix-then-ship.` Nothing load-bearing was deleted, the collapse is faithful to §5 in
both order and effect, and the one load-bearing step with no mechanism behind it — the frozen-model
re-pin — is **substantiated**: an executed extraction of the pinned region at both commits shows
exactly seven changed statements and the recorded re-verification names all seven. Six findings, none
reachable-and-broken. Two of them a reviewer would require changed before this closes: a mutant this
commit registered that duplicates one already in the registry (executed: byte-identical `killed by:`
lists), and a comment one function above `begin()` that still states a gate rejection the same commit
deleted. The rest is residue of the seventh incomplete enumeration this campaign has produced.

---

## Phase 1 — The scene

The change is a deletion pass, not a behaviour change. Twelve items leave `js/app.js` and `js/nav.js`
— the owned-pane machinery (`disposeOwnedPanes`, `dropPanes`, `paneKindOf`, `paneLess`, the L3
mover's `own`), the `.nav-ghost` surfaces (the `.spent` sweep, the recovery predicate's disjunct, the
`keepGhosts` threading, the `ghosts=` diagnostic token), the capture readers (`ghostDiff`,
`cover.ghostY`, `animSync`, `animRes`), `revealPending`, `env.scrollY` — plus the ORPHAN sub-case of
`begin()`'s hard-reset recovery and the three ternaries written to serve it. Twenty-six non-`Claude/`
files change; the co-change half is larger than the deletion half, which is the shape the plan's own
R10 predicts.

The intent as stated matches the intent as coded. The commit message scopes itself accurately and does
not undersell: it names the undeclared instance it found (`swipe6e RSN-emit`), which is the opposite
of the "commit that scopes itself down" failure this seat's local disciplines warn about.

The declared danger is one edit: with the `.nav-ghost` disjunct gone, `cur = d || session` is claimed
non-null on every reachable entry, so `resetScroll: cur ? false : undefined` collapses to the literal
`false`. If the claim is wrong, `#home`'s scroll silently stops resetting on a reveal — the exact axis
this campaign has already shipped a defect on.

## Phase 2 — The history, and what it means

`git log` on the region shows the deletion set never moved across three plan-review rounds, an
executed adversary strike, or a red-suite fold. What moved every single time was the **blast radius**:
round 1 found the frozen model and the source-gate anchor, round 2 found `gen-swipe-model.mjs:471`,
the adversary found `M1WRITERSET` entry #10, the red-suite fold derived four more anchors mechanically,
and the build itself found `swipe6e RSN-emit` and two comment sites. Six incomplete enumerations, every
one closed by executing something and none by a further reading.

That history sets this review's centre of gravity. The reachability argument has been prosecuted by an
executed six-scenario battery with a control that demonstrably fired; re-litigating it by reading would
be the weakest thing this seat could do. The enumeration has never once survived contact. So the
question I took to the artifact was not *is the collapse safe* but *what does the co-change list still
not name*.

## Phase 3 — Killer vs witness

The surface findings below are residue. The root finding is one and the campaign already names it: a
co-change list authored by hand cannot stay complete while the tree moves under it, and the registries
that would catch the rot each see only their own half — `test/mutation-anchors.test.js` reads
`MUTATIONS` and nothing else, so a stale *constant* in the same file is invisible to it (F5); ESLint's
`ignores` covers `test/**` and never reaches `tools/**` at all, so nothing lints the registry; and
`retired-concepts-purge.test.js` scans `js/` only, so residue in `test/` and `tools/` is outside every
gate this pass added. The plan already rules the durable answer (§14, the DERIVED co-change list) and
deliberately does not build it here. I do not reopen that; F1–F6 are what the absence costs on this
commit.

## Phase 4 — The investigation, by execution

Every claim below was run, not argued. `NODE="$(git config --get tomeroam.node)"` throughout.

**The suite.** `"$NODE" --test test/*.test.js` → **878 tests, 877 pass, 0 fail, 1 skip** (the
device-only KEEPER cell), duration 27.2s. Matches the build log exactly. The three intentionally-red
cells at `f250a45` (`NOOWNEDPANE`, `MOVERSHAPE`, `PILLSWEPT`-arity) are green.

**The nine §10 cells exist and are named.** `NOGHOSTCLASS`, `NOOWNEDPANE`, `NOCLB` (with both
positive and both negative fire-drill controls per cell, and `NOCLB`'s positive control placed
*behind* a line containing a string containing `//` — the over-stripping hazard the plan specified);
`MOVERSHAPE` ×2; `RECOVERYPARITY` ×4 with the pill-sweep assertion split into its own named test
(`RECOVERYPARITY.pillswept`) exactly as decision 13 requires; `DESTROYEDMOVER` ×3 route coordinates;
`PILLSWEPT` ×2; `BORROWEDREALSURVIVES`; `STALETOUCH`.

**The second anchor registry.** `"$NODE" tools/source-gate-sweep.mjs` → **exit 0**, four entries, all
four fingerprints RED with the behavioural control GREEN on each: `0 uncaught, 0 not-behaviour-neutral`.
The re-anchor onto `const cur = d || session;` fires. The `transition branches` tombstone is gone and
`KNOWN_ROTTED` is empty in the same commit, so the exemption cannot go stale.

**Targeted mutation sweeps, foreground, explicit indices, never backgrounded.**
`"$NODE" tools/mutation-sweep.mjs 13 20 54 142` → `swept 4: 0 uncaught, 0 unapplied, 0 stale flags`.
`"$NODE" tools/mutation-sweep.mjs 13 141 144 145` → `swept 4: 0 uncaught, 0 unapplied, 0 stale flags`.
`find . -name "*.mutbak" -not -path "./node_modules/*"` → empty after each.

- **`#13` (`HARDRESET_DISPOSE`, re-anchored onto the single surviving `applyScreen` statement) is
  killed by `RECOVERYPARITY.pillswept`.** That is `RECOVERYPARITY`'s `NATURAL-d` — "the screen
  application is REMOVED from the recovery, so the recovery never reaches the style reset and the pill
  float survives". The witness §9 calls *the only one* that the recovery still reaches
  `Nav.resetSwipeStyles` after the explicit call was deleted is therefore demonstrably able to fail.
  This is the single most important execution in the review: it is the adjacency of §5 [F6], proven.
- **`#141` (`S2-28 PILLSWEPT`)** kills both `PILLSWEPT` and `RECOVERYPARITY.pillswept`.
- **`#144` (`S2-31`)** kills `RECOVERYPARITY.mid-drag` alone — discriminating.
- **`#145` (`S2-32`)** kills all three `RECOVERYPARITY` route tests.
- **`#54` and `#142`** each report `caught (153 failing)`; `diff` of their sorted `killed by:` lists is
  **empty**. See F1.

**The frozen-model re-pin — the one step with no mechanism (plan R9, exit item 5).** I did not take
the build log's word. `git show f250a45:js/app.js` and `git show 49efe4f:js/app.js`, then extracted
`src.slice(indexOf('function begin(x, y, target) {'), indexOf('if (target.closest'))` from each — the
literal bounds `supersessionFingerprint()` uses — and diffed them with comments stripped. The code
delta inside the pinned region is **exactly seven statements**: the gate `!(session && paneLess(session))`
→ `!session`; the `.spent` sweep deleted; the `.nav-ghost` disjunct deleted; `disposeOwnedPanes(cur,
'superseded')` deleted; `resetSwipeStyles(cur ? true : undefined)` deleted; `resetScroll: cur ? false :
undefined` → `false`; `if (cur) window.scrollTo(...)` → unconditional. The recorded re-verification at
`test/swipe-model.test.js:67-84` **names all seven, item for item, in that order.** It is a
re-verification and not a re-hash. Exit item 5 is discharged on evidence.

**Reachability, independently.** `"$NODE"` on a read-only harness probe (boot the real app harness with
`realBrowse`, count `.nav-ghost` at boot and after a real nav) → `0` and `0`. A repo-wide grep for
`nav-ghost` across `js/ css/ index.html sw.js` returns exactly two hits, both past-tense tombstone
comments (`js/swipe.js:207`, `js/swipe.js:254`), and zero class writes. The class cannot be constructed
by any first-party surface, which is what makes F3's assertions vacuous rather than merely unlikely.

**Nothing on the §9 keep list was deleted.** Verified by grep at HEAD: `js/nav.js`'s `.np-pill-float`
sweep (present, unconditional, now reached solely through `applyScreen` → `resetSwipeStyles()`);
`mover.ownership` at the seam (`js/swipe.js:242`, `:251`, `:265` — `js/swipe.js` is not in the diff at
all); `constructionPlanFor.outgoing` (`js/swipe.js:181`, `:199`); `cover.marks` / `cover.writes` / the
`window.scrollTo` recorder; `snapBrowse`, `survivors`, `revealBase`, `stampGen`; `watchFrames` itself
(only its parameter went); `gestureOwnsMovers` (`js/app.js:250`, reads `session.live`, never `own`);
`NOAPPCLONE`'s registered exception and its rot check (file untouched, green);
`test/swipe-gesture.test.js`'s destroyed-touch-target cell (`:104-127`, intact); and `css/app.css` is
not in the diff, so `.parked { overflow: hidden }` (`:146`, `:167-172`) and `#home.parked`'s `-101vw`
(`:187`) — the campaign's standing scar — are untouched.

**The returned-object seam.** The only shape change is `toMover : {element,ownership,slot} -> {el,
base}`. Both returned keys have live consumers: `m.el.style.transform` and `m.base === 0` in `settle()`.
No dead returned field ships. `grep -rn "\.own\b" js/` returns nothing.

**Absolute claims in the touched scope, each checked.** `test/no-view-clone-gate.test.js`'s "an
unregistered clone of a view host fails" — its own mutation tests execute both directions and pass.
`tools/mutation-sweep.mjs`'s corrected `transition-matrix.test.js` exclusion reason now names *both*
channels ([G2]); I confirmed `tools/gen-transition-matrix.mjs:34` does `require` `js/swipe.js` at
module load, so the second channel is real and the reason is complete rather than merely true.
`js/app.js:221-227`'s "UNREACHABLE BY CONSTRUCTION … `begin()` still rejects any new gesture there" —
**false**, and it is F2.

## Phase 4b — Coverage Ledger

Rows are derived mechanically from `git diff --name-only f250a45..49efe4f`. Marks: `✓` cleared by a
command run this pass (commands cited above); `~` cleared by reading; `n/a`; or a finding.

| Row (changed file / symbol) | Correctness & data-flow | Deletion safety (load-bearing?) | Residue / stale text pin | Vacuity (can it still fail?) | Absolute-claim check | Teardown & deferred resources |
|---|---|---|---|---|---|---|
| `js/app.js` — `begin()` gate `!(session && paneLess(session))` → `!session` | ✓ | ✓ | F2 (Significant) | ✓ | F2 (Significant) | n/a |
| `js/app.js` — recovery predicate, ghost disjunct dropped | ✓ | ✓ | ~ | ✓ | ✓ | n/a |
| `js/app.js` — `.spent` sweep deleted | ✓ | ✓ | ~ | ✓ | ✓ | n/a |
| `js/app.js` — `disposeOwnedPanes` + call deleted | ✓ | ✓ | ~ | ✓ | ✓ | ✓ |
| `js/app.js` — `resetSwipeStyles` explicit call deleted (the §5 adjacency) | ✓ | ✓ | ~ | ✓ | ✓ | ✓ |
| `js/app.js` — `resetScroll` / `scrollTo` ternaries collapsed | ✓ | ✓ | ~ | ✓ | ✓ | n/a |
| `js/app.js` — `paneLess` deleted | ✓ | ✓ | F2 (Significant) | ✓ | ~ | n/a |
| `js/app.js` — `dropPanes` / `revealPending` / `endOwnership` guard | ✓ | ✓ | F4 (Minor) | ✓ | F4 (Minor) | ✓ |
| `js/app.js` — `paneKindOf` + `watchFrames(paneKind)` + `pane=` token | ✓ | ✓ | F4 (Minor) | ✓ | ~ | n/a |
| `js/app.js` — `toMover` loses `own` | ✓ | ✓ | ~ | ✓ | ~ | n/a |
| `js/app.js` — capture block, `ghostDiff`, `cover.ghostY`, `env.scrollY` | ✓ | ✓ | ~ | ✓ | ~ | n/a |
| `js/app.js` — local `resetSwipeStyles` delegator removed (lint-found) | ✓ | ✓ | ~ | ✓ | ~ | n/a |
| `js/nav.js` — `resetSwipeStyles()` loses `keepGhosts`; ghost sweep deleted | ✓ | ✓ | ~ | ✓ | ✓ | ✓ |
| `js/nav.js` — `applyScreen` calls `resetSwipeStyles()` unconditionally | ✓ | ✓ | ~ | ✓ | ✓ | ✓ |
| `js/debug.js`, `sw.js`, `index.html`, `build.json` — build stamp | ✓ | n/a | ~ | ✓ | n/a | n/a |
| `docs/swipe-model.generated.txt` | ✓ | n/a | ~ | ✓ | ~ | n/a |
| `tools/gen-swipe-model.mjs` — five ORPHAN prose sites + TERMINATION row | ✓ | ~ | O1 (Observation) | ✓ | ~ | n/a |
| `tools/mutate.mjs` — de-registered / re-anchored / merged entries | ✓ | ✓ | F5 (Minor) | ✓ | ~ | n/a |
| `tools/mutate.mjs` — D13b replacement mutant | F1 (Significant) | ~ | ~ | ✓ | ~ | n/a |
| `tools/source-gate-sweep.mjs` — re-anchor + tombstone deletion | ✓ | ✓ | ~ | ✓ | ✓ | n/a |
| `tools/mutation-sweep.mjs` — exclusion reason corrected | ~ | n/a | ~ | ✓ | ✓ | n/a |
| `tools/fuzz-ui.js` — ghost probe field + dead violation check | ~ | ~ | ~ | n/a | ~ | n/a |
| `test/swipe-model.test.js` — re-pin + new token assertion | ✓ | ✓ | ~ | ✓ | ✓ | n/a |
| `test/scroll-writer-set.test.js` — `M1WRITERSET` #10 re-derived into a group | ✓ | ✓ | ~ | ✓ | ✓ | n/a |
| `test/np-hidden-writer-set.test.js` — prose only | ~ | n/a | ~ | ✓ | ~ | n/a |
| `test/mutation-anchors.test.js` — `KNOWN_ROTTED` emptied | ✓ | ✓ | ~ | ✓ | ✓ | n/a |
| `test/transition-matrix.test.js` — header corrected | ~ | n/a | ~ | ✓ | ✓ | n/a |
| `test/nav.test.js` — ghost assertions dropped from the reset cell | ✓ | ✓ | ~ | ✓ | ~ | n/a |
| `test/swipe-gesture.test.js` — `.213` pane-kind assertions dropped | ✓ | ✓ | ~ | ✓ | ~ | n/a |
| `test/swipe-invariants.test.js` — two `ghosts()===0` sites; STALETOUCH note | ✓ | ✓ | F6 (Minor) | F3 (Minor) | ~ | n/a |
| `test/swipe-stage6.test.js` — `OB`/`OB-home` deleted, tombstoned | ✓ | ✓ | F6 (Minor) | F3 (Minor) | ~ | n/a |
| `test/swipe-stage6c.test.js` — three `ghosts()===0` + helper removed | ✓ | ✓ | ~ | ✓ | ~ | n/a |
| `test/swipe-stage6e.test.js` — deleted whole (`BR` already relocated) | ✓ | ✓ | ~ | ✓ | ~ | n/a |
| `test/swipe-stage5-wiring.test.js` — `F2-r WIRING` + dead helpers | ✓ | ✓ | ~ | ✓ | ~ | n/a |
| `test/swipe-stage5-residuals.test.js` — the false `own` note corrected | ✓ | ✓ | ~ | ✓ | ✓ | n/a |
| `test/swipe-construction.test.js` — wording; `!('own' in m)` kept | ✓ | ✓ | ~ | ✓ | ✓ | n/a |

No cell is empty. Every `~` is a structural read of prose or of a non-executable claim; no `~` stands
on a behavioural or enumerable claim that a command could have settled.

## Phase 5 — Findings

| # | Severity | Finding |
|---|---|---|
| **F1** | **Significant** | `tools/mutate.mjs` now registers the same mutant twice. Index **54** (`nav: resetSwipeStyles broadens to REMOVE the elements it clears…`, added by this commit as §8 D13b's replacement for `swipe6e BR`) and index **142** (`S2-29 BORROWEDREALSURVIVES: …`, already registered at `b2327f5`) share the same `file` (`js/nav.js`) and a **byte-identical `from`**; their `to` differs only in removal idiom (`el.parentNode.removeChild(el)` vs `el.remove()`), so the behaviour they inject is the same. Executed: both report `caught (153 failing)` and `diff` of their sorted `killed by:` lists is empty. This is decision 19's own class — "they produce identical source and therefore identical `killed by:` lists, so neither entry's designated killer is distinguishable from the other's", plus "a sweep costs a full suite run per mutant, so a duplicate is measurable waste" — created by the same commit that applied that ruling to the scroll-restore pair. D13b said "a new mutant is registered against the surviving mechanism"; the plan did not know Curie had already registered it at step 5, and nothing checked. |
| **F2** | **Significant** | `js/app.js:221-227` is a live description of the gate D8 collapsed, and it states a rejection that no longer exists: *"begin()'s `finishing` gate (below) is narrowed … to admit ONLY a live pane-less session"*, then *"It remains UNREACHABLE BY CONSTRUCTION — and so still deferred — for the PANE-OWNING/held-reveal window (ghost/snapshot; cell PG): `begin()` still rejects any new gesture there, so no successor can arm and no stale continuation can fire while one is superseded."* At HEAD the gate is `if (finishing && !session) return;` — there is no pane-less narrowing, no PANE-OWNING rejection, and no cell PG. This is the sibling, one function up, of the `begin()` leading comment the builder found and fixed; it is on neither D16b's "full list [F4]" nor inside the vitruvius-gate's declared `source_ranges` (which start at `:261`). Decision 12's discriminator condemns it: it is not a tombstone — it names no retired symbol in the past tense — it is a live account of a guard that is gone, and it announces deferred work (6d/7) whose premise the same commit removed. |
| **F3** | **Minor** | Vacuous ghost assertions survived D15's enumeration, which matched the `ghosts(h) === 0` shape only. (a) `test/swipe-invariants.test.js:462` — `assert.equal(ghosts(h), ghostsAfter, 'a stale event must not dispose the new session\'s pane')`; both sides are structurally 0 (executed: `.nav-ghost` count is 0 at boot and after a nav; no first-party class write exists). It sits **inside the very cell** whose header records that an inert comparison "made the whole test inert" and which [F7] re-anchored for exactly that reason — the repair added the transform witness and left the vacuous sibling three lines below it. (b) `test/swipe-stage6.test.js:340` — `assert.equal(ghosts(h), 0, 'fixture: the pair is pane-less…')`, the literal `=== 0` shape, in a file D15 names by name. (c) `test/swipe-stage6i.test.js:91` and `:109` — two more, in a file D15 does not name and this commit does not touch; recorded as the class rather than as a required fix. |
| **F4** | **Minor** | Comment residue that D16b's "full list" did not name, each a live description of machinery this commit deleted. `js/app.js:665-666` — *"with pane type logged beside it, dozens of swipes in one report say whether long frames track panes"*: the `pane=` token went with D6. `js/app.js:1015-1016` — *"No hold on this path — the panes go NOW"*: `dropPanes()` was deleted from the line directly beneath it. `js/app.js:1045-1046` — *"runFinalize has THREE exits — the two ghost-held reveals return early"*: no held reveal exists and `runFinalize` has one exit; this is **inside the comment block this commit itself rewrote** (the `endOwnership` leak-guard note, three lines below). `js/app.js:1076-1078` — *"the held path must KEEP it true until drop()"*. Also `test/home-abort-writes.test.js:249` — *"which sweeps the settling ghost (nav.js:114)"*: the ghost sweep is deleted and `js/nav.js:114` is now the style-clearing loop (file untouched by this commit, so outside its declared scope; recorded as the class). |
| **F5** | **Minor** | `tools/mutate.mjs:91` — `RECOVERY_RENDER_ALWAYS_FALSE` is a dead constant (one occurrence in the file, its own definition) whose value is the exact pre-collapse line `applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });` that this commit removed from `js/app.js`. Its byte-identical twin `RECOVERY_RENDER_LINE` was deleted in the same hunk; the last copy of a line that no longer exists in source was left standing. Nothing can see it: `test/mutation-anchors.test.js` reads registered `MUTATIONS` entries only, and `eslint.config.js:17-20` scopes linting to `js/**` and `sw.js`, so `tools/**` is unlinted. Dead before this commit as well — but the commit deleted its sibling, so this is a half-finished scrub, and a future grep-driven re-anchor pass meets a false witness. |
| **F6** | **Minor** | Two surviving strippers for a token D9 deleted: `test/swipe-invariants.test.js:297` and `test/swipe-stage6.test.js:267` both do `.replace(/ ghosts=\d+$/, '')` on the `SWIPE start` line before comparing it. The `ghosts=` token is gone from that line, so the regex can never match; the calls are no-ops and both comparisons now read as though the token still exists. |
| **O1** | Observation | Exit item 6's token scan (`!/orphan/i` and `!/ghost/i` over `gen.render()`) forces the generated model to describe the retired concept **without naming it**. `docs/swipe-model.generated.txt:142`, `:153`, `:154` now read *"no other transient first-party marker element left to sweep"* and *"entered only when a leftover marker element was present with no owning session … no first-party source constructs that marker any more"*. The plan's stated mitigation — that the assertion "names that authority in its message so a future reader who legitimately needs either word meets a conversation rather than a chore" — is carried in the **assertion message**, which only a reader who breaks the test ever sees. The reader who pays the cost is the reader of the document, and the document is the one file the project maintains to be trustworthy at a glance. A deliberate, documented trade-off ([G1], decision 14), so not a required fix; recorded because the mitigation does not reach the person it was written for. |
| **O2** | Observation | `regionHash` (`tools/gen-swipe-model.mjs:47-53`) collapses whitespace but does **not** strip comments, so `VERIFIED.supersession` is moved by a comment-only edit inside `begin()`. This commit rewrote roughly thirty comment lines inside the pinned region alongside its seven code changes. Pre-existing design and not this pass's to fix, but it enlarges R3 exactly where R3 is sharpest: the cheaper and more frequent a hash move becomes, the more the re-hash-instead-of-re-verify shortcut recommends itself, on the one step the plan concedes has no mechanism. Naming a candidate rather than only the problem: hashing the region with `//`-to-end-of-line and `/* */` spans removed would pin the code the generator mirrors and stop pinning prose about it. |

## Phase 6 — The prediction

**F1 is the one that spreads.** A registry that tolerates two entries for one mechanism has stopped
being an inventory and become a list, and the cost compounds silently: every future sweep pays an extra
full-suite run, and the next reviewer who reads `killed by: BORROWEDREALSURVIVES` on either entry
cannot tell which registration earned it. The plan closed exactly this on the scroll-restore pair
sixty lines earlier in the same file; left standing, the file now teaches both the rule and its
exception.

**F2 is the one that bites a person.** The next engineer to touch `begin()` will read `js/app.js:221-227`
first — it is the session-owner block, the natural entry point — and take from it that a whole class of
window is rejected by construction. It is not. Someone will then add code that leans on a rejection
that does not exist, and the failure will present as a stale continuation firing over a successor, which
is precisely the shape stage 6c's guards were built for and precisely the shape this comment claims is
impossible. A confident absolute is the most expensive kind of stale comment, because it steers the eye
away rather than inviting a check.

**F3 and F6 are how a suite stops being evidence.** An assertion that cannot fail is indistinguishable
from one that passes, and this campaign has now filed that finding five separate times. The two ghost
comparisons will be read by the next coverage audit as coverage of a supersession property; they are
coverage of nothing. The gate that would have caught them, `NOGHOSTCLASS`, scans `js/` and cannot see
`test/`.

**And the seventh enumeration is now on the record.** Six were found by executing; this one was found
by grepping for the residue class rather than by re-reading the list — which is the same lesson wearing
different clothes. The plan's §14 already routes the derived co-change list and names Stage A2 and
Stage B as its consumers. This review is its sixth piece of evidence, and the first where the misses are
all in `test/` and `tools/` — outside every gate the pass itself added. Whoever builds that tool should
widen its surface set past `tools/mutate.mjs`.

---

## Watch-list

Carried from `POIROT-one-screen-type-a1b-e6a2f2e.md`. Every prior open item carries forward unchanged
unless a status is given below; four are resolved by this build.

- **[W1] [W4] [W7] [W11] [W13] [W16] [W18] (open)** — apply-on-approval records for stages 6b–6h un-applied in HEAD. Owner Zelda.
- **[W2] (open)** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition. Owner on-device.
- **[W5] (open)** — Loki r2 lesser planes (`recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` → Brunel). ⚠️ The second is now partly moot: the pane-less predicate itself is deleted (D8).
- **[W6] (open)** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat.
- **[W8] (open)** — arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda.
- **[W9] (resolved: this build)** — Loki 6e residual 2, the unguarded `.nav-ghost === owned-pane(live session)` invariant. Both halves of the invariant are deleted (D8, D9) and each is now held structurally rather than by an unwritten rule: `NOOWNEDPANE` over the tag, `NOGHOSTCLASS` over the class, `NOGHOSTATALL` behaviourally over all eight construction cases. *Durable lesson graduating to the plan's own R10 rather than to this list: an invariant with no gate is closed most cheaply by deleting one of its terms.*
- **[W10] (resolved: this build)** — `disposeOwnedPanes` / `dropPanes`, the byte-identical removers that were both no-ops. Both deleted (D7, D4); `grep -rn "\.own\b" js/` returns nothing.
- **[W12] (resolved: this build)** — the 6e `sweeps===0` non-vacuity guard with no registered single-site mutant. Its file, `test/swipe-stage6e.test.js`, is deleted whole (D14); `ls` confirms it is gone and `grep` finds no surviving `sweeps` cell.
- **[W14] (open)** — 6f device pass owes (opaque-over-rect re-confirm; topbar/navbar-band exposure; flash differential). Owner on-device.
- **[W21] (open)** — a fresh Loki strike against the BUILT 6i code. Owner Loki.
- **[W22] [W23] [W24] [W25] (open)** — 6i `#home` device gates R1(a)–(e). Owner on-device.
- **[W26] (open)** — 6i apply-on-approval records (plan §13 amendments/annotations). Owner Zelda.
- **[W28-residual] (open)** — ghost-era vocabulary throughout the settle path in `js/swipe.js` and `js/app.js`. **Reduced but not closed by this build, and F4 is its live remainder** — `js/app.js:665`, `:1015`, `:1045`, `:1076` and `test/home-abort-writes.test.js:249`. Non-blocking.
- **[W29] (open)** — `plan.incoming` / `plan.outgoing` / `plan.renderDestination` production-unread, deliberate and exact-key-gated. Re-confirmed this pass: `constructionPlanFor.outgoing` survives on §6 Rule R's stated exemption (`js/swipe.js:181`, `:199`). Owner Vitruvius. Non-blocking.
- **[W30] [W31] [W32] [W33] (open)** — browse-decouple device gates R-flash / R-navbar / R-strip / R-browse2browse. Owner on-device.
- **[W34] (open)** — no `DecisionLog.md` NEW-POLICY entry for `PL-swipe-browse-fixed-ownscroll`. Owner Zelda. Non-blocking.
- **[W35] (open)** — build-log "Files changed" lists omit build-stamp files. **Third counterexample, and the pattern is now the other way:** `Claude/Brunel/swipe-declone-stage2-subtraction-build.md` names `build.json`, `sw.js`, `js/debug.js` and `index.html` explicitly under "Build number". Recommend closing this item as no longer general. Owner Brunel/Zelda. Non-blocking.
- **[W36] (noted)** — Flash C (browse→browse in-list divider re-raster) out of scope.
- **[W38] (open)** — three shipped prose sites state the exclusivity universal plan §5.1 forbids (`css/app.css` ×2, `test/page-bg-single-painter.test.js` ×2). Untouched by this build; compounded by [W64]. Owner Brunel.
- **[W41] (open)** — `showAppView`'s sweep is LIVE and must be KEPT. `css/` and that call site are untouched by this commit. Not to be re-opened.
- **[W42] (open)** — plan §5.2's `.alphaindex` argument for A2 does not cover the browse↔settings gesture window. Owner Vitruvius.
- **[W43] (open)** — device-owed R-B / R-C / R-E / R-G, unclaimed by any cell. Owner on-device.
- **[W44] (open)** — `js/app.js`'s three `applyScreen(d, {render:true})` call sites for browse descriptors with no `gestureOwnsMovers` guard. Re-read this pass; unchanged. Plan §7 rules explicitly that no guard is added by this pass and says why. Owner Brunel. Non-blocking.
- **[W46] (open)** — a same-key browse pair puts one node in both mover slots. Deferred with its consumer named in plan §14. Owner Vitruvius.
- **[W47] (open)** — `js/browse.js:192-193` and plan §5.3.6 name `home→browse` / `overlay→browse` as miss-branch transitions; they take the landed branch. Owner Brunel + Vitruvius.
- **[W49] (open)** — the three trigger-census citations in `Claude/Brunel/swipe-declone-stage2-build.md` §1 point at wrong lines. Owner Brunel.
- **[W50] (resolved: this build)** — `tools/mutate.mjs`'s NOOP de-registration reason misattributed what `keepGhosts` guards. The whole NOOP-a/NOOP-b block is deleted with the 6e cluster; `grep -c "NOOP-a\|NOOP.mechanism\|anti-no-op" tools/mutate.mjs` → `0`.
- **[W53] (open)** — F1 of the parked-page review: `css/app.css:125` cites `css:224-229`; the `navIn*` keyframes are uncited. Owner Brunel.
- **[W54] (open)** — F2+F3 of the parked-page review: three sites in `test/parked-page-rides-home-css.test.js` state a HEAD that no longer exists. Same class as [W63]; scrub together. Owner Brunel.
- **[W55] (open)** — F4 of the parked-page review: `SKIP_FLOOR` / `SKIP_FORM` dead. **Same class as F5 of this review** — a dead constant in a tool no linter reaches. Owner Brunel.
- **[W56] (open)** — F5+F6 of the parked-page review: two plan §11 on-approval record items unfilled. Owner Zelda.
- **[W57] (open)** — F7 of the parked-page review: PARKM4's registered name claims a kill the sweep disproves. Owner Brunel/Curie.
- **[W58] (open)** — F8 of the parked-page review: `css/app.css:140-141`'s "nothing in js/ listens for resize". Owner Brunel.
- **[W59] (open)** — F9 of the parked-page review: the no-`padding`/no-`border` precondition cell is a GATE with no registered mutant. Owner Mendeleev.
- **[W60] (open)** — F10 of the parked-page review: the real-engine oracle has no recorded run at 375/640/1000px. Owner the deriver / bench.
- **[W61] (open)** — the parked-page device gate, plan §8 items 1 and 2, still unclaimed. Owner on-device.
- **[W62] (open)** — `test/one-screen-type.test.js:192-195` cites a de-registered mutant by name. Owner Brunel.
- **[W63] (open)** — `test/one-screen-type-npparks.test.js` line citations drifted; `js/nav.js:78` is a false landing. Owner Brunel.
- **[W64] (open)** — two sites state the retired NP-back-reveal mechanism as current (`test/one-screen-type.test.js:29-32`, `test/page-bg-single-painter.test.js:13`). Owner Brunel.
- **[W65] (open)** — `PLAN-one-screen-type.md:39` / `:98` contradict §13 steps 1 and 8 on A1b's verdict of record. Owner Zelda.
- **[W66] (open)** — §14's `NPUNTOUCHED` / `NPPARKS` rows disagree with the registered mutants. Owner Mendeleev.
- **[W67] (open)** — Loki's WebKit residual (scroll Books deep, open NP, close it) is on the board but not in the plan's device-gate list. Owner Zelda, then on-device.
- **[W68] (open)** — Stage A1b has no `DEVICE-*` record. Owner Zelda. Non-blocking on code.
- **[W69] (open)** — nothing gates the single-writer property on `#nowplaying`'s `hidden`. Owner Mendeleev.

New this build:

- **[W70] (open) (NEW)** — **F1.** `tools/mutate.mjs` indices 54 and 142 are one mutant registered twice: same `file`, byte-identical `from`, semantically identical `to`, and executed byte-identical `killed by:` lists (153 tests each). Merge into one entry naming `BORROWEDREALSURVIVES` as its designated killer, per decision 19. Owner Brunel, via the apply-review of this casebook.
- **[W71] (open) (NEW)** — **F2.** `js/app.js:221-227` states a `begin()` rejection and a PANE-OWNING deferral that D8 deleted. Rewrite under decision 12's discriminator. Owner Brunel.
- **[W72] (open) (NEW)** — **F3.** Vacuous ghost assertions at `test/swipe-invariants.test.js:462` and `test/swipe-stage6.test.js:340` (both in D15's declared scope), plus `test/swipe-stage6i.test.js:91`/`:109` (outside it). Owner Brunel; the third pair may ride with a later purge.
- **[W73] (open) (NEW)** — **F4.** Comment residue outside D16b's "full list": `js/app.js:665-666`, `:1015-1016`, `:1045-1046`, `:1076-1078`, and `test/home-abort-writes.test.js:249`. Owner Brunel. Related to [W28-residual].
- **[W74] (open) (NEW)** — **F5.** `tools/mutate.mjs:91` `RECOVERY_RENDER_ALWAYS_FALSE` is dead and holds the deleted pre-collapse line. **Structural half worth the ruling, not just the deletion:** `tools/**` is outside `eslint.config.js`'s scope entirely, so no dead-constant in the mutation registry is detectable by any gate — the same hole [W55] sits in. Owner Brunel for the site; owner Vitruvius/Mendeleev for whether `tools/**` joins the lint surface.
- **[W75] (open) (NEW)** — **F6.** `.replace(/ ghosts=\d+$/, '')` strippers for a deleted token at `test/swipe-invariants.test.js:297` and `test/swipe-stage6.test.js:267`. Owner Brunel.
- **[W76] (open) (NEW)** — **O1.** The generated swipe model now describes the retired concept as "marker element" (`docs/swipe-model.generated.txt:142`, `:153`, `:154`) because exit item 6's token scan forbids naming it. The plan's mitigation lives in the assertion message, which the document's reader never sees. Owner Vitruvius: either allow the tokens inside an explicitly-tombstoned block, or accept the euphemism and say so in the document itself.
- **[W77] (open) (NEW)** — **O2.** `regionHash` pins comments as well as code, so `VERIFIED.supersession` moves on a comment-only edit inside `begin()`. Enlarges R3 on the one step with no mechanism. Owner Vitruvius, as a gate improvement. Non-blocking.
- **[W78] (open) (NEW)** — **the seventh enumeration miss, and its shape is new.** F3–F6 are all in `test/` and `tools/` — outside `retired-concepts-purge.test.js`'s `js/` scan, outside `mutation-anchors.test.js`'s `MUTATIONS`-only read, and outside ESLint's configured surface. The plan's §14 derived co-change tool is the right answer and is correctly deferred; this is its sixth piece of evidence and the first showing that the surface set must extend past `tools/mutate.mjs`. Owner Vitruvius, as tooling; consumers Stage A2 and Stage B.
- **[W79] (open) (NEW)** — **device gate, unchanged by this review.** Plan §11 step 7 (`browse→browse` commit and abort, plus the four Stage-1 transitions) is owed on build `2026-08-05.1`. Nothing found here blocks it; the collapse changes the shipped form even where it cannot change behaviour, and the form device-tested must be the form that ships. Owner on-device.
