// Tests for js/logic.js — the pure decision logic the app delegates to.
const { test } = require('node:test');
const assert = require('node:assert');
const L = require('../js/logic.js');

// ---- fmt / fmtBytes ---------------------------------------------------------
test('fmt renders m:ss under an hour and h:mm:ss over', () => {
  assert.equal(L.fmt(0), '0:00');
  assert.equal(L.fmt(59), '0:59');
  assert.equal(L.fmt(61), '1:01');
  assert.equal(L.fmt(3599), '59:59');
  assert.equal(L.fmt(3600), '1:00:00');
  assert.equal(L.fmt(3661), '1:01:01');
});
test('fmt clamps negatives and junk to 0:00', () => {
  assert.equal(L.fmt(-5), '0:00');
  assert.equal(L.fmt(undefined), '0:00');
  assert.equal(L.fmt(NaN), '0:00');
});
test('fmtBytes switches units at 1 GiB', () => {
  assert.equal(L.fmtBytes(30 * 1024 * 1024), '30.0 MB');
  assert.equal(L.fmtBytes(2 * 1024 * 1024 * 1024), '2.00 GB');
});

// (pickNextBank tests removed with the function: app.js's nextToBank had long
// since replaced it, so these were asserting dead code — false coverage.)

// ---- livePos (position extrapolation) -----------------------------------------
test('livePos: paused device reports its anchored position', () => {
  assert.equal(L.livePos({ state: 'paused', pos: 5000, at: 0 }, 999999), 5000);
});
test('livePos: playing device extrapolates at its speed', () => {
  assert.equal(L.livePos({ state: 'playing', pos: 1000, at: 90000, speed: 1 }, 100000), 11000);
  assert.equal(L.livePos({ state: 'playing', pos: 1000, at: 90000, speed: 2 }, 100000), 21000);
});
test('livePos: clock skew backwards never rewinds the estimate', () => {
  assert.equal(L.livePos({ state: 'playing', pos: 1000, at: 100000 }, 90000), 1000);
});
test('livePos: missing fields default sanely', () => {
  assert.equal(L.livePos(null, 100), 0);
  assert.equal(L.livePos({ state: 'playing' }, 100), 100);   // pos 0, at 0, speed 1 → now
  assert.equal(L.livePos({ playState: 'playing', pos: 10, at: 50 }, 60), 20);   // self-state key variant
});

// ---- recency --------------------------------------------------------------------
test('recency: playing = now, paused = last event, junk = 0', () => {
  assert.equal(L.recency({ state: 'playing', at: 5 }, 777), 777);
  assert.equal(L.recency({ state: 'paused', at: 5 }, 777), 5);
  assert.equal(L.recency(null, 777), 0);
});

// ---- filterPeers (board hygiene) --------------------------------------------------
test('filterPeers drops self, idle, unparsed, and playing ghosts', () => {
  const now = 200000, GHOST = 90000;
  const peers = [
    null,                                                        // unparseable board
    { id: 'me', state: 'playing', at: now },                     // ourselves
    { id: 'a', state: 'idle', at: now },                         // idle board
    { id: 'b', state: 'playing', at: now - GHOST - 1 },          // playing ghost (crashed)
    { id: 'c', state: 'playing', at: now - 1000 },               // live player — keep
    { id: 'd', state: 'paused', at: 5 },                         // ancient pause — keep (pause is durable)
  ];
  const out = L.filterPeers(peers, 'me', now, GHOST);
  assert.deepEqual(out.map((p) => p.id), ['c', 'd']);
});

// ---- mergePeers (incomplete-listing resilience) -------------------------------------
// These cover the OPEN cross-device stale-sync bug: on the relay-degraded device
// the /playlists listing returns late or partial, and assigning it erased a LIVE
// peer — which is what made resume fall back to a ~10s-old durable position.

