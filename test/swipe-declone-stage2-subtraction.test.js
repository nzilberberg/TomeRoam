// SUBTRACTION PASS (declone stage 2, step 11) — the integration cells from
// PLAN-swipe-declone-stage2-subtraction.md §10, authored red-first by the test author
// (2026-08-05) BEFORE the subtraction lands. Companion note:
// Claude/Curie/RED-swipe-declone-stage2-subtraction.md.
//
// WHAT THIS PASS DOES, and why its Coverage Model is inverted. The pass DELETES: twelve source
// items whose reachability has been argued, plus §5's orphan-recovery collapse. A deletion
// cannot be mutation-tested — there is no code left to mutate — so for each item exactly one of
// three things is true: an existing cell already witnesses the behaviour that SURVIVES; the
// deletion is textual and a source-scan gate holds it (test/retired-concepts-purge.test.js); or
// nothing witnesses it and that is a named risk. No cell here merely asserts that code is
// absent.
//
// THE THREE CELLS IN THIS FILE, and what each is for.
//   MOVERSHAPE      the L3 adapter's mover shape — the one CONTRACT change in the pass. Red at
//                   HEAD (the adapter still maps the retired ownership key).
//   RECOVERYPARITY  the collapsed leftover-state recovery does exactly what the surviving
//                   branch did before the collapse, on every entry route that still exists —
//                   including reaching the pill sweep, which after the collapse it can only do
//                   through the screen application.
//   DESTROYEDMOVER  a gesture whose movers are destroyed mid-drag still settles and releases.
//                   Closes coverage-audit finding M1; the ruling is that no guard is added and
//                   the CELL is what was owed (plan §7, §13 decision 4).
//
// ⚠️ SCOPE, honestly. jsdom has no layout, no paint and no scroll anchoring, so every assertion
// here is a source fact, a key-set fact, a class-state fact, a call-count/ordering fact or a
// DOM-identity fact — never a rendered geometry. `window.scrollY` is pinned at 0 unless a test
// sets it, so the scroll assertions pin WHETHER a restore was issued, never WHICH coordinate.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// REAL wall clock, captured before boot() patches setTimeout: move() resamples velocity only
// after >8ms of REAL time, and synthetic moves fired back-to-back otherwise leave vx holding
// the outward flick (the standing swipe-suite discipline).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const hardResets = (h) => swipeLog(h).filter((m) => /leftover state on begin/.test(m));
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const renders = (h) => h.log.calls.filter((c) => c.name === 'browse.render').map((c) => c.args[0]);
const scrollCalls = (h) => h.log.calls.filter((c) => c.name === 'window.scrollTo');
const pillFloats = (h) => h.document.querySelectorAll('.np-pill-float').length;
const sess = (h) => h.window.PBSwipeSession();
/** Indices into the SHARED ordered call log — the only way to assert cross-fake ordering. */
const orderOf = (h, name, from = 0) => h.log.calls.findIndex((c, i) => i >= from && c.name === name);

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}
/** Authors over Books — a left-edge back-swipe is Authors->Books (browse->browse). */
async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="authors"]'); await settle(h);
}
/** Options over Books — a left-edge back-swipe is Options->Books (overlay->browse, pane-less). */
async function onOptionsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="options"]'); await settle(h);
}
/** Drive a gesture live (past the 8px lock, horizontal). Returns the touch target. */
async function goLive(h, target) {
  const row = target || addRow(h);
  h.touch.start(10, 300, row);
  await realSleep(12);
  h.touch.move(120, 302);   // horizontal, past the lock -> start() runs
  return row;
}
/** Drop a transient Now Playing pill clone into the document, as npPillClone does. */
function addPillFloat(h) {
  const pill = h.document.createElement('div');
  pill.className = 'np-pill-float';
  h.document.body.appendChild(pill);
  return pill;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// MOVERSHAPE — the production mover the L3 adapter records carries the element reference and
// the base offset and NO third key, so a dropped or an orphaned key cannot ship silently.
// Plan §10 MOVERSHAPE / §6 Rule R / §4 D12.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// WHY A NEW CELL RATHER THAN A MIGRATED ONE. There is no key-completeness cell to migrate: the
// `F1a-L3` cell that pinned `toMover`'s key set was deleted at step 10
// (test/swipe-stage5-residuals.test.js retains only its retirement note), on the correct ground
// that its fixture required a built pane. Its layer is chosen accordingly — the app harness
// over a REAL gesture, because the fake-env construction layer never executes the adapter
// mapping at all.
//
// ⛔ HONEST SCOPE, and it is a ROUTED FINDING, not a silent narrowing. §10 specifies "assert the
// recorded mover key set equals exactly the two-key set by deep comparison". The recorded
// movers live on the gesture session (`d.movers`) and NOTHING observes them: the only
// production observer, `window.PBSwipeSession()`, reports `{id, dragging}` and nothing else, and
// an object literal's key creation cannot be trapped from outside (a literal uses
// [[DefineOwnProperty]], which no prototype setter sees). So the exact key set is not
// constructible at this layer without a production change, which this pass forbids.
//
// WHAT IS ASSERTED INSTEAD, stated as exactly what it is: the set of SEAM FIELDS the adapter
// READS, captured by handing the real `start()` a Construction whose movers expose their real
// values through recording accessors. It is 1:1 with the produced key set for every shape the
// plan names — the adapter reads `ownership` if and only if it emits `own`, and reads `slot` if
// and only if it computes `base` — and a build that read a field and discarded it would pass.
// The `base` half is additionally covered BEHAVIOURALLY below, where a dropped base offset
// writes a non-numeric transform onto a real element.
//
// This wraps `Swipe.buildConstruction` and delegates to the real one, so the classification,
// the resolution and the destination render are all still production; only the mover objects
// handed to the adapter are re-wrapped, with their real values.
function recordAdapterReads() {
  const Swipe = global.Swipe;
  const realBuild = Swipe.buildConstruction;
  const reads = [];
  Swipe.buildConstruction = function (from, dest, env) {
    const c = realBuild.call(Swipe, from, dest, env);
    const wrap = (m, slotName) => {
      if (!m) return m;
      const seen = new Set();
      const proxy = {};
      for (const k of Object.keys(m)) {
        Object.defineProperty(proxy, k, {
          get() { seen.add(k); return m[k]; },
          enumerable: true, configurable: true,
        });
      }
      reads.push({ slot: slotName, seen });
      return proxy;
    };
    return Object.assign({}, c, {
      movers: {
        outgoing: wrap(c.movers.outgoing, 'outgoing'),
        incoming: wrap(c.movers.incoming, 'incoming'),
        decoration: wrap(c.movers.decoration, 'decoration'),
      },
    });
  };
  return { reads, restore() { Swipe.buildConstruction = realBuild; } };
}

test('MOVERSHAPE — the L3 adapter consumes exactly the element reference and the slot (no ownership read), on a real gesture', async () => {
  const h = boot({ fakeTimers: true });
  const spy = recordAdapterReads();
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);                                  // a real browse->browse drag: start() runs the adapter
    assert.ok(starts(h).length > 0, 'fixture sanity: the gesture went live and start() ran the adapter');
    assert.ok(spy.reads.length >= 2,
      `fixture sanity: the adapter must have mapped both view movers; got ${spy.reads.length}`);

    for (const r of spy.reads) {
      assert.deepEqual([...r.seen].sort(), ['element', 'slot'],
        `the L3 adapter must map exactly { el, base } from each seam mover's element and slot. `
        + `Reading \`ownership\` means it still emits the \`own\` key — a field with NO reader after `
        + `the pass (the four \`.own\` readers go with the pane teardown, and no gate asserts over `
        + `it), so it ships as a dead field on the session. Dropping the \`slot\` read means the `
        + `base offset is gone and the incoming mover has no offset. slot=${r.slot} `
        + `read=${JSON.stringify([...r.seen].sort())}`);
    }
  } finally { spy.restore(); h.dispose(); }
});

