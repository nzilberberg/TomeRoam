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
  const state = { failDeletes: false };
  return {
    boards, deleted, state,
    byTitle(t) { for (const [rk, b] of boards) if (b.title === t) return { rk, ...b }; return null; },
    plex: {
      // Production-faithful: Plex createPlaylist creates unconditionally, no title
      // dedupe — the store's persisted hints are what must prevent duplicates.
      createBoard: async (title) => {
        const rk = 'rk' + nextRk++; boards.set(rk, { title, summary: '' }); return rk;
      },
      writeSummary: async (rk, text) => { if (!boards.has(rk)) return 404; boards.get(rk).summary = text; return 200; },
      readSummary: async (rk) => (boards.has(rk) ? boards.get(rk).summary : null),
      listBoards: async (prefix) => Array.from(boards, ([ratingKey, b]) => ({ ratingKey, title: b.title, summary: b.summary }))
        .filter((b) => b.title.startsWith(prefix)),   // startsWith — the real (overlapping) semantics
      // Status-aware like the real Plex.deletePlaylist: false on failure (network /
      // 401 / 500 — all indistinguishable at this contract level), true when the
      // board is confirmed gone (2xx or 404-already-absent).
      deleteBoard: async (rk) => {
        if (state.failDeletes) return false;
        const b = boards.get(rk);
        if (!b) return true;                     // 404 ≡ already removed
        deleted.push(b.title); boards.delete(rk);
        return true;
      },
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

// A foreign device's shard board, hand-built through the real format (the writer
// `id` field is what the device list attributes shard sets by).
async function foreignShard(dev, origin, name, books) {
  const bk = [], rst = [];
  for (const b of books) {
    if (b.bk) bk.push([b.book, b.bk.t, b.bk.o, b.bk.cum || 0, b.bk.tot || 0, b.bk.ts, 0]);
    if (b.rst) rst.push([b.book, b.rst, 0]);
  }
  const enc = await Fmt.encode({ v: 2, dev, prefix: '', id: origin, origins: [origin], names: [name], bk, rst });
  const rk = await srv.plex.createBoard(`pb_prog2_${dev}_p`);
  await srv.plex.writeSummary(rk, enc);
  return rk;
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

test('shard publication is RATE-LIMITED: a heartbeat publish inside the window writes nothing; flush forces', async () => {
  await fresh();
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await publishAll();
  const v1 = srv.byTitle(rootTitle).summary;

  NOW += 5000;
  Progress.recordBook('8913', { t: 'tr1', o: 99000, cum: 99000, tot: 3600000 });
  await T.publish();                       // the 4s legacy heartbeat, inside the 60s shard window
  await T.shards().flush();
  assert.equal(srv.byTitle(rootTitle).summary, v1, 'no shard write inside the rate-limit window');
  const legacy = JSON.parse(srv.byTitle('pb_prog_' + boardId()).summary);
  assert.equal(legacy.books['8913'].bk.o, 99000, 'the legacy head still updated every heartbeat');

  Progress.flush();                        // reconnect/backgrounding forces the snapshot out
  await T.shards().flush();
  const payload = await Fmt.decode(srv.byTitle(rootTitle).summary);
  assert.equal(payload.bk.find((r) => r[0] === '8913')[2], 99000, 'flush pushed the fresh snapshot');
  assert.equal(Progress.syncState().stuck, false, 'healthy heartbeat state never reads as stuck');
  T.reset();                               // clears any armed window timer
});

// ---- device list: inventory, Adopt, Delete --------------------------------------
const GID = 'pbpwa-ghost-777', GDEV = 'ghostdev1';
async function plantGhost(recordTs) {
  // A dead identity with all three board families: legacy progress, shards, presence.
  const grk = await srv.plex.createBoard('pb_prog_ghost001');
  await srv.plex.writeSummary(grk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 2314: { bk: { t: 'tr3', o: 910191, cum: 910191, tot: 9999000, ts: recordTs }, tr: { trX: [910191, 999000, recordTs] } } },
  }));
  const srk = await foreignShard(GDEV, GID, 'Old iPhone', [
    { book: '2314', bk: { t: 'tr3', o: 910191, cum: 910191, tot: 9999000, ts: recordTs } },
  ]);
  const prk = await srv.plex.createBoard('pb_dev_ghost001');
  await srv.plex.writeSummary(prk, JSON.stringify({ id: GID, name: 'Old iPhone', at: recordTs, state: 'paused', pos: 0, claim: 0 }));
  return { grk, srk, prk };
}

