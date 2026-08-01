#!/usr/bin/env node
// stage-gate-check.mjs — completion gate for a persona-scheme campaign stage.
//
// Given a stage manifest (see Claude/Campaigns/*.json), verify that EVERY
// required gate has a filed verdict artifact carrying an accepted verdict, or
// an explicit recorded waiver. Exit non-zero if any required gate is missing or
// unaccepted. This is the cheap, mechanical form of the campaign state machine's
// completion check: it refuses to call a stage "complete" while any gate —
// including the Loki adversary decision — has no filed pass. It removes exactly
// one failure mode: declaring a stage done while having silently skipped a gate.
// It does NOT re-judge each gate; that judgment stays each persona's.
//
//   node tools/campaign/stage-gate-check.mjs Claude/Campaigns/<stage>.json [repoRoot]
//
// Exit 0 = complete; 1 = a required gate not cleared; 2 = usage/manifest error.
//
// The gate-evaluation core is EXPORTED (gateResults) and the CLI is guarded, so
// tools/hooks/stage-has-manifest-check.mjs can ask "is the plan-review gate cleared yet?"
// against the SAME verdict semantics. It previously ran its logic at module top level, so any
// import executed the CLI and exited the importer — which would have forced a second, drifting
// copy of the verdict reader. Two readers disagreeing about what counts as an accepted verdict
// is a silent correctness hole in exactly the gates meant to prevent silent holes.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

export function globFiles(glob, root) {
  const dir = join(root, dirname(glob));
  const rx = new RegExp('^' + basename(glob).replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$');
  let names;
  try { names = readdirSync(dir); } catch { return []; }
  return names.filter(n => rx.test(n)).map(n => join(dir, n));
}

// ⛔⛔ THIS WAS VACUOUSLY PASSABLE AND IT IS THE GATE THE WHOLE SCHEME RESTS ON.
// The previous fallback was `accept.filter(v => new RegExp('\\b'+v+'\\b').test(txt))` — the
// accepted token appearing ANYWHERE in the prose counted as the verdict. A reviewer who writes
// "verdict FORGE/TEMPER/SCRAP" (the scheme's own phrasing), or who explains why the plan is not a
// FORGE, thereby FILES a FORGE. Measured on this repo at the time of the fix: 22 of the Charpy
// casebooks contain both FORGE and TEMPER in upper case, so a TEMPER review read as cleared. The
// plan-review gate could not fail for those stages.
//
// A verdict is now only what the artifact DECLARES, in one of three explicit forms, in priority
// order. Free-text scanning is gone: if no declaration is found the result is empty, and the
// caller reports it as undeclared rather than guessing from prose. Guessing is what made it inert.
// A DECLARATION is a line that BEGINS with the word "verdict" (after optional markdown markup) —
// `VERDICT: TEMPER`, `Verdict: **RED_SUITE_READY** → Brunel`, `- **Verdict:** SHIP.`, or a
// `## Verdict` heading whose next non-empty line carries the token. Requiring the line to START
// with it is what keeps prose out: a sentence like `step 1 ("stress this plan; verdict
// FORGE/TEMPER/SCRAP")` mentions the token mid-line and must not count, or the vacuous pass is
// straight back.
//
// ⚠️ FIVE FORMS ARE IN LIVE USE, and the reader was measured wrong TWICE before it was right —
// both times against the real artifacts, never against a fixture. Attempt 1 recognised only
// `VERDICT:` in caps plus the heading, and turned SEVEN genuinely-complete manifests red because
// Curie and Brunel write `Verdict: **X**` with a mixed-case label. Attempt 2 fixed that and THREE
// were still red, because those artifacts wrap the whole declaration in a backtick code span —
// hence the backtick in the leading-markup class. The fixtures passed every time; the repo
// disagreed. Check any change here against every manifest in Claude/Campaigns/, not a fixture.
export function declaredVerdicts(txt) {
  // 1. The machine-readable block, e.g. "verdict": "FORGE" — authoritative when present.
  const json = [...txt.matchAll(/"verdict"\s*:\s*"([A-Z_]+)"/g)].map(m => m[1]);
  if (json.length) return [...new Set(json)];

  const lines = txt.split(/\r?\n/);
  const DECL = /^[\s>\-*_#`]*\**\s*verdict\b/i;
  const TOKEN = /\b([A-Z][A-Z_]{2,})\b/;
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!DECL.test(lines[i])) continue;
    // 2/3. Token on the declaring line itself.
    const after = lines[i].replace(DECL, '');
    const onLine = after.match(TOKEN);
    if (onLine) { hits.push(onLine[1]); continue; }
    // 4. Heading form: the first NON-EMPTY line after it decides, and only that line.
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      if (!lines[j].trim()) continue;
      const next = lines[j].match(TOKEN);
      if (next) hits.push(next[1]);
      break;
    }
  }
  return [...new Set(hits)];
}