test('MOVERSHAPE — the base offset reaches the real transform: every mover carries a NUMERIC translateX mid-drag', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    await realSleep(12);
    h.touch.move(160, 302);   // a second live move, so every mover has been written at least once

    const moved = [...h.document.querySelectorAll('.browsepage, #home, #browse, .np-pill-float')]
      .map((el) => el.style.transform).filter((t) => t);
    assert.ok(moved.length > 0, 'fixture sanity: the drag wrote at least one inline transform');
    for (const t of moved) {
      assert.match(t, /^translateX\(-?\d+(\.\d+)?px\)$/,
        'the mover base offset is a NUMBER the drag adds its delta to. An adapter that dropped '
        + `the base key writes translateX(NaNpx) and the page never leaves the viewport: got "${t}"`);
    }
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════
// RECOVERYPARITY — the collapsed leftover-state recovery does exactly what the surviving
// branch did before the collapse, for EVERY entry route that still exists.
// Plan §10 RECOVERYPARITY / §5 / §9.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// WHAT THE COLLAPSE DOES. `begin()`'s recovery entry predicate loses its `.nav-ghost` disjunct
// (§4 D9), which is the ONLY route on which the recovered handle `cur = d || session` was ever
// null. Three expressions written to serve that null case become constant, and with them the
// explicit style-reset call goes — deletable ONLY because the very next line's screen
// application reaches the same reset as its FIRST statement.
//
// ⛔ THE DANGER IS ONE-DIRECTIONAL AND THIS CELL IS ITS WITNESS. If the deleted disjunct were
// reachable after all, the collapsed form changes `resetScroll` from default-true to false on
// that path — a live behaviour change on the exact axis this campaign has already shipped a
// defect on. The reachability claim is held structurally by NOGHOSTCLASS
// (test/retired-concepts-purge.test.js); what THIS cell holds is that the surviving routes
// still behave as they did.
//
// THE THREE ROUTES, and why each is a distinct state rather than three spellings of one:
//   (1) a mid-drag second touch          — `d` is live; the successor supersedes a DRAGGING owner
//   (2) a settling session superseded    — `d` is null, `finishing && session`; the owner is past
//       before finalize                    finger-up and still animating
//   (3) a live drag interrupted by a     — `d` is live, but a screen application has ALREADY run
//       nav tap, then a second touch       under the gesture and cleared its transforms
//
// The `resetScroll:false` witness lives on route 1, which is driven from an OVERLAY source:
// for a browse source `applyScreen` performs no scroll reset at all, so the flag is
// unobservable there. That is stated rather than left as an uneven-looking cell.

/** Everything the recovery must do, measured across ONE recovery touchstart. */
function recoveryProbe(h) {
  const base = { renders: renders(h).length, scrolls: scrollCalls(h).length, calls: h.log.calls.length,
    hardResets: hardResets(h).length };
  return {
    assertParity(label) {
      assert.ok(hardResets(h).length > base.hardResets,
        `fixture: the ${label} route must actually trip the recovery`);
      assert.equal(renders(h).length, base.renders,
        `${label}: the recovery restores the source screen with NO re-render. Since the declone no `
        + 'transition overwrites its source, so there is never any source CONTENT to rebuild; a '
        + `render here would mean the source HAD been clobbered. renders=${JSON.stringify(renders(h).slice(base.renders))}`);
      assert.equal(scrollCalls(h).length - base.scrolls, 1,
        `${label}: the session-start document scroll is restored EXACTLY ONCE. Zero means the `
        + 'restore was dropped and the user is left at the destination scroll; more than one means '
        + 'the screen application stomped it and something wrote it back.');
      const iScroll = orderOf(h, 'window.scrollTo', base.calls);
      const iHold = orderOf(h, 'browse.endHold', base.calls);
      assert.ok(iScroll >= 0 && iHold >= 0,
        `${label}: fixture — both the scroll restore and the hold release must occur`);
      assert.ok(iScroll < iHold,
        `${label}: the row hold is released AFTER the screen is applied. The scroll restore is the `
        + 'statement immediately after the screen application, so it is the observable landmark for '
        + 'that ordering. Releasing the hold first deactivates a suspended virtualized source and '
        + 'dematerializes its kept rows before the screen has landed — an executed counterexample.');
    },
  };
}

test('RECOVERYPARITY.mid-drag — a second touch during a live drag restores the source without a re-render, restores the scroll once, and releases the hold last', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onOptionsOverBooks(h);                 // overlay source: the resetScroll flag is observable
    await goLive(h, h.$('options'));
    h.$('options').scrollTop = 50;               // a source panel scrolled away from top

    const probe = recoveryProbe(h);
    h.touch.start(10, 300, addRow(h));           // the superseding touch -> begin()'s recovery
    probe.assertParity('mid-drag');

    assert.equal(h.$('options').scrollTop, 50,
      'the recovery forces resetScroll:false so the screen application cannot stomp the explicit '
      + 'session-start scroll restore that follows it. Passing the default (true) instead resets '
      + 'the source panel to top — the orphan-path parity the collapsed call must NOT inherit.');
  } finally { h.dispose(); }
});

