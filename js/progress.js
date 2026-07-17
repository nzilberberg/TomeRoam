// progress.js — DURABLE cross-device book/chapter progress.
//
// Separate from presence.js: presence = ephemeral LIVE position (handoff/auto-pause),
// this = durable progress HISTORY (resume points + the bars). Model:
//   * Each device writes ONLY its own board `pb_prog_<id>` (a hidden Plex playlist),
//     so there's no multi-writer contention (Plex has no compare-and-swap).
//   * Everyone READS all boards and MERGES Last-Write-Wins by server-clock timestamp,
//     independently per (book) book-level record AND per (book,track) chapter record.
//   * Offline: keep recording locally (persisted); publish on reconnect. Whoever
//     played more recently (newest ts) wins the merge — order of publish is irrelevant.
//
// Board summary JSON (compact): { v, id, name, books: { <book>: {
//     bk: { t, o, cum, tot, ts },              // book-level: resume track/offset + cumulative/total (ms)
//     tr: { <track>: [o, d, ts] } } } }         // per-chapter: offset, duration, ts (ms)
const Progress = (() => {
  const PREFIX = 'pb_prog_';
  const SHARD_PREFIX = 'pb_prog2_';  // NOT matched by a PREFIX scan ('pb_prog_' ≠ 'pb_prog2'
                                     // at char 8) — but the legacy path still filters shard
                                     // titles explicitly: if either prefix is ever renamed
                                     // into overlap, the stale-board pruner would read TR2
                                     // shards as dead JSON and DELETE them
  const POLL_MS = 20000;              // durable data changes slowly; presence carries the fast path
  const PUB_DEBOUNCE = 4000;          // coalesce a burst of records into one playlist PUT
  const MAX_BOOKS = 16;              // cap books on the PUBLISHED legacy board only (LRU by touch) — never the local store
  const MAX_JSON = 7000;             // keep the published legacy summary comfortably under Plex's limit
  const STABLE_MS = 10 * 60 * 1000;  // a foreign record this old is "stable" → adopted into the replica
                                     // (guards write churn: a LIVE peer's moving position is not re-published)
  const LS = { board: 'pb_progBoardKey', mine: 'pb_progMine', peers: 'pb_progPeers', replica: 'pb_progReplica', shardCache: 'pb_progShardCache', shardKeys: 'pb_prog2Keys', purged: 'pb_progPurged', pendingDel: 'pb_progPendingDel' };

  let seed = null;
  let mine = load();                  // our OWN authored records (persisted, survives offline)
  let replica = loadReplica();        // ADOPTED foreign records (immutable: original ts + origin — never re-stamped)
  let purged = loadPurged();          // PER-IDENTITY purge tombstones: { <identityId>: ts } — "Delete device" (see deleteDevice)
  let pendingDeletes = loadPendingDeletes();   // durable cleanup queue: deletions whose purge isn't verified-published yet
  let merged = { books: {} };         // merged view across mine + replica + peers + shards (the app's source of truth)
  let peerBoards = [];
  let shardBoards = [];               // per-origin pseudo-boards from the last shard read (cached like peers)
  let pubTimer = null, pollTimer = null, active = false, dirty = false;
  let dirtySince = 0;                 // wall-clock ms when dirty flipped true (UI "stuck" detection only)
  let shardStats = null;              // last read's {uniqueRecords, storedRecords, devices} for diagnostics
  let legacyInv = [];                 // last poll's foreign LEGACY boards: [{id, name, rk, newestTs}] (device list + deletion)
  let shardInv = {};                  // last poll's shard sets by dev8: {id, name, boards:[{rk,prefix}], newestTs}
  const SHARD_PUB_MS = 60000;         // shards are the ARCHIVE: publish at most once a minute
                                      // (the legacy head + presence carry the live position;
                                      // without this, every 4s legacy publish dragged a shard
                                      // write+read-back along — pure churn while playing)
  let shardPubTimer = null, lastShardPub = 0;
  let prunedSession = false;          // one-shot stale-board sweep per app launch
  let cbMerged = () => {};

  const now = () => (typeof Plex !== 'undefined' && Plex.serverNow ? Plex.serverNow() : Date.now());
  const myId = () => (typeof Plex !== 'undefined' && Plex.getClientId ? Plex.getClientId() : 'me');
  const myName = () => (typeof Presence !== 'undefined' && Presence.name ? Presence.name() : 'device');
  const dbg = (t, m) => { if (typeof PBDebug !== 'undefined') PBDebug.log(t, m); };
  // Our own hidden-playlist board (shared primitive in plex.js). Guarded for the
  // Node unit tests, which load this module without plex.js.
  const board = (typeof Plex !== 'undefined' && Plex.makeBoard) ? Plex.makeBoard(PREFIX, LS.board) : null;

  // The sharded FULL-history store (durable-progress plan: FORMAT + SHARD +
  // serialized read-back-verified writes). The legacy board above stays the
  // bounded "recent head" old clients read; the shards carry everything.
  const myDev8 = (typeof Plex !== 'undefined' && Plex.getClientId)
    ? (Plex.getClientId() || 'dev').replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase() : '';
  const shards = (board && typeof createShardStore !== 'undefined' && typeof ProgressFmt !== 'undefined')
    ? createShardStore({
      deviceId: myDev8,
      clientId: Plex.getClientId() || '',
      encode: ProgressFmt.encode,
      decode: ProgressFmt.decode,
      plex: {
        createBoard: (title) => (seed ? Plex.createPlaylist(title, seed) : Promise.resolve(null)),
        writeSummary: (rk, text) => Plex.setPlaylistSummary(rk, text),
        readSummary: (rk) => Plex.readPlaylistSummary(rk),
        listBoards: () => Plex.listBoards(SHARD_PREFIX),
      },
      // Honest budget: the cap is on the whole request-target, so count the base
      // URL + path beside the payload (measured cap ~32.7KB; 8KB default budget).
      requestOverhead: () => (((Plex.getBase && Plex.getBase()) || '').length + 64),
      keys: {
        load: () => { try { return JSON.parse(localStorage.getItem(LS.shardKeys) || '{}'); } catch { return {}; } },
        save: (o) => { try { localStorage.setItem(LS.shardKeys, JSON.stringify(o)); } catch {} },
      },
      log: (t, m) => dbg(t, m),
    })
    : null;

  function load() {
    try { const o = JSON.parse(localStorage.getItem(LS.mine) || 'null'); if (o && o.books) return o; } catch {}
    return { v: 1, books: {} };
  }
  // Peer boards aren't persisted like our own `mine`, so on a fresh launch the merged
  // view is our-own-only until the first poll — the tile resume line then flashes to
  // the peer-aware value. Persist the last poll's peer boards and restore them on init
  // so the FIRST merge already includes peers; the next poll reconciles (LWW, so a
  // stale cached record loses to a fresher live one). Display-only — the live poll is
  // still the source of truth for supersede/claim decisions.
  function cachePeerBoards() { try { localStorage.setItem(LS.peers, JSON.stringify(peerBoards || [])); } catch {} }
  function restorePeerBoards() { try { const p = JSON.parse(localStorage.getItem(LS.peers) || 'null'); if (Array.isArray(p) && p.length) peerBoards = p; } catch {} }
  // Populate the merged view (our own `mine` + last-known cached peers) for the FIRST
  // paint, BEFORE init/polling — the app calls this pre-render so the tile resume/peer
  // line isn't empty on frame 1 (init/rebuild otherwise runs post-connect). The live
  // poll then reconciles any change in place (LWW).
  function hydrate() { restorePeerBoards(); restoreShardBoards(); rebuild(); }
  function saveMine() { try { localStorage.setItem(LS.mine, JSON.stringify(mine)); } catch {} }

  // ---- replica: adopted foreign records (the [v5] replication kept from RECOVER) --
  // { books: { <book>: { bk?: {t,o,cum,tot,ts,origin,name}, rst?: ms, rstOrigin? } } }
  // Records are IMMUTABLE COPIES — original timestamp + origin device, never
  // re-stamped (a re-stamped old record would look newly authored and win LWW,
  // silently overwriting a newer position). This is what makes a reinstall cost
  // identity, not data: every device's shards converge on the full merged history.
  function loadReplica() {
    try { const o = JSON.parse(localStorage.getItem(LS.replica) || 'null'); if (o && o.books) return o; } catch {}
    return { v: 1, books: {} };
  }
  function saveReplica() { try { localStorage.setItem(LS.replica, JSON.stringify(replica)); } catch {} }

  // ---- identity purge tombstones ("Delete device" that actually deletes) --------
  // Same shape of idea as a book's reset tombstone, one level up: purged[id] = ts
  // means "identity id's records at/before ts are DELETED, everywhere". The map
  // rides the legacy board (`purged` field — old clients ignore it), replicates
  // clear-on-contact like reset tombstones, suppresses at merge time (an offline
  // peer's stale copies can't resurrect the identity), and gates adoption and
  // republication. Records NEWER than the purge survive — deleting a live device
  // is self-healing: it recreates its boards and plays on as itself.
  function loadPurged() {
    try { const o = JSON.parse(localStorage.getItem(LS.purged) || 'null'); if (o && typeof o === 'object') return o; } catch {}
    return {};
  }
  function savePurged() { try { localStorage.setItem(LS.purged, JSON.stringify(purged)); } catch {} }
  // The durable pending-cleanup queue: a Delete whose purge hasn't passed verified
  // publication yet keeps its DESCRIPTOR here (identity, ORIGINAL purge timestamp,
  // board ratingKeys) so the operation can finish later — automatically, and
  // idempotently: a retry reuses the original timestamp instead of widening the
  // deletion to records created since.
  function loadPendingDeletes() {
    try { const o = JSON.parse(localStorage.getItem(LS.pendingDel) || 'null'); if (o && typeof o === 'object') return o; } catch {}
    return {};
  }
  function savePendingDeletes() { try { localStorage.setItem(LS.pendingDel, JSON.stringify(pendingDeletes)); } catch {} }
  // Drop every replica copy a purge supersedes. Returns whether anything changed.
  function purgeReplica() {
    let changed = false;
    for (const book in replica.books) {
      const r = replica.books[book];
      if (r.bk && (purged[r.bk.origin] || 0) >= (r.bk.ts || 0)) {
        delete r.bk; if (!r.rst) delete replica.books[book];
        changed = true;
      }
    }
    if (changed) saveReplica();
    return changed;
  }
  // Apply the purge floors to EVERYTHING we hold — the replica AND our own
  // authored store. The authored half is what makes deleting an OFFLINE device
  // stick: when it reconnects and learns of its own purge, it must drop its
  // pre-purge records (they were deleted, everywhere includes here) while
  // anything played after the purge survives. Reset tombstones are kept — a
  // reset is a real action, not the identity's data.
  function applyPurgesLocally() {
    purgeReplica();
    const myFloor = purged[myId()] || 0;
    if (!myFloor) return;
    let changed = false;
    for (const book in mine.books) {
      const b = mine.books[book];
      if (b.bk && (b.bk.ts || 0) <= myFloor) { b.bk = null; changed = true; }
      for (const tr in (b.tr || {})) {
        if ((b.tr[tr][2] || 0) <= myFloor) { delete b.tr[tr]; changed = true; }
      }
      if (!b.bk && !Object.keys(b.tr || {}).length && !b.rst) { delete mine.books[book]; changed = true; }
    }
    if (changed) saveMine();
  }
  // Clear-on-contact replication: adopt any NEWER purge (from peer legacy boards
  // or the verified shard payloads), apply it locally — including to ourselves —
  // and republish so the purge outlives its author's board.
  function adoptPurges(incoming) {
    let changed = false;
    for (const id in (incoming || {})) {
      if ((incoming[id] || 0) > (purged[id] || 0)) { purged[id] = incoming[id]; changed = true; }
    }
    if (!changed) return;
    savePurged(); applyPurgesLocally(); schedulePublish();
  }
  function applyPeerPurges() {
    const incoming = {};
    for (const p of peerBoards) {
      for (const id in (p.purged || {})) {
        if ((p.purged[id] || 0) > (incoming[id] || 0)) incoming[id] = p.purged[id];
      }
    }
    adoptPurges(incoming);
  }
  // Group replica records into per-origin pseudo-boards so rebuild() attributes
  // them exactly like live peer boards (by/name ride the source).
  function groupByOrigin(recs) {
    const by = {};
    for (const book in recs) {
      const r = recs[book];
      if (r.bk) {
        const src = by[r.bk.origin] || (by[r.bk.origin] = { v: 1, id: r.bk.origin, name: r.bk.name || '', books: {} });
        const slot = src.books[book] || (src.books[book] = { bk: null, tr: {} });
        slot.bk = { t: r.bk.t, o: r.bk.o, cum: r.bk.cum, tot: r.bk.tot, ts: r.bk.ts };
      }
      if (r.rst) {
        const oid = r.rstOrigin || (r.bk && r.bk.origin) || 'replica';
        const src = by[oid] || (by[oid] = { v: 1, id: oid, name: '', books: {} });
        const slot = src.books[book] || (src.books[book] = { bk: null, tr: {} });
        if (!slot.rst || r.rst > slot.rst) slot.rst = r.rst;
      }
    }
    return Object.values(by);
  }
  const replicaSources = () => groupByOrigin(replica.books);

  // Adopt STABLE foreign winners into the replica. Stability (ts older than
  // STABLE_MS) keeps a live peer's constantly-moving position out of our shards —
  // we re-publish a peer's record once per listening session, not per heartbeat.
  function adoptStableForeign() {
    let changed = false;
    const cutoff = now() - STABLE_MS;
    const consider = (book, bk, origin, name) => {
      if (!bk || origin === myId() || (bk.ts || 0) > cutoff) return;
      if ((purged[origin] || 0) >= (bk.ts || 0)) return;   // purged identities are never re-adopted
      const cur = replica.books[book];
      if (cur && cur.bk && (cur.bk.ts || 0) >= (bk.ts || 0)) return;
      replica.books[book] = Object.assign({}, cur, { bk: { t: bk.t, o: bk.o || 0, cum: bk.cum || 0, tot: bk.tot || 0, ts: bk.ts || 0, origin, name: name || '' } });
      changed = true;
    };
    const considerRst = (book, rst, origin) => {
      if (!rst) return;
      const cur = replica.books[book];
      if (cur && (cur.rst || 0) >= rst) return;
      replica.books[book] = Object.assign({}, cur, { rst, rstOrigin: origin || '' });
      changed = true;
    };
    for (const src of peerBoards.concat(shardBoards)) {
      if (!src || src.id === myId()) continue;
      for (const book in (src.books || {})) {
        const s = src.books[book];
        consider(book, s.bk, src.id, src.name);
        considerRst(book, s.rst, src.id);
      }
    }
    if (changed) { saveReplica(); schedulePublish(); }
    return changed;
  }

  // The FULL publication snapshot for the shards: my authored records merged with
  // the replica (newest per book), plus every tombstone floor. Never bounded —
  // splitting is the shard store's job.
  function entriesForPublish() {
    const out = {};
    const myFloor = purged[myId()] || 0;   // belt: applyPurgesLocally already cleans `mine`
    for (const book in mine.books) {
      const b = mine.books[book], e = {};
      if (b.bk && (b.bk.ts || 0) > myFloor) e.bk = { t: b.bk.t, o: b.bk.o || 0, cum: b.bk.cum || 0, tot: b.bk.tot || 0, ts: b.bk.ts || 0, origin: myId(), name: myName() };
      if (b.rst) { e.rst = b.rst; e.rstOrigin = myId(); }
      if (e.bk || e.rst) out[book] = e;
    }
    for (const book in replica.books) {
      const r = replica.books[book];
      const e = out[book] || (out[book] = {});
      if (r.bk && (purged[r.bk.origin] || 0) < (r.bk.ts || 0) && (!e.bk || (r.bk.ts || 0) > (e.bk.ts || 0))) e.bk = r.bk;
      if (r.rst && (!e.rst || r.rst > e.rst)) { e.rst = r.rst; e.rstOrigin = r.rstOrigin || ''; }
    }
    return Object.keys(out).map((book) => Object.assign({ book }, out[book])).filter((e) => e.bk || e.rst);
  }
  // Shard entries (flat, per-book, origin-attributed) → per-origin pseudo-boards.
  function shardEntriesToBoards(entries) {
    const recs = {};
    for (const e of entries) {
      const cur = recs[e.book] || (recs[e.book] = {});
      if (e.bk && (!cur.bk || (e.bk.ts || 0) > (cur.bk.ts || 0))) cur.bk = e.bk;
      if (e.rst && (!cur.rst || e.rst > cur.rst)) { cur.rst = e.rst; cur.rstOrigin = e.rstOrigin || ''; }
    }
    return groupByOrigin(recs);
  }
  function cacheShardBoards() { try { localStorage.setItem(LS.shardCache, JSON.stringify(shardBoards || [])); } catch {} }
  function restoreShardBoards() { try { const p = JSON.parse(localStorage.getItem(LS.shardCache) || 'null'); if (Array.isArray(p) && p.length) shardBoards = p; } catch {} }
  function bookSlot(book) { return mine.books[book] || (mine.books[book] = { bk: null, tr: {}, _ts: 0 }); }
  function touch(book) { const b = mine.books[book]; if (b) b._ts = now(); }
  // STOP-DELETING (the durable-progress plan's task 1): the local store is NEVER
  // trimmed. The old trim() here ran on every write and deleted `mine.books` past
  // MAX_BOOKS — permanently destroying the device's own listening positions (book 17
  // was forgotten everywhere). The MAX_BOOKS cap now applies only to a cloned
  // publication snapshot (below), so the published board keeps today's exact size
  // and shape while local history is total.

  // ---- recording (app.js calls these on the existing save triggers) ---------
  function recordTrack(book, track, offsetMs, durMs) {
    if (book == null || track == null) return;
    bookSlot(book).tr[track] = [Math.round(offsetMs) || 0, Math.round(durMs) || 0, now()];
    touch(book); saveMine(); rebuild(); schedulePublish();
  }
  function recordBook(book, rec) {   // rec = { t, o, cum, tot } in ms
    if (book == null) return;
    bookSlot(book).bk = { t: rec.t, o: Math.round(rec.o) || 0, cum: Math.round(rec.cum) || 0, tot: Math.round(rec.tot) || 0, ts: now() };
    touch(book); saveMine(); rebuild(); schedulePublish();
  }
  // Erase a book's records on OUR OWN board (no cross-device guarantee). A bare
  // delete has no timestamp, so it can't win the LWW merge — a peer's older record
  // resurrects the book. Kept for internal use; Reset Progress uses resetBook.
  function clearBook(book) {
    if (mine.books[book]) { delete mine.books[book]; saveMine(); rebuild(); schedulePublish(); }
  }

  // Reset Progress: durably mark a book reset ACROSS THE MESH. The fix for the bare
  // delete above — write a book-level TOMBSTONE (rst = now) and drop our own records.
  // rebuild() then suppresses every bk/tr record (ours or a peer's) at/before rst, so
  // the book has no surviving record and reads as UNPLAYED everywhere the tombstone is
  // seen; later playback (ts > rst) naturally wins and resumes. Peers can't be cleared
  // synchronously (single-writer boards), so they drop their own records via
  // applyPeerResets when they next read our board, and merge-time suppression hides
  // their stale data until then. rst is compact and rides in the book entry, so it
  // outlives the per-chapter maps under the size cap. (Compaction of old tombstones is
  // deferred — the existing LRU/size trim bounds them for now.) See the reset plan.
  function resetBook(book) {
    if (book == null) return;
    mine.books[book] = { bk: null, tr: {}, rst: now(), _ts: now() };
    saveMine(); rebuild(); schedulePublish();
  }

  // ---- publish (own board only, debounced) ----------------------------------
  function schedulePublish() {
    if (!dirty) dirtySince = Date.now();
    dirty = true;
    if (pubTimer || !active) return;
    pubTimer = setTimeout(() => { pubTimer = null; publish(); }, PUB_DEBOUNCE);
  }
  // Shard publication, rate-limited: fire now if the window has passed (or on
  // force — flush/reconnect/background), else arm ONE timer for the remainder.
  function scheduleShardPublish(force) {
    if (!shards) return;
    const dueInMs = lastShardPub + SHARD_PUB_MS - Date.now();
    if (force || dueInMs <= 0) {
      if (shardPubTimer) { clearTimeout(shardPubTimer); shardPubTimer = null; }
      lastShardPub = Date.now();
      shards.ensurePublished(entriesForPublish(), purged);   // purges ride the verified payloads
    } else if (!shardPubTimer) {
      shardPubTimer = setTimeout(() => { shardPubTimer = null; scheduleShardPublish(true); }, dueInMs);
    }
  }
  async function publish() {
    if (!dirty || !board) return;
    // The shards get the FULL history (serialized, read-back-verified, splits as
    // needed — all inside the shard store) at their own, slower cadence. The
    // legacy board keeps publishing the bounded recent head so old clients see
    // zero change.
    scheduleShardPublish(false);
    // board.publish handles ensure/create, and 404 → recreate-next-time vs
    // transient → keep-board (no churn). 2xx = our records are on the server.
    const status = await board.publish(serialize(), () => seed);
    if (status >= 200 && status < 300) { dirty = false; dirtySince = 0; }
  }
  function packAll() {
    const o = { v: 1, id: myId(), name: myName(), books: {} };
    if (Object.keys(purged).length) o.purged = purged;   // identity purges ride the legacy board (old clients ignore the field)
    for (const k in mine.books) {
      const b = mine.books[k]; const e = {};
      if (b.bk) e.bk = b.bk;
      if (b.tr && Object.keys(b.tr).length) e.tr = b.tr;
      if (b.rst) e.rst = b.rst;                       // reset tombstone (see resetBook)
      if (e.bk || e.tr || e.rst) o.books[k] = e;      // publish a tombstone-only book too
    }
    return o;
  }
  // The bounded PUBLICATION clone: the newest MAX_BOOKS books by touch time. packAll's
  // entries are fresh objects, so deleting here never touches `mine` (the local store).
  // rebuild() deliberately does NOT use this — the merged/resume view reads the FULL
  // local store; only the wire copy is capped.
  function legacyProjection() {
    const o = packAll();
    const keys = Object.keys(o.books);
    if (keys.length > MAX_BOOKS) {
      keys.sort((a, b) => ((mine.books[a] || {})._ts || 0) - ((mine.books[b] || {})._ts || 0))
        .slice(0, keys.length - MAX_BOOKS).forEach((k) => delete o.books[k]);
    }
    return o;
  }
  // Size-bound the summary: drop the oldest books' per-chapter maps first, then whole
  // books, until it fits — book-level records (small) survive longest.
  function serialize() {
    const o = legacyProjection();
    const order = Object.keys(o.books).sort((a, b) => ((mine.books[a] || {})._ts || 0) - ((mine.books[b] || {})._ts || 0));
    let i = 0;
    while (JSON.stringify(o).length > MAX_JSON && i < order.length) {
      const k = order[i++]; const e = o.books[k]; if (!e) continue;
      if (e.tr) delete e.tr; else delete o.books[k];
    }
    return JSON.stringify(o);
  }

  // ---- read + merge ---------------------------------------------------------
  async function poll() {
    try {
      // ⚠ 'pb_prog_' is a string-prefix of 'pb_prog2_': the legacy path must EXCLUDE
      // shard boards, or the pruner below reads TR2 payloads as unparseable-dead
      // JSON and deletes the shard set.
      // Explicit guard: shard boards must never enter the legacy parse/prune path
      // (today the prefixes don't overlap; this keeps that a stated invariant
      // rather than a character coincidence).
      const boards = (await board.readAll()).filter((b) => !(b.title || '').startsWith(SHARD_PREFIX));
      const parsed = boards.map((b) => { try { return JSON.parse(b.summary); } catch { return null; } });
      peerBoards = parsed.filter((p) => p && p.id && p.id !== myId());
      cachePeerBoards();   // persist for next launch's first-frame paint (see restorePeerBoards)
      legacyInv = [];
      for (let i = 0; i < boards.length; i++) {
        const p = parsed[i];
        if (p && p.id && p.id !== myId()) legacyInv.push({ id: p.id, name: p.name || '', rk: boards[i].ratingKey, newestTs: newestTs(p) });
      }
      applyPeerPurges();   // adopt newer identity purges BEFORE adopting any records
      if (shards) {
        try {
          const r = await shards.readAll();
          shardBoards = shardEntriesToBoards(r.entries);
          shardInv = r.devices || {};
          cacheShardBoards();
          adoptPurges(r.purges);   // purges ride the VERIFIED shard channel too
          // Replication amplification stays a KNOWN cost, not a mystery: log
          // unique-vs-stored only when it changes (not every 20s poll).
          const sig = `${r.stats.uniqueRecords}/${r.stats.storedRecords}/${r.stats.devices}`;
          if (sig !== (shardStats && shardStats.sig)) dbg('PROG', `shards: ${r.stats.uniqueRecords} unique records, ${r.stats.storedRecords} stored copies across ${r.stats.devices} device(s)`);
          shardStats = Object.assign({ sig }, r.stats);
          if (r.degraded.length) dbg('PROG', `shard read degraded: ${r.degraded.map((d) => `${d.dev}/${d.prefix || 'root'}(${d.reason})`).join(' ')}`);
        } catch (e) { dbg('PROG', 'shard read failed (kept cache): ' + ((e && e.message) || e)); }
        adoptStableForeign();   // stable foreign winners → replica → our shards (reinstall/dead-device durability)
      }
      applyPeerResets();   // adopt any peer reset tombstones + drop our own superseded records
      await completePendingDeletes();   // finish any delete whose purge has since verified
      rebuild(); cbMerged();
      // Once per launch, sweep boards from long-retired devices — presence prunes
      // its pb_dev_ ghosts, but pb_prog_ boards used to live forever, inflating
      // every read and pinning stale LWW records into every merge. A board whose
      // NEWEST record is months old is dead weight; a live device just recreates
      // + republishes its board from local `mine` on its next record.
      if (!prunedSession) { prunedSession = true; pruneStaleBoards(boards, parsed); }
    } catch (e) { /* transient — next tick retries */ }
  }

  const STALE_BOARD_MS = 60 * 24 * 3600 * 1000;   // no record newer than ~2 months → prune
  function newestTs(p) {
    let ts = 0;
    for (const bk in ((p && p.books) || {})) {
      const b = p.books[bk];
      if (b.bk && (b.bk.ts || 0) > ts) ts = b.bk.ts;
      if ((b.rst || 0) > ts) ts = b.rst;   // a recent tombstone keeps a board alive
      for (const tr in (b.tr || {})) { const t = (b.tr[tr] || [])[2] || 0; if (t > ts) ts = t; }
    }
    // Identity purges count as liveness too — pruning a board whose only fresh
    // content is a purge would lose the purge.
    for (const id in ((p && p.purged) || {})) if ((p.purged[id] || 0) > ts) ts = p.purged[id];
    return ts;
  }

  // Clear-on-contact GC: when a peer's board carries a reset tombstone NEWER than
  // anything we hold for that book, adopt it — drop our own records at/before it and
  // stamp the tombstone on OUR board too. This stops us re-publishing stale progress
  // that would resurrect the book, and replicates the tombstone so it survives even
  // if the original resetter's board is later pruned. (A peer we can't reach can't be
  // cleaned — only filtered on read by rebuild's floor — so this runs whenever we do
  // reach one.) Returns nothing; flags a republish when it changed our board.
  function applyPeerResets() {
    const peerRst = {};
    for (const p of peerBoards.concat(shardBoards)) for (const bk in (p.books || {})) {
      const r = p.books[bk].rst || 0; if (r > (peerRst[bk] || 0)) peerRst[bk] = r;
    }
    let changed = false;
    for (const bk in peerRst) {
      const floor = peerRst[bk];
      const slot = mine.books[bk];
      if (slot && (slot.rst || 0) >= floor) continue;   // already know this reset (or a newer one)
      const keepBk = slot && slot.bk && (slot.bk.ts || 0) > floor ? slot.bk : null;
      const keepTr = {};
      if (slot && slot.tr) for (const tr in slot.tr) if ((slot.tr[tr][2] || 0) > floor) keepTr[tr] = slot.tr[tr];
      mine.books[bk] = { bk: keepBk, tr: keepTr, rst: floor, _ts: now() };
      changed = true;
    }
    if (changed) { saveMine(); schedulePublish(); }
  }
  async function pruneStaleBoards(boards, parsed) {
    for (let i = 0; i < boards.length; i++) {
      const b = boards[i], p = parsed[i];
      if (!b || b.ratingKey == null) continue;
      if (String(b.ratingKey) === String(board.key())) continue;   // never our own (by key)
      if (p && p.id && p.id === myId()) continue;                  // never our own (by id)
      const dead = !p || now() - newestTs(p) > STALE_BOARD_MS;
      if (!dead) continue;
      dbg('PROG', `pruning stale board ${b.ratingKey} (${(p && p.name) || 'unparseable'})`);
      try { await Plex.deletePlaylist(b.ratingKey); } catch { /* retry next launch */ }
    }
  }
  function rebuild() {
    const m = { books: {} };
    // Ours first (authored by myId, wins timestamp ties), then adopted replicas,
    // live legacy peers, and every device's shard records — all merged LWW.
    const sources = [packAll()].concat(replicaSources(), peerBoards, shardBoards);
    // Reset floor per book = the newest tombstone across ALL sources. Any bk/tr record
    // at/before its book's floor predates a reset and is suppressed (see resetBook).
    const floor = {};
    for (const src of sources) for (const bk in (src.books || {})) {
      const r = src.books[bk].rst || 0; if (r > (floor[bk] || 0)) floor[bk] = r;
    }
    for (const src of sources) {
      const by = src.id, name = src.name;
      // A purged identity's records at/before its purge are DELETED — suppressed
      // here so an offline peer's lingering copies can never resurrect them.
      const pf = purged[by] || 0;
      for (const bk in (src.books || {})) {
        const f = floor[bk] || 0;
        const dst = m.books[bk] || (m.books[bk] = { bk: null, tr: {}, rst: f });
        const s = src.books[bk];
        if (s.bk && (s.bk.ts || 0) > f && (s.bk.ts || 0) > pf && (!dst.bk || (s.bk.ts || 0) > (dst.bk.ts || 0))) dst.bk = Object.assign({}, s.bk, { by, name });
        if (s.tr) for (const tr in s.tr) {
          const r = s.tr[tr], ts = r[2] || 0;
          if (ts > f && ts > pf && (!dst.tr[tr] || ts > (dst.tr[tr].ts || 0))) dst.tr[tr] = { o: r[0] || 0, d: r[1] || 0, ts, by, name };
        }
      }
    }
    merged = m;
  }

  // ---- read accessors (app.js display) --------------------------------------
  function bookRecord(book) { const b = merged.books[book]; return b && b.bk ? b.bk : null; }     // {t,o,cum,tot,ts,by,name} (merged LWW)
  // This device's OWN last spot for a book — the resume candidate that used to be a
  // parallel `myProgress` map in app.js (a second local progress store). It's just a
  // view over `mine` (already synchronous, persisted via pb_progMine, same
  // server-clock ts as the old map), so Progress is now the single local repository.
  function myBookRecord(book) {
    const b = mine.books[book];
    return (b && b.bk) ? { track: b.bk.t, pos: b.bk.o || 0, ts: b.bk.ts || 0 } : null;
  }
  function trackRecord(book, track) { const b = merged.books[book]; return b && b.tr[track] ? b.tr[track] : null; }  // {o,d,ts,by,name}
  function trackPct(book, track, durMs) {
    const r = trackRecord(book, track); if (!r) return null;
    const d = r.d || durMs || 0; return d ? Math.min(100, Math.round((r.o / d) * 100)) : null;
  }
  const isMine = (rec) => !!rec && rec.by === myId();

  // ---- lifecycle ------------------------------------------------------------
  function init({ onMerged } = {}) { if (onMerged) cbMerged = onMerged; hydrate(); }
  function setSeed(rk) { seed = rk || seed; }
  function setActive(v) {
    active = !!v;
    if (active) { if (!pollTimer) { poll(); pollTimer = setInterval(poll, POLL_MS); } if (dirty) schedulePublish(); }
    else if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }
  // ---- device list (Adopt / Delete / Ignore — Ignore is UI-level) -------------
  // Every foreign identity that has written progress to this library: usually the
  // user's other devices, or THIS device before a reinstall (a wipe mints a new
  // clientId, so the old identity's boards render as a green ghost). No hardware
  // id exists to resolve that automatically — only the human can. `quiet` gates
  // Adopt in the UI: adopting a LIVE device would put two writers on one identity.
  // `quiet` is a DISPLAY HINT ONLY — it never gates Adopt. The feature's whole
  // point is "reinstalled: restore this phone to its old self, NOW", and right
  // after a reinstall the ghost's last activity is minutes old. Adopt copies
  // records to OUR identity and never shares a writer with the old one, so
  // adopting a genuinely-live device costs only a wrong colour + a board
  // recreate — a human decision behind a confirm, not a timer's.
  const QUIET_MS = 10 * 60 * 1000;
  const sanitize8 = (id) => String(id || '').replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase();
  function devices() {
    const out = {};
    for (const l of legacyInv) {
      out[l.id] = { key: l.id, id: l.id, name: l.name, lastSeen: l.newestTs, legacyRk: l.rk, shardDev: null, shardBoards: [] };
    }
    // Every identity we know of, for associating pre-.123 shard sets (whose
    // payloads predate the writer-id field) by the dev8 suffix convention.
    const knownIds = new Set(legacyInv.map((l) => l.id).concat(peerBoards.map((p) => p.id)));
    for (const book in replica.books) { const r = replica.books[book]; if (r.bk && r.bk.origin) knownIds.add(r.bk.origin); }
    for (const dev8 in shardInv) {
      if (dev8 === myDev8) continue;
      const s = shardInv[dev8];
      let id = s.id || '';
      if (!id) {
        // dev8 IS the sanitized last-8 of the writer's client id, by construction —
        // associate only on an UNAMBIGUOUS match; else the set stays unresolved and
        // the UI must not claim Delete removes its recorded positions.
        const matches = Array.from(knownIds).filter((k) => k && k !== myId() && sanitize8(k) === dev8);
        if (matches.length === 1) id = matches[0];
      }
      const key = id || ('dev8:' + dev8);
      const e = out[key] || (out[key] = { key, id, name: '', lastSeen: 0, legacyRk: null, shardDev: null, shardBoards: [] });
      e.shardDev = dev8;
      e.shardBoards = (s.boards || []).map((b) => b.rk);
      if (!e.name && s.name) e.name = s.name;
      if ((s.newestTs || 0) > e.lastSeen) e.lastSeen = s.newestTs;
      if (!id) e.unresolved = true;
    }
    delete out[myId()];
    // Presence recency refines liveness (a device can be online without recording).
    try {
      if (typeof Presence !== 'undefined' && Presence.cachedPeers) {
        for (const p of Presence.cachedPeers()) {
          const e = out[p.id];
          if (!e) continue;
          if ((p.at || 0) > e.lastSeen) e.lastSeen = p.at;
          if (!e.name && p.name) e.name = p.name;
        }
      }
    } catch { /* presence optional */ }
    return Object.values(out).map((e) => Object.assign(e, { quiet: now() - (e.lastSeen || 0) > QUIET_MS }));
  }

  // Remove every board belonging to a device descriptor (legacy + shards +
  // presence). Best-effort per board; local views pruned so the list updates
  // without waiting for the next poll. A LIVE device self-heals: it recreates
  // its boards on its next publish.
  // Returns { deleted, failed, remainingLegacyRk, remainingShardBoards } — every
  // board is either CONFIRMED gone (2xx/404 from the status-aware delete) or kept
  // in the remaining/failed lists so the cleanup transaction stays open. Local
  // inventories are pruned only for confirmed removals; a failed board must keep
  // its Devices row visible.
  async function removeDeviceBoards(desc) {
    let deleted = 0;
    const failed = [];
    const del = async (rk) => {
      let ok = false;
      try { ok = await Plex.deletePlaylist(rk) !== false; } catch { ok = false; }
      if (ok) deleted++; else failed.push(rk);
      return ok;
    };
    let remainingLegacyRk = null;
    if (desc.legacyRk != null && !(await del(desc.legacyRk))) remainingLegacyRk = desc.legacyRk;
    const remainingShardBoards = [];
    for (const rk of desc.shardBoards || []) if (!(await del(rk))) remainingShardBoards.push(rk);
    if (desc.id) {
      try {
        for (const b of await Plex.listBoards('pb_dev_')) {
          try { const p = JSON.parse(b.summary); if (p && p.id === desc.id) await del(b.ratingKey); } catch { /* not ours to judge */ }
        }
      } catch { failed.push('pb_dev_?'); /* couldn't even sweep — keep the transaction open */ }
    }
    if (remainingLegacyRk == null) legacyInv = legacyInv.filter((l) => !(l.id === desc.id || l.rk === desc.legacyRk));
    if (desc.shardDev && !remainingShardBoards.length) delete shardInv[desc.shardDev];
    if (desc.id && !failed.length) { peerBoards = peerBoards.filter((p) => p.id !== desc.id); cachePeerBoards(); }
    return { deleted, failed, remainingLegacyRk, remainingShardBoards };
  }

  // ADOPT: "that dead identity was me." Its records become THIS device's own —
  // copied into `mine` with their ORIGINAL timestamps (never re-stamped, so the
  // LWW merge is unaffected; only the attribution/colour changes) — then its
  // boards are removed. The UI offers this only for quiet identities.
  async function adoptIdentity(desc) {
    if (!desc || !desc.id || desc.id === myId()) return { ok: false, error: 'invalid identity' };
    let adopted = 0;
    // Adoption respects the identity's purge floor exactly like automatic
    // replication does — otherwise a stale reappearing board could launder
    // already-deleted records into OUR authored store, where the old purge can
    // never suppress them again ("delete everywhere" must survive an adopt).
    const floor = purged[desc.id] || 0;
    for (const src of peerBoards.concat(shardBoards)) {
      if (!src || src.id !== desc.id) continue;
      for (const book in (src.books || {})) {
        const s = src.books[book];
        const slot = bookSlot(book);
        if (s.bk && (s.bk.ts || 0) > floor && (!slot.bk || (s.bk.ts || 0) > (slot.bk.ts || 0))) {
          slot.bk = { t: s.bk.t, o: s.bk.o || 0, cum: s.bk.cum || 0, tot: s.bk.tot || 0, ts: s.bk.ts || 0 };
          adopted++;
        }
        for (const tr in (s.tr || {})) {
          const r = s.tr[tr], cur = slot.tr[tr];
          const ts = Array.isArray(r) ? (r[2] || 0) : (r.ts || 0);
          if (ts > floor && (!cur || ts > (cur[2] || 0))) slot.tr[tr] = Array.isArray(r) ? [r[0] || 0, r[1] || 0, ts] : [r.o || 0, r.d || 0, ts];
        }
        if (s.rst && (slot.rst || 0) < s.rst) slot.rst = s.rst;
        if (slot.bk || Object.keys(slot.tr).length || slot.rst) slot._ts = now();
        else delete mine.books[book];   // nothing survived the floor — leave no empty slot
      }
    }
    // Its records leave the replica — they are authored now.
    for (const book in replica.books) {
      const r = replica.books[book];
      if (r.bk && r.bk.origin === desc.id) { delete r.bk; if (!r.rst) delete replica.books[book]; }
    }
    saveMine(); saveReplica(); rebuild(); schedulePublish(); scheduleShardPublish(true);
    if (shards) {
      await shards.flush();
      const st = shards.syncState();
      if (st.unsynced || st.lastError) return { ok: false, error: st.lastError || 'sync incomplete — boards kept', adopted };
    }
    const r = await removeDeviceBoards(desc);
    rebuild(); cbMerged();
    dbg('PROG', `adopted identity ${desc.name || desc.id}: ${adopted} record(s), ${r.deleted} board(s) removed${r.failed.length ? ` (${r.failed.length} failed — row stays until cleaned)` : ''}`);
    return { ok: true, adopted, deleted: r.deleted };
  }

  // DELETE: a real delete. Publishes a per-identity purge tombstone (purged[id] =
  // now) so the identity's records at/before that instant are dropped from our
  // replica, suppressed at merge on every device the tombstone reaches, never
  // re-adopted, never republished — then removes its boards. Records NEWER than
  // the purge survive: deleting a live device is self-healing (it recreates its
  // boards and keeps playing as itself). Books also played elsewhere keep their
  // newer progress; the identity's tombstoned resets are kept (a reset is a real
  // action, not the identity's data).
  async function deleteDevice(desc) {
    if (!desc) return { ok: false, error: 'invalid' };
    const isPurge = !!(desc.id && desc.id !== myId());
    if (isPurge) {
      // Idempotent: retrying a pending delete REUSES the original purge timestamp.
      // Stamping now() again would silently widen the deletion to records the
      // (possibly live) target created after the first attempt.
      const prior = pendingDeletes[desc.key];
      const ts = prior ? prior.purgeTs : now();
      if ((purged[desc.id] || 0) < ts) { purged[desc.id] = ts; savePurged(); }
      applyPurgesLocally();
      pendingDeletes[desc.key] = {
        key: desc.key, id: desc.id, name: desc.name || '', purgeTs: ts,
        legacyRk: desc.legacyRk != null ? desc.legacyRk : (prior ? prior.legacyRk : null),
        shardDev: desc.shardDev || (prior && prior.shardDev) || null,
        shardBoards: (desc.shardBoards && desc.shardBoards.length) ? desc.shardBoards : ((prior && prior.shardBoards) || []),
      };
      savePendingDeletes();
    }
    schedulePublish();                 // legacy dual-write (old clients) — best-effort
    scheduleShardPublish(true);        // the purge rides the VERIFIED shard payloads
    if (shards && isPurge) {
      // The purge is destructive authority: it must be durably, read-back-verifiably
      // on the server BEFORE any board is destroyed. If this device vanished after
      // deleting the boards but before publishing the purge, a peer's replicated
      // copies would resurrect the "deleted" identity.
      await shards.flush();
      const st = shards.syncState();
      // Refusal ≠ rollback. The purge intent is durable locally and MUST stay
      // armed: a partially-landed publish may already carry it on some verified
      // payloads, so un-setting purged[id] here would let our own boards re-teach
      // it to us later while the user believes nothing happened. The honest
      // contract is: deletion is PENDING — the entry above completes it (boards
      // removed, queue cleared) from poll() once a publish verifies.
      if (st.unsynced || st.lastError) return { ok: false, pending: true, error: st.lastError || 'purge not yet durably published' };
      const c = await completeDelete(pendingDeletes[desc.key]);
      if (!c.done) return { ok: false, pending: true, deleted: c.deleted, error: 'board cleanup incomplete — retrying automatically' };
      return { ok: true, deleted: c.deleted };
    } else if (shards) {
      await shards.flush();            // unresolved sets: board cleanup only, nothing destructive to gate
    }
    const r = await removeDeviceBoards(desc);
    rebuild(); cbMerged();
    dbg('PROG', `deleted device ${desc.name || desc.key}: ${r.deleted} board(s) removed${r.failed.length ? ` (${r.failed.length} failed)` : ''}`);
    return r.failed.length ? { ok: false, deleted: r.deleted, error: 'some boards could not be removed — try again' } : { ok: true, deleted: r.deleted };
  }

  // Before destroying a deleted identity's boards, capture every record it wrote
  // AFTER the purge — IMMEDIATELY, bypassing the ordinary 10-minute replication
  // stability gate. That gate exists to stop write churn from a live peer's
  // moving position; it must never govern destructive cleanup, where the target's
  // boards may hold the ONLY copy of legitimate post-purge listening. Returns
  // true only when any captured record is verifiably published in OUR shards
  // (read-back), or nothing needed capturing.
  async function preservePostPurgeRecords(entry) {
    if (!entry.id) return true;
    let changed = false;
    for (const src of peerBoards.concat(shardBoards)) {
      if (!src || src.id !== entry.id) continue;
      for (const book in (src.books || {})) {
        const bk = src.books[book].bk;
        if (!bk || (bk.ts || 0) <= entry.purgeTs) continue;    // at/before the purge = deleted data
        const cur = replica.books[book];
        if (cur && cur.bk && (cur.bk.ts || 0) >= (bk.ts || 0)) continue;
        replica.books[book] = Object.assign({}, cur, {
          bk: { t: bk.t, o: bk.o || 0, cum: bk.cum || 0, tot: bk.tot || 0, ts: bk.ts || 0, origin: entry.id, name: src.name || '' },
        });
        changed = true;
      }
    }
    if (!changed) return true;
    saveReplica();
    scheduleShardPublish(true);
    if (!shards) return true;
    await shards.flush();
    const st = shards.syncState();
    return !st.unsynced && !st.lastError;
  }

  // Finish a (possibly long-pending) deletion: remove the identity's boards using
  // the FRESHEST inventory we have (boards can change while pending). The queue
  // entry — and with it the ORIGINAL purge timestamp — is cleared ONLY when every
  // board is confirmed gone; a partial cleanup keeps the transaction open (with
  // the remaining boards) so the next poll retries and a re-pressed Delete stays
  // an idempotent continuation, never a wider deletion.
  async function completeDelete(entry) {
    if (!(await preservePostPurgeRecords(entry))) {
      dbg('PROG', `delete of ${entry.name || entry.key}: post-purge records not yet verifiably preserved — boards kept`);
      return { done: false, deleted: 0 };
    }
    const cur = devices().find((x) => x.key === entry.key);
    const r = await removeDeviceBoards({
      key: entry.key, id: entry.id,
      legacyRk: cur && cur.legacyRk != null ? cur.legacyRk : entry.legacyRk,
      shardDev: (cur && cur.shardDev) || entry.shardDev,
      shardBoards: (cur && cur.shardBoards && cur.shardBoards.length) ? cur.shardBoards : (entry.shardBoards || []),
    });
    if (r.failed.length) {
      pendingDeletes[entry.key] = Object.assign({}, entry, { legacyRk: r.remainingLegacyRk, shardBoards: r.remainingShardBoards });
      savePendingDeletes();
      dbg('PROG', `delete of ${entry.name || entry.key}: cleanup incomplete (${r.failed.length} board(s) remain) — will retry`);
      return { done: false, deleted: r.deleted };
    }
    delete pendingDeletes[entry.key];
    savePendingDeletes();
    rebuild(); cbMerged();
    dbg('PROG', `deleted device ${entry.name || entry.key}: purge @${entry.purgeTs}; ${r.deleted} board(s) removed`);
    return { done: true, deleted: r.deleted };
  }

  // Poll hook: once the shard writer is settled-and-clean AND a snapshot carrying
  // the current purge map has been handed to it this session (lastShardPub > 0 —
  // a clean state from a session that never published proves nothing), every
  // pending deletion completes automatically. If the writer is still unsettled,
  // nudge it (flush) so healing connectivity finishes the job without user action.
  async function completePendingDeletes() {
    if (!shards || !Object.keys(pendingDeletes).length) return;
    if (!lastShardPub) { scheduleShardPublish(true); }
    let st = shards.syncState();
    if (st.unsynced || st.lastError) {
      await shards.flush();
      st = shards.syncState();
      if (st.unsynced || st.lastError) return;   // still failing — next poll retries
    }
    for (const k of Object.keys(pendingDeletes)) {
      try { await completeDelete(pendingDeletes[k]); } catch { /* next poll retries */ }
    }
  }

  // Reconnect / backgrounding: push everything out NOW (the rate-limit window
  // doesn't apply when we may be about to lose the network or get suspended).
  function flush() {
    if (dirty) publish();
    scheduleShardPublish(true);
    if (shards) shards.flush();
  }
  // SURFACE: the app-visible sync state — degraded shard subtrees and unverified
  // writes are reported, never silently absorbed. `stuck` is the DISPLAY signal:
  // a write in flight or a <30s-old dirty flag is normal heartbeat, not a warning
  // (the Diagnostics row flickered "syncing" on every publish without this).
  function syncState() {
    const s = shards ? shards.syncState() : { unsynced: false, lastError: null, degraded: [], pendingForMs: 0 };
    const legacyStuck = dirty && dirtySince && (Date.now() - dirtySince > 30000);
    return {
      unsynced: dirty || s.unsynced,
      stuck: legacyStuck || !!s.lastError || (s.pendingForMs || 0) > 30000,
      lastError: s.lastError, degraded: s.degraded, legacyDirty: dirty, stats: shardStats,
    };
  }
  // Piggyback an external read trigger. Returns the poll promise so callers that
  // NEED the merged data current (syncqueue's conflict decisions) can await it.
  function refresh() { return active ? poll() : Promise.resolve(); }

  return {
    init, hydrate, setSeed, setActive, flush, refresh, syncState,
    devices, adoptIdentity, deleteDevice,
    pendingDeletes: () => Object.assign({}, pendingDeletes),
    recordTrack, recordBook, clearBook, resetBook,
    bookRecord, myBookRecord, trackRecord, trackPct, isMine, myId,
    // Test-only hook (mirrors Plex._test): reach the pure merge/serialize/trim
    // internals + closure state so test/progress.test.js can exercise the LWW
    // logic without a network or the poll() timer. Not used by the app.
    _test: {
      reset() {
        mine = { v: 1, books: {} }; replica = { v: 1, books: {} }; purged = {}; pendingDeletes = {};
        peerBoards = []; shardBoards = []; merged = { books: {} };
        legacyInv = []; shardInv = {};
        prunedSession = false; dirty = false; dirtySince = 0; lastShardPub = 0;
        if (pubTimer) { clearTimeout(pubTimer); pubTimer = null; }
        if (shardPubTimer) { clearTimeout(shardPubTimer); shardPubTimer = null; }
        if (shards) shards._test.reset();
      },
      setPeers(p) { peerBoards = p || []; },
      mineBooks: () => mine.books,
      replicaBooks: () => replica.books,
      purgedMap: () => purged,
      rebuild() { rebuild(); return merged; },
      applyPeerResets, cachePeerBoards, restorePeerBoards, hydrate,
      serialize, packAll,
      poll, publish, entriesForPublish, adoptStableForeign, shardEntriesToBoards,
      shards: () => shards,
      MAX_BOOKS, MAX_JSON, STABLE_MS,
    },
  };
})();

// Expose on window (top-level `const Progress` is a lexical global, not window.Progress);
// net.js/syncqueue.js read `window.Progress`.
if (typeof window !== 'undefined') window.Progress = Progress;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Progress;
