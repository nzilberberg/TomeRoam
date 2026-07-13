// Tests for js/plex.js internals (connection ordering + book mapping), loaded
// as the real module with browser globals stubbed by env.js.
const { test } = require('node:test');
const assert = require('node:assert');
const { install } = require('./env.js');

const storage = install();
const Plex = require('../js/plex.js');
const { kindOf, orderByLastKind, mapBook, changed } = Plex._test;

// The bg-revalidate "did it differ" test MUST be order-insensitive: the IDB cache
// returns records in ratingKey order while the live fetch is in Plex order, so a
// naive stringify reported "changed" every time → every cover flashed on reload.
test('changed(): same items in a different order → NOT changed (no flash)', () => {
  const a = [{ ratingKey: '1', title: 'A' }, { ratingKey: '2', title: 'B' }, { ratingKey: '3', title: 'C' }];
  const b = [a[2], a[0], a[1]];                 // reordered, identical content
  assert.equal(changed(a, b), false);
});

test('changed(): a real content difference → changed', () => {
  const a = [{ ratingKey: '1', viewedLeafCount: 0 }, { ratingKey: '2', viewedLeafCount: 0 }];
  const b = [{ ratingKey: '1', viewedLeafCount: 3 }, { ratingKey: '2', viewedLeafCount: 0 }];
  assert.equal(changed(a, b), true);
});

test('changed(): different length → changed; non-arrays compared directly', () => {
  assert.equal(changed([{ ratingKey: '1' }], [{ ratingKey: '1' }, { ratingKey: '2' }]), true);
  assert.equal(changed({ x: 1 }, { x: 1 }), false);
  assert.equal(changed({ x: 1 }, { x: 2 }), true);
});

test('kindOf classifies local / relay / remote', () => {
  assert.equal(kindOf({ local: true }), 'local');
  assert.equal(kindOf({ relay: true }), 'relay');
  assert.equal(kindOf({}), 'remote');
});

test('orderByLastKind: no remembered kind → original order untouched', () => {
  storage.removeItem('pb_connKind');
  const conns = [{ local: true, uri: 'a' }, { relay: true, uri: 'b' }];
  assert.deepEqual(orderByLastKind(conns).map((c) => c.uri), ['a', 'b']);
});

test('orderByLastKind: the last-good kind is probed first (off-home → relay immediately)', () => {
  storage.setItem('pb_connKind', 'relay');
  const conns = [{ local: true, uri: 'lan1' }, { local: true, uri: 'lan2' }, { relay: true, uri: 'relay' }];
  const out = orderByLastKind(conns).map((c) => c.uri);
  assert.equal(out[0], 'relay');
  assert.deepEqual(out.slice(1), ['lan1', 'lan2']);   // others keep their relative order
});

test('orderByLastKind: does not mutate its input', () => {
  storage.setItem('pb_connKind', 'relay');
  const conns = [{ local: true, uri: 'a' }, { relay: true, uri: 'b' }];
  orderByLastKind(conns);
  assert.deepEqual(conns.map((c) => c.uri), ['a', 'b']);
});

test('mapBook fills safe defaults for sparse Plex metadata', () => {
  const b = mapBook({ ratingKey: '9' });
  assert.equal(b.title, 'Book');
  assert.equal(b.leafCount, 0);
  assert.equal(b.viewedLeafCount, 0);
  assert.equal(b.thumb, null);
  assert.equal(b.titleSort, '');
});

test('mapBook falls back to parentThumb and titleSort to title', () => {
  const b = mapBook({ ratingKey: '9', title: 'T', parentThumb: '/p' });
  assert.equal(b.thumb, '/p');
  assert.equal(b.titleSort, 'T');
});
