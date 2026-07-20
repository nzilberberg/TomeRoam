#!/usr/bin/env node
// gen-transition-matrix.mjs — DERIVE the swipe transition inventory. Never hand-write it.
//
// WHY THIS EXISTS. The inventory was written by hand twice in PLAN-swipe-reveal.txt and
// was wrong both times: draft 1 said "exactly two transition shapes", draft 2 said
// "14 of 30 and here they are". The real answer is 8 structural combinations over a
// registry of 12 screens (132 ordered pairs), and it took a ten-line script seconds to
// get right after careful reading had failed twice. Reading does not scale past about
// three interacting conditions; this file exists so nobody has to.
//
//   node tools/gen-transition-matrix.mjs            # write docs/transition-matrix.generated.txt
//   node tools/gen-transition-matrix.mjs --print    # stdout only
//
// The predicate below MIRRORS js/app.js's branch conditions. That mirroring is the one
// weak link, so it is PINNED: sourceFingerprint() hashes the exact region of app.js the
// predicate was derived from, and test/transition-matrix.test.js fails if that region
// changes. A failure there does not mean the code is wrong — it means this predicate
// must be re-verified against it before the generated file can be trusted again.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

// ---- the registry, itself derived ------------------------------------------------
// Settings sub-screens come from nav.js's SETTINGS_SUBS so that adding a sixth one
// cannot leave this inventory stale.
export function registry() {
  const nav = read('js/nav.js');
  const m = /const SETTINGS_SUBS = \[([^\]]*)\]/.exec(nav);
  if (!m) throw new Error('SETTINGS_SUBS not found in js/nav.js — registry cannot be derived');
  const subs = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  return [
    { v: 'home', kind: 'home', host: '#home' },
    ...['books', 'authors', 'authorBooks', 'files'].map((v) => ({ v, kind: 'browse', host: '#browse' })),
    ...['options', 'nowplaying', ...subs].map((v) => ({ v, kind: 'overlay', host: 'overlay' })),
  ];
}

// ---- the predicate, mirroring js/app.js's start() --------------------------------
//   incomingBrowse = !toOv && toV !== 'home'
//   OUT: fromOv -> real overlay | incomingBrowse -> ghostApp() | else real in-flow view
//   IN:  toOv   -> real overlay | toV==='home'   -> snapshotHome() | else real #browse
export function planFor(from, to) {
  const fromOv = from.kind === 'overlay';
  const toOv = to.kind === 'overlay';
  const incomingBrowse = !toOv && to.kind !== 'home';
  const outgoing = fromOv ? 'real-overlay' : (incomingBrowse ? 'GHOST-pane' : 'real-view');
  const incoming = toOv ? 'real-overlay' : (to.kind === 'home' ? 'SNAPSHOT-pane' : 'real-#browse');
  // Abort must re-render only when the source's own host was overwritten mid-drag,
  // i.e. source lives in #browse AND the incoming took that same host.
  const rerenderOnAbort = !fromOv && from.host === '#browse' && incoming === 'real-#browse';
  const decorations = [from.v, to.v].includes('nowplaying') ? 'np-pill' : '-';
  return {
    outgoing, incoming, decorations,
    pane: /pane/i.test(outgoing + incoming),
    abortRender: rerenderOnAbort ? 'rerender' : 'none',
  };
}

/** Hash of the app.js region this predicate mirrors. Drift here invalidates the file. */
export function sourceFingerprint() {
  const src = read('js/app.js');
  const a = src.indexOf('const incomingBrowse =');
  const b = src.indexOf('d.movers = [out, incoming]');
  if (a < 0 || b < 0 || b <= a) throw new Error('branch region not found in js/app.js');
  const region = src.slice(a, b).replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(region).digest('hex').slice(0, 16);
}

export function render() {
  const screens = registry();
  const kinds = ['home', 'browse', 'overlay'];
  const byKind = (k) => screens.find((s) => s.kind === k);
  const L = [];
  L.push('SWIPE TRANSITION INVENTORY — GENERATED, DO NOT EDIT');
  L.push('Regenerate: node tools/gen-transition-matrix.mjs');
  L.push('Guarded by: test/transition-matrix.test.js');
  L.push('');
  L.push(`app.js branch-region fingerprint: ${sourceFingerprint()}`);
  L.push('  (if this changes, the predicate in the generator must be RE-VERIFIED');
  L.push('   against js/app.js before this file is trusted)');
  L.push('');
  L.push(`registry: ${screens.length} screens, ${screens.length * (screens.length - 1)} ordered pairs`);
  for (const k of kinds) {
    L.push(`  ${k.padEnd(8)} ${screens.filter((s) => s.kind === k).map((s) => s.v).join(', ')}`);
  }
  L.push('');
  L.push('STRUCTURAL MATRIX (kind -> kind)');
  L.push('  from     to        outgoing       incoming        pane   abort');
  L.push('  -------  --------  -------------  --------------  -----  --------');
  for (const f of kinds) {
    for (const t of kinds) {
      if (f === 'home' && t === 'home') continue;   // not a transition
      const p = planFor(byKind(f), byKind(t));
      L.push(`  ${f.padEnd(8)} ${t.padEnd(8)}  ${p.outgoing.padEnd(13)}  ${p.incoming.padEnd(14)}  `
        + `${(p.pane ? 'yes' : 'no').padEnd(5)}  ${p.abortRender}`);
    }
  }
  const pairs = [];
  for (const f of screens) for (const t of screens) if (f.v !== t.v) pairs.push(planFor(f, t));
  L.push('');
  L.push(`concrete pairs building a pane: ${pairs.filter((p) => p.pane).length} of ${pairs.length}`);
  L.push(`concrete pairs re-rendering on abort: ${pairs.filter((p) => p.abortRender === 'rerender').length}`);
  L.push(`concrete pairs carrying the NP pill: ${pairs.filter((p) => p.decorations === 'np-pill').length}`);
  return L.join('\n') + '\n';
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('gen-transition-matrix.mjs');
if (invokedDirectly) {
  const out = render();
  if (process.argv.includes('--print')) { process.stdout.write(out); }
  else {
    const dest = path.join(ROOT, 'docs', 'transition-matrix.generated.txt');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, out);
    console.log('wrote docs/transition-matrix.generated.txt');
  }
}
