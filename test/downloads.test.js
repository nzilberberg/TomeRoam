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
const { decideStart, capFits, quotaFitsWith, frac } = Downloads._test;

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

// These numbers are NOT invented: they were measured on the user's iPhone on
// 2026-07-16. estimate() reported usage=9.6MB and quota≈38GB while 305MB of book
// was downloaded and playing in airplane mode. WebKit's usage figure simply does
// not see IndexedDB blobs. A stubbed estimate() returning sensible numbers would
// have passed against the OLD code and caught nothing — the whole point of this
// test is that it reproduces a platform behaviour we would never have guessed.
const MB = 1024 * 1024, GB = 1024 * MB;
const IOS_LIES = { supported: true, usage: 9.6 * MB, quota: 38 * GB };

test('quotaFits trusts our own accounting when the platform under-reports (iOS/WebKit)', () => {
  // Nearly full by our reckoning; the platform still claims we have used ~nothing.
  // Trusting est.usage here yields 9.6MB + 2GB <= 36.1GB → true, and we would write
  // 2GB onto a device with ~1GB left. Our accounting must win.
  assert.equal(quotaFitsWith(IOS_LIES, 37 * GB, 2 * GB), false);
  // Same lying estimate, but genuinely little stored → allow.
  assert.equal(quotaFitsWith(IOS_LIES, 305 * MB, 1 * GB), true);
});

test('quotaFits still defers to the platform when IT reports more than we track', () => {
  // Cache Storage, other origins' share, etc. are real and ours to respect — the fix
  // must be max(), not "always ignore the platform".
  const honest = { supported: true, usage: 36 * GB, quota: 38 * GB };
  assert.equal(quotaFitsWith(honest, 1 * GB, 1 * GB), false);
});

test('quotaFits allows when the quota is unknown (cap still applies)', () => {
  assert.equal(quotaFitsWith({ supported: false }, 0, 1 * GB), true);
  assert.equal(quotaFitsWith({ supported: true, quota: 0 }, 0, 1 * GB), true);
  assert.equal(quotaFitsWith(null, 0, 1 * GB), true);
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
