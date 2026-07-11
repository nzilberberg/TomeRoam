// Tests for js/logic.js — the pure decision logic the app delegates to.
const { test } = require('node:test');
const assert = require('node:assert');
const L = require('../js/logic.js');

// ---- fmt / fmtBytes ---------------------------------------------------------
test('fmt renders m:ss under an hour and h:mm:ss over', () => {
  assert.equal(L.fmt(0), '0:00');
  assert.equal(L.fmt(59), '0:59');
  assert.equal(L.fmt(61), '1:01');
  assert.equal(L.fmt(3599), '59:59');
  assert.equal(L.fmt(3600), '1:00:00');
  assert.equal(L.fmt(3661), '1:01:01');
});
test('fmt clamps negatives and junk to 0:00', () => {
  assert.equal(L.fmt(-5), '0:00');
  assert.equal(L.fmt(undefined), '0:00');
  assert.equal(L.fmt(NaN), '0:00');
});
test('fmtBytes switches units at 1 GiB', () => {
  assert.equal(L.fmtBytes(30 * 1024 * 1024), '30.0 MB');
  assert.equal(L.fmtBytes(2 * 1024 * 1024 * 1024), '2.00 GB');
});

// ---- pickNextBank (track banking scheduler) -----------------------------------
const bankArgs = (over = {}) => ({
  idx: 2, count: 10, banked: new Set(), skip: new Set(),
  used: 0, budget: 0, maxAhead: 60, ...over,
});
test('bank: current track first', () => {
  assert.equal(L.pickNextBank(bankArgs()), 2);
});
test('bank: immediate next is wanted even with zero budget', () => {
  assert.equal(L.pickNextBank(bankArgs({ banked: new Set([2]) })), 3);
});
test('bank: beyond next requires budget headroom', () => {
  assert.equal(L.pickNextBank(bankArgs({ banked: new Set([2, 3]) })), null);                       // budget 0
  assert.equal(L.pickNextBank(bankArgs({ banked: new Set([2, 3]), budget: 100, used: 50 })), 4);   // room
  assert.equal(L.pickNextBank(bankArgs({ banked: new Set([2, 3]), budget: 100, used: 100 })), null); // spent
});
test('bank: skip set (too-big tracks) is never re-picked', () => {
  assert.equal(L.pickNextBank(bankArgs({ skip: new Set([2]) })), 3);
  assert.equal(L.pickNextBank(bankArgs({ banked: new Set([2]), skip: new Set([3]), budget: 100 })), 4);
});
test('bank: stops at end of book and at maxAhead', () => {
  assert.equal(L.pickNextBank(bankArgs({ idx: 9 })), 9);                       // last track: itself only
  assert.equal(L.pickNextBank(bankArgs({ idx: 9, banked: new Set([9]) })), null);
  assert.equal(L.pickNextBank(bankArgs({ banked: new Set([2, 3]), budget: 1e9, maxAhead: 2 })), null); // window exhausted
});
test('bank: a Map works as the banked collection (has-only contract)', () => {
  const m = new Map([[2, {}], [3, {}]]);
  assert.equal(L.pickNextBank(bankArgs({ banked: m, budget: 100 })), 4);
});

// ---- livePos (position extrapolation) -----------------------------------------
test('livePos: paused device reports its anchored position', () => {
  assert.equal(L.livePos({ state: 'paused', pos: 5000, at: 0 }, 999999), 5000);
});
test('livePos: playing device extrapolates at its speed', () => {
  assert.equal(L.livePos({ state: 'playing', pos: 1000, at: 90000, speed: 1 }, 100000), 11000);
  assert.equal(L.livePos({ state: 'playing', pos: 1000, at: 90000, speed: 2 }, 100000), 21000);
});
test('livePos: clock skew backwards never rewinds the estimate', () => {
  assert.equal(L.livePos({ state: 'playing', pos: 1000, at: 100000 }, 90000), 1000);
});
test('livePos: missing fields default sanely', () => {
  assert.equal(L.livePos(null, 100), 0);
  assert.equal(L.livePos({ state: 'playing' }, 100), 100);   // pos 0, at 0, speed 1 → now
  assert.equal(L.livePos({ playState: 'playing', pos: 10, at: 50 }, 60), 20);   // self-state key variant
});

// ---- recency --------------------------------------------------------------------
test('recency: playing = now, paused = last event, junk = 0', () => {
  assert.equal(L.recency({ state: 'playing', at: 5 }, 777), 777);
  assert.equal(L.recency({ state: 'paused', at: 5 }, 777), 5);
  assert.equal(L.recency(null, 777), 0);
});

