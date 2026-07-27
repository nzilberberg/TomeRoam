// LOKI r2 probe — Stage-6c ratified design (94f5567), scratch-built onto current js/app.js.
// DISPOSABLE. Injects the plan §3 changes via an fs.readFileSync interceptor; production untouched.
'use strict';
const path = require('node:path');
const fs = require('node:fs');

const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const APP_KEY = path.normalize(path.join(REPO, 'js', 'app.js')).toLowerCase();

// real wall clock, captured before any boot patches timers
const realST = setTimeout;
const sleep = (ms) => new Promise((r) => realST(r, ms));

let variant = 'FULL'; // FULL | NOGUARD | NOCLEAR

function patchSrc(src, v) {
  const reps = [];
  // §3.1 — negative gate
  reps.push([
    `      if (finishing) return;   // settle animation running — ignore new gestures until it lands`,
    `      const paneLess = (s) => !s.movers.some((m) => m.own === 'owned-pane');
      if (finishing && !(session && paneLess(session))) return;`]);
  // §3.1 — recovery-entry predicate
  reps.push([
    `      if (d || document.querySelector('.nav-ghost')) {`,
    `      if (d || document.querySelector('.nav-ghost') || (finishing && session)) {`]);
  // §3.2/§3.3 — recovery reads session fields when d===null; finishing cleared; identity-null last
  reps.push([
    `        resetSwipeStyles();
        applyScreen(currentDesc(), { render: d ? d.clobbered : false, resetScroll: d ? false : undefined });
        if (d) window.scrollTo(0, d.scroll0);
        dropRowHold();
        session = null;
        d = null;`,
    `        resetSwipeStyles();
        const live = d || ((finishing && session) ? session : null);
        applyScreen(currentDesc(), { render: live ? live.clobbered : false, resetScroll: live ? false : undefined });
        if (live) window.scrollTo(0, live.scroll0);
        dropRowHold();
        ${v === 'NOCLEAR' ? '/* NOCLEAR mutation: finishing NOT cleared */' : 'finishing = false;'}
        session = null;
        d = null;`]);
  if (v !== 'NOGUARD') {
    // §3.4 — settle rAF identity guard
    reps.push([
      `      cur.settleFrame = requestAnimationFrame(() => {
        for (const m of cur.movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';
      });`,
      `      cur.settleFrame = requestAnimationFrame(() => {
        if (cur !== session) return;
        for (const m of cur.movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';
      });`]);
    // §3.4/§7 — finalize identity guard, after done set + cancels, BEFORE the try/finally
    reps.push([
      `        clearTimeout(cur.settleTimer);`,
      `        clearTimeout(cur.settleTimer);
        if (cur !== session) return;`]);
  }
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  let out = src;
  for (let [a, b] of reps) {
    a = a.replace(/\n/g, eol); b = b.replace(/\n/g, eol);
    const n = out.split(a).length - 1;
    if (n !== 1) throw new Error('patch anchor not unique (' + n + 'x): ' + JSON.stringify(a.slice(0, 70)));
    out = out.replace(a, b);
  }
  return out;
}

const origRead = fs.readFileSync;
fs.readFileSync = function (p, ...rest) {
  const res = origRead.call(fs, p, ...rest);
  try {
    if (typeof p === 'string' && path.normalize(p).toLowerCase() === APP_KEY && typeof res === 'string') {
      return patchSrc(res, variant);
    }
  } catch (e) { console.error('PATCH FAILURE:', e.message); process.exit(2); }
  return res;
};

const { boot } = require(REPO + '/test/app-harness.js');

