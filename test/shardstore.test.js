// Tests for js/shardstore.js — the crash-safe hash-prefix shard store.
//
// The budget is INJECTED at 350 bytes so ordinary fixtures split RECURSIVELY on
// every run — the rarest production path (a split fires maybe once every few
// years per user) is the most-exercised path here, running the SAME code that
// ships at 8KB (PLAN-durable-progress.md §8). The fake server can return HTTP
// 200 while silently discarding a write — the REAL measured Plex failure mode
// (§3.4) — plus crashes at chosen protocol steps and byte corruption.
const { test } = require('node:test');
const assert = require('node:assert');
const Fmt = require('../js/progressfmt.js');
const createShardStore = require('../js/shardstore.js');

// ---- fake Plex playlist server with fault injection ---------------------------
function fakeServer() {
  const boards = new Map();          // rk → { title, summary }
  let nextRk = 1000;
  const state = {
    discardWrites: false,            // §3.4: return 200, store nothing
    failCreate: false,
    crashWhen: null,                 // (title, text) => boolean — throw before applying
    omitFromListing: new Set(),      // rks a transiently-incomplete listing drops
  };
  const plex = {
    // PRODUCTION-FAITHFUL: Plex createPlaylist creates unconditionally — it does
    // NOT dedupe by title. (An earlier fake did, which made the duplicate-board
    // failure impossible to reproduce — the stub guaranteed behaviour the real
    // dependency doesn't. The store's persisted rating-key hints are what must
    // prevent duplicates.)
    createBoard: async (title) => {
      if (state.failCreate) return null;
      const rk = 'rk' + nextRk++;
      boards.set(rk, { title, summary: '' });
      return rk;
    },
    writeSummary: async (rk, text) => {
      const b = boards.get(rk);
      if (state.crashWhen && state.crashWhen((b && b.title) || '?', text)) throw new Error('CRASH (injected)');
      if (!b) return 404;
      if (state.discardWrites) return 200;                              // the silent-discard mode
      b.summary = text;
      return 200;
    },
    readSummary: async (rk) => (boards.has(rk) ? boards.get(rk).summary : null),
    listBoards: async () => Array.from(boards, ([ratingKey, b]) => ({ ratingKey, title: b.title, summary: b.summary }))
      .filter((b) => !state.omitFromListing.has(b.ratingKey)),
  };
  const byTitle = (title) => { for (const [rk, b] of boards) if (b.title === title) return { rk, ...b }; return null; };
  return { boards, state, plex, byTitle };
}

const DEV = 'devaaaa1';
function makeStore(fake, over = {}) {
  return createShardStore(Object.assign({
    deviceId: DEV,
    maxRequestBytes: 350,
    requestOverhead: () => 0,
    encode: Fmt.encode,
    decode: Fmt.decode,
    plex: fake.plex,
    retryBaseMs: 0,                  // tests drive retries via flush()
    log: () => {},
  }, over));
}

// Realistic varied book ids (the live library uses 4-digit ratingKeys).
const BOOKS = (() => { const a = []; let rk = 811; for (let i = 0; i < 200; i++) { rk += 7 + ((rk * 131) % 89); a.push(String(rk)); } return a; })();
const entry = (book, ts, origin = 'pbpwa-me01', name = 'iPhone') =>
  ({ book: String(book), bk: { t: 't' + book, o: 1000 + (ts % 977), cum: 5000, tot: 999000, ts, origin, name } });
const tomb = (book, ts, origin = 'pbpwa-me01') => ({ book: String(book), rst: ts, rstOrigin: origin });
const T0 = 1_752_700_000_000;

const bkKey = (e) => `${e.book}|${e.bk ? [e.bk.t, e.bk.o, e.bk.ts, e.bk.origin, e.bk.name].join(',') : ''}|${e.rst || ''}|${e.rstOrigin || ''}`;
function assertSameEntries(actual, expected, msg) {
  assert.deepEqual(actual.map(bkKey).sort(), expected.map(bkKey).sort(), msg);
}

