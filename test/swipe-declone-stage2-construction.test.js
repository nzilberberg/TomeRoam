// STAGE 2 of PLAN-swipe-declone.md — the CONSTRUCTION-SEAM half of the Coverage Model in the
// plan's §14, authored red-first by the test author (2026-08-01) from the FORGED plan
// (Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r4.md), BEFORE the Stage-2 build. Plan §13
// step 9; the build is step 10. Companion note: Claude/Curie/RED-swipe-declone-stage2.md.
//
// CELLS IN THIS FILE (plan §14).
//   MOVERSDISTINCT  RED@HEAD  a browse->browse construction resolves its two mover slots to two
//                             DISTINCT .browsepage elements and never to the #browse host.
//                             Mutants NATURAL-a/-b live here; NATURAL-c is unreachable from a
//                             fake env and lives in test/swipe-declone-stage2-browse.test.js.
//   NOGHOSTATALL    RED@HEAD  no transition builds an owned pane, and the Construction return
//                             carries no `capture` field at all.
//   NPPILLIDS       GREEN@HEAD, GUARD — the Now Playing pill decoration still strips ids from
//                             its clone after the ghost builder is deleted. `js/swipe.js:312`
//                             and `js/swipe.js:339` carry the SAME id-strip text and only the
//                             first is deleted (plan §12 item 4); this is the cell that reddens
//                             if the wrong one goes.
//
// WHY A RECIPE (fake-env) LAYER. The construction seam reads the world ONLY through the injected
// `env`, so these drive it with no ambient DOM — the same doctrine and the same ambient poisoning
// as test/swipe-construction.test.js. Each env's document is a fresh JSDOM of the REAL index.html.
//
// ⛔ SCOPE, honestly. Every assertion here is DOM IDENTITY, a returned enum value, an object key
// set or the absence of an appended node. Nothing here says the filmstrip animates, that two
// pages travel edge-to-edge, or that anything paints — that is plan §15 R7, device-owed at step
// 10b. MOVERSDISTINCT proves the CONSTRUCTION is a filmstrip; that it LOOKS like one is not CI's.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('node:url');
const { readRoot, ROOT } = require('./dom-fixture.js');

const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));
const loadSpec = () => import(pathToFileURL(path.join(ROOT, 'test', 'fixtures', 'swipe-plan-spec.mjs')).href);

const SKIP_DISTINCT = 'SKIP-PENDING-BUILD — RED until the builder extends the kind->host '
  + 'projection with `browse-page` on both ends and resolves it through Browse.pageElFor '
  + '(PLAN-swipe-declone.md §5.3.6, step 10). Remove this skip to drive it red.';
const SKIP_NOGHOST = 'SKIP-PENDING-BUILD — RED until the builder collapses `outgoing` to '
  + '`real-source` and deletes ghostApp and the `capture` field (PLAN-swipe-declone.md §6, '
  + 'step 10). Remove this skip to drive it red.';

// Ambient globals a correctly-injected seam must NEVER read (plan §10): everything goes through
// `env`. Poisoned around the buildConstruction call so a bare read throws loudly instead of
// silently working off whatever the previous test left on the global object.
const AMBIENT = ['document', 'window', 'Element', 'getComputedStyle', '$'];
function withPoisonedAmbient(fn) {
  const saved = Object.create(null);
  const had = Object.create(null);
  for (const k of AMBIENT) {
    had[k] = Object.prototype.hasOwnProperty.call(global, k);
    saved[k] = global[k];
    Object.defineProperty(global, k, {
      configurable: true,
      get() { throw new Error(`STAGE2 ambient read: "${k}" — buildConstruction must use env, not a global`); },
    });
  }
  try { return fn(); } finally {
    for (const k of AMBIENT) { delete global[k]; if (had[k]) global[k] = saved[k]; }
  }
}

/**
 * A fresh env whose document is the REAL index.html, implementing the POST-STAGE-2 contract
 * (plan §6): the two `browse-page` host values resolve to the cached `.browsepage` node for the
 * descriptor, every other host resolves exactly as it ships. At HEAD the classification never
 * projects `browse-page`, so production drives the `in-flow`/`browse-host` branches and both
 * browse slots come back as the ONE #browse host — which is the red.
 */
