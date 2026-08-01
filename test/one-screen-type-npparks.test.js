// STAGE A1b of PLAN-one-screen-type.md — NPPARKS, the UNIT half of the Stage-A1b RED suite.
// Authored red-first by the test author (2026-07-31) from the plan's §14 Coverage Model and §5.3
// design, BEFORE the Stage-A1b build (red-first TDD law, Claude/Decisions/DecisionLog.md).
// The integration half is test/one-screen-type-npreconcile.test.js; the relocated PEERFINALIZE
// edge-3 cell is in test/one-screen-type-finalize.test.js. Companion note:
// Claude/Curie/RED-one-screen-type-a1b.md. Plan step 7; the build is step 8.
//
// WHAT STAGE A1b CHANGES (plan §5.3). js/nav.js setView() carries two `if (!npOpen)` guards —
// js/nav.js:51 around the park-and-hide block and js/nav.js:78 around the six-way settings
// visibility loop. A1b deletes BOTH, so entering Now Playing parks #home, hides #browse and hides
// all six settings screens exactly as entering any other screen does. Nothing else changes: the
// `npOpen` variable, the `hidden` toggle on #nowplaying (js/nav.js:81) and the `np-locked` body
// toggle (js/nav.js:82) all stay.
//
// ⛔ NOW PLAYING STAYS UNIQUE (the user's decision, Claude/Decisions/DecisionLog.md). A1b removes
// the PARKING EXEMPTION and nothing else. NP keeps its own background, its `inset: 0`, its
// `z-index: 60` and its coverage of the topbar and the transport. Not one assertion below touches
// any of those — NPUNTOUCHED's source-scan cell (test/one-screen-type.test.js) is their standing
// guard and is unaffected by this stage.
//
// WHY IT MATTERS (plan §5.3.1). Because setView('nowplaying') parks nothing and hides nothing at
// HEAD, an ABORTED Now Playing gesture never puts back what the mid-drag render un-hid: each
// aborted NP swipe leaves one more screen un-hidden and they accumulate. That is the mechanism
// behind the photographed three-plus-screens render. This cell pins the entry state; the
// accumulation across aborts is NPRECONCILE's.
//
// ⚠️ SKIP-PENDING-BUILD. Every cell below is authored RED against current HEAD and is committed
// `{ skip: SKIP }` so the pre-commit battery stays green (the hook runs the whole suite; a
// plain-red cell would block the commit and the project does not use --no-verify). Each was
// CONFIRMED RED with the skip removed — the exact failure per cell is recorded in
// Claude/Curie/RED-one-screen-type-a1b.md. The builder REMOVES the skip to drive them red, then
// builds to green. Do NOT weaken an assertion to green a cell.
//
// ⛔ SCOPE, honestly. jsdom has no layout, no paint, no compositing and no stacking. EVERY
// assertion below is class state, a call count or a call ordering. NOT ONE asserts that fewer
// screens are VISIBLE, that Now Playing COVERS anything, or that the stack no longer shows
// through — those are stacking and paint, and such a cell could not fail here and would be a
// false witness. The outcome the user reported (no longer seeing three screens at once) is
// DEVICE-OWED and is plan step 9's job, not CI's.
const { test } = require('node:test');
const assert = require('node:assert');
const { appDom } = require('./dom-fixture.js');

const SKIP = 'red-first Stage A1b — remove skip to run; the builder greens '
  + '(Claude/Curie/RED-one-screen-type-a1b.md)';

// ⚠️ SEPARATE FILE FROM THE HARNESS CELLS, DELIBERATELY. test/app-harness.js's boot() replaces
// global.window / global.document with its own JSDOM and closes it on dispose(), while these unit
// cells drive the js/nav.js singleton against the module-level fixture document (js/nav.js reads
// `document` as a bare global). Mixing the two in one process leaves whichever runs second
// pointed at a torn-down DOM — the measured artefact recorded at the head of
// test/one-screen-type.test.js. One process each keeps every red honest.
const dom = appDom();
global.window = dom.window;
global.document = dom.window.document;
global.window.scrollTo = () => {};   // jsdom does not implement it; we assert classes, not pixels

const Nav = require('../js/nav.js');
const $ = (id) => document.getElementById(id);
const hidden = (id) => $(id).classList.contains('hidden');
const parked = (id) => $(id).classList.contains('parked');

// A recording browseWillHide dep, the shape test/nav.test.js and test/one-screen-type.test.js
// already implement: it records not only THAT the hook fired but the #browse hidden state AT THE
// MOMENT it fired — which is the whole ordering invariant (a hidden box measures zero, so
// Browse's virtual controller must capture its scroll anchor from real geometry BEFORE
// display:none lands).
const hook = { calls: 0, hiddenWhenCalled: [] };
const resetHook = () => { hook.calls = 0; hook.hiddenWhenCalled.length = 0; };

Nav.init({
  byId: $,
  isSignedIn: () => true,
  updatePlayerUI: () => {},
  renderScreen: () => {},
  renderNowPlaying: () => {},
  renderBrowse: () => {},
  currentDesc: () => ({ v: 'nowplaying' }),
  browseWillHide: () => { hook.calls++; hook.hiddenWhenCalled.push(hidden('browse')); },
});

