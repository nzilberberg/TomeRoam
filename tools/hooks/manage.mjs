#!/usr/bin/env node
// manage.mjs — install / uninstall / toggle the tomeroam pre-commit hooks. ONE toggle
// (git config tomeroam.hooks) governs BOTH the git hook and the Claude PreToolUse hook.
//
//   node tools/hooks/manage.mjs install    # enable the git hook (sets core.hooksPath) + node path + toggle on
//   node tools/hooks/manage.mjs uninstall  # remove the git hook (unset core.hooksPath)
//   node tools/hooks/manage.mjs on|off     # flip the shared toggle (both hooks respect it)
//   node tools/hooks/manage.mjs status     # show current state
import { execSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (args) => execSync('git ' + args, { cwd: ROOT }).toString().trim();
const tryGit = (args, dflt) => { try { return git(args); } catch { return dflt; } };

// Every git-invoked hook script in tools/hooks. ⚠️ KEEP THIS LIST COMPLETE: a hook git cannot
// EXECUTE is not a hook that fails — it is one that silently never runs, so the thing it guards
// is ungated with no signal at all. (This project has already lost hours to an exec bit dropped
// from a script something invoked as an executable; the mode is checked, not assumed.) The
// authoritative fix is the mode recorded in git's INDEX — tested by hooks-executable in the
// suite — so a fresh clone is gated without anyone remembering to run `install`. This chmod is
// the local belt for a working tree whose mode drifted.
export const HOOK_SCRIPTS = ['pre-commit', 'commit-msg', 'pre-push'];

function install() {
  git('config core.hooksPath tools/hooks');
  git('config tomeroam.node "' + process.execPath.replace(/\\/g, '/') + '"');
  git('config tomeroam.hooks true');
  for (const h of HOOK_SCRIPTS) {
    try { chmodSync(join(ROOT, 'tools', 'hooks', h), 0o755); } catch { /* non-posix fs */ }
  }
  console.log('installed: core.hooksPath=tools/hooks; tomeroam.node recorded; tomeroam.hooks=true');
  console.log('the Claude PreToolUse hook (.claude/settings.json) also respects tomeroam.hooks.');
}
function uninstall() {
  tryGit('config --unset core.hooksPath', '');
  console.log('git hook removed (core.hooksPath unset). The Claude hook stays but respects the toggle;');
  console.log('turn everything off with `npm run hooks:off`.');
}
function set(v) { git('config tomeroam.hooks ' + v); console.log('tomeroam.hooks=' + v + ' (governs BOTH hooks)'); }
function status() {
  console.log('core.hooksPath: ' + tryGit('config --get core.hooksPath', '(unset — git hook not installed)'));
  console.log('tomeroam.hooks: ' + tryGit('config --get tomeroam.hooks', '(unset → default ON)'));
  console.log('tomeroam.node:  ' + tryGit('config --get tomeroam.node', '(unset — hook falls back to `node`)'));
}

// CLI entry — importing this module (e.g. so a test can read HOOK_SCRIPTS as the single source of
// truth for which files git must be able to execute) must NOT run the dispatcher, which would
// exit(1) on the importer. Same guard as run-checks.mjs.
const isCli = process.argv[1]
  && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {
  const cmd = process.argv[2];
  const fns = { install, uninstall, on: () => set('true'), off: () => set('false'), status };
  if (fns[cmd]) fns[cmd]();
  else { console.error('usage: node tools/hooks/manage.mjs install|uninstall|on|off|status'); process.exit(1); }
}
