// M2ALIGN — the outgoing app-ghost builder lays the clone's active-view content at the REAL
// fixed-inset content-top, not the vestigial pre-6i in-flow `46px`
// (PLAN-home-shift-fix.md §3, §7.1). Authored red-first by Curie.
//
// THE MECHANISM. The outgoing app-ghost clones `.app`, strips ALL ids — so the cloned
// `#home`/`#browse` LOSES its fixed-inset id-rule and falls to NORMAL FLOW — and sets an inline
// `padding-top: 46px` on the (now id-less) `#library` section, which is the pre-6i in-flow
// topbar clearance. But the REAL active `#home` is a `position:fixed` inset box at
// `top: calc(var(--safe-top) + 51px)` plus `padding-top: 14px`, which ignores `#library`'s
// padding entirely. So the clone lays its first content at a DIFFERENT viewport-Y from the view
// it is covering, and the difference is realized as a fixed vertical jump whenever the ghost
// covers or uncovers the real view. `#browse` carries the identical fixed-inset geometry, so
// the same constant aligns the browse ghost too — an improvement, not a regression.
//
// WHY THE CLONE MUST STAY IN NORMAL FLOW (so the fix is the padding and not the id-rule). The
// ghost simulates the source's scroll with `translateY(-ghostY)` on the whole clone, which
// requires the clone view fully laid out and unclipped. A `position:fixed` + `overflow-y:auto`
// clone view would be re-parented to the transformed clone AND clip its content to the box, so
// the translate-based scroll simulation breaks. The clone therefore stays normal-flow and only
// its content-top OFFSET is corrected — which is exactly what the builder's `#library` padding
// line already controls.
//
// ⛔ WHY THIS CELL ACCEPTS EITHER OF TWO DERIVED VALUES, DELIBERATELY. Setting the clone's
// content-top equal to the real content-top gives
// `clone .app padding-top + #library padding-top = calc(safe + 51 + 14)`. If the clone's `.app`
// padding contributes as modelled, the `--safe-top` term CANCELS and the aligned value is the
// notch-independent constant `(51 + 14) − 12`; if it does not contribute, the aligned value
// carries the safe-top itself. WHICH ONE IS CORRECT IS A LAYOUT FACT, and jsdom computes no
// layout — the deriver's probe read the ghost content at ≈46, i.e. `.app` may not contribute as
// modelled, and the plan directs the builder to MEASURE it against the real layout and to weight
// that measurement over the headline arithmetic. So this cell asserts what CI can honestly
// assert: the value is one of the two DERIVED candidates and is NOT the vestigial `46px`. Both
// candidates are computed from the stylesheet here rather than hardcoded, so a future edit to
// `#home`'s inset or `.app`'s padding moves the expectation with it instead of rotting.
//
// ⛔ HONEST LIMIT. This proves the builder's DECLARED clone geometry, never the on-screen
// alignment: jsdom does no layout and resolves no `calc()` against `env()`. The zero-shift
// itself is DEVICE-owed (§9 R-M2, home→books commit AND abort from the TOP; plus
// R-regress-browse for the browse ghost).
//
// RED AT HEAD (confirmed — quoted in Claude/Curie/RED-home-shift-fix.md): the builder sets
// `'46px'`. Committed `{ skip: SKIP }` (SKIP-PENDING-BUILD) so the committed suite stays green
// for the pre-commit battery, which this project does not bypass. BRUNEL REMOVES THE SKIP to
// drive it red, then sets the measured aligned value to green it.
//
// MUTANT — OWED TO THE BUILD STEP, and this is structural rather than an omission: the natural
// mutant reverts the builder to `'46px'`, so its `from` is the POST-FIX line, which does not
// exist at HEAD. Registering it now would either rot the anchors gate (ANCHOR NOT FOUND) or be
// refused as a no-op (`from === to`). Its exact shape is specified in the RED artifact for
// Brunel to register in the same commit as the fix.
const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const { readRoot } = require('./dom-fixture.js');
const Swipe = require('../js/swipe.js');

const SKIP = 'SKIP-PENDING-BUILD — RED until Brunel replaces the ghost builder\'s vestigial 46px '
  + 'with the measured fixed-inset-aligned value (PLAN-home-shift-fix.md §10 step 2). Remove this '
  + 'skip to drive it red.';

