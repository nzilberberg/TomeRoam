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
    dropHold();                  // these controllers are going away; no hold may outlive them
    authorsCache = null;
    pageCache.forEach((v) => destroyController(v.el));
    pageCache.clear();
    if (o.mount) o.mount.innerHTML = '';
  }
  // Drop cached pages so lists rebuild from fresh data (pull-to-refresh). Safe to
  // call while browse is hidden (home). Removes the page nodes; keeps the mount.
  function clearCache() {
    dropHold();
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

  // ── ROW HOLD (swipe-scoped) ─────────────────────────────────────────────────
  // While a swipe gesture is live, showPage() SUSPENDS the outgoing page's
  // controller instead of deactivating it: hidden and not realizing, but rows
  // kept. An aborted swipe then restores the page it never really left, instead of
  // rebuilding every row and re-fetching every cover — which is the measured cause
  // of "images flash on each aborted swipe return" (at reveal the page had 36
  // images and ZERO with a src).
  //
  // Same owned-token idiom as beginRestore above, for the same reason: a stale
  // gesture's finalizer must not release a newer gesture's hold. Held state is
  // bounded — one overscan window per suspended page — and a LEAKED hold degrades
  // to what the classic (≤600-item) renderer already does today, which is keep
  // every row of every cached page. So the failure mode is bounded, not unbounded.
  let holdRows = false;
  let holdGen = 0;
  // Background revalidates that arrived mid-gesture, latest-wins per page key.
  // Suspending the rows is not enough on its own: an SWR repaint destroys them by a
  // different door (patchInPlace → ctl.update → dematerialize, or buildFor →
  // innerHTML=''), so the abort rebuilds the page after all. MEASURED: a swipe taken
  // ~0.7s after a nav tap — i.e. inside the revalidate window — revealed the page
  // with withSrc=0 and 17 covers refetched, while a swipe following another swipe
  // was perfectly clean. Deferring costs one gesture of data staleness.
  const heldRepaints = new Map();
  function beginHold() {
    holdRows = true; heldRepaints.clear();
    // Freeze scroll-driven realization too. Suspending the OUTGOING page's rows is
    // not sufficient on its own: a page that is never hidden during the gesture
    // (swiping back to Home moves the real #browse by transform, so showPage never
    // runs) stays active and re-realizes on every transient scroll.
    if (VL && VL.setScrollSuspended) VL.setScrollSuspended(true);
    return ++holdGen;
  }
  function endHold(token) {
    if (token !== holdGen || !holdRows) return;
    holdRows = false;                       // cleared FIRST, or the deferred repaints re-defer
    if (VL && VL.setScrollSuspended) VL.setScrollSuspended(false);
    // Now do the teardown the hold deferred: any page still suspended is off screen
    // for good, so it goes to the normal dematerialized resting state. The VISIBLE
    // page is skipped — it is the one the gesture landed on.
    // It activates FIRST, now that the swipe has put the real scroll back, so its
    // realize computes the right window and reuses the rows it kept instead of
    // releasing them against a transient offset. activate() is a no-op for a page
    // that was never suspended (swiping back to Home never hides it), so realize
    // explicitly — this is the ONE realization the gesture gets, against the
    // settled scroll.
    // Parking is gesture-scoped: hand the pages back to display:none now, or every
    // cached page stays painted for the rest of the session.
    const stillShown = activeEntry();
    for (const v of pageCache.values()) {
      if (!v.el.classList.contains('parked')) continue;
      v.el.classList.remove('parked');
      if (v !== stillShown) v.el.classList.add('hidden');
    }
    const shown = activeEntry();
    if (shown && shown.el._vctl) { shown.el._vctl.activate(); shown.el._vctl._realize(); }
    for (const v of pageCache.values()) {
      const c = v.el._vctl;
      if (c && c.state && c.state() === 'suspended') c.deactivate();
    }
    // Now apply whatever the revalidates wanted to do. Each re-runs the real repaint,
    // which re-checks page identity, so one evicted/replaced meanwhile is dropped.
    const pending = [...heldRepaints.values()];
    heldRepaints.clear();
    for (const fn of pending) fn();
  }
  // Destructive cache operations invalidate any outstanding hold: their controllers
  // are being destroyed, and a hold surviving them would wrongly govern whatever
  // pages get built next.
  function dropHold() {
    holdRows = false; holdGen++; heldRepaints.clear();
    if (VL && VL.setScrollSuspended) VL.setScrollSuspended(false);
  }
  const browseVisible = () => !!(o.mount && !o.mount.classList.contains('hidden'));
  // A page is off screen when it is display:none'd OR parked off-viewport during a
  // swipe. Testing only for `.hidden` would count a parked page as the visible one.
  const offscreen = (el) => el.classList.contains('hidden') || el.classList.contains('parked');
  function activeEntry() {
    for (const v of pageCache.values()) if (!offscreen(v.el)) return v;
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
    // This is a DELIBERATE placement — the page's real entry position — which is the
    // opposite of the transient scrolls the swipe freezes realization for (iOS
    // granting a native scroll, or a shorter page clamping scrollY). So realize
    // against it explicitly: while a gesture holds the freeze, the scroll event this
    // fires is ignored, and the incoming page would be left scrolled to one place
    // with its rows built for another. MEASURED: entering Books at y=11209 mid-swipe
    // left 21 rows sitting 11,059px above the viewport — group shells reserving
    // space with nothing in them, i.e. empty bars until the gesture ended.
    const cur = activeEntry();
    if (cur && cur.el._vctl && cur.el._vctl._realize) cur.el._vctl._realize();
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
    // A virtual page's logical anchor {row, offsetPx} beats the raw recorded
    // scrollY: an SWR update that landed while the page was hidden may have
    // moved rows above the anchor, making the number point at a different
    // book. The anchor re-resolves against the CURRENT model (null = never
    // scrolled into the list / anchor row gone → the raw Y is the right call).
    const ctl = page._vctl;
    const anchorY = ctl && ctl.anchorEntryY ? ctl.anchorEntryY() : null;
    applyScrollY(anchorY != null ? anchorY : entryScrollY(desc.v, savedY, trackY));
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
    // Virtual controllers follow visibility — but the OUTGOING controller must
    // deactivate BEFORE `.hidden` (display:none) lands: deactivate() captures
    // the scroll anchor from the container's geometry, and a hidden box
    // measures zero, collapsing the anchor to row 0. Activate the incoming one
    // AFTER it's visible again, for the same reason.
    for (const [k, v] of pageCache) {
      const c = v.el._vctl;
      // holdRows → suspend (keep rows) instead of dematerializing. Either way the
      // anchor is captured HERE, before `.hidden` lands, for the reason above.
      if (c && k !== key) { if (holdRows && c.suspend) c.suspend(); else c.deactivate(); }
    }
    // While a swipe holds rows, the outgoing page is PARKED (off-viewport but still
    // painted) rather than display:none'd. iOS drops the decoded cover images of a
    // display:none subtree, so an aborted swipe re-decodes every cover at once and
    // the whole list visibly pops back in — with the DOM completely untouched
    // (measured on device: ROWS KEPT 68/68, src 22->22, +img 0). Same technique and
    // the same reason as #home.parked. Gesture-scoped: endHold puts the pages back
    // to display:none so cached pages do not stay painted for the session.
    for (const [k, v] of pageCache) {
      const away = k !== key;
      v.el.classList.toggle('parked', away && holdRows);
      v.el.classList.toggle('hidden', away && !holdRows);
    }
    const shown = pageCache.get(key);
    if (shown && shown.el._vctl) {
      const c = shown.el._vctl;
      // A page coming back from SUSPENDED is a swipe ABORTING to where it started.
      // Activating here would realize rows against the scroll the browser CLAMPED
      // when the destination page shortened the document — measured: scroll 11209 →
      // 0 → 11209, all 33 realized rows destroyed and recreated, their loaded covers
      // gone (33 → 16 with src). That is the flicker. The swipe restores the real
      // scroll immediately after this returns, and endHold() activates then.
      //
      // Any OTHER page still activates normally, so the incoming page during a drag
      // is materialized as before — deferring that one too would slide in a blank.
      const returningFromSwipe = holdRows && c.state && c.state() === 'suspended';
      if (!returningFromSwipe) c.activate();
    }
  }
  // Top-level virtual-list lifecycle for the WHOLE Browse view. showPage() owns the
  // page-to-page handoff, but leaving Browse entirely (→ Home) hides the #browse
  // CONTAINER via Nav.setView WITHOUT touching the active controller — so a background
  // SWR repaint (repaint→patchInPlace→ctl.update, whose guard only checks the node is
  // still connected) ran against a display:none page: zero geometry + Home's scrollY →
  // the captured anchor collapsed and the raw scrollY went stale after an above-view
  // insert, landing the return near row 0. Nav calls deactivate() BEFORE `.hidden`
  // lands so the controller captures its anchor from REAL geometry (a hidden box
  // measures zero). Re-entry activation is deliberately NOT driven from here — it is
  // owned by showPage(), which activates the exact page being rendered; activating
  // from here would re-activate whatever stale page is still non-hidden and, when
  // showPage then deactivates it, overwrite its good anchor with the wrong scroll.
  function deactivate() { const cur = activeEntry(); if (cur && cur.el._vctl) cur.el._vctl.deactivate(); }
  function activate() { const cur = activeEntry(); if (cur && cur.el._vctl) cur.el._vctl.activate(); }

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
    if (el._vctl && !offscreen(el) && browseVisible()) el._vctl.activate();
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
  // A virtual page's controller owns ONLY the rows + group shells. The header
  // count, `_truncCount` and the A–Z index are built OUTSIDE it (listView), so a
  // STRUCTURAL SWR update through ctl.update() left them stale: the header kept the
  // old count, the index kept a letter whose group no longer exists (a dead jump
  // target — buildIndex's scrollTo finds no `.lettergroup`) or missed a newly-added
  // one, and a later independent updateTruncNote repaint used a stale count. The
  // CLASSIC path can't hit this: patchRows returns false on a key-set change, which
  // forces a full rebuild. The virtual path deliberately accepts structural change
  // in place, so it must refresh the chrome in the SAME operation as the model.
  function syncVirtualChrome(kind, page, items, letters) {
    page._truncCount = items.length;                       // updateTruncNote's input
    const title = page.querySelector('.browsetitle');
    if (title) title.textContent = `${kind === 'authors' ? 'Authors' : 'Books'} · ${items.length}`;
    // buildIndex returns a self-contained element (its own listeners), so replacing
    // it wholesale drops the stale letters and their handlers together.
    const fresh = buildIndex(page, letters);
    const old = page.querySelector('.alphaindex');
    if (old) old.replaceWith(fresh); else page.appendChild(fresh);
    updateTruncNote(kind);                                 // repaint against the NEW count
  }

  // Try an in-place patch for this screen; false → the caller does a full rebuild.
  function patchInPlace(desc, page, data) {
    // A VIRTUAL page never goes through patchRows (it counts rows — realized ≠
    // total would always read as structural). The controller's update() rebuilds
    // the model and keeps the viewport anchored (SWR never jumps the view).
    const ctl = page._vctl;
    if (ctl) {
      if (desc.v === 'authors' || desc.v === 'books') {
        const grouped = groupedFor(data);
        ctl.update(grouped);
        syncVirtualChrome(desc.v, page, data, grouped.map((g) => g.letter));
        return true;
      }
      if (desc.v === 'authorBooks') {
        if (JSON.stringify(data.author) !== page._authorSig) return false;   // header changed → full rebuild
        ctl.update([{ letter: '', items: data.books.slice().sort(bySort) }]);
        // The author header's "N books" is built by authorHeader(), OUTSIDE the
        // controller — an unchanged author with a CHANGED book set would keep the
        // old number (the author-page half of the same staleness bug).
        const c = page.querySelector('.authorcount');
        if (c) c.textContent = `${data.books.length} ${data.books.length === 1 ? 'book' : 'books'}`;
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
        // A swipe is in flight → this would destroy the rows the hold is preserving.
        // Park it; endHold replays the latest one per page. (Keyed by page, so a
        // burst of revalidates collapses to the freshest.)
        if (holdRows) {
          heldRepaints.set(key, () => repaint(fresh));
          if (typeof PBDebug !== 'undefined' && PBDebug.log) PBDebug.log('FLASH', `repaint deferred (${key}) — swipe in flight`);
          return;
        }
        // Only touch rows that actually changed; full rebuild just for a
        // structural change (add/remove/re-sort).
        if (!patchInPlace(desc, page, fresh)) buildFor(desc, fresh, page);
        o.onRender();
      };
      const data = await fetchFor(desc, repaint);
      // The node may have been evicted/replaced while we fetched — then there is
      // nothing to fill. (Being merely HIDDEN is different: still fill it, or a later
      // cache hit would show an empty placeholder.)
      const still = pageCache.get(key);
      if (!still || still.el !== page || !page.isConnected) return;
      page.innerHTML = '';
      buildFor(desc, data, page);
    } catch (e) { page.innerHTML = `<div class="empty">⚠️ ${e.message || 'Could not load.'}</div>`; }
    evictLRU(key);
    o.onRender();
    // A fresh page has no saved position → top; a files page for the book playing
    // here opens at its current track. Positioned AFTER onRender so the rows are
    // built and laid out (the files case measures a row).
    // ONLY if this page is actually on screen: positionOnEnter → applyScrollY →
    // window.scrollTo, so a slow fetch for page A resolving after the user moved to
    // page B would otherwise yank B's scroll to a Y measured from a display:none
    // node. showPage() marks the shown page by REMOVING .hidden. The cache-identity
    // check above is not enough here — the superseded page is still cached and still
    // connected, just hidden, which is exactly how this got through the first time.
    // BOTH conditions. Page-level .hidden covers Browse page A -> Browse page B, but
    // leaving Browse entirely (-> Home / Options) hides the #browse CONTAINER and
    // leaves the active page node WITHOUT .hidden — so the page check alone still let
    // a late fetch scroll the window while Home was on screen. showPage()/the virtual
    // controllers already combine these two the same way (see line ~258).
    if (browseVisible() && !offscreen(page)) positionOnEnter(desc, page, 0);
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
  function truncationNote(kind, count) {
    const raw = (typeof Plex !== 'undefined' && Plex.libraryTruncation) ? Plex.libraryTruncation()[kind] : null;
    // truncationDisplay merges the live/persisted state with the legacy-cache
    // count heuristic (no metadata + exactly the request cap → 'possible').
    const t = (typeof Plex !== 'undefined' && Plex.truncationDisplay) ? Plex.truncationDisplay(raw, count) : raw;
    if (!t || t.state === 'complete') return null;
    const el = document.createElement('div');
    el.className = 'statusline truncnote';
    el.textContent = t.state === 'truncated'
      ? `⚠️ Showing the first ${t.returned.toLocaleString()} of ${t.total.toLocaleString()} — the list is truncated.`
      : `⚠️ Showing ${t.returned.toLocaleString()} — the list may be truncated.`;
    return el;
  }

  // The notice repaints INDEPENDENTLY of the row diff (review of `.138`,
  // finding 1): a revalidation whose item arrays are IDENTICAL to the cache
  // never fires onFresh/patchInPlace, but the live listing may still have just
  // revealed truncation — the note must appear/update/clear the moment the
  // side channel changes, on the already-built page.
  function updateTruncNote(kind) {
    const entry = pageCache.get(kind);        // page keys: 'books' / 'authors' (keyOf = desc.v)
    if (!entry) return;
    const m = entry.el;
    if (m._truncKind !== kind) return;        // still a placeholder/spinner page
    const fresh = truncationNote(kind, m._truncCount || 0);
    const cur = m.querySelector('.truncnote');
    if (cur && fresh) cur.textContent = fresh.textContent;
    else if (cur && !fresh) cur.remove();
    else if (!cur && fresh) {
      const head = m.querySelector('.browsehead');
      if (head) head.insertAdjacentElement('afterend', fresh);
    }
  }
  if (typeof Plex !== 'undefined' && Plex.onTruncationChange) Plex.onTruncationChange(updateTruncNote);

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
    const kind = title === 'Authors' ? 'authors' : 'books';
    m._truncKind = kind; m._truncCount = items.length;   // updateTruncNote's inputs
    const note = truncationNote(kind, items.length);
    if (note) m.appendChild(note);
    const list = document.createElement('div');
    list.className = 'browselist';
    if (VL && VL.usesVirtual(items.length)) {   // fill-to-budget: same look, windowed rows
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
    if (VL && VL.usesVirtual(books.length)) {   // one flat headerless group, windowed
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

    // ── who owns this drag: the strip, or the edge swipe? ────────────────────
    // The strip sits ON the forward-swipe edge band (measured on a 375px screen:
    // 77% of the band, 80% of the screen height), so it cannot simply claim every
    // drag that starts on it — that is what stopped forward swipes arming at all.
    // It does not need to: scrubbing is VERTICAL, the swipe is HORIZONTAL.
    //
    // ONE arbitration for BOTH input families. Doing it for touch only left the
    // pointer path claiming every mouse drag, so a swipe started on the strip
    // scrubbed AND swiped — the page jumped to that letter the instant the drag
    // began, and jumped back when the swipe aborted.
    //
    // Deliberately complementary to app.js's rule (it proceeds only when
    // |dx| > |dy|): this takes the drag on |dy| >= |dx|, so exactly one of the two
    // ever owns it. Nothing is claimed and nothing is preventDefault-ed until the
    // direction is known — deciding early would fight the gesture that owns it.
    // Taps are unaffected: they jump via the `click` handler above, not on movement.
    const LOCK = 8;                       // same threshold app.js uses
    let g0 = null, owned = false;
    const gStart = (x, y) => { g0 = { x, y }; owned = false; };
    const gOwns = (x, y) => {
      if (owned) return true;
      if (!g0) return false;              // already ceded to the swipe
      const dx = x - g0.x, dy = y - g0.y;
      if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return false;   // direction unknown
      if (Math.abs(dx) > Math.abs(dy)) { g0 = null; return false; }   // horizontal → the swipe
      owned = true;
      return true;
    };
    const gEnd = () => { g0 = null; owned = false; clear(); };

    // Mouse. Touch also emits pointer events, so this family is gated to mouse and
    // the touch listeners below own touch — otherwise one drag is arbitrated twice.
    idx.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') gStart(e.clientX, e.clientY); });
    idx.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !e.buttons) return;
      if (gOwns(e.clientX, e.clientY)) jump(e.clientY);
    });
    idx.addEventListener('pointerup', gEnd);
    idx.addEventListener('pointerleave', gEnd);

    // Touch.
    idx.addEventListener('touchstart', (e) => { const t = e.touches[0]; gStart(t.clientX, t.clientY); }, { passive: true });
    idx.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (!gOwns(t.clientX, t.clientY)) return;
      jump(t.clientY);
      e.preventDefault();                 // only once this drag is ours
    }, { passive: false });
    idx.addEventListener('touchend', gEnd);
    idx.addEventListener('touchcancel', gEnd);
    return idx;
  }

  return { init, reset, render, clearCache, patchRows, bookSig, deactivate, activate,
    beginHold, endHold,
    // internals exposed for unit tests only (no runtime behaviour change)
    _test: { keepCover, authorSig, bookSig, bookRow, authorRow, entryScrollY, clampY,
      applyScrollY, showPage, positionOnEnter, updateTruncNote, isRestoring: () => restoring,
      listView, authorView, patchInPlace, groupedFor, pageCache,
      setVlOpts: (v) => { vlOpts = v; } } };
})();

// Expose on window (top-level `const Browse` is a lexical global, not
// window.Browse); app.js reads `window.Browse`.
if (typeof window !== 'undefined') window.Browse = Browse;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Browse;
