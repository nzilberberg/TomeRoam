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
test('a selection fetches, then sources, then loads, then claims — one ordered stream (.92/.93)', async () => {
  const h = boot();
  try {
    await settle(h);
    const before = h.log.calls.length;
    tapBook(h, 'bookA');
    await settle(h);

    // Audio effects and the outside-world fakes now share ONE ordered recorder, so
    // this is a genuine cross-dependency ordering claim. The previous version asserted
    // "fetch before claim" (both in the fakes log) plus "load happened at some point"
    // (a separate array) — which could NOT see a claim that moved ahead of the load,
    // and that is exactly the .93 corruption shape.
    const seq = h.log.calls.slice(before).map((c) => c.name);
    const at = (n) => seq.indexOf(n);
    assert.ok(at('plex.getAlbumTracks') >= 0, 'tracks were fetched');
    assert.ok(at('audio.src') > at('plex.getAlbumTracks'),
      'the source is assigned only after the track list resolved: ' + seq.join(' → '));
    assert.ok(at('audio.load') > at('audio.src'),
      'load() follows the source assignment: ' + seq.join(' → '));
    assert.ok(at('presence.claimPlaying') > at('audio.load'),
      'ownership is claimed only once the element is loading: ' + seq.join(' → '));
  } finally { h.dispose(); }
});

// ══ retry / wedge races (.88–.91, .99, .101) ═══════════════════════════════════
// These need VIRTUAL time: the retry backoff (1s, 2s, 4s…) and the wedge watchdog
// (1400ms) are setTimeout-driven, and the whole bug class is "a newer action arrives
// DURING that delay". js/playback.test.js already drives the module directly; what
// was never covered is whether the REAL app actions reach it — a seek that never
// calls noteIntent leaves the module perfectly correct and the app still broken.
const MEDIA_ERR = { MEDIA_ERR_ABORTED: 1, MEDIA_ERR_NETWORK: 2, MEDIA_ERR_SRC_NOT_SUPPORTED: 4 };
const loads = (h) => h.audio.calls.filter((c) => c === 'load').length;
/** Fail the element the way a dead relay base does. code 2 = network, 4 = bad src. */
function failAudio(h, code) {
  h.audio.error = Object.assign({ code }, MEDIA_ERR);
  h.audio.emit('error');
}
async function playBook(h, rk, at = 100) {
  await settle(h);
  tapBook(h, rk);
  await settle(h);
  h.audio.setBuffered(0, 600);
  h.audio.reachPlaying(at);
  await settle(h);
}

test('a stream error retries against a FRESH base rather than reloading the dead URL (.88)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await playBook(h, 'bookA', 100);
    const before = loads(h);
    failAudio(h, 2);
    await settle(h);
    assert.equal(loads(h), before, 'the retry is DELAYED, not immediate');

    await h.clock.advance(1500);

    assert.equal(h.log.names().filter((n) => n === 'plex.resetConn').length, 1,
      'the connection is re-resolved before retrying (a stale base was the likely cause)');
    assert.equal(loads(h) - before, 1, 'exactly one retry load');
  } finally { h.dispose(); }
});

test('a real SEEK during the retry delay cancels it — playback is never yanked back (.90/.91)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await playBook(h, 'bookA', 100);
    failAudio(h, 2);                       // retry armed for +1000ms
    await settle(h);
    const before = loads(h);

    await h.clock.advance(400);            // still pending…
    h.seek(500);                           // …user scrubs: REAL slider → onManualSeek → noteIntent
    await settle(h);
    await h.clock.advance(3000);           // let the retry's moment pass

    assert.equal(loads(h) - before, 0, 'the superseded retry must not reload');
    assert.equal(h.audio.currentTime, 500, 'and must not drag the playhead back to the failed spot');
  } finally { h.dispose(); }
});

// The .90 subtlety worth pinning separately: a seek does NOT bump loadGen (no new
// track is loaded), so a guard that watched only loadGen let the retry through. This
// asserts the intent path specifically, via a BACKWARD seek that leaves the element
// on the same track at a lower position.
test('a BACKWARD seek (same track, no new load) still supersedes a pending retry (.90)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await playBook(h, 'bookA', 300);
    failAudio(h, 4);                       // code 4 — the rotated-relay case .88 added
    await settle(h);
    const before = loads(h);

    h.seek(60);                            // backward, same track
    await settle(h);
    await h.clock.advance(5000);

    assert.equal(loads(h) - before, 0, 'no reload of the failed position');
    assert.equal(h.audio.currentTime, 60, 'the user\'s rewind stands');
  } finally { h.dispose(); }
});

test('the wedge watchdog does not undo a newer backward seek (.101)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await playBook(h, 'bookA', 100);       // wedge watch armed at t0=100
    const before = loads(h);

    h.seek(40);                            // backward: clock now BELOW t0 — looks "frozen"
    await settle(h);
    await h.clock.advance(2500);           // past WEDGE_CHECK_MS

    assert.equal(loads(h) - before, 0, 'a superseded watch must not diagnose a wedge');
    assert.equal(h.audio.currentTime, 40, 'and must not reload the stale t0');
  } finally { h.dispose(); }
});

