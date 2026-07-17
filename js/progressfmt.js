// progressfmt.js — the TR2 publication format for durable-progress shards.
//
// A shard's playlist summary is `TR2.<base64url(gzip(JSON))>`. Why each piece
// (all measured, PLAN-durable-progress.md §3.3):
//   * base64url — its alphabet (A-Za-z0-9-_) is entirely URL-safe, so the payload
//     pays ZERO percent-encoding penalty in the `summary.value` query param (the
//     actual transport); raw JSON pays 1.72×. This matters more than compression.
//   * gzip, not deflate-raw — 24 chars worse, but it carries framing + a CRC32.
//     For a durable blob crossing an undocumented metadata path, corruption
//     DETECTION is worth more than 24 characters.
//   * Version prefix — `TR2.` (gzip) / `TR2u.` (uncompressed fallback) so a reader
//     knows exactly what it holds; anything else is not ours.
//
// Contract (the plan's FORMAT workstream):
//   * encode() feature-detects CompressionStream/DecompressionStream BOTH ways
//     (a device that cannot decompress must not write gzip it can't verify) and
//     falls back to `TR2u.` rather than losing sync.
//   * decode() THROWS on anything undecodable — wrong prefix, bad alphabet,
//     truncation, a failed gzip CRC, invalid JSON. An undecodable payload must
//     NEVER be interpreted as an empty shard and republished; that would launder
//     corruption into data loss. Callers treat a throw as "degraded": keep cached
//     data, surface it, write nothing.
const ProgressFmt = (() => {
  const enc8 = (s) => new TextEncoder().encode(s);
  // fatal:true → malformed UTF-8 throws instead of yielding U+FFFD garbage.
  const dec8 = (b) => new TextDecoder('utf-8', { fatal: true }).decode(b);

  function b64urlEncode(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(text) {
    if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('TR2: invalid base64url alphabet');
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  // Both directions required: writing gzip we can't read back would break the
  // read-back verification every durable write depends on.
  const gzipOk = () =>
    typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined' &&
    typeof Response !== 'undefined' && typeof Blob !== 'undefined';

  async function pipe(bytes, stream) {
    const body = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(body).arrayBuffer());
  }

  function parse(json) {
    const o = JSON.parse(json);
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('TR2: payload is not an object');
    return o;
  }

  async function encode(payload) {
    const json = JSON.stringify(payload);
    if (gzipOk()) {
      try { return 'TR2.' + b64urlEncode(await pipe(enc8(json), new CompressionStream('gzip'))); }
      catch { /* compression unavailable/broken at runtime — fall back, don't lose sync */ }
    }
    return 'TR2u.' + b64urlEncode(enc8(json));
  }

  async function decode(text) {
    if (typeof text !== 'string') throw new Error('TR2: not a string');
    if (text.startsWith('TR2.')) {
      if (!gzipOk()) throw new Error('TR2: no DecompressionStream on this device');
      // DecompressionStream enforces the gzip CRC — corruption rejects here.
      return parse(dec8(await pipe(b64urlDecode(text.slice(4)), new DecompressionStream('gzip'))));
    }
    if (text.startsWith('TR2u.')) return parse(dec8(b64urlDecode(text.slice(5))));
    throw new Error('TR2: unrecognized prefix');
  }

  const isTr2 = (t) => typeof t === 'string' && (t.startsWith('TR2.') || t.startsWith('TR2u.'));

  return { encode, decode, isTr2, _test: { b64urlEncode, b64urlDecode, gzipOk } };
})();

// Expose on window (a top-level `const` is a lexical global, not window.ProgressFmt).
if (typeof window !== 'undefined') window.ProgressFmt = ProgressFmt;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = ProgressFmt;
