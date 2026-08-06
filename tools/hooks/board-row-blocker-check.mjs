#!/usr/bin/env node
// board-row-blocker-check.mjs — FAIL the pre-commit battery if a board row's NEXT ACTION defers
// the decision to the user while its BLOCKER cell claims nothing is blocking it.
//
// The two cells then contradict each other, and the contradiction always resolves the same
// wrong way: the row reads as tracked and moving, while in reality it is parked waiting on a
// person who was never told they were holding it. Measured 2026-08-06: a row naming the coverage
// auditor as owner, with blocker "none", carried "ask the user whether to pursue" as its next
// action — for a routing the scheme's own table settles without ambiguity. The user had to ask
// why it was theirs. Nothing about the row was blocked; the assistant had simply declined to
// make a routine call.
//
// The rule this mechanizes: **if you are waiting on the user, the user is the blocker.** Say so
// in the blocker column and the row is honest and this gate is silent. A row that genuinely
// needs a person keeps its deferral — it just has to admit what it is waiting on.
//
// Scope is deliberately narrow: the deferral phrase must appear in the NEXT ACTION cell, and the
// BLOCKER cell must be empty or "none". A row that names any blocker at all passes, because
// naming it is the whole remedy. This is what keeps the gate off correct work — a gate that
// fires on correct work is one this project has recorded getting switched off.
//
//   node tools/hooks/board-row-blocker-check.mjs                # exit 1 on a violation, else 0
//   node tools/hooks/board-row-blocker-check.mjs <board.md>     # check a specific file
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BOARD = join(ROOT, 'Claude', 'Zelda', 'Board.md');

// Board task rows are `| ID | subject | owner | state | next action | blocker | link |`.
const ROW_ID = /^\|[ \t]*([A-Z]{1,4}-[A-Za-z0-9]+)[ \t]*\|/;
const NEXT_ACTION = 4;
const BLOCKER = 5;

// A blocker cell that asserts nothing is holding the row. Anything else — even a vague one —
// counts as a named blocker and passes: naming it is the remedy this gate asks for.
const NO_BLOCKER = /^(|none|n\/a|-|—)$/i;

// Phrases that hand the decision to the user. Kept to explicit hand-offs of a DECISION; a next
// action that merely involves the user (gathering symptoms only they have, running a device
// gesture) is real work and is not matched.
const DEFERRALS = [
  /\byour call\b/i,
  /\buser'?s call\b/i,
  /\bask the user\b/i,
  /\bask before\b/i,
  /\bcheck with the user\b/i,
  /\bconfirm with the user\b/i,
  /\bwait(ing)? (on|for) the user\b/i,
  /\buser (to )?decide[sd]?\b/i,
  /\bpending (a )?user (decision|call)\b/i,
  /\bif the user wants\b/i,
];

// Split a markdown table row into trimmed cells, dropping the leading/trailing empties the
// outer pipes produce.
export function rowCells(line) {
  return line.split('|').slice(1, -1).map((s) => s.trim());
}

// Rows whose next action defers a decision to the user while claiming no blocker, as
// [{ id, line, nextAction, phrase }, …]. Pure — a test can drive it on any string.
export function unblockedUserDeferrals(text) {
  const bad = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = ROW_ID.exec(lines[i]);
    if (!m) continue;
    const cells = rowCells(lines[i]);
    // A row that does not carry both cells is not this gate's business — a malformed row is a
    // different defect, and inventing a verdict about it here would be firing on work this
    // check was not asked to judge.
    if (cells.length <= BLOCKER) continue;
    if (!NO_BLOCKER.test(cells[BLOCKER])) continue;
    const hit = DEFERRALS.find((re) => re.test(cells[NEXT_ACTION]));
    if (hit) bad.push({ id: m[1], line: i + 1, nextAction: cells[NEXT_ACTION], phrase: hit.source });
  }
  return bad;
}

// CLI — importing this module (e.g. from its regression test) must NOT exit the process.
const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {
  // `resolve`, not `join`: an ABSOLUTE argv path joined onto cwd yields a path that does not
  // exist, and a gate that passes because it read nothing is a failure this project has paid for.
  const target = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : BOARD;
  if (!existsSync(target)) {
    if (process.argv[2]) {
      console.error(`✗ board-rows: no such file: ${target}`);
      process.exit(1);
    }
    process.exit(0);   // no board yet is not a violation
  }
  const bad = unblockedUserDeferrals(readFileSync(target, 'utf8'));
  if (bad.length) {
    console.error(`✗ board-rows: ${target} has a row whose next action defers to the user while`);
    console.error('  its blocker says nothing is blocking it. If you are waiting on the user, the');
    console.error('  user IS the blocker — name them in the blocker column. If you are not, make');
    console.error('  the call: routing the scheme already settles is not the user\'s to decide.');
    for (const b of bad) console.error(`    ${b.id} — line ${b.line} — next action: "${b.nextAction}"`);
    process.exit(1);
  }
  process.exit(0);
}
