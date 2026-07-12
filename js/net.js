// net.js — connectivity model, reconnect orchestration, and the offline banner.
//
// Core principle from the spec: "online" is NOT one global boolean. GitHub
// (the app host) being reachable says nothing about Plex, and vice-versa. So we
// track these axes SEPARATELY and let the UI + sync logic react to each:
//
//   browserThinksOnline   navigator.onLine (a HINT only — never trusted as proof)
//   appHostReachable      our build.json fetched OK (GitHub Pages / local bundle)
//   plexReachable         the configured Plex server answered /identity
//   plexAuthValid         an authed Plex call didn't 401
//   cachedAppShellAvailable  a service worker is controlling us (shell is cached)
//   cachedMetadataAvailable  IndexedDB has a last-known library
//   pendingSyncCount      queued progress writes waiting to flush
//   updateReady           a fully-downloaded new build is waiting to activate
//
// navigator.onLine is a hint; the truth comes from real reachability probes with
// gentle exponential backoff + jitter (never aggressive). On a Plex
// unreachable→reachable transition we run one automatic reconnect pass:
// refresh metadata + flush the pending-sync queue safely.
const Net = (() => {
  const S = {
    browserThinksOnline: navigator.onLine !== false,
    appHostReachable: null,
    plexReachable: null,
    plexAuthValid: null,
    cachedAppShellAvailable: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    cachedMetadataAvailable: false,
    pendingSyncCount: 0,
    updateReady: false,
    // freshness / result metadata (for diagnostics)
    lastAppHostCheck: 0, lastAppHostResult: null,
    lastPlexCheck: 0, lastPlexResult: null,
    lastReconnectAt: 0,
    lastUpdateCheck: 0, lastUpdateResult: null,
    hostedBuild: null,          // build advertised by build.json
    cachedReadKinds: {},        // kind -> ts of the last time we served STALE cached data
    mode: detectMode(),
  };

  const dbg = (t, m) => { if (window.PBDebug) PBDebug.log(t, m); };
  let cbChange = () => {};
  let onReconnect = null;
  let waitingReg = null;        // ServiceWorkerRegistration with a waiting worker

  function detectMode() {
    try {
      if (location.hostname === 'tomeroam.local' || location.protocol === 'file:') return 'android-webview-bundled';
      const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
      return standalone ? 'installed-pwa' : 'hosted-pwa';
    } catch { return 'hosted-pwa'; }
  }

  const state = () => ({ ...S });

  function emit() {
    S.cachedAppShellAvailable = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    renderBanner();
    try { cbChange(state()); } catch {}
    if (window.Store) { Store.diagSet('net', sanitizedState()); }
  }

  // ---- reachability probes --------------------------------------------------
  // App host: fetch our own build.json (cache-busted, no-store). This is the
  // ONLY thing that should count as "app host reachable" — it also tells us the
  // deployed build for update detection. A failure here NEVER blocks the app.
  async function checkAppHost() {
    S.lastAppHostCheck = Date.now();
    try {
      const r = await fetch('./build.json?ts=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      S.appHostReachable = true;
      S.lastAppHostResult = 'ok';
      S.hostedBuild = j.build || null;
      S.lastUpdateCheck = Date.now();
      if (j.build && window.PB_BUILD && j.build !== window.PB_BUILD) {
        S.lastUpdateResult = 'update-available:' + j.build;
        // The SW (if any) will download+cache the new build and go `waiting`;
        // setUpdateReady() flips updateReady when that finishes. If there's no SW
        // we still surface the divergence so the user knows to reload.
        if (!navigator.serviceWorker) S.updateReady = true;
      } else {
        S.lastUpdateResult = 'up-to-date';
      }
      dbg('NETCHK', 'appHost ok build=' + (j.build || '?'));
    } catch (e) {
      S.appHostReachable = false;
      S.lastAppHostResult = (e && e.message) || 'unreachable';
      dbg('NETCHK', 'appHost unreachable (' + S.lastAppHostResult + ') — running from cache');
    }
    emit();
    return S.appHostReachable;
  }

  // Plex: reuse plex.js's own connection probe. plexReachable = a base answered;
  // plexAuthValid = an authed call didn't 401 (Plex.signOut clears the token on
  // 401, so isSignedIn flipping false is our auth-invalid signal).
  async function checkPlex() {
    S.lastPlexCheck = Date.now();
    if (!(window.Plex && Plex.isSignedIn())) {
      S.plexReachable = null; S.plexAuthValid = null; S.lastPlexResult = 'signed-out'; emit(); return false;
    }
    const wasReachable = S.plexReachable === true;
    try {
      const ok = await Plex.ping();     // light /identity probe (added in plex.js)
      S.plexReachable = !!ok;
      S.plexAuthValid = Plex.isSignedIn();   // a 401 during ping would have signed us out
      S.lastPlexResult = ok ? 'ok' : 'unreachable';
      dbg('NETCHK', 'plex ' + S.lastPlexResult);
    } catch (e) {
      S.plexReachable = false;
      S.plexAuthValid = Plex.isSignedIn();
      S.lastPlexResult = (e && e.message) || 'unreachable';
    }
    emit();
    if (S.plexReachable && !wasReachable) reconnectPass('plex-recovered');
    return S.plexReachable;
  }

  async function refreshCachedMeta() {
    if (window.Store) { try { S.cachedMetadataAvailable = (await Store.count('books')) > 0; } catch {} }
  }

  // ---- reconnect pass -------------------------------------------------------
  // Runs ONCE per unreachable→reachable transition (deduped): refresh metadata,
  // then flush the pending-sync queue safely (conflict rules live in syncqueue).
  let reconnecting = false;
  async function reconnectPass(why) {
    if (reconnecting) return;
    reconnecting = true;
    S.lastReconnectAt = Date.now();
    dbg('RECONNECT', 'pass (' + why + ')');
    try {
      if (window.Progress) { try { Progress.flush(); Progress.refresh(); } catch {} }
      if (onReconnect) { try { await onReconnect(why); } catch (e) { dbg('RECONNECT', 'refresh cb failed ' + (e && e.message)); } }
      if (window.SyncQueue) { try { await SyncQueue.flush(); } catch (e) { dbg('RECONNECT', 'sync flush failed ' + (e && e.message)); } }
      await refreshCachedMeta();
    } finally {
      reconnecting = false;
      emit();
    }
  }

  // ---- gentle backoff polling ----------------------------------------------
  // Retry cadence while something is unreachable: 5s, 15s, 30s, 60s, then every
  // 2–5min, with jitter. Paused while the tab is hidden (nothing to gain), and
  // stopped entirely once everything is reachable + synced. `pb_autoretry='0'`
  // disables it (user opt-out).
  const STEPS = [5000, 15000, 30000, 60000, 120000];
  let pollTimer = null, stepIdx = 0;
  const autoRetryOn = () => { try { return localStorage.getItem('pb_autoretry') !== '0'; } catch { return true; } };
  const jitter = (ms) => ms + Math.floor(Math.random() * Math.min(ms * 0.3, 60000));

  function everythingHealthy() {
    return S.plexReachable === true && S.plexAuthValid !== false && S.pendingSyncCount === 0;
  }

  function scheduleNext() {
    clearTimeout(pollTimer); pollTimer = null;
    if (!autoRetryOn()) return;
    if (everythingHealthy()) { stepIdx = 0; return; }   // nothing to poll for
    if (document.hidden) return;                         // resumes on visibility
    const base = STEPS[Math.min(stepIdx, STEPS.length - 1)];
    stepIdx++;
    pollTimer = setTimeout(runPoll, jitter(base));
  }
  async function runPoll() {
    if (document.hidden) return;                         // will re-arm on foreground
    // Prefer Plex (the thing playback needs); check app host less often.
    await checkPlex();
    if (stepIdx % 3 === 0) await checkAppHost();
    scheduleNext();
  }
  function kickPolling(resetStep) {
    if (resetStep) stepIdx = 0;
    scheduleNext();
  }

  // ---- offline banner UI ----------------------------------------------------
  // A single unobtrusive strip under the top bar. Non-scary wording; shows the
  // freshness of cached data and pending-sync count; offers Reload on update and
  // Retry when unreachable.
  let bannerEl = null;
  function injectStyle() {
    if (document.getElementById('pbnet-style')) return;
    const s = document.createElement('style');
    s.id = 'pbnet-style';
    s.textContent = `
      /* Hidden by default. A stray display:flex here (there used to be one) makes
         an EMPTY gray bar stick over the UI forever — only .show may show it. */
      #pbnet{position:fixed;left:0;right:0;top:0;z-index:45;display:none;
        font:13px/1.3 system-ui,-apple-system,sans-serif;
        padding:calc(env(safe-area-inset-top) + 6px) 12px 6px;
        background:#2a2f3a;color:#e7ecf3;box-shadow:0 2px 10px rgba(0,0,0,.35);
        align-items:center;gap:10px}
      #pbnet.show{display:flex}
      #pbnet.update{background:#1f3a2a}
      #pbnet .pbnet-msg{flex:1;min-width:0}
      #pbnet .pbnet-sub{opacity:.75;font-size:11.5px}
      #pbnet button{background:rgba(255,255,255,.14);color:inherit;border:1px solid rgba(255,255,255,.25);
        border-radius:7px;padding:5px 11px;font-size:12.5px;white-space:nowrap}`;
    document.head.appendChild(s);
  }
  function ensureBanner() {
    if (bannerEl) return bannerEl;
    injectStyle();
    bannerEl = document.createElement('div');
    bannerEl.id = 'pbnet';
    bannerEl.innerHTML = '<div class="pbnet-msg"><div class="pbnet-main"></div><div class="pbnet-sub"></div></div><button class="pbnet-act"></button>';
    (document.body || document.documentElement).appendChild(bannerEl);
    bannerEl.querySelector('.pbnet-act').addEventListener('click', onAction);
    return bannerEl;
  }
  const fmtTime = (ms) => { if (!ms) return ''; const d = new Date(ms); let h = d.getHours(), m = d.getMinutes(); const ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2,'0')} ${ap}`; };

  function banner() {
    // Priority: a ready update is the most actionable; otherwise reachability.
    if (S.updateReady) return { cls: 'update', main: 'Update available — reload to apply.', sub: '', act: 'Reload' };
    const plexDown = S.plexReachable === false || (S.browserThinksOnline === false);
    if (plexDown) {
      const when = window.Store ? S.cachedMetaSyncedAt : 0;
      const stamp = when ? ' from ' + fmtTime(when) : '';
      const main = S.browserThinksOnline === false
        ? 'Offline — showing cached library' + stamp + '.'
        : 'Plex unavailable — showing cached data' + stamp + '.';
      const sub = S.pendingSyncCount > 0
        ? `${S.pendingSyncCount} change${S.pendingSyncCount > 1 ? 's' : ''} will sync when Plex is reachable.`
        : 'Playback needs Plex unless a book was downloaded.';
      return { cls: '', main, sub, act: 'Retry' };
    }
    if (S.pendingSyncCount > 0) return { cls: '', main: `Syncing ${S.pendingSyncCount} change${S.pendingSyncCount > 1 ? 's' : ''}…`, sub: '', act: '' };
    return null;   // healthy → hide
  }
  function renderBanner() {
    const el = ensureBanner();
    const b = banner();
    if (!b) { el.classList.remove('show'); return; }
    el.className = 'show' + (b.cls ? ' ' + b.cls : '');
    el.querySelector('.pbnet-main').textContent = b.main;
    const sub = el.querySelector('.pbnet-sub');
    sub.textContent = b.sub || ''; sub.style.display = b.sub ? '' : 'none';
    const act = el.querySelector('.pbnet-act');
    el._action = b.act;
    act.textContent = b.act || ''; act.style.display = b.act ? '' : 'none';
  }
  function onAction() {
    const a = bannerEl && bannerEl._action;
    if (a === 'Reload') applyUpdate();
    else if (a === 'Retry') { kickPolling(true); checkPlex(); checkAppHost(); }
  }

  // ---- service-worker update wiring ----------------------------------------
  function setUpdateReady(reg) {
    waitingReg = reg || waitingReg;
    S.updateReady = true;
    dbg('SW', 'update downloaded — waiting to apply');
    emit();
  }
  function applyUpdate() {
    try {
      const w = waitingReg && waitingReg.waiting;
      if (w) {
        // Reload once the new worker takes control (initServiceWorker listens for
        // controllerchange). Ask it to activate now.
        w.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => location.reload(), 400);
      } else {
        location.reload();
      }
    } catch { location.reload(); }
  }

  // ---- plex.js signals ------------------------------------------------------
  // plex.js calls markCachedRead when it serves STALE IndexedDB data (a network
  // read failed), and noteFresh when a live read succeeded. This drives the
  // "cached/stale" labeling honestly.
  function markCachedRead(kind) {
    S.cachedReadKinds[kind] = Date.now();
    S.plexReachable = false;
    if (window.Store) Store.syncedAt(kind).then((ts) => { S.cachedMetaSyncedAt = ts; emit(); });
    else emit();
    kickPolling(true);
  }
  function noteFresh(kind) {
    delete S.cachedReadKinds[kind];
    if (S.plexReachable !== true) { S.plexReachable = true; }
    if (window.Store) Store.stampSync && (S.cachedMetaSyncedAt = Date.now());
    emit();
  }
  function setPendingCount(n) { S.pendingSyncCount = n | 0; emit(); scheduleNext(); }

  // Sanitized snapshot for diagnostics (never any token/URL/private detail).
  function sanitizedState() {
    return {
      mode: S.mode,
      browserThinksOnline: S.browserThinksOnline,
      appHostReachable: S.appHostReachable, plexReachable: S.plexReachable, plexAuthValid: S.plexAuthValid,
      cachedAppShellAvailable: S.cachedAppShellAvailable, cachedMetadataAvailable: S.cachedMetadataAvailable,
      pendingSyncCount: S.pendingSyncCount, updateReady: S.updateReady,
      hostedBuild: S.hostedBuild, appBuild: window.PB_BUILD || null,
      lastAppHostCheck: S.lastAppHostCheck, lastAppHostResult: S.lastAppHostResult,
      lastPlexCheck: S.lastPlexCheck, lastPlexResult: S.lastPlexResult,
      lastReconnectAt: S.lastReconnectAt,
      lastUpdateCheck: S.lastUpdateCheck, lastUpdateResult: S.lastUpdateResult,
    };
  }

  // ---- lifecycle ------------------------------------------------------------
  async function init({ onChange, onReconnect: recb } = {}) {
    if (onChange) cbChange = onChange;
    if (recb) onReconnect = recb;
    await refreshCachedMeta();
    if (window.Store) { try { S.cachedMetaSyncedAt = await Store.syncedAt('books'); } catch {} }

    window.addEventListener('online', () => {
      S.browserThinksOnline = true; dbg('NET', 'online hint'); emit();
      kickPolling(true); checkPlex(); checkAppHost();
    });
    window.addEventListener('offline', () => { S.browserThinksOnline = false; dbg('NET', 'offline hint'); emit(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { kickPolling(true); if (!everythingHealthy()) runPoll(); } });

    emit();
    // First background probes (do NOT block startup — fire and forget). We check
    // the app host now (cheap, separate from Plex, drives update detection) but do
    // NOT eagerly probe Plex here: enterApp is already connecting, and the data
    // path signals reachability via noteFresh/markCachedRead. The backoff loop
    // (kickPolling) picks Plex up shortly if it's still unknown/unreachable.
    checkAppHost();
    kickPolling(true);
  }

  return {
    init, state, checkAppHost, checkPlex, reconnectPass,
    setUpdateReady, applyUpdate, markCachedRead, noteFresh, setPendingCount,
    sanitizedState, kickPolling,
  };
})();

// Expose on window (a top-level `const Net` is a lexical global, not window.Net).
if (typeof window !== 'undefined') window.Net = Net;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Net;
