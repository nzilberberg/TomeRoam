// LOKI RE-STRIKE PROBE — PLAN-home-shift-fix.md M1 (fix 2, cur.ghostY restore).
// Executes the DESIGN's pinned rules faithfully; a control proves fidelity before the kill.
//
// Pinned rules (source-cited, HEAD 480cf77):
//  [C1] swipe.js:149-150 constructionPlanFor: outgoing = 'app-ghost' iff fromKind is
//       in-flow (home|browse) AND toKind !== 'home'. Only an app-ghost sets ghostY.
//  [C2] swipe.js:289-291 ghostApp(fromKind): ghostY = home.scrollTop if fromKind==='home',
//       browse.scrollTop if 'browse', else window.scrollY. => ghostY is the SOURCE's scroll.
//  [C3] swipe.js:186 finalizationPlanFor: abortRender='rerender' iff fromKind==='browse'
//       && toKind==='browse'; else 'none'. 'rerender' => HELD path (app.js:1200, returns
//       before the fix). 'none' => NO-HOLD abort path (app.js:1223) where the fix lives.
//  [C4] app.js:793 dest = currentDesc(), read FRESH inside runFinalize, which runs at
//       finalize (transitionend / 340ms settleTimer, app.js:1270-1271) — AFTER the settle
//       window, so it sees any navStack move that happened during the settle.
//  [C5] THE FIX (plan §4, no-hold abort branch app.js:1223-1229):
//       applyScreen(dest,{resetScroll:false}); window.scrollTo(0,cur.scroll0);
//       if (dest.v==='home' && cur.ghostY != null) home.scrollTop = cur.ghostY;
//  [C6] end()->settle sets finishing=true (app.js:607) for the ~200-340ms settle; goHome/
//       navTo/applyScreen (nav.js/app.js:138) push navStack + un-park home + reset home
//       scroll to 0, and DO NOT touch finishing/session/settleTimer — the finalize still
//       fires on the 340ms backstop (app.js:1271). park clamps home.scrollTop->0 (css).

const home = { scrollTop: 0, parked: false };
function park()   { home.parked = true; if (home.scrollTop !== 0) home.scrollTop = 0; } // overflow:hidden clamp
function unpark() { home.parked = false; }

let navStack = [{ v: 'home' }];
const currentDesc = () => navStack[navStack.length - 1];

const browse = { scrollTop: 0 };  // the live #browse own-scroll view

// The ghost capture, per [C1]/[C2]. Returns ghostY (source scroll) or null (no app-ghost).
function captureGhostY(from, to) {
  const inFlow = (v) => v === 'home' || v === 'books' || v === 'authors' || v === 'authorBooks' || v === 'files';
  const toKind = to === 'home' ? 'home' : (inFlow(to) ? 'browse' : 'overlay');
  const fromKind = from === 'home' ? 'home' : (inFlow(from) ? 'browse' : 'overlay');
  const appGhost = (fromKind !== 'overlay') && (toKind !== 'home');           // [C1]
  if (!appGhost) return null;
  return fromKind === 'home' ? home.scrollTop : browse.scrollTop;              // [C2]
}
const abortRenderOf = (from, to) => (from !== 'home' && ['books','authors','authorBooks','files'].includes(from)
  && ['books','authors','authorBooks','files'].includes(to)) ? 'rerender' : 'none'; // [C3]

// applyScreen's home branch (nav.js:140) — the only part the restore sites lean on.
function applyScreenHome(resetScroll) { unpark(); if (resetScroll) home.scrollTop = 0; }

// A navbar/brand tap while a gesture lingers (goHome -> navTo -> applyScreen), [C6].
function tapHome() { navStack.push({ v: 'home' }); applyScreenHome(true); } // resetScroll defaults true

// The NO-HOLD abort finalize (app.js:1221-1229) WITH the fix [C5]. `cur` is the aborted gesture.
function abortFinalize(cur) {
  const dest = currentDesc();                                  // [C4] read FRESH at finalize
  if (abortRenderOf(cur.from, cur.dest) === 'rerender') {      // [C3] held path returns early — fix never runs
    return { note: 'HELD path (browse->browse) — fix line not reached' };
  }
  applyScreenHome(false);                                      // dest is home here → un-park, no reset
  // window.scrollTo(0, cur.scroll0)  — document scroll, not home.scrollTop; irrelevant to #home
  if (dest.v === 'home' && cur.ghostY != null) home.scrollTop = cur.ghostY;   // [C5] THE FIX
  return { note: 'no-hold abort finalize ran' };
}