// ---- duplicate boards claiming one prefix --------------------------------------
// Plex does NOT dedupe playlist titles (the fake models that deliberately). A create
// whose RESPONSE was lost leaves a playlist we hold no ratingKey for, so the retry
// makes a second with the same title. Both the writer's listing and the reader's
// listing used `Map.set(prefix, …)`, i.e. LAST ONE WINS, silently — and those are
// two separate listings, so writer and reader could pick DIFFERENT twins and the
// choice could flip between polls: a resume point moving back and forth with no
// pattern while every device reports `verified`. The tie must break the same way
// everywhere, and it must be visible.
//
// MUTATION: revert either Map.set to plain last-wins → RED.
test('duplicate boards for one prefix resolve DETERMINISTICALLY, not by listing order', async () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  store.ensurePublished([entry(BOOKS[0], T0)], {});
  await store.flush();
  const root = fake.byTitle(`pb_prog2_${DEV}_p`);
  assert.ok(root, 'precondition: the root board exists');

  // The abandoned twin: same title, older ratingKey, stale content.
  const stale = 'rk1';                                   // lower than any minted rk (nextRk starts at 1000)
  fake.boards.set(stale, { title: root.title, summary: root.summary });
  const logged = [];
  const reader = makeStore(fake, { deviceId: DEV, log: (t, m) => logged.push(m) });

  const a = await reader.readAll();
  const b = await reader.readAll();
  assert.deepEqual(a.entries.map(bkKey).sort(), b.entries.map(bkKey).sort(),
    'two reads of the same duplicated set agree');
  assert.ok(logged.some((m) => /DUPLICATE board/.test(m)),
    'and the duplication is REPORTED — it is otherwise invisible in diagnostics');
});

// NOT TESTED, deliberately: WHICH twin wins. I wrote that test and it was inert —
// flipping pickTwin flips the writer and every reader together, so they still agree
// and nothing observable changes. Consistency is the load-bearing property and the
// test above pins it; "newer" is a defensible arbitrary choice, not a behaviour.
// Recording this so the gap reads as a decision rather than an oversight.

// ---- basics -------------------------------------------------------------------
test('publish + readAll round-trip without splits (budget not hit)', async () => {
  const fake = fakeServer();
  const store = makeStore(fake, { maxRequestBytes: 8000 });
  const snap = [entry(BOOKS[0], T0), entry(BOOKS[1], T0 + 1), tomb(BOOKS[2], T0 + 2)];
  store.ensurePublished(snap);
  await store.flush();
  assert.equal(store.syncState().unsynced, false);
  assert.equal(fake.boards.size, 1, 'one root shard');
  const r = await store.readAll();
  assert.deepEqual(r.degraded, []);
  assertSameEntries(r.entries, snap);
});

test('replication is IMMUTABLE: foreign origin, name and ts survive byte-for-byte', async () => {
  const fake = fakeServer();
  const store = makeStore(fake, { maxRequestBytes: 8000 });
  const foreign = entry(BOOKS[3], T0 - 9_999_999, 'pbpwa-dead-device', 'Old iPhone');
  store.ensurePublished([foreign, entry(BOOKS[0], T0)]);
  await store.flush();
  const r = await store.readAll();
  const got = r.entries.find((e) => e.book === BOOKS[3]);
  assert.deepEqual(got.bk, foreign.bk, 'no re-stamping: original ts + originDeviceId intact');
});

// ---- recursive splits at a 350-byte budget --------------------------------------
test('40 books at 350 bytes: recursive splits, every leaf under budget, nothing lost', async () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  const snap = BOOKS.slice(0, 40).map((b, i) => entry(b, T0 + i));
  store.ensurePublished(snap);
  await store.flush();
  assert.equal(store.syncState().unsynced, false, store.syncState().lastError || '');

  let redirects = 0, deepRedirect = false, dataShards = 0;
  for (const [, b] of fake.boards) {
    const p = await Fmt.decode(b.summary);
    if (Array.isArray(p.redirect)) { redirects++; if (p.prefix.length >= 1) deepRedirect = true; }
    else { dataShards++; assert.ok(b.summary.length <= 350, `leaf ${p.prefix} within budget (${b.summary.length})`); }
  }
  assert.ok(redirects >= 2, `splits happened (${redirects} redirects)`);
  assert.ok(deepRedirect, 'and recursively (a child itself split)');
  assert.ok(dataShards >= 3);

  const r = await store.readAll();
  assert.deepEqual(r.degraded, []);
  assertSameEntries(r.entries, snap, 'no bk lost across the shard tree');
});

