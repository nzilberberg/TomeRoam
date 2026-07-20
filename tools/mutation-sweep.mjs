#!/usr/bin/env node
// mutation-sweep.mjs — apply EVERY mutation in turn and report which ones no test catches.
//
// test/mutation-anchors.test.js is the cheap half: it proves each mutation still
// APPLIES. This is the expensive half: it proves each one is still CAUGHT. A mutation
// that applies cleanly and leaves the suite green marks a guard nothing defends — the
// same false reassurance as an inert test, one level up.
//
//   node tools/mutation-sweep.mjs          # all
//   node tools/mutation-sweep.mjs 3 7      # a subset
//
// Slow by nature (one full suite run per mutation), so it is a CI / on-demand tool,
// not part of `npm test`. ALWAYS restores the working tree, including on Ctrl-C.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;

const run = (args) => spawnSync(NODE, args, { cwd: ROOT, encoding: 'utf8' });
const restore = () => run([path.join('tools', 'mutate.mjs'), '--restore']);

process.on('SIGINT', () => { restore(); process.exit(130); });

const { MUTATIONS } = await import(pathToFileURL(path.join(ROOT, 'tools', 'mutate.mjs')).href);

// SOURCE-TEXT GATES — excluded from the sweep, each with its reason. These assert on
// the TEXT of production files rather than on behaviour, so under any mutation they
// fail BY CONSTRUCTION: the mutation changed the very text they pin. Counting them
// would mark a guard "caught" on evidence that has nothing to do with the guard — a
// FALSE CAUGHT, which is worse than the false UNCAUGHT this sweep already produced
// once. Found when mutation #4 (established benign-alone at .158) suddenly reported
// STALE FLAG, and the only failing test was the anchors meta-test detecting #4 itself.
const SOURCE_TEXT_GATES = {
  'mutation-anchors.test.js': 'asserts every mutation anchor still matches the source; a mutation removes the text it targets, so this fails for EVERY mutation',
  'swipe-model.test.js': 'fingerprints js/app.js regions (end, begin, navTo, nav-relation); a mutation inside one changes the hash by construction',
  'transition-matrix.test.js': 'fingerprints the js/app.js transition-branch region, same reason',
};

function behaviourTests() {
  const dir = path.join(ROOT, 'test');
  const all = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js'));
  // Guard the exclusion list itself: an excuse must not outlive what it excused.
  for (const name of Object.keys(SOURCE_TEXT_GATES)) {
    if (!all.includes(name)) {
      console.error(`SOURCE_TEXT_GATES names ${name}, which no longer exists — remove it`);
      process.exit(2);
    }
  }
  return all.filter((f) => !(f in SOURCE_TEXT_GATES)).map((f) => path.join('test', f));
}

const wanted = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const indices = wanted.length ? wanted : MUTATIONS.map((_, i) => i);

const uncaught = [];
const unapplied = [];
const staleBenign = [];
try {
  for (const i of indices) {
    const applied = run([path.join('tools', 'mutate.mjs'), String(i)]);
    if (applied.status !== 0) {
      unapplied.push(`#${i} ${MUTATIONS[i].name}`);
      console.log(`#${i}  ANCHOR FAILED — ${MUTATIONS[i].name}`);
      restore();
      continue;
    }
    // THE WHOLE SUITE minus the SOURCE-TEXT GATES. This used to name eight files, and
    // the moment mutations were added for a NEW test file the sweep reported five
    // genuinely-defended guards as UNCAUGHT — it was not running the tests that defend
    // them. Same hand-maintained-inventory trap as everywhere else in this repo.
    const res = run(['--test', ...behaviourTests()]);
    // `# TODO` lines are KNOWN-RED tests, expected to fail — they are not evidence that
    // a mutation was caught, and counting them would make every mutation look caught.
    const failures = (res.stdout.match(/^not ok .*$/gm) || [])
      .filter((l) => !/#\s*TODO/i.test(l)).length;
    restore();
    const benign = MUTATIONS[i].benignAlone;
    if (failures === 0 && benign) {
      // Expected: a half of a two-part defect that the app genuinely survives alone.
      console.log(`#${i}  benign alone (expected: ${benign}) — ${MUTATIONS[i].name}`);
    } else if (failures === 0) {
      uncaught.push(`#${i} ${MUTATIONS[i].name}`);
      console.log(`#${i}  UNCAUGHT  <-- no test fails  — ${MUTATIONS[i].name}`);
    } else if (benign) {
      // The excuse outlived what it excused: something now catches this, so the flag
      // is hiding real coverage and must go. Same shape as a stale allowlist entry.
      staleBenign.push(`#${i} ${MUTATIONS[i].name}`);
      console.log(`#${i}  caught (${failures}) but flagged benignAlone — STALE FLAG`);
    } else {
      console.log(`#${i}  caught (${failures} failing) — ${MUTATIONS[i].name}`);
    }
  }
} finally {
  restore();
}

console.log('');
console.log(`swept ${indices.length}: ${uncaught.length} uncaught, `
  + `${unapplied.length} unapplied, ${staleBenign.length} stale flags`);
if (unapplied.length) console.log('UNAPPLIED (anchor rot):\n  ' + unapplied.join('\n  '));
if (uncaught.length) console.log('UNCAUGHT (guard is undefended):\n  ' + uncaught.join('\n  '));
if (staleBenign.length) console.log('STALE benignAlone FLAGS (remove them):\n  ' + staleBenign.join('\n  '));
process.exit(uncaught.length || unapplied.length || staleBenign.length ? 1 : 0);
