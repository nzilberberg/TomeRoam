#!/usr/bin/env node
// campaign-complete-check.mjs — pre-commit gate: a STAGED campaign manifest
// (Claude/Campaigns/*.json) must PASS its own stage-gate-check before it can be committed.
//
// WHY: a campaign manifest is a stage's definition-of-done; committing it is DECLARING the
// stage complete. `stage-gate-check.mjs` already verifies every required gate has a filed,
// accepted verdict — but nothing ran it AT COMMIT TIME, so a "COMPLETE — all gates cleared"
// manifest was committed while a gate's verdict token was still UNFILED (the build gate: the
// verdict lived only in the builder's handoff message, never written into the artifact). The
// pre-commit battery (lint/tests/no-mutbak) passed and let the false completion land. This
// gate closes that: stage a manifest whose gates aren't all cleared → the commit is blocked.
//
// Escape for a legitimately-early manifest commit (defining the DoD before the work is done):
// `git commit --no-verify`, or the tomeroam.hooks toggle.
//
// Dependency-free (node + git). Exit 0 = all staged manifests complete (or none staged);
// exit 1 = a staged manifest has an uncleared gate. Exportable core (checkManifests) so the
// regression test drives it with an explicit file list — no git staging in the test.
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE = process.execPath;
const GATE = join(ROOT, 'tools', 'campaign', 'stage-gate-check.mjs');

// Run stage-gate-check on each manifest path; return { ok, failed: [{file, output}] }.
// repoRoot lets the regression test point the gate at a fixture tree; defaults to ROOT.
export function checkManifests(manifests, repoRoot = ROOT) {
  const failed = [];
  for (const m of manifests) {
    const r = spawnSync(NODE, [GATE, m, repoRoot], { cwd: repoRoot, encoding: 'utf8' });
    if (r.status !== 0) failed.push({ file: m, output: (r.stdout || '') + (r.stderr || '') });
  }
  return { ok: failed.length === 0, failed };
}

// The staged Claude/Campaigns/*.json files, via git. (Empty on any git error — the runner
// has already stripped the GIT_* location vars, so this resolves the repo from cwd.)
export function stagedManifests(repoRoot = ROOT) {
  let out = '';
  try { out = execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: repoRoot, encoding: 'utf8' }); }
  catch { return []; }
  return out.split('\n').map(s => s.trim())
    .filter(f => /^Claude\/Campaigns\/.+\.json$/.test(f))
    .map(f => join(repoRoot, f));
}

function main() {
  const manifests = stagedManifests();
  if (manifests.length === 0) return 0; // no manifest in this commit — nothing to gate
  const { ok, failed } = checkManifests(manifests);
  if (ok) { console.log('✓ campaign-gates (' + manifests.length + ' manifest(s) COMPLETE)'); return 0; }
  console.error('✗ campaign-gates FAILED — a staged campaign manifest has an uncleared gate:');
  for (const f of failed) { console.error('  — ' + f.file); process.stderr.write(f.output + '\n'); }
  console.error('  A committed manifest declares the stage COMPLETE — every required gate must carry a filed, accepted verdict.');
  console.error('  Fix the gate/verdict, or bypass an intentionally-early manifest with `git commit --no-verify`.');
  return 1;
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) process.exit(main());
