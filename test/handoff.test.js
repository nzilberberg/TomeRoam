// Handoff scenario tests — the app's core, un-shifting promise: "when you move
// from one device to another, the new device picks up EXACTLY where the last one
// left off." These are the two-devices-and-a-stopwatch cases, reduced to
// millisecond assertions.
//
// bestSource() (js/app.js) is DOM/audio-coupled and can't run in Node, but its
// decision is the pure PBLogic.pickResume over a candidate list built in a fixed
// trust order, with a live peer's position EXTRAPOLATED via PBLogic.livePos. We
// rebuild that exact candidate list here (minus only the live LOCAL-playhead
// override, which is pure `audio`/DOM) and let the SHIPPED logic arbitrate — so
// this exercises the real policy + real extrapolation + real ghost-filtering.
const { test } = require('node:test');
const assert = require('node:assert');
const L = require('../js/logic.js');

const GHOST_MS = 90000;   // a "playing" peer silent longer than this is a corpse

// Mirror of app.js bestSource()'s candidate assembly + arbitration.
//   cold    : {track, offsetMs, ts(sec)}   last-played / janitor cache
//   durable : {t, o, ts(ms)}               Progress cross-device LWW record
//   mine    : {track, pos, ts(ms)}         our own last spot on THIS device
//   peers   : [{track, state, pos, at, speed}]  presence boards for this book
function resumePoint({ cold, durable, mine, peers = [] }, now) {
  const cands = [
    cold ? { track: cold.track, pos: cold.offsetMs || 0, ts: (cold.ts || 0) * 1000 }
         : { track: null, pos: 0, ts: -1 },
  ];
  if (durable) cands.push({ track: durable.t, pos: durable.o || 0, ts: durable.ts || 0 });
  if (mine) cands.push({ track: mine.track, pos: mine.pos || 0, ts: mine.ts || 0 });
  // Same pipeline app.js uses: filter ghosts, then the live peer's pos is
  // extrapolated to `now` and its recency is the arbitration timestamp.
  const live = L.filterPeers(peers, 'me', now, GHOST_MS)[0];
  if (live) cands.push({ track: live.track, pos: L.livePos(live, now), ts: L.recency(live, now) });
  return L.pickResume(cands);
}

const NOW = 5_000_000;

test('basic handoff: A paused at 10:00 → B (no history) resumes exactly there', () => {
  const out = resumePoint({
    cold: { track: 'ch1', offsetMs: 0, ts: 100 },                 // stale first-open cache
    durable: { t: 'ch1', o: 600000, ts: NOW - 60000 },           // A's saved spot, 10:00
  }, NOW);
  assert.equal(out.track, 'ch1');
  assert.equal(out.pos, 600000);
});

test('LIVE handoff: A still playing at 1.5× → B picks up the EXTRAPOLATED position, not the stale anchor', () => {
  const out = resumePoint({
    durable: { t: 'ch1', o: 600000, ts: NOW - 30000 },           // last saved anchor: 10:00
    peers: [{ id: 'A', track: 'ch1', state: 'playing', pos: 600000, at: NOW - 20000, speed: 1.5 }],
  }, NOW);
  // 20s elapsed at 1.5× since the anchor → 600000 + 20000*1.5 = 630000 (10:30).
  assert.equal(out.pos, 630000, 'resumes where A IS now, not where it was 20s ago');
  assert.equal(out.track, 'ch1');
});

test('newest wins over our own stale spot: B ignores its old 5:00 for A’s newer 10:00', () => {
  const out = resumePoint({
    mine: { track: 'ch1', pos: 300000, ts: NOW - 100000 },       // our own old spot, 5:00
    durable: { t: 'ch1', o: 600000, ts: NOW - 1000 },            // A's newer spot, 10:00
  }, NOW);
  assert.equal(out.pos, 600000);
});

test('chapter handoff: A moved to a different chapter → B loads THAT chapter, not just an offset', () => {
  const out = resumePoint({
    mine: { track: 'ch1', pos: 500000, ts: NOW - 100000 },       // we were on chapter 1
    durable: { t: 'ch3', o: 120000, ts: NOW - 1000 },            // A advanced to chapter 3 @ 2:00
  }, NOW);
  assert.equal(out.track, 'ch3', 'follows the chapter, not just the position');
  assert.equal(out.pos, 120000);
});

