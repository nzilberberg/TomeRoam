// GATE — every browser global app.js reads BARE must be installed in the harness.
//
// WHY THIS EXISTS. The same defect shipped three times in one week, each time
// silently killing a code path under test rather than failing:
//
//   .154  `global.navigator = window.navigator` is a NO-OP on Node >= 21 (the
//         property is a getter-only accessor). app.js saw NODE's navigator in every
//         test, so every `navigator.*`-gated branch took the unsupported path and
//         the whole Media Session surface was dead code under test.
//   .199  `MutationObserver` was never installed at all. app.js's reveal-mutation
//         diagnostic — the source of every device reading for six builds — threw a
//         ReferenceError that its own defensive `catch` swallowed, so it reported
//         nothing while looking healthy.
//   .205  `Element` was never installed, so the feature-detect
//         `Element.prototype.getAnimations` took the unsupported path and the
//         cover animation phase sync was dead under test.
//
// Each cost days. Each is invisible: the code does not crash, it quietly does
// nothing, and a green suite says everything is fine. A written rule did not
// prevent the second or third occurrence — rules are self-enforced and this
// project has seven of them loaded every session. A gate is not.
//
// WHAT THIS ASSERTS. Identity, not existence. `typeof global.navigator !== 'undefined'`
// would have PASSED during the .154 defect, because Node has a navigator — just the
// wrong one. The invariant is that app.js and the DOM see the SAME object.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { boot } = require('./app-harness.js');
const { ROOT } = require('./dom-fixture.js');

/**
 * Strip comments and string/template literals: a name in prose is not a reference.
 *
 * ORDER MATTERS, and the first version got it wrong — it stripped only comments that
 * START a line, so six TRAILING `// …screen…` comments made the gate report `screen`
 * as an uninstalled global on its very first run. A gate that cries wolf gets
 * switched off, which is worse than no gate.
 *
 * Strings are removed BEFORE line comments so a `//` inside a string cannot truncate
 * the line, and line comments are removed AFTER so a `//` in code is caught wherever
 * it appears.
 */
function stripNonCode(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/\/\/.*$/gm, ' ');
}

// Browser globals that do NOT exist in Node, or exist as something DIFFERENT.
// Add to this list when app.js starts using a new one — that is the point.
const CANDIDATES = [
  'document', 'window', 'Element', 'HTMLElement', 'Node', 'MutationObserver',
  'IntersectionObserver', 'ResizeObserver', 'getComputedStyle', 'localStorage',
  'sessionStorage', 'CustomEvent', 'Event', 'DOMParser', 'matchMedia', 'history',
  'location', 'screen', 'caches', 'indexedDB', 'navigator', 'Touch', 'TouchEvent',
  'PointerEvent', 'Image', 'Blob', 'FileReader',
];

// DELIBERATE substitutions — the harness installs something OTHER than the jsdom
// object on purpose. Each needs a stated reason, so "it differs" can never be
// waved through without one.
// Audio / requestAnimationFrame / cancelAnimationFrame are NOT listed: the harness
// replaces them on BOTH global and window, so identity still holds and the main
// assertion passes honestly. Listing them would have been a stale excuse — which the
// second test below caught on the first run.
const SUBSTITUTED = {
  getComputedStyle: 'bound to window so a bare call has the right receiver',
};

function bareGlobalsUsedBy(file) {
  const src = stripNonCode(fs.readFileSync(file, 'utf8'));
  return CANDIDATES.filter((n) => new RegExp('(^|[^.\\w$])' + n + '\\b').test(src));
}

/** app.js's init() is async; dispose before it settles and it writes into a closed window. */
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

test('every bare browser global app.js reads is installed in the harness (identity, not existence)', async () => {
  const used = bareGlobalsUsedBy(path.join(ROOT, 'js', 'app.js'));
  assert.ok(used.length > 5,
    `the scanner found only ${used.length} globals — it has probably stopped matching, `
    + 'which would make this gate silently vacuous');

  const h = boot();
  try {
    await settle(h);
    const missing = [];
    const mismatched = [];
    for (const name of used) {
      if (SUBSTITUTED[name]) continue;
      const g = global[name];
      const w = h.window[name];
      if (typeof g === 'undefined') { missing.push(name); continue; }
      // Identity is the invariant. Existence is not: Node HAS a navigator, and that
      // is exactly how .154 stayed invisible.
      if (g !== w) mismatched.push(`${name} (global !== window)`);
    }
    assert.deepEqual(missing, [],
      `app.js reads these bare, and the harness never installs them — every branch `
      + `guarded by them is DEAD under test: ${missing.join(', ')}`);
    assert.deepEqual(mismatched, [],
      `installed but NOT the same object the DOM uses, so app.js and the test observe `
      + `different worlds: ${mismatched.join(', ')}`);
  } finally { h.dispose(); }
});

test('the substitution list is honest — every entry is actually substituted', async () => {
  const h = boot();
  try {
    await settle(h);
    const bogus = Object.keys(SUBSTITUTED)
      .filter((n) => typeof global[n] !== 'undefined' && global[n] === h.window[n]);
    // A stale entry here would let a REAL divergence hide behind a reason that no
    // longer applies — the allowlist must not outlive what it excuses.
    assert.deepEqual(bogus, [],
      `these are listed as deliberate substitutions but are identical to the DOM's: `
      + `${bogus.join(', ')} — remove them from SUBSTITUTED`);
  } finally { h.dispose(); }
});
