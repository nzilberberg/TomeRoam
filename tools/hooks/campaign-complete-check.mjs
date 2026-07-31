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
// DECLARING THE DoD UP FRONT — `"status": "IN_PROGRESS"`. The rule above made the manifest
// committable only at the END of a stage, which defeated its main value: a manifest is the
// stage's gate LIST, and a gate list that arrives after the work cannot stop a gate being
// skipped. It is exactly how Stage A1b of the one-screen-type campaign reached the front of the
// build queue never having been plan-reviewed — that campaign had no manifest at all, so nothing
// bound the stage to its gates. But requiring one at build time was circular under the old rule:
// the build gate cannot be cleared before the build, so the manifest could not be committed
// before the build, so the build could not require it.
//
// So a manifest may declare `"status": "IN_PROGRESS"` and commit freely with its gates uncleared;
// this check enforces completeness only for `"status": "COMPLETE"` or a manifest with no status
// (the pre-existing convention — unchanged, so every existing manifest keeps its meaning).
// Flipping the status to COMPLETE is the act that asserts the stage is done, and THAT is what is
// gated. Pairs with stage-has-manifest-check.mjs, which requires the manifest to exist at build.
//
// Escape for any other early commit: `git commit --no-verify`, or the tomeroam.hooks toggle.
//
// Dependency-free (node + git). Exit 0 = all staged manifests complete (or none staged);
// exit 1 = a staged manifest has an uncleared gate. Exportable core (checkManifests) so the
// regression test drives it with an explicit file list — no git staging in the test.
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE = process.execPath;
const GATE = join(ROOT, 'tools', 'campaign', 'stage-gate-check.mjs');

// Run stage-gate-check on each manifest path; return { ok, failed: [{file, output}] }.
// repoRoot lets the regression test point the gate at a fixture tree; defaults to ROOT.
// A manifest asserting it is done. Absent status = the pre-existing convention (committing IS the
// declaration), so historical manifests are enforced exactly as before. Only the explicit
// IN_PROGRESS opt-out defers enforcement, and an unreadable/!malformed manifest is treated as
// asserting completion — a parse failure must not become a way to skip the check.
export function declaresComplete(manifestPath) {
  let m;
  try { m = JSON.parse(readFileSync(manifestPath, 'utf8')); }
  catch { return true; }
  const s = String(m.status ?? '').trim().toUpperCase();
  return s !== 'IN_PROGRESS';
}

export function checkManifests(manifests, repoRoot = ROOT) {
  const failed = [];
  for (const m of manifests) {
    if (!declaresComplete(m)) continue;      // IN_PROGRESS — the DoD is being declared, not met
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
  // Report the two populations separately: saying "N manifest(s) COMPLETE" when some were skipped
  // as IN_PROGRESS would report a completeness this check did not verify.
  const deferred = manifests.filter((m) => !declaresComplete(m)).length;
  const asserted = manifests.length - deferred;
  if (ok) {
    const parts = [];
    if (asserted) parts.push(asserted + ' COMPLETE');
    if (deferred) parts.push(deferred + ' IN_PROGRESS (gates not yet due)');
    console.log('✓ campaign-gates (' + parts.join(', ') + ')');
    return 0;
  }
  console.error('✗ campaign-gates FAILED — a staged campaign manifest has an uncleared gate:');
  for (const f of failed) { console.error('  — ' + f.file); process.stderr.write(f.output + '\n'); }
  console.error('  A committed manifest declares the stage COMPLETE — every required gate must carry a filed, accepted verdict.');
  console.error('  Fix the gate/verdict, or bypass an intentionally-early manifest with `git commit --no-verify`.');
  return 1;
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) process.exit(main());
