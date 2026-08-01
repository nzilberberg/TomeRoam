// LOKI PROBE — disposable. STRIKE-swipe-declone-stage2.
//
// The consequence of a same-key browse->browse pair (Invariant D6 distinctness violated),
// EXECUTED through the real app: real app.js, real browse.js, real virtuallist.js, real
// swipe.js, real touch listeners, via test/app-harness.js.
//
// FORCING (synthetic, and deliberately so): the adjacent same-key nav entries are forced by
// dispatching a second click on the SAME author row after navigating away from its page.
// This probe makes NO claim that a real user gesture can produce this state — reachability
// is the planner's filed question. It executes only the CONSEQUENCE, given the pair.
//
// Predictions stated before the run (Phase 4 of the method):
//   The plan (D6 text) predicts mid-drag: "the second write wins and the single element
//   translates by base + t with the incoming's ±w offset — the view slides off with nothing
//   arriving."  Nothing in the plan predicts the END state. Static trace predicts full
//   recovery at finalize on both branches (resetSwipeStyles + endHold landed branch), and
//   no wedge (a subsequent gesture arms and settles).
//   The fracture prediction: a stuck transform, a wrong/hidden page, or a dead swipe after.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('C:/Users/nzilb/OneDrive/Desktop/TomeRoam/test/app-harness.js');

const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }
const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const settles_ = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}
const pageEl = (h, key) => {
  const e = h.Browse._test.pageCache.get(key);
  return e ? e.el : null;
};
async function goLive(h) {
  const row = addRow(h);
  h.touch.start(10, 300, row);
  await realSleep(12);
  h.touch.move(120, 302);
  await realSleep(12);
  return row;
}
async function abortBack(h) {
  h.touch.move(60, 304); await realSleep(12);
  h.touch.move(14, 306); await realSleep(12);
  h.touch.end(10, 306);
  await settle(h); await h.clock.advance(700); await settle(h);
}
async function commitBack(h) {
  h.touch.move(400, 304); await realSleep(12);
  h.touch.move(760, 306); await realSleep(12);
  h.touch.move(950, 308); await realSleep(12);
  h.touch.end(980, 308);
  await settle(h); await h.clock.advance(700); await settle(h);
}

// Force navStack = [home, authors, authorBooks(A), authorBooks(A)] through the REAL
// listeners: render authors, click the author row, then click the SAME (now-hidden) row again.
async function forceSameKeyAdjacency(h) {
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]'); await settle(h);
  const authorsPage = pageEl(h, 'authors');
  assert.ok(authorsPage, 'setup: authors page cached');
  const row = [...authorsPage.querySelectorAll('*')].find((el) => typeof el.onclick === 'function');
  assert.ok(row, 'setup: an author row with a click handler exists');
  row.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(h);
  const abPage = pageEl(h, 'author:authorA');
  assert.ok(abPage, 'setup: authorBooks page cached after first tap');
  // Second tap on the same row — the authors page is hidden now; this is the synthetic forcing.
  row.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(h);
  return { authorsPage, abPage };
}

function transformCarriers(h) {
  const out = [];
  const host = h.$('browse');
  if (host.style.transform !== '') out.push({ what: '#browse', tf: host.style.transform, el: host });
  for (const p of h.document.querySelectorAll('.browsepage')) {
    if (p.style.transform !== '') out.push({ what: 'page', tf: p.style.transform, el: p });
  }
  return out;
}

function snapState(h, tag) {
  const rows = [];
  for (const [k, v] of h.Browse._test.pageCache) {
    rows.push(`${tag} ${k}: parked=${v.el.classList.contains('parked')} hidden=${v.el.classList.contains('hidden')} tf='${v.el.style.transform}'`);
  }
  return rows;
}