// ---- filterPeers (board hygiene) --------------------------------------------------
test('filterPeers drops self, idle, unparsed, and playing ghosts', () => {
  const now = 200000, GHOST = 90000;
  const peers = [
    null,                                                        // unparseable board
    { id: 'me', state: 'playing', at: now },                     // ourselves
    { id: 'a', state: 'idle', at: now },                         // idle board
    { id: 'b', state: 'playing', at: now - GHOST - 1 },          // playing ghost (crashed)
    { id: 'c', state: 'playing', at: now - 1000 },               // live player — keep
    { id: 'd', state: 'paused', at: 5 },                         // ancient pause — keep (pause is durable)
  ];
  const out = L.filterPeers(peers, 'me', now, GHOST);
  assert.deepEqual(out.map((p) => p.id), ['c', 'd']);
});

// ---- findSuperseder (claim-based handoff) -------------------------------------------
test('supersede: newer claim on the same book wins', () => {
  const st = { playState: 'playing', book: 42, claim: 100 };
  const winner = { id: 'x', state: 'playing', book: '42', claim: 200 };   // string/number tolerant
  assert.equal(L.findSuperseder([winner], st), winner);
});
test('supersede: no winner for older claims, other books, plain paused peers, or when we are not playing', () => {
  const st = { playState: 'playing', book: 42, claim: 100 };
  assert.equal(L.findSuperseder([{ state: 'playing', book: 42, claim: 50 }], st), null);
  assert.equal(L.findSuperseder([{ state: 'playing', book: 7, claim: 200 }], st), null);
  assert.equal(L.findSuperseder([{ state: 'paused', book: 42, claim: 200 }], st), null);   // plain pause doesn't take over
  assert.equal(L.findSuperseder([{ state: 'playing', book: 42, claim: 200 }], { ...st, playState: 'paused' }), null);
  assert.equal(L.findSuperseder([], st), null);
});
test('supersede: a paused peer that GRABBED (scrub-handoff) with a newer claim wins', () => {
  const st = { playState: 'playing', book: 42, claim: 100 };
  const grabber = { id: 'x', state: 'paused', g: 1, book: 42, claim: 200 };
  assert.equal(L.findSuperseder([grabber], st), grabber);
  assert.equal(L.findSuperseder([{ state: 'paused', g: 1, book: 42, claim: 50 }], st), null);   // grab but older → no
});

// ---- pickResume (handoff / resume arbitration) --------------------------------------
test('pickResume: the newest timestamp wins', () => {
  const out = L.pickResume([
    { track: 'a', pos: 100, ts: 10 },
    { track: 'b', pos: 200, ts: 30 },
    { track: 'c', pos: 300, ts: 20 },
  ]);
  assert.deepEqual(out, { track: 'b', pos: 200, ts: 30 });
});
test('pickResume: first-listed wins a timestamp TIE (list order encodes trust)', () => {
  const out = L.pickResume([
    { track: 'durable', pos: 111, ts: 50 },
    { track: 'mine', pos: 222, ts: 50 },
  ]);
  assert.equal(out.track, 'durable');
});
test('pickResume: skips nulls; an empty list is a null anchor at 0', () => {
  assert.deepEqual(L.pickResume([]), { track: null, pos: 0, ts: -Infinity });
  assert.deepEqual(L.pickResume([null, { track: 'x', pos: 5, ts: 0 }]), { track: 'x', pos: 5, ts: 0 });
});

// ---- fitLines / chunkText (log pipe payloads) -----------------------------------------
test('fitLines keeps the newest contiguous tail within budget', () => {
  const lines = ['aaaa', 'bbbb', 'cccc', 'dddd'];               // 5 chars each with \n
  assert.deepEqual(L.fitLines(lines, 10), { lines: ['cccc', 'dddd'], dropped: 2 });
  assert.deepEqual(L.fitLines(lines, 100), { lines, dropped: 0 });
  assert.deepEqual(L.fitLines(lines, 3), { lines: [], dropped: 4 });
  assert.deepEqual(L.fitLines([], 100), { lines: [], dropped: 0 });
});
test('chunkText splits exactly and never returns zero chunks', () => {
  assert.deepEqual(L.chunkText('abcdef', 4), ['abcd', 'ef']);
  assert.deepEqual(L.chunkText('abcd', 4), ['abcd']);
  assert.deepEqual(L.chunkText('', 4), ['']);
});