test('incremental update rewrites only the affected path; content converges', async () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  const snap = BOOKS.slice(0, 30).map((b, i) => entry(b, T0 + i));
  store.ensurePublished(snap);
  await store.flush();
  const before = new Map(Array.from(fake.boards, ([rk, b]) => [rk, b.summary]));

  const snap2 = snap.slice();
  snap2[7] = entry(snap[7].book, T0 + 999_000);           // one book moved forward
  store.ensurePublished(snap2);
  await store.flush();

  let changed = 0;
  for (const [rk, b] of fake.boards) if (before.get(rk) !== b.summary) changed++;
  assert.ok(changed >= 1 && changed <= 2, `only the owning leaf rewrote (changed=${changed})`);
  assertSameEntries((await store.readAll()).entries, snap2);
});

// ---- the measured Plex failure mode: HTTP 200, write silently discarded ---------
test('200-but-discarded writes are CAUGHT by read-back; old data stays authoritative; heals on retry', async () => {
  const fake = fakeServer();
  const store = makeStore(fake, { maxRequestBytes: 8000 });
  const v1 = [entry(BOOKS[0], T0)];
  store.ensurePublished(v1);
  await store.flush();

  fake.state.discardWrites = true;
  const v2 = [entry(BOOKS[0], T0 + 5000), entry(BOOKS[1], T0 + 6000)];
  store.ensurePublished(v2);
  await store.flush();
  const st = store.syncState();
  assert.equal(st.unsynced, true, 'never marked synced on a 200');
  assert.match(String(st.lastError), /MISMATCH|verify/i);
  assertSameEntries((await store.readAll()).entries, v1, 'server still serves the old verified content — never empty');

  fake.state.discardWrites = false;
  await store.flush();
  assert.equal(store.syncState().unsynced, false);
  assertSameEntries((await store.readAll()).entries, v2, 'the queued snapshot landed after healing');
});

// ---- interrupted splits ----------------------------------------------------------
test('crash BEFORE the redirect commit: parent (old data) stays authoritative; retry splits under a NEW splitId', async () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  const small = BOOKS.slice(0, 3).map((b, i) => entry(b, T0 + i));
  store.ensurePublished(small);
  await store.flush();
  assert.equal(fake.boards.size, 1, 'root data shard exists');

  // Arm: crash exactly when the ROOT is being rewritten as a redirect (the commit).
  fake.state.crashWhen = (title, text) => title === `pb_prog2_${DEV}_p` && text.length && /TR2/.test(text) && textIsRedirect(text);
  const bulk = BOOKS.slice(0, 30).map((b, i) => entry(b, T0 + 100 + i));
  store.ensurePublished(bulk);
  await store.flush();
  assert.equal(store.syncState().unsynced, true, 'pass failed at the commit');

  // A reader now: root still holds RECORDS → authoritative; children are debris.
  const debris = [];
  for (const [, b] of fake.boards) { const p = await Fmt.decode(b.summary); if (p.parent === '') debris.push(p.splitId); }
  assert.ok(debris.length >= 2, 'both children were written before the crash');
  const oldSplitId = debris[0];
  const r1 = await store.readAll();
  assertSameEntries(r1.entries, small, 'pre-split content still served, debris ignored, nothing empty');

  // Heal → the interrupted split restarts FROM THE PARENT under a fresh splitId.
  fake.state.crashWhen = null;
  await store.flush();
  assert.equal(store.syncState().unsynced, false);
  const root = fake.byTitle(`pb_prog2_${DEV}_p`);
  const rootPayload = await Fmt.decode(root.summary);
  assert.ok(Array.isArray(rootPayload.redirect), 'commit landed on retry');
  assert.notEqual(rootPayload.redirectId, oldSplitId, 'a NEW splitId — stale debris can never pair with fresh children');
  for (const child of ['0', '1']) {
    const c = await Fmt.decode(fake.byTitle(`pb_prog2_${DEV}_p${child}`).summary);
    assert.equal(c.splitId, rootPayload.redirectId, 'children bound to the committed transaction');
  }
  assertSameEntries((await store.readAll()).entries, bulk, 'full snapshot readable after recovery');
});

