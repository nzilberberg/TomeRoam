#!/usr/bin/env node
// no-mutbak-check.mjs — FAIL the pre-commit battery if any `*.mutbak` file exists in the
// working tree. A `*.mutbak` is the pristine backup tools/mutate.mjs writes before it
// applies a deliberate defect; its presence means a mutation is STILL APPLIED — the sweep
// was interrupted (Ctrl-C, a kill, a crash) before its `--restore` ran, so the tree is
// carrying a mutant. Committing then would land the mutant's source AND, worse, green a
// suite that only passes because the mutation is in place.
//
// This mechanizes a footgun that recurred: a backgrounded mutation-sweep interrupted
// mid-run leaves a `.mutbak` next to the mutated file, and nothing structural caught it —
// only vigilance did, and vigilance failed. This gate makes the interrupted-sweep state
// un-committable (StandardsDocument §4: prefer a structure over a discipline).
//
// Recovery when this blocks: run `node tools/mutate.mjs --restore` (restores every backed-up
// file and deletes the `.mutbak`s), then re-run the commit.
//
//   node tools/hooks/no-mutbak-check.mjs        # exit 1 if any *.mutbak exists, else 0
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Directories that never hold a sweep artifact and are large enough that walking them is
// pure waste — skipped by name at every level.
const SKIP_DIRS = new Set(['node_modules', '.git']);

// Every `*.mutbak` under `root`, as repo-relative POSIX paths. Pure (no process exit, no
// logging) so a test can drive it against a throwaway tree. Recurses with an explicit stack
// rather than recursion so a deep tree cannot blow the call stack.
export function findMutbaks(root = ROOT) {
  const found = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }   // an unreadable dir is not a mutbak; do not fail the scan over it
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(join(dir, e.name));
      } else if (e.isFile() && e.name.endsWith('.mutbak')) {
        found.push(relative(root, join(dir, e.name)).split(sep).join('/'));
      }
    }
  }
  return found.sort();
}

// CLI — importing this module (e.g. from its regression test) must NOT exit the process.
const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {
  const mutbaks = findMutbaks();
  if (mutbaks.length) {
    console.error('✗ no-mutbak: an interrupted mutation sweep left an APPLIED mutant in the tree:');
    for (const m of mutbaks) console.error('    ' + m);
    console.error('  Restore it before committing:  node tools/mutate.mjs --restore');
    process.exit(1);
  }
  process.exit(0);
}
