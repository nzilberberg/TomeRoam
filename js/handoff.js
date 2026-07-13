// handoff.js — the same-room handoff SYNC state machine, extracted from app.js.
//
// Problem (see the sync-accuracy plan): when this device ADOPTS a live peer (tap
// its book / press play while it owns the session), the seek target is frozen at
// tap time and the peer keeps playing until our claim propagates — so first sound
// lands a speed-multiplied offset behind. Two corrections, both anchored on the
// peer's own {pos,at,speed} via the pure PBLogic.handoffTarget:
//   #2 RE-ANCHOR AT FIRST SOUND — on our `playing` event, re-extrapolate the peer's
//      live anchor to that instant and micro-seek → zeroes startup latency.
//   #1 CLOCK-FREE FINAL CORRECTION — when the superseded peer's PAUSE lands (its
//      absolute final pos), snap to it → mops up residual clock skew. One seek, done.
//
// Why its own module: the decision math was already a tested pure fn
// (PBLogic.handoffTarget), but the STATEFUL wrapper around it lived in app.js with
// no direct tests — historically where this app's bugs hide. Here it's a small
// state machine that reads the world through injected accessors (no DOM, no
// globals beyond PBLogic), so test/handoff-controller.test.js drives the real arm
// → first-sound → peer-pause sequence against fakes. app.js provides live audio /
// ctx / peer access via init(); behaviour is identical to the inlined version.
const HandoffController = (() => {
  const PBL = (typeof PBLogic !== 'undefined') ? PBLogic
    : (typeof require !== 'undefined' ? require('./logic.js') : null);

  const TOL_SEC = 0.3;        // dead-band: skip a sub-300ms micro-seek
  const WINDOW_MS = 20000;    // stop expecting the peer's pause-flush after this

  // Injected by app.js (or a test):
  //   now()            -> server-clock ms (Plex.serverNow)
  //   context()        -> { book, trackRk, curSec, durSec, paused, speed } for the
  //                       currently-loaded track, or null when nothing is loaded
  //   seek(sec)        -> perform the corrective micro-seek (sets audio.currentTime)
  //   peerFor(book)    -> the presence event of a peer on that book, or null
  //   debug(tag, msg)  -> optional diagnostics sink
  let deps = { now: () => 0, context: () => null, seek: () => {}, peerFor: () => null, debug: null };
  let state = null;   // { book, track, anchor:{pos,at,speed}, reanchored, until }

  function init(d) { deps = Object.assign({}, deps, d); }
  const log = (tag, m) => { if (deps.debug) deps.debug(tag, m); };

  // Arm a pending sync against a LIVE peer we're adopting. `peer` is its presence
  // event (playing); we snapshot its anchor so the correction is independent of
  // later supersede state. `peer` falsy = disarm. Cleared by a user seek/grab/re-arm.
  function arm(book, peer) {
    if (!peer) { state = null; return; }
    state = {
      book: String(book), track: peer.track,
      anchor: { pos: peer.pos || 0, at: peer.at || 0, speed: peer.speed || 1 },
      reanchored: false, until: deps.now() + WINDOW_MS,
    };
  }
  function clear() { state = null; }

  // #2: on the `playing` event (first audible sound). Re-extrapolate the peer's LIVE
  // anchor to now and seek there once — the peer is still playing at this instant
  // (supersede hasn't landed yet), so this is its true live position.
  function reanchorAtFirstSound() {
    if (!state || state.reanchored) return;
    const c = deps.context();
    if (!c || String(c.book) !== state.book || !c.trackRk || String(c.trackRk) !== String(state.track)) { state = null; return; }
    state.reanchored = true;
    const target = PBL.handoffTarget(state.anchor, deps.now(), c.curSec || 0, TOL_SEC, c.durSec || 0);
    if (target == null) return;
    log('SYNC', `re-anchor at first sound: ${(c.curSec || 0).toFixed(2)}s → ${target.toFixed(2)}s`);
    deps.seek(target);
  }

  // #1: from onPeers when fresh boards arrive. Once the superseded peer has PAUSED
  // (state !== playing) on our exact chapter, treat its absolute final pos as a
  // still-advancing anchor and snap to where a continuous listen would be now.
  function correctFromPeerPause() {
    if (!state) return;
    const c = deps.context();
    if (!c || String(c.book) !== state.book) return;      // not our book right now — keep waiting
    if (deps.now() > state.until) { state = null; return; }  // window elapsed — give up
    if (c.paused) return;                                  // WE got superseded/paused — nothing to correct
    if (!c.trackRk) return;
    const p = deps.peerFor(state.book);
    if (!p || p.state === 'playing' || String(p.track) !== String(c.trackRk)) return;   // wait for the pause; same chapter only
    const speed = c.speed || state.anchor.speed || 1;
    const target = PBL.handoffTarget({ pos: p.pos || 0, at: p.at || 0, speed }, deps.now(), c.curSec || 0, TOL_SEC, c.durSec || 0);
    state = null;   // one corrective micro-seek, then stand down
    if (target == null) return;
    log('SYNC', `final-position correction: ${(c.curSec || 0).toFixed(2)}s → ${target.toFixed(2)}s (peer paused @ ${((p.pos || 0) / 1000).toFixed(2)}s)`);
    deps.seek(target);
  }

  return {
    init, arm, clear, reanchorAtFirstSound, correctFromPeerPause,
    // Test-only: inspect/reset the internal armed state.
    _test: { armed: () => state, reset: () => { state = null; }, TOL_SEC, WINDOW_MS },
  };
})();

if (typeof window !== 'undefined') window.HandoffController = HandoffController;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = HandoffController;
