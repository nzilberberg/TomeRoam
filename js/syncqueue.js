// syncqueue.js — durable, conflict-safe pending progress writes.
//
// The app's whole value is "resume exactly where you left off, on any device."
// So progress writes made while Plex is unreachable must NOT be lost, and a
// later flush must NEVER clobber genuinely-newer progress with a stale (or a
// near-zero) write. This module owns that queue + the safe-flush policy.
//
// What it queues: progress updates (and, later, bookmark / played-state /
// settings writes — same envelope, different `type`). Items live in IndexedDB
// (Store 'sync'), so they survive reloads, crashes, and app eviction-then-reopen.
//
// Authority for "is the remote newer?": Plex HIDES audiobook viewOffset over
// HTTP (documented quirk — the /library/metadata track fetch omits it), so we
// CANNOT read a book's saved position back from Plex to compare. The meaningful
// "newer progress elsewhere" signal in this app is the cross-device Progress
// store (js/progress.js) — each device publishes its own board and everyone
// LWW-merges by server clock. So conflict decisions compare a queued item's
// timestamp/position against Progress.bookRecord()/trackRecord(). Plex's
// viewCount (completion) is the only position-ish thing HTTP exposes and is used
// only as a completion hint. writeTimeline still goes to Plex so its own
// "played" state + Prologue/Plexamp interop stay correct.
const SyncQueue = (() => {
  const STORE = 'sync';

  // Tunable conflict thresholds (ms). Exposed via cfg() for diagnostics/tests.
  const T = {
    smallBackwardToleranceMs: 90 * 1000,   // <=90s back = normal scrub-back, always OK to write
    largeBackwardConflictMs:  10 * 60 * 1000, // >=10min back vs remote = suspicious → mark conflict, don't overwrite
    startupWriteSuppressionMs: 8 * 1000,   // ignore writes generated within this of app start (restore churn)
    nearZeroProgressThresholdMs: 5 * 1000, // <=5s counts as "near zero" — never auto-written
    completionThresholdMs:    30 * 1000,   // within 30s of the end = effectively complete
  };

  const hasWin = typeof window !== 'undefined';
  const dbg = (t, m) => { if (hasWin && window.PBDebug) window.PBDebug.log(t, m); };
  const now = () => (hasWin && window.Plex && window.Plex.serverNow ? window.Plex.serverNow() : Date.now());
  const uid = () => 'sq-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  let cbChange = () => {};

  function storeReady() { return !!(hasWin && window.Store && window.Store.available); }

  // ---- enqueue --------------------------------------------------------------
  // Record a local progress change. `explicit` marks a user-chosen near-zero
  // position (start-from-beginning / restart chapter / reset) so the zero-guard
  // lets it through. `source` is a free tag (e.g. 'timer','pause','manual-seek').
  async function enqueue(item) {
    if (!storeReady()) return null;
    const rec = {
      id: item.id || uid(),
      type: item.type || 'progress',
      bookKey: item.bookKey != null ? String(item.bookKey) : null,
      ratingKey: item.ratingKey != null ? String(item.ratingKey) : null,
      positionMs: Math.round(item.positionMs || 0),
      durationMs: Math.round(item.durationMs || 0),
      state: item.state || 'paused',
      explicit: !!item.explicit,
      createdAt: item.createdAt || now(),
      updatedAt: now(),
      source: item.source || 'app',
      attemptCount: 0,
      lastAttemptAt: 0,
      lastError: null,
      conflictStatus: 'pending',
    };
    // Coalesce: one pending item per (type,book,track) — the newest position wins.
    // A whole listening session offline shouldn't pile up thousands of rows.
    const existing = (await Store.getAll(STORE)).filter(
      (q) => q.type === rec.type && q.bookKey === rec.bookKey && q.ratingKey === rec.ratingKey && q.conflictStatus !== 'conflict');
    if (existing.length) {
      rec.id = existing[0].id;
      rec.createdAt = existing[0].createdAt;
      for (let i = 1; i < existing.length; i++) await Store.del(STORE, existing[i].id);
    }
    await Store.put(STORE, rec);
    dbg('SYNCQ', `queued ${rec.type} book=${rec.bookKey} pos=${(rec.positionMs / 1000).toFixed(0)}s src=${rec.source}`);
    fireChange();
    return rec.id;
  }

  async function count()  { return storeReady() ? Store.count(STORE) : 0; }
  async function all()    { return storeReady() ? Store.getAll(STORE) : []; }
  async function clear()  { if (storeReady()) { await Store.clear(STORE); fireChange(); } }
  async function remove(id) { if (storeReady()) { await Store.del(STORE, id); fireChange(); } }

  async function fireChange() { try { cbChange(await count()); } catch {} }

  // ---- conflict evaluation --------------------------------------------------
  // Decide what to do with ONE queued progress item, given the current merged
  // remote (cross-device) record for that book/track. Returns one of:
  //   'write'  — local is authoritative; send it
  //   'drop'   — remote is newer/ahead; discard the stale local write
  //   'conflict' — suspicious (large backward vs remote); keep, flag, don't send
  //   'skip'   — near-zero non-explicit (zero-guard) or startup churn; keep quietly
  function decide(item) {
    // Zero-position protection: never auto-write a near-zero position. Only a
    // user-explicit restart/reset (item.explicit) may move the remote to ~0.
    // (startupWriteSuppressionMs is enforced at the WRITE site in app.js — where
    // the app clock lives — not here in the queue's conflict decision.)
    if (item.positionMs <= T.nearZeroProgressThresholdMs && !item.explicit) return 'skip';

    const rem = remoteFor(item);            // {pos, ts} from Progress, or null
    if (!rem) return 'write';               // nothing newer known remotely → safe to write

    const remoteAhead = rem.pos - item.positionMs;   // >0: remote is further along
    const localNewerClock = item.updatedAt > (rem.ts || 0);

    if (item.positionMs >= rem.pos) {
      // Local is at/ahead of remote. Write if our clock is also newer, else it's
      // an old duplicate → drop.
      return localNewerClock ? 'write' : 'drop';
    }
    // Local is BEHIND remote.
    if (remoteAhead <= T.smallBackwardToleranceMs) {
      // Small gap — a valid scrub-back. Honour it only if our clock is newer.
      return localNewerClock ? 'write' : 'drop';
    }
    if (remoteAhead >= T.largeBackwardConflictMs) {
      // Large backward jump vs a newer remote → suspicious. Preserve remote,
      // record a conflict, don't overwrite.
      return localNewerClock ? 'conflict' : 'drop';
    }
    // Medium backward + our clock newer: unsure → don't overwrite silently.
    return localNewerClock ? 'conflict' : 'drop';
  }

  // Merged cross-device record for an item, normalized to {pos, ts}. Prefers the
  // per-chapter track record (most specific), falls back to the book-level one.
  function remoteFor(item) {
    if (!hasWin || !window.Progress) return null;
    if (item.ratingKey && item.bookKey) {
      const tr = window.Progress.trackRecord(item.bookKey, item.ratingKey);
      if (tr) return { pos: tr.o || 0, ts: tr.ts || 0 };
    }
    if (item.bookKey) {
      const bk = window.Progress.bookRecord(item.bookKey);
      if (bk && String(bk.t) === String(item.ratingKey)) return { pos: bk.o || 0, ts: bk.ts || 0 };
    }
    return null;
  }

  // ---- flush ----------------------------------------------------------------
  // Attempt every pending item, safely. Called on reconnect / online / a manual
  // retry. Refreshes Progress first (so `decide` sees the freshest peer data),
  // then processes each item per `decide`. Returns a small result summary.
  let flushing = false;
  async function flush() {
    if (flushing || !storeReady()) return { skipped: true };
    if (!(window.Plex && Plex.isSignedIn())) return { skipped: true };
    flushing = true;
    const res = { written: 0, dropped: 0, conflicts: 0, skipped: 0, failed: 0 };
    try {
      // Pull the latest peer boards so conflict decisions use current remote state.
      try { if (window.Progress && Progress.refresh) { Progress.refresh(); } } catch {}
      const items = await Store.getAll(STORE);
      for (const it of items) {
        if (it.type !== 'progress') { res.skipped++; continue; }   // other types handled elsewhere/future
        const verdict = decide(it);
        if (verdict === 'skip') { res.skipped++; continue; }
        if (verdict === 'drop') { await Store.del(STORE, it.id); res.dropped++; continue; }
        if (verdict === 'conflict') {
          it.conflictStatus = 'conflict'; it.updatedAt = now();
          await Store.put(STORE, it); res.conflicts++;
          dbg('SYNCQ', `CONFLICT held book=${it.bookKey} local=${(it.positionMs/1000)|0}s < remote`);
          continue;
        }
        // verdict === 'write'
        try {
          await Plex.writeTimeline({
            ratingKey: it.ratingKey, state: it.state || 'paused',
            timeMs: it.positionMs, durationMs: it.durationMs || 0,
          });
          await Store.del(STORE, it.id);
          res.written++;
          dbg('SYNCQ', `synced book=${it.bookKey} pos=${(it.positionMs/1000)|0}s`);
        } catch (e) {
          it.attemptCount = (it.attemptCount || 0) + 1;
          it.lastAttemptAt = now();
          it.lastError = (e && e.message) || 'write failed';
          await Store.put(STORE, it);
          res.failed++;
        }
      }
    } finally {
      flushing = false;
      fireChange();
    }
    dbg('SYNCQ', `flush done w=${res.written} drop=${res.dropped} conf=${res.conflicts} skip=${res.skipped} fail=${res.failed}`);
    if (window.Store) { Store.diagSet('lastSyncResult', res); Store.diagSet('lastSyncAt', Date.now()); }
    return res;
  }

  function init({ onChange } = {}) { if (onChange) cbChange = onChange; fireChange(); }

  return {
    init, enqueue, flush, count, all, clear, remove,
    cfg: () => ({ ...T }), setCfg: (o) => Object.assign(T, o || {}),
    _test: { decide, remoteFor, T },
  };
})();

if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = SyncQueue;
