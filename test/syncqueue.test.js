// Conflict-rule tests for the pending-sync queue. These lock in the promise the
// app is built on: a later flush must never destroy newer resume progress with a
// stale or near-zero write. We exercise the pure `decide()` verdict function
// (exposed via SyncQueue._test) against a stubbed cross-device Progress record.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// SyncQueue reads the current "remote" progress from window.Progress and the
// clock from window.Plex.serverNow. Stub both before requiring the module.
let remote = null;                        // { pos, ts } or null (no remote record)
const NOW = 1_000_000_000_000;            // fixed server clock for deterministic ts math
global.window = {
  Plex: { serverNow: () => NOW },
  Progress: {
    trackRecord: () => (remote ? { o: remote.pos, ts: remote.ts } : null),
    bookRecord: () => null,
  },
};
const SyncQueue = require('../js/syncqueue.js');
const { decide, T } = SyncQueue._test;

// Build a queued progress item. `posS` seconds, `clock` = updatedAt (ms).
const item = (posS, clock, extra = {}) => ({
  type: 'progress', bookKey: 'b1', ratingKey: 't1',
  positionMs: posS * 1000, durationMs: 3600_000,
  updatedAt: clock, createdAt: clock, explicit: false, ...extra,
});

beforeEach(() => { remote = null; });

test('zero-position protection: near-zero non-explicit is never written', () => {
  remote = null;
  assert.equal(decide(item(2, NOW)), 'skip');          // 2s, not explicit → skip
  assert.equal(decide(item(0, NOW)), 'skip');
});

test('explicit near-zero (user restart/reset) is allowed through', () => {
  remote = null;
  assert.equal(decide(item(1, NOW, { explicit: true })), 'write');
});

test('no known remote → local progress is written', () => {
  remote = null;
  assert.equal(decide(item(500, NOW)), 'write');
});

test('local clearly ahead of remote, newer clock → write', () => {
  remote = { pos: 300_000, ts: NOW - 60_000 };          // remote at 300s, older
  assert.equal(decide(item(600, NOW)), 'write');        // we're at 600s, newer
});

test('local ahead but OLDER clock → drop as a stale duplicate', () => {
  remote = { pos: 300_000, ts: NOW };                   // remote just wrote
  assert.equal(decide(item(600, NOW - 120_000)), 'drop'); // our write is 2min old
});

test('small backward scrub (<= tolerance) with newer clock → write', () => {
  remote = { pos: 600_000, ts: NOW - 30_000 };
  const backS = 600 - (T.smallBackwardToleranceMs / 1000) + 10;   // ~10s inside tolerance
  assert.equal(decide(item(backS, NOW)), 'write');
});

test('large backward jump vs newer remote → conflict (preserve remote)', () => {
  remote = { pos: 3000_000, ts: NOW - 5_000 };          // remote at 50min, fresh
  assert.equal(decide(item(60, NOW)), 'conflict');      // we claim 1min → suspicious
});

test('large backward jump but our clock is OLDER → drop (remote wins outright)', () => {
  remote = { pos: 3000_000, ts: NOW };
  assert.equal(decide(item(60, NOW - 600_000)), 'drop');
});

test('thresholds are sane and ordered', () => {
  assert.ok(T.nearZeroProgressThresholdMs > 0);
  assert.ok(T.smallBackwardToleranceMs < T.largeBackwardConflictMs);
});
