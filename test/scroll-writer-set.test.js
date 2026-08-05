// M1WRITERSET — the set of code paths that TEXTUALLY move an element's vertical scroll
// offset in first-party source is DERIVED from source and compared against a registered
// baseline, in BOTH directions (PLAN-home-shift-fix.md §7.1, §7.5). Authored by Curie.
//
// WHAT IT PROVES. Exactly one derived site targets `#home` — the nav `applyScreen` home
// branch guarded by `resetScroll` (js/nav.js:140) — and a second textual writer cannot appear
// without this gate failing. This converts the 2nd adversary strike's durable lesson
// (*enumerate every writer of the observable; gate each write on the identity it belongs to*)
// from a discipline into a failing gate.
//
// ⛔ WHAT IT DOES NOT CLAIM, AND WHY THE WORDING MATTERS. It does NOT claim the set of MOVERS
// is one. A static gate cannot support that: a mover can exist with no text to derive, and one
// is LIVE at HEAD — browser SCROLL ANCHORING (`overflow-anchor` is declared nowhere in `css/`,
// so `#home` sits at the `auto` default, and `js/home-screen.js` changes home's content height
// under a live offset). It needs no API call and leaves nothing to derive. The claim is
// therefore the TEXTUAL bound, and the non-textual remainder is a registered residual routed
// to device and judgment (§8 R-writer-enum) — never a closed enumeration.
// Also outside its reach: a target resolved at RUNTIME (entry 6 below is a live instance
// INSIDE the registered set), and a write the pattern cannot see (`el['scrollTop'] = y`,
// `Object.assign(el, { scrollTop: y })`, or a write through an aliased element reference).
// A passing gate means the declared structural obligations passed, nothing more.
//
// ⚠️ GREEN AT HEAD BY DESIGN — this is a LOCK, not a red cell. The previous plan revision
// stated a seven-entry baseline that its own pattern contradicted, which would have landed
// this gate RED ON ARRIVAL; the cheap repair (narrowing the pattern to drop `scrollTo`, or
// excluding `app.js`) would have removed exactly the `scrollIntoView`-class coverage the next
// adversarial pass targets. So: ⛔ DO NOT "REPAIR" A RED BY NARROWING THE PATTERN OR THE FILE
// SET. A red means either a new writer appeared (register it, with a one-line reason it cannot
// reach `#home`) or a registered one vanished (re-derive, do not delete the entry blindly).
// Its ability to fail is proven two ways: the registered ADDITIVE mutant
// ("M1WRITERSET: a second #home.scrollTop writer is injected"), and the SELFTEST below, which
// drives the comparison against synthetic in-memory inventories.
//
// THE BASELINE WAS DERIVED BY RUNNING THE DERIVATION, NOT HAND-WRITTEN. This project's
// standing lesson is that a hand-written inventory is wrong — it already carries a
// GENERATED-inventory gate for that reason, and the same lesson applies to the BASELINE of a
// gate, not only to its output. Three independent derivations now agree on these 14 sites
// (the plan's, the plan reviewer's re-stress, and this seat's own run).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./dom-fixture.js');

// ── S1 — FILES. `js/` first-party only.
const SOURCE_DIR = 'js';
// `js/vendor/**` is EXCLUDED with its reason recorded: it is ONE vendored third-party debug
// console (js/vendor/eruda.js), 500 KB on 8 minified lines, injected on demand by
// js/debug.js, never precached, never touching `#home`. Without the exclusion this gate is
// red on arrival against a minified bundle.
//
// ⭐ THE REASON IS PINNED BY FILE IDENTITY, NOT BY FILE COUNT, AND THE PIN LIVES IN ITS OWN
// GATE: test/vendor-exclusion-pin.test.js (a recorded content hash alongside the count, so an
// IN-PLACE eruda upgrade that adds scroll writes cannot pass silently — a count check is blind
// to it). REFERENCED, NOT DUPLICATED: this gate would otherwise carry a second, drifting copy
// of the same claim. On a pin failure the response is to re-derive the exclusion's reason
// against the new content, never to bump the recorded value.
const EXCLUDED_DIRS = {
  'js/vendor': 'one vendored third-party debug console (eruda), injected on demand, never '
    + 'precached, never touching #home — pinned by content hash in test/vendor-exclusion-pin.test.js',
};
// Two further trees are non-source and are excluded BY CONSTRUCTION (this gate globs `js/`
// only, so neither is reachable): `android/build/assets/www/js/` is gitignored build OUTPUT —
// a COPY of `js/`, so a gate that globbed it would double-count every entry — and
// `.claude/worktrees/**` holds agent worktrees. Asserted below so the exclusion is a decision
// rather than an accident of the glob.
const NON_SOURCE_TREES = ['android/build', '.claude/worktrees'];

