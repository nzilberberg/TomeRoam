// Screen-state tests (js/nav.js), driven against the REAL index.html (see
// test/dom-fixture.js for why a hand-rolled DOM would be worthless here).
//
// This is the code that could not be tested before the extraction: it lived inside
// app.js's IIFE, and BOTH `.106` (the forward slide-in exposed the base view because
// setView hid the hub synchronously) and `.107` (the back button flashed) shipped
// from here past a fully green suite. These pin the visibility invariants those bugs
// violated — each one fails if the rule is reverted.
const { test } = require('node:test');
const assert = require('node:assert');
const { appDom } = require('./dom-fixture.js');

const dom = appDom();
global.window = dom.window;
global.document = dom.window.document;
global.window.scrollTo = () => {};          // jsdom doesn't implement it; we assert classes, not pixels

const Nav = require('../js/nav.js');
const $ = (id) => document.getElementById(id);
const hidden = (id) => $(id).classList.contains('hidden');
const rendered = [];                        // what Nav asked to be re-rendered
let browseHides = 0;                         // Browse.deactivate() calls
let browseHiddenAtDeactivate = null;         // was #browse already display:none when it fired?

Nav.init({
  byId: $,
  isSignedIn: () => true,
  updatePlayerUI: () => {},
  renderScreen: (v) => rendered.push('screen:' + v),
  renderNowPlaying: () => rendered.push('np'),
  renderBrowse: (d) => rendered.push('browse:' + d.v),
  currentDesc: () => ({ v: 'options' }),
  browseWillHide: () => { browseHides++; browseHiddenAtDeactivate = hidden('browse'); },
});

test('a sub-screen HIDES the Options hub (peer screens, PLAN-one-screen-type.md Stage A1)', () => {
  // The hub and its sub-screens are peers: showing one hides the other five,
  // including the hub — the co-visibility build .106's comment used to bless is
  // exactly the defect this inverted assertion now forbids.
  Nav.applyScreen({ v: 'downloads' });
  assert.equal(hidden('downloads'), false, 'the sub-screen must show');
  assert.equal(hidden('options'), true, 'the hub must be hidden while its sub is shown');
  assert.equal(hidden('nowplaying'), true);
  for (const s of Nav.SETTINGS_SUBS) if (s !== 'downloads') assert.equal(hidden(s), true, s + ' should be hidden');
});

test('a sub-screen keeps the Options nav tab lit (you are "inside Options")', () => {
  Nav.applyScreen({ v: 'general' });
  assert.ok(document.querySelector('#navbar [data-nav="options"].active'));
});

test('the hub itself hides every sub-screen', () => {
  Nav.applyScreen({ v: 'options' });
  assert.equal(hidden('options'), false);
  for (const s of Nav.SETTINGS_SUBS) assert.equal(hidden(s), true, s + ' should be hidden on the hub');
});

test('leaving for Home releases every settings overlay and un-parks Home', () => {
  Nav.applyScreen({ v: 'downloads' });
  Nav.applyScreen({ v: 'home' });
  assert.equal(hidden('options'), true, 'the hub must not linger over Home');
  for (const s of Nav.SETTINGS_SUBS) assert.equal(hidden(s), true);
  assert.equal($('home').classList.contains('parked'), false);
  // Stage 6i (PLAN-swipe-noswap-home.md) RETIRES the home-scoped `home-tall` toggle:
  // active #home becomes a position:fixed own-scroll view, and the fixed navbar seats off
  // the RETAINED css:73 `.app` runway (a device-owed seating check, R1(b)) — there is no
  // longer a `body.home-tall` class for this layer to assert.
});

// RETIRED AT STAGE A1b (PLAN-one-screen-type.md §5.3, §6a class), the same casualty class as
// test/one-screen-type.test.js's NPUNTOUCHED class-state cells: A1b deletes the `if (!npOpen)`
// settings-loop guard, so entering Now Playing now HIDES the settings screen it opened over,
// exactly as entering any other screen does — the opposite of what this cell asserted. Its
// subject moves to NPPARKS (test/one-screen-type-npparks.test.js, "entering Now Playing from a
// settings screen hides that screen too"), which asserts the new truth over the same elements.
test('Now Playing hides the settings overlay it opened over, like any other screen (Stage A1b — subject in NPPARKS)', () => {
  Nav.applyScreen({ v: 'options' });
  Nav.applyScreen({ v: 'nowplaying' });
  assert.equal(hidden('nowplaying'), false);
  assert.equal(hidden('options'), true, 'NP now parks/hides what is beneath it like every other screen');
  assert.ok(document.body.classList.contains('np-locked'));
});

test('browse parks Home (painted, not display:none — covers stay decoded)', () => {
  Nav.applyScreen({ v: 'books' });
  assert.equal(hidden('browse'), false);
  assert.ok($('home').classList.contains('parked'));
  // (the home-scoped `home-tall` toggle is retired in Stage 6i — no body class to assert here)
});

test('applyScreen renders the destination, and render:false reconciles visibility only', () => {
  rendered.length = 0;
  Nav.applyScreen({ v: 'buffering' });
  assert.deepEqual(rendered, ['screen:buffering']);
  rendered.length = 0;
  Nav.applyScreen({ v: 'buffering' }, { render: false });   // the swipe's commit path
  assert.deepEqual(rendered, [], 'a second render would re-load images = the post-settle flash');
});

test('resetSwipeStyles clears inline transforms off every screen', () => {
  $('options').style.transform = 'translateX(50px)';
  $('downloads').style.transition = 'transform .2s';
  Nav.resetSwipeStyles();
  assert.equal($('options').style.transform, '');
  assert.equal($('downloads').style.transition, '');
});

test('element resolvers agree with the real DOM', () => {
  assert.equal(Nav.overlayEl('buffering'), $('buffering'));
  assert.ok(Nav.isOverlay('general') && Nav.isOverlay('options') && Nav.isOverlay('nowplaying'));
  assert.ok(!Nav.isOverlay('home') && !Nav.isOverlay('books'));
  assert.equal(Nav.viewElFor('nowplaying'), null, 'NP does not slide via viewElFor');
  assert.equal(Nav.viewElFor('books'), $('browse'));
  assert.equal(Nav.viewElFor('home'), $('home'));
});

test('leaving Browse for Home deactivates the Browse controller BEFORE hiding it (finding: hidden-page SWR corrupts the anchor)', () => {
  Nav.applyScreen({ v: 'books' });          // Browse shown
  assert.equal(hidden('browse'), false);
  browseHides = 0; browseHiddenAtDeactivate = null;
  Nav.applyScreen({ v: 'home' });           // leave to Home → #browse gets .hidden
  assert.equal(hidden('browse'), true);
  assert.equal(browseHides, 1, 'Browse.deactivate must fire on the shown→hidden edge');
  assert.equal(browseHiddenAtDeactivate, false, 'it must fire BEFORE display:none lands, so the anchor captures real geometry');
  // Idempotent: Home→Home (already hidden) must not re-deactivate.
  browseHides = 0;
  Nav.applyScreen({ v: 'home' });
  assert.equal(browseHides, 0, 'no deactivate when Browse was already hidden');
});