// ---------- assertion plumbing ----------
let failures = 0, checks = 0;
function check(name, cond, detail) {
  checks++;
  if (cond) { console.log('  PASS  ' + name); }
  else { failures++; console.log('  FAIL  ' + name + (detail !== undefined ? '   [' + detail + ']' : '')); }
}
const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const commits = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const resets = (h) => swipeLog(h).filter((m) => /hard reset/.test(m));
const endHolds = (h) => h.log.calls.filter((c) => c.name === 'browse.endHold');
const tf = (h, id) => h.$(id).style.transform;
const ghosts = (h) => h.document.querySelectorAll('.nav-ghost').length;
const hidden = (h, id) => h.$(id).classList.contains('hidden');
const sess = (h) => h.window.PBSwipeSession();
async function ms(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

// gesture recipes (velocity resampled only after >8ms real time)
async function backCommit(h, el) {
  h.touch.start(10, 300, el);
  h.touch.move(80, 302); await sleep(14);
  h.touch.move(600, 304); await sleep(14);
  h.touch.end(600, 304); await ms(h);
}
async function fwdCommit(h, el) {
  h.touch.start(1010, 300, el);
  h.touch.move(940, 302); await sleep(14);
  h.touch.move(400, 304); await sleep(14);
  h.touch.end(400, 304); await ms(h);
}
const fireTransitionEnd = (h, el) => el.dispatchEvent(new h.window.Event('transitionend'));

// ============================================================================
// PROBE 1 — FULL. overlay→browse (options→books) A superseded mid-settle by an
// arming pane-less B. Deliver A's stale settle rAF + 340ms settleTimer + a late
// transitionend. B's movers/screen/nav must be unstained; B completes; no wedge.
// ============================================================================
async function probe1() {
  console.log('\nPROBE 1 (FULL) overlay->browse superseded; stale rAF + timer + late transitionend');
  variant = 'FULL';
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    // A: options→books back-swipe released to commit → settling
    await backCommit(h, h.$('options'));
    check('A went live', starts(h).length === 1, starts(h).join('|'));
    check('A settling: session live, not dragging', !!sess(h) && sess(h).dragging === false, JSON.stringify(sess(h)));
    const aId = sess(h).id;
    // B: supersedes and arms
    h.touch.start(10, 300, h.$('options'));
    check('supersession hard-reset logged with A sid', resets(h).some((m) => m.includes('sid=' + aId)), resets(h).join('|'));
    check('B armed as new owner', !!sess(h) && sess(h).id !== aId, JSON.stringify(sess(h)));
    h.touch.move(80, 302); await sleep(14);
    check('B live (2 starts)', starts(h).length === 2, starts(h).join('|'));
    const bOpt = tf(h, 'options'), bBrowse = tf(h, 'browse');
    check('B drag transforms present', bOpt !== '' && bBrowse !== '', bOpt + ' / ' + bBrowse);
    // stale settle rAF of A
    await h.raf.frame();
    check('G1: stale rAF wrote nothing on B movers', tf(h, 'options') === bOpt && tf(h, 'browse') === bBrowse,
      tf(h, 'options') + ' / ' + tf(h, 'browse'));
    // stale 340ms settleTimer of A → finalize_A must be a total no-op
    const holds0 = endHolds(h).length;
    await h.clock.advance(350);
    check('G2: stale settleTimer ran no finalize (no commit line)', commits(h).length === 0, commits(h).join('|'));
    check('G2: B transforms intact after stale timer', tf(h, 'options') === bOpt && tf(h, 'browse') === bBrowse,
      tf(h, 'options') + ' / ' + tf(h, 'browse'));
    check('G2: stale finalize dropped no hold (finally not entered)', endHolds(h).length === holds0,
      JSON.stringify(endHolds(h).map((c) => c.args[0])));
    check('B still owner after stale fires', !!sess(h) && sess(h).id !== aId && sess(h).dragging === true, JSON.stringify(sess(h)));
    // late transitionend on A's anchor (done_A already true → stale-duplicate path)
    fireTransitionEnd(h, h.$('options'));
    check('G3: late transitionend performed nothing', commits(h).length === 0 && tf(h, 'options') === bOpt, commits(h).join('|'));
    // B completes: continue the drag out and release to commit
    h.touch.move(600, 304); await sleep(14);
    h.touch.end(600, 304); await ms(h);
    await h.clock.advance(350); await ms(h);
    check('B finalized exactly once, as B', commits(h).length === 1 && /sid=2/.test(commits(h)[0]), commits(h).join('|'));
    check('B landed on books (browse shown, options hidden)', !hidden(h, 'browse') && hidden(h, 'options'),
      'browse.hidden=' + hidden(h, 'browse') + ' options.hidden=' + hidden(h, 'options'));
    check('endpoint parity: session null', sess(h) === null, JSON.stringify(sess(h)));
    // no wedge: a fresh forward swipe engages (fwdStack has options after B's back-commit)
    await fwdCommit(h, h.$('browse'));
    check('no wedge: next swipe engages', starts(h).length === 3, starts(h).join('|'));
    await h.clock.advance(400); await ms(h);
  } finally { h.dispose(); }
}

