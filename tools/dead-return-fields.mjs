#!/usr/bin/env node
// dead-return-fields.mjs — detect a returned CONTRACT field that no consumer reads.
//
// THE CLASS THIS EXISTS TO STOP. A seam function returns an object literal whose fields are
// meant to be consumed by its caller(s). The project forbids dead fields (Engineering Contract
// §17): a field is added only when a consumer reads it. But a field can be CONSUMED INTERNALLY
// (used inside the seam before the return) and still be DEAD ON THE RETURN OBJECT (no caller
// reads `<callVar>.<field>`). Verifying "the field's value is used somewhere" is NOT the same
// check as "the returned field has a consumer" — and a review that conflates the two passes a
// dead returned field as clean (that is exactly how `Construction.classification` shipped dead
// in build .239). This makes the second check mechanical.
//
//   node tools/dead-return-fields.mjs            # every registered NON_CONTRACT seam; exit 1 if any dead
//
// The green CI wiring + the drift guard (every object-returning NON_CONTRACT export must be a
// registered seam) live in test/construction-consumers.test.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The balanced `{...}` body of `function <name>(` — brace-matched, so nested blocks are safe.
// The body `{` is the one AFTER the parameter list closes, so a DESTRUCTURED parameter
// (`function f({ a, b }) {…}`) does not mislead the scan into returning the param object.
export function fnBody(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i === -1) throw new Error(`dead-return-fields: function ${name}() not found`);
  let pd = 0, close = -1;
  for (let k = i + sig.length - 1; k < src.length; k++) {   // start at the '(' of the param list
    if (src[k] === '(') pd++;
    else if (src[k] === ')') { pd--; if (pd === 0) { close = k; break; } }
  }
  if (close === -1) throw new Error(`dead-return-fields: unbalanced parameter list for ${name}()`);
  const open = src.indexOf('{', close);
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    const ch = src[k];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(open, k + 1); }
  }
  throw new Error(`dead-return-fields: unbalanced body for ${name}()`);
}

// Top-level keys of the LAST returned object literal in a function body. Handles both a bare
// `return { ... }` and `return Object.freeze({ ... })`. Depth-aware, so a nested
// `movers: { outgoing, incoming }` contributes only `movers`.
export function returnKeys(body) {
  const re = /return\s+(?:Object\.freeze\s*\(\s*)?\{/g;
  let last = -1, m;
  while ((m = re.exec(body))) last = m.index + m[0].length - 1;   // index of the object's `{`
  if (last === -1) throw new Error('dead-return-fields: no returned object literal in seam body');
  let depth = 0, end = -1;
  for (let k = last; k < body.length; k++) {
    const ch = body[k];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = k; break; } }
  }
  if (end === -1) throw new Error('dead-return-fields: unbalanced return object');
  const inner = body.slice(last + 1, end);
  const keys = [];
  let d = 0, token = '';
  const flush = () => { const mm = /^\s*([A-Za-z_$][\w$]*)/.exec(token); if (mm) keys.push(mm[1]); token = ''; };
  for (const ch of inner) {
    if ('{[('.includes(ch)) { if (d === 0 && token) flush(); d++; continue; }
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

// Dead returned fields for a seam consumed by one or more consumers. A field is dead only when
// NO consumer reads `<callVar>.<field>`. Each consumer: { src, fn }. Pure; takes sources so
// tests can drive it against fixtures.
export function deadReturnFields({ seamSrc, seamFn, consumers }) {
  const keys = returnKeys(fnBody(seamSrc, seamFn));
  const reads = new Set();
  for (const { src, fn } of consumers) {
    const body = fnBody(src, fn);
    const v = callVarIn(body, seamFn);
    for (const k of keys) if (new RegExp(`\\b${v}\\.${k}\\b`).test(body)) reads.add(k);
  }
  return keys.filter((k) => !reads.has(k));
}

// The registry of NON_CONTRACT object-returning seams whose returns this gate checks, each
// mapped to the consumer(s) that must read every field. CONTRACT seams (classifyTransition,
// constructionPlanFor) are dead-field-covered by the exact-key gate instead
// (test/contract-function-gate.test.js) and are NOT here. Adding a seam is one entry; the
// drift guard in test/construction-consumers.test.js forbids a new NON_CONTRACT object seam
// from escaping this registry.
//
// RESIDUAL (why this is a registry, not an auto-scan): a consumer that DESTRUCTURES the result
// (`const { sourceHost } = classifyTransition(...)`, as buildConstruction itself does) hides the
// read from a `<var>.<field>` scan, so a blanket scan would FALSE-POSITIVE. Seams whose consumers
// destructure cannot be checked this way; they are the ones the exact-key gate covers instead.
export const SEAM_REGISTRY = {
  buildConstruction: [{ file: 'js/app.js', fn: 'start' }],
};

export function seamDeadFields(seamFn, root = ROOT) {
  const consumers = SEAM_REGISTRY[seamFn];
  if (!consumers) throw new Error(`dead-return-fields: ${seamFn} is not a registered seam`);
  const seamSrc = fs.readFileSync(path.join(root, 'js', 'swipe.js'), 'utf8');
  return deadReturnFields({
    seamSrc,
    seamFn,
    consumers: consumers.map((c) => ({ src: fs.readFileSync(path.join(root, c.file), 'utf8'), fn: c.fn })),
  });
}

// Back-compat convenience for the buildConstruction seam.
export const buildConstructionDeadFields = (root = ROOT) => seamDeadFields('buildConstruction', root);

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {
  let bad = false;
  for (const seam of Object.keys(SEAM_REGISTRY)) {
    const dead = seamDeadFields(seam);
    if (dead.length) {
      bad = true;
      console.error(`DEAD returned field(s) on Swipe.${seam} — no consumer reads: ${dead.join(', ')}`);
    }
  }
  if (bad) {
    console.error('A returned contract field with no consumer violates the no-dead-fields rule (Engineering Contract §17).');
    process.exit(1);
  }
  console.log('Every registered seam: all returned fields have a consumer.');
}
