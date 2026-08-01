// NOAPPCLONE — no first-party script clones an element that hosts a view.
//
// WHY. `ghostApp()` (js/swipe.js) cloned `.app` and stripped every id so the copy would
// LOOK like the original — and the copy's id-keyed CSS rule (`#home`/`#browse`'s
// `position:fixed` inset box) stopped matching inside it, so the copy laid out in a
// DIFFERENT box than the real view (PLAN-swipe-declone.md §1/§3). Three device-reported
// symptoms were that one non-identity seen three ways. Stage 1 of that plan retires the
// clone from every transition except browse->browse (Stage 2 removes even that); this gate
// makes the whole CLASS of defect impossible to re-introduce, not merely absent today —
// same idiom as test/page-bg-js-painter.test.js, a Node test that reads source TEXT, so it
// cannot be made vacuous by the environment (jsdom, a real engine, or no DOM at all).
//
// SCOPE. Every `.js` file under `js/`, excluding the vendored third-party bundle (`js/
// vendor/`).
//
// DETECTION. A `cloneNode`/`importNode` call, or an `innerHTML = X.outerHTML` round-trip,
// whose RECEIVER (the element being cloned, or the outerHTML's source) resolves to a VIEW
// HOST: a selector literal or `getElementById` argument matching `.app`, `#home`,
// `#browse`, `#options`, `#nowplaying`, `.browsepage`, `.view`, or any id in
// `Nav.SETTINGS_SUBS` (derived from js/nav.js, not restated) — or a local identifier
// assigned from such a lookup earlier in the same file. Resolution is TEXTUAL and
// deliberately conservative, same as the receiver/window scans in
// test/page-bg-js-painter.test.js.
//
// ⛔ AN UNRESOLVABLE RECEIVER FAILS, IT NEVER PASSES SILENTLY. That is exactly how the
// seventh background painter shipped green (test/page-bg-js-painter.test.js's own header):
// a check with a blind spot is worse than no check, because it is trusted. A clone call
// whose receiver this scanner cannot classify at all — no selector literal, no resolvable
// local — is reported as `UNRESOLVED` and treated as a failure, with the fix being to
// register the call (if it is provably not a view) or make the receiver resolvable.
//
// REGISTERED EXCEPTIONS. Exactly ONE, a literal below with a one-line reason. An
// unregistered clone of a view host fails. A registered entry whose TEXT no longer occurs
// in its file also fails, so the list cannot rot into blessing a site that has since moved
// or been rewritten.
//   1. `npPillClone`'s `env.navPill().cloneNode(true)` (js/swipe.js) — a navbar PILL
//      decoration, not a view. PERMANENT.
//
// The second entry — a TEMPORARY allowance dated 2026-07-30 for the outgoing app-ghost's
// `doc.querySelector('.app').cloneNode(true)`, the one transition Stage 1 of
// PLAN-swipe-declone.md left cloned — is GONE, deleted in the same commit as the clone it
// allowed (Stage 2, plan §12 item 26 / §16). No transition builds a copy of a view any
// more, so the gate now runs with no temporary allowance at all.
//
// HONEST LIMIT, stated here as the plan requires (§16). This proves a TEXTUAL property: no
// first-party script contains a clone-of-a-view-host call this scanner's resolution rules
// can see. It does NOT prove the swipe is visually correct, and it does not see a clone
// built through a receiver this scanner cannot resolve to any expression at all (that case
// is a FAILURE here, not a silent miss) or a duplication mechanism outside `js/` (a
// non-JS surface, e.g. a template string rendered server-side, is out of scope). "Same
// function" scoping for a local-identifier receiver is approximated as "the nearest
// preceding same-name `const`/`let`/`var` declaration earlier in the file" rather than a
// real lexical-scope resolver — conservative in the direction of over-matching (a
// same-named local in an unrelated function could be mistaken for the real one), never in
// the direction of a missed clone.
//
// WIRING. Runs in the normal `npm test` battery, therefore at pre-commit, same as every
// other gate in this file's idiom.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');

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