// ============================================================================
// PROBE 2 — FULL. browse→overlay A (fwd books→options) superseded by a
// PANE-OWNING B (back books→home, home-snapshot). Gate must admit (A pane-less),
// B's owned pane must survive every stale continuation of A, including B's
// held reveal.
// ============================================================================
async function probe2() {
  console.log('\nPROBE 2 (FULL) browse->overlay superseded by PANE-OWNING successor');
  variant = 'FULL';
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    // normal committed back-swipe options→books → stack [home, books], fwd [options]
    await backCommit(h, h.$('options'));
    await h.clock.advance(350); await ms(h);
    check('setup: first commit landed', commits(h).length === 1, commits(h).join('|'));
    // drain leftover diagnostic frames so the next pending rAF set is A's alone
    for (let i = 0; i < 15 && h.raf.pending(); i++) await h.raf.frame();
    // A: fwd books→options → pane-less settling
    await fwdCommit(h, h.$('browse'));
    check('A live', starts(h).length === 2, starts(h).join('|'));
    const aId = sess(h) && sess(h).id;
    check('A settling', !!sess(h) && sess(h).dragging === false, JSON.stringify(sess(h)));
    // B: left-edge touch supersedes; arms back books→home (PANE-OWNING)
    h.touch.start(10, 300, h.$('browse'));
    check('gate admitted supersession of pane-less A', !!sess(h) && sess(h).id !== aId, JSON.stringify(sess(h)));
    h.touch.move(80, 302); await sleep(14);
    check('B live', starts(h).length === 3, starts(h).join('|'));
    check('B owns a home-snapshot pane', ghosts(h) === 1, 'ghosts=' + ghosts(h));
    const bBrowse = tf(h, 'browse');
    const paneEl = h.document.querySelector('.nav-ghost');
    // A's stale settle rAF
    await h.raf.frame();
    check('stale rAF left B mover + pane alone', tf(h, 'browse') === bBrowse && ghosts(h) === 1 &&
      h.document.querySelector('.nav-ghost') === paneEl, tf(h, 'browse') + ' ghosts=' + ghosts(h));
    // A's stale settleTimer
    await h.clock.advance(350);
    check('stale timer: no finalize over B', commits(h).length === 1 && ghosts(h) === 1, commits(h).join('|') + ' ghosts=' + ghosts(h));
    // A's late transitionend on its anchor (#browse)
    fireTransitionEnd(h, h.$('browse'));
    check('stale transitionend: no finalize over B', commits(h).length === 1 && ghosts(h) === 1, commits(h).join('|'));
    check('B still owner', !!sess(h) && sess(h).id !== aId, JSON.stringify(sess(h)));
    // B completes into the held reveal
    h.touch.move(600, 304); await sleep(14);
    h.touch.end(600, 304); await ms(h);
    await h.clock.advance(350); await ms(h);
    check('B committed to home (held reveal)', commits(h).length === 2 && /commit back/.test(commits(h)[1]), commits(h).join('|'));
    check('held reveal: pane still covering, session still B', ghosts(h) === 1 && !!sess(h), 'ghosts=' + ghosts(h) + ' ' + JSON.stringify(sess(h)));
    // reveal timeout → drop
    await h.clock.advance(700); await ms(h);
    await h.clock.advance(100); await ms(h);
    check('reveal dropped: session null, pane removed', sess(h) === null && ghosts(h) === 0, 'ghosts=' + ghosts(h) + ' ' + JSON.stringify(sess(h)));
    check('home visible', !h.$('home').classList.contains('parked'), h.$('home').className);
    // no wedge after the full chain
    await fwdCommit(h, h.$('home'));
    check('no wedge: next swipe engages', starts(h).length === 4, starts(h).join('|'));
    await h.clock.advance(400); await ms(h);
  } finally { h.dispose(); }
}

