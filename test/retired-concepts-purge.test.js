// RETIRED-CONCEPTS PURGE — three source-scan gates over first-party `js/`, each holding a
// claim that a future edit could otherwise falsify silently.
//
// WHY THIS FILE EXISTS. PLAN-swipe-declone-stage2-subtraction.md §3/§10 registers three
// claims of the form "no first-party source produces X". Two of them are load-bearing for
// deletions that ship in the same commit — §5's orphan-recovery collapse is admissible ONLY
// because no first-party script can arm the branch it removes — and a claim of that shape,
// enforced by memory, is vigilance. The third (`NOCLB`) closes coverage-audit finding M3:
// its purge gate was deleted along with `test/swipe-stage6d.test.js` while its subject stayed
// live, so a retired runtime byproduct has been unguarded since that stage.
//
// THE THREE CLAIMS, and the rule each one gets. The tokens are three DIFFERENT KINDS of
// thing, so a single blanket match rule would be wrong for two of them (plan §13 decision 7):
//
//   NOGHOSTCLASS  `nav-ghost` is a CSS CLASS      ⇒ resolve the class WRITE. A selector query
//                 naming the class is a READ and must not match: reads are what the pass
//                 deletes, and a gate that reddened on one would redden on correct code.
//   NOOWNEDPANE   `owned-pane` is a TAG VALUE     ⇒ match a STRING LITERAL, in any of the
//                 three quoting forms, whose content is exactly the tag. The literal has to
//                 exist somewhere for a mover to carry that value, so this catches both the
//                 inline form and the named-module-constant form. A bare occurrence in a
//                 comment or inside an identifier must NOT match.
//   NOCLB         `clobbered` / `sourceWasClobbered` are IDENTIFIERS ⇒ match a CODE-POSITION
//                 occurrence, outside comments and outside string literals. A comment
//                 explaining why the concept was retired is exactly the record that SHOULD
//                 survive (plan §13 decision 12), so it must not redden the gate.
//
// SCOPE. Every `.js` file under `js/`, excluding the vendored third-party bundle
// (`js/vendor/`) — the same scope and the same exclusion as test/no-view-clone-gate.test.js.
//
// SELF-COLLISION. The registered token literals below are DATA the scan reads, never text the
// scan walks: the scan's scope is `js/` and this gate lives in `test/`, so it cannot match
// itself under any of the three rules. That is a property of the SCOPE, not of an exclusion
// clause — there is no self-exclusion here, because none is owed (plan §13 decision 10). ⛔ If
// the scan scope is ever widened beyond `js/`, an exclusion becomes owed and must land with a
// fire drill of its own.
//
// ⛔ WHAT DOES THE WORK IS THE FIRE DRILL, and it is an acceptance condition rather than a
// nicety. Every one of the three rules is driven against a synthetic source and OBSERVED to
// fire — a positive control, plus a negative control for EVERY exclusion the rule states (plan
// §10). A rule stating two exclusions and drilled on one leaves the other where every specified
// control still passes. The pass/fail decision is taken from the collected site LIST, never
// from an exit code: this project has a recorded case of a counting idiom exiting nonzero while
// printing zero.
//
// ⛔ THE SCANNER'S OWN CHARACTERISTIC FAILURE IS SILENT, and the drill is specified to catch
// it. `NOOWNEDPANE` and `NOCLB` need comment stripping, which this codebase's gates have never
// needed before (test/no-view-clone-gate.test.js scans raw text). The failure mode is
// OVER-stripping: a `//` occurring INSIDE a string literal swallowing the rest of the line,
// which blinds the scan AFTER that point while both controls still pass, because a control
// appended to a clean file never sits behind the blind spot. So the fixture is specified, not
// left to the author: NOCLB's positive control is placed AFTER a line containing a string that
// itself contains `//`. The lexer is additionally driven against the real shipped sources, and
// its comment/code split is asserted on known text.
//
// HONEST LIMIT (the same one test/no-view-clone-gate.test.js's header already states, and the
// one plan §5 discloses). These prove TEXTUAL properties: no first-party script contains a
// class write / a tag literal / an identifier in code position that these resolution rules can
// see. A class name or a tag value assembled at runtime from fragments, or injected by a
// non-first-party surface, is outside every textual scan and is not claimed.
//
// WIRING. Runs in the normal `npm test` battery, therefore at pre-commit — same idiom as every
// other source-scan gate here. It is deliberately NOT added to `tools/mutation-sweep.mjs`'s
// `SOURCE_TEXT_GATES` exclusion list (plan §13 decision 9): that list is for gates that redden
// on mutations UNRELATED to their own subject, and these three fire only on a mutant carrying
// their own registered token. Excluding them would make their ADDITIVE mutants report UNCAUGHT.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');

