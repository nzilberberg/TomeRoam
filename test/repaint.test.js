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

// applyScrollY (exercised below) now writes o.mount.scrollTop directly (the
// browse-decouple, PLAN-browse-decouple.md §6 B3) instead of window.scrollTo, so a
// real mount element is needed even though this file drives applyScrollY standalone,
// never through Browse.render/positionOnEnter.
const mount = document.createElement('div');
document.body.appendChild(mount);
Browse.init({ mount });

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

// ---- the page ENTRY POSITION (each browse page owns its own scroller) -------
// Rule, since PLAN-swipe-declone.md §5.3.4: write ONLY a DERIVED position. A list page
// returns to where you left it BY KEEPING ITS OWN scrollTop (Invariant D4), so the rule
// derives nothing for it and `null` is what says so. A files page still opens at the track
// playing HERE, else its top. The `savedY` parameter is gone with the `sy` cache: a `0`
// returned for a list page would OVERWRITE the offset the page element already holds, which
// is the exact inversion the null exists to prevent.
const { entryScrollY, clampY } = Browse._test;

test('entryScrollY: a list page derives NOTHING — null, so positionOnEnter writes nothing', () => {
  assert.equal(entryScrollY('books', null), null);
  assert.equal(entryScrollY('authors', null), null);
  assert.equal(entryScrollY('authorBooks', null), null);
});
test('entryScrollY: null and NOT 0 for a list page — 0 overwrites the page own offset', () => {
  assert.notEqual(entryScrollY('books', null), 0,
    'returning 0 here writes the top over a retained scroll position on every re-entry');
});
test('entryScrollY: a files page opens at the locally-playing track', () => {
  assert.equal(entryScrollY('files', 830), 830);
});
test('entryScrollY: a files page for a book not playing here opens at the top', () => {
  assert.equal(entryScrollY('files', null), 0);
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

// ---- overlapping scroll restorations -------------------------------------
// DELETED by PLAN-swipe-declone.md Stage 2 (plan §10, §12 item 17). The .116 review's
// finding was about a STALE restore finalizer clearing a NEWER restoration ownership
// token, and that whole mechanism — the `sy` cache, the `restoring` flag, its
// begin/end token pair and the two-frame finalizer — existed only because two browse
// pages shared one scroller. Each page now owns its own scroll box, so showing a
// different page resizes nothing, clamps nothing and fires no scroll event to suppress:
// there is no restoration to own and no token to steal. These cells are not narrowed —
// they have no subject left.