// ── The derivation, from the shipped stylesheet rather than from constants in this file.
function ruleBody(css, sel) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  let at = 0;
  for (;;) {
    const open = stripped.indexOf('{', at);
    if (open < 0) return null;
    const close = stripped.indexOf('}', open);
    if (close < 0) return null;
    const head = stripped.slice(0, open);
    const selector = head.slice(head.lastIndexOf('}') + 1).trim().split(/[\r\n]/).pop().trim();
    if (selector === sel) return stripped.slice(open + 1, close);
    at = close + 1;
  }
}

/** The px addend of a `calc(var(--safe-top) + Npx)`-shaped value, or the bare px value. */
function pxAddend(value) {
  const calc = value.match(/calc\(\s*var\(--safe-top\)\s*\+\s*(-?\d+(?:\.\d+)?)px\s*\)/);
  if (calc) return Number(calc[1]);
  const bare = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  return bare ? Number(bare[1]) : null;
}

const declValue = (body, prop) => {
  const m = body.match(new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)'));
  return m ? m[1].trim() : null;
};

/**
 * The first top-level component of a shorthand value. PAREN-AWARE, because a naive split hits
 * `calc(var(--safe-top) + 12px)` — whose inner `)` closes `var(`, not the `calc(` — and yields a
 * malformed term that silently resolves to null.
 */
function firstComponent(value) {
  let depth = 0;
  let out = '';
  for (const ch of value || '') {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth === 0 && /\s/.test(ch)) { if (out) break; continue; }
    out += ch;
  }
  return out;
}

function alignedCandidates() {
  const css = readRoot('css/app.css');
  const home = ruleBody(css, '#home');
  const app = ruleBody(css, '.app');
  assert.ok(home, 'fixture: a base `#home { … }` rule must exist to derive the real content-top');
  assert.ok(app, 'fixture: a base `.app { … }` rule must exist to derive the clone padding context');

  const homeTop = pxAddend(declValue(home, 'top'));
  const homePadTop = pxAddend(firstComponent(declValue(home, 'padding')));
  const appPadTop = pxAddend(firstComponent(declValue(app, 'padding')));
  assert.ok(homeTop != null && homePadTop != null && appPadTop != null,
    `fixture: the derivation must resolve all three terms from source — got #home top=${homeTop}, `
    + `#home padding-top=${homePadTop}, .app padding-top=${appPadTop}. If a recipe changed shape, `
    + 'RE-DERIVE this cell against the new one; do not hardcode a number.');

  // The real content-top of the active fixed-inset view: calc(safe + top + padding-top).
  const realContentTop = homeTop + homePadTop;
  return {
    realContentTop,
    // (a) the clone's .app padding contributes, so --safe-top cancels.
    cancelled: `${realContentTop - appPadTop}px`,
    // (b) it does not contribute, so the safe-top is carried once by this declaration.
    carried: `calc(var(--safe-top) + ${realContentTop}px)`,
    vestigial: '46px',
  };
}

/** Build a HOME-source outgoing app-ghost through the §7 recipe seam and return its clone. */
function buildHomeGhost({ homeScrollTop = 250 } = {}) {
  const dom = new JSDOM(readRoot('index.html'));
  const doc = dom.window.document;
  // The running app shows the library; index.html ships it `.hidden`, and the builder prunes
  // `.hidden`/`.parked` nodes from the clone whole — so an un-hidden library is what gives the
  // clone real content to lay out.
  doc.getElementById('library').classList.remove('hidden');
  doc.getElementById('home').classList.remove('hidden', 'parked');
  doc.getElementById('home').scrollTop = homeScrollTop;
  const env = {
    document: doc,
    scrollY: () => 0,        // both #home and #browse are fixed own-scroll views: window scroll is 0
    sourceEl: (host, v) => doc.getElementById(v === 'home' ? 'home' : 'browse'),
    navPill: () => doc.querySelector('.np-actions'),
    renderDestination: () => doc.getElementById('browse'),
  };
  const construction = Swipe.buildConstruction({ v: 'home' }, { v: 'books' }, env);
  const wrap = doc.querySelector('.nav-ghost');
  return { construction, wrap, clone: wrap && wrap.firstElementChild, doc };
}