test('same-key browse->browse ABORT: mid-drag anomaly, then end state and a follow-up gesture', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    const { authorsPage, abPage } = await forceSameKeyAdjacency(h);

    // ── the same-key gesture goes live (or dies trying — either is a result)
    await goLive(h);
    console.log('START LINES:', JSON.stringify(starts(h)));
    assert.match(starts(h).at(-1) || '', /^start back authorBooks→authorBooks/,
      'the same-key back-swipe must have gone live through the real path');

    // ── mid-drag: who carries a transform?
    const w = h.window.innerWidth;
    const carriers = transformCarriers(h);
    console.log('MID-DRAG CARRIERS:', JSON.stringify(carriers));
    console.log(snapState(h, 'MID-DRAG').join('\n'));
    // D6's prediction: ONE element, carrying the incoming slot's write (-w + t), t = 110.
    assert.equal(carriers.length, 1, 'exactly one element carries a drag transform (one node, two slots, last write wins)');
    assert.equal(carriers[0].el, abPage, 'and it is the shown authorBooks page (node identity)');
    assert.equal(carriers[0].tf, `translateX(${-w + 110}px)`,
      'the surviving write is the INCOMING slot\'s (base -w), not the outgoing\'s (base 0): the shown page is a full viewport off-screen 110px into the drag');

    // ── abort
    await abortBack(h);
    console.log('SETTLES:', JSON.stringify(settles_(h)));
    console.log(snapState(h, 'POST-ABORT').join('\n'));
    assert.match(settles_(h).at(-1) || '', /abort back authorBooks→authorBooks/, 'the gesture aborted');

    assert.equal(abPage.style.transform, '', 'post-abort: the page carries no stuck transform');
    assert.equal(abPage.classList.contains('parked'), false, 'post-abort: not parked');
    assert.equal(abPage.classList.contains('hidden'), false, 'post-abort: the page the user was on is shown');
    assert.equal(authorsPage.classList.contains('hidden'), true, 'post-abort: the authors page is hidden again');
    assert.equal(authorsPage.classList.contains('parked'), false, 'post-abort: and not left parked');

    // ── follow-up gesture: the wedge witness
    const nStarts = starts(h).length;
    await goLive(h);
    assert.equal(starts(h).length, nStarts + 1, 'a subsequent gesture still goes live (finishing is not wedged)');
    await abortBack(h);
    assert.match(settles_(h).at(-1) || '', /abort back/, 'and it settles cleanly');
  } finally { h.dispose(); }
});

test('same-key browse->browse COMMIT: end state and a follow-up gesture', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    const { authorsPage, abPage } = await forceSameKeyAdjacency(h);

    await goLive(h);
    assert.match(starts(h).at(-1) || '', /^start back authorBooks→authorBooks/, 'live same-key gesture');

    await commitBack(h);
    console.log('SETTLES:', JSON.stringify(settles_(h)));
    console.log(snapState(h, 'POST-COMMIT').join('\n'));
    assert.match(settles_(h).at(-1) || '', /commit back authorBooks→authorBooks/, 'the gesture committed');

    assert.equal(abPage.style.transform, '', 'post-commit: no stuck transform');
    assert.equal(abPage.classList.contains('parked'), false, 'post-commit: not parked');
    assert.equal(abPage.classList.contains('hidden'), false, 'post-commit: the landed page (same page) is shown');
    assert.equal(authorsPage.classList.contains('hidden'), true, 'post-commit: authors hidden');
    assert.equal(authorsPage.classList.contains('parked'), false, 'post-commit: authors not parked');

    // follow-up: navStack is now [home, authors, authorBooks(A)] — a normal back-swipe
    const nStarts = starts(h).length;
    await goLive(h);
    assert.equal(starts(h).length, nStarts + 1, 'a subsequent gesture still goes live');
    assert.match(starts(h).at(-1) || '', /^start back authorBooks→authors/, 'and it is a normal distinct-key pair');
    await abortBack(h);
    assert.match(settles_(h).at(-1) || '', /abort back/, 'and it settles cleanly');
  } finally { h.dispose(); }
});
