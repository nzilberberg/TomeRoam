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

// The construction plan's contract is EXACTLY these four fields. Assert it, so an added
// or dead field is caught, not silently dropped. (The earlier version whitelisted the
// four and returned a projection — which did the OPPOSITE of its comment: an extra field
// was dropped before deepEqual and passed. F7.)
const CONSTRUCTION_KEYS = ['decorations', 'incoming', 'outgoing', 'renderDestination'];
const projectStablePlan = (p) => {
  assert.deepEqual(Object.keys(p).sort(), CONSTRUCTION_KEYS,
    'the construction plan must carry EXACTLY its four contract fields — an added or dead field is drift');
  return {
    outgoing: p.outgoing,
    incoming: p.incoming,
    renderDestination: p.renderDestination,
    decorations: p.decorations.map((d) => ({ kind: d.kind, role: d.role, base: d.base })),
  };
};

// A registry entry is a screen-name kind representative; the two parameterized names
// (authorBooks/files) are only WELL-FORMED as descriptors when they carry their payload
// (author/book). Attach a representative one so the structural proof feeds the classifier
// real descriptors, not the malformed payload-less names §4.3 requires it to reject.
const wellFormed = (v) => v === 'authorBooks' ? { v, author: { ratingKey: 'rep' } }
  : v === 'files' ? { v, book: { ratingKey: 'rep' } } : { v };

const planFrom = (fv, tv) => projectStablePlan(
  Swipe.constructionPlanFor(Swipe.classifyTransition({ from: wellFormed(fv), to: wellFormed(tv) })));

// ---- classifyTransition: the normalization boundary --------------------------------

// The classification exposes ONLY the fields a stage-4 consumer reads: fromKind/toKind
// (constructionPlanFor) and decorations (start()). §3.3's sourceHost/destinationHost/
// sameBrowseHost are NOT emitted until the stage that first consumes them (no-dead-fields
// rule) — assert the exact key set so re-adding one before its consumer reddens here.
const CLASSIFICATION_KEYS = ['decorations', 'fromKind', 'toKind'];

