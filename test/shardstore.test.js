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
  };
  const plex = {
    createBoard: async (title) => {
      if (state.failCreate) return null;
      for (const [rk, b] of boards) if (b.title === title) return rk;   // Plex titles are findable; never dup
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
    listBoards: async () => Array.from(boards, ([ratingKey, b]) => ({ ratingKey, title: b.title, summary: b.summary })),
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
