# Poirot — Stage 6e code review: `disposeOwnedPanes` (owner-driven typed emergency disposal, F dispose-half)

Type: code-review
Prior-review: POIROT-swipe-stage6d-9027daf.md
Target: git HEAD **1ebbf5d** (immutable). Reviewed against the real code + executed suite.
Range: `js/app.js`, `js/nav.js` (read as callee), `js/swipe.js` (read for ownership tags), `tools/mutate.mjs`,
`test/swipe-stage6e.test.js`, `test/swipe-model.test.js`, `docs/swipe-model.generated.txt`,
`Claude/Curie/RED-swipe-stage6e.md`, `Claude/Brunel/swipe-stage6e-build.md`.

Verdict: **SHIP**

---

## The scene (intent)

6e replaces the DOM-global `.nav-ghost` sweep's owned-pane-removal effect, at the ONE site that disposes an
owned pane by ownership today — `begin()`'s supersession recovery of a live pane-owning DRAGGING session — with
a typed, owner-driven `disposeOwnedPanes(owner, reason)` (js/app.js:358-364). On the owned branch the sweep is
suppressed at BOTH call sites (`resetSwipeStyles(cur ? true : undefined)` at :441 and `keepGhosts: cur ? true :
undefined` on the `applyScreen` opts at :442, consumed by `applyScreen`'s own baseline `resetSwipeStyles`
call, nav.js:120), so the removal is owner-driven and not duplicated (EC §4.16). The orphan branch (`cur` null)
keeps the full sweep at both sites. This is a byte-parity extraction (EC §4.19): the DOM outcome is identical
on every reachable state; the value is structural (closes the §4.3 "operate through whatever is global"
anti-pattern for the owned case, and lands the `dispose(reason)` half of the pane interface F).

Intent verified correct: the commit description matches the code, and the scope matches the plan §2 boundary
(no reveal timing, no paint gate, no hold/drop control flow, nav.js unchanged).

## The investigation — executed evidence

Every load-bearing claim was checked by running it, not argued.

- **Full suite reconciles the build claim.** `node --test "test/*.test.js"` → **722 tests, 721 pass, 0 fail,
  1 skip** — byte-matches the commit's Zelda-verified figures.
- **Stage-6e suite green.** `node --test test/swipe-stage6e.test.js` → **9/9 pass** (NOOP.mechanism,
  NOOP.attribution, RSN, DP.browse-browse, DP.browse-home, BR, HR, DEC, RGreveal).
- **Model + fingerprint + mutation anchors green.** `node --test test/swipe-model.test.js
  test/mutation-anchors.test.js` → **13/13 pass** — the regenerated `supersession` fingerprint
  (`502467fc…` → `99b3ddb8…`) matches the current source, and every new/re-anchored mutant resolves.
- **The three new mutants redden their cells (tests can fail).** `node tools/mutate.mjs {69,70,71}` then the
  6e suite: #69 (own filter never matches → removes nothing) → 6 fail incl. NOOP.attribution/DP/RSN; #70
  (broaden to remove every mover) → 3 fail incl. BR; #71 (guard `.np-pill-float` behind keepGhosts) → exactly
  1 fail = DEC. Auto-restored clean.
- **Loki residual 1 is genuinely closed at BOTH sites — executed.** I dropped `keepGhosts` at each site
  individually (transient perl edit, restored via git; `git diff` verified empty after) and ran NOOP:
  site-1 drop (`resetSwipeStyles()`) → **NOOP.mechanism reddens**; site-2 drop (remove `keepGhosts` from the
  `applyScreen` opts) → **NOOP.mechanism reddens**. So the `sweeps===0` assertion is a true both-sites guard,
  not decorative. `resetSwipeStyles` (nav.js:103) is the unique caller of `querySelectorAll('.nav-ghost')`
  (the `.spent` clear uses `.nav-ghost.spent`; the recovery predicate uses `querySelector` singular; the
  disposer uses `owner.movers`) — confirmed by grep — so the sweep-count probe is faithful.

## Killer vs witness — the focus items

- **disposeOwnedPanes correctness (js/app.js:358-364).** Filters `m.own === 'owned-pane'` only; the
  `&& m.el.parentNode` idempotence guard short-circuits before any null deref (an owned-pane mover always
  carries the ghost wrap `el`); takes `owner` explicitly and reads only `owner.movers`/`owner.id` — never the
  module `session`/`d`, never a class query (EC §4.3). The PBDebug trace fires only when `disposed` flipped
  true, so a pane-less/no-op call claims no disposal (Charpy F2) — proven by RSN(2): a pane-less overlay→browse
  supersession emits no `superseded` line. Predicate is byte-identical to the sibling `dropPanes` (app.js:623).
