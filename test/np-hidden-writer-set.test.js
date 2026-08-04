// NPHIDDENWRITER — the set of first-party code paths that can TEXTUALLY put #nowplaying into the
// hidden state is DERIVED from source and compared against a registered baseline, in three
// directions. Authored by the test author (2026-08-03) to fill gap G2 of
// Claude/Mendeleev/AUDIT-one-screen-type-a1b.md.
//
// WHAT IT PROVES, AND WHY IT IS THE LICENCE FOR A SHIPPED DESIGN CHANGE. Stage A1b of
// PLAN-one-screen-type.md deletes the exemption that kept a settings screen mounted underneath
// Now Playing. The stated ground for that exemption was that the NP-back reveal needs the screen
// kept mounted, and the ground on which A1b retires it is claim C6 (plan §5.3 step 3;
// Claude/Linnaeus/PROBE-np-uniqueness.md §9.1):
//
//     `hidden` is ADDED to #nowplaying in exactly ONE place in js/, and the same synchronous
//     setView body un-hides the destination two lines earlier — so the destination is mounted at
//     the instant Now Playing is hidden, on every path, BY CONSTRUCTION.
//
// C6 is what licenses retiring ratified probe mark §4.2, an item Claude/Decisions/DecisionLog.md
// incorporates BY REFERENCE. Until this cell existed the claim was held up by a hand enumeration,
// done twice (the deriver's and the adversary's, which agree) — and a hand enumeration is not a
// gate. A second writer added tomorrow greens the entire suite while the argument that retired a
// ratified decision item silently becomes false. That is the one finding on this stage where the
// suite's silence would be mistaken for the design still holding.
//
// ⚠️ GREEN AT HEAD BY DESIGN — this is a LOCK, not a red cell, exactly like
// test/scroll-writer-set.test.js (M1WRITERSET), whose shape it copies. ⛔ DO NOT "REPAIR" A RED BY
// NARROWING A PATTERN OR THE FILE SET. A red means either a new path to the hidden state appeared
// (register it, with the target it writes and a one-line reason it is not #nowplaying) or a
// registered one vanished (re-derive; a vanished writer may have MOVED rather than gone).
//
// ⛔ WHAT IT DOES NOT CLAIM, AND WHY THE WORDING MATTERS. This is the TEXTUAL bound. The residual
// set is named in S5 below and is registered, never smoothed over. A passing gate means the
// declared structural obligations passed, nothing more — it is not a proof that no code path
// anywhere can hide Now Playing.
//
// ⛔ AND IT ASSERTS NO PAINT. jsdom has no layout, no compositing and no stacking; every assertion
// here is source text. Nothing about what Now Playing covers, occludes or renders is claimed —
// those are the plan's §15 device rows and stay device-owed.
//
// WHERE REGISTRATION IS REQUIRED, AND WHERE IT IS NOT. M1WRITERSET registers every derived site
// with a hand-written reason it cannot reach its subject. That is right when the target cannot be
// derived, and wasteful — and rot-prone — when it can. So this cell registers by CLASS:
//
//   * a receiver of the form `$('someid')` resolves its own target MECHANICALLY, so the invariant
//     is computed, not registered: exactly one such site names `nowplaying`. A new hidden-write on
//     a literal id is not a red here, because the derivation can already see it is not this one.
//   * a receiver of the form `$(v)` driven by a same-line `for (const v of [...])` resolves to a
//     LIST, so the list is checked mechanically for the `nowplaying` token — this is the exact
//     one-word widening the coverage audit named as the highest-probability next defect on this
//     surface (js/app.js already carries two such sweeps).
//   * a receiver that is a bare identifier or a query selector CANNOT be resolved textually, so it
//     is registered with a target, an owner and a reason.
//
// THE BASELINE WAS DERIVED BY RUNNING THE DERIVATION, NOT HAND-WRITTEN — this project's standing
// lesson, and the reason M1WRITERSET states the same thing.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./dom-fixture.js');

// ── S1 — FILES. `js/` first-party only.
const SOURCE_DIR = 'js';
// `js/vendor/**` is EXCLUDED with its reason, and the reason is pinned BY FILE IDENTITY in its own
// gate (test/vendor-exclusion-pin.test.js — a recorded content hash alongside the count, so an
// IN-PLACE upgrade that adds DOM writes cannot pass silently). REFERENCED, NOT DUPLICATED: a
// second copy of that claim here would drift. On a pin failure the response is to re-derive the
// exclusion's reason against the new content, never to bump the recorded value.
const EXCLUDED_DIRS = {
  'js/vendor': 'one vendored third-party debug console (eruda), 500 KB on 8 minified lines, '
    + 'injected on demand by js/debug.js, never precached, and never holding a reference to '
    + '#nowplaying — pinned by content hash in test/vendor-exclusion-pin.test.js',
};
// Excluded BY CONSTRUCTION (this gate globs `js/` only, so neither is reachable):
// `android/build/assets/www/js/` is gitignored build OUTPUT — a COPY of `js/`, so a gate that
// globbed it would double-count every entry — and `.claude/worktrees/**` holds agent worktrees.
// Asserted below so the exclusion is a decision rather than an accident of the glob.
const NON_SOURCE_TREES = ['android/build', '.claude/worktrees'];

