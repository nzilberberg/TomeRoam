// stage-has-manifest.test.js — a stage build log may not land without a manifest binding it to
// its gate list, and a manifest may declare its DoD up front without asserting completion.
//
// THE INCIDENT (2026-07-31, caught before it shipped). Stage A1b of the one-screen-type campaign
// reached the front of the build queue never having been plan-reviewed. Charpy's review of that
// plan is e979a41 (07-30); §5.3 Stage A1b was added afterwards in 8e9b4b6 (07-31); the plan header
// still read "PLAN_READY — reviewed (TEMPER)". The stale header was believable because NOTHING
// bound the stage to a gate list — that campaign had no manifest at all. stage-gate-check.mjs
// enforces a manifest's gates faithfully, but can only enforce a manifest that exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { unboundBuildLogs, buildGlobs } from '../tools/hooks/stage-has-manifest-check.mjs';
import { declaresComplete } from '../tools/hooks/campaign-complete-check.mjs';

// A fixture repo root holding only Claude/Campaigns manifests. The staged-file list is injected
// rather than produced by git staging — the git plumbing is shared with campaign-complete-check
// and already covered there; what is under test here is the BINDING between log and manifest.
function makeRoot(manifests) {
  const root = mkdtempSync(join(tmpdir(), 'tr-manifest-'));
  mkdirSync(join(root, 'Claude', 'Campaigns'), { recursive: true });
  for (const [name, obj] of Object.entries(manifests)) {
    writeFileSync(join(root, 'Claude', 'Campaigns', name), JSON.stringify(obj, null, 2));
  }
  return root;
}
const withBuildGate = (glob) => ({ campaign: 'x', gates: [{ gate: 'build', owner: 'brunel', required: true, verdictArtifactGlob: glob, acceptVerdict: ['BUILD_GREEN'] }] });

test('THE INCIDENT: a build log with no manifest anywhere is UNBOUND', () => {
  const root = makeRoot({});
  try {
    const unbound = unboundBuildLogs(root, ['Claude/Brunel/one-screen-type-stageA1b-build.md']);
    assert.deepEqual(unbound, ['Claude/Brunel/one-screen-type-stageA1b-build.md']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a manifest whose build glob matches BINDS the log', () => {
  const root = makeRoot({ 'one-screen-type.json': withBuildGate('Claude/Brunel/one-screen-type-*-build.md') });
  try {
    assert.deepEqual(unboundBuildLogs(root, ['Claude/Brunel/one-screen-type-stageA1b-build.md']), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('ANOTHER campaign\'s manifest does not bind this stage', () => {
  // The whole value is the binding being specific. A wildcard that swallowed foreign campaigns
  // would restore exactly the "every gate optional by default" state this gate removes.
  const root = makeRoot({ 'swipe-stage6i.json': withBuildGate('Claude/Brunel/swipe-stage6i-*.md') });
  try {
    assert.deepEqual(unboundBuildLogs(root, ['Claude/Brunel/one-screen-type-stageA1b-build.md']),
      ['Claude/Brunel/one-screen-type-stageA1b-build.md']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a glob in a DIFFERENT directory does not bind, even if the basename matches', () => {
  const root = makeRoot({ 'x.json': withBuildGate('Claude/Poirot/one-screen-type-stageA1b-build.md') });
  try {
    assert.equal(unboundBuildLogs(root, ['Claude/Brunel/one-screen-type-stageA1b-build.md']).length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a non-build Brunel artifact is out of scope', () => {
  // *-apply.md / *-holddiag.md / dated notes are builder working notes, not stage builds. Firing
  // on those would make the gate noise, and a noisy gate gets switched off.
  const root = makeRoot({});
  try {
    assert.deepEqual(unboundBuildLogs(root, ['Claude/Brunel/swipe-stage6g-apply.md']), [],
      'only *-build.md is a stage build log');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a malformed manifest cannot bind anything (and does not crash the scan)', () => {
  const root = makeRoot({});
  writeFileSync(join(root, 'Claude', 'Campaigns', 'broken.json'), '{ not json');
  try {
    assert.deepEqual(buildGlobs(root), []);
    assert.equal(unboundBuildLogs(root, ['Claude/Brunel/a-build.md']).length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('declaresComplete: IN_PROGRESS defers, absent/COMPLETE asserts', () => {
  const root = mkdtempSync(join(tmpdir(), 'tr-status-'));
  const w = (name, obj) => { const p = join(root, name); writeFileSync(p, JSON.stringify(obj)); return p; };
  try {
    // Absent status is the PRE-EXISTING convention — committing is the declaration. Every
    // historical manifest relies on it, so it must keep asserting completion.
    assert.equal(declaresComplete(w('a.json', { campaign: 'x' })), true, 'absent status still asserts');
    assert.equal(declaresComplete(w('b.json', { status: 'COMPLETE' })), true);
    assert.equal(declaresComplete(w('c.json', { status: 'in_progress' })), false, 'case-insensitive');
    assert.equal(declaresComplete(w('d.json', { status: ' IN_PROGRESS ' })), false, 'trimmed');
    // A parse failure must not become a way to skip the completeness check.
    const bad = join(root, 'e.json'); writeFileSync(bad, '{ nope');
    assert.equal(declaresComplete(bad), true, 'unreadable manifest is treated as asserting COMPLETE');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('THE REAL ARTIFACT: every existing manifest still parses and declares a build gate', () => {
  const globs = buildGlobs(process.cwd());
  assert.ok(globs.length >= 10, `expected the real campaign manifests to be readable, got ${globs.length}`);
  for (const g of globs) assert.match(g.glob, /^Claude\/Brunel\//);
});
