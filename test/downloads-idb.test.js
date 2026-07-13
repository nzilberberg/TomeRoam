// Downloads LIFECYCLE invariants against a real (fake-indexeddb) IDB + a stubbed
// fetch/Plex. downloads.test.js covers only the pure kernels (decideStart/capFits/
// frac/evictionPlan); the orphan-leak, byte-accounting, and AbortError-mislabel
// bugs from the .15 sweep all lived in pump()/remove()/init() — the glue — and are
// stated here as invariants:
//   * no audio row is ever referenced by NEITHER the dl nor the buf index (leak);
//   * usedBytes == Σ dl sizes and bufBytes == Σ buf sizes (accounting drift);
//   * a cancel ends in status 'none', never 'error' (AbortError mislabel);
//   * init() sweeps orphaned audio rows.
require('fake-indexeddb/auto');
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// --- environment: Store (real fake-IDB), a controllable fetch, a stub Plex. -----
global.localStorage = (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() }; })();
global.navigator = {};                       // no connection API → unmetered() null → downloads start
global.window = { localStorage: global.localStorage, addEventListener() {} };
const Store = require('../js/store.js');
global.Store = Store; global.window.Store = Store;

// Controllable fetch: default success returns a Blob of `size` bytes; a test can
// swap in a rejecting impl to exercise abort/error paths.
const okBlob = (size) => ({ ok: true, headers: { get: () => null }, body: null, blob: async () => new Blob([new Uint8Array(size)], { type: 'audio/mpeg' }) });
let fetchImpl = async (url) => okBlob(sizeForUrl(url));
const sizes = {};                            // partKey -> byte size
function sizeForUrl(url) { const pk = String(url).split('/').pop(); return sizes[pk] || 1000; }
global.fetch = (url, opts) => fetchImpl(url, opts);

const Plex = { getAlbumTracks: async () => [], streamUrl: (partKey) => 'http://plex/' + partKey };
global.Plex = Plex; global.window.Plex = Plex;

const Downloads = require('../js/downloads.js');

// Wait until a predicate holds (download loop is async + self-recursive).
async function until(pred, ms = 2000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await pred()) return; await new Promise((r) => setTimeout(r, 5)); }
  throw new Error('timeout waiting for condition');
}
const book = (id, tracks) => ({ title: 'Book ' + id, author: 'Auth', tracks });
const trk = (id, size) => { sizes['p' + id] = size; return { ratingKey: id, partKey: 'p' + id, size }; };

// The core invariant: every stored audio blob is referenced by an index.
async function assertNoOrphans() {
  const dlRefs = new Set((await Store.allDl()).flatMap((r) => (r.tracks || []).map(String)));
  const bufRefs = new Set((await Store.allBuf()).map((r) => String(r.track)));
  const orphans = (await Store.audioKeys()).filter((k) => !dlRefs.has(k) && !bufRefs.has(k));
  assert.deepEqual(orphans, [], 'no audio row may be unreferenced by both indexes');
}
async function sumDlSizes() { return (await Store.allDl()).reduce((n, r) => n + (r.size || 0), 0); }

beforeEach(() => { fetchImpl = async (url) => okBlob(sizeForUrl(url)); });

test('a full download builds a correct dl index, correct accounting, and no orphans', async () => {
  Downloads.start('bkA', book('A', [trk('a1', 1000), trk('a2', 2000)]));
  await until(async () => Downloads.stateOf('bkA').status === 'done');

  const rec = await Store.getDl('bkA');
  assert.ok(rec, 'a dl index record was written');
  assert.deepEqual(rec.tracks.map(String), ['a1', 'a2']);
  assert.equal(rec.size, 3000, 'index size = Σ track bytes');
  assert.equal(Downloads.trackDownloaded('a1'), true);

  const info = await Downloads.storageInfo();
  assert.equal(info.used, await sumDlSizes(), 'usedBytes stays equal to Σ dl sizes');
  await assertNoOrphans();
});

test('remove() deletes the blobs + index and restores the accounting', async () => {
  const before = (await Downloads.storageInfo()).used;
  await Downloads.remove('bkA');
  assert.equal(Downloads.stateOf('bkA').status, 'none');
  assert.equal(await Store.getDl('bkA'), undefined, 'index gone');
  assert.equal(await Store.get('audio', 'a1'), undefined, 'blob gone');
  const after = (await Downloads.storageInfo()).used;
  assert.equal(after, before - 3000, 'usedBytes dropped by exactly the removed size');
  assert.equal(after, await sumDlSizes());
  await assertNoOrphans();
});

test('an aborted download ends in status "none", never "error" (AbortError mislabel)', async () => {
  fetchImpl = async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; };
  Downloads.start('bkC', book('C', [trk('c1', 1000)]));
  await until(async () => Downloads.stateOf('bkC').status === 'none');
  assert.equal(Downloads.stateOf('bkC').status, 'none', 'a cancel is not an error');
  await assertNoOrphans();
});

test('a genuine network failure ends in status "error" with a message', async () => {
  fetchImpl = async () => { throw new Error('network boom'); };
  Downloads.start('bkD', book('D', [trk('d1', 1000)]));
  await until(async () => Downloads.stateOf('bkD').status === 'error');
  assert.match(Downloads.stateOf('bkD').error || '', /boom|HTTP|failed/);
});

test('bufferTrack persists a blob, marks it local, and keeps bufBytes == Σ buf sizes', async () => {
  const blob = new Blob([new Uint8Array(4000)], { type: 'audio/mpeg' });
  const ok = await Downloads.bufferTrack('bkE', 'e1', blob);
  assert.equal(ok, true);
  assert.equal(Downloads.trackLocal('e1'), true, 'buffered track is playable offline');
  assert.equal(Downloads.trackBuffered('e1'), true);
  const bufSum = (await Store.allBuf()).reduce((n, r) => n + (r.size || 0), 0);
  assert.equal(Downloads.bufferUsage(), bufSum, 'bufBytes tracks the persisted buffer index');
  await assertNoOrphans();
});

test('init() sweeps an orphaned audio row (referenced by neither index)', async () => {
  const blob = new Blob([new Uint8Array(500)], { type: 'audio/mpeg' });
  await Store.putAudio('orphan-x', 'bkGone', blob, 'download');   // no dl/buf record → a leak
  assert.ok((await Store.audioKeys()).includes('orphan-x'));
  await Downloads.init({});                    // restore + orphan sweep
  await until(async () => !(await Store.audioKeys()).includes('orphan-x'));
  assert.ok(!(await Store.audioKeys()).includes('orphan-x'), 'the orphan was reclaimed');
  await assertNoOrphans();
});
