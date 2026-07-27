// Loki probe — Stage 6f strike instrument (STRIKE-swipe-stage6f-r1.md).
// Run from the repo root: node Claude/Loki/probe-swipe-stage6f-r1.js
//
// PROMISE UNDER STRIKE: on every reachable in-flow→overlay gesture, no code path
// writes a CSS transform onto the real #browse/#home; the real view is never a mover.
//
// METHOD: js/swipe.js is loaded with the hypothesized stage-6f change applied
// IN-MEMORY (in-flow→overlay outgoing => 'app-ghost'; the repo file is untouched),
// then driven through the REAL js/nav.js membership and the REAL
// paneBuilders/buildConstruction machinery under jsdom, for every
// source∈{books,authors,authorBooks,files,home} × destination∈the seven overlays,
// with an instrumented env. The four production transform-write loops
// (js/app.js start() park :555, move() :576, settle rAF :615, finalize wipe :775)
// are then replayed verbatim over the mapped mover set — both directions, a full
// drag sweep, commit and abort — asserting after every phase that the real
// #browse/#home (and .app) carry no inline transform/will-change and never entered
// the mover set.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const REPO = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(REPO, 'node_modules', 'jsdom'));

const dom = new JSDOM(`<!doctype html><html><body>
  <div class="app">
    <div id="library">
      <div id="home" class="view"><div class="tile">home-tile</div></div>
      <div id="browse" class="view hidden"><div class="browsepage"><div class="book">b</div></div></div>
    </div>
  </div>
  <div id="navbar"><div class="np-actions"><span>pill</span></div></div>
  <div id="options" class="hidden"></div>
  <div id="nowplaying" class="hidden"></div>
  <div id="general" class="hidden"></div>
  <div id="playback" class="hidden"></div>
  <div id="buffering" class="hidden"></div>
  <div id="downloads" class="hidden"></div>
  <div id="diagnostics" class="hidden"></div>
</body></html>`, { pretendToBeVisual: true });

global.window = dom.window;
global.document = dom.window.document;

// Real nav.js → window.Nav (the one overlay-membership source).
require(path.join(REPO, 'js', 'nav.js'));
// Baseline: the REAL swipe.js as it is in the repo today.
const SwipeReal = require(path.join(REPO, 'js', 'swipe.js'));

// The hypothesized 6f change, applied in-memory to a copy of the current source.
// Matched on the single decision line (EOL-agnostic; the repo file is CRLF).
const CURRENT = ": (c.toKind === 'browse' ? 'app-ghost' : 'real-source');";
const CHANGED = ": ((c.toKind === 'browse' || c.toKind === 'overlay') ? 'app-ghost' : 'real-source');";
const src = fs.readFileSync(path.join(REPO, 'js', 'swipe.js'), 'utf8');
if (src.indexOf(CURRENT) === -1) {
  // The repo has moved past the pre-6f shape this probe patches. If 6f is already
  // built, drive the repo file directly instead of patching.
  console.log('NOTE: pre-6f pattern not found in js/swipe.js — driving the repo file as-is.');
}
const patched = src.indexOf(CURRENT) !== -1 ? src.replace(CURRENT, CHANGED) : src;
const tmp = path.join(os.tmpdir(), 'loki-swipe-6f-' + process.pid + '.js');
fs.writeFileSync(tmp, patched);
const Swipe6f = require(tmp);

const $ = (id) => document.getElementById(id);
const OVERLAYS = ['options', 'nowplaying', 'general', 'playback', 'buffering', 'downloads', 'diagnostics'];
const SOURCES = [
  { v: 'books' }, { v: 'authors' },
  { v: 'authorBooks', author: { ratingKey: 1, title: 'A' } },
  { v: 'files', book: { ratingKey: 2, title: 'B' } },
  { v: 'home' },
];
const W = 390;
let failures = 0, checks = 0;
const fail = (msg) => { failures++; console.log('  FAIL  ' + msg); };
const ok = (cond, msg) => { checks++; if (!cond) fail(msg); };

const realClean = (phase, label) => {
  for (const id of ['home', 'browse']) {
    const el = $(id);
    ok(el.style.transform === '', `${label} [${phase}] #${id} inline transform = "${el.style.transform}"`);
    ok(el.style.willChange === '', `${label} [${phase}] #${id} inline will-change = "${el.style.willChange}"`);
  }
  const app = document.querySelector('.app');
  ok(app.style.transform === '', `${label} [${phase}] .app inline transform = "${app.style.transform}"`);
};

{
  const c = SwipeReal.classifyTransition({ from: { v: 'books' }, to: { v: 'options' } });
  const p = SwipeReal.constructionPlanFor(c);
  console.log(`BASELINE (repo swipe.js): books→options outgoing='${p.outgoing}'`);
}

