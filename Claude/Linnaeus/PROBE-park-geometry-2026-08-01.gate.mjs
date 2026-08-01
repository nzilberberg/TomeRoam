// Step 10a park-geometry probe generator.
// Extracts the SHIPPED rule blocks verbatim from css/app.css (no transcription),
// builds the probe page, serves it, runs chrome --headless=new, collects the POSTed result.

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';

const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const SCRATCH = 'C:/Users/nzilb/AppData/Local/Temp/claude/C--Program-Files-Lyrion/e36ea6c3-043b-46a9-bdc8-23469faecc3a/scratchpad';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8918;

const css = fs.readFileSync(path.join(REPO, 'css/app.css'), 'utf8');

// Extract the declaration block for an exact selector that starts a line.
function block(selector) {
  const lines = css.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === selector + ' {' || t === selector + '{') {
      let out = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '}') return { text: out.join('\n'), line: i + 1 };
        out.push(lines[j]);
      }
    }
    // single-line form:  selector { ... }
    if (t.startsWith(selector + ' {') && t.endsWith('}')) {
      return { text: t.slice(t.indexOf('{') + 1, t.lastIndexOf('}')).trim(), line: i + 1 };
    }
  }
  throw new Error('selector not found verbatim: ' + selector);
}

const R = {
  browse: block('#browse'),
  browsePlayer: block('body.has-player #browse'),
  page: block('.browsepage'),
  pagePlayer: block('body.has-player .browsepage'),
  parked: block('.browsepage.parked'),
};

// scrollbar suppression, verbatim lines
const sbLine = css.split('\n').find((l) => l.includes('scrollbar-width: none') && l.includes('.browsepage'));
const sbWebkit = css.split('\n').filter((l) => l.includes('::-webkit-scrollbar')).join('\n');

// Derived variants, generated from the extracted parked block so they cannot drift.
const parkedNoHidden = R.parked.text.replace(/overflow:\s*hidden;?/g, '/* overflow:hidden REMOVED */');
const parkedTop0 = R.parked.text + '\n  position: fixed; top: 0;';

const provenance = {
  '#browse': R.browse.line,
  'body.has-player #browse': R.browsePlayer.line,
  '.browsepage': R.page.line,
  'body.has-player .browsepage': R.pagePlayer.line,
  '.browsepage.parked': R.parked.line,
};

const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root { --safe-top: 59px; --nav-h: 54px; --nav-pad: 0px; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: #111; color: #eee; }

/* ==== VERBATIM from css/app.css ==== */
#browse {
${R.browse.text}
}
body.has-player #browse {
${R.browsePlayer.text}
}
.browsepage {
${R.page.text}
}
body.has-player .browsepage {
${R.pagePlayer.text}
}
.browsepage.parked {
${R.parked.text}
}
${sbLine}
${sbWebkit}
/* ==== end verbatim ==== */

/* Generated variants (positive controls) — derived from the extracted parked block */
.browsepage.parkednohidden {
${parkedNoHidden}
}
.browsepage.parkedtop0 {
${parkedTop0}
}
.browsepage.anchornone { overflow-anchor: none; }
.browsepage.wc { will-change: transform; }
.browsepage.parkednohiddenwc {
${parkedNoHidden}
  will-change: transform;
}
.browsepage.parkedwc {
${R.parked.text}
  will-change: transform;
}

