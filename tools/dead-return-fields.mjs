#!/usr/bin/env node
// dead-return-fields.mjs — detect a returned CONTRACT field that no consumer reads.
//
// THE CLASS THIS EXISTS TO STOP. A seam function returns an object literal whose fields
// are meant to be consumed by its caller. The project forbids dead fields (Engineering
// Contract §17): a field is added only when a consumer reads it. But a field can be
// CONSUMED INTERNALLY (used inside the seam before the return) and still be DEAD ON THE
// RETURN OBJECT (no caller reads `<callVar>.<field>`). Verifying "the field's value is
// used somewhere" is NOT the same check as "the returned field has a consumer" — and a
// review that conflates the two passes a dead returned field as clean. This gate makes the
// second check mechanical: for the seam's `return { ... }`, every top-level key must be
// read as `<callVar>.<key>` in the consumer function, or it is reported dead.
//
//   node tools/dead-return-fields.mjs            # the buildConstruction seam; exit 1 if any dead
//
// It is a DETECTOR (exit 1 on any dead field). The green CI wiring lives in
// test/construction-consumers.test.js, which allowlists the one field tracked open in the
// PolicyLedger and hard-fails on any NEW dead field.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The balanced `{...}` body of `function <name>(` — brace-matched, so nested blocks are safe.
function fnBody(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i === -1) throw new Error(`dead-return-fields: function ${name}() not found`);
  const open = src.indexOf('{', i);
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    const ch = src[k];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(open, k + 1); }
  }
  throw new Error(`dead-return-fields: unbalanced body for ${name}()`);
}

// Top-level keys of the LAST `return { ... }` object literal in a function body. Depth-aware
// so a nested `movers: { outgoing, incoming }` contributes only `movers`, not its children.
function returnKeys(body) {
  const ri = body.lastIndexOf('return {');
  if (ri === -1) throw new Error('dead-return-fields: no `return {` in seam body');
  const open = body.indexOf('{', ri);
  let depth = 0, end = -1;
  for (let k = open; k < body.length; k++) {
    const ch = body[k];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = k; break; } }
  }
  if (end === -1) throw new Error('dead-return-fields: unbalanced return object');
  const inner = body.slice(open + 1, end);
  const keys = [];
  let d = 0, token = '';
  const flush = () => {
    const m = /^\s*([A-Za-z_$][\w$]*)/.exec(token);
    if (m) keys.push(m[1]);
    token = '';
  };
  for (const ch of inner) {
    if ('{[('.includes(ch)) { if (d === 0 && token) { flush(); token = ''; } d++; continue; }
    if ('}])'.includes(ch)) { d--; continue; }
    if (d === 0 && ch === ',') { flush(); continue; }
    if (d === 0) token += ch;
  }
  if (d === 0) flush();
  return [...new Set(keys)];
}

// The variable a consumer binds the seam result to: `const <var> = <SeamNs.>?<fn>(`.
function callVarIn(consumerBody, fn) {
  const re = new RegExp(`(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*[\\w.]*${fn}\\s*\\(`);
  const m = re.exec(consumerBody);
  if (!m) throw new Error(`dead-return-fields: no \`= ${fn}(\` call in the consumer`);
  return m[1];
}

// The dead returned fields for one seam→consumer pairing. Pure; takes sources so tests can
// drive it against fixtures.
export function deadReturnFields({ seamSrc, seamFn, consumerSrc, consumerFn }) {
  const keys = returnKeys(fnBody(seamSrc, seamFn));
  const consumer = fnBody(consumerSrc, consumerFn);
  const v = callVarIn(consumer, seamFn);
  return keys.filter((k) => !new RegExp(`\\b${v}\\.${k}\\b`).test(consumer));
}

// The buildConstruction seam, wired to the real files.
export function buildConstructionDeadFields(root = ROOT) {
  return deadReturnFields({
    seamSrc: fs.readFileSync(path.join(root, 'js', 'swipe.js'), 'utf8'),
    seamFn: 'buildConstruction',
    consumerSrc: fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8'),
    consumerFn: 'start',
  });
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {
  const dead = buildConstructionDeadFields();
  if (dead.length) {
    console.error(`DEAD returned field(s) on Swipe.buildConstruction — no start() consumer reads: ${dead.join(', ')}`);
    console.error('A returned contract field with no consumer violates the no-dead-fields rule (Engineering Contract §17).');
    process.exit(1);
  }
  console.log('buildConstruction: every returned field has a start() consumer.');
}
