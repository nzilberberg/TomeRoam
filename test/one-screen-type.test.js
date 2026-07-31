// STAGE A1 of PLAN-one-screen-type.md — the UNIT half of the RED suite, authored red-first by
// the test author (2026-07-30) from the plan's §14 Coverage Model, BEFORE the Stage-A1 build
// (red-first TDD law, Claude/Decisions/DecisionLog.md). The gesture-finalize half is
// test/one-screen-type-finalize.test.js; the page-background cell is NOSETTINGSBG in
// test/page-bg-single-painter.test.js. Companion note: Claude/Curie/RED-one-screen-type.md.
//
// WHAT STAGE A1 CHANGES (plan §5.1). js/nav.js setView's park-and-hide guard narrows from
// `if (!npOpen && !optOpen && !subOpen)` to `if (!npOpen)`, so entering a settings screen parks
// #home and hides #browse exactly as entering Browse does; and the two-line settings visibility
// block (js/nav.js:83-84 — the line that deliberately keeps the Options hub MOUNTED under its own
// sub-screen) collapses to one six-way loop that can never leave two settings screens un-hidden.
// css/app.css loses `background: var(--page-bg)` from #options and from the five-sub group.
//
// ⛔ THE HARD CONSTRAINT THESE CELLS EXIST TO ENFORCE (plan §8 ordering 5). Commit 6c9e7e3
// ALREADY parked #home/#browse and removed BOTH backgrounds, and was reverted (2700b5c) because
// the hub and its sub rendered through each other, statically. The park was never the missing
// piece — js/nav.js:83 was. So the background deletion is safe ONLY in a commit that also
// collapses the visibility block. ONEPAGE is the cell that carries that dependency: it reads
// nothing whatever about backgrounds, so a build with both backgrounds gone and the hub still
// mounted under its sub — commit 6c9e7e3 exactly — leaves it RED.
//
// CELL MAP (plan §14). This file: ONEPAGE, PEERPARK, NPUNTOUCHED.
//   ONEPAGE       unit         applying any of the six settings screens leaves EXACTLY ONE of the
//                              six without `.hidden`, and it is the applied one — the hub
//                              included. NATURAL mutant: restore the hub-stays-mounted rule.
//   PEERPARK      unit         entering a settings screen parks #home and hides #browse, and the
//                              browseWillHide hook fires exactly once on the shown→hidden edge,
//                              observed while #browse was still un-hidden. TWO mutants.
//   NPUNTOUCHED   unit+source  applying Now Playing leaves whichever settings screen was showing
//                              exactly as it was (the NP-back reveal), and .nowplaying keeps its
//                              inset, its z-index and its background. ⚠️ PRESERVATION cell —
//                              GREEN at HEAD by construction; see the note on the cell.
//
// ⚠️ WHY THE GESTURE CELLS ARE IN A SEPARATE FILE. test/app-harness.js's boot() replaces
// global.window / global.document with its own JSDOM and closes it on dispose(), while these unit
// cells drive the js/nav.js singleton against the module-level fixture document (js/nav.js reads
// `document` as a bare global for body.classList and querySelectorAll). Mixing the two in one
// process leaves whichever runs second pointed at a torn-down DOM — MEASURED: the NPUNTOUCHED
// cells failed with "Cannot read properties of null" once a boot() cell ran first, which is a
// harness artefact and not the defect the cell is for. One process each keeps every red honest.
//
// ⛔ SCOPE, honestly. jsdom has no layout, paint, font boosting or scroll anchoring. NOT ONE
// assertion here concerns geometry, stacking, paint order or whether anything is visually
// occluded — every one is source text, class state, call count or call ordering. A cell asserting
// that a settings screen occludes what is behind it, or that removing a z-index does not flash,
// COULD NOT FAIL here and would be a false witness. Those are the plan's §15 device rows
// (R-A's residual, R-B, R-C, R-E, R-F, R-G) and stay device-owed.
const { test } = require('node:test');
const assert = require('node:assert');
const { appDom, readRoot } = require('./dom-fixture.js');

// The declaration body {..} of the rule whose exact (whitespace-normalized) selector list matches
// `selector`, or null. Same shape as test/page-bg-single-painter.test.js's helper, re-stated here
// rather than imported: requiring that file would EXECUTE its tests inside this process.
function ruleBody(css, selector) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1].trim().replace(/\s+/g, ' ') === selector) return m[2];
  }
  return null;
}

// SKIPPED-PENDING-BUILD. The pre-commit battery (tools/hooks/run-checks.mjs) runs the whole suite
// and blocks on any plain failure, and this project does not use --no-verify. So every cell whose
// behaviour does not exist yet is committed skipped, keeping the committed suite green, and each
// was CONFIRMED RED with the skip removed — the run and its failure text are quoted in
// Claude/Curie/RED-one-screen-type.md. ⭐ THE BUILDER REMOVES `{ skip: SKIP }` on each cell to
// drive it red, then builds to green. No assertion is weakened to green a cell.
const SKIP = 'skipped-pending-build (Stage A1) — remove the skip to drive this cell red';

