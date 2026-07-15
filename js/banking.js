// banking.js — the playback BUFFERING subsystem ("banking"), extracted from
// app.js (review #6 — the capstone). It prefetches upcoming chapters and whole-
// banks the current one for drop-resilience, YIELDING to the live <audio> element
// so it never contends with playback (the .35/.36 iOS code=4 lesson). It also owns
// the blue "buffered" meter on the transport / Now-Playing sliders.
//
// Welded to live playback by nature: it reads ctx/audio through injected getters,
// is driven by the audio event loop (pump() from suspend/stalled/canplaythrough/
// play/pause + the timeupdate heartbeat), and is QUERIED by startTrack's source-
// selection (has()/bankedUrl()). So app.js keeps thin hoisted delegators
// (pumpBank/clearBanks/elementBusy/paintMeter/… — its many call sites unchanged)
// and injects the live state + the few things banking calls back into. The pure
// numeric behaviour is unchanged from the in-app version — this moved WHERE it
// lives, not WHAT it does. `locallyStored` (a playback-source predicate that
// startTrack/bestSource also use) stays in app.js and is injected here.
const Banking = (() => {
  // Injected by app.js: { getCtx, audio, Settings, byId, updateFileRows,
  //   startTrack, getCurLoad, toast, locallyStored, Plex }
  let d = null;

  const MAX_AHEAD = 60;
  const BANK_MIN_AHEAD = 60;                // prefetch only when the element has ≥ this many seconds buffered ahead
  const MAX_TOTAL_BANK_BYTES = 128 * 1024 * 1024;   // RAM-COPY ceiling (no-SW fallback path) — the .27-era jetsam guard
  const bankBudgetBytes = () => (window.Downloads && Downloads.bufMaxBytes) ? Downloads.bufMaxBytes() : 512 * 1024 * 1024;   // shared disk buffer-space budget; a chapter bigger than the WHOLE budget streams
  const banks = new Map();                  // idx -> { url, bytes } of a fully-downloaded track
  const skipBank = new Set();               // idxs too big to bank — stream them, don't keep retrying
  let bankBook = null;                      // book `banks` belongs to (keyed by idx → wipe on book change)
  let bankCtl = null;                       // AbortController for the one in-flight download
  let bankingIdx = -1;                      // idx currently downloading
  let bufferedPct = 0;
  let bufferedShown = -1;                   // last whole-percent painted, to skip redundant repaints
  let bankPct = 0;                          // banking fetch's byte-progress for the CURRENT track (0 = not driving)
  let stallTimer = null;

  const estBytes = (t) => Math.round((((t && t.durationMs) || 0) / 1000) * 16000);   // 128 kbps CBR ≈ 16 KB/s
  const fitsTotal = (est) => est <= bankBudgetBytes();

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

  // ---- the blue "buffered" meter on the transport / NP sliders ----------------
  function setBuffered(pct) {
    bufferedPct = Math.max(0, Math.min(100, pct || 0));
    const r = Math.round(bufferedPct);
    if (r === bufferedShown) return;   // fires often; only repaint when the % visibly ticks
    bufferedShown = r;
    const v = r + '%';
    const a = d.byId('pSeek'), b = d.byId('npSeek');
    if (a) a.style.setProperty('--buffered', v);
    if (b) b.style.setProperty('--buffered', v);
  }
  // How much of the CURRENT track the audio element has actually loaded (buffered
  // range at the playhead as a % of duration) — the REAL signal so the meter never
  // sits at 0 on a track that's already fully loaded.
  function nativeBufferedPct() {
    const audio = d.audio;
    const dur = audio.duration, b = audio.buffered;
    if (!dur || !isFinite(dur) || !b || !b.length) return 0;
    const ct = audio.currentTime;
    let end = 0;
    for (let i = 0; i < b.length; i++) {
      const s = b.start(i), e = b.end(i);
      if (ct >= s - 1 && ct <= e + 1) { end = e; break; }   // the range covering the playhead
      if (e > end) end = e;                                 // else the furthest we've buffered
    }
    return Math.min(100, (end / dur) * 100);
  }
  // Blue meter = native playback buffer, banking-fetch progress, or 100 for a
  // banked/local copy — whichever is furthest along.
  function meterPct() {
    const ctx = d.getCtx();
    if (!ctx) return 0;
    return Math.max(bankPct, nativeBufferedPct(), (banks.has(ctx.idx) || d.locallyStored(ctx.idx)) ? 100 : 0);
  }
  function paintMeter() { setBuffered(meterPct()); }
  // Track change: reset the banking driver + force a repaint for the new track.
  function refreshMeter() { bankPct = 0; bufferedShown = -1; paintMeter(); }

  // ---- selection: what to prefetch, what to hold, what to evict ---------------
  // Bytes held LOCALLY for the upcoming window (excludes the current chapter — a
  // sunk cost). Counts RAM banks AND the persisted buffer (banked blobs go to disk).
  function lookAheadUsed() {
    const ctx = d.getCtx();
    if (!ctx) return 0;
    let n = 0;
    for (let i = ctx.idx + 1; i < ctx.tracks.length && (i - ctx.idx) <= MAX_AHEAD; i++) {
      const b = banks.get(i);
      if (b) { n += b.bytes; continue; }
      const t = ctx.tracks[i];
      if (t && window.Downloads && Downloads.bufferedSize) n += Downloads.bufferedSize(t.ratingKey);
    }
    return n;
  }
  // The next track to download: the CURRENT chapter first + always (drop-resilience
  // for the offline tail past iOS's ~34-min native buffer), then the nearest
  // upcoming file within the byte budget. Gated by the two Model-B toggles.
  function nextToBank() {
    const ctx = d.getCtx(), S = d.Settings;
    if (!ctx) return null;
    const budget = bankBudgetBytes();
    if (S.bufferCurrent && !banks.has(ctx.idx) && !skipBank.has(ctx.idx) && !d.locallyStored(ctx.idx) && fitsTotal(estBytes(ctx.tracks[ctx.idx]))) return ctx.idx;
    if (S.bufferAhead) {
      for (let i = ctx.idx + 1; i < ctx.tracks.length && (i - ctx.idx) <= MAX_AHEAD; i++) {
        if (banks.has(i) || skipBank.has(i) || d.locallyStored(i)) continue;
        const est = estBytes(ctx.tracks[i]);
        if (est > budget) continue;                            // bigger than the WHOLE budget → streams; skip past
        return (lookAheadUsed() + est <= budget) ? i : null;   // nearest fetchable upcoming file, if it fits NOW
      }
    }
    return null;
  }
  // The last file index worth HOLDING: current + the contiguous forward run that
  // fits the TOTAL memory cap. Files OUTSIDE [ctx.idx, keepMax] get evicted.
  function bankWindowMax() {
    const ctx = d.getCtx();
    if (!ctx) return -1;
    const sizeOf = (i) => banks.has(i) ? banks.get(i).bytes
      : (skipBank.has(i) || d.locallyStored(i)) ? 0 : estBytes(ctx.tracks[i]);
    let keepMax = ctx.idx, total = sizeOf(ctx.idx);
    for (let i = ctx.idx + 1; i < ctx.tracks.length && (i - ctx.idx) <= MAX_AHEAD; i++) {
      const sz = sizeOf(i);
      if (total + sz <= MAX_TOTAL_BANK_BYTES) { total += sz; keepMax = i; }
      else break;
    }
    return keepMax;
  }
  // Free look-ahead budget for the NEAREST unbanked upcoming file by evicting
  // FARTHER banked look-ahead islands (a skip-back leaves a stale far-ahead island
  // squatting the budget). Farthest-first; never evicts nearer than the target.
  function freeBudgetForNearest() {
    const ctx = d.getCtx();
    if (!ctx) return;
    const budget = bankBudgetBytes();
    let target = -1, est = 0;
    for (let i = ctx.idx + 1; i < ctx.tracks.length && (i - ctx.idx) <= MAX_AHEAD; i++) {
      if (banks.has(i) || skipBank.has(i) || d.locallyStored(i)) continue;  // already local — nothing to fund
      const e = estBytes(ctx.tracks[i]);
      if (e > budget) continue;                                          // bigger than the whole buffer — streams
      target = i; est = e; break;                                         // nearest fetchable upcoming
    }
    if (target < 0 || !fitsTotal(est)) return;
    if (lookAheadUsed() + est <= budget) return;                         // already fits → don't evict
    const farther = [];
    for (let i = target + 1; i < ctx.tracks.length && (i - ctx.idx) <= MAX_AHEAD; i++) {
      const t = ctx.tracks[i];
      if (banks.has(i) || (t && window.Downloads && Downloads.trackBuffered && Downloads.trackBuffered(t.ratingKey))) farther.push(i);
    }
    farther.sort((a, b) => b - a);
    for (const j of farther) {
      revokeBank(j);
      const t = ctx.tracks[j];
      if (t && window.Downloads && Downloads.dropBuffered) Downloads.dropBuffered(t.ratingKey);
      if (lookAheadUsed() + est <= budget) break;
    }
  }
  // Sequential scheduler. Evict finished chapters, then — ONLY while the live audio
  // element is idle — start the next download. 'suspend' re-invokes this; 'progress'
  // (abortIfBusy) aborts an in-flight bank the moment the element resumes fetching.
  function pumpBank() {
    const ctx = d.getCtx(), S = d.Settings;
    if ((!S.bufferCurrent && !S.bufferAhead) || !ctx) return;             // both toggles off = no banking
    if (window.Downloads && Downloads.isDownloaded(ctx.book)) return;     // fully downloaded → already local
    const keepMax = S.bufferAhead ? bankWindowMax() : ctx.idx;            // ahead off → hold only the current chapter
    for (const idx of [...banks.keys()]) if (idx < ctx.idx || idx > keepMax) revokeBank(idx);
    if (S.bufferAhead) freeBudgetForNearest();
    if (elementBusy()) return;                                            // element needs bandwidth → yield
    if (bankCtl) return;                                                  // one download at a time
    const next = nextToBank();
    if (next != null) bankOne(next);
  }

  // ---- element-yield gates + offline stall recovery ---------------------------
  function forwardBufferedSec() {
    const audio = d.audio;
    const b = audio.buffered, ct = audio.currentTime || 0;
    for (let i = 0; i < b.length; i++) if (ct >= b.start(i) - 1 && ct <= b.end(i) + 1) return b.end(i) - ct;
    return 0;
  }
  // Is the live <audio> element still urgently downloading (so banking should yield)?
  // Yield while readyState < HAVE_FUTURE_DATA (initial load/rebuffer — banking the
  // current track from the same Plex URL contends and can fail the load, code=4);
  // else idle when paused OR it has a comfortable forward buffer (60s or the rest of
  // the track, whichever is smaller, so short chapters count as idle).
  function elementBusy() {
    const audio = d.audio;
    if (audio.readyState < 3) return true;
    if (audio.paused) return false;
    const dur = audio.duration;
    if (!dur || !isFinite(dur)) return true;
    const need = Math.min(BANK_MIN_AHEAD, Math.max(0, dur - (audio.currentTime || 0) - 1));
    return forwardBufferedSec() < need;
  }
  function stuckOnStream() {
    const ctx = d.getCtx(), audio = d.audio;
    if (!ctx || audio.paused) return false;
    const src = audio.src || '';
    if (src.startsWith('blob:') || src.includes('/__dl/')) return false;   // already playing the local copy
    return (banks.has(ctx.idx) || d.locallyStored(ctx.idx)) && forwardBufferedSec() <= 3;
  }
  // If the live stream stalls with the forward buffer nearly gone but the whole
  // current chapter is banked/local, switch to the local copy at the reached spot.
  function maybeRecoverFromBank() {
    const audio = d.audio;
    if (stallTimer || !stuckOnStream()) return;
    stallTimer = setTimeout(() => {
      stallTimer = null;
      if (!stuckOnStream()) return;   // recovered on its own
      const ctx = d.getCtx(), curLoad = d.getCurLoad();
      if (window.PBDebug) PBDebug.log('PLAY', `stream stalled at ${(audio.currentTime || 0).toFixed(1)}s — switching to downloaded copy`);
      d.toast('Playing from downloaded copy');
      d.startTrack(ctx.idx, audio.currentTime || (curLoad && curLoad.seekSec) || 0, true);   // startTrack prefers the banked blob
    }, 2500);
  }

  async function bankOne(idx) {
    const ctx = d.getCtx();
    const t = ctx && ctx.tracks[idx];
    if (!t || !t.partKey) return;
    const ctl = new AbortController(); bankCtl = ctl; bankingIdx = idx;
    try {
      // The one shared streaming byte-loop (downloads use it too). OVERSIZE (too big
      // to hold in memory) → stream it live instead, don't keep retrying.
      const { blob, bytes } = await Downloads.fetchAudioBlob(d.Plex.streamUrl(t.partKey), {
        signal: ctl.signal,
        maxBytes: bankBudgetBytes(),   // a chapter bigger than the whole buffer budget streams (OVERSIZE → skipBank)
        onProgress: (received, total) => {
          if (total && ctx && ctx.idx === idx) { bankPct = (received / total) * 100; paintMeter(); }   // meter tracks the CURRENT track only
        },
      });
      // Persist to disk FIRST (survives restart, plays offline via the SW range
      // path). Hold a RAM object URL only when the SW can't serve the bytes back
      // (persist failed, or no controller — desktop #nosw / pre-first-SW) AND it
      // stays under the RAM ceiling; RAM blobs were the old jetsam hazard.
      const persisted = window.Downloads && Downloads.bufferTrack
        ? await Downloads.bufferTrack(bankBook, t.ratingKey, blob) : false;
      const swServes = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
      if (!(persisted && swServes) && usedBytes() + bytes <= MAX_TOTAL_BANK_BYTES) banks.set(idx, { url: URL.createObjectURL(blob), bytes });
      if (ctx && ctx.idx === idx) paintMeter();   // locallyStored/banks now true → meterPct() = 100
      d.updateFileRows();                          // this chapter's line → full (gray buffered / blue downloaded)
      if (window.PBDebug) PBDebug.log('BANK_DONE', `idx=${idx} bytes=${bytes} ${persisted ? 'disk' : 'RAM'} ramUsed=${usedBytes()}`);
    } catch (e) {
      if (e && e.code === 'OVERSIZE') {
        skipBank.add(idx);
        if (ctx && ctx.idx === idx) { bankPct = 0; paintMeter(); }   // won't bank → native buffer drives the meter
      }
      /* else: aborted, CORS, or network — skip this one */
    }
    finally { if (bankCtl === ctl) { bankCtl = null; bankingIdx = -1; if (!ctl.signal.aborted) pumpBank(); } }   // chain the next wanted track
  }

  // Book change: banks are keyed by idx, so wipe them when the loaded book changes
  // (was `if (bankBook !== ctx.book) { clearBanks(); bankBook = ctx.book; }`).
  function ensureBook(book) { if (bankBook !== book) { clearBanks(); bankBook = book; } }
  // audio 'progress' handler: abort an in-flight bank the instant the element
  // resumes fetching (was `if (bankCtl && elementBusy()) bankCtl.abort()`).
  function abortIfBusy() { if (bankCtl && elementBusy()) { try { bankCtl.abort(); } catch {} } }

  function init(deps) { d = deps; }

  return {
    init, pump: pumpBank, clear: clearBanks, ensureBook, abortIfBusy,
    has: (idx) => banks.has(idx), bankedUrl, count: () => banks.size, usedBytes,
    bankingIdx: () => bankingIdx, bankPct: () => bankPct,
    nativeBufferedPct, paintMeter, refreshMeter, setBuffered,
    elementBusy, maybeRecover: maybeRecoverFromBank,
    MAX_AHEAD,   // the look-ahead window size — Downloads' buffer-eviction protection uses the same span
  };
})();

if (typeof window !== 'undefined') window.Banking = Banking;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Banking;
