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

const load = () => import(pathToFileURL(path.join(ROOT, 'tools', 'gen-transition-matrix.mjs')).href);
const loadSpec = () => import(pathToFileURL(path.join(ROOT, 'test', 'fixtures', 'swipe-plan-spec.mjs')).href);
const lf = (s) => s.replace(/\r\n/g, '\n');

test('the committed inventory is exactly what the generator produces', async () => {
  const gen = await load();
  const committed = lf(fs.readFileSync(GENERATED, 'utf8'));
  assert.equal(lf(gen.render()), committed,
    'docs/transition-matrix.generated.txt is stale or was hand-edited. '
    + 'Run: node tools/gen-transition-matrix.mjs');
});

// The MIRROR IS RETIRED (stage 4). There used to be a test here pinning a fingerprint of
// js/app.js's branch region, because the generator reimplemented those conditions and the
// pin proved the two copies had not drifted. js/swipe.js now owns that decision and
// test/fixtures/swipe-plan-spec.mjs is its independent contract; test/swipe-transition.test.js
// checks the real production functions against the contract. There is no second copy of the
// branch logic, so there is nothing to fingerprint and no test to keep here.

// NAME CORRECTED after an external review of .218: this checks the DERIVED half only.
// The other seven screens are hand-listed in the generator; the screen-name census in
// test/swipe-model.test.js is what guards those. The old name ('derived from the real
// source, not hand-listed') claimed more than the implementation delivers.
test('the SETTINGS-SUB half of the registry is derived from nav.js, not hand-listed', async () => {
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

// SPEC SELF-CONSISTENCY. The frozen contract (test/fixtures/swipe-plan-spec.mjs) is
// hand-written, so a typo there could quietly bless the wrong behaviour AND the production
// test would follow it. This asserts the eight structural expectations obey the two rules
// stated in prose, independently of any implementation — a hand-error in the spec fails
// here before it can propagate. (Production is checked against the spec separately in
// test/swipe-transition.test.js.)
test('the frozen spec builds a pane exactly when the GHOST/SNAPSHOT rules say', async () => {
  const spec = await loadSpec();
  const wrong = [];
  for (const c of spec.STRUCTURAL_CASES) {
    //   GHOST    iff source is not an overlay AND destination is browse
    //   SNAPSHOT iff destination is home
    const expectGhost = c.from !== 'overlay' && c.to === 'browse';
    const expectSnap = c.to === 'home';
    const ec = c.expectedConstruction;
    if ((ec.outgoing === 'app-ghost') !== expectGhost) wrong.push(`${c.from}->${c.to} ghost`);
    if ((ec.incoming === 'home-snapshot') !== expectSnap) wrong.push(`${c.from}->${c.to} snapshot`);
    if (spec.paneOf(ec) !== (expectGhost || expectSnap)) wrong.push(`${c.from}->${c.to} pane`);
    // renderDestination is 'browse-host' exactly when the destination is browse.
    if ((ec.renderDestination === 'browse-host') !== (c.to === 'browse')) wrong.push(`${c.from}->${c.to} render`);
  }
  assert.deepEqual(wrong, [], `the spec disagrees with the stated rules: ${wrong.slice(0, 8).join(', ')}`);
  assert.equal(spec.STRUCTURAL_CASES.length, 8, 'there are eight structural transitions (home->home is not one)');
});
