// Integration tests: js/progress.js wired to the REAL shard store + REAL TR2
// format over a fake Plex playlist server. Pins the seams the units can't:
//   * the legacy pruner must never delete shard boards (today 'pb_prog_' does NOT
//     match 'pb_prog2_' titles — this pins that shard boards stay out of the
//     legacy prune path even if a prefix is ever renamed into overlap)
//   * stable foreign records are ADOPTED (immutably) and re-published; live ones
//     are merged for display but not adopted
//   * a device's own shards restore its history after a local wipe
//   * an empty local store never overwrites populated shards
//   * shard-borne tombstones propagate like legacy ones
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');

install();
let NOW = 1_700_000_000_000;
const ME = 'pbpwa-me-0001';
const DEV = ME.replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase();

// ---- fake Plex server (title-addressed playlists, prefix-listing like plex.js) --
function fakeServer() {
  const boards = new Map();
  let nextRk = 500;
  const deleted = [];
  return {
    boards, deleted,
    byTitle(t) { for (const [rk, b] of boards) if (b.title === t) return { rk, ...b }; return null; },
    plex: {
      createBoard: async (title) => {
        for (const [rk, b] of boards) if (b.title === title) return rk;
        const rk = 'rk' + nextRk++; boards.set(rk, { title, summary: '' }); return rk;
      },
      writeSummary: async (rk, text) => { if (!boards.has(rk)) return 404; boards.get(rk).summary = text; return 200; },
      readSummary: async (rk) => (boards.has(rk) ? boards.get(rk).summary : null),
      listBoards: async (prefix) => Array.from(boards, ([ratingKey, b]) => ({ ratingKey, title: b.title, summary: b.summary }))
        .filter((b) => b.title.startsWith(prefix)),   // startsWith — the real (overlapping) semantics
      deleteBoard: async (rk) => { const b = boards.get(rk); if (b) deleted.push(b.title); boards.delete(rk); },
    },
  };
}
let srv = fakeServer();

// The plex.js makeBoard trio, backed by the fake server.
const boardId = () => ME.replace(/[^a-z0-9]/gi, '').slice(-8);
function makeBoard(prefix, lsKey) {
  let key = null;
  async function ensure(seed) {
    if (key && srv.boards.has(key)) return key;
    const s = typeof seed === 'function' ? await seed() : seed;
    if (!s) return null;
    key = await srv.plex.createBoard(prefix + boardId());
    return key;
  }
  async function publish(text, seed) {
    const rk = await ensure(seed); if (!rk) return 0;
    const st = await srv.plex.writeSummary(rk, text);
    if (st === 404) key = null;
    return st;
  }
  return { ensure, publish, readAll: () => srv.plex.listBoards(prefix), key: () => key };
}

global.Plex = {
  serverNow: () => NOW,
  getClientId: () => ME,
  makeBoard,
  createPlaylist: (title) => srv.plex.createBoard(title),
  setPlaylistSummary: (rk, s) => srv.plex.writeSummary(rk, s),
  readPlaylistSummary: (rk) => srv.plex.readSummary(rk),
  listBoards: (p) => srv.plex.listBoards(p),
  deletePlaylist: (rk) => srv.plex.deleteBoard(rk),
  getBase: () => 'http://plex.test:32400',
};
global.ProgressFmt = require('../js/progressfmt.js');
global.createShardStore = require('../js/shardstore.js');
const Fmt = global.ProgressFmt;
const Progress = require('../js/progress.js');
const T = Progress._test;

async function fresh(at = 1_700_000_000_000) {
  srv = fakeServer();
  global.localStorage.clear();
  NOW = at;
  T.reset();
  Progress.setSeed('seed-track-1');
}
// Publish everything and settle the shard store.
async function publishAll() { await T.publish(); await T.shards().flush(); }

const rootTitle = `pb_prog2_${DEV}_p`;

// A foreign device's shard board, hand-built through the real format.
async function foreignShard(dev, origin, name, books) {
  const bk = [], rst = [];
  for (const b of books) {
    if (b.bk) bk.push([b.book, b.bk.t, b.bk.o, b.bk.cum || 0, b.bk.tot || 0, b.bk.ts, 0]);
    if (b.rst) rst.push([b.book, b.rst, 0]);
  }
  const enc = await Fmt.encode({ v: 2, dev, prefix: '', origins: [origin], names: [name], bk, rst });
  const rk = await srv.plex.createBoard(`pb_prog2_${dev}_p`);
  await srv.plex.writeSummary(rk, enc);
}

test('record → publish: full history lands in the shards, bounded head on the legacy board', async () => {
  await fresh();
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 90000, tot: 3600000 });
  Progress.recordBook('8385', { t: 'tr9', o: 5000, cum: 5000, tot: 7200000 });
  await publishAll();
  assert.equal(T.shards().syncState().unsynced, false);

  const root = srv.byTitle(rootTitle);
  assert.ok(root, 'shard root board created');
  const payload = await Fmt.decode(root.summary);
  assert.equal(payload.bk.length, 2, 'both books in the shard');
  assert.equal(payload.origins[0], ME, 'authored records carry MY origin');

  const legacy = srv.byTitle('pb_prog_' + boardId());
  assert.ok(legacy, 'legacy head still published');
  const head = JSON.parse(legacy.summary);
  assert.equal(head.v, 1, 'legacy head keeps the v1 verbose format (old clients unchanged)');
  assert.ok(head.books['8913'] && head.books['8385']);
});

