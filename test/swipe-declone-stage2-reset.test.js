// STAGE 2 of PLAN-swipe-declone.md — the RESETCOVERSPAGES cell from the plan's §14 Coverage
// Model, authored red-first by the test author (2026-08-01) from the FORGED plan
// (Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r4.md), BEFORE the Stage-2 build. Plan §13
// step 9; the build is step 10. Companion note: Claude/Curie/RED-swipe-declone-stage2.md.
//
// THE DEFECT THIS CELL FORBIDS (plan §5.3.4, round-1 SF1). `Nav.resetSwipeStyles` clears the
// inline transform/transition/will-change/z-index the swipe writes, from a FIXED LIST OF IDS plus
// the nav pill (js/nav.js:104-110). At HEAD that list is complete, because browse->browse's
// outgoing mover is an owned pane that is removed wholesale. Stage 2 makes a `.browsepage` a
// BORROWED mover for the first time, and no `.browsepage` carries an id (js/browse.js:494-495) —
// so a gesture interrupted before the settle path's own clear (js/app.js:816) leaves a page stuck
// at translateX(±w) with nothing in the app able to reset it. That is the "erratic after a while"
// class the comment at js/nav.js:90-103 says this reset exists to prevent.
//
// ⛔ SCOPE, honestly. This asserts which elements have their inline style CLEARED. It says nothing
// about whether a page is visible, where it sits, or what a stuck page looks like — jsdom has no
// layout. The user-visible failure is device-owed (plan §15 R7, step 10b).
//
// It runs against the REAL index.html and the REAL js/nav.js (dom-fixture doctrine: a hand-rolled
// DOM encodes the author's assumptions and reproduces the author's bugs).
const { test } = require('node:test');
const assert = require('node:assert');
const { appDom } = require('./dom-fixture.js');

const dom = appDom();
global.window = dom.window;
global.document = dom.window.document;
global.window.scrollTo = () => {};

const Nav = require('../js/nav.js');
const $ = (id) => document.getElementById(id);

Nav.init({
  byId: $,
  isSignedIn: () => true,
  updatePlayerUI: () => {},
  renderScreen: () => {},
  renderNowPlaying: () => {},
  renderBrowse: () => {},
  currentDesc: () => ({ v: 'books' }),
  browseWillHide: () => {},
});


/** Write the exact four properties the swipe writes, so the reset has something real to clear. */
function stampSwipeStyles(el) {
  el.style.transform = 'translateX(-390px)';
  el.style.transition = 'transform .2s ease';
  el.style.willChange = 'transform';
  el.style.zIndex = '30';
}
const stillStamped = (el) => ['transform', 'transition', 'willChange', 'zIndex']
  .filter((p) => el.style[p] !== '');

test('RESETCOVERSPAGES — the swipe style reset clears every .browsepage, not only the elements '
  + 'that carry an id', () => {
  const host = $('browse');
  assert.ok(host, 'fixture sanity: index.html ships the #browse host');

  // Two pages, exactly as js/browse.js builds them: a bare `.browsepage` div appended to the
  // host, carrying NO id. Two rather than one, because the reset must cover the whole set —
  // a build that clears only `activeEntry()`'s page still strands the outgoing mover.
  const pages = [0, 1].map(() => {
    const p = document.createElement('div');
    p.className = 'browsepage';
    host.appendChild(p);
    return p;
  });
  try {
    for (const p of pages) {
      assert.equal(p.id, '', 'fixture sanity: a browse page carries no id — that is why the '
        + 'id-keyed reset list misses it');
      stampSwipeStyles(p);
    }
    // The id-carrying views are stamped too, so a build that widens the reset by REPLACING the
    // id list rather than adding to it reddens here instead of silently regressing four shipped
    // transitions.
    const idViews = ['home', 'browse', 'options', 'nowplaying', ...Nav.SETTINGS_SUBS]
      .map((id) => $(id)).filter(Boolean);
    assert.ok(idViews.length >= 7, `fixture sanity: stamped the id-resolved views (${idViews.length})`);
    for (const el of idViews) stampSwipeStyles(el);

    Nav.resetSwipeStyles();

    const strandedViews = idViews.filter((el) => stillStamped(el).length)
      .map((el) => `#${el.id}: ${stillStamped(el).join(', ')}`);
    assert.deepEqual(strandedViews, [], 'the id-resolved views must STILL be cleared — widening the '
      + `reset must be additive, never a replacement:\n  ${strandedViews.join('\n  ')}`);

    const strandedPages = pages
      .map((p, i) => (stillStamped(p).length ? `.browsepage[${i}]: ${stillStamped(p).join(', ')}` : null))
      .filter(Boolean);
    assert.deepEqual(strandedPages, [], 'RED @HEAD: resetSwipeStyles clears a FIXED LIST OF IDS '
      + '(js/nav.js:107) and a .browsepage has none, so an interrupted browse->browse gesture leaves '
      + `a page stuck off-viewport with nothing able to reset it:\n  ${strandedPages.join('\n  ')}`);
  } finally { for (const p of pages) p.remove(); }
});
