// Regression tests for the mutation-sweep `--affected` FILE SELECTOR (Poirot .233
// review, findings F-cf1..F-cf4). The selector decides which mutations run in the fast
// local pre-commit check; a false-clean means a renamed or newly-added mutation target
// is skipped and a rotted/undefended guard passes locally. It shipped with zero tests
// and marked `C ✓`, which the review called out (F-cf4). These are that missing set.
//
// Grounding: the byte fixtures below are the EXACT `git status --porcelain=v1 -z
// --untracked-files=all` output shape (NUL-delimited, verbatim paths, `dest\0src` for a
// rename) — captured from real git, not invented. One end-to-end case drives a throwaway
// real repo so the command flags (F-cf2's --untracked-files=all) are exercised, not faked.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

// Loaded via dynamic import: mutation-sweep.mjs is ESM with top-level await, so it cannot
// be require()d — and its isCli guard means importing it does NOT launch a sweep.
const load = () => import(pathToFileURL(path.join(ROOT, 'tools', 'mutation-sweep.mjs')).href);

// The end-to-end case needs a real git; detect it once so its absence skips (not fails).
let hasGit = true;
try { execFileSync('git', ['--version'], { stdio: 'ignore' }); } catch { hasGit = false; }

const NUL = '\0';

test('parseChangedFiles: staged and unstaged modifications', async () => {
  const { parseChangedFiles } = await load();
  const s = parseChangedFiles(`M  staged.js${NUL} M unstaged.js${NUL}`);
  assert.deepEqual([...s].sort(), ['staged.js', 'unstaged.js']);
});

test('parseChangedFiles: a deletion is reported', async () => {
  const { parseChangedFiles } = await load();
  assert.ok(parseChangedFiles(` D gone.js${NUL}`).has('gone.js'));
});

test('parseChangedFiles: F-cf1 — a rename yields BOTH source and destination', async () => {
  const { parseChangedFiles } = await load();
  // Real -z rename record: `R  <dest>NUL<src>NUL`. The old parser kept only the
  // destination (`split(' -> ').pop()`), so a mutation on the pre-rename path was skipped.
  const s = parseChangedFiles(`R  new.js${NUL}old.js${NUL}`);
  assert.ok(s.has('new.js'), 'destination path present');
  assert.ok(s.has('old.js'), 'source path present — a mutation may target the pre-rename path');
});

test('parseChangedFiles: F-cf2 — a new file under a new dir is listed individually', async () => {
  const { parseChangedFiles } = await load();
  // With --untracked-files=all git emits the file, not the collapsed `js/newmod/` entry.
  assert.ok(parseChangedFiles(`?? js/newmod/target.js${NUL}`).has('js/newmod/target.js'));
});

test('parseChangedFiles: F-cf3 — odd-character names are verbatim, never split or escaped', async () => {
  const { parseChangedFiles } = await load();
  // Under -z there is no quoting, no octal escaping, and no ` -> ` arrow: every path is
  // verbatim UTF-8 bytes split only on NUL. So each of these is exactly one path.
  const names = [
    'café.js',      // non-ASCII — the old parser left this octal-escaped
    'a -> b.js',         // literal arrow substring — the old parser split it into `b.js`
    'a b.js',            // a space
    'a\tb.js',           // a tab
    'we"ird.js',         // a quote — the old parser only stripped SURROUNDING quotes
  ];
  for (const n of names) {
    const s = parseChangedFiles(` M ${n}${NUL}`);
    assert.ok(s.has(n), `kept verbatim: ${JSON.stringify(n)}`);
  }
  // Specifically NOT split on the arrow.
  assert.ok(!parseChangedFiles(` M a -> b.js${NUL}`).has('b.js'), 'the arrow substring is not a delimiter');
});

test('parseChangedFiles: several records and a trailing NUL', async () => {
  const { parseChangedFiles } = await load();
  const s = parseChangedFiles(`M  a.js${NUL}R  d.js${NUL}c.js${NUL}?? e.js${NUL}`);
  assert.deepEqual([...s].sort(), ['a.js', 'c.js', 'd.js', 'e.js']);
});

test('targetsOf: single-file and two-file (also) mutations', async () => {
  const { targetsOf } = await load();
  assert.deepEqual(targetsOf({ file: 'a.js' }), ['a.js']);
  assert.deepEqual(targetsOf({ file: 'a.js', also: { file: 'b.js' } }), ['a.js', 'b.js']);
  // `also` without its own file inherits the primary file.
  assert.deepEqual(targetsOf({ file: 'a.js', also: {} }), ['a.js', 'a.js']);
});

test('affectedIndices: selects mutations whose target changed; empty when none match', async () => {
  const { affectedIndices } = await load();
  const muts = [{ file: 'x.js' }, { file: 'y.js', also: { file: 'z.js' } }, { file: 'q.js' }];
  assert.deepEqual(affectedIndices(muts, new Set(['z.js'])), [1], 'matched via the `also` file');
  assert.deepEqual(affectedIndices(muts, new Set(['x.js', 'q.js'])), [0, 2]);
  assert.deepEqual(affectedIndices(muts, new Set(['unrelated.js'])), [], 'zero selected when nothing matches');
});

test('changedFiles: end-to-end against a real repo — rename, new dir, odd name', { skip: !hasGit }, async () => {
  const { changedFiles } = await load();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-sweep-'));
  try {
    const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
    git('init', '-q');
    git('config', 'user.email', 't@t.t');
    git('config', 'user.name', 't');
    fs.writeFileSync(path.join(dir, 'old.js'), 'x\n');
    git('add', '-A');
    git('commit', '-qm', 'init');
    git('mv', 'old.js', 'new.js');                                        // rename (F-cf1)
    fs.mkdirSync(path.join(dir, 'js', 'newmod'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'js', 'newmod', 'target.js'), 'y\n'); // new file in new dir (F-cf2)
    fs.writeFileSync(path.join(dir, 'café.js'), 'z\n');              // odd-char name (F-cf3)
    const s = changedFiles(dir);
    assert.ok(s.has('old.js'), 'F-cf1: rename SOURCE present');
    assert.ok(s.has('new.js'), 'rename destination present');
    assert.ok(s.has('js/newmod/target.js'), 'F-cf2: new file in a new dir is listed, not collapsed');
    assert.ok(s.has('café.js'), 'F-cf3: odd-character name kept verbatim');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
