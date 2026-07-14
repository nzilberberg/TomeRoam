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
// Keys and stored value formats are UNCHANGED, so existing installs keep their
// saved settings. Each decoder reproduces the previous behaviour exactly,
// quirks included (see bufferMb).
//
// Scope: the app.js-level settings that were raw inline reads. Settings that
// already live behind their own module accessors are intentionally left there
// (they're already mini-repositories): the download byte caps + Wi-Fi-only
// (js/downloads.js, via parseByteLimit), pb_autoretry (js/net.js),
// pb_livedebug / pb_privacy (js/debug.js), the log-pipe on-toggle
// (js/logpipe.js), and the device name (js/presence.js).
const Settings = (() => {
  'use strict';
  const store = () => { try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch { return null; } };
  const raw = (k) => { try { const s = store(); return s ? s.getItem(k) : null; } catch { return null; } };
  const put = (k, v) => { try { const s = store(); if (s) s.setItem(k, String(v)); } catch { /* best effort — survives a reload */ } };

  const KEY = {
    skipBack: 'pb_skipBack', skipFwd: 'pb_skipFwd', resetGrace: 'pb_resetGrace',
    bufferMb: 'pb_bankBudget', freshStart: 'pb_freshStart', autoUpdate: 'pb_autoUpdate',
    banking: 'pb_banking', speed: 'pb_speed',
  };

  // Decoders — each reproduces the exact legacy default + parse.
  const skipBackSec   = () => parseInt(raw(KEY.skipBack) || '', 10) || 10;
  const skipFwdSec    = () => parseInt(raw(KEY.skipFwd) || '', 10) || 10;
  const resetGraceSec = () => { const n = parseInt(raw(KEY.resetGrace) || '', 10); return Number.isNaN(n) ? 10 : n; };   // honors an explicit 0
  // A stored 0 ("Off") decodes to the default — the legacy `|| default` quirk,
  // preserved deliberately: changing it would alter buffering behaviour and
  // needs on-device verification. Clamp to 256 MB as before.
  const bufferMb      = () => Math.min(parseInt(raw(KEY.bufferMb) || '', 10) || 128, 256);
  const freshStart    = () => raw(KEY.freshStart) !== '0';        // default ON
  const autoUpdate    = () => raw(KEY.autoUpdate) === '1';        // default OFF
  const banking       = () => (raw(KEY.banking) || 'on') !== 'off';   // hidden escape hatch, default ON
  const speed         = () => { const v = parseFloat(raw(KEY.speed) || ''); return v > 0 ? v : 1.0; };

  return {
    KEY,
    get skipBackSec()   { return skipBackSec(); },
    get skipFwdSec()    { return skipFwdSec(); },
    get resetGraceSec() { return resetGraceSec(); },
    get bufferMb()      { return bufferMb(); },
    get bufferBytes()   { return bufferMb() * 1024 * 1024; },   // look-ahead budget in bytes
    get freshStart()    { return freshStart(); },
    get autoUpdate()    { return autoUpdate(); },
    get banking()       { return banking(); },
    get speed()         { return speed(); },
    setSkipBackSec:   (v) => put(KEY.skipBack, v),
    setSkipFwdSec:    (v) => put(KEY.skipFwd, v),
    setResetGraceSec: (v) => put(KEY.resetGrace, v),
    setBufferMb:      (v) => put(KEY.bufferMb, v),
    setFreshStart:    (v) => put(KEY.freshStart, v ? '1' : '0'),
    setAutoUpdate:    (v) => put(KEY.autoUpdate, v ? '1' : '0'),
    setBanking:       (v) => put(KEY.banking, v ? 'on' : 'off'),
    setSpeed:         (v) => put(KEY.speed, v),
  };
})();

if (typeof window !== 'undefined') window.Settings = Settings;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Settings;
