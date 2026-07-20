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
    const ghosts = () => h.document.querySelectorAll('.nav-ghost:not(.spent)').length;

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

    // .203 splits UNCOVER from REMOVAL: the pane stops covering (gains `.spent` and
    // fades) at the moment above, and the NODE goes a few frames later. The removal is
    // the probe's one real hazard — a pane left in the DOM is a full-viewport fixed
    // element over the app, and the next gesture would trip the "leftover state on
    // begin" hard reset that .178 exists to prevent.
    assert.equal(h.document.querySelectorAll('.nav-ghost').length, 1,
      'the pane should still exist mid-fade — otherwise this is not testing a fade at all');
    await h.clock.advance(400);
    await settle(h);
    assert.equal(h.document.querySelectorAll('.nav-ghost').length, 0,
      'the faded pane MUST be removed — a leaked full-viewport pane covers the app');
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

    const ghosts = () => h.document.querySelectorAll('.nav-ghost:not(.spent)').length;
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
test('the reveal reports the scroll trail across the uncover, both sides of it (.201)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await edgeSwipe(h, addRow(h));
    await h.clock.advance(600);
    await settle(h);

    const line = flashLog(h).find((m) => /@reveal/.test(m));
    assert.ok(line, `no @reveal line — got ${JSON.stringify(flashLog(h))}`);
    assert.match(line, /scroll=\[/, `the report must carry a scroll trail: ${line}`);
    // The uncover itself is the moment under investigation, so it must be sampled on
    // BOTH sides — a single sample cannot show a jump.
    assert.match(line, /preDrop=/, `must sample before the ghost is removed: ${line}`);
    assert.match(line, /postDrop=/, `must sample after the ghost is removed: ${line}`);
    assert.match(line, /final=/, `must sample once more when the window closes: ${line}`);
    // A NUMBER, not the `?` placeholder — `/ghostY=/` alone passed even with the
    // recording removed, which is a diagnostic that reports nothing while looking whole.
    assert.match(line, /ghostY=\d/, `must report the ghost's frozen scroll: ${line}`);
    // One `end=` only. The trail used to carry its own `end=`, colliding with the
    // window's `end=<why>` and making the line ambiguous to parse.
    assert.equal((line.match(/end=/g) || []).length, 1, `exactly one end= token: ${line}`);
    // .202: the abort's own restore is a scroll write, so the tracer must have caught
    // at least one — an empty trace would mean the patch never took.
    assert.match(line, /scrollWrites=\[/, `scroll writes must be traced: ${line}`);
    // .204: the ghost-vs-real comparison must be TAKEN, and taken while the pane is
    // still in the DOM. `no-pane` means it ran after the pane was gone and measured
    // nothing — a diagnostic that reports a reassuring blank instead of an answer.
    assert.match(line, /ghostVsReal=\[/, `ghost/real fidelity must be measured: ${line}`);
    assert.ok(!/ghostVsReal=\[(no-pane|err)\]/.test(line),
      `the comparison must run against a live pane: ${line}`);
    // .206: it must probe the element that CARRIES the animation (.cover) and the one
    // HOME is built from (.tile). Probing only .book/.letterhead is how the .205 reading
    // came back all-zero and looked like a pass.
    assert.match(line, /ghostVsReal=\[cover /, `the comparison must probe .cover: ${line}`);
    assert.match(line, /tile \d+\/\d+/, `the comparison must probe .tile (home's rows): ${line}`);
    // Nothing in this fixture carries an animation, so phase must report `n/a` — NOT a
    // bare 0. A 0 there reads as "perfectly in sync" when it means "never measured",
    // which is exactly how the .205 device reading looked like a pass and was not.
    assert.match(line, /phase=n\/a/,
      `an unmeasurable phase must say n/a, never 0: ${line}`);
    // And the patch MUST be removed. Leaving a wrapper on the global outlives the
    // diagnostic and becomes a real bug; every later swipe would stack another.
    assert.equal(h.window.scrollTo, h.window.scrollTo,
      'sanity: scrollTo is readable');
    assert.ok(!String(h.window.scrollTo).includes('cover.writes'),
      'the traced scrollTo must be restored when the window closes');
  } finally { h.dispose(); }
});

// ⭐ .205 — THE GHOST MUST INHERIT RUNTIME STATE A CLONE LOSES.
//
// This is the test that would have ended the whole 2026-07-19/20 saga on day one, and
// the invariant is general rather than a patch for one symptom: the ghost is a
// STAND-IN, so anything the live view carries that `cloneNode` does not copy makes it
// a liar, and the difference becomes visible at the swap with NO DOM mutation, NO
// position change and no way for any of the .199-.204 counters to see it.
//
// Two such things are known. `copyScroll` (carousel scrollLeft) was found the same way
// years earlier and its comment says exactly this. ANIMATION PHASE is the second: every
// cover runs `artShimmer 1.25s infinite` while unloaded or `artFadeIn .3s` once loaded,
// a clone restarts both from t=0, and on the reported device ~30 of 52 images are
// shimmering skeletons — so at the swap most of the screen jumps phase at once, which
// is what "all the bars flashed with all their contents" describes.
//
// jsdom has no getAnimations, so it is installed here deliberately: the point is to
// pin that app.js ASKS the live element for its phase and SEEDS the clone with it.
test('the ghost inherits the live view’s animation phase, not a restarted one (.205)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);

    // A realized row with a cover, exactly as browse.js builds one.
    const row = h.document.createElement('div');
    row.className = 'book';
    const cover = h.document.createElement('img');
    cover.className = 'cover';
    row.appendChild(cover);
    h.$('browse').appendChild(row);

    // The live cover is 800ms into its shimmer. A clone would restart at 0.
    // Each cover gets its own animation object, so an assignment to the CLONE's is
    // observable. The live one is mid-shimmer; a fresh clone starts at 0.
    const LIVE_PHASE = 800;
    const anims = new Map();
    h.window.Element.prototype.getAnimations = function () {
      if (!this.classList || !this.classList.contains('cover')) return [];
      if (!anims.has(this)) {
        const inGhost = !!(this.closest && this.closest('.nav-ghost'));
        anims.set(this, { currentTime: inGhost ? 0 : LIVE_PHASE });
      }
      return [anims.get(this)];
    };

    let ghostAnim = null;
    const inner = h.browse.render;
    h.browse.render = async (desc) => {
      const g = h.document.querySelector('.nav-ghost .cover');
      if (g && !ghostAnim) ghostAnim = anims.get(g) || null;
      return inner(desc);
    };

    await edgeSwipe(h, row);

    assert.ok(ghostAnim, 'fixture sanity: a ghost carrying a cover must exist during the drag');
    // .207: the clone's animation is SEEKED to the live element's time. .205 tried to
    // express this as a negative animation-delay and it did not take — on device the
    // covers stayed 1011ms (list) and 10111ms (home) out of phase while reporting
    // animSync=28/38. Assigning currentTime says exactly what is meant.
    assert.equal(ghostAnim.currentTime, LIVE_PHASE,
      `the ghost's cover must be seeked to the live phase, got ${ghostAnim.currentTime}`);
    // And the residual measured AT the sync must be zero, or the assignment silently
    // failed — the exact failure .205 shipped and could not tell apart from "no help".
    const line = flashLog(h).find((m) => /@reveal/.test(m));
    if (line) {
      assert.match(line, /animSync=[1-9]\d*\/res=0\b/,
        `sync must report covers seeded with a zero residual: ${line}`);
    }
  } finally { h.dispose(); }
});

