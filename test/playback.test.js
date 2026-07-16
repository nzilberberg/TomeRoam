// Playback (js/playback.js) — the retry / intent / wedge state machine that every
// .88–.99 review finding lived in, now driven with fake audio + mock timers +
// deferred promises. These are the exact races that used to be untestable inside
// the app.js IIFE: retry-vs-seek, retry-vs-new-load, retry-vs-supersede, the
// haveBank fast path, non-retryable errors, and the iOS lock-screen wedge (defer
// while hidden, recover on foreground).
const { test } = require('node:test');
const assert = require('node:assert');
global.PBLogic = require('../js/logic.js');
const Playback = require('../js/playback.js');

// ---- controllable world -----------------------------------------------------
function world(over = {}) {
  const w = {
    loadGen: 5, hidden: false,
    ctx: { idx: 2, book: 'b', tracks: [{}, {}, {}, {}, {}] },
    curLoad: { idx: 2, seekSec: 40, autoplay: true },
    audio: { currentTime: 50, paused: false, src: 'http://plex/stream', error: null,
      buffered: { length: 1, start: () => 0, end: () => 100000 } },
    hasLocalSet: new Set(),          // idxs that have a local copy (haveBank)
    connect: () => Promise.resolve('http://base'),
    loads: [], toasts: [], resets: 0,
    ...over,
  };
  Playback._test.reset();   // module is a singleton — clear state between tests
  Playback.init({
    audio: w.audio,
    getCtx: () => w.ctx, getCurLoad: () => w.curLoad, getLoadGen: () => w.loadGen,
    loadTrack: (idx, at, autoplay) => w.loads.push({ idx, at, autoplay }),
    hasLocal: (idx) => w.hasLocalSet.has(idx),
    connect: w.connect, resetConn: () => { w.resets++; },
    toast: (m) => w.toasts.push(m), hidden: () => w.hidden,
  });
  return w;
}
const ERR = (code) => ({ code, MEDIA_ERR_ABORTED: 1, MEDIA_ERR_NETWORK: 2, MEDIA_ERR_DECODE: 3, MEDIA_ERR_SRC_NOT_SUPPORTED: 4 });
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

// ---- stream-error retry -----------------------------------------------------
test('a retryable stream error (code 4) re-probes a fresh base then reloads the SAME spot', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world(); w.audio.error = ERR(4);      // SRC_NOT_SUPPORTED, stream src
  Playback.onError();
  assert.equal(w.loads.length, 0, 'retry is deferred (backoff), not immediate');
  assert.ok(Playback._test.pendingRetry(), 'a retry is scheduled');
  t.mock.timers.tick(1000);                        // first backoff
  await flush();
  assert.equal(w.resets, 1, 're-resolved the connection before retrying');
  assert.deepEqual(w.loads, [{ idx: 2, at: 50, autoplay: true }], 'reloaded the reached spot');
});

test('retry-vs-SEEK: an explicit action during the reprobe cancels the stale retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world(); w.audio.error = ERR(2);
  Playback.onError();
  Playback.noteIntent();                           // user scrubbed while the retry was pending
  t.mock.timers.tick(2000); await flush();
  assert.equal(w.loads.length, 0, 'the stale retry did NOT yank playback back');
});

test('retry-vs-NEW-LOAD: a startTrack (loadGen bump) during the reprobe supersedes the retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world(); w.audio.error = ERR(2);
  Playback.onError();
  w.loadGen = 6;                                   // a newer startTrack happened
  t.mock.timers.tick(2000); await flush();
  assert.equal(w.loads.length, 0, 'superseded by a newer load → dropped');
});

test('haveBank error recovers immediately from the local copy (delay 0, no reprobe)', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world(); w.audio.error = ERR(2); w.hasLocalSet.add(2);
  Playback.onError();
  t.mock.timers.tick(10); await flush();
  assert.equal(w.resets, 0, 'no connection re-probe when a local copy exists');
  assert.deepEqual(w.loads, [{ idx: 2, at: 50, autoplay: true }]);
  assert.ok(w.toasts.some((x) => /downloaded copy/.test(x)));
});

test('a local-src error is NOT retried as a stream (no bank → give up)', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world({ audio: { currentTime: 50, paused: false, src: './__dl/track', error: ERR(4), buffered: { length: 0 } } });
  Playback.onError();
  t.mock.timers.tick(9000); await flush();
  assert.equal(w.loads.length, 0);
  assert.ok(w.toasts.some((x) => /Playback error/.test(x)));
});

test('MEDIA_ERR_ABORTED (deliberate src swap) is ignored', () => {
  const w = world(); w.audio.error = ERR(1);
  Playback.onError();
  assert.equal(Playback._test.pendingRetry(), false);
  assert.equal(w.loads.length, 0);
});

// ---- iOS lock-screen wedge --------------------------------------------------
test('wedge while HIDDEN defers (no reload) and recovers on foreground', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world({ hidden: true });
  Playback.onPlaying();
  t.mock.timers.tick(1400);                        // clock still frozen (currentTime unchanged), buffer present
  assert.equal(w.loads.length, 0, 'NO reload while hidden — a reload just thrashes the element');
  assert.ok(Playback._test.bgResumePending(), 'a foreground recovery was recorded');
  w.hidden = false;
  Playback.onVisible();
  assert.deepEqual(w.loads, [{ idx: 2, at: 50, autoplay: true }], 'reloaded the frozen spot on unlock');
  assert.equal(Playback._test.bgResumePending(), null, 'pending cleared after recovery');
});

test('a user pause clears a pending foreground recovery', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world({ hidden: true });
  Playback.onPlaying(); t.mock.timers.tick(1400);
  assert.ok(Playback._test.bgResumePending());
  Playback.onPause();
  assert.equal(Playback._test.bgResumePending(), null);
  Playback.onVisible();
  assert.equal(w.loads.length, 0, 'no forced play over a deliberate pause');
});

test('a HEALTHY playing (clock advances) is not treated as a wedge', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world();
  Playback.onPlaying();
  w.audio.currentTime = 52;                         // advanced during the window
  t.mock.timers.tick(1400);
  assert.equal(w.loads.length, 0);
  assert.equal(Playback._test.bgResumePending(), null);
});

test('a foreground wedge reloads in place, capped so it cannot loop', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world({ hidden: false });
  Playback.onPlaying(); t.mock.timers.tick(1400);   // frozen, foreground → reload 1
  Playback.onPlaying(); t.mock.timers.tick(1400);   // still frozen → reload 2
  Playback.onPlaying(); t.mock.timers.tick(1400);   // cap reached → give up
  assert.equal(w.loads.length, 2, 'exactly MAX_WEDGE_RELOADS reloads, then it stops');
});

test('genuine buffer STARVATION (no forward data) is left to stall recovery, not the wedge', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = world({ audio: { currentTime: 50, paused: false, src: 'http://plex/stream', error: null, buffered: { length: 0 } } });
  Playback.onPlaying(); t.mock.timers.tick(1400);
  assert.equal(w.loads.length, 0);
  assert.equal(Playback._test.bgResumePending(), null);
});
