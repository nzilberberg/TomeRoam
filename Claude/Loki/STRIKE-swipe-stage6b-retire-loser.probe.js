// LOKI PROBE — disposable. Stage-6b promise: "after a resolver runs no loser
// timer/frame stays pending on the scheduler queue."
//
// Applies the ratified PLAN-swipe-stage6b construction (f83c4a5, §2/§3/§5/§7) to an
// IN-MEMORY copy of js/app.js (production file untouched), boots the real harness,
// and executes two timeout-driven drop interleavings:
//   RUN A (control, covered by the plan): outer reveal rAF NEVER fired when the
//          600ms safety-net drops -> cancelAnimationFrame(cur.revealFrames) removes it.
//   RUN B (the strike): outer reveal rAF HAS fired (one frame ran), inner paint rAF
//          pending, THEN the 600ms drops -> the stored handle is the spent OUTER id;
//          the INNER paint frame is the still-pending loser.
// Promise predicts: in BOTH runs, after drop() no reveal frame remains in rafQ.
// Fracture predicts: in RUN B the inner frame (scheduled from app.js line 794)
// remains pending after the resolver, and the cancel hit a fired id.
const fs = require('node:fs');
const path = require('node:path');

const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';

// ---- 1. Apply the plan's construction, verbatim, line-count-stable -------------
const APP = path.join(REPO, 'js', 'app.js').replace(/\//g, path.sep);
const PATCHES = [
  // §2: "the 340ms ... is stored on the session" as cur.settleTimer
  ['      setTimeout(finalize, 340);',
   '      cur.settleTimer = setTimeout(finalize, 340);'],
  // §7: "clearTimeout(cur.settleTimer) added adjacent to" the settleFrame cancel
  ['        cancelAnimationFrame(cur.settleFrame);',
   '        cancelAnimationFrame(cur.settleFrame); clearTimeout(cur.settleTimer);'],
  // §2: "the reveal outer requestAnimationFrame (794) is stored on the session"
  ['          requestAnimationFrame(() => requestAnimationFrame(() => { painted = true; gate(\'paint\'); }));',
   '          cur.revealFrames = requestAnimationFrame(() => requestAnimationFrame(() => { painted = true; gate(\'paint\'); }));'],
  // §2: "the reveal 600ms safety-net ... is stored on the session" as cur.revealTimer
  ['          setTimeout(() => drop(\'timeout\'), 600);',
   '          cur.revealTimer = setTimeout(() => drop(\'timeout\'), 600);'],
  // §2/§7: the winning drop(), dropped-guard already set, cancels both losers
  ['            if (dropped) return; dropped = true;',
   '            if (dropped) return; dropped = true; cancelAnimationFrame(cur.revealFrames); clearTimeout(cur.revealTimer);'],
];
const realRead = fs.readFileSync;
fs.readFileSync = function (p, ...rest) {
  const out = realRead.call(fs, p, ...rest);
  if (typeof p === 'string' && path.resolve(p) === path.resolve(APP)) {
    let src = out.toString();
    for (const [from, to] of PATCHES) {
      const n = src.split(from).length - 1;
      if (n !== 1) throw new Error(`patch anchor matched ${n}x (need 1): ${from.trim()}`);
      src = src.replace(from, to);
    }
    return src;
  }
  return out;
};

// ---- 2. Boot + scheduler ledger ------------------------------------------------
const { boot } = require(path.join(REPO, 'test', 'app-harness.js'));

function instrument(h) {
  // Wrap the harness fakes with an attributing ledger. app.js resolves these as
  // bare globals at call time, so a post-boot wrapper is seen by every later call.
  const led = { rafSched: [], rafCancel: [], toSched: [], toClear: [] };
  const lineOf = () => {
    const m = /<anonymous>:(\d+):\d+/.exec(new Error().stack || '');
    return m ? Number(m[1]) : -1;
  };
  const wrap = (name, store) => {
    const orig = global[name];
    const w = (...a) => {
      const id = orig(...a);
      store.push({ id, line: lineOf() });
      return id;
    };
    global[name] = w; h.window[name] = w;
  };
  const wrapCancel = (name, store) => {
    const orig = global[name];
    const w = (id) => { store.push({ id, line: lineOf() }); return orig(id); };
    global[name] = w; h.window[name] = w;
  };
  wrap('requestAnimationFrame', led.rafSched);
  wrapCancel('cancelAnimationFrame', led.rafCancel);
  wrap('setTimeout', led.toSched);
  wrapCancel('clearTimeout', led.toClear);
  return led;
}

const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
const settle = async (h, n = 12) => { for (let i = 0; i < n; i++) await h.settle(); };
const activeSession = (h) => (h.window.PBSwipeSession ? h.window.PBSwipeSession() : 'no-accessor');
const flashLines = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'FLASH').map((c) => c.args[1]);

