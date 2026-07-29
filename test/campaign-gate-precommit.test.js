// Regression test for tools/hooks/campaign-complete-check.mjs — the pre-commit gate that blocks
// committing a campaign manifest whose stage-gate-check does not pass (every required gate must
// carry a filed, accepted verdict). Proves the gate FAILS on an incomplete manifest and PASSES on
// a complete one, including the real Claude/Campaigns/ manifest. Uses temp fixtures + the exported
// core (checkManifests) so no git staging is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { checkManifests } from '../tools/hooks/campaign-complete-check.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'campgate-'));
  mkdirSync(join(root, 'Claude', 'Campaigns'), { recursive: true });
  mkdirSync(join(root, 'Claude', 'Loki'), { recursive: true });
  return root;
}
const manifest = (root, name, gates) => {
  const p = join(root, 'Claude', 'Campaigns', name);
  writeFileSync(p, JSON.stringify({ campaign: 't', stage: 't', gates }, null, 2));
  return p;
};

test('campaign-gate: FAILS on a manifest whose required gate has NO filed artifact', () => {
  const root = fixtureRoot();
  try {
    const m = manifest(root, 'incomplete.json', [
      { gate: 'adversary', owner: 'loki', required: true,
        verdictArtifactGlob: 'Claude/Loki/STRIKE-nope.md', acceptVerdict: ['HELD_STONE'] },
    ]);
    const { ok, failed } = checkManifests([m], root);
    assert.equal(ok, false, 'must fail — the artifact does not exist');
    assert.equal(failed.length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('campaign-gate: FAILS on a filed-but-UNACCEPTED verdict (the exact real bug: token unfiled/wrong)', () => {
  const root = fixtureRoot();
  try {
    writeFileSync(join(root, 'Claude', 'Loki', 'STRIKE-x.md'), '# strike\n\n(no verdict token filed)\n');
    const m = manifest(root, 'unfiled.json', [
      { gate: 'adversary', owner: 'loki', required: true,
        verdictArtifactGlob: 'Claude/Loki/STRIKE-x.md', acceptVerdict: ['HELD_STONE'] },
    ]);
    assert.equal(checkManifests([m], root).ok, false, 'must fail — artifact exists but no accepted verdict');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('campaign-gate: PASSES when the required gate carries a filed, accepted verdict', () => {
  const root = fixtureRoot();
  try {
    writeFileSync(join(root, 'Claude', 'Loki', 'STRIKE-ok.md'), '# strike\n\nVERDICT: HELD_STONE\n');
    const m = manifest(root, 'complete.json', [
      { gate: 'adversary', owner: 'loki', required: true,
        verdictArtifactGlob: 'Claude/Loki/STRIKE-ok.md', acceptVerdict: ['HELD_STONE'] },
    ]);
    assert.equal(checkManifests([m], root).ok, true, 'must pass — verdict filed + accepted');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('campaign-gate: PASSES on every REAL Claude/Campaigns manifest (they are all complete)', () => {
  const dir = join(REPO, 'Claude', 'Campaigns');
  const real = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f));
  assert.ok(real.length > 0, 'expected real campaign manifests to exist');
  const { ok, failed } = checkManifests(real, REPO);
  assert.equal(ok, true, 'real manifests must all pass: ' + failed.map(f => f.file).join(', '));
});
