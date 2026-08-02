#!/usr/bin/env node
// gen-transition-matrix.mjs — RENDER the swipe transition inventory. Never hand-write it.
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
// STAGE 4 CHANGE — THE MIRROR IS RETIRED. This generator used to REIMPLEMENT js/app.js's
// branch conditions and a fingerprint hash proved the two copies had not drifted. Its own
// header called that mirror "the one weak link": two copies the pin can only prove are
// EQUAL, never CORRECT. Now there is one decision (js/swipe.js, classifyTransition +
// constructionPlanFor) and one independent contract (test/fixtures/swipe-plan-spec.mjs).
// This file RENDERS the contract; test/swipe-transition.test.js checks the real
// production functions against it. Nothing here reimplements the branch logic, so there
// is nothing to fingerprint. The registry is still DISCOVERED from production
// (Nav.SETTINGS_SUBS) — that discovery is genuine and stays pinned by the test.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRUCTURAL_CASES, paneOf, NP_SCREEN, NP_DECORATION } from '../test/fixtures/swipe-plan-spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

// The browse-family list is OWNED by production (js/swipe.js). Import it so the registry
// cannot re-list it differently — drafts 1/2 of the plan omitted authorBooks by hand.
const require = (await import('node:module')).createRequire(import.meta.url);
const BROWSE_FAMILY = require('../js/swipe.js').BROWSE_FAMILY;

// ---- the registry, itself derived --------------------------------------------------
// Settings sub-screens come from nav.js's SETTINGS_SUBS so that adding a sixth one
// cannot leave this inventory stale. home / browse-family / options / nowplaying are
// hand-listed (a production screen registry would be the proper source; the screen-name
// census in the frozen-model test pins their absence in the meantime).
export function registry() {
  const nav = read('js/nav.js');
  const m = /const SETTINGS_SUBS = \[([^\]]*)\]/.exec(nav);
  if (!m) throw new Error('SETTINGS_SUBS not found in js/nav.js — registry cannot be derived');
  const subs = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  return [
    { v: 'home', kind: 'home', host: '#home' },
    ...BROWSE_FAMILY.map((v) => ({ v, kind: 'browse', host: '#browse' })),
    ...['options', 'nowplaying', ...subs].map((v) => ({ v, kind: 'overlay', host: 'overlay' })),
  ];
}

// ---- the frozen construction outcome for one kind pair, from the spec ---------------
const STRUCTURAL = new Map(STRUCTURAL_CASES.map((c) => [c.from + '->' + c.to, c]));
function outcomeFor(from, to) {
  const c = STRUCTURAL.get(from.kind + '->' + to.kind);
  if (!c) throw new Error(`the spec has no structural case for ${from.kind}->${to.kind}`);
  const np = from.v === NP_SCREEN ? NP_DECORATION.source : to.v === NP_SCREEN ? NP_DECORATION.destination : null;
  return {
    outgoing: c.expectedConstruction.outgoing,
    incoming: c.expectedConstruction.incoming,
    renderDestination: c.expectedConstruction.renderDestination,
    pane: paneOf(c.expectedConstruction),
    abortRender: c.expectedFinalization.abortRender,
    decoration: np ? 'np-pill' : '-',
  };
}

export function render() {
  const screens = registry();
  const kinds = ['home', 'browse', 'overlay'];
  const byKind = (k) => screens.find((s) => s.kind === k);
  const L = [];
  L.push('SWIPE TRANSITION INVENTORY — GENERATED, DO NOT EDIT');
  L.push('Regenerate: node tools/gen-transition-matrix.mjs');
  L.push('Guarded by:  test/transition-matrix.test.js');
  L.push('Contract:    test/fixtures/swipe-plan-spec.mjs   (the frozen expectations)');
  L.push('Production:   js/swipe.js   (classifyTransition + constructionPlanFor)');
  L.push('');
  L.push(`registry: ${screens.length} screens, ${screens.length * (screens.length - 1)} ordered pairs`);
  for (const k of kinds) {
    L.push(`  ${k.padEnd(8)} ${screens.filter((s) => s.kind === k).map((s) => s.v).join(', ')}`);
  }
  L.push('');
  L.push('CONSTRUCTION PLAN by kind (from the frozen spec; abort is frozen finalization data)');
  L.push('  from     to        outgoing      incoming          render       pane   abort');
  L.push('  -------  --------  ------------  ----------------  -----------  -----  --------');
  for (const f of kinds) {
    for (const t of kinds) {
      if (f === 'home' && t === 'home') continue;   // not a transition
      const p = outcomeFor(byKind(f), byKind(t));
      L.push(`  ${f.padEnd(8)} ${t.padEnd(8)}  ${p.outgoing.padEnd(12)}  ${p.incoming.padEnd(16)}  `
        + `${p.renderDestination.padEnd(11)}  ${(p.pane ? 'yes' : 'no').padEnd(5)}  ${p.abortRender}`);
    }
  }
  const pairs = [];
  for (const f of screens) for (const t of screens) if (f.v !== t.v) pairs.push(outcomeFor(f, t));
  L.push('');
  L.push(`concrete pairs building a pane: ${pairs.filter((p) => p.pane).length} of ${pairs.length}`);
  L.push(`concrete pairs re-rendering on abort: ${pairs.filter((p) => p.abortRender === 'rerender').length}`);
  L.push(`concrete pairs carrying the NP pill: ${pairs.filter((p) => p.decoration === 'np-pill').length}`);
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
