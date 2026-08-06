// bench-virtual-swipe.page.js — the IN-PAGE instrument for the windowed-browse swipe bench.
//
// Loaded into a real Blink engine by tools/bench-virtual-swipe.mjs (which owns the browser,
// the server and the fixture). Exposes `window.VB`. Nothing here is product code and nothing
// here ships: it is an instrument, and it only reads.
//
// WHAT IT MEASURES. Device gate item 5 (Claude/Zelda/DEVICE-GATE-swipe-declone-stage2-2026-08-04.md)
// asks for item 1's four browse↔browse gestures on a list past FULL_RENDER_MAX = 600, with the
// extra observable "rows must be present as the page slides; blank/grey rows in the moving page,
// or a page that arrives empty and fills in afterwards, is the failure".
//
// That decomposes into facts a real engine can be asked for directly:
//   ROWS_WHILE_SLIDING  — at every sampled instant of the drag, every .browsepage whose border box
//                         non-degenerately intersects the viewport has ≥1 row box also intersecting
//                         it. Zero rows on an on-viewport page is the "blank page slides in" failure.
//   REVEAL_NOT_EMPTY    — the page that ends up landed had rows on the viewport at the LAST sample
//                         before the finger lifted, not only after the settle. `revealVisRows == 0
//                         && settledVisRows > 0` is the "arrives empty and fills in afterwards" failure.
//   LANDING             — after the settle: exactly one page composited on the viewport, its key
//                         equal to the expected one (destination on commit, source on abort), no page
//                         left `.parked`, and the landed page has rows on the viewport.
//   VIRTUAL             — anti-vacuity. The exercised page must actually be on the windowed path:
//                         a `.virtual-list` container, a controller whose model holds > 600 items,
//                         and realizedCount strictly below the model size. A run that fails this is
//                         reported as VACUOUS and its silence proves nothing.
//
// ⚠ Velocity: js/app.js:580 only updates `d.vx` when `performance.now() > d.lastT + 8`. A fully
// synchronous drag therefore leaves vx = 0, so neither flick branch (js/app.js:593-594) can fire and
// the commit/abort decision is exactly `prog > THRESH` — deterministic, which is what a bench wants.
// Drags are dispatched synchronously for that reason (and because it is immune to a frozen timeline);
// the SETTLE is then given real wall-clock time, and `timelineLive` reports whether it actually ran.
(function () {
  // `.skrow` is EXCLUDED and counted separately: js/browse.js:92 gives every skeleton
  // placeholder row the class `book`, so a naive `.book` count reports a page full of grey
  // shimmer bars as a page full of rows — the exact failure item 5 names, scored as a pass.
  const ROW_SEL = '.book:not(.skrow), .authrow, .filerow';
  // The list's CONTENT box, not the page's border box and not the list's border box.
  // `.browselist` carries `padding-right: 34px` (css/app.css:460) to clear the A–Z index
  // gutter, and the page itself is inset, so the page's rightmost ~50px holds no row by
  // construction. Demanding rows wherever the PAGE overlaps the viewport reports a violation
  // on the first frames of every correct back-drag — measured: 4 such reports per drag before
  // this was scoped. The honest question is whether the column rows actually occupy is on the
  // viewport with no row in it.
  // `.filelist` is the chapter page's row container (js/browse.js:859) — included so the
  // classic page on the other end of a browse↔browse swipe is held to the same standard.
  const LIST_SEL = '.browselist, .filelist';
  function contentBox(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const n = (v) => parseFloat(v) || 0;
    return {
      left: r.left + n(cs.paddingLeft) + n(cs.borderLeftWidth),
      right: r.right - n(cs.paddingRight) - n(cs.borderRightWidth),
      top: r.top + n(cs.paddingTop) + n(cs.borderTopWidth),
      bottom: r.bottom - n(cs.paddingBottom) - n(cs.borderBottomWidth),
      get width() { return this.right - this.left; },
      get height() { return this.bottom - this.top; },
    };
  }
  let nodeSeq = 0;
  const nodeIds = new WeakMap();
  const nodeId = (el) => { if (!nodeIds.has(el)) nodeIds.set(el, ++nodeSeq); return nodeIds.get(el); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  const cache = () => (window.Browse && window.Browse._test && window.Browse._test.pageCache) || new Map();

  /** key → element, from the real page cache (a .browsepage carries no key attribute). */
  function keyed() {
    const out = new Map();
    for (const [k, v] of cache()) out.set(v.el, k);
    return out;
  }

  const intersects = (r) => r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw() && r.bottom > 0 && r.top < vh();

  /** Everything worth knowing about one .browsepage at one instant. Geometry, not paint. */
  function pageFacts(p, keys) {
    const r = p.getBoundingClientRect();
    const ctl = p._vctl || null;
    const rows = p.querySelectorAll(ROW_SEL);
    let visRows = 0;
    for (const el of rows) if (intersects(el.getBoundingClientRect())) visRows++;
    const skels = p.querySelectorAll('.skrow');
    let visSkel = 0;
    for (const el of skels) if (intersects(el.getBoundingClientRect())) visSkel++;
    const list = p.querySelector(LIST_SEL);
    const lr = list ? contentBox(list) : null;
    return {
      key: keys.get(p) || null,
      node: nodeId(p),
      parked: p.classList.contains('parked'),
      hidden: p.classList.contains('hidden'),
      inline: p.style.transform || '',
      left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height),
      onViewport: intersects(r),
      listLeft: lr ? Math.round(lr.left) : null,
      listRight: lr ? Math.round(lr.right) : null,
      listOnViewport: !!(lr && intersects(lr)),
      virtual: !!p.querySelector('.virtual-list'),
      ctlState: ctl && ctl.state ? ctl.state() : null,
      realized: ctl && ctl.realizedCount ? ctl.realizedCount() : null,
      modelItems: ctl && ctl.model ? ctl.model().order.length : null,
      rows: rows.length,
      visRows,
      visSkel,
    };
  }

  function snap(tag) {
    const keys = keyed();
    const pages = [...document.querySelectorAll('.browsepage')].map((p) => pageFacts(p, keys));
    const browse = document.getElementById('browse');
    return {
      tag,
      browseTx: browse ? (browse.style.transform || getComputedStyle(browse).transform) : null,
      pages,
      session: (typeof window.PBSwipeSession === 'function') ? !!window.PBSwipeSession() : null,
    };
  }

  // --- input ------------------------------------------------------------------
  const touch = (tgt, type, x, y) => {
    const t = new Touch({ identifier: 1, target: tgt, clientX: x, clientY: y, pageX: x, pageY: y });
    const empty = type === 'touchend';
    tgt.dispatchEvent(new TouchEvent(type, {
      touches: empty ? [] : [t], targetTouches: empty ? [] : [t], changedTouches: [t],
      bubbles: true, cancelable: true,
    }));
  };

  /**
   * One synchronous edge drag, sampled per move.
   * dir 'back' starts inside the LEFT edge (EDGE = 44, js/app.js:197); 'fwd' inside the right.
   * frac = how far across the viewport the finger travels, as a fraction of width. The commit
   * decision is `prog > 0.42` with vx pinned at 0, so frac 0.75 commits and frac 0.25 aborts.
   */
  async function drag(dir, frac, tag, steps) {
    const w = vw(), y = Math.round(vh() / 2);
    const fromX = dir === 'back' ? 10 : w - 10;
    const span = Math.round(w * frac);
    const toX = dir === 'back' ? fromX + span : fromX - span;
    const n = steps || 8;
    const tgt = document.elementFromPoint(fromX, y) || document.body;
    const samples = [snap(tag + ':down')];
    touch(tgt, 'touchstart', fromX, y);
    for (let i = 1; i <= n; i++) {
      const x = Math.round(fromX + (toX - fromX) * (i / n));
      touch(tgt, 'touchmove', x, y);
      samples.push(snap(tag + ':mv' + i));
    }
    // "Hold still a beat, then lift" — the device gate's own wording, and here it is load
    // bearing. js/app.js:580 updates `d.vx` only once a move lands more than 8ms after the
    // last one, and snap() forces a full layout of every page after every move; on a heavy
    // page that pushes a step past 8ms and a 12px synthetic step then reads as 1.3 px/ms,
    // over FLICK_V = 0.4, so a 25%-of-width drag COMMITS as a flick. Measured: routes A and B
    // aborted correctly and the deep-scrolled route committed three times. Four
    // zero-displacement moves spaced in real time drive vx to exactly 0, which makes every
    // decision `prog > THRESH` alone and the outcome a function of `frac` only.
    for (let i = 0; i < 4; i++) { await sleep(30); touch(tgt, 'touchmove', toX, y); }
    const reveal = snap(tag + ':reveal');       // the LAST look before the finger lifts
    samples.push(reveal);
    touch(tgt, 'touchend', toX, y);
    samples.push(snap(tag + ':up'));
    return { samples, reveal };
  }

  // --- checks -----------------------------------------------------------------
  // A page whose LIST area is on the viewport with no row box in it. This is the item-5
  // observable. Asked of every page, windowed or classic, so a control run at ≤ 600 items
  // measures the same thing on the other branch.
  function emptyWhileVisible(samples) {
    const out = [];
    for (const s of samples) {
      for (const p of s.pages) {
        if (!p.listOnViewport || p.visRows > 0) continue;
        out.push({ tag: s.tag, key: p.key, left: p.left, right: p.right, listLeft: p.listLeft, listRight: p.listRight,
          realized: p.realized, ctlState: p.ctlState, virtual: p.virtual, visSkel: p.visSkel });
      }
    }
    return out;
  }
  /** A page sliding with grey placeholder rows in it — "arrives empty and fills in", live. */
  function skeletonWhileVisible(samples) {
    const out = [];
    for (const s of samples) {
      for (const p of s.pages) {
        if (p.listOnViewport && p.visSkel > 0) out.push({ tag: s.tag, key: p.key, left: p.left, right: p.right, visSkel: p.visSkel, node: p.node });
      }
    }
    return out;
  }

  /** Pages actually composited on the viewport, ignoring parked/hidden bookkeeping. */
  const onScreen = (s) => s.pages.filter((p) => p.onViewport);
  /** One page, one line: key#node[pageL,pageR] list[l,r] rows=visible/realized state flags. */
  const fmt = (p) => `${p.key}#${p.node}[${p.left},${p.right}] list[${p.listLeft},${p.listRight}] `
    + `rows=${p.visRows}/${p.realized == null ? p.rows : p.realized}${p.visSkel ? ' SKEL=' + p.visSkel : ''} `
    + `${p.ctlState || '-'}${p.virtual ? ' V' : ''}`;

  async function gesture(opts) {
    const { dir, frac, tag } = opts;
    const mode = opts.mode || (frac > 0.42 ? 'commit' : 'abort');
    const before = snap(tag + ':before');
    // The source page is read from the running app, not predicted by the caller: item 1's
    // abort observable is "you return to the page you STARTED on", and a predicted key turns
    // a cascade of earlier misbehaviour into a string of unrelated failures.
    const src = onScreen(before);
    const sourceKey = src.length === 1 ? src[0].key : null;
    const expectKey = mode === 'abort' ? sourceKey : (opts.expectKey || null);
    const { samples, reveal } = await drag(dir, frac, tag, opts.steps);
    // Real wall-clock for the settle transition + the ~340ms finalize. Sampled twice early so a
    // frozen timeline is visible rather than silently invalidating the landing observation.
    const t0 = snap(tag + ':t+0');
    await sleep(60); const t1 = snap(tag + ':t+60');
    await sleep(700); const settled = snap(tag + ':settled');

    const land = onScreen(settled);
    const landed = land.length === 1 ? land[0] : null;
    // The page whose reveal is judged: the one named up front, or failing that the one the
    // gesture actually landed on — "arrives empty and fills in" is about the page you end up
    // looking at, so an unnamed destination still gets checked.
    const destKey = expectKey || (landed && landed.key);
    const revealDest = reveal.pages.find((p) => p.key === destKey) || null;
    const settledDest = settled.pages.find((p) => p.key === destKey) || null;

    // Did the drag actually move anything? A gesture that never armed lands where it began,
    // which scores as a clean abort — a bench that reports "ok" for a gesture that did not
    // happen is a false witness, so arming is checked before anything else is believed.
    const xs = samples.map((s) => s.pages.map((p) => p.left).join(','));
    const armed = new Set(xs).size > 1;
    // Node identity: a `.browsepage` replaced mid-gesture means the page cache was rebuilt
    // under the drag. On this bench that is the reconnect pass (js/app.js:3033 clears the
    // browse cache on an unreachable→reachable flip, and the fixture's server answers no Plex
    // API), so the sample is CONTAMINATED — neither a pass nor a failure of the product.
    const nodesBefore = new Map(before.pages.map((p) => [p.key, p.node]));
    const rebuilt = settled.pages.filter((p) => nodesBefore.has(p.key) && nodesBefore.get(p.key) !== p.node).map((p) => p.key);
    const sawSkeleton = skeletonWhileVisible(samples);
    const contaminated = rebuilt.length > 0 || (sawSkeleton.length > 0 && !nodesBefore.has(sawSkeleton[0].key));

    const violations = [];
    if (!armed) violations.push('GESTURE_DID_NOT_ARM: no page moved across the whole drag — nothing was measured');
    for (const e of emptyWhileVisible(samples)) violations.push(`ROWS_WHILE_SLIDING: page ${e.key} list content on viewport [${e.listLeft},${e.listRight}] with 0 rows on screen (realized=${e.realized}, ctl=${e.ctlState}, virtual=${e.virtual}, skel=${e.visSkel}) at ${e.tag}`);
    for (const e of sawSkeleton) violations.push(`SKELETON_WHILE_SLIDING: page ${e.key} slid onto the viewport showing ${e.visSkel} placeholder rows at ${e.tag}`);
    if (land.length !== 1) violations.push(`LANDING: ${land.length} pages composited on the viewport at rest (${land.map((p) => p.key + '@' + p.left).join(', ')})`);
    if (landed && expectKey && landed.key !== expectKey) violations.push(`LANDING: landed on ${landed.key}, expected ${expectKey}${mode === 'abort' ? ' (the page the drag started on)' : ''}`);
    if (mode === 'commit' && landed && sourceKey && landed.key === sourceKey) violations.push(`LANDING: a committed drag stayed on its source page ${sourceKey}`);
    if (landed && landed.visRows === 0) violations.push(`LANDING: landed page ${landed.key} has 0 rows on the viewport`);
    if (settled.pages.some((p) => p.parked)) violations.push(`LANDING: a page is still .parked at rest (${settled.pages.filter((p) => p.parked).map((p) => p.key).join(', ')})`);
    if (revealDest && settledDest && revealDest.visRows === 0 && settledDest.visRows > 0) {
      violations.push(`REVEAL_NOT_EMPTY: ${destKey} had 0 rows on the viewport at reveal and ${settledDest.visRows} after the settle — it filled in afterwards`);
    }

    // Anti-vacuity: was a windowed page actually exercised, and did it stay windowed?
    const virtualSeen = samples.concat([settled]).some((s) => s.pages.some((p) => p.virtual && p.onViewport && p.modelItems > 0));
    const biggest = Math.max(0, ...samples.concat([settled]).flatMap((s) => s.pages.filter((p) => p.virtual).map((p) => p.modelItems || 0)));

    return {
      tag, dir, frac, mode, sourceKey, expectKey,
      landedKey: landed ? landed.key : null,
      violations,
      armed, contaminated, rebuilt,
      vacuous: !virtualSeen,
      biggestModel: biggest,
      // The item-5 number: the fewest rows any page with its list on the viewport showed
      // during the slide. `null` means no list area was on the viewport at any sample.
      minVisRowsWhileSliding: Math.min(...samples.flatMap((s) => s.pages.filter((p) => p.listOnViewport).map((p) => p.visRows)).concat([Infinity])),
      minVisRowsWindowed: Math.min(...samples.flatMap((s) => s.pages.filter((p) => p.listOnViewport && p.virtual).map((p) => p.visRows)).concat([Infinity])),
      revealVisRows: revealDest ? revealDest.visRows : null,
      settledVisRows: settledDest ? settledDest.visRows : null,
      landedRealized: landed ? landed.realized : null,
      landedModel: landed ? landed.modelItems : null,
      // Did the settle animation actually run in this engine? If browseTx is identical at
      // t+0 and t+60 the timeline is frozen and the landing observation is not a timed one.
      timelineLive: JSON.stringify(t0.pages.map((p) => p.left)) !== JSON.stringify(t1.pages.map((p) => p.left)) || t0.browseTx !== t1.browseTx,
      before: before.pages.map((p) => ({ key: p.key, node: p.node, onViewport: p.onViewport, virtual: p.virtual, model: p.modelItems, realized: p.realized, visRows: p.visRows })),
      samples: samples.map((s) => ({ tag: s.tag, pages: s.pages.filter((p) => p.onViewport || p.parked).map(fmt) })),
      settled: settled.pages.map((p) => fmt(p) + (p.parked ? ' PARKED' : '') + (p.hidden ? ' hidden' : '')),
    };
  }

  // --- navigation helpers -------------------------------------------------------
  async function nav(which, settleMs) {
    const b = document.querySelector(`.navbtn[data-nav="${which}"]`);
    if (!b) throw new Error('no navbtn ' + which);
    b.click();
    await sleep(settleMs || 700);
    return snap('nav:' + which);
  }
  /** Click the Nth row of the visible browse page (drilling in = a NEW forward screen). */
  async function openRow(n, settleMs) {
    const k = keyed();
    const page = [...document.querySelectorAll('.browsepage')].find((p) => intersects(p.getBoundingClientRect()));
    if (!page) throw new Error('no visible browse page');
    const rows = page.querySelectorAll(ROW_SEL);
    if (!rows[n || 0]) throw new Error('no row ' + n + ' on ' + k.get(page));
    rows[n || 0].click();
    await sleep(settleMs || 900);
    return snap('open:' + (k.get(page) || '?'));
  }
  const keys = () => [...cache().keys()];
  const activeKey = () => {
    const k = keyed();
    const p = [...document.querySelectorAll('.browsepage')].find((el) => intersects(el.getBoundingClientRect()));
    return p ? k.get(p) : null;
  };

  // --- the fire drill -----------------------------------------------------------
  // A negative result is worth nothing until the instrument is shown to produce a positive.
  // This forces the exact defect ROWS_WHILE_SLIDING exists to catch — a windowed page composited
  // on the viewport with no rows in it — by dematerializing the outgoing controller one move into
  // a live drag (deactivate() drops every realized row and keeps the group shells, which is
  // precisely what a lost row-hold would leave behind). The gesture is then aborted and the page
  // rebuilt, so the drill leaves no state behind.
  async function fireDrill() {
    const w = vw(), y = Math.round(vh() / 2), fromX = 10;
    const tgt = document.elementFromPoint(fromX, y) || document.body;
    touch(tgt, 'touchstart', fromX, y);
    touch(tgt, 'touchmove', Math.round(w * 0.3), y);
    // Break it: drop the rows of every windowed page while the drag is live.
    let broke = 0;
    for (const p of document.querySelectorAll('.browsepage')) {
      if (p._vctl && p.querySelector('.virtual-list')) { p._vctl.deactivate(); broke++; }
    }
    touch(tgt, 'touchmove', Math.round(w * 0.35), y);
    const s = snap('firedrill:mv');
    touch(tgt, 'touchend', Math.round(w * 0.35), y);
    await sleep(800);
    const found = emptyWhileVisible([s]);
    return { broke, fired: found.length > 0, found, sample: s.pages.map(fmt) };
  }

  window.VB = { snap, drag, gesture, nav, openRow, keys, activeKey, fireDrill, sleep,
    emptyWhileVisible, skeletonWhileVisible, pageFacts, keyed, fmt };
  return 'VB ready';
})();
