// Test fixture built from the REAL shipped files — never a hand-rolled fake.
//
// WHY THIS EXISTS: a fixture you author encodes the same assumptions as the code
// you're testing, so it reproduces your bugs instead of catching them. Build .112
// shipped exactly that way — a hand-built DOM asserted that a browse PAGE gets
// `.hidden`, which is what the author believed; the app actually hides the #browse
// CONTAINER. The test went green and the bug shipped. Parsing the shipped file
// instead means a wrong mental model FAILS here, which is the only thing that makes
// a test worth writing.
//
// Scripts are deliberately NOT executed: this is the DOM *structure* as shipped.
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const readRoot = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** The real index.html, parsed. */
function appDom() { return new JSDOM(readRoot('index.html')); }

/** Selectors that carry a CSS declaration, e.g. selectorsFor(css, 'scrollbar-width: none'). */
function selectorsFor(css, decl) {
  const out = [];
  const re = new RegExp('([^{}\\n]+)\\{[^{}]*' + decl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^{}]*\\}', 'g');
  let m;
  while ((m = re.exec(css))) out.push(m[1].trim().replace(/\s+/g, ' '));
  return out;
}

module.exports = { appDom, readRoot, selectorsFor, ROOT };
