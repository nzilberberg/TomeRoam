# Mendeleev — Stage 6e coverage audit: `disposeOwnedPanes` (owner-driven typed emergency disposal, F dispose-half)

Type: coverage-audit
Date: 2026-07-27
Target: git HEAD **1ebbf5d** (immutable; SHIP'd by Poirot `POIROT-swipe-stage6e-1ebbf5d.md`).
Gate: **publish gate** (post-build, green suite) — audited beside the code review.
Coverage Model: `Claude/Plans/PLAN-swipe-stage6e.md` §7 (catalog) + §8 (cell/mutation matrix).
Suite: `test/swipe-stage6e.test.js` (9 tests); registry `tools/mutate.mjs`; sweep `tools/mutation-sweep.mjs`;
anchors `test/mutation-anchors.test.js`; model `test/swipe-model.test.js`.

Verdict: **BARE_CELLS**

The behavioural suite spans its contract: every applicable Coverage-Model cell is swept by a passing test
that genuinely forces its condition on a real observable channel (proven by execution below). The gap is
confined to the **Mutation-cases** catalog dimension (§7, applicable=Yes): three load-bearing assertions —
including the one the whole slice's structural value rests on — have **no registered, sweep-runnable
mutant** defending their non-vacuity. Their fail-ability exists today only as one-time hand checks
(Poirot's and this audit's), which is vigilance, not the runnable-in-tooling structure EC §4.10 (a gated
core rule) and the project's rules-vs-gates law require. The running suite (`node --test`) DOES catch each
of these faults today; what is bare is the durable registry defence that keeps those assertions from
silently going inert under a future refactor — the exact "inert test" failure mode, one level up, that the
mutation registry exists to prevent.

---

## 1. The matrix — every Coverage-Model cell, with its status (Phase 2/3)

Cells from plan §7/§8 plus the Curie-added NOOP anti-no-op cell. Channel and mutation-defence status are
from execution (§2).

| Cell | Behaviour promised | Test | Swept? | Registered mutation defence |
|---|---|---|---|---|
| NOOP.mechanism | on the owned recovery branch the DOM-global `.nav-ghost` sweep runs at NEITHER site (`sweeps===0`) — removal is owner-driven | `NOOP.mechanism` | YES (non-vacuous; reddens on single-site keepGhosts drop) | **BARE — no registered mutant** (Finding B1) |
| NOOP.attribution | with the sweep neutralised the owned pane is STILL removed (disposer is the remover) | `NOOP.attribution` | YES | #69 (own filter never matches) ✓ |
| RSN (part 1) | an owned-pane supersession records reason `'superseded'` in the PBDebug SWIPE trace | `RSN` | YES | line-absence: #69 ✓ / token-mistag: **BARE** (Finding B2) |
| RSN (part 2) | a pane-LESS supersession disposes nothing → emits NO reason (Charpy F2) | `RSN` | YES (unconditional-emit reddens it) | **BARE — no registered mutant** (Finding B2) |
| DP.browse-browse | owned `.nav-ghost` disposed on a browse→browse DRAGGING supersession; successor arms clean | `DP.browse-browse` | YES | #69 ✓ |
| DP.browse-home | owned home-snapshot disposed on a browse→home DRAGGING supersession | `DP.browse-home` | YES | #69 ✓ |
| BR | on browse→home the borrowed-real `#browse` is NEVER removed; only the owned snapshot goes (Loki residual-2 tested invariant) | `BR` | YES | #70 (broaden to remove every mover) ✓ |
| HR | an ORPHAN `.nav-ghost` (no owning session) is swept at `begin()` on the `cur`-null branch (I17(b)) | `HR` | YES | coarse only — #13 (guts whole block); promised orphan-specific mutant missing (Finding N1) |
| DEC | the owned-decoration `.np-pill-float` is still removed on the owned recovery (unguarded by keepGhosts) | `DEC` | YES | #71 (guard np-pill-float behind keepGhosts) ✓, reddens exactly 1 test |
| RGreveal | the paint-gated `release()` half is byte-untouched — a browse→browse abort still takes the held-reveal branch | `RGreveal` | YES | #54 (abortRender forced 'none') ✓ |
| RGsup | 6c pane-less recovery + 6d `finalizationPlanFor` render decision + 6c settle-phase guards unchanged | reconciled by reference (block at file end) | YES (owned by 6c/6d cells; mutants #43/#44/#19/#68) | inherited from owning suites ✓ |

Catalog dimensions (§7), each accounted (absence is a decision):
Lifecycle/phases — Yes (DP/RGreveal/RGsup). Identities — N/A (no id created/reinterpreted). Ordering — Yes
(DP/HR, §6). Resources acquired/owner/endpoint — Yes (DP/BR). Async — N/A (no async surface change).
Stale completions — N/A (no new continuation; RGsup). Normal completion — Yes parity (RGreveal). Recovery
authority boundary — Yes (DP/RGsup). Emergency disposal — Yes (DP/HR). Persistence — N/A (in-memory).
External side effects — Yes (DP/BR real DOM). Invariants — Yes (BR = I2/§4.4 by construction; deeper
unconstructible invariant correctly OWED, §4). **Mutation cases — Yes, and this is where the bare cells
live (Findings B1/B2/N1).** Known-red — N/A. Composition — Yes (RGreveal/RGsup). Contract claims — N/A
(void helper). Concurrency — N/A. Observability — Yes (real DOM + labelled PBDebug trace).

---

## 2. The sweep — executed evidence (Phase 3)

All runs synchronous, `node` = `C:\Users\nzilb\tools\node-dist\node.exe`; working tree restored and verified
pristine after every probe (`git diff --stat` empty on `js/`; no `*.mutbak`/`*.probebak`).

- **Baseline green.** `node --test test/swipe-stage6e.test.js` → 9/9 pass.
  `node --test test/swipe-model.test.js test/mutation-anchors.test.js` → 13/13 pass.
- **Registered 6e mutants each redden their INTENDED cell.** Per-mutant against the 6e suite:
  - **#69** (own filter never matches → removes nothing): reddens NOOP.mechanism, NOOP.attribution, RSN,
    DP.browse-browse, DP.browse-home, BR; HR/DEC/RGreveal green. Intended DP + NOOP.attribution + RSN(line)
    reddened. ✓
  - **#70** (broaden to remove every mover): reddens **BR** (the intended borrowed-survives clause), plus
    RSN and DP.browse-browse; NOOP stays green (sweep suppression untouched). ✓
  - **#71** (guard `.np-pill-float` behind keepGhosts): reddens **exactly one test — DEC**. ✓
  - `tools/mutation-sweep.mjs 69 70 71` → all three `caught`, `0 uncaught, 0 unapplied, 0 stale flags`.
- **Anchor targeting is correct (not a byte-identical sibling).** #69/#70 anchor
  `if (m.own === 'owned-pane' && m.el.parentNode) { m.el.remove(); disposed = true; }` (js/app.js:361) is
  UNIQUE to `disposeOwnedPanes` — the sibling `dropPanes` (js/app.js:623) is a one-line arrow
  (`for (const m of cur.movers) if (…) m.el.remove();`) with no `disposed = true;` and different indent, so
  the string replace cannot hit it. `test/mutation-anchors.test.js` (13/13) confirms every anchor still
  applies to exactly its site.
- **W12 crux — the `sweeps===0` guard has NO registered defender (executed).** Transient single-site
  `keepGhosts` drops, each backed up and restored (`git diff` empty after):
  - drop at **:441** (`resetSwipeStyles(cur ? true : undefined)` → `resetSwipeStyles()`): **NOOP.mechanism
    reddens** — "Global sweeps during recovery=1"; NOOP.attribution stays green.
  - drop at **:442** (remove `keepGhosts: cur ? true : undefined` from the `applyScreen` opts):
    **NOOP.mechanism is the ONLY test that reddens** — count 1; every other 6e cell green.
  Neither fault is produced by any registered mutant: #13/#69 fail NOOP.mechanism on its *earlier*
  `ghosts===0` assertion (they remove nothing, so the pane survives), NOT on `sweeps===0`; #70/#71 leave
  keepGhosts intact; the re-anchored recovery mutants (`HARDRESET_DISPOSE`, `VR_HOLD_ORDER`,
  `RECOVERY_RENDER_ALWAYS_FALSE`) either gut all three recovery lines or leave both keepGhosts sites
  untouched. Confirmed by inspection of `tools/mutate.mjs` and by `--list` (only #69/#70/#71 are
  6e-specific).
- **RSN registry gap (executed).** Hand-probe reason-mistag (`'superseded'` → `'hardreset'`):
  **RSN reddens** — proving the token specificity is non-vacuous, yet no registered mutant tests the token
  (only line-absence, via #69). Hand-probe unconditional-emit (drop the `disposed &&` guard):
  **RSN part-2 reddens** and the full suite catches it (722: 2 fail) — proving Charpy's F2 clause is
  non-vacuous, yet no registered mutant tests it. Plan §9 promised registering a "mistag the reason" RSN
  mutant; it never landed.
- **HR defence is coarse (executed).** #13 (the re-anchored `begin() stops hard-resetting` mutant now guts
  the whole recovery block) reddens 8 of 9 cells including HR — so the fault-class "orphan not disposed" is
  caught, but no mutant isolates HR's promised specific fault (`resetSwipeStyles(true)` unconditionally on
  the orphan branch, plan §8/§9). HR is swept and caught, not bare, but the discriminating mutant §9
  promised is absent.

---

## 3. Findings (Phase 4/5) — by severity

### B1 — Structural (bare cell). NOOP.mechanism `sweeps===0` has no registered mutation defence.

- **Promised behaviour.** The slice's entire structural value (EC §4.3, "do not operate through whatever is
  global"; plan §3 "not-a-no-op"): on the owned recovery branch the DOM-global `.nav-ghost` sweep runs at
  neither `js/app.js:441` nor the `applyScreen`-internal `:442`→`nav.js:120`, so the owned-pane removal is
  owner-driven via `disposeOwnedPanes`. If a future edit drops `keepGhosts:true` at either site, the sweep
  removes the pane again and `disposeOwnedPanes` becomes a behavioural no-op — while every DOM-outcome cell
  stays green (Loki proved the sweep and the disposer remove the identical node).
- **Why no registered test catches its break.** `NOOP.mechanism` catches it in the *running* suite (proven:
  a single-site drop reddens `sweeps===0`), but the **mutation registry** — the gate that proves each
  assertion stays non-vacuous over time (EC §4.10, "mutation evidence must remain runnable in repository
  tooling") — contains no mutant that drops `keepGhosts` at either site while keeping `disposeOwnedPanes`.
  #69's redness of NOOP.mechanism is on a different assertion (`ghosts===0`), so it would stay red even if
  `sweeps===0` were silently weakened to inertness. The one assertion the whole slice exists to protect is
  the one assertion with no runnable defender.
- **Occupant (the missing tests).** TWO registered mutants in `tools/mutate.mjs`, each reddening
  `NOOP.mechanism` (`sweeps===0`) and nothing else, anchored in `test/mutation-anchors.test.js` and swept by
  `tools/mutation-sweep.mjs`:
  - **M-a (site :441):** `resetSwipeStyles(cur ? true : undefined)` → `resetSwipeStyles(cur ? undefined : undefined)`
    (or drop the arg) — the explicit owned-branch suppression removed; sweep runs once → `sweeps===1`.
  - **M-b (site :442):** remove `keepGhosts: cur ? true : undefined` from the `applyScreen(currentDesc(), …)`
    opts — the `applyScreen`-internal `resetSwipeStyles(opts.keepGhosts)` runs the sweep → `sweeps===1`.
  Each is a §4.10 misattribution-class mutation (the sweep still fires at one site → the disposal is a no-op
  there). Both proven fail-able by execution (§2).

### B2 — Gap (bare cell). RSN reason correctness (token + Charpy-F2 emit-guard) has no registered mutant.

- **Promised behaviour.** Plan §3 item 5 / §8 RSN: an owned-pane disposal records reason `'superseded'`; and
  Charpy F2 / plan §8: a pane-LESS supersession disposes nothing so must emit NO reason (the trace fires
  only when a pane is actually disposed).
- **Why no registered test catches its break.** #69 proves only that the line must APPEAR (it removes
  nothing → no line). The TOKEN value (`'superseded'`) and the EMIT-GUARD (`disposed &&`) are distinct code
  elements with distinct faults — a mistag keeps the line but wrong token; a dropped guard emits on every
  no-op call — and no registered mutant exercises either. Both are hand-proven fail-able (§2), so
  `RSN` is genuinely non-vacuous, but its mutation evidence is not runnable in tooling (EC §4.10). Plan §9
  explicitly committed to registering a "mistag the reason" mutant; it never landed.
- **Occupant (the missing tests).** ONE or two registered mutants in `tools/mutate.mjs` targeting
  `disposeOwnedPanes` (js/app.js:363), each reddening `RSN`:
  - **mistag:** `` `pane disposed reason=${reason} …` `` → a fixed wrong token (or `reason` → `'hard-reset'`
    at the call site) — reddens RSN part-1's `/superseded/i`.
  - **emit-guard drop:** `if (disposed && window.PBDebug)` → `if (window.PBDebug)` — emits on the pane-less
    no-op → reddens RSN part-2 (Charpy F2). This is the higher-value of the two (it defends the prediction
    Poirot credited to RSN(2)).

### N1 — Note. HR's promised orphan-specific mutant is absent; the cell is caught only coarsely.

- HR is swept and caught, but only by #13 (which guts the entire recovery block and reddens 8/9 cells — a
  poor discriminator). Plan §8/§9's promised HR-specific mutant — `resetSwipeStyles(true)` **unconditionally**
  (owned branch fine, orphan branch strands) — is not registered. Registering it (owned-branch stays
  correct; force keepGhosts on the `cur`-null branch → orphan survives → HR reddens *alone*) would make HR's
  defence discriminating rather than coincidental. Not a bare cell (the fault-class is caught); a
  registry-quality improvement.

