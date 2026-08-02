// STAGE 6a of PLAN-swipe-reveal.md (sub-plan Claude/Plans/PLAN-swipe-stage6.md) —
// the RED suite for the supersession PRE-STACK RECOVERY, derived cell-by-cell from
// that plan's §8 Coverage Model and §9 coverage/mutation matrix. Authored red before
// the recovery exists (js/app.js begin()), per the red-first law.
//
// WHAT STAGE 6a CHANGES (the two standing known-red policies it closes):
//   - KR-swipe-source-rerender: superseding a live browse->browse drag must re-render
//     the SOURCE into #browse (else the stack/navbar return to the source while the
//     shared host keeps the destination — the .178 wrong-page/wrong-tap class).
//   - KR-swipe-scroll-restore:  superseding a live drag must restore the starting
//     document scroll (else the user is left at the destination's scroll).
//
// CELL MAP (plan §9). This file holds the NEW cells; SR/SC/PD/ST live in
// swipe-invariants.test.js and are reconciled by REFERENCE (see the block at the end):
//   VR  red-first  the load-bearing cell — a VIRTUALIZED source's kept rows must be
//                  REALIZED after the recovery, not merely present (realBrowse harness).
//   OR  red-first  the source re-render precedes the successor arming (intermediate state).
//   NC  red-first  an overlay-source (non-clobber) supersession issues NO spurious
//                  #browse render but still restores scroll.
//   PS  green guard supersession is PRE-STACK — the recovery must not mutate the nav stack.
//   OB  green guard an ORPHAN-pane hard reset (d===null) attempts no session-scroll restore.
//   KEEPER (device-only) Loki's NB-post-endHold-scroll-realize — jsdom cannot emit it.
//
// RED-FIRST DISCIPLINE. The three red-first cells (VR/OR/NC) FAIL against HEAD for the
// INTENDED missing behavior (begin()'s hard reset performs no source re-render and no
// scroll restore, and releases the row hold BEFORE any restore). They are NOT `{ todo }`:
// they are the failing constraint Brunel makes green in the SAME 6a build, not a
// long-lived known-red — so they must not be added to the policy ledger (whose gate would
// then demand a `{ todo }` marker). The two long-lived known-reds this stage closes stay
// `{ todo }` + ledgered in swipe-invariants.test.js until Brunel flips them.
//
// ⚠️ SCOPE, honestly. jsdom pins window.scrollY at 0, so the scroll cells assert WHETHER a
// restore was issued, never WHICH coordinate. Layout is absent, so nothing here speaks to
// the visual flash (plan §6, out of scope). VR drives the REAL js/browse.js + js/virtuallist.js
// so the virtualizer's suspend/realize/deactivate state machine — which the fake Browse
// cannot model — is exercised for real.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// REAL wall clock, captured before boot() patches setTimeout. app.js's move() resamples
// velocity only after >8ms of REAL time; synthetic moves fired back-to-back otherwise
// leave vx holding the outward flick and a gesture meant to abort commits instead.
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const hardResets = (h) => swipeLog(h).filter((m) => /leftover state on begin/.test(m));
const renders = (h) => h.log.calls.filter((c) => c.name === 'browse.render').map((c) => c.args[0]);
const scrollCalls = (h) => h.log.calls.filter((c) => c.name === 'window.scrollTo');
const ghosts = (h) => h.document.querySelectorAll('.nav-ghost').length;

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}
/** Authors over Books: the browse->browse pane case (a left-edge back-swipe is Authors->Books). */
async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]');
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
}
/** Drive a gesture live (past the 8px lock, horizontal) on a fresh row. Returns the row. */
async function goLive(h, target) {
  const row = target || addRow(h);
  h.touch.start(10, 300, row);
  await realSleep(12);
  h.touch.move(120, 302);   // horizontal, past the lock → start()
  return row;
}

