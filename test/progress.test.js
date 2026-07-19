// Tests for js/progress.js — the durable cross-device progress store: recording,
// Last-Write-Wins merge across peer boards, size-bounding the published summary,
// LRU book trimming, and chapter-% math. Loaded as the REAL module with browser
// globals stubbed by env.js and a Plex stub supplying a controllable server clock.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');

install();
let NOW = 1_700_000_000_000;
const REAL_ME = 'pbpwa-me-0001';   // the file's own identity — NOT the mutable ME
let ME = REAL_ME;
// Some tests re-run a scenario as a DIFFERENT device. Restoring with setClientId(ME)
// cannot work — ME is the variable being mutated, so the "restore" pins whatever was
// set last and leaks that identity into every later test in the file.
const setClientId = (id) => { ME = id; };
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

// This used to assert "our record wins a timestamp TIE". That expectation was
// DROPPED at .172, deliberately: it is observer-relative, so it is not an ordering
// rule at all — device A keeps A's record while device B keeps B's, forever, each
// republishing its own winner. A replicated merge needs one comparator that returns
// the same answer everywhere. Ties now go to the higher origin id: arbitrary, but
// identically arbitrary on every device. What survives unchanged is the part that
// was always real — an OLDER peer never displaces a newer record.
test('merge: an older peer loses, and a timestamp TIE is resolved by the GLOBAL rule', () => {
  reset();
  Progress.recordBook('shared', { t: 'trOurs', o: 1000, cum: 1000, tot: 5000 });
  const ourTs = T.mineBooks()['shared'].bk.ts;
  const older = peerBoard('peer-1', 'Kitchen', {
    shared: { bk: { t: 'trOld', o: 9, cum: 9, tot: 5000, ts: ourTs - 1 } },
  });
  const tie = peerBoard('peer-2', 'Den', {
    shared: { bk: { t: 'trTie', o: 9, cum: 9, tot: 5000, ts: ourTs } },            // equal ts
  });
  T.setPeers([older, tie]);
  T.rebuild();

  const bk = Progress.bookRecord('shared');
  assert.notEqual(bk.t, 'trOld', 'an older record never wins');
  // 'peer-2' > 'pbpwa-me-0001' lexically, so the tie goes to the peer — on EVERY
  // device, which is the whole point. The convergence test below proves that.
  assert.equal(bk.t, 'trTie');
  assert.equal(bk.by, 'peer-2');
});

// THE property .169 claimed and did not have. Two writers, same timestamp, different
// positions: each must compute the SAME winner, or they diverge permanently and keep
// republishing different answers. Run the identical scenario from BOTH devices'
// point of view — that is what a single fixed local id could never test.
//
// MUTATION: reintroduce the observer-relative arms (`if (cur.by === me) return
// false; if (by === me) return true;`) in the comparator → RED.
test('CONVERGENCE: two writers with equal timestamps pick the SAME winner', () => {
  const A = 'pbpwa-dev-aaaa', B = 'pbpwa-dev-zzzz';
  const TS = 1_700_000_500_000;
  const recA = { t: 'trA', o: 1111, cum: 1111, tot: 5000, ts: TS };
  const recB = { t: 'trB', o: 2222, cum: 2222, tot: 5000, ts: TS };

  // Same situation seen from each device: its own record local, the other foreign.
  const winnerSeenBy = (meId, mineRec, otherId, otherRec, order) => {
    setClientId(meId);
    reset();
    T.mineBooks()['shared'] = { bk: mineRec, tr: {}, _ts: TS };
    const boards = [peerBoard(otherId, 'Other', { shared: { bk: otherRec } })];
    T.setPeers(order ? boards.slice().reverse() : boards);
    T.rebuild();
    return Progress.bookRecord('shared');
  };

  for (const order of [0, 1]) {
    const onA = winnerSeenBy(A, recA, B, recB, order);
    const onB = winnerSeenBy(B, recB, A, recA, order);
    assert.equal(onA.t, onB.t, `order ${order}: both devices choose the same record`);
    assert.equal(onA.o, onB.o, `order ${order}: and therefore the same position`);
  }
  setClientId(REAL_ME);
});