### Correctly handled (not findings), recorded so they are not re-opened

- **BR tested invariant — green + non-vacuous.** `BR` pins "borrowed-real never removed" (Loki residual-2
  tested half); #70 reddens it specifically. EC §4.4 / plan §3.2 realised as a structural `own`-filter
  guarantee. ✓
- **The deeper Loki-residual-2 invariant is correctly OWED, not claimed covered.** "Every connected
  `.nav-ghost` under a live session is an owned-pane mover" is UNGUARDED but **unconstructible at HEAD**
  (the one mid-build callback `Browse.render` is `async`, so a sync-section throw cannot strand a live
  session with empty movers + a mounted ghost). A test that cannot force its failure is worse than none;
  Curie (`RED-swipe-stage6e.md` §5) and Poirot ([W9]) both flag it owed to a future guard + Curie red test
  once a synchronous path into that window makes the failure constructible. Leaving it owed is correct; it
  is NOT a bare cell.
- **RGsup reconciliation by reference is legitimate.** The 6c pane-less recovery, the 6d render decision,
  and the 6c settle guards are unchanged by this byte-parity extraction; their pins + mutants (#43/#44/#19/
  #68) live in the 6c/6d suites (one owner per cell). No duplication owed.

---

## 4. W12 disposition (Poirot's hand-off item)

**Does the coverage NEED registered mutants for "drop keepGhosts at :441" and "drop keepGhosts at :442"?
YES.** The `NOOP.mechanism` `sweeps===0` assertion is the slice's non-vacuity guard — the whole value of the
slice (EC §4.3, plan §4.3 not-a-no-op) rests on it, and a single-site `keepGhosts` drop turns
`disposeOwnedPanes` into a behavioural no-op that every DOM-outcome cell passes. Poirot proved the assertion
reddens by hand at each site; this audit re-proved it (§2). But a one-time hand check is vigilance: it does
not survive into CI, and EC §4.10 (a gated core rule) requires the mutation evidence to "remain runnable in
repository tooling." Without registered mutants M-a/M-b, a future refactor that silently weakens or removes
the `sweeps===0` assertion — the single most load-bearing assertion in the slice — would be caught by
nothing. This is a bare cell in the Mutation-cases dimension. Route to Curie (test-design/coverage owner) to
specify M-a/M-b (and the RSN B2 mutants), for registration in `tools/mutate.mjs` via the same
Curie-specifies → Brunel-registers pattern plan §9 already used for #69/#70/#71.

---

## 5. Forward read (Phase 6)

Where the next silently-inert guard lands if these stay bare: not in a shipped-behaviour bug (the running
suite catches all three faults today), but in the **durability layer** — the day a later F-unification slice
edits the reveal/recovery region and, in passing, weakens or reorders `NOOP.mechanism` (or the RSN emit
guard) into inertness, the mutation sweep will stay green because it never exercised those assertions, and
the anti-no-op protection the slice was built to establish will be gone with no red flag. The bare cell is
in exactly the assertion whose whole job is to prevent a no-op — a no-op in the no-op detector.

---

## Handoff packet

- **Source artifact:** `Claude/Mendeleev/AUDIT-swipe-stage6e.md` (this file).
- **Verdict:** BARE_CELLS — behavioural suite adequate and non-vacuous; Mutation-cases dimension bare for
  three load-bearing assertions.
- **Bare cells filed:** B1 (NOOP.mechanism `sweeps===0`, ×2 sites — primary, the slice's non-vacuity guard);
  B2 (RSN token + Charpy-F2 emit-guard). Note N1 (HR coarse defence).
- **Owner:** Curie (specify the mutants) → Brunel (register in `tools/mutate.mjs`; anchor in
  `test/mutation-anchors.test.js`; sweep in `tools/mutation-sweep.mjs`), per plan §9 pattern. HEAD 1ebbf5d
  is frozen/SHIP'd; the mutants land in a follow-up registration commit.
- **Required evidence before close:** each new mutant reddens only its named cell and `mutation-sweep`
  reports it `caught`.
- **Not a finding / correctly owed:** the deeper Loki-residual-2 invariant (unconstructible at HEAD; owed to
  a future guard — Curie §5 / Poirot [W9]); BR tested invariant green; RGsup by-reference.

`Verdict: **BARE_CELLS**`