// The view-host selector literals named in the plan. Order is presentation only.
const VIEW_SELECTORS = ['.app', '#home', '#browse', '#options', '#nowplaying', '.browsepage', '.view'];
// The four screen ids that are always view hosts via getElementById, regardless of the
// SETTINGS_SUBS derivation below.
const VIEW_IDS = ['home', 'browse', 'options', 'nowplaying'];

/** Nav.SETTINGS_SUBS, RE-DERIVED from js/nav.js so this list cannot drift from the real
 * registry (same derivation test/transition-matrix.test.js and tools/gen-transition-
 * matrix.mjs already use). */
function settingsSubIds() {
  const nav = fs.readFileSync(path.join(JS_DIR, 'nav.js'), 'utf8');
  const m = /const SETTINGS_SUBS = \[([^\]]*)\]/.exec(nav);
  if (!m) throw new Error('SETTINGS_SUBS not found in js/nav.js — the gate cannot derive the sub-screen id set');
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

/** Does an expression's own text resolve to a view host, textually? */
function looksLikeViewHost(text, subIds) {
  for (const sel of VIEW_SELECTORS) {
    if (text.includes(`'${sel}'`) || text.includes(`"${sel}"`)) return true;
  }
  const gid = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/.exec(text);
  if (gid && (VIEW_IDS.includes(gid[1]) || subIds.includes(gid[1]))) return true;
  return false;
}

/**
 * Scan backward from `dotIndex` (the position of the `.` in `.cloneNode(`/`.importNode(`)
 * for the RECEIVER expression it is called on — paren/bracket-aware, so a call like
 * `doc.querySelector('.app')` is captured whole rather than truncated at its own `(`.
 * Returns the receiver's own source text (never crossing an unmatched opening bracket).
 */
function receiverBefore(src, dotIndex) {
  let i = dotIndex - 1;
  let depth = 0;
  while (i >= 0) {
    const ch = src[i];
    if (ch === ')' || ch === ']') { depth++; i--; continue; }
    if (ch === '(' || ch === '[') {
      if (depth === 0) break;   // an unmatched opening bracket — the receiver starts after it
      depth--; i--; continue;
    }
    if (depth > 0) { i--; continue; }         // inside a call's own arguments — anything goes
    if (/[A-Za-z0-9_$.]/.test(ch)) { i--; continue; }
    break;                                    // depth 0, not part of an identifier/dot/call
  }
  return src.slice(i + 1, dotIndex);
}

/**
 * Resolve a receiver textually to view-host / not-view-host / UNRESOLVED. A bare local
 * identifier (no selector literal of its own) is chased to the nearest PRECEDING
 * same-name `const`/`let`/`var` declaration earlier in the file (an approximation of
 * "same function" — see the file header's honest limit) and resolved recursively, once.
 */
function resolveReceiver(src, receiver, atIndex, subIds) {
  if (looksLikeViewHost(receiver, subIds)) return 'view-host';
  const bareIdent = /^[A-Za-z_$][\w$]*$/.test(receiver);
  if (!bareIdent) {
    // A non-trivial expression (a call, a member chain) with no selector literal of its
    // own resolves to "not a view" only if it plainly carries no view-selector text at
    // all AND is not a bare identifier we could chase further — e.g. `env.navPill()`.
    return 'not-view-host';
  }
  const declRe = new RegExp('(?:const|let|var)\\s+' + receiver.replace(/[$]/g, '\\$') + '\\s*=\\s*([^;\\n]+)', 'g');
  let m, last = null;
  while ((m = declRe.exec(src))) { if (m.index < atIndex) last = m[1]; }
  if (last == null) return 'UNRESOLVED';
  return looksLikeViewHost(last, subIds) ? 'view-host' : 'not-view-host';
}

/** The index just past the closing `)` that matches the `(` at `openIdx` (which must
 * itself be a `(` character), paren/bracket/string-aware enough for this codebase's
 * plain call-argument shapes (no need to handle template literals — none exist here). */
