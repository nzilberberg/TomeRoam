// The Stage-5 `Swipe.buildConstruction` seam (recipe layer), authored red-first by Curie
// (2026-07-23) from PLAN-swipe-stage5.md §8, greened by Brunel's build.
// See Claude/Curie/swipe-stage5-test-design-2026-07-23.md.
//
// WHAT THIS DRIVES. Stage 5 moved the two capture recipes (ghostApp/snapshotHome), the real
// source resolution, and the NP decoration builder out of js/app.js's start() into ONE
// construction surface in js/swipe.js, behind an injected `env`, returning a Construction
// object. These tests drive that surface directly.
//
// WHY A RECIPE (fake-env) LAYER and not the app-harness. The whole point of the extraction is
// that the moved builders become drivable through an injected seam with NO ambient DOM — which
// is exactly what today's private, app-embedded builders cannot be tested for. Each test builds
// `env.document` from a fresh JSDOM of the REAL index.html (dom-fixture doctrine: never a
// hand-rolled DOM — a wrong mental model must FAIL here) and POISONS ambient document/window/
// Element/getComputedStyle, so a bare ambient read reddens instead of silently working.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { readRoot, ROOT } = require('./dom-fixture.js');

const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));

// The exact contract shapes from plan §3. Asserted by sorted key set so a missing OR a
// dead/extra field both redden (§4.11 exact-key discipline). The ratified return is TWO live
// keys: 'classification' is derived and consumed INTERNALLY (never returned), and the 'plan'
// WRAPPER is dropped — of its fields only 'decorations' has an L3 consumer, so it is HOISTED
// to the top level and PROJECTED to {kind, base} (the dead 'role' leaf stripped, F2). See
// PLAN-swipe-stage5.md §3, Poirot F1, Charpy r5 F1.
//
// TWO fields have since been RETIRED, each with the mechanism it described.
// 'sourceWasClobbered' (a RUNTIME-observed abort-re-render byproduct through stage 6c) went
// at stage 6d. 'capture' goes at PLAN-swipe-declone.md Stage 2 (§6): its only producer was
// the app-ghost recipe, and no transition builds a copy of a view any more, so a key that
// could only ever be null is a dead field. It is REMOVED, not nulled — the exact-key
// assertion here is what makes that difference observable, and NOGHOSTATALL in
// test/swipe-declone-stage2-construction.test.js asserts its absence directly, over all
// eight structural cases.
const CONSTRUCTION_KEYS = ['decorations', 'movers'];
const MOVERS_KEYS = ['decoration', 'incoming', 'outgoing'];
const MOVER_KEYS = ['element', 'ownership', 'slot'];
// The returned decoration descriptor is projected to {kind, base}; the classification's `role`
// leaf is stripped at the seam (no L3 consumer reads it — plan §3, F2).
const DECORATION_PROJECTION_KEYS = ['base', 'kind'];

// Ambient globals a correctly-relocated builder must NEVER read (plan §7): everything goes
// through `env`. Poisoned around the buildConstruction call so a bare read throws loudly.
const AMBIENT = ['document', 'window', 'Element', 'getComputedStyle', '$'];
function withPoisonedAmbient(fn) {
  const saved = Object.create(null);
  const had = Object.create(null);
  for (const k of AMBIENT) {
    had[k] = Object.prototype.hasOwnProperty.call(global, k);
    saved[k] = global[k];
    Object.defineProperty(global, k, {
      configurable: true,
      get() { throw new Error(`STAGE5 ambient read: "${k}" — buildConstruction must use env, not a global`); },
    });
  }
  try { return fn(); }
  finally {
    for (const k of AMBIENT) { delete global[k]; if (had[k]) global[k] = saved[k]; }
  }
}

