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
    base = null; serverName = null; sectionKey = null; booksCache = null;
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
    localStorage.setItem(LS.server, JSON.stringify({
      name: srv.name, machineId: srv.clientIdentifier, connections: conns,
    }));
    serverName = srv.name;
    return { connections: conns, token: srv.accessToken || token() };
  }

  // Probe connections; first that answers /identity wins. Timeouts are
  // per-connection-TYPE: a private/local .plex.direct URI that isn't on our
  // current LAN fails (or hangs) fast, so we cap it short; the RELAY is the
  // only route when away from home and its cold TLS handshake can take 9s+
  // (Plex rotates relay endpoints in a pool), so it gets a much longer budget.
  // We also try the last-known-good path first, so an off-home launch hits the
  // relay immediately instead of burning seconds on dead local probes.
  // Kept strictly SEQUENTIAL on purpose — parallel Promise.any broke this.
  const LOCAL_TIMEOUT_MS = 3500;
  const RELAY_TIMEOUT_MS = 12000;

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

  // One sequential pass over a connection list; returns the winning uri or null.
  async function tryConns(conns, tkn) {
    for (const c of orderByLastKind(conns)) {
      const timeout = c.local ? LOCAL_TIMEOUT_MS : RELAY_TIMEOUT_MS;   // relay/remote get the long budget
      const t0 = Date.now();
      try {
        if (await probeConn(c.uri, tkn, timeout)) {
          connKind = kindOf(c);
          try { localStorage.setItem(LS.connKind, connKind); } catch {}
          dbg('CONN', `${connKind} OK ${Date.now() - t0}ms ${new URL(c.uri).host}`);
          return c.uri;
        }
        dbg('CONN', `${kindOf(c)} answered !ok ${Date.now() - t0}ms`);
      } catch (e) { dbg('CONN', `${kindOf(c)} fail ${Date.now() - t0}ms ${(e && e.name) || ''}`); }
    }
    return null;
  }

  async function connect() {
    if (base) return base;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS.server) || 'null'); } catch {}
    let conns, tkn = token();
    if (saved && saved.connections) { conns = saved.connections; serverName = saved.name; }
    else { const d = await discoverServer(); conns = d.connections; tkn = d.token; }

    let hit = await tryConns(conns, tkn);
    // All dead — network changed, or a cached relay endpoint rotated out of the
    // pool. Rediscover a fresh connection list once and try again.
    if (!hit && saved) {
      dbg('CONN', 'all cached connections dead — rediscovering');
      localStorage.removeItem(LS.server);
      const d = await discoverServer();
      hit = await tryConns(d.connections, d.token || tkn);
    }
    if (!hit) { dbg('CONN', 'FAIL: no connection reachable'); throw new Error('Could not reach your Plex server.'); }
    base = hit;
    // Remember the winning host so cover-art URLs resolve to the SAME origin when
    // OFFLINE (base is null then) — that origin is the SW image cache's key, so
    // previously-loaded covers keep rendering. Not used for API calls.
    try { localStorage.setItem('pb_lastBase', base); } catch {}
    return base;
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

  // Light reachability probe for js/net.js: does the current Plex base answer
  // /identity right now? Drops a dead base so the next call re-probes.
  async function ping() {
    try {
      const b = await connect();
      const signal = AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined;
      const r = await fetch(`${b}/identity`, { headers: plexHeaders({ 'X-Plex-Token': token() }), signal });
      if (!r.ok) { base = null; return false; }
      return true;
    } catch { base = null; return false; }
  }

  async function getAlbum(rk) {
    try {
      const mc = await api(`/library/metadata/${rk}`);
      const a = (mc.Metadata || [])[0] || null;
      if (a && window.Store) Store.cacheAlbum(a);
      cacheHook.fresh('albums');
      return a;
    } catch (e) {
      if (window.Store) { const c = await Store.cachedAlbum(rk); if (c) { cacheHook.stale('albums'); return c; } }
      throw e;
    }
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
      };
    }).filter((t) => t.partKey);
    tracks.sort((a, b) => a.index - b.index);
    return tracks;
  }

  async function getAlbumTracks(rk) {
    try {
      const tracks = mapTracks(await api(`/library/metadata/${rk}/children`));
      if (window.Store) Store.cacheTracks(rk, tracks);
      cacheHook.fresh('tracks');
      return tracks;
    } catch (e) {
      if (window.Store) { const c = await Store.cachedTracks(rk); if (c) { cacheHook.stale('tracks'); return c; } }
      throw e;
    }
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
  const BIG = { 'X-Plex-Container-Start': '0', 'X-Plex-Container-Size': '20000' };

  // Authors (artists). Lightweight: title + thumb + album count only — NO
  // per-book progress/time work (this screen never shows times).
  async function getAuthors() {
    try {
      const key = await getSectionKey();
      const mc = await api(`/library/sections/${key}/all`, { params: { type: 8 }, headers: BIG });
      const authors = (mc.Metadata || []).map((a) => ({
        ratingKey: a.ratingKey, title: a.title || 'Unknown',
        titleSort: a.titleSort || a.title || '', thumb: a.thumb || null,
        childCount: a.childCount || 0,
      }));
      if (window.Store && authors.length) Store.cacheAuthors(authors);
      cacheHook.fresh('authors');
      return authors;
    } catch (e) {
      if (window.Store) { const c = await Store.cachedAuthors(); if (c && c.length) { cacheHook.stale('authors'); return c; } }
      throw e;
    }
  }

  const mapBook = (b) => ({
    ratingKey: b.ratingKey, title: b.title || 'Book',
    titleSort: b.titleSort || b.title || '', parentTitle: b.parentTitle || '',
    thumb: b.thumb || b.parentThumb || null,
    leafCount: b.leafCount || 0, viewedLeafCount: b.viewedLeafCount || 0,
    lastViewedAt: b.lastViewedAt || 0, addedAt: b.addedAt || 0,
  });

  // All books (albums) in the library. leafCount/viewedLeafCount ride along in
  // the listing, so the Books screen shows progress with no extra calls. Cached
  // for the session: powers the Books browse AND the home feeds below.
  let booksCache = null;
  function clearCaches() { booksCache = null; }   // pull-to-refresh: force a fresh whole-library fetch
  async function getBooks() {
    if (booksCache) return booksCache;
    try {
      const key = await getSectionKey();
      const mc = await api(`/library/sections/${key}/all`, { params: { type: 9 }, headers: BIG });
      booksCache = (mc.Metadata || []).map(mapBook);
      if (window.Store && booksCache.length) Store.cacheBooks(booksCache);
      cacheHook.fresh('books');
      return booksCache;
    } catch (e) {
      // Offline / Plex down: fall back to the last-known library from IndexedDB
      // so the home + browse screens still render (labeled stale by the UI).
      if (window.Store) { const c = await Store.cachedBooks(); if (c && c.length) { booksCache = c; cacheHook.stale('books'); return c; } }
      throw e;
    }
  }

  // Plex's own in-progress list: books partway through (some, not all, chapters
  // viewed), most-recently-listened first.
  // Continue Listening = Plex's recently-played books (the STANDALONE source of
  // truth for WHICH books + recency), newest first. NOTE: the /all listing returns
  // lastViewedAt but OMITS leafCount/viewedLeafCount (those need a per-album fetch),
  // so we key off lastViewedAt — the old viewedLeafCount<leafCount filter matched
  // nothing (both undefined). loadHomeData ADDITIVELY merges in the optional LMS
  // plugin's resume books on top of this. Resume OFFSET is Plex-hidden for
  // audiobooks and comes from our own Progress store (or the plugin, if present).
  async function getContinueListening() {
    const books = await getBooks();
    return books
      .filter((b) => b.lastViewedAt > 0)
      .sort((a, b) => (b.lastViewedAt || 0) - (a.lastViewedAt || 0));
  }

  // Newest books in the library, most-recent first.
  async function getRecentlyAdded(limit = 15) {
    const books = await getBooks();
    return books.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, limit);
  }

  // Books for one author (drill-down from the Authors screen).
  async function getAuthorBooks(authorRk) {
    const mc = await api(`/library/metadata/${authorRk}/children`);
    return (mc.Metadata || []).map(mapBook);
  }

  // One author's own metadata — thumb, book count, and the scraped bio blurb
  // (the /all listing omits summary, so this needs the per-item fetch).
  async function getAuthor(authorRk) {
    const mc = await api(`/library/metadata/${authorRk}`);
    const a = (mc.Metadata || [])[0];
    if (!a) return null;
    return { ratingKey: a.ratingKey, title: a.title || 'Unknown', thumb: a.thumb || null, childCount: a.childCount || 0, summary: a.summary || '' };
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

  async function deletePlaylist(rk) {
    try { const b = await connect(); await fetch(b + '/playlists/' + rk, { method: 'DELETE', headers: plexHeaders({ 'X-Plex-Token': token() }) }); } catch {}
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
    getAuthors, getBooks, getAuthorBooks, getAuthor, getContinueListening, getRecentlyAdded,
    getTrackInfo, clearCaches,
    streamUrl, artUrl, writeTimeline, getServerName, getBase, getConnKind,
    getMachineId, createPlaylist, setPlaylistSummary, listBoards, deletePlaylist,
    resetBookProgress,
    notificationWsUrl,
    _test: { kindOf, orderByLastKind, mapBook },   // internals exposed for the unit tests only
  };
})();

if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Plex;
