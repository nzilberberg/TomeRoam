// LOKI FINAL STRIKE probe — PLAN-home-shift-fix.md M1, SOURCE-gated design (3rd commission).
// Simulates EXACTLY the pinned rules cited below, at HEAD 5d27739, plus the plan's §4
// designed restore lines (the fix is PRE-BUILD; this is a design trace by construction).
//
// PINNED RULES (all source-verified this commission):
//  R1  navTo (app.js:138-145): same-view descriptor REPLACES the stack top (no push) and
//      STILL calls applyScreen(desc) with DEFAULT opts; fwdStack cleared.
//      goHome() = navTo({v:'home'}, null)  (app.js:155; navbtn click app.js:2873-2875; brand 2880).
//  R2  applyScreen (nav.js:127-155): resetSwipeStyles(opts&&opts.keepGhosts) FIRST (131) —
//      removes every .nav-ghost unless keepGhosts (nav.js:113-114); home branch (140):
//      setView('home'); if (resetScroll) $('home').scrollTop = 0.  resetScroll defaults TRUE (128).
//  R3  setView (nav.js:56-74): home.parked = (v!=='home'); browse.hidden = (v!=='browse').
//  R4  begin() gate (app.js:385): finishing && !(session && paneLess(session)) -> return.
//      An app-ghost session owns a pane (swipe.js:343; app.js:251) -> a tap's touchstart
//      mid-settle is a NO-OP on gesture state.
//  R5  ghost capture (swipe.js:289, buildConstruction outgoing-FIRST 341): ghostY =
//      #home.scrollTop PRE-park; then renderDestination('browse-host') -> showAppView
//      (app.js:484-485) parks home. DEVICE park clamp modeled: .parked drops the bottom
//      inset (css:98-102) -> content-height box -> scrollTop -> 0. (jsdom does NOT clamp —
//      Charpy V1; the STRIKE below is clamp-INDEPENDENT: its 0 comes from nav.js:140's
//      explicit write, its final value from the designed restore. The clamp is modeled
//      only for intermediate-state fidelity.)
//  R6  settle (app.js:603-612, 1269-1271): finishing=true (607); settleTimer 340ms; the
//      transitionend anchor is the ghost wrap — once an external sweep DETACHES it the
//      transition cancels and the 340ms timer is the finalize (modeled).
//  R7  finalize (app.js:1238-1268): done guard; identity guard cur!==session (1257) —
//      nav.js touches neither session nor finishing, so an interleaved nav does NOT stop it.
//  R8  runFinalize abort path (app.js:785-793, 1200, 1210-1229): dest = currentDesc() FRESH
//      (793); home->books abortRender==='none' (swipe.js:186) -> no-hold branch;
//      dropPanes parentNode-guarded (633); applyScreen(dest,{render:false,resetScroll:false});
//      THE DESIGNED LINE (plan §4): if (cur.from.v==='home' && cur.ghostY!=null)
//      $('home').scrollTop = cur.ghostY;  then window.scrollTo(0,cur.scroll0); finishing=false.
//  R9  The DESIGNED recovery line (plan §4, app.js:444 site) is modeled in begin()'s
//      leftover branch for completeness (not exercised by the strike).
//
// Paint model: a paint opportunity closes every task; a paint records what is VISIBLE
// (ghost covering? -> ghost content at ghostY; else the un-parked home at its scrollTop).

'use strict';
const log = (...a) => console.log(...a);

