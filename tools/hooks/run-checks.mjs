#!/usr/bin/env node
// run-checks.mjs — the shared FAST pre-commit check battery, used by BOTH the git
// pre-commit hook and the Claude PreToolUse hook, so ONE toggle governs both.
//
// Toggle:  git config tomeroam.hooks off   (or `npm run hooks:off`)   — default is ON.
// Bypass one commit:  git commit --no-verify
//
// Runs only the fast checks (stamp coherence, lint, typecheck, the full test suite incl.
// every gate). The expensive mutation SWEEP is deliberately NOT here — it stays in CI (and
// `npm run mutation-sweep -- --affected` is the fast local pre-check). Exit 0 = allow the
// commit; exit 1 = a check failed, block it.
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE = process.execPath;
const gitcfg = (k) => { try { return execSync('git config --get ' + k, { cwd: ROOT }).toString().trim(); } catch { return ''; } };

const toggle = gitcfg('tomeroam.hooks');
if (toggle === 'false' || toggle === 'off') {
  console.log('tomeroam pre-commit checks: OFF (git config tomeroam.hooks=' + toggle + '). Re-enable: npm run hooks:on');
  process.exit(0);
}

const eslint = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const tsc = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
// Each step is invoked with THIS node (portable-safe) — no dependency on npm/eslint/tsc
// being on PATH. A tool that isn't installed is skipped with a note (CI is the backstop),
// never a silent pass.
const steps = [
  ['stamp', [join(ROOT, 'tools', 'stamp-build.mjs'), '--check']],
  ['lint', existsSync(eslint) ? [eslint, 'js', 'sw.js'] : null],
  ['typecheck', existsSync(tsc) ? [tsc, '-p', 'jsconfig.json'] : null],
  ['tests', ['--test', 'test/*.test.js']],
];

for (const [name, args] of steps) {
  if (!args) { console.log('· ' + name + ' skipped (tool not installed locally — CI enforces it)'); continue; }
  const r = spawnSync(NODE, args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    process.stderr.write((r.stdout || '') + (r.stderr || '') + '\n');
    console.error('✗ ' + name + ' FAILED — commit blocked.');
    console.error('  Fix it, bypass once with `git commit --no-verify`, or disable with `npm run hooks:off`.');
    process.exit(1);
  }
  console.log('✓ ' + name);
}
console.log('tomeroam pre-commit checks: PASS');
process.exit(0);
