// playback.js — PlaybackController: the async playback-INTENT / retry / recovery
// state machine, extracted from app.js so its RACES are unit-testable. Every
// `.88`–`.99` review finding lived in exactly this wiring (retry-vs-seek,
// retry-vs-adoption, retry-vs-supersede, retry-vs-sign-out, the lock-screen wedge)
// and it had no harness because it was welded into the app.js IIFE. Now it's a
// factory-with-injected-accessors like the other modules, driven by fake audio /
// timers / deferred promises in test/playback.test.js.
//
// OWNS: the intent generation (a monotonic counter any deliberate playback action
// bumps to cancel a stale retry), the stream-error retry (bounded, backoff, fresh-
// base re-probe), the retry-still-current guard, and the iOS lock-screen wedge
// watchdog (defer while hidden, recover on foreground).
//
// Does NOT own: the <audio> element, startTrack / loadedmetadata, Plex connection
// state (connGen lives in plex.js), the tile engine, or any DOM. Those stay in
// app.js and are injected. `loadGen` is READ via getLoadGen() — startTrack still
// bumps it; the controller only snapshots it to detect supersession.
const Playback = (() => {
  // Injected by app.js init: { audio, getCtx, getCurLoad, getLoadGen, loadTrack,
  //   hasLocal, connect, resetConn, toast, hidden }
  let d = null;

  let intentGen = 0;            // bumped by noteIntent(); a retry captures it + bails if it moved
  let loadRetry = 0;            // stream-error retry attempts (reset on a healthy loadedmetadata)
  let loadRetryTimer = null;
  const MAX_LOAD_RETRY = 4;

  let wedgeTimer = null;
  let bgResumePending = null;   // {idx, position} — a lock-screen wedge to recover on foreground
  let wedgeReloads = 0;         // consecutive FOREGROUND reloads without a healthy advance
  const MAX_WEDGE_RELOADS = 2;
  const WEDGE_CHECK_MS = 1400;

  const dbg = (t, m) => { if (typeof window !== 'undefined' && window.PBDebug) PBDebug.log(t, m); };

  function init(deps) { d = deps; }

  // ---- playback intent -------------------------------------------------------
  // Any newer DELIBERATE action (seek/skip/Prev-restart, peer grab/adopt, handoff
  // correction, user play/pause, cross-device supersede, sign-out) calls this to
  // cancel a pending stream retry so it can't later yank playback back to the
  // failed track's old position/state — AND to cancel any pending lock-screen wedge
  // recovery, whose captured position is now stale (reloading it would undo the
  // reposition the user just made). See onPlaying() for the load-gen half.
  function noteIntent() {
    intentGen++;
    cancelRetry();
    clearTimeout(wedgeTimer); wedgeTimer = null;
    bgResumePending = null;
    wedgeReloads = 0;
  }
  function cancelRetry() { clearTimeout(loadRetryTimer); loadRetryTimer = null; }
  function resetRetry() { loadRetry = 0; }   // called from onMeta — got metadata → connection good

  function forwardBufferedSec() {
    const audio = d.audio, b = audio.buffered, ct = audio.currentTime || 0;
    for (let i = 0; i < b.length; i++) if (ct >= b.start(i) - 1 && ct <= b.end(i) + 1) return b.end(i) - ct;
    return 0;
  }

  // ---- media-element error → bounded retry -----------------------------------
  // Network drops on a slow relay surface as MEDIA_ERR_NETWORK; a stale/rotated
  // relay base that curBase() fell back to before connect() verified one surfaces
  // as MEDIA_ERR_SRC_NOT_SUPPORTED (code 4). Both are recoverable for a STREAM src:
  // retry, re-resolving a fresh base first (the old retry reloaded the same dead URL
  // and exhausted). A LOCAL src error is a bad blob → not retried here (haveBank
  // switches to a good local copy if one exists). MEDIA_ERR_ABORTED = we swapped src
  // on purpose, ignore.
  function onError() {
    const audio = d.audio, err = audio.error, curLoad = d.getCurLoad();
    if (!err || err.code === err.MEDIA_ERR_ABORTED) return;
    const srcWasLocal = !!(audio.src && (audio.src.startsWith('blob:') || audio.src.includes('/__dl/')));
    dbg('AUDIO_ERR', `code=${err.code} t=${(audio.currentTime || 0).toFixed(1)} src=${srcWasLocal ? 'local' : 'stream'} ${(err.message || '')}`);
    const haveBank = !!(curLoad && !srcWasLocal && d.hasLocal(curLoad.idx));
    const retryable = (err.code === err.MEDIA_ERR_NETWORK)
      || (!srcWasLocal && err.code === err.MEDIA_ERR_SRC_NOT_SUPPORTED);
    if (curLoad && (haveBank || (retryable && loadRetry < MAX_LOAD_RETRY))) {
      const at = Math.max(audio.currentTime || 0, curLoad.seekSec || 0);   // resume where we were
      const wasPlaying = !audio.paused || curLoad.autoplay;
      const reprobe = !haveBank && !srcWasLocal;   // re-resolve a fresh base only for a stream retry
      let delay;
      if (haveBank) { delay = 0; d.toast('Playing from downloaded copy'); }
      else { loadRetry++; delay = Math.min(1000 * 2 ** (loadRetry - 1), 8000); d.toast(`Connection hiccup — retrying… (${loadRetry}/${MAX_LOAD_RETRY})`); }
      // Capture what this retry belongs to. A stream retry awaits a reprobe (seconds
      // on a slow relay); during it the user can pick another chapter/book (bumps
      // loadGen) OR seek/skip/Prev/grab a peer (bumps intentGen). Guard on BOTH.
      const retryGen = d.getLoadGen(), retryIntent = intentGen, retryIdx = curLoad.idx;
      cancelRetry();
      loadRetryTimer = setTimeout(() => {
        loadRetryTimer = null;
        const go = () => {
          if (!d.getCtx() || !PBLogic.retryStillCurrent(retryGen, d.getLoadGen(), retryIntent, intentGen)) return;   // superseded
          dbg('PLAY', `retrying load idx=${retryIdx} at=${at.toFixed(1)}s (attempt ${loadRetry}/${MAX_LOAD_RETRY}${haveBank ? ', from bank' : reprobe ? ', fresh base' : ''})`);
          d.loadTrack(retryIdx, at, wasPlaying);
        };
        // Re-resolve the connection before a stream retry (the stale base was the
        // likely cause). connect() short-circuits on a good base; on failure we still
        // retry (bounded) from cache.
        if (reprobe && d.resetConn) { d.resetConn(); Promise.resolve(d.connect && d.connect()).catch(() => {}).then(go); }
        else go();
      }, delay);
      return;
    }
    d.toast('Playback error — could not load audio.');
  }

  // ---- iOS lock-screen resume WEDGE watchdog ---------------------------------
  // Confirmed on device + WebKit #198277 / Apple DevForums 762582: after a lock-
  // screen pause→play the element fires `play`+`playing` but the clock NEVER
  // advances (iOS won't reactivate a backgrounded, previously-paused WebView audio
  // session until foreground). NOT web-fixable. While HIDDEN a reload is useless +
  // harmful (it just discards the element and stalls a second op until foreground),
  // so we defer; a FRESH LOAD does play once foreground, so onVisible() recovers the
  // instant the user unlocks. A rare FOREGROUND wedge is reloaded in place, capped.
  function onPlaying() {
    const audio = d.audio;
    clearTimeout(wedgeTimer);
    if (audio.paused || !d.getCtx()) return;
    const t0 = audio.currentTime || 0;
    // Bind this watch to the load + intent it was armed under. A backward seek,
    // skip, chapter change, or peer adoption during the 1.4s window leaves the clock
    // legitimately AT/BELOW t0 (looks "frozen") with t0 now stale — so a superseded
    // watch must NOT diagnose a wedge or reload t0. intentGen catches seeks/adopts;
    // loadGen (bumped by every startTrack — rollToTrack, auto-advance, adopt-reload)
    // catches chapter/book changes that don't go through noteIntent.
    const wLoad = d.getLoadGen(), wIntent = intentGen;
    wedgeTimer = setTimeout(() => {
      wedgeTimer = null;
      const ctx = d.getCtx();
      if (audio.paused || !ctx) return;                              // paused/torn down → not wedged
      if (!PBLogic.retryStillCurrent(wLoad, d.getLoadGen(), wIntent, intentGen)) return;   // a newer seek/skip/load superseded this watch
      if ((audio.currentTime || 0) - t0 > 0.05) { wedgeReloads = 0; return; }   // advanced → healthy
      if (forwardBufferedSec() < 2) return;                          // no forward data → real starvation, not a wedge
      if (d.hidden()) {
        bgResumePending = { idx: ctx.idx, position: t0, load: wLoad, intent: wIntent };
        dbg('PLAY', `WEDGE hidden at ${t0.toFixed(1)}s — deferring recovery until foreground (iOS bg audio-session limit)`);
        return;
      }
      if (wedgeReloads >= MAX_WEDGE_RELOADS) { dbg('PLAY', `WEDGE still frozen (foreground) at ${t0.toFixed(1)}s after ${wedgeReloads} reloads — giving up`); return; }
      wedgeReloads++;
      dbg('PLAY', `WEDGE foreground frozen at ${t0.toFixed(1)}s — reloading (attempt ${wedgeReloads})`);
      d.loadTrack(ctx.idx, t0, true);
    }, WEDGE_CHECK_MS);
  }
  function onPause() { bgResumePending = null; }   // a deliberate pause cancels a pending resume
  function onVisible() {
    const ctx = d.getCtx();
    if (bgResumePending && ctx) {
      const p = bgResumePending; bgResumePending = null; wedgeReloads = 0;
      // A skip/seek/chapter-change while still locked (a lock-screen control, or a
      // natural chapter roll) supersedes the deferred recovery — reloading the OLD
      // chapter/position would undo it. (noteIntent already drops it on a seek/adopt;
      // this catches a startTrack-only path that bumped loadGen without noteIntent.)
      if (!PBLogic.retryStillCurrent(p.load, d.getLoadGen(), p.intent, intentGen)) {
        dbg('PLAY', `WEDGE recovery superseded (newer load/seek) — skipping stale reload of idx=${p.idx}`);
        return;
      }
      dbg('PLAY', `WEDGE foreground recovery — reloading idx=${p.idx} at ${p.position.toFixed(1)}s`);
      d.loadTrack(p.idx, p.position, true);
    }
  }

  return {
    init, noteIntent, cancelRetry, resetRetry, onError, onPlaying, onPause, onVisible,
    // Test-only: drive the state machine + inspect its private state (like Banking._test).
    _test: {
      intentGen: () => intentGen, loadRetry: () => loadRetry, pendingRetry: () => !!loadRetryTimer,
      bgResumePending: () => bgResumePending, wedgeReloads: () => wedgeReloads,
      reset() { intentGen = 0; loadRetry = 0; clearTimeout(loadRetryTimer); loadRetryTimer = null; clearTimeout(wedgeTimer); wedgeTimer = null; bgResumePending = null; wedgeReloads = 0; },
    },
  };
})();

if (typeof window !== 'undefined') window.Playback = Playback;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Playback;
