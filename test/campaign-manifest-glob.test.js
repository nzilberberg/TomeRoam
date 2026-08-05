// GATE — every campaign manifest's verdictArtifactGlob must carry a wildcard, so a LATER
// ROUND of a verdict artifact can be seen at all.
//
// THE DEFECT, measured 2026-08-03. `stage-gate-check.mjs`'s `globFiles` compiles a
// wildcard-free glob to an exact-filename anchor:
//
//   'Claude/Mendeleev/AUDIT-one-screen-type-a1b.md' -> /^AUDIT-one-screen-type-a1b\.md$/
//        AUDIT-one-screen-type-a1b.md      MATCH
//        AUDIT-one-screen-type-a1b-r2.md   NO MATCH
//
// `artifactsOfRecord` picks the highest `-rN` round, but only from what the glob already
// matched — so it never sees r2, and the gate reports round 1's verdict FOREVER. On A1b
// that meant a filed ADEQUATE was invisible while a superseded GAPS_NAMED kept the stage
// blocked. The failure is silent and it points the wrong way at exactly the moment a
// re-review matters: a stage that has been fixed still reads as broken, and the obvious
// "fix" is to weaken the acceptance list.
//
// This is the same class as `3c89349`, which repaired the `plan-review` glob on one
// manifest. Nobody swept the rest. The sweep this test replaces found **29 wildcard-free
// globs across 13 manifests** — including one campaign where all six gates were affected.
// A one-off repair does not close a class; a gate does.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

const DIR = path.join(ROOT, 'Claude', 'Campaigns');

/** Every (file, gate, glob) triple declared across the campaign manifests. */
function declaredGlobs() {
  const out = [];
  for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    for (const g of j.gates || []) {
      if (typeof g.verdictArtifactGlob === 'string') out.push({ file: f, gate: g.gate, glob: g.verdictArtifactGlob });
    }
  }
  return out;
}

/** The rule, isolated so it can be tested against a known-bad value as well as the tree. */
const seesLaterRounds = (glob) => glob.includes('*');

test('the rule itself rejects a wildcard-free glob', () => {
  // Without this, a bug that made `seesLaterRounds` always true would leave the suite
  // green while gating nothing — the vacuity this project keeps paying for.
  assert.strictEqual(seesLaterRounds('Claude/Mendeleev/AUDIT-one-screen-type-a1b.md'), false,
    'the rule accepted the exact glob that hid a filed ADEQUATE — this gate would be vacuous');
  assert.strictEqual(seesLaterRounds('Claude/Mendeleev/AUDIT-one-screen-type-a1b*.md'), true);
});

test('the manifest set is non-empty and parses — otherwise this gate is vacuous', () => {
  const all = declaredGlobs();
  assert.ok(all.length >= 6,
    `only ${all.length} globs found under ${DIR} — the gate is scanning nothing`);
});

test('every verdictArtifactGlob can see a later round (-rN)', () => {
  const bad = declaredGlobs().filter((g) => !seesLaterRounds(g.glob));
  assert.deepStrictEqual(bad, [],
    'these globs compile to an EXACT filename, so a `-r2` verdict artifact is invisible to '
    + 'the gate and the stage reports its FIRST round forever:\n'
    + bad.map((g) => `  ${g.file} [${g.gate}] ${g.glob}`).join('\n')
    + '\nAdd a `*` before the extension, e.g. `…/AUDIT-thing*.md`.');
});

test('a widened glob still anchors to its own stage, not to a sibling', () => {
  // The cheap fix would be to widen so far that one stage's glob matches another stage's
  // artifact — trading a silent miss for a silent wrong-match, which is worse.
  //
  // What must NOT be asserted here: that the wildcard cannot LEAD. `Claude/Poirot/
  // *swipe-declone-stage2*.md` is a shipped, correct pattern — the leading `*` absorbs a
  // filename prefix (`POIROT-`) while the stem still names one stage. A first draft of
  // this cell banned it and reddened on the live tree; the rule was wrong, not the tree.
  // The property that actually matters is the STEM: enough literal text to identify one
  // stage. Measured across the current manifests, the shortest legitimate stem is well
  // above this floor.
  for (const { file, gate, glob } of declaredGlobs()) {
    const stem = path.basename(glob).replace(/\*/g, '').replace(/\.md$/, '');
    assert.ok(stem.length >= 8,
      `${file} [${gate}] glob "${glob}" has only ${stem.length} literal characters in its `
      + 'filename stem — too loose to identify one stage\'s artifact, so it can silently '
      + 'accept a sibling stage\'s verdict.');
  }
});

