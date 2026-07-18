// Tests for js/progress.js's PUBLISH path — specifically what happens to records
// written DURING the publish round-trip.
//
// This needs its own file: `board` is bound once at module load from Plex.makeBoard
// (progress.js:57), and progress.test.js's Plex stub deliberately omits makeBoard, so
// publish() returns early there and the whole path is unreachable. Supplying a
// controllable board here — and no createShardStore/ProgressFmt, so `shards` stays
// null — isolates the legacy board publish.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');

install();
let NOW = 1_700_000_000_000;
const ME = 'pbpwa-me-0001';

/** A board whose publish() we settle by hand, so a write can land mid-flight. */
const board = {
  calls: [],            // one entry per publish: the SERIALIZED payload string
  inflight: [],
  publish(payload) {
    const rec = { payload, n: this.calls.length };
    this.calls.push(payload);
    let settle;
    const p = new Promise((res) => { settle = res; });
    rec.ok = () => settle(200);          // 2xx = "our records are on the server"
    this.inflight.push(rec);
    return p;
  },
  async readAll() { return []; },
};

global.Plex = { serverNow: () => NOW, getClientId: () => ME, makeBoard: () => board };
const Progress = require('../js/progress.js');
const T = Progress._test;

function reset() {
  T.reset();
  board.calls.length = 0;
  board.inflight.length = 0;
}

// The invariant: publish() evaluates serialize() BEFORE its await (it is an argument
// to board.publish), then clears `dirty` AFTER the await on 2xx. A record written in
// between is therefore absent from the payload that was sent, yet is marked clean by
// its completion — a silent LOST UPDATE of durable listening progress. The window is
// a full network round-trip, and recordTrack fires on the write timer during ordinary
// playback, so this is an everyday window, not a hairline one.
test('a track recorded DURING a publish is not marked clean by that publish', async () => {
  reset();
  Progress.recordTrack('bookA', 'trackA', 1000, 60000);

  const pub = T.publish();                       // serializes bookA, then awaits
  await new Promise((r) => setImmediate(r));
  assert.equal(board.calls.length, 1, 'the first publish is in flight');
  assert.ok(board.calls[0].includes('bookA'), 'and it carries bookA');
  assert.ok(!board.calls[0].includes('bookB'), 'bookB does not exist yet — it cannot be in this payload');

  Progress.recordTrack('bookB', 'trackB', 2000, 60000);   // lands mid-flight

  board.inflight[0].ok();                        // the in-flight publish succeeds
  await pub;

  // bookB was never sent. If its dirtiness was cleared by the completion of a publish
  // that predates it, nothing will ever send it: the next publish returns early at
  // `if (!dirty || !board) return`.
  const pub2 = T.publish();
  await new Promise((r) => setImmediate(r));

  assert.equal(board.calls.length, 2,
    'a second publish must actually run — bookB is still unsent, so the store cannot be clean');
  assert.ok(board.calls[1].includes('bookB'),
    'and it must carry the record written during the first round-trip');
  assert.ok(board.calls[1].includes('bookA'), 'alongside the already-published bookA');
  board.inflight[1].ok();
  await pub2;
});

// Control: the ordinary case must still settle to clean, or the fix above would just
// mean "always dirty", republishing forever.
test('with no write during the round-trip, a successful publish DOES settle clean', async () => {
  reset();
  Progress.recordTrack('bookA', 'trackA', 1000, 60000);

  const pub = T.publish();
  await new Promise((r) => setImmediate(r));
  board.inflight[0].ok();
  await pub;

  await T.publish();
  await new Promise((r) => setImmediate(r));
  assert.equal(board.calls.length, 1, 'nothing changed, so there is nothing to republish');
});