test('a wedge while HIDDEN defers instead of reloading, then recovers on foreground (.99)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await playBook(h, 'bookA', 100);
    h.setHidden(true);                     // screen locked
    await settle(h);
    const before = loads(h);

    await h.clock.advance(2500);           // wedge fires while hidden
    assert.equal(loads(h) - before, 0,
      'reloading while hidden just stalls a second op — iOS will not play it until foreground');

    h.setHidden(false);                    // unlocked
    await settle(h);
    assert.equal(loads(h) - before, 1, 'recovery happens the instant we are foreground again');
  } finally { h.dispose(); }
});

// ══ session boundary, peer adoption, auto-advance (.104, .92/.93, .105) ════════

// ── .104 ───────────────────────────────────────────────────────────────────────
// "a pending book selection could start AFTER sign-out": beginPlayback(B) resolving
// post-sign-out recreated ctx, called startTrack and claimed presence — a banked
// track could even start playing audio for a signed-out user. doSignOut routes
// through userPause() -> notePlaybackIntent() -> cancelPlayRequest() precisely so the
// not-yet-started selection is invalidated. Driven through the REAL onSignOut app.js
// wired into the General settings screen.
test('a book selection still in flight must not start after sign-out (.104)', async () => {
  const h = boot({ deferTracks: true });
  try {
    await settle(h);
    tapBook(h, 'bookA');                       // track list in flight
    await settle(h);
    const claimsBefore = h.log.names().filter((n) => n === 'presence.claimPlaying').length;

    h.screenDeps.GeneralScreen.onSignOut();    // the real doSignOut app.js injected
    await settle(h);
    pending(h, 'bookA').resolve();             // the superseded selection completes AFTER
    await settle(h);

    assert.ok(h.log.names().includes('plex.signOut'), 'we really signed out');
    assert.equal(h.audio.src, '', 'nothing may start playing for a signed-out user');
    assert.equal(h.log.names().filter((n) => n === 'presence.claimPlaying').length, claimsBefore,
      'and no ownership may be claimed after the session ended');
  } finally { h.dispose(); }
});

// ── .92 / .93 ─────────────────────────────────────────────────────────────────
// The reason this app exists: if a peer owns and is PLAYING this book, an explicit
// Play must adopt the peer's live chapter/position rather than resume our own stale
// local spot. .92 shipped the inverse (an errored element short-circuited to a local
// reload); .93 shipped a cross-chapter adopt that never published the new presence
// track, so peers saw the wrong chapter and handoff corrupted.
test('an explicit Play adopts a live peer\'s chapter instead of resuming the local spot (.92)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');                       // we are on chapter 0, paused
    await settle(h);
    assert.match(h.audio.src, /bookA\/0/);

    h.pushPeers([{ id: 'peer1', name: 'iPhone', book: 'bookA', track: 'bookA-t2',
      state: 'playing', claim: 999, at: Date.now(), pos: 300000 }]);
    await settle(h);
    h.tap('.player .play');
    await settle(h);

    assert.match(h.audio.src, /bookA\/2/, 'adopted the PEER\'s chapter, not our local one');
  } finally { h.dispose(); }
});

test('a cross-chapter adopt publishes the peer\'s track to presence (.93 handoff corruption)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    h.pushPeers([{ id: 'peer1', name: 'iPhone', book: 'bookA', track: 'bookA-t2',
      state: 'playing', claim: 999, at: Date.now(), pos: 300000 }]);
    await settle(h);
    h.tap('.player .play');
    await settle(h);

    const published = h.log.calls.filter((c) => c.name === 'presence.setTrack').map((c) => c.args[0]);
    assert.ok(published.includes('bookA-t2'),
      'the ADOPTED chapter must be published — publishing the old track with the new position is what corrupted handoff');
  } finally { h.dispose(); }
});

// ── .105, from the other direction ────────────────────────────────────────────
// .105: cancelPlayRequest() sat inside startTrack(), which is ALSO the auto-advance
// path — so an old chapter ending cancelled a NEWER book the user had just tapped.
// Internal recovery must never outrank an explicit user choice.
test('a chapter auto-advancing does not cancel a newer book the user just tapped (.105)', async () => {
  const h = boot({ deferTracks: true });
  try {
    await settle(h);
    tapBook(h, 'bookA');
    pending(h, 'bookA').resolve();
    await settle(h);
    h.audio.reachPlaying(590);                 // near the end of a 600s chapter
    await settle(h);

    tapBook(h, 'bookB');                       // user picks another book; tracks in flight
    await settle(h);
    h.audio.currentTime = 600;                 // …and meanwhile chapter A genuinely ends
    h.audio.emit('ended');
    await settle(h);

    pending(h, 'bookB').resolve();
    await settle(h);

    assert.match(h.audio.src, /bookB/, 'the explicit selection wins over the auto-advance');
  } finally { h.dispose(); }
});

