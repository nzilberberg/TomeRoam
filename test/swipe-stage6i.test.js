// STAGE 6i of PLAN-swipe-noswap-home.md — the RED suite for the "no-swap, slide the real
// fixed #home in and leave it" slice, authored red-first by Curie (2026-07-28) from the §10
// Coverage Model, BEFORE Brunel's build (red-first TDD law, Claude/Decisions/DecisionLog.md).
// Companion note: Claude/Curie/RED-swipe-stage6i.md.
//
// WHAT THIS SLICE PROMISES (PLAN §3/§4/§9). Active #home becomes a position:fixed own-scroll
// view. A →home transition slides the REAL fixed #home in (un-parked at DRAG START via the
// new `home-host` render) and LEAVES it — no home-snapshot pane, no held cover, no
// scroll-settle gate. The home vertical scroll re-homes onto #home.scrollTop (pull-to-refresh,
// the custom scrollbar, the outgoing app-ghost's fidelity offset).
//
// ⚠️ SKIP-PENDING-BUILD. Every NEW cell below is authored RED against current HEAD (the fixed
// #home behaviour does not exist yet) and is committed `{ skip }` so the pre-commit suite stays
// green (the hook runs the whole suite; a plain-red cell would block the commit and the project
// does not use --no-verify). Each was CONFIRMED RED with the skip removed — the exact failure and
// the mutation it reddens on are recorded in Claude/Curie/RED-swipe-stage6i.md. Brunel REMOVES
// the skip to drive them red, then builds to green. Do NOT weaken an assertion to green a cell.
//
// ⚠️ DEVICE-OWED, NOT HERE. The carousel flash R1(a), bar stability R1(b), nested-scroll R1(c),
// the L5 on-screen zero-jump R1(d), and the browse→home abort cover-warmth/no-demote R1(e) are
// PAINTS jsdom cannot see. They are device gates, NOT CI cells (the vacuously-green-harness
// scar). GHOSTSCROLL asserts only the SOURCE the ghost offset is READ FROM (#home.scrollTop),
// never the on-screen position.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { boot } = require('./app-harness.js');
const { readRoot, ROOT } = require('./dom-fixture.js');

const SKIP = 'red-first Stage 6i — remove skip to run; Brunel greens (Claude/Curie/RED-swipe-stage6i.md)';

async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

// REAL wall clock, captured before boot() patches setTimeout. app.js's move() only resamples
// velocity after >8ms of real time, so synthetic moves fired back-to-back leave vx holding the
// OUTWARD flick and a gesture meant to abort COMMITS instead (same reason the other swipe
// suites keep their own realSleep).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const ghosts = (h) => h.document.querySelectorAll('.nav-ghost').length;
const scrollCalls = (h) => h.log.calls.filter((c) => c.name === 'window.scrollTo');
const parked = (h) => h.$('home').classList.contains('parked');
const browseHidden = (h) => h.$('browse').classList.contains('hidden');
const activeSession = (h) => (h.window.PBSwipeSession ? h.window.PBSwipeSession() : 'no-accessor');

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}

