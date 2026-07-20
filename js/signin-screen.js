// signin-screen.js — the Plex sign-in screen, extracted from app.js so it owns
// the PIN flow and its button/link/info lifecycle in one place. Review #20
// (screen ownership), same pattern as js/options-screen.js / downloads-screen.js.
//
// A VIEW, not logic: it drives the sign-in DOM and calls Plex's PIN helpers.
// app.js injects what only it owns — enterApp (hand off to the loaded app once
// signed in) and toast — plus byId + Plex. app.js keeps the show()/view-switch
// and the post-sign-out teardown; it calls reset() to return the button to idle.
const SignInScreen = (() => {
  // Injected by app.js: { byId, Plex, enterApp, toast }
  let d = null;

  // Return the button to its idle "Sign in with Plex" state — after a failed
  // attempt, and (via app.js) after sign-out.
  function reset() {
    const btn = d.byId('signinBtn');
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = 'Sign in with Plex';
  }

  // Separate-tab + poll PIN flow — NOT redirect/forwardUrl (that hangs after 2FA;
  // see the sign-in lesson). Opens the Plex approval page in a new tab and polls.
  async function start() {
    const $ = d.byId;
    const btn = $('signinBtn');
    const info = $('signinInfo');
    const link = $('signinLink');
    btn.disabled = true; btn.textContent = 'Contacting Plex…';
    try {
      info.textContent = 'Creating sign-in request…';
      const { id, code, authUrl } = await d.Plex.startPin();
      const w = window.open(authUrl, '_blank');
      link.href = authUrl;
      link.textContent = (w ? 'Approve in the Plex tab' : 'Tap to open Plex') + ` — code ${code}`;
      link.classList.remove('hidden');
      btn.textContent = 'Waiting for approval…';
      await d.Plex.pollPin(id, {
        tries: 90, intervalMs: 2000,           // ~3 min, room for 2FA
        onTick: (n) => { info.textContent = `Approve in the Plex tab, then come back here. Waiting… (${n})`; },
      });
      // Approval succeeded → the Plex tab has done its job. Close it BEFORE entering
      // the app: closing a script-opened window returns focus to its opener, so the
      // user lands back on TomeRoam already showing Home instead of being left
      // staring at plex.tv wondering whether it worked and having to find the tab
      // themselves. Only on SUCCESS — on failure or timeout the user may still be
      // mid-approval (2FA), and closing it out from under them would be worse.
      // Best-effort: a window we did not really open (popup blocked → w is null) or
      // one the platform refuses to close just stays, exactly as it does today.
      try { if (w && !w.closed) w.close(); } catch { /* platform refused — leave it */ }
      link.classList.add('hidden'); info.textContent = 'Signed in! Loading…';
      return d.enterApp();
    } catch (e) {
      reset();
      info.textContent = ''; link.classList.add('hidden');
      d.toast(e.message || 'Sign-in failed');
    }
  }

  function init(deps) { d = deps; d.byId('signinBtn').addEventListener('click', start); }

  return { init, reset };
})();

if (typeof window !== 'undefined') window.SignInScreen = SignInScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = SignInScreen;
