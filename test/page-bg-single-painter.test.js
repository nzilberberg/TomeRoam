// PAGE-BG-SINGLE-PAINTER -- --page-bg is painted by body::before plus exactly the
// one screen that still needs it; every filmstrip peer stays transparent.
//
// THE MODEL (nav.js's setView(), the source of truth for this split): #home,
// #browse, #options, and the settings sub-screens (#downloads, #general,
// #playback, #buffering, #diagnostics) are all filmstrip PEERS -- when one shows,
// setView() parks/hides whichever was underneath, so none of them is ever stacked
// over a live view and none needs its own background to occlude one. Only
// NOW PLAYING stays an ADDITIVE overlay: it is deliberately NOT parked/hidden
// underneath (nav.js leaves the prior view exactly as it was, for the instant
// swipe-back reveal), and it paints over the fixed topbar/transport/navbar besides
// -- so it alone must stay opaque.
//
// TWO DEFECTS THIS GUARDS, IN OPPOSITE DIRECTIONS:
//  - A filmstrip peer (#home/#browse/#options/a settings sub) regains its own
//    `background: var(--page-bg)`: the gradient is sized/centred to that panel's
//    own box, so it renders at a different scale/origin than body::before's copy
//    and moves WITH the panel during a swipe (the original, user-diagnosed defect
//    -- first found on #home/#browse, then recurring on #options/Now Playing/the
//    settings subs once those became real movers too).
//  - Now Playing LOSES its `background: var(--page-bg)`: the live view underneath,
//    plus the fixed topbar/transport/navbar it must cover, would show through.
const { test } = require('node:test');
const assert = require('node:assert');
const { readRoot, selectorsFor } = require('./dom-fixture.js');

const TRANSPARENT_SELECTORS = [
  '#home', '#browse', '#options',
  '#downloads, #general, #playback, #buffering, #diagnostics',
];
const OPAQUE_SELECTORS = ['.nowplaying'];

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

test('PAGE-BG-SINGLE-PAINTER -- exactly body::before + Now Playing paint --page-bg', () => {
  const css = readRoot('css/app.css');
  const painters = selectorsFor(css, 'background: var(--page-bg)').slice().sort();
  const expected = ['body::before', ...OPAQUE_SELECTORS].slice().sort();
  assert.deepEqual(painters, expected,
    'exactly body::before (the fixed, never-moving base keeper) and Now Playing (the '
    + `one screen still required to obscure a live view) may paint --page-bg -- expected: `
    + `${JSON.stringify(expected)}, found: ${JSON.stringify(painters)}`);
});

test('PAGE-BG-SINGLE-PAINTER -- every filmstrip peer (home/browse/options/subs) declares no background', () => {
  const css = stripComments(readRoot('css/app.css'));
  for (const sel of TRANSPARENT_SELECTORS) {
    const body = ruleBody(css, sel);
    assert.ok(body != null, `fixture: a \`${sel}\` rule must exist in css/app.css`);
    assert.doesNotMatch(body, /(?:^|;)\s*background(-color)?\s*:/,
      `\`${sel}\` is a filmstrip peer (nav.js's setView() parks/hides whichever view is `
      + 'underneath) and must declare no background property at all, so body::before\'s '
      + `fixed copy shows through undisturbed. Rule body: ${body}`);
  }
});

test('PAGE-BG-SINGLE-PAINTER -- Now Playing declares its own --page-bg background', () => {
  const css = stripComments(readRoot('css/app.css'));
  for (const sel of OPAQUE_SELECTORS) {
    const body = ruleBody(css, sel);
    assert.ok(body != null, `fixture: a \`${sel}\` rule must exist in css/app.css`);
    assert.match(body, /(?:^|;)\s*background\s*:\s*var\(--page-bg\)\s*;/,
      `\`${sel}\` is the one remaining additive overlay (nav.js's setView(): deliberately `
      + 'NOT parked/hidden underneath, and it also covers the fixed topbar/transport/navbar) '
      + `and must declare \`background: var(--page-bg)\` so nothing beneath shows through. `
      + `Rule body: ${body}`);
  }
});

module.exports = { ruleBody };
