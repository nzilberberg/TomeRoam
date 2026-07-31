// revert-keeps-records.test.js — the gate that stops a `git revert` from silently deleting the
// project records the reverted commit carried.
//
// THE INCIDENT (2026-07-30). Build commit 6c9e7e3 shipped a css/nav change TOGETHER with 25 lines
// of Claude/Zelda/Board.md and 29 of Claude/Decisions/DecisionLog.md — correct practice here, the
// record lands with the change. The change was wrong on-device, so 2700b5c reverted it, and the
// revert took all 54 records lines with it. The board was then silent about the very campaign it
// was tracking, and the gap read as forgetfulness rather than as git doing exactly what it says.
//
// ⚠️ THE EVENT WAS MEASURED, NOT ASSUMED — and the obvious choice was wrong. A `commit-msg` gate
// would have been INERT: `git revert --no-edit` fires NO hooks (probed directly; a plain commit in
// the same repo fires both pre-commit and commit-msg). These tests therefore drive REAL `git
// revert` + REAL `git push` against throwaway repos wired to the REAL hook scripts, so the test
// proves the hook FIRES — not merely that a pure function returns the right value. A unit-only
// test here would have passed against a gate that never ran.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { isRevertMessage, checkPush, commitsBeingPushed } from '../tools/hooks/revert-keeps-records.mjs';
import { HOOK_SCRIPTS } from '../tools/hooks/manage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = join(ROOT, 'tools', 'hooks');
const NODE = process.execPath;

// git exports GIT_DIR & friends into a hook's environment and an ambient GIT_DIR OVERRIDES cwd,
// so a git call aimed at a throwaway repo would silently hit the REAL one. Strip them for every
// child here — this suite creates repos and commits in them.
const ENV = { ...process.env };
for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete ENV[k];

const git = (args, cwd) => execFileSync('git', args, { cwd, env: ENV, encoding: 'utf8' });
const gitTry = (args, cwd) => spawnSync('git', args, { cwd, env: ENV, encoding: 'utf8' });

