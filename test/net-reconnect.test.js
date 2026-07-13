// CONTRACT test for Net's reconnect wiring — the OTHER half of the .8 sync bug.
// The queue can be perfect, but progress still never syncs if the reconnect pass
// that drains it never fires. The data path usually observes Plex recovery first
// (a library read succeeds → noteFresh) and CONSUMES the false→true transition,
// so checkPlex never sees it — which is exactly why noteFresh must run the pass
// itself. This test drives the real Net.noteFresh / Net.markCachedRead and
// asserts SyncQueue.flush is (or isn't) invoked, using spies for the collaborators.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// --- minimal DOM so Net's banner render path (called from emit()) doesn't throw.
function makeEl() {
  const kids = {};
  return {
    id: '', textContent: '', innerHTML: '', className: '', _action: null,
    style: {}, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    appendChild() {}, addEventListener() {},
    querySelector(sel) { return kids[sel] || (kids[sel] = makeEl()); },
  };
}
global.navigator = { onLine: true, serviceWorker: { controller: null } };
global.location = { hostname: 'localhost', protocol: 'https:' };
global.document = { getElementById: () => null, createElement: () => makeEl(), head: makeEl(), body: makeEl(), documentElement: makeEl(), addEventListener() {}, hidden: false };
// pb_autoretry='0' disables the backoff poller → no dangling timers in the test.
global.localStorage = { getItem: (k) => (k === 'pb_autoretry' ? '0' : null), setItem() {}, removeItem() {} };

// Spies for the reconnect collaborators. Net calls these as BARE globals
// (window===global in a browser), so set them on global too.
let flushCalls = 0, progressFlushes = 0, progressRefreshes = 0;
const SyncQueue = { flush: async () => { flushCalls++; } };
const Progress = { flush: () => { progressFlushes++; }, refresh: () => { progressRefreshes++; } };
global.window = { matchMedia: () => ({ matches: false }), navigator: global.navigator, location: global.location, SyncQueue, Progress };
global.SyncQueue = SyncQueue;
global.Progress = Progress;

const Net = require('../js/net.js');
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => { flushCalls = progressFlushes = progressRefreshes = 0; Net._test.set({ plexReachable: false, pendingSyncCount: 1 }); });

test('noteFresh after an outage runs the reconnect pass → flushes the sync queue', async () => {
  Net._test.set({ plexReachable: false });
  Net.noteFresh('books');            // a live library read just landed
  await tick();
  assert.equal(flushCalls, 1, 'SyncQueue.flush was driven by the reconnect pass');
  assert.equal(progressFlushes, 1, 'Progress.flush ran');
  assert.equal(progressRefreshes, 1, 'Progress.refresh ran');
  assert.equal(Net.state().plexReachable, true, 'plex marked reachable');
});

test('noteFresh when ALREADY reachable does not re-fire the pass (no false→true edge)', async () => {
  Net._test.set({ plexReachable: true });
  Net.noteFresh('books');
  await tick();
  assert.equal(flushCalls, 0, 'no redundant flush when there was no recovery edge');
});

test('markCachedRead marks Plex unreachable and does NOT flush (it is the offline signal)', async () => {
  Net._test.set({ plexReachable: true });
  Net.markCachedRead('books');
  await tick();
  assert.equal(Net.state().plexReachable, false, 'a served-stale read means Plex is unreachable');
  assert.equal(flushCalls, 0, 'going offline must not attempt a flush');
});
