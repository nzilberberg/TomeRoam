// STAGE-5 COVERAGE RESIDUALS — the three bare cells Mendeleev routed to Curie
// (Claude/Mendeleev/AUDIT-swipe-stage5.md, W22 + N1). Each guards EXISTING shipped
// behavior on HEAD; a PASS = the behavior is confirmed and now guarded, a FAIL = a
// latent bug the audit's forward read predicted. Wiring-seam cells the recipe layer
// (swipe-construction.test.js) structurally cannot see — they drive the REAL start()
// through the app-harness.
//
// F5a     the mid-drag render forwards the FULL dest descriptor payload (not just .v)
//         into showAppView → Browse.render (app.js env.renderDestination). A drop-to-.v
//         mutation ships green at the recipe layer and surfaces on device as a
//         drilled-in page that renders empty after a swipe.
// F1a-L3  start()'s toMover emits the `own` key (not just el/base) — the typed ownership
//         that drives teardown by type. F1b pins the `base` VALUE; this pins the `own`
//         KEY, via the one path where it is uniquely load-bearing: a HELD reveal, where
//         resetSwipeStyles keeps the ghost (keepGhosts:true) and the own-gated fadePanes
//         is the sole disposer. A toMover dropping `own` strands the pane.
// npLock  an NP-SOURCE swipe unlocks document.body.np-locked (the c.decorations consumer's
//         effect, app.js start() decorations loop). jsdom-observable (unlike the Stage-6
//         device-only KEEPER). Dropping the decorations loop leaves np-locked stuck on.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }
const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const ghosts = (h) => h.document.querySelectorAll('.nav-ghost').length;
function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}
/** Authors over Books: a left-edge back-swipe is browse->browse, the same-browse-host
 *  abort-re-render case (finalizationPlanFor.abortRender === 'rerender'). */
async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]');
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
}
/** Play bookA and open Now Playing, so ctx is set and NP is the current screen. */
async function openNowPlaying(h) {
  await settle(h);
  const cover = h.document.querySelector('[data-book="bookA"] .covertap');
  assert.ok(cover, 'fixture sanity: a book tile is present to start playback from');
  cover.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(h);                          // book playing → ctx set
  h.tap('#player');                         // mini-player opens Now Playing (needs ctx)
  await settle(h);                          // navStack top is now 'nowplaying'
}

// ── F5a — payload descriptor reaches the L2 render intact ────────────────────────────
// start()'s env.renderDestination(dest, 'browse-host') passes the WHOLE `dest` to
// showAppView → Browse.render. The NP→files FORWARD swipe (right edge on NP) has
// dest = filesDescForCurrent() = { v:'files', book:{ratingKey:'bookA', …} } — a payload
// beyond `.v`. The fake Browse.render records [desc.v, desc.author||desc.book]. A mutation
// forwarding only { v: dest.v } drops the `.book` and the second arg goes null.
test('F5a — the mid-drag render forwards the FULL dest descriptor payload (not just .v) into showAppView', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await openNowPlaying(h);
    const rx = h.window.innerWidth - 2;     // right edge → forward (NP → chapter list)
    h.touch.start(rx, 300, h.$('nowplaying'));
    h.touch.move(rx - 120, 302);            // drag left from the right edge → forward, live
    assert.equal(starts(h).length, 1, 'fixture sanity: the NP→files forward swipe went live');

    const fr = h.log.calls.filter((c) => c.name === 'browse.render' && c.args[0] === 'files');
    assert.ok(fr.length > 0, 'fixture sanity: the forward swipe rendered a files page into the browse host');
    const payload = fr.at(-1).args[1];
    assert.ok(payload && payload.ratingKey === 'bookA',
      'showAppView must receive the FULL dest descriptor (its .book payload), not just .v — '
      + `got ${JSON.stringify(payload)}`);
  } finally { h.dispose(); }
});

// ── F1a-L3 — RETIRED WITH THE OWNED PANE (PLAN-swipe-declone.md Stage 2, §12 item 27) ─
// This proved that start()'s toMover stamps the `own` key by driving the one path that
// could observe it: an aborted browse->browse built an owned-pane app-ghost, applyScreen
// ran with keepGhosts:true so the global sweep skipped it, and the own-gated fadePanes was
// its SOLE disposer — a toMover emitting just {el, base} would have stranded it. Every
// element of that fixture is gone: no pane is built, and fadePanes was deleted with it
// (§12 item 12).
//
// The `own` key itself is NOT retired and is still load-bearing — it is what keeps teardown
// from touching a borrowed-real view. Its remaining owned kind is the NP pill decoration,
// and the DEC cell in test/swipe-stage6e.test.js is what observes that disposal; the
// borrowed-real half (a real view is never removed by teardown) is pinned by the BR cell in
// the same file.
// ── npLock — the outgoing-NP np-locked unlock (c.decorations consumer effect) ─────────
// When NP is the SOURCE of a swipe, start()'s decorations loop removes document.body's
// `np-locked` class so the real nav buttons show as the pill slides out (app.js:491-492).
// nav.js:77 sets np-locked when NP opens. Dropping start()'s decorations loop leaves
// np-locked stuck on through the whole gesture (the dead-field gate catches the LOOP's
// removal, but no test asserted this VISIBLE effect — Mendeleev N1).
test('npLock — an NP-source back-swipe unlocks document.body.np-locked (the decorations consumer effect)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await openNowPlaying(h);
    assert.ok(h.document.body.classList.contains('np-locked'),
      'fixture sanity: opening Now Playing sets body.np-locked (nav.js:77)');

    h.touch.start(10, 300, h.$('nowplaying'));   // left edge on NP → back-swipe (NP is the source)
    h.touch.move(80, 302);                       // past the lock, horizontal → start()
    assert.equal(starts(h).length, 1, 'fixture sanity: the NP-source back-swipe went live');

    assert.ok(!h.document.body.classList.contains('np-locked'),
      'start()\'s decorations loop must remove np-locked when NP is the SOURCE (the outgoing pill slides out)');

    h.touch.end(80, 302);
    await settle(h); await h.clock.advance(400); await settle(h);
  } finally { h.dispose(); }
});
