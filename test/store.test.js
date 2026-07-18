// Tests for js/store.js — specifically the localStorage MIRROR, the fix that lets
// offline content render even when IndexedDB is unavailable (as it is here: node
// has no indexedDB, so Store.available is false and every read falls through to
// the mirror — exactly the iOS-PWA failure mode we hardened against).
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

function memLS() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    // Real Web Storage exposes length + key(i); clearCache enumerates them to find
    // the per-book pb_cache_tr_*/pb_cache_alb_* mirrors, so the shim must too.
    get length() { return m.size; },
    key: (i) => Array.from(m.keys())[i] ?? null,
  };
}
global.localStorage = memLS();
global.window = { localStorage: global.localStorage };   // dbg() guards on window.PBDebug
const Store = require('../js/store.js');

beforeEach(() => global.localStorage.clear());

test('Store.available is false without IndexedDB (mirror path is what we test)', () => {
  assert.equal(Store.available, false);
});

test('cacheBooks writes a localStorage mirror and cachedBooks reads it back', async () => {
  const books = [
    { ratingKey: '8385', title: 'Fairy Tale', lastViewedAt: 5, addedAt: 1 },
    { ratingKey: '8696', title: 'Spy', lastViewedAt: 0, addedAt: 2 },
  ];
  await Store.cacheBooks(books);
  assert.ok(global.localStorage.getItem('pb_cache_books'), 'mirror key was written');
  const got = await Store.cachedBooks();
  assert.equal(got.length, 2);
  assert.equal(got[0].title, 'Fairy Tale');
});

test('cachedBooks returns [] when nothing has been cached', async () => {
  assert.deepEqual(await Store.cachedBooks(), []);
});

test('authors mirror round-trips', async () => {
  await Store.cacheAuthors([{ ratingKey: '1', title: 'King' }]);
  const a = await Store.cachedAuthors();
  assert.equal(a.length, 1);
  assert.equal(a[0].title, 'King');
});

test('tracks mirror round-trips per book; unknown book returns null', async () => {
  await Store.cacheTracks('8385', [{ ratingKey: 't1' }, { ratingKey: 't2' }]);
  const t = await Store.cachedTracks('8385');
  assert.equal(t.length, 2);
  assert.equal(await Store.cachedTracks('nope'), null);
});

test('album mirror round-trips', async () => {
  await Store.cacheAlbum({ ratingKey: '8385', title: 'Fairy Tale' });
  const alb = await Store.cachedAlbum('8385');
  assert.ok(alb);
  assert.equal(alb.title, 'Fairy Tale');
});

test('syncedAt falls back to the mirror stamp when IDB has none', async () => {
  const before = Date.now();
  await Store.cacheBooks([{ ratingKey: '1' }]);
  const ts = await Store.syncedAt('books');
  assert.ok(ts >= before, 'a fresh sync timestamp was recorded in the mirror');
});

// The "Clear + reload didn't clear" bug: clearing only IDB left the localStorage
// mirror, so offline reads (which fall back to it) still rendered the full library.
// Here IDB is unavailable, so the mirror IS the only cache — clearCache must empty
// it. Fails against an IDB-only clear (cachedBooks would still return the mirror).
test('clearCache empties every metadata mirror so offline reads go empty', async () => {
  await Store.cacheBooks([{ ratingKey: '8385', title: 'Fairy Tale' }, { ratingKey: '8696', title: 'Spy' }]);
  await Store.cacheAuthors([{ ratingKey: '1', title: 'King' }]);
  await Store.cacheTracks('8385', [{ ratingKey: 't1' }]);
  await Store.cacheAlbum({ ratingKey: '8385', title: 'Fairy Tale' });
  // sanity: everything is cached before the clear
  assert.equal((await Store.cachedBooks()).length, 2);
  assert.equal((await Store.cachedTracks('8385')).length, 1);

  await Store.clearCache();

  assert.deepEqual(await Store.cachedBooks(), [], 'books mirror cleared');
  assert.deepEqual(await Store.cachedAuthors(), [], 'authors mirror cleared');
  assert.equal(await Store.cachedTracks('8385'), null, 'per-book tracks mirror cleared');
  assert.equal(await Store.cachedAlbum('8385'), null, 'per-book album mirror cleared');
  assert.equal(global.localStorage.getItem('pb_cache_books'), null, 'raw books key gone');
  assert.equal(global.localStorage.getItem('pb_cache_tr_8385'), null, 'raw tracks key gone');
  assert.equal(global.localStorage.getItem('pb_cache_alb_8385'), null, 'raw album key gone');
});
