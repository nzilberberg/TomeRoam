// NOSETTINGSBG -- --page-bg is painted by body::before plus .nowplaying, the one screen that
// keeps a background of its own (PLAN-one-screen-type.md, Stage A1).
//
// THE MODEL (nav.js's setView(), the source of truth for this split). Every screen is the
// same type: shown by removing one class, hidden by adding it, never co-visible with a
// sibling AT REST, and painting no background of its own -- setView parks #home and hides
// every other screen before showing the one that was applied, so AT REST nothing live is
// behind it and body::before's fixed, never-moving copy shows through undisturbed. The
// deliberate exception to co-visibility is a live filmstrip (Nav.overlayFilmstrip): both
// panes are briefly un-hidden together so the slide has something to show, and a pending
// reconcile must not disturb a live gesture's mover (Stage A1-fix, PLAN-one-screen-type.md
// §5.4). Now Playing is the deliberate exception to painting: an opaque background, `inset: 0`
// and `z-index: 60` are three CO-REQUIRED properties, and together they are what covers the
// topbar and the transport -- one of the load-bearing differences the user's ratified "Now
// Playing stays unique" decision protects (Claude/Decisions/DecisionLog.md; css/app.css's
// .nowplaying rule records the same reason at the declaration itself). Entering Now Playing
// parks #home and hides every other screen exactly as entering any other screen does
// (Stage A1b), so nothing live is behind it either.
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
    + 'base keeper) and .nowplaying (the one screen that keeps a background of its own). A '
    + 'settings screen that still paints its own copy renders the gradient at its own box\'s '
    + 'scale and origin and moves with it during a swipe; .nowplaying that stops painting '
    + 'stops covering the topbar and the transport, which is one of the load-bearing '
    + 'differences the user\'s ratified "Now Playing stays unique" decision protects -- its '
    + 'background, its `inset: 0` and its `z-index: 60` are co-required for that coverage. '
    + `Expected: ${JSON.stringify(PAINTERS)}, found: ${JSON.stringify(painters)}`);
});

test('NOSETTINGSBG -- #home, #browse, #options and the five-sub group declare no background '
  + 'property at all', () => {
  const css = stripComments(readRoot('css/app.css'));
  for (const sel of TRANSPARENT_SELECTORS) {
    const body = ruleBody(css, sel);
    assert.ok(body != null, `fixture: a \`${sel}\` rule must exist in css/app.css`);
    assert.doesNotMatch(body, /(?:^|;)\s*background(-color)?\s*:/,
      `\`${sel}\` is a peer screen: setView parks #home and hides every sibling before showing `
      + 'it, so AT REST nothing live is behind it (the deliberate exception is a live '
      + 'filmstrip, where both panes are briefly un-hidden together) and it must declare no '
      + `background property at all, letting body::before's fixed copy show through `
      + `undisturbed. Rule body: ${body}`);
  }
});

module.exports = { ruleBody };
