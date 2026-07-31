// NOSETTINGSBG -- --page-bg is painted by body::before plus .nowplaying, the one
// deliberate additive-overlay exception (PLAN-one-screen-type.md, Stage A1).
//
// THE MODEL (nav.js's setView(), the source of truth for this split). Every screen is the
// same type: shown by removing one class, hidden by adding it, never co-visible with a
// sibling at rest, and painting no background of its own -- setView parks #home and hides
// every other screen before showing the one that was applied, so nothing live is ever
// behind it and body::before's fixed, never-moving copy shows through undisturbed. Now
// Playing is the deliberate exception: it alone stays an additive overlay, mounted over an
// untouched settings screen for the NP-back reveal, so it alone still needs to paint its
// own copy.
//
// IT FAILS IN BOTH DIRECTIONS, deliberately: a screen that regains a background enters the
// painter set and reddens the equality; .nowplaying losing its background leaves the set
// and reddens the same assertion.
//
// HONEST LIMIT: this proves a TEXTUAL property of css/app.css. A background painted from
// JavaScript is outside it -- that is test/page-bg-js-painter.test.js's job. Nothing here
// asserts occlusion, stacking or paint: jsdom has no layout, so such a cell could not fail.
// Those are the plan's §15 device rows (R-A's residual, R-B, R-C, R-E, R-F, R-G).
const { test } = require('node:test');
const assert = require('node:assert');
const { readRoot, selectorsFor } = require('./dom-fixture.js');

const PAINTERS = ['body::before', '.nowplaying'];
const TRANSPARENT_SELECTORS = ['#home', '#browse', '#options',
  '#downloads, #general, #playback, #buffering, #diagnostics'];

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

test('NOSETTINGSBG -- exactly body::before and .nowplaying paint --page-bg; no other screen '
  + 'rule does', () => {
  const css = readRoot('css/app.css');
  const painters = selectorsFor(css, 'background: var(--page-bg)').slice().sort();
  assert.deepEqual(painters, PAINTERS.slice().sort(),
    'the legal painter set of --page-bg is exactly body::before (the fixed, never-moving '
    + 'base keeper) and .nowplaying (the one deliberate additive overlay). A settings screen '
    + 'that still paints its own copy renders the gradient at its own box\'s scale and origin '
    + 'and moves with it during a swipe; .nowplaying that stops painting exposes the settings '
    + `screen it is mounted over. Expected: ${JSON.stringify(PAINTERS)}, `
    + `found: ${JSON.stringify(painters)}`);
});

test('NOSETTINGSBG -- #home, #browse, #options and the five-sub group declare no background '
  + 'property at all', () => {
  const css = stripComments(readRoot('css/app.css'));
  for (const sel of TRANSPARENT_SELECTORS) {
    const body = ruleBody(css, sel);
    assert.ok(body != null, `fixture: a \`${sel}\` rule must exist in css/app.css`);
    assert.doesNotMatch(body, /(?:^|;)\s*background(-color)?\s*:/,
      `\`${sel}\` is a peer screen: setView parks #home and hides every sibling before showing `
      + 'it, so nothing live is behind it and it must declare no background property at all, '
      + `letting body::before's fixed copy show through undisturbed. Rule body: ${body}`);
  }
});

module.exports = { ruleBody };
