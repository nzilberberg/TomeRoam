# Build log — Stage 6g: keep `#home` a stable compositing layer through the reveal

Type: build log

Target plan: `Claude/Plans/PLAN-swipe-stage6g.md` (Charpy FORGE `Claude/Charpy/PLAN-swipe-stage6g-97cc5aa.md`;
Curie RED `Claude/Curie/RED-swipe-stage6g.md`; Loki HELD_STONE `Claude/Loki/STRIKE-swipe-stage6g-r1.md`).
Built against production HEAD `65817fd` (the plan itself is unchanged since its ratification commit
`97cc5aa` — confirmed by `git diff 97cc5aa..HEAD -- Claude/Plans/PLAN-swipe-stage6g.md`, empty).

`Verdict: **BUILD_GREEN**`

---

## 1. Exact slice completed

The single production edit named by plan §2/§4: `css/app.css` (109-115), the live `.256` diagnostic probe
`#home { will-change: transform; }` replaced with the production rule `#home { transform: translateZ(0); }`
plus a production comment (permanent compositing layer; real transform over the droppable `will-change`
hint; device-confirmed navbar-safe). `#home.parked` (103-108) is unchanged. No other CSS rule was touched.

Co-changes per plan §9: the `js/app.js:552-554` comment scrub (records-truth only, no logic change, §2
below); the two new registered mutations (§5); `test/home-layer-invariant.test.js` wired into
`SOURCE_TEXT_GATES` (§6); `docs/swipe-model.generated.txt` regenerated (§3, a side effect of the comment's
line-count change, not a scope item).

## 2. app.js-logic-untouched confirmation

**`app_js_logic_touched: false`.** The only edit to `js/app.js` is the comment at 552-558 (previously
552-554) documenting the `#home` promotion exception; the executable line directly below it —
`for (const m of d.movers) if (m.base) m.el.style.transform = 'translateX(' + m.base + 'px)';` — is
byte-identical before and after (`git diff js/app.js` shows only `-`/`+` comment lines). No other region of
`js/app.js` was edited. This matches the plan's explicit instruction (§2: "Stays exactly as today (do NOT
re-touch)" lists `js/app.js` `showAppView`, the mid-drag mover parking, and the reveal-hold path) and the
caller's constraint that a logic change would need a re-strike Loki did not do.

## 3. Files changed

| File | Change |
|---|---|
| `css/app.css` | 109-115: `.256` diagnostic probe replaced with the production rule `#home { transform: translateZ(0); }` + production comment. |
| `js/app.js` | 552-558: comment-only scrub recording the scoped `#home` promotion exception. No logic changed. |
| `tools/mutate.mjs` | Two new registered mutants, #79 (PROMO, `css/app.css`) and #80 (REVEAL, `js/nav.js`) — see §5. |
| `tools/mutation-sweep.mjs` | `SOURCE_TEXT_GATES` gains `home-layer-invariant.test.js`, with its FALSE-CAUGHT reason. |
| `docs/swipe-model.generated.txt` | Regenerated (`node tools/gen-swipe-model.mjs`). The app.js comment grew from 3 to 7 lines (+5 net), which shifted the dynamically-derived `navStackAppendCensus()` line numbers for three append sites (778→783, 779→784, 1346→1351); no other content changed, and the four SOURCE FINGERPRINTS (navTo/navRelation/gestureEnd/supersession) are byte-identical, confirming the comment sits outside every fingerprinted region. |

Not modified: `js/nav.js`, `js/swipe.js`, `docs/transition-matrix.generated.txt` (its generator carries no
`js/app.js` line references — the stage-4 mirror retirement removed that dependency), the two Curie-authored
test files (`test/home-layer-invariant.test.js`, `test/swipe-stage6g.test.js` — pristine, not edited), any
file outside this table.

**Not applied by this build (flagged for Zelda's housekeeping pass, per plan §9 and this build's explicit
scope of "the small + surgical build," which named items 1-5 and excluded these):** `Claude/Decisions/DecisionLog.md`
(NEW POLICY entry), `Claude/Subsystems/swipe-reveal.md` (policy note), `Claude/Plans/PLAN-swipe-reveal.md` §7
step 6 (annotation), `Claude/Campaigns/swipe-stage6g.json` (campaign manifest), and the build-number bump —
all named in plan §9's "records reconciliation" list but outside the 5 items this build was scoped to, and the
caller separately instructed not to bump the build number or commit. Nothing in this list required a code or
test change to close.

## 4. PROMO + REVEAL — both green post-build

`node --test test/home-layer-invariant.test.js test/swipe-stage6g.test.js` → **5/5 pass** (was 3/5 pre-build,
matching Curie's recorded RED run exactly — PROMO.base and PROMO.cascade were the two RED cells; both are now
GREEN, and PROMO.parked/PROMO.parse-sanity/REVEAL, already green at HEAD, are unaffected).

## 5. Mutation evidence (EC §4.10; Brunel Gate B, synchronous, no backgrounding)

