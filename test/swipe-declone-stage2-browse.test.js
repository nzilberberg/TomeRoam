// STAGE 2 of PLAN-swipe-declone.md — the INTEGRATION half of the Coverage Model in the plan's
// §14, authored red-first by the test author (2026-08-01) from the FORGED plan
// (Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r4.md), BEFORE the Stage-2 build. Plan §13
// step 9; the build is step 10. Companion note: Claude/Curie/RED-swipe-declone-stage2.md.
//
// CELLS IN THIS FILE (plan §14).
//   MOVERSDISTINCT (NATURAL-c half)  RED@HEAD  the app-side env literal's browse-page branch
//        returns a PAGE, not the host. No fake-env fixture can execute that branch — every
//        construction-seam fixture in this suite hand-writes its env — so a mutant registered
//        only against the recipe layer would survive the sweep (plan §14).
//   PAGEOWNSSCROLL   RED@HEAD  the container role stays on the host while the scroller role
//        belongs to each page, and each virtual controller MEASURES the page it was built for.
//   ENTRYNOZERO      RED@HEAD  re-entering a cached browse page performs NO scroll write at all
//        unless a position is DERIVED.
//   LANDEDPAGESHOWS  RED@HEAD  the page left showing when a gesture ends is decided from the
//        LANDED screen, not inferred from which page happens to be visible — and a gesture that
//        lands on no browse page leaves browse state exactly as HEAD leaves it.
//   ABORTNORENDER    RED@HEAD  an aborted swipe never re-renders its source screen.
//
// ⭐ VIRTUALIZATION IS FORCED WHERE A CONTROLLER IS THE WITNESS, and that is load-bearing rather
// than incidental. LANDEDPAGESHOWS's NATURAL-c can only be seen through a CONTROLLER ACTIVATION
// CALL COUNT, and a call count is the assertion shape that goes vacuously green when the counted
// thing was never constructible: with the harness's default two-book library the list renders
// CLASSIC, no `_vctl` exists, and the count is 0 both at HEAD and under the mutant. Forcing the
// virtual path is what makes HEAD's count >= 1 and the mutant's 0 distinguishable. The same
// applies to PAGEOWNSSCROLL's measured-element half.
//
// ⛔ SCOPE, honestly. jsdom has no layout, no paint, no compositing, no scroll anchoring and no
// transitionend. Every assertion below is a class-state fact, a DOM-identity fact, a call count,
// or which ELEMENT a read/write landed on. NOT ONE asserts a resolved geometry, that a page
// travels edge-to-edge, that covers stay warm, or that a scroll offset SURVIVES anything — a
// retention claim in jsdom passes on any engine behaviour and would be a false witness (plan §14
// records that exact correction). Retention is plan §15 R8, device-owed; the filmstrip is R7.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// REAL wall clock, captured before boot() patches setTimeout — app.js's move() resamples velocity
// only after >8ms of REAL time, so back-to-back synthetic moves leave vx holding the wrong sign.
// (Same reason every other swipe suite keeps its own.)
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));


