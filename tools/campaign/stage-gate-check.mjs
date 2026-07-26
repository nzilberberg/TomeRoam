#!/usr/bin/env node
// stage-gate-check.mjs — completion gate for a persona-scheme campaign stage.
//
// Given a stage manifest (see Claude/Campaigns/*.json), verify that EVERY
// required gate has a filed verdict artifact carrying an accepted verdict, or
// an explicit recorded waiver. Exit non-zero if any required gate is missing or
// unaccepted. This is the cheap, mechanical form of the campaign state machine's
// completion check: it refuses to call a stage "complete" while any gate —
// including the Loki adversary decision — has no filed pass. It removes exactly
// one failure mode: declaring a stage done while having silently skipped a gate.
// It does NOT re-judge each gate; that judgment stays each persona's.
//
//   node tools/campaign/stage-gate-check.mjs Claude/Campaigns/<stage>.json [repoRoot]
//
// Exit 0 = complete; 1 = a required gate not cleared; 2 = usage/manifest error.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const manifestPath = process.argv[2];
if (!manifestPath) { console.error('usage: stage-gate-check.mjs <manifest.json> [repoRoot]'); process.exit(2); }
const root = process.argv[3] || process.cwd();
let manifest;
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
catch (e) { console.error(`cannot read manifest ${manifestPath}: ${e.message}`); process.exit(2); }

function globFiles(glob) {
  const dir = join(root, dirname(glob));
  const rx = new RegExp('^' + basename(glob).replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$');
  let names;
  try { names = readdirSync(dir); } catch { return []; }
  return names.filter(n => rx.test(n)).map(n => join(dir, n));
}

// Prefer the machine-readable verdict block; fall back to an accepted verdict
// token appearing verbatim in prose (covers artifacts filed without the block).
function verdictsIn(file, accept) {
  const txt = readFileSync(file, 'utf8');
  const json = [...txt.matchAll(/"verdict"\s*:\s*"([A-Z_]+)"/g)].map(m => m[1]);
  if (json.length) return json;
  return accept.filter(v => new RegExp('\\b' + v + '\\b').test(txt));
}

const results = [];
for (const g of manifest.gates) {
  if (!g.required) { results.push({ ...g, ok: true, status: 'skipped (not required)' }); continue; }
  if (g.waived)     { results.push({ ...g, ok: true, status: `waived (${g.waived.reason})` }); continue; }
  const files = globFiles(g.verdictArtifactGlob);
  if (files.length === 0) { results.push({ ...g, ok: false, status: `MISSING — no verdict artifact at ${g.verdictArtifactGlob}` }); continue; }
  const found = files.flatMap(f => verdictsIn(f, g.acceptVerdict));
  const hit = found.filter(v => g.acceptVerdict.includes(v));
  results.push(hit.length
    ? { ...g, ok: true, status: `pass (${[...new Set(hit)].join(', ')})` }
    : { ...g, ok: false, status: `FAIL — filed verdict(s) [${found.join(', ') || 'none'}] not in [${g.acceptVerdict.join(', ')}]` });
}

console.log(`Stage-gate check: ${manifest.campaign} (stage ${manifest.stage})`);
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.gate} [${r.owner}] — ${r.status}`);
const bad = results.filter(r => !r.ok);
if (bad.length) { console.error(`\nINCOMPLETE: ${bad.length} gate(s) not cleared → ${bad.map(b => b.gate).join(', ')}`); process.exit(1); }
console.log('\nCOMPLETE: every required gate has a filed, accepted verdict.');
