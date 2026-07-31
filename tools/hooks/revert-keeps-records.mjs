#!/usr/bin/env node
// revert-keeps-records.mjs — BLOCK a `git revert` that also deletes project RECORDS.
//
// THE DEFECT THIS MECHANIZES (observed 2026-07-30, cost: the whole campaign's board entry).
// A build commit legitimately carries BOTH code and records — Brunel writes the build log,
// Zelda updates the board and the decision log, all in the one commit that lands the change.
// That is correct and deliberate. But it makes `git revert` asymmetric in a way nobody thinks
// about at revert time: reverting the CODE also reverts the RECORDS.
//
// Concretely, 6c9e7e3 ("Park Options/subs like a real screen switch…") shipped 25 lines of
// Claude/Zelda/Board.md and 29 of Claude/Decisions/DecisionLog.md alongside its css/nav change.
// The change was wrong — it rendered the Options hub and a settings sub-screen through each
// other on-device — so 2700b5c reverted it. That revert silently deleted all 54 records lines.
// The board then had NO entry for the campaign it was tracking, and the drift read as
// forgetfulness rather than as the mechanical consequence it was.
//
// WHY THIS IS BACKWARDS, AND WHY IT IS WORTH A GATE. A failed experiment's record is MORE
// valuable after the revert, not less: it is the "we tried this, here is the device evidence it
// fails, do not retry it" entry. Reverting the code is exactly the moment that knowledge becomes
// permanent — and exactly the moment git throws it away. Losing it invites the same dead end to
// be walked again, which is the specific waste the records tree exists to prevent.
//
// ⚠️ WHICH EVENT — MEASURED, NOT ASSUMED. The obvious home for this is the `commit-msg` hook,
// and that would have been INERT: `git revert --no-edit` fires NO hooks at all — not pre-commit,
// not commit-msg (probed directly; a plain `git commit` in the same repo fires both). A gate on
// commit-msg alone would have been vacuously green against the exact operation it targets. So
// the real gate is PRE-PUSH, which covers every authoring path — `revert --no-edit`,
// `revert -n` + commit, cherry-pick -R, an amend — because all of them must be pushed to matter,
// and the push is the point of no return (before it, the reflog still has the records).
// `commit-msg` is kept as a cheap EARLY catch for the paths that do fire it.
//
// THE RULE. A commit whose subject is a git-generated revert (`Revert "…"`) may not DELETE lines
// under Claude/. Adding or modifying records during a revert is fine — only deletion is the
// hazard.
//
// REMEDY when this fires (not a reason to bypass; a two-command fix):
//   git revert --no-commit <sha>
//   git restore --staged --worktree --source=HEAD Claude/   # keep the records as they are
//   git commit -m 'Revert "…"'
// Better still, ADD a line to the board or the decision log saying what the revert disproved.
//
// HONEST LIMITS. (1) It keys on the generated `Revert "` subject; a revert committed under a
// hand-written message is not caught (deliberate — a human writing their own message is making a
// choice, not being surprised by git). (2) It cannot judge whether the records that survive are
// ACCURATE, only that they were not silently dropped. (3) Deliberate records deletion during a
// revert needs `--no-verify`; that is meant to be an explicit act.
//
//   node tools/hooks/revert-keeps-records.mjs --msg <commit-msg-file>   # commit-msg hook
//   node tools/hooks/revert-keeps-records.mjs --pre-push                # reads refs on stdin
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The records tree this gate protects. Anything under here is a project record.
export const RECORDS_DIR = 'Claude/';

const ZERO = /^0+$/;

// ⚠️ git exports GIT_DIR (and friends) into a hook's environment, and an ambient GIT_DIR
// OVERRIDES cwd for repo resolution — so a child `git` shelled from a hook silently addresses
// the hook's repo even when passed a different cwd. This gate is driven by tests against
// THROWAWAY repos, so every git call here strips those vars and resolves the repo from cwd
// alone. In production cwd is this repo, so the behaviour is unchanged.
function git(args, cwd) {
  const env = { ...process.env };
  for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[k];
  return execFileSync('git', args, { cwd, env, encoding: 'utf8' });
}

// Is `text` a git-generated revert message? Git writes `Revert "<subject of the reverted commit>"`
// as the subject line. Comment lines (`#`) and leading blanks are skipped — a commit message file
// mid-edit is full of them, and the subject is the first line that is neither.
export function isRevertMessage(text) {
  if (typeof text !== 'string') return false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    return /^Revert\s+"/.test(line);      // first real line decides; a later mention is prose
  }
  return false;
}

// Sum the DELETED-line counts in `git --numstat` output. Binary files report `-` for both counts;
// those are not line deletions and are skipped rather than counted as NaN.
function parseNumstat(out) {
  let deletions = 0;
  const files = [];
  for (const line of out.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [add, del, path] = line.split('\t');
    const n = Number(del);
    if (!Number.isFinite(n) || n <= 0) continue;    // binary (`-`) or pure addition
    deletions += n;
    files.push({ path, deleted: n, added: Number(add) || 0 });
  }
  return { deletions, files };
}

// Records lines deleted in the STAGED diff (the commit-msg path — the commit does not exist yet).
export function stagedRecordDeletions(cwd = ROOT) {
  try {
    return parseNumstat(git(['diff', '--cached', '--numstat', '--', RECORDS_DIR], cwd));
  } catch {
    return { deletions: 0, files: [] };   // fail OPEN: an unreadable diff is not evidence of loss
  }
}

