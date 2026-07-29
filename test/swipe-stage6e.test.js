// STAGE 6e of PLAN-swipe-reveal.md (sub-plan Claude/Plans/PLAN-swipe-stage6e.md) — the RED
// suite for the owner-driven emergency disposal `disposeOwnedPanes(session, reason)` (the
// F(dispose) half of the pane-lifecycle interface). Derived cell-by-cell from that plan's §7
// Coverage Model and §8 coverage/mutation matrix, authored red-first before disposeOwnedPanes
// exists (js/app.js) and before the begin()-recovery owned branch is redirected to it. See
// Claude/Curie/RED-swipe-stage6e.md.
//
// WHAT 6e CHANGES. At the ONE site that disposes an OWNED pane by supersession today — the
// begin()-recovery of a live pane-owning DRAGGING drag (app.js:415-418) — the DOM-global
// `.nav-ghost` sweep's owned-pane-removal effect is replaced by a typed, session-owned
// `disposeOwnedPanes(cur, 'superseded')` (removes only `cur.movers` with own==='owned-pane'),
// and the sweep is suppressed on the owned branch (keepGhosts:true) so removal is owner-driven
// and not duplicated. The ORPHAN branch (cur null) keeps the FULL sweep. It is a
// behaviour-preserving EXTRACTION (EC §4.19): the DOM outcome is byte-identical on every
// reachable state; the value is structural (owner-driven, reason-tagged disposal, closing the
// EC §4.3 "operate through whatever is global" anti-pattern for the owned case).
//
// CELL MAP (plan §8) — and why each is red-at-HEAD or parity+mutation-proven.
//   NOOP  RED @HEAD    the anti-no-op crux (Loki STRIKE-swipe-stage6e-r1 residual 1). Because
//                      Loki proved NO stray .nav-ghost is constructible, the DOM OUTCOME of the
//                      owned recovery is IDENTICAL whether the global sweep runs or not — so a
//                      pure DOM-outcome cell cannot catch a build that threads keepGhosts at
//                      neither site (or only one) and lets the sweep still do the removal,
//                      making disposeOwnedPanes a behavioural no-op. NOOP observes the MECHANISM:
//                      (a) during the owned recovery the global `.nav-ghost` sweep does NOT run
//                      at EITHER site (the explicit resetSwipeStyles at :416 AND applyScreen's
//                      internal resetSwipeStyles(opts.keepGhosts) at :417/nav.js:120), and
//                      (b) with the sweep neutralized the owned ghost is STILL removed (so the
//                      remover is disposeOwnedPanes, not the sweep). RED @HEAD: (a) the sweep
//                      runs twice; (b) with the sweep neutralized the ghost survives (HEAD has
//                      no owner-driven remover). This is the cell that makes the slice non-vacuous.
//   RSN   RED @HEAD    the disposal reason 'superseded' is recorded in the PBDebug SWIPE
//                      diagnostic when an owned pane is disposed (plan §3 item 5 / §8 RSN;
//                      labelled diagnostic per EC §4.10 — NOT a behavioural claim). RED @HEAD:
//                      no SWIPE line carries 'superseded' (disposeOwnedPanes does not exist).
//   DP    parity       driving a real pane-owning DRAGGING browse->browse supersession, the
//                      superseded owned .nav-ghost is gone and the successor arms cleanly
//                      (no leaked ghost). Byte-identical to HEAD (the sweep removes it today) —
//                      GREEN @HEAD, RED under mutation #13 (recovery disposes nothing).
//                      DP.browse-home covers the browse->home pair; Stage 6i (PLAN-swipe-
//                      noswap-home.md) retired that pair's owned home-snapshot, so it now
//                      asserts the pane-less reality instead (disposeOwnedPanes no-ops).
//   BR    parity       the Loki residual-2 INVARIANT: a borrowed-real mover is NEVER removed
//                      by the disposer. GREEN @HEAD, RED under a mutation that broadens the
//                      disposer to remove every mover (Brunel registers the built-code mutant;
//                      a manual HEAD channel-proof is recorded in Claude/Curie/RED-swipe-
//                      stage6e.md). Stage 6i retired the browse->home pair's owned
//                      home-snapshot, so BR now demonstrates the invariant on BOTH of that
//                      pair's movers (#browse and #home), which are both borrowed-real.
//   HR    parity       a leftover ORPHAN .nav-ghost with no owning session is disposed at begin()
//                      before arming, via the FULL resetSwipeStyles sweep on the cur-null branch.
//                      GREEN @HEAD, RED under mutation #13 (recovery disposes nothing).
//   DEC   parity       the owned-decoration .np-pill-float is still removed on the recovery
//                      (parity — it stays in resetSwipeStyles, unguarded by keepGhosts:true).
//                      GREEN @HEAD, RED under a manual nav.js:104 removal (Brunel registers the
//                      built-code "guard np-pill-float behind keepGhosts too" mutant per plan §9).
//   RGreveal parity    the paint-gated release() half is byte-untouched — a browse->browse ABORT
//                      still takes the HELD-reveal choreography (holdGhostUntilPaintable/drop).
//                      GREEN @HEAD, RED under mutation #54 (abortRender forced 'none' -> the
//                      held branch never fires). The flash-surface pin.
//   RGsup parity       the 6c pane-less recovery + 6d finalizationPlanFor render decision + 6c
//                      settle-phase identity guards are unchanged — reconciled BY REFERENCE to
//                      the cells that own them (block at the end; one owner per cell).
//
// RED-FIRST + PARITY, honestly (Curie dimension-10; the 6d precedent). This slice is a
// byte-identical parity extraction, so only NOOP and RSN fail against HEAD — the mechanism the
// slice EXISTS to introduce (owner-driven, reason-tagged disposal) is absent at HEAD, and those
// two observe it directly. DP/BR/HR/DEC/RGreveal assert PARITY behaviour, so forcing them red at
// HEAD would require either a consistency oracle (which cannot see wrong-but-deterministic) or an
// assertion of a behaviour change the plan says does not happen; each is instead mutation-verified
// capable of failing (recorded in Claude/Curie/RED-swipe-stage6e.md), per tests-must-be-able-to-fail.
//
// SCOPE, honestly. jsdom has no layout/paint, so nothing here speaks to the compositor flash
// (plan §10, independent of the whole rewrite). RGreveal pins that the reveal TIMING/branch is
// untouched via the observable `holds` signature, not pixels. NOOP/DP/BR/HR/DEC drive the REAL
// begin()->supersession path through the app-harness (h.touch, two touches) and observe the REAL
// DOM; RSN observes the labelled PBDebug SWIPE trace.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

