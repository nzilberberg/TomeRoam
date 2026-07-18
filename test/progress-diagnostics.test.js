// Tests for the durable-progress SUPPORT DIAGNOSTICS — the record-level snapshot,
// the archive-vs-legacy-head state split, and the structured write-failure codes.
//
// WHY THESE EXIST (and what makes each able to fail): every recent progress defect
// was LOGICAL, not structural — writes succeeded while the wrong state was stored
// or chosen. So each test below pins a DISCRIMINATION, not a field's presence:
// it sets up two sources that disagree and asserts the snapshot shows which one
// won and why. A test that only asserted "the field exists" would stay green
// through every bug this feature is meant to expose.
//
// Every test names the mutation that makes it RED in a comment above it. Per the
// project rule (tests-must-be-able-to-fail), a green assertion whose mutation is
// unnamed is treated as unverified.
const { test } = require('node:test');
const assert = require('node:assert');
const env = require('./env.js');

env.install();
const Fmt = require('../js/progressfmt.js');
const createShardStore = require('../js/shardstore.js');
global.ProgressFmt = Fmt;
global.createShardStore = createShardStore;

const T0 = 1_752_700_000_000;
let clock = T0;

// A Plex stand-in with the failure shapes the REAL dependency has: it can 200 a
// write it discards (§3.4 measured), reject with a status, and throw. A fake that
// only ever succeeds would make most of this file untestable.
function fakePlex() {
  const boards = new Map();
  let nextRk = 500;
  // `rejectLegacy` targets the compatibility head ONLY. The two boards are separate
  // Plex playlists, so a fault that hits both at once cannot express the case the
  // whole legacy/archive split exists for: head broken, archive fine.
  // ('pb_prog2_' does not start with 'pb_prog_' — the same prefix invariant the
  // production code depends on.)
  // `transportFailWrite` returns 0 — the shape the REAL adapter produces, because
  // plex.js setPlaylistSummary catches transport errors and returns 0 rather than
  // throwing. A throwing fake alone made the transport category look covered while
  // being unreachable in production, and filed real network drops as "the server
  // refused (HTTP 0)". Model the contract that actually ships.
  const state = { discardWrites: false, rejectStatus: 0, rejectLegacy: 0, throwOnWrite: false, throwOnRead: false, transportFailWrite: false };
  return {
    state, boards,
    createPlaylist: async (title) => { const rk = 'rk' + nextRk++; boards.set(rk, { title, summary: '' }); return rk; },
    setPlaylistSummary: async (rk, text) => {
      if (state.throwOnWrite) throw new Error('ECONNRESET (injected)');
      if (state.transportFailWrite) return 0;          // production shape: catch → 0
      if (state.rejectStatus) return state.rejectStatus;
      const b = boards.get(rk); if (!b) return 404;
      if (state.rejectLegacy && (b.title || '').startsWith('pb_prog_')) return state.rejectLegacy;
      // Discard ONLY child-shard writes, so a split failure can be pinned to the
      // child stage specifically (a whole-store discard fails at the root instead,
      // which cannot distinguish the stages at all).
      if (state.discardChildren && /_p[01]+$/.test(b.title || '')) return 200;
      if (state.discardWrites) return 200;
      b.summary = text; return 200;
    },
    readPlaylistSummary: async (rk) => {
      if (state.throwOnRead) throw new Error('read timeout (injected)');
      return boards.has(rk) ? boards.get(rk).summary : null;
    },
    listBoards: async (prefix) => Array.from(boards, ([ratingKey, b]) => ({ ratingKey, title: b.title, summary: b.summary }))
      .filter((b) => b.title.startsWith(prefix)),
    createBoard: null,
    serverNow: () => clock,
    getClientId: () => 'pbpwa-mine001',
    getBase: () => 'http://host:32400',
  };
}