// Records lines deleted BY an existing commit (the pre-push path).
export function commitRecordDeletions(sha, cwd = ROOT) {
  try {
    return parseNumstat(git(['show', '--numstat', '--format=', sha, '--', RECORDS_DIR], cwd));
  } catch {
    return { deletions: 0, files: [] };
  }
}

// The commits a push would send. `remoteSha` all-zeros means a new remote ref, so there is no
// "from" — fall back to everything not already on some remote, which is what git itself would
// transfer. A localSha of all-zeros is a ref DELETION: nothing is being added, nothing to check.
export function commitsBeingPushed(localSha, remoteSha, cwd = ROOT) {
  if (!localSha || ZERO.test(localSha)) return [];
  const args = (remoteSha && !ZERO.test(remoteSha))
    ? ['rev-list', `${remoteSha}..${localSha}`]
    : ['rev-list', localSha, '--not', '--remotes'];
  try {
    return git(args, cwd).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Every commit in `shas` that is a revert AND deletes records. Data, so a test can assert it.
export function offendingCommits(shas, cwd = ROOT) {
  const out = [];
  for (const sha of shas) {
    let subject = '';
    try { subject = git(['log', '-1', '--format=%B', sha], cwd); } catch { continue; }
    if (!isRevertMessage(subject)) continue;
    const { deletions, files } = commitRecordDeletions(sha, cwd);
    if (deletions > 0) {
      out.push({ sha: sha.slice(0, 7), subject: subject.split(/\r?\n/)[0].trim(), deletions, files });
    }
  }
  return out;
}

function explain(header, files, deletions, remedy) {
  const list = files.map((f) => `    ${f.path}  −${f.deleted} line${f.deleted === 1 ? '' : 's'}`).join('\n');
  return [
    header,
    list,
    '',
    '  A build commit carries code AND records together, so reverting the code reverts the',
    '  records too. That is backwards: a failed experiment\'s record is MORE valuable after the',
    '  revert — it is the "we tried this, it failed on-device, do not retry it" entry. This has',
    '  already happened once (2700b5c dropped 54 lines of board + decision log), and the board',
    '  then had no entry at all for the campaign it was tracking.',
    '',
    remedy,
    '  Deliberate records deletion during a revert: push/commit with `--no-verify`.',
  ].join('\n');
}

// commit-msg decision. Returns null to allow, or a blocking reason.
export function checkMessage(msgText, cwd = ROOT) {
  if (!isRevertMessage(msgText)) return null;
  const { deletions, files } = stagedRecordDeletions(cwd);
  if (deletions === 0) return null;
  return explain(
    `✗ revert-keeps-records FAILED — this revert deletes ${deletions} line${deletions === 1 ? '' : 's'} of project records:`,
    files, deletions,
    ['  Keep the records, land the code revert:',
      '    git restore --staged --worktree --source=HEAD ' + RECORDS_DIR,
      '    git commit --no-edit',
      '  Better: ADD a line recording what this revert disproved, then commit.'].join('\n'),
  );
}

// pre-push decision over the ref lines git writes to stdin:
//   <local-ref> <local-sha> <remote-ref> <remote-sha>
export function checkPush(stdinText, cwd = ROOT) {
  const problems = [];
  for (const raw of String(stdinText || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [, localSha, , remoteSha] = line.split(/\s+/);
    problems.push(...offendingCommits(commitsBeingPushed(localSha, remoteSha, cwd), cwd));
  }
  if (!problems.length) return null;
  const total = problems.reduce((n, p) => n + p.deletions, 0);
  const files = problems.flatMap((p) => p.files);
  const heads = problems.map((p) => `  ${p.sha}  ${p.subject}`).join('\n');
  return explain(
    `✗ revert-keeps-records FAILED — ${problems.length} revert commit${problems.length === 1 ? '' : 's'} being pushed delete${problems.length === 1 ? 's' : ''} ${total} line${total === 1 ? '' : 's'} of project records:\n${heads}\n  Files:`,
    files, total,
    ['  Restore the records on top (keeps the code revert, keeps the history):',
      '    git checkout <revert-sha>^ -- ' + RECORDS_DIR,
      '    git commit -m "Records: restore the entries the revert removed, plus what it disproved"',
      '  Better: also ADD what the reverted experiment disproved, so it is not retried.'].join('\n'),
  );
}

const isCli = process.argv[1]
  && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {
  const mode = process.argv[2];
  // ⚠️ Judge the repo the hook was INVOKED IN, not the one this script happens to live in.
  // The first version defaulted to ROOT (this file's own repo), so when the gate's tests drove it
  // against throwaway repos it resolved their SHAs against the real TomeRoam history — `fatal: bad
  // object`, an empty commit list, and a green allow. Inert, for the same reason the commit-msg
  // placement would have been. git always runs hooks from the repo root, so cwd is the right
  // answer in production and the only correct one under test.
  const CWD = process.cwd();
  if (mode === '--msg') {
    let text = '';
    try { text = readFileSync(process.argv[3], 'utf8'); } catch { process.exit(0); }  // fail OPEN
    const reason = checkMessage(text, CWD);
    if (reason) { console.error(reason); process.exit(1); }
    process.exit(0);
  } else if (mode === '--pre-push') {
    let stdin = '';
    try { stdin = readFileSync(0, 'utf8'); } catch { process.exit(0); }               // fail OPEN
    const reason = checkPush(stdin, CWD);
    if (reason) { console.error(reason); process.exit(1); }
    process.exit(0);
  }
  console.error('usage: revert-keeps-records.mjs --msg <file> | --pre-push');
  process.exit(0);
}