// MUTATION: revert presence.js to `peers = filterPeers(...)` (i.e. make mergePeers
// return only the fresh set) → RED. This is the bug itself.
test('mergePeers: an incomplete listing does NOT erase a live peer (the ~10s stale-resume bug)', () => {
  const now = 200000, GHOST = 90000;
  const prev = [{ id: 'phone', state: 'playing', book: '8913', pos: 275900, at: now - 10000, speed: 1 }];
  const out = L.mergePeers(prev, [], 'me', now, GHOST);          // the listing came back empty
  assert.equal(out.length, 1, 'the peer survives a listing that simply failed to include it');
  assert.equal(out[0].stale, true, 'and is marked as unconfirmed by this read');
  // The retained anchor is what lets resume EXTRAPOLATE instead of falling back.
  assert.equal(L.livePos(out[0], now), 285900, 'extrapolated forward ~10s, not the raw 275900 anchor');
  assert.equal(L.recency(out[0], now), now, 'a retained playing peer still reads as live');
});

// MUTATION: drop the `seen` check (retain by absence from the FILTERED set rather
// than the RAW read) → an explicit idle would be resurrected from prev and this
// goes RED. An intentional stop must always win.
test('mergePeers: an explicit idle in the read REMOVES the peer, never resurrected from cache', () => {
  const now = 200000, GHOST = 90000;
  const prev = [{ id: 'phone', state: 'playing', book: '8913', pos: 1000, at: now - 1000 }];
  const out = L.mergePeers(prev, [{ id: 'phone', state: 'idle', at: now }], 'me', now, GHOST);
  assert.deepEqual(out, [], 'the peer said idle — it is gone, not retained');
});

// MUTATION: skip the aging re-check on retained peers → a long-dead peer is kept
// forever and this goes RED. Retention must not widen the existing ghost window.
test('mergePeers: retention does not outlive the ghost window', () => {
  const now = 200000, GHOST = 90000;
  const dead = [{ id: 'phone', state: 'playing', book: '1', pos: 0, at: now - GHOST - 1 }];
  assert.deepEqual(L.mergePeers(dead, [], 'me', now, GHOST), [], 'a ghost ages out exactly as before');
});

// MUTATION: push retained peers BEFORE the fresh set / prefer prev on conflict →
// RED. A peer present in the read must always use the read's data.
test('mergePeers: a peer present in the read uses the FRESH data, never the cached copy', () => {
  const now = 200000, GHOST = 90000;
  const prev = [{ id: 'phone', state: 'playing', book: '1', pos: 1000, at: now - 5000 }];
  const fresh = { id: 'phone', state: 'paused', book: '1', pos: 60000, at: now - 100 };
  const out = L.mergePeers(prev, [fresh], 'me', now, GHOST);
  assert.equal(out.length, 1, 'no duplicate');
  assert.equal(out[0].pos, 60000, 'the fresh position wins');
  assert.equal(out[0].state, 'paused');
  assert.ok(!out[0].stale, 'and it is not marked stale — this read confirmed it');
});

// Retention means findSuperseder() now also runs against RETAINED peers, so it is
// fair to ask whether a phantom can pause you. It cannot, and this pins why:
// supersede requires the peer's claim to be NEWER than ours, so once we have
// claimed (pressed play) a retained peer can never win. The only state retention
// prolongs is one we were already in — superseded and paused — which pressing play
// clears by re-claiming. Composed here as pure logic on purpose: driving it through
// Presence.claimPlaying leaves a timer that hangs the whole test run.
//
// MUTATION: have mergePeers re-stamp a retained peer's claim, or drop the claim
// comparison in findSuperseder → RED.
test('a RETAINED peer cannot supersede a device that has claimed more recently', () => {
  const now = 200000, GHOST = 90000;
  const prev = [{ id: 'phone', state: 'playing', book: '8913', pos: 1000, at: now - 5000, claim: now - 20000 }];
  const peers = L.mergePeers(prev, [], 'me', now, GHOST);        // board absent → retained
  assert.equal(peers.length, 1, 'the peer IS retained (else this proves nothing)');
  assert.equal(peers[0].stale, true);
  // Our claim is newer than the peer's but STRICTLY BELOW `now`, so a mutation
  // that re-stamps retained peers with the current clock actually beats it. With
  // `claim: now` the two would tie, `>` would stay false, and this test would
  // pass under the very bug it exists to catch.
  const st = { playState: 'playing', book: '8913', claim: now - 1000 };
  assert.equal(L.findSuperseder(peers, st), null, 'an older claim never supersedes us');
  // …and retention does not weaken a legitimate supersede: a peer that really did
  // claim later still wins, exactly as before.
  const newer = L.mergePeers([Object.assign({}, prev[0], { claim: now })], [], 'me', now, GHOST);
  assert.ok(L.findSuperseder(newer, { playState: 'playing', book: '8913', claim: now - 1000 }), 'a newer claim still wins');
});

