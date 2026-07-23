// GATE — no dead returned field on the Swipe.buildConstruction seam.
//
// WHY THIS EXISTS. A seam that returns a contract object can pass a field its caller never
// reads: the field's VALUE is used INSIDE the seam before the return, so a review checking
// "is this value used?" clears it — while the RETURNED field has no consumer and is dead
// (Engineering Contract §17). The .239 review missed exactly this: `Construction.classification`
// is returned but `start()` reads only `c.movers`/`c.capture`/`c.sourceWasClobbered`/`c.plan`.
// Verifying each classification FIELD had a consumer inside buildConstruction is NOT the same
// check as verifying the RETURNED classification OBJECT has one. This gate makes the second
// check mechanical (tools/dead-return-fields.mjs parses the seam's return keys and the caller's
// reads), so the class cannot be reasoned past again.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const load = () => import(pathToFileURL(path.join(ROOT, 'tools', 'dead-return-fields.mjs')).href);

// The one field tracked OPEN in the PolicyLedger (F1, ChatGPT review of 6bf0d20): its
// resolution (consume it, or revise the ratified return contract to drop it) is a plan
// decision. This allowlist entry is removed in the commit that resolves it — the known-red
// test below reddens until then, so the allowlist cannot silently outlive the defect.
const TRACKED_OPEN = ['classification'];

// HARD GATE: any dead returned field OTHER than the tracked-open one fails the suite. A new
// field added to the Construction return with no start() consumer reddens here immediately.
test('no NEW dead returned field on Swipe.buildConstruction', async () => {
  const { buildConstructionDeadFields } = await load();
  const dead = buildConstructionDeadFields(ROOT);
  const unexpected = dead.filter((k) => !TRACKED_OPEN.includes(k));
  assert.deepEqual(unexpected, [],
    `Swipe.buildConstruction returns field(s) no start() consumer reads: ${unexpected.join(', ')}. `
    + 'A returned contract field with no consumer is a dead field (Engineering Contract §17) — '
    + 'either consume it in start() or remove it from the return.');
});

// KNOWN-RED (F1): the tracked-open field must eventually reach zero dead. Direction-neutral —
// consuming `classification` OR dropping it from the ratified return both satisfy this. Goes
// green when F1 is resolved; remove the todo, this test, TRACKED_OPEN's entry, and the ledger
// entry in that commit. Tracked: PolicyLedger KR-swipe-construction-dead-classification.
test('every Swipe.buildConstruction returned field is consumed by start()',
  { todo: 'F1 (ChatGPT review of 6bf0d20 / build .239): Construction.classification is returned '
        + 'but unread by start(). Resolve by consuming it in L3 or revising the ratified return '
        + 'contract to drop it (a plan decision — Vitruvius/Charpy). Tracked: PolicyLedger '
        + 'KR-swipe-construction-dead-classification.' },
  async () => {
    const { buildConstructionDeadFields } = await load();
    assert.deepEqual(buildConstructionDeadFields(ROOT), [],
      'no field returned by Swipe.buildConstruction may be dead (unread by start())');
  });
