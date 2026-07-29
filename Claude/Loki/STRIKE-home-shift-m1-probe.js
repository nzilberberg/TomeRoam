// LOKI STRIKE PROBE — PLAN-home-shift-fix.md M1 (pre-build design trace, executed).
// Implements EXACTLY the design's pinned rules; nothing else.
//
// Pinned rules implemented (plan section cited on each):
//  [P1] §4 mechanism: adding .parked flips overflow-y:auto -> hidden, which clamps
//       #home.scrollTop -> 0. (The premise M1 exists to fix.)
//  [P2] Browser scroll semantics the design leans on (§5 O1): a scroll event fires
//       (async) when an element's scroll offset CHANGES — clamp or programmatic.
//       No change => no event. Handlers read LIVE element state at delivery.
//  [P3] §4 SAVE, verbatim clause: on a scroll event,
//       if (t.id==='home' && !t.classList.contains('parked')) t.dataset.st = t.scrollTop
//  [P4] §4 RESTORE, verbatim line in applyScreen's home branch (after setView('home')
//       removes .parked, nav.js:57):
//       if (resetScroll) home.scrollTop = 0; else home.scrollTop = +home.dataset.st || 0
//  [P5] nav.js:128: resetScroll defaults TRUE (fresh nav: goHome -> navTo -> applyScreen(desc));
//       the abort finalize passes resetScroll:false (app.js:1227).
//  [P6] swipe.js:289: the ghost captures ghostY = home.scrollTop at gesture build —
//       what the user SEES during the whole gesture and at the moment of reveal.

const home = {
  id: 'home',
  scrollTop: 0,
  parked: false,
  dataset: {},
  classList: { contains: (c) => c === 'parked' && home.parked },
};

const eventQueue = [];
function setScrollTop(v) {           // any offset change queues an async scroll event [P2]
  if (home.scrollTop !== v) { home.scrollTop = v; eventQueue.push('scroll'); }
}
function flushEvents() {             // async delivery; recorder reads LIVE state [P2][P3]
  while (eventQueue.length) {
    eventQueue.shift();
    const t = home;
    if (t.id === 'home' && !t.classList.contains('parked')) t.dataset.st = t.scrollTop; // [P3]
  }
}
function park()   { home.parked = true; setScrollTop(0); }   // class added BEFORE clamp fires [P1]
function unpark() { home.parked = false; }                   // un-park restores nothing by itself
function applyScreenHome(resetScroll) {                      // [P4][P5]
  unpark();                                                  // setView('home') first (§5 O2)
  if (resetScroll) setScrollTop(0);
  else setScrollTop(+home.dataset.st || 0);
}

const log = [];
const snap = (label) => log.push(
  `${label.padEnd(46)} scrollTop=${String(home.scrollTop).padEnd(4)} dataset.st=${String(home.dataset.st).padEnd(9)} parked=${home.parked}`);

// ── CONTROL: the design's intended path (§4) — must PASS or the simulator is unfaithful.
console.log('CONTROL — scroll 500, swipe home->books, ABORT:');
home.scrollTop = 0; home.parked = false; home.dataset = {};
setScrollTop(500); flushEvents();               snap('user scrolls home to 500');
const ghostY_c = home.scrollTop;                              // [P6] gesture begins
park(); flushEvents();                          snap('swipe start parks home (clamp; event skipped)');
applyScreenHome(false); flushEvents();          snap('ABORT reveal: applyScreen(home,{resetScroll:false})');
console.log(log.join('\n'));
console.log(`ghost showed ${ghostY_c}; real reveals at ${home.scrollTop} -> ${home.scrollTop === ghostY_c ? 'PASS (design works on its happy path; sim faithful)' : 'SIM UNFAITHFUL — abort strike'}`);

// ── STRIKE: the fresh-nav desync interleaving.
console.log('\nSTRIKE — the resetScroll:true reveal never resyncs dataset.st:');
log.length = 0;
home.scrollTop = 0; home.parked = false; home.dataset = {};
setScrollTop(500); flushEvents();               snap('1. user scrolls home to 500');
park(); flushEvents();                          snap('2. nav to Books (setView parks home; clamp skipped)');
applyScreenHome(true); flushEvents();           snap('3. Home button: applyScreen(home) resetScroll:TRUE');
// scrollTop was already 0 (the park clamped it) -> the reset write is 0->0: NO event [P2],
// recorder never runs, dataset.st is NOT resynced, and the true-branch never clears it [P4].
const beginScroll = home.scrollTop;             // what the user sees as the gesture begins: TOP
const ghostY = home.scrollTop;                  // [P6] ghost shows home at 0 for the whole gesture
snap('4. gesture begins (ghostY captured = ' + ghostY + ')');
park(); flushEvents();                          snap('   swipe start parks home (0->0, no event)');
applyScreenHome(false); flushEvents();          snap('5. ABORT reveal: applyScreen(home,{resetScroll:false})');
console.log(log.join('\n'));
console.log(`\nPROMISE: after the abort, scrollTop === what it was when the gesture began (${beginScroll}).`);
console.log(`OBSERVED: scrollTop = ${home.scrollTop}  (ghost showed ${ghostY} until the drop)`);
console.log(home.scrollTop === beginScroll
  ? 'PROMISE HELD'
  : `PROMISE BROKEN — stale dataset.st=${home.dataset.st} from TWO navigations ago wins the visible reveal: a ${home.scrollTop}px jump the instant the ghost drops.`);
