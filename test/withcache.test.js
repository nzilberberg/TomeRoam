// Regression: cache-first serving must NOT signal the network as "stale" when
// online. It used to call cacheHook.stale() on every cache-first read →
// Net.markCachedRead set plexReachable=false + kicked the retry poll → checkPlex
// flip-flopped false→true → a reconnect-pass storm (RECONNECT climbed 6→17, and
// every reconnect force-reloaded + could blank the browse page). Only a KNOWN-
// offline serve or a GENUINELY FAILED revalidate may mark stale; and a background
// WARM prefetch must not drive reachability at all.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');
install();
const Plex = require('../js/plex.js');
const { withCache } = Plex._test;

function fakeNet(plexReachable) {
  const calls = { stale: 0, fresh: 0 };
  const net = {
    markCachedRead: () => { calls.stale++; },
    noteFresh: () => { calls.fresh++; },
    state: () => ({ plexReachable }),
  };
  global.Net = net; global.window.Net = net;
  global.Store = {}; global.window.Store = {};   // truthy → the cache path is enabled
  return calls;
}
const tick = () => new Promise((r) => setImmediate(r));   // let the fire-and-forget revalidate settle

test('cache-first while ONLINE: serves cache, revalidates, does NOT mark stale', async () => {
  const calls = fakeNet(true);
  const books = [{ ratingKey: '1', title: 'A' }];
  let liveRuns = 0;
  const out = await withCache('books', {
    cached: async () => books,
    live: async () => { liveRuns++; return books; },   // identical → no repaint
    store: () => {},
  }, {});
  assert.deepEqual(out, books, 'returns the cached copy immediately');
  await tick();
  assert.equal(calls.stale, 0, 'a healthy cache-first serve must NOT markCachedRead (that stormed reconnects)');
  assert.equal(liveRuns, 1, 'revalidated in the background');
  assert.equal(calls.fresh, 1, 'a successful revalidate notes fresh');
});

test('cache-first while KNOWN-OFFLINE: serves cache, marks stale, no revalidate', async () => {
  const calls = fakeNet(false);   // offlineKnown
  const books = [{ ratingKey: '1' }];
  let liveRuns = 0;
  const out = await withCache('books', {
    cached: async () => books,
    live: async () => { liveRuns++; return books; },
    store: () => {},
  }, {});
  assert.deepEqual(out, books);
  await tick();
  assert.equal(calls.stale, 1, 'a confirmed-offline serve IS genuinely stale');
  assert.equal(liveRuns, 0, 'does not hammer a known-down relay');
});

test('cache-first, revalidate FAILS: marks stale only then', async () => {
  const calls = fakeNet(true);
  const books = [{ ratingKey: '1' }];
  const out = await withCache('books', {
    cached: async () => books,
    live: async () => { throw new Error('relay down'); },
    store: () => {},
  }, {});
  assert.deepEqual(out, books, 'still serves cache instantly');
  await tick();
  assert.equal(calls.stale, 1, 'a genuine revalidate failure marks stale');
});

test('warm prefetch does NOT drive reachability (no fresh, no stale)', async () => {
  const calls = fakeNet(true);
  let liveRuns = 0;
  await withCache('authors', {
    cached: async () => undefined,           // miss → warm fetches + stores
    live: async () => { liveRuns++; return [{ ratingKey: '9' }]; },
    store: () => {},
  }, { warm: true });
  await tick();
  assert.equal(liveRuns, 1, 'warm miss fetches');
  assert.equal(calls.fresh, 0, 'a warm read must not noteFresh (~200 of them would storm reconnects)');
  assert.equal(calls.stale, 0);
});
