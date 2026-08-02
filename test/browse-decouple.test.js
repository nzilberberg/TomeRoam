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
const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));

// ─────────────────────────────────────────────────────────────────────────────────────────
// BROWSEFIXED (§11, SOURCE-TEXT) — the active #browse base css rule is position:fixed and
// carries NO will-change / non-none transform (either would establish a containing block for
// the fixed .alphaindex and reproduce the .195/.196 strip break).
//
// MIGRATED, NOT NARROWED (PLAN-swipe-declone.md §10). Stage 2 split #browse's two roles: it
// KEEPS the position:fixed box (and this cell's three surviving assertions become MORE
// load-bearing — §5.4's containing-block derivation rests on them, and four SHIPPED
// transitions resolve #browse as a mover that must generate a box), and it gives up
// `overflow-y: auto` to each `.browsepage`. The overflow assertion is not dropped: it moves to
// the page's base rule and is asserted by PAGEISVIEW in
// test/swipe-declone-stage2-css.test.js, which compares the page's scroll declarations
// against the retired #browse scroller's captured values rather than against a hardcoded list.
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

test('BROWSEFIXED — the active #browse base rule is a position:fixed box with NO will-change/transform (source)',
  () => {
    const css = fs.readFileSync(path.join(ROOT, 'css', 'app.css'), 'utf8');
    const body = baseBrowseRuleBody(css);
    assert.ok(body, 'a base `#browse { … }` rule must exist in css/app.css (the decouple recipe)');
    assert.match(body, /position\s*:\s*fixed/, 'the active #browse must be position:fixed — it is still the view BOX, and four shipped transitions transform it (Invariant D5)');
    assert.doesNotMatch(body, /overflow-y/,
      'the active #browse must NOT be a scroller: the scroller role moved to .browsepage (PLAN-swipe-declone.md §5.3.1), and leaving overflow-y here is a second scroll authority');
    assert.doesNotMatch(body, /will-change/,
      'the active #browse must NOT carry will-change (it would re-parent the fixed .alphaindex — the .195/.196 break)');
    assert.doesNotMatch(body, /transform\s*:\s*(?!none)/,
      'the active #browse must NOT carry a non-none transform (same containing-block hazard for .alphaindex)');
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// SCROLLBAR (§11, unit) — the custom scroll indicator recognises the browse scroll surface as a
// supported one (mirror of the 6i 'home' kind). `metrics()` already handles a non-doc element
// generically (t.scrollTop/scrollHeight/clientHeight), so the only change is surfaceKind.
//
// MIGRATED (PLAN-swipe-declone.md §10). The SCROLLER is now each `.browsepage`, which carries no
// id, so a cell that only tested the host would go on passing while the indicator removed itself
// on every real browse scroll. Both are asserted here; BROWSESURFACE in
// test/swipe-declone-stage2-css.test.js is the page's own Stage-2 cell and additionally covers
// the native-scrollbar suppression, which is a precondition of §5.3.2's geometry derivation.
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
    assert.ok(ScrollBar._test.surfaceKind(browse) != null,
      'surfaceKind(#browse) must return a supported (non-null) surface kind — the host is still the view box; got null');
    const page = dom.window.document.createElement('div');
    page.className = 'browsepage';
    browse.appendChild(page);
    assert.ok(ScrollBar._test.surfaceKind(page) != null,
      'surfaceKind(.browsepage) must return a supported (non-null) surface kind — the PAGE is the scroller '
      + 'that actually fires the scroll events (PLAN-swipe-declone.md §5.3.1), and it carries no id; got null');
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
// METRICS (§11, unit — the metrics-injection wiring) — browse.js virtualView INJECTS
// PAGE-relative metrics into createController so the controller reads/writes its own page's
// scrollTop rather than the virtuallist window default.
//
// MIGRATED, NOT DROPPED (PLAN-swipe-declone.md §5.3.4). The injected closure used to point at the
// one shared #browse host; Stage 2 points it at `m`, the PAGE NODE the controller was built for,
// so no two controllers share a measured element. This cell keeps guarding that metrics are
// injected AT ALL (the window default is wrong for any own-scroll box); PAGEOWNSSCROLL in
// test/swipe-declone-stage2-browse.test.js guards the other side — that the element measured is
// the controller's own page and never a shared reference.
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
        const page = h.Browse._test.pageCache.get('books').el;
        assert.ok(page, 'fixture: the forced-virtual books page is cached');
        page.scrollTop = 321;
        assert.equal(captured.metrics.scrollY(), 321,
          'the injected metrics.scrollY() must read the PAGE\'s scrollTop (321), not window.scrollY and not the shared host');
        captured.scrollTo(654);
        assert.equal(page.scrollTop, 654,
          'the injected scrollTo must WRITE the PAGE\'s scrollTop (654), not window.scrollTo and not the shared host');
      } finally {
        VL.createController = realCreate;
        VL.setForceVirtual(false);
      }
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
