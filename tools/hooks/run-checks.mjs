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
  // being on PATH. `no-mutbak` runs FIRST: an interrupted mutation sweep leaves an APPLIED
  // mutant (a `*.mutbak` backup beside the mutated file), and committing that lands the
  // mutant AND greens a suite that only passes because the mutation is in place — so block
  // before spending time on the rest of the battery (StandardsDocument §4: structure over
  // vigilance; this footgun recurred until mechanized).
  return [
    ['no-mutbak', [join(ROOT, 'tools', 'hooks', 'no-mutbak-check.mjs')]],
    // An UNFINISHED revert/cherry-pick sequence must not be committed. A revert that stops
    // halfway looks exactly like one that finished, and on 2026-08-01 that shipped a change
    // minus its review fixes. Runs early: it is cheap and nothing below it matters if the tree
    // is a half-applied sequence.
    ['no-partial-sequence', [join(ROOT, 'tools', 'hooks', 'no-partial-sequence-check.mjs')]],
    ['stamp', [join(ROOT, 'tools', 'stamp-build.mjs'), '--check']],
    // ...and the same coherence in the INDEX. The check above reads the working tree, which can
    // be self-consistent while the STAGED copies carry a stale number — twice in one session.
    ['staged-stamp', [join(ROOT, 'tools', 'hooks', 'staged-stamp-check.mjs')]],
    ['lint', existsSync(eslint) ? [eslint, 'js', 'sw.js'] : null],
    ['typecheck', existsSync(tsc) ? [tsc, '-p', 'jsconfig.json'] : null],
    ['tests', ['--test', 'test/*.test.js']],
    // A STAGED campaign manifest (Claude/Campaigns/*.json) is a declaration that the stage is
    // done — so it must pass its own stage-gate-check (every required gate has a filed, accepted
    // verdict) before it can land. No-ops when no manifest is staged. (Closes: a "COMPLETE"
    // manifest committed while the build gate's verdict was unfiled.)
    ['campaign-gates', [join(ROOT, 'tools', 'hooks', 'campaign-complete-check.mjs')]],
    // A stage BUILD LOG may not land without a manifest binding it to its gate list. Without a
    // manifest every gate is optional by default and skipping one leaves no trace — Stage A1b
    // reached the build queue never plan-reviewed, under a plan header that claimed otherwise.
    ['stage-manifest', [join(ROOT, 'tools', 'hooks', 'stage-has-manifest-check.mjs')]],
    // The retired product name (a third-party trademark) must not re-enter this
    // PUBLIC repo. Mechanized because it relapsed in a records commit whose own
    // purpose was to remove it — the deploy notes named the old paths in order to
    // say "delete these". Intent is no defence; the token is checked, not trusted.
    ['retired-name', [join(ROOT, 'tools', 'hooks', 'retired-name-check.mjs')]],
    // A device-gate item recorded as OWED must be RUNNABLE — it must name the gesture and the
    // observable. Filed as a bare property it has no instruction, so a gesture gets invented at
    // the moment of asking, and on 2026-08-02 the invented one revealed nothing ("if you abort
    // the swipe into books you won't see the books"). Deriving the gesture at filing time is
    // also what surfaces "there is no such gesture" while it can still change the plan.
    ['device-gate', [join(ROOT, 'tools', 'hooks', 'device-gate-check.mjs')]],
    // A staged change to a file whose bytes reach a DEVICE must bump the build number.
    // `stamp` above proves the three stamped files agree with each other — coherence, not
    // freshness; it is happy when they all agree on a number that no longer describes the
    // tree. On 2026-08-03 a comment-only css/app.css edit landed after the stamp, so the
    // deployed `.304` and the tree's `.304` were two different files under one label, and
    // a device report naming that build would have been unanswerable.
    ['shipping-bump', [join(ROOT, 'tools', 'hooks', 'shipping-change-bumps-check.mjs')]],
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
