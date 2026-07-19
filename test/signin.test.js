// signin-screen.js — the PIN flow's window lifecycle.
//
// Grounded in a reported defect (2026-07-19): after approving in Plex you are left
// looking at the plex.tv tab, with no sign the app has signed you in, and you have to
// find the app tab yourself. The handle needed to close it was already being captured
// (signin-screen.js:33) and used only to word the link text.
//
// Drives the REAL module with the same dependency shape app.js injects, plus a fake
// window.open — "was the tab closed" is the whole assertion.
const { test } = require('node:test');
const assert = require('node:assert');

const SignInScreen = require('../js/signin-screen.js');

/** Minimal stand-in for the elements the screen touches. */
function el() {
  const cls = new Set();
  return {
    disabled: false, textContent: '', href: '',
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    addEventListener() {},
  };
}

/**
 * Wire the real module and hand back its click handler — the same entry point the
 * button uses, so nothing is called that a user could not reach.
 * @param {object} o  open: what window.open returns · poll: async pin result · calls: sink
 */
function wire(o) {
  const els = { signinBtn: el(), signinInfo: el(), signinLink: el() };
  let handler = null;
  els.signinBtn.addEventListener = (evt, fn) => { if (evt === 'click') handler = fn; };
  global.window = { open: () => o.open };
  const calls = [];
  SignInScreen.init({
    byId: (id) => els[id],
    Plex: {
      startPin: async () => ({ id: 'p', code: 'C', authUrl: 'https://app.plex.tv/auth#?x' }),
      pollPin: o.poll,
    },
    enterApp: () => calls.push('enterApp'),
    toast: (m) => calls.push('toast:' + m),
  });
  return { els, calls, start: () => handler() };
}

const openable = () => ({ closed: false, close() { this.closed = true; } });

test('a SUCCESSFUL sign-in closes the Plex tab and enters the app', async () => {
  const win = openable();
  const h = wire({ open: win, poll: async () => true });

  await h.start();

  assert.equal(win.closed, true, 'the Plex tab must close — being left on plex.tv is the reported bug');
  assert.deepEqual(h.calls, ['enterApp'], 'and the app is entered');
});

test('a FAILED sign-in leaves the Plex tab open — the user may still be mid-2FA', async () => {
  const win = openable();
  const h = wire({ open: win, poll: async () => { throw new Error('Sign-in timed out — please try again.'); } });

  await h.start();

  assert.equal(win.closed, false, 'closing it out from under an in-progress approval would be worse');
  assert.ok(h.calls.some((c) => c.startsWith('toast:')), 'the failure is surfaced');
  assert.ok(!h.calls.includes('enterApp'));
  assert.equal(h.els.signinBtn.textContent, 'Sign in with Plex', 'button returns to idle');
});

test('a BLOCKED popup (window.open → null) still signs in without throwing', async () => {
  const h = wire({ open: null, poll: async () => true });

  await h.start();

  assert.deepEqual(h.calls, ['enterApp'], 'no window to close is not an error path');
  assert.match(h.els.signinLink.textContent, /Tap to open Plex/, 'and the fallback link wording still applies');
});

test('a window that REFUSES to close does not break sign-in', async () => {
  const h = wire({ open: { closed: false, close() { throw new Error('refused'); } }, poll: async () => true });

  await h.start();

  assert.deepEqual(h.calls, ['enterApp'], 'a platform that refuses close() must not fail the sign-in');
});