test('devices(): a ghost identity is inventoried with name, last-seen, quiet, and all its boards', async () => {
  await fresh();
  const oldTs = NOW - 3 * 24 * 3600 * 1000;
  const { grk, srk } = await plantGhost(oldTs);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();

  const list = Progress.devices();
  const g = list.find((x) => x.id === GID);
  assert.ok(g, 'ghost identity listed');
  assert.equal(g.name, 'Old iPhone');
  assert.equal(g.quiet, true, '3 days silent → quiet (Adopt may be offered)');
  assert.equal(g.legacyRk, grk);
  assert.deepEqual(g.shardBoards, [srk], 'shard set attributed via the payload writer id');
  assert.equal(g.lastSeen, oldTs);
  assert.ok(!list.some((x) => x.id === ME), 'we never list ourselves');
});

test('devices(): a RECENTLY active identity is flagged not-quiet (display hint — Adopt is never gated)', async () => {
  await fresh();
  await plantGhost(NOW - 60 * 1000);   // active a minute ago
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);
  assert.equal(g.quiet, false, 'recent activity → flagged active (UI warns, never withholds)');
  // And adoption itself works immediately — the reinstall-now case.
  const res = await Progress.adoptIdentity(g);
  assert.ok(res.ok, res.error || '');
  assert.ok(Progress.isMine(Progress.bookRecord('2314')), 'adopted seconds after the ghost was last active');
});

test('ADOPT: records become MINE with their ORIGINAL timestamps; every ghost board is removed', async () => {
  await fresh();
  const oldTs = NOW - 3 * 24 * 3600 * 1000;
  const { grk, srk, prk } = await plantGhost(oldTs);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  const res = await Progress.adoptIdentity(g);
  assert.ok(res.ok, res.error || '');
  assert.equal(res.adopted, 1);

  const rec = Progress.bookRecord('2314');
  assert.ok(Progress.isMine(rec), 'adopted position is attributed to me (orange)');
  assert.equal(rec.ts, oldTs, 'ORIGINAL timestamp preserved — adoption never re-stamps');
  assert.ok(Progress.trackRecord('2314', 'trX'), 'chapter records adopted too');
  assert.deepEqual(Progress.myBookRecord('2314'), { track: 'tr3', pos: 910191, ts: oldTs }, 'lives in my own store');

  assert.ok(!srv.boards.has(grk), 'ghost legacy board removed');
  assert.ok(!srv.boards.has(srk), 'ghost shard removed');
  assert.ok(!srv.boards.has(prk), 'ghost presence board removed');
  assert.ok(!Progress.devices().some((x) => x.id === GID), 'gone from the list');

  const payload = await Fmt.decode(srv.byTitle(rootTitle).summary);
  const row = payload.bk.find((r) => r[0] === '2314');
  assert.equal(payload.origins[row[6]], ME, 'republished in my shards as my own');
  assert.equal(row[5], oldTs, 'still the original timestamp');
});

test('DELETE really deletes: purge tombstone published, records gone from merge/replica/shards, boards removed', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;                    // stable → will have been auto-adopted into the replica
  const { grk, srk, prk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  assert.ok(Progress.bookRecord('2314'), 'precondition: ghost record visible');
  assert.ok(T.replicaBooks()['2314'], 'precondition: already auto-adopted into the replica');
  const g = Progress.devices().find((x) => x.id === GID);

  NOW += 1000;
  const res = await Progress.deleteDevice(g);
  assert.ok(res.ok, res.error || '');
  assert.ok(!srv.boards.has(grk) && !srv.boards.has(srk) && !srv.boards.has(prk), 'all three board families removed');
  assert.equal(Progress.bookRecord('2314'), null, 'the record is DELETED, not preserved');
  assert.ok(!(T.replicaBooks()['2314'] || {}).bk, 'replica copy purged');
  assert.ok(T.purgedMap()[GID] > 0, 'purge tombstone recorded');

  const payload = await Fmt.decode(srv.byTitle(rootTitle).summary);
  assert.ok(!payload.bk.some((r) => r[0] === '2314'), 'our shards no longer republish it');
  // The purge rides the legacy board so peers adopt it.
  await T.publish();
  const legacy = JSON.parse(srv.byTitle('pb_prog_' + boardId()).summary);
  assert.ok(legacy.purged && legacy.purged[GID] > 0, 'purge published for clear-on-contact replication');
});

