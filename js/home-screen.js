// home-screen.js — the Home screen (Continue Listening + Recently Added + the
// Downloaded row), extracted from app.js. Review #20 (screen ownership), same
// pattern as options-screen.js / downloads-screen.js / signin-screen.js.
//
// Scope note: this owns the Home ORCHESTRATION only — fetch the library, derive
// the two feeds (PBLogic.homeFeeds), paint the carousels + skeletons + Downloaded
// row. It DELEGATES tile-building to the shared `renderTile` and live-number
// repaints to `renderPresence` — those live in app.js because they're welded to
// the live playback context (ctx/audio) and are driven ~4x/sec from timeupdate,
// shared across Home, Browse, and the files view. So this is a VIEW that injects
// the shared engine, not a copy of it.
//
// Reads stable window globals directly (Plex/Store/Browse/PBLogic/Downloads —
// the repo convention, cf. browse.js); app.js injects only what it owns:
// byId, renderTile, renderPresence, status (the #clStatus line), and the shared
// mutable bookEntries object (by reference — load() mutates it in place so
// app.js's bookLine sees the same map).
const HomeScreen = (() => {
  // Injected by app.js: { byId, renderTile, renderPresence, status, bookEntries }
  let d = null;
  let dlCarouselKey = null;
  let loadGen = 0;              // only the NEWEST load() may rewrite the shared bookEntries map

  // Paint the SHAPE of a carousel (shimmering tile placeholders) before any data
  // exists — a cold or offline first load then shows the home layout instead of a
  // spinner. Purely bundled CSS/markup (no network); replaced on first real render.
  function skeletonTiles(n) {
    let h = '';
    for (let i = 0; i < n; i++) {
      h += '<div class="tile sktile" aria-hidden="true">'
        + '<div class="skel skart"></div><div class="skel skline"></div><div class="skel skline short"></div></div>';
    }
    return h;
  }
  function renderSkeletonCarousel(row, n) { if (row) row.innerHTML = skeletonTiles(n || 5); }
  // Skeleton BOTH home carousels (Continue Listening = 4, Recently Added = 6),
  // shown on a cold/first load while Plex connects.
  function showSkeletons() { const $ = d.byId; renderSkeletonCarousel($('clRow'), 4); renderSkeletonCarousel($('raRow'), 6); }

  function renderCarousel(row, books) {
    // On a background-revalidate repaint, patch only the tiles that changed (reuse
    // unchanged covers) instead of rebuilding the whole carousel. Falls back to a
    // full rebuild on first paint or any structural change (add/remove/re-sort).
    if (books.length && row.querySelector('[data-key]') && Browse.patchRows(row, books, d.renderTile, Browse.bookSig)) return;
    row.innerHTML = '';
    if (!books.length) { row.innerHTML = '<div class="empty carousel-empty">Nothing here yet.</div>'; return; }
    for (const b of books) row.appendChild(d.renderTile(b));
  }

  async function renderDownloaded() {
    const $ = d.byId;
    const section = $('dlSection'), row = $('dlRow');
    if (!section || !row || !window.Downloads || !Downloads.available()) { if (section) section.classList.add('hidden'); return; }
    const rows = await Downloads.listDownloaded();
    const key = rows.map((r) => r.book).join(',');
    if (key === dlCarouselKey) return;
    dlCarouselKey = key;
    if (!rows.length) { section.classList.add('hidden'); row.innerHTML = ''; return; }
    section.classList.remove('hidden');
    row.innerHTML = '';
    for (const r of rows) row.appendChild(d.renderTile({ ratingKey: r.book, title: r.title, parentTitle: r.author, thumb: r.thumb }));
  }

  // Render the two home carousels from the last-known library in IndexedDB (no
  // network). Mirrors load()'s derivation (recently-played + recently-added)
  // but purely from cache. Returns true if it painted anything. Covers come from
  // the SW image cache via Plex.artUrl (resolved against the last-good host).
  async function renderCached() {
    const $ = d.byId;
    if (!window.Store) { if (window.PBDebug) PBDebug.log('CACHE', 'renderCachedHome: no Store'); return false; }
    try {
      const books = await Store.cachedBooks();
      if (window.PBDebug) PBDebug.log('CACHE', 'renderCachedHome: ' + (books ? books.length : 0) + ' cached books');
      if (!books || !books.length) return false;
      const { cont, recentlyAdded } = PBLogic.homeFeeds(books, d.bookEntries);
      renderCarousel($('clRow'), cont);
      renderCarousel($('raRow'), recentlyAdded);
      renderDownloaded();
      d.renderPresence();
      return true;
    } catch (e) { if (window.PBDebug) PBDebug.log('CACHE', 'renderCachedHome threw ' + (e && e.message)); return false; }
  }

  // Fetch + render the two home carousels (shared by initial load + pull-to-refresh).
  async function load(opts = {}) {
    const $ = d.byId, bookEntries = d.bookEntries;
    // OWNERSHIP: `resume` below is captured BEFORE both awaits, and paint() WIPES the
    // shared bookEntries map and refills it from that snapshot. bookEntries is owned by
    // app.js and read by the live playback path (bestSource), so a load finishing late
    // undoes whatever happened to the map while it was in flight. Four call sites reach
    // load() — enterApp, pull-to-refresh, onReconnect and doResetProgress — so overlap
    // is ordinary, not exotic. Concretely: Reset Progress deletes bookEntries[book] and
    // reloads (app.js:1757-1758); an older in-flight load then paints the book straight
    // back from its pre-reset snapshot. Own the paint by generation so only the NEWEST
    // load may rewrite the shared map.
    const myGen = ++loadGen;
    // The whole-library fetch (cached) powers both carousels + browse. The LMS
    // plugin's resume playlist is OPTIONAL — a best-effort ADDITIVE layer: when
    // it's absent (app-only user) getResumeMap returns [], and a fetch error is
    // swallowed, so the home feed always renders from Plex alone. When present it
    // supplies exact resume offsets + surfaces books listened to on the LMS side.
    const resume = await Plex.getResumeMap().catch(() => []);
    // Persist the resume map so bookEntries can be hydrated before the first cached paint
    // next launch — getResumeMap is a live, UNCACHED /playlists read, so without this the
    // cold (grey) resume time pops in a second+ after the tiles paint. Only cache a
    // non-empty result: a transient failure returns [] and must not wipe the cache.
    if (resume.length) { try { localStorage.setItem('pb_resumeMap', JSON.stringify(resume)); } catch { /* best effort */ } }
    // paint() derives BOTH carousels from a whole-library `books` array, so it can
    // run twice: once on the instant cache-first read, then again if the background
    // revalidate brings changed data (onFresh). Continue Listening + Recently Added
    // are pure derivations of the library list, so we derive them here rather than
    // re-fetch (which would also re-trigger revalidation).
    const paint = (books) => {
      if (myGen !== loadGen) return;   // a newer load owns bookEntries now — this snapshot is stale
      for (const k in bookEntries) delete bookEntries[k];
      for (const b of resume) bookEntries[b.book] = b;
      const { cont, recentlyAdded } = PBLogic.homeFeeds(books, bookEntries);
      renderCarousel($('clRow'), cont);
      d.status(cont.length ? '' : 'No books in progress yet — pick one from Books or Authors.');
      renderCarousel($('raRow'), recentlyAdded);
      renderDownloaded();
      d.renderPresence();   // paint live numbers on the tiles
    };
    const books = await Plex.getBooks({ force: opts.force, onFresh: (fresh) => { if (!document.hidden) paint(fresh); } });
    paint(books);
  }

  function init(deps) { d = deps; }

  return { init, renderCached, load, showSkeletons, renderDownloaded };
})();

if (typeof window !== 'undefined') window.HomeScreen = HomeScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = HomeScreen;
