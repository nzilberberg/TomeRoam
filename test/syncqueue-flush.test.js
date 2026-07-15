// CONTRACT test for SyncQueue.flush — the orchestration wrapper, not just the
// pure decide() kernel (which syncqueue.test.js already covers). The .8 bug
// lived exactly here: writeTimeline resolves FALSE on failure (it never throws),
// but flush treated any resolve as success and DELETED the item → queued resume
// progress silently lost. The rule this locks in: for every tested pure kernel,
// one test must drive the shipped wrapper that uses it, against fakes.
//
// We inject a fake in-memory Store + a Plex whose writeTimeline we control, then
// call the REAL SyncQueue.flush() and assert the queue's contents afterward.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

const NOW = 1_000_000_000_000;
let writeResult = true;            // what Plex.writeTimeline resolves to this test

// Fake Store: enough of the IndexedDB-backed API for the queue (available flag,
// getAll/put/del/clear/diagSet). Keyed by store name → Map(id → record).
function makeStore() {
  const data = {};
  const map = (s) => (data[s] || (data[s] = new Map()));
  return {
    available: true,
    async getAll(s) { return [...map(s).values()]; },
    async put(s, v) { map(s).set(v.id, v); },
    async del(s, k) { map(s).delete(k); },
    async clear(s) { map(s).clear(); },
    diagSet() {},
    _rows: (s) => map(s),
  };
}
const store = makeStore();

const Plex = { isSignedIn: () => true, writeTimeline: async () => writeResult, serverNow: () => NOW };
const Progress = { trackRecord: () => null, bookRecord: () => null, refresh: async () => {} };
global.window = { Store: store, Plex, Progress };
// syncqueue.js reads these as BARE globals (window===global in a browser), so the
// fakes must live on global too, not only on window.
global.Store = store;
global.Plex = Plex;
global.Progress = Progress;
const SyncQueue = require('../js/syncqueue.js');

const progressItem = (overrides = {}) => ({
  type: 'progress', bookKey: 'b1', ratingKey: 't1',
  positionMs: 600_000, durationMs: 3_600_000, ...overrides,
});

beforeEach(async () => { store._rows('sync').clear(); writeResult = true; });

test('a failed writeTimeline (resolves false) KEEPS the item — never silently drops progress', async () => {
  writeResult = false;
  await SyncQueue.enqueue(progressItem());
  assert.equal(await SyncQueue.count(), 1, 'enqueued');

  const res = await SyncQueue.flush();
  assert.equal(res.written, 0, 'nothing was written');
  assert.equal(res.failed, 1, 'the write was recorded as a failure');
  assert.equal(await SyncQueue.count(), 1, 'the item SURVIVED the flush (this is the .8 regression)');

  const [item] = await SyncQueue.all();
  assert.equal(item.attemptCount, 1, 'attempt was counted for backoff');
  assert.equal(item.positionMs, 600_000, 'position preserved intact');
});

test('a successful writeTimeline removes the item and counts it written', async () => {
  writeResult = true;
  await SyncQueue.enqueue(progressItem());
  const res = await SyncQueue.flush();
  assert.equal(res.written, 1);
  assert.equal(await SyncQueue.count(), 0, 'synced item is cleared from the queue');
});

test('flush is a no-op (skipped) when Plex is signed out — item is retained', async () => {
  await SyncQueue.enqueue(progressItem());
  const prev = window.Plex.isSignedIn;
  window.Plex.isSignedIn = () => false;
  try {
    const res = await SyncQueue.flush();
    assert.equal(res.skipped, true);
    assert.equal(await SyncQueue.count(), 1, 'nothing lost while signed out');
  } finally { window.Plex.isSignedIn = prev; }
});

test('a retry after a failure succeeds and clears the item (backoff path)', async () => {
  writeResult = false;
  await SyncQueue.enqueue(progressItem());
  await SyncQueue.flush();                       // fails, item retained
  assert.equal(await SyncQueue.count(), 1);
  writeResult = true;
  const res = await SyncQueue.flush();            // Plex back → writes
  assert.equal(res.written, 1);
  assert.equal(await SyncQueue.count(), 0);
});

test('a write that keeps failing is GIVEN UP after maxWriteAttempts — no immortal "syncing" item', async () => {
  // A poison write (e.g. Plex 400s a bad ratingKey — an explicit near-zero reset
  // hit this) used to retry forever, pinning the pending counter across restarts.
  writeResult = false;
  const cap = SyncQueue.cfg().maxWriteAttempts;
  await SyncQueue.enqueue(progressItem());
  const [it] = await SyncQueue.all();            // seed it already at the attempt cap
  it.attemptCount = cap; it.lastError = 'HTTP 400';
  await store.put('sync', it);
  assert.equal(await SyncQueue.count(), 1);

  const res = await SyncQueue.flush();
  assert.equal(res.dropped, 1, 'the poison item was dropped');
  assert.equal(res.written, 0, 'and never written');
  assert.equal(await SyncQueue.count(), 0, 'the pending counter is no longer pinned');
});
