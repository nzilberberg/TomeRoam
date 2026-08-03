// STRIKE-one-screen-type-a1b.probe.js — Loki's instrument + battery (2026-08-03).
// Disposable adversarial probe; NOT product code, NOT a suite test. Filed beside the
// strike record it reproduces (STRIKE-one-screen-type-a1b.md). HEAD cef1093.
//
// BENCH
//   1. node tools/serve.mjs --port 8899          (repo root served live)
//   2. echo probe > identity                      (repo root; answers plex.js probeConn's
//      GET /identity with 200 so the bench never contacts plex.tv — delete after)
//   3. Real Blink engine at 375x812, http://localhost:8899
//   4. Paste SEED, reload, paste LK, build ctx (BATTERY step 0), run the battery.
//
// TRAPS (measured this strike, extending parked-page-rides-home-strike-2026-08-02):
//   - Hidden pane freezes timers/rAF -> an in-page `await sleep()` wedges the DRIVING TOOL
//     CALL too. Split drag and at-rest sampling into separate calls; inter-call time is the
//     settle window (the 340ms finalize fires even at ~1s throttle).
//   - Synchronous TouchEvents can register a FLICK: d.vx updates on any >8ms inter-move gap
//     and tool-driven moves exceed FLICK_V=0.4 px/ms easily. dragCtl's stationary spin-tail
//     (>=8ms apart, same X) decays vx to 0 so prog alone decides commit/abort.
//   - Cached tracks must be the NORMALIZED shape: `partKey` directly on the track
//     (js/plex.js:488-499); a raw Media[].Part[] shape throws in streamUrl. Re-enter the
//     files page after re-seeding (the rendered page holds the stale list).

// ---- SEED (once, then reload) ----------------------------------------------------------
/*
(async () => {
  localStorage.setItem('pb_token', 'bench-probe-not-a-real-token');   // fabricated, non-credential
  localStorage.setItem('pb_server', JSON.stringify({ name: 'bench', machineId: 'bench',
    connections: [{ uri: 'http://localhost:8899', local: true }] }));
  localStorage.setItem('pb_connKind', 'local');
  localStorage.setItem('pb_lastBase', 'http://localhost:8899');
  localStorage.setItem('pb_section', 'bench-sec');
  const authors = [], books = [];
  for (let i = 1; i <= 26; i++) {
    const L = String.fromCharCode(64 + i);
    authors.push({ ratingKey: 'a' + i, title: L + 'uthor ' + L, titleSort: L + 'uthor',
      thumb: '/library/metadata/a' + i + '/thumb/1', childCount: 1 });
    books.push({ ratingKey: 'b' + i, title: L + ' Book ' + i, titleSort: L + ' Book',
      parentTitle: L + 'uthor ' + L, parentRatingKey: 'a' + i,
      thumb: '/library/metadata/b' + i + '/thumb/1', leafCount: 8, viewedLeafCount: 0,
      addedAt: 1700000000 + i, lastViewedAt: 1700000000 + i, duration: 3600000 });
  }
  const tracks = [];
  for (let t = 1; t <= 12; t++) tracks.push({ ratingKey: 't' + t, title: 'Chapter ' + t,
    index: t, duration: 600000, parentRatingKey: 'b1',
    partKey: '/library/parts/' + (800 + t) + '/file.mp3', container: 'mp3', size: 1000000 });
  await Store.cacheBooks(books); await Store.cacheAuthors(authors); await Store.cacheTracks('b1', tracks);
  location.reload();
})();
*/

