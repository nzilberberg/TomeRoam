// Regression gate for the pre-commit RUNNER's boundary git-env unset (tools/hooks/run-checks.mjs).
//
// git runs hooks with GIT_DIR/GIT_INDEX_FILE exported, and every child a hook spawns inherits
// them; an ambient GIT_DIR OVERRIDES cwd, so a throwaway-repo `git config`/`git init` a test runs
// escapes to the REAL repo (that is what once flipped this repo to bare=true and leaked junk into
// its config). tools/mutation-sweep.mjs cleanGitEnv fixes this per-call — the suspenders. This
// runner strips the vars ONCE at the boundary before spawning the suite — the structural belt, so
// a FUTURE git-shelling test that forgets to sanitize its own child env still cannot corrupt the
// real repo. This test guards that belt.
//
// It is self-validating: the TREATMENT drives a naive git-write probe through the runner's actual
// boundary (runChecks) under a poisoned ambient GIT_DIR and asserts the ambient repo stays
// pristine; the CONTROL runs the SAME naive probe WITHOUT the boundary and asserts it DID hijack
// the ambient repo — proving the poison is real and the belt is the only thing preventing it.
// Delete the boundary `stripGitLocationEnv(process.env)` line from runChecks and the treatment's
// "ambient untouched" assertion turns red. All repos here are throwaways under os.tmpdir().
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

// run-checks.mjs is ESM; load it via dynamic import. Its isCli guard means importing it does NOT
// run the check battery — only runChecks()/stripGitLocationEnv() become available.
const load = () => import(pathToFileURL(path.join(ROOT, 'tools', 'hooks', 'run-checks.mjs')).href);

const NODE = process.execPath;

// A real git is required to reproduce the corruption; its absence skips (not fails).
let hasGit = true;
try { execFileSync('git', ['--version'], { stdio: 'ignore' }); } catch { hasGit = false; }

test('run-checks strips git location vars at the boundary — an injected git-shelling step cannot hijack an ambient GIT_DIR (guards the pre-commit corruption)', { skip: !hasGit }, async () => {
  const { runChecks, stripGitLocationEnv, GIT_LOCATION_VARS } = await load();

  const ambient = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-rc-ambient-')); // stands in for the hook's REAL repo
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-rc-work-'));       // the throwaway repo a "future test" operates on
  const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-rc-probe-'));

  // Setup git runs with a stripped env so it is hermetic regardless of the ambient hook env this
  // suite may itself be running under. Reads use a stripped env + explicit cwd for the same reason.
  const setup = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'pipe', env: stripGitLocationEnv({ ...process.env }) });
  const emailOf = (repo) => execFileSync('git', ['config', '--local', '--get', 'user.email'],
    { cwd: repo, stdio: 'pipe', env: stripGitLocationEnv({ ...process.env }) }).toString().trim();

  // The probe is a NAIVE git-shelling step — it does NOT sanitize its own child env, exactly like a
  // future test that forgot to call cleanGitEnv. Whether its write lands in `work` or hijacks the
  // ambient repo is decided entirely by whether the env it inherits still carries GIT_DIR.
  const probePath = path.join(probeDir, 'probe.mjs');
  fs.writeFileSync(probePath,
    "import { execFileSync } from 'node:child_process';\n" +
    "execFileSync('git', ['config', 'user.email', 'probe@wrote'], { cwd: process.argv[2], stdio: 'pipe' });\n");

  const saved = {};
  for (const k of GIT_LOCATION_VARS) saved[k] = process.env[k];
  try {
    setup(ambient, 'init', '-q');
    setup(ambient, 'config', 'user.email', 'real@real.real');
    setup(work, 'init', '-q');
    setup(work, 'config', 'user.email', 'work@work.work');

    // Poison the environment exactly as `git` does when it invokes a hook — set ALL seven location
    // vars at the ambient repo, so any git that inherits them ignores cwd and operates on `ambient`
    // (GIT_DIR is the vector that actually hijacks; the rest are set so the "was stripped" check
    // below is non-vacuous for every var the belt claims to clear).
    const ag = path.join(ambient, '.git');
    const poison = () => {
      process.env.GIT_DIR = ag;
      process.env.GIT_INDEX_FILE = path.join(ag, 'index');
      process.env.GIT_WORK_TREE = ambient;
      process.env.GIT_PREFIX = '';
      process.env.GIT_COMMON_DIR = ag;
      process.env.GIT_OBJECT_DIRECTORY = path.join(ag, 'objects');
      process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES = path.join(ag, 'objects');
    };

    // TREATMENT — drive the naive probe through the runner's real boundary. runChecks strips the
    // location vars from process.env ONCE before spawning, so the probe inherits a clean env and
    // its write lands in `work`; the ambient repo is untouched.
    poison();
    const code = runChecks({ steps: [['probe', [probePath, work]]] });
    assert.equal(code, 0, 'the injected probe step ran and passed through runChecks');
    assert.equal(emailOf(ambient), 'real@real.real',
      'the ambient repo is UNTOUCHED — runChecks stripped the location vars before spawning the probe (this reddens first if the boundary unset is removed)');
    assert.equal(emailOf(work), 'probe@wrote',
      'the probe write landed in the cwd work repo — the boundary belt cleaned the spawned env');
    // The belt is a mutation of this process's own env — after the boundary ran, EVERY location var
    // is gone from the runner's process too, so nothing downstream can re-leak them. Non-vacuous:
    // poison() set all seven above.
    for (const k of GIT_LOCATION_VARS) assert.equal(process.env[k], undefined, `${k} was stripped from the runner env`);

    // CONTROL — the SAME naive probe with NO boundary (a future test under a runner that stopped
    // stripping). It inherits the poisoned env and MUST hijack the ambient repo, proving the
    // scenario is real and that the belt is what prevents it.
    poison();
    execFileSync(NODE, [probePath, work], { stdio: 'pipe' });
    assert.equal(emailOf(ambient), 'probe@wrote',
      'control: the naive spawn WITHOUT the boundary belt DID hijack the ambient repo (scenario is real)');
  } finally {
    for (const k of GIT_LOCATION_VARS) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
    fs.rmSync(ambient, { recursive: true, force: true });
    fs.rmSync(work, { recursive: true, force: true });
    fs.rmSync(probeDir, { recursive: true, force: true });
  }
});