const dom = appDom();
global.window = dom.window;
global.document = dom.window.document;
global.window.scrollTo = () => {};   // jsdom does not implement it; we assert classes, not pixels

const Nav = require('../js/nav.js');
const $ = (id) => document.getElementById(id);
const hidden = (id) => $(id).classList.contains('hidden');

// A recording browseWillHide dep, the shape test/nav.test.js already implements: it records not
// only THAT the hook fired but the #browse hidden state AT THE MOMENT it fired — which is the
// whole ordering invariant (a hidden box measures zero, so Browse's virtual controller must
// capture its scroll anchor from real geometry BEFORE display:none lands).
const hook = { calls: 0, hiddenWhenCalled: [] };
Nav.init({
  byId: $,
  isSignedIn: () => true,
  updatePlayerUI: () => {},
  renderScreen: () => {},
  renderNowPlaying: () => {},
  renderBrowse: () => {},
  currentDesc: () => ({ v: 'options' }),
  browseWillHide: () => { hook.calls++; hook.hiddenWhenCalled.push(hidden('browse')); },
});

const SIX = ['options', ...Nav.SETTINGS_SUBS];
const unhiddenOfSix = () => SIX.filter((s) => !hidden(s));

// ═══════════════════════════════════════════════════════════════════════════════════════
// ONEPAGE (unit, nav screen-state against the real index fixture)
//
// THE CELL. At rest exactly one of the six settings screens is without `.hidden`, and it is the
// one that was applied — INCLUDING the hub under its own sub-screen. This is invariant S1 at the
// scope the mechanism actually delivers (plan §5.1, the review's F4): the six-way loop decides
// all six in ONE operation, so it can never leave two un-hidden. It deliberately does NOT claim a
// universal — Nav.overlayFilmstrip (js/nav.js:180) and env.renderDestination (js/app.js:536)
// un-hide a second settings screen without consulting the loop, which is intended behaviour for
// the duration of a live filmstrip (both panes must be on screen for a filmstrip to exist) and is
// the adversary's notch (plan §16.4), not this cell's. The reported defect was STATIC
// co-visibility, so driving applyScreen is the correct scope for it.
//
// RED AT HEAD: js/nav.js:83 keeps #options un-hidden whenever a sub is applied, so applying any
// of the five subs leaves TWO of the six without `.hidden`.
// ═══════════════════════════════════════════════════════════════════════════════════════
test('ONEPAGE — applying any settings screen leaves EXACTLY ONE of the six un-hidden, and it is '
  + 'the applied one (the hub does not stay mounted under its own sub-screen)',
{ skip: SKIP }, () => {
  const wrong = [];
  for (const v of SIX) {
    Nav.applyScreen({ v });
    const shown = unhiddenOfSix();
    if (shown.length !== 1 || shown[0] !== v) {
      wrong.push(`applying '${v}' left [${shown.join(', ')}] un-hidden`);
    }
  }
  assert.deepEqual(wrong, [],
    'a settings screen is a PEER, not an additive overlay: showing one must hide the other five, '
    + 'the hub included. Two settings screens un-hidden at rest IS the reported defect — the '
    + 'Options hub and the General sub-screen rendered through each other, statically, with no '
    + 'gesture in flight. Failures:\n  ' + wrong.join('\n  '));
});

// (The complementary "leaving for a non-settings screen releases all six" case is deliberately
// NOT restated here — test/nav.test.js's 'leaving for Home releases every settings overlay and
// un-parks Home' already asserts exactly that, and it stays true through A1. A second copy of a
// live contract is the staleness class this plan's §1 records three times.)

// ═══════════════════════════════════════════════════════════════════════════════════════
// PEERPARK (unit, nav screen-state against the real index fixture)
//
// THE CELL. Entering a settings screen is a SCREEN SWITCH (invariant S3): it parks #home and
// hides #browse through the code path `browse` and `home` already use, INCLUDING the
// d.browseWillHide() edge call — and that call happens BEFORE `.hidden` lands on #browse. This is
// the plan's §9 browseWillHide edge 1 (button-nav browse→settings); edges 2 and 3 are on
// gesture-finalize paths and are driven in test/one-screen-type-finalize.test.js.
//
// RED AT HEAD: the park-and-hide guard (js/nav.js:56) exempts 'options' and every sub, so
// entering a settings screen parks nothing, hides nothing and fires no hook.
// ═══════════════════════════════════════════════════════════════════════════════════════
test('PEERPARK — entering a settings screen parks #home and hides #browse exactly as entering '
  + 'Browse does', { skip: SKIP }, () => {
  Nav.applyScreen({ v: 'books' });
  assert.equal(hidden('browse'), false, 'fixture sanity: #browse is shown on Books');
  assert.equal($('home').classList.contains('parked'), true, 'fixture sanity: Books parks #home');

  Nav.applyScreen({ v: 'options' });
  assert.equal($('home').classList.contains('parked'), true,
    'entering a settings screen must leave #home PARKED — nothing live may remain behind a '
    + 'screen that no longer paints a background of its own (invariant S3)');
  assert.equal(hidden('browse'), true,
    'entering a settings screen must HIDE #browse — the settings screen is a peer, not an '
    + 'overlay painted over a live, un-parked page');
});