export function verdictsIn(file) {
  return declaredVerdicts(readFileSync(file, 'utf8'));
}

// When a gate's glob matches several artifacts, the ones carrying a numeric `-rN` ROUND suffix are
// successive rounds of the same review, and only the LAST round is the verdict of record. Without
// this, a gate passes if ANY round was accepted — so r1 FORGE followed by r2 SCRAP reads as
// cleared. Measured when found: 17 gates across 8 manifests match multiple artifacts, one of them
// ten Charpy rounds of Stage 5.
//
// ⚠️ KNOWN RESIDUAL, stated rather than papered over. The other multi-match shape suffixes the
// COMMIT SHA (`PLAN-swipe-stage6d-00874b5.md` vs `-d3571bf.md`), and shas carry no order, so the
// last round cannot be derived from the filename. Those keep the any-accepted semantics. Ordering
// them would need git history per artifact — real work, not a cheap gate — and the cheap fix for
// a NEW manifest is to point the glob at one artifact. Closing the `-rN` shape is what is cheaply
// closable today; the sha shape is recorded here so it is not mistaken for covered.
export function roundOf(file) {
  const m = basename(file).match(/-r(\d+)\.md$/i);
  return m ? Number(m[1]) : null;
}

// The artifacts whose verdicts count, given everything the glob matched.
export function artifactsOfRecord(files) {
  const rounds = files.map(f => ({ f, r: roundOf(f) })).filter(x => x.r !== null);
  if (rounds.length === 0) return files;                       // no round suffixes — unchanged
  const max = Math.max(...rounds.map(x => x.r));
  // Files WITHOUT a round suffix alongside rounds are the round-1 original; they are superseded.
  return rounds.filter(x => x.r === max).map(x => x.f);
}

// Evaluate every gate in `manifest` against the artifacts under `root`.
export function gateResults(manifest, root) {
  const results = [];
  for (const g of manifest.gates || []) {
    if (!g.required) { results.push({ ...g, ok: true, status: 'skipped (not required)' }); continue; }
    if (g.waived)     { results.push({ ...g, ok: true, status: `waived (${g.waived.reason})` }); continue; }
    const matched = globFiles(g.verdictArtifactGlob, root);
    if (matched.length === 0) { results.push({ ...g, ok: false, status: `MISSING — no verdict artifact at ${g.verdictArtifactGlob}` }); continue; }
    const files = artifactsOfRecord(matched);
    const found = files.flatMap(f => verdictsIn(f));
    const hit = found.filter(v => g.acceptVerdict.includes(v));
    // Distinguish the three outcomes — they need different fixes. UNDECLARED means the artifact
    // exists but states no verdict in any recognised form (add one); a filed-but-rejected verdict
    // means the gate RAN and said no (do the work).
    results.push(hit.length
      ? { ...g, ok: true, status: `pass (${[...new Set(hit)].join(', ')})` }
      : found.length
        ? { ...g, ok: false, status: `FAIL — filed verdict(s) [${[...new Set(found)].join(', ')}] not in [${g.acceptVerdict.join(', ')}]` }
        : { ...g, ok: false, status: `UNDECLARED — artifact exists but declares no verdict (use a "verdict" JSON field, a \`VERDICT: X\` line, or a \`## Verdict\` heading)` });
  }
  return results;
}

function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) { console.error('usage: stage-gate-check.mjs <manifest.json> [repoRoot]'); return 2; }
  const root = process.argv[3] || process.cwd();
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
  catch (e) { console.error(`cannot read manifest ${manifestPath}: ${e.message}`); return 2; }

  const results = gateResults(manifest, root);
  console.log(`Stage-gate check: ${manifest.campaign} (stage ${manifest.stage})`);
  for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.gate} [${r.owner}] — ${r.status}`);
  const bad = results.filter(r => !r.ok);
  if (bad.length) { console.error(`\nINCOMPLETE: ${bad.length} gate(s) not cleared → ${bad.map(b => b.gate).join(', ')}`); return 1; }
  console.log('\nCOMPLETE: every required gate has a filed, accepted verdict.');
  return 0;
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) process.exit(main());
