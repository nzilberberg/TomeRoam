// Table tests for the service worker's extracted pure logic (js/swkit.js).
// The SW itself needs a browser to run, but these two functions are where silent
// bugs hid — a suffix range served as the file head, or a routing-table slip that
// caches a probe URL. sw.js importScripts this same module and calls SWKit.*, so
// the code under test is the code that ships.
const { test } = require('node:test');
const assert = require('node:assert');
const { parseRange, routeFor, isImageRoute } = require('../js/swkit.js');

const SIZE = 1000;

test('parseRange: normal bounded range', () => {
  assert.deepEqual(parseRange('bytes=0-1', SIZE), { start: 0, end: 1 });
  assert.deepEqual(parseRange('bytes=200-300', SIZE), { start: 200, end: 300 });
});

test('parseRange: open-ended "bytes=N-" runs to the last byte', () => {
  assert.deepEqual(parseRange('bytes=100-', SIZE), { start: 100, end: 999 });
});

test('parseRange: SUFFIX "bytes=-N" returns the LAST N bytes (the M4B tail bug)', () => {
  assert.deepEqual(parseRange('bytes=-500', SIZE), { start: 500, end: 999 });
});

test('parseRange: suffix larger than the file clamps to the whole file', () => {
  assert.deepEqual(parseRange('bytes=-5000', SIZE), { start: 0, end: 999 });
});

test('parseRange: end past EOF is clamped to size-1', () => {
  assert.deepEqual(parseRange('bytes=999-2000', SIZE), { start: 999, end: 999 });
});

test('parseRange: unsatisfiable ranges → 416', () => {
  assert.deepEqual(parseRange('bytes=1000-', SIZE), { status: 416 });   // start at EOF
  assert.deepEqual(parseRange('bytes=-0', SIZE), { status: 416 });      // last 0 bytes
});

test('parseRange: garbage header falls back to the full extent (matches prior behavior)', () => {
  assert.deepEqual(parseRange('bytes=abc', SIZE), { start: 0, end: 999 });
});

test('routeFor: same-origin build.json is a network-only probe (never cached)', () => {
  assert.equal(routeFor({ sameOrigin: true, pathname: '/TomeRoam/build.json', destination: '' }), 'probe');
});

test('routeFor: __dl audio is served before the shell branch', () => {
  assert.equal(routeFor({ sameOrigin: true, pathname: '/TomeRoam/__dl/12345', destination: 'audio' }), 'download');
});

test('routeFor: other same-origin assets are shell (cache-first)', () => {
  assert.equal(routeFor({ sameOrigin: true, pathname: '/TomeRoam/js/app.js', destination: 'script' }), 'shell');
  assert.equal(routeFor({ sameOrigin: true, pathname: '/TomeRoam/', destination: 'document' }), 'shell');
});

test('routeFor: cross-origin cover art → image', () => {
  assert.equal(routeFor({ sameOrigin: false, pathname: '/x/y', destination: 'image' }), 'image');
  assert.equal(routeFor({ sameOrigin: false, pathname: '/cover.jpg', destination: '' }), 'image');
  assert.equal(routeFor({ sameOrigin: false, pathname: '/photo/:/transcode', destination: '' }), 'image');
  assert.equal(routeFor({ sameOrigin: false, pathname: '/library/metadata/1/thumb/9', destination: '' }), 'image');
});

test('routeFor: cross-origin Plex API + media fall through untouched (passthrough)', () => {
  assert.equal(routeFor({ sameOrigin: false, pathname: '/library/sections/3/all', destination: '' }), 'passthrough');
  assert.equal(routeFor({ sameOrigin: false, pathname: '/library/parts/1/file.m4b', destination: 'audio' }), 'passthrough');
});

test('isImageRoute distinguishes cover art from API paths', () => {
  assert.equal(isImageRoute('image', '/anything'), true);
  assert.equal(isImageRoute('', '/library/sections/3/all'), false);
});