// ── restore seam (.152) ────────────────────────────────────────────────────────
// Until .152 the harness seeded the WRONG localStorage key, so `opts.lastPlayed` was
// inert and restoreLastPlayed returned early in every test — the seam looked covered
// and was not. This first test is the guard on the FIXTURE itself: it fails if the
// key ever drifts from app.js's `LAST` again, which is what let the bug below hide.
const LAST_SNAP = { book: 'bookA', track: 'bookA-t1', pos: 90000, ts: 1,
  title: 'Book A', author: 'Author', chapter: 'Ch 2', thumb: '/a', dur: 600000 };

test('a seeded last-played snapshot actually drives restore (fixture guard, .152)', async () => {
  const h = boot({ lastPlayed: LAST_SNAP });
  try {
    await settle(h);
    assert.ok(h.log.calls.some((c) => c.name === 'plex.getAlbumTracks' && c.args[0] === 'bookA'),
      'restoreLastPlayed must fetch the snapshot book — if this fails, opts.lastPlayed is inert again');
    // the fake's streamUrl is built from partKey (`/parts/<book>/<idx>`), so the
    // chapter is asserted by INDEX: t1 is the second track, which is what was saved.
    assert.match(h.audio.src, /\/parts\/bookA\/1/, 'the remembered CHAPTER is what gets restored');
  } finally { h.dispose(); }
});

// The guard at js/app.js:1206 (PBLogic.restoreStillCurrent). enterApp() deliberately
// re-fires while playback exists, so a slow restore metadata read can land after the
// user has already started another book. Without the check, the restore reassigns ctx
// and reloads the OLD book over the new one — the element plays B while ctx claims A,
// and Presence/Progress then mis-attribute B's position to A.
test('a slow restore must not reload the old book over one the user just tapped (.152)', async () => {
  const h = boot({ lastPlayed: LAST_SNAP, deferTracks: true });
  try {
    await settle(h);                     // restore's getAlbumTracks(bookA) is now in flight
    tapBook(h, 'bookB');                 // newer explicit selection
    await settle(h);
    pending(h, 'bookB').resolve();       // B starts and bumps loadGen
    await settle(h);
    assert.match(h.audio.src, /bookB/, 'precondition: B is what is playing');
    const loadsAfterB = loads(h);

    pending(h, 'bookA').resolve();       // …the SUPERSEDED restore finally lands
    await settle(h);

    assert.match(h.audio.src, /bookB/, 'the stale restore must NOT reload the remembered book');
    assert.equal(loads(h), loadsAfterB, 'a superseded restore must not touch the element at all');
  } finally { h.dispose(); }
});

// ── the noteIntent window (.152) ───────────────────────────────────────────────
// beginPlayback calls Playback.noteIntent() BEFORE its await (js/app.js:984). The
// comment above that line documents why: a retry/wedge timer armed against the OLD
// book captured loadGen+intentGen, and beginPlayback bumps NEITHER until its own
// startTrack runs AFTER the fetch. So during the fetch window a stale retry still
// passes its own gen check and reloads the old book over a newer selection.
// Deleting that one call left the whole suite green — this test is what makes that
// mutation fail. It needs BOTH fake timers and a deferred fetch: with an immediate
// fetch, startTrack bumps loadGen before the retry fires and the bug is masked.
test('a stale retry must not reload the old book while a newer selection is still fetching (.152)', async () => {
  const h = boot({ fakeTimers: true, deferTracks: true });
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    pending(h, 'bookA').resolve();
    await settle(h);
    h.audio.setBuffered(0, 600);
    h.audio.reachPlaying(100);
    await settle(h);

    failAudio(h, 2);                    // retry armed against bookA (+1000ms)
    await settle(h);
    const before = loads(h);

    tapBook(h, 'bookB');                // newer intent — B's track list stays IN FLIGHT
    await settle(h);
    await h.clock.advance(3000);        // the stale retry's moment passes mid-fetch

    assert.equal(loads(h) - before, 0,
      'the superseded retry must not reload the old book during a newer selection');

    pending(h, 'bookB').resolve();
    await settle(h);
    assert.match(h.audio.src, /\/parts\/bookB\//, 'the newer selection still owns playback');
  } finally { h.dispose(); }
});

// ══ Media Session: the lock-screen entry point (.154) ══════════════════════════
// app.js registers six handlers (app.js:1965-1970). They are a SEPARATE public
// entry point from the visible controls — `play` routes to resumePlay()
// unconditionally while the mini-player button toggles on audio.paused, and
// previoustrack/nexttrack have NO mini-player equivalent at all (only npPrev/npNext
// on the Now-Playing screen). Until .154 the harness discarded every handler AND
// app.js could not see the fake navigator at all, so none of this ran under test.
//
// Parity is asserted on the two things resumePlay() does that a bare audio.play()
// would not: it supersedes a pending retry (notePlaybackIntent) and it ADOPTS a live
// peer's chapter. Those are what make these tests able to fail.