// From boot the stack is [home]; tapping Authors PUSHES it, so a left-edge back-swipe is
// Authors → Home — the browse→home reveal this slice reshapes. Engage the drag PAST the 8px
// direction lock so start() has built the construction, then STOP so mid-drag DOM is inspectable.
async function toAuthors(h) {
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// SNAPSHOTGONE (§10, integration) — a committed browse→home builds NO home-snapshot pane; the
// real fixed #home is the incoming mover (un-parked at DRAG START), and the outgoing is the
// real #browse, never display:none'd during the drag.
//
// RED AT HEAD (confirmed): browse→home builds a home-snapshot owned-pane (a .nav-ghost) and
// leaves the real #home PARKED under it — so `ghosts===0` and `!parked` both redden.
// MUTATION (§10): constructionPlanFor keeps `incoming:'home-snapshot'` for →home → the snapshot
// pane is built over #home and #home stays parked → this reddens.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('SNAPSHOTGONE — a committed browse→home builds no home-snapshot pane; the real fixed #home is the incoming mover', async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      await toAuthors(h);
      // Engage the back-swipe and hold mid-drag (start() has run, construction built).
      h.touch.start(10, 300, addRow(h));
      h.touch.move(80, 302);
      assert.equal(starts(h).length, 1, 'fixture: the Authors→Home back-swipe must go live');

      // The heart of the slice: no snapshot pane, and the REAL #home is the incoming mover.
      assert.equal(ghosts(h), 0,
        'browse→home must build NO home-snapshot pane — the real fixed #home is the incoming mover (not a clone)');
      assert.equal(parked(h), false,
        'the real #home must be UN-PARKED at drag start (home-host render), i.e. it is the fixed incoming mover');
      assert.notEqual(h.$('home').style.transform, '',
        'the real #home carries the inline mover transform during the slide (it is the borrowed-real incoming mover)');
      // The outgoing is the real #browse, still on-screen (never display:none'd) — the
      // live-never-hidden mover that keeps its covers warm (Loki KILL #2, R4/R1(e)).
      assert.equal(browseHidden(h), false,
        'the outgoing real #browse must stay SHOWN during the drag (borrowed-real mover, not hidden, not a ghost)');

      // Commit → finalize. The real fixed #home rests un-parked at translateX(0); #browse is
      // display:none'd by applyScreen at commit; NO held cover, NO snapshot to drop.
      await realSleep(12); h.touch.move(600, 304); await realSleep(12); h.touch.end(600, 304);
      await settle(h); await h.clock.advance(700); await settle(h);
      for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();
      await settle(h);
      assert.ok(/commit/.test(settles(h)[0] || ''), `fixture: the swipe must have committed — got ${settles(h)[0]}`);
      assert.equal(ghosts(h), 0, 'after finalize there is no snapshot/ghost pane over home');
      assert.equal(parked(h), false, 'the real fixed #home rests active (un-parked) after the commit');
      assert.equal(browseHidden(h), true, 'the outgoing #browse is display:none\'d by applyScreen at commit');
    } finally { h.dispose(); }
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// SCOPE (§10, async home-scoping) — the →home scroll-settle gate is DELETED. A SCROLLED
// browse→home commit no longer holds a reveal and no longer queues the SETTLE_MS settle timer;
// it finalizes synchronously (the real fixed #home is the incoming mover, so there is no cover
// to hold and nothing to wait on).
//
// RED AT HEAD (confirmed): with cur.scroll0 > SETTLE_SCROLL_MIN (=0.5·innerHeight=384) the
// commit→home path arms holdGhostUntilPaintable({scrollSettle:true}), which QUEUES a SETTLE_MS
// (100ms) timer AND holds the reveal (the owning session survives finalize) — so both
// assertions redden.
// MUTATION: keep the →home scroll-settle gate (re-arm `scrollSettle: cur.scroll0 >
// SETTLE_SCROLL_MIN` / keep the →home held reveal) → the 100ms settle timer is queued and the
// session is held past finalize → this reddens.
//
// NOTE (reconciliation, see the RED note): the §10 SCOPE ROW text frames the mutation on the
// "abort→browse" path, but the abort→browse hold is BYTE-UNCHANGED (it never passed scrollSettle),
// so a cell on that path is green-at-HEAD and cannot be red-first. The Curie handoff points SCOPE
// at toHeldRevealPending (the →home held reveal), and the dimension's PRIMARY clause is "the →home
// scroll-settle gate deleted" — so SCOPE realises THAT (red-first) half. The abort→browse
// byte-unchanged drop is already a green guard (swipe-stage6b-loser-cancel.test.js RR(a/b/c) +
// swipe-invariants.test.js held-reveal endpoint).
// ─────────────────────────────────────────────────────────────────────────────────────────
test('SCOPE — a scrolled browse→home commit deletes the scroll-settle gate: no SETTLE_MS timer, no held reveal', async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      await toAuthors(h);
      h.setScrollY(600);   // > SETTLE_SCROLL_MIN (0.5·768=384) → the HEAD path arms the settle gate
      h.touch.start(10, 300, addRow(h));
      h.touch.move(80, 302); await realSleep(12); h.touch.move(600, 304); await realSleep(12); h.touch.end(600, 304);
      await settle(h);
      await h.clock.advance(400);   // fire the 340ms fallback → finalize runs the →home path
      await settle(h);

      // The distinctive settle-gate timer is SETTLE_MS=100 (kept distinct from the reveal's
      // 60/340/500/600ms exactly so it is identifiable in a pending dump).
      const settleTimers = h.clock.pendingDump().filter((t) => t.ms === 100);
      assert.deepEqual(settleTimers, [],
        `the →home scroll-settle gate is deleted — no SETTLE_MS(100ms) timer may be queued; got ${JSON.stringify(h.clock.pendingDump())}`);
      // And →home no longer HOLDS at all: with no cover to hold, the session finalises
      // synchronously, so no scrollend is awaited. (deferRaf keeps any paint gate pending, so a
      // still-held HEAD reveal leaves the owner alive here — which is exactly the red.)
      assert.equal(activeSession(h), null,
        `browse→home must be a plain no-hold finalize (the real fixed #home is the mover) — the owning session must be released, got ${JSON.stringify(activeSession(h))}`);
    } finally { h.dispose(); }
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// ABORT (§10, phase-aware recovery, I7 / EC §4.17) — an aborted browse→home RE-PARKS the fixed
// #home, restores #browse as the shown view, and puts back the gesture-start document scroll.
//
// RED AT HEAD (confirmed): the mid-drag precondition — the real #home is the un-parked incoming
// mover — does not hold at HEAD (#home stays parked under the snapshot), so the mid-drag
// assertion reddens. The POST-abort re-park is the assertion the named mutation reddens
// post-build.
// MUTATION (§10): the abort path omits re-parking #home → #home stays the active fixed view over
// #browse → the parked-after assertion reddens.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('ABORT — an aborted browse→home re-parks the fixed #home, restores #browse, and restores the start scroll', async () => {
    const h = boot({ fakeTimers: true, deferRaf: true });
    try {
      await toAuthors(h);
      const before = scrollCalls(h).length;
      const row = addRow(h);
      // Engage, then inspect mid-drag: the real fixed #home is the un-parked incoming mover.
      h.touch.start(10, 300, row);
      h.touch.move(80, 302);
      assert.equal(starts(h).length, 1, 'fixture: the Authors→Home back-swipe must go live');
      assert.equal(parked(h), false,
        'PRECONDITION (new behaviour): mid-drag the real #home is the UN-PARKED fixed incoming mover — so the abort has something to re-park');

      // Abort: out past THRESH then back to the edge → release below threshold.
      await realSleep(12); h.touch.move(200, 304);
      await realSleep(12); h.touch.move(30, 304);
      await realSleep(12); h.touch.end(30, 304);
      await settle(h); await h.clock.advance(400); await settle(h);
      for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();
      await settle(h);

      assert.ok(/abort/.test(settles(h)[0] || ''), `fixture: it must have aborted — got ${settles(h)[0]}`);
      // Recovery: #home is RE-PARKED (this is what the named mutation omits), #browse is the
      // shown view again, and the starting document scroll was restored.
      assert.equal(parked(h), true,
        'the abort must RE-PARK the fixed #home — it must not linger un-parked over #browse (the named mutation omits this)');
      assert.equal(browseHidden(h), false, 'the source #browse is restored as the shown view after the abort');
      assert.ok(scrollCalls(h).length > before,
        'the abort must put back the gesture-start document scroll (app.js: window.scrollTo(0, cur.scroll0))');
    } finally { h.dispose(); }
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// PTR (§10, home scroll model) — pull-to-refresh arms on #home's OWN scroll top, not the
// document window.scrollY. A scrolled-down fixed #home (window.scrollY===0) must NOT arm the pull.
//
// RED AT HEAD (confirmed): the pull reads `window.scrollY > 0`; with the document pinned at 0 it
// arms while #home is scrolled down, so the "does-not-arm" assertion reddens (the #ptr indicator
// gets a transform).
// MUTATION (§10): pull-to-refresh still reads window.scrollY → arms with the document at 0 while
// #home is scrolled → reddens.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('PTR — pull-to-refresh reads #home.scrollTop, not window.scrollY: a scrolled fixed #home does not arm the pull', async () => {
    const h = boot({ fakeTimers: true });
    try {
      await settle(h);   // boot lands on Home, #home un-parked, the current screen
      h.$('home').scrollTop = 500;   // #home scrolled down within its own scroller…
      // …while the document is at the top (window.scrollY === 0, the harness default).
      assert.equal(h.$('ptr').style.transform, '', 'fixture: the pull indicator is idle before the gesture');

      // A downward drag on home. At HEAD this arms (reads window.scrollY===0); once the pull is
      // re-homed onto #home.scrollTop it must see #home is scrolled and NOT arm.
      h.touch.start(200, 120, h.$('home'));
      h.touch.move(200, 180);   // 60px downward

      assert.equal(h.$('ptr').style.transform, '',
        'a downward drag on a #home scrolled to 500 must NOT arm the pull — it must gate on #home.scrollTop, not window.scrollY');
      h.touch.end(200, 180);
      await settle(h);
    } finally { h.dispose(); }
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// SCROLLBAR (§10, unit) — the custom scroll indicator recognises the fixed own-scroll #home as a
// supported surface (so it draws its thumb for home). Today home was the DOCUMENT surface; under
// the fixed own-scroll model #home is its own scroller and must be added to the supported set.
//
// RED AT HEAD (confirmed): surfaceKind(#home) returns null (isDoc(#home) is false and #home is
// not in the overlay selector), so the indicator never draws on home.
// MUTATION (§10): #home is left out of the supported-surface set → surfaceKind returns null →
// the supported-surface assertion reddens.
//
// (metrics() reads #home.scrollTop/scrollHeight/clientHeight — but it is NOT exported on _test and
// jsdom does no layout, so its correctness is a build detail Brunel must expose; the CI-observable,
// mutation-targeted surface is surfaceKind. See the RED note.)
// ─────────────────────────────────────────────────────────────────────────────────────────
test('SCROLLBAR — surfaceKind recognises the fixed own-scroll #home as a supported home surface', () => {
    const dom = new JSDOM(readRoot('index.html'));
    global.window = dom.window; global.document = dom.window.document;
    delete require.cache[require.resolve('../js/scrollbar.js')];
    const ScrollBar = require('../js/scrollbar.js');
    const home = dom.window.document.getElementById('home');
    const kind = ScrollBar._test.surfaceKind(home);
    assert.ok(kind != null,
      'surfaceKind(#home) must return a supported (non-null) surface kind so the indicator draws on the fixed own-scroll home; got null');
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// GHOSTSCROLL (§10, integration — Loki's promoted probe) — the outgoing app-ghost of a SCROLLED
// HOME source derives its whole-clone content-translate offset from HOME'S OWN scroll
// (#home.scrollTop), not window.scrollY. This is the CI-checkable SOURCE branch of Loki's
// counterexample; the on-screen zero-jump is a paint (device-owed, R1(d)) and is NOT asserted here.
//
// RED AT HEAD (confirmed): ghostApp reads env.scrollY() (window.scrollY) for the offset, so with
// #home.scrollTop=500 / window.scrollY=0 the captured ghostY is 0 and the clone is translated to
// translateY(0px) — the "equals 500" source assertion reddens.
// MUTATION (§10): for a home source read the offset from window.scrollY instead of
// #home.scrollTop → the captured offset is 0 → the equals-500 source assertion reddens.
//
// Faithful to the §7-recipe seam (swipe-construction.test.js): env.document is a fresh JSDOM of
// the REAL index.html; the ghost is built through env, not an ambient document.
// ─────────────────────────────────────────────────────────────────────────────────────────
function mkGhostEnv(homeScrollTop) {
  const dom = new JSDOM(readRoot('index.html'));
  const doc = dom.window.document;
  // The running app shows the library and #browse; index.html ships them hidden, which the
  // ghost's .hidden/.parked prune would strip whole. Un-hide so the home clone has real content.
  const lib = doc.getElementById('library'); if (lib) lib.classList.remove('hidden');
  const browse = doc.getElementById('browse'); if (browse) browse.classList.remove('hidden');
  doc.getElementById('home').scrollTop = homeScrollTop;   // HOME scrolled within its OWN scroller
  const env = {
    document: doc,
    scrollY: () => 0,   // the DOCUMENT is at the top — the fixed-#home state Loki's counterexample sits in
    sourceEl: (host, v) => doc.getElementById(v === 'home' ? 'home' : 'browse'),
    navPill: () => doc.querySelector('.np-actions'),
    renderDestination: (dest, host) => doc.getElementById('browse'),
  };
  return { env, doc };
}

test('GHOSTSCROLL — the outgoing app-ghost of a scrolled HOME source reads #home.scrollTop, not window.scrollY', () => {
    const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));
    const { env, doc } = mkGhostEnv(500);
    // home→books: an in-flow home source going to browse builds an outgoing app-ghost.
    const c = Swipe.buildConstruction({ v: 'home' }, { v: 'books' }, env);
    assert.ok(c.capture, 'fixture: home→books builds an app-ghost with a capture');
    assert.equal(c.capture.ghostY, 500,
      'the ghost offset SOURCE for a HOME source must be #home.scrollTop (500), not window.scrollY (0) — the Loki 500px jump-to-top source');
    // The same offset is carried by the whole-clone content-translate (translateY(-offset)).
    const clone = doc.querySelector('.nav-ghost').firstElementChild;
    assert.equal(clone.style.transform, 'translateY(-500px)',
      'the app-ghost clone must be content-translated by -#home.scrollTop so it shows home at its own scroll, not home-at-top');
  });

