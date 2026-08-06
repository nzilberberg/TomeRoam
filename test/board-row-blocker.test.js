// Regression suite for tools/hooks/board-row-blocker-check.mjs.
//
// The gate fires when a board row's next action hands a decision to the user while its blocker
// cell claims nothing is blocking it. The two cells contradict, and the row reads as moving when
// it is parked on a person who was never told they were holding it.
//
// The false-positive case is the one that matters most here and is tested explicitly: a row that
// genuinely waits on the user and SAYS so in its blocker column must pass. A gate that fires on
// correct work is one this project has recorded getting switched off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rowCells, unblockedUserDeferrals, BOARD } from '../tools/hooks/board-row-blocker-check.mjs';

// | id | subject | owner | state | next action | blocker | link |
const row = (id, next, blocker) => `| ${id} | subject | owner | state | ${next} | ${blocker} | link |`;

test('rowCells splits a row into its seven cells', () => {
  assert.deepEqual(rowCells(row('T-01', 'do the thing', 'none')),
    ['T-01', 'subject', 'owner', 'state', 'do the thing', 'none', 'link']);
});

test('a row with a real next action and no blocker passes', () => {
  assert.deepEqual(unblockedUserDeferrals(row('T-01', 'dispatch the coverage auditor', 'none')), []);
});

test('"your call" with blocker none is caught', () => {
  const found = unblockedUserDeferrals(row('T-01', 'your call whether to pursue', 'none'));
  assert.equal(found.length, 1);
  assert.equal(found[0].id, 'T-01');
});

test('"ask the user" with blocker none is caught', () => {
  assert.equal(unblockedUserDeferrals(row('T-02', 'ask the user whether to pursue', 'none')).length, 1);
});

test('an EMPTY blocker cell counts as no blocker', () => {
  assert.equal(unblockedUserDeferrals(row('T-03', 'ask the user', '')).length, 1);
});

test('a dash or em-dash blocker counts as no blocker', () => {
  assert.equal(unblockedUserDeferrals(row('T-04', 'ask the user', '-')).length, 1);
  assert.equal(unblockedUserDeferrals(row('T-05', 'ask the user', '—')).length, 1);
});

test('THE FALSE-POSITIVE CASE: a deferral that NAMES the user as blocker passes', () => {
  assert.deepEqual(unblockedUserDeferrals(row('T-06', 'ask the user whether to pursue', 'the user')), []);
});

test('any named blocker at all clears the row, because naming it is the remedy', () => {
  assert.deepEqual(unblockedUserDeferrals(row('T-07', 'your call', 'waiting on the campaign')), []);
});

test('work that merely involves the user is not a deferral of a decision', () => {
  // T-LP1's real shape: gathering symptoms only the user has is work, not an escalation.
  assert.deepEqual(unblockedUserDeferrals(row('T-08', 'derive the symptoms from the user, then route', 'none')), []);
});

test('a device gesture the user must perform is not a deferral', () => {
  assert.deepEqual(unblockedUserDeferrals(row('T-09', 'have the user swipe on the device and read the log', 'none')), []);
});

test('the reported line number is 1-based', () => {
  const text = ['# Board', '', row('T-10', 'ask the user', 'none')].join('\n');
  assert.equal(unblockedUserDeferrals(text)[0].line, 3);
});

test('several violating rows are all reported', () => {
  const text = [row('T-11', 'your call', 'none'), row('T-12', 'fine', 'none'), row('T-13', 'ask the user', '')].join('\n');
  assert.deepEqual(unblockedUserDeferrals(text).map((b) => b.id), ['T-11', 'T-13']);
});

test('a short row missing the blocker cell is not this gate\'s business', () => {
  assert.deepEqual(unblockedUserDeferrals('| T-14 | subject | owner |'), []);
});

test('prose mentioning "your call" outside a row is ignored', () => {
  assert.deepEqual(unblockedUserDeferrals('That one is your call, and I have not routed it.'), []);
});

test('reproduces the 2026-08-06 defect this gate was built for', () => {
  const text = row('T-S7I', 'ask the user whether to pursue; it is the mechanism behind T-S7E', 'none');
  const found = unblockedUserDeferrals(text);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, 'T-S7I');
});

test('the real board at HEAD has no unblocked user deferrals', () => {
  assert.deepEqual(unblockedUserDeferrals(readFileSync(BOARD, 'utf8')), []);
});
