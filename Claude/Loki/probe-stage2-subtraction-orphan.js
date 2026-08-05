// probe-stage2-subtraction-orphan.js — Loki strike probe (disposable).
//
// PROMISE UNDER STRIKE (PLAN-swipe-declone-stage2-subtraction §5 / §11 step 3):
//   "Removing the .nav-ghost disjunct from begin()'s recovery predicate makes
//    cur = d || session non-null on every reachable entry; the ORPHAN branch is
//    unreachable; the three-ternary collapse CHANGES NO BEHAVIOUR."
//
// INSTRUMENT: boot the REAL app twice through test/app-harness.js — once at HEAD,
// once with the §5 collapse applied IN MEMORY (collapse-transform.js; product source
// untouched) — and drive the same battery of entry routes into begin()'s recovery.
// Record, per scenario: hard-reset entries, whether the recovery's scroll restore ran,
// the resetScroll axis observable (does a pre-set home/options scrollTop survive?),
// ghost-node survival, and every '.nav-ghost' querySelector hit.
//
// S4 is the CONTROL: an injected .nav-ghost + a clean touch. At HEAD it MUST take the
// ORPHAN branch (scrollTop zeroed, no scroll restore, ghost swept) — proving the
// instrument can see an orphan entry — and under the collapse the same input MUST
// diverge (no recovery at all, ghost survives). Reachability of that input is the
// question; the divergence is the stake.
'use strict';
const path = require('node:path');
const ROOT = process.env.TOMEROAM_ROOT || path.resolve(__dirname, '..', '..');
const xf = require(process.env.COLLAPSE_XF || path.join(__dirname, 'probe-stage2-subtraction-transform.js'));
xf.install();

const { boot } = require(path.join(ROOT, 'test', 'app-harness.js'));

const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
const settle = async (h, n = 12) => { for (let i = 0; i < n; i++) await h.settle(); };

const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const hardResets = (h) => swipeLog(h).filter((m) => /leftover state on begin/.test(m));
const scrollCalls = (h) => h.log.calls.filter((c) => c.name === 'window.scrollTo').length;
const ghosts = (h) => h.document.querySelectorAll('.nav-ghost').length;

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

// Wrap Nav.applyScreen (the delegator resolves `Nav` at call time) so begin()'s one
// call is recorded with its exact option values. Also count '.nav-ghost' selector
// hits — the predicate's disjunct is the only production querySelector of it.
function instrument(h) {
  const nav = h.window.Nav;
  const realApply = nav.applyScreen;
  nav.applyScreen = (desc, opts) => {
    h.log.calls.push({ name: 'nav.applyScreen', args: [desc && desc.v, opts ? { render: opts.render, resetScroll: opts.resetScroll, keepGhosts: opts.keepGhosts } : null] });
    return realApply(desc, opts);
  };
  const doc = h.document;
  const realQS = doc.querySelector.bind(doc);
  const hits = { ghostQueries: 0, ghostFound: 0 };
  doc.querySelector = (sel) => {
    const r = realQS(sel);
    if (sel === '.nav-ghost') { hits.ghostQueries++; if (r) hits.ghostFound++; }
    return r;
  };
  return hits;
}

const applyCalls = (h) => h.log.calls.filter((c) => c.name === 'nav.applyScreen').map((c) => c.args);

// ── the battery ─────────────────────────────────────────────────────────────────
// Every scenario returns a plain-object trace; the two variants' traces are diffed.

async function goHomeDeep(h) {           // navStack = [home, books, home]; home is source+current
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="home"]'); await settle(h);
}

