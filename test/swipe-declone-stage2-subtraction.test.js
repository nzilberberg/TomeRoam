// SUBTRACTION PASS (declone stage 2, step 11) — the integration cells from
// PLAN-swipe-declone-stage2-subtraction.md §10, authored red-first by the test author
// (2026-08-05) BEFORE the subtraction lands. Companion note:
// Claude/Curie/RED-swipe-declone-stage2-subtraction.md.
//
// WHAT THIS PASS DOES, and why its Coverage Model is inverted. The pass DELETES: twelve source
// items whose reachability has been argued, plus §5's orphan-recovery collapse. A deletion
// cannot be mutation-tested — there is no code left to mutate — so for each item exactly one of
// three things is true: an existing cell already witnesses the behaviour that SURVIVES; the
// deletion is textual and a source-scan gate holds it (test/retired-concepts-purge.test.js); or
// nothing witnesses it and that is a named risk. No cell here merely asserts that code is
// absent.
//
// THE THREE CELLS IN THIS FILE, and what each is for.
//   MOVERSHAPE      the L3 adapter's mover shape — the one CONTRACT change in the pass. Red at
//                   HEAD (the adapter still maps the retired ownership key).
//   RECOVERYPARITY  the collapsed leftover-state recovery does exactly what the surviving
//                   branch did before the collapse, on every entry route that still exists —
//                   including reaching the pill sweep, which after the collapse it can only do
//                   through the screen application.
//   DESTROYEDMOVER  a gesture whose movers are destroyed mid-drag still settles and releases.
//                   Closes coverage-audit finding M1; the ruling is that no guard is added and
//                   the CELL is what was owed (plan §7, §13 decision 4).
//
// ⚠️ SCOPE, honestly. jsdom has no layout, no paint and no scroll anchoring, so every assertion
// here is a source fact, a key-set fact, a class-state fact, a call-count/ordering fact or a
// DOM-identity fact — never a rendered geometry. `window.scrollY` is pinned at 0 unless a test
// sets it, so the scroll assertions pin WHETHER a restore was issued, never WHICH coordinate.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { boot } = require('./app-harness.js');
const { ROOT } = require('./dom-fixture.js');

// REAL wall clock, captured before boot() patches setTimeout: move() resamples velocity only
// after >8ms of REAL time, and synthetic moves fired back-to-back otherwise leave vx holding
// the outward flick (the standing swipe-suite discipline).
const realSetTimeout = global.setTimeout;
const realSleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
async function settle(h, n = 12) { for (let i = 0; i < n; i++) await h.settle(); }

const swipeLog = (h) => h.log.calls
  .filter((c) => c.name === 'debug' && c.args[0] === 'SWIPE').map((c) => c.args[1]);