test('M2ALIGN — the outgoing app-ghost builder sets the clone active-view content-top to the real '
  + 'fixed-inset content-top, not the vestigial in-flow 46px', { skip: SKIP }, () => {
  const want = alignedCandidates();
  const { construction, clone } = buildHomeGhost({ homeScrollTop: 250 });

  // ── FIXTURE SANITY: a home source really did build an outgoing app-ghost carrying the home
  // offset. Without this the padding assertion could pass over a clone nobody built.
  assert.ok(clone, 'fixture: a home-source transition must build an outgoing app-ghost wrapping a clone');
  assert.equal(construction.capture.ghostY, 250,
    'fixture: the capture must read the HOME source offset from #home.scrollTop');
  assert.equal(clone.style.transform, 'translateY(-250px)',
    'fixture: the clone must be content-translated by -ghostY — that translate is why the clone has '
    + 'to stay in normal flow, which is why the fix is the padding constant and not the id-rule');
  assert.equal(clone.querySelectorAll('[id]').length, 0,
    'fixture: the builder must strip ALL ids — that is what drops the fixed-inset id-rule and puts '
    + 'the cloned view in normal flow, which is the whole reason a clone-side content-top exists');

  // The builder sets exactly one inline padding-top, on the id-stripped `#library` section.
  // Located by that property rather than by id (the ids are gone) or by position (which would
  // rot on any markup change), and the count is asserted so the locator cannot silently find
  // the wrong node.
  const padded = [...clone.querySelectorAll('*')].filter((n) => n.style && n.style.paddingTop);
  assert.equal(padded.length, 1,
    `the builder must set exactly ONE inline padding-top on the clone (the id-stripped #library `
    + `section) — found ${padded.length}: ${padded.map((n) => n.tagName + '=' + n.style.paddingTop).join(', ')}`);

  const got = padded[0].style.paddingTop;
  assert.notEqual(got, want.vestigial,
    `the clone content-top must NOT be the vestigial pre-6i in-flow ${want.vestigial}: the real `
    + `active view is a position:fixed inset box whose content starts at calc(var(--safe-top) + `
    + `${want.realContentTop}px) and which ignores #library's padding entirely, so ${want.vestigial} `
    + 'lays the ghost content at a different viewport-Y from the view it covers — realized as a '
    + 'fixed vertical jump every time the ghost covers or uncovers the real view.');
  assert.ok([want.cancelled, want.carried].includes(got),
    `the clone content-top must be one of the two DERIVED aligned values — \`${want.cancelled}\` if `
    + `the clone's .app padding contributes (so --safe-top cancels) or \`${want.carried}\` if it does `
    + `not — and WHICH ONE is a layout fact jsdom cannot compute, so the builder MEASURES it against `
    + `the real clone layout and this cell accepts either. Got \`${got}\`. Both candidates are `
    + 'derived from css/app.css here, so if a recipe changed, re-derive rather than hardcoding.');
});

test('M2ALIGN derivation — the three terms come from the shipped stylesheet and the candidates are '
  + 'distinct from the vestigial value', () => {
  // Green at HEAD: this guards the DERIVATION, not the builder. If it ever produced `46px` as a
  // candidate, the cell above could pass on the un-fixed builder — the vacuous shape this
  // campaign keeps producing, so it is closed explicitly.
  const want = alignedCandidates();
  assert.equal(want.realContentTop, 65,
    'the real active-view content-top is #home\'s top addend (51) plus its padding-top (14), '
    + `derived from source — got ${want.realContentTop}. A change here means the #home recipe moved `
    + 'and BOTH this cell and PLAN-home-shift-fix.md §3 need re-deriving.');
  assert.notEqual(want.cancelled, want.vestigial);
  assert.notEqual(want.carried, want.vestigial);
  assert.match(want.carried, /^calc\(var\(--safe-top\) \+ \d+px\)$/,
    'the safe-top-carrying candidate must be a valid calc() form — jsdom stores it verbatim on an '
    + 'inline style, which is what lets the cell above compare against it at all');
});
