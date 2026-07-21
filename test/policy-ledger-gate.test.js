// GATE (Durable Engineering Contract §4.19 / §1.C) — the structured policy ledger must
// assert its COMPLETE ACTIVE CONTENTS. This reconciles Claude/Decisions/PolicyLedger.mjs
// against the actual test suite so a policy exception cannot silently appear, drift, or
// outlive its cause:
//   - every KNOWN-RED test in the suite must be declared in the ledger (no untracked policy);
//   - every declared known-red must STILL be red (`{ todo }`) — a declared exception whose
//     test is no longer red has outlived its cause and must be removed;
//   - every entry's `tests` name must exist in the suite (a renamed/removed test dangles);
//   - every entry must carry the §1.C fields, with unique IDs.
//
// It is STATIC (it parses test SOURCE for `{ todo }` markers), so it does not depend on the
// suite's own red/green and does not re-run it.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

const TEST_DIR = path.join(ROOT, 'test');
const testFiles = () => fs.readdirSync(TEST_DIR).filter((f) => f.endsWith('.test.js'));
// Strip line comments so a `test('NAME', { todo })` EXAMPLE in a doc comment (this gate has
// one) is not scanned as a real test declaration.
const stripComments = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n');
const readAll = () => testFiles().map((f) => stripComments(fs.readFileSync(path.join(TEST_DIR, f), 'utf8'))).join('\n');

// Discover every `test('NAME', { …todo… }, fn)` and `test.todo('NAME', …)` in the suite.
// The options object is matched loosely (its string values may contain braces/commas), but
// `todo` always appears as the leading key, so detection is reliable; the NAME capture is exact.
function actualKnownRedTests() {
  const src = readAll();
  const names = new Set();
  const withOpts = /\btest\(\s*(['"])((?:\\.|(?!\1).)*?)\1\s*,\s*\{([\s\S]*?)\}\s*,/g;
  let m;
  while ((m = withOpts.exec(src))) { if (/\btodo\b/.test(m[3])) names.add(m[2]); }
  const dotTodo = /\btest\.todo\(\s*(['"])((?:\\.|(?!\1).)*?)\1/g;
  while ((m = dotTodo.exec(src))) names.add(m[2]);
  return names;
}
const nameExistsInSuite = (name, src) => src.includes("'" + name + "'") || src.includes('"' + name + '"');

const REQUIRED = ['id', 'subsystem', 'decision', 'reason', 'status', 'introduced', 'removalTrigger', 'tests'];

test('§1.C — every policy-ledger entry has the required fields and a unique id', async () => {
  const { POLICY_LEDGER } = await import(pathToFileURL(path.join(ROOT, 'Claude', 'Decisions', 'PolicyLedger.mjs')).href);
  assert.ok(Array.isArray(POLICY_LEDGER), 'PolicyLedger must export an array POLICY_LEDGER');
  const ids = new Set();
  for (const e of POLICY_LEDGER) {
    for (const k of REQUIRED) {
      assert.ok(e[k] !== undefined && e[k] !== '' && !(Array.isArray(e[k]) && e[k].length === 0),
        `ledger entry ${JSON.stringify(e.id || e)} is missing required field "${k}"`);
    }
    assert.ok(!ids.has(e.id), `duplicate ledger id "${e.id}"`);
    ids.add(e.id);
  }
});

test('§4.19 — the ledger and the suite agree on the complete known-red set', async () => {
  const { POLICY_LEDGER } = await import(pathToFileURL(path.join(ROOT, 'Claude', 'Decisions', 'PolicyLedger.mjs')).href);
  const actual = actualKnownRedTests();
  const declared = new Set(POLICY_LEDGER.filter((e) => e.knownRed).flatMap((e) => e.tests));

  const undeclared = [...actual].filter((n) => !declared.has(n));
  assert.deepEqual(undeclared, [],
    'these tests are known-red (`{ todo }`) but are NOT in the policy ledger — an untracked '
    + 'policy/known-red. Add a ledger entry (id, reason, removalTrigger):\n  ' + undeclared.join('\n  '));

  const stale = [...declared].filter((n) => !actual.has(n));
  assert.deepEqual(stale, [],
    'the ledger declares these as known-red, but no `{ todo }` test with that name exists — the '
    + 'exception has outlived its cause (fixed/renamed). Remove or update the entry:\n  ' + stale.join('\n  '));
});

test('§1.C — every ledger `tests` name exists in the suite', async () => {
  const { POLICY_LEDGER } = await import(pathToFileURL(path.join(ROOT, 'Claude', 'Decisions', 'PolicyLedger.mjs')).href);
  const src = readAll();
  const missing = [];
  for (const e of POLICY_LEDGER) for (const name of e.tests) {
    if (!nameExistsInSuite(name, src)) missing.push(`${e.id}: "${name}"`);
  }
  assert.deepEqual(missing, [],
    'these ledger `tests` reference a test name that does not exist in the suite (renamed or '
    + 'removed) — the entry no longer enforces anything:\n  ' + missing.join('\n  '));
});