test('every Media Session action app.js registers is actually captured (fixture guard, .154)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    assert.deepEqual(h.mediaSession.registered().sort(),
      ['nexttrack', 'pause', 'play', 'previoustrack', 'seekbackward', 'seekforward'],
      'if this is empty, app.js cannot see the fake navigator (Node defines globalThis.navigator as a getter — it must be installed with defineProperty, not assignment)');
    assert.ok(h.mediaSession.state.metadata, 'and Media Session metadata was published');
  } finally { h.dispose(); }
});

// The peer-adoption case, driven from the LOCK SCREEN instead of the UI button.
// A Media Session play wired straight to the audio element would resume our stale
// local chapter — the exact bug this app exists to avoid.
test('Media Session play adopts a live peer\'s chapter, same as the UI play button (.154)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');                       // local: chapter 0, paused
    await settle(h);
    h.pushPeers([{ id: 'peer1', name: 'iPhone', book: 'bookA', track: 'bookA-t2',
      state: 'playing', claim: 999, at: Date.now(), pos: 300000 }]);
    await settle(h);

    h.mediaSession.invoke('play');             // the LOCK-SCREEN entry point
    await settle(h);

    assert.match(h.audio.src, /bookA\/2/, 'the lock-screen Play must adopt the PEER\'s chapter');
    const published = h.log.calls.filter((c) => c.name === 'presence.setTrack').map((c) => c.args[0]);
    assert.ok(published.includes('bookA-t2'), 'and publish the adopted chapter');
  } finally { h.dispose(); }
});

// resumePlay()'s other job: notePlaybackIntent(), which kills a pending stream retry.
// A lock-screen Play that skipped it would let the stale retry fire and reload.
test('Media Session play supersedes a pending stream retry, same as the UI button (.154)', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    h.audio.setBuffered(0, 600);
    h.audio.reachPlaying(100);
    await settle(h);

    failAudio(h, 2);                           // retry armed (+1000ms)
    await settle(h);
    const before = loads(h);

    h.mediaSession.invoke('play');             // lock-screen Play = explicit intent
    await settle(h);
    await h.clock.advance(3000);               // the retry's moment passes

    // loads alone does NOT discriminate: a fired retry also produces exactly one load,
    // so `loads === 1` passes whether or not the retry was cancelled. The retry path is
    // the ONLY thing that re-resolves the base (resetConn, see the .88 test) — assert on
    // that instead, or this test cannot fail for the reason it was written.
    assert.equal(loads(h) - before, 1,
      'exactly the resume reload — the superseded retry must NOT add a second');
    assert.equal(h.log.names().filter((n) => n === 'plex.resetConn').length, 0,
      'the retry was cancelled by the lock-screen Play, so no reconnect probe ever ran');
  } finally { h.dispose(); }
});

// previoustrack/nexttrack are the two actions with no mini-player equivalent. The
// Now-Playing screen owns their only buttons, so compare the two entry points there.
// NOTE: boot() installs shared globals (window/document/navigator/FakeAudio.last), so
// two harnesses cannot be alive at once — the second clobbers the first. Run each
// entry point in its own booted app, snapshot the core state, then compare.
async function nowPlayingOpen(h) {
  await settle(h);
  tapBook(h, 'bookA');
  await settle(h);
  h.audio.reachPlaying(100);
  await settle(h);
  h.tap('#player');                            // opens Now Playing → builds npPrev/npNext
  await settle(h);
}
const coreState = (h) => ({ src: h.audio.src, loads: loads(h),
  track: (h.log.calls.filter((c) => c.name === 'presence.setTrack').pop() || { args: [] }).args[0] });

test('Media Session nexttrack matches the Now-Playing next button (.154)', async () => {
  let viaUi, viaMs;
  const h1 = boot();
  try {
    await nowPlayingOpen(h1);
    assert.ok(h1.document.getElementById('npNext'), 'the real Now-Playing next button exists');
    h1.tap('#npNext');
    await settle(h1);
    viaUi = coreState(h1);
  } finally { h1.dispose(); }

  const h2 = boot();
  try {
    await nowPlayingOpen(h2);
    h2.mediaSession.invoke('nexttrack');
    await settle(h2);
    viaMs = coreState(h2);
  } finally { h2.dispose(); }

  assert.match(viaUi.src, /bookA\/1/, 'the UI button advanced a chapter');
  assert.deepEqual(viaMs, viaUi, 'the lock-screen action must produce the same core state as the button');
});

// ══ refused / pending play() (.155) ════════════════════════════════════════════
// A real play() settles when playback actually STARTS: it can stay pending, and it
// REJECTS when the browser refuses (iOS NotAllowedError — the lock-screen resume
// case). The fake resolved instantly until .155, so none of this was representable.
// NOTE the fake pauses the element on refusal because real browsers do; without that
// the app looks like it is claiming playback it never got, which would be a defect of
// the FAKE. Assertions here are about app.js, not about that.

