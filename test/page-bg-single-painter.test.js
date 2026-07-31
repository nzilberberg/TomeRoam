// PAGE-BG-SINGLE-PAINTER -- --page-bg is painted by body::before plus exactly the
// additive overlays; the filmstrip peers stay transparent.
//
// THE MODEL (nav.js's setView(), the source of truth for this split): #home and
// #browse are filmstrip PEERS -- when one shows, the other is parked off-screen,
// never stacked underneath, so neither needs its own background to occlude the
// other. NP, #options, and the settings sub-screens (#downloads, #general,
// #playback, #buffering, #diagnostics) are ADDITIVE OVERLAYS: they paint over
// whatever tall screen is showing and the page underneath is NOT touched -- that
// page is live, not parked, so an overlay left transparent would show it through.
//
// TWO DEFECTS THIS GUARDS, IN OPPOSITE DIRECTIONS:
//  - A filmstrip peer (#home/#browse) regains its own `background: var(--page-bg)`:
//    the gradient is sized/centred to that panel's own box, so it renders at a
//    different scale/origin than body::before's copy and moves WITH the panel
//    during a swipe (the original, user-diagnosed defect).
//  - An additive overlay LOSES its `background: var(--page-bg)`: the live page
//    underneath shows through the overlay instead of being covered (the
//    regression this file's prior version encoded as "no panel may have a
//    background," which was wrong for the three overlays).
const { test } = require('node:test');
const assert = require('node:assert');
const { readRoot, selectorsFor } = require('./dom-fixture.js');

const TRANSPARENT_SELECTORS = ['#home', '#browse'];
const OPAQUE_SELECTORS = [
  '#options', '.nowplaying',
  '#downloads, #general, #playback, #buffering, #diagnostics',
];

// Comments stripped first so a comment mentioning `background` cannot be misread as a
// declaration (mirrors the convention in test/home-park-recipe.test.js).
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/** The declaration body {..} of the rule whose exact (whitespace-normalized) selector
 * list matches `selector`, or null if no such rule exists. */
function ruleBody(css, selector) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1].trim().replace(/\s+/g, ' ') === selector) return m[2];
  }
  return null;
}

test('PAGE-BG-SINGLE-PAINTER -- exactly body::before + the additive overlays paint --page-bg', () => {
  const css = readRoot('css/app.css');
  const painters = selectorsFor(css, 'background: var(--page-bg)').slice().sort();
  const expected = ['body::before', ...OPAQUE_SELECTORS].slice().sort();
  assert.deepEqual(painters, expected,
    'exactly body::before (the fixed, never-moving base keeper) and the additive '
    + `overlays may paint --page-bg -- expected: ${JSON.stringify(expected)}, `
    + `found: ${JSON.stringify(painters)}`);
});

test('PAGE-BG-SINGLE-PAINTER -- the filmstrip peers #home and #browse declare no background', () => {
  const css = stripComments(readRoot('css/app.css'));
  for (const sel of TRANSPARENT_SELECTORS) {
    const body = ruleBody(css, sel);
    assert.ok(body != null, `fixture: a \`${sel}\` rule must exist in css/app.css`);
    assert.doesNotMatch(body, /(?:^|;)\s*background(-color)?\s*:/,
      `\`${sel}\` is a filmstrip peer (nav.js parks the other one off-screen) and must `
      + 'declare no background property at all, so body::before\'s fixed copy shows '
      + `through undisturbed. Rule body: ${body}`);
  }
});

