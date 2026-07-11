#!/usr/bin/env node
// send-cmd.mjs — drive a TomeRoam device remotely from a desktop.
//
// Writes one command to the device's pb_cmd_<id> playlist board; the app
// (js/logpipe.js) polls it while Options → Live debug is ON, executes, and
// logs CMD_RESULT into the streamed log. This script then watches the log
// board for that result and prints it — a one-liner remote REPL.
//
// Usage:
//   node tools/send-cmd.mjs [--server URL] [--token T] [--device id8] <cmd> [arg…]
// Commands the app understands:
//   ping                       liveness check
//   state                      full state snapshot (audio/book/banks/conn)
//   eval <expression>          evaluate a JS expression, print the value
//   js <statements>            run JS statements (use `return` for a value)
//   reload                     flush the log, then location.reload()
//   report                     trigger the same upload as the Bug report button
//
// Token resolution as in tail-log.mjs: --token, $PLEX_TOKEN, or the LMS prefs.
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opts = {};
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) opts[args[i].slice(2)] = args[++i];
  else rest.push(args[i]);
}
const CMD = rest[0];
const ARG = rest.slice(1).join(' ');
if (!CMD) { console.error('Usage: node tools/send-cmd.mjs [--device id8] <ping|state|eval|js|reload|report> [arg…]'); process.exit(1); }

const SERVER = (opts.server || 'http://127.0.0.1:32400').replace(/\/$/, '');
const PREFS = 'C:/ProgramData/Lyrion/prefs/plugin/tomeroam.prefs';
function resolveToken() {
  if (opts.token) return opts.token;
  if (process.env.PLEX_TOKEN) return process.env.PLEX_TOKEN;
  try { const m = readFileSync(PREFS, 'utf8').match(/^token:\s*(\S+)/m); if (m) return m[1]; } catch {}
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
const playlists = async () => (await api('/playlists?playlistType=audio')).Metadata || [];

// ---- resolve the target device (its log board must exist) --------------------
const all = await playlists();
const logs = all.filter((p) => p.title.startsWith('pb_log_') && (!opts.device || p.title === 'pb_log_' + opts.device));
if (!logs.length) {
  console.error('No pb_log_* board found' + (opts.device ? ' for device ' + opts.device : '') +
    ' — turn ON Options → Live debug on the device first.');
  process.exit(1);
}
if (logs.length > 1 && !opts.device) {
  console.error('Multiple devices are streaming — pick one with --device:');
  for (const p of logs) {
    let name = '';
    try { name = JSON.parse(p.summary || '{}').name || ''; } catch {}
    console.error(`  --device ${p.title.slice(7)}   (${name})`);
  }
  process.exit(1);
}
const logBoard = logs[0];
const deviceId = logBoard.title.slice(7);
const cmdTitle = 'pb_cmd_' + deviceId;

// ---- ensure the command board exists ------------------------------------------
let cmdBoard = all.find((p) => p.title === cmdTitle);
if (!cmdBoard) {
  // A playlist needs a seed item; reuse the log board's seed track.
  const items = (await api('/playlists/' + logBoard.ratingKey + '/items')).Metadata || [];
  if (!items.length) { console.error('Log board has no seed item — cannot create the command board.'); process.exit(1); }
  const mid = (await api('/')).machineIdentifier;
  const uri = encodeURIComponent(`server://${mid}/com.plexapp.plugins.library/library/metadata/${items[0].ratingKey}`);
  const mc = await api(`/playlists?type=audio&smart=0&title=${encodeURIComponent(cmdTitle)}&uri=${uri}`, { method: 'POST' });
  cmdBoard = mc.Metadata && mc.Metadata[0];
  if (!cmdBoard) { console.error('Could not create ' + cmdTitle); process.exit(1); }
  console.log('(created ' + cmdTitle + ')');
}

// ---- send the command -----------------------------------------------------------
const seq = Date.now();
const blob = JSON.stringify({ seq, cmd: CMD, arg: ARG });
await api(`/library/metadata/${cmdBoard.ratingKey}?summary.value=${encodeURIComponent(blob)}&summary.locked=1`, { method: 'PUT' });
console.log(`sent #${seq} ${CMD}${ARG ? ' ' + ARG.slice(0, 80) : ''} → waiting for result (30s)…`);

// ---- wait for CMD_RESULT #seq in the streamed log --------------------------------
const deadline = Date.now() + 30000;
const marker = `CMD_RESULT #${seq}`;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 2000));
  try {
    const fresh = (await playlists()).find((p) => p.title === logBoard.title);
    const payload = JSON.parse((fresh && fresh.summary) || 'null');
    if (!payload || !Array.isArray(payload.lines)) continue;
    const hit = payload.lines.find((l) => l.includes(marker));
    if (hit) {
      console.log(hit.slice(hit.indexOf('|') + 1));
      process.exit(0);
    }
  } catch {}
}
console.error('No result within 30s — is the app foregrounded with Live debug ON? (Check tail-log output.)');
process.exit(1);