// A fresh env whose document is the REAL index.html. `sourceEl`/`navPill`/`renderDestination`
// are controllable fakes that RECORD their calls so ordering (F7a) is observable.
function mkEnv(opts = {}) {
  // No `url` option: the recipe seam never touches localStorage, so an opaque origin is fine
  // (and it keeps a `//` out of the scanned test source the policy-ledger gate parses).
  const dom = new JSDOM(readRoot('index.html'));
  const doc = dom.window.document;
  // The running app shows the library; index.html ships it `.hidden`, which the ghost's
  // `.hidden/.parked` prune would strip whole. Un-hide it so a clone has real content.
  const lib = doc.getElementById('library'); if (lib) lib.classList.remove('hidden');
  const browse = doc.getElementById('browse'); if (browse) browse.classList.remove('hidden');
  const events = [];
  const env = {
    document: doc,
    scrollY: () => (opts.scrollY == null ? 0 : opts.scrollY),
    sourceEl: (host, v) => {
      events.push({ call: 'sourceEl', host, v });
      if (opts.sourceEl) return opts.sourceEl(host, v, doc);
      // Default: overlay source resolves the overlay id; in-flow resolves #home/#browse.
      if (host === 'overlay') return doc.getElementById(v);
      return doc.getElementById(v === 'home' ? 'home' : 'browse');
    },
    navPill: () => { events.push({ call: 'navPill' }); return doc.querySelector('.np-actions'); },
    renderDestination: (dest, host) => {
      // Record whether the outgoing pane already exists at render time (F7a ordering).
      events.push({ call: 'renderDestination', host, sourceResolvedAtCall: events.some((e) => e.call === 'sourceEl') });
      if (opts.renderDestination) return opts.renderDestination(dest, host, doc);
      return doc.getElementById('browse');
    },
  };
  return { env, doc, win: dom.window, dom, events };
}

// Give a set of jsdom elements a controllable getAnimations, so copyAnimPhase (F4b) has a
// phase to seek. jsdom ships no Web Animations API, so this models the one runtime state the
// clone must inherit. currentTime lives on an expando the getter/setter share.
function enableAnims(win, ct) {
  win.Element.prototype.getAnimations = function getAnimations() {
    const el = this;
    return [{ get currentTime() { return el.__ct; }, set currentTime(v) { el.__ct = v; } }];
  };
  return (els) => els.forEach((el) => { el.__ct = ct; });
}

// Inject cover images (with data-art, the art-loader marker) into a container.
function addCovers(doc, container, n) {
  const made = [];
  for (let i = 0; i < n; i++) {
    const img = doc.createElement('img');
    img.className = 'cover';
    img.setAttribute('data-art', 'k' + i);
    container.appendChild(img);
    made.push(img);
  }
  return made;
}

const desc = (v, payload) => ({ v, ...(payload || {}) });
const build = (from, dest, ctx) => withPoisonedAmbient(() => Swipe.buildConstruction(from, dest, ctx.env));

// ── F1.1 — the exact four-key Construction contract shape (2026-07-24 §3 revision) ───
test('buildConstruction returns the exact Construction contract shape', () => {
  const ctx = mkEnv();
  const c = build(desc('home'), desc('books'), ctx);
  assert.deepEqual(Object.keys(c).sort(), CONSTRUCTION_KEYS,
    'Construction must carry EXACTLY its two fields {decorations, movers} (plan §3, F1; '
    + 'stage 6d retired sourceWasClobbered and declone Stage 2 retired capture) — '
    + 'classification is derived+consumed internally and the plan wrapper is dropped');
  assert.deepEqual(Object.keys(c.movers).sort(), MOVERS_KEYS, 'movers must be {outgoing, incoming, decoration}');
  assert.ok(!('classification' in c),
    '`classification` must NOT be a return member — it is derived internally and consumed there (plan §3, F1)');
  assert.ok(!('plan' in c),
    'the `plan` wrapper must NOT be a return member — its one live field, decorations, is hoisted (plan §3, F1)');
});

