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
// This tool closes it the honest way. For each fingerprint it does TWO things:
//   (1) mutate a REAL branch condition inside its region and require the SPECIFIC gate
//       test to go RED (keyed on a failing subtest whose title carries `mustSay`);
//   (2) run the behavioural swipe suite UNDER THE SAME MUTATION as a negative control,
//       and require it to stay GREEN. Each mutation here is an EQUIVALENT rewrite (or a
//       log-string change), so if a behaviour test also caught it the mutation was not
//       behaviour-neutral and the fingerprint's value is unproven — that is reported as
//       a bad control, not glossed over. Both halves together prove the property that
//       matters: the fingerprint gate catches same-behaviour source edits that no
//       behavioural assertion can see.
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
    // Re-anchored for stage 3: the ARMED branch gained the ownership clear, so the old
    // `if (!cur.live) return;` line no longer exists. Equivalent rewrite of the new one.
    from: 'if (!cur.live) { sessionDone(cur); return; }',
    to:   'if (cur.live !== true) { sessionDone(cur); return; }' },
  { region: 'begin/supersession (swipe-model)',
    gate: 'test/swipe-model.test.js',
    mustSay: 'mirrored js/app.js region',
    // Behaviour-neutral rewrite of a line INSIDE the region (the .spent sweep), so it
    // is the fingerprint that catches it. (Re-anchored for stage 3: the old anchor was
    // the hard-reset log line, which stage 3 edited to add `sid=`.)
    from: "document.querySelectorAll('.nav-ghost.spent').forEach((n) => n.remove());",
    to:   "[...document.querySelectorAll('.nav-ghost.spent')].forEach((n) => n.remove());" },
];

const run = (args) => spawnSync(NODE, args, { cwd: ROOT, encoding: 'utf8' });
const restore = () => { if (fs.existsSync(BAK)) { fs.copyFileSync(BAK, APP); fs.unlinkSync(BAK); } };
process.on('SIGINT', () => { restore(); process.exit(130); });

const uncaught = [];
const notNeutral = [];
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
    // (1) THE FINGERPRINT GATE must go RED. Key on a FAILING (`not ok`) subtest, NOT on
    // the mustSay string appearing anywhere in stdout: those phrases come from the test
    // NAME / assertion message, which node prints on PASSING runs too — an early version
    // used stdout.includes(mustSay) and would have reported "caught" for a no-op.
    const gateRes = run(['--test', e.gate]);
    const gateFails = (gateRes.stdout.match(/^not ok .*$/gm) || []).filter((l) => !/#\s*TODO/i.test(l));
    // The failing subtest's NAME (the `not ok ... - <title>` line) must name the
    // fingerprint concern. node prints the assertion body separately, so matching the
    // `not ok` TITLE line — not the whole stdout — is what keeps a passing run from
    // counting. mustSay is the per-entry phrase that title carries.
    const caught = gateFails.some((l) => l.includes(e.mustSay));

    // (2) THE BEHAVIOURAL NEGATIVE CONTROL. Each mutation here is meant to be an
    // EQUIVALENT rewrite (or a log-string change), so it must be caught by the
    // fingerprint and NOT by any behavioural assertion — that is what proves the
    // fingerprint is load-bearing rather than redundant with a behaviour test. Run the
    // behavioural swipe suite under the SAME mutation and require it to stay green
    // (todos excepted). If a swipe test goes red, the mutation was not behaviour-neutral
    // and the entry is a bad control — report it as such rather than quietly claiming
    // the stronger property.
    const behRes = run(['--test', 'test/swipe-invariants.test.js', 'test/swipe-gesture.test.js']);
    const behFails = (behRes.stdout.match(/^not ok .*$/gm) || []).filter((l) => !/#\s*TODO/i.test(l));
    restore();

    if (!caught) {
      console.log(`UNCAUGHT — ${e.region}: ${e.gate} did not go RED on a fingerprint subtest`
        + ` (failed: ${gateFails.map((l) => l.replace(/^not ok \d+ - /, '')).join('; ') || 'none'})`);
      uncaught.push(e.region);
    } else if (behFails.length) {
      console.log(`NOT BEHAVIOUR-NEUTRAL — ${e.region}: caught by the fingerprint AND by`
        + ` ${behFails.length} behavioural test(s): `
        + behFails.map((l) => l.replace(/^not ok \d+ - /, '')).join('; '));
      notNeutral.push(e.region);
    } else {
      console.log(`caught — ${e.region}: fingerprint RED, behaviour GREEN (control holds)`);
    }
  }
} finally {
  restore();
}

console.log(`\nswept ${ENTRIES.length} source-gate mutations: `
  + `${uncaught.length} uncaught, ${notNeutral.length} not-behaviour-neutral`);
if (uncaught.length) console.log('UNCAUGHT (fingerprint did not fire):\n  ' + uncaught.join('\n  '));
if (notNeutral.length) console.log('NOT NEUTRAL (a behaviour test also caught it — bad control):\n  ' + notNeutral.join('\n  '));
process.exit(uncaught.length || notNeutral.length ? 1 : 0);
