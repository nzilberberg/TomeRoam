// Tests for js/downloads.js pure logic: the Wi-Fi gating decision (incl. the iOS
// "can't detect connection type" case), the storage-cap check, and the progress
// fraction. The IDB/fetch/UI parts need a browser and are covered manually.
const { test } = require('node:test');
const assert = require('node:assert');

function memLS() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
}
global.localStorage = memLS();
const Downloads = require('../js/downloads.js');
const { decideStart, capFits, frac } = Downloads._test;

test('Wi-Fi-Only OFF → always start immediately', () => {
  assert.deepEqual(decideStart(false, true), { start: true });
  assert.deepEqual(decideStart(false, false), { start: true });
  assert.deepEqual(decideStart(false, null), { start: true });
});

test('Wi-Fi-Only ON + detected Wi-Fi → start', () => {
  assert.deepEqual(decideStart(true, true), { start: true });
});

test('Wi-Fi-Only ON + detected cellular → confirm (offer to queue for Wi-Fi)', () => {
  assert.deepEqual(decideStart(true, false), { confirm: true });
});

test('Wi-Fi-Only ON + unknown connection (iOS) → start (can\'t enforce; don\'t trap)', () => {
  assert.deepEqual(decideStart(true, null), { start: true });
});

test('capFits enforces the download-space budget', () => {
  const GB = 1024 * 1024 * 1024;
  assert.equal(capFits(3 * GB, 0.5 * GB, 4 * GB), true);
  assert.equal(capFits(3.8 * GB, 0.5 * GB, 4 * GB), false);
  assert.equal(capFits(0, 4 * GB, 4 * GB), true);   // exactly fits
});

test('progress fraction is clamped and safe for zero-length books', () => {
  assert.equal(frac(0, 0), 0);
  assert.equal(frac(3, 12), 0.25);
  assert.equal(frac(12, 12), 1);
  assert.equal(frac(15, 12), 1);   // clamp
});

test('default max is 4 GB', () => {
  assert.equal(Downloads.DEFAULT_MAX, 4 * 1024 * 1024 * 1024);
});