// The registered tokens. One place, read by the scans below and by nothing else.
const GHOST_CLASS = 'nav-ghost';
const OWNED_TAG = 'owned-pane';
const CLB_IDENTIFIERS = ['clobbered', 'sourceWasClobbered'];

/** Every .js file under js/, excluding the vendored third-party bundle. */
function jsFiles() {
  const out = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'vendor') continue;
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.js')) out.push(p);
    }
  })(JS_DIR);
  return out;
}

// ── The lexer: one classification pass, three views ────────────────────────────────────
//
// Returns a mask string of the same length as `src`, one character per source character:
//   'c' code   'm' comment   's' string/regex CONTENT   'q' a quote/delimiter character
//
// Same length as the source deliberately: every view below is built by replacing masked
// characters with a space (newlines preserved), so a reported line number is the REAL line
// number and every offset survives. A stripper that deleted characters would report line
// numbers that drift further from the truth the more it stripped.

// A `/` begins a REGEX rather than a division when the previous significant token cannot end
// an expression. Both the punctuation set and the keyword set are needed: `return /re/` is a
// regex while `a / b` is a division, and only the preceding WORD distinguishes them.
const REGEX_PREFIX_CHARS = '(,=:[!&|?{};+-*%~^<>';
const REGEX_PREFIX_WORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new',
  'delete', 'void', 'case', 'do', 'else', 'yield', 'await', 'throw']);

function lex(src) {
  const mask = new Array(src.length).fill('c');
  let lastChar = '';
  let lastWord = '';
  let i = 0;
  const regexCanStart = () => (lastChar === ''
    || REGEX_PREFIX_CHARS.includes(lastChar)
    || (/[A-Za-z_$]/.test(lastChar) && REGEX_PREFIX_WORDS.has(lastWord)));
  const readWordBefore = (at) => {
    let k = at;
    while (k >= 0 && /[\w$]/.test(src[k])) k--;
    return src.slice(k + 1, at + 1);
  };
  while (i < src.length) {
    const ch = src[i];
    const nx = src[i + 1];
    if (ch === '/' && nx === '/') {
      while (i < src.length && src[i] !== '\n') { mask[i] = 'm'; i++; }
      continue;
    }
    if (ch === '/' && nx === '*') {
      mask[i] = 'm'; mask[i + 1] = 'm'; i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { mask[i] = 'm'; i++; }
      if (i < src.length) { mask[i] = 'm'; mask[i + 1] = 'm'; i += 2; }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      mask[i] = 'q'; i++;
      while (i < src.length) {
        if (src[i] === '\\') { mask[i] = 's'; if (i + 1 < src.length) mask[i + 1] = 's'; i += 2; continue; }
        if (src[i] === ch) { mask[i] = 'q'; i++; break; }
        mask[i] = 's'; i++;
      }
      lastChar = ch; lastWord = ''; continue;
    }
    if (ch === '/' && regexCanStart()) {
      // A regex literal. Bail on a newline rather than consuming the rest of the file: an
      // unterminated regex means the heuristic misfired, and swallowing everything after it
      // is the blinding failure this scanner must not have.
      let k = i + 1, inClass = false, closed = false;
      while (k < src.length && src[k] !== '\n') {
        if (src[k] === '\\') { k += 2; continue; }
        if (src[k] === '[') inClass = true;
        else if (src[k] === ']') inClass = false;
        else if (src[k] === '/' && !inClass) { closed = true; break; }
        k++;
      }
      if (closed) {
        mask[i] = 'q';
        for (let j = i + 1; j < k; j++) mask[j] = 's';
        mask[k] = 'q';
        i = k + 1; lastChar = '/'; lastWord = ''; continue;
      }
      // not a regex after all — fall through and treat as an ordinary code character
    }
    if (!/\s/.test(ch)) {
      lastChar = ch;
      lastWord = /[\w$]/.test(ch) ? readWordBefore(i) : '';
    }
    i++;
  }
  return mask.join('');
}