// REAL wall clock, captured BEFORE boot() patches setTimeout. move() resamples velocity only
// after >8ms of REAL time; synthetic moves fired back-to-back otherwise leave vx holding the
// outward flick and an intended abort commits instead (the standing swipe-suite discipline).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const hardResets = (h) => swipeLog(h).filter((m) => /leftover state on begin/.test(m));
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const ghosts = (h) => h.document.querySelectorAll('.nav-ghost').length;
const pillFloats = (h) => h.document.querySelectorAll('.np-pill-float').length;
const sess = (h) => h.window.PBSwipeSession();
// The HELD-reveal signature (same discriminator swipe-stage6d.test.js uses): a 'hold …' FLASH
// line is emitted ONLY by holdGhostUntilPaintable at drop, from exactly the held branches.
const holds = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'FLASH' && /^hold /.test(c.args[1])).map((c) => c.args[1]);

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
/** Options over Books — a left-edge back-swipe is Options->Books (overlay->browse, pane-LESS). */
async function onOptionsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="options"]'); await settle(h);
}
/**
 * Take a live back-swipe from `startEl` to the DRAGGING phase and STOP (do not release). After
 * this the session is the pane-owning/pane-less DRAGGING owner `d` (finishing===false), the one
 * state begin()'s recovery supersedes with `cur = d`. Returns nothing; the caller then fires a
 * SECOND touchstart to supersede.
 */
