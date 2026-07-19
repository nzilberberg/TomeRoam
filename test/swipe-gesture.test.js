// Swipe gesture EVENT PLUMBING — grounded in a shipped bug (2026-07-19, build .177).
//
// THE BUG: an edge-swipe on Authors could freeze mid-drag and never settle. The
// device log showed a gesture that started and then logged nothing at all — no
// commit, no abort — followed 4.3s later by the next touch tripping the
// "leftover state on begin" hard reset, which left the wrong page on screen under
// the wrong nav highlight and turned the next tap into a wrong-book navigation.
//
// THE MECHANISM (measured, not inferred):
//   * With windowed browse on, the swipe's own mid-drag render calls showPage(),
//     which deactivates the OUTGOING page's virtual controller; deactivate()
//     dematerializes, which calls el.remove() on every realized row — including the
//     row the finger is on. Measured against the real browse.js + virtuallist.js:
//     classic keeps the node attached (isConnected=true), windowed detaches it.
//   * Touch events after touchstart are dispatched at the ORIGINAL target for the
//     life of the gesture. Once that node is detached its propagation path no longer
//     includes `document` — measured: a document listener does NOT receive a
//     touchend dispatched at a detached node. Every swipe listener was on `document`.
//   * Three further paths detach browse DOM in EITHER mode with no gesture
//     awareness: the SWR repaint's buildFor (innerHTML=''), Net.onReconnect →
//     Browse.clearCache(), and evictLRU. So this is not a windowed-only bug; windowed
//     just made it fire on every swipe instead of on a race.
//
// THE INVARIANT UNDER TEST: a gesture must settle even when the DOM it started on is
// destroyed mid-drag. The gesture does not own that node and must not depend on it.
//
// Drag GEOMETRY is not tested here (jsdom has no layout). What is tested is which
// node the listeners are reachable from — the wiring question that shipped.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

/** Every SWIPE line the real app logged, in order. */
const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE')
  .map((c) => c.args[1]);

/**
 * Put the app on Authors with Books behind it, so a left-edge back-swipe is
 * browse→browse — the case that re-renders the live #browse mid-drag (app.js
 * start() → showAppView(dest, true) → Browse.render). Driven through the REAL nav
 * buttons; nothing pokes navStack.
 */
async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]');
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
}

/**
 * A stand-in for a realized list row inside #browse. The harness fakes Browse (it
 * renders nothing), so the gesture needs a real node to grab the way a real finger
 * grabs a real row.
 */
function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  row.setAttribute('data-book', 'rowUnderFinger');
  h.$('browse').appendChild(row);
  return row;
}

/** A full left-edge back-drag: grab at the edge, drag right, release. */
async function edgeSwipe(h, row) {
  h.touch.start(10, 300, row);      // inside EDGE (44px)
  h.touch.move(80, 302);            // past the 8px lock, horizontal → start()
  h.touch.move(200, 304);
  h.touch.end(200, 304);
  await settle(h);
  await h.clock.advance(400);       // settle()'s 340ms finalize safety net
  await settle(h);
}

test('control: a swipe whose row STAYS attached settles normally', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);

    await edgeSwipe(h, row);

    const log = swipeLog(h);
    assert.ok(log.some((m) => /^start /.test(m)), `the gesture must actually engage — got ${JSON.stringify(log)}`);
    assert.ok(row.isConnected, 'fixture sanity: nothing detached the row in this case');
    assert.ok(log.some((m) => /^(abort|commit) /.test(m)), `the gesture must settle — got ${JSON.stringify(log)}`);
  } finally { h.dispose(); }
});

test('a swipe settles even when the row under the finger is DESTROYED mid-drag (.177)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);

    // Model the measured windowed-browse behaviour: the mid-drag render detaches the
    // outgoing page's realized rows. This is what showPage→deactivate→dematerialize
    // does to the real DOM, and it is no kinder than the real dependency — the real
    // one also removes the node the gesture started on.
    h.browse.render = async () => { row.remove(); };

    await edgeSwipe(h, row);

    const log = swipeLog(h);
    assert.ok(log.some((m) => /^start /.test(m)), `the gesture must actually engage — got ${JSON.stringify(log)}`);
    assert.equal(row.isConnected, false, 'fixture sanity: the row really was destroyed mid-gesture');
    assert.ok(log.some((m) => /^(abort|commit) /.test(m)),
      `a gesture whose start node was destroyed must STILL settle — got ${JSON.stringify(log)}`);
  } finally { h.dispose(); }
});

test('a FINISHED gesture stops listening — a stale node cannot end the next gesture', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row1 = addRow(h);
    await edgeSwipe(h, row1);
    const settledOnce = swipeLog(h).filter((m) => /^(abort|commit) /.test(m)).length;
    assert.equal(settledOnce, 1, 'fixture sanity: the first gesture settled exactly once');

    // A second gesture is now live on a different row…
    const row2 = addRow(h);
    h.touch.start(10, 300, row2);
    h.touch.move(80, 302);

    // …and the FIRST gesture's node fires a late touchend. Per the generation-ownership
    // rule this codebase has been bitten by repeatedly (.89/.104/.118), a superseded
    // gesture's event must never finalize a NEWER one. If end()'s releaseGesture() is
    // missing, row1's listeners are still bound and this settles row2's drag.
    const stale = new h.window.Event('touchend', { bubbles: true });
    stale.changedTouches = [{ clientX: 80, clientY: 302, identifier: 0, target: row1 }];
    stale.touches = [];
    row1.dispatchEvent(stale);
    await settle(h);
    await h.clock.advance(400);

    assert.equal(swipeLog(h).filter((m) => /^(abort|commit) /.test(m)).length, settledOnce,
      'the stale node must not settle the live gesture');
  } finally { h.dispose(); }
});

test('a destroyed-row gesture leaves NO leftover state for the next gesture to hard-reset (.177)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    h.browse.render = async () => { row.remove(); };

    await edgeSwipe(h, row);

    // The device symptom: the NEXT touch found leftover state and hard-reset, which
    // is what left Books on screen under the Authors highlight and made the following
    // tap open the wrong book.
    const row2 = addRow(h);
    h.browse.render = async () => {};
    h.touch.start(10, 300, row2);
    h.touch.move(80, 302);
    h.touch.end(80, 302);
    await settle(h);

    assert.ok(!swipeLog(h).some((m) => /leftover state/.test(m)),
      'a settled gesture must leave nothing behind — the hard reset is for the unforeseen, not for routine swipes');
  } finally { h.dispose(); }
});