// Load a FRESH progress.js against a fresh fake, the way the app wires it.
function loadProgress(plexFake) {
  const px = plexFake || fakePlex();
  global.localStorage = env.freshStorage();
  global.Plex = Object.assign({}, px, {
    makeBoard: (prefix, lsKey) => {
      let rk = null;
      return {
        key: () => rk,
        publish: async (text) => {
          if (!rk) rk = await px.createPlaylist(prefix + 'mine');
          return px.setPlaylistSummary(rk, text);
        },
        readAll: async () => px.listBoards(prefix),
      };
    },
    createPlaylist: px.createPlaylist,
    setPlaylistSummary: px.setPlaylistSummary,
    readPlaylistSummary: px.readPlaylistSummary,
    listBoards: px.listBoards,
    deletePlaylist: async () => true,
  });
  global.Presence = { name: () => 'Test Phone', cachedPeers: () => [] };
  global.window = { addEventListener: () => {} };
  delete require.cache[require.resolve('../js/progress.js')];
  const P = require('../js/progress.js');
  P._test.reset();
  return P;
}

// ---- the record-level snapshot: WHICH RECORD WON ------------------------------

// MUTATION: make diagnostics() read the winner from `mine` instead of `merged`
// (e.g. `won = pos(m.bk)`) → won.by becomes this device and this test goes RED.
// That mutation is the whole point: a recomputed winner would agree with my model
// of the merge rather than with the code the player reads.
test('the snapshot reports the winner the REAL merge chose, not our own record', () => {
  const P = loadProgress();
  clock = T0;
  P.recordBook('bookA', { t: 'tr1', o: 60000, cum: 60000, tot: 900000 });
  // A peer with a NEWER position for the same book — the merge must prefer it.
  P._test.setPeers([{ v: 1, id: 'peer-tablet', name: 'Tablet', books: { bookA: { bk: { t: 'tr4', o: 300000, cum: 300000, tot: 900000, ts: T0 + 60000 } } } }]);
  P._test.rebuild();
  const d = P.diagnostics();
  const row = d.books.find((b) => b.book === 'bookA');
  assert.ok(row, 'the book appears in the snapshot');
  assert.equal(row.won.by, 'peer-tablet', 'WON is attributed to the peer that actually won the merge');
  assert.equal(row.won.t, 'tr4');
  assert.equal(row.mine.t, 'tr1', 'and our own losing record is still shown beside it');
  assert.equal(row.mine.o, 60000);
  assert.equal(row.peers.length, 1, 'the peer source is listed separately from the winner');
});

// MUTATION: drop the `won.ts <= floor` suppression from rebuild()'s merge (remove
// `(s.bk.ts||0) > f`) → an at-or-below-floor record wins and `won` becomes
// non-null, failing the assertion. This is the "reset exists but old progress
// wins" class, which is one of the two OPEN bugs this snapshot is aimed at.
test('a reset floor is shown, and a fully-suppressed book reports NO winner', () => {
  const P = loadProgress();
  clock = T0;
  P.recordBook('bookB', { t: 'tr1', o: 5000, cum: 5000, tot: 900000 });
  clock = T0 + 1000;
  P.resetBook('bookB');            // tombstone NEWER than the record above
  P._test.rebuild();
  const row = P.diagnostics().books.find((b) => b.book === 'bookB');
  assert.equal(row.rst, T0 + 1000, 'the tombstone timestamp is visible');
  assert.equal(row.rstFrom, 'pbpwa-mine001', 'attributed to whoever reset it');
  assert.equal(row.won, null, 'nothing survives the floor → no winner, i.e. reads as unplayed');
});