test('RECOVERYPARITY.settling — a session superseded after finger-up but before finalize takes the same recovery', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    await realSleep(12);
    h.touch.end(160, 302);                       // finger-up: `finishing` is set, `d` is nulled,
                                                 // the session is still the live pane-less owner
    assert.equal(settles(h).length, 0, 'fixture: the settle has not finalized yet — no clock advance');

    const probe = recoveryProbe(h);
    h.touch.start(10, 300, addRow(h));           // supersede the SETTLING session
    probe.assertParity('settling');
  } finally { h.dispose(); }
});

test('RECOVERYPARITY.nav-interrupted — a live drag whose transforms a nav tap already cleared still takes the same recovery', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    h.tap('.navbtn[data-nav="authors"]');        // a real nav mid-drag: applyScreen runs under the gesture
    await settle(h);

    const probe = recoveryProbe(h);
    h.touch.start(10, 300, addRow(h));
    probe.assertParity('nav-interrupted');
  } finally { h.dispose(); }
});

// ── RECOVERYPARITY.pillswept — ITS OWN NAMED TEST, deliberately ─────────────────────────
//
// WHY IT IS SPLIT OUT (plan §13 decision 13). The mutation sweep reports a killing TEST, not a
// killing assertion, so a multi-assertion cell cannot attribute a kill. The mutant this
// assertion exists for — the screen application removed from the recovery — also reddens the
// parity assertions above, so without the split the sweep could not show that THIS witness
// fires.
//
// WHY THE WITNESS IS OWED AT ALL. `js/nav.js`'s `.np-pill-float` sweep is the only sweeper of
// the one owned resource the swipe still creates. After §5 deletes the explicit style-reset
// call, the recovery reaches that sweep through the screen application and through nothing
// else. The cell that used to witness this on the recovery path is deleted with its stated
// rationale (the ownership filter), so the behaviour it witnessed is re-homed here rather than
// dropped — losing a witness in the same commit that removes the code guaranteeing the
// behaviour is the shape this whole campaign was opened by.
//
// ⛔ NOT a substitute for, and not substituted by, PILLSWEPT
// (test/swipe-declone-stage2-reset.test.js): that cell drives the reset DIRECTLY at the unit
// layer and says nothing about whether the recovery reaches it. The two are the pair.
test('RECOVERYPARITY.pillswept — the recovery still reaches the style reset: a pill float present at its start is gone at its end', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    const pill = addPillFloat(h);
    assert.equal(pillFloats(h), 1, 'fixture: a transient pill clone is present when the recovery begins');

    const hr0 = hardResets(h).length;
    h.touch.start(10, 300, addRow(h));
    assert.ok(hardResets(h).length > hr0, 'fixture: the supersession tripped the recovery');

    assert.ok(!pill.isConnected && pillFloats(h) === 0,
      'the recovery must still reach Nav.resetSwipeStyles, whose FIRST statement inside the screen '
      + 'application is the sweep. After the explicit reset call is deleted the screen application '
      + 'is the SINGLE path to it, so a recovery that stops applying the screen leaks a floating '
      + `pill clone with nothing left to remove it. pill floats=${pillFloats(h)}`);
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════
// DESTROYEDMOVER — a gesture whose movers are destroyed mid-drag still settles, leaves no
// element carrying an inline transform, and releases the session.
// Plan §10 DESTROYEDMOVER / §7 M1 / §13 decision 4. Closes coverage-audit finding M1.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// THE INVARIANT IS ALREADY THIS PROJECT'S, and the ruling is that NO GUARD IS ADDED: a gesture
// must settle even when the DOM it started on is destroyed mid-drag — the gesture does not own
// that node and must not depend on it (test/swipe-gesture.test.js's destroyed-touch-target
// cell). The declone WIDENED the set of destructible non-owned nodes from {touch target} to
// {touch target, outgoing mover, incoming mover}, because both view movers are now borrowed
// real elements. The correct response is to widen the CELL, which is what this is; the shipped
// code already satisfies it.
//
// THREE ROUTES, one per way a mover is destroyed or cleared mid-gesture. They are three
// coordinates of one cell, not three spellings of one route: two DESTROY the movers (the
// destination-render and cache paths), and the third CLEARS their transforms while they
// survive — which is the only one on which a surviving page's transform can be observed at all,
// and therefore the one that carries the registered mutant.
//
// ⚠️ The sibling cell in test/swipe-gesture.test.js is NOT merged into this one: collapsing the
// touch-target coordinate into the mover coordinate would lose one of the two.

test('DESTROYEDMOVER.cacheclear — a browse->browse gesture whose page movers are destroyed by a cache clear still settles and releases', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    assert.ok(starts(h).length > 0, 'fixture: the gesture went live and resolved both movers');
    const pagesBefore = h.document.querySelectorAll('.browsepage').length;
    assert.ok(pagesBefore > 0, 'fixture: the browse->browse pair resolved real .browsepage movers');

    h.Browse.clearCache();                       // exactly what the reconnect handler does, mid-gesture
    await realSleep(12);
    h.touch.end(160, 302);
    await h.clock.advance(400);                  // past the settle and the 340ms finalize fallback
    await settle(h);

    assert.ok(settles(h).length > 0,
      'the gesture must SETTLE even though both of its movers were destroyed mid-drag. It does not '
      + 'own those nodes; a settle that depended on them would strand `finishing` and wedge every '
      + 'future swipe.');
    const stuck = [...h.document.querySelectorAll('*')].filter((el) => el.style && el.style.transform);
    assert.deepEqual(stuck.map((el) => el.id || el.className), [],
      'no surviving element may keep an inline transform after the settle');
    assert.equal(sess(h), null,
      'the session must be RELEASED, so the next touch does not trip the leftover-state hard reset');
  } finally { h.dispose(); }
});

