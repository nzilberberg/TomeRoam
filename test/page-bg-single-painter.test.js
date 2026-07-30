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

module.exports = { ruleBody };