// ── OR (red-first) — the source re-render PRECEDES the successor arming ──────────────
// §9 OR (intermediate-state, Engineering Contract §4.7). On a live browse->browse
// supersession, the recovery must restore the SOURCE into #browse before the successor
// renders its own destination — so the successor's start() (revealBase = snapBrowse(true))
// snapshots the RESTORED source, not the stale destination the mid-drag render left there.
// Mutation: no recovery render (HEAD) → the source is never restored; or the recovery
// runs after the successor renders → the source restore lands after the destination.
test('OR — the source re-render precedes the successor arming: recovery restores the source before the new gesture renders its destination', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);          // renders: books, authors
    await goLive(h);                      // drag 1 live: Authors->Books, mid-drag renders 'books'
    const base = renders(h).length;

    // A NEW gesture supersedes the live one AND is itself driven live.
    h.touch.start(10, 300, addRow(h));    // begin(): the recovery must re-render 'authors' (source)
    await realSleep(12);
    h.touch.move(120, 302);               // successor goes live → mid-drag renders 'books' (dest)

    const seq = renders(h).slice(base);
    const ai = seq.indexOf('authors');    // the recovery's source re-render
    const bi = seq.indexOf('books');      // the successor's destination render
    assert.ok(ai >= 0,
      'the recovery must re-render the SOURCE into #browse before the successor arms — '
      + `renders after supersede = ${JSON.stringify(seq)}`);
    assert.ok(bi < 0 || ai < bi,
      `the source restore must precede the successor's destination render; got ${JSON.stringify(seq)}`);
  } finally { h.dispose(); }
});

// ── NC (red-first) — a NON-clobber (overlay-source) supersession ─────────────────────
// §9 NC. When the superseded live drag's SOURCE is an overlay (Options), the source never
// overwrote #browse (the declared abortRender is 'none'), so the recovery must NOT
// re-render #browse — but it must STILL restore the starting scroll. HEAD restores
// neither, so the scroll half is red. Mutation (recovery re-renders ignoring the declared
// abort decision) → a stray #browse render; mutation (omit scrollTo) → no restore.
test('NC — an overlay-source supersession issues NO spurious #browse re-render but still restores the scroll', async () => {
  const h = boot({ fakeTimers: true });
  try {
    h.tap('.navbtn[data-nav="books"]');
    await settle(h);
    h.tap('.navbtn[data-nav="options"]');   // navStack = [books, options]; options is an overlay
    await settle(h);

    // live back-swipe Options->Books: the overlay source moves as its real element, so
    // #browse is NOT overwritten by the source (the destination render into #browse is a
    // separate host, not the source's) — the declared abortRender is 'none'.
    h.touch.start(10, 300, h.$('options'));
    await realSleep(12);
    h.touch.move(120, 302);                 // live
    assert.equal(starts(h).length, 1, 'fixture sanity: the overlay-source back-swipe went live');
    const rBefore = renders(h).length;
    const sBefore = scrollCalls(h).length;

    h.touch.start(10, 300, addRow(h));      // supersede
    await settle(h);

    assert.equal(renders(h).length, rBefore,
      'an overlay-source supersession must not re-render #browse — the declared abortRender is \'none\'');
    assert.ok(scrollCalls(h).length > sBefore,
      'but a live supersession must still restore the scroll it started from (app.js: window.scrollTo(0, cur.scroll0))');
  } finally { h.dispose(); }
});

// ── VR (red-first, the load-bearing cell) — a VIRTUALIZED source keeps its rows REALIZED ─
// §9 VR + §6 correctness requirement B, and the Loki HELD-STONE strike
// (Claude/Loki/STRIKE-swipe-stage6-recover-before-arm-r2.md). This is the cell the small-list
// fixtures cannot reach: only a forced-virtual, deep-scrolled source with a real suspend/
// realize controller distinguishes a recovery that KEEPS-AND-REALIZES the source rows from
// one that rebuilds them (or leaks the hold and never realizes them).
//
// THE DISCRIMINATOR (heeding Charpy r4). `keptOriginalRows > 0` alone is INSUFFICIENT:
// suspend() keeps the rows, so mutation (b) — session nulled before dropRowHold, so endHold
// never fires — leaves the source SUSPENDED with all its rows present and would silently
// pass a count-only check. So the assertion pins BOTH: the source controller is ACTIVE
// (realized against the settled scroll — catches (b), which leaves it 'suspended'), AND
// every ORIGINAL realized row node survived with none rebuilt (catches (a) — endHold before
// the recovery render, which dematerializes the kept rows and rebuilds from nothing).
//
// Loki measured, against the real modules: plan §6 order → active / kept=13 / fresh=0;
// mutation (a) → active / kept=0 / fresh=13; mutation (b) → suspended / kept=13 / fresh=0.
// Against HEAD (endHold fires FIRST, then applyScreen({render:false}) never re-renders the
// source) the source ends INACTIVE with zero rows — red for the intended missing recovery.
const bigBooks = (n) => Array.from({ length: n }, (_, i) => ({
  ratingKey: 'b' + i, title: 'Book ' + i, titleSort: String(i).padStart(6, '0'),
  parentTitle: 'A', thumb: '/t/' + i, leafCount: 10, viewedLeafCount: 0,
}));