const starts = (h) => swipeLog(h).filter((m) => /^start /.test(m));
const hardResets = (h) => swipeLog(h).filter((m) => /leftover state on begin/.test(m));
const settles = (h) => swipeLog(h).filter((m) => /^#\d+ (abort|commit) /.test(m));
const renders = (h) => h.log.calls.filter((c) => c.name === 'browse.render').map((c) => c.args[0]);
const scrollCalls = (h) => h.log.calls.filter((c) => c.name === 'window.scrollTo');
const pillFloats = (h) => h.document.querySelectorAll('.np-pill-float').length;
const sess = (h) => h.window.PBSwipeSession();
/** Indices into the SHARED ordered call log — the only way to assert cross-fake ordering. */
const orderOf = (h, name, from = 0) => h.log.calls.findIndex((c, i) => i >= from && c.name === name);

function addRow(h) {
  const row = h.document.createElement('div');
  row.className = 'book';
  h.$('browse').appendChild(row);
  return row;
}
/** Authors over Books — a left-edge back-swipe is Authors->Books (browse->browse). */
async function onAuthorsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="authors"]'); await settle(h);
}
/** Options over Books — a left-edge back-swipe is Options->Books (overlay->browse, pane-less). */
async function onOptionsOverBooks(h) {
  h.tap('.navbtn[data-nav="books"]'); await settle(h);
  h.tap('.navbtn[data-nav="options"]'); await settle(h);
}
/** Drive a gesture live (past the 8px lock, horizontal). Returns the touch target. */
async function goLive(h, target) {
  const row = target || addRow(h);
  h.touch.start(10, 300, row);
  await realSleep(12);
  h.touch.move(120, 302);   // horizontal, past the lock -> start() runs
  return row;
}
/** Drop a transient Now Playing pill clone into the document, as npPillClone does. */
function addPillFloat(h) {
  const pill = h.document.createElement('div');
  pill.className = 'np-pill-float';
  h.document.body.appendChild(pill);
  return pill;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// MOVERSHAPE — the ONE adapter EXPRESSION that constructs a production mover emits exactly the
// element reference and the base offset and no third key, so the retired ownership field cannot
// be re-added at the site where session movers are built.
// Plan §10 MOVERSHAPE / §13 decision 22 / §6 Rule R / §4 D12.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// ⛔ WHAT THIS CELL DELIBERATELY DOES NOT CLAIM, stated in the headline's own breath because the
// two used to disagree. The key set the recorded mover CARRIES OVER ITS LIFETIME is NOT claimed
// here. A key attached to a member of `d.movers` after construction is outside what any witness
// in this cell can see — MEASURED at whole-suite scope, it ships uncaught. That stronger
// invariant is deferred at plan §14 with an owner, a trigger (the next change that writes to a
// member of `d.movers` outside `toMover`, or threads a new value to the settle path) and a
// measured two-part design; it is a scheduled gate, not a backlog line.
//
// This header formerly opened "…so a dropped or an ORPHANED KEY CANNOT SHIP SILENTLY" — a
// LIFETIME claim — thirty-seven lines above its own honest-limit paragraph saying a source
// assertion cannot see a key attached at runtime. The file contradicted itself, and the larger
// sentence was the one a later audit would have read as the promise. Narrowed to the fixture's
// scope rather than the fixture grown to the sentence's, per §13 decision 22: the occupant that
// would have closed the lifetime claim (`Object.freeze` on the adapter literal) is production
// surface added to serve a test, which decision 20 already forbids here — and it was measured
// INERT, since `js/app.js` is non-strict, so the freeze silences the offending write instead of
// throwing. A guard that makes a defect quiet is worse than a named deferral.
//
// WHY A NEW CELL RATHER THAN A MIGRATED ONE. There is no key-completeness cell to migrate: the
// `F1a-L3` cell that pinned `toMover`'s key set was deleted at step 10
// (test/swipe-stage5-residuals.test.js retains only its retirement note), on the correct ground
// that its fixture required a built pane.
//
// ITS LAYER IS TWO, and naming only one was true, checkable and incomplete — the failure mode
// that survives indefinitely (§13 decision 16). A SOURCE scan over the one L3 adapter
// expression, PLUS the app harness over a real gesture for the seam read set and for the base
// half. This header formerly named only the app-harness half, on the ground that the fake-env
// construction layer never executes the adapter mapping — still true of (2) and (3), and never
// true of (1), which reads the file.
//
// ⭐ THE CELL IS THREE TESTS AND THEY ARE A SET, not one test with two spares. Each sees a
// different class of defect and none of them subsumes another:
//
//   (1) the EMITTED KEY SET, over SOURCE      — catches a key sourced from ANYTHING, including a
//                                               constant, a computed name or a spread
//   (2) the READ SET of seam fields, at RUNTIME — catches a key sourced from a seam field, and
//                                               sees the real adapter execute on a real gesture
//   (3) the base offset reaching a REAL transform — the behavioural cover for the `base` half,
//                                               so a dropped base is not source-only evidence
//
// ⛔ WHY (1) IS OWED AND WHY THE RUNTIME READ SET COULD NOT STAND ALONE — an EXECUTED
// counterexample, not an argument. This cell shipped with (2) and (3) only, on the disclosed
// reasoning that the read set is 1:1 with the emitted key set "for every shape the plan names".
// The coverage audit applied
//     const toMover = (m) => ({ el: m.element, base: baseOf(m.slot), own: 'borrowed-real' });
// — a third key whose value is a CONSTANT rather than a read of a seam field — and the whole
// behaviour suite stayed green. That defect is INSIDE the narrowed claim: it is a third key in
// the adapter expression itself, at the construction site, and it shipped silently on the pass's
// own subject — a field with no reader is what the pass exists to delete. The 1:1 argument was
// true only over the shapes the plan enumerated, and a mutant is not obliged to stay inside an
// enumeration.
//
// (1) is the assertion §10 specifies and §13 decision 20 rules on — "asserts over SOURCE, not
// over a runtime observer", because a runtime observer for `d.movers` would add exactly the
// surface this pass exists to remove. It is the same kind the parent plan's `MOVERHASBOX` and
// `PAGEISVIEW` already use. Its mutant is `S2-39`.
//
// ⚠️ (1)'s OWN honest limit, stated rather than left for a later reader to discover: a source
// assertion cannot see a key attached elsewhere at runtime, and it reads ONE expression, so it
// says nothing about an adapter that moved. Its fixture-sanity assertion is what keeps that from
// being silent — if the binding it reads stops existing, it FAILS rather than finding nothing
// and passing. The runtime half of that limit is the invariant deferred at plan §14; the
// headline above now scopes to it rather than over it, so this paragraph and the headline agree.
//
// (2)'s scope, stated as exactly what it is: the set of SEAM FIELDS the adapter READS, captured
// by handing the real `start()` a Construction whose movers expose their real values through
// recording accessors. §10's original fixture ("assert the recorded mover key set by deep
// comparison" at runtime) is not constructible — the recorded movers live on the gesture session
// (`d.movers`) and nothing observes them: `window.PBSwipeSession()` reports `{id, dragging}` and
// nothing else, and an object literal's key creation cannot be trapped from outside (a literal
// uses [[DefineOwnProperty]], which no prototype setter sees). What (2) adds over (1) is that it
// runs the REAL adapter on a REAL gesture, so it also catches a build that reads a field and
// discards it — a defect invisible to the emitted key set.
//
// This wraps `Swipe.buildConstruction` and delegates to the real one, so the classification,
// the resolution and the destination render are all still production; only the mover objects
// handed to the adapter are re-wrapped, with their real values.
function recordAdapterReads() {
  const Swipe = global.Swipe;
  const realBuild = Swipe.buildConstruction;
  const reads = [];
  Swipe.buildConstruction = function (from, dest, env) {
    const c = realBuild.call(Swipe, from, dest, env);
    const wrap = (m, slotName) => {
      if (!m) return m;
      const seen = new Set();
      const proxy = {};
      for (const k of Object.keys(m)) {
        Object.defineProperty(proxy, k, {
          get() { seen.add(k); return m[k]; },
          enumerable: true, configurable: true,
        });
      }
      reads.push({ slot: slotName, seen });
      return proxy;
    };
    return Object.assign({}, c, {
      movers: {
        outgoing: wrap(c.movers.outgoing, 'outgoing'),
        incoming: wrap(c.movers.incoming, 'incoming'),
        decoration: wrap(c.movers.decoration, 'decoration'),
      },
    });
  };
  return { reads, restore() { Swipe.buildConstruction = realBuild; } };
}

// ── The emitted key set, over SOURCE ────────────────────────────────────────────────────
//
// Locates the adapter by its enclosing `toMover` binding, brace-matches the object literal it
// returns, and splits it at TOP-LEVEL commas only — so a nested object, an array, a call, a
// ternary or a string containing a comma or a brace cannot desynchronise the split. The key of
// each entry is the text before its first top-level `:`; an entry with no colon (a shorthand or
// a `...spread`) and a computed `[expr]` key both come back verbatim and therefore fail the
// comparison, which is correct — a spread means the key set is not statically knowable at all,
// and a cell that cannot know the key set must not report that it is exactly two.
const ADAPTER_DECL = 'const toMover = (m) => ({';
const CLOSERS = { '{': '}', '(': ')', '[': ']' };

// Scan `s` from `i`, tracking bracket depth, QUOTE state and COMMENT state; calls
// `onChar(c, depth, inQuote, inComment)` once per character and returns the index of the
// balancing closer (or -1). Exactly one call per character, which the key-extraction below
// relies on to index into the text it is scanning.
//
// ⛔ NEITHER `inQuote` NOR `inComment` IS DECORATION, and the SAME accident produced both. Each
// was absent once and each was found by adding the control that sat where the bug was, not by
// reading:
//
//   inQuote   — without it, a separator inside a STRING VALUE at the entry's own depth split the
//               key list. Every case that passed did so because its string sat inside a call,
//               one level deeper.
//   inComment — without it, an ordinary apostrophe in a LINE COMMENT ("the gesture's borrowed
//               element") opened a phantom quote that never closed, and the reader mis-read a
//               CORRECT literal. This one is the worse half: its failure mode is a FALSE ALARM
//               on correct code, and a gate that fires on correct work gets switched off. This
//               project has lost gates that way three times.
//
// ⛔⛔ AND THE DRILL'S NAME ALREADY CLAIMED THE SECOND ONE. The negative test was named "…comma,
// brace, colon or comment inside a value" and contained no comment case at all. A control named
// but not written is worse than one never mentioned, because the name is what a later reader
// checks. When adding a case to that list, add it to the NAME and the ARRAY together.
//
// ⚠️ STATED LIMIT: a `/` that begins neither `//` nor `/*` is passed through as ordinary code, so
// this reader does not distinguish division from a regex literal. The expression it reads is an
// object literal of element references and numeric offsets; if that ever stops being true, this
// is the assumption to revisit.
// `opts.stopAtBalance` (default true) returns at the closer that brings depth back to 0 — what a
// literal reader wants. MOVERLIFETIMETRIGGER below needs the other mode: a scan of a WHOLE file,
// where an early return at the first balanced `}` would silently truncate the input. `onChar` also
// receives the character's INDEX, which the same gate needs to turn a hit into a line number.
// One state machine with two callers, deliberately: the plan's own §10 argues that two ad-hoc
// scanners double the surface a silent scanner defect can hide on, and this file has already been
// bitten twice by exactly that defect (quote state, then comment state).
function scanBalanced(s, i, onChar, opts) {
  const stopAtBalance = !opts || opts.stopAtBalance !== false;
  let depth = 0, quote = null, comment = null;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (comment === 'line') {
      onChar(c, depth, false, true, j);
      if (c === '\n') comment = null;
      continue;
    }
    if (comment === 'block') {
      onChar(c, depth, false, true, j);
      if (c === '*' && s[j + 1] === '/') { onChar('/', depth, false, true, j + 1); j++; comment = null; }
      continue;
    }
    if (quote) {
      if (c === '\\') { onChar(c, depth, true, false, j); onChar(s[j + 1], depth, true, false, j + 1); j++; continue; }
      if (c === quote) quote = null;
      onChar(c, depth, true, false, j);
      continue;
    }
    // Comment openers are tested BEFORE quote openers: a `'` inside a comment must not open a
    // quote, and a `//` inside a string must not open a comment. Order is what separates them.
    if (c === '/' && s[j + 1] === '/') { comment = 'line'; onChar(c, depth, false, true, j); onChar('/', depth, false, true, j + 1); j++; continue; }
    if (c === '/' && s[j + 1] === '*') { comment = 'block'; onChar(c, depth, false, true, j); onChar('*', depth, false, true, j + 1); j++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; onChar(c, depth, true, false, j); continue; }
    if (CLOSERS[c]) { depth++; onChar(c, depth, false, false, j); continue; }
    if (c === '}' || c === ')' || c === ']') { onChar(c, depth, false, false, j); depth--; if (depth === 0 && stopAtBalance) return j; continue; }
    onChar(c, depth, false, false, j);
  }
  return -1;
}