const scenarios = {
  // S1 — mid-drag second touch (d truthy), HOME source: the resetScroll axis observable.
  async S1_middrag_supersede_home_source(h) {
    await goHomeDeep(h);
    h.touch.start(10, 300, h.$('home'));           // left-edge back: home → books
    await realSleep(12);
    h.touch.move(120, 302);                        // live
    h.$('home').scrollTop = 77;                    // the axis: must survive a live recovery
    const base = { hr: hardResets(h).length, sc: scrollCalls(h), ap: applyCalls(h).length };
    h.touch.start(10, 300, addRow(h));             // supersede → recovery, cur = d
    await settle(h);
    return {
      hardResets: hardResets(h).slice(base.hr),
      scrollRestores: scrollCalls(h) - base.sc,
      applyScreen: applyCalls(h).slice(base.ap),
      homeScrollTop: h.$('home').scrollTop,
      ghostsAfter: ghosts(h),
    };
  },

  // S2 — settling session superseded before finalize (finishing && session, d === null).
  async S2_settling_supersede_home_source(h) {
    await goHomeDeep(h);
    h.touch.start(10, 300, h.$('home'));
    await realSleep(12);
    h.touch.move(120, 302);
    await realSleep(12);
    h.touch.move(121, 302);                        // kill the flick velocity
    h.touch.end(121, 302);                         // abort settle: finishing=true, d=null
    h.$('home').scrollTop = 77;
    const base = { hr: hardResets(h).length, sc: scrollCalls(h), ap: applyCalls(h).length };
    h.touch.start(10, 300, addRow(h));             // supersede mid-settle → cur = session
    await settle(h);
    const out = {
      hardResets: hardResets(h).slice(base.hr),
      scrollRestores: scrollCalls(h) - base.sc,
      applyScreen: applyCalls(h).slice(base.ap),
      homeScrollTop: h.$('home').scrollTop,
      ghostsAfter: ghosts(h),
    };
    await h.clock.advance(400);                    // the superseded session's 340ms finalize: must no-op
    out.hardResetsAfterStaleFinalize = hardResets(h).length - base.hr - (out.hardResets.length ? 0 : 0);
    out.applyAfterStaleFinalize = applyCalls(h).length - base.ap - out.applyScreen.length;
    return out;
  },

  // S3 — armed-only second touch (d truthy, live=false).
  async S3_armed_supersede(h) {
    await goHomeDeep(h);
    h.touch.start(10, 300, h.$('home'));           // arms; never crosses the lock
    h.$('home').scrollTop = 77;
    const base = { hr: hardResets(h).length, sc: scrollCalls(h), ap: applyCalls(h).length };
    h.touch.start(10, 300, addRow(h));
    await settle(h);
    return {
      hardResets: hardResets(h).slice(base.hr),
      scrollRestores: scrollCalls(h) - base.sc,
      applyScreen: applyCalls(h).slice(base.ap),
      homeScrollTop: h.$('home').scrollTop,
      ghostsAfter: ghosts(h),
    };
  },

  // S4 — CONTROL: the orphan input, constructed. An injected ghost, no session, no drag.
  async S4_CONTROL_injected_ghost(h) {
    const g = h.document.createElement('div');
    g.className = 'nav-ghost';
    h.document.body.appendChild(g);
    h.$('home').scrollTop = 77;
    const base = { hr: hardResets(h).length, sc: scrollCalls(h), ap: applyCalls(h).length };
    h.touch.start(300, 300, h.$('home'));          // mid-screen: begin() runs, nothing arms
    await settle(h);
    return {
      hardResets: hardResets(h).slice(base.hr),
      scrollRestores: scrollCalls(h) - base.sc,
      applyScreen: applyCalls(h).slice(base.ap),
      homeScrollTop: h.$('home').scrollTop,
      ghostsAfter: ghosts(h),
    };
  },

  // S5 — clean entry after a COMPLETED settle: the predicate must not fire at all.
  async S5_clean_after_finalize(h) {
    await goHomeDeep(h);
    h.touch.start(10, 300, h.$('home'));
    await realSleep(12);
    h.touch.move(120, 302);
    await realSleep(12);
    h.touch.move(121, 302);
    h.touch.end(121, 302);
    await h.clock.advance(400);                    // finalize ran; session released
    const base = { hr: hardResets(h).length };
    h.touch.start(10, 300, addRow(h));             // a fresh begin on a clean world
    await settle(h);
    return { hardResets: hardResets(h).slice(base.hr), ghostsAfter: ghosts(h) };
  },

  // S6 — OPTIONS-source live supersession: the resetScroll axis on a panel scroller.
  async S6_middrag_supersede_options_source(h) {
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    h.tap('.navbtn[data-nav="options"]'); await settle(h);
    h.touch.start(10, 300, h.$('options'));        // back-swipe options → books
    await realSleep(12);
    h.touch.move(120, 302);                        // live
    h.$('options').scrollTop = 55;
    const base = { hr: hardResets(h).length, sc: scrollCalls(h), ap: applyCalls(h).length };
    h.touch.start(10, 300, addRow(h));             // supersede
    await settle(h);
    return {
      hardResets: hardResets(h).slice(base.hr),
      scrollRestores: scrollCalls(h) - base.sc,
      applyScreen: applyCalls(h).slice(base.ap),
      optionsScrollTop: h.$('options').scrollTop,
      ghostsAfter: ghosts(h),
    };
  },
};

async function runVariant(collapsed) {
  xf.state.collapsed = collapsed;
  const out = {};
  for (const [name, fn] of Object.entries(scenarios)) {
    const h = boot({ fakeTimers: true });
    const hits = instrument(h);
    try {
      out[name] = await fn(h);
      out[name].ghostQueryHits = hits.ghostFound;
      // Normalize sid numbers so the two variants' logs compare.
      if (out[name].hardResets) out[name].hardResets = out[name].hardResets.map((m) => m.replace(/sid=\d+/, 'sid=N'));
    } catch (e) {
      out[name] = { THREW: String(e && e.message || e) };
    } finally { h.dispose(); }
  }
  return out;
}

(async () => {
  const head = await runVariant(false);
  const coll = await runVariant(true);
  const report = {};
  for (const k of Object.keys(scenarios)) {
    report[k] = { HEAD: head[k], COLLAPSED: coll[k],
      identical: JSON.stringify(head[k]) === JSON.stringify(coll[k]) };
  }
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error('PROBE FAILURE:', e); process.exit(1); });
