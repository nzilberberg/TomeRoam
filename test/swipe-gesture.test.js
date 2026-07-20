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

// REAL wall-clock, captured before boot() patches global.setTimeout. The swipe's
// velocity tracker only recomputes when >8ms of real time has elapsed since the last
// sample (app.js move()), so synthetic moves dispatched back-to-back leave vx holding
// the OUTWARD flick — which commits. A gesture meant to abort has to let real time
// pass between the outward move and the retreat, or it is a coin toss.
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

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

/**
 * A left-edge back-drag that deterministically ABORTS: out past the direction lock,
 * then back toward the edge, so both the committed fraction and the release velocity
 * say "no". (Dragging out and releasing would be velocity-dependent, and jsdom's
 * timing would decide commit-vs-abort for us.)
 */
async function edgeSwipe(h, row) {
  h.touch.start(10, 300, row);      // inside EDGE (44px)
  h.touch.move(80, 302);            // past the 8px lock, horizontal → start()
  await realSleep(12);              // > the 8ms sample gate, so the NEXT move records lastX…
  h.touch.move(200, 304);           // …here, at the outward extreme
  await realSleep(12);              // …and again, so the retreat is measured FROM 200
  h.touch.move(30, 304);            // retreat → prog below THRESH and vx clearly negative
  await realSleep(12);
  h.touch.end(30, 304);
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
    assert.ok(log.some((m) => /^#\d+ (abort|commit) /.test(m)), `the gesture must settle — got ${JSON.stringify(log)}`);
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
    assert.ok(log.some((m) => /^#\d+ (abort|commit) /.test(m)),
      `a gesture whose start node was destroyed must STILL settle — got ${JSON.stringify(log)}`);
  } finally { h.dispose(); }
});

// ── 2026-07-19, reported after .178 shipped ────────────────────────────────────
// "cover images flash on each aborted swipe return". start() renders the DESTINATION
// into the live #browse, which puts display:none on the outgoing page — and the
// browser drops a hidden view's decoded images. Restoring that page on abort
// re-decodes them (and under windowed browse re-materializes its rows, whose art must
// reload). finalize() dropped the ghost BEFORE re-applying the screen, so that
// re-decode happened with nothing covering it. The commit-to-home path had solved the
// identical problem the opposite way — reveal under the ghost, hold until paintable,
// then drop — and this path simply never got it.
test('an ABORTED browse→browse swipe re-renders UNDER the ghost, never bare (cover flash)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);

    const ghostsAtRender = [];
    const inner = h.browse.render;
    h.browse.render = async (desc) => {
      ghostsAtRender.push(h.document.querySelectorAll('.nav-ghost').length);
      return inner(desc);
    };

    await edgeSwipe(h, row);

    assert.ok(swipeLog(h).some((m) => /^#\d+ abort /.test(m)),
      `fixture sanity: this gesture must ABORT — got ${JSON.stringify(swipeLog(h))}`);
    assert.ok(ghostsAtRender.length >= 2,
      `render runs during the drag AND again on abort — got ${JSON.stringify(ghostsAtRender)}`);
    assert.ok(ghostsAtRender[ghostsAtRender.length - 1] >= 1,
      'the abort re-render must happen while a ghost still covers the view, or the re-decode is visible');
  } finally { h.dispose(); }
});

// ⭐ .198 — the ghost must outlive the reveal by a PAINTED FRAME, not by a decode.
//
// Grounded in device measurement, not in my model of the code: across every bug report
// the shipped `FLASH hold` line read 1-2ms (a frame is 16.7ms) and sometimes covered
// `covers=0`. .179's decode gate went inert the moment .194 stopped display:none'ing the
// outgoing page — parking keeps the covers decoded, so decode() resolves on the microtask
// queue and the ghost was lifted in the same frame as the reveal, uncovering a view the
// browser had not painted yet.
//
// This asserts the ghost is STILL COVERING after the reveal and after the first frame,
// and only goes when the second frame (the one carrying the painted content) lands.
// Requires deferRaf — under the synchronous default the mid-state cannot exist and this
// test could not fail.
test('the ghost outlives the reveal until a frame has PAINTED it, not just decoded (.198)', async () => {
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    const ghosts = () => h.document.querySelectorAll('.nav-ghost').length;

    h.touch.start(10, 300, row);
    h.touch.move(80, 302);
    await realSleep(12);
    h.touch.move(200, 304);
    await realSleep(12);
    h.touch.move(30, 304);
    await realSleep(12);
    h.touch.end(30, 304);

    // settle() parks its transforms behind a rAF, so the animation needs frames to run
    // before the 340ms finalize can fire. Drain them, then let the abort land.
    for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();
    await settle(h);
    await h.clock.advance(400);
    await settle(h);

    assert.ok(swipeLog(h).some((m) => /^#\d+ abort /.test(m)),
      `fixture sanity: this gesture must ABORT — got ${JSON.stringify(swipeLog(h))}`);
    // The reveal has happened. The decode gate has had every chance to settle (the
    // awaits above drained the microtask queue many times over). If the ghost is gone
    // here, nothing is covering the unpainted view — which is the bug.
    assert.equal(ghosts(), 1,
      'after the reveal the ghost must STILL cover the view — the decode gate alone lifted it in-frame');

    await h.raf.frame();                    // frame 1: runs BEFORE the paint
    assert.equal(ghosts(), 1,
      'one frame is not enough — its callback runs before the paint it scheduled');

    await h.raf.frame();                    // frame 2: the painted content is committed
    assert.equal(ghosts(), 0, 'once a frame has painted the reveal the ghost must go');
  } finally { h.dispose(); }
});

