// STAGE 2 of PLAN-swipe-declone.md — the SOURCE-STRUCTURAL half of the Coverage Model in the
// plan's §14, authored red-first by the test author (2026-08-01) from the FORGED plan
// (Claude/Charpy/PLAN-swipe-declone-stage2-charpy-r4.md), BEFORE the Stage-2 build. Plan §13
// step 9; the build is step 10. Companion note: Claude/Curie/RED-swipe-declone-stage2.md.
//
// WHAT STAGE 2 CHANGES (plan §5.3.1). `#browse` KEEPS its position:fixed inset box and gives up
// ONLY `overflow-y: auto` and its padding. Each `.browsepage` becomes a `position: absolute;
// inset: 0` scroller inside it. `.browsepage.parked` loses its own position/insets and parks by
// transform alone, so every box property cascades from the base rule exactly as `#home.parked`
// does (Invariant P). `ghostApp` and its 53px constant are deleted.
//
// CELLS IN THIS FILE (plan §14).
//   PAGEISVIEW           RED@HEAD  the page is the scroller and the host is not.
//   PARKBOXEQUAL         RED@HEAD  the parked page box equals the active one, by cascade.
//   BROWSESURFACE        RED@HEAD  the indicator claims a .browsepage; native bars stay hidden.
//   MOVERHASBOX          GREEN@HEAD, GATE — every id-resolved mover host generates a box.
//   PARKLOSESTRANSFORM   GREEN@HEAD, GATE — the park rule cannot beat the drag's inline write.
//
// ⛔ SCOPE, honestly. jsdom has no layout, no paint, no font boosting and no scroll anchoring.
// EVERY assertion in this file is a property of CSS TEXT or of a pure classifier's return value.
// NOT ONE asserts a resolved box, a paint order, a containing-block flip, a reveal jump or that
// anything looks right. Those are plan §15's rows — real-engine-measured (R2b/R2c, step 10a) or
// device-owed (R3/R5/R7, step 10b) — and a CI cell claiming them could not fail, which is what
// makes it a false witness rather than weak coverage.
//
// ⭐ WHY TEXTUAL AND NOT BEHAVIOURAL, for the two gates. The behaviour MOVERHASBOX and
// PARKLOSESTRANSFORM protect (a transform actually taking effect; a class rule losing the
// cascade to an inline write) is unobservable without a layout engine. A textual cell cannot be
// made vacuous by the environment, which is this project's established reason for preferring one
// (plan §14). Both are green at HEAD and must STAY green — they are registered as gates, not as
// red cells, and the plan's mutants are what give them their teeth.
const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const { readRoot } = require('./dom-fixture.js');

// scrollbar.js's isDoc() reads `document` and `window` as bare globals at call time.
const dom = new JSDOM('<!doctype html><body></body>');
global.window = dom.window;
global.document = dom.window.document;
const { surfaceKind } = require('../js/scrollbar.js')._test;

const SKIP_PAGEISVIEW = 'SKIP-PENDING-BUILD — RED until the builder relocates the scroller from '
  + '#browse to .browsepage (PLAN-swipe-declone.md §5.3.1, step 10). Remove this skip to drive it red.';
const SKIP_PARKBOX = 'SKIP-PENDING-BUILD — RED until the builder deletes position/top/left/right/'
  + 'max-width/margin from .browsepage.parked (PLAN-swipe-declone.md §5.3.3, step 10). Remove this '
  + 'skip to drive it red.';
const SKIP_SURFACE = 'SKIP-PENDING-BUILD — RED until the builder adds the .browsepage case to '
  + 'ScrollBar.surfaceKind and to the native-scrollbar suppression selector list '
  + '(PLAN-swipe-declone.md §10, step 10). Remove this skip to drive it red.';

// ════════════════════════════════════════════════════════════════════════════════════════════
// CSS READING. Comments are stripped FIRST and that is load-bearing: the build adds source
// comments to these very rules which must SAY the words this file asserts on (plan §12 items
// 21-22 rewrite the Invariant P comment and the #browse comment). A parser that read comment
// text as declarations would fail on the comment the plan mandates.
// ════════════════════════════════════════════════════════════════════════════════════════════
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * Every rule in the sheet as { selector, body }, DESCENDING into conditional at-rules so a rule
 * nested in an @media is not silently invisible to an "absent anywhere in the sheet" assertion.
 */
