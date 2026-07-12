// Tests for js/net.js pure logic: the offline-banner decision (the stuck-gray-bar
// bug lived here — banner() must return null when healthy), mode detection,
// health, and that the sanitized state never leaks a token.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

// Minimal browser stubs so the module loads (it reads navigator/location/window
// while building its state object). No DOM is exercised — we call banner()
// directly, which is pure.
global.navigator = { onLine: true, serviceWorker: { controller: null } };
global.location = { hostname: 'localhost', protocol: 'https:' };
global.window = {
  matchMedia: () => ({ matches: false }),
  navigator: global.navigator,
  location: global.location,
  PB_BUILD: '2026-07-12.7',
};
global.document = { addEventListener() {} };
const Net = require('../js/net.js');
const { banner, detectMode, everythingHealthy, set } = Net._test;

beforeEach(() => set({
  updateReady: false, plexReachable: true, plexAuthValid: true,
  browserThinksOnline: true, pendingSyncCount: 0, cachedMetaSyncedAt: 0,
}));

test('banner is hidden (null) when everything is healthy', () => {
  assert.equal(banner(), null);
});

test('banner shows "Plex unavailable" with a Retry action when Plex is unreachable', () => {
  set({ plexReachable: false });
  const b = banner();
  assert.ok(b, 'banner shown');
  assert.match(b.main, /Plex unavailable/);
  assert.equal(b.act, 'Retry');
});

test('banner says "Offline" when the browser is offline', () => {
  set({ browserThinksOnline: false, plexReachable: true });
  assert.match(banner().main, /Offline/);
});

test('a ready update takes priority and offers Reload', () => {
  set({ updateReady: true, plexReachable: false, browserThinksOnline: false });
  const b = banner();
  assert.match(b.main, /Update available/);
  assert.equal(b.act, 'Reload');
});

test('pending-sync count is surfaced when otherwise healthy', () => {
  set({ pendingSyncCount: 3 });
  assert.match(banner().main, /3 change/);
});

test('an unreachable-Plex banner mentions the pending count in its subtext', () => {
  set({ plexReachable: false, pendingSyncCount: 2 });
  assert.match(banner().sub, /2 changes will sync/);
});

test('everythingHealthy requires reachable Plex, valid auth, and an empty queue', () => {
  set({ plexReachable: true, plexAuthValid: true, pendingSyncCount: 0 });
  assert.equal(everythingHealthy(), true);
  set({ pendingSyncCount: 1 });
  assert.equal(everythingHealthy(), false);
  set({ pendingSyncCount: 0, plexReachable: false });
  assert.equal(everythingHealthy(), false);
});

test('detectMode returns hosted-pwa for a plain browser tab', () => {
  assert.equal(detectMode(), 'hosted-pwa');
});

test('sanitizedState exposes the separate axes and leaks no token', () => {
  const s = Net.sanitizedState();
  for (const k of ['browserThinksOnline', 'appHostReachable', 'plexReachable', 'plexAuthValid', 'pendingSyncCount']) {
    assert.ok(k in s, `axis ${k} present`);
  }
  assert.ok(!/X-Plex-Token|pb_token/i.test(JSON.stringify(s)), 'no token in sanitized state');
});
