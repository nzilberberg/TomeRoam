// playback-screen.js — the Playback settings sub-screen (skip amounts, auto-advance
// behaviour). A filmstrip sub-screen of the Options hub, same pattern as the other
// screen modules: static #playback markup in index.html, this module renders the
// controls from Settings and forwards changes back to it. app.js injects the shared
// bits (updateSkipLabels touches the transport bar; onBack is the nav filmstrip).
const PlaybackScreen = (() => {
  // Injected by app.js: { byId, Settings, updateSkipLabels, onBack }
  let d = null;
  let bound = false;

  const fill = (sel, cur, opts, label) => {
    sel.innerHTML = '';
    opts.forEach((v) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = label ? label(v) : v; if (v === cur) o.selected = true;
      sel.appendChild(o);
    });
  };

  function bindControls() {
    if (bound) return;
    const S = d.Settings, $ = d.byId;
    const back = $('pbBack'); if (back) back.addEventListener('click', () => d.onBack());
    $('optSkipBack').addEventListener('change', (e) => { S.setSkipBackSec(e.target.value); d.updateSkipLabels(); });
    $('optSkipFwd').addEventListener('change', (e) => { S.setSkipFwdSec(e.target.value); d.updateSkipLabels(); });
    // roll-over behaviour (see rollToTrack / recordProgress grace guard in app.js)
    $('optFreshStart').addEventListener('click', () => { const on = S.freshStart; S.setFreshStart(!on); $('optFreshStart').setAttribute('aria-checked', on ? 'false' : 'true'); });
    $('optResetGrace').addEventListener('change', (e) => S.setResetGraceSec(e.target.value));
    bound = true;
  }

  function init(deps) { d = deps; }

  // Fill controls from current Settings — run whenever the screen is shown.
  function render() {
    const S = d.Settings, $ = d.byId;
    bindControls();
    const SKIPS = [5, 10, 15, 20, 30, 45, 60];
    fill($('optSkipBack'), S.skipBackSec, SKIPS);
    fill($('optSkipFwd'), S.skipFwdSec, SKIPS);
    $('optFreshStart').setAttribute('aria-checked', S.freshStart ? 'true' : 'false');
    fill($('optResetGrace'), S.resetGraceSec, [0, 5, 10, 20, 30], (v) => (v === 0 ? 'Now' : v));
  }

  return { init, render };
})();

if (typeof window !== 'undefined') window.PlaybackScreen = PlaybackScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = PlaybackScreen;