- **I17 safety (§4.18).** A pane-owning SETTLING/FINALIZING/REVEALING session has `finishing===true` and is
  NOT pane-less, so the narrowed gate at app.js:383 (`if (finishing && !(session && paneLess(session)))
  return;`) rejects it before the recovery block is reached. The recovery therefore disposes an owned pane
  ONLY for a DRAGGING `cur=d` (finishing false); a pane-less `cur` no-ops the filter; the orphan branch sweeps.
  A held-reveal pane is unreachable by the disposer. I17(a) stays gated; I17(b) stays the full sweep.
- **The DEC decoration interaction.** `.np-pill-float` removal (nav.js:104) is UNGUARDED by `keepGhosts`, so
  `keepGhosts:true` skips only the `.nav-ghost` sweep and never strands the decoration — DEC green, #71 reddens.
- **Byte-parity.** The owner-driven set equals the class-swept set for every reachable owned state (Loki
  HELD_STONE + Charpy S2: `.nav-ghost` is produced only by `ghostWrap`, both owned-pane wraps route through it,
  no borrowed real is ever tagged; a stray coexisting with a live owned `cur` is unconstructible via I2 + the
  `.spent` clear + begin-clears-before-arm). Borrowed reals are outside both removers by the `own` filter (BR).
- **Loki residual 2 correctly OWED.** The unguarded `.nav-ghost === owned-pane` invariant (a future synchronous
  throw inside the mid-build window would strand an owned pane the old global sweep self-healed) is
  unconstructible at HEAD (Browse.render is `async`), and the build leaves it entirely unguarded and honestly
  owed in the commit message + plan §10 — not silently half-addressed. Carried as [W9].
- **Charpy F1 (dropPanes duplication).** `disposeOwnedPanes` and `dropPanes` (app.js:623) share one byte-
  identical owned-pane removal. Not an EC §4.16 data hazard (different sites/phases, no shared mutable state);
  acceptable for this slice, tracked for the F pane-object folding. Carried as [W10]. Not a blocker.

## Coverage Ledger (built mechanically from the diff; ✓ = executed this pass, ~ = read/reasoned)

| Changed symbol | Correctness | Ownership §4.3/4.4 | Dup-policy §4.16 | Dead-field §4.15 | I17 §4.18 | Byte-parity | Comment-claims | Mutation-can-fail | Source/fingerprint |
|---|---|---|---|---|---|---|---|---|---|
| `disposeOwnedPanes` (app.js:358-364) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| recovery owned/orphan branch (app.js:440-442) | ✓ | ✓ | ✓ | n/a | ✓ | ✓ | ✓ | ✓ | ✓ |
| recovery comment block (app.js:402-439) | ~ | n/a | n/a | n/a | ~ | n/a | ✓ | n/a | ~ |
| `resetSwipeStyles` callee (nav.js:102-108, unchanged) | ✓ | ✓ | ✓ | n/a | n/a | ✓ | ~ | ✓ | ✓ |
| mutants #69/#70/#71 (mutate.mjs) | ✓ | n/a | n/a | n/a | n/a | n/a | ~ | ✓ | ✓ |
| re-anchored mutants (HARDRESET/VR/RENDER/F1, mutate.mjs) | ~ | n/a | n/a | n/a | n/a | n/a | n/a | ✓ | ✓ |
| supersession fingerprint pin (swipe-model.test.js) | n/a | n/a | n/a | n/a | n/a | ✓ | ~ | ✓ | ✓ |
| generated fingerprint/line refs (swipe-model.generated.txt) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | ✓ |
| RED suite (swipe-stage6e.test.js) | ✓ | ✓ | ✓ | n/a | ✓ | ✓ | ~ | ✓ | ✓ |
| records (RED/build .md) | ~ | n/a | n/a | n/a | n/a | n/a | ~ | n/a | ~ |

Commands backing the ✓ cells: `node --test "test/*.test.js"`; `node --test test/swipe-stage6e.test.js`;
`node --test test/swipe-model.test.js test/mutation-anchors.test.js`; `node tools/mutate.mjs 69|70|71`
(+ 6e suite); the two single-site keepGhosts-drop perl probes + `git diff` restore-verify;
`grep -n "querySelectorAll('.nav-ghost')" js/*.js`.

No cell is empty. No cell is a finding.

## The revelation

