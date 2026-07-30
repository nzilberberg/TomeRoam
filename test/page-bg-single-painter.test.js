// PAGE-BG-SINGLE-PAINTER -- the page background paints from exactly one source.
//
// THE DEFECT (user-diagnosed, on-device swipe report): `--page-bg` is a
// radial-gradient sized and centred relative to EACH ELEMENT'S OWN BOX. Six
// selectors painted it independently -- `body::before` (fixed, inset:0, the one
// keeper that never moves) plus five panel rules (#home, #browse, #options,
// .nowplaying, and the settings-subs group) -- so each panel rendered the
// gradient at a different scale/origin, and the panel copies moved WITH the
// panels during a swipe. Screens "filmstrip" adjacent, never stacked (a settled
// design choice), so no panel needs its own background to occlude another --
// every panel can be fully transparent.
//
// THE FIX: only `body::before` paints `--page-bg`. The five panel rules drop the
// declaration entirely -- NOT a flat-colour substitute, which papers over the
// motion instead of removing it (explicitly rejected).
//
// RED AT HEAD (confirmed by inspection before this fix): six selectors declare
// `background: var(--page-bg)` -- body::before, #home, #browse, #options,
// .nowplaying, and `#downloads, #general, #playback, #buffering, #diagnostics`.
const { test } = require('node:test');
const assert = require('node:assert');
const { readRoot, selectorsFor } = require('./dom-fixture.js');

const PANEL_SELECTORS = [
  '#home', '#browse', '#options', '.nowplaying',
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

test('PAGE-BG-SINGLE-PAINTER -- body::before is the ONLY selector that paints --page-bg', () => {
  const css = readRoot('css/app.css');
  const painters = selectorsFor(css, 'background: var(--page-bg)');
  assert.deepEqual(painters, ['body::before'],
    'exactly one selector may paint --page-bg (the fixed, never-moving body::before '
    + `keeper) -- found: ${JSON.stringify(painters)}`);
});

test('PAGE-BG-SINGLE-PAINTER -- no panel substitutes a flat-colour background in its place', () => {
  const css = stripComments(readRoot('css/app.css'));
  for (const sel of PANEL_SELECTORS) {
    const body = ruleBody(css, sel);
    assert.ok(body != null, `fixture: a \`${sel}\` rule must exist in css/app.css`);
    assert.doesNotMatch(body, /(?:^|;)\s*background(-color)?\s*:/,
      `\`${sel}\` must declare no background property at all (fully transparent so `
      + 'body::before shows through) -- a flat-colour substitute was explicitly '
      + `rejected as papering over the motion rather than removing it. Rule body: ${body}`);
  }
});

module.exports = { ruleBody };