test('VR — superseding a live drag on a VIRTUALIZED browse->browse source keeps the source rows ACTIVE and realized, not rebuilt or leaked', async () => {
  const view = { scrollY: 0, viewportH: 600 };
  const h = boot({ realBrowse: true, fakeTimers: true, books: bigBooks(700) });
  try {
    const Browse = h.Browse, VL = h.VirtualList;
    assert.ok(Browse && Browse._test && VL && VL.createController,
      'fixture sanity: realBrowse installed the real js/browse.js + js/virtuallist.js');
    await settle(h);

    // Force the virtual path for a controllable list, and inject metrics (jsdom has no
    // layout) — the test/browse-virtual.test.js recipe. setVlOpts must precede the render
    // (virtualView reads vlOpts when it creates the controller).
    VL.setForceVirtual(true);
    Browse._test.setVlOpts({
      strides: { header: 30, row: 80 }, overscan: 200,
      metrics: { scrollY: () => view.scrollY, viewportH: () => view.viewportH, listTop: () => 0 },
    });

    // Authors UNDER Books so the SOURCE (the shown page) is the big virtualized Books list;
    // a left-edge back-swipe is then Books->Authors (browse->browse).
    h.tap('.navbtn[data-nav="authors"]');
    await settle(h);
    h.tap('.navbtn[data-nav="books"]');
    await settle(h);

    const booksEl = Browse._test.pageCache.get('books') && Browse._test.pageCache.get('books').el;
    assert.ok(booksEl && booksEl._vctl, 'fixture sanity: the Books source page is virtualized');

    // Deep-scroll and realize the source, then STAMP its realized row nodes by identity
    // (node identity = a kept row is the SAME element, matching snapBrowse's clone source).
    view.scrollY = 40000;
    booksEl._vctl._realize();
    const stamp = new Set([...booksEl.querySelectorAll('.book')]);
    assert.ok(stamp.size > 0 && stamp.size < 700,
      `fixture sanity: the source realized a deep WINDOW (${stamp.size}), not the whole list`);

    // Live back-swipe Books->Authors on a realized source row, then supersede.
    const rows = [...booksEl.querySelectorAll('.book')];
    h.touch.start(10, 300, rows[0]);
    await realSleep(12);
    h.touch.move(120, 302);                 // live: mid-drag render suspends the source (rows kept)
    assert.equal(booksEl._vctl.state(), 'suspended',
      'fixture sanity: the live drag SUSPENDED the source (rows kept for the abort/recovery)');

    h.touch.start(10, 300, booksEl.querySelectorAll('.book')[1] || addRow(h));   // supersede
    await settle(h);
    await h.clock.advance(400);
    await settle(h);

    const st = booksEl._vctl.state();
    const now = [...booksEl.querySelectorAll('.book')];
    const kept = now.filter((r) => stamp.has(r)).length;
    const fresh = now.filter((r) => !stamp.has(r)).length;

    // (b) — session nulled before dropRowHold leaves it 'suspended'/'inactive', never 'active'.
    assert.equal(st, 'active',
      `the superseded virtualized source must be ACTIVE (realized against the settled scroll); `
      + `got '${st}' — endHold never realized the kept rows (hold released before the recovery, or leaked)`);
    // (a) — endHold before the recovery render dematerializes the kept rows and rebuilds them.
    assert.equal(kept, stamp.size,
      `every ORIGINAL realized row must survive the recovery; kept ${kept}/${stamp.size} (rebuilt=${fresh})`);
    assert.equal(fresh, 0, 'and no source rows may be rebuilt from nothing');
  } finally {
    if (h.VirtualList) h.VirtualList.setForceVirtual(false);   // never leak the override
    h.dispose();
  }
});

