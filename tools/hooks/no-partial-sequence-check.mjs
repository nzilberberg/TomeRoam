#!/usr/bin/env node
// no-partial-sequence-check.mjs — pre-commit gate: refuse to commit while a multi-commit
// revert/cherry-pick sequence is UNFINISHED, or while any path is still unmerged.
//
// THE INCIDENT (2026-08-01). A device gate failed and the fix was to revert three commits:
//   git revert --no-commit e1208eb e1db674 ee1080f
// It stopped on a conflict after the FIRST one. The other two never ran. The stamp conflicts
// were resolved, the result was committed and pushed, and it was reported as "reverted" —
// without ever checking the result against the target. What actually shipped was the change
// MINUS its review fixes, which is worse than not reverting at all. The user tested it, found
// it still broken, and lost another cycle to a revert that had silently done a third of its job.
//
// A revert that stops halfway looks exactly like one that finished: the working tree is
// modified, `git status` shows a pile of changes, and `git commit` succeeds.
//
// ⚠️ MEASURED, not assumed. `.git/REVERT_HEAD` is NOT the signal — a *clean* `--no-commit`
// revert leaves it too, so keying on it would block every correct staged revert. The signal is
// `.git/sequencer/todo`, which exists only while a multi-commit sequence still has entries
// pending. Probed directly: a 3-commit revert that applies cleanly leaves REVERT_HEAD and
// MERGE_MSG and NO sequencer; the same revert forced to conflict leaves sequencer/todo as well.
//
// Unmerged paths are checked too, and catch the single-commit case the sequencer cannot: a
// conflicted revert or merge staged with `<<<<<<<` markers still in a file.
//
// ⛔ HONEST RESIDUAL — this gate would NOT have caught the incident that earned it.
// `git revert --quit` deletes the sequencer state, and that is exactly what was run before
// committing. `--quit` means "abandon the sequence", so a gate cannot distinguish an abandoned
// sequence from a finished one — the information is gone by construction. What covers that case
// is the discipline the incident actually earned, and it resists a cheap gate because the gate
// cannot know the intended target:
//
//     A REVERT IS VERIFIED AGAINST ITS TARGET BEFORE IT IS REPORTED.
//     git diff <target-commit> -- <the paths that should have moved>   must be EMPTY.
//
// This gate closes the shape where someone commits mid-sequence without noticing. The verify
// step closes the rest. Neither replaces the other.
//
//   node tools/hooks/no-partial-sequence-check.mjs   # exit 1 if a sequence is pending
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The real .git directory (worktrees and submodules put it elsewhere, so ask git).
export function gitDir(repoRoot = ROOT) {
  try {
    const p = execSync('git rev-parse --absolute-git-dir', { cwd: repoRoot, encoding: 'utf8' }).trim();
    return p || join(repoRoot, '.git');
  } catch { return join(repoRoot, '.git'); }
}

// Is a multi-commit revert/cherry-pick sequence still pending?
export function sequencePending(repoRoot = ROOT) {
  return existsSync(join(gitDir(repoRoot), 'sequencer', 'todo'));
}

// Paths git still considers unmerged. `git diff --name-only --diff-filter=U` is the direct
// question; porcelain's UU/AA/DD codes are the same fact seen from the status side.
export function unmergedPaths(repoRoot = ROOT) {
  try {
    return execSync('git diff --name-only --diff-filter=U', { cwd: repoRoot, encoding: 'utf8' })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { return []; }                                  // fail OPEN: unreadable is not proof
}

function main() {
  const pending = sequencePending();
  const unmerged = unmergedPaths();
  if (!pending && unmerged.length === 0) return 0;

  console.error('✗ no-partial-sequence FAILED — this commit would land an UNFINISHED operation:');
  if (pending) {
    console.error('  — a revert/cherry-pick sequence is still pending (.git/sequencer/todo exists).');
    console.error('    Commits remaining in the sequence have NOT been applied.');
  }
  for (const f of unmerged) console.error('  — unmerged path: ' + f);
  console.error('');
  console.error('  A revert that stops halfway looks exactly like one that finished: the tree is');
  console.error('  modified, status shows changes, and the commit succeeds. On 2026-08-01 that');
  console.error('  shipped a change MINUS its review fixes and cost a whole device cycle.');
  console.error('');
  console.error('  Finish it: resolve the conflicts, `git add` them, then `git revert --continue`');
  console.error('  (or `git cherry-pick --continue`) until the sequence is done. Abandon it with');
  console.error('  `git revert --abort`.');
  console.error('');
  console.error('  THEN VERIFY BEFORE REPORTING — this gate cannot do it for you, because it does');
  console.error('  not know your target:   git diff <target-commit> -- <paths>   must be EMPTY.');
  return 1;
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) process.exit(main());
