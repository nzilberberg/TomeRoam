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
  const POLL_MS = 20000;              // durable data changes slowly; presence carries the fast path
  const PUB_DEBOUNCE = 4000;          // coalesce a burst of records into one playlist PUT
  const MAX_BOOKS = 16;              // cap books held on our own board (LRU by touch)
  const MAX_JSON = 7000;             // keep the published summary comfortably under Plex's limit
  const LS = { board: 'pb_progBoardKey', mine: 'pb_progMine', peers: 'pb_progPeers' };

  let seed = null;
  let mine = load();                  // our OWN authored records (persisted, survives offline)
  let merged = { books: {} };         // merged view across mine + peers (the app's source of truth)
  let peerBoards = [];
  let pubTimer = null, pollTimer = null, active = false, dirty = false;
  let prunedSession = false;          // one-shot stale-board sweep per app launch
  let cbMerged = () => {};

  const now = () => (typeof Plex !== 'undefined' && Plex.serverNow ? Plex.serverNow() : Date.now());
  const myId = () => (typeof Plex !== 'undefined' && Plex.getClientId ? Plex.getClientId() : 'me');
  const myName = () => (typeof Presence !== 'undefined' && Presence.name ? Presence.name() : 'device');
  const dbg = (t, m) => { if (typeof PBDebug !== 'undefined') PBDebug.log(t, m); };
  // Our own hidden-playlist board (shared primitive in plex.js). Guarded for the
  // Node unit tests, which load this module without plex.js.
  const board = (typeof Plex !== 'undefined' && Plex.makeBoard) ? Plex.makeBoard(PREFIX, LS.board) : null;

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
  function hydrate() { restorePeerBoards(); rebuild(); }
  function saveMine() { try { localStorage.setItem(LS.mine, JSON.stringify(mine)); } catch {} }
  function bookSlot(book) { return mine.books[book] || (mine.books[book] = { bk: null, tr: {}, _ts: 0 }); }
  function touch(book) { const b = mine.books[book]; if (b) b._ts = now(); trim(); }
  function trim() {
    const keys = Object.keys(mine.books);
    if (keys.length <= MAX_BOOKS) return;
    keys.map((k) => [k, mine.books[k]._ts || 0]).sort((a, b) => a[1] - b[1])
      .slice(0, keys.length - MAX_BOOKS).forEach(([k]) => delete mine.books[k]);
  }

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
  function schedulePublish() { dirty = true; if (pubTimer || !active) return; pubTimer = setTimeout(() => { pubTimer = null; publish(); }, PUB_DEBOUNCE); }
  async function publish() {
    if (!dirty || !board) return;
    // board.publish handles ensure/create, and 404 → recreate-next-time vs
    // transient → keep-board (no churn). 2xx = our records are on the server.
    const status = await board.publish(serialize(), () => seed);
    if (status >= 200 && status < 300) dirty = false;
  }
  function packAll() {
    const o = { v: 1, id: myId(), name: myName(), books: {} };
    for (const k in mine.books) {
      const b = mine.books[k]; const e = {};
      if (b.bk) e.bk = b.bk;
      if (b.tr && Object.keys(b.tr).length) e.tr = b.tr;
      if (b.rst) e.rst = b.rst;                       // reset tombstone (see resetBook)
      if (e.bk || e.tr || e.rst) o.books[k] = e;      // publish a tombstone-only book too
    }
    return o;
  }
  // Size-bound the summary: drop the oldest books' per-chapter maps first, then whole
  // books, until it fits — book-level records (small) survive longest.
  function serialize() {
    const o = packAll();
    const order = Object.keys(mine.books).sort((a, b) => (mine.books[a]._ts || 0) - (mine.books[b]._ts || 0));
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
      const boards = await board.readAll();
      const parsed = boards.map((b) => { try { return JSON.parse(b.summary); } catch { return null; } });
      peerBoards = parsed.filter((p) => p && p.id && p.id !== myId());
      cachePeerBoards();   // persist for next launch's first-frame paint (see restorePeerBoards)
      applyPeerResets();   // adopt any peer reset tombstones + drop our own superseded records
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
    for (const p of peerBoards) for (const bk in (p.books || {})) {
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
    const sources = [packAll()].concat(peerBoards);   // ours first (authored by myId), then peers
    // Reset floor per book = the newest tombstone across ALL sources. Any bk/tr record
    // at/before its book's floor predates a reset and is suppressed (see resetBook).
    const floor = {};
    for (const src of sources) for (const bk in (src.books || {})) {
      const r = src.books[bk].rst || 0; if (r > (floor[bk] || 0)) floor[bk] = r;
    }
    for (const src of sources) {
      const by = src.id, name = src.name;
      for (const bk in (src.books || {})) {
        const f = floor[bk] || 0;
        const dst = m.books[bk] || (m.books[bk] = { bk: null, tr: {}, rst: f });
        const s = src.books[bk];
        if (s.bk && (s.bk.ts || 0) > f && (!dst.bk || (s.bk.ts || 0) > (dst.bk.ts || 0))) dst.bk = Object.assign({}, s.bk, { by, name });
        if (s.tr) for (const tr in s.tr) {
          const r = s.tr[tr], ts = r[2] || 0;
          if (ts > f && (!dst.tr[tr] || ts > (dst.tr[tr].ts || 0))) dst.tr[tr] = { o: r[0] || 0, d: r[1] || 0, ts, by, name };
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
  function flush() { if (dirty) publish(); }   // reconnect / backgrounding
  // Piggyback an external read trigger. Returns the poll promise so callers that
  // NEED the merged data current (syncqueue's conflict decisions) can await it.
  function refresh() { return active ? poll() : Promise.resolve(); }

  return {
    init, hydrate, setSeed, setActive, flush, refresh,
    recordTrack, recordBook, clearBook, resetBook,
    bookRecord, myBookRecord, trackRecord, trackPct, isMine, myId,
    // Test-only hook (mirrors Plex._test): reach the pure merge/serialize/trim
    // internals + closure state so test/progress.test.js can exercise the LWW
    // logic without a network or the poll() timer. Not used by the app.
    _test: {
      reset() { mine = { v: 1, books: {} }; peerBoards = []; merged = { books: {} }; },
      setPeers(p) { peerBoards = p || []; },
      mineBooks: () => mine.books,
      rebuild() { rebuild(); return merged; },
      applyPeerResets, cachePeerBoards, restorePeerBoards, hydrate,
      serialize, packAll,
      MAX_BOOKS, MAX_JSON,
    },
  };
})();

// Expose on window (top-level `const Progress` is a lexical global, not window.Progress);
// net.js/syncqueue.js read `window.Progress`.
if (typeof window !== 'undefined') window.Progress = Progress;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Progress;