/** `src` with every character of the given mask kinds replaced by a space (newlines kept). */
function blank(src, mask, kinds) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '\n') { out += '\n'; continue; }
    out += kinds.includes(mask[i]) ? ' ' : src[i];
  }
  return out;
}

/** Comments removed; string literals (and their quotes) intact. */
const codeWithStrings = (src) => blank(src, lex(src), ['m']);
/** Comments AND string/regex contents removed; only code positions remain. */
const codeOnly = (src) => blank(src, lex(src), ['m', 's', 'q']);
/** ONLY the string/regex contents (everything else blanked) — the markup view. */
const stringsOnly = (src) => blank(src, lex(src), ['c', 'm', 'q']);

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

// ── NOGHOSTCLASS — no first-party script WRITES the retired ghost class ─────────────────
//
// A class WRITE is one of:
//   `X.className = V` / `X.className += V`
//   `X.classList.add(A)` / `.toggle(A)` / `.replace(A)`
//   `X.setAttribute('class', V)`
//   a `class="…"` / `class='…'` attribute inside a string or template literal (this codebase
//   builds most of its markup by string, so an HTML-string route is a real re-introduction
//   route, not a hypothetical one)
// `classList.remove(...)` is deliberately NOT a write site: removing a class cannot arm the
// branch the pass deletes, and matching a sweep would be the gate reddening on the very shape
// of correct code.
//
// The value is resolved TEXTUALLY: it matches if its own text contains the token, or if it is
// a bare identifier whose nearest PRECEDING `const`/`let`/`var` declaration's initialiser
// contains it (one level of chasing — the same conservative approximation, and the same stated
// limit, as test/no-view-clone-gate.test.js's receiver resolution).

const WRITE_CALLS = ['.classList.add(', '.classList.toggle(', '.classList.replace('];

/** The index just past the `)` matching the `(` at `openIdx`. */
function matchingCloseIndex(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') { depth--; if (depth === 0) return i + 1; }
    else if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
    }
  }
  return -1;
}

