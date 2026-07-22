#!/usr/bin/env node
// claude-precommit.mjs — the Claude Code PreToolUse hook body. The harness runs this before
// a Bash tool call and pipes the tool input as JSON on stdin. If the command is a `git commit`
// (and not an explicit --no-verify bypass), it runs the shared check battery and BLOCKS the
// commit (exit 2) when a check fails; otherwise it allows the call (exit 0). It respects the
// same `git config tomeroam.hooks` toggle as the git hook, via run-checks.mjs.
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const gitcfg = (k) => { try { return execSync('git config --get ' + k, { cwd: ROOT }).toString().trim(); } catch { return ''; } };

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  let command = '';
  try { command = ((JSON.parse(input) || {}).tool_input || {}).command || ''; } catch { /* not JSON — allow */ }
  // Only gate real commits; leave a deliberate --no-verify bypass alone.
  if (!/\bgit\s+commit\b/.test(command) || /--no-verify\b/.test(command)) process.exit(0);
  // If the git pre-commit hook is installed, let IT run the battery during the commit —
  // don't double-run it here. This hook then only covers the gap: a clone where the git
  // hook was never installed. (Both still respect the same tomeroam.hooks toggle.)
  if (gitcfg('core.hooksPath') === 'tools/hooks') process.exit(0);

  const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'hooks', 'run-checks.mjs')], { encoding: 'utf8' });
  if (r.status !== 0) {
    process.stderr.write((r.stdout || '') + (r.stderr || '')
      + '\ntomeroam pre-commit: checks failed — commit blocked. Fix them, or `git commit --no-verify`, or `npm run hooks:off`.\n');
    process.exit(2);   // PreToolUse: exit 2 blocks the tool call and feeds stderr back
  }
  process.exit(0);
});
