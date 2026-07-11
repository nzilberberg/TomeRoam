// debug.js — in-app diagnostics for the TomeRoam PWA.
// There's no way to attach a desktop console to an iPhone PWA without a Mac
// (Safari Web Inspector), so we keep a rolling log INSIDE the app that the user
// can open and copy — and js/logpipe.js can stream it to a hidden Plex playlist
// so it's tailable from a desktop in near-realtime (Options → Live debug).
//
// This file owns: the ring buffer + seq numbers, global error capture, the
// audio-element instrumentation + stall watchdog (watchAudio), lifecycle
// logging, state snapshots (registerState/snapshot), the on-screen panel, and
// the lazy-loaded Eruda console (Options → Console).
//
// Open the panel: Options → Open log, #debug in the URL, or 5 quick taps in the
// top strip of the screen. Everything here is dependency-free and safe to leave
// shipped; it's inert until you open it.
(() => {
  // Bump this on every deploy so we can tell which build a device is running
  // (iOS loves to serve a stale cached copy). Shown on the Options screen and
  // stamped into the diagnostics log. KEEP IN SYNC WITH sw.js.
  const BUILD = '2026-07-11.85';
  window.PB_BUILD = BUILD;

  const CAP = 600;                       // ring-buffer size
  const KEY = 'pb_debuglog';             // survives reloads/crashes
  const SEQ_KEY = 'pb_logseq';           // monotonically increasing across reloads

  let buf = [];
  try { buf = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { buf = []; }
  let seq = 0;
  try { seq = parseInt(localStorage.getItem(SEQ_KEY) || '0', 10) || 0; } catch {}
  // Older persisted lines may predate seq numbers; give them ones below current.
  for (let i = 0; i < buf.length; i++) if (buf[i].s == null) buf[i].s = seq - buf.length + i;

  const now = () => {
    const d = new Date();
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
  };

  // Strip the token + server base so the log is shareable and readable.
  function shorten(url) {
    if (!url) return '';
    let s = String(url).replace(/X-Plex-Token=[^&]*/i, 'X-Plex-Token=…');
    s = s.replace(/^https?:\/\/[^/]+/i, '');           // drop scheme+host (the plex.direct base)
    if (s.length > 160) s = s.slice(0, 160) + '…';
    return s;
  }

  let persistT = null;
  function persist() {
    // Coalesce bursts — a chatty audio event storm shouldn't hammer localStorage.
    if (persistT) return;
    persistT = setTimeout(() => {
      persistT = null;
      try {
        localStorage.setItem(KEY, JSON.stringify(buf.slice(-CAP)));
        localStorage.setItem(SEQ_KEY, String(seq));
      } catch {}
    }, 400);
  }

  function log(tag, msg) {
    tag = String(tag || ''); msg = String(msg == null ? '' : msg);
    // Coalesce identical consecutive lines (iOS fires e.g. `suspend` in bursts):
    // bump a ×N counter on the last line instead of flooding the ring.
    const last = buf[buf.length - 1];
    if (last && last.tag === tag && last.m === msg) {
      last.n = (last.n || 1) + 1; last.t = now(); last.s = ++seq;
      persist(); if (panelOpen) render();
      return;
    }
    const line = { s: ++seq, t: now(), tag, m: msg };
    buf.push(line);
    if (buf.length > CAP) buf = buf.slice(-CAP);
    persist();
    if (panelOpen) render();
    try { console.log(`[${line.t}] ${tag} ${msg}`); } catch {}
  }

  function clear() { buf = []; persist(); if (panelOpen) render(); }

  const lineText = (l) => `${l.t} ${l.tag} ${l.m}${l.n > 1 ? `  ×${l.n}` : ''}`;
  const lastSeq = () => seq;
  // Lines with seq > since, formatted for the log pipe (seq|text).
  function getSince(since) { return buf.filter((l) => l.s > since).map((l) => ({ s: l.s, text: lineText(l) })); }

  // Whether "Live debug" is on — network code logs successes too when it is
  // (failures are always logged), so a live tail shows the full picture.
  const verbose = () => { try { return localStorage.getItem('pb_livedebug') === '1'; } catch { return false; } };

  // ---- capture global errors ------------------------------------------------
  window.addEventListener('error', (e) => {
    // Image load failures come through here too (with e.target an <img>); those
    // are handled separately in artloader.js, so only log non-image errors here.
    if (e && e.target && e.target.tagName === 'IMG') return;
    log('JS_ERR', (e && e.message ? e.message : 'error') + (e && e.filename ? ` @${shorten(e.filename)}:${e.lineno}` : ''));
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    log('PROMISE', (r && r.message) ? r.message : String(r));
  });

  // ---- lifecycle + connectivity ---------------------------------------------
  // iOS backgrounding / bfcache / network flips are prime suspects for "drops
  // under great network conditions" — every transition goes in the log.
  window.addEventListener('online', () => log('NET', 'browser online'));
  window.addEventListener('offline', () => log('NET', 'browser OFFLINE'));
  document.addEventListener('visibilitychange', () => log('LIFE', document.hidden ? 'hidden (backgrounded)' : 'visible (foregrounded)'));
  window.addEventListener('pageshow', (e) => log('LIFE', 'pageshow' + (e.persisted ? ' (from bfcache)' : '')));
  window.addEventListener('pagehide', (e) => log('LIFE', 'pagehide' + (e.persisted ? ' (into bfcache)' : '')));

  // ---- audio instrumentation -------------------------------------------------
  // app.js hands us its <audio> element; we log every meaningful media event
  // with a state snapshot, plus a watchdog that catches the silent failure mode:
  // state says "playing" but the clock isn't moving.
  function bufStr(a) {
    try {
      const b = a.buffered, out = [];
      for (let i = 0; i < b.length; i++) out.push(`${Math.round(b.start(i))}-${Math.round(b.end(i))}`);
      return out.join(',') || 'none';
    } catch { return '?'; }
  }
  const audSnap = (a) => `t=${(a.currentTime || 0).toFixed(1)} dur=${(a.duration || 0).toFixed(1)} rs=${a.readyState} ns=${a.networkState} buf=${bufStr(a)}`;

  function watchAudio(a) {
    // waiting/stalled/suspend are the buffering-diagnosis events; the rest give
    // the surrounding story. (progress/timeupdate excluded — too chatty even
    // for a coalescing ring.)
    const evs = ['loadstart', 'loadedmetadata', 'canplay', 'canplaythrough', 'play', 'playing',
                 'pause', 'waiting', 'stalled', 'suspend', 'seeking', 'seeked', 'ratechange',
                 'emptied', 'abort', 'ended'];
    for (const ev of evs) a.addEventListener(ev, () => log('AUD', `${ev} ${audSnap(a)}`));
    a.addEventListener('error', () => {
      const e = a.error;
      log('AUD_ERR', `code=${e && e.code} ${e && e.message || ''} ${audSnap(a)} online=${navigator.onLine}`);
    });
    // Stall watchdog: "playing" but currentTime frozen. Logs at 10s frozen and
    // every 30s after, with full context, so silent stalls become visible.
    let lastT = -1, frozen = 0;
    setInterval(() => {
      if (a.paused || a.ended || !a.src) { lastT = -1; frozen = 0; return; }
      const t = a.currentTime;
      if (t === lastT) {
        frozen += 5;
        if (frozen === 10 || frozen % 30 === 0) log('AUD_STALL', `${frozen}s frozen ${audSnap(a)} online=${navigator.onLine}`);
      } else frozen = 0;
      lastT = t;
    }, 5000);
  }

  // ---- state snapshot ---------------------------------------------------------
  // app.js registers a provider with playback/bank/ctx details; snapshot() is
  // what the log pipe heartbeat, the `state` remote command, and bug reports use.
  let stateFn = null;
  function registerState(fn) { stateFn = fn; }
  function snapshot() {
    const o = {
      build: BUILD, at: new Date().toISOString(),
      online: navigator.onLine, visible: !document.hidden,
      conn: (window.Plex && Plex.getConnKind && Plex.getConnKind()) || null,
      sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    };
    try { if (stateFn) Object.assign(o, stateFn()); } catch (e) { o.stateErr = e && e.message; }
    return o;
  }

  // ---- Eruda: full on-device devtools (console / network / elements) ---------
  // Vendored at js/vendor/eruda.js (~500 KB) and loaded ONLY when asked — never
  // precached, never on the normal path. This is the Windows-user substitute
  // for Safari Web Inspector.
  function openConsole() {
    if (window.eruda) { try { eruda.show(); } catch {} return; }
    log('ERUDA', 'loading console…');
    const s = document.createElement('script');
    s.src = 'js/vendor/eruda.js';
    s.onload = () => { try { window.eruda.init(); window.eruda.show(); log('ERUDA', 'console open'); } catch (e) { log('ERUDA', 'init failed ' + (e && e.message)); } };
    s.onerror = () => log('ERUDA', 'failed to load js/vendor/eruda.js');
    document.head.appendChild(s);
  }

  // ---- on-screen panel ------------------------------------------------------
  let panelOpen = false, panelEl = null;

  function injectStyle() {
    if (document.getElementById('pbdbg-style')) return;
    const s = document.createElement('style');
    s.id = 'pbdbg-style';
    s.textContent = `
      #pbdbg{position:fixed;left:0;right:0;bottom:0;height:62vh;z-index:9999;
        background:#0d0f13;color:#cfe3d0;border-top:2px solid #3a7;
        font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;display:flex;flex-direction:column;
        box-shadow:0 -8px 24px rgba(0,0,0,.5);padding-bottom:env(safe-area-inset-bottom)}
      #pbdbg .hd{display:flex;gap:8px;align-items:center;padding:8px 10px;background:#151922;border-bottom:1px solid #263}
      #pbdbg .hd b{color:#8fe;font-size:12px;margin-right:auto}
      #pbdbg .hd button{background:#223;color:#cfe3d0;border:1px solid #3a7;border-radius:6px;padding:5px 9px;font-size:12px}
      #pbdbg .body{flex:1;overflow:auto;white-space:pre-wrap;word-break:break-all;padding:8px 10px;margin:0}
      #pbdbg .body .fail{color:#ff8a8a}#pbdbg .body .warn{color:#ffd479}#pbdbg .body .ok{color:#8ef0a0}#pbdbg .body .dim{color:#8aa}`;
    document.head.appendChild(s);
  }

  function summary() {
    const c = {};
    for (const l of buf) c[l.tag] = (c[l.tag] || 0) + (l.n || 1);
    const kind = (window.Plex && Plex.getConnKind && Plex.getConnKind()) || '?';
    const online = navigator.onLine ? 'online' : 'OFFLINE';
    const counts = Object.keys(c).sort().map((k) => `${k}:${c[k]}`).join('  ');
    return `build=${BUILD}  conn=${kind} ${online}  ${counts}`;
  }

  function render() {
    if (!panelEl) return;
    const body = panelEl.querySelector('.body');
    const cls = (t) => /FAIL|ERR|GIVEUP|PROMISE|STALL/.test(t) ? 'fail' : /RETRY|WARN|NET|CONN/.test(t) ? 'warn' : /OK|CMD/.test(t) ? 'ok' : 'dim';
    body.innerHTML = buf.slice(-CAP).map((l) =>
      `<span class="${cls(l.tag)}">${l.t} ${l.tag}</span> <span class="dim">${(l.m + (l.n > 1 ? `  ×${l.n}` : '')).replace(/</g, '&lt;')}</span>`).join('\n');
    panelEl.querySelector('.sum').textContent = summary();
    body.scrollTop = body.scrollHeight;
  }

  function open() {
    injectStyle();
    if (!panelEl) {
      panelEl = document.createElement('div');
      panelEl.id = 'pbdbg';
      panelEl.innerHTML =
        `<div class="hd"><b>TomeRoam Diagnostics</b><span class="sum dim"></span>
           <button data-a="copy">Copy</button><button data-a="clear">Clear</button><button data-a="close">Close</button></div>
         <pre class="body"></pre>`;
      document.body.appendChild(panelEl);
      panelEl.addEventListener('click', (e) => {
        const a = e.target && e.target.dataset && e.target.dataset.a;
        if (a === 'close') close();
        else if (a === 'clear') clear();
        else if (a === 'copy') copyLog();
      });
    }
    panelEl.style.display = 'flex';
    panelOpen = true;
    render();
  }
  function close() { if (panelEl) panelEl.style.display = 'none'; panelOpen = false; }

  function asText() {
    return `TomeRoam diagnostics — ${new Date().toISOString()}\n${summary()}\n` +
      `STATE ${JSON.stringify(snapshot())}\n\n` +
      buf.map(lineText).join('\n');
  }
  async function copyLog() {
    const text = asText();
    try { await navigator.clipboard.writeText(text); toast('Log copied — paste it to Claude'); }
    catch {
      // Fallback: drop it in a textarea and select so the user can copy manually.
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:40vh;z-index:10000';
      document.body.appendChild(ta); ta.focus(); ta.select();
      toast('Select all + Copy, then close the box');
      setTimeout(() => ta.remove(), 15000);
    }
  }
  function toast(m) {
    const t = document.getElementById('toast');
    if (!t) return; t.textContent = m; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ---- ways to open --------------------------------------------------------
  // 1) Visible rows injected into the Options screen (gear): the log panel and
  //    the Eruda console. (logpipe.js injects its Live debug + Report rows.)
  function injectOptionsButton() {
    const opt = document.getElementById('options');
    if (!opt || document.getElementById('pbdbg-open')) return;
    const row = document.createElement('div');
    row.className = 'opt-row';
    row.innerHTML = '<span class="opt-label">Diagnostics</span>' +
      '<span class="opt-ctl"><button id="pbdbg-open" class="textbtn">Open log</button>' +
      '<button id="pbdbg-console" class="textbtn">Console</button></span>';
    opt.appendChild(row);
    row.querySelector('#pbdbg-open').addEventListener('click', open);
    row.querySelector('#pbdbg-console').addEventListener('click', openConsole);
    const stamp = document.createElement('div');
    stamp.className = 'buildstamp';
    stamp.textContent = 'Build ' + BUILD;
    stamp.style.cssText = 'text-align:center;opacity:.5;font-size:12px;margin-top:18px';
    opt.appendChild(stamp);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectOptionsButton);
  else injectOptionsButton();

  // 2) URL shortcut: open automatically if the address ends with #debug.
  function maybeAutoOpen() { if (/debug/i.test(location.hash) || /[?&]debug/i.test(location.search)) open(); }
  window.addEventListener('hashchange', maybeAutoOpen);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maybeAutoOpen);
  else maybeAutoOpen();

  // 3) Fallback gesture: 5 quick taps anywhere in the top ~120px of the screen.
  let taps = [], TAP_WINDOW = 2500, TAP_N = 5, TOP_ZONE = 120;
  window.addEventListener('pointerdown', (e) => {
    if (e.clientY > TOP_ZONE) { taps = []; return; }
    const t = Date.now();
    taps = taps.filter((x) => t - x < TAP_WINDOW); taps.push(t);
    if (taps.length >= TAP_N) { taps = []; open(); }
  }, true);

  window.PBDebug = { log, clear, open, close, asText, verbose, lastSeq, getSince, watchAudio, registerState, snapshot, openConsole };
})();
