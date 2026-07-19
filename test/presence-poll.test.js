// Tests for the presence POLL WIRING — the seam, not the arithmetic.
//
// test/logic.test.js covers PBLogic.mergePeers as pure logic. That is not enough:
// every stale-peer defect this module has had lived in the poll BODY (which set is
// assigned, in what order, guarded by what). A mutation to `poll()` leaves the
// PBLogic tests green, so this file drives the real poll against a controllable
// board — the same reason app.js grew an integration harness at .151.
//
// Grounded in the OPEN cross-device stale-sync bug: on the relay-degraded device
// the /playlists listing returns late or partial, and assigning it erased a LIVE
// peer, so resume fell back to a ~10s-old durable position instead of
// extrapolating the peer forward.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');

install();
let NOW = 5_000_000;
const ME = 'pbpwa-me000001';

// The board readAll is queue-driven so a test can script the exact sequence of
// listings — including the partial one the real degraded connection produced.
const script = { next: [], delays: [] };
global.Plex = {
  serverNow: () => NOW,
  getClientId: () => ME,
  makeBoard: () => ({
    key: () => 'rk1',
    readAll: async () => {
      const boards = script.next.shift() || [];
      const d = script.delays.shift() || 0;
      if (d) await new Promise((r) => setTimeout(r, d));
      return boards;
    },
    publish: async () => 200,
  }),
  deletePlaylist: async () => true,
};
global.PBLogic = require('../js/logic.js');
const Presence = require('../js/presence.js');

const asBoard = (o) => ({ ratingKey: 'rk_' + o.id, title: 'pb_dev_' + o.id, summary: JSON.stringify(o) });
const peer = (over) => Object.assign({ id: 'phone', name: 'iPhone', state: 'playing', book: '8913', track: 't1', pos: 275900, at: NOW - 10000, speed: 1, claim: 1 }, over || {});

function reset() { script.next = []; script.delays = []; Presence._test.cachePeers([]); }

// MUTATION: revert poll() to `peers = PBLogic.filterPeers(parsed, …)` → RED.
// That single line IS the bug: the peer vanishes, peerFor() returns null, and
// resume stops extrapolating. The PBLogic tests stay green under this mutation,
// which is exactly why this file exists.
test('poll: a listing that omits a live peer does NOT erase it (the ~10s stale-resume bug)', async () => {
  reset();
  script.next = [[asBoard(peer())], []];        // good read, then an EMPTY listing
  await Presence._test.poll();
  assert.equal(Presence._test.peers().length, 1, 'baseline: the peer is seen');
  await Presence._test.poll();
  const after = Presence._test.peers();
  assert.equal(after.length, 1, 'the peer SURVIVES a listing that failed to include it');
  assert.equal(after[0].stale, true, 'marked unconfirmed by that read');
  // The retained anchor is the whole point: resume can now extrapolate instead of
  // falling back to the raw durable record ~10s behind.
  assert.equal(PBLogic.livePos(after[0], NOW), 285900, 'extrapolates forward, not the stale 275900');
});

// MUTATION: remove the `seen` guard in mergePeers → RED. An explicit stop must
// always win; retention may never resurrect a peer that said it was done.
test('poll: an explicit idle board still removes the peer', async () => {
  reset();
  script.next = [[asBoard(peer())], [asBoard(peer({ state: 'idle' }))]];
  await Presence._test.poll();
  await Presence._test.poll();
  assert.deepEqual(Presence._test.peers(), [], 'idle is an intentional stop, not a missing read');
});

// MUTATION: delete the `if (myPoll !== pollSeq) return;` generation check → RED.
// Same defect fixed in progress.js at .157: two polls in flight, the SLOWER one
// resolves last and reinstates the older peer set. Here the slow read carries the
// OLD position and the fast one the new — without the guard the old wins.
test('poll: a slow poll cannot reinstate an older peer set over a newer one', async () => {
  reset();
  // First call resolves LAST (100ms), second resolves immediately.
  script.next = [[asBoard(peer({ pos: 100000, at: NOW - 50000 }))], [asBoard(peer({ pos: 275900, at: NOW - 1000 }))]];
  script.delays = [100, 0];
  const slow = Presence._test.poll();
  const fast = Presence._test.poll();
  await Promise.all([fast, slow]);
  const after = Presence._test.peers();
  assert.equal(after.length, 1);
  assert.equal(after[0].pos, 275900, 'the NEWER read owns the peer set regardless of resolve order');
});

// The board ratingKey has to actually REACH mergePeers, and only poll() can supply
// it. The logic tests construct `_rk` by hand, so they stay green if the wiring
// stops attaching it — measured: that mutation survived them. This drives the real
// poll twice over the SAME board, with the second event carrying a LOWER `at`
// (serverNow() is re-estimated from a whole-second HTTP Date header and can move
// backward), and requires the current content to win.
//
// MUTATION: drop `p._rk = b.ratingKey` from poll() → RED.
test('poll: a same-board update with a LOWER timestamp still wins (serverNow can go backward)', async () => {
  reset();
  script.next = [
    [asBoard(peer({ state: 'playing', at: NOW - 300 }))],
    [asBoard(peer({ state: 'paused', pos: 999000, at: NOW - 950 }))],   // newer event, lower clock
  ];
  await Presence._test.poll();
  assert.equal(Presence._test.peers()[0].state, 'playing', 'baseline');
  await Presence._test.poll();
  const after = Presence._test.peers();
  assert.equal(after.length, 1);
  assert.equal(after[0].state, 'paused', 'the board is authoritative for its own content');
  assert.equal(after[0].pos, 999000, 'and the current position came with it');
});

// NOTE: the "can a RETAINED peer spuriously supersede us" safety property is
// tested in test/logic.test.js as pure mergePeers→findSuperseder composition.
// It was drafted here first and driven through Presence.claimPlaying — which
// leaves a timer this module cannot fully tear down (setActive(false) is not
// enough), hanging the whole `node --test` run. The property is pure; it does not
// need the module's lifecycle. Keep lifecycle-touching calls out of this file.

// MUTATION: cache `parsed` instead of the merged set → RED. A retained peer that
// does not survive a reload leaves the degraded device back where it started on
// the next launch, which is when resume is most likely to be tapped.
test('poll: a retained peer is persisted, so it survives a reload', async () => {
  reset();
  script.next = [[asBoard(peer())], []];
  await Presence._test.poll();
  await Presence._test.poll();
  const cached = Presence._test.cachedPeers();
  assert.equal(cached.length, 1, 'the retained peer is in the cache');
  assert.equal(cached[0].id, 'phone');
});
