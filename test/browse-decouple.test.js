// STAGE — the #browse scroll DECOUPLE. RED suite authored red-first by Curie (2026-07-29)
// from PLAN-browse-decouple.md §11 Coverage Model, BEFORE Brunel's build (red-first TDD law,
// Claude/Decisions/DecisionLog.md). Companion note: Claude/Curie/RED-browse-decouple.md.
//
// WHAT THIS SLICE PROVES (PLAN §3/§6/§9). Active #browse is a position:fixed +
// overflow-y:auto own-scroll view (NO will-change/transform, so the fixed .alphaindex strip
// stays viewport-anchored). With #home also fixed (6i), no signed-in app view drives the
// document height and window.scrollY is a constant 0. The six window-scroll consumers are
// re-homed to #browse.scrollTop; the .266 stable-height probe is retired; the abort ghost
// excludes .alphaindex. Built GREEN by Brunel (Claude/Brunel/browse-decouple-build.md).
//
// ⚠️ DEVICE-OWED, NOT HERE (honest scoping — jsdom computes no layout). The Books→Home flash
// (R-flash), navbar seating (R-navbar), the strip anchoring/clip (R-strip), and browse→browse as
// a fixed mover (R-browse2browse) are PAINTS jsdom cannot see — device gates, NOT CI cells. And
// the PRODUCTION REAL-GEOMETRY windowing (the listTop getBoundingClientRect arithmetic + the
// clamp landing) is device/manual-owed: REALIZE/METRICS/RESTORE are scoped to WIRING/CONTRACT,
// never the on-screen row window or the clamped value (jsdom returns 0 for every rect/scrollHeight).
// GHOSTSCROLL asserts only the SOURCE the ghost offset is read from, never the on-screen jump.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { boot } = require('./app-harness.js');
const { readRoot, ROOT } = require('./dom-fixture.js');

async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));