function textIsRedirect(text) {
  // The commit write is the only root write whose payload carries `redirect`.
  // Decode synchronously is impossible here; TR2u fallback isn't used in tests,
  // so sniff via a decode cache filled lazily below.
  return textIsRedirect.cache.get(text) === true;
}
textIsRedirect.cache = new Map();
// Pre-hook: wrap Fmt.encode so every encoded text is classified at creation time.
const realEncode = Fmt.encode;
Fmt.encode = async (payload) => {
  const enc = await realEncode(payload);
  textIsRedirect.cache.set(enc, Array.isArray(payload.redirect));
  return enc;
};

test('crash AFTER the redirect commit: children are live; relaunch continues cleanly', async () => {
  const fake = fakeServer();
  let store = makeStore(fake);
  const small = BOOKS.slice(0, 3).map((b, i) => entry(b, T0 + i));
  store.ensurePublished(small);
  await store.flush();

  // Crash on the FIRST data write AFTER a redirect exists on the server (i.e. the
  // post-commit re-descent into a child).
  fake.state.crashWhen = (title, text) => {
    if (textIsRedirect.cache.get(text)) return false;
    for (const [, b] of fake.boards) if (textIsRedirect.cache.get(b.summary)) return true;
    return false;
  };
  const bulk = BOOKS.slice(0, 60).map((b, i) => entry(b, T0 + 100 + i));
  store.ensurePublished(bulk);
  await store.flush();
  assert.equal(store.syncState().unsynced, true, 'the injected crash fired post-commit');

  // RELAUNCH (new instance over the same server) — models an app restart.
  fake.state.crashWhen = null;
  store = makeStore(fake);
  store.ensurePublished(bulk);
  await store.flush();
  assert.equal(store.syncState().unsynced, false);
  assertSameEntries((await store.readAll()).entries, bulk, 'no record lost across the crash + relaunch');
});

// ---- corruption ------------------------------------------------------------------
test('corrupt child → degraded subtree, NEVER an empty shard; owner self-heals from local truth', async () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  const snap = BOOKS.slice(0, 30).map((b, i) => entry(b, T0 + i));
  store.ensurePublished(snap);
  await store.flush();

  // Corrupt one data child in place.
  let victim = null;
  for (const [rk, b] of fake.boards) {
    const p = await Fmt.decode(b.summary);
    if (!Array.isArray(p.redirect) && p.parent != null && p.bk.length > 0) { victim = { rk, prefix: p.prefix }; break; }
  }
  assert.ok(victim, 'a non-empty data child exists to corrupt');
  fake.boards.get(victim.rk).summary = 'TR2.' + 'AAAA' + fake.boards.get(victim.rk).summary.slice(9);

  const reader = makeStore(fake, { deviceId: 'devbbbb2' });   // a DIFFERENT device reading
  const r = await reader.readAll();
  assert.ok(r.degraded.length >= 1, 'corruption is SURFACED');
  assert.ok(r.degraded.some((d) => d.dev === DEV), 'and attributed to the right device');
  assert.ok(r.entries.length > 0, 'authoritative siblings still readable');
  assert.ok(r.entries.length < snap.length, 'the corrupt subtree contributed nothing (not read as empty)');

  // The OWNER re-publishes from local truth → the corrupt child is rewritten.
  const owner2 = makeStore(fake);                             // relaunch of the owning device
  owner2.ensurePublished(snap);
  await owner2.flush();
  assert.equal(owner2.syncState().unsynced, false);
  const healed = await reader.readAll();
  assert.deepEqual(healed.degraded, []);
  assertSameEntries(healed.entries, snap, 'self-healed from the local store');
});

