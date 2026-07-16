// nowplaying-screen.js — the full-screen Now-Playing player, extracted from
// app.js. Review #20 (screen ownership) — the LAST and most playback-critical
// screen. Same injected-accessor pattern as the other screens, but a bigger
// surface: it's a second face of the transport, so it consumes a "transport API"
// (playback actions + speed sync) that app.js owns and the mini-transport bar
// shares. The shared render helpers it needs — setArt / paintSeek / skipSvg /
// playPauseSvg / bookTimes — are ALSO used by the mini bar, so they stay in
// app.js and are injected here (one copy each).
//
// This owns: the render, the live seek/times tick (update — called from the
// ~4x/sec timeupdate path while npOpen), the play icon, the control row, the
// speed control (npSpeedCtl, pushed into the shared speedCtls so all controls
// stay in sync), and the download button. It reads live playback state (ctx /
// audio / curLoad) through injected getters. Behaviour-preserving: WHERE it
// lives, not WHAT it does — needs an on-device playback check.
const NowPlayingScreen = (() => {
  // Injected by app.js:
  //   state:   getCtx, getCurLoad, audio (the <audio> element)
  //   speed:   onSpeedChange, speedCtls (shared array), spd
  //   render:  byId, setArt, paintSeek, fmt, bookTimes, playPauseSvg, skipSvg
  //   actions: prevTrack, nextTrack, skipBy, resumePlay, userPause, goBack, getSkipBack, getSkipFwd
  //   dl:      applyDlBtn, dlBtnAction, openBookMenu
  let d = null;
  let npSpeedCtl = null;

  function render() {
    const $ = d.byId, ctx = d.getCtx(), audio = d.audio;
    if (!ctx) { d.goBack(); return; }
    const t = ctx.tracks[ctx.idx];
    d.setArt($('npArt'), ctx.coverUrl);
    $('npTitle').textContent = ctx.album.title || 'Book';
    $('npAuthor').textContent = ctx.album.parentTitle || '';
    $('npTrack').textContent = t.title || ('Chapter ' + (ctx.idx + 1));
    updateDl();
    buildControls();
    if (!npSpeedCtl) {
      npSpeedCtl = SpeedControl.create({ initial: audio.playbackRate || 1, onChange: d.onSpeedChange });
      $('npSpeedMount').appendChild(npSpeedCtl.el);
      d.speedCtls.push(npSpeedCtl);
    }
    npSpeedCtl.setRate(audio.playbackRate || 1, true);
    update();
  }

  function buildControls() {
    const $ = d.byId, audio = d.audio;
    const c = $('npControls');
    c.innerHTML = `
      <button id="npPrev" class="np-rnd" aria-label="Previous track"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
      <button id="npBack" class="np-skip" aria-label="Skip back">${d.skipSvg('back', d.getSkipBack())}</button>
      <button id="npPlay" class="np-play" aria-label="Play/Pause"></button>
      <button id="npFwd" class="np-skip" aria-label="Skip forward">${d.skipSvg('fwd', d.getSkipFwd())}</button>
      <button id="npNext" class="np-rnd" aria-label="Next track"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>`;
    $('npPrev').onclick = d.prevTrack;
    $('npBack').onclick = () => d.skipBy(-d.getSkipBack());
    $('npPlay').onclick = () => (audio.paused ? d.resumePlay() : d.userPause());
    $('npFwd').onclick = () => d.skipBy(d.getSkipFwd());
    $('npNext').onclick = d.nextTrack;
    updatePlayIcon();
  }

  function updatePlayIcon() {
    const b = d.byId('npPlay');
    if (!b) return;
    b.setAttribute('aria-label', d.audio.paused ? 'Play' : 'Pause');
    b.innerHTML = d.playPauseSvg(d.audio.paused);
  }

  function update() {
    const $ = d.byId, ctx = d.getCtx(), audio = d.audio, curLoad = d.getCurLoad();
    if (!ctx) return;
    const t = ctx.tracks[ctx.idx];
    const cur = audio.currentTime || (curLoad && curLoad.seekSec) || 0;   // known spot during the load window (see updateSeekUI)
    const dur = audio.duration || (t.durationMs || 0) / 1000;
    // INTENDED speed, not audio.playbackRate — the element's rate resets to 1 on
    // track-load until loadedmetadata restores it, which flashed the NP remaining
    // 1x->Nx on launch (same bug spd() fixed for the tiles in build .51).
    const speed = d.spd();
    d.paintSeek($('npSeek'), dur ? (cur / dur) * 100 : 0);
    $('npCur').textContent = d.fmt(cur);
    $('npTrkRem').textContent = '-' + d.fmt(Math.max(0, dur - cur) / speed);   // scaled for speed
    $('npBookRem').textContent = '-' + d.fmt(d.bookTimes().remain / speed);    // whole-book remaining (shared arithmetic)
    updatePlayIcon();
  }

  function updateDl() {
    const $ = d.byId, ctx = d.getCtx();
    const btn = $('npDl'); if (!btn) return;
    if (!ctx || !window.Downloads || !Downloads.available()) { btn.classList.add('hidden'); return; }
    btn.classList.remove('hidden');
    d.applyDlBtn(btn, ctx.book);
  }

  // NP art button: tap acts contextually; long-press opens the shared book menu.
  function bindDownload() {
    const $ = d.byId;
    const btn = $('npDl'); if (!btn) return;
    let lpTimer = null, lp = false;
    const startLp = () => { lp = false; clearTimeout(lpTimer); lpTimer = setTimeout(() => { lp = true; const ctx = d.getCtx(); if (ctx) d.openBookMenu(ctx.book, ctx.album.title); }, 500); };
    const cancelLp = () => clearTimeout(lpTimer);
    btn.addEventListener('pointerdown', startLp);
    btn.addEventListener('pointerup', cancelLp);
    btn.addEventListener('pointerleave', cancelLp);
    btn.addEventListener('click', () => {
      if (lp) { lp = false; return; }
      const ctx = d.getCtx(); if (ctx) d.dlBtnAction(ctx.book, ctx.album.title);
    });
  }

  // Bind the static #npDl button here (like the other screens self-bind in init),
  // so it doesn't depend on app.js's bind() running after this init.
  function init(deps) { d = deps; bindDownload(); }

  return { init, render, update, updatePlayIcon, buildControls, updateDl };
})();

if (typeof window !== 'undefined') window.NowPlayingScreen = NowPlayingScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = NowPlayingScreen;
