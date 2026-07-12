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
  const LS = { board: 'pb_progBoardKey', mine: 'pb_progMine' };

  let boardKey = null, seed = null;
  let mine = load();                  // our OWN authored records (persisted, survives offline)
  let merged = { books: {} };         // merged view across mine + peers (the app's source of truth)
  let peerBoards = [];
  let pubTimer = null, pollTimer = null, active = false, dirty = false;
  let cbMerged = () => {};

  const now = () => (typeof Plex !== 'undefined' && Plex.serverNow ? Plex.serverNow() : Date.now());
  const myId = () => (typeof Plex !== 'undefined' && Plex.getClientId ? Plex.getClientId() : 'me');
  const shortId = () => String(myId() || 'dev').replace(/[^a-z0-9]/gi, '').slice(-8);
  const myName = () => (typeof Presence !== 'undefined' && Presence.name ? Presence.name() : 'device');
  const dbg = (t, m) => { if (typeof PBDebug !== 'undefined') PBDebug.log(t, m); };

  function load() {
    try { const o = JSON.parse(localStorage.getItem(LS.mine) || 'null'); if (o && o.books) return o; } catch {}
    return { v: 1, books: {} };
  }
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
  // Erase a book's records everywhere WE can (Reset Progress). Peers still hold
  // their own; a supseding write from us can't outrank a genuinely newer peer edit.
  function clearBook(book) {
    if (mine.books[book]) { delete mine.books[book]; saveMine(); rebuild(); schedulePublish(); }
  }

  // ---- publish (own board only, debounced) ----------------------------------
  function schedulePublish() { dirty = true; if (pubTimer || !active) return; pubTimer = setTimeout(() => { pubTimer = null; publish(); }, PUB_DEBOUNCE); }
  async function ensureBoard() {
    if (boardKey) return boardKey;
    const saved = localStorage.getItem(LS.board);
    if (saved) { boardKey = saved; return boardKey; }
    if (!seed) return null;
    try { boardKey = await Plex.createPlaylist(PREFIX + shortId(), seed); if (boardKey) localStorage.setItem(LS.board, boardKey); }
    catch (e) { dbg('PROG', 'board create failed'); }
    return boardKey;
  }
  async function publish() {
    if (!dirty) return;
    const rk = await ensureBoard();
    if (!rk) return;
    try {
      const st = await Plex.setPlaylistSummary(rk, serialize());
      if (st >= 200 && st < 300) dirty = false;
      else if (st === 404) { boardKey = null; localStorage.removeItem(LS.board); }   // gone → recreate; transient → keep board, retry (no churn)
    } catch (e) { dbg('PROG', 'publish failed ' + (e && e.message)); }
  }
  function packAll() {
    const o = { v: 1, id: myId(), name: myName(), books: {} };
    for (const k in mine.books) {
      const b = mine.books[k]; const e = {};
      if (b.bk) e.bk = b.bk;
      if (b.tr && Object.keys(b.tr).length) e.tr = b.tr;
      if (e.bk || e.tr) o.books[k] = e;
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
      const boards = await Plex.listBoards(PREFIX);
      peerBoards = boards.map((b) => { try { return JSON.parse(b.summary); } catch { return null; } })
        .filter((p) => p && p.id && p.id !== myId());
      rebuild(); cbMerged();
    } catch (e) { /* transient — next tick retries */ }
  }
  function rebuild() {
    const m = { books: {} };
    const sources = [packAll()].concat(peerBoards);   // ours first (authored by myId), then peers
    for (const src of sources) {
      const by = src.id, name = src.name;
      for (const bk in (src.books || {})) {
        const dst = m.books[bk] || (m.books[bk] = { bk: null, tr: {} });
        const s = src.books[bk];
        if (s.bk && (!dst.bk || (s.bk.ts || 0) > (dst.bk.ts || 0))) dst.bk = Object.assign({}, s.bk, { by, name });
        if (s.tr) for (const tr in s.tr) {
          const r = s.tr[tr], ts = r[2] || 0;
          if (!dst.tr[tr] || ts > (dst.tr[tr].ts || 0)) dst.tr[tr] = { o: r[0] || 0, d: r[1] || 0, ts, by, name };
        }
      }
    }
    merged = m;
  }

  // ---- read accessors (app.js display) --------------------------------------
  function bookRecord(book) { const b = merged.books[book]; return b && b.bk ? b.bk : null; }     // {t,o,cum,tot,ts,by,name}
  function trackRecord(book, track) { const b = merged.books[book]; return b && b.tr[track] ? b.tr[track] : null; }  // {o,d,ts,by,name}
  function trackPct(book, track, durMs) {
    const r = trackRecord(book, track); if (!r) return null;
    const d = r.d || durMs || 0; return d ? Math.min(100, Math.round((r.o / d) * 100)) : null;
  }
  const isMine = (rec) => !!rec && rec.by === myId();

  // ---- lifecycle ------------------------------------------------------------
  function init({ onMerged } = {}) { if (onMerged) cbMerged = onMerged; rebuild(); }
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
    init, setSeed, setActive, flush, refresh,
    recordTrack, recordBook, clearBook,
    bookRecord, trackRecord, trackPct, isMine, myId,
    // Test-only hook (mirrors Plex._test): reach the pure merge/serialize/trim
    // internals + closure state so test/progress.test.js can exercise the LWW
    // logic without a network or the poll() timer. Not used by the app.
    _test: {
      reset() { mine = { v: 1, books: {} }; peerBoards = []; merged = { books: {} }; },
      setPeers(p) { peerBoards = p || []; },
      mineBooks: () => mine.books,
      rebuild() { rebuild(); return merged; },
      serialize, packAll,
      MAX_BOOKS, MAX_JSON,
    },
  };
})();

// Expose on window (top-level `const Progress` is a lexical global, not window.Progress);
// net.js/syncqueue.js read `window.Progress`.
if (typeof window !== 'undefined') window.Progress = Progress;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Progress;