// ── F1/F2 — decorations HOISTED to the top level, PROJECTED to {kind, base} ──────────
test('decorations is a top-level projected {kind, base} list with the role leaf stripped', () => {
  // A non-NP transition carries an empty decorations list at the top level (not on a wrapper).
  const plain = build(desc('home'), desc('books'), mkEnv());
  assert.ok(Array.isArray(plain.decorations),
    'decorations is a top-level array on every construction (hoisted off the dropped plan wrapper — plan §3, F1)');
  assert.equal(plain.decorations.length, 0, 'home->books has no NP endpoint, so decorations is empty');

  // An NP-source transition carries exactly one decoration, projected to {kind, base}.
  const np = build(desc('nowplaying'), desc('books'), mkEnv());
  assert.equal(np.decorations.length, 1, 'an NP endpoint yields exactly one decoration descriptor');
  assert.deepEqual(Object.keys(np.decorations[0]).sort(), DECORATION_PROJECTION_KEYS,
    'the returned decoration is projected to {kind, base}; the classification role leaf is stripped (plan §3, F2)');
  assert.equal(np.decorations[0].kind, 'now-playing-pill', 'the decoration kind survives the projection');
  assert.equal(np.decorations[0].base, 'outgoing', 'NP-as-source bases the decoration at the outgoing slot');
  assert.ok(!('role' in np.decorations[0]),
    'the dead `role` leaf must NOT cross the seam — no L3 consumer reads it (plan §3, F2)');
});

// ── F1.1 — the mover EXTERNAL shape, not the production {el,base} ────────────────────
// WORDING CORRECTED (PLAN-swipe-declone-stage2-subtraction.md §6 Compatibility U10): `own`
// was L3's third production key; §6 D12 deletes it (no reader survives the pass), so the
// production shape L3 maps onto is now {el,base}, not {el,base,own}. The `!('own' in m)`
// check below is UNCHANGED and stays meaningful: the SEAM must never emit `own` regardless
// of whether L3 still maps a same-named key.
test('movers carry the external {element,ownership,slot} shape, not the production keys', () => {
  const ctx = mkEnv();
  const c = build(desc('home'), desc('books'), ctx);
  for (const which of ['outgoing', 'incoming']) {
    const m = c.movers[which];
    assert.deepEqual(Object.keys(m).sort(), MOVER_KEYS, `${which} mover must be {element,ownership,slot}`);
    assert.ok(!('el' in m) && !('base' in m) && !('own' in m),
      `${which} mover must NOT emit the production el/base keys, or the retired own key — L3 owns that mapping`);
    assert.equal(m.slot, which, `${which} mover slot must be "${which}"`);
  }
  // Stage 1 (PLAN-swipe-declone.md §5.1): home->browse no longer builds an owned pane —
  // the real #home is the outgoing mover directly. Only browse->browse still ghosts.
  assert.equal(c.movers.outgoing.ownership, 'borrowed-real', 'home->browse outgoing is the real #home');
  assert.equal(c.movers.incoming.ownership, 'borrowed-real', 'home->browse incoming is the real #browse');
});

// ── F1c — no owned pane ⇒ no capture KEY, both sides borrowed-real ───────────────────
test('overlay->overlay builds no owned pane: there is no capture key and both sides are borrowed-real', () => {
  const ctx = mkEnv({ renderDestination: (d, host, doc) => doc.getElementById('nowplaying') });
  const c = build(desc('options'), desc('nowplaying'), ctx);
  assert.ok(!('capture' in c), 'no transition builds an owned pane, so capture is not a key at all');
  assert.equal(c.movers.outgoing.ownership, 'borrowed-real', 'the overlay source moves as its real element');
  assert.equal(c.movers.incoming.ownership, 'borrowed-real', 'the overlay destination is its real element');
});