// ── S2 — THE HIDDEN-STATE WRITE PATTERNS. `hidden` is a CLASS in this app
// (index.html ships `<div id="nowplaying" class="nowplaying hidden">`, and css/app.css's `.hidden`
// is the display:none rule), so H1 is the live route and the other four are the alternative routes
// the adversary's enumeration walked. H3/H4 derive ZERO sites at HEAD and are kept in the pattern
// set deliberately: a future first one must arrive as an unregistered site, not as an omission.
// H5 (`className =`) is NOT site-inventoried — see S5's residual note — but IS checked against the
// alias set in S4, which is the only way it could reach #nowplaying without naming it.
const WRITE_PATTERNS = [
  ['H1', /\.classList\s*\.\s*(?:add|toggle)\s*\(\s*(['"])hidden\1/g],
  ['H2', /\.style\s*\.\s*display\s*=(?!=)/g],
  ['H3', /\.hidden\s*=(?!=)/g],
  ['H4', /\.setAttribute\s*\(\s*(['"])class\1/g],
];
// The same five routes as a suffix applied to a known #nowplaying ALIAS, PLUS TWO. The classList
// arm requires the `hidden` LITERAL, exactly as H1 does: `el.classList.add(cls)` with a variable
// class is a different, registered residual (js/nav.js's slideInView adds animation classes that
// way). The other arms stay broad, because `className =` and `setAttribute('class'|'style'…)` can
// carry anything at all and `style.display`/`style.cssText`/`el.hidden` are hiding routes whatever
// their value.
//
// ⭐ THE ALIAS ARM IS DELIBERATELY BROADER THAN THE SITE INVENTORY, and this is where the two
// extra routes come from (the coverage audit's note N4,
// Claude/Mendeleev/AUDIT-one-screen-type-a1b-r2.md). Measured against the previously shipped
// suffix, `npEl.style.cssText = 'display:none'` and `npEl.setAttribute('style', 'display:none')`
// both ESCAPED while all five listed routes were caught — and `style.cssText` is live first-party
// code (js/debug.js:431, :570, :733), so the route was not hypothetical. Both are now caught here.
// They are NOT added to S2's WRITE_PATTERNS: an alias is a reference the derivation has already
// proven points AT #nowplaying, so any hiding route through it counts, whereas site-inventorying
// `cssText` would derive every DOM-builder call in js/debug.js and demand a registered reason for
// each. Same treatment as `className =` — covered where it can reach the element, not everywhere.
// The selftest below EXECUTES both routes against this suffix, and executes the two that still
// escape it (S5's residual), so neither the catch nor the bound is a reading.
const ALIAS_WRITE_SUFFIX = String.raw`\s*\.\s*(?:classList\s*\.\s*(?:add|toggle)\s*\(\s*['"]hidden|style\s*\.\s*(?:display|cssText)\s*=(?!=)|className\s*=(?!=)|hidden\s*=(?!=)|setAttribute\s*\(\s*['"](?:class|style))`;

// The #nowplaying ELEMENT IDENTITY as it can appear in code: the id as a string literal, or a
// selector string naming it. Case-SENSITIVE and quote-anchored on purpose — `NowPlayingScreen`,
// `renderNowPlaying` and `npOpen()` are names of FUNCTIONS and MODULES, not references to the
// element, and deriving them would make this inventory rot on every unrelated rename.
const NP_ID_TOKEN = () => /(['"`])nowplaying\1/g;
const NP_SELECTOR = () => /(['"`])[^'"`]*[#.]nowplaying\b[^'"`]*\1/g;

/**
 * Strip comments before matching, so a comment that MENTIONS the retired exemption is not derived
 * as a writer — js/nav.js carries several such mentions. String-aware, so a `//` inside a literal
 * cannot truncate a real line.
 *
 * RE-STATED rather than imported from test/scroll-writer-set.test.js: `require`-ing that file would
 * EXECUTE its tests inside this process, which is the convention every source-scan cell in this
 * suite follows (see the note at the head of test/one-screen-type.test.js).
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

const readSrc = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const codeLines = (f) => stripComments(readSrc(f)).split('\n');

// ─────────────────────────────────────────────────────────────────────────────────────────
// DERIVATION 1 — the #nowplaying IDENTITY INVENTORY. Every code line that names the element.
// ─────────────────────────────────────────────────────────────────────────────────────────
function deriveIdentitySites(files = firstPartyFiles(), read = readSrc) {
  const sites = [];
  for (const file of files) {
    const raw = read(file).split('\n');
    stripComments(read(file)).split('\n').forEach((line, i) => {
      const id = NP_ID_TOKEN(); const sel = NP_SELECTOR();
      if (id.test(line) || sel.test(line)) {
        sites.push({ file, line: i + 1, text: (raw[i] || '').trim() });
      }
    });
  }
  return sites;
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// DERIVATION 2 — the HIDDEN-STATE WRITE inventory, with each site's RECEIVER classified.
// ─────────────────────────────────────────────────────────────────────────────────────────
// The receiver is the expression immediately left of the write. Matched from the END of the text
// preceding the write, longest form first, so `$('x')` wins over the bare `$`.
const RECV_TAIL = new RegExp(
  '(' + [
    String.raw`(?:document\s*\.\s*)?querySelector(?:All)?\(\s*(?:'[^']*'|"[^"]*")\s*\)`,
    String.raw`[\w$]+\s*\.\s*querySelector(?:All)?\(\s*(?:'[^']*'|"[^"]*")\s*\)`,
    String.raw`(?:[\w$]+\s*\.\s*)?(?:\$|byId|getElementById)\(\s*(?:'[\w-]+'|"[\w-]+"|[\w$]+)\s*\)`,
    String.raw`[\w$]+(?:\s*\.\s*[\w$]+)*`,
  ].join('|') + ')$');

const ID_LITERAL = /^(?:[\w$]+\s*\.\s*)?(?:\$|byId|getElementById)\(\s*(['"])([\w-]+)\1\s*\)$/;
const ID_VAR = /^(?:[\w$]+\s*\.\s*)?(?:\$|byId|getElementById)\(\s*([\w$]+)\s*\)$/;
const QUERY = /^(?:[\w$]+\s*\.\s*)?querySelector(?:All)?\(\s*(['"])([^'"]*)\1\s*\)$/;

function classifyReceiver(recv, line) {
  let m = ID_LITERAL.exec(recv);
  if (m) return { kind: 'id-literal', id: m[2] };
  m = QUERY.exec(recv);
  if (m) return { kind: 'query', selector: m[2] };
  m = ID_VAR.exec(recv);
  if (m) {
    // `$(v)` is only resolvable when the same line declares what `v` ranges over.
    const loop = new RegExp(String.raw`for\s*\(\s*(?:const|let|var)\s+` + m[1] + String.raw`\s+of\s*\[([^\]]*)\]`).exec(line);
    if (loop) return { kind: 'id-loop', variable: m[1], list: loop[1].trim() };
    return { kind: 'id-var-unresolved', variable: m[1] };
  }
  if (/^[\w$]+(?:\s*\.\s*[\w$]+)*$/.test(recv)) return { kind: 'local', name: recv };
  return { kind: 'unclassified' };
}

function deriveWriteSites(files = firstPartyFiles(), read = readSrc) {
  const sites = [];
  for (const file of files) {
    const raw = read(file).split('\n');
    stripComments(read(file)).split('\n').forEach((line, i) => {
      for (const [cls, re] of WRITE_PATTERNS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) {
          const before = line.slice(0, m.index);
          const rm = RECV_TAIL.exec(before);
          const recv = rm ? rm[1].trim() : '';
          sites.push({ cls, file, line: i + 1, recv, ...classifyReceiver(recv, line), text: (raw[i] || '').trim() });
        }
      }
    });
  }
  return sites;
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// DERIVATION 3 — the ALIAS CLOSURE. Identifiers bound to the #nowplaying element, directly or
// inside an id-list that is mapped to elements. An alias is how a write reaches the element
// WITHOUT naming it, which is the one hole a pure identity inventory cannot see.
// ─────────────────────────────────────────────────────────────────────────────────────────
const ALIAS_DIRECT = () => /(?:const|let|var)\s+([\w$]+)\s*=\s*(?:[\w$]+\s*\.\s*)?(?:\$|byId|getElementById)\(\s*(['"])nowplaying\2\s*\)/g;
const ALIAS_LIST = () => /(?:const|let|var)\s+([\w$]+)\s*=\s*\[[^\]]*(['"])nowplaying\2[^\]]*\]\s*\.\s*map\s*\(/g;

function deriveAliases(files = firstPartyFiles(), read = readSrc) {
  const out = [];
  for (const file of files) {
    const src = stripComments(read(file));
    for (const re of [ALIAS_DIRECT(), ALIAS_LIST()]) {
      let m;
      while ((m = re.exec(src))) out.push({ file, name: m[1] });
    }
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════════════════
// THE REGISTERED BASELINES. Keyed by SOURCE TEXT, never by `file:line` — a line number rots on
// any edit above it, which would turn this gate into noise.
// ═════════════════════════════════════════════════════════════════════════════════════════

// ── B1 — the identity inventory. Every code site naming the #nowplaying element, with its ROLE.
// EXACTLY ONE carries role 'hidden-write'; that single entry IS claim C6's textual half.
// Entries 12 and 13 share their text — they are a GROUP of two (the same supersession-recovery
// line occurs in two recovery paths), and the group-count direction is what makes deleting ONE of
// the two fail.
const IDENTITY = [
  { n: 1, file: 'js/app.js', text: "function openNowPlaying() { if (ctx) navTo({ v: 'nowplaying' }); }",
    role: 'descriptor', why: 'builds a nav DESCRIPTOR; touches no element' },
  { n: 2, file: 'js/app.js', text: "else if (from && from.v === 'nowplaying') { dir = 'fwd';",
    role: 'descriptor', why: 'a descriptor comparison in the swipe-direction decision' },
  { n: 3, file: 'js/app.js', text: "if (dest.v === 'nowplaying') { renderNowPlaying(); document.body.classList.remove('np-locked'); }",
    role: 'descriptor', why: 'a descriptor comparison; its only DOM write is on document.body, not on #nowplaying' },
  // Entries 4 and 4b are a GROUP of two: the same re-apply guard occurs on two recovery paths in
  // js/app.js. They are registered separately so the group-count direction still fails when ONE of
  // the two is deleted — the case a text-keyed inventory is otherwise blind to.
  { n: 4, file: 'js/app.js', text: "if (d && d.v !== 'home' && d.v !== 'nowplaying' && d.v !== 'options') applyScreen(d, { render: true, resetScroll: false });",
    role: 'descriptor', why: 'a descriptor comparison that EXCLUDES nowplaying from a re-apply' },
  { n: '4b', file: 'js/app.js', text: "if (d && d.v !== 'home' && d.v !== 'nowplaying' && d.v !== 'options') applyScreen(d, { render: true, resetScroll: false });",
    role: 'descriptor', why: 'the second occurrence of the same guard, on the other recovery path' },
  { n: 5, file: 'js/app.js', text: "const npEl = $('nowplaying');",
    role: 'acquire', why: 'binds the element to `npEl` for a touchmove listener — the alias is '
      + 'registered in B4 and every write pattern is checked against it' },
  { n: 6, file: 'js/nav.js', text: "const isOverlay = (v) => v === 'options' || v === 'nowplaying' || isSub(v);",
    role: 'descriptor', why: 'a view-name predicate; no DOM' },
  { n: 7, file: 'js/nav.js', text: "const viewElFor = (v) => v === 'nowplaying' ? null : v === 'home' ? d.byId('home')",
    role: 'descriptor', why: 'RETURNS NULL for nowplaying — the swipe machinery is given no element for it here' },
  { n: 8, file: 'js/nav.js', text: "npOpen = v === 'nowplaying';",
    role: 'descriptor', why: 'sets the module flag the one hidden-write reads' },
  { n: 9, file: 'js/nav.js', text: "$('nowplaying').classList.toggle('hidden', !npOpen);",
    role: 'hidden-write',
    why: 'THE SINGLE WRITER — claim C6. Not a reason it cannot reach #nowplaying; it is the one '
      + 'that does, and the whole point of this gate is that it stays the only one' },
  { n: 10, file: 'js/nav.js', text: "const els = ['home', 'browse', 'options', 'nowplaying', ...SETTINGS_SUBS].map((id) => d.byId(id));",
    role: 'acquire-list',
    why: 'resetSwipeStyles collects every screen element INCLUDING #nowplaying and clears inline '
      + 'transform/transition/will-change/z-index on each. It writes no visibility property at '
      + 'all; the binding `els` and its loop variable are registered aliases in B4, so a '
      + 'visibility write added to that loop fails this gate' },
  { n: 11, file: 'js/nav.js', text: "if (desc.v === 'nowplaying') { setView('nowplaying'); if (render) d.renderNowPlaying(); return; }",
    role: 'descriptor', why: "applyScreen's NP branch — it DELEGATES to setView, entry 9's own function" },
  { n: 12, file: 'js/swipe.js', text: "if (from.v === 'nowplaying') decorations = [{ kind: 'now-playing-pill', role: 'mover', base: 'outgoing' }];",
    role: 'descriptor', why: 'a descriptor comparison choosing a DECORATION kind; no DOM' },
  { n: 13, file: 'js/swipe.js', text: "else if (to.v === 'nowplaying') decorations = [{ kind: 'now-playing-pill', role: 'mover', base: 'incoming' }];",
    role: 'descriptor', why: 'the same, on the incoming side' },
];

// ── B2 — the LOCAL receivers of a hidden-state write: a bare identifier or dotted path whose
// target CANNOT be resolved from the write's own line. These are the entries that need a
// hand-written reason, and they are the only ones that do.
const LOCAL_RECEIVERS = [
  { file: 'js/app.js', name: 'bar', target: '#offlinebar', owner: 'the offline banner', why: 'the network banner element' },
  { file: 'js/app.js', name: 's', target: '#infoSheet', owner: 'hideSheet', why: 'bound one statement earlier from $(\'infoSheet\')' },
  { file: 'js/app.js', name: 'menu', target: 'the speed menu popover', owner: 'the transport speed menu', why: 'a popover inside the transport' },
  { file: 'js/app.js', name: 'autoRow', target: 'a settings row', owner: 'the native auto-update row', why: 'a row inside a settings screen' },
  { file: 'js/browse.js', name: 'v.el', target: 'a .browsepage element', owner: "browse.js's view registry", why: 'a virtual view\'s own page node, created by browse.js' },
  { file: 'js/browse.js', name: 'rm', target: 'a .readmore button', owner: 'the author blurb', why: 'a button inside the author header' },
  { file: 'js/debug.js', name: 'diagEl', target: 'the diagnostics overlay', owner: 'the debug overlay', why: 'an element the debug overlay creates' },
  { file: 'js/debug.js', name: 'panelEl', target: 'the debug panel', owner: 'the debug overlay', why: 'an element the debug overlay creates' },
  { file: 'js/home-screen.js', name: 'section', target: 'the Downloads section of #home', owner: 'the home downloads rail', why: 'a section INSIDE #home' },
  { file: 'js/nav.js', name: 'browseEl', target: '#browse', owner: 'setView', why: 'bound at the top of setView from $(\'browse\') — the sibling screen, not #nowplaying' },
  { file: 'js/net.js', name: 'sub', target: 'the banner subtitle', owner: 'the network banner', why: 'a text node inside the banner' },
  { file: 'js/net.js', name: 'act', target: 'the banner action', owner: 'the network banner', why: 'a button inside the banner' },
  { file: 'js/nowplaying-screen.js', name: 'btn', target: '#npDl', owner: 'the NP download button', why: 'a CHILD of #nowplaying, not the screen element itself — hiding a button inside Now Playing does not hide Now Playing' },
  { file: 'js/options-screen.js', name: 'row', target: 'a settings row', owner: 'the options screen', why: 'a row inside #options' },
  { file: 'js/signin-screen.js', name: 'link', target: 'the sign-in link', owner: 'the sign-in screen', why: 'an anchor inside #signin' },
  { file: 'js/speed.js', name: 'pop', target: 'the speed popover', owner: 'the speed control', why: 'a popover the speed control creates' },
];

// ── B3 — the QUERY receivers: a hidden-state write on the result of a selector query. The
// selector is checked MECHANICALLY against the #nowplaying identity as well as registered here.
const QUERY_RECEIVERS = [
  { file: 'js/browse.js', selector: '.authorblurb', target: 'the author blurb paragraph',
    owner: 'the author header', why: 'scoped to the author-header wrapper, inside a browse page' },
];

// ── B4 — the ALIAS closure: identifiers bound to the #nowplaying element, and the identifiers
// each PROPAGATES to. No write of ANY of the five patterns may have one of these as its receiver.
const ALIASES = [
  { file: 'js/app.js', name: 'npEl', propagates: [],
    why: 'the touchmove-blocking listener binding; it reads scrollHeight/clientHeight and calls '
      + 'preventDefault, and writes nothing' },
  { file: 'js/nav.js', name: 'els', propagates: ['el'],
    why: "resetSwipeStyles' element list, iterated as `el`; it clears inline transform, transition, "
      + 'will-change and z-index — no visibility property' },
];

// ── B5 — the id LISTS that drive a looped hidden-write. None may contain the nowplaying token,
// and a list that SPREADS a named constant has that constant's own array literal checked too.
const LOOP_LISTS = [
  { file: 'js/app.js', list: "'signin', 'library'", owner: 'the signed-out/signed-in root switch' },
  { file: 'js/app.js', list: "'options', ...SETTINGS_SUBS", owner: "showAppView's stale-overlay sweep" },
  { file: 'js/nav.js', list: "'options', ...SETTINGS_SUBS", owner: "setView's six-way settings loop" },
];
// `SETTINGS_SUBS` is declared once as an array literal (js/nav.js) and re-exported through
// `Nav.SETTINGS_SUBS` into js/app.js, so checking the literal covers both spreads.
const SPREAD_CONSTANTS = ['SETTINGS_SUBS'];

// ── S5 — WHAT IS OUTSIDE THIS GATE'S REACH. Named here so its silence cannot be read as coverage.
const RESIDUALS = [
  'a `className =` assignment site is not individually inventoried — there are ~50 in first-party '
  + 'js/, essentially all DOM-builder assignments on nodes the builder just created. It is covered '
  + 'only where it could reach #nowplaying: through a registered alias (checked in B4) or by '
  + 'naming the element (checked in B1). A className write through a reference obtained some third '
  + 'way is outside reach',
  'a receiver resolved at RUNTIME — a document-wide collection query whose selector is built from '
  + 'a variable, a DOM traversal (parentNode/children/closest), or an element passed in as a '
  + 'function parameter',
  'a write through `Object.assign(el, {...})` or a computed property (`el["className"]`)',
  'an inline-style write that does not name its property syntactically — `el.style.setProperty('
  + '"display", "none")` or a computed `el.style["display"]`. MEASURED, not read: the selftest '
  + 'below executes both against ALIAS_WRITE_SUFFIX and asserts they escape it. The two routes the '
  + 'coverage audit measured as escaping — `el.style.cssText =` and `el.setAttribute("style", …)` '
  + '— are now CAUGHT through a registered alias, and like `className =` they are covered ONLY '
  + 'there: neither is site-inventoried in S2',
  'a class added from a VARIABLE rather than a literal — `el.classList.add(cls)`. js/nav.js\'s '
  + 'slideInView does exactly this with animation class names, so the pattern must require the '
  + '`hidden` literal or the gate is red on arrival against code that cannot hide anything',
  'the CSS side: that `.hidden` still means display:none is css/app.css\'s property and is not '
  + 'read here',
];

const HIDDEN_WRITERS_OF_NP = IDENTITY.filter((e) => e.role === 'hidden-write');
const groupKey = (e) => e.file + ' || ' + e.text;
const identityMatch = (site) => IDENTITY.filter((e) => e.file === site.file && site.text.includes(e.text));

// ═════════════════════════════════════════════════════════════════════════════════════════
// THE CELL
// ═════════════════════════════════════════════════════════════════════════════════════════
test('NPHIDDENWRITER — exactly one first-party code path puts #nowplaying into the hidden state, '
  + 'and a second one cannot appear silently', () => {
  const files = firstPartyFiles();

  // ⭐ ANTI-VACUITY: a derivation over an empty file set passes every comparison below. This
  // project has already paid for that class of gate once.
  assert.ok(files.length > 20,
    `fixture: the derivation must actually walk js/ — found ${files.length} first-party files`);
  const identity = deriveIdentitySites(files);
  const writes = deriveWriteSites(files);
  assert.ok(identity.length > 0, 'fixture: the derivation found NO #nowplaying identity sites at all, which cannot be true');
  assert.ok(writes.length > 0, 'fixture: the derivation found NO hidden-state write sites at all, which cannot be true');

  // ── DIRECTION 1 — a derived identity site that is not registered FAILS.
  const unregistered = identity.filter((s) => identityMatch(s).length === 0)
    .map((s) => `${s.file}:${s.line}  ${s.text.slice(0, 140)}`);
  assert.deepEqual(unregistered, [],
    'these code sites NAME the #nowplaying element and are NOT in the registered identity '
    + 'inventory. Claim C6 — the licence for retiring the ratified NP-back-reveal exemption — is '
    + 'that exactly ONE of them writes the hidden state. REGISTER each new site with its role '
    + "('descriptor', 'acquire', 'acquire-list' or 'hidden-write') and a one-line reason, and ⛔ do "
    + 'NOT narrow the pattern or the file set to make this pass:\n  ' + unregistered.join('\n  '));

  // ── DIRECTION 2 — a registered entry whose text no longer occurs FAILS. This is what stops the
  // inventory rotting the way a hand-written, only-ever-growing one does.
  const rotted = IDENTITY.filter((e) => !readSrc(e.file).includes(e.text))
    .map((e) => `#${e.n} [${e.file}] ${e.text}`);
  assert.deepEqual(rotted, [],
    'these registered identity entries no longer occur in source, so the inventory has rotted — '
    + 'RE-DERIVE (do not delete an entry blindly; a vanished site may have moved rather than '
    + 'gone):\n  ' + rotted.join('\n  '));

  // ── DIRECTION 3 — a GROUP whose derived count no longer equals its registered count FAILS.
  // Without it, DUPLICATING the single writer would pass every other direction: the duplicate
  // matches the registered entry and is not "unregistered". Registered texts can NEST, so each
  // derived site is attributed to its LONGEST matching entry.
  const derivedCount = new Map();
  for (const s of identity) {
    const best = identityMatch(s).sort((a, b) => b.text.length - a.text.length)[0];
    if (!best) continue;
    derivedCount.set(groupKey(best), (derivedCount.get(groupKey(best)) || 0) + 1);
  }
  const registeredCount = new Map();
  for (const e of IDENTITY) registeredCount.set(groupKey(e), (registeredCount.get(groupKey(e)) || 0) + 1);
  const drift = [];
  for (const [k, want] of registeredCount) {
    const got = derivedCount.get(k) || 0;
    if (got !== want) drift.push(`${k} — registered ${want} site(s), derived ${got}`);
  }
  assert.deepEqual(drift, [],
    'these registered identity groups no longer have the registered number of sites in source. A '
    + 'DUPLICATED writer is the case this direction exists for: it matches the registered entry '
    + 'textually, so only the count can see it:\n  ' + drift.join('\n  '));

  // ── THE INVARIANT ITSELF — exactly ONE registered identity site writes the hidden state.
  assert.deepEqual(HIDDEN_WRITERS_OF_NP.map((e) => `#${e.n} ${e.file} ${e.text}`),
    ["#9 js/nav.js $('nowplaying').classList.toggle('hidden', !npOpen);"],
    'the authority to hide Now Playing must have exactly ONE identity, and it must be setView\'s '
    + 'own toggle. This is the TEXTUAL bound — see RESIDUALS for what it does not claim.');

  // ── AND THE DERIVED SIDE OF THE SAME INVARIANT — exactly one hidden-state WRITE resolves,
  // mechanically, to the id `nowplaying`. This is computed from the write derivation rather than
  // read off the registration, so the two derivations must agree.
  const npWrites = writes.filter((s) => s.kind === 'id-literal' && s.id === 'nowplaying')
    .map((s) => `${s.file}:${s.line} [${s.cls}] ${s.text}`);
  assert.equal(npWrites.length, 1,
    'exactly one derived hidden-state write must target the literal id `nowplaying` — found '
    + `${npWrites.length}:\n  ` + npWrites.join('\n  '));
  assert.match(npWrites[0], /^js\/nav\.js:/,
    `and it must live in js/nav.js's setView — found ${npWrites[0]}`);

  // ── THE LOOPED SWEEPS — no id list that drives a hidden-write may name nowplaying. The coverage
  // audit named a one-word widening of exactly these lists as the highest-probability next defect
  // on this surface (js/app.js already carries two such sweeps).
  const loops = writes.filter((s) => s.kind === 'id-loop');
  const unregisteredLoops = loops
    .filter((s) => !LOOP_LISTS.some((e) => e.file === s.file && e.list === s.list))
    .map((s) => `${s.file}:${s.line} for (… of [${s.list}])`);
  assert.deepEqual(unregisteredLoops, [],
    'these looped hidden-writes range over an UNREGISTERED id list. Register the list with its '
    + 'owner:\n  ' + unregisteredLoops.join('\n  '));
  const widened = loops.filter((s) => /(['"])nowplaying\1/.test(s.list))
    .map((s) => `${s.file}:${s.line} for (… of [${s.list}])`);
  assert.deepEqual(widened, [],
    'an id list that drives a hidden-state write now NAMES nowplaying. Widening one of these '
    + 'sweeps by a single word is a one-word change that would otherwise redden nothing, and it '
    + 'would make claim C6 false — Now Playing would be hidden from a second place:\n  '
    + widened.join('\n  '));
  for (const name of SPREAD_CONSTANTS) {
    const defs = [];
    for (const f of files) {
      const re = new RegExp(String.raw`(?:const|let|var)\s+` + name + String.raw`\s*=\s*\[([^\]]*)\]`, 'g');
      let m;
      while ((m = re.exec(stripComments(readSrc(f))))) defs.push({ file: f, body: m[1] });
    }
    assert.ok(defs.length > 0,
      `fixture: the spread constant ${name} is registered as spread into a hidden-write loop, but `
      + 'no array-literal declaration of it was found — a check against nothing passes silently');
    for (const d of defs) {
      assert.doesNotMatch(d.body, /(['"])nowplaying\1/,
        `${d.file}'s ${name} array now contains nowplaying, so every loop that spreads it hides `
        + `Now Playing: [${d.body}]`);
    }
  }

  // ── THE UNRESOLVABLE RECEIVERS — each must be registered with a target, an owner and a reason.
  const unregisteredLocals = writes.filter((s) => s.kind === 'local')
    .filter((s) => !LOCAL_RECEIVERS.some((e) => e.file === s.file && e.name === s.recv))
    .map((s) => `${s.file}:${s.line} [${s.cls}] receiver \`${s.recv}\` — ${s.text.slice(0, 100)}`);
  assert.deepEqual(unregisteredLocals, [],
    'these hidden-state writes have a receiver this derivation CANNOT resolve to a target, and it '
    + 'is not registered. Register each with the element it targets, its owner and a one-line '
    + 'reason it is not #nowplaying — that reason is the only thing standing between this write '
    + 'and claim C6:\n  ' + unregisteredLocals.join('\n  '));

  const unregisteredQueries = writes.filter((s) => s.kind === 'query')
    .filter((s) => !QUERY_RECEIVERS.some((e) => e.file === s.file && e.selector === s.selector))
    .map((s) => `${s.file}:${s.line} [${s.cls}] querySelector(${s.selector})`);
  assert.deepEqual(unregisteredQueries, [],
    'these hidden-state writes run against an UNREGISTERED selector query — the class that could '
    + 'reach #nowplaying without naming it as an id:\n  ' + unregisteredQueries.join('\n  '));
  const npQueries = writes.filter((s) => s.kind === 'query' && /[#.]nowplaying\b/.test(s.selector))
    .map((s) => `${s.file}:${s.line} querySelector(${s.selector})`);
  assert.deepEqual(npQueries, [],
    'a hidden-state write now runs against a selector that MATCHES Now Playing:\n  ' + npQueries.join('\n  '));

  const unresolvedVars = writes.filter((s) => s.kind === 'id-var-unresolved')
    .map((s) => `${s.file}:${s.line} [${s.cls}] $(${s.variable}) with no same-line list to resolve it`);
  assert.deepEqual(unresolvedVars, [],
    'these hidden-state writes look up an element by a VARIABLE id with nothing on the line to say '
    + 'what that variable ranges over, so the derivation cannot prove the id is not nowplaying. '
    + 'Restructure the call or register it explicitly:\n  ' + unresolvedVars.join('\n  '));

  const unclassified = writes.filter((s) => s.kind === 'unclassified')
    .map((s) => `${s.file}:${s.line} [${s.cls}] receiver \`${s.recv}\` — ${s.text.slice(0, 100)}`);
  assert.deepEqual(unclassified, [],
    'the derivation could not classify these receivers at all. An unclassified receiver is an '
    + 'unproven one:\n  ' + unclassified.join('\n  '));
});

test('NPHIDDENWRITER — the #nowplaying ALIAS closure: no reference bound to the element performs '
  + 'a visibility write', () => {
  const files = firstPartyFiles();
  const derived = deriveAliases(files);

  // Both directions on the alias set itself, so a NEW binding cannot arrive silently and a
  // registered one cannot rot.
  const got = derived.map((a) => `${a.file} ${a.name}`).sort();
  const want = ALIASES.map((a) => `${a.file} ${a.name}`).sort();
  assert.deepEqual(got, want,
    'the set of identifiers bound to the #nowplaying element has changed. An ALIAS is how a write '
    + 'reaches the element WITHOUT naming it, which is the one hole the identity inventory cannot '
    + 'see — every new binding must be registered with what it does with the element');

  // ⚠️ THE PROPAGATION CHECK IS FILE-WIDE, AND THAT IS DELIBERATE. `el` is the loop variable of
  // resetSwipeStyles' iteration over the registered `els` list, and js/nav.js has other bindings
  // that share the name (slideInView's parameter). Scanning the whole file over-approximates: an
  // unrelated `el` write would also fail here. Over-approximation is the safe direction — it can
  // produce a red that has to be reasoned about, never a silent green — and ⛔ the repair for such
  // a red is to rename the colliding binding or register it, NOT to narrow this scan.
  for (const a of ALIASES) {
    const src = stripComments(readSrc(a.file));
    for (const name of [a.name, ...a.propagates]) {
      const re = new RegExp(String.raw`(?:^|[^\w.$])` + name + ALIAS_WRITE_SUFFIX);
      const hit = re.exec(src);
      assert.equal(hit, null,
        `\`${name}\` in ${a.file} is a reference to the #nowplaying element (${a.why}), and it now `
        + 'performs a visibility write. That is a SECOND path to the hidden state, which makes '
        + `claim C6 false — the licence for retiring the ratified NP-back-reveal exemption. Found: `
        + `${(hit && hit[0]) || ''}`);
    }
  }
});

test('NPHIDDENWRITER — the SYNCHRONY half of claim C6: setView un-hides the destination BEFORE it '
  + 'hides Now Playing, in one synchronous body', () => {
  const src = stripComments(readSrc('js/nav.js'));
  // ⭐ THE LOCATOR IS SIGNATURE-AGNOSTIC ON PURPOSE. The declaration is found by NAME, never by
  // spelling its parameter list, so the parameter assertion added below (§13 step 10a) is what
  // fails when a second parameter appears. A locator that spelled `setView(v)` would turn that
  // mutant into a FIXTURE failure — the cell would go red without either predicate having been
  // evaluated, which is a red obtained for the wrong reason and therefore no evidence at all.
  const decl = /function\s+setView\s*\(([^)]*)\)/.exec(src);
  assert.ok(decl, 'fixture: js/nav.js must declare setView');
  const start = decl.index;
  const rest = src.slice(start + 1);
  const end = rest.indexOf('\n  function ');
  assert.ok(end > 0, 'fixture: the end of the setView body must be locatable (the next top-level function)');
  const body = rest.slice(0, end);

  const iBrowse = body.indexOf("browseEl.classList.toggle('hidden'");
  const iSix = body.indexOf("for (const s of ['options', ...SETTINGS_SUBS]) $(s).classList.toggle('hidden'");
  const iNp = body.indexOf("$('nowplaying').classList.toggle('hidden'");
  assert.ok(iBrowse >= 0 && iSix >= 0 && iNp >= 0,
    `fixture: all three visibility statements must occur in setView's body — browse ${iBrowse}, `
    + `six-way ${iSix}, nowplaying ${iNp}`);
  assert.ok(iBrowse < iNp && iSix < iNp,
    'the destination un-hides must PRECEDE the Now Playing hide. C6 is not merely "one writer": it '
    + 'is that the SAME synchronous body mounts the destination first, so the destination is '
    + 'already mounted at the instant Now Playing is hidden, on every path, by construction. A '
    + 'reordering refactor breaks the reveal without changing the writer count — and that is '
    + 'exactly the argument that retires the settings-screen exemption');

  for (const susp of ['await ', 'requestAnimationFrame', 'setTimeout', 'queueMicrotask', '.then(']) {
    assert.ok(!body.includes(susp),
      `setView's body now contains \`${susp}\`. C6 requires the destination un-hide and the Now `
      + 'Playing hide to land in ONE synchronous body — anything that defers between them opens a '
      + 'window in which Now Playing is hidden and the destination is not yet mounted, which is '
      + 'the flash the retired exemption existed to prevent (and plan §5.3.6: A1b adds no timer, '
      + 'listener, rAF or promise)');
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // §9's EDGE-5 RE-OPEN CONDITION, MADE MECHANICAL — PLAN-one-screen-type.md §13 step 10a.
  //
  // §9 enumerates five edges on which `d.browseWillHide` is newly reached, and rules the fifth —
  // a SUPERSESSION while Now Playing is the current screen, `applyScreen(currentDesc(), …)` at
  // js/app.js:459 — DELIBERATELY UNCOVERED. The ground is that edge 5's `setView` body is
  // byte-identical to edge 4's, which `NPPARKS` already drives, so edge 5 adds a second ROUTE to
  // an already-proven behaviour and nothing else.
  //
  // ⭐ A GREEN HERE IS WHAT KEEPS EDGE 5 UNCOVERED. §9 reduces that byte-identity to exactly two
  // source predicates, and until this cell existed neither was asserted anywhere — the ruling was
  // enforced by a re-check at plan step 16, which runs once and then closes with the plan. A RED
  // HERE IS NOT A BUG REPORT: it is edge 5 acquiring an effect edge 4's path does not have, which
  // is precisely the moment §9 says the ruling lapses and edge 5 owes a cell of its own. ⛔ Do not
  // repair a red by relaxing either assertion — route it to the planner with the new signature.
  //
  // ⛔ WHAT THESE TWO DO NOT REACH, so their silence is not read as coverage. §9 lists three ways
  // the identity could break; these close the second (a new option reaching the park/hide block)
  // and the third (a caller-specific hook) BY CONSTRUCTION. The first — a branch inside setView
  // keyed on MODULE-SCOPE state that only the supersession path sets — would leave both predicates
  // green and still break the identity. That is a STATED residual, not an oversight: no such
  // branch exists at HEAD (setView's body reads `v`, the `npOpen` it derives from `v` on its first
  // line, the injected `d`, the module constant SETTINGS_SUBS and `document`, and nothing else),
  // and closing it would need an identifier-set pin over the whole body — a heavier instrument
  // than §9 judges the ruling worth.
  // ─────────────────────────────────────────────────────────────────────────────────────
  const params = decl[1].split(',').map((s) => s.trim()).filter(Boolean);
  assert.deepEqual(params, ['v'],
    'setView is no longer declared with EXACTLY ONE parameter. PLAN-one-screen-type.md §9 rules '
    + 'edge 5 of its browseWillHide enumeration (a supersession while Now Playing is current) '
    + 'deliberately uncovered, on the ground that no caller can hand setView anything that '
    + 'distinguishes edge 5 from edge 4 — and a second parameter is exactly that. THE GREEN HERE '
    + 'IS WHAT KEEPS EDGE 5 UNCOVERED, so this red retires the ruling: route it to the planner, '
    + `who owes edge 5 a cell of its own. Declared parameters: [${params.join(', ')}]`);

  const npCall = /desc\s*\.\s*v === 'nowplaying'[^\n]*?setView\(([^)]*)\)/.exec(src);
  assert.ok(npCall,
    "fixture: applyScreen must still have a Now Playing branch that calls setView — if the branch "
    + 'moved or was restructured, the predicate below is measuring nothing');
  const npArgs = npCall[1].split(',').map((s) => s.trim()).filter(Boolean);
  assert.deepEqual(npArgs, ["'nowplaying'"],
    "applyScreen's Now Playing branch no longer passes setView the LITERAL 'nowplaying' and "
    + 'nothing else. §9 rules edge 5 uncovered because `opts.render`, `opts.resetScroll` and '
    + '`opts.keepGhosts` are consumed by applyScreen itself and never reach the park-and-hide '
    + 'statements at js/nav.js:52-70 — an option threaded through this call is the second way that '
    + 'identity breaks. THE GREEN HERE IS WHAT KEEPS EDGE 5 UNCOVERED; this red hands the ruling '
    + `back to the planner. Arguments passed: [${npArgs.join(', ')}]`);
});

test('NPHIDDENWRITER scope — the scoping clauses are part of the cell, not preamble', () => {
  // The vendored tree is excluded WITH ITS REASON, and the reason is pinned elsewhere by file
  // identity rather than restated here.
  assert.ok(Object.prototype.hasOwnProperty.call(EXCLUDED_DIRS, 'js/vendor'),
    'js/vendor/** must be excluded (a minified vendored bundle would make this gate red on arrival)');
  assert.match(EXCLUDED_DIRS['js/vendor'], /vendor-exclusion-pin/,
    'the exclusion must POINT AT the identity pin rather than carry a second copy of the claim, '
    + 'which would drift');
  assert.ok(fs.existsSync(path.join(ROOT, 'test', 'vendor-exclusion-pin.test.js')),
    'the referenced identity pin must exist — a dangling reference is worse than no reference');
  assert.deepEqual(firstPartyFiles().filter((f) => f.startsWith('js/vendor')), [],
    'no vendored file may enter the derived set');

  for (const tree of NON_SOURCE_TREES) {
    assert.deepEqual(firstPartyFiles().filter((f) => f.startsWith(tree)), [],
      `${tree} is build output or an agent worktree and must never enter the derived set — a gate `
      + 'that globbed the android build COPY of js/ would double-count every entry');
  }

  // The residual set is NAMED in the cell, so the gate's silence cannot be read as coverage.
  assert.ok(RESIDUALS.length >= 4 && RESIDUALS.every((r) => r.length > 40),
    'the textual bound\'s residuals must be stated in the cell itself');
  assert.ok(RESIDUALS.some((r) => /className/.test(r)),
    'the un-inventoried `className =` class must be named as a residual, not left implicit');
  assert.ok(RESIDUALS.some((r) => /RUNTIME/.test(r)),
    'the runtime-resolved receiver must be named as a residual');
  assert.ok(RESIDUALS.some((r) => /setProperty/.test(r)),
    'the inline-style routes that escape the alias suffix must be named as a residual — the '
    + "coverage audit's note N4 was a completeness defect in this cell's DISCLOSURE, and the "
    + 'disclosure is the standard this cell sets for itself');

  // Every registered entry carries its required fields.
  for (const e of IDENTITY) {
    assert.ok(['descriptor', 'acquire', 'acquire-list', 'hidden-write'].includes(e.role),
      `identity entry #${e.n} has an unknown role "${e.role}"`);
    assert.ok(e.why && e.why.length > 10, `identity entry #${e.n} is missing "why"`);
  }
  for (const e of LOCAL_RECEIVERS) {
    for (const k of ['target', 'owner', 'why']) {
      assert.ok(e[k] && e[k].length > 3, `local receiver ${e.file} ${e.name} is missing "${k}"`);
    }
  }
  for (const e of QUERY_RECEIVERS) {
    for (const k of ['target', 'owner', 'why']) {
      assert.ok(e[k] && e[k].length > 3, `query receiver ${e.file} ${e.selector} is missing "${k}"`);
    }
  }
  for (const e of ALIASES) assert.ok(e.why && e.why.length > 10, `alias ${e.file} ${e.name} is missing "why"`);
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// SELFTEST — proves the derivations and the comparison CAN fail, without editing real source.
// Drives the same functions against synthetic in-memory files, so it is a structural test of the
// machinery rather than a scan of any project text. This is the same evidence M1WRITERSET's
// selftest carries, and it is what makes a LOCK's failability provable at HEAD.
// ─────────────────────────────────────────────────────────────────────────────────────────
test('NPHIDDENWRITER selftest — the derivations see a second writer, a widened sweep, an alias '
  + 'write and a comment, and tell an id literal from a loop variable', () => {
  const mem = (src) => (() => src);
  const one = (src) => ['js/fake.js'];

  const idOf = (src) => deriveIdentitySites(['js/fake.js'], mem(src));
  const wrOf = (src) => deriveWriteSites(['js/fake.js'], mem(src));
  const alOf = (src) => deriveAliases(['js/fake.js'], mem(src));

  // The identity derivation.
  assert.equal(idOf("$('nowplaying').classList.toggle('hidden', !npOpen);").length, 1,
    'a quoted `nowplaying` id is an identity site');
  assert.deepEqual(idOf('// the retired nowplaying exemption is described here'), [],
    'a COMMENT that mentions nowplaying is not a site — js/nav.js carries several such mentions '
    + 'and deriving them would put phantom entries in the inventory');
  assert.deepEqual(idOf('function renderNowPlaying() { return NowPlayingScreen.render(); }'), [],
    '`NowPlayingScreen` and `renderNowPlaying` are FUNCTION and MODULE names, not references to '
    + 'the element — deriving them would make the inventory rot on every unrelated rename');
  assert.equal(idOf("const el = document.querySelector('#nowplaying');").length, 1,
    'a SELECTOR naming the element is an identity site too, not only the bare id');

  // The write derivation and its receiver classification.
  const lit = wrOf("$('sheetBlurb').classList.add('hidden');")[0];
  assert.equal(lit.kind, 'id-literal', 'a literal-id receiver is resolved mechanically');
  assert.equal(lit.id, 'sheetBlurb', 'and its target id is derived, not registered');
  const loop = wrOf("for (const s of ['options', 'general']) $(s).classList.toggle('hidden', v !== s);")[0];
  assert.equal(loop.kind, 'id-loop', 'a `$(v)` receiver with a same-line list is resolved to that list');
  assert.equal(loop.list, "'options', 'general'", 'and the list text is what gets checked for the nowplaying token');
  assert.equal(wrOf('for (const s of LIST) $(s).classList.add(\'hidden\');')[0].kind, 'id-var-unresolved',
    'a `$(v)` receiver with NO same-line list cannot be resolved and must not pass silently');
  assert.equal(wrOf("bar.classList.toggle('hidden', !on);")[0].kind, 'local',
    'a bare identifier receiver is a LOCAL and needs a registered reason');
  assert.equal(wrOf("wrap.querySelector('.authorblurb').style.display = 'none';")[0].kind, 'query',
    'a selector-query receiver is its own class — the one that could reach the element without '
    + 'naming its id');
  assert.deepEqual(wrOf('if (a === b.classList.contains(\'hidden\')) return;'), [],
    'a READ of the hidden class is not a writer');
  assert.equal(wrOf("const s = 'no // comment here'; el.style.display = 'none';").length, 1,
    'a `//` inside a string literal must not truncate the line and hide a real writer');

  // THE THREE ATTACKS this gate exists to catch, each driven against the real comparison.
  const dup = idOf("$('nowplaying').classList.toggle('hidden', !npOpen);\n$('nowplaying').classList.toggle('hidden', !npOpen);");
  assert.equal(dup.length, 2,
    'a DUPLICATED writer must derive as TWO sites — it matches the registered entry textually, so '
    + 'only the group-count direction can see it');
  const widened = wrOf("for (const s of ['options', 'nowplaying']) $(s).classList.add('hidden');")[0];
  assert.ok(/(['"])nowplaying\1/.test(widened.list),
    'a sweep WIDENED by one word must surface in the list text the gate checks — the coverage '
    + "audit's highest-probability next defect on this surface");
  assert.deepEqual(alOf("const npEl = $('nowplaying');").map((a) => a.name), ['npEl'],
    'a direct binding of the element is derived as an alias');
  assert.deepEqual(alOf("const els = ['home', 'nowplaying'].map((id) => byId(id));").map((a) => a.name), ['els'],
    'an id-LIST mapped to elements is an alias binding too — the shape js/nav.js actually uses');
  const aliasWrite = new RegExp(String.raw`(?:^|[^\w.$])npEl` + ALIAS_WRITE_SUFFIX);
  assert.ok(aliasWrite.test("npEl.classList.add('hidden');"), 'an alias classList write is detected');
  assert.ok(aliasWrite.test("npEl.className = 'nowplaying hidden';"),
    'an alias `className =` write is detected — this is the ONLY place the un-inventoried '
    + 'className class is covered, so the selftest must prove it');
  assert.ok(!aliasWrite.test('npEl.addEventListener("touchmove", f);'),
    'and a non-visibility use of the alias is not a false positive (js/app.js does exactly this)');
  assert.ok(!aliasWrite.test("other.npEl.classList.add('hidden');"),
    'a DIFFERENT object\'s property that happens to be named npEl is not the alias');

  // THE TWO INLINE-STYLE ROUTES the coverage audit measured as ESCAPING the shipped suffix
  // (note N4). Both are executed here rather than argued, because that is how the audit found
  // them: reading the regex had already declared the alias closure complete.
  assert.ok(aliasWrite.test("npEl.style.cssText = 'display:none';"),
    'an alias `style.cssText =` write is detected. This route ESCAPED the shipped suffix and is '
    + 'live first-party code (js/debug.js:431, :570, :733), so its omission was a real hole in the '
    + "cell's disclosure, not a hypothetical one");
  assert.ok(aliasWrite.test("npEl.setAttribute('style', 'display:none');"),
    'an alias `setAttribute("style", …)` write is detected — the second route that escaped');
  assert.ok(!aliasWrite.test("npEl.setAttribute('data-x', '1');"),
    'and widening the setAttribute arm did not make every attribute write a visibility write');

  // AND THE BOUND, executed too — S5's inline-style residual is a MEASURED statement about this
  // regex, so a future widening that closes one of these must move the residual with it.
  assert.ok(!aliasWrite.test("npEl.style.setProperty('display', 'none');"),
    'S5 residual: `style.setProperty` names the property as a STRING and still escapes this suffix');
  assert.ok(!aliasWrite.test("npEl.style['display'] = 'none';"),
    'S5 residual: a COMPUTED inline-style property still escapes this suffix');

  assert.equal(one().length, 1, 'the selftest file list is a single synthetic file');
});

module.exports = { deriveIdentitySites, deriveWriteSites, deriveAliases, firstPartyFiles, stripComments, IDENTITY };