function parseRules(css) {
  const out = [];
  const walk = (start, end) => {
    let i = start;
    let ps = start;
    while (i < end) {
      const ch = css[i];
      if (ch === '{') {
        const prelude = css.slice(ps, i).trim();
        let depth = 1;
        let j = i + 1;
        while (j < end && depth > 0) {
          if (css[j] === '{') depth++;
          else if (css[j] === '}') depth--;
          j++;
        }
        const bodyEnd = j - 1;
        if (/^@(media|supports|layer|container|scope)\b/.test(prelude)) walk(i + 1, bodyEnd);
        else if (!prelude.startsWith('@')) out.push({ selector: prelude.replace(/\s+/g, ' '), body: css.slice(i + 1, bodyEnd) });
        i = j; ps = j;
      } else if (ch === '}') { i++; ps = i; } else i++;
    }
  };
  walk(0, css.length);
  return out;
}

/** Split a shorthand value on top-level whitespace — paren-aware, so calc() survives whole. */
function splitValue(value) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth === 0 && /\s/.test(ch)) { if (cur) { parts.push(cur); cur = ''; } continue; }
    cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}
const box = (parts) => { const [a, b = a, c = a, d = b] = parts; return [a, b, c, d]; };

/**
 * Expand ONE declaration to longhands. Only the shorthands these rules are actually written as
 * are expanded; anything else passes through under its own name, which fails CLOSED against an
 * allow-list — that is the point, not an omission.
 */
function expand(prop, value) {
  const p = splitValue(value);
  if (prop === 'padding' || prop === 'margin') {
    const [t, r, b, l] = box(p);
    return [[prop + '-top', t], [prop + '-right', r], [prop + '-bottom', b], [prop + '-left', l]];
  }
  if (prop === 'inset') {
    const [t, r, b, l] = box(p);
    return [['top', t], ['right', r], ['bottom', b], ['left', l]];
  }
  if (prop === 'overflow') { const [x, y = x] = p; return [['overflow-x', x], ['overflow-y', y]]; }
  return [[prop, value]];
}

/** Declarations as written: [{ prop, value, important }]. */
function declarations(body) {
  const out = [];
  for (const raw of body.split(';')) {
    const decl = raw.trim();
    if (!decl) continue;
    const i = decl.indexOf(':');
    if (i < 0) continue;
    let value = decl.slice(i + 1).trim();
    const important = /!\s*important$/i.test(value);
    if (important) value = value.replace(/!\s*important$/i, '').trim();
    out.push({ prop: decl.slice(0, i).trim().toLowerCase(), value, important });
  }
  return out;
}

/** longhand -> value for one rule; last declaration wins (the cascade WITHIN a rule). */
function longhandMap(body) {
  const map = new Map();
  for (const d of declarations(body)) for (const [lh, v] of expand(d.prop, d.value)) map.set(lh, v);
  return map;
}

const CSS = stripCssComments(readRoot('css/app.css'));
const RULES = parseRules(CSS);
/**
 * Every rule whose selector LIST contains `sel` as one whole comma-separated part. Grouped
 * selectors are the norm in this sheet (the overlay ids share one rule), so an exact
 * whole-selector match would silently find nothing and every "absent" assertion would pass
 * vacuously — which is the failure mode this file's parser-sanity cell exists to forbid.
 */
const rulesFor = (sel) => RULES.filter((r) => r.selector.split(',').some((p) => p.trim() === sel));
/** longhand -> value merged across every rule matching `sel`, in source order. */
const mapFor = (sel) => {
  const rs = rulesFor(sel);
  if (!rs.length) return null;
  const map = new Map();
  for (const r of rs) for (const [k, v] of longhandMap(r.body)) map.set(k, v);
  return map;
};

