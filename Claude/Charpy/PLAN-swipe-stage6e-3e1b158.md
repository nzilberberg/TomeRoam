# Charpy temper — PLAN-swipe-stage6e (disposeOwnedPanes, F emergency-disposal half)

Type: plan-review

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":true,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":["js/app.js:415-418","js/app.js:598-598"],"callee_ranges":["js/nav.js:102-108"]} -->

Target: `Claude/Plans/PLAN-swipe-stage6e.md` frozen at git HEAD **3e1b158** (immutable review target;
no edits made to it). Reviewed against current production HEAD 3e1b158 (build `2026-07-27.253`).

Verdict: **FORGE**

## Verdict

**FORGE** — sound; build it. Every load-bearing assumption was struck against the real code at HEAD
3e1b158 and held: the dependency ordering (F is the next foundation; C depends on F), the clean F(dispose)
/F(release) cut (a real live consumer exists today), the byte-for-byte owned-pane parity promise, the I17
emergency-disposal safety, and the non-vacuity of all seven coverage cells. Three advisory NOTES are
recorded below; none blocks the build, and none needs resolving before Curie authors the red suite.

## Applicability

Machine-readable declaration above; project adapter `tomeroam-js-dom`. Reason for each pattern:
- **defining_records: true** — six defining records govern this slice (parent `PLAN-swipe-reveal.md`
  §3.2/§3.4/§3.6; EC §4.3/§4.4/§4.15/§4.16/§4.18; the subsystem §7/§8/§14; the 6d dependency analysis
  §1a; `js/nav.js resetSwipeStyles`; `test/swipe-model.test.js` fingerprint). Reconciled below.
- **boundary_relocation: false** — no data value's ownership crosses a NEW producer→consumer seam. The
  owned-pane movers are already session-owned (`d.movers`, stage 3); this slice relocates a removal EFFECT
  from an ambient DOM-global sweep to an owner-driven call. No `d.<field>` value is transferred. Agrees
  with the plan's own declaration. No ledger owed.
- **callee_replacement: true** — the `resetSwipeStyles()` call at the recovery site (app.js:416) is a
  broad multi-effect callee (`js/nav.js:102-108`) whose owned-pane-removal effect is replaced by the typed
  `disposeOwnedPanes(cur,'superseded')`; its other two effects stay. The callee body (`js/nav.js:102-108`,
  tokens `.nav-ghost` line 103 / `.np-pill-float` line 104 / the borrowed-real inline-style restore
  105-107) is the declared callee range; the full observable surface is traced under F-callee below.
- **contract_shape: false** — `disposeOwnedPanes` is a void session-cleanup helper (the EC §4.3
  `disposeOwnedNodes(session)` form), not an exact-key contract-object return. No contract-function-gate
  obligation.

## Defining records

**AGREE.** No two defining records disagree on the required behaviour of this slice.

- **Parent `PLAN-swipe-reveal.md` §3.4** (verified lines 373-402): two operations — `pane.release()`
  (reveal-only, obeys I10, paint-gated) vs `pane.dispose(reason)` (idempotent emergency teardown, bypasses
  I10, permitted reasons include `'superseded'`). The CONCURRENCY POLICY states I17 exactly: "begin()
  REJECTS whenever an active session is SETTLING, FINALIZING or REVEALING. It NEVER disposes a resource
  owned by that session — the active reveal is left to satisfy I10." The plan realizes the `dispose(reason)`
  half only, `reason:'superseded'`, and defers `release()`. AGREE.
- **Parent §3.6** (verified lines 421-424): the pane object `{ kind, element, source, pin, equivalence,
  release(), dispose(reason) }`. The plan defers `kind/source/pin/equivalence/release()` as dead-now
  members (EC §4.15) and lands only the owner-driven disposal over the existing `{ el, base, own }` movers.
  AGREE.
