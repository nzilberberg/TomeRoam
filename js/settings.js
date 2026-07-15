// @ts-check
// settings.js — the settings repository (review #13).
//
// One place that owns each user-configurable setting: its localStorage key, its
// default, and its exact encoding. Before this, these were read with a raw
// `localStorage.getItem` + `parseInt` + inline default at every call site, with
// the key string and the default duplicated each time — the class of bug that
// silently corrupted the download byte cap (a bad parse at one scattered spot).
// Centralizing the parse/default here makes that class structurally hard.
//
// Keys and stored value formats are UNCHANGED for the settings that predate this
// module, so existing installs keep their saved values. Each decoder reproduces
// the previous behaviour exactly.
//
// Scope: the app.js-level settings that were raw inline reads. Settings that
// already live behind their own module accessors are intentionally left there
// (they're already mini-repositories): the download byte caps + Wi-Fi-only AND
// the persistent-buffer size budget (js/downloads.js, via parseByteLimit),
// pb_autoretry (js/net.js), pb_livedebug / pb_privacy (js/debug.js), the
// log-pipe on-toggle (js/logpipe.js), and the device name (js/presence.js).
// bufferCurrent / bufferAhead are the two banking toggles (Model B); the shared
// buffer-space budget they draw from is Downloads.bufMaxBytes (downloads.js).
const Settings = (() => {
  'use strict';
  const store = () => { try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch { return null; } };
  const raw = (k) => { try { const s = store(); return s ? s.getItem(k) : null; } catch { return null; } };
  const put = (k, v) => { try { const s = store(); if (s) s.setItem(k, String(v)); } catch { /* best effort — survives a reload */ } };

  const KEY = {
    skipBack: 'pb_skipBack', skipFwd: 'pb_skipFwd', resetGrace: 'pb_resetGrace',
    bufferCurrent: 'pb_bufferCurrent', bufferAhead: 'pb_bufferAhead',
    freshStart: 'pb_freshStart', autoUpdate: 'pb_autoUpdate', speed: 'pb_speed',
  };

  // Decoders — each reproduces the exact legacy default + parse.
  const skipBackSec   = () => parseInt(raw(KEY.skipBack) || '', 10) || 10;
  const skipFwdSec    = () => parseInt(raw(KEY.skipFwd) || '', 10) || 10;
  const resetGraceSec = () => { const n = parseInt(raw(KEY.resetGrace) || '', 10); return Number.isNaN(n) ? 10 : n; };   // honors an explicit 0
  const bufferCurrent = () => raw(KEY.bufferCurrent) !== '0';     // whole-bank the current chapter (drop-resilience); default ON
  const bufferAhead   = () => raw(KEY.bufferAhead) !== '0';       // prefetch upcoming chapters; default ON
  const freshStart    = () => raw(KEY.freshStart) !== '0';        // default ON
  const autoUpdate    = () => raw(KEY.autoUpdate) === '1';        // default OFF
  const speed         = () => { const v = parseFloat(raw(KEY.speed) || ''); return v > 0 ? v : 1.0; };

  return {
    KEY,
    get skipBackSec()   { return skipBackSec(); },
    get skipFwdSec()    { return skipFwdSec(); },
    get resetGraceSec() { return resetGraceSec(); },
    get bufferCurrent() { return bufferCurrent(); },
    get bufferAhead()   { return bufferAhead(); },
    get freshStart()    { return freshStart(); },
    get autoUpdate()    { return autoUpdate(); },
    get speed()         { return speed(); },
    setSkipBackSec:   (v) => put(KEY.skipBack, v),
    setSkipFwdSec:    (v) => put(KEY.skipFwd, v),
    setResetGraceSec: (v) => put(KEY.resetGrace, v),
    setBufferCurrent: (v) => put(KEY.bufferCurrent, v ? '1' : '0'),
    setBufferAhead:   (v) => put(KEY.bufferAhead, v ? '1' : '0'),
    setFreshStart:    (v) => put(KEY.freshStart, v ? '1' : '0'),
    setAutoUpdate:    (v) => put(KEY.autoUpdate, v ? '1' : '0'),
    setSpeed:         (v) => put(KEY.speed, v),
  };
})();

if (typeof window !== 'undefined') window.Settings = Settings;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Settings;
