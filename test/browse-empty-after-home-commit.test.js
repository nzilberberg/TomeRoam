// EMPTYAFTERHOME — the device-confirmed defect where the Books page arrives with its header,
// section letters, row containers and A–Z strip present and ZERO rows, and does not self-heal.
// Authored red-first by the test author (2026-08-01) BEFORE the fix, from the derivation in
// Claude/Linnaeus/empty-books-page-fact-sheet-2026-08-01.md §10 (which SUPERSEDES that sheet's
// earlier sections — two hypotheses were retracted there). Companion note:
// Claude/Curie/RED-browse-empty-after-home-commit.md. Working reproduction of the same
// mechanism against the modules in isolation: Claude/Linnaeus/repro-empty-books-page.js.
//
// THE SHIPPED DEFECT THESE CELLS REPRODUCE, in the order the code runs it.
//   1. Navigating Books→Home tears the list down correctly: Nav.setView calls browseWillHide()
//      → Browse.deactivate() → dematerialize() BEFORE `display:none` lands (js/nav.js:55-61,
//      js/browse.js:371). Nothing is wrong at this step — a hidden page is SUPPOSED to hold
//      zero rows. On device: `#14 commit→home … realized 15→0 released=15`.
//   2. The row hold is then released AFTER the container is already hidden. runFinalize calls
//      applyScreen(home) at js/app.js:1120; dropRowHold() runs in finalize's `finally` at
//      js/app.js:1163-1164 — strictly later. By then currentDesc() is 'home',
//      pageCache.has('home') is false, so Browse.endHold takes its ELSE branch and its last act
//      is `activate(); _realize()` on a browse page inside a display:none box
//      (js/browse.js:211-212).
//   3. A zero-measuring box realizes ZERO rows by arithmetic: overscan() is
//      Math.round(viewportH() * 1.5) (js/virtuallist.js:177), so a viewport of 0 gives an
//      overscan of 0, and windowFor then has from === to (js/virtuallist.js:79-94).
//   4. And the controller is left ACTIVE, registered as activeCtl, holding zero rows —
//      activate() sets state before realizing (js/virtuallist.js:238-240). That is the poison:
//      every later refill path is now closed. activate() early-returns at
//      js/virtuallist.js:236 because the state is already active, and positionOnEnter writes
//      nothing because captureAnchor() returned null in the zero-measuring box, so
//      applyScrollY — the only other _realize() caller on the re-entry path — is never reached
//      (js/browse.js:310-313). On device: `#15 commit→books … rows=0 imgs=0 withSrc=0`.
//
// ⭐ THE CODE STATES THIS EXACT ORDERING RULE IN ITS OWN WORDS AND THEN VIOLATES IT.
// js/browse.js:174-177 and js/nav.js:56-58 both record that controllers must settle while their
// boxes still measure, because "a hidden box measures zero". endHold's else branch does the
// opposite, after the hide.
//
// THE INVARIANT THE FIX MUST SATISFY, stated so it does NOT presume where the fix lands:
//   (a) a commit that leaves Browse must not leave a browse controller ACTIVE with zero rows;
//   (b) the next entry into that page must show it with rows.
// Both a guard in endHold (do not activate/realize into a hidden container) and a reordering of
// the hold release relative to the hide satisfy (a) and (b), and both cells green under either.
// That is deliberate: the cells constrain the OUTCOME, not the repair.
//
// ⛔ SCOPE, honestly. jsdom has no layout, no paint and no compositing. Every assertion below is
// a controller-state read, a realized-row count, a DOM node count or a class-state fact. NOT ONE
// asserts that anything is visible, painted, or laid out. The ONE quantity jsdom cannot supply
// is the viewport height, so it is injected — but it is injected as a FUNCTION OF THE REAL
// `#browse` HIDDEN CLASS that the real js/nav.js sets, not hand-set by the test at a chosen
// moment. That is the source's own stated rule ("a hidden box measures zero"), so the ordering
// under test is genuinely the app's: the test never decides when the box stops measuring.
//
// DEVICE-OWED, claimed by nothing here: that the rows are visibly PAINTED when the swipe reveals
// the page, and that the user-visible Books page is no longer blank after rapid back-and-forth
// swiping. CI proves the mechanism; the outcome is the device's.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// Both cells were authored red-first, carrying `{ skip: SKIP }` until the builder removed it to
// drive them red and build to green (Claude/Curie/RED-browse-empty-after-home-commit.md). The fix
// (js/app.js) reorders the row-hold release ahead of the applyScreen call that can hide #browse,
// so the hold-release fallback never runs against an already-hidden container.

// REAL wall clock, captured before boot() patches setTimeout — app.js's move() resamples
// velocity only after >8ms of REAL time, so back-to-back synthetic moves leave vx holding the
// wrong sign. (Same reason every other swipe suite keeps its own.)
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const pageEl = (h, key) => {
  const e = h.Browse._test.pageCache.get(key);
  return e ? e.el : null;
};

