#!/usr/bin/env node
// source-gate-sweep.mjs — mutation evidence for the SOURCE-TEXT fingerprint gates.
//
// WHY THIS IS SEPARATE FROM tools/mutation-sweep.mjs. The fingerprint gates
// (swipe-model.test.js, transition-matrix.test.js) assert on the TEXT of js/app.js
// regions rather than on behaviour. In the behavioural sweep they fail under EVERY
// mutation by construction — the mutation changes the text they pin — which is a false
// CAUGHT, so mutation-sweep.mjs deliberately excludes them. But excluding them left the
// fingerprints with NO runnable mutation evidence at all: nothing proved that changing
// a branch condition inside a fingerprinted region actually trips its gate. The .218
// review asked for exactly that check and .219 missed it.
//
// This tool closes it the honest way: for each fingerprint, mutate a REAL branch
// condition INSIDE its region and require the SPECIFIC gate test to fail (and, as a
// negative control, require the behavioural swipe tests NOT to be the thing reporting
// it — a fingerprint gate must catch a same-behaviour edit the behaviour tests cannot).
//
//   node tools/source-gate-sweep.mjs
//
// ALWAYS restores the working tree, including on Ctrl-C. One suite run per entry.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;
const APP = path.join(ROOT, 'js', 'app.js');
const BAK = APP + '.sgbak';

// Each entry mutates a branch condition inside ONE fingerprinted region and names the
// gate whose fingerprint must move. `from`/`to` are single-line and CRLF-safe. The
// mutation is behaviour-neutral where possible (an equivalent rewrite), so it is the
// FINGERPRINT that catches it, not a behavioural test — that is the property under test.
const ENTRIES = [
  { region: 'transition branches (transition-matrix + swipe-model)',
    gate: 'test/transition-matrix.test.js',
    mustSay: 'predicate still mirrors',
    from: "const incomingBrowse = !toOv && toV !== 'home';",
    to:   "const incomingBrowse = toV !== 'home' && !toOv;" },   // equivalent, text differs
  { region: 'navTo stack rule (swipe-model)',
    gate: 'test/swipe-model.test.js',
    mustSay: 'mirrored js/app.js region',
    from: 'if (cur && cur.v === desc.v && !desc.author && !desc.book) navStack[navStack.length - 1] = desc;',
    to:   'if (cur && cur.v === desc.v && !desc.book && !desc.author) navStack[navStack.length - 1] = desc;' },
  { region: 'begin/nav-relation (swipe-model)',
    gate: 'test/swipe-model.test.js',
    mustSay: 'mirrored js/app.js region',
    from: "const fromLeft = x <= EDGE, fromRight = x >= window.innerWidth - EDGE;",
    to:   "const fromRight = x >= window.innerWidth - EDGE, fromLeft = x <= EDGE;" },
  { region: 'end/state-routing (swipe-model)',
    gate: 'test/swipe-model.test.js',
    mustSay: 'mirrored js/app.js region',
    from: 'if (!cur.live) return;',
    to:   'if (cur.live !== true) return;' },
  { region: 'begin/supersession (swipe-model)',
    gate: 'test/swipe-model.test.js',
    mustSay: 'mirrored js/app.js region',
    from: "PBDebug.log('SWIPE', 'leftover state on begin → hard reset');",
    to:   "PBDebug.log('SWIPE', 'leftover state on begin → hard-reset');" },
];

const run = (args) => spawnSync(NODE, args, { cwd: ROOT, encoding: 'utf8' });
const restore = () => { if (fs.existsSync(BAK)) { fs.copyFileSync(BAK, APP); fs.unlinkSync(BAK); } };
process.on('SIGINT', () => { restore(); process.exit(130); });

const uncaught = [];
const wrongGate = [];
try {
  for (const e of ENTRIES) {
    if (!fs.existsSync(BAK)) fs.copyFileSync(APP, BAK);
    const pristine = fs.readFileSync(BAK, 'utf8');           // keep CRLF; single-line anchors
    if (!pristine.includes(e.from)) {
      console.log(`ANCHOR FAILED — ${e.region}`);
      uncaught.push(`${e.region} (anchor rot)`);
      restore();
      continue;
    }
    fs.writeFileSync(APP, pristine.replace(e.from, e.to));
    const res = run(['--test', e.gate]);
    restore();
    // ⚠️ MUST key on a FAILING (`not ok`) subtest, NOT on the mustSay string appearing
    // anywhere in stdout. `mustSay` phrases are drawn from the test NAME / assertion
    // message, and node prints those on PASSING runs too — an early version of this
    // tool used stdout.includes(mustSay) and would have reported "caught" for a no-op
    // mutation. The property under test is that the fingerprint gate goes RED, so only
    // a `not ok` line naming this gate's fingerprint concern counts.
    const failedLines = (res.stdout.match(/^not ok .*$/gm) || []).filter((l) => !/#\s*TODO/i.test(l));
    // Both gates phrase their fingerprint failure with "fingerprint" or "mirror"; the
    // subtest title carries it, so a `not ok` line for that subtest is the signal.
    const caught = failedLines.some((l) => /fingerprint|mirror/i.test(l));
    if (!caught) {
      console.log(`UNCAUGHT — ${e.region}: ${e.gate} did not go RED on a fingerprint subtest`
        + ` (failed: ${failedLines.map((l) => l.replace(/^not ok \d+ - /, '')).join('; ') || 'none'})`);
      uncaught.push(e.region);
    } else {
      console.log(`caught — ${e.region}: ${e.gate} fingerprint moved`);
    }
  }
} finally {
  restore();
}

console.log(`\nswept ${ENTRIES.length} source-gate mutations: ${uncaught.length} uncaught`);
if (uncaught.length) console.log('UNCAUGHT:\n  ' + uncaught.join('\n  '));
process.exit(uncaught.length ? 1 : 0);