test('DELETE is mesh-wide: a peer-published purge suppresses lingering copies here (offline-peer resurrection blocked)', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  assert.ok(Progress.bookRecord('2314'), 'ghost record adopted + visible here');

  // ANOTHER device deleted the ghost — its legacy board carries the purge.
  NOW += 1000;
  const peerRk = await srv.plex.createBoard('pb_prog_livepeer1');
  await srv.plex.writeSummary(peerRk, JSON.stringify({ v: 1, id: 'pbpwa-live-1', name: 'Pixel', books: {}, purged: { [GID]: NOW } }));
  await T.poll();
  assert.equal(Progress.bookRecord('2314'), null, 'peer purge adopted — our replica copy suppressed and dropped');
  assert.ok(T.purgedMap()[GID] === NOW, 'tombstone replicated locally');
});

test('a record NEWER than the purge survives (deleting a live device is self-healing)', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);
  NOW += 1000;
  await Progress.deleteDevice(g);
  assert.equal(Progress.bookRecord('2314'), null, 'purged');

  // The "deleted" device was alive: it republishes a NEWER position.
  NOW += 60 * 1000;
  const nrk = await srv.plex.createBoard('pb_prog_ghost001');
  await srv.plex.writeSummary(nrk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 2314: { bk: { t: 'tr4', o: 5000, cum: 5000, tot: 9999000, ts: NOW } } },
  }));
  await T.poll();
  const rec = Progress.bookRecord('2314');
  assert.ok(rec && rec.o === 5000 && rec.by === GID, 'post-purge playback wins normally — nothing is bricked');
});

// ---- .127 review findings: purges must be durable, universal, and honest ---------
test('DELETE is GATED on verified purge publication: unverifiable sync → boards kept, delete refused', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk, srk, prk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  // Plex's measured failure mode: 200, content silently discarded.
  const realWrite = srv.plex.writeSummary;
  srv.plex.writeSummary = async () => 200;
  NOW += 1000;
  const refused = await Progress.deleteDevice(g);
  assert.equal(refused.ok, false, 'destructive deletion must not proceed on an unverified purge');
  assert.ok(srv.boards.has(grk) && srv.boards.has(srk) && srv.boards.has(prk), 'every board kept');

  srv.plex.writeSummary = realWrite;
  const res = await Progress.deleteDevice(g);
  assert.ok(res.ok, res.error || '');
  assert.ok(!srv.boards.has(grk) && !srv.boards.has(srk) && !srv.boards.has(prk), 'boards removed after verification');
  // The purge rides the READ-BACK-VERIFIED shard payload, not just the legacy summary.
  const payload = await Fmt.decode(srv.byTitle(rootTitle).summary);
  assert.ok((payload.purge || []).some((r) => r[0] === GID && r[1] > 0), 'purge present in the verified TR2 payload');
});

test('a legacy board fresh ONLY via its purge map is not pruned as stale', async () => {
  await fresh();
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await publishAll();
  // A peer board whose books are ancient but which carries a FRESH purge.
  const rk = await srv.plex.createBoard('pb_prog_oldpurger');
  await srv.plex.writeSummary(rk, JSON.stringify({
    v: 1, id: 'pbpwa-purger-1', name: 'Pixel',
    books: { 111: { bk: { t: 't', o: 1, cum: 1, tot: 2, ts: NOW - 100 * 24 * 3600 * 1000 } } },
    purged: { 'pbpwa-someone': NOW - 1000 },
  }));
  await T.poll();
  await new Promise((r) => setTimeout(r, 25));   // pruner is fire-and-forget
  assert.ok(srv.boards.has(rk), 'the purge timestamp keeps the board alive (losing it would lose the purge)');
});