function newGesture(from, dest) {
  home.scrollTop = home.scrollTop; // (capture reads live)
  const ghostY = captureGhostY(from, dest);
  // A browse/home SOURCE going to a non-home dest parks home during the drag (app.js:485).
  if (from !== 'home') park();     // browse-source: home was already parked/offscreen; stays parked/0
  else park();                     // home-source: parked after ghost capture (ghostY holds pre-park)
  return { from, dest, ghostY, scroll0: 0 };
}

const log = [];
const snap = (l) => log.push(`${l.padEnd(52)} home.scrollTop=${String(home.scrollTop).padEnd(5)} parked=${home.parked} currentDesc=${currentDesc().v}`);

// ── CONTROL 1 (fidelity): home->books abort, NO interleave. Must restore ghostY. ──
console.log('CONTROL 1 — home(scroll 500)->books abort, no interleave:');
Object.assign(home, { scrollTop: 0, parked: false }); navStack = [{ v: 'home' }]; log.length = 0;
home.scrollTop = 500;                       snap('user scrolls home to 500');
let g = newGesture('home', 'books');        snap('swipe home->books (ghost captures ghostY=' + g.ghostY + '; park clamps)');
let r = abortFinalize(g);                    snap('ABORT finalize (' + r.note + ')');
console.log(log.join('\n'));
console.log(`=> home restored to ${home.scrollTop}; expected 500 : ${home.scrollTop === 500 ? 'PASS (sim faithful)' : 'SIM UNFAITHFUL'}\n`);

// ── CONTROL 2 (fidelity): browse->options abort, NO interleave. dest=source=books,
//    gate dest.v==='home' is FALSE, home untouched — the fix correctly does nothing. ──
console.log('CONTROL 2 — browse(books)->options abort, no interleave:');
Object.assign(home, { scrollTop: 0, parked: true }); browse.scrollTop = 800;
navStack = [{ v: 'home' }, { v: 'books' }]; log.length = 0;
snap('on books (browse.scrollTop=800), home parked at 0');
g = newGesture('books', 'options');          snap('swipe books->options (ghost captures ghostY=' + g.ghostY + ')');
r = abortFinalize(g);                         snap('ABORT finalize (' + r.note + ')');
console.log(log.join('\n'));
console.log(`=> home.scrollTop=${home.scrollTop}; dest was books so fix skipped : ${home.scrollTop === 0 ? 'PASS (sim faithful)' : 'unexpected'}\n`);

// ── STRIKE: browse(books, scroll 800)->options abort; tap Home DURING the settle;
//    the 340ms settle finalize reads dest=currentDesc()=home and jams the BROWSE scroll
//    onto #home. Two natural actions, deterministic 340ms timer — no second swipe. ──
console.log('STRIKE — browse->options abort, Home tapped during the settle:');
Object.assign(home, { scrollTop: 0, parked: true }); browse.scrollTop = 800;
navStack = [{ v: 'home' }, { v: 'books' }]; log.length = 0;
snap('1. on books, browse.scrollTop=800, home parked at 0');
g = newGesture('books', 'options');           snap('2. swipe books->options armed; ghost ghostY=' + g.ghostY + ' (BROWSE scroll); finishing=true, settling');
tapHome();                                     snap('3. user taps Home during the settle (navStack->home, home un-parked & reset to 0)');
const beganAt = 0; // what home showed when the user landed on it via the Home tap
r = abortFinalize(g);                          snap('4. settle 340ms finalize fires (' + r.note + ')');
console.log(log.join('\n'));
console.log(`\nPROMISE: home shows what it was when the user is on it (${beganAt}); no stale value, no jump.`);
console.log(`OBSERVED: home.scrollTop = ${home.scrollTop}  (a BROWSE list scroll, from cur.ghostY)`);
console.log(home.scrollTop === beganAt
  ? 'PROMISE HELD'
  : `PROMISE BROKEN — the aborted BROWSE gesture's ghostY=${g.ghostY} is written onto #home ~340ms after the Home tap: home lurches from 0 to ${home.scrollTop}px. The gate dest.v==='home' passed because goHome moved currentDesc to home, but cur.ghostY is the browse SOURCE scroll.`);
