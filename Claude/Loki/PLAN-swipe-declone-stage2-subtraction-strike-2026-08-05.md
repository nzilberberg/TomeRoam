# STRIKE — declone Stage 2 subtraction plan, §11 step 3 — 2026-08-05

Type: strike casebook
Commission: `Claude/Plans/PLAN-swipe-declone-stage2-subtraction.md` (RATIFIED 2026-08-05), §11 step 3.
HEAD at strike: `8dac588`. Blind to all three plan-review casebooks throughout, per the commission.

**VERDICT: ONE executed fracture — the step-6 co-change enumeration is short by one gate
(`test/scroll-writer-set.test.js` `M1WRITERSET`, baseline entry #10). The commissioned §5
behavioural promise itself HELD under execution on every reachable entry route.**

## 1. The promise, verbatim

§11 step 3: *"every item in §4 is unreachable at HEAD, and the §5 collapse changes no
behaviour."* Sharpest edge (§5): removing the `.nav-ghost` disjunct from `begin()`'s recovery
predicate makes `cur = d || session` non-null on every reachable entry, so
`resetScroll: cur ? false : undefined` collapses to `resetScroll: false` with no behaviour
change. Load-bearing enumeration (§11 step 6): *"Edited in the SAME commit: … — every one of
these rot checks reddens otherwise."* Exit condition 3: *"The full suite passes."*

## 2. The plane chosen

The §5 collapse cannot be struck by reading — four readings in this campaign were settled only
by execution (plan R9). So the collapse was **executed**: applied in memory to `js/app.js` and
`js/nav.js` (product source untouched), the real app booted through `test/app-harness.js` in
both forms, the same entry-route battery driven against each, and the full 849-test suite run
against each. Any divergence outside the plan's declared blast radius is a fracture.

## 3. The instrument (reproducible)

- `Claude/Loki/probe-stage2-subtraction-transform.js` — applies §5 + D9 + D11 + the D7 call
  site in memory at module-load time (fs.readFileSync intercept for `js/app.js`, CJS loader
  intercept for `js/nav.js`). Seven string edits, each asserted to match exactly once;
  a transform that silently no-ops refuses to run.
- `Claude/Loki/probe-stage2-subtraction-orphan.js` — six-scenario differential battery on the
  harness, HEAD vs collapsed, recording per scenario: hard-reset log entries, the recovery's
  `window.scrollTo` restore, `Nav.applyScreen`'s exact option values, `#home`/`#options`
  `scrollTop` survival (pre-set to 77/55 — the resetScroll axis observable), `.nav-ghost`
  survival, and every `document.querySelector('.nav-ghost')` hit.

Reproduction (Git Bash, project root):

```
export PATH="/c/Users/nzilb/tools/node-dist:$PATH"
node Claude/Loki/probe-stage2-subtraction-orphan.js                      # battery, both variants
COLLAPSE=1 NODE_OPTIONS="--require $PWD/Claude/Loki/probe-stage2-subtraction-transform.js" \
  node --test test/*.test.js                                             # suite on the collapsed tree
node --test test/*.test.js                                               # suite at HEAD (baseline)
```

## 4. Producers, enumerated (not trusted)

Writers of `d`: `js/app.js:505` (arm), `:643` (vertical abandon), `:663` (`end()`), `:487`
(recovery). Writers of `session`: `:508` (arm), `:257` (`sessionDone`, identity-guarded),
`:486` (recovery). Writers of `finishing`: `:672` (settle → true), `:485` (recovery → false),
`:1143` (`runFinalize` → false), `:1182` (throw path → false). Between the recovery predicate
(`:435`) and `const cur = d || session` (`:474`) only `PBDebug.log` and `releaseGesture()`
(`:345` — listener removal only) execute; nothing nulls either handle. Producers of the
`nav-ghost` class: **none in first-party source** — a full-tree grep finds only readers
(`js/app.js:428/435/595`, `js/nav.js:105`) and comments; `ghostWrap` went in step 10.
`mover()` is called exactly three times in `js/swipe.js` (`:251`, `:260` 'borrowed-real';
`:265` 'owned-decoration') — D8 confirmed. `buildConstruction` has one `return`, two keys, no
`capture` (`:276`) — D2 confirmed. `env.scrollY` is never read (reads: document ×2, navPill
×2, renderDestination ×3, sourceEl ×2) — D1 confirmed. `revealPending` has a declaration and
one read, no assignment — D5 confirmed.

## 5. Battery results

| Scenario (entry route) | HEAD | Collapsed | Behaviourally identical? |
|---|---|---|---|
| S1 mid-drag second touch, home source (`d` truthy) | recovery, sid logged, 1 scroll restore, `resetScroll:false`, home scrollTop stays 77 | same | **YES** (recorded opts differ only by the deleted `keepGhosts` key) |
| S2 settling session superseded before finalize (`finishing && session`) | same as S1; stale 340ms finalize no-ops after | same | **YES** |
| S3 armed-only second touch (`d` truthy, live=false) | same shape | same | **YES** |
| S4 **CONTROL** — injected `.nav-ghost`, clean touch | ORPHAN branch fires: no sid, no scroll restore, `resetScroll` undefined → home scrollTop 77→**0**, ghost swept | **no recovery at all**: scrollTop stays 77, ghost **survives** | **NO — by design.** Proves the instrument detects an orphan entry, and executes R1's exact stake |
| S5 clean entry after completed finalize | no recovery | no recovery | **YES** |
| S6 mid-drag supersession, options source | `resetScroll:false`, options scrollTop stays 55 | same | **YES** |

`document.querySelector('.nav-ghost')` found a ghost **zero** times on every route except the
S4 injection. The two `resetScroll` values were **shown to differ in motion** (S4: 77→0 vs
77 kept) — the divergence is real and reachable only through an injected ghost.

Suite: HEAD **849 tests, 0 fail**. Collapsed **9 fail**, of which **eight are the plan's own
declared blast radius**: mutation-anchors (D13), source-gate-sweep anchor (§4a C3),
`nav.test.js` ghost-sweep cell (D14), `swipe-model` hash + rendered model (§4a C1, two tests),
`OB`, `OB-home`, `HR` (D14). The ninth is the fracture.

## 6. THE FRACTURE — an undeclared gate reddens on step 6's commit

**Body.** On the collapsed tree, `test/scroll-writer-set.test.js` `M1WRITERSET` fails:

```
these registered baseline entries no longer occur in source, so the inventory has rotted —
RE-DERIVE (do not delete the entry blindly; …):
  #10 [js/app.js] if (cur) window.scrollTo(0, cur.scroll0);
```

Baseline entry #10 (`test/scroll-writer-set.test.js:219-220`) registers §5's third ternary **by
its exact text, `if (cur) ` included**. The collapse rewrites that text. The gate is green at
HEAD and red under the collapse; attribution is exact.

**The promise it breaks.** §11 step 6 enumerates the same-commit co-change set and states
*"every one of these rot checks reddens otherwise"*; §4a presents C1–C4 as the complete set of
surfaces that "break or lie the moment §5's collapse lands"; exit condition 3 requires a green
suite. Executed: a fifth rot check, on no list in the plan, reddens. The plan cites
`scroll-writer-set.test.js` twice (§8 D16c, §13 decision 15) — both times as the source of the
sweep-exclusion criterion, never as blast radius.

**Blast radius.**
1. Step 6's exit conditions are unsatisfiable as enumerated: the builder lands a fourteen-item
   commit and meets a red gate with no plan disposition — the exact "unattributable red at the
   end of a fourteen-item commit" shape the plan's own R6 narrates, on a gate whose header
   forbids the cheap repair.
2. The repair is not a text bump. `runFinalize`'s abort restore (entry #11,
   `js/app.js:1141`) has the identical post-collapse text `window.scrollTo(0, cur.scroll0);`.
   The gate's Direction-3 attribution rule exists **because** #10's text strictly contained
   #11's (`test/scroll-writer-set.test.js`: "entry 10's line CONTAINS entries 11/12's text …
   otherwise the recovery site would be counted into the abort-path group"). The collapse
   erases the textual distinguisher between the recovery writer and the abort writer, so #10
   must be re-derived into a shared-text GROUP with #11 — the same structure as the retired
   11/12 pair — and the nesting comment corrected. A same-length tie also makes the
   longest-match sort's pick between two identical texts arbitrary; the group-count semantics
   absorb it, but the baseline prose that explains the nesting becomes false if left.