test('PAGE-BG-SINGLE-PAINTER -- each additive overlay declares its own --page-bg background', () => {
  const css = stripComments(readRoot('css/app.css'));
  for (const sel of OPAQUE_SELECTORS) {
    const body = ruleBody(css, sel);
    assert.ok(body != null, `fixture: a \`${sel}\` rule must exist in css/app.css`);
    assert.match(body, /(?:^|;)\s*background\s*:\s*var\(--page-bg\)\s*;/,
      `\`${sel}\` is an additive overlay (nav.js's setView(): paints over a live, `
      + 'un-parked page underneath) and must declare `background: var(--page-bg)` so '
      + `the page beneath does not show through. Rule body: ${body}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⛔ THE THREE TESTS ABOVE ARE SUPERSEDED BY THE ONE BELOW, AND ARE DELETED BY STAGE A1.
//
// NOSETTINGSBG — PLAN-one-screen-type.md §14 / §16.1. Authored red-first by the test author
// (2026-07-30) BEFORE the Stage-A1 build; companion note Claude/Curie/RED-one-screen-type.md.
// It lands HERE, extended in place, rather than in test/one-screen-type.test.js beside the other
// four A1 cells, so that exactly ONE file owns the page-background contract — a second copy of
// the same contract is the staleness class the plan's §1 records three times.
//
// THE MODEL AFTER A1 (js/nav.js setView, the source of truth for this split). Every screen is
// the same type: shown by removing one class, hidden by adding it, never co-visible with a
// sibling at rest, painting no background of its own. Now Playing is the deliberate exception —
// it alone stays an additive overlay mounted over an untouched settings screen for the NP-back
// reveal, so it alone still needs to paint. The legal painter set of --page-bg becomes exactly
// `body::before` (the fixed, never-moving base keeper) and `.nowplaying`.
//
// IT FAILS IN BOTH DIRECTIONS, deliberately: a screen that regains a background ENTERS the
// painter set and reddens the equality; `.nowplaying` losing its background LEAVES the set and
// reddens the same assertion.
//
// ⛔ HONEST LIMIT: this proves a TEXTUAL property of css/app.css. A background painted from
// JavaScript is outside it — that is test/page-bg-js-painter.test.js's job (whose own "three
// additive overlays" wording is stale at HEAD and is scrubbed by Stage A1, plan §12 item 22).
// Nothing here asserts occlusion, stacking or paint: jsdom has no layout, so such a cell could
// not fail. Those are the plan's §15 device rows.
//
// SKIPPED-PENDING-BUILD: the pre-commit battery runs the whole suite and blocks on any plain
// failure, and this project does not use --no-verify. CONFIRMED RED with the skip removed (run
// quoted in the companion note). ⭐ STAGE A1 (the builder): DELETE the three tests above, the
// stale "THE MODEL" header block at the top of this file, and TRANSPARENT_SELECTORS /
// OPAQUE_SELECTORS; remove this skip. That IS plan §12 items 17-18 and §16.1.
// ═══════════════════════════════════════════════════════════════════════════════════════
const A1_PAINTERS = ['body::before', '.nowplaying'];
const A1_TRANSPARENT = ['#home', '#browse', '#options',
  '#downloads, #general, #playback, #buffering, #diagnostics'];
const A1_SKIP = 'skipped-pending-build (Stage A1) — remove the skip to drive this cell red';

test('NOSETTINGSBG -- exactly body::before and .nowplaying paint --page-bg; no other screen '
  + 'rule does', { skip: A1_SKIP }, () => {
  const css = readRoot('css/app.css');
  const painters = selectorsFor(css, 'background: var(--page-bg)').slice().sort();
  assert.deepEqual(painters, A1_PAINTERS.slice().sort(),
    'after Stage A1 the legal painter set of --page-bg is exactly body::before (the fixed, '
    + 'never-moving base keeper) and .nowplaying (the one deliberate additive overlay). A '
    + 'settings screen that still paints its own copy renders the gradient at its own box\'s '
    + 'scale and origin and moves with it during a swipe; .nowplaying that stops painting '
    + `exposes the settings screen it is mounted over. Expected: ${JSON.stringify(A1_PAINTERS)}, `
    + `found: ${JSON.stringify(painters)}`);
});

test('NOSETTINGSBG -- #home, #browse, #options and the five-sub group declare no background '
  + 'property at all', { skip: A1_SKIP }, () => {
  const css = stripComments(readRoot('css/app.css'));
  for (const sel of A1_TRANSPARENT) {
    const body = ruleBody(css, sel);
    assert.ok(body != null, `fixture: a \`${sel}\` rule must exist in css/app.css`);
    assert.doesNotMatch(body, /(?:^|;)\s*background(-color)?\s*:/,
      `\`${sel}\` is a peer screen: setView parks #home and hides every sibling before showing `
      + 'it, so nothing live is behind it and it must declare no background property at all, '
      + `letting body::before's fixed copy show through undisturbed. Rule body: ${body}`);
  }
});

module.exports = { ruleBody };