**Mutation #79 — PROMO [SOURCE_TEXT], `css/app.css`.** `#home { transform: translateZ(0); }` →
`#home { transform: none; }`.
- Designated test green before: confirmed (§4).
- Applied: `node tools/mutate.mjs 79`.
- Designated test red on the intended assertion: `test/home-layer-invariant.test.js` → 2 pass, 2 fail.
  `PROMO.base` fails with `Found transform="none"`; `PROMO.cascade` fails with
  `un-parked (#home) resolves to transform="none" — not a layer-promoting non-none transform` — the exact
  cell the mutation targets, not an unrelated failure.
- Restored: `node tools/mutate.mjs --restore`; `git status` showed only the intended pre-existing edits to
  `css/app.css`/`js/app.js`/`tools/mutate.mjs`/`tools/mutation-sweep.mjs`, no stray diff, no `*.mutbak`.
- Designated test green again after restore: confirmed (re-ran §4's 5/5).

**Mutation #80 — REVEAL, `js/nav.js` `setView` (line 57).** `$('home').classList.toggle('parked', v !== 'home');`
→ `$('home').classList.toggle('parked', true);` — anchored at `setView`, not `app.js:482 showAppView`, per
Curie's pinpoint (`RED-swipe-stage6g.md` §3: a mutant at `app.js:482` reads UNCAUGHT because that removal is
redundant on the abort-reveal path).
- Designated test green before: confirmed (§4).
- Applied: `node tools/mutate.mjs 80`.
- Designated test red: `test/swipe-stage6g.test.js` → 0 pass, 1 fail. The reddening lands at the
  fixture-sanity assertion ("after landing on Home, #home is un-parked") rather than the final cell
  assertion — this is the exact behavior Curie recorded and explained when proving this mutation
  non-vacuous (`RED-swipe-stage6g.md` §3): the setup commit (Books→Home) and the abort reveal both un-park
  through the same `setView('home')` call, so breaking it reddens both. The mutation is CAUGHT.
- Restored: `node tools/mutate.mjs --restore`; `git status` clean of stray diffs, no `*.mutbak`.
- Designated test green again after restore: confirmed (re-ran §4's 5/5).

## 6. SOURCE_TEXT_GATES wiring confirmation

`tools/mutation-sweep.mjs`'s `SOURCE_TEXT_GATES` map now includes `'home-layer-invariant.test.js'`, with the
reason that it reads the TEXT of `css/app.css` — the same text mutation #79 targets — so counting it as
"caught" by the behavioural sweep would be a FALSE CAUGHT (the same failure mode already documented for
`mutation-anchors.test.js`/`swipe-model.test.js`/`transition-matrix.test.js`). `test/swipe-stage6g.test.js`
(REVEAL) was deliberately left OUT of `SOURCE_TEXT_GATES` — it is the behavioural test that must run in the
sweep to catch mutation #80. `source_text_gate_wired: true`.

## 7. Full suite, meta-gates, pre-commit battery

- `node tools/hooks/run-checks.mjs` (stamp, lint, typecheck, tests) → **all four steps PASS.**
- `node --test test/*.test.js` → **736 tests, 735 pass, 0 fail, 1 skipped** (the pre-existing skip; not in
  either new file — matches Curie's "no collateral" claim, now fully green rather than the recorded 2-red
  RED baseline).
- `test/mutation-anchors.test.js` — **2/2 pass** (both anchors, incl. the two new mutants #79/#80, still
  match the source; no mutation is a no-op).
- `test/construction-consumers.test.js` (dead-return-fields gate) — **2/2 pass.**
- `test/policy-ledger-gate.test.js` — **3/3 pass.** No PolicyLedger entry was added (plan §9: this is NEW
  POLICY asserted GREEN by the new source gate, not held red — nothing to reconcile).
- `test/contract-function-gate.test.js` — **4/4 pass.**
- `test/swipe-model.test.js` — **11/11 pass** (including the fingerprint-unchanged assertion — the four
  mirrored `js/app.js` regions are byte-identical to `VERIFIED`, confirming the comment edit sits outside
  every one of them).
- `test/transition-matrix.test.js` — **3/3 pass.**

All meta-gates named by the caller: **all-pass.**

## 8. What this build did NOT do

- No `js/app.js` logic changed (§2).
- No `js/nav.js`, `js/swipe.js` production code changed (the two mutation registrations touch those files
  only transiently, applied and restored per §5).
- The optional venustas cleanup (dropping the now-redundant `will-change: transform` from `#home.parked`,
  plan §10) was **not taken** — deferred, per the plan's own preference to keep the slice surgical and the
  device-verified surface minimal.
- The plan §9 records-reconciliation items outside this build's 5-item scope (DecisionLog, subsystem
  contract, `PLAN-swipe-reveal.md` §7 annotation, campaign manifest, build-number bump) were not applied —
  listed in §3 above, left for Zelda.
- No git commit, push, or build-number bump — the working tree is left staged, uncommitted, per the caller's
  explicit instruction.
- The device-verification obligation (plan §9: abort flash clean, no navbar pop, active-home text quality)
  is device-only and out of this build's reach; it stays on the standing shipped-unverified device pass.

---

Verdict: **BUILD_GREEN**
