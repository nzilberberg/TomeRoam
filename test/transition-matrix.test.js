// GATE — the swipe transition inventory is DERIVED, and its derivation is pinned.
//
// WHY. The inventory was hand-written twice in PLAN-swipe-reveal.txt and was wrong both
// times, by an author who had read the branch conditions carefully each time:
//   draft 1  "a pane exists for exactly two transition shapes"
//   draft 2  "14 of 30, and here they are"   (also presented as exhaustive)
// The truth is 8 structural combinations over a 12-screen registry — 132 ordered pairs,
// 27 of which build a pane. A ten-line script produced that in seconds after careful
// reading had failed twice. Reading does not scale past about three interacting
// conditions; prose inventories in this codebase should be treated as guesses.
//
// TWO THINGS ARE GUARDED:
//   1. the committed file matches what the generator produces right now, so it cannot
//      drift or be edited by hand;
//   2. the region of js/app.js the predicate MIRRORS is fingerprinted. That mirroring
//      is the one weak link in the whole scheme — the generator does not execute
//      app.js, it reimplements its branch conditions. If those conditions change, the
//      fingerprint changes and this test fails LOUDLY, which is the only honest
//      behaviour: it does not mean the code is wrong, it means the predicate must be
//      re-verified before the generated file can be trusted again.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

const GENERATED = path.join(ROOT, 'docs', 'transition-matrix.generated.txt');

// The app.js branch region as it stood when the predicate was verified against it,
// line by line, on 2026-07-20. Update ONLY together with a re-verification.
const VERIFIED_FINGERPRINT = '2cf44185fe7497bc';

const load = () => import(pathToFileURL(path.join(ROOT, 'tools', 'gen-transition-matrix.mjs')).href);
const lf = (s) => s.replace(/\r\n/g, '\n');

test('the committed inventory is exactly what the generator produces', async () => {
  const gen = await load();
  const committed = lf(fs.readFileSync(GENERATED, 'utf8'));
  assert.equal(lf(gen.render()), committed,
    'docs/transition-matrix.generated.txt is stale or was hand-edited. '
    + 'Run: node tools/gen-transition-matrix.mjs');
});

test('the predicate still mirrors the js/app.js branch region it was derived from', async () => {
  const gen = await load();
  assert.equal(gen.sourceFingerprint(), VERIFIED_FINGERPRINT,
    'js/app.js\'s transition branches CHANGED. The generator reimplements those '
    + 'conditions rather than executing them, so the inventory can no longer be '
    + 'trusted. Re-verify tools/gen-transition-matrix.mjs planFor() against '
    + 'js/app.js start(), regenerate, and update VERIFIED_FINGERPRINT in the same '
    + 'commit — never update the constant alone.');
});

test('the registry is derived from the real source, not hand-listed', async () => {
  const gen = await load();
  const screens = gen.registry();
  const names = screens.map((s) => s.v);
  // Adding a sixth settings sub-screen must flow through automatically; if this ever
  // has to be edited by hand, the derivation has been broken.
  const nav = lf(fs.readFileSync(path.join(ROOT, 'js', 'nav.js'), 'utf8'));
  const subs = /const SETTINGS_SUBS = \[([^\]]*)\]/.exec(nav)[1]
    .split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  for (const s of subs) {
    assert.ok(names.includes(s), `SETTINGS_SUBS has ${s} but the registry does not`);
    assert.equal(screens.find((x) => x.v === s).kind, 'overlay',
      `${s} is a settings sub-screen and must classify as an overlay`);
  }
  assert.ok(names.includes('authorBooks'),
    'authorBooks is a browse-family descriptor and was missing from draft 1/2 of the plan');
  assert.ok(screens.length >= 12,
    `registry collapsed to ${screens.length} screens — the derivation is probably broken`);
});

test('a pane is built exactly when the rules say, and nowhere else', async () => {
  const gen = await load();
  const screens = gen.registry();
  const wrong = [];
  for (const f of screens) {
    for (const t of screens) {
      if (f.v === t.v) continue;
      const p = gen.planFor(f, t);
      // The two rules, stated independently of the implementation under test:
      //   GHOST    iff source is not an overlay AND destination is browse-family
      //   SNAPSHOT iff destination is home
      const expectGhost = f.kind !== 'overlay' && t.kind === 'browse';
      const expectSnap = t.kind === 'home';
      if ((p.outgoing === 'GHOST-pane') !== expectGhost) wrong.push(`${f.v}->${t.v} ghost`);
      if ((p.incoming === 'SNAPSHOT-pane') !== expectSnap) wrong.push(`${f.v}->${t.v} snapshot`);
      if (p.pane !== (expectGhost || expectSnap)) wrong.push(`${f.v}->${t.v} pane`);
    }
  }
  assert.deepEqual(wrong, [], `plan disagrees with the stated rules: ${wrong.slice(0, 8).join(', ')}`);
});
