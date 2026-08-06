#!/usr/bin/env node
// board-id-unique-check.mjs — FAIL the pre-commit battery if `Claude/Zelda/Board.md` holds two
// task rows with the same ID.
//
// The board's own format requires an ID to be "unique across the board for its lifetime", and
// that requirement is load-bearing rather than cosmetic: rows are cited by ID from casebooks,
// plans, handoff packets and commit messages, so a duplicated ID makes every citation into it
// ambiguous with no error and no diff to notice. On 2026-08-06 the board carried `T-S7G` twice
// on unrelated subjects, and the session that found it introduced two MORE duplicates while
// filing new rows — because it read one block of the table and treated that reading as the
// whole enumeration. Reading is what fails here; executing is what caught it. Hence a gate
// (StandardsDocument §4: prefer a structure over a discipline).
//
// Scope is deliberately narrow. This checks ID uniqueness and nothing else — not row shape, not
// column count, not whether a row is current. A gate that computes a quantity nobody asked for
// passes on a broken artifact and fails on a sound one, and a gate that fires on correct work
// is one this project has recorded getting switched off.
//
//   node tools/hooks/board-id-unique-check.mjs                 # exit 1 on a duplicate, else 0
//   node tools/hooks/board-id-unique-check.mjs <board.md>      # check a specific file
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BOARD = join(ROOT, 'Claude', 'Zelda', 'Board.md');

// A board task row opens with its ID in the first cell: `| T-S7A | subject | owner | …`.
// Anchored at line start so an ID appearing mid-row (an owner citing another row, say) is not
// mistaken for a row of its own.
const ROW_ID = /^\|[ \t]*([A-Z]{1,4}-[A-Za-z0-9]+)[ \t]*\|/;

// Every board row ID with the 1-based line it sits on, in file order. Pure — no reads of
// process state, no exit, no logging — so a test can drive it on any string.
export function boardRowIds(text) {
  const ids = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = ROW_ID.exec(lines[i]);
    if (m) ids.push({ id: m[1], line: i + 1 });
  }
  return ids;
}

// Duplicated IDs as [{ id, lines: [n, …] }, …], sorted by id. Empty when every ID is unique.
export function duplicateBoardIds(text) {
  const seen = new Map();
  for (const { id, line } of boardRowIds(text)) {
    if (!seen.has(id)) seen.set(id, []);
    seen.get(id).push(line);
  }
  return [...seen.entries()]
    .filter(([, lines]) => lines.length > 1)
    .map(([id, lines]) => ({ id, lines }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// CLI — importing this module (e.g. from its regression test) must NOT exit the process.
const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {
  // `resolve`, not `join`: an ABSOLUTE argv path joined onto cwd yields a path that does not
  // exist, and the absence branch below would then exit 0 without ever opening the file the
  // caller named. A gate that passes because it read nothing is the failure mode this project
  // has already paid for once.
  const target = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : BOARD;
  if (!existsSync(target)) {
    if (process.argv[2]) {
      // An explicitly named file that is missing is an error, not a pass. Only the DEFAULT
      // board may be absent (a fresh project has not grown one yet, and failing on that would
      // block every commit in such a tree).
      console.error(`✗ board-ids: no such file: ${target}`);
      process.exit(1);
    }
    process.exit(0);
  }
  const dups = duplicateBoardIds(readFileSync(target, 'utf8'));
  if (dups.length) {
    console.error(`✗ board-ids: ${target} holds a task ID on more than one row.`);
    console.error('  An ID is cited from casebooks, plans and handoffs; a duplicate makes every');
    console.error('  citation into it ambiguous. Give each row its own ID.');
    for (const { id, lines } of dups) console.error(`    ${id} — lines ${lines.join(', ')}`);
    process.exit(1);
  }
  process.exit(0);
}
