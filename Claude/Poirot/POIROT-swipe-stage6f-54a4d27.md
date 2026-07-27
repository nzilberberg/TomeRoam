# Poirot — code review, Stage 6f (in-flow→overlay outgoing → app-ghost) — target 54a4d27

Type: code-review
Prior-review: POIROT-swipe-stage6e-1ebbf5d.md
Range: `git diff 54a4d27~1 54a4d27` — js/swipe.js, test/fixtures/swipe-plan-spec.mjs,
test/transition-matrix.test.js, docs/transition-matrix.generated.txt, docs/swipe-model.generated.txt,
tools/mutate.mjs, test/swipe-stage6f.test.js (new), Claude/Curie/RED-swipe-stage6f.md (new),
Claude/Brunel/swipe-stage6f-build.md (new).
Date: 2026-07-27. Reviewer: Poirot (read-only). Runtime: node v22 present
(`C:\Users\nzilb\tools\node-dist\node.exe`) — the contract-surface pass was EXECUTED, not argued.

Verdict: **SHIP**

The whole slice is one production keystroke — the `outgoing` decision value in the pure
`constructionPlanFor` — flipped so an in-flow source going to a non-home destination mints an owned-pane
app-ghost instead of borrowing the real in-flow view. Everything else is the co-changed frozen oracle, the
self-consistency predicate, two regenerated inventories, and two registered mutants. I read every changed
region in full, executed the contract surface, ran the two new mutants to ground, and confirmed the one
precondition the whole review turns on: `js/app.js` is byte-identical to its parent. Nothing a competent
reviewer would require changed remains.

---

## The load-bearing precondition — app.js is untouched (Loki's HELD_STONE stands)

`git diff 54a4d27~1 54a4d27 -- js/app.js` is **empty**. The four mirrored-region fingerprints
(`gen-swipe-model.mjs:44-61` — navTo / nav-relation / gesture-end / supersession hashes of app.js) are
unchanged: `test/swipe-model.test.js` "every mirrored js/app.js region still matches what was verified"
passed (executed). Since those hashes are of app.js source and app.js did not move, they could not move — and
they did not. The `docs/swipe-model.generated.txt` change is ONE line (`browse -> overlay … pane=no →
pane=yes`), derived from the frozen `STRUCTURAL_CASES` spec (not from app.js), so it is legitimately
spec-driven, not a fingerprint drift.

Consequence for the gate chain: Loki's r1 strike (STRIKE-swipe-stage6f-r1) replayed the four app.js
transform-write loops (555/576/615/775) **verbatim**, and residual 1 conditioned a re-strike on "if the build
touches app.js movers." The build touched no app.js line. Residual 5 warned that a build special-casing
individual overlay kinds would re-open the `Nav.isOverlay` membership hole; the built change keys off
`c.toKind === 'home'` — a *kind*-level test through the same `classifyTransition`, not an overlay-kind list.
**No mandatory re-strike; the HELD_STONE covers the built artifact.**

## The constructionPlanFor change — correct across all eight structural cases

`KINDS = ['home','browse','overlay']` (swipe.js:58). After the `fromKind==='overlay' → 'real-source'`
guard, `toKind` can only be home/browse/overlay, so

```
c.toKind === 'home' ? 'real-source' : 'app-ghost'
```

is provably the same function as Loki's hypothesized `(toKind==='browse' || toKind==='overlay') ?
'app-ghost' : 'real-source'`. Enumerated: home→browse app-ghost, home→overlay app-ghost (changed),
browse→home real-source, browse→browse app-ghost, browse→overlay app-ghost (changed), overlay→{home,browse,
overlay} real-source. Exactly the two in-flow→overlay members flip; in-flow→home stays real-source,
overlay-source untouched. No real-source leak (would re-transform the real view) and no over-broadening
(would ghost something that must stay real-source). Executed: MODEL test asserts app-ghost over all 35
in-flow×overlay pairs and the over-broaden guard asserts the three unchanged families — both green.

## Everything else the slice must preserve

- **Frozen oracle** (`swipe-plan-spec.mjs` 55/58/181 + comment 33): three expected-value flips mirror the
  production rule exactly; `swipe-transition.test.js` "every ordered registry pair yields exactly the
  construction plan the spec fixes" is green (executed) — production and the independent oracle agree, and
  reverting production reddens it (mutant #77 → MODEL, executed).
- **Self-consistency predicate** (`transition-matrix.test.js:85`): `c.from !== 'overlay' && c.to !== 'home'`
  is correct across all eight cases; test 38 "the frozen spec builds a pane exactly when the GHOST/SNAPSHOT
  rules say" green.
- **Regenerated docs**: both byte-exact gated (tests 3 and 36 green); the pane-count summary 27→62 of 132 is
  mechanically derived and gated, not hand-asserted.
- **Reveal / disposal / scroll / NP pill / .alphaindex**: the reveal is the plain no-hold `dropPanes` path
  (REVEAL cell + its non-vacuity control, both green; #78 reddens only REVEAL). The NP pill still clones on
  browse→nowplaying with an app-ghost outgoing (DEC green; existing mutant #38 reddens only DEC). `#browse`
  is no longer transformed on these transitions, so it does not become the fixed `.alphaindex` strip's
  containing block — strictly better than today, plan §4 (verified by reading; the strip is not touched by
  the diff).