test('a payload/title mismatch is rejected as degraded (never data)', async () => {
  const fake = fakeServer();
  // Hand-craft a board whose title says prefix 0 but whose payload says prefix 1.
  const bogus = await Fmt.encode({ v: 2, dev: 'devcccc3', prefix: '1', origins: [], names: [], bk: [], rst: [] });
  fake.boards.set('rkX', { title: 'pb_prog2_devcccc3_p0', summary: bogus });
  const reader = makeStore(fake);
  const r = await reader.readAll();
  assert.ok(r.degraded.some((d) => d.dev === 'devcccc3'), 'mismatch surfaced as degraded');
  assert.equal(r.entries.length, 0);
});

// ---- serialization: a newer snapshot can never be clobbered by an older one -------
test('back-to-back snapshots: the newest pending snapshot wins (no self-clobber)', async () => {
  const fake = fakeServer();
  const store = makeStore(fake, { maxRequestBytes: 8000 });
  store.ensurePublished([entry(BOOKS[0], T0)]);               // pass A starts
  store.ensurePublished([entry(BOOKS[0], T0 + 1000)]);        // B queued while A in flight
  store.ensurePublished([entry(BOOKS[0], T0 + 2000)]);        // C replaces B in the queue
  await store.flush();
  const r = await store.readAll();
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].bk.ts, T0 + 2000, 'final server state is the NEWEST snapshot');
});

test('a tombstone arriving during a split lands in the correct child after the commit', async () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  const bulk = BOOKS.slice(0, 30).map((b, i) => entry(b, T0 + i));
  store.ensurePublished(bulk);                                 // splits will be in flight
  const withTomb = bulk.slice();
  withTomb[4] = tomb(bulk[4].book, T0 + 777_000);              // reset arrives mid-split
  store.ensurePublished(withTomb);                             // queued behind the pass
  await store.flush();
  await store.flush();                                         // settle any queued snapshot
  const r = await store.readAll();
  const got = r.entries.find((e) => e.book === bulk[4].book);
  assert.ok(got && got.rst === T0 + 777_000 && !got.bk, 'tombstone present, position gone');
  assertSameEntries(r.entries, withTomb);
});

// ---- property test vs a reference model --------------------------------------------
test('property: random records/resets/faults — server always converges to the last snapshot; no bk ever lost or resurrected', async () => {
  // Seeded PRNG for reproducibility.
  let s = 0xC0FFEE;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };

  const fake = fakeServer();
  const store = makeStore(fake);            // 350-byte budget → splits constantly
  const model = new Map();                  // book → entry (the reference)
  let ts = T0;

  for (let round = 0; round < 25; round++) {
    // Mutate 1–6 books.
    const n = 1 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      const book = BOOKS[Math.floor(rnd() * 60)];
      ts += 1000 + Math.floor(rnd() * 5000);
      if (rnd() < 0.15) model.set(book, tomb(book, ts));
      // One name per origin — a real device has exactly one; the wire format's
      // per-origin name table is display-only and not part of the merge invariant.
      else model.set(book, rnd() < 0.2 ? entry(book, ts, 'pbpwa-peer7', 'Pixel') : entry(book, ts, 'pbpwa-me01', 'iPhone'));
    }
    // Occasionally a fault for this round.
    const fault = rnd();
    if (fault < 0.15) fake.state.discardWrites = true;
    else if (fault < 0.3) { let armed = true; fake.state.crashWhen = () => { if (armed && rnd() < 0.3) { armed = false; return true; } return false; }; }

    store.ensurePublished(Array.from(model.values()));
    await store.flush();

    // Heal and settle.
    fake.state.discardWrites = false; fake.state.crashWhen = null;
    for (let k = 0; k < 6 && store.syncState().unsynced; k++) await store.flush();
    assert.equal(store.syncState().unsynced, false, `round ${round}: settled (${store.syncState().lastError || ''})`);

    const r = await store.readAll();
    assert.deepEqual(r.degraded, [], `round ${round}: no degraded subtree after healing`);
    assertSameEntries(r.entries, Array.from(model.values()), `round ${round}: server == model`);
  }
  // Every book ever touched is represented (position or tombstone) — none lost.
  const final = await store.readAll();
  assert.equal(final.entries.length, model.size);
});