async function liveDragNoRelease(h, startEl) {
  h.touch.start(10, 300, startEl);
  h.touch.move(80, 302); await realSleep(14);   // cross the 8px lock -> start() runs (mints any owned pane), live+dragging
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// NOOP — the anti-no-op crux (Loki residual 1). RED @HEAD. Two linked assertions, one cell.
// ════════════════════════════════════════════════════════════════════════════════════════════
// Loki proved (STRIKE-swipe-stage6e-r1 §6) that no stray .nav-ghost is constructible, so the
// owned recovery removes the SAME node whether the DOM-global sweep runs or disposeOwnedPanes
// does — a DOM-outcome cell (DP) cannot tell a real slice from a no-op. These two assertions
// observe the MECHANISM instead, so a build that leaves the global sweep doing the removal (by
// failing to thread keepGhosts:true at BOTH :416 and applyScreen's :417) reddens here.

test('NOOP.mechanism — the global .nav-ghost sweep does NOT run on the owned recovery branch (both :416 and applyScreen :417 suppress it)', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);                    // browse->browse available
    await liveDragNoRelease(h, addRow(h));          // A: pane-owning DRAGGING browse->browse
    assert.equal(ghosts(h), 1, 'fixture: the browse->browse drag minted exactly one owned .nav-ghost');
    assert.ok(sess(h) && sess(h).dragging === true, 'fixture: A is the mid-drag owner (cur = d on supersession)');
    const hr0 = hardResets(h).length;

    // Count EVERY document.querySelectorAll('.nav-ghost') during the supersession's recovery.
    // resetSwipeStyles (nav.js:103) is the ONLY caller of that exact selector; the .spent clear
    // uses '.nav-ghost.spent' and the recovery predicate uses querySelector (singular), so a
    // count of that exact selector is a faithful "the global sweep ran" probe.
    const realQSA = h.document.querySelectorAll.bind(h.document);
    let sweeps = 0;
    h.document.querySelectorAll = (sel) => { if (sel === '.nav-ghost') sweeps++; return realQSA(sel); };
    h.touch.start(10, 300, h.$('browse'));          // 2nd touch: supersede -> recovery (cur = d)
    h.document.querySelectorAll = realQSA;

    assert.ok(hardResets(h).length > hr0, 'fixture: the supersession tripped begin()\'s recovery');
    assert.equal(ghosts(h), 0, 'the superseded owned pane is gone after the recovery (the removal happened)');
    assert.equal(sweeps, 0,
      'RED @HEAD (the sweep runs twice — the explicit resetSwipeStyles at app.js:416 AND applyScreen\'s '
      + 'internal resetSwipeStyles(opts.keepGhosts) at app.js:417/nav.js:120). The owned branch must suppress '
      + 'the global .nav-ghost sweep at BOTH sites (keepGhosts:true) so removal is OWNER-DRIVEN via '
      + 'disposeOwnedPanes; if the sweep still runs at either site, disposeOwnedPanes is a behavioural no-op '
      + `and the slice's structural value (EC §4.3) is lost. Global sweeps during recovery=${sweeps}`);
  } finally { h.dispose(); }
});

