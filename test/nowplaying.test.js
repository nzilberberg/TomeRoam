// NowPlayingScreen.update() side-effect tests. Unlike the app.js playback glue,
// this screen is a standalone injected-deps module, so its actual DOM writes ARE
// testable with a fake byId. Regression for the .93 review finding: a chapter
// transition while Now-Playing is OPEN (peer adoption / auto-advance) routes
// through updatePlayerUI()→update(), which used to refresh time/seek/play-icon but
// NOT the big chapter title, leaving it on the old chapter.
const { test } = require('node:test');
const assert = require('node:assert');
const NowPlayingScreen = require('../js/nowplaying-screen.js');

function makeEnv(ctx) {
  const els = {};
  const el = () => ({ textContent: '', innerHTML: '', style: { setProperty() {} }, setAttribute() {}, classList: { add() {}, remove() {} }, appendChild() {}, addEventListener() {} });
  const byId = (id) => (els[id] || (els[id] = el()));
  const audio = { paused: true, currentTime: 5, duration: 100, playbackRate: 1 };
  NowPlayingScreen.init({
    byId, getCtx: () => ctx, getCurLoad: () => null, audio,
    spd: () => 1, paintSeek() {}, fmt: (s) => String(Math.floor(s || 0)), bookTimes: () => ({ remain: 0 }),
    playPauseSvg: () => '', skipSvg: () => '', onSpeedChange() {}, speedCtls: [],
    prevTrack() {}, nextTrack() {}, skipBy() {}, resumePlay() {}, userPause() {}, goBack() {}, getSkipBack: () => 10, getSkipFwd: () => 10,
    applyDlBtn() {}, dlBtnAction() {}, openBookMenu() {},
  });
  return els;
}

test('update() moves the NP chapter title to the adopted chapter on a transition', () => {
  const ctx = { idx: 0, album: { title: 'Book', parentTitle: 'Auth' }, tracks: [{ title: 'Chapter A' }, { title: 'Chapter B' }], coverUrl: '' };
  const els = makeEnv(ctx);
  NowPlayingScreen.update();
  assert.equal(els.npTrack.textContent, 'Chapter A', 'title reflects the current chapter');
  ctx.idx = 1;                       // peer adoption / auto-advance while NP is open
  NowPlayingScreen.update();
  assert.equal(els.npTrack.textContent, 'Chapter B', 'the big NP title follows the transition (was stale before)');
});

test('update() falls back to "Chapter N" when a track has no title', () => {
  const ctx = { idx: 2, album: {}, tracks: [{}, {}, {}], coverUrl: '' };
  const els = makeEnv(ctx);
  NowPlayingScreen.update();
  assert.equal(els.npTrack.textContent, 'Chapter 3');
});