**SHIP.** The change is a faithful, byte-parity extraction. All 722 tests pass; the two mechanism cells
(NOOP.mechanism/attribution) and RSN observe exactly the owner-driven, reason-tagged disposal the slice exists
to introduce, and I confirmed by execution that NOOP.mechanism reddens on a `keepGhosts` drop at either site —
so Loki residual 1 is closed at BOTH sites, not decoratively. disposeOwnedPanes filters `owned-pane` only,
guards `parentNode`, takes its owner explicitly, and traces only on real disposal. I17 holds via the finishing
gate. The three new mutants anchor real lines and redden their cells; the fingerprint is regenerated and
matches. Loki residual 2 and the F1 duplication are honestly deferred, not hidden. Nothing here is a change a
competent reviewer would require before submit.

Two Observations (neither moves the verdict): (1) the commit message labels the *unguarded invariant*
"residual 2" while the in-code comment at app.js:437 labels the *keepGhosts-both-sites* concern "residual 2" —
the code comment matches the Loki §6 bullet ordering and is the authoritative one; the commit-message label is
a harmless inconsistency in non-code prose. (2) The `sweeps===0` assertion in NOOP.mechanism — the anti-no-op
guard that IS the point of the slice — has no *registered* single-site-`keepGhosts`-drop mutant in
`tools/mutate.mjs` (the built-code mutants cover attribution/broaden/decoration); I proved its fail-ability by
hand, and persisting that mutant is a mutation-registry completeness question for the coverage auditor, not a
code defect. Handed to Mendeleev as [W12].

## Prediction

If a later slice folds the pane object (F unification) and edits the owned-pane removal predicate in only one
of `disposeOwnedPanes` / `dropPanes` (the F1 duplication), the two will silently diverge — collapse them
together, as the F interface is designed to. And the day a synchronous throw is introduced into the mid-build
window (a sync rewrite of `Browse.render`, or a new sync callee before `d.movers` is populated), the unguarded
invariant (W9) reopens and `keepGhosts:true` will strand an opaque full-viewport pane the old global sweep
would have self-healed — the amendment that guards the invariant should land before any such sync path does.

## Watch-list

- **[W1] open** — Stage-6b records reconciliation (`Subsystems/swipe-reveal.md` §8, DecisionLog, `PLAN-swipe-reveal.md` §7) un-applied in HEAD. Owner Zelda. Not a code matter. Carried 8e968fb→…→6d.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition, un-executed (resource-plane). Owner on-device strike. Carried from 8e968fb; unaffected by 6e.
- **[W4] open** — 6c apply-on-approval records, notably the `js/app.js` classifier comment (now shifted past the 6e insertion) with the false "app-ghost (browse→browse)" text (O2 of ba1c59b). Owner Zelda. Carried.
- **[W5] open** — Loki r2 lesser-planes: `recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` (a one-line build assert would make `paneLess([])` structural — 6e leans on `paneLess`) → optional hardening, owner Brunel. Carried.
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat. Carried.
- **[W7] open** — 6d apply-on-approval records un-applied in HEAD (subsystem §17/§23, DecisionLog, `PLAN-swipe-reveal.md` §7, build number). Owner Zelda. Not a code matter. Carried.
- **[W8] open** — the arm-time `classifyTransition` throw has no durable home (Charpy §5 clause unfolded). Owner Vitruvius/Zelda; plan prose. Carried.
- **[W9] open (new, 6e)** — Loki residual 2: the unguarded `.nav-ghost === owned-pane(live session)` invariant. Unconstructible at HEAD (Browse.render async); OWED to a later amendment that guards the mid-build stranding before any sync path into that window lands. Owner: a future F/coverage amendment + Mendeleev.
- **[W10] open (new, 6e)** — Charpy F1: `disposeOwnedPanes` (app.js:361) and `dropPanes` (app.js:623) are byte-identical owned-pane removers at two sites; collapse when the F pane object folds. Tracked, not a defect now. Owner: F-unification slice.
- **[W11] open (new, 6e)** — 6e apply-on-approval records (plan §9): rewrite `Subsystems/swipe-reveal.md` §7/§8/§14/§19/§23; append the dated Stage-6e DecisionLog entry; annotate `PLAN-swipe-reveal.md` §7 step 6; author `Claude/Campaigns/swipe-stage6e.json`; bump the build number. Owner Zelda. Not a code matter.
- **[W12] open (new, 6e)** — the NOOP.mechanism `sweeps===0` anti-no-op assertion (the slice's non-vacuity guard) has no *registered* single-site-`keepGhosts`-drop mutant in `tools/mutate.mjs`; fail-ability proven by hand this pass. Persisting the mutant is a mutation-registry adequacy item. Owner Mendeleev.

---

{"persona":"poirot","stage":"6e","input_artifact":"1ebbf5d","verdict":"SHIP","blocking_ids":[],"return_to":"none"}
