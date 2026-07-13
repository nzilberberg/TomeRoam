// downloads.js — offline audiobook downloads (Downloads).
//
// Persists whole books' audio Blobs to IndexedDB (Store 'audio' + 'dl' index) so
// they survive restarts and play with NO network. This is the ONE source of
// truth for download state — every indicator (tile badge, Now-Playing art button,
// files-view lines, Home "Downloaded" carousel, Downloads screen) subscribes here,
// so progress stays in lockstep everywhere.
//
// Model per book: { status: 'none'|'queued'|'downloading'|'done'|'error',
//   done, total, bytes, size, meta:{title,author,thumb,book}, error }.
//
// Wi-Fi gating: audiobooks are big, so downloads default to Wi-Fi-only. Connection
// TYPE (wifi vs cellular) is only knowable via the Network Information API
// (`navigator.connection.type`), which exists on Android/Chromium but NOT iOS
// Safari. So: where we can detect cellular we offer "Queue for Wi-Fi"; where we
// CAN'T (iOS), we let the user choose ("Download now" vs "Queue"). Queued books
// auto-start when connectivity returns.
const Downloads = (() => {
  const LS = { wifi: 'pb_dl_wifionly', max: 'pb_dl_max', queue: 'pb_dl_queue', bufMax: 'pb_buf_max' };
  const DEFAULT_MAX = 4 * 1024 * 1024 * 1024;        // 4 GB downloads cap
  const DEFAULT_BUF_MAX = 250 * 1024 * 1024;         // 250 MB persistent-buffer budget

  const dbg = (t, m) => { if (window.PBDebug) PBDebug.log(t, m); };
  const available = () => !!(window.Store && Store.available && typeof fetch !== 'undefined');

  const books = {};                 // bookKey -> state
  const dlTracks = new Set();       // ratingKeys of DOWNLOADED tracks (blue line, pinned)
  const bufTracks = new Set();      // ratingKeys of persistently-BUFFERED tracks (gray line, evictable)
  let usedBytes = 0;                // total bytes of completed downloads
  let bufBytes = 0;                 // total bytes of persisted buffer
  let subs = [];
  let queue = loadQueue();          // [{ book, meta }]
  let current = null;               // bookKey downloading now
  let abortCur = null;              // AbortController for the in-flight fetch

  // ---- settings -------------------------------------------------------------
  const wifiOnly = () => { try { return localStorage.getItem(LS.wifi) !== '0'; } catch { return true; } };
  const setWifiOnly = (on) => { try { localStorage.setItem(LS.wifi, on ? '1' : '0'); } catch {} if (on === false) pump(); };
  const maxBytes = () => { try { return parseInt(localStorage.getItem(LS.max), 10) || DEFAULT_MAX; } catch { return DEFAULT_MAX; } };
  const setMaxBytes = (n) => { try { localStorage.setItem(LS.max, String(n | 0)); } catch {} notify(); };
  const bufMaxBytes = () => { try { return parseInt(localStorage.getItem(LS.bufMax), 10) || DEFAULT_BUF_MAX; } catch { return DEFAULT_BUF_MAX; } };
  const setBufMaxBytes = (n) => { try { localStorage.setItem(LS.bufMax, String(n | 0)); } catch {} evictBuffer(); notify(); };

  // ---- connection detection (see header) ------------------------------------
  function connType() { try { const c = navigator.connection; return (c && c.type) || null; } catch { return null; } }
  // Can this platform actually tell Wi-Fi from cellular? Only if the Network
  // Information API exposes `.type` (Android/Chromium WebView). Safari/iOS does
  // NOT — so Wi-Fi-only is unenforceable there and we hide it rather than lie
  // (we can't detect a Wi-Fi RETURN either, so a "queue for Wi-Fi" would never
  // resume). Native apps like Prologue use NWPathMonitor; a web app can't.
  function wifiDetectable() { try { return !!(navigator.connection && typeof navigator.connection.type === 'string'); } catch { return false; } }
  // true = unmetered (wifi/ethernet), false = metered (cellular), null = unknown.
  function unmetered() {
    const t = connType();
    if (!t) return null;
    if (t === 'wifi' || t === 'ethernet') return true;
    if (t === 'cellular' || t === 'wimax' || t === 'other') return false;
    return null;
  }
  // Pure decision for a NEW request: { start } → begin now; { confirm } → ask (only
  // when we can DETECT cellular — Android). We can't detect connection type on iOS
  // (no API), so "unknown" just starts: Wi-Fi-only can't be enforced there, and a
  // modal the user can't satisfy (no way to prove Wi-Fi) would trap the download.
  function decideStart(wo, um) {
    if (!wo) return { start: true };
    if (um === true) return { start: true };
    if (um === null) return { start: true };        // can't detect (iOS) → just download
    return { confirm: true };                        // detected cellular → offer to queue for Wi-Fi
  }
  const canStartNow = () => !!decideStart(wifiOnly(), unmetered()).start;

  // ---- state + subscribers --------------------------------------------------
  function stateOf(book) { return books[String(book)] || { status: 'none', done: 0, total: 0, bytes: 0, size: 0 }; }
  function setState(book, patch) {
    const k = String(book);
    books[k] = Object.assign({ status: 'none', done: 0, total: 0, bytes: 0, size: 0 }, books[k], patch);
    notify(k);
  }
  function subscribe(cb) { subs.push(cb); return () => { subs = subs.filter((f) => f !== cb); }; }
  function notify(book) { for (const cb of subs) { try { cb(book || null); } catch {} } }

  const isDownloaded = (book) => stateOf(book).status === 'done';
  const isBusy = (book) => { const s = stateOf(book).status; return s === 'downloading' || s === 'queued'; };
  const trackDownloaded = (track) => dlTracks.has(String(track));
  // Fraction 0..1 for the ring (chapter granularity).
  const frac = (done, total) => (total > 0 ? Math.min(1, done / total) : 0);
  function progress(book) { const s = stateOf(book); return frac(s.done, s.total); }

  const getBlob = (track) => (available() ? Store.getAudio(track) : Promise.resolve(null));

  // ---- persistent buffer (durable write-through of the RAM look-ahead) -------
  // Whatever the banking system decides to buffer is ALSO written here so it
  // survives a restart and plays offline (served, like downloads, via the SW
  // range path). Downloaded tracks are pinned (never here). Evicted oldest-first
  // to stay under bufMaxBytes. The BANKING SELECTION is unchanged — this only
  // persists what it already chose.
  const bufMeta = new Map();        // track -> { size, ts } (no blobs; for eviction sort)
  const trackBuffered = (track) => bufTracks.has(String(track)) && !dlTracks.has(String(track));
  const trackLocal = (track) => dlTracks.has(String(track)) || bufTracks.has(String(track));  // playable offline

  async function bufferTrack(book, track, blob) {
    if (!available() || !blob) return;
    const k = String(track);
    if (dlTracks.has(k)) return;                      // pinned download wins — don't duplicate
    if (bufTracks.has(k)) { const m = bufMeta.get(k); if (m) { m.ts = Date.now(); Store.putBuf({ track: k, book: String(book), size: m.size, ts: m.ts }); } return; }
    try {
      await Store.putAudio(k, book, blob, 'buffer');
      const rec = { track: k, book: String(book), size: blob.size, ts: Date.now() };
      await Store.putBuf(rec);
      bufTracks.add(k); bufMeta.set(k, { size: rec.size, ts: rec.ts }); bufBytes += rec.size;
      await evictBuffer(k);
      notify(book);
    } catch (e) { dbg('DL', 'buffer persist failed ' + (e && e.message)); }
  }

  // Pure: which tracks to evict (oldest-first) to get under `max`, never `keep`.
  function evictionPlan(entries, bytes, max, keep) {
    const out = [];
    if (bytes <= max) return out;
    let b = bytes;
    const order = entries.slice().sort((a, c) => (a[1].ts || 0) - (c[1].ts || 0));   // oldest first
    for (const [k, m] of order) { if (b <= max) break; if (String(k) === String(keep)) continue; out.push(k); b -= (m.size || 0); }
    return out;
  }
  // Drop oldest buffered tracks until under budget. `keep` is never evicted.
  async function evictBuffer(keep) {
    const plan = evictionPlan([...bufMeta.entries()], bufBytes, bufMaxBytes(), keep);
    for (const k of plan) {
      const m = bufMeta.get(k); if (!m) continue;
      try { await Store.delAudio(k); await Store.delBuf(k); } catch {}
      bufTracks.delete(k); bufMeta.delete(k); bufBytes = Math.max(0, bufBytes - m.size);
      dbg('DL', `buffer evicted track=${k}`);
    }
  }

  // A track becoming a pinned download: drop it from the buffer index/accounting.
  // The audio blob stays (now owned by the download), so don't delAudio.
  function demoteBuffer(k) {
    k = String(k);
    if (!bufTracks.has(k)) return;
    const m = bufMeta.get(k);
    bufTracks.delete(k); bufMeta.delete(k); if (m) bufBytes = Math.max(0, bufBytes - m.size);
    Store.delBuf(k);
  }

  async function clearBuffer() {
    if (!available()) return;
    for (const k of [...bufTracks]) { try { await Store.delAudio(k); await Store.delBuf(k); } catch {} }
    bufTracks.clear(); bufMeta.clear(); bufBytes = 0;
    dbg('DL', 'buffer cleared'); notify();
  }
  const bufferUsage = () => bufBytes;

  // ---- cap / quota ----------------------------------------------------------
  const capFits = (used, need, max) => used + need <= max;
  async function quotaFits(need) {
    try { const e = await Store.estimate(); if (e && e.supported && e.quota) return (e.usage || 0) + need <= e.quota * 0.95; } catch {}
    return true;   // unknown quota → allow (cap still applies)
  }
  const trackBytes = (tracks) => tracks.reduce((n, t) => n + (t.size || 0), 0);

  // ---- queue persistence ----------------------------------------------------
  function loadQueue() { try { const q = JSON.parse(localStorage.getItem(LS.queue) || '[]'); return Array.isArray(q) ? q : []; } catch { return []; } }
  function saveQueue() { try { localStorage.setItem(LS.queue, JSON.stringify(queue.map((e) => ({ book: e.book, meta: e.meta, force: e.force })))); } catch {} }

  // ---- per-track byte progress (the growing blue line while downloading) ----
  let curDl = { track: null, frac: 0 };
  let lastProgAt = 0;
  function setTrackProgress(book, track, frac) {
    curDl = { track: String(track), frac };
    const t = Date.now();
    if (t - lastProgAt > 250) { lastProgAt = t; notify(book); }   // throttle repaints
  }
  // 1 = fully downloaded; 0..1 = the track downloading right now; 0 = neither.
  function trackProgress(track) {
    if (dlTracks.has(String(track))) return 1;
    if (curDl.track === String(track)) return curDl.frac;
    return 0;
  }

  // ---- public request/enqueue ----------------------------------------------
  // The book menu / NP button calls this. Returns the decision so the UI can show
  // the Wi-Fi confirm modal when needed. `meta` = { title, author, thumb }.
  function request(book, meta) {
    return decideStart(wifiOnly(), unmetered());   // UI acts on this, then calls start()/queueFor()
  }
  // start() = user chose to download NOW → force (bypass the Wi-Fi gate; an explicit
  // action shouldn't be second-guessed). queueFor() = user chose to wait for Wi-Fi.
  function start(book, meta) { enqueue(book, meta, true); pump(); }
  function queueFor(book, meta) { enqueue(book, meta, false); pump(); }

  function enqueue(book, meta, force) {
    const k = String(book);
    if (isDownloaded(k) || current === k || queue.some((e) => e.book === k)) return;
    queue.push({ book: k, meta: meta || {}, force: !!force }); saveQueue();
    setState(k, { status: 'queued', meta: meta || {}, done: 0, total: (meta && meta.total) || 0 });
    dbg('DL', `queued book=${k} force=${!!force} ${meta && meta.title || ''}`);
  }

  // ---- the download loop ----------------------------------------------------
  async function pump() {
    if (current || !queue.length || !available()) return;
    const head = queue[0];
    // A forced (user-initiated "download now") item ignores the Wi-Fi gate; a
    // queued-for-Wi-Fi item waits until we're on an unmetered connection.
    if (!head.force && !canStartNow()) { dbg('DL', 'holding queue — waiting for Wi-Fi'); return; }
    const { book, meta } = head;
    current = book; abortCur = new AbortController();
    setState(book, { status: 'downloading', done: 0, bytes: 0 });
    dbg('DL', `start book=${book}`);
    try {
      const tracks = (meta && meta.tracks) || await Plex.getAlbumTracks(book);
      const total = tracks.length;
      const need = trackBytes(tracks);
      setState(book, { total, size: need });
      if (!capFits(usedBytes, need, maxBytes())) throw new Error('Not enough download space — free some in Downloads.');
      if (!(await quotaFits(need))) throw new Error('Device storage is full.');
      let done = 0, bytes = 0;
      for (const t of tracks) {
        if (!current || abortCur.signal.aborted) throw new Error('cancelled');
        const k = String(t.ratingKey);
        if (await Store.hasAudio(t.ratingKey)) {
          // Already local (a prior download OR a persisted buffer copy). Pin it as
          // a download (blue) and demote it out of the evictable buffer.
          const m = bufMeta.get(k); if (m) bytes += m.size;
          dlTracks.add(k); demoteBuffer(k);
          done++; setState(book, { done }); continue;
        }
        const blob = await fetchTrack(t, book, abortCur.signal);
        await Store.putAudio(t.ratingKey, book, blob, 'download');
        dlTracks.add(k); demoteBuffer(k);
        curDl = { track: null, frac: 0 };            // this track is now 100% (via dlTracks)
        bytes += blob.size; done++; usedBytes += blob.size;
        setState(book, { done, bytes });
      }
      curDl = { track: null, frac: 0 };
      await Store.putDl({
        book: String(book), title: (meta && meta.title) || '', author: (meta && meta.author) || '',
        thumb: (meta && meta.thumb) || null, tracks: tracks.map((t) => String(t.ratingKey)),
        size: bytes, ts: Date.now(),
      });
      setState(book, { status: 'done', done: total, total, size: bytes });
      dbg('DL', `done book=${book} ${(bytes / 1048576).toFixed(0)}MB`);
    } catch (e) {
      const msg = (e && e.message) || 'download failed';
      if (msg === 'cancelled') { setState(book, { status: 'none' }); dbg('DL', `cancelled book=${book}`); }
      else { setState(book, { status: 'error', error: msg }); dbg('DL', `FAIL book=${book} ${msg}`); }
    } finally {
      curDl = { track: null, frac: 0 };
      queue = queue.filter((e) => e.book !== String(book)); saveQueue();
      current = null; abortCur = null;
      pump();   // next in queue
    }
  }

  async function fetchTrack(t, book, signal) {
    const url = Plex.streamUrl(t.partKey);
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const total = t.size || parseInt(r.headers.get('content-length') || '0', 10) || 0;
    // Stream the body so the file row's blue line grows as bytes arrive. If
    // streaming isn't available, fall back to a whole-blob fetch (no sub-progress).
    if (!total || !r.body || !r.body.getReader) { setTrackProgress(book, t.ratingKey, 0); return await r.blob(); }
    const type = (r.headers.get('content-type') || 'audio/mpeg').split(';')[0];
    const reader = r.body.getReader();
    const chunks = []; let recv = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); recv += value.length;
      setTrackProgress(book, t.ratingKey, Math.min(1, recv / total));
    }
    return new Blob(chunks, { type });
  }

  // ---- remove ---------------------------------------------------------------
  async function remove(book) {
    const k = String(book);
    if (current === k && abortCur) { try { abortCur.abort(); } catch {} }
    queue = queue.filter((e) => e.book !== k); saveQueue();
    try {
      const rec = await Store.getDl(k);
      const tracks = (rec && rec.tracks) || [];
      for (const tr of tracks) { await Store.delAudio(tr); dlTracks.delete(String(tr)); }
      if (rec && rec.size) usedBytes = Math.max(0, usedBytes - rec.size);
      await Store.delDl(k);
    } catch (e) { dbg('DL', 'remove err ' + (e && e.message)); }
    setState(k, { status: 'none', done: 0, total: 0, bytes: 0, size: 0 });
    dbg('DL', `removed book=${k}`);
  }

  // ---- listing / storage info ----------------------------------------------
  async function listDownloaded() {
    if (!available()) return [];
    try { const rows = await Store.allDl(); return rows.sort((a, b) => (b.ts || 0) - (a.ts || 0)); } catch { return []; }
  }
  async function storageInfo() {
    const est = await Store.estimate();
    return { used: usedBytes, max: maxBytes(), quota: est.supported ? est.quota : 0, quotaUsage: est.supported ? est.usage : 0, quotaSupported: !!est.supported };
  }

  // ---- lifecycle ------------------------------------------------------------
  async function init() {
    if (!available()) { dbg('DL', 'unavailable (no IndexedDB)'); return; }
    try {
      const rows = await Store.allDl();
      usedBytes = 0;
      for (const r of rows) {
        books[String(r.book)] = { status: 'done', done: (r.tracks || []).length, total: (r.tracks || []).length, bytes: r.size || 0, size: r.size || 0, meta: { title: r.title, author: r.author, thumb: r.thumb } };
        for (const tr of (r.tracks || [])) dlTracks.add(String(tr));
        usedBytes += r.size || 0;
      }
      dbg('DL', `restored ${rows.length} downloaded book(s), ${(usedBytes / 1048576).toFixed(0)}MB`);
      // Persisted buffer index (metadata only). Skip any track that's part of a
      // downloaded book (dl wins), then run one eviction pass in case the budget
      // shrank since last session.
      const bufRows = await Store.allBuf();
      bufBytes = 0;
      for (const r of bufRows) {
        const k = String(r.track);
        if (dlTracks.has(k)) { Store.delBuf(k); continue; }
        bufTracks.add(k); bufMeta.set(k, { size: r.size || 0, ts: r.ts || 0 }); bufBytes += r.size || 0;
      }
      await evictBuffer();
      dbg('DL', `restored ${bufTracks.size} buffered track(s), ${(bufBytes / 1048576).toFixed(0)}MB`);
    } catch (e) { dbg('DL', 'init err ' + (e && e.message)); }
    // Auto-resume queued downloads when connectivity/Wi-Fi returns.
    try { if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', () => pump()); } catch {}
    window.addEventListener('online', () => pump());
    notify();
    pump();   // resume anything queued from a prior session (if Wi-Fi allows)
  }

  return {
    init, available, subscribe,
    request, start, queueFor, remove,
    stateOf, isDownloaded, isBusy, trackDownloaded, trackProgress, progress, getBlob,
    trackBuffered, trackLocal, bufferTrack, clearBuffer, bufferUsage,
    listDownloaded, storageInfo,
    wifiOnly, setWifiOnly, wifiDetectable, maxBytes, setMaxBytes, bufMaxBytes, setBufMaxBytes, DEFAULT_MAX, DEFAULT_BUF_MAX,
    _test: { decideStart, capFits, frac, unmetered, evictionPlan },
  };
})();

if (typeof window !== 'undefined') window.Downloads = Downloads;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Downloads;
