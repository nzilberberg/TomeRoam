// STAGE 6g of PLAN-swipe-reveal.md (sub-plan Claude/Plans/PLAN-swipe-stage6g.md) — the
// RED source-text gate for cell PROMO. See Claude/Curie/RED-swipe-stage6g.md.
//
// WHAT 6g CHANGES. The home→books ABORT flash is the browser DEMOTING #home's compositing
// layer when `.parked` is removed at the reveal (device-confirmed, build .256 controlled
// A/B). The fix keeps #home a STABLE compositing layer THROUGH the reveal: an unconditional
// base rule `#home { transform: translateZ(0) }` replaces the live .256 diagnostic
// `#home { will-change: transform }`, so removing `.parked` on the un-park path never lands
// #home on `transform: none` — no demote frame, so iOS never re-rasterises the view.
//
// THIS CELL (plan §8 PROMO), labelled [SOURCE_TEXT] per EC §4.10. It asserts on the TEXT of
// css/app.css — the ONLY channel where the promotion is observable: jsdom has no layout and
// cannot compute a stylesheet `transform`, and the compositor demote/flash is off the main
// thread and invisible to any harness (saga: the rAF frame detector was invalid for exactly
// this reason). So this gate does NOT — and is NOT claimed to — observe runtime compositing
// or the flash. It pins the STRUCTURAL invariant: the static #home rule cascade never
// resolves #home's transform to `none`. That the eliminated demote WAS the home→books abort
// flash is established by the .256 device A/B and re-verified on device after this ships
// (plan §9), NOT by this suite.
//
// ⚠️ SOURCE-TEXT GATE — EXCLUDE from the behavioural mutation sweep. Because this reads
// production TEXT rather than behaviour, ANY mutation that touches css/app.css fails it BY
// CONSTRUCTION (the mutation changed the very text it pins) — counting that as "caught" is a
// FALSE CAUGHT. Brunel's §9 apply-on-approval obligation adds this file to SOURCE_TEXT_GATES
// in tools/mutation-sweep.mjs (alongside registering the PROMO css mutation). It is NOT in
// that list yet — flagged in RED-swipe-stage6g.md — but no css mutation exists at HEAD, so
// the exclusion is not yet load-bearing.
//
// RED @HEAD, for the RIGHT reason. At HEAD the base #home rule is the diagnostic
// `#home { will-change: transform; }` — it carries NO `transform` value, so PROMO.base and
// PROMO.cascade FAIL because the layer-promoting transform is ABSENT (not because the parser
// missed the rule — PROMO.parse-sanity stays GREEN, proving the rule was found). Brunel makes
// them green by swapping will-change → `transform: translateZ(0)`.
//
// SCOPE — the STATIC #home rule cascade only. This gate pins the un-park/REVEAL guarantee:
// the two static rules that apply to #home while it is un-parked (`#home`) or parked
// (`#home.parked`). It deliberately does NOT cover the transient animation-added classes
// (`.view.nav-in-left`/`.nav-in-right`), whose keyframes END at `transform: none` — those are
// a NON-reveal navigation animation, accounted-for-benign and out of this cell's scope
// (plan §3). Selecting rules by EXACT `#home` / `#home.parked` selector naturally excludes
// the `.view.nav-in-*` rules (whose selector is `.view.nav-in-right`, etc.).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./dom-fixture.js');

const CSS_PATH = path.join(ROOT, 'css', 'app.css');
const readCss = () => fs.readFileSync(CSS_PATH, 'utf8');

// ── a small, purpose-built CSS reader (not a full parser) ────────────────────────────
// Comments are stripped FIRST so a comment body (which mentions "#home" and "transform" in
// prose, css/app.css:110-113) can never be mistaken for a selector or a declaration.
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// Every TOP-LEVEL rule as { selector, body }. A brace-depth walk: at depth 0→1 the text since
// the last top-level `}` is the selector; the matching `}` closes the body. At-rules
// (@keyframes/@media) are captured as a single top-level rule whose nested blocks stay inside
// `body` and are never descended — so the `to { transform: none }` inside @keyframes navInRight
// is never seen as a #home declaration (its enclosing selector is `@keyframes navInRight`).
function topLevelRules(css) {
  const src = stripComments(css);
  const rules = [];
  let depth = 0, selStart = 0, bodyStart = -1, sel = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') { if (depth === 0) { sel = src.slice(selStart, i); bodyStart = i + 1; } depth++; }
    else if (ch === '}') { depth--; if (depth === 0) { rules.push({ selector: sel.trim().replace(/\s+/g, ' '), body: src.slice(bodyStart, i) }); selStart = i + 1; } }
  }
  return rules;
}

// True iff the rule's (possibly comma-grouped) selector list contains EXACTLY `exact`. Exact
// match is deliberate: `#home` must not match `#home.parked`, and `#home.parked` must not match
// `#home` — they are the two distinct cascade states this gate reasons about separately.
const selectorHas = (selectorText, exact) =>
  selectorText.split(',').map((s) => s.trim()).includes(exact);

// The LAST `transform:` value declared in a rule body (CSS last-declaration-wins), or null if
// the body declares none. `transform\s*:` requires a COLON, so the `transform` token in
// `will-change: transform;` (a value, followed by `;`) is correctly NOT matched.
function lastTransform(body) {
  const re = /(?:^|;|\s)transform\s*:\s*([^;]+)/gi;
  let m, val = null;
  while ((m = re.exec(body)) !== null) val = m[1].trim();
  return val;
}

