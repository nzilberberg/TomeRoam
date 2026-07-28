// LOKI PROBE (disposable) — Stage 6g reveal promise.
// Boots the REAL js/nav.js against the REAL index.html (jsdom), parks #home the way
// setView does when a browse view is current, plants a hostile inline translateX (the
// worst state a swipe could leave), then runs the exact reveal reconcile every swipe
// finalize path performs: applyScreen({v:'home'}).
// KILL condition: after the reveal, #home carries inline transform 'none' (inline none
// would beat the stylesheet base `#home { transform: translateZ(0) }`), or `.parked`
// survives, or any mid-path write sets an inline 'none'.
// HELD condition: `.parked` removed and inline transform === '' (stylesheet governs).
const path = require('node:path');
const ROOT = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const { appDom } = require(path.join(ROOT, 'test/dom-fixture.js'));
const Nav = require(path.join(ROOT, 'js/nav.js'));

const dom = appDom();
const document = dom.window.document;
global.document = document;   // nav.js resetSwipeStyles uses document.querySelectorAll
global.window = dom.window;

const byId = (id) => document.getElementById(id);
Nav.init({
  byId,
  isSignedIn: () => true,
  updatePlayerUI: () => {},
  renderScreen: () => {},
  renderNowPlaying: () => {},
  renderBrowse: () => {},
  currentDesc: () => ({ v: 'home' }),
});

// Record EVERY inline transform value ever assigned to #home during the reveal.
const home = byId('home');
const writes = [];
const proto = Object.getPrototypeOf(home.style);
// jsdom: style.transform assignment goes through CSSStyleDeclaration.setProperty path;
// intercept via a Proxy is messy — instead poll after, and ALSO wrap setProperty.
const realSet = home.style.setProperty.bind(home.style);
home.style.setProperty = (p, v, prio) => { if (p === 'transform') writes.push(String(v)); return realSet(p, v, prio); };
// Direct `.transform =` assignments in nav.js do not use setProperty in jsdom; capture
// them by defining an accessor on the instance's style object is not possible, so we
// assert on the FINAL inline value plus a mid-call check via a MutationObserver.
let styleAttrValues = [];
const mo = new dom.window.MutationObserver((muts) => {
  for (const m of muts) if (m.attributeName === 'style') styleAttrValues.push(home.getAttribute('style') || '');
});
mo.observe(home, { attributes: true, attributeFilter: ['style', 'class'] });

// ── Arrange: the parked state a books view leaves behind, plus hostile leftovers a
// wedged swipe could theoretically leave on the REAL #home.
home.classList.add('parked');
byId('browse').classList.remove('hidden');
home.style.transform = 'translateX(371px)';   // hostile inline leftover

// ── Act: the reveal reconcile — the exact call at app.js:1171/1207/1212 & begin() 442.
Nav.applyScreen({ v: 'home' }, { render: false });

// Flush observer queue.
setTimeout(() => {
  mo.disconnect();
  const inline = home.style.transform;            // '' = stylesheet governs (HELD)
  const parked = home.classList.contains('parked');
  const sawNone = writes.some((v) => v.trim() === 'none')
    || styleAttrValues.some((s) => /transform:\s*none/.test(s));
  console.log('parked-after-reveal =', parked);
  console.log('inline-transform-after-reveal =', JSON.stringify(inline));
  console.log('inline-none-ever-written =', sawNone);
  console.log('style-attr-trail =', JSON.stringify(styleAttrValues));
  if (!parked && inline === '' && !sawNone) console.log('VERDICT-PROBE: HELD');
  else console.log('VERDICT-PROBE: KILL');
}, 0);
