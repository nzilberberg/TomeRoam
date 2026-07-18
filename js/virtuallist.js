// virtuallist.js — fill-to-budget list virtualization (scaling plan WS1).
//
// PURE MODEL + a thin DOM controller. A letter-grouped list past FULL_RENDER_MAX
// items renders as per-group SHELLS (header + a reserved rows area sized
// count×rowStride) so the document has its full natural height immediately —
// exact letter offsets, working A–Z jumps, working scroll restore — while only
// the rows inside viewport±overscan are actually materialized (≈ dozens).
//
// Settled design (plan §0 + §6.5 — do not relitigate):
//   * KEYED MATERIALIZATION only: rows are created/removed whole by key, never
//     rebound to a different item (row closures capture their item; ArtLoader
//     ignores a mutated data-art).
//   * Fixed geometry: strides come from CSS (one source of truth) — no measured
//     variable-height virtualizer; `.pline` reserves its tall case.
//   * ONE shared document-scroll listener dispatches to the ACTIVE controller
//     only — leak-proof by construction (nothing per-page to forget).
//   * Controller state machine (owner: browse.js): created → active ⇄ inactive
//     → destroyed. Inactive DEMATERIALIZES to 0 realized rows (keeps data +
//     anchor). activate/deactivate are idempotent; update() is legal in any
//     non-destroyed state.
const VirtualList = (() => {
  // Per-page realization threshold. ≤ this → the existing full renderer runs,
  // byte-for-byte unchanged (a ~500-book library never trips it). SINGLE source
  // of truth — browse.js must read it from here.
  const FULL_RENDER_MAX = 600;
  const OVERSCAN_FACTOR = 1.5;                 // realize viewport ± innerHeight*this

  // Diagnostics override (Options → Diagnostics → "Windowed browse"): window
  // EVERY list regardless of size, so the >600 path is testable on a small
  // library. Persisted under pb_forceVirtual; debug.js owns the toggle UI.
  let forceVirtual = false;
  try { forceVirtual = typeof localStorage !== 'undefined' && localStorage.getItem('pb_forceVirtual') === '1'; } catch { /* storage unavailable → default off */ }
  const setForceVirtual = (v) => { forceVirtual = !!v; };

  // (An EMPTY list is exempt from the override — nothing to window, and the
  // classic renderer's empty output is the exercised path.)
  const usesVirtual = (itemCount) => (forceVirtual && itemCount > 0) || itemCount > FULL_RENDER_MAX;

  // ---- pure model -----------------------------------------------------------
  // groupedItems: [{ letter, items: [...] }] in display order.
  // strides: { header, row } px. → per-group offsets + O(1) key→position map.
  function buildModel(groupedItems, strides) {
    const groups = [];
    const keyIndex = new Map();
    const order = [];                          // every key, display order (anchor fallback)
    let y = 0;
    for (let gi = 0; gi < groupedItems.length; gi++) {
      const src = groupedItems[gi];
      // A falsy letter = a FLAT (headerless) group — author pages use one big
      // ungrouped list; its header stride is zero and no letterhead renders.
      const headH = src.letter ? strides.header : 0;
      const g = {
        letter: src.letter, items: src.items, count: src.items.length,
        top: y, rowsTop: y + headH,
        height: headH + src.items.length * strides.row,
      };
      groups.push(g);
      for (let li = 0; li < src.items.length; li++) {
        const key = String(src.items[li].ratingKey);
        keyIndex.set(key, { gi, li });
        order.push(key);
      }
      y += g.height;
    }
    return { groups, keyIndex, order, totalHeight: y, strides };
  }

  // Rows intersecting [scrollTop-overscan, scrollTop+viewportH+overscan], as
  // {key, item, y} — bounded by the window size, never by group size (a 12k-row
  // letter yields the same ≈dozens as any other).
  function windowFor(model, scrollTop, viewportH, overscan) {
    const from = scrollTop - overscan, to = scrollTop + viewportH + overscan;
    const out = [];
    const { row } = model.strides;
    for (const g of model.groups) {
      if (g.top + g.height <= from) continue;
      if (g.top >= to) break;
      if (!g.count) continue;
      const relFrom = Math.max(0, Math.floor((from - g.rowsTop) / row));
      const relTo = Math.min(g.count - 1, Math.ceil((to - g.rowsTop) / row) - 1);
      for (let li = relFrom; li <= relTo; li++) {
        out.push({ key: String(g.items[li].ratingKey), item: g.items[li], y: g.rowsTop + li * row, gi: model.groups.indexOf(g), li });
      }
    }
    return out;
  }

  // The anchor = the first row at/after scrollTop, with its offset — what SWR
  // data swaps restore so the viewport never jumps.
  function anchorAt(model, scrollTop) {
    const { row } = model.strides;
    for (const g of model.groups) {
      if (!g.count || g.rowsTop + g.count * row <= scrollTop) continue;
      const li = Math.max(0, Math.floor((scrollTop - g.rowsTop) / row));
      const y = g.rowsTop + li * row;
      return { key: String(g.items[li].ratingKey), offsetPx: scrollTop - y };
    }
    return null;
  }
  // Y that puts `anchor` back at its recorded offset in a (possibly rebuilt)
  // model. If the anchor key is gone, walk the OLD display order outward for the
  // nearest surviving neighbour.
  function yForAnchor(model, anchor, oldOrder) {
    if (!anchor) return null;
    const { row } = model.strides;
    const yOf = (key) => {
      const pos = model.keyIndex.get(key);
      if (!pos) return null;
      const g = model.groups[pos.gi];
      return g.rowsTop + pos.li * row;
    };
    let y = yOf(anchor.key);
    if (y == null && oldOrder && oldOrder.length) {
      const at = oldOrder.indexOf(anchor.key);
      for (let d = 1; y == null && d <= oldOrder.length; d++) {
        if (at + d < oldOrder.length) y = yOf(oldOrder[at + d]);
        if (y == null && at - d >= 0) y = yOf(oldOrder[at - d]);
      }
    }
    return y == null ? null : Math.max(0, y + (anchor.offsetPx || 0));
  }

  // ---- shared scroll dispatch (leak-proof: one static listener) --------------
  let activeCtl = null;
  let rafPending = false;
  function onDocScroll() {
    if (!activeCtl || rafPending) return;
    if (!activeCtl.isVisible()) return;   // browse hidden (Home/Options scrolling) → not our scroll
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; if (activeCtl) activeCtl._realize(); });
  }
  if (typeof window !== 'undefined') window.addEventListener('scroll', onDocScroll, { passive: true });

  // ---- controller ------------------------------------------------------------
  // opts: { container, groupedItems, rowFn(item), strides:{header,row},
  //         metrics:{ scrollY(), viewportH(), listTop() },  // injectable for tests
  //         release(rowEl),          // ArtLoader/etc disposal per removed row
  //         onMaterialized() }       // e.g. reapply live presence numbers (rAF'd by caller)
  function createController(opts) {
    let model = buildModel(opts.groupedItems, opts.strides);
    let state = 'created';
    const rows = new Map();                    // key → row element
    let shells = [];                           // per-group rows-containers
    let savedAnchor = null;                    // recorded on deactivate
    const metrics = opts.metrics || {
      scrollY: () => window.scrollY || 0,
      viewportH: () => window.innerHeight || 0,
      listTop: () => {
        const r = opts.container.getBoundingClientRect();
        return (window.scrollY || 0) + r.top;
      },
    };
    const overscan = () => (opts.overscan != null ? opts.overscan : Math.round(metrics.viewportH() * OVERSCAN_FACTOR));

    function buildShells() {
      opts.container.textContent = '';
      opts.container.classList.add('virtual-list');
      shells = [];
      for (const g of model.groups) {
        const shell = document.createElement('div');
        shell.className = 'lettergroup vshell';
        if (g.letter) {
          shell.dataset.sec = g.letter;
          const lh = document.createElement('div');
          lh.className = 'letterhead';
          lh.textContent = g.letter;
          shell.appendChild(lh);
        }
        const rowsEl = document.createElement('div');
        rowsEl.className = 'vrows';
        rowsEl.style.position = 'relative';
        rowsEl.style.height = (g.count * model.strides.row) + 'px';
        shell.appendChild(rowsEl);
        opts.container.appendChild(shell);
        shells.push(rowsEl);
      }
    }

    function dematerialize() {
      for (const [, el] of rows) { if (opts.release) opts.release(el); el.remove(); }
      rows.clear();
    }

    // Realize the window for the CURRENT scroll: create entering rows, remove
    // leaving ones. Never rebinds an existing row.
    function _realize() {
      if (state !== 'active') return;
      const top = Math.max(0, metrics.scrollY() - metrics.listTop());
      const want = windowFor(model, top, metrics.viewportH(), overscan());
      const wantKeys = new Set(want.map((w) => w.key));
      let changed = false;
      for (const [key, el] of rows) {
        if (!wantKeys.has(key)) { if (opts.release) opts.release(el); el.remove(); rows.delete(key); changed = true; }
      }
      for (const w of want) {
        if (rows.has(w.key)) continue;
        const el = opts.rowFn(w.item);
        el.style.position = 'absolute';
        el.style.left = '0'; el.style.right = '0';
        el.style.top = (w.y - model.groups[w.gi].rowsTop) + 'px';
        el.setAttribute('aria-posinset', String(model.order.indexOf(w.key) + 1));
        el.setAttribute('aria-setsize', String(model.order.length));
        shells[w.gi].appendChild(el);
        rows.set(w.key, el);
        changed = true;
      }
      if (changed && opts.onMaterialized) opts.onMaterialized();
    }

    function activate() {
      if (state === 'destroyed') return;
      if (state === 'active' && activeCtl === api) return;
      if (activeCtl && activeCtl !== api) activeCtl.deactivate();
      state = 'active';
      activeCtl = api;
      _realize();
    }
    // Anchor capture guard: a viewport sitting ABOVE the list (page top, in the
    // header region) has no row anchor — clamping it to row 0 would make every
    // restore land at the first row instead of the true top. null → the caller
    // falls back to the raw scrollY, which IS correct there (row churn below
    // can't move a position above the list).
    function captureAnchor() {
      const top = metrics.scrollY() - metrics.listTop();
      return top > 0 ? anchorAt(model, top) : null;
    }
    function deactivate() {
      if (state !== 'active') return;
      savedAnchor = captureAnchor();
      state = 'inactive';
      if (activeCtl === api) activeCtl = null;
      dematerialize();                          // hidden pages hold ~0 realized rows
    }
    function destroy() {
      if (state === 'destroyed') return;
      dematerialize();
      if (activeCtl === api) activeCtl = null;
      shells = [];
      state = 'destroyed';
    }
    // SWR data swap: rebuild the model, keep the viewport anchored. Legal in any
    // non-destroyed state; inactive controllers just re-shell (0 rows) and keep
    // the saved anchor for reactivation.
    function update(groupedItems) {
      if (state === 'destroyed') return;
      const oldOrder = model.order;
      const anchor = state === 'active' ? captureAnchor() : savedAnchor;
      dematerialize();
      model = buildModel(groupedItems, opts.strides);
      buildShells();
      if (state === 'active') {
        const y = yForAnchor(model, anchor, oldOrder);
        if (y != null && opts.scrollTo) opts.scrollTo(y + metrics.listTop() - (0));
        _realize();
      } else {
        // Resolve NOW, while the old display order is still in hand: if this
        // update removed the anchor's row, re-anchor to the nearest survivor
        // (yForAnchor's outward walk) so reactivation restores a real position.
        // Waiting until reactivation would lose oldOrder and leave a dead key.
        const y = yForAnchor(model, anchor, oldOrder);
        savedAnchor = y == null ? null : anchorAt(model, y);
      }
    }
    // Document Y that puts the saved anchor back at its recorded offset in the
    // CURRENT model — the entry-restore value for a page coming back on screen
    // (browse prefers it over the raw recorded scrollY, which goes stale when
    // an SWR update moved rows above the anchor while the page was hidden).
    // Call only while the container is visible again: listTop needs geometry.
    function anchorEntryY() {
      if (!savedAnchor) return null;
      const y = yForAnchor(model, savedAnchor, null);
      return y == null ? null : Math.max(0, y + metrics.listTop());
    }

    buildShells();
    const api = {
      activate, deactivate, destroy, update, _realize, anchorEntryY,
      // Visible = the container actually renders (an ancestor display:none —
      // browse hidden behind Home — means document scrolls are not ours).
      isVisible: opts.isVisible || (() => {
        const c = opts.container;
        try { return !!(c.isConnected && (c.offsetParent !== null || c.getClientRects().length)); }
        catch { return !!c.isConnected; }
      }),
      state: () => state,
      realizedCount: () => rows.size,
      model: () => model,
      anchor: () => savedAnchor,
    };
    return api;
  }

  const api = {
    FULL_RENDER_MAX, usesVirtual, setForceVirtual,
    buildModel, windowFor, anchorAt, yForAnchor,
    createController,
    _test: { activeController: () => activeCtl, setActive: (c) => { activeCtl = c; } },
  };
  return api;
})();

// Expose on window (a top-level `const` is a lexical global, not window.VirtualList).
if (typeof window !== 'undefined') window.VirtualList = VirtualList;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = VirtualList;
