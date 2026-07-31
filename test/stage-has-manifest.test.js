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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { unboundBuildLogs, buildGlobs, unclearedPreBuildGates } from '../tools/hooks/stage-has-manifest-check.mjs';
import { declaresComplete } from '../tools/hooks/campaign-complete-check.mjs';
import { declaredVerdicts } from '../tools/campaign/stage-gate-check.mjs';

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

// --- the ORDER half: review must precede build -------------------------------------------
// A manifest alone stops a stage having no gate list; it does NOT stop the stage being BUILT
// before its review, because campaign-complete-check only fires when the manifest is flipped to
// COMPLETE — after the fact. Stage A1b was one dispatch from being built on a plan section that
// had never been reviewed; the review then returned TEMPER with six Structural findings.
function orderedRoot(planReviewVerdict) {
  const root = mkdtempSync(join(tmpdir(), 'tr-order-'));
  mkdirSync(join(root, 'Claude', 'Campaigns'), { recursive: true });
  mkdirSync(join(root, 'Claude', 'Charpy'), { recursive: true });
  mkdirSync(join(root, 'Claude', 'Curie'), { recursive: true });
  writeFileSync(join(root, 'Claude', 'Campaigns', 'c.json'), JSON.stringify({
    campaign: 'c', stage: 'A1b', status: 'IN_PROGRESS',
    gates: [
      { gate: 'plan-review', owner: 'charpy', required: true, verdictArtifactGlob: 'Claude/Charpy/PLAN-c-charpy.md', acceptVerdict: ['FORGE'] },
      { gate: 'red-suite', owner: 'curie', required: true, verdictArtifactGlob: 'Claude/Curie/RED-c.md', acceptVerdict: ['RED_SUITE_READY'] },
      { gate: 'build', owner: 'brunel', required: true, verdictArtifactGlob: 'Claude/Brunel/c-build.md', acceptVerdict: ['BUILD_GREEN'] },
      { gate: 'code-review', owner: 'poirot', required: true, verdictArtifactGlob: 'Claude/Poirot/c.md', acceptVerdict: ['SHIP'] },
    ],
  }));
  if (planReviewVerdict) writeFileSync(join(root, 'Claude', 'Charpy', 'PLAN-c-charpy.md'), `VERDICT: ${planReviewVerdict}\n`);
  writeFileSync(join(root, 'Claude', 'Curie', 'RED-c.md'), 'VERDICT: RED_SUITE_READY\n');
  return root;
}

test('THE NEAR-MISS: building with the plan review UNFILED is blocked', () => {
  const root = orderedRoot(null);
  try {
    const early = unclearedPreBuildGates(root, ['Claude/Brunel/c-build.md']);
    assert.equal(early.length, 1);
    assert.deepEqual(early[0].blocking.map((b) => b.gate), ['plan-review']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('building with the plan review filed as TEMPER (not FORGE) is blocked', () => {
  // Exactly what Charpy returned for A1b. A filed-but-unaccepted verdict must not read as cleared.
  const root = orderedRoot('TEMPER');
  try {
    const early = unclearedPreBuildGates(root, ['Claude/Brunel/c-build.md']);
    assert.equal(early.length, 1, 'TEMPER is a filed verdict but not an accepted one');
    assert.match(early[0].blocking[0].status, /TEMPER/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('building after FORGE + RED_SUITE_READY is allowed', () => {
  const root = orderedRoot('FORGE');
  try {
    assert.deepEqual(unclearedPreBuildGates(root, ['Claude/Brunel/c-build.md']), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('post-build gates (code-review) never block the build', () => {
  // They cannot exist yet; treating them as pre-build would deadlock every stage.
  const root = orderedRoot('FORGE');
  try {
    const early = unclearedPreBuildGates(root, ['Claude/Brunel/c-build.md']);
    assert.equal(early.length, 0, 'code-review is unfiled here and must not block');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// --- the verdict READER: the gate the whole scheme rests on ------------------------------
test('THE VACUOUS PASS: a prose mention of an accepted verdict is NOT a verdict', () => {
  // The reader used to accept the token appearing ANYWHERE in the artifact. A reviewer writing
  // the scheme's own phrase "verdict FORGE/TEMPER/SCRAP", or explaining why a plan is not a
  // FORGE, thereby FILED a FORGE. Measured when found: 22 Charpy casebooks contain both FORGE and
  // TEMPER in caps, so the plan-review gate could not fail for those stages.
  assert.deepEqual(declaredVerdicts('Step 1 ("stress this plan; verdict FORGE/TEMPER/SCRAP") is discharged.'), []);
  assert.deepEqual(declaredVerdicts('This is emphatically not a FORGE, and here is why.'), []);
});

test('every declaration form in live use parses', () => {
  // All five are real conventions found in Claude/. Two of them were discovered only by running
  // the reader against the actual artifacts — fixtures alone said it worked when it did not.
  const cases = [
    ['`Verdict: **RED_SUITE_READY**`', ['RED_SUITE_READY'], 'backtick code span'],
    ['Verdict: **BUILD_GREEN** -> Poirot', ['BUILD_GREEN'], 'mixed-case label'],
    ['- **Verdict:** SHIP.', ['SHIP'], 'bold list item'],
    ['VERDICT: HELD_STONE', ['HELD_STONE'], 'caps inline'],
    ['## Verdict\n\n**TEMPER.**\n', ['TEMPER'], 'heading, blank line, bolded token'],
    ['{"verdict": "FORGE"}', ['FORGE'], 'machine-readable block'],
  ];
  for (const [txt, want, label] of cases) assert.deepEqual(declaredVerdicts(txt), want, label);
});

test('THE REAL ARTIFACT: Charpy\'s A1b casebook declares TEMPER, not FORGE', () => {
  // The live file this was found on. It must report the verdict the reviewer actually gave.
  const txt = readFileSync(join(process.cwd(), 'Claude', 'Charpy', 'PLAN-one-screen-type-A1b-charpy.md'), 'utf8');
  assert.deepEqual(declaredVerdicts(txt), ['TEMPER']);
});

test('THE REAL ARTIFACT: every historical manifest still passes its own gate check', () => {
  // The stricter reader must not retroactively fail work that genuinely cleared. Two earlier
  // drafts did exactly that — seven manifests, then three — and only running this caught it.
  const dir = join(process.cwd(), 'Claude', 'Campaigns');
  const gate = join(process.cwd(), 'tools', 'campaign', 'stage-gate-check.mjs');
  for (const n of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const m = JSON.parse(readFileSync(join(dir, n), 'utf8'));
    if (String(m.status ?? '').toUpperCase() === 'IN_PROGRESS') continue;  // gates not yet due
    const r = spawnSync(process.execPath, [gate, join(dir, n), process.cwd()], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${n} regressed:\n${r.stdout}${r.stderr}`);
  }
});

test('THE REAL ARTIFACT: every existing manifest still parses and declares a build gate', () => {
  const globs = buildGlobs(process.cwd());
  assert.ok(globs.length >= 10, `expected the real campaign manifests to be readable, got ${globs.length}`);
  for (const g of globs) assert.match(g.glob, /^Claude\/Brunel\//);
});
