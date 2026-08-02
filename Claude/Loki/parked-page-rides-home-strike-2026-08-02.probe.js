// parked-page-rides-home-strike-2026-08-02.probe.js — Loki's instrument + battery.
// Disposable adversarial probe; NOT product code, NOT a suite test. Filed beside the
// strike record it reproduces (parked-page-rides-home-strike-2026-08-02.md).
//
// BENCH
//   1. node tools/serve.mjs --port 8899        (repo root served live)
//   2. echo probe > identity                    (repo root; answers plex.js probeConn's
//      GET /identity with a 200 so the bench never contacts plex.tv — delete after)
//   3. Real Blink engine at 375x812, http://localhost:8899
//   4. Paste SEED below in the console, reload, paste LK, then run the battery.
//
// ⚠ HIDDEN-PANE TRAPS (measured this strike): a hidden pane FREEZES CSS animation/
// transition timelines and rAF (not merely throttles) — animationend/transitionend never
// fire, a stuck .view.nav-in-* then OVERRIDES every inline gesture transform (animations
// beat inline styles in the cascade). Drive gestures fully synchronously and read
// getBoundingClientRect; it is exact regardless of visibility.

// ---- SEED (once, then reload) ----------------------------------------------------------
/*
(async () => {
  localStorage.setItem('pb_token', 'bench-probe-not-a-real-token');   // fabricated, non-credential
  localStorage.setItem('pb_server', JSON.stringify({ name: 'bench', machineId: 'bench',
    connections: [{ uri: 'http://localhost:8899', local: true }] }));
  localStorage.setItem('pb_connKind', 'local');
  localStorage.setItem('pb_lastBase', 'http://localhost:8899');
  localStorage.setItem('pb_section', 'bench-sec');
  const authors = [], books = [];
  for (let i = 1; i <= 26; i++) {
    const L = String.fromCharCode(64 + i);
    authors.push({ ratingKey: 'a' + i, title: L + 'uthor ' + L, titleSort: L + 'uthor',
      thumb: '/library/metadata/a' + i + '/thumb/1', childCount: 1 });
    books.push({ ratingKey: 'b' + i, title: L + ' Book ' + i, titleSort: L + ' Book',
      parentTitle: L + 'uthor ' + L, parentRatingKey: 'a' + i,
      thumb: '/library/metadata/b' + i + '/thumb/1', leafCount: 8, viewedLeafCount: 0,
      addedAt: 1700000000 + i, lastViewedAt: 1700000000 + i, duration: 3600000 });
  }
  const tracks = [];
  for (let t = 1; t <= 12; t++) tracks.push({ ratingKey: 't' + t, title: 'Chapter ' + t,
    index: t, duration: 600000, parentRatingKey: 'b1' });
  await Store.cacheBooks(books); await Store.cacheAuthors(authors); await Store.cacheTracks('b1', tracks);
  location.reload();
})();
*/

