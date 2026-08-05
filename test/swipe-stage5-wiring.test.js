// WIRING (Stage 5, Brunel) — the parity guards for the §8 cells that no existing test
// covered, driving the REAL start() through test/app-harness.js. Curie authored the recipe
// and contract layers red-first; these are the green-now parity guards the test-design
// (Claude/Curie/swipe-stage5-test-design-2026-07-23.md §3) assigns to the build: F1b, F5b,
// F5c, F2-r-wiring, F7b. Each names the mutation in tools/mutate.mjs that reddens it once the
// L1/L2/L3 split exists — a parity guard with no mutation is vacuously green.
//
// WHY the app-harness and not the recipe layer: these assert that the L3 adapter WIRES the
// seam correctly against real code (base geometry, the render dispatch, the stale-overlay
// cleanup, the hold/render order, and that L3 records capture without synthesizing a ghostY).
// That is the action-wiring seam the recipe (fake-env) layer cannot reach.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls.filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const txNum = (t) => { const m = /translateX\(\s*(-?\d+(?:\.\d+)?)px\)/.exec(t || ''); return m ? Number(m[1]) : null; };

async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="authors"]'); await settle(h);   // authors over books → back-swipe is browse->browse
}
function addRow(h) {
  const row = h.document.createElement('div'); row.className = 'book';
  h.$('browse').appendChild(row); return row;
}

// ── F1b — L3 owns geometry: outgoing parks at base 0, incoming at the SIGNED ±d.w ────────
// swipe.js emits movers with a semantic slot; L3 maps slot→numeric base (outgoing 0,
// incoming off = ±d.w by direction). A back-swipe's incoming must enter from the LEFT
// (negative base); a sign error (or a base-owner swap) sends it the wrong way.
test('F1b WIRING — outgoing rides at base 0, incoming parks at the signed ±d.w', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    const row = addRow(h);
    h.touch.start(10, 300, row);
    h.touch.move(80, 302);                       // triggers start(); the drag applies base + t (t>0, small)
    assert.equal(starts(h).length, 1, 'the browse->browse back-swipe engaged');
    const w = h.window.innerWidth;
    assert.ok(w > 0, 'fixture sanity: the viewport has a width');
    // The two movers are two .browsepage nodes; the HOST carries no drag transform at all.
    assert.equal(h.$('browse').style.transform, '',
      'the #browse host must NOT be dragged on a browse->browse gesture — both mover slots '
      + 'resolve to page nodes (Invariant D6 distinctness)');
    const moved = [...h.document.querySelectorAll('.browsepage')]
      .map((p) => txNum(p.style.transform)).filter((n) => n !== null);
    assert.equal(moved.length, 2, `exactly two pages carry a drag transform; got ${moved.length}`);
    const inc = Math.min(...moved);   // incoming, base = off = -d.w (back)
    const out = Math.max(...moved);   // outgoing, base 0
    assert.ok(inc < -w / 2,
      `a BACK swipe's incoming must park at a NEGATIVE base (-d.w); got translateX ${inc} (w=${w})`);
    assert.ok(Math.abs(out) < w / 2,
      `the outgoing page must ride at base 0 (only the small drag offset); got translateX ${out}`);
    h.touch.end(80, 302); await settle(h); await h.clock.advance(400); await settle(h);
  } finally { h.dispose(); }
});

// ── F5b — L2 overlay branch: resolve + render + UNHIDE the overlay destination ──────────
// A browse->overlay back-swipe renders the destination overlay as the incoming pane and
// removes its `hidden`. Dropping the unhide leaves the overlay invisible mid-drag.
test('F5b WIRING — a browse->overlay swipe resolves, renders and UNHIDES the overlay', async () => {
  const h = boot({ fakeTimers: true });
  try {
    h.tap('.navbtn[data-nav="options"]'); await settle(h);   // navStack = [home, options]
    h.tap('.navbtn[data-nav="books"]');   await settle(h);   // navStack = [home, options, books]
    assert.ok(h.$('options').classList.contains('hidden'), 'fixture sanity: options is hidden while books shows');
    const row = addRow(h);
    h.touch.start(10, 300, row);
    h.touch.move(80, 302);                       // back-swipe books->options (overlay destination)
    assert.equal(starts(h).length, 1, 'the browse->overlay back-swipe engaged');
    assert.ok(!h.$('options').classList.contains('hidden'),
      'the overlay destination must be rendered and UNHIDDEN as the incoming pane');
    h.touch.end(80, 302); await settle(h); await h.clock.advance(400); await settle(h);
  } finally { h.dispose(); }
});

// ── F5c — L2 stale-overlay cleanup on a browse-host render ───────────────────────────────
// showAppView hides a stale settings overlay lurking over the base view (but NOT the one
// that is THIS swipe's outgoing screen). A browse->browse whose source is not the overlay
// must end with the stale overlay hidden.
test('F5c WIRING — a browse-host swipe cleans up a STALE settings overlay left visible', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);                 // from.v = authors (not options)
    h.$('options').classList.remove('hidden');   // a STALE overlay lurking over the base view
    const row = addRow(h);
    h.touch.start(10, 300, row);
    h.touch.move(80, 302);                       // browse->browse; showAppView must hide the stale overlay
    assert.equal(starts(h).length, 1, 'the browse->browse back-swipe engaged');
    assert.ok(h.$('options').classList.contains('hidden'),
      'showAppView must hide a stale settings overlay that is not the outgoing screen');
    h.touch.end(80, 302); await settle(h); await h.clock.advance(400); await settle(h);
  } finally { h.dispose(); }
});

// ── F2-r — RETIRED WITH THE CAPTURE-RECORDING BLOCK (PLAN-swipe-declone-stage2-subtraction.md
// §4 D2, §8 D14) ── This pinned that browse→home is pane-less: L3 never synthesizes animSync
// or ghostY from a null capture. `buildConstruction` returns no `capture` key at all now (its
// only producer, the app-ghost recipe, is gone), so `d.ghostY`/`d.animSync`/`d.animRes` have
// no writer anywhere, and the `animSync=`/`ghostY=` tokens this cell asserted `?` for are
// removed from the @reveal line entirely (D3) — there is no longer a field to prove is never
// synthesized.

// ── F7b — L3 ordering: the row hold precedes the clobbering destination render ───────────
// start() takes the Browse row hold BEFORE buildConstruction invokes the mid-drag render
// that clobbers #browse, so an abort restores the held rows instead of rebuilding. If the
// hold is taken after the render, the outgoing rows are already gone.
test('F7b WIRING — the row hold is taken BEFORE the clobbering destination render', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);                 // browse->browse: the mid-drag render clobbers #browse
    const row = addRow(h);
    h.touch.start(10, 300, row);
    h.touch.move(80, 302);                       // start(): takeRowHold() then buildConstruction -> Browse.render
    const names = h.log.calls.map((c) => c.name);
    const hold = names.indexOf('browse.beginHold');
    const render = names.lastIndexOf('browse.render');   // the mid-drag render is the latest one
    assert.ok(hold >= 0, 'the gesture must take a row hold');
    assert.ok(render >= 0, 'the browse->browse swipe must render the destination mid-drag');
    assert.ok(hold < render, `the row hold must precede the clobbering render; beginHold@${hold} render@${render}`);
    h.touch.end(80, 302); await settle(h); await h.clock.advance(400); await settle(h);
  } finally { h.dispose(); }
});
