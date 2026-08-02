// PLAN-parked-page-rides-home.md §8 — CI cell 2 (DRAGREACHBOUNDED) and the dimension-8 assertion
// (NOPARKONHOME). Authored red-first by the test author (2026-08-02) from the RATIFIED plan, at
// HEAD 04739c9, BEFORE the one-declaration build. Companion note:
// Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md.
//
// BOTH CELLS ARE GREEN@HEAD GATES, and that is the correct shape rather than a relaxation of
// red-first. Neither asserts the fix; each pins a FACT THE FIX'S FLOOR IS DERIVED FROM, and both
// facts are true at HEAD. The red-first cell for this plan is PARKOUTOFREACH's arithmetic, in
// test/parked-page-rides-home-css.test.js. This file's teeth are its mutants:
//   DRAGREACHBOUNDED   GREEN@HEAD, GATE — killed by mutation PARKDRAG (the drag clamp removed).
//   NOPARKONHOME       GREEN@HEAD, GATE — killed by mutation PARKNOHOME (the home branch of
//                      renderDestination also renders browse content).
//
// ⛔ SCOPE, honestly. jsdom has no layout. Every assertion below reads an inline `style.transform`
// STRING or a class-state fact — never a resolved box, never a rect, never that anything is
// visible. The geometry claim is the real-engine oracle's
// (Claude/Curie/parked-page-rides-home-oracle.probe.js), deliberately outside `npm test`, because
// a jsdom cell asserting `right <= 0` passes on an all-zero rect and could not fail.
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
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
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

/**
 * Record every inline `style.transform` WRITE on one element, tagged with the phase the test was
 * driving at the time. Shadows the accessor on the element's own style object — the same recipe
 * test/swipe-declone-stage2-browse.test.js uses for scrollTop.
 *
 * Interception rather than sampling, deliberately: start() and the first live move() both write
 * inside ONE touchmove dispatch, so a test that sampled between calls would see only the last of
 * them and could not witness the start() writer at all.
 */
function watchTransform(el) {
  const style = el.style;
  let desc = null;
  for (let p = Object.getPrototypeOf(style); p && !desc; p = Object.getPrototypeOf(p)) {
    desc = Object.getOwnPropertyDescriptor(p, 'transform');
  }
  assert.ok(desc && desc.set && desc.get,
    'could not intercept style.transform — this cell would observe nothing and pass vacuously');
  const rec = { writes: [], phase: 'before' };
  Object.defineProperty(style, 'transform', {
    get() { return desc.get.call(style); },
    set(v) { rec.writes.push({ phase: rec.phase, value: String(v) }); desc.set.call(style, v); },
    configurable: true,
  });
  rec.stop = () => { delete style.transform; };
  return rec;
}

/** The px magnitude of a `translateX(Npx)` write, or null for a clear / a non-translateX value. */
function txPx(value) {
  const m = /translateX\(\s*(-?\d+(?:\.\d+)?)px\s*\)/i.exec(value);
  return m ? Number(m[1]) : null;
}

/**
 * Land on HOME with a browse descriptor on the FWD stack, so a right-edge forward swipe from home
 * is a home->browse transition — the transition that expresses the defect. Commit a Books->Home
 * back-swipe, which is what pushes books onto fwdStack (`fwdStack.push(navStack.pop())`). Same
 * recipe as test/swipe-declone-stage1.test.js.
 */