// 145 books — the device library size from the log line `CACHE getBooks live: 145 books`.
// 145 <= VirtualList.FULL_RENDER_MAX (600), so the virtual path is reached only through the
// Diagnostics "Windowed browse" override — which the device HAD on: the log's `realized 15→0`
// field is producible only by a live virtual controller (a classic page prints `realized -1`).
const bigBooks = (n) => Array.from({ length: n }, (_, i) => ({
  ratingKey: 'b' + i, title: 'Book ' + i, titleSort: String(i).padStart(6, '0'),
  parentTitle: 'Author ' + (i % 7), thumb: '/t/' + i, leafCount: 10, viewedLeafCount: 0,
}));

/**
 * The one injected quantity, and the reason it is not a cheat.
 *
 * jsdom has no layout, so every element measures 0 forever — with production metrics the row
 * count would be 0 in every state and the cells could not fail. The height is therefore
 * injected, but it is DERIVED FROM THE REAL DOM: `#browse` carrying `hidden` is exactly the
 * `display:none` condition the source names when it says a hidden box measures zero
 * (js/browse.js:174-177, js/nav.js:56-58). The real js/nav.js setView is the only thing that
 * toggles that class, so the app — not the test — decides when the box stops measuring.
 *
 * scrollY is a constant 0, which is the device's state too (the gesture was taken at the top of
 * the list) and is what makes captureAnchor() return null at the deactivate (top > 0 is false,
 * js/virtuallist.js:247-249).
 */
function injectViewport(h) {
  const host = h.$('browse');
  h.Browse._test.setVlOpts({
    strides: { header: 30, row: 80 },
    metrics: {
      scrollY: () => 0,
      listTop: () => 0,
      viewportH: () => (host.classList.contains('hidden') ? 0 : 600),
    },
    scrollTo: () => {},
  });
}

/** Drive a gesture past the 8px lock so start() has run and move() has written transforms. */
async function goLive(h, target) {
  h.touch.start(10, 300, target);
  await realSleep(12);
  h.touch.move(120, 302);
  await realSleep(12);
}
/** Finish a live left-edge back-swipe as a COMMIT (drag the incoming fully in). */
async function commitBack(h) {
  h.touch.move(400, 304); await realSleep(12);
  h.touch.move(760, 306); await realSleep(12);
  h.touch.move(950, 308); await realSleep(12);
  h.touch.end(980, 308);
  await settle(h); await h.clock.advance(700); await settle(h);
}

/**
 * Boot, force the virtual path, inject the viewport, and land on a Books page whose controller
 * is active with real realized rows. Returns the harness and the page.
 */
async function booksShowing(h) {
  h.VirtualList.setForceVirtual(true);
  injectViewport(h);
  await settle(h);
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  const page = pageEl(h, 'books');
  assert.ok(page && page._vctl, 'fixture sanity: the Books page exists and is VIRTUALIZED — '
    + 'without a controller there is no state machine to poison and both cells would be vacuous');
  assert.equal(page._vctl.state(), 'active', 'fixture sanity: the shown page\'s controller is active');
  assert.ok(page._vctl.realizedCount() > 0,
    `fixture sanity: rows are realized to begin with (got ${page._vctl.realizedCount()})`);
  assert.equal(h.$('browse').classList.contains('hidden'), false,
    'fixture sanity: #browse is shown, so the injected viewport measures');
  return page;
}

