// PROOF — the real js/swipe.js classifier/planner matches the frozen spec, EXHAUSTIVELY
// over the whole registry (PLAN-swipe-reveal.md stage 4, "prove every registry pair").
//
// The three-layer scheme (see test/fixtures/swipe-plan-spec.mjs): the SPEC is the
// hand-written contract, js/swipe.js is the production implementation, and this file
// compares one against the other. It does NOT reimplement the branch conditions — the
// only rule it applies is the mechanical one that selects which spec expectation a given
// input maps to (structural case by kind, NP decoration by endpoint). All OUTCOME data
// lives in the spec; a bug in swipe.js changes production output away from the spec and
// fails here.
//
// This replaces the old fingerprint-pinned MIRROR: the generator used to reimplement
// start()'s branches and a hash proved the two copies had not drifted. There is now one
// decision (js/swipe.js) and one contract (the spec); nothing to drift.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./dom-fixture.js');

const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));
const loadSpec = () => import(pathToFileURL(path.join(ROOT, 'test', 'fixtures', 'swipe-plan-spec.mjs')).href);
const loadGen = () => import(pathToFileURL(path.join(ROOT, 'tools', 'gen-transition-matrix.mjs')).href);

// Retain only the stable contract fields, so an added field can't silently pass.
const projectStablePlan = (p) => ({
  outgoing: p.outgoing,
  incoming: p.incoming,
  renderDestination: p.renderDestination,
  decorations: p.decorations.map((d) => ({ kind: d.kind, role: d.role, base: d.base })),
});

const planFrom = (fv, tv) => projectStablePlan(
  Swipe.constructionPlanFor(Swipe.classifyTransition({ from: { v: fv }, to: { v: tv } })));

// ---- classifyTransition: the normalization boundary --------------------------------

test('classifyTransition derives kinds, hosts and same-browse-host from the raw names', () => {
  const c = Swipe.classifyTransition({ from: { v: 'authorBooks' }, to: { v: 'files' } });
  assert.equal(c.fromKind, 'browse');
  assert.equal(c.toKind, 'browse');
  assert.equal(c.sourceHost, '#browse');
  assert.equal(c.destinationHost, '#browse');
  assert.equal(c.sameBrowseHost, true, 'browse->browse shares the #browse host');

  const d = Swipe.classifyTransition({ from: { v: 'home' }, to: { v: 'options' } });
  assert.equal(d.fromKind, 'home');
  assert.equal(d.toKind, 'overlay');
  assert.equal(d.sourceHost, '#home');
  assert.equal(d.destinationHost, 'overlay');
  assert.equal(d.sameBrowseHost, false);
});

test('classifyTransition places the Now Playing decoration by which endpoint is NP', async () => {
  const { NP_DECORATION } = await loadSpec();
  assert.deepEqual(Swipe.classifyTransition({ from: { v: 'nowplaying' }, to: { v: 'books' } }).decorations,
    [NP_DECORATION.source]);
  assert.deepEqual(Swipe.classifyTransition({ from: { v: 'books' }, to: { v: 'nowplaying' } }).decorations,
    [NP_DECORATION.destination]);
  assert.deepEqual(Swipe.classifyTransition({ from: { v: 'books' }, to: { v: 'authors' } }).decorations,
    [], 'no NP endpoint, no decoration');
});

test('classifyTransition throws on an unknown screen — no default kind', () => {
  assert.throws(() => Swipe.classifyTransition({ from: { v: 'wat' }, to: { v: 'books' } }), /unknown screen/);
});

// ---- constructionPlanFor: EVERY registry pair, against the frozen spec --------------

test('every ordered registry pair yields exactly the construction plan the spec fixes', async () => {
  const spec = await loadSpec();
  const gen = await loadGen();
  const screens = gen.registry();
  const structural = new Map(spec.STRUCTURAL_CASES.map((c) => [c.from + '->' + c.to, c.expectedConstruction]));

  const wrong = [];
  let checked = 0;
  for (const f of screens) {
    for (const t of screens) {
      if (f.v === t.v) continue;                       // v===v is not a transition
      const base = structural.get(f.kind + '->' + t.kind);
      assert.ok(base, `the spec has no structural case for ${f.kind}->${t.kind}`);
      // Select the NP decoration purely from the input (outcome shape is spec data).
      const decorations = f.v === spec.NP_SCREEN ? [spec.NP_DECORATION.source]
        : t.v === spec.NP_SCREEN ? [spec.NP_DECORATION.destination]
        : [];
      const expected = { ...base, decorations };
      let got;
      try { got = planFrom(f.v, t.v); } catch (e) { wrong.push(`${f.v}->${t.v} THREW ${e.message}`); continue; }
      try { assert.deepEqual(got, expected); }
      catch { wrong.push(`${f.v}->${t.v} got ${JSON.stringify(got)} want ${JSON.stringify(expected)}`); }
      checked++;
    }
  }
  assert.deepEqual(wrong, [], `production disagrees with the spec:\n  ${wrong.slice(0, 6).join('\n  ')}`);
  assert.equal(checked, screens.length * (screens.length - 1),
    `every ordered pair must be proven; checked ${checked} of ${screens.length * (screens.length - 1)}`);
});

test('the named modifier cases hold, including the rejection contract', async () => {
  const spec = await loadSpec();
  for (const c of spec.MODIFIER_CASES) {
    if (c.throws) {
      assert.throws(() => Swipe.constructionPlanFor(Swipe.classifyTransition(c.input)), c.name);
    } else {
      const got = projectStablePlan(Swipe.constructionPlanFor(Swipe.classifyTransition(c.input)));
      assert.deepEqual(got, c.expectedConstruction, c.name);
    }
  }
});

test('the construction plan is frozen — a consumer cannot mutate a shared plan', () => {
  const p = Swipe.constructionPlanFor(Swipe.classifyTransition({ from: { v: 'books' }, to: { v: 'home' } }));
  assert.ok(Object.isFrozen(p), 'the plan must be frozen so a downstream stage cannot corrupt a shared plan');
  try { p.outgoing = 'tampered'; } catch (_) { /* strict callers throw; non-strict no-op */ }
  assert.equal(p.outgoing, 'real-source', 'a write to the frozen plan must not take effect');
});
