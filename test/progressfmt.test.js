// Tests for js/progressfmt.js — the TR2 shard publication format. The load-bearing
// property is REJECTION: an undecodable payload must throw, never read as empty
// (PLAN-durable-progress.md FORMAT: "must not be interpreted as empty and
// republished — that would launder corruption into data loss").
const { test } = require('node:test');
const assert = require('node:assert');
const Fmt = require('../js/progressfmt.js');

// A realistic payload: REAL-shaped ratingKeys (varied 4-digit ids like the live
// library's 8913/8385/8860 — a sequential synthetic fixture overstated compression
// 4× during the plan's own measurements and is exactly the trap to avoid).
function realisticPayload(n = 120) {
  const bk = [];
  let rk = 837;
  for (let i = 0; i < n; i++) {
    rk += 7 + ((rk * 2654435761) % 97);            // irregular, non-sequential steps
    bk.push([String(rk), String(rk + 1 + (rk % 41)), (rk * 997) % 3_600_000,
      (rk * 131) % 40_000_000, 3_600_000 + (rk % 30_000_000), 1_752_700_000_000 + rk * 1000, rk % 3]);
  }
  return {
    v: 2, dev: 'a1b2c3d4', prefix: '10',
    origins: ['pbpwa-1a2b3c4d', 'pbpwa-5e6f7a8b', 'pbpwa-9c0d1e2f'],
    names: ['iPhone', 'Pixel Tablet', 'Living Room'],
    bk,
    rst: [['8913', 1_752_700_123_000, 0]],
  };
}

test('round-trip: encode → TR2. prefix → decode returns a deep-equal payload', async () => {
  const payload = realisticPayload();
  const enc = await Fmt.encode(payload);
  assert.ok(enc.startsWith('TR2.'), 'gzip path taken (Node 22 has CompressionStream)');
  assert.ok(Fmt.isTr2(enc));
  const back = await Fmt.decode(enc);
  assert.deepEqual(back, payload);
});

test('the encoded form is URL-safe end to end — zero percent-encoding penalty', async () => {
  const enc = await Fmt.encode(realisticPayload());
  assert.equal(encodeURIComponent(enc), enc, 'encodeURIComponent must be a no-op on the whole encoded string');
});

test('compression earns its keep on a realistic payload', async () => {
  const payload = realisticPayload(300);
  const enc = await Fmt.encode(payload);
  const raw = JSON.stringify(payload);
  assert.ok(enc.length < raw.length * 0.6, `encoded ${enc.length} vs raw JSON ${raw.length}`);
});

test('CORRUPTION REJECTS: a flipped character must throw, never decode to an object', async () => {
  const enc = await Fmt.encode(realisticPayload());
  // Flip one character mid-payload (avoiding the prefix), preserving the alphabet.
  const i = Math.floor(enc.length / 2);
  const flipped = enc.slice(0, i) + (enc[i] === 'A' ? 'B' : 'A') + enc.slice(i + 1);
  await assert.rejects(() => Fmt.decode(flipped), /./, 'gzip CRC / structure must reject the tamper');
});

test('TRUNCATION REJECTS: a cut-off payload must throw', async () => {
  const enc = await Fmt.encode(realisticPayload());
  await assert.rejects(() => Fmt.decode(enc.slice(0, Math.floor(enc.length * 0.7))));
});

test('foreign content rejects: plain JSON, legacy board JSON, junk, non-strings', async () => {
  await assert.rejects(() => Fmt.decode('{"v":1,"books":{}}'), /prefix/);
  await assert.rejects(() => Fmt.decode('hello'), /prefix/);
  await assert.rejects(() => Fmt.decode(''), /prefix/);
  await assert.rejects(() => Fmt.decode(null), /not a string/);
  assert.equal(Fmt.isTr2('{"v":1}'), false);
});

test('a TR2 payload that decodes to a non-object rejects (never "empty shard")', async () => {
  // Hand-build a valid TR2u envelope around a JSON array — structurally decodable,
  // semantically not a shard payload.
  const bogus = 'TR2u.' + Fmt._test.b64urlEncode(new TextEncoder().encode('[1,2,3]'));
  await assert.rejects(() => Fmt.decode(bogus), /not an object/);
});

test('fallback: without CompressionStream, encode emits TR2u. and it round-trips', async () => {
  const savedC = global.CompressionStream, savedD = global.DecompressionStream;
  delete global.CompressionStream; delete global.DecompressionStream;
  try {
    const payload = realisticPayload(10);
    const enc = await Fmt.encode(payload);
    assert.ok(enc.startsWith('TR2u.'), 'uncompressed fallback taken');
    assert.deepEqual(await Fmt.decode(enc), payload, 'TR2u round-trips without streams');
    // And a gzip payload is honestly UNREADABLE here — throws, not empty.
    await assert.rejects(() => Fmt.decode('TR2.abcd'), /DecompressionStream/);
  } finally {
    global.CompressionStream = savedC; global.DecompressionStream = savedD;
  }
});

test('base64url helpers: alphabet violations reject; bytes round-trip', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255, 66]);
  const s = Fmt._test.b64urlEncode(bytes);
  assert.ok(/^[A-Za-z0-9_-]*$/.test(s), 'no +, /, or = in the output');
  assert.deepEqual(Array.from(Fmt._test.b64urlDecode(s)), Array.from(bytes));
  assert.throws(() => Fmt._test.b64urlDecode('abc+/=='), /alphabet/);
});
