// Regression suite for tools/hooks/board-id-unique-check.mjs.
//
// The gate exists because a duplicated board ID makes every citation into that row ambiguous
// with no error and no diff. These tests drive the pure functions directly; the module's CLI is
// guarded so importing it here does not exit the test process. (A checker whose CLI runs at
// module scope kills the runner on import, and `node --test` then reports a green `# tests 1`
// for a file holding many — the COUNT is the only tell, so the count here is what to read.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boardRowIds, duplicateBoardIds, BOARD } from '../tools/hooks/board-id-unique-check.mjs';

const row = (id, subject) => `| ${id} | ${subject} | owner | state | next | none | link |`;

test('boardRowIds finds a row ID and reports its 1-based line', () => {
  const text = ['# Board', '', row('T-01', 'a')].join('\n');
  assert.deepEqual(boardRowIds(text), [{ id: 'T-01', line: 3 }]);
});

test('boardRowIds reads IDs in file order across many rows', () => {
  const text = [row('T-01', 'a'), row('T-02', 'b'), row('W-3', 'c')].join('\n');
  assert.deepEqual(boardRowIds(text).map((r) => r.id), ['T-01', 'T-02', 'W-3']);
});

test('boardRowIds tolerates CRLF line endings', () => {
  const text = [row('T-01', 'a'), row('T-02', 'b')].join('\r\n');
  assert.deepEqual(boardRowIds(text).map((r) => r.id), ['T-01', 'T-02']);
});

test('boardRowIds accepts leading whitespace inside the first cell', () => {
  assert.deepEqual(boardRowIds('|   T-01   | subject |').map((r) => r.id), ['T-01']);
});

test('boardRowIds ignores an ID that appears mid-row rather than as the row ID', () => {
  const text = row('T-01', 'supersedes T-02 and blocks T-03');
  assert.deepEqual(boardRowIds(text).map((r) => r.id), ['T-01']);
});

test('boardRowIds ignores prose lines that merely mention an ID', () => {
  const text = ['T-01 is open, see T-02.', '- **T-03** — a bullet, not a row.'].join('\n');
  assert.deepEqual(boardRowIds(text), []);
});

test('boardRowIds ignores a markdown table whose first cell is not an ID', () => {
  const text = ['| Record | Bears on | Call |', '| --- | --- | --- |', '| a plan | scope | AGREE |'].join('\n');
  assert.deepEqual(boardRowIds(text), []);
});

test('duplicateBoardIds returns empty when every ID is unique', () => {
  const text = [row('T-01', 'a'), row('T-02', 'b'), row('T-03', 'c')].join('\n');
  assert.deepEqual(duplicateBoardIds(text), []);
});

test('duplicateBoardIds catches a duplicate and names every line it sits on', () => {
  const text = [row('T-01', 'a'), row('T-02', 'b'), row('T-01', 'a different subject')].join('\n');
  assert.deepEqual(duplicateBoardIds(text), [{ id: 'T-01', lines: [1, 3] }]);
});

test('duplicateBoardIds catches an ID repeated three times', () => {
  const text = [row('T-09', 'a'), row('T-09', 'b'), row('T-09', 'c')].join('\n');
  assert.deepEqual(duplicateBoardIds(text), [{ id: 'T-09', lines: [1, 2, 3] }]);
});

test('duplicateBoardIds reports several distinct duplicates, sorted by id', () => {
  const text = [row('T-S7G', 'a'), row('T-S7H', 'b'), row('T-S7G', 'c'), row('T-S7H', 'd')].join('\n');
  assert.deepEqual(duplicateBoardIds(text).map((d) => d.id), ['T-S7G', 'T-S7H']);
});

test('duplicateBoardIds reproduces the 2026-08-06 board defect this gate was built for', () => {
  // The real shape: one pre-existing duplicate, plus two more introduced while filing new rows
  // against a reading of only part of the table.
  const text = [
    row('T-S7E', 'stage 7 F1'),
    row('T-S7F', 'stage 7 F2'),
    row('T-S7G', 'stage 7 F3'),
    row('T-S7H', 'supersession route'),
    row('T-S7G', 'mutate.mjs comment scrub'),
    row('T-S7H', 'plan gate exits 0 on an argv path'),
  ].join('\n');
  assert.deepEqual(duplicateBoardIds(text), [
    { id: 'T-S7G', lines: [3, 5] },
    { id: 'T-S7H', lines: [4, 6] },
  ]);
});

test('the real board at HEAD has no duplicate row IDs', () => {
  assert.deepEqual(duplicateBoardIds(readFileSync(BOARD, 'utf8')), []);
});