// MUTATION: have addSrc() write shard rows into the same list as peers (or drop
// the replica row) → the two copies stop being separately visible and this fails.
// This is the "correct archive record exists but the replica is stale" class —
// the mechanism behind the open cross-device stale-sync bug.
test('a stale replica and a newer shard copy of the same book are BOTH visible', () => {
  const P = loadProgress();
  clock = T0 + 20 * 60 * 1000;     // past STABLE_MS so the foreign record is adoptable
  // An old foreign record gets adopted into the replica…
  P._test.setPeers([{ v: 1, id: 'peer-tablet', name: 'Tablet', books: { bookC: { bk: { t: 'tr2', o: 100000, cum: 100000, tot: 900000, ts: T0 } } } }]);
  P._test.adoptStableForeign();
  // …while that device's SHARD set already carries a newer one.
  const shardBoards = P._test.shardEntriesToBoards([
    { book: 'bookC', bk: { t: 'tr9', o: 800000, cum: 800000, tot: 900000, ts: T0 + 10 * 60 * 1000, origin: 'peer-tablet', name: 'Tablet' } },
  ]);
  P._test.setShards(shardBoards);
  P._test.rebuild();
  const row = P.diagnostics().books.find((b) => b.book === 'bookC');
  assert.equal(row.replica.ts, T0, 'the replica copy is shown at its own (older) timestamp');
  assert.equal(row.replica.origin, 'peer-tablet');
  assert.equal(row.shards.length, 1, 'the shard copy is listed separately');
  assert.equal(row.shards[0].ts, T0 + 10 * 60 * 1000, 'at its newer timestamp — the divergence is legible');
  assert.equal(row.won.ts, T0 + 10 * 60 * 1000, 'and the newer one won');
});

// MUTATION: sort `all` ascending, or drop the slice → the newest book stops being
// first / the bound disappears. Guards the "keep it bounded" requirement without
// letting the bound silently drop the book you need.
test('books are newest-first and bounded, with the full count still reported', () => {
  const P = loadProgress();
  for (let i = 0; i < 20; i++) { clock = T0 + i * 1000; P.recordBook('book' + i, { t: 't', o: 1000, cum: 1000, tot: 9000 }); }
  P._test.rebuild();
  const d = P.diagnostics();
  assert.equal(d.counts.booksTotal, 20, 'the TOTAL is reported even though the list is bounded');
  assert.equal(d.books.length, 12, 'bounded to DIAG_BOOKS');
  assert.equal(d.books[0].book, 'book19', 'newest first — the book you are debugging is the one kept');
  assert.ok(d.books[0].newest > d.books[11].newest, 'ordered by recency');
});

// ---- archive vs legacy head ---------------------------------------------------

// MUTATION: make `durable` read the legacy state (e.g. `durable: legacyPub.state
// === 'accepted-unverified'`) → this goes RED, because the legacy write succeeds
// here while the archive has never verified. This is the exact conflation the
// change exists to remove.
test('a 200 from the legacy head is ACCEPTED-UNVERIFIED and never reports durable progress', async () => {
  const P = loadProgress();
  clock = T0;
  P.recordBook('bookD', { t: 'tr1', o: 1000, cum: 1000, tot: 9000 });
  await P._test.publish();          // legacy head only — no shard publish forced
  const st = P.syncState();
  assert.equal(st.legacy.state, 'accepted-unverified', 'a 200 buys ACCEPTED, not verified');
  assert.equal(st.legacy.lastStatus, 200);
  assert.equal(st.durable, false, 'and it must NOT make durable progress look safe');
  assert.notEqual(st.archive.state, 'verified', 'the archive has not verified anything yet');
});

// MUTATION: remove the shardHandoffSeq tracking (make archiveState ignore
// `dirtySeq !== shardHandoffSeq`) → `behind` is false and the state reads
// 'verified' while a just-authored record is not in the archive at all. This is
// the "correct local record exists but is unpublished" class.
test('a record authored after the last handoff marks the archive BEHIND, not verified', async () => {
  const P = loadProgress();
  clock = T0;
  P.setSeed('seed1');
  P.recordBook('bookE', { t: 'tr1', o: 1000, cum: 1000, tot: 9000 });
  await P.flush();
  await P._test.shards().flush();
  assert.equal(P.syncState().archive.state, 'verified', 'baseline: a flushed archive verifies');
  clock = T0 + 5000;
  P.recordBook('bookE', { t: 'tr2', o: 7000, cum: 7000, tot: 9000 });   // authored AFTER the handoff
  const st = P.syncState();
  assert.equal(st.archive.behind, true, 'the new record is not in the archive yet');
  assert.equal(st.archive.state, 'pending');
  assert.equal(st.durable, false, 'so durable progress is NOT claimed safe');
});