test('dead peer is ignored: a "playing" ghost does not hijack the resume; B falls back to the durable record', () => {
  const out = resumePoint({
    durable: { t: 'ch2', o: 450000, ts: NOW - 200000 },          // A's last real save, 7:30
    peers: [{ id: 'A', track: 'ch9', state: 'playing', pos: 999000, at: NOW - GHOST_MS - 1, speed: 1 }],  // crashed mid-play
  }, NOW);
  assert.equal(out.track, 'ch2', 'the corpse peer is filtered before arbitration');
  assert.equal(out.pos, 450000);
});

test('deterministic tie: durable and our own record share a timestamp → the same source wins every time (no device flip-flop)', () => {
  const scene = {
    durable: { t: 'chD', o: 600000, ts: NOW },
    mine: { track: 'chM', pos: 300000, ts: NOW },                // exact same ts
  };
  const a = resumePoint(scene, NOW), b = resumePoint(scene, NOW);
  assert.equal(a.track, 'chD', 'durable is listed before mine → wins the tie');
  assert.deepEqual(a, b, 'stable across evaluations');
});

// --- Same-room handoff SYNC: PBLogic.handoffTarget (sync-accuracy plan #1/#2) ---
// The adopting device must land on the peer's TRUE position, not a latency behind.
// handoffTarget(anchor{pos,at,speed}, now, curSec, tolSec, durSec) → seek target
// (sec) or null. Anchor pos is in ms; now/at on the server clock (ms).

test('#2 re-anchor at first sound: the frozen tap-time estimate is pushed forward by the grab-to-sound latency', () => {
  // Peer anchored at 1000s, playing 1.5×. We froze the tap-time estimate and it
  // took 800ms of load before our audio actually started; the peer advanced
  // 800ms*1.5 = 1.2s in that window. curSec is where the frozen seek left us.
  const anchor = { pos: 1000_000, at: NOW, speed: 1.5 };
  const firstSound = NOW + 800;                 // 800ms later
  const frozen = 1000;                          // we seeked to the tap-time pos (sec)
  const target = L.handoffTarget(anchor, firstSound, frozen, 0.3, 5000);
  assert.ok(Math.abs(target - 1001.2) < 0.01, `re-anchored to ${target}, expected ~1001.2`);
});

test('#2 no micro-seek when already within the dead-band', () => {
  const anchor = { pos: 1000_000, at: NOW, speed: 1 };
  // 200ms of latency at 1× = 0.2s drift, under the 0.3s tolerance → leave it alone.
  assert.equal(L.handoffTarget(anchor, NOW + 200, 1000, 0.3, 5000), null);
});

test('#1 clock-free final correction: snap to the paused peer, advanced only by the short since-pause gap', () => {
  // Superseded peer paused at exactly 1005s; its pause-flush lands 400ms later.
  // Treated as still-playing at 1×, the continuous position now is 1005.4s.
  const pausedAnchor = { pos: 1005_000, at: NOW, speed: 1 };
  const landed = NOW + 400;
  const weAreAt = 1004.0;                        // we drifted ~1.4s behind
  const target = L.handoffTarget(pausedAnchor, landed, weAreAt, 0.3, 5000);
  assert.ok(Math.abs(target - 1005.4) < 0.01, `corrected to ${target}, expected ~1005.4`);
});

test('#1 correction respects speed: the since-pause gap is scaled by the local rate', () => {
  const pausedAnchor = { pos: 2000_000, at: NOW, speed: 2 };
  const target = L.handoffTarget(pausedAnchor, NOW + 500, 1999, 0.3, 5000);   // 0.5s * 2 = 1.0s
  assert.ok(Math.abs(target - 2001.0) < 0.01, `got ${target}, expected ~2001.0`);
});

test('handoffTarget guards: null anchor, non-positive target, and past-end target all yield null', () => {
  assert.equal(L.handoffTarget(null, NOW, 10, 0.3, 100), null);
  assert.equal(L.handoffTarget({ pos: 0, at: NOW, speed: 1 }, NOW, 0, 0.3, 100), null);      // target 0 → not > 0
  assert.equal(L.handoffTarget({ pos: 200_000, at: NOW, speed: 1 }, NOW, 10, 0.3, 150), null); // 200s ≥ 150s dur
});
