// logpipe.js — streams the diagnostics ring to Plex so it can be tailed from a
// desktop, and polls a command board so the app can be driven remotely. This is
// the "debug over Plex" channel: the app can't reach anything on the LAN
// directly (HTTPS page → HTTP LAN is blocked), but it already talks to Plex,
// and hidden playlist summaries are a proven message board (see presence.js).
//
//   pb_log_<id>  — WE write: recent log lines + a state snapshot, every ~4s
//                  while Options → Live debug is ON. Lines carry global seq
//                  numbers; each write is an overlapping tail window, so the
//                  desktop tail (tools/tail-log.mjs) dedupes by seq and misses
//                  nothing across its polls.
//   pb_cmd_<id>  — the DESKTOP writes: {seq, cmd, arg}. We execute (eval/js/
//                  state/ping/reload/report) and the result lands in the log,
//                  which is being streamed — a remote REPL. Only ever read
//                  while Live debug is ON; seq must be new (persisted marker).
//   pb_report_*  — one-tap bug report: the WHOLE ring + snapshot, chunked into
//                  a few one-shot playlists that survive until read + deleted.
//                  Works even when Live debug is off.
const LogPipe = (() => {
  const ON_KEY = 'pb_livedebug';
  const LS = { board: 'pb_logBoard', seed: 'pb_seedTrack', cmdSeq: 'pb_cmdSeq' };
  const FLUSH_MS = 4000;          // board write cadence while on
  const BEAT_MS = 30000;          // heartbeat: rewrite even with no new lines (liveness + fresh snapshot)
  const MAX_PAYLOAD = 5500;       // chars of summary JSON — rides a PUT query param, keep well under URL limits
  const LOG_PREFIX = 'pb_log_';
  const CMD_PREFIX = 'pb_cmd_';

  const shortId = () => (Plex.getClientId() || 'dev').replace(/[^a-z0-9]/gi, '').slice(-8);
  const dbg = (tag, m) => { try { PBDebug.log(tag, m); } catch {} };
  const toast = (m) => {
    const t = document.getElementById('toast');
    if (!t) return; t.textContent = m; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  };

  let timer = null, busy = false;
  let lastSent = 0, lastBeat = 0;
  // Our log board (shared hidden-playlist primitive in plex.js). Guarded for
  // Node, where this module can load without plex.js.
  const board = (typeof Plex !== 'undefined' && Plex.makeBoard) ? Plex.makeBoard(LOG_PREFIX, LS.board) : null;

  const isOn = () => { try { return localStorage.getItem(ON_KEY) === '1'; } catch { return false; } };
  function setOn(v) {
    try { localStorage.setItem(ON_KEY, v ? '1' : '0'); } catch {}
    dbg('PIPE', v ? 'live debug ON — streaming log to Plex' : 'live debug off');
    evalTimer();
    if (v) tick();
  }
  function evalTimer() {
    if (isOn() && !timer) timer = setInterval(tick, FLUSH_MS);
    else if (!isOn() && timer) { clearInterval(timer); timer = null; }
  }

  // A playlist needs a real seed track to exist; find one once and remember it.
  async function findSeed() {
    const saved = localStorage.getItem(LS.seed);
    if (saved) return saved;
    const books = await Plex.getBooks();
    if (!books.length) return null;
    const tracks = await Plex.getAlbumTracks(books[0].ratingKey);
    if (!tracks.length) return null;
    localStorage.setItem(LS.seed, tracks[0].ratingKey);
    return tracks[0].ratingKey;
  }

  async function tick() {
    if (busy || !isOn()) return;
    busy = true;
    try { await pollCmd(); } catch {}
    try { await flush(); } catch {}
    busy = false;
  }

  // Write the newest lines that fit (an overlapping tail window keyed by seq —
  // the reader dedupes) + a fresh snapshot. Skipped entirely when nothing new
  // and the heartbeat isn't due, so an idle app writes at most every 30s.
  async function flush(force) {
    if (!board) return;
    const cur = PBDebug.lastSeq();
    const beat = Date.now() - lastBeat > BEAT_MS;
    if (!force && cur === lastSent && !beat) return;
    const head = { id: shortId(), name: Presence.name(), build: window.PB_BUILD, at: Date.now(), seq: cur, snap: PBDebug.snapshot() };
    const budget = MAX_PAYLOAD - JSON.stringify(head).length - 20;
    const all = PBDebug.getSince(0).map((l) => `${l.s}|${l.text}`);
    const { lines } = PBLogic.fitLines(all, budget);
    // board.publish handles create-once + 404 → recreate-next-tick (transient
    // failures keep the board — no churn). findSeed only runs when creating.
    const status = await board.publish(JSON.stringify({ ...head, lines }), findSeed);
    if (status >= 200 && status < 300) { lastSent = cur; lastBeat = Date.now(); }
  }

  // ---- remote commands -------------------------------------------------------
  // The desktop writes ONE command at a time to pb_cmd_<id>; a new (higher) seq
  // is executed exactly once, and the result goes into the streamed log.
  async function pollCmd() {
    const boards = await Plex.listBoards(CMD_PREFIX + shortId());
    if (!boards.length) return;
    let cmd;
    try { cmd = JSON.parse(boards[0].summary); } catch { return; }
    const last = +(localStorage.getItem(LS.cmdSeq) || 0);
    if (!cmd || !(cmd.seq > last)) return;
    localStorage.setItem(LS.cmdSeq, String(cmd.seq));
    dbg('CMD', `#${cmd.seq} ${cmd.cmd} ${String(cmd.arg || '').slice(0, 120)}`);
    let out;
    // SECURITY / TRUST MODEL of the `eval` and `js` commands (arbitrary code
    // execution). This is a remote REPL and is intentionally powerful — it is the
    // ONLY way to inspect and drive a real device in the field, because the app
    // runs over the Plex relay and cannot be reached on the LAN, and because the
    // hardest bugs are platform-specific (iOS audio, WebView, suspend/resume) and
    // don't reproduce on a desktop. It is NOT dead debug scaffolding; treat it as
    // load-bearing before removing it.
    //
    // Why it's an acceptable (not careless) risk as written:
    //   * It runs ONLY while the user has manually enabled Options → Live debug
    //     (isOn(); default OFF). A shipped/default install never polls this board.
    //   * The command board lives in the user's OWN Plex account. Writing a command
    //     already requires Plex-account/server write access — i.e. the attacker is
    //     already inside the same trust boundary that holds the Plex token.
    //   * seq must strictly increase (replay guard).
    // The real residual escalation to keep in mind: from "can write this user's
    // Plex playlists" to "can run JS in the app", which reaches the native WebView
    // bridge — and that bridge can install an APK. So the meaningful hardening, IF
    // this is ever exposed beyond the developer's own devices, is NOT to sprinkle
    // more guards here but to (a) keep eval/js behind an explicit dev build/flag,
    // (b) sign commands (key baked in the app) with expiry + nonce, and (c) keep
    // the native bridge minimal. Deliberately left as-is for a single-user tool;
    // documented so this is a decision, not an oversight.
    try {
      if (cmd.cmd === 'ping') out = 'pong';
      else if (cmd.cmd === 'state') out = PBDebug.snapshot();
      else if (cmd.cmd === 'eval') out = await (new Function('return (' + cmd.arg + ')'))();   // expression
      else if (cmd.cmd === 'js') out = await (new Function(cmd.arg))();                        // statements
      else if (cmd.cmd === 'report') { report(); out = 'report started'; }
      else if (cmd.cmd === 'reload') { await flush(true); location.reload(); return; }
      else out = 'unknown cmd: ' + cmd.cmd;
    } catch (e) { out = 'ERR ' + (e && e.message); }
    let txt;
    try { txt = typeof out === 'string' ? out : JSON.stringify(out); } catch { txt = String(out); }
    dbg('CMD_RESULT', `#${cmd.seq} ${String(txt).slice(0, 1500)}`);
    await flush(true);
  }

  // ---- one-tap bug report ------------------------------------------------------
  // The whole ring + snapshot, chunked across pb_report_<ts>_<i>of<n> playlists.
  // Durable (no live tail needed): they sit on the server until read + deleted.
  let reporting = false;
  async function report() {
    if (reporting) return;
    reporting = true;
    toast('Uploading bug report…');
    try {
      const seed = await findSeed();
      if (!seed) throw new Error('no seed track');
      const chunks = PBLogic.chunkText(PBDebug.asText(), 4500);
      const ts = Date.now().toString(36);
      for (let i = 0; i < chunks.length; i++) {
        const rk = await Plex.createPlaylist(`pb_report_${ts}_${i + 1}of${chunks.length}`, seed);
        if (!rk) throw new Error('playlist create failed');
        await Plex.setPlaylistSummary(rk, chunks[i]);
      }
      dbg('PIPE', `report uploaded (${chunks.length} parts, id ${ts})`);
      toast(`Bug report uploaded (${chunks.length} parts) — tell Claude`);
    } catch (e) {
      dbg('PIPE', 'report FAILED ' + (e && e.message));
      toast('Report upload failed — use Open log → Copy instead');
    } finally { reporting = false; }
  }

  // ---- Options UI --------------------------------------------------------------
  function injectOptions() {
    const opt = document.getElementById('options');
    if (!opt || document.getElementById('pb-livedbg')) return;
    const mk = (html) => {
      const row = document.createElement('div');
      row.className = 'opt-row';
      row.innerHTML = html;
      const stamp = opt.querySelector('.buildstamp');    // keep the build stamp last
      if (stamp) opt.insertBefore(row, stamp); else opt.appendChild(row);
      return row;
    };
    const live = mk('<span class="opt-label">Live debug</span><span class="opt-ctl"><select id="pb-livedbg"><option value="0">Off</option><option value="1">On</option></select></span>');
    const sel = live.querySelector('#pb-livedbg');
    sel.value = isOn() ? '1' : '0';
    sel.addEventListener('change', (e) => setOn(e.target.value === '1'));
    const rep = mk('<span class="opt-label">Bug report</span><span class="opt-ctl"><button id="pb-report" class="textbtn">Send report</button></span>');
    rep.querySelector('#pb-report').addEventListener('click', report);
  }
  if (typeof document !== 'undefined') {   // (absent under Node in the unit tests)
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectOptions);
    else injectOptions();
    // Resume streaming if the toggle was left on (only once signed in — Plex
    // calls would just fail otherwise; the timer's calls no-op until connect works).
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', evalTimer);
    else evalTimer();
  }

  return { isOn, setOn, flush, report };
})();

if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = LogPipe;
