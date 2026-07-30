// SWIPE-COMMIT-HOME-SCROLL -- a committed swipe back to Home preserves #home's own scroll.
//
// DEVICE REPORT: "Swiping back to home (while it was scrolled down) shows home correctly
// scrolled where you lift it during the swipe but it pops back to top when the swipe
// completes."
//
// THE CAUSE: the commit-path reconcile call (app.js, `settle()`'s `runFinalize`) --
// `if (commit) applyScreen(dest, { render: false });` -- passes no `resetScroll`, so
// nav.js's `applyScreen` falls to its default (`resetScroll: true`, nav.js:128) and zeros
// `#home.scrollTop` (nav.js:140) even though the destination was already rendered live,
// at the correct scroll, during the drag. A fresh navbar Home tap (app.js `navTo` ->
// `applyScreen(desc)`, also no opts) is UNAFFECTED by this fix -- it is a different call
// site and must keep resetting to top; see app.js:418-423's parity note.
//
// RED AT HEAD (confirmed before this fix): a committed Authors -> Home back-swipe resets
// #home.scrollTop to 0.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

// REAL wall-clock, captured before boot() patches global.setTimeout -- app.js's move()
// only resamples velocity after >8ms of real time, so back-to-back synthetic moves leave
// vx holding the outward flick and a gesture meant to abort commits instead (same reason
// every other swipe suite in this project keeps its own realSleep).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

async function toAuthors(h) {
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
}

// A left-edge rightward drag driven past commit threshold, exactly the geometry the
// existing Stage 6i SNAPSHOTGONE/SCOPE cells (test/swipe-stage6i.test.js) use to commit a
// browse -> home back-swipe.
async function commitBackToHome(h, row) {
  h.touch.start(10, 300, row);
  h.touch.move(80, 302);
  await realSleep(12); h.touch.move(600, 304);
  await realSleep(12); h.touch.end(600, 304);
  await settle(h); await h.clock.advance(700); await settle(h);
  for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();
  await settle(h);
}

test('a committed Authors -> Home back-swipe preserves #home\'s own scroll position', async () => {
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    h.$('home').scrollTop = 500;   // #home scrolled down before navigating away
    await toAuthors(h);            // parks #home (scroll-neutral park -- scrollTop survives)
    assert.equal(h.$('home').scrollTop, 500,
      'fixture: parking #home must not itself move its scroll (already-shipped park fix)');

    const row = addRow(h);
    await commitBackToHome(h, row);

    assert.ok(/commit/.test(settles(h)[0] || ''),
      `fixture: the back-swipe must have COMMITTED -- got ${JSON.stringify(settles(h))}`);
    assert.equal(h.$('home').scrollTop, 500,
      'a committed swipe back to Home must leave #home at the scroll it showed during the '
      + 'drag, not reset it to 0 (the commit-path reconcile must not resetScroll #home)');
  } finally { h.dispose(); }
});

// BOUNDARY -- a fresh navbar Home tap (not a swipe) still resets #home to the top. Only the
// swipe-commit reconcile call changes; a plain forward navigation to Home is untouched.
test('a plain navbar tap to Home (not a swipe) still resets #home\'s scroll to top', async () => {
  const h = boot({ fakeTimers: true });
  try {
    h.$('home').scrollTop = 500;
    await toAuthors(h);
    assert.equal(h.$('home').scrollTop, 500, 'fixture: parking must not move the scroll');

    h.tap('.navbtn[data-nav="home"]');   // fresh forward nav, NOT a swipe gesture
    await settle(h);

    assert.equal(h.$('home').scrollTop, 0,
      'a fresh navbar Home tap must still reset #home to the top (parity boundary, '
      + 'app.js:418-423) -- this fix must not touch the navTo/goHome call path');
  } finally { h.dispose(); }
});
