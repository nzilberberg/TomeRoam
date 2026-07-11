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

test('device name: defaults from the user agent, rename persists, blanks ignored', () => {
  storage.removeItem('pb_deviceName');
  assert.equal(Presence.name(), 'This device');       // node-test UA → generic
  Presence.setName('Kitchen iPad');
  assert.equal(Presence.name(), 'Kitchen iPad');
  Presence.setName('   ');                            // whitespace-only → ignored
  assert.equal(Presence.name(), 'Kitchen iPad');
});
