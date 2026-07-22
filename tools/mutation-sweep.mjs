#!/usr/bin/env node
// mutation-sweep.mjs — apply EVERY mutation in turn and report which ones no test catches.
//
// test/mutation-anchors.test.js is the cheap half: it proves each mutation still
// APPLIES. This is the expensive half: it proves each one is still CAUGHT. A mutation
// that applies cleanly and leaves the suite green marks a guard nothing defends — the
// same false reassurance as an inert test, one level up.
//
//   node tools/mutation-sweep.mjs             # all
//   node tools/mutation-sweep.mjs 3 7         # a subset by index
//   node tools/mutation-sweep.mjs --affected  # only mutations whose TARGET file changed vs
//                                             # HEAD — a fast local pre-check. It prints what
//                                             # it does NOT cover; CI runs the full sweep.
//
// Slow by nature (one full suite run per mutation), so it is a CI / on-demand tool,
// not part of `npm test`. ALWAYS restores the working tree, including on Ctrl-C.
//
// The pure helpers below (parseChangedFiles / changedFiles / targetsOf / affectedIndices)
// are exported and unit-tested in test/mutation-sweep-select.test.js. The sweep itself
// runs only when this file is executed directly (the isCli guard at the bottom), so a
// test importing the helpers does not launch a sweep as a side effect.
import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;

// The mutation registry. Imported at module load — mutate.mjs guards its CLI, so this
// import has no side effect (it does not touch the working tree).
const { MUTATIONS, DEFAULT_FILE } = await import(pathToFileURL(path.join(ROOT, 'tools', 'mutate.mjs')).href);

// ── Pure, exported helpers — no side effects, unit-tested ────────────────────────────

// Parse the output of `git status --porcelain=v1 -z --untracked-files=all` into the set
// of repo-relative paths changed vs HEAD.
//
// The -z format is what makes this parseable rather than a guess: records are NUL-
// delimited and paths are VERBATIM — no surrounding quotes, no octal/backslash escaping
// of odd characters, no ` -> ` arrow. Each record is `XY<space>path`. A rename or copy
// record carries the DESTINATION path; its SOURCE path is the very next bare NUL token
// (no XY prefix). Both sides are returned, because a mutation may target the pre-rename
// path. This replaced a plain-`--porcelain` parser that (1) kept only the rename
// destination, dropping the source; (2) missed new files under a wholly-new untracked
// directory, which the plain format collapses to a single `dir/` entry (fixed by
// --untracked-files=all listing each file); and (3) split on a literal ` -> ` and left
// git's octal escapes undecoded for odd-character names.
export function parseChangedFiles(zOut) {
  const files = new Set();
  const tok = zOut.split('\0');
  for (let i = 0; i < tok.length; i++) {
    const rec = tok[i];
    if (!rec) continue;                 // trailing empty token after the final NUL (or a blank)
    const x = rec[0];                   // index (staged) status letter
    const y = rec[1];                   // worktree status letter
    const p = rec.slice(3);             // records are `XY<space>path`; the path is verbatim
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') {
      // rename/copy in EITHER column (e.g. `mv` + `git add -N` reports it in Y): the source
      // path is the next bare token. Testing only X dropped it — a false-clean (F-y).
      const src = tok[++i];
      if (src) files.add(src);
    }
    files.add(p);
  }
  return files;
}

// Repo-relative paths changed vs HEAD (staged + unstaged + untracked). See
// parseChangedFiles for why the -z / --untracked-files=all form is used. `cwd` is a
// parameter so the parser+command can be exercised against a throwaway repo in tests.
export function changedFiles(cwd = ROOT) {
  const out = execSync('git status --porcelain=v1 -z --untracked-files=all', { cwd }).toString();
  return parseChangedFiles(out);
}

// The file(s) a mutation touches — its own file, plus a two-part `also` mutation's file.
export const targetsOf = (m) => [m.file || DEFAULT_FILE, m.also && (m.also.file || m.file || DEFAULT_FILE)].filter(Boolean);

// Indices of the mutations that target at least one of the changed files.
export function affectedIndices(mutations, changed) {
  return mutations.map((_, i) => i).filter((i) => targetsOf(mutations[i]).some((f) => changed.has(f)));
}

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

// ── The sweep — runs only when executed directly, never on import ────────────────────
const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {

const run = (args) => spawnSync(NODE, args, { cwd: ROOT, encoding: 'utf8' });
const restore = () => run([path.join('tools', 'mutate.mjs'), '--restore']);

process.on('SIGINT', () => { restore(); process.exit(130); });

let indices;
if (process.argv.includes('--affected')) {
  const changed = changedFiles();
  indices = affectedIndices(MUTATIONS, changed);
  const changedTests = [...changed].filter((f) => f.startsWith('test/'));
  console.log(`--affected: ${changed.size} changed file(s); ${indices.length} of ${MUTATIONS.length} mutation(s) target them.`);
  // §4.20 — a partial run must NOT read as complete. State exactly what it does not cover.
  console.log('NOT covered locally: mutations whose target file is unchanged.'
    + (changedTests.length
      ? ' A changed TEST can make a mutation in an UNCHANGED file go inert — only the FULL'
        + ' sweep (no args) or CI catches that.'
      : '')
    + ' CI runs the full sweep on every push.');
  if (!indices.length) { console.log('No affected mutations — nothing to sweep locally.'); process.exit(0); }
} else {
  const wanted = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
  indices = wanted.length ? wanted : MUTATIONS.map((_, i) => i);
}

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

}   // end isCli guard