// ============================================================================
// PROBE 3 — FULL. Shared-anchor: A superseded (done_A false), B settles on the
// SAME anchor (#options). ONE transitionend fires BOTH listeners: A's stale
// finalize (guarded, done_A set) then B's live finalize. Exactly one commit.
// ============================================================================
async function probe3() {
  console.log('\nPROBE 3 (FULL) one transitionend, two listeners: stale A then live B on the shared anchor');
  variant = 'FULL';
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    await backCommit(h, h.$('options'));   // A settling, done_A false, listener on #options
    const aId = sess(h).id;
    // B supersedes, arms, drags, releases → B settling; B's listener also on #options
    h.touch.start(10, 300, h.$('options'));
    h.touch.move(80, 302); await sleep(14);
    h.touch.move(600, 304); await sleep(14);
    h.touch.end(600, 304); await ms(h);
    check('B settling', !!sess(h) && sess(h).id !== aId && sess(h).dragging === false, JSON.stringify(sess(h)));
    const holds0 = endHolds(h).length;
    // ONE event; A's {once} listener runs first (registered first), then B's
    fireTransitionEnd(h, h.$('options'));
    await ms(h);
    check('exactly one commit, and it is B', commits(h).length === 1 && new RegExp('sid=' + sess === null).source !== null &&
      /sid=2/.test(commits(h)[0]), commits(h).join('|'));
    check('B landed on books', !hidden(h, 'browse') && hidden(h, 'options'), '');
    check('stale A finalize dropped no extra hold', endHolds(h).length === holds0 + 1,
      JSON.stringify(endHolds(h).map((c) => c.args[0])));
    check('session null after B finalize', sess(h) === null, JSON.stringify(sess(h)));
    await h.clock.advance(400); await ms(h);
    // A's spent settleTimer was cancelled by finalize_A's own pre-guard cancel; nothing further fires
    check('no late duplicate finalize', commits(h).length === 1, commits(h).join('|'));
    await fwdCommit(h, h.$('browse'));
    check('no wedge', starts(h).length === 3, starts(h).join('|'));
    await h.clock.advance(400); await ms(h);
  } finally { h.dispose(); }
}