const bigBooks = (n) => Array.from({ length: n }, (_, i) => ({
  ratingKey: 'b' + i, title: 'Book ' + i, titleSort: String(i).padStart(6, '0'),
  parentTitle: 'A', thumb: '/t/' + i, leafCount: 10, viewedLeafCount: 0,
}));

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}
/** Authors UNDER Books, so a left-edge back-swipe from Books is the browse->browse pair. */
async function authorsUnderBooks(h) {
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]'); await settle(h);
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
}
const pageEl = (h, key) => {
  const e = h.Browse._test.pageCache.get(key);
  return e ? e.el : null;
};
/** Drive a gesture past the 8px lock so start() has run and move() has written transforms. */
async function goLive(h, target) {
  const row = target || addRow(h);
  h.touch.start(10, 300, row);
  await realSleep(12);
  h.touch.move(120, 302);
  await realSleep(12);
  return row;
}
/** Finish a live left-edge back-swipe as a COMMIT (drag the incoming fully in). */
async function commitBack(h) {
  h.touch.move(400, 304); await realSleep(12);
  h.touch.move(760, 306); await realSleep(12);
  h.touch.move(950, 308); await realSleep(12);
  h.touch.end(980, 308);
  await settle(h); await h.clock.advance(700); await settle(h);
}
/** Finish a live left-edge back-swipe as an ABORT (retreat to the edge). */
async function abortBack(h) {
  h.touch.move(60, 304); await realSleep(12);
  h.touch.move(14, 306); await realSleep(12);
  h.touch.end(10, 306);
  await settle(h); await h.clock.advance(700); await settle(h);
}
/** Count reads and writes of ONE element's scrollTop, shadowing jsdom's prototype accessor. */
function watchScrollTop(el) {
  const rec = { reads: 0, writes: 0, wrote: [] };
  let v = el.scrollTop || 0;
  Object.defineProperty(el, 'scrollTop', {
    get() { rec.reads++; return v; },
    set(x) { rec.writes++; rec.wrote.push(x); v = x; },
    configurable: true,
  });
  rec.stop = () => { delete el.scrollTop; };
  return rec;
}
/** Count activate() calls on a page's controller without changing what activate() does. */
function watchActivate(page) {
  const ctl = page._vctl;
  const rec = { n: 0 };
  const orig = ctl.activate;
  ctl.activate = function countedActivate(...a) { rec.n++; return orig.apply(ctl, a); };
  return rec;
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// MOVERSDISTINCT — the app-harness half (NATURAL-c). RED @HEAD. Plan §14, §5.3.6.
// ════════════════════════════════════════════════════════════════════════════════════════════
// The recipe layer's fixtures hand-write their env, so the branch that actually resolves a
// `browse-page` host in PRODUCTION — the `env` literal built inside app.js start() — is executed
// by nothing there. A mutant that makes that branch return the HOST element instead of the page
// would survive a sweep aimed only at the recipe layer. This half runs the REAL start(), for the
// same reason test/swipe-stage5-wiring.test.js does.
//
// THE OBSERVABLE. start() parks the incoming mover with an inline transform (js/app.js:594) and
// move() writes one for every mover in list order (js/app.js:615), so after the gesture goes live
// the mover set is exactly the set of elements carrying an inline `style.transform`.
test('MOVERSDISTINCT — the real env literal resolves a browse->browse gesture to two .browsepage '
  + 'movers, and #browse carries no drag transform at all', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await authorsUnderBooks(h);
    const host = h.$('browse');
    assert.equal(host.style.transform, '', 'fixture sanity: #browse carries no stale transform before the drag');

    await goLive(h, addRow(h));
    assert.ok(/^start back books→authors/.test(swipeLog(h).filter((m) => /^start /.test(m)).at(-1) || ''),
      `fixture sanity: the live gesture must be the back browse->browse — got ${swipeLog(h).at(-1)}`);

    const moved = [...h.document.querySelectorAll('.browsepage')].filter((p) => p.style.transform !== '');
    const bad = [];
    if (host.style.transform !== '') {
      bad.push(`#browse carries an inline transform (${host.style.transform}) — it is being dragged as a mover`);
    }
    if (moved.length !== 2) bad.push(`${moved.length} .browsepage nodes carry a drag transform, want exactly 2`);
    if (moved.length === 2 && moved[0] === moved[1]) bad.push('the two moving pages are the same node');

    assert.deepEqual(bad, [], 'RED @HEAD: the app-side env literal has no `browse-page` branch — '
      + '`sourceEl` falls to appViewEl and `renderDestination`\'s browse-host branch returns '
      + '$(\'browse\') literally (js/app.js:541, :544), so the HOST is dragged and no page moves at '
      + `all:\n  ${bad.join('\n  ')}`);

    await abortBack(h);
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// PAGEOWNSSCROLL — RED @HEAD. Plan §14, §4 SPLIT, round-1 F3.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM, in two halves. (a) `o.mount` KEEPS the container role — the wipe target and the
// append target stay the HOST, so a page swap never wipes a page instead of the container and a
// new page is never appended inside another page. (b) Each virtual controller MEASURES the page
// it was built for, so no two controllers share a measured element.
//
// (a) is green at HEAD and must stay green: it is the half that reddens on NATURAL-a, a build
// that "splits the role" by re-pointing the single reference instead of handing the scroller role
// to the element each call site already holds.
test('PAGEOWNSSCROLL — the container role stays bound to the #browse host: reset wipes the HOST, '
  + 'and each page is appended to the host rather than inside another page', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await authorsUnderBooks(h);
    const host = h.$('browse');
    const books = pageEl(h, 'books');
    const authors = pageEl(h, 'authors');
    assert.ok(books && authors, 'fixture sanity: two browse pages are cached');
    assert.notEqual(books, authors, 'fixture sanity: they are two distinct nodes');

    assert.equal(books.parentNode, host, 'a page is appended to the HOST');
    assert.equal(authors.parentNode, host, 'the second page too — never inside the first');
    assert.ok(books.childNodes.length > 0, 'fixture sanity: the page has content to lose');

    h.Browse.reset();
    assert.equal(host.children.length, 0, 'reset() must empty the HOST (js/browse.js:80)');
    assert.ok(books.childNodes.length > 0,
      'and must NOT wipe a page: re-pointing the container reference at the active page makes '
      + 'reset() blank a page while leaving the page nodes attached to the host');
  } finally { h.dispose(); }
});