/** Every FLASH line the real app logged, in order. */
const flashLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'FLASH')
  .map((c) => c.args[1]);

/**
 * A visible `.browsepage` with one row in it. The reveal watcher attributes every
 * mutation to its PAGE (app.js bucket()), so a node parented straight onto #browse
 * counts as hidden and would never reach the covered/exposed split at all.
 */
function addPage(h) {
  const page = h.document.createElement('div');
  page.className = 'browsepage';
  h.$('browse').appendChild(page);
  return page;
}
function addRowTo(page, h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  page.appendChild(row);
  return row;
}

// ⭐ .199 — the COVERED/EXPOSED split must actually split.
//
// This is a DIAGNOSTIC, and a diagnostic that misattributes is worse than none — it
// was a mis-trusted instrument that produced four wrong explanations in this thread
// already. The whole value of the new line is that "churned while hidden" and
// "churned in front of the user" land in different buckets, so that is what this
// pins: the SAME mutation, once on each side of the ghost drop, must be counted on
// the side it actually happened.
test('the reveal watcher splits churn by whether the ghost was still covering (.199)', async () => {
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    const page = addPage(h);

    h.touch.start(10, 300, row);
    h.touch.move(80, 302);
    await realSleep(12);
    h.touch.move(200, 304);
    await realSleep(12);
    h.touch.move(30, 304);
    await realSleep(12);
    h.touch.end(30, 304);

    for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();
    await settle(h);
    await h.clock.advance(400);
    await settle(h);

    const ghosts = () => h.document.querySelectorAll('.nav-ghost').length;
    assert.equal(ghosts(), 1, 'fixture sanity: the ghost must still be covering here');

    // While COVERED.
    addRowTo(page, h);
    await settle(h);

    await h.raf.frame(); await h.raf.frame();          // paint gate → ghost lifts
    assert.equal(ghosts(), 0, 'fixture sanity: the ghost must have lifted by now');

    // While EXPOSED — the identical mutation.
    addRowTo(page, h);
    await settle(h);

    await h.clock.advance(1600);                        // close the 1500ms watch window
    await settle(h);

    const line = flashLog(h).find((m) => /@reveal/.test(m));
    assert.ok(line, `no @reveal line was logged — got ${JSON.stringify(flashLog(h))}`);
    const covered = /COVERED [^|]*rows\+=(\d+)/.exec(line);
    const exposed = /EXPOSED [^|]*rows\+=(\d+)/.exec(line);
    assert.ok(covered && exposed, `line carries no covered/exposed split: ${line}`);
    assert.equal(covered[1], '1', `the pre-drop row must be counted COVERED: ${line}`);
    assert.equal(exposed[1], '1', `the post-drop row must be counted EXPOSED: ${line}`);
    assert.match(line, /first=\[row\+/, `an exposed write must be named, not just counted: ${line}`);
  } finally { h.dispose(); }
});