// ---- review findings (.122 external review) — the store must never guess ----------
test('ORPHAN CHILDREN ARE NEVER AUTHORITATIVE: a matching pair without the parent redirect is degraded, not data', async () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  const small = BOOKS.slice(0, 3).map((b, i) => entry(b, T0 + i));
  store.ensurePublished(small);
  await store.flush();

  // Split attempt: children written+verified, CRASH before the parent redirect.
  fake.state.crashWhen = (title, text) => title === `pb_prog2_${DEV}_p` && textIsRedirect.cache.get(text);
  const bulk = BOOKS.slice(0, 30).map((b, i) => entry(b, T0 + 100 + i));
  store.ensurePublished(bulk);
  await store.flush();
  fake.state.crashWhen = null;

  // The parent (still data) then receives NEWER records… and later VANISHES
  // (manual deletion / listing loss). The stale-but-consistent orphan pair must
  // NOT be promoted to authoritative — that silently loses the newer records.
  let rootRk = null;
  for (const [rk, b] of fake.boards) if (b.title === `pb_prog2_${DEV}_p`) rootRk = rk;
  fake.boards.delete(rootRk);

  const reader = makeStore(fake, { deviceId: 'devreader' });
  const r = await reader.readAll();
  assert.ok(r.degraded.some((d) => d.dev === DEV && d.prefix === ''), 'missing commit redirect → degraded');
  assert.equal(r.entries.length, 0, 'the uncommitted children contributed NOTHING (a splitId proves pairing, not commit)');
});

test('CREATE-THEN-FAIL leaves ownership persisted: a retry under an incomplete listing reuses the board, never duplicates', async () => {
  const fake = fakeServer();
  const keyStore = {};
  const store = makeStore(fake, {
    maxRequestBytes: 8000,
    keys: { load: () => keyStore.v || {}, save: (o) => { keyStore.v = o; } },
  });

  // First-ever publish: the create succeeds, the summary write fails.
  let failNextWrite = true;
  const realWrite = fake.plex.writeSummary;
  fake.plex.writeSummary = async (rk, text) => { if (failNextWrite) { failNextWrite = false; throw new Error('relay blip'); } return realWrite(rk, text); };
  store.ensurePublished([entry(BOOKS[0], T0)]);
  await store.flush();
  assert.equal(fake.boards.size, 1, 'the board WAS created before the failure');
  const [origRk] = fake.boards.keys();

  // Retry pass under a listing that transiently OMITS the new board.
  fake.state.omitFromListing.add(origRk);
  await store.flush();
  fake.state.omitFromListing.clear();
  await store.flush();

  assert.equal(store.syncState().unsynced, false);
  assert.equal(fake.boards.size, 1, 'no duplicate board — the persisted hint reused the original ratingKey');
  assert.equal((await store.readAll()).entries.length, 1);
});

test('a STALE persisted ratingKey hint self-heals on 404 instead of looping forever', async () => {
  const fake = fakeServer();
  const keyStore = { v: { '': 'rkDEAD' } };            // hint points at a playlist that no longer exists
  const store = makeStore(fake, {
    maxRequestBytes: 8000,
    keys: { load: () => keyStore.v || {}, save: (o) => { keyStore.v = o; } },
  });
  store.ensurePublished([entry(BOOKS[0], T0)]);
  await store.flush();                                  // pass 1: 404 on the dead hint
  await store.flush();                                  // pass 2: must NOT retry rkDEAD again
  assert.equal(store.syncState().unsynced, false, store.syncState().lastError || '');
  assert.equal(fake.boards.size, 1, 'a replacement board was created');
  assert.notEqual(keyStore.v[''], 'rkDEAD', 'the stale hint was PERSISTENTLY dropped/replaced');
  assert.equal((await store.readAll()).entries.length, 1);
});

