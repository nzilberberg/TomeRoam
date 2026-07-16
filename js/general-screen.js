// general-screen.js — the General settings sub-screen: this device's identity plus
// app-lifecycle bits (auto-update, sign out). A filmstrip sub-screen of the Options
// hub; static #general markup in index.html.
//
// The App-update BUTTON (#optUpdate) is deliberately NOT owned here — it's driven by
// app-update lifecycle from OUTSIDE settings (native OTA events / the SW), so app.js
// keeps binding it by id wherever it lives. This screen owns the device rename, the
// "Auto update on launch" toggle (a Settings value, mirrored to the native boot pref),
// and Sign out. app.js injects Settings/Presence and the onSignOut teardown + onBack.
const GeneralScreen = (() => {
  // Injected by app.js: { byId, Settings, Presence, onSignOut, onBack }
  let d = null;
  let bound = false;

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

  function bindControls() {
    if (bound) return;
    const S = d.Settings, $ = d.byId;
    const back = $('gnBack'); if (back) back.addEventListener('click', () => d.onBack());
    // Auto update on launch (APK): also push the new value into the native boot pref.
    $('optAutoUpdate').addEventListener('click', () => {
      const on = S.autoUpdate;
      S.setAutoUpdate(!on);
      $('optAutoUpdate').setAttribute('aria-checked', on ? 'false' : 'true');
      try { if (window.TomeRoamNative && TomeRoamNative.setAutoUpdate) TomeRoamNative.setAutoUpdate(!on); } catch { /* PWA: no native bridge */ }
    });
    $('signout').addEventListener('click', () => { if (!confirm('Sign out of Plex?')) return; d.onSignOut(); });
    bound = true;
  }

  function init(deps) { d = deps; }

  function render() {
    const S = d.Settings, $ = d.byId;
    bindControls();
    renderDeviceName();
    $('optAutoUpdate').setAttribute('aria-checked', S.autoUpdate ? 'true' : 'false');
  }

  return { init, render, renderDeviceName };
})();

if (typeof window !== 'undefined') window.GeneralScreen = GeneralScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = GeneralScreen;
