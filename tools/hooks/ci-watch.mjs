#!/usr/bin/env node
// PostToolUse(Bash) hook — after a `git push`, watch the resulting CI run to completion
// and SURFACE the verdict without anyone asking:
//   * CI red   -> exit 2, which (with asyncRewake) WAKES the model with the failing jobs,
//                 so it pulls the log and reports/fixes instead of declaring success.
//   * CI green -> a systemMessage to the user, exit 0 (no model turn spent).
//   * not a push / no gh / run not found -> exit 0 silently (never nag, never block a commit).
//
// This is the gate behind "verify CI after every push" — the harness runs it on every push,
// so it does not depend on the model remembering to. Configured in .claude/settings.json.
import fs from 'node:fs';
import { spawnSync, execSync } from 'node:child_process';

const REPO = 'nzilberberg/TomeRoam';
const sleep = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { const e = Date.now() + ms; while (Date.now() < e); } };

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const cmd = input?.tool_input?.command || '';
if (!/\bgit\s+push\b/.test(cmd)) process.exit(0);           // not a push — silent

// Resolve gh (PATH first, then the known WinGet location); if absent, we cannot check.
const GH = (() => {
  const cands = ['gh', 'C:/Users/nzilb/AppData/Local/Microsoft/WinGet/Packages/GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe/bin/gh.exe'];
  for (const c of cands) { const r = spawnSync(c, ['--version'], { encoding: 'utf8' }); if (r.status === 0) return c; }
  return null;
})();
if (!GH) process.exit(0);

let sha = '';
try { sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { process.exit(0); }

// The CI run for the pushed SHA may lag the push by a few seconds — poll up to ~100s.
function findRun() {
  const r = spawnSync(GH, ['run', 'list', '--repo', REPO, '--json', 'databaseId,headSha,workflowName', '--limit', '25'], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  let runs = []; try { runs = JSON.parse(r.stdout); } catch { return null; }
  const m = runs.find((x) => x.headSha === sha && x.workflowName === 'CI');
  return m ? m.databaseId : null;
}
let runId = null;
for (let i = 0; i < 10 && !runId; i++) { runId = findRun(); if (!runId) sleep(10000); }
if (!runId) process.exit(0);   // no CI run for this push (e.g. push failed) — don't block

// Watch to completion (CI's mutation-sweep job is slow; give it 25 min).
spawnSync(GH, ['run', 'watch', String(runId), '--repo', REPO, '--exit-status', '--interval', '30'], { encoding: 'utf8', timeout: 25 * 60 * 1000 });

const view = spawnSync(GH, ['run', 'view', String(runId), '--repo', REPO, '--json', 'displayTitle,conclusion,url,jobs'], { encoding: 'utf8' });
let info = {}; try { info = JSON.parse(view.stdout); } catch {}
const jobs = (info.jobs || []).map((j) => `${j.name}: ${j.conclusion}`).join('; ');
const title = info.displayTitle || '';
const url = info.url || '';

if (info.conclusion === 'success') {
  process.stdout.write(JSON.stringify({ systemMessage: `✅ CI green — ${title} [${jobs}]` }));
  process.exit(0);
}
// Failure (or timeout/unknown): wake the model with the details so it acts.
process.stdout.write(`CI did NOT pass for the push "${title}".\nConclusion: ${info.conclusion || 'unknown'}\nJobs: ${jobs}\n${url}\nPull the failing log: gh run view ${runId} --repo ${REPO} --log-failed`);
process.exit(2);
