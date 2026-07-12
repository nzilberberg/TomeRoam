// app.js — UI + playback for the TomeRoam PWA.
(() => {
  const $ = (id) => document.getElementById(id);
  const audio = new Audio();
  audio.preload = 'metadata';

  let ctx = null;        // { album, tracks, idx, coverUrl }
  let writeTimer = null;
  let speedCtl = null;   // transport playback-speed control (see js/speed.js)
  const speedCtls = [];  // all mounted speed controls (transport + now-playing), kept in sync
  const LAST = 'pb_lastPlayed';   // locally-remembered last track (survives reloads)
  // OUR OWN per-book progress {book: {track, pos(ms), ts}}. Plex hides audiobook
  // viewOffset over HTTP, so we can't read our just-played position back from the
  // server — without this, a Continue tile reverts to the janitor's last-synced
  // "server time" the moment we switch away. bestSource() consults this so a tile
  // shows where WE actually got to, immediately and across book switches.
  const MYPROG = 'pb_myProgress';
  let myProgress = {};
  try { myProgress = JSON.parse(localStorage.getItem(MYPROG) || '{}') || {}; } catch { myProgress = {}; }
  // Per-chapter + book progress now lives in the durable, cross-device Progress
  // layer (js/progress.js) — recorded here, merged LWW across peers, read back for
  // the bars/resume. It persists its own localStorage cache, so it survives offline.
  const FRESH = 'pb_freshStart';            // Options: fresh-start-on-auto-advance (default ON)
  const GRACE_KEY = 'pb_resetGrace';        // Options: seconds before a rolled-into chapter's old progress is discarded
  const freshStartOn = () => localStorage.getItem(FRESH) !== '0';
  const resetGraceSec = () => { const v = parseInt(localStorage.getItem(GRACE_KEY) || '', 10); return isNaN(v) ? 10 : v; };
  let rollGuard = null;                     // { track, until } — suppress recording a rolled-into chapter during its grace window

  // ---- media-load resilience (slow/lossy relay) ----------------------------
  let curLoad = null;          // {idx, seekSec, autoplay} — what we're trying to load, for retry
  let loadGen = 0;             // generation token so a stale loadedmetadata can't fire late
  let loadRetry = 0;
  let loadRetryTimer = null;
  const MAX_LOAD_RETRY = 4;

  // ---- track banking + buffered meter --------------------------------------
  // While playing we download whole tracks in the background and hold them in
  // memory: the CURRENT track (its byte-progress paints the light-blue seek
  // meter) plus as many UPCOMING tracks as fit in a BYTE BUDGET, so a chapter
  // boundary plays from the banked copy instead of re-buffering from zero.
  // Budgeting by bytes (not a fixed track count) means we hold many tiny
  // chapters OR a couple of big ones — whatever fills the same allotment. The
  // current track and the immediate next are always banked (seamless boundary)
  // even if that overshoots the budget; look-ahead beyond that stops once the
  // budget is spent. Downloads run ONE AT A TIME (current first). Once a track
  // is banked, a network drop recovers instantly from the in-memory copy
  // (startTrack prefers it). Best-effort: playback never depends on it; a
  // CORS/network failure just leaves the meter unfilled.
  //   NOTE: this runs alongside the audio element's own stream, so it briefly
  //   double-downloads over a slow/metered link. Fine on the home LAN; gating by
  //   connection type belongs with the (separate) bandwidth work.
  // MEMORY SAFETY (iOS): holding whole tracks in memory OOM-crashes iOS Safari
  // ("a problem repeatedly occurred") — a jetsam kill + reload loop. The old
  // 180 MB default plus force-banking the current + next WHOLE files (audiobook
  // chapters are often 100 MB+) blew the budget at the 2nd track boundary. Now:
  //   • never hold a single track bigger than MAX_TRACK_BANK_BYTES (big files
  //     stream instead — no bank, no crash),
  //   • look-ahead is OFF by default (0) and hard-clamped small,
  //   • the previous track is evicted immediately.
  // Banking v2 (.38): the .36 diagnostic PROVED banking's concurrent fetch was
  // starving the live <audio> element on iOS (truncated stream → bogus `ended`).
  // Rebuilt to YIELD to the live element: it only downloads while the audio element
  // is IDLE (it buffers far ahead then suspends — a long, safe window) and aborts
  // the instant the element resumes fetching (see pumpBank gate + the audio
  // 'suspend'/'progress' hooks). Escape hatch: localStorage pb_banking='off'.
  const BANKING_ENABLED = (localStorage.getItem('pb_banking') || 'on') !== 'off';
  const BANK_KEY = 'pb_bankBudget';         // Options: look-ahead budget in MB
  const DEFAULT_BUDGET_MB = 64;             // ≈ one audiobook chapter of prefetch
  const MAX_BUDGET_MB = 256;                // hard clamp on the look-ahead budget
  const MAX_AHEAD = 60;
  const BANK_MIN_AHEAD = 60;                // only prefetch when the live element has ≥ this many seconds buffered ahead (it's not urgently pulling)
  const MAX_TRACK_BANK_BYTES = 90 * 1024 * 1024;   // one chapter (~58MB) fits; pathological huge files still stream
  const bankBudgetBytes = () => Math.min(parseInt(localStorage.getItem(BANK_KEY) || '', 10) || DEFAULT_BUDGET_MB, MAX_BUDGET_MB) * 1024 * 1024;
  const banks = new Map();                  // idx -> { url, bytes } of a fully-downloaded track
  const skipBank = new Set();               // idxs too big to bank — stream them, don't keep retrying
  let bankBook = null;                      // book `banks` belongs to (banks keyed by idx → wipe on book change)
  let bankCtl = null;                       // AbortController for the one in-flight download
  let bankingIdx = -1;                      // idx currently downloading
  let bufferedPct = 0;
  function revokeBank(idx) {
    const b = banks.get(idx);
    if (b) { try { URL.revokeObjectURL(b.url); } catch {} banks.delete(idx); }
  }
  function clearBanks() {
    if (bankCtl) { try { bankCtl.abort(); } catch {} bankCtl = null; }
    bankingIdx = -1;
    for (const idx of [...banks.keys()]) revokeBank(idx);
    skipBank.clear();
  }
  function bankedUrl(idx) { const b = banks.get(idx); return b ? b.url : null; }
  function usedBytes() { let n = 0; for (const b of banks.values()) n += b.bytes; return n; }

  let bufferedShown = -1;   // last whole-percent painted, to skip redundant repaints
  let scrubbing = false;    // true while a seek slider is being dragged — skip heavy library reflows
  let bankPct = 0;          // banking fetch's byte-progress for the CURRENT track (0 = not driving)
  function setBuffered(pct) {
    bufferedPct = Math.max(0, Math.min(100, pct || 0));
    const r = Math.round(bufferedPct);
    if (r === bufferedShown) return;   // fires often; only repaint when the % visibly ticks
    bufferedShown = r;
    const v = r + '%';
    const a = $('pSeek'), b = $('npSeek');
    if (a) a.style.setProperty('--buffered', v);
    if (b) b.style.setProperty('--buffered', v);
  }
  // How much of the CURRENT track the audio element has actually loaded: the end of
  // the buffered range at the playhead as a % of duration. A fully-loaded track —
  // fiber, or an in-memory banked blob — reads ~100 immediately (no fake animation);
  // a slow link fills progressively as the native buffer grows. This is the real
  // signal, so the meter never sits at 0 on a track that's already loaded.
  function nativeBufferedPct() {
    const d = audio.duration, b = audio.buffered;
    if (!d || !isFinite(d) || !b || !b.length) return 0;
    const ct = audio.currentTime;
    let end = 0;
    for (let i = 0; i < b.length; i++) {
      const s = b.start(i), e = b.end(i);
      if (ct >= s - 1 && ct <= e + 1) { end = e; break; }   // the range covering the playhead
      if (e > end) end = e;                                 // else the furthest we've buffered
    }
    return Math.min(100, (end / d) * 100);
  }
  // Blue meter = REAL current-track load: native playback buffer, banking-fetch
  // progress, or 100 for a banked copy — whichever is furthest along.
  function meterPct() {
    if (!ctx) return 0;
    return Math.max(bankPct, nativeBufferedPct(), banks.has(ctx.idx) ? 100 : 0);
  }
  function paintMeter() { setBuffered(meterPct()); }
  // Track change: reset the banking driver and force a repaint for the new track
  // (its native buffer starts empty and grows as it loads).
  function refreshMeter() { bankPct = 0; bufferedShown = -1; paintMeter(); }
  // The next track to download, going forward from where we are. The CURRENT chapter
  // is banked FIRST and always: iOS's native buffer only reaches its own lookahead
  // cap (~34 min), so the tail of a long chapter is offline-orphaned unless we hold
  // the whole file — this closes that gap (and maybeRecoverFromBank() below plays
  // the local copy if the stream dies past the native buffer). Beyond the current
  // chapter, look-ahead is budget-gated by ESTIMATED bytes (duration × 128 kbps CBR)
  // so we stop before overshooting. (v1 skipped the current track to dodge fetch
  // contention; v2's networkState gate handles contention, so we can hold it safely.)
  const estBytes = (t) => Math.round((((t && t.durationMs) || 0) / 1000) * 16000);   // 128 kbps CBR ≈ 16 KB/s
  // Bytes banked for LOOK-AHEAD only — i.e. everything except the current chapter. The
  // current one is a sunk cost (it's playing, held for the offline tail), so counting
  // it against the "Buffer ahead" budget meant a single big current chapter (a 48-min
  // 40 MB one) ate the whole budget → nothing prefetched. The budget is prefetch-ahead.
  function lookAheadUsed() { let n = 0; for (const [idx, b] of banks) if (!ctx || idx !== ctx.idx) n += b.bytes; return n; }
  const MAX_TOTAL_BANK_BYTES = 128 * 1024 * 1024;   // hard OOM guard: total held (current + look-ahead) never exceeds this (the .27-era crash was ~180 MB)
  const fitsTotal = (est) => usedBytes() + est <= MAX_TOTAL_BANK_BYTES;
  // Standard offline-audio model (Audible/Spotify/Audiobookshelf): download whole
  // files, keep a forward window, drop played ones. iOS's native buffer only reaches
  // ~34 min and leaves the tail of a long track unplayable if the link drops — so:
  //   1) fully download the CURRENT file first (closes that tail hole), then
  //   2) prefetch the nearest upcoming file(s) within the budget (which excludes the
  //      current file) + the total OOM cap. Played files are evicted in pumpBank().
  function nextToBank() {
    if (!ctx) return null;
    const budget = bankBudgetBytes();
    if (!banks.has(ctx.idx) && !skipBank.has(ctx.idx) && fitsTotal(estBytes(ctx.tracks[ctx.idx]))) return ctx.idx;   // 1) current, whole
    for (let i = ctx.idx + 1; i < ctx.tracks.length && (i - ctx.idx) <= MAX_AHEAD; i++) {   // 2) forward window
      if (banks.has(i) || skipBank.has(i)) continue;
      const est = estBytes(ctx.tracks[i]);
      return (lookAheadUsed() + est <= budget && fitsTotal(est)) ? i : null;   // nearest unbanked upcoming file, if it fits
    }
    return null;
  }
  // The last file index worth HOLDING: current + the contiguous forward run that fits
  // the TOTAL memory cap (NOT the smaller prefetch budget — a banked file just past the
  // budget window re-enters it as you advance, so dumping it = re-fetch). Already-banked
  // files inside count (actual bytes) and are kept; only files OUTSIDE [ctx.idx, keepMax]
  // (played behind, or a skip's far-ahead island) get evicted. The budget only limits
  // NEW downloads (nextToBank). Streamed/too-big files (skipBank) hold no memory but
  // still span the window so a big streamed file doesn't sever the run behind it.
  function bankWindowMax() {
    if (!ctx) return -1;
    const sizeOf = (i) => banks.has(i) ? banks.get(i).bytes : estBytes(ctx.tracks[i]);
    let keepMax = ctx.idx, total = skipBank.has(ctx.idx) ? 0 : sizeOf(ctx.idx);
    for (let i = ctx.idx + 1; i < ctx.tracks.length && (i - ctx.idx) <= MAX_AHEAD; i++) {
      if (skipBank.has(i)) { keepMax = i; continue; }
      const sz = sizeOf(i);
      if (total + sz <= MAX_TOTAL_BANK_BYTES) { total += sz; keepMax = i; }
      else break;
    }
    return keepMax;
  }
  // Free look-ahead budget for the NEAREST unbanked upcoming file by evicting farther
  // banked look-ahead islands (see the pumpBank call-site note). Farthest-first, stops
  // as soon as the nearest file fits the budget. Only evicts files FARTHER than the
  // target, so it never disturbs the nearer window during ordinary forward playback.
  function freeBudgetForNearest() {
    if (!ctx) return;
    let target = -1, est = 0;
    for (let i = ctx.idx + 1; i < ctx.tracks.length && (i - ctx.idx) <= MAX_AHEAD; i++) {
      if (banks.has(i) || skipBank.has(i)) continue;
      target = i; est = estBytes(ctx.tracks[i]); break;                   // nearest unbanked upcoming
    }
    if (target < 0 || !fitsTotal(est)) return;                           // nothing to prefetch, or won't fit the OOM cap regardless
    const budget = bankBudgetBytes();
    if (lookAheadUsed() + est <= budget) return;                         // already fits → don't evict
    const farther = [...banks.keys()].filter((j) => j > target).sort((a, b) => b - a);   // farthest first
    for (const j of farther) {
      revokeBank(j);
      if (lookAheadUsed() + est <= budget) break;
    }
  }
  // Sequential scheduler. Evict finished chapters, then — ONLY while the live audio
  // element is idle — start the next download. iOS buffers far ahead then suspends
  // (networkState IDLE); banking uses that window and never competes with the
  // element's own fetching, which is what broke resume before. 'suspend' re-invokes
  // this; 'progress' aborts an in-flight bank the moment the element resumes.
  function pumpBank() {
    if (!BANKING_ENABLED || !ctx) return;
    // Evict INTELLIGENTLY: figure out the window we intend to hold (current + the
    // forward run that fits budget/cap — see bankWindowMax, which counts already-banked
    // files toward the budget so they're kept, not re-fetched), then drop only what's
    // OUTSIDE it — played files behind, and far-ahead islands a skip left stranded.
    const keepMax = bankWindowMax();
    for (const idx of [...banks.keys()]) if (idx < ctx.idx || idx > keepMax) revokeBank(idx);
    // PROXIMITY PRIORITY: if the NEAREST unbanked upcoming file can't be prefetched only
    // because FARTHER-ahead files are already banked and fill the look-ahead budget — the
    // classic "skip BACK leaves a stale far-ahead island" case: playing idx2 banks 2-4,
    // then you jump to idx0, and idx3+idx4 squat on the budget so the idx2 you'll hit
    // NEXT never buffers — evict the farthest banked look-ahead files to free budget for
    // the nearer one. Never evicts a file nearer than the one it makes room for, so normal
    // forward advance (no nearer gap) never triggers it → no dump+refetch thrash.
    freeBudgetForNearest();
    // Prefetch only when the live element ISN'T urgently pulling data — i.e. it has a
    // comfortable forward buffer, or is paused. iOS keeps networkState=LOADING and
    // fires 'stalled' (never 'suspend') even when idle on a big buffer, so we key off
    // the ACTUAL forward buffer, not networkState (that made v2 never bank at all).
    // At initial load the buffer is ~0, so this also keeps banking off the wire until
    // the element's own seek/first-fill is done — no contention.
    if (elementBusy()) return;                                            // element needs bandwidth → yield
    if (bankCtl) return;                                                  // one download at a time
    const next = nextToBank();
    if (next != null) bankOne(next);
  }
  // Offline safety net. If the live stream stalls with the forward buffer nearly
  // gone (connection dropped past iOS's native buffer) but the WHOLE current chapter
  // is already banked, switch to the local copy at the reached spot — instant, no
  // waiting for the network. A spurious 'stalled' fired with a full buffer ahead
  // (iOS does this when a download completes) is ignored via the forward-buffer check.
  let stallTimer = null;
  function forwardBufferedSec() {
    const b = audio.buffered, ct = audio.currentTime || 0;
    for (let i = 0; i < b.length; i++) if (ct >= b.start(i) - 1 && ct <= b.end(i) + 1) return b.end(i) - ct;
    return 0;
  }
  // Is the live <audio> element still urgently downloading (so banking should yield)?
  // Idle = paused, OR it has a comfortable forward buffer. "Comfortable" = 60s ahead
  // OR the rest of the current track, whichever is SMALLER — so a SHORT chapter counts
  // as idle once it's buffered to its end (it can never reach 60s ahead). Without this,
  // look-ahead never ran on books of short files (they never buffer 60s ahead).
  function elementBusy() {
    // Still loading the current source (no playable-forward data yet) → the element is
    // actively fetching THIS track. Banking now — above all banking the current track
    // from the SAME Plex URL — contends with that fetch and can fail the element's load
    // (code=4, the .35/.36 contention bug). Yield until it has data, EVEN while paused:
    // a just-switched track is paused-but-loading (startTrack calls pumpBank() before
    // play()), and the old `paused → idle` shortcut let banking hit the current track
    // mid-initial-load — the code=4 seen under rapid track switching.
    if (audio.readyState < 3) return true;                     // < HAVE_FUTURE_DATA — covers initial load + rebuffer
    if (audio.paused) return false;
    const d = audio.duration;
    if (!d || !isFinite(d)) return true;                       // metadata still loading → busy
    const need = Math.min(BANK_MIN_AHEAD, Math.max(0, d - (audio.currentTime || 0) - 1));
    return forwardBufferedSec() < need;
  }
  function stuckOnStream() {
    return ctx && !audio.paused && banks.has(ctx.idx)
      && !(audio.src && audio.src.startsWith('blob:')) && forwardBufferedSec() <= 3;
  }
  function maybeRecoverFromBank() {
    if (stallTimer || !stuckOnStream()) return;
    stallTimer = setTimeout(() => {
      stallTimer = null;
      if (!stuckOnStream()) return;   // recovered on its own
      if (window.PBDebug) PBDebug.log('PLAY', `stream stalled at ${(audio.currentTime || 0).toFixed(1)}s — switching to downloaded copy`);
      toast('Playing from downloaded copy');
      startTrack(ctx.idx, audio.currentTime || (curLoad && curLoad.seekSec) || 0, true);   // startTrack prefers the banked blob
    }, 2500);
  }

  async function bankOne(idx) {
    const t = ctx && ctx.tracks[idx];
    if (!t || !t.partKey) return;
    const ctl = new AbortController(); bankCtl = ctl; bankingIdx = idx;
    try {
      const res = await fetch(Plex.streamUrl(t.partKey), { signal: ctl.signal });
      if (!res.ok || !res.body) return;
      const total = +(res.headers.get('Content-Length') || 0);
      if (total > MAX_TRACK_BANK_BYTES) {                 // too big to hold in memory → stream it, don't bank
        skipBank.add(idx); try { await res.body.cancel(); } catch {}
        return;
      }
      const reader = res.body.getReader();
      const chunks = []; let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        if (received > MAX_TRACK_BANK_BYTES) {             // missing/short Content-Length but it's huge → bail
          skipBank.add(idx); try { await reader.cancel(); } catch {}
          if (ctx && ctx.idx === idx) { bankPct = 0; paintMeter(); }   // won't bank → native buffer drives it
          return;
        }
        chunks.push(value);
        if (total && ctx && ctx.idx === idx) { bankPct = (received / total) * 100; paintMeter(); }   // meter tracks the CURRENT track only
      }
      const blob = new Blob(chunks, { type: res.headers.get('Content-Type') || 'audio/mpeg' });
      banks.set(idx, { url: URL.createObjectURL(blob), bytes: received });
      if (ctx && ctx.idx === idx) paintMeter();   // banks.has(idx) now true → meterPct() = 100
      updateFileRows();                            // this chapter's blue line → full (downloaded)
      if (window.PBDebug) PBDebug.log('BANK_DONE', `idx=${idx} bytes=${received} used=${usedBytes()}`);
    } catch (e) { /* aborted, CORS, or network — skip this one */ }
    finally { if (bankCtl === ctl) { bankCtl = null; bankingIdx = -1; if (!ctl.signal.aborted) pumpBank(); } }   // chain the next wanted track
  }

  // ---- helpers -------------------------------------------------------------
  const fmt = PBLogic.fmt;   // h:mm:ss (js/logic.js — shared with the unit tests)
  const toast = (msg) => {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2800);
  };
  const hideToast = () => { const t = $('toast'); t.classList.remove('show'); clearTimeout(toast._t); };
  const show = (id) => { for (const s of ['signin', 'library']) $(s).classList.toggle('hidden', s !== id); };
  // Set a hero cover (mini transport / now-playing) with the same skeleton →
  // fade-in / branded-fallback states the grid covers use, so a loading or
  // failed hero never shows the browser's broken-image glyph.
  function setArt(el, url) {
    if (!el) return;
    // Idempotent: if we're already showing this exact cover, do NOTHING. Re-setting
    // src (even to the same URL) + stripping art-done restarts the shimmer/fade =
    // a cover FLASH, and updatePlayerUI() runs on every nav/swipe (via setView).
    if (url && el.dataset.artSrc === url) return;
    el.dataset.artSrc = url || '';
    el.classList.remove('art-done', 'art-failed');
    el.onload = () => el.classList.add('art-done');
    el.onerror = () => { el.removeAttribute('src'); el.classList.add('art-failed'); };
    if (url) el.src = url; else { el.removeAttribute('src'); el.classList.add('art-failed'); }
  }
  const status = (msg) => { const s = $('clStatus'); if (s) s.textContent = msg || ''; };

  // ---- top-level view + bottom-nav switching -------------------------------
  let npOpen = false;
  function setView(v) {   // 'home' | 'browse' | 'options' | 'nowplaying'
    npOpen = v === 'nowplaying';
    const optOpen = v === 'options';
    // NP and Options are ADDITIVE overlays: they paint over whatever tall
    // screen is showing, and the page underneath is NOT touched. Hiding the
    // tall view shrinks the document, and a short (~viewport-sized) document
    // is what trips iOS 26's ~50pt fixed-layer displacement (the black-band /
    // Options-bar saga — a 1-2px token overflow does NOT count as tall).
    // Only real screen switches (home/browse) swap the in-flow views.
    if (!npOpen && !optOpen) {
      $('home').classList.toggle('parked', v !== 'home');   // parked = off-screen but PAINTED (covers stay decoded)
      $('browse').classList.toggle('hidden', v !== 'browse');
    }
    if (!npOpen) $('options').classList.toggle('hidden', !optOpen);
    $('nowplaying').classList.toggle('hidden', !npOpen);
    document.body.classList.toggle('np-locked', npOpen);   // CSS hook: navbar button/pill swap
    // Home is the base view (even under an additive overlay) whenever it isn't
    // parked → give the document real height so the fixed navbar seats at the true
    // bottom (see .app CSS). This also keeps the NP pill seated when NP is over home.
    document.body.classList.toggle('home-tall', !$('home').classList.contains('parked'));
    $('navbar').classList.toggle('hidden', !Plex.isSignedIn());
    updatePlayerUI();
  }
  function setNavActive(which) {   // 'home' | 'authors' | 'books' | 'options' | null
    document.querySelectorAll('#navbar [data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === which));
  }
  // Wipe ALL transient swipe styling back to a known-good baseline: remove any
  // leftover ghost/snapshot panes and clear the inline transform/transition/
  // will-change/z-index the swipe puts on the REAL elements (#home/#browse/
  // #options/#nowplaying + the nav pill). Called at the top of applyScreen — the
  // reconcile point that runs after every swipe (finalize) and every nav — so a
  // swipe that gets interrupted mid-flight can never leave an element stuck
  // offscreen/half-transformed and corrupt later swipes (the "erratic after a
  // while" bug). Safe because applyScreen is NEVER called during an active drag.
  function resetSwipeStyles(keepGhosts) {
    if (!keepGhosts) document.querySelectorAll('.nav-ghost').forEach((n) => n.remove());
    document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());   // transient NP-swipe pill clone
    const els = ['home', 'browse', 'options', 'nowplaying'].map((id) => $(id));
    els.push(document.querySelector('#navbar .np-actions'));
    for (const el of els) if (el) { el.style.transform = ''; el.style.transition = ''; el.style.willChange = ''; el.style.zIndex = ''; }
  }
  // Navigation is driven by the History API so desktop browser back/forward act
  // exactly like the on-screen back button / swipe. Each screen is a small
  // descriptor pushed as a history state; popstate re-renders it.
  // opts.resetScroll (default true) — window/panel scroll reset to top.
  // opts.render (default true) — actually (re)render the view's content. The swipe
  // carousel already renders the destination live during the drag, so on COMMIT it
  // re-runs applyScreen with render:false to reconcile visibility only — no second
  // render (which would reload images = the post-settle flash) and no scroll change.
  function applyScreen(desc, opts) {
    const resetScroll = !opts || opts.resetScroll !== false;
    const render = !opts || opts.render !== false;
    resetSwipeStyles(opts && opts.keepGhosts);   // baseline: no swipe can leave stale transforms/ghosts behind
    // Home's fixed-navbar seating is handled by `body.home-tall` (real scroll
    // height — see .app CSS); the scrollTo just puts it at the top on entry. (The
    // 1px is a harmless remnant of the abandoned "scroll runway" theory.) NOTE: no
    // carousel-scroll restore here — home is PARKED (painted), not display:none, so
    // its carousels keep their scrollLeft on their own; re-setting it would fire a
    // scroll-snap correction (the "oh wait, let me scroll over" animation).
    if (!desc || desc.v === 'home') { setView('home'); setNavActive('home'); if (resetScroll) window.scrollTo(0, 1); return; }
    // Options is an additive overlay (like NP): no document scroll changes —
    // the page underneath stays exactly as it was. Only its own panel resets.
    if (desc.v === 'options') { setView('options'); setNavActive('options'); if (render) renderOptions(); if (resetScroll) $('options').scrollTop = 0; return; }
    // NP: no scroll reset — the page underneath must stay exactly as it was.
    if (desc.v === 'nowplaying') { setView('nowplaying'); if (render) renderNowPlaying(); return; }
    setView('browse');
    setNavActive(desc.v === 'authors' ? 'authors' : desc.v === 'books' ? 'books' : null);
    if (render) Browse.render(desc);
  }
  // NAVIGATION IS IN-MEMORY, not via the History API. iOS standalone PWAs RELOAD the
  // whole page on the OS back/forward SWIPE whenever back-history exists (wiping
  // playback + banks + speed — the interactive swipe reloads, a guard entry doesn't
  // help). So we keep browser history at a SINGLE entry (the OS swipe then has nothing
  // to navigate → inert) and drive Back from this stack instead.
  let navStack = [{ v: 'home' }];
  const fwdStack = [];                  // screens backed out of — for browser-style forward
  const currentDesc = () => navStack[navStack.length - 1];
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Which .app view element renders a screen (NP is a fixed overlay outside .app — it
  // doesn't slide; the incoming .app view slides in over/under it instead).
  const viewElFor = (v) => v === 'options' ? $('options') : v === 'home' ? $('home') : v === 'nowplaying' ? null : $('browse');
  // Carousel slide: the newly-shown view enters from `from` ('right' forward | 'left' back).
  function slideInView(el, from) {
    if (REDUCED || !el) return;
    const cls = from === 'left' ? 'nav-in-left' : 'nav-in-right';
    el.classList.remove('nav-in-left', 'nav-in-right');
    void el.offsetWidth;                                     // restart the animation
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }
  // Forward navigation to a NEW screen (clears the forward stack, slides in from right
  // unless anim is suppressed for lateral bottom-nav tab switches).
  function navTo(desc, anim = 'right') {
    const cur = currentDesc();
    if (cur && cur.v === desc.v && !desc.author && !desc.book) navStack[navStack.length - 1] = desc;
    else navStack.push(desc);
    fwdStack.length = 0;                                     // a new navigation drops any forward history
    applyScreen(desc);
    if (anim) slideInView(viewElFor(desc.v), anim);
  }
  function goBack() {
    if (navStack.length <= 1) return;   // at root — never pop past it (so we never exit/reload)
    fwdStack.push(navStack.pop());
    const d = currentDesc();
    applyScreen(d);
    slideInView(viewElFor(d.v), 'left');
  }
  function goForward() {
    if (!fwdStack.length) return;
    navStack.push(fwdStack.pop());
    const d = currentDesc();
    applyScreen(d);
    slideInView(viewElFor(d.v), 'right');
  }
  // Bottom-nav tabs are LATERAL switches, not forward drill-ins → no slide (a
  // directional slide would imply a back/forward relationship they don't have).
  function goHome() { navTo({ v: 'home' }, null); }
  function goAuthors() { navTo({ v: 'authors' }, null); }
  function goBooks() { navTo({ v: 'books' }, null); }
  function goOptions() { navTo({ v: 'options' }, null); }
  function openAuthor(a) { navTo({ v: 'authorBooks', author: { ratingKey: a.ratingKey, title: a.title } }); }
  function openFiles(b) { navTo({ v: 'files', book: b }); }
  function openNowPlaying() { if (ctx) navTo({ v: 'nowplaying' }); }
  // The CURRENT book's chapter-list descriptor (Now-Playing forward-nav target).
  function filesDescForCurrent() {
    if (!ctx) return null;
    return { v: 'files', book: { ratingKey: ctx.book, title: (ctx.album && ctx.album.title) || 'Book',
      parentTitle: (ctx.album && ctx.album.parentTitle) || '', thumb: ctx.album && ctx.album.thumb } };
  }
  function openFilesForCurrent() { const d = filesDescForCurrent(); if (d) navTo(d, 'right'); }

  // EDGE-gated INTERACTIVE page carousel. Grab from the LEFT edge and drag right →
  // the current page follows your finger and reveals the previous one (Back). Grab
  // from the RIGHT edge and drag left → reveals the next / (on Now-Playing) the
  // chapter list (Forward). On release, whichever page is more on screen — or a
  // flick — snaps into place; otherwise it snaps back. A screen↔screen page slides
  // UNDER the persistent bars (topbar/transport/nav); a Now-Playing transition slides
  // the full-screen overlay (its bars are hidden). Mid-screen drags stay for content.
  const EDGE = 44, FLICK_V = 0.4, THRESH = 0.42;   // px from edge, px/ms flick, fraction to commit
  // #options and #nowplaying are FIXED OVERLAYS (out of .app's flow); #home/#browse
  // are in-flow views sharing the document scroll. That split drives the whole model
  // below: an overlay slides as its OWN real element (nothing under it is touched, so
  // the underlying page never scrolls); two in-flow views can't coexist, so an
  // app-view↔app-view swap freezes the outgoing one as a fixed ghost snapshot.
  const isOverlay = (v) => v === 'options' || v === 'nowplaying';
  const overlayEl = (v) => v === 'nowplaying' ? $('nowplaying') : $('options');
  const appViewEl = (v) => v === 'home' ? $('home') : $('browse');
  function bindSwipeBack() {
    let d = null, finishing = false;
    const navPill = () => $('navbar').querySelector('.np-actions');
    // A detached, non-interactive clone of the pill for the duration of an NP swipe:
    // it rides with NP (added as a mover) so the pill travels, while np-locked is off
    // for the slide so the real nav buttons are visible + revealed as NP moves.
    function npPillClone() {
      document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());
      const clone = navPill().cloneNode(true);
      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      clone.classList.add('np-pill-float');
      document.body.appendChild(clone);
      return clone;
    }

    // A ghost of the current app-view (minus the shared topbar), z BELOW the
    // persistent bars so it slides under them, shifted up by the current scroll to
    // match what's on screen. Used ONLY for app-view↔app-view (the real view is
    // re-rendered for the destination, so the outgoing state must be snapshotted).
    // Opaque gradient identical to the page background — a flat var(--bg) read as a
    // DARKER pane than the gradient-backed real page (visible on swipe begin).
    const GHOST_BG = 'radial-gradient(140% 120% at 50% 0%, #262b34 0%, var(--bg) 55%)';
    // Clones must NOT re-trigger the art loader: a cloned <img> that was never
    // scrolled into view (no src yet) would get adopted + fetched (= "loading all
    // images" during the slide). Strip data-art so loaded covers still show via
    // their copied src while unloaded ones just stay as the skeleton.
    const freezeArt = (root) => root.querySelectorAll('img[data-art]').forEach((i) => i.removeAttribute('data-art'));
    // cloneNode does NOT copy scroll positions. Home's carousels scroll sideways, so
    // a fresh clone shows the FIRST tiles while the real (scrolled) home shows a
    // different set → tiles change when the swipe settles. Copy scrollLeft across
    // (must run AFTER the clone is in the DOM and laid out). Index-matched: the
    // carousels appear in the same order in src and clone.
    function copyScroll(src, dst) {
      const s = src.querySelectorAll('.carousel'), c = dst.querySelectorAll('.carousel');
      // Prefer the saved dataset.sl (survives display:none, where scrollLeft reads 0).
      s.forEach((el, i) => { if (c[i]) c[i].scrollLeft = (+el.dataset.sl || el.scrollLeft || 0); });
    }
    function ghostApp() {
      const clone = document.querySelector('.app').cloneNode(true);
      // #library's topbar clearance is id-based CSS (#library{padding-top:46px}) and
      // would be LOST when we strip ids → the clone's top content shifts up ~46px
      // under the topbar (the "top content hidden / reflow on swipe start" bug).
      // Preserve it inline BEFORE stripping ids so the ghost matches the idle page.
      const lib = clone.querySelector('#library'); if (lib) lib.style.paddingTop = '46px';
      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      const tb = clone.querySelector('.topbar'); if (tb) tb.remove();
      clone.querySelectorAll('.hidden, .parked').forEach((n) => n.remove());   // drop cached/hidden/parked panes — only the visible view matters
      freezeArt(clone);
      clone.style.margin = '0 auto';                                  // keep .app's centering (was '0' → left-aligned vs the real page)
      clone.style.transform = 'translateY(' + (-(window.scrollY || 0)) + 'px)';
      const wrap = document.createElement('div');
      wrap.className = 'nav-ghost';
      wrap.style.cssText = 'position:fixed;inset:0;z-index:28;overflow:hidden;background:' + GHOST_BG + ';pointer-events:none;will-change:transform;';
      wrap.appendChild(clone);
      document.body.appendChild(wrap);
      copyScroll(document.querySelector('.app'), clone);   // match carousel scroll to the live page
      return wrap;
    }

    function begin(x, y, target) {
      if (finishing) return;   // settle animation running — ignore new gestures until it lands
      // Leftover from an INTERRUPTED gesture (a 2nd touch mid-swipe, a missed
      // touchend, etc.) → hard-reset to known-good before starting fresh. This is
      // what stops corruption from accumulating over many swipes.
      if (d || document.querySelector('.nav-ghost')) {
        if (window.PBDebug) PBDebug.log('SWIPE', 'leftover state on begin → hard reset');
        d = null; resetSwipeStyles(); applyScreen(currentDesc(), { render: false });
      }
      if (target.closest && target.closest('#player, .alphaindex, input, .navbtn, .np-controls, .np-actions, .carousel')) return;
      const fromLeft = x <= EDGE, fromRight = x >= window.innerWidth - EDGE;
      if (!fromLeft && !fromRight) return;
      const from = currentDesc();
      let dir, dest, newNav = false;
      if (fromLeft) { if (navStack.length <= 1) return; dir = 'back'; dest = navStack[navStack.length - 2]; }
      else if (from && from.v === 'nowplaying') { dir = 'fwd'; dest = filesDescForCurrent(); newNav = true; }  // NP → chapter list
      else if (fwdStack.length) { dir = 'fwd'; dest = fwdStack[fwdStack.length - 1]; }
      else return;
      if (!dest) return;
      d = { dir, from, dest, newNav, x0: x, y0: y, dx: 0, w: window.innerWidth, live: false, locked: false,
            lastX: x, lastT: performance.now(), vx: 0, scroll0: window.scrollY || 0, movers: [], clobbered: false };
    }

    // Ensure `desc`'s app-view is the visible one in .app, rendering browse content
    // when it's a NEW screen (forward). On BACK the destination is the very screen the
    // overlay/parent was opened over, so it's already there — no re-render (no flash).
    function showAppView(desc, render) {
      if (desc.v === 'home') { $('home').classList.remove('parked'); $('browse').classList.add('hidden'); }
      else { $('browse').classList.remove('hidden'); $('home').classList.add('parked'); if (render) Browse.render(desc); }
    }

    // A fixed snapshot of HOME at its TOP (home content is static/already rendered).
    // Used as the incoming pane for back-to-home so it shows from the top WITHOUT
    // touching the real document scroll (the shared-scroll problem: the real #home
    // sits at the outgoing page's scrollY). Replicates .app + #library top padding.
    function snapshotHome() {
      const clone = $('home').cloneNode(true);
      clone.removeAttribute('id'); clone.classList.remove('hidden', 'parked');
      freezeArt(clone);
      const lib = document.createElement('div'); lib.style.paddingTop = '46px'; lib.appendChild(clone);
      const box = document.createElement('div'); box.className = 'app'; box.style.margin = '0 auto'; box.appendChild(lib);
      const wrap = document.createElement('div'); wrap.className = 'nav-ghost';
      wrap.style.cssText = 'position:fixed;inset:0;z-index:28;overflow:hidden;background:' + GHOST_BG + ';pointer-events:none;will-change:transform;';
      wrap.appendChild(box); document.body.appendChild(wrap);
      copyScroll($('home'), clone);   // match carousel scroll so the snapshot shows the same tiles as the live home
      return wrap;
    }

    // Build the sliding "movers": {el, base}; during the drag transform =
    // translateX(base + t). base 0 = OUTGOING, base ±w = INCOMING. BOTH sides always
    // move (a filmstrip, never a reveal). The real document is NEVER scrolled and the
    // real in-flow view is only re-rendered when the INCOMING is a real #browse (which
    // must live in .app); otherwise app-views ride as their real element (transform is
    // scroll-neutral) or a fixed snapshot — so scroll cannot change during a swipe.
    function start() {
      d.live = true;
      const fromV = d.from.v, toV = d.dest.v, off = d.dir === 'back' ? -d.w : d.w;
      const fromOv = isOverlay(fromV), toOv = isOverlay(toV);
      const incomingBrowse = !toOv && toV !== 'home';   // a real #browse render (must occupy .app)
      if (window.PBDebug) PBDebug.log('SWIPE', `start ${d.dir} ${fromV}→${toV} ghosts=${document.querySelectorAll('.nav-ghost').length}`);
      let out, incoming, pill = null;

      // ── OUTGOING (base 0) FIRST ── the ghost must snapshot the current #browse
      // BEFORE the incoming render (below) clobbers it (browse→browse).
      if (fromOv) {
        out = { el: overlayEl(fromV), base: 0 };
        if (fromV === 'nowplaying') { document.body.classList.remove('np-locked'); pill = { el: npPillClone(), base: 0 }; }
      } else if (incomingBrowse) {
        out = { el: ghostApp(), base: 0, remove: true };  // incoming needs the real #browse → freeze outgoing as a ghost
      } else {
        out = { el: appViewEl(fromV), base: 0 };           // incoming is overlay/snapshot → move the real view (scroll-neutral)
      }

      // ── INCOMING (base off) ──
      if (toOv) {
        const el = overlayEl(toV);
        if (toV === 'nowplaying') { renderNowPlaying(); document.body.classList.remove('np-locked'); }
        else renderOptions();
        el.classList.remove('hidden');
        incoming = { el, base: off };
        if (toV === 'nowplaying') pill = { el: npPillClone(), base: off };
      } else if (toV === 'home') {
        incoming = { el: snapshotHome(), base: off, remove: true };   // static snapshot at top, .app untouched
      } else {
        showAppView(d.dest, true);                      // render dest into the real #browse (outgoing already ghosted)
        d.clobbered = !fromOv && appViewEl(fromV) === $('browse');   // browse→browse → abort re-renders
        incoming = { el: $('browse'), base: off };
      }

      d.movers = [out, incoming];
      if (pill) d.movers.push(pill);
      // Park the incoming panes offscreen. Deliberately NO will-change on the real
      // in-flow views (#home/#browse) — promoting them to a layer can nudge the iOS
      // fixed navbar (a "pop" at swipe start). The transform alone is enough.
      for (const m of d.movers) if (m.base) m.el.style.transform = 'translateX(' + m.base + 'px)';
    }

    function move(x, y, ev) {
      if (!d) return;
      const dx = x - d.x0, dy = y - d.y0;
      if (!d.locked) {
        // Edge grab committed → swallow native scroll from the VERY FIRST move. Once
        // iOS starts a scroll the touchmove goes non-cancelable and preventDefault is
        // ignored for the rest of the gesture — the page then scrolls the whole swipe.
        if (ev && ev.cancelable) ev.preventDefault();
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        d.locked = true;
        if (Math.abs(dx) <= Math.abs(dy)) { d = null; return; }   // vertical intent → abandon (native scroll resumes)
        start();
      }
      if (!d.live) return;
      if (ev && ev.cancelable) ev.preventDefault();
      let t = d.dir === 'back' ? Math.max(0, dx) : Math.min(0, dx);
      t = Math.max(-d.w, Math.min(d.w, t));
      d.dx = t;
      for (const m of d.movers) m.el.style.transform = 'translateX(' + (m.base + t) + 'px)';
      const now = performance.now();
      if (now > d.lastT + 8) { d.vx = (x - d.lastX) / (now - d.lastT); d.lastX = x; d.lastT = now; }
    }

    function end() {
      if (!d) return;
      const cur = d; d = null;
      if (!cur.live) return;
      const prog = Math.abs(cur.dx) / cur.w;                    // how much of the incoming page is on screen
      const flickGo = cur.dir === 'back' ? cur.vx > FLICK_V : cur.vx < -FLICK_V;
      const flickNo = cur.dir === 'back' ? cur.vx < -FLICK_V : cur.vx > FLICK_V;
      settle(cur, !flickNo && (flickGo || prog > THRESH));       // whichever is more on screen (or a flick) wins
    }

    function settle(cur, commit) {
      finishing = true;
      const off = cur.dir === 'back' ? -cur.w : cur.w;
      const outTo = commit ? -off : 0;                          // committed: outgoing exits the way the strip travels
      const inTo = commit ? 0 : off;                            // committed: incoming lands; else it retreats
      const tr = 'transform .2s cubic-bezier(.2,.7,.2,1)';
      for (const m of cur.movers) m.el.style.transition = tr;
      requestAnimationFrame(() => {
        for (const m of cur.movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';
      });
      let done = false;
      const dropPanes = () => { for (const m of cur.movers) if (m.remove && m.el.parentNode) m.el.remove(); };
      const finalize = () => {
        if (done) return; done = true;
        if (window.PBDebug) PBDebug.log('SWIPE', `${commit ? 'commit' : 'abort'} ${cur.dir} ${cur.from.v}→${cur.dest.v}`);
        for (const m of cur.movers) { m.el.style.transition = ''; m.el.style.transform = ''; m.el.style.willChange = ''; }
        if (commit) {
          if (cur.dir === 'back') fwdStack.push(navStack.pop());
          else if (cur.newNav) { navStack.push(cur.dest); fwdStack.length = 0; }   // NP → chapters is a fresh forward nav
          else navStack.push(fwdStack.pop());
        }
        const dest = currentDesc();
        // Committing to HOME: home was display:none while we were away, so the browser
        // dropped its decoded cover images and re-decodes them on show = a flash. Show
        // the real home UNDERNEATH the still-covering snapshot, let it decode for a
        // couple frames, THEN drop the snapshot → no flash. (Swiping back from NP never
        // flashed because NP keeps home visible; this gives every path that behavior.)
        if (commit && dest.v === 'home') {
          applyScreen(dest, { render: false, keepGhosts: true });
          // Keep the cover until the real home's covers are actually decoded/paintable
          // (a fixed frame count guessed wrong). img.decode() resolves when the image
          // can paint without a flash — covering both a re-decode and a re-fetch.
          const covers = Array.from($('home').querySelectorAll('img')).filter((i) => i.getAttribute('src'));
          let dropped = false;
          const drop = () => { if (dropped) return; dropped = true; dropPanes(); finishing = false; };
          Promise.all(covers.map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()))).then(drop);
          setTimeout(drop, 600);   // safety net — never keep the cover pane forever
          return;
        }
        dropPanes();
        if (commit) applyScreen(dest, { render: false });   // dest already rendered live → reconcile only
        else {
          // Aborted → restore the current screen (re-render only if its element was
          // clobbered, i.e. browse→browse) + put back the exact starting scroll.
          applyScreen(dest, { render: cur.clobbered, resetScroll: false });
          window.scrollTo(0, cur.scroll0);
        }
        finishing = false;
      };
      const anchor = cur.movers[0] && cur.movers[0].el;
      if (anchor) anchor.addEventListener('transitionend', finalize, { once: true });
      setTimeout(finalize, 340);
    }

    document.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; begin(t.clientX, t.clientY, e.target); }, { passive: true });
    document.addEventListener('touchmove', (e) => { const t = e.changedTouches[0]; move(t.clientX, t.clientY, e); }, { passive: false });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
    document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') begin(e.clientX, e.clientY, e.target); });
    document.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && d) move(e.clientX, e.clientY, e); });
    document.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') end(); });
    // History stays at one entry, so a popstate is only a stray OS gesture — re-anchor
    // and keep the current in-memory screen (never navigate away → never reload).
    window.addEventListener('popstate', () => { try { history.replaceState({ v: 'app' }, ''); } catch {} applyScreen(currentDesc()); });
  }
  // Pull-to-refresh — Home only, from the very top. A downward drag reveals a
  // spinner; releasing past the threshold refreshes. Vertical + top-gated so it
  // never fights the horizontal carousels or normal scrolling.
  const PTR_THRESHOLD = 72;
  let ptrPx = 0;
  function setPtr(px) {
    ptrPx = px;
    const el = $('ptr');
    if (!el) return;
    const r = Math.min(px / (PTR_THRESHOLD * 1.4), 1);
    el.style.transform = `translateX(-50%) translateY(${Math.min(px * 0.6, 64)}px)`;
    el.style.opacity = r;
    el.classList.toggle('ready', px >= PTR_THRESHOLD);
  }
  function bindPullRefresh() {
    let y0 = null, pulling = false;
    document.addEventListener('touchstart', (e) => {
      // Same exclusions as swipe-back: a touch on the transport, nav, or a form
      // control must never arm the pull (a slider drag with a slight downward
      // wobble would otherwise preventDefault the move and fight the scrub).
      // Home must be the CURRENT screen (history state), not merely visible —
      // additive overlays (NP, Options) leave #home un-hidden underneath.
      const hs = currentDesc();
      if (refreshing || (hs && hs.v && hs.v !== 'home') || $('home').classList.contains('parked') || window.scrollY > 0
        || e.target.closest('#player, .navbar, .alphaindex, input')) { y0 = null; return; }
      y0 = e.touches[0].clientY; pulling = false;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (y0 == null || refreshing) return;
      const dy = e.touches[0].clientY - y0;
      if (window.scrollY > 0) { y0 = null; if (pulling) setPtr(0); pulling = false; return; }
      if (dy > 0) { pulling = true; e.preventDefault(); setPtr(dy); }   // block native bounce while pulling
      else if (pulling) setPtr(0);
    }, { passive: false });
    const finish = () => {
      if (y0 == null) return;
      const trigger = pulling && ptrPx >= PTR_THRESHOLD;
      y0 = null; pulling = false;
      if (trigger) refreshHome(); else setPtr(0);
    };
    document.addEventListener('touchend', finish, { passive: true });
    document.addEventListener('touchcancel', finish, { passive: true });
  }

  // Play a book chosen from the browse/home views (resumes if it's in progress).
  function playFromBrowse(albRk, meta) {
    playBook(bookEntries[albRk] || { book: albRk, track: null, offsetMs: 0 }, meta);
  }
  // Play a specific file (chapter) picked in the files view.
  function playFileFromBrowse(book, track, startMs) {
    // Tap a chapter → resume THAT chapter from its stored per-chapter offset.
    let ms = startMs || 0;
    const r = Progress.trackRecord(book.ratingKey, track.ratingKey);
    if (r && r.d) ms = Math.min(r.o, Math.max(0, r.d - 1000));
    playBookAt(book.ratingKey, book, track.ratingKey, ms);
  }

  // ---- sign-in (separate-tab + poll; no redirect-back dependency) ----------
  async function doSignIn() {
    const btn = $('signinBtn');
    const info = $('signinInfo');
    const link = $('signinLink');
    btn.disabled = true; btn.textContent = 'Contacting Plex…';
    try {
      info.textContent = 'Creating sign-in request…';
      const { id, code, authUrl } = await Plex.startPin();
      const w = window.open(authUrl, '_blank');
      link.href = authUrl;
      link.textContent = (w ? 'Approve in the Plex tab' : 'Tap to open Plex') + ` — code ${code}`;
      link.classList.remove('hidden');
      btn.textContent = 'Waiting for approval…';
      await Plex.pollPin(id, {
        tries: 90, intervalMs: 2000,           // ~3 min, room for 2FA
        onTick: (n) => { info.textContent = `Approve in the Plex tab, then come back here. Waiting… (${n})`; },
      });
      link.classList.add('hidden'); info.textContent = 'Signed in! Loading…';
      return enterApp();
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Sign in with Plex';
      info.textContent = ''; link.classList.add('hidden');
      toast(e.message || 'Sign-in failed');
    }
  }

  // ---- home (Continue Listening + Recently Added carousels) ----------------
  async function enterApp() {
    show('library');
    $('navbar').classList.remove('hidden');
    // Single history entry + in-memory nav (see navTo): the OS back-swipe has nothing
    // to navigate, so it can't reload the page and kill playback.
    navStack = [{ v: 'home' }];
    history.replaceState({ v: 'app' }, '');
    applyScreen({ v: 'home' });
    $('serverName').textContent = '';
    // Offline-first: paint the last-known library from IndexedDB immediately, so
    // the app never shows a blank/spinner-forever screen while (or if) the network
    // comes up. loadHomeData() overwrites this with fresh data once Plex answers.
    const painted = await renderCachedHome();
    if (!painted) { $('clRow').innerHTML = '<div class="center"><div class="spinner"></div></div>'; $('raRow').innerHTML = ''; }
    status(painted ? '' : 'Connecting to your Plex server…');
    try {
      await Plex.connect();
      $('serverName').textContent = Plex.getServerName() || 'Plex';
      status('');

      startCoordination();

      // Bring the transport back to whatever was playing last (paused).
      await restoreLastPlayed();

      await loadHomeData();
    } catch (e) {
      // Offline / Plex unreachable. Bring up durable-progress + presence anyway
      // (they publish best-effort and recover on reconnect), restore the transport
      // from cached metadata, and keep the cached home visible. The Net banner
      // explains the state and its reconnect pass refreshes automatically.
      startCoordination();
      try { await restoreLastPlayed(); } catch {}
      const shown = painted || await renderCachedHome();
      if (window.PBDebug) PBDebug.log('CACHE', 'enterApp offline: shown=' + shown + ' err=' + (e && e.message));
      if (!shown) {
        // Nothing cached yet — the app has never completed an online library load
        // on this device (or the cache was cleared). Tell the user how to enable
        // offline instead of a scary generic error.
        $('clRow').innerHTML = '';
        $('raRow').innerHTML = '';
        status('No saved library yet — open the app once while connected to Plex to enable offline use.');
      } else status('');
      if (window.Net) Net.checkPlex();
    }
  }

  // Bring up multi-device coordination + durable progress + the render tick.
  // Idempotent: enterApp may reach this via either the online or the offline
  // (catch) path, and reconnects re-enter enterApp; init only the first time.
  let coordUp = false;
  function startCoordination() {
    if (!coordUp) {
      coordUp = true;
      Presence.init({ onPeers, onSupersede: onSuperseded });
      Progress.init({ onMerged: () => { if (!document.hidden) renderPresence(); } });
    }
    Progress.setActive(true);
    renderDeviceName();
    startRenderTick();
  }

  // Render the two home carousels from the last-known library in IndexedDB (no
  // network). Mirrors loadHomeData's derivation (recently-played + recently-added)
  // but purely from cache. Returns true if it painted anything. Covers come from
  // the SW image cache via Plex.artUrl (resolved against the last-good host).
  async function renderCachedHome() {
    if (!window.Store) { if (window.PBDebug) PBDebug.log('CACHE', 'renderCachedHome: no Store'); return false; }
    try {
      const books = await Store.cachedBooks();
      if (window.PBDebug) PBDebug.log('CACHE', 'renderCachedHome: ' + (books ? books.length : 0) + ' cached books');
      if (!books || !books.length) return false;
      const cont = books.filter((b) => b.lastViewedAt > 0).sort((a, b) => (b.lastViewedAt || 0) - (a.lastViewedAt || 0));
      renderCarousel($('clRow'), cont);
      renderCarousel($('raRow'), books.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 15));
      renderPresence();
      return true;
    } catch (e) { if (window.PBDebug) PBDebug.log('CACHE', 'renderCachedHome threw ' + (e && e.message)); return false; }
  }

  // Fetch + render the two home carousels (shared by initial load + pull-to-refresh).
  async function loadHomeData() {
    // The whole-library fetch (cached) powers both carousels + browse. The LMS
    // plugin's resume playlist is OPTIONAL — a best-effort ADDITIVE layer: when
    // it's absent (app-only user) getResumeMap returns [], and a fetch error is
    // swallowed, so the home feed always renders from Plex alone. When present it
    // supplies exact resume offsets + surfaces books listened to on the LMS side.
    const [resume, books] = await Promise.all([
      Plex.getResumeMap().catch(() => []),
      Plex.getBooks(),
    ]);
    for (const k in bookEntries) delete bookEntries[k];
    for (const b of resume) bookEntries[b.book] = b;
    const byRk = new Map(books.map((b) => [String(b.ratingKey), b]));

    // Continue Listening = Plex recently-played (standalone source of truth),
    // then any additional books the plugin knows about, most-recent first.
    const cont = await Plex.getContinueListening();
    const have = new Set(cont.map((b) => String(b.ratingKey)));
    for (const rk of Object.keys(bookEntries)) {
      if (!have.has(String(rk)) && byRk.has(String(rk))) { cont.push(byRk.get(String(rk))); have.add(String(rk)); }
    }
    const recencyOf = (b) => (bookEntries[b.ratingKey] ? bookEntries[b.ratingKey].ts || 0 : b.lastViewedAt || 0);
    cont.sort((a, b) => recencyOf(b) - recencyOf(a));

    renderCarousel($('clRow'), cont);
    status(cont.length ? '' : 'No books in progress yet — pick one from Books or Authors.');
    renderCarousel($('raRow'), await Plex.getRecentlyAdded(15));
    renderPresence();   // paint live numbers on the fresh tiles
  }

  // Pull-to-refresh: re-pull the home feeds with a fresh whole-library fetch.
  let refreshing = false;
  async function refreshHome() {
    if (refreshing) return;
    refreshing = true;
    $('ptr').classList.add('spin');
    try { Plex.clearCaches(); Browse.clearCache(); await loadHomeData(); }
    catch (e) { toast(e.message || 'Refresh failed'); }
    finally { refreshing = false; setPtr(0); $('ptr').classList.remove('spin'); }
  }

  function renderCarousel(row, books) {
    row.innerHTML = '';
    if (!books.length) { row.innerHTML = '<div class="empty carousel-empty">Nothing here yet.</div>'; return; }
    for (const b of books) row.appendChild(renderTile(b));
  }

  // 1/3-width tile, stacked vertically: art, title, author, resume·peer line,
  // progress bar. data-book keeps resume/peer numbers live via the presence tick.
  function renderTile(b) {
    const cover = b.thumb ? Plex.artUrl(b.thumb) : null;
    const total = b.leafCount || 0, done = b.viewedLeafCount || 0;
    const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const res = bookEntries[b.ratingKey];
    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.book = b.ratingKey;
    el.innerHTML = `
      <div class="covertap" title="Resume">
        <img class="cover${cover ? '' : ' art-failed'}" ${cover ? `data-art="${cover}"` : ''} decoding="async" alt="">
        <span class="playoverlay">▶</span>
      </div>
      <div class="ttitle"></div>
      <div class="tauthor"></div>
      <div class="pline"><div class="pname"></div><div class="ptimes"></div></div>
      <div class="progress"><i style="width:${pct}%"></i></div>`;
    el.querySelector('.ttitle').textContent = b.title || 'Book';
    el.querySelector('.tauthor').textContent = b.parentTitle || '';
    el.querySelector('.covertap').addEventListener('click', (e) => { e.stopPropagation(); playFromBrowse(b.ratingKey, b); });
    el.addEventListener('click', () => openFiles(b));
    return el;
  }

  // ---- multi-device presence UI --------------------------------------------
  let peersNow = [];
  const bookEntries = {};   // book -> cold entry (from the resume playlist)

  // How "current" a device state is, on the server clock: a playing device is
  // live NOW; a paused/idle one is as-of when it last published.
  function recency(d) { return PBLogic.recency(d, Plex.serverNow()); }

  function peerFor(book) {
    const list = peersNow.filter((p) => String(p.book) === String(book));
    if (!list.length) return null;
    return list.sort((a, b) => recency(b) - recency(a))[0];
  }

  // Most-recently-updated resume source for a book: {track, pos(ms), ts}. A live
  // peer's position is EXTRAPOLATED to now (Presence.livePos).
  function bestSource(book, cold) {
    // Ordered by trust, least-authoritative first; PBLogic.pickResume picks the
    // newest by ts (first wins ties). Keep this order — it IS the handoff policy.
    const cands = [
      { track: cold ? cold.track : null, pos: cold ? (cold.offsetMs || 0) : 0, ts: cold ? (cold.ts || 0) * 1000 : -1 },
    ];
    const pr = Progress.bookRecord(book);   // merged cross-device book-level record (LWW winner)
    if (pr) cands.push({ track: pr.t, pos: pr.o || 0, ts: pr.ts || 0 });
    const mine = myProgress[book];   // our own last spot on THIS device (Plex won't echo it back)
    if (mine) cands.push({ track: mine.track, pos: mine.pos || 0, ts: mine.ts || 0 });
    const p = peerFor(book);         // a live peer's pos is EXTRAPOLATED to now
    if (p) cands.push({ track: p.track, pos: Presence.livePos(p), ts: recency(p) });
    const best = PBLogic.pickResume(cands);
    // If we're actively PLAYING this book, the live playhead is the freshest source,
    // full stop — use it stamped NOW. (The old `ctx.updatedAt > best.ts` failed on a
    // TIE: updatedAt equals the last recorded ts from the same play session, so a
    // strict > lost and tapping the tile rewound to the recorded spot. No live peer
    // can coexist here — supersede prevents two devices playing the same book.)
    if (ctx && String(ctx.book) === String(book) && !audio.paused && audio.currentTime) {
      best = { track: ctx.tracks[ctx.idx].ratingKey, pos: audio.currentTime * 1000, ts: Plex.serverNow() };
    }
    return best;
  }

  function freshestResumeMs(book) {
    if (ctx && String(ctx.book) === String(book) && !audio.paused && audio.currentTime) return audio.currentTime * 1000;
    return bestSource(book, bookEntries[book]).pos;
  }

  const cssEsc = (v) => (window.CSS && CSS.escape) ? CSS.escape(String(v)) : String(v);

  // ---- progress display: ONE line per book/chapter, colour = record author ----
  // { text, cls, pct } where cls is 'mine' (orange = this device) | 'peer' (green +
  // name) | '' (no author / cold). Ticks live when that author is currently playing
  // (local audio, or a peer extrapolated); otherwise the static merged value.
  // Remaining is shown as wall-clock-to-listen at the LOCAL playback speed (matches
  // Now-Playing). Elapsed/position and total are content time (unscaled) — a stable
  // property of where you are / how long the thing is. A 1.8× rate is why an unscaled
  // 16:37:07 book remainder reads 9:13:57 in NP; now they agree.
  const spd = () => audio.playbackRate || 1;
  const trackCache = {};   // book -> tracks[] so a peer's book-cum can be computed from its presence pos
  function cacheTracks(book, tracks) { if (book != null && tracks && tracks.length) trackCache[book] = tracks; }
  function tracksFor(book) { return (ctx && String(ctx.book) === String(book)) ? ctx.tracks : (trackCache[book] || null); }
  // A peer's BOOK cumulative (ms) + total from its LIVE presence {track,pos}, using the
  // book's track durations — instant (presence polls every ~6s / websocket), vs waiting
  // for the peer's durable pb_prog board (20s). This is what restores instant peer
  // display after a handoff; null when we don't have the book's track list.
  function peerBookCum(book, p) {
    const tracks = tracksFor(book); if (!tracks) return null;
    const idx = tracks.findIndex((t) => String(t.ratingKey) === String(p.track));
    if (idx < 0) return null;
    let before = 0, tot = 0;
    tracks.forEach((t, i) => { const d = t.durationMs || 0; tot += d; if (i < idx) before += d; });
    return { cum: before + Presence.livePos(p), tot };
  }
  // { name, times, cls, pct } — name is the PEER's name (blank for our own / none)
  // and rides its own line; times is the cum / -remaining line.
  function bookLine(book) {
    if (ctx && String(ctx.book) === String(book) && !audio.paused && audio.currentTime) {
      const bt = bookTimes();
      return { name: '', times: fmt(bt.cum) + ' / -' + fmt(bt.remain / spd()), cls: 'mine', pct: bt.total ? (bt.cum / bt.total) * 100 : null };
    }
    // Freshest of: the durable merged record, and a LIVE presence peer. Presence is
    // the fast path (restores instant peer progress); the record wins when it's newer.
    const rec = Progress.bookRecord(book);
    let best = (rec && (rec.tot || rec.cum)) ? { cumMs: rec.cum || 0, totMs: rec.tot || 0, ts: rec.ts || 0, mine: Progress.isMine(rec), name: rec.name } : null;
    const p = peerFor(book);
    if (p) { const pc = peerBookCum(book, p); if (pc) { const ts = recency(p); if (!best || ts >= best.ts) best = { cumMs: pc.cum, totMs: pc.tot, ts, mine: false, name: p.name }; } }
    if (best) {
      const times = best.totMs ? (fmt(best.cumMs / 1000) + ' / -' + fmt(Math.max(0, best.totMs - best.cumMs) / 1000 / spd())) : fmt(best.cumMs / 1000);
      return { name: best.mine ? '' : (best.name || ''), times, cls: best.mine ? 'mine' : 'peer', pct: best.totMs ? (best.cumMs / best.totMs) * 100 : null };
    }
    const cold = bookEntries[book];   // plugin cold-resume fallback (no cross-device author)
    if (cold && cold.offsetMs) return { name: '', times: fmt(cold.offsetMs / 1000), cls: '', pct: null };
    return { name: '', times: '', cls: '', pct: null };
  }
  // Chapter row: position / -remaining(at speed) · total-track-length.
  function chapterLine(book, track, durMs) {
    const isCur = ctx && String(ctx.book) === String(book) && ctx.tracks[ctx.idx] && String(ctx.tracks[ctx.idx].ratingKey) === String(track);
    if (isCur && !audio.paused && audio.currentTime) {
      const cur = audio.currentTime, d = audio.duration || (durMs || 0) / 1000;
      return { text: fmt(cur) + ' / -' + fmt(Math.max(0, d - cur) / spd()) + (d ? ' · ' + fmt(d) : ''), cls: 'mine', pct: d ? Math.min(100, Math.round((cur / d) * 100)) : 0 };
    }
    const rec = Progress.trackRecord(book, track);
    let best = rec ? { o: rec.o, d: rec.d || durMs || 0, ts: rec.ts || 0, mine: Progress.isMine(rec), name: rec.name } : null;
    const p = peerFor(book);   // a peer live on THIS exact chapter → show its position instantly
    if (p && String(p.track) === String(track)) { const ts = recency(p); if (!best || ts >= best.ts) best = { o: Presence.livePos(p), d: durMs || (best ? best.d : 0), ts, mine: false, name: p.name }; }
    if (best) {
      const d = best.d, pct = d ? Math.min(100, Math.round((best.o / d) * 100)) : 0;
      const times = d ? (fmt(best.o / 1000) + ' / -' + fmt(Math.max(0, d - best.o) / 1000 / spd()) + ' · ' + fmt(d / 1000)) : '';
      return { text: best.mine ? times : (best.name ? best.name + ' · ' : '') + times, cls: best.mine ? 'mine' : 'peer', pct };
    }
    return { text: '', cls: '', pct: null };
  }
  function paintFileRowSub(row, line) {
    const gi = row.querySelector('.progress > i'); if (gi && line.pct != null) gi.style.width = line.pct + '%';
    const sub = row.querySelector('.fsub'); if (sub) { sub.textContent = line.text; sub.className = 'fsub' + (line.cls ? ' ' + line.cls : ''); }
  }

  // Update the book progress line (+ time-based bar) on every visible tile/row.
  function updateBookLines() {
    document.querySelectorAll('.tile[data-book], .book[data-book]').forEach((el) => {
      const line = bookLine(el.dataset.book);
      const pl = el.querySelector('.pline');
      if (pl) {
        pl.className = 'pline' + (line.cls ? ' ' + line.cls : '');
        const nm = pl.querySelector('.pname'), tm = pl.querySelector('.ptimes');
        if (nm) nm.textContent = line.name || '';
        if (tm) tm.textContent = line.times || '';
      }
      if (line.pct != null) { const gi = el.querySelector('.progress > i'); if (gi) gi.style.width = Math.round(line.pct) + '%'; }
    });
  }
  // Files view: the currently-playing chapter ticks live (called from timeupdate too).
  function updatePlayingFileRow() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx]; if (!t) return;
    const line = chapterLine(ctx.book, t.ratingKey, t.durationMs || 0);
    document.querySelectorAll(`.filerow[data-track="${cssEsc(t.ratingKey)}"]`).forEach((row) => paintFileRowSub(row, line));
  }
  // Files view: per-chapter blue buffer/bank underlay + gold progress + coloured
  // sub line + the playing-row highlight. A different book's rows resolve to idx -1
  // (no banked/buffered state) but still get their merged progress from Progress.
  function updateFileRows() {
    const rows = document.querySelectorAll('.filerow[data-track]');
    if (!rows.length) return;
    rows.forEach((row) => {
      const track = row.dataset.track, book = row.dataset.book;
      const idx = ctx ? ctx.tracks.findIndex((t) => String(t.ratingKey) === String(track)) : -1;
      let buf = 0;
      if (idx >= 0) {
        if (banks.has(idx)) buf = 100;                       // whole chapter downloaded
        else if (ctx.idx === idx) buf = nativeBufferedPct(); // playing → native stream buffer
        else if (bankingIdx === idx) buf = bankPct;          // downloading now
      }
      const bufbar = row.querySelector('.bufbar');
      if (bufbar) bufbar.style.setProperty('--buffered', Math.round(buf) + '%');
      row.classList.toggle('playing', idx >= 0 && idx === ctx.idx);
      paintFileRowSub(row, chapterLine(book, track, idx >= 0 ? (ctx.tracks[idx].durationMs || 0) : 0));
    });
  }

  // Poll delivers fresh peer EVENTS; the local render tick re-extrapolates them
  // between polls so numbers move smoothly with zero extra network.
  let lastProgRefresh = 0;
  function onPeers(list) {
    peersNow = list; renderPresence();
    // A presence change usually means a handoff — pull the durable progress boards too
    // (throttled) so the new author's book/chapter record catches up fast, not only on
    // the slow 20s poll. The instant display already rides presence via peerBookCum.
    const t = Date.now();
    if (t - lastProgRefresh > 8000) { lastProgRefresh = t; Progress.refresh(); }
  }
  function renderPresence() {
    if (scrubbing) return;   // dragging a seek slider — don't reflow the (visible) library mid-drag
    updateBookLines();
    updateFileRows();
    updatePlayingFileRow();
    mirrorPeerTransport();
    pumpBank();   // heartbeat: catch idle windows even if an event was missed
  }
  // While WE'RE paused but a peer OWNS + is LIVE on our current chapter, tick the
  // transport to the peer's extrapolated position and paint it GREEN (fill + handle,
  // peer colour). Scrubbing that green bar grabs the session (see bindScrub → grab).
  // Same-chapter only (the seek bar maps 1:1).
  let mirroring = false;
  function setMirrorClass(on) {
    if (on === mirroring) return;
    mirroring = on;
    const a = $('pSeek'), b = $('npSeek');
    if (a) a.classList.toggle('peer', on);
    if (b) b.classList.toggle('peer', on);
  }
  function mirrorPeerTransport() {
    const p = (ctx && audio.paused) ? livePeerForCtx() : null;
    const t = ctx && ctx.tracks[ctx.idx];
    const active = !!(p && t && String(p.track) === String(t.ratingKey));
    setMirrorClass(active);
    if (!active) return;
    const dur = audio.duration || (t.durationMs || 0) / 1000;
    const pos = dur ? Math.min(dur, Presence.livePos(p) / 1000) : Presence.livePos(p) / 1000;
    const pct = dur ? Math.min(100, (pos / dur) * 100) : 0;
    $('pCur').textContent = fmt(pos);
    const s = $('pSeek'); if (s && !s.dragging) { s.value = pct * 10; s.style.setProperty('--played', pct + '%'); }
    if (npOpen) {
      $('npCur').textContent = fmt(pos);
      const ns = $('npSeek'); if (ns && !ns.dragging) { ns.value = pct * 10; ns.style.setProperty('--played', pct + '%'); }
    }
  }
  // Scrubbed the green (peer-mirrored) bar → take OWNERSHIP: a fresh grab claim makes
  // the peer supersede/pause; we seek locally and STAY paused (play starts only when
  // the user hits play). Transport flips back to orange (we own it now).
  function grabFromPeer() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx]; if (!t) return;
    ctx.updatedAt = Plex.serverNow();
    Presence.grab(ctx.book, t.ratingKey, (audio.currentTime || 0) * 1000);
    setMirrorClass(false);
    saveLastPlayed();
    updateSeekUI();
    if (window.PBDebug) PBDebug.log('PLAY', `scrub GRAB @ ${(audio.currentTime || 0).toFixed(1)}s — peer pauses, staying paused`);
  }
  let renderTick = null;
  function startRenderTick() { stopRenderTick(); renderTick = setInterval(renderPresence, 1000); }
  function stopRenderTick() { if (renderTick) { clearInterval(renderTick); renderTick = null; } }

  function onSuperseded(winner) {
    if (!audio.paused) {
      audio.pause();
      toast(`Handed off to ${winner.name || 'another device'}`);
    }
  }

  function renderDeviceName() {
    const el = $('deviceName');
    if (!el) return;
    el.textContent = 'This device: ' + Presence.name() + '  (rename)';
    el.onclick = () => {
      const n = prompt('Name this device (shows on your other devices):', Presence.name());
      if (n) { Presence.setName(n); renderDeviceName(); }
    };
  }

  // ---- playback ------------------------------------------------------------
  // Track list for a book WITHOUT a network round-trip when we already have it —
  // the currently-loaded book's ctx.tracks, or a cache from a prior open. This is
  // why resume is instant: getAlbumTracks (a Plex fetch) is skipped, so a banked
  // track plays immediately with no "Loading…" wait. Only a never-opened book fetches.
  async function tracksForBook(book) {
    if (ctx && String(ctx.book) === String(book) && ctx.tracks && ctx.tracks.length) return ctx.tracks;
    if (trackCache[book] && trackCache[book].length) return trackCache[book];
    toast('Loading…');
    const t = await Plex.getAlbumTracks(book);
    cacheTracks(book, t);
    return t;
  }
  async function playBook(entry, alb) {
    try {
      const tracks = await tracksForBook(entry.book);
      if (!tracks.length) return toast('No playable files for this book.');
      // Resume from the MOST-RECENTLY-updated source (cold value, a live peer
      // extrapolated to now, or our own paused spot) — captures rewinds too.
      // Compute this BEFORE recording our own outgoing spot: recording stamps our
      // (possibly-behind) position with a FRESH ts, which would then beat a faster
      // peer on a same-book takeover → you'd resume behind it. That was the .75
      // regression (playBook started recording unconditionally, even same-book).
      const best = bestSource(entry.book, entry);
      if (ctx) { recordProgress(); if (String(ctx.book) !== String(entry.book)) writeProgress('paused'); }   // capture the outgoing chapter now that `best` is fixed
      const resTrack = best.track || entry.track, resPos = best.pos || 0;
      let idx = tracks.findIndex((t) => String(t.ratingKey) === String(resTrack));
      if (idx < 0) idx = 0;
      ctx = { album: alb || { title: `Book #${entry.book}`, parentTitle: '' }, tracks, idx, book: entry.book, updatedAt: Plex.serverNow(), coverUrl: alb ? Plex.artUrl(alb.thumb) : null };
      startTrack(idx, resPos / 1000);
      hideToast();   // playback has started — drop any "Loading…" immediately (it used to linger ~3s)
      updatePlayerUI();
      setMediaSession();
      // Announce to the ecosystem that this device now owns this book.
      Presence.claimPlaying(entry.book, tracks[idx].ratingKey, resPos, tracks[idx].ratingKey);
    } catch (e) { toast(e.message || 'Could not start playback'); }
  }

  // Play a book starting at a SPECIFIC track/offset (from the files view).
  async function playBookAt(bookRk, meta, trackRk, startMs) {
    try {
      if (ctx) { recordProgress(); if (String(ctx.book) !== String(bookRk)) writeProgress('paused'); }   // capture the outgoing chapter's spot before we switch away
      const tracks = await tracksForBook(bookRk);
      if (!tracks.length) return toast('No playable files for this book.');
      let idx = tracks.findIndex((t) => String(t.ratingKey) === String(trackRk));
      if (idx < 0) idx = 0;
      ctx = { album: meta || { title: `Book #${bookRk}`, parentTitle: '' }, tracks, idx, book: bookRk, updatedAt: Plex.serverNow(), coverUrl: meta && meta.thumb ? Plex.artUrl(meta.thumb) : null };
      startTrack(idx, (startMs || 0) / 1000);
      hideToast();
      updatePlayerUI(); setMediaSession();
      Presence.claimPlaying(bookRk, tracks[idx].ratingKey, startMs || 0, tracks[idx].ratingKey);
    } catch (e) { toast(e.message || 'Could not start playback'); }
  }

  function startTrack(idx, seekSec = 0, autoplay = true) {
    const t = ctx.tracks[idx];
    ctx.idx = idx;
    if (bankBook !== ctx.book) { clearBanks(); bankBook = ctx.book; }   // banks are per-book (keyed by idx)
    curLoad = { idx, seekSec, autoplay };       // remembered so a network error can retry this exact load
    clearTimeout(loadRetryTimer);
    const gen = ++loadGen;                       // invalidate any in-flight loadedmetadata from a prior src
    // Prefer an already-banked copy of this track (network-proof, no re-buffer);
    // otherwise stream. Then re-point the meter + prefetch window at this track.
    const banked = bankedUrl(idx);
    Progress.setSeed(t.ratingKey);   // give the durable-progress board a track to seed its playlist
    if (window.PBDebug) PBDebug.log('PLAY', `startTrack idx=${idx} seek=${(seekSec || 0).toFixed(1)}s src=${banked ? 'banked' : 'stream'} autoplay=${autoplay}`);
    audio.src = banked || Plex.streamUrl(t.partKey);
    audio.load();
    refreshMeter();
    pumpBank();
    updateFileRows();   // move the "playing" highlight + buffered line to this chapter now
    const onMeta = () => {
      if (gen !== loadGen) return;               // superseded by a newer load — ignore
      loadRetry = 0;                             // got metadata → connection is good again
      if (seekSec > 0 && seekSec < (audio.duration || Infinity)) audio.currentTime = seekSec;
      if (speedCtl) audio.playbackRate = speedCtl.getRate();   // rate can reset on new src
      if (autoplay) audio.play().catch(() => {});
      else updateSeekUI();                                     // restored-paused: paint the bar at the saved spot
    };
    audio.addEventListener('loadedmetadata', onMeta, { once: true });
  }

  // ---- last-played memory (local; survives reloads) ------------------------
  function saveLastPlayed() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    if (!t) return;
    try {
      localStorage.setItem(LAST, JSON.stringify({
        book: ctx.book, track: t.ratingKey, pos: audio.currentTime * 1000, ts: Plex.serverNow(),
      }));
    } catch { /* storage full/blocked — best effort */ }
    recordProgress();
  }

  // Bank OUR current spot for THIS book into the local per-book map so a tile / a
  // later resume reflects where we actually are (see MYPROG note). Called on the
  // same triggers as saveLastPlayed AND right before we switch books, so switching
  // away never loses the outgoing book's progress.
  // Whole-book time for the current ctx, in SECONDS: total duration, cumulative
  // position at the playhead, and remaining. One source of truth for the arithmetic,
  // shared by Now-Playing (npBookRem) and the book-level progress record.
  function bookTimes() {
    let total = 0, before = 0;
    if (ctx) ctx.tracks.forEach((tr, i) => { const d = (tr.durationMs || 0) / 1000; total += d; if (i < ctx.idx) before += d; });
    const cur = audio.currentTime || 0;
    return { total, cum: before + cur, remain: Math.max(0, total - (before + cur)) };
  }
  function recordProgress() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    if (!t || !audio.currentTime) return;
    // Roll-over grace: a chapter we auto-advanced INTO plays from 0, but we hold off
    // overwriting its old bookmark until it's played `grace` seconds — so a brief
    // roll-through doesn't wipe real progress. (Fresh-start OFF never sets a guard.)
    if (rollGuard && String(t.ratingKey) === String(rollGuard.track)) {
      if (Plex.serverNow() < rollGuard.until) return;   // still within grace → preserve old
      rollGuard = null;                                  // grace passed → record normally (supersedes)
    }
    const posMs = audio.currentTime * 1000;
    myProgress[ctx.book] = { track: t.ratingKey, pos: posMs, ts: Plex.serverNow() };
    try { localStorage.setItem(MYPROG, JSON.stringify(myProgress)); } catch { /* best effort */ }
    const durMs = ((audio.duration && isFinite(audio.duration)) ? audio.duration * 1000 : 0) || t.durationMs || 0;
    // Durable + cross-device: the per-chapter record (track bars + chapter resume)
    // and an INDEPENDENT book-level record (tile bar + book resume) via bookTimes.
    Progress.recordTrack(ctx.book, t.ratingKey, posMs, durMs);
    const bt = bookTimes();
    Progress.recordBook(ctx.book, { t: t.ratingKey, o: posMs, cum: bt.cum * 1000, tot: bt.total * 1000 });
  }
  // The honest % for a chapter's bar from the merged progress data (null = nobody
  // has a record of playing it → caller falls back to Plex viewCount / 0).
  function getChapterPct(book, trackRk, durationMs) { return Progress.trackPct(book, trackRk, durationMs); }

  // On reload: reopen the last book PAUSED at its saved spot. Truly-fresh load
  // (nothing saved) OR a track that no longer exists → leave the bar hidden.
  async function restoreLastPlayed() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LAST) || 'null'); } catch {}
    if (!saved || !saved.book) { updatePlayerUI(); return; }
    try {
      const [alb, tracks] = await Promise.all([Plex.getAlbum(saved.book), Plex.getAlbumTracks(saved.book)]);
      const idx = tracks.findIndex((t) => String(t.ratingKey) === String(saved.track));
      if (!alb || !tracks.length || idx < 0) throw new Error('track no longer exists');
      ctx = { album: alb, tracks, idx, book: saved.book, updatedAt: saved.ts || Plex.serverNow(), coverUrl: alb.thumb ? Plex.artUrl(alb.thumb) : null };
      startTrack(idx, (saved.pos || 0) / 1000, false);
      updatePlayerUI(); setMediaSession();
    } catch {
      ctx = null; localStorage.removeItem(LAST); updatePlayerUI();
    }
  }

  // A peer that OWNS + is playing our currently-loaded book — the live session to
  // mirror/adopt. Gated on claim: it must own the session (newer claim than ours), so
  // once WE grab (scrub) or play, our fresher claim stops us mirroring/adopting it.
  function livePeerForCtx() {
    if (!ctx) return null;
    const p = peerFor(ctx.book);
    if (!p || p.state !== 'playing' || (p.claim || 0) <= Presence.getClaim()) return null;
    return p;
  }
  // The transport play button. If a peer is LIVE on this book, adopt the live session
  // (jump to its freshest spot) instead of resuming our stale local spot — pressing
  // play then claims (the 'play' handler → Presence.setPlaying) and supersedes them,
  // so it doesn't thrash: the peer pauses, we take over from where it was. (The old
  // no-chase rule predated reliable claim/supersede + published speed; the thrash it
  // avoided was a live peer beating a just-reloaded claim, now fixed.) With no live
  // peer, it just resumes our own loaded spot.
  function resumePlay() {
    if (!ctx) return;
    const p = livePeerForCtx();
    if (p) {
      const best = bestSource(ctx.book, bookEntries[ctx.book]);
      const idx = ctx.tracks.findIndex((t) => String(t.ratingKey) === String(best.track));
      if (idx >= 0) {
        if (window.PBDebug) PBDebug.log('PLAY', `resume ADOPT ${p.name || 'peer'} idx=${idx} pos=${((best.pos || 0) / 1000).toFixed(1)}s`);
        ctx.updatedAt = Plex.serverNow();
        if (idx === ctx.idx) { audio.currentTime = (best.pos || 0) / 1000; audio.play(); }
        else { startTrack(idx, (best.pos || 0) / 1000); Presence.setTrack(best.track, best.pos || 0); }   // peer moved to another chapter → load it + fix our board's track
        return;
      }
    }
    ctx.updatedAt = Plex.serverNow();
    audio.play();
  }

  // User changed playback speed on THIS device. Apply it locally AND publish a
  // presence event re-anchored to the current spot, so peers extrapolate a
  // playing device's live position at the new rate (livePos = pos + dt*speed).
  function onSpeedChange(rate) {
    audio.playbackRate = rate;
    try { localStorage.setItem('pb_speed', String(rate)); } catch { /* best effort — survives a reload */ }
    for (const c of speedCtls) c.setRate(rate, true);   // keep transport + now-playing labels in sync
    // Always keep presence's stored speed current (so the next play event
    // publishes it); re-anchor to the live pos when we have one, so a PLAYING
    // peer extrapolates at the new rate from here.
    Presence.setSpeed(rate, ctx ? audio.currentTime * 1000 : null);
    if (ctx) { ctx.updatedAt = Plex.serverNow(); if (npOpen) updateNowPlaying(); }
  }

  // User moved the playhead on THIS device: mark it as our latest activity and
  // publish immediately so peers pick up the new spot (incl. rewinds) fast.
  function onManualSeek() {
    if (!ctx) return;
    ctx.updatedAt = Plex.serverNow();
    Presence.flush(audio.currentTime * 1000);
    saveLastPlayed();
  }

  audio.addEventListener('ended', () => {
    // GUARD: a truncated/suspended stream can make iOS fire a BOGUS `ended` mid-track
    // (element's networkState went idle at the buffer edge). If we're nowhere near
    // Plex's KNOWN track duration, this is NOT a real end — never auto-advance (that
    // jumps to the next chapter at 0 and loses the listener's place). Keep the spot.
    const dm = ctx && ctx.tracks[ctx.idx] && ctx.tracks[ctx.idx].durationMs;
    if (dm && audio.currentTime * 1000 < dm - 15000) {
      if (window.PBDebug) PBDebug.log('PLAY', `BOGUS ended at ${audio.currentTime.toFixed(1)}s (track is ${(dm / 1000).toFixed(0)}s, dur=${(audio.duration || 0).toFixed(1)}) — holding position`);
      saveLastPlayed();
      updatePlayerUI();
      return;
    }
    recordProgress();   // this chapter genuinely finished → its bar records ~100%
    if (ctx && ctx.idx < ctx.tracks.length - 1) {
      rollToTrack(ctx.idx + 1);                          // sequential advance (fresh-start / grace aware)
    } else { writeProgress('stopped'); stopPresenceBeat(); }
    saveLastPlayed();
    updatePlayerUI();
  });
  audio.addEventListener('play', () => { updatePlayIcon(); startWriteTimer(); writeProgress('playing'); Presence.setPlaying(audio.currentTime * 1000); startPresenceBeat(); pumpBank(); });
  audio.addEventListener('pause', () => { updatePlayIcon(); stopWriteTimer(); writeProgress('paused'); Presence.setPaused(audio.currentTime * 1000); stopPresenceBeat(); Progress.flush(); pumpBank(); });
  audio.addEventListener('timeupdate', updateSeekUI);
  // Repaint the blue meter as the native playback buffer grows (`progress`) and as
  // the playhead moves (`timeupdate`) — so it reflects REAL current-stream load,
  // not just the banking fetch. setBuffered throttles to whole-percent ticks.
  audio.addEventListener('progress', () => {
    paintMeter();
    // The element is actively pulling with a LOW forward buffer → it needs the
    // bandwidth; abort any in-flight bank so banking never contends (the iOS bug).
    // A healthy buffer means the progress is incidental — let banking continue.
    if (bankCtl && elementBusy()) { try { bankCtl.abort(); } catch {} }
  });
  audio.addEventListener('timeupdate', paintMeter);
  // iOS keeps networkState=LOADING and fires 'stalled' (not 'suspend') when it goes
  // idle on a big buffer — both are prefetch windows; pumpBank's buffer gate decides.
  audio.addEventListener('suspend', pumpBank);
  audio.addEventListener('stalled', () => { pumpBank(); maybeRecoverFromBank(); });
  audio.addEventListener('canplaythrough', pumpBank);
  audio.addEventListener('waiting', maybeRecoverFromBank);
  audio.addEventListener('playing', () => { clearTimeout(stallTimer); stallTimer = null; });
  // Network drops on a slow relay surface as MEDIA_ERR_NETWORK — don't give up,
  // reload the same track at the position we'd reached, with exponential backoff.
  // MEDIA_ERR_ABORTED just means we swapped src on purpose, so ignore it.
  audio.addEventListener('error', () => {
    const err = audio.error;
    if (!err || err.code === err.MEDIA_ERR_ABORTED) return;
    if (window.PBDebug) PBDebug.log('AUDIO_ERR', `code=${err.code} t=${(audio.currentTime||0).toFixed(1)} ${(err.message||'')}`);
    // If this exact track is already fully banked, recover from the local copy
    // immediately — startTrack prefers the blob, so no network + no backoff.
    const haveBank = !!(curLoad && banks.has(curLoad.idx));
    if (curLoad && err.code === err.MEDIA_ERR_NETWORK && (haveBank || loadRetry < MAX_LOAD_RETRY)) {
      const at = Math.max(audio.currentTime || 0, curLoad.seekSec || 0);   // resume where we were
      const wasPlaying = !audio.paused || curLoad.autoplay;
      let delay;
      if (haveBank) { delay = 0; toast('Playing from downloaded copy'); }
      else { loadRetry++; delay = Math.min(1000 * 2 ** (loadRetry - 1), 8000); toast(`Connection hiccup — retrying… (${loadRetry}/${MAX_LOAD_RETRY})`); }
      clearTimeout(loadRetryTimer);
      loadRetryTimer = setTimeout(() => {
        if (!ctx) return;
        if (window.PBDebug) PBDebug.log('PLAY', `retrying load idx=${curLoad.idx} at=${at.toFixed(1)}s (attempt ${loadRetry}/${MAX_LOAD_RETRY}${haveBank ? ', from bank' : ''})`);
        startTrack(curLoad.idx, at, wasPlaying);
      }, delay);
      return;
    }
    toast('Playback error — could not load audio.');
  });

  // ---- progress write-back -------------------------------------------------
  function startWriteTimer() { stopWriteTimer(); writeTimer = setInterval(() => writeProgress('playing'), 15000); }
  function stopWriteTimer() { if (writeTimer) { clearInterval(writeTimer); writeTimer = null; } }

  // Slow liveness / anti-drift pulse: re-anchor our presence position every 30s
  // while playing (position between pulses is extrapolated, not written).
  let presenceBeat = null;
  function startPresenceBeat() { stopPresenceBeat(); presenceBeat = setInterval(() => { if (ctx && !audio.paused) Presence.flush(audio.currentTime * 1000); }, 30000); }
  function stopPresenceBeat() { if (presenceBeat) { clearInterval(presenceBeat); presenceBeat = null; } }
  function writeProgress(state) {
    if (!ctx) return;
    ctx.updatedAt = Plex.serverNow();    // this device just acted on this book
    const t = ctx.tracks[ctx.idx];
    if (!t || !audio.currentTime) return;
    const posMs = audio.currentTime * 1000;
    const durMs = t.durationMs || (audio.duration || 0) * 1000;
    const book = ctx.book, track = t.ratingKey;
    const queue = () => { if (window.SyncQueue) SyncQueue.enqueue({ type: 'progress', bookKey: book, ratingKey: track, positionMs: posMs, durationMs: durMs, state, source: 'writeProgress' }); };
    // Known-offline: skip the slow retrying write and queue straight away. The
    // reconnect pass flushes it conflict-safely (syncqueue.js). Otherwise write
    // live, and queue only if that write ultimately failed.
    if (window.Net && Net.state().plexReachable === false) { queue(); }
    else {
      Promise.resolve(Plex.writeTimeline({ ratingKey: track, state, timeMs: posMs, durationMs: durMs }))
        .then((ok) => { if (ok === false) queue(); }).catch(queue);
    }
    saveLastPlayed();
  }

  // ---- player UI -----------------------------------------------------------
  function updatePlayerUI() {
    const bar = $('player');
    // The transport stays in the DOM even under the NP overlay (z 35 < 60, so
    // it's invisible there) — removing it changed page height, see setView.
    const showBar = !!ctx;
    document.body.classList.toggle('has-player', showBar);
    bar.classList.toggle('hidden', !showBar);
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    $('pTitle').textContent = ctx.album.title || 'Book';
    $('pSub').textContent = `${ctx.album.parentTitle || ''} · ${t.title || 'Chapter ' + (ctx.idx + 1)}`;
    setArt($('pCover'), ctx.coverUrl);
    updatePlayIcon();
    if (npOpen) updateNowPlaying();
  }
  function updatePlayIcon() { $('pPlay').textContent = audio.paused ? '▶' : '⏸'; if (npOpen) updateNpPlayIcon(); }
  function updateSeekUI() {
    const cur = audio.currentTime || 0, dur = audio.duration || 0;
    $('pCur').textContent = fmt(cur);
    $('pDur').textContent = fmt(dur);
    const playedPct = dur ? (cur / dur) * 100 : 0;
    const s = $('pSeek'); if (!s.dragging) { s.value = playedPct * 10; s.style.setProperty('--played', playedPct + '%'); }
    if (scrubbing) return;   // mid-drag: skip the library-DOM writes below (their reflow is what stutters the drag)
    if (ctx && !audio.paused) updateBookLines();   // tick the book time line for the playing book
    updatePlayingFileRow();
    if (npOpen) updateNowPlaying();
  }

  // Manual pointer-driven scrubbing for the seek sliders. iOS Safari does NOT
  // reliably honor touch-action:none on range inputs sitting over a scrollable
  // page — mid-drag it reclassifies the gesture as a page scroll and cancels
  // the slider drag (the mini-bar "stops dragging / hard to re-grab" jank; the
  // Now-Playing scrubber was smooth only because its overlay has nothing to
  // scroll). Pointer capture + preventDefault(touchmove) takes Safari's gesture
  // arbitration out of the loop; it also makes the whole bar grabbable (value
  // jumps to the finger — no hunting for the 14px thumb).
  function bindScrub(slider) {
    const paint = (x) => {
      const r = slider.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (x - r.left) / r.width));
      slider.value = pct * 1000;
      slider.style.setProperty('--played', (pct * 100) + '%');
    };
    const commit = () => {
      if (!slider.dragging) return;
      slider.dragging = false; scrubbing = false;
      if (audio.duration) audio.currentTime = (slider.value / 1000) * audio.duration;
      if (slider._grab) { slider._grab = false; grabFromPeer(); }   // scrubbed a green (peer) bar → take over
      else onManualSeek();
    };
    slider.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) return;
      slider.dragging = true; scrubbing = true;
      slider._grab = mirroring;   // grabbing the green peer-mirrored bar = scrub-to-handoff
      try { slider.setPointerCapture(e.pointerId); } catch {}
      paint(e.clientX);
      e.preventDefault();   // suppress the native widget drag — ours replaces it
    });
    slider.addEventListener('pointermove', (e) => { if (slider.dragging) paint(e.clientX); });
    slider.addEventListener('pointerup', commit);
    slider.addEventListener('pointercancel', commit);   // if iOS still steals the gesture, keep the position reached
    slider.addEventListener('touchmove', (e) => { if (slider.dragging) e.preventDefault(); }, { passive: false });
    // Keyboard (arrow keys) still drives the native value path.
    slider.addEventListener('change', () => {
      if (slider.dragging) return;
      if (audio.duration) audio.currentTime = (slider.value / 1000) * audio.duration;
      if (mirroring) grabFromPeer(); else onManualSeek();   // keyboard scrub on a green bar also grabs
    });
  }

  // ---- skip amounts (configurable on the Options screen; default 10s) -------
  const SKIP = { back: 'pb_skipBack', fwd: 'pb_skipFwd' };
  const getSkipBack = () => parseInt(localStorage.getItem(SKIP.back) || '10', 10) || 10;
  const getSkipFwd = () => parseInt(localStorage.getItem(SKIP.fwd) || '10', 10) || 10;
  function skipBy(sec) {
    if (!ctx) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, (audio.currentTime || 0) + sec));
    onManualSeek();
  }
  // Sequential move to an adjacent chapter (auto-advance / Next / Prev). With
  // "Fresh start on auto-advance" ON: begin at 0 and arm the grace guard so the
  // destination's old bookmark survives a brief roll-through (see recordProgress);
  // grace 0 clears it at once. OFF: resume the destination from its stored offset.
  function rollToTrack(idx) {
    const dst = ctx.tracks[idx], rk = dst.ratingKey;
    let seekSec = 0;
    if (freshStartOn()) {
      const g = resetGraceSec();
      rollGuard = g > 0 ? { track: rk, until: Plex.serverNow() + g * 1000 } : null;
      if (g <= 0) Progress.recordTrack(ctx.book, rk, 0, dst.durationMs || 0);   // clear immediately
    } else {
      rollGuard = null;
      const r = Progress.trackRecord(ctx.book, rk);
      if (r && r.d) seekSec = Math.min(r.o, Math.max(0, r.d - 1000)) / 1000;
    }
    startTrack(idx, seekSec);
    Presence.setTrack(rk, seekSec * 1000);
    updatePlayerUI(); setMediaSession();
  }
  function prevTrack() {
    if (!ctx) return;
    // >10s into the track → restart it; otherwise step to the previous track.
    if ((audio.currentTime || 0) > 10) { audio.currentTime = 0; onManualSeek(); return; }
    if (ctx.idx > 0) { recordProgress(); rollToTrack(ctx.idx - 1); }
  }
  function nextTrack() { if (ctx && ctx.idx < ctx.tracks.length - 1) { recordProgress(); rollToTrack(ctx.idx + 1); } }
  function updateSkipLabels() {
    $('pBack').title = 'Skip back ' + getSkipBack() + 's';
    $('pFwd').title = 'Skip forward ' + getSkipFwd() + 's';
    if (npOpen) buildNpControls();
  }

  // ---- Options screen ------------------------------------------------------
  const getBufferMB = () => Math.min(parseInt(localStorage.getItem(BANK_KEY) || '', 10) || DEFAULT_BUDGET_MB, MAX_BUDGET_MB);
  function renderOptions() {
    renderDeviceName();
    const fill = (sel, cur, opts, label) => {
      sel.innerHTML = '';
      opts.forEach((v) => {
        const o = document.createElement('option');
        o.value = v; o.textContent = label ? label(v) : v; if (v === cur) o.selected = true;
        sel.appendChild(o);
      });
    };
    const SKIPS = [5, 10, 15, 20, 30, 45, 60];
    fill($('optSkipBack'), getSkipBack(), SKIPS);
    fill($('optSkipFwd'), getSkipFwd(), SKIPS);
    // Look-ahead only — the current + next chapter always bank (capped per-track)
    // for a seamless boundary. Kept small so iOS doesn't OOM.
    fill($('optBuffer'), getBufferMB(), [0, 32, 64], (v) => (v === 0 ? 'Off' : v));
    $('optFreshStart').setAttribute('aria-checked', freshStartOn() ? 'true' : 'false');
    fill($('optResetGrace'), resetGraceSec(), [0, 5, 10, 20, 30], (v) => (v === 0 ? 'Now' : v));
  }

  // ---- Now-Playing screen --------------------------------------------------
  let npSpeedCtl = null;
  function renderNowPlaying() {
    if (!ctx) { goBack(); return; }
    const t = ctx.tracks[ctx.idx];
    setArt($('npArt'), ctx.coverUrl);
    $('npTitle').textContent = ctx.album.title || 'Book';
    $('npAuthor').textContent = ctx.album.parentTitle || '';
    $('npTrack').textContent = t.title || ('Chapter ' + (ctx.idx + 1));
    buildNpControls();
    if (!npSpeedCtl) {
      npSpeedCtl = SpeedControl.create({ initial: audio.playbackRate || 1, onChange: onSpeedChange });
      $('npSpeedMount').appendChild(npSpeedCtl.el);
      speedCtls.push(npSpeedCtl);
    }
    npSpeedCtl.setRate(audio.playbackRate || 1, true);
    updateNowPlaying();
  }
  // Skip icon = circular arrow (S1) with the second-count inside; currentColor.
  function skipSvg(dir, n) {
    const arc = dir === 'back' ? 'M12 6 A6 6 0 1 1 6 12' : 'M12 6 A6 6 0 1 0 18 12';
    const head = dir === 'back' ? 'M12 3 L12 6 L9 6 Z' : 'M12 3 L12 6 L15 6 Z';
    return `<svg viewBox="0 0 24 24"><path d="${arc}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="${head}" fill="currentColor"/><text x="12" y="15" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" font-family="system-ui">${n}</text></svg>`;
  }
  function buildNpControls() {
    const c = $('npControls');
    c.innerHTML = `
      <button id="npPrev" class="np-rnd" aria-label="Previous track"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
      <button id="npBack" class="np-skip" aria-label="Skip back">${skipSvg('back', getSkipBack())}</button>
      <button id="npPlay" class="np-play" aria-label="Play/Pause"></button>
      <button id="npFwd" class="np-skip" aria-label="Skip forward">${skipSvg('fwd', getSkipFwd())}</button>
      <button id="npNext" class="np-rnd" aria-label="Next track"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>`;
    $('npPrev').onclick = prevTrack;
    $('npBack').onclick = () => skipBy(-getSkipBack());
    $('npPlay').onclick = () => (audio.paused ? resumePlay() : audio.pause());
    $('npFwd').onclick = () => skipBy(getSkipFwd());
    $('npNext').onclick = nextTrack;
    updateNpPlayIcon();
  }
  function updateNpPlayIcon() {
    const b = $('npPlay');
    if (!b) return;
    b.innerHTML = audio.paused
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
  }
  function updateNowPlaying() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    const cur = audio.currentTime || 0;
    const dur = audio.duration || (t.durationMs || 0) / 1000;
    const speed = audio.playbackRate || 1;
    const playedPct = dur ? (cur / dur) * 100 : 0;
    const s = $('npSeek'); if (s && !s.dragging) { s.value = playedPct * 10; s.style.setProperty('--played', playedPct + '%'); }
    $('npCur').textContent = fmt(cur);
    $('npTrkRem').textContent = '-' + fmt(Math.max(0, dur - cur) / speed);   // scaled for speed
    $('npBookRem').textContent = '-' + fmt(bookTimes().remain / speed);      // whole-book remaining (shared arithmetic)
    updateNpPlayIcon();
  }

  // ---- track-info bottom sheet ---------------------------------------------
  const fmtBytes = PBLogic.fmtBytes;
  function showSheet() { const s = $('infoSheet'); s.classList.remove('hidden'); requestAnimationFrame(() => s.classList.add('open')); }
  function hideSheet() { const s = $('infoSheet'); s.classList.remove('open'); setTimeout(() => s.classList.add('hidden'), 280); }
  async function openInfoSheet() {
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    $('sheetBlurb').textContent = ''; $('sheetBlurb').classList.add('hidden');
    $('sheetRows').innerHTML = '<div class="center"><div class="spinner"></div></div>';
    showSheet();
    try {
      const [info, alb] = await Promise.all([
        Plex.getTrackInfo(t.ratingKey),
        (ctx.album && ctx.album.summary != null) ? Promise.resolve(ctx.album) : Plex.getAlbum(ctx.book).catch(() => null),
      ]);
      const blurb = (alb && alb.summary) || '';
      $('sheetBlurb').textContent = blurb;
      $('sheetBlurb').classList.toggle('hidden', !blurb);
      const dash = (v) => (v || v === 0) && v !== '' ? v : '—';
      const rows = [
        ['Type', info && info.container ? info.container + (info.codec && info.codec !== info.container ? ' · ' + info.codec : '') : '—'],
        ['Bitrate', info && info.bitrate ? info.bitrate + ' kbps' : '—'],
        ['Bit depth', info && info.bitDepth ? info.bitDepth + '-bit' + (info.samplingRate ? ' / ' + (info.samplingRate / 1000) + ' kHz' : '') : '—'],
        ['Channels', info && info.channels ? (info.channels === 1 ? 'Mono' : info.channels === 2 ? 'Stereo' : info.channels + ' ch') : '—'],
        ['File size', info && info.size ? fmtBytes(info.size) : '—'],
      ];
      $('sheetRows').innerHTML = rows.map(() => '<div class="sheet-row"><span class="sk"></span><span class="sv"></span></div>').join('');
      const rowEls = $('sheetRows').querySelectorAll('.sheet-row');
      rows.forEach(([k, v], i) => { rowEls[i].querySelector('.sk').textContent = k; rowEls[i].querySelector('.sv').textContent = dash(v); });
    } catch { $('sheetRows').innerHTML = '<div class="sheet-row"><span class="sk">Could not load track info</span></div>'; }
  }

  // ---- book long-press context menu ----------------------------------------
  // Long-press (touch) or right-click (desktop) a book tile/row → an animated
  // pop-over of actions. Extensible: add entries to bookMenuItems(). For now the
  // only action is Reset Progress (danger, with an inline tap-again confirm).
  let bookMenuOpen = false;
  let longPressAt = 0;   // timestamp a long-press opened the menu → swallow the click it spawns

  function bookMenuItems(book, title) {
    return [{
      label: 'Reset Progress', danger: true, confirm: true,
      ico: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>',
      run: () => doResetProgress(book, title),
    }];
  }

  function openBookMenu(book, title) {
    const menu = $('bookMenu');
    $('bookMenuTitle').textContent = title || 'Book';
    const host = $('bookMenuItems');
    host.innerHTML = '';
    bookMenuItems(book, title).forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bmenu-item' + (item.danger ? ' danger' : '');
      btn.innerHTML = `<span class="bmenu-ico">${item.ico || ''}</span><span class="bmenu-label"></span>`;
      const label = btn.querySelector('.bmenu-label');
      label.textContent = item.label;
      let armed = false;
      btn.addEventListener('click', async () => {
        if (item.confirm && !armed) { armed = true; btn.classList.add('confirming'); label.textContent = 'Tap again to confirm'; return; }
        closeBookMenu();
        try { await item.run(); } catch { toast('Action failed'); }
      });
      host.appendChild(btn);
    });
    menu.classList.remove('hidden');
    requestAnimationFrame(() => menu.classList.add('open'));
    bookMenuOpen = true;
  }
  function closeBookMenu() {
    const menu = $('bookMenu');
    menu.classList.remove('open');
    setTimeout(() => menu.classList.add('hidden'), 200);
    bookMenuOpen = false;
  }

  // Reset ALL saved progress for a book: unplay every track on Plex + drop it from
  // the resume store, then clear our local echoes and repaint the affected screens.
  async function doResetProgress(book, title) {
    toast('Resetting…');
    let tracks = [];
    try { tracks = await Plex.getAlbumTracks(book); } catch {}
    const rks = tracks.map((t) => t.ratingKey).filter(Boolean);
    try { await Plex.resetBookProgress(book, rks); }
    catch { return toast('Reset failed'); }
    delete myProgress[book];                                            // our own last spot on this device
    try { localStorage.setItem(MYPROG, JSON.stringify(myProgress)); } catch {}
    Progress.clearBook(book);                                           // durable per-chapter + book records (republishes our board)
    delete bookEntries[book];                                           // cold resume the tile shows
    try { const last = JSON.parse(localStorage.getItem(LAST) || 'null'); if (last && String(last.book) === String(book)) localStorage.removeItem(LAST); } catch {}
    try { await loadHomeData(); } catch {}                              // fresh library → viewedLeafCount reset
    Browse.clearCache();
    const d = currentDesc();
    if (d && d.v !== 'home' && d.v !== 'nowplaying' && d.v !== 'options') applyScreen(d, { render: true, resetScroll: false });
    renderPresence();
    toast(`Progress reset — ${title || 'book'}`);
  }

  function openBookForEl(el) {
    if (!el) return;
    const titleEl = el.querySelector('.ttitle, .title');
    openBookMenu(el.dataset.book, (titleEl && titleEl.textContent) || 'Book');
  }
  const bookElAt = (target) => target && target.closest && target.closest('.tile[data-book], .book[data-book]');

  function bindBookMenu() {
    const menu = $('bookMenu');
    menu.querySelector('.bookmenu-scrim').addEventListener('click', closeBookMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bookMenuOpen) closeBookMenu(); });
    // Desktop: right-click a book element.
    document.addEventListener('contextmenu', (e) => {
      const el = bookElAt(e.target);
      if (!el) return;
      e.preventDefault();
      openBookForEl(el);
    });
    // Touch: press-and-hold ~500 ms without moving (a move = carousel/list scroll).
    let timer = null, sx = 0, sy = 0;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    document.addEventListener('touchstart', (e) => {
      if (bookMenuOpen) return;
      const el = bookElAt(e.target);
      if (!el) return;
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
      cancel();
      timer = setTimeout(() => {
        timer = null; longPressAt = Date.now();
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }   // Android only; iOS Safari ignores
        openBookForEl(el);
      }, 500);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!timer) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) cancel();
    }, { passive: true });
    document.addEventListener('touchend', cancel, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    // Swallow the synthetic click a long-press spawns (would open the book / start
    // playback). Guarded to a short window and to clicks OUTSIDE the menu card, so
    // menu-item taps and a later deliberate scrim dismiss still work.
    document.addEventListener('click', (e) => {
      if (longPressAt && Date.now() - longPressAt < 700 && !(e.target.closest && e.target.closest('.bookmenu-card'))) {
        longPressAt = 0; e.stopPropagation(); e.preventDefault();
      }
    }, true);
  }

  // ---- Media Session -------------------------------------------------------
  function setMediaSession() {
    if (!('mediaSession' in navigator) || !ctx) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ctx.tracks[ctx.idx].title || ctx.album.title,
      artist: ctx.album.parentTitle || '',
      album: ctx.album.title || '',
      artwork: ctx.coverUrl ? [{ src: ctx.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => resumePlay());
    ms.setActionHandler('pause', () => audio.pause());
    ms.setActionHandler('seekbackward', () => skipBy(-getSkipBack()));
    ms.setActionHandler('seekforward', () => skipBy(getSkipFwd()));
    ms.setActionHandler('previoustrack', prevTrack);
    ms.setActionHandler('nexttrack', nextTrack);
  }

  // ---- wire up -------------------------------------------------------------
  function bind() {
    $('signinBtn').addEventListener('click', doSignIn);
    // Full-library browse: bottom nav + the Browse module (js/browse.js).
    Browse.init({
      mount: $('browse'), fmt,
      onPlay: playFromBrowse, onPlayFile: playFileFromBrowse,
      onOpenAuthor: openAuthor, onOpenFiles: openFiles, onBack: goBack,
      getResumeEntry: (rk) => bookEntries[rk] || null,
      getChapterPct,
      getPeers: () => peersNow,
      onRender: renderPresence,   // paint live peer/resume numbers right after a render
    });
    document.querySelectorAll('#navbar [data-nav]').forEach((b) => b.addEventListener('click', () => {
      const n = b.dataset.nav;
      if (n === 'home') goHome();
      else if (n === 'authors') goAuthors();
      else if (n === 'books') goBooks();
      else goOptions();
    }));
    $('brandHome').addEventListener('click', goHome);
    // Persist each home carousel's horizontal scroll as it scrolls. A display:none
    // element reports scrollLeft as 0, so when home is hidden (on a browse page) we
    // can't read it for the swipe snapshot — the snapshot would show the FIRST tiles
    // while the real home restores its actual scroll = a tile flicker on swipe-back
    // to home (but NOT from NP, where home stays visible). scroll doesn't bubble →
    // capture. Read back via `dataset.sl` in copyScroll + restoreCarousels.
    document.addEventListener('scroll', (e) => {
      const t = e.target;
      if (t && t.classList && t.classList.contains('carousel')) t.dataset.sl = t.scrollLeft;
    }, { capture: true, passive: true });
    bindSwipeBack();
    bindPullRefresh();
    bindBookMenu();
    // Playback speed — transport mini-bar control (a second one is mounted in
    // Now-Playing; both stay in sync via onSpeedChange). Restore the last speed so a
    // reload doesn't silently drop back to 1× — startTrack's onMeta reapplies it.
    const savedSpeed = (() => { const v = parseFloat(localStorage.getItem('pb_speed')); return v > 0 ? v : 1.0; })();
    audio.playbackRate = savedSpeed;
    // Tell Presence our real rate NOW. Restoring speed from localStorage never went
    // through onSpeedChange, so st.speed stayed at its default 1 → we published
    // speed:1 while playing at e.g. 1.5×, and peers extrapolated our live position too
    // slowly (they resumed further and further BEHIND us the longer we played).
    Presence.setSpeed(savedSpeed);
    speedCtl = SpeedControl.create({ initial: savedSpeed, onChange: onSpeedChange });
    document.querySelector('.player .controls').appendChild(speedCtl.el);
    speedCtls.push(speedCtl);
    $('pPlay').addEventListener('click', () => (audio.paused ? resumePlay() : audio.pause()));
    $('pBack').addEventListener('click', () => skipBy(-getSkipBack()));
    $('pFwd').addEventListener('click', () => skipBy(getSkipFwd()));
    updateSkipLabels();
    // Tap a non-interactive part of the transport → open Now-Playing.
    $('player').addEventListener('click', (e) => { if (e.target.closest('.controls, .seekrow')) return; openNowPlaying(); });
    // Now-Playing wiring. (No close button — swipe right or browser-back exits.)
    // Block the document pull-down bounce through the overlay: when the NP
    // content fits (nothing to scroll), swallow vertical drags so they can't
    // chain to the page behind. When it overflows, native scrolling works.
    const npEl = $('nowplaying');
    npEl.addEventListener('touchmove', (e) => {
      if (npEl.scrollHeight <= npEl.clientHeight + 1 && !e.target.closest('input')) e.preventDefault();
    }, { passive: false });
    bindScrub($('npSeek'));
    $('npInfo').addEventListener('click', openInfoSheet);
    $('npSleep').addEventListener('click', () => toast('Sleep timer — coming soon'));
    $('npMarks').addEventListener('click', () => toast('Bookmarks — coming soon'));
    // Track-info sheet: close button, scrim tap, and swipe-down to dismiss.
    $('sheetClose').addEventListener('click', hideSheet);
    $('infoSheet').querySelector('.sheet-scrim').addEventListener('click', hideSheet);
    (() => {
      const panel = $('infoSheet').querySelector('.sheet-panel');
      let sy = null;
      panel.addEventListener('touchstart', (e) => { if (panel.scrollTop > 0) { sy = null; return; } sy = e.touches[0].clientY; panel.style.transition = 'none'; }, { passive: true });
      panel.addEventListener('touchmove', (e) => { if (sy == null) return; const dy = e.touches[0].clientY - sy; if (dy > 0) panel.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
      panel.addEventListener('touchend', (e) => { if (sy == null) return; const dy = e.changedTouches[0].clientY - sy; panel.style.transition = ''; panel.style.transform = ''; if (dy > 90) hideSheet(); sy = null; }, { passive: true });
    })();
    $('npAirplay').addEventListener('click', () => {
      if (typeof audio.webkitShowPlaybackTargetPicker === 'function') { try { audio.webkitShowPlaybackTargetPicker(); } catch { toast('AirPlay unavailable'); } }
      else toast('AirPlay needs Safari');
    });
    // Options: skip-second settings.
    $('optSkipBack').addEventListener('change', (e) => { localStorage.setItem(SKIP.back, e.target.value); updateSkipLabels(); });
    $('optSkipFwd').addEventListener('change', (e) => { localStorage.setItem(SKIP.fwd, e.target.value); updateSkipLabels(); });
    $('optBuffer').addEventListener('change', (e) => { localStorage.setItem(BANK_KEY, e.target.value); pumpBank(); });   // grew → prefetch more now; shrank → slides down as we advance
    // Options: roll-over behaviour (see rollToTrack / recordProgress grace guard).
    $('optFreshStart').addEventListener('click', () => { const on = freshStartOn(); localStorage.setItem(FRESH, on ? '0' : '1'); $('optFreshStart').setAttribute('aria-checked', on ? 'false' : 'true'); });
    $('optResetGrace').addEventListener('change', (e) => localStorage.setItem(GRACE_KEY, e.target.value));
    $('signout').addEventListener('click', () => {
      if (!confirm('Sign out of Plex?')) return;
      Plex.signOut(); audio.pause(); clearBanks(); setBuffered(0); ctx = null; updatePlayerUI(); show('signin');
      $('navbar').classList.add('hidden'); Browse.reset(); setView('home'); setNavActive('home');
      localStorage.removeItem(LAST);
      Presence.setActive(false); stopRenderTick();
      $('signinBtn').disabled = false; $('signinBtn').textContent = 'Sign in with Plex';
    });
    bindScrub($('pSeek'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { writeProgress(audio.paused ? 'paused' : 'playing'); Presence.setActive(false); Progress.flush(); Progress.setActive(false); stopRenderTick(); }
      else if (!$('library').classList.contains('hidden')) { Presence.setActive(true); Progress.setActive(true); startRenderTick(); }
    });
    // Back online → push whatever we recorded offline, then re-read peers so a LWW
    // merge settles who's most recent (offline data wins only if genuinely newer).
    window.addEventListener('online', () => { Progress.flush(); Progress.refresh(); });
  }

  // Service worker: NETWORK-FIRST (see sw.js). It exists so a pushed build lands
  // on a plain reopen/refresh — no private tab needed, so localStorage (and the
  // Plex token) survives and you stay signed in. Escape hatch: load the app with
  // #nosw (or ?nosw=1) to tear the SW + caches down if it ever misbehaves.
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (/[?#&]nosw/.test(location.href)) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
      toast('Service worker disabled for this session');
      return;
    }
    // Cache-first SW (see sw.js): it serves the shell instantly and does NOT
    // auto-skipWaiting. A new build precaches itself and WAITS; we surface it as
    // "Update available — reload to apply" (Net banner) instead of a surprise
    // reload. When the user applies it, the waiting worker activates and
    // controllerchange fires → reload picks up the complete new build.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;   // first install never reloads
      reloaded = true;
      // A new build took over. Reload to land fully on it (avoids the mixed
      // old-HTML/new-JS state) — but don't yank a listening session: if audio is
      // playing, defer the reload until the next pause.
      const go = () => { if (window.PBDebug) PBDebug.log('SW', 'new build active — reloading'); location.reload(); };
      if (audio && !audio.paused) {
        if (window.PBDebug) PBDebug.log('SW', 'new build active — reload deferred until pause');
        audio.addEventListener('pause', go, { once: true });
      } else go();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      const offerIfWaiting = () => { if (reg.waiting && navigator.serviceWorker.controller && window.Net) Net.setUpdateReady(reg); };
      offerIfWaiting();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // Installed while an old worker still controls us = a new build is fully
          // downloaded/cached and ready. Offer it (never auto-apply).
          if (nw.state === 'installed' && navigator.serviceWorker.controller && window.Net) Net.setUpdateReady(reg);
        });
      });
      reg.update().catch(() => {});
      // Re-check for a new build every time the app returns to the foreground.
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  }

  async function init() {
    // Diagnostics: instrument the audio element (media events + stall watchdog)
    // and provide the state snapshot the log pipe / remote `state` command use.
    PBDebug.watchAudio(audio);
    // Log every user tap (capture phase, before handlers) so a report shows the
    // STIMULUS → response: which tile/button was pressed, with its book/track. Lets
    // us tell a user action apart from an app-driven one when reading the log.
    document.addEventListener('click', (e) => {
      if (!window.PBDebug) return;
      const t = e.target;
      const hit = (t.closest && t.closest('.tile,.bookrow,.filerow,.navbtn,.covertap,button,[data-book],[data-track],a')) || t;
      const bookEl = hit.closest && hit.closest('[data-book]');
      const trackEl = hit.closest && hit.closest('[data-track]');
      const id = hit.id ? '#' + hit.id
        : (typeof hit.className === 'string' && hit.className ? '.' + hit.className.trim().split(/\s+/)[0] : (hit.tagName || '?').toLowerCase());
      const label = (hit.getAttribute && (hit.getAttribute('aria-label') || hit.getAttribute('title'))) || (hit.textContent || '').trim().slice(0, 24);
      PBDebug.log('TAP', `${id}${label ? ' "' + label + '"' : ''}${bookEl ? ' book=' + bookEl.dataset.book : ''}${trackEl ? ' track=' + trackEl.dataset.track : ''}`);
    }, true);
    PBDebug.registerState(() => ({
      audio: {
        src: audio.src ? (audio.src.startsWith('blob:') ? 'banked' : 'stream') : null,
        t: +(audio.currentTime || 0).toFixed(1), dur: +(audio.duration || 0).toFixed(1),
        paused: audio.paused, rate: audio.playbackRate,
        rs: audio.readyState, ns: audio.networkState,
        err: audio.error ? audio.error.code : null,
      },
      book: ctx ? { rk: ctx.book, idx: ctx.idx, tracks: ctx.tracks.length, title: (ctx.album.title || '').slice(0, 40) } : null,
      banks: { n: banks.size, mb: +(usedBytes() / 1048576).toFixed(1), banking: bankingIdx, budgetMb: getBufferMB() },
      peers: peersNow.length,
      view: (currentDesc() && currentDesc().v) || 'home',
    }));
    bind();
    initServiceWorker();
    // Offline resilience wiring: ask for persistent storage, bring up the pending
    // sync queue (its count drives the banner), and start the connectivity model.
    // Net's reconnect pass re-runs loadHomeData + flushes the queue when Plex
    // returns. All guarded — the app still runs if any module failed to load.
    if (window.Store) Store.persist();
    if (window.SyncQueue) SyncQueue.init({ onChange: (n) => { if (window.Net) Net.setPendingCount(n); } });
    if (window.Net) Net.init({
      onReconnect: async () => { if (!$('library').classList.contains('hidden')) { try { await loadHomeData(); } catch {} } },
    });
    if (Plex.isSignedIn()) return enterApp();
    show('signin');
  }
  init();
})();
