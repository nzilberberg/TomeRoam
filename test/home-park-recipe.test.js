// M1PARKRANGE — INVARIANT P as a static read of the shipped stylesheet's `#home.parked`
// rule (PLAN-home-shift-fix.md §4.2, §7.1, §7.4). Authored red-first by Curie.
//
// THE INVARIANT. Parking `#home` may change only WHERE THE BOX PAINTS and WHETHER IT TAKES
// INPUT. It must not change (i) the scroll range, the scroll-container status, the content
// width or the block-direction padding; nor (ii) whether the engine's scroll-anchoring
// machinery operates on the box.
//
// THE DEFECT. `#home.parked` declares a vestigial pre-6i `top: 0`. The active `#home` is a
// `position:fixed` box with BOTH insets, and `.parked` declares no `bottom`, so `bottom`
// cascades from `#home` and the parked box is stretched between `top:0` and that `bottom` —
// TALLER than the active box by exactly `var(--safe-top) + 51px`, which shrinks its max
// scroll by the same and makes the browser clamp `scrollTop` at the park. Executed exact in
// a real Blink engine (Claude/Loki/STRIKE-home-shift-m1-derivation.md: 71px to the pixel).
// THE FIX IS ONE DELETION: `top: 0` goes; `overflow: hidden` STAYS.
//
// WHY THIS IS AN ALLOW-LIST AND NOT A DENYLIST. A denylist can only forbid what someone
// foresaw, and `inset: 0`, `inset-block-start`, `block-size`, `margin-top` and `translate`
// each re-introduce the defect under a name nobody listed. So the cell asserts what is
// PERMITTED: a property able to change the scroll range fails by being OUTSIDE the permitted
// set rather than by having been predicted. It fails CLOSED, deliberately — an over-strict
// allow-list costs one plan amendment; an under-strict denylist costs a silent regression.
//
// ⭐ MIXED POLARITY — Tier 0 is an OBLIGATION, every other entry is a PERMISSION.
// `overflow-x: hidden` and `overflow-y: hidden` must be PRESENT and LITERALLY `hidden`, on
// TWO INDEPENDENT GROUNDS:
//   (1) CROSS-ENGINE, spec-mandated: the value is what keeps the parked box a SCROLL
//       CONTAINER (CSS Overflow 3). A box that is not a scroll container has no scroll
//       offset to preserve at all — so this breaks axis (i) on EVERY engine, WebKit
//       included. Never defend Tier 0 with ground (2) alone.
//   (2) BLINK-MEASURED: the park necessarily carries a non-none `transform`; a non-none
//       transform SUPPRESSES every Blink scroll-anchoring adjustment, and `overflow: hidden`
//       UN-SUPPRESSES it. Deleting it measured a −80px reveal jump where shipped measures 0.
// ⛔ `overflow: clip` is INADMISSIBLE BY NAME: executed to break the fix twice over (the box
// stops being a scroll container so the in-park offset collapses to 0, AND the reveal jumps
// −80px), and it is the LIKELIEST WRONG EDIT IN THIS FILE because `css/app.css:161-165`
// carries an approving house argument for `clip` over `hidden` on precisely the ground that
// is fatal here ("clip doesn't make .app a scroll container" — correct for `.app`, inverted
// for `#home.parked`). The two reds are therefore textually DISTINCT: ABSENT vs
// PRESENT-WITH-A-WRONG-VALUE. A single "`overflow` is REQUIRED" message is actively
// misleading on a `clip` edit, and the cheap repair to that confusion — widening Tier 0 to
// "a clipping value is present" — admits the killed form.
//
// ⚠️ COMMENTS ARE STRIPPED BEFORE PARSING, AND THAT IS LOAD-BEARING. The build step that
// makes this cell green also adds a source comment to the park rule which must SAY the words
// `overflow: clip` and `top: 0` in order to warn the next editor off them (plan §10 step
// 3(b)/(c)). A parser that read comment text as declarations would fail on the very comment
// the plan mandates. The COMMENTPROOF acceptance test below locks that.
//
// RED AT HEAD (confirmed — see Claude/Curie/RED-home-shift-fix.md for the quoted run):
// the shipped `#home.parked` declares `top: 0`, which is on NO tier. Committed
// `{ skip: SKIP }` (SKIP-PENDING-BUILD) because the pre-commit battery runs the whole suite
// and this project does not use `--no-verify`; BRUNEL REMOVES THE SKIP to drive it red, then
// deletes `top: 0` to green it. No assertion is weakened to green a cell.
//
// MUTANTS (all three anchor in css/app.css and all three carry disambiguating context —
// non-uniqueness is the DEFAULT hazard here, §7.3): M1PARKRANGE-a re-adds `top: 0`;
// M1PARKRANGE-b deletes `overflow: hidden`; M1PARKRANGE-c replaces it with `overflow: clip`.
// -b and -c are separate entries because the two reds they must produce are textually
// different, and a combined entry could be killed by the wrong one.
//
// ⛔ HONEST LIMITS — TWO, on two different axes.
// (a) This proves what the stylesheet DECLARES, never what the browser COMPUTES: jsdom does
//     no layout and does not resolve `calc()` against `env()`. INVARIANT P's first axis is
//     DEVICE-owed (§9 R-M1-cause). No cell here asserts that the scroll SURVIVES the park —
//     jsdom never clamps, so such a cell would be VACUOUSLY GREEN (§7.2, prohibition 1).
// (b) It does not prove the required `overflow` declaration actually BUYS anchoring
//     participation — no CI environment implements scroll anchoring at all (§7.2,
//     prohibition 2). Tier 0 is a proxy for a MEASURED engine behaviour. If a future engine
//     stops un-suppressing on `overflow: hidden`, this cell stays green and the axis breaks
//     silently: that is registered as R-M1-anchor-quirk and routed to the device row
//     §9 R-M1-anchor, which is why that row is not optional.
const { test } = require('node:test');
const assert = require('node:assert');
const { readRoot } = require('./dom-fixture.js');