// The RGH held-reveal recipe (swipe-invariants.test.js:569): Authors -> Home is a
// commit->home held reveal; the 340ms finalize wins; the reveal double-rAF queues.
async function reachHeldReveal(h) {
  h.tap('.navbtn[data-nav="authors"]');
  await settle(h);
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  h.touch.start(10, 300, row);
  h.touch.move(80, 302);
  await realSleep(12); h.touch.move(600, 304); await realSleep(12); h.touch.end(600, 304);
  await settle(h);
  await h.clock.advance(400);   // 340ms finalize fires; holdGhostUntilPaintable runs
  await settle(h);
  if (!activeSession(h)) throw new Error('fixture failed: no held reveal (owner gone after finalize)');
}

const REVEAL_RAF_LINE = 794;   // both outer and inner schedule from this source line
const WATCH_RAF_LINE = 682;    // watchFrames' diagnostic tick (drop-spawned, not a loser)

function revealFrameIds(led) { return led.rafSched.filter((e) => e.line === REVEAL_RAF_LINE).map((e) => e.id); }

async function run(label, fireOuterFrameFirst) {
  const h = boot({ fakeTimers: true, deferRaf: true });
  try {
    const led = instrument(h);
    await reachHeldReveal(h);

    const beforeIds = revealFrameIds(led);
    console.log(`\n== ${label} ==`);
    console.log(`after finalize: raf.pending=${h.raf.pending()} reveal-frame ids so far=${JSON.stringify(beforeIds)}`);

    if (fireOuterFrameFirst) {
      await h.raf.frame();   // the OUTER reveal frame fires; it schedules the INNER
      console.log(`after 1 frame: raf.pending=${h.raf.pending()} reveal-frame ids=${JSON.stringify(revealFrameIds(led))}`);
    }

    await h.clock.advance(600);   // the 600ms safety-net wins the drop
    await settle(h);

    const via = flashLines(h).find((l) => /via=timeout/.test(l));
    console.log(`drop fired: ${via ? 'via=timeout confirmed' : 'NO timeout drop line: ' + JSON.stringify(flashLines(h))}`);
    console.log(`owner after drop: ${JSON.stringify(activeSession(h))}`);

    const allReveal = revealFrameIds(led);
    const cancelled = new Set(led.rafCancel.map((e) => e.id));
    const fired = [];   // which reveal frames actually ran: outer runs iff we fired a frame
    // Reconstruct pending reveal frames: scheduled at 794, never cancelled, never run.
    // A frame "ran" iff a LATER reveal id was scheduled from inside it (outer->inner)
    // or we can bound it: with 0 frames run, none ran; with 1 frame run, the first ran.
    const ranCount = fireOuterFrameFirst ? 1 : 0;
    const pendingReveal = allReveal.slice(ranCount).filter((id) => !cancelled.has(id));

    console.log(`reveal frames scheduled(line ${REVEAL_RAF_LINE})=${JSON.stringify(allReveal)} ran=${ranCount} cancelRaf calls=${JSON.stringify(led.rafCancel.map((e) => e.id))}`);
    console.log(`raf.pending after resolver=${h.raf.pending()} (watchFrames tick from line ${WATCH_RAF_LINE}: ${led.rafSched.filter((e) => e.line === WATCH_RAF_LINE).length ? 'yes' : 'no'})`);
    console.log(`PENDING REVEAL (loser) FRAMES AFTER RESOLVER: ${JSON.stringify(pendingReveal)}`);

    // Cross-check the ledger against the real queue: drain frames and see if the
    // pending reveal callback actually fires (it must, if it is truly on rafQ).
    const pendingBefore = h.raf.pending();
    for (let i = 0; i < 4 && h.raf.pending(); i++) await h.raf.frame();
    console.log(`queue drained from ${pendingBefore} entries; session still ${JSON.stringify(activeSession(h))}`);
    return { pendingReveal, rafPendingAfterResolver: pendingBefore, cancelledIds: [...cancelled], allReveal };
  } finally { h.dispose(); fs.readFileSync = fs.readFileSync; }
}

(async () => {
  const A = await run('RUN A — timeout drop, outer frame NEVER fired (the plan\'s covered case)', false);
  const B = await run('RUN B — timeout drop AFTER the outer frame fired (inner paint frame pending)', true);

  console.log('\n==== VERDICT DATA ====');
  console.log(`RUN A pending loser reveal frames after resolver: ${A.pendingReveal.length} (promise predicts 0)`);
  console.log(`RUN B pending loser reveal frames after resolver: ${B.pendingReveal.length} (promise predicts 0)`);
  if (B.pendingReveal.length > 0) {
    const spentOuter = B.allReveal[0];
    console.log(`RUN B: drop() cancelled id ${JSON.stringify(B.cancelledIds)} — the OUTER handle ${spentOuter} already FIRED; ` +
      `the inner paint frame id ${B.pendingReveal[0]} stayed pending on rafQ. PROMISE BROKEN.`);
  } else {
    console.log('Both interleavings clean — the stone held on this plane.');
  }
})().catch((e) => { console.error('PROBE ERROR:', e); process.exit(1); });
