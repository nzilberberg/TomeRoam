// Tests for js/banking.js — the prefetch/buffering scheduler's RETRY state machine.
// The pure backoff math lives in logic.test.js; this drives the module with fake
// deps to prove the immediate-retry loop is gone (a non-oversize failure used to
// re-select the SAME chapter instantly and hammer the relay-only Plex forever):
// a network failure backs off instead of re-fetching, an abort is neutral, a 4xx
// is a permanent skip, success clears state, a book change clears state, and one
// failed chapter does not block a later eligible one.
const { test, afterEach } = require('node:test');
const assert = require('node:assert');

global.window = global.window || {};
global.PBLogic = require('../js/logic.js');
global.window.PBLogic = global.PBLogic;
global.navigator = global.navigator || {};                 // banking reads navigator.serviceWorker (undefined = no SW, fine)
if (!global.URL) global.URL = {};
global.URL.createObjectURL = () => 'blob:x';   // force-stub: node's real one rejects the fake blob below
global.URL.revokeObjectURL = () => {};

const Banking = require('../js/banking.js');

// ---- controllable fake environment -----------------------------------------
let fetchCalls;                 // [{url, idx}]
let fetchImpl;                  // async (url, opts) => {blob,bytes,total} | throws
const track = (i) => ({ ratingKey: 'r' + i, partKey: 'p' + i, durationMs: 60000 });
const ctx = { book: 'bookA', idx: 0, tracks: [track(0), track(1), track(2), track(3), track(4)] };
const noStyle = { style: { setProperty() {} } };
const AHEAD = { bufferCurrent: false, bufferAhead: true };   // prefetch idx1,idx2,… from a fixed ctx.idx=0

function setup(settings) {
  fetchCalls = [];
  fetchImpl = async () => { throw new Error('net'); };       // default: bare network failure
  global.window.Downloads = {
    isDownloaded: () => false,
    bufMaxBytes: () => 512 * 1024 * 1024,
    bufferedSize: () => 0,
    trackBuffered: () => false,
    dropBuffered: () => {},
    bufferTrack: async () => true,
    fetchAudioBlob: (url, opts) => { fetchCalls.push({ url, idx: Number(String(url).replace(/\D/g, '')) }); return fetchImpl(url, opts); },
  };
  global.Downloads = global.window.Downloads;   // banking uses `window.Downloads &&` then bare `Downloads.x` (same object in a browser)
  Banking.init({
    getCtx: () => ctx, getCurLoad: () => null,
    audio: { paused: true, readyState: 4, duration: 100, currentTime: 0, buffered: { length: 0 } },
    Settings: settings, byId: () => noStyle,
    updateFileRows() {}, startTrack() {}, toast() {},
    locallyStored: () => false, Plex: { streamUrl: (pk) => 'http://x/' + pk },
  });
  Banking.ensureBook(ctx.book);   // set bankBook + clear leftover state between tests
}
const flush = () => new Promise((r) => setTimeout(r, 0));   // let bankOne's async body settle (microtasks drain first)

afterEach(() => { Banking.clear(); });   // cancel any pending repump timer so node:test doesn't hang

test('a network-failed chapter records a backoff entry and is NOT immediately re-fetched', async () => {
  setup(AHEAD);
  Banking.pump();
  await flush();
  assert.equal(fetchCalls.length, 1, 'exactly one fetch attempt');
  assert.equal(fetchCalls[0].idx, 1, 'the nearest ahead chapter');
  assert.ok(Banking._test.retry.has(1), 'the failure recorded a retry entry');
  await flush();
  assert.equal(fetchCalls.length, 1, 'no immediate second fetch of the same chapter (the old hammer loop)');
});

test('one failed chapter does not block a later eligible one — nextToBank skips the cooling chapter', () => {
  setup(AHEAD);
  Banking._test.retry.set(1, { attempts: 1, nextAtMs: Date.now() + 60000 });   // idx1 cooling
  assert.equal(Banking._test.nextToBank(), 2, 'picks the next eligible chapter instead of stalling');
});

test('an abort is neutral — neither a retry entry nor a skip', async () => {
  setup(AHEAD);
  fetchImpl = async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; };
  Banking.pump();
  await flush();
  assert.ok(!Banking._test.retry.has(1), 'abort is not a failure');
  assert.ok(!Banking._test.skipBank.has(1), 'abort does not skip the chapter');
});

test('a 4xx is a permanent session skip (skipBank), not a backoff', async () => {
  setup(AHEAD);
  fetchImpl = async () => { const e = new Error('HTTP 404'); e.kind = 'http'; e.status = 404; e.retryable = false; throw e; };
  Banking.pump();
  await flush();
  assert.ok(Banking._test.skipBank.has(1), 'non-retryable HTTP → skip for the session');
  assert.ok(!Banking._test.retry.has(1), 'no backoff for a permanent failure');
});

test('a 5xx backs off (retryable), it does not permanently skip', async () => {
  setup(AHEAD);
  fetchImpl = async () => { const e = new Error('HTTP 503'); e.kind = 'http'; e.status = 503; e.retryable = true; throw e; };
  Banking.pump();
  await flush();
  assert.ok(Banking._test.retry.has(1), '5xx → backoff');
  assert.ok(!Banking._test.skipBank.has(1), '5xx is not a permanent skip');
});

test('a successful bank clears a prior retry entry for that chapter', async () => {
  setup(AHEAD);
  Banking._test.retry.set(1, { attempts: 2, nextAtMs: Date.now() - 1 });   // due now
  fetchImpl = async () => ({ blob: { size: 1000 }, bytes: 1000, total: 1000 });
  Banking.pump();
  await flush();
  assert.ok(!Banking._test.retry.has(1), 'success cleared the retry entry');
  assert.ok(Banking._test.banks.has(1), 'the chapter is banked');
});

test('a book change clears all retry state', () => {
  setup(AHEAD);
  Banking._test.retry.set(1, { attempts: 1, nextAtMs: Date.now() + 60000 });
  Banking.ensureBook('bookB');
  assert.equal(Banking._test.retry.size, 0, 'idx-keyed backoff is irrelevant after a book change');
});
