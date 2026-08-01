// Run 6 — run 5 redone with the watched block INSIDE the viewport (run 5's anchor was
// off-screen above, which disqualified it). Isolates position:absolute vs fixed, and parent.

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';

const REPO = 'C:/Users/nzilb/OneDrive/Desktop/TomeRoam';
const SCRATCH = 'C:/Users/nzilb/AppData/Local/Temp/claude/C--Program-Files-Lyrion/e36ea6c3-043b-46a9-bdc8-23469faecc3a/scratchpad';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8923;

const css = fs.readFileSync(path.join(REPO, 'css/app.css'), 'utf8');
function block(sel) {
  const L = css.split('\n');
  for (let i = 0; i < L.length; i++) if (L[i].trim() === sel + ' {') for (let j = i + 1; j < L.length; j++) if (L[j].trim() === '}') return L.slice(i + 1, j).join('\n');
  throw new Error('nf ' + sel);
}
const HOME = block('#home'), BROWSE = block('#browse'), PAGE = block('.browsepage');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root { --safe-top: 59px; --nav-h: 54px; --nav-pad: 0px; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: #111; }
#browse {
${BROWSE}
}
.pagerecipe {
${PAGE}
}
.homerecipe {
${HOME}
}
/* same recipe, position forced to fixed with #browse's RESOLVED insets (identical box) */
.pagefixed {
${PAGE}
  position: fixed; top: calc(var(--safe-top) + 51px); bottom: var(--nav-h); left: 0; right: 0; max-width: 640px; margin: 0 auto;
}
.tx { transform: translateX(-101vw); }
#browse.tx { transform: translateX(-101vw); }
.blk { height: 100px; border-bottom: 1px solid #333; }
div { scrollbar-width: none; }
</style></head><body>
<div id="browse">
  <div id="pAbs" class="pagerecipe"></div>
  <div id="pFixIn" class="pagefixed"></div>
  <div id="hIn" class="homerecipe"></div>
</div>
<div id="pFixBody" class="pagefixed"></div>
<script>
const $ = (id) => document.getElementById(id);
// identical content shape to runs 2-4: 3x100 mutable region, then 30x100; watch = b3
function fill(box) {
  const a = document.createElement('div'); a.className = 'blk'; box.appendChild(a);
  for (let k = 0; k < 2; k++) { const d = document.createElement('div'); d.className='blk'; box.appendChild(d); }
  let watch = null;
  for (let k = 0; k < 30; k++) { const d = document.createElement('div'); d.className='blk'; box.appendChild(d); if (k === 3) watch = d; }
  return { mut: a, watch };
}
const raf = () => new Promise(r => requestAnimationFrame(() => r()));
async function settle(n = 8) { for (let i = 0; i < n; i++) await raf(); await new Promise(r => setTimeout(r, 60)); }

async function runAncestor(name, box, base, anc) {
  const { mut, watch } = fill(box);
  box.className = base; anc.className = ''; mut.style.height = '100px';
  await settle(4); box.scrollTop = 600; await settle(6);
  const top = () => Math.round(watch.getBoundingClientRect().top * 100) / 100;
  const pre = { sT: box.scrollTop, wTop: top(), h: Math.round(box.getBoundingClientRect().height) };
  anc.className = 'tx'; await settle(8);
  mut.style.height = '20px'; await settle(10);
  const inState = { sT: box.scrollTop, wTop: top() };
  anc.className = ''; await settle(10);
  const rev = { sT: box.scrollTop, wTop: top() };
  box.innerHTML = '';
  return { name, pre, inState, rev, revealDelta: Math.round((rev.wTop - pre.wTop) * 100) / 100, anchored: inState.sT !== pre.sT };
}

async function run(name, box, base) {
  const { mut, watch } = fill(box);
  box.className = base; mut.style.height = '100px';
  await settle(4); box.scrollTop = 600; await settle(6);
  const top = () => Math.round(watch.getBoundingClientRect().top * 100) / 100;
  const pre = { sT: box.scrollTop, wTop: top(), h: Math.round(box.getBoundingClientRect().height) };
  box.className = base + ' tx'; await settle(8);
  mut.style.height = '20px'; await settle(10);
  const inState = { sT: box.scrollTop, wTop: top() };
  box.className = base; await settle(10);
  const rev = { sT: box.scrollTop, wTop: top() };
  box.innerHTML = '';
  return { name, pre, inState, rev, revealDelta: Math.round((rev.wTop - pre.wTop) * 100) / 100, anchored: inState.sT !== pre.sT };
}

(async () => {
  const out = { vw: innerWidth, vh: innerHeight, rows: [] };
  try {
    out.rows.push(await run('.browsepage abs:inset0 in #browse (SHIPPED)', $('pAbs'), 'pagerecipe'));
    out.rows.push(await run('same recipe, position:FIXED, in #browse', $('pFixIn'), 'pagefixed'));
    out.rows.push(await run('same recipe, position:FIXED, in <body>', $('pFixBody'), 'pagefixed'));
    out.rows.push(await run('#home recipe (fixed), in #browse', $('hIn'), 'homerecipe'));
    out.rows.push(await runAncestor('ANCESTOR transform on fixed #browse', $('pAbs'), 'pagerecipe', $('browse')));
  } catch (e) { out.error = String(e && e.stack || e); }
  await fetch('/sink', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) });
})();
</script></body></html>`;

fs.writeFileSync(path.join(SCRATCH, 'probe7.html'), html);
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/sink') {
    let b = ''; req.on('data', (c) => (b += c));
    req.on('end', () => {
      res.end('ok');
      const r = JSON.parse(b);
      fs.writeFileSync(path.join(SCRATCH, 'result7.json'), JSON.stringify(r, null, 2));
      console.log('viewport', r.vw + 'x' + r.vh);
      if (r.error) console.log('ERROR', r.error);
      for (const x of r.rows) console.log(' ', x.name.padEnd(42), '| boxH', x.pre.h, 'pre', x.pre.wTop, 'inState', x.inState.wTop, '(sT', x.inState.sT + ')', 'revealed', x.rev.wTop, '| delta', x.revealDelta, 'anchored', x.anchored);
      try { chrome.kill(); } catch {} server.close(); process.exit(0);
    });
    return;
  }
  res.setHeader('content-type', 'text/html'); res.end(html);
});
server.listen(PORT);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + path.join(SCRATCH, 'chrome-scratch7'), '--window-size=526,844',
  'http://127.0.0.1:' + PORT + '/probe7.html'], { stdio: 'ignore' });
setTimeout(() => { console.error('TIMEOUT'); try { chrome.kill(); } catch {} process.exit(2); }, 90000);