test('NOOP.attribution — with the global sweep neutralized, the owned pane is STILL removed (disposeOwnedPanes is the remover)', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await liveDragNoRelease(h, addRow(h));
    assert.equal(ghosts(h), 1, 'fixture: one owned .nav-ghost');
    const hr0 = hardResets(h).length;

    // Neutralize the DOM-global sweep by making the exact '.nav-ghost' query return an empty
    // NodeList — the Loki/Loftus causal-attribution move: disable the claimed cause and re-run.
    // The recovery predicate uses querySelector (singular, NOT neutralized) and d is non-null, so
    // the recovery still runs; only the sweep's REMOVAL power is removed.
    const realQSA = h.document.querySelectorAll.bind(h.document);
    const emptyNL = realQSA('.nav-ghost-NONEXISTENT-attribution-probe');
    h.document.querySelectorAll = (sel) => (sel === '.nav-ghost' ? emptyNL : realQSA(sel));
    h.touch.start(10, 300, h.$('browse'));          // supersede -> recovery, sweep is dead
    h.document.querySelectorAll = realQSA;

    assert.ok(hardResets(h).length > hr0, 'fixture: the supersession tripped the recovery even with the sweep neutralized');
    assert.equal(ghosts(h), 0,
      'RED @HEAD: with the global sweep neutralized the owned ghost SURVIVES, because HEAD has no owner-driven '
      + 'remover — the recovery relies entirely on the sweep. disposeOwnedPanes must remove the owned pane '
      + 'through cur.movers (el.remove()), independent of the DOM-global query, so the pane is gone even with '
      + `the sweep dead. This positively attributes the removal to the owner. ghosts after recovery=${ghosts(h)}`);
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// RSN — the disposal reason is recorded (RED @HEAD). Labelled DIAGNOSTIC (EC §4.10), not behaviour.
// ════════════════════════════════════════════════════════════════════════════════════════════
// Plan §8 RSN / Charpy F2. The reason 'superseded' is fed to a PBDebug SWIPE trace emitted when
// an owned pane is disposed. RED @HEAD: no SWIPE line carries 'superseded'. The second assertion
// pins Charpy's PREDICTION (emit the reason ONLY when a pane is actually disposed) — a pane-less
// DRAGGING supersession disposes nothing, so no 'superseded' may appear. That second clause is
// green @HEAD (the token appears nowhere yet) and becomes load-bearing once the trace exists;
// its defending mutation is a build that emits the reason unconditionally (Brunel, plan §9).

test('RSN [DIAGNOSTIC] — an owned-pane supersession records the disposal reason "superseded", and a pane-LESS one does not', async () => {
  // (1) owned supersession -> the reason is recorded. RED @HEAD.
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await liveDragNoRelease(h, addRow(h));          // pane-owning DRAGGING browse->browse
    assert.equal(ghosts(h), 1, 'fixture: an owned pane exists to be disposed');
    h.touch.start(10, 300, h.$('browse'));          // supersede -> owned pane disposed
    assert.ok(swipeLog(h).some((m) => /superseded/i.test(m)),
      'RED @HEAD: disposing an owned pane on supersession must record reason "superseded" in the PBDebug SWIPE '
      + 'diagnostic (plan §7 retained diagnostics). No SWIPE line carries it at HEAD (disposeOwnedPanes absent). '
      + `SWIPE lines=${JSON.stringify(swipeLog(h))}`);
  } finally { h.dispose(); }

  // (2) pane-LESS supersession -> NO disposal, so NO 'superseded' reason (Charpy prediction / F2).
  const h2 = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onOptionsOverBooks(h2);
    await liveDragNoRelease(h2, h2.$('options'));    // pane-LESS DRAGGING overlay->browse
    assert.equal(ghosts(h2), 0, 'fixture: a genuinely pane-less DRAGGING session (no owned pane)');
    h2.touch.start(10, 300, h2.$('options'));        // supersede -> disposeOwnedPanes no-ops
    assert.ok(!swipeLog(h2).some((m) => /superseded/i.test(m)),
      'a pane-LESS supersession disposes nothing, so it must NOT emit a "superseded" disposal reason — the trace '
      + 'is emitted only when a pane is actually disposed (Charpy prediction). A build that emits the reason '
      + `unconditionally reddens here. SWIPE lines=${JSON.stringify(swipeLog(h2))}`);
  } finally { h2.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// DP — the owned pane is disposed on a pane-owning DRAGGING supersession; the successor arms clean.
// ════════════════════════════════════════════════════════════════════════════════════════════
// Plan §8 DP (wiring, real DOM). Parity feature oracle: GREEN @HEAD (byte-identical to today's
// sweep), RED under mutation #13 (the recovery disposes nothing -> the ghost leaks into the
// successor). browse->browse builds an owned app-ghost; browse->home (Stage 6i) builds NO
// owned pane at all — disposeOwnedPanes has nothing to dispose there (see DP.browse-home).

test('DP.browse-browse — a pane-owning DRAGGING browse->browse supersession disposes the owned .nav-ghost; the successor arms with no leaked pane', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await liveDragNoRelease(h, addRow(h));
    assert.equal(ghosts(h), 1, 'fixture: the browse->browse drag minted one owned .nav-ghost');
    const aId = sess(h).id;
    const hr0 = hardResets(h).length;

    h.touch.start(10, 300, h.$('browse'));          // supersede mid-drag
    assert.ok(hardResets(h).length > hr0, 'fixture: the supersession tripped begin()\'s recovery');
    assert.equal(ghosts(h), 0,
      'the superseded session\'s owned pane must be disposed on supersession. A build whose disposeOwnedPanes '
      + 'skips the own===\'owned-pane\' filter (removes nothing) leaves the ghost stranded — RED. (Mutation #13 '
      + `"begin() stops hard-resetting" reddens this at HEAD.) ghosts after recovery=${ghosts(h)}`);
    // The successor arms clean: no leaked ghost trips a second hard reset when it goes live.
    h.touch.move(80, 302); await realSleep(14);
    assert.equal(ghosts(h), 1, 'the successor mints exactly its OWN one pane (a leaked predecessor ghost would make this 2)');
    assert.ok(sess(h) && sess(h).id !== aId && sess(h).dragging === true, 'the successor is the new dragging owner');
    assert.ok(/ghosts=0/.test(starts(h).at(-1) || ''),
      `the successor's start() sees a clean DOM (ghosts=0) before minting its own pane — a leaked ghost would `
      + `read ghosts=1. successor start=${starts(h).at(-1)}`);
  } finally { h.dispose(); }
});

