// app-harness.js — boots the REAL js/app.js against a controllable outside world.
//
// WHY THIS EXISTS (read before changing it): every serious defect in the .88–.150
// review cycle lived in app.js's ACTION WIRING — the coordination between a user
// action, the <audio> element, retries/watchdogs, Plex requests, Presence, progress
// publication, visibility changes and Media Session. The pure kernels those paths
// call (PBLogic.retryStillCurrent, restoreStillCurrent, resumeAdoptPlan, …) were all
// unit-tested and all PASSED while the bugs shipped, because the bug was never "the
// helper computes the wrong answer" — it was "this call site never invoked the
// helper", or invoked it in the wrong order. A test that calls the helper directly
// can never catch that. This harness exists to drive the REAL entry points instead.
//
// DESIGN:
//   * REAL modules for the coordination layer — js/logic.js, js/playback.js,
//     js/nav.js, js/settings.js — plus the real app.js and the real index.html DOM.
//     Those are the code under test; faking them would be testing the fake.
//   * FAKES only for the outside world (Plex/Presence/Progress/Downloads/Banking/
//     Net/Store/screens) and for <audio>. Every fake records calls in order, so a
//     test can assert not just THAT something happened but in WHAT SEQUENCE — which
//     is the actual invariant in an ownership bug.
//   * DEFERRED promises everywhere a real request would be in flight, so a test can
//     interleave: "start playing book A, and WHILE its track list is still pending,
//     tap book B". That interleaving is the bug class; it cannot be expressed
//     against auto-resolving stubs.
//   * NO test-only exports were added to app.js. Actions are driven through the real
//     DOM (clicking the real elements from index.html) and the real events (audio
//     events, visibilitychange). If a handler is wired to the wrong element or bound
//     at the wrong time, that is a REAL failure here — which is the point, and is
//     exactly the class .106's #npDl ordering trap belonged to.
//
// The swipe GESTURE is deliberately out of scope (drag/layout-coupled; jsdom has no
// layout — see the standing note in js/nav.js).
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { readRoot, ROOT } = require('./dom-fixture.js');

// The REAL index.html, but served from a real origin — jsdom refuses localStorage
// on an opaque origin, and the app keys its token/settings/last-played off it.
const appDom = () => new JSDOM(readRoot('index.html'), { url: 'https://tomeroam.test/' });

/** A promise a test resolves by hand — the interleaving primitive. */
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/**
 * Controllable stand-in for the <audio> element app.js constructs (`new Audio()`).
 * jsdom's HTMLMediaElement throws on play()/load(), and we need to drive media
 * events by hand anyway (the real element's event ORDER is what the wiring reacts to).
 */
class FakeAudio {
  constructor() {
    this.src = '';
    this.currentTime = 0;
    this.duration = 0;
    this.paused = true;
    this.playbackRate = 1;
    this.readyState = 0;
    this.networkState = 0;
    this.error = null;
    this.preload = '';
    this.buffered = { length: 0, start: () => 0, end: () => 0 };
    this._listeners = new Map();
    this.calls = [];                 // ordered log: ['play', 'pause', 'load', …]
    FakeAudio.last = this;
  }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const l = this._listeners.get(type) || [];
    const i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  }
  /** Fire a media event exactly as the browser would. */
  emit(type, patch) {
    if (patch) Object.assign(this, patch);
    for (const fn of (this._listeners.get(type) || []).slice()) fn({ type, target: this });
  }
  play() { this.calls.push('play'); this.paused = false; return Promise.resolve(); }
  pause() { this.calls.push('pause'); this.paused = true; }
  load() { this.calls.push('load'); }
  /**
   * Report a buffered range. The wedge watchdog deliberately ignores a frozen clock
   * with NO forward data (that's real starvation, not the iOS audio-session wedge),
   * so a wedge test must supply forward buffer or the watchdog correctly does nothing.
   */
  setBuffered(start, end) {
    this.buffered = { length: 1, start: () => start, end: () => end };
  }
  /** Convenience: the full "a track loaded and is playing" event sequence. */
  reachPlaying(at = 0) {
    this.emit('loadedmetadata', { readyState: 1, duration: this.duration || 3600 });
    this.emit('canplay', { readyState: 4, currentTime: at });
    this.emit('play', { paused: false });
    this.emit('playing', { paused: false });
  }
}