function makeWorld(opts) {
  const designedFix = !!opts.designedFix;   // include the plan §4 restore lines?
  const W = {
    t: 0, timers: [], paints: [],
    navStack: [{ v: 'home' }], fwdStack: [],
    home: { scrollTop: 0, parked: false },
    browse: { scrollTop: 0, hidden: true },
    ghosts: [],                    // [{ghostY, srcV, attached}]
    d: null, session: null, finishing: false,
  };
  const currentDesc = () => W.navStack[W.navStack.length - 1];
  const paneLess = (s) => !s.movers.some((m) => m.own === 'owned-pane');

  // device park clamp (css:98-102) — see R5 note
  const setParked = (p) => { W.home.parked = p; if (p) W.home.scrollTop = 0; };

  const resetSwipeStyles = (keepGhosts) => {
    if (!keepGhosts) W.ghosts.forEach((g) => { g.attached = false; });   // nav.js:113-114
    if (!keepGhosts) W.ghosts.length = 0;
  };
  const setView = (v) => {                                              // nav.js:56-74
    setParked(v !== 'home');
    W.browse.hidden = (v !== 'browse');
  };
  const applyScreen = (desc, o) => {                                    // nav.js:127-155
    const resetScroll = !o || o.resetScroll !== false;
    resetSwipeStyles(o && o.keepGhosts);                                // nav.js:131
    if (!desc || desc.v === 'home') {
      setView('home');
      if (resetScroll) W.home.scrollTop = 0;                            // nav.js:140
      return;
    }
    setView('browse');                                                  // (books path)
  };
  const navTo = (desc) => {                                             // app.js:138-145
    const cur = currentDesc();
    if (cur && cur.v === desc.v && !desc.author && !desc.book) W.navStack[W.navStack.length - 1] = desc;
    else W.navStack.push(desc);
    W.fwdStack.length = 0;
    applyScreen(desc);
  };
  const goHome = () => navTo({ v: 'home' });                            // app.js:155

  // ---- gesture ----
  const begin = (targetIsNavbtn) => {                                   // app.js:374-473
    if (W.finishing && !(W.session && paneLess(W.session))) return 'gate-385-reject';
    if (W.d) {                                                          // leftover/recovery (400-450)
      const cur = W.d;
      W.ghosts.forEach((g) => { g.attached = false; }); W.ghosts.length = 0;  // disposeOwnedPanes
      applyScreen(currentDesc(), { render: false, resetScroll: false, keepGhosts: true }); // 444
      if (designedFix && cur && cur.from.v === 'home' && cur.ghostY != null)  // plan §4 recovery line
        W.home.scrollTop = cur.ghostY;
      W.finishing = false; W.session = null; W.d = null;
    }
    if (targetIsNavbtn) return 'navbtn-early-return';                   // app.js:457
    return 'armed';
  };

  const startSwipe = (from, dest) => {  // begin(edge)+start(): home->books or browse->overlay
    const r = begin(false);
    if (r !== 'armed') throw new Error('begin rejected: ' + r);
    const d = { id: Math.random(), from, dest, live: true, movers: [], scroll0: 0,
      finPlan: { abortRender: (from.v !== 'home' && dest.v !== 'home' && from.v !== 'books') ? 'none'
        : (from.v === 'books' && dest.v === 'books') ? 'rerender' : 'none' } };
    // ghost build — outgoing FIRST (swipe.js:341), capture PRE-park (swipe.js:289)
    const ghostY = from.v === 'home' ? W.home.scrollTop : W.browse.scrollTop;
    const ghost = { ghostY, srcV: from.v, attached: true };
    W.ghosts.push(ghost);
    d.movers = [{ el: ghost, own: 'owned-pane', base: 0 }];
    d.ghostY = ghostY;
    // renderDestination parks home for a browse-host destination (app.js:484-485)
    if (dest.v === 'books') { W.browse.hidden = false; setParked(true); }
    else if (dest.v === 'options') { /* overlay renders itself; in-flow views untouched */ }
    W.d = d; W.session = d;
    return d;
  };

  const abort = (cur) => {              // end()->settle(cur,false): app.js:591-633, 1269-1271
    W.d = null;
    W.finishing = true;                 // app.js:607
    let done = false;
    const dropPanes = () => { W.ghosts = W.ghosts.filter((g) => !cur.movers.some((m) => m.el === g)); };
    const runFinalize = () => {         // app.js:785-... abort path
      const dest = currentDesc();       // app.js:793 — FRESH read
      if (cur.finPlan.abortRender === 'rerender') { /* held path, not this transition */ return; }
      dropPanes();                      // app.js:1213 (parentNode-guarded; no-op if swept)
      applyScreen(dest, { render: false, resetScroll: false });         // app.js:1227
      if (designedFix && cur.from.v === 'home' && cur.ghostY != null)   // plan §4 abort line
        W.home.scrollTop = cur.ghostY;
      // window.scrollTo(0, cur.scroll0) — document scroll, inert for fixed views
      W.finishing = false;
    };
    const finalize = () => {            // app.js:1238-1268
      if (done) return; done = true;
      if (cur !== W.session) return;    // 1257 — nav.js never touches session -> passes
      runFinalize();
      if (W.session === cur) W.session = null;   // sessionDone
    };
    // transitionend suppressed once the ghost is detached (R6): model only the 340ms timer,
    // which is the guaranteed finalize in BOTH the swept and jsdom cases.
    W.timers.push({ at: W.t + 340, fn: finalize, label: 'settleTimer' });
  };

  const tapHome = () => {               // touchstart -> begin(navbtn); click -> goHome (R1/R4/R9)
    const g = begin(true);
    goHome();
    return g;
  };

  const paint = (label) => {
    const covering = W.ghosts.find((x) => x.attached);
    const visible = covering ? `GHOST(${covering.srcV}@${covering.ghostY})`
      : (W.home.parked ? `browse/other` : `home@${W.home.scrollTop}`);
    W.paints.push(`t=${W.t}ms ${label}: ${visible}`);
  };
  const advance = (to) => {
    W.timers.filter((x) => x.at <= to && !x.ran).sort((a, b) => a.at - b.at)
      .forEach((x) => { x.ran = true; W.t = x.at; x.fn(); paint(x.label); });
    W.t = to;
  };

  return { W, currentDesc, navTo, goHome, startSwipe, abort, tapHome, paint, advance, applyScreen };
}

// ───────────────────────── CONTROL 1 — the design's happy path ─────────────────────────
// scroll home to 500 -> swipe home->books -> abort, NO interleave -> reveal restores 500.
{
  const S = makeWorld({ designedFix: true });
  S.W.fwdStack.push({ v: 'books' });
  S.W.home.scrollTop = 500;
  const d = S.startSwipe({ v: 'home' }, { v: 'books' });
  S.paint('mid-drag');
  S.abort(d);
  S.advance(400);
  const pass = S.W.home.scrollTop === 500 && !S.W.home.parked;
  log('CONTROL 1 (abort->home, no interleave): final home.scrollTop=' + S.W.home.scrollTop
    + ' expected 500 -> ' + (pass ? 'PASS' : 'FAIL'));
  log('  paints: ' + S.W.paints.join(' | '));
  if (!pass) process.exit(1);
}

