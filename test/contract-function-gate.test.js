// GATE (Engineering Contract §14) — every exported CONTRACT function of js/swipe.js must
// return an object that is (a) EXACT-KEYED (no missing, no dead/extra field) and (b) DEEP-
// IMMUTABLE, verified by a DIRECT call on a HAND-CONSTRUCTED input (not the composed path,
// so immutability is the function's OWN, not inherited from an already-frozen argument).
//
// It is a META-gate: it also fails if a NEW export appears that is neither registered as a
// contract function (with its input + exact keys) nor listed as explicitly exempt — so a
// future contract-object factory cannot ship without its exact-key + immutability checks.
// This is the standing form of the .228 F7 / .230 F-i findings, so they cannot recur silent.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { ROOT } = require('./dom-fixture.js');

const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));

// Each contract function: a hand-built input and the EXACT key set its output must carry.
const CONTRACT = {
  classifyTransition: {
    input: { from: { v: 'nowplaying' }, to: { v: 'books' } },   // NP source => a decoration to freeze
    keys: ['decorations', 'fromKind', 'toKind'],
  },
  constructionPlanFor: {
    // A HAND-CONSTRUCTED classification — NOT via classifyTransition — so the freeze is the
    // function's own (the gap .230 F-i closed), and the decorations array is caller-owned.
    input: { fromKind: 'home', toKind: 'browse', decorations: [{ kind: 'now-playing-pill', role: 'mover', base: 'incoming' }] },
    keys: ['decorations', 'incoming', 'outgoing', 'renderDestination'],
  },
};
// Exports that are NOT contract-object factories, each with the reason it is exempt.
const NON_CONTRACT = {
  BROWSE_FAMILY: 'a shared enum array (the browse-family screen names), not a contract-object factory',
};

// Recursively assert every object/array reachable from a value is frozen.
function assertDeepFrozen(v, at) {
  if (v && typeof v === 'object') {
    assert.ok(Object.isFrozen(v), `${at} must be frozen`);
    for (const k of Object.keys(v)) assertDeepFrozen(v[k], `${at}.${k}`);
  }
}

test('§14 — every js/swipe.js export is classified: a contract function or explicitly exempt', () => {
  const exported = Object.keys(Swipe);
  for (const name of exported) {
    assert.ok(name in CONTRACT || name in NON_CONTRACT,
      `export "${name}" is unclassified — add it to CONTRACT (input + exact keys) or NON_CONTRACT (reason)`);
  }
  for (const name of [...Object.keys(CONTRACT), ...Object.keys(NON_CONTRACT)]) {
    assert.ok(exported.includes(name), `"${name}" is registered but js/swipe.js no longer exports it`);
  }
});

for (const [name, spec] of Object.entries(CONTRACT)) {
  test(`§14 — ${name}() is exact-keyed and deep-immutable on a direct call`, () => {
    const fn = Swipe[name];
    assert.equal(typeof fn, 'function', `${name} must be an exported function`);
    const out = fn(spec.input);

    // (a) Exact keys — no missing, no dead/extra field.
    assert.deepEqual(Object.keys(out).sort(), [...spec.keys].sort(),
      `${name}() keys must be exactly ${JSON.stringify([...spec.keys].sort())}, got ${JSON.stringify(Object.keys(out).sort())}`);

    // (b) Deep immutability — the whole reachable graph is frozen…
    assertDeepFrozen(out, `${name}()`);

    // …and a push / nested write genuinely cannot take effect (not just isFrozen()).
    for (const k of Object.keys(out)) {
      const val = out[k];
      if (!Array.isArray(val)) continue;
      const len = val.length;
      try { val.push({ __mut: 1 }); } catch (_) { /* strict throws; non-strict no-op */ }
      assert.equal(val.length, len, `${name}().${k} must reject a push`);
      if (val[0] && typeof val[0] === 'object') {
        const before = JSON.stringify(val[0]);
        try { val[0].__mut = 1; } catch (_) { /* idem */ }
        assert.equal(JSON.stringify(val[0]), before, `${name}().${k}[0] must reject a nested write`);
      }
    }
  });
}