function mkEnv() {
  const dom = new JSDOM(readRoot('index.html'));
  const doc = dom.window.document;
  const lib = doc.getElementById('library'); if (lib) lib.classList.remove('hidden');
  const host = doc.getElementById('browse'); if (host) host.classList.remove('hidden');
  const pages = new Map();
  const keyOf = (d) => (d.v === 'authorBooks' ? 'author:' + d.author.ratingKey
    : d.v === 'files' ? 'files:' + d.book.ratingKey : d.v);
  /** The cached page node for a descriptor — one node per key, created on first ask. */
  const pageElFor = (d) => {
    const k = keyOf(d);
    if (!pages.has(k)) {
      const el = doc.createElement('div');
      el.className = 'browsepage';
      el.dataset.key = k;
      host.appendChild(el);
      pages.set(k, el);
    }
    return pages.get(k);
  };
  const hostsSeen = [];
  const env = {
    document: doc,
    scrollY: () => 0,
    sourceEl: (h, v) => {
      hostsSeen.push({ call: 'sourceEl', host: h, v });
      if (h === 'overlay') return doc.getElementById(v);
      if (h === 'browse-page') return pageElFor({ v });
      return doc.getElementById(v === 'home' ? 'home' : 'browse');
    },
    navPill: () => doc.querySelector('.np-actions'),
    renderDestination: (dest, h) => {
      hostsSeen.push({ call: 'renderDestination', host: h, v: dest.v });
      if (h === 'overlay') return doc.getElementById(dest.v);
      if (h === 'browse-page') return pageElFor(dest);
      if (h === 'browse-host') return doc.getElementById('browse');
      return doc.getElementById('home');
    },
  };
  return { env, doc, host, pageElFor, hostsSeen };
}

const build = (from, to, env) => withPoisonedAmbient(() => Swipe.buildConstruction(from, to, env));

// ════════════════════════════════════════════════════════════════════════════════════════════
// MOVERSDISTINCT — RED @HEAD. Plan §14, Invariant D6 (distinctness), §5.3.6.
// ════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS CELL EXISTS WHEN TWO OTHERS ALREADY LOOK AT MOVERS (plan §14). MOVERHASBOX asserts
// every resolvable mover host GENERATES A BOX, which #browse does; NOGHOSTATALL asserts no mover
// carries `owned-pane` and the return has no `capture` key, both of which are true of a
// construction whose two movers are the SAME node. Both are GREEN on the defective construction.
// This is the cell that can only fail on the defect.
//
// WHAT THE DEFECT COSTS, so the assertion is not arbitrary: `start()` writes a transform only for
// the non-zero-`base` mover (js/app.js:594) and `move()` writes for every mover in list order
// (js/app.js:615), so with one element in both slots the second write wins and the single element
// translates by `base + t` — the view slides off with nothing arriving.
//
// ⭐ THE BROWSE->BROWSE PAIR IS books->authors, NOT the representative's books->books. A bare
// same-`v` pair is documented IMPOSSIBLE-BEFORE-THE-PLANNER in the frozen spec (navTo REPLACES
// the stack top for it), so a fixture built on it would be asserting distinctness over a pair the
// planner can never receive.
test('MOVERSDISTINCT — a browse->browse construction resolves its two mover slots to two DISTINCT '
  + '.browsepage elements, never to the #browse host', { skip: SKIP_DISTINCT }, () => {
  const { env, host } = mkEnv();
  const c = build({ v: 'books' }, { v: 'authors' }, env);

  const out = c.movers.outgoing.element;
  const inc = c.movers.incoming.element;

  // Collected rather than asserted one at a time, deliberately. At HEAD the outgoing slot holds
  // the GHOST WRAPPER, so a bare `out !== inc` passes for a reason that has nothing to do with
  // this cell's claim — the whole set has to be reported together or the first green assertion
  // reads as evidence for a property nothing established.
  const bad = [];
  if (!out || !inc) bad.push('a mover slot resolved to nothing — a null mover surfaces much later as a transform write on nothing');
  if (out === inc) bad.push('the outgoing and incoming movers are the SAME node');
  if (out === host) bad.push('the outgoing mover is the #browse HOST, not the source page');
  if (inc === host) bad.push('the incoming mover is the #browse HOST, not the destination page');
  if (out && !out.classList.contains('browsepage')) bad.push(`the outgoing mover is not a .browsepage (class="${out.className}")`);
  if (inc && !inc.classList.contains('browsepage')) bad.push(`the incoming mover is not a .browsepage (class="${inc.className}")`);
  assert.deepEqual(bad, [], 'RED @HEAD: `sourceHost` is \'in-flow\' and `destinationHost` is '
    + '\'browse-host\' for a browse->browse pair (js/swipe.js:99-101), so the source resolves to the '
    + '#browse host and the destination render returns it too — one element in two mover slots, '
    + 'which Invariant D6 forbids. (At HEAD the outgoing slot holds the ghost WRAPPER instead, which '
    + 'is why distinctness alone is not the discriminator and the whole set is reported):\n  '
    + bad.join('\n  '));
});