/** Records every call so a test can assert ORDER, not just occurrence. */
function recorder() {
  const calls = [];
  const rec = (name) => (...args) => { calls.push({ name, args }); };
  return { calls, rec, names: () => calls.map((c) => c.name) };
}

/**
 * Boot the real app. Returns handles for driving it.
 * opts.tracks       — deferred control over Plex.getAlbumTracks (default: auto-resolve)
 * opts.signedIn     — start signed in (default true, so enterApp runs)
 * opts.lastPlayed   — seed localStorage's last-played snapshot for restore paths
 */
function boot(opts = {}) {
  const dom = appDom();
  const { window } = dom;
  const { document } = window;

  // ---- browser globals the app touches -------------------------------------
  global.window = window;
  global.document = document;
  global.navigator = window.navigator;
  global.localStorage = window.localStorage;
  global.Audio = FakeAudio;
  window.Audio = FakeAudio;
  // jsdom has no rAF/layout; run callbacks synchronously so paint-deferred work is
  // observable in-test (the app only uses rAF to sequence, never to measure here).
  const raf = (fn) => { fn(0); return 0; };
  global.requestAnimationFrame = raf; window.requestAnimationFrame = raf;
  global.cancelAnimationFrame = () => {}; window.cancelAnimationFrame = () => {};
  window.scrollTo = () => {};
  global.scrollTo = window.scrollTo;
  global.history = window.history;         // app.js uses the bare `history` global
  global.location = window.location;
  Object.defineProperty(window.navigator, 'mediaSession', {
    value: { metadata: null, playbackState: 'none', setActionHandler: () => {} },
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  window.MediaMetadata = function MediaMetadata(o) { Object.assign(this, o); };
  global.MediaMetadata = window.MediaMetadata;
  // Service worker / cache APIs: present but inert (SW behaviour is tested in swkit).
  Object.defineProperty(window.navigator, 'serviceWorker', {
    value: { controller: null, register: () => Promise.resolve({ addEventListener: () => {} }),
      addEventListener: () => {}, getRegistration: () => Promise.resolve(null) },
    configurable: true,
  });
  window.caches = { open: async () => ({ keys: async () => [], match: async () => undefined }), keys: async () => [], delete: async () => true };
  global.caches = window.caches;
  global.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '' });
  window.fetch = global.fetch;

  let hidden = false;
  Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });

  // ---- controllable clock ---------------------------------------------------
  // The app starts permanent loops (the ~4×/sec transport tick, presence polling,
  // stall watchdogs). Left real they (a) keep the node process alive forever — the
  // documented node:test hang — and (b) make retry/watchdog behaviour
  // non-deterministic. So intervals are RECORDED, never scheduled; a test ticks them
  // explicitly. Timeouts stay real so ordinary awaited flows still settle, but are
  // tracked so dispose() can cancel anything still pending.
  const intervals = [];
  const timeouts = new Set();
  const realSetTimeout = global.setTimeout;
  const realClearTimeout = global.clearTimeout;
  const fakeSetInterval = (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; };
  const fakeClearInterval = (id) => { if (intervals[id - 1]) intervals[id - 1].fn = () => {}; };
  const trackedSetTimeout = (fn, ms, ...a) => {
    const id = realSetTimeout((...cbArgs) => { timeouts.delete(id); fn(...cbArgs); }, ms, ...a);
    timeouts.add(id);
    return id;
  };
  const trackedClearTimeout = (id) => { timeouts.delete(id); return realClearTimeout(id); };

  // opts.fakeTimers — VIRTUAL time. Required for anything delay-driven: the
  // stream-error retry backoff (1s, 2s, 4s…) and the wedge watchdog (1400ms) are
  // setTimeout-based, so without it a test would have to sleep on wall-clock and
  // could never deterministically interleave "a newer action arrives DURING the
  // retry delay" — which is the whole .89/.90/.101 bug shape.
  let vnow = 0, nextTid = 1;
  const tq = [];                                     // {id, fn, due}
  const fakeSetTimeout = (fn, ms, ...a) => {
    const id = nextTid++;
    tq.push({ id, fn: () => fn(...a), due: vnow + (Number(ms) || 0) });
    return id;
  };
  const fakeClearTimeout = (id) => {
    const i = tq.findIndex((t) => t.id === id);
    if (i >= 0) tq.splice(i, 1);
  };

  global.setInterval = fakeSetInterval; window.setInterval = fakeSetInterval;
  global.clearInterval = fakeClearInterval; window.clearInterval = fakeClearInterval;
  const useFake = !!opts.fakeTimers;
  const st = useFake ? fakeSetTimeout : trackedSetTimeout;
  const ct = useFake ? fakeClearTimeout : trackedClearTimeout;
  global.setTimeout = st; window.setTimeout = st;
  global.clearTimeout = ct; window.clearTimeout = ct;

  // ---- fakes: the outside world -------------------------------------------
  const log = recorder();
  const books = opts.books || [
    { ratingKey: 'bookA', title: 'Book A', parentTitle: 'Author', thumb: '/a', leafCount: 3, viewedLeafCount: 0, lastViewedAt: 2000, addedAt: 2000 },
    { ratingKey: 'bookB', title: 'Book B', parentTitle: 'Author', thumb: '/b', leafCount: 3, viewedLeafCount: 0, lastViewedAt: 1000, addedAt: 1000 },
  ];
  const trackFor = (bk) => [0, 1, 2].map((i) => ({
    ratingKey: `${bk}-t${i}`, title: `Ch ${i + 1}`, index: i + 1,
    durationMs: 600000, partKey: `/parts/${bk}/${i}`, size: 1000, viewOffset: 0, viewCount: 0,
  }));

  /** Pending getAlbumTracks calls, so a test can resolve them out of order. */
  const pendingTracks = [];
  const plex = {
    _deferTracks: !!opts.deferTracks,
    isSignedIn: () => (opts.signedIn !== false),
    connect: async () => 'http://plex.test',
    resetConn: log.rec('plex.resetConn'),
    signOut: log.rec('plex.signOut'),
    serverNow: () => Date.now(),
    getServerName: () => 'TestServer',
    artUrl: (t) => (t ? 'art:' + t : null),
    streamUrl: (t) => 'stream:' + t,
    getBooks: async () => books,
    getAlbum: async (rk) => books.find((b) => b.ratingKey === rk) || books[0],
    getAlbumTracks: (rk) => {
      log.calls.push({ name: 'plex.getAlbumTracks', args: [rk] });
      if (!plex._deferTracks) return Promise.resolve(trackFor(rk));
      const d = deferred();
      pendingTracks.push({ rk, ...d, resolve: () => d.resolve(trackFor(rk)) });
      return d.promise;
    },
    getTrackInfo: async () => ({}),
    writeTimeline: async () => true,
    resetBookProgress: async () => true,
    clearCaches: () => {},
    getResumeMap: async () => [],          // optional LMS plugin layer: absent by default
    foregroundBusy: () => false,
  };

  // app.js registers its peer callbacks here (Presence.init({onPeers,onSupersede})).
  // Capturing them lets a test push a live peer through the REAL code path instead of
  // reaching into app.js internals.
  const cb = {};
  const presence = {
    init: (deps) => { Object.assign(cb, deps || {}); }, setActive: () => {}, cachedPeers: () => [],
    livePos: (p) => (p && p.pos) || 0, getClaim: () => 0,
    claimPlaying: log.rec('presence.claimPlaying'),
    setTrack: log.rec('presence.setTrack'),
    setPlaying: log.rec('presence.setPlaying'),
    setPaused: log.rec('presence.setPaused'),
    setSpeed: log.rec('presence.setSpeed'),
    grab: log.rec('presence.grab'),
    resetClaim: log.rec('presence.resetClaim'),
    flush: log.rec('presence.flush'),
  };

  const progress = {
    init: () => {}, setActive: () => {}, hydrate: () => {}, setSeed: () => {},
    isMine: () => true, bookRecord: () => null, myBookRecord: () => null,
    trackRecord: () => null, trackPct: () => 0,
    recordBook: log.rec('progress.recordBook'),
    recordTrack: log.rec('progress.recordTrack'),
    resetBook: log.rec('progress.resetBook'),
    refresh: async () => {}, flush: async () => {},
  };

  const downloads = {
    init: () => {}, subscribe: () => {}, available: () => true, suspend: () => {},
    isDownloaded: () => false, trackLocal: () => false, trackBuffered: () => false,
    trackProgress: () => 0, progress: () => 0, stateOf: () => 'none',
    getBlob: async () => null, listDownloaded: async () => [], remove: async () => {}, bufMaxBytes: () => 1e9,
  };

  const banking = {
    MAX_AHEAD: 3, init: () => {}, pump: () => {}, clear: () => {}, has: () => false,
    bankedUrl: () => null, bankingIdx: () => -1, bankPct: () => 0, count: () => 0,
    usedBytes: () => 0, elementBusy: () => false, abortIfBusy: () => {},
    ensureBook: () => {}, maybeRecover: () => false, paintMeter: () => {},
    refreshMeter: () => {}, setBuffered: () => {}, nativeBufferedPct: () => 0,
    onReconnect: () => {}, cancelStallRecovery: () => {},
  };

  const noop = () => {};
  const screenDeps = {};
  const capture = (name) => (deps) => { screenDeps[name] = deps || {}; };
  const screens = {
    NowPlayingScreen: { init: capture('NowPlayingScreen'), render: noop, update: noop, updateDl: noop, updatePlayIcon: noop, buildControls: noop },
    SignInScreen: { init: noop, reset: noop },
    DownloadsScreen: { init: noop, render: noop },
    OptionsScreen: { init: noop, render: noop },
    GeneralScreen: { init: capture('GeneralScreen'), render: noop, renderDeviceName: noop },
    PlaybackScreen: { init: noop, render: noop },
    BufferingScreen: { init: noop, render: noop },
  };

  const browse = {
    init: noop, render: async () => {}, reset: noop, clearCache: noop,
    deactivate: log.rec('browse.deactivate'), showPage: noop,
    patchRows: () => false,          // never claim the repaint — force the real renderTile path
    bookSig: (b) => JSON.stringify([b && b.thumb, b && b.title, b && b.parentTitle]),
  };

  const net = { init: noop, state: () => ({ mode: 'test' }), checkPlex: async () => true,
    setPendingCount: noop, setUpdateReady: noop, applyUpdate: noop };

  // ---- install globals (BOTH global.* and window.* — app.js and the modules
  // reference these as BARE globals, which resolve via node's global object) ----
  const put = (name, value) => { global[name] = value; window[name] = value; };
  put('Plex', plex); put('Presence', presence); put('Progress', progress);
  put('Downloads', downloads); put('Banking', banking); put('Net', net);
  put('Browse', browse);
  put('Store', { persist: async () => 'granted', cachedBooks: async () => books });
  put('SyncQueue', { init: noop, enqueue: noop, count: async () => 0 });
  put('Warmer', { start: noop });
  put('ArtLoader', { scan: noop, observe: noop, release: noop });
  for (const [k, v] of Object.entries(screens)) put(k, v);
  put('PBDebug', { log: (tag, m) => log.calls.push({ name: 'debug', args: [tag, String(m)] }),
    watchAudio: noop, registerState: noop, snapshot: () => ({}) });

  // ---- REAL coordination modules under test --------------------------------
  const real = (rel) => {
    delete require.cache[require.resolve(rel)];
    return require(rel);
  };
  put('PBLogic', real('../js/logic.js'));
  put('Settings', real('../js/settings.js'));
  put('Playback', real('../js/playback.js'));
  put('Nav', real('../js/nav.js'));
  put('HandoffController', real('../js/handoff.js'));
  put('HomeScreen', real('../js/home-screen.js'));   // REAL: renders real tiles via app.js's renderTile
  // speed.js assigns straight to window.SpeedControl (no module.exports), so eval it
  // in this context and mirror it onto global for app.js's bare reference.
  (0, eval)(fs.readFileSync(path.join(ROOT, 'js', 'speed.js'), 'utf8'));
  global.SpeedControl = window.SpeedControl;

  // MUST match app.js's `const LAST = 'pb_lastPlayed'` (js/app.js:11). This read the
  // wrong key ('pb_last') until .152, which made `opts.lastPlayed` silently INERT:
  // restoreLastPlayed always saw a null snapshot and returned early, so the whole
  // restore seam — including its supersession guard — was untestable while appearing
  // available. A fake that is kinder than the real dependency hides the seam it fakes.
  if (opts.lastPlayed) localStorage.setItem('pb_lastPlayed', JSON.stringify(opts.lastPlayed));

  // ---- boot the REAL app.js (a bare IIFE: no exports, self-runs init()) -----
  // Indirect eval so bare identifiers resolve against node's global scope, where
  // the fakes above live.
  const src = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  (0, eval)(src);

  const $ = (id) => document.getElementById(id);
  return {
    dom, window, document, $, screenDeps,
    audio: FakeAudio.last,
    plex, presence, progress, downloads, banking, browse, net, screens,
    log,
    pendingTracks,
    /** Click a real element from the shipped index.html. */
    tap(sel) {
      const el = sel.startsWith('#') ? $(sel.slice(1)) : document.querySelector(sel);
      if (!el) throw new Error('no such element to tap: ' + sel);
      el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      return el;
    },
    /**
     * A REAL user seek: drives the SHIPPED scrub slider's `change` path, which is
     * what app.js binds (bindScrub) → onManualSeek() → notePlaybackIntent() →
     * Playback.noteIntent(). Deliberately not a direct call — the thing under test is
     * whether the real control reaches the invalidation at all (.90/.91).
     */
    /**
     * Push a live peer list through the REAL Presence.onPeers callback app.js
     * registered (Presence.init({onPeers,onSupersede})) — not by poking app internals.
     * Peer shape the app expects: {id,name,book,track,state:'playing',claim,at,pos}.
     */
    pushPeers(list) { if (cb.onPeers) cb.onPeers(list); },
    /** Drive a cross-device supersede through the REAL callback. */
    supersede(by) { if (cb.onSupersede) cb.onSupersede(by); },
    seek(sec, which = 'pSeek') {
      const s = $(which);
      if (!s) throw new Error('no such slider: ' + which);
      const a = FakeAudio.last;
      const dur = a.duration || 0;
      s.value = dur ? String((sec / dur) * 1000) : '0';
      s.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
    /** Drive a background/foreground transition through the real listener. */
    setHidden(v) {
      hidden = !!v;
      document.dispatchEvent(new window.Event('visibilitychange'));
    },
    /** Let queued microtasks settle (awaited promises inside the app). */
    settle: () => new Promise((r) => setImmediate(r)),
    /** Recorded interval loops — tick them explicitly instead of waiting on wall time. */
    clock: {
      intervals,
      /** Run every registered interval callback `n` times (the transport tick etc.). */
      tick(n = 1) { for (let i = 0; i < n; i++) for (const t of intervals.slice()) t.fn(); },
      now: () => vnow,
      pending: () => tq.length,
      /**
       * Advance VIRTUAL time, firing due timeouts in chronological order and letting
       * each one's promise chain settle before the next (a retry awaits a reprobe,
       * so the continuation must run before later timers fire).
       * Requires boot({ fakeTimers: true }).
       */
      async advance(ms) {
        const target = vnow + ms;
        for (;;) {
          let next = null;
          for (const t of tq) if (t.due <= target && (!next || t.due < next.due)) next = t;
          if (!next) break;
          tq.splice(tq.indexOf(next), 1);
          vnow = next.due;
          try { next.fn(); } catch { /* a timer callback throwing is the app's business */ }
          for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
        }
        vnow = target;
      },
    },
    /** Cancel anything still pending so node:test can exit. ALWAYS call in a finally. */
    dispose() {
      for (const id of [...timeouts]) trackedClearTimeout(id);
      intervals.length = 0;
      tq.length = 0;
      global.setTimeout = realSetTimeout; global.clearTimeout = realClearTimeout;
      try { window.close(); } catch { /* jsdom already torn down */ }
    },
  };
}

module.exports = { boot, deferred, FakeAudio, recorder };