// ── PARSER SANITY. An "absent" assertion is satisfied perfectly by a parser that found nothing,
// so every cell below rides on this: the parser must find a sheet, and must read a rule whose
// contents are known independently of anything Stage 2 changes.
test('fixture sanity — the stylesheet parser reads real rules (no "absent" cell may ride on an empty parse)', () => {
  assert.ok(RULES.length > 200, `parsed only ${RULES.length} rules from css/app.css — the parser is broken`);
  const home = mapFor('#home');
  assert.ok(home, 'the #home rule must parse');
  assert.equal(home.get('position'), 'fixed', '#home is a position:fixed inset box (css:161)');
  assert.equal(home.get('overflow-y'), 'auto', '#home is its own scroller (css:167)');
  const parked = mapFor('#home.parked');
  assert.ok(parked, 'the #home.parked rule must parse');
  assert.equal(parked.get('overflow-y'), 'hidden', '#home.parked keeps overflow:hidden (css:110-117)');
  assert.equal(parked.has('top'), false, 'Invariant P: #home.parked declares no top');
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// PAGEISVIEW — RED @HEAD (unit, css structural audit). Plan §14.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. Each browse page is its own inset own-scroll box whose scroll and content
// declarations are the ones the browse HOST carried before the relocation, and the host itself is
// no longer a scroller.
//
// ⭐ THE RETIRED VALUES ARE CAPTURED, NOT HARDCODED (plan §14 fixture). The comparison is against
// the #browse scroller AS IT SHIPS AT HEAD (css:184-191), snapshotted below at authoring time.
// It cannot be read live from #browse after the build, because the build is what removes it —
// so the snapshot is the oracle, and a page that declares a DIFFERENT padding than the host it
// replaces reddens here rather than shifting the content box by a value nobody compared.
const RETIRED_BROWSE_SCROLLER = {
  'overflow-y': 'auto',
  '-webkit-overflow-scrolling': 'touch',
  'overscroll-behavior': 'contain',
  'padding-top': '14px',
  'padding-right': '16px',
  'padding-bottom': '40px',
  'padding-left': '16px',
};
const RETIRED_HAS_PLAYER_PADDING_BOTTOM = '20px';

test('PAGEISVIEW — each .browsepage is its own inset own-scroll box carrying the retired #browse '
  + 'scroller declarations, and #browse is no longer a scroller', { skip: SKIP_PAGEISVIEW }, () => {
  const page = mapFor('.browsepage');
  assert.ok(page, 'RED @HEAD: there is NO `.browsepage` base rule at all — a browse page is an '
    + 'in-flow div (css:79-80 records exactly that). Stage 2 must add one (plan §5.3.1).');

  assert.equal(page.get('position'), 'absolute',
    'the page must be position:absolute — a position:fixed page is re-contained by a transformed '
    + '#browse and loses T+B of height at drag start (plan §5.3.2, measured 164px)');
  for (const side of ['top', 'right', 'bottom', 'left']) {
    assert.equal(page.get(side), '0',
      `the page must declare inset:0 (${side}) so its border box IS #browse's border box (plan §5.3.2)`);
  }

  const wrong = [];
  for (const [prop, want] of Object.entries(RETIRED_BROWSE_SCROLLER)) {
    const got = page.get(prop);
    if (got !== want) wrong.push(`${prop}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
  assert.deepEqual(wrong, [], 'every scroll/content declaration the retired #browse scroller carried must '
    + `move to .browsepage UNCHANGED, or the content box is not the one the geometry derivation assumes:\n  ${wrong.join('\n  ')}`);

  const pagePlayer = mapFor('body.has-player .browsepage');
  assert.ok(pagePlayer, 'the has-player padding-bottom override must move to the page too (plan §5.3.1)');
  assert.equal(pagePlayer.get('padding-bottom'), RETIRED_HAS_PLAYER_PADDING_BOTTOM,
    'the has-player padding-bottom must be the value body.has-player #browse carried (css:191)');

  // THE HOST GIVES UP THE SCROLLER ROLE. Two scroll authorities at once is NATURAL-c.
  const host = mapFor('#browse');
  assert.ok(host, 'the #browse rule must still exist — the host KEEPS its box (plan §5.3.1)');
  assert.equal(host.has('overflow-y'), false,
    '#browse must declare NO overflow-y: leaving it makes the host a second scroll authority');
  for (const p of ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']) {
    assert.equal(host.has(p), false, `#browse must declare no ${p} — the padding moved to the page`);
  }
  const hostPlayer = mapFor('body.has-player #browse');
  if (hostPlayer) {
    assert.equal(hostPlayer.has('padding-bottom'), false,
      'body.has-player #browse must declare no padding-bottom — it moved to body.has-player .browsepage');
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// PARKBOXEQUAL — RED @HEAD (unit, css structural audit). Plan §14, §5.3.3.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. A parked browse page occupies the same box as an active one, because the parked rule
// declares no position and no insets of its own and inherits every box property from the base
// rule — exactly as `#home.parked` does.
//
// ⭐ THE TWO PARK RULES ARE COMPARED AGAINST ONE ANOTHER, not against a hardcoded list (plan §14
// / round-1 F4). The shared half — `top` and `bottom` absent, `overflow` literally `hidden` — is
// asserted over BOTH rules from one list, so a future edit that weakens Invariant P on either one
// reddens here. The page-specific half (position/left/right/max-width/margin also absent) is the
// plan's own §12 item 20 deletion list: a page inherits its parent's box, so restating them is the
// "separately-maintained restatement" Invariant P names as the failure mode.
const PARK_RULES = ['#home.parked', '.browsepage.parked'];
const PARK_MUST_BE_ABSENT_BOTH = ['top', 'bottom'];
const PAGE_PARK_MUST_BE_ABSENT = ['position', 'left', 'right', 'max-width',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left'];
const PARK_MUST_DECLARE = ['transform', 'pointer-events', 'z-index'];

test('PARKBOXEQUAL — .browsepage.parked declares no position and no insets, so its box cascades '
  + 'from the base rule exactly as #home.parked does', { skip: SKIP_PARKBOX }, () => {
  const maps = new Map();
  for (const sel of PARK_RULES) {
    const m = mapFor(sel);
    assert.ok(m, `the ${sel} rule must exist — Stage 2 RE-DERIVES the page park rule, it does not delete it`);
    maps.set(sel, m);
  }

  // (a) The SHARED invariant, asserted over both rules from one list.
  const shared = [];
  for (const sel of PARK_RULES) {
    const m = maps.get(sel);
    for (const p of PARK_MUST_BE_ABSENT_BOTH) {
      if (m.has(p)) shared.push(`${sel} declares ${p}: ${m.get(p)}`);
    }
    if (m.get('overflow-y') !== 'hidden' || m.get('overflow-x') !== 'hidden') {
      shared.push(`${sel} must declare overflow: hidden (got x=${m.get('overflow-x')} y=${m.get('overflow-y')})`);
    }
    for (const p of PARK_MUST_DECLARE) if (!m.has(p)) shared.push(`${sel} must declare ${p}`);
  }
  assert.deepEqual(shared, [], 'RED @HEAD: `.browsepage.parked` declares `top: 0` (css:87). Both park rules '
    + 'must obey Invariant P — no block-direction insets of their own, and overflow:hidden on the two grounds '
    + `css:110-117 records (scroll-container status; Blink anchoring un-suppression):\n  ${shared.join('\n  ')}`);

  // (b) The PAGE-specific deletions (plan §12 item 20). A page fills its parent's box.
  const page = maps.get('.browsepage.parked');
  const restated = PAGE_PARK_MUST_BE_ABSENT.filter((p) => page.has(p)).map((p) => `${p}: ${page.get(p)}`);
  assert.deepEqual(restated, [], 'RED @HEAD: the parked page rule restates position/left/right/max-width/margin '
    + '(css:86-91). With the page an inset:0 child of #browse those are inherited, and a restatement is the '
    + `separately-maintained divergence Invariant P exists to forbid:\n  ${restated.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// PARKLOSESTRANSFORM — GREEN @HEAD, GATE (unit, css structural audit). Plan §14, §5.3.6.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. The parked browse-page rule cannot win the cascade against the drag's inline
// transform, so an outgoing mover carrying `.parked` still tracks the gesture.
//
// WHY THIS EXISTS. Stage 2 leaves the park applied at the drag-start render and cleared at the
// hold's release, so for the WHOLE of a browse->browse gesture the outgoing mover carries
// `.parked` while `js/app.js` writes `style.transform` on it every frame. That works only because
// the class rule declares no `!important`. A later `!important` would silently make the outgoing
// mover jump to translateX(-101vw) at drag start — the most visible possible regression, and one
// no behavioural cell in jsdom can see. This is a fact about the stylesheet as written, so the
// stylesheet is where it is asserted.
test('PARKLOSESTRANSFORM [GATE] — no rule matching a .browsepage declares an !important transform, '
  + 'so the drag\'s inline write always wins the cascade', () => {
  const browsepageRules = RULES.filter((r) => r.selector.includes('.browsepage'));
  assert.ok(browsepageRules.length > 0, 'fixture sanity: the sheet has at least one .browsepage rule');

  // ANTI-VACUITY: the "no !important transform" claim is worthless if no such rule declares a
  // transform at all. The park IS the transform, so at least one must.
  const declaring = browsepageRules.filter((r) => declarations(r.body).some((d) => d.prop === 'transform'));
  assert.ok(declaring.length > 0,
    'fixture sanity: at least one .browsepage rule must declare a transform (the park IS the transform) — '
    + 'otherwise this cell asserts the absence of something that never occurs');

  const bad = [];
  for (const r of browsepageRules) {
    for (const d of declarations(r.body)) {
      if (d.prop === 'transform' && d.important) bad.push(`${r.selector} { transform: ${d.value} !important }`);
    }
  }
  assert.deepEqual(bad, [], 'a .browsepage transform declared !important beats the swipe\'s inline '
    + `style.transform (js/app.js:594, :615) and parks the outgoing mover off-viewport for the whole drag:\n  ${bad.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// MOVERHASBOX — GREEN @HEAD, GATE (source structural). Plan §14, Invariant D5.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. Every ID-RESOLVED element a swipe can resolve as a mover generates a principal box,
// so the inline drag transform is never inert.
//
// ⭐ THE INVARIANT IS NARROWED TO THE ID-RESOLVED HOSTS, DELIBERATELY (plan §14). Stage 2 adds a
// fourth resolution path — `Browse.pageElFor` behind the two 'browse-page' hosts — that returns an
// element with NO id, so a set derived from ids stops being the complete mover set in the same
// commit that makes `.browsepage` resolvable. PAGEISVIEW is the page's cover: it pins the base
// rule's `position: absolute` and `inset: 0` textually, so a change that made a page boxless
// reddens there. A cell whose stated invariant is wider than its derivation is the same defect as
// a cell that is green on the thing it appears to cover.
//
// This cell is GREEN at HEAD and must stay green. It is the structural form of round-1 F1, the
// defect where `display: contents` on #browse made the drag transform inert on four SHIPPED
// transitions.
test('MOVERHASBOX [GATE] — every id-resolved swipe mover host generates a principal box, and '
  + '#browse is still a position:fixed box', () => {
  const navSrc = readRoot('js/nav.js');
  const appSrc = readRoot('js/app.js');

  // DERIVED from source, never restated: the ids Nav.appViewEl / Nav.overlayEl / Nav.viewElFor
  // can return. overlayEl(v) returns d.byId(v) for any overlay, so the overlay set IS
  // SETTINGS_SUBS + options + nowplaying.
  const subsMatch = navSrc.match(/SETTINGS_SUBS\s*=\s*\[([^\]]*)\]/);
  assert.ok(subsMatch, 'fixture sanity: SETTINGS_SUBS must be derivable from js/nav.js');
  const subs = subsMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const hostIds = ['home', 'browse', 'options', 'nowplaying', ...subs];
  assert.ok(hostIds.length >= 7 && hostIds.includes('browse') && hostIds.includes('home'),
    `fixture sanity: derived a real mover-host id set (${hostIds.join(', ')})`);

  // The browse host is ALSO returned literally by the browse-host render branch (js/app.js:544).
  // Derivation sanity, so "the set is complete" is not an assumption.
  assert.match(appSrc, /host === 'browse-host'[\s\S]{0,240}?return \$\('browse'\)/,
    'fixture sanity: the browse-host render branch must still return the #browse host literally — '
    + 'if this moved, the derived mover-host set below is no longer complete');

  // Each host is styled through its id OR through a class it carries in the SHIPPED markup
  // (#nowplaying is styled by `.nowplaying`), so the base rules are resolved against
  // index.html rather than assumed to be id-keyed. `.hidden`/`.parked` are excluded: those are
  // the legitimate visibility toggles, not a declaration that the element has no box.
  const idxDoc = new JSDOM(readRoot('index.html')).window.document;
  const TOGGLES = new Set(['hidden', 'parked']);
  const bad = [];
  for (const id of hostIds) {
    const el = idxDoc.getElementById(id);
    if (!el) { bad.push(`#${id} is not in index.html — the derived mover-host set is stale`); continue; }
    const sels = ['#' + id, ...[...el.classList].filter((c) => !TOGGLES.has(c)).map((c) => '.' + c)];
    const found = sels.flatMap((s) => rulesFor(s));
    if (!found.length) { bad.push(`#${id} has no base rule at all (tried ${sels.join(', ')})`); continue; }
    for (const r of found) {
      const display = longhandMap(r.body).get('display');
      if (display === 'contents' || display === 'none') {
        bad.push(`#${id} via \`${r.selector}\` declares display: ${display} — an element with no principal box cannot be transformed`);
      }
    }
  }
  assert.deepEqual(bad, [], `a swipe mover host that generates no box makes the drag transform INERT:\n  ${bad.join('\n  ')}`);

  const host = mapFor('#browse');
  assert.equal(host.get('position'), 'fixed',
    '#browse must remain a position:fixed box: three SHIPPED transitions (browse->home, '
    + 'browse->overlay, home->browse) resolve it as a mover and transform it (plan §5.1)');
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// BROWSESURFACE — RED @HEAD (unit). Plan §14, round-1 F6.
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE CLAIM. The custom scroll indicator recognises a browse page as a supported scroll surface,
// and the native-scrollbar suppression covers it.
//
// WHY THE SECOND HALF IS NOT COSMETIC (plan §5.3.2). A reserved classic scrollbar gutter comes out
// of the scroll container's PADDING BOX, which is the box an absolutely-positioned descendant
// resolves against — so a `.browsepage` that reserves one is narrower than #browse's border box by
// the gutter, and every "identical rectangle" claim in §5.3.2 and §5.4 is off by it (measured 15px
// in Blink). The suppression reaching `.browsepage` is a PRECONDITION of the geometry derivation.
test('BROWSESURFACE — ScrollBar.surfaceKind claims a .browsepage, and the native-scrollbar '
  + 'suppression selector list covers it', { skip: SKIP_SURFACE }, () => {
  const el = document.createElement('div');
  el.className = 'browsepage';
  document.body.appendChild(el);
  try {
    // ANTI-VACUITY: the classifier must still return null for something genuinely unsupported,
    // or "returns non-null" is satisfied by a classifier that claims everything.
    const stray = document.createElement('div');
    stray.className = 'sheet';
    document.body.appendChild(stray);
    assert.equal(surfaceKind(stray), null,
      'fixture sanity: surfaceKind must still return null for an unsupported surface');
    document.body.removeChild(stray);

    assert.ok(surfaceKind(el) != null,
      'RED @HEAD: surfaceKind keys on `t.id === \'browse\'` (js/scrollbar.js:50) and a .browsepage '
      + 'carries no id (js/browse.js:494-495), so update() takes the unsupported branch and the '
      + 'indicator REMOVES ITSELF on browse the moment the page becomes the scroller');
  } finally { el.remove(); }

  // The suppression list, read from the sheet. Both the `scrollbar-width` rule and the
  // ::-webkit-scrollbar rule must cover the page, or a native bar returns on WebKit.
  const covering = RULES.filter((r) => /\.browsepage/.test(r.selector)
    && (/scrollbar-width/.test(r.body) || /::-webkit-scrollbar/.test(r.selector)));
  assert.ok(covering.length >= 2,
    'RED @HEAD: css:811-814 suppresses native scrollbars BY ID (#browse among them) and a .browsepage '
    + 'is not covered by either the `scrollbar-width: none` rule or the `::-webkit-scrollbar` rule. '
    + `Both must be extended (plan §10, §5.3.2). Covering rules found: ${covering.length}`);
});
