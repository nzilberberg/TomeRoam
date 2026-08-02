// PLAN-parked-page-rides-home.md §8 — CI cell 1, PARKOUTOFREACH (unit, CSS structural).
// Authored red-first by the test author (2026-08-02) from the RATIFIED plan, at HEAD 04739c9,
// BEFORE the one-declaration build. Companion note:
// Claude/Curie/parked-page-rides-home-test-design-2026-08-02.md.
//
// THE DEFECT. `.browsepage.parked` parks by `transform: translateX(-101vw)` on a
// `position: absolute; inset: 0` child of `#browse`, so the park is expressed in #BROWSE'S
// coordinate space — and on a home->browse drag #browse is itself the incoming mover at
// `translateX(w + t)`. The two compose to `homeX - 0.01w`: the parked page lands ON Home, by
// construction, for the whole gesture (measured, 7/7 touchmove samples, real Blink engine).
//
// THE LAW THIS CELL PINS. A parked page is out of reach when its offset exceeds every
// displacement its container can take, plus the page's own right edge in viewport space:
//
//     park-offset  >  max |displacement of #browse|  +  (L + W)
//                  >  100vw                          +  100vw      =  200vw   <- the FLOOR
//
// STRICT, because at exactly the floor the right edge lands exactly on the viewport's left edge
// (the 640px boundary case, where W = V and L = 0).
//
// ⭐ THE FLOOR IS DERIVED, NOT TYPED TWICE. Term 2 is computed by parsing #browse's own box
// declarations, so a change to that box MOVES the floor instead of silently invalidating it. A
// cell that summed two literals with the provenance in a comment would re-enter reach with every
// gate green — the same shape as the defect being fixed. Term 1 (100vw) is not re-derivable from
// CSS; it is pinned independently, against the real entry point, by DRAGREACHBOUNDED in
// test/parked-page-rides-home-browse.test.js.
//
// CELLS IN THIS FILE — all eight GREEN, all eight mutation-witnessed.
//   fixture sanity            the parse found a sheet, a park transform and a box (anti-vacuity).
//   left/right/margin         GATE — the centring precondition; killed by mutation PARKINSET.
//   no width                  GATE — killed by mutation PARKM3P.
//   no min-width              GATE — killed by mutation PARKM4.
//   no padding/border         GATE — killed by mutation PARKPAD.
//   max-width bar             GATE — killed by mutation PARKM3.
//   strict inequality         killed by mutation PARKM1 (the shipped defect restored).
//   shipped form              killed by mutation PARKM1 and, alone, by PARKM2 (-250vw).
//
// ⭐ WHY EIGHT NAMED TESTS AND NOT ONE. The plan's §11 gate proves "this mutant reddens this
// CELL"; it explicitly cannot prove "this mutant reddens this ASSERTION within the cell" (its
// F14), and that finer level is exactly where two of its three review rounds found a defect —
// a mutant killing a cell through its anti-vacuity check while the assertion it was registered
// to witness stayed untested. Splitting the assertions into separately-named tests makes the
// sweep's own `killed by:` output the attribution, mechanically, at no extra cost.
//
// ⭐ THE STRUCTURAL BARS ARE PRECONDITIONS OF THE ARITHMETIC. The strict-inequality test computes
// the floor from `left/right/margin/max-width` alone and does NOT re-assert the bars, so that each
// mutant reddens exactly one test. The refusal to certify a box the cell cannot bound is carried
// by the bars being required-green members of the same suite: add `width: 200vw` to #browse and
// `npm test` fails, which is the same protection with better attribution.
//
// ⛔ SCOPE, honestly. Every assertion here is a property of CSS TEXT and of arithmetic over it.
// NOT ONE asserts a resolved box — jsdom has no layout and returns all-zero rects, so a jsdom
// cell claiming the geometry could not fail. The geometry is witnessed by the real-engine oracle,
// Claude/Curie/parked-page-rides-home-oracle.probe.js, deliberately outside `npm test`. This cell
// also says nothing about a MID-GESTURE viewport change: that is outside the law's stated
// precondition (plan §4 F5, executed by the adversary at 62px of re-entry), not inside this
// cell's silence.
const { test } = require('node:test');
const assert = require('node:assert');
const { readRoot, appDom } = require('./dom-fixture.js');

