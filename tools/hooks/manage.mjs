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

function install() {
  git('config core.hooksPath tools/hooks');
  git('config tomeroam.node "' + process.execPath.replace(/\\/g, '/') + '"');
  git('config tomeroam.hooks true');
  try { chmodSync(join(ROOT, 'tools', 'hooks', 'pre-commit'), 0o755); } catch { /* non-posix fs */ }
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

const cmd = process.argv[2];
const fns = { install, uninstall, on: () => set('true'), off: () => set('false'), status };
if (fns[cmd]) fns[cmd]();
else { console.error('usage: node tools/hooks/manage.mjs install|uninstall|on|off|status'); process.exit(1); }
