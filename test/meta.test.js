// META test — the anti-"false coverage" guard. The .15 sweep found the suite was
// validating PBLogic.pickNextBank, a scheduler the app had stopped calling (app.js
// reimplemented it as nextToBank) — tests passing against dead code. This asserts
// the reverse of a normal test: every symbol PBLogic exports must be REFERENCED by
// at least one shipped, non-test file. A kernel nobody calls is either dead code to
// delete or a wiring bug — either way this fails loudly instead of green-on-nothing.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const jsDir = path.join(root, 'js');

// The names PBLogic actually exports (parsed from the IIFE's closing `return {…}`).
function logicExports() {
  const src = fs.readFileSync(path.join(jsDir, 'logic.js'), 'utf8');
  const m = src.match(/return \{([^{}]+)\};\s*\}\)\(\);/);
  assert.ok(m, 'found PBLogic export object in logic.js');
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

// Every shipped JS file except logic.js itself (the definition site).
function shippedSources() {
  return fs.readdirSync(jsDir)
    .filter((f) => f.endsWith('.js') && f !== 'logic.js')
    .map((f) => fs.readFileSync(path.join(jsDir, f), 'utf8'))
    .join('\n');
}

test('every PBLogic export is referenced by shipped app code (no dead kernels)', () => {
  const exports = logicExports();
  assert.ok(exports.length >= 5, 'sanity: parsed a real export list');
  const src = shippedSources();
  const unused = exports.filter((name) => !new RegExp('PBLogic\\.' + name + '\\b').test(src));
  assert.deepEqual(unused, [], unused.length ? 'PBLogic exports nobody calls: ' + unused.join(', ') : 'all referenced');
});