.blk { height: 100px; border-bottom: 1px solid #333; }
#a1 { height: 100px; background: #243; }
</style></head><body>
<div id="browse"><div id="page" class="browsepage">
  <div id="above"><div id="a1" class="blk"></div><div id="a2" class="blk"></div><div id="a3" class="blk"></div></div>
  <div id="rest"></div>
</div></div>
<script>
const $ = (id) => document.getElementById(id);
const page = $('page'), a1 = $('a1');
// 30 x 100px blocks below the mutable region; index 3 is the watched block.
const rest = $('rest');
for (let k = 0; k < 30; k++) {
  const d = document.createElement('div');
  d.className = 'blk'; d.id = 'b' + k; rest.appendChild(d);
}
const watched = $('b3');

const raf = () => new Promise(r => requestAnimationFrame(() => r()));
async function settle(n = 8) { for (let i = 0; i < n; i++) await raf(); await new Promise(r => setTimeout(r, 60)); }

function snap() {
  return { scrollTop: page.scrollTop, wTop: Math.round(watched.getBoundingClientRect().top * 100) / 100 };
}

async function reset() {
  page.className = 'browsepage';
  a1.style.height = '100px';
  await settle(4);
  page.scrollTop = 600;
  await settle(6);
}

// ---- Half A: box equality with and without a state class ----
async function boxAxes(cls) {
  await reset();
  const off = { h: page.getBoundingClientRect().height, ch: page.clientHeight, sh: page.scrollHeight };
  page.classList.add(cls);
  await settle(6);
  const on = { h: page.getBoundingClientRect().height, ch: page.clientHeight, sh: page.scrollHeight };
  page.classList.remove(cls);
  await settle(4);
  return { cls, off, on, delta: { h: on.h - off.h, ch: on.ch - off.ch, sh: on.sh - off.sh } };
}

// ---- Half B: reveal delta on a mid-park content mutation ----
// cls === null  => mutate while ACTIVE (the control)
async function revealDelta(name, cls) {
  await reset();
  if (cls && cls.persist) { page.classList.add(cls.persist); await settle(4); }
  const pre = snap();                          // what the user was watching at park time
  if (cls && cls.park) { page.classList.add(cls.park); await settle(8); }
  const parked = snap();
  a1.style.height = '20px';                    // -80px of content ABOVE the viewport
  await settle(10);
  const inState = snap();
  if (cls && cls.park) { page.classList.remove(cls.park); await settle(10); }
  const revealed = snap();
  await settle(10);
  const late = snap();                         // 10 further frames: any late adjustment?
  if (cls && cls.persist) page.classList.remove(cls.persist);
  return {
    name, pre, parked, inState, revealed, late,
    revealDelta: Math.round((revealed.wTop - pre.wTop) * 100) / 100,
    unparkDelta: Math.round((revealed.wTop - inState.wTop) * 100) / 100,
    lateDrift: Math.round((late.wTop - revealed.wTop) * 100) / 100,
    anchored: inState.scrollTop !== pre.scrollTop,
  };
}

(async () => {
  const out = { ua: navigator.userAgent, vw: innerWidth, vh: innerHeight, boxes: [], reveals: [] };
  try {
    out.boxes.push(await boxAxes('parked'));           // GATE half A
    out.boxes.push(await boxAxes('parkedtop0'));       // positive control
    out.boxes.push(await boxAxes('parkednohidden'));   // isolation

    out.reveals.push(await revealDelta('active control', null));
    out.reveals.push(await revealDelta('active + overflow-anchor:none', { persist: 'anchornone' }));
    out.reveals.push(await revealDelta('SHIPPED .browsepage.parked', { park: 'parked' }));
    out.reveals.push(await revealDelta('.parked minus overflow:hidden', { park: 'parkednohidden' }));
    out.reveals.push(await revealDelta('.parked plus top:0 (pre-rework)', { park: 'parkedtop0' }));
    out.reveals.push(await revealDelta('.parked PLUS will-change:transform', { park: 'parkedwc' }));
    out.reveals.push(await revealDelta('.parked minus hidden PLUS will-change', { park: 'parkednohiddenwc' }));
    out.reveals.push(await revealDelta('active base PLUS will-change (no park)', { persist: 'wc' }));
  } catch (e) { out.error = String(e && e.stack || e); }
  await fetch('/sink', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) });
})();
</script></body></html>`;

fs.writeFileSync(path.join(SCRATCH, 'probe.html'), html);

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/sink') {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      res.end('ok');
      const result = JSON.parse(b);
      result.provenance = provenance;
      fs.writeFileSync(path.join(SCRATCH, 'result2.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result, null, 2));
      try { chrome.kill(); } catch {}
      server.close();
      process.exit(0);
    });
    return;
  }
  res.setHeader('content-type', 'text/html');
  res.end(html);
});

server.listen(PORT);

const UDD = path.join(SCRATCH, 'chrome-scratch');
const args = [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + UDD, '--window-size=526,844',
  'http://127.0.0.1:' + PORT + '/probe.html',
];
const chrome = spawn(CHROME, args, { stdio: 'ignore' });

setTimeout(() => { console.error('TIMEOUT: no result posted'); try { chrome.kill(); } catch {} process.exit(2); }, 90000);