// MUTATION: let a legacy failure set durable=false, or drop compatOnlyProblem →
// RED. The requirement is directional: a broken compat head must NOT be reported
// as lost progress when the archive verified.
test('a failed legacy head beside a verified archive is a COMPATIBILITY problem, not lost progress', async () => {
  const px = fakePlex();
  const P = loadProgress(px);
  clock = T0;
  P.setSeed('seed1');
  P.recordBook('bookF', { t: 'tr1', o: 1000, cum: 1000, tot: 9000 });
  await P.flush();
  await P._test.shards().flush();
  px.state.rejectLegacy = 500;      // the compatibility head now fails; the archive is fine
  clock = T0 + 1000;
  P.recordBook('bookF', { t: 'tr2', o: 4000, cum: 4000, tot: 9000 });   // re-dirty, or publish() early-returns
  await P.flush();
  await P._test.shards().flush();
  px.state.rejectLegacy = 0;
  const st = P.syncState();
  assert.equal(st.legacy.state, 'failed');
  assert.equal(st.legacy.code, 'legacy-write-failed');
  assert.equal(st.durable, true, 'the archive verified → durable progress IS safe');
  assert.equal(st.compatOnlyProblem, true, 'and the problem is named as compatibility-only');
});

// MUTATION: make archiveState() return 'verified' whenever the store is not
// unsynced (dropping the lastFailure branch) → RED. Proves a legacy success
// cannot paper over an archive that failed.
test('a successful legacy head cannot hide a FAILED archive write', async () => {
  const px = fakePlex();
  const P = loadProgress(px);
  clock = T0;
  P.setSeed('seed1');
  px.state.discardWrites = true;    // Plex 200s the shard write but stores nothing
  P.recordBook('bookG', { t: 'tr1', o: 1000, cum: 1000, tot: 9000 });
  await P.flush();
  await P._test.shards().flush();
  px.state.discardWrites = false;
  const st = P.syncState();
  assert.equal(st.legacy.state, 'accepted-unverified', 'the legacy head went through fine');
  assert.equal(st.archive.state, 'failed', 'while the archive did not');
  assert.equal(st.durable, false, 'the verdict follows the ARCHIVE');
  assert.equal(st.archive.lastFailure.code, 'verify-mismatch', 'and says why, by code');
});

// ---- structured write failures -------------------------------------------------

function makeStore(px, over) {
  return createShardStore(Object.assign({
    deviceId: 'devtest1', clientId: 'pbpwa-mine001',
    maxRequestBytes: 350, requestOverhead: () => 0,
    encode: Fmt.encode, decode: Fmt.decode,
    plex: {
      createBoard: px.createPlaylist,
      writeSummary: px.setPlaylistSummary,
      readSummary: px.readPlaylistSummary,
      listBoards: () => px.listBoards('pb_prog2_'),
    },
    retryBaseMs: 0, log: () => {},
  }, over || {}));
}
const rec = (book, ts) => ({ book, bk: { t: 't' + book, o: 1000, cum: 1000, tot: 9000, ts, origin: 'pbpwa-mine001', name: 'Test Phone' } });

