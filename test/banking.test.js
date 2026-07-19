// Tests for js/banking.js — the prefetch/buffering scheduler's RETRY state machine.
// The pure backoff math lives in logic.test.js; this drives the module with fake
// deps to prove the immediate-retry loop is gone (a non-oversize failure used to
// re-select the SAME chapter instantly and hammer Plex (potentially the slow relay) forever):
// a network failure backs off instead of re-fetching, an abort is neutral, a 4xx
// is skipped until reconnect, success clears state, a book change clears state, one
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

test('a non-retryable 4xx is skipped (until reconnect), not backed off', async () => {
  setup(AHEAD);
  fetchImpl = async () => { const e = new Error('HTTP 404'); e.kind = 'http'; e.status = 404; e.retryable = false; throw e; };
  Banking.pump();
  await flush();
  const skip = Banking._test.skipBank.get(1);
  assert.ok(skip && skip.reason === 'http', 'non-retryable HTTP → skip with reason=http (cleared on reconnect, see the onReconnect test)');
  assert.ok(!Banking._test.retry.has(1), 'no backoff entry for a non-retryable 4xx');
});

test('onReconnect clears an HTTP skip (stale auth / base-switch 404) but KEEPS an oversize skip', () => {
  setup(AHEAD);
  Banking._test.skipBank.set(1, { reason: 'oversize' });
  Banking._test.skipBank.set(2, { reason: 'http', status: 404 });
  Banking.onReconnect();
  assert.ok(Banking._test.skipBank.has(1), 'oversize stays skipped — the file is still too big regardless of connection');
  assert.ok(!Banking._test.skipBank.has(2), 'the HTTP skip is cleared so it gets a fresh attempt');
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

// `banks` is keyed by INDEX, so it is only valid while an index means the same
// track — and book identity does not guarantee that. restoreLastPlayed re-fetches
// the album and replaces ctx.tracks for the SAME book (app.js), and a Plex re-scan
// can reorder a list (plex.js sorts by `index`, which is 0 for untagged files, so
// ties fall back to server order). Same book + different list = every banked blob
// one slot off: the wrong-CHAPTER form of the .160 wrong-book bug.
//
// MUTATION: revert ensureBook to `if (bankBook !== book)` → RED.
test('ensureBook clears idx-keyed banks when the same book\'s track LIST changes', async () => {
  setup(AHEAD);
  Banking.ensureBook('bookA', 'r0,r1,r2');
  fetchImpl = async () => ({ blob: { size: 1000 }, bytes: 1000, total: 1000 });
  Banking.pump();
  await flush();
  assert.ok(Banking._test.banks.size > 0, 'precondition: something is banked against this list');
  Banking.ensureBook('bookA', 'r0,r2,r1');   // SAME book, reordered list
  assert.equal(Banking._test.banks.size, 0, 'idx-keyed banks cannot survive a different list');
});

// Control: an unchanged signature must NOT clear, or the test above would pass for
// the wrong reason (i.e. "always clear").
test('ensureBook keeps banks when the book AND the list are unchanged', async () => {
  setup(AHEAD);
  Banking.ensureBook('bookA', 'r0,r1,r2');
  fetchImpl = async () => ({ blob: { size: 1000 }, bytes: 1000, total: 1000 });
  Banking.pump();
  await flush();
  const before = Banking._test.banks.size;
  assert.ok(before > 0, 'precondition');
  Banking.ensureBook('bookA', 'r0,r1,r2');
  assert.equal(Banking._test.banks.size, before, 'an identical list is not a reason to discard work');
});

// The DISK write's book label was read AFTER the fetch await, so it recorded whatever
// book became current while the bytes were downloading — not the one the bank was
// issued for. No reader consumes that field today, so this was a latent trap plus a
// comment asserting the opposite of what the code did.
//
// MUTATION: pass the live `bankBook` to bufferTrack again → RED.
test('bufferTrack records the book the bank was ISSUED for, not the one current when it completed', async () => {
  setup(AHEAD);
  const bufferedFor = [];
  global.window.Downloads.bufferTrack = async (book) => { bufferedFor.push(book); return true; };
  // The window that matters is the FETCH, not the persist: bankBook is read on the
  // line right after the fetch await resolves. Switching the book during the persist
  // is too late to distinguish the two versions.
  let releaseFetch;
  fetchImpl = () => new Promise((r) => { releaseFetch = () => r({ blob: { size: 10 }, bytes: 10 }); });

  Banking.pump();
  await flush();
  assert.ok(releaseFetch, 'precondition: a fetch is in flight for bookA');
  Banking.ensureBook('bookB');     // the user opens another book mid-download
  releaseFetch();                  // the bytes land anyway (already past the abort point)
  await flush();

  assert.deepEqual(bufferedFor, ['bookA'], 'the row belongs to the book that issued the fetch');
});

// ---- ownership of `banks` across the bufferTrack await ----------------------
// clearBanks() (via ensureBook on a book change) aborts bankCtl and revokes every
// bank — but an in-flight bankOne that is already PAST its fetch, awaiting
// Downloads.bufferTrack, never sees that abort: the signal only rejects the fetch.
// Its `banks.set(idx, …)` afterwards therefore lands in the map that now belongs to
// the NEW book, and app.js:1048's bankedUrl(idx) will serve it — the OLD book's audio
// for the new book's chapter. The `finally` block's `bankCtl === ctl` guard correctly
// suppresses the pump restart, but by then the poisoned entry is already in.
test('a book change during bufferTrack does not put the old book\'s blob in the new book\'s banks', async () => {
  setup(AHEAD);
  let releaseBuffer;
  global.window.Downloads.bufferTrack = () => new Promise((r) => { releaseBuffer = r; });
  fetchImpl = async () => ({ blob: { size: 10 }, bytes: 10 });

  Banking.pump();                       // bankOne(1) → fetch resolves → awaits bufferTrack
  await flush();
  assert.equal(fetchCalls.length, 1, 'precondition: a bank is in flight for the OLD book');

  Banking.ensureBook('bookB');          // the user opens another book → clearBanks()
  releaseBuffer(false);                 // persist reports failure → the RAM-bank path runs
  await flush();

  assert.equal(Banking.bankedUrl(1), null,
    'a bank completed for the previous book must not be readable as the new book\'s chapter');
  assert.equal(Banking.count(), 0, 'and it must not be counted against the new book\'s budget');
});

// Control: without a book change the same sequence MUST still bank, or "never write"
// would pass the test above.
test('the same sequence with no book change does bank the chapter', async () => {
  setup(AHEAD);
  let releaseBuffer;
  global.window.Downloads.bufferTrack = () => new Promise((r) => { releaseBuffer = r; });
  fetchImpl = async () => ({ blob: { size: 10 }, bytes: 10 });

  Banking.pump();
  await flush();
  releaseBuffer(false);
  await flush();

  assert.ok(Banking.bankedUrl(1), 'the chapter is banked and readable');
});