// The comparator has to be used at EVERY site where records compete, not just the
// merged view. Otherwise the UI can settle on one equal-timestamp winner while the
// replica or the archive keeps the other — and when the live boards are pruned, the
// durable state reverts to the alternate.
//
// MUTATION: revert adoptStableForeign to a bare `>=` → RED (first-adopted wins, and
// the replica is IMMUTABLE, so the losing copy is frozen in permanently).
test('adoptStableForeign adopts the GLOBAL winner on a tie, whatever the listing order', () => {
  const TS = 1_700_000_000_000;
  const boards = [
    peerBoard('pbpwa-dev-aaaa', 'A', { shared: { bk: { t: 'trA', o: 1111, cum: 0, tot: 5000, ts: TS } } }),
    peerBoard('pbpwa-dev-zzzz', 'Z', { shared: { bk: { t: 'trZ', o: 2222, cum: 0, tot: 5000, ts: TS } } }),
  ];
  const adoptWith = (order) => {
    reset(TS + 20 * 60 * 1000);            // past STABLE_MS, so foreign records are adoptable
    T.setPeers(order ? boards.slice().reverse() : boards);
    T.adoptStableForeign();
    return T.replicaBooks()['shared'].bk;
  };
  const a = adoptWith(0), b = adoptWith(1);
  assert.equal(a.origin, b.origin, 'the same record is adopted regardless of listing order');
  assert.equal(a.o, b.o);
});

// MUTATION: revert the shard collapse to a bare `>` → RED. This is the path that
// matters most once live boards vanish: it is what the archive restores from.
test('shard collapse resolves a tie identically, whatever the entry order', () => {
  const TS = 1_700_000_000_000;
  const entries = [
    { book: 'shared', bk: { t: 'trA', o: 1111, cum: 0, tot: 5000, ts: TS, origin: 'pbpwa-dev-aaaa', name: 'A' } },
    { book: 'shared', bk: { t: 'trZ', o: 2222, cum: 0, tot: 5000, ts: TS, origin: 'pbpwa-dev-zzzz', name: 'Z' } },
  ];
  const winnerFor = (order) => {
    const srcs = T.shardEntriesToBoards(order ? entries.slice().reverse() : entries);
    const carrying = srcs.filter((s) => s.books.shared && s.books.shared.bk);
    assert.equal(carrying.length, 1, 'exactly one record survives the collapse');
    return carrying[0].books.shared.bk.o;
  };
  assert.equal(winnerFor(0), winnerFor(1), 'the archive keeps the same winner as the live merge');
});

