#!/usr/bin/env node
// stamp-build.mjs — single source of truth for the build stamp.
//
// build.json is authoritative. This script propagates its `build` value into the
// three other places that MUST agree, so the stamp can never drift by hand:
//   * sw.js            const BUILD = '...'
//   * js/debug.js      const BUILD = '...'
//   * index.html       <meta name="tomeroam-build" content="..."> AND every ?v=<BUILD>
//
// Why this exists: a stale index.html paired with fresh JS (or a bumped sw.js with
// an un-bumped index) has shipped live more than once. test/build.test.js DETECTS
// that drift; this GENERATES the files from one value so the drift can't be authored.
// It stays build-free and runtime-free — a local text rewrite, no network, no deps.
//
// Usage:
//   node tools/stamp-build.mjs           # rewrite the three files from build.json
//   node tools/stamp-build.mjs --check   # exit 1 if any file is out of sync (no writes)
//
// Deploy: edit build.json's `build`, run this, commit all four together. (Bump the
// build on every web deploy; the SW cache name + ?v= keys derive from it.)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const check = process.argv.includes('--check');

// The canonical stamp: YYYY-MM-DD.N (ISO date lexical order, then N numeric —
// the same shape WebFiles.compareBuild / debug.js parse). Reject anything else so
// a typo can't silently poison every derived cache key and OTA comparison.
const BUILD = JSON.parse(read('build.json')).build;
if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(BUILD || '')) {
  console.error(`stamp-build: build.json "build" is "${BUILD}" — expected YYYY-MM-DD.N`);
  process.exit(1);
}

// One rewrite rule per file. Each returns the new text; if it can't find its
// anchor it throws, so a structural change to a file fails loudly instead of
// silently leaving a stale stamp.
const VERSION_TOKEN = /\d{4}-\d{2}-\d{2}\.\d+/;
const rewrites = {
  'sw.js': (t) => sub(t, /(const BUILD = ')[^']*(')/, BUILD, 'sw.js const BUILD'),
  'js/debug.js': (t) => sub(t, /(const BUILD = ')[^']*(')/, BUILD, 'debug.js const BUILD'),
  'index.html': (t) => {
    t = sub(t, /(name="tomeroam-build" content=")[^"]*(")/, BUILD, 'index.html build meta');
    // Restamp every ?v=<version> query (SW cache key coherence). There are many;
    // require at least one so a rename of the scheme fails loudly.
    if (!new RegExp('\\?v=' + VERSION_TOKEN.source).test(t)) {
      throw new Error('index.html: no ?v=<version> asset stamps found');
    }
    return t.replace(new RegExp('(\\?v=)' + VERSION_TOKEN.source, 'g'), '$1' + BUILD);
  },
};

function sub(text, re, value, label) {
  if (!re.test(text)) throw new Error(`stamp anchor not found: ${label}`);
  return text.replace(re, (_m, a, b) => a + value + b);
}

let stale = 0;
for (const [file, rewrite] of Object.entries(rewrites)) {
  const before = read(file);
  const after = rewrite(before);
  if (after === before) continue;
  if (check) {
    stale++;
    console.error(`stamp-build --check: ${file} is out of sync with build.json (${BUILD})`);
  } else {
    writeFileSync(join(root, file), after);
    console.log(`stamped ${file} -> ${BUILD}`);
  }
}

if (check && stale) process.exit(1);
if (check) console.log(`stamp-build --check: all files match build.json (${BUILD})`);
else console.log(`build ${BUILD} is stamped across ${Object.keys(rewrites).length} files`);