test('PEERPARK — browseWillHide fires exactly once on the browse→settings shown→hidden edge, '
  + 'and fires BEFORE .hidden lands on #browse', { skip: SKIP }, () => {
  Nav.applyScreen({ v: 'books' });
  hook.calls = 0; hook.hiddenWhenCalled.length = 0;

  Nav.applyScreen({ v: 'options' });
  assert.equal(hook.calls, 1,
    'Browse.deactivate must fire exactly once on the browse→settings edge — this edge does not '
    + 'exist at HEAD and is the first of the three the plan enumerates in §9');
  assert.deepEqual(hook.hiddenWhenCalled, [false],
    'it must fire while #browse is still un-hidden: a hidden box measures zero, so the virtual '
    + 'controller captures its scroll anchor from real geometry only if the hook runs BEFORE '
    + 'display:none lands');

  // Idempotent: settings→settings must not re-deactivate an already-hidden Browse.
  hook.calls = 0;
  Nav.applyScreen({ v: 'general' });
  assert.equal(hook.calls, 0, 'no deactivate when #browse was already hidden');
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// NPUNTOUCHED (unit + source scan)
//
// ⚠️ THIS IS A PRESERVATION CELL, AND IT IS GREEN AT HEAD BY CONSTRUCTION — deliberately, and it
// is committed UNSKIPPED. It exists to prove Now Playing STAYS untouched: invariant S4, and the
// settled scope boundary that .nowplaying is out of scope. There is no honest way to make it red
// at HEAD, because every property it asserts is already true and must REMAIN true; an assertion
// contrived to fail today would be asserting something the plan forbids changing. Its ability to
// fail is therefore carried by its registered MUTANT (tools/mutate.mjs, "one-screen-type
// NPUNTOUCHED"), which is CONFIRMED to redden it — evidence of the same kind, obtained the same
// way, as a red. The confirmation is recorded in Claude/Curie/RED-one-screen-type.md.
//
// WHAT IT GUARDS. js/nav.js:82's `if (!npOpen)` guard is the mechanism of the NP-back reveal: it
// leaves whichever settings screen was showing exactly as it was, so closing NP finds it again.
// After A1 that guard wraps a loop which already handles all six screens correctly, so a reader
// who finds it undocumented sees a guard with no visible purpose — and the obvious simplification
// deletes it and silently breaks the reveal (plan §12 item 12, the review's F3). This cell is
// what catches that edit; the retained source comment is what stops it being attempted.
// ═══════════════════════════════════════════════════════════════════════════════════════
test('NPUNTOUCHED — applying Now Playing leaves the settings screen that was showing exactly '
  + 'as it was, for the NP-back reveal', () => {
  Nav.applyScreen({ v: 'options' });
  assert.equal(hidden('options'), false, 'fixture sanity: the hub is showing');

  Nav.applyScreen({ v: 'nowplaying' });
  assert.equal(hidden('nowplaying'), false, 'Now Playing must be shown');
  assert.equal(hidden('options'), false,
    'Now Playing must NOT disturb the settings screen it opened over — that screen is what the '
    + 'NP-back reveal filmstrips back to. The `if (!npOpen)` guard in setView IS this mechanism; '
    + 'deleting it as a redundant wrapper around the six-way loop silently breaks the reveal');
  assert.ok(document.body.classList.contains('np-locked'),
    'and the np-locked hook must still be set');
});

test('NPUNTOUCHED — applying Now Playing over a settings SUB-screen leaves that sub showing', () => {
  Nav.applyScreen({ v: 'general' });
  Nav.applyScreen({ v: 'nowplaying' });
  assert.equal(hidden('general'), false,
    'the sub-screen Now Playing opened over must stay mounted for the back-reveal');
});

test('NPUNTOUCHED — the .nowplaying rule still declares its own inset, z-index and background '
  + '(source)', () => {
  const css = readRoot('css/app.css').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const body = ruleBody(css, '.nowplaying');
  assert.ok(body != null, 'fixture: a `.nowplaying` rule must exist in css/app.css');
  assert.match(body, /(?:^|;)\s*position\s*:\s*fixed\s*;/,
    'Now Playing keeps its own fixed box — no stage touches it (invariant S4)');
  assert.match(body, /(?:^|;)\s*inset\s*:\s*0\s*;/, 'Now Playing keeps `inset: 0`');
  assert.match(body, /(?:^|;)\s*z-index\s*:\s*60\s*;/,
    'Now Playing keeps its own stacking — Stage A2 deletes the settings z-indexes ONLY');
  assert.match(body, /(?:^|;)\s*background\s*:\s*var\(--page-bg\)\s*;/,
    'Now Playing is the ONE screen that keeps a page background (invariant S2). It is the '
    + 'deliberate exception, and the whole point of the settings-screen deletions is that they '
    + 'are not it');
});