## The structural-invariant cells are genuine, not vacuous, not rAF-based

`SIbrowse`/`SIhome` drive the REAL gesture through `h.touch` (real begin→start→move) and read the INLINE
`style.transform` on the real `#browse`/`#home`, asserting `''`. Non-vacuity is structural: each carries a
fixture-sanity guard (`starts(h).length === 1`; SIhome asserts `#home` is not `.parked` so the read is the
swipe write, not the standing stylesheet transform). No `requestAnimationFrame` flash-detection anywhere —
the cells pin the STRUCTURAL invariant only, exactly as the plan scopes. Executed proof of falsifiability:
mutant #77 (which reproduces the HEAD state Curie recorded RED) reddens SIbrowse, SIhome, GHOST-commit,
GHOST-abort, MODEL on their load-bearing assertions — the exact five red-first cells.

## Honesty, dead fields, parity/policy

- **Flash**: neither the code, the tests, nor the build report claims the compositor flash is fixed. The
  commit message and build report §12 disclose it as device-only and downstream; Loki's own observation
  (finalize yanks a full-viewport composited ghost — the layer-teardown suspect) is left in the room, not
  claimed away. Honest.
- **Dead fields (EC §4.15; the .239 lesson)**: no new returned field — `constructionPlanFor` returns the
  same keys, one string VALUE flips. The flipped `'app-ghost'` value IS consumed (buildConstruction:317-323
  builds the ghost; GHOST cell proves a real `.nav-ghost` appears). `tools/dead-return-fields.mjs` green.
