// Store tests against a REAL (spec-compliant, in-memory) IndexedDB via
// fake-indexeddb. store.test.js can only exercise the localStorage mirror
// because Node has no IndexedDB — which is exactly why the get()-returns-raw-
// IDBRequest bug lived in the IDB path, unreachable by the suite. With a fake
// IDB we can finally test that path directly.
require('fake-indexeddb/auto');   // MUST precede store.js (its `available` is captured at load)
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

function memLS() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
}
global.localStorage = memLS();
global.navigator = {};
global.window = { localStorage: global.localStorage };
const Store = require('../js/store.js');

beforeEach(async () => {
  for (const s of ['books', 'authors', 'albums', 'audio', 'dl', 'buf', 'tracks', 'kv']) await Store.clear(s);
  global.localStorage.clear();
});

test('IndexedDB is actually present here (the path store.test.js cannot reach)', () => {
  assert.equal(Store.available, true);
});

test('get() on a MISSING key resolves undefined — not a raw IDBRequest (the .8 bug)', async () => {
  const r = await Store.get('albums', 'does-not-exist');
  assert.equal(r, undefined, 'a miss must resolve undefined, not a truthy IDBRequest');
});

test('cachedAlbum returns null on a miss and falls through to the mirror', async () => {
  assert.equal(await Store.cachedAlbum('nope'), null, 'IDB miss must not leak a bogus album object');
  await Store.cacheAlbum({ ratingKey: '8385', title: 'Fairy Tale' });
  const alb = await Store.cachedAlbum('8385');
  assert.ok(alb && alb.title === 'Fairy Tale', 'round-trips through the real IDB path');
});

test('books round-trip through IndexedDB (not just the ls mirror)', async () => {
  await Store.cacheBooks([{ ratingKey: '1', title: 'A' }, { ratingKey: '2', title: 'B' }]);
  assert.equal(await Store.count('books'), 2, 'rows landed in IDB');
  const got = await Store.cachedBooks();
  assert.equal(got.length, 2);
});

test('replaceAll clears then repopulates a collection in one shot', async () => {
  await Store.replaceAll('authors', [{ ratingKey: 'a', title: 'King' }]);
  assert.equal(await Store.count('authors'), 1);
  await Store.replaceAll('authors', [{ ratingKey: 'b', title: 'Le Guin' }, { ratingKey: 'c', title: 'Butler' }]);
  assert.equal(await Store.count('authors'), 2, 'old rows were cleared, new ones written');
});

test('mutations report explicit success — put/del/clear resolve TRUE when they complete', async () => {
  // The finding-#1 contract: a completed write resolves true (not the record key,
  // not undefined), so persist callers can branch on it. Reads stay best-effort.
  assert.equal(await Store.put('kv', { k: 'x', v: 1 }), true, 'a completed put resolves true');
  assert.equal(await Store.del('kv', 'x'), true, 'a completed delete resolves true (even though the key is gone)');
  assert.equal(await Store.del('kv', 'not-there'), true, 'deleting a missing key still completes → true');
  assert.equal(await Store.putAudio('ct1', 'bk', new Blob([new Uint8Array(8)]), 'buffer'), true, 'putAudio reports success');
  assert.equal(await Store.delAudio('ct1'), true, 'delAudio reports success');
  assert.equal(await Store.clear('audio'), true, 'clear reports success');
});

test('audioKeys reflects stored blobs and powers orphan detection', async () => {
  const blob = new Blob([new Uint8Array(16)], { type: 'audio/mpeg' });
  await Store.putAudio('t1', 'bookA', blob, 'download');
  await Store.putAudio('t2', 'bookA', blob, 'buffer');
  await Store.putDl({ book: 'bookA', tracks: ['t1'], size: 16, ts: 1 });   // t1 referenced; t2 is a buffer/orphan candidate
  const keys = (await Store.audioKeys()).sort();
  assert.deepEqual(keys, ['t1', 't2']);
  const dlRefs = new Set((await Store.allDl()).flatMap((r) => r.tracks.map(String)));
  const notInDl = keys.filter((k) => !dlRefs.has(k));
  assert.deepEqual(notInDl, ['t2'], 'audioKeys minus the dl index = candidates needing a buf ref');
});
