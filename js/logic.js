// @ts-check
// logic.js — pure, dependency-free decision logic, extracted so the unit tests
// (Node, test/) can exercise exactly the code the app runs. No DOM, no network,
// no globals: every function takes its inputs and returns a value. The app
// files (app.js, presence.js, logpipe.js) delegate here; behaviour is identical.
//
// UNITS CONVENTION (repo-wide): a time-bearing name carries its unit as a suffix
// — `Ms` for milliseconds (Plex viewOffset, serverNow, board pos/at/ts), `Sec`
// for seconds (audio.currentTime/duration, seek targets). Bare `pos`/`at`/`ts`
// on a board record are ms by definition. Keep the boundary explicit: the app
// stores/transports ms and only divides to seconds at the audio element.
const PBLogic = (() => {

  // h:mm:ss / m:ss for a duration in seconds (used everywhere times render).
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
             : `${m}:${String(s).padStart(2, '0')}`;
  }

  const fmtBytes = (n) => n >= 1073741824 ? (n / 1073741824).toFixed(2) + ' GB' : (n / 1048576).toFixed(1) + ' MB';

  // Extrapolated CURRENT position (ms) of a device state at time `nowMs` (server
  // clock): a playing device advances from its {pos, at} anchor at `speed`.
  function livePos(dev, nowMs) {
    if (!dev) return 0;
    const state = dev.state || dev.playState;
    if (state === 'playing') return (dev.pos || 0) + Math.max(0, nowMs - (dev.at || 0)) * (dev.speed || 1);
    return dev.pos || 0;
  }

  // How "current" a device state is on the server clock: playing = live NOW,
  // paused/idle = as-of its last published event.
  function recency(d, serverNowMs) {
    return (d && (d.state || d.playState)) === 'playing' ? serverNowMs : (d ? d.at || 0 : 0);
  }

  // Peer boards → the peers that matter: drop ourselves, idle boards, and
  // "playing" ghosts (a device that crashed mid-play and stopped publishing).
  function filterPeers(parsed, meId, nowMs, ghostMs) {
    return parsed.filter((p) => p && p.id && p.id !== meId && p.state !== 'idle'
      && !(p.state === 'playing' && (nowMs - (p.at || 0)) > ghostMs));
  }

  // A poll that returns FEWER boards than we already knew about must NOT silently
  // drop a peer. On a degraded connection the `/playlists` listing comes back late
  // or incomplete — a 200 with a partial body (the same hazard shardstore already
  // guards on its read side). ASSIGNING that result erases a peer that is very
  // much alive, and the cost is specific and measured: with no live peer, resume
  // stops extrapolating and falls back to the raw durable record, landing ~10s
  // behind on the device with the WORSE connection. This is the same
  // assign-not-merge shape fixed in progress.js poll() at .157/.159.
  //
  // Rules, so this cannot hide a peer that genuinely left:
  //   * a peer PRESENT in this read always uses the fresh data — including an
  //     explicit `idle`, which still removes it (an intentional stop must win);
  //   * only a peer whose board was ABSENT from the read is retained, and only
  //     while it still passes the SAME aging rules, so a deleted board ages out
  //     within ghostMs exactly as before — retention widens no existing window;
  //   * retained entries are marked `stale` so a caller can tell "extrapolated
  //     from the last read I got" from "confirmed by this read".
  // IMPLEMENTATION NOTE — recency, not identity presence. The first version of
  // this keyed retention on "did this device id appear in the read at all", which
  // is wrong whenever Plex holds MORE THAN ONE board for a device (it does; both
  // presence and progress prune historical boards, which is why the pruners
  // exist). An older duplicate idle board then put the id in the `seen` set, was
  // itself dropped by the idle rule, and the newer known PLAYING event was never
  // retained — the peer vanished entirely and resume fell back to the old durable
  // position: the exact bug this function was written to prevent, reintroduced
  // through the back door. It also silently let a stale copy of the same board
  // overwrite fresher knowledge, since nothing compared timestamps.
  //
  // So: collapse to ONE event per device by newest `at` — across every board in
  // the listing AND what we already knew — and only THEN apply the idle/ghost
  // rules to the winner. That keeps the invariant that matters ("an intentional
  // stop wins") while scoping it correctly: a genuinely NEWER idle removes the
  // peer, an older one cannot. Ties go to the read, which is the fresher source.
  function mergePeers(prev, parsed, meId, nowMs, ghostMs) {
    const best = new Map();                      // id → { p, stale }
    const consider = (p, stale) => {
      if (!p || !p.id) return;
      const id = String(p.id);
      const cur = best.get(id);
      if (cur && (cur.p.at || 0) >= (p.at || 0)) return;
      best.set(id, { p, stale });
    };
    for (const p of (parsed || [])) consider(p, false);   // read first → it wins ties
    for (const p of (prev || [])) consider(p, true);
    const out = [];
    for (const { p, stale } of best.values()) {
      if (!filterPeers([p], meId, nowMs, ghostMs).length) continue;
      out.push(stale ? Object.assign({}, p, { stale: true }) : p);
    }
    return out;
  }

  // Claim-based supersede: while WE are playing a book, a peer playing the SAME
  // book with a NEWER claim wins and we should pause. Returns the winner or null.
  function findSuperseder(peers, st) {
    if (!st || st.playState !== 'playing' || st.book == null) return null;
    return peers.find((p) =>
      (p.state === 'playing' || p.g) &&                 // a peer that's playing OR has grabbed ownership (scrub-handoff, paused)
      String(p.book) === String(st.book) &&
      (p.claim || 0) > (st.claim || 0)) || null;
  }

  // Handoff/resume arbitration — the app's core promise: "a device picks up
  // exactly where the last one left off." From an ORDERED list of candidate
  // resume points (each {track, pos, ts}), pick the NEWEST by timestamp. Each
  // candidate's pos is pre-resolved by the caller (a live peer's pos is its
  // EXTRAPOLATED position at `now`, not its stale published anchor). Null entries
  // are skipped; an empty list yields a null anchor at position 0.
  //
  // TIE POLICY — deliberate, do not "fix" to `>=`. Strict '>' means the
  // FIRST-listed candidate keeps a timestamp tie, and callers list candidates
  // least-authoritative FIRST (cold cache, then durable record, then this
  // device's own record, then a live peer). So on an exact-ms tie the earlier,
  // LESS live source is retained. This looks backwards but is correct here:
  //   * Exact-ms ties across these heterogeneous sources are near-impossible
  //     (cold ts is second-resolution ×1000; the rest are independent ms clocks),
  //     and when they do coincide the candidates describe the same event at the
  //     same position — so the winner's POSITION is identical either way.
  //   * The ONE tie that actually changes the outcome — "we are already playing
  //     this book, so the live playhead must win" — is NOT resolved here. A `>=`
  //     was tried for it and still lost (the live event shares the last recorded
  //     ts from the same session); it is handled in the caller by unconditionally
  //     overriding with the live playhead stamped NOW (see bestSource in app.js).
  // Reversing the order or switching to `>=` therefore fixes nothing real and
  // would let a stale cold entry outrank a fresher durable record on a tie.
  function pickResume(cands) {
    let best = { track: null, pos: 0, ts: -Infinity };
    for (const c of cands) {
      if (!c) continue;
      const ts = c.ts || 0;
      if (ts > best.ts) best = { track: c.track, pos: c.pos || 0, ts };
    }
    return best;
  }

  // Same-room handoff sync (see the sync-accuracy plan). Given a peer ANCHOR
  // {pos, at, speed} and the current local playhead, return the corrective seek
  // target in SECONDS, or null if no correction is warranted. Two callers, one
  // formula:
  //   * re-anchor at FIRST SOUND: anchor = the peer's live (playing) event — we
  //     froze the seek target at tap time; extrapolating the SAME anchor to the
  //     instant our audio actually starts zeroes the grab-to-sound latency.
  //   * clock-free FINAL correction: anchor = the superseded peer's PAUSE event
  //     (its absolute final pos + when it paused). Treating that paused anchor as
  //     if it kept playing gives where a continuous listen would be NOW, without
  //     extrapolating a position across the whole handoff window — only the short
  //     since-pause gap carries any clock skew, so the residual is negligible.
  // `nowMs` is the server clock (ms); `tolSec` is the dead-band (skip a sub-
  // threshold micro-seek); `durSec` (optional) clamps out a target past the end.
  function handoffTarget(anchor, nowMs, curSec, tolSec, durSec) {
    if (!anchor) return null;
    const target = livePos({ pos: anchor.pos, at: anchor.at, state: 'playing', speed: anchor.speed }, nowMs) / 1000;
    if (!(target > 0)) return null;
    if (durSec && target >= durSec) return null;
    if (Math.abs(target - (curSec || 0)) <= (tolSec || 0)) return null;
    return target;
  }

  // The most recent lines whose joined length (with \n) fits maxChars — always
  // a contiguous tail, newest kept. Returns how many older lines were dropped.
  function fitLines(lines, maxChars) {
    let total = 0, i = lines.length;
    while (i > 0) {
      const len = lines[i - 1].length + 1;
      if (total + len > maxChars) break;
      total += len; i--;
    }
    return { lines: lines.slice(i), dropped: i };
  }

  // Split text into ≤maxChars pieces (at least one, so an empty report still
  // produces a chunk to upload).
  function chunkText(text, maxChars) {
    const chunks = [];
    for (let i = 0; i < (text || '').length; i += maxChars) chunks.push(text.slice(i, i + maxChars));
    return chunks.length ? chunks : [''];
  }

  // Derive the two home carousels from the whole-library list + resume entries
  // (book ratingKey -> {ts, ...}). Continue Listening = books played on Plex
  // (lastViewedAt>0) plus any extra books the plugin's resume map surfaces, most-
  // recent first (a plugin `ts` outweighs Plex lastViewedAt). Recently Added =
  // newest `limit` by addedAt. Shared by renderCachedHome (offline, entries={})
  // and loadHomeData (online, with resume) so both home paints agree.
  function homeFeeds(books, entries, limit) {
    books = books || []; entries = entries || {};
    const byRk = new Map(books.map((b) => [String(b.ratingKey), b]));
    const cont = books.filter((b) => b.lastViewedAt > 0);
    const have = new Set(cont.map((b) => String(b.ratingKey)));
    for (const rk of Object.keys(entries)) {
      if (!have.has(String(rk)) && byRk.has(String(rk))) { cont.push(byRk.get(String(rk))); have.add(String(rk)); }
    }
    const recencyOf = (b) => (entries[b.ratingKey] ? entries[b.ratingKey].ts || 0 : b.lastViewedAt || 0);
    cont.sort((a, b) => recencyOf(b) - recencyOf(a));
    const recentlyAdded = books.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, limit || 15);
    return { cont, recentlyAdded };
  }

  // DISPLAY speed for tile / Now-Playing "remaining" times (remaining / speed). The
  // SOURCE is the INTENDED speed — the mounted control's rate, else the saved pb_speed,
  // else 1 — and DELIBERATELY takes NO element-rate argument. The browser resets
  // audio.playbackRate to 1 on every track load until loadedmetadata restores it, so a
  // remaining time derived from the live element rate flashed 1x->Nx on launch (the
  // .38–.51 saga). This pure fn is the guard: reintroducing an element-rate source
  // would have to change the signature past the tests below. See the flash-bug memory.
  function displaySpeed(speedCtlRate, savedSpeed) {
    if (speedCtlRate > 0) return speedCtlRate;
    if (savedSpeed > 0) return savedSpeed;
    return 1;
  }

  // Whether a playhead position should be written to durable progress / Plex.
  // A bare "position is truthy" guard silently DROPS an explicit seek to exactly
  // 0 (drag-to-start, Previous-restart, grab-at-0) — so durable progress and Plex
  // keep the OLD position and a later resume/another device lands there. But 0
  // also occurs INCIDENTALLY (pre-metadata during a load, mid chapter-transition),
  // and writing those would wipe a real bookmark. So allow 0 ONLY when the caller
  // flags it as an explicit user action. `pos` may be seconds or ms (only >0-vs-0
  // matters); NaN/Infinity is never recordable.
  function positionRecordable(pos, allowZero) {
    if (!Number.isFinite(pos)) return false;
    return pos > 0 || !!allowZero;
  }

  // A scheduled load-retry (after a stream error, once its reprobe resolves) must
  // fire ONLY if it's still the user's current intent. TWO monotonic counters,
  // captured when the retry was scheduled: `loadGen` (a new startTrack — different
  // chapter/book) AND `intentGen` (an explicit reposition/adoption: seek, skip,
  // Previous-restart, peer grab — none of which start a new load, so loadGen alone
  // misses them). If EITHER moved, a newer action superseded the retry → drop it,
  // so the retry can't yank playback back to the failed track's old position.
  function retryStillCurrent(capLoadGen, curLoadGen, capIntentGen, curIntentGen) {
    return capLoadGen === curLoadGen && capIntentGen === curIntentGen;
  }

  // resumePlay's peer-adoption branch. Given OUR current track index, the PEER's
  // target index, and whether our media element errored, decide the transition.
  // `trackChanged` MUST come from the indices (inputs) — NOT be re-read from ctx
  // AFTER startTrack(), which sets ctx.idx = peerIdx synchronously, making a
  // post-hoc "did the chapter change?" test always-false so the new presence track
  // never got published (the mesh then saw us claiming the OLD chapter at the new
  // chapter's position — corrupting handoff). `reload` = go through startTrack (a
  // different chapter, or an errored element that a bare play() can't revive); else
  // seek + play in place.
  function resumeAdoptPlan(curIdx, peerIdx, errored) {
    const trackChanged = peerIdx !== curIdx;
    return { trackChanged, reload: trackChanged || !!errored };
  }

  // restoreLastPlayed() rebuilds ctx from the saved snapshot and (used to) ALWAYS
  // call startTrack(), which empties+reloads the <audio> element. When enterApp()
  // re-fires mid-playback (an iOS background reload, or an in-memory re-entry), the
  // saved track is usually the one ALREADY playing — reloading it tears down the
  // live playhead and, with autoplay off, leaves it paused (the lock-screen
  // "play-from-paused fails" bug). Reload ONLY when the live element isn't already
  // on the saved book+track. `elementActive` = the <audio> has a real, non-errored
  // load to preserve.
  function shouldReloadOnRestore(savedBook, savedTrack, curBook, curTrack, elementActive) {
    if (!elementActive) return true;                     // nothing live worth keeping → (re)load
    return String(savedBook) !== String(curBook) || String(savedTrack) !== String(curTrack);
  }

  // restoreLastPlayed() runs shouldReloadOnRestore + reassigns the global `ctx`
  // BEHIND an async metadata read (getAlbum/getAlbumTracks). If the user starts
  // another book / changes chapter / auto-advances while that read is in flight, the
  // captured `prev` (and the reload decision from it) is stale and reassigning `ctx`
  // would clobber the newer playback — either reloading the old book, or leaving the
  // element on B while ctx claims A (Presence/Progress/Plex then mis-attribute B's
  // position to A). Only current when neither a newer restore (restoreGen) nor a real
  // load (loadGen — bumped by every startTrack) has superseded this one. Same shape
  // as retryStillCurrent, named for the restore seam.
  function restoreStillCurrent(capRestoreGen, curRestoreGen, capLoadGen, curLoadGen) {
    return capRestoreGen === curRestoreGen && capLoadGen === curLoadGen;
  }

  // ---- banking per-chapter retry backoff (pure) -------------------------------
  // Banking's bankOne used to re-`pumpBank()` immediately after ANY non-oversize
  // failure, and a network failure was NOT recorded — so a persistent failure
  // re-selected the SAME chapter instantly and hammered Plex (potentially over
  // the slow relay fallback) forever. These pure helpers give each chapter a backoff schedule the
  // scheduler honours; banking holds the state map, this decides the timing.
  const BANK_BACKOFF_MS = [2000, 5000, 15000, 30000];   // 2s, 5s, 15s, 30s, then capped
  function bankBackoffMs(attempts) {
    const i = Math.min(Math.max(attempts | 0, 1) - 1, BANK_BACKOFF_MS.length - 1);
    return BANK_BACKOFF_MS[i];
  }
  // entry = { attempts, nextAtMs } | undefined. Returns a NEW entry (immutable).
  function bankNoteFailure(entry, nowMs) {
    const attempts = ((entry && entry.attempts) || 0) + 1;
    return { attempts, nextAtMs: nowMs + bankBackoffMs(attempts) };
  }
  // A chapter is eligible to (re)bank when it has no failure record, or its
  // backoff window has elapsed.
  function bankRetryReady(entry, nowMs) {
    return !entry || !entry.nextAtMs || entry.nextAtMs <= nowMs;
  }

  // bankBackoffMs stays private (used only by bankNoteFailure) — every exported
  // kernel must be referenced by shipped code (guarded by test/meta.test.js).
  return { fmt, fmtBytes, livePos, recency, filterPeers, mergePeers, findSuperseder, pickResume, handoffTarget, fitLines, chunkText, homeFeeds, displaySpeed, positionRecordable, retryStillCurrent, resumeAdoptPlan, shouldReloadOnRestore, restoreStillCurrent, bankNoteFailure, bankRetryReady };
})();

if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = PBLogic;
