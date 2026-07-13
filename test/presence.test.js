// Tests for js/presence.js — loaded as the real module; Plex is a stub with a
// fixed server clock so extrapolation is deterministic.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');

const storage = install();
let NOW = 1000000;
global.Plex = { serverNow: () => NOW, getClientId: () => 'pbpwa-test-1234abcd' };
global.PBLogic = require('../js/logic.js');    // presence delegates its math here
const Presence = require('../js/presence.js');

test('livePos extrapolates a playing peer on the stubbed server clock', () => {
  assert.equal(Presence.livePos({ state: 'playing', pos: 1000, at: NOW - 10000, speed: 1.5 }), 1000 + 10000 * 1.5);
  assert.equal(Presence.livePos({ state: 'paused', pos: 1000, at: 0 }), 1000);
});

test('resetClaim stamps a fresh (superseding) claim on the reset book', () => {
  NOW = 2000000;
  Presence.claimPlaying('someBook', 'someTrack', 0, 'someTrack');   // an earlier claim
  const earlier = Presence.getClaim();
  NOW = 2000500;
  Presence.resetClaim('bookX', 'track1');
  assert.equal(Presence.getClaim(), 2000500, 'reset publishes a claim stamped now');
  assert.ok(Presence.getClaim() > earlier, 'newer than a prior claim → supersedes a playing peer');
  Presence.setActive(false);   // tear down the poll interval claimPlaying/resetClaim started (or the runner hangs)
});

// ---- cached peer presence (paint last-known peers on the first frame, no flash) ----
test('cachePeers persists the raw boards (nulls dropped)', () => {
  Presence._test.cachePeers([{ id: 'x', state: 'playing' }, null, { id: 'y', state: 'idle' }]);
  assert.deepEqual(JSON.parse(storage.getItem('pb_peerCache')), [{ id: 'x', state: 'playing' }, { id: 'y', state: 'idle' }]);
});

test('restoreCachedPeers: paints last-known peers on init, dropping self + aged ghosts', () => {
  NOW = 5_000_000;
  const me = 'pbpwa-test-1234abcd';
  const fresh = { id: 'peerA', name: 'Kitchen', state: 'playing', book: 'b', track: 't', pos: 1000, at: NOW - 5000, speed: 1, claim: 1 };
  const ghost = { id: 'peerB', name: 'Dead', state: 'playing', book: 'b', track: 't', pos: 0, at: NOW - 600000, speed: 1, claim: 1 };   // silent >> GHOST_MS
  const self  = { id: me, name: 'Me', state: 'playing', book: 'b', track: 't', pos: 0, at: NOW, speed: 1, claim: 1 };
  storage.setItem('pb_peerCache', JSON.stringify([fresh, ghost, self]));
  let captured = null;
  Presence.init({ onPeers: (p) => { captured = p; } });   // init restores + fires onPeers before the first poll
  Presence.setActive(false);                               // tear down the poll timer or node:test hangs
  assert.ok(captured, 'onPeers fired with the restored peers');
  assert.deepEqual(captured.map((p) => p.id), ['peerA'], 'kept the fresh peer; dropped the ghost and ourselves');
});

test('restoreCachedPeers: no cache = no-op (does not fire onPeers)', () => {
  storage.removeItem('pb_peerCache');
  let fired = false;
  Presence.init({ onPeers: () => { fired = true; } });
  Presence.setActive(false);
  assert.equal(fired, false, 'empty cache paints nothing (falls through to the live poll)');
});

test('device name: defaults from the user agent, rename persists, blanks ignored', () => {
  storage.removeItem('pb_deviceName');
  assert.equal(Presence.name(), 'This device');       // node-test UA → generic
  Presence.setName('Kitchen iPad');
  assert.equal(Presence.name(), 'Kitchen iPad');
  Presence.setName('   ');                            // whitespace-only → ignored
  assert.equal(Presence.name(), 'Kitchen iPad');
});
