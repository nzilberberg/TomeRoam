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
//   * DEFERRED promises for the requests the app OBSERVES — Plex.getAlbumTracks and
//     audio.play(). (Progress/Presence are deliberately NOT deferrable: app.js calls
//     them fire-and-forget at ~50 sites, never awaiting or catching, so a deferred
//     completion has nothing to race against there. See progress-publish.test.js for
//     where those publication races actually live.) So a test can
//     interleave: "start playing book A, and WHILE its track list is still pending,
//     tap book B". That interleaving is the bug class; it cannot be expressed
//     against auto-resolving stubs.
//   * NO test-only exports were added to app.js. Actions are driven through the real
//     DOM (clicking the real elements from index.html) and the real events (audio
//     events, visibilitychange). If a handler is wired to the wrong element or bound
//     at the wrong time, that is a REAL failure here — which is the point, and is
//     exactly the class .106's #npDl ordering trap belonged to.
//
// The swipe gesture's DRAG GEOMETRY stays out of scope (jsdom has no layout, so
// thresholds/velocity/committed-distance are not meaningful here — see the standing
// note in js/nav.js). Its EVENT PLUMBING is in scope as of .178 and is driven by
// `h.touch` below: which node the listeners are bound to, and whether a gesture can
// still be settled after the DOM under the finger is destroyed, are exactly the
// wiring questions this harness exists for — and a real starved-gesture bug shipped
// because nothing covered them.
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
    // src and currentTime are ACCESSORS so their assignment lands in the SHARED
    // ordered log. Without that, audio events lived only in this.calls while Plex/
    // Presence/Progress/MediaSession lived in log.calls, and no test could prove an
    // ordering ACROSS the two — e.g. that presence is claimed only after load().
    this._src = '';
    this._currentTime = 0;
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
    this.playAttempts = [];          // one record per play() call: {n, src, state, promise}
    Object.defineProperty(this, 'src', {
      get: () => this._src,
      set: (v) => { this._src = v; FakeAudio.note('audio.src', v); },
      configurable: true, enumerable: true,
    });
    Object.defineProperty(this, 'currentTime', {
      get: () => this._currentTime,
      set: (v) => { this._currentTime = v; FakeAudio.note('audio.currentTime', v); },
      configurable: true, enumerable: true,
    });
    this._deferPlays = 0;            // how many upcoming play() calls stay pending
    FakeAudio.last = this;
  }
  /** Mirror an audio effect into the shared ordered recorder (set by boot()). */
  static note(name, ...args) { if (FakeAudio.sharedLog) FakeAudio.sharedLog.calls.push({ name, args }); }
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
  /**
   * A real play() returns a promise that settles when playback actually STARTS — it
   * can stay pending for a long time, or reject (iOS NotAllowedError when the audio
   * session can't activate, which is the lock-screen resume case). The old fake always
   * returned Promise.resolve(), so "pause arrives while play is pending" and "play was
   * refused" were both unrepresentable.
   *
   * `paused` is still cleared SYNCHRONOUSLY here, deliberately: that is what the HTML
   * spec requires of play(), and the requested-but-not-yet-playing state is expressed
   * by withholding the `playing` event, not by lying about `paused`. Promise settlement
   * and media events stay independent — resolvePlay() does NOT emit anything.
   */
  play() {
    const n = this.playAttempts.length;
    const att = { n, src: this.src, state: 'resolved' };
    this.calls.push('play'); FakeAudio.note('audio.play');
    this.paused = false;
    this.playAttempts.push(att);
    if (this._deferPlays > 0) {
      this._deferPlays--;
      att.state = 'pending';
      att.promise = new Promise((res, rej) => { att._settle = res; att._fail = rej; });
    } else {
      att.promise = Promise.resolve();
    }
    return att.promise;
  }
  /** Make the next N play() calls return a promise that stays PENDING. */
  deferNextPlay(n = 1) { this._deferPlays += n; }
  /** Settle a specific attempt — out of order is fine, that's the point. */
  resolvePlay(i = 0) {
    const a = this.playAttempts[i];
    if (!a) throw new Error('no play attempt #' + i);
    if (a.state !== 'pending') throw new Error(`play attempt #${i} is already ${a.state}`);
    a.state = 'resolved'; this.calls.push('play:resolve#' + i); FakeAudio.note('audio.play:resolved', i); a._settle();
  }
  rejectPlay(i = 0, err) {
    const a = this.playAttempts[i];
    if (!a) throw new Error('no play attempt #' + i);
    if (a.state !== 'pending') throw new Error(`play attempt #${i} is already ${a.state}`);
    // A REAL refused play() leaves the element PAUSED — browsers run the pause steps
    // when they reject with NotAllowedError. Modelling that matters: without it the
    // fake reports paused=false after a refusal and the app looks like it is claiming
    // playback it never got, which is a defect of the FAKE, not of app.js.
    a.state = 'rejected'; this.calls.push('play:reject#' + i); FakeAudio.note('audio.play:rejected', i); this.paused = true;
    a._fail(err || Object.assign(new Error('play() refused'), { name: 'NotAllowedError' }));
  }
  getPlayAttempt(i = 0) { return this.playAttempts[i]; }
  pause() { this.calls.push('pause'); FakeAudio.note('audio.pause'); this.paused = true; }
  load() { this.calls.push('load'); FakeAudio.note('audio.load'); }
  /**
   * Sign-out teardown calls removeAttribute('src') then load(). Without this the
   * fake THREW on the first call — and because both sit in one try/catch, the
   * teardown load() was skipped and the source removal was never exercised. The
   * generation-invalidation regression still passed, so the gap was invisible: a
   * fake that throws where the real element works silently narrows what a test
   * proves. Mirrors the element: dropping src leaves it empty.
   */
  removeAttribute(name) {
    this.calls.push('removeAttribute:' + name);
    FakeAudio.note('audio.removeAttribute');
    if (name === 'src') this.src = '';
  }
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
  // MUST be defineProperty, NOT assignment. Node >=21 defines globalThis.navigator as
  // a GETTER-ONLY accessor, so `global.navigator = …` silently does nothing in sloppy
  // mode — app.js then saw NODE's navigator (userAgent "Node.js/22") instead of
  // jsdom's, and every navigator-gated branch took the "not supported" path forever:
  // `'mediaSession' in navigator` was false, so setMediaSession() returned early in
  // EVERY test and the entire Media Session surface was dead code under test. The
  // property is configurable, so defineProperty succeeds where assignment does not.
  Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true, writable: true });
  global.localStorage = window.localStorage;
  global.Audio = FakeAudio;
  window.Audio = FakeAudio;
  // jsdom has no rAF/layout. DEFAULT: run callbacks synchronously so paint-deferred
  // work is observable in-test.
  //
  // ⭐ opts.deferRaf — QUEUE them instead, one frame per `h.raf.frame()`. A synchronous
  // rAF is a fake KINDER than a browser: it collapses "the frame has not been painted
  // yet" out of existence, so any test of code that waits for a painted frame would pass
  // whether the wait was there or not. .198 needs exactly that state to be expressible
  // (the ghost must still be covering the view UNTIL the paint frame lands), so a test
  // written against the synchronous default could not fail and would prove nothing.
  const rafQ = [];
  const raf = opts.deferRaf
    ? (fn) => { rafQ.push(fn); return rafQ.length; }
    : (fn) => { fn(0); return 0; };
  global.requestAnimationFrame = raf; window.requestAnimationFrame = raf;
  global.cancelAnimationFrame = () => {}; window.cancelAnimationFrame = () => {};
  window.scrollTo = () => {};
  global.scrollTo = window.scrollTo;
  global.history = window.history;         // app.js uses the bare `history` global
  global.location = window.location;
  // Media Session: CAPTURE the handlers instead of discarding them. app.js registers
  // six (app.js:1965-1970) and they are a genuinely separate entry point from the
  // visible UI — `play` routes to resumePlay() unconditionally, while the mini-player
  // button toggles on audio.paused, and previoustrack/nexttrack have NO mini-player
  // equivalent at all. The old `setActionHandler: () => {}` stub threw all of that
  // away, so every lock-screen action was unreachable from a test. `log` is declared
  // below in this same scope; these closures only run once app.js is booted.
  const msHandlers = new Map();
  const msState = { metadata: null, playbackState: 'none', positionState: null };
  Object.defineProperty(window.navigator, 'mediaSession', {
    value: {
      get metadata() { return msState.metadata; },
      set metadata(v) { msState.metadata = v; log.calls.push({ name: 'ms.metadata', args: [v && v.title] }); },
      get playbackState() { return msState.playbackState; },
      set playbackState(v) { msState.playbackState = v; log.calls.push({ name: 'ms.playbackState', args: [v] }); },
      // null is the documented "unregister" value — record it as removal, not a handler.
      setActionHandler(action, fn) {
        if (fn === null || fn === undefined) msHandlers.delete(action); else msHandlers.set(action, fn);
        log.calls.push({ name: 'ms.setActionHandler', args: [action, fn ? 'fn' : 'null'] });
      },
      setPositionState(s) { msState.positionState = s; log.calls.push({ name: 'ms.setPositionState', args: [s] }); },
    },
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  // Object URLs are TRACKED, not stubbed away: the no-service-worker download path
  // creates one and hands ownership to curObjUrl, and getting that order wrong means
  // audio.src receives a REVOKED url. A test can only see that if we record both.
  const objectUrls = { created: [], revoked: [] };
  let objUrlSeq = 0;
  window.URL = window.URL || {};
  window.URL.createObjectURL = (blob) => { const u = 'blob:test/' + (++objUrlSeq); objectUrls.created.push(u); return u; };
  window.URL.revokeObjectURL = (u) => { objectUrls.revoked.push(u); };
  global.URL = window.URL;
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
  FakeAudio.sharedLog = log;   // audio effects join the SAME ordered stream as the fakes

  /**
   * A recorder that ALSO returns a controllable promise.
   *
   * app.js calls Progress/Presence fire-and-forget — ~50 call sites, none of which
   * await, .then or .catch — so delaying or rejecting one cannot reorder app.js state
   * by itself. That is a claim worth MECHANISING rather than asserting in prose, which
   * is what these controls are for: a test can reject a publication and prove playback
   * is undisturbed and that nothing escapes as an unhandled rejection. (The publication
   * ORDERING races are real, but they live inside progress.js/presence.js — see
   * test/progress-publish.test.js.)
   */
  const pubs = { pending: [], deferred: new Set() };
  let progressMerged = null;        // app.js's real onMerged, captured by progress.init
  const recCtl = (name) => (...args) => {
    log.calls.push({ name, args });
    if (!pubs.deferred.has(name)) return Promise.resolve();
    pubs.deferred.delete(name);
    const d = deferred();
    pubs.pending.push({ name, args, ...d, n: pubs.pending.length });
    return d.promise;
  };
  const publications = {
    /** Make the NEXT call to `name` return a promise that stays pending. */
    deferNext: (name) => pubs.deferred.add(name),
    pending: () => pubs.pending.filter((p) => !p.done),
    find: (name) => pubs.pending.find((p) => p.name === name && !p.done),
    /**
     * Settle a deferred publication. For `progress.refresh` this ALSO invokes the
     * real onMerged callback app.js registered — because that is what a real
     * refresh completion does: progress.js poll() ends with rebuild() then
     * cbMerged(). Without it, settling a refresh had NO side effect at all, so a
     * test asserting "a stale refresh cannot disturb the newer selection" was only
     * proving that resolving a no-op promise does nothing.
     */
    settle(name) {
      const p = this.find(name); if (!p) throw new Error('no pending ' + name);
      p.done = true; p.resolve();
      if (name === 'progress.refresh' && progressMerged) progressMerged();
    },
    fail(name, err) {
      const p = this.find(name);
      if (!p) throw new Error('no pending ' + name);
      p.done = true;
      p.reject(err || new Error(name + ' failed'));
    },
  };
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
    // Capture onMerged: the real Progress calls it after every poll/rebuild, and
    // publications.settle('progress.refresh') replays that so a completing refresh
    // has the side effect it really has (see settle above).
    init: (o) => { progressMerged = (o && o.onMerged) || null; },
    setActive: () => {}, hydrate: () => {}, setSeed: () => {},
    isMine: () => true, bookRecord: () => null, myBookRecord: () => null,
    trackRecord: () => null, trackPct: () => 0,
    recordBook: log.rec('progress.recordBook'),
    recordTrack: log.rec('progress.recordTrack'),
    resetBook: log.rec('progress.resetBook'),
    // FIDELITY: every other Progress/Presence method is SYNCHRONOUS in the real module
    // (presence.js:214-246, progress.js:294-929 all return undefined), so they stay
    // plain recorders — handing a test a promise to defer or reject there would model
    // an interface that does not exist, and a fake harsher than reality manufactures
    // phantom bugs. `refresh()` (progress.js:949) is the ONE genuinely async surface,
    // and it cannot reject: poll() swallows everything in an outer catch.
    refresh: recCtl('progress.refresh'), flush: log.rec('progress.flush'),
  };

  const downloads = {
    init: () => {}, subscribe: () => {}, available: () => true, suspend: () => {},
    isDownloaded: () => false,
    // opts.downloadedTracks: rks served from a local blob. With no SW controller (the
    // harness default) app.js takes the object-URL branch — the desktop fallback.
    trackLocal: (rk) => !!(opts.downloadedTracks || []).includes(String(rk)),
    trackBuffered: () => false,
    trackProgress: () => 0, progress: () => 0, stateOf: () => 'none',
    // DEFERRABLE, because the interesting case is what lands while it is PENDING:
    // app.js returns from startTrack() with this promise outstanding, so anything
    // that happens in between (sign-out, a newer selection) must be able to
    // invalidate it. An always-immediate fake makes that window unrepresentable —
    // the same "fake kinder than the real dependency" trap as FakeAudio.play().
    getBlob: (rk) => {
      const has = (opts.downloadedTracks || []).includes(String(rk));
      const value = has ? { size: 123, _rk: rk } : null;
      if (!blobCtl.defer) return Promise.resolve(value);
      blobCtl.defer--;
      return new Promise((resolve) => { blobCtl.pending.push(() => resolve(value)); });
    },
    listDownloaded: async () => [], remove: async () => {}, bufMaxBytes: () => 1e9,
  };
  const blobCtl = { defer: 0, pending: [] };

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

  // The swipe row-hold. Modelled with the REAL token semantics (a monotonic token,
  // and endHold ignores a stale one) because the hazard being tested is a hold that
  // is never released — a fake that accepted any token would pass a leak.
  let holdSeq = 0;
  const browse = {
    init: noop, render: async () => {}, reset: noop, clearCache: noop,
    beginHold: () => { log.calls.push({ name: 'browse.beginHold', args: [] }); return ++holdSeq; },
    endHold: (t) => { log.calls.push({ name: 'browse.endHold', args: [t === holdSeq ? 'current' : 'stale'] }); },
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
  // `stats` must exist or app.js's .180 reveal diagnostic short-circuits and the whole
  // path stays dark in every test — the .154 "a fake that is never consulted is
  // invisible" trap. Counters stay zero; the point is that the code RUNS.
  put('ArtLoader', { scan: noop, observe: noop, release: noop,
    stats: () => ({ queued: 0, loads: 0, instant: 0, fade: 0, failed: 0, released: 0, maxDt: 0 }) });
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
  // REAL too: it OWNS the only UI buttons for prevTrack/nextTrack (npPrev/npNext,
  // built in buildControls) — the mini-player has just skip-back/play-pause/skip-fwd.
  // Stubbed, those two production entry points had no clickable path in any test, so
  // Media Session's previoustrack/nexttrack had nothing to be compared against.
  put('NowPlayingScreen', real('../js/nowplaying-screen.js'));
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
    objectUrls,
    publications,
    /**
     * Control the async downloaded-blob load. `deferNextBlob()` makes the next
     * Downloads.getBlob() hang so a test can act during the window app.js leaves
     * open (it returns from startTrack with the promise outstanding); `resolveBlob()`
     * lets it land. Without this the sign-out/newer-selection races on the
     * downloaded path cannot be written at all.
     */
    blob: {
      deferNext(n = 1) { blobCtl.defer += n; },
      pendingCount: () => blobCtl.pending.length,
      resolve() {
        const fns = blobCtl.pending.splice(0);
        fns.forEach((f) => f());
        return fns.length;
      },
    },
    /**
     * The REAL Media Session handlers app.js registered. `invoke` calls the exact
     * callback the browser would — the lock-screen entry point — so a test can prove
     * it routes through the same production action as the visible control rather than
     * poking the audio element. Throws on an unregistered action so a MISSING
     * registration fails loudly instead of silently passing.
     */
    mediaSession: {
      state: msState,
      registered: () => [...msHandlers.keys()],
      getHandler: (action) => msHandlers.get(action) || null,
      invoke(action, details) {
        const fn = msHandlers.get(action);
        if (!fn) throw new Error('no Media Session handler registered for: ' + action);
        log.calls.push({ name: 'ms.invoke', args: [action] });
        return fn(details || { action });
      },
    },
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
    /**
     * Drive a REAL touch gesture against the shipped listeners.
     *
     * FIDELITY RULE — the reason this is not a convenience wrapper: per the Touch
     * Events spec the touch target is fixed at `touchstart`, and every later
     * touchmove/touchend/touchcancel of that gesture is dispatched AT THAT NODE —
     * including after it has been removed from the document, at which point the
     * event no longer reaches `document` (a detached node's propagation path is
     * itself). This harness reproduces that exactly: `move`/`end` re-dispatch at the
     * ORIGINAL start target, attached or not.
     *
     * A fake that re-targeted to `document` instead would be KINDER than a real
     * browser and would silently hide the entire bug class this exists to catch —
     * a gesture starved because the DOM under the finger was destroyed mid-drag.
     */
    touch: (() => {
      let target = null;
      const ev = (type, x, y) => {
        // touchstart/touchmove are cancelable in a real browser until the platform
        // takes the gesture over; app.js:377 branches on exactly that flag.
        const e = new window.Event(type, { bubbles: true, cancelable: type !== 'touchend' && type !== 'touchcancel' });
        const t = { clientX: x, clientY: y, identifier: 0, target };
        e.changedTouches = [t];
        e.touches = (type === 'touchend' || type === 'touchcancel') ? [] : [t];
        return e;
      };
      const fire = (type, x, y) => {
        if (!target) throw new Error('touch.' + type + ' with no gesture started');
        target.dispatchEvent(ev(type, x, y));
      };
      return {
        /** Begin a gesture on a real element (selector or node). x/y are viewport px. */
        start(x, y, sel) {
          target = typeof sel === 'string'
            ? (sel.startsWith('#') ? $(sel.slice(1)) : document.querySelector(sel))
            : sel;
          if (!target) throw new Error('no such element to touch: ' + sel);
          fire('touchstart', x, y);
          return target;
        },
        move(x, y) { fire('touchmove', x, y); },
        end(x, y) { fire('touchend', x, y); target = null; },
        cancel(x, y) { fire('touchcancel', x, y); target = null; },
        /** The node the gesture is bound to — for asserting it really got detached. */
        target: () => target,
      };
    })(),
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
    /**
     * Deferred animation frames. Only meaningful under boot({ deferRaf: true }) —
     * otherwise rAF ran synchronously and `pending()` is always 0.
     */
    raf: {
      /** How many callbacks are waiting for a frame. */
      pending: () => rafQ.length,
      /**
       * Run ONE frame's worth of callbacks. Callbacks queued BY those callbacks wait
       * for the next frame, exactly as a browser schedules them — which is what makes
       * a double-rAF genuinely take two frames here instead of collapsing into one.
       */
      async frame() {
        const batch = rafQ.splice(0, rafQ.length);
        for (const fn of batch) { try { fn(0); } catch { /* the app's business */ } }
        for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
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
