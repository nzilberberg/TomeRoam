// options-screen.js — the Options screen, extracted from app.js so it owns its
// controls' rendering + listeners + the device-name row in one place (was ~50
// lines interleaved into app.js's render + bind). Review #20 (screen ownership),
// same pattern as js/downloads-screen.js.
//
// A VIEW, not logic: it reads Settings and forwards changes to it. app.js keeps
// the shared bits it leans on and injects them via init() so there's one copy of
// each: updateSkipLabels (touches the transport bar), pumpBank (drives banking),
// and onSignOut (the app-lifecycle teardown). The app-update button (#optUpdate)
// is deliberately NOT owned here — it's app-update lifecycle triggered from
// OUTSIDE Options (native OTA events / the SW), so app.js keeps it.
const OptionsScreen = (() => {
  // Injected by app.js: { byId, Settings, Presence, updateSkipLabels, pumpBank, onSignOut }
  let d = null;

  const fill = (sel, cur, opts, label) => {
    sel.innerHTML = '';
    opts.forEach((v) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = label ? label(v) : v; if (v === cur) o.selected = true;
      sel.appendChild(o);
    });
  };

  // "This device: <name>  (rename)". Also called by app.js when presence inits.
  function renderDeviceName() {
    const el = d.byId('deviceName');
    if (!el) return;
    el.textContent = 'This device: ' + d.Presence.name() + '  (rename)';
    el.onclick = () => {
      const n = prompt('Name this device (shows on your other devices):', d.Presence.name());
      if (n) { d.Presence.setName(n); renderDeviceName(); }
    };
  }

  // Fill the controls from current Settings — run whenever the screen is shown.
  function render() {
    const S = d.Settings, $ = d.byId;
    renderDeviceName();
    const SKIPS = [5, 10, 15, 20, 30, 45, 60];
    fill($('optSkipBack'), S.skipBackSec, SKIPS);
    fill($('optSkipFwd'), S.skipFwdSec, SKIPS);
    // Banking toggles (Model B): whole-bank the current chapter and/or prefetch
    // ahead. The shared buffer-space budget they draw from is on the Downloads screen.
    $('optBufCurrent').setAttribute('aria-checked', S.bufferCurrent ? 'true' : 'false');
    $('optBufAhead').setAttribute('aria-checked', S.bufferAhead ? 'true' : 'false');
    $('optFreshStart').setAttribute('aria-checked', S.freshStart ? 'true' : 'false');
    $('optAutoUpdate').setAttribute('aria-checked', S.autoUpdate ? 'true' : 'false');
    fill($('optResetGrace'), S.resetGraceSec, [0, 5, 10, 20, 30], (v) => (v === 0 ? 'Now' : v));
  }

  // Wire the control listeners once — the #options elements are static in index.html.
  function bindControls() {
    const S = d.Settings, $ = d.byId;
    $('optSkipBack').addEventListener('change', (e) => { S.setSkipBackSec(e.target.value); d.updateSkipLabels(); });
    $('optSkipFwd').addEventListener('change', (e) => { S.setSkipFwdSec(e.target.value); d.updateSkipLabels(); });
    $('optBufCurrent').addEventListener('click', () => { const on = S.bufferCurrent; S.setBufferCurrent(!on); $('optBufCurrent').setAttribute('aria-checked', on ? 'false' : 'true'); d.pumpBank(); });
    $('optBufAhead').addEventListener('click', () => { const on = S.bufferAhead; S.setBufferAhead(!on); $('optBufAhead').setAttribute('aria-checked', on ? 'false' : 'true'); d.pumpBank(); });
    // roll-over behaviour (see rollToTrack / recordProgress grace guard in app.js)
    $('optFreshStart').addEventListener('click', () => { const on = S.freshStart; S.setFreshStart(!on); $('optFreshStart').setAttribute('aria-checked', on ? 'false' : 'true'); });
    $('optResetGrace').addEventListener('change', (e) => S.setResetGraceSec(e.target.value));
    // Auto update on launch (APK): also push the new value into the native boot pref.
    $('optAutoUpdate').addEventListener('click', () => {
      const on = S.autoUpdate;
      S.setAutoUpdate(!on);
      $('optAutoUpdate').setAttribute('aria-checked', on ? 'false' : 'true');
      try { if (window.TomeRoamNative && TomeRoamNative.setAutoUpdate) TomeRoamNative.setAutoUpdate(!on); } catch { /* PWA: no native bridge */ }
    });
    $('signout').addEventListener('click', () => { if (!confirm('Sign out of Plex?')) return; d.onSignOut(); });
  }

  function init(deps) { d = deps; bindControls(); }

  return { init, render, renderDeviceName };
})();

if (typeof window !== 'undefined') window.OptionsScreen = OptionsScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = OptionsScreen;