// ── F2-r (recipe) — EVERY transition is pane-less; the source's own scroll rides with it ─
// The browse→browse half used to assert an app-ghost 'capture' carrying 'ghostY', the source
// scroll baked into the clone's translateY. That number existed ONLY because a clone has no
// scroll of its own (plan §3 audit). The real outgoing element HAS its scrollTop, so the
// offset is carried inherently and there is nothing to capture — which is exactly why the
// field is gone rather than moved.
test('no transition builds an owned pane: both sides are borrowed-real and nothing is captured', () => {
  const pairCtx = mkEnv();
  pairCtx.doc.getElementById('browse').scrollTop = 137;
  const pair = build(desc('books'), desc('authors', { author: { ratingKey: 'A' } }), pairCtx);
  assert.ok(!('capture' in pair), 'browse->browse carries no capture key — no copy is built to bake a scroll into');
  assert.equal(pair.movers.outgoing.ownership, 'borrowed-real', 'the outgoing browse page is a borrowed-real mover');
  assert.equal(pair.movers.incoming.ownership, 'borrowed-real', 'the incoming browse page is a borrowed-real mover');
  assert.equal(pairCtx.doc.querySelectorAll('.nav-ghost').length, 0, 'and no .nav-ghost wrapper is mounted at all');

  // Stage 6i (PLAN-swipe-noswap-home.md, option (a)): browse→home builds NO owned pane —
  // the outgoing real #browse and the incoming real #home are both borrowed-real.
  const homeCtx = mkEnv();
  const home = build(desc('books'), desc('home'), homeCtx);
  assert.ok(!('capture' in home), 'browse→home is pane-less — no home-snapshot is built (Stage 6i)');
  assert.equal(home.movers.outgoing.ownership, 'borrowed-real', 'the outgoing real #browse is a borrowed-real mover');
  assert.equal(home.movers.incoming.ownership, 'borrowed-real', 'the incoming real #home is a borrowed-real mover');
});

// ── F4a — driven with NO ambient DOM ─────────────────────────────────────────────────
// The DOM-free-at-load guarantee is unchanged by PLAN-swipe-declone.md Stage 2 and is now the
// whole of this cell: no view pane is built any more, so the fixture drives an NP transition,
// where the one surviving builder (npPillClone — a navbar PILL, not a view) still touches the
// document, and proves it reaches it ONLY through env.
test('buildConstruction runs with no ambient document/window and builds through env.document', () => {
  const ctx = mkEnv();
  // withPoisonedAmbient throws on any global document/window/Element/getComputedStyle read.
  const c = build(desc('nowplaying'), desc('books'), ctx);
  assert.equal(ctx.doc.querySelectorAll('.np-pill-float').length, 1,
    'the owned decoration is mounted into env.document.body, reached only through env');
  assert.ok(c.movers.outgoing.element, 'the outgoing mover carries its resolved element');

  // And a plain view transition touches the document only through env's resolvers.
  const plain = build(desc('books'), desc('authors', { author: { ratingKey: 'A' } }), mkEnv());
  assert.ok(plain.movers.outgoing.element && plain.movers.incoming.element,
    'both view movers resolve through env with no ambient DOM read');
});

// F6 (the recipe layer's abort-re-render byproduct) is RETIRED by PLAN-swipe-stage6d.md
// §2/§9: `buildConstruction` no longer computes a same-browse-host DOM-identity check at
// all — the abort re-render decision is now the declared, pure `Swipe.finalizationPlanFor
// (classification).abortRender`, keyed on `fromKind`/`toKind` alone. Its intent (a
// browse->browse abort re-renders the source; a home->browse abort does not) is folded
// into cells FP (the oracle, test/swipe-stage6d.test.js) and AB (the real-DOM abort,
// same file) — this recipe-layer test has no successor here because there is no longer a
// recipe-layer byproduct to assert on.

