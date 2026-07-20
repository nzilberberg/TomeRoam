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
  const BUILD = '2026-07-19.188';
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

  // The persisted ring survives reloads AND updates, so a single bug report can
  // mix the PREVIOUS build's events with this one's — which made bisecting a
  // repaint bug painful (couldn't tell which build a log line came from). Drop a
  // clear boundary line the first time a NEW build boots on this ring; a report is
  // then self-delineating.
  try {
    const prevBuild = localStorage.getItem('pb_logbuild');
    if (prevBuild && prevBuild !== BUILD) buf.push({ s: ++seq, t: now(), tag: 'BUILD', m: prevBuild + ' → ' + BUILD + ' (update — lines above are the old build)' });
    localStorage.setItem('pb_logbuild', BUILD);
  } catch {}

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
  // Force the ring to localStorage NOW. persist() is debounced 400ms; an action that
  // reloads sooner (e.g. Clear + reload) would lose its just-logged summary lines.
  function flushLog() {
    try {
      if (persistT) { clearTimeout(persistT); persistT = null; }
      localStorage.setItem(KEY, JSON.stringify(buf.slice(-CAP)));
      localStorage.setItem(SEQ_KEY, String(seq));
    } catch {}
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
      net: (window.Net && Net.sanitizedState) ? Net.sanitizedState() : null,
      // Compact durable-progress verdict — rides EVERY bug report, so a posted log
      // says whether the archive was verified without needing a separate export.
      prog: (window.Progress && Progress.diagSummary) ? (() => { try { return Progress.diagSummary(); } catch { return null; } })() : null,
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

  // ---- offline/cache diagnostics --------------------------------------------
  // Gathers the full cache / service-worker / storage / connectivity / sync
  // picture so caching behaviour is debuggable on-device. Everything here is
  // token-free by construction; sanitize() strips URLs/IPs defensively too.
  function askSw(msg, timeoutMs = 1500) {
    return new Promise((resolve) => {
      const sw = navigator.serviceWorker;
      if (!sw || !sw.controller) return resolve(null);
      let done = false;
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => { if (!done) { done = true; resolve(e.data); } };
      try { sw.controller.postMessage(msg, [ch.port2]); } catch { return resolve(null); }
      setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs);
    });
  }

  async function collectDiagnostics() {
    const d = { build: BUILD, at: new Date().toISOString() };
    // Environment / mode
    d.mode = (window.Net && Net.state && Net.state().mode) || 'unknown';
    // Build coherence (mixed-build detection) — the top-priority diagnostic.
    d.appBuild = window.PB_BUILD || BUILD;
    try { const m = document.querySelector('meta[name="tomeroam-build"]'); d.htmlBuild = (m && m.content) || null; } catch {}
    d.globals = { Store: !!window.Store, Net: !!window.Net, SyncQueue: !!window.SyncQueue };
    try {
      const has = (n) => !!document.querySelector('script[src*="js/' + n + '"]');
      d.scriptTags = { store: has('store.js'), net: has('net.js'), syncqueue: has('syncqueue.js') };
    } catch {}
    d.mixedBuild = !!((d.htmlBuild && d.appBuild && d.htmlBuild !== d.appBuild) || !d.globals.Store || !d.globals.Net || !d.globals.SyncQueue);
    // Service worker
    const sw = navigator.serviceWorker;
    d.swSupported = !!sw;
    d.swController = !!(sw && sw.controller);
    if (sw) {
      try {
        const reg = await sw.getRegistration();
        d.swRegistered = !!reg;
        const active = reg && (reg.active || reg.waiting || reg.installing);
        d.swState = active ? active.state : 'none';
        d.swWaiting = !!(reg && reg.waiting);
      } catch { d.swRegistered = false; }
    }
    const cs = await askSw({ type: 'GET_CACHE_STATUS' });
    if (cs) {
      d.cacheNames = cs.cacheNames || [];
      d.shellCache = cs.shellCache;
      d.shellExpected = cs.expected;
      d.shellPresent = cs.present;
      d.shellComplete = cs.expected != null && cs.present === cs.expected;
      d.shellMissing = cs.missing || [];
      d.coverCacheCount = cs.imgCount;
      d.imgStats = cs.imgStats;             // SW cover-request interception tally
      d.statsEpoch = cs.statsEpoch;         // bumped per clear — delimits a measurement window
      d.workerId = cs.workerId;             // per worker INSTANCE — a change means the counters restarted
      d.shellBuild = cs.build;              // the BUILD the active SW reports
    }
    // IndexedDB structured data
    d.idbAvailable = !!(window.Store && Store.available);
    if (d.idbAvailable) {
      try {
        d.cachedBooks = await Store.count('books');
        d.cachedAuthors = await Store.count('authors');
        d.cachedTracks = await Store.count('tracks');
        d.lastBooksSync = await Store.syncedAt('books');
        d.persistResult = await Store.diagGet('persist', 'unknown');
        d.lastSyncResult = await Store.diagGet('lastSyncResult', null);
        d.lastSyncAt = await Store.diagGet('lastSyncAt', 0);
        const est = await Store.estimate();
        d.storageSupported = est.supported;
        if (est.supported) { d.storageUsed = est.usage; d.storageQuota = est.quota; }
      } catch (e) { d.idbErr = e && e.message; }
    }
    // Pending sync
    d.pendingSync = (window.SyncQueue) ? await SyncQueue.count() : 0;
    // Connectivity model
    if (window.Net && Net.sanitizedState) Object.assign(d, { net: Net.sanitizedState() });
    // Durable progress — the RECORD-level snapshot (see Progress.diagnostics).
    // Consumed as a public snapshot; debug.js never reaches into progress/shard
    // internals. Rendered through diagText below so it passes the same sanitizer
    // as everything else (sanitize() is a whole-TEXT pass — an unrendered field
    // would ship unsanitized).
    if (window.Progress && Progress.diagnostics) {
      try { d.progress = Progress.diagnostics(); } catch (e) { d.progressErr = e && e.message; }
    }
    return d;
  }

  const fmtBytes = (n) => { if (!n && n !== 0) return '?'; const u = ['B','KB','MB','GB']; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return n.toFixed(i ? 1 : 0) + u[i]; };
  const fmtTs = (ms) => (ms ? new Date(ms).toLocaleString() : 'never');

  function diagText(d) {
    const n = d.net || {};
    const L = [];
    L.push(`TomeRoam diagnostics — ${d.at}`);
    L.push(`App build: ${d.build}   Mode: ${d.mode}`);
    if (n.hostedBuild) L.push(`Hosted build (build.json): ${n.hostedBuild}${n.hostedBuild !== d.build ? '  ← update available' : ''}`);
    L.push('');
    L.push('▶ LIVE cache + data — LOCAL reads, no network (auto-refreshing) ◀');
    L.push(`   cover cache entries: ${d.coverCacheCount == null ? '?' : d.coverCacheCount}`);
    const is = d.imgStats || {};
    const q = (v) => (v == null ? '?' : v);   // NEVER coerce "unavailable" to 0
    L.push(`   SW cover requests SEEN: ${q(is.seen)}  (fromSWcache=${q(is.hit)} written=${q(is.put)})`);
    L.push(`   measurement window: epoch=${q(d.statsEpoch)}  worker=${d.workerId || '?'}`);
    L.push(`      ↑ SEEN is cumulative for ONE worker instance and resets on clear.`);
    L.push(`        Only compare readings with the SAME epoch AND worker; if either`);
    L.push(`        changed, the counter restarted and a 0 proves nothing.`);
    L.push(`   IndexedDB:  books=${d.cachedBooks || 0}  authors=${d.cachedAuthors || 0}  tracks=${d.cachedTracks || 0}`);
    L.push(`   caches present: ${(d.cacheNames || []).join(', ') || '(none)'}`);
    L.push('');
    L.push('— Build coherence (mixed-build check) —');
    L.push(`HTML build: ${d.htmlBuild || '?'}   JS build: ${d.appBuild || '?'}   SW build: ${d.shellBuild || '?'}`);
    L.push(`active shell cache: ${d.shellCache || '(none)'}`);
    const g = d.globals || {};
    L.push(`globals loaded: Store=${!!g.Store} Net=${!!g.Net} SyncQueue=${!!g.SyncQueue}`);
    if (d.scriptTags) L.push(`index.html <script> tags: store=${d.scriptTags.store} net=${d.scriptTags.net} syncqueue=${d.scriptTags.syncqueue}`);
    L.push(`MIXED BUILD: ${d.mixedBuild ? 'YES  ⚠️  (use Hard Reset)' : 'no'}`);
    L.push('');
    L.push('— Service worker —');
    L.push(`supported=${d.swSupported}  registered=${d.swRegistered}  active=${d.swController}  state=${d.swState || '?'}  waiting=${d.swWaiting || false}`);
    L.push(`caches: ${(d.cacheNames || []).join(', ') || '(none)'}`);
    L.push(`app-shell complete: ${d.shellComplete ? 'YES' : 'NO'} (${d.shellPresent}/${d.shellExpected})`);
    if (d.shellMissing && d.shellMissing.length) L.push(`  missing: ${d.shellMissing.join(', ')}`);
    L.push(`cover cache entries: ${d.coverCacheCount == null ? '?' : d.coverCacheCount}`);
    L.push('');
    L.push('— Structured data (IndexedDB) —');
    L.push(`available=${d.idbAvailable}  books=${d.cachedBooks || 0}  authors=${d.cachedAuthors || 0}  tracks=${d.cachedTracks || 0}`);
    L.push(`last metadata sync: ${fmtTs(d.lastBooksSync)}`);
    L.push('');
    L.push('— Persistent storage —');
    L.push(`supported=${d.storageSupported}  persist=${d.persistResult || 'unknown'}`);
    if (d.storageSupported) L.push(`used ${fmtBytes(d.storageUsed)} of ${fmtBytes(d.storageQuota)}`);
    L.push('');
    L.push('— Connectivity —');
    L.push(`browserOnline=${n.browserThinksOnline}  appHost=${n.appHostReachable}  plex=${n.plexReachable}  plexAuth=${n.plexAuthValid}`);
    L.push(`cachedShell=${n.cachedAppShellAvailable}  cachedMetadata=${n.cachedMetadataAvailable}`);
    L.push(`last app-host check: ${fmtTs(n.lastAppHostCheck)} → ${n.lastAppHostResult || '?'}`);
    L.push(`last Plex check: ${fmtTs(n.lastPlexCheck)} → ${n.lastPlexResult || '?'}`);
    L.push(`last update check: ${fmtTs(n.lastUpdateCheck)} → ${n.lastUpdateResult || '?'}`);
    L.push('');
    L.push('— Sync queue —');
    L.push(`pending=${d.pendingSync}  lastSyncAttempt=${fmtTs(d.lastSyncAt)}`);
    if (d.lastSyncResult) L.push(`last result: ${JSON.stringify(d.lastSyncResult)}`);
    L.push('');
    progressText(d, L);
    return L.join('\n');
  }

  const fmtPos = (ms) => {
    const s = Math.max(0, Math.round((ms || 0) / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(ss).padStart(2, '0');
  };
  // One record, one line: position, when, and who. `ts` is the LWW key, so it is
  // printed raw as well as friendly — a comparison is the whole point of this view.
  const fmtRec = (r) => (r ? `${r.t == null ? '?' : r.t}@${fmtPos(r.o)} ts=${r.ts}${r.ts ? ' (' + fmtTs(r.ts) + ')' : ''}` : '—');

  function progressText(d, L) {
    L.push('— Durable progress (record-level) —');
    if (d.progressErr) { L.push(`snapshot failed: ${d.progressErr}`); return; }
    const p = d.progress;
    if (!p) { L.push('(Progress not loaded)'); return; }
    const c = p.counts, s = p.sync, a = s.archive, lg = s.legacy;
    L.push(`device: ${p.device.name} [${p.device.id}] dev8=${p.device.dev8}`);
    L.push(`DURABLE PROGRESS: ${s.durable ? 'SAFE — archive read-back verified' : 'NOT verified — archive ' + a.state}`);
    L.push(`  archive: state=${a.state} behind=${a.behind} pendingFor=${Math.round(a.pendingForMs / 1000)}s backoff=${a.backoffMs}ms degradedSubtrees=${a.degradedCount}`);
    // Spelled out because a bare HTTP 200 from this write used to be reported as
    // "synced": the head is disposable and status-trusted, so accepted ≠ stored.
    L.push(`  legacy head (compat only, status-trusted — NEVER read-back verified):`);
    L.push(`     state=${lg.state} dirty=${lg.dirty} dirtyFor=${Math.round(lg.dirtyForMs / 1000)}s lastStatus=${lg.lastStatus} at=${fmtTs(lg.lastAt)}`);
    if (s.compatOnlyProblem) L.push(`     ⚠️ head write FAILED while the archive verified → old clients see a stale head; durable progress is intact`);
    L.push(`counts: authored=${c.authoredBooks} replicas=${c.replicatedBooks} tombstones=${c.tombstones} pendingDeletes=${c.pendingDeletes} purgedIdentities=${c.purgedIdentities} peerBoards=${c.peerBoards} shardSets=${c.shardBoards}`);
    if (p.replication) L.push(`replication: ${p.replication.unique} unique authored events / ${p.replication.stored} stored copies across ${p.replication.devices} device(s)`);
    const sh = p.shards;
    if (sh) {
      L.push(`shards: ${sh.shardCount} (${sh.redirects} redirect) verified=${sh.verifiedShards} treeLoaded=${sh.treeLoaded} writing=${sh.writing} queued=${sh.queued} failAttempt=${sh.failAttempt} budget=${sh.maxRequestBytes}B`);
      const f = sh.lastFailure;
      if (f) L.push(`  ACTIVE write failure: [${f.code}] ${f.stage || 'data'}@${f.prefix === '' ? '(root)' : f.prefix}${f.splitId ? ' split=' + f.splitId : ''} attempt=${f.attempt} willRetry=${f.willRetry} — ${f.message}`);
      for (const h of (sh.recentFailures || []).slice(-4)) {
        L.push(`  past failure @${fmtTs(h.at)}: [${h.code}] ${h.stage || 'data'}@${h.prefix === '' ? '(root)' : h.prefix} — ${h.message}`);
      }
      for (const g2 of (sh.degradedRead || []).slice(0, 6)) {
        L.push(`  degraded subtree: ${g2.dev}/${g2.prefix === '' ? '(root)' : g2.prefix} [${g2.code || '?'}] ${g2.reason}`);
      }
    }
    L.push(`books (newest ${c.booksShown} of ${c.booksTotal}):`);
    for (const b of p.books) {
      const w = b.won;
      L.push(`  • ${b.book}  WON: ${w ? fmtRec(w) + ` by=${w.by}${w.mine ? ' (this device)' : ''}` : '— none (unplayed or fully suppressed)'}`);
      L.push(`      mine:    ${fmtRec(b.mine)}${b.mineTracks ? `  (+${b.mineTracks} chapter records)` : ''}`);
      L.push(`      replica: ${fmtRec(b.replica)}${b.replica ? ` origin=${b.replica.origin}` : ''}`);
      for (const pr of b.peers) L.push(`      peer ${pr.from}: ${fmtRec(pr)}`);
      for (const sr of b.shards) L.push(`      shard ${sr.from}: ${fmtRec(sr)}`);
      if (b.rst) L.push(`      RESET floor: ts=${b.rst} (${fmtTs(b.rst)}) from ${b.rstFrom}${w && w.ts <= b.rst ? '  ⚠️ winner is at/below the floor' : ''}`);
    }
  }

  // Sanitize a diagnostics string for sharing: strip tokens, full URLs, and (in
  // privacy mode) server names + local IPs. By construction the report already
  // omits tokens/URLs; this is a belt-and-suspenders pass.
  function sanitize(text) {
    let s = String(text || '');
    s = s.replace(/X-Plex-Token=[^&\s"]*/gi, 'X-Plex-Token=…');
    s = s.replace(/https?:\/\/[^\s"]+/gi, '‹url›');
    const privacy = (() => { try { return localStorage.getItem('pb_privacy') === '1'; } catch { return false; } })();
    if (privacy) {
      s = s.replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, '‹ip›');                 // IPv4
      s = s.replace(/[0-9a-f]{8,}\.plex\.direct/gi, '‹host›.plex.direct'); // machine-id host
    }
    return s;
  }

  // The rendered, SANITIZED diagnostics — same text the Cache panel shows and the
  // same sanitizer "Copy sanitized" uses, but returned instead of copied so the
  // one-tap bug report can carry it. Clipboard-only was fine when a human was at a
  // desktop; on a phone or tablet it means emailing yourself to get the text out,
  // which is enough friction to stop the evidence being captured at all.
  async function diagReport() {
    try { return sanitize(diagText(await collectDiagnostics())); }
    catch (e) { return 'DIAGNOSTICS UNAVAILABLE: ' + ((e && e.message) || e); }
  }

  async function copyDiagnostics() {
    const d = await collectDiagnostics();
    const text = sanitize(diagText(d));
    try { await navigator.clipboard.writeText(text); toast('Sanitized diagnostics copied'); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:50vh;z-index:10001';
      document.body.appendChild(ta); ta.focus(); ta.select();
      toast('Select all + Copy, then close the box');
      setTimeout(() => ta.remove(), 15000);
    }
  }

  // Diagnostics overlay (distinct from the rolling log): a snapshot of cache/SW/
  // storage/connectivity/sync state, with a Copy-sanitized button.
  let diagEl = null;
  async function openDiag() {
    injectStyle();
    if (!diagEl) {
      diagEl = document.createElement('div');
      diagEl.id = 'pbdbg'; diagEl.classList.add('pbdiag');
      diagEl.innerHTML =
        `<div class="hd"><b>Cache &amp; Offline Diagnostics</b><span class="sum dim"></span>
           <button data-a="copysan">Copy sanitized</button><button data-a="refresh">Refresh</button><button data-a="closediag">Close</button></div>
         <pre class="body"></pre>`;
      document.body.appendChild(diagEl);
      diagEl.addEventListener('click', (e) => {
        const a = e.target && e.target.dataset && e.target.dataset.a;
        if (a === 'closediag') { diagEl.style.display = 'none'; stopDiagAuto(); }
        else if (a === 'copysan') copyDiagnostics();
        else if (a === 'refresh') fillDiag();
      });
    }
    diagEl.style.display = 'flex';
    lastCacheSnap = '';        // force a fresh SWCACHE log line on every (re)open
    fillDiag();
    // Live monitor: the cover-cache count + IDB counts are LOCAL reads (no network,
    // so bandwidth can't skew them). Poll while the panel is open → you can watch the
    // cover cache drop to 0 on Clear and refill as you browse, no one-shot to trust.
    stopDiagAuto();
    diagTimer = setInterval(() => {
      if (diagEl && diagEl.style.display !== 'none') fillDiag(true);
      else stopDiagAuto();
    }, 1500);
  }
  let diagTimer = null, filling = false, lastCacheSnap = '';
  function stopDiagAuto() { if (diagTimer) { clearInterval(diagTimer); diagTimer = null; } }
  async function fillDiag(quiet) {
    if (!diagEl || filling) return;                 // no overlapping polls
    filling = true;
    const body = diagEl.querySelector('.body');
    if (!quiet) body.textContent = 'Collecting…';   // auto-refresh ticks quietly (no flash)
    try {
      const d = await collectDiagnostics();
      body.textContent = diagText(d);
      // Persist the cover-cache + SW-interception numbers to the log ring on CHANGE —
      // the panel display alone is NOT captured in a bug report. This makes the
      // SEEN-counter verdict durable: a report then shows whether the SW ever saw a
      // cover load (SWseen climbs) or was bypassed by iOS (stays 0) while covers painted.
      // `?` for anything UNAVAILABLE — coercing a missing measurement to 0 (the old
      // `is.seen || 0`) would record a hard "the SW saw nothing" when in fact
      // GET_CACHE_STATUS failed to answer at all.
      const is = d.imgStats || {};
      const q = (v) => (v == null ? '?' : v);
      const snap = `cover-entries=${q(d.coverCacheCount)} SWseen=${q(is.seen)} hit=${q(is.hit)} put=${q(is.put)}`
        + ` epoch=${q(d.statsEpoch)} sw=${d.workerId || '?'} idb-books=${d.cachedBooks || 0}`;
      if (snap !== lastCacheSnap) { lastCacheSnap = snap; log('SWCACHE', snap); }
    }
    catch (e) { body.textContent = 'diag error: ' + ((e && e.message) || 'err'); }
    finally { filling = false; }
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

  // Cached-data clear (the Diagnostics "Cached data → Clear + reload" button).
  // Clears the library metadata caches — BOTH the IDB stores and their
  // localStorage mirrors (Store.clearCache owns the key names; reads fall back to
  // ls when IDB is empty, so an IDB-only clear leaves the app fully populated
  // offline — the bug this fixes). Downloads, the buffer index, and pending
  // progress writes stay (NOT audio/dl/buf/sync-store/kv-identity). Also deletes
  // the cover cache ('tomeroam-img-v1' — KEEP IN SYNC WITH sw.js; the FIFO index
  // lives inside it, so deleting the whole cache leaves a clean consistent slate),
  // then reloads. The SW shell cache is untouched — the app still boots instantly,
  // it just has no data until the fetches land.
  async function clearCachedData() {
    const btn = document.getElementById('pbdbg-clearcache');
    if (btn) { btn.disabled = true; btn.textContent = 'Clearing…'; }
    const IMG = 'tomeroam-img-v1';   // KEEP IN SYNC WITH sw.js IMG_CACHE (build.test pins it)
    // Instrument + verify what actually leaves disk — the ring survives the reload,
    // so the next bug report is the VERDICT on whether cover data really cleared (a
    // "books popped back with covers instantly" report reads as a surviving cache).
    try {
      const names = window.caches ? await caches.keys() : [];
      let imgBefore = -1, imgAfter = -1, deleted = null;
      if (window.caches) { try { imgBefore = (await (await caches.open(IMG)).keys()).length; } catch {} }
      if (window.Store) await Store.clearCache();
      // The SERVICE WORKER owns the cover cache — not just its entries but the FIFO
      // bookkeeping (order/known) and the interception counters. Deleting it from
      // the PAGE left all of that stale in the still-running worker: a re-downloaded
      // cover looked "already known" (never re-indexed, and a stale order length
      // could trim freshly re-fetched covers), and the cumulative counters kept
      // pre-clear traffic, making any post-clear reading uninterpretable. So hand the
      // clear to the SW as ONE owned operation; a direct delete is only the fallback
      // for when there is no controller to ask.
      // askSw() resolves null for BOTH "no controller" AND "timed out" — treating
      // those the same would start a page-side delete while the worker's clear is
      // still running, racing it. So decide on the CONTROLLER, not the reply, and
      // give the clear a generous window (delete + verify + per-entry sweep).
      const controlled = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
      const ack = controlled ? await askSw({ type: 'CLEAR_IMG_CACHE' }, 10000) : null;
      // Mere acknowledgement is NOT success: the worker reports `remaining` and a
      // `{cleared:true, remaining:47}` would otherwise pass as a clean clear.
      const swOk = !!(ack && ack.cleared === true && ack.remaining === 0);
      if (!controlled && window.caches) {          // no worker to own it → page fallback
        try { deleted = await caches.delete(IMG); } catch (e) { deleted = 'err:' + (e && e.name); }
        try {
          const c = await caches.open(IMG);
          const left = await c.keys();
          if (left.length) { await Promise.all(left.map((rq) => c.delete(rq).catch(() => {}))); }
        } catch {}
      }
      if (window.caches) { try { imgAfter = (await (await caches.open(IMG)).keys()).length; } catch {} }
      const booksLeft = window.Store ? (await Store.cachedBooks()).length : -1;
      log('CACHE', `CLEAR caches=[${names.join('|')}] cover-entries ${imgBefore}→${imgAfter}`
        + ` via=${controlled ? 'sw' : 'page'} ok=${controlled ? swOk : deleted}`
        + ` remaining=${ack ? ack.remaining : '?'} epoch=${ack ? ack.statsEpoch : '?'} sw=${(ack && ack.workerId) || '?'}`
        + `${ack && ack.error ? ' err=' + ack.error : ''}${controlled && !ack ? ' err=timeout' : ''} booksLeft=${booksLeft}`);
    } catch (e) { log('CACHE', 'CLEAR error ' + (e && e.message)); }
    flushLog();
    location.reload();
  }

  // ---- ways to open --------------------------------------------------------
  // 1) Visible rows on the Diagnostics sub-screen (Options → Diagnostics): the log
  //    panel, cache snapshot, and the Eruda console. (logpipe.js injects its Live
  //    debug + Report rows there too.) The build-stamp footer stays on the Options
  //    HUB (#options), which is the screen the user lands on.
  function injectOptionsButton() {
    const diag = document.getElementById('diagnostics');
    if (diag && !document.getElementById('pbdbg-open')) {
      const row = document.createElement('div');
      row.className = 'opt-row';
      row.innerHTML = '<span class="opt-label">Diagnostics</span>' +
        '<span class="opt-ctl"><button id="pbdbg-open" class="textbtn">Open log</button>' +
        '<button id="pbdbg-diag" class="textbtn">Cache</button>' +
        '<button id="pbdbg-console" class="textbtn">Console</button></span>';
      diag.appendChild(row);
      row.querySelector('#pbdbg-open').addEventListener('click', open);
      row.querySelector('#pbdbg-diag').addEventListener('click', openDiag);
      row.querySelector('#pbdbg-console').addEventListener('click', openConsole);
    }
    // SURFACE (durable-progress plan): sync state is visible, never silent — a
    // degraded shard or an unverified write shows here instead of being absorbed.
    if (diag && !document.getElementById('pbdbg-sync')) {
      const row = document.createElement('div');
      row.className = 'opt-row';
      row.innerHTML = '<span class="opt-label">Progress sync</span>' +
        '<span class="opt-ctl"><span id="pbdbg-sync" style="opacity:.8;font-size:13px">—</span></span>';
      diag.appendChild(row);
      const paint = () => {
        const el = document.getElementById('pbdbg-sync');
        const P = window.Progress;
        if (!el || !P || !P.syncState) return;
        const s = P.syncState();
        const n = s.stats ? ` · ${s.stats.uniqueRecords} records` : '';
        const f = s.archive && s.archive.lastFailure;
        // `stuck`, not `unsynced`: a write momentarily in flight (or a <30s dirty
        // flag between heartbeat publishes) is normal operation — showing it made
        // this row flicker synced↔syncing every few seconds while playing. That is
        // also why this row does NOT show archive.state: `behind` is true for most
        // of any listening session (records land every few seconds, the archive
        // publishes once a minute), so surfacing it here would restore exactly that
        // flicker. The archive/legacy distinction belongs in the report, which is
        // read deliberately — see progressText() in the diagnostics export.
        el.textContent = (s.degraded && s.degraded.length) ? `degraded (${s.degraded.length})` + n
          : s.stuck ? (f ? `retrying: ${f.code}` : s.lastError ? 'retrying: ' + s.lastError : 'syncing…') : 'synced' + n;
      };
      paint();
      setInterval(() => { if (!diag.classList.contains('hidden')) paint(); }, 3000);
    }
    // Test lever: force EVERY browse list through the windowed (virtual) path so
    // the >600 realization code is exercisable on a small library. Persisted;
    // VirtualList reads pb_forceVirtual at load, this toggle flips it live.
    if (diag && !document.getElementById('pbdbg-vforce')) {
      const row = document.createElement('div');
      row.className = 'opt-row';
      row.innerHTML = '<span class="opt-label">Windowed browse (test)</span>' +
        '<span class="opt-ctl"><button id="pbdbg-vforce" class="toggle" role="switch" aria-label="Force windowed browse"></button></span>';
      diag.appendChild(row);
      const btn = row.querySelector('#pbdbg-vforce');
      const isOn = () => { try { return localStorage.getItem('pb_forceVirtual') === '1'; } catch { return false; } };
      btn.setAttribute('aria-checked', isOn() ? 'true' : 'false');
      btn.addEventListener('click', () => {
        const on = !isOn();
        try { localStorage.setItem('pb_forceVirtual', on ? '1' : '0'); } catch {}
        if (window.VirtualList) VirtualList.setForceVirtual(on);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
        if (window.PBRebuildBrowse) window.PBRebuildBrowse();
        log('VLIST', `force-windowed browse ${on ? 'ON' : 'off'}`);
        toast(on ? 'Every browse list now renders windowed' : 'Browse back to normal thresholds');
      });
    }
    // Test lever: clear the CACHED data only — the IDB library records
    // (books/authors/tracks/albums) + the cover-image cache — so a reload must
    // refetch everything from Plex, like a first launch. Deliberately KEEPS
    // sign-in, settings, device identity, downloads/buffered audio, and the
    // pending-sync queue; this tests cold-fetch, it is not an uninstall.
    if (diag && !document.getElementById('pbdbg-clearcache')) {
      const row = document.createElement('div');
      row.className = 'opt-row';
      row.innerHTML = '<span class="opt-label">Cached data</span>' +
        '<span class="opt-ctl"><button id="pbdbg-clearcache" class="textbtn">Clear + reload</button></span>';
      diag.appendChild(row);
      row.querySelector('#pbdbg-clearcache').addEventListener('click', () => {
        if (!confirm('Clear cached library data and cover images?\n\n' +
          'The app reloads and refetches everything fresh from Plex. Sign-in, settings, ' +
          'downloads, and progress are all kept.')) return;
        clearCachedData();
      });
    }
    const opt = document.getElementById('options');
    if (opt && !opt.querySelector('.buildstamp')) {
      const stamp = document.createElement('div');
      stamp.className = 'buildstamp';
      stamp.textContent = 'Build ' + BUILD;
      stamp.style.cssText = 'text-align:center;opacity:.5;font-size:12px;margin-top:18px';
      opt.appendChild(stamp);
    }
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

  window.PBDebug = { log, clear, open, close, asText, verbose, lastSeq, getSince, watchAudio, registerState, snapshot, openConsole, openDiag, collectDiagnostics, copyDiagnostics, diagReport };
})();
