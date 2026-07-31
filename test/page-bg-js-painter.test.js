// PAGE-BG-JS-PAINTER -- guards against a page background painted from JAVASCRIPT.
//
// test/page-bg-single-painter.test.js audits css/app.css only: exactly body::before (the
// fixed, never-moving base) plus .nowplaying, the one deliberate additive overlay, may
// paint --page-bg. That audit is BLIND to a background painted by an inline JS style
// assignment, because it never appears in css/app.css at all -- and that is exactly how
// build .272's user-reported "moving background" shipped and stayed green: js/swipe.js's ghostWrap() set
// `background:' + GHOST_BG + ';'` (GHOST_BG resolved --page-bg fresh per gesture) onto a
// `position:fixed;...;will-change:transform` wrapper that then gets translated during the
// swipe. Six CSS painters were audited; the seventh -- the only one that moved -- was set
// from script and invisible to a CSS-only scan.
//
// THIS FILE closes that hole: it scans every js/**/*.js file (excluding the vendored
// third-party bundle) for an inline style/cssText assignment that (a) paints a
// background-* property with a value that resolves the page background -- a literal
// `--page-bg` reference, or an identifier built from
// `getComputedStyle(...).getPropertyValue('--page-bg')` -- and (b) sits on an element
// declared to move (`will-change:transform` or a `transform` declaration nearby in the
// same style string). Both conditions together are the moving-background defect; either
// one alone is not (a non-moving JS-painted overlay, if one ever exists, would not trip
// this — that class of painter belongs in the CSS audit above, not here).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');

/** Every .js file under js/, excluding the vendored third-party bundle. */
function jsFiles() {
  const out = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'vendor') continue;
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.js')) out.push(p);
    }
  })(JS_DIR);
  return out;
}

// An identifier that resolves --page-bg even though it doesn't spell the literal at its
// point of use inside a style string (e.g. `const FOO_BG = (() => { ... getPropertyValue
// ('--page-bg') ... })();`). Matched by declaration, not by name, so no naming convention
// has to be guessed at or kept in sync. For each getPropertyValue('--page-bg') call, the
// alias is the NEAREST preceding `const NAME =` (the last one found scanning backward),
// not merely any const within range — an earlier, unrelated const in the same function
// (e.g. `const doc = env.document;`) must not be mistaken for the one this call belongs to.
function pageBgAliases(src) {
  const names = [];
  const gpvRe = /getPropertyValue\(\s*['"]--page-bg['"]\s*\)/g;
  let gm;
  while ((gm = gpvRe.exec(src))) {
    const before = src.slice(Math.max(0, gm.index - 300), gm.index);
    const constRe = /const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
    let cm, nearest = null;
    while ((cm = constRe.exec(before))) nearest = cm[1];
    if (nearest) names.push(nearest);
  }
  return names;
}

test('PAGE-BG-JS-PAINTER -- no JS-built inline style paints --page-bg onto an element declared to move', () => {
  const offenders = [];
  for (const file of jsFiles()) {
    const src = fs.readFileSync(file, 'utf8');
    const tokens = ['--page-bg', ...pageBgAliases(src)];
    const bgRe = /background(?:-color|-image)?\s*:/gi;
    let m;
    while ((m = bgRe.exec(src))) {
      // A window around the property, wide enough to see the value on either side of a
      // string-concatenation join (`'background:' + TOKEN + ';'`) or a longer cssText.
      const windowText = src.slice(Math.max(0, m.index - 100), m.index + 250);
      const paintsPageBg = tokens.some((t) => windowText.includes(t));
      if (!paintsPageBg) continue;
      const moves = /will-change\s*:\s*transform|(?:^|[;'"\s])transform\s*:/i.test(windowText);
      if (!moves) continue;
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`${path.relative(ROOT, file).replace(/\\/g, '/')}:${line}`);
    }
  }
  assert.deepEqual(offenders, [],
    'a page background painted from JS onto an element declared to move -- exactly one '
    + 'page background may exist (body::before, css/app.css, fixed, never moving) and it '
    + `must never be repainted onto a transform-capable element; found: ${JSON.stringify(offenders)}`);
});

module.exports = { jsFiles, pageBgAliases };
