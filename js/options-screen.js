// options-screen.js — the Options HUB. Once this screen held every setting inline;
// now it's navigation-only: a list of rows (General / Playback / Buffering /
// Downloads / Diagnostics) that each filmstrip into their own sub-screen. The actual
// settings live in the per-screen modules (general/playback/buffering/downloads
// screens; Diagnostics is injected by debug.js + logpipe.js). The build stamp footer
// is appended here by debug.js.
//
// A VIEW, not logic: it just wires each hub row to app.js's openSub(view). app.js
// injects openSub + Downloads (to hide the storage rows when downloads aren't
// available on this device).
const OptionsScreen = (() => {
  // Injected by app.js: { byId, openSub, Downloads }
  let d = null;
  let bound = false;

  function bindControls() {
    if (bound) return;
    const hub = d.byId('optHub');
    if (hub) hub.querySelectorAll('.hubrow[data-sub]').forEach((b) => {
      b.addEventListener('click', () => d.openSub(b.dataset.sub));
    });
    // Downloads + Buffering only make sense where offline storage works.
    if (d.Downloads && !d.Downloads.available()) {
      ['downloads', 'buffering'].forEach((sub) => {
        const row = hub && hub.querySelector(`.hubrow[data-sub="${sub}"]`);
        if (row) row.classList.add('hidden');
      });
    }
    bound = true;
  }

  function init(deps) { d = deps; bindControls(); }

  // The hub is static markup — nothing to (re)render, but applyScreen calls this for
  // the 'options' view, so keep it as a safe no-op.
  function render() {}

  return { init, render };
})();

if (typeof window !== 'undefined') window.OptionsScreen = OptionsScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = OptionsScreen;
