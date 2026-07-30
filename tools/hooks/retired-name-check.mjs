#!/usr/bin/env node
// Blocks the RETIRED product name from re-entering this PUBLIC repo.
//
// The companion Lyrion plugin (and, earlier, this app) carried a name that
// incorporated a third-party trademark. That name is being retired from every
// repo on the account, and this repo is public, so it is the highest-exposure
// surface for a relapse.
//
// Why a gate and not a rule: the string was reintroduced HERE, in a records
// commit whose entire purpose was to remove it — the deploy instructions named
// the old directory and the old prefs file in order to say "delete these". Good
// intent is exactly when this slips. Structure over vigilance
// (StandardsDocument §4).
//
// The retired token is ASSEMBLED FROM FRAGMENTS below and never written out.
// A lint that hard-codes the string it forbids puts the string right back into
// the history it is defending — which is precisely how it first landed in the
// plugin repo's initial commit.
//
// Scope note: this guards the tree going FORWARD. Three pre-existing commits in
// this repo's history contain the token; rewriting them would change every SHA
// on a 500-commit public repo with live Pages and APK releases, which is not
// worth it for records-only references. The tree is clean; new commits stay so.
//
// Exit 0 = clean, 1 = blocked.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const A = 'Plex';
const B = 'Books';
const RETIRED = A + B;
const RE = new RegExp(RETIRED, 'i');

// Binary-ish files we never scan for a text token.
const SKIP = /\.(png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|eot|apk|keystore|jks|zip|gz|pdf)$/i;

let files;
try {
  files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && !SKIP.test(f));
} catch {
  console.log('retired-name: not a work tree — skipped');
  process.exit(0);
}

const hits = [];
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    continue; // unreadable or genuinely binary
  }
  if (!RE.test(text)) {
    if (RE.test(f)) hits.push(`${f}:0: (path)`);
    continue;
  }
  text.split('\n').forEach((line, i) => {
    if (RE.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
  if (RE.test(f)) hits.push(`${f}:0: (path)`);
}

if (hits.length) {
  console.error(`retired-name: the retired product name is present in ${hits.length} place(s):`);
  for (const h of hits.slice(0, 20)) console.error(`  ${h}`);
  if (hits.length > 20) console.error(`  … and ${hits.length - 20} more`);
  console.error('');
  console.error('This repo is PUBLIC and that name is being retired account-wide.');
  console.error('If you need to describe the OLD thing (e.g. "delete the old plugin dir"),');
  console.error('refer to it without naming it, and keep exact legacy paths in the private');
  console.error('plugin records instead.');
  process.exit(1);
}

console.log(`retired-name: clean (${files.length} tracked files scanned)`);
process.exit(0);
