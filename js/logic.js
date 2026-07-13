// logic.js — pure, dependency-free decision logic, extracted so the unit tests
// (Node, test/) can exercise exactly the code the app runs. No DOM, no network,
// no globals: every function takes its inputs and returns a value. The app
// files (app.js, presence.js, logpipe.js) delegate here; behaviour is identical.
const PBLogic = (() => {

  // h:mm:ss / m:ss for a duration in seconds (used everywhere times render).
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
             : `${m}:${String(s).padStart(2, '0')}`;
  }

  const fmtBytes = (n) => n >= 1073741824 ? (n / 1073741824).toFixed(2) + ' GB' : (n / 1048576).toFixed(1) + ' MB';

  // Extrapolated CURRENT position (ms) of a device state at time `now` (server
  // clock): a playing device advances from its {pos, at} anchor at `speed`.
  function livePos(dev, now) {
    if (!dev) return 0;
    const state = dev.state || dev.playState;
    if (state === 'playing') return (dev.pos || 0) + Math.max(0, now - (dev.at || 0)) * (dev.speed || 1);
    return dev.pos || 0;
  }

  // How "current" a device state is on the server clock: playing = live NOW,
  // paused/idle = as-of its last published event.
  function recency(d, serverNow) {
    return (d && (d.state || d.playState)) === 'playing' ? serverNow : (d ? d.at || 0 : 0);
  }

  // Peer boards → the peers that matter: drop ourselves, idle boards, and
  // "playing" ghosts (a device that crashed mid-play and stopped publishing).
  function filterPeers(parsed, meId, now, ghostMs) {
    return parsed.filter((p) => p && p.id && p.id !== meId && p.state !== 'idle'
      && !(p.state === 'playing' && (now - (p.at || 0)) > ghostMs));
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
  // `now` is the server clock; `tolSec` is the dead-band (skip a sub-threshold
  // micro-seek); `durSec` (optional) clamps out a target past the track end.
  function handoffTarget(anchor, now, curSec, tolSec, durSec) {
    if (!anchor) return null;
    const target = livePos({ pos: anchor.pos, at: anchor.at, state: 'playing', speed: anchor.speed }, now) / 1000;
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

  // NOTE: the banking scheduler (pickNextBank) used to live here too, but app.js
  // reimplemented selection as nextToBank and the copy here tested dead code —
  // removed rather than left as false test coverage.
  return { fmt, fmtBytes, livePos, recency, filterPeers, findSuperseder, pickResume, handoffTarget, fitLines, chunkText, homeFeeds };
})();

if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = PBLogic;
