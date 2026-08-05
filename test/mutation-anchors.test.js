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

// GATE — no registered anchor may be NON-UNIQUE without an explicit disambiguation.
//
// WHY. The applier is `src.replace(from, to)` — a literal-STRING pattern, so it
// rewrites the FIRST occurrence of `from` only. A `from` that occurs more than once in
// its target file therefore mutates whichever site sits first in source order, dies to
// whatever cell reaches THAT site, and reports `caught` while the entry's actually-
// intended site is never touched — the cell it names never proves anything. An audit
// of this table (PLAN-home-shift-fix.md §7.3) found SIX of six inspected anchors
// non-unique this way, including two registrations that had been silently testing the
// wrong site for some time. This is the REGISTRATION-time half of that fix: the rot
// test above catches an anchor that stopped matching; this one catches an anchor that
// matches in more than one place. `tools/mutate.mjs`'s `resolveAnchor` is the single
// shared implementation of the check — both this gate and the CLI apply step call it,
// so there is exactly one place uniqueness is decided, not two that can drift apart.
test('no registered mutation anchor is non-unique without an explicit disambiguation', async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, 'tools', 'mutate.mjs')).href);
  const { MUTATIONS, DEFAULT_FILE, resolveAnchor } = mod;

  const lf = (s) => s.replace(/\r\n/g, '\n');
  const cache = new Map();
  const readFile = (rel) => {
    if (!cache.has(rel)) cache.set(rel, lf(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
    return cache.get(rel);
  };

  const ambiguous = [];
  MUTATIONS.forEach((m, i) => {
    for (const part of [m, m.also].filter(Boolean)) {
      const file = part.file || m.file || DEFAULT_FILE;
      const label = `#${i} [${file}] ${m.name}`;
      const resolved = resolveAnchor(readFile(file), part, label);
      // occurrences === 0 (an ANCHOR NOT FOUND / rotted anchor) is the OTHER test's
      // job above — reporting it here too would double-count the same failure under
      // two different messages.
      if (resolved.index === -1 && resolved.occurrences !== 0) ambiguous.push(resolved.error);
    }
  });

  assert.deepEqual(ambiguous, [],
    'these mutations anchor on text that is not unique in its target file (or whose '
    + 'declared count has drifted since it was written), so the applier could silently '
    + 'mutate the wrong site and credit a cell that never reached it. Disambiguate with '
    + 'a longer `from`, or an explicit `occurrence`/`count`:\n  ' + ambiguous.join('\n  '));
});

// Proves the gate above CAN fail — not merely that it currently reports zero. Exercises
// resolveAnchor directly against in-memory fixtures (never touching real source files),
// so this is a structural test of the shared function itself rather than a scan of any
// project text — the discipline this file's own gates depend on (a check that reads
// free text for a pattern which also appears in the documentation ABOUT that pattern
// poisons itself; a synthetic fixture has no such text to collide with).
test('resolveAnchor refuses a non-unique anchor and accepts one that disambiguates', async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, 'tools', 'mutate.mjs')).href);
  const { resolveAnchor } = mod;

  const src = 'alpha\nfoo();\nbeta\nfoo();\ngamma\n';
  const firstFoo = src.indexOf('foo();');
  const secondFoo = src.indexOf('foo();', firstFoo + 1);

  // A bare anchor occurring twice, with no disambiguation, is refused outright — this
  // is the failure this gate exists to produce, and it must actually fire.
  const bare = resolveAnchor(src, { from: 'foo();', to: 'bar();' }, 'fixture-bare');
  assert.strictEqual(bare.index, -1);
  assert.strictEqual(bare.occurrences, 2);
  assert.match(bare.error, /NON-UNIQUE ANCHOR/);

  // An explicit `occurrence` selects exactly that site, not the first one — proves the
  // disambiguation is HONOURED, not merely accepted.
  const second = resolveAnchor(src, { from: 'foo();', to: 'bar();', occurrence: 2 }, 'fixture-occurrence');
  assert.strictEqual(second.index, secondFoo);
  assert.strictEqual(second.occurrences, 2);

  // An `occurrence` outside the real range is refused, not silently clamped.
  const outOfRange = resolveAnchor(src, { from: 'foo();', to: 'bar();', occurrence: 3 }, 'fixture-range');
  assert.strictEqual(outOfRange.index, -1);
  assert.match(outOfRange.error, /OUT OF RANGE/);

  // A declared `count` that no longer matches the source is refused as STALE — this is
  // what would have caught a registered anchor whose surrounding code changed shape
  // without anyone re-deriving the declaration.
  const stale = resolveAnchor(src, { from: 'foo();', to: 'bar();', count: 1 }, 'fixture-stale-count');
  assert.strictEqual(stale.index, -1);
  assert.match(stale.error, /STALE COUNT/);

  // A naturally-unique anchor needs no disambiguation at all and applies cleanly — the
  // common case, unaffected by any of the above.
  const unique = resolveAnchor(src, { from: 'beta', to: 'BETA' }, 'fixture-unique');
  assert.strictEqual(unique.index, src.indexOf('beta'));
  assert.strictEqual(unique.occurrences, 1);

  // A missing anchor is still reported as ANCHOR NOT FOUND, not NON-UNIQUE — the two
  // failure modes must stay distinguishable so the anchors-gate above does not
  // double-count a rotted anchor as an ambiguity finding too.
  const missing = resolveAnchor(src, { from: 'nope();', to: 'x' }, 'fixture-missing');
  assert.strictEqual(missing.index, -1);
  assert.strictEqual(missing.occurrences, 0);
  assert.match(missing.error, /ANCHOR NOT FOUND/);
});