/** { sites, keys } — `sites` is how many `toMover` bindings exist, `keys` the emitted key set. */
function adapterEmittedKeys(src) {
  const sites = src.split(ADAPTER_DECL).length - 1;
  if (sites !== 1) return { sites, keys: null };
  const open = src.indexOf(ADAPTER_DECL) + ADAPTER_DECL.length - 1;   // the literal's own `{`
  const parts = [];
  let cur = '';
  const end = scanBalanced(src, open, (c, depth, inQuote, inComment) => {
    // Comment text is dropped rather than accumulated, so an entry's text is comment-free by the
    // time its key is derived. Keeping it would put a comment's own colon ahead of the entry's
    // real separator and yield a "key" that is a sentence.
    if (inComment) return;
    if (!inQuote && depth === 1 && c === ',') { parts.push(cur); cur = ''; return; }
    cur += c;
  });
  if (end === -1) return { sites, keys: null };
  parts.push(cur.replace(/\}$/, ''));
  const keys = parts
    .map((p) => p.replace(/^\{/, '').trim())
    .filter(Boolean)
    .map((p) => {
      // The separator is the first colon at the ENTRY's own depth — not `indexOf(':')`, which a
      // computed key or a ternary inside a nested call would capture instead.
      let seen = 0, colon = -1;
      scanBalanced('{' + p + '}', 0, (c, depth, inQuote, inComment) => {
        if (!inQuote && !inComment && depth === 1 && c === ':' && colon === -1) colon = seen;
        seen++;
      });
      const raw = colon <= 0 ? p : p.slice(0, colon - 1).trim();
      return /^['"`].*['"`]$/.test(raw) ? raw.slice(1, -1) : raw;
    });
  return { sites, keys };
}

test('MOVERSHAPE — the L3 adapter EMITS exactly { el, base } and no third key, asserted over source', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
  const { sites, keys } = adapterEmittedKeys(src);

  // FIXTURE SANITY FIRST, and it is load-bearing rather than decorative: a source assertion that
  // cannot find its subject would otherwise pass by finding nothing, which is how a cell reports
  // a property it has stopped checking. If the adapter is renamed or moved, this FAILS and says
  // so, and the repair is to re-derive the anchor — never to relax it.
  assert.equal(sites, 1,
    `fixture: js/app.js must declare exactly ONE \`toMover\` adapter binding; found ${sites}. `
    + 'This cell reads that one expression, so zero sites means it is asserting over nothing and '
    + 'more than one means it is asserting over whichever came first.');
  assert.ok(Array.isArray(keys),
    'fixture: the adapter\'s object literal did not brace-match — re-derive the anchor');

  assert.deepEqual([...keys].sort(), ['base', 'el'],
    'the L3 adapter must EMIT exactly { el, base }. A third key is a field on the session mover '
    + 'with no reader — the pass\'s own subject (§4 D12 deleted `own` for exactly that reason) — '
    + 'and it ships silently: nothing downstream touches it, so no behavioural cell can see it. '
    + 'The sibling read-set test below cannot see it either when its VALUE is a constant rather '
    + 'than a seam field, which is an EXECUTED counterexample, not a hypothesis. A missing key '
    + `means the mover lost the element reference or the base offset. emitted=${JSON.stringify(keys)}`);
});

// ⛔ FIRE DRILL for the reader above, and it is an acceptance condition rather than a courtesy.
// A source assertion is a scanner, and this project's recorded scanner failure is the SILENT
// one: a parser that desynchronises on a comma or a brace inside a string returns a key set that
// is wrong in a direction nobody notices, and the cell then reports a property it is no longer
// checking. Its ability to fire must not rest on the one live mutant, because the live mutant is
// the one shape someone already thought of. Synthetic sources only — never the real file — so
// the drill has no text of its own that the scan could collide with.
const drillSrc = (literal) => `  (function () {\n      const toMover = (m) => ({${literal});\n  })();\n`;

test('MOVERSHAPE fire drill — POSITIVE: every emitted-key defect shape is reported, not just the constant one', () => {
  const cases = [
    ["a third key with a CONSTANT value (the executed counterexample)", " el: m.element, base: baseOf(m.slot), own: 'borrowed-real' }", ['base', 'el', 'own']],
    ['a third key sourced from a SEAM FIELD', ' el: m.element, base: baseOf(m.slot), own: m.ownership }', ['base', 'el', 'own']],
    ['the base key DROPPED', ' el: m.element }', ['el']],
    ['the element key DROPPED', ' base: baseOf(m.slot) }', ['base']],
    ['a COMPUTED key name, which no identifier scan would see', " el: m.element, base: baseOf(m.slot), [KIND]: 1 }", ['[KIND]', 'base', 'el']],
    ['a SPREAD, which makes the key set unknowable at all', ' el: m.element, base: baseOf(m.slot), ...m.extra }', ['...m.extra', 'base', 'el']],
    ['a QUOTED third key name', " el: m.element, base: baseOf(m.slot), 'own': 1 }", ['base', 'el', 'own']],
    // ⭐ THE FALSE-NEGATIVE HALF of the comment defect, and the reason the fix is comment STATE
    // rather than a rule that only stops the false alarm. Without comment state the apostrophes
    // in these comments put the separating comma inside a phantom quote, so a literal carrying a
    // genuine third key read as the clean two-key set and PASSED. A blind spot cuts both ways:
    // it cries wolf on correct code AND waves through the defect the cell exists to catch.
    ['a third key hidden behind BLOCK COMMENTS carrying apostrophes', " el: m.element, /* the slot's offset */ base: baseOf(m.slot), /* and it's orphaned */ own: 1 }", ['base', 'el', 'own']],
    ['a third key below a LINE COMMENT carrying an apostrophe', "\n        el: m.element,\n        base: baseOf(m.slot),   // the slot's offset\n        own: 'borrowed-real',\n      }", ['base', 'el', 'own']],
  ];
  for (const [label, literal, expected] of cases) {
    const { sites, keys } = adapterEmittedKeys(drillSrc(literal));
    assert.equal(sites, 1, `${label}: the drill fixture must present exactly one adapter site`);
    assert.deepEqual([...keys].sort(), expected, `${label}: the reader must report this key set`);
    assert.notDeepEqual([...keys].sort(), ['base', 'el'],
      `${label}: this defect shape must NOT read as the clean two-key set — a positive control `
      + 'that cannot make the assertion fail is the defect the drill exists to catch');
  }
});

