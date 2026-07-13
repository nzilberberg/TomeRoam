// Tests for js/handoff.js (HandoffController) — the same-room handoff SYNC state
// machine that used to be inlined, untested, in app.js. Drives the real arm →
// first-sound re-anchor → superseded-peer-pause sequence against injected fakes,
// so the seek targets it computes (via the real PBLogic.handoffTarget) are pinned.
const { test } = require('node:test');
const assert = require('node:assert');
const H = require('../js/handoff.js');

// A fake "world": a mutable ctx snapshot, a server clock, a peer, and a seek log.
function harness() {
  const seeks = [];
  const w = {
    nowMs: 0,
    ctx: { book: 'B', trackRk: 'T', curSec: 0, durSec: 100, paused: false, speed: 1 },
    peer: null,
    seeks,
  };
  H.init({
    now: () => w.nowMs,
    context: () => w.ctx,
    seek: (s) => seeks.push(s),
    peerFor: () => w.peer,
    debug: null,
  });
  H._test.reset();
  return w;
}

test('arm snapshots the peer anchor; arm(null) disarms', () => {
  const w = harness();
  w.nowMs = 1000;
  H.arm('B', { track: 'T', pos: 10000, at: 1000, speed: 1.5 });
  const s = H._test.armed();
  assert.equal(s.book, 'B');
  assert.equal(s.track, 'T');
  assert.deepEqual(s.anchor, { pos: 10000, at: 1000, speed: 1.5 });
  assert.equal(s.reanchored, false);
  assert.equal(s.until, 1000 + H._test.WINDOW_MS);
  H.arm('B', null);
  assert.equal(H._test.armed(), null);
});

test('reanchorAtFirstSound seeks to the peer’s extrapolated live position, once', () => {
  const w = harness();
  w.nowMs = 1000;
  H.arm('B', { track: 'T', pos: 10000, at: 1000, speed: 1 });
  w.nowMs = 3000;                                  // peer has "played" 2s since its anchor
  H.reanchorAtFirstSound();
  assert.deepEqual(w.seeks, [12]);                 // (10000 + 2000)/1000
  H.reanchorAtFirstSound();                        // reanchored guard → no second seek
  assert.deepEqual(w.seeks, [12]);
});

test('reanchorAtFirstSound clears the arm if we’re on a different book/track now', () => {
  const w = harness();
  w.nowMs = 1000;
  H.arm('B', { track: 'T', pos: 10000, at: 1000, speed: 1 });
  w.ctx = { book: 'OTHER', trackRk: 'T', curSec: 0, durSec: 100, paused: false, speed: 1 };
  H.reanchorAtFirstSound();
  assert.deepEqual(w.seeks, []);
  assert.equal(H._test.armed(), null);
});

test('reanchor within the dead-band does not seek but still consumes the arm', () => {
  const w = harness();
  w.nowMs = 1000;
  H.arm('B', { track: 'T', pos: 5000, at: 1000, speed: 1 });
  w.nowMs = 1000; w.ctx.curSec = 5;                // target 5s == current 5s → sub-tolerance
  H.reanchorAtFirstSound();
  assert.deepEqual(w.seeks, []);
  assert.equal(H._test.armed().reanchored, true);  // won't fire again
});

test('correctFromPeerPause waits while the peer still plays, then snaps on its pause', () => {
  const w = harness();
  w.nowMs = 1000;
  H.arm('B', { track: 'T', pos: 5000, at: 1000, speed: 1 });
  w.nowMs = 2000; w.ctx.curSec = 5;
  w.peer = { state: 'playing', track: 'T', pos: 6000, at: 2000 };
  H.correctFromPeerPause();                         // peer still playing → hold
  assert.deepEqual(w.seeks, []);
  assert.ok(H._test.armed());
  w.peer = { state: 'paused', track: 'T', pos: 7000, at: 2000 };
  w.nowMs = 2500;                                   // 0.5s since the peer's pause anchor
  H.correctFromPeerPause();
  assert.deepEqual(w.seeks, [7.5]);                 // (7000 + 500)/1000
  assert.equal(H._test.armed(), null);             // one correction, then stand down
});

test('correctFromPeerPause gives up (clears) once the window elapses', () => {
  const w = harness();
  w.nowMs = 1000;
  H.arm('B', { track: 'T', pos: 5000, at: 1000, speed: 1 });   // until = 21000
  w.nowMs = 22000; w.ctx.curSec = 5;
  w.peer = { state: 'paused', track: 'T', pos: 7000, at: 2000 };
  H.correctFromPeerPause();
  assert.deepEqual(w.seeks, []);
  assert.equal(H._test.armed(), null);
});

test('correctFromPeerPause does nothing (keeps the arm) if WE are the one paused', () => {
  const w = harness();
  w.nowMs = 1000;
  H.arm('B', { track: 'T', pos: 5000, at: 1000, speed: 1 });
  w.nowMs = 2000; w.ctx.curSec = 5; w.ctx.paused = true;
  w.peer = { state: 'paused', track: 'T', pos: 7000, at: 2000 };
  H.correctFromPeerPause();
  assert.deepEqual(w.seeks, []);
  assert.ok(H._test.armed());                       // still armed — we were superseded, nothing to correct
});

test('clear() disarms', () => {
  const w = harness();
  H.arm('B', { track: 'T', pos: 5000, at: 1000, speed: 1 });
  H.clear();
  assert.equal(H._test.armed(), null);
});
