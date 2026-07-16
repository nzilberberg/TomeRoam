// app.js — UI + playback for the TomeRoam PWA.
(() => {
  const $ = (id) => document.getElementById(id);
  const audio = new Audio();
  audio.preload = 'metadata';

  let ctx = null;        // { album, tracks, idx, coverUrl }
  let writeTimer = null;
  let speedCtl = null;   // transport playback-speed control (see js/speed.js)
  const speedCtls = [];  // all mounted speed controls (transport + now-playing), kept in sync
  const LAST = 'pb_lastPlayed';   // locally-remembered last track (survives reloads)
  // OUR OWN last-played spot per book is now owned by Progress (mine.books[book].bk,
  // read via Progress.myBookRecord). Plex hides audiobook viewOffset over HTTP, so we
  // can't read our just-played position back from the server; bestSource() consults
  // Progress.myBookRecord so a Continue tile shows where WE actually got to. (This
  // used to be a parallel `myProgress` map here — a second local progress store —
  // removed so there is ONE local repository; see progress.js myBookRecord.)
  // Per-chapter + book progress lives in the durable, cross-device Progress
  // layer (js/progress.js) — recorded here, merged LWW across peers, read back for
  // the bars/resume. It persists its own localStorage cache, so it survives offline.
  // Settings live in the settings repository (js/settings.js, review #13); these
  // thin delegators keep the many call sites below unchanged.
  const autoUpdateOn = () => Settings.autoUpdate;      // Options (APK only): apply a staged update on the next cold launch (default OFF)
  const freshStartOn = () => Settings.freshStart;      // Options: fresh-start-on-auto-advance (default ON)
  const resetGraceSec = () => Settings.resetGraceSec;  // Options: seconds before a rolled-into chapter's old progress is discarded
  let rollGuard = null;                     // { track, until } — suppress recording a rolled-into chapter during its grace window

  // Per-page-load id, fresh on every script eval. The PBDebug ring PERSISTS across
  // reloads, so a stable-per-load id lets a lock-screen report tell an iOS
  // background RELOAD (a new bootId appears) from an in-memory enterApp re-entry
  // (same bootId) — the still-unpinned trigger of the resume-kill bug.
  const bootId = (() => { try { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())).slice(0, 8); } catch { return 'boot'; } })();

  // ---- media-load resilience (slow/lossy relay) ----------------------------
  let curLoad = null;          // {idx, seekSec, autoplay} — what we're trying to load, for retry
  let loadGen = 0;             // generation token so a stale loadedmetadata can't fire late
  // Bumped by every EXPLICIT reposition/adoption that startTrack does NOT drive
  // (seek/skip/Prev-restart via onManualSeek, peer grab). A pending stream retry
  // captures this so a scrub during its (relay-slow) reprobe isn't undone. Kept
  // SEPARATE from loadGen: loadGen also gates async src/loadedmetadata, so bumping
  // it on a mid-load seek would cancel legitimate in-flight load work.
  let playbackIntentGen = 0;
  let loadRetry = 0;
  let loadRetryTimer = null;
  const MAX_LOAD_RETRY = 4;

  // ---- banking / buffering (js/banking.js — Banking) ------------------------
  // The whole prefetch/whole-bank subsystem + the blue buffered meter live in the
  // Banking module now. app.js keeps hoisted delegators so its many call sites
  // (audio events, startTrack source-selection, the file-row meter) are unchanged,
  // and injects the live playback state + the few things Banking calls back into
  // (updateFileRows, startTrack — see Banking.init). `scrubbing` (seek-drag UI) and
  // `locallyStored` (a playback-source predicate startTrack/bestSource also use)
  // stay here; locallyStored is injected into Banking.
  let scrubbing = false;    // true while a seek slider is being dragged — skip heavy library reflows
  const locallyStored = (i) => !!(window.Downloads && Downloads.trackLocal && ctx.tracks[i] && Downloads.trackLocal(ctx.tracks[i].ratingKey));
  function pumpBank() { return Banking.pump(); }
  function clearBanks() { return Banking.clear(); }
  function elementBusy() { return Banking.elementBusy(); }
  function paintMeter() { return Banking.paintMeter(); }
  function refreshMeter() { return Banking.refreshMeter(); }
  function setBuffered(pct) { return Banking.setBuffered(pct); }
  function nativeBufferedPct() { return Banking.nativeBufferedPct(); }
  function maybeRecoverFromBank() { return Banking.maybeRecover(); }
  function bankedUrl(idx) { return Banking.bankedUrl(idx); }
  // ---- helpers -------------------------------------------------------------
  const fmt = PBLogic.fmt;   // h:mm:ss (js/logic.js — shared with the unit tests)
  const toast = (msg) => {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2800);
  };
  const hideToast = () => { const t = $('toast'); t.classList.remove('show'); clearTimeout(toast._t); };
  const show = (id) => { for (const s of ['signin', 'library']) $(s).classList.toggle('hidden', s !== id); };
  // Set a hero cover (mini transport / now-playing) with the same skeleton →
  // fade-in / branded-fallback states the grid covers use, so a loading or
  // failed hero never shows the browser's broken-image glyph.
  // The transport cover (#pCover) + Now-Playing art (#npArt) — the only two covers
  // NOT loaded through artloader (they're single, always-visible images, so the
  // loader's lazy IntersectionObserver + concurrency queue buy nothing). We DO follow
  // artloader's instant-vs-fade RULE (shared CSS classes): a cover already in the
  // SW/browser cache paints INSTANTLY (art-instant, no fade); only one that took real
  // network time fades in (art-done). Replaying the 0.3s fade on a cached cover is the
  // "flicker on reopen" — same class of bug artloader's dt<120 check already fixed.
  function setArt(el, url) {
    if (!el) return;
    // Idempotent: if we're already showing this exact cover, do NOTHING. Re-setting src
    // (even to the same URL) + stripping the done class restarts the shimmer/fade = a
    // cover FLASH, and updatePlayerUI() runs on every nav/swipe (via setView).
    if (url && el.dataset.artSrc === url) return;
    el.dataset.artSrc = url || '';
    el.classList.remove('art-done', 'art-instant', 'art-failed');
    if (!url) { el.removeAttribute('src'); el.classList.add('art-failed'); return; }
    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    el.onload = () => {
      const dt = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
      el.classList.add(dt < 120 ? 'art-instant' : 'art-done');   // cache hit → no fade; network → fade
    };
    el.onerror = () => { el.removeAttribute('src'); el.classList.add('art-failed'); };
    el.src = url;
  }
  const status = (msg) => { const s = $('clStatus'); if (s) s.textContent = msg || ''; };

  // ---- top-level view + bottom-nav switching -------------------------------
  let npOpen = false;
  function setView(v) {   // 'home' | 'browse' | 'options' | 'nowplaying'
    npOpen = v === 'nowplaying';
    const optOpen = v === 'options';
    // NP and Options are ADDITIVE overlays: they paint over whatever tall
    // screen is showing, and the page underneath is NOT touched. Hiding the
    // tall view shrinks the document, and a short (~viewport-sized) document
    // is what trips iOS 26's ~50pt fixed-layer displacement (the black-band /
    // Options-bar saga — a 1-2px token overflow does NOT count as tall).
    // Only real screen switches (home/browse) swap the in-flow views.
    if (!npOpen && !optOpen) {
      $('home').classList.toggle('parked', v !== 'home');   // parked = off-screen but PAINTED (covers stay decoded)
      $('browse').classList.toggle('hidden', v !== 'browse');
    }
    if (!npOpen) $('options').classList.toggle('hidden', !optOpen);
    $('nowplaying').classList.toggle('hidden', !npOpen);
    document.body.classList.toggle('np-locked', npOpen);   // CSS hook: navbar button/pill swap
    // Home is the base view (even under an additive overlay) whenever it isn't
    // parked → give the document real height so the fixed navbar seats at the true
    // bottom (see .app CSS). This also keeps the NP pill seated when NP is over home.
    document.body.classList.toggle('home-tall', !$('home').classList.contains('parked'));
    $('navbar').classList.toggle('hidden', !Plex.isSignedIn());
    updatePlayerUI();
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
  // #options/#nowplaying + the nav pill). Called at the top of applyScreen — the
  // reconcile point that runs after every swipe (finalize) and every nav — so a
  // swipe that gets interrupted mid-flight can never leave an element stuck
  // offscreen/half-transformed and corrupt later swipes (the "erratic after a
  // while" bug). Safe because applyScreen is NEVER called during an active drag.
  function resetSwipeStyles(keepGhosts) {
    if (!keepGhosts) document.querySelectorAll('.nav-ghost').forEach((n) => n.remove());
    document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());   // transient NP-swipe pill clone
    const els = ['home', 'browse', 'options', 'nowplaying'].map((id) => $(id));
    els.push(document.querySelector('#navbar .np-actions'));
    for (const el of els) if (el) { el.style.transform = ''; el.style.transition = ''; el.style.willChange = ''; el.style.zIndex = ''; }
  }
  // Navigation is driven by the History API so desktop browser back/forward act
  // exactly like the on-screen back button / swipe. Each screen is a small
  // descriptor pushed as a history state; popstate re-renders it.
  // opts.resetScroll (default true) — window/panel scroll reset to top.
  // opts.render (default true) — actually (re)render the view's content. The swipe
  // carousel already renders the destination live during the drag, so on COMMIT it
  // re-runs applyScreen with render:false to reconcile visibility only — no second
  // render (which would reload images = the post-settle flash) and no scroll change.
  function applyScreen(desc, opts) {
    const resetScroll = !opts || opts.resetScroll !== false;
    const render = !opts || opts.render !== false;
    resetSwipeStyles(opts && opts.keepGhosts);   // baseline: no swipe can leave stale transforms/ghosts behind
    // Home's fixed-navbar seating is handled by `body.home-tall` (real scroll
    // height — see .app CSS); the scrollTo just puts it at the top on entry. (The
    // 1px is a harmless remnant of the abandoned "scroll runway" theory.) NOTE: no
    // carousel-scroll restore here — home is PARKED (painted), not display:none, so
    // its carousels keep their scrollLeft on their own; re-setting it would fire a
    // scroll-snap correction (the "oh wait, let me scroll over" animation).
    if (!desc || desc.v === 'home') { setView('home'); setNavActive('home'); if (resetScroll) window.scrollTo(0, 1); return; }
    // Options is an additive overlay (like NP): no document scroll changes —
    // the page underneath stays exactly as it was. Only its own panel resets.
    if (desc.v === 'options') { setView('options'); setNavActive('options'); if (render) OptionsScreen.render(); if (resetScroll) $('options').scrollTop = 0; return; }
    // NP: no scroll reset — the page underneath must stay exactly as it was.
    if (desc.v === 'nowplaying') { setView('nowplaying'); if (render) renderNowPlaying(); return; }
    setView('browse');
    setNavActive(desc.v === 'authors' ? 'authors' : desc.v === 'books' ? 'books' : null);
    if (render) Browse.render(desc);
  }
  // NAVIGATION IS IN-MEMORY, not via the History API. iOS standalone PWAs RELOAD the
  // whole page on the OS back/forward SWIPE whenever back-history exists (wiping
  // playback + banks + speed — the interactive swipe reloads, a guard entry doesn't
  // help). So we keep browser history at a SINGLE entry (the OS swipe then has nothing
  // to navigate → inert) and drive Back from this stack instead.
  let navStack = [{ v: 'home' }];
  const fwdStack = [];                  // screens backed out of — for browser-style forward
  const currentDesc = () => navStack[navStack.length - 1];
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Which .app view element renders a screen (NP is a fixed overlay outside .app — it
  // doesn't slide; the incoming .app view slides in over/under it instead).
  const viewElFor = (v) => v === 'options' ? $('options') : v === 'home' ? $('home') : v === 'nowplaying' ? null : $('browse');
  // Carousel slide: the newly-shown view enters from `from` ('right' forward | 'left' back).
  function slideInView(el, from) {
    if (REDUCED || !el) return;
    const cls = from === 'left' ? 'nav-in-left' : 'nav-in-right';
    el.classList.remove('nav-in-left', 'nav-in-right');
    void el.offsetWidth;                                     // restart the animation
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }
  // Forward navigation to a NEW screen (clears the forward stack, slides in from right
  // unless anim is suppressed for lateral bottom-nav tab switches).
  function navTo(desc, anim = 'right') {
    const cur = currentDesc();
    if (cur && cur.v === desc.v && !desc.author && !desc.book) navStack[navStack.length - 1] = desc;
    else navStack.push(desc);
    fwdStack.length = 0;                                     // a new navigation drops any forward history
    applyScreen(desc);
    if (anim) slideInView(viewElFor(desc.v), anim);
  }
  function goBack() {
    if (navStack.length <= 1) return;   // at root — never pop past it (so we never exit/reload)
    fwdStack.push(navStack.pop());
    const d = currentDesc();
    applyScreen(d);
    slideInView(viewElFor(d.v), 'left');
  }
  // Bottom-nav tabs are LATERAL switches, not forward drill-ins → no slide (a
  // directional slide would imply a back/forward relationship they don't have).
  function goHome() { navTo({ v: 'home' }, null); }
  function goAuthors() { navTo({ v: 'authors' }, null); }
  function goBooks() { navTo({ v: 'books' }, null); }
  function goOptions() { navTo({ v: 'options' }, null); }
  function openAuthor(a) { navTo({ v: 'authorBooks', author: { ratingKey: a.ratingKey, title: a.title } }); }
  function openFiles(b) { navTo({ v: 'files', book: b }); }
  function openNowPlaying() { if (ctx) navTo({ v: 'nowplaying' }); }
  // The CURRENT book's chapter-list descriptor (Now-Playing forward-nav target).
  function filesDescForCurrent() {
    if (!ctx) return null;
    return { v: 'files', book: { ratingKey: ctx.book, title: (ctx.album && ctx.album.title) || 'Book',
      parentTitle: (ctx.album && ctx.album.parentTitle) || '', thumb: ctx.album && ctx.album.thumb } };
  }

  // EDGE-gated INTERACTIVE page carousel. Grab from the LEFT edge and drag right →
  // the current page follows your finger and reveals the previous one (Back). Grab
  // from the RIGHT edge and drag left → reveals the next / (on Now-Playing) the
  // chapter list (Forward). On release, whichever page is more on screen — or a
  // flick — snaps into place; otherwise it snaps back. A screen↔screen page slides
  // UNDER the persistent bars (topbar/transport/nav); a Now-Playing transition slides
  // the full-screen overlay (its bars are hidden). Mid-screen drags stay for content.
  const EDGE = 44, FLICK_V = 0.4, THRESH = 0.42;   // px from edge, px/ms flick, fraction to commit
  // #options and #nowplaying are FIXED OVERLAYS (out of .app's flow); #home/#browse
  // are in-flow views sharing the document scroll. That split drives the whole model
  // below: an overlay slides as its OWN real element (nothing under it is touched, so
  // the underlying page never scrolls); two in-flow views can't coexist, so an
  // app-view↔app-view swap freezes the outgoing one as a fixed ghost snapshot.
  const isOverlay = (v) => v === 'options' || v === 'nowplaying';
  const overlayEl = (v) => v === 'nowplaying' ? $('nowplaying') : $('options');
  const appViewEl = (v) => v === 'home' ? $('home') : $('browse');
  function bindSwipeBack() {
    let d = null, finishing = false;
    const navPill = () => $('navbar').querySelector('.np-actions');
    // A detached, non-interactive clone of the pill for the duration of an NP swipe:
    // it rides with NP (added as a mover) so the pill travels, while np-locked is off
    // for the slide so the real nav buttons are visible + revealed as NP moves.
    function npPillClone() {
      document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());
      const clone = navPill().cloneNode(true);
      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      clone.classList.add('np-pill-float');
      document.body.appendChild(clone);
      return clone;
    }

    // A ghost of the current app-view (minus the shared topbar), z BELOW the
    // persistent bars so it slides under them, shifted up by the current scroll to
    // match what's on screen. Used ONLY for app-view↔app-view (the real view is
    // re-rendered for the destination, so the outgoing state must be snapshotted).
    // Opaque gradient identical to the page background — a flat var(--bg) read as a
    // DARKER pane than the gradient-backed real page (visible on swipe begin).
    const GHOST_BG = 'radial-gradient(140% 120% at 50% 0%, #262b34 0%, var(--bg) 55%)';
    // Clones must NOT re-trigger the art loader: a cloned <img> that was never
    // scrolled into view (no src yet) would get adopted + fetched (= "loading all
    // images" during the slide). Strip data-art so loaded covers still show via
    // their copied src while unloaded ones just stay as the skeleton.
    const freezeArt = (root) => root.querySelectorAll('img[data-art]').forEach((i) => i.removeAttribute('data-art'));
    // cloneNode does NOT copy scroll positions. Home's carousels scroll sideways, so
    // a fresh clone shows the FIRST tiles while the real (scrolled) home shows a
    // different set → tiles change when the swipe settles. Copy scrollLeft across
    // (must run AFTER the clone is in the DOM and laid out). Index-matched: the
    // carousels appear in the same order in src and clone.
    function copyScroll(src, dst) {
      const s = src.querySelectorAll('.carousel'), c = dst.querySelectorAll('.carousel');
      // Prefer the saved dataset.sl (survives display:none, where scrollLeft reads 0).
      s.forEach((el, i) => { if (c[i]) c[i].scrollLeft = (+el.dataset.sl || el.scrollLeft || 0); });
    }
    // The fixed full-viewport pane both snapshot builders mount into.
    function ghostWrap() {
      const wrap = document.createElement('div');
      wrap.className = 'nav-ghost';
      wrap.style.cssText = 'position:fixed;inset:0;z-index:28;overflow:hidden;background:' + GHOST_BG + ';pointer-events:none;will-change:transform;';
      return wrap;
    }
    function ghostApp() {
      const clone = document.querySelector('.app').cloneNode(true);
      // #library's topbar clearance is id-based CSS (#library{padding-top:46px}) and
      // would be LOST when we strip ids → the clone's top content shifts up ~46px
      // under the topbar (the "top content hidden / reflow on swipe start" bug).
      // Preserve it inline BEFORE stripping ids so the ghost matches the idle page.
      const lib = clone.querySelector('#library'); if (lib) lib.style.paddingTop = '46px';
      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      const tb = clone.querySelector('.topbar'); if (tb) tb.remove();
      clone.querySelectorAll('.hidden, .parked').forEach((n) => n.remove());   // drop cached/hidden/parked panes — only the visible view matters
      freezeArt(clone);
      clone.style.margin = '0 auto';                                  // keep .app's centering (was '0' → left-aligned vs the real page)
      clone.style.transform = 'translateY(' + (-(window.scrollY || 0)) + 'px)';
      const wrap = ghostWrap();
      wrap.appendChild(clone);
      document.body.appendChild(wrap);
      copyScroll(document.querySelector('.app'), clone);   // match carousel scroll to the live page
      return wrap;
    }

    function begin(x, y, target) {
      if (finishing) return;   // settle animation running — ignore new gestures until it lands
      // Leftover from an INTERRUPTED gesture (a 2nd touch mid-swipe, a missed
      // touchend, etc.) → hard-reset to known-good before starting fresh. This is
      // what stops corruption from accumulating over many swipes.
      if (d || document.querySelector('.nav-ghost')) {
        if (window.PBDebug) PBDebug.log('SWIPE', 'leftover state on begin → hard reset');
        d = null; resetSwipeStyles(); applyScreen(currentDesc(), { render: false });
      }
      if (target.closest && target.closest('#player, .alphaindex, input, .navbtn, .np-controls, .np-actions, .carousel')) return;
      const fromLeft = x <= EDGE, fromRight = x >= window.innerWidth - EDGE;
      if (!fromLeft && !fromRight) return;
      const from = currentDesc();
      let dir, dest, newNav = false;
      if (fromLeft) { if (navStack.length <= 1) return; dir = 'back'; dest = navStack[navStack.length - 2]; }
      else if (from && from.v === 'nowplaying') { dir = 'fwd'; dest = filesDescForCurrent(); newNav = true; }  // NP → chapter list
      else if (fwdStack.length) { dir = 'fwd'; dest = fwdStack[fwdStack.length - 1]; }
      else return;
      if (!dest) return;
      d = { dir, from, dest, newNav, x0: x, y0: y, dx: 0, w: window.innerWidth, live: false, locked: false,
            lastX: x, lastT: performance.now(), vx: 0, scroll0: window.scrollY || 0, movers: [], clobbered: false };
    }

    // Ensure `desc`'s app-view is the visible one in .app, rendering browse content
    // when it's a NEW screen (forward). On BACK the destination is the very screen the
    // overlay/parent was opened over, so it's already there — no re-render (no flash).
    function showAppView(desc, render) {
      // Hide a STALE options overlay lurking over the base view (NP opened from Options
      // → an NP→chapter-list swipe would show Options through it). But NOT when Options
      // is the OUTGOING screen of THIS swipe (back from Options → tracks): there it's the
      // mover that must slide out, so hiding it makes it vanish mid-drag.
      if (!d || d.from.v !== 'options') $('options').classList.add('hidden');
      if (desc.v === 'home') { $('home').classList.remove('parked'); $('browse').classList.add('hidden'); }
      else { $('browse').classList.remove('hidden'); $('home').classList.add('parked'); if (render) Browse.render(desc); }
    }

    // A fixed snapshot of HOME at its TOP (home content is static/already rendered).
    // Used as the incoming pane for back-to-home so it shows from the top WITHOUT
    // touching the real document scroll (the shared-scroll problem: the real #home
    // sits at the outgoing page's scrollY). Replicates .app + #library top padding.
    function snapshotHome() {
      const clone = $('home').cloneNode(true);
      clone.removeAttribute('id'); clone.classList.remove('hidden', 'parked');
      freezeArt(clone);
      const lib = document.createElement('div'); lib.style.paddingTop = '46px'; lib.appendChild(clone);
      const box = document.createElement('div'); box.className = 'app'; box.style.margin = '0 auto'; box.appendChild(lib);
      const wrap = ghostWrap();
      wrap.appendChild(box); document.body.appendChild(wrap);
      copyScroll($('home'), clone);   // match carousel scroll so the snapshot shows the same tiles as the live home
      return wrap;
    }

    // Build the sliding "movers": {el, base}; during the drag transform =
    // translateX(base + t). base 0 = OUTGOING, base ±w = INCOMING. BOTH sides always
    // move (a filmstrip, never a reveal). The real document is NEVER scrolled and the
    // real in-flow view is only re-rendered when the INCOMING is a real #browse (which
    // must live in .app); otherwise app-views ride as their real element (transform is
    // scroll-neutral) or a fixed snapshot — so scroll cannot change during a swipe.
    function start() {
      d.live = true;
      const fromV = d.from.v, toV = d.dest.v, off = d.dir === 'back' ? -d.w : d.w;
      const fromOv = isOverlay(fromV), toOv = isOverlay(toV);
      const incomingBrowse = !toOv && toV !== 'home';   // a real #browse render (must occupy .app)
      if (window.PBDebug) PBDebug.log('SWIPE', `start ${d.dir} ${fromV}→${toV} ghosts=${document.querySelectorAll('.nav-ghost').length}`);
      let out, incoming, pill = null;

      // ── OUTGOING (base 0) FIRST ── the ghost must snapshot the current #browse
      // BEFORE the incoming render (below) clobbers it (browse→browse).
      if (fromOv) {
        out = { el: overlayEl(fromV), base: 0 };
        if (fromV === 'nowplaying') { document.body.classList.remove('np-locked'); pill = { el: npPillClone(), base: 0 }; }
      } else if (incomingBrowse) {
        out = { el: ghostApp(), base: 0, remove: true };  // incoming needs the real #browse → freeze outgoing as a ghost
      } else {
        out = { el: appViewEl(fromV), base: 0 };           // incoming is overlay/snapshot → move the real view (scroll-neutral)
      }

      // ── INCOMING (base off) ──
      if (toOv) {
        const el = overlayEl(toV);
        if (toV === 'nowplaying') { renderNowPlaying(); document.body.classList.remove('np-locked'); }
        else OptionsScreen.render();
        el.classList.remove('hidden');
        incoming = { el, base: off };
        if (toV === 'nowplaying') pill = { el: npPillClone(), base: off };
      } else if (toV === 'home') {
        incoming = { el: snapshotHome(), base: off, remove: true };   // static snapshot at top, .app untouched
      } else {
        showAppView(d.dest, true);                      // render dest into the real #browse (outgoing already ghosted)
        d.clobbered = !fromOv && appViewEl(fromV) === $('browse');   // browse→browse → abort re-renders
        incoming = { el: $('browse'), base: off };
      }

      d.movers = [out, incoming];
      if (pill) d.movers.push(pill);
      // Park the incoming panes offscreen. Deliberately NO will-change on the real
      // in-flow views (#home/#browse) — promoting them to a layer can nudge the iOS
      // fixed navbar (a "pop" at swipe start). The transform alone is enough.
      for (const m of d.movers) if (m.base) m.el.style.transform = 'translateX(' + m.base + 'px)';
    }

    function move(x, y, ev) {
      if (!d) return;
      const dx = x - d.x0, dy = y - d.y0;
      if (!d.locked) {
        // Edge grab committed → swallow native scroll from the VERY FIRST move. Once
        // iOS starts a scroll the touchmove goes non-cancelable and preventDefault is
        // ignored for the rest of the gesture — the page then scrolls the whole swipe.
        if (ev && ev.cancelable) ev.preventDefault();
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        d.locked = true;
        if (Math.abs(dx) <= Math.abs(dy)) { d = null; return; }   // vertical intent → abandon (native scroll resumes)
        start();
      }
      if (!d.live) return;
      if (ev && ev.cancelable) ev.preventDefault();
      let t = d.dir === 'back' ? Math.max(0, dx) : Math.min(0, dx);
      t = Math.max(-d.w, Math.min(d.w, t));
      d.dx = t;
      for (const m of d.movers) m.el.style.transform = 'translateX(' + (m.base + t) + 'px)';
      const now = performance.now();
      if (now > d.lastT + 8) { d.vx = (x - d.lastX) / (now - d.lastT); d.lastX = x; d.lastT = now; }
    }

    function end() {
      if (!d) return;
      const cur = d; d = null;
      if (!cur.live) return;
      const prog = Math.abs(cur.dx) / cur.w;                    // how much of the incoming page is on screen
      const flickGo = cur.dir === 'back' ? cur.vx > FLICK_V : cur.vx < -FLICK_V;
      const flickNo = cur.dir === 'back' ? cur.vx < -FLICK_V : cur.vx > FLICK_V;
      settle(cur, !flickNo && (flickGo || prog > THRESH));       // whichever is more on screen (or a flick) wins
    }

    function settle(cur, commit) {
      finishing = true;
      const off = cur.dir === 'back' ? -cur.w : cur.w;
      const outTo = commit ? -off : 0;                          // committed: outgoing exits the way the strip travels
      const inTo = commit ? 0 : off;                            // committed: incoming lands; else it retreats
      const tr = 'transform .2s cubic-bezier(.2,.7,.2,1)';
      for (const m of cur.movers) m.el.style.transition = tr;
      requestAnimationFrame(() => {
        for (const m of cur.movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';
      });
      let done = false;
      const dropPanes = () => { for (const m of cur.movers) if (m.remove && m.el.parentNode) m.el.remove(); };
      const finalize = () => {
        if (done) return; done = true;
        if (window.PBDebug) PBDebug.log('SWIPE', `${commit ? 'commit' : 'abort'} ${cur.dir} ${cur.from.v}→${cur.dest.v}`);
        for (const m of cur.movers) { m.el.style.transition = ''; m.el.style.transform = ''; m.el.style.willChange = ''; }
        if (commit) {
          if (cur.dir === 'back') fwdStack.push(navStack.pop());
          else if (cur.newNav) { navStack.push(cur.dest); fwdStack.length = 0; }   // NP → chapters is a fresh forward nav
          else navStack.push(fwdStack.pop());
        }
        const dest = currentDesc();
        // Committing to HOME: home was display:none while we were away, so the browser
        // dropped its decoded cover images and re-decodes them on show = a flash. Show
        // the real home UNDERNEATH the still-covering snapshot, let it decode for a
        // couple frames, THEN drop the snapshot → no flash. (Swiping back from NP never
        // flashed because NP keeps home visible; this gives every path that behavior.)
        if (commit && dest.v === 'home') {
          applyScreen(dest, { render: false, keepGhosts: true });
          // Keep the cover until the real home's covers are actually decoded/paintable
          // (a fixed frame count guessed wrong). img.decode() resolves when the image
          // can paint without a flash — covering both a re-decode and a re-fetch.
          const covers = Array.from($('home').querySelectorAll('img')).filter((i) => i.getAttribute('src'));
          let dropped = false;
          const drop = () => { if (dropped) return; dropped = true; dropPanes(); finishing = false; };
          Promise.all(covers.map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()))).then(drop);
          setTimeout(drop, 600);   // safety net — never keep the cover pane forever
          return;
        }
        dropPanes();
        if (commit) applyScreen(dest, { render: false });   // dest already rendered live → reconcile only
        else {
          // Aborted → restore the current screen (re-render only if its element was
          // clobbered, i.e. browse→browse) + put back the exact starting scroll.
          applyScreen(dest, { render: cur.clobbered, resetScroll: false });
          window.scrollTo(0, cur.scroll0);
        }
        finishing = false;
      };
      const anchor = cur.movers[0] && cur.movers[0].el;
      if (anchor) anchor.addEventListener('transitionend', finalize, { once: true });
      setTimeout(finalize, 340);
    }

    document.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; begin(t.clientX, t.clientY, e.target); }, { passive: true });
    document.addEventListener('touchmove', (e) => { const t = e.changedTouches[0]; move(t.clientX, t.clientY, e); }, { passive: false });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
    document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') begin(e.clientX, e.clientY, e.target); });
    document.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && d) move(e.clientX, e.clientY, e); });
    document.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') end(); });
    // History stays at one entry, so a popstate is only a stray OS gesture — re-anchor
    // and keep the current in-memory screen (never navigate away → never reload).
    window.addEventListener('popstate', () => { try { history.replaceState({ v: 'app' }, ''); } catch {} applyScreen(currentDesc()); });
  }
  // Pull-to-refresh — Home only, from the very top. A downward drag reveals a
  // spinner; releasing past the threshold refreshes. Vertical + top-gated so it
  // never fights the horizontal carousels or normal scrolling.
  const PTR_THRESHOLD = 72;
  let ptrPx = 0;
  function setPtr(px) {
    ptrPx = px;
    const el = $('ptr');
    if (!el) return;
    const r = Math.min(px / (PTR_THRESHOLD * 1.4), 1);
    el.style.transform = `translateX(-50%) translateY(${Math.min(px * 0.6, 64)}px)`;
    el.style.opacity = r;
    el.classList.toggle('ready', px >= PTR_THRESHOLD);
  }
  function bindPullRefresh() {
    let y0 = null, pulling = false;
    document.addEventListener('touchstart', (e) => {
      // Same exclusions as swipe-back: a touch on the transport, nav, or a form
      // control must never arm the pull (a slider drag with a slight downward
      // wobble would otherwise preventDefault the move and fight the scrub).
      // Home must be the CURRENT screen (history state), not merely visible —
      // additive overlays (NP, Options) leave #home un-hidden underneath.
      const hs = currentDesc();
      if (refreshing || (hs && hs.v && hs.v !== 'home') || $('home').classList.contains('parked') || window.scrollY > 0
        || e.target.closest('#player, .navbar, .alphaindex, input')) { y0 = null; return; }
      y0 = e.touches[0].clientY; pulling = false;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (y0 == null || refreshing) return;
      const dy = e.touches[0].clientY - y0;
      if (window.scrollY > 0) { y0 = null; if (pulling) setPtr(0); pulling = false; return; }
      if (dy > 0) { pulling = true; e.preventDefault(); setPtr(dy); }   // block native bounce while pulling
      else if (pulling) setPtr(0);
    }, { passive: false });
    const finish = () => {
      if (y0 == null) return;
      const trigger = pulling && ptrPx >= PTR_THRESHOLD;
      y0 = null; pulling = false;
      if (trigger) refreshHome(); else setPtr(0);
    };
    document.addEventListener('touchend', finish, { passive: true });
    document.addEventListener('touchcancel', finish, { passive: true });
  }

  // Play a book chosen from the browse/home views (resumes if it's in progress).
  function playFromBrowse(albRk, meta) {
    playBook(bookEntries[albRk] || { book: albRk, track: null, offsetMs: 0 }, meta);
  }
  // Play a specific file (chapter) picked in the files view.
  function playFileFromBrowse(book, track, startMs) {
    // Tap a chapter → resume THAT chapter from its stored per-chapter offset.
    let ms = startMs || 0;
    const r = Progress.trackRecord(book.ratingKey, track.ratingKey);
    if (r && r.d) ms = Math.min(r.o, Math.max(0, r.d - 1000));
    playBookAt(book.ratingKey, book, track.ratingKey, ms);
  }

  // ---- sign-in (js/signin-screen.js — SignInScreen) ------------------------
  // The PIN flow + button/link/info lifecycle live in SignInScreen; app.js keeps
  // show()/the view-switch and injects enterApp + toast at init (see bind()).

  // ---- home (Continue Listening + Recently Added carousels) ----------------
  async function enterApp(reason) {
    // Entry breadcrumb for the resume-kill trigger: reason + whether we re-entered
    // WHILE hidden and/or playing (the dangerous mid-playback re-fire). Compare
    // boot= across two enterApp lines to tell a reload (differs) from an in-memory
    // re-entry (same). See [[tomeroam-lockscreen-resume-kill-bug]].
    if (window.PBDebug) PBDebug.log('LIFE', `enterApp reason=${reason || '?'} boot=${bootId} hidden=${document.hidden} playing=${!audio.paused} hadCtx=${!!ctx}`);
    show('library');
    $('navbar').classList.remove('hidden');
    // Single history entry + in-memory nav (see navTo): the OS back-swipe has nothing
    // to navigate, so it can't reload the page and kill playback.
    navStack = [{ v: 'home' }];
    history.replaceState({ v: 'app' }, '');
    applyScreen({ v: 'home' });
    $('serverName').textContent = '';
    // Offline-first: paint the last-known library from IndexedDB immediately, so
    // the app never shows a blank/spinner-forever screen while (or if) the network
    // comes up. loadHomeData() overwrites this with fresh data once Plex answers.
    // Hydrate the cross-device layers from cache FIRST so the tile resume/peer line
    // is present on frame 1 — Presence/Progress full init + live polling happen later
    // in startCoordination (post-connect), too late for the first paint, which is why
    // the play time + peer badge used to flash in a moment after launch.
    // NB: use the BARE identifiers — presence.js/progress.js are lexical globals; only
    // some set window.X (progress does, presence historically didn't), so a
    // `window.Presence &&` guard silently skips the whole line. (This is the window.X
    // footgun from the offline saga — the peer hydrate was a no-op until this fix.)
    if (typeof Progress !== 'undefined' && Progress.hydrate) Progress.hydrate();
    if (typeof Presence !== 'undefined' && Presence.cachedPeers) peersNow = Presence.cachedPeers();
    // Hydrate the plugin cold-resume map from cache so the first paint already carries the
    // grey resume times (getResumeMap is a live, uncached read — otherwise they pop in a
    // beat later). loadHomeData refreshes bookEntries in place from the live read.
    try {
      const cachedResume = JSON.parse(localStorage.getItem('pb_resumeMap') || '[]');
      if (Array.isArray(cachedResume)) for (const b of cachedResume) if (b && b.book != null) bookEntries[b.book] = b;
    } catch { /* ignore malformed cache */ }
    const painted = await renderCachedHome();
    // No cached library yet (first-ever launch / cleared cache): paint SKELETON
    // carousels so the home screen shows its real structure immediately while
    // Plex connects, instead of a lone spinner. loadHomeData overwrites them.
    if (!painted) HomeScreen.showSkeletons();
    status(painted ? '' : 'Connecting to your Plex server…');
    // Paint the transport bar from the persisted snapshot NOW — BEFORE connect — so
    // it's instant on ANY launch (airplane OR low-bandwidth), matching renderCachedHome
    // above. It was instant ONLY offline before: restoreLastPlayed paints it, but that
    // runs AFTER `await Plex.connect()` — on a SLOW (not failed) connect the paint was
    // delayed by seconds, while airplane's fast-failing connect fell straight to the
    // catch. Same cache-first rule as the .22 withCache fix: show last-known
    // immediately, reconcile after connect. Purely visual (sets no ctx).
    let lastSnap = null;
    try { lastSnap = JSON.parse(localStorage.getItem(LAST) || 'null'); } catch { /* malformed */ }
    paintSnapshotBar(lastSnap);
    if (window.PBDebug) PBDebug.log('PLAY', 'TB snapshot pre-connect painted=' + !!(lastSnap && lastSnap.book));
    try {
      await Plex.connect();
      $('serverName').textContent = Plex.getServerName() || 'Plex';
      status('');

      startCoordination();

      // Bring the transport back to whatever was playing last (paused).
      await restoreLastPlayed();

      await loadHomeData();

      // Home is up + Plex reached — quietly warm the browse pages in the
      // background so navigating to them is instant. Strictly subordinate: it
      // yields the relay to the visible screen (Plex.foregroundBusy) and to live
      // playback (elementBusy), and adapts its own concurrency to the link.
      if (window.Warmer) Warmer.start({ shouldYield: () => { try { return elementBusy(); } catch { return false; } } });
    } catch (e) {
      // Offline / Plex unreachable. Bring up durable-progress + presence anyway
      // (they publish best-effort and recover on reconnect), restore the transport
      // from cached metadata, and keep the cached home visible. The Net banner
      // explains the state and its reconnect pass refreshes automatically.
      startCoordination();
      try { await restoreLastPlayed(); } catch {}
      const shown = painted || await renderCachedHome();
      if (window.PBDebug) PBDebug.log('CACHE', 'enterApp offline: shown=' + shown + ' err=' + (e && e.message));
      if (!shown) {
        // Nothing cached yet — the app has never completed an online library load
        // on this device (or the cache was cleared). Tell the user how to enable
        // offline instead of a scary generic error.
        $('clRow').innerHTML = '';
        $('raRow').innerHTML = '';
        status('No saved library yet — open the app once while connected to Plex to enable offline use.');
      } else status('');
      if (window.Net) Net.checkPlex();
    }
  }

  // Bring up multi-device coordination + durable progress + the render tick.
  // Idempotent: enterApp reaches this via either the online or the offline
  // (catch) path; init only the first time. (Reconnects do NOT re-enter enterApp
  // — Net's reconnect pass calls loadHomeData directly.)
  let coordUp = false;
  function startCoordination() {
    if (!coordUp) {
      coordUp = true;
      Presence.init({ onPeers, onSupersede: onSuperseded });
      Progress.init({ onMerged: () => { if (!document.hidden) renderPresence(); } });
    }
    Progress.setActive(true);
    OptionsScreen.renderDeviceName();
    startRenderTick();
  }

  // ---- Home screen (js/home-screen.js — HomeScreen) ------------------------
  // Orchestration (fetch library, derive feeds, paint carousels/skeletons/the
  // Downloaded row) lives in HomeScreen. app.js keeps hoisted delegators (call
  // sites here — enterApp — precede the module wiring) and injects the shared
  // renderTile / renderPresence / status / bookEntries. See home-screen.js for
  // why the tile engine stays here (welded to the live playback context).
  function renderCachedHome() { return HomeScreen.renderCached(); }
  function loadHomeData(opts) { return HomeScreen.load(opts); }

  // Pull-to-refresh: re-pull the home feeds with a fresh whole-library fetch.
  let refreshing = false;
  async function refreshHome() {
    if (refreshing) return;
    refreshing = true;
    $('ptr').classList.add('spin');
    // Watchdog: never let the spinner/lock wedge. A refresh awaits a live library
    // fetch; on the slow/lossy relay (or if a connection stalls) that can take a
    // long time, and if the app is suspended mid-fetch the abort timer freezes so
    // the await may not settle until resume. Release the UI after a bounded wait
    // regardless — loadHomeData still renders if/when it eventually resolves.
    let released = false;
    const release = () => { if (released) return; released = true; refreshing = false; setPtr(0); $('ptr').classList.remove('spin'); };
    const watchdog = setTimeout(() => { if (!released) { release(); toast('Still refreshing — showing what we have'); } }, 12000);
    try { Plex.clearCaches(); Browse.clearCache(); await loadHomeData({ force: true }); }
    catch (e) { if (!released) toast(e.message || 'Refresh failed'); }
    finally { clearTimeout(watchdog); release(); }
  }

  // 1/3-width tile, stacked vertically: art, title, author, resume·peer line,
  // progress bar. data-book keeps resume/peer numbers live via the presence tick.
  function renderTile(b) {
    const cover = b.thumb ? Plex.artUrl(b.thumb) : null;
    const total = b.leafCount || 0, done = b.viewedLeafCount || 0;
    const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.book = b.ratingKey;
    el.dataset.key = String(b.ratingKey);   // stable key for in-place reconcile (Browse.patchRows)
    el._sig = Browse.bookSig(b);             // visible-projection sig, SAME fn patchRows compares with
    el.innerHTML = `
      <div class="covertap" title="Resume">
        <img class="cover${cover ? '' : ' art-failed'}" ${cover ? `data-art="${cover}"` : ''} decoding="async" alt="">
        <span class="playoverlay">▶</span>
      </div>
      <div class="ttitle"></div>
      <div class="tauthor"></div>
      <div class="pline"><div class="pname"></div><div class="ptimes"></div></div>
      <div class="progress"><i style="width:${pct}%"></i></div>`;
    el.querySelector('.ttitle').textContent = b.title || 'Book';
    el.querySelector('.tauthor').textContent = b.parentTitle || '';
    el.querySelector('.covertap').addEventListener('click', (e) => { e.stopPropagation(); playFromBrowse(b.ratingKey, b); });
    el.addEventListener('click', () => openFiles(b));
    setDlBadge(el, b.ratingKey);   // download progress ring / check
    paintTileLine(el);   // fill the resume·peer line NOW, so the tile never paints empty→value
    return el;
  }

  // ---- multi-device presence UI --------------------------------------------
  let peersNow = [];
  const bookEntries = {};   // book -> cold entry (from the resume playlist)

  // How "current" a device state is, on the server clock: a playing device is
  // live NOW; a paused/idle one is as-of when it last published.
  function recency(d) { return PBLogic.recency(d, Plex.serverNow()); }

  function peerFor(book) {
    const list = peersNow.filter((p) => String(p.book) === String(book));
    if (!list.length) return null;
    return list.sort((a, b) => recency(b) - recency(a))[0];
  }

  // Most-recently-updated resume source for a book: {track, pos(ms), ts}. A live
  // peer's position is EXTRAPOLATED to now (Presence.livePos).
  function bestSource(book, cold) {
    // Ordered by trust, least-authoritative first; PBLogic.pickResume picks the
    // newest by ts (first wins ties). Keep this order — it IS the handoff policy.
    const cands = [
      { track: cold ? cold.track : null, pos: cold ? (cold.offsetMs || 0) : 0, ts: cold ? (cold.ts || 0) * 1000 : -1 },
    ];
    const pr = Progress.bookRecord(book);   // merged cross-device book-level record (LWW winner)
    if (pr) cands.push({ track: pr.t, pos: pr.o || 0, ts: pr.ts || 0 });
    const mine = Progress.myBookRecord(book);   // our own last spot on THIS device (Plex won't echo it back)
    if (mine) cands.push({ track: mine.track, pos: mine.pos || 0, ts: mine.ts || 0 });
    const p = peerFor(book);         // a live peer's pos is EXTRAPOLATED to now
    if (p) cands.push({ track: p.track, pos: Presence.livePos(p), ts: recency(p) });
    let best = PBLogic.pickResume(cands);   // `let`: the live-playback branch below REPLACES it (a const here threw on every same-book tile tap)
    // If we're actively PLAYING this book, the live playhead is the freshest source,
    // full stop — use it stamped NOW. (The old `ctx.updatedAt > best.ts` failed on a
    // TIE: updatedAt equals the last recorded ts from the same play session, so a
    // strict > lost and tapping the tile rewound to the recorded spot. No live peer
    // can coexist here — supersede prevents two devices playing the same book.)
    if (ctx && String(ctx.book) === String(book) && !audio.paused && audio.currentTime) {
      best = { track: ctx.tracks[ctx.idx].ratingKey, pos: audio.currentTime * 1000, ts: Plex.serverNow() };
    }
    return best;
  }

  const cssEsc = (v) => (window.CSS && CSS.escape) ? CSS.escape(String(v)) : String(v);

  // ---- progress display: ONE line per book/chapter, colour = record author ----
  // { text, cls, pct } where cls is 'mine' (orange = this device) | 'peer' (green +
  // name) | '' (no author / cold). Ticks live when that author is currently playing
  // (local audio, or a peer extrapolated); otherwise the static merged value.
  // Remaining is shown as wall-clock-to-listen at the LOCAL playback speed (matches
  // Now-Playing). Elapsed/position and total are content time (unscaled) — a stable
  // property of where you are / how long the thing is. A 1.8× rate is why an unscaled
  // 16:37:07 book remainder reads 9:13:57 in NP; now they agree.
  // DISPLAY speed for the tile/NP "remaining" times (remaining / spd). Use the
  // INTENDED speed — the mounted speed control, else the saved pb_speed — NOT
  // audio.playbackRate: loading a track resets the element's playbackRate to 1 for a
  // window (until loadedmetadata restores it), and reading that live value made the
  // remaining time flash 1x->Nx on every launch. The intended speed is stable.
  const spd = () => PBLogic.displaySpeed(
    (speedCtl && speedCtl.getRate) ? speedCtl.getRate() : null,
    Settings.speed,
  );
  const trackCache = {};   // book -> tracks[] so a peer's book-cum can be computed from its presence pos
  function cacheTracks(book, tracks) { if (book != null && tracks && tracks.length) trackCache[book] = tracks; }
  function tracksFor(book) { return (ctx && String(ctx.book) === String(book)) ? ctx.tracks : (trackCache[book] || null); }
  // A peer's BOOK cumulative (ms) + total from its LIVE presence {track,pos}, using the
  // book's track durations — instant (presence polls every ~6s / websocket), vs waiting
  // for the peer's durable pb_prog board (20s). This is what restores instant peer
  // display after a handoff; null when we don't have the book's track list.
  function peerBookCum(book, p) {
    const tracks = tracksFor(book); if (!tracks) return null;
    const idx = tracks.findIndex((t) => String(t.ratingKey) === String(p.track));
    if (idx < 0) return null;
    let before = 0, tot = 0;
    tracks.forEach((t, i) => { const d = t.durationMs || 0; tot += d; if (i < idx) before += d; });
    return { cum: before + Presence.livePos(p), tot };
  }
  // { name, times, cls, pct } — name is the PEER's name (blank for our own / none)
  // and rides its own line; times is the cum / -remaining line.
  function bookLine(book) {
    if (ctx && String(ctx.book) === String(book) && !audio.paused && audio.currentTime) {
      const bt = bookTimes();
      return { name: '', times: fmt(bt.cum) + ' / -' + fmt(bt.remain / spd()), cls: 'mine', pct: bt.total ? (bt.cum / bt.total) * 100 : null };
    }
    // Freshest of: the durable merged record, and a LIVE presence peer. Presence is
    // the fast path (restores instant peer progress); the record wins when it's newer.
    const rec = Progress.bookRecord(book);
    let best = (rec && (rec.tot || rec.cum)) ? { cumMs: rec.cum || 0, totMs: rec.tot || 0, ts: rec.ts || 0, mine: Progress.isMine(rec), name: rec.name } : null;
    const p = peerFor(book);
    if (p) { const pc = peerBookCum(book, p); if (pc) { const ts = recency(p); if (!best || ts >= best.ts) best = { cumMs: pc.cum, totMs: pc.tot, ts, mine: false, name: p.name }; } }
    if (best) {
      const times = best.totMs ? (fmt(best.cumMs / 1000) + ' / -' + fmt(Math.max(0, best.totMs - best.cumMs) / 1000 / spd())) : fmt(best.cumMs / 1000);
      return { name: best.mine ? '' : (best.name || ''), times, cls: best.mine ? 'mine' : 'peer', pct: best.totMs ? (best.cumMs / best.totMs) * 100 : null };
    }
    const cold = bookEntries[book];   // plugin cold-resume fallback (no cross-device author)
    if (cold && cold.offsetMs) return { name: '', times: fmt(cold.offsetMs / 1000), cls: '', pct: null };
    return { name: '', times: '', cls: '', pct: null };
  }
  // Chapter row: position / -remaining(at speed) · total-track-length.
  function chapterLine(book, track, durMs) {
    const isCur = ctx && String(ctx.book) === String(book) && ctx.tracks[ctx.idx] && String(ctx.tracks[ctx.idx].ratingKey) === String(track);
    if (isCur && !audio.paused && audio.currentTime) {
      const cur = audio.currentTime, d = audio.duration || (durMs || 0) / 1000;
      return { text: fmt(cur) + ' / -' + fmt(Math.max(0, d - cur) / spd()) + (d ? ' · ' + fmt(d) : ''), cls: 'mine', pct: d ? Math.min(100, Math.round((cur / d) * 100)) : 0 };
    }
    const rec = Progress.trackRecord(book, track);
    let best = rec ? { o: rec.o, d: rec.d || durMs || 0, ts: rec.ts || 0, mine: Progress.isMine(rec), name: rec.name } : null;
    const p = peerFor(book);   // a peer live on THIS exact chapter → show its position instantly
    if (p && String(p.track) === String(track)) { const ts = recency(p); if (!best || ts >= best.ts) best = { o: Presence.livePos(p), d: durMs || (best ? best.d : 0), ts, mine: false, name: p.name }; }
    if (best) {
      const d = best.d, pct = d ? Math.min(100, Math.round((best.o / d) * 100)) : 0;
      const times = d ? (fmt(best.o / 1000) + ' / -' + fmt(Math.max(0, d - best.o) / 1000 / spd()) + ' · ' + fmt(d / 1000)) : '';
      return { text: best.mine ? times : (best.name ? best.name + ' · ' : '') + times, cls: best.mine ? 'mine' : 'peer', pct };
    }
    return { text: '', cls: '', pct: null };
  }
  function paintFileRowSub(row, line) {
    const gi = row.querySelector('.progress > i'); if (gi && line.pct != null) gi.style.width = line.pct + '%';
    const sub = row.querySelector('.fsub'); if (sub) { sub.textContent = line.text; sub.className = 'fsub' + (line.cls ? ' ' + line.cls : ''); }
  }

  // Update the book progress line (+ time-based bar) on tiles/rows — every one,
  // or (from the ~4 Hz timeupdate path) just the one book's, so a long Books list
  // isn't recomputed four times a second while playing.
  // Paint ONE tile/book row's resume·peer line + progress. Extracted so renderTile
  // can call it AT BIRTH (below) — otherwise a tile is inserted with an empty .pline
  // and a later renderPresence pass fills it, which paints empty→value on launch.
  function paintTileLine(el) {
    const line = bookLine(el.dataset.book);
    const pl = el.querySelector('.pline');
    if (pl) {
      pl.className = 'pline' + (line.cls ? ' ' + line.cls : '');
      const nm = pl.querySelector('.pname'), tm = pl.querySelector('.ptimes');
      if (nm) nm.textContent = line.name || '';
      if (tm) tm.textContent = line.times || '';
    }
    if (line.pct != null) { const gi = el.querySelector('.progress > i'); if (gi) gi.style.width = Math.round(line.pct) + '%'; }
  }
  function updateBookLines(book) {
    const sel = book != null
      ? `.tile[data-book="${cssEsc(book)}"], .book[data-book="${cssEsc(book)}"]`
      : '.tile[data-book], .book[data-book]';
    document.querySelectorAll(sel).forEach(paintTileLine);
  }
  // Files view: the currently-playing chapter ticks live (called from timeupdate too).
  function updatePlayingFileRow() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx]; if (!t) return;
    const line = chapterLine(ctx.book, t.ratingKey, t.durationMs || 0);
    document.querySelectorAll(`.filerow[data-track="${cssEsc(t.ratingKey)}"]`).forEach((row) => paintFileRowSub(row, line));
  }
  // Files view: per-chapter blue buffer/bank underlay + gold progress + coloured
  // sub line + the playing-row highlight. A different book's rows resolve to idx -1
  // (no banked/buffered state) but still get their merged progress from Progress.
  function updateFileRows() {
    const rows = document.querySelectorAll('.filerow[data-track]');
    if (!rows.length) return;
    rows.forEach((row) => {
      const track = row.dataset.track, book = row.dataset.book;
      const idx = ctx ? ctx.tracks.findIndex((t) => String(t.ratingKey) === String(track)) : -1;
      // Download (persisted OR in-flight) = BLUE and grows with bytes; incidental
      // buffering = GRAY. dlProg is 1 when downloaded, 0..1 for the track that's
      // downloading right now, else 0.
      const dlProg = window.Downloads ? Downloads.trackProgress(track) : 0;
      let buf = 0, isDl = false;
      if (dlProg > 0) { buf = dlProg * 100; isDl = true; }   // downloaded (or downloading) → BLUE
      else if (window.Downloads && Downloads.trackBuffered && Downloads.trackBuffered(track)) {
        buf = 100;                                           // persisted buffer → GRAY, survives restart
      }
      else if (idx >= 0) {
        if (Banking.has(idx)) buf = 100;                     // whole chapter buffered in memory (this session)
        else if (ctx.idx === idx) buf = nativeBufferedPct(); // playing → native stream buffer
        else if (Banking.bankingIdx() === idx) buf = Banking.bankPct();   // buffering now
      }
      const bufbar = row.querySelector('.bufbar');
      if (bufbar) { bufbar.style.setProperty('--buffered', Math.round(buf) + '%'); bufbar.classList.toggle('downloaded', isDl); }
      row.classList.toggle('playing', idx >= 0 && idx === ctx.idx);
      paintFileRowSub(row, chapterLine(book, track, idx >= 0 ? (ctx.tracks[idx].durationMs || 0) : 0));
    });
  }

  // Poll delivers fresh peer EVENTS; the local render tick re-extrapolates them
  // between polls so numbers move smoothly with zero extra network.
  let lastProgRefresh = 0;
  function onPeers(list) {
    peersNow = list; renderPresence();
    maybeCorrectFromPeerPause();   // #1: the superseded peer's pause-flush may have just landed
    // A presence change usually means a handoff — pull the durable progress boards too
    // (throttled) so the new author's book/chapter record catches up fast, not only on
    // the slow 20s poll. The instant display already rides presence via peerBookCum.
    const t = Date.now();
    if (t - lastProgRefresh > 8000) { lastProgRefresh = t; Progress.refresh(); }
  }
  function renderPresence() {
    if (scrubbing) return;   // dragging a seek slider — don't reflow the (visible) library mid-drag
    updateBookLines();
    updateFileRows();
    updatePlayingFileRow();
    mirrorPeerTransport();
    pumpBank();   // heartbeat: catch idle windows even if an event was missed
  }
  // While WE'RE paused but a peer OWNS + is LIVE on our current chapter, tick the
  // transport to the peer's extrapolated position and paint it GREEN (fill + handle,
  // peer colour). Scrubbing that green bar grabs the session (see bindScrub → grab).
  // Same-chapter only (the seek bar maps 1:1).
  let mirroring = false;
  function setMirrorClass(on) {
    if (on === mirroring) return;
    mirroring = on;
    const a = $('pSeek'), b = $('npSeek');
    if (a) a.classList.toggle('peer', on);
    if (b) b.classList.toggle('peer', on);
  }
  function mirrorPeerTransport() {
    const p = (ctx && audio.paused) ? livePeerForCtx() : null;
    const t = ctx && ctx.tracks[ctx.idx];
    const active = !!(p && t && String(p.track) === String(t.ratingKey));
    setMirrorClass(active);
    if (!active) return;
    const dur = audio.duration || (t.durationMs || 0) / 1000;
    const pos = dur ? Math.min(dur, Presence.livePos(p) / 1000) : Presence.livePos(p) / 1000;
    const pct = dur ? Math.min(100, (pos / dur) * 100) : 0;
    $('pCur').textContent = fmt(pos);
    paintSeek($('pSeek'), pct);
    if (npOpen) {
      $('npCur').textContent = fmt(pos);
      paintSeek($('npSeek'), pct);
    }
  }
  // Scrubbed the green (peer-mirrored) bar → take OWNERSHIP: a fresh grab claim makes
  // the peer supersede/pause; we seek locally and STAY paused (play starts only when
  // the user hits play). Transport flips back to orange (we own it now).
  function grabFromPeer() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx]; if (!t) return;
    notePlaybackIntent();   // adopting a peer's spot is an explicit reposition → supersede a pending retry
    clearHandoff();   // user picked an explicit spot — don't let a pending sync overwrite it
    ctx.updatedAt = Plex.serverNow();
    Presence.grab(ctx.book, t.ratingKey, (audio.currentTime || 0) * 1000);
    setMirrorClass(false);
    writeProgress('paused', { allowZero: true });   // grabbing at an explicit spot (incl. 0) persists durably + to Plex
    updateSeekUI();
    if (window.PBDebug) PBDebug.log('PLAY', `scrub GRAB @ ${(audio.currentTime || 0).toFixed(1)}s — peer pauses, staying paused`);
  }
  let renderTick = null;
  function startRenderTick() { stopRenderTick(); renderTick = setInterval(renderPresence, 1000); }
  function stopRenderTick() { if (renderTick) { clearInterval(renderTick); renderTick = null; } }

  function onSuperseded(winner) {
    // A cross-device handoff supersedes any pending stream retry too — else the
    // reprobe could finish after this pause and start us playing again (two devices
    // on the same book). Cancel it whether or not we're currently playing.
    notePlaybackIntent();
    if (!audio.paused) {
      audio.pause();
      toast(`Handed off to ${winner.name || 'another device'}`);
    }
  }

  // renderDeviceName + the Options render/bindings moved to js/options-screen.js
  // (OptionsScreen, review #20). app.js calls OptionsScreen.renderDeviceName().

  // ---- playback ------------------------------------------------------------
  // Track list for a book WITHOUT a network round-trip when we already have it —
  // the currently-loaded book's ctx.tracks, or a cache from a prior open. This is
  // why resume is instant: getAlbumTracks (a Plex fetch) is skipped, so a banked
  // track plays immediately with no "Loading…" wait. Only a never-opened book fetches.
  async function tracksForBook(book) {
    if (ctx && String(ctx.book) === String(book) && ctx.tracks && ctx.tracks.length) return ctx.tracks;
    if (trackCache[book] && trackCache[book].length) return trackCache[book];
    toast('Loading…');
    const t = await Plex.getAlbumTracks(book);
    cacheTracks(book, t);
    return t;
  }
  // ONE begin-playback path for both entries (they used to be near-identical
  // copies, and the .75 regression came from exactly that drift):
  //   * playBook   — book-level (tile/cover ▶): the resume point is ARBITRATED
  //     by bestSource, computed BEFORE recording our own outgoing spot (recording
  //     stamps our possibly-behind position with a FRESH ts, which would then
  //     beat a faster peer on a same-book takeover → you'd resume behind it).
  //   * playBookAt — an EXPLICIT track/offset (files view): nothing to arbitrate.
  async function beginPlayback(book, alb, resolveTarget) {
    try {
      const tracks = await tracksForBook(book);
      if (!tracks.length) return toast('No playable files for this book.');
      const { track, posMs } = resolveTarget(tracks);
      if (ctx) { recordProgress(); if (String(ctx.book) !== String(book)) writeProgress('paused'); }   // capture the outgoing chapter (AFTER the target is fixed)
      let idx = tracks.findIndex((t) => String(t.ratingKey) === String(track));
      if (idx < 0) idx = 0;
      ctx = { album: alb || { title: `Book #${book}`, parentTitle: '' }, tracks, idx, book, updatedAt: Plex.serverNow(), coverUrl: alb && alb.thumb ? Plex.artUrl(alb.thumb) : null };
      startTrack(idx, (posMs || 0) / 1000);
      hideToast();   // playback has started — drop any "Loading…" immediately (it used to linger ~3s)
      updatePlayerUI();
      setMediaSession();
      // Announce to the ecosystem that this device now owns this book.
      Presence.claimPlaying(book, tracks[idx].ratingKey, posMs || 0, tracks[idx].ratingKey);
    } catch (e) { toast(e.message || 'Could not start playback'); }
  }
  function playBook(entry, alb) {
    // If a peer is LIVE on this book it wins bestSource (a playing peer's recency
    // is server-now) — so this tap is a same-room handoff. Arm the sync against it
    // so first sound + its pause land us in true sync, not a latency behind.
    const lp = peerFor(entry.book);
    armHandoff(entry.book, lp && lp.state === 'playing' ? lp : null);
    return beginPlayback(entry.book, alb, () => {
      // Freshest of: cold value, durable record, our own spot, a live peer
      // extrapolated to now — captures rewinds too.
      const best = bestSource(entry.book, entry);
      return { track: best.track || entry.track, posMs: best.pos || 0 };
    });
  }
  // Play a book starting at a SPECIFIC track/offset (from the files view).
  function playBookAt(bookRk, meta, trackRk, startMs) {
    clearHandoff();   // explicit target — no peer to sync to
    return beginPlayback(bookRk, meta, () => ({ track: trackRk, posMs: startMs || 0 }));
  }

  function startTrack(idx, seekSec = 0, autoplay = true) {
    const t = ctx.tracks[idx];
    ctx.idx = idx;
    Banking.ensureBook(ctx.book);   // banks are per-book (keyed by idx) — wipe on book change
    curLoad = { idx, seekSec, autoplay };       // remembered so a network error can retry this exact load
    clearTimeout(loadRetryTimer);
    const gen = ++loadGen;                       // invalidate any in-flight loadedmetadata from a prior src
    // Prefer an already-banked copy of this track (network-proof, no re-buffer);
    // otherwise stream. Then re-point the meter + prefetch window at this track.
    const banked = bankedUrl(idx);
    Progress.setSeed(t.ratingKey);   // give the durable-progress board a track to seed its playlist
    const onMeta = () => {
      if (gen !== loadGen) return;               // superseded by a newer load — ignore
      loadRetry = 0;                             // got metadata → connection is good again
      if (seekSec > 0 && seekSec < (audio.duration || Infinity)) audio.currentTime = seekSec;
      if (speedCtl) audio.playbackRate = speedCtl.getRate();   // rate can reset on new src
      if (autoplay) audio.play().catch(() => {});
      else updateSeekUI();                                     // restored-paused: paint the bar at the saved spot
    };
    audio.addEventListener('loadedmetadata', onMeta, { once: true });
    refreshMeter();
    updateFileRows();   // move the "playing" highlight + buffered line to this chapter now
    // Point the element at (in order of preference) an in-memory bank, a persisted
    // OFFLINE DOWNLOAD (plays with no network), or the live stream. Downloaded
    // blobs resolve async from IndexedDB, so set src in a small helper guarded by
    // the load generation.
    const useSrc = (src, kind) => {
      if (gen !== loadGen) return;
      if (window.PBDebug) PBDebug.log('PLAY', `startTrack idx=${idx} seek=${(seekSec || 0).toFixed(1)}s src=${kind} autoplay=${autoplay}`);
      if (curObjUrl) { try { URL.revokeObjectURL(curObjUrl); } catch {} curObjUrl = null; }
      audio.src = src; audio.load();
      pumpBank();   // no-ops for a fully-downloaded book (see pumpBank guard)
    };
    if (banked) useSrc(banked, 'banked');
    else if (window.Downloads && Downloads.trackLocal && Downloads.trackLocal(t.ratingKey)) {
      // Serve the downloaded blob through the SERVICE WORKER (`./__dl/<track>`),
      // which supports HTTP range requests. iOS <audio> REJECTS a blob: object URL
      // for media (needs range support) → AUDIO_ERR code=4; a SW-served range URL
      // plays like normal HTTP. Fall back to an object URL only when no SW controls
      // the page (e.g. desktop with SW disabled), where blob URLs do work.
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        useSrc('./__dl/' + encodeURIComponent(t.ratingKey), 'download');
      } else {
        Downloads.getBlob(t.ratingKey).then((blob) => {
          if (blob) { curObjUrl = URL.createObjectURL(blob); useSrc(curObjUrl, 'download'); }
          else useSrc(Plex.streamUrl(t.partKey), 'stream');
        }).catch(() => useSrc(Plex.streamUrl(t.partKey), 'stream'));
      }
    } else useSrc(Plex.streamUrl(t.partKey), 'stream');
  }
  let curObjUrl = null;   // object URL of the currently-loaded downloaded blob (revoked on next load)

  // ---- last-played memory (local; survives reloads) ------------------------
  function saveLastPlayed(opts) {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    if (!t) return;
    try {
      localStorage.setItem(LAST, JSON.stringify({
        book: ctx.book, track: t.ratingKey, pos: audio.currentTime * 1000, ts: Plex.serverNow(),
        // display snapshot → the transport bar paints synchronously at next launch,
        // before getAlbum/getAlbumTracks resolve (reconciled by updatePlayerUI after).
        title: (ctx.album && ctx.album.title) || '', author: (ctx.album && ctx.album.parentTitle) || '',
        // store the THUMB (stable), not the full cover URL — artUrl() embeds curBase(),
        // so a stored URL can differ session-to-session and defeat setArt's idempotency.
        chapter: t.title || '', thumb: (ctx.album && ctx.album.thumb) || '', dur: t.durationMs || 0,
      }));
    } catch { /* storage full/blocked — best effort */ }
    recordProgress(opts);
  }

  // Record OUR current spot for THIS book into the durable Progress repository so a
  // tile / a later resume reflects where we actually are (bestSource reads it via
  // Progress.myBookRecord). Called on the same triggers as saveLastPlayed AND right
  // before we switch books, so switching away never loses the outgoing book's progress.
  // Whole-book time for the current ctx, in SECONDS: total duration, cumulative
  // position at the playhead, and remaining. One source of truth for the arithmetic,
  // shared by Now-Playing (npBookRem) and the book-level progress record.
  function bookTimes() {
    let total = 0, before = 0;
    if (ctx) ctx.tracks.forEach((tr, i) => { const d = (tr.durationMs || 0) / 1000; total += d; if (i < ctx.idx) before += d; });
    const cur = audio.currentTime || 0;
    return { total, cum: before + cur, remain: Math.max(0, total - (before + cur)) };
  }
  function recordProgress(opts) {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    // allowZero: an explicit user action (seek/restart/grab) may land at exactly 0
    // and MUST persist; incidental load/transition zeros must not (see the helper).
    if (!t || !PBLogic.positionRecordable(audio.currentTime, opts && opts.allowZero)) return;
    // Roll-over grace: a chapter we auto-advanced INTO plays from 0, but we hold off
    // overwriting its old bookmark until it's played `grace` seconds — so a brief
    // roll-through doesn't wipe real progress. (Fresh-start OFF never sets a guard.)
    if (rollGuard && String(t.ratingKey) === String(rollGuard.track)) {
      if (Plex.serverNow() < rollGuard.until) return;   // still within grace → preserve old
      rollGuard = null;                                  // grace passed → record normally (supersedes)
    }
    const posMs = audio.currentTime * 1000;
    const durMs = ((audio.duration && isFinite(audio.duration)) ? audio.duration * 1000 : 0) || t.durationMs || 0;
    // Durable + cross-device: the per-chapter record (track bars + chapter resume)
    // and an INDEPENDENT book-level record (tile bar + book resume) via bookTimes.
    Progress.recordTrack(ctx.book, t.ratingKey, posMs, durMs);
    const bt = bookTimes();
    Progress.recordBook(ctx.book, { t: t.ratingKey, o: posMs, cum: bt.cum * 1000, tot: bt.total * 1000 });
  }
  // The honest % for a chapter's bar from the merged progress data (null = nobody
  // has a record of playing it → caller falls back to Plex viewCount / 0).
  function getChapterPct(book, trackRk, durationMs) { return Progress.trackPct(book, trackRk, durationMs); }

  // On reload: reopen the last book PAUSED at its saved spot. Truly-fresh load
  // (nothing saved) OR a track that DEFINITELY no longer exists → leave the bar
  // hidden. A mere network failure keeps the bookmark: wiping it on a flaky
  // relay/offline launch (of a never-cached book) permanently lost the resume bar.
  // Paint the transport bar from the persisted last-played SNAPSHOT — synchronously,
  // before restoreLastPlayed's getAlbum/getAlbumTracks await resolves — so the bar is
  // there at its real position from the first frame instead of popping in after the
  // (relay-slow) metadata load. Purely visual: it sets NO ctx, so the transport stays
  // inert (buttons all guard on !ctx) until restore wires it up a beat later, when
  // updatePlayerUI reconciles with authoritative data. Old snapshots lacking the
  // display fields degrade gracefully (title 'Book', dur 0) and self-heal on next save.
  function paintSnapshotBar(s) {
    if (!s || !s.book) return;
    document.body.classList.add('has-player');
    $('player').classList.remove('hidden');
    $('pTitle').textContent = s.title || 'Book';
    $('pSub').textContent = `${s.author || ''} · ${s.chapter || ''}`;
    // Rebuild the cover URL from the stored thumb via artUrl so it's byte-identical to the
    // ctx.coverUrl updatePlayerUI sets a beat later — setArt is idempotent on a matching
    // src, so the cover loads ONCE instead of the snapshot URL loading then the fresh URL
    // re-loading (the transport-image flicker on restart). s.cover = pre-.54 fallback.
    const cover = s.thumb ? Plex.artUrl(s.thumb) : (s.cover || '');
    if (cover) setArt($('pCover'), cover);
    const cur = (s.pos || 0) / 1000, dur = (s.dur || 0) / 1000;
    $('pCur').textContent = fmt(cur);
    $('pDur').textContent = fmt(dur);
    paintSeek($('pSeek'), dur ? (cur / dur) * 100 : 0);
    updatePlayIcon();   // no src yet → audio.paused → ▶
  }
  async function restoreLastPlayed() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LAST) || 'null'); } catch {}
    if (!saved || !saved.book) { updatePlayerUI(); return; }
    const prev = ctx;   // capture the LIVE ctx before we rebuild it (enterApp may re-fire mid-playback)
    paintSnapshotBar(saved);   // instant bar from the snapshot; reconciled once ctx lands
    let fetched = false;
    try {
      const [alb, tracks] = await Promise.all([Plex.getAlbum(saved.book), Plex.getAlbumTracks(saved.book)]);
      fetched = true;   // the metadata reads themselves succeeded (live or cached)
      const idx = tracks.findIndex((t) => String(t.ratingKey) === String(saved.track));
      if (!alb || !tracks.length || idx < 0) throw new Error('track no longer exists');
      // Don't empty+reload the <audio> element if it's ALREADY the live, loaded
      // track — that's the lock-screen resume-kill: enterApp re-fires during
      // playback and a reload (autoplay off) leaves the live track paused. Keep the
      // element; just reconcile ctx/UI. Only reload when the target genuinely differs.
      const prevT = prev && prev.tracks[prev.idx];
      const elementLive = !!(audio.src && !audio.error && audio.readyState >= 1);
      const reload = PBLogic.shouldReloadOnRestore(saved.book, saved.track, prev && prev.book, prevT && prevT.ratingKey, elementLive);
      ctx = { album: alb, tracks, idx, book: saved.book, updatedAt: saved.ts || Plex.serverNow(), coverUrl: alb.thumb ? Plex.artUrl(alb.thumb) : null };
      // On a genuine (re)load, preserve play state instead of hardcoding paused: a
      // cold entry has no live element (audio.paused true → restore paused, as
      // before); a mid-playback reload keeps playing.
      if (reload) startTrack(idx, (saved.pos || 0) / 1000, !audio.paused);
      else if (window.PBDebug) PBDebug.log('PLAY', `restore KEPT live track=${saved.track} @ ${(audio.currentTime || 0).toFixed(1)}s (no reload — element already on target)`);
      updatePlayerUI(); setMediaSession();
    } catch {
      ctx = null;
      // Confirmed gone (metadata loaded but the track's missing) → forget it and retract
      // the optimistic bar. A transient/offline failure (fetched=false) keeps the snapshot
      // bar up as correct last-known state; cache-first reads make this branch near-unreachable
      // for the last-played book, and a later restore/reconnect wires ctx when it can.
      if (fetched) { localStorage.removeItem(LAST); updatePlayerUI(); }
    }
  }

  // ---- same-room handoff sync (see js/handoff.js + the sync-accuracy plan) --
  // The state machine lives in HandoffController (js/handoff.js) so it's unit-
  // testable; here we wire it to live audio/ctx/peer access. The four delegators
  // below stay `function` declarations because playBook (armHandoff) and
  // grabFromPeer (clearHandoff) call them from EARLIER in this file and rely on
  // hoisting — a const arrow would land them in the temporal dead zone.
  HandoffController.init({
    now: () => Plex.serverNow(),
    context: () => {
      if (!ctx) return null;
      const t = ctx.tracks[ctx.idx];
      return {
        book: ctx.book, trackRk: t ? t.ratingKey : null,
        curSec: audio.currentTime || 0, durSec: audio.duration || 0,
        paused: audio.paused, speed: audio.playbackRate || 1,
      };
    },
    seek: (sec) => { notePlaybackIntent(); audio.currentTime = sec; },   // a handoff correction is a newer intent → supersede a pending retry
    peerFor,
    debug: (tag, m) => { if (window.PBDebug) PBDebug.log(tag, m); },
  });
  function armHandoff(book, peer) { HandoffController.arm(book, peer); }
  function clearHandoff() { HandoffController.clear(); }
  function maybeReanchorHandoff() { HandoffController.reanchorAtFirstSound(); }
  function maybeCorrectFromPeerPause() { HandoffController.correctFromPeerPause(); }

  // A peer that OWNS + is playing our currently-loaded book — the live session to
  // mirror/adopt. Gated on claim: it must own the session (newer claim than ours), so
  // once WE grab (scrub) or play, our fresher claim stops us mirroring/adopting it.
  function livePeerForCtx() {
    if (!ctx) return null;
    const p = peerFor(ctx.book);
    if (!p || p.state !== 'playing' || (p.claim || 0) <= Presence.getClaim()) return null;
    return p;
  }
  // The transport play button. If a peer is LIVE on this book, adopt the live session
  // (jump to its freshest spot) instead of resuming our stale local spot — pressing
  // play then claims (the 'play' handler → Presence.setPlaying) and supersedes them,
  // so it doesn't thrash: the peer pauses, we take over from where it was. (The old
  // no-chase rule predated reliable claim/supersede + published speed; the thrash it
  // avoided was a live peer beating a just-reloaded claim, now fixed.) With no live
  // peer, it just resumes our own loaded spot.
  function resumePlay() {
    if (!ctx) return;
    notePlaybackIntent();   // user Play supersedes any pending stream retry
    // A failed load can't be revived by a bare audio.play() — it needs a reload. But
    // resolve the live-PEER target FIRST: if a peer owns+plays this book, an explicit
    // Play must ADOPT the peer's live chapter/position (the reason this app exists),
    // NOT reload our own stale local spot — even when our element errored.
    const errored = !!audio.error;
    const p = livePeerForCtx();
    if (p) {
      const best = bestSource(ctx.book, bookEntries[ctx.book]);
      const idx = ctx.tracks.findIndex((t) => String(t.ratingKey) === String(best.track));
      if (idx >= 0) {
        // Decide BEFORE startTrack mutates ctx.idx (see resumeAdoptPlan).
        const plan = PBLogic.resumeAdoptPlan(ctx.idx, idx, errored);
        if (window.PBDebug) PBDebug.log('PLAY', `resume ADOPT ${p.name || 'peer'} idx=${idx} pos=${((best.pos || 0) / 1000).toFixed(1)}s${errored ? ' (reload — errored)' : ''}`);
        ctx.updatedAt = Plex.serverNow();
        armHandoff(ctx.book, p);   // sync to the live peer's true position at first sound + on its pause
        const pos = (best.pos || 0) / 1000;
        // Same chapter + healthy element → seek+play in place. Otherwise it's a FULL
        // chapter transition (like rollToTrack): publish the new presence track FIRST
        // — so the imminent `play` event's Presence.setPlaying claims the RIGHT
        // chapter — then load, then refresh the player UI + Media Session (startTrack
        // updates neither, so the transport title / lock-screen would stay stale).
        if (!plan.reload) { audio.currentTime = pos; audio.play().catch(() => {}); }
        else {
          if (plan.trackChanged) Presence.setTrack(best.track, best.pos || 0);
          startTrack(idx, pos, true);
          updatePlayerUI(); setMediaSession();
        }
        return;
      }
    }
    // No live peer: reload our local target if the element errored, else plain play.
    ctx.updatedAt = Plex.serverNow();
    if (errored) startTrack(ctx.idx, audio.currentTime || (curLoad && curLoad.seekSec) || 0, true);
    else audio.play();
  }

  // User changed playback speed on THIS device. Apply it locally AND publish a
  // presence event re-anchored to the current spot, so peers extrapolate a
  // playing device's live position at the new rate (livePos = pos + dt*speed).
  function onSpeedChange(rate) {
    audio.playbackRate = rate;
    Settings.setSpeed(rate);   // best effort — survives a reload
    for (const c of speedCtls) c.setRate(rate, true);   // keep transport + now-playing labels in sync
    // Always keep presence's stored speed current (so the next play event
    // publishes it); re-anchor to the live pos when we have one, so a PLAYING
    // peer extrapolates at the new rate from here.
    Presence.setSpeed(rate, ctx ? audio.currentTime * 1000 : null);
    updatePositionState();   // lock-screen scrubber must extrapolate at the new rate
    if (ctx) { ctx.updatedAt = Plex.serverNow(); if (npOpen) updateNowPlaying(); }
  }

  // User moved the playhead on THIS device: mark it as our latest activity and
  // publish immediately so peers pick up the new spot (incl. rewinds) fast.
  // THE single choke point for "a newer deliberate playback action happened" —
  // cancels a pending stream retry so it can't later restart the failed track at
  // its old position/play-state. Bump the intent counter (the in-flight reprobe
  // phase bails via the retry's gen check) AND clear the delay-phase timer. Call
  // this from EVERY externally-driven action (seek/skip/Prev, peer grab/adopt,
  // handoff correction, user play/pause, cross-device supersede) — NOT from the raw
  // `pause` EVENT (an error itself pauses the element, and that must not cancel the
  // recovery it triggered).
  function notePlaybackIntent() {
    playbackIntentGen++;
    clearTimeout(loadRetryTimer); loadRetryTimer = null;
  }
  // A user/systemic PAUSE action (transport button, media session, sign-out) — as
  // opposed to the incidental `pause` event — supersedes a pending retry.
  function userPause() { notePlaybackIntent(); audio.pause(); }

  function onManualSeek() {
    if (!ctx) return;
    notePlaybackIntent();   // explicit reposition supersedes a pending stream retry (see the retry guard)
    clearHandoff();   // an explicit scrub is the user's chosen spot — cancel any pending handoff correction
    ctx.updatedAt = Plex.serverNow();
    Presence.flush(audio.currentTime * 1000);
    // Explicit user seek → persist the spot on ALL axes now (durable Progress, the
    // pb_last snapshot, AND Plex), allowing an exact 0 (drag-to-start / Prev-restart).
    // Previously this only snapshotted; a seek to 0 left the old position in durable
    // Progress + Plex, so another device (or a cold relaunch) resumed at the old spot.
    writeProgress(audio.paused ? 'paused' : 'playing', { allowZero: true });
  }

  audio.addEventListener('ended', () => {
    // GUARD: a truncated/suspended stream can make iOS fire a BOGUS `ended` mid-track
    // (element's networkState went idle at the buffer edge). If we're nowhere near
    // Plex's KNOWN track duration, this is NOT a real end — never auto-advance (that
    // jumps to the next chapter at 0 and loses the listener's place). Keep the spot.
    const dm = ctx && ctx.tracks[ctx.idx] && ctx.tracks[ctx.idx].durationMs;
    if (dm && audio.currentTime * 1000 < dm - 15000) {
      if (window.PBDebug) PBDebug.log('PLAY', `BOGUS ended at ${audio.currentTime.toFixed(1)}s (track is ${(dm / 1000).toFixed(0)}s, dur=${(audio.duration || 0).toFixed(1)}) — holding position`);
      saveLastPlayed();
      updatePlayerUI();
      return;
    }
    recordProgress();   // this chapter genuinely finished → its bar records ~100%
    if (ctx && ctx.idx < ctx.tracks.length - 1) {
      rollToTrack(ctx.idx + 1);                          // sequential advance (fresh-start / grace aware)
    } else { writeProgress('stopped'); stopPresenceBeat(); }
    saveLastPlayed();
    updatePlayerUI();
  });
  // Keep the OS lock-screen control state synced to ACTUAL element state (not to our
  // action handlers) — recommended, and it matters now that lock-screen Play is native.
  const setMediaPlaybackState = (s) => { try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = s; } catch {} };
  audio.addEventListener('play', () => { setMediaPlaybackState('playing'); updatePlayIcon(); startWriteTimer(); writeProgress('playing'); Presence.setPlaying(audio.currentTime * 1000); startPresenceBeat(); pumpBank(); });
  audio.addEventListener('pause', () => { bgResumePending = null; setMediaPlaybackState('paused'); updatePlayIcon(); stopWriteTimer(); writeProgress('paused'); Presence.setPaused(audio.currentTime * 1000); stopPresenceBeat(); Progress.flush(); pumpBank(); });
  audio.addEventListener('timeupdate', updateSeekUI);
  // Repaint the blue meter as the native playback buffer grows (`progress`) and as
  // the playhead moves (`timeupdate`) — so it reflects REAL current-stream load,
  // not just the banking fetch. setBuffered throttles to whole-percent ticks.
  audio.addEventListener('progress', () => {
    paintMeter();
    // The element is actively pulling with a LOW forward buffer → it needs the
    // bandwidth; abort any in-flight bank so banking never contends (the iOS bug).
    // A healthy buffer means the progress is incidental — let banking continue.
    Banking.abortIfBusy();
  });
  audio.addEventListener('timeupdate', paintMeter);
  // ---- iOS lock-screen resume WEDGE watchdog --------------------------------
  // Confirmed on device + web research (WebKit #198277, Apple DevForums 762582):
  // after a lock-screen pause→play the <audio> element fires `play`+`playing` but the
  // media clock NEVER advances — it reports playing, produces no sound, and stays
  // frozen until FOREGROUND. It's an iOS AVAudioSession limitation: a backgrounded,
  // previously-paused WebView element can't reactivate its audio session while still
  // backgrounded. NOT fixable from the web layer.
  //   * While HIDDEN a reload is USELESS and harmful — `.97`/`.98` logs proved
  //     startTrack just discards the live element + stalls a second op that also
  //     waits until foreground. So while hidden we do NOT touch the element; we
  //     record a pending recovery and let it play on foreground.
  //   * A fresh LOAD DOES play once foreground — so on visibilitychange→visible we
  //     startTrack the pending spot (see the visibilitychange handler). That gives an
  //     immediate resume the instant the user unlocks (the PWA ceiling).
  //   * A FOREGROUND wedge (rare) is reloaded in place (a fresh load plays here),
  //     capped so it can't loop.
  let wedgeTimer = null;
  let bgResumePending = null;   // {idx, position} — a lock-screen wedge to recover on foreground
  let wedgeReloads = 0;         // consecutive FOREGROUND reloads without a healthy advance
  const MAX_WEDGE_RELOADS = 2;
  function forwardBufferedSecApp() {
    const b = audio.buffered, ct = audio.currentTime || 0;
    for (let i = 0; i < b.length; i++) if (ct >= b.start(i) - 1 && ct <= b.end(i) + 1) return b.end(i) - ct;
    return 0;
  }
  function armWedgeWatchdog() {
    clearTimeout(wedgeTimer);
    if (audio.paused || !ctx) return;
    const t0 = audio.currentTime || 0;
    wedgeTimer = setTimeout(() => {
      wedgeTimer = null;
      if (audio.paused || !ctx) return;                  // paused/torn down since → not wedged
      if ((audio.currentTime || 0) - t0 > 0.05) { wedgeReloads = 0; return; }   // clock advanced → healthy
      if (forwardBufferedSecApp() < 2) return;           // no forward data → real starvation (stall recovery owns it), not a wedge
      if (document.hidden) {
        // Can't repair while backgrounded — defer, don't thrash the element.
        bgResumePending = { idx: ctx.idx, position: t0 };
        if (window.PBDebug) PBDebug.log('PLAY', `WEDGE hidden at ${t0.toFixed(1)}s — deferring recovery until foreground (iOS bg audio-session limit)`);
        return;
      }
      if (wedgeReloads >= MAX_WEDGE_RELOADS) {
        if (window.PBDebug) PBDebug.log('PLAY', `WEDGE still frozen (foreground) at ${t0.toFixed(1)}s after ${wedgeReloads} reloads — giving up`);
        return;
      }
      wedgeReloads++;
      if (window.PBDebug) PBDebug.log('PLAY', `WEDGE foreground frozen at ${t0.toFixed(1)}s — reloading (attempt ${wedgeReloads})`);
      startTrack(ctx.idx, t0, true);                     // fresh load at the reached spot; its `playing` re-arms this watchdog
    }, 1400);
  }
  // iOS keeps networkState=LOADING and fires 'stalled' (not 'suspend') when it goes
  // idle on a big buffer — both are prefetch windows; pumpBank's buffer gate decides.
  audio.addEventListener('suspend', pumpBank);
  audio.addEventListener('stalled', () => { pumpBank(); maybeRecoverFromBank(); });
  audio.addEventListener('canplaythrough', pumpBank);
  audio.addEventListener('waiting', maybeRecoverFromBank);
  audio.addEventListener('playing', () => { Banking.cancelStallRecovery(); maybeReanchorHandoff(); armWedgeWatchdog(); });
  // Network drops on a slow relay surface as MEDIA_ERR_NETWORK — don't give up,
  // reload the same track at the position we'd reached, with exponential backoff.
  // MEDIA_ERR_ABORTED just means we swapped src on purpose, so ignore it.
  audio.addEventListener('error', () => {
    const err = audio.error;
    if (!err || err.code === err.MEDIA_ERR_ABORTED) return;
    // If this exact track is already fully local (RAM bank or the persisted
    // buffer/download), recover from the local copy immediately — startTrack
    // prefers it, so no network + no backoff. Only when the failing src was the
    // STREAM, though: an error on the local path itself must not zero-delay-loop.
    const srcWasLocal = !!(audio.src && (audio.src.startsWith('blob:') || audio.src.includes('/__dl/')));
    if (window.PBDebug) PBDebug.log('AUDIO_ERR', `code=${err.code} t=${(audio.currentTime||0).toFixed(1)} src=${srcWasLocal ? 'local' : 'stream'} ${(err.message||'')}`);
    const haveBank = !!(curLoad && !srcWasLocal && (Banking.has(curLoad.idx) || locallyStored(curLoad.idx)));
    // Which STREAM errors are recoverable: a network drop (code 2) OR — the common
    // FIRST-play-after-sign-in case — a stale/rotated relay base that curBase() fell
    // back to (pb_lastBase) before connect() verified one, which surfaces as code 4
    // (SRC_NOT_SUPPORTED), NOT code 2. The old retry only handled code 2 AND reloaded
    // the SAME dead URL every attempt (no re-probe) → it exhausted and showed
    // "Playback error"; retapping worked only because connect() had warmed a fresh
    // base by then. Now: retry code 2 or 4, and RE-RESOLVE the base first so the
    // reload probes a fresh endpoint. A local-src error keeps the old code-2 retry.
    const retryable = (err.code === err.MEDIA_ERR_NETWORK)
      || (!srcWasLocal && err.code === err.MEDIA_ERR_SRC_NOT_SUPPORTED);
    if (curLoad && (haveBank || (retryable && loadRetry < MAX_LOAD_RETRY))) {
      const at = Math.max(audio.currentTime || 0, curLoad.seekSec || 0);   // resume where we were
      const wasPlaying = !audio.paused || curLoad.autoplay;
      const reprobe = !haveBank && !srcWasLocal;   // re-resolve a fresh base only for a stream retry
      let delay;
      if (haveBank) { delay = 0; toast('Playing from downloaded copy'); }
      else { loadRetry++; delay = Math.min(1000 * 2 ** (loadRetry - 1), 8000); toast(`Connection hiccup — retrying… (${loadRetry}/${MAX_LOAD_RETRY})`); }
      // Capture what this retry belongs to. A stream retry awaits a reprobe (seconds
      // on a slow relay); during it the user can pick another chapter/book (bumps
      // loadGen) OR seek/skip/Prev/grab a peer (bumps playbackIntentGen — those do
      // NOT start a new load, so loadGen alone would miss them and the retry would
      // yank playback back to the failed track's old position). Guard on BOTH.
      const retryGen = loadGen, retryIntent = playbackIntentGen;
      const retryIdx = curLoad.idx;
      clearTimeout(loadRetryTimer);
      loadRetryTimer = setTimeout(() => {
        const go = () => {
          if (!ctx || !PBLogic.retryStillCurrent(retryGen, loadGen, retryIntent, playbackIntentGen)) return;   // superseded by a newer load or explicit action
          if (window.PBDebug) PBDebug.log('PLAY', `retrying load idx=${retryIdx} at=${at.toFixed(1)}s (attempt ${loadRetry}/${MAX_LOAD_RETRY}${haveBank ? ', from bank' : reprobe ? ', fresh base' : ''})`);
          startTrack(retryIdx, at, wasPlaying);
        };
        // A stream retry re-resolves the connection first (the stale base was the
        // likely cause). connect() short-circuits on a good base, so it's cheap when
        // the base is already fine; on failure we still retry (bounded) from cache.
        if (reprobe && window.Plex && Plex.resetConn) { Plex.resetConn(); Promise.resolve(Plex.connect && Plex.connect()).catch(() => {}).then(go); }
        else go();
      }, delay);
      return;
    }
    toast('Playback error — could not load audio.');
  });

  // ---- progress write-back -------------------------------------------------
  function startWriteTimer() { stopWriteTimer(); writeTimer = setInterval(() => writeProgress('playing'), 15000); }
  function stopWriteTimer() { if (writeTimer) { clearInterval(writeTimer); writeTimer = null; } }

  // Slow liveness / anti-drift pulse: re-anchor our presence position every 30s
  // while playing (position between pulses is extrapolated, not written).
  let presenceBeat = null;
  function startPresenceBeat() { stopPresenceBeat(); presenceBeat = setInterval(() => { if (ctx && !audio.paused) Presence.flush(audio.currentTime * 1000); }, 30000); }
  function stopPresenceBeat() { if (presenceBeat) { clearInterval(presenceBeat); presenceBeat = null; } }
  function writeProgress(state, opts) {
    if (!ctx) return;
    ctx.updatedAt = Plex.serverNow();    // this device just acted on this book
    const t = ctx.tracks[ctx.idx];
    // Same zero rule as recordProgress: allow an explicit 0 (so a seek/restart to
    // the very start reaches Plex), never an incidental pre-metadata/transition 0
    // (which would clobber the saved offset with a transient load-time 0).
    if (!t || !PBLogic.positionRecordable(audio.currentTime, opts && opts.allowZero)) return;
    const posMs = audio.currentTime * 1000;
    const durMs = t.durationMs || (audio.duration || 0) * 1000;
    const book = ctx.book, track = t.ratingKey;
    const queue = () => { if (window.SyncQueue) SyncQueue.enqueue({ type: 'progress', bookKey: book, ratingKey: track, positionMs: posMs, durationMs: durMs, state, source: 'writeProgress' }); };
    // Known-offline: skip the slow retrying write and queue straight away. The
    // reconnect pass flushes it conflict-safely (syncqueue.js). Otherwise write
    // live, and queue only if that write ultimately failed.
    if (window.Net && Net.state().plexReachable === false) { queue(); }
    else {
      Promise.resolve(Plex.writeTimeline({ ratingKey: track, state, timeMs: posMs, durationMs: durMs }))
        .then((ok) => { if (ok === false) queue(); }).catch(queue);
    }
    saveLastPlayed(opts);   // carry allowZero through → durable Progress + snapshot also persist an explicit 0
  }

  // ---- player UI -----------------------------------------------------------
  function updatePlayerUI() {
    const bar = $('player');
    // The transport stays in the DOM even under the NP overlay (z 35 < 60, so
    // it's invisible there) — removing it changed page height, see setView.
    const showBar = !!ctx;
    document.body.classList.toggle('has-player', showBar);
    bar.classList.toggle('hidden', !showBar);
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    $('pTitle').textContent = ctx.album.title || 'Book';
    $('pSub').textContent = `${ctx.album.parentTitle || ''} · ${t.title || 'Chapter ' + (ctx.idx + 1)}`;
    setArt($('pCover'), ctx.coverUrl);
    updatePlayIcon();
    if (window.Downloads) refreshDlUi(ctx.book);   // NP button + transport meter colour for this book
    updateSeekUI();   // paint position/duration from the known spot NOW, not after the element loads
    if (npOpen) updateNowPlaying();
  }
  function updatePlayIcon() { const b = $('pPlay'); b.innerHTML = playPauseSvg(audio.paused); b.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause'); if (npOpen) updateNpPlayIcon(); }
  // Paint a seek slider (value 0–1000 + the CSS fill var) unless mid-drag — the
  // ONE painter for the transport, Now-Playing, and the peer mirror (three copies
  // of this line used to drift independently).
  function paintSeek(slider, pct) {
    if (!slider || slider.dragging) return;
    slider.value = pct * 10;
    slider.style.setProperty('--played', pct + '%');
  }
  // Lock-screen/watch scrubber: without this the OS extrapolates position at 1× —
  // visibly wrong at 1.5×, and the scrubber shows no duration at all.
  function updatePositionState() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    const dur = audio.duration;
    if (!dur || !isFinite(dur)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: dur,
        position: Math.min(dur, audio.currentTime || 0),
        playbackRate: audio.playbackRate || 1,
      });
    } catch {}
  }
  function updateSeekUI() {
    // Before the <audio> element has loaded metadata + seeked (the launch/track-load
    // window) currentTime/duration are 0 — paint the KNOWN spot (the pending seek
    // target + the track's Plex duration) so the bar shows the real position from the
    // first frame instead of sitting at 0:00/0% then snapping in after load.
    const t = ctx && ctx.tracks[ctx.idx];
    const cur = audio.currentTime || (curLoad && curLoad.seekSec) || 0;
    const dur = audio.duration || (t && t.durationMs ? t.durationMs / 1000 : 0);
    $('pCur').textContent = fmt(cur);
    $('pDur').textContent = fmt(dur);
    paintSeek($('pSeek'), dur ? (cur / dur) * 100 : 0);
    updatePositionState();
    if (scrubbing) return;   // mid-drag: skip the library-DOM writes below (their reflow is what stutters the drag)
    if (ctx && !audio.paused) updateBookLines(ctx.book);   // tick the time line for the PLAYING book only (all tiles repaint on the 1s tick)
    updatePlayingFileRow();
    if (npOpen) updateNowPlaying();
  }

  // Manual pointer-driven scrubbing for the seek sliders. iOS Safari does NOT
  // reliably honor touch-action:none on range inputs sitting over a scrollable
  // page — mid-drag it reclassifies the gesture as a page scroll and cancels
  // the slider drag (the mini-bar "stops dragging / hard to re-grab" jank; the
  // Now-Playing scrubber was smooth only because its overlay has nothing to
  // scroll). Pointer capture + preventDefault(touchmove) takes Safari's gesture
  // arbitration out of the loop; it also makes the whole bar grabbable (value
  // jumps to the finger — no hunting for the 14px thumb).
  function bindScrub(slider) {
    const paint = (x) => {
      const r = slider.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (x - r.left) / r.width));
      slider.value = pct * 1000;
      slider.style.setProperty('--played', (pct * 100) + '%');
    };
    const commit = () => {
      if (!slider.dragging) return;
      slider.dragging = false; scrubbing = false;
      if (audio.duration) audio.currentTime = (slider.value / 1000) * audio.duration;
      if (slider._grab) { slider._grab = false; grabFromPeer(); }   // scrubbed a green (peer) bar → take over
      else onManualSeek();
    };
    slider.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) return;
      slider.dragging = true; scrubbing = true;
      slider._grab = mirroring;   // grabbing the green peer-mirrored bar = scrub-to-handoff
      try { slider.setPointerCapture(e.pointerId); } catch {}
      paint(e.clientX);
      e.preventDefault();   // suppress the native widget drag — ours replaces it
    });
    slider.addEventListener('pointermove', (e) => { if (slider.dragging) paint(e.clientX); });
    slider.addEventListener('pointerup', commit);
    slider.addEventListener('pointercancel', commit);   // if iOS still steals the gesture, keep the position reached
    slider.addEventListener('touchmove', (e) => { if (slider.dragging) e.preventDefault(); }, { passive: false });
    // Keyboard (arrow keys) still drives the native value path.
    slider.addEventListener('change', () => {
      if (slider.dragging) return;
      if (audio.duration) audio.currentTime = (slider.value / 1000) * audio.duration;
      if (mirroring) grabFromPeer(); else onManualSeek();   // keyboard scrub on a green bar also grabs
    });
  }

  // ---- skip amounts (configurable on the Options screen; default 10s) -------
  const getSkipBack = () => Settings.skipBackSec;
  const getSkipFwd = () => Settings.skipFwdSec;
  function skipBy(sec) {
    if (!ctx) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, (audio.currentTime || 0) + sec));
    onManualSeek();
  }
  // Sequential move to an adjacent chapter (auto-advance / Next / Prev). With
  // "Fresh start on auto-advance" ON: begin at 0 and arm the grace guard so the
  // destination's old bookmark survives a brief roll-through (see recordProgress);
  // grace 0 clears it at once. OFF: resume the destination from its stored offset.
  function rollToTrack(idx) {
    const dst = ctx.tracks[idx], rk = dst.ratingKey;
    let seekSec = 0;
    if (freshStartOn()) {
      const g = resetGraceSec();
      rollGuard = g > 0 ? { track: rk, until: Plex.serverNow() + g * 1000 } : null;
      if (g <= 0) Progress.recordTrack(ctx.book, rk, 0, dst.durationMs || 0);   // clear immediately
    } else {
      rollGuard = null;
      const r = Progress.trackRecord(ctx.book, rk);
      if (r && r.d) seekSec = Math.min(r.o, Math.max(0, r.d - 1000)) / 1000;
    }
    startTrack(idx, seekSec);
    Presence.setTrack(rk, seekSec * 1000);
    updatePlayerUI(); setMediaSession();
  }
  function prevTrack() {
    if (!ctx) return;
    // >10s into the track → restart it; otherwise step to the previous track.
    if ((audio.currentTime || 0) > 10) { audio.currentTime = 0; onManualSeek(); return; }
    if (ctx.idx > 0) { recordProgress(); rollToTrack(ctx.idx - 1); }
  }
  function nextTrack() { if (ctx && ctx.idx < ctx.tracks.length - 1) { recordProgress(); rollToTrack(ctx.idx + 1); } }
  function updateSkipLabels() {
    $('pBack').title = 'Skip back ' + getSkipBack() + 's';
    $('pFwd').title = 'Skip forward ' + getSkipFwd() + 's';
    $('pBack').innerHTML = skipSvg('back', getSkipBack());   // same circular-arrow glyph as the NP skip buttons
    $('pFwd').innerHTML = skipSvg('fwd', getSkipFwd());
    if (npOpen) buildNpControls();
  }

  // ---- Options screen (js/options-screen.js — OptionsScreen) ----------------
  // renderOptions/renderDeviceName + the control bindings live in OptionsScreen;
  // app.js keeps the shared bits it injects: updateSkipLabels (transport bar),
  // pumpBank (banking), and doSignOut (the app-lifecycle teardown below).
  function doSignOut() {
    userPause(); Plex.signOut(); clearBanks(); setBuffered(0); ctx = null; updatePlayerUI(); show('signin');   // userPause (not bare audio.pause) cancels a pending stream retry timer + bumps intent
    $('navbar').classList.add('hidden'); Browse.reset(); setView('home'); setNavActive('home');
    localStorage.removeItem(LAST);
    Presence.setActive(false); Progress.setActive(false); stopRenderTick();
    if (window.Downloads && Downloads.suspend) Downloads.suspend();   // the in-flight download's token is now invalid
    SignInScreen.reset();
  }

  // ---- Now-Playing screen --------------------------------------------------
  // ---- Now-Playing screen (js/nowplaying-screen.js — NowPlayingScreen) ------
  // The full-screen player owns its render + live seek/times tick + control row +
  // speed control + download button. app.js keeps hoisted delegators (call sites —
  // applyScreen, the swipe, the timeupdate tick — precede the module wiring) and
  // injects the "transport API" it shares with the mini bar. skipSvg/playPauseSvg
  // (below) stay here: the mini transport uses them too.
  function renderNowPlaying() { return NowPlayingScreen.render(); }
  function updateNowPlaying() { return NowPlayingScreen.update(); }
  function updateNpPlayIcon() { return NowPlayingScreen.updatePlayIcon(); }
  function buildNpControls() { return NowPlayingScreen.buildControls(); }
  function updateNpDl() { return NowPlayingScreen.updateDl(); }
  // Skip icon = circular arrow (S1) with the second-count inside; currentColor.
  function skipSvg(dir, n) {
    // back = CCW, fwd = CW. Arrowhead sits at the top with its BACK (the vertical
    // base) flush to the arc end, tip pointing along the rotation direction.
    const arc = dir === 'back' ? 'M12 6 A6 6 0 1 0 18 12' : 'M12 6 A6 6 0 1 1 6 12';
    const head = dir === 'back' ? 'M12 4 L12 8 L16 6 Z' : 'M12 4 L12 8 L8 6 Z';
    return `<svg viewBox="0 0 24 24"><path d="${arc}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="${head}" fill="currentColor"/><text x="12" y="15" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" font-family="system-ui">${n}</text></svg>`;
  }
  // Shared play/pause glyph — used by both the NP and mini-transport play buttons.
  function playPauseSvg(paused) {
    return paused
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
  }

  // ---- track-info bottom sheet ---------------------------------------------
  const fmtBytes = PBLogic.fmtBytes;
  function showSheet() { const s = $('infoSheet'); s.classList.remove('hidden'); requestAnimationFrame(() => s.classList.add('open')); }
  function hideSheet() { const s = $('infoSheet'); s.classList.remove('open'); setTimeout(() => s.classList.add('hidden'), 280); }
  async function openInfoSheet() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    $('sheetBlurb').textContent = ''; $('sheetBlurb').classList.add('hidden');
    $('sheetRows').innerHTML = '<div class="center"><div class="spinner"></div></div>';
    showSheet();
    try {
      const [info, alb] = await Promise.all([
        Plex.getTrackInfo(t.ratingKey),
        (ctx.album && ctx.album.summary != null) ? Promise.resolve(ctx.album) : Plex.getAlbum(ctx.book).catch(() => null),
      ]);
      const blurb = (alb && alb.summary) || '';
      $('sheetBlurb').textContent = blurb;
      $('sheetBlurb').classList.toggle('hidden', !blurb);
      const dash = (v) => (v || v === 0) && v !== '' ? v : '—';
      const rows = [
        ['Type', info && info.container ? info.container + (info.codec && info.codec !== info.container ? ' · ' + info.codec : '') : '—'],
        ['Bitrate', info && info.bitrate ? info.bitrate + ' kbps' : '—'],
        ['Bit depth', info && info.bitDepth ? info.bitDepth + '-bit' + (info.samplingRate ? ' / ' + (info.samplingRate / 1000) + ' kHz' : '') : '—'],
        ['Channels', info && info.channels ? (info.channels === 1 ? 'Mono' : info.channels === 2 ? 'Stereo' : info.channels + ' ch') : '—'],
        ['File size', info && info.size ? fmtBytes(info.size) : '—'],
      ];
      $('sheetRows').innerHTML = rows.map(() => '<div class="sheet-row"><span class="sk"></span><span class="sv"></span></div>').join('');
      const rowEls = $('sheetRows').querySelectorAll('.sheet-row');
      rows.forEach(([k, v], i) => { rowEls[i].querySelector('.sk').textContent = k; rowEls[i].querySelector('.sv').textContent = dash(v); });
    } catch { $('sheetRows').innerHTML = '<div class="sheet-row"><span class="sk">Could not load track info</span></div>'; }
  }

  // ---- book long-press context menu ----------------------------------------
  // Long-press (touch) or right-click (desktop) a book tile/row → an animated
  // pop-over of actions. Extensible: add entries to bookMenuItems(). For now the
  // only action is Reset Progress (danger, with an inline tap-again confirm).
  let bookMenuOpen = false;
  let longPressAt = 0;   // timestamp a long-press opened the menu → swallow the click it spawns

  const DLICO = {
    down: '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4 2-1.5-2-3.5-2.4.8a6 6 0 0 0-1.6-1L15.6 4H8.4L8 6.8a6 6 0 0 0-1.6 1L4 7 2 10.5 4 12l-2 1.5L4 17l2.4-.8a6 6 0 0 0 1.6 1L8.4 20h7.2l.4-2.8a6 6 0 0 0 1.6-1L20 17l2-3.5L20 12z"/></svg>',
  };
  function bookMenuItems(book, title) {
    const items = [];
    const dl = window.Downloads;
    if (dl && dl.available()) {
      const st = dl.stateOf(book).status;
      if (st === 'done') items.push({ label: 'Remove download', ico: DLICO.trash, confirm: true, run: () => dl.remove(book) });
      else if (st === 'downloading' || st === 'queued') items.push({ label: st === 'queued' ? 'Cancel queued download' : 'Cancel download', ico: DLICO.x, run: () => dl.remove(book) });
      else items.push({ label: 'Download book', ico: DLICO.down, run: () => startBookDownload(book, title) });
      items.push({ label: 'Manage downloads', ico: DLICO.gear, run: () => DownloadsScreen.open() });
    }
    items.push({
      label: 'Reset Progress', danger: true, confirm: true,
      ico: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>',
      run: () => doResetProgress(book, title),
    });
    return items;
  }

  function openBookMenu(book, title) {
    const menu = $('bookMenu');
    $('bookMenuTitle').textContent = title || 'Book';
    const host = $('bookMenuItems');
    host.innerHTML = '';
    bookMenuItems(book, title).forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bmenu-item' + (item.danger ? ' danger' : '');
      btn.innerHTML = `<span class="bmenu-ico">${item.ico || ''}</span><span class="bmenu-label"></span>`;
      const label = btn.querySelector('.bmenu-label');
      label.textContent = item.label;
      let armed = false;
      btn.addEventListener('click', async () => {
        if (item.confirm && !armed) { armed = true; btn.classList.add('confirming'); label.textContent = 'Tap again to confirm'; return; }
        closeBookMenu();
        try { await item.run(); } catch { toast('Action failed'); }
      });
      host.appendChild(btn);
    });
    menu.classList.remove('hidden');
    requestAnimationFrame(() => menu.classList.add('open'));
    bookMenuOpen = true;
  }
  function closeBookMenu() {
    const menu = $('bookMenu');
    menu.classList.remove('open');
    setTimeout(() => menu.classList.add('hidden'), 200);
    bookMenuOpen = false;
  }

  // Reset ALL saved progress for a book: unplay every track on Plex + drop it from
  // the resume store, then clear our local echoes and repaint the affected screens.
  // Reset Progress — cross-device, on both axes (see the reset-tombstone plan):
  //   * DURABLE: Progress.resetBook writes a book-level tombstone (rst = now) that
  //     wins the LWW merge and suppresses every bk/tr record at/before it, so the
  //     book reads as unplayed across the mesh (a bare delete couldn't — no
  //     timestamp). Peers drop their own copies via clear-on-contact.
  //   * LIVE: if a peer is actively playing this book, Presence.resetClaim publishes
  //     a superseding claim so it pauses (reset is the strongest deliberate action).
  //     Guarded: only hijack our presence when we aren't mid-play of a DIFFERENT book.
  // Plus the Plex-native reset (shared, we can clear it directly) and local hints.
  async function doResetProgress(book, title) {
    toast('Resetting…');
    let tracks = [];
    try { tracks = await Plex.getAlbumTracks(book); } catch {}
    const rks = tracks.map((t) => t.ratingKey).filter(Boolean);
    try { await Plex.resetBookProgress(book, rks); }
    catch { return toast('Reset failed'); }
    Progress.resetBook(book);                                           // durable tombstone → wins the merge, suppresses stale peer records (also clears our own last spot / myBookRecord)
    if (!ctx || String(ctx.book) === String(book)) Presence.resetClaim(book, rks[0] || null);   // live: pause a peer playing it (don't clobber a different active book)
    delete bookEntries[book];                                           // cold resume the tile shows
    try { const last = JSON.parse(localStorage.getItem(LAST) || 'null'); if (last && String(last.book) === String(book)) localStorage.removeItem(LAST); } catch {}
    try { await loadHomeData({ force: true }); } catch {}               // fresh library → viewedLeafCount reset
    Browse.clearCache();
    const d = currentDesc();
    if (d && d.v !== 'home' && d.v !== 'nowplaying' && d.v !== 'options') applyScreen(d, { render: true, resetScroll: false });
    renderPresence();
    toast(`Progress reset — ${title || 'book'}`);
  }

  // ============================ OFFLINE DOWNLOADS UI ========================
  const GB = 1024 * 1024 * 1024;
  const fmtGB = (n) => (n >= GB ? (n / GB).toFixed(n >= 10 * GB ? 0 : 1) + ' GB' : (n / (1024 * 1024)).toFixed(0) + ' MB');

  // Generic centered modal: { title, body(html), buttons:[{label,cls,run}] }.
  function modal({ title, body, buttons }) {
    const scrim = document.createElement('div');
    scrim.className = 'pbmodal-scrim';
    const card = document.createElement('div');
    card.className = 'pbmodal';
    card.innerHTML = `<div class="pbmodal-title"></div><div class="pbmodal-body"></div><div class="pbmodal-btns"></div>`;
    card.querySelector('.pbmodal-title').textContent = title || '';
    card.querySelector('.pbmodal-body').innerHTML = body || '';
    const close = () => { scrim.remove(); };
    (buttons || [{ label: 'OK' }]).forEach((b) => {
      const btn = document.createElement('button');
      btn.className = 'pbmodal-btn' + (b.cls ? ' ' + b.cls : '');
      btn.textContent = b.label;
      btn.addEventListener('click', () => { close(); if (b.run) b.run(); });
      card.querySelector('.pbmodal-btns').appendChild(btn);
    });
    scrim.appendChild(card);
    scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
    document.body.appendChild(scrim);
    return close;
  }

  // Build download metadata (title/author/thumb) from the in-memory library.
  async function dlMeta(book, title) {
    let b = null;
    try { b = (await Plex.getBooks()).find((x) => String(x.ratingKey) === String(book)); } catch {}
    return { title: (b && b.title) || title || 'Book', author: (b && b.parentTitle) || '', thumb: (b && b.thumb) || null };
  }

  async function startBookDownload(book, title) {
    const dl = window.Downloads;
    if (!dl || !dl.available()) return toast('Downloads unavailable on this device');
    const meta = await dlMeta(book, title);
    const go = () => { dl.start(book, meta); toast('Downloading “' + meta.title + '”'); };

    // iOS (can't detect connection type): the toggle is "Confirm downloads".
    // ON → a carrier-charges disclaimer; OFF → just start. Never a "queue for
    // Wi-Fi" (we can't detect Wi-Fi returning, so it would never resume — a lie).
    if (!dl.wifiDetectable()) {
      if (!dl.wifiOnly()) return go();
      return void modal({
        title: 'Download this book?',
        body: '<p>Audiobooks are large. If you\'re on cellular, this download may use '
          + 'your carrier\'s data and could incur charges.</p>',
        buttons: [{ label: 'Download', cls: 'primary', run: go }, { label: 'Cancel' }],
      });
    }

    // Android (real detection): Wi-Fi-only. On cellular, offer to queue until Wi-Fi.
    const d = dl.request();
    if (d.start) return go();
    modal({
      title: 'Download over cellular?',
      body: '<p>You\'re on cellular and “Wi‑Fi only” is on. Audiobooks are large, so '
        + 'this will start automatically when Wi‑Fi returns.</p>',
      buttons: [
        { label: 'Queue for Wi‑Fi', cls: 'primary', run: () => { dl.queueFor(book, meta); toast('Queued — will start on Wi‑Fi'); } },
        { label: 'Cancel' },
      ],
    });
  }

  // ---- the Downloads management screen ------------------------------------
  // Extracted to js/downloads-screen.js (DownloadsScreen) — owns its own DOM,
  // listeners, rendering, and refresh subscription. Wired via DownloadsScreen.init(...)
  // in the startup section below; the book menu and Options row call
  // DownloadsScreen.open() / DownloadsScreen.injectOptionRow(). The shared bits it
  // leans on (toast/modal/fmtGB/GB/DLICO/confirmRemoveDownload) stay here and are
  // injected, so there's one copy each.

  // ---- shared indicators (tile badge, NP button, files rows, carousel) -----
  function setDlBadge(el, book) {
    if (!window.Downloads || !Downloads.available()) return;
    const host = el.querySelector('.covertap') || el;
    let badge = host.querySelector('.dlbadge');
    const st = Downloads.stateOf(book);
    if (st.status === 'none') { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('div'); badge.className = 'dlbadge'; host.appendChild(badge); }
    if (st.status === 'done') { badge.className = 'dlbadge done'; badge.style.removeProperty('--p'); badge.innerHTML = DLICO.check; }
    else if (st.status === 'error') { badge.className = 'dlbadge err'; badge.textContent = '!'; }
    else { badge.className = 'dlbadge ring' + (st.status === 'queued' ? ' queued' : ''); badge.style.setProperty('--p', Math.round(Downloads.progress(book) * 100) + '%'); badge.innerHTML = DLICO.down; }
  }

  // Shared download BUTTON (Now-Playing + book-list rows): down-arrow → progress
  // ring → X (complete). Distinct from the tile corner BADGE (which shows a check).
  function applyDlBtn(btn, book) {
    const st = window.Downloads ? Downloads.stateOf(book).status : 'none';
    btn.className = 'dlbtn';
    if (st === 'done') { btn.classList.add('done'); btn.style.removeProperty('--p'); btn.innerHTML = DLICO.x; btn.title = 'Remove download'; }
    else if (st === 'downloading' || st === 'queued') { btn.classList.add('ring'); if (st === 'queued') btn.classList.add('queued'); btn.style.setProperty('--p', Math.round(Downloads.progress(book) * 100) + '%'); btn.innerHTML = DLICO.down; btn.title = 'Cancel download'; }
    else { btn.style.removeProperty('--p'); btn.innerHTML = DLICO.down; btn.title = 'Download'; }
  }
  // ONE remove-download confirm (it was pasted into dlBtnAction AND the
  // Downloads-screen rows with drifting copy).
  function confirmRemoveDownload(book, title) {
    modal({
      title: 'Remove download?',
      body: `<p>Delete the downloaded audio for “${(title || 'this book').replace(/</g, '&lt;')}”? You can re-download it later.</p>`,
      buttons: [{ label: 'Remove', cls: 'danger', run: () => Downloads.remove(book) }, { label: 'Cancel' }],
    });
  }
  // Tap action for a download button: contextual on the current state.
  function dlBtnAction(book, title) {
    if (!window.Downloads || !Downloads.available()) return;
    const st = Downloads.stateOf(book).status;
    if (st === 'done') confirmRemoveDownload(book, title);
    else if (st === 'downloading' || st === 'queued') Downloads.remove(book);   // cancel
    else startBookDownload(book, title);
  }
  // Update every on-screen indicator for a book (or all, if book is null).
  function refreshDlUi(book) {
    const sel = book ? `.tile[data-book="${book}"], .book[data-book="${book}"]` : '.tile[data-book], .book[data-book]';
    document.querySelectorAll(sel).forEach((el) => setDlBadge(el, el.dataset.book));
    // Book-list rows (Books / author→books) carry an explicit .dlbtn.
    const bsel = book ? `.dlbtn[data-book="${book}"]` : '.dlbtn[data-book]';
    document.querySelectorAll(bsel).forEach((b) => applyDlBtn(b, b.dataset.book));
    if (ctx && (!book || String(book) === String(ctx.book))) updateNpDl();
    // Transport buffered-meter colour: blue when the loaded book is downloaded.
    const dled = !!(ctx && window.Downloads && Downloads.isDownloaded(ctx.book));
    const a = $('pSeek'), b = $('npSeek');
    if (a) a.classList.toggle('dl-src', dled);
    if (b) b.classList.toggle('dl-src', dled);
    // Home is hidden via the `parked` class (checking 'hidden' here used to be
    // always-false → the carousel rebuilt on EVERY progress notify).
    if (!$('home').classList.contains('parked')) renderDownloadedCarousel();
    try { updateFileRows(); } catch {}
  }

  // Home "Downloaded" carousel — the downloaded books, from the offline index.
  // Idempotent by content key: download-progress notifies arrive ~4×/s and a
  // rebuild resets the carousel's scroll + churns its <img>s, so only rebuild
  // when the LIST actually changed.
  function renderDownloadedCarousel() { return HomeScreen.renderDownloaded(); }

  function openBookForEl(el) {
    if (!el) return;
    const titleEl = el.querySelector('.ttitle, .title');
    openBookMenu(el.dataset.book, (titleEl && titleEl.textContent) || 'Book');
  }
  const bookElAt = (target) => target && target.closest && target.closest('.tile[data-book], .book[data-book]');

  function bindBookMenu() {
    const menu = $('bookMenu');
    menu.querySelector('.bookmenu-scrim').addEventListener('click', closeBookMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bookMenuOpen) closeBookMenu(); });
    // Desktop: right-click a book element.
    document.addEventListener('contextmenu', (e) => {
      const el = bookElAt(e.target);
      if (!el) return;
      e.preventDefault();
      openBookForEl(el);
    });
    // Touch: press-and-hold ~500 ms without moving (a move = carousel/list scroll).
    let timer = null, sx = 0, sy = 0;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    document.addEventListener('touchstart', (e) => {
      if (bookMenuOpen) return;
      const el = bookElAt(e.target);
      if (!el) return;
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
      cancel();
      timer = setTimeout(() => {
        timer = null; longPressAt = Date.now();
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }   // Android only; iOS Safari ignores
        openBookForEl(el);
      }, 500);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!timer) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) cancel();
    }, { passive: true });
    document.addEventListener('touchend', cancel, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    // Swallow the synthetic click a long-press spawns (would open the book / start
    // playback). Guarded to a short window and to clicks OUTSIDE the menu card, so
    // menu-item taps and a later deliberate scrim dismiss still work.
    document.addEventListener('click', (e) => {
      if (longPressAt && Date.now() - longPressAt < 700 && !(e.target.closest && e.target.closest('.bookmenu-card'))) {
        longPressAt = 0; e.stopPropagation(); e.preventDefault();
      }
    }, true);
  }

  // ---- Media Session -------------------------------------------------------
  function setMediaSession() {
    if (!('mediaSession' in navigator) || !ctx) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ctx.tracks[ctx.idx].title || ctx.album.title,
      artist: ctx.album.parentTitle || '',
      album: ctx.album.title || '',
      artwork: ctx.coverUrl ? [{ src: ctx.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    const ms = navigator.mediaSession;
    // Custom Play handler RETAINED. `.98` tried native (handler=null) — no benefit:
    // the lock-screen resume-from-pause wedge is an iOS AVAudioSession limitation
    // (a backgrounded, previously-paused WebView element can't reactivate its audio
    // session until foreground — WebKit #198277 / Apple DevForums 762582), so HOW
    // play() is invoked doesn't matter. Meanwhile resumePlay() IS needed for the
    // in-app cases (live-peer adoption, errored-element reload, pending-retry cancel).
    ms.setActionHandler('play', () => resumePlay());
    ms.setActionHandler('pause', () => userPause());
    ms.setActionHandler('seekbackward', () => skipBy(-getSkipBack()));
    ms.setActionHandler('seekforward', () => skipBy(getSkipFwd()));
    ms.setActionHandler('previoustrack', prevTrack);
    ms.setActionHandler('nexttrack', nextTrack);
  }

  // ---- wire up -------------------------------------------------------------
  function bind() {
    // The sign-in button is wired by SignInScreen.init (see below).
    // Full-library browse: bottom nav + the Browse module (js/browse.js).
    Browse.init({
      mount: $('browse'), fmt,
      onPlay: playFromBrowse, onPlayFile: playFileFromBrowse,
      onOpenAuthor: openAuthor, onOpenFiles: openFiles, onBack: goBack,
      getResumeEntry: (rk) => bookEntries[rk] || null,
      getChapterPct,
      // Wire a book-row download button (browse.js renders the element).
      bindDlBtn: (btn, b) => { btn.addEventListener('click', (e) => { e.stopPropagation(); dlBtnAction(b.ratingKey, b.title); }); applyDlBtn(btn, b.ratingKey); },
      onRender: () => { renderPresence(); refreshDlUi(); },   // paint live numbers + download buttons after a render
    });
    document.querySelectorAll('#navbar [data-nav]').forEach((b) => b.addEventListener('click', () => {
      const n = b.dataset.nav;
      if (n === 'home') goHome();
      else if (n === 'authors') goAuthors();
      else if (n === 'books') goBooks();
      else goOptions();
    }));
    $('brandHome').addEventListener('click', goHome);
    // Persist each home carousel's horizontal scroll as it scrolls. A display:none
    // element reports scrollLeft as 0, so when home is hidden (on a browse page) we
    // can't read it for the swipe snapshot — the snapshot would show the FIRST tiles
    // while the real home restores its actual scroll = a tile flicker on swipe-back
    // to home (but NOT from NP, where home stays visible). scroll doesn't bubble →
    // capture. Read back via `dataset.sl` in copyScroll + restoreCarousels.
    document.addEventListener('scroll', (e) => {
      const t = e.target;
      if (t && t.classList && t.classList.contains('carousel')) t.dataset.sl = t.scrollLeft;
    }, { capture: true, passive: true });
    bindSwipeBack();
    bindPullRefresh();
    bindBookMenu();
    // Playback speed — the speed control lives ONLY on the Now-Playing screen
    // (removed from the transport bar to give the book title/author more room).
    // We still keep a transport-side control object as the rate source for spd()
    // and the on-new-src rate restore, and in speedCtls so its label stays synced —
    // it is simply never mounted into the DOM. Restore the last speed so a reload
    // doesn't silently drop back to 1× — startTrack's onMeta reapplies it.
    const savedSpeed = Settings.speed;
    audio.playbackRate = savedSpeed;
    // Tell Presence our real rate NOW. Restoring speed from localStorage never went
    // through onSpeedChange, so st.speed stayed at its default 1 → we published
    // speed:1 while playing at e.g. 1.5×, and peers extrapolated our live position too
    // slowly (they resumed further and further BEHIND us the longer we played).
    Presence.setSpeed(savedSpeed);
    speedCtl = SpeedControl.create({ initial: savedSpeed, onChange: onSpeedChange });
    speedCtls.push(speedCtl);   // synced + queried, but intentionally NOT appended to the transport bar
    $('pPlay').addEventListener('click', () => (audio.paused ? resumePlay() : userPause()));
    $('pBack').addEventListener('click', () => skipBy(-getSkipBack()));
    $('pFwd').addEventListener('click', () => skipBy(getSkipFwd()));
    updateSkipLabels();
    // Tap a non-interactive part of the transport → open Now-Playing.
    $('player').addEventListener('click', (e) => { if (e.target.closest('.controls, .seekrow')) return; openNowPlaying(); });
    // Now-Playing wiring. (No close button — swipe right or browser-back exits.)
    // Block the document pull-down bounce through the overlay: when the NP
    // content fits (nothing to scroll), swallow vertical drags so they can't
    // chain to the page behind. When it overflows, native scrolling works.
    const npEl = $('nowplaying');
    npEl.addEventListener('touchmove', (e) => {
      if (npEl.scrollHeight <= npEl.clientHeight + 1 && !e.target.closest('input')) e.preventDefault();
    }, { passive: false });
    bindScrub($('npSeek'));
    // #npDl is bound by NowPlayingScreen.init (self-binds, like the other screens).
    $('npInfo').addEventListener('click', openInfoSheet);
    $('npSleep').addEventListener('click', () => toast('Sleep timer — coming soon'));
    $('npMarks').addEventListener('click', () => toast('Bookmarks — coming soon'));
    // Track-info sheet: close button, scrim tap, and swipe-down to dismiss.
    $('sheetClose').addEventListener('click', hideSheet);
    $('infoSheet').querySelector('.sheet-scrim').addEventListener('click', hideSheet);
    (() => {
      const panel = $('infoSheet').querySelector('.sheet-panel');
      let sy = null;
      panel.addEventListener('touchstart', (e) => { if (panel.scrollTop > 0) { sy = null; return; } sy = e.touches[0].clientY; panel.style.transition = 'none'; }, { passive: true });
      panel.addEventListener('touchmove', (e) => { if (sy == null) return; const dy = e.touches[0].clientY - sy; if (dy > 0) panel.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
      panel.addEventListener('touchend', (e) => { if (sy == null) return; const dy = e.changedTouches[0].clientY - sy; panel.style.transition = ''; panel.style.transform = ''; if (dy > 90) hideSheet(); sy = null; }, { passive: true });
    })();
    $('npAirplay').addEventListener('click', () => {
      if (typeof audio.webkitShowPlaybackTargetPicker === 'function') { try { audio.webkitShowPlaybackTargetPicker(); } catch { toast('AirPlay unavailable'); } }
      else toast('AirPlay needs Safari');
    });
    // Options: skip-second settings.
    // Options-screen controls (skip / buffer toggles / fresh-start / reset-grace /
    // auto-update / sign-out) are wired by OptionsScreen.init → bindControls().
    bindScrub($('pSeek'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { writeProgress(audio.paused ? 'paused' : 'playing'); Presence.setActive(false); Progress.flush(); Progress.setActive(false); stopRenderTick(); }
      else if (!$('library').classList.contains('hidden')) {
        Presence.setActive(true); Progress.setActive(true); startRenderTick();
        // A lock-screen resume that WEDGED while backgrounded left a pending recovery
        // (see armWedgeWatchdog). Foreground reactivates the audio session, so a fresh
        // load plays now — reload the pending spot so playback resumes the instant the
        // user unlocks, instead of them landing on a silent "playing" element.
        if (bgResumePending && ctx) {
          const p = bgResumePending; bgResumePending = null; wedgeReloads = 0;
          if (window.PBDebug) PBDebug.log('PLAY', `WEDGE foreground recovery — reloading idx=${p.idx} at ${p.position.toFixed(1)}s`);
          startTrack(p.idx, p.position, true);
        }
      }
    });
    // Back online → push whatever we recorded offline, then re-read peers so a LWW
    // merge settles who's most recent (offline data wins only if genuinely newer).
    window.addEventListener('online', () => { Progress.flush(); Progress.refresh(); });
  }

  // Service worker registration + auto-update handling (the SW itself is
  // CACHE-FIRST — see sw.js). Escape hatch: load the app with #nosw (or ?nosw=1)
  // to tear the SW + caches down if it ever misbehaves.
  // ---- app-update button (Options) -----------------------------------------
  // We no longer silently reload a running app to apply an update — a surprise
  // mid-session reload is disruptive (and alarming if it were ever the native
  // shell). The update is still fetched/staged in the BACKGROUND (native
  // WebUpdater for the APK; the service worker for the PWA); this Options button
  // is gray/disabled until that SAME "ready" signal fires, then lights up. The
  // update is applied (promote + reload) only when the user taps it. A staged
  // build also still applies on the next COLD launch (the non-disruptive path).
  // Set true the instant the user taps "App update", so the SW controllerchange
  // handler can tell a user-initiated activation from a surprise auto-takeover.
  // A controllerchange with hadController=true but updateApplyRequested=false is
  // the .73 auto-reload bug recurring (an update activated without a tap).
  let updateApplyRequested = false;
  function markUpdateAvailable(build) {
    const btn = $('optUpdate');
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = 'Update & restart';
    btn.title = build ? ('New build ' + build) : 'A new version is ready';
  }
  function applyAppUpdate() {
    const btn = $('optUpdate');
    if (btn && btn.disabled) return;
    updateApplyRequested = true;
    if (window.PBDebug) PBDebug.log('SW', 'user tapped App update — applying');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating…'; }
    // APK: promote the staged web build natively + reload.
    try { if (window.TomeRoamNative && TomeRoamNative.applyUpdate) { TomeRoamNative.applyUpdate(); return; } } catch {}
    // PWA: activate the waiting service worker + reload onto the new build.
    try { if (window.Net && Net.applyUpdate) { Net.applyUpdate(); return; } } catch {}
    try { location.reload(); } catch {}
  }
  function initUpdateButton() {
    const btn = $('optUpdate');
    if (!btn) return;
    btn.addEventListener('click', applyAppUpdate);
    // APK native OTA: WebUpdater fires an event AND sets a global when a build is
    // staged (the global covers the race where staging finished before this ran).
    window.addEventListener('tomeroam-update-ready', (e) => markUpdateAvailable(e && e.detail));
    if (window.__tomeroamUpdateReady) markUpdateAvailable(window.__tomeroamUpdateReady);
    // "Auto update on launch" is an APK-only concept (the native shell promotes a
    // staged build at boot). Only show the row when the native bridge is present.
    const autoRow = $('optAutoUpdateRow');
    if (autoRow) autoRow.classList.toggle('hidden', !window.TomeRoamNative);
    try {
      if (window.TomeRoamNative) {
        // Mirror the current preference into the native boot decision (source of
        // truth = localStorage; the native SharedPreference is a write-through copy
        // read before the web app loads).
        if (TomeRoamNative.setAutoUpdate) TomeRoamNative.setAutoUpdate(autoUpdateOn());
        // With auto-update OFF (default), native did NOT promote a build staged on a
        // prior launch — surface it so the user can apply it on demand. (With it ON,
        // native already promoted at boot, so nothing is left staged.)
        if (!autoUpdateOn() && TomeRoamNative.stagedBuild) {
          const staged = TomeRoamNative.stagedBuild();
          if (staged) markUpdateAvailable(staged);
        }
      }
    } catch {}
  }

  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (/[?#&]nosw/.test(location.href)) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
      toast('Service worker disabled for this session');
      return;
    }
    // Cache-first SW (see sw.js): serves the shell instantly and still calls
    // skipWaiting()+clients.claim() so the new worker TAKES CONTROL immediately (a
    // waiting worker could never dislodge a still-controlling old SW, which
    // stranded devices on stale HTML in .1–.3 — we keep that property). What we NO
    // LONGER do is force a page reload when it takes over: a surprise mid-session
    // reload is disruptive. The running page keeps its current coherent build; the
    // new one is applied only when the user taps Options → App update (or on the
    // next natural reload/cold launch). No mixed state results — the page never
    // re-fetches its own shell mid-run, and any future load is fully the new build.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;   // first install: nothing to offer
      // With the SW no longer auto-skipWaiting on updates (see sw.js install), a
      // controller change for an existing install should ONLY happen because the
      // user tapped App update. If this ever logs userApply=false, an update
      // activated on its own — the surprise-reload bug is back.
      if (window.PBDebug) PBDebug.log('SW', 'controllerchange hadController=true userApply=' + updateApplyRequested + (updateApplyRequested ? ' (applying)' : ' — NOT user-initiated, unexpected'));
      markUpdateAvailable(null);
      if (window.Net) Net.setUpdateReady();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      const offerIfWaiting = () => { if (reg.waiting && navigator.serviceWorker.controller && window.Net) Net.setUpdateReady(reg); };
      offerIfWaiting();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // Installed while an old worker still controls us = a new build is fully
          // downloaded/cached and ready. Offer it (never auto-apply).
          if (nw.state === 'installed' && navigator.serviceWorker.controller && window.Net) Net.setUpdateReady(reg);
        });
      });
      reg.update().catch(() => {});
      // Re-check for a new build every time the app returns to the foreground.
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  }

  // ---- shell-integrity breadcrumb (NOT a boot gate) -------------------------
  // Versioned asset URLs (?v=<BUILD>) + the atomic versioned SW cache make a
  // mixed HTML/JS shell impossible by construction, so the old blocking "update
  // mismatch" screen only ever FALSE-fired — and once (pre-.6, when window.Store
  // was always undefined) it trapped devices in an infinite Hard-Reset loop. A
  // mere build-number tick is never a reason to interrupt the user. So we no
  // longer gate boot on this: we just log any oddity and continue. The one
  // genuine "this build needs a newer app" case — a web build that requires a
  // native capability an OLD APK lacks — is enforced natively by WebUpdater's
  // `minNativeVersion` floor (build.json), never here. Hard Reset stays reachable
  // from diagnostics (window.PBHardReset) for manual recovery.
  function htmlBuild() { try { const m = document.querySelector('meta[name="tomeroam-build"]'); return m && m.content || null; } catch { return null; } }
  function missingGlobals() {
    const m = [];
    if (!window.Store) m.push('Store');
    if (!window.Net) m.push('Net');
    if (!window.SyncQueue) m.push('SyncQueue');
    return m;
  }
  function logShellIntegrity() {
    const missing = missingGlobals();
    const hb = htmlBuild(), jb = window.PB_BUILD || null;
    if ((missing.length || (hb && jb && hb !== jb)) && window.PBDebug) {
      PBDebug.log('BUILD', `shell note (continuing) missing=[${missing.join(',')}] html=${hb} js=${jb}`);
    }
  }

  // Unregister every service worker for this origin + delete all Cache Storage
  // caches (the app shell), then reload with a cache-busting param so a fully
  // fresh, coherent build is fetched from the network. Deliberately does NOT
  // touch localStorage / IndexedDB, so the Plex token + cached library survive.
  async function hardReset() {
    const btn = document.getElementById('pb-hardreset');
    if (btn) { btn.disabled = true; btn.textContent = 'Resetting…'; }
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
      }
    } catch {}
    try {
      if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k).catch(() => {}))); }
    } catch {}
    const u = new URL(location.href);
    u.searchParams.set('reset', String(Date.now()));   // bust any HTTP cache
    u.hash = '';
    location.replace(u.toString());
  }
  window.PBHardReset = hardReset;   // reachable from diagnostics too

  async function init() {
    if (window.PBDebug) PBDebug.log('BOOT', `id=${bootId} hidden=${document.hidden} signedIn=${Plex.isSignedIn()}`);
    // Banking (js/banking.js) — wire it BEFORE bind() registers the audio listeners
    // that drive it (pump/paintMeter/maybeRecover). It reads live playback state via
    // getters and calls back into updateFileRows/startTrack; locallyStored + Plex are
    // injected (Plex so the module needn't reach a bare global).
    Banking.init({
      getCtx: () => ctx, getCurLoad: () => curLoad, audio, Settings, byId: $,
      updateFileRows, startTrack, toast, locallyStored, Plex,
    });
    // Diagnostics: instrument the audio element (media events + stall watchdog)
    // and provide the state snapshot the log pipe / remote `state` command use.
    PBDebug.watchAudio(audio);
    // Log every user tap (capture phase, before handlers) so a report shows the
    // STIMULUS → response: which tile/button was pressed, with its book/track. Lets
    // us tell a user action apart from an app-driven one when reading the log.
    document.addEventListener('click', (e) => {
      if (!window.PBDebug) return;
      const t = e.target;
      const hit = (t.closest && t.closest('.tile,.bookrow,.filerow,.navbtn,.covertap,button,[data-book],[data-track],a')) || t;
      const bookEl = hit.closest && hit.closest('[data-book]');
      const trackEl = hit.closest && hit.closest('[data-track]');
      const id = hit.id ? '#' + hit.id
        : (typeof hit.className === 'string' && hit.className ? '.' + hit.className.trim().split(/\s+/)[0] : (hit.tagName || '?').toLowerCase());
      const label = (hit.getAttribute && (hit.getAttribute('aria-label') || hit.getAttribute('title'))) || (hit.textContent || '').trim().slice(0, 24);
      PBDebug.log('TAP', `${id}${label ? ' "' + label + '"' : ''}${bookEl ? ' book=' + bookEl.dataset.book : ''}${trackEl ? ' track=' + trackEl.dataset.track : ''}`);
    }, true);
    PBDebug.registerState(() => ({
      audio: {
        src: audio.src ? (audio.src.startsWith('blob:') ? 'banked' : 'stream') : null,
        t: +(audio.currentTime || 0).toFixed(1), dur: +(audio.duration || 0).toFixed(1),
        paused: audio.paused, rate: audio.playbackRate,
        rs: audio.readyState, ns: audio.networkState,
        err: audio.error ? audio.error.code : null,
      },
      book: ctx ? { rk: ctx.book, idx: ctx.idx, tracks: ctx.tracks.length, title: (ctx.album.title || '').slice(0, 40) } : null,
      banks: { n: Banking.count(), mb: +(Banking.usedBytes() / 1048576).toFixed(1), banking: Banking.bankingIdx(), bufCur: Settings.bufferCurrent, bufAhead: Settings.bufferAhead, bufSpaceMb: (window.Downloads && Downloads.bufMaxBytes) ? +(Downloads.bufMaxBytes() / 1048576).toFixed(0) : 0 },
      peers: peersNow.length,
      view: (currentDesc() && currentDesc().v) || 'home',
    }));
    // Register/update the service worker FIRST — a mismatched shell needs the SW
    // to fetch the coherent build, and controllerchange then reloads onto it.
    initServiceWorker();
    // Shell integrity is a breadcrumb now, not a gate — log any oddity and boot
    // anyway (versioned assets make a real mixed build impossible; the "needs a
    // newer app" case is enforced natively via minNativeVersion). Never blocks.
    logShellIntegrity();
    finishInit();
  }

  // Everything after SW registration + the integrity breadcrumb. Kept as its own
  // function (harmless split; the offline-module guards below simply no-op if a
  // module failed to load).
  function finishInit() {
    bind();
    // Offline resilience wiring: ask for persistent storage, bring up the pending
    // sync queue (its count drives the banner), and start the connectivity model.
    // All guarded — the app still runs if any module failed to load.
    if (window.Store) Store.persist();
    if (window.SyncQueue) SyncQueue.init({ onChange: (n) => { if (window.Net) Net.setPendingCount(n); } });
    // Light the Options "App update" button when an update is staged/ready — the
    // native OTA path fires an event/global (handled in initUpdateButton); the PWA
    // service-worker path surfaces via Net's updateReady state below.
    initUpdateButton();
    if (window.Net) Net.init({
      onChange: (st) => { if (st && st.updateReady) markUpdateAvailable(null); },
      onReconnect: async () => {
        Banking.onReconnect();   // connectivity back → drop banking's failure backoff so prefetch resumes
        if ($('library').classList.contains('hidden')) return;
        // Reconnect just fired (plex went unreachable→reachable) — force a live
        // fetch so we pull genuinely fresh data, not the cache-first copy. (Clear
        // the in-memory caches too: getBooks()'s offline fallback may have left the
        // STALE library in booksCache.)
        try {
          Plex.clearCaches(); Browse.clearCache();
          // Browse.clearCache() removed every rendered browse page — INCLUDING the
          // one on screen. Re-render the current browse view FIRST (cache-first, so
          // it repaints instantly from IDB and revalidates in place) — BEFORE the
          // awaited home refresh, which can take seconds on the relay. Otherwise a
          // reconnect that lands while browsing leaves the page the user is looking
          // at blank (the "cleared the whole page" bug).
          const d = currentDesc();
          if (d && d.v !== 'home' && d.v !== 'nowplaying' && d.v !== 'options') applyScreen(d, { render: true, resetScroll: false });
          await loadHomeData({ force: true });
        } catch {}
      },
    });
    // Offline downloads: restore the downloaded-book index + subscribe so every
    // indicator (tile badge, NP button, files rows, Downloaded carousel) tracks
    // the one shared download state. The hooks give Downloads what only we know:
    //   shouldYield  — the live audio element urgently needs the bandwidth
    //                  (downloads pause between chunks instead of contending —
    //                  the .35/.36 iOS truncated-stream lesson),
    //   currentTrack — never evict the buffered bytes the element is playing
    //                  through the SW right now.
    //   protectTracks — the upcoming look-ahead window: budget eviction is
    //                  oldest-first, and within one book the nearest-ahead files
    //                  are the OLDEST writes — without this, prefetching deep
    //                  would evict its own runway to fund farther files.
    if (window.Downloads) {
      Downloads.init({
        shouldYield: () => { try { return elementBusy(); } catch { return false; } },
        currentTrack: () => (ctx && ctx.tracks[ctx.idx] ? ctx.tracks[ctx.idx].ratingKey : null),
        protectTracks: () => {
          if (!ctx) return [];
          const out = [];
          for (let i = ctx.idx; i < ctx.tracks.length && (i - ctx.idx) <= Banking.MAX_AHEAD; i++) out.push(ctx.tracks[i].ratingKey);
          return out;
        },
      });
      Downloads.subscribe(refreshDlUi);
      DownloadsScreen.init({
        Downloads: window.Downloads, toast, modal, fmtGB, GB, DLICO,
        confirmRemove: confirmRemoveDownload, byId: $,
      });
      DownloadsScreen.injectOptionRow();
    }
    // Screens are independent of Downloads — wire them unconditionally.
    HomeScreen.init({ byId: $, renderTile, renderPresence, status, bookEntries });
    NowPlayingScreen.init({
      byId: $, getCtx: () => ctx, getCurLoad: () => curLoad, audio,
      onSpeedChange, speedCtls, spd, bookTimes, fmt, setArt, paintSeek, playPauseSvg, skipSvg,
      getSkipBack, getSkipFwd, prevTrack, nextTrack, skipBy, resumePlay, userPause, goBack,
      applyDlBtn, dlBtnAction, openBookMenu,
    });
    SignInScreen.init({ byId: $, Plex, enterApp: () => enterApp('signin'), toast });
    OptionsScreen.init({ byId: $, Settings, Presence, updateSkipLabels, pumpBank, onSignOut: doSignOut });
    if (Plex.isSignedIn()) return enterApp('init');
    show('signin');
  }
  init();
})();
