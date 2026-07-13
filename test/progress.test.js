// Tests for js/progress.js — the durable cross-device progress store: recording,
// Last-Write-Wins merge across peer boards, size-bounding the published summary,
// LRU book trimming, and chapter-% math. Loaded as the REAL module with browser
// globals stubbed by env.js and a Plex stub supplying a controllable server clock.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');

install();
let NOW = 1_700_000_000_000;
const ME = 'pbpwa-me-0001';
global.Plex = { serverNow: () => NOW, getClientId: () => ME };
const Progress = require('../js/progress.js');
const T = Progress._test;

// Fresh state + clock before each test (the module is a singleton across the file).
function reset(at = 1_700_000_000_000) { T.reset(); NOW = at; }

// A peer board in the wire shape rebuild() consumes.
const peerBoard = (id, name, books) => ({ v: 1, id, name, books });

// ---- recording round-trip ---------------------------------------------------
test('recordBook / recordTrack round-trip through the merged read accessors', () => {
  reset();
  Progress.recordBook('bookA', { t: 'tr7', o: 12000, cum: 90000, tot: 3600000 });
  Progress.recordTrack('bookA', 'tr7', 12000, 60000);

  const bk = Progress.bookRecord('bookA');
  assert.equal(bk.t, 'tr7');
  assert.equal(bk.o, 12000);
  assert.equal(bk.cum, 90000);
  assert.equal(bk.tot, 3600000);
  assert.equal(bk.by, ME);
  assert.ok(Progress.isMine(bk), 'our own writes are attributed to us');

  const tr = Progress.trackRecord('bookA', 'tr7');
  assert.deepEqual([tr.o, tr.d], [12000, 60000]);
  assert.equal(Progress.bookRecord('unknown'), null);
  assert.equal(Progress.trackRecord('bookA', 'nope'), null);
});

test('recordTrack rounds fractional ms and defaults junk to 0', () => {
  reset();
  Progress.recordTrack('b', 't', 1234.7, 60000.4);
  const tr = Progress.trackRecord('b', 't');
  assert.deepEqual([tr.o, tr.d], [1235, 60000]);
  Progress.recordTrack('b', 't2', NaN, undefined);
  const tr2 = Progress.trackRecord('b', 't2');
  assert.deepEqual([tr2.o, tr2.d], [0, 0]);
});

// ---- trackPct math ----------------------------------------------------------
test('trackPct: uses recorded duration, falls back to arg, clamps, and returns null when unknown', () => {
  reset();
  Progress.recordTrack('b', 'half', 30000, 60000);
  assert.equal(Progress.trackPct('b', 'half'), 50);                 // from recorded d

  Progress.recordTrack('b', 'nodur', 15000, 0);                     // no recorded duration
  assert.equal(Progress.trackPct('b', 'nodur', 60000), 25);         // falls back to durMs arg
  assert.equal(Progress.trackPct('b', 'nodur'), null);              // and null when neither is known

  Progress.recordTrack('b', 'over', 120000, 60000);
  assert.equal(Progress.trackPct('b', 'over'), 100);               // clamped, never > 100

  assert.equal(Progress.trackPct('b', 'missing'), null);
});

// ---- Last-Write-Wins merge across peers -------------------------------------
test('merge: a peer with a NEWER timestamp wins the book-level record', () => {
  reset();
  Progress.recordBook('shared', { t: 'trOurs', o: 1000, cum: 1000, tot: 5000 });   // ours @ NOW
  const newer = peerBoard('peer-1', 'Kitchen', {
    shared: { bk: { t: 'trPeer', o: 4000, cum: 4000, tot: 5000, ts: NOW + 5000 } },
  });
  T.setPeers([newer]);
  T.rebuild();

  const bk = Progress.bookRecord('shared');
  assert.equal(bk.t, 'trPeer');
  assert.equal(bk.o, 4000);
  assert.equal(bk.by, 'peer-1');
  assert.equal(bk.name, 'Kitchen');
  assert.equal(Progress.isMine(bk), false);
});

test('merge: our record wins on an OLDER peer and on a timestamp TIE (ours is listed first)', () => {
  reset();
  Progress.recordBook('shared', { t: 'trOurs', o: 1000, cum: 1000, tot: 5000 });   // ts = NOW
  const older = peerBoard('peer-1', 'Kitchen', {
    shared: { bk: { t: 'trOld', o: 9, cum: 9, tot: 5000, ts: NOW - 1 } },
  });
  const tie = peerBoard('peer-2', 'Den', {
    shared: { bk: { t: 'trTie', o: 9, cum: 9, tot: 5000, ts: NOW } },              // equal ts
  });
  T.setPeers([older, tie]);
  T.rebuild();

  const bk = Progress.bookRecord('shared');
  assert.equal(bk.t, 'trOurs');
  assert.ok(Progress.isMine(bk), 'strict > means an equal-ts peer does not displace us');
});