test('MOVERSHAPE fire drill — NEGATIVE: a clean two-key literal is never mis-split by a comma, brace, colon, quote, line comment or block comment inside it', () => {
  const clean = [
    ['the real shape', ' el: m.element, base: baseOf(m.slot) }'],
    ['a comma inside a STRING value, nested one level in a call', " el: m.element, base: f('a, b') }"],
    // ⭐ The two below are the cases the reader's FIRST form got wrong. A separator inside a
    // string at the ENTRY's own depth has no bracket around it to hide behind, which is why the
    // nested case above passed while the property was broken.
    ['a comma inside a STRING value at the ENTRY\'s own depth', " el: m.element, base: 'a, b' }"],
    ['a colon inside a STRING value at the ENTRY\'s own depth', ' el: m.element, base: "a: b" }'],
    ['a brace and a comma inside a TEMPLATE value', ' el: m.element, base: `${a}, {x}` }'],
    ['a nested OBJECT value carrying its own keys', ' el: m.element, base: { x: 1, y: 2 } }'],
    ['a nested ARRAY value carrying commas', ' el: m.element, base: [1, 2, 3] }'],
    ['a TERNARY value carrying its own colon', ' el: m.element, base: a ? b : c }'],
    ['a COMPUTED expression inside a value, whose colon is not the separator', ' el: m.element, base: f([a ? b : c]) }'],
    ['a trailing comma', ' el: m.element, base: baseOf(m.slot), }'],
    ['written across LINES', '\n        el: m.element,\n        base: baseOf(m.slot),\n      }'],
    ['a quoted key name on the CLEAN shape', " 'el': m.element, \"base\": baseOf(m.slot) }"],
    // ⭐ The three below are the cases this test's NAME already promised and did not contain. A
    // comment is the one place a lone apostrophe or quote mark is ordinary English rather than a
    // string delimiter, so a reader with quote state but no comment state opens a phantom quote
    // that never closes and mis-reads a CORRECT literal from that point on.
    ['a LINE COMMENT containing an apostrophe', "\n        el: m.element,          // the gesture's borrowed element\n        base: baseOf(m.slot),\n      }"],
    ['a LINE COMMENT containing a comma', '\n        el: m.element,          // the element, borrowed\n        base: baseOf(m.slot),\n      }'],
    ['a BLOCK COMMENT containing a brace and a quote', ' el: m.element, /* the slot\'s offset: { x } */ base: baseOf(m.slot) }'],
  ];
  for (const [label, literal] of clean) {
    const { sites, keys } = adapterEmittedKeys(drillSrc(literal));
    assert.equal(sites, 1, `${label}: the drill fixture must present exactly one adapter site`);
    // Named per row, because a null key set here means the reader never found the closing brace —
    // a phantom quote or an unterminated comment swallowed it. Without this, the row fails as a
    // bare `keys is not iterable` and the reader has to work out WHICH case did it.
    assert.ok(Array.isArray(keys),
      `${label}: the reader lost the literal's closing brace and returned no key set at all. `
      + 'On a CLEAN literal that means its own state machine desynchronised — a quote or comment '
      + 'it opened was never closed.');
    assert.deepEqual([...keys].sort(), ['base', 'el'],
      `${label}: a clean two-key literal must read as exactly { el, base }. A false POSITIVE here `
      + 'is how a correct cell gets switched off; a scanner that cries wolf is removed, and the '
      + `property goes with it. got=${JSON.stringify(keys)}`);
  }
});

test('MOVERSHAPE fire drill — ROT: a missing or duplicated adapter binding is reported, never silently passed', () => {
  const none = adapterEmittedKeys('  const other = (m) => ({ el: m.element });\n');
  assert.equal(none.sites, 0, 'a renamed or removed adapter must report ZERO sites');
  assert.equal(none.keys, null, 'with no site there is no key set — the cell must not invent one');

  const two = adapterEmittedKeys(drillSrc(' el: m.element, base: baseOf(m.slot) }')
    + drillSrc(" el: m.element, base: baseOf(m.slot), own: 'x' }"));
  assert.equal(two.sites, 2, 'two adapter bindings must report TWO sites');
  assert.equal(two.keys, null,
    'with two sites the reader must refuse rather than assert over whichever came first — that is '
    + 'the non-unique-anchor failure the mutation registry already refuses, one layer over');
});

test('MOVERSHAPE — the L3 adapter consumes exactly the element reference and the slot (no ownership read), on a real gesture', async () => {
  const h = boot({ fakeTimers: true });
  const spy = recordAdapterReads();
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);                                  // a real browse->browse drag: start() runs the adapter
    assert.ok(starts(h).length > 0, 'fixture sanity: the gesture went live and start() ran the adapter');
    assert.ok(spy.reads.length >= 2,
      `fixture sanity: the adapter must have mapped both view movers; got ${spy.reads.length}`);

    for (const r of spy.reads) {
      assert.deepEqual([...r.seen].sort(), ['element', 'slot'],
        `the L3 adapter must map exactly { el, base } from each seam mover's element and slot. `
        + `Reading \`ownership\` means it still emits the \`own\` key — a field with NO reader after `
        + `the pass (the four \`.own\` readers go with the pane teardown, and no gate asserts over `
        + `it), so it ships as a dead field on the session. Dropping the \`slot\` read means the `
        + `base offset is gone and the incoming mover has no offset. slot=${r.slot} `
        + `read=${JSON.stringify([...r.seen].sort())}`);
    }
  } finally { spy.restore(); h.dispose(); }
});

