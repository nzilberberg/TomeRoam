// LOKI r2 probe, part 2 — abort-settle supersession + double-supersession chain.
// DISPOSABLE. Same interceptor scheme as part 1.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const APP_KEY = path.normalize(path.join(REPO, 'js', 'app.js')).toLowerCase();
const realST = setTimeout;
const sleep = (ms) => new Promise((r) => realST(r, ms));
let variant = 'FULL';

function patchSrc(src, v) {
  const reps = [];
  reps.push([
    `      if (finishing) return;   // settle animation running — ignore new gestures until it lands`,
    `      const paneLess = (s) => !s.movers.some((m) => m.own === 'owned-pane');
      if (finishing && !(session && paneLess(session))) return;`]);
  reps.push([
    `      if (d || document.querySelector('.nav-ghost')) {`,
    `      if (d || document.querySelector('.nav-ghost') || (finishing && session)) {`]);
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
        finishing = false;
        session = null;
        d = null;`]);
  reps.push([
    `      cur.settleFrame = requestAnimationFrame(() => {
        for (const m of cur.movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';
      });`,
    `      cur.settleFrame = requestAnimationFrame(() => {
        if (cur !== session) return;
        for (const m of cur.movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';
      });`]);
  reps.push([
    `        clearTimeout(cur.settleTimer);`,
    `        clearTimeout(cur.settleTimer);
        if (cur !== session) return;`]);
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
    if (typeof p === 'string' && path.normalize(p).toLowerCase() === APP_KEY && typeof res === 'string') return patchSrc(res, variant);
  } catch (e) { console.error('PATCH FAILURE:', e.message); process.exit(2); }
  return res;
};
const { boot } = require(REPO + '/test/app-harness.js');

let failures = 0, checks = 0;
function check(name, cond, detail) {
  checks++;
  if (cond) console.log('  PASS  ' + name);
  else { failures++; console.log('  FAIL  ' + name + (detail !== undefined ? '   [' + detail + ']' : '')); }
}
const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const commits = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const tf = (h, id) => h.$(id).style.transform;
const hidden = (h, id) => h.$(id).classList.contains('hidden');
const sess = (h) => h.window.PBSwipeSession();
async function ms(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }
async function backCommit(h, el) {
  h.touch.start(10, 300, el);
  h.touch.move(80, 302); await sleep(14);
  h.touch.move(600, 304); await sleep(14);
  h.touch.end(600, 304); await ms(h);
}
async function backAbort(h, el) {
  h.touch.start(10, 300, el);
  h.touch.move(80, 302); await sleep(14);
  h.touch.move(200, 304); await sleep(14);
  h.touch.move(30, 304); await sleep(14);
  h.touch.end(30, 304); await ms(h);
}
const fireTE = (h, el) => el.dispatchEvent(new h.window.Event('transitionend'));

// PROBE 8 — A superseded during an ABORT settle
async function probe8() {
  console.log('\nPROBE 8 (FULL) supersession during an ABORT settle');
  variant = 'FULL';
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    await backAbort(h, h.$('options'));            // A aborting: settle(cur, false), finishing=true
    check('A settling (abort)', !!sess(h) && sess(h).dragging === false, JSON.stringify(sess(h)));
    const aId = sess(h).id;
    h.touch.start(10, 300, h.$('options'));        // B supersedes + arms
    check('B armed', !!sess(h) && sess(h).id !== aId, JSON.stringify(sess(h)));
    h.touch.move(80, 302); await sleep(14);
    const bOpt = tf(h, 'options'), bBr = tf(h, 'browse');
    await h.raf.frame();
    check('stale abort-rAF no-op on B', tf(h, 'options') === bOpt && tf(h, 'browse') === bBr, tf(h, 'options') + '/' + tf(h, 'browse'));
    await h.clock.advance(350);
    check('stale abort-finalize no-op (no abort line)', commits(h).length === 0, commits(h).join('|'));
    fireTE(h, h.$('options'));
    check('stale abort transitionend no-op', commits(h).length === 0, commits(h).join('|'));
    h.touch.move(600, 304); await sleep(14);
    h.touch.end(600, 304); await ms(h);
    await h.clock.advance(350); await ms(h);
    check('B committed exactly once', commits(h).length === 1 && /commit/.test(commits(h)[0]), commits(h).join('|'));
    check('B landed on books', !hidden(h, 'browse') && hidden(h, 'options'), '');
    check('session null', sess(h) === null, JSON.stringify(sess(h)));
    await backCommit(h, h.$('books') ? h.$('browse') : h.$('browse'));   // engagement check: back books->home? stack [home, books]
    check('no wedge after abort supersession', starts(h).length === 3, starts(h).join('|'));
    await h.clock.advance(800); await ms(h);
  } finally { h.dispose(); }
}

// PROBE 9 — double supersession: A superseded by B; B (settling) superseded by C;
// BOTH generations' stale continuations delivered while C is live.
async function probe9() {
  console.log('\nPROBE 9 (FULL) chain A->B->C with both stale generations delivered onto C');
  variant = 'FULL';
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await ms(h);
    h.tap('.navbtn[data-nav="options"]'); await ms(h);
    // A: options->books, settling; A settle rAF pending, timer pending, listener on #options
    await backCommit(h, h.$('options'));
    const aId = sess(h).id;
    // B: supersedes, arms, drags, releases -> B settling (its own pending frame/timer/listener)
    h.touch.start(10, 300, h.$('options'));
    h.touch.move(80, 302); await sleep(14);
    h.touch.move(600, 304); await sleep(14);
    h.touch.end(600, 304); await ms(h);
    const bId = sess(h).id;
    check('B settling, distinct from A', !!sess(h) && bId !== aId && sess(h).dragging === false, JSON.stringify(sess(h)));
    // C: supersedes B (pane-less), arms, drags
    h.touch.start(10, 300, h.$('options'));
    check('C armed', !!sess(h) && sess(h).id !== bId, JSON.stringify(sess(h)));
    h.touch.move(80, 302); await sleep(14);
    check('C live (3 starts)', starts(h).length === 3, starts(h).join('|'));
    const cOpt = tf(h, 'options'), cBr = tf(h, 'browse');
    // deliver BOTH stale settle rAFs (A's and B's are both still queued under deferRaf)
    const pend = h.raf.pendingIds().length;
    await h.raf.frame();
    check('both stale frames were pending and fired (' + pend + ')', pend >= 2, 'pending=' + pend);
    check('neither stale rAF stained C', tf(h, 'options') === cOpt && tf(h, 'browse') === cBr, tf(h, 'options') + '/' + tf(h, 'browse'));
    // deliver BOTH stale settleTimers
    await h.clock.advance(800);
    check('neither stale finalize ran (no commit lines)', commits(h).length === 0, commits(h).join('|'));
    check('C transforms intact after both timers', tf(h, 'options') === cOpt && tf(h, 'browse') === cBr, '');
    // one transitionend on the shared anchor fires BOTH stale listeners (A's and B's)
    fireTE(h, h.$('options'));
    check('both stale transitionends no-oped', commits(h).length === 0, commits(h).join('|'));
    check('C still owner and dragging', !!sess(h) && sess(h).dragging === true, JSON.stringify(sess(h)));
    // C completes
    h.touch.move(600, 304); await sleep(14);
    h.touch.end(600, 304); await ms(h);
    await h.clock.advance(350); await ms(h);
    check('exactly one commit, C\'s (sid=3)', commits(h).length === 1 && /sid=3/.test(commits(h)[0]), commits(h).join('|'));
    check('C landed on books', !hidden(h, 'browse') && hidden(h, 'options'), '');
    check('session null', sess(h) === null, JSON.stringify(sess(h)));
    await backCommit(h, h.$('browse'));
    check('no wedge after the chain', starts(h).length === 4, starts(h).join('|'));
    await h.clock.advance(800); await ms(h);
  } finally { h.dispose(); }
}

(async () => {
  try { await probe8(); await probe9(); }
  catch (e) { failures++; console.error('\nPROBE CRASH:', e && e.stack || e); }
  console.log('\n==== ' + checks + ' checks, ' + failures + ' failures ====');
  process.exit(failures ? 1 : 0);
})();