test('a purge of THIS device is honored: authored records at/before it are dropped, newer survive, none republished', async () => {
  await fresh();
  Progress.recordBook('1001', { t: 'trA', o: 5000, cum: 5000, tot: 60000 });   // authored @ NOW
  const purgeAt = NOW + 5000;
  NOW += 10000;
  Progress.recordBook('2002', { t: 'trB', o: 7000, cum: 7000, tot: 60000 });   // authored AFTER the purge
  // A peer (which deleted us while we were offline) publishes the purge.
  const rk = await srv.plex.createBoard('pb_prog_peerdel01');
  await srv.plex.writeSummary(rk, JSON.stringify({ v: 1, id: 'pbpwa-live-1', name: 'Pixel', books: {}, purged: { [ME]: purgeAt } }));
  await T.poll();

  assert.equal(Progress.bookRecord('1001'), null, 'pre-purge authored record deleted locally');
  assert.equal(T.mineBooks()['1001'], undefined, 'gone from the authored store, not just hidden');
  const kept = Progress.bookRecord('2002');
  assert.ok(kept && Progress.isMine(kept), 'post-purge listening survives');
  const pub = T.entriesForPublish();
  assert.ok(!pub.some((e) => e.book === '1001' && e.bk), 'the deleted record is never republished');
  assert.ok(pub.some((e) => e.book === '2002' && e.bk), 'the newer record still publishes');
});

test('ADOPT respects the purge floor: only post-purge records are adopted', async () => {
  await fresh();
  const oldTs = NOW - 3 * 24 * 3600 * 1000;
  const { grk } = await plantGhost(oldTs);                    // book 2314 @ oldTs
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);
  NOW += 1000;
  const purgeAt = NOW;
  await Progress.deleteDevice(g);                             // purge @ purgeAt; boards gone
  assert.ok(!srv.boards.has(grk));

  // A stale copy of the ghost's board REAPPEARS carrying a pre-purge record AND
  // a post-purge one (it kept playing somewhere).
  NOW += 60 * 1000;
  const rk2 = await srv.plex.createBoard('pb_prog_ghost001');
  await srv.plex.writeSummary(rk2, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: {
      2314: { bk: { t: 'tr3', o: 910191, cum: 910191, tot: 9999000, ts: oldTs } },       // pre-purge — deleted data
      5005: { bk: { t: 'tr9', o: 4000, cum: 4000, tot: 9999000, ts: purgeAt + 30000 } }, // post-purge — real new listening
    },
  }));
  await T.poll();
  const g2 = Progress.devices().find((x) => x.id === GID);
  const res = await Progress.adoptIdentity(g2);
  assert.ok(res.ok, res.error || '');
  assert.equal(T.mineBooks()['2314'], undefined, 'pre-purge record NOT resurrected into my authored store');
  assert.equal(Progress.bookRecord('2314'), null, 'still deleted everywhere');
  const kept = Progress.bookRecord('5005');
  assert.ok(kept && Progress.isMine(kept) && kept.ts === purgeAt + 30000, 'post-purge record adopted normally');
});

test('a pre-.123 shard set (no writer id) associates by dev8 suffix; unmatched sets are flagged unresolved', async () => {
  await fresh();
  const oldTs = NOW - 3 * 24 * 3600 * 1000;
  // Legacy board for the ghost identity…
  const grk = await srv.plex.createBoard('pb_prog_ghost001');
  await srv.plex.writeSummary(grk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 2314: { bk: { t: 'tr3', o: 1000, cum: 1000, tot: 2000, ts: oldTs } } },
  }));
  // …plus an OLD (.121-era) shard set whose dev8 equals the ghost id's sanitized
  // suffix but whose payload has NO writer id field.
  const gdev8 = GID.replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase();
  const enc = await Fmt.encode({ v: 2, dev: gdev8, prefix: '', origins: [GID], names: ['Old iPhone'], bk: [['2314', 'tr3', 1000, 1000, 2000, oldTs, 0]], rst: [] });
  const srk = await srv.plex.createBoard(`pb_prog2_${gdev8}_p`);
  await srv.plex.writeSummary(srk, enc);
  // And one truly unattributable old set.
  const enc2 = await Fmt.encode({ v: 2, dev: 'zzzzzzzz', prefix: '', origins: ['pbpwa-mystery'], names: ['?'], bk: [], rst: [] });
  const zrk = await srv.plex.createBoard('pb_prog2_zzzzzzzz_p');
  await srv.plex.writeSummary(zrk, enc2);

  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const list = Progress.devices();
  const g = list.find((x) => x.id === GID);
  assert.ok(g, 'one associated row for the ghost');
  assert.equal(g.legacyRk, grk);
  assert.ok(g.shardBoards.includes(srk), 'id-less shard set associated via the dev8 suffix');
  assert.ok(!g.unresolved, 'associated set is fully actionable');
  const z = list.find((x) => x.key === 'dev8:zzzzzzzz');
  assert.ok(z && z.unresolved, 'unmatched old set flagged unresolved (UI must not claim Delete removes its records)');
});