// ---- LK — the instrument ---------------------------------------------------------------
window.LK = (() => {
  let samples = [], hits = [];
  // A HIT = a parked page's border box intersecting the viewport, non-degenerately.
  // CLASS_GOVERNED = no inline transform: the park OFFSET itself put it there (the
  // promise's subject). A parked browse->browse OUTGOING mover overlaps BY DESIGN with
  // an inline transform (Invariant P) and must not count as class-governed.
  function snap(tag) {
    const V = window.innerWidth, out = [];
    document.querySelectorAll('.browsepage').forEach(p => {
      const r = p.getBoundingClientRect();
      const rec = { tag, parked: p.classList.contains('parked'), inline: p.style.transform || '',
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) };
      if (rec.parked && rec.w > 0 && rec.h > 0 && rec.right > 0 && rec.left < V) {
        rec.OVERLAP = true; if (!rec.inline) rec.CLASS_GOVERNED = true; hits.push(rec);
      }
      out.push(rec); samples.push(rec);
    });
    return out;
  }
  const touch = (tgt, type, x, y) => {
    const t = new Touch({ identifier: 1, target: tgt, clientX: x, clientY: y, pageX: x, pageY: y });
    const empty = type === 'touchend';
    tgt.dispatchEvent(new TouchEvent(type, { touches: empty ? [] : [t], targetTouches: empty ? [] : [t],
      changedTouches: [t], bubbles: true, cancelable: true }));
  };
  // Fully synchronous drag — no timers, immune to hidden-pane freezing. Samples per move.
  function dragSync(dir, opts = {}) {
    const w = window.innerWidth, y = opts.y || Math.round(window.innerHeight / 2);
    const fromX = dir === 'back' ? 10 : w - 10;
    const toX = opts.toX != null ? opts.toX : (dir === 'back' ? w - 30 : 30);
    const steps = opts.steps || 6;
    const tgt = opts.tgt || document.elementFromPoint(fromX, y) || document.body;
    touch(tgt, 'touchstart', fromX, y); snap((opts.tag || '') + ':ts');
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(fromX + (toX - fromX) * i / steps);
      touch(tgt, 'touchmove', x, y); snap((opts.tag || '') + ':mv' + i);
    }
    if (!opts.hold) { touch(tgt, 'touchend', toX, y); snap((opts.tag || '') + ':te'); }
    return tgt;
  }
  function parkRule() {
    for (const ss of document.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch { continue; }
      for (const r of rules) if (r.selectorText === '.browsepage.parked') return r;
    }
    return null;
  }
  // Candidate applied to the LIVE rule — same specificity, no !important, cascade preserved.
  const setPark = vw => { const r = parkRule(); r.style.transform = 'translateX(' + vw + 'vw)'; return r.style.transform; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reset = () => { samples = []; hits = []; };
  const report = () => ({ n: samples.length, parkedSampled: samples.filter(s => s.parked && s.w > 0).length,
    hits: hits.length, classGoverned: hits.filter(h => h.CLASS_GOVERNED).length, hitList: hits.slice(0, 8) });
  return { snap, touch, dragSync, parkRule, setPark, sleep, reset, report };
})();

// ---- BATTERY (observed results 2026-08-02, viewport 375x812 unless stated) -------------
//
// STATE: Books tab -> book row (files page cached) -> Home tab -> Books tab ->
//        LK.dragSync('back') commit -> Home, fwdStack=[books], chapter list cached+hidden.
//        (navbar clicks; after each, strip frozen nav-in-*: the animationend a frozen
//         timeline owes: document.querySelectorAll('.view').forEach(el =>
//         el.classList.remove('nav-in-right','nav-in-left')))
//
// FIRE DRILL @ -101vw (shipped): LK.reset(); LK.dragSync('fwd', {hold:true}) from Home.
//   OBSERVED: 7/7 move samples HIT, all CLASS_GOVERNED, parked page left=-4 right=+371
//   (delta -4px = 1vw — the measurement record's exact figure). Instrument proven.
//
// LK.setPark(-300) — then:
//
// A  repro drag, 7 moves:            parked right -423..-710, 0 hits, parkedSampled 8.
//    (#browse inline 327->40px, computed matrix tracking it — motion live, not frozen)
// Bi browse->home BACK over-drag to x=1400:  #browse clamps at exactly +375; ZERO .parked
//    pages at every sample (invariant I10 witnessed on the outgoing-side transition).
// Bii home->books FWD over-drag to x=-900, return, abort:  #browse clamps at 0;
//    parked rights -400..-750; 0 hits.
// C  R7: commit fwd drag, navbar tap INSIDE the settle window: both cached pages parked
//    class-governed at right -750; 0 hits; at rest no page left .parked (I4 clean).
// C3 R7 maximal: settle-window ROW drill -> nav-in-right lands on #browse, frozen at its
//    from frame translateX(100%)=+375 SUSTAINED, two class-governed parked pages:
//    rights exactly -375; 0 class-governed hits. Also produced the DESIGNED parked-MOVER
//    (browse->browse outgoing, inline present, right +70) — detected, correctly excluded.
// F  Admitted precondition, executed: landscape 812x375, fwd drag HELD at #browse=+800px
//    inline; parked right -910 (L=86, W=640 — the centred case, arithmetic exact).
//    Resize viewport to 375x812 mid-hold:
//    OBSERVED: HIT, CLASS_GOVERNED, parked page left=-325 right=+50 — a 50px strip on
//    the viewport. Requires w_start > 2*V_now; overlap = (w_start + V_now) - 3*V_now px.
//    This is plan §4 F5's admitted clause, quantified — not a fracture of the promise
//    within its stated precondition.
//
// VERDICT: HELD_STONE — see parked-page-rides-home-strike-2026-08-02.md.
