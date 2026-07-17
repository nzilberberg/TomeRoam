// Warmer pure-kernel tests: the AIMD concurrency step and the work-list builder.
// (The pump/gate loop is DOM/timer-coupled and driven live; these cover the logic
// that decides HOW MUCH to fetch and WHAT.)
const { test } = require('node:test');
const assert = require('node:assert');
const Warmer = require('../js/warmer.js');
const { nextConc, buildWork, MAX_CONC } = Warmer._test;

test('nextConc grows by 1 on success, capped at MAX_CONC', () => {
  assert.equal(nextConc(2, true), 3);
  assert.equal(nextConc(MAX_CONC - 1, true), MAX_CONC);
  assert.equal(nextConc(MAX_CONC, true), MAX_CONC);   // never exceeds the browser cap
});

test('nextConc halves on failure, floored at 1', () => {
  assert.equal(nextConc(6, false), 3);
  assert.equal(nextConc(4, false), 2);
  assert.equal(nextConc(2, false), 1);
  assert.equal(nextConc(1, false), 1);                // never stalls to 0
});

test('buildWork enumerates each author (books + bio) then each book (tracks)', () => {
  const authors = [{ ratingKey: 'a1' }, { ratingKey: 'a2' }];
  const books = [{ ratingKey: 'b1' }];
  assert.deepEqual(buildWork(authors, books).work, [
    { t: 'authorBooks', rk: 'a1' }, { t: 'author', rk: 'a1' },
    { t: 'authorBooks', rk: 'a2' }, { t: 'author', rk: 'a2' },
    { t: 'tracks', rk: 'b1' },
  ]);
});

test('buildWork tolerates missing/empty inputs', () => {
  assert.deepEqual(buildWork(null, null), { work: [], skipped: 0 });
  assert.deepEqual(buildWork([], []), { work: [], skipped: 0 });
});