test('PAGEOWNSSCROLL — a virtual controller reads the scroll offset of the PAGE it was built for, '
  + 'never a shared host reference', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true, books: bigBooks(700) });
  try {
    // NO injected metrics here, deliberately: the injected-metrics recipe every other virtual
    // test uses REPLACES the production closure, which is the exact code under test.
    h.VirtualList.setForceVirtual(true);
    await authorsUnderBooks(h);
    const host = h.$('browse');
    const books = pageEl(h, 'books');
    assert.ok(books && books._vctl, 'fixture sanity: the Books page is virtualized and has a controller');
    assert.equal(books._vctl.state(), 'active', 'fixture sanity: the shown page\'s controller is active');

    const hostWatch = watchScrollTop(host);
    const pageWatch = watchScrollTop(books);
    try {
      books._vctl._realize();
      assert.ok(pageWatch.reads > 0, 'RED @HEAD: virtualView injects `scrollY: () => o.mount.scrollTop` '
        + 'and `listTop: () => o.mount.scrollTop + …` (js/browse.js:653-657), so EVERY controller '
        + 'measures the one shared host. Each controller must measure its own page — otherwise the '
        + 'outgoing page\'s controller captures its anchor against the incoming page\'s box '
        + `(round-1 F3). Reads of the page's own scrollTop: ${pageWatch.reads}`);
      assert.equal(hostWatch.reads, 0,
        `the host must not be measured at all once the page is the scroller — host reads: ${hostWatch.reads}`);
    } finally { hostWatch.stop(); pageWatch.stop(); }
  } finally {
    if (h.VirtualList) h.VirtualList.setForceVirtual(false);
    h.dispose();
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// ENTRYNOZERO — RED @HEAD. Plan §14, §5.3.4, round-1 F7.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. Re-entering a cached browse page performs NO scroll write at all unless a position is
// DERIVED (a files page's playing track, or a virtual page's anchor). With `sy` deleted, a rule
// that still writes `savedY || 0` writes ZERO over the offset the page element already holds —
// which is the exact inversion round-1 F7 identified.
//
// ⭐ THE SUBJECT IS THE ABSENCE OF A WRITE, NOT RETENTION. The earlier version of this cell said
// "leave to home and return and assert the offset is unchanged". In jsdom `scrollTop` is a plain
// settable property with no box to destroy, so that clause passed on any engine behaviour and
// witnessed nothing (plan §14 records the correction). Retention is plan §15 R8, device-owed.
test('ENTRYNOZERO — re-entering a cached list page performs ZERO scroll writes on the page or the '
  + 'host', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await settle(h);
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    const host = h.$('browse');
    const books = pageEl(h, 'books');
    assert.ok(books, 'fixture sanity: the Books page is cached');
    assert.ok(!books._vctl, 'fixture sanity: a small list renders CLASSIC, so there is no anchor to '
      + 'derive a position from — any write here would be an UNDERIVED one');

    h.tap('.navbtn[data-nav="home"]'); await settle(h);

    const hostWatch = watchScrollTop(host);
    const pageWatch = watchScrollTop(books);
    try {
      h.tap('.navbtn[data-nav="books"]'); await settle(h);
      const writes = [...hostWatch.wrote.map((v) => `host <- ${v}`), ...pageWatch.wrote.map((v) => `page <- ${v}`)];
      assert.deepEqual(writes, [], 'RED @HEAD: entryScrollY returns `savedY || 0` for every non-files '
        + 'view (js/browse.js:222-225) and positionOnEnter writes it, so a re-entry writes 0 over '
        + 'the offset the page element already holds. With `sy` deleted the rule must be "write ONLY '
        + `a derived position, otherwise write nothing":\n  ${writes.join('\n  ')}`);
    } finally { hostWatch.stop(); pageWatch.stop(); }
  } finally { h.dispose(); }
});