// ⭐ .200 — BACK-TO-BACK SWIPES MUST BOTH BE REPORTED.
//
// Found by the user naming a specific swipe — "the second-to-last aborted swipe" —
// that had produced NO log line at all. reportReveal CANCELLED any open window when a
// new reveal began, and the window (1500ms) outlasted the gap between consecutive
// swipes (~1400ms), so of two aborts in a row only the second was ever logged. The
// swipe that flashes is exactly the one you repeat trying to reproduce it, which made
// this lose the evidence precisely when it mattered. A superseded window is now
// FLUSHED. Losing a measurement silently is worse than not taking it.
test('two aborts in a row produce TWO reports — a superseded window is flushed, not dropped (.200)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);

    await edgeSwipe(h, addRow(h));
    // The SECOND swipe's touchstart ends the first window early (`end=input`) — that is
    // the other half of the fix and it is why the first report exists at all here.
    await edgeSwipe(h, addRow(h));
    await h.clock.advance(600);        // outlast the 500ms window so the second closes
    await settle(h);

    const reveals = flashLog(h).filter((m) => /@reveal/.test(m));
    assert.equal(reveals.length, 2,
      `both aborts must be reported — got ${reveals.length}: ${JSON.stringify(flashLog(h))}`);
    // WHICH mechanism closed it matters, and asserting only the count cannot tell.
    // Mutation testing caught this: with just a count, removing the input cutoff still
    // passed (the supersede flush closed it instead) and removing the flush still
    // passed (the cutoff did) — the two fixes mask each other. Pinning the REASON makes
    // the cutoff's own test able to fail. The first window must end because the user
    // touched the screen again, BEFORE its timer, so the churn from that next action is
    // never attributed to this swipe — the contamination that made every large EXPOSED
    // reading in the device log unreadable.
    assert.match(reveals[0], /end=input/,
      `the next touch must close the first window, not its timer: ${reveals[0]}`);
    // And each must be identifiable, or "the second-to-last one" is still a guess.
    assert.match(reveals[0], /^#1 /, `first report must carry its seq: ${reveals[0]}`);
    assert.match(reveals[1], /^#2 /, `second report must carry its seq: ${reveals[1]}`);
    // The seq has to PAIR with the settle line, which is the whole point of numbering.
    assert.ok(swipeLog(h).filter((m) => /^#\d+ abort /.test(m)).length === 2,
      `both settles must be numbered too — got ${JSON.stringify(swipeLog(h))}`);
  } finally { h.dispose(); }
});

// ── the row hold ──────────────────────────────────────────────────────────────
// While a gesture is live, Browse keeps the outgoing page's rows so an ABORT does
// not rebuild the page. The hazard is a hold that is never released: hidden pages
// would then keep rows indefinitely. Bounded (it degrades to what the classic
// renderer already does) but still a leak, so every exit path is pinned here.
const holds = (h) => h.log.calls.filter((c) => c.name === 'browse.beginHold').length;
const releases = (h) => h.log.calls.filter((c) => c.name === 'browse.endHold' && c.args[0] === 'current').length;

test('row hold: a completed swipe takes the hold and releases it', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await edgeSwipe(h, addRow(h));
    assert.equal(holds(h), 1, 'the gesture took a hold');
    assert.equal(releases(h), 1, 'and released it — a stranded hold keeps hidden rows forever');
  } finally { h.dispose(); }
});

// The hold is taken in start(), NOT begin() — begin() has five early returns and can
// arm a gesture that never crosses the direction lock, and a hold taken there would
// be stranded by every one of them. These two pin that placement: asserting the hold
// is never taken is falsifiable (move takeRowHold() into begin() and both go red),
// where asserting taken===released would pass vacuously at 0===0.
test('row hold: a VERTICAL abandon never took one — the hold belongs to start(), not begin()', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    h.touch.start(10, 300, row);
    await realSleep(12);
    h.touch.move(14, 360);        // crosses the lock VERTICALLY → abandoned before start()
    await realSleep(12);
    h.touch.end(14, 360);
    await settle(h);
    await h.clock.advance(400);
    assert.equal(holds(h), 0, 'a vertical drag must never take a row hold');
    assert.equal(releases(h), 0);
  } finally { h.dispose(); }
});

test('row hold: a tap under the direction lock never took one', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    h.touch.start(10, 300, row);
    h.touch.move(12, 301);        // under the 8px lock — start() never runs
    h.touch.end(12, 301);
    await settle(h);
    await h.clock.advance(400);
    assert.equal(holds(h), 0, 'an unlocked tap must never take a row hold');
  } finally { h.dispose(); }
});

test('row hold: an INTERRUPTED live gesture releases it via the hard reset', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    // Go live (start() runs → hold taken), then never finish this gesture.
    h.touch.start(10, 300, row);
    await realSleep(12);
    h.touch.move(120, 302);
    assert.equal(holds(h), 1, 'fixture sanity: the gesture went live and took a hold');
    assert.equal(releases(h), 0, 'fixture sanity: still held mid-drag');

    // A second touch arrives with the first still live → begin()'s hard reset. This is
    // the ONLY path that can strand a taken hold, since settle() never runs here.
    h.touch.start(10, 300, addRow(h));
    await settle(h);
    assert.equal(releases(h), 1, 'the hard reset must release the stranded hold');
  } finally { h.dispose(); }
});

test('a FINISHED gesture stops listening — a stale node cannot end the next gesture', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row1 = addRow(h);
    await edgeSwipe(h, row1);
    const settledOnce = swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m)).length;
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

    assert.equal(swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m)).length, settledOnce,
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