// ---- .129 review finding: pending deletions must COMPLETE, idempotently ----------
test('a pending delete COMPLETES automatically once the purge publishes — no second user action', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk, srk, prk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  const realWrite = srv.plex.writeSummary;
  srv.plex.writeSummary = async () => 200;             // silent discard
  NOW += 1000;
  const r1 = await Progress.deleteDevice(g);
  assert.equal(r1.ok, false);
  assert.equal(r1.pending, true);
  assert.ok(srv.boards.has(grk) && srv.boards.has(srk) && srv.boards.has(prk), 'boards kept while pending');

  srv.plex.writeSummary = realWrite;                   // connectivity heals
  await T.poll();                                      // an ordinary later poll — NOT a second Delete
  assert.ok(!srv.boards.has(grk) && !srv.boards.has(srk) && !srv.boards.has(prk), 'cleanup finished automatically');
  assert.deepEqual(Progress.pendingDeletes(), {}, 'pending entry cleared');
  assert.ok(!Progress.devices().some((x) => x.id === GID), 'gone from the device list');
});

test('re-pressing Delete while pending REUSES the original purge timestamp (idempotent retry, not a wider deletion)', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  srv.plex.writeSummary = async () => 200;             // stays broken throughout
  NOW += 1000;
  await Progress.deleteDevice(g);
  const ts1 = T.purgedMap()[GID];
  assert.ok(ts1 > 0);
  NOW += 7777;
  const again = await Progress.deleteDevice(Progress.devices().find((x) => x.id === GID) || g);
  assert.equal(again.pending, true);
  assert.equal(T.purgedMap()[GID], ts1, 'the purge floor did NOT advance — a retry is not a new deletion');
});

test('records the target created AFTER the original purge survive the delayed cleanup', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  const realWrite = srv.plex.writeSummary;
  srv.plex.writeSummary = async () => 200;
  NOW += 1000;
  await Progress.deleteDevice(g);                      // pending @ ts1
  const ts1 = T.purgedMap()[GID];

  // The ghost was actually a live device: it publishes a NEW position after ts1.
  const ts2 = ts1 + 60 * 1000;
  srv.plex.writeSummary = realWrite;                   // heal — and let the ghost republish first
  await realWrite(grk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 7007: { bk: { t: 'trN', o: 3000, cum: 3000, tot: 9000000, ts: ts2 } } },
  }));
  NOW = ts2 + 11 * 60 * 1000;                          // stable → adoptable into our replica
  await T.poll();                                      // adopts ts2, then completes the pending delete
  assert.equal(T.purgedMap()[GID], ts1, 'floor unchanged by completion');
  assert.ok(!srv.boards.has(grk), 'boards removed by the delayed cleanup');
  const rec = Progress.bookRecord('7007');
  assert.ok(rec && rec.ts === ts2 && rec.by === GID, 'post-purge listening survives the cleanup (preserved via the replica)');
});

