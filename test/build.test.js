// Deploy-consistency guards: these catch the two mistakes that have actually
// bitten this project — BUILD drifting between js/debug.js and sw.js, and a
// new script file missing from the SW precache list.
const { test } = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('BUILD is identical in js/debug.js and sw.js', () => {
  const dbg = read('js/debug.js').match(/const BUILD = '([^']+)'/);
  const sw = read('sw.js').match(/const BUILD = '([^']+)'/);
  assert.ok(dbg && sw, 'both files declare a BUILD const');
  assert.equal(dbg[1], sw[1], `js/debug.js has ${dbg && dbg[1]} but sw.js has ${sw && sw[1]} — bump BOTH every deploy`);
});

test('every script in index.html is precached by the SW (vendor excluded)', () => {
  const scripts = [...read('index.html').matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 7, 'found the script tags');
  const assets = read('sw.js');
  for (const s of scripts) {
    if (s.startsWith('js/vendor/')) continue;   // lazy-loaded, deliberately not precached
    assert.ok(assets.includes(`'./${s}'`), `${s} is missing from sw.js ASSETS`);
  }
});

test('vendored eruda is never precached (500 KB, on-demand only)', () => {
  // Look for a quoted ASSETS entry, not the word itself (a comment may mention it).
  assert.ok(!/['"]\.?\/?js\/vendor\//.test(read('sw.js')), 'sw.js must not precache js/vendor/*');
});