test('a REFUSED resume play() is handled, not left as an unhandled rejection (.155)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    h.audio.setBuffered(0, 600);
    h.audio.reachPlaying(100);
    await settle(h);
    h.tap('#pPlay');                          // real UI pause
    h.audio.emit('pause', { paused: true });
    await settle(h);

    h.audio.deferNextPlay();
    h.tap('#pPlay');                          // resumePlay → the plain-resume path
    await settle(h);
    const i = h.audio.playAttempts.length - 1;
    assert.equal(h.audio.getPlayAttempt(i).state, 'pending', 'the resume play() is in flight');

    h.audio.rejectPlay(i);                    // the browser refuses
    await settle(h, 20);
    // If app.js does not handle this, node:test reports an unhandled rejection and the
    // RUN fails — that is the mutation signal for removing the .catch at app.js:1313.
    assert.equal(h.audio.paused, true, 'the element is paused after a refusal');
    assert.ok(h.log.calls.some((c) => c.name === 'debug' && /refused/.test(String(c.args[1]))),
      'the refusal is logged deliberately, so it is not mistaken for a crash');
  } finally { h.dispose(); }
});

// Scenario 2/3: the final explicit intent must win over a stale play completion,
// and it must do so across MIXED entry points — UI pause over a lock-screen play.
test('a pause during a PENDING play wins, even when the stale play resolves later (.155)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    h.audio.setBuffered(0, 600);
    h.audio.reachPlaying(100);
    await settle(h);
    h.tap('#pPlay');
    h.audio.emit('pause', { paused: true });
    await settle(h);

    h.audio.deferNextPlay();
    h.mediaSession.invoke('play');            // lock-screen play — stays pending
    await settle(h);
    const i = h.audio.playAttempts.length - 1;

    h.tap('#pPlay');                          // UI pause, before the play settles
    h.audio.emit('pause', { paused: true });
    await settle(h);

    // The stale play's PROMISE settles. Deliberately no late `playing` event: a browser
    // does not fire `playing` after an explicit pause(), so asserting on that sequence
    // would be testing the fake's imagination rather than the app.
    h.audio.resolvePlay(i);
    await settle(h, 20);

    assert.equal(h.audio.paused, true,
      'the resolved-but-superseded play must not resurrect playback over the newer pause');
    assert.equal(h.mediaSession.state.playbackState, 'paused', 'and the lock screen agrees');
    assert.match(h.audio.src, /bookA\/0/, 'no reload or chapter change occurred');
    assert.equal(loads(h), 1, 'exactly one load across the whole sequence');
  } finally { h.dispose(); }
});

// ══ prevTrack: both branches + the exact boundary (.156) ═══════════════════════
// app.js:1582 — `if ((audio.currentTime || 0) > 10) { restart } else { step back }`.
// The rule is STRICTLY greater-than, so exactly 10s steps BACK. Encoded from the
// production expression, not assumed. Driven through the real npPrev button, whose
// only home is the Now-Playing screen (the mini-player has no prev/next-TRACK control).
async function onChapterTwo(h) {
  await settle(h);
  tapBook(h, 'bookA');
  await settle(h);
  h.audio.reachPlaying(100);
  await settle(h);
  h.tap('#player');                    // open Now Playing → builds npPrev/npNext
  await settle(h);
  h.tap('#npNext');                    // move off track 0 so "previous" is meaningful
  await settle(h);
  assert.match(h.audio.src, /bookA\/1/, 'precondition: on chapter 2');
  return h;
}

test('Previous beyond 10s RESTARTS the chapter instead of stepping back (.156)', async () => {
  const h = boot();
  try {
    await onChapterTwo(h);
    const before = loads(h);
    h.audio.currentTime = 25;
    h.tap('#npPrev');
    await settle(h);

    assert.match(h.audio.src, /bookA\/1/, 'still the same chapter');
    assert.equal(h.audio.currentTime, 0, 'rewound to the start');
    assert.equal(loads(h), before, 'a restart must NOT reload the element');
  } finally { h.dispose(); }
});

test('Previous below 10s steps to the previous chapter, loading it exactly once (.156)', async () => {
  const h = boot();
  try {
    await onChapterTwo(h);
    const before = loads(h);
    h.audio.currentTime = 4;
    h.tap('#npPrev');
    await settle(h);

    assert.match(h.audio.src, /bookA\/0/, 'stepped back a chapter');
    assert.equal(loads(h) - before, 1, 'exactly one load for one transition');
    const tracks = h.log.calls.filter((c) => c.name === 'presence.setTrack').map((c) => c.args[0]);
    assert.equal(tracks[tracks.length - 1], 'bookA-t0', 'presence follows to the chapter we landed on');
  } finally { h.dispose(); }
});

test('Previous at EXACTLY 10s steps back — the rule is strictly greater-than (.156)', async () => {
  const h = boot();
  try {
    await onChapterTwo(h);
    h.audio.currentTime = 10;          // not > 10
    h.tap('#npPrev');
    await settle(h);
    assert.match(h.audio.src, /bookA\/0/, 'at the boundary it steps back, it does not restart');
  } finally { h.dispose(); }
});

