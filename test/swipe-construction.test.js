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
// dead/extra field both redden (§4.11 exact-key discipline).
const CONSTRUCTION_KEYS = ['capture', 'classification', 'movers', 'plan', 'sourceWasClobbered'];
const MOVERS_KEYS = ['decoration', 'incoming', 'outgoing'];
const CLASSIFICATION_KEYS = ['decorations', 'destinationHost', 'fromKind', 'sourceHost', 'toKind'];
const PLAN_KEYS = ['decorations', 'incoming', 'outgoing', 'renderDestination'];
const MOVER_KEYS = ['element', 'ownership', 'slot'];

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
      events.push({ call: 'renderDestination', host, ghostsAtCall: doc.querySelectorAll('.nav-ghost').length });
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

// ── F1.1 — the exact Construction contract shape ────────────────────────────────────
test('buildConstruction returns the exact Construction contract shape', () => {
  const ctx = mkEnv();
  const c = build(desc('home'), desc('books'), ctx);
  assert.deepEqual(Object.keys(c).sort(), CONSTRUCTION_KEYS, 'Construction must carry exactly its five fields');
  assert.deepEqual(Object.keys(c.movers).sort(), MOVERS_KEYS, 'movers must be {outgoing, incoming, decoration}');
  assert.deepEqual(Object.keys(c.classification).sort(), CLASSIFICATION_KEYS,
    'classification must carry the five stage-5 fields including both hosts');
  assert.deepEqual(Object.keys(c.plan).sort(), PLAN_KEYS, 'plan must carry its four construction fields');
  assert.equal(typeof c.sourceWasClobbered, 'boolean', 'sourceWasClobbered is a boolean');
});

// ── F1.1 — the mover EXTERNAL shape, not the production {el,base,own} ────────────────
test('movers carry the external {element,ownership,slot} shape, not the production keys', () => {
  const ctx = mkEnv();
  const c = build(desc('home'), desc('books'), ctx);
  for (const which of ['outgoing', 'incoming']) {
    const m = c.movers[which];
    assert.deepEqual(Object.keys(m).sort(), MOVER_KEYS, `${which} mover must be {element,ownership,slot}`);
    assert.ok(!('el' in m) && !('base' in m) && !('own' in m),
      `${which} mover must NOT emit the production el/base/own keys — L3 owns that mapping`);
    assert.equal(m.slot, which, `${which} mover slot must be "${which}"`);
  }
  assert.equal(c.movers.outgoing.ownership, 'owned-pane', 'home->browse outgoing is an app-ghost owned-pane');
  assert.equal(c.movers.incoming.ownership, 'borrowed-real', 'home->browse incoming is the real #browse');
});

// ── F1c — no owned pane ⇒ capture is null, both sides borrowed-real ──────────────────
test('overlay->overlay builds no owned pane: capture is null and both sides are borrowed-real', () => {
  const ctx = mkEnv({ renderDestination: (d, host, doc) => doc.getElementById('nowplaying') });
  const c = build(desc('options'), desc('nowplaying'), ctx);
  assert.equal(c.capture, null, 'overlay<->overlay builds no owned pane, so capture is null');
  assert.equal(c.movers.outgoing.ownership, 'borrowed-real', 'the overlay source moves as its real element');
  assert.equal(c.movers.incoming.ownership, 'borrowed-real', 'the overlay destination is its real element');
});

// ── F2-r (recipe) — app-ghost capture carries ghostY; home-snapshot never does ──────
test('an app-ghost capture carries ghostY; a home-snapshot capture never does', () => {
  const ghostCtx = mkEnv({ scrollY: 137 });
  const ghost = build(desc('books'), desc('authors', { author: { ratingKey: 'A' } }), ghostCtx);
  assert.ok(ghost.capture, 'a browse->browse transition builds an app-ghost with a capture');
  assert.deepEqual(Object.keys(ghost.capture).sort(), ['animRes', 'animSync', 'ghostY'],
    'the app-ghost capture carries ghostY plus the two animation fields');
  assert.equal(ghost.capture.ghostY, 137, 'ghostY is the scroll the ghost is frozen at (env.scrollY)');

  const homeCtx = mkEnv();
  const home = build(desc('books'), desc('home'), homeCtx);
  assert.ok(home.capture, 'a browse->home transition builds a home-snapshot with a capture');
  assert.ok(!('ghostY' in home.capture),
    'the home-snapshot capture must NOT carry ghostY — parity with today, where snapshotHome never sets it');
  assert.deepEqual(Object.keys(home.capture).sort(), ['animRes', 'animSync'],
    'the home-snapshot capture carries only the two animation fields');
});

// ── F4a — driven with NO ambient DOM; the pane is built in env.document ──────────────
test('buildConstruction runs with no ambient document/window and builds the pane in env.document', () => {
  const ctx = mkEnv();
  // withPoisonedAmbient throws on any global document/window/Element/getComputedStyle read.
  const c = build(desc('home'), desc('books'), ctx);
  assert.equal(ctx.doc.querySelectorAll('.nav-ghost').length, 1,
    'the owned-pane ghost is mounted into env.document.body, reached only through env');
  assert.ok(c.movers.outgoing.element, 'the outgoing mover carries the built element');
});