// ---- findSuperseder (claim-based handoff) -------------------------------------------
test('supersede: newer claim on the same book wins', () => {
  const st = { playState: 'playing', book: 42, claim: 100 };
  const winner = { id: 'x', state: 'playing', book: '42', claim: 200 };   // string/number tolerant
  assert.equal(L.findSuperseder([winner], st), winner);
});
test('supersede: no winner for older claims, other books, plain paused peers, or when we are not playing', () => {
  const st = { playState: 'playing', book: 42, claim: 100 };
  assert.equal(L.findSuperseder([{ state: 'playing', book: 42, claim: 50 }], st), null);
  assert.equal(L.findSuperseder([{ state: 'playing', book: 7, claim: 200 }], st), null);
  assert.equal(L.findSuperseder([{ state: 'paused', book: 42, claim: 200 }], st), null);   // plain pause doesn't take over
  assert.equal(L.findSuperseder([{ state: 'playing', book: 42, claim: 200 }], { ...st, playState: 'paused' }), null);
  assert.equal(L.findSuperseder([], st), null);
});
test('supersede: a paused peer that GRABBED (scrub-handoff) with a newer claim wins', () => {
  const st = { playState: 'playing', book: 42, claim: 100 };
  const grabber = { id: 'x', state: 'paused', g: 1, book: 42, claim: 200 };
  assert.equal(L.findSuperseder([grabber], st), grabber);
  assert.equal(L.findSuperseder([{ state: 'paused', g: 1, book: 42, claim: 50 }], st), null);   // grab but older → no
});

// ---- pickResume (handoff / resume arbitration) --------------------------------------
test('pickResume: the newest timestamp wins', () => {
  const out = L.pickResume([
    { track: 'a', pos: 100, ts: 10 },
    { track: 'b', pos: 200, ts: 30 },
    { track: 'c', pos: 300, ts: 20 },
  ]);
  assert.deepEqual(out, { track: 'b', pos: 200, ts: 30 });
});
test('pickResume: first-listed wins a timestamp TIE (list order encodes trust)', () => {
  const out = L.pickResume([
    { track: 'durable', pos: 111, ts: 50 },
    { track: 'mine', pos: 222, ts: 50 },
  ]);
  assert.equal(out.track, 'durable');
});
test('pickResume: skips nulls; an empty list is a null anchor at 0', () => {
  assert.deepEqual(L.pickResume([]), { track: null, pos: 0, ts: -Infinity });
  assert.deepEqual(L.pickResume([null, { track: 'x', pos: 5, ts: 0 }]), { track: 'x', pos: 5, ts: 0 });
});

// ---- fitLines / chunkText (log pipe payloads) -----------------------------------------
test('fitLines keeps the newest contiguous tail within budget', () => {
  const lines = ['aaaa', 'bbbb', 'cccc', 'dddd'];               // 5 chars each with \n
  assert.deepEqual(L.fitLines(lines, 10), { lines: ['cccc', 'dddd'], dropped: 2 });
  assert.deepEqual(L.fitLines(lines, 100), { lines, dropped: 0 });
  assert.deepEqual(L.fitLines(lines, 3), { lines: [], dropped: 4 });
  assert.deepEqual(L.fitLines([], 100), { lines: [], dropped: 0 });
});
test('chunkText splits exactly and never returns zero chunks', () => {
  assert.deepEqual(L.chunkText('abcdef', 4), ['abcd', 'ef']);
  assert.deepEqual(L.chunkText('abcd', 4), ['abcd']);
  assert.deepEqual(L.chunkText('', 4), ['']);
});

