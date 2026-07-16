// Tests for the online-playback regression fixes in js/plex.js:
//   * connect() serialization — concurrent callers share ONE probe pass (the fix
//     for the 16s AbortError thrash when Net's poller + playback both connect).
//   * ping() must NOT null `base` — a probe wiping the live connection broke the
//     next playback (AUD_ERR code=4).
//   * curBase() — falls back to the persisted last-good host so cover/stream URLs
//     resolve even when `base` is momentarily unset.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

function memLS() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
}
global.localStorage = memLS();
global.window = {};                        // dbg() guards on window.PBDebug (undefined → no-op)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const Plex = require('../js/plex.js');
const T = Plex._test;

beforeEach(() => { T.resetConn(); global.localStorage.clear(); global.localStorage.setItem('pb_token', 'tok'); });

test('resetConn is PUBLIC (net.js reset-on-reconnect + stream-retry re-probe depend on it)', () => {
  // Regression guard: resetConn was once test-only, so net.js's `Plex.resetConn &&`
  // guard silently no-op'd and the reset-on-network-change never fired. It MUST stay
  // on the public API. Calling it clears the cached base so the next connect re-probes.
  assert.equal(typeof Plex.resetConn, 'function', 'resetConn must be public, not _test-only');
  T.setBase('http://cur');
  Plex.resetConn();
  global.localStorage.setItem('pb_lastBase', 'http://last');
  assert.equal(T.curBase(), 'http://last', 'after resetConn the live base is cleared (falls back to last-good)');
});

test('curBase() prefers the live base, else the persisted last-good host', () => {
  T.resetConn();
  global.localStorage.setItem('pb_lastBase', 'http://last');
  assert.equal(T.curBase(), 'http://last');
  T.setBase('http://cur');
  assert.equal(T.curBase(), 'http://cur');
});

test('ping() returns false but does NOT null base when the probe fails (rejects)', async () => {
  T.setBase('http://live');
  global.fetch = async () => { throw new Error('network down'); };
  const ok = await Plex.ping();
  assert.equal(ok, false);
  assert.equal(Plex.getBase(), 'http://live', 'base survived the failed probe');
});

test('ping() returns false but keeps base when the probe returns !ok', async () => {
  T.setBase('http://live');
  global.fetch = async () => ({ ok: false, status: 500 });
  assert.equal(await Plex.ping(), false);
  assert.equal(Plex.getBase(), 'http://live');
});

test('ping() returns true when identity answers ok', async () => {
  T.setBase('http://live');
  global.fetch = async () => ({ ok: true, status: 200 });
  assert.equal(await Plex.ping(), true);
  assert.equal(Plex.getBase(), 'http://live');
});

test('a probe superseded by resetConn() cannot overwrite a fresh connection, nor clear its finalizer', async () => {
  // The .88 resetConn race: nulling `connecting` let a stale in-flight probe (A)
  // finish, publish its (suspect) base, and — via its finalizer — clear a NEWER
  // probe's (B) `connecting`, defeating the single-probe guard. Generation-tagging
  // must make A a no-op after a reset.
  T.resetConn();
  const deferred = () => { let resolve; const p = new Promise((r) => { resolve = r; }); return { p, resolve }; };
  const disc = [];   // one deferred per /api/v2/resources call, resolved by the test
  global.fetch = async (url) => {
    url = String(url);
    if (url.includes('/api/v2/resources')) { const d = deferred(); disc.push(d); return { ok: true, status: 200, json: async () => (await d.p) }; }
    if (url.includes('/identity')) return { ok: true, status: 200 };
    return { ok: false, status: 404 };
  };
  const server = (uri) => ([{ provides: 'server', owned: true, clientIdentifier: 'm', name: 'S', connections: [{ uri, local: true }], accessToken: 'tok' }]);

  const pA = Plex.connect();                 // attempt A parks on discovery
  await sleep(1);
  assert.equal(disc.length, 1, 'A reached discovery');

  T.resetConn();                             // network changed → supersede A
  const pB = Plex.connect();                 // attempt B must probe fresh (connecting was cleared)
  await sleep(1);
  assert.equal(disc.length, 2, 'a NEW probe (B) started after the reset');

  disc[0].resolve(server('http://A'));       // the STALE attempt resolves first
  await pA.then(() => { throw new Error('stale attempt A should reject'); }, () => {});
  assert.equal(Plex.getBase(), null, 'the superseded probe did NOT publish its base');
  assert.equal(T.isConnecting(), true, "A's finalizer did NOT clear B's in-flight connecting");

  disc[1].resolve(server('http://B'));       // the fresh attempt wins
  assert.equal(await pB, 'http://B');
  assert.equal(Plex.getBase(), 'http://B', 'the fresh connection is the one that stuck');
  assert.equal(T.isConnecting(), false, 'B cleared connecting on completion');
});

