// GATE — no dead returned field on a NON_CONTRACT object-returning seam of js/swipe.js.
//
// WHY THIS EXISTS. A seam that returns a contract object can pass a field its caller never
// reads: the field's VALUE is used INSIDE the seam before the return, so a review checking
// "is this value used?" clears it — while the RETURNED field has no consumer and is dead
// (Engineering Contract §17). The .239 review missed exactly this: `Construction.classification`
// was returned unread by `start()` — the class of defect this gate exists to catch. The stage-5
// §3 contract revision has since dropped it (and the `plan` wrapper), so the seam returns no dead field.
//
// WHY IT COVERS THE CLASS, NOT ONE BUG. contract-function-gate.test.js is a META-gate: every
// js/swipe.js export is classified CONTRACT (exact-key + immutability checked — which catches a
// dead field, since the key set is pinned) or NON_CONTRACT (a prose exemption, NO shape check).
// buildConstruction is NON_CONTRACT, so its return escaped every consumer check — that is the
// class-hole, and any FUTURE NON_CONTRACT object-returning seam (stage 6 adds finalizationPlanFor
// / planFor) would escape it too. The DRIFT GUARD below rides that meta-inventory: every
// object-returning NON_CONTRACT export must be a registered dead-field seam, so a new one cannot
// ship without a consumer check. The registry maps each seam to the consumer(s) that must read
// every field; the detector (tools/dead-return-fields.mjs) parses the return keys and the
// consumer reads.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));
const load = () => import(pathToFileURL(path.join(ROOT, 'tools', 'dead-return-fields.mjs')).href);

// CONTRACT seams whose dead-field protection is the exact-key gate, NOT this one — because their
// consumers DESTRUCTURE the result (buildConstruction does `const { sourceHost } = classification`),
// which a `<var>.<field>` scan cannot see (it would false-positive). Guarded below against rot:
// each must still be a CONTRACT entry in contract-function-gate.test.js. finalizationPlanFor
// (stage 6d, PLAN-swipe-stage6d.md §4b) joins them here: it is a one-field exact-key CONTRACT
// seam, so the exact-key gate is what covers it.
const EXACT_KEY_GATED = ['classifyTransition', 'constructionPlanFor'];

// A function export whose source returns an object literal — `return {…}` or
// `return Object.freeze({…})`. These are the seams a dead field can hide on.
const OBJ_RETURN = /return\s+(?:Object\.freeze\s*\(\s*)?\{/;
function objectReturningExports() {
  return Object.keys(Swipe).filter((k) => typeof Swipe[k] === 'function' && OBJ_RETURN.test(Swipe[k].toString()));
}

// ── DRIFT GUARD — the class, not one bug: no object-returning seam escapes a dead-field check ──
test('every object-returning js/swipe.js seam is dead-field-checked (registry) or exact-key-gated', async () => {
  const { SEAM_REGISTRY } = await load();
  const covered = new Set([...Object.keys(SEAM_REGISTRY), ...EXACT_KEY_GATED]);
  for (const name of objectReturningExports()) {
    assert.ok(covered.has(name),
      `export "${name}" returns an object literal but is neither a registered dead-field seam `
      + '(tools/dead-return-fields.mjs SEAM_REGISTRY, with its consumer) nor exact-key-gated '
      + '(contract-function-gate.test.js CONTRACT). A NON_CONTRACT object seam must be dead-field-checked.');
  }
  // The exact-key exemption cannot rot into a silent free pass: each must still be CONTRACT.
  const gateSrc = fs.readFileSync(path.join(ROOT, 'test', 'contract-function-gate.test.js'), 'utf8');
  for (const name of EXACT_KEY_GATED) {
    assert.ok(new RegExp(`\\n\\s*${name}:\\s*\\{`).test(gateSrc),
      `${name} is exempted here as exact-key-gated but is no longer a CONTRACT entry in `
      + 'contract-function-gate.test.js — move it to SEAM_REGISTRY or restore its CONTRACT registration.');
  }
  // And a registered seam must actually still be an object-returning export.
  for (const name of Object.keys(SEAM_REGISTRY)) {
    assert.ok(objectReturningExports().includes(name),
      `SEAM_REGISTRY names "${name}", which js/swipe.js no longer exports as an object-returning function.`);
  }
});

// ── HARD GATE — no NEW dead returned field on any registered seam ──────────────────────────────
test('no NEW dead returned field on any registered Swipe seam', async () => {
  const { SEAM_REGISTRY, seamDeadFields } = await load();
  for (const seam of Object.keys(SEAM_REGISTRY)) {
    const dead = seamDeadFields(seam, ROOT);
    assert.deepEqual(dead, [],
      `Swipe.${seam} returns field(s) no consumer reads: ${dead.join(', ')}. `
      + 'A returned contract field with no consumer is a dead field (Engineering Contract §17) — '
      + 'consume it in the caller or remove it from the return.');
  }
});