- **6d dependency analysis §1a** (verified): ratifies **D→F→C**, **F→C** ("`pane.release()` is the
  mechanism I10 is expressed in"), **F→B**, **C→B(reveal)**. 6e re-derives the same graph with D's
  foundation now shipped, making F the correct next root. AGREE — the re-derivation is faithful, not a
  fresh unratified claim.
- **EC §4.3/§4.4/§4.18** (verified against the file): explicit-owner cleanup receiving the owner; borrowed
  reals never deleted by a broad verb; a successor may not dispose a pane owned by a valid active operation
  unless supersession is defined at that phase. The plan satisfies all three (below). AGREE.
- **Subsystem §7/§8/§14** (verified lines 32-36, 91-93): owned panes are session-owned; §14 names orphan
  disposal at begin() and the I17 prohibition on disposing an active SETTLING/FINALIZING/REVEALING pane.
  The plan realizes §14 for the owned-supersession case and leaves I17(a) gated. AGREE.
- **`js/nav.js resetSwipeStyles` (102-108)** and **`test/swipe-model.test.js` fingerprint (44)** — code
  under change / pins; reconciled in the plan's §9. AGREE.

No CONFLICT. The one wording divergence a reviewer might reach for — parent §3.4 says "begin() REJECTS
whenever SETTLING/FINALIZING/REVEALING," while 6c narrowed this so a pane-LESS settling session IS
supersedable — is NOT a live conflict: §3.4's concurrency concern is protecting an *owned* pane, and a
pane-less session has none. 6c ratified the narrowing; 6e correctly scopes I17(a) to the pane-owning case.
(The parent §3.4 also cites the finishing guard at "app.js:452" — stale post-6c/6d; the 6e plan under
review correctly cites the current line 368. That stale citation lives in the parent record, not in the
artifact under review, and is a §9-scrub item for the parent, not a 6e finding.)

## The strikes (what I notched, and what it did)

### S1 — The dependency claim: is F(dispose) genuinely the correct minimal next slice, and does C really depend on F? — HELD

Struck against 6d §1a and parent §3.4. The claim "C depends on F" is not a rationalization: the ratified
design *expresses* I10 AS `pane.release()` (§3.4 line 377-378) and I17 emergency teardown AS
`pane.dispose(reason)` (line 379). C (the I10/I17 reveal centralization) cannot be centralized into a pane
method that does not yet exist, and centralizing on raw movers would hand-code the removal policy the pane
interface re-abstracts (EC §4.16, the same D→F argument one level down). With D's foundation shipped in 6d,
F is the in-degree-0 root. **The cut F(dispose)=6e / F(release)=C is clean, not a stranded half-interface**
(the EC §4.15 dead-field risk): I verified `disposeOwnedPanes` has a REAL live consumer at HEAD — the
recovery site at app.js:415-418, when `cur=d` is a DRAGGING pane-owning browse→browse session, disposes an
owned `.nav-ghost` today via `resetSwipeStyles()`'s sweep. F(dispose) ships with its one live consumer;
`release()` has no consumer until C and is correctly deferred. Held.

### S2 — The load-bearing promise: owner-driven disposal removes EXACTLY the owned panes the `.nav-ghost` sweep removed, byte-for-byte, and never a borrowed-real — HELD

This is the fracture point I struck hardest. Verified against the real code:

- **`.nav-ghost` is always an owned synthetic node.** `ghostWrap()` (swipe.js:237, `wrap.className =
  'nav-ghost'`) is the ONLY producer of the class, and it always mints a fresh div. Both owned-pane wraps —
  `ghostApp` (swipe.js:254) and `snapshotHome` (swipe.js:271) — route through it. No borrowed-real element
  (#home/#browse/overlay) is ever tagged `.nav-ghost`; the decoration clone carries `.np-pill-float`
  (swipe.js:284), NOT `.nav-ghost`. So the promise's "never a borrowed-real" leg is STRUCTURAL, by
  construction of the `own` filter — held with no enumerated exclusion needed (cell BR).
- **Set equality (byte-for-byte).** `disposeOwnedPanes` removes `session.movers` where `own==='owned-pane'
  && el.parentNode` — identical predicate and attachment guard to the existing `dropPanes` (app.js:598).
  Every owned-pane element is `.nav-ghost` (above), so `disposeOwnedPanes ⊆ {.nav-ghost in DOM}`. Equality
  in the other direction requires no stray `.nav-ghost` outside `cur.movers` — see the named fracture.
- **The named Loki fracture (a stray `.nav-ghost` neither in `cur.movers` nor an orphan, that
  `keepGhosts:true` would strand) is NOT constructible.** The plan rests parity on I2 + the `.spent` clear;
  my independent strike confirms it and supplies the third leg the plan leaves implicit: `begin()`'s
  recovery predicate (app.js:383) fires on ANY `.nav-ghost` and disposes it BEFORE arming, so a live owned
  `cur=d` only ever coexists with its OWN panes — a prior session's ghost cannot survive into a new drag's
  lifetime. `.spent` fading panes (a completed prior gesture mid-`.203` cross-fade) are the one class that
  legitimately coexists, and they are cleared at app.js:376 (UNCHANGED by this slice) before the recovery
  block. A held-reveal ghost from a prior session cannot coexist either (see S3). I hunted for other
  strandable node classes and found none: the only DOM effects at the site are `.nav-ghost` (owned panes),
  `.np-pill-float` (decoration, still removed by the unguarded nav.js:104), and borrowed-real inline styles
  (still restored by nav.js:105-107). Held.

### S3 — I17 safety: does disposeOwnedPanes at the recovery site risk disposing a pane owned by an active SETTLING/FINALIZING/REVEALING session? — HELD

Struck against the real `finishing` lifecycle. `finishing` is set true at settle (app.js:572) and is kept
true through FINALIZING and the held REVEALING phase — cleared only at no-pane `runFinalize` (app.js:1190),
at `drop()` when the held pane is released (app.js:830), on a finalize throw (app.js:1226), and at the
recovery itself (app.js:420). Critically, `runFinalize` RETURNS EARLY on the two ghost-held reveal exits
(comment app.js:1192-1196), so line 1190 does NOT run for a held reveal; the held path keeps `finishing`
true until `drop()` (confirmed by the comment at app.js:1219-1222). Therefore a pane-owning
SETTLING/FINALIZING/REVEALING session has `finishing===true` and is rejected by the 368 gate
(`if (finishing && !(session && paneLess(session))) return;`) before the recovery block is ever reached.
The recovery block disposes an owned pane ONLY for: (a) a DRAGGING `cur=d` (`finishing===false`) — the one
intended live consumer; (b) never a pane-less `cur` (the filter no-ops); (c) the orphan branch (`cur` null,
full sweep). A held-reveal pane is unreachable by disposal. The keepGhosts:true-on-owned / full-sweep-on-
orphan split is correct at every phase. I17(a) stays gated; I17(b) stays the full sweep. Held.

### S4 — Coverage non-vacuity: do all seven cells bind to a real observable channel? — HELD, one honest caveat

- **DP / BR / HR / DEC** drive the real `begin()`→supersession path through the harness (`h.touch`, two
  touches) and assert on the real DOM (`.nav-ghost`, `#browse`/`#home`, `.np-pill-float` presence). Each
  names a broadening/misattribution mutation that reddens it (skip the `own` filter; broaden to remove every
  mover; `resetSwipeStyles(true)` unconditionally; guard `.np-pill-float` behind keepGhosts). Genuine
  observable channels; non-vacuous. The BR structural guarantee (the `own` filter cannot mint a borrowed-
  real removal) is real regardless of which transition supplies the borrowed mover.
- **RGreveal** pins the flash surface untouched by running the EXISTING held-reveal green suite; any change
  to the reveal hold/drop timing reddens it. It is a real regression pin, not a vacuous cell — it is the
  live guard that this slice's callee_replacement does not leak into `holdGhostUntilPaintable`/`drop`/
  `fadePanes`. RGsup likewise pins the shipped 6c/6d behaviour.
- **RSN** (the PBDebug-trace cell) is the one genuine-but-weak channel, and the plan is HONEST about it: it
  is labelled "diagnostic (labelled — PBDebug trace, NOT a behavioural claim)" and kept out of the
  behavioural set (EC §4.10 separation). It is a real observable (a mutation that mistags the reason reddens
  the trace assertion), but it is a diagnostic, not a behavioural proof — correctly represented. See N2.

No cell is vacuous or unobservable. Held.

### S5 — source_ranges / fingerprint honesty against current HEAD — HELD

Verified every declared machine range against HEAD 3e1b158 (the 6d ranges had gone stale post-build; these
have not): `js/app.js:415-418` is exactly `const cur = d || session;` / `resetSwipeStyles();` /
`applyScreen(..., { render: cur ? (cur.live && cur.finPlan.abortRender === 'rerender') : false, ... })` /
`if (cur) window.scrollTo(0, cur.scroll0);` — the recovery block the change lands in. `js/app.js:598` is
`const dropPanes = () => { for (const m of cur.movers) if (m.own === 'owned-pane' && m.el.parentNode)
m.el.remove(); };` — the sibling remover pinned as parity. The insertion locus for the new helper (prose
"~328-351, near releaseGesture/dropRowHold") is accurate: `releaseGesture` is at app.js:330, `dropRowHold`
at 345-349. The callee body `js/nav.js:102-108` matches the traced three-effect surface. Session fields the
adapter tracks are present and correctly named in this review: `d.movers`/`session.movers`, `m.own`,
`m.el`, `cur.live`, `cur.finPlan`, `cur.scroll0`. Held.

## F-callee — replaced-callee behavioural surface (callee_replacement, D9)

The replaced callee `resetSwipeStyles(keepGhosts)` (`js/nav.js:102-108`) has three observable effects at
the recovery call site; the slice splits ownership of one and leaves two in place. Full surface, each with
its post-slice owner:

- **`.nav-ghost` owned-pane removal** (nav.js:103, `keepGhosts`-guarded) → MOVES to
  `disposeOwnedPanes(session)` for the owned branch; `resetSwipeStyles(true)` skips it. For the orphan
  branch (`cur` null) it STAYS as the full sweep. `@effect js/nav.js:103`.
- **`.np-pill-float` decoration removal** (nav.js:104, UNGUARDED) → STAYS in `resetSwipeStyles`; runs under
  both `keepGhosts:true` and the orphan full sweep, so the decoration is never stranded (cell DEC).
  `@effect js/nav.js:104`.
- **Borrowed-real inline-style restore** (nav.js:105-107, transform/transition/willChange/zIndex on
  home/browse/options/nowplaying/SUBS/np-actions) → STAYS in `resetSwipeStyles`, unguarded, byte-identical
  (cell BR-restore). `@effect js/nav.js:105`.

No effect is assigned two owners; the borrowed-real restore is never routed to the disposer. The
behavioural invariant is set-equality at the owned-pane boundary plus preservation of the other two
effects — not signature compatibility — and it holds (S2/S3). `js/nav.js resetSwipeStyles` itself is
UNCHANGED; only the recovery call's `keepGhosts` argument changes.

## Findings

### F1 — disposeOwnedPanes duplicates the dropPanes owned-pane removal logic (Note, recommendation)

Severity: **Note**. Nature: **recommendation**.

`disposeOwnedPanes(session)` and the existing `dropPanes` closure (app.js:598) implement byte-identical
owned-pane removal (`own==='owned-pane' && el.parentNode → remove`). This is not an EC §4.16 two-source-of-
truth *data* hazard — they act at different sites (begin-recovery vs finalize) and different phases, with no
shared mutable state that can diverge at one site — so it does not block. But it is a future-divergence risk
of the kind F/C exist to collapse: a later change to the owned-pane predicate (e.g. a new owned kind) must
touch BOTH or silently diverge. The plan lists `dropPanes` as removal path (a) and leaves it untouched, but
does not explicitly acknowledge that `disposeOwnedPanes` re-implements it or commit both to the F
unification. Recommendation (not a requirement): note in the §9 records / Brunel handoff that
`disposeOwnedPanes` and `dropPanes` share one removal semantics pending the F pane-object folding, so the
duplication is tracked rather than rediscovered.

### F2 — the `reason` parameter is the slice's thinnest field; its consumer is a diagnostic this slice adds (Note, recommendation)

Severity: **Note**. Nature: **recommendation**.

`reason` carries a single value (`'superseded'`) and its only consumer is the PBDebug trace (cell RSN). It
satisfies EC §4.15's letter (a real consumer + a test that reddens on mistag), and the plan honestly labels
it a diagnostic recommendation rather than a behavioural field. Two precisions for Brunel, neither blocking:
(1) the EXISTING recovery trace at app.js:384-385 fires at line 384, BEFORE `cur` is computed at 415, so it
cannot be the literal consumer — the reason's trace line is one this slice ADDS/augments after the disposal,
which places `reason` in D10's "consumer introduced by the same slice" category, verified at build by the
mutation (mistag reddens RSN), not pre-FORGE. The plan's phrase "feeds `reason` to the existing PBDebug
recovery diagnostic" is slightly loose on this point. (2) With one enum value, keep the disposer signature
honest — the field earns its place as the `dispose(reason)` seam and its diagnostic, not as behaviour;
Curie's RSN oracle should assert the reason token on the trace channel only, not couple it to a behavioural
assertion.

### F3 — state the third leg of the no-stray argument in the promise packet handed to Loki (Note, recommendation)

Severity: **Note**. Nature: **recommendation**.

The plan's §3-item-3 parity basis is cited as "I2 + the `.spent` clear." That is correct but incomplete as a
*constructive* argument: the reason a non-`.spent` stray cannot coexist with a live owned `cur` is that
`begin()`'s recovery predicate (app.js:383) disposes every `.nav-ghost` before arming, so a fresh drag never
inherits a prior session's live ghost (S2). Loki receives the promise and the fracture regardless and will
either construct the counterexample or file the held stone; my independent read says it is not constructible.
Recommendation: include the begin()-clears-before-arm leg explicitly in the Loki commission packet so the
strike targets the real seam rather than re-deriving it.

## Coverage

No blocking (Fatal/Structural) finding was raised, so there is no blocking-finding→verification mapping to
carry. The three NOTES (F1/F2/F3) are advisory and route to the maker/records, not to a build gate. The
plan's own coverage obligation — every blocking question DP/HR/BR/RSN mapped to a mutation-backed row — is
satisfied in its §8, and I verified each row binds to a real channel (S4).

## Prediction (where it breaks in execution, if at all)

The build is low-risk. The one place Brunel can slip is the RSN wiring (F2): if the reason trace is emitted
from inside `disposeOwnedPanes` but the helper is called for a pane-less/no-op supersession, the trace could
fire `'superseded'` with zero panes actually removed — a diagnostic that overstates. Emit the reason trace
only when a pane is actually disposed, or assert RSN against the DP fixture (a real pane-owning supersession)
as the plan already specifies. The second watch item is the fingerprint/model-mirror regeneration (§9): the
recovery region is fingerprinted (swipe-model.test.js:44) and the dispose-reason mirror (214/253-254) must
gain `'superseded'` in the SAME commit, or the source-text gate reddens — the plan flags this correctly, so
it is a discipline reminder, not a plan flaw. Nothing in the sequence gates an earlier step; F(dispose) rests
only on shipped stages 3/5/6a/6c/6d and is consumed by nothing here.

---

{"persona":"charpy","stage":"6e","verdict":"FORGE","target":"3e1b158","artifact":"Claude/Charpy/PLAN-swipe-stage6e-3e1b158.md","blocking_changes":[],"return_to":"vitruvius"}