async function onHomeWithBooksForward(h) {
  await settle(h);
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  const row = addRow(h);
  h.touch.start(10, 300, row);
  h.touch.move(80, 302); await realSleep(12);
  h.touch.move(300, 304); await realSleep(12);
  h.touch.move(700, 306); await realSleep(12);
  h.touch.move(950, 308); await realSleep(12);
  h.touch.end(980, 308);
  await settle(h); await h.clock.advance(700); await settle(h);
  assert.ok(/commit back books→home/.test(settles(h).at(-1) || ''),
    `fixture sanity: the back-swipe must have committed Books->Home, leaving fwdStack top = books — `
    + `got ${settles(h).at(-1)}`);
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// DRAGREACHBOUNDED — GREEN @HEAD, GATE (integration, real entry point). Plan §8 CI cell 2.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. No transform any swipe writes on #browse exceeds ±w from the origin, so the floor's
// FIRST TERM — `max |displacement of #browse| = 100vw` — is a fact about the code and not only
// about the plan.
//
// WHY IT EXISTS. Without it, PARKOUTOFREACH's floor has a term nobody re-derives: a later
// filmstrip change (a mover base beyond ±w, a second concurrent mover, a dropped clamp) would
// re-enter reach with the constant untouched and every gate green. The two cells together are the
// structural form of the fix — the constant alone is a value; the constant plus the bound is a law.
//
// THE OVER-DRAG IS THE POINT. The finger is driven well past the viewport width, so the clamp is
// the only thing keeping the write inside ±w. A gesture that stays inside the viewport would pass
// this cell with the clamp deleted.
test('DRAGREACHBOUNDED [GATE] — every inline transform a forward home->browse swipe writes on '
  + '#browse stays within ±w, across start, the moves and the settle, even on a hard over-drag', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onHomeWithBooksForward(h);
    const w = h.window.innerWidth;
    assert.ok(w > 0, `fixture sanity: the harness viewport must have a width — got ${w}`);

    const browse = h.$('browse');
    const rec = watchTransform(browse);
    try {
      const rx = w - 2;
      rec.phase = 'start+first-move';
      h.touch.start(rx, 300, h.$('home'));
      h.touch.move(rx - 80, 302);                       // crosses the 8px lock -> start() then move()
      await realSleep(12);
      assert.ok(/^start fwd home→books/.test(starts(h).at(-1) || ''),
        `fixture sanity: the live gesture must be the forward home->browse — got ${starts(h).at(-1)}`);

      rec.phase = 'move';
      h.touch.move(-(w + 200), 304); await realSleep(12);      // past the left edge
      h.touch.move(-(2 * w + 500), 306); await realSleep(12);  // ~3.5 viewports of over-drag

      rec.phase = 'settle';
      h.touch.end(-(2 * w + 500), 306);
      await settle(h); await h.clock.advance(700); await settle(h);

      // ── ANTI-VACUITY. A cell that observed an untouched element passes perfectly.
      const moved = rec.writes.filter((r) => txPx(r.value) !== null);
      assert.ok(moved.length > 0,
        'no translateX was written on #browse at all — the gesture never went live and this cell '
        + `would be asserting a bound on the empty set. Writes seen: ${JSON.stringify(rec.writes)}`);
      assert.ok(moved.some((r) => Math.abs(txPx(r.value)) > 0),
        'every write on #browse was translateX(0px) — the drag never displaced it, so "within ±w" '
        + 'is satisfied by a gesture that did nothing');
      // All THREE writers must be represented, or the bound is pinned against one of them only.
      for (const phase of ['start+first-move', 'move', 'settle']) {
        assert.ok(moved.some((r) => r.phase === phase),
          `no #browse transform was written during the ${phase} phase — the bound must cover all `
          + 'three writers (start js/app.js:630, move :651, settle :690), not whichever one this '
          + `fixture happens to reach. Writes: ${JSON.stringify(rec.writes)}`);
      }
      // start() writes the incoming mover's BASE before any finger displacement — the first write
      // of the lock-crossing dispatch. Naming it proves the phase attribution above is real.
      const first = moved.find((r) => r.phase === 'start+first-move');
      assert.equal(Math.abs(txPx(first.value)), w,
        'the first write of the lock-crossing dispatch is start()\'s park of the incoming mover at '
        + `its base (±w) — got ${first.value}, so the phase attribution is not what it claims`);

      // ── THE BOUND.
      const over = moved.filter((r) => Math.abs(txPx(r.value)) > w)
        .map((r) => `[${r.phase}] ${r.value} — |${txPx(r.value)}| > w=${w}`);
      assert.deepEqual(over, [], 'the swipe wrote a #browse displacement beyond ±w. The park '
        + 'distance is derived from `max |displacement of #browse| = 100vw` (js/app.js:505 d.w = '
        + 'innerWidth; :558/:602 base ∈ {0, ±d.w}; :649 the clamp; :690 the settle writes 0 or ±w), '
        + 'so a write outside that range makes PARKOUTOFREACH\'s floor a number rather than a '
        + `bound — and a parked page re-enters the viewport with every CSS gate green:\n  ${over.join('\n  ')}`);
    } finally { rec.stop(); }
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// NOPARKONHOME — GREEN @HEAD, GATE (integration). Plan §8 dimension 8, invariant I10.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM, in the SCOPED form the plan states (I10, narrowed by its F11): a gesture's own
// destination render parks no page when the destination is not a browse page. `renderDestination`
// reaches `showPage` only through its 'browse-page' and 'browse-host' branches; the 'home' branch
// (js/app.js:585) merely un-parks #home.
//
// WHY IT IS LOAD-BEARING. This is what exempts the two OUTGOING-side transitions (browse->home,
// browse->overlay) from the overlap arithmetic. The plan's original exemption was an arithmetic
// one and was WRONG BY A SIGN — on a back gesture the outgoing #browse travels 0 -> +w, sliding
// RIGHT, which would put a parked page's right edge at +0.99w. The arithmetic exemption was
// withdrawn and re-based on this invariant, which nothing gated. This cell is that gate.
//
// ⚠️ THE SAMPLE THAT DISCRIMINATES IS THE MID-DRAG ONE. Measured, before this cell was written:
// under the mutant both cached pages carry `.parked` from the first live move through mid-drag,
// and `endHold` clears them again by the time the gesture finalizes. A cell that sampled only
// after finalize would be green under the mutant — a fourth equivalent witness for this same
// invariant, after the three the plan's review rounds already found and discarded.
//
// ⛔ NOT ASSERTED HERE: the universal "a gesture parks a page only when its destination is a
// browse page". That claims more than the mechanism supports — a button nav during the settle
// window reaches showPage by a different route and CAN park pages while a browse->home gesture is
// still settling (plan R7, executed by the adversary). That path is covered by the floor, not by
// this invariant, and this cell does not pretend otherwise.

/** Cache key of a page element, read from the real page cache rather than a data attribute. */
function keyOfPage(h, el) {
  for (const [k, e] of h.Browse._test.pageCache) if (e.el === el) return k;
  return '(uncached)';
}
const parkedKeys = (h) => [...h.document.querySelectorAll('.browsepage')]
  .filter((p) => p.classList.contains('parked')).map((p) => keyOfPage(h, p));

/**
 * Home is the penultimate nav entry AND two browse pages are cached, one of them away — the
 * plan's dimension-1 precondition (a warm page cache is what makes this defect expressible; a
 * cold app never shows it). Tapping home BETWEEN the two browse tabs is what keeps navStack's
 * penultimate entry = home, so a left-edge back-swipe is browse->home rather than browse->browse.
 */
async function booksOverHomeWithAuthorsCached(h) {
  await settle(h);
  h.tap('.navbtn[data-nav="authors"]'); await settle(h);
  h.tap('.navbtn[data-nav="home"]'); await settle(h);
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
}

test('NOPARKONHOME [GATE] — a browse->home gesture leaves no .browsepage carrying .parked at any '
  + 'point: at drag start, mid-drag, or after finalize', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true, books: bigBooks(40) });
  try {
    await booksOverHomeWithAuthorsCached(h);

    // ── ANTI-VACUITY (plan dimension 1). "No page is parked" is satisfied perfectly by a fixture
    // with no cached pages at all, or with only the shown one.
    const cached = [...h.Browse._test.pageCache.keys()];
    assert.ok(cached.length >= 2, 'fixture sanity: at least TWO browse pages must be cached — with '
      + 'one page (or none) there is nothing showPage could park and this cell asserts the absence '
      + `of something that could never occur. Cached: ${JSON.stringify(cached)}`);
    const away = [...h.document.querySelectorAll('.browsepage')].filter((p) => p.classList.contains('hidden'));
    assert.ok(away.length >= 1, 'fixture sanity: at least one cached page must be AWAY — the defect '
      + 'needs a cached non-destination page, which is why the user\'s repro visits a second list '
      + 'first and why a cold app never shows it');

    const samples = [];
    const row = addRow(h);
    h.touch.start(10, 300, row);                 // left-edge grab -> back
    await realSleep(12);
    samples.push(['at touchstart (armed)', parkedKeys(h)]);

    h.touch.move(120, 302);                      // crosses the lock -> start() -> renderDestination
    await realSleep(12);
    assert.ok(/^start back books→home/.test(starts(h).at(-1) || ''),
      `fixture sanity: the live gesture must be browse->home — got ${starts(h).at(-1)}`);
    samples.push(['after start()', parkedKeys(h)]);

    h.touch.move(400, 304); await realSleep(12);
    samples.push(['mid-drag', parkedKeys(h)]);

    h.touch.move(60, 306); await realSleep(12);
    h.touch.end(10, 306);
    await settle(h); await h.clock.advance(700); await settle(h);
    samples.push(['after finalize', parkedKeys(h)]);

    const bad = samples.filter(([, keys]) => keys.length > 0).map(([when, keys]) => `${when}: ${JSON.stringify(keys)}`);
    assert.deepEqual(bad, [], 'a browse->home gesture parked a browse page. `renderDestination`\'s '
      + 'home branch (js/app.js:585) must not reach showAppView -> Browse.render -> showPage: that '
      + 'is what exempts the two outgoing-side transitions from the overlap arithmetic, and the '
      + 'arithmetic exemption it replaced was wrong by a sign (on a back gesture the outgoing '
      + '#browse travels 0 -> +w, which would put a parked page\'s right edge at +0.99w). With the '
      + `park expressed in #browse's coordinate space, a page parked here rides the outgoing view:\n  ${bad.join('\n  ')}`);
  } finally { h.dispose(); }
});

