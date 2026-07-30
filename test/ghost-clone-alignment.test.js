// M2ALIGN — Stage-1-scoped interim guard for the surviving browse->browse app-ghost's
// clone content-top alignment (js/swipe.js ghostApp).
//
// WHY THIS FILE EXISTS NOW. PLAN-swipe-declone.md's Stage 1 narrows ghostApp's own
// invocation to the one remaining owned-pane case, browse->browse (every other
// transition now moves its real view element directly), and deletes that recipe's
// prior dedicated CI cell, test/ghost-clone-geometry.test.js (M2ALIGN), as part of the
// same commit (plan §12 item 16) — that cell drove the retired HOME-source path and
// could not survive it unchanged. The `53px` `#library` padding-top compensation the
// deleted cell defended is NOT deleted in Stage 1: it stays load-bearing for the
// still-live browse->browse ghost until Stage 2 removes `ghostApp` itself (plan §12
// item 5). That left the mutation registered against it (tools/mutate.mjs, M2ALIGN)
// with no designated killer — a live production constant, unguarded, which is the
// exact shape of the founding defect this constant was patched to fix (an unpoliced
// hand-tuned alignment number). This cell closes that gap for the interim.
//
// SCOPE. Exclusively the surviving browse->browse path — no home-source assertion,
// because no home-source ghost exists any more (js/swipe.js's `fromKind` parameter and
// home-offset branch were retired in the same Stage-1 commit).
//
// DELETE THIS FILE together with the `53px` constant and mutation #101 (M2ALIGN) when
// Stage 2 lands (PLAN-swipe-declone.md §12 items 5, 16, 17) — do not migrate it further.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { readRoot, ROOT } = require('./dom-fixture.js');

const Swipe = require(path.join(ROOT, 'js', 'swipe.js'));

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

// Derived from `#browse` — the real host of the ONE transition ghostApp still builds —
// rather than `#home`; the two carry identical fixed-inset geometry (same `top`/`padding`
// declarations) but #browse is the one actually in play for browse->browse.
function alignedCandidates() {
  const css = readRoot('css/app.css');
  const browse = ruleBody(css, '#browse');
  const app = ruleBody(css, '.app');
  assert.ok(browse, 'fixture: a base `#browse { … }` rule must exist to derive the real content-top');
  assert.ok(app, 'fixture: a base `.app { … }` rule must exist to derive the clone padding context');

  const browseTop = pxAddend(declValue(browse, 'top'));
  const browsePadTop = pxAddend(firstComponent(declValue(browse, 'padding')));
  const appPadTop = pxAddend(firstComponent(declValue(app, 'padding')));
  assert.ok(browseTop != null && browsePadTop != null && appPadTop != null,
    `fixture: the derivation must resolve all three terms from source — got #browse top=${browseTop}, `
    + `#browse padding-top=${browsePadTop}, .app padding-top=${appPadTop}. If a recipe changed shape, `
    + 'RE-DERIVE this cell against the new one; do not hardcode a number.');

  const realContentTop = browseTop + browsePadTop;
  return {
    realContentTop,
    // (a) the clone's .app padding contributes, so --safe-top cancels.
    cancelled: `${realContentTop - appPadTop}px`,
    // (b) it does not contribute, so the safe-top is carried once by this declaration.
    carried: `calc(var(--safe-top) + ${realContentTop}px)`,
    vestigial: '46px',
  };
}

/** Build a BROWSE-source outgoing app-ghost (books->authors) through the buildConstruction seam. */
function buildBrowseGhost({ browseScrollTop = 250 } = {}) {
  const dom = new JSDOM(readRoot('index.html'));
  const doc = dom.window.document;
  const lib = doc.getElementById('library'); if (lib) lib.classList.remove('hidden');
  const browse = doc.getElementById('browse'); if (browse) browse.classList.remove('hidden');
  browse.scrollTop = browseScrollTop;
  const env = {
    document: doc,
    scrollY: () => 0,
    sourceEl: (host, v) => doc.getElementById(v === 'home' ? 'home' : 'browse'),
    navPill: () => doc.querySelector('.np-actions'),
    renderDestination: () => doc.getElementById('browse'),
  };
  const construction = Swipe.buildConstruction(
    { v: 'books' }, { v: 'authors', author: { ratingKey: 'A' } }, env);
  const wrap = doc.querySelector('.nav-ghost');
  return { construction, wrap, clone: wrap && wrap.firstElementChild, doc };
}

test('M2ALIGN — the browse->browse app-ghost builder sets the clone active-view content-top to the '
  + 'real fixed-inset content-top, not the vestigial in-flow 46px', () => {
  const want = alignedCandidates();
  const { construction, clone } = buildBrowseGhost({ browseScrollTop: 250 });

  // ── FIXTURE SANITY: a browse source really did build an outgoing app-ghost carrying the
  // browse offset. Without this the padding assertion could pass over a clone nobody built.
  assert.ok(clone, 'fixture: a browse-source transition must build an outgoing app-ghost wrapping a clone');
  assert.equal(construction.capture.ghostY, 250,
    'fixture: the capture must read the BROWSE source offset from #browse.scrollTop');
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
    + `active #browse is a position:fixed inset box whose content starts at calc(var(--safe-top) + `
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
    'the real active-view content-top is #browse\'s top addend (51) plus its padding-top (14), '
    + `derived from source — got ${want.realContentTop}. A change here means the #browse recipe moved `
    + 'and BOTH this cell and js/swipe.js\'s derivation comment need re-deriving.');
  assert.notEqual(want.cancelled, want.vestigial);
  assert.notEqual(want.carried, want.vestigial);
  assert.match(want.carried, /^calc\(var\(--safe-top\) \+ \d+px\)$/,
    'the safe-top-carrying candidate must be a valid calc() form — jsdom stores it verbatim on an '
    + 'inline style, which is what lets the cell above compare against it at all');
});