test('MOVERSHAPE — the base offset reaches the real transform: every mover carries a NUMERIC translateX mid-drag', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    await realSleep(12);
    h.touch.move(160, 302);   // a second live move, so every mover has been written at least once

    const moved = [...h.document.querySelectorAll('.browsepage, #home, #browse, .np-pill-float')]
      .map((el) => el.style.transform).filter((t) => t);
    assert.ok(moved.length > 0, 'fixture sanity: the drag wrote at least one inline transform');
    for (const t of moved) {
      assert.match(t, /^translateX\(-?\d+(\.\d+)?px\)$/,
        'the mover base offset is a NUMBER the drag adds its delta to. An adapter that dropped '
        + `the base key writes translateX(NaNpx) and the page never leaves the viewport: got "${t}"`);
    }
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════
// MOVERLIFETIMETRIGGER [GATE] — plan §14's deferred lifetime invariant becomes OWED the moment
// anything writes to a mover MEMBER outside the adapter. This is the thing that fires then.
// Plan §14 / §13 decision 22 / coverage-audit r2 N1.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// WHY THIS EXISTS. MOVERSHAPE above claims the adapter EXPRESSION and deliberately not the
// recorded mover's lifetime; the stronger invariant is deferred at §14 with an owner, a trigger
// and a measured two-part design. ⛔ An owner, a trigger and a consumer written in prose are
// still prose. The six mutants deferred to step 6 of this very pass had a name and an intent too,
// and they sat unregistered through a build, a review and a fix round while the standing sweep
// printed `0 uncaught` — a green counter stating execution, not coverage. What makes a deferral a
// SCHEDULED GATE rather than a backlog line is something that fires at the trigger.
//
// §14 states the trigger in checkable terms, which is unusual and is what makes this cheap:
//     "the next change that writes to a member of `d.movers` outside `toMover`, or that threads
//      any new value to the settle path."
//
// THE DISCRIMINATOR, and why this one. A mover is `{el, base}`. MEASURED at HEAD: every site that
// touches a mover writes `m.el.style.…` — the ELEMENT's style, two levels deep through `.el` —
// and there are ZERO writes to a mover member anywhere. That is precisely why the audit's
// counterexample was line-neutral and shipped uncaught. So the discriminating property is:
//
//     an assignment whose left-hand side TERMINATES AT DEPTH 1 on a mover-rooted expression.
//
// `m.own = x` and `m.el = x` terminate at depth 1 and fire. `m.el.style.transform = x` does not.
// That is a structural rule, not a text pin: renaming the loop variable, reordering the loops,
// reformatting them, or adding another `m.el.style.…` line all stay green, because none of them
// changes the depth at which an assignment lands.
//
// ⛔ BINDINGS ARE SCOPED TO THEIR OWN LOOP BODY, and that is MEASURED as necessary rather than
// chosen for tidiness. `js/app.js` binds the identifier `m` to THREE different things: the SEAM
// mover inside `toMover` (`:541`, where the mapping is legitimate and is MOVERSHAPE's subject,
// not this gate's), the production movers in the five iteration sites, and two unrelated locals
// (`:2900` a `<meta>` element, `:2902` an array). A file-wide identifier rule would have fired on
// all three. Scoping each binding to the body it was introduced in is what makes the rule sound.
//
// ⛔ AND IT READS CODE, NOT COMMENTS. The comment text of `js/app.js` is blanked before the scan
// (offsets preserved, so reported line numbers stay true). A prose line describing the defect —
// exactly the kind of line a future reader will write next to this gate's subject — must not fire
// it. This file has already paid for the "a comment is not code" lesson once, in the reader above.
// The gate itself lives in `test/` and scans `js/`, so it cannot match its own text under any
// resolution rule.
//
// ⚠️ WHAT IT DOES NOT CLAIM. This is a TEXTUAL bound on `js/app.js`, the one file that builds and
// animates `d.movers`. It is not a proof that no code path anywhere can attach a key to a
// recorded mover — that proof is §14's two-part design, and this gate exists to make it land on
// time, not to substitute for it.
const APP_JS = path.join(ROOT, 'js', 'app.js');
const MUTATE_MJS = path.join(ROOT, 'tools', 'mutate.mjs');

/**
 * `src` with every COMMENT and every STRING-LITERAL character blanked to a space (newlines kept,
 * so offsets and therefore reported line numbers survive).
 *
 * ⚠️ STRINGS ARE BLANKED TOO, and that was a false positive this gate's own drill caught: a
 * `'m.own = 1'` inside a debug log line — and every one of these loops sits beside debug logging
 * that builds strings out of mover fields — fired the gate on correct code. Comments alone were
 * not enough. Blanking the delimiters as well as the interior is deliberate: it leaves no quote
 * state for the later scans to get wrong, and a `;` inside a string becomes a space, so it cannot
 * be mistaken for the end of a single-statement loop body.
 */
function codeOnly(src) {
  let out = '';
  scanBalanced(src, 0, (c, depth, inQuote, inComment) => {
    out += (inComment || inQuote) && c !== '\n' ? ' ' : c;
  }, { stopAtBalance: false });
  return out;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

/** End of the loop body starting at `from`: the matching `}`, or the next top-level `;`. */
function bodyEnd(code, from) {
  let k = from;
  while (k < code.length && /\s/.test(code[k])) k++;
  if (code[k] === '{') {
    const end = scanBalanced(code, k, () => {});
    return end === -1 ? code.length : end;
  }
  let end = -1;
  scanBalanced(code, k, (c, depth, inQuote, inComment, idx) => {
    if (end === -1 && !inQuote && !inComment && depth === 0 && c === ';') end = idx;
  }, { stopAtBalance: false });
  return end === -1 ? code.length : end;
}

/**
 * Depth-1 member writes on `binding` within `code[from..to]`.
 * Excludes `==`, `===`, `=>`, `!=`, `<=`, `>=` — `js/app.js:617` really does read
 * `m.base === 0`, so that exclusion is a live negative control, not a hypothetical one.
 */
// ⚠️ COMPOUND ASSIGNMENT COUNTS, and its absence was a FALSE NEGATIVE in this function's first
// form — found while designing the drill below, before the drill existed. `m.base += 1` mutates a
// mover member exactly as `m.base = 1` does, and an operator check that only accepted a bare `=`
// walked straight past it. A gate that misses the trigger is the failure this whole deferral
// exists to avoid, so the operator set is enumerated rather than assumed.
//
// ⛔ `<` AND `>` ARE DELIBERATELY ABSENT from the compound set: `>=` and `<=` are COMPARISONS,
// while `>>=` and `<<=` are assignments. Listing the two-character shifts and omitting the bare
// angle brackets is what separates them; adding `>` "for symmetry" would fire on every
// `if (m.base >= 0)`.
const COMPOUND = /^(\*\*|>>>|<<|>>|&&|\|\||\?\?|[+\-*/%&|^])=(?!=)/;
function depth1Writes(code, binding, from, to) {
  const re = new RegExp(`\\b${binding}\\s*\\.\\s*([A-Za-z_$][\\w$]*)\\s*`, 'g');
  const hits = [];
  const body = code.slice(from, to);
  let mm;
  while ((mm = re.exec(body)) !== null) {
    const after = body.slice(mm.index + mm[0].length);
    // A bare `=` that is not `==`, `===` or `=>`. (`!=`, `<=`, `>=` put their first character
    // before the `=`, so they never reach this branch at all.)
    const simple = after[0] === '=' && after[1] !== '=' && after[1] !== '>';
    if (!simple && !COMPOUND.test(after)) continue;
    hits.push({ prop: mm[1], at: from + mm.index });
  }
  return hits;
}

test('MOVERLIFETIMETRIGGER [GATE] — nothing writes a mover MEMBER outside the adapter, so §14\'s deferred lifetime invariant is not yet owed', async () => {
  const raw = fs.readFileSync(APP_JS, 'utf8').replace(/\r\n/g, '\n');
  const code = codeOnly(raw);

  // ── 1. Every `.movers` usage must classify into a form this gate understands ──────────
  // An UNRECOGNISED way of touching the mover list is exactly the situation a human should
  // look at, so it reddens here and says so. This is the inventory half: without it the gate
  // could go green because a new form walked past its patterns, which is the false-clean this
  // whole campaign keeps paying for.
  const FORMS = [
    [/\.movers\s*=\s*\[/g, 'construction — the adapter assigns the list'],
    [/\.movers\s*\.\s*push\s*\(/g, 'construction — a decoration is appended'],
    [/for\s*\(\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s+of\s+[A-Za-z_$][\w$]*\.movers\s*\)/g, 'iteration — a for..of binding'],
    [/\.movers\s*\.\s*(?:forEach|map|filter|find|some|every)\s*\(/g, 'iteration — a callback form'],
    [/\.movers\s*\[\s*\d+\s*\]/g, 'index access'],
    // ⭐ A DIFFERENT OBJECT, and this guard found it on its first run rather than by a reading.
    // `c.movers` is the SEAM Construction's mover MAP, keyed by slot, whose members carry the
    // external shape `{element, ownership, slot}`. `d.movers` is the PRODUCTION array of
    // `{el, base}`. Only the second is this gate's subject: the seam is MOVERSHAPE's read-set
    // half and NOGHOSTATALL's, and §14's trigger is about the recorded production mover. Two
    // things spelled `.movers` two lines apart is precisely why the inventory half is not
    // decorative — without it the gate's patterns would have walked past this silently.
    [/\.movers\s*\.\s*(?:outgoing|incoming|decoration)\b/g, 'seam read — the Construction mover map by slot, NOT the production array'],
  ];
  const claimed = new Set();
  for (const [re, _why] of FORMS) {
    let mm; const r = new RegExp(re.source, 'g');
    while ((mm = r.exec(code)) !== null) for (let k = mm.index; k < mm.index + mm[0].length; k++) claimed.add(k);
  }
  const unclassified = [];
  { let mm; const r = /\.movers\b/g;
    while ((mm = r.exec(code)) !== null) if (!claimed.has(mm.index)) unclassified.push(`js/app.js:${lineOf(code, mm.index)}`); }
  assert.deepEqual(unclassified, [],
    'a `.movers` usage appeared in a form this gate does not classify. That is not automatically a '
    + 'defect — it may be a legitimate new shape — but it means the gate can no longer claim to '
    + 'have seen every way the mover list is touched, so it refuses to report green. Widen the '
    + 'FORMS list above with the new shape and a word saying what it is, and re-read whether the '
    + '§14 trigger has fired. Unclassified: ' + unclassified.join(', '));

  // ── 2. No depth-1 member write on any mover binding ───────────────────────────────────
  const OWED = 'plan §14 (§13 decision 22): the lifetime invariant is now OWED. §14 specifies '
    + 'TWO halves that must land TOGETHER — wrap the adapter literal in `Object.freeze(` (build) '
    + 'AND pin that wrapper in the source assertion with its deletion registered as a mutant '
    + '(test author). ⚠️ `js/app.js` is non-strict, so the freeze SILENCES this write rather than '
    + 'throwing: half one alone buys quiet, not a witness.';

  const findings = [];
  { let mm; const r = /for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s+[A-Za-z_$][\w$]*\.movers\s*\)/g;
    while ((mm = r.exec(code)) !== null) {
      const from = mm.index + mm[0].length;
      for (const h of depth1Writes(code, mm[1], from, bodyEnd(code, from))) {
        findings.push(`js/app.js:${lineOf(code, h.at)} writes \`${mm[1]}.${h.prop}\``);
      }
    } }
  { let mm; const r = /\.movers\s*\.\s*(?:forEach|map|filter|find|some|every)\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)/g;
    while ((mm = r.exec(code)) !== null) {
      const from = mm.index + mm[0].length;
      for (const h of depth1Writes(code, mm[1], from, bodyEnd(code, from))) {
        findings.push(`js/app.js:${lineOf(code, h.at)} writes \`${mm[1]}.${h.prop}\``);
      }
    } }
  // A write with no binding at all: `cur.movers[0].own = x`.
  { let mm; const r = /\.movers\s*\[\s*\d+\s*\]\s*\.\s*([A-Za-z_$][\w$]*)\s*=(?!=|>)/g;
    while ((mm = r.exec(code)) !== null) findings.push(`js/app.js:${lineOf(code, mm.index)} writes \`.movers[n].${mm[1]}\``); }

  assert.deepEqual(findings, [],
    'a mover MEMBER is written outside the adapter, which is the exact trigger ' + OWED
    + ' Writing `m.el.style.…` is NOT this — that is the element\'s style, two levels deep, and '
    + 'every current site does it. What fires here is an assignment landing ON the mover object '
    + `itself. Sites: ${findings.join('; ')}`);

  // ── 3. §14's two halves may only exist TOGETHER ───────────────────────────────────────
  // "Neither part is sound alone": the freeze without the pin buys silence and no witness; the
  // pin without the freeze pins a wrapper that is not there. Checked in BOTH directions, so this
  // clause is green today for a stated reason rather than vacuously.
  //
  // ⚠️ The registry is read STRUCTURALLY (its `from` fields), never as text. `tools/mutate.mjs`
  // already contains the string `Object.freeze(` in S2-39's narrative COMMENT explaining this
  // very deferral, so a text search would match the record of the plan instead of the mutant —
  // the same "a comment is not code" trap this file has paid for once already.
  const frozen = /const\s+toMover\s*=\s*\(m\)\s*=>\s*Object\.freeze\s*\(/.test(code);
  const pinned = ADAPTER_DECL.includes('Object.freeze(');
  // ⚠️ THE ANCHOR MUST NAME THE ADAPTER, NOT MERELY THE CONSTRUCT — a false positive this gate
  // produced on its FIRST run and which is recorded rather than quietly fixed. Searching the
  // registry for `Object.freeze(` alone matched FIVE unrelated entries (js/swipe.js freezing the
  // decorations list and the construction plan), so the gate reddened at HEAD on correct work.
  // That is the failure mode this project has lost three gates to. `Object.freeze(` is a common
  // construct; only its co-occurrence with the `toMover` binding identifies §14's wrapper.
  const { MUTATIONS } = await import(pathToFileURL(MUTATE_MJS).href);
  const registered = MUTATIONS.some((m) => [m, m.also].filter(Boolean)
    .some((p) => typeof p.from === 'string'
      && p.from.includes('Object.freeze(') && p.from.includes('toMover')));

  assert.equal(pinned, frozen,
    frozen
      ? 'js/app.js wraps the adapter literal in `Object.freeze(` but the source assertion above '
        + 'does not PIN the wrapper — ADAPTER_DECL still matches the bare literal. §14: without '
        + 'the pin the freeze is unguarded, because the file is non-strict so the freeze silences '
        + 'the offending write rather than throwing, and a later removal of the wrapper re-opens '
        + 'the route with nothing reddening.'
      : 'the source assertion pins an `Object.freeze(` wrapper that js/app.js does not have. §14: '
        + 'the pin without the freeze pins a wrapper that is not there. Both halves land together '
        + 'or neither does.');
  assert.equal(registered, frozen,
    frozen
      ? 'js/app.js wraps the adapter literal in `Object.freeze(` but no registered mutation '
        + 'deletes that wrapper, so the pin has no runnable evidence — a pinned wrapper nobody can '
        + 'break is a claim, not a witness. §14 half two is a pin AND its mutant.'
      : 'a mutation is registered against an `Object.freeze(` wrapper that js/app.js does not '
        + 'have. Its anchor cannot match, so test/mutation-anchors.test.js should already be red; '
        + 'register it in the commit that ADDS the wrapper, not before.');
});

// ⛔ FIRE DRILL for the gate above, over SYNTHETIC sources only — the gate's own file is never
// read here, so the drill has no text of its own the scan could collide with.
//
// ⚖️ THE FALSE-POSITIVE SURFACE IS THE POINT OF THIS DRILL, not an afterthought. A gate that
// fires on legitimate mover work gets switched off, and this project has lost gates that way three
// times; the negative list below is therefore longer than the positive one, and every row in it
// is a shape that exists in `js/app.js` today or is one refactor away.
const gateHits = (src) => {
  const code = codeOnly(src);
  const out = [];
  let mm; const r = /for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s+[A-Za-z_$][\w$]*\.movers\s*\)/g;
  while ((mm = r.exec(code)) !== null) {
    const from = mm.index + mm[0].length;
    for (const h of depth1Writes(code, mm[1], from, bodyEnd(code, from))) out.push(`${mm[1]}.${h.prop}`);
  }
  const r2 = /\.movers\s*\.\s*(?:forEach|map)\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)/g;
  while ((mm = r2.exec(code)) !== null) {
    const from = mm.index + mm[0].length;
    for (const h of depth1Writes(code, mm[1], from, bodyEnd(code, from))) out.push(`${mm[1]}.${h.prop}`);
  }
  const r3 = /\.movers\s*\[\s*\d+\s*\]\s*\.\s*([A-Za-z_$][\w$]*)\s*=(?!=|>)/g;
  while ((mm = r3.exec(code)) !== null) out.push(`movers[n].${mm[1]}`);
  return out;
};

test('MOVERLIFETIMETRIGGER fire drill — POSITIVE: every shape of a mover-member write is reported', () => {
  const cases = [
    ['the audit\'s counterexample, inside the real loop shape', "for (const m of d.movers) if (m.base) m.own = 'borrowed-real', m.el.style.transform = 't';", ['m.own']],
    ['a braced body', 'for (const m of d.movers) { m.own = 1; }', ['m.own']],
    ['re-pointing the element itself', 'for (const m of d.movers) { m.el = other; }', ['m.el']],
    ['mutating the base after construction', 'for (const m of d.movers) { m.base = 5; }', ['m.base']],
    ['COMPOUND assignment, which a bare-`=` check misses', 'for (const m of d.movers) { m.base += 1; }', ['m.base']],
    ['a shift-assign, which must not be read as a comparison', 'for (const m of d.movers) { m.base >>= 1; }', ['m.base']],
    ['a RENAMED binding — the rule is structural, not a text pin', 'for (const mv of cur.movers) { mv.own = 1; }', ['mv.own']],
    ['a callback iteration instead of for..of', 'cur.movers.forEach((mv) => { mv.own = 1; });', ['mv.own']],
    ['a direct index write with no binding at all', "cur.movers[0].own = 'x';", ['movers[n].own']],
    ['a write buried after several legitimate ones', "for (const m of d.movers) { m.el.style.transition = ''; m.el.style.transform = ''; m.own = 1; }", ['m.own']],
  ];
  for (const [label, src, expected] of cases) {
    assert.deepEqual(gateHits(src), expected, `${label}: this shape MUST fire the trigger gate`);
  }
});

test('MOVERLIFETIMETRIGGER fire drill — NEGATIVE: legitimate mover work, comparisons, comments and unrelated bindings never fire it', () => {
  const clean = [
    ['the five real HEAD sites, verbatim in shape', "for (const m of d.movers) if (m.base) m.el.style.transform = 'translateX(' + m.base + 'px)';"],
    ['a multi-write braced body — the :701 shape', "for (const m of cur.movers) { m.el.style.transition = ''; m.el.style.transform = ''; m.el.style.willChange = ''; }"],
    ['a `===` comparison on a member — the :617 shape, live at HEAD', "for (const m of cur.movers) m.el.style.transform = (m.base === 0 ? a : b);"],
    ['a `!==` comparison', "for (const m of cur.movers) { if (m.base !== 0) m.el.style.transition = ''; }"],
    ['a `>=` comparison, which must not read as a compound assign', "for (const m of cur.movers) { if (m.base >= 0) m.el.style.willChange = ''; }"],
    ['a `<=` comparison', "for (const m of cur.movers) { if (m.base <= 0) m.el.style.willChange = ''; }"],
    ['an ARROW inside the body — `=>` is not an assignment', 'for (const m of cur.movers) m.el.style.transform = f(() => m.base);'],
    ['a deeper write through .el', "for (const m of d.movers) { m.el.dataset.k = 'v'; }"],
    ['a mover-member write inside a LINE COMMENT', "for (const m of d.movers) { // m.own = 'x' would be the defect\n  m.el.style.transform = 't'; }"],
    ['a mover-member write inside a BLOCK COMMENT', "for (const m of d.movers) { /* m.own = 'x' */ m.el.style.transform = 't'; }"],
    ['a mover-member write inside a STRING', "for (const m of d.movers) { m.el.style.transform = \"m.own = 1\"; }"],
    // ⭐ The scoping control. js/app.js binds `m` to a <meta> element at :2900 and to an array at
    // :2902; a file-wide identifier rule would have fired on both.
    ['an UNRELATED binding of the same name outside any movers loop', "for (const m of d.movers) m.el.style.transform = 't';\nconst m = document.querySelector('meta'); m.content = 'x';"],
    ['the SEAM mover inside the adapter, which is MOVERSHAPE\'s subject and not this gate\'s', 'const toMover = (m) => ({ el: m.element, base: baseOf(m.slot) });'],
    ['construction of the list itself — a member of the SESSION, not of a mover', 'd.movers = [toMover(a), toMover(b)];\nd.movers.push(toMover(c));'],
  ];
  for (const [label, src] of clean) {
    assert.deepEqual(gateHits(src), [],
      `${label}: this is legitimate work and MUST NOT fire. A gate that reddens on correct code `
      + 'gets switched off, and then the trigger it exists to catch arrives with nothing watching.');
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════
// RECOVERYPARITY — the collapsed leftover-state recovery does exactly what the surviving
// branch did before the collapse, for EVERY entry route that still exists.
// Plan §10 RECOVERYPARITY / §5 / §9.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// WHAT THE COLLAPSE DOES. `begin()`'s recovery entry predicate loses its `.nav-ghost` disjunct
// (§4 D9), which is the ONLY route on which the recovered handle `cur = d || session` was ever
// null. Three expressions written to serve that null case become constant, and with them the
// explicit style-reset call goes — deletable ONLY because the very next line's screen
// application reaches the same reset as its FIRST statement.
//
// ⛔ THE DANGER IS ONE-DIRECTIONAL AND THIS CELL IS ITS WITNESS. If the deleted disjunct were
// reachable after all, the collapsed form changes `resetScroll` from default-true to false on
// that path — a live behaviour change on the exact axis this campaign has already shipped a
// defect on. The reachability claim is held structurally by NOGHOSTCLASS
// (test/retired-concepts-purge.test.js); what THIS cell holds is that the surviving routes
// still behave as they did.
//
// THE THREE ROUTES, and why each is a distinct state rather than three spellings of one:
//   (1) a mid-drag second touch          — `d` is live; the successor supersedes a DRAGGING owner
//   (2) a settling session superseded    — `d` is null, `finishing && session`; the owner is past
//       before finalize                    finger-up and still animating
//   (3) a live drag interrupted by a     — `d` is live, but a screen application has ALREADY run
//       nav tap, then a second touch       under the gesture and cleared its transforms
//
// The `resetScroll:false` witness lives on route 1, which is driven from an OVERLAY source:
// for a browse source `applyScreen` performs no scroll reset at all, so the flag is
// unobservable there. That is stated rather than left as an uneven-looking cell.

/** Everything the recovery must do, measured across ONE recovery touchstart. */
function recoveryProbe(h) {
  const base = { renders: renders(h).length, scrolls: scrollCalls(h).length, calls: h.log.calls.length,
    hardResets: hardResets(h).length };
  return {
    assertParity(label) {
      assert.ok(hardResets(h).length > base.hardResets,
        `fixture: the ${label} route must actually trip the recovery`);
      assert.equal(renders(h).length, base.renders,
        `${label}: the recovery restores the source screen with NO re-render. Since the declone no `
        + 'transition overwrites its source, so there is never any source CONTENT to rebuild; a '
        + `render here would mean the source HAD been clobbered. renders=${JSON.stringify(renders(h).slice(base.renders))}`);
      assert.equal(scrollCalls(h).length - base.scrolls, 1,
        `${label}: the session-start document scroll is restored EXACTLY ONCE. Zero means the `
        + 'restore was dropped and the user is left at the destination scroll; more than one means '
        + 'the screen application stomped it and something wrote it back.');
      const iScroll = orderOf(h, 'window.scrollTo', base.calls);
      const iHold = orderOf(h, 'browse.endHold', base.calls);
      assert.ok(iScroll >= 0 && iHold >= 0,
        `${label}: fixture — both the scroll restore and the hold release must occur`);
      assert.ok(iScroll < iHold,
        `${label}: the row hold is released AFTER the screen is applied. The scroll restore is the `
        + 'statement immediately after the screen application, so it is the observable landmark for '
        + 'that ordering. Releasing the hold first deactivates a suspended virtualized source and '
        + 'dematerializes its kept rows before the screen has landed — an executed counterexample.');
    },
  };
}

test('RECOVERYPARITY.mid-drag — a second touch during a live drag restores the source without a re-render, restores the scroll once, and releases the hold last', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onOptionsOverBooks(h);                 // overlay source: the resetScroll flag is observable
    await goLive(h, h.$('options'));
    h.$('options').scrollTop = 50;               // a source panel scrolled away from top

    const probe = recoveryProbe(h);
    h.touch.start(10, 300, addRow(h));           // the superseding touch -> begin()'s recovery
    probe.assertParity('mid-drag');

    assert.equal(h.$('options').scrollTop, 50,
      'the recovery forces resetScroll:false so the screen application cannot stomp the explicit '
      + 'session-start scroll restore that follows it. Passing the default (true) instead resets '
      + 'the source panel to top — the orphan-path parity the collapsed call must NOT inherit.');
  } finally { h.dispose(); }
});

test('RECOVERYPARITY.settling — a session superseded after finger-up but before finalize takes the same recovery', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    await realSleep(12);
    h.touch.end(160, 302);                       // finger-up: `finishing` is set, `d` is nulled,
                                                 // the session is still the live pane-less owner
    assert.equal(settles(h).length, 0, 'fixture: the settle has not finalized yet — no clock advance');

    const probe = recoveryProbe(h);
    h.touch.start(10, 300, addRow(h));           // supersede the SETTLING session
    probe.assertParity('settling');
  } finally { h.dispose(); }
});

test('RECOVERYPARITY.nav-interrupted — a live drag whose transforms a nav tap already cleared still takes the same recovery', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    h.tap('.navbtn[data-nav="authors"]');        // a real nav mid-drag: applyScreen runs under the gesture
    await settle(h);

    const probe = recoveryProbe(h);
    h.touch.start(10, 300, addRow(h));
    probe.assertParity('nav-interrupted');
  } finally { h.dispose(); }
});