// A fresh env whose document is the REAL index.html, mirroring test/swipe-construction.test.js's
// recipe seam: the ghost is built through env.document, not an ambient document.
function mkGhostEnv({ browseScrollTop = 0, withStrip = false } = {}) {
  const dom = new JSDOM(readRoot('index.html'));
  const doc = dom.window.document;
  const lib = doc.getElementById('library'); if (lib) lib.classList.remove('hidden');
  const browse = doc.getElementById('browse'); if (browse) browse.classList.remove('hidden');
  if (withStrip) {
    const strip = doc.createElement('div'); strip.className = 'alphaindex'; strip.textContent = 'A';
    browse.appendChild(strip);
  }
  doc.getElementById('browse').scrollTop = browseScrollTop;
  const env = {
    document: doc,
    scrollY: () => 0,   // the DECOUPLE world: the document is always at the top
    sourceEl: (host, v) => doc.getElementById(v === 'home' ? 'home' : 'browse'),
    navPill: () => doc.querySelector('.np-actions'),
    renderDestination: () => doc.getElementById('browse'),
  };
  return { env, doc };
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// BROWSEFIXED (§11, SOURCE-TEXT) — the active #browse base css rule is position:fixed +
// overflow-y:auto and carries NO will-change / non-none transform (either would establish a
// containing block for the fixed .alphaindex and reproduce the .195/.196 strip break).
//
// RED AT HEAD (confirmed): there is NO base `#browse { … }` rule at all — #browse is an in-flow
// (unpositioned) document-scroll view. MUTATION: add will-change/transform to the #browse rule
// (would re-parent the fixed .alphaindex) → the no-will-change assertion reddens.
//
// A source-text gate (jsdom cannot compute a CSS transform) — the INVERSE of the #home layer
// gate (home MUST carry will-change/be a fixed own-scroll view; browse MUST NOT be promoted).
// Targets the BASE `#browse` selector, not `body.has-player #browse`.
// ─────────────────────────────────────────────────────────────────────────────────────────
function baseBrowseRuleBody(css) {
  for (const chunk of css.split('}')) {
    const i = chunk.lastIndexOf('{');
    if (i < 0) continue;
    const selector = chunk.slice(0, i).trim().split(/[\r\n]/).pop().trim();
    if (selector === '#browse') return chunk.slice(i + 1);
  }
  return null;
}

test('BROWSEFIXED — the active #browse base rule is a position:fixed overflow-y:auto own-scroll view with NO will-change/transform (source)',
  () => {
    const css = fs.readFileSync(path.join(ROOT, 'css', 'app.css'), 'utf8');
    const body = baseBrowseRuleBody(css);
    assert.ok(body, 'a base `#browse { … }` rule must exist in css/app.css (the decouple recipe)');
    assert.match(body, /position\s*:\s*fixed/, 'the active #browse must be position:fixed (a fixed own-scroll view against the viewport)');
    assert.match(body, /overflow-y\s*:\s*auto/, 'the active #browse must be an overflow-y:auto own scroller');
    assert.doesNotMatch(body, /will-change/,
      'the active #browse must NOT carry will-change (it would re-parent the fixed .alphaindex — the .195/.196 break)');
    assert.doesNotMatch(body, /transform\s*:\s*(?!none)/,
      'the active #browse must NOT carry a non-none transform (same containing-block hazard for .alphaindex)');
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// SCROLLBAR (§11, unit) — the custom scroll indicator recognises the fixed own-scroll #browse as
// a supported surface (mirror of the 6i 'home' kind). `metrics()` already handles a non-doc
// element generically (t.scrollTop/scrollHeight/clientHeight), so the only change is surfaceKind.
//
// RED AT HEAD (confirmed): surfaceKind(#browse) returns null (id!=='home', not in OVERLAY_SEL),
// so the indicator never draws on browse. MUTATION: #browse left out of the supported set →
// surfaceKind returns null → the supported-surface assertion reddens.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('SCROLLBAR — surfaceKind recognises the fixed own-scroll #browse as a supported browse surface',
  () => {
    const dom = new JSDOM(readRoot('index.html'));
    global.window = dom.window; global.document = dom.window.document;
    delete require.cache[require.resolve('../js/scrollbar.js')];
    const ScrollBar = require('../js/scrollbar.js');
    const browse = dom.window.document.getElementById('browse');
    const kind = ScrollBar._test.surfaceKind(browse);
    assert.ok(kind != null,
      'surfaceKind(#browse) must return a supported (non-null) surface kind so the indicator draws on the fixed own-scroll browse; got null');
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// GHOSTSCROLL (§11, integration) — the outgoing app-ghost of a SCROLLED BROWSE source derives its
// whole-clone content-translate offset from #browse.scrollTop, not window.scrollY. The
// CI-checkable SOURCE branch; the on-screen zero-jump is a paint (device-owed, R-browse2browse).
//
// RED AT HEAD (confirmed): ghostApp(fromKind) reads env.scrollY() for a browse source, so with
// #browse.scrollTop=500 / window.scrollY=0 the captured ghostY is 0 and the clone is translated to
// translateY(0px). MUTATION: a browse source reads window.scrollY instead of #browse.scrollTop →
// the captured offset is 0 → the equals-500 source assertion reddens.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('GHOSTSCROLL — the outgoing app-ghost of a scrolled BROWSE source reads #browse.scrollTop, not window.scrollY',
  () => {
    const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));
    const { env, doc } = mkGhostEnv({ browseScrollTop: 500 });
    // books→authors: an in-flow browse source going to browse builds an outgoing app-ghost.
    const c = Swipe.buildConstruction({ v: 'books' }, { v: 'authors', author: { ratingKey: 'A' } }, env);
    assert.ok(c.capture, 'fixture: a browse→browse builds an app-ghost with a capture');
    assert.equal(c.capture.ghostY, 500,
      'the ghost offset SOURCE for a BROWSE source must be #browse.scrollTop (500), not window.scrollY (0) — the jump-to-top source');
    const clone = doc.querySelector('.nav-ghost').firstElementChild;
    assert.equal(clone.style.transform, 'translateY(-500px)',
      'the app-ghost clone must be content-translated by -#browse.scrollTop so it shows browse at its own scroll, not browse-at-top');
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// STRIPEXCLUDE (§11, integration) — the abort ghost clone EXCLUDES the fixed .alphaindex strip,
// so the browse-source content-translate (translateY(-#browse.scrollTop)) cannot re-parent and
// misposition it (the fixed strip's containing block would become the transformed clone).
//
// RED AT HEAD (confirmed): ghostApp clones .app whole, so the #browse .alphaindex survives into
// the clone. MUTATION: the .alphaindex exclusion is removed → the clone still contains the strip →
// the no-strip assertion reddens. (The on-screen strip POSITION is device-owed, R-strip.)
// ─────────────────────────────────────────────────────────────────────────────────────────
test('STRIPEXCLUDE — the abort ghost clone excludes the fixed .alphaindex strip',
  () => {
    const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));
    const { doc } = mkGhostEnv({ browseScrollTop: 200, withStrip: true });
    // Rebuild the env against the SAME doc so the strip we injected is in the source #browse.
    const env = {
      document: doc, scrollY: () => 0,
      sourceEl: (host, v) => doc.getElementById(v === 'home' ? 'home' : 'browse'),
      navPill: () => doc.querySelector('.np-actions'),
      renderDestination: () => doc.getElementById('browse'),
    };
    Swipe.buildConstruction({ v: 'books' }, { v: 'authors', author: { ratingKey: 'A' } }, env);
    const clone = doc.querySelector('.nav-ghost');
    assert.ok(clone, 'fixture: a browse-source app-ghost is built');
    assert.equal(clone.querySelectorAll('.alphaindex').length, 0,
      'the ghost clone must EXCLUDE the fixed .alphaindex — a transformed clone containing it would re-parent and misposition the strip');
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// REALIZE (§11, integration — listener wiring + pure windowing model) — the shared virtual-list
// scroll listener is capture-phase on document so a scroll event dispatched ON #browse reaches
// the realize handler (today the listener is on window and never fires under an own-scroll
// #browse); and the PURE windowFor model computes the correct key window for INJECTED numbers.
// The production real-geometry listTop arithmetic and clamp are DEVICE/manual-owed — NOT here.
//
// RED AT HEAD (confirmed): the listener is `window.addEventListener('scroll', …)` (bubble phase),
// so a non-bubbling scroll dispatched on #browse never reaches onDocScroll and the active
// controller's _realize does not run. MUTATION: the listener stays on window only → a
// #browse-dispatched scroll never reaches the handler → the handler-ran assertion reddens.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('REALIZE — a #browse-dispatched scroll reaches the virtual-list realize handler (capture-phase document); the pure windowFor model is correct',
  () => {
    const dom = new JSDOM('<!doctype html><body><div id="browse"></div></body>');
    global.window = dom.window; global.document = dom.window.document;
    global.window.requestAnimationFrame = (fn) => { fn(0); return 0; };
    global.requestAnimationFrame = global.window.requestAnimationFrame;
    delete require.cache[require.resolve('../js/virtuallist.js')];
    const VL = require('../js/virtuallist.js');

    // Listener half: a scroll dispatched on #browse must reach onDocScroll → active _realize.
    let realized = 0;
    VL._test.setActive({ _realize: () => { realized++; }, isVisible: () => true });
    dom.window.document.getElementById('browse').dispatchEvent(new dom.window.Event('scroll'));
    assert.ok(realized > 0,
      'a scroll event dispatched on #browse must reach the virtual-list realize handler — the listener must be capture-phase on document, not on window (which never sees a #browse own-scroll)');

    // Pure-model half (a green regression guard — the windowing math is scroll-origin-relative
    // and ports unchanged to an element scroller): windowFor picks the right key set for injected
    // numbers. Not the real-geometry window (jsdom has no layout).
    const items = Array.from({ length: 50 }, (_, i) => ({ ratingKey: 'k' + i, title: 'k' + i }));
    const m = VL.buildModel([{ letter: '', items }], { header: 30, row: 80 });
    const w = VL.windowFor(m, 800, 600, 0);
    assert.ok(w.length > 0 && w.length <= Math.ceil(600 / 80) + 2, 'windowFor bounds the window to the viewport for injected numbers');
    assert.equal(w[0].key, 'k10', 'at top=800 (row stride 80) the first realized row is k10 — the pure model is scroll-origin-relative');
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// METRICS (§11, unit — the metrics-injection wiring) — browse.js virtualView (633-641) INJECTS
// #browse-relative metrics into createController so the controller reads/writes #browse.scrollTop
// rather than the virtuallist window default. Today it injects none (falls to the window default).
//
// RED AT HEAD (confirmed): virtualView passes no `metrics` (and `scrollTo: (y)=>window.scrollTo`),
// so createController's opts.metrics is undefined. MUTATION: browse.js injects no metrics →
// createController falls to the window default → the injected metrics.scrollY reads window.scrollY
// not #browse.scrollTop → the reads-#browse assertion reddens.
//
// Drives the REAL Browse.virtualView by forcing the virtual path on a small books page and
// intercepting the opts virtualView passes to VirtualList.createController.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('METRICS — browse.js virtualView injects #browse-relative metrics into the virtual controller',
  async () => {
    const h = boot({ realBrowse: true, fakeTimers: true, deferRaf: true });
    try {
      await settle(h);
      const VL = h.VirtualList;
      VL.setForceVirtual(true);   // window ANY size so a small books page uses virtualView
      let captured = null;
      const realCreate = VL.createController;
      VL.createController = (opts) => { captured = opts; return realCreate(opts); };
      try {
        h.tap('.navbtn[data-nav="books"]');
        await settle(h);
        assert.ok(captured, 'fixture: virtualView must build a virtual controller for the forced-virtual books page');
        assert.ok(captured.metrics,
          'virtualView must INJECT a `metrics` object into createController (today it injects none → the window default)');
        h.$('browse').scrollTop = 321;
        assert.equal(captured.metrics.scrollY(), 321,
          'the injected metrics.scrollY() must read #browse.scrollTop (321), not window.scrollY');
        const stBefore = h.$('browse').scrollTop;
        captured.scrollTo(654);
        assert.equal(h.$('browse').scrollTop, 654,
          'the injected scrollTo must WRITE #browse.scrollTop (654), not window.scrollTo');
      } finally {
        VL.createController = realCreate;
        VL.setForceVirtual(false);
      }
    } finally { h.dispose(); }
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// RESTORE (§11, integration — the WRITE SURFACE) — the browse scroll memory writes the
// #browse.scrollTop SURFACE: on a browse→browse abort the source page's cache-hit re-render runs
// positionOnEnter → applyScrollY, which writes #browse.scrollTop (not window.scrollTo). The correct
// clamped landing VALUE is real-geometry and device/manual-owed — NOT asserted here.
//
// RED AT HEAD (confirmed): applyScrollY calls `window.scrollTo(0, clampY(y, se.scrollHeight, …))`,
// so on the abort re-render #browse.scrollTop is never written (stays 0). MUTATION: applyScrollY
// still calls window.scrollTo → positionOnEnter never lands the restore on #browse.scrollTop →
// the wrote-#browse assertion reddens.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('RESTORE — a browse→browse abort re-render writes the #browse.scrollTop surface via positionOnEnter/applyScrollY',
  async () => {
    const h = boot({ realBrowse: true, fakeTimers: true, deferRaf: true });
    try {
      h.tap('.navbtn[data-nav="books"]'); await settle(h);
      h.tap('.navbtn[data-nav="authors"]'); await settle(h);
      // Spy the #browse.scrollTop WRITE surface (the only writer on the abort path is applyScrollY).
      const browseEl = h.$('browse');
      let backing = 0; const writes = [];
      Object.defineProperty(browseEl, 'scrollTop', {
        configurable: true, get() { return backing; }, set(v) { backing = v; writes.push(v); },
      });
      // Abort an authors→books back-swipe (browse→browse, abortRender:'rerender').
      const row = h.document.createElement('div'); row.className = 'book'; browseEl.appendChild(row);
      h.touch.start(10, 300, row);
      h.touch.move(80, 302); await realSleep(12);
      h.touch.move(200, 304); await realSleep(12);
      h.touch.move(30, 304); await realSleep(12);
      h.touch.end(30, 304);
      await settle(h); await h.clock.advance(700); await settle(h);
      for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();
      await settle(h);
      assert.ok(/abort/.test(settles(h)[0] || ''), `fixture: the browse→browse swipe must have aborted — got ${settles(h)[0]}`);
      assert.ok(writes.length > 0,
        'the abort re-render must restore via #browse.scrollTop (applyScrollY writing the element surface), not window.scrollTo — #browse.scrollTop was never written');
    } finally { h.dispose(); }
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// PINGONE (§11, integration — real setView) — going to home from a scrolled browse NEVER pins the
// app min-height, because a fixed #browse cannot collapse the document (the .266 stable-height
// probe is retired).
//
// RED AT HEAD (confirmed): setView('home') from a shown #browse sets appEl.style.minHeight =
// appEl.scrollHeight + 'px' (the .266 pin; '0px' in jsdom, but SET). MUTATION: the retired probe
// pin is reintroduced → setView('home') sets app min-height to a pixel value → the stays-empty
// assertion reddens.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('PINGONE — going to home from a scrolled browse never pins the app min-height (the .266 probe is retired)',
  async () => {
    const h = boot({ fakeTimers: true });
    try {
      await settle(h);
      h.tap('.navbtn[data-nav="books"]');   // browse shown
      await settle(h);
      const appEl = h.document.querySelector('.app');
      assert.ok(appEl, 'fixture: the .app element exists');
      h.$('browse').scrollTop = 400;         // a scrolled books page
      h.tap('.navbtn[data-nav="home"]');     // → setView('home') from a shown #browse
      await settle(h);
      assert.equal(appEl.style.minHeight, '',
        'setView(home) from a scrolled browse must NOT pin app.style.minHeight — a fixed #browse cannot collapse the document, so the .266 probe is retired');
    } finally { h.dispose(); }
  });