3. Class evidence: this is the third instance of the plan's own named defect class ("a
   deletion list is not the same thing as a blast radius", §4a) — rounds 1 and 2 each found
   instances by reading and each declared the set complete; this one was found only by
   executing the collapse, which is the campaign's standing lesson and the reason this seat
   was commissioned.

**Disposition owed (not performed here — this seat holds no pen).** Add
`test/scroll-writer-set.test.js` to §4a and §11 step 6's same-commit list: re-derive entry #10
into a shared-text group with #11 and correct the Direction-3 nesting prose.

## 7. Planes struck that HELD

- **Reachability of a null `cur` after the disjunct removal**: no first-party producer of the
  class exists (grep, whole tree); the predicate and the `cur` assignment are separated only
  by a logger and listener removal; every driven route (S1–S3, S5, S6) entered with `cur`
  non-null; the collapsed variant's unconditional `cur.scroll0` read — which throws loudly on
  a null `cur` — never threw across the battery **and** the full 849-test suite.
- **The resetScroll inversion (R1)**: executed both ways. The orphan value is deliverable only
  by injecting a ghost (S4); on every producible route the delivered value is `false` in both
  forms, and the pre-set scroll survives identically.
- **The [F6] adjacency**: `Nav.applyScreen`'s first statement is `resetSwipeStyles(…)` before
  any early return (`js/nav.js:129`); deleting the explicit reset call changed no observable
  in any scenario (pill/transform sweep still reached once, via `applyScreen`).