test('a stale probe finishing AFTER a fresh one overwrites no connection metadata (base/kind/name/cache)', async () => {
  // The finding-#2 race: even when the fresh probe (B) publishes first, a late stale
  // probe (A) used to mutate connKind / serverName / LS.server mid-flight. All such
  // writes must now be deferred past the generation check, so A publishes nothing.
  T.resetConn();
  const deferred = () => { let resolve; const p = new Promise((r) => { resolve = r; }); return { p, resolve }; };
  const disc = [];
  global.fetch = async (url) => {
    url = String(url);
    if (url.includes('/api/v2/resources')) { const d = deferred(); disc.push(d); return { ok: true, status: 200, json: async () => (await d.p) }; }
    if (url.includes('/identity')) return { ok: true, status: 200 };
    return { ok: false, status: 404 };
  };
  const server = (uri, name, flag) => ([{ provides: 'server', owned: true, clientIdentifier: 'm-' + name, name, connections: [{ uri, ...flag }], accessToken: 'tok' }]);

  const pA = Plex.connect();
  await sleep(1);
  T.resetConn();
  const pB = Plex.connect();
  await sleep(1);
  assert.equal(disc.length, 2, 'two probes in flight');

  // B (fresh) resolves FIRST and publishes everything.
  disc[1].resolve(server('http://B', 'ServerB', { local: true }));
  assert.equal(await pB, 'http://B');
  assert.equal(Plex.getConnKind(), 'local');
  assert.equal(Plex.getServerName(), 'ServerB');
  assert.equal(JSON.parse(localStorage.getItem('pb_server')).name, 'ServerB');
  assert.equal(localStorage.getItem('pb_connKind'), 'local');

  // A (stale, relay, different name) resolves AFTER — it must change nothing.
  disc[0].resolve(server('http://A', 'ServerA', { relay: true }));
  await pA.then(() => { throw new Error('stale A should reject'); }, () => {});
  assert.equal(Plex.getBase(), 'http://B', 'base unchanged');
  assert.equal(Plex.getConnKind(), 'local', 'connKind not clobbered by the stale relay probe');
  assert.equal(Plex.getServerName(), 'ServerB', 'serverName not clobbered');
  assert.equal(JSON.parse(localStorage.getItem('pb_server')).name, 'ServerB', 'cached connection list not clobbered');
  assert.equal(localStorage.getItem('pb_connKind'), 'local', 'persisted connKind not clobbered');
});

test('signOut() invalidates an in-flight probe so it cannot publish into the next session', async () => {
  T.resetConn();
  const deferred = () => { let resolve; const p = new Promise((r) => { resolve = r; }); return { p, resolve }; };
  const disc = [];
  global.fetch = async (url) => {
    url = String(url);
    if (url.includes('/api/v2/resources')) { const d = deferred(); disc.push(d); return { ok: true, status: 200, json: async () => (await d.p) }; }
    if (url.includes('/identity')) return { ok: true, status: 200 };
    return { ok: false, status: 404 };
  };
  const pA = Plex.connect();   // probe parks on discovery
  await sleep(1);
  Plex.signOut();              // sign-out (or a 401) mid-probe must invalidate it
  disc[0].resolve([{ provides: 'server', owned: true, clientIdentifier: 'm', name: 'Old', connections: [{ uri: 'http://old', local: true }], accessToken: 'tok' }]);
  await pA.then(() => { throw new Error('an old-session probe must not resolve into the new session'); }, () => {});
  assert.equal(Plex.getBase(), null, 'the signed-out session did not adopt the stale probe base');
  assert.equal(localStorage.getItem('pb_server'), null, 'no server metadata was republished after sign-out');
});

test('a failed rediscovery replaces the proven-dead cached list (no re-probing obsolete endpoints)', async () => {
  T.resetConn();
  localStorage.setItem('pb_server', JSON.stringify({ name: 'Old', machineId: 'm', connections: [{ uri: 'http://dead', local: true }] }));
  global.fetch = async (url) => {
    url = String(url);
    if (url.includes('/api/v2/resources')) return { ok: true, status: 200, json: async () => ([{ provides: 'server', owned: true, clientIdentifier: 'm2', name: 'Fresh', connections: [{ uri: 'http://fresh', relay: true }], accessToken: 'tok' }]) };
    if (url.includes('/identity')) return { ok: false, status: 503 };   // every probe (dead AND fresh) fails right now
    return { ok: false, status: 404 };
  };
  await Plex.connect().then(() => { throw new Error('connect should reject when nothing is reachable'); }, () => {});
  const cached = JSON.parse(localStorage.getItem('pb_server'));
  assert.equal(cached.connections[0].uri, 'http://fresh', 'the dead saved list was replaced by the freshly discovered one');
  assert.equal(cached.name, 'Fresh', 'cached server metadata refreshed even though the probe failed');
});

test('concurrent connect() calls share ONE discovery pass', async () => {
  T.resetConn();
  let resourceCalls = 0;
  global.fetch = async (url) => {
    url = String(url);
    if (url.includes('/api/v2/resources')) {
      resourceCalls++;
      await sleep(20);                     // hold the probe open so both callers overlap
      return { ok: true, status: 200, json: async () => ([{
        provides: 'server', owned: true, clientIdentifier: 'm', name: 'S',
        connections: [{ uri: 'http://local', local: true }], accessToken: 'tok',
      }]) };
    }
    if (url.includes('/identity')) return { ok: true, status: 200 };
    return { ok: false, status: 404 };
  };
  const [a, b] = await Promise.all([Plex.connect(), Plex.connect()]);
  assert.equal(a, 'http://local');
  assert.equal(b, 'http://local');
  assert.equal(resourceCalls, 1, 'discovery ran once for two concurrent connects');
  assert.equal(Plex.getBase(), 'http://local');
});

test('connect() returns the cached base immediately once set (no re-probe)', async () => {
  T.setBase('http://already');
  let calls = 0;
  global.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ([]) }; };
  assert.equal(await Plex.connect(), 'http://already');
  assert.equal(calls, 0, 'no network when base is already set');
});
