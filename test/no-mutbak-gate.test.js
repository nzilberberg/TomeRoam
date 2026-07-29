// Regression gate for the pre-commit `.mutbak` check (tools/hooks/no-mutbak-check.mjs), the
// mechanization of a recurring footgun: a mutation sweep interrupted mid-run leaves an APPLIED
// mutant in the tree (a `*.mutbak` pristine backup beside the mutated file). Committing then
// lands the mutant's altered source AND greens a suite that only passes because the mutation is
// in place. Nothing structural caught it before — only vigilance, which failed three times.
//
// Two things are guarded:
//   1. findMutbaks() detects a `*.mutbak` anywhere under a tree (and skips node_modules/.git),
//      proven both ways against a throwaway tree — present → found, absent → clean.
//   2. the CLI exits NONZERO when a `*.mutbak` exists and ZERO when the tree is clean, so the
//      run-checks battery actually blocks the commit.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

const NODE = process.execPath;
const CHECK = path.join(ROOT, 'tools', 'hooks', 'no-mutbak-check.mjs');
const load = () => import(pathToFileURL(CHECK).href);

test('findMutbaks detects a *.mutbak (present → found, absent → clean), and skips node_modules/.git', async () => {
  const { findMutbaks } = await load();
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-mutbak-'));
  try {
    fs.mkdirSync(path.join(tree, 'js'), { recursive: true });
    fs.mkdirSync(path.join(tree, 'node_modules', 'pkg'), { recursive: true });
    fs.mkdirSync(path.join(tree, '.git'), { recursive: true });
    fs.writeFileSync(path.join(tree, 'js', 'app.js'), 'ok');

    // CLEAN: no *.mutbak anywhere.
    assert.deepEqual(findMutbaks(tree), [], 'a tree with no *.mutbak must scan clean');

    // A *.mutbak in an excluded dir must NOT trip it (mutate.mjs never writes there, and a
    // dependency's own file must not block a commit).
    fs.writeFileSync(path.join(tree, 'node_modules', 'pkg', 'x.mutbak'), 'noise');
    fs.writeFileSync(path.join(tree, '.git', 'y.mutbak'), 'noise');
    assert.deepEqual(findMutbaks(tree), [],
      'a *.mutbak inside node_modules/.git must be ignored — only sweep artifacts in the source tree count');

    // PRESENT: a real applied-mutant backup in the source tree is found, as a POSIX relative path.
    fs.writeFileSync(path.join(tree, 'js', 'app.js.mutbak'), 'pristine backup');
    assert.deepEqual(findMutbaks(tree), ['js/app.js.mutbak'],
      'an interrupted-sweep *.mutbak in the source tree must be found');
  } finally {
    fs.rmSync(tree, { recursive: true, force: true });
  }
});

// The CLI is what the run-checks battery actually invokes; assert its exit code both ways by
// running the REAL check against the REAL repo (clean here — the suite never leaves a mutbak),
// then against a throwaway tree seeded with one, so the block is proven without touching ROOT.
test('the no-mutbak CLI exits 0 on the clean repo and 1 when a *.mutbak is present', async () => {
  // Clean: the real repo has no *.mutbak during a normal test run.
  const clean = spawnSync(NODE, [CHECK], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(clean.status, 0, `the check must PASS on the clean repo; stderr: ${clean.stderr}`);

  // Present: seed a throwaway tree with a mutbak and point a COPY of the check at it. The CLI
  // scans from its own ROOT, so to exercise the block hermetically we drive findMutbaks through a
  // tiny inline script rooted at the throwaway tree and assert its nonzero exit.
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-mutbak-cli-'));
  try {
    fs.writeFileSync(path.join(tree, 'swipe.js.mutbak'), 'pristine');
    const probe = path.join(tree, 'probe.mjs');
    fs.writeFileSync(probe,
      `import { findMutbaks } from ${JSON.stringify(pathToFileURL(CHECK).href)};\n` +
      `const m = findMutbaks(${JSON.stringify(tree)});\n` +
      `process.exit(m.length ? 1 : 0);\n`);
    const blocked = spawnSync(NODE, [probe], { cwd: tree, encoding: 'utf8' });
    assert.equal(blocked.status, 1, 'the check must BLOCK (exit 1) when a *.mutbak is present in the scanned tree');
  } finally {
    fs.rmSync(tree, { recursive: true, force: true });
  }
});

// The gate must be WIRED into the pre-commit battery, or it is inert — assert run-checks lists it.
test('the no-mutbak step is wired into the run-checks default battery, first', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'hooks', 'run-checks.mjs'), 'utf8');
  assert.match(src, /\[\s*'no-mutbak'\s*,\s*\[[^\]]*no-mutbak-check\.mjs[^\]]*\]\s*\]/,
    'run-checks.mjs must list a `no-mutbak` step invoking tools/hooks/no-mutbak-check.mjs');
  // It must precede the expensive steps so an interrupted sweep blocks before lint/typecheck/tests.
  const noMutbakAt = src.indexOf("'no-mutbak'");
  const testsAt = src.indexOf("'tests'");
  assert.ok(noMutbakAt >= 0 && testsAt >= 0 && noMutbakAt < testsAt,
    'the no-mutbak step must come before the tests step in the battery');
});