// The classification half — the projection is the ONE place the kind->host mapping policy lives
// (js/swipe.js:96-98), so `browse-page` is added THERE and nowhere else. The expected hosts below
// are written BY HAND from plan §5.3.6, deliberately NOT read from the frozen spec fixture: the
// fixture is edited by the builder in the same commit, and reading it would make this cell agree
// with whatever the builder wrote instead of with the design.
const EXPECTED_HOSTS = (from, to) => ({
  sourceHost: from === 'overlay' ? 'overlay' : (from === 'browse' && to === 'browse') ? 'browse-page' : 'in-flow',
  destinationHost: to === 'overlay' ? 'overlay'
    : (to === 'browse' && from === 'browse') ? 'browse-page'
      : to === 'browse' ? 'browse-host' : 'home',
});

test('MOVERSDISTINCT — the classification pins sourceHost and destinationHost to `browse-page` for '
  + 'the browse->browse pair ONLY, leaving all four shipped transitions exactly as they resolve today',
{ skip: SKIP_DISTINCT }, async () => {
  const spec = await loadSpec();
  const REP = spec.REPRESENTATIVE;
  const wrong = [];
  for (const c of spec.STRUCTURAL_CASES) {
    const got = Swipe.classifyTransition({ from: { v: REP[c.from] }, to: { v: REP[c.to] } });
    const want = EXPECTED_HOSTS(c.from, c.to);
    if (got.sourceHost !== want.sourceHost || got.destinationHost !== want.destinationHost) {
      wrong.push(`${c.from}->${c.to}: got ${got.sourceHost}/${got.destinationHost} `
        + `want ${want.sourceHost}/${want.destinationHost}`);
    }
  }
  assert.equal(spec.STRUCTURAL_CASES.length, 8, 'fixture sanity: there are eight structural cases');
  assert.deepEqual(wrong, [], 'RED @HEAD: the projection has no `browse-page` case at all. It gains '
    + 'ONE case on each end, keyed on the PAIR rather than on either kind alone — re-pointing '
    + '`appViewEl` instead would break browse->home and browse->overlay, which ship '
    + `(plan §5.3.6):\n  ${wrong.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// NOGHOSTATALL — RED @HEAD. Plan §14, §6, §8.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. After Stage 2 no transition builds an owned pane, and the Construction return
// carries no `capture` field AT ALL — removed, not nulled (plan §6). The key is asserted absent
// rather than falsy because a nulled key leaves the capture-recording block in app.js reachable
// and the field alive for a reader to re-populate.
test('NOGHOSTATALL — no structural transition builds an owned pane, no .nav-ghost node is created, '
  + 'and the Construction return has no `capture` key', { skip: SKIP_NOGHOST }, async () => {
  const spec = await loadSpec();
  const REP = spec.REPRESENTATIVE;
  const panes = [];
  const captures = [];
  const ghosts = [];
  for (const c of spec.STRUCTURAL_CASES) {
    // browse->browse is exercised on a REAL pair (books->authors); a bare same-`v` pair cannot
    // reach the planner. Every other case uses the representative screens.
    const from = { v: REP[c.from] };
    const to = { v: (c.from === 'browse' && c.to === 'browse') ? 'authors' : REP[c.to] };
    const { env, doc } = mkEnv();
    const built = build(from, to, env);
    for (const slot of ['outgoing', 'incoming', 'decoration']) {
      const m = built.movers[slot];
      if (m && m.ownership === 'owned-pane') panes.push(`${c.from}->${c.to} ${slot}`);
    }
    if ('capture' in built) captures.push(`${c.from}->${c.to}`);
    const n = doc.querySelectorAll('.nav-ghost').length;
    if (n) ghosts.push(`${c.from}->${c.to} built ${n}`);
  }
  assert.deepEqual(panes, [], 'RED @HEAD: browse->browse still plans `outgoing: \'app-ghost\'` and '
    + `builds an owned pane (js/swipe.js:374-377):\n  ${panes.join('\n  ')}`);
  assert.deepEqual(ghosts, [], 'RED @HEAD: ghostApp mounts a fixed .nav-ghost wrapper into the '
    + `document for browse->browse (js/swipe.js:276-281):\n  ${ghosts.join('\n  ')}`);
  assert.deepEqual(captures, [], 'RED @HEAD: the Construction return carries a `capture` key on every '
    + 'transition (js/swipe.js:405). Stage 2 REMOVES the key rather than nulling it, so the '
    + `capture-recording block and its diagnostic readers have no field to keep alive:\n  ${captures.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// NPPILLIDS — GREEN @HEAD, GUARD. Plan §14, §12 item 4, round-1 F8.
// ════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS. The exact text `clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));`
// occurs TWICE in js/swipe.js. The deletion list removes `js/swipe.js:312` ONLY — the occurrence
// inside ghostApp — and `js/swipe.js:339`, inside npPillClone, is explicitly RETAINED. A
// text-directed deletion removes both and silently breaks the Now Playing pill decoration: the
// float would carry duplicate ids for every element the real pill contains, so `getElementById`
// inside the live app could resolve to the detached decoration instead of the real control.
// This cell is green at HEAD and must stay green through the deletion.
test('NPPILLIDS [GUARD] — the Now Playing pill decoration still strips every id from its clone', () => {
  const { env, doc } = mkEnv();
  // The real .np-actions must contain an id-carrying descendant for the strip to have a subject;
  // if the shipped markup ever stops carrying one, this cell would pass vacuously, so the fixture
  // INSTALLS one and asserts it is really there first.
  const pill = doc.querySelector('.np-actions');
  assert.ok(pill, 'fixture sanity: index.html must ship a .np-actions pill for the decoration to clone');
  const marker = doc.createElement('span');
  marker.id = 'nppillids-probe';
  pill.appendChild(marker);
  assert.equal(pill.querySelectorAll('[id]').length >= 1, true,
    'fixture sanity: the pill under test carries at least one id-bearing descendant');

  const c = build({ v: 'nowplaying' }, { v: 'home' }, env);
  const deco = c.movers.decoration;
  assert.ok(deco && deco.element, 'fixture sanity: an NP-source transition builds the pill decoration');
  assert.equal(deco.ownership, 'owned-decoration', 'the pill is an owned DECORATION, never a view pane');
  assert.equal(deco.element.querySelectorAll('[id]').length, 0,
    'the pill clone must carry NO ids. If this reddens after Stage 2, the deletion took '
    + 'js/swipe.js:339 (inside npPillClone) instead of js/swipe.js:312 (inside ghostApp) — the '
    + 'two lines are byte-identical and only the first is on the deletion list (plan §12 item 4)');
  assert.equal(deco.element.id, '', 'including the clone\'s own id');
});