// ── S2 — AXIS. VERTICAL only. `scrollLeft` is a separate registered class, because a
// horizontal write on a descendant cannot move an ancestor's vertical offset. Registered
// rather than pattern-excluded so the exclusion is a decision, not an omission.
const HORIZONTAL_CLASS = [
  { file: 'js/app.js', text: 't.dataset.sl = t.scrollLeft',
    why: 'a dataset WRITE that READS scrollLeft — not a scroll write at all' },
];
// RE-DERIVED 2026-08-01 for PLAN-swipe-declone.md Stage 2. The class had a second member,
// js/swipe.js "c[i].scrollLeft =" — carousel offsets copied onto the CLONE. It is gone with
// the clone-fidelity helper cluster (plan §12 item 3): the real carousels keep their own
// scrollLeft, so there was nothing left to copy them onto. De-registered rather than left to
// rot, and the class is NOT pattern-excluded — the surviving member keeps the registration
// honest, and a NEW horizontal writer must still be registered here rather than filtered out.

// ── S4 — TEXTUAL only. Non-textual movers are outside reach BY CONSTRUCTION, not by
// omission; they are residuals (§8 R-writer-enum), and browser scroll anchoring is the live
// instance. Named here so a future reader cannot mistake the gate's silence for coverage.
const NON_TEXTUAL_RESIDUALS = ['browser scroll anchoring'];