test('Previous on the FIRST chapter below the threshold does nothing (.156)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    h.audio.reachPlaying(100);
    await settle(h);
    h.tap('#player');
    await settle(h);
    const before = loads(h);
    h.audio.currentTime = 3;
    h.tap('#npPrev');                  // idx 0 → no previous chapter exists
    await settle(h);

    assert.match(h.audio.src, /bookA\/0/, 'still on the first chapter');
    assert.equal(loads(h), before, 'and nothing was reloaded');
  } finally { h.dispose(); }
});

// Scenario 10's exactly-once concern on the ORDINARY current-generation path.
//
// NOTE on what is NOT asserted here: two `ended` events fired back-to-back WITHOUT the
// element resetting does advance two chapters — but that is not a sequence a browser
// can produce. After the first advance the element is re-sourced and sits near 0, and
// it is that reset which lets the bogus-ended guard (app.js:1380) reject the second.
// Asserting on the back-to-back version would be testing the fake's imagination.
// The realistic hazard is the one the guard's own comment documents: iOS firing a
// spurious `ended` at the buffer edge. This pins that the guard covers it.
test('a spurious second ended after an advance does not skip another chapter (.156)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    h.audio.reachPlaying(100);
    await settle(h);

    h.audio.currentTime = 600;         // genuinely at the end of a 600s chapter
    h.audio.emit('ended');
    await settle(h);
    assert.match(h.audio.src, /bookA\/1/, 'advanced exactly one chapter');

    h.audio.currentTime = 0;           // the new chapter starts at 0, as it really would
    h.audio.emit('ended');             // …and iOS fires a spurious ended at the buffer edge
    await settle(h);

    assert.match(h.audio.src, /bookA\/1/, 'the spurious ended must NOT advance again');
  } finally { h.dispose(); }
});

// ══ Media Session parity for the remaining actions (.158) ══════════════════════
// nexttrack was covered at .154. These are the rest. Each compares the lock-screen
// handler against its visible-control equivalent by running the SAME setup twice in
// separate boots (shared globals mean only one harness can be alive at a time).
//
// The snapshot includes the PUBLICATION names, which is what makes a bypass visible:
// the seek/skip actions route through onManualSeek → notePlaybackIntent + Presence
// publication, so an MS handler wired straight to audio.currentTime would land on the
// same position with a different publication trail.
const publications = (h) => h.log.names().filter((n) => n.startsWith('presence.') || n.startsWith('progress.'));
const snapshot = (h) => ({
  src: h.audio.src,
  t: Math.round(h.audio.currentTime),
  paused: h.audio.paused,
  loads: loads(h),
  ms: h.mediaSession.state.playbackState,
  publications: publications(h).join(','),
});

/** Same starting position for both runs: playing chapter 2 at 100s, Now-Playing open. */
async function playingChapterTwo(h) {
  await settle(h);
  tapBook(h, 'bookA');
  await settle(h);
  h.audio.setBuffered(0, 600);
  h.audio.reachPlaying(100);
  await settle(h);
  h.tap('#player');
  await settle(h);
  h.tap('#npNext');
  await settle(h);
  h.audio.reachPlaying(100);
  await settle(h);
}

/** Boot, run the shared setup, drive ONE entry point, snapshot, dispose. */
async function drivenBy(action) {
  const h = boot();
  try {
    await playingChapterTwo(h);
    await action(h);
    await settle(h);
    return snapshot(h);
  } finally { h.dispose(); }
}

async function assertParity(name, uiAction, msAction, extra) {
  const viaUi = await drivenBy(uiAction);
  const viaMs = await drivenBy(msAction);
  if (extra) extra(viaUi);
  assert.deepEqual(viaMs, viaUi, `${name}: the lock-screen action must match the visible control`);
}

// `userPause()` is literally `notePlaybackIntent(); audio.pause();` (app.js:1359), so
// the ONLY thing distinguishing it from a bare audio.pause() is the intent bump that
// kills a pending retry. A plain state comparison CANNOT see that — the `pause` event
// handler does the publishing either way, so both routes converge and the test passes
// under the mutation. (It did: the first version of this test was inert.) Arm a retry
// so there is something for the intent bump to cancel.
test('Media Session pause supersedes a pending retry, exactly like the UI pause (.158)', async () => {
  const run = async (pauseVia) => {
    const h = boot({ fakeTimers: true });
    try {
      await settle(h);
      tapBook(h, 'bookA');
      await settle(h);
      h.audio.setBuffered(0, 600);
      h.audio.reachPlaying(100);
      await settle(h);

      failAudio(h, 2);                       // retry armed (+1000ms)
      await settle(h);
      const before = loads(h);

      pauseVia(h);
      h.audio.emit('pause', { paused: true });
      await settle(h);
      await h.clock.advance(3000);           // the retry's moment passes

      return {
        extraLoads: loads(h) - before,
        resetConns: h.log.names().filter((n) => n === 'plex.resetConn').length,
        paused: h.audio.paused,
      };
    } finally { h.dispose(); }
  };

  const viaUi = await run((h) => h.tap('#pPlay'));
  const viaMs = await run((h) => h.mediaSession.invoke('pause'));

  assert.equal(viaUi.extraLoads, 0, 'precondition: the UI pause cancelled the pending retry');
  assert.equal(viaUi.paused, true, 'precondition: and it really did pause');
  assert.deepEqual(viaMs, viaUi, 'the lock-screen pause must cancel the retry too');
});