// ── THE CROSS-STAGE GLOB COLLISION, measured 2026-08-05.
//
// The wildcard added above (so a `-rN` round is visible) has a cost: a glob can now match a
// DIFFERENT stage's artifact when one stage name is a strict prefix of another. Measured live —
// `Claude/Mendeleev/AUDIT-swipe-declone-stage2*.md` matched both that stage's audit (ADEQUATE)
// and the subtraction pass's (GAPS_NAMED), and the gate reported `pass (ADEQUATE)`. A stage read
// as clear with an open audit sitting beside it: this project's defining scar, produced by the
// gate meant to prevent it.
//
// The fix has two halves. A rejection is never outvoted by an acceptance — and that comparison is
// made PER FILE and only across stages, because two earlier drafts each cried wolf:
//   per verdict → 14 false positives (a casebook records its own "round 1 TEMPER / round 2 FORGE")
//   per file    →  6 false positives (rounds here are distinguished by commit SHA, not `-rN`,
//                  so `artifactsOfRecord` cannot order them)
//   cross-stage →  0 false positives, 1 true positive, across all thirteen campaigns.
test('isCrossStage separates a prefix collision from two rounds of one review', async () => {
  const { isCrossStage } = await import(
    pathToFileURL(path.join(ROOT, 'tools', 'campaign', 'stage-gate-check.mjs')).href);

  // THE REAL INCIDENT: one stem is a strict prefix of the other — different stages.
  assert.strictEqual(isCrossStage(
    'Claude/Mendeleev/AUDIT-swipe-declone-stage2.md',
    'Claude/Mendeleev/AUDIT-swipe-declone-stage2-subtraction.md'), true);

  // THE FALSE POSITIVE THAT KILLED DRAFT 2: SHA-suffixed rounds of ONE review.
  assert.strictEqual(isCrossStage(
    'Claude/Charpy/PLAN-swipe-stage6d-00874b5.md',
    'Claude/Charpy/PLAN-swipe-stage6d-d3571bf.md'), false,
    'SHA-distinguished rounds of one review must not read as two stages');

  // `-rN` rounds likewise, and a file against itself.
  assert.strictEqual(isCrossStage('a/X-r2.md', 'a/X-r3.md'), false);
  assert.strictEqual(isCrossStage('a/X.md', 'a/X.md'), false);
  // Windows separators must not defeat the stem extraction — `globFiles` returns absolute
  // backslash paths on this platform, so this is the real input shape, not a hypothetical.
  assert.strictEqual(isCrossStage(
    'C:\\repo\\Claude\\Mendeleev\\AUDIT-thing.md',
    'C:\\repo\\Claude\\Mendeleev\\AUDIT-thing-extra.md'), true);
});

test('no campaign manifest has a cross-stage glob collision that greens a rejection', async () => {
  // The live check. A campaign whose glob swallows another stage's artifact must not report a
  // pass — and this asserts over the REAL manifests, so it cannot go vacuously green.
  const { gateResults } = await import(
    pathToFileURL(path.join(ROOT, 'tools', 'campaign', 'stage-gate-check.mjs')).href);
  const files = fs.readdirSync(DIR).filter((x) => x.endsWith('.json'));
  assert.ok(files.length >= 6, 'no manifests found — this gate is scanning nothing');
  for (const f of files) {
    const manifest = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    for (const r of gateResults(manifest, ROOT)) {
      assert.ok(!(r.ok && /AMBIGUOUS/.test(r.status || '')),
        `${f} [${r.gate}] reported OK while ambiguous: ${r.status}`);
    }
  }
});