// ─────────────────────────────────────────────────────────────────────────────────────────
// HOMEFIXED (§6 / §3, SOURCE-TEXT) — the active #home is a position:fixed own-scroll view. This
// is the second enforcing test named by the PL-swipe-6i-home-fixed-ownscroll policy-ledger entry.
//
// RED AT HEAD (confirmed): the base `#home { ... }` rule is `will-change: transform` only — the
// active #home is an IN-FLOW document-scroll view (position:fixed + overflow-y:auto live only on
// #home.parked). MUTATION: the #home base rule stays in-flow (no position:fixed / overflow-y) →
// this reddens.
//
// A source-text assertion (an EC §4.10 SOURCE_TEXT gate, not a behavioural one — jsdom does no
// layout, so the own-scroll geometry has no runtime effect to observe). Targets the ACTIVE #home
// rule specifically, NOT #home.parked (which already carries position:fixed at HEAD).
// ─────────────────────────────────────────────────────────────────────────────────────────
test('HOMEFIXED — the active #home rule is a position:fixed own-scroll view (source)', () => {
    const css = fs.readFileSync(path.join(ROOT, 'css', 'app.css'), 'utf8');
    // The ACTIVE #home rule: `#home {` NOT followed by `.parked`/`.hidden`/other qualifiers.
    const m = css.match(/#home\s*\{([^}]*)\}/);
    assert.ok(m, 'an active `#home { ... }` rule must exist in css/app.css');
    const body = m[1];
    assert.match(body, /position\s*:\s*fixed/,
      'the active #home must be position:fixed (a fixed own-scroll view laid out against the viewport), not in-flow');
    assert.match(body, /overflow-y\s*:\s*auto/,
      'the active #home must be an overflow-y:auto own scroller sized to its dynamic carousel content');
  });

// The former STABLEHEIGHT cell (PLAN-stableheight-probe.md §3/§5/§7, Charpy FORGE) pinned
// `.app` min-height on →home as a revertable discriminator of the Books→Home flash. It is
// REMOVED: PLAN-browse-decouple.md §7 supersedes PLAN-stableheight-probe.md (the
// discriminator answered YES — the delta was the driver) and retires the pin entirely
// (js/nav.js setView). The permanent replacement is PINGONE in test/browse-decouple.test.js,
// which asserts the OPPOSITE — going to home from a scrolled browse never pins
// `appEl.style.minHeight` — because a fixed #browse can no longer collapse the document.