/** Every class-WRITE site in a comment-stripped source. `{ line, kind, value }`. */
function classWriteSites(code) {
  const sites = [];
  for (const call of WRITE_CALLS) {
    let at = 0;
    for (;;) {
      const idx = code.indexOf(call, at);
      if (idx < 0) break;
      const open = idx + call.length - 1;
      const close = matchingCloseIndex(code, open);
      sites.push({ line: lineOf(code, idx), kind: call.slice(1, -1),
        value: close < 0 ? code.slice(open) : code.slice(open + 1, close - 1) });
      at = idx + call.length;
    }
  }
  const assignRe = /\.className\s*\+?=\s*([^;\n]*)/g;
  let m;
  while ((m = assignRe.exec(code))) {
    sites.push({ line: lineOf(code, m.index), kind: 'className=', value: m[1] });
  }
  const setAttrRe = /\.setAttribute\(\s*['"`](class|className)['"`]\s*,([^)]*)\)/g;
  while ((m = setAttrRe.exec(code))) {
    sites.push({ line: lineOf(code, m.index), kind: "setAttribute('class')", value: m[2] });
  }
  return sites;
}

/** Resolve a write's value text to "carries the token" / "does not", chasing one bare ident. */
function valueCarries(code, value, atIndex, token) {
  if (value.includes(token)) return true;
  const bare = value.trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(bare)) return false;
  const declRe = new RegExp('(?:const|let|var)\\s+' + bare.replace(/\$/g, '\\$') + '\\s*=\\s*([^;\\n]+)', 'g');
  let m, last = null;
  while ((m = declRe.exec(code))) { if (m.index < atIndex) last = m[1]; }
  return last != null && last.includes(token);
}

function scanGhostClassWrites(rel, src) {
  const code = codeWithStrings(src);
  const offenders = [];
  for (const site of classWriteSites(code)) {
    const at = code.indexOf(site.value);
    if (valueCarries(code, site.value, at < 0 ? 0 : at, GHOST_CLASS)) {
      offenders.push(`${rel}:${site.line} ${site.kind} writes "${GHOST_CLASS}"`);
    }
  }
  // The markup route: a `class` attribute inside a string/template literal.
  const strings = stringsOnly(src);
  const attrRe = /class\s*=\s*["']([^"']*)["']/g;
  let m;
  while ((m = attrRe.exec(strings))) {
    if (m[1].split(/\s+/).includes(GHOST_CLASS)) {
      offenders.push(`${rel}:${lineOf(strings, m.index)} markup class attribute writes "${GHOST_CLASS}"`);
    }
  }
  return offenders;
}

// ── NOOWNEDPANE — the retired ownership tag occurs nowhere as a STRING VALUE ─────────────

function scanOwnedPaneLiterals(rel, src) {
  const code = codeWithStrings(src);
  const offenders = [];
  for (const q of ["'", '"', '`']) {
    const needle = q + OWNED_TAG + q;
    let at = 0;
    for (;;) {
      const idx = code.indexOf(needle, at);
      if (idx < 0) break;
      offenders.push(`${rel}:${lineOf(code, idx)} string literal ${needle}`);
      at = idx + needle.length;
    }
  }
  return offenders;
}

// ── NOCLB — the two retired clobber identifiers occur nowhere IN CODE POSITION ───────────

function scanClbIdentifiers(rel, src) {
  const code = codeOnly(src);
  const offenders = [];
  for (const id of CLB_IDENTIFIERS) {
    const re = new RegExp('(?<![\\w$])' + id + '(?![\\w$])', 'g');
    let m;
    while ((m = re.exec(code))) {
      offenders.push(`${rel}:${lineOf(code, m.index)} identifier \`${id}\` in code position`);
    }
  }
  return offenders;
}

/** Run all three scans over the real shipped sources. */
function scanRepo(scan) {
  const found = [];
  for (const file of jsFiles()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    found.push(...scan(rel, fs.readFileSync(file, 'utf8')));
  }
  return found;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// THE THREE GATES
// ════════════════════════════════════════════════════════════════════════════════════════

test('NOGHOSTCLASS — no first-party script writes the retired ghost class', () => {
  const offenders = scanRepo(scanGhostClassWrites);
  assert.deepEqual(offenders, [],
    `a first-party script writes the retired \`${GHOST_CLASS}\` class. Its producer was deleted `
    + 'at declone stage 10, and the subtraction pass removes the last reader — including the '
    + 'recovery-entry disjunct that ONLY this class could arm. Re-introducing a writer re-arms a '
    + 'branch that no longer exists, and the collapsed recovery would then run with '
    + `resetScroll:false on a path that used to default to true: ${JSON.stringify(offenders)}`);
});

test('NOOWNEDPANE — the retired ownership tag occurs nowhere as a string value under js/', () => {
  const offenders = scanRepo(scanOwnedPaneLiterals);
  assert.deepEqual(offenders, [],
    `the retired \`${OWNED_TAG}\` ownership tag still exists as a string value. No transition `
    + 'constructs a pane, and the subtraction pass removes every teardown path that filtered on '
    + 'this tag — a mover carrying it again would have an ownership kind with no disposer. This '
    + 'is the TEXTUAL belt over the behavioural brace: NOGHOSTATALL '
    + '(test/swipe-declone-stage2-construction.test.js) already asserts no CONSTRUCTED mover '
    + `carries the tag across all eight structural cases: ${JSON.stringify(offenders)}`);
});

test('NOCLB — the retired clobber identifiers occur nowhere in code position under js/', () => {
  const offenders = scanRepo(scanClbIdentifiers);
  assert.deepEqual(offenders, [],
    'a retired clobber identifier is back in code position. It named a runtime byproduct the '
    + 'declone retired: no transition overwrites its source, so there is nothing to record as '
    + 'clobbered and nothing may branch on it. This gate replaces the one deleted with '
    + `test/swipe-stage6d.test.js while its subject stayed live (coverage-audit M3): ${JSON.stringify(offenders)}`);
});

// ════════════════════════════════════════════════════════════════════════════════════════
// THE FIRE DRILL — every rule DRIVEN and observed to fire, positive and negative
// ════════════════════════════════════════════════════════════════════════════════════════
//
// Synthetic sources only: a scan that reads free text for a pattern which also appears in the
// prose ABOUT that pattern poisons itself, so nothing here reads a real repo file for its
// positive control. The exceptions are the two lexer drills at the end, whose whole subject IS
// the real source.

test('NOGHOSTCLASS fire drill — POSITIVE: a class write carrying the token reddens the gate', () => {
  const src = [
    "function bogus(doc) {",
    "  const w = doc.createElement('div');",
    "  w.className = 'nav-ghost';",
    "  return w;",
    "}",
  ].join('\n');
  const found = scanGhostClassWrites('fixture.js', src);
  assert.equal(found.length, 1, `an injected className write must be reported; got ${JSON.stringify(found)}`);
  assert.match(found[0], /fixture\.js:3 className=/, 'the report must name the file and the real line');
});

test('NOGHOSTCLASS fire drill — POSITIVE: classList.add and a markup class attribute both redden', () => {
  const viaList = "function a(el) { el.classList.add('nav-ghost'); }";
  const viaMarkup = "function b(host) { host.innerHTML = '<div class=\"nav-ghost spent\"></div>'; }";
  assert.equal(scanGhostClassWrites('f.js', viaList).length, 1, 'classList.add must be a write site');
  assert.equal(scanGhostClassWrites('f.js', viaMarkup).length, 1,
    'an HTML-string class attribute must be a write site — this codebase builds most markup by string');
});

test('NOGHOSTCLASS fire drill — POSITIVE: a class write whose value is a named constant reddens', () => {
  const src = [
    "const GHOST = 'nav-ghost';",
    "function bogus(el) { el.classList.add(GHOST); }",
  ].join('\n');
  const found = scanGhostClassWrites('fixture.js', src);
  assert.equal(found.length, 1,
    `a write whose value is a bare identifier must be chased to its declaration; got ${JSON.stringify(found)}`);
});

test('NOGHOSTCLASS fire drill — NEGATIVE: a selector QUERY naming the class does not redden', () => {
  // The stated exclusion. A read is exactly what the pass deletes; a gate that reddened here
  // would redden on correct code at HEAD and be switched off.
  const src = [
    "function sweep(doc) {",
    "  doc.querySelectorAll('.nav-ghost').forEach((n) => n.remove());",
    "  return doc.querySelector('.nav-ghost.spent');",
    "}",
    "function unsweep(el) { el.classList.remove('nav-ghost'); }",
  ].join('\n');
  assert.deepEqual(scanGhostClassWrites('fixture.js', src), [],
    'a selector query (and a classList.remove) is a READ, not a class write — it cannot arm the branch');
});

test('NOOWNEDPANE fire drill — POSITIVE: the tag as a literal in EACH of the three quoting forms reddens', () => {
  for (const q of ["'", '"', '`']) {
    const src = `function bogus(m) { return m.own === ${q}owned-pane${q}; }`;
    const found = scanOwnedPaneLiterals('fixture.js', src);
    assert.equal(found.length, 1,
      `the ${q} quoting form must be matched — the named-constant re-introduction shape uses it too; `
      + `got ${JSON.stringify(found)}`);
  }
});

test('NOOWNEDPANE fire drill — NEGATIVE (1 of 2): the bare token in a COMMENT does not redden', () => {
  const src = [
    '// The `owned-pane` ownership kind was retired by the subtraction pass; owned-pane movers',
    '/* no longer exist, and this owned-pane tombstone must survive the gate. */',
    'function ok() { return 1; }',
  ].join('\n');
  assert.deepEqual(scanOwnedPaneLiterals('fixture.js', src), [],
    'a comment naming the retired tag — including in backticks, which is this codebase\'s prose '
    + 'convention — is the record that SHOULD survive and must not redden the gate');
});

test('NOOWNEDPANE fire drill — NEGATIVE (2 of 2): the token inside an IDENTIFIER does not redden', () => {
  const src = 'let ownedPaneCount = 0;\nfunction bump() { ownedPaneCount++; }\n';
  assert.deepEqual(scanOwnedPaneLiterals('fixture.js', src), [],
    'the tag is a string VALUE; an identifier that merely reads like it carries no tag');
});

// NOCLB's positive control is placed AFTER a line containing a string that itself contains
// `//` — the specified fixture (plan §10), because the scanner's characteristic failure is
// OVER-stripping: a `//` inside a string swallowing the rest of the line blinds everything
// after it while a control appended to a clean file still passes.
test('NOCLB fire drill — POSITIVE: an identifier declaration in code position reddens, BEHIND a string containing "//"', () => {
  const src = [
    "const base = 'https://example.test/api';",
    "const alt = \"http://example.test/other\";",
    'function bogus() {',
    '  let clobbered = false;',
    '  return clobbered;',
    '}',
  ].join('\n');
  const found = scanClbIdentifiers('fixture.js', src);
  assert.equal(found.length, 2,
    'the declaration AND the read must both be reported, from BEHIND two URL strings containing '
    + `"//" — an over-stripping comment scanner reports zero here and passes every other control; got ${JSON.stringify(found)}`);
  assert.match(found[0], /fixture\.js:4/, 'the report must name the real line, not a drifted one');
});

test('NOCLB fire drill — POSITIVE: a READ of the second identifier reddens (a declaration-only scan would miss it)', () => {
  const src = 'function bogus(c) { if (c.sourceWasClobbered) return 1; return 0; }';
  const found = scanClbIdentifiers('fixture.js', src);
  assert.equal(found.length, 1, `a bare read must redden; got ${JSON.stringify(found)}`);
  assert.match(found[0], /sourceWasClobbered/, 'the report must name which identifier');
});

test('NOCLB fire drill — NEGATIVE (1 of 2): the identifier in a COMMENT does not redden', () => {
  const src = [
    '// `clobbered` — DELETED (declone stage 2). It recorded whether the destination render',
    '// overwrote the source host; no transition overwrites its source, so sourceWasClobbered',
    '/* and clobbered both have no subject left. */',
    'function ok() { return 1; }',
  ].join('\n');
  assert.deepEqual(scanClbIdentifiers('fixture.js', src), [],
    'a tombstone naming the retired identifier, its authority and why it is gone is exactly the '
    + 'record the code-position rule exists to protect (plan §13 decision 12)');
});

test('NOCLB fire drill — NEGATIVE (2 of 2): the identifier inside a STRING LITERAL does not redden', () => {
  const src = "const msg = 'clobbered';\nconst t = `sourceWasClobbered`;\nfunction ok() { return msg + t; }\n";
  assert.deepEqual(scanClbIdentifiers('fixture.js', src), [],
    'a string containing the identifier is not a code-position occurrence');
});

// ── The lexer's own drills. Its failure is silent, so it is exercised directly ───────────

test('lexer drill — a "//" inside a string does NOT start a comment (the over-stripping failure)', () => {
  const src = "const u = 'a//b';\nlet clobbered = 1;\n";
  assert.equal(scanClbIdentifiers('f.js', src).length, 1,
    'the identifier on the NEXT line must still be visible — an over-stripping lexer sees nothing after the string');
  const code = codeOnly(src);
  assert.ok(code.includes('const u ='), 'the code before the string survives');
  assert.ok(!code.includes('a//b'), 'the string CONTENT is blanked from the code-only view');
});

test('lexer drill — a regex literal containing a quote does not open a string', () => {
  const src = "const re = /['\"]/g;\nlet clobbered = 2;\n";
  assert.equal(scanClbIdentifiers('f.js', src).length, 1,
    'a regex character class containing quotes must not swallow the rest of the file as a string');
});

test('lexer drill — division is not mistaken for a regex', () => {
  const src = 'const r = (a) / (b);\nlet clobbered = 3;\n';
  assert.equal(scanClbIdentifiers('f.js', src).length, 1,
    'a `/` after a closing paren is division; treating it as a regex would blind the scan');
});

test('lexer drill — `return /re/` IS a regex (the keyword case the punctuation rule alone misses)', () => {
  const src = "function f(s) { return /['\"]x/.test(s); }\nlet clobbered = 4;\n";
  assert.equal(scanClbIdentifiers('f.js', src).length, 1,
    'a regex directly after `return` must be recognised, or its quotes open a phantom string');
});

test('lexer drill — the comment/code split is correct on the REAL shipped nav.js', () => {
  const src = fs.readFileSync(path.join(JS_DIR, 'nav.js'), 'utf8');
  const code = codeOnly(src);
  assert.ok(code.includes('function resetSwipeStyles'),
    'real code must survive the strip — a lexer that blanked it would make every scan vacuous');
  assert.ok(!code.includes('erratic after a while'),
    'real COMMENT prose must not survive into the code-only view');
  assert.ok(!/['"`]/.test(code.replace(/\s/g, '')),
    'no quote character may survive into the code-only view — one that did would mean an '
    + 'unbalanced string region and a blind spot after it');
});

test('lexer drill — every shipped js file lexes to a balanced view (no unterminated region)', () => {
  const bad = [];
  for (const file of jsFiles()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    const code = codeOnly(src);
    if (code.length !== src.length) bad.push(`${rel}: length drifted`);
    // A quote surviving into the code-only view means a string region was never entered or
    // never closed — the blind-spot signature.
    if (/['"`]/.test(code)) bad.push(`${rel}: a quote survived the strip at line ${lineOf(code, code.search(/['"`]/))}`);
    // A `//` surviving into the code-only view means a line comment was never recognised.
    if (code.includes('//')) bad.push(`${rel}: an unrecognised "//" survived at line ${lineOf(code, code.indexOf('//'))}`);
  }
  assert.deepEqual(bad, [],
    'the lexer left an unbalanced region in a shipped source, so every scan above has a silent '
    + `blind spot after that point: ${JSON.stringify(bad)}`);
});

module.exports = { jsFiles, lex, codeWithStrings, codeOnly, stringsOnly,
  classWriteSites, scanGhostClassWrites, scanOwnedPaneLiterals, scanClbIdentifiers,
  GHOST_CLASS, OWNED_TAG, CLB_IDENTIFIERS };
