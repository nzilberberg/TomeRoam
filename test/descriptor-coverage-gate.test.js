// GATE (Engineering Contract §15) — the descriptor-scenario fixture must cover ALL SEVEN
// enumerated cases. §15 IS the enumeration; SEC15_CASES in the fixture writes it down. This
// gate fails CI if any case has no tagged scenario (a category silently dropped) or if a
// scenario is tagged with something outside the enumeration (a typo that would let a real
// gap hide). It is the mechanical enforcement of "cover all seven" so it cannot be ignored.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

const loadSpec = () => import(pathToFileURL(path.join(ROOT, 'test', 'fixtures', 'swipe-plan-spec.mjs')).href);

test('§15 — every enumerated descriptor-scenario case has at least one tagged scenario', async () => {
  const { DESCRIPTOR_SCENARIOS, SEC15_CASES } = await loadSpec();
  assert.ok(Array.isArray(SEC15_CASES) && SEC15_CASES.length === 7,
    'SEC15_CASES must be the seven enumerated §15 cases');

  const tags = new Set();
  for (const s of DESCRIPTOR_SCENARIOS) for (const t of [].concat(s.sec15 || [])) tags.add(t);

  // No typo tags — every tag used must be one of the seven cases, or a real gap could hide
  // behind a misspelled tag that satisfies nothing.
  const unknown = [...tags].filter((t) => !SEC15_CASES.includes(t));
  assert.deepEqual(unknown, [], `scenario tags not in the §15 enumeration (typos?): ${unknown.join(', ')}`);

  // Full coverage — every enumerated case must have a scenario.
  const missing = SEC15_CASES.filter((c) => !tags.has(c));
  assert.deepEqual(missing, [], `§15 cases with NO descriptor scenario: ${missing.join(', ')}`);
});