// ---- homeFeeds (Continue Listening + Recently Added derivation) -------------
const RA = (r) => r.recentlyAdded.map((b) => b.ratingKey);
const CL = (r) => r.cont.map((b) => b.ratingKey);

test('homeFeeds: Continue Listening = played books, most-recent lastViewedAt first', () => {
  const books = [
    { ratingKey: 'a', lastViewedAt: 10, addedAt: 1 },
    { ratingKey: 'b', lastViewedAt: 0, addedAt: 2 },   // never played → not in CL
    { ratingKey: 'c', lastViewedAt: 30, addedAt: 3 },
    { ratingKey: 'd', lastViewedAt: 20, addedAt: 4 },
  ];
  assert.deepEqual(CL(L.homeFeeds(books, {})), ['c', 'd', 'a']);   // 30,20,10
});

test('homeFeeds: resume entries add un-played books and their ts outranks lastViewedAt', () => {
  const books = [
    { ratingKey: 'a', lastViewedAt: 10, addedAt: 1 },
    { ratingKey: 'e', lastViewedAt: 0, addedAt: 2 },   // only known via the plugin resume map
  ];
  const entries = { e: { ts: 99 }, a: { ts: 5 } };     // e is newest by plugin ts
  assert.deepEqual(CL(L.homeFeeds(books, entries)), ['e', 'a']);
});

test('homeFeeds: Recently Added = newest by addedAt, capped at limit', () => {
  const books = [
    { ratingKey: 'a', addedAt: 1 }, { ratingKey: 'b', addedAt: 4 },
    { ratingKey: 'c', addedAt: 3 }, { ratingKey: 'd', addedAt: 2 },
  ];
  assert.deepEqual(RA(L.homeFeeds(books, {}, 2)), ['b', 'c']);     // top 2 by addedAt
});

test('homeFeeds: tolerates empty/null inputs', () => {
  assert.deepEqual(L.homeFeeds(null, null), { cont: [], recentlyAdded: [] });
  assert.deepEqual(L.homeFeeds([], {}), { cont: [], recentlyAdded: [] });
});

test('homeFeeds: a resume entry for an unknown book is ignored (filterPeers-style safety)', () => {
  const books = [{ ratingKey: 'a', lastViewedAt: 5, addedAt: 1 }];
  const r = L.homeFeeds(books, { zzz: { ts: 100 } });   // 'zzz' not in library
  assert.deepEqual(CL(r), ['a']);
});

// ---- displaySpeed (the .38–.51 launch-flash guard) --------------------------
// The tile / Now-Playing "remaining" time is remaining / displaySpeed(). The bug
// was deriving it from audio.playbackRate, which the browser resets to 1 on every
// track load → the remaining flashed 1x->Nx on launch. displaySpeed accepts ONLY
// intended-speed sources; these pin that and guard against a regression.
test('displaySpeed prefers the mounted control rate', () => {
  assert.equal(L.displaySpeed(1.5, 2), 1.5);
});
test('displaySpeed falls back to saved speed when there is no control rate', () => {
  assert.equal(L.displaySpeed(null, 1.5), 1.5);
  assert.equal(L.displaySpeed(undefined, 2), 2);
});
test('displaySpeed defaults to 1 when neither source is valid', () => {
  assert.equal(L.displaySpeed(null, NaN), 1);
  assert.equal(L.displaySpeed(null, null), 1);
});
test('displaySpeed ignores a zero/negative control rate and falls through', () => {
  assert.equal(L.displaySpeed(0, 1.5), 1.5);
  assert.equal(L.displaySpeed(-1, 1.5), 1.5);
  assert.equal(L.displaySpeed(0, NaN), 1);
});
// GUARD: the signature is (speedCtlRate, savedSpeed) — two INTENDED-speed sources,
// no element rate. Reintroducing audio.playbackRate as a source would have to add a
// parameter here, tripping this test and forcing a deliberate, visible change.
test('displaySpeed takes exactly two args (no element-rate source)', () => {
  assert.equal(L.displaySpeed.length, 2);
});