test('a purge in UNCOMMITTED split debris is never harvested — destructive authority follows the tree, not the scan', async () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  // Authoritative root WITHOUT any purge.
  const small = BOOKS.slice(0, 3).map((b, i) => entry(b, T0 + i));
  store.ensurePublished(small, {});
  await store.flush();

  // A delete triggers a purge; the grown snapshot overflows → split children are
  // written (carrying the purge) and the redirect write CRASHES: the transaction
  // never commits and the caller refuses the deletion.
  fake.state.crashWhen = (title, text) => title === `pb_prog2_${DEV}_p` && textIsRedirect.cache.get(text);
  const bulk = BOOKS.slice(0, 30).map((b, i) => entry(b, T0 + 100 + i));
  store.ensurePublished(bulk, { 'pbpwa-victim-B': T0 + 999 });
  await store.flush();
  fake.state.crashWhen = null;
  assert.equal(store.syncState().unsynced, true, 'the pass failed at the commit');

  // Case 1: parent (pre-purge data) still present and authoritative.
  const reader = makeStore(fake, { deviceId: 'devreader' });
  const r1 = await reader.readAll();
  assert.equal(r1.purges['pbpwa-victim-B'], undefined, 'debris children contribute NO purge while the parent holds data');
  assertSameEntries(r1.entries, small, 'parent data still served');

  // Case 2: parent later vanishes → subtree degraded; still no purge, no entries.
  let rootRk = null;
  for (const [rk, b] of fake.boards) if (b.title === `pb_prog2_${DEV}_p`) rootRk = rk;
  fake.boards.delete(rootRk);
  const r2 = await reader.readAll();
  assert.ok(r2.degraded.some((d) => d.dev === DEV), 'degraded subtree');
  assert.equal(r2.entries.length, 0);
  assert.equal(r2.purges['pbpwa-victim-B'], undefined, 'an orphan pair contributes neither records NOR purges');
});

test('identity purges ride the verified payloads and round-trip through readAll (max-ts merge)', async () => {
  const fake = fakeServer();
  const store = makeStore(fake, { maxRequestBytes: 8000 });
  store.ensurePublished([entry(BOOKS[0], T0)], { 'pbpwa-dead-1': T0 + 500 });
  await store.flush();
  assert.equal(store.syncState().unsynced, false);
  const r = await store.readAll();
  assert.equal(r.purges['pbpwa-dead-1'], T0 + 500, 'purge readable by every device from the shard channel');
  // A second writer with an OLDER purge of the same identity: readers keep the max.
  const other = makeStore(fake, { deviceId: 'devbbbb2', maxRequestBytes: 8000 });
  other.ensurePublished([entry(BOOKS[1], T0, 'pbpwa-b', 'Pixel')], { 'pbpwa-dead-1': T0 + 100 });
  await other.flush();
  const r2 = await store.readAll();
  assert.equal(r2.purges['pbpwa-dead-1'], T0 + 500, 'max timestamp wins across writers');
});

// ---- routing hash -------------------------------------------------------------------
test('hashBits: stable, 32 binary chars, spreads realistic ids across both root children', () => {
  const fake = fakeServer();
  const store = makeStore(fake);
  const bits = store._test.hashBits('8913');
  assert.match(bits, /^[01]{32}$/);
  assert.equal(bits, store._test.hashBits('8913'), 'deterministic');
  const zeros = BOOKS.filter((b) => store._test.hashBits(b)[0] === '0').length;
  assert.ok(zeros > BOOKS.length * 0.25 && zeros < BOOKS.length * 0.75, `not degenerate (${zeros}/${BOOKS.length})`);
});
