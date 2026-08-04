#!/usr/bin/env node
// decisionlog-citation-shift-check.mjs — editing the decision log must not silently
// invalidate the line citations that point INTO it.
//
// THE DEFECT, found in passing 2026-08-03 by the planner while correcting something else.
// `Claude/Decisions/DecisionLog.md` is edited in place (the scheme requires it: an open
// decision is edited to closed, a superseded one is updated to current truth). Any such edit
// that changes a LINE COUNT above other content shifts every line below it — and roughly
// twenty records across the tree cite the log as `DecisionLog.md:1147-1167`. Those citations
// then point at unrelated prose.
//
// It broke with NO error and NO diff in the citing files. Measured after the fact: a plan's
// `:1147-1167` had come to land on `cur.ghostY` text, and `:1157-1158` on a mutation-sweep
// paragraph. The planner corrected eighteen citations in one plan; more remain elsewhere.
//
// WHY A GATE AND NOT A RULE. The failure is invisible at the moment it happens — the author
// edits one file and breaks twenty others with no signal at all. That is precisely the shape
// no amount of care catches, and precisely what a commit-time check can.
//
// WHAT IT DOES. When the staged change to the decision log shifts line numbers, it names the
// LIVE records whose citations point below the shift and are therefore now suspect. It does
// NOT try to repair them — the correct target depends on what each citation meant, which only
// the author knows.
//
// SCOPE — live records only. Casebooks, strikes, audits and probes are HISTORICAL: a citation
// that was true when filed is a record of what was true then, not a claim about HEAD. Gating
// those would fire constantly and get the hook switched off, which is how this project has
// lost gates before. Plans and the board are the authority a future session opens first, so
// those are what must stay true.
//
//   node tools/hooks/decisionlog-citation-shift-check.mjs
//   node tools/hooks/decisionlog-citation-shift-check.mjs --range <a>..<b>
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOG = 'Claude/Decisions/DecisionLog.md';

// An ambient GIT_DIR overrides cwd and would point a shelled git at the WRONG repo.
const GIT_VARS = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX',
  'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'];
const env = () => { const e = { ...process.env }; for (const k of GIT_VARS) delete e[k]; return e; };
const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', env: env() });

/** A record whose citations must describe HEAD, as opposed to a historical artifact. */
export const isLiveRecord = (p) => {
  const f = p.replace(/\\/g, '/');
  if (!f.startsWith('Claude/')) return false;
  if (/\/(Charpy|Poirot|Loki|Mendeleev|Curie|Brunel|Linnaeus|Feynman)\//.test(f)) return false;
  return /\/(Plans)\/|\/Zelda\/Board\.md$/.test(f);
};

/**
 * The earliest line (in the OLD file) at or below which numbering may have moved.
 * Returns null when no hunk changes the line count — an equal-size in-place edit shifts
 * nothing, and gating it would be noise.
 */
export function firstShiftedLine(diffText) {
  let earliest = null;
  for (const m of diffText.matchAll(/^@@ -(\d+)(?:,(\d+))? \+\d+(?:,(\d+))? @@/gm)) {
    const start = Number(m[1]);
    const oldLen = m[2] === undefined ? 1 : Number(m[2]);
    const newLen = m[3] === undefined ? 1 : Number(m[3]);
    if (oldLen === newLen) continue;                  // same size: nothing below moves
    if (earliest === null || start < earliest) earliest = start;
  }
  return earliest;
}

// ⛔ Run the CLI only when invoked directly. Without this guard, `import`ing the module to
// unit-test `firstShiftedLine` EXECUTES the whole check — which shells git and can exit — so
// the test printed nothing and looked like a silent pass. A checker that cannot be imported
// cannot be tested, and an untestable gate is one nobody can prove fires.
const invokedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');
if (!invokedDirectly) { /* imported for testing */ } else main();

function main() {
const argv = process.argv.slice(2);
const ri = argv.indexOf('--range');
const range = ri >= 0 ? argv[ri + 1] : null;

const diff = range
  ? git(['diff', ...range.split('..'), '--', LOG])
  : git(['diff', '--cached', '--', LOG]);
if (!diff.trim()) process.exit(0);

const shift = firstShiftedLine(diff);
if (shift === null) process.exit(0);

// Which live records cite the log at a line at or below the shift?
const suspect = [];
let listing;
try { listing = git(['ls-files', 'Claude']).split(/\r?\n/).filter(Boolean); } catch { process.exit(0); }
for (const f of listing.filter(isLiveRecord)) {
  let text;
  try { text = git(['show', `:${f}`]); } catch { try { text = git(['show', `HEAD:${f}`]); } catch { continue; } }
  const hits = [...text.matchAll(/DecisionLog\.md:(\d+)(?:-(\d+))?/g)]
    .map((m) => ({ cite: m[0], line: Number(m[1]) }))
    .filter((h) => h.line >= shift);
  if (hits.length) suspect.push({ file: f, hits });
}
if (!suspect.length) process.exit(0);

console.error(`decisionlog-citation-shift: this edit to ${LOG} moves line numbers from line ${shift} down,`);
console.error('so these LIVE records cite lines that no longer hold what they claimed:\n');
for (const s of suspect) {
  console.error(`  ✗ ${s.file}`);
  for (const h of [...new Set(s.hits.map((h) => h.cite))]) console.error(`      ${h}`);
}
console.error(`
Nothing errors when this happens and nothing appears in the citing files' diffs — which is
why it is a gate and not a rule. Measured 2026-08-03: a plan's ":1147-1167" had come to land
on unrelated \`cur.ghostY\` text, and ":1157-1158" on a mutation-sweep paragraph.

Re-point each citation against the log as it is AFTER this change, and include those files in
THIS commit. If a citation is meant to record what was true at the time, say so in the text and
it stops being a live claim.

Historical artifacts (casebooks, strikes, audits, probes) are deliberately NOT listed: a
citation that was true when filed is a record, not a claim about HEAD.`);
process.exit(1);
}
