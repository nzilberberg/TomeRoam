// GATE (Durable Engineering Contract §4.9) — no coverage test may silently exit before
// reaching its subject. `const op = findOp(); if (!op) return;` lets a test PASS when its
// production trigger never fired — false confidence. The discipline is to ASSERT the
// trigger: `assert.ok(op, 'the production trigger must fire')`.
//
// SCOPE (honest): this is a STATIC gate for the CANONICAL form only — `if (!x) return;`
// (a negated guard with a BARE return) inside a test file. It does NOT catch every semantic
// equivalent (`if (x == null) return;`, multi-condition guards); the real semantic backstop
// is the mutation sweep — a test that silently skips its subject shows UNCAUGHT there. The
// broad `if (...) return <value>;` form is deliberately NOT matched: those are legitimate
// mock/stub/poller returns, not coverage skips.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./dom-fixture.js');

// Legitimate `if (!x) return;` inside a test file (rare), each with a reason. Keyed by
// "<file>:<trimmed source line>". Empty today — the discipline is assert, not skip.
const ALLOW = {
  // 'foo.test.js:if (!supported) return;': 'environment probe; the capability is asserted separately',
};

const SELF = 'no-silent-coverage-exit-gate.test.js';
// A negated guard with a BARE return: `if ( ! <anything> ) return ;`
const SMELL = /\bif\s*\(\s*!.*?\)\s*return\s*;/;

test('§4.9 — no coverage test uses `if (!x) return;` to skip its subject', () => {
  const dir = path.join(ROOT, 'test');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js') && f !== SELF);
  const offenders = [];
  for (const f of files) {
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const code = lines[i].split('//')[0];               // drop line comments
      const key = `${f}:${code.trim()}`;
      if (SMELL.test(code) && !(key in ALLOW)) offenders.push(`${f}:${i + 1}  ${code.trim()}`);
    }
  }
  assert.deepEqual(offenders, [],
    'a test returns early on a negated guard, which can PASS while skipping its subject. '
    + 'Replace `if (!x) return;` with `assert.ok(x, "the production trigger must fire");`, '
    + 'or add the line to ALLOW with a reason:\n  ' + offenders.join('\n  '));
});