// ---- LK — the instrument ---------------------------------------------------------------
window.LK = (() => {
  const SCREENS = ['home','browse','options','general','playback','buffering','downloads','diagnostics','nowplaying'];
  const $ = id => document.getElementById(id);
  // The observable the promise governs: which screens are un-hidden (#home by park state).
  function state(tag) {
    const un = SCREENS.filter(s => s !== 'home' && !$(s).classList.contains('hidden'));
    const home = $('home').classList.contains('parked') ? 'parked' : 'shown';
    if (home === 'shown') un.unshift('home');
    return { tag: tag||'', unhidden: un, count: un.length, homeParked: home === 'parked',
      npLocked: document.body.classList.contains('np-locked') };
  }
  const touch = (tgt, type, x, y) => {
    const t = new Touch({ identifier: 1, target: tgt, clientX: x, clientY: y, pageX: x, pageY: y });
    const empty = type === 'touchend';
    tgt.dispatchEvent(new TouchEvent(type, { touches: empty ? [] : [t], targetTouches: empty ? [] : [t],
      changedTouches: [t], bubbles: true, cancelable: true }));
  };
  const log = [];
  const spin = ms => { const t0 = performance.now(); while (performance.now() - t0 < ms) {} };
  // Fully synchronous velocity-controlled drag: spin-tail zeroes vx so prog decides.
  function dragCtl(dir, opts = {}) {
    const w = window.innerWidth, y = opts.y || Math.round(window.innerHeight / 2);
    const fromX = dir === 'back' ? 10 : w - 10;
    const toX = opts.toX != null ? opts.toX : (dir === 'back' ? w - 30 : 30);
    const steps = opts.steps || 6;
    const tgt = opts.tgt || document.elementFromPoint(fromX, y) || document.body;
    touch(tgt, 'touchstart', fromX, y); log.push(state((opts.tag||'')+':ts'));
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(fromX + (toX - fromX) * i / steps);
      touch(tgt, 'touchmove', x, y); log.push(state((opts.tag||'')+':mv'+i));
    }
    for (let k = 0; k < 3; k++) { spin(12); touch(tgt, 'touchmove', toX, y); }   // vx -> 0
    if (!opts.hold) { touch(tgt, 'touchend', toX, y); log.push(state((opts.tag||'')+':te')); }
    return tgt;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pg = () => document.querySelector('#browse .browsepage:not(.hidden)');
  const scrolls = () => { const p = pg(); return { page: p ? Math.round(p.scrollTop) : null,
    host: Math.round(document.getElementById('browse').scrollTop) }; };
  return { state, touch, dragCtl, sleep, log, SCREENS, spin, pg, scrolls };
})();

// ---- BATTERY (observed 2026-08-03, 375x812; abort toX=100 -> prog 0.24; commit toX=350) --
//
// 0  CTX: Books tab -> "A Book 1" row -> first .filerow click (stream 404s; NO audio) ->
//    transport visible. Open NP anywhere via $('player').click().
//
// FIRE DRILL: with Home shown, remove 'hidden' from #browse and #options by hand ->
//    LK.state() read count=3 [home,browse,options]. Restored -> 1. Instrument proven.
//
// open NP from files / Home / Books:      count 1 [nowplaying], homeParked, npLocked  (A1b live)
// AB1 NP->back abort (dest files):        mid 2 [browse,nowplaying] -> rest 1 [nowplaying]
// AB2 NP->files fwd abort (right edge):   mid 2 -> rest 1
// AB3 NP->back-to-HOME abort, held:       #home unparked inline -225px, NP +150; rects
//                                         [-225,150)+[150,525) gap 0; rest 1, home re-parked
// C1  NP->back commit:                    rest 1 [browse], npLocked off
// E5  fwd commit + touchstart inside the settle glide (supersession hard reset, NP current):
//                                         after reset 1 [nowplaying]; stale finalize no-op
// FW  options->general filmstrip live (2) + transport tap inside ~340ms window:
//                                         NP open 1; after pending reconcile still 1 (idempotent)
// SCROLL primitive: page scrollTop 900 -> #browse display:none (reads 0) -> re-show -> 900.
// SCROLL full path: Books@900 -> NP open -> NP back-commit -> Books@900. Blink preserves;
//                   WebKit half is the named device residual (see casebook).
