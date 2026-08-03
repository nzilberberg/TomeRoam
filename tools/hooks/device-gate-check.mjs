#!/usr/bin/env node
// device-gate-check.mjs — a device-gate item recorded as OWED must be RUNNABLE.
//
// WHY THIS EXISTS. On 2026-08-02 the parked-page plan filed device gate item 2 as a bare
// PROPERTY: "a page parked 3 viewports away retains its decoded cover bitmaps exactly as one
// parked 1.01 viewports away does." True as a question, useless as an instruction. When the
// moment came to ask the user to check it, the gesture was INVENTED on the spot — "start a
// swipe into a book list and abort it, then watch the covers" — and the user answered:
//
//     "if you abort the swipe into books you won't see the books. I don't understand."
//
// They were right. Abort a home->books swipe and you land back on Home; the covers are never
// revealed, so nothing was observable. Worse, deriving it properly afterwards showed the item
// was close to UNOBSERVABLE by construction — the page whose retention is exercised is always
// a mover, and a mover's inline transform beats the class rule on every rendered frame. That
// is a fact which, derived at FILING time, would have changed the plan; derived at ask-time it
// only wasted the user's attention.
//
// THE RULE. In a device-gate record, an item still marked OWED must carry both:
//     Gesture:    what a human physically does, in app terms.
//     Observable: what they would SEE if it failed.
// Anything else is a wish, and a wish gets a fabricated gesture bolted on later.
//
// SCOPE — deliberately narrow, and that is the design. This gates the RECORD FORMAT of files
// this project owns (`Claude/**/DEVICE-*.md`), where the check is textual and exact. It does
// NOT try to judge whether a plan's prose "names a gesture": that is semantic, and a keyword
// gate for it is measurably worse than nothing — see the residual note in this file's test.
//
//   node tools/hooks/device-gate-check.mjs [file...]     (no args = the STAGED files)
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// git exports GIT_DIR and friends into every hook child; an ambient GIT_DIR OVERRIDES cwd, so a
// shelled git would read the WRONG repo. Same boundary the rest of this tooling keeps.
const GIT_LOCATION_VARS = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX',
  'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'];

/** Files this check applies to: a device-gate record under the records tree. */
export const isDeviceRecord = (p) =>
  /(^|[/\\])Claude[/\\].*[/\\]DEVICE-[^/\\]*\.md$/i.test(p.replace(/\\/g, '/'));

function stagedFiles() {
  const env = { ...process.env };
  for (const k of GIT_LOCATION_VARS) delete env[k];
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      { cwd: ROOT, encoding: 'utf8', env }).split(/\r?\n/).filter(Boolean);
  } catch { return []; }
}

/**
 * Split a markdown document into (heading, body) sections on ## / ### / #### rules.
 * Content before the first heading is discarded — a preamble is not an item.
 */
function sections(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let cur = null;
  for (const line of lines) {
    const m = /^(#{2,4})\s+(.*)$/.exec(line);
    if (m) { cur = { heading: m[2], body: [] }; out.push(cur); continue; }
    if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
}

// A field line: optional bullet / bold, the name, a colon. `**Gesture:**`, `- Gesture:`, `Gesture :`.
const hasField = (body, name) =>
  new RegExp(`^[\\s>]*(?:[-*+]\\s*)?\\*{0,2}${name}\\*{0,2}\\s*:`, 'im').test(body);

/** Findings for one file's text. Empty array = clean. */
export function checkText(text, path) {
  const bad = [];
  for (const { heading, body } of sections(text)) {
    // Only ITEM sections are gated — a summary or a status roll-up is not an instruction.
    if (!/\bitem\s+\d/i.test(heading)) continue;
    // OWED is the trigger: an item still owed is one somebody will be asked to run.
    const whole = heading + '\n' + body;
    if (!/\bOWED\b/.test(whole)) continue;
    const missing = ['Gesture', 'Observable'].filter((f) => !hasField(body, f));
    if (missing.length) bad.push(`${path} :: "${heading.trim().slice(0, 70)}" is OWED but has no ${missing.join(' and no ')} field`);
  }
  return bad;
}

const argv = process.argv.slice(2);
const files = (argv.length ? argv : stagedFiles()).filter(isDeviceRecord);

const findings = [];
for (const f of files) {
  const abs = existsSync(f) ? f : join(ROOT, f);
  if (!existsSync(abs)) continue;                       // deleted in this commit
  findings.push(...checkText(readFileSync(abs, 'utf8'), f));
}

if (findings.length) {
  console.error('device-gate-check: an OWED device-gate item must be RUNNABLE.\n');
  for (const f of findings) console.error('  ✗ ' + f);
  console.error(`
An item recorded as OWED is one a human will be asked to check. Filed as a bare property, it
has no instruction — so a gesture gets invented at the moment of asking, and the invented one
does not work. That is the incident this gate exists for (2026-08-02: "if you abort the swipe
into books you won't see the books. I don't understand.").

Add both fields to each item above:

  **Gesture:** what the person physically does, in app terms.
  **Observable:** what they would SEE if it failed, distinguishable from normal behaviour.

If you cannot write the gesture, that is a FINDING about the item, not a formatting problem —
the property may be unobservable by construction. Say so in the record and route it back.`);
  process.exit(1);
}
process.exit(0);
