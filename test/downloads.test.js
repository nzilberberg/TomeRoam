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

// Regression: byte limits must survive a set→get round-trip UNCHANGED for every
// capacity the settings UI offers. A prior implementation stored `n | 0`, which
// coerces to signed-32-bit and corrupted everything above ~2 GB (2 GB → negative,
// 4/8/16 GB → 0). See the parseByteLimit header in js/downloads.js.
const { parseByteLimit } = Downloads._test;
test('parseByteLimit: every capacity the UI offers round-trips exactly', () => {
  const GB = 1024 * 1024 * 1024;
  for (const g of [1, 2, 4, 8, 16]) {
    const bytes = g * GB;
    assert.equal(parseByteLimit(bytes, -1), bytes, `${g} GB must not be corrupted`);
    assert.equal(parseByteLimit(String(bytes), -1), bytes, `${g} GB as a stored string`);
  }
});
test('parseByteLimit: values around the 32-bit boundary and MAX_SAFE_INTEGER', () => {
  assert.equal(parseByteLimit(2147483648, -1), 2147483648);   // 2^31 — exactly where |0 went negative
  assert.equal(parseByteLimit(4294967296, -1), 4294967296);   // 2^32 — where |0 went to 0
  assert.equal(parseByteLimit(Number.MAX_SAFE_INTEGER, -1), Number.MAX_SAFE_INTEGER);
});
test('parseByteLimit: invalid / previously-corrupted values fall back to the default', () => {
  assert.equal(parseByteLimit(0, 777), 777);                  // old `|0`-of-4GB residue
  assert.equal(parseByteLimit(-2147483648, 777), 777);        // old `|0`-of-2GB residue (negative)
  assert.equal(parseByteLimit('garbage', 777), 777);
  assert.equal(parseByteLimit(null, 777), 777);
  assert.equal(parseByteLimit(Number.MAX_SAFE_INTEGER + 1, 777), 777);   // beyond safe-integer precision
});
test('setMaxBytes/maxBytes: the full setter→getter path preserves large caps', () => {
  const GB = 1024 * 1024 * 1024;
  Downloads.setMaxBytes(16 * GB);
  assert.equal(Downloads.maxBytes(), 16 * GB);
  Downloads.setMaxBytes(2 * GB);
  assert.equal(Downloads.maxBytes(), 2 * GB);
});

// Persistent-buffer eviction: oldest-first until under budget, never the `keep`.
const { evictionPlan } = Downloads._test;
const E = (arr) => arr.map(([k, size, ts]) => [k, { size, ts }]);

test('evictionPlan: nothing to evict when under budget', () => {
  const entries = E([['a', 50, 1], ['b', 50, 2]]);
  assert.deepEqual(evictionPlan(entries, 100, 250, null), []);
});

test('evictionPlan: drops OLDEST first until under budget', () => {
  const entries = E([['new', 100, 30], ['old', 100, 10], ['mid', 100, 20]]);
  // 300 used, budget 150 → must drop 'old' then 'mid' (oldest ts first) → 100 left
  assert.deepEqual(evictionPlan(entries, 300, 150, null), ['old', 'mid']);
});

test('evictionPlan: never evicts the kept (current) track', () => {
  const entries = E([['old', 100, 10], ['cur', 100, 20]]);
  // 200 used, budget 50, keep 'cur' → evict 'old', then 'cur' is protected (still over, but kept)
  assert.deepEqual(evictionPlan(entries, 200, 50, 'cur'), ['old']);
});

test('evictionPlan: a Set protects MULTIPLE tracks (just-written + currently-playing)', () => {
  const entries = E([['old', 100, 10], ['playing', 100, 20], ['fresh', 100, 30]]);
  // 300 used, budget 100, protect the playing track AND the fresh write →
  // only 'old' is evictable (still over budget afterwards, but both survive).
  assert.deepEqual(evictionPlan(entries, 300, 100, new Set(['playing', 'fresh'])), ['old']);
});

test('DEFAULT_BUF_MAX is 512 MB', () => {
  assert.equal(Downloads.DEFAULT_BUF_MAX, 512 * 1024 * 1024);
});
