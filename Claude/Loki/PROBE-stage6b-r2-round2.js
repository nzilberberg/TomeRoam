// LOKI PROBE round 2 — the two un-executed planes:
// S7: decode-driven drop — the gate resolver runs from a MICROTASK with the 600ms
//     revealTimer still pending and BOTH reveal frames already spent. The plan's RR
//     fixture list has (a) timeout/outer, (b) half-fired, (c) "a gate wins" — S7 pins
//     the decode-last variant where the cancel targets are one spent frame id and one
//     live timer, and a mis-targeted cancelAnimationFrame(spent) must not disturb any
//     OTHER live frame (a decoy is planted to catch that).
// S8: the OTHER held branch — abort browse->browse (cur.clobbered), half-fired, timeout wins.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert');
const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const realSleep = (ms) => new Promise((r) => require('node:timers').setTimeout(r, ms));

function transform(src) {
  const once = (s, from, to) => { assert.equal(s.split(from).length - 1, 1, 'target not unique: ' + from.slice(0, 40)); return s.replace(from, to); };
  src = once(src, 'setTimeout(finalize, 340);', 'cur.settleTimer = setTimeout(finalize, 340);');
  src = once(src, 'cancelAnimationFrame(cur.settleFrame);', 'cancelAnimationFrame(cur.settleFrame); clearTimeout(cur.settleTimer);');
  src = once(src, "requestAnimationFrame(() => requestAnimationFrame(() => { painted = true; gate('paint'); }));",
    "cur.revealFrames = requestAnimationFrame(() => { cur.revealFrames = requestAnimationFrame(() => { painted = true; gate('paint'); }); });");
  src = once(src, "setTimeout(() => drop('timeout'), 600);", "cur.revealTimer = setTimeout(() => drop('timeout'), 600);");
  src = once(src, 'if (dropped) return; dropped = true;', 'if (dropped) return; dropped = true; cancelAnimationFrame(cur.revealFrames); clearTimeout(cur.revealTimer);');
  return src;
}
const realRead = fs.readFileSync;
fs.readFileSync = function (p, ...a) {
  const out = realRead.call(fs, p, ...a);
  if (typeof p === 'string' && p.replace(/\\/g, '/').endsWith('js/app.js') && typeof out === 'string') return transform(out);
  return out;
};
const { boot } = require(path.join(REPO, 'test', 'app-harness.js'));

function instrument(h) {
  const led = { st: [], ct: [], raf: [], craf: [], mark: 'boot' };
  const w = global.window;
  const st0 = global.setTimeout, ct0 = global.clearTimeout;
  const raf0 = global.requestAnimationFrame, craf0 = global.cancelAnimationFrame;
  const st = (fn, ms, ...a) => { const id = st0(fn, ms, ...a); led.st.push({ id, ms: Number(ms) || 0, at: led.mark }); return id; };
  const ct = (id) => { led.ct.push({ id, at: led.mark }); return ct0(id); };
  const raf = (fn) => { const id = raf0(fn); led.raf.push({ id, at: led.mark }); return id; };
  const craf = (id) => { led.craf.push({ id, at: led.mark }); return craf0(id); };
  global.setTimeout = st; w.setTimeout = st; global.clearTimeout = ct; w.clearTimeout = ct;
  global.requestAnimationFrame = raf; w.requestAnimationFrame = raf;
  global.cancelAnimationFrame = craf; w.cancelAnimationFrame = craf;
  return led;
}
const settleMt = async (h, n = 12) => { for (let i = 0; i < n; i++) await h.settle(); };
const drainRaf = async (h, cap = 30) => { let i = 0; while (h.raf.pending() && i++ < cap) await h.raf.frame(); };
const lines = (h, re) => h.log.calls.filter((c) => c.name === 'debug' && re.test(c.args[1])).map((c) => c.args[1]);
async function bootDrained() {
  const h = boot({ fakeTimers: true, deferRaf: true });
  await settleMt(h); await h.clock.advance(20000); await drainRaf(h); await settleMt(h);
  return h;
}

