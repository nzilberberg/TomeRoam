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
  assert.equal(Settings.bufferMb, 128);
  assert.equal(Settings.bufferBytes, 128 * 1024 * 1024);
  assert.equal(Settings.freshStart, true);   // default ON
  assert.equal(Settings.autoUpdate, false);  // default OFF
  assert.equal(Settings.banking, true);      // default ON (hidden escape hatch)
  assert.equal(Settings.speed, 1.0);
});

test('set/get round-trips through the same key', () => {
  seed({});
  Settings.setSkipBackSec(30); assert.equal(Settings.skipBackSec, 30);
  Settings.setSkipFwdSec(15); assert.equal(Settings.skipFwdSec, 15);
  Settings.setResetGraceSec(5); assert.equal(Settings.resetGraceSec, 5);
  Settings.setBufferMb(200); assert.equal(Settings.bufferMb, 200);
  assert.equal(Settings.bufferBytes, 200 * 1024 * 1024);
  Settings.setFreshStart(false); assert.equal(Settings.freshStart, false);
  Settings.setAutoUpdate(true); assert.equal(Settings.autoUpdate, true);
  Settings.setBanking(false); assert.equal(Settings.banking, false);
  Settings.setSpeed(1.5); assert.equal(Settings.speed, 1.5);
});

test('booleans store the same encodings the app has always used', () => {
  seed({});
  Settings.setFreshStart(true);  assert.equal(global.localStorage.getItem('pb_freshStart'), '1');
  Settings.setFreshStart(false); assert.equal(global.localStorage.getItem('pb_freshStart'), '0');
  Settings.setAutoUpdate(true);  assert.equal(global.localStorage.getItem('pb_autoUpdate'), '1');
  Settings.setBanking(false);    assert.equal(global.localStorage.getItem('pb_banking'), 'off');
});

test('resetGraceSec honors an explicit 0', () => {
  seed({ pb_resetGrace: '0' });
  assert.equal(Settings.resetGraceSec, 0);
});

test('bufferMb: stored 0 ("Off") decodes to the default — legacy quirk, preserved', () => {
  seed({ pb_bankBudget: '0' });
  assert.equal(Settings.bufferMb, 128);
});

test('bufferMb clamps to 256', () => {
  seed({ pb_bankBudget: '300' });
  assert.equal(Settings.bufferMb, 256);
});

test('freshStart / banking decode legacy stored strings', () => {
  seed({ pb_freshStart: '0', pb_banking: 'off' });
  assert.equal(Settings.freshStart, false);
  assert.equal(Settings.banking, false);
  seed({ pb_freshStart: '1', pb_banking: 'on' });
  assert.equal(Settings.freshStart, true);
  assert.equal(Settings.banking, true);
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
    bufferMb: 'pb_bankBudget', freshStart: 'pb_freshStart', autoUpdate: 'pb_autoUpdate',
    banking: 'pb_banking', speed: 'pb_speed',
  });
});
