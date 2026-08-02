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

/** Every FLASH line the real app logged, in order. */
const flashLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'FLASH')
  .map((c) => c.args[1]);

// ── RETIRED WITH THE CLONE (PLAN-swipe-declone.md Stage 2, §12 items 12 and 27) ──────
// Six cells lived here, and every one of them had the BUILT PANE as its only subject:
// the aborted browse->browse re-render happening UNDER the ghost (the 2026-07-19 cover
// flash); the ghost outliving the reveal by a PAINTED frame rather than a decode (.198);
// the reveal watcher splitting churn by whether the ghost was still covering (.199); the
// scroll trail sampled on both sides of the uncover (.201); and the two cover-animation
// phase-sync cells (.205, .208), which existed so a CLONE would not restart its
// animations out of phase with the original.
//
// Each is DELETED rather than narrowed, because the defect each guarded cannot occur any
// more: there is no uncover. The abort's re-decode had one cause — the mid-drag render
// put display:none on the outgoing page — and Stage 2 removes it at the root by giving
// each browse page its own element, so the source is never overwritten, never hidden and
// never re-decoded. The real nodes carry their own running animations, so there is no
// phase to copy. ABORTNORENDER in test/swipe-declone-stage2-browse.test.js is the
// successor for the property that survives: an aborted swipe re-renders nothing at all.
//
// ⛔ What is NOT retired, and is device-owed rather than proven here: whether the abort
// still repaints on a real device (plan §15 R5). Stage 2 removes one recorded trigger and
// relocates the scroll-anchoring surface; it does not predict the outcome either way.

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

// ⭐ .201 — the reveal must report WHERE the page sat, on both sides of the uncover.
//
// Three device repros on .200, and they are NOT all the same symptom — do not merge
// them, they may be two bugs:
//   #4, #6  — the user saw IMAGES flash. src unchanged (4->4, 8->8), art loaded=0,
//             FADED=0, inst=0 => the covers were neither refetched nor re-faded.
//   #24     — the user saw the LETTERS flash. LETTERS=0 => the letterheads were not
//             touched, and text cannot decode or refetch at all.
// What they share is narrower than "the same bug": in every one, NO DOM write reached
// the visible page at the uncover (EXPOSED clean at the ~30ms mark, ROWS KEPT n/n,
// sameNode and sameCtl, clean windows). The two classes eliminate different mechanisms
// — images rule out refetch, letters rule out decode — which together leave POSITION
// as the unmeasured axis: the ghost is frozen at the scroll of gesture start, and if
// the real view is revealed at a different Y the page jumps with no DOM write at all.
//
// This pins the WIRING, which is the part that can silently break — and nearly did:
// the hold samples through `cover.mark`, and an earlier draft referenced it before it
// was ever assigned, so preDrop/postDrop would have been missing from every report
// while the line still looked complete.
// The control group is the point: transitions that build NO pane must be reported too,
// or "long frames happen on pane paths" would have nothing to be compared against.
test('every settle reports a frame sample tagged with its pane kind (.213)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await edgeSwipe(h, addRow(h));
    await h.clock.advance(600);
    await settle(h);

    const frames = flashLog(h).filter((m) => /^frames /.test(m));
    assert.ok(frames.length >= 1,
      `a settle must emit a frame sample — got ${JSON.stringify(flashLog(h))}`);
    assert.match(frames[0], /pane=(ghost|snapshot|none)\b/,
      `the sample must name the pane kind, or the correlation cannot be made: ${frames[0]}`);
    assert.match(frames[0], /worst=\d+ms long=\d+ gaps=\[/,
      `the sample must carry the worst frame, the dropped-frame count and the raw gaps: ${frames[0]}`);
    // EXPECTATION CHANGED, cell KEPT (PLAN-swipe-declone.md §12 item 27's rule: an assertion
    // about the CLASSIFICATION survives and changes value). No transition builds a pane any
    // more, browse→browse included, so every settle must now report `pane=none` — and a
    // detector that reported anything else would be naming a pane that does not exist.
    assert.match(frames[0], /pane=none\b/,
      `no transition builds a pane after declone Stage 2, so every settle reports pane=none; got ${frames[0]}`);
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
