// GATE — a staged change to a SHIPPING file must bump the build number.
//
// THE INCIDENT, 2026-08-03. The user asked a plain question: "Did you push a build to test?
// My vapor is on 304." It was on `.304`, and `.304` was the newest number — but `css/app.css`
// had changed AFTER the stamp (a code review's citation fixes, comment-only) with no bump. So
// the deployed `.304` and the `.304` in the tree were two different files wearing one label.
// Nothing misbehaved, because the delta was comments. The defect is that the label stopped
// identifying a tree, which is the build number's whole job: the next device report saying
// "on .304" would have been unanswerable.
//
// WHY `stamp --check` DID NOT CATCH IT: it proves the three stamped files agree WITH EACH
// OTHER and with build.json. That is coherence, not freshness — it is perfectly happy when
// every file agrees on a number that no longer describes the tree.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

const CHECKER = path.join(ROOT, 'tools', 'hooks', 'shipping-change-bumps-check.mjs');
const load = () => import(pathToFileURL(CHECKER).href);

// The real incident's inputs, verbatim: comment-only css/app.css edit, build unchanged.
const INCIDENT = { changed: ['css/app.css'], before: '2026-08-02.304', after: '2026-08-02.304' };

test('the rule REDDENS on the 2026-08-03 incident', async () => {
  const { judge } = await load();
  assert.deepStrictEqual(judge(INCIDENT), ['css/app.css'],
    'the gate accepted the exact change that put two trees under one build number');
});

test('the same change WITH a bump is clean', async () => {
  const { judge } = await load();
  assert.deepStrictEqual(judge({ ...INCIDENT, after: '2026-08-03.305' }), []);
});

test('records and plans never require a bump', async () => {
  const { judge } = await load();
  assert.deepStrictEqual(judge({
    changed: ['Claude/Zelda/Board.md', 'Claude/Plans/PLAN-x.md'],
    before: '2026-08-03.305', after: '2026-08-03.305',
  }), []);
});

test('tests and tooling never require a bump — they are code, but they do not ship', async () => {
  // Gating these too would fire on nearly every records-adjacent commit, and a gate that
  // cries wolf gets switched off — which is how this project has lost gates before.
  const { judge } = await load();
  assert.deepStrictEqual(judge({
    changed: ['test/lint.test.js', 'tools/mutate.mjs', 'tools/hooks/run-checks.mjs'],
    before: '2026-08-03.305', after: '2026-08-03.305',
  }), []);
});

test('a pure restamp is the bump itself, not a violation', async () => {
  const { judge } = await load();
  assert.deepStrictEqual(judge({
    changed: ['sw.js', 'js/debug.js', 'index.html'],
    before: '2026-08-03.305', after: '2026-08-03.305',
  }), [], 'the three stamped files changing IS the stamp — it must not demand a second bump');
});

test('a real shipping file alongside the stamped three is still caught', async () => {
  const { judge } = await load();
  assert.deepStrictEqual(judge({
    changed: ['sw.js', 'index.html', 'js/app.js'],
    before: '2026-08-03.305', after: '2026-08-03.305',
  }), ['js/app.js']);
});

test('no baseline (unreadable prior build.json) fails OPEN rather than blocking', async () => {
  const { judge } = await load();
  assert.deepStrictEqual(judge({ changed: ['js/app.js'], before: null, after: null }), []);
});

test('isShipping selects app bytes and rejects everything else', async () => {
  // If this predicate matched nothing, every case above would pass by exclusion.
  const { isShipping } = await load();
  for (const p of ['js/app.js', 'css/app.css', 'index.html', 'sw.js', 'img/cover.png']) {
    assert.ok(isShipping(p), `${p} should be shipping`);
  }
  for (const p of ['Claude/Zelda/Board.md', 'test/x.test.js', 'tools/mutate.mjs',
    'README.md', 'package.json']) {
    assert.ok(!isShipping(p), `${p} should NOT be shipping`);
  }
});

test('the live tree passes its own gate', async () => {
  // A gate green only because nothing real is in scope is the vacuity this repo keeps paying
  // for — so assert the predicate actually selects live files, then that the tree is clean.
  const { isShipping } = await load();
  const live = ['js/app.js', 'css/app.css', 'index.html', 'sw.js']
    .filter((p) => fs.existsSync(path.join(ROOT, p)));
  assert.ok(live.length >= 4, 'the shipping files this gate guards are missing from the repo');
  assert.ok(live.every(isShipping));
});