// MUTATION: revert any single throw site to `throw new Error('…')` → its code
// becomes 'unknown' and that case goes RED. Each case is a behaviourally distinct
// state (retry? durable? which step?), which is why they are separate codes.
test('each write failure class produces its own stable reason code, with coordinates', async () => {
  // (1) verify mismatch — 200 with the payload discarded
  let px = fakePlex(); let store = makeStore(px);
  px.state.discardWrites = true;
  store.ensurePublished([rec('b1', T0)], {});
  await store.flush();
  let f = store.syncState().lastFailure;
  assert.equal(f.code, 'verify-mismatch');
  assert.equal(f.dev, 'devtest1', 'the affected device is present');
  assert.equal(f.prefix, '', 'and the affected shard prefix (root)');
  assert.equal(f.stage, 'data');
  assert.ok(f.encodedBytes > 0, 'the payload size is captured for size-related triage');

  // (2) transport failure — DISTINCT from a mismatch (this is the discrimination
  // the free-text version could not make without matching on message strings)
  px = fakePlex(); store = makeStore(px);
  px.state.throwOnWrite = true;
  store.ensurePublished([rec('b1', T0)], {});
  await store.flush();
  f = store.syncState().lastFailure;
  assert.equal(f.code, 'write-transport-failed');
  assert.notEqual(f.code, 'verify-mismatch', 'never conflated with a discarded write');

  // (3) an explicit non-2xx rejection — used to fall through and MISREPORT as a
  // verify mismatch, because only 404 was inspected
  px = fakePlex(); store = makeStore(px);
  px.state.rejectStatus = 413;
  store.ensurePublished([rec('b1', T0)], {});
  await store.flush();
  f = store.syncState().lastFailure;
  assert.equal(f.code, 'write-rejected');
  assert.equal(f.status, 413, 'the status is carried, not buried in a message');

  // (4) verification read failure — distinct from decode and from mismatch
  px = fakePlex(); store = makeStore(px);
  px.state.throwOnRead = true;
  store.ensurePublished([rec('b1', T0)], {});
  await store.flush();
  assert.equal(store.syncState().lastFailure.code, 'verify-transport-failed');
});

// The PRODUCTION shape of a transport failure, which is not a throw: plex.js
// setPlaylistSummary catches and returns 0. That used to be classified as
// `write-rejected (HTTP 0)` — telling support the server refused a request that
// never arrived, while making write-transport-failed unreachable outside tests.
//
// MUTATION: drop the `st === 0` branch in writeAndVerify → RED.
test('a transport failure reported as status 0 is NOT a rejection', async () => {
  const px = fakePlex();
  const store = makeStore(px);
  px.state.transportFailWrite = true;
  store.ensurePublished([rec('b1', T0)], {});
  await store.flush();
  const f = store.syncState().lastFailure;
  assert.equal(f.code, 'write-transport-failed', 'status 0 means it never reached Plex');
  assert.notEqual(f.code, 'write-rejected', 'the server did not refuse anything');
  assert.equal(f.status, undefined, 'and no bogus HTTP status is reported');
  // Size-related triage must not fire on a request that never landed.
  assert.ok(f.encodedBytes > 0, 'the payload size is still recorded for context');
});

// MUTATION: stop passing `stage`/`splitId` through writeAndVerify (drop the extra
// args at the child/redirect call sites) → stage falls back to 'data', splitId is
// null, and this goes RED. Without them a split failure cannot be told from an
// ordinary leaf write — and a failed CHILD (disposable) means something very
// different from a failed REDIRECT (a lost commit).
test('a failure DURING a split names the split stage and the split id', async () => {
  const px = fakePlex();
  const store = makeStore(px);
  // Enough records to overflow the 350-byte budget and force a split, with the
  // discard starting only once the child writes begin.
  const many = [];
  for (let i = 0; i < 30; i++) many.push(rec('book' + i, T0 + i));
  px.state.discardChildren = true;   // the ROOT write is fine; a CHILD write is discarded
  store.ensurePublished(many, {});
  await store.flush();
  const f = store.syncState().lastFailure;
  assert.equal(f.stage, 'child', 'the failure is pinned to the child-write stage, not a plain leaf write');
  assert.ok(f.splitId, 'and carries the split id it belongs to');
  assert.ok(f.prefix.length > 0, 'with the CHILD prefix, not the parent');
  assert.equal(f.code, 'verify-mismatch');
});