// ============================================================================
// PROBE 4 — FULL. Cell W both shapes: (a) superseding edge-tap that arms but
// never crosses the lock; (b) superseding mid-screen tap that never arms at all.
// After each, A's stale timer no-ops and a fresh full swipe must engage.
// ============================================================================
async function probe4() {
  console.log('\nPROBE 4 (FULL) W: superseding tap that never arms leaves the gate open');
  variant = 'FULL';
  // (a) edge tap: arms, touchend before the lock
  let h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    await backCommit(h, h.$('options'));
    h.touch.start(10, 300, h.$('options'));   // supersedes + arms
    h.touch.end(10, 300);                     // never crossed the lock → ARMED end
    await ms(h);
    check('W(a): owner ended after bare tap', sess(h) === null, JSON.stringify(sess(h)));
    await h.clock.advance(350);
    check('W(a): A stale timer no-oped against null session', commits(h).length === 0, commits(h).join('|'));
    await backCommit(h, h.$('options'));
    check('W(a): fresh swipe ENGAGES (no wedge)', starts(h).length === 2, starts(h).join('|'));
    await h.clock.advance(350); await ms(h);
    check('W(a): fresh swipe completes', commits(h).length === 1, commits(h).join('|'));
  } finally { h.dispose(); }
  // (b) mid-screen tap: recovery runs, begin returns before arming
  h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    await backCommit(h, h.$('options'));
    const r0 = resets(h).length;
    h.touch.start(500, 300, h.$('options'));  // not an edge → begin returns after the recovery
    h.touch.end(500, 300);
    await ms(h);
    check('W(b): supersession recovery ran', resets(h).length === r0 + 1, resets(h).join('|'));
    check('W(b): no session armed', sess(h) === null, JSON.stringify(sess(h)));
    await h.clock.advance(350);
    check('W(b): A stale timer no-oped', commits(h).length === 0, commits(h).join('|'));
    await backCommit(h, h.$('options'));
    check('W(b): fresh swipe ENGAGES (no wedge)', starts(h).length === 2, starts(h).join('|'));
    await h.clock.advance(350); await ms(h);
  } finally { h.dispose(); }
}

// ============================================================================
// PROBE 5 — FULL. The remaining two admitted transitions: home→overlay and
// overlay→overlay (NP→options, carrying the NP-pill decoration).
// ============================================================================
async function probe5() {
  console.log('\nPROBE 5 (FULL) home->overlay and overlay->overlay (NP, with pill decoration)');
  variant = 'FULL';
  // home→overlay
  let h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    await backCommit(h, h.$('options'));           // options→home, PANE-OWNING, completes normally
    await h.clock.advance(350); await ms(h);
    await h.clock.advance(700); await ms(h); await h.clock.advance(100); await ms(h);
    check('setup: back on home, no pane', ghosts(h) === 0 && commits(h).length === 1, commits(h).join('|'));
    for (let i = 0; i < 15 && h.raf.pending(); i++) await h.raf.frame();
    await fwdCommit(h, h.$('home'));               // A: home→options, pane-less, settling
    const aId = sess(h) && sess(h).id;
    check('A (home->overlay) settling', !!sess(h) && sess(h).dragging === false, JSON.stringify(sess(h)));
    h.touch.start(1010, 300, h.$('home'));         // B supersedes from the right edge, arms fwd again
    check('B armed', !!sess(h) && sess(h).id !== aId, JSON.stringify(sess(h)));
    h.touch.move(940, 302); await sleep(14);
    const bHome = tf(h, 'home'), bOpt = tf(h, 'options');
    await h.raf.frame();
    check('stale rAF no-op on B movers', tf(h, 'home') === bHome && tf(h, 'options') === bOpt, tf(h, 'home') + '/' + tf(h, 'options'));
    await h.clock.advance(350);
    check('stale timer no-op', commits(h).length === 1, commits(h).join('|'));
    fireTransitionEnd(h, h.$('home'));
    check('stale transitionend no-op', commits(h).length === 1, commits(h).join('|'));
    h.touch.move(400, 304); await sleep(14);
    h.touch.end(400, 304); await ms(h);
    await h.clock.advance(350); await ms(h);
    check('B committed home->options', commits(h).length === 2 && !hidden(h, 'options'), commits(h).join('|'));
    check('session null', sess(h) === null, JSON.stringify(sess(h)));
  } finally { h.dispose(); }
  // overlay→overlay: NP over options, with the pill decoration
  h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await ms(h);
    const cover = h.document.querySelector('[data-book="bookA"] .covertap');
    check('NP fixture: cover tile present', !!cover, '');
    if (!cover) return;
    cover.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    h.tap('#player'); await ms(h);                 // NP over options: stack [... options, nowplaying]
    await backCommit(h, h.$('nowplaying'));        // A: NP→options back, pane-less, pill decoration
    check('A (NP->options) settling', !!sess(h) && sess(h).dragging === false, JSON.stringify(sess(h)));
    check('pill decoration exists during settle', h.document.querySelectorAll('.np-pill-float').length === 1, '');
    const aId = sess(h).id;
    h.touch.start(10, 300, h.$('nowplaying'));     // B supersedes
    check('B armed after superseding decorated A', !!sess(h) && sess(h).id !== aId, JSON.stringify(sess(h)));
    check('recovery removed the stale pill clone', h.document.querySelectorAll('.np-pill-float').length <= 1,
      'floats=' + h.document.querySelectorAll('.np-pill-float').length);
    h.touch.move(80, 302); await sleep(14);
    const bNp = tf(h, 'nowplaying'), bOpt2 = tf(h, 'options');
    await h.raf.frame();
    check('stale rAF no-op (NP movers)', tf(h, 'nowplaying') === bNp && tf(h, 'options') === bOpt2, tf(h, 'nowplaying') + '/' + tf(h, 'options'));
    await h.clock.advance(350);
    check('stale timer no-op (NP)', commits(h).length === 0, commits(h).join('|'));
    fireTransitionEnd(h, h.$('nowplaying'));
    check('stale transitionend no-op (NP)', commits(h).length === 0, commits(h).join('|'));
    h.touch.move(600, 304); await sleep(14);
    h.touch.end(600, 304); await ms(h);
    await h.clock.advance(350); await ms(h);
    check('B committed NP->options exactly once', commits(h).length === 1, commits(h).join('|'));
    check('options visible, NP hidden', !hidden(h, 'options') && hidden(h, 'nowplaying'), '');
  } finally { h.dispose(); }
}