- **§4.19 parity vs policy**: classified NEW POLICY, no known-red, no PolicyLedger entry, and `NEW_POLICIES`
  = no new entry. Correct: `NEW_POLICIES` tracks recovery/supersession *behaviour* deviations; this is an
  intended-parity construction-*representation* change whose silent reversion is guarded by the frozen spec +
  `swipe-transition` oracle (mutant #77 → MODEL, executed), not by that ledger. `swipe-model.test.js`
  "§8A ledger — the EXACT set of new policies" green (the set is byte-unchanged). Charpy T2-verified.
- **Records reconciliation deferred**: the DecisionLog entry, `Subsystems/swipe-reveal.md` rewrite,
  `PLAN-swipe-reveal.md` §7-step-6 annotation, campaign manifest, and build-number bump are plan §9
  apply-on-approval items, correctly left for Zelda's close-out (build report §11). This matches the pattern
  of stages 6b–6e (W1/W4/W7/W11) — a records matter, not a code defect. Carried as W13 below.

---

## Coverage Ledger (Phase 4b) — every changed symbol × every dimension; no empty cell

`✓` = cleared by EXECUTED evidence this pass (command cited); `~` = cleared by reading/reasoning; `n/a`.

Commands cited:
- **[C1]** `node --test test/swipe-stage6f.test.js test/swipe-model.test.js test/transition-matrix.test.js test/swipe-transition.test.js test/mutation-anchors.test.js` → 38/38 pass.
- **[C2]** `node --test test/*.test.js` → 731 tests, 730 pass, 0 fail, 1 skip.
- **[C3]** `node tools/mutate.mjs 77` + `node --test test/swipe-stage6f.test.js` → 5 fail (SIbrowse/SIhome/GHOST×2/MODEL), 4 pass; `--restore` → clean.
- **[C4]** `node tools/mutate.mjs 78` + 6f suite → 1 fail (REVEAL), 8 pass; `--restore` → clean.
- **[C5]** `git diff 54a4d27~1 54a4d27 -- js/app.js` → empty; `git status --porcelain` clean (only pre-existing untracked Charpy casebooks); no `*.mutbak`.

| Changed symbol | Correctness | app.js-untouched | Over-broaden | Dead-field | Parity/policy | Reassuring-comment | Mutation |
|---|---|---|---|---|---|---|---|
| `constructionPlanFor` outgoing (swipe.js:140-141) | ✓ [C1,C3] | ✓ [C5] | ✓ [C1,C3] | ✓ [C2 dead-return] | ✓ [C2 policy-ledger] | ✓ doc-comment 114-119 read, true | ✓ [C3] |
| `constructionPlanFor` doc-comment (114-125) | ~ read, matches code | n/a | n/a | n/a | n/a | ✓ no false absolute claim | n/a |
| spec 55/58/181 + comment 33 | ✓ [C1] | n/a | ✓ [C1] | n/a | ✓ [C1 swipe-transition] | ~ comment restated true | ✓ [C3] |
| `transition-matrix.test.js:85` predicate + c83 | ✓ [C1] | n/a | ✓ [C1] | n/a | n/a | ~ | ✓ [C1] |
| `transition-matrix.generated.txt` (62/132) | ✓ [C1 byte-exact] | ~ derived-from-spec | n/a | n/a | n/a | n/a | n/a |
| `swipe-model.generated.txt` (pane row) | ✓ [C1 byte-exact] | ✓ [C1,C5 fingerprints] | n/a | n/a | ✓ [C1 §8A set] | n/a | n/a |
| mutate.mjs #77 | ✓ [C3] anchors+reddens | n/a | n/a | n/a | n/a | n/a | ✓ [C1,C3] |
| mutate.mjs #78 | ✓ [C4] anchors app.js:1185+reddens | ✓ [C5] restored | n/a | n/a | n/a | n/a | ✓ [C1,C4] |
| `swipe-stage6f.test.js` (9 tests) | ✓ [C1] non-vacuous | n/a | ✓ MODEL guard | n/a | n/a | ~ header scope honest | ✓ [C3,C4] |
| Brunel/Curie casebooks | ~ read, honest | n/a | n/a | n/a | n/a | n/a | n/a |

No empty cell. Every `✓` cites an executed command.

---

## Prediction (Phase 6)

If this ships and later reverts the one line, the frozen spec + `swipe-transition` oracle (MODEL) reddens
before it reaches a device — the guard is executable and proven (#77). The residual that CI cannot see
remains device-only: finalize now yanks a full-viewport composited app-ghost over the real view on
in-flow→overlay (Loki's parting observation; the layer-teardown flash suspect), and for the vertically-inset
overlay destinations the stationary real view is partially visible (blurred) behind the ~86%-opaque
topbar/navbar bands (plan T3). Neither is a promise this slice made; both are the device pass's to judge. The
pattern to watch as the structural axis advances: each further slice (browse→home outgoing, then the T8-forked
incoming) moves closer to the hold/paint surface where the ~8 retracted verifications live — the safety this
slice earned came precisely from staying off it.

---

## Watch-list

- **[W1] open** — 6b records reconciliation un-applied in HEAD. Owner Zelda. Not a code matter. Carried.
- **[W2] open** — iOS WebKit fidelity of the 6b two-id reveal re-store at a hidden-tab transition, un-executed. Owner on-device strike. Carried.
- **[W4] open** — 6c apply-on-approval records, incl. the `js/app.js` classifier comment with stale "app-ghost (browse→browse)" text (now further out of date, since 6f widens app-ghost to in-flow→overlay, but app.js is correctly untouched so this is not a 6f edit). Owner Zelda. Carried.
- **[W5] open** — Loki r2 lesser-planes: `recovery-overlay-visibility-unpinned` → Mendeleev; `paneless-predicate-phase-coupling` hardening → Brunel. 6f leans on the owned-pane paths; unchanged. Carried.
- **[W6] open** — design consequence `any-touch-cancels-committed-settle-ux`. Owner design seat. Carried.
- **[W7] open** — 6d apply-on-approval records un-applied in HEAD. Owner Zelda. Carried.
- **[W8] open** — the arm-time `classifyTransition` throw has no durable home. Owner Vitruvius/Zelda. Carried.
- **[W9] open** — Loki 6e residual 2: the unguarded `.nav-ghost === owned-pane(live session)` invariant. 6f creates in-flow→overlay owned panes synchronously (like browse→browse); not constructibly worsened. Owner: future F/coverage amendment + Mendeleev. Carried.
- **[W10] open** — `disposeOwnedPanes` (app.js:361) and `dropPanes` (app.js:623) byte-identical removers; collapse on F-pane unification. Owner: F-unification slice. Carried.
- **[W11] open** — 6e apply-on-approval records un-applied in HEAD. Owner Zelda. Carried.
- **[W12] open** — the 6e `sweeps===0` non-vacuity guard has no registered single-site mutant. Owner Mendeleev. Carried.
- **[W13] open (new, 6f)** — 6f apply-on-approval records (plan §9): append the dated Stage-6f NEW-POLICY DecisionLog entry; rewrite `Subsystems/swipe-reveal.md` §7/§8/§17/§18/§23; annotate `PLAN-swipe-reveal.md` §7 step 6; author `Claude/Campaigns/swipe-stage6f.json`; bump the build number. Owner Zelda. Not a code matter. Confirmed staged-not-applied in HEAD (build report §11).
- **[W14] open (new, 6f)** — device pass owes: (a) T4 opaque-over-own-rect re-confirm at merge; (b) T3 topbar/navbar-band exposure for inset overlay destinations; (c) whether removing the real-view transform on this family changes any observed flash (differential vs still-transformed browse→browse). Owner on-device strike. Not a CI gate.

---

Verdict: **SHIP**

{"persona":"poirot","stage":"6f","verdict":"SHIP","target":"54a4d27","artifact":"Claude/Poirot/POIROT-swipe-stage6f-54a4d27.md","app_js_untouched":true,"findings":[],"return_to":"zelda"}