// ---- .130 review finding: cleanup failures must keep the transaction open --------
test('CLEANUP failure keeps the pending transaction: boards stay listed, auto-retry finishes, 404 counts as removed', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk, srk, prk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  srv.state.failDeletes = true;                        // purge publishes fine; playlist DELETEs fail
  NOW += 1000;
  const r1 = await Progress.deleteDevice(g);
  assert.equal(r1.ok, false);
  assert.equal(r1.pending, true, 'cleanup failure = still pending, never silent success');
  assert.ok(srv.boards.has(grk) && srv.boards.has(srk) && srv.boards.has(prk), 'boards untouched');
  assert.ok(Progress.pendingDeletes()[g.key], 'transaction retained');
  assert.ok(Progress.devices().some((x) => x.id === GID), 'row still visible — a failed cleanup is not hidden');

  srv.boards.delete(prk);                              // one board vanishes on its own → 404 must count as removed
  srv.state.failDeletes = false;
  await T.poll();                                      // ordinary poll finishes the cleanup
  assert.ok(!srv.boards.has(grk) && !srv.boards.has(srk), 'remaining boards removed');
  assert.deepEqual(Progress.pendingDeletes(), {}, 'transaction closed only when every board is confirmed gone');
  assert.ok(!Progress.devices().some((x) => x.id === GID));
});

test('repeated Delete through CLEANUP failure keeps the original timestamp; post-purge records survive completion', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  srv.state.failDeletes = true;
  NOW += 1000;
  await Progress.deleteDevice(g);
  const ts1 = T.purgedMap()[GID];
  NOW += 9999;
  const again = await Progress.deleteDevice(Progress.devices().find((x) => x.id === GID) || g);
  assert.equal(again.pending, true);
  assert.equal(T.purgedMap()[GID], ts1, 'a cleanup retry never widens the purge');

  // The ghost was live and keeps playing while cleanup is stuck.
  const ts2 = ts1 + 60 * 1000;
  await srv.plex.writeSummary(grk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 7007: { bk: { t: 'trN', o: 3000, cum: 3000, tot: 9000000, ts: ts2 } } },
  }));
  NOW = ts2 + 11 * 60 * 1000;                          // stable → replica adopts before cleanup lands
  srv.state.failDeletes = false;
  await T.poll();
  assert.equal(T.purgedMap()[GID], ts1, 'floor still the original');
  assert.ok(!srv.boards.has(grk), 'cleanup completed');
  const rec = Progress.bookRecord('7007');
  assert.ok(rec && rec.ts === ts2 && rec.by === GID, 'records written after the original purge survive');
});

// ---- .131 review finding: cleanup must preserve FRESH post-purge records ----------
test('cleanup preserves a post-purge record even INSIDE the 10-minute stability window (verified before boards die)', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  srv.state.failDeletes = true;                        // purge publishes; cleanup stuck
  NOW += 1000;
  await Progress.deleteDevice(g);
  const ts1 = T.purgedMap()[GID];

  // The live target writes ONE MINUTE after the purge — its boards are the only
  // copy, and the record is far too fresh for the ordinary replication gate.
  const ts2 = ts1 + 60 * 1000;
  await srv.plex.writeSummary(grk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 7007: { bk: { t: 'trN', o: 3000, cum: 3000, tot: 9000000, ts: ts2 } } },
  }));
  NOW = ts2 + 30 * 1000;                               // deliberately INSIDE STABLE_MS — do not dodge the race
  srv.state.failDeletes = false;                       // cleanup heals immediately
  await T.poll();                                      // must preserve-then-delete, not delete-then-lose

  assert.ok(!srv.boards.has(grk), 'cleanup completed');
  const rep = T.replicaBooks()['7007'];
  assert.ok(rep && rep.bk && rep.bk.ts === ts2 && rep.bk.origin === GID, 'fresh post-purge record captured into the replica FIRST');
  const payload = await Fmt.decode(srv.byTitle(rootTitle).summary);
  const row = payload.bk.find((r) => r[0] === '7007');
  assert.ok(row && row[5] === ts2, 'and verifiably published in OUR shards before the only other copy was destroyed');

  await T.poll();                                      // a later poll (boards gone) must still see it
  const rec = Progress.bookRecord('7007');
  assert.ok(rec && rec.ts === ts2 && rec.by === GID, 'the record outlives the deleted boards');
});

