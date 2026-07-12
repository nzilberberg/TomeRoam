// store.js — IndexedDB persistence for TomeRoam's STRUCTURED app data.
//
// Split of responsibilities (per the offline-resilience design):
//   * Cache Storage (owned by sw.js)  = app-shell assets + runtime cover images.
//   * IndexedDB       (owned by THIS) = normalized structured data: settings
//     snapshot, last-known libraries/authors/books/track-lists, resume/progress
//     mirror, the pending-sync queue, sync timestamps, and diagnostics metadata.
//
// Why IndexedDB and not localStorage: localStorage is tiny, synchronous, and
// string-only. A whole library (hundreds of books + per-book track lists) belongs
// in IndexedDB, which is async and roomy and survives as long as the origin's
// storage isn't evicted (see Store.persist()).
//
// Everything is best-effort: if IndexedDB is unavailable/blocked, every call
// resolves to a harmless empty value so the app still runs (just without an
// offline cache). NEVER throws into callers.
const Store = (() => {
  const DB = 'tomeroam';
  const VER = 1;
  // Object stores. `kv` is a generic key→value bag (settings, timestamps, route,
  // env, misc). The rest are keyed collections.
  const STORES = {
    kv:      { keyPath: 'k' },
    books:   { keyPath: 'ratingKey' },   // one library's worth of book records
    authors: { keyPath: 'ratingKey' },
    tracks:  { keyPath: 'book' },         // { book, tracks:[...], ts }
    albums:  { keyPath: 'ratingKey' },    // per-book detail (getAlbum result)
    sync:    { keyPath: 'id' },           // pending-sync queue items
    diag:    { keyPath: 'k' },            // diagnostics metadata bag
  };

  const dbg = (t, m) => { if (window.PBDebug) PBDebug.log(t, m); };
  let dbp = null;                          // cached open() promise
  const available = typeof indexedDB !== 'undefined';

  function open() {
    if (dbp) return dbp;
    if (!available) { dbp = Promise.resolve(null); return dbp; }
    dbp = new Promise((resolve) => {
      let req;
      try { req = indexedDB.open(DB, VER); } catch { return resolve(null); }
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [name, opts] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, opts);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbg('IDB', 'open failed ' + (req.error && req.error.message)); resolve(null); };
      req.onblocked = () => dbg('IDB', 'open blocked');
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then((db) => new Promise((resolve) => {
      if (!db) return resolve(undefined);
      let t;
      try { t = db.transaction(store, mode); } catch { return resolve(undefined); }
      const os = t.objectStore(store);
      let out;
      try { out = fn(os); } catch (e) { dbg('IDB', 'tx fn threw ' + (e && e.message)); }
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = t.onabort = () => resolve(undefined);
    }));
  }

  // ---- generic accessors ----------------------------------------------------
  const get    = (store, key) => tx(store, 'readonly', (os) => os.get(key)).then((r) => (r && r.result !== undefined ? r.result : r));
  const getAll = (store)      => tx(store, 'readonly', (os) => os.getAll()).then((r) => (Array.isArray(r) ? r : (r && r.result) || []));
  const put    = (store, val) => tx(store, 'readwrite', (os) => os.put(val));
  const del    = (store, key) => tx(store, 'readwrite', (os) => os.delete(key));
  const clear  = (store)      => tx(store, 'readwrite', (os) => os.clear());
  const count  = (store)      => tx(store, 'readonly', (os) => os.count()).then((r) => (typeof r === 'number' ? r : (r && r.result) || 0));

  // Bulk replace a keyed collection in one transaction (clear + put many).
  function replaceAll(store, list) {
    return open().then((db) => new Promise((resolve) => {
      if (!db || !Array.isArray(list)) return resolve(false);
      let t; try { t = db.transaction(store, 'readwrite'); } catch { return resolve(false); }
      const os = t.objectStore(store);
      try { os.clear(); for (const it of list) if (it) os.put(it); } catch (e) { dbg('IDB', 'replaceAll ' + (e && e.message)); }
      t.oncomplete = () => resolve(true);
      t.onerror = t.onabort = () => resolve(false);
    }));
  }

  // ---- kv helpers -----------------------------------------------------------
  const kvGet = (k, dflt) => get('kv', k).then((r) => (r && 'v' in r ? r.v : dflt));
  const kvSet = (k, v)    => put('kv', { k, v, ts: Date.now() });
  const diagGet = (k, dflt) => get('diag', k).then((r) => (r && 'v' in r ? r.v : dflt));
  const diagSet = (k, v)    => put('diag', { k, v, ts: Date.now() });

  // ---- typed metadata cache (write-through from plex.js) --------------------
  // Each cache write stamps a per-kind timestamp in kv so the UI can say
  // "showing cached library from 8:42 PM" and diagnostics can show freshness.
  // ---- localStorage MIRROR --------------------------------------------------
  // IndexedDB is unreliable in iOS Home-Screen PWAs (can be missing, blocked, or
  // silently wiped). localStorage, by contrast, provably persists on this device
  // (the Plex token lives there). The offline-critical metadata is small (a few
  // hundred compact records), so we mirror it to localStorage and read from
  // whichever store actually has data. This is what makes offline content render
  // even when IndexedDB is empty.
  const LSK = { books: 'pb_cache_books', authors: 'pb_cache_authors', sync: 'pb_cache_sync' };
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { dbg('CACHE', 'ls set failed ' + k + ' (' + (e && e.name) + ')'); return false; } }
  function lsGet(k) { try { const j = localStorage.getItem(k); return j ? JSON.parse(j) : null; } catch { return null; } }
  const trKey = (book) => 'pb_cache_tr_' + book;
  const albKey = (rk) => 'pb_cache_alb_' + rk;

  function stampSync(kind) {
    const t = Date.now();
    const m = lsGet(LSK.sync) || {}; m[kind] = t; lsSet(LSK.sync, m);
    return kvSet('sync:' + kind, t);
  }
  async function syncedAt(kind) {
    const v = await kvGet('sync:' + kind, 0);
    if (v) return v;
    const m = lsGet(LSK.sync) || {}; return m[kind] || 0;
  }

  async function cacheBooks(list) {
    const ok = lsSet(LSK.books, list);                    // reliable mirror FIRST
    replaceAll('books', list);                            // IDB best-effort (fire-and-forget)
    await stampSync('books');
    dbg('CACHE', 'wrote ' + (list ? list.length : 0) + ' books (ls=' + ok + ')');
  }
  async function cachedBooks() {
    const idb = await getAll('books');
    if (idb && idb.length) { dbg('CACHE', 'read ' + idb.length + ' books (idb)'); return idb; }
    const ls = lsGet(LSK.books);
    dbg('CACHE', 'read ' + (ls ? ls.length : 0) + ' books (ls)');
    return ls || [];
  }
  async function cacheAuthors(list) { lsSet(LSK.authors, list); replaceAll('authors', list); await stampSync('authors'); dbg('CACHE', 'wrote ' + (list ? list.length : 0) + ' authors'); }
  async function cachedAuthors() { const idb = await getAll('authors'); if (idb && idb.length) return idb; return lsGet(LSK.authors) || []; }
  async function cacheTracks(book, tracks) { lsSet(trKey(book), tracks); put('tracks', { book: String(book), tracks, ts: Date.now() }); }
  async function cachedTracks(book) { const r = await get('tracks', String(book)); if (r && r.tracks) return r.tracks; return lsGet(trKey(book)); }
  async function cacheAlbum(alb) { if (!alb || alb.ratingKey == null) return; lsSet(albKey(alb.ratingKey), alb); put('albums', alb); }
  async function cachedAlbum(rk) { const r = await get('albums', rk); if (r) return r; return lsGet(albKey(rk)); }

  // ---- persistent storage ---------------------------------------------------
  // Ask the browser not to evict our origin's storage under pressure. Best-effort;
  // may be denied (or unsupported), so we record the result for diagnostics and
  // never assume it succeeded. Installed PWAs are MORE likely to be granted.
  async function persist() {
    const st = navigator.storage;
    if (!st || !st.persist) { await diagSet('persist', 'unsupported'); return 'unsupported'; }
    try {
      let already = st.persisted ? await st.persisted() : false;
      const granted = already || await st.persist();
      const res = granted ? 'granted' : 'denied';
      await diagSet('persist', res);
      dbg('IDB', 'persistent storage: ' + res);
      return res;
    } catch (e) { await diagSet('persist', 'error'); return 'error'; }
  }
  async function estimate() {
    const st = navigator.storage;
    if (!st || !st.estimate) return { supported: false };
    try { const e = await st.estimate(); return { supported: true, usage: e.usage || 0, quota: e.quota || 0 }; }
    catch { return { supported: false }; }
  }

  return {
    available, open,
    get, getAll, put, del, clear, count, replaceAll,
    kvGet, kvSet, diagGet, diagSet,
    stampSync, syncedAt,
    cacheBooks, cachedBooks, cacheAuthors, cachedAuthors,
    cacheTracks, cachedTracks, cacheAlbum, cachedAlbum,
    persist, estimate,
  };
})();

// Expose on window. A top-level `const Store` is a lexical global, NOT a property
// of window — so `window.Store` would be undefined without this. Every guard that
// reads `window.Store` depends on it.
if (typeof window !== 'undefined') window.Store = Store;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Store;