// ── RECOVERYPARITY.pillswept — ITS OWN NAMED TEST, deliberately ─────────────────────────
//
// WHY IT IS SPLIT OUT (plan §13 decision 13). The mutation sweep reports a killing TEST, not a
// killing assertion, so a multi-assertion cell cannot attribute a kill. The mutant this
// assertion exists for — the screen application removed from the recovery — also reddens the
// parity assertions above, so without the split the sweep could not show that THIS witness
// fires.
//
// WHY THE WITNESS IS OWED AT ALL. `js/nav.js`'s `.np-pill-float` sweep is the only sweeper of
// the one owned resource the swipe still creates. After §5 deletes the explicit style-reset
// call, the recovery reaches that sweep through the screen application and through nothing
// else. The cell that used to witness this on the recovery path is deleted with its stated
// rationale (the ownership filter), so the behaviour it witnessed is re-homed here rather than
// dropped — losing a witness in the same commit that removes the code guaranteeing the
// behaviour is the shape this whole campaign was opened by.
//
// ⛔ NOT a substitute for, and not substituted by, PILLSWEPT
// (test/swipe-declone-stage2-reset.test.js): that cell drives the reset DIRECTLY at the unit
// layer and says nothing about whether the recovery reaches it. The two are the pair.
test('RECOVERYPARITY.pillswept — the recovery still reaches the style reset: a pill float present at its start is gone at its end', async () => {
  const h = boot({ fakeTimers: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    const pill = addPillFloat(h);
    assert.equal(pillFloats(h), 1, 'fixture: a transient pill clone is present when the recovery begins');

    const hr0 = hardResets(h).length;
    h.touch.start(10, 300, addRow(h));
    assert.ok(hardResets(h).length > hr0, 'fixture: the supersession tripped the recovery');

    assert.ok(!pill.isConnected && pillFloats(h) === 0,
      'the recovery must still reach Nav.resetSwipeStyles, whose FIRST statement inside the screen '
      + 'application is the sweep. After the explicit reset call is deleted the screen application '
      + 'is the SINGLE path to it, so a recovery that stops applying the screen leaks a floating '
      + `pill clone with nothing left to remove it. pill floats=${pillFloats(h)}`);
  } finally { h.dispose(); }
});

// ════════════════════════════════════════════════════════════════════════════════════════
// DESTROYEDMOVER — a gesture whose movers are destroyed mid-drag still settles, leaves no
// element carrying an inline transform, and releases the session.
// Plan §10 DESTROYEDMOVER / §7 M1 / §13 decision 4. Closes coverage-audit finding M1.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// THE INVARIANT IS ALREADY THIS PROJECT'S, and the ruling is that NO GUARD IS ADDED: a gesture
// must settle even when the DOM it started on is destroyed mid-drag — the gesture does not own
// that node and must not depend on it (test/swipe-gesture.test.js's destroyed-touch-target
// cell). The declone WIDENED the set of destructible non-owned nodes from {touch target} to
// {touch target, outgoing mover, incoming mover}, because both view movers are now borrowed
// real elements. The correct response is to widen the CELL, which is what this is; the shipped
// code already satisfies it.
//
// THREE ROUTES, one per way a mover is destroyed or cleared mid-gesture. They are three
// coordinates of one cell, not three spellings of one route: two DESTROY the movers (the
// destination-render and cache paths), and the third CLEARS their transforms while they
// survive — which is the only one on which a surviving page's transform can be observed at all,
// and therefore the one that carries the registered mutant.
//
// ⚠️ The sibling cell in test/swipe-gesture.test.js is NOT merged into this one: collapsing the
// touch-target coordinate into the mover coordinate would lose one of the two.

test('DESTROYEDMOVER.cacheclear — a browse->browse gesture whose page movers are destroyed by a cache clear still settles and releases', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    assert.ok(starts(h).length > 0, 'fixture: the gesture went live and resolved both movers');
    const pagesBefore = h.document.querySelectorAll('.browsepage').length;
    assert.ok(pagesBefore > 0, 'fixture: the browse->browse pair resolved real .browsepage movers');

    h.Browse.clearCache();                       // exactly what the reconnect handler does, mid-gesture
    await realSleep(12);
    h.touch.end(160, 302);
    await h.clock.advance(400);                  // past the settle and the 340ms finalize fallback
    await settle(h);

    assert.ok(settles(h).length > 0,
      'the gesture must SETTLE even though both of its movers were destroyed mid-drag. It does not '
      + 'own those nodes; a settle that depended on them would strand `finishing` and wedge every '
      + 'future swipe.');
    const stuck = [...h.document.querySelectorAll('*')].filter((el) => el.style && el.style.transform);
    assert.deepEqual(stuck.map((el) => el.id || el.className), [],
      'no surviving element may keep an inline transform after the settle');
    assert.equal(sess(h), null,
      'the session must be RELEASED, so the next touch does not trip the leftover-state hard reset');
  } finally { h.dispose(); }
});