const SIX = ['options', ...Nav.SETTINGS_SUBS];
const unhiddenOfSix = () => SIX.filter((s) => !hidden(s));

// ═══════════════════════════════════════════════════════════════════════════════════════
// NPPARKS (unit, nav screen-state against the real index fixture)
//
// THE CELL (plan §14). Entering Now Playing parks #home, hides #browse and hides all six settings
// screens exactly as entering any other screen does, and fires the browse deactivation hook once
// on the shown→hidden edge while #browse is still un-hidden. Driven from all three entry sources
// the plan names — from Browse, from a settings screen, and from Home — because the three guards
// different halves of the change: the browse edge is plan §9 edge 4, the settings source is the
// half the ratified-mark supersession turns on (§5.3, probe §9.1), and the home source is the
// only one that isolates the park toggle (entering from Browse leaves #home already parked, so
// that source cannot see it).
//
// RED AT HEAD: js/nav.js:51 and js/nav.js:78 both guard on `if (!npOpen)`, so
// setView('nowplaying') parks nothing, hides nothing and fires no hook.
// ═══════════════════════════════════════════════════════════════════════════════════════
test('NPPARKS — entering Now Playing from Browse hides #browse and fires browseWillHide once, '
  + 'while #browse was still un-hidden (plan §9 edge 4)', { skip: SKIP }, () => {
  Nav.applyScreen({ v: 'books' });
  assert.equal(hidden('browse'), false, 'fixture sanity: #browse is shown on Books');
  assert.equal(parked('home'), true, 'fixture sanity: Books parks #home');
  assert.deepEqual(unhiddenOfSix(), [],
    'fixture sanity: Books leaves all six settings screens hidden (Stage A1)');
  resetHook();

  Nav.applyScreen({ v: 'nowplaying' });

  assert.equal(hidden('nowplaying'), false, 'Now Playing must be the shown screen');
  assert.equal(hidden('browse'), true,
    'entering Now Playing must HIDE #browse — NP is the last screen still exempt from parking '
    + 'and hiding what is under it, and that exemption is what lets an aborted NP gesture leave '
    + 'screens un-hidden to accumulate underneath (plan §5.3.1)');
  assert.equal(parked('home'), true,
    'and #home must be parked, exactly as entering any other screen parks it');
  assert.equal(hook.calls, 1,
    'Browse.deactivate must fire exactly once on the browse→NowPlaying shown→hidden edge — this '
    + 'edge does not exist at HEAD and is plan §9 edge 4');
  assert.deepEqual(hook.hiddenWhenCalled, [false],
    'observed at the moment it ran: #browse must still be un-hidden, so the virtual controller '
    + 'captures its scroll anchor from real geometry before display:none lands');
});

test('NPPARKS — entering Now Playing from a settings screen hides that screen too',
  { skip: SKIP }, () => {
    Nav.applyScreen({ v: 'options' });
    assert.deepEqual(unhiddenOfSix(), ['options'],
      'fixture sanity: the hub is the one shown settings screen');
    resetHook();

    Nav.applyScreen({ v: 'nowplaying' });

    assert.deepEqual(unhiddenOfSix(), [],
      'entering Now Playing must hide ALL SIX settings screens. The retained exemption at '
      + 'js/nav.js:78 kept whichever settings screen was showing mounted underneath, on the '
      + 'stated ground that the NP-back reveal needs it — a reason refuted at its root: `hidden` '
      + 'is ADDED to #nowplaying in exactly one place (js/nav.js:81) and the same synchronous '
      + 'setView body un-hides the destination three lines earlier (js/nav.js:78-80), so the '
      + 'destination is mounted at the instant NP is hidden on every path (plan §5.3, probe §9.1)');
    assert.equal(hidden('nowplaying'), false, 'Now Playing must be the shown screen');
    assert.equal(parked('home'), true, 'and #home must be parked');
    assert.equal(hidden('browse'), true, 'and #browse must be hidden');
    assert.equal(hook.calls, 0,
      'and no deactivation fires on this source: entering the settings screen already hid '
      + '#browse, so js/nav.js:55\'s shown→hidden edge test is false');
  });

test('NPPARKS — entering Now Playing from Home parks #home', { skip: SKIP }, () => {
  Nav.applyScreen({ v: 'home' });
  assert.equal(parked('home'), false, 'fixture sanity: #home is the shown screen, un-parked');
  resetHook();

  Nav.applyScreen({ v: 'nowplaying' });

  assert.equal(parked('home'), true,
    'entering Now Playing must PARK #home. This is the source that isolates the park toggle — '
    + 'entering from Browse or from a settings screen leaves #home already parked, so neither '
    + 'can see it. An un-parked #home under NP is the state an aborted NP→home swipe makes '
    + 'permanent at HEAD (plan §5.3.1 step 1)');
  assert.equal(hidden('nowplaying'), false, 'Now Playing must be the shown screen');
  assert.equal(hidden('browse'), true, 'and #browse must be hidden');
  assert.deepEqual(unhiddenOfSix(), [], 'and all six settings screens hidden');
  assert.ok(document.body.classList.contains('np-locked'),
    'and the np-locked hook must still be set — A1b deletes two conditions and nothing else');
});
