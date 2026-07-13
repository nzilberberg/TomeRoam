#!/usr/bin/env node
// tail-log.mjs — live-tail a TomeRoam device's debug log from a desktop.
//
// The app (js/logpipe.js) streams its diagnostics ring into a hidden Plex
// playlist (pb_log_<device>) while Options → Live debug is ON. This script
// polls that board and prints new lines exactly once (dedup by seq), so you
// watch the phone's log in near-realtime with zero copy-paste.
//
// Usage:
//   node tools/tail-log.mjs [--server URL] [--token T] [--device id8]
//                           [--interval ms] [--snap]
//   node tools/tail-log.mjs --reports [--delete]     # fetch one-tap bug reports
//
// Token resolution (never stored in this repo): --token, then $PLEX_TOKEN,
// then the local LMS TomeRoam plugin prefs file (same machine as Plex).
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const flag = (name) => args.includes('--' + name);

const SERVER = (opt('server', 'http://127.0.0.1:32400') || '').replace(/\/$/, '');
const INTERVAL = +opt('interval', 3000);
const DEVICE = opt('device', null);
const PREFS = 'C:/ProgramData/Lyrion/prefs/plugin/tomeroam.prefs';

function resolveToken() {
  const t = opt('token', null) || process.env.PLEX_TOKEN;
  if (t) return t;
  try {
    const m = readFileSync(PREFS, 'utf8').match(/^token:\s*(\S+)/m);
    if (m) return m[1];
  } catch {}
  console.error('No Plex token: pass --token, set PLEX_TOKEN, or run where ' + PREFS + ' exists.');
  process.exit(1);
}
const TOKEN = resolveToken();

async function api(path, init = {}) {
  const url = SERVER + path + (path.includes('?') ? '&' : '?') + 'X-Plex-Token=' + encodeURIComponent(TOKEN);
  const r = await fetch(url, { ...init, headers: { Accept: 'application/json', ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${path}`);
  const text = await r.text();
  return text ? JSON.parse(text).MediaContainer || {} : {};
}

async function boards(prefix) {
  const mc = await api('/playlists?playlistType=audio');
  return (mc.Metadata || []).filter((p) => (p.title || '').startsWith(prefix));
}

// ---- bug-report mode --------------------------------------------------------
if (flag('reports')) {
  const parts = await boards('pb_report_');
  if (!parts.length) { console.log('No pb_report_* playlists found.'); process.exit(0); }
  // Group pb_report_<ts>_<i>of<n> by ts, assemble in order.
  const groups = new Map();
  for (const p of parts) {
    const m = p.title.match(/^pb_report_([^_]+)_(\d+)of(\d+)$/);
    if (!m) continue;
    if (!groups.has(m[1])) groups.set(m[1], []);
    groups.get(m[1]).push({ i: +m[2], n: +m[3], rk: p.ratingKey, summary: p.summary });
  }
  // Print oldest → NEWEST (the report playlists come back in arbitrary Plex order,
  // so without this the "last" report in the output isn't the most recent — which
  // is easy to misread). ts is epoch ms.
  const tsOrder = [...groups.keys()].sort((a, b) => (Number(a) || 0) - (Number(b) || 0) || String(a).localeCompare(String(b)));
  for (const ts of tsOrder) {
    const list = groups.get(ts);
    list.sort((a, b) => a.i - b.i);
    const when = Number(ts) ? new Date(Number(ts)).toISOString() : ts;
    console.log(`\n===== REPORT ${ts} (${when}) (${list.length}/${list[0].n} parts) =====`);
    for (const part of list) {
      let s = part.summary;
      if (s == null) {
        const one = await api('/playlists/' + part.rk);
        s = one.Metadata && one.Metadata[0] && one.Metadata[0].summary || '';
      }
      process.stdout.write(s || '');
    }
    console.log('\n===== END =====');
    if (flag('delete')) {
      for (const part of list) await fetch(SERVER + '/playlists/' + part.rk + '?X-Plex-Token=' + encodeURIComponent(TOKEN), { method: 'DELETE' });
      console.log(`(deleted ${list.length} playlists for ${ts})`);
    }
  }
  process.exit(0);
}

// ---- live tail ----------------------------------------------------------------
console.log(`Tailing pb_log_* on ${SERVER} every ${INTERVAL}ms — device must have Options → Live debug ON. Ctrl-C to stop.`);
const lastSeq = new Map();   // device id -> highest printed seq
const lastSnap = new Map();  // device id -> last printed snapshot signature

for (;;) {
  try {
    const list = await boards('pb_log_' + (DEVICE || ''));
    for (const b of list) {
      let payload;
      try { payload = JSON.parse(b.summary || 'null'); } catch { continue; }
      if (!payload || !Array.isArray(payload.lines)) continue;
      const id = payload.id || b.title;
      const prev = lastSeq.get(id) || 0;
      for (const line of payload.lines) {
        const bar = line.indexOf('|');
        const s = +line.slice(0, bar);
        if (!(s > prev)) continue;
        console.log(`[${payload.name || id}] ${line.slice(bar + 1)}`);
        lastSeq.set(id, Math.max(lastSeq.get(id) || 0, s));
      }
      if (payload.snap) {
        const sig = JSON.stringify({ ...payload.snap, at: 0 });
        if (sig !== lastSnap.get(id)) {
          lastSnap.set(id, sig);
          if (flag('snap') || !lastSnap.has(id + ':printed')) {
            console.log(`[${payload.name || id}] SNAPSHOT ${JSON.stringify(payload.snap)}`);
            lastSnap.set(id + ':printed', '1');
          }
        }
      }
    }
  } catch (e) { console.error('(poll failed: ' + e.message + ')'); }
  await new Promise((r) => setTimeout(r, INTERVAL));
}