// A throwaway repo wired to the REAL pre-push hook, with a bare remote, holding one base commit.
//
// The hooks directory holds VERBATIM COPIES of the two real files rather than pointing
// core.hooksPath at tools/hooks itself. Pointing at the real directory also activates the real
// `pre-commit`, which runs the whole fast battery — including this very suite — from the real
// repo root: every temp commit re-ran all of TomeRoam's tests inside a test. Copying keeps what
// is under test byte-identical (a drifted copy cannot hide, since it is copied per run) while
// isolating the one hook this suite is about.
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'tr-revert-'));
  const work = join(dir, 'work');
  const remote = join(dir, 'remote.git');
  const hooks = join(dir, 'hooks');
  mkdirSync(work, { recursive: true });
  mkdirSync(hooks, { recursive: true });
  copyFileSync(join(HOOKS, 'pre-push'), join(hooks, 'pre-push'));
  copyFileSync(join(HOOKS, 'revert-keeps-records.mjs'), join(hooks, 'revert-keeps-records.mjs'));
  git(['init', '-q', '--bare', remote], dir);
  git(['init', '-q', '.'], work);
  git(['config', 'user.email', 'gate@test.local'], work);
  git(['config', 'user.name', 'Gate Test'], work);
  git(['config', 'commit.gpgsign', 'false'], work);
  // Record node the way the installer does — node is not on PATH on this machine, and without
  // this the hook would fail to launch and "block" for the wrong reason, which would make a
  // blocking assertion pass vacuously.
  git(['config', 'core.hooksPath', hooks], work);
  git(['config', 'tomeroam.node', NODE], work);
  git(['remote', 'add', 'origin', remote], work);
  writeFileSync(join(work, 'code.js'), 'export const v = 1;\n');
  git(['add', '-A'], work);
  git(['commit', '-q', '-m', 'base'], work);
  git(['push', '-q', 'origin', 'HEAD:refs/heads/main'], work);
  return { dir, work, remote, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

// A build commit in this project's shape: code AND the records that describe it, together.
function buildCommitWithRecords(work) {
  mkdirSync(join(work, 'Claude', 'Zelda'), { recursive: true });
  writeFileSync(join(work, 'code.js'), 'export const v = 2;\n');
  writeFileSync(join(work, 'Claude', 'Zelda', 'Board.md'),
    '# Board\n- Stage X shipped: the thing was parked like a real screen switch.\n- Device gate owed.\n');
  git(['add', '-A'], work);
  git(['commit', '-q', '-m', 'Stage X: park the panes like a real screen switch'], work);
}

test('isRevertMessage: the git-generated subject, and only as the subject', () => {
  assert.equal(isRevertMessage('Revert "Stage X: park the panes"'), true);
  assert.equal(isRevertMessage('\n\n# a comment\nRevert "Stage X"\n'), true, 'skips blanks/comments');
  assert.equal(isRevertMessage('Stage X: park the panes'), false);
  // A body that merely TALKS about reverting is not a revert — the subject decides. Without this
  // the gate would fire on ordinary build commits whose notes mention a revert, and a gate that
  // blocks correct work is one that gets switched off.
  assert.equal(isRevertMessage('Stage X: park the panes\n\nRevert "the old approach" was considered.'), false);
  assert.equal(isRevertMessage(''), false);
  assert.equal(isRevertMessage(null), false);
});

test('a revert that deletes records is BLOCKED at push — via the real hook', () => {
  const r = makeRepo();
  try {
    buildCommitWithRecords(r.work);
    git(['push', '-q', 'origin', 'HEAD:refs/heads/main'], r.work);

    // The incident, reproduced exactly: revert the code, and the records go with it.
    git(['revert', '--no-edit', 'HEAD'], r.work);
    const deleted = git(['show', '--numstat', '--format=', 'HEAD', '--', 'Claude/'], r.work);
    assert.match(deleted, /Claude\/Zelda\/Board\.md/,
      'precondition: the revert must actually delete records, or this test proves nothing');

    const push = gitTry(['push', 'origin', 'HEAD:refs/heads/main'], r.work);
    assert.notEqual(push.status, 0, 'the push must be REJECTED');
    const out = (push.stdout || '') + (push.stderr || '');
    assert.match(out, /revert-keeps-records FAILED/, 'must fail for THIS reason, not incidentally');
    assert.match(out, /Claude\/Zelda\/Board\.md/, 'must name the records file it is protecting');

    // …and the remote must not have it.
    const remoteHead = git(['rev-parse', 'refs/heads/main'], r.remote).trim();
    const localHead = git(['rev-parse', 'HEAD'], r.work).trim();
    assert.notEqual(remoteHead, localHead, 'the revert must not have reached the remote');
  } finally { r.cleanup(); }
});

test('a revert that KEEPS the records is allowed through', () => {
  const r = makeRepo();
  try {
    buildCommitWithRecords(r.work);
    git(['push', '-q', 'origin', 'HEAD:refs/heads/main'], r.work);

    // The remedy the gate prints: revert the code, restore the records, commit.
    git(['revert', '--no-commit', 'HEAD'], r.work);
    git(['restore', '--staged', '--worktree', '--source=HEAD', 'Claude/'], r.work);
    git(['commit', '-q', '-m', 'Revert "Stage X: park the panes like a real screen switch"'], r.work);

    const push = gitTry(['push', 'origin', 'HEAD:refs/heads/main'], r.work);
    assert.equal(push.status, 0,
      'a revert that preserves records must pass:\n' + (push.stdout || '') + (push.stderr || ''));
  } finally { r.cleanup(); }
});

test('a revert of a code-only commit is allowed (no records to lose)', () => {
  const r = makeRepo();
  try {
    writeFileSync(join(r.work, 'code.js'), 'export const v = 3;\n');
    git(['add', '-A'], r.work);
    git(['commit', '-q', '-m', 'code-only change'], r.work);
    git(['push', '-q', 'origin', 'HEAD:refs/heads/main'], r.work);
    git(['revert', '--no-edit', 'HEAD'], r.work);

    const push = gitTry(['push', 'origin', 'HEAD:refs/heads/main'], r.work);
    assert.equal(push.status, 0,
      'must not fire when no records are touched:\n' + (push.stdout || '') + (push.stderr || ''));
  } finally { r.cleanup(); }
});

test('an ordinary (non-revert) commit that edits records is allowed', () => {
  const r = makeRepo();
  try {
    buildCommitWithRecords(r.work);
    git(['push', '-q', 'origin', 'HEAD:refs/heads/main'], r.work);
    // Records get legitimately COMPACTED — superseded facts cut. That is not the hazard, and a
    // gate that blocked it would make the records unmaintainable.
    writeFileSync(join(r.work, 'Claude', 'Zelda', 'Board.md'), '# Board\n- Stage X shipped.\n');
    git(['add', '-A'], r.work);
    git(['commit', '-q', '-m', 'Board: compact the stage-X entry'], r.work);

    const push = gitTry(['push', 'origin', 'HEAD:refs/heads/main'], r.work);
    assert.equal(push.status, 0,
      'record compaction must stay possible:\n' + (push.stdout || '') + (push.stderr || ''));
  } finally { r.cleanup(); }
});

test('commitsBeingPushed: a ref DELETION is not a push of commits', () => {
  const zeros = '0'.repeat(40);
  assert.deepEqual(commitsBeingPushed(zeros, 'abc1234', ROOT), []);
  assert.deepEqual(commitsBeingPushed('', 'abc1234', ROOT), []);
});

test('every hook script is EXECUTABLE in git\'s index', () => {
  // A hook git cannot execute does not fail — it silently never runs, and whatever it guarded is
  // ungated with no signal. The mode that matters is the one in the INDEX, because that is what a
  // fresh clone materialises; a local chmod only helps whoever ran it. This project has already
  // lost hours to an exec bit dropped from a script something invoked as an executable, so the
  // mode is asserted rather than assumed — and it is asserted for EVERY entry in HOOK_SCRIPTS, so
  // adding a fourth hook without its exec bit reddens here instead of shipping inert.
  const modes = new Map(
    git(['ls-files', '-s', 'tools/hooks/'], ROOT)
      .split(/\r?\n/).filter(Boolean)
      .map((l) => { const [meta, path] = l.split('\t'); return [path, meta.split(' ')[0]]; }),
  );
  for (const h of HOOK_SCRIPTS) {
    const path = 'tools/hooks/' + h;
    assert.ok(modes.has(path), `${path} is listed in HOOK_SCRIPTS but is not tracked by git`);
    assert.equal(modes.get(path), '100755', `${path} must be executable in the index, not ${modes.get(path)}`);
  }
});

test('THE REAL ARTIFACT: this repo\'s own history passes the gate', () => {
  // The incident commit 2700b5c IS in this history and WOULD be caught — but it is long since
  // pushed, so a push today sends nothing that violates the rule. Asserting the live repo is
  // clean is what proves the gate does not false-positive on real work.
  const head = git(['rev-parse', 'HEAD'], ROOT).trim();
  const upstream = gitTry(['rev-parse', 'origin/main'], ROOT);
  const remoteSha = upstream.status === 0 ? upstream.stdout.trim() : '0'.repeat(40);
  assert.equal(checkPush(`refs/heads/main ${head} refs/heads/main ${remoteSha}`, ROOT), null);
});