test('DESTROYEDMOVER.containerwipe — the same holds when the whole browse container is wiped instead', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    assert.ok(starts(h).length > 0, 'fixture: the gesture went live');

    h.Browse.reset();                            // the container wipe (sign-out's route), mid-gesture
    await realSleep(12);
    h.touch.end(160, 302);
    await h.clock.advance(400);
    await settle(h);

    assert.ok(settles(h).length > 0, 'a wiped container must not prevent the settle');
    assert.equal(sess(h), null, 'the session must be released after a container wipe too');
  } finally { h.dispose(); }
});

test('DESTROYEDMOVER.midscreen — a mid-gesture screen application clears every page mover transform, leaving nothing stuck', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    const stampedBefore = [...h.document.querySelectorAll('.browsepage')].filter((p) => p.style.transform);
    assert.ok(stampedBefore.length > 0,
      'fixture: the live browse->browse drag stamped an inline transform on at least one page mover — '
      + 'without this the assertion below would be satisfied by there being nothing to clear');

    h.tap('.navbtn[data-nav="authors"]');        // a real nav tap mid-drag -> applyScreen with rendering
    await settle(h);

    const stuck = [...h.document.querySelectorAll('.browsepage')].filter((p) => p.style.transform);
    assert.deepEqual(stuck.map((p) => p.dataset.key || p.className), [],
      'the style reset must clear EVERY `.browsepage`, not only the elements that carry an id. A page '
      + 'is a borrowed mover carrying no id, so an id-keyed list cannot reach it and a gesture '
      + 'interrupted here would leave a page stuck at translateX(±w) — the "erratic after a while" '
      + 'class the reset exists to prevent.');

    await realSleep(12);
    h.touch.end(160, 302);
    await h.clock.advance(400);
    await settle(h);
    assert.equal(sess(h), null, 'the interrupted gesture still releases its session');
  } finally { h.dispose(); }
});