test('classifyTransition derives kinds from the raw names and exposes only consumed fields', () => {
  // Well-formed parameterized descriptors: authorBooks needs an author, files a book
  // (a payload-less one is malformed — see the §4.3 rejection tests below).
  const c = Swipe.classifyTransition({ from: { v: 'authorBooks', author: { ratingKey: 'A' } }, to: { v: 'files', book: { ratingKey: 'B' } } });
  assert.equal(c.fromKind, 'browse');
  assert.equal(c.toKind, 'browse');
  assert.deepEqual(Object.keys(c).sort(), CLASSIFICATION_KEYS,
    'the classification must expose EXACTLY its consumed fields — a dead field for a future stage reddens here');

  const d = Swipe.classifyTransition({ from: { v: 'home' }, to: { v: 'options' } });
  assert.equal(d.fromKind, 'home');
  assert.equal(d.toKind, 'overlay');
  assert.deepEqual(Object.keys(d).sort(), CLASSIFICATION_KEYS);
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

// F3 / O1 — classifyTransition's own output is DEEP-frozen (array + each decoration). A
// shallow freeze left the decorations array mutable: a consumer push/edit corrupted it.
test('the classification decorations are deep-frozen — a push cannot corrupt them', () => {
  const c = Swipe.classifyTransition({ from: { v: 'nowplaying' }, to: { v: 'books' } });
  assert.ok(Object.isFrozen(c.decorations), 'the decorations array must be frozen');
  assert.ok(Object.isFrozen(c.decorations[0]), 'each decoration must be frozen');
  try { c.decorations.push({ kind: 'x' }); } catch (_) { /* strict throws; non-strict no-op */ }
  try { c.decorations[0].base = 'tampered'; } catch (_) { /* idem */ }
  assert.equal(c.decorations.length, 1, 'a push onto the frozen array must not take effect');
  assert.equal(c.decorations[0].base, 'outgoing', 'the decoration must not have been corrupted');
});

// F-i (.228 review) — constructionPlanFor is INDEPENDENTLY deep-immutable: its contract
// holds on a DIRECTLY-built classification, not only on the composed path where
// classifyTransition already froze the input. It clones the caller's decorations, so the
// caller's own array is never frozen in place and the plan cannot be mutated through.
test('constructionPlanFor is independently deep-immutable, without leaning on classifyTransition', () => {
  const callerDecos = [{ kind: 'now-playing-pill', role: 'mover', base: 'outgoing' }];
  const p = Swipe.constructionPlanFor({ fromKind: 'home', toKind: 'browse', decorations: callerDecos });
  assert.ok(Object.isFrozen(p.decorations), 'the plan decorations array must be frozen');
  assert.ok(Object.isFrozen(p.decorations[0]), 'each plan decoration must be frozen');
  assert.notEqual(p.decorations, callerDecos, 'the plan must clone, not share, the caller array');
  assert.ok(!Object.isFrozen(callerDecos), 'and must NOT freeze the caller-owned array in place');
  try { p.decorations.push({ kind: 'x' }); } catch (_) { /* strict throws; non-strict no-op */ }
  try { p.decorations[0].base = 'tampered'; } catch (_) { /* idem */ }
  assert.equal(p.decorations.length, 1, 'a push onto the frozen plan array must not take effect');
  assert.equal(p.decorations[0].base, 'outgoing', 'the plan decoration must not have been corrupted');
});

// F4 / I16 — DESCRIPTOR scenarios, not just screen names. The 132-pair proof above skips
// f.v === t.v and lists one entry per NAME, so identity-varying and malformed descriptor
// cases are invisible to it; §4.3 requires them covered explicitly.
test('every descriptor scenario (§4.3) yields the plan it fixes, or is rejected with a named reason', async () => {
  const { DESCRIPTOR_SCENARIOS } = await loadSpec();
  let ran = 0;
  for (const s of DESCRIPTOR_SCENARIOS) {
    if (s.documentedImpossible) continue;   // a ruling, not a runnable input (§15 gate pins it)
    if (s.throws) {
      assert.throws(() => Swipe.constructionPlanFor(Swipe.classifyTransition(s.input)),
        /malformed .* descriptor|unknown screen/, s.name);
    } else {
      assert.deepEqual(
        projectStablePlan(Swipe.constructionPlanFor(Swipe.classifyTransition(s.input))),
        s.expectedConstruction, s.name);
    }
    ran++;
  }
  assert.ok(ran >= 8, `the scenario fixture must exercise real inputs, not only rulings (ran ${ran})`);
});

// F6 / §3.3 — no default branch on EITHER kind. classifyTransition guards toKind via its
// throw and fromKind is unreachably-bad through it (kindOf throws first), but the pure
// constructionPlanFor must still reject a directly-supplied bad fromKind rather than
// absorb it into 'real-source'.
test('constructionPlanFor throws on an unhandled source kind, not just destination kind', () => {
  assert.throws(() => Swipe.constructionPlanFor({ fromKind: 'nonsense', toKind: 'browse', decorations: [] }),
    /unhandled source kind/);
  assert.throws(() => Swipe.constructionPlanFor({ fromKind: 'browse', toKind: 'nonsense', decorations: [] }),
    /unhandled destination kind/);
});

// ── STAGE 5 (RED-FIRST, Curie 2026-07-23) — the reintroduced host fields ──────────────
// PLAN-swipe-stage5.md F2/F1-r. Build .229 REMOVED sourceHost/destinationHost from
// classifyTransition (no consumer then; the no-dead-fields rule — see CLASSIFICATION_KEYS
// above). Stage 5 reintroduces them WITH a consumer (buildConstruction reads them to select
// the real source element and the render host). These two tests are the red-first target:
// they fail today because only three keys are emitted, and go green when Brunel emits the
// two host fields with the projection the frozen spec fixes. In that same commit Brunel also
// flips the CLASSIFICATION_KEYS assertion above and contract-function-gate.test.js:24 to the
// five-key set, and removes these todo markers. Tracked: PolicyLedger KR-swipe-stage5-classify-hosts.
const CLASSIFICATION_KEYS_S5 = ['decorations', 'destinationHost', 'fromKind', 'sourceHost', 'toKind'];
const KR_HOSTS = 'Stage 5 unbuilt — classifyTransition does not re-emit '
  + 'sourceHost/destinationHost yet (removed in .229 as dead fields). Red-first; goes green when '
  + 'Brunel emits the projected host fields. Tracked: PolicyLedger KR-swipe-stage5-classify-hosts.';

test('classifyTransition emits exactly the five stage-5 fields including the two hosts', { todo: KR_HOSTS }, () => {
  const c = Swipe.classifyTransition({ from: { v: 'home' }, to: { v: 'books' } });
  assert.deepEqual(Object.keys(c).sort(), CLASSIFICATION_KEYS_S5,
    'stage 5 re-adds sourceHost/destinationHost — the classification must carry exactly the five fields');
  assert.equal(c.sourceHost, 'in-flow', 'a home source is in-flow');
  assert.equal(c.destinationHost, 'browse-host', 'a browse destination is the browse-host');
});

test('every registry pair projects the sourceHost/destinationHost the frozen spec fixes', { todo: KR_HOSTS }, async () => {
  const spec = await loadSpec();
  const gen = await loadGen();
  const screens = gen.registry();
  const hostsByKind = new Map(spec.STRUCTURAL_CASES.map((c) => [c.from + '->' + c.to, c.expectedHosts]));
  const wrong = [];
  let checked = 0;
  for (const f of screens) {
    for (const t of screens) {
      if (f.v === t.v) continue;
      const expected = hostsByKind.get(f.kind + '->' + t.kind);
      assert.ok(expected, `the spec has no expectedHosts for ${f.kind}->${t.kind}`);
      const c = Swipe.classifyTransition({ from: wellFormed(f.v), to: wellFormed(t.v) });
      if (c.sourceHost !== expected.sourceHost || c.destinationHost !== expected.destinationHost) {
        wrong.push(`${f.v}->${t.v} got {${c.sourceHost},${c.destinationHost}} want {${expected.sourceHost},${expected.destinationHost}}`);
      }
      checked++;
    }
  }
  assert.deepEqual(wrong, [], `host projection disagrees with the spec:\n  ${wrong.slice(0, 6).join('\n  ')}`);
  assert.equal(checked, screens.length * (screens.length - 1), 'every ordered pair must be proven');
});