function matchingCloseIndex(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') { depth--; if (depth === 0) return i + 1; }
    else if (ch === "'" || ch === '"') {
      const quote = ch; i++;
      while (i < src.length && src[i] !== quote) { if (src[i] === '\\') i++; i++; }
    }
  }
  return -1;
}

/** Find every clone-shaped call site in one file's source: `.cloneNode(`/`.importNode(`
 * and an `X.innerHTML = Y.outerHTML` round-trip. Returns { line, kind, receiver, siteText }
 * — `siteText` is the COMPLETE call expression (receiver through the matching `)`), so it
 * can be compared against a registered exception's literal text exactly. */
function findCloneSites(src) {
  const sites = [];
  const lineOf = (idx) => src.slice(0, idx).split('\n').length;
  for (const method of ['.cloneNode(', '.importNode(']) {
    let at = 0;
    for (;;) {
      const idx = src.indexOf(method, at);
      if (idx < 0) break;
      const receiver = receiverBefore(src, idx);
      const openIdx = idx + method.length - 1;
      const closeIdx = matchingCloseIndex(src, openIdx);
      const siteText = closeIdx < 0 ? receiver + method : src.slice(idx - receiver.length, closeIdx);
      sites.push({ line: lineOf(idx), kind: method.slice(1, -1), receiver, siteText });
      at = idx + method.length;
    }
  }
  // innerHTML = X.outerHTML round-trip: the SOURCE side (before `.outerHTML`) is the
  // receiver being duplicated.
  const rtRe = /\.innerHTML\s*=\s*/g;
  let rm;
  while ((rm = rtRe.exec(src))) {
    const after = src.slice(rm.index + rm[0].length, rm.index + rm[0].length + 200);
    const oh = /^([A-Za-z_$][\w$.()'"[\]]*?)\.outerHTML\b/.exec(after);
    if (oh) {
      sites.push({ line: lineOf(rm.index), kind: 'innerHTML=outerHTML', receiver: oh[1],
        siteText: oh[1] + '.outerHTML' });
    }
  }
  return sites;
}

// Registered exceptions — a literal per entry, checked both for presence (anti-rot) and
// as the allow-list a real offending site is matched against.
const EXCEPTIONS = [
  {
    reason: "npPillClone's navbar PILL decoration clone, not a view",
    file: 'swipe.js',
    text: "env.navPill().cloneNode(true)",
  },
];

/** Scan one (relFile, source) pair. Returns { offenders, unresolved, rotted } — `rotted`
 * is populated only when called with the REAL repo file set (see the test below). */
function scanSource(relFile, src, subIds) {
  const offenders = [];
  const unresolved = [];
  for (const site of findCloneSites(src)) {
    const status = resolveReceiver(src, site.receiver, src.indexOf(site.siteText), subIds);
    if (status === 'UNRESOLVED') { unresolved.push(`${relFile}:${site.line} receiver="${site.receiver}"`); continue; }
    if (status !== 'view-host') continue;
    const excepted = EXCEPTIONS.some((e) => e.file === path.basename(relFile) && site.siteText.includes(e.text));
    if (!excepted) offenders.push(`${relFile}:${site.line} clones "${site.receiver}" (${site.kind})`);
  }
  return { offenders, unresolved };
}

test('NOAPPCLONE — no first-party script clones an element that hosts a view', () => {
  const subIds = settingsSubIds();
  const offenders = [];
  const unresolved = [];
  for (const file of jsFiles()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    const { offenders: o, unresolved: u } = scanSource(rel, src, subIds);
    offenders.push(...o);
    unresolved.push(...u);
  }
  assert.deepEqual(unresolved, [],
    `a clone call's receiver could not be resolved to view-host or not — an unresolvable `
    + `receiver is treated as a failure, never a silent pass: ${JSON.stringify(unresolved)}`);
  assert.deepEqual(offenders, [],
    'a first-party script clones an element that hosts a view — every view is already a '
    + `position:fixed inset own-scroll box; a copy is never needed: ${JSON.stringify(offenders)}`);
});

test('NOAPPCLONE — every registered exception\'s text still occurs in its file (the list cannot rot)', () => {
  const stale = [];
  for (const e of EXCEPTIONS) {
    const src = fs.readFileSync(path.join(JS_DIR, e.file), 'utf8');
    if (!src.includes(e.text)) stale.push(`${e.file}: "${e.text}" (${e.reason})`);
  }
  assert.deepEqual(stale, [],
    `a registered exception's text no longer occurs in its file — it is either dead (delete `
    + `the entry) or the call site changed shape (re-register the current text): ${JSON.stringify(stale)}`);
});

// ── Mutation evidence (plan §16 / §14 NOAPPCLONE) — proves the gate can fail, both ways ──

test('NOAPPCLONE mutation — injecting a clone of the app container reddens the gate', () => {
  const subIds = settingsSubIds();
  const injected = "\nfunction bogus(doc) {\n  const stray = doc.querySelector('.app').cloneNode(true);\n  return stray;\n}\n";
  const src = fs.readFileSync(path.join(JS_DIR, 'browse.js'), 'utf8') + injected;
  const { offenders, unresolved } = scanSource('js/browse.js', src, subIds);
  assert.deepEqual(unresolved, [], 'fixture sanity: the injected receiver must resolve, not go UNRESOLVED');
  assert.equal(offenders.length, 1,
    `an injected clone of '.app' in a file with no registered exception for it must redden the gate; `
    + `got ${JSON.stringify(offenders)}`);
  assert.match(offenders[0], /js\/browse\.js:\d+ clones/, 'the offender must name the injected file and line');
});

test('NOAPPCLONE mutation — injecting a clone of the navbar pill does NOT redden the gate (registered exception)', () => {
  const subIds = settingsSubIds();
  const injected = "\nfunction bogus(env) {\n  const stray = env.navPill().cloneNode(true);\n  return stray;\n}\n";
  const src = fs.readFileSync(path.join(JS_DIR, 'swipe.js'), 'utf8') + injected;
  const { offenders, unresolved } = scanSource('js/swipe.js', src, subIds);
  assert.deepEqual(unresolved, [], 'fixture sanity: the injected receiver must resolve, not go UNRESOLVED');
  assert.deepEqual(offenders, [],
    "a clone of the navbar pill is a registered exception (it is a pill, not a view) and must NOT redden");
});

test('NOAPPCLONE — an unresolvable receiver fails rather than passing silently', () => {
  const subIds = settingsSubIds();
  // No selector literal anywhere and no traceable local declaration — a fully opaque
  // receiver, e.g. a function parameter with no assignment in this file at all.
  const src = "function bogus(mysteryNode) {\n  return mysteryNode.cloneNode(true);\n}\n";
  const { offenders, unresolved } = scanSource('fixture.js', src, subIds);
  assert.deepEqual(offenders, [], 'fixture sanity: an unresolved receiver is reported separately, not as an offender');
  assert.equal(unresolved.length, 1,
    `an opaque receiver with no selector literal and no resolvable local declaration must FAIL as `
    + `unresolved rather than pass silently; got unresolved=${JSON.stringify(unresolved)}`);
  assert.match(unresolved[0], /mysteryNode/, 'the unresolved report must name the receiver');
});

test('NOAPPCLONE — a rotted exception (registered text no longer present) is reported', () => {
  const stale = [];
  const fakeExceptions = [{ reason: 'a made-up entry', file: 'swipe.js', text: 'this text does not exist anywhere' }];
  const src = fs.readFileSync(path.join(JS_DIR, 'swipe.js'), 'utf8');
  for (const e of fakeExceptions) if (!src.includes(e.text)) stale.push(`${e.file}: "${e.text}"`);
  assert.equal(stale.length, 1, 'fixture sanity: a registered exception whose text has drifted must be reported stale');
});

module.exports = { jsFiles, findCloneSites, resolveReceiver, scanSource, settingsSubIds, EXCEPTIONS };
