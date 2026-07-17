// @ts-check
// swkit.js — the service worker's PURE decision logic, extracted so it can be
// unit-tested. sw.js is otherwise untestable in Node (it needs the SW globals),
// and these two functions are where silent, hard-to-see bugs hid:
//   * parseRange — a suffix range "bytes=-N" (M4B tail-metadata reads) was once
//     served as the FILE HEAD, corrupting decode silently.
//   * routeFor  — the fetch-routing table; getting it wrong meant e.g. caching a
//     unique ?ts= probe URL (one dead shell entry per poll) or serving downloaded
//     audio through the shell path.
// sw.js importScripts() this file and calls SWKit.*, so the tested code is the
// code that actually runs (no false coverage). Loaded in Node via module.exports.
(function () {
  'use strict';

  // Parse an HTTP Range header against a known blob size. Returns {start,end}
  // (inclusive) or {status:416} for an unsatisfiable range. Mirrors the byte math
  // the browser's media element expects; a garbage/absent range yields the full
  // extent (0..size-1), matching a 200-style full read.
  function parseRange(range, size) {
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    let start, end;
    if (!m[1] && m[2]) {
      // Suffix range "bytes=-N" = the LAST N bytes (MP4/M4B tail-metadata reads
      // use these). Serving the head instead corrupts decoding silently.
      const n = parseInt(m[2], 10) || 0;
      start = Math.max(0, size - n); end = size - 1;
    } else {
      start = m[1] ? parseInt(m[1], 10) : 0;
      end = m[2] ? parseInt(m[2], 10) : size - 1;
    }
    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= size) end = size - 1;
    if (start > end || start >= size) return { status: 416 };
    return { start, end };
  }

  // Is this request for cover art (Plex or a static image)? Mirrors the old
  // isImageRequest — destination hint first, then path heuristics.
  function isImageRoute(destination, pathname) {
    if (destination === 'image') return true;
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(pathname)) return true;
    if (/\/photo\/:\/transcode/.test(pathname)) return true;      // Plex cover transcode
    if (/\/(thumb|art|poster|composite)\b/i.test(pathname)) return true;
    return false;
  }

  // The fetch-routing decision, as a pure function of the request's shape. Order
  // matters and is load-bearing (probe before shell so build.json is never cached;
  // download before shell so __dl audio isn't treated as a static asset).
  //   'probe'       → build.json: network-only, never cached
  //   'download'    → __dl/<track>: range-serve the IndexedDB blob
  //   'shell'       → same-origin app asset: cache-first
  //   'image'       → cross-origin cover art: cache-first with placeholder
  //   'passthrough' → everything else (Plex API, media, banking fetch): untouched
  function routeFor({ sameOrigin, pathname, destination }) {
    if (sameOrigin && /\/build\.json$/.test(pathname)) return 'probe';
    if (sameOrigin && /\/__dl\//.test(pathname)) return 'download';
    if (sameOrigin) return 'shell';
    if (isImageRoute(destination, pathname)) return 'image';
    return 'passthrough';
  }

  // ---- cover-cache FIFO planning (fill-to-budget scaling WS3) ----------------
  // IMG_CACHE holds OPAQUE responses (byte sizes unreadable) → bounded by ENTRY
  // COUNT with an insertion-order index persisted in the cache itself.
  // cache.keys() order is NOT spec-guaranteed, so the persisted index is
  // authoritative; keys the index doesn't know (the SW terminated before an index
  // flush) are treated as OLDEST — evicted first, deterministic. Pure planning
  // here; the serialized cache I/O lives in sw.js.
  /** Merge the persisted order with reality: drop vanished keys, keep known order,
   *  put unknown-age keys FIRST (evicted first). */
  function imgReconcileOrder(order, actualKeys) {
    const actual = new Set(actualKeys);
    const known = [], knownSet = new Set();
    for (const k of (order || [])) {
      if (actual.has(k) && !knownSet.has(k)) { known.push(k); knownSet.add(k); }
    }
    const unknown = [];
    for (const k of actualKeys) if (!knownSet.has(k)) unknown.push(k);
    return unknown.concat(known);
  }
  /** High/low-water trim: nothing until COUNT EXCEEDS high, then down to low. */
  function imgTrimPlan(order, high, low) {
    if (order.length <= high) return { drop: [], keep: order };
    const n = order.length - low;
    return { drop: order.slice(0, n), keep: order.slice(n) };
  }

  const api = { parseRange, isImageRoute, routeFor, imgReconcileOrder, imgTrimPlan };
  if (typeof self !== 'undefined') self.SWKit = api;                         // service worker (importScripts)
  else if (typeof globalThis !== 'undefined') globalThis.SWKit = api;
  if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = api;   // Node tests
})();