// MUTATION: clear failureHistory on success alongside lastFailure → RED. The point
// of the history is that a TRANSIENT failure stays inspectable after recovery;
// without it, a user who reports "it hiccuped" hands over a clean slate.
test('a verified success clears the ACTIVE failure but the bounded history keeps the incident', async () => {
  const px = fakePlex();
  const store = makeStore(px);
  px.state.discardWrites = true;
  store.ensurePublished([rec('b1', T0)], {});
  await store.flush();
  assert.equal(store.syncState().lastFailure.code, 'verify-mismatch');
  px.state.discardWrites = false;                 // recover
  store.ensurePublished([rec('b1', T0 + 1)], {});
  await store.flush();
  const st = store.syncState();
  assert.equal(st.lastFailure, null, 'the ACTIVE degraded reason is cleared by a verified write');
  assert.equal(st.lastError, null);
  const d = store.diagnostics();
  assert.ok(d.recentFailures.length >= 1, 'but the incident survives in the history');
  assert.equal(d.recentFailures[0].code, 'verify-mismatch');
});

// MUTATION: remove the slice(-FAILURE_HISTORY_MAX) → the array grows past 8 and
// this goes RED. Unbounded diagnostic buffers are how a support aid becomes a
// memory leak on a device that has been offline for a week.
test('the failure history is bounded', async () => {
  const px = fakePlex();
  const store = makeStore(px);
  px.state.discardWrites = true;
  for (let i = 0; i < 14; i++) { store.ensurePublished([rec('b1', T0 + i)], {}); await store.flush(); }
  const d = store.diagnostics();
  assert.equal(d.recentFailures.length, 8, 'capped at FAILURE_HISTORY_MAX');
  assert.ok(d.failAttempt >= 14, 'while the attempt counter still reflects every failure');
});

// MUTATION: collapse redirectFault() back to one 'redirect checks failed' string →
// RED. Four different causes with four different meanings (a child never landed vs
// two split attempts interleaving) used to share one message.
test('the four redirect reader checks report distinct codes', async () => {
  const px = fakePlex();
  const store = makeStore(px);
  const many = [];
  for (let i = 0; i < 30; i++) many.push(rec('book' + i, T0 + i));
  store.ensurePublished(many, {});
  await store.flush();
  const r0 = await store.readAll();
  assert.deepEqual(r0.degraded, [], 'baseline: a committed split reads clean');
  // Delete one child board → the parent redirect now points at a missing child.
  let killed = null;
  for (const [rk, b] of px.boards) if (/_p(0|1)$/.test(b.title)) { killed = rk; break; }
  assert.ok(killed, 'the split produced child boards to break');
  px.boards.delete(killed);
  const r1 = await store.readAll();
  assert.ok(r1.degraded.length >= 1, 'the broken subtree is surfaced');
  assert.equal(r1.degraded[0].code, 'redirect-child-missing', 'and says WHICH check failed');
  assert.match(r1.degraded[0].reason, /missing/i, 'the human-readable text still exists');
});

// MUTATION: make a consumer branch on lastError text again → this test documents
// that it need not. Guards the requirement that callers never parse messages.
test('a consumer can classify every failure without reading message text', async () => {
  const px = fakePlex();
  const store = makeStore(px);
  px.state.rejectStatus = 500;
  store.ensurePublished([rec('b1', T0)], {});
  await store.flush();
  const f = store.syncState().lastFailure;
  const known = ['board-create-failed', 'board-gone', 'write-rejected', 'write-transport-failed',
    'verify-read-failed', 'verify-transport-failed', 'verify-decode-failed', 'verify-mismatch'];
  assert.ok(known.includes(f.code), 'the code alone identifies the class');
  assert.ok(typeof f.message === 'string' && f.message.length, 'the human message is retained alongside it');
  assert.ok(!(f.message instanceof Error), 'and no raw Error object is exposed');
  assert.equal(f.willRetry, false, 'retry intent is a field, not an inference');
});

// ---- the compact summary that rides bug reports ---------------------------------

