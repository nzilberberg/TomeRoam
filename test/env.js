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
  // MUST be defineProperty, NOT assignment — Node >=21 defines globalThis.navigator as
  // a GETTER-ONLY accessor, so `global.navigator = …` silently does nothing in sloppy
  // mode and the modules under test read NODE's navigator instead of this stub
  // (userAgent "Node.js/22", no onLine). presence.js derives the device NAME from
  // navigator.userAgent, so those tests were asserting against Node's UA. Same defect
  // the app harness carried until .154 — this was its second home.
  Object.defineProperty(global, 'navigator', {
    value: { onLine: true, userAgent: 'node-test' }, configurable: true, writable: true,
  });
  return global.localStorage;
}

module.exports = { install, freshStorage };