test('merge: per-chapter records resolve independently by timestamp', () => {
  reset();
  Progress.recordTrack('bk', 'c1', 1000, 60000);   // ours, older-ish (ts = NOW)
  Progress.recordTrack('bk', 'c2', 2000, 60000);
  const peer = peerBoard('peer-9', 'Phone', {
    bk: { tr: {
      c1: [55000, 60000, NOW + 10000],   // newer than ours → peer wins c1
      c3: [3000, 60000, NOW + 10000],    // a chapter we have no record for
    } },
  });
  T.setPeers([peer]);
  T.rebuild();

  assert.equal(Progress.trackRecord('bk', 'c1').o, 55000);          // peer won this chapter
  assert.equal(Progress.trackRecord('bk', 'c1').by, 'peer-9');
  assert.equal(Progress.trackRecord('bk', 'c2').o, 2000);           // ours untouched
  assert.equal(Progress.trackRecord('bk', 'c2').by, ME);
  assert.equal(Progress.trackRecord('bk', 'c3').o, 3000);           // peer-only chapter present
});

// ---- clearBook --------------------------------------------------------------
test('clearBook removes our own records but a peer can still carry the book', () => {
  reset();
  Progress.recordBook('bk', { t: 't', o: 500, cum: 500, tot: 5000 });
  assert.ok(Progress.bookRecord('bk'));
  Progress.clearBook('bk');
  T.setPeers([]); T.rebuild();
  assert.equal(Progress.bookRecord('bk'), null);
  assert.equal(T.mineBooks().bk, undefined, 'gone from our own board too');

  const peer = peerBoard('peer-1', 'Kitchen', { bk: { bk: { t: 't', o: 9, cum: 9, tot: 5000, ts: NOW } } });
  T.setPeers([peer]); T.rebuild();
  const bk = Progress.bookRecord('bk');
  assert.equal(bk && bk.by, 'peer-1', 'the peer still holds its own copy after we clear ours');
});

// ---- cached peer boards (merge peers on the first paint, before the poll) ----
test('cachePeerBoards persists the current peer boards', () => {
  reset();
  const peer = peerBoard('peer-1', 'Kitchen', { bk: { bk: { t: 't', o: 1, cum: 1, tot: 5, ts: NOW } } });
  T.setPeers([peer]);
  T.cachePeerBoards();
  const raw = JSON.parse(global.localStorage.getItem('pb_progPeers'));
  assert.equal(raw.length, 1);
  assert.equal(raw[0].id, 'peer-1');
});

test('restorePeerBoards: cached peer records are merged on init (visible before the first poll)', () => {
  reset();
  const peer = peerBoard('peer-1', 'Kitchen', { bk: { bk: { t: 't', o: 4000, cum: 4000, tot: 5000, ts: NOW } } });
  global.localStorage.setItem('pb_progPeers', JSON.stringify([peer]));
  T.restorePeerBoards();                                   // what init() does before rebuild
  const bk = Progress.bookRecord('bk');
  assert.ok(bk, 'a merged record exists straight from the cache');
  assert.equal(bk.by, 'peer-1');
  assert.equal(bk.o, 4000);
  // A fresher live board then reconciles in place (LWW) — no lasting stale flash.
  const newer = peerBoard('peer-1', 'Kitchen', { bk: { bk: { t: 't', o: 9000, cum: 9000, tot: 5000, ts: NOW + 1000 } } });
  T.setPeers([newer]); T.rebuild();
  assert.equal(Progress.bookRecord('bk').o, 9000, 'live board wins over the restored cache');
  global.localStorage.removeItem('pb_progPeers');
});

// ---- reset tombstone (cross-device Reset Progress) --------------------------
test('resetBook suppresses our OWN prior records — book reads as unplayed', () => {
  reset();
  Progress.recordBook('bk', { t: 't', o: 5000, cum: 5000, tot: 60000 });
  Progress.recordTrack('bk', 'c1', 5000, 60000);
  NOW += 1000;
  Progress.resetBook('bk');
  assert.equal(Progress.bookRecord('bk'), null, 'book-level record suppressed');
  assert.equal(Progress.trackRecord('bk', 'c1'), null, 'chapter record suppressed');
});

test('resetBook suppresses a PEER’s older record (a bare delete could not)', () => {
  reset();
  const peer = peerBoard('peer-1', 'Kitchen', {
    bk: { bk: { t: 't', o: 9000, cum: 9000, tot: 60000, ts: NOW }, tr: { c1: [9000, 60000, NOW] } },
  });
  NOW += 1000;
  Progress.resetBook('bk');            // tombstone is newer than the peer's records
  T.setPeers([peer]); T.rebuild();
  assert.equal(Progress.bookRecord('bk'), null, 'peer book record predates the reset → suppressed');
  assert.equal(Progress.trackRecord('bk', 'c1'), null, 'peer chapter record suppressed too');
});

