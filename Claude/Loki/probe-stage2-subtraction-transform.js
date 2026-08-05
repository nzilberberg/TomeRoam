// collapse-transform.js — Loki probe support (disposable).
// Applies PLAN-swipe-declone-stage2-subtraction §5's orphan-recovery collapse (plus the
// D9/D11 surfaces it rides on) to js/app.js and js/nav.js IN MEMORY, at load time.
// Product source is never touched. Every replacement must match EXACTLY ONCE or the
// instrument refuses to run — a transform that silently no-ops is a broken instrument.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// Filed in Claude/Loki/ — the project root is two levels up.
const ROOT = process.env.TOMEROAM_ROOT || path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'js', 'app.js');
const NAV = path.join(ROOT, 'js', 'nav.js');

function replaceOnce(src, from, to, label) {
  const i = src.indexOf(from);
  if (i < 0) throw new Error('transform anchor NOT FOUND: ' + label);
  if (src.indexOf(from, i + 1) >= 0) throw new Error('transform anchor NOT UNIQUE: ' + label);
  return src.slice(0, i) + to + src.slice(i + from.length);
}

function collapseApp(src) {
  src = src.replace(/\r\n/g, '\n');
  // D9: the .spent sweep goes.
  src = replaceOnce(src,
    "      document.querySelectorAll('.nav-ghost.spent').forEach((n) => n.remove());\n",
    '', 'app: .spent sweep');
  // D9: the recovery predicate loses the ghost disjunct.
  src = replaceOnce(src,
    "if (d || document.querySelector('.nav-ghost') || (finishing && session)) {",
    'if (d || (finishing && session)) {', 'app: predicate disjunct');
  // D7 call site + §5 ternary 1: the explicit reset call goes (adjacency: applyScreen next line).
  src = replaceOnce(src,
    "        if (cur) disposeOwnedPanes(cur, 'superseded');\n        resetSwipeStyles(cur ? true : undefined);\n",
    '', 'app: dispose call + explicit reset');
  // §5 ternary 2: the collapsed applyScreen options.
  src = replaceOnce(src,
    "applyScreen(currentDesc(), { render: false, resetScroll: cur ? false : undefined, keepGhosts: cur ? true : undefined });",
    'applyScreen(currentDesc(), { render: false, resetScroll: false });', 'app: applyScreen opts');
  // §5 ternary 3: the unconditional scroll restore. If cur is EVER null here, this THROWS —
  // which is exactly the loud failure the probe wants from a reachable orphan entry.
  src = replaceOnce(src,
    '        if (cur) window.scrollTo(0, cur.scroll0);',
    '        window.scrollTo(0, cur.scroll0);', 'app: scroll restore');
  return src;
}

function collapseNav(src) {
  src = src.replace(/\r\n/g, '\n');
  // D9 (nav.js:105) + D11 (the keepGhosts parameter).
  src = replaceOnce(src,
    "  function resetSwipeStyles(keepGhosts) {\n    if (!keepGhosts) document.querySelectorAll('.nav-ghost').forEach((n) => n.remove());\n",
    '  function resetSwipeStyles() {\n', 'nav: param + ghost sweep');
  // D11 (nav.js:129).
  src = replaceOnce(src,
    '    resetSwipeStyles(opts && opts.keepGhosts);',
    '    resetSwipeStyles();', 'nav: applyScreen arg');
  return src;
}

// MODE is mutable so one process can run both variants (the harness re-reads app.js and
// re-requires nav.js on every boot).
const state = { collapsed: false };

function install() {
  const origRead = fs.readFileSync;
  fs.readFileSync = function (p, ...a) {
    const out = origRead.call(fs, p, ...a);
    try {
      if (state.collapsed && typeof p === 'string' && path.resolve(p) === APP && typeof out === 'string') {
        return collapseApp(out);
      }
    } catch (e) { throw e; }
    return out;
  };
  const origJs = Module._extensions['.js'];
  Module._extensions['.js'] = function (module, filename) {
    if (state.collapsed && path.resolve(filename) === NAV) {
      const src = collapseNav(origRead.call(fs, filename, 'utf8'));
      return module._compile(src, filename);
    }
    return origJs(module, filename);
  };
}

module.exports = { state, install, collapseApp, collapseNav, APP, NAV, ROOT };

// Preload mode: `node --require .../collapse-transform.js` with COLLAPSE=1 turns the whole
// process (e.g. a test-suite child) into the collapsed variant.
if (process.env.COLLAPSE === '1') { state.collapsed = true; install(); }
