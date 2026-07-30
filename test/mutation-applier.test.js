// MUTUNIQ (the APPLIER half) — a registered mutation whose `from` occurs more than once is
// REFUSED BY THE APPLIER ITSELF, and a disambiguated entry is applied to the INTENDED
// occurrence only (PLAN-home-shift-fix.md §7.1, §7.3). Authored by Curie.
//
// ⭐ WHY THIS FILE EXISTS ALONGSIDE test/mutation-anchors.test.js — the decision, recorded so a
// later reader does not read it as duplication.
// MUTUNIQ's specification has two halves: "BOTH the applier and the anchors gate fail it with a
// message naming the occurrence count" AND "the same mutation is accepted when the entry
// disambiguates … and it then applies to the intended occurrence only."
//   • The REGISTRATION half is already covered, in test/mutation-anchors.test.js: a
//     registry-wide gate that calls `resolveAnchor` for every entry, plus a fixture unit test
//     driving `resolveAnchor` directly. Audited and NOT duplicated here.
//   • The APPLIER half was NOT covered. `resolveAnchor` only DECIDES an index; the substitution
//     that must honour it lives in the CLI (`src.slice(0, index) + to + src.slice(…)`) and no
//     automated test executed it. Reverting that one line to `src.replace(from, to)` — the
//     original defect — leaves EVERY existing check green: `resolveAnchor` still returns the
//     right index, the registry gate still passes, and every mutation silently goes back to
//     hitting the first occurrence. That is precisely the hole MUTUNIQ exists to close, so this
//     file closes exactly it and nothing else.
//
// ⭐ AND IT IS WHAT MAKES MUTUNIQ-a SWEEPABLE AT ALL. `test/mutation-anchors.test.js` is listed
// in `SOURCE_TEXT_GATES` in tools/mutation-sweep.mjs (excluded from the sweep, because it fails
// by construction under every mutation). So the uniqueness check's only other coverage is
// invisible to the sweep: without this file, mutant MUTUNIQ-a would be reported UNCAUGHT.
//
// HOW IT EXECUTES THE REAL CLI WITHOUT TOUCHING THE REAL TREE. The CLI is driven in a TEMP
// DIRECTORY: `tools/mutate.mjs` is copied there with two fixture entries injected at the head
// of its registry, and a synthetic target file is created under that cwd. So the real registry
// is not polluted (a fixture entry in it would be swept and reported uncaught), no real source
// file is ever written, and the code under test is the shipped applier rather than a re-coded
// model of it.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ROOT } = require('./dom-fixture.js');

// Two `foo();` sites with distinct neighbours, so "which one was mutated" is unambiguous.
const TARGET_REL = 'fixture/target.js';
const TARGET_SRC = ['KEEP', 'foo();', 'MID', 'foo();', 'END', ''].join('\n');

const FIXTURE_ENTRIES = `
  { name: 'FIXTURE bare non-unique (must be refused)',
    file: '${TARGET_REL}', from: 'foo();', to: 'bar();' },
  { name: 'FIXTURE disambiguated by occurrence (must apply to the SECOND site only)',
    file: '${TARGET_REL}', from: 'foo();', to: 'bar();', occurrence: 2 },
`;

/** A throwaway repo holding the real applier plus a synthetic target. */
function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutate-applier-'));
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'mutate.mjs'), 'utf8');
  const marker = 'const MUTATIONS = [';
  assert.ok(src.includes(marker),
    'fixture: tools/mutate.mjs must declare its registry as `const MUTATIONS = [` for the fixture '
    + 'entries to be injected — if this shape changed, re-derive this sandbox rather than deleting it');
  fs.writeFileSync(path.join(dir, 'mutate.mjs'), src.replace(marker, marker + FIXTURE_ENTRIES));
  fs.mkdirSync(path.join(dir, 'fixture'));
  fs.writeFileSync(path.join(dir, TARGET_REL), TARGET_SRC);
  return dir;
}

const runCli = (dir, args) => spawnSync(process.execPath, [path.join(dir, 'mutate.mjs'), ...args],
  { cwd: dir, encoding: 'utf8' });
const readTarget = (dir) => fs.readFileSync(path.join(dir, TARGET_REL), 'utf8');
const bakPath = (dir) => path.join(dir, TARGET_REL + '.mutbak');

test('MUTUNIQ — the APPLIER refuses a non-unique anchor, names the occurrence count, and writes '
  + 'nothing', () => {
  const dir = makeSandbox();
  try {
    const r = runCli(dir, ['0']);
    assert.equal(r.status, 1,
      `a non-unique anchor must exit NONZERO from the applier, not just from the registration gate `
      + `— a silent success here is how a mis-sited mutant gets credited to a cell it never reached. `
      + `stdout=${JSON.stringify(r.stdout)} stderr=${JSON.stringify(r.stderr)}`);
    assert.match(r.stderr, /NON-UNIQUE ANCHOR/,
      'the refusal must be distinguishable from ANCHOR NOT FOUND (a rotted anchor) — the two mean '
      + 'different things and route to different repairs');
    assert.match(r.stderr, /occurs 2 times/,
      'the message must state the COUNT: "disambiguate" is not actionable without knowing how many '
      + 'sites there are');
    assert.match(r.stderr, /mutation NOT applied/,
      'and it must say the mutation was not applied, or a reader assumes a partial edit landed');
    assert.equal(readTarget(dir), TARGET_SRC,
      'the target file must be BYTE-UNCHANGED after a refusal — a refusal that still edited would '
      + 'be worse than the defect it replaces');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('MUTUNIQ — a disambiguated entry is applied to the INTENDED occurrence only, and the first '
  + 'occurrence is left untouched', () => {
  const dir = makeSandbox();
  try {
    const r = runCli(dir, ['1']);
    assert.equal(r.status, 0,
      `an entry declaring occurrence: 2 must APPLY, not be refused — stderr=${JSON.stringify(r.stderr)}`);
    const out = readTarget(dir);
    assert.equal(out, ['KEEP', 'foo();', 'MID', 'bar();', 'END', ''].join('\n'),
      'THE LOAD-BEARING ASSERTION: the SECOND occurrence must be the one rewritten and the FIRST '
      + 'must be intact. This is what `resolveAnchor` alone cannot prove — it returns an index, and '
      + 'nothing else executes the substitution that has to honour it. Reverting the applier to '
      + '`src.replace(from, to)` produces "bar(); … foo();" here and leaves every registration-time '
      + `check green. Got:\n${JSON.stringify(out)}`);
    assert.ok(fs.existsSync(bakPath(dir)),
      'and a pristine backup must exist, since --restore is the only way back');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('MUTUNIQ — --restore returns the applied mutant to pristine and removes the backup', () => {
  const dir = makeSandbox();
  try {
    assert.equal(runCli(dir, ['1']).status, 0, 'fixture: the mutation must apply before restoring');
    assert.notEqual(readTarget(dir), TARGET_SRC, 'fixture: the tree must really be mutated first');
    const r = runCli(dir, ['--restore']);
    assert.equal(r.status, 0, `--restore must succeed — stderr=${JSON.stringify(r.stderr)}`);
    assert.equal(readTarget(dir), TARGET_SRC, 'the restored file must be byte-identical to pristine');
    assert.equal(fs.existsSync(bakPath(dir)), false,
      'and the backup must be REMOVED — a surviving *.mutbak is this project\'s signal that a '
      + 'sweep died mid-flight with a mutant still applied, so a stale one is a false alarm that '
      + 'costs a real investigation');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
