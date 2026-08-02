// fuzz-ui.js — drive the REAL app in a REAL browser: rapid semi-random navigation and swipes,
// with invariant checks after EVERY action.
//
// WHY. Every automated seat in this project reasons in jsdom or over source text, and jsdom has no
// layout and no paint. On 2026-08-01 a defect whose whole signature was "two screens composited on
// top of each other mid-swipe" passed four plan reviews, a red suite, a build, a code review, an
// adversary strike and a coverage audit — and the user found it on a phone in minutes. The bugs
// that survive this project's gates are precisely the ones that need a real engine and real data.
//
// Paste into the browser console (or run via javascript_exec) on a SIGNED-IN app:
//     await PBFuzz.run({ actions: 120, seed: 7 })
// It returns { violations, log }. Violations are what matter; the log is for reconstructing one.
//
// It does NOT assert on paint — it asserts on the DOM/geometry facts that a corrupted frame leaves
// behind: two screens visible at once, a view stuck under a transform at rest, a browse page that
// is active but empty, orphaned ghosts. Those are checkable and they are what the reported bugs
// actually are.
(function () {
  const S = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);
  const all = (s) => [...document.querySelectorAll(s)];

  // Deterministic PRNG so a violation can be replayed with the same seed.
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  const txOf = (el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    return m ? Math.round(parseFloat(m[1].split(',')[4]) || 0) : 0;
  };
  const shown = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;

  // The screens that own the viewport. A correct RESTING state has exactly one of them on screen.
  const SCREENS = () => ['#home', '#browse', '#nowplaying', '#options', '#downloads', '#general',
    '#playback', '#buffering', '#diagnostics'].map(q).filter(Boolean);

  /** Facts about the current resting state. */
  function state() {
    const sc = SCREENS().map((el) => ({
      id: el.id, shown: shown(el), tx: txOf(el),
      onscreen: shown(el) && Math.abs(txOf(el)) < 40,
      rect: (({ x, width }) => ({ x: Math.round(x), w: Math.round(width) }))(el.getBoundingClientRect()),
    }));
    const pages = all('.browsepage').map((p) => ({
      key: p.dataset.key || null, cls: p.className, shown: shown(p), tx: txOf(p),
      rows: p.querySelectorAll('.brow, .book, .row, .authrow').length,
      active: !!(p._vctl && p._vctl.state === 'active'),
    }));
    return {
      screens: sc, pages,
      onscreen: sc.filter((s) => s.onscreen).map((s) => s.id),
      ghosts: all('.nav-ghost').length,
      session: (typeof PBSwipeSession === 'function') ? !!PBSwipeSession() : null,
      navActive: (all('.navbtn').find((b) => /active/.test(b.className)) || {}).textContent?.trim() || null,
    };
  }

  /** Invariants that must hold AT REST. Returns a list of violation strings. */
  function check(st, ctx) {
    const v = [];
    if (st.session) return v;                       // mid-gesture: transforms are expected

    if (st.onscreen.length > 1) v.push(`TWO SCREENS ON SCREEN AT REST: ${st.onscreen.join(' + ')}`);
    if (st.onscreen.length === 0) v.push('NO SCREEN ON SCREEN AT REST');

    for (const s of st.screens) {
      // A screen that is visible must be either fully on (tx≈0) or fully parked (|tx| ≈ viewport).
      if (s.shown && Math.abs(s.tx) > 40 && Math.abs(Math.abs(s.tx) - window.innerWidth) > 60) {
        v.push(`SCREEN STUCK MID-TRANSFORM: ${s.id} tx=${s.tx} (viewport ${window.innerWidth})`);
      }
    }
    for (const p of st.pages) {
      if (p.active && p.rows === 0) v.push(`BROWSE PAGE ACTIVE BUT EMPTY: key=${p.key}`);
      if (p.shown && Math.abs(p.tx) > 40) v.push(`BROWSE PAGE STUCK MID-TRANSFORM: key=${p.key} tx=${p.tx}`);
    }
    const visPages = st.pages.filter((p) => p.shown && Math.abs(p.tx) < 40);
    if (visPages.length > 1) v.push(`TWO BROWSE PAGES VISIBLE: ${visPages.map((p) => p.key).join(' + ')}`);
    if (st.ghosts) v.push(`ORPHANED GHOST NODES: ${st.ghosts}`);

    return v.map((m) => `[${ctx}] ${m}`);
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

  async function swipe(dir, rnd) {
    const w = window.innerWidth, y = 300 + Math.floor(rnd() * 300);
    const fromX = dir === 'back' ? 12 : w - 12;          // inside EDGE=44 on the correct side
    const toX = dir === 'back' ? w - 40 : 40;
    const tgt = document.elementFromPoint(fromX, y) || document.body;
    touch(tgt, 'touchstart', fromX, y);
    await sleep(20);
    const steps = 5 + Math.floor(rnd() * 4);
    for (let i = 1; i <= steps; i++) {
      touch(tgt, 'touchmove', Math.round(fromX + (toX - fromX) * (i / steps)), y);
      await sleep(12 + Math.floor(rnd() * 40));
    }
    touch(tgt, 'touchend', toX, y);
  }

  async function run(opts = {}) {
    const n = opts.actions || 100;
    const rnd = rng(opts.seed || 1);
    const violations = [], log = [];
    for (let i = 0; i < n; i++) {
      const roll = rnd();
      let act;
      if (roll < 0.34) {
        const btns = all('.navbtn');
        const b = btns[Math.floor(rnd() * btns.length)];
        act = 'nav:' + (b ? b.textContent.trim() : '?');
        if (b) b.click();
      } else if (roll < 0.54) {
        const rows = all('.brow, .book, .authrow, .hubrow');
        const r = rows[Math.floor(rnd() * rows.length)];
        act = 'row:' + (r ? (r.textContent || '').trim().slice(0, 24) : 'none');
        if (r) r.click();
      } else if (roll < 0.77) {
        act = 'swipe:back'; await swipe('back', rnd);
      } else {
        act = 'swipe:fwd'; await swipe('fwd', rnd);
      }
      // Settle: the swipe animation is ~340ms; give it room, then check AT REST.
      await sleep(420 + Math.floor(rnd() * 260));
      const st = state();
      const v = check(st, `#${i} after ${act}`);
      log.push({ i, act, onscreen: st.onscreen, ghosts: st.ghosts, pages: st.pages.length });
      if (v.length) violations.push({ i, act, v, state: st });
      if (violations.length >= (opts.stopAfter || 6)) break;
    }
    return { violations, actions: log.length, log: log.slice(-25) };
  }

  S.run = run; S.state = state; S.check = check;
  window.PBFuzz = S;
  return 'PBFuzz ready — await PBFuzz.run({actions:120, seed:7})';
})();