test('DP.browse-home — a browse->home DRAGGING supersession is pane-less (Stage 6i): disposeOwnedPanes no-ops, and #home is re-parked cleanly', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await settle(h);   // navStack [home, books]
    await liveDragNoRelease(h, addRow(h));                  // back-swipe books->home (browse->home)
    assert.ok(/start back books→home/.test(starts(h).at(-1) || ''),
      `fixture: the drag is browse->home — got ${starts(h).at(-1)}`);
    // Stage 6i (PLAN-swipe-noswap-home.md, option (a)): browse->home mints NO owned
    // pane — the real fixed #home is the un-parked incoming mover, the real #browse is
    // the borrowed-real outgoing mover.
    assert.equal(ghosts(h), 0, 'fixture: browse->home mints no owned pane (Stage 6i)');
    assert.equal(h.$('home').classList.contains('parked'), false,
      'fixture: #home is the un-parked incoming mover mid-drag');
    const hr0 = hardResets(h).length;

    h.touch.start(10, 300, h.$('browse'));
    assert.ok(hardResets(h).length > hr0, 'fixture: the supersession tripped the recovery');
    assert.equal(ghosts(h), 0, 'still no owned pane after recovery — disposeOwnedPanes has nothing to dispose');
    assert.equal(h.$('home').classList.contains('parked'), true,
      'the recovery re-parks #home (setView restores the source view, books, per currentDesc())');
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// BR — the INVARIANT (Loki residual 2): a borrowed-real mover is NEVER removed by the disposer.
// ════════════════════════════════════════════════════════════════════════════════════════════
// Plan §8 BR / §3.2 / EC §4.4. disposeOwnedPanes must NEVER remove a borrowed-real mover —
// a structural guarantee by the own filter. GREEN @HEAD (the sweep only queries .nav-ghost,
// never a borrowed real), RED under a mutation that broadens the disposer to remove every
// mover (Brunel registers the built-code mutant; a manual HEAD channel-proof is recorded in
// Claude/Curie/RED-swipe-stage6e.md). Stage 6i (PLAN-swipe-noswap-home.md, option (a))
// retired the browse->home pair's owned home-snapshot: BOTH of that pair's movers (#browse
// outgoing, #home incoming) are now borrowed-real, so this demonstrates the invariant holds
// for both, not just one.

test('BR — on a browse->home supersession neither borrowed-real mover (#browse or #home) is ever removed (Stage 6i: both are borrowed-real)', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    const browseEl = h.$('browse'), homeEl = h.$('home');
    await liveDragNoRelease(h, addRow(h));                  // browse->home; both movers borrowed-real (Stage 6i)
    assert.ok(/start back books→home/.test(starts(h).at(-1) || ''), `fixture: browse->home — got ${starts(h).at(-1)}`);
    assert.equal(ghosts(h), 0, 'fixture: browse->home is pane-less — no owned pane exists to remove (Stage 6i)');
    const hr0 = hardResets(h).length;

    h.touch.start(10, 300, browseEl);                      // supersede mid-drag
    assert.ok(hardResets(h).length > hr0, 'fixture: the supersession tripped the recovery');
    assert.ok(h.$('browse') === browseEl && browseEl.isConnected,
      'the borrowed-real #browse (the source host) must SURVIVE the supersession — disposeOwnedPanes removes only '
      + 'own===\'owned-pane\' movers, so a broad "remove every mover" disposer that deletes #browse would leave the '
      + 'successor rendering into a missing host (EC §4.4). The invariant Loki residual-2 pins.');
    assert.ok(h.$('home') === homeEl && homeEl.isConnected,
      'the borrowed-real #home (the incoming mover) must also SURVIVE the supersession — it is never an owned pane');
    assert.equal(ghosts(h), 0, 'no owned pane existed to remove, before or after the recovery');
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// HR — an ORPHAN .nav-ghost (no owning session) is swept at begin() before arming (I17(b)).
// ════════════════════════════════════════════════════════════════════════════════════════════
// Plan §8 HR. The cur-null branch keeps the FULL resetSwipeStyles sweep, so a stray ghost with
// no live session is disposed exactly as today. GREEN @HEAD, RED under mutation #13 (the recovery
// disposes nothing) or a build that runs keepGhosts:true UNCONDITIONALLY (orphan never swept,
// no owner disposes it — the built-code mutant Brunel registers per plan §9).

test('HR — a leftover orphan .nav-ghost with no owning session is disposed at begin() before the fresh gesture arms', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    // Land on a browse screen with NO live gesture, THEN inject the orphan (injecting before the
    // nav would let the nav's own applyScreen sweep it first — no orphan would reach begin()).
    h.tap('.navbtn[data-nav="books"]'); await settle(h);
    assert.equal(sess(h), null, 'fixture: no live session');
    const orphan = h.document.createElement('div'); orphan.className = 'nav-ghost';
    h.document.body.appendChild(orphan);
    assert.equal(ghosts(h), 1, 'fixture: a stray orphan .nav-ghost is present with no owning session');

    h.touch.start(10, 300, h.$('browse'));                 // a fresh edge touch -> begin() recovery (cur null)
    assert.ok(!orphan.isConnected && ghosts(h) === 0,
      'the orphan must be swept by the full resetSwipeStyles sweep on the cur-null branch before the new gesture '
      + 'arms (I17(b)) — else it survives into the new gesture and re-introduces the wrong-page/wrong-tap bug. '
      + `A build that runs keepGhosts:true unconditionally strands it. Mutation #13 reddens this at HEAD. ghosts=${ghosts(h)}`);
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// DEC — the owned-decoration .np-pill-float is still removed on the owned recovery (parity).
// ════════════════════════════════════════════════════════════════════════════════════════════
// Plan §8 DEC. The decoration removal stays in resetSwipeStyles (nav.js:104, UNGUARDED by
// keepGhosts), so keepGhosts:true on the owned branch skips only the .nav-ghost sweep, never the
// decoration. GREEN @HEAD, RED under a mutation that guards the .np-pill-float removal behind
// keepGhosts too (Brunel registers the built-code mutant; a manual HEAD proof — remove nav.js:104
// — is recorded in Claude/Curie/RED-swipe-stage6e.md).

test('DEC — a transient .np-pill-float decoration is still removed on the owned recovery (keepGhosts:true does not guard it)', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await liveDragNoRelease(h, addRow(h));                  // pane-owning DRAGGING browse->browse (owned branch)
    assert.equal(ghosts(h), 1, 'fixture: an owned pane exists, so the recovery takes the keepGhosts:true owned branch');
    const pill = h.document.createElement('div'); pill.className = 'np-pill-float';
    h.document.body.appendChild(pill);
    assert.equal(pillFloats(h), 1, 'fixture: a transient pill-float clone is present at recovery');

    h.touch.start(10, 300, h.$('browse'));                 // supersede -> recovery
    assert.ok(!pill.isConnected && pillFloats(h) === 0,
      'the .np-pill-float decoration must still be removed on the owned recovery — it lives in resetSwipeStyles '
      + '(nav.js:104), UNGUARDED by keepGhosts, so suppressing the .nav-ghost sweep must not leak the decoration. '
      + `A build that guards nav.js:104 behind keepGhosts too reddens here. pill floats=${pillFloats(h)}`);
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// RGreveal — the paint-gated release() half is byte-untouched (the flash-surface pin).
// ════════════════════════════════════════════════════════════════════════════════════════════
// Plan §8 RGreveal / §2. 6e must not touch the reveal choreography. A browse->browse ABORT takes
// the HELD-reveal branch (holdGhostUntilPaintable at drop -> the 'hold …' FLASH signature). GREEN
// @HEAD; RED under mutation #54 (finalizationPlanFor forces abortRender 'none' -> the browse->browse
// abort no longer enters the held branch, holds delta 0). Its role: if 6e's callee_replacement
// leaked into the reveal path, the held-reveal signature would move and this reddens.

test('RGreveal — a browse->browse ABORT still takes the held-reveal choreography (holdGhostUntilPaintable fires) — the flash surface is untouched', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    const hBefore = holds(h).length;                       // delta across THIS abort only
    // A live browse->browse back-swipe driven out then RETREATED to abort.
    h.touch.start(10, 300, addRow(h));
    h.touch.move(80, 302); await realSleep(14);            // live, mid-drag renders the source
    h.touch.move(200, 304); await realSleep(14);           // out
    h.touch.move(30, 304); await realSleep(14);            // retreat toward the edge -> aborts
    h.touch.end(30, 304);
    await settle(h); await h.clock.advance(700); await settle(h);
    assert.ok(/abort/.test(settles(h).at(-1) || ''), `fixture: it aborted — got ${settles(h).at(-1)}`);
    assert.ok(holds(h).length > hBefore,
      'a browse->browse abort must take the HELD-reveal branch (holdGhostUntilPaintable) — the reveal timing/branch '
      + 'is the flash surface 6e must NOT touch. A change to whether/where the held reveal fires reddens here '
      + `(mutation #54 forces abortRender 'none' and drops it). holds delta=${holds(h).length - hBefore}`);
  } finally { h.dispose(); }
});

// ── RGsup reconciliation — the shipped 6c/6d behaviour 6e preserves (owned by existing cells) ──
// Behaviour-preserving extraction (EC §4.19): 6e changes only WHO disposes an owned pane and by
// WHAT typed call at the pane-owning DRAGGING recovery. The pane-LESS supersession recovery, the
// 6d finalizationPlanFor render decision (app.js:417), and the 6c settle-phase identity guards are
// UNCHANGED and are already pinned + mutation-proven by the cells that own them — NOT duplicated
// here (one owner per cell), exactly as swipe-stage6d.test.js reconciled its RG cells:
//   RGsup.paneless  = swipe-stage6c.test.js G1/G2/G3/W — a pane-LESS supersession recovery admits
//                     the successor and its stale settle-rAF/settleTimer/transitionend no-op onto
//                     it (mutations #43/#44 "the settle-rAF / finalize cur===session guard is
//                     removed", #19 "the recovery omits finishing=false"). 6e touches none of it
//                     (disposeOwnedPanes no-ops on a pane-less session — see RSN(2) above).
//   RGsup.render    = swipe-stage6d.test.js RC.armed — the recovery render decision
//                     `cur.live && cur.finPlan.abortRender==='rerender'` (mutation #68 "recovery
//                     reader drops the cur.live conjunct"). 6e adds the disposal BEFORE this line
//                     and does not change it (plan §2 RGsup).
//   RGsup.gate      = swipe-stage6c.test.js PG — a pane-owning SETTLING/REVEALING session stays
//                     rejected by begin() (I17(a)); 6e types only the DRAGGING supersession and
//                     leaves the settle-phase gate intact.