// ════════════════════════════════════════════════════════════════════════════════════════════
// CSS READING. Comments are stripped FIRST and that is load-bearing: the build ADDS the distance
// law to this very rule's comment (plan §4), and a parser that read comment text as declarations
// would fail on the comment the plan mandates.
// ════════════════════════════════════════════════════════════════════════════════════════════
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * Every rule in the sheet as { selector, body }, DESCENDING into conditional at-rules so a rule
 * nested in an @media is not invisible here. That descent is not decoration: "a second rule
 * matching #browse added later (media query, body-class variant) carrying width/min-width would
 * widen the box with the cell green" is a named finding against this cell's design
 * (Claude/Loki/parked-page-rides-home-strike-2026-08-02.md, lesser plane 1).
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
const box4 = (parts) => { const [a, b = a, c = a, d = b] = parts; return [a, b, c, d]; };

/**
 * Expand ONE declaration to longhands. Only the shorthands these rules are written as are
 * expanded; anything else passes through under its own name, which fails CLOSED against the
 * property bars below — an unrecognised shorthand is not silently dropped, it is compared under
 * its own name and, if it is one of the barred names, it reddens.
 */
function expand(prop, value) {
  const p = splitValue(value);
  if (prop === 'padding' || prop === 'margin') {
    const [t, r, b, l] = box4(p);
    return [[prop + '-top', t], [prop + '-right', r], [prop + '-bottom', b], [prop + '-left', l]];
  }
  if (prop === 'inset') {
    const [t, r, b, l] = box4(p);
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
/** longhand -> value for one rule body; last declaration wins (the cascade WITHIN a rule). */
const longhands = (body) => declarations(body).flatMap((d) => expand(d.prop, d.value));

const CSS = stripCssComments(readRoot('css/app.css'));
const RULES = parseRules(CSS);

// ════════════════════════════════════════════════════════════════════════════════════════════
// THE PARSE SCOPE — every rule that can CONTRIBUTE to an element, not the first one that names it
// ════════════════════════════════════════════════════════════════════════════════════════════
// Selector matching is done by a REAL selector engine (jsdom) against the REAL index.html
// element, not by a text pattern, so `body.has-player #browse`, `.view.nav-in-right`, and any
// future selector form are all decided correctly rather than by a regex someone has to keep
// current.
//
// TWO RELAXATIONS, both deliberately FAIL-CLOSED (they can only ADD rules to the scanned set,
// never remove one):
//   (1) ANCESTOR CONDITIONS ARE DROPPED. Only the SUBJECT compound — the part after the last
//       combinator — is matched. `body.has-player #browse` therefore contributes even though the
//       at-rest body carries no `has-player` class. Without this the state-variant rule the
//       finding names would be invisible.
//   (2) THE ELEMENT IS CLASS-AUGMENTED with every class #browse can carry at runtime, so a rule
//       keyed on a transient class (`.view.nav-in-right`) contributes too. The augmentation set
//       is pinned below and cross-checked against the shipped sources, because an unpinned class
//       is a hole in the scope and a pinned-but-vanished one is a scope that has rotted.
const dom = appDom();
const doc = dom.window.document;

/** Classes #browse can carry at runtime. Pinned, and cross-checked against shipped source below. */
const BROWSE_RUNTIME_CLASSES = ['view', 'hidden', 'nav-in-left', 'nav-in-right'];

/**
 * Does this compound select a pseudo-ELEMENT? Such a rule styles a GENERATED box and can never
 * change the originating element's own border box, so it does not contribute here.
 *
 * ⭐ MEASURED, not assumed, and it cost two wrong shapes on the first two runs of this cell.
 * (1) Leaving these in: jsdom THROWS on the vendor pseudo-elements, the fail-closed catch below
 * then counts them as contributors, and `.np-seek::-moz-range-thumb { width: 13px }` reads as a
 * rule that widens the browse host. (2) STRIPPING the pseudo-element and matching the remainder:
 * `#browse::-webkit-scrollbar { width: 0 }` then matches #browse and its scrollbar's width reads
 * as #browse's own. The correct rule is to EXCLUDE the part outright.
 * The four legacy single-colon forms are recognised by name; nothing else is.
 */
const hasPseudoElement = (c) => /::/.test(c) || /:(before|after|first-line|first-letter)\b/i.test(c);

/** The subject compound of one selector part: everything after the last top-level combinator. */
function subjectCompound(part) {
  let depth = 0;
  let last = 0;
  for (let i = 0; i < part.length; i++) {
    const ch = part[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (depth === 0 && (ch === ' ' || ch === '>' || ch === '+' || ch === '~')) last = i + 1;
  }
  return part.slice(last).trim();
}

/**
 * Every rule that can contribute a declaration to `el`, in source order. A selector the engine
 * cannot parse is treated as CONTRIBUTING (fail-closed): an unreadable selector must never be
 * the reason a widening property goes unseen.
 */
function contributingRules(el) {
  const out = [];
  for (const r of RULES) {
    for (const part of r.selector.split(',')) {
      const subj = subjectCompound(part.trim());
      if (!subj || hasPseudoElement(subj)) continue;   // a pseudo-element's box is not this one's
      let hit;
      try { hit = el.matches(subj); } catch { hit = true; }
      if (hit) { out.push(r); break; }
    }
  }
  return out;
}

/** #browse as shipped, augmented with every class it can carry at runtime. */
function browseElement() {
  const el = doc.getElementById('browse');
  if (el) for (const c of BROWSE_RUNTIME_CLASSES) el.classList.add(c);
  return el;
}
/** A parked browse page, mounted where a real one lives so descendant selectors resolve. */
function parkedPageElement() {
  const host = doc.getElementById('browse');
  const el = doc.createElement('div');
  el.className = 'browsepage parked';
  if (host) host.appendChild(el);
  return el;
}

const BROWSE_EL = browseElement();
const PARKED_EL = parkedPageElement();
const BROWSE_RULES = BROWSE_EL ? contributingRules(BROWSE_EL) : [];
const PARKED_RULES = PARKED_EL ? contributingRules(PARKED_EL) : [];

/** Every [prop, value, selector] a contributing rule declares for one element. */
const declaredOn = (rules) => rules.flatMap((r) => longhands(r.body).map(([p, v]) => ({ prop: p, value: v, selector: r.selector })));

// ── TERM 2 OF THE FLOOR: `edgeVw`, the parked page's right edge in viewport space ────────────
// The quantity is L + W, NOT "page width". #browse is `left: 0; right: 0; max-width: M;
// margin: 0 auto`, so W = min(M, V) and L = (V - W)/2, giving edgeVw = (100 + min(M, 100))/2,
// maximised over V.
//
// ⭐ ONE COMPUTATION, STATED ONCE. Because `left: 0; right: 0` fixes the available width at
// 100vw, `max-width` can only CAP the box, never expand it — so edgeVw is 100 for EVERY value of
// M, including an absurd one. A `max-width` above 100vw therefore moves nothing arithmetically;
// it is barred separately, as a RED FLAG that someone has misread the box. The bar is not a term.
//
// A `px` cap is worst-cased at V <= M, where min(M, V) = V and the cap contributes its full 100.
function capVwOf(maxWidthValue) {
  const v = String(maxWidthValue).trim();
  if (/^\d+(\.\d+)?px$/i.test(v)) return 100;              // worst case: a viewport no wider than the cap
  const vw = v.match(/^(\d+(?:\.\d+)?)vw$/i);
  if (vw) return Math.min(Number(vw[1]), 100);
  return null;                                             // unreadable — the box cannot be bounded
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// FIXTURE SANITY — every "absent" assertion below rides on this.
// ════════════════════════════════════════════════════════════════════════════════════════════
// An "no rule declares X" assertion is satisfied perfectly by a parser that found nothing, and a
// floor computed from a rule that was never located would default to a number nobody derived.
// Both are the gate-greens-a-dirty-tree shape this project has already paid for, so the parse
// must fail LOUDLY rather than pass by absence.
test('PARKOUTOFREACH fixture sanity — the parse found the sheet, the #browse box, the park '
  + 'transform, and every class the scope augmentation claims', () => {
  assert.ok(RULES.length > 200, `parsed only ${RULES.length} rules from css/app.css — the parser is broken`);
  assert.ok(BROWSE_EL, 'index.html must contain #browse — the scope is matched against the REAL element');
  assert.ok(PARKED_EL, 'the synthetic parked page must have been created');

  // The scope augmentation must actually widen the scanned set, or relaxation (2) is decoration.
  const selectors = BROWSE_RULES.map((r) => r.selector);
  assert.ok(selectors.some((s) => /^#browse\b/.test(s.split(',')[0].trim()) || s.split(',').some((p) => p.trim() === '#browse')),
    `the base #browse rule must be in the contributing set — got:\n  ${selectors.join('\n  ')}`);
  assert.ok(selectors.some((s) => s.includes('body.has-player #browse')),
    'the body-class variant `body.has-player #browse` must be in the contributing set — relaxation '
    + '(1) is what makes a state-variant rule visible, and it is one of the two evasions the '
    + `adversary named against this cell. Got:\n  ${selectors.join('\n  ')}`);
  assert.ok(selectors.some((s) => s.includes('nav-in-right')),
    'a `.view.nav-in-*` rule must be in the contributing set — #browse IS a `.view`, so relaxation '
    + `(2) is what keeps a transient-class rule in scope. Got:\n  ${selectors.join('\n  ')}`);

  // A pinned runtime class that no longer appears in the shipped sources means the scope has
  // rotted: it is widening the scan by a class the element can no longer carry, and — worse —
  // some OTHER class it now carries is unpinned and invisible.
  const shipped = readRoot('index.html') + readRoot('js/nav.js') + readRoot('js/app.js');
  const vanished = BROWSE_RUNTIME_CLASSES.filter((c) => !shipped.includes(c));
  assert.deepEqual(vanished, [], 'these pinned #browse runtime classes no longer occur in '
    + `index.html / js/nav.js / js/app.js — re-derive the set:\n  ${vanished.join('\n  ')}`);

  // The park IS the transform: reading its magnitude is meaningless if no rule declares one.
  const transforms = declaredOn(PARKED_RULES).filter((d) => d.prop === 'transform');
  assert.ok(transforms.length > 0, 'no rule matching a parked .browsepage declares a transform — '
    + 'the park IS the transform, so this cell would be reading a magnitude that does not exist');

  // And the box must yield a max-width, or term 2 is a default rather than a derivation.
  const caps = declaredOn(BROWSE_RULES).filter((d) => d.prop === 'max-width');
  assert.ok(caps.length > 0, 'no rule contributing to #browse declares a max-width — term 2 of the '
    + 'floor would silently default to 100 instead of being derived from the box');
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// THE PRECONDITIONS OF THE ARITHMETIC — the box #browse's used width cannot escape.
// ════════════════════════════════════════════════════════════════════════════════════════════
test('PARKOUTOFREACH — #browse is an auto-centred left:0/right:0 box, which is what makes '
  + 'L = (V - W)/2 the correct second term', () => {
  const decls = declaredOn(BROWSE_RULES);
  const last = (p) => decls.filter((d) => d.prop === p).at(-1);
  const bad = [];
  for (const [p, want] of [['left', '0'], ['right', '0'], ['margin-left', 'auto'], ['margin-right', 'auto']]) {
    const d = last(p);
    if (!d) bad.push(`#browse declares no ${p} — the centring the L term is derived from is gone`);
    else if (d.value !== want) bad.push(`#browse { ${p}: ${d.value} } — want ${want} (from ${d.selector})`);
  }
  assert.deepEqual(bad, [], 'the floor\'s second term is L + W with L = (V - W)/2, which holds only '
    + 'while the box is stretched between left:0 and right:0 and centred by auto margins '
    + `(css:250-255). Change the box and the derivation must change with it:\n  ${bad.join('\n  ')}`);
});

test('PARKOUTOFREACH — no rule contributing to #browse declares a `width`', () => {
  const found = declaredOn(BROWSE_RULES).filter((d) => d.prop === 'width')
    .map((d) => `${d.selector} { width: ${d.value} }`);
  assert.deepEqual(found, [], 'a `width` on #browse re-solves the used width and can push the '
    + 'border box past its containing block, so L + W is no longer bounded by 100vw and the floor '
    + `this cell computes stops being a bound at all:\n  ${found.join('\n  ')}`);
});

test('PARKOUTOFREACH — no rule contributing to #browse declares a `min-width`', () => {
  const found = declaredOn(BROWSE_RULES).filter((d) => d.prop === 'min-width')
    .map((d) => `${d.selector} { min-width: ${d.value} }`);
  assert.deepEqual(found, [], 'per CSS 2.1 §10.4 a `min-width` BEATS the `max-width` result when '
    + 'the max-width result is smaller, so the box really grows past its containing block and the '
    + 'floor really moves — the one widening property whose effect the max-width cap cannot '
    + `absorb:\n  ${found.join('\n  ')}`);
});

test('PARKOUTOFREACH — no rule contributing to #browse declares a `padding` or a `border`', () => {
  const found = declaredOn(BROWSE_RULES)
    .filter((d) => /^(padding(-top|-right|-bottom|-left)?|border(-width|-top-width|-right-width|-bottom-width|-left-width|-left|-right|-top|-bottom)?)$/.test(d.prop))
    .filter((d) => !/^(0|none|0px)$/i.test(String(d.value).trim()))
    .map((d) => `${d.selector} { ${d.prop}: ${d.value} }`);
  assert.deepEqual(found, [], 'the parked page is `position: absolute; inset: 0`, so its border box '
    + 'is exactly #browse\'s PADDING box; `* { box-sizing: border-box }` and no border are what '
    + `make padding box = border box and keep L + W the quantity this cell computes:\n  ${found.join('\n  ')}`);
});

// ⭐ A STRUCTURAL GUARD, NOT A TERM OF THE ARITHMETIC. Because left:0/right:0 fix the available
// width at 100vw, a max-width above 100vw is INERT — it caps nothing. It is barred anyway,
// because such a value signals that someone has misread the box, not that the box grew.
test('PARKOUTOFREACH — #browse\'s max-width is expressed in px, or in vw at no more than 100', () => {
  const caps = declaredOn(BROWSE_RULES).filter((d) => d.prop === 'max-width');
  const bad = caps.filter((d) => capVwOf(d.value) === null || /vw$/i.test(String(d.value).trim()) && Number(String(d.value).replace(/vw$/i, '')) > 100)
    .map((d) => `${d.selector} { max-width: ${d.value} }`);
  assert.deepEqual(bad, [], 'a max-width above 100vw caps nothing here (left:0 and right:0 already '
    + 'fix the available width at 100vw), and an unreadable one leaves the box unbounded. Either '
    + `way this cell must refuse to certify the box rather than compute over it:\n  ${bad.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// THE ARITHMETIC. Plan §4, §8 dimension 6.
// ════════════════════════════════════════════════════════════════════════════════════════════
// These two were the red-first cells: authored against the shipped `-101vw`, run red, and landed
// behind SKIP-PENDING-BUILD so a red-first suite could live in a green tree. The build removed
// both skips, drove each red, and then made them green. Both are live now, and each is defended
// by a registered mutant rather than by that history — PARKM1 restores the shipped defect and
// reddens both; PARKM2 (-250vw) clears the floor and reddens the shipped-form cell alone.
/** The park offset in vw, magnitude, for every rule that declares one on a parked page. */
function parkOffsetsVw() {
  return declaredOn(PARKED_RULES).filter((d) => d.prop === 'transform').map((d) => {
    const m = String(d.value).match(/translateX\(\s*(-?\d+(?:\.\d+)?)vw\s*\)/i);
    return { selector: d.selector, value: d.value, vw: m ? Math.abs(Number(m[1])) : null };
  });
}
/** The floor, derived: term 1 (pinned by DRAGREACHBOUNDED) + term 2 (parsed from #browse). */
function derivedFloorVw() {
  const MAX_DISPLACEMENT_VW = 100;   // js/app.js:505/:558/:602/:649/:690 — see DRAGREACHBOUNDED
  const caps = declaredOn(BROWSE_RULES).filter((d) => d.prop === 'max-width').map((d) => capVwOf(d.value));
  const capVw = caps.length && caps.every((c) => c !== null) ? Math.max(...caps) : null;
  if (capVw === null) return null;
  return MAX_DISPLACEMENT_VW + (100 + Math.min(capVw, 100)) / 2;
}

test('PARKOUTOFREACH — the park offset STRICTLY exceeds the floor derived from #browse\'s own box',
  () => {
  const floor = derivedFloorVw();
  assert.notEqual(floor, null, 'the floor could not be derived from #browse\'s box — see the '
    + 'max-width bar cell, which is this assertion\'s precondition');
  const offsets = parkOffsetsVw();
  const bad = offsets.filter((o) => o.vw === null || !(o.vw > floor))
    .map((o) => `${o.selector} { transform: ${o.value} } — ${o.vw === null ? 'not a translateX in vw' : o.vw + 'vw'} does not strictly exceed ${floor}vw`);
  assert.deepEqual(bad, [], 'the park offset (css:145) must STRICTLY exceed the '
    + `${floor}vw floor derived from #browse's own box. #browse is the INCOMING mover on a `
    + 'home->browse drag, at translateX(w + t), so a park that fails to clear the floor composes '
    + 'to `homeX - 0.01w` and the parked page rides ON Home for the whole gesture — the shipped '
    + '`-101vw` defect this cell was authored to catch (measured: 7/7 touchmove samples, real '
    + 'Blink engine). STRICT, because at exactly the floor the right edge lands exactly on the '
    + 'viewport\'s left edge (the 640px boundary case). This assertion\'s preconditions are the '
    + 'four box cells above; it computes over them rather than re-asserting them, so each mutant '
    + `reddens exactly one test:\n  ${bad.join('\n  ')}`);
});

// ⭐ WHY A SECOND ASSERTION AND NOT JUST THE INEQUALITY. `-201vw` clears the floor with 4px to
// spare, and 4px of margin is precisely the margin that produced this defect. The project's
// standing discipline is to ship the TESTED FORM of a tested fix, never a variant of it: -300vw
// is the value the measurement's after-run executed (detector silent at every sample, destination
// still settling at 0). The inequality alone would certify an untested variant.
const SHIPPED_PARK_VW = 300;

test('PARKOUTOFREACH — the park offset is the bench-measured shipped form, not merely a value '
  + 'that clears the floor', () => {
  const offsets = parkOffsetsVw();
  const bad = offsets.filter((o) => o.vw !== SHIPPED_PARK_VW)
    .map((o) => `${o.selector} { transform: ${o.value} } — want translateX(-${SHIPPED_PARK_VW}vw)`);
  assert.deepEqual(bad, [], `the shipped park (css:145) must be exactly -${SHIPPED_PARK_VW}vw — the `
    + 'floor plus a full viewport of margin AND the exact form the measurement\'s after-run '
    + 'executed (Claude/Zelda/MEASUREMENT-parked-page-rides-home-2026-08-02.md). A value that '
    + 'clears the floor but was never driven through an engine is a variant of a tested fix, which '
    + `this project does not ship:\n  ${bad.join('\n  ')}`);
});