- **Supersession at unusual moments**: the superseded session's 340ms finalize after a
  recovery no-ops identically in both forms (S2); a clean post-finalize entry triggers no
  recovery in either (S5).
- D1, D2, D5, D8 producer sets confirmed against source (§4 above), and the D4/D6/D7 no-op
  claims exercised implicitly by the whole suite passing with the `disposeOwnedPanes` call
  deleted.

## 8. Ran, or could not reach

- **Not executed: `tools/fuzz-ui.js` in a real browser.** It would add randomized breadth to
  the reachability negative, at the cost of the offline-serving recipe. Deliberately skipped:
  every claim under strike is control-flow and DOM-fact, which jsdom executes faithfully;
  nothing here is layout- or paint-dependent.
- **Outside any instrument here (and the plan's own stated residual)**: a `.nav-ghost` class
  assembled at runtime from fragments, or injected by a non-first-party surface. No such
  surface exists at HEAD; no textual or jsdom instrument can close it.
- The `test/` cells that inject ghosts remain the only constructors of the orphan input; the
  plan deletes them (D14), which is consistent with S4's finding that the input is
  constructible only by injection.

## 9. Reconciliation (from the artifact alone — the review casebooks stay unread)

The plan knew the CLASS: §4a opens with "a deletion list is not the same thing as a blast
radius" and records that rounds 1 and 2 each added missed surfaces. The instance was invisible
to three reading passes because the gate registers a source line whose text the collapse
changes *incidentally* — the line survives, its `if (cur) ` prefix does not, and no reader
scanning for deleted machinery scans for a gate that pins the machinery's surviving neighbour
verbatim. The failure entered at the boundary the plan's own [G2]/[G16] lesson names: an
enumeration that is true and checkable at every listed entry, and incomplete.

## Probes filed

- `Claude/Loki/probe-stage2-subtraction-transform.js` (the in-memory collapse)
- `Claude/Loki/probe-stage2-subtraction-orphan.js` (the battery)

No `*.mutbak` in the tree; no product file modified; `tools/mutation-sweep.mjs` and
`tools/source-gate-sweep.mjs` were not invoked.
