// nav.js — the SCREEN-STATE layer: given a screen descriptor, make that screen
// visible, rendered and positioned. Extracted from app.js for the same reason
// js/playback.js was (build .100): the bugs concentrated here and nothing could
// reach them. `.106` (the forward slide-in exposed the base view because setView
// hid the hub synchronously) and `.107` (the back button flashed because
// slideInView animates only the incoming pane) were BOTH in this code, shipped past
// a fully green suite, because it lived inside app.js's IIFE where no test can go.
// Behind an injected-deps boundary it is testable against the real index.html
// fixture (test/dom-fixture.js) — see test/nav.test.js.
//
// SCOPE — this owns "what is on screen", NOT "where you are":
//   • IN:  view visibility (setView), the nav-tab highlight, swipe-style reset, the
//          screen dispatch (applyScreen), element/overlay resolution, and the two
//          button-nav animations (slideInView, overlayFilmstrip).
//   • OUT: the nav STACKS + intents (navTo/goBack/openSub/closeSub) and the gesture
//          machinery stay in app.js. The gesture is drag/layout-coupled — moving it
//          buys no testability and it carries the iOS-26 fixed-layer saga; it drives
//          this module rather than living in it.
//
// Everything reads the world through injected deps — no globals — so a test can hand
// it a real-index DOM and fake renderers.
const Nav = (() => {
  // Injected by app.js: { byId, isSignedIn, updatePlayerUI, renderScreen,
  //                       renderNowPlaying, renderBrowse, currentDesc }
  let d = null;
  let npOpen = false;

  // The Options HUB's sub-screens: each is a fixed overlay (id === view name) that
  // filmstrips in from the hub and back out. Adding one = markup + a module + a hub
  // row + one entry here; every consumer below is data-driven off this list.
  // test/screens.test.js pins it against index.html / app.css / scrollbar.js.
  const SETTINGS_SUBS = ['general', 'playback', 'buffering', 'downloads', 'diagnostics'];
  const isSub = (v) => SETTINGS_SUBS.indexOf(v) !== -1;
  const isOverlay = (v) => v === 'options' || v === 'nowplaying' || isSub(v);
  const overlayEl = (v) => d.byId(v);   // every overlay's element id === its view name
  const appViewEl = (v) => (v === 'home' ? d.byId('home') : d.byId('browse'));
  // Which element renders a screen (NP is a fixed overlay that doesn't slide via this;
  // #options and every sub-screen have id === view name).
  const viewElFor = (v) => v === 'nowplaying' ? null : v === 'home' ? d.byId('home')
    : (v === 'options' || isSub(v)) ? d.byId(v) : d.byId('browse');

  const REDUCED = typeof window !== 'undefined'
    && !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function setView(v) {   // 'home' | 'browse' | 'options' | a settings sub | 'nowplaying'
    const $ = d.byId;
    npOpen = v === 'nowplaying';
    const optOpen = v === 'options';
    const subOpen = isSub(v);
    // NP, the Options hub and its sub-screens are ADDITIVE overlays: they paint over
    // whatever tall screen is showing, and the page underneath is NOT touched. Hiding
    // the tall view shrinks the document, and a short (~viewport-sized) document is
    // what trips iOS 26's ~50pt fixed-layer displacement (the black-band / Options-bar
    // saga — a 1-2px token overflow does NOT count as tall). Only real screen switches
    // (home/browse) swap the in-flow views.
    if (!npOpen && !optOpen && !subOpen) {
      $('home').classList.toggle('parked', v !== 'home');   // parked = off-screen but PAINTED (covers stay decoded)
      const browseEl = $('browse');
      // On the shown→hidden edge, deactivate Browse's virtual controller BEFORE
      // display:none lands — a hidden box measures zero, so the anchor must be
      // captured now (from real geometry). Re-entry activation is owned by
      // Browse.showPage(), not here. See Browse.deactivate() for the full rationale.
      if (v !== 'browse' && !browseEl.classList.contains('hidden') && d.browseWillHide) d.browseWillHide();
      browseEl.classList.toggle('hidden', v !== 'browse');
    }
    // Leave the settings overlays' hidden state untouched when going TO NowPlaying so
    // whichever one was underneath stays for the NP-back reveal. A sub-screen is a
    // CHILD of the hub: keep #options MOUNTED underneath it (the opaque sub-screen
    // covers it) — otherwise the forward slide-in exposes the base view (home/browse)
    // for the length of the animation, and swipe-back would have no hub to filmstrip
    // to. So #options shows on Options OR any sub; each sub shows only when it's `v`.
    if (!npOpen) {
      $('options').classList.toggle('hidden', !(optOpen || subOpen));
      for (const s of SETTINGS_SUBS) $(s).classList.toggle('hidden', v !== s);
    }
    $('nowplaying').classList.toggle('hidden', !npOpen);
    document.body.classList.toggle('np-locked', npOpen);   // CSS hook: navbar button/pill swap
    // Home is the base view (even under an additive overlay) whenever it isn't
    // parked → give the document real height so the fixed navbar seats at the true
    // bottom (see .app CSS). This also keeps the NP pill seated when NP is over home.
    document.body.classList.toggle('home-tall', !$('home').classList.contains('parked'));
    $('navbar').classList.toggle('hidden', !d.isSignedIn());
    d.updatePlayerUI();
  }

  function setNavActive(which) {   // 'home' | 'authors' | 'books' | 'options' | null
    document.querySelectorAll('#navbar [data-nav]').forEach((b) => {
      const on = b.dataset.nav === which;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  // Wipe ALL transient swipe styling back to a known-good baseline: remove any
  // leftover ghost/snapshot panes and clear the inline transform/transition/
  // will-change/z-index the swipe puts on the REAL elements (#home/#browse/
  // #options/subs/#nowplaying + the nav pill). Called at the top of applyScreen — the
  // reconcile point that runs after every swipe (finalize) and every nav — so a
  // swipe that gets interrupted mid-flight can never leave an element stuck
  // offscreen/half-transformed and corrupt later swipes (the "erratic after a
  // while" bug). Safe because applyScreen is NEVER called during an active drag.
  function resetSwipeStyles(keepGhosts) {
    if (!keepGhosts) document.querySelectorAll('.nav-ghost').forEach((n) => n.remove());
    document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());   // transient NP-swipe pill clone
    const els = ['home', 'browse', 'options', 'nowplaying', ...SETTINGS_SUBS].map((id) => d.byId(id));
    els.push(document.querySelector('#navbar .np-actions'));
    for (const el of els) if (el) { el.style.transform = ''; el.style.transition = ''; el.style.willChange = ''; el.style.zIndex = ''; }
  }

  // Render a screen descriptor.
  // opts.resetScroll (default true) — window/panel scroll reset to top.
  // opts.render (default true) — actually (re)render the view's content. The swipe
  // carousel already renders the destination live during the drag, so on COMMIT it
  // re-runs applyScreen with render:false to reconcile visibility only — no second
  // render (which would reload images = the post-settle flash) and no scroll change.
  function applyScreen(desc, opts) {
    const resetScroll = !opts || opts.resetScroll !== false;
    const render = !opts || opts.render !== false;
    const $ = d.byId;
    resetSwipeStyles(opts && opts.keepGhosts);   // baseline: no swipe can leave stale transforms/ghosts behind
    // Home's fixed-navbar seating is handled by `body.home-tall` (real scroll
    // height — see .app CSS); the scrollTo just puts it at the top on entry. (The
    // 1px is a harmless remnant of the abandoned "scroll runway" theory.) NOTE: no
    // carousel-scroll restore here — home is PARKED (painted), not display:none, so
    // its carousels keep their scrollLeft on their own; re-setting it would fire a
    // scroll-snap correction (the "oh wait, let me scroll over" animation).
    if (!desc || desc.v === 'home') { setView('home'); setNavActive('home'); if (resetScroll) window.scrollTo(0, 1); return; }
    // The Options hub + its sub-screens are additive overlays (like NP): no document
    // scroll changes — the page underneath stays exactly as it was. Only their own
    // panel resets. Sub-screens keep the Options tab lit ("inside Options").
    if (desc.v === 'options' || isSub(desc.v)) {
      setView(desc.v); setNavActive('options');
      if (render) d.renderScreen(desc.v);
      if (resetScroll) $(desc.v).scrollTop = 0;
      return;
    }
    // NP: no scroll reset — the page underneath must stay exactly as it was.
    if (desc.v === 'nowplaying') { setView('nowplaying'); if (render) d.renderNowPlaying(); return; }
    setView('browse');
    setNavActive(desc.v === 'authors' ? 'authors' : desc.v === 'books' ? 'books' : null);
    if (render) d.renderBrowse(desc);
  }

  // Carousel slide: the newly-shown view enters from `from` ('right' forward | 'left' back).
  function slideInView(el, from) {
    if (REDUCED || !el) return;
    const cls = from === 'left' ? 'nav-in-left' : 'nav-in-right';
    el.classList.remove('nav-in-left', 'nav-in-right');
    void el.offsetWidth;                                     // restart the animation
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }

  // Button-nav filmstrip between two OVERLAY screens (Options ↔ a sub-screen).
  // Unlike slideInView (which animates only the INCOMING pane and lets whatever's
  // under it show through — fine for an in-flow view over the base document, but it
  // exposes the base view when one overlay replaces another) this moves BOTH panes:
  // together they cover the viewport for the whole slide, so the base never flashes.
  // Matches the swipe-back filmstrip. dir: 'fwd' (toV enters from the right) | 'back'
  // (toV enters from the left). Reconciles via applyScreen when it lands (which
  // clears these inline styles).
  function overlayFilmstrip(fromV, toV, dir) {
    const fromEl = overlayEl(fromV), toEl = overlayEl(toV);
    const reconcile = () => applyScreen(d.currentDesc(), { render: false });
    if (REDUCED || !fromEl || !toEl) { reconcile(); return; }
    const w = window.innerWidth, off = dir === 'back' ? -w : w;   // incoming start edge
    toEl.classList.remove('hidden'); fromEl.classList.remove('hidden');
    toEl.style.transition = 'none'; toEl.style.transform = 'translateX(' + off + 'px)';
    fromEl.style.transition = 'none'; fromEl.style.transform = 'translateX(0)';
    void toEl.offsetWidth;                                         // commit start positions
    let done = false;
    const finish = () => { if (done) return; done = true; reconcile(); };
    requestAnimationFrame(() => {
      const tr = 'transform .24s cubic-bezier(.2,.7,.2,1)';
      toEl.style.transition = tr; fromEl.style.transition = tr;
      toEl.style.transform = 'translateX(0)';                     // incoming lands
      fromEl.style.transform = 'translateX(' + (-off) + 'px)';    // outgoing exits the other way
    });
    toEl.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 340);                                      // safety net
  }

  function init(deps) { d = deps; }

  return { init, SETTINGS_SUBS, isSub, isOverlay, overlayEl, appViewEl, viewElFor,
    setView, setNavActive, resetSwipeStyles, applyScreen, slideInView, overlayFilmstrip,
    npOpen: () => npOpen };
})();

if (typeof window !== 'undefined') window.Nav = Nav;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Nav;