// ── THE SECOND ANCHOR REGISTRY, added 2026-08-04.
//
// This file has always read `tools/mutate.mjs` and nothing else. But there are TWO anchor
// registries: the behavioural one, and `tools/source-gate-sweep.mjs`, which carries the only
// runnable mutation evidence for the source-text FINGERPRINT gates. Nothing watched the second
// one, so it rotted invisibly — exactly the failure this file exists to prevent, one level up.
//
// MEASURED, then RESOLVED (PLAN-swipe-declone-stage2-subtraction.md §4a C3(b), decision 11):
// `tools/source-gate-sweep.mjs`'s `transition branches` entry anchored on
// `const incomingBrowse = !toOv && toV !== 'home';`, which left `js/app.js` at 14257f2 (.227,
// stage 4, "retire the branch mirror") when the predicate moved into `classifyTransition` in
// js/swipe.js. The tool exited 1 for NINE stages and `test/transition-matrix.test.js`'s
// fingerprint held no mutation evidence for that whole span. Nobody ran it, because nothing
// made them. It is not re-anchored: `test/transition-matrix.test.js:42-47` states in its own
// words that the mirror it defended was retired at stage 4 and there is nothing left to
// fingerprint — the entry was a tombstone of a retired mirror, so it is deleted rather than
// given a `file` field to chase a predicate that no longer has a second copy anywhere.
//
// A rot found here is recorded below with an owner, so a NEW one still reddens instead of
// going unnoticed for another nine stages.
const KNOWN_ROTTED = new Map([
]);

test('every source-gate anchor still matches its target, or is a KNOWN rot', async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, 'tools', 'source-gate-sweep.mjs')).href);
  const { ENTRIES, APP } = mod;
  assert.ok(Array.isArray(ENTRIES) && ENTRIES.length > 0,
    'the source-gate entry list is empty or not exported — this gate would be vacuous');

  const lf = (s) => s.replace(/\r\n/g, '\n');
  const src = lf(fs.readFileSync(APP, 'utf8'));
  const rotted = ENTRIES.filter((e) => !src.includes(lf(e.from))).map((e) => e.region);

  const unexpected = rotted.filter((r) => !KNOWN_ROTTED.has(r));
  assert.deepEqual(unexpected, [],
    'these source-gate anchors no longer match js/app.js, so the FINGERPRINT gates they defend '
    + 'have no runnable mutation evidence — and `tools/source-gate-sweep.mjs` exits 1 without '
    + 'anyone noticing:\n  ' + unexpected.join('\n  '));

  // A fixed rot must have its exemption removed, or the list rots in the other direction.
  const staleExemptions = [...KNOWN_ROTTED.keys()].filter((k) => !rotted.includes(k));
  assert.deepEqual(staleExemptions, [],
    'these entries are listed as KNOWN_ROTTED but their anchors match again — delete the '
    + 'exemption so a future rot is caught:\n  ' + staleExemptions.join('\n  '));
});

test('importing the source-gate sweep does not run it', async () => {
  // The CLI MUTATES js/app.js. If importing started a sweep, this suite would corrupt the
  // working tree — a worse version of the interrupted-sweep hazard, triggered by a test.
  const before = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  await import(pathToFileURL(path.join(ROOT, 'tools', 'source-gate-sweep.mjs')).href);
  assert.strictEqual(fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8'), before,
    'importing the source-gate sweep modified js/app.js');
  assert.ok(!fs.existsSync(path.join(ROOT, 'js', 'app.js.sgbak')),
    'importing the source-gate sweep left a backup behind — it ran');
});