test('Media Session seekbackward matches the skip-back button (.158)', async () => {
  await assertParity('seekbackward',
    (h) => h.tap('#pBack'),
    // NOTE: the handler ignores details.seekOffset and uses the app's OWN configured
    // skip amount (app.js:1967). Passing an offset here proves that is still true.
    (h) => h.mediaSession.invoke('seekbackward', { seekOffset: 30 }),
    (ui) => assert.ok(ui.t < 100, 'precondition: the button really did seek backward'));
});

test('Media Session seekforward matches the skip-forward button (.158)', async () => {
  await assertParity('seekforward',
    (h) => h.tap('#pFwd'),
    (h) => h.mediaSession.invoke('seekforward', { seekOffset: 30 }),
    (ui) => assert.ok(ui.t > 100, 'precondition: the button really did seek forward'));
});

test('Media Session previoustrack matches the Now-Playing previous button (.158)', async () => {
  await assertParity('previoustrack',
    (h) => { h.audio.currentTime = 4; h.tap('#npPrev'); },      // below the 10s threshold → step back
    (h) => { h.audio.currentTime = 4; h.mediaSession.invoke('previoustrack'); },
    (ui) => assert.match(ui.src, /bookA\/0/, 'precondition: the button really did step back'));
});

// ══ visibility DURING a pending startup (.158) ════════════════════════════════
// The suite already covers a background/foreground round trip on LIVE playback
// (.95). The gap was the round trip landing while startup is still in flight — the
// case the .95-class teardown bug came from, and the shape of the open resume-kill
// bug (enterApp re-running mid-flight). The requirement: a visibility transition must
// never authorize an obsolete startup, and must not double-load a legitimate one.

// STATUS (updated .162): this WAS unverified — no mutation made it fail. Once audio
// effects joined the shared ordered recorder, moving Presence.claimPlaying ahead of
// the load DOES fail it, so it is now mutation-verified like its neighbours.
test('backgrounding during a pending startup still starts the book exactly once (.158)', async () => {
  const h = boot({ deferTracks: true });
  try {
    await settle(h);
    tapBook(h, 'bookA');                 // track list in flight
    await settle(h);
    h.setHidden(true);                   // screen locks mid-startup
    await settle(h);
    h.setHidden(false);                  // and comes back
    await settle(h);

    pending(h, 'bookA').resolve();       // the startup finally completes
    await settle(h);

    assert.match(h.audio.src, /bookA\/0/, 'the selection completed normally');
    assert.equal(loads(h), 1, 'exactly one load — the round trip must not re-drive startup');
    assert.equal(h.log.names().filter((n) => n === 'presence.claimPlaying').length, 1,
      'and ownership is claimed exactly once');
  } finally { h.dispose(); }
});

test('a visibility round trip does not authorize a SUPERSEDED startup (.158)', async () => {
  const h = boot({ deferTracks: true });
  try {
    await settle(h);
    tapBook(h, 'bookA');                 // A: in flight
    await settle(h);
    tapBook(h, 'bookB');                 // B: newer intent, also in flight
    await settle(h);

    h.setHidden(true);
    await settle(h);
    h.setHidden(false);
    await settle(h);

    pending(h, 'bookB').resolve();       // the CURRENT selection lands
    await settle(h);
    pending(h, 'bookA').resolve();       // …then the superseded one completes
    await settle(h);

    assert.match(h.audio.src, /bookB/, 'the stale selection must not be revived by the round trip');
    const claimed = h.log.calls.filter((c) => c.name === 'presence.setTrack').map((c) => c.args[0]);
    for (const rk of claimed) assert.ok(!String(rk).includes('bookA'), 'nor published: ' + rk);
  } finally { h.dispose(); }
});

test('backgrounding while a play() is still pending leaves a coherent state (.158)', async () => {
  const h = boot();
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    h.audio.setBuffered(0, 600);
    h.audio.reachPlaying(100);
    await settle(h);
    h.tap('#pPlay');                     // pause
    h.audio.emit('pause', { paused: true });
    await settle(h);

    h.audio.deferNextPlay();
    h.tap('#pPlay');                     // resume — play() stays in flight
    await settle(h);
    const i = h.audio.playAttempts.length - 1;
    const before = loads(h);

    h.setHidden(true);
    await settle(h);
    h.setHidden(false);
    await settle(h);

    h.audio.resolvePlay(i);              // the play finally succeeds
    h.audio.emit('playing', { paused: false });
    await settle(h);

    assert.equal(loads(h), before, 'the pending resume must not be turned into a reload');
    assert.match(h.audio.src, /bookA\/0/, 'still the same chapter');
    assert.equal(h.audio.paused, false, 'and it ends up playing');
  } finally { h.dispose(); }
});