// MUTATION: drop `prog` from debug.js's snapshot(), or make diagSummary() report
// durable from the legacy state → RED. collectDiagnostics() is only reached by
// "Copy diagnostics"; the log the user actually posts carries snapshot(), so
// without this the whole feature would miss its delivery path.
test('the compact summary states the durable verdict and stays small', async () => {
  const P = loadProgress();
  clock = T0;
  P.setSeed('seed1');
  P.recordBook('bookH', { t: 'tr1', o: 1000, cum: 1000, tot: 9000 });
  const before = P.diagSummary();
  assert.equal(before.durable, false, 'unpublished work is not durable');
  assert.equal(before.authored, 1);
  // The checkpoint where the two possible definitions of `durable` DISAGREE: the
  // head has been accepted while the archive has not verified. Without it this
  // test passed under either formulation — both agree before any publish and
  // after a full flush — which is exactly how it was inert.
  await P._test.publish();
  const mid = P.diagSummary();
  assert.equal(mid.legacy, 'accepted-unverified', 'the head write was accepted');
  assert.notEqual(mid.archive, 'verified', 'while the archive has NOT verified');
  assert.equal(mid.durable, false, 'durable follows the archive, not the head');
  await P.flush();
  await P._test.shards().flush();
  const after = P.diagSummary();
  assert.equal(after.durable, true, 'a verified archive is');
  assert.equal(after.archive, 'verified');
  assert.equal(after.failCode, null);
  assert.ok(JSON.stringify(after).length < 300, 'small enough to ride every report + heartbeat');
});

// ---- the diagnostics export must not leak secrets ---------------------------------

// MUTATION: attach the progress snapshot to the diagnostics OBJECT without
// rendering it in diagText() → the rendered text no longer contains the book id
// and this goes RED. That is the real bypass risk: sanitize() is a whole-TEXT
// pass, so a field that is never rendered is never sanitized, and any field that
// IS rendered is covered by the same regexes as everything else.
test('progress diagnostics are RENDERED into the sanitized text path, not attached raw', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'debug.js'), 'utf8');
  // collectDiagnostics attaches it…
  assert.match(src, /d\.progress = Progress\.diagnostics\(\)/, 'the snapshot is collected from the PUBLIC method');
  assert.ok(!/Progress\._test|shards\(\)\._test/.test(src), 'debug.js never reaches into private progress internals');
  // …diagText renders it. Match the CALL, not the definition: `/progressText\(d, L\)/`
  // also matches `function progressText(d, L) {`, so deleting the call left this
  // green — the inert form of the very test that proves the sanitizer is not
  // bypassed. The trailing `;` appears only at the call site.
  assert.match(src, /\n\s*progressText\(d, L\);/, 'diagText CALLS the progress renderer');
  assert.match(src, /function progressText\(d, L\) \{/, 'and that renderer exists');
  // …and the only sharing path sanitizes the rendered text.
  assert.match(src, /const text = sanitize\(diagText\(d\)\)/, 'sharing sanitizes the RENDERED text');
  // No competing sanitizer was introduced.
  assert.equal((src.match(/function sanitize\(/g) || []).length, 1, 'exactly one sanitizer, the existing one');
});

// MUTATION: change progressText to emit a raw URL or token unescaped from a device
// name → sanitize would still catch it (that is the point), but if someone routed
// the section around sanitize this fails. Exercises the actual regexes against
// progress-shaped content.
test('the existing sanitizer strips secrets that arrive through progress-shaped fields', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'debug.js'), 'utf8');
  const body = src.slice(src.indexOf('function sanitize(text)'));
  const fn = new Function('localStorage', body.slice(0, body.indexOf('\n  }') + 4) + '\n  return sanitize;')({ getItem: () => null });
  const line = `  • book42  WON: tr1@5:00 ts=1 by=dev http://plex.host:32400/x?X-Plex-Token=SECRET123`;
  const out = fn(line);
  assert.ok(!out.includes('SECRET123'), 'a token reaching a progress line is stripped');
  assert.ok(!out.includes('plex.host:32400'), 'and so is the credential-bearing URL');
  assert.ok(out.includes('book42'), 'while the diagnostic content itself survives');
});