// ANTI-VACUITY for the cell above. "Zero writes" is satisfied perfectly by a build that deletes
// positionOnEnter outright, which would strand every files page at the top and every virtual page
// at a stale anchor. This half proves the DERIVED position is still written — the virtual page's
// logical anchor, which re-resolves against the CURRENT model and is explicitly NOT swept up with
// the `sy` deletion (plan §4 STAYS, §5.3.4).
test('ENTRYNOZERO — a DERIVED position is still written: a virtual page returns to its captured '
  + 'anchor', async () => {
  const view = { scrollY: 0, viewportH: 600 };
  const h = boot({ fakeTimers: true, realBrowse: true, books: bigBooks(700) });
  try {
    h.VirtualList.setForceVirtual(true);
    // Injected metrics: jsdom has no layout, so the anchor capture has no geometry to read and
    // could never be non-null. This is the browse-virtual.test.js recipe.
    h.Browse._test.setVlOpts({
      strides: { header: 30, row: 80 }, overscan: 200,
      metrics: { scrollY: () => view.scrollY, viewportH: () => view.viewportH, listTop: () => 0 },
      scrollTo: (y) => { view.scrollY = y; },
      isVisible: () => true,
    });
    await settle(h);
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    const books = pageEl(h, 'books');
    assert.ok(books && books._vctl, 'fixture sanity: the Books page is virtualized');

    view.scrollY = 9000;                       // scrolled deep into the list
    books._vctl._realize();
    h.tap('.navbtn[data-nav="home"]'); await settle(h);   // deactivate captures the anchor
    assert.ok(books._vctl.anchor(), 'fixture sanity: leaving browse captured a logical anchor');
    assert.ok(books._vctl.anchorEntryY() != null,
      'fixture sanity: the captured anchor resolves to an entry Y — otherwise "a derived position '
      + 'is written" has nothing to derive and this guard would be vacuous');

    const host = h.$('browse');
    const hostWatch = watchScrollTop(host);
    const pageWatch = watchScrollTop(books);
    try {
      h.tap('.navbtn[data-nav="books"]'); await settle(h);
      assert.ok(hostWatch.writes + pageWatch.writes > 0,
        'a virtual page whose anchor resolves MUST have its derived position written — a build that '
        + 'satisfies "zero writes" by deleting positionOnEnter strands every virtual re-entry');
    } finally { hostWatch.stop(); pageWatch.stop(); }
  } finally {
    if (h.VirtualList) h.VirtualList.setForceVirtual(false);
    h.dispose();
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// LANDEDPAGESHOWS — RED @HEAD. Plan §14, Invariant D6 (landing), §5.3.6, round-2 SF2.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM, in two halves. (1) Which browse page is left showing when a gesture ends is DECIDED
// from the screen the gesture landed on — not inferred from which page happens to be non-offscreen.
// (2) A gesture that lands on NO browse page leaves browse page state and controller activation
// EXACTLY as HEAD leaves them.
//
// WHY THE CONTRACT HALF IS THE RED ONE. At HEAD the inference is CORRECT — but only because an
// aborted browse->browse re-renders its source, and that re-render is what Stage 2 deletes
// (js/app.js:1229-1230 → Browse.render → showPage(sourceKey)). Take it away and nothing calls
// showPage at all: the source page stays `.parked`, the destination stays shown, and `endHold`'s
// `stillShown = activeEntry()` then resolves to the DESTINATION and hides the source. So the
// behavioural halves below are green at HEAD and become the mutant-killers; the red-at-HEAD
// discriminator is the OWNER being named rather than inferred, which is the landed descriptor
// reaching endHold at all.
test('LANDEDPAGESHOWS — Browse.endHold is TOLD where the gesture landed, on the abort and the '
  + 'commit branch alike', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    const orig = h.Browse.endHold;
    assert.equal(orig.length, 2, 'RED @HEAD: `Browse.endHold(token)` takes one argument '
      + '(js/browse.js:164). Stage 2 deletes the abort re-render that currently puts the page '
      + 'selection back, so the owner must be NAMED: endHold gains the landed screen descriptor '
      + '(plan §6, §5.3.6)');

    const seen = [];
    h.Browse.endHold = function spyEndHold(...args) { seen.push(args); return orig.apply(h.Browse, args); };
    try {
      await authorsUnderBooks(h);
      await goLive(h, addRow(h));
      await abortBack(h);
      assert.ok(/abort back books→authors/.test(settles(h).at(-1) || ''),
        `fixture sanity: the browse->browse swipe must have ABORTED — got ${settles(h).at(-1)}`);
      const onAbort = seen.at(-1);
      assert.ok(onAbort && onAbort[1] && onAbort[1].v === 'books',
        'the ABORT must hand endHold the screen it landed back on (books) — read AFTER the '
        + `synchronous applyScreen, which is what makes currentDesc() the landed screen. Got ${JSON.stringify(onAbort && onAbort[1])}`);

      await goLive(h, addRow(h));
      await commitBack(h);
      assert.ok(/commit back books→authors/.test(settles(h).at(-1) || ''),
        `fixture sanity: the second browse->browse swipe must have COMMITTED — got ${settles(h).at(-1)}`);
      const onCommit = seen.at(-1);
      assert.ok(onCommit && onCommit[1] && onCommit[1].v === 'authors',
        'the COMMIT must hand endHold the screen it landed on (authors). This is the half that '
        + 'kills a descriptor read BEFORE applyScreen: an abort mutates neither stack, so a '
        + 'too-early read is invisible there, while the commit\'s stack mutation sits AHEAD of '
        + `applyScreen (js/app.js:817-820). Got ${JSON.stringify(onCommit && onCommit[1])}`);
    } finally { h.Browse.endHold = orig; }
  } finally { h.dispose(); }
});

test('LANDEDPAGESHOWS — an ABORTED browse->browse leaves the page it started on shown and '
  + 'activated, and a COMMITTED one leaves the page it landed on', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true, books: bigBooks(700) });
  try {
    h.VirtualList.setForceVirtual(true);       // see the header: a call count needs a controller
    await authorsUnderBooks(h);
    const books = pageEl(h, 'books');
    const authors = pageEl(h, 'authors');
    assert.ok(books && books._vctl && authors && authors._vctl,
      'fixture sanity: both pages are virtualized, so "the controller that was activated" exists');

    // ── ABORT: back to books.
    let counted = watchActivate(books);
    await goLive(h, addRow(h));
    await abortBack(h);
    assert.ok(/abort back books→authors/.test(settles(h).at(-1) || ''),
      `fixture sanity: ABORT — got ${settles(h).at(-1)}`);
    assert.equal(books.classList.contains('parked'), false, 'the aborted-to page must not stay parked');
    assert.equal(books.classList.contains('hidden'), false, 'the aborted-to page must be the SHOWN one');
    assert.equal(authors.classList.contains('hidden'), true, 'the destination page must be hidden again');
    assert.ok(counted.n >= 1, `the aborted-to page's controller must be the one activated at the hold's `
      + `release — activate() calls: ${counted.n}`);

    // ── COMMIT: on to authors.
    counted = watchActivate(authors);
    await goLive(h, addRow(h));
    await commitBack(h);
    assert.ok(/commit back books→authors/.test(settles(h).at(-1) || ''),
      `fixture sanity: COMMIT — got ${settles(h).at(-1)}`);
    assert.equal(authors.classList.contains('parked'), false, 'the landed-on page must not stay parked');
    assert.equal(authors.classList.contains('hidden'), false, 'the landed-on page must be the SHOWN one');
    assert.equal(books.classList.contains('hidden'), true, 'the source page must be hidden');
    assert.ok(counted.n >= 1, `the landed-on page's controller must be activated — activate() calls: ${counted.n}`);
  } finally {
    if (h.VirtualList) h.VirtualList.setForceVirtual(false);
    h.dispose();
  }
});

