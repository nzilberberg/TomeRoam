// Loki probe — Stage 6h (commit→home scrollend cover-gate), r1. DISPOSABLE.
// Models the DESCRIBED 6h gate machine over the PINNED drop semantics of
// js/app.js holdGhostUntilPaintable (read 2026-07-28: drop lines ~813-859,
// gate 860, decode 861-862, double-rAF 872-874, 600ms net 875 calling drop
// DIRECTLY), and exhaustively enumerates every interleaving of
// {decode-resolve, paint(double-rAF), scrollend×0..2, SETTLE_MS, 600ms net}.
//
// Cancellation semantics mirror the source exactly:
//  - drop() is `dropped`-guarded and retires ALL handles (rAF, 600ms net,
//    and per 6h: the scrollend listener + SETTLE_MS timer).
//  - a cancelled timer / removed listener never fires; the decode promise
//    cannot be cancelled, so its late resolution hits the dropped guard.
//  - timers are mandatory-unless-cleared; paint is OPTIONAL (hidden tab:
//    rAF never fires); scrollend is optional, 0..2 occurrences.
// Orderings are enumerated WITHOUT timing constraints — a superset of the
// real orderings (SETTLE_MS < 600ms etc.), so a property that holds here
// holds on device.
//
// Assertions per interleaving:
//  A1 drop() body ran EXACTLY once (never 0 = strand, never 2 = double).
//  A2 the pane is removed and finishing===false, session===null at the end.
//  A3 post-drop, every handle is retired (no live listener/timer survives).
//  A4 non-scrollSettle equivalence: with opts.scrollSettle unset, the 6h
//     machine's (dropCount, via) equals the pre-6h machine's on every
//     interleaving of {decode, paint, net600} — abort→browse unchanged.

'use strict';
let fails = 0, runs = 0;
const fail = (msg) => { fails++; console.error('FAIL: ' + msg); };

// ---- the pre-6h machine (today's source, lines 809-876 distilled) ----------
function preMachine() {
  const st = { dropped: false, decoded: false, painted: false,
    rafLive: true, netLive: true, paneAttached: true,
    finishing: true, session: 'cur', dropCount: 0, via: null };
  const drop = (why) => {
    if (st.dropped) return; st.dropped = true; st.dropCount++;
    st.rafLive = false; st.netLive = false;              // cancelAnimationFrame + clearTimeout
    st.paneAttached = false;                             // fadePanes
    st.finishing = false;                                // line 855
    if (st.session === 'cur') st.session = null;         // sessionDone(cur)
    st.via = why;
  };
  const gate = (why) => { if (st.decoded && st.painted) drop(why); };
  st.fire = {
    decode: () => { st.decoded = true; gate('decode'); },              // uncancellable
    paint:  () => { if (st.rafLive) { st.painted = true; gate('paint'); } },
    net600: () => { if (st.netLive) drop('timeout'); },                // DIRECT, bypasses gate
  };
  return st;
}

// ---- the 6h machine (described change layered on the same drop) ------------
function sixHMachine(scrollSettle) {
  const st = { dropped: false, decoded: false, painted: false,
    settled: !scrollSettle,                              // settled starts false ONLY when scrollSettle
    rafLive: true, netLive: true,
    scrollEndAttached: !!scrollSettle, settleLive: !!scrollSettle,
    paneAttached: true, finishing: true, session: 'cur', dropCount: 0, via: null };
  const drop = (why) => {
    if (st.dropped) return; st.dropped = true; st.dropCount++;
    st.rafLive = false; st.netLive = false;
    st.scrollEndAttached = false; st.settleLive = false;  // 6h: BOTH new handles retired in drop()
    st.paneAttached = false;
    st.finishing = false;
    if (st.session === 'cur') st.session = null;
    st.via = why;
  };
  const gate = (why) => { if (st.decoded && st.painted && st.settled) drop(why); };
  st.fire = {
    decode:    () => { st.decoded = true; gate('decode'); },
    paint:     () => { if (st.rafLive) { st.painted = true; gate('paint'); } },
    scrollend: () => { if (st.scrollEndAttached) { st.settled = true; gate('scrollend'); } },
    settle:    () => { if (st.settleLive) { st.settled = true; gate('settle'); } },
    net600:    () => { if (st.netLive) drop('timeout'); },   // unchanged: DIRECT
  };
  return st;
}

// ---- exhaustive interleaving driver ----------------------------------------
function* permutations(arr) {
  if (arr.length <= 1) { yield arr; return; }
  for (let i = 0; i < arr.length; i++)
    for (const rest of permutations(arr.slice(0, i).concat(arr.slice(i + 1))))
      yield [arr[i], ...rest];
}
const check = (st, label) => {
  runs++;
  if (st.dropCount !== 1) fail(`${label}: drop ran ${st.dropCount}× (strand/double)`);
  if (st.paneAttached) fail(`${label}: cover STRANDED (pane still attached)`);
  if (st.finishing !== false || st.session !== null) fail(`${label}: finishing/session not released`);
  if (st.rafLive || st.netLive || st.scrollEndAttached || st.settleLive)
    fail(`${label}: live handle survived past drop (leak)`);
};

// scrollSettle=true: paint ∈ {absent, present}; scrollend ∈ {0,1,2 fires}.
for (const paints of [0, 1]) {
  for (const scrollends of [0, 1, 2]) {
    const events = ['decode', 'net600', 'settle'];
    if (paints) events.push('paint');
    for (let i = 0; i < scrollends; i++) events.push('scrollend');
    for (const order of permutations(events)) {
      const st = sixHMachine(true);
      for (const ev of order) st.fire[ev]();
      check(st, `6h[paint=${paints},se=${scrollends}] ` + order.join('>'));
    }
  }
}

// A4: non-scrollSettle equivalence with the pre-6h machine, every interleaving.
for (const paints of [0, 1]) {
  const events = ['decode', 'net600']; if (paints) events.push('paint');
  for (const order of permutations(events)) {
    const a = preMachine(), b = sixHMachine(false);
    for (const ev of order) { a.fire[ev](); b.fire[ev](); }
    if (a.dropCount !== b.dropCount || a.via !== b.via
      || a.paneAttached !== b.paneAttached || a.finishing !== b.finishing)
      fail(`divergence on non-scrollSettle: ${order.join('>')} pre=(${a.dropCount},${a.via}) 6h=(${b.dropCount},${b.via})`);
    // 6h-only assertion set still applies to b:
    const st = b; runs++;
    if (st.scrollEndAttached || st.settleLive) fail(`non-scrollSettle attached a 6h handle: ${order.join('>')}`);
  }
}

console.log(`${runs} interleavings checked, ${fails} failures`);
process.exit(fails ? 1 : 0);