test('DESTROYEDMOVER.containerwipe — the same holds when the whole browse container is wiped instead', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    assert.ok(starts(h).length > 0, 'fixture: the gesture went live');

    h.Browse.reset();                            // the container wipe (sign-out's route), mid-gesture
    await realSleep(12);
    h.touch.end(160, 302);
    await h.clock.advance(400);
    await settle(h);

    assert.ok(settles(h).length > 0, 'a wiped container must not prevent the settle');
    assert.equal(sess(h), null, 'the session must be released after a container wipe too');
  } finally { h.dispose(); }
});

test('DESTROYEDMOVER.midscreen — a mid-gesture screen application clears every page mover transform, leaving nothing stuck', async () => {
  const h = boot({ fakeTimers: true, realBrowse: true });
  try {
    await onAuthorsOverBooks(h);
    await goLive(h);
    const stampedBefore = [...h.document.querySelectorAll('.browsepage')].filter((p) => p.style.transform);
    assert.ok(stampedBefore.length > 0,
      'fixture: the live browse->browse drag stamped an inline transform on at least one page mover — '
      + 'without this the assertion below would be satisfied by there being nothing to clear');

    h.tap('.navbtn[data-nav="authors"]');        // a real nav tap mid-drag -> applyScreen with rendering
    await settle(h);

    const stuck = [...h.document.querySelectorAll('.browsepage')].filter((p) => p.style.transform);
    assert.deepEqual(stuck.map((p) => p.dataset.key || p.className), [],
      'the style reset must clear EVERY `.browsepage`, not only the elements that carry an id. A page '
      + 'is a borrowed mover carrying no id, so an id-keyed list cannot reach it and a gesture '
      + 'interrupted here would leave a page stuck at translateX(±w) — the "erratic after a while" '
      + 'class the reset exists to prevent.');

    await realSleep(12);
    h.touch.end(160, 302);
    await h.clock.advance(400);
    await settle(h);
    assert.equal(sess(h), null, 'the interrupted gesture still releases its session');
  } finally { h.dispose(); }
});
