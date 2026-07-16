// Repaint-layer tests (js/browse.js), run against a real DOM (jsdom). This is the
// code that churned the most during the tile-flash saga and had ZERO coverage
// because it's DOM-coupled. These guard the bugs that actually shipped:
//   • .28: the row's _sig writer and patchRows' comparator used DIFFERENT
//     projections → every row looked "changed" → the whole carousel rebuilt.
//   • active-book flash: rebuilding a tile for an INVISIBLE field (lastViewedAt).
//   • keepCover reusing an unchanged, already-decoded cover so a rebuild doesn't
//     re-decode/flash it.
const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body></body>');
global.window = dom.window;
global.document = dom.window.document;
global.Plex = { artUrl: (t) => (t ? 'art:' + t : null) };   // bookRow builds a cover URL via this
global.window.Plex = global.Plex;

const Browse = require('../js/browse.js');
const { patchRows, bookSig } = Browse;          // public API
const { keepCover, bookRow } = Browse._test;    // internals

// A library book. leafCount/viewedLeafCount are the progress fields the tile
// shows; lastViewedAt/addedAt are invisible bookkeeping that churns on the active
// book every open.
const book = (rk, over) => ({
  ratingKey: rk, thumb: '/t/' + rk, title: 'B' + rk, parentTitle: 'Auth',
  leafCount: 0, viewedLeafCount: 0, lastViewedAt: Number(rk), addedAt: Number(rk), ...over,
});
const carousel = (books) => { const c = document.createElement('div'); for (const b of books) c.appendChild(bookRow(b)); return c; };
const rows = (c) => [...c.querySelectorAll('[data-key]')];

// ---- bookSig: the visible projection ---------------------------------------
test('bookSig ignores invisible churn (lastViewedAt/addedAt) but tracks visible fields', () => {
  const b = book('1');
  assert.equal(bookSig(b), bookSig({ ...b, lastViewedAt: 9e9, addedAt: 9e9 }), 'invisible fields must not change the sig');
  assert.notEqual(bookSig(b), bookSig({ ...b, viewedLeafCount: 3 }), 'progress is visible → changes the sig');
  assert.notEqual(bookSig(b), bookSig({ ...b, title: 'X' }), 'title is visible');
  assert.notEqual(bookSig(b), bookSig({ ...b, thumb: '/t/other' }), 'cover is visible');
});

// ---- the .28 invariant: writer and comparator share ONE projection ----------
test('bookRow._sig === bookSig(book) (writer and patchRows comparator cannot diverge)', () => {
  const b = book('1');
  const el = bookRow(b);
  assert.equal(el._sig, bookSig(b));
  assert.equal(el.dataset.key, '1');
});

// ---- patchRows: minimal DOM churn ------------------------------------------
test('patchRows: identical content → NOT a single row rebuilt (same node instances)', () => {
  const books = [book('1'), book('2'), book('3')];
  const c = carousel(books);
  const before = rows(c);
  assert.equal(patchRows(c, books, bookRow, bookSig), true);
  rows(c).forEach((el, i) => assert.strictEqual(el, before[i], 'row ' + i + ' kept'));
});

test('patchRows: only lastViewedAt changed → tile NOT rebuilt (the active-book flash bug)', () => {
  const books = [book('1'), book('2')];
  const c = carousel(books);
  const before = rows(c);
  const bumped = books.map((b) => ({ ...b, lastViewedAt: b.lastViewedAt + 5000 }));
  patchRows(c, bumped, bookRow, bookSig);
  rows(c).forEach((el, i) => assert.strictEqual(el, before[i], 'invisible change must leave the node alone'));
});

test('patchRows: a visible change rebuilds ONLY that row', () => {
  const books = [book('1'), book('2'), book('3')];
  const c = carousel(books);
  const before = rows(c);
  const changed = books.map((b) => (b.ratingKey === '2' ? { ...b, title: 'NEW' } : b));
  patchRows(c, changed, bookRow, bookSig);
  const after = rows(c);
  assert.strictEqual(after[0], before[0], 'unchanged kept');
  assert.notStrictEqual(after[1], before[1], 'changed rebuilt');
  assert.strictEqual(after[2], before[2], 'unchanged kept');
  assert.equal(after[1].querySelector('.title').textContent, 'NEW');
});

test('REGRESSION .28: a comparator projection different from the writer rebuilds EVERY row', () => {
  const books = [book('1'), book('2'), book('3')];
  const c = carousel(books);                 // rows written with _sig = bookSig(b)
  const before = rows(c);
  const wholeRecordSig = (b) => JSON.stringify(b);   // ≠ bookSig → never matches _sig
  patchRows(c, books, bookRow, wholeRecordSig);
  rows(c).forEach((el, i) => assert.notStrictEqual(el, before[i], 'divergent sig → all rebuilt (the shipped bug)'));
});

test('patchRows: a changed key SET returns false → caller full-rebuilds', () => {
  const c = carousel([book('1'), book('2')]);
  assert.equal(patchRows(c, [book('1'), book('2'), book('3')], bookRow, bookSig), false, 'added');
  assert.equal(patchRows(c, [book('1')], bookRow, bookSig), false, 'removed');
  assert.equal(patchRows(c, [book('1'), book('9')], bookRow, bookSig), false, 'swapped key');
});