// ---- positionRecordable (explicit-zero persistence guard) -------------------
// A bare "position truthy" guard dropped an explicit seek to exactly 0, so
// durable progress + Plex kept the old spot. allowZero lets an explicit user
// action persist 0 while incidental load/transition zeros still don't.
test('positionRecordable records any positive position (allowZero irrelevant)', () => {
  assert.equal(L.positionRecordable(12.3, false), true);
  assert.equal(L.positionRecordable(0.001, false), true);
});
test('positionRecordable DROPS an incidental zero (no explicit flag)', () => {
  assert.equal(L.positionRecordable(0, false), false);
  assert.equal(L.positionRecordable(0, undefined), false);
});
test('positionRecordable KEEPS an explicit zero (user seek/restart/grab)', () => {
  assert.equal(L.positionRecordable(0, true), true);
});
test('positionRecordable rejects NaN/Infinity regardless of allowZero', () => {
  assert.equal(L.positionRecordable(NaN, true), false);
  assert.equal(L.positionRecordable(Infinity, true), false);
});

// ---- retryStillCurrent (stream-retry supersession guard) --------------------
// A stream retry that awaits a reprobe must be dropped if the user did anything
// explicit meanwhile. loadGen catches a new load; intentGen catches a seek/skip/
// grab that does NOT start a load (the case the .89 loadGen-only guard missed).
test('retryStillCurrent proceeds only when BOTH generations are unchanged', () => {
  assert.equal(L.retryStillCurrent(5, 5, 2, 2), true, 'nothing changed → retry fires');
});
test('retryStillCurrent drops the retry when a new load happened (loadGen moved)', () => {
  assert.equal(L.retryStillCurrent(5, 6, 2, 2), false);
});
test('retryStillCurrent drops the retry when an explicit seek/grab happened (intentGen moved)', () => {
  assert.equal(L.retryStillCurrent(5, 5, 2, 3), false, 'a mid-reprobe seek supersedes — this is the .89 gap');
});
test('retryStillCurrent drops the retry when both moved', () => {
  assert.equal(L.retryStillCurrent(5, 7, 2, 4), false);
});

// ---- resumeAdoptPlan (peer-adoption transition decision) --------------------
// Regression for the .92 bug: `trackChanged` was re-read from ctx AFTER startTrack
// set ctx.idx = peerIdx, so it was always false and the new presence track was
// never published → the mesh saw the OLD chapter at the new position. The decision
// must come from the indices, computed before any mutation.
test('resumeAdoptPlan: different chapter → trackChanged + reload (publish new track)', () => {
  assert.deepEqual(L.resumeAdoptPlan(0, 3, false), { trackChanged: true, reload: true });
});
test('resumeAdoptPlan: same chapter, healthy → seek+play in place (no reload, no track change)', () => {
  assert.deepEqual(L.resumeAdoptPlan(2, 2, false), { trackChanged: false, reload: false });
});
test('resumeAdoptPlan: same chapter but ERRORED → reload in place, track unchanged', () => {
  assert.deepEqual(L.resumeAdoptPlan(2, 2, true), { trackChanged: false, reload: true });
});
test('resumeAdoptPlan: different chapter AND errored → still one track-changing reload', () => {
  assert.deepEqual(L.resumeAdoptPlan(1, 4, true), { trackChanged: true, reload: true });
});

