// shardstore.js — crash-safe hash-prefix sharding for durable progress
// (PLAN-durable-progress.md §6 SHARD + the serialized-writes rule + [v5] replication).
//
// A device's full durable history is published across a set of hidden playlists
// ("shards"): `pb_prog2_<dev>_p<prefix>` where <prefix> is a binary hash-prefix
// ('' = the root). Only the overflowing shard ever splits (`p` → `p0`,`p1`);
// books elsewhere never move; discovered titles ARE the routing table.
//
// HARD RULES this module encodes (each measured or review-settled — do not relax):
//   * NEVER trust an HTTP status: Plex returns 200 for writes it silently discards
//     (measured §3.4). Every durable write is verified by CONTENT READ-BACK.
//   * At most one write pass in flight; a newer snapshot replaces a queued one;
//     the newest pending snapshot is written on completion (same-device
//     self-clobber is this codebase's oldest bug class).
//   * A split is a transaction: children (carrying `parent` + a shared random
//     `splitId`) are written and VERIFIED first; replacing the parent's payload
//     with the redirect is the single atomic commit. Until that redirect is
//     verified, the parent's data is authoritative and children are disposable
//     preparation state. Interrupted splits restart from the parent under a NEW
//     splitId. Committed redirects are PERMANENT — they are the commit record,
//     not a routing aid.
//   * A reader follows a redirect ONLY when all four checks hold: both children
//     exist · both decode · both name the expected parent · both carry the
//     redirect's splitId. A failed check = NOBODY authoritative (degraded sync,
//     keep cached data) — never an empty shard.
//   * Records are IMMUTABLE and carry their original `ts` + `origin` device.
//     Republication never re-stamps (a re-stamped old record would win LWW and
//     silently overwrite a newer position).
//   * `maxRequestBytes` is injectable — tests run at ~350 bytes so ordinary
//     fixtures split recursively on every run; production runs the SAME code at
//     8–12KB. No production-only branch, no mock to drift.
//
// Record entry shape (canonical, shared with progress.js):
//   { book, bk?: { t, o, cum, tot, ts, origin, name }, rst?: <ms>, rstOrigin? }
const createShardStore = (opts) => {
  const dev = opts.deviceId;                          // 8-hex board id of THIS device
  const titlePrefix = opts.titlePrefix || 'pb_prog2_';
  const maxRequestBytes = opts.maxRequestBytes || 8000;
  const requestOverhead = opts.requestOverhead || (() => 200);   // URL bytes beside the payload
  const encode = opts.encode, decode = opts.decode;   // ProgressFmt
  const plex = opts.plex;                             // { createBoard, writeSummary, readSummary, listBoards }
  const retryBaseMs = opts.retryBaseMs == null ? 5000 : opts.retryBaseMs;   // 0 = no auto-retry (tests use flush())
  const log = opts.log || (() => {});
  // Optional persisted prefix→ratingKey hints (progress.js backs this with
  // localStorage): a transiently-incomplete playlist listing must not lead to a
  // duplicate board create. A stale hint self-heals via the 404 path.
  const keys = opts.keys || { load: () => ({}), save: () => {} };
  const randomId = opts.randomId || (() => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint8Array(8); crypto.getRandomValues(a);
      return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.floor(Math.random() * 0xffffffff).toString(16) + Math.floor(Math.random() * 0xffffffff).toString(16);
  });

  const MAX_DEPTH = 32;                               // 32-bit hash — deeper cannot partition

  // ---- routing hash ----------------------------------------------------------
  // FNV-1a 32-bit over the book id, bits MSB-first. Stable forever — changing it
  // reshuffles every book across every existing shard set.
  function hashBits(book) {
    let h = 0x811c9dc5;
    const s = String(book);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(2).padStart(32, '0');
  }
  const owns = (prefix, book) => hashBits(book).startsWith(prefix);
  const title = (prefix) => `${titlePrefix}${dev}_p${prefix}`;
  const parseTitle = (t) => { const m = /^([a-z0-9]{1,12})_p([01]*)$/.exec(t.slice(titlePrefix.length)); return m ? { dev: m[1], prefix: m[2] } : null; };

  // ---- deterministic wire payloads -------------------------------------------
  // Every node carries its BIRTH identity forever: `parent` + `splitId` prove it is
  // a child of the split that created it (the reader's four checks depend on them,
  // and a node that later becomes a redirect must still satisfy its own parent's
  // checks). A redirect's OWN committed transaction is the separate `redirectId`.
  //   Data:     { v:2, dev, prefix, parent?, splitId?, origins, names, bk, rst }
  //   Redirect: { v:2, dev, prefix, parent?, splitId?, redirect:[p0,p1], redirectId }
  // Rows sorted by book id; origins deduped in row order → identical input builds
  // an identical payload, so verified-content comparison is plain string equality.
  function buildDataPayload(prefix, entries, meta) {
    const rows = entries.slice().sort((a, b) => (a.book < b.book ? -1 : a.book > b.book ? 1 : 0));
    const origins = [], names = [], oIdx = {};
    const oi = (origin, name) => {
      if (!(origin in oIdx)) { oIdx[origin] = origins.length; origins.push(origin); names.push(name || ''); }
      else if (name && !names[oIdx[origin]]) names[oIdx[origin]] = name;   // a tombstone row registering first must not blank the device name
      return oIdx[origin];
    };
    const bk = [], rst = [];
    for (const e of rows) {
      if (e.bk) bk.push([e.book, e.bk.t, e.bk.o | 0, e.bk.cum | 0, e.bk.tot | 0, e.bk.ts, oi(e.bk.origin, e.bk.name)]);
      if (e.rst) rst.push([e.book, e.rst, oi(e.rstOrigin || '', '')]);
    }
    const p = { v: 2, dev, prefix };
    if (meta && meta.parent != null) { p.parent = meta.parent; p.splitId = meta.splitId; }
    p.origins = origins; p.names = names; p.bk = bk; p.rst = rst;
    return p;
  }
  function payloadEntries(p) {
    const out = new Map();   // book → entry
    const slot = (book) => { let e = out.get(book); if (!e) { e = { book }; out.set(book, e); } return e; };
    for (const r of p.bk || []) {
      const e = slot(String(r[0]));
      e.bk = { t: r[1], o: r[2] || 0, cum: r[3] || 0, tot: r[4] || 0, ts: r[5] || 0, origin: (p.origins || [])[r[6]] || '', name: (p.names || [])[r[6]] || '' };
    }
    for (const r of p.rst || []) {
      const e = slot(String(r[0]));
      e.rst = r[1] || 0; e.rstOrigin = (p.origins || [])[r[2]] || '';
    }
    return Array.from(out.values());
  }
  function classify(p, expectDev, expectPrefix) {
    if (!p || p.v !== 2 || p.dev !== expectDev || p.prefix !== expectPrefix) throw new Error('shard: payload/title mismatch');
    if (Array.isArray(p.redirect)) {
      if (p.redirect.length !== 2 || p.redirect[0] !== p.prefix + '0' || p.redirect[1] !== p.prefix + '1' || !p.redirectId) throw new Error('shard: malformed redirect');
      return 'redirect';
    }
    if (!Array.isArray(p.bk) || !Array.isArray(p.rst)) throw new Error('shard: malformed data payload');
    return 'data';
  }
  function makeRedirect(prefix, birthMeta, redirectId) {
    const p = { v: 2, dev, prefix };
    if (birthMeta && birthMeta.parent != null) { p.parent = birthMeta.parent; p.splitId = birthMeta.splitId; }
    p.redirect = [prefix + '0', prefix + '1']; p.redirectId = redirectId;
    return p;
  }

  // ---- my shard tree (write side) ---------------------------------------------
  // prefix → { rk, kind:'data'|'redirect', meta:{parent,splitId}|null, splitId? }
  let tree = null;
  const verified = new Map();          // prefix → JSON of last read-back-verified payload
  let pending = null;                  // newest snapshot awaiting publication
  let lastSnap = null;                 // retained for retry after a failure
  let writing = false, retryTimer = null, backoffMs = 0;
  let lastError = null;
  let degradedRead = [];               // [{dev, prefix, reason}] from the last readAll

  async function loadMine() {
    const boards = await plex.listBoards();
    verified.clear();                      // never trust pre-failure verification state
    const t = new Map();
    for (const b of boards) {
      const id = parseTitle(b.title || '');
      if (!id || id.dev !== dev) continue;
      let node = { rk: b.ratingKey, kind: 'data', meta: null, corrupt: true };
      try {
        const p = await decode(b.summary);
        const kind = classify(p, dev, id.prefix);
        const meta = p.parent != null ? { parent: p.parent, splitId: p.splitId } : null;
        node = kind === 'redirect'
          ? { rk: b.ratingKey, kind, meta, redirectId: p.redirectId }
          : { rk: b.ratingKey, kind, meta };
        if (kind === 'data') verified.set(id.prefix, JSON.stringify(p));   // unchanged content skips rewrites
      } catch (e) {
        // Our OWN corrupt board: local storage is the source of truth for what we
        // publish, so ensureLeaf simply overwrites it (self-heal). Never read as empty.
        log('SHARD', `own board ${id.prefix || '(root)'} undecodable — will rewrite (${e && e.message})`);
      }
      t.set(id.prefix, node);
    }
    // An OWN redirect is committed by construction (children are verified before the
    // redirect is ever written), so it is always trusted; a missing or corrupt child
    // under it is recreated from local truth by ensureLeaf, carrying the birth
    // identity derived from the parent's redirectId.
    let hints = {};
    try { hints = keys.load() || {}; } catch { hints = {}; }
    for (const prefix in hints) {
      if (!t.has(prefix)) t.set(prefix, { rk: hints[prefix], kind: 'data', meta: null, corrupt: true });
    }
    tree = t;
  }
  function saveKeyHints() {
    const o = {};
    for (const [prefix, node] of tree) if (node.rk) o[prefix] = node.rk;
    try { keys.save(o); } catch { /* hints only */ }
  }

  function myLeaves() {
    const leaves = [];
    (function walk(prefix) {
      const node = tree.get(prefix);
      if (!node || node.kind === 'data') { leaves.push(prefix); return; }   // missing under a redirect → recreate as leaf
      walk(prefix + '0'); walk(prefix + '1');
    })('');
    return leaves;
  }

  async function writeAndVerify(prefix, payload) {
    const enc = await encode(payload);
    let node = tree.get(prefix);
    let rk = node && node.rk;
    if (!rk) {
      rk = await plex.createBoard(title(prefix));
      if (!rk) throw new Error('shard: board create failed for ' + (prefix || '(root)'));
    }
    const st = await plex.writeSummary(rk, enc);
    if (st === 404) { tree.delete(prefix); verified.delete(prefix); throw new Error('shard: board gone (404) — recreate next pass'); }
    // THE load-bearing step: content read-back, never status (Plex 200s discarded writes).
    const back = await plex.readSummary(rk);
    if (back == null) throw new Error('shard: verify read failed');
    let decoded;
    try { decoded = await decode(back); } catch { throw new Error('shard: verify decode failed'); }
    const want = JSON.stringify(payload);
    if (JSON.stringify(decoded) !== want) throw new Error('shard: verify MISMATCH — write discarded by server');
    const isRedirect = Array.isArray(payload.redirect);
    tree.set(prefix, {
      rk, kind: isRedirect ? 'redirect' : 'data',
      meta: payload.parent != null ? { parent: payload.parent, splitId: payload.splitId } : null,
      redirectId: isRedirect ? payload.redirectId : undefined,
    });
    if (isRedirect) verified.delete(prefix); else verified.set(prefix, want);
    saveKeyHints();
    return enc;
  }

  const fits = (enc) => enc.length + requestOverhead() <= maxRequestBytes;
  const partition = (entries, bitIndex) => {
    const a = [], b = [];
    for (const e of entries) (hashBits(e.book)[bitIndex] === '0' ? a : b).push(e);
    return [a, b];
  };

  // The birth identity a node at `prefix` must carry: its own recorded meta, or —
  // when the node is missing/being recreated under a COMMITTED parent redirect —
  // derived from that parent (child.splitId must equal parent.redirectId or every
  // reader's four checks fail forever).
  function birthMeta(prefix) {
    const node = tree.get(prefix);
    if (node && !node.corrupt && node.meta) return node.meta;
    if (prefix) {
      const parent = tree.get(prefix.slice(0, -1));
      if (parent && parent.kind === 'redirect') return { parent: prefix.slice(0, -1), splitId: parent.redirectId };
    }
    return null;                                               // root-born (no parent)
  }

  async function ensureLeaf(prefix, entries) {
    const payload = buildDataPayload(prefix, entries, birthMeta(prefix));
    const want = JSON.stringify(payload);
    const enc = await encode(payload);
    if (fits(enc) || prefix.length >= MAX_DEPTH) {
      if (prefix.length >= MAX_DEPTH && !fits(enc)) log('SHARD', `depth-${MAX_DEPTH} shard over budget — publishing anyway (hash exhausted)`);
      if (verified.get(prefix) !== want) await writeAndVerify(prefix, payload);
      return;
    }
    // Overflow → split transaction, then recurse (a child may itself overflow).
    const splitId = randomId();
    const [e0, e1] = partition(entries, prefix.length);
    log('SHARD', `splitting ${prefix || '(root)'} (${entries.length} books) id=${splitId}`);
    await writeAndVerify(prefix + '0', buildDataPayload(prefix + '0', e0, { parent: prefix, splitId }));
    await writeAndVerify(prefix + '1', buildDataPayload(prefix + '1', e1, { parent: prefix, splitId }));
    // The COMMIT: replace the parent's payload with the redirect (keeping the
    // parent's own birth identity). Crash before this line → parent still holds
    // records, children are ignored debris, split retries under a new id. Crash
    // after → children are live. No empty-shard window.
    await writeAndVerify(prefix, makeRedirect(prefix, birthMeta(prefix), splitId));
    await ensureLeaf(prefix + '0', e0);
    await ensureLeaf(prefix + '1', e1);
  }

  async function publishSnapshot(snap) {
    if (!tree) await loadMine();
    // An EMPTY snapshot never publishes: a device that ever held records always has
    // entries (tombstones are permanent), so empty-over-data can only mean a
    // damaged/partially-wiped local store — overwriting the server copy with it
    // would be data loss. A fresh device with no records has nothing to write.
    if (!snap.length) { if (tree.size) log('SHARD', 'refusing to publish an EMPTY snapshot over existing shards'); return; }
    // myLeaves() yields disjoint prefixes covering the whole hash space, so every
    // book routes to exactly one leaf.
    for (const leaf of myLeaves()) {
      await ensureLeaf(leaf, snap.filter((e) => owns(leaf, e.book)));
    }
  }

  // ---- public write API --------------------------------------------------------
  function ensurePublished(entries) {
    pending = entries.slice();
    kick();
  }
  function kick() {
    if (writing || retryTimer) return;
    writing = true;
    (async () => {
      try {
        while (pending) {
          const snap = pending; pending = null; lastSnap = snap;
          await publishSnapshot(snap);
        }
        backoffMs = 0; lastError = null;
      } catch (e) {
        lastError = String((e && e.message) || e);
        log('SHARD', 'publish failed: ' + lastError);
        if (!pending) pending = lastSnap;              // never lose the snapshot on failure
        tree = null;                                    // rediscover server state next pass (crash-safe restart)
        backoffMs = Math.min(backoffMs ? backoffMs * 3 : (retryBaseMs || 0), 90000);
        if (retryBaseMs > 0) retryTimer = setTimeout(() => { retryTimer = null; kick(); }, backoffMs);
      } finally { writing = false; }
    })();
  }
  // Reconnect hook: cancel the backoff and retry now. Resolves when the current
  // pass settles (tests await this instead of timers).
  async function flush() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    kick();
    while (writing) await new Promise((r) => setTimeout(r, 5));
  }

  // ---- read side (ALL devices' shard sets) --------------------------------------
  // → { entries, degraded, stats } where entries carry their origin/name/ts
  // untouched (immutable replication) and degraded lists every subtree whose data
  // could not be trusted (reported, never read as empty).
  async function readAll() {
    const boards = await plex.listBoards();
    const byDev = new Map();   // dev → Map<prefix, {payload?, kind?, corrupt?}>
    for (const b of boards) {
      const id = parseTitle(b.title || '');
      if (!id) continue;
      let m = byDev.get(id.dev); if (!m) { m = new Map(); byDev.set(id.dev, m); }
      try {
        const p = await decode(b.summary);
        m.set(id.prefix, { payload: p, kind: classify(p, id.dev, id.prefix) });
      } catch (e) {
        // Before declaring corruption, retry once with a direct per-playlist read —
        // a stale or truncating LISTING must degrade to an extra fetch, not to a
        // degraded subtree. (Measured: the listing carries 12KB summaries intact,
        // so this path should be rare.)
        let fixed = false;
        try {
          const fresh = await plex.readSummary(b.ratingKey);
          if (fresh != null && fresh !== b.summary) {
            const p = await decode(fresh);
            m.set(id.prefix, { payload: p, kind: classify(p, id.dev, id.prefix) });
            fixed = true;
          }
        } catch { /* fall through to corrupt */ }
        if (!fixed) m.set(id.prefix, { corrupt: true, reason: String((e && e.message) || e) });
      }
    }
    const entries = [], degraded = [];
    let storedRecords = 0;
    for (const [d, m] of byDev) {
      (function walk(prefix) {
        const node = m.get(prefix);
        if (!node) {
          // Defensive orphan-pair acceptance: parent gone but both children form a
          // mutually consistent committed pair (same splitId, correct parent field).
          const c0 = m.get(prefix + '0'), c1 = m.get(prefix + '1');
          const pair = c0 && c1 && !c0.corrupt && !c1.corrupt &&
            c0.payload.parent === prefix && c1.payload.parent === prefix &&
            c0.payload.splitId && c0.payload.splitId === c1.payload.splitId;
          if (pair) { walk(prefix + '0'); walk(prefix + '1'); return; }
          degraded.push({ dev: d, prefix, reason: 'missing' });
          return;
        }
        if (node.corrupt) { degraded.push({ dev: d, prefix, reason: node.reason || 'corrupt' }); return; }
        if (node.kind === 'data') {
          const es = payloadEntries(node.payload);
          storedRecords += es.length;
          for (const e of es) entries.push(e);
          return;
        }
        // redirect — all four reader checks, else NOBODY is authoritative here
        const c0 = m.get(prefix + '0'), c1 = m.get(prefix + '1');
        const ok = c0 && c1 && !c0.corrupt && !c1.corrupt &&
          c0.payload.parent === prefix && c1.payload.parent === prefix &&
          c0.payload.splitId === node.payload.redirectId && c1.payload.splitId === node.payload.redirectId;
        if (!ok) { degraded.push({ dev: d, prefix, reason: 'redirect checks failed' }); return; }
        walk(prefix + '0'); walk(prefix + '1');
      })('');
    }
    degradedRead = degraded;
    const unique = new Set(entries.map((e) => e.bk ? `${e.book}|${e.bk.origin}|${e.bk.ts}` : `${e.book}|rst|${e.rst}`));
    return { entries, degraded, stats: { devices: byDev.size, storedRecords, uniqueRecords: unique.size } };
  }

  function syncState() {
    return {
      unsynced: !!pending || !!retryTimer || writing,
      lastError,
      backoffMs: retryTimer ? backoffMs : 0,
      degraded: degradedRead,
    };
  }

  return {
    ensurePublished, flush, readAll, syncState,
    _test: {
      hashBits, buildDataPayload, payloadEntries, classify, title, parseTitle,
      tree: () => tree, verified: () => verified,
      reset() {
        tree = null; verified.clear(); pending = null; lastSnap = null;
        lastError = null; degradedRead = []; backoffMs = 0;
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      },
    },
  };
};

// Expose on window (a top-level `const` is a lexical global, not window.createShardStore).
if (typeof window !== 'undefined') window.createShardStore = createShardStore;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = createShardStore;
