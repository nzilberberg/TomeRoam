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
  const DEFAULT_BUF_MAX = 512 * 1024 * 1024;         // 512 MB default persistent-buffer budget (settable 32 MB – 4 GB on the Downloads screen)

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

  // Hooks the host (app.js) wires in via init(): shouldYield = "the live audio
  // element urgently needs the bandwidth" (downloads pause rather than contend —
  // the .35/.36 banking lesson: a background fetch racing the element's own
  // stream truncates it on iOS → bogus `ended` / code=4); currentTrack = the
  // ratingKey the element is playing (never evict its bytes out from under it).
  const hooks = { shouldYield: null, currentTrack: null, protectTracks: null };
  const playingTrack = () => { try { const c = hooks.currentTrack && hooks.currentTrack(); return c != null ? String(c) : null; } catch { return null; } };
  // Broad protection for BUDGET eviction: the playing track plus everything the
  // host says is about to play (the look-ahead window). Oldest-first eviction
  // would otherwise eat the nearest-ahead files first — within one book they're
  // the OLDEST writes — so deep prefetch would evict its own runway.
  const protectedTracks = () => {
    const s = new Set();
    const cur = playingTrack(); if (cur) s.add(cur);
    try { const arr = hooks.protectTracks && hooks.protectTracks(); if (arr) for (const k of arr) s.add(String(k)); } catch {}
    return s;
  };
  // Tell the SW to forget its 1-entry blob cache for a deleted track, so it can't
  // keep serving removed (or stale re-downloaded) audio for its whole lifetime.
  const swEvict = (track) => { try { const c = navigator.serviceWorker && navigator.serviceWorker.controller; if (c) c.postMessage({ type: 'EVICT_DL', track: String(track) }); } catch {} };

  // ---- settings -------------------------------------------------------------
  // BYTE LIMITS ARE NOT 32-BIT SAFE. A download/buffer cap is a byte count, and the
  // capacities this app offers reach 4 GB (2^32) and 16 GB (2^34) — far past the
  // signed-32-bit range. Bitwise operators (`| 0`, `>>>`, `~`, `<<`) coerce their
  // operand to a signed 32-bit int, which silently CORRUPTS these values: 2 GB
  // wraps to a negative number (then every capacity check `need <= max` fails, so
  // NO download can start), and 4/8/16 GB truncate to 0 (which then reads back as
  // the default via `0 || DEFAULT`, so the user's larger choice is silently ignored).
  // => never route a byte quantity through a bitwise op; parse and validate as a
  // plain non-negative safe integer. `parseByteLimit` also HEALS values already
  // written by an earlier bitwise setter: a stored negative or 0 is treated as
  // invalid and falls back to the default, so a device that previously "chose 2 GB"
  // and bricked its downloads self-repairs on the next read.
  const parseByteLimit = (raw, dflt) => {
    const v = Math.trunc(Number(raw));
    return (Number.isSafeInteger(v) && v > 0) ? v : dflt;
  };
  const wifiOnly = () => { try { return localStorage.getItem(LS.wifi) !== '0'; } catch { return true; } };
  const setWifiOnly = (on) => { try { localStorage.setItem(LS.wifi, on ? '1' : '0'); } catch {} if (on === false) pump(); };
  const maxBytes = () => { try { return parseByteLimit(localStorage.getItem(LS.max), DEFAULT_MAX); } catch { return DEFAULT_MAX; } };
  const setMaxBytes = (n) => { const v = parseByteLimit(n, null); if (v != null) { try { localStorage.setItem(LS.max, String(v)); } catch {} } notify(); };
  const bufMaxBytes = () => { try { return parseByteLimit(localStorage.getItem(LS.bufMax), DEFAULT_BUF_MAX); } catch { return DEFAULT_BUF_MAX; } };
  const setBufMaxBytes = (n) => { const v = parseByteLimit(n, null); if (v != null) { try { localStorage.setItem(LS.bufMax, String(v)); } catch {} } evictBuffer(); notify(); };

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

  // Returns true when the track's bytes are durably local afterwards (persisted
  // now, already buffered, or pinned as a download) — the banking scheduler uses
  // this to decide whether it still needs to hold a RAM copy.
  async function bufferTrack(book, track, blob) {
    if (!available() || !blob) return false;
    const k = String(track);
    if (dlTracks.has(k)) return true;                 // pinned download wins — don't duplicate
    if (bufTracks.has(k)) { const m = bufMeta.get(k); if (m) { m.ts = Date.now(); Store.putBuf({ track: k, book: String(book), size: m.size, ts: m.ts }); } return true; }
    // Buffering used to skip the quota check the download loop does, so it could
    // push past the device quota and fail on commit — the most likely trigger for
    // the silent-loss below. Gate it up front.
    if (!(await quotaFits(blob.size))) { dbg('DL', `buffer skip — device storage full track=${k}`); return false; }
    // Persist audio FIRST; report failure to the caller. Store.putAudio resolves
    // FALSE (not a rejection) when the transaction aborts (quota) — so a bare
    // try/catch could NOT see the failure and we'd mark the track buffered with
    // nothing on disk. Banking then drops its RAM copy → the SW's ./__dl/ path
    // later has no bytes → silent no-audio. Only proceed on a confirmed write.
    if (!(await Store.putAudio(k, book, blob, 'buffer'))) { dbg('DL', `buffer persist failed (audio) track=${k}`); return false; }
    // Race guard: a concurrent force-download of this same book can pin this track
    // (dlTracks.add) during the await above — banking and the download fetching the
    // same tracks. If it won, this track is a download now; do NOT also add it to
    // the buffer set/index. That dual membership is what left tracks stuck blue
    // after "Remove download" (remove() then skipped them). Defer to the download —
    // its copy plays the same bytes, and this avoids the wasteful double-fetch.
    if (dlTracks.has(k)) return true;
    const rec = { track: k, book: String(book), size: blob.size, ts: Date.now() };
    if (!(await Store.putBuf(rec))) {
      // The index write failed after the blob landed → roll the blob back so it
      // isn't a dangling (indexed-nowhere) orphan, and report not-buffered.
      await Store.delAudio(k);
      dbg('DL', `buffer persist failed (index) track=${k} — rolled back audio`);
      return false;
    }
    bufTracks.add(k); bufMeta.set(k, { size: rec.size, ts: rec.ts }); bufBytes += rec.size;
    await evictBuffer(k);
    notify(book);
    return true;
  }

  // Persisted size of one buffered track (0 if not in the buffer) — the banking
  // look-ahead budget counts disk bytes now, not just RAM.
  const bufferedSize = (track) => { const m = bufMeta.get(String(track)); return m ? (m.size || 0) : 0; };

  // ---- owned async persistence cleanup ---------------------------------------
  // dropBuffered/demoteBuffer remove in-memory buffer state SYNCHRONOUSLY (banking
  // needs the budget freed immediately), but the IndexedDB deletes are async and
  // can FAIL (Store.del resolves FALSE on a failed transaction — not a rejection).
  // A failed delete leaves an orphaned blob the app believes it removed. So every
  // delete is owned: a layer that fails to delete is queued PER-LAYER and drained
  // on a backoff timer + on reconnect + at next startup's orphan sweep.
  //
  // WHY per-layer (Map<key, Set<layer>>, not a bare key Set): demoteBuffer deletes
  // ONLY the `buf` index — the audio blob is now owned by the pinned download and
  // MUST stay. A key-only retry would re-delete BOTH layers and destroy the
  // download's audio. The Set records exactly which layers still owe a delete.
  const pendingCleanup = new Map();   // key -> Set<'audio'|'buf'>
  function queueCleanup(k, layer) {
    k = String(k);
    let s = pendingCleanup.get(k);
    if (!s) { s = new Set(); pendingCleanup.set(k, s); }
    s.add(layer);
  }
  // THE single deletion path (dropBuffered/demoteBuffer/evictBuffer/clearBuffer/
  // remove/init all route here). Owns each promise; a layer that resolves false is
  // queued for retry. Returns the settle promise so callers that want to await do.
  function removePersisted(k, layers) {
    k = String(k);
    const jobs = [];
    if (layers.indexOf('audio') >= 0) jobs.push(Store.delAudio(k).then((ok) => { if (!ok) { queueCleanup(k, 'audio'); dbg('DL', `cleanup deferred key=${k} layer=audio`); } }));
    if (layers.indexOf('buf') >= 0) jobs.push(Store.delBuf(k).then((ok) => { if (!ok) { queueCleanup(k, 'buf'); dbg('DL', `cleanup deferred key=${k} layer=buf`); } }));
    return Promise.allSettled(jobs).then(() => { scheduleCleanupRetry(); });
  }
  // Backoff drain: earlier code retried SYNCHRONOUSLY right after firing a delete,
  // before its async result was known, so it could never see the just-failed one.
  // Instead schedule a real timer; re-arm while anything is still pending.
  let cleanupTimer = null;
  const CLEANUP_RETRY_MS = 15000;
  function scheduleCleanupRetry() {
    if (cleanupTimer || !pendingCleanup.size) return;
    cleanupTimer = setTimeout(() => { cleanupTimer = null; void drainCleanup(); }, CLEANUP_RETRY_MS);
  }
  async function drainCleanup() {
    if (!pendingCleanup.size) return;
    const entries = [...pendingCleanup.entries()];
    pendingCleanup.clear();
    for (const [k, layers] of entries) await removePersisted(k, [...layers]);   // re-failures self-requeue + reschedule
  }

  // Targeted single-track eviction for the banking scheduler's proximity-priority
  // path (a skip-back leaves far-ahead files squatting the look-ahead budget so
  // the nearer gap can't buffer). Deliberately uses the NARROW protection —
  // pinned downloads and the playing track — not the look-ahead window, since
  // the caller is evicting window files on purpose. Accounting updates
  // synchronously so budgets re-check immediately; IDB deletes are best-effort.
  function dropBuffered(track) {
    const k = String(track);
    if (!bufTracks.has(k) || dlTracks.has(k) || k === playingTrack()) return false;
    const m = bufMeta.get(k);
    bufTracks.delete(k); bufMeta.delete(k); if (m) bufBytes = Math.max(0, bufBytes - m.size);
    void removePersisted(k, ['audio', 'buf']);   // owned async cleanup; a failed layer self-queues + schedules a retry
    swEvict(k);
    dbg('DL', `buffer dropped (proximity) track=${k}`);
    return true;
  }

  // Pure: which tracks to evict (oldest-first) to get under `max`. `keep` (a
  // single key or a Set of keys) is never evicted.
  function evictionPlan(entries, bytes, max, keep) {
    const out = [];
    if (bytes <= max) return out;
    const prot = keep instanceof Set ? keep : new Set(keep != null ? [String(keep)] : []);
    let b = bytes;
    const order = entries.slice().sort((a, c) => (a[1].ts || 0) - (c[1].ts || 0));   // oldest first
    for (const [k, m] of order) { if (b <= max) break; if (prot.has(String(k))) continue; out.push(k); b -= (m.size || 0); }
    return out;
  }
  // Drop oldest buffered tracks until under budget. Never evicts `keep` (the
  // just-written track) NOR the track the audio element is CURRENTLY playing —
  // buffered tracks play through the SW from these very bytes, so evicting the
  // playing one 404s its next range request mid-listen.
  async function evictBuffer(keep) {
    const prot = protectedTracks();
    if (keep != null) prot.add(String(keep));
    const plan = evictionPlan([...bufMeta.entries()], bufBytes, bufMaxBytes(), prot);
    for (const k of plan) {
      const m = bufMeta.get(k); if (!m) continue;
      bufTracks.delete(k); bufMeta.delete(k); bufBytes = Math.max(0, bufBytes - m.size);
      void removePersisted(k, ['audio', 'buf']);   // shared owned deletion path
      swEvict(k);
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
    removePersisted(k, ['buf']);   // audio blob stays (owned by the download now) — only the buf index goes; owned so a rejection can't leak
  }

  async function clearBuffer() {
    if (!available()) return;
    // Explicit user action — only the currently-playing track's bytes survive
    // (it's being served from them); the look-ahead window does NOT (narrow, not
    // protectedTracks(), or "Clear buffer" would silently keep the next hour).
    const cur = playingTrack();
    const prot = cur ? new Set([cur]) : new Set();
    for (const k of [...bufTracks]) {
      if (prot.has(k)) continue;
      const m = bufMeta.get(k);
      bufTracks.delete(k); bufMeta.delete(k); if (m) bufBytes = Math.max(0, bufBytes - m.size);
      void removePersisted(k, ['audio', 'buf']);   // shared owned deletion path
      swEvict(k);
    }
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
  // the Wi-Fi confirm modal when needed.
  function request() {
    return decideStart(wifiOnly(), unmetered());   // UI acts on this, then calls start()/queueFor()
  }
  // start() = user chose to download NOW → force (bypass the Wi-Fi gate; an explicit
  // action shouldn't be second-guessed). queueFor() = user chose to wait for Wi-Fi.
  function start(book, meta) { enqueue(book, meta, true); pump(); }
  function queueFor(book, meta) { enqueue(book, meta, false); pump(); }

  function enqueue(book, meta, force) {
    const k = String(book);
    const existing = queue.find((e) => e.book === k);
    if (existing) {
      // "Download now" on an already-queued-for-Wi-Fi book upgrades it past the
      // gate (it used to be silently ignored).
      if (force && !existing.force) { existing.force = true; saveQueue(); pump(); }
      return;
    }
    if (isDownloaded(k) || current === k) return;
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
      // Remember the track list on the state so a CANCEL can clean up partial
      // blobs even though no `dl` index record exists yet (they used to leak:
      // invisible, uncounted, undeletable).
      setState(book, { trackRks: tracks.map((t) => String(t.ratingKey)) });
      let done = 0, bytes = 0;
      for (const t of tracks) {
        if (!current || abortCur.signal.aborted) throw new Error('cancelled');
        const k = String(t.ratingKey);
        const local = await Store.getAudioRec(k);
        if (local && local.blob) {
          // Already local (a prior download attempt OR a persisted buffer copy).
          // Pin it as a download (blue), demote it out of the evictable buffer,
          // and COUNT its bytes (a resumed book's size used to omit them, so the
          // usage meter and a later remove() subtracted the wrong amount).
          bytes += local.size || 0;
          dlTracks.add(k); demoteBuffer(k);
          done++; setState(book, { done, bytes }); continue;
        }
        // Playback first: wait out any moment the live audio element urgently
        // needs the bandwidth (never race it — see the hooks comment).
        await yieldToPlayback(abortCur.signal);
        const { blob } = await fetchAudioBlob(Plex.streamUrl(t.partKey), {
          signal: abortCur.signal,
          sizeHint: t.size,
          onProgress: (recv, tot) => { if (tot) setTrackProgress(book, k, Math.min(1, recv / tot)); },
          gate: () => yieldToPlayback(abortCur.signal),
        });
        // Only count/mark this track downloaded on a CONFIRMED write. A silent
        // failure (Store.putAudio → false, e.g. quota abort) used to still advance
        // done/dlTracks/usedBytes and could label the whole book downloaded with
        // nothing on disk. Fail the download instead so the user sees it.
        if (!(await Store.putAudio(k, book, blob, 'download'))) throw new Error('Could not save to device storage — it may be full.');
        dlTracks.add(k); demoteBuffer(k);
        curDl = { track: null, frac: 0 };            // this track is now 100% (via dlTracks)
        bytes += blob.size; done++; usedBytes += blob.size;
        setState(book, { done, bytes });
      }
      curDl = { track: null, frac: 0 };
      // The index write is what makes the book "downloaded" and survives restart.
      // If it fails, don't claim done — the blobs are on disk but unindexed, so the
      // next launch's orphan sweep reclaims them (honest: the download didn't stick).
      if (!(await Store.putDl({
        book: String(book), title: (meta && meta.title) || '', author: (meta && meta.author) || '',
        thumb: (meta && meta.thumb) || null, tracks: tracks.map((t) => String(t.ratingKey)),
        size: bytes, ts: Date.now(),
      }))) throw new Error('Could not save the download index — device storage may be full.');
      setState(book, { status: 'done', done: total, total, size: bytes });
      dbg('DL', `done book=${book} ${(bytes / 1048576).toFixed(0)}MB`);
    } catch (e) {
      const msg = (e && e.message) || 'download failed';
      // A mid-track abort surfaces as an AbortError, not our 'cancelled' marker —
      // both are the user cancelling, never an error state (the badge used to
      // flash "!" before remove() caught up).
      const cancelled = msg === 'cancelled' || (e && e.name === 'AbortError') || (abortCur && abortCur.signal.aborted);
      if (cancelled) { setState(book, { status: 'none' }); dbg('DL', `cancelled book=${book}`); }
      else { setState(book, { status: 'error', error: msg }); dbg('DL', `FAIL book=${book} ${msg}`); }
    } finally {
      curDl = { track: null, frac: 0 };
      queue = queue.filter((e) => e.book !== String(book)); saveQueue();
      current = null; abortCur = null;
      pump();   // next in queue
    }
  }

  // Pause while the live audio element urgently needs the bandwidth. Bounded so a
  // permanently-stalled element (dead network — where our fetch is doomed anyway)
  // can't wedge the queue forever.
  async function yieldToPlayback(signal) {
    const y = hooks.shouldYield;
    if (!y) return;
    const t0 = Date.now();
    while (Date.now() - t0 < 45000) {
      if (signal && signal.aborted) throw new Error('cancelled');
      let busy = false; try { busy = !!y(); } catch {}
      if (!busy) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Shared streaming fetch → Blob. THE one byte-loop for both downloads and the
  // banking prefetch (app.js bankOne) — they used to be divergent copies, and only
  // banking had a size cap.
  //   onProgress(received, total)  per chunk (total 0 when unknown)
  //   gate()                       awaited between chunks (downloads yield to playback)
  //   maxBytes                     throw {code:'OVERSIZE'} when the size (known or
  //                                streamed) exceeds it — banking turns this into skipBank
  //   sizeHint                     caller-known size (Plex part size) when the
  //                                response lacks Content-Length
  // Chunks coalesce into an intermediate Blob every ~32 MB so a big track never
  // holds hundreds of MB of Uint8Arrays in RAM (Blobs can be paged to disk —
  // the iOS jetsam guard for single-file M4B books).
  const COALESCE_BYTES = 32 * 1024 * 1024;
  const oversizeErr = () => { const e = new Error('file too large'); e.code = 'OVERSIZE'; e.kind = 'oversize'; return e; };
  async function fetchAudioBlob(url, { signal, onProgress, gate, maxBytes: cap, sizeHint } = {}) {
    const r = await fetch(url, { signal });
    // Tag the outcome so callers can branch (banking: 4xx = give up for the session,
    // 5xx/429 = retry with backoff). Network errors surface as the native fetch
    // TypeError / AbortError — callers key off `.kind`/`.name`/`.code`.
    // Retryable = server-side/transient: 5xx, 429 (rate limit), 408 (request
    // timeout), 425 (too early). Other 4xx (auth/not-found/bad-request) are
    // non-retryable HERE; banking still gives an HTTP skip a fresh chance on
    // reconnect (a stale 401 or a base-switch 404), it just won't hammer now.
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.kind = 'http'; e.status = r.status; e.retryable = (r.status >= 500 || r.status === 429 || r.status === 408 || r.status === 425); throw e; }
    const type = (r.headers.get('content-type') || 'audio/mpeg').split(';')[0];
    const total = parseInt(r.headers.get('content-length') || '0', 10) || sizeHint || 0;
    if (cap && total > cap) { try { if (r.body) await r.body.cancel(); } catch {} throw oversizeErr(); }
    if (!r.body || !r.body.getReader) {
      const blob = await r.blob();
      if (cap && blob.size > cap) throw oversizeErr();
      return { blob, bytes: blob.size, total };
    }
    const reader = r.body.getReader();
    let chunks = [], pending = 0, received = 0;
    for (;;) {
      if (gate) await gate();
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length; pending += value.length;
      if (cap && received > cap) { try { await reader.cancel(); } catch {} throw oversizeErr(); }
      chunks.push(value);
      if (pending >= COALESCE_BYTES) { chunks = [new Blob(chunks, { type })]; pending = 0; }
      if (onProgress) onProgress(received, total);
    }
    return { blob: new Blob(chunks, { type }), bytes: received, total };
  }

  // ---- remove (also = cancel for a queued/in-flight download) ----------------
  async function remove(book) {
    const k = String(book);
    if (current === k && abortCur) { try { abortCur.abort(); } catch {} }
    queue = queue.filter((e) => e.book !== k); saveQueue();
    try {
      const rec = await Store.getDl(k);
      // No dl record yet (cancelled/errored mid-download) → fall back to the
      // track list pump stashed on the state, so partial blobs don't leak.
      const tracks = ((rec && rec.tracks) || stateOf(k).trackRks || []).map(String);
      // Keep as evictable buffer only the CURRENT track and the run AHEAD of it that
      // fits the buffer budget (nearest-first) — the same window banking would hold —
      // so those flip blue→gray with NO re-fetch. Everything else is freed: tracks
      // BEHIND the playhead, tracks PAST the budget, or ALL of them if this book isn't
      // the one playing. (Converting the whole book then evicting to budget didn't
      // trim — the look-ahead protection spans up to 60 tracks, so nothing was
      // evictable → the entire book stayed buffered.)
      const cur = playingTrack();
      const curIdx = cur ? tracks.indexOf(cur) : -1;
      const budget = bufMaxBytes();
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        dlTracks.delete(t);                            // un-pin: no longer "downloaded" (blue)
        if (bufTracks.has(t)) continue;                // already an evictable buffer copy → leave it gray
        const r = await Store.getAudioRec(t);
        if (!r || !r.blob) continue;                   // nothing stored for this track (partial) → nothing to do
        const size = r.size || 0;
        // current track always kept (it's playing through the SW); ahead tracks kept
        // while the buffer budget (counting buffer already held) allows.
        const keepAsBuffer = i === curIdx || (curIdx >= 0 && i > curIdx && bufBytes + size <= budget);
        if (!rec) usedBytes = Math.max(0, usedBytes - size);   // partials were counted as they landed
        if (keepAsBuffer) {
          // Reuse the on-disk blob (no re-fetch, no rewrite) — move it into the buffer
          // tier. Index FIRST: only claim it buffered if the index write succeeds,
          // else free the blob rather than leave it a dangling (unindexed) orphan.
          if (await Store.putBuf({ track: t, book: k, size, ts: Date.now() })) {
            bufTracks.add(t); bufMeta.set(t, { size, ts: Date.now() }); bufBytes += size;
          } else {
            void removePersisted(t, ['audio']); swEvict(t);
          }
        } else {
          void removePersisted(t, ['audio']); swEvict(t);   // outside the window → free it
        }
      }
      if (rec && rec.size) usedBytes = Math.max(0, usedBytes - rec.size);
      await Store.delDl(k);
      notify(k);
    } catch (e) { dbg('DL', 'remove err ' + (e && e.message)); }
    setState(k, { status: 'none', done: 0, total: 0, bytes: 0, size: 0, trackRks: null });
    dbg('DL', `removed book=${k}`);
  }

  // Sign-out: stop the in-flight download quietly (its token is about to be
  // invalid). Queued items stay queued for the next signed-in session.
  function suspend() { if (abortCur) { try { abortCur.abort(); } catch {} } }

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
  async function init(opts) {
    if (opts && opts.shouldYield) hooks.shouldYield = opts.shouldYield;
    if (opts && opts.currentTrack) hooks.currentTrack = opts.currentTrack;
    if (opts && opts.protectTracks) hooks.protectTracks = opts.protectTracks;
    if (!available()) { dbg('DL', 'unavailable (no IndexedDB)'); return; }
    try {
      // Startup reconciliation is BIDIRECTIONAL — an index and its blob can be
      // out of sync in EITHER direction, and both directions lie to the UI:
      //   * audio blob with no index  → a leak (invisible, uncounted, undeletable);
      //   * index with no audio blob  → trackLocal() says "offline" but the SW
      //     ./__dl/ path finds nothing → silent no-audio (the finding-#1 surface).
      // One getAllKeys read powers all three checks (no per-track reads).
      const keys = await Store.audioKeys();
      const audioSet = new Set(keys);

      const rows = await Store.allDl();
      usedBytes = 0;
      for (const r of rows) {
        const trackList = (r.tracks || []).map(String);
        const missing = trackList.filter((tr) => !audioSet.has(tr));
        if (missing.length) {
          // A downloaded book whose blobs aren't all present is broken (legacy
          // false-complete from before writes reported failure, or storage reclaim).
          // Invalidate the record so nothing claims those tracks are offline; the
          // present partials fall through to the orphan sweep below and are freed.
          dbg('DL', `download book=${r.book} missing ${missing.length}/${trackList.length} blob(s) — invalidating record`);
          await Store.delDl(String(r.book));
          continue;
        }
        books[String(r.book)] = { status: 'done', done: trackList.length, total: trackList.length, bytes: r.size || 0, size: r.size || 0, meta: { title: r.title, author: r.author, thumb: r.thumb } };
        for (const tr of trackList) dlTracks.add(tr);
        usedBytes += r.size || 0;
      }
      dbg('DL', `restored ${dlTracks.size} downloaded track(s), ${(usedBytes / 1048576).toFixed(0)}MB`);
      // Persisted buffer index (metadata only). Skip any track that's part of a
      // downloaded book (dl wins) OR whose audio blob is missing (dangling index),
      // then run one eviction pass in case the budget shrank since last session.
      const bufRows = await Store.allBuf();
      bufBytes = 0;
      for (const r of bufRows) {
        const k = String(r.track);
        if (dlTracks.has(k)) { void removePersisted(k, ['buf']); continue; }   // dl wins → drop the stale buf index
        if (!audioSet.has(k)) { void removePersisted(k, ['buf']); dbg('DL', `buf index track=${k} has no blob — dropping dangling index`); continue; }
        bufTracks.add(k); bufMeta.set(k, { size: r.size || 0, ts: r.ts || 0 }); bufBytes += r.size || 0;
      }
      await evictBuffer();
      dbg('DL', `restored ${bufTracks.size} buffered track(s), ${(bufBytes / 1048576).toFixed(0)}MB`);
      // Orphan sweep: audio rows referenced by NEITHER index (leaked partials, or
      // the just-invalidated books above) are reclaimed via the shared owned path.
      let swept = 0;
      for (const key of keys) {
        if (dlTracks.has(key) || bufTracks.has(key)) continue;
        void removePersisted(key, ['audio']); swEvict(key); swept++;
      }
      if (swept) dbg('DL', `swept ${swept} orphaned audio row(s)`);
    } catch (e) { dbg('DL', 'init err ' + (e && e.message)); }
    // Auto-resume queued downloads + drain any deferred cleanup when connectivity
    // returns.
    try { if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', () => pump()); } catch {}
    window.addEventListener('online', () => { pump(); void drainCleanup(); });
    notify();
    pump();   // resume anything queued from a prior session (if Wi-Fi allows)
  }

  return {
    init, available, subscribe, suspend,
    request, start, queueFor, remove,
    stateOf, isDownloaded, isBusy, trackDownloaded, trackProgress, progress, getBlob,
    trackBuffered, trackLocal, bufferTrack, bufferedSize, dropBuffered, clearBuffer, bufferUsage,
    fetchAudioBlob,   // the one shared streaming byte-loop (banking uses it too)
    listDownloaded, storageInfo,
    wifiOnly, setWifiOnly, wifiDetectable, maxBytes, setMaxBytes, bufMaxBytes, setBufMaxBytes, DEFAULT_MAX, DEFAULT_BUF_MAX,
    _test: { decideStart, capFits, frac, unmetered, evictionPlan, parseByteLimit, pendingCleanup, drainCleanup, removePersisted },
  };
})();

if (typeof window !== 'undefined') window.Downloads = Downloads;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Downloads;
