// env.js — minimal browser-global stubs so the REAL app files (js/plex.js,
// js/presence.js, js/logic.js) load under Node for the unit tests. Only what
// the modules actually touch: localStorage, window, navigator. No DOM.
function freshStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

function install() {
  global.localStorage = freshStorage();
  global.window = { addEventListener: () => {} };   // modules probe window.PBDebug at call time
  global.navigator = { onLine: true, userAgent: 'node-test' };
  return global.localStorage;
}

module.exports = { install, freshStorage };