// ---- shouldReloadOnRestore (lock-screen resume-kill guard) ------------------
// restoreLastPlayed used to ALWAYS startTrack() (empty+reload the element). When
// enterApp re-fires mid-playback, the saved track is already live — a reload with
// autoplay off left it paused (lock-screen "play-from-paused fails"). Reload ONLY
// when the live element isn't already on the saved book+track.
test('shouldReloadOnRestore: element already live on the saved track → NO reload', () => {
  assert.equal(L.shouldReloadOnRestore('bk', 't2', 'bk', 't2', true), false);
});
test('shouldReloadOnRestore: no live element (cold entry) → reload', () => {
  assert.equal(L.shouldReloadOnRestore('bk', 't2', null, null, false), true);
  assert.equal(L.shouldReloadOnRestore('bk', 't2', 'bk', 't2', false), true, 'errored/empty element is not worth keeping');
});
test('shouldReloadOnRestore: live element but a DIFFERENT track/book → reload', () => {
  assert.equal(L.shouldReloadOnRestore('bk', 't2', 'bk', 't5', true), true, 'different chapter');
  assert.equal(L.shouldReloadOnRestore('bk', 't2', 'other', 't2', true), true, 'different book');
});
test('shouldReloadOnRestore: compares as strings (numeric vs string keys)', () => {
  assert.equal(L.shouldReloadOnRestore(8913, 42, '8913', '42', true), false);
});

// ---- restoreStillCurrent (restore-vs-newer-playback supersession guard) ------
// restoreLastPlayed reassigns the global ctx BEHIND an async metadata read. If the
// user starts another book / skips / auto-advances while it's in flight, the resolved
// restore must NOT clobber the newer playback. Current only when neither a newer
// restore (restoreGen) nor a real load (loadGen, bumped by every startTrack) moved.
test('restoreStillCurrent proceeds only when both restore + load generations are unchanged', () => {
  assert.equal(L.restoreStillCurrent(3, 3, 7, 7), true, 'nothing raced → apply the restore');
});
test('restoreStillCurrent bails when a startTrack ran during the fetch (loadGen moved)', () => {
  assert.equal(L.restoreStillCurrent(3, 3, 7, 8), false, 'another book/chapter loaded → keep it');
});
test('restoreStillCurrent bails when a newer restore superseded this one (restoreGen moved)', () => {
  assert.equal(L.restoreStillCurrent(3, 4, 7, 7), false);
});
test('restoreStillCurrent bails when both moved', () => {
  assert.equal(L.restoreStillCurrent(3, 5, 7, 9), false);
});

// ---- banking retry backoff (pure) -------------------------------------------
test('bankNoteFailure increments attempts and schedules backoff 2/5/15/30s (then capped)', () => {
  let e = L.bankNoteFailure(undefined, 1000);
  assert.equal(e.attempts, 1);
  assert.equal(e.nextAtMs, 1000 + 2000);           // 1st failure → 2s
  e = L.bankNoteFailure(e, 5000);
  assert.equal(e.attempts, 2);
  assert.equal(e.nextAtMs, 5000 + 5000);           // 2nd → 5s
  e = L.bankNoteFailure(e, 0);   assert.equal(e.attempts, 3); assert.equal(e.nextAtMs, 15000);  // 3rd → 15s
  e = L.bankNoteFailure(e, 0);   assert.equal(e.attempts, 4); assert.equal(e.nextAtMs, 30000);  // 4th → 30s
  e = L.bankNoteFailure(e, 0);   assert.equal(e.attempts, 5); assert.equal(e.nextAtMs, 30000);  // capped at 30s
});

test('bankRetryReady: no record OR elapsed backoff = ready; still-cooling = not ready', () => {
  assert.equal(L.bankRetryReady(undefined, 1000), true);            // never failed
  assert.equal(L.bankRetryReady({ attempts: 1, nextAtMs: 5000 }, 4999), false);  // still cooling
  assert.equal(L.bankRetryReady({ attempts: 1, nextAtMs: 5000 }, 5000), true);   // exactly due
  assert.equal(L.bankRetryReady({ attempts: 1, nextAtMs: 5000 }, 6000), true);   // past due
});
