// plex.js — all Plex/plex.tv interaction for the TomeRoam PWA.
// The app talks ONLY to Plex: plex.tv for sign-in + server discovery, then the
// Plex Media Server directly for library, media, progress writes, and the
// hidden "__tomeroam_resume" playlist that carries cold-resume positions.
// No server of the user's own is involved.

const Plex = (() => {
  const PRODUCT = 'TomeRoam Player';
  const VERSION = '0.1.0';
  const PLEXTV  = 'https://plex.tv';
  const RESUME_PLAYLIST = '__tomeroam_resume';
  const PLEX_ID = 'com.plexapp.plugins.library';

  const LS = {
    clientId: 'pb_clientId',
    token:    'pb_token',
    server:   'pb_server',   // { name, machineId, connections:[{uri,local,relay}] }
    pending:  'pb_pending',  // pin id we're waiting to redeem after redirect
    connKind: 'pb_connKind', // last path that worked: 'local' | 'relay' | 'remote'
  };

  // Stable per-install client identifier (Plex ties auth + sessions to it).
  function clientId() {
    let id = localStorage.getItem(LS.clientId);
    if (!id) {
      id = 'pbpwa-' + crypto.randomUUID();
      localStorage.setItem(LS.clientId, id);
    }
    return id;
  }

  function plexHeaders(extra = {}) {
    return {
      'Accept': 'application/json',
      'X-Plex-Product': PRODUCT,
      'X-Plex-Version': VERSION,
      'X-Plex-Client-Identifier': clientId(),
      'X-Plex-Platform': 'Web',
      'X-Plex-Device-Name': PRODUCT,
      ...extra,
    };
  }

  // Diagnostics: failures always logged; successes too while Live debug is on.
  const dbg  = (tag, m) => { if (window.PBDebug) PBDebug.log(tag, m); };
  const dbgv = (tag, m) => { if (window.PBDebug && PBDebug.verbose()) PBDebug.log(tag, m); };
  const shortUrl = (u) => String(u || '').replace(/X-Plex-Token=[^&]*/i, 'tok=…').replace(/^https?:\/\/[^/]+/i, '').slice(0, 120);

  const token   = () => localStorage.getItem(LS.token);
  const isSignedIn = () => !!token();
  let base = null;            // chosen live PMS base URL for this session
  let serverName = null;
  let connKind = null;        // 'local' | 'remote' | 'relay'
  let serverOffset = 0;       // (server clock - local clock) ms, from the Date header

  function signOut() {
    localStorage.removeItem(LS.token);
    localStorage.removeItem(LS.server);
    localStorage.removeItem('pb_section');
    localStorage.removeItem(LS.connKind);
    localStorage.removeItem('pb_lastBase');
    base = null; serverName = null; sectionKey = null; booksCache = null;
    // Invalidate connection work too (same as resetConn): a probe started under the
    // OLD session must not pass the generation check afterward and republish base/
    // serverName/pb_server into a fresh sign-in. signOut() is also called on a 401
    // (not only via the UI sign-out), so the invalidation belongs HERE, not in the
    // app's doSignOut.
    connecting = null; connGen++;
  }

  // --- sign-in: plex.tv PIN flow, SEPARATE-TAB style ------------------------
  // Creates a pin and returns the auth URL. The caller opens it in a new tab
  // (the app tab stays put) and then polls pollPin(id) for the token. No
  // redirect-back dependency, and 2FA gets all the time it needs.
  async function startPin() {
    const r = await fetch(`${PLEXTV}/api/v2/pins?strong=true`, {
      method: 'POST', headers: plexHeaders(),
    });
    if (!r.ok) throw new Error('Could not start Plex sign-in (' + r.status + ')');
    const pin = await r.json();
    const params = new URLSearchParams({
      clientID: clientId(),
      code: pin.code,
      'context[device][product]': PRODUCT,
    });
    return { id: pin.id, code: pin.code, authUrl: `https://app.plex.tv/auth#?${params}` };
  }

  // Poll until the user authorizes (or timeout). Stores the token on success.
  // Resilient: a transient network/plex.tv error on one tick is ignored and
  // retried rather than aborting the whole sign-in. onTick(n,total) for UI.
  async function pollPin(id, { tries = 60, intervalMs = 2000, onTick } = {}) {
    for (let i = 0; i < tries; i++) {
      if (onTick) onTick(i + 1, tries);
      try {
        const r = await fetch(`${PLEXTV}/api/v2/pins/${id}`, { headers: plexHeaders() });
        if (r.ok) {
          const pin = await r.json();
          if (pin.authToken) {
            localStorage.setItem(LS.token, pin.authToken);
            return true;
          }
        }
      } catch (e) { /* transient — keep trying */ }
      await sleep(intervalMs);
    }
    throw new Error('Sign-in timed out — please try again.');
  }

  // --- server discovery -----------------------------------------------------
  // Find the user's PMS and pick a connection that actually answers right now
  // (local at home, remote/relay when away). Caches the server list.
  async function discoverServer() {
    const r = await fetch(`${PLEXTV}/api/v2/resources?includeHttps=1&includeRelay=1`, {
      headers: plexHeaders({ 'X-Plex-Token': token() }),
    });
    if (r.status === 401) { signOut(); throw new Error('Session expired — sign in again.'); }
    if (!r.ok) throw new Error('Could not list Plex servers (' + r.status + ')');
    const resources = await r.json();
    const servers = resources.filter((d) => (d.provides || '').split(',').includes('server'));
    if (!servers.length) throw new Error('No Plex Media Server found on this account.');

    // Prefer an owned server; keep the first otherwise.
    const srv = servers.find((s) => s.owned) || servers[0];
    const conns = (srv.connections || []).slice().sort((a, b) => {
      // try local first, then direct remote, then relay
      const rank = (c) => (c.local ? 0 : c.relay ? 2 : 1);
      return rank(a) - rank(b);
    });
    // Return the discovered metadata WITHOUT publishing it — connect() commits
    // serverName / LS.server together with base AFTER the generation check, so a
    // superseded probe can't leave stale server/connection metadata behind.
    return { connections: conns, token: srv.accessToken || token(), name: srv.name, machineId: srv.clientIdentifier };
  }

  // Probe connections; first that answers /identity wins. Timeouts are
  // per-connection-TYPE: a private/local .plex.direct URI that isn't on our
  // current LAN fails (or hangs) fast, so we cap it short. Away from home the
  // route is either a direct-remote mapping (fast) or, when the client's network
  // can't reach the mapped port (e.g. CGNAT cellular), the RELAY fallback — whose
  // cold TLS handshake can take 9s+ (Plex rotates relay endpoints in a pool). We
  // can't tell which applies until we probe, so BOTH non-local kinds share the
  // long budget. We also try the last-known-good path first, so an off-home
  // launch hits the path that worked last instead of burning seconds on dead
  // local probes.
  // Kept strictly SEQUENTIAL on purpose — parallel Promise.any broke this.
  const LOCAL_TIMEOUT_MS = 3500;
  const REMOTE_TIMEOUT_MS = 12000;   // covers BOTH direct-remote and relay

  const kindOf = (c) => (c.local ? 'local' : (c.relay ? 'relay' : 'remote'));

  // Reorder so the last path that worked is probed first (network permitting).
  function orderByLastKind(conns) {
    const last = localStorage.getItem(LS.connKind);
    if (!last) return conns;
    return conns.slice().sort((a, b) => (kindOf(a) === last ? 0 : 1) - (kindOf(b) === last ? 0 : 1));
  }

  async function probeConn(uri, tkn, timeoutMs) {
    const signal = AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
    const r = await fetch(`${uri}/identity`, { headers: plexHeaders({ 'X-Plex-Token': tkn }), signal });
    return r.ok;
  }

  // One sequential pass over a connection list; returns { uri, kind } of the winner
  // or null. Does NOT write connKind/LS.connKind — connect() publishes those after
  // its generation check (a stale probe must not mutate the connection kind).
  async function tryConns(conns, tkn) {
    for (const c of orderByLastKind(conns)) {
      const timeout = c.local ? LOCAL_TIMEOUT_MS : REMOTE_TIMEOUT_MS;   // direct-remote + relay get the long budget
      const t0 = Date.now();
      try {
        if (await probeConn(c.uri, tkn, timeout)) {
          const kind = kindOf(c);
          dbg('CONN', `${kind} OK ${Date.now() - t0}ms ${new URL(c.uri).host}`);
          return { uri: c.uri, kind };
        }
        dbg('CONN', `${kindOf(c)} answered !ok ${Date.now() - t0}ms`);
      } catch (e) { dbg('CONN', `${kindOf(c)} fail ${Date.now() - t0}ms ${(e && e.name) || ''}`); }
    }
    return null;
  }

  // Serialize connect(): many callers (playback, Progress, Presence, and now the
  // Net reachability poller) can ask concurrently. Without a shared in-flight
  // promise they each launch their own probe pass, which piles up on iOS and
  // produces 16s＋ AbortError thrash (the codebase note: "connect() must stay
  // sequential"). One shared attempt fixes that.
  let connecting = null;
  // Generation counter bumped by resetConn(). A probe that started under an older
  // generation must NOT publish its result: resetConn() clears `base` precisely
  // because the endpoint it found is suspect (a rotated/dead relay), so letting a
  // late in-flight probe write that stale base back would defeat the reset — and,
  // worse, its finalizer could clear a NEWER probe's `connecting` reference and
  // break the single-probe serialization guard (the fix for the 16s AbortError
  // thrash). See resetConn().
  let connGen = 0;
  function connect() {
    if (base) return Promise.resolve(base);
    if (connecting) return connecting;
    const gen = connGen;
    const attempt = _connect().then((cand) => {
      // Superseded by a resetConn() mid-probe → don't adopt this (suspect) result;
      // reject so the caller re-probes rather than running on a stale endpoint. The
      // check is BEFORE any shared write, so a stale probe publishes nothing —
      // neither base nor connKind/serverName/cached connections.
      if (gen !== connGen) throw new Error('Plex connection superseded');
      // Refresh the cached connection list on ANY current-generation outcome —
      // INCLUDING a probe-failure that rediscovered a fresh list — so a list already
      // proven dead isn't re-probed on every future attempt (sequential 3.5/12s
      // probes add up). `cand.connections` is what we just connected through, or the
      // freshly-rediscovered list on failure.
      try { localStorage.setItem(LS.server, JSON.stringify({ name: cand.name, machineId: cand.machineId, connections: cand.connections })); } catch {}
      if (!cand.base) { dbg('CONN', 'FAIL: no connection reachable'); throw new Error('Could not reach your Plex server.'); }
      base = cand.base;
      connKind = cand.kind;
      serverName = cand.name;
      try { localStorage.setItem(LS.connKind, cand.kind); } catch {}
      // Remember the winning host so cover-art URLs resolve to the SAME origin when
      // OFFLINE (base is null then) — that origin is the SW image cache's key, so
      // previously-loaded covers keep rendering. Not used for API calls.
      try { localStorage.setItem('pb_lastBase', base); } catch {}
      return base;
    });
    // Identity-safe finalizer: clear `connecting` ONLY if it still points at THIS
    // attempt. A stale attempt settling after a reset must not null a newer probe's
    // reference (that would let a third caller start an overlapping attempt).
    const exposed = attempt.finally(() => { if (connecting === exposed) connecting = null; });
    connecting = exposed;
    return exposed;
  }
  // Returns the reachable base URL WITHOUT publishing it — connect() adopts it under
  // the generation guard so a superseded probe can't overwrite a fresh connection.
  async function _connect() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS.server) || 'null'); } catch {}
    let conns, tkn = token(), name = null, machineId = null;
    if (saved && saved.connections) { conns = saved.connections; name = saved.name; machineId = saved.machineId; }
    else { const d = await discoverServer(); conns = d.connections; tkn = d.token; name = d.name; machineId = d.machineId; }

    let hit = await tryConns(conns, tkn);
    // All dead — network changed, or a cached relay endpoint rotated out of the
    // pool. Rediscover a fresh connection list once and try again. (No removeItem
    // here: a stale probe must not mutate LS.server; connect() refreshes it — even
    // on failure — from the candidate's `connections` under the generation check.)
    if (!hit && saved) {
      dbg('CONN', 'all cached connections dead — rediscovering');
      const d = await discoverServer();
      conns = d.connections; name = d.name; machineId = d.machineId;
      hit = await tryConns(d.connections, d.token || tkn);
    }
    // A candidate — connect() publishes it after the generation check. On a probe
    // failure (base:null) `conns` is the freshly-discovered list, so connect() still
    // refreshes the cache and future attempts don't re-probe the dead saved list.
    return { base: hit ? hit.uri : null, kind: hit ? hit.kind : null, name, machineId, connections: conns };
  }
  // Base to build ART/stream URLs against even before/without a live connection
  // (offline): the last host that worked. API calls still require connect().
  const curBase = () => base || (() => { try { return localStorage.getItem('pb_lastBase') || ''; } catch { return ''; } })();

  // --- core API -------------------------------------------------------------
  // Resilient fetch for Plex calls — the relay is slow and lossy, so a single
  // hiccup must NOT hard-fail the whole load. Per-attempt timeout + exponential
  // backoff on TRANSIENT failures: network error, timeout, and 5xx (incl. relay
  // 502/503/504). A network/timeout failure means the connection itself is bad,
  // so we drop the cached `base` to force a fresh re-probe on the next attempt
  // (picks up a rotated relay endpoint). NOT retried: 401 (re-auth), other 4xx
  // (won't fix itself). `buildUrl(base)` returns the URL for the current base.
  async function plexFetch(buildUrl, init = {}, { retries = 3, timeoutMs = 15000 } = {}) {
    let attempt = 0, lastErr;
    for (;;) {
      let b;
      try { b = await connect(); }
      catch (e) { lastErr = e; }               // couldn't even get a base — back off and retry
      if (b) {
        const signal = AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
        const t0 = Date.now();
        let u = '';
        try {
          u = String(buildUrl(b));
          const r = await fetch(u, {
            ...init,
            headers: plexHeaders({ 'X-Plex-Token': token(), ...(init.headers || {}) }),
            signal,
          });
          const ms = Date.now() - t0;
          if (r.status === 401) { signOut(); throw new Error('Session expired — sign in again.'); }
          if (r.ok) {
            // Slow responses are always worth knowing about; the rest only
            // while Live debug streams (keeps the ring quiet in normal use).
            if (ms > 2000) dbg('NET_SLOW', `${r.status} ${ms}ms ${shortUrl(u)}`);
            else dbgv('NET', `${r.status} ${ms}ms ${shortUrl(u)}`);
            return r;
          }
          dbg('NET_ERR', `HTTP ${r.status} ${ms}ms ${shortUrl(u)}`);
          if (r.status < 500) throw new Error(`Plex request failed (${r.status})`);  // 4xx: don't retry
          lastErr = new Error(`Plex request failed (${r.status})`);                  // 5xx: retry, base is fine
        } catch (e) {
          if (e && /Session expired/.test(e.message)) throw e;                       // auth — stop
          if (e && /Plex request failed \(4/.test(e.message)) throw e;               // hard 4xx — stop
          dbg('NET_ERR', `${(e && e.name) || 'error'} ${Date.now() - t0}ms online=${navigator.onLine} conn=${connKind || '?'} ${shortUrl(u)}`);
          lastErr = e;
          base = null;                          // network/timeout — re-probe (relay may have moved)
        }
      }
      if (++attempt > retries) break;
      if (window.PBDebug) PBDebug.log('NET', `retry ${attempt}/${retries} ${((lastErr && lastErr.name) || '')} ${((lastErr && lastErr.message) || '')}`);
      await sleep(Math.min(500 * 2 ** (attempt - 1), 4000) + Math.floor(Math.random() * 250));
    }
    if (window.PBDebug) PBDebug.log('NET_FAIL', (lastErr && lastErr.message) || 'unreachable');
    throw lastErr || new Error('Could not reach your Plex server.');
  }

  async function api(path, { params, headers } = {}) {
    const r = await plexFetch((b) => {
      const url = new URL(b + path);
      if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      return url;
    }, { headers });
    const dh = r.headers.get('date');
    if (dh) { const s = Date.parse(dh); if (s) serverOffset = s - Date.now(); }
    const j = await r.json();
    return j.MediaContainer || {};
  }

  // --- resume store (the hidden playlist the LMS plugin maintains) ----------
  // The plugin stores compact keys to keep the blob small:
  //   {"v":1,"books":[{"b":albumRK,"t":trackRK,"o":offsetMs,"ts":epoch}, ...]}
  // We expand them to friendly names here. Returns most-recent first, or [].
  async function getResumeMap() {
    const list = await api('/playlists', { params: { playlistType: 'audio' } });
    const pl = (list.Metadata || []).find((p) => p.title === RESUME_PLAYLIST);
    if (!pl) return [];
    const one = await api(`/playlists/${pl.ratingKey}`);
    const summary = (one.Metadata && one.Metadata[0] && one.Metadata[0].summary) || '';
    try {
      const data = JSON.parse(summary);
      const books = Array.isArray(data.books) ? data.books : [];
      return books.map((x) => ({ book: x.b, track: x.t, offsetMs: x.o, ts: x.ts }));
    } catch { return []; }
  }

  // --- library --------------------------------------------------------------
  // --- offline metadata cache hooks -----------------------------------------
  // Every successful library read is written through to IndexedDB (js/store.js)
  // and, when the network read fails, served back from it so the app renders a
  // last-known library offline. `markCachedRead` tells the UI it's showing STALE
  // data; `noteFresh` clears that. All guarded — the app runs without Store/Net.
  const cacheHook = {
    fresh(kind) { if (window.Net) Net.noteFresh(kind); },
    stale(kind) { if (window.Net) Net.markCachedRead(kind); },
  };
  // When Net already KNOWS Plex is unreachable, skip the network attempt entirely
  // and serve cache immediately — otherwise every offline browse pays a multi-
  // second connect()+retry/backoff wait before the inevitable cache fallback
  // (the "spinner over cached content" the user sees). Only true on a CONFIRMED
  // offline; when reachability is unknown/true we still try the network.
  const offlineKnown = () => !!(window.Net && Net.state && Net.state().plexReachable === false);

  // THE offline-cache wrapper for library reads. CACHE-FIRST + background
  // revalidate (stale-while-revalidate): if a cached value exists (and not
  // `force`d), return it IMMEDIATELY and refresh from the network in the
  // background — a CHANGED result fires `opts.onFresh(fresh)` so the caller can
  // repaint. This is what makes a low-bandwidth open feel like airplane mode
  // (instant cached render) instead of a multi-second spinner over the slow
  // relay. Only when there is NO cache do we await the network (falling back to
  // cache on failure). `key` scopes per-item kinds (tracks/author/authorBooks by
  // ratingKey); `opts.force` (pull-to-refresh) skips the instant-cache return and
  // re-fetches live; `opts.onFresh(v)` repaints when a bg revalidate differs.
  //
  // In-flight coalescing: concurrent callers for the same (kind,key) — a
  // foreground open racing its own background revalidate, or the several home
  // reads that all resolve `books` — share ONE live() promise instead of firing
  // duplicate requests at the slow relay.
  const inflight = new Map();
  function runLive(cacheKey, { live, store, kind, silent }) {
    if (inflight.has(cacheKey)) return inflight.get(cacheKey);
    const p = (async () => {
      const v = await live();
      if (window.Store && store && v && (!Array.isArray(v) || v.length)) { try { store(v); } catch {} }
      // `silent` = a background WARM prefetch: it must NOT drive the reachability
      // state machine. noteFresh flips plexReachable→true and fires a reconnect
      // pass on a false→true edge; letting ~200 warm reads each do that storms
      // reconnects. Foreground reads still call fresh() so real recovery is caught.
      if (!silent) cacheHook.fresh(kind);
      return v;
    })();
    inflight.set(cacheKey, p);
    return p.finally(() => { if (inflight.get(cacheKey) === p) inflight.delete(cacheKey); });
  }
  // Foreground-activity signal for the background warmer (js/warmer.js): a live
  // read that a VISIBLE screen or home is waiting on (or revalidating) — anything
  // NOT a warm prefetch. The warmer yields the relay while this is non-zero so
  // the page you're looking at always gets the network first, to appear AND to go
  // fresh, before any off-screen page.
  let fgActive = 0;
  function trackFg(p) { fgActive++; return p.finally(() => { fgActive--; }); }
  function foregroundBusy() { return fgActive > 0; }
  // "Did the bg refresh ACTUALLY differ" — ORDER-INSENSITIVE for arrays. The IDB
  // cache returns records in primary-key (ratingKey) order, while the live fetch
  // is in Plex listing order, so a naive stringify reports "changed" on EVERY
  // revalidation of the same library → the whole page (and every cover <img>) gets
  // needlessly rebuilt and FLASHES. Compare as an order-independent multiset so we
  // only repaint on a REAL content change. Runs once, in the background, so the
  // sort cost on a few-hundred-item list is fine.
  function changed(a, b) {
    try {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return true;
        const sig = (arr) => arr.map((x) => JSON.stringify(x)).sort().join(String.fromCharCode(1));
        return sig(a) !== sig(b);
      }
      return JSON.stringify(a) !== JSON.stringify(b);
    } catch { return true; }
  }

  async function withCache(kind, { cached, live, store, key }, opts = {}) {
    const cacheKey = kind + '|' + (key == null ? '' : key);
    const fromCache = async () => {
      if (!window.Store) return undefined;
      const c = await cached();
      if (c && (!Array.isArray(c) || c.length)) return c;
      return undefined;
    };
    // Warm prefetch (the background page warmer): populate ONLY if missing — never
    // revalidate a hit (leave that to an actual visit) and never count as
    // foreground. So a warm pass over an already-cached library is a cheap no-op.
    if (opts.warm) {
      const c = await fromCache();
      if (c !== undefined) return c;
      return runLive(cacheKey, { live, store, kind, silent: true });   // background prefetch: don't drive reachability
    }
    if (!opts.force) {
      const c = await fromCache();
      if (c !== undefined) {
        // Serving cache-first is NORMAL under stale-while-revalidate — it is NOT a
        // network failure, so we must NOT mark the data stale here. Doing so flipped
        // plexReachable false→true on EVERY read (markCachedRead→noteFresh), storming
        // reconnect passes (RECONNECT climbed 6→17). Only mark stale when we're
        // KNOWN-offline, or when the background revalidate genuinely FAILS.
        if (offlineKnown()) {
          cacheHook.stale(kind);                  // confirmed offline → this cache truly is stale
        } else {
          trackFg(runLive(cacheKey, { live, store, kind }))
            .then((v) => { if (v != null && opts.onFresh && changed(c, v)) { try { opts.onFresh(v); } catch {} } })
            .catch((e) => { cacheHook.stale(kind); dbg('CACHE', kind + ' bg revalidate failed (' + ((e && e.message) || 'err') + ')'); });
        }
        dbg('CACHE', kind + ' cache-first' + (offlineKnown() ? ' (offline, no revalidate)' : ' (revalidating)'));
        return c;
      }
    }
    // No cache (or forced) → await the network; fall back to cache on failure.
    try {
      return await trackFg(runLive(cacheKey, { live, store, kind }));
    } catch (e) {
      dbg('CACHE', kind + ' live failed (' + ((e && e.message) || 'err') + ') — trying cache');
      const c = await fromCache();
      if (c !== undefined) { cacheHook.stale(kind); return c; }
      throw e;
    }
  }

  // Light reachability probe for js/net.js: does the current Plex base answer
  // /identity right now? Drops a dead base so the next call re-probes.
  async function ping() {
    try {
      const b = base || await connect();
      const signal = AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined;
      const r = await fetch(`${b}/identity`, { headers: plexHeaders({ 'X-Plex-Token': token() }), signal });
      return !!(r && r.ok);
      // NOTE: a probe must NOT null `base` — that was wiping the live connection
      // mid-session and breaking the very next playback (AUD_ERR code=4). Real API
      // calls (plexFetch) still drop a dead base to force a re-probe when needed.
    } catch { return false; }
  }

  function getAlbum(rk, opts) {
    return withCache('albums', {
      key: rk,
      cached: () => Store.cachedAlbum(rk),
      live: async () => ((await api(`/library/metadata/${rk}`)).Metadata || [])[0] || null,
      store: (a) => Store.cacheAlbum(a),
    }, opts);
  }

  function mapTracks(mc) {
    const tracks = (mc.Metadata || []).map((t) => {
      const part = t.Media && t.Media[0] && t.Media[0].Part && t.Media[0].Part[0];
      return {
        ratingKey: t.ratingKey,
        title: t.title,
        index: t.index || 0,
        durationMs: t.duration || 0,
        viewCount: t.viewCount || 0,
        viewOffset: t.viewOffset || 0,
        partKey: part ? part.key : null,
        size: (part && part.size) || 0,      // bytes — for download cap/quota math
      };
    }).filter((t) => t.partKey);
    tracks.sort((a, b) => a.index - b.index);
    return tracks;
  }

  function getAlbumTracks(rk, opts) {
    return withCache('tracks', {
      key: rk,
      cached: () => Store.cachedTracks(rk),
      live: async () => mapTracks(await api(`/library/metadata/${rk}/children`)),
      store: (tracks) => Store.cacheTracks(rk, tracks),
    }, opts);
  }

  // Media details for ONE track (for the track-info sheet): container, bitrate,
  // bit depth, channels, file size — from Media/Part/Stream on the item.
  async function getTrackInfo(rk) {
    const mc = await api(`/library/metadata/${rk}`);
    const t = (mc.Metadata || [])[0];
    if (!t) return null;
    const media = (t.Media && t.Media[0]) || {};
    const part = (media.Part && media.Part[0]) || {};
    const astream = ((part.Stream || []).find((s) => s.streamType === 2)) || {};
    return {
      container: (part.container || media.container || '').toUpperCase(),
      codec: (media.audioCodec || astream.codec || '').toUpperCase(),
      bitrate: media.bitrate || 0,                       // kbps
      bitDepth: astream.bitDepth || 0,
      samplingRate: astream.samplingRate || 0,           // Hz
      channels: media.audioChannels || astream.channels || 0,
      size: part.size || 0,                              // bytes
    };
  }

  // --- full-library browse --------------------------------------------------
  // The audiobook library is a Plex "artist" section (Author=artist type 8,
  // Book=album type 9). Discover it once and cache the key: prefer an artist
  // section whose title mentions books, else the first artist section.
  let sectionKey = null;
  async function getSectionKey() {
    if (sectionKey) return sectionKey;
    const cached = localStorage.getItem('pb_section');
    if (cached) { sectionKey = cached; return sectionKey; }
    const mc = await api('/library/sections');
    const dirs = mc.Directory || [];
    const artists = dirs.filter((d) => d.type === 'artist');
    const pick = artists.find((d) => /audiobook|book/i.test(d.title || '')) || artists[0] || dirs[0];
    if (!pick) throw new Error('No audiobook library found on this server.');
    sectionKey = pick.key;
    localStorage.setItem('pb_section', sectionKey);
    return sectionKey;
  }

  // Big container size so we get the WHOLE library in one request.
  const REQUEST_CAP = 20000;
  const BIG = { 'X-Plex-Container-Start': '0', 'X-Plex-Container-Size': String(REQUEST_CAP) };

  // ---- library-listing truncation detection (fill-to-budget scaling WS4.1) ----
  // A library past REQUEST_CAP silently LOSES items with today's one-big-request
  // fetch. Detect it: `totalSize` vs returned count → 'truncated' (definitely),
  // 'possible' (no totalSize but returned exactly the cap — can't tell a 20k-exact
  // library from a capped one), or 'complete'. Pure predicate; per-kind state is
  // surfaced on the affected Browse list header (no silent caps) + the debug log.
  function truncationState(totalSize, returnedCount, cap) {
    const total = Number(totalSize);
    if (Number.isFinite(total) && total > returnedCount) return 'truncated';
    if (!Number.isFinite(total) && returnedCount === cap) return 'possible';
    return 'complete';
  }
  // The side channel alone is NOT enough (review of `.138`, finding 1): it
  // resets to 'complete' every session, the live fetch that corrects it fires
  // AFTER the cache-first page built, and `onFresh` never repaints when the
  // item arrays are identical — so a truncated library stayed silent for the
  // whole session. Three additions close that:
  //   1. metadata PERSISTS (Store.kv 'trunc:<kind>') and hydrates at load, so
  //      a cache-first/offline session shows the last VERIFIED state;
  //   2. a change LISTENER lets Browse repaint the notice in place, decoupled
  //      from the row-diff repaint (identical rows, changed truncation → the
  //      note still updates);
  //   3. truncationDisplay() adds the legacy-cache heuristic: a listing with
  //      no metadata at all that is exactly the request cap MAY be truncated.
  const truncation = { authors: { state: 'complete', total: 0, returned: 0 }, books: { state: 'complete', total: 0, returned: 0 } };
  const truncListeners = new Set();
  const truncSig = (t) => `${t.state}:${t.total}:${t.returned}`;
  function fireTruncation(kind) {
    for (const fn of truncListeners) { try { fn(kind, truncation[kind]); } catch {} }
  }
  const onTruncationChange = (fn) => { truncListeners.add(fn); };
  function noteTruncation(kind, mc, returned) {
    const state = truncationState(mc && mc.totalSize, returned, REQUEST_CAP);
    const next = { state, total: Number((mc && mc.totalSize)) || 0, returned, noted: true };
    const changed = truncSig(next) !== truncSig(truncation[kind]) || !truncation[kind].noted;
    truncation[kind] = next;
    if (state !== 'complete') dbg('TRUNC', `${kind} listing ${state}: returned ${returned}${next.total ? ' of ' + next.total : ''}`);
    if (typeof window !== 'undefined' && window.Store && Store.kvSet) Store.kvSet('trunc:' + kind, { state: next.state, total: next.total, returned: next.returned });
    if (changed) fireTruncation(kind);
  }
  // Last verified state from a prior session — applied only until a LIVE
  // listing speaks (noted wins over persisted, persisted over nothing).
  async function hydrateTruncation() {
    if (typeof window === 'undefined' || !window.Store || !Store.kvGet) return;
    for (const kind of ['authors', 'books']) {
      try {
        const t = await Store.kvGet('trunc:' + kind, null);
        if (t && t.state && !truncation[kind].noted) {
          truncation[kind] = { state: t.state, total: t.total || 0, returned: t.returned || 0, persisted: true };
          fireTruncation(kind);
        }
      } catch {}
    }
  }
  const libraryTruncation = () => truncation;
  hydrateTruncation();   // store.js loads first; guarded no-op when Store is absent
  // What a rendered listing of `count` items should DISPLAY: a verified state
  // (live this session, or persisted from a prior one) stands as-is; a listing
  // with no metadata anywhere falls back to the count — exactly the request cap
  // may be truncated (we can't tell), anything under it is provably complete.
  function truncationDisplay(t, count) {
    // A LIVE (this-session) verdict describes the listing on screen → stands as-is.
    if (t && t.noted) return t;
    // A PERSISTED verdict describes a PRIOR session's listing and is NOT commit-bound
    // to the one being displayed (the trunc write and the listing write share no
    // transaction/revision). Trust it only where it cannot mask a fresh truncation:
    //   - a warning ('truncated'/'possible') is always safe to surface;
    //   - 'complete' is provable only BELOW the cap (a truncation always sits AT it).
    // A persisted 'complete' at exactly the cap is the ambiguous case — a library
    // grown past the cap whose first `cap` rows are unchanged looks identical, and if
    // the fresh 'truncated' write was lost/uncommitted the stale 'complete' would
    // silently suppress the warning. Fall back to the count heuristic ('possible').
    if (t && t.persisted) {
      if (t.state === 'complete' && count >= REQUEST_CAP) return { state: 'possible', total: 0, returned: count };
      return t;
    }
    if (count >= REQUEST_CAP) return { state: 'possible', total: 0, returned: count };
    return { state: 'complete', total: 0, returned: count };
  }

  // Authors (artists). Lightweight: title + thumb + album count only — NO
  // per-book progress/time work (this screen never shows times).
  function getAuthors(opts) {
    return withCache('authors', {
      cached: () => Store.cachedAuthors(),
      live: async () => {
        const key = await getSectionKey();
        const mc = await api(`/library/sections/${key}/all`, { params: { type: 8 }, headers: BIG });
        const out = (mc.Metadata || []).map((a) => ({
          ratingKey: a.ratingKey, title: a.title || 'Unknown',
          titleSort: a.titleSort || a.title || '', thumb: a.thumb || null,
          childCount: a.childCount || 0,
        }));
        noteTruncation('authors', mc, out.length);
        return out;
      },
      store: (authors) => Store.cacheAuthors(authors),
    }, opts);
  }

  const mapBook = (b) => ({
    ratingKey: b.ratingKey, title: b.title || 'Book',
    titleSort: b.titleSort || b.title || '', parentTitle: b.parentTitle || '',
    parentRatingKey: b.parentRatingKey || null,   // book→author link (warmer recency selection needs it)
    thumb: b.thumb || b.parentThumb || null,
    leafCount: b.leafCount || 0, viewedLeafCount: b.viewedLeafCount || 0,
    lastViewedAt: b.lastViewedAt || 0, addedAt: b.addedAt || 0,
  });

  // All books (albums) in the library. leafCount/viewedLeafCount ride along in
  // the listing, so the Books screen shows progress with no extra calls. Cached
  // for the session: powers the Books browse AND the home feeds below.
  let booksCache = null;
  function clearCaches() { booksCache = null; }   // pull-to-refresh: force a fresh whole-library fetch
  async function getBooks(opts = {}) {
    if (booksCache && !opts.force) return booksCache;
    // NB: only the LIVE read assigns the session copy (booksCache) — a cached
    // fallback stays unassigned so a later reconnect re-fetches fresh instead of
    // being stuck on the stale copy for the whole session (review bug 4). Under
    // cache-first this means getBooks returns the IDB copy instantly and the bg
    // revalidate populates booksCache when it lands (+ fires opts.onFresh).
    return withCache('books', {
      cached: () => Store.cachedBooks(),
      live: async () => {
        const key = await getSectionKey();
        const mc = await api(`/library/sections/${key}/all`, { params: { type: 9 }, headers: BIG });
        booksCache = (mc.Metadata || []).map(mapBook);
        noteTruncation('books', mc, booksCache.length);
        dbg('CACHE', 'getBooks live: ' + booksCache.length + ' books');
        return booksCache;
      },
      store: (books) => Store.cacheBooks(books),
    }, opts);
  }

  // Continue Listening + Recently Added are pure derivations of getBooks() — see
  // PBLogic.homeFeeds (js/logic.js), shared by the offline cache paint and
  // loadHomeData. CL keys off lastViewedAt (recently-played), additively merged
  // with the optional LMS plugin's resume books; resume OFFSET is Plex-hidden for
  // audiobooks and comes from our Progress store (or the plugin). ⚠️ The /all
  // type-9 listing returns lastViewedAt/addedAt but OMITS leafCount/viewedLeafCount
  // (those need a per-album fetch), so mapBook defaults them to 0 → home tiles show
  // no progress bar and their reconcile signature can't shift on those fields.

  // Books for one author (drill-down from the Authors screen). Cached in the kv
  // bag so the author page works offline like every other browse screen (it was
  // the one screen with no fallback).
  function getAuthorBooks(authorRk, opts) {
    return withCache('authorBooks', {
      key: authorRk,
      cached: () => Store.kvGet('authorBooks:' + authorRk, null),
      live: async () => ((await api(`/library/metadata/${authorRk}/children`)).Metadata || []).map(mapBook),
      store: (books) => Store.kvSet('authorBooks:' + authorRk, books),
    }, opts);
  }

  // One author's own metadata — thumb, book count, and the scraped bio blurb
  // (the /all listing omits summary, so this needs the per-item fetch).
  function getAuthor(authorRk, opts) {
    return withCache('author', {
      key: authorRk,
      cached: () => Store.kvGet('author:' + authorRk, null),
      live: async () => {
        const mc = await api(`/library/metadata/${authorRk}`);
        const a = (mc.Metadata || [])[0];
        if (!a) return null;
        return { ratingKey: a.ratingKey, title: a.title || 'Unknown', thumb: a.thumb || null, childCount: a.childCount || 0, summary: a.summary || '' };
      },
      store: (a) => Store.kvSet('author:' + authorRk, a),
    }, opts);
  }

  // --- media + art URLs -----------------------------------------------------
  function streamUrl(partKey) {
    return curBase() + partKey + (partKey.includes('?') ? '&' : '?') + 'X-Plex-Token=' + encodeURIComponent(token());
  }
  // Ask PMS to resize + re-encode the cover to a small JPEG via its photo
  // transcoder, instead of shipping the full-res original (often 1500px+). On a
  // slow relay this is the difference between a page of art loading and the
  // relay choking — a 400px cover is a small fraction of the bytes. Pass size=0
  // to get the raw original.
  function artUrl(thumb, size = 400) {
    if (!thumb) return null;
    const b = curBase();               // last-good host, so cached covers resolve offline
    if (!b) return null;
    if (!size) return b + thumb + (thumb.includes('?') ? '&' : '?') + 'X-Plex-Token=' + encodeURIComponent(token());
    const p = new URLSearchParams({
      width: String(size), height: String(size), minSize: '1', upscale: '1',
      url: thumb,                       // internal PMS resource path; URLSearchParams encodes it
      'X-Plex-Token': token(),
    });
    return b + '/photo/:/transcode?' + p.toString();
  }

  // --- progress write-back (same endpoint official clients use) -------------
  async function writeTimeline({ ratingKey, state, timeMs, durationMs }) {
    try {
      await plexFetch((b) => {                 // idempotent GET-style write → safe to retry
        const url = new URL(b + '/:/timeline');
        const p = url.searchParams;
        p.set('ratingKey', ratingKey);
        p.set('key', `/library/metadata/${ratingKey}`);
        p.set('identifier', PLEX_ID);
        p.set('state', state);
        p.set('time', Math.round(timeMs));
        p.set('duration', Math.round(durationMs));
        p.set('hasMDE', '1');
        return url;
      }, {}, { retries: 2, timeoutMs: 8000 });
      return true;
    } catch (e) { return false; }   // best-effort; caller may queue it for later (syncqueue)
  }

  // Mark an item unplayed on the server: clears viewCount AND the (API-hidden)
  // audiobook viewOffset, so per-chapter "played" bars and the resume point reset.
  async function unscrobble(ratingKey) {
    await plexFetch((b) => {
      const url = new URL(b + '/:/unscrobble');
      url.searchParams.set('key', ratingKey);
      url.searchParams.set('identifier', PLEX_ID);
      return url;
    }, {}, { retries: 2, timeoutMs: 8000 });
  }

  // Drop one book from the plugin's __tomeroam_resume playlist immediately, so the
  // tile's cold resume clears now rather than waiting for the plugin's next DB sync
  // (which, post-unscrobble, will independently produce the same book-less summary).
  async function removeBookFromResume(book) {
    const list = await api('/playlists', { params: { playlistType: 'audio' } });
    const pl = (list.Metadata || []).find((p) => p.title === RESUME_PLAYLIST);
    if (!pl) return;
    const one = await api(`/playlists/${pl.ratingKey}`);
    const summary = (one.Metadata && one.Metadata[0] && one.Metadata[0].summary) || '';
    let data; try { data = JSON.parse(summary); } catch { return; }
    if (!Array.isArray(data.books)) return;
    const kept = data.books.filter((x) => String(x.b) !== String(book));
    if (kept.length !== data.books.length) { data.books = kept; await setPlaylistSummary(pl.ratingKey, JSON.stringify(data)); }
  }

  // Clear ALL saved progress for a book: unplay every track on the server, then
  // remove the book from the resume store. Best-effort per track (one failure
  // doesn't abort the rest). Returns the count of tracks reset.
  async function resetBookProgress(book, trackRks) {
    let done = 0;
    for (const rk of trackRks) { try { await unscrobble(rk); done++; } catch (e) { dbg('RESET', 'unscrobble ' + rk + ' failed'); } }
    try { await removeBookFromResume(book); } catch (e) { dbg('RESET', 'resume-playlist rewrite failed'); }
    clearCaches();   // force a fresh getBooks() so viewedLeafCount reflects the reset
    return done;
  }

  // --- playlist helpers (used by the multi-device presence/coordination layer) ---
  let machineId = null;
  async function getMachineId() {
    if (machineId) return machineId;
    const mc = await api('/');
    machineId = mc.machineIdentifier || null;
    return machineId;
  }

  // Create a hidden audio playlist seeded with one real track; returns ratingKey.
  async function createPlaylist(title, seedTrackRk) {
    const mid = await getMachineId();
    if (!mid || !seedTrackRk) return null;
    const b = await connect();
    const url = new URL(b + '/playlists');
    url.searchParams.set('type', 'audio');
    url.searchParams.set('smart', '0');
    url.searchParams.set('title', title);
    url.searchParams.set('uri', `server://${mid}/${PLEX_ID}/library/metadata/${seedTrackRk}`);
    const r = await fetch(url, { method: 'POST', headers: plexHeaders({ 'X-Plex-Token': token() }) });
    if (!r.ok) throw new Error('createPlaylist ' + r.status);
    const j = await r.json();
    const pl = j.MediaContainer && j.MediaContainer.Metadata && j.MediaContainer.Metadata[0];
    return pl ? pl.ratingKey : null;
  }

  // Write a playlist's summary (only PUT to /library/metadata actually persists).
  // Returns the HTTP status (0 on a network error) so callers can tell a DEFINITE
  // "board gone" (404 → recreate) from a TRANSIENT relay failure (keep the board) —
  // recreating on every transient failure is what churned out dozens of ghost boards.
  async function setPlaylistSummary(rk, summary) {
    try {
      const b = await connect();
      const url = new URL(b + '/library/metadata/' + rk);
      url.searchParams.set('summary.value', summary);
      url.searchParams.set('summary.locked', '1');
      const r = await fetch(url, { method: 'PUT', headers: plexHeaders({ 'X-Plex-Token': token() }) });
      return r.status;
    } catch { return 0; }
  }

  // All playlists whose title starts with `prefix`, each with its summary text.
  async function listBoards(prefix) {
    const mc = await api('/playlists', { params: { playlistType: 'audio' } });
    const items = (mc.Metadata || []).filter((p) => (p.title || '').startsWith(prefix));
    const out = [];
    for (const p of items) {
      let summary = p.summary;
      if (summary == null) {
        try { const one = await api(`/playlists/${p.ratingKey}`); summary = one.Metadata && one.Metadata[0] && one.Metadata[0].summary; } catch {}
      }
      out.push({ ratingKey: p.ratingKey, title: p.title, summary: summary || '' });
    }
    return out;
  }

  // Status-aware: true only when the playlist is confirmed GONE — 2xx, or 404
  // (already absent = successful cleanup). Network errors and other statuses are
  // false: device deletion keeps its cleanup transaction open until every board
  // is confirmed removed (a swallowed failure here once let "delete pending"
  // clear its queue and a later retry mint a wider purge timestamp).
  async function deletePlaylist(rk) {
    try {
      const b = await connect();
      const r = await fetch(b + '/playlists/' + rk, { method: 'DELETE', headers: plexHeaders({ 'X-Plex-Token': token() }) });
      return r.ok || r.status === 404;
    } catch { return false; }
  }

  // Fresh read of ONE playlist's summary — the content read-back the durable
  // The progress shards verify every write by reading it back (Plex returns 200
  // for writes it silently discards, so status is never trusted).
  //
  // CONTRACT — two distinguishable outcomes, because the shard store's failure
  // taxonomy acts on them differently:
  //   * THROWS  → the read could not be completed (network/HTTP). The caller
  //     reports verify-transport-failed: we do not know what the server holds.
  //   * null    → the read COMPLETED and there is no summary to compare against.
  //     The caller reports verify-read-failed.
  // Swallowing the throw into `null` conflated the two and made the transport
  // category unreachable in production, so a network drop mid-verify was filed as
  // "read failed" — false precision in the one place support looks first. The
  // sole consumer (progress.js → shardstore readSummary) already wraps this in
  // try/catch, in both the verify and the corrupt-retry paths.
  async function readPlaylistSummary(rk) {
    const one = await api(`/playlists/${rk}`);
    const m = one.Metadata && one.Metadata[0];
    return m ? (m.summary || '') : null;
  }

  // Shared "hidden playlist board" primitive — presence.js, progress.js, and
  // logpipe.js each used to hand-roll the same ensure/publish/read trio. A board
  // is one hidden audio playlist (`<prefix><deviceId>`) whose SUMMARY carries a
  // JSON blob; the playlist ratingKey persists in `lsKey`.
  //   ensure(seed)        → ratingKey (creates once; `seed` = a track ratingKey or
  //                         an async provider — playlists need a real seed item)
  //   publish(text, seed) → HTTP status. A DEFINITE 404 clears the stored key so
  //                         the NEXT publish recreates the board; any transient
  //                         failure keeps it (recreate-on-transient is what once
  //                         churned out dozens of ghost boards). Never throws.
  //   readAll()           → [{ratingKey,title,summary}] for every `prefix` board
  //   key()               → our own board's ratingKey (e.g. to skip it in prunes)
  const boardId = () => (clientId() || 'dev').replace(/[^a-z0-9]/gi, '').slice(-8);
  function makeBoard(prefix, lsKey) {
    let key = null;
    async function ensure(seed) {
      if (key) return key;
      const saved = localStorage.getItem(lsKey);
      if (saved) { key = saved; return key; }
      const s = typeof seed === 'function' ? await seed() : seed;
      if (!s) return null;
      try {
        key = await createPlaylist(prefix + boardId(), s);
        if (key) localStorage.setItem(lsKey, key);
      } catch (e) { dbg('BOARD', prefix + ' create failed ' + (e && e.message)); }
      return key;
    }
    async function publish(text, seed) {
      let rk;
      try { rk = await ensure(seed); } catch { rk = null; }
      if (!rk) return 0;
      const st = await setPlaylistSummary(rk, text);
      if (st === 404) { key = null; try { localStorage.removeItem(lsKey); } catch {} }
      return st;
    }
    return { ensure, publish, readAll: () => listBoards(prefix), key: () => key };
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const getServerName = () => serverName;
  const getBase = () => base;
  const getConnKind = () => connKind;
  const serverNow = () => Date.now() + serverOffset;

  // WebSocket URL for Plex's real-time notification stream (push). Same host as
  // the chosen connection, http→ws / https→wss. Token rides in the query (Plex
  // has no header path for the ws upgrade).
  function notificationWsUrl() {
    if (!base) return null;
    return base.replace(/^http/i, 'ws') + '/:/websockets/notifications?X-Plex-Token=' + encodeURIComponent(token());
  }

  return {
    isSignedIn, signOut, startPin, pollPin, connect, ping, getClientId: clientId, serverNow,
    getResumeMap, getAlbum, getAlbumTracks,
    getAuthors, getBooks, getAuthorBooks, getAuthor, libraryTruncation, truncationDisplay, onTruncationChange,
    getTrackInfo, clearCaches, foregroundBusy,
    streamUrl, artUrl, writeTimeline, getServerName, getBase, getConnKind,
    getMachineId, createPlaylist, setPlaylistSummary, listBoards, deletePlaylist, makeBoard, readPlaylistSummary,
    resetBookProgress,
    notificationWsUrl,
    // Drop the cached base + any in-flight probe so the NEXT connect() re-resolves a
    // fresh endpoint. Used on a network change / resume (net.js) and before a stream
    // retry (a stale/rotated relay base is the usual first-play-after-sign-in failure).
    // Bumps connGen so a probe already in flight can neither publish its (now
    // suspect) base nor clear a newer probe's `connecting` reference.
    // NOTE: this was previously only under _test, so net.js's `Plex.resetConn &&`
    // guard silently no-op'd — the reset-on-reconnect never actually fired.
    resetConn: () => { base = null; connecting = null; connGen++; },
    // internals exposed for the unit tests only (no runtime behaviour change)
    _test: {
      kindOf, orderByLastKind, mapBook, mapTracks, curBase, changed, withCache,
      truncationState, noteTruncation, REQUEST_CAP, hydrateTruncation,
      setBase: (b) => { base = b; },
      resetConn: () => { base = null; connecting = null; connGen++; },
      isConnecting: () => !!connecting,
    },
  };
})();

// Expose on window (top-level `const Plex` is a lexical global, not window.Plex);
// net.js/store.js/debug.js read `window.Plex`.
if (typeof window !== 'undefined') window.Plex = Plex;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Plex;
