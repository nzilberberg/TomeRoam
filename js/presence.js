// presence.js — multi-device coordination via EVENTS + extrapolation.
//
// Each device publishes its own hidden pb_dev_<id> playlist board, but ONLY on
// state changes (play / pause / seek / track / stop) — plus a slow ~30s liveness
// pulse while playing. It never ticks position on a timer. Between events, a
// playing device's position is EXTRAPOLATED from {pos, at, speed}:
//     livePos = pos + (now - at) * speed        (playing)
//             = pos                             (paused/idle)
// so the display can tick smoothly with zero network, and a handoff computes the
// source's position at the instant you act. Timestamps use Plex's server clock
// (Plex.serverNow) so extrapolation agrees across devices. Coordination is by
// CLAIM: the most recent "play" wins; superseded devices pause themselves.

const Presence = (() => {
  const PREFIX = 'pb_dev_';
  const POLL_MS = 6000;        // fallback board-read cadence (the websocket handles the fast path)
  const GHOST_MS = 90000;      // a "playing" peer silent longer than this is treated as dead
  const STALE_MS = 3 * 24 * 60 * 60 * 1000;   // a non-playing board untouched this long is dead → delete it

  const LS = { name: 'pb_deviceName', board: 'pb_boardKey' };

  let boardKey = null;
  let seed = null;
  let st = { book: null, track: null, pos: 0, at: 0, playState: 'idle', speed: 1, claim: 0, grab: false };
  let peers = [];
  let pollTimer = null;
  let visible = true;
  let cbPeers = () => {};
  let cbSupersede = () => {};
  let ws = null, wsBackoff = 1000, wsTimer = null, wsWant = false, pollDebounce = null;
  let prunedSession = false;   // one-shot dead-board sweep per app launch

  const now = () => (Plex.serverNow ? Plex.serverNow() : Date.now());
  const shortId = () => (Plex.getClientId() || 'dev').replace(/[^a-z0-9]/gi, '').slice(-8);

  function name() {
    let n = localStorage.getItem(LS.name);
    if (!n) { n = defaultName(); localStorage.setItem(LS.name, n); }
    return n;
  }
  function setName(n) { if (n && n.trim()) localStorage.setItem(LS.name, n.trim()); }
  function defaultName() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    return 'This device';
  }

  const dbg = (tag, m) => { if (typeof PBDebug !== 'undefined') PBDebug.log(tag, m); };

  // Extrapolated CURRENT position (ms) of a device state (self or a peer event).
  // The math lives in PBLogic (js/logic.js) so the unit tests run the real thing.
  function livePos(dev) { return PBLogic.livePos(dev, now()); }

  async function ensureBoard() {
    if (boardKey) return boardKey;
    const saved = localStorage.getItem(LS.board);
    if (saved) { boardKey = saved; return boardKey; }
    if (!seed) return null;
    try {
      boardKey = await Plex.createPlaylist(PREFIX + shortId(), seed);
      if (boardKey) localStorage.setItem(LS.board, boardKey);
    } catch (e) { console.warn('Presence: board create failed', e.message); }
    return boardKey;
  }

  // Write our current state as an event (stamps `at` = server-now).
  async function publish() {
    const rk = await ensureBoard();
    if (!rk) return;
    st.at = now();
    const blob = JSON.stringify({
      id: Plex.getClientId(), name: name(),
      book: st.book, track: st.track, pos: Math.round(st.pos),
      at: st.at, state: st.playState, speed: st.speed, claim: st.claim,
      g: st.grab ? 1 : 0,   // "grabbed": owns the book (via a scrub takeover) even while paused → a playing peer still yields
    });
    try {
      const st = await Plex.setPlaylistSummary(rk, blob);
      if (st === 404) { boardKey = null; localStorage.removeItem(LS.board); dbg('PRES', 'board gone (404) — will recreate'); }
      else if (!(st >= 200 && st < 300)) dbg('PRES', 'publish transient ' + st + ' — keeping board');   // don't churn a new board on a relay hiccup
    } catch (e) { console.warn('Presence: publish failed', e.message); dbg('PRES', 'publish FAILED ' + (e && e.message)); }
  }

  async function poll() {
    try {
      const boards = await Plex.listBoards(PREFIX);
      const parsed = boards.map((b) => { try { return JSON.parse(b.summary); } catch { return null; } });
      // Drop ourselves, idle boards, and "playing" ghosts (crashed mid-play).
      // The filter + supersede rules live in PBLogic so the unit tests run them.
      peers = PBLogic.filterPeers(parsed, Plex.getClientId(), now(), GHOST_MS);
      cbPeers(peers);

      // Once per launch, sweep clearly-dead boards so they stop piling up (a
      // sprawl of stale boards is what let a ghost hijack resume). Never our own,
      // never an actively-playing board; a live device recreates a removed board.
      if (!prunedSession) { prunedSession = true; pruneDeadBoards(boards, parsed); }

      const winner = PBLogic.findSuperseder(peers, st);
      if (winner) { dbg('PRES', `superseded by ${winner.name || winner.id} (claim ${winner.claim} > ${st.claim})`); cbSupersede(winner); }
    } catch (e) { /* ignore a bad poll; next tick retries */ }
  }

  // Delete boards that are clearly dead — finished/idle sessions, unparseable
  // summaries, or a paused board untouched for days — so they can't accumulate and
  // masquerade as peers. Skips our own board (by ratingKey AND by id) and anything
  // actively playing; a live device whose board we remove simply recreates it on
  // its next publish (publish() clears a rejected boardKey and re-creates). Best-
  // effort and sequential — a failed delete just lingers to the next launch.
  async function pruneDeadBoards(boards, parsed) {
    const meId = Plex.getClientId();
    for (let i = 0; i < boards.length; i++) {
      const b = boards[i], p = parsed[i];
      if (!b || b.ratingKey == null) continue;
      if (String(b.ratingKey) === String(boardKey)) continue;      // our own board (by key)
      if (p && p.id && p.id === meId) continue;                    // our own board (by id)
      const age = now() - (p.at || 0);
      const dead = !p || p.state === 'idle'
        || (p.state === 'playing' && age > GHOST_MS)      // "playing" but silent past a pulse → crashed session (these never expired before → sprawl)
        || (p.state !== 'playing' && age > STALE_MS);      // paused/other untouched for days
      if (!dead) continue;
      dbg('PRES', `pruning dead board ${b.ratingKey} (${(p && p.name) || 'unparseable'})`);
      try { await Plex.deletePlaylist(b.ratingKey); } catch { /* ignore; retry next launch */ }
    }
  }

  // Coalesce websocket-triggered reads so a burst of notifications = one poll.
  function triggerPoll() {
    if (pollDebounce) return;
    pollDebounce = setTimeout(() => { pollDebounce = null; poll(); }, 700);
  }

  // --- Plex notification websocket (real-time push) -------------------------
  // Used as a "something changed, read now" trigger, not a data source: any
  // OTHER device's playback change wakes a (debounced) board read, so the board
  // stays authoritative (names/book/claim) while we drop the polling latency.
  function handleNotification(o) {
    const c = o && o.NotificationContainer;
    if (!c || c.type !== 'playing' || !c.PlaySessionStateNotification) return;
    const me = Plex.getClientId();
    if (c.PlaySessionStateNotification.some((n) => n.clientIdentifier && n.clientIdentifier !== me)) {
      triggerPoll();
    }
  }
  function wsConnect() {
    wsWant = true;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;   // connecting/open
    const url = Plex.notificationWsUrl && Plex.notificationWsUrl();
    if (!url) return;
    let sock;
    try { sock = new WebSocket(url); } catch { return; }
    ws = sock;
    sock.onopen = () => { wsBackoff = 1000; dbg('WS', 'notification socket open'); };
    sock.onmessage = (ev) => { try { handleNotification(JSON.parse(ev.data)); } catch {} };
    sock.onclose = (ev) => {
      if (ws === sock) ws = null;
      if (wsWant) { dbg('WS', `closed code=${(ev && ev.code) || '?'} — reconnect in ~${wsBackoff}ms`); scheduleReconnect(); }
    };
    sock.onerror = () => { dbg('WS', 'socket error'); try { sock.close(); } catch {} };
  }
  function wsDisconnect() {
    wsWant = false;
    if (wsTimer) { clearTimeout(wsTimer); wsTimer = null; }
    if (ws) { const s = ws; ws = null; try { s.onclose = null; s.close(); } catch {} }
  }
  function scheduleReconnect() {
    if (wsTimer || !wsWant) return;
    wsTimer = setTimeout(() => { wsTimer = null; if (wsWant) wsConnect(); }, wsBackoff);
    wsBackoff = Math.min(wsBackoff * 2, 30000);   // exponential backoff, capped
  }

  // Active = view visible OR we're playing. Runs the fallback poll AND the
  // realtime websocket; idle+hidden tears both down (reads follow eyeballs+audio).
  function evalActive() {
    const active = visible || st.playState === 'playing';
    if (active) {
      if (!pollTimer) { poll(); pollTimer = setInterval(poll, POLL_MS); }
      wsConnect();
    } else {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      wsDisconnect();
    }
  }

  // ---- public API ----------------------------------------------------------
  function init({ onPeers, onSupersede } = {}) {
    if (onPeers) cbPeers = onPeers;
    if (onSupersede) cbSupersede = onSupersede;
    visible = true;
    evalActive();
  }
  function setActive(v) { visible = !!v; evalActive(); }

  // events — each publishes exactly once (no periodic position writes)
  function claimPlaying(book, track, pos, seedTrackRk) {
    seed = seedTrackRk || seed;
    st = { book, track, pos: pos || 0, at: now(), playState: 'playing', speed: st.speed || 1, claim: now(), grab: false };
    publish(); evalActive();
  }
  function setPlaying(pos) { if (pos != null) st.pos = pos; st.playState = 'playing'; st.grab = false; st.claim = now(); publish(); evalActive(); }
  // Take OWNERSHER of a book while staying paused (scrub-to-handoff): a fresh claim +
  // grab flag makes the currently-playing peer supersede/pause. We don't play until the
  // user hits play. Keyed to whatever book/track we currently have loaded.
  function grab(book, track, pos) {
    st.book = book; st.track = track; if (pos != null) st.pos = pos;
    st.playState = 'paused'; st.grab = true; st.claim = now();
    publish(); evalActive();
  }
  function setPaused(pos) { if (pos != null) st.pos = pos; st.playState = 'paused'; publish(); evalActive(); }
  function setTrack(track, pos) { st.track = track; st.pos = pos || 0; if (st.playState === 'playing') publish(); }
  function setIdle() { st.playState = 'idle'; st.book = null; publish(); evalActive(); }
  function flush(pos) { if (pos != null) st.pos = pos; publish(); }        // e.g. after a seek, or the slow liveness pulse
  // Speed change: re-anchor {pos, at, speed} together so peers extrapolate the
  // NEW rate from the CURRENT position (publish stamps at=now). Passing the live
  // pos is essential — otherwise peers project the new speed off a stale anchor.
  function setSpeed(sp, pos) { st.speed = sp || 1; if (pos != null) st.pos = pos; if (st.playState === 'playing') publish(); }

  return {
    init, setActive, claimPlaying, setPlaying, grab, setPaused, setTrack, setIdle, flush, setSpeed,
    livePos, getPeers: () => peers, getClaim: () => st.claim, name, setName,
  };
})();

if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Presence;