// ⭐ THE NATURAL-c HALF, and the reason virtualization is forced here. `Browse.endHold` runs on
// EVERY gesture, not only browse->browse: takeRowHold() is unconditional in start()
// (js/app.js:535) and dropRowHold calls endHold whenever session.hold is truthy (js/app.js:360-363).
// So its body also runs on the four SHIPPED, device-confirmed transitions, and adding an argument
// without saying what it means there would be a change to them made by omission.
//
// ⚠️ THE TWO PHASES EXERCISE DIFFERENT BRANCHES, and this cell asserts each on its own terms
// rather than claiming one property for both (Poirot A1 — the ABORT phase was previously a false
// witness: it claimed to drive the fallback but could not). COMMIT lands on 'home', which is never
// a browse-page key, so `landedKey` misses the cache and endHold takes the FALLBACK branch — this
// is the phase the mutant (dropping the cache-lookup discriminator from the fallback's guard) can
// actually be caught on: the mutant routes the miss through the landed lookup anyway, so no page
// is reconciled and the ONE realization the gesture gets is skipped, visible only as a CONTROLLER
// ACTIVATION CALL COUNT. ABORT lands back on the browse source (currentDesc() reverts to it before
// endHold runs), which is STILL CACHED, so `landedKey` HITS the cache and endHold takes the LANDED
// branch instead — the mutant is a no-op there. The abort phase still asserts something real and
// its own: that the source page's controller is correctly reactivated via the LANDED branch, not
// left stranded — a property this file's other LANDEDPAGESHOWS cells (browse->browse) also cover,
// but not for a browse->home gesture specifically.
test('LANDEDPAGESHOWS — a browse->home gesture: COMMIT lands on no cached browse page and takes the '
  + 'fallback (HEAD\'s activeEntry() inference); ABORT lands back on the still-cached source and '
  + 'takes the landed branch. Both leave browse page state and controller activation exactly as '
  + 'HEAD leaves them', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true, books: bigBooks(700) });
  try {
    h.VirtualList.setForceVirtual(true);
    await settle(h);
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    const books = pageEl(h, 'books');
    assert.ok(books && books._vctl,
      'fixture sanity: the Books page MUST be virtualized — with the classic renderer there is no '
      + 'controller, the activation count is 0 both at HEAD and under the mutant, and this cell '
      + 'would be vacuously green');

    for (const phase of ['abort', 'commit']) {
      const counted = watchActivate(books);
      await goLive(h, addRow(h));               // left-edge back-swipe from books -> home
      assert.ok(/^start back books→home/.test(swipeLog(h).filter((m) => /^start /.test(m)).at(-1) || ''),
        `fixture sanity: the live gesture must be browse->home — got ${swipeLog(h).at(-1)}`);
      if (phase === 'abort') await abortBack(h); else await commitBack(h);

      const msg = phase === 'abort'
        ? 'on a browse->home abort the started-from page\'s controller must still be activated at '
          + 'the hold\'s release, exactly as HEAD activates it — the LANDED branch (the source is '
          + `still cached), not the fallback. activate() calls: ${counted.n}`
        : 'on a browse->home commit the started-from page\'s controller must still be activated at '
          + 'the hold\'s release, exactly as HEAD activates it. A landed descriptor naming no cached '
          + 'page (home) must fall back to HEAD\'s activeEntry() inference, not be routed through the '
          + `landed lookup and reconcile nothing. activate() calls: ${counted.n}`;
      assert.ok(counted.n >= 1, msg);
      assert.equal(books.classList.contains('parked'), false,
        `a browse->home ${phase} never parks a browse page — showPage does not run on this path`);

      if (phase === 'abort') {
        assert.equal(books.classList.contains('hidden'), false,
          'an aborted browse->home returns to browse, so its page stays shown');
      } else {
        h.tap('.navbtn[data-nav="books"]'); await settle(h);   // back to browse for the second pass
      }
    }
  } finally {
    if (h.VirtualList) h.VirtualList.setForceVirtual(false);
    h.dispose();
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// ABORTNORENDER — RED @HEAD. Plan §14, §5.3.4, §6.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. An aborted swipe never re-renders its source screen, because the source element was
// never overwritten — so the abort is a transform reset and nothing else. At HEAD the abort branch
// is gated on `finPlan.abortRender === 'rerender'` and calls `applyScreen(dest, { render: true })`
// (js/app.js:1229-1230), which reaches Browse.render for the source screen.
test('ABORTNORENDER — an aborted browse->browse re-renders nothing after finger-up, and the source '
  + 'page node is the same object it was before the gesture', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await authorsUnderBooks(h);
    const booksBefore = pageEl(h, 'books');
    assert.ok(booksBefore, 'fixture sanity: the source page is cached');

    const origRender = h.Browse.render;
    const rendered = [];
    h.Browse.render = function spyRender(desc) { rendered.push(desc && desc.v); return origRender.call(h.Browse, desc); };
    try {
      await goLive(h, addRow(h));
      assert.ok(rendered.includes('authors'),
        'fixture sanity: the mid-drag render DID render the destination — otherwise "no source '
        + 'render after finger-up" would be trivially true because nothing renders at all');

      h.touch.move(60, 304); await realSleep(12);
      h.touch.move(14, 306); await realSleep(12);
      h.touch.end(10, 306);
      const mark = rendered.length;                    // everything after this is settle + finalize
      await settle(h); await h.clock.advance(700); await settle(h);

      assert.ok(/abort back books→authors/.test(settles(h).at(-1) || ''),
        `fixture sanity: the swipe must have ABORTED — got ${settles(h).at(-1)}`);
      const after = rendered.slice(mark);
      assert.deepEqual(after.filter((v) => v === 'books'), [], 'RED @HEAD: the abort branch is gated '
        + 'on `finPlan.abortRender === \'rerender\'` and re-renders the source into the shared '
        + '#browse host (js/app.js:1229-1230). With each page its own element nothing was '
        + `overwritten, so there is no content to rebuild:\n  renders after finger-up: ${JSON.stringify(after)}`);
      assert.equal(pageEl(h, 'books'), booksBefore,
        'and the source page node must be the SAME object — an abort that replaces the node has '
        + 'rebuilt the page whether or not it called render');
    } finally { h.Browse.render = origRender; }
  } finally { h.dispose(); }
});