// ── PS (green regression guard) — supersession is PRE-STACK ──────────────────────────
// §9 PS + invariants I11/I18. The recovery restores the source SCREEN and CONTENT but must
// NOT mutate the nav stack: the authoritative settled descriptor stays the SOURCE. Observed
// behaviourally (navStack has no test export) — after a superseded live drag, the very next
// back-swipe must offer the SAME transition. GREEN against HEAD (the hard reset pops nothing);
// this pins that the recovery keeps it so. Mutation (recovery pushes/pops the stack) → the
// next gesture reports a different transition pair.
test('PS — a superseded pre-stack recovery leaves the stack on the source: the next back-swipe offers the same transition', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);                        // drag 1 live: Authors->Books
    const first = starts(h).at(-1);

    // Supersede with a new gesture and let it abort away (out, back, end) — no commit,
    // so nothing but the SUPERSESSION could touch the stack.
    h.touch.start(10, 300, addRow(h));
    h.touch.move(80, 302); await realSleep(12);
    h.touch.move(200, 304); await realSleep(12);
    h.touch.move(30, 304); await realSleep(12);
    h.touch.end(30, 304);
    await settle(h); await h.clock.advance(400); await settle(h);

    await goLive(h);                        // a fresh back-swipe from the same source
    const later = starts(h).at(-1);
    assert.ok(first && later, 'fixture sanity: both the superseded and the later gesture engaged');
    assert.equal(later.replace(/ ghosts=\d+$/, ''), first.replace(/ ghosts=\d+$/, ''),
      'a pre-stack recovery must not consume the stack — the same transition is still offered');
  } finally { h.dispose(); }
});

// ── OB (green regression guard) — the ORPHAN-pane hard reset ─────────────────────────
// §9 OB + I17(b). begin() also hard-resets when there is a leftover `.nav-ghost` but NO
// live session (d === null) — an orphan pane. There is no session-start scroll to restore
// and currentDesc() is authoritative, so the recovery must NOT read cur.scroll0/cur.finPlan
// on this path (cur is null — the render/scroll ternaries short-circuit before either
// dereference). GREEN against HEAD; this pins that the recovery guards on the live session.
// Mutation (recovery reads cur.* unconditionally) → a throw or a spurious scroll on the
// orphan path.
test('OB — an orphan-pane hard reset (no live session) disposes as hard-reset and attempts no session-scroll restore', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    // An orphan: a leftover .nav-ghost with NO active session (d === null). This is the
    // spent/interrupted-pane shape begin() hard-resets — inject it directly so the branch
    // is exercised with d null (no live gesture in flight).
    const orphan = h.document.createElement('div');
    orphan.className = 'nav-ghost';
    h.$('browse').appendChild(orphan);

    const sBefore = scrollCalls(h).length;
    const hrBefore = hardResets(h).length;
    // A left-edge touch → begin() sees the orphan ghost (d null) → hard reset. Do NOT drive
    // it live: isolate begin()'s orphan branch (no start(), no mid-drag render/scroll).
    assert.doesNotThrow(() => { h.touch.start(10, 300, addRow(h)); },
      'the orphan hard reset must not throw (it must not read cur.scroll0/cur.finPlan on a null cur)');
    await settle(h);

    assert.ok(hardResets(h).length > hrBefore, 'fixture sanity: the orphan really tripped begin()\'s hard reset');
    assert.equal(scrollCalls(h).length, sBefore,
      'an orphan hard reset has no session-start scroll to restore — it must issue no scrollTo');
  } finally { h.dispose(); }
});