// ─────────── CONTROL 2 — the 2nd-KILL interleaving: the SOURCE gate must refuse ───────────
// books, #browse@800, home parked@0; swipe books->options (app-ghost ghostY=800, no-hold);
// abort; tap Home mid-settle; finalize. Gate cur.from.v==='home' is FALSE -> no write -> 0.
{
  const S = makeWorld({ designedFix: true });
  S.W.navStack = [{ v: 'home' }, { v: 'books' }];
  S.W.home.scrollTop = 0; S.W.home.parked = true;
  S.W.browse = { scrollTop: 800, hidden: false };
  const d = S.startSwipe({ v: 'books' }, { v: 'options' });
  S.abort(d);
  S.W.t = 150; const gate = S.tapHome(); S.paint('tap Home lands');
  S.advance(400);
  const pass = S.W.home.scrollTop === 0 && gate === 'gate-385-reject';
  log('CONTROL 2 (2nd-kill interleaving vs the source gate): final home.scrollTop='
    + S.W.home.scrollTop + ' expected 0 (gate refused) -> ' + (pass ? 'PASS' : 'FAIL'));
  log('  paints: ' + S.W.paints.join(' | '));
  if (!pass) process.exit(1);
}

// ───────────── BASELINE — the STRIKE interleaving on SHIPPED code (no designed fix) ─────────────
{
  const S = makeWorld({ designedFix: false });
  S.W.fwdStack.push({ v: 'books' });
  S.W.home.scrollTop = 500;
  const d = S.startSwipe({ v: 'home' }, { v: 'books' });
  S.abort(d);
  S.W.t = 150; S.tapHome(); S.paint('tap Home lands');
  S.advance(400);
  log('BASELINE (shipped, same interleaving): final home.scrollTop=' + S.W.home.scrollTop
    + ' (stable 0 = the fresh nav wins; no jump today)');
  log('  paints: ' + S.W.paints.join(' | '));
}

// ─────────────────────────────────── THE STRIKE ───────────────────────────────────
// home@500 -> forward-swipe home->books (ghostY=500; home parked) -> ABORT (settle armed)
// -> at +150ms the user taps the Home navbutton:
//      touchstart -> begin() gate app.js:385 rejects (pane-owning settling session) — no reset;
//      click -> goHome -> navTo({v:'home'}): SAME-VIEW REPLACE-TOP (app.js:140) + applyScreen:
//        resetSwipeStyles SWEEPS the settling ghost (nav.js:131/114) -> home REVEALED;
//        setView('home') un-parks; resetScroll TRUE -> home.scrollTop = 0 (nav.js:140).
//      PAINT: home visible at 0. The ghost displayed 500.
// -> at +340ms the settleTimer finalizes (identity guard passes — nav touched nothing):
//      dest = currentDesc() = home; no-hold abort branch; applyScreen(home,{resetScroll:false});
//      DESIGNED RESTORE: cur.from.v==='home' && cur.ghostY===500 -> home.scrollTop = 500.
//      PAINT: home visible at 500.
// PROMISE predicts: no jump, no visibly wrong intermediate paint; a fresh ->home nav stays at
// top (the design's own §7 normal-completion row). FRACTURE predicts: home paints 0 for
// ~190ms, then LURCHES to 500 — the settling gesture's finalize clobbers the fresh nav.
{
  const S = makeWorld({ designedFix: true });
  S.W.fwdStack.push({ v: 'books' });
  S.W.home.scrollTop = 500;
  const d = S.startSwipe({ v: 'home' }, { v: 'books' });
  S.paint('mid-drag (ghost covers)');
  S.abort(d);
  S.paint('abort lift (settling)');
  S.W.t = 150;
  const gate = S.tapHome();
  S.paint('tap Home lands');
  const atTap = S.W.home.scrollTop, ghostGone = !S.W.ghosts.some((g) => g.attached);
  S.advance(400);
  const final = S.W.home.scrollTop;
  log('STRIKE (home-source abort + mid-settle Home tap, designed fix in):');
  log('  touchstart -> ' + gate + ' (gesture state untouched)');
  log('  at tap:   ghost swept=' + ghostGone + ', home VISIBLE at ' + atTap + '  (ghost had displayed 500)');
  log('  at +340ms finalize: home VISIBLE at ' + final);
  log('  paints: ' + S.W.paints.join(' | '));
  const killed = atTap === 0 && ghostGone && final === 500;
  log(killed
    ? 'FRACTURE CONFIRMED: visible reveal at 0 for ~190ms, then a 0->500 lurch — the designed'
      + ' restore overwrote the interleaved fresh navigation (which shipped code leaves stable at 0).'
    : 'fracture NOT reproduced');
  process.exit(killed ? 0 : 2);
}