// ⭐ THE INSTRUMENT'S OWN WITNESS. "No page carries .parked" is satisfied just as well by a broken
// selector, an empty page set, or a build where nothing parks anything ever — none of which the
// cell above can tell apart from the invariant holding. This half proves the observable is LIVE in
// the very same fixture: a browse->browse gesture, where parking is the designed behaviour, does
// park a page mid-drag. Without it the gate above is unfalsifiable by construction.
test('NOPARKONHOME anti-vacuity — the same fixture DOES show a parked page mid-drag on a '
  + 'browse->browse gesture, so the negative claim is about the transition, not the instrument', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true, books: bigBooks(40) });
  try {
    await settle(h);
    h.tap('.navbtn[data-nav="authors"]'); await settle(h);
    h.tap('.navbtn[data-nav="books"]'); await settle(h);      // authors UNDER books -> browse->browse

    const row = addRow(h);
    h.touch.start(10, 300, row);
    await realSleep(12);
    h.touch.move(120, 302); await realSleep(12);
    assert.ok(/^start back books→authors/.test(starts(h).at(-1) || ''),
      `fixture sanity: the live gesture must be browse->browse — got ${starts(h).at(-1)}`);

    assert.ok(parkedKeys(h).length > 0,
      'a browse->browse drag must park at least one page mid-drag — showPage parks every cached '
      + 'page that is not the shown one while a hold is live (js/browse.js:338-342). If this is '
      + 'empty, the parked-page observable is dead and the NOPARKONHOME gate above is vacuous');

    h.touch.move(60, 304); await realSleep(12);
    h.touch.end(10, 306);
    await settle(h); await h.clock.advance(700); await settle(h);
  } finally { h.dispose(); }
});