// ── F4b — copyAnimPhase seeks through env.document.defaultView.Element ───────────────
test('copyAnimPhase syncs animation phase through the env Element, not a global one', () => {
  const ctx = mkEnv({ scrollY: 0 });
  const setCt = enableAnims(ctx.win, 500);
  const app = ctx.doc.querySelector('.app');
  setCt(addCovers(ctx.doc, app, 4));   // four live covers seeked to t=500
  const c = build(desc('books'), desc('files', { book: { ratingKey: 'B' } }), ctx);
  // Global Element stays poisoned during the call; a bare `typeof Element` mutation would
  // throw. Correct code uses env.document.defaultView.Element (jsdom, stubbed above).
  assert.ok(c.capture, 'the app-ghost capture exists');
  assert.ok(c.capture.animSync > 0,
    'copyAnimPhase must sync at least one cover through env\'s Element — 0 means it took the ambient path');
  assert.equal(c.capture.animRes, 0, 'each clone animation is seeked to the source currentTime (residual 0)');
});

// ── F6 — sourceWasClobbered is true only when the render overwrites the source host ──
test('sourceWasClobbered is true only when the destination render clobbers the source host', () => {
  // browse->browse: source IS #browse and the browse-host render targets #browse → clobbered.
  const clob = mkEnv({
    sourceEl: (host, v, doc) => doc.getElementById('browse'),
    renderDestination: (d, host, doc) => doc.getElementById('browse'),
  });
  const c1 = build(desc('books'), desc('authors', { author: { ratingKey: 'A' } }), clob);
  assert.equal(c1.sourceWasClobbered, true,
    'a browse->browse whose source #browse is overwritten by the mid-drag render is clobbered');

  // home->browse: source is #home (in-flow, a different node) → not clobbered.
  const safe = mkEnv({
    sourceEl: (host, v, doc) => doc.getElementById('home'),
    renderDestination: (d, host, doc) => doc.getElementById('browse'),
  });
  const c2 = build(desc('home'), desc('books'), safe);
  assert.equal(c2.sourceWasClobbered, false,
    'a home->browse source (#home) is not the render target (#browse), so it is not clobbered');
});

// ── F7a — outgoing captured BEFORE env.renderDestination is invoked ──────────────────
test('the outgoing pane is mounted before env.renderDestination is ever called', () => {
  const ctx = mkEnv();
  build(desc('books'), desc('authors', { author: { ratingKey: 'A' } }), ctx);
  const renderCalls = ctx.events.filter((e) => e.call === 'renderDestination');
  assert.equal(renderCalls.length, 1, 'a browse-host destination renders exactly once');
  assert.ok(renderCalls[0].ghostsAtCall >= 1,
    'the outgoing app-ghost must already be mounted when renderDestination runs — else the '
    + 'browse->browse ghost would snapshot the POST-render #browse (the flash guard, plan §6 step 5)');
});

// ── F8 / navGhost — GHOST_BG resolves fresh through env; the wrapper contract holds ──
test('the ghost background resolves through env.getComputedStyle, not an ambient or cached read', () => {
  const ctx = mkEnv();
  const c = build(desc('home'), desc('books'), ctx);
  const wrap = ctx.doc.querySelector('.nav-ghost');
  assert.ok(wrap, 'the ghost wrapper is built');
  const css = wrap.style.cssText;
  // Resolved through env.document.defaultView.getComputedStyle (ambient getComputedStyle is
  // poisoned during the call); a top-level/cached read would have thrown.
  assert.ok(/background\s*:/.test(css) && !/background\s*:\s*;/.test(css),
    'the wrapper carries a resolved page background');
  assert.ok(c.movers.outgoing.element.classList.contains('nav-ghost')
    || c.movers.outgoing.element === wrap, 'the outgoing owned-pane element IS the nav-ghost wrapper');
});

test('the nav-ghost wrapper carries its full fixed/clipped/non-interactive contract', () => {
  const ctx = mkEnv();
  build(desc('home'), desc('books'), ctx);
  const css = ctx.doc.querySelector('.nav-ghost').style.cssText;
  for (const decl of ['position: fixed', 'inset: 0px', 'overflow: hidden',
    'pointer-events: none', 'will-change: transform']) {
    assert.ok(css.replace(/inset:\s*0;/, 'inset: 0px;').includes(decl) || css.includes(decl),
      `the .nav-ghost wrapper must declare "${decl}"; got "${css}"`);
  }
  const z = /z-index:\s*(\d+)/.exec(css);
  assert.ok(z && Number(z[1]) < 30, `the ghost must sit beneath the persistent bars (z<30); got z-index ${z && z[1]}`);
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

// ── freezeArt — data-art stripped BEFORE the clone connects to the live document ─────
test('both owned-pane recipes strip data-art before the clone is mounted', () => {
  // app-ghost path (home->browse builds a ghost of .app).
  const ghostCtx = mkEnv();
  addCovers(ghostCtx.doc, ghostCtx.doc.querySelector('.app'), 3);
  build(desc('books'), desc('authors', { author: { ratingKey: 'A' } }), ghostCtx);
  const ghostImgs = ghostCtx.doc.querySelectorAll('.nav-ghost img.cover');
  assert.ok(ghostImgs.length > 0, 'the ghost clones the covers');
  assert.equal([...ghostImgs].filter((i) => i.hasAttribute('data-art')).length, 0,
    'the app-ghost clone must have every img[data-art] stripped, so a cloned cover cannot re-trigger the art loader');

  // home-snapshot path (browse->home clones #home).
  const homeCtx = mkEnv();
  addCovers(homeCtx.doc, homeCtx.doc.getElementById('home'), 3);
  build(desc('books'), desc('home'), homeCtx);
  const homeImgs = homeCtx.doc.querySelectorAll('.nav-ghost img.cover');
  assert.ok(homeImgs.length > 0, 'the home snapshot clones the covers');
  assert.equal([...homeImgs].filter((i) => i.hasAttribute('data-art')).length, 0,
    'the home-snapshot clone must have every img[data-art] stripped too');
});