test('REGRESSION PIN: the legacy stale-board pruner must never delete shard boards', async () => {
  await fresh();
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await publishAll();
  // A genuinely dead legacy peer board (newest record ~100 days old).
  const deadRk = await srv.plex.createBoard('pb_prog_deadbeef');
  await srv.plex.writeSummary(deadRk, JSON.stringify({ v: 1, id: 'pbpwa-dead', name: 'Old', books: { x: { bk: { t: 't', o: 1, cum: 1, tot: 2, ts: NOW - 100 * 24 * 3600 * 1000 } } } }));

  await T.poll();
  await new Promise((r) => setTimeout(r, 25));   // pruneStaleBoards is fire-and-forget — let it drain
  assert.ok(srv.deleted.includes('pb_prog_deadbeef'), 'the dead LEGACY board was pruned');
  assert.ok(!srv.deleted.some((t) => t.startsWith('pb_prog2_')), 'NO shard board was deleted');
  assert.ok(srv.byTitle(rootTitle), 'shard root intact after the prune pass');
});

test('a STABLE foreign record is merged, adopted immutably, and re-published in MY shards', async () => {
  await fresh();
  const oldTs = NOW - 11 * 60 * 1000;                       // older than STABLE_MS
  await foreignShard('devphone9', 'pbpwa-phone-9', 'Pixel', [
    { book: '2314', bk: { t: 'tr3', o: 910191, cum: 910191, tot: 9999000, ts: oldTs } },
  ]);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();

  const rec = Progress.bookRecord('2314');
  assert.ok(rec && rec.by === 'pbpwa-phone-9' && rec.name === 'Pixel', 'foreign record merged for display');
  const rep = T.replicaBooks()['2314'];
  assert.ok(rep && rep.bk, 'adopted into the replica');
  assert.equal(rep.bk.ts, oldTs, 'ORIGINAL timestamp preserved — never re-stamped');
  assert.equal(rep.bk.origin, 'pbpwa-phone-9', 'ORIGINAL origin preserved');

  await publishAll();
  const payload = await Fmt.decode(srv.byTitle(rootTitle).summary);
  const row = payload.bk.find((r) => r[0] === '2314');
  assert.ok(row, 'replica record re-published in MY shards (dead-device durability)');
  assert.equal(row[5], oldTs, 'with its original timestamp');
  assert.equal(payload.origins[row[6]], 'pbpwa-phone-9', 'and its original origin');
});

test('a LIVE (unstable) foreign record is merged for display but NOT adopted', async () => {
  await fresh();
  await foreignShard('devphone9', 'pbpwa-phone-9', 'Pixel', [
    { book: '2314', bk: { t: 'tr3', o: 5000, cum: 5000, tot: 9999000, ts: NOW - 60 * 1000 } },   // 1 min old
  ]);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  assert.ok(Progress.bookRecord('2314'), 'visible in the merged view');
  assert.equal(T.replicaBooks()['2314'], undefined, 'not adopted — a moving position is not re-published');
});

test('REINSTALL-SURVIVAL: a wiped local store reads its history back from its own shards', async () => {
  await fresh();
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 90000, tot: 3600000 });
  Progress.recordBook('8385', { t: 'tr9', o: 5000, cum: 5000, tot: 7200000 });
  await publishAll();

  // Wipe local state (mine + replica); the server keeps the shards.
  T.reset();
  Progress.setSeed('seed-track-1');
  assert.equal(Progress.bookRecord('8913'), null, 'precondition: local view empty after the wipe');
  await T.poll();
  const rec = Progress.bookRecord('8913');
  assert.ok(rec && rec.o === 12000, 'position restored from our own shards');
  assert.equal(rec.by, ME, 'still attributed to this identity');
});

test('an EMPTY local store never overwrites populated shards', async () => {
  await fresh();
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 90000, tot: 3600000 });
  await publishAll();
  const before = srv.byTitle(rootTitle).summary;

  T.reset();                                   // local store now empty
  Progress.setSeed('seed-track-1');
  T.shards().ensurePublished([]);              // what a publish-after-wipe would send
  await T.shards().flush();
  assert.equal(srv.byTitle(rootTitle).summary, before, 'shards untouched by the empty snapshot');
});

test('a tombstone arriving via a foreign SHARD suppresses and replicates like a legacy one', async () => {
  await fresh();
  Progress.recordBook('2314', { t: 'tr3', o: 5000, cum: 5000, tot: 9999000 });
  const rstAt = NOW + 5000;
  await foreignShard('devphone9', 'pbpwa-phone-9', 'Pixel', [{ book: '2314', rst: rstAt }]);
  NOW += 10000;
  await T.poll();
  assert.equal(Progress.bookRecord('2314'), null, 'reset via shard suppressed our older record');
  assert.equal(T.mineBooks()['2314'].rst, rstAt, 'tombstone replicated onto our own store');
});

test('SURFACE: a corrupted shard reads as degraded in syncState, never as empty', async () => {
  await fresh();
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 90000, tot: 3600000 });
  await publishAll();
  const root = srv.byTitle(rootTitle);
  srv.boards.get(root.rk).summary = 'TR2.garbagegarbage';
  await T.poll();
  const st = Progress.syncState();
  assert.ok(st.degraded.length >= 1, 'degraded shard surfaced');
  assert.equal(st.degraded[0].dev, DEV);
  // And the merged view kept the cached copy rather than reading "empty".
  assert.ok(Progress.bookRecord('8913'), 'record survives via the local store / cache');
});
