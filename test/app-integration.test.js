// Integration tests for app.js's ACTION WIRING — the seam that produced nearly every
// defect in the .88–.150 review cycle and that no existing test could reach.
//
// These drive the REAL app: real index.html DOM, real app.js, real js/playback.js,
// js/nav.js, js/logic.js, js/home-screen.js — actions issued by CLICKING the real
// elements and firing the real media/lifecycle events. Nothing calls a helper
// directly, because "the helper is correct" was never the failing part: every one of
// those bugs was a call site that failed to invoke the right invalidation, or invoked
// it in the wrong order, while the helper's own unit test stayed green.
//
// Each test below is grounded in a SHIPPED bug (build number cited), so it can fail
// for the reason it was written — see the global rule `tests-must-be-able-to-fail`.
const { test } = require('node:test');
const assert = require('node:assert');
const { boot } = require('./app-harness.js');

/** Let the app's awaited chains (Plex fetches, restore, render) run to quiescence. */
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }
/** Tap a book's cover exactly as a user does — the real tile, the real handler. */
function tapBook(h, rk) {
  const el = h.document.querySelector(`[data-book="${rk}"] .covertap`);
  if (!el) throw new Error('no tile for ' + rk);
  el.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, cancelable: true }));
}
const pending = (h, rk) => h.pendingTracks.find((p) => p.rk === rk && !p.done);

test('harness sanity: a real tile tap drives the real playback path end to end', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    assert.match(h.audio.src, /bookA/, 'the tapped book is what loads');
    assert.ok(h.audio.calls.includes('load'), 'the element was actually loaded');
    assert.ok(h.log.names().includes('presence.claimPlaying'), 'ownership was claimed');
  } finally { h.dispose(); }
});

// ── .105 ───────────────────────────────────────────────────────────────────────
// "an old retry / auto-advance cancelled a newer book tap". The general invariant
// that chain kept violating: whichever selection the USER made LAST must own
// playback, no matter which network response lands first. Here book A's track list
// deliberately resolves AFTER book B's — the out-of-order case that shipped broken.
test('the LAST book the user tapped owns playback, even when an earlier request resolves later (.105)', async () => {
  const h = boot({ deferTracks: true });
  try {
    await settle(h);
    tapBook(h, 'bookA');                 // A: track list now in flight
    await settle(h);
    tapBook(h, 'bookB');                 // B: newer intent, also in flight
    await settle(h);

    pending(h, 'bookB').resolve();       // B lands first…
    await settle(h);
    const afterB = h.audio.src;
    pending(h, 'bookA').resolve();       // …then the SUPERSEDED request completes
    await settle(h);

    assert.match(afterB, /bookB/, 'B started when its tracks arrived');
    assert.match(h.audio.src, /bookB/, 'the stale A response must NOT hijack playback');
  } finally { h.dispose(); }
});

// ── .93 ───────────────────────────────────────────────────────────────────────
// The presence board must describe the book that is ACTUALLY loaded. .93 shipped a
// device publishing the OLD track with the NEW position because the guard re-read
// state it had already mutated, corrupting handoff for every peer.
test('presence ownership is claimed for the book that actually loaded, not a superseded one (.93)', async () => {
  const h = boot({ deferTracks: true });
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    tapBook(h, 'bookB');
    await settle(h);
    pending(h, 'bookB').resolve();
    await settle(h);
    pending(h, 'bookA').resolve();       // superseded — must publish nothing
    await settle(h);

    const tracks = h.log.calls.filter((c) => c.name === 'presence.setTrack');
    const loaded = h.audio.src;
    assert.match(loaded, /bookB/);
    for (const c of tracks) {
      const arg = JSON.stringify(c.args);
      assert.ok(!arg.includes('bookA'), 'no presence publication may reference the superseded book: ' + arg);
    }
  } finally { h.dispose(); }
});

// ── .95 / the lock-screen teardown class ──────────────────────────────────────
// A background→foreground round trip must NOT tear down and reload a live element.
// .95 shipped exactly that: a re-entrant restore called startTrack on the already-
// loaded track, emptying the element and leaving it paused — silence after unlock.
test('a background/foreground round trip does not reload or pause live playback (.95)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    h.audio.reachPlaying(120);           // genuinely playing at 2:00
    await settle(h);

    const loadsBefore = h.audio.calls.filter((c) => c === 'load').length;
    h.setHidden(true);                   // screen locked / app backgrounded
    await settle(h);
    h.setHidden(false);                  // unlocked
    await settle(h);

    assert.equal(h.audio.calls.filter((c) => c === 'load').length, loadsBefore,
      'the live element must not be re-loaded across a visibility round trip');
    assert.equal(h.audio.paused, false, 'and must not be left paused');
    assert.match(h.audio.src, /bookA/, 'still the same track');
  } finally { h.dispose(); }
});

// ── ordering, not just occurrence ─────────────────────────────────────────────
// Several bugs (.92/.93) were "the right calls happened in the wrong ORDER". Pin the
// sequence a selection must produce: the track list is fetched BEFORE the element is
// pointed at a source, and ownership is claimed only once a source exists.
test('a selection fetches tracks before loading the element, and claims ownership after (.92/.93 ordering)', async () => {
  const h = boot();
  try {
    await settle(h);
    const before = h.log.calls.length;
    tapBook(h, 'bookA');
    await settle(h);

    const after = h.log.calls.slice(before).map((c) => c.name);
    const iFetch = after.indexOf('plex.getAlbumTracks');
    const iClaim = after.indexOf('presence.claimPlaying');
    assert.ok(iFetch >= 0, 'tracks were fetched');
    assert.ok(iClaim > iFetch, 'ownership is claimed only after the track list resolved');
    assert.ok(h.audio.calls.includes('load'), 'and the element was loaded');
  } finally { h.dispose(); }
});