// ── THE PATTERNS. Every textual assignment to a `scrollTop` property, every element
// `scrollTo`/`scrollBy`/`scrollIntoView` call site (member OR bare/local), and — class D —
// every assignment TO one of those scroll APIs, because shipped code REPLACES
// `window.scrollTo` at runtime and a gate that inventories an API a codebase replaces must say
// so or the next reader deletes the pattern as a false positive.
const PATTERNS = [
  ['A', /\.scrollTop\s*=(?!=)/g],
  ['B', /\.scroll(?:To|By|IntoView)\s*\(/g],
  ['B', /(?:^|[^\w.$])scroll(?:To|By|IntoView)\s*\(/g],
  ['D', /\.scroll(?:To|By|IntoView)\s*=(?!=)/g],
];

/**
 * Strip comments before matching. A comment that MENTIONS a retired `scrollTo(0,1)` is not a
 * writer, and js/nav.js:135 carries exactly such a mention — deriving it would put a phantom
 * entry in the baseline. String-aware so a `//` inside a literal cannot truncate a real line.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  let q = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (q) {
      if (c === '\\') { out += c + (n || ''); i += 2; continue; }
      if (c === q) q = null;
      out += c; i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && n === '*') {
      i += 2; out += '  ';
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      i += 2; out += '  '; continue;
    }
    out += c; i++;
  }
  return out;
}

function firstPartyFiles(dir = SOURCE_DIR, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) {
      if (Object.prototype.hasOwnProperty.call(EXCLUDED_DIRS, rel)) continue;
      firstPartyFiles(rel, out);
    } else if (e.name.endsWith('.js')) out.push(rel);
  }
  return out;
}

/** Derive every textual vertical-scroll mover site: [{ cls, file, line, text }]. */
function deriveSites(readFile = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')) {
  const sites = [];
  for (const file of firstPartyFiles()) {
    const raw = readFile(file).replace(/\r\n/g, '\n').split('\n');
    stripComments(readFile(file).replace(/\r\n/g, '\n')).split('\n').forEach((line, i) => {
      const seen = new Set();
      for (const [cls, re] of PATTERNS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) {
          const key = cls + ':' + m.index;
          if (seen.has(key)) continue;
          seen.add(key);
          sites.push({ cls, file, line: i + 1, text: (raw[i] || '').trim() });
        }
      }
    });
  }
  return sites;
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// THE REGISTERED BASELINE — 14 entries in three derived classes. Every entry carries a
// TARGET, an OWNER, and a one-line reason it cannot move `#home` — except entry 1, which is
// the one that can.
//
// Entries are keyed by their SOURCE TEXT, not by `file:line`: a line number rots on any edit
// above it, which would turn this gate into noise. Two entries may legitimately share the
// same text (10 and 11 do); they form a GROUP and the derived count for that group must match
// the number of registered entries in it, so the gate still fails when one of the two is
// deleted.
// ─────────────────────────────────────────────────────────────────────────────────────────
const BASELINE = [
  // ── Class A — assignments to an element `scrollTop` (5 sites).
  { n: 1, cls: 'A', file: 'js/nav.js', text: "if (resetScroll) $('home').scrollTop = 0; return; }",
    target: '#home', owner: 'the nav applyScreen home branch, guarded by resetScroll',
    why: 'THIS IS THE #home WRITER — the set\'s single member. Not a reason it cannot reach #home.' },
  { n: 2, cls: 'A', file: 'js/nav.js', text: "if (resetScroll) $(desc.v).scrollTop = 0;",
    target: 'the screen element for desc.v, guarded by resetScroll', owner: 'nav applyScreen',
    why: "reached only after the desc.v === 'home' branch has already returned, so desc.v !== 'home'" },
  { n: 3, cls: 'A', file: 'js/browse.js', text: 'page.scrollTop = clampY(',
    target: 'a .browsepage element', owner: 'browse.js applyScrollY',
    why: 'a browse PAGE is the browse scroller since PLAN-swipe-declone.md §5.3.1 — an '
      + 'inset:0 absolutely-positioned child of #browse, never #home. The write target is the '
      + 'page PARAMETER, so it is whatever page the caller already holds and cannot be '
      + 'redirected by an inference' },
  { n: 4, cls: 'A', file: 'js/browse.js', text: 'scrollTo: (y) => { m.scrollTop = y; },',
    target: 'the .browsepage a virtual controller was built for', owner: "browse.js's injected opts.scrollTo seam",
    why: 'the closure captures virtualView\'s own page-node parameter, so each controller '
      + 'writes ITS OWN page and no two share a pointer (PLAN-swipe-declone.md §5.3.4). Never '
      + '#home. The text `scrollTo:` here is a property KEY, not a call site, so it is not '
      + 'double-counted in class B' },
  { n: 5, cls: 'A', file: 'js/debug.js', text: 'body.scrollTop = body.scrollHeight;',
    target: 'the debug log body', owner: 'the debug overlay',
    why: 'an element inside the debug overlay' },

  // ── Class B — element `scrollTo`/`scrollBy`/`scrollIntoView` call sites (4 sites).
  { n: 6, cls: 'B', file: 'js/browse.js', text: "el.scrollIntoView({ block: 'start' });",
    target: 'a .lettergroup descendant of a browse PAGE, whose nearest scroll container is that '
      + 'page — PLAN-swipe-declone.md §5.3.1 moved the scroller from #browse down to each page, '
      + 'so this entry\'s previous recording of #browse as the container is no longer true',
    owner: "browse.js's local scrollTo(L) helper",
    why: 'a browse-mount descendant. ⚠️ CAVEAT REGISTERED: the target is resolved by a '
      + 'RUNTIME-BUILT selector, so the derivation can see the CALL but cannot prove the TARGET '
      + "— S4's boundary appearing INSIDE the registered set, recorded rather than smoothed over" },
  { n: 7, cls: 'B', file: 'js/browse.js', text: 'highlight(L); scrollTo(L);',
    target: 'entry 6', owner: 'the alpha-index scrub handler', why: 'calls entry 6' },
  { n: 8, cls: 'B', file: 'js/browse.js', text: 'scrollTo(t.dataset.letter);',
    target: 'entry 6', owner: 'the alpha-index click handler', why: 'calls entry 6' },
  { n: 9, cls: 'B', file: 'js/virtuallist.js', text: 'opts.scrollTo(y + metrics.listTop()',
    target: "whatever the injected seam targets, which at HEAD is entry 4's .browsepage node",
    owner: 'the virtual list', why: 'the virtual list touches no element directly' },

  // ── Class C — `window`-targeted DOCUMENT scroll, the separate class of S3 (5 sites).
  // REGISTERED rather than dropped from the pattern: dropping `scrollTo` is precisely the
  // cheap repair that would blind this gate. A document scroll writes no element's scrollTop,
  // and window scroll is always 0 on the signed-in app views now that both #home and #browse
  // are fixed own-scroll boxes (the reasoning recorded at css/app.css:146-149).
  // RE-DERIVED (PLAN-swipe-declone-stage2-subtraction.md §4a C5, decision 17): entry 10 lost
  // its `if (cur)` guard when §5's collapse proved `cur` is never null on the recovery's only
  // remaining entry route, so its text now converges EXACTLY onto entry 11's — a shared-text
  // GROUP of two, not the nested pair (entry 10's line no longer CONTAINS entry 11's; the two
  // are now byte-identical). Direction 3 below still reddens if EITHER writer vanishes, which
  // is the property the group mechanism exists to preserve; what is lost is which of the two
  // vanished, and that is disclosed in the drift message rather than hidden.
  { n: 10, cls: 'B', file: 'js/app.js', text: 'window.scrollTo(0, cur.scroll0);',
    target: 'the document', owner: 'the supersession recovery', why: 'a document scroll, not an element write' },
  // Entries 11 and 12 were a GROUP of two sharing this text — the HELD abort path and the
  // no-hold abort path. PLAN-swipe-declone.md Stage 2 deleted the held abort branch (an abort
  // has nothing to rebuild and nothing to hold), so the group had a single member for a time —
  // until entry 10 converged onto the same text above, re-forming a group of two.
  { n: 11, cls: 'B', file: 'js/app.js', text: 'window.scrollTo(0, cur.scroll0);',
    target: 'the document', owner: 'the abort path', why: 'a document scroll, not an element write' },
  { n: 13, cls: 'D', file: 'js/app.js', text: 'window.scrollTo = function (...args) {',
    target: 'the window.scrollTo API ITSELF', owner: 'the reveal watcher\'s diagnostic wrapper',
    why: 'write-through and document-scoped like the calls it wraps, so it moves nothing on '
      + '#home. Its significance to this inventory is that `window.scrollTo` is NOT a stable '
      + 'identity in this codebase' },
  { n: 14, cls: 'D', file: 'js/app.js', text: 'cover.restoreScrollTo = () => { window.scrollTo = realScrollTo; };',
    target: 'the window.scrollTo API ITSELF', owner: 'the reveal watcher\'s restore',
    why: 'restores the replaced API; same document scope' },
];

const HOME_WRITERS = BASELINE.filter((e) => e.target === '#home');
const groupKey = (e) => e.file + ' || ' + e.text;

/** Which baseline entry (if any) a derived site matches: by file + text containment. */
const matchOf = (site) => BASELINE.filter((e) => e.file === site.file && site.text.includes(e.text));

test('M1WRITERSET — every derived first-party vertical-scroll writer is registered, and every '
  + 'registered writer still occurs in source', () => {
  const sites = deriveSites();

  // ⭐ ANTI-VACUITY: a derivation over an empty file set passes every comparison below.
  assert.ok(firstPartyFiles().length > 20,
    `fixture: the derivation must actually walk js/ — found ${firstPartyFiles().length} first-party files`);
  assert.ok(sites.length > 0, 'fixture: the derivation found NO scroll sites at all, which cannot be true');

  // ── DIRECTION 1 — a derived site that is not registered FAILS.
  const unregistered = sites.filter((s) => matchOf(s).length === 0)
    .map((s) => `${s.file}:${s.line} [${s.cls}] ${s.text.slice(0, 120)}`);
  assert.deepEqual(unregistered, [],
    'these code paths TEXTUALLY move an element\'s vertical scroll offset and are NOT in the '
    + 'registered baseline. A second writer of #home is the exact shape the 2nd adversary strike '
    + 'punished (a browse-source value written onto #home). REGISTER each with a target, an owner '
    + 'and a one-line reason it cannot reach #home — and ⛔ do NOT narrow the pattern or the file '
    + 'set to make this pass (that removes the scrollIntoView-class coverage the next adversarial '
    + 'pass targets):\n  ' + unregistered.join('\n  '));

  // ── DIRECTION 2 — a registered entry whose text no longer occurs FAILS. This is what stops
  // the inventory rotting the way a hand-written, only-ever-growing one does.
  const rotted = BASELINE
    .filter((e) => !fs.readFileSync(path.join(ROOT, e.file), 'utf8').includes(e.text))
    .map((e) => `#${e.n} [${e.file}] ${e.text}`);
  assert.deepEqual(rotted, [],
    'these registered baseline entries no longer occur in source, so the inventory has rotted — '
    + 'RE-DERIVE (do not delete the entry blindly; a vanished writer may have moved rather than '
    + 'gone):\n  ' + rotted.join('\n  '));

  // ── DIRECTION 3 — a GROUP whose derived count no longer equals its registered count FAILS.
  // Entries 10 and 11 share their text (PLAN-swipe-declone-stage2-subtraction.md §4a C5); without
  // this, deleting one of the two would pass silently. Registered texts no longer NEST after
  // §5's collapse — entry 10's line is now byte-identical to entry 11's, not a superset of it —
  // so each derived site is attributed to its LONGEST matching entry (a no-op tie-break here,
  // since the two texts are equal length; recorded so a future asymmetric group is not surprised
  // by which one wins).
  const derivedCount = new Map();
  for (const s of sites) {
    const best = matchOf(s).sort((a, b) => b.text.length - a.text.length)[0];
    if (!best) continue;
    derivedCount.set(groupKey(best), (derivedCount.get(groupKey(best)) || 0) + 1);
  }
  const registeredCount = new Map();
  for (const e of BASELINE) registeredCount.set(groupKey(e), (registeredCount.get(groupKey(e)) || 0) + 1);
  const drift = [];
  for (const [k, want] of registeredCount) {
    const got = derivedCount.get(k) || 0;
    if (got !== want) {
      // Name every registered candidate in the group, not just the key — a group drift cannot
      // say WHICH writer vanished, so the reader is handed the full candidate list instead of
      // being left to guess (PLAN-swipe-declone-stage2-subtraction.md §4a C5 mitigation).
      const candidates = BASELINE.filter((e) => groupKey(e) === k)
        .map((e) => `#${e.n} (${e.owner})`).join(', ');
      drift.push(`${k} — registered ${want} site(s), derived ${got} — candidates: ${candidates}`);
    }
  }
  assert.deepEqual(drift, [],
    'these baseline groups no longer have the registered number of sites in source. A group with '
    + 'two identical-text entries (entries 10 and 11, both document scrolls) is why this direction '
    + 'exists: without it, deleting ONE of the two would pass silently:\n  ' + drift.join('\n  '));

  // ── THE INVARIANT ITSELF — exactly ONE registered site targets #home.
  assert.deepEqual(HOME_WRITERS.map((e) => `#${e.n} ${e.file} ${e.owner}`),
    ['#1 js/nav.js the nav applyScreen home branch, guarded by resetScroll'],
    'the write authority for #home must have exactly ONE identity. This is the TEXTUAL bound — '
    + 'NOT a claim that no other MOVER exists (browser scroll anchoring is a live non-textual '
    + 'mover with no text to derive; §8 R-writer-enum).');
});

test('M1WRITERSET scope — the four scoping clauses are part of the cell, not preamble', () => {
  // S1 — the vendored tree is excluded WITH ITS REASON, and the reason is pinned elsewhere by
  // file identity rather than restated here.
  assert.ok(Object.keys(EXCLUDED_DIRS).includes('js/vendor'),
    'js/vendor/** must be excluded (a minified vendored console would make this gate red on arrival)');
  assert.match(EXCLUDED_DIRS['js/vendor'], /vendor-exclusion-pin/,
    'the exclusion must POINT AT the identity pin rather than carry a second copy of the claim, '
    + 'which would drift');
  assert.ok(fs.existsSync(path.join(ROOT, 'test', 'vendor-exclusion-pin.test.js')),
    'the referenced identity pin must exist — a dangling reference is worse than no reference');
  assert.deepEqual(firstPartyFiles().filter((f) => f.startsWith('js/vendor')), [],
    'no vendored file may enter the derived set');

  // S1 — the non-source trees are unreachable BY CONSTRUCTION, asserted so it is a decision.
  for (const tree of NON_SOURCE_TREES) {
    assert.deepEqual(firstPartyFiles().filter((f) => f.startsWith(tree)), [],
      `${tree} is build output or an agent worktree and must never enter the derived set — a gate `
      + 'that globbed the android build COPY of js/ would double-count every entry');
  }

  // S2 — the horizontal class is REGISTERED, not pattern-excluded.
  for (const e of HORIZONTAL_CLASS) {
    assert.ok(fs.readFileSync(path.join(ROOT, e.file), 'utf8').includes(e.text),
      `the registered horizontal-axis site ${e.file} "${e.text}" no longer occurs — re-derive S2`);
  }

  // S3 — the window/document class is registered rather than dropped from the pattern.
  assert.ok(BASELINE.some((e) => e.file === 'js/app.js' && e.target === 'the document'),
    'window-targeted document scrolls must be REGISTERED, not dropped from the pattern — dropping '
    + '`scrollTo` is the cheap repair that blinds this gate');

  // S4 — the non-textual remainder is named, so the gate's silence cannot be read as coverage.
  assert.ok(NON_TEXTUAL_RESIDUALS.includes('browser scroll anchoring'),
    'the live non-textual mover must be named in the cell itself');

  // Every entry carries the three required fields; entry 1 is the one that CAN reach #home.
  for (const e of BASELINE) {
    for (const k of ['target', 'owner', 'why']) {
      assert.ok(e[k] && e[k].length > 3, `baseline entry #${e.n} is missing "${k}"`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// SELFTEST — proves the comparison CAN fail, without editing real source. Drives the same
// derivation against a synthetic file set, so it is a structural test of the comparison
// itself rather than a scan of any project text.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('M1WRITERSET selftest — the derivation sees an added writer, ignores a comment, and '
  + 'distinguishes a member call from a property key', () => {
  const derive = (src) => {
    const sites = [];
    const raw = src.split('\n');
    stripComments(src).split('\n').forEach((line, i) => {
      const seen = new Set();
      for (const [cls, re] of PATTERNS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) {
          const key = cls + ':' + m.index;
          if (seen.has(key)) continue;
          seen.add(key);
          sites.push({ cls, line: i + 1, text: (raw[i] || '').trim() });
        }
      }
    });
    return sites;
  };

  assert.deepEqual(derive("$('home').scrollTop = 0;").map((s) => s.cls), ['A'],
    'an element scrollTop assignment is class A');
  assert.deepEqual(derive('if (a === b.scrollTop) return;'), [],
    'a READ of scrollTop is not a writer — the gate must not report it');
  assert.deepEqual(derive('// the retired scrollTo(0,1) seating hack'), [],
    'a comment that MENTIONS a retired scroll call is not a writer (js/nav.js carries exactly '
    + 'such a mention, and deriving it would put a phantom entry in the baseline)');
  assert.deepEqual(derive('const o = { scrollTo: (y) => { m.scrollTop = y; } };').map((s) => s.cls), ['A'],
    '`scrollTo:` is a property KEY, not a call site — it must not be double-counted in class B');
  assert.deepEqual(derive('el.scrollIntoView({ block: "start" });').map((s) => s.cls), ['B'],
    'scrollIntoView is a class-B call site — the class the next adversarial pass targets, and the '
    + 'one a narrowed pattern would silently drop');
  assert.deepEqual(derive('window.scrollTo = wrapped;').map((s) => s.cls), ['D'],
    'an assignment TO the scroll API is class D — shipped code replaces window.scrollTo at '
    + 'runtime, and a gate that inventories an API the codebase replaces must say so');
  assert.deepEqual(derive("const s = 'no // comment here'; el.scrollTop = 1;").map((s) => s.cls), ['A'],
    'a `//` inside a string literal must not truncate the line and hide a real writer');

  // The unregistered-site direction: a NEW writer against a baseline that does not carry it.
  const injected = { cls: 'A', file: 'js/app.js', line: 999, text: "$('home').scrollTop = 500;" };
  assert.deepEqual(matchOf(injected), [],
    'an injected second #home writer must match NO baseline entry — this is the comparison the '
    + 'registered additive mutant exercises against real source');
});

module.exports = { deriveSites, firstPartyFiles, stripComments, BASELINE };