// The one that guards the OPEN resume-kill bug's shape directly: enterApp /
// restoreLastPlayed re-running while playback is live, reloading the REMEMBERED book
// over what the user is actually listening to. This needs opts.lastPlayed seeded —
// without it restoreLastPlayed returns early and a foreground-restore mutation is a
// no-op, which is exactly why the two tests above could not catch it.
test('foregrounding must not restore the remembered book over live playback (.158)', async () => {
  const h = boot({ lastPlayed: LAST_SNAP });     // remembered: bookA, chapter 2
  try {
    await settle(h);
    assert.match(h.audio.src, /bookA/, 'precondition: the remembered book was restored at launch');

    tapBook(h, 'bookB');                         // the user then picks something else
    await settle(h);
    h.audio.setBuffered(0, 600);
    h.audio.reachPlaying(50);
    await settle(h);
    assert.match(h.audio.src, /bookB/, 'precondition: bookB is live');
    const before = loads(h);

    h.setHidden(true);                           // lock…
    await settle(h);
    h.setHidden(false);                          // …unlock
    await settle(h);

    assert.match(h.audio.src, /bookB/, 'the remembered book must NOT be restored over live playback');
    assert.equal(loads(h), before, 'and the live element must not be reloaded');
    assert.equal(h.audio.paused, false, 'nor left paused — that is the resume-kill symptom');
  } finally { h.dispose(); }
});

// ══ the no-service-worker downloaded-blob path (.162) ══════════════════════════
// External review, HIGH. useSrc() revokes whatever curObjUrl holds and nulls it —
// and arguments evaluate BEFORE the call. So `curObjUrl = URL.createObjectURL(blob);
// useSrc(curObjUrl, …)` revoked the URL it was about to install (audio.src got a
// REVOKED blob url) AND leaked the previous one, which the assignment had just
// overwritten before useSrc could revoke it. Both halves are asserted here.
// This is the desktop-with-SW-disabled fallback — the only reason the branch exists.
test('the downloaded-blob path installs a LIVE object URL, never a revoked one (.162)', async () => {
  const h = boot({ downloadedTracks: ['bookA-t0'] });
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);

    assert.match(h.audio.src, /^blob:/, 'precondition: the no-SW path served the blob directly');
    assert.ok(!h.objectUrls.revoked.includes(h.audio.src),
      'the URL handed to <audio> must still be valid — revoking it first makes playback fail');
  } finally { h.dispose(); }
});

test('a second downloaded track revokes the FIRST url exactly once and keeps the new one live (.162)', async () => {
  const h = boot({ downloadedTracks: ['bookA-t0', 'bookA-t1'] });
  try {
    await settle(h);
    tapBook(h, 'bookA');
    await settle(h);
    const first = h.audio.src;
    assert.match(first, /^blob:/);

    h.audio.reachPlaying(10);
    await settle(h);
    h.tap('#player');                     // open Now Playing
    await settle(h);
    h.tap('#npNext');                     // → chapter 2, also downloaded
    await settle(h);

    const second = h.audio.src;
    assert.match(second, /^blob:/);
    assert.notEqual(second, first, 'a fresh url for the new chapter');
    assert.equal(h.objectUrls.revoked.filter((u) => u === first).length, 1,
      'the previous url is revoked exactly once — not leaked, not double-revoked');
    assert.ok(!h.objectUrls.revoked.includes(second), 'and the live one is not revoked');
  } finally { h.dispose(); }
});

// ══ delayed publication vs a newer selection (.162) ════════════════════════════
// External review asked for Progress/Presence failure-isolation coverage. Checking
// the REAL signatures first changed the answer: every Presence method and every
// Progress method except one is SYNCHRONOUS (returns undefined), so "the publication
// is still in flight" is not a state those APIs can be in, and rejecting them would
// test an interface that does not exist. `Progress.refresh()` is the single genuinely
// async surface — and it cannot reject, because poll() swallows in an outer catch.
// So this is the one honest scenario at this seam.
test('a Progress.refresh still in flight cannot disturb a newer selection (.162)', async () => {
  const h = boot();
  try {
    await settle(h);
    h.publications.deferNext('progress.refresh');
    tapBook(h, 'bookA');
    await settle(h);
    h.audio.reachPlaying(100);
    await settle(h, 30);                    // the render tick drives Progress.refresh()

    const inflight = h.publications.find('progress.refresh');
    if (!inflight) return;                  // refresh not driven in this window — nothing to assert

    tapBook(h, 'bookB');                    // newer selection while the read is pending
    await settle(h);
    const srcAfterB = h.audio.src;
    const loadsAfterB = loads(h);

    h.publications.settle('progress.refresh');   // the stale read finally completes
    await settle(h, 20);

    assert.equal(h.audio.src, srcAfterB, 'a completing peer read must not change the source');
    assert.equal(loads(h), loadsAfterB, 'nor reload the element');
    assert.match(h.audio.src, /bookB/, 'the newer selection still owns playback');
  } finally { h.dispose(); }
});