// ── OB-home (regression, red-first for F1) — orphan hard-reset resets scroll on a home source ─
// Poirot F1 (Claude/Poirot/f09cf9d-swipe-stage6-supersession.md): the recovery's shared
// `applyScreen(currentDesc(), { render: cur?(cur.live && cur.finPlan.abortRender===
// 'rerender'):false, resetScroll: false })` (stage 6d re-derived the render flag) forces
// resetScroll:false onto the ORPHAN sub-case (d===null) too — not just the live-recovery
// branch that needs it (so applyScreen won't stomp the explicit d.scroll0 restore). For an
// orphan hard-reset whose currentDesc() is `home`, the PRE-6a code reset the document scroll
// to top; the committed f09cf9d does not — an unclassified parity regression the OB test
// above is blind to (it drives a BROWSE source, where nav.js never resets scroll, so
// resetScroll is inert).
//
// Stage 6i (PLAN-swipe-noswap-home.md §6) RE-HOMES what gets reset: active #home is now its
// own position:fixed overflow-y:auto scroller, so home entry resets #home's OWN scrollTop
// (nav.js), not the document's `window.scrollTo(0, 1)` (retired). The INVARIANT this cell
// pins is unchanged — an orphan hard-reset on a home source must still reset home's scroll
// to top — only the OBSERVABLE CHANNEL moved.
//
// This asserts the pre-6a parity on the re-homed channel: an orphan hard-reset on a home
// source resets #home.scrollTop to 0. Brunel's fix (`resetScroll: d ? false : undefined`, so
// only the live-recovery branch forces false) greens it; the OB browse guard stays green
// (browse is inert to resetScroll). (Options/sub sources reset a PANEL scrollTop — home is
// now the SAME kind of own-scroll source, no longer the window-observable one.)
test('OB-home — an orphan hard-reset on a HOME source resets #home\'s own scroll to top (pre-6a parity; Poirot F1; Stage 6i re-homed)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    h.tap('.navbtn[data-nav="home"]');      // currentDesc() === home
    await settle(h);
    h.$('home').scrollTop = 500;            // #home scrolled down within its own fixed scroller

    // An orphan: a leftover .nav-ghost with NO live session (d === null), on a HOME source.
    const orphan = h.document.createElement('div');
    orphan.className = 'nav-ghost';
    h.$('home').appendChild(orphan);

    const hrBefore = hardResets(h).length;
    // Any touchstart with a leftover ghost trips begin()'s hard reset (it runs before the
    // edge/exclusion checks). Do NOT drive it live — isolate the hard-reset's applyScreen.
    h.touch.start(10, 300, addRow(h));
    await settle(h);

    assert.ok(hardResets(h).length > hrBefore, 'fixture sanity: the orphan tripped begin()\'s hard reset');
    assert.equal(h.$('home').scrollTop, 0,
      'an orphan hard-reset on a home source must reset #home\'s OWN scroll to top '
      + '(applyScreen home → #home.scrollTop = 0)');
  } finally { h.dispose(); }
});

// ── KEEPER (device-only) — Loki NB-post-endHold-scroll-realize ───────────────────────
// The Loki r2 strike's named RESIDUAL suspicion (filed as a suspicion, not a body): between
// step 4 (endHold un-suspends the shared VirtualList scroll dispatcher and leaves the source
// controller active) and the successor's start() (which fires on its FIRST touchmove, not at
// begin()), a browser-originated `scroll` event — plausibly from removing the outgoing
// .nav-ghost or iOS re-seating layout — would _realize() the active source at a transient
// offset and could release the kept rows before start() snapshots them. jsdom emits no such
// scroll (rAF/scroll are synthetic), so there is NO honest jsdom body for it. It is recorded
// here as a KEEPER whose executable form is device-dependent, NOT faked as a jsdom repro.
test('KEEPER — a browser scroll between endHold and the successor\'s first move must not release the virtualized source\'s kept rows (Loki NB-post-endHold-scroll-realize)',
  { skip: 'Device-only. jsdom cannot emit a browser-originated scroll in the window between endHold '
        + '(which un-suspends the shared VirtualList scroll dispatcher) and the successor start() '
        + '(fired on its first touchmove, not at begin()). Reproducing it needs a real-browser/device '
        + 'harness; this cell is a guard to be exercised there, not a jsdom repro. See '
        + 'Claude/Loki/STRIKE-swipe-stage6-recover-before-arm-r2.md §5.' },
  () => {});

// ── RECONCILIATION — cells that live in swipe-invariants.test.js ─────────────────────
// SR (red-first, existing `{ todo }` @ swipe-invariants.test.js ~:391, ledger
//    KR-swipe-source-rerender): superseding a live browse->browse drag re-renders the
//    SOURCE into #browse. Left as the existing known-red; Brunel drops `{ todo }` when green.
// SC (red-first, existing `{ todo }` @ swipe-invariants.test.js ~:339, ledger
//    KR-swipe-scroll-restore): superseding a live drag restores the starting scroll. Same.
// PD (green guard, existing @ ~:253 'I2/I20 — superseding a LIVE drag disposes its pane'):
//    the superseded pane is disposed exactly once. Must stay green (parity).
// ST (green guard, existing @ ~:419 'I20 — stale move/end/cancel ... cannot touch the new
//    session'): the superseded gesture's stale events stay harmless. Must stay green.
// These are NOT duplicated here (one owner per cell); this file adds only the NEW cells.
