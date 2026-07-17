// browse.js — full-library browse renderer (Authors / Books / an author's books
// / a book's files) with a vertical A–Z quick-index. PURE RENDERER: navigation
// is owned by the host via the History API, so Browse just paints whatever
// screen descriptor it's handed and calls back (onOpenAuthor/onOpenFiles/onBack/
// onPlay/onPlayFile) for actions. Authors is the light path (no time work);
// Books & Files rows carry data-book / data-track so the host's presence tick
// keeps resume/peer numbers live.
const Browse = (() => {
  let o = {};                     // { mount, fmt, onPlay, onPlayFile, onOpenAuthor, onOpenFiles, onBack, getResumeEntry, getChapterPct, bindDlBtn, onRender, playingTrackKey }
  let authorsCache = null;        // authors list is stable within a session (books are cached in plex.js)

  // ---- rendered-page CACHE -------------------------------------------------
  // Each browse screen is built ONCE into its own `.browsepage` node, kept
  // attached (just hidden) inside o.mount. Navigating back to it — or clicking
  // the same tab again, or swiping — just toggles visibility: the DOM (and its
  // already-loaded cover <img>s) is reused, so nothing re-fetches or re-flashes.
  // Cached pages stay in the document, so the host's presence tick keeps their
  // resume/peer numbers live. LRU-capped to bound memory.
  const pageCache = new Map();    // key -> { el, order }
  const MAX_PAGES = 12;
  let orderSeq = 0;
  const keyOf = (d) => d.v === 'authorBooks' ? 'author:' + d.author.ratingKey
    : d.v === 'files' ? 'files:' + d.book.ratingKey : d.v;

  // ---- fill-to-budget virtualization (scaling WS1b/c) -------------------------
  // A list past VirtualList.FULL_RENDER_MAX renders through js/virtuallist.js
  // (per-group shells + windowed rows); at or under it, the classic full renderer
  // below runs byte-for-byte unchanged. The controller lifecycle is OWNED HERE
  // (the §6.5 state machine): showPage() activates the shown page's controller
  // and deactivates the rest; evictLRU/clearCache/reset/buildFor destroy them.
  const VL = (typeof VirtualList !== 'undefined') ? VirtualList : null;
  let vlOpts = null;              // test-only override (injected metrics/strides)
  function vStrides(container) {
    let row = 94, header = 35;    // fallbacks; CSS custom props are the source of truth
    try {
      const cs = getComputedStyle(container);
      row = parseFloat(cs.getPropertyValue('--v-row')) || row;
      header = parseFloat(cs.getPropertyValue('--v-head')) || header;
    } catch { /* jsdom / detached */ }
    return { row, header };
  }
  // A removed virtual row must detach its cover from the art pipeline (the IO
  // retains observed targets — this is the leak the plan calls out).
  function releaseRow(el) {
    if (typeof window === 'undefined' || !window.ArtLoader || !ArtLoader.release) return;
    el.querySelectorAll('img[data-art]').forEach((img) => ArtLoader.release(img));
  }
  // Newly materialized rows need live resume/peer numbers NOW, not at the next
  // 1s tick — rAF-debounced so a realize burst costs one onRender.
  let renderPing = false;
  function pingRender() {
    if (renderPing) return;
    renderPing = true;
    requestAnimationFrame(() => { renderPing = false; o.onRender(); });
  }
  function destroyController(el) {
    if (el && el._vctl) { el._vctl.destroy(); el._vctl = null; }
  }

  function init(opts) { o = opts; }
  function reset() {
    authorsCache = null;
    pageCache.forEach((v) => destroyController(v.el));
    pageCache.clear();
    if (o.mount) o.mount.innerHTML = '';
  }
  // Drop cached pages so lists rebuild from fresh data (pull-to-refresh). Safe to
  // call while browse is hidden (home). Removes the page nodes; keeps the mount.
  function clearCache() {
    authorsCache = null;
    pageCache.forEach((v) => { destroyController(v.el); if (v.el.parentNode) v.el.remove(); });
    pageCache.clear();
  }

  const spinnerHTML = '<div class="center"><div class="spinner"></div></div>';

  // First-load placeholder: for a list view (Authors/Books) show shimmering
  // skeleton rows so the list's SHAPE is visible while it fetches, instead of a
  // spinner; the file/details view keeps the spinner (short, non-list). Pure
  // bundled markup, replaced by buildFor() once data arrives.
  function skelRows(n) {
    let h = '';
    for (let i = 0; i < (n || 9); i++) {
      h += '<div class="book skrow" aria-hidden="true"><div class="skel skart"></div>'
        + '<div class="skmeta"><div class="skel skline"></div><div class="skel skline short"></div></div></div>';
    }
    return h;
  }
  function placeholderFor(desc) {
    return desc.v === 'files' ? spinnerHTML : `<div class="browselist">${skelRows(9)}</div>`;
  }

  // ---- per-page scroll memory ----------------------------------------------
  // Browse pages all ride the ONE shared document scroll, so a page's position is
  // lost the moment you go anywhere else (Home resets it, another page overwrites
  // it). Remember it per cache entry (`sy`) and put it back on return.
  //
  // Captured from a passive scroll listener rather than a "leaving" hook because
  // there is no single leave path — you can swap pages, tap Home, open Options, or
  // swipe. `restoring` gates it: swapping pages changes the document height, so the
  // browser clamps scrollY and fires a scroll event that would otherwise record a
  // bogus position against the page we're arriving at.
  let restoring = false;
  let restoreGen = 0;
  // ONE owned restoration operation. beginRestore() takes ownership and hands back a
  // token; only the CURRENT owner may end it. Without the token an older restore's
  // delayed (2-frame) finalizer clears the flag out from under a NEWER restore that
  // started in the meantime — the scroll listener then records the swap's transitional
  // /clamped position over the arriving page's `sy`, losing exactly what this system
  // exists to keep. Same stale-finalizer class as the .89 connect() bug, where a
  // superseded probe's finalizer cleared a newer probe's state; fixed the same way.
  function beginRestore() { restoring = true; return ++restoreGen; }
  function endRestore(token) { if (token === restoreGen) restoring = false; }
  const browseVisible = () => !!(o.mount && !o.mount.classList.contains('hidden'));
  function activeEntry() {
    for (const v of pageCache.values()) if (!v.el.classList.contains('hidden')) return v;
    return null;
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      if (restoring || !browseVisible()) return;
      const cur = activeEntry();
      if (cur) cur.sy = window.scrollY || 0;
    }, { passive: true });
  }
  // Pure: clamp to what's actually scrollable — this is what makes "as close to the
  // top as possible" true for a track near the END of the list (it can't reach the
  // top; the document simply runs out).
  function clampY(y, scrollHeight, innerHeight) {
    const max = Math.max(0, scrollHeight - innerHeight);
    return Math.max(0, Math.min(max, Math.round(y || 0)));
  }
  // Pure: the Y a page opens at. Files pages never restore a saved position — they
  // open at the locally-playing track, else the top; every other page returns to
  // where you left it.
  function entryScrollY(descV, savedY, trackY) {
    if (descV === 'files') return trackY == null ? 0 : trackY;
    return savedY || 0;
  }
  function applyScrollY(y) {
    const se = document.scrollingElement || document.documentElement;
    const mine = beginRestore();
    window.scrollTo(0, clampY(y, se.scrollHeight, window.innerHeight));
    // Two frames: the scroll + any clamp it provokes must both land first.
    requestAnimationFrame(() => requestAnimationFrame(() => endRestore(mine)));
  }
  // Document Y that puts the locally-playing track's row just under the fixed title
  // bar. null when this book isn't the one loaded here (or its row isn't built).
  function playingTrackY(book, page) {
    if (!o.playingTrackKey || !book) return null;
    const tk = o.playingTrackKey(book.ratingKey);
    if (tk == null) return null;
    const row = page.querySelector('.filerow[data-track="' + String(tk).replace(/"/g, '\\"') + '"]');
    if (!row) return null;
    const bar = document.querySelector('.topbar');
    const clear = (bar ? bar.getBoundingClientRect().bottom : 0) + 8;   // sit just below it
    return (window.scrollY || 0) + row.getBoundingClientRect().top - clear;
  }
  // Where a page sits when you arrive at it (see entryScrollY for the rule).
  function positionOnEnter(desc, page, savedY) {
    const trackY = desc.v === 'files' ? playingTrackY(desc.book, page) : null;
    applyScrollY(entryScrollY(desc.v, savedY, trackY));
  }

  function showPage(key) {
    // NB: do NOT save the outgoing page's scroll here. The scroll listener above
    // already records it continuously while browse is on screen, and saving here is
    // actively WRONG when we're re-ENTERING browse from elsewhere: applyScreen calls
    // setView('browse') before render, so browse already counts as visible, while
    // activeEntry() still points at the page we're about to show (leaving browse
    // hides the #browse CONTAINER, never the page node) and window.scrollY still
    // belongs to Home/Options. That saved Home's scroll over the page's own and made
    // the nav-button path always land at the top (swiping was fine — there the
    // outgoing really is another browse page).
    beginRestore();   // the swap resizes the document → ignore the clamp's scroll event.
    // Takes ownership too, so a previous restore's in-flight finalizer can't end
    // ours; the applyScrollY that follows (immediately on a cache hit, or after the
    // fetch on a fresh page) owns it from there and clears it.
    for (const [k, v] of pageCache) v.el.classList.toggle('hidden', k !== key);
    // Virtual controllers follow visibility: the shown page's controller realizes;
    // hidden ones dematerialize to ~0 rows (keep data + anchor).
    for (const [k, v] of pageCache) {
      const c = v.el._vctl;
      if (!c) continue;
      if (k === key) c.activate(); else c.deactivate();
    }
  }
  function evictLRU(keepKey) {
    while (pageCache.size > MAX_PAGES) {
      let oldK = null, oldO = Infinity;
      for (const [k, v] of pageCache) if (k !== keepKey && v.order < oldO) { oldO = v.order; oldK = k; }
      if (oldK == null) break;
      const v = pageCache.get(oldK);
      if (v) { destroyController(v.el); if (v.el.parentNode) v.el.remove(); }
      pageCache.delete(oldK);
    }
  }

  // Fetch a screen's data (the ONLY async part); build is synchronous below so a
  // concurrent nav can't interleave the shared paint target. Cache-first: the
  // getters return the last-known data instantly and revalidate in the
  // background — `onFresh(data)` fires (with the already-merged screen data) when
  // a background refresh differs, so render() can repaint in place. authorBooks
  // has two sources (author meta + book list); we keep a local merged copy and
  // re-emit whichever half refreshes, so neither has to re-fetch the other.
  async function fetchFor(desc, onFresh) {
    if (desc.v === 'authors') {
      if (!authorsCache) authorsCache = await Plex.getAuthors({ onFresh: (a) => { authorsCache = a; if (onFresh) onFresh(a); } });
      return authorsCache;
    }
    if (desc.v === 'books') return await Plex.getBooks({ onFresh });
    if (desc.v === 'authorBooks') {
      const cur = { author: null, books: null };
      const emit = () => { if (cur.author && cur.books && onFresh) onFresh({ author: cur.author, books: cur.books }); };
      const [author, books] = await Promise.all([
        Plex.getAuthor(desc.author.ratingKey, { onFresh: (a) => { if (a) { cur.author = a; emit(); } } }),
        Plex.getAuthorBooks(desc.author.ratingKey, { onFresh: (b) => { cur.books = b; emit(); } }),
      ]);
      cur.author = author || { ...desc.author, thumb: null, childCount: books.length, summary: '' };
      cur.books = books;
      return { author: cur.author, books: cur.books };
    }
    if (desc.v === 'files') return await Plex.getAlbumTracks(desc.book.ratingKey, { onFresh });
  }
  function buildFor(desc, data, el) {
    destroyController(el);   // a structural rebuild replaces any prior virtual controller
    if (desc.v === 'authors') listView(el, 'Authors', data, authorRow, false);
    else if (desc.v === 'books') listView(el, 'Books', data, bookRow, false);
    else if (desc.v === 'authorBooks') authorView(el, data.author, data.books);
    else if (desc.v === 'files') filesView(el, desc.book, data);
    // A rebuilt virtual page must resume realizing if it's the page on screen.
    if (el._vctl && !el.classList.contains('hidden') && browseVisible()) el._vctl.activate();
  }

  // ---- in-place keyed reconcile (background-revalidate repaint) -------------
  // When a stale-while-revalidate refresh brings CHANGED data, update ONLY the
  // rows that differ instead of rebuilding the whole list — a huge library
  // shouldn't re-render (and re-decode every cover) to reflect one book's
  // progress. Each row carries data-key + a `_sig` JSON signature.
  //
  // Content signatures = what a row actually DISPLAYS (cover/title/author/progress),
  // NOT the raw record. Invisible bookkeeping (lastViewedAt/addedAt) churns on the
  // active book every open; keying off it re-rendered rows for changes you can't
  // see. patchRows compares row._sig against sigFn(item) with the SAME projection —
  // they MUST match, or every row looks "changed" and the whole list rebuilds.
  const bookSig = (b) => JSON.stringify([b.thumb, b.title, b.parentTitle, b.leafCount, b.viewedLeafCount]);
  const authorSig = (a) => JSON.stringify([a.thumb, a.title, a.childCount]);

  // Move the already-decoded cover <img> from the old row into the rebuilt row
  // when the art is unchanged, so a rebuilt row never re-decodes/flashes a cover
  // that didn't change.
  function keepCover(oldRow, newRow) {
    const a = oldRow.querySelector('img.cover');
    const b = newRow.querySelector('img.cover');
    if (a && b && a.getAttribute('data-art') === b.getAttribute('data-art') && a.dataset.artState === 'done') b.replaceWith(a);
  }
  // Patch container's rows to `items`, matched BY KEY (order-independent — browse
  // lists are laid out sorted/letter-grouped, not in the fetch order). Returns
  // false (→ caller full-rebuilds) if the key SET changed (a book added/removed);
  // otherwise rebuilds ONLY the rows whose `_sig` differs, in place, reusing every
  // other row and every unchanged cover as-is. (A re-sort of the SAME set isn't
  // reflected until the next full render — negligible vs. re-rendering everything;
  // sort keys almost never change mid-session.)
  function patchRows(container, items, rowFn, sigFn) {
    const rows = container.querySelectorAll('[data-key]');
    if (rows.length !== items.length) return false;
    const byKey = new Map();
    for (const r of rows) byKey.set(r.dataset.key, r);
    for (const it of items) if (!byKey.has(String(it.ratingKey))) return false;   // new/removed key → structural
    for (const it of items) {
      const row = byKey.get(String(it.ratingKey));
      if (row._sig === sigFn(it)) continue;   // same VISIBLE content → untouched (no flash)
      const fresh = rowFn(it);
      keepCover(row, fresh);
      row.replaceWith(fresh);
    }
    return true;
  }
  // Try an in-place patch for this screen; false → the caller does a full rebuild.
  function patchInPlace(desc, page, data) {
    // A VIRTUAL page never goes through patchRows (it counts rows — realized ≠
    // total would always read as structural). The controller's update() rebuilds
    // the model and keeps the viewport anchored (SWR never jumps the view).
    const ctl = page._vctl;
    if (ctl) {
      if (desc.v === 'authors' || desc.v === 'books') { ctl.update(groupedFor(data)); return true; }
      if (desc.v === 'authorBooks') {
        if (JSON.stringify(data.author) !== page._authorSig) return false;   // header changed → full rebuild
        ctl.update([{ letter: '', items: data.books.slice().sort(bySort) }]);
        return true;
      }
      return false;
    }
    if (desc.v === 'authors') return patchRows(page, data, authorRow, authorSig);
    if (desc.v === 'books') return patchRows(page, data, bookRow, bookSig);
    if (desc.v === 'authorBooks') {
      if (JSON.stringify(data.author) !== page._authorSig) return false;   // header (avatar/bio/count) changed → full rebuild
      return patchRows(page, data.books, bookRow, bookSig);
    }
    return false;   // files: no covers → full rebuild is cheap + flash-free
  }

  // Render a screen from its descriptor: {v:'authors'|'books'|'authorBooks'|'files', ...}
  async function render(desc) {
    const key = keyOf(desc);
    const hit = pageCache.get(key);
    if (hit) {                        // CACHE HIT → instant, no rebuild, no image reload
      hit.order = ++orderSeq;
      showPage(key);
      o.onRender();                   // refresh live resume/peer numbers on the shown page
      positionOnEnter(desc, hit.el, hit.sy);   // back where you left it (files: at the playing track)
      return;
    }
    // CACHE MISS → fetch, then build into a fresh page node and show it. A brief
    // spinner page covers the fetch so the previous page isn't left frozen.
    const page = document.createElement('div');
    page.className = 'browsepage';
    page.innerHTML = placeholderFor(desc);
    o.mount.appendChild(page);
    pageCache.set(key, { el: page, order: ++orderSeq });
    showPage(key);                    // show this fresh page, hide the rest
    try {
      // Cache-first: `data` is the last-known copy (instant, even on a slow relay);
      // `onFresh` repaints this same page node in place if a background revalidate
      // brings changed data — but only while this exact node is still the cached
      // page (a later nav may have evicted/replaced it).
      const repaint = (fresh) => {
        const cur = pageCache.get(key);
        if (!cur || cur.el !== page || !page.isConnected) return;
        // Only touch rows that actually changed; full rebuild just for a
        // structural change (add/remove/re-sort).
        if (!patchInPlace(desc, page, fresh)) buildFor(desc, fresh, page);
        o.onRender();
      };
      const data = await fetchFor(desc, repaint);
      page.innerHTML = '';
      buildFor(desc, data, page);
    } catch (e) { page.innerHTML = `<div class="empty">⚠️ ${e.message || 'Could not load.'}</div>`; }
    evictLRU(key);
    o.onRender();
    // A fresh page has no saved position → top; a files page for the book playing
    // here opens at its current track. Positioned AFTER onRender so the rows are
    // built and laid out (the files case measures a row).
    positionOnEnter(desc, page, 0);
  }

  // ---- grouping by first sort-letter --------------------------------------
  const letterOf = (s) => {
    const c = (s || '').trim().charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : '#';
  };
  const bySort = (a, b) =>
    (a.titleSort || a.title || '').localeCompare(b.titleSort || b.title || '', undefined, { sensitivity: 'base', numeric: true });

  function groupByLetter(items) {
    const groups = new Map();
    for (const it of items.slice().sort(bySort)) {
      const L = letterOf(it.titleSort || it.title);
      if (!groups.has(L)) groups.set(L, []);
      groups.get(L).push(it);
    }
    const letters = [...groups.keys()].sort((a, b) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)));
    return { groups, letters };
  }

  // ---- header (circle back button for drill-downs) ------------------------
  function header(title, drill) {
    const head = document.createElement('div');
    head.className = 'browsehead';
    if (drill) {
      const b = document.createElement('button');
      b.className = 'backbtn'; b.setAttribute('aria-label', 'Back'); b.textContent = '‹';
      b.onclick = () => o.onBack();
      head.appendChild(b);
    }
    if (title) {   // author page passes no title — just the back button
      const h = document.createElement('div');
      h.className = 'browsetitle'; h.textContent = title;
      head.appendChild(h);
    }
    return head;
  }

  // ---- list views (Authors / Books / author's books) ----------------------
  // Each *View builds into the passed page node `m` (a .browsepage in the cache),
  // NOT directly into o.mount — so pages persist. Scroll/onRender are the host's
  // (render()) job. Letter-group ids are page-scoped to stay unique across pages.
  // WS4.1: a truncated listing is surfaced ON THE AFFECTED LIST, not only in a
  // debug line — no silent caps. (kind: 'authors' | 'books'.)
  function truncationNote(kind) {
    const t = (typeof Plex !== 'undefined' && Plex.libraryTruncation) ? Plex.libraryTruncation()[kind] : null;
    if (!t || t.state === 'complete') return null;
    const el = document.createElement('div');
    el.className = 'statusline truncnote';
    el.textContent = t.state === 'truncated'
      ? `⚠️ Showing the first ${t.returned.toLocaleString()} of ${t.total.toLocaleString()} — the list is truncated.`
      : `⚠️ Showing ${t.returned.toLocaleString()} — the list may be truncated.`;
    return el;
  }

  // groupByLetter's Map → the [{letter, items}] shape the virtualizer consumes.
  function groupedFor(items) {
    const { groups, letters } = groupByLetter(items);
    return letters.map((L) => ({ letter: L, items: groups.get(L) }));
  }

  // Windowed list for a >FULL_RENDER_MAX page: same header/index/rows, but rows
  // materialize through the controller (created here; ACTIVATED by showPage —
  // the lifecycle owner). `flat` = the author-page shape: one headerless group,
  // no A–Z index.
  function virtualView(m, list, groupedItems, rowFn, letters) {
    list.classList.add('virtual-list');
    m.appendChild(list);
    const ctl = VL.createController(Object.assign({
      container: list,
      groupedItems,
      rowFn,
      strides: vStrides(list),
      release: releaseRow,
      onMaterialized: pingRender,
      scrollTo: (y) => window.scrollTo(0, y),
    }, vlOpts || {}));
    m._vctl = ctl;
    if (letters) m.appendChild(buildIndex(m, letters));
  }

  function listView(m, title, items, rowFn, drill) {
    const { groups, letters } = groupByLetter(items);
    m.innerHTML = '';
    m.appendChild(header(`${title} · ${items.length}`, drill));
    const note = truncationNote(title === 'Authors' ? 'authors' : 'books');
    if (note) m.appendChild(note);
    const list = document.createElement('div');
    list.className = 'browselist';
    if (VL && items.length > VL.FULL_RENDER_MAX) {   // fill-to-budget: same look, windowed rows
      virtualView(m, list, letters.map((L) => ({ letter: L, items: groups.get(L) })), rowFn, letters);
      return;
    }
    for (const L of letters) {
      const g = document.createElement('div');
      g.className = 'lettergroup'; g.dataset.sec = L;
      const lh = document.createElement('div');
      lh.className = 'letterhead'; lh.textContent = L;
      g.appendChild(lh);
      for (const it of groups.get(L)) g.appendChild(rowFn(it));
      list.appendChild(g);
    }
    m.appendChild(list);
    m.appendChild(buildIndex(m, letters));
  }

  // Author page: back button only (no name beside it), a centered header block
  // (avatar, bold name, "N books", blurb), then the letter-grouped book list.
  function authorView(m, author, books) {
    m.innerHTML = '';
    m._authorSig = JSON.stringify(author);   // so a revalidate can tell if the header changed (patchInPlace)
    m.appendChild(header('', true));
    m.appendChild(authorHeader(author, books.length));
    // No A–Z index here → book rows span the full width.
    const list = document.createElement('div');
    list.className = 'browselist authorlist';
    if (VL && books.length > VL.FULL_RENDER_MAX) {   // one flat headerless group, windowed
      virtualView(m, list, [{ letter: '', items: books.slice().sort(bySort) }], bookRow, null);
      return;
    }
    for (const b of books.slice().sort(bySort)) list.appendChild(bookRow(b));
    m.appendChild(list);
  }

  function authorHeader(author, count) {
    const wrap = document.createElement('div');
    wrap.className = 'authorhead';
    const cover = author.thumb ? Plex.artUrl(author.thumb) : null;
    wrap.innerHTML = `
      ${cover ? `<img class="authoravatar" data-art="${cover}" decoding="async" alt="">` : '<div class="authoravatar art-failed"></div>'}
      <div class="authorname"></div>
      <div class="authorcount">${count} ${count === 1 ? 'book' : 'books'}</div>
      <div class="authorblurb">
        <div class="blurbtext"></div>
        <button class="readmore" type="button">read more</button>
      </div>`;
    wrap.querySelector('.authorname').textContent = author.title;
    const blurb = wrap.querySelector('.blurbtext');
    const rm = wrap.querySelector('.readmore');
    blurb.textContent = author.summary || '';
    if (!author.summary) { wrap.querySelector('.authorblurb').style.display = 'none'; }
    let overflows = false;
    // Toggle: click the blurb (or the button) to expand; click the expanded
    // blurb to collapse again.
    const toggle = () => {
      const open = blurb.classList.toggle('expanded');
      rm.textContent = open ? 'read less' : 'read more';
      rm.style.display = overflows ? 'block' : 'none';
    };
    blurb.addEventListener('click', toggle);
    rm.addEventListener('click', toggle);
    // Only offer "read more" if the blurb is actually clamped.
    requestAnimationFrame(() => { overflows = blurb.scrollHeight > blurb.clientHeight + 2; rm.style.display = overflows ? 'block' : 'none'; });
    return wrap;
  }

  function authorRow(a) {
    const el = document.createElement('div');
    el.className = 'book authrow';
    el.dataset.key = String(a.ratingKey);   // for in-place reconcile (patchRows)
    el._sig = authorSig(a);                  // visible-projection sig (MUST match patchRows' sigFn)
    const cover = a.thumb ? Plex.artUrl(a.thumb) : null;
    el.innerHTML = `
      <img class="cover${cover ? '' : ' art-failed'}" ${cover ? `data-art="${cover}"` : ''} decoding="async" alt="">
      <div class="meta"><div class="title"></div><div class="author"></div></div>
      <span class="chev">›</span>`;
    el.querySelector('.title').textContent = a.title;
    el.querySelector('.author').textContent = a.childCount + (a.childCount === 1 ? ' book' : ' books');
    el.onclick = () => o.onOpenAuthor(a);
    return el;
  }

  // Cover = resume-from-last-position; rest of row = drill into files.
  function bookRow(b) {
    const el = document.createElement('div');
    el.className = 'book';
    el.dataset.book = b.ratingKey;
    el.dataset.key = String(b.ratingKey);   // stable key for in-place reconcile (patchRows)
    el._sig = bookSig(b);                    // visible-projection sig (MUST match patchRows' sigFn)
    const cover = b.thumb ? Plex.artUrl(b.thumb) : null;
    const total = b.leafCount || 0, done = b.viewedLeafCount || 0;
    const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    el.innerHTML = `
      <div class="covertap" title="Resume">
        <img class="cover${cover ? '' : ' art-failed'}" ${cover ? `data-art="${cover}"` : ''} decoding="async" alt="">
        <span class="playoverlay">▶</span>
      </div>
      <div class="meta">
        <div class="title"></div>
        <div class="author"></div>
        <div class="pline"><div class="pname"></div><div class="ptimes"></div></div>
        <div class="progress"><i style="width:${pct}%"></i></div>
      </div>
      <button class="dlbtn" data-book="${b.ratingKey}" aria-label="Download"></button>`;
    el.querySelector('.title').textContent = b.title;
    el.querySelector('.author').textContent = b.parentTitle || '';
    el.querySelector('.covertap').addEventListener('click', (e) => { e.stopPropagation(); o.onPlay(b.ratingKey, b); });
    if (o.bindDlBtn) o.bindDlBtn(el.querySelector('.dlbtn'), b);   // offline-download button
    el.addEventListener('click', () => o.onOpenFiles(b));
    return el;
  }

  // ---- files view (a book's chapters) -------------------------------------
  // Per-chapter completion, most-truthful source first:
  //   1) our OWN recorded progress for this chapter (how far we actually played it —
  //      the honest per-chapter %, since Plex hides audiobook viewOffset over HTTP),
  //   2) the live resume chapter's offset (a cold peer/plugin source),
  //   3) Plex viewCount>0 → finished (100),
  //   4) otherwise 0 — we have no evidence it was played (NOT the old "everything
  //      before your spot is 100%" guess, which painted skipped chapters full).
  function filePct(t, resume, book) {
    const mine = o.getChapterPct ? o.getChapterPct(book, t.ratingKey, t.durationMs) : null;
    if (mine != null) return mine;
    if (resume && String(t.ratingKey) === String(resume.track))
      return t.durationMs ? Math.min(100, Math.round(((resume.offsetMs || 0) / t.durationMs) * 100)) : 0;
    if (t.viewCount > 0) return 100;
    return 0;
  }

  function filesView(m, book, tracks) {
    m.innerHTML = '';
    // Deliberately NOT virtualized (chapter lists are small) — but a pathological
    // count must not pass silently (scaling plan WS1c).
    if (tracks.length > 600 && typeof PBDebug !== 'undefined') PBDebug.log('BROWSE', 'pathological chapter count: ' + tracks.length + ' (book ' + book.ratingKey + ')');
    m.appendChild(header(book.title || 'Book', true));
    const resume = o.getResumeEntry ? o.getResumeEntry(book.ratingKey) : null;

    const list = document.createElement('div');
    list.className = 'filelist';
    tracks.forEach((t, i) => {
      const pct = filePct(t, resume, book.ratingKey);
      const startMs = (resume && String(t.ratingKey) === String(resume.track)) ? (resume.offsetMs || 0) : 0;
      const row = document.createElement('div');
      row.className = 'filerow'; row.dataset.track = t.ratingKey; row.dataset.book = book.ratingKey;
      row.innerHTML = `
        <div class="fmeta">
          <div class="ftitle"></div>
          <div class="fsub">${pct ? pct + '%' : ''} · ${o.fmt((t.durationMs || 0) / 1000)}</div>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <div class="bufbar"></div>
        </div>`;
      row.querySelector('.ftitle').textContent = t.title || ('Chapter ' + (i + 1));
      row.onclick = () => o.onPlayFile(book, t, startMs);
      list.appendChild(row);
    });
    m.appendChild(list);
  }

  // ---- vertical A–Z quick index (haptic + highlight while sweeping) --------
  // `m` is the owning page so section jumps resolve within THIS page (ids would
  // collide now that multiple pages coexist in the cache — use data-sec instead).
  function buildIndex(m, letters) {
    const idx = document.createElement('div');
    idx.className = 'alphaindex';
    for (const L of letters) {
      const s = document.createElement('span');
      s.className = 'alpha'; s.textContent = L; s.dataset.letter = L;
      idx.appendChild(s);
    }
    const spans = idx.querySelectorAll('.alpha');
    const scrollTo = (L) => { const el = m.querySelector('.lettergroup[data-sec="' + L + '"]'); if (el) el.scrollIntoView({ block: 'start' }); };
    let cur = null;
    const highlight = (L) => {
      if (L === cur) return false;                    // no change → no re-fire
      cur = L;
      spans.forEach((s) => s.classList.toggle('on', s.dataset.letter === L));
      if (navigator.vibrate) navigator.vibrate(8);    // quick haptic (Android; iOS Safari ignores)
      return true;
    };
    const clear = () => { cur = null; spans.forEach((s) => s.classList.remove('on')); };
    const jump = (clientY) => {
      if (!spans.length) return;
      const rect = idx.getBoundingClientRect();
      const r = Math.max(0, Math.min(0.9999, (clientY - rect.top) / rect.height));
      const L = spans[Math.floor(r * spans.length)].dataset.letter;
      highlight(L); scrollTo(L);
    };
    idx.addEventListener('click', (e) => { const t = e.target.closest('.alpha'); if (t) { highlight(t.dataset.letter); scrollTo(t.dataset.letter); setTimeout(clear, 180); } });
    idx.addEventListener('pointermove', (e) => { if (e.buttons) jump(e.clientY); });
    idx.addEventListener('pointerup', clear);
    idx.addEventListener('pointerleave', clear);
    idx.addEventListener('touchmove', (e) => { jump(e.touches[0].clientY); e.preventDefault(); }, { passive: false });
    idx.addEventListener('touchend', clear);
    idx.addEventListener('touchcancel', clear);
    return idx;
  }

  return { init, reset, render, clearCache, patchRows, bookSig,
    // internals exposed for unit tests only (no runtime behaviour change)
    _test: { keepCover, authorSig, bookSig, bookRow, authorRow, entryScrollY, clampY,
      applyScrollY, showPage, isRestoring: () => restoring,
      listView, authorView, patchInPlace, groupedFor, pageCache,
      setVlOpts: (v) => { vlOpts = v; } } };
})();

// Expose on window (top-level `const Browse` is a lexical global, not
// window.Browse); app.js reads `window.Browse`.
if (typeof window !== 'undefined') window.Browse = Browse;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Browse;
