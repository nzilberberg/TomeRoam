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

// git exports these "location" vars into a hook's environment, and EVERY child a hook spawns
// inherits them. An ambient GIT_DIR OVERRIDES cwd for repo resolution — so a `git init` /
// `git config` / `git add` that a test runs against a THROWAWAY repo (passing only `{ cwd }`)
// silently operates on the hook's REAL repo instead. That is how a temp-repo git write once
// flipped this repo to core.bare=true and leaked junk into its config. This runner spawns the
// whole test suite as hook children, so it strips the vars ONCE here at the boundary — mutating
// its own process.env, which every child spawned afterwards inherits — and no individual
// git-shelling test can reintroduce the bug by forgetting to sanitize its own child env.
// Standalone (no hook) the vars are unset, so this is a no-op there. This boundary unset is the
// structural belt to tools/mutation-sweep.mjs cleanGitEnv's per-call suspenders: the belt makes
// the whole class impossible; the suspenders still keep a single call correct when it runs
// outside this runner.
export const GIT_LOCATION_VARS = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX',
  'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'];

// Delete the git location vars from `env` (this process's own env by default), returning it.
// Mutating by design: called once on process.env so every child spawned afterwards inherits the
// sanitized environment.
export function stripGitLocationEnv(env = process.env) {
  for (const k of GIT_LOCATION_VARS) delete env[k];
  return env;
}

const gitcfg = (k) => { try { return execSync('git config --get ' + k, { cwd: ROOT }).toString().trim(); } catch { return ''; } };

// The default FAST battery. Each step is [name, args|null]; args run as `NODE <args>` from ROOT.
// A tool that isn't installed is skipped with a note (CI is the backstop), never a silent pass.
function defaultSteps() {
  const eslint = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
  const tsc = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  // Each step is invoked with THIS node (portable-safe) — no dependency on npm/eslint/tsc
  // being on PATH.
  return [
    ['stamp', [join(ROOT, 'tools', 'stamp-build.mjs'), '--check']],
    ['lint', existsSync(eslint) ? [eslint, 'js', 'sw.js'] : null],
    ['typecheck', existsSync(tsc) ? [tsc, '-p', 'jsconfig.json'] : null],
    ['tests', ['--test', 'test/*.test.js']],
  ];
}

// Run the checks. With no argument it runs the default battery, gated by the tomeroam.hooks
// toggle. `opts.steps` overrides the battery and is used by this runner's own regression test to
// drive a single probe step through the SAME hardened boundary; the toggle governs only the
// default battery, so an injected step list always runs. Returns the process exit code (0 = pass,
// 1 = a check failed).
export function runChecks({ steps } = {}) {
  // Boundary belt — sanitize the environment ONCE, before reading git config or spawning any
  // child. From here on every git (this runner's and every child's) resolves its repo from cwd.
  stripGitLocationEnv(process.env);

  if (!steps) {
    const toggle = gitcfg('tomeroam.hooks');
    if (toggle === 'false' || toggle === 'off') {
      console.log('tomeroam pre-commit checks: OFF (git config tomeroam.hooks=' + toggle + '). Re-enable: npm run hooks:on');
      return 0;
    }
    steps = defaultSteps();
  }

  for (const [name, args] of steps) {
    if (!args) { console.log('· ' + name + ' skipped (tool not installed locally — CI enforces it)'); continue; }
    const r = spawnSync(NODE, args, { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) {
      process.stderr.write((r.stdout || '') + (r.stderr || '') + '\n');
      console.error('✗ ' + name + ' FAILED — commit blocked.');
      console.error('  Fix it, bypass once with `git commit --no-verify`, or disable with `npm run hooks:off`.');
      return 1;
    }
    console.log('✓ ' + name);
  }
  console.log('tomeroam pre-commit checks: PASS');
  return 0;
}

// CLI entry — importing this module (e.g. from its regression test) must NOT run the battery.
const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) process.exit(runChecks());
