// GATE — every mutation in tools/mutate.mjs must still APPLY to current source.
//
// WHY. A mutation is how this project proves a test can fail: disable the guard,
// watch it go red, restore. The table in tools/mutate.mjs is therefore the record of
// which guards are actually defended. But anchors are literal source excerpts, so
// ordinary refactoring rots them — and a rotted mutation does not announce itself.
// `mutate.mjs` exits nonzero on a missing anchor when you run it BY HAND, and nobody
// runs all eleven by hand. The rot stays invisible until someone reaches for a
// mutation to prove a guard and finds it dead, which is exactly the moment they are
// least able to afford the detour.
//
// This is deliberately CHEAP: it does not run the suite eleven times, it only checks
// that each `from` (and each two-part `also.from`) still occurs in its target file.
// The expensive check — that every mutation is caught by at least one test — is
// `npm run mutation-sweep` (tools/mutation-sweep.mjs), for CI rather than every run.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

test('every mutation anchor still matches the source it targets', async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, 'tools', 'mutate.mjs')).href);
  const { MUTATIONS, DEFAULT_FILE } = mod;

  assert.ok(Array.isArray(MUTATIONS) && MUTATIONS.length > 0,
    'the mutation table is empty or not exported — this gate would be vacuous');

  // Normalise line endings on BOTH sides. Repo files are CRLF and multi-line anchors
  // are written with '\n', so a raw comparison reports a false rot — and worse, the
  // real mutate.mjs had the same bug, which is why mutation #7 was silently unusable.
  const lf = (s) => s.replace(/\r\n/g, '\n');
  const cache = new Map();
  const readFile = (rel) => {
    if (!cache.has(rel)) cache.set(rel, lf(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
    return cache.get(rel);
  };

  const rotted = [];
  MUTATIONS.forEach((m, i) => {
    // Two-part mutations exist because some defects only bite in pairs; BOTH halves
    // must still anchor or the mutation applies half of itself and proves nothing.
    // A part may target a DIFFERENT FILE from the primary — some guards are defence in
    // depth across modules (the swipe's inline-style clearing lives in both app.js
    // finalize and nav.js resetSwipeStyles). Resolving every part against the primary
    // file reported a false rot the moment such a mutation was added.
    for (const part of [m, m.also].filter(Boolean)) {
      const file = part.file || m.file || DEFAULT_FILE;
      if (!readFile(file).includes(lf(part.from))) rotted.push(`#${i} [${file}] ${m.name}`);
    }
  });

  assert.deepEqual(rotted, [],
    'these mutations no longer match the source, so they silently test NOTHING. '
    + 'Either update the anchor to the current code, or delete the mutation and say '
    + 'in the commit which guard is now undefended:\n  ' + rotted.join('\n  '));
});

test('no mutation is a no-op — every one changes the source it claims to change', async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, 'tools', 'mutate.mjs')).href);
  const { MUTATIONS } = mod;

  // A mutation whose `from` equals its `to` applies cleanly, reports success, and
  // changes nothing — so the suite stays green and the run reads as "the guard is
  // tested". That is the same false-reassurance shape as an inert test.
  const noops = MUTATIONS
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => [m, m.also].filter(Boolean).every((p) => p.from === p.to))
    .map(({ m, i }) => `#${i} ${m.name}`);

  assert.deepEqual(noops, [],
    `these mutations change nothing and would report a false pass: ${noops.join(', ')}`);
});