// The EFFECTIVE transform for a selector across all its rules, in source order (later rules of
// equal specificity win). Returns { count, transform }.
function effectiveTransform(rules, exact) {
  const matching = rules.filter((r) => selectorHas(r.selector, exact));
  let transform = null;
  for (const r of matching) { const t = lastTransform(r.body); if (t !== null) transform = t; }
  return { count: matching.length, transform };
}

// LAYER-PROMOTING = a 3D transform function, which forces a persistent GPU compositing layer.
// A bare 2D `translate(...)`/`matrix(...)` is deliberately NOT accepted: it does not guarantee
// its own compositing layer, so it would not guarantee the reveal cannot demote #home — which
// is the entire point. Production ships `translateZ(0)` (plan §4, Decision 1).
const PROMOTING = /translateZ|translate3d|matrix3d/i;
const isNone = (v) => v != null && v.trim().toLowerCase() === 'none';

// ── PROMO.parse-sanity — the gate located both rules (so a RED PROMO.base is "no transform",
//    not "parser missed the rule"). GREEN @HEAD and after: both rules exist at HEAD. ────────
test('PROMO.parse-sanity — the source gate locates the base #home rule and the #home.parked rule', () => {
  const rules = topLevelRules(readCss());
  const base = effectiveTransform(rules, '#home');
  const parked = effectiveTransform(rules, '#home.parked');
  assert.ok(base.count >= 1,
    'css/app.css must contain a rule with the exact selector `#home` (the un-parked base state) — '
    + 'if this fails, a RED PROMO.base below is a PARSER miss, not an absent transform');
  assert.ok(parked.count >= 1,
    'css/app.css must contain a rule with the exact selector `#home.parked` (the parked state)');
});

// ── PROMO.base [SOURCE_TEXT] — the load-bearing RED-FIRST assertion. RED @HEAD: the base
//    #home rule carries only `will-change: transform`, no `transform` value. ────────────────
test('PROMO.base [SOURCE_TEXT] — the unconditional #home rule declares a persistent, layer-promoting, non-none transform', () => {
  const base = effectiveTransform(topLevelRules(readCss()), '#home');
  assert.ok(base.transform !== null && !isNone(base.transform) && PROMOTING.test(base.transform),
    'the base `#home` rule must declare a persistent, layer-promoting transform (translateZ / '
    + 'translate3d / matrix3d — a real 3D transform, NOT the droppable `will-change` hint and NOT a '
    + '2D translate) so that removing `.parked` at the reveal cannot demote #home\'s compositing layer '
    + `(plan §3/§4). Found transform=${JSON.stringify(base.transform)}. RED @HEAD: at HEAD the base rule `
    + 'is the .256 diagnostic `#home { will-change: transform; }` with no transform value.');
});

// ── PROMO.parked [SOURCE_TEXT] — the parked half of the cascade carries a real transform, so
//    the parked state is also never `none`. GREEN @HEAD (translateX(-101vw)); mutation-capable
//    (a parked `transform: none` reddens it). ───────────────────────────────────────────────
test('PROMO.parked [SOURCE_TEXT] — #home.parked declares a real, non-none transform (the parked cascade state is not `none`)', () => {
  const parked = effectiveTransform(topLevelRules(readCss()), '#home.parked');
  assert.ok(parked.transform !== null && !isNone(parked.transform),
    'the `#home.parked` rule must declare a real, non-none transform (it positions the parked layer '
    + 'off-screen with translateX and keeps it painted) — so the parked cascade state never resolves to '
    + `\`transform: none\`. Found transform=${JSON.stringify(parked.transform)}.`);
});

// ── PROMO.cascade [SOURCE_TEXT] — the combined load-bearing invariant (plan §3, §6): across the
//    STATIC #home rule cascade { #home, #home.parked } no state resolves to `transform: none`.
//    RED @HEAD (base is absent → the un-parked state has no promoting transform). ────────────
test('PROMO.cascade [SOURCE_TEXT] — no static #home cascade state resolves to transform:none (the un-park reveal guarantee)', () => {
  const rules = topLevelRules(readCss());
  const base = effectiveTransform(rules, '#home');
  const parked = effectiveTransform(rules, '#home.parked');
  const offenders = [];
  // Un-parked state: the base `#home` rule alone applies. It MUST be a layer-promoting non-none
  // transform (absent or `none` would be a demote frame at the reveal).
  if (!(base.transform !== null && !isNone(base.transform) && PROMOTING.test(base.transform))) {
    offenders.push(`un-parked (#home) resolves to transform=${JSON.stringify(base.transform)} — not a layer-promoting non-none transform`);
  }
  // Parked state: `#home.parked` (more specific) wins. It MUST be a real non-none transform.
  if (!(parked.transform !== null && !isNone(parked.transform))) {
    offenders.push(`parked (#home.parked) resolves to transform=${JSON.stringify(parked.transform)} — not a real non-none transform`);
  }
  assert.deepEqual(offenders, [],
    'no state of the static #home rule cascade may land #home on `transform: none` — that is the demote '
    + 'frame the reveal fix forbids (plan §3). Offending state(s):\n  ' + offenders.join('\n  '));
});