// A device must never mint two records with the same ordering value — otherwise
// (ts, origin) is not unique and NO comparator can order them. serverNow() can
// repeat a millisecond, so this cannot come from the clock.
//
// MUTATION: revert recordBook/recordTrack to raw now() → RED.
test('a frozen clock still yields strictly increasing stamps for our own writes', () => {
  reset();
  const seen = [];
  for (let i = 0; i < 5; i++) {           // NOW does not move
    Progress.recordBook('bk', { t: 't', o: i * 10, cum: 0, tot: 5000 });
    seen.push(T.mineBooks()['bk'].bk.ts);
  }
  for (let i = 1; i < seen.length; i++) {
    assert.ok(seen[i] > seen[i - 1], `stamp ${i} (${seen[i]}) must exceed ${seen[i - 1]}`);
  }
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

test('hydrate: cached peer records are merged for the first paint (before any poll)', () => {
  reset();
  const peer = peerBoard('peer-1', 'Kitchen', { bk: { bk: { t: 't', o: 4000, cum: 4000, tot: 5000, ts: NOW } } });
  global.localStorage.setItem('pb_progPeers', JSON.stringify([peer]));
  T.hydrate();                                             // what enterApp calls pre-render (restore + rebuild)
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

// Clear-on-contact exists to stop us BEING a resurrection source. It cleaned only
// `mine` — but entriesForPublish() also emits REPLICA records, so an adopted copy
// of a peer's pre-reset position kept getting republished into our shards forever.
// Read-time suppression hides it today, which is why nothing visibly broke; the
// moment a tombstone is compacted or a board is pruned, that copy resurrects the
// book. Its sibling applyPurgesLocally() has always cleaned BOTH stores.
//
// MUTATION: drop the replica half of applyPeerResets → the record survives and is
// republished, and this goes RED.
test('applyPeerResets also clears the REPLICA, so we stop republishing pre-reset data', () => {
  reset();
  const stale = NOW;
  // A peer's older position we adopted into our replica at some point.
  T.replicaBooks()['bk'] = { bk: { t: 't', o: 5000, cum: 5000, tot: 60000, ts: stale, origin: 'peer-2', name: 'Tablet' } };
  const resetAt = NOW + 1000;
  T.setPeers([peerBoard('peer-1', 'Kitchen', { bk: { rst: resetAt } })]);
  T.applyPeerResets();
  const rep = T.replicaBooks()['bk'];
  assert.ok(!rep || !rep.bk, 'the pre-reset replica copy is dropped');
  const published = T.entriesForPublish().find((e) => e.book === 'bk');
  assert.ok(!published || !published.bk, 'and it is no longer republished to the archive');
  assert.ok(published && published.rst === resetAt, 'while the tombstone itself IS published (it must propagate)');
});

// The `mine` half short-circuits once we already know a reset. The replica half
// must NOT ride that short-circuit: a stale copy can be adopted into the replica
// AFTER we learned the tombstone (adoptStableForeign runs on every poll and only
// checks the replica's own timestamps), and an install that predates this fix has
// them sitting there already. Both cases leave us republishing pre-reset data.
//
// MUTATION: gate the replica clean on the same "already known" condition → RED.
test('applyPeerResets cleans the replica even when the tombstone is ALREADY known', () => {
  reset();
  const stale = NOW;
  const resetAt = NOW + 1000;
  T.mineBooks()['bk'] = { bk: null, tr: {}, rst: resetAt, _ts: NOW };        // we already adopted it
  T.replicaBooks()['bk'] = { bk: { t: 't', o: 5000, cum: 5000, tot: 60000, ts: stale, origin: 'peer-2', name: 'Tablet' } };
  T.setPeers([peerBoard('peer-1', 'Kitchen', { bk: { rst: resetAt } })]);
  T.applyPeerResets();
  const rep = T.replicaBooks()['bk'];
  assert.ok(!rep || !rep.bk, 'the replica is still cleaned on a pass that short-circuits `mine`');
});

// MUTATION: clear the replica unconditionally instead of only at/below the floor →
// RED. A position played AFTER the reset is live data, not a resurrection source.
test('applyPeerResets keeps a REPLICA record newer than the tombstone', () => {
  reset();
  const resetAt = NOW;
  const newer = NOW + 5000;
  T.replicaBooks()['bk'] = { bk: { t: 't', o: 700, cum: 700, tot: 60000, ts: newer, origin: 'peer-2', name: 'Tablet' } };
  T.setPeers([peerBoard('peer-1', 'Kitchen', { bk: { rst: resetAt } })]);
  T.applyPeerResets();
  const rep = T.replicaBooks()['bk'];
  assert.ok(rep && rep.bk && rep.bk.o === 700, 'a post-reset replica position survives');
});

// A reset stamped from a REGRESSED clock used to land BELOW the record it exists to
// suppress, so the book came straight back. The floor must outrank everything known
// for that book regardless of what the clock says.
//
// MUTATION: revert resetBook to `const floor = now();` → RED.
test('Reset Progress wins even when the clock has moved BACKWARD since the record', () => {
  reset();
  NOW = 1_700_000_005_000;
  Progress.recordBook('bk', { t: 't', o: 5000, cum: 5000, tot: 60000 });
  const recTs = T.mineBooks()['bk'].bk.ts;
  T.setPeers([peerBoard('peer-1', 'Kitchen', {
    bk: { bk: { t: 't', o: 9000, cum: 9000, tot: 60000, ts: recTs + 4000 } },   // a peer is even further ahead
  })]);
  NOW = recTs - 500;                       // serverNow REGRESSES below both records
  Progress.resetBook('bk');
  T.rebuild();
  assert.equal(Progress.bookRecord('bk'), null, 'the book reads as unplayed despite the backward clock');
  assert.ok(T.mineBooks()['bk'].rst > recTs + 4000, 'the tombstone outranks every record it must suppress');
});

// …and the reset must not be a one-way door: playback after it has to be able to win
// again, even while the clock is still below the floor. stamp() persists the floor,
// so ordinary writes continue above it.
//
// MUTATION: make stamp() ignore `lastStamp` (return now()) → RED.
test('playback right after a reset supersedes it, even with the clock still behind', () => {
  reset();
  NOW = 1_700_000_005_000;
  Progress.recordBook('bk', { t: 't', o: 5000, cum: 5000, tot: 60000 });
  NOW = 1_700_000_000_000;                 // clock behind
  Progress.resetBook('bk');
  const floor = T.mineBooks()['bk'].rst;
  Progress.recordBook('bk', { t: 't2', o: 100, cum: 100, tot: 60000 });   // user plays on
  T.rebuild();
  const bk = Progress.bookRecord('bk');
  assert.ok(bk, 'the new position is visible again');
  assert.equal(bk.t, 't2');
  assert.ok(bk.ts > floor, 'because its stamp is above the reset floor');
});

// `.164` made clear-on-contact clean the replica — but ONLY on the path that learns
// a reset from a PEER. Our OWN reset (resetBook) touches `mine` and nothing else,
// and applyPeerResets collects tombstones from peerBoards/shardBoards only, never
// from us. So after resetting a book on THIS device, an adopted foreign pre-reset
// position stayed in the replica and entriesForPublish kept shipping it — the same
// resurrection-source defect, on the half I did not fix.
//
// MUTATION: remove the replica clean from resetBook → RED.
test('OUR OWN reset clears the replica too, not just a reset learned from a peer', () => {
  reset();
  T.replicaBooks()['bk'] = { bk: { t: 't', o: 5000, cum: 5000, tot: 60000, ts: NOW, origin: 'peer-2', name: 'Tablet' } };
  NOW += 1000;
  Progress.resetBook('bk');
  const rep = T.replicaBooks()['bk'];
  assert.ok(!rep || !rep.bk, 'the pre-reset replica copy is dropped by our own reset');
});

// Belt to that brace: even if a pre-reset record reaches the replica by another
// route (adoptStableForeign runs every poll and checks only the PURGE floor), the
// publication must never carry a record its own tombstone suppresses. The payload
// was self-contradictory: `rst` and a record at/below it in the same entry.
//
// MUTATION: drop the reset-floor check in entriesForPublish → RED.
test('entriesForPublish never emits a record its own tombstone suppresses', () => {
  reset();
  const stale = NOW;
  NOW += 1000;
  Progress.resetBook('bk');                       // rst = stale + 1000
  // Sneak a pre-reset foreign copy in behind the reset, as adoptStableForeign would.
  T.replicaBooks()['bk'] = { bk: { t: 't', o: 5000, cum: 5000, tot: 60000, ts: stale, origin: 'peer-2', name: 'Tablet' } };
  const e = T.entriesForPublish().find((x) => x.book === 'bk');
  assert.ok(e, 'the tombstone itself is still published — it must propagate');
  assert.ok(!e.bk, 'but not a record the same entry says was reset away');
});

// LWW needs a TOTAL order to converge. Every comparison in rebuild() is strictly
// `>`, so an exact tie is resolved by whichever source comes first — and that order
// is per-device (our own records, then replica insertion order, then whatever order
// the Plex listing returned). Two devices could therefore settle a tie differently
// and never converge. Ties are reachable, not theoretical: serverNow() can return
// the same millisecond twice (the reason syncqueue.js carries a `rev`).
//
// MUTATION: remove the origin tie-break → RED (the two orders disagree).
test('rebuild resolves an exact timestamp tie identically whatever the source order', () => {
  const boards = [
    peerBoard('dev-aaa', 'A', { bk: { bk: { t: 't1', o: 1000, cum: 1000, tot: 60000, ts: NOW } } }),
    peerBoard('dev-zzz', 'Z', { bk: { bk: { t: 't9', o: 9000, cum: 9000, tot: 60000, ts: NOW } } }),
  ];
  reset();
  T.setPeers(boards);
  const first = T.rebuild().books['bk'].bk;
  reset();
  T.setPeers(boards.slice().reverse());
  const second = T.rebuild().books['bk'].bk;
  assert.equal(first.by, second.by, 'the same record wins regardless of listing order');
  assert.equal(first.o, second.o, 'so every device converges on one position');
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

// ---- STOP-DELETING: local retention is total; only the PUBLISHED clone is capped
// This is the plan's proof case run against the real module: play 100 books →
// every one must survive locally (the old trim() deleted books 1–84 forever).
test('the local store is NEVER trimmed — 100 books recorded, 100 survive locally', () => {
  reset();
  const N = 100;
  for (let i = 0; i < N; i++) { NOW += 1000; Progress.recordBook('book' + i, { t: 't', o: i, cum: i, tot: 5000 }); }

  const keys = Object.keys(T.mineBooks());
  assert.equal(keys.length, N, 'every recorded book is still held locally');
  assert.ok(T.mineBooks()['book0'], 'the oldest book is NOT deleted');
  // And the merged view (what resume reads) still serves the oldest book.
  const bk = Progress.bookRecord('book0');
  assert.ok(bk && bk.o === 0 && Progress.isMine(bk), 'book 1 of 100 is still resumable');
});

test('the PUBLISHED board stays bounded at MAX_BOOKS (a clone — today\'s exact behaviour)', () => {
  reset();
  const N = T.MAX_BOOKS + 10;
  for (let i = 0; i < N; i++) { NOW += 1000; Progress.recordBook('book' + i, { t: 't', o: i, cum: i, tot: 5000 }); }

  const pub = JSON.parse(T.serialize());
  const pubKeys = Object.keys(pub.books);
  assert.equal(pubKeys.length, T.MAX_BOOKS, 'published clone capped at MAX_BOOKS');
  assert.ok(pub.books['book' + (N - 1)], 'newest book is published');
  assert.equal(pub.books['book0'], undefined, 'oldest book is publication-trimmed only');
  // Publication trimming must not have touched the local store.
  assert.equal(Object.keys(T.mineBooks()).length, N, 'local store unaffected by publishing');
  assert.ok(T.mineBooks()['book0'], 'local copy of the oldest book intact after serialize()');
});

test('a fresh reset tombstone rides the bounded publication (newest-by-touch)', () => {
  reset();
  const N = T.MAX_BOOKS + 5;
  for (let i = 0; i < N; i++) { NOW += 1000; Progress.recordBook('book' + i, { t: 't', o: i, cum: i, tot: 5000 }); }
  NOW += 1000;
  Progress.resetBook('book0');                       // resetting the OLDEST book re-touches it
  const pub = JSON.parse(T.serialize());
  assert.ok(pub.books['book0'] && pub.books['book0'].rst, 'the tombstone is published despite the cap');
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

// ---- myBookRecord: this device's OWN last spot (the app.js `myProgress` migration)
test('myBookRecord returns our own recorded book spot {track,pos,ts}, then null after reset', () => {
  reset(1_700_000_500_000);
  assert.equal(Progress.myBookRecord('bkOwn'), null, 'no record yet');
  Progress.recordBook('bkOwn', { t: 'trZ', o: 42000, cum: 42000, tot: 600000 });
  const mine = Progress.myBookRecord('bkOwn');
  assert.deepEqual(mine, { track: 'trZ', pos: 42000, ts: NOW }, 'own spot on the server clock (== old myProgress shape)');
  // It is OUR OWN record, independent of the merged LWW view (a fresher peer does not
  // change what myBookRecord returns for this device).
  Progress._test.setPeers([{ v: 1, id: 'peer-1', name: 'Phone', books: { bkOwn: { bk: { t: 'trPeer', o: 99000, ts: NOW + 10000 } } } }]);
  Progress._test.rebuild();
  assert.deepEqual(Progress.myBookRecord('bkOwn'), { track: 'trZ', pos: 42000, ts: NOW }, 'still OUR spot, not the peer merge');
  Progress.resetBook('bkOwn');
  assert.equal(Progress.myBookRecord('bkOwn'), null, 'reset clears our own last spot');
});
