// settings.test.js — the settings repository (js/settings.js). Pins the exact
// defaults, the stored encodings, and the deliberately-preserved legacy quirks,
// so a future edit can't silently change what a setting decodes to (the class of
// bug this module exists to prevent). Also guards the localStorage KEYS against
// an accidental rename (existing installs would lose their saved settings).
const test = require('node:test');
const assert = require('node:assert');
const { freshStorage } = require('./env.js');
const Settings = require('../js/settings.js');

// Settings reads localStorage at call time, so swapping the global between tests
// gives each test a clean store (and lets us seed raw stored values).
function seed(values) {
  global.localStorage = freshStorage();
  for (const [k, v] of Object.entries(values || {})) global.localStorage.setItem(k, v);
}

test('defaults when nothing is stored', () => {
  seed({});
  assert.equal(Settings.skipBackSec, 10);
  assert.equal(Settings.skipFwdSec, 10);
  assert.equal(Settings.resetGraceSec, 10);
  assert.equal(Settings.bufferCurrent, true);   // default ON
  assert.equal(Settings.bufferAhead, true);     // default ON
  assert.equal(Settings.freshStart, true);      // default ON
  assert.equal(Settings.autoUpdate, false);     // default OFF
  assert.equal(Settings.speed, 1.0);
});

test('set/get round-trips through the same key', () => {
  seed({});
  Settings.setSkipBackSec(30); assert.equal(Settings.skipBackSec, 30);
  Settings.setSkipFwdSec(15); assert.equal(Settings.skipFwdSec, 15);
  Settings.setResetGraceSec(5); assert.equal(Settings.resetGraceSec, 5);
  Settings.setBufferCurrent(false); assert.equal(Settings.bufferCurrent, false);
  Settings.setBufferAhead(false); assert.equal(Settings.bufferAhead, false);
  Settings.setFreshStart(false); assert.equal(Settings.freshStart, false);
  Settings.setAutoUpdate(true); assert.equal(Settings.autoUpdate, true);
  Settings.setSpeed(1.5); assert.equal(Settings.speed, 1.5);
});

test('booleans store the same encodings the app has always used', () => {
  seed({});
  Settings.setFreshStart(true);  assert.equal(global.localStorage.getItem('pb_freshStart'), '1');
  Settings.setFreshStart(false); assert.equal(global.localStorage.getItem('pb_freshStart'), '0');
  Settings.setBufferCurrent(false); assert.equal(global.localStorage.getItem('pb_bufferCurrent'), '0');
  Settings.setBufferAhead(true);    assert.equal(global.localStorage.getItem('pb_bufferAhead'), '1');
});

test('resetGraceSec honors an explicit 0', () => {
  seed({ pb_resetGrace: '0' });
  assert.equal(Settings.resetGraceSec, 0);
});

test('buffer toggles + freshStart decode stored 0/1 (default ON when unset)', () => {
  seed({ pb_bufferCurrent: '0', pb_bufferAhead: '0', pb_freshStart: '0' });
  assert.equal(Settings.bufferCurrent, false);
  assert.equal(Settings.bufferAhead, false);
  assert.equal(Settings.freshStart, false);
  seed({});   // unset → all default ON
  assert.equal(Settings.bufferCurrent, true);
  assert.equal(Settings.bufferAhead, true);
  assert.equal(Settings.freshStart, true);
});

test('speed rejects zero / negative / garbage, falling back to 1.0', () => {
  seed({ pb_speed: '0' });   assert.equal(Settings.speed, 1.0);
  seed({ pb_speed: '-2' });  assert.equal(Settings.speed, 1.0);
  seed({ pb_speed: 'x' });   assert.equal(Settings.speed, 1.0);
  seed({ pb_speed: '1.75' }); assert.equal(Settings.speed, 1.75);
});

test('KEYS are the exact pb_ strings (renaming would orphan saved settings)', () => {
  assert.deepEqual(Settings.KEY, {
    skipBack: 'pb_skipBack', skipFwd: 'pb_skipFwd', resetGrace: 'pb_resetGrace',
    bufferCurrent: 'pb_bufferCurrent', bufferAhead: 'pb_bufferAhead',
    freshStart: 'pb_freshStart', autoUpdate: 'pb_autoUpdate', speed: 'pb_speed',
  });
});