// ---- keepCover: reuse an unchanged, already-decoded cover -------------------
test('keepCover: same art + loaded → transplants the decoded <img> (no reload/flash)', () => {
  const oldRow = bookRow(book('1'));
  const newRow = bookRow(book('1'));
  const oldImg = oldRow.querySelector('img.cover');
  oldImg.dataset.artState = 'done';                 // simulate a finished load
  keepCover(oldRow, newRow);
  assert.strictEqual(newRow.querySelector('img.cover'), oldImg, 'old decoded node moved into the new row');
});

test('keepCover: different art → does NOT transplant (cover genuinely changed)', () => {
  const oldRow = bookRow(book('1', { thumb: '/t/OLD' }));
  const newRow = bookRow(book('1', { thumb: '/t/NEW' }));
  oldRow.querySelector('img.cover').dataset.artState = 'done';
  const newImg = newRow.querySelector('img.cover');
  keepCover(oldRow, newRow);
  assert.strictEqual(newRow.querySelector('img.cover'), newImg, 'new cover kept → will load the new art');
});

test('keepCover: old cover not finished loading → does NOT transplant', () => {
  const oldRow = bookRow(book('1'));
  const newRow = bookRow(book('1'));
  const newImg = newRow.querySelector('img.cover');   // oldImg.artState !== 'done'
  keepCover(oldRow, newRow);
  assert.strictEqual(newRow.querySelector('img.cover'), newImg);
});

// ---- per-page scroll memory (browse pages share ONE document scroll) --------
// Rule: Books/Authors/an author's books return to where you left them; a files
// page never restores — it opens at the track playing HERE, else the top.
const { entryScrollY, clampY } = Browse._test;

test('entryScrollY: a list page returns to its saved position', () => {
  assert.equal(entryScrollY('books', 1400, null), 1400);
  assert.equal(entryScrollY('authors', 220, null), 220);
  assert.equal(entryScrollY('authorBooks', 90, null), 90);
});
test('entryScrollY: a never-visited list page opens at the top', () => {
  assert.equal(entryScrollY('books', 0, null), 0);
  assert.equal(entryScrollY('books', undefined, null), 0);
});
test('entryScrollY: a files page opens at the locally-playing track, NOT a saved position', () => {
  assert.equal(entryScrollY('files', 5000, 830), 830);   // saved position deliberately ignored
});
test('entryScrollY: a files page for a book not playing here opens at the top', () => {
  assert.equal(entryScrollY('files', 5000, null), 0);
});
test('clampY: a track near the END lands as close to the top as the document allows', () => {
  // want y=9000 but only 2400 of scroll exists → clamped (can't reach the top)
  assert.equal(clampY(9000, 3000, 600), 2400);
});
test('clampY: never negative, and rounds', () => {
  assert.equal(clampY(-50, 3000, 600), 0);
  assert.equal(clampY(120.6, 3000, 600), 121);
  assert.equal(clampY(500, 400, 600), 0);   // content shorter than the viewport
});

// ---- overlapping scroll restorations (the .116 review's finding) ------------
// applyScrollY clears `restoring` from a callback two animation frames later. With
// no ownership token, an OLDER restore's finalizer clears the flag out from under a
// NEWER restore that started in between — and the scroll listener then records the
// swap's transitional/clamped position over the arriving page's remembered `sy`,
// destroying exactly what this system exists to preserve. Same stale-finalizer class
// as the .89 connect() probe bug. Driven with a fake rAF so the interleaving is
// deterministic rather than a race.
const { applyScrollY, isRestoring } = Browse._test;

let frames = [];
global.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
global.window.scrollTo = () => {};
const runOneFrame = () => { const due = frames; frames = []; due.forEach((cb) => cb()); };

test('a stale restore finalizer cannot end a newer restore', () => {
  frames = [];
  applyScrollY(100);            // restore A
  assert.equal(isRestoring(), true);
  runOneFrame();                // only A's FIRST frame — A's finalizer is still pending

  applyScrollY(900);            // restore B starts before A finished
  assert.equal(isRestoring(), true);

  runOneFrame();                // A's stale 2nd frame fires here (+ B's 1st)
  assert.equal(isRestoring(), true, 'A must NOT release B\'s restoration');

  runOneFrame();                // B's own 2nd frame
  assert.equal(isRestoring(), false, 'B\'s own finalizer ends it');
});

test('a restore in flight is not ended by an unrelated page swap taking ownership', () => {
  frames = [];
  applyScrollY(100);            // restore A
  runOneFrame();                // A frame 1
  Browse._test.showPage('nope');   // a swap takes ownership (no finalizer of its own)
  runOneFrame();                // A's stale finalizer must not clear the swap's guard
  runOneFrame();
  assert.equal(isRestoring(), true, 'the swap owns the guard until its applyScrollY clears it');
  applyScrollY(0);              // the arriving page's restore
  runOneFrame(); runOneFrame();
  assert.equal(isRestoring(), false);
});