/** Run the device's gesture #14: a left-edge back-swipe off Books, COMMITTED to Home. */
async function commitToHome(h, page) {
  const row = page.querySelector('.book');
  assert.ok(row, 'fixture sanity: a REAL realized row to put the finger on (not a synthetic node)');
  await goLive(h, row);
  const started = swipeLog(h).filter((m) => /^start /.test(m)).at(-1) || '';
  assert.ok(/^start back books→home/.test(started),
    `fixture sanity: the live gesture must be the back swipe books→home — got "${started}"`);
  await commitBack(h);
  assert.ok(swipeLog(h).some((m) => /^#\d+ commit /.test(m)),
    'fixture sanity: the gesture COMMITTED (an abort exercises a different endHold branch)');
  assert.equal(h.$('browse').classList.contains('hidden'), true,
    'fixture sanity: the commit landed on Home, so #browse is display:none and measures zero');
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// EMPTYAFTERHOME-1 — the mechanism. RED @HEAD.
// ════════════════════════════════════════════════════════════════════════════════════════════
// The controller state AFTER the commit is the whole defect: `active` + zero rows is the state
// that closes activate()'s refill (js/virtuallist.js:236) for every later entry. Either half
// alone is harmless — inactive-with-zero-rows is the CORRECT resting state of a hidden page, and
// active-with-rows is the correct state of a shown one. The cell therefore asserts the
// CONJUNCTION is absent, which is what keeps it agnostic about where the fix lands.
test('EMPTYAFTERHOME — a commit that leaves Browse must not leave the Books controller ACTIVE '
  + 'with zero realized rows', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true, books: bigBooks(145) });
  try {
    const page = await booksShowing(h);
    await commitToHome(h, page);

    const state = page._vctl.state();
    const rows = page._vctl.realizedCount();
    assert.equal(state === 'active' && rows === 0, false,
      'THE DEFECT (fact sheet §10.2, F42-F46): the row hold is released AFTER #browse is hidden, '
      + 'so Browse.endHold took its else branch and ran `activate(); _realize()` on the Books page '
      + 'inside a display:none box (js/browse.js:211-212). The zero-measuring box realized zero '
      + 'rows (js/virtuallist.js:177, :79-94) and activate() had already set state=\'active\' and '
      + 'activeCtl=api before realizing (js/virtuallist.js:238-240). The controller is now ACTIVE, '
      + 'REGISTERED and EMPTY, which is the state that closes every later refill. A hidden page '
      + 'holding zero rows is correct; a hidden page holding zero rows while ACTIVE is not. '
      + `Got state='${state}' realizedCount=${rows}.`);
  } finally {
    if (h.VirtualList) h.VirtualList.setForceVirtual(false);
    h.dispose();
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// EMPTYAFTERHOME-2 — the symptom, and that it does not self-heal. RED @HEAD.
// ════════════════════════════════════════════════════════════════════════════════════════════
// The re-entry here is a NAVBAR TAP rather than the device's 42 ms return swipe, and that is the
// stronger witness, not a weaker one. A tap runs no gesture, so it takes no row hold and reaches
// no endHold at all — there is no landed-branch `_realize()` (js/browse.js:189-190) that could
// refill the page a moment after the user saw it blank. What the cell measures is therefore the
// RESTING state of the page the user is looking at: revealed, and permanently empty.
//
// The path, all of it production: applyScreen → Nav.setView('browse') un-hides the container
// (js/nav.js:151, so the box measures again) → renderBrowse → Browse.render cache HIT →
// showPage('books') → activate() EARLY-RETURNS at js/virtuallist.js:236 because cell 1 left the
// state 'active' → positionOnEnter writes nothing because the anchor is null, so applyScrollY
// never runs and _realize() is never reached (js/browse.js:310-313). Zero rows, forever.
test('EMPTYAFTERHOME — returning to Books after a commit to Home shows a page WITH ROWS, and it '
  + 'stays that way with no gesture to repair it', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true, books: bigBooks(145) });
  try {
    const page = await booksShowing(h);
    const chromeBefore = {
      letterheads: page.querySelectorAll('.letterhead').length,
      alphaindex: page.querySelectorAll('.alphaindex').length,
    };
    assert.ok(chromeBefore.letterheads > 0 && chromeBefore.alphaindex === 1,
      'fixture sanity: the page has the chrome the screenshot shows surviving');

    await commitToHome(h, page);

    h.tap('.navbtn[data-nav="books"]'); await settle(h);

    assert.equal(pageEl(h, 'books'), page,
      'fixture sanity: the SAME cached page node came back — nothing rebuilt it, so this is the '
      + 'cache-hit path the device took, not a fresh build');
    assert.equal(h.$('browse').classList.contains('hidden'), false,
      'fixture sanity: #browse is shown again, so the box measures and rows COULD be realized');
    assert.equal(page.classList.contains('hidden'), false, 'fixture sanity: the page itself is shown');
    assert.deepEqual({
      letterheads: page.querySelectorAll('.letterhead').length,
      alphaindex: page.querySelectorAll('.alphaindex').length,
    }, chromeBefore,
    'fixture sanity: the chrome is intact — this is the "structure present, rows absent" shape, '
      + 'not an emptied container (fact sheet §10.4 resolves the fork to E2)');

    const rowNodes = page.querySelectorAll('.book').length;
    assert.ok(rowNodes > 0,
      'THE DEFECT (fact sheet §10.3, F47): the Books page is revealed with its header, section '
      + 'letters, row containers and A–Z strip and ZERO rows, and nothing repairs it. The '
      + 'preceding commit to Home left the controller active-with-zero-rows, so showPage\'s '
      + 'activate() early-returned (js/virtuallist.js:236) and positionOnEnter derived no '
      + 'position to write, so _realize() was never reached (js/browse.js:310-313). On device: '
      + `\`#15 commit→books … rows=0 imgs=0 withSrc=0\`. Got ${rowNodes} row nodes.`);
    assert.ok(page._vctl.realizedCount() > 0,
      `and the controller must agree the rows are its own (realizedCount=${page._vctl.realizedCount()})`);
  } finally {
    if (h.VirtualList) h.VirtualList.setForceVirtual(false);
    h.dispose();
  }
});