test('a peer record NEWER than the tombstone survives (reset only erases the past)', () => {
  reset();
  Progress.resetBook('bk');            // reset @ NOW
  const peer = peerBoard('peer-1', 'Kitchen', {
    bk: { bk: { t: 't', o: 4000, cum: 4000, tot: 60000, ts: NOW + 5000 } },   // played AFTER the reset
  });
  T.setPeers([peer]); T.rebuild();
  const bk = Progress.bookRecord('bk');
  assert.ok(bk && bk.by === 'peer-1', 'a post-reset peer record wins normally');
  assert.equal(bk.o, 4000);
});

test('new local playback after a reset resumes normally (ts > tombstone wins)', () => {
  reset();
  Progress.recordBook('bk', { t: 't', o: 5000, cum: 5000, tot: 60000 });
  NOW += 1000; Progress.resetBook('bk');
  assert.equal(Progress.bookRecord('bk'), null);
  NOW += 1000; Progress.recordBook('bk', { t: 't', o: 800, cum: 800, tot: 60000 });   // played again from ~start
  const bk = Progress.bookRecord('bk');
  assert.ok(bk && bk.o === 800 && Progress.isMine(bk), 'fresh record outranks the tombstone');
});

test('applyPeerResets adopts a peer tombstone: drops our stale records + replicates it', () => {
  reset();
  Progress.recordBook('bk', { t: 't', o: 5000, cum: 5000, tot: 60000 });   // our stale record @ NOW
  Progress.recordTrack('bk', 'c1', 5000, 60000);
  const resetAt = NOW + 1000;
  const peer = peerBoard('peer-1', 'Kitchen', { bk: { rst: resetAt } });   // peer reset the book later
  T.setPeers([peer]);
  T.applyPeerResets();
  const slot = T.mineBooks()['bk'];
  assert.equal(slot.rst, resetAt, 'we adopted (replicated) the peer tombstone on our own board');
  assert.equal(slot.bk, null, 'our stale book record was dropped');
  assert.deepEqual(slot.tr, {}, 'our stale chapter records were dropped');
  T.rebuild();
  assert.equal(Progress.bookRecord('bk'), null, 'book now reads as unplayed');
});

test('applyPeerResets keeps our records that are NEWER than the peer tombstone', () => {
  reset();
  const resetAt = NOW;
  NOW += 5000;
  Progress.recordBook('bk', { t: 't', o: 700, cum: 700, tot: 60000 });     // played AFTER that reset
  const peer = peerBoard('peer-1', 'Kitchen', { bk: { rst: resetAt } });
  T.setPeers([peer]);
  T.applyPeerResets();
  const slot = T.mineBooks()['bk'];
  assert.ok(slot.bk && slot.bk.o === 700, 'our post-reset record is retained');
  assert.equal(slot.rst, resetAt, 'and the tombstone is recorded for further propagation');
});

// ---- LRU trim ---------------------------------------------------------------
test('trim caps our own board at MAX_BOOKS, dropping the least-recently-touched', () => {
  reset();
  const N = T.MAX_BOOKS + 3;
  for (let i = 0; i < N; i++) { NOW += 1000; Progress.recordBook('book' + i, { t: 't', o: i, cum: i, tot: 5000 }); }

  const keys = Object.keys(T.mineBooks());
  assert.equal(keys.length, T.MAX_BOOKS, 'held book count is capped');
  assert.equal(T.mineBooks()['book0'], undefined, 'oldest was evicted');
  assert.equal(T.mineBooks()['book2'], undefined);
  assert.ok(T.mineBooks()['book' + (N - 1)], 'newest survives');
});

// ---- serialize size-bounding ------------------------------------------------
test('serialize keeps the summary under MAX_JSON, dropping oldest chapter maps before whole books', () => {
  reset();
  // Enough books, each with a fat chapter map, to blow past MAX_JSON.
  for (let b = 0; b < 6; b++) {
    NOW += 1000;
    Progress.recordBook('book' + b, { t: 't', o: b, cum: b, tot: 5_000_000 });
    for (let c = 0; c < 40; c++) Progress.recordTrack('book' + b, 'chapter' + c, c * 1000, 60000);
  }
  const raw = JSON.stringify(T.packAll());
  assert.ok(raw.length > T.MAX_JSON, 'precondition: the full summary overflows');

  const out = T.serialize();
  assert.ok(out.length <= T.MAX_JSON, `serialize fits the budget (${out.length} <= ${T.MAX_JSON})`);
  const parsed = JSON.parse(out);                                   // still valid JSON
  const newest = 'book5';
  assert.ok(parsed.books[newest], 'the newest book survives');
  assert.ok(parsed.books[newest].tr, 'newest keeps its chapter map');
  // The oldest book must have shed its chapter map (or the whole book) to make room.
  const oldest = parsed.books['book0'];
  assert.ok(!oldest || !oldest.tr, 'oldest book lost its chapter map first');
});