// ============================================================================
// PROBE 6 — NOGUARD falsifiability: with the identity guards omitted the same
// interleaving MUST stain B (rAF transform stain; stale finalize commits over B).
// ============================================================================
async function probe6() {
  console.log('\nPROBE 6 (NOGUARD mutation) the instrument must detect the stain');
  variant = 'NOGUARD';
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    await backCommit(h, h.$('options'));
    h.touch.start(10, 300, h.$('options'));
    h.touch.move(80, 302); await sleep(14);
    const bOpt = tf(h, 'options');
    await h.raf.frame();
    check('NOGUARD: stale rAF STAINS B movers', tf(h, 'options') !== bOpt, tf(h, 'options') + ' (was ' + bOpt + ')');
    const holds0 = endHolds(h).length;
    await h.clock.advance(350);
    check('NOGUARD: stale finalize COMMITS over B', commits(h).length >= 1, commits(h).join('|'));
    check('NOGUARD: stale finalize dropped a hold out from under B', endHolds(h).length > holds0,
      JSON.stringify(endHolds(h).map((c) => c.args[0])));
  } finally { h.dispose(); }
}

// ============================================================================
// PROBE 7 — NOCLEAR falsifiability: with the finishing clear omitted, a
// superseding tap that never arms must WEDGE the next swipe (W reddens under
// the negative gate).
// ============================================================================
async function probe7() {
  console.log('\nPROBE 7 (NOCLEAR mutation) W must redden: the next swipe wedges');
  variant = 'NOCLEAR';
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    await backCommit(h, h.$('options'));
    h.touch.start(500, 300, h.$('options'));  // supersedes (recovery), never arms
    h.touch.end(500, 300); await ms(h);
    await backCommit(h, h.$('options'));      // fresh full swipe attempt
    check('NOCLEAR: next swipe is WEDGED (never engages)', starts(h).length === 1, starts(h).join('|'));
  } finally { h.dispose(); }
}

(async () => {
  try {
    await probe1();
    await probe2();
    await probe3();
    await probe4();
    await probe5();
    await probe6();
    await probe7();
  } catch (e) {
    failures++;
    console.error('\nPROBE CRASH:', e && e.stack || e);
  }
  console.log('\n==== ' + checks + ' checks, ' + failures + ' failures ====');
  process.exit(failures ? 1 : 0);
})();