test('cleanup REFUSES to delete boards while the post-purge preservation cannot be verified', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  srv.state.failDeletes = true;
  NOW += 1000;
  await Progress.deleteDevice(g);
  const ts1 = T.purgedMap()[GID];
  const ts2 = ts1 + 60 * 1000;
  await srv.plex.writeSummary(grk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 7007: { bk: { t: 'trN', o: 3000, cum: 3000, tot: 9000000, ts: ts2 } } },
  }));
  NOW = ts2 + 30 * 1000;
  srv.state.failDeletes = false;                       // deletes work again…
  const realWrite = srv.plex.writeSummary;
  srv.plex.writeSummary = async () => 200;             // …but publication is silently discarded
  await T.poll();
  assert.ok(srv.boards.has(grk), 'boards KEPT — the fresh record cannot be verifiably preserved yet');
  assert.ok(Progress.pendingDeletes()[g.key], 'transaction stays open');

  srv.plex.writeSummary = realWrite;                   // publication heals
  await T.poll();
  assert.ok(!srv.boards.has(grk), 'now cleanup completes');
  const rec = Progress.bookRecord('7007');
  assert.ok(rec && rec.ts === ts2, 'record preserved through the whole ordeal');
});

// ---- .132 review finding: preservation must ALWAYS verify — local presence is not durability
test('an AGED post-purge record (adopted by ordinary replication) is still verified before boards die; local copy ≠ published', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  srv.state.failDeletes = true;
  NOW += 1000;
  await Progress.deleteDevice(g);
  const ts1 = T.purgedMap()[GID];
  const ts2 = ts1 + 60 * 1000;
  await srv.plex.writeSummary(grk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 7007: { bk: { t: 'trN', o: 3000, cum: 3000, tot: 9000000, ts: ts2 } } },
  }));
  NOW = ts2 + 11 * 60 * 1000;                          // AGED past the stability window — the ordinary
                                                       // replication pass will copy it BEFORE preservation runs
  const realWrite = srv.plex.writeSummary;
  srv.plex.writeSummary = async () => 200;             // publication silently discarded
  srv.state.failDeletes = false;                       // deletes would succeed — verification must stop them
  await T.poll();
  assert.ok((T.replicaBooks()['7007'] || {}).bk, 'the record IS in the local replica (the trap: looks preserved)');
  assert.ok(srv.boards.has(grk), 'boards KEPT — a local copy that has not passed read-back is not preservation');
  assert.ok(Progress.pendingDeletes()[g.key], 'transaction stays open');

  await T.poll();                                      // second attempt with replica pre-populated — same refusal
  assert.ok(srv.boards.has(grk), 'still kept (idempotent refusal, not a one-shot check)');

  srv.plex.writeSummary = realWrite;                   // publication heals
  await T.poll();
  assert.ok(!srv.boards.has(grk), 'cleanup completes after verification');
  const payload = await Fmt.decode(srv.byTitle(rootTitle).summary);
  const row = payload.bk.find((r) => r[0] === '7007');
  assert.ok(row && row[5] === ts2, 'record confirmed in the decoded shard payload before the boards died');
});

test('a RESET tombstone from the target is preserved and verified before its boards are deleted', async () => {
  await fresh();
  const ts = NOW - 30 * 60 * 1000;
  const { grk } = await plantGhost(ts);
  Progress.recordBook('8913', { t: 'tr1', o: 12000, cum: 12000, tot: 3600000 });
  await T.poll();
  const g = Progress.devices().find((x) => x.id === GID);

  srv.state.failDeletes = true;
  NOW += 1000;
  await Progress.deleteDevice(g);
  const ts1 = T.purgedMap()[GID];
  // The target resets a book while cleanup is pending. Resets are REAL actions —
  // deliberately not suppressed by the identity purge — and must outlive the boards.
  const rstTs = ts1 + 5000;
  await srv.plex.writeSummary(grk, JSON.stringify({
    v: 1, id: GID, name: 'Old iPhone',
    books: { 2314: { rst: rstTs } },
  }));
  NOW += 60 * 1000;
  const realWrite = srv.plex.writeSummary;
  srv.plex.writeSummary = async () => 200;
  srv.state.failDeletes = false;
  await T.poll();
  assert.ok(srv.boards.has(grk), 'boards KEPT while the reset cannot be verifiably published');

  srv.plex.writeSummary = realWrite;
  await T.poll();
  assert.ok(!srv.boards.has(grk), 'cleanup completes after verification');
  const payload = await Fmt.decode(srv.byTitle(rootTitle).summary);
  assert.ok(payload.rst.some((r) => r[0] === '2314' && r[1] === rstTs), 'the reset row rides OUR verified shards before the only other copy was destroyed');
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