for (const from of SOURCES) {
  for (const dv of OVERLAYS) {
    const label = `${from.v}→${dv}`;
    const dest = { v: dv };
    if (from.v === 'home') { $('home').classList.remove('parked'); $('browse').classList.add('hidden'); }
    else { $('browse').classList.remove('hidden'); $('home').classList.add('parked'); }
    for (const el of OVERLAYS) $(el).classList.add('hidden');

    // 1 — classification through the real membership.
    const c = Swipe6f.classifyTransition({ from, to: dest });
    ok(c.toKind === 'overlay', `${label} classified toKind='${c.toKind}' (membership hole)`);
    ok(c.fromKind === (from.v === 'home' ? 'home' : 'browse'), `${label} fromKind='${c.fromKind}'`);

    // 2 — the 6f plan.
    const plan = Swipe6f.constructionPlanFor(c);
    ok(plan.outgoing === 'app-ghost', `${label} plan.outgoing='${plan.outgoing}' — real view still a mover`);
    ok(plan.renderDestination === 'none', `${label} renderDestination='${plan.renderDestination}'`);

    // 3 — the real buildConstruction, instrumented env.
    let sourceElCalls = 0;
    const env = {
      document,
      scrollY: () => 123,
      sourceEl: (host, v) => { sourceElCalls++; return host === 'overlay' ? $(v) : $(v === 'home' ? 'home' : 'browse'); },
      navPill: () => $('navbar').querySelector('.np-actions'),
      renderDestination: (d2, host) => {
        if (host === 'browse-host') { fail(`${label} renderDestination host='browse-host' on an overlay dest`); return $('browse'); }
        const el = $(d2.v); el.classList.remove('hidden'); return el;
      },
    };
    const con = Swipe6f.buildConstruction(from, dest, env);
    ok(sourceElCalls === 0, `${label} env.sourceEl called ${sourceElCalls}x — real source resolved into the mover set`);
    const og = con.movers.outgoing, inc = con.movers.incoming, deco = con.movers.decoration;
    ok(og.ownership === 'owned-pane', `${label} outgoing ownership='${og.ownership}'`);
    ok(og.element.className.indexOf('nav-ghost') !== -1, `${label} outgoing element is not a .nav-ghost pane`);
    ok(og.element !== $('browse') && og.element !== $('home'), `${label} outgoing element IS the real view`);
    ok(!og.element.contains($('browse')) && !og.element.contains($('home')), `${label} ghost pane CONTAINS the real view (moved, not cloned)`);
    ok(inc.element === $(dv), `${label} incoming element is not the real overlay #${dv}`);
    ok(inc.element !== $('browse') && inc.element !== $('home'), `${label} incoming element IS a real in-flow view`);
    if (dv === 'nowplaying') {
      ok(!!deco && deco.slot === 'incoming', `${label} NP decoration missing/mis-slotted`);
      ok(deco && deco.element !== $('navbar').querySelector('.np-actions'), `${label} decoration is the REAL pill, not a clone`);
    } else ok(!deco, `${label} unexpected decoration`);
    realClean('build', label);
    const cloned = og.element.firstElementChild;
    ok(cloned && /translateY\(-123px\)/.test(cloned.style.transform), `${label} ghost clone transform='${cloned && cloned.style.transform}' (probe sanity)`);

    // 4 — replay the four production transform-write loops over the mapped mover set.
    for (const dir of ['back', 'fwd']) {
      const off = dir === 'back' ? -W : W;
      const baseOf = (slot) => (slot === 'outgoing' ? 0 : off);
      const movers = [og, inc].concat(deco ? [deco] : []).map((m) => ({ el: m.element, base: baseOf(m.slot), own: m.ownership }));
      ok(!movers.some((m) => m.el === $('browse') || m.el === $('home')), `${label} ${dir} real view entered the mover set`);
      for (const m of movers) if (m.base) m.el.style.transform = 'translateX(' + m.base + 'px)';   // start():555
      realClean(`park:${dir}`, label);
      for (const t of [-W, -W / 2, -1, 0, 1, W / 2, W]) {                                          // move():576
        for (const m of movers) m.el.style.transform = 'translateX(' + (m.base + t) + 'px)';
      }
      realClean(`drag:${dir}`, label);
      for (const commit of [true, false]) {                                                        // settle rAF:615
        const outTo = commit ? -off : 0, inTo = commit ? 0 : off;
        for (const m of movers) m.el.style.transform = 'translateX(' + (m.base === 0 ? outTo : inTo) + 'px)';
        realClean(`settle:${dir}:${commit ? 'commit' : 'abort'}`, label);
      }
      for (const m of movers) { m.el.style.transition = ''; m.el.style.transform = ''; m.el.style.willChange = ''; }   // finalize:775
      realClean(`finalize:${dir}`, label);
    }

    document.querySelectorAll('.nav-ghost').forEach((n) => n.remove());
    document.querySelectorAll('.np-pill-float').forEach((n) => n.remove());
    for (const el of OVERLAYS) { $(el).classList.add('hidden'); $(el).style.transform = ''; $(el).style.transition = ''; $(el).style.willChange = ''; }
  }
}

try { fs.unlinkSync(tmp); } catch { /* best-effort temp cleanup */ }
console.log(`\n${SOURCES.length}x${OVERLAYS.length} = ${SOURCES.length * OVERLAYS.length} in-flow→overlay members driven; ${checks} assertions; ${failures} failures.`);
console.log(failures ? '>>> FRACTURE' : '>>> STONE HELD under this instrument');
process.exit(failures ? 1 : 0);