async function S7() {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    // an image whose decode() stays pending until the probe releases it
    let releaseDecode = null;
    const img = h.document.createElement('img');
    img.setAttribute('src', 'art:pending');
    img.decode = () => new Promise((r) => { releaseDecode = r; });
    h.$('home').appendChild(img);
    led.mark = 'gesture';
    h.tap('.navbtn[data-nav="authors"]'); await settleMt(h);
    await h.clock.advance(2000); await drainRaf(h); await settleMt(h);
    const row = h.document.createElement('div'); row.className = 'book'; h.$('browse').appendChild(row);
    h.touch.start(10, 300, row);
    h.touch.move(80, 302); await realSleep(12);
    h.touch.move(600, 304); await realSleep(12);
    h.touch.end(600, 304);
    await settleMt(h);
    led.mark = 'finalize';
    await h.clock.advance(400);
    await settleMt(h);
    const r600 = led.st.filter((e) => e.at === 'finalize' && e.ms === 600);
    assert.equal(r600.length, 1, 'S7: one revealTimer');
    const R = r600[0].id;
    led.mark = 'frames';
    await h.raf.frame(); await h.raf.frame();      // both reveal frames fire; painted=true, decoded=false
    await settleMt(h);
    assert.equal(lines(h, /^hold /).length, 0, 'S7: paint alone must NOT drop while decode pends');
    // plant a live decoy frame so a mis-targeted cancel of the spent inner could only hit it
    let decoyRan = false;
    const decoyId = global.requestAnimationFrame(() => { decoyRan = true; });
    led.mark = 'decode-drop';
    assert.ok(releaseDecode, 'S7: the pending decode was consulted');
    releaseDecode();                                // decode lands LAST -> drop('decode') from a microtask
    await settleMt(h);
    assert.equal(lines(h, /^hold /).length, 1, 'S7: the decode gate drove exactly one drop');
    assert.ok(/via=decode/.test(lines(h, /^hold /)[0]), 'S7: the drop was decode-driven: ' + lines(h, /^hold /)[0]);
    assert.ok(led.ct.some((e) => e.id === R && e.at === 'decode-drop'), 'S7: the PENDING 600ms revealTimer must be cleared at the decode-driven drop');
    const cancelled = led.craf.filter((e) => e.at === 'decode-drop').map((e) => e.id);
    assert.ok(!cancelled.includes(decoyId), 'S7: the spent-frame cancel must not hit an unrelated live frame');
    const p0 = h.clock.pending();
    await h.clock.advance(600);
    await settleMt(h);
    assert.equal(p0 - h.clock.pending(), 2, 'S7: only fadePanes+reportReveal fire later — the revealTimer left tq');
    assert.equal(lines(h, /^hold /).length, 1, 'S7: no second drop');
    await drainRaf(h);
    assert.ok(decoyRan, 'S7: the decoy frame survived and ran');
    console.log('S7  decode-driven drop: revealTimer id ' + R + ' cleared from a MICROTASK resolver while pending; spent-frame cancel disturbed nothing (decoy id ' + decoyId + ' ran); one drop via=decode.');
  } finally { h.dispose(); }
}

async function S8() {
  const h = await bootDrained();
  try {
    const led = instrument(h);
    led.mark = 'nav';
    h.tap('.navbtn[data-nav="books"]'); await settleMt(h);
    h.tap('.navbtn[data-nav="authors"]'); await settleMt(h);
    await h.clock.advance(2000); await drainRaf(h); await settleMt(h);
    led.mark = 'gesture';
    const row = h.document.createElement('div'); row.className = 'book'; h.$('browse').appendChild(row);
    h.touch.start(10, 300, row);
    h.touch.move(80, 302); await realSleep(12);
    h.touch.move(200, 304); await realSleep(12);
    h.touch.move(30, 304); await realSleep(12);
    h.touch.end(30, 304);                           // ABORT browse->browse (clobbered -> held reveal)
    await settleMt(h);
    led.mark = 'finalize';
    await h.clock.advance(400);
    await settleMt(h);
    const O = led.raf.filter((e) => e.at === 'finalize').map((e) => e.id);
    assert.equal(O.length, 1, 'S8: the abort held reveal scheduled one outer frame (held path reached), got ' + O.length);
    led.mark = 'frame1';
    await h.raf.frame();
    const I = led.raf.filter((e) => e.at === 'frame1').map((e) => e.id);
    assert.equal(I.length, 1, 'S8: outer scheduled the inner, got ' + I.length);
    assert.equal(h.raf.pending(), 1, 'S8: half-fired state');
    led.mark = 'drop';
    await h.clock.advance(600);
    await settleMt(h);
    const cancelled = led.craf.filter((e) => e.at === 'drop').map((e) => e.id);
    assert.ok(cancelled.includes(I[0]) && !cancelled.includes(O[0]), 'S8: drop cancels the INNER, not the spent outer; cancelled=[' + cancelled + ']');
    assert.equal(h.raf.pending(), 1, 'S8: only watchFrames pends after drop (got ' + h.raf.pending() + ')');
    assert.equal(lines(h, /^hold /).length, 1, 'S8: one drop');
    console.log('S8  abort browse->browse held path, half-fired: inner ' + I[0] + ' cancelled at timeout-drop; spent outer ' + O[0] + ' untouched; rafQ clean.');
  } finally { h.dispose(); }
}

(async () => {
  try { await S7(); await S8(); console.log('\nROUND 2 CLEAN.'); }
  catch (e) { console.error('\nPROBE FAILURE:', e && e.message); console.error(e && e.stack); process.exitCode = 1; }
  finally { fs.readFileSync = realRead; }
})();