const SKIP = 'SKIP-PENDING-BUILD — RED until Brunel deletes `top: 0` from #home.parked '
  + '(PLAN-home-shift-fix.md §10 step 3). Remove this skip to drive it red.';

const PARK_SELECTOR = '#home.parked';
const HOME_SELECTOR = '#home';

// ── Tier 0 — the REQUIRED park declaration. Present, and LITERALLY `hidden`.
const TIER0 = { 'overflow-x': 'hidden', 'overflow-y': 'hidden' };
// ── Tier 1 — the four sanctioned park effects, permitted with ANY value because no value of
// any of them can alter LAYOUT geometry. `transform` is layout-inert but NOT anchoring-inert,
// which is exactly why Tier 0 is required alongside it.
const TIER1 = ['transform', 'pointer-events', 'z-index', 'will-change'];
// ── Tier 2 — the optional `#home`-restating longhands, permitted ONLY byte-identical to the
// value `#home` sets for the same longhand. These DO carry geometry; byte-identity is what
// makes them inert, so it is a condition of admission rather than a nicety.
const TIER2 = ['position', 'left', 'right', 'max-width',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-left', 'padding-right'];
// `top` and `bottom` are on NO tier and must be ABSENT: absence is what makes the parked
// box's block-direction geometry DERIVED from `#home` by the cascade rather than restated
// beside it, and `top` is the declaration a future editor is likeliest to edit rather than
// delete.
const MUST_BE_ABSENT = ['top', 'bottom'];

// ── CSS reading. Comments are stripped first (see the header — the mandated park comment
// contains the very declaration text this cell forbids).
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** [start, end) of the DECLARATION BODY of the rule whose base selector is exactly `sel`. */
function ruleBodySpan(css, sel) {
  let at = 0;
  for (;;) {
    const open = css.indexOf('{', at);
    if (open < 0) return null;
    const close = css.indexOf('}', open);
    if (close < 0) return null;
    const head = css.slice(0, open);
    const selector = head.slice(head.lastIndexOf('}') + 1).trim().split(/[\r\n]/).pop().trim();
    if (selector === sel) return { start: open + 1, end: close };
    at = close + 1;
  }
}

const ruleBody = (css, sel) => {
  const span = ruleBodySpan(css, sel);
  return span ? css.slice(span.start, span.end) : null;
};

/** Split a shorthand value on top-level whitespace — paren-aware, so calc() survives. */
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

const box = (parts) => {
  const [a, b = a, c = a, d = b] = parts;
  return [a, b, c, d];   // top, right, bottom, left
};

/**
 * Expand ONE declaration to longhands. Only the shorthands the permitted set is actually
 * written as are expanded; anything else passes through under its own name, which fails
 * CLOSED against the allow-list — that is the point, not an omission.
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
  if (prop === 'overflow') {
    const [x, y = x] = p;
    return [['overflow-x', x], ['overflow-y', y]];
  }
  return [[prop, value]];
}

/** Declarations as written: [{ prop, value }] — the DECLARED name is kept for the message. */
function declarations(body) {
  const out = [];
  for (const raw of body.split(';')) {
    const decl = raw.trim();
    if (!decl) continue;
    const i = decl.indexOf(':');
    if (i < 0) continue;
    out.push({ prop: decl.slice(0, i).trim().toLowerCase(), value: decl.slice(i + 1).trim() });
  }
  return out;
}

/** longhand -> value, last declaration wins (the cascade within a rule). */
function longhandMap(body) {
  const map = new Map();
  for (const d of declarations(body)) for (const [lh, v] of expand(d.prop, d.value)) map.set(lh, v);
  return map;
}

/**
 * THE CELL. Returns { failures: [{ code, message }] } — empty means INVARIANT P's
 * declarative half holds. Pure over CSS TEXT so the acceptance tests can drive it against
 * synthetic stylesheets rather than by editing the real one.
 */
function auditParkRule(rawCss) {
  const css = stripCssComments(rawCss);
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });

  const parkBody = ruleBody(css, PARK_SELECTOR);
  // ── ANTI-VACUITY GUARD (i). An allow-list is satisfied perfectly by a rule that declares
  // nothing, and a deleted block would satisfy every permission tier while breaking the park.
  if (parkBody == null) {
    fail('BLOCK-MISSING',
      `GUARD (i): no \`${PARK_SELECTOR} { … }\` rule exists in the stylesheet. The park itself `
      + 'is gone — this is NOT a Tier-0 failure (that would mean the anchoring counterweight '
      + 'was removed from a rule that still exists).');
    return { failures };
  }
  const homeBody = ruleBody(css, HOME_SELECTOR);
  if (homeBody == null) {
    fail('HOME-BLOCK-MISSING',
      `no base \`${HOME_SELECTOR} { … }\` rule exists, so Tier 2's byte-identity condition `
      + 'cannot be evaluated at all — the parked box\'s geometry has nothing to be derived from.');
    return { failures };
  }

  const park = longhandMap(parkBody);
  const home = longhandMap(homeBody);

  // ── TIER 0 — the OBLIGATION. Stated first because it is the one entry whose polarity is
  // inverted, and because a reader who assumes the whole cell is an allow-list will read it
  // as a permission and delete the declaration as a vestige.
  const missing0 = Object.keys(TIER0).filter((lh) => !park.has(lh));
  const wrong0 = Object.keys(TIER0).filter((lh) => park.has(lh) && park.get(lh) !== TIER0[lh]);
  if (missing0.length) {
    fail('OVERFLOW-ABSENT',
      `TIER 0 — REQUIRED DECLARATION MISSING: ${PARK_SELECTOR} must declare ${missing0.join(' and ')}`
      + ' with the value `hidden` (the shipped `overflow: hidden` shorthand expands to exactly'
      + ' that pair, and BOTH axes are required — `overflow-y` alone is an untested variant of an'
      + ' engine-validated form). This declaration is NOT a vestige. TWO INDEPENDENT GROUNDS:'
      + ' (1) CROSS-ENGINE — its value is what keeps the parked box a SCROLL CONTAINER (CSS'
      + ' Overflow 3); a non-scroll-container box has no scroll offset to preserve at all, so'
      + ' removing it breaks the range axis on EVERY engine, iOS included. (2) BLINK-MEASURED —'
      + ' the park necessarily carries a non-none `transform`, which suppresses every scroll-'
      + 'anchoring adjustment, and `overflow: hidden` un-suppresses it; deleting it measured a'
      + ' −80px reveal jump where shipped code measures 0px'
      + ' (Claude/Loki/STRIKE-home-shift-m1-derivation.md).');
  }
  if (wrong0.length) {
    const found = wrong0.map((lh) => `${lh}: ${park.get(lh)}`).join('; ');
    fail('OVERFLOW-WRONG-VALUE',
      `TIER 0 — DECLARATION PRESENT BUT ITS VALUE IS INADMISSIBLE: found ${found}. \`hidden\``
      + ' SPECIFICALLY is required — this entry is satisfied by one value and no other, and it'
      + ' is NOT "a clipping overflow value is present". `overflow: clip` was EXECUTED to break'
      + ' the fix TWICE OVER (Claude/Loki/STRIKE-home-shift-m1-adopted.md §6): the box stops'
      + ' being a scroll container so the in-park `scrollTop` collapses to 0 cross-engine, AND'
      + ' anchoring blacks out so the reveal jumps −80px — the killed two-deletion behaviour'
      + ' returning wearing a modern-CSS edit, and harder to diagnose because Blink retains the'
      + ' offset internally across a clip cycle so `scrollTop` LOOKS preserved while the reveal'
      + ' still jumped. ⛔ WIDENING THIS CHECK IS THE WRONG REPAIR. The approving argument at'
      + ' css/app.css:161-165 ("clip doesn\'t make .app a scroll container") is CORRECT for'
      + ' `.app`, which must not become a scroll container, and INVERTED here: `#home.parked`'
      + ' MUST remain one.');
  }

  // ── ANTI-VACUITY GUARD (ii). Kept, and deliberately NOT folded into Tier 0: they fail for
  // different reasons and a reader must be able to tell which fired.
  const lostEffects = TIER1.filter((p) => !park.has(p));
  if (lostEffects.length) {
    fail('PARK-EFFECT-MISSING',
      `GUARD (ii): ${PARK_SELECTOR} no longer declares the park effect(s) `
      + `${lostEffects.join(', ')}. The rule exists but has stopped parking — this is NOT a `
      + 'Tier-0 failure (that would mean the anchoring counterweight was removed while the park '
      + 'still works).');
  }

  // ── THE PERMISSION TIERS. Every longhand the rule declares must fall in one of the three.
  const permitted = new Set([...Object.keys(TIER0), ...TIER1, ...TIER2]);
  for (const [lh, value] of park) {
    if (Object.prototype.hasOwnProperty.call(TIER0, lh)) continue;   // handled above
    if (TIER1.includes(lh)) continue;
    if (TIER2.includes(lh)) {
      if (!home.has(lh)) {
        fail('TIER2-NOT-IDENTICAL',
          `TIER 2 VIOLATION: ${PARK_SELECTOR} declares \`${lh}: ${value}\` but the base `
          + `${HOME_SELECTOR} rule declares no ${lh} at all, so it is not a restatement of the `
          + 'active box — it is a park-only geometry declaration.');
      } else if (home.get(lh) !== value) {
        fail('TIER2-NOT-IDENTICAL',
          `TIER 2 VIOLATION: ${PARK_SELECTOR} declares \`${lh}: ${value}\` but ${HOME_SELECTOR} `
          + `sets \`${lh}: ${home.get(lh)}\`. A Tier-2 longhand is admitted ONLY byte-identical `
          + 'to the active box\'s value — byte-identity is what makes a geometry-carrying '
          + 'property inert, and max-width/padding-left/padding-right are exactly the '
          + 'declarations that set content width, so a divergence silently changes scrollHeight '
          + 'and re-opens the clamp.');
      }
      continue;
    }
    // Outside the permitted set. `top`/`bottom` get the invariant stated by name, because
    // that is the pair the whole fix is about.
    const declaredAs = declarations(stripCssComments(parkBody))
      .map((d) => d.prop)
      .filter((p) => expand(p, park.get(lh) == null ? '' : park.get(lh)).some(([l]) => l === lh));
    const asWritten = declaredAs.length ? ` (declared as \`${declaredAs.join('`/`')}\`)` : '';
    if (MUST_BE_ABSENT.includes(lh)) {
      fail('OUTSIDE-PERMITTED-SET',
        `INVARIANT P VIOLATION: ${PARK_SELECTOR} declares \`${lh}: ${value}\`${asWritten}. `
        + `\`top\` and \`bottom\` are on NO tier and must be ABSENT — that absence is what makes `
        + 'the parked box\'s block-direction geometry DERIVED from the active box by the cascade '
        + 'rather than restated beside it, and a `top` on the park rule makes the parked box '
        + 'taller than the active box by `var(--safe-top) + 51px`, shrinking its max scroll by '
        + 'the same and making the browser clamp `scrollTop` at every park (executed exact at '
        + '71px in real Blink). Even a byte-identical `top` is refused: it is the declaration a '
        + 'future editor is likeliest to EDIT rather than delete.');
    } else {
      fail('OUTSIDE-PERMITTED-SET',
        `INVARIANT P VIOLATION: ${PARK_SELECTOR} declares \`${lh}: ${value}\`${asWritten}, which `
        + `is OUTSIDE THE PERMITTED SET (Tier 0: ${Object.keys(TIER0).join(', ')} required as `
        + `\`hidden\`; Tier 1 any value: ${TIER1.join(', ')}; Tier 2 byte-identical to `
        + `${HOME_SELECTOR}: ${TIER2.join(', ')}). This is an ALLOW-LIST and it fails CLOSED on `
        + 'purpose: a property able to change the scroll range, the scroll-container status, the '
        + 'content width or the block-direction padding must fail by being outside the permitted '
        + 'set rather than by having been foreseen on a denylist. If this property is genuinely '
        + 'needed, that is a PLAN AMENDMENT (PLAN-home-shift-fix.md §7.4) — do NOT widen the '
        + `tiers to admit it, and do NOT revert to a denylist. Permitted set: ${[...permitted].join(', ')}.`);
    }
  }

  return { failures };
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// THE CELL. RED AT HEAD: the shipped park rule declares `top: 0`.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('M1PARKRANGE — parking #home changes only where it paints and whether it takes input: '
  + 'the #home.parked rule declares the required overflow: hidden and nothing outside the '
  + 'permitted set (static stylesheet read)', () => {
  const { failures } = auditParkRule(readRoot('css/app.css'));
  assert.deepEqual(failures.map((f) => f.code), [],
    'INVARIANT P (declarative half) is violated by the shipped `#home.parked` rule:\n\n'
    + failures.map((f) => `[${f.code}] ${f.message}`).join('\n\n'));
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// THE CELL'S OWN ACCEPTANCE TESTS (§7.4 — SEVEN, plus two this seat adds). These run the
// audit against SYNTHETIC stylesheets derived from the real one, so they are green at HEAD
// and stay green through the build: they prove the cell can fail for each distinct edit, and
// (1) proves it will PASS once `top: 0` is deleted — the check the previous cell
// specification could not satisfy.
//
// ⭐ What catches this cell if it were built as a PURE ALLOW-LIST (the natural misreading):
// tests (5), (6) and (7) here, and STRUCTURALLY the registered mutants M1PARKRANGE-b and
// M1PARKRANGE-c SURVIVING the sweep — which is only attributable now that the sweep names
// the killing cell.
// ─────────────────────────────────────────────────────────────────────────────────────────
const RAW = () => stripCssComments(readRoot('css/app.css'));

/** Replace the `#home.parked` declaration body via `fn`, on comment-stripped text. */
function withParkBody(css, fn) {
  const span = ruleBodySpan(css, PARK_SELECTOR);
  assert.ok(span, 'fixture: the #home.parked rule must be locatable to build a variant');
  const before = css.slice(span.start, span.end);
  const after = fn(before);
  assert.notStrictEqual(after, before, 'fixture: the variant transform must actually change the rule');
  return css.slice(0, span.start) + after + css.slice(span.end);
}

// ⚠️ BRUNEL FIXTURE FIX (build step, flagged for Curie review — not a change to any assertion
// or expected value). `postFix()` used to route through `withParkBody`'s strict "the transform
// must actually change the rule" guard. That guard is correct for every OTHER call site in this
// file (each applies a transform ON TOP of an already-derived postFix() body, and that transform
// must genuinely do something). It is wrong for THIS derivation specifically: once the real fix
// lands (`top: 0` genuinely deleted from the shipped rule, PLAN-home-shift-fix.md §10 step 3),
// `RAW()` no longer contains `top: 0` for the regex to strip, so stripping it is correctly a
// no-op — not a fixture bug. The guard could not distinguish "a legitimately absent target" from
// "a broken transform", so it fails post-fix regardless of source content. Bypassing the shared
// guard for this one derivation (not touching it for any other call site) lets the SAME nine
// acceptance properties this file already asserts run against the real post-fix stylesheet with
// no change to what any of them checks.
const postFix = () => {
  const css = RAW();
  const span = ruleBodySpan(css, PARK_SELECTOR);
  assert.ok(span, 'fixture: the #home.parked rule must be locatable to build a variant');
  const before = css.slice(span.start, span.end);
  const after = before.replace(/\btop:\s*0\s*;\s*/, '');
  return css.slice(0, span.start) + after + css.slice(span.end);
};
const codesOf = (css) => auditParkRule(css).failures.map((f) => f.code);
const messageFor = (css, code) => (auditParkRule(css).failures.find((f) => f.code === code) || {}).message || '';

test('M1PARKRANGE acceptance (1) — the audit PASSES on the POST-FIX stylesheet (top: 0 deleted, '
  + 'overflow: hidden kept)', () => {
  const css = postFix();
  assert.match(ruleBody(css, PARK_SELECTOR), /overflow:\s*hidden/,
    'fixture: the post-fix variant must still declare overflow: hidden — only top: 0 is deleted');
  assert.deepEqual(auditParkRule(css).failures, [],
    'the audit must PASS on the prescribed one-deletion fix. A cell that cannot pass on its own '
    + 'fix gets repaired by whoever hits it, and the cheapest repair deletes the half that '
    + 'stops a geometry property returning under a different name.');
});

test('M1PARKRANGE acceptance (2) — re-adding `top: 0` FAILS, naming top (mutant M1PARKRANGE-a)', () => {
  const css = withParkBody(postFix(), (b) => b + '\n  top: 0;');
  assert.deepEqual(codesOf(css), ['OUTSIDE-PERMITTED-SET']);
  assert.match(messageFor(css, 'OUTSIDE-PERMITTED-SET'), /`top: 0`/);
  assert.match(messageFor(css, 'OUTSIDE-PERMITTED-SET'), /must be ABSENT/);
});

test('M1PARKRANGE acceptance (3) — adding `inset: 0` FAILS, naming inset (the case a denylist '
  + 'passes)', () => {
  const css = withParkBody(postFix(), (b) => b + '\n  inset: 0;');
  const codes = codesOf(css);
  assert.ok(codes.includes('OUTSIDE-PERMITTED-SET'),
    `\`inset: 0\` re-adds top AND overrides the inherited bottom, and the denylist form of this `
    + `cell stayed green on it — got ${JSON.stringify(codes)}`);
  const msgs = auditParkRule(css).failures.map((f) => f.message).join('\n');
  assert.match(msgs, /declared as `inset`/,
    'the message must name the property AS WRITTEN (`inset`), or the reader cannot find the edit');
});

test('M1PARKRANGE acceptance (4) — deleting the whole #home.parked block FAILS on guard (i)', () => {
  const css = RAW().replace(/#home\.parked\s*\{[^}]*\}/, '');
  assert.deepEqual(codesOf(css), ['BLOCK-MISSING']);
});

test('M1PARKRANGE acceptance (5) — REMOVING overflow: hidden FAILS as ABSENT and says REQUIRED, '
  + 'naming both grounds (mutant M1PARKRANGE-b)', () => {
  const css = withParkBody(postFix(), (b) => b.replace(/\boverflow:\s*hidden\s*;\s*/, ''));
  const codes = codesOf(css);
  assert.deepEqual(codes, ['OVERFLOW-ABSENT'],
    'THE POLARITY TEST: "declares nothing outside the permitted set" is satisfied by a rule that '
    + `declares LESS, so a pure allow-list passes this edit — got ${JSON.stringify(codes)}`);
  const m = messageFor(css, 'OVERFLOW-ABSENT');
  assert.match(m, /REQUIRED/);
  assert.match(m, /SCROLL CONTAINER/, 'ground (1) — cross-engine — must be named');
  assert.match(m, /anchoring/, 'ground (2) — Blink-measured — must be named');
  assert.match(m, /iOS included/,
    'ground (2) alone reads as "this buys nothing on iOS", which is the false inference ground (1) '
    + 'exists to answer — the message must close it');
});

test('M1PARKRANGE acceptance (6) — NARROWING to `overflow-y: hidden` alone FAILS (a variant of an '
  + 'engine-validated form is not validated)', () => {
  const css = withParkBody(postFix(), (b) => b.replace(/\boverflow:\s*hidden\b/, 'overflow-y: hidden'));
  const codes = codesOf(css);
  assert.deepEqual(codes, ['OVERFLOW-ABSENT']);
  assert.match(messageFor(css, 'OVERFLOW-ABSENT'), /overflow-x/,
    'the message must name the axis that went missing');
});

test('M1PARKRANGE acceptance (7) — replacing hidden with `clip` FAILS with the WRONG-VALUE '
  + 'message, textually DISTINCT from the ABSENT message (mutant M1PARKRANGE-c)', () => {
  const clip = withParkBody(postFix(), (b) => b.replace(/\boverflow:\s*hidden\b/, 'overflow: clip'));
  const absent = withParkBody(postFix(), (b) => b.replace(/\boverflow:\s*hidden\s*;\s*/, ''));
  assert.deepEqual(codesOf(clip), ['OVERFLOW-WRONG-VALUE'],
    'test (5) and (6) do NOT close this door: a `clip` edit satisfies "a declaration is present" '
    + 'and "both axes are set"');
  const m = messageFor(clip, 'OVERFLOW-WRONG-VALUE');
  assert.match(m, /overflow-x: clip/, 'the message must name the FOUND value');
  assert.match(m, /`hidden`\s*\n?\s*SPECIFICALLY is required|`hidden`[\s\S]{0,20}SPECIFICALLY/,
    'the message must say `hidden` specifically is required');
  assert.match(m, /EXECUTED to break/, 'the message must state that clip was EXECUTED to regress');
  assert.match(m, /WIDENING THIS CHECK IS THE WRONG REPAIR/,
    'a misleading red invites widening Tier 0, which is the path to shipping the killed form — the '
    + 'message must say so from the message alone');
  assert.notStrictEqual(m, messageFor(absent, 'OVERFLOW-ABSENT'),
    'ABSENT and PRESENT-WITH-A-WRONG-VALUE must be textually distinct reds');
});

test('M1PARKRANGE acceptance (8) — guard (ii) fires on a rule that stopped parking, with a '
  + 'message distinguishable from Tier 0 and from guard (i)', () => {
  const css = withParkBody(postFix(), (b) => b.replace(/transform:\s*translateX\([^)]*\)\s*;\s*/, ''));
  assert.deepEqual(codesOf(css), ['PARK-EFFECT-MISSING']);
  const m = messageFor(css, 'PARK-EFFECT-MISSING');
  assert.match(m, /GUARD \(ii\)/);
  assert.match(m, /NOT a\s*\n?\s*Tier-0 failure|NOT a Tier-0 failure/,
    'a Tier-0 failure means the anchoring counterweight was removed; a guard failure means the '
    + 'park itself is gone — the two must not read alike');
});

test('COMMENTPROOF — the audit is unaffected by a park-rule COMMENT that names the forbidden '
  + 'declarations, which the build step is required to add', () => {
  // §10 step 3(b)/(c): the source comment must state INVARIANT P, that `overflow: hidden` is
  // REQUIRED, and that `overflow: clip` is NOT a substitute — so the comment necessarily
  // contains the exact declaration text this cell forbids. A parser reading comments as
  // declarations would fail on the very comment the plan mandates.
  const css = withParkBody(postFix(), (b) =>
    '\n  /* INVARIANT P: never re-add top: 0 here; overflow: hidden is REQUIRED and\n'
    + '     overflow: clip is NOT a substitute (it stops the box being a scroll container). */'
    + b);
  assert.deepEqual(auditParkRule(css).failures, [],
    'the mandated park comment must not be able to redden this cell');
});

test('M1PARKRANGE acceptance (9) — a Tier-2 longhand that DIVERGES from #home fails, closing the '
  + 'content-width premise the derivation rests on', () => {
  const css = withParkBody(postFix(), (b) => b.replace(/max-width:\s*640px/, 'max-width: 680px'));
  assert.deepEqual(codesOf(css), ['TIER2-NOT-IDENTICAL']);
  assert.match(messageFor(css, 'TIER2-NOT-IDENTICAL'), /scrollHeight/,
    'the identity condition is what converts "content width is identical, so scrollHeight is '
    + 'identical" from a verified observation into a gated invariant');
});

module.exports = { auditParkRule, ruleBody, longhandMap, expand };
