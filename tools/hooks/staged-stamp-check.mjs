#!/usr/bin/env node
// staged-stamp-check.mjs — pre-commit gate: the build stamp must be coherent in what is being
// COMMITTED, not merely in the working tree.
//
// THE INCIDENT, TWICE IN ONE SESSION (2026-08-01). Resolving a revert conflict with
// `git checkout --ours build.json index.html js/debug.js sw.js` STAGES the old stamps. Running
// `tools/stamp-build.mjs` afterwards writes the new number to the WORKING TREE only. The commit
// therefore carried the pre-revert build number while the tree carried the new one — and the
// existing `stamp --check` passed both times, because it reads the working tree, which was
// perfectly self-consistent. It cannot see that the staged copy disagrees.
//
// Shipping a build under a stale number is not cosmetic here: the number is the label the device
// reports, the key the service worker caches under, and the only way to tell which code a device
// is actually running. A device report against the wrong number sends the next hour in the wrong
// direction — which is exactly what happened.
//
// THE RULE. If any of the stamped files is staged, then every stamped file's STAGED content must
// agree with the STAGED build.json. Nothing staged ⇒ nothing to check.
//
// This is deliberately about STAGED content only. `stamp --check` still owns the working tree;
// the two are complements, and the whole lesson is that a working-tree check is blind to the
// index. Note the ordering that avoids the trap entirely: stamp AFTER staging the conflict
// resolution, never before.
//
//   node tools/hooks/staged-stamp-check.mjs   # exit 1 if the staged stamp is incoherent
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The files tools/stamp-build.mjs writes the build into, and how to find the stamp in each.
export const STAMPED = [
  { path: 'sw.js', rx: /const BUILD\s*=\s*'([^']+)'/ },
  { path: 'js/debug.js', rx: /const BUILD\s*=\s*'([^']+)'/ },
  { path: 'index.html', rx: /name="tomeroam-build"\s+content="([^"]+)"/ },
];

const git = (args, cwd = ROOT) => execSync(args, { cwd, encoding: 'utf8' });

// Content of `path` as it is STAGED (empty string when not staged / unreadable).
export function stagedContent(path, cwd = ROOT) {
  try { return git(`git show :${path}`, cwd); } catch { return ''; }
}

export function stagedFiles(cwd = ROOT) {
  try {
    return git('git diff --cached --name-only --diff-filter=ACM', cwd)
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { return []; }
}

// ⚠️ THE DISCRIMINATOR IS STAGED vs WORKING TREE — not staged vs staged.
// A first draft of this compared the staged copies to each other. That would have passed the
// incident it was written for: `git checkout --ours` staged ALL FOUR files at the same OLD
// number, so the index was perfectly self-consistent — just not the number the tree had, and not
// the number anyone intended to ship. Caught by writing the fixture instead of trusting the
// design. The question that matters is "am I committing a different build than my tree has?"
//
// Returns null when coherent (or nothing relevant is staged), else a description of the mismatch.
export function checkStaged(cwd = ROOT) {
  const staged = new Set(stagedFiles(cwd));
  const relevant = ['build.json', ...STAMPED.map((s) => s.path)].filter((p) => staged.has(p));
  if (relevant.length === 0) return null;                   // nothing stamped is being committed

  const readTree = (p) => { try { return readFileSync(join(cwd, p), 'utf8'); } catch { return ''; } };
  const numOf = (txt, rx) => { const m = txt.match(rx); return m ? m[1] : null; };
  const buildOf = (txt) => { try { return JSON.parse(txt).build; } catch { return null; } };

  const bad = [];
  if (staged.has('build.json')) {
    const s = buildOf(stagedContent('build.json', cwd));
    const w = buildOf(readTree('build.json'));
    if (s && w && s !== w) bad.push({ path: 'build.json', stagedVal: s, treeVal: w });
  }
  for (const { path, rx } of STAMPED) {
    if (!staged.has(path)) continue;
    const s = numOf(stagedContent(path, cwd), rx);
    const w = numOf(readTree(path), rx);
    if (s && w && s !== w) bad.push({ path, stagedVal: s, treeVal: w });
  }
  if (bad.length === 0) return null;
  return [
    'the STAGED build number differs from the WORKING TREE:',
    ...bad.map((b) => `    ${b.path}  staged=${b.stagedVal}  tree=${b.treeVal}`),
    '  You are about to commit a different build than the one your tree carries.',
  ].join('\n');
}

function main() {
  const problem = checkStaged();
  if (!problem) return 0;
  console.error('✗ staged-stamp FAILED — the build stamp is incoherent in what is being COMMITTED:');
  console.error('  ' + problem);
  console.error('');
  console.error('  The working-tree stamp check passes in this situation and always will — it reads');
  console.error('  the tree, which is self-consistent, and cannot see the index. This has shipped a');
  console.error('  build under a stale number twice in one session.');
  console.error('');
  console.error('  Usual cause: a conflict resolved with `git checkout --ours <stamped files>`,');
  console.error('  which STAGES the old stamps, followed by a re-stamp that only touches the tree.');
  console.error('  Fix: re-run `node tools/stamp-build.mjs`, then `git add` the stamped files.');
  console.error('  Better: stamp AFTER staging the conflict resolution, never before.');
  return 1;
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) process.exit(main());