// ⭐ .206 — the HOME snapshot needs the same phase sync, and the report must SAY so.
//
// The .205 device reading looked like a pass and was not: on `commit→home` the
// comparison printed `0/0` for every selector, because it probed `.book`/`.letterhead`
// while HOME is built from `.tile`, and `phase=0ms` came from elements that carry no
// animation at all (the animation is on the `.cover` INSIDE a row). Measuring the wrong
// elements is not a null result, and a bare 0 read as "in sync" when it meant "never
// measured". The user reports the WHOLE home screen flashing on every swipe back, and
// home is 36 of 45 images without src — i.e. almost entirely shimmering skeleton.
//
// So this pins the home path end-to-end: the snapshot builder seeds phase, and the
// report states how many covers were seeded. `animSync=0` would mean the fix never ran,
// which is otherwise indistinguishable from "ran and did not help".
test('the HOME snapshot phase-syncs its covers, and the report says how many (.206)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    h.tap('.navbtn[data-nav="books"]');       // navStack = [home, books] → back = home
    await settle(h);

    const tile = h.document.createElement('div');
    tile.className = 'tile';
    const cover = h.document.createElement('img');
    cover.className = 'cover';
    tile.appendChild(cover);
    h.$('home').appendChild(tile);

    h.window.Element.prototype.getAnimations = function () {
      return this.classList && this.classList.contains('cover') ? [{ currentTime: 640 }] : [];
    };

    const row = addRow(h);
    await edgeSwipe(h, row);
    await h.clock.advance(600);
    await settle(h);

    const line = flashLog(h).find((m) => /@reveal/.test(m));
    assert.ok(line, `no @reveal line — got ${JSON.stringify(flashLog(h))}`);
    const m = /animSync=(\d+|\?)/.exec(line);
    assert.ok(m, `the report must state how many covers were phase-seeded: ${line}`);
    assert.ok(m[1] !== '?' && Number(m[1]) >= 1,
      `home's covers must be phase-seeded — animSync=${m && m[1]} in: ${line}`);
  } finally { h.dispose(); }
});