// ── F7a — the outgoing mover is RESOLVED before env.renderDestination is invoked ──────
// PRESERVED, with its OBSERVABLE migrated (PLAN-swipe-declone.md §9 item 1). The ordering
// itself is unchanged and still correctness; what changed is what it protects. It used to be
// proved by counting mounted ghosts, and no ghost is mounted any more. The ordering is now
// visible as the CALL ORDER at the seam: env.sourceEl before env.renderDestination.
//
// And its GROUND is restated, because the wrong reason teaches the wrong thing. At HEAD the
// ordering protected the source #browse from being clobbered by the mid-drag render. After
// Stage 2 the source resolves through a DESCRIPTOR-KEYED page lookup, which returns the
// identical node before or after the render — so what the ordering now requires is only that
// the source page still be in the cache, which the eviction policy guarantees for the whole
// gesture (plan §11).
test('the outgoing mover is resolved before env.renderDestination is ever called', () => {
  const ctx = mkEnv();
  build(desc('books'), desc('authors', { author: { ratingKey: 'A' } }), ctx);
  const renderCalls = ctx.events.filter((e) => e.call === 'renderDestination');
  assert.equal(renderCalls.length, 1, 'a browse destination renders exactly once');
  assert.ok(renderCalls[0].sourceResolvedAtCall,
    'the outgoing mover must already be resolved when renderDestination runs (plan §6 step 5, §9 item 1)');
  const order = ctx.events.filter((e) => e.call === 'sourceEl' || e.call === 'renderDestination').map((e) => e.call);
  assert.deepEqual(order, ['sourceEl', 'renderDestination'],
    'the seam resolves the source, THEN renders the destination — never the other way round');
});

// ── npPill — the NP decoration recipe ───────────────────────────────────────────────
test('the NP pill decoration is cloned, stripped, classed, and slotted by endpoint', () => {
  // NP as SOURCE (nowplaying -> browse): decoration based at the outgoing slot.
  const srcCtx = mkEnv();
  srcCtx.doc.body.appendChild(Object.assign(srcCtx.doc.createElement('div'),
    { className: 'np-pill-float' }));   // a STALE float that the recipe must remove
  const src = build(desc('nowplaying'), desc('books'), srcCtx);
  assert.ok(src.movers.decoration, 'an NP endpoint yields a decoration mover');
  assert.equal(src.movers.decoration.ownership, 'owned-decoration', 'the pill is an owned-decoration');
  assert.equal(src.movers.decoration.slot, 'outgoing', 'NP-as-source slots the pill at outgoing');
  const floats = srcCtx.doc.querySelectorAll('.np-pill-float');
  assert.equal(floats.length, 1, 'exactly one pill float remains — the stale one was removed, the fresh one added');
  assert.equal(floats[0].querySelectorAll('[id]').length, 0, 'the clone has its ids stripped');

  // NP as DESTINATION (browse -> nowplaying): decoration based at the incoming slot.
  const dstCtx = mkEnv({ renderDestination: (d, host, doc) => doc.getElementById('nowplaying') });
  const dst = build(desc('books'), desc('nowplaying'), dstCtx);
  assert.ok(dst.movers.decoration, 'NP as destination also yields a decoration mover');
  assert.equal(dst.movers.decoration.slot, 'incoming', 'NP-as-destination slots the pill at incoming');
});

// ── RETIRED WITH THE CLONE (PLAN-swipe-declone.md Stage 2, §12 item 27) ─────────────
// Four cells lived here whose only subject was the BUILT PANE, and each asserted a
// property the copy needed BECAUSE it was a copy — so each is deleted with it rather than
// narrowed. copyAnimPhase seeked a clone's cover animations to their live twins' phase (the
// real nodes carry the running animations themselves); the two .nav-ghost wrapper cells
// pinned its fixed/clipped/non-interactive contract and its no-background rule (a real view
// has its own inset box and its own z, and the single-painter rule is guarded by
// test/page-bg-single-painter.test.js); freezeArt stripped data-art so a cloned cover could
// not re-trigger the art loader (no nodes are created, so nothing can). NOGHOSTATALL in
// test/swipe-declone-stage2-construction.test.js is the successor for the property that
// survives all four: no owned pane is built, for any structural case.
