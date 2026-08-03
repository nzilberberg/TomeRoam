#!/usr/bin/env node
// shipping-change-bumps-check.mjs — a staged change to a SHIPPING file must bump the build.
//
// WHY THIS EXISTS. 2026-08-03, found by the user asking a simple question: *"Did you push a
// build to test? My vapor is on 304."* It was on `.304`, and `.304` was the newest number —
// but `css/app.css` had changed AFTER the stamp (a code review's citation fixes, comment-only)
// and nothing bumped. So the deployed `.304` and the `.304` in the tree were two different
// files wearing one label. Nothing misbehaved, because the delta was comments; the defect is
// that the label stopped identifying a tree, which is the build number's entire job. The next
// device report saying "on .304" would have been unanswerable: which .304?
//
// WHY `stamp --check` DID NOT CATCH IT. That check proves the three stamped files agree WITH
// EACH OTHER and with build.json. It is a coherence check, not a freshness check — it is
// perfectly happy when every file agrees on a number that no longer describes the tree. The
// two checks are complementary and this repo only had one of them.
//
// THE RULE (the project's own, from memory `tomeroam-pwa-deploy-rule` and the durable-lessons
// board): a CODE change bumps — code, assets, tests, tooling, refactors, and **in-code comment
// fixes explicitly included**. Docs, plans, casebooks and the `Claude/` records tree do NOT.
// This gate enforces the SHIPPING half of that, which is the half a device can be confused by.
//
//   node tools/hooks/shipping-change-bumps-check.mjs        (staged files; pre-commit)
//   node tools/hooks/shipping-change-bumps-check.mjs --against <ref> [files...]   (testing)
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// git exports GIT_DIR and friends into every hook child; an ambient GIT_DIR overrides cwd, so
// a shelled git would read the WRONG repo. Same boundary the rest of this tooling keeps.
const GIT_LOCATION_VARS = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX',
  'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'];
const cleanEnv = () => { const e = { ...process.env }; for (const k of GIT_LOCATION_VARS) delete e[k]; return e; };
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', env: cleanEnv() });

/**
 * A file whose bytes reach a device. Deliberately NOT "anything outside Claude/": tests and
 * tooling are code by the project rule but they never ship, and a device report cannot be
 * confused by them — gating those too would fire on every records-adjacent commit and get the
 * hook switched off, which is how this project has lost gates before.
 */
export const isShipping = (p) => {
  const f = p.replace(/\\/g, '/');
  if (f.startsWith('Claude/') || f.startsWith('test/') || f.startsWith('tools/')) return false;
  return /^(js|css|img|icons|fonts)\//.test(f)
    || /^(index\.html|sw\.js|manifest\.webmanifest|offline\.html)$/.test(f);
};

/** The three files the stamper WRITES. Their change is the bump, never evidence of one. */
const STAMPED = new Set(['sw.js', 'js/debug.js', 'index.html']);

/**
 * THE RULE, as a pure function — so it can be tested against the real incident's inputs
 * instead of against whatever the working tree happens to hold.
 *
 * ⛔ The first draft of this file had no such seam: its only test path re-read the LIVE
 * build.json, which had already been bumped, so the replay of the real incident exited 0
 * and the gate looked green while proving nothing. A checker whose test path shares state
 * with the thing under test cannot witness a failure. That is the exact vacuity class this
 * repo keeps paying for, reproduced inside the gate written to close a different one.
 *
 * @param {{changed: string[], before: string|null, after: string|null}} o
 * @returns {string[]} offending shipping paths; empty means clean.
 */
export function judge({ changed, before, after }) {
  const shipping = (changed || []).filter(isShipping);
  // A commit that ONLY restamps (the three stamped files) IS the bump, not evidence of one.
  const substantive = shipping.filter((f) => !STAMPED.has(f.replace(/\\/g, '/')));
  if (!substantive.length) return [];
  if (before === null || before === undefined) return [];   // no baseline — cannot judge
  if (after && after !== before) return [];                 // bumped: clean
  return substantive;
}

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };

const buildOf = (text) => { try { return JSON.parse(text).build; } catch { return null; } };
const showBuild = (rev) => { try { return buildOf(git(['show', `${rev}:build.json`])); } catch { return null; } };

let changed; let before; let after;
const range = flag('--range');            // e.g. --range 1c0b62a..b55fef9   (audit an old commit)
if (range) {
  const [a, b] = range.split('..');
  changed = git(['diff', '--name-only', a, b]).split(/\r?\n/).filter(Boolean);
  before = showBuild(a);
  after = showBuild(b);
} else {
  changed = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split(/\r?\n/).filter(Boolean);
  before = showBuild('HEAD');
  after = (() => {
    try { return buildOf(git(['show', ':build.json'])); } catch { /* not staged */ }
    return existsSync(join(ROOT, 'build.json')) ? buildOf(readFileSync(join(ROOT, 'build.json'), 'utf8')) : null;
  })();
}

const offenders = judge({ changed, before, after });
if (!offenders.length) process.exit(0);

console.error('shipping-change-bumps: a SHIPPING file changed but the build number did not.\n');
for (const f of offenders) console.error('  ✗ ' + f);
console.error(`
  build.json: ${before} -> ${after || '(unreadable)'}   (unchanged)

These files' bytes reach a device, so after this commit TWO DIFFERENT TREES would both
call themselves "${before}". A device report naming that build becomes unanswerable, and
the build number stops identifying anything — which is its entire job.

This project's rule is that a CODE change bumps, and it names in-code COMMENT fixes
explicitly: the 2026-08-03 incident was exactly that, a comment-only edit to css/app.css
landing after the stamp. Nothing misbehaved; the label simply stopped being true.

Bump it:
    edit build.json's "build", then:  node tools/stamp-build.mjs

(\`stamp --check\` will not catch this — it proves the three stamped files agree with each
other, which they happily do on a number that no longer describes the tree.)`);
process.exit(1);