// ⭐ .208 — the phase sync must pair covers that CORRESPOND, not covers at the same
// index in two differently-shaped trees.
//
// ghostApp removes `.hidden, .parked` from the clone, so the live `.app` still contains
// parked home and every hidden .browsepage while the clone contains only the visible
// page. Index-matching those two lists pairs a visible cover with whatever happened to
// sit at that index in the FULL tree. Device .207: animSync=6 on a list carrying ~36
// skeleton covers, phase=17126ms — while home, cloned with nothing pruned, reached 38
// and 48ms. The failure is silent: it still reports a sync count and a zero residual.
test('the phase sync pairs covers that correspond, not by raw index (.208)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);

    // A HIDDEN page ahead of the visible one — exactly what a browse LRU cache holds,
    // and exactly what the clone prunes away.
    const hidden = h.document.createElement('div');
    hidden.className = 'browsepage hidden';
    for (let i = 0; i < 3; i++) {
      const c = h.document.createElement('img');
      c.className = 'cover';
      c.setAttribute('data-which', 'hidden');
      hidden.appendChild(c);
    }
    h.$('browse').appendChild(hidden);

    const shown = h.document.createElement('div');
    shown.className = 'browsepage';
    const liveCover = h.document.createElement('img');
    liveCover.className = 'cover';
    liveCover.setAttribute('data-which', 'visible');
    shown.appendChild(liveCover);
    h.$('browse').appendChild(shown);

    const HIDDEN_PHASE = 111, VISIBLE_PHASE = 800;
    const anims = new Map();
    h.window.Element.prototype.getAnimations = function () {
      if (!this.classList || !this.classList.contains('cover')) return [];
      if (!anims.has(this)) {
        const inGhost = !!(this.closest && this.closest('.nav-ghost'));
        // ONLY the visible page's cover carries VISIBLE_PHASE. index.html already
        // contains four other `.cover` elements (player / now-playing) that sort BEFORE
        // these in document order, and an earlier version of this fixture handed them
        // VISIBLE_PHASE too — so a mispairing landed on a distractor that returned the
        // right answer by accident and the mutation survived. Every non-target cover
        // must be distinguishable, or the test cannot see the bug it exists for.
        anims.set(this, {
          currentTime: inGhost ? 0
            : (this.getAttribute('data-which') === 'visible' ? VISIBLE_PHASE : HIDDEN_PHASE),
        });
      }
      return [anims.get(this)];
    };

    let ghostAnim = null;
    const inner = h.browse.render;
    h.browse.render = async (desc) => {
      const g = h.document.querySelector('.nav-ghost .cover');
      if (g && !ghostAnim) ghostAnim = anims.get(g) || null;
      return inner(desc);
    };

    await edgeSwipe(h, addRow(h));

    assert.ok(ghostAnim, 'fixture sanity: the ghost must carry a cover');
    // The clone keeps only the VISIBLE page's cover, so it must be seeded from the
    // VISIBLE live cover. Getting HIDDEN_PHASE means it paired by raw index against the
    // unpruned tree — the shipped defect, which reports a healthy sync while doing this.
    assert.notEqual(ghostAnim.currentTime, HIDDEN_PHASE,
      'the ghost cover was paired with a HIDDEN page\'s cover — index matching across differently-shaped trees');
    assert.equal(ghostAnim.currentTime, VISIBLE_PHASE,
      `the ghost cover must inherit the visible page's phase, got ${ghostAnim.currentTime}`);
  } finally { h.dispose(); }
});

// ⭐ .213 — every settle must report a frame sample AND which pane kind it built.
//
// The flash is intermittent, and until now the only detector was a human noticing it
// inside ~100ms and remembering which of fifteen swipes it was. That is why so much of
// this investigation's data is ambiguous, and it is why an A/B of two single swipes
// (which I proposed) cannot work. A whole-view repaint costs frame time, so the frame
// sample is an objective proxy that runs on EVERY swipe with no labelling — and
// `pane=` beside it makes the correlation self-collecting.
//
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
    // browse→browse builds ghostApp(), so this path must NOT report `none` — a detector
    // that mislabels the pane kind would invert the very correlation it exists to test.
    assert.ok(!/pane=none/.test(frames[0]),
      `a browse→browse settle builds a ghost pane; got ${frames[0]}`);
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
